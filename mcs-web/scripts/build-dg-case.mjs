/**
 * 从 G:\DifferentialGeometry\object 生成微分几何案例的站点正文。
 *
 * 为什么是「快照 + 生成器」而不是运行期直接读 G 盘：
 *   data/ 是公共本体 M 的版本化来源；若运行期依赖仓库之外的文件，
 *   contentHash 就会取决于本机磁盘状态，check 与测试都不可复现。
 *   因此 30 个源文件先复制快照到 data/dg/，本脚本从快照生成正文。
 *   G 盘始终只读，站点改动不回写源笔记。
 *
 * 用法：
 *   node scripts/build-dg-case.mjs            # 刷新快照并生成正文
 *   node scripts/build-dg-case.mjs --check    # 只校验快照与源是否一致，不写文件
 *
 * 三件事：归一化标题层级、重写 [[wiki 链接]]、按 <!-- node:id --> 切块。
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, copyFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { MCS_WEB_ROOT } from '../core/ontology.mjs';

const SOURCE_ROOT = 'G:/DifferentialGeometry/object';
const SNAPSHOT_DIR = resolve(MCS_WEB_ROOT, 'data', 'dg');
const CASES_DIR = resolve(MCS_WEB_ROOT, 'data', 'cases');
const TARGET = join(CASES_DIR, '05-differential-geometry.md');
const CHECK_ONLY = process.argv.includes('--check');

/** 30 个节点：id、中文名、来源相对路径、学科。按前置顺序排列，便于人工核对。 */
export const DG_NODES = [
  // —— 机制层：空间与结构 ——
  { id: 'dg:topological-space', title: '拓扑空间', source: 'def/拓扑空间.md', discipline: '拓扑' },
  { id: 'dg:homeomorphism', title: '同胚', source: 'def/同胚.md', discipline: '拓扑' },
  { id: 'dg:manifold', title: '流形', source: 'def/流形.md', discipline: '微分几何' },
  { id: 'dg:topological-manifold', title: '拓扑流形', source: 'def/拓扑流形.md', discipline: '微分几何' },
  { id: 'dg:coordinate-chart', title: '坐标图', source: 'def/坐标图.md', discipline: '微分几何' },
  { id: 'dg:smooth-structure', title: '光滑结构', source: 'def/光滑结构.md', discipline: '微分几何' },
  { id: 'dg:smooth-atlas', title: '光滑图册', source: 'def/光滑图册.md', discipline: '微分几何' },
  { id: 'dg:smooth-manifold', title: '光滑流形', source: 'def/光滑流形.md', discipline: '微分几何' },
  { id: 'dg:smooth-embedding', title: '光滑嵌入', source: 'def/光滑嵌入.md', discipline: '微分几何' },
  { id: 'dg:smooth-distribution', title: '光滑切分布', source: 'def/光滑切分布.md', discipline: '微分几何' },
  { id: 'dg:partition-of-unity', title: '单位分解', source: 'def/单位分解.md', discipline: '微分几何' },
  { id: 'dg:compactness', title: '紧致性', source: 'prop/紧致性.md', discipline: '拓扑' },
  { id: 'dg:metric-space', title: '度量空间', source: 'def/度量空间.md', discipline: '拓扑' },
  { id: 'dg:metric-completeness', title: '度量完备性', source: 'def/度量完备性.md', discipline: '拓扑' },
  // —— 切空间层 ——
  { id: 'dg:tangent-vector-curve', title: '切向量的曲线定义', source: 'def/切向量的曲线定义.md', discipline: '微分几何' },
  { id: 'dg:tangent-vector-derivation', title: '切向量的导子定义', source: 'def/切向量的导子定义.md', discipline: '微分几何' },
  { id: 'dg:tangent-vector-equivalence', title: '切向量两种定义的等价性', source: 'def/切向量两种定义的等价性.md', discipline: '微分几何' },
  { id: 'dg:tangent-coordinate-basis', title: '切空间的坐标基', source: 'def/切空间的坐标基.md', discipline: '微分几何' },
  { id: 'dg:tangent-bundle', title: '切丛', source: 'def/切丛.md', discipline: '微分几何' },
  { id: 'dg:smooth-vector-field', title: '光滑向量场', source: 'def/光滑向量场.md', discipline: '微分几何' },
  // —— 张量层 ——
  { id: 'dg:tensor', title: '张量', source: 'def/张量.md', discipline: '多重线性与张量代数' },
  { id: 'dg:tensor-product-dg', title: '张量积（微分几何）', source: 'def/张量积.md', discipline: '多重线性与张量代数' },
  // —— 外形式层 ——
  { id: 'dg:differential-form', title: '微分形式', source: 'def/微分形式.md', discipline: '微分几何' },
  { id: 'dg:form-wedge-product', title: '微分形式的外积', source: 'def/微分形式的外积.md', discipline: '微分几何' },
  { id: 'dg:d-squared-zero', title: '外微分平方为零', source: 'def/外微分平方为零.md', discipline: '微分几何' },
  { id: 'dg:form-pullback', title: '微分形式的拉回', source: 'def/微分形式的拉回.md', discipline: '微分几何' },
  // —— 证明工具 ——
  { id: 'dg:implicit-function-theorem', title: '隐函数定理', source: 'thm/隐函数定理.md', discipline: '分析' },
  { id: 'dg:inverse-function-theorem', title: '反函数定理', source: 'thm/反函数定理.md', discipline: '分析' },
  // —— 结构定理 ——
  { id: 'dg:generalized-stokes-theorem', title: '广义 Stokes 定理', source: 'thm/广义 Stokes 定理.md', discipline: '微分几何' },
  { id: 'dg:poincare-lemma', title: 'Poincaré 引理', source: 'thm/Poincare 引理.md', discipline: '微分几何' },
];

