import assert from 'node:assert/strict';
import { mkdirSync } from 'node:fs';
import { startTestServer } from './helpers.mjs';
import { CHROME_PATH, PLAYWRIGHT_SPECIFIER } from './browser-runtime.mjs';

const app = await startTestServer({ lean: { enabled: false } });
const { chromium } = await import(PLAYWRIGHT_SPECIFIER);
const browser = await chromium.launch({ executablePath: CHROME_PATH ?? undefined, headless: true });
const directory = 'runtime/mcs-constellation-qa';
mkdirSync(directory, { recursive: true });
const errors = [];
const watch = page => page.on('pageerror', error => errors.push(error.message));

const openTopic = async (page, english = false) => {
  await page.goto(app.origin + (english ? '/en/mcs' : '/mcs'));
  await page.locator('[data-mcs-atlas]').waitFor();
  const search = page.getByRole('searchbox', { name: english ? 'Search the math map' : '搜索数学地图' });
  await search.fill(english ? 'Forms and exterior calculus' : '微分形式与外微分');
  await page.waitForTimeout(250);
  const result = page.locator('.mcs-atlas-results button', { hasText: english ? 'Forms and exterior calculus' : '微分形式与外微分' }).first();
  await result.waitFor();
  await result.click();
  await page.waitForFunction(() => document.querySelectorAll('[data-atlas-relation]').length === 5);
};

try {
  /* ---------- 桌面：核心、三组、五条关系 ---------- */
  const context = await browser.newContext({ viewport: { width: 1600, height: 1000 }, reducedMotion: 'reduce', colorScheme: 'light' });
  const page = await context.newPage(); watch(page);
  await openTopic(page);
  assert.equal(await page.locator('[data-atlas-relation]').count(), 5, 'five main relations are drawn');
  const edges = await page.locator('[data-atlas-relation]').evaluateAll(nodes => nodes.map(node => [node.dataset.from, node.dataset.to, node.dataset.kind]));
  assert.deepEqual(edges, [
    ['obj:tdg:exterior', 'obj:tdg:d-squared', 'deduction'],
    ['obj:tdg:exterior', 'obj:tdg:vector-realization', 'deduction'],
    ['obj:tdg:hodge', 'obj:tdg:vector-realization', 'deduction'],
    ['obj:tdg:exterior', 'obj:tdg:curl-grad', 'application'],
    ['obj:tdg:exterior', 'obj:tdg:div-curl', 'application'],
  ]);
  assert.equal(await page.locator('[data-atlas-constellation]').count(), 3, 'three curated reading groups are labelled');
  assert.deepEqual(await page.locator('[data-atlas-constellation]').allTextContents(), ['d² = 0 家族', '形式运算', '向量分析']);
  assert.equal(await page.locator('[data-atlas-constellation-core]').count(), 1, 'the core is marked once');
  assert.equal(await page.locator('[data-atlas-constellation-core]').textContent(), '核心概念');
  assert.equal(await page.locator('[data-atlas-relation-legend]').count(), 1);
  assert.equal(await page.locator('[data-mcs-atlas]').getAttribute('data-zoom') !== null, true);

  const core = await page.locator('[data-atlas-node="atlas:object:obj:tdg:exterior"]').boundingBox();
  assert(core, 'core node exists');
  assert(Math.abs(core.x + core.width / 2 - 800) < 160, 'core is near the horizontal centre');
  assert(Math.abs(core.y + core.height / 2 - 500) < 180, 'core is near the vertical centre');
  const family = await Promise.all(['d-squared', 'curl-grad', 'div-curl'].map(async id => {
    const box = await page.locator(`[data-atlas-node="atlas:object:obj:tdg:${id}"]`).boundingBox();
    return box ? { id, x: box.x + box.width / 2, y: box.y + box.height / 2 } : null;
  }));
  assert(family.every(Boolean), 'the d² family is visible');
  assert(family.every(node => node.y > core.y + core.height / 2), 'the d² family sits below the core');
  assert(family[0].x < family[1].x && family[1].x < family[2].x, 'd-squared, curl-grad and div-curl stay in left-to-right order');
  await page.screenshot({ path: directory + '/accept-desktop.png', fullPage: false });

  /* ---------- 详情：跨专题关系与跳转 ---------- */
  await page.locator('[data-atlas-node="atlas:object:obj:tdg:curl-grad"] button').click();
  await page.locator('[data-atlas-detail]', { hasText: 'curl grad' }).waitFor();
  assert.equal(await page.locator('[data-atlas-relation-list]').count(), 1, 'object detail lists its relations');
  const list = await page.locator('[data-atlas-relation-list]').innerText();
  assert(list.includes('主要关系'));
  assert(list.includes('外微分 d') && list.includes('旋度') && list.includes('梯度'), 'cross-topic relations are readable');
  await page.locator('[data-atlas-relation-target="obj:tdg:exterior"]').click();
  await page.waitForTimeout(500);
  assert((await page.locator('[data-atlas-detail]').innerText()).includes('外微分 d'));
  await page.screenshot({ path: directory + '/accept-detail.png', fullPage: false });

  /* ---------- 390px：只留核心名与可点的点 ---------- */
  const phone = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
  const mobile = await phone.newPage(); watch(mobile);
  await openTopic(mobile);
  assert.equal(await mobile.locator('[data-atlas-relation]').count(), 5);
  const visibleMemberLabels = await mobile.locator('.mcs-atlas-place.is-constellation-member:not(.is-constellation-core) strong')
    .evaluateAll(nodes => nodes.filter(node => getComputedStyle(node).display !== 'none').map(node => node.textContent));
  assert.deepEqual(visibleMemberLabels, [], 'phone shows only the core name');
  assert.equal(await mobile.locator('.mcs-atlas-place.is-constellation-core strong').innerText(), '外微分 d');
  assert.equal(await mobile.locator('[data-atlas-relation-legend]').evaluate(el => getComputedStyle(el).display), 'none');
  const overflow = await mobile.evaluate(() => ({ doc: document.documentElement.scrollWidth, body: document.body.scrollWidth, client: document.documentElement.clientWidth }));
  assert(overflow.doc <= 390 && overflow.body <= 390 && overflow.client === 390, `no horizontal overflow: ${JSON.stringify(overflow)}`);
  await mobile.screenshot({ path: directory + '/accept-phone.png', fullPage: false });
  await phone.close();

  /* ---------- 英文 ---------- */
  const englishContext = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
  const en = await englishContext.newPage(); watch(en);
  await openTopic(en, true);
  assert.deepEqual(await en.locator('[data-atlas-constellation]').allTextContents(), ['d² = 0 family', 'Form operations', 'Vector analysis']);
  assert.equal(await en.locator('[data-atlas-constellation-core]').textContent(), 'Core concept');
  const legend = await en.locator('[data-atlas-relation-legend]').innerText();
  assert(legend.includes('Deduction') && legend.includes('Application'));
  await en.screenshot({ path: directory + '/accept-en.png', fullPage: false });
  await englishContext.close();

  /* ---------- 深色 ---------- */
  const darkContext = await browser.newContext({ viewport: { width: 1600, height: 1000 }, colorScheme: 'dark', reducedMotion: 'reduce' });
  const dark = await darkContext.newPage(); watch(dark);
  await openTopic(dark);
  assert.equal(await dark.locator('[data-atlas-relation]').count(), 5);
  await dark.screenshot({ path: directory + '/accept-dark.png', fullPage: false });
  await darkContext.close();

  assert.deepEqual(errors, [], 'no page errors');
  console.log('mcs-atlas-relations-page: all checks passed');
} finally {
  await browser.close();
  await app.cleanup();
}
