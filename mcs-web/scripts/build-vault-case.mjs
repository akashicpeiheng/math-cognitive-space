/**
 * 从 MCS_vault 的分析笔记生成站点案例正文（案例 10：笔记库）。
 *
 * 为什么走「登记表 + 生成器」而不是手工剪贴进案例 markdown：
 *   1. 笔记是唯一修订源。站点正文是它的**导入版本**，重跑一次即可对齐，
 *      不会出现「笔记改了、站点里那份手抄的没改」这种两处数学文本各自漂移的情况；
 *   2. 生成物进仓库（`data/cases/10-vault-analysis.md`），运行期不读笔记库，
 *      contentHash 因此可复现——这一点与 `build-dg-case.mjs` 从 G 盘取快照的理由相同，
 *      区别只在这批源**本来就在本仓库里**，不需要再复制一份快照到 `data/`；
 *   3. `--check` 只比对不写入，把「笔记改了而站点没跟」当场暴露出来。
 *
 * 用法：
 *   node scripts/build-vault-case.mjs            # 生成 / 刷新案例正文
 *   node scripts/build-vault-case.mjs --check    # 只校验生成物与源是否一致，不写文件
 *
 * 三件事：归一化标题层级、重写 [[wiki 链接]]、按 <!-- node:id --> 切块。
 * **不改写数学内容**：正文逐字来自笔记（只去掉标题行、摘要行与标签行）。
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, join, relative } from 'node:path';
import { MCS_WEB_ROOT, REPO_ROOT } from '../core/ontology.mjs';

const TARGET = resolve(MCS_WEB_ROOT, 'data', 'cases', '10-vault-analysis.md');
const CHECK_ONLY = process.argv.includes('--check');

/**
 * 登记表：笔记 → 节点。
 *
 * 加一条就是加一个节点；`source` 是相对**仓库根**的路径（笔记在仓库内，不再另存快照）。
 * 学科（`discipline`）与出身（`case`）分开：出身在这里是「笔记库」，学科写在 `data/cases/vault.mjs`。
 */
export const VAULT_NODES = [
  {
    id: 'vault:directional-derivative',
    title: '方向导数',
    source: 'MCS_vault/notes/Analysis/方向导数.md',
    note: '定义类笔记（T0 统一骨架 + T1 定义类节点模版），含逐条条件分析、五个反例、谱系与三条短证明。',
  },
];

/**
 * wiki 链接映射：笔记里的概念名 → 本站节点 id。
 * 只收录本站确实存在的节点；其余链接去方括号留文字，不制造死链（与 `build-dg-case.mjs` 同规矩）。
 */
const WIKI_MAP = new Map([
  // 本站已有的近邻节点
  ['切向量', 'dg:tangent-vector-curve'],
  ['Jacobi矩阵', 'gt:jacobi-matrix'],
  // 笔记自身的节点名（自链接，指向同一条目的页面）
  ...VAULT_NODES.map((node) => [node.title, node.id]),
]);

