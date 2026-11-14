import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { startTestServer } from './helpers.mjs';
import { CHROME_PATH, PLAYWRIGHT_SPECIFIER } from './browser-runtime.mjs';

const app = await startTestServer({ lean: { enabled: false } });
const { chromium } = await import(PLAYWRIGHT_SPECIFIER);
const browser = await chromium.launch({ executablePath: CHROME_PATH ?? undefined, headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'no-preference' });
const page = await context.newPage();
const errors = [], checks = [], directory = 'runtime/mcs-atlas-qa';
mkdirSync(directory, { recursive: true });
page.on('pageerror', error => errors.push(error.message));
const canvas = page.locator('[data-mcs-atlas]');
const idle = () => page.waitForFunction(() => document.querySelector('[data-mcs-atlas]')?.dataset.motion === 'idle');
const camera = () => canvas.evaluate(el => ({ x: +el.dataset.cameraX, y: +el.dataset.cameraY, scale: +el.dataset.zoom }));
const frames = (count = 35) => page.evaluate(count => new Promise(resolve => {
  const result = [];
  const sample = () => {
    const svg = document.querySelector('[data-mcs-atlas]');
    result.push({ x: +svg.dataset.cameraX, y: +svg.dataset.cameraY, scale: +svg.dataset.zoom, time: performance.now() });
    if (result.length < count) requestAnimationFrame(sample); else resolve(result);
  };
  requestAnimationFrame(sample);
}), count);

