import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildOntology, createOntology } from '../core/ontology.mjs';
import { loadContentLibrary } from '../core/content-library.mjs';
import { legacyMasterView, objectMasterView, learningMasterView, masterPreview } from '../shared/master-view.mjs';
import { MASTER_SECTION_SELECTIONS, MASTER_REDUNDANT_REGISTRATIONS } from '../data/master-content.mjs';
import { startTestServer, jsonCall } from './helpers.mjs';
import { fromMarkdown } from 'mdast-util-from-markdown';
import { math } from 'micromark-extension-math';
import { mathFromMarkdown } from 'mdast-util-math';
import katex from 'katex';

const raw = await buildOntology(), ontology = createOntology(raw), library = loadContentLibrary();
const project = id => legacyMasterView(ontology.node(id), { nodes:raw.nodes, sourceVersion:ontology.version });
function freeze(value) { if (value && typeof value === 'object') { Object.freeze(value); for (const v of Object.values(value)) freeze(v); } return value; }
test('all public identities and absorbed registrations have a source-backed view without changing M/L', () => {
  const input = freeze(structuredClone(raw)), before = JSON.stringify(input), libBefore = JSON.stringify(library);
  for (const node of input.nodes) {
    const view = legacyMasterView(node, { nodes:input.nodes, sourceVersion:ontology.version });
    assert.equal(view.id, node.id); assert(view.expressions.length, node.id);
    assert(view.expressions.every(e => e.markdown.trim() && e.source), node.id);
    assert(['registered','partial'].includes(view.completeness));
    assert(!Object.hasOwn(view, 'profileId'));
    for (const record of node.registrations ?? []) {
      if (MASTER_REDUNDANT_REGISTRATIONS[node.id]?.includes(record.id)) {
        assert((record.provenance?.sources ?? []).every(source => view.sources.includes(source)), record.id);
        continue;
      }
      if (view.variants.some(v => v.id === record.id)) continue;
      const variant = legacyMasterView(record, { nodes:input.nodes });
      const signature = v => JSON.stringify([v.context, v.expressions.map(e => e.markdown)]);
      assert([view,...view.variants].some(v => signature(v) === signature(variant)), record.id);
    }
  }
  for (const object of library.objects) {
    const view = objectMasterView(object, { objects:library.objects });
    assert(view.expressions.length || view.references.length, object.id);
    assert.equal(view.expressions.length, object.declarations.length);
    assert.deepEqual(view.expressions.map(e => e.id), object.declarations.map(d => d.id));
  }
  for (const node of library.nodes) {
    const view = learningMasterView(node, library.objects);
    assert.equal(view.references.length, new Set(node.objects.map(r => `${r.id}#${r.anchor}`)).size);
    assert(view.variants.length || view.expressions.length);
    for (const ref of view.references) {
      const object = library.objects.find(o => o.id === ref.id); assert(object);
      assert(ref.anchor === '$' || object.declarations.some(d => d.id === ref.anchor));
    }
  }
  assert.equal(JSON.stringify(input), before); assert.equal(JSON.stringify(library), libBefore);
});
test('quantifiers, mathematical scope, convention differences and proof boundaries survive compression', () => {
  const limit = project('limit:limit-ed');
  assert.match(limit.context.join(' '), /a.*D'/);
  assert.match(limit.expressions[0].markdown, /forall\\varepsilon.*exists\\delta.*forall x/);
  const continuous = project('limit:continuous');
  const metric = continuous.variants.find(v => v.id === 'rudin:continuous-function');
  assert(metric); assert(!metric.expressions[0].markdown.includes('f^{-1}'));
  assert.equal(metric.completeness, 'partial');
  assert.match(project('top:compactness').equivalents[1].conditions.join(' '), /mathbb R/);
  assert.equal(project('top:compactness').variants.length, 0, 'repeated open-cover definitions are folded into one view');
  const manifold = project('top:topological-manifold');
  assert.match(manifold.context.join(' '), /second countable/);
  assert(manifold.variants.some(v => v.id === 'dg:manifold' && v.context.join(' ').includes('不要求第二可数')));
  const proof = project('group:proof-injective');
  assert(proof.references.some(r => r.id === 'group:claim-injective'));
  assert.match(proof.context.join(' '), /右单位|mu\(x,e\)/);
  assert(!JSON.stringify(proof).includes('steps'));
  const wrong = project('limit:pattern-never-equal'); assert.match(wrong.expressions[0].markdown, /错误断言/);
});
test('explicit formal sections replace shorthand without carrying teaching sections or category bullets', () => {
  for (const id of Object.keys(MASTER_SECTION_SELECTIONS)) assert(ontology.maybeNode(id), id);
  const matrix = project('jiang:matrix-operations');
  assert.match(matrix.expressions[0].source, /contentMarkdown#/);
  assert.match(matrix.expressions[0].markdown, /同尺寸|m\\times n/);
  assert(!matrix.expressions[0].markdown.includes('一句自然语言重述'));
  assert(!matrix.expressions[0].markdown.includes('前置知识'));
  assert(matrix.equivalents.some(e => e.markdown.includes('F^{mn}')));
  assert(matrix.equivalents.every(e => !e.markdown.includes('**类别**')));
  const tangent = project('dg:tangent-bundle');
  assert.match(tangent.expressions[0].markdown, /bigsqcup/);
  assert(!tangent.expressions.some(e => /^#{1,6}\s/m.test(e.markdown)));
  const malformed = legacyMasterView({ id:'jiang:matrix-operations', title:'bounded selection', construct:'Concept', formal:{predicate:'registered'}, contentMarkdown:'## 标准形式\n\nFormal content.\n\n$$\\begin{aligned}\na=b\n\\end{aligned}$$\n\n### 应用\n\nTeaching content must not leak.\n\n## 证明\n\nProof steps.' });
  assert.match(malformed.expressions[0].markdown, /a=b/);
  assert(!malformed.expressions[0].markdown.includes('Teaching'));
  assert(!malformed.expressions[0].markdown.includes('Proof steps'));
  const intuition = legacyMasterView({ id:'sentence', title:'sentence', construct:'Concept', formal:{predicate:'P'}, representations:[{kind:'intuition',note:'Keep $\\text{a。b}$ intact。隐藏的第二句。'}] });
  assert.equal(intuition.intuition, 'Keep $\\text{a。b}$ intact。');
  const ricci = project('gt:ricci-flow');
  assert(!ricci.context.join(' ').includes('删'));
  assert(!ricci.context.join(' ').includes('手术'));
  assert.match(ricci.expressions[0].markdown, /−2 Ric/);
  assert(!project('linear:rank-nullity').context.join(' ').includes('概括是扩基'));
  assert.match(project('gt:sard-theorem').context.join(' '), /无边/);
  const preview = masterPreview(matrix); assert.equal(preview.variants.length, 0); assert.equal(preview.equivalents.length, 0);
});
test('repeated object references deduplicate by precise anchor and missing objects remain explicit', () => {
  const object = library.objects.find(o => o.id === 'obj:group:left-mul');
  const ref = { id:object.id, anchor:'definition' };
  const view = learningMasterView({ id:'synthetic', title:'synthetic', objects:[ref,ref,{...ref,anchor:'$'}], goals:[], version:'1' }, library.objects);
  assert.equal(view.references.length, 2); assert.equal(view.variants.length, 2);
  const empty = learningMasterView({ id:'empty', title:'empty', objects:[], goals:['Registered task'], version:'1' }, []);
  assert.equal(empty.completeness, 'partial'); assert.equal(empty.expressions[0].markdown, 'Registered task');
});
test('all selected mathematical expressions and tooltip formulas can be typeset', () => {
  let count = 0;
  const checkMarkdown = (markdown, id) => {
    const visit = node => {
      if (['math','inlineMath'].includes(node.type)) {
        count++;
        assert.doesNotThrow(() => katex.renderToString(node.value, {throwOnError:true, strict:'ignore'}), `${id}: ${node.value}`);
      }
      node.children?.forEach(visit);
    };
    visit(fromMarkdown(markdown, {extensions:[math()],mdastExtensions:[mathFromMarkdown()]}));
  };
  const checkView = view => {
    for (const markdown of [...view.context, view.intuition, ...[...view.expressions,...view.equivalents].flatMap(e => [e.markdown,...(e.conditions ?? [])])]) checkMarkdown(markdown, view.id);
    view.variants.forEach(checkView);
  };
  raw.nodes.forEach(n => checkView(legacyMasterView(n,{nodes:raw.nodes})));
  library.objects.forEach(o => checkView(objectMasterView(o,{objects:library.objects})));
  library.nodes.forEach(n => checkView(learningMasterView(n,library.objects)));
  assert(count > 1000);
});
test('API additions preserve versions, aliases and personal state, in both locales', async () => {
  const app = await startTestServer({ lean:{enabled:false} });
  try {
    const before = await app.db.dumpAll();
    for (const locale of ['zh','en']) {
      const call = async path => {
        const result = await jsonCall(app.origin, `/api/v2${path}${path.includes('?')?'&':'?'}locale=${locale}`);
        assert.equal(result.status, 200, path); return result.payload.data;
      };
      const list = await call('/ontology/nodes?granularity=all&limit=500');
      assert.equal(list.nodes.length, raw.nodes.length);
      assert(list.nodes.every(n => n.master?.expressions.length && n.master.locale === locale));
      assert.equal(list.version, ontology.version);
      const alias = await call('/ontology/nodes/rudin%3Acontinuous-function');
      assert.equal(alias.node.id, 'limit:continuous'); assert.equal(alias.node.master.id, alias.node.id);
      const graph = await call('/ontology/graph'); assert(graph.nodes.every(n => n.master));
      const objects = await call('/ontology/objects'); assert.equal(objects.objectVersion, library.objectVersion);
      assert(objects.objects.every(o => o.master));
      const detail = await call('/ontology/objects/obj%3Agroup%3Ainjective');
      assert.equal(detail.object.formalHash, library.objects.find(o => o.id === detail.object.id).formalHash);
      assert.equal(detail.master.expressions[0].id, 'claim');
      const reading = await call('/learning/nodes/learn%3Agroup%3Ainjective-proof');
      assert(reading.master.variants.length); assert.equal(reading.learningVersion, library.learningVersion);
    }
    const after = await app.db.dumpAll(); delete before.exportedAt; delete after.exportedAt; assert.deepEqual(after, before);
  } finally { await app.cleanup(); }
});