/**
 * wiki 链接映射：语料里的概念名 → 本站节点 id。
 * 只收录本站确实存在的节点；其余链接去方括号留文字，不制造死链。
 */
const WIKI_MAP = new Map([
  // 本案例自身
  ...DG_NODES.map((node) => [node.title, node.id]),
  // 旧写法 / 别名
  ['张量场', 'dg:tensor'],
  ['光滑张量场', 'dg:tensor'],
  ['向量空间', 'bg:linear:vector'],
  ['群', 'bg:group:binary'],
  ['群公理', 'bg:group:binary'],
  ['秩', 'bg:linear:vector'],
  ['微分同胚', 'dg:homeomorphism'],
  ['嵌入定理', 'dg:smooth-embedding'],
  ['Whitney 嵌入定理', 'dg:smooth-embedding'],
  ['切空间', 'dg:tangent-coordinate-basis'],
  ['切向量', 'dg:tangent-vector-curve'],
  ['切映射', 'dg:tangent-vector-curve'],
  // 已存在的四个案例
  ['光滑流形的切空间', 'manifold:transition'],
  ['微分流形', 'manifold:ck-atlas'],
  ['拓扑流形（本站已有节点）', 'manifold:top-manifold'],
  ['黎曼度量', 'manifold:chart-atlas'],
  ['联络', 'tensor:field'],
  ['协变导数', 'tensor:field'],
  ['Christoffel 符号', 'tensor:non-tensor-gamma'],
  ['de Rham 上同调', 'dg:poincare-lemma'],
  ['Hodge 星算子', 'dg:differential-form'],
]);

/** 归一化标题层级：顶层节降到 ##，子节降到 ###，节点内不再出现 # 级标题。 */
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

