import assert from 'node:assert/strict';
import { mkdirSync } from 'node:fs';
import { startTestServer } from './helpers.mjs';
import { CHROME_PATH, PLAYWRIGHT_SPECIFIER } from './browser-runtime.mjs';

const app = await startTestServer({ lean: { enabled: false } });
const { chromium } = await import(PLAYWRIGHT_SPECIFIER);
const browser = await chromium.launch({ executablePath: CHROME_PATH ?? undefined, headless: true });
const directory = 'runtime/mcs-applied-qa';
mkdirSync(directory, { recursive: true });
const errors = [];
const watch = page => page.on('pageerror', error => errors.push(error.message));

const waitApplied = async page => {
  await page.locator('[data-mcs-applied]').waitFor();
  await page.waitForFunction(() => document.querySelectorAll('[data-applied-entry]').length > 0);
};
const cardCount = page => page.locator('[data-applied-entry]').count();
const openApplied = async (page, path = '/mcs?view=applied') => {
  await page.goto(app.origin + path);
  await waitApplied(page);
};
const waitCards = async (page, expected) => {
  await page.waitForFunction(count => document.querySelectorAll('[data-applied-entry]').length === count, expected);
};

try {
  /* ---------- 桌面：186 节、编筛选、搜索、详情、引用 ---------- */
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce', colorScheme: 'light' });
  await context.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: app.origin });
  const page = await context.newPage(); watch(page);
  let mcsViewRequests = 0;
  await page.route('**/api/v2/ontology/mcs-view*', route => { mcsViewRequests += 1; route.continue(); });
  await openApplied(page);
  assert.equal(mcsViewRequests, 0, 'the applied index must not request mcs-view');
  assert.equal(await cardCount(page), 186, 'all 186 book sections are rendered');
  assert.equal(await page.locator('[data-applied-part]').count(), 8, 'eight part filters');
  assert.equal(await page.locator('[data-applied-workflow]').count(), 1, 'desktop workflow is open by default');
  assert.equal(await page.locator('[data-applied-count]').innerText(), '186 / 186');
  assert((await page.locator('[data-applied-entry="I.1"]').innerText()).includes('应用数学是什么？'));
  assert.equal(await page.locator('[data-applied-search]').getAttribute('aria-label'), '搜索 186 节');
  await page.screenshot({ path: directory + '/accept-desktop.png', fullPage: false });

  await page.locator('[data-applied-part="II"]').click();
  await waitCards(page, 36);
  assert((await page.locator('.mcs-applied-list-head').innerText()).includes('II · 概念'));
  await page.locator('[data-applied-part="II"]').click();
  await waitCards(page, 186);

  await page.locator('[data-applied-search]').fill('湍流');
  await page.locator('[data-applied-entry="V.21"]').waitFor();
  assert.equal(await cardCount(page), 3, 'III.23, IV.28 and V.21 mention turbulence');
  assert((await page.locator('.mcs-applied-list-head').innerText()).includes('筛选结果'));
  await page.locator('[data-applied-entry="V.21"]').click();
  const detail = page.locator('[data-applied-detail]');
  await detail.waitFor();
  assert((await detail.innerText()).includes('V.21 · p. 724'), 'printed page is shown');
  assert((await detail.innerText()).includes('Higham'), 'citation names the editor');
  assert.equal(await detail.locator('[data-applied-branch]').count(), 0, 'V.21 has no map branch');
  await page.getByRole('button', { name: '复制引用' }).click();
  const clipboard = await page.evaluate(() => navigator.clipboard.readText());
  assert(clipboard.includes('Higham') && clipboard.includes('p. 724'), 'citation is copied');
  await page.screenshot({ path: directory + '/accept-detail.png', fullPage: false });
  await page.getByRole('button', { name: '关闭详情' }).click();
  await detail.waitFor({ state: 'detached' });

  /* ---------- 索引 → 地图 → 索引 ---------- */
  await openApplied(page, '/mcs?view=applied&entry=IV.1');
  await page.locator('[data-applied-branch="atlas:complex-analysis"]').click();
  await page.locator('[data-mcs-atlas]').waitFor();
  await page.locator('[data-atlas-book]').waitFor({ timeout: 10000 });
  const book = await page.locator('[data-atlas-book]').innerText();
  assert(book.includes('II.5') && book.includes('III.6') && book.includes('IV.1'), 'atlas leaf lists its book sections');
  await page.locator('[data-atlas-book] button').first().click();
  await page.locator('[data-mcs-applied]').waitFor();
  await page.locator('[data-applied-detail]').waitFor();
  assert((await page.locator('[data-applied-detail]').innerText()).includes('共形映射'));
  await page.screenshot({ path: directory + '/accept-atlas-link.png', fullPage: false });

  /* ---------- 框架抽屉的未映射入口 ---------- */
  await page.goto(app.origin + '/mcs');
  await page.locator('[data-mcs-atlas]').waitFor();
  await page.getByRole('button', { name: '框架', exact: true }).click();
  await page.locator('[data-framework-panel]').waitFor();
  assert.equal(await page.locator('[data-applied-link]').count(), 12, 'all twelve unmapped MSC rows link to the index');
  await page.locator('[data-framework-code="76"] [data-applied-link]').click();
  await waitApplied(page);
  assert((await page.locator('.mcs-applied-list-head').innerText()).includes('MSC 76'));
  await waitCards(page, 26);
  assert.equal(await page.locator('[data-applied-entry="IV.28"]').count(), 1, 'fluid dynamics is among the 76 sections');
  await page.screenshot({ path: directory + '/accept-framework-link.png', fullPage: false });

  /* ---------- 深链、Back/Forward、无效参数 ---------- */
  await page.goto(app.origin + '/mcs?view=applied');
  await waitApplied(page);
  await page.locator('[data-applied-entry="IV.18"]').click();
  await page.locator('[data-applied-detail]').waitFor();
  await page.goBack();
  await page.locator('[data-applied-detail]').waitFor({ state: 'detached' });
  await page.goForward();
  await page.locator('[data-applied-detail]').waitFor();
  assert((await page.locator('[data-applied-detail]').innerText()).includes('p. 360'));
  await page.goto(app.origin + '/mcs?view=applied&part=ZZ&entry=NOPE');
  await waitApplied(page);
  assert.equal(await cardCount(page), 186, 'invalid filters fall back to the whole index');
  assert.equal(await page.locator('[data-applied-detail]').count(), 0, 'invalid entry does not open a detail');

  /* ---------- 键盘与分享 ---------- */
  await page.locator('body').click({ position: { x: 8, y: 8 } });
  await page.keyboard.press('/');
  assert.equal(await page.evaluate(() => document.activeElement?.hasAttribute('data-applied-search')), true, '/ focuses search');
  await page.keyboard.type('turbulence');
  await page.locator('[data-applied-entry="V.21"]').waitFor();
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => document.querySelector('[data-applied-search]')?.value === '');
  await waitCards(page, 186);
  await page.getByRole('button', { name: '分享视图' }).click();
  await page.locator('.mcs-applied-workspace .mcs-notice').waitFor();
  const share = await page.locator('.mcs-applied-workspace .mcs-notice input').inputValue();
  assert(share.includes('view=applied'), 'share link keeps the applied mode');

  /* ---------- 英文 ---------- */
  const english = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
  const en = await english.newPage(); watch(en);
  await openApplied(en, '/en/mcs?view=applied');
  assert((await en.locator('[data-mcs-applied] h1').innerText()).includes('Applied mathematics index'));
  const first = await en.locator('[data-applied-entry="I.1"]').innerText();
  assert(first.includes('What Is Applied Mathematics?') && !first.includes('应用数学是什么'));
  assert((await en.locator('[data-applied-part="II"]').innerText()).includes('Concepts'));
  assert.equal(await en.evaluate(() => document.documentElement.lang), 'en');
  await en.screenshot({ path: directory + '/accept-en.png', fullPage: false });
  await english.close();

  /* ---------- 390px ---------- */
  const phone = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
  const mobile = await phone.newPage(); watch(mobile);
  await openApplied(mobile);
  assert.equal(await cardCount(mobile), 186);
  assert.equal(await mobile.locator('[data-applied-workflow]').count(), 0, 'workflow is collapsed on phones');
  const overflow = await mobile.evaluate(() => ({
    doc: document.documentElement.scrollWidth,
    body: document.body.scrollWidth,
    client: document.documentElement.clientWidth,
  }));
  assert(overflow.doc <= 390 && overflow.body <= 390 && overflow.client === 390, `no horizontal overflow: ${JSON.stringify(overflow)}`);
  await mobile.locator('[data-applied-part="II"]').click();
  await waitCards(mobile, 36);
  await mobile.locator('[data-applied-entry="II.5"]').click();
  await mobile.locator('[data-applied-detail]').waitFor();
  assert.equal(await mobile.locator('[data-applied-list]').count(), 0, 'phone detail replaces the list');
  assert.equal(await mobile.locator('.mcs-applied-rail').count(), 0, 'phone detail replaces the rail');
  await mobile.getByRole('button', { name: '返回列表' }).click();
  await mobile.locator('[data-applied-list]').waitFor();
  await mobile.screenshot({ path: directory + '/accept-phone.png', fullPage: false });
  await phone.close();

  /* ---------- 深色 ---------- */
  const dark = await browser.newContext({ viewport: { width: 1440, height: 1000 }, colorScheme: 'dark', reducedMotion: 'reduce' });
  const darkPage = await dark.newPage(); watch(darkPage);
  await openApplied(darkPage);
  assert.equal(await cardCount(darkPage), 186);
  await darkPage.screenshot({ path: directory + '/accept-dark.png', fullPage: false });
  await dark.close();

  assert.deepEqual(errors, [], 'no page errors');
  console.log('mcs-applied-page: all checks passed');
} finally {
  await browser.close();
  await app.cleanup();
}
