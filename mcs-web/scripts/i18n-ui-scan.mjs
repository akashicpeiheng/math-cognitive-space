/**
 * 英文站「未标注中文」扫描器（逐元素）。
 *
 * ## 它解决什么问题
 *
 * 双语改造的规则是「缺译文时回落中文并**如实标注**」：英文页上凡是仍显示中文的地方，
 * 都要带 `className="i18n-pending"`（与 `title="…no English translation yet…"`），
 * 让读者知道那是尚未翻译，而不是站点混着两种语言。
 *
 * 「自觉标注」不是可执行的约束——某个页面改完，谁也不知道漏了几处。本工具把它变成
 * 可执行的检查：**逐个元素看它的直接文本里有没有中文，有没有被 `.i18n-pending` 包住**。
 *
 * ## 判定口径（与 `scripts/i18n-block-check.mjs` 的残留中文口径一致）
 *
 * - 只算**直接文本节点**里的中文：父元素的中文由真正承载它的那个子元素负责报，不重复计。
 * - `code` / `pre` 里的中文**豁免**：那是源文件路径与中文书名（施工手册 §2 第 5 条：
 *   翻了就是谎报来源），它们本来就该保持中文。
 * - 用户可见的属性（`title` / `placeholder` / `aria-label` / `alt`）里的中文同样会列出来，
 *   单独归类为 `attr:`，默认**只警告不影响退出码**（`--strict-attrs` 可升级为失败）：
 *   属性挂不上 `i18n-pending` 这个类，而且有些属性值里嵌的就是尚未翻译的**数据**
 *   （例如 `placeholder="…显示「待补充」…"`），硬判失败只会逼译者去编一句英文。
 * - 不可见元素（没有布局盒）不计；`<option>` 例外——下拉收起时它没有布局盒，
 *   但展开就是用户可见的文案（实测漏标正好出在那里）。
 * - **有意保留中文**的壳层元素豁免，见下面的 `KEEP_CSS`；页面自己也可以给元素标
 *   `data-i18n-keep` 或 `lang="zh…"` 来退出扫描（比在工具里加选择器更靠近代码）。
 *
 * ## 边界（必须说清，否则「扫描通过」会被读成「已全部英文化」）
 *
 * 它**只查中文有没有被标注**，不查译文对不对、不查英文是否通顺、不查覆盖率。
 * 页面根本没渲染出来时它会报「页面疑似未渲染」并以非零退出——不然空白页会「零漏标」通过。
 *
 * 用法：
 *   node scripts/i18n-ui-scan.mjs --path /en/authoring
 *   node scripts/i18n-ui-scan.mjs --path /en/nodes --path /en/network
 *   node scripts/i18n-ui-scan.mjs --path /en/authoring --origin http://127.0.0.1:3080
 *   node scripts/i18n-ui-scan.mjs --path /en/authoring --static tmp/dist-verify
 *   node scripts/i18n-ui-scan.mjs --path /en/authoring --json
 *   node scripts/i18n-ui-scan.mjs --path /en/nodes --ignore '.my-widget' --strict-attrs
 *
 * 退出码：0 = 无漏标；1 = 有漏标 / 页面报错 / 疑似未渲染（`--strict-attrs` 时属性也算）；
 * 2 = 用法错误。
 *
 * 默认自己起一个测试服务（静态目录 `web/dist`，需要先 `npm run build`）；
 * 已经有一个站点在跑时用 `--origin` 指过去，避免重复构建与端口占用。
 */

import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { MCS_WEB_ROOT } from '../core/ontology.mjs';
import { startTestServer } from '../tests/helpers.mjs';
import { PLAYWRIGHT_SPECIFIER as PLAYWRIGHT, CHROME_PATH as CHROME } from '../tests/browser-runtime.mjs';

const args = process.argv.slice(2);
const valuesOf = (flag) => args.reduce((out, item, index) => (item === flag ? [...out, args[index + 1]] : out), []);
const valueOf = (flag, fallback = null) => (args.includes(flag) ? args[args.indexOf(flag) + 1] : fallback);

