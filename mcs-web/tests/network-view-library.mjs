import assert from 'node:assert/strict';
import { mkdirSync } from 'node:fs';
import { startTestServer, jsonCall } from './helpers.mjs';
import { PLAYWRIGHT_SPECIFIER, CHROME_PATH } from './browser-runtime.mjs';

const server = await startTestServer();
const { chromium } = await import(PLAYWRIGHT_SPECIFIER);
let browser;
try {
  browser = await chromium.launch({ executablePath: CHROME_PATH ?? undefined, headless: true });
  const { payload: created } = await jsonCall(server.origin, '/api/v2/profiles', { method: 'POST', body: { name: '视图库验收' } });
  const profileId = created.data.profile.id;
  const ids = ['dg:manifold', 'dg:homeomorphism', 'dg:smooth-manifold'];
  const seeds = [
    ['Beta', 1], ['Alpha', 2], ['Alpha', 3], ['几何与拓扑', 2], ['几何'.repeat(40), 1],
  ];
  const views = [];
  for (const [name, count] of seeds) {
    const { status, payload } = await jsonCall(server.origin, `/api/v2/profiles/${profileId}/network-views`, {
      method: 'POST', body: { name, payload: { added: ids.slice(0, count), families: ['relation'], positions: {}, camera: { x: 10, y: 20, scale: 1 } } },
    });
    assert.equal(status, 200);
    views.push(payload.data.view);
  }
  const listRemote = async () => (await jsonCall(server.origin, `/api/v2/profiles/${profileId}/network-views`)).payload.data.views;
  const remoteBefore = await listRemote();
  const ontologyBefore = (await jsonCall(server.origin, '/api/v2/ontology')).payload.data.version;

  for (const source of ['local', 'profile']) {
    const context = await browser.newContext({ viewport: { width: 1440, height: 950 } });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto(server.origin, { waitUntil: 'networkidle' });
    const localOriginal = JSON.stringify(views.map((view) => ({ ...view, local: true })));
    await page.evaluate(({ source, profileId, localOriginal }) => {
      if (source === 'profile') localStorage.setItem('mcs-web-selected-profile', profileId);
      else localStorage.setItem('mcs-network-views-local-v1', localOriginal);
    }, { source, profileId, localOriginal });
    await page.goto(`${server.origin}/network`, { waitUntil: 'networkidle' });
    await page.getByLabel('显示保存的视图面板').check();
    const rows = page.locator('.saved-view-list li');
    const names = () => page.locator('.saved-view-name').allTextContents();
    const counts = () => rows.locator('.family-count-badge').allTextContents();
    await page.waitForFunction(() => document.querySelectorAll('.saved-view-list li').length === 5);
    assert.deepEqual(await names(), seeds.map(([name]) => name).reverse());
    assert.match(await page.locator('.saved-view-snapshot-note').innerText(), /独立快照.*不自动合并.*视角已固定/);
    assert.deepEqual((await page.locator('.saved-view-duplicate').allTextContents()).sort(), ['同名 1/2', '同名 2/2']);

    await page.getByLabel('视图排序', { exact: true }).selectOption('oldest');
    assert.deepEqual(await names(), seeds.map(([name]) => name));
    await page.getByLabel('视图排序', { exact: true }).selectOption('nodes');
    assert.deepEqual(await counts(), ['3 节点', '2 节点', '2 节点', '1 节点', '1 节点']);
    await page.getByLabel('搜索已保存的视图', { exact: true }).fill(' ALP ');
    await page.waitForFunction(() => document.querySelectorAll('.saved-view-list li').length === 2);
    assert.deepEqual(await names(), ['Alpha', 'Alpha']);
    assert.match(await page.locator('.saved-view-search-result').innerText(), /显示 2 \/ 5/);
    assert.deepEqual((await page.locator('.saved-view-duplicate').allTextContents()).sort(), ['同名 1/2', '同名 2/2']);
    await page.getByLabel('搜索已保存的视图', { exact: true }).fill('不存在的视图');
    await page.waitForFunction(() => document.querySelectorAll('.saved-view-list li').length === 0);
    assert.match(await page.locator('body').innerText(), /没有匹配的视图/);
    await page.getByRole('button', { name: '清除视图搜索', exact: true }).click();
    await page.waitForFunction(() => document.querySelectorAll('.saved-view-list li').length === 5);
    assert.equal((await counts())[0], '3 节点');
    if (source === 'local') {
      assert.equal(await page.evaluate(() => localStorage.getItem('mcs-network-views-local-v1')), localOriginal);
    }
    assert.deepEqual(await listRemote(), remoteBefore);
    console.log(`  ✓ ${source}: search, trim/case handling, time/node sorting, duplicate badges and empty-state recovery; stored records unchanged`);

    if (source === 'profile') {
      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto(`${server.origin}/en/network`, { waitUntil: 'networkidle' });
      await page.getByLabel('Show the saved views panel').check();
      await page.getByLabel('Search saved views', { exact: true }).fill('alpha');
      await page.waitForFunction(() => document.querySelectorAll('.saved-view-list li').length === 2);
      assert.match(await page.locator('.saved-view-search-result').innerText(), /Showing 2 of 5/);
      assert.equal(await page.getByLabel('Sort saved views', { exact: true }).inputValue(), 'recent');
      assert.ok(await page.locator('.saved-view-tools').evaluate((el) => el.scrollWidth <= el.clientWidth));
      await page.getByRole('button', { name: 'Clear view search', exact: true }).click();
      assert.ok(await rows.evaluateAll((items) => items.every((el) => el.scrollWidth <= el.clientWidth)));
      mkdirSync('tmp', { recursive: true });
      await page.locator('.saved-view-tools').screenshot({ path: 'tmp/site-update-20261008-mobile.png' });
      // A filter from one learner must not silently hide another learner's views.
      await page.getByLabel('Search saved views', { exact: true }).fill('alpha');
      await page.locator('#profile-select').selectOption('');
      await page.locator('#profile-select').selectOption(profileId);
      await page.waitForFunction(() => document.querySelectorAll('.saved-view-list li').length === 5);
      assert.equal(await page.getByLabel('Search saved views', { exact: true }).inputValue(), '');
      console.log('  ✓ English, 390px layout, long names and profile-switch filter reset');
    }
    assert.deepEqual(errors, []);
    await context.close();
  }
  assert.equal((await jsonCall(server.origin, '/api/v2/ontology')).payload.data.version, ontologyBefore);
  assert.equal((await jsonCall(server.origin, `/api/v2/profiles/${profileId}/events`)).payload.data.events.length, 0);
  console.log('  ✓ Browsing saved views leaves ontology and learning events unchanged');
} finally {
  await browser?.close();
  await server.cleanup();
}
console.log('Saved-view library checks passed.');
