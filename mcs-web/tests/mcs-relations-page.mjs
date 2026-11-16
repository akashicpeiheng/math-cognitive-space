import assert from 'node:assert/strict';
import { mkdirSync } from 'node:fs';
import { startTestServer } from './helpers.mjs';
import { CHROME_PATH, PLAYWRIGHT_SPECIFIER } from './browser-runtime.mjs';
import { createMcsLayout, defaultMcsState, setMcsLevel, MCS_STORAGE_KEY } from '../shared/mcs-space.mjs';

const app = await startTestServer({ lean: { enabled: false } });
const { chromium } = await import(PLAYWRIGHT_SPECIFIER);
const browser = await chromium.launch({ executablePath: CHROME_PATH ?? undefined, headless: true });
const errors = [];
let page;
mkdirSync('runtime/mcs-relations-qa', { recursive: true });
try {
  const context = await browser.newContext({ viewport: { width: 1680, height: 1080 }, reducedMotion: 'reduce', colorScheme: 'dark' });
  page = await context.newPage();
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(app.origin + '/mcs?view=objects');
  await page.locator('[data-mcs-canvas]').waitFor();
  const data = (await (await fetch(app.origin + '/api/v2/ontology/mcs-view')).json()).data;
  const layout = createMcsLayout(data), topic = layout.boxes['obj:tdg:topic-local-change'];
  const size = await page.locator('[data-mcs-canvas]').boundingBox();
  const state = setMcsLevel(data, defaultMcsState(data), 2);
  const scale = Math.min((size.width - 160) / topic.w, (size.height - 200) / topic.h);
  state.viewport = { width: size.width, height: size.height };
  state.camera = { scale, x: size.width / 2 - (topic.x + topic.w / 2) * scale, y: size.height / 2 - (topic.y + topic.h / 2) * scale };
  await page.addInitScript(({ key, state }) => {
    // Seed before React mounts, so the previous entry's debounced save cannot
    // overwrite the fixture between a storage write and the reload.
    if (!sessionStorage.getItem('mcs-relations-test-seeded')) {
      localStorage.setItem(key, JSON.stringify(state));
      history.replaceState({ ...history.state, mcsView: { hash: location.hash, state } }, '');
      sessionStorage.setItem('mcs-relations-test-seeded', '1');
    }
  }, { key: MCS_STORAGE_KEY, state });
  await page.reload();
  await page.locator('[data-mcs-canvas]').waitFor();
  await page.locator('[data-mcs-same-topic="true"]').first().waitFor({ state: 'attached', timeout: 10000 });
  await page.waitForTimeout(350);
  const shafts = page.locator('[data-mcs-same-topic="true"] .mcs-relation-shaft');
  assert(await shafts.count() > 0);
  assert(await shafts.evaluateAll(paths => paths.every(path => Number.parseFloat(getComputedStyle(path).strokeWidth) >= 5)));
  assert(await page.locator('.mcs-edge-hit').evaluateAll(paths => paths.every(path => getComputedStyle(path).opacity === '0')));
  const wideEndpoints = await page.locator('[data-mcs-same-topic="true"]').evaluateAll(elements => elements.map(element => element.dataset.mcsRelationEndpoints.split('->')));
  const topicOf = id => {
    let box = layout.boxes[id];
    while (box) {
      if (data.objects.find(object => object.id === box.objectId)?.scale === 'topic') return box.objectId;
      box = layout.boxes[box.parent];
    }
  };
  for (const [from, to] of wideEndpoints) assert.equal(topicOf(from), topicOf(to), 'broad arrows stay within one displayed topic');
  const labels = page.locator('[data-mcs-relation-label]');
  assert(await labels.count() > 0);
  assert(await labels.evaluateAll(elements => elements.every(element => element.querySelector('text')?.textContent.trim())));
  await page.screenshot({ path: 'runtime/mcs-relations-qa/topic-dark.png', fullPage: true });

  // Choose a real on-screen arrow label, then exercise the full persistence flow.
  const visibleIndex = await labels.evaluateAll(elements => elements.findIndex(element => {
    const box = element.getBoundingClientRect(), svg = element.closest('svg').getBoundingClientRect();
    return box.x > svg.x + 60 && box.right < svg.right - 30 && box.y > svg.y + 70 && box.bottom < svg.bottom - 150;
  }));
  assert(visibleIndex >= 0);
  await labels.nth(visibleIndex).click();
  const card = page.locator('[data-mcs-relation-detail]').first();
  await card.waitFor();
  await card.getByRole('button', { name: '添加备注', exact: true }).click();
  const dialog = page.getByRole('dialog'), note = '把这条关系的条件和构造一起回看。';
  await dialog.getByRole('textbox').fill(note);
  await dialog.getByRole('button', { name: '保存备注', exact: true }).click();
  await dialog.waitFor({ state: 'hidden' });
  await page.locator('.mcs-edge-label.has-note').first().waitFor();
  await page.reload();
  await page.locator('.mcs-edge-label.has-note').first().waitFor();
  assert((await page.locator('.mcs-inspector').innerText()).includes(note));
  await page.getByRole('button', { name: '分享视图', exact: true }).click();
  const share = await page.getByRole('textbox', { name: '公共视图链接' }).inputValue();
  assert(!decodeURIComponent(share).includes(note));
  await page.keyboard.press('Escape');
  await page.screenshot({ path: 'runtime/mcs-relations-qa/relationship-note.png', fullPage: true });
  await page.getByRole('button', { name: '关闭详情', exact: true }).click();
  for (let i = 0; i < 2; i++) await page.getByRole('button', { name: '放大', exact: true }).click();
  assert(await shafts.evaluateAll(paths => paths.every(path => Number.parseFloat(getComputedStyle(path).strokeWidth) >= 5)));
  await page.emulateMedia({ colorScheme: 'light' });
  await page.screenshot({ path: 'runtime/mcs-relations-qa/topic-light.png', fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await page.screenshot({ path: 'runtime/mcs-relations-qa/mobile.png', fullPage: true });
  assert.deepEqual(errors, []);
  console.log('MCS relation arrows: broad typed arrows, floating labels, personal note save/reload, share privacy, zoom, dark/light and mobile passed.');
} catch (error) {
  console.error({ errors, url: page?.url(), text: await page?.locator('body').innerText() });
  if (page) await page.screenshot({ path: 'runtime/mcs-relations-qa/failure.png', fullPage: true });
  throw error;
} finally { await browser.close(); await app.cleanup(); }
