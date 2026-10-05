import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';
import { REPO_ROOT } from '../core/ontology.mjs';
import { PAPER_ANCHORS, PAPER_ANCHOR_SOURCE, paperAnchorStats } from '../data/paper-anchors.mjs';

/**
 * 「网站维护」用的**只读**来源清单。
 *
 * 用户的要求：「把专稿和 arXiv 论文里的内容多梳理到网站维护里面。」
 *
 * 为什么走服务端读盘而不是在前端写死：这些材料的**权威版本在仓库里**（专稿分章 Markdown、
 * arXiv 投稿包、发布与交付记录、本机参考文献）。写死一份清单，改文件之后页面就开始说谎；
 * 从盘上读，页面永远等于仓库现状。
 *
 * 三条纪律：
 * 1. **只读**：只用 readdir/stat/readFile，不写不改；
 * 2. **不泄露绝对路径**：对外一律给仓库相对路径（`relativeToRepo` 同口径）；
 * 3. **读不到就说读不到**：目录缺了返回空清单并带 `available: false`，不编条目。
 *
 * 2026-10（TODO A4-33）加了一层**带时间戳的缓存**：这一页每次切过来都会重新读盘
 * （readdir/stat 加起来几百次系统调用）。缓存 30 秒，并把 `cached` 与 `readMs` 一起返回——
 * 「这份清单是什么时候读的」本来就该写出来，缓存之后更要写。
 */

const THESIS_DIR = 'mcs-foundations';
const THESIS_SKIP = new Set(['__pycache__', 'node_modules', '.git']);
/** 读盘缓存有效期：30 秒。见 `maintenanceSources` 里的说明与 `tests/research-maintenance.mjs` 的实测。 */
const CACHE_TTL_MS = 30 * 1000;
/** @type {{ readAtMs: number, value: object, readMs: number } | null} */
let cache = null;

function relativeToRepoPath(absolute) {
  return relative(REPO_ROOT, absolute).replaceAll('\\', '/');
}

function safeRead(absolute) {
  try { return readFileSync(absolute, 'utf8'); } catch { return null; }
}

/** 目录清单：只列一层，带大小与相对路径；读不到就返回空。 */
function listEntries(absoluteDir, filter = () => true) {
  if (!existsSync(absoluteDir)) return [];
  let names;
  try { names = readdirSync(absoluteDir); } catch { return []; }
  return names
    .filter((name) => !THESIS_SKIP.has(name))
    .map((name) => {
      const absolute = join(absoluteDir, name);
      let stats;
      try { stats = statSync(absolute); } catch { return null; }
      return { name, absolute, dir: stats.isDirectory(), bytes: stats.isDirectory() ? 0 : stats.size };
    })
    .filter((entry) => entry !== null && filter(entry))
    .sort((left, right) => left.name.localeCompare(right.name, 'zh'))
    .map((entry) => ({ name: entry.name, path: relativeToRepoPath(entry.absolute), dir: entry.dir, bytes: entry.bytes }));
}

/**
 * 专稿章节：文件名形如 `01-元理论与可构造宇宙.md`。
 *
 * 标题取自文件名本身（分章 Markdown 的第一行标题与文件名一致，这只是省一次读盘；
 * 若两者不一致，这里给的是**文件名**，页面会注明口径）。
 */
function thesisChapters() {
  return listEntries(join(REPO_ROOT, THESIS_DIR), (entry) => !entry.dir && /^\d{2}-.*\.md$/.test(entry.name))
    .map((entry) => ({
      ...entry,
      number: entry.name.slice(0, 2),
      title: entry.name.replace(/^\d{2}-/, '').replace(/\.md$/, ''),
    }));
}

