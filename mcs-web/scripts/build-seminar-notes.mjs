/**
 * 从 `H:/微分几何讨论班/vault/Geometry&Topology` 生成讨论班笔记的站点正文块。
 *
 * ## 为什么是「快照 + 生成器」而不是运行期直接读 H 盘
 *
 * 与 `scripts/build-dg-case.mjs` 同一条理由：`data/` 是公共本体 M 的**版本化来源**，
 * 若运行期依赖仓库之外的文件，`contentHash` 就取决于本机磁盘状态，
 * `npm run check` 与测试都不可复现。因此源笔记先按 `data/dg/<block>.md` 复制快照，
 * 正文从快照生成。H 盘**始终只读**，站点改动不回写源笔记。
 *
 * ## 这一批与 `build-dg-case.mjs` 那批的关系（必须分清）
 *
 * 那批 30 个节点取自 `G:/DifferentialGeometry/object`——**G 盘现在已不存在**，
 * 它只能靠当年留下的 `data/dg/` 旧快照与 `data/cases/05-differential-geometry.md` 继续存在，
 * 因此那个生成器不能重跑（会因源缺失而退出），也不该重跑。
 * 本脚本处理的是**同一批笔记的更新版**（模板化之后的世代），两批的正文块与正文文件都分开：
 * 旧的进 `05-differential-geometry.md`，新的进 `09-seminar-notes.md`——
 * 两个生成器写同一个文件必然互相覆盖。
 *
 * ## 用法
 *
 *   node scripts/build-seminar-notes.mjs            # 刷新快照并生成正文
 *   node scripts/build-seminar-notes.mjs --check    # 只校验快照与源是否一致（不写文件）
 *
 * ## 源笔记的格式并不统一（实测，转换器必须逐条兜住）
 *
 * - **标题只能从文件名取**：`def/拓扑空间.md`、`def/拓扑流形.md`、`def/微分流形.md` 的
 *   第一行不是标题而是 `# 前置知识`（标题行丢了）。正文里的第一个 h1 因此**不可信**。
 * - 摘要的落法有两种：`> 引用块`（多数）或没有摘要（`σ-代数`、`Ricci_Flow_NotefromGemini`）。
 * - 标签行有的有（`#微分几何 #黎曼几何 …`）有的没有。
 * - 节数有的 11 个（完整模板）有的 1 个（只有对象名一节，内容直接铺开）。
 *
 * 这些差异**不抹平**：能取到的就取，取不到的留空并在 `--check` 的报告里如实列出，
 * 不替源笔记编摘要或标签。
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, copyFileSync, openSync, closeSync, unlinkSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { MCS_WEB_ROOT } from '../core/ontology.mjs';
import { SEMINAR_NOTES } from '../data/seminar-notes.mjs';

const SOURCE_ROOT = 'H:/微分几何讨论班/vault/Geometry&Topology';
const SNAPSHOT_DIR = resolve(MCS_WEB_ROOT, 'data', 'dg');
const TARGET = resolve(MCS_WEB_ROOT, 'data', 'cases', '09-seminar-notes.md');
const LOCK = resolve(MCS_WEB_ROOT, 'data', '.seminar-notes.lock');
const CHECK_ONLY = process.argv.includes('--check');

/**
 * 独占锁：这个脚本会**整个重写**正文文件，两个人同时跑必然互相截断。
 *
 * 用 `wx` 打开一个空锁文件（存在就抛 EEXIST），拿到就干活，干完删掉。
 * 拿不到时**不排队、不覆盖**：直接退出并让人稍后重跑——排队会让两个人以为自己在跑同一份内容，
 * 而这份内容是 26 篇笔记的合集，谁先谁后都会盖掉对方的中间结果。
 * 锁文件在 `data/` 下且以 `.` 开头，`data/` 是公共本体的版本化来源，它进 `.gitignore`。
 */
function acquireLock() {
  try {
    const fd = openSync(LOCK, 'wx');
    writeFileSync(fd, `${process.pid}\n${new Date().toISOString()}\n`);
    closeSync(fd);
    return true;
  } catch (error) {
    if (error.code === 'EEXIST') return false;
    throw error;
  }
}

function releaseLock() {
  try { unlinkSync(LOCK); } catch { /* 已被清掉就算了：锁不该因为删除失败而让脚本失败。 */ }
}

/**
 * 站点上其它节点的**标题 → id** 映射，供 `[[wiki 链接]]` 重写。
 *
 * 与 `build-dg-case.mjs` 的 `WIKI_MAP` 同一套做法：**只收录本站确实存在的节点**，
 * 其余链接去方括号留文字，**不制造死链**。
 * 这里的条目按「讨论班笔记实际引用到的概念」增补；`data/seminar-notes.mjs` 里
 * 每个节点自己的标题也会自动进表（见 `main()`），因此不必手抄新节点。
 */