try {
  await page.goto(app.origin + '/mcs'); await canvas.waitFor(); await idle();
  const home = await camera();
  const layoutFrames = await page.evaluate(() => new Promise(resolve => {
    const target = document.querySelector('[data-atlas-node="atlas:geometry"]');
    const first = { x: +target.dataset.worldX, y: +target.dataset.worldY };
    const select = document.querySelector('.mcs-atlas-core-picker select');
    select.value = 'atlas:geometry'; select.dispatchEvent(new Event('change', { bubbles: true }));
    const samples = [first];
    const sample = () => {
      const node = document.querySelector('[data-atlas-node="atlas:geometry"]');
      samples.push({ x: +node.dataset.worldX, y: +node.dataset.worldY });
      if (samples.length < 55) requestAnimationFrame(sample); else resolve(samples);
    };
    requestAnimationFrame(sample);
  }));
  assert(new Set(layoutFrames.map(p => p.y)).size > 25, 'core rearrangement has intermediate positions');
  const total = Math.hypot(layoutFrames.at(-1).x - layoutFrames[0].x, layoutFrames.at(-1).y - layoutFrames[0].y);
  assert(total > 100);
  for (let i = 1; i < layoutFrames.length; i++) assert(Math.hypot(layoutFrames[i].x - layoutFrames[i - 1].x, layoutFrames[i].y - layoutFrames[i - 1].y) < total * .25, 'no layout teleport');
  await idle();
  for (const id of ['atlas:algebra', 'atlas:topology', 'atlas:analysis']) {
    await page.getByRole('combobox', { name: '核心子学科' }).selectOption(id);
    await page.waitForTimeout(90);
  }
  await idle();
  assert.equal(await page.locator('[data-atlas-core="true"]').getAttribute('data-atlas-node'), 'atlas:analysis');
  checks.push('core changes interpolate positions and sizes; rapid retargeting settles on the last field');

  await page.getByRole('combobox', { name: '核心子学科' }).selectOption('atlas:algebra'); await idle();
  const fieldArea = id => page.locator(`[data-atlas-node="${id}"]`).evaluate(el => +el.dataset.worldW * +el.dataset.worldH);
  const weakArea = await fieldArea('atlas:probability-statistics');
  assert(await fieldArea('atlas:number-theory') > weakArea * 3, 'stronger field has a larger navigation envelope');
  const areaFrames = await page.evaluate(() => new Promise(resolve => {
    const read = () => {
      const node = document.querySelector('[data-atlas-node="atlas:probability-statistics"]');
      const path = document.querySelector('[data-atlas-terrain="atlas:probability-statistics"] > path');
      const shape = path.getBBox();
      return { area: +node.dataset.worldW * +node.dataset.worldH, drawnArea: shape.width * shape.height };
    };
    const samples = [read()];
    const select = document.querySelector('.mcs-atlas-core-picker select');
    select.value = 'atlas:analysis'; select.dispatchEvent(new Event('change', { bubbles: true }));
    const sample = () => { samples.push(read()); if (samples.length < 55) requestAnimationFrame(sample); else resolve(samples); };
    requestAnimationFrame(sample);
  }));
  assert(areaFrames.at(-1).area > weakArea * 2.5, 'probability grows when its relationship to the core becomes stronger');
  assert(areaFrames.at(-1).drawnArea > areaFrames[0].drawnArea * 2, 'the rendered colour region grows, not only metadata or text');
  assert(new Set(areaFrames.map(frame => frame.area)).size > 25, 'area has intermediate animated values');
  const areaChange = areaFrames.at(-1).area - areaFrames[0].area;
  for (let i = 1; i < areaFrames.length; i++) {
    assert(areaFrames[i].area > 0 && areaFrames[i].drawnArea > 0);
    assert(Math.abs(areaFrames[i].area - areaFrames[i - 1].area) < areaChange * .25, 'area does not snap');
  }
  await idle();
  await page.screenshot({ path: directory + '/affinity-analysis.png', fullPage: true });
  checks.push('stronger neighbours have larger areas; a peripheral field smoothly grows in both geometry and rendered colour when the core changes');

  const rect = await canvas.boundingBox();
  const pointer = { x: Math.round(rect.x + rect.width * .37), y: Math.round(rect.y + rect.height * .43) };
  const anchor = { x: pointer.x - rect.x, y: pointer.y - rect.y };
  const before = await camera();
  await page.mouse.move(pointer.x, pointer.y); await page.mouse.wheel(0, -120);
  const zoomFrames = await frames();
  assert(new Set(zoomFrames.map(p => p.scale)).size > 15, 'wheel zoom is animated');
  for (const frame of zoomFrames) {
    assert(Math.abs((anchor.x - frame.x) / frame.scale - (anchor.x - before.x) / before.scale) < .03, 'horizontal pointer anchor holds during animation');
    assert(Math.abs((anchor.y - frame.y) / frame.scale - (anchor.y - before.y) / before.scale) < .03, 'vertical pointer anchor holds during animation');
  }
  await idle();
  assert((await camera()).scale > before.scale * 1.5);
  await page.mouse.wheel(0, -120); await page.waitForTimeout(70); await page.mouse.wheel(0, 120);
  await idle();
  await canvas.focus(); await page.keyboard.press('Home'); await idle();
  assert(Math.abs((await camera()).scale - home.scale) < .0001);
  checks.push('wheel preserves its anchor on every sampled frame, reverses smoothly and returns to overview');

  await page.mouse.move(rect.x + 30, rect.y + 90); await page.mouse.down();
  for (let i = 1; i <= 8; i++) { await page.mouse.move(rect.x + 30 + i * 14, rect.y + 90 + i * 4); await page.waitForTimeout(12); }
  await page.mouse.up();
  const released = await camera(); await page.waitForTimeout(100);
  assert((await camera()).x - released.x > 8, 'release continues with decaying momentum');
  await page.mouse.down();
  const interrupted = await camera(); await page.waitForTimeout(130);
  assert.deepEqual(await camera(), interrupted, 'new pointer contact immediately stops coasting');
  await page.mouse.up(); await idle();
  const still = await camera(); await page.waitForTimeout(200); assert.deepEqual(await camera(), still);
  checks.push('drag coasts, new contact interrupts immediately, and the idle map has no perpetual movement');

  await canvas.focus(); await page.keyboard.press('Home'); await page.waitForTimeout(60);
  await page.emulateMedia({ reducedMotion: 'reduce' }); await idle();
  assert(Math.abs((await camera()).scale - home.scale) < .0001);
  const reducedBefore = await camera(); await page.mouse.wheel(0, -100);
  await page.waitForFunction(scale => +document.querySelector('[data-mcs-atlas]').dataset.zoom > scale, reducedBefore.scale);
  assert.equal(await canvas.getAttribute('data-motion'), 'idle', 'reduced motion does not schedule camera animation');
  await page.getByRole('combobox', { name: '核心子学科' }).selectOption('atlas:geometry'); await idle();
  await page.screenshot({ path: directory + '/continuous-geometry.png', fullPage: true });
  assert.deepEqual(errors, []);
  checks.push('live reduced-motion preference finishes active motion and makes later navigation immediate');
  writeFileSync(directory + '/motion-acceptance.json', JSON.stringify({ status: 'passed', checks, errors, sampledZoomFrames: zoomFrames.length, sampledAreaFrames: areaFrames.length }, null, 2));
  console.log('MCS atlas motion: passed', checks);
} catch (error) {
  await page.screenshot({ path: directory + '/motion-failure.png', fullPage: true }).catch(() => {});
  throw error;
} finally { await browser.close(); await app.cleanup(); }