const paths = valuesOf('--path').filter(Boolean);
const origin = valueOf('--origin');
/** 静态目录：默认 `web/dist`；可以用它扫一次**尚未发布**的构建（例如 `--static tmp/dist-verify`）。 */
const staticArg = valueOf('--static');
const settleMs = Number(valueOf('--settle', '400'));
const timeoutMs = Number(valueOf('--timeout', '30000'));
const asJson = args.includes('--json');
const allowNonEn = args.includes('--allow-non-en');
const strictAttrs = args.includes('--strict-attrs');
/** 额外豁免：`--ignore <选择器>` 可重复，也可用逗号分隔多个。 */
const ignores = valuesOf('--ignore').filter(Boolean).flatMap((item) => item.split(',')).map((item) => item.trim()).filter(Boolean);
/** 视口：宽屏是默认阅读面；窄屏不复扫一遍——重排不改变「哪段文字是中文」。 */
const VIEWPORT = { width: 1440, height: 1000 };

/**
 * **有意保留中文**的壳层元素（豁免清单）。
 *
 * 为什么要有它：英文站上有几处中文是**故意**的，扫出来会让清单变成噪声，而噪声会让
 * 真正的漏标被忽略：
 * - `.locale-option`：语言切换按钮。语言名用它自己的文字写（「中文」/「English」），
 *   这是通行做法，翻成「Chinese」反而让中文用户认不出来；
 * - `.sidebar-author` / `footer.site-footer`：作者署名。术语表
 *   （`data/i18n/glossary.mjs` 的 DO_NOT_TRANSLATE）明确写「作者署名保留「沛恒 / Peiheng」两者」。
 *
 * 页面如果还有别的「有意中文」，优先在代码里给元素标 `data-i18n-keep`（自带说明），
 * 或在命令行用 `--ignore <选择器>`；往这张表里加要写清理由。
 */
const KEEP_CSS = ['.locale-option', '.sidebar-author', 'footer.site-footer'];

if (paths.length === 0) {
  console.error('用法：node scripts/i18n-ui-scan.mjs --path /en/authoring [--path /en/nodes …]');
  console.error('      [--origin http://127.0.0.1:3080 | --static tmp/dist-verify]');
  console.error('      [--ignore <选择器>]… [--strict-attrs] [--json] [--settle 400] [--timeout 30000] [--allow-non-en]');
  console.error('\n扫描的是**英文站**：路径必须带语种前缀（如 `/en/...`）——中文站整页都是中文，扫它没有意义。');
  console.error('确实要扫其它路径时加 `--allow-non-en`。');
  process.exit(2);
}
for (const path of paths) {
  if (!path.startsWith('/')) {
    console.error(`用法错误：--path 要以 / 开头（收到 ${JSON.stringify(path)}）`);
    process.exit(2);
  }
  if (!allowNonEn && !path.startsWith('/en')) {
    console.error(`用法错误：${path} 不在英文站下（要扫非 /en 路径请显式加 --allow-non-en）`);
    process.exit(2);
  }
}

/* 没有 --origin 时自己起一个测试服务；静态目录缺了直接说清要先构建。 */
let server = null;
let base = origin;
if (!base) {
  const staticDir = staticArg ? resolve(MCS_WEB_ROOT, staticArg) : resolve(MCS_WEB_ROOT, 'web', 'dist');
  if (!existsSync(staticDir)) {
    console.error(`没有找到构建产物：${staticDir}\n先跑 \`npm run build\`，或用 --origin 指向已在运行的站点，`
      + '或用 --static 指向另一个构建目录（例如一次隔离构建 `--outDir tmp/dist-verify`）。');
    process.exit(2);
  }
  server = await startTestServer({ staticDir });
  base = server.origin;
}

/* 浏览器不可用时由 `browser-unavailable.mjs` 自己打印装法并决定跳过/失败。 */
const { chromium } = await import(PLAYWRIGHT).catch(async (error) => {
  if (server) await server.cleanup().catch(() => {});
  throw error;
});

/**
 * 页面内扫描：返回漏标清单与已标注计数。
 *
 * 注意它必须**自包含**（跑在浏览器里，拿不到 Node 侧的闭包），参数只能从 `options` 进。
 *
 * @param {{ keepCss: string[], ignores: string[] }} options
 */