const WIKI_MAP = new Map([
  // —— 讨论班笔记自身覆盖的对象 ——
  ['内积', 'gt:inner-product'],
  ['黎曼度量', 'gt:riemannian-metric'],
  ['黎曼流形', 'gt:riemannian-manifold'],
  ['测地线', 'gt:geodesic'],
  ['黎曼曲率张量', 'gt:riemann-curvature-tensor'],
  ['和乐群', 'gt:holonomy-group'],
  ['李导数', 'gt:lie-derivative'],
  ['协变张量场', 'gt:covariant-tensor-field'],
  ['横截性', 'gt:transversality'],
  ['Jacobi矩阵', 'gt:jacobi-matrix'],
  ['σ-代数', 'gt:sigma-algebra'],
  ['Ricci流', 'gt:ricci-flow'],
  ['Sard定理', "gt:sard-theorem"],
  ['嵌入定理', 'gt:embedding-theorem'],
  ['分离公理', 'gt:separation-axioms'],
  ['可数公理', 'gt:countability-axioms'],
  ['压缩映射原理', 'gt:contraction-principle'],
  ['切向量', 'gt:tangent-vector'],
  ['切矢', 'gt:tangent-vector'],
  // —— 已有 30 个节点（旧世代）——
  ['拓扑空间', 'dg:topological-space'],
  ['同胚', 'dg:homeomorphism'],
  ['流形', 'dg:manifold'],
  ['拓扑流形', 'dg:topological-manifold'],
  ['微分流形', 'dg:topological-manifold'],
  ['光滑流形', 'dg:smooth-manifold'],
  ['坐标图', 'dg:coordinate-chart'],
  ['图册', 'dg:smooth-atlas'],
  ['光滑图册', 'dg:smooth-atlas'],
  ['光滑结构', 'dg:smooth-structure'],
  ['单位分解', 'dg:partition-of-unity'],
  ['紧致性', 'dg:compactness'],
  ['度量空间', 'dg:metric-space'],
  ['度量完备性', 'dg:metric-completeness'],
  ['切空间', 'dg:tangent-coordinate-basis'],
  ['切丛', 'dg:tangent-bundle'],
  ['向量场', 'dg:smooth-vector-field'],
  ['光滑向量场', 'dg:smooth-vector-field'],
  ['张量', 'dg:tensor'],
  ['张量场', 'dg:tensor'],
  ['微分形式', 'dg:differential-form'],
  ['外微分', 'dg:d-squared-zero'],
  ['拉回', 'dg:form-pullback'],
  ['隐函数定理', 'dg:implicit-function-theorem'],
  ['反函数定理', 'dg:inverse-function-theorem'],
  ['Stokes 定理', 'dg:generalized-stokes-theorem'],
  ['Poincaré 引理', 'dg:poincare-lemma'],
  // —— 其它案例里已有的对象（跨案例接口，不新建节点）——
  ['群', 'bg:group:binary'],
  ['向量空间', 'bg:linear:vector'],
  ['线性空间', 'bg:linear:vector'],
  ['实数', 'rudin:ordered-field'],
  ['集合', 'bg:set:function'],
  ['映射', 'bg:set:function'],
  ['连续映射', 'top:continuous-map'],
  ['紧致', 'top:compactness'],
  ['连通性', 'top:connectedness'],
  ['仿紧性', 'top:paracompactness'],
  ['分离公理：T0–T4、正则与正规', 'top:separation-axioms'],
  ['可数公理：A1、A2、可分与 Lindelöf', 'top:countability-axioms'],
  ['Christoffel 符号', 'tensor:non-tensor-gamma'],
  ['联络', 'tensor:field'],
  ['曲率', 'liang:riemann-tensor'],
  ['爱因斯坦场方程', 'liang:einstein-equation'],
  ['闵氏时空', 'liang:minkowski-spacetime'],
  ['度规张量场', 'liang:metric-tensor'],
  ['Killing 矢量场', 'liang:killing-field'],
  ['流的几何化猜想', 'liang:new-standard-cosmology'],
]);

/**
 * **被合并吸收的 id → 规范 id**（2026-10-12 加，踩过）。
 *
 * 源笔记里的 wiki 链接写的是概念名；而站点上同一个对象可能有多处登记，并在装配期由
 * `data/merges.mjs` 收口到一个规范节点——**收口之后，被吸收的那个 id 就不在节点表里了**。
 * 生成器若照原样写成 `dg:homeomorphism`，`tests/core.test.mjs` 的「正文里不残留 wiki 链接」
 * 当场就红（实测：`dg:inverse-function-theorem 的正文链接指向未知节点`）。
 *
 * 只列**本批笔记实际链接到的**那几个；完整的合并关系以 `data/merges.mjs` 为准。
 */
