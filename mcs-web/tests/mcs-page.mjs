import assert from 'node:assert/strict';
import { mkdirSync } from 'node:fs';
import { startTestServer } from './helpers.mjs';
import { CHROME_PATH, PLAYWRIGHT_SPECIFIER } from './browser-runtime.mjs';
import { MCS_STORAGE_KEY } from '../shared/mcs-space.mjs';

const app = await startTestServer({ lean: { enabled: false } });
let browser;
try {
  const { chromium } = await import(PLAYWRIGHT_SPECIFIER);
  browser = await chromium.launch({ executablePath: CHROME_PATH ?? undefined, headless: true });
  const context = await browser.newContext({ viewport: { width: 1536, height: 1050 }, reducedMotion: 'reduce' });
  const page = await context.newPage(), errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  const payload = await (await fetch(app.origin + '/api/v2/ontology/mcs-view')).json(), data = payload.data;
  await page.goto(app.origin + '/mcs');
  await page.locator('[data-mcs-canvas]').waitFor();
  await page.waitForFunction(() => document.querySelectorAll('[data-mcs-kind="object"]').length > 40);
  assert.equal(await page.getByRole('link', { name: 'MCS', exact: true }).count(), 1);
  const firstObject = page.locator('[data-mcs-kind="object"]').filter({ has: page.locator('.mcs-node-label') }).first();
  const firstId = await firstObject.getAttribute('data-mcs-box');
  await firstObject.locator('.mcs-node-shape').click();
  await page.locator('.mcs-inspector h2').filter({ hasText: data.objects.find(o => o.id === firstId).title }).waitFor();
  await page.locator('.mcs-inspector').getByRole('button', { name: '关闭详情' }).click();
  assert(await page.locator('.mcs-viewport-caption').innerText().then(t => t.includes(String(data.objects.length))));
  const rootCount = await page.locator('[data-mcs-kind="object"]').count();
  const screenshot = async name => { mkdirSync('runtime/mcs-qa', { recursive: true }); await page.screenshot({ path: `runtime/mcs-qa/${name}.png`, fullPage: true }); };
  await screenshot('overview-desktop');
  await page.getByRole('button', { name: '群论尺度链 ↗', exact: true }).click();
  await page.locator('[data-mcs-region="obj:group:subdiscipline"]').waitFor();
  const zoom = page.getByRole('button', { name: '放大', exact: true });
  for (let i = 0; i < 7; i++) await zoom.click();
  await page.locator('[data-mcs-region="obj:group:topic"]').waitFor();
  await page.locator('[data-mcs-region="obj:group:unit"]').waitFor();
  assert(await page.locator('[data-mcs-box="obj:group:mul"]').count(), 'unit opens directly to registered atoms');
  assert(await page.locator('[data-mcs-box="obj:group:left-mul"]').count(), 'unit opens to molecules');
  await page.locator('.mcs-inspector').getByRole('button', { name: '聚焦对象', exact: true }).click();
  await screenshot('group-expanded');
  // Keyboard activation uses the same inspect action as a pointer click.
  await page.locator('[data-mcs-box="obj:group:left-mul"]').focus();
  await page.keyboard.press('Enter');
  await page.locator('.mcs-inspector h2').filter({ hasText: '左乘映射' }).waitFor();
  await page.locator('.mcs-inspector').getByRole('button', { name: '聚焦对象', exact: true }).click();
  await page.locator('[data-mcs-box="obj:group:left-mul#definition"]').waitFor();
  assert(await page.locator('[data-mcs-box="obj:group:left-mul#definition"] .katex').count(), 'registered formula renders through existing KaTeX presentation');
  await page.locator('.mcs-inspector').getByRole('link', { name: '完整对象与证据 ↗' }).click();
  await page.getByRole('link', { name: '← 返回 MCS 视图' }).click();
  await page.locator('[data-mcs-box="obj:group:left-mul#definition"]').waitFor();
  // Explicit auto mode releases manual focus choices before reverse zoom.
  await page.getByRole('button', { name: '自动尺度', exact: true }).click();
  const zoomOut = page.getByRole('button', { name: '缩小', exact: true });
  for (let i = 0; i < 22; i++) await zoomOut.click();
  assert.equal(await page.locator('[data-mcs-region]').count(), 0, 'reverse zoom collapses every small region');
  assert.equal(await page.locator('[data-mcs-kind="object"]').count(), rootCount);
  if (!await page.locator('.mcs-filters').count()) await page.getByRole('button', { name: '滤镜', exact: true }).click();
  await page.getByRole('checkbox', { name: '原子', exact: false }).check();
  assert.equal(await page.locator('[data-mcs-box="obj:group:mul"]').count(), 1, 'a scale filter reveals its matched leaf through context outlines');
  assert.equal(await page.locator('[data-mcs-box="obj:group:e"]').count(), 1);
  await page.getByRole('button', { name: '清除所有滤镜', exact: true }).click();
  const search = page.getByRole('searchbox', { name: '搜索对象与公式' });
  await search.fill('完全不存在的数学对象');
  await page.getByText('没有匹配的数学对象', { exact: true }).waitFor();
  await search.fill('obj:tdg:gradient');
  await page.locator('[data-mcs-box="obj:tdg:gradient"]').waitFor();
  await page.locator('[data-mcs-box="obj:tdg:gradient"]').dispatchEvent('dblclick');
  await page.locator('[data-mcs-box="obj:tdg:gradient#definition"]').waitFor();
  assert(await page.locator('.mcs-inspector').innerText().then(t => t.includes('此单元使用内部声明')));
  const gradient = page.locator('[data-mcs-region="obj:tdg:gradient"]');
  await screenshot('gradient-declaration');
  // Drag a region in actual screen coordinates, then ensure both parent and declaration move.
  await page.waitForTimeout(250);
  const grip = gradient.locator('.mcs-region-grip'), bounds = await grip.boundingBox();
  assert(bounds);
  const beforeDrag = await page.evaluate(key => JSON.parse(localStorage.getItem(key)), MCS_STORAGE_KEY);
  await page.mouse.move(bounds.x + Math.min(bounds.width / 2, 80), bounds.y + Math.min(bounds.height / 2, 15));
  await page.mouse.down(); await page.mouse.move(bounds.x + Math.min(bounds.width / 2, 80) + 45, bounds.y + Math.min(bounds.height / 2, 15) + 30, { steps: 8 }); await page.mouse.up();
  await page.waitForTimeout(250);
  const dragged = await page.evaluate(key => JSON.parse(localStorage.getItem(key)), MCS_STORAGE_KEY);
  assert.notDeepEqual(dragged.positions, beforeDrag.positions, 'manual layout saved');
  await page.getByRole('button', { name: '分享视图', exact: true }).click();
  const share = await page.getByRole('textbox', { name: '公共视图链接' }).inputValue();
  assert(share.includes('#mcs='));
  const other = await context.newPage(); await other.goto(share); await other.locator('[data-mcs-canvas]').waitFor();
  await other.waitForTimeout(250);
  const sharedState = await other.evaluate(key => JSON.parse(localStorage.getItem(key)), MCS_STORAGE_KEY);
  assert.deepEqual(sharedState.positions, dragged.positions); assert.equal(sharedState.filters.query, dragged.filters.query);
  await other.close();
  await page.reload(); await page.locator('[data-mcs-region="obj:tdg:gradient"]').waitFor();
  assert.equal(await search.inputValue(), 'obj:tdg:gradient');
  await page.getByRole('button', { name: '清除所有滤镜', exact: true }).click();
  await page.getByRole('button', { name: '适配视野', exact: true }).click();
  await page.locator('.mcs-inspector').getByRole('button', { name: '关闭详情' }).click();
  // Relation filtering changes edges, not the matched objects.
  const beforeFilter = await page.locator('.mcs-viewport-caption').innerText();
  await page.getByRole('checkbox', { name: '对偶', exact: true }).check();
  assert.equal(await page.locator('.mcs-viewport-caption').innerText(), beforeFilter);
  await page.getByRole('button', { name: '清除所有滤镜', exact: true }).click();
  await page.getByRole('button', { name: '关闭滤镜', exact: true }).click();
  const relation = page.locator('.mcs-edge-label').first();
  await relation.dispatchEvent('keydown', { key: 'Enter' });
  await page.locator('.mcs-inspector .content-relation').first().waitFor();
  assert(await page.locator('.mcs-inspector').innerText().then(t => t.includes('关系、条件与来源')));
  await page.locator('.mcs-inspector').getByRole('button', { name: '关闭详情' }).click();
  await page.goto(app.origin + '/en/mcs'); await page.locator('[data-mcs-canvas]').waitFor();
  await page.getByRole('button', { name: 'Group scale chain ↗', exact: true }).waitFor();
  assert(await page.locator('.i18n-pending').count(), 'Chinese object content marked untranslated');
  await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'reduce' });
  await screenshot('english-desktop');
  await page.setViewportSize({ width: 390, height: 844 });
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'mobile does not overflow');
  await page.getByRole('button', { name: 'Group scale chain ↗', exact: true }).click();
  const panel = await page.locator('.mcs-inspector').boundingBox(); assert(panel && panel.y > 250, 'mobile inspector is a bottom sheet');
  await screenshot('mobile');
  const animations = await page.evaluate(() => document.getAnimations().filter(a => a.playState === 'running').length);
  assert.equal(animations, 0, 'reduced-motion has no running animation');
  const touchContext = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, reducedMotion: 'reduce' });
  const touchPage = await touchContext.newPage();
  touchPage.on('pageerror', e => errors.push(e.message));
  await touchPage.goto(app.origin + '/mcs'); await touchPage.locator('[data-mcs-canvas]').waitFor();
  await touchPage.waitForTimeout(250);
  const canvasBounds = await touchPage.locator('[data-mcs-canvas]').boundingBox(), cdp = await touchContext.newCDPSession(touchPage);
  const cx = canvasBounds.x + canvasBounds.width / 2, cy = canvasBounds.y + canvasBounds.height * .4;
  const initialZoom = Number(await touchPage.locator('[data-mcs-canvas]').getAttribute('data-zoom'));
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: cx - 35, y: cy, id: 1 }, { x: cx + 35, y: cy, id: 2 }] });
  for (let d = 45; d <= 85; d += 10) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: cx - d, y: cy, id: 1 }, { x: cx + d, y: cy, id: 2 }] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  assert(Number(await touchPage.locator('[data-mcs-canvas]').getAttribute('data-zoom')) > initialZoom * 1.5, 'native two-finger pinch changes the camera');
  // CDP touchEnd can only lift the complete gesture, while real multitouch can
  // lift one contact. Exercise that transition through the same React pointer
  // handlers with an active-pointer fixture.
  const resumed = await touchPage.evaluate(() => {
    const svg = document.querySelector('[data-mcs-canvas]'), rect = svg.getBoundingClientRect();
    svg.setPointerCapture = () => {}; svg.releasePointerCapture = () => {}; svg.hasPointerCapture = () => false;
    const x = rect.left + rect.width / 2, y = rect.top + rect.height / 2;
    const fire = (type, pointerId, atX, atY, buttons) => svg.dispatchEvent(new PointerEvent(type, {
      bubbles: true, cancelable: true, pointerId, pointerType: 'touch', isPrimary: pointerId === 11,
      button: 0, buttons, clientX: atX, clientY: atY,
    }));
    fire('pointerdown', 11, x - 40, y, 1); fire('pointerdown', 12, x + 40, y, 1);
    fire('pointermove', 11, x - 65, y, 1); fire('pointermove', 12, x + 65, y, 1);
    fire('pointerup', 11, x - 65, y, 0);
    const before = Number(svg.getAttribute('data-camera-x'));
    fire('pointermove', 12, x + 130, y, 1); fire('pointerup', 12, x + 130, y, 0);
    return before;
  });
  await touchPage.waitForTimeout(50);
  const resumedCamera = Number(await touchPage.locator('[data-mcs-canvas]').getAttribute('data-camera-x'));
  assert(Math.abs(resumedCamera - resumed) > 30, `remaining finger resumes panning after a pinch: ${resumed} -> ${resumedCamera}`);
  await touchContext.close();
  const motionContext = await browser.newContext({ viewport: { width: 1366, height: 960 }, reducedMotion: 'no-preference' });
  const motionPage = await motionContext.newPage(); motionPage.on('pageerror', e => errors.push(e.message));
  await motionPage.goto(app.origin + '/mcs'); await motionPage.locator('[data-mcs-canvas]').waitFor();
  await motionPage.getByRole('button', { name: '群论尺度链 ↗', exact: true }).click();
  const motionRegion = motionPage.locator('[data-mcs-region="obj:group:subdiscipline"]'); await motionRegion.waitFor();
  await motionPage.waitForTimeout(280);
  const regionGrip = await motionRegion.locator('.mcs-region-grip').boundingBox(), regionBefore = await motionRegion.locator(':scope > rect').boundingBox();
  await motionPage.mouse.move(regionGrip.x + 20, regionGrip.y + 10); await motionPage.mouse.down();
  await motionPage.mouse.move(regionGrip.x + 65, regionGrip.y + 40);
  await motionPage.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  const regionDuring = await motionRegion.locator(':scope > rect').boundingBox();
  assert(Math.abs(regionDuring.x - regionBefore.x - 45) < 4 && Math.abs(regionDuring.y - regionBefore.y - 30) < 4, 'normal-motion dragging follows the pointer without transition lag');
  await motionPage.mouse.up();
  const wheelTarget = await motionPage.locator('[data-mcs-canvas]').boundingBox();
  await motionPage.mouse.move(wheelTarget.x + wheelTarget.width / 2, wheelTarget.y + wheelTarget.height / 2);
  const wheelBefore = Number(await motionPage.locator('[data-mcs-canvas]').getAttribute('data-zoom'));
  await motionPage.mouse.wheel(0, -90); await motionPage.waitForTimeout(280);
  assert(Number(await motionPage.locator('[data-mcs-canvas]').getAttribute('data-zoom')) > wheelBefore, 'native wheel zooms at the pointer');
  await motionContext.close();
  const regressionContext = await browser.newContext({ viewport: { width: 1366, height: 900 }, reducedMotion: 'reduce' });
  const regressionPage = await regressionContext.newPage();
  regressionPage.on('pageerror', e => errors.push(e.message));
  regressionPage.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  await regressionPage.goto(app.origin + '/mcs'); await regressionPage.locator('[data-mcs-canvas]').waitFor();
  await regressionPage.evaluate(() => localStorage.clear()); await regressionPage.reload();
  await regressionPage.locator('[data-mcs-canvas]').waitFor();
  await regressionPage.getByRole('button', { name: '群论尺度链 ↗', exact: true }).click();
  const scaleRoot = regressionPage.locator('[data-mcs-region="obj:group:subdiscipline"]');
  await scaleRoot.waitFor();
  const rootGrip = await scaleRoot.locator('.mcs-region-grip').boundingBox(); assert(rootGrip);
  // A real two-click sequence with human-scale delay must focus before the
  // inspector opens and shifts the canvas underneath the second click.
  await regressionPage.mouse.dblclick(rootGrip.x + Math.min(80, rootGrip.width / 2), rootGrip.y + 15, { delay: 120 });
  await regressionPage.locator('[data-mcs-region="obj:group:topic"]').waitFor();
  await regressionPage.locator('.mcs-inspector').getByRole('button', { name: '关闭详情' }).click();
  if (!await regressionPage.locator('.mcs-filters').count()) await regressionPage.getByRole('button', { name: '滤镜', exact: true }).click();
  await regressionPage.getByRole('checkbox', { name: /^原子/ }).check();
  await regressionPage.locator('[data-mcs-box="obj:group:mul"]').waitFor();
  // Adding another OR value makes an already matching parent selectable; it
  // must still stay open along the context path to the first matched child.
  await regressionPage.getByRole('checkbox', { name: /^单元/ }).check();
  assert.equal(await regressionPage.locator('[data-mcs-box="obj:group:mul"]').count(), 1, 'OR filter retains a previously matched descendant');
  await regressionPage.getByRole('button', { name: '清除所有滤镜', exact: true }).click();
  const regressionSearch = regressionPage.getByRole('searchbox', { name: '搜索对象与公式' });
  await regressionSearch.fill('obj:group:mul');
  await regressionPage.locator('[data-mcs-region="obj:group:unit"]').waitFor();
  await regressionPage.locator('[data-mcs-region="obj:group:unit"] .mcs-region-grip').click();
  await regressionPage.locator('.mcs-selection-action').getByRole('button', { name: '合拢当前对象', exact: true }).click();
  await regressionPage.locator('[data-mcs-box="obj:group:mul"]').waitFor({ state: 'detached' });
  await regressionPage.locator('.mcs-selection-action').getByRole('button', { name: '展开当前对象', exact: true }).click();
  await regressionPage.locator('[data-mcs-box="obj:group:mul"]').waitFor();
  await regressionPage.getByRole('button', { name: '清除所有滤镜', exact: true }).click();
  await regressionPage.locator('.mcs-inspector').getByRole('button', { name: '关闭详情' }).click();
  await regressionPage.getByRole('button', { name: '关闭滤镜', exact: true }).click();
  // Release outside the SVG. A later passive hover must not continue the old drag.
  const regressionCanvas = regressionPage.locator('[data-mcs-canvas]');
  const blank = await regressionPage.evaluate(() => {
    const svg = document.querySelector('[data-mcs-canvas]'), rect = svg.getBoundingClientRect();
    for (let iy = 2; iy < 10; iy++) for (let ix = 7; ix >= 2; ix--) {
      const x = rect.left + rect.width * ix / 10, y = rect.top + rect.height * iy / 10;
      const hit = document.elementFromPoint(x, y);
      if (hit && !hit.closest('[data-mcs-box]') && !hit.closest('button') &&
          x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) return { x, y, top: rect.top };
    }
    return null;
  }); assert(blank, 'found blank canvas point');
  await regressionPage.mouse.move(blank.x, blank.y); await regressionPage.mouse.down();
  await regressionPage.mouse.move(blank.x + 12, blank.y + 8);
  await regressionPage.mouse.move(blank.x + 24, blank.top - 8); await regressionPage.mouse.up();
  const cameraAfterRelease = await regressionCanvas.getAttribute('data-camera-x');
  await regressionPage.mouse.move(blank.x + 90, blank.y + 55); await regressionPage.waitForTimeout(80);
  assert.equal(await regressionCanvas.getAttribute('data-camera-x'), cameraAfterRelease, 'external release clears the camera drag');
  await regressionContext.close();
  assert.deepEqual(errors, []);
  console.log('passed: full M overview; local scale chain; atoms/molecules/declarations; reverse aggregation; filters; drag; detail return; local/share restore; relations; English; mobile; native pinch/wheel; normal/reduced motion; real double-click, OR paths, manual collapse and external release; no browser errors');
} finally { await browser?.close(); await app.cleanup(); }
