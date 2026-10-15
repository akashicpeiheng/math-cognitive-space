import { startTestServer, jsonCall } from './helpers.mjs';
import { PLAYWRIGHT_SPECIFIER as PLAYWRIGHT, CHROME_PATH as CHROME } from './browser-runtime.mjs';

const failures = [];
function check(name, condition, detail = '') {
  if (condition) console.log('  ✓ ' + name);
  else { failures.push(name + (detail ? ' :: ' + detail : '')); console.log('  ✗ ' + name + (detail ? ' :: ' + detail : '')); }
}

/**
 * 用户手册页（/manual、/en/manual）：入口、章节锚点、双语与响应式。
 *
 * 这一套断言只盯**可执行的契约**，不判断文案好不好：
 *
 * 1. 五个入口（侧栏「按需查阅」首位、开始学习页顶部、网站介绍页、手册首屏两个页内入口）；
 * 2. 九个章节的锚点都真的落到元素上（目录链接与 id 一一对应），带 `#锚点` 直达时
 *    章节停在吸顶栏之下而不是被压住；
 * 3. 英文手册的站内链接全带 `/en`（分工手册 §1 同一条规矩），正文无未译中文；
 * 4. 窄屏换成顶部可展开目录，且无横向溢出；
 * 5. 阅读手册**不产生任何学习记录、不改公共本体哈希**——这是页面的承诺，也是
 *    「静态正文」这四个字唯一可核对的含义。
 */
const SECTION_IDS = ['first-run', 'start', 'nodes', 'network', 'plan', 'library', 'profile', 'advanced', 'faq'];
const TUTORIAL_LINKS = ['/start?field=群论', '/nodes/group:subgroup', '/network', '/plan?goal=group%3Asubgroup', '/profile'];