const ABSORBED_TO_CANONICAL = new Map([
  ['dg:topological-space', 'top:space'],
  ['dg:homeomorphism', 'top:homeomorphism'],
  ['dg:topological-manifold', 'top:topological-manifold'],
  ['dg:manifold', 'top:topological-manifold'],
  ['dg:smooth-manifold', 'top:differentiable-manifold'],
]);

/** 把被吸收的 id 换成规范 id，避免制造「指向未知节点」的链接。 */
const canonicalId = (id) => ABSORBED_TO_CANONICAL.get(id) ?? id;

/** 归一化标题层级：顶层节降到 ##，子节降到 ###，正文块内不再出现 # 级标题。 */
function normalizeHeadings(lines) {
  return lines.map((line) => {
    const match = line.match(/^(#{1,6})\s+(.*)$/);
    if (!match) return line;
    return '#'.repeat(Math.min(match[1].length + 1, 6)) + ' ' + match[2];
  });
}

/** 重写 wiki 链接；返回正文与统计。 */
function rewriteWikiLinks(text, stats) {
  return text.replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (whole, target, alias) => {
    const label = (alias ?? target).trim();
    // 链接目标可能带路径前缀（`AI生成的笔记/Geometry&Topology/拓扑空间`）：只按最后一段找。
    const key = target.trim().split('/').pop().trim();
    const id = WIKI_MAP.get(key);
    if (id) {
      stats.linked += 1;
      // 被合并吸收的 id 换成规范 id：否则链接指向一个装配后不存在的节点。
      return `[${label}](/nodes/${encodeURIComponent(canonicalId(id))})`;
    }
    stats.unlinked += 1;
    stats.unlinkedNames.set(key, (stats.unlinkedNames.get(key) ?? 0) + 1);
    return label;
  });
}

/**
 * 从源笔记抽出：摘要、标签、正文。
 *
 * 三件事都不猜：
 * - **标题不由这里决定**（见文件头：多篇的 h1 丢了），调用方按文件名给标题；
 * - 摘要取**第一个引用块**（模板里紧跟标题的那句）；没有就留空；
 * - 标签取**整行全是 `#标签`**的那一行；没有就留空数组。
 */
function extractNote(raw) {
  const text = raw.replace(/^\uFEFF/, '');
  const lines = text.split('\n');

  // 摘要：第一个引用块（可能跨行，取到第一个空行为止，最多 3 行）。
  let summary = '';
  const quoteStart = lines.findIndex((line) => /^>\s*\S/.test(line));
  if (quoteStart >= 0) {
    const quoteLines = [];
    for (let index = quoteStart; index < lines.length && quoteLines.length < 3; index += 1) {
      const match = lines[index].match(/^>\s?(.*)$/);
      if (!match) break;
      const piece = match[1].trim();
      if (!piece && quoteLines.length) break;
      if (piece) quoteLines.push(piece);
    }
    summary = quoteLines.join(' ').trim();
  }

  // 标签：整行由 `#标签` 与空白组成（标题的 `#` 后面有空格，不会误判）。
  let tags = [];
  const tagLine = lines.find((line) => /^#[^\s#]+(\s+#[^\s#]+)+\s*$/.test(line.trim()));
  if (tagLine) {
    tags = tagLine.trim().split(/\s+/).map((tag) => tag.replace(/^#/, '')).filter(Boolean);
  }

  // 正文：去掉开头的 h1 标题行（如果第一行就是）、紧随的引用块摘要、以及标签行。
  const kept = [];
  let droppedQuote = quoteStart < 0;
  for (let index = 0; index < lines.length; index += 1) {
    const trimmed = lines[index].trim();
    if (/^#\s+/.test(trimmed) && kept.length === 0 && index === 0) continue;
    if (!droppedQuote && /^>\s?/.test(trimmed)) continue;
    if (!droppedQuote && trimmed === '') { droppedQuote = true; continue; }
    if (tagLine && trimmed === tagLine.trim()) continue;
    if (/^---\s*$/.test(trimmed) && kept.length === 0) continue;
    kept.push(lines[index]);
  }
  const body = kept.join('\n').replace(/^\n+/, '');
  return { summary, tags, body };
}

function buildSection(note, meta, stats) {
  const header = [`<!-- node:${note.contentRef} -->`, '## ' + note.title, ''];
  if (meta.summary) header.push('> ' + rewriteWikiLinks(meta.summary, stats), '');
  if (meta.tags.length) header.push('**源标签**：' + meta.tags.map((tag) => `#${tag}`).join(' '), '');
  header.push(
    `**来源**：\`${note.source}\`（只读快照，见 \`data/dg/\`）`,
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
    console.error('（H 盘未挂载时不要重跑本脚本：正文块已经落在仓库里，缺的只是「重新生成」这一步。）');
    process.exit(1);
  }

  /*
   * 只处理**要正文块**的条目。两类不产块，都是登记表里显式写的决定（各带自己的字段），
   * 不是这里静默丢的：
   *   - `status: 'skip'`：同一主题的第二份笔记、来源无法核实的 AI 生成稿——它连节点都没有，
   *     产一个没有节点引用的块会变成「装配期找不到主人的孤儿块」；
   *   - `refreshOnly: true`：**刷新对**。它的块要产（正文正是它提供的），
   *     但节点由旧世代那条承担，所以它照样进 `asNodes`——下面的过滤条件**故意不排除它**。
   */
  const asNodes = SEMINAR_NOTES.filter((note) => note.status !== 'skip' && note.id && note.contentRef);
  const skipped = SEMINAR_NOTES.filter((note) => note.status === 'skip');

  // 每个节点自己的标题进 wiki 表：不手抄新节点，也不会漏掉改名。
  for (const note of asNodes) WIKI_MAP.set(note.title, note.id);

  const stats = { linked: 0, unlinked: 0, unlinkedNames: new Map() };
  const sections = [];
  const problems = [];
  const drifted = [];
  const noSummary = [];
  const noTags = [];

  mkdirSync(SNAPSHOT_DIR, { recursive: true });

  for (const note of asNodes) {
    const absolute = join(SOURCE_ROOT, note.source);
    if (!existsSync(absolute)) { problems.push(`源文件缺失：${note.source}`); continue; }
    const raw = readFileSync(absolute, 'utf8');
    const snapshotPath = join(SNAPSHOT_DIR, `${note.contentRef}.md`);
    if (existsSync(snapshotPath) && readFileSync(snapshotPath, 'utf8') !== raw) drifted.push(note.contentRef);
    if (!CHECK_ONLY) copyFileSync(absolute, snapshotPath);

    const meta = extractNote(raw);
    if (!meta.summary) noSummary.push(note.contentRef);
    if (!meta.tags.length) noTags.push(note.contentRef);
    if (!meta.body.trim()) { problems.push(`正文为空：${note.source}`); continue; }
    sections.push(buildSection(note, meta, stats));
  }

  console.log(`笔记数：${sections.length} / ${asNodes.length}（另有 ${skipped.length} 篇按登记表的决定不成节点）`);
  for (const note of skipped) console.log(`  跳过：${note.source} — ${note.reason.split('。')[0]}。`);
  console.log(`wiki 链接：已对应 ${stats.linked} 处，未对应 ${stats.unlinked} 处（去方括号留文字）`);
  if (stats.unlinkedNames.size) {
    const top = [...stats.unlinkedNames.entries()].sort((a, b) => b[1] - a[1]).slice(0, 15);
    console.log(`未对应最多的概念名（前 15 / 共 ${stats.unlinkedNames.size} 个）：${top.map(([name, count]) => `${name}×${count}`).join('、')}`);
  }
  // 如实列出源笔记的缺项，不替它编（见文件头「格式并不统一」）。
  if (noSummary.length) console.log(`源笔记没有摘要（留空，不代写）：${noSummary.length} 篇 — ${noSummary.join(', ')}`);
  if (noTags.length) console.log(`源笔记没有标签行（留空）：${noTags.length} 篇 — ${noTags.join(', ')}`);
  if (drifted.length) console.log(`快照与源不一致${CHECK_ONLY ? '（--check：未刷新）' : '（已刷新）'}：${drifted.join(', ')}`);

  if (problems.length) {
    console.error('以下问题必须处理：');
    for (const problem of problems) console.error('  - ' + problem);
    process.exit(1);
  }

  if (CHECK_ONLY) {
    console.log('--check 模式：未写入任何文件。');
    return;
  }

  if (!acquireLock()) {
    console.error(`另一个生成器正在运行（锁文件：${LOCK}）。`);
    console.error('它写的是 26 篇笔记的**合集**，不会因为你重跑而只改你那一篇；请等它结束后再跑。');
    process.exit(2);
  }

  try {
    const header = [
      '<!-- 本文件由 scripts/build-seminar-notes.mjs 生成，请勿手工编辑；',
      `     源：${SOURCE_ROOT}（只读），改动请改源笔记后重跑生成器。`,
      '',
      '     为什么单独一个文件、而不是并入 05-differential-geometry.md：',
      '     那个文件由 scripts/build-dg-case.mjs 生成，而它的源（G: 盘）已不存在、只能靠旧快照；',
      '     两个生成器写同一个文件必然互相覆盖。分开之后两边各自幂等，正文块名也各自可读。 -->',
      '',
    ].join('\n');
    writeFileSync(TARGET, header + sections.join('\n'), 'utf8');
    console.log(`已写入 ${TARGET}`);
  } finally {
    releaseLock();
  }
}

main();
