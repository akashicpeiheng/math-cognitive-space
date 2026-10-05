#!/usr/bin/env node
/**
 * 导出「可开源」的发布包（2026-10 发布前加）。
 *
 * ## 为什么不是「把整个仓库推上去」
 *
 * 主工作区里有四类不能公开的东西（见 `资料保护清单.md`）：
 * 1. **个人数据**：学习档案数据库、浏览器档案、诊断截图；
 * 2. **第三方材料**：离线教材 PDF、为核验引用做的页码级摘录与书页扫描；
 * 3. **历史快照**：多代备份目录，与当前版本不一致，公开只会误导；
 * 4. **生产流水线**：指向本机目录联接的自动化脚本。
 *
 * 因此发布包走**白名单**：只复制明确列出的路径，而不是「复制全部再排除」——
 * 后者一旦漏写一条排除规则，泄漏是静默的。
 *
 * ## 导出的最后一步是审计，不是总结
 *
 * 复制完成后会真的遍历产物：
 * - 禁用路径（`mcs-foundations/evidence`、`reference/` 等）出现即失败；
 * - 命中已列出的私钥与访问密钥模式即失败（不是完整的秘密扫描）；
 * - 命中**本地禁用词表**（`design/release-deny-list.json`，不随发布包分发）即失败；
 *   缺表时如实报未检查（`disclosuresChecked: false`），不假装通过；
 * - 用户目录路径出现即失败，工作盘符路径作为人工复核提示。
 *
 * 用法：
 *
 *     node mcs-web/scripts/export-open-source.mjs --out <目录>
 *
 * 目标目录必须不存在或为空；脚本不覆盖既有目录。
 */
