import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { startTestServer } from './helpers.mjs';
import { CHROME_PATH, PLAYWRIGHT_SPECIFIER } from './browser-runtime.mjs';
import { MCS_CROSS_FIELDS } from '../shared/mcs-crossfields.mjs';

const app = await startTestServer({ lean: { enabled: false } });
const { chromium } = await import(PLAYWRIGHT_SPECIFIER);
const browser = await chromium.launch({ executablePath: CHROME_PATH ?? undefined, headless: true });
const errors = [], checks = [], directory = 'runtime/mcs-atlas-qa';
mkdirSync(directory, { recursive: true });
let active;
const watch = page => { active = page; page.on('pageerror', error => errors.push(error.message)); };
const ready = page => page.locator('[data-mcs-atlas]').waitFor();
const idle = page => page.waitForFunction(() => document.querySelector('[data-mcs-atlas]')?.dataset.motion === 'idle');
const center = (page, id) => page.locator(`[data-atlas-node="${id}"]`).evaluate(el => ({ x: +el.dataset.worldX + +el.dataset.worldW / 2, y: +el.dataset.worldY + +el.dataset.worldH / 2 }));
const entry = (page, parent, crossing = 'cross:algebraic-topology') => page.locator(`[data-atlas-node="${parent}"] > [data-atlas-crossing-child="${crossing}"]`);
const checkDirection = (point, parent, neighbour) => {
  const a = { x: point.x - parent.x, y: point.y - parent.y }, b = { x: neighbour.x - parent.x, y: neighbour.y - parent.y };
  assert((a.x * b.x + a.y * b.y) / Math.hypot(a.x, a.y) / Math.hypot(b.x, b.y) > .999, 'crossing is on the correct neighbour ray');
};
const entryCenter = locator => locator.evaluate(el => ({ x: +el.dataset.worldX + +el.dataset.worldW / 2, y: +el.dataset.worldY + +el.dataset.worldH / 2 }));