const server = await startTestServer();
const call = async (path, options) => (await jsonCall(server.origin, '/api/v2' + path, options)).payload.data;
let browser;
try {
  const { chromium } = await import(PLAYWRIGHT);
  browser = await chromium.launch({ executablePath: CHROME ?? undefined, headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();
  const consoleErrors = [];
  page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text()); });
  page.on('pageerror', (error) => consoleErrors.push(error.message));

  // ---- 1) 手册本体（中文，桌面） ----
  await page.goto(server.origin + '/manual', { waitUntil: 'networkidle' });
  await page.waitForSelector('.manual-page .manual-section');
  await page.waitForTimeout(300);

  const shape = await page.evaluate(() => ({
    title: document.querySelector('.manual-page h1')?.textContent?.trim() ?? '',
    ctas: [...document.querySelectorAll('[data-manual-cta]')].map((element) => ({
      key: element.getAttribute('data-manual-cta'),
      href: element.getAttribute('href'),
    })),
    sections: [...document.querySelectorAll('[data-manual-section]')].map((element) => element.id),
    toc: [...document.querySelectorAll('.manual-aside .manual-toc a')].map((link) => link.getAttribute('href')),
    tocMissingTargets: [...document.querySelectorAll('.manual-aside .manual-toc a')]
      .map((link) => (link.getAttribute('href') ?? '').slice(1))
      .filter((id) => !document.getElementById(id)),
    functions: [...document.querySelectorAll('.manual-functions li a')].map((link) => link.getAttribute('href')),
    navSecondaryFirstLabel: document.querySelector('.nav-item.secondary .nav-label')?.textContent?.trim() ?? '',
    navSecondaryFirstHref: document.querySelector('.nav-item.secondary')?.getAttribute('href') ?? '',
    primaryCount: document.querySelectorAll('.nav-item:not(.secondary)').length,
    crumb: document.querySelector('.topbar-title')?.textContent?.trim() ?? '',
    evidenceTags: [...document.querySelectorAll('.manual-evidence tbody th')].map((cell) => cell.textContent?.trim()),
    gestureHead: [...document.querySelectorAll('.manual-gestures thead th')].map((cell) => cell.textContent?.trim()),
    gestureRows: document.querySelectorAll('.manual-gestures tbody tr').length,
    planEntryKinds: [...document.querySelectorAll('.manual-entry-kinds dt')].map((cell) => cell.textContent?.trim()),
    advancedCards: document.querySelectorAll('.manual-advanced-card').length,
    faqCount: document.querySelectorAll('.manual-faq-item').length,
    tutorialLinks: [...document.querySelectorAll('[data-manual-section="first-run"] a')].map((link) => link.getAttribute('href')),
  }));

  check('手册页可用且标题正确', shape.title === '用户手册', shape.title);
  check('九个章节按顺序落在页面上',
    JSON.stringify(shape.sections) === JSON.stringify(SECTION_IDS.map((id) => 'manual-' + id)),
    JSON.stringify(shape.sections));
  check('首屏两个页内入口都在（跟着案例 / 按功能查阅）',
    shape.ctas.length === 2
      && shape.ctas[0].key === 'tutorial' && shape.ctas[0].href === '#manual-first-run'
      && shape.ctas[1].key === 'browse' && shape.ctas[1].href === '#manual-functions',
    JSON.stringify(shape.ctas));
  check('功能速查列出全部章节，链接就是各自的锚点',
    shape.functions.length === SECTION_IDS.length
      && shape.functions.every((href, index) => href === '#manual-' + SECTION_IDS[index]),
    JSON.stringify(shape.functions));
  check('右侧目录的每条链接都能落到元素上（没有断锚点）',
    shape.toc.length === SECTION_IDS.length && shape.tocMissingTargets.length === 0,
    JSON.stringify({ count: shape.toc.length, missing: shape.tocMissingTargets }));
  check('侧栏「按需查阅」首位是用户手册',
    shape.navSecondaryFirstLabel === '用户手册' && shape.navSecondaryFirstHref === '/manual',
    JSON.stringify({ label: shape.navSecondaryFirstLabel, href: shape.navSecondaryFirstHref }));
  check('主导航仍是六项（手册没有挤进学习主线）', shape.primaryCount === 6, String(shape.primaryCount));
  check('顶栏显示当前位置「用户手册」', shape.crumb === '用户手册', shape.crumb);
  check('证据标签词表齐全',
    JSON.stringify(shape.evidenceTags) === JSON.stringify(['DEF', 'PROOF', 'REF', 'FINITE', 'ILLUSTRATION', 'NOT-CLAIMED']),
    JSON.stringify(shape.evidenceTags));
  check('网络手势表按鼠标 / 触摸 / 键盘分栏且有内容',
    JSON.stringify(shape.gestureHead) === JSON.stringify(['操作', '鼠标', '触摸', '键盘']) && shape.gestureRows >= 5,
    JSON.stringify({ head: shape.gestureHead, rows: shape.gestureRows }));
  check('路线页三种背景入口都有解释',
    JSON.stringify(shape.planEntryKinds) === JSON.stringify(['已确认可用', '声明假设（条件性）', '未知入口']),
    JSON.stringify(shape.planEntryKinds));
  /*
   * 常见问题由 6 条增至 7 条（2026-10-13）：网络视图新增「本次学习的暂存」之后，
   * 手册补了一条「切页回来图还在吗」。条数写死是为了让**中英两份 FAQ 漂开**当场红
   * （两份各加一条才是这一轮的正确结果）。
   */
  /*
   * 计数用「至少」而不是「正好」：手册是与功能一起长的文档，新增一条进阶入口或
   * 一条 FAQ 不该让这套验收变红（结构契约由锚点与表格断言守护）。
   */
  check('进阶入口与常见问题都渲染了', shape.advancedCards >= 5 && shape.faqCount >= 6,
    JSON.stringify({ advanced: shape.advancedCards, faq: shape.faqCount }));
  check('跟案例一节给出五个真实落点',
    TUTORIAL_LINKS.every((href) => shape.tutorialLinks.includes(href)),
    JSON.stringify(shape.tutorialLinks));

  // ---- 2) 带锚点直达 / 点目录 ----
  await page.goto(server.origin + '/manual#manual-network', { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);
  const deepLink = await page.evaluate(() => {
    const rect = document.getElementById('manual-network')?.getBoundingClientRect();
    return { hash: location.hash, top: rect ? Math.round(rect.top) : null };
  });
  check('带锚点直达时章节停在吸顶栏之下',
    deepLink.hash === '#manual-network' && deepLink.top !== null && deepLink.top >= 20 && deepLink.top <= 320,
    JSON.stringify(deepLink));

  await page.click('.manual-aside .manual-toc a[href="#manual-library"]');
  await page.waitForTimeout(450);
  const tocJump = await page.evaluate(() => {
    const rect = document.getElementById('manual-library')?.getBoundingClientRect();
    return { hash: location.hash, top: rect ? Math.round(rect.top) : null };
  });
  check('点右侧目录跳到对应章节且不被顶栏压住',
    tocJump.hash === '#manual-library' && tocJump.top !== null && tocJump.top >= 20 && tocJump.top <= 320,
    JSON.stringify(tocJump));

  // ---- 3) 阅读手册不写任何记录 ----
  const healthBefore = (await call('/health')).ontology.contentHash;
  const profile = (await call('/profiles', { method: 'POST', body: { name: 'Manual QA', template: 'blank' } })).profile;
  const eventsBefore = (await call('/profiles/' + profile.id + '/events')).events;
  await page.evaluate((id) => localStorage.setItem('mcs-web-selected-profile', id), profile.id);
  await page.goto(server.origin + '/manual', { waitUntil: 'networkidle' });
  await page.waitForTimeout(400);
  await page.click('.manual-faq-item summary');
  await page.click('.manual-functions li a[href="#manual-profile"]');
  await page.waitForTimeout(500);
  const eventsAfter = (await call('/profiles/' + profile.id + '/events')).events;
  const healthAfter = (await call('/health')).ontology.contentHash;
  check('读手册不新增学习事件',
    JSON.stringify(eventsBefore) === JSON.stringify(eventsAfter),
    JSON.stringify({ before: eventsBefore.length, after: eventsAfter.length }));
  check('读手册不改公共本体哈希', healthBefore === healthAfter, healthBefore);

  // ---- 4) 开始学习页与网站介绍页的入口 ----
  await page.goto(server.origin + '/start', { waitUntil: 'networkidle' });
  await page.waitForSelector('.start-head-links');
  const startHrefs = await page.evaluate(() => [...document.querySelectorAll('.start-head-links a')].map((link) => link.getAttribute('href')));
  check('开始学习页顶部有手册入口', startHrefs.includes('/manual'), JSON.stringify(startHrefs));
  await page.goto(server.origin + '/intro', { waitUntil: 'networkidle' });
  await page.waitForSelector('.intro-hero-actions');
  const introHrefs = await page.evaluate(() => [...document.querySelectorAll('.intro-hero-actions a')].map((link) => link.getAttribute('href')));
  check('网站介绍页有手册入口', introHrefs.includes('/manual'), JSON.stringify(introHrefs));

  // ---- 5) 英文手册：链接带 /en、正文无未译中文、切语言保留章节 ----
  await page.goto(server.origin + '/manual#manual-plan', { waitUntil: 'networkidle' });
  await page.waitForTimeout(400);
  await page.locator('.locale-switch .locale-option', { hasText: 'EN' }).click();
  await page.waitForFunction(() => location.pathname === '/en/manual', null, { timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(500);
  const english = await page.evaluate(() => {
    const main = document.querySelector('.manual-main');
    const rect = document.getElementById('manual-plan')?.getBoundingClientRect();
    return {
      path: location.pathname,
      hash: location.hash,
      title: document.querySelector('.manual-page h1')?.textContent?.trim() ?? '',
      top: rect ? Math.round(rect.top) : null,
      cjk: /[\u3400-\u4dbf\u4e00-\u9fff]/.test(main?.textContent ?? ''),
      links: [...document.querySelectorAll('.manual-main a')].map((link) => link.getAttribute('href') ?? ''),
    };
  });
  check('切换语言后停在手册同一章节',
    english.path === '/en/manual' && english.hash === '#manual-plan'
      && english.top !== null && english.top >= 20 && english.top <= 320,
    JSON.stringify({ path: english.path, hash: english.hash, top: english.top }));
  check('英文手册标题与正文都是英文',
    english.title === 'User manual' && !english.cjk,
    JSON.stringify({ title: english.title, cjk: english.cjk }));
  const manualEnLinks = english.links.filter((href) => href && !href.startsWith('#'));
  check('英文手册的站内链接都带 /en',
    manualEnLinks.length >= 10 && manualEnLinks.every((href) => href.startsWith('/en')),
    JSON.stringify(manualEnLinks.filter((href) => !href.startsWith('/en'))));

  // ---- 6) 窄屏：顶部可展开目录、无横向溢出 ----
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(server.origin + '/manual', { waitUntil: 'networkidle' });
  await page.waitForTimeout(400);
  const narrow = await page.evaluate(() => ({
    details: Boolean(document.querySelector('.manual-toc-details')?.getClientRects().length),
    aside: Boolean(document.querySelector('.manual-aside')?.getClientRects().length),
    overflow: document.documentElement.scrollWidth - window.innerWidth,
  }));
  check('窄屏换成顶部可展开目录且无横向溢出',
    narrow.details && !narrow.aside && narrow.overflow <= 2,
    JSON.stringify(narrow));
  await page.click('.manual-toc-details > summary');
  await page.click('.manual-toc-details .manual-toc a[href="#manual-network"]');
  await page.waitForTimeout(450);
  const narrowJump = await page.evaluate(() => {
    const rect = document.getElementById('manual-network')?.getBoundingClientRect();
    return { hash: location.hash, top: rect ? Math.round(rect.top) : null };
  });
  check('窄屏目录也能定位（停在顶栏之下）',
    narrowJump.hash === '#manual-network' && narrowJump.top !== null && narrowJump.top >= 20 && narrowJump.top <= 320,
    JSON.stringify(narrowJump));

  check('手册相关页面没有控制台错误', consoleErrors.length === 0, consoleErrors.slice(0, 3).join(' | '));
} finally {
  await browser?.close();
  await server.cleanup();
}

if (failures.length > 0) {
  console.error('\n用户手册验收失败：\n- ' + failures.join('\n- '));
  process.exit(1);
}
console.log('\n用户手册验收通过。');