function scanPage(options) {
  const CJK = /[\u3400-\u4dbf\u4e00-\u9fff]/;
  const EXEMPT_TAGS = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEMPLATE', 'CODE', 'PRE']);
  const ATTRS = ['title', 'placeholder', 'aria-label', 'alt'];
  const keepSelector = [...options.keepCss, ...options.ignores].join(', ');

  /** 元素在文档里的定位串：能给出 `#id` 就停，否则往上拼三层。 */
  function selectorOf(element) {
    const parts = [];
    let node = element;
    let depth = 0;
    while (node && node.nodeType === 1 && node !== document.body && depth < 4) {
      let part = node.tagName.toLowerCase();
      if (node.id) { parts.unshift(`${part}#${node.id}`); break; }
      const classes = [...node.classList].slice(0, 2).join('.');
      if (classes) part += `.${classes}`;
      const parent = node.parentElement;
      if (parent) {
        const sameTag = [...parent.children].filter((child) => child.tagName === node.tagName);
        if (sameTag.length > 1) part += `:nth-of-type(${sameTag.indexOf(node) + 1})`;
      }
      parts.unshift(part);
      node = parent;
      depth += 1;
    }
    return parts.join(' > ');
  }

  /** 可见性：没有布局盒的不算（`<option>` 例外：收起时没有布局盒，展开却看得见）。 */
  function visible(element) {
    if (element.tagName === 'OPTION') return true;
    return element.getClientRects().length > 0;
  }

  function exempt(element) {
    for (let node = element; node && node.nodeType === 1; node = node.parentElement) {
      if (EXEMPT_TAGS.has(node.tagName)) return true;
      if (node.hasAttribute('hidden')) return true;
      /* 有意保留中文：工具内置清单、命令行 `--ignore`，或页面自己标的 `data-i18n-keep` / `lang="zh…"`。 */
      if (node.hasAttribute('data-i18n-keep')) return true;
      if ((node.getAttribute('lang') ?? '').toLowerCase().startsWith('zh')) return true;
    }
    return false;
  }

  /** 命中「有意保留中文」清单的元素：单独统计，让豁免是**看得见**的而不是静默吞掉。 */
  function keptBy(element) {
    if (!keepSelector) return null;
    try {
      const hit = element.closest(keepSelector);
      if (!hit) return null;
      return options.keepCss.find((selector) => hit.matches(selector)) ?? `--ignore(${keepSelector})`;
    } catch {
      return null; /* 选择器写错不该让整次扫描崩掉；`--ignore` 的校验见 Node 侧 */
    }
  }

  const misses = [];
  const marked = [];
  const attrs = [];
  const kept = {};

  for (const element of document.querySelectorAll('body *')) {
    if (EXEMPT_TAGS.has(element.tagName) || exempt(element)) continue;
    const pending = Boolean(element.closest('.i18n-pending'));
    const direct = [...element.childNodes]
      .filter((node) => node.nodeType === 3)
      .map((node) => node.textContent)
      .join('')
      .replace(/\s+/g, ' ')
      .trim();
    if (CJK.test(direct) && visible(element)) {
      const row = { selector: selectorOf(element), text: direct.slice(0, 80) };
      const why = keptBy(element);
      if (why) kept[why] = (kept[why] ?? 0) + 1;
      else if (pending) marked.push(row);
      else misses.push(row);
    }
    /*
     * 属性：`title` / `placeholder` / `aria-label` / `alt` 都是用户看得见的文案，
     * 但元素自身可能没有中文文本（例如一个英文按钮配中文 tooltip）。
     */
    for (const name of ATTRS) {
      const value = element.getAttribute(name);
      if (!value || !CJK.test(value)) continue;
      if (pending || element.closest('.i18n-pending')) continue;
      if (!visible(element)) continue;
      const why = keptBy(element);
      if (why) { kept[why] = (kept[why] ?? 0) + 1; continue; }
      attrs.push({ selector: selectorOf(element), attr: name, text: value.slice(0, 80) });
    }
  }

  return {
    misses,
    attrs,
    kept,
    markedCount: marked.length,
    /** `--ignore` 写错的选择器：静默忽略等于「以为豁免了、其实没豁免」，要报出来。 */
    invalidIgnores: options.ignores.filter((selector) => {
      try { document.querySelector(selector); return false; } catch { return true; }
    }),
    /** 页面疑似没渲染：正文几乎为空且没有可见的 h1/按钮——空白页不该「零漏标」通过。 */
    looksEmpty: document.body.innerText.replace(/\s+/g, '').length < 20,
  };
}

