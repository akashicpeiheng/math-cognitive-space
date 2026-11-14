import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { startTestServer } from './helpers.mjs';
import { CHROME_PATH, PLAYWRIGHT_SPECIFIER } from './browser-runtime.mjs';

const app = await startTestServer({ lean: { enabled: false } });
const { chromium } = await import(PLAYWRIGHT_SPECIFIER);
const browser = await chromium.launch({ executablePath: CHROME_PATH ?? undefined, headless: true });
const errors = [], checks = [];
const directory = 'runtime/mcs-atlas-qa';
mkdirSync(directory, { recursive: true });
let active;
const watch = page => { page.on('pageerror', error => errors.push(error.message)); active = page; };
const ready = async page => {
  await page.locator('[data-mcs-atlas]').waitFor();
  await page.waitForFunction(() => document.querySelectorAll('[data-atlas-node]').length > 0);
};
const camera = page => page.locator('[data-mcs-atlas]').evaluate(el => ({
  x: Number(el.dataset.cameraX), y: Number(el.dataset.cameraY), scale: Number(el.dataset.zoom),
}));
const home = page => page.locator('.mcs-atlas-tools button').first().click();
const find = async (page, id, english = false) => {
  await page.getByRole('searchbox', { name: english ? 'Search the math map' : '搜索数学地图' }).fill(id);
  await page.locator('.mcs-atlas-results button').first().click();
};
const closeEnough = (a, b, epsilon = .02) => assert(Math.abs(a - b) < epsilon, `${a} differs from ${b}`);

