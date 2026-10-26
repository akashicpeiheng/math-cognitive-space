import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  compileContentLibrary,
  formatContentDocument,
  objectReference,
  parseContentDocument
} from '../../../mcs-web/shared/content-documents.mjs';
import {
  CORE_SECTIONS,
  TEMPLATE_VERSION,
  WRITING_SECTIONS,
  renderLearningNodeTemplate
} from '../../../mcs-web/shared/writing-template.mjs';
import {
  FORMAL_TEMPLATE_VERSION,
  renderMathObjectTemplate
} from '../../../mcs-web/shared/formal-template.mjs';

const ROOT = dirname(fileURLToPath(import.meta.url));
const FOLDERS = ['objects', 'nodes'];
const SEAL = process.argv.includes('--seal');

function readSources() {
  return FOLDERS.flatMap((folder) => {
    const dir = resolve(ROOT, folder);
    if (!existsSync(dir)) return [];
    return readdirSync(dir)
      .filter((name) => name.endsWith('.md'))
      .sort()
      .map((name) => ({
        path: `${folder}/${name}`,
        markdown: readFileSync(resolve(dir, name), 'utf8')
      }));
  });
}

function headings(body) {
  return [...body.matchAll(/^## (.+)$/gm)].map(match => match[1].trim());
}

function firstHeading(body, path) {
  const match = body.match(/^# (.+)$/m);
  if (!match) throw new Error(`${path}: missing H1`);
  return match[1].trim();
}

function assertKeys(data, expected, path) {
  const actual = Object.keys(data);
  const allowed = expected.filter(key => Object.hasOwn(data, key));
  if (JSON.stringify(actual) !== JSON.stringify(allowed)) {
    throw new Error(`${path}: key order differs from template: ${actual.join(', ')}`);
  }
}

function templateData(markdown, tag) {
  const match = markdown.match(new RegExp('^````' + tag + '\\n([\\s\\S]*?)\\n````$', 'm'));
  if (!match) throw new Error(`template: missing ${tag} block`);
  return JSON.parse(match[1]);
}

// Read the expected shape from the generated templates, not from a copied list.
const OBJECT_KEYS = Object.keys(templateData(renderMathObjectTemplate({ scale: 'molecule' }), 'mcs-object'));
const NODE_KEYS = Object.keys(templateData(renderLearningNodeTemplate(), 'mcs-node'));
const NODE_SECTIONS = CORE_SECTIONS.map(id => {
  const section = WRITING_SECTIONS.find(item => item.id === id);
  if (!section) throw new Error(`template: missing core section ${id}`);
  return [id, section.title.zh];
});
const FORMAL_HEADINGS = [...renderMathObjectTemplate({ scale: 'molecule' }).matchAll(/^## (.+)$/gm)].map(match => match[1].trim());

function checkTemplateShape(documents) {
  let objects = 0, nodes = 0;
  for (const document of documents) {
    if (firstHeading(document.body, document.path) !== document.data.title) {
      throw new Error(`${document.path}: H1 does not match JSON title`);
    }
    if (document.kind === 'object') {
      objects += 1;
      assertKeys(document.data, OBJECT_KEYS, document.path);
      if (headings(document.body).join('|') !== FORMAL_HEADINGS.join('|')) {
        throw new Error(`${document.path}: formal body headings differ from template`);
      }
    } else {
      nodes += 1;
      assertKeys(document.data, NODE_KEYS, document.path);
      const actual = headings(document.body);
      const core = actual.filter(title => NODE_SECTIONS.some(([, required]) => required === title));
      const expected = NODE_SECTIONS.map(([, required]) => required);
      if (core.join('|') !== expected.join('|')) {
        throw new Error(`${document.path}: node core headings differ from template`);
      }
      for (const [id, title] of NODE_SECTIONS) {
        if (!document.body.includes(`<!-- mcs-section:${id} -->\n## ${title}`)) {
          throw new Error(`${document.path}: missing section marker ${id}/${title}`);
        }
      }
    }
  }
  return { writing: TEMPLATE_VERSION, formal: FORMAL_TEMPLATE_VERSION, objects, nodes };
}

let sources = readSources();
const draft = compileContentLibrary(sources, { checkPins: !SEAL });

if (SEAL) {
  for (const source of sources) {
    const document = parseContentDocument(source.markdown, source.path);
    const pin = (value) => {
      if (Array.isArray(value)) return value.map(pin);
      if (!value || typeof value !== 'object') return value;
      if (Object.hasOwn(value, 'formalHash') && Object.hasOwn(value, 'anchor')) {
        return objectReference(draft, value.id, value.anchor);
      }
      return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, pin(item)]));
    };
    const next = formatContentDocument(pin(document.data), document.body);
    if (next !== source.markdown) writeFileSync(resolve(ROOT, source.path), next, 'utf8');
  }
  sources = readSources();
}

const library = compileContentLibrary(sources);

// 本片段的一个额外有限检查：命题对象里的透明定义必须与定义对象的声明同源，
// 防止两处 `grad` 在后续修改中悄悄漂移。共享编译器不跨对象比较定义正文。
const documents = sources.map((source) => parseContentDocument(source.markdown, source.path));
const template = checkTemplateShape(documents);
const definitionDocument = documents.find(
  (document) => document.kind === 'object' && document.data.id === 'obj:grad:definition'
);
if (!definitionDocument) throw new Error('missing obj:grad:definition');
const [definitionDeclaration] = definitionDocument.data.declarations;
let linkedDefinitions = 0;
for (const document of documents) {
  if (document.kind !== 'object') continue;
  for (const definition of document.data.definitions ?? []) {
    if (definition.name !== 'grad') continue;
    linkedDefinitions += 1;
    if (definition.source !== definitionDeclaration.source || definition.type !== definitionDeclaration.type) {
      throw new Error(`${document.path}: grad definition differs from obj:grad:definition`);
    }
  }
}
if (linkedDefinitions === 0) throw new Error('no object reuses the grad definition');

console.log(JSON.stringify({
  status: 'passed',
  objects: library.objects.length,
  nodes: library.nodes.length,
  linkedDefinitions,
  template,
  objectVersion: library.objectVersion,
  learningVersion: library.learningVersion,
  scope: 'FINITE：结构、类型、引用、摘要、模板章节形状与定义同源检查；不判定数学真值'
}, null, 2));
