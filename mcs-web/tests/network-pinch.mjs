/*
 * 知识网络：移动端双指缩放（2026-10-05）
 *
 * 背景：画布上原来只有**单指平移**——`panRef` 只记得住一个 pointerId，第二根手指落下会把起点
 * 覆盖掉，于是「两指一捏」表现为画面乱跳；而 `.network-canvas-full` 的 `touch-action: none`
 * 又把浏览器原生缩放关掉了（平移必须如此）。两者相加的结果是：移动端在画布上**没有任何缩放手段**。
 *
 * 一并修的还有窄屏的坐标系：`viewBox` 原来按 **stage** 的尺寸写，而窄屏的 stage 是整页那么高
 * （手机实测 2597px）——`preserveAspectRatio` 再把整张图缩进 46vh 的画布，
 * 结果 CTM 只有 0.1487、节点 28×10px（见 VALIDATION 第八十四轮）。相机几何改用画布元素量。
 *
 * 这一套按真实的双指触摸核对六件事（CDP `Input.dispatchTouchEvent`，pointerType 就是 touch，
 * 不用合成的 PointerEvent 假装）：
 *   1. 两指张开 → 放大，缩放比 = 两指距离比，且**起始中点下的世界点始终待在中点下**；
 *   2. 两指捏合 → 缩小，并停在 25% 的下限上；
 *   3. 两指保持间距整体移动 → 只平移，缩放不变；
 *   4. 第一根手指落在节点上、第二根随后落下 → 走缩放，不拖节点、不弹强关联选择器、不开详情；
 *   5. 单指平移照旧（没有被双指手势抢掉）；
 *   6. 双指手势结束后剩下的那根手指还能接着平移。
 */
import { startTestServer } from './helpers.mjs';
import { PLAYWRIGHT_SPECIFIER as PLAYWRIGHT, CHROME_PATH as CHROME } from './browser-runtime.mjs';

const failures = [];
function check(name, condition, detail = '') {
  if (condition) console.log('  ✓ ' + name);
  else { failures.push(name + (detail ? ' :: ' + detail : '')); console.log('  ✗ ' + name + (detail ? ' :: ' + detail : '')); }
}

const NODES = 'dg:homeomorphism,dg:manifold';
const ZOOM_MIN = 0.25;
const ZOOM_MAX = 3;

