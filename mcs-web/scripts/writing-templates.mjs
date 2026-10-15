import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { existsSync } from 'node:fs';
import { renderAiGuide, renderHumanGuide, validateWritingTemplate } from '../shared/writing-template.mjs';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const directory = resolve(root, 'MCS_vault/MCS/template');
const publicDirectory = resolve(root, 'mcs-web/docs/writing');
export const templateArtifacts = [
  [resolve(publicDirectory, 'MCS节点写作指南.md'), renderHumanGuide()],
  [resolve(publicDirectory, 'MCS节点AI写作提示词.md'), renderAiGuide()],
  ...(existsSync(directory) ? [
    [resolve(directory, 'MCS节点写作指南.md'), renderHumanGuide()],
    [resolve(directory, 'MCS节点AI写作提示词.md'), renderAiGuide()],
  ] : []),
];
export async function checkWritingArtifacts() {
  const problems = validateWritingTemplate();
  for (const [path, expected] of templateArtifacts) {
    try { if ((await readFile(path, 'utf8')) !== expected) problems.push(`Template artifact differs: ${path}`); }
    catch { problems.push(`Template artifact missing: ${path}`); }
  }
  return problems;
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv.includes('--check')) {
    const problems = await checkWritingArtifacts();
    if (problems.length) { console.error(problems.join('\n')); process.exitCode = 1; }
    else console.log('✓ 双模板与网站定义一致');
  } else {
    for (const [path, content] of templateArtifacts) { await mkdir(dirname(path), { recursive: true }); await writeFile(path, content, 'utf8'); }
    console.log('✓ 已生成 MCS 节点写作指南与 AI 写作提示词');
  }
}
