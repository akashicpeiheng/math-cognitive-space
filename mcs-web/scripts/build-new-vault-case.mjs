/**
 * 从 `data/new-vault/notes/` 生成公开案例正文 `data/cases/12-new-vault.md`。
 *
 * 与 `build-vault-case.mjs` 同一条纪律：笔记是唯一修订源，生成物只是导入版本；
 * 只做标题降级、wiki 链接重写与 node 块包裹，不改写数学内容。
 *
 * 用法：
 *   node scripts/build-new-vault-case.mjs
 *   node scripts/build-new-vault-case.mjs --check
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { MCS_WEB_ROOT, REPO_ROOT } from '../core/ontology.mjs';
import { parseVaultNote } from '../shared/vault.mjs';

const TARGET = join(MCS_WEB_ROOT, 'data', 'cases', '12-new-vault.md');
const MANIFEST = join(MCS_WEB_ROOT, 'data', 'new-vault', 'manifest.json');
const CHECK_ONLY = process.argv.includes('--check');
const manifest = JSON.parse(readFileSync(MANIFEST, 'utf8'));
const byTitle = new Map();
for (const node of manifest.nodes) { byTitle.set(node.title, node.id); byTitle.set(node.titleFull, node.id); }

function normalizeHeadings(lines) {
  return lines.map((line) => {
    const match = line.match(/^(#{1,6})\s+(.*)$/);
    return match ? '#'.repeat(Math.min(match[1].length + 1, 6)) + ' ' + match[2] : line;
  });
}
function rewriteWikiLinks(text, stats) {
  return text.replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (whole, target, alias) => {
    const key = target.trim(), label = (alias ?? target).trim(), id = byTitle.get(key);
    if (!id) { stats.unlinked += 1; stats.unlinkedNames.add(key); return label; }
    stats.linked += 1;
    return `[${label}](/nodes/${encodeURIComponent(id)})`;
  });
}
function extractBody(raw, node) {
  const parsed = parseVaultNote(raw, node.file);
  const lines = parsed.body.split('\n');
  const kept = [];
  let droppedTitle = false, droppedQuote = false;
  for (const line of lines) {
    const trimmed = line.trim();
    if (!droppedTitle && /^#\s+/.test(trimmed)) { droppedTitle = true; continue; }
    if (!droppedQuote && /^>\s*一句话：/.test(trimmed)) { droppedQuote = true; continue; }
    if (/^(#[^\s#]+(?:\s+#[^\s#]+)+)\s*$/.test(trimmed)) continue;
    if (/^<!--[\s\S]*-->$/.test(trimmed)) continue;
    kept.push(line);
  }
  while (kept.length && (kept[0].trim() === '' || kept[0].trim() === '---')) kept.shift();
  return kept.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}
function section(node, raw, stats) {
  const body = rewriteWikiLinks(normalizeHeadings(extractBody(raw, node).split('\n')).join('\n'), stats).trim();
  const header = [
    `<!-- node:${node.id} -->`,
    `## ${node.title}`,
    '',
    `> ${node.summary}`,
    '',
    ...(node.tags.length ? [`**源标签**：${node.tags.map((tag) => `#${tag}`).join(' ')}`, ''] : []),
    `**来源**：\`${node.source}\`（仓库内笔记，导入版本；生成器 \`scripts/build-new-vault-case.mjs\`）`,
    '',
    '---',
    '',
  ];
  return [...header, body, '', '<!-- /node -->', ''].join('\n');
}

const stats = { linked: 0, unlinked: 0, unlinkedNames: new Set() };
const sections = [];
for (const node of manifest.nodes) {
  const source = join(REPO_ROOT, node.source);
  if (!existsSync(source)) throw new Error(`missing source: ${node.source}`);
  sections.push(section(node, readFileSync(source, 'utf8'), stats));
}
const header = [
  '<!-- 本文件由 scripts/build-new-vault-case.mjs 生成，请勿手工编辑；',
  '     源：mcs-web/data/new-vault/notes（仓库内笔记），改动请改笔记后重跑生成器。 -->',
  '',
].join('\n');
const output = header + sections.join('\n');
if (stats.unlinkedNames.size) console.log(`未对应的 wiki 链接：${[...stats.unlinkedNames].join('、')}`);
console.log(`节点数：${sections.length} / ${manifest.nodes.length}`);
console.log(`wiki 链接：已对应 ${stats.linked} 处，未对应 ${stats.unlinked} 处`);
if (CHECK_ONLY) {
  const current = existsSync(TARGET) ? readFileSync(TARGET, 'utf8') : null;
  if (current === output) { console.log('--check：生成物与源一致。'); process.exit(0); }
  console.error(`--check：${relative(REPO_ROOT, TARGET)} 与源不一致。`);
  process.exit(1);
}
writeFileSync(TARGET, output, 'utf8');
console.log(`已写入 ${relative(REPO_ROOT, TARGET)}（${output.length} 字符）`);
