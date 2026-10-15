/**
 * 「全部节点」面板的检索次序（2026-10-12 加）。
 *
 * 用户报的就是这一处：「在网络里搜索『紧』，前几条是『广义 Stokes 定理』『单位分解』，
 * 真正相关的『连续性与紧致性』排在后面」。因此这一套**只走用户在界面上的那条路**：
 * 打开面板 → 在搜索框里敲字 → 看列表的次序与每条命中理由。
 *
 * 与纯函数那一套（`tests/search-rank.test.mjs`）的分工：那边钉判据与两处实现一致，
 * 这边钉「界面上真的按那条规则排了、并把理由写出来了」。
 */
import { startTestServer } from './helpers.mjs';
import { PLAYWRIGHT_SPECIFIER as PLAYWRIGHT, CHROME_PATH as CHROME } from './browser-runtime.mjs';

const failures = [];
function check(name, condition, detail = '') {
  if (condition) console.log('  ✓ ' + name);
  else { failures.push(name + (detail ? ' :: ' + detail : '')); console.log('  ✗ ' + name + (detail ? ' :: ' + detail : '')); }
}

/** 打开某个浮动面板（默认开合按「来过没有」分档，因此显式打开）。 */
async function openPanel(page, title) {
  if (await page.locator(`.floating-panel[aria-label*="${title}"]`).count()) return;
  await page.evaluate((wanted) => {
    const box = [...document.querySelectorAll('.network-hud-toggle input')]
      .find((input) => (input.getAttribute('aria-label') ?? '').includes(wanted));
    if (box && !box.checked) box.click();
  }, title);
  await page.waitForTimeout(500);
}

/** 读列表：每条的标题、命中理由、以及它是不是「标题里就有这个词」。 */
async function readList(page) {
  return page.evaluate(() => [...document.querySelectorAll('.network-node-list li')].map((item) => ({
    title: item.querySelector('.network-node-title')?.textContent ?? '',
    id: item.querySelector('code')?.textContent ?? '',
    hit: item.querySelector('.search-hit')?.getAttribute('data-hit') ?? null,
    hitText: item.querySelector('.search-hit')?.textContent ?? null,
  })));
}

const server = await startTestServer();
let browser;
try {
  const { chromium } = await import(PLAYWRIGHT);
  browser = await chromium.launch({ executablePath: CHROME ?? undefined, headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 950 } });
  const page = await context.newPage();
  const consoleErrors = [];
  page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text()); });
  page.on('pageerror', (error) => consoleErrors.push(error.message));

  await page.goto(server.origin + '/network', { waitUntil: 'networkidle' });
  await openPanel(page, '全部节点');
  await page.waitForSelector('.network-node-list li', { timeout: 15000 });

  const before = await readList(page);
  /*
   * 未检索时仍是**浏览次序**（按 id 字典序，与从前一致），且不带命中理由。
   * 断言写成「整体升序」而不是钉死第一条：默认粒度是 unit，第一条不是 `bg:misc:...`（那是话题级条目）。
   */
  const idsAscending = before.every((item, index) => index === 0 || before[index - 1].id.localeCompare(item.id, 'en') <= 0);
  check('未检索时按 id 字典序（原来的浏览次序不变）',
    before.length > 0 && idsAscending && before.every((item) => item.hit === null),
    JSON.stringify(before.slice(0, 3).map((item) => item.id)));

  // ---- 核心：搜「紧」----
  const search = page.locator('.floating-panel[aria-label="全部节点"] input[type="search"], .floating-panel[aria-label="全部节点"] input[aria-label="搜索节点"]').first();
  await search.fill('紧');
  await page.waitForTimeout(600);
  const tight = await readList(page);

  check('搜「紧」有结果', tight.length >= 5, String(tight.length));
  check('第一条是标题里就有「紧」的节点（不是摘要里出现过的）',
    tight[0]?.title.includes('紧') === true, JSON.stringify(tight[0]));
  check('第一条带「标题命中」的理由',
    tight[0]?.hit === 'title', JSON.stringify(tight[0]));

  /*
   * 用户报的那一条：摘要里讲紧支撑的「广义 Stokes 定理」必须排在标题命中的节点之后。
   * 它仍然在结果里（排序不改集合），但排在后面，并且**如实标出**它是摘要命中。
   */
  const stokesIndex = tight.findIndex((item) => item.id === 'dg:generalized-stokes-theorem');
  const compactnessIndex = tight.findIndex((item) => item.id === 'top:compactness');
  check('「紧致性」在结果里且排在「广义 Stokes 定理」之前',
    compactnessIndex !== -1 && stokesIndex !== -1 && compactnessIndex < stokesIndex,
    JSON.stringify({ compactnessIndex, stokesIndex }));
  if (stokesIndex !== -1) {
    check('摘要命中的条目如实标出「仅摘要命中」',
      tight[stokesIndex].hit === 'summary' && (tight[stokesIndex].hitText ?? '').includes('摘要'),
      JSON.stringify(tight[stokesIndex]));
  }

  // 分档：所有标题命中都排在第一条非标题命中之前。
  const firstNonTitle = tight.findIndex((item) => item.hit !== 'title');
  const titleCount = tight.filter((item) => item.hit === 'title').length;
  check('标题命中整体排在其余命中之前',
    titleCount > 0 && (firstNonTitle === -1 || firstNonTitle === titleCount),
    JSON.stringify({ titleCount, firstNonTitle }));

  // ---- 检索词清空后回到浏览次序（不留下副作用）----
  await search.fill('');
  await page.waitForTimeout(500);
  const after = await readList(page);
  check('清空检索词后回到原来的浏览次序',
    after.length === before.length && after[0].id === before[0].id && after.every((item) => item.hit === null),
    JSON.stringify(after.slice(0, 2)));

  // ---- 英文站：理由也有译文 ----
  await page.goto(server.origin + '/en/network', { waitUntil: 'networkidle' });
  await openPanel(page, 'All nodes');
  await page.waitForSelector('.network-node-list li', { timeout: 15000 });
  const enSearch = page.locator('.floating-panel[aria-label="All nodes"] input[type="search"], .floating-panel[aria-label="All nodes"] input[aria-label="Search nodes"]').first();
  await enSearch.fill('Stokes');
  await page.waitForTimeout(600);
  const english = await readList(page);
  check('英文站：检索次序同样按相关性，理由是英文',
    english[0]?.id === 'dg:generalized-stokes-theorem' && english[0]?.hit === 'title'
      && (english[0]?.hitText ?? '').includes('title match'),
    JSON.stringify(english.slice(0, 2)));

  check('检索面板没有控制台错误', consoleErrors.length === 0, consoleErrors.slice(0, 3).join(' | '));
} finally {
  await browser?.close();
  await server?.cleanup();
  await server?.close?.();
}

if (failures.length) {
  console.log('\n检索次序验收失败：');
  for (const failure of failures) console.log('- ' + failure);
  process.exit(1);
}
console.log('\n检索次序验收通过。');
process.exit(0);
