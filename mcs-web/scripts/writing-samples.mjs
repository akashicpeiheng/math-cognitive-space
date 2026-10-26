import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { WRITING_SAMPLES } from '../data/writing-samples.mjs';
import { ADAPTIVE_WRITING_SAMPLES } from '../data/writing-adaptive-samples.mjs';
import { createWritingDocument, replaceWritingSection, updateDocumentMetadata } from '../shared/writing-document.mjs';
// The original six notes are immutable v1 calibration artifacts, not upgraded user notes.
const legacyHeadings = {
  overview: '一句话简介与标签', prerequisites: '前置知识', introduction: '历史与动机：引入', construction: '历史与动机：构造', intuition: '直觉', form: '形式与条件',
  argument: '论证、证明或解题', applications: '应用', connections: '推广与联动', mistakes: '误解、试错与启发', summary: '思想与方法总结', review: '回看并提问', evidence: '断言与证据', references: '参考文献',
};
export function renderWritingSample(sample) {
  let markdown = updateDocumentMetadata(`# ${sample.title}\n\n` + Object.entries(legacyHeadings).map(([id, title]) => `<!-- mcs-section:${id} -->\n## ${title}\n\n`).join('\n'), {
    'mcs-template': 'mcs-object-note', 'mcs-template-version': '2026-10-13.1', 'mcs-type': sample.type, 'mcs-language': 'zh', 'mcs-audience': '具备本篇必备知识的学习者',
  });
  for (const id of Object.keys(legacyHeadings)) {
    if (!sample.sections[id]) throw new Error(`Missing ${sample.id}/${id}`);
    markdown = replaceWritingSection(markdown, id, sample.sections[id]);
  }
  return updateDocumentMetadata(markdown, { 'mcs-status-introduction': 'pending', 'mcs-status-construction': 'pending' });
}
export function renderAdaptiveSample(sample) {
  let markdown = createWritingDocument({ title: sample.title, type: sample.type, roles: sample.roles });
  // These are historical calibration notes, not new documents or upgrade targets.
  markdown = updateDocumentMetadata(markdown, { 'mcs-template': 'mcs-object-note', 'mcs-template-version': '2026-10-15.1' });
  for (const [id, content] of Object.entries(sample.sections)) markdown = replaceWritingSection(markdown, id, content);
  if (sample.customChecks) markdown = updateDocumentMetadata(markdown, { 'mcs-custom-checks': sample.customChecks });
  return markdown;
}
const artifacts = () => [
  ...WRITING_SAMPLES.map(s => [new URL(`../docs/writing/samples/${s.id}.md`, import.meta.url), renderWritingSample(s)]),
  ...ADAPTIVE_WRITING_SAMPLES.map(s => [new URL(`../docs/writing/samples/adaptive/${s.id}.md`, import.meta.url), renderAdaptiveSample(s)]),
];
export async function checkWritingSamples() {
  const problems = [];
  for (const [path, content] of artifacts()) {
    try { if (await readFile(path, 'utf8') !== content) problems.push(`Sample differs: ${path.pathname}`); }
    catch { problems.push(`Sample missing: ${path.pathname}`); }
  }
  return problems;
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv.includes('--check')) {
    const errors = await checkWritingSamples(); if (errors.length) { console.error(errors.join('\n')); process.exitCode = 1; } else console.log('✓ 旧版与适配样稿一致');
  } else {
    for (const [path, content] of artifacts()) {
      let old; try { old = await readFile(path, 'utf8'); } catch { /* New artifact. */ }
      if (old === content) continue;
      // Never overwrite an existing calibration note with different text.
      if (old !== undefined) throw new Error(`Sample differs; review its source before replacing: ${path.pathname}`);
      await mkdir(dirname(fileURLToPath(path)), { recursive: true }); await writeFile(path, content, 'utf8');
    }
    console.log('✓ 适配样稿已生成；既有样稿未覆盖');
  }
}