const server = await startTestServer();
let browser;
try {
  const { chromium } = await import(PLAYWRIGHT);
  browser = await chromium.launch({ executablePath: CHROME ?? undefined, headless: true });
  // 手机尺寸 + 触摸：这一套要修的正是这类设备。
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2,
  });
  const page = await context.newPage();
  const consoleErrors = [];
  page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text()); });
  page.on('pageerror', (error) => consoleErrors.push(error.message));

  const cdp = await context.newCDPSession(page);
  const touchStart = (points) => cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: points });
  const touchMove = (points) => cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: points });
  /** CDP 的语义：`touchEnd` 列出的点是**被抬起**的那些（实测，见验收记录）。 */
  const touchLift = (points) => cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: points });
  const touchEndAll = () => cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });

  /**
   * 相机与几何读数。
   *
   * - `x / y / scale` 由画布上的 `data-*` 给出（见 NetworkPage 的注释）；
   * - `ctm` 是 `<svg>` 的屏幕变换（`viewBox` 缩放，不含相机），用它把屏幕坐标换成用户坐标；
   * - `empty` 是画布内一个**不落在节点/按钮/悬浮框上**的点，且离画布各边 ≥110px，
   *   供「两指张开到 ±76px」这样的手势使用（否则手指会跑出画布）。
   */
  const readGeom = () => page.evaluate(() => {
    const canvas = document.querySelector('.network-canvas-full');
    const rect = canvas.getBoundingClientRect();
    const ctm = canvas.querySelector('svg').getScreenCTM();
    const blocking = '.network-node, button, a, .floating-panel, input, select, textarea, label';
    const margin = 110;
    let empty = null;
    for (const fx of [0.3, 0.5, 0.7, 0.2, 0.8]) {
      for (const fy of [0.2, 0.35, 0.5, 0.65, 0.8]) {
        const x = rect.left + rect.width * fx;
        const y = rect.top + rect.height * fy;
        if (x - rect.left < margin || rect.right - x < margin) continue;
        if (y - rect.top < margin - 60 || rect.bottom - y < margin - 60) continue;
        const hit = document.elementFromPoint(x, y);
        if (hit && !hit.closest(blocking)) { empty = { x: Math.round(x), y: Math.round(y) }; break; }
      }
      if (empty) break;
    }
    return {
      x: Number(canvas.dataset.cameraX),
      y: Number(canvas.dataset.cameraY),
      zoom: Number(canvas.dataset.zoom),
      zoomLabel: document.querySelector('.network-zoom-value')?.textContent ?? null,
      ctm: { a: ctm.a, d: ctm.d, e: ctm.e, f: ctm.f },
      canvas: { left: rect.left, top: rect.top, width: rect.width, height: rect.height },
      empty,
    };
  });

  /** 屏幕坐标 → 用户坐标（与相机 x / y 同一个空间）。 */
  const toUser = (geom, point) => ({
    x: (point.x - geom.ctm.e) / geom.ctm.a,
    y: (point.y - geom.ctm.f) / geom.ctm.d,
  });

  /** 「中点下的世界点没动」：返回预测位置与当前中点的偏差（用户单位 ≈ 像素）。 */
  const anchorDrift = (before, after, midUser) => {
    const worldX = (midUser.x - before.x) / before.zoom;
    const worldY = (midUser.y - before.y) / before.zoom;
    return Math.hypot(worldX * after.zoom + after.x - midUser.x, worldY * after.zoom + after.y - midUser.y);
  };

  const openPage = async () => {
    await page.goto(server.origin + '/network?nodes=' + encodeURIComponent(NODES), { waitUntil: 'networkidle' });
    await page.waitForSelector('.network-node');
    // fitView 是平滑动画，等它走完再取基准读数。
    await page.waitForTimeout(900);
  };

  await openPage();
  const base = await readGeom();
  check('窄屏画布的用户单位 ≈ CSS 像素（viewBox 按画布量，1:1 相机模型才成立）',
    Math.abs(base.ctm.a - 1) <= 0.02 && Math.abs(base.canvas.width - Number((await page.evaluate(() => document.querySelector('.network-canvas-full svg').getAttribute('viewBox').split(' ')[2])))) <= 1,
    JSON.stringify({ ctmScale: Number(base.ctm.a.toFixed(4)), canvasWidth: Math.round(base.canvas.width) }));
  check('画布上能找到一块没被节点/面板占住的落点（手势测试的基准点）',
    Boolean(base.empty), JSON.stringify(base.empty));

  const mid = base.empty ?? { x: Math.round(base.canvas.left + base.canvas.width / 2), y: Math.round(base.canvas.top + base.canvas.height / 2) };
  const midUser = toUser(base, mid);

  // ---- 1. 两指张开 = 放大，中点下的世界点不动 ----
  const half0 = 34;
  const half1 = 76;
  await touchStart([{ x: mid.x - half0, y: mid.y, id: 1 }, { x: mid.x + half0, y: mid.y, id: 2 }]);
  for (let step = 1; step <= 6; step += 1) {
    const half = half0 + (half1 - half0) * (step / 6);
    await touchMove([{ x: mid.x - half, y: mid.y, id: 1 }, { x: mid.x + half, y: mid.y, id: 2 }]);
    await page.waitForTimeout(35);
  }
  const spread = await readGeom();
  await touchEndAll();
  await page.waitForTimeout(150);
  const expectedSpread = Math.min(ZOOM_MAX, base.zoom * (half1 / half0));
  check('两指张开就放大（缩放比 = 两指距离比）',
    Math.abs(spread.zoom - expectedSpread) <= 0.08 && spread.zoom > base.zoom + 0.1,
    JSON.stringify({ base: base.zoom, got: spread.zoom, expected: Number(expectedSpread.toFixed(4)) }));
  check('放大以两指中点为不动点（中点下的世界点没有漂）',
    anchorDrift(base, spread, midUser) <= 2.5,
    `drift=${anchorDrift(base, spread, midUser).toFixed(2)}px`);
  check('HUD 的百分比跟着手势走',
    spread.zoomLabel === `${Math.round(spread.zoom * 100)}%`,
    JSON.stringify({ label: spread.zoomLabel, zoom: spread.zoom }));

  // ---- 2. 两指捏合 = 缩小，且不越过 25% ----
  const beforeSqueeze = spread;
  const squeezeFrom = toUser(beforeSqueeze, mid);
  await touchStart([{ x: mid.x - half1, y: mid.y, id: 1 }, { x: mid.x + half1, y: mid.y, id: 2 }]);
  for (let step = 1; step <= 8; step += 1) {
    const half = Math.max(7, half1 - (half1 - 7) * (step / 8));
    await touchMove([{ x: mid.x - half, y: mid.y, id: 1 }, { x: mid.x + half, y: mid.y, id: 2 }]);
    await page.waitForTimeout(35);
  }
  const squeezed = await readGeom();
  await touchEndAll();
  await page.waitForTimeout(150);
  check('两指捏合就缩小，并停在 25% 的下限上（不越界）',
    squeezed.zoom < beforeSqueeze.zoom && Math.abs(squeezed.zoom - ZOOM_MIN) <= 0.02,
    JSON.stringify({ from: beforeSqueeze.zoom, to: squeezed.zoom, min: ZOOM_MIN }));
  check('缩小同样以两指中点为不动点',
    anchorDrift(beforeSqueeze, squeezed, squeezeFrom) <= 2.5,
    `drift=${anchorDrift(beforeSqueeze, squeezed, squeezeFrom).toFixed(2)}px`);

  // ---- 3. 两指保持间距整体移动 = 只平移 ----
  await openPage();
  const panBase = await readGeom();
  const panMid = panBase.empty ?? mid;
  const span = 50;
  await touchStart([{ x: panMid.x - span, y: panMid.y, id: 1 }, { x: panMid.x + span, y: panMid.y, id: 2 }]);
  for (let step = 1; step <= 5; step += 1) {
    const dx = 40 * (step / 5);
    const dy = 24 * (step / 5);
    await touchMove([
      { x: panMid.x - span + dx, y: panMid.y + dy, id: 1 },
      { x: panMid.x + span + dx, y: panMid.y + dy, id: 2 },
    ]);
    await page.waitForTimeout(35);
  }
  const twoFingerPan = await readGeom();
  await touchEndAll();
  await page.waitForTimeout(150);
  const movedX = twoFingerPan.x - panBase.x;
  const movedY = twoFingerPan.y - panBase.y;
  // 手指走的是 CSS 像素，相机走的是用户单位：两者之比就是 CTM 的缩放（窄屏≈1）。
  check('两指整体移动只平移：缩放不变、相机跟着手指走',
    Math.abs(twoFingerPan.zoom - panBase.zoom) <= 0.005
    && Math.abs(movedX - 40 / panBase.ctm.a) <= 12 && Math.abs(movedY - 24 / panBase.ctm.d) <= 12,
    JSON.stringify({ zoom: [panBase.zoom, twoFingerPan.zoom], moved: [Math.round(movedX), Math.round(movedY)] }));

  // ---- 4. 第一根手指落在节点上，第二根随后落下 → 缩放优先，不拖节点、不弹选择器 ----
  await openPage();
  const nodeBox = await page.locator('.network-node').first().boundingBox();
  const nodeId = await page.locator('.network-node').first().getAttribute('data-node');
  const nodePoint = { x: Math.round(nodeBox.x + nodeBox.width / 2), y: Math.round(nodeBox.y + nodeBox.height / 2) };
  const nodeBefore = await page.evaluate(() => ({
    placed: (window.__mcsPlacementInfo?.placed ?? []).map((node) => `${node.id}@${node.x},${node.y}`).join('|'),
    stored: localStorage.getItem('mcs-network-positions-v1') ?? '',
  }));
  const onNodeBase = await readGeom();
  await touchStart([{ x: nodePoint.x, y: nodePoint.y, id: 1 }]);
  // 落在触摸档（500ms）之内就加第二根手指：这一下必须判成缩放，而不是长按/拖动。
  await page.waitForTimeout(120);
  await touchStart([{ x: nodePoint.x, y: nodePoint.y, id: 1 }, { x: nodePoint.x + 90, y: nodePoint.y + 50, id: 2 }]);
  for (let step = 1; step <= 6; step += 1) {
    await touchMove([
      { x: nodePoint.x, y: nodePoint.y, id: 1 },
      { x: nodePoint.x + 90 + 14 * step, y: nodePoint.y + 50 + 8 * step, id: 2 },
    ]);
    await page.waitForTimeout(35);
  }
  const nodeStretch = await readGeom();
  const nodeAfter = await page.evaluate(() => ({
    placed: (window.__mcsPlacementInfo?.placed ?? []).map((node) => `${node.id}@${node.x},${node.y}`).join('|'),
    stored: localStorage.getItem('mcs-network-positions-v1') ?? '',
    picking: document.querySelector('.network-stage')?.classList.contains('is-picking') ?? false,
    candidates: document.querySelectorAll('.pick-candidate').length,
    detail: document.querySelectorAll('.floating-panel[aria-label="节点详情"]').length,
  }));
  await touchEndAll();
  await page.waitForTimeout(200);
  check('手指落在节点上再添第二指：仍然缩放，不拖节点、不弹选择器、不开详情',
    nodeStretch.zoom > onNodeBase.zoom + 0.1 && !nodeAfter.picking && nodeAfter.candidates === 0
    && nodeAfter.detail === 0 && nodeAfter.placed === nodeBefore.placed && nodeAfter.stored === nodeBefore.stored,
    JSON.stringify({ id: nodeId, zoom: [onNodeBase.zoom, nodeStretch.zoom], picking: nodeAfter.picking, candidates: nodeAfter.candidates, detail: nodeAfter.detail, placedChanged: nodeAfter.placed !== nodeBefore.placed }));

  // ---- 5. 单指平移照旧 ----
  await openPage();
  const singleBase = await readGeom();
  const singleMid = singleBase.empty ?? mid;
  await touchStart([{ x: singleMid.x, y: singleMid.y, id: 1 }]);
  for (let step = 1; step <= 5; step += 1) {
    await touchMove([{ x: singleMid.x - 12 * step, y: singleMid.y - 8 * step, id: 1 }]);
    await page.waitForTimeout(35);
  }
  const singlePan = await readGeom();
  await touchEndAll();
  await page.waitForTimeout(150);
  check('单指平移没有被双指手势抢掉',
    Math.abs(singlePan.zoom - singleBase.zoom) <= 0.005 && singlePan.x < singleBase.x - 8,
    JSON.stringify({ zoom: [singleBase.zoom, singlePan.zoom], dx: Math.round(singlePan.x - singleBase.x) }));

  // ---- 6. 双指结束后剩下的那根手指还能接着平移 ----
  await openPage();
  const handoffBase = await readGeom();
  const handoffMidPoint = handoffBase.empty ?? mid;
  await touchStart([{ x: handoffMidPoint.x - span, y: handoffMidPoint.y, id: 1 }, { x: handoffMidPoint.x + span, y: handoffMidPoint.y, id: 2 }]);
  await touchMove([{ x: handoffMidPoint.x - span - 20, y: handoffMidPoint.y, id: 1 }, { x: handoffMidPoint.x + span, y: handoffMidPoint.y, id: 2 }]);
  await page.waitForTimeout(50);
  // 抬起**第一根**手指（CDP 的 touchEnd 列出的就是被抬起的点），剩下第二根继续拖。
  await touchLift([{ x: handoffMidPoint.x - span - 20, y: handoffMidPoint.y, id: 1 }]);
  await page.waitForTimeout(80);
  const handoffMid = await readGeom();
  for (let step = 1; step <= 5; step += 1) {
    await touchMove([{ x: handoffMidPoint.x + span - 12 * step, y: handoffMidPoint.y, id: 2 }]);
    await page.waitForTimeout(35);
  }
  const handoffEnd = await readGeom();
  await touchEndAll();
  await page.waitForTimeout(150);
  check('双指结束后剩下的一根手指还能接着平移（不用把手全抬起来重按）',
    handoffEnd.x < handoffMid.x - 8 && Math.abs(handoffEnd.zoom - handoffMid.zoom) <= 0.01,
    JSON.stringify({ dx: Math.round(handoffEnd.x - handoffMid.x), zoom: [handoffMid.zoom, handoffEnd.zoom], startZoom: handoffBase.zoom }));

  check('知识网络双指缩放没有控制台错误', consoleErrors.length === 0, consoleErrors.slice(0, 3).join(' | '));
} finally {
  await browser?.close();
  await server.cleanup();
}

if (failures.length > 0) {
  console.error('\n移动端双指缩放验收失败：\n- ' + failures.join('\n- '));
  process.exit(1);
}
console.log('\n移动端双指缩放验收通过。');