/** arXiv 投稿包：文件清单 + 元数据摘要（标题/分类/摘要首句）+ **正文锚点**，只读。 */
function arxivPackage() {
  const dir = join(REPO_ROOT, THESIS_DIR, 'arxiv');
  const files = listEntries(dir, (entry) => !entry.dir || entry.name !== 'dist');
  const metadata = safeRead(join(dir, 'submission-metadata.txt'));
  const bib = safeRead(join(dir, 'references.bib')) ?? '';
  const mainTex = safeRead(join(dir, 'main.tex')) ?? '';
  const titleMatch = /\\title\{([^}]*)\}/.exec(mainTex);
  const abstractMatch = /\\begin\{abstract\}([\s\S]*?)\\end\{abstract\}/.exec(mainTex);
  const clean = (text) => text.replace(/\\[a-zA-Z]+\{?|[{}$\\]/g, ' ').replace(/\s+/g, ' ').trim();
  return {
    available: existsSync(dir),
    path: relativeToRepoPath(dir),
    files: files.filter((entry) => !entry.dir),
    dirs: files.filter((entry) => entry.dir).map((entry) => entry.name),
    metadata: metadata
      ? metadata.split('\n').map((line) => line.trim()).filter((line) => line.length > 0).slice(0, 12)
      : [],
    bibEntries: (bib.match(/@\w+\{/g) ?? []).length,
    bibKeys: [...bib.matchAll(/@\w+\{([^,]+),/g)].map((match) => match[1].trim()).slice(0, 40),
    title: titleMatch ? clean(titleMatch[1]) : null,
    abstractHead: abstractMatch ? clean(abstractMatch[1]).slice(0, 240) : null,
    // 正文锚点：解析出来的 label 清单 + 与本体节点的对照（TODO A4-31）。
    anchors: paperAnchors(mainTex),
  };
}

/**
 * 正文锚点 ↔ 本体节点（2026-10 加，TODO A4-31）。
 *
 * 解析 `main.tex` 里的 `\label{...}`（**不猜**：只认真的写在文件里的），
 * 再与 `data/paper-anchors.mjs` 的注册表对照。三类结果都要报出来：
 * - `matched`：注册表里有、论文里也有 → 打通了；
 * - `missingInPaper`：注册了但论文里找不到（改名/删节了）→ 照实说，别让陈旧对照留着；
 * - `unregistered`：论文里有、注册表没登记 → 数量与样例（说明还有多少没梳理）。
 */
function paperAnchors(mainTex) {
  const labels = [...mainTex.matchAll(/\\label\{([^}]+)\}/g)].map((match) => match[1]);
  const counts = labels.reduce((acc, label) => ({ ...acc, [label]: (acc[label] ?? 0) + 1 }), {});
  const registered = new Set(PAPER_ANCHORS.map((entry) => entry.anchor));
  const mapped = PAPER_ANCHORS.filter((entry) => entry.nodeId !== null);
  return {
    source: PAPER_ANCHOR_SOURCE,
    available: mainTex.length > 0,
    labelCount: labels.length,
    stats: paperAnchorStats(),
    /**
     * 注册表逐条 + 在论文里是否真的存在。`matched` 是「论文里能找到这个 label」，
     * 与「挂上了本体节点」是两件事（`nodeId: null` 的条目照样能 matched）。
     */
    entries: PAPER_ANCHORS.map((entry) => ({
      ...entry,
      inPaper: Object.hasOwn(counts, entry.anchor),
    })),
    missingInPaper: PAPER_ANCHORS.filter((entry) => !Object.hasOwn(counts, entry.anchor)).map((entry) => entry.anchor),
    // 已经打通（既有节点又能在论文里找到）的条数，是这一项的验收数字。
    linkedCount: mapped.filter((entry) => Object.hasOwn(counts, entry.anchor)).length,
    unregistered: [...new Set(labels)].filter((label) => !registered.has(label)),
  };
}

/** 发布与交付记录：从文件名解析版本号与日期（TODO A4-32）。 */
function releaseRecords() {
  const dir = join(REPO_ROOT, THESIS_DIR, 'publication');
  const groups = ['releases', 'history'];
  /**
   * 文件名形如 `2026-10-02-r1`、`20261002-before`。
   *
   * 解析不出来就如实留空（`date: null` / `version: null`），页面按「未解析」显示——
   * 不猜日期，也不把目录名当版本号。目录内还会取 README/交付记录的修改时间作为**旁证**，
   * 两者都写出来，读者可以自己判断哪个更可信。
   */
  const parse = (name) => {
    const iso = /^(\d{4})-(\d{2})-(\d{2})(?:-(.+))?$/.exec(name);
    if (iso) return { date: `${iso[1]}-${iso[2]}-${iso[3]}`, label: iso[4] ?? null };
    const compact = /^(\d{4})(\d{2})(\d{2})(?:-(.+))?$/.exec(name);
    if (compact) return { date: `${compact[1]}-${compact[2]}-${compact[3]}`, label: compact[4] ?? null };
    return { date: null, label: null };
  };
  /**
   * 名字里日期后面那一段**不都是版本号**：`20261002-before` 的 `before` 是**阶段标签**
   * （发布前的快照），`2026-10-02-r1` 的 `r1` 才像版本。因此两个字段分开：
   * `label` 原样保留，`version` 只在它长得像版本号时才填——不把阶段标签说成版本。
   */
  const versionLike = (label) => (label && /^(?:v?\d+(?:\.\d+)*|r\d+)$/.test(label) ? label : null);
  const records = [];
  for (const group of groups) {
    const groupDir = join(dir, group);
    if (!existsSync(groupDir)) continue;
    for (const entry of listEntries(groupDir, (item) => item.dir)) {
      const absolute = join(groupDir, entry.name);
      const parsed = parse(entry.name);
      let modifiedAt = null;
      try { modifiedAt = statSync(absolute).mtime.toISOString(); } catch { /* 拿不到时间不影响条目 */ }
      let fileCount = 0;
      try { fileCount = readdirSync(absolute).length; } catch { /* 空目录或读不到 */ }
      records.push({
        group,
        name: entry.name,
        path: relativeToRepoPath(absolute),
        date: parsed.date,
        label: parsed.label,
        version: versionLike(parsed.label),
        modifiedAt,
        fileCount,
      });
    }
  }
  /*
   * 排序：日期倒序 → 同一天**正式发布（releases）排在历史快照（history）之前** → 名字倒序。
   * 全解析不出来的排最后（按名字稳定排序）。页面直接按这个顺序展示，不再自己排。
   */
  const groupRank = { releases: 0, history: 1 };
  records.sort((left, right) => {
    if (left.date && right.date && left.date !== right.date) return right.date.localeCompare(left.date);
    if (left.date && !right.date) return -1;
    if (!left.date && right.date) return 1;
    const rank = (groupRank[left.group] ?? 9) - (groupRank[right.group] ?? 9);
    if (rank !== 0) return rank;
    return right.name.localeCompare(left.name, 'zh');
  });
  return {
    path: relativeToRepoPath(dir),
    available: existsSync(dir),
    groups,
    records,
    parsedCount: records.filter((record) => record.date !== null).length,
    latest: records.find((record) => record.date !== null) ?? null,
  };
}

/** 发布与交付、导读、验证等文档：按目录分组列出，方便「网站维护」按主题梳理。 */
function thesisDocs() {
  const groups = ['publication', 'validation', 'evidence', 'notes', 'edition', 'cases'];
  return groups
    .map((name) => {
      const dir = join(REPO_ROOT, THESIS_DIR, name);
      return { name, path: relativeToRepoPath(dir), available: existsSync(dir), entries: listEntries(dir) };
    })
    .filter((group) => group.available);
}

/** 本机参考文献（只列清单，不复制内容）：用来核对「引用是否可核验」。 */
function references() {
  const dir = join(REPO_ROOT, 'reference');
  return {
    path: relativeToRepoPath(dir),
    available: existsSync(dir),
    files: listEntries(dir).filter((entry) => !entry.dir),
  };
}

export function maintenanceSources({ force = false, now = () => Date.now() } = {}) {
  /*
   * 缓存（TODO A4-33）：页面每次切到「专稿与 arXiv」都会请求一次，
   * 而每次读盘要跑几百次 readdir/stat。30 秒的时间戳缓存把重复读挡住，
   * 同时**如实报出**这份数据是什么时候读的、用了多久、这次是不是缓存命中——
   * 缓存本身不该变成「页面在说谎」的来源。
   */
  if (!force && cache && now() - cache.readAtMs < CACHE_TTL_MS) {
    return { ...cache.value, cached: true, readMs: cache.readMs, generatedAt: cache.value.generatedAt };
  }
  const startedAt = now();
  const chapters = thesisChapters();
  const value = {
    // 读盘时间写进返回：页面据此说明「这份清单是什么时候的现状」。
    generatedAt: new Date(startedAt).toISOString(),
    thesis: {
      path: THESIS_DIR,
      available: existsSync(join(REPO_ROOT, THESIS_DIR)),
      chapters,
      docs: thesisDocs(),
    },
    arxiv: arxivPackage(),
    releases: releaseRecords(),
    references: references(),
    /*
     * 口径说明随数据一起下发，避免页面自己编解释：
     * 清单来自仓库当前状态，不是数据库；改动文件后刷新即可，无需重建本体。
     */
    note: '清单按仓库当前状态实时读取（只读）；标题取自分章文件名，与本体内登记的章节引用是两套口径，页面分别标注。'
      + `读盘结果缓存 ${Math.round(CACHE_TTL_MS / 1000)} 秒（页面会标出这次是实时读还是缓存）。`,
  };
  const readMs = now() - startedAt;
  cache = { readAtMs: startedAt, value, readMs };
  return { ...value, cached: false, readMs };
}

/** 测试与「刷新」入口用：清掉缓存，让下一次调用真的去读盘。 */
export function resetMaintenanceCache() {
  cache = null;
}