const report = { origin: base, pages: [] };
let browser = null;
let failed = false;

try {
  browser = await chromium.launch({ executablePath: CHROME ?? undefined, headless: true });
  const context = await browser.newContext({ viewport: VIEWPORT });
  for (const path of paths) {
    const page = await context.newPage();
    const errors = [];
    page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
    page.on('pageerror', (error) => errors.push(error.message));

    const url = new URL(path, base).href;
    const entry = { path, url, misses: [], attrs: [], kept: {}, invalidIgnores: [], markedCount: 0, errors, looksEmpty: false, opened: false };
    try {
      await page.goto(url, { waitUntil: 'networkidle', timeout: timeoutMs });
      await page.waitForTimeout(settleMs);
      const scanned = await page.evaluate(scanPage, { keepCss: KEEP_CSS, ignores });
      Object.assign(entry, scanned);
      entry.opened = true;
    } catch (error) {
      entry.errors.push(`打开/扫描失败：${error.message}`);
    }
    await page.close();
    report.pages.push(entry);
    if (entry.invalidIgnores?.length) {
      console.error(`用法错误：--ignore 里有不合法的选择器：${entry.invalidIgnores.join('、')}`);
      process.exitCode = 2;
      break;
    }
    const attrFatal = strictAttrs && entry.attrs.length > 0;
    if (!entry.opened || entry.looksEmpty || entry.errors.length > 0 || entry.misses.length > 0 || attrFatal) {
      failed = true;
    }
  }
} finally {
  if (browser) await browser.close().catch(() => {});
  if (server) await server.cleanup().catch(() => {});
}

if (asJson) {
  console.log(JSON.stringify(report, null, 2));
} else {
  for (const entry of report.pages) {
    console.log(`\n${entry.path}`);
    if (!entry.opened) {
      console.log('  ✗ 页面没有打开成功');
    } else if (entry.looksEmpty) {
      console.log('  ✗ 页面疑似未渲染（正文几乎为空）——空白页会「零漏标」通过，所以这里判失败');
    }
    console.log(`  已标注（i18n-pending）：${entry.markedCount} 处`);
    if (entry.misses.length === 0) {
      console.log('  未标注中文：0 处');
    } else {
      console.log(`  未标注中文：${entry.misses.length} 处`);
      for (const row of entry.misses) console.log(`    · ${row.selector}  「${row.text}」`);
    }
    if (entry.attrs.length > 0) {
      console.log(`  属性里的未标注中文：${entry.attrs.length} 处${strictAttrs ? '' : '（只警告；--strict-attrs 可升级为失败）'}`);
      for (const row of entry.attrs) console.log(`    · ${row.selector}  （attr:${row.attr}）  「${row.text}」`);
    }
    const keptRows = Object.entries(entry.kept ?? {});
    if (keptRows.length > 0) {
      console.log(`  已知有意保留中文（豁免，不计失败）：${keptRows.reduce((sum, [, n]) => sum + n, 0)} 处`);
      for (const [why, count] of keptRows) console.log(`    · ${why} × ${count}`);
    }
    for (const message of entry.errors.slice(0, 5)) console.log(`  ✗ 页面报错：${message}`);
  }
}

if (failed) {
  console.error('\n未标注中文扫描失败：英文页上仍有未标注的中文（或页面没渲染出来）。');
  console.error('修法：给它加 `className="i18n-pending"` 与 `title={t(\'i18n.pendingTitle\')}`，'
    + '或者补上英文译文——**不要**为了让扫描变绿而删掉中文原文（中文是源语言）。');
  console.error('确认某处中文是**有意保留**时，在代码里给元素标 `data-i18n-keep`（推荐，理由写在代码旁），'
    + '或用 `--ignore <选择器>`；内置豁免清单见本文件顶部的 `KEEP_CSS`。');
  process.exit(1);
}
console.log('\n未标注中文扫描通过（只查「中文有没有被标注」，不查译文质量与覆盖率）。');
