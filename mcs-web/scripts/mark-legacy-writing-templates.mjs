import { readFile, writeFile, copyFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const directory = resolve(root, 'MCS_vault/MCS/template');
const paths = ['Mathematical_Note_Template_for_Specific_Objects.md', '局部技巧模板.md', '核心问题模板.md',
  ...['T0-统一骨架', 'T1-定义类节点模版', 'T2-定理类节点模版', 'T3-公理类节点模版', 'T4-性质类节点模版', 'T5-推论类节点模版', 'T6-习题与技巧类节点模版', 'T7-使用说明与工序'].map(p => `节点类型模版/${p}.md`)];
const marker = '<!-- mcs-legacy-entry:2026-10-13 -->';
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const records = [];
if (!existsSync(directory)) throw new Error('Obsidian template directory is absent; no files changed.');
for (const relative of paths) {
  const path = resolve(directory, relative), original = await readFile(path);
  if (original.toString('utf8').includes(marker)) throw new Error(`Already marked: ${relative}; do not prepend again.`);
  const backup = resolve(root, 'mcs-web/tmp/writing-baseline-20261013/legacy-templates', relative);
  await mkdir(dirname(backup), { recursive: true }); await copyFile(path, backup);
  const prefix = relative.includes('/') ? '../' : '';
  const banner = Buffer.from(`${marker}\n> 新版正式入口：[MCS 节点写作指南](${prefix}MCS节点写作指南.md) · [MCS 节点 AI 写作提示词](${prefix}MCS节点AI写作提示词.md)。以下保留旧模板原文供追溯；网站创作使用新版统一定义。此说明不切换 ima 生产模板或配置。\n<!-- /mcs-legacy-entry -->\n\n`, 'utf8');
  // The complete old byte sequence remains an exact suffix, including any BOM.
  const next = Buffer.concat([banner, original]); await writeFile(path, next);
  const actual = await readFile(path);
  if (!actual.subarray(banner.length).equals(original)) throw new Error(`Preservation failed: ${relative}`);
  records.push({ path: `MCS_vault/MCS/template/${relative}`, originalSha256: hash(original), bannerBytes: banner.length, currentSha256: hash(actual) });
}
await writeFile(resolve(root, 'mcs-web/docs/writing/旧模板保留记录.json'), JSON.stringify({ date: '2026-10-13', method: 'prepend entry only; original bytes remain an exact suffix', records }, null, 2) + '\n', 'utf8');
console.log(`✓ ${records.length} 份旧模板原文保留，已登记 SHA-256 与新版入口`);