import { cpSync, existsSync, lstatSync, mkdirSync, readFileSync, readdirSync, realpathSync, statSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const MCS_WEB_ROOT = resolve(HERE, '..');
const REPO_ROOT = resolve(MCS_WEB_ROOT, '..');
const RELEASE_DIR = join(MCS_WEB_ROOT, 'release');

/** 白名单：`[仓库内路径, 发布包内路径]`。 */
const INCLUDE = [
  ['mcs-web', 'mcs-web'],
  ['mcs-foundations/validation/certification', 'mcs-foundations/validation/certification'],
  ['mcs-foundations/arxiv', 'mcs-foundations/arxiv'],
  ['mcs-foundations/publication', 'mcs-foundations/publication'],
  ['mcs-foundations/cases', 'mcs-foundations/cases'],
  ['mcs-foundations/edition', 'mcs-foundations/edition'],
  ['mcs-foundations/00-README.md', 'mcs-foundations/00-README.md'],
  ['mcs-foundations/15-验证与完成标准.md', 'mcs-foundations/15-验证与完成标准.md'],
];

/**
 * 复制时要跳过的目录名。
 *
 * 除依赖与运行状态外，还包括三类**历史/内部材料**：
 * - `revisions`：验证过程的逐版快照，与当前版本不一致；
 * - `history`：发布前的整体快照；
 * - `notes`：内部构建笔记与给 AI 的执行提示词。
 *
 * 它们的公开价值低，而「和历史版本对不上」会实际误导读者。
 */
const SKIP_DIRS = new Set([
  'node_modules', 'runtime', 'tmp', 'dist', 'backups', '.git', '__pycache__',
  'revisions', 'history', 'notes', '.vercel', 'browser-profile', 'pc-profile',
  'chrome-profile', 'diagnostics',
  // `mcs-web/release/` 是发布包**素材**（许可证、声明、投稿指南的源文件与 README 改名源）。
  // 它们会被复制到发布包的根目录，不再在 `mcs-web/` 下留一份副本。
  'release',
]);
/** 复制时要跳过的文件名。 */
const SKIP_FILES = new Set(['config.local.json', 'credentials.json', '.env']);
/** 复制时要跳过的后缀。 */
const SKIP_SUFFIXES = [
  '.sqlite3', '.sqlite3-shm', '.sqlite3-wal', '.log', '.pid', '.pyc', '.pyo',
  '.aux', '.out', '.toc', '.synctex.gz', '.tsbuildinfo',
];
// 只排除已确认的构建目录；正式 submission/ 与原创 PDF 仍保留。
const SKIP_PATHS = ['mcs-foundations/arxiv/output', 'mcs-foundations/arxiv/package-staging'];

/** 发布包里绝对不能出现的路径片段。 */
const FORBIDDEN_PARTS = [
  'mcs-foundations/evidence',   // 页码级摘录与书页扫描
  'reference/',                 // 离线教材 PDF
  'ima-geometry',               // 生产流水线与早期运行根
  'ima-notes',
  'browser-profile',
  'pc-profile',
  'diagnostics/',
  'mcs-site/',
  'mcs-bridge/',
  'MCS_vault/',
  'legacy/',
  'migration-backup/',
  '.bridge-research',
  '资料保护清单',
  '工作区梳理',
];

const SECRET_PATTERNS = [
  ['私钥', /-----BEGIN [A-Z ]*PRIVATE KEY-----/],
  ['AWS 访问密钥', /\bAKIA[0-9A-Z]{16}\b/],
  ['OpenAI 风格密钥', /\bsk-[A-Za-z0-9_-]{24,}\b/],
  ['GitHub 令牌', /\bgh[pousr]_[A-Za-z0-9]{20,}\b/],
  ['Slack 令牌', /\bxox[abprs]-[A-Za-z0-9-]{10,}\b/],
];

/**
 * 发布包禁用词表（本地，2026-10-05 加）。
 *
 * 工作区里有些内容属于**本地保留**：写了就不该随发布包分发。词表因此不放在本脚本里——
 * 这个脚本会随发布包一起公开，把要拦的字样写进来，等于把「这里有个不想公开的东西」
 * 连同字样一起公开出去。表放在 `design/`（不在导出白名单里，见 INCLUDE）。
 *
 * 缺表时这一项**如实报未检查**（`disclosuresChecked: false`），不假装通过——
 * 公开仓库的克隆里没有这张表，那里能做的检查就只有上面那几类。
 */
const DENY_LIST_PATH = join(REPO_ROOT, 'design', 'release-deny-list.json');

/** 读本地禁用词表；表不存在返回 null（调用方据此报"未检查"）。 */
function loadDenyList() {
  if (!existsSync(DENY_LIST_PATH)) return null;
  const parsed = JSON.parse(readFileSync(DENY_LIST_PATH, 'utf8'));
  return (parsed.blocking ?? []).map((item) => [item.label, new RegExp(item.pattern)]);
}

/**
 * 机器路径分两档。
 *
 * **阻断**：指向具体用户账户或用户目录——那是真正的隐私面（用户名、桌面布局、AppData）。
 * **提示**：作者机器的盘符路径（`E:\MCS`、`G:\…`）写在**历史记录与出处说明**里，
 * 属于「换台机器就无效」的噪声，但不泄露个人身份，也不值得改写已发布的快照正文。
 * 它们会被列出来供人工决定，不阻断导出。
 */
const BLOCKING_PATH_PATTERNS = [
  ['Windows 用户目录', /C:\\Users\\[^\\\s"']+/i],
  ['AppData 路径', /\\AppData\\/i],
  ['作者的用户名标识', /\b23350\b/],
];

const NOTICE_PATH_PATTERNS = [
  ['作者工作根（历史记录里）', /E:\\MCS\b/i],
  ['外部数据源盘符', /[A-Z]:\\(?:DifferentialGeometry|automation)\b/i],
];

/** 本脚本自身必然包含上面这些模式（它就是检查规则），扫描时跳过。 */
const SELF_PATH = 'mcs-web/scripts/export-open-source.mjs';

const TEXT_SUFFIXES = new Set([
  '.mjs', '.js', '.cjs', '.ts', '.tsx', '.json', '.md', '.css', '.html', '.ps1', '.cmd', '.py',
  '.yml', '.yaml', '.txt', '.bib', '.tex', '.svg', '.gitignore', '.gitattributes',
]);

function parseArgs(argv) {
  const outIndex = argv.indexOf('--out');
  if (outIndex === -1 || !argv[outIndex + 1]) {
    console.error('用法：node mcs-web/scripts/export-open-source.mjs --out <目录>');
    process.exit(2);
  }
  return { out: resolve(argv[outIndex + 1]) };
}

function shouldSkip(name, source) {
  const path = relative(REPO_ROOT, source).split(sep).join('/');
  if (SKIP_PATHS.some((prefix) => path === prefix || path.startsWith(`${prefix}/`))) return true;
  if (SKIP_DIRS.has(name) || SKIP_FILES.has(name) || name.startsWith('.env.')) return true;
  return SKIP_SUFFIXES.some((suffix) => name.endsWith(suffix));
}

/** 递归复制，按跳过规则过滤。返回复制了多少个文件。 */
function copyTree(source, target) {
  const stats = lstatSync(source);
  if (stats.isSymbolicLink()) throw new Error(`拒绝导出符号链接或目录联接：${relative(REPO_ROOT, source)}`);
  if (!stats.isDirectory()) {
    mkdirSync(dirname(target), { recursive: true });
    cpSync(source, target);
    return 1;
  }
  mkdirSync(target, { recursive: true });
  let count = 0;
  for (const name of readdirSync(source)) {
    if (shouldSkip(name, join(source, name))) continue;
    count += copyTree(join(source, name), join(target, name));
  }
  return count;
}

function walk(dir, base = dir) {
  const files = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const stats = statSync(full);
    if (stats.isDirectory()) files.push(...walk(full, base));
    else files.push(relative(base, full).split(sep).join('/'));
  }
  return files;
}

function isTextFile(path) {
  const lower = path.toLowerCase();
  if (lower.endsWith('.gitignore')) return true;
  const dot = lower.lastIndexOf('.');
  return dot !== -1 && TEXT_SUFFIXES.has(lower.slice(dot));
}

function main() {
  const { out } = parseArgs(process.argv.slice(2));

  // 先解析最近的现存父目录，防止经目录联接把产物写进白名单源目录而递归复制自身。
  let ancestor = out;
  while (!existsSync(ancestor)) ancestor = dirname(ancestor);
  const target = resolve(realpathSync(ancestor), relative(ancestor, out));
  for (const [sourceRel] of INCLUDE) {
    const source = join(REPO_ROOT, sourceRel);
    if (!existsSync(source) || !statSync(source).isDirectory()) continue;
    const nested = relative(realpathSync(source), target);
    if (nested === '' || (!isAbsolute(nested) && nested !== '..' && !nested.startsWith(`..${sep}`))) {
      throw new Error('导出目录不能位于待复制的源目录内。');
    }
  }

  if (existsSync(out) && readdirSync(out).length > 0) {
    console.error(`目标目录非空，拒绝覆盖：${out}`);
    process.exit(2);
  }
  mkdirSync(out, { recursive: true });

  let copied = 0;
  const missing = [];
  for (const [sourceRel, targetRel] of INCLUDE) {
    const source = join(REPO_ROOT, sourceRel);
    if (!existsSync(source)) { missing.push(sourceRel); continue; }
    copied += copyTree(source, join(out, targetRel));
  }

  // 发布包的根文件：许可证、声明、投稿指南与 README 从 `release/` 改名复制。
  const rootFiles = [
    ['LICENSE-MIT', 'LICENSE-MIT'],
    ['LICENSE-CONTENT', 'LICENSE-CONTENT'],
    ['NOTICE', 'NOTICE'],
    ['SECURITY.md', 'SECURITY.md'],
    ['CONTRIBUTING.md', 'CONTRIBUTING.md'],
    ['README-OPEN-SOURCE.md', 'README.md'],
    ['.gitignore', '.gitignore'],
  ];
  for (const [from, to] of rootFiles) {
    // 公开仓库已把素材放在根目录，也必须能再次导出完整发布包。
    const source = existsSync(RELEASE_DIR) ? join(RELEASE_DIR, from) : join(REPO_ROOT, to);
    if (!existsSync(source)) { missing.push(`release/${from}`); continue; }
    cpSync(source, join(out, to));
    copied += 1;
  }

  /*
   * 部署配置从**仓库根**取（2026-10-05 加）。
   *
   * `Dockerfile` / `render.yaml` / `.dockerignore` 按「发布包根目录」的布局写路径
   * （`mcs-web/…`、`mcs-foundations/…`），而本工作区的根目录恰好是同样的布局，
   * 所以同一份文件在两处都能直接用——不需要在 `release/` 里再维护一份副本
   * （两份就会漂移，而漂移的后果是"本地能构建、发布包构建不了"）。
   */
  for (const name of ['Dockerfile', '.dockerignore', 'render.yaml']) {
    const source = join(REPO_ROOT, name);
    if (!existsSync(source)) continue; // 可选平台配置；尚未接入的平台无需占位文件。
    cpSync(source, join(out, name));
    copied += 1;
  }

  // ---- 审计 ----
  const files = walk(out);
  const problems = [];

  for (const file of files) {
    for (const part of FORBIDDEN_PARTS) {
      if (file.includes(part)) problems.push(`禁用路径出现在发布包里：${file}（命中「${part}」）`);
    }
  }

  const secretHits = [];
  const blockingPathHits = [];
  const noticePathHits = [];
  const disclosureHits = [];
  const denyList = loadDenyList();
  let scanned = 0;
  for (const file of files) {
    if (!isTextFile(file)) continue;
    const full = join(out, file);
    if (statSync(full).size > 2 * 1024 * 1024) continue;
    scanned += 1;
    const text = readFileSync(full, 'utf8');
    if (file === SELF_PATH) continue;
    for (const [label, pattern] of SECRET_PATTERNS) {
      if (pattern.test(text)) secretHits.push(`${label} → ${file}`);
    }
    for (const [label, pattern] of BLOCKING_PATH_PATTERNS) {
      if (pattern.test(text)) blockingPathHits.push(`${label} → ${file}`);
    }
    for (const [label, pattern] of NOTICE_PATH_PATTERNS) {
      if (pattern.test(text)) noticePathHits.push(`${label} → ${file}`);
    }
    for (const [label, pattern] of denyList ?? []) {
      if (pattern.test(text)) disclosureHits.push(`${label} → ${file}`);
    }
  }

  const report = {
    out,
    copiedFiles: copied,
    totalFiles: files.length,
    scannedTextFiles: scanned,
    missing,
    forbiddenPaths: problems,
    secrets: secretHits,
    blockingMachinePaths: blockingPathHits,
    machinePathNotices: noticePathHits,
    disclosuresChecked: denyList !== null,
    disclosures: disclosureHits,
  };
  /*
   * 报告写在**产物之外**：报告里含导出目标路径与源仓库路径，
   * 放进发布包里等于把作者机器的目录结构一起开源。它属于发布记录，不属于产物。
   */
  const reportPath = `${out}.export-report.json`;
  writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf8');
  report.reportPath = reportPath;
  console.log(JSON.stringify(report, null, 2));

  const failed = missing.length > 0 || problems.length > 0 || secretHits.length > 0
    || blockingPathHits.length > 0 || disclosureHits.length > 0;
  if (failed) {
    console.error('\n导出审计未通过：上面列出的问题必须先在源仓库修掉，再重新导出。');
    process.exit(1);
  }
  if (noticePathHits.length > 0) {
    console.log(`\n提示：${noticePathHits.length} 处历史记录里写有作者机器的盘符路径（不阻断导出，可择机改写）。`);
  }
  if (denyList === null) {
    console.log(`提示：未找到本地禁用词表 ${DENY_LIST_PATH}，本次**未做**该项检查（报告里 disclosuresChecked 为 false）。`);
  }
  console.log('\n导出规则检查通过：必需文件齐全、禁用路径为零、已列密钥模式、用户目录路径与本地禁用词表未命中。仍需人工复核。');
}

main();