try {
  const library = (await (await fetch(app.origin + '/api/v2/ontology/mcs-view')).json()).data;
  const object = library.objects.find(item => item.id === 'obj:tdg:jacobian') ?? library.objects.find(item => item.id === 'obj:tdg:derivative');
  assert(object, 'a known public object is available for the object-network round trip');
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce', colorScheme: 'light' });
  const page = await context.newPage(); watch(page);
  await page.goto(app.origin + '/mcs'); await ready(page);
  const initial = await camera(page);
  assert.equal(await page.locator('[data-mcs-canvas]').count(), 0, 'fresh route opens the atlas');
  const broad = page.locator('[data-atlas-depth="1"]');
  assert.equal(await broad.count(), 8, 'eight coarse navigation fields at full extent');
  assert.equal(await page.locator('[data-atlas-depth="2"]').count(), 0, 'small branches stay folded in overview');
  assert.equal(await page.locator('.mcs-atlas-canvas rect').count(), 0, 'the map contains no rectangular territory tiles');
  assert.equal(await page.locator('.mcs-atlas-region').count(), 8, 'continuous fields remain visible');
  await page.screenshot({ path: directory + '/overview-desktop.png', fullPage: true });
  assert.equal(await page.getByRole('combobox', { name: '核心子学科' }).inputValue(), 'atlas:analysis');
  await page.locator('[data-atlas-node="atlas:geometry"] button').click();
  assert.equal(await page.getByRole('combobox', { name: '核心子学科' }).inputValue(), 'atlas:geometry');
  closeEnough((await camera(page)).scale, initial.scale);
  assert.equal(await page.locator('[data-atlas-node="atlas:geometry"]').getAttribute('data-atlas-core'), 'true');
  assert.equal(await page.locator('[data-atlas-depth="2"]').count(), 0, 'recenter stays at the broad overview');
  await page.screenshot({ path: directory + '/geometry-centered.png', fullPage: true });
  await page.getByRole('button', { name: '交叉学科：代数几何', exact: true }).click();
  const intersection = page.getByRole('complementary', { name: '交叉学科内容' });
  assert((await intersection.innerText()).includes('多项式'));
  assert(await intersection.locator('a[href^="https://"]').count() > 0);
  await page.screenshot({ path: directory + '/intersection.png', fullPage: true });
  await intersection.getByRole('button', { name: '代数几何 →', exact: true }).click();
  assert((await camera(page)).scale > initial.scale);
  await page.getByRole('combobox', { name: '核心子学科' }).selectOption('atlas:analysis');
  checks.push('peripheral click recenters, core remains folded at full extent, boundary shows sourced crossing content and related navigation');
  await page.locator('[data-atlas-node="atlas:analysis"] button').click();
  assert((await camera(page)).scale > initial.scale * 1.1);
  assert.equal(await page.locator('[data-atlas-node="atlas:analysis"]').getAttribute('data-expanded'), 'true', 'fitting a field reveals its children');
  assert(await page.locator('[data-atlas-depth="2"] button').count() > 0);
  await page.screenshot({ path: directory + '/analysis-desktop.png', fullPage: true });
  await page.getByRole('button', { name: '返回上层', exact: true }).click();
  assert((await camera(page)).scale < initial.scale * 1.2);
  checks.push('coarse fields, proportional zoom, child reveal and parent navigation');

  const bounds = await page.locator('[data-mcs-atlas]').boundingBox();
  const anchor = { x: Math.round(bounds.x + bounds.width * .31) - bounds.x, y: Math.round(bounds.y + bounds.height * .42) - bounds.y };
  const beforeWheel = await camera(page);
  await page.mouse.move(bounds.x + anchor.x, bounds.y + anchor.y);
  await page.mouse.wheel(0, -100);
  await page.waitForFunction(scale => Number(document.querySelector('[data-mcs-atlas]').dataset.zoom) > scale, beforeWheel.scale);
  const afterWheel = await camera(page);
  closeEnough((anchor.x - beforeWheel.x) / beforeWheel.scale, (anchor.x - afterWheel.x) / afterWheel.scale);
  closeEnough((anchor.y - beforeWheel.y) / beforeWheel.scale, (anchor.y - afterWheel.y) / afterWheel.scale);
  const beforePan = await camera(page);
  await page.mouse.move(bounds.x + bounds.width * .5, bounds.y + bounds.height * .5);
  await page.mouse.down();
  await page.mouse.move(bounds.x + bounds.width * .5 + 82, bounds.y + bounds.height * .5 + 46, { steps: 8 });
  await page.mouse.up();
  const afterPan = await camera(page);
  assert(afterPan.x - beforePan.x > 60 && afterPan.y - beforePan.y > 30, 'drag pans without accidentally navigating a tile');
  closeEnough(afterPan.scale, beforePan.scale);
  await page.mouse.move(bounds.x + 20, bounds.y + 20);
  assert.deepEqual(await camera(page), afterPan, 'hover after release cannot keep dragging');
  await page.locator('[data-mcs-atlas]').focus(); await page.keyboard.press('+');
  assert((await camera(page)).scale > afterPan.scale);
  await page.keyboard.press('Home');
  assert((await camera(page)).scale < initial.scale * 1.2);
  checks.push('pointer-anchored wheel, drag release and keyboard zoom');

  await page.getByRole('combobox', { name: '核心子学科' }).selectOption('atlas:geometry');
  await find(page, object.id);
  await page.getByRole('button', { name: '打开对象与关系', exact: true }).waitFor();
  const beforeNetwork = await camera(page);
  await page.screenshot({ path: directory + '/jacobian-desktop.png', fullPage: true });
  await page.getByRole('button', { name: '打开对象与关系', exact: true }).click();
  await page.locator('[data-mcs-canvas]').waitFor();
  assert.equal(new URL(page.url()).searchParams.get('object'), object.id);
  await page.waitForFunction(title => document.querySelector('.mcs-inspector')?.textContent.includes(title), object.title);
  await page.goBack(); await ready(page);
  assert.equal(await page.getByRole('combobox', { name: '核心子学科' }).inputValue(), 'atlas:geometry');
  assert.deepEqual(await camera(page), beforeNetwork, 'Back restores the map camera');
  await page.reload(); await ready(page);
  assert.deepEqual(await camera(page), beforeNetwork, 'refresh restores the map camera');
  await page.getByRole('button', { name: '分享地图', exact: true }).click();
  const share = await page.getByRole('textbox', { name: '地图分享链接' }).inputValue();
  assert(new URL(share).hash.startsWith('#atlas='));
  assert.equal(JSON.parse(decodeURIComponent(new URL(share).hash.slice(7))).layout, 'field/4', 'share names the directional crossing layout version');
  const shared = await context.newPage(); watch(shared); await shared.goto(share); await ready(shared);
  assert.equal(await shared.getByRole('combobox', { name: '核心子学科' }).inputValue(), 'atlas:geometry', 'share restores a non-default core');
  assert.deepEqual(await camera(shared), beforeNetwork, 'fresh shared link preserves camera');
  await shared.close(); active = page;
  for (const layout of ['field/2', 'field/3']) {
    const oldView = JSON.parse(decodeURIComponent(new URL(share).hash.slice(7)));
    oldView.layout = layout; oldView.camera = { x: -9876, y: -9876, scale: 9 };
    const oldUrl = new URL(share); oldUrl.hash = `atlas=${encodeURIComponent(JSON.stringify(oldView))}`;
    const migrated = await context.newPage(); watch(migrated); await migrated.goto(oldUrl.href); await ready(migrated);
    assert.equal(await migrated.getByRole('combobox', { name: '核心子学科' }).inputValue(), 'atlas:geometry');
    closeEnough((await camera(migrated)).scale, initial.scale);
    assert.equal(await migrated.locator('[data-atlas-depth="2"]').count(), 0, 'old camera returns to overview while retaining the core');
    await migrated.close(); active = page;
  }
  await page.getByRole('button', { name: '关闭提示', exact: true }).click();
  await home(page);
  await page.getByRole('button', { name: '对象网络', exact: true }).click();
  await page.locator('[data-mcs-canvas]').waitFor();
  await page.getByRole('button', { name: '数学地图', exact: true }).click(); await ready(page);
  checks.push('object search, original network detail, Back, refresh and share restore');

  const mobile = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, reducedMotion: 'reduce', colorScheme: 'dark' });
  const phone = await mobile.newPage(); watch(phone); await phone.goto(app.origin + '/en/mcs'); await ready(phone);
  assert(await phone.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'no horizontal page overflow at 390px');
  const fill = await phone.locator('[data-mcs-atlas]').evaluate(svg => {
    const view = svg.getBoundingClientRect();
    const areas = [...svg.querySelectorAll('.mcs-atlas-region')].map(el => el.getBoundingClientRect());
    return areas.reduce((sum, b) => sum + b.width * b.height, 0) / (view.width * view.height);
  });
  assert(fill > .45, `portrait fields fill useful map space (${Math.round(fill * 100)}%)`);
  assert.equal(await phone.locator('[data-atlas-depth="1"] button').count(), 8, 'all peripheral fields have touch/keyboard entrances');
  await phone.locator('[data-atlas-node="atlas:topology"] button').tap();
  assert.equal(await phone.getByRole('combobox', { name: 'Central field' }).inputValue(), 'atlas:topology');
  await phone.getByRole('combobox', { name: 'Central field' }).selectOption('atlas:analysis');
  for (const core of ['analysis', 'algebra', 'geometry', 'topology', 'number-theory', 'discrete', 'probability-statistics', 'foundations-computation']) {
    await phone.getByRole('combobox', { name: 'Central field' }).selectOption(`atlas:${core}`);
    for (const crossing of await phone.locator('[data-atlas-crossing] button').all()) {
      await crossing.tap();
      await phone.getByRole('complementary', { name: 'Intersection details' }).waitFor();
      await phone.getByRole('button', { name: 'Close intersection', exact: true }).tap();
      assert.equal(await phone.getByRole('combobox', { name: 'Central field' }).inputValue(), `atlas:${core}`, 'a compact crossing must not tap through to a field');
    }
  }
  await phone.getByRole('combobox', { name: 'Central field' }).selectOption('atlas:analysis');
  await phone.screenshot({ path: directory + '/overview-mobile-dark-en.png', fullPage: true });
  const sharedPhone = await mobile.newPage(); watch(sharedPhone);
  await sharedPhone.goto(share); await ready(sharedPhone);
  assert.equal(await sharedPhone.getByRole('combobox', { name: '核心子学科' }).inputValue(), 'atlas:geometry');
  const sharedMobileCamera = await camera(sharedPhone);
  const sharedMobileBounds = await sharedPhone.locator('[data-mcs-atlas]').boundingBox();
  const sharedView = JSON.parse(decodeURIComponent(new URL(share).hash.slice(7)));
  const desktopCenter = { x: (sharedView.size.width / 2 - sharedView.camera.x) / sharedView.camera.scale, y: (sharedView.size.height / 2 - sharedView.camera.y) / sharedView.camera.scale };
  closeEnough((sharedMobileBounds.width / 2 - sharedMobileCamera.x) / sharedMobileCamera.scale, desktopCenter.y);
  closeEnough((sharedMobileBounds.height / 2 - sharedMobileCamera.y) / sharedMobileCamera.scale, desktopCenter.x);
  await sharedPhone.close(); active = phone;
  await phone.locator('[data-atlas-node="atlas:analysis"] button').tap();
  assert.equal(await phone.locator('[data-atlas-node="atlas:analysis"]').getAttribute('data-expanded'), 'true');
  await phone.screenshot({ path: directory + '/analysis-mobile-en.png', fullPage: true });
  await home(phone);
  const touchBounds = await phone.locator('[data-mcs-atlas]').boundingBox();
  const touchCenter = { x: touchBounds.x + touchBounds.width / 2, y: touchBounds.y + touchBounds.height / 2 };
  const beforePinch = await camera(phone);
  const cdp = await mobile.newCDPSession(phone);
  const touch = (id, dx) => ({ id, x: touchCenter.x + dx, y: touchCenter.y, radiusX: 2, radiusY: 2, force: 1 });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [touch(1, -35), touch(2, 35)] });
  for (let distance = 40; distance <= 80; distance += 10) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [touch(1, -distance), touch(2, distance)] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  assert((await camera(phone)).scale > beforePinch.scale * 1.5, 'native two-finger pinch magnifies the map');
  await find(phone, 'obj:tdg:gradient', true);
  await phone.getByRole('button', { name: 'Open object and relations', exact: true }).click();
  await phone.locator('[data-mcs-canvas]').waitFor();
  assert.equal(new URL(phone.url()).pathname, '/en/mcs');
  assert(await phone.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await phone.goBack(); await ready(phone);
  await phone.setViewportSize({ width: 844, height: 390 });
  await phone.waitForTimeout(250);
  assert(Number.isFinite((await camera(phone)).scale));
  assert(await phone.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  assert(await phone.locator('.mcs-atlas-tools').evaluate(el => el.getBoundingClientRect().bottom <= innerHeight), 'landscape map controls remain on screen');
  await phone.screenshot({ path: directory + '/mobile-landscape-en.png', fullPage: true });
  checks.push('390px portrait layout, every compact crossing touch target, English dark theme, native pinch, object entry and orientation change');
  await mobile.close();
  assert.deepEqual(errors, []);
  writeFileSync(directory + '/acceptance.json', JSON.stringify({ status: 'passed', checks, errors }, null, 2));
  console.log('MCS atlas browser: passed', checks);
} catch (error) {
  if (active && !active.isClosed()) await active.screenshot({ path: directory + '/failure.png', fullPage: true }).catch(() => {});
  throw error;
} finally {
  await browser.close(); await app.cleanup();
}