/** 标签行里也可能嵌 wiki 链接（如 `#微分[[流形]]`），先去掉方括号再切分。 */
function parseTagLine(line) {
  return line
    .replace(/\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g, '$1')
    .split(/\s+/)
    .map((tag) => tag.replace(/^#/, '').replace(/[[\]]/g, '').trim())
    .filter(Boolean);
}

/** 三种源格式的元数据提取。表单里没有的字段一律留空，不代写。 */
function extractMeta(raw, node, fileName) {
  let text = raw;
  let tags = [];
  let summary = '';

  // 格式 B：YAML frontmatter
  if (text.startsWith('---\n')) {
    const end = text.indexOf('\n---', 3);
    if (end > 0) {
      const front = text.slice(4, end);
      text = text.slice(end + 4).replace(/^\n+/, '');
      const tagLine = front.match(/^tags:\s*(.*)$/m);
      if (tagLine) {
        const inlineTags = tagLine[1].match(/#[^\s#]+/g);
        tags = inlineTags ? inlineTags.map((tag) => tag.slice(1)) : [];
        if (tags.length === 0) {
          const listBlock = front.match(/^tags:\s*\n((?:\s*-\s*.+\n?)+)/m);
          if (listBlock) tags = listBlock[1].split('\n').map((line) => line.replace(/^\s*-\s*/, '').trim()).filter(Boolean);
        }
      }
    }
  }

  // 摘要：单行匹配，不能跨行——用 [^\n]+，否则 `.+` 会把整段正文吞进摘要。
  // 格式 A：`# 标题` 之后的 `> 摘要`
  const blockquote = text.match(/^>\s*([^\n]+)$/m);
  // 格式 B：`## 简介` 下的首段
  const intro = text.match(/^##\s*简介\s*\n+([^\n#][^\n]*)/m);
  if (intro) summary = intro[1].trim();
  else if (blockquote) summary = blockquote[1].trim();

  // 行内 `#标签 #标签` 行（格式 A/C）。要求整行全由 #标签 与空白组成，
  // 且不是 Markdown 标题（标题的 # 后有空格）。
  if (tags.length === 0) {
    const tagLine = text.match(/^(#[^\s#]+(?:\s+#[^\s#]+)+)\s*$/m);
    if (tagLine) tags = parseTagLine(tagLine[1]);
  }

  // 去掉开头的 `# 标题` 行、紧随的 blockquote 摘要，以及独立的标签行。
  const lines = text.split('\n');
  const kept = [];
  let droppedTitle = false;
  let droppedQuote = false;
  for (const line of lines) {
    const trimmed = line.trim();
    if (!droppedTitle && /^#\s+/.test(trimmed)) {
      // 只丢弃真正的节点标题行（含概念名的第一个 h1），不动 `# 前置知识` 之类的结构节。
      const headingText = trimmed.replace(/^#\s+/, '').replace(/\[\[|\]\]/g, '').trim();
      if (headingText.startsWith(node.title.slice(0, 2)) || headingText === node.title) { droppedTitle = true; continue; }
    }
    if (!droppedQuote && !droppedTitle && /^>\s*[^\n]+$/.test(trimmed)) { droppedQuote = true; continue; }
    if (summary && trimmed === '> ' + summary) { droppedQuote = true; continue; }
    if (/^#[^\s#]+(\s+#[^\s#]+)+\s*$/.test(trimmed)) continue;
    kept.push(line);
  }
  const body = kept.join('\n').replace(/^\n+/, '');

  void fileName;
  return { body, tags: [...new Set(tags.map((tag) => tag.replace(/[[\]]/g, '')).filter(Boolean))], summary };
}

function buildSection(node, meta, stats) {
  const tags = meta.tags.length ? meta.tags : [];
  const header = [
    `<!-- node:${node.id} -->`,
    '## ' + node.title,
    '',
  ];
  // 摘要本身也可能带 [[链接]]，必须同样走一次重写，否则会漏成方括号。
  if (meta.summary) header.push('> ' + rewriteWikiLinks(meta.summary, stats), '');
  if (tags.length) header.push('**源标签**：' + tags.map((tag) => `#${tag}`).join(' '), '');
  header.push(
    `**来源**：\`G:/DifferentialGeometry/object/${node.source}\`（只读快照，见 \`data/dg/\`）`,
    '',
    '---',
    '',
  );
  const body = rewriteWikiLinks(normalizeHeadings(meta.body.split('\n')).join('\n'), stats).trim();
  return [...header, body, '', '<!-- /node -->', ''].join('\n');
}

function main() {
  if (!existsSync(SOURCE_ROOT)) {
    console.error(`源目录不存在：${SOURCE_ROOT}`);
    process.exit(1);
  }
  const stats = { linked: 0, unlinked: 0, unlinkedNames: new Set() };
  const sections = [];
  const missing = [];
  const drifted = [];

  mkdirSync(SNAPSHOT_DIR, { recursive: true });
  const snapshotNames = new Set(readdirSync(SNAPSHOT_DIR));

  for (const node of DG_NODES) {
    const sourcePath = join(SOURCE_ROOT, node.source);
    if (!existsSync(sourcePath)) { missing.push(node.source); continue; }
    const raw = readFileSync(sourcePath, 'utf8');
    const fileName = node.id.replace(':', '-') + '.md';
    const snapshotPath = join(SNAPSHOT_DIR, fileName);
    snapshotNames.delete(fileName);
    if (existsSync(snapshotPath) && readFileSync(snapshotPath, 'utf8') !== raw) drifted.push(fileName);
    if (!CHECK_ONLY) writeFileSync(snapshotPath, raw, 'utf8');
    const meta = extractMeta(raw, node, node.source);
    if (!meta.body.trim()) { missing.push(node.source + '（正文为空）'); continue; }
    sections.push(buildSection(node, meta, stats));
  }

  if (missing.length) {
    console.error('以下源文件缺失或正文为空，需替换候选：');
    for (const item of missing) console.error('  - ' + item);
    process.exit(1);
  }

  console.log(`节点数：${sections.length} / ${DG_NODES.length}`);
  console.log(`wiki 链接：已对应 ${stats.linked} 处，未对应 ${stats.unlinked} 处（去方括号留文字）`);
  if (stats.unlinkedNames.size) {
    const top = [...stats.unlinkedNames].slice(0, 15);
    console.log(`未对应最多的概念名（前 15 / 共 ${stats.unlinkedNames.size} 个）：${top.join('、')}`);
  }
  if (drifted.length) console.log(`快照与源不一致（将被刷新）：${drifted.join(', ')}`);

  if (CHECK_ONLY) {
    if (snapshotNames.size) console.log(`快照目录中有 ${snapshotNames.size} 个多余文件：${[...snapshotNames].join(', ')}`);
    console.log('--check 模式：未写入任何文件。');
    return;
  }

  const header = [
    '<!-- 本文件由 scripts/build-dg-case.mjs 生成，请勿手工编辑；',
    '     源：G:/DifferentialGeometry/object（只读），改动请改源后重跑生成器。 -->',
    '',
  ].join('\n');
  writeFileSync(TARGET, header + sections.join('\n'), 'utf8');
  console.log(`已写入 ${TARGET}`);
}

main();