try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'no-preference' });
  const page = await context.newPage(); watch(page); await page.goto(app.origin + '/mcs'); await ready(page); await idle(page);
  await page.getByRole('combobox', { name: '核心子学科' }).selectOption('atlas:algebra'); await idle(page);
  const origin = await center(page, 'atlas:algebra'), topology = await center(page, 'atlas:topology');
  const canvas = page.locator('[data-mcs-atlas]'), box = await canvas.boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  const outward = [];
  for (const delta of [-20, -20, -15]) {
    await page.mouse.wheel(0, delta); await idle(page);
    await entry(page, 'atlas:algebra').waitFor();
    const point = await entryCenter(entry(page, 'atlas:algebra'));
    checkDirection(point, origin, topology); outward.push(Math.hypot(point.x - origin.x, point.y - origin.y));
  }
  assert(outward[1] > outward[0] * 1.08 && outward[2] > outward[1] * 1.03, 'as the field unfolds, its crossing moves outward toward its neighbour');
  await page.screenshot({ path: directory + '/algebra-topology-direction.png', fullPage: true });
  await entry(page, 'atlas:algebra').getByRole('button', { name: '代数拓扑', exact: true }).click(); await idle(page);
  const detail = page.getByRole('complementary', { name: '交叉学科内容' });
  await detail.waitFor(); assert((await detail.innerText()).includes('代数拓扑'));
  assert(await detail.locator('a[href^="https://"]').count() > 0);
  assert.equal(await page.locator('.mcs-atlas-detail').count(), 1, 'crossing has sourced content, not an empty-library detail');
  await page.getByRole('button', { name: '关闭交叉内容', exact: true }).click();
  checks.push('algebraic topology exists inside algebra, moves outward during zoom, points toward topology, and opens sourced crossing content');

  await page.getByRole('combobox', { name: '核心子学科' }).selectOption('atlas:topology'); await idle(page);
  const topOrigin = await center(page, 'atlas:topology'), algebra = await center(page, 'atlas:algebra');
  await page.locator('[data-atlas-node="atlas:topology"] > .mcs-atlas-label-offset button').click(); await idle(page);
  assert.equal(await entry(page, 'atlas:topology').count(), 1);
  assert.equal(await entry(page, 'atlas:topology').getAttribute('data-atlas-node'), 'atlas:algebraic-topology', 'reuse canonical branch');
  checkDirection(await entryCenter(entry(page, 'atlas:topology')), topOrigin, algebra);
  await page.screenshot({ path: directory + '/topology-algebra-direction.png', fullPage: true });
  checks.push('the topology side reuses its existing branch and points back toward algebra after changing the core');

  const mobile = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, reducedMotion: 'reduce', colorScheme: 'dark' });
  const phone = await mobile.newPage(); watch(phone); await phone.goto(app.origin + '/en/mcs'); await ready(phone); await idle(phone);
  await phone.getByRole('combobox', { name: 'Central field' }).selectOption('atlas:algebra'); await idle(phone);
  const phoneOrigin = await center(phone, 'atlas:algebra'), phoneTopology = await center(phone, 'atlas:topology');
  await phone.locator('[data-atlas-node="atlas:algebra"] > .mcs-atlas-label-offset button').tap(); await idle(phone);
  checkDirection(await entryCenter(entry(phone, 'atlas:algebra')), phoneOrigin, phoneTopology);
  await phone.screenshot({ path: directory + '/algebra-topology-mobile.png', fullPage: true });
  await entry(phone, 'atlas:algebra').getByRole('button', { name: 'Algebraic topology', exact: true }).tap();
  await phone.getByRole('complementary', { name: 'Intersection details' }).waitFor();
  assert(await phone.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await phone.getByRole('button', { name: 'Close intersection', exact: true }).tap();
  await phone.evaluate(() => {
    window.crossingTouchTrace = [];
    for (const type of ['pointerdown', 'pointermove', 'pointerup', 'click']) document.addEventListener(type, e => {
      window.crossingTouchTrace.push({ type, node: e.target.closest('[data-atlas-node]')?.dataset.atlasNode, x: e.clientX, y: e.clientY, pointer: e.pointerId });
      if (window.crossingTouchTrace.length > 16) window.crossingTouchTrace.shift();
    }, true);
  });
  for (const core of ['analysis', 'algebra', 'geometry', 'topology', 'number-theory', 'discrete', 'probability-statistics', 'foundations-computation']) {
    await phone.getByRole('combobox', { name: 'Central field' }).selectOption(`atlas:${core}`); await idle(phone);
    const positions = await phone.locator('[data-atlas-depth="1"]').evaluateAll(nodes => Object.fromEntries(nodes.map(el => [el.dataset.atlasNode,
      { x: +el.dataset.worldX + +el.dataset.worldW / 2, y: +el.dataset.worldY + +el.dataset.worldH / 2 }])));
    for (const crossing of MCS_CROSS_FIELDS.filter(item => item.domains.includes(`atlas:${core}`))) {
      await phone.locator('.mcs-atlas-tools button').first().tap(); await idle(phone);
      await phone.locator(`[data-atlas-node="atlas:${core}"] > .mcs-atlas-label-offset button`).tap(); await idle(phone);
      const labelDirection = await entry(phone, `atlas:${core}`, crossing.id).getByRole('button', { name: crossing.title.en, exact: true }).evaluate((button, { parent, neighbour }) => {
        const rect = button.getBoundingClientRect(), svg = document.querySelector('[data-mcs-atlas]'), view = svg.getBoundingClientRect(), scale = +svg.dataset.zoom;
        const x = (rect.x + rect.width / 2 - view.x - +svg.dataset.cameraX) / scale - parent.x;
        const y = (rect.y + rect.height / 2 - view.y - +svg.dataset.cameraY) / scale - parent.y;
        const vx = neighbour.x - parent.x, vy = neighbour.y - parent.y;
        return (x * vx + y * vy) / Math.hypot(x, y) / Math.hypot(vx, vy);
      }, { parent: positions[`atlas:${core}`], neighbour: positions[crossing.domains.find(id => id !== `atlas:${core}`)] });
      assert(labelDirection > .85, `${core}: the visible ${crossing.title.en} label must stay toward its neighbour`);
      await phone.evaluate(() => { window.crossingTouchTrace = []; });
      await entry(phone, `atlas:${core}`, crossing.id).getByRole('button', { name: crossing.title.en, exact: true }).tap();
      try { await phone.getByRole('complementary', { name: 'Intersection details' }).waitFor({ timeout: 3000 }); }
      catch (error) {
        console.log('crossing touch failure', JSON.stringify({ core, crossing: crossing.id, state: await phone.evaluate(() => ({ trace: window.crossingTouchTrace, zoom: document.querySelector('[data-mcs-atlas]').dataset.zoom, detail: document.querySelector('.mcs-atlas-detail')?.textContent.slice(0, 90) })) }));
        throw error;
      }
      await phone.getByRole('button', { name: 'Close intersection', exact: true }).tap();
    }
  }
  await phone.getByRole('combobox', { name: 'Central field' }).selectOption('atlas:algebra'); await idle(phone);
  await phone.locator('[data-atlas-node="atlas:algebra"] > .mcs-atlas-label-offset button').tap(); await idle(phone);
  const ordinary = phone.locator('[data-atlas-node="atlas:linear-algebra"]');
  assert.equal(await ordinary.locator('strong').count(), 0, 'ordinary branches retain a landmark before their names become readable');
  await phone.getByRole('button', { name: 'Zoom in', exact: true }).tap(); await idle(phone);
  assert.equal(await ordinary.locator('strong').count(), 1, 'further zoom reveals the ordinary branch name');
  checks.push('390px English dark touch layout preserves direction; every child crossing in all eight cores opens its content');
  assert.deepEqual(errors, []);
  writeFileSync(directory + '/crossing-layout-acceptance.json', JSON.stringify({ status: 'passed', checks, outwardDistances: outward, errors }, null, 2));
  console.log('MCS crossing layout: passed', checks);
} catch (error) {
  if (active && !active.isClosed()) await active.screenshot({ path: directory + '/crossing-layout-failure.png', fullPage: true }).catch(() => {});
  throw error;
} finally { await browser.close(); await app.cleanup(); }