/** 归一化标题层级：顶层节降到 ##，子节降到 ###，节点块内不再出现 # 级标题。 */
function normalizeHeadings(lines) {
  return lines.map((line) => {
    const match = line.match(/^(#{1,6})\s+(.*)$/);
    if (!match) return line;
    const level = Math.min(match[1].length + 1, 6);
    return '#'.repeat(level) + ' ' + match[2];
  });
}

/** 重写 wiki 链接；返回正文与统计。 */
function rewriteWikiLinks(text, stats) {
  return text.replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (whole, target, alias) => {
    const label = (alias ?? target).trim();
    const key = target.trim();
    const id = WIKI_MAP.get(key);
    if (id) {
      stats.linked += 1;
      return `[${label}](/nodes/${encodeURIComponent(id)})`;
    }
    stats.unlinked += 1;
    stats.unlinkedNames.add(key);
    return label;
  });
}

/** 从笔记里取出摘要（开头的 `> 一句话：…`）、标签行，并把它们从正文里摘掉。 */
function extractMeta(raw, node) {
  const lines = raw.split('\n');
  let summary = '';
  let tags = [];
  const kept = [];
  let droppedTitle = false;
  let droppedQuote = false;

  for (const line of lines) {
    const trimmed = line.trim();
    // 节点标题行（笔记通常不写；若写了就丢掉，标题由节点块自己给）
    if (!droppedTitle && /^#\s+/.test(trimmed)) {
      const headingText = trimmed.replace(/^#\s+/, '').replace(/\[\[|\]\]/g, '').trim();
      if (headingText === node.title) { droppedTitle = true; continue; }
    }
    // 摘要：只吃开头那一行 blockquote
    if (!droppedQuote && !kept.some((item) => item.trim()) && /^>\s*[^\n]+$/.test(trimmed)) {
      summary = trimmed.replace(/^>\s*/, '').replace(/^一句话：\s*/, '').trim();
      droppedQuote = true;
      continue;
    }
    // 标签行：整行全由 #标签 与空白组成，且不是 Markdown 标题（标题的 # 后有空格）
    if (/^(#[^\s#]+(?:\s+#[^\s#]+)+)\s*$/.test(trimmed)) {
      tags = trimmed.split(/\s+/).map((tag) => tag.replace(/^#/, '')).filter(Boolean);
      continue;
    }
    kept.push(line);
  }

  // 去掉正文开头多余的横线与空行（摘要与标签摘掉后会留下 `---`）
  while (kept.length && (kept[0].trim() === '' || kept[0].trim() === '---')) kept.shift();

  return { body: kept.join('\n').replace(/\n{3,}/g, '\n\n').trim(), tags: [...new Set(tags)], summary };
}

function buildSection(node, meta, stats) {
  const header = [
    `<!-- node:${node.id} -->`,
    '## ' + node.title,
    '',
  ];
  if (meta.summary) header.push('> ' + rewriteWikiLinks(meta.summary, stats), '');
  if (meta.tags.length) header.push('**源标签**：' + meta.tags.map((tag) => `#${tag}`).join(' '), '');
  header.push(
    `**来源**：\`${node.source}\`（仓库内笔记，导入版本；生成器 \`scripts/build-vault-case.mjs\`）`,
    '',
    '---',
    '',
  );
  const body = rewriteWikiLinks(normalizeHeadings(meta.body.split('\n')).join('\n'), stats).trim();
  return [...header, body, '', '<!-- /node -->', ''].join('\n');
}

function main() {
  const stats = { linked: 0, unlinked: 0, unlinkedNames: new Set() };
  const sections = [];
  const missing = [];

  for (const node of VAULT_NODES) {
    const sourcePath = join(REPO_ROOT, node.source);
    if (!existsSync(sourcePath)) { missing.push(node.source); continue; }
    const raw = readFileSync(sourcePath, 'utf8');
    const meta = extractMeta(raw, node);
    if (!meta.body.trim()) { missing.push(node.source + '（正文为空）'); continue; }
    if (!meta.summary) missing.push(node.source + '（缺 `> 一句话：…` 摘要，节点页会没有摘要）');
    if (!meta.tags.length) missing.push(node.source + '（缺标签行）');
    sections.push(buildSection(node, meta, stats));
  }

  if (missing.length) {
    console.error('以下源文件缺失或不合格：');
    for (const item of missing) console.error('  - ' + item);
    process.exit(1);
  }

  const header = [
    '<!-- 本文件由 scripts/build-vault-case.mjs 生成，请勿手工编辑；',
    '     源：MCS_vault/notes（仓库内笔记，只读），改动请改笔记后重跑生成器。 -->',
    '',
  ].join('\n');
  const output = header + sections.join('\n');

  console.log(`节点数：${sections.length} / ${VAULT_NODES.length}`);
  console.log(`wiki 链接：已对应 ${stats.linked} 处，未对应 ${stats.unlinked} 处（去方括号留文字）`);
  if (stats.unlinkedNames.size) console.log(`未对应的概念名：${[...stats.unlinkedNames].join('、')}`);

  if (CHECK_ONLY) {
    const current = existsSync(TARGET) ? readFileSync(TARGET, 'utf8') : null;
    if (current === output) { console.log('--check：生成物与源一致。'); return; }
    console.error(`--check：${relative(REPO_ROOT, TARGET)} 与源不一致（笔记改了而站点没跟）。重跑本脚本即可刷新。`);
    process.exit(1);
  }

  writeFileSync(TARGET, output, 'utf8');
  console.log(`已写入 ${relative(REPO_ROOT, TARGET)}（${output.length} 字符）`);
}

main();
