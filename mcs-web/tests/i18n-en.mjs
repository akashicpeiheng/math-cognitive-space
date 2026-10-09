/**
 * 英文站验收（真浏览器）。
 *
 * 检查的不是「译文好不好」——那需要人工复核——而是**双语机制在真实浏览器里是否成立**：
 *
 * 1. `/en/...` 能直接打开（深链可分享），`<html lang>` 正确；
 * 2. 顶栏的语言切换按键存在、当前项标注正确、点了会切到另一种语言**并留在同一页**；
 * 3. 切过去之后**内容真的变了**（节点标题从中文变英文），不是只换了按钮高亮；
 * 4. 切回来中文页面逐字不变（回归）；
 * 5. 没有控制台错误。
 *
 * 跳过策略与其它浏览器验收一致：找不到浏览器时明确打印并跳过（CI 用
 * `MCS_WEB_REQUIRE_BROWSER=1` 把跳过变成失败）。
 */

import { existsSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { startTestServer } from './helpers.mjs';
import { MCS_WEB_ROOT } from '../core/ontology.mjs';
import { PLAYWRIGHT_SPECIFIER, CHROME_PATH, describeBrowserRuntime } from './browser-runtime.mjs';

/**
 * 构建产物是不是**过旧**。
 *
 * 这一条是踩过坑之后加的：服务端跑的是 `web/dist/`（构建产物），而本套验收要求
 * 「顶栏有语言切换按键」——`npm run build` 失败时（例如别人正在改的 `.tsx` 有类型错误），
 * 这里会看到**旧界面**，然后报「没有切换按键」。那条失败信息的指向是错的：
 * 问题在构建，不在语言层。所以先自己检一下，把话说清楚。
 */
function distStaleReason() {
  const dist = resolve(process.env.MCS_WEB_TEST_STATIC_DIR || resolve(MCS_WEB_ROOT, 'web', 'dist'), 'index.html');
  if (!existsSync(dist)) return 'web/dist/index.html 不存在（还没构建过）';
  const builtAt = statSync(dist).mtimeMs;
  const srcDir = resolve(MCS_WEB_ROOT, 'web', 'src');
  const newest = (dir) => readdirSync(dir, { withFileTypes: true }).reduce((latest, item) => {
    const full = join(dir, item.name);
    if (item.isDirectory()) return Math.max(latest, newest(full));
    if (!/\.(ts|tsx|css)$/.test(item.name)) return latest;
    return Math.max(latest, statSync(full).mtimeMs);
  }, 0);
  const newestSrc = Math.max(newest(srcDir), statSync(resolve(MCS_WEB_ROOT, 'web', 'index.html')).mtimeMs);
  return newestSrc > builtAt ? '源码比构建产物新（构建过但失败，或改动后没重新构建）' : null;
}

const failures = [];
function check(name, condition, detail = '') {
  if (condition) { console.log('  ✓ ' + name); return true; }
  failures.push(name + (detail ? ' :: ' + detail : ''));
  console.log('  ✗ ' + name + (detail ? ' :: ' + detail : ''));
  return false;
}

const { chromium } = await import(PLAYWRIGHT_SPECIFIER);
if (!chromium) {
  console.log('浏览器验收跳过：未找到可用的 Playwright / Chromium。');
  console.log('安装方式：npm i -D playwright（或设 MCS_WEB_CHROME 指向本机 Chrome）。');
  console.log('运行时：' + describeBrowserRuntime());
  process.exit(process.env.MCS_WEB_REQUIRE_BROWSER === '1' ? 1 : 0);
}

const server = await startTestServer();
const browser = await chromium.launch(CHROME_PATH ? { executablePath: CHROME_PATH } : {});

/*
 * 构建产物过旧时**先把话说清楚**再跑：`distStaleReason()` 从加进来那天起就没被调用过
 * （定义了却没人用），于是「源码比 dist 新」这件事一直没人提示。它不判失败——
 * 任何人改一行源码都会让 dist 变旧，判失败会把别人的运行打成无意义的红；
 * 但必须打印出来，否则旧包造成的假失败会被当成真回归（这条评论写的就是那个坑）。
 */
const stale = distStaleReason();
if (stale) {
  console.log(`  ⚠ 构建产物可能过旧：${stale}`);
  console.log('    本套跑的是 web/dist；旧包造成的失败请先 `npm run build` 后复跑，不要当成语言层回归。');
}

try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const consoleErrors = [];
  page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text()); });
  page.on('pageerror', (error) => consoleErrors.push(String(error)));

  const base = server.origin;

  /* ---- 1. 英文深链直接可打开 ---- */
  await page.goto(`${base}/en/nodes/limit:limit-ed`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.page, .workspace h1, h1', { timeout: 15000 });
  const lang = await page.evaluate(() => document.documentElement.lang);
  check('英文页面 <html lang> 是 en', lang === 'en', lang);
  const titleEn = await page.locator('h1').first().innerText();
  /*
   * 断言「这是英文视图」，而不是「某个具体译文长什么样」。
   *
   * 原来写的是 `/ε–δ definition of a limit/`——那等于把验收钉死在一句译文上：
   * 译者调整措辞（完全合法）就会让这条红，而它红的原因与语种机制无关。
   * 现在检四条**不随译文改措辞漂移**的性质：非空、不含中文、与中文标题不同、
   * 且确实该节点有英文覆盖（接口英文视图与中文视图不同）。
   */
  const apiTitles = await page.evaluate(async () => {
    const en = await (await fetch('/api/v2/ontology/nodes/limit:limit-ed?locale=en')).json();
    const zh = await (await fetch('/api/v2/ontology/nodes/limit:limit-ed?locale=zh')).json();
    return { en: en.data.node.title, zh: zh.data.node.title };
  });
  check('英文深链的标题是英文视图（非空、不含中文、与中文标题不同、接口确有英文覆盖）',
    titleEn.trim().length > 0
      && !/[\u3400-\u4dbf\u4e00-\u9fff]/.test(titleEn)
      && titleEn !== apiTitles.zh
      && apiTitles.en !== apiTitles.zh,
    JSON.stringify({ page: titleEn.slice(0, 80), apiEn: apiTitles.en.slice(0, 80), apiZh: apiTitles.zh.slice(0, 60) }));

  /* ---- 2. 切换按键存在且当前项标注正确 ---- */
  const options = await page.locator('.locale-switch .locale-option').allInnerTexts();
  check('顶栏有「中文 / EN」两个选项', JSON.stringify(options.map((text) => text.trim())) === JSON.stringify(['中文', 'EN']), JSON.stringify(options));
  const pressed = await page.locator('.locale-switch .locale-option[aria-pressed="true"]').innerText();
  check('英文页面上 EN 是当前项', pressed.trim() === 'EN', pressed);
  const groupLabel = await page.locator('.locale-switch').getAttribute('aria-label');
  check('切换控件有 aria-label', Boolean(groupLabel), String(groupLabel));

  /* ---- 3. 导航在英文下是相对链接（不会点回中文页） ---- */
  const navHrefs = await page.locator('.nav-primary .nav-item').evaluateAll((nodes) => nodes.map((node) => node.getAttribute('href')));
  check('英文导航全部带 /en 前缀', navHrefs.length === 5 && navHrefs.every((href) => href && href.startsWith('/en')), JSON.stringify(navHrefs));
  const navLabels = await page.locator('.nav-primary .nav-label').allInnerTexts();
  check('英文导航是英文', navLabels.includes('Start learning') && navLabels.includes('Knowledge network'), JSON.stringify(navLabels));
  const crumb = await page.locator('.topbar-title').innerText();
  check('英文顶栏显示英文栏目名', crumb.trim() === 'Objects', crumb);

  /* ---- 4. 点按键切到中文：同一页、内容变中文、URL 去掉前缀 ---- */
  await page.locator('.locale-switch .locale-option', { hasText: '中文' }).click();
  await page.waitForFunction(() => document.documentElement.lang === 'zh-CN', null, { timeout: 8000 }).catch(() => {});
  const urlAfter = new URL(page.url());
  check('切到中文后留在同一节点页', urlAfter.pathname === '/nodes/limit:limit-ed', urlAfter.pathname);
  const langZh = await page.evaluate(() => document.documentElement.lang);
  check('中文页面 <html lang> 是 zh-CN', langZh === 'zh-CN', langZh);
  const titleZh = await page.locator('h1').first().innerText();
  check('中文页面显示中文节点标题（内容真的换了）', titleZh.includes('函数极限'), titleZh.slice(0, 80));
  const navLabelsZh = await page.locator('.nav-primary .nav-label').allInnerTexts();
  check('中文导航恢复中文', navLabelsZh.includes('开始学习'), JSON.stringify(navLabelsZh));

  /* ---- 5. 切回英文：查询串与锚点要保住 ---- */
  await page.goto(`${base}/nodes?q=%E6%9E%81%E9%99%90`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.locale-switch', { timeout: 10000 });
  await page.locator('.locale-switch .locale-option', { hasText: 'EN' }).click();
  await page.waitForFunction(() => document.documentElement.lang === 'en', null, { timeout: 8000 }).catch(() => {});
  const searchKept = page.url();
  check('切换语言保留查询串', searchKept.includes('/en/nodes') && searchKept.includes('q='), searchKept);
  const listTitles = await page.locator('.node-card, .node-list-item, li').first().innerText().catch(() => '');
  check('英文对象列表有内容', listTitles.length > 0, listTitles.slice(0, 40));

  /* ---- 6. 首页与介绍页在英文下可打开 ---- */
  for (const path of ['/en', '/en/start', '/en/intro', '/en/plan']) {
    await page.goto(base + path, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.locale-switch', { timeout: 15000 });
    const heading = await page.locator('h1').first().innerText().catch(() => '');
    check(`${path} 可打开且有标题`, heading.trim().length > 0, heading.slice(0, 40));
  }

  /* ---- 7. 没有控制台错误 ---- */
  const relevant = consoleErrors.filter((text) => !/favicon|Download the React DevTools/i.test(text));
  check('英文站无控制台错误', relevant.length === 0, relevant.slice(0, 3).join(' | '));
} finally {
  await browser.close();
  await server.cleanup();
}

if (failures.length) {
  console.error('\n中英双语浏览器验收失败：\n- ' + failures.join('\n- '));
  process.exit(1);
}
console.log('\n中英双语浏览器验收通过。');
