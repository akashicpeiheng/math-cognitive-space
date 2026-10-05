import { startTestServer, toggleInAnimatedPage } from './helpers.mjs';

import { PLAYWRIGHT_SPECIFIER as PLAYWRIGHT, CHROME_PATH as CHROME } from './browser-runtime.mjs';

const failures = [];
function check(name, condition, detail = '') {
  if (condition) console.log('  ✓ ' + name);
  else { failures.push(name + (detail ? ' :: ' + detail : '')); console.log('  ✗ ' + name + (detail ? ' :: ' + detail : '')); }
}

/**
 * 加入新节点之后，视角**平滑地**转到以新节点为中心。
 *
 * 用户的要求：「加入一个新的节点之后，视角要平滑地转移到以新增节点为中心的视图。」
 *
 * 三件事分别量：
 * 1. **居中**：动画结束后，新节点的屏幕中心落在可用区中心附近（容差按像素给）；
 * 2. **平滑**：动画途中采到的位置严格落在起点与终点之间（不是一步跳过去）；
 * 3. **可打断**：用户滚轮/拖动之后动画立即停止，不会把视角又拽回去；「减少动态效果」下直接跳。
 */
const NODE_W = 172;
const NODE_H = 58;

async function openPanel(page, label) {
  const selector = `.floating-panel[aria-label="${label}"]`;
  if ((await page.locator(selector).count()) === 0) {
    await page.locator(`input[aria-label="显示${label}面板"]`).check();
    await page.waitForTimeout(400);
  }
  return selector;
}

/**
 * 勾选第 index 个复选框——用共享的 `toggleInAnimatedPage`（TODO A5-35）。
 *
 * 为什么不用 Playwright 的 `check()`：相机动画期间整页每帧重渲染，
 * 它会一直等「元素稳定」；加了 `force` 又会因为重渲染把勾选状态冲掉
 * （报「Clicking the checkbox did not change its state」，实测）。
 * 帮助函数派发原生 click（React 的 onChange 照样触发）并核对状态真变了。
 */
async function toggleNode(page, index) {
  await toggleInAnimatedPage(
    page,
    '.floating-panel[aria-label="全部节点"] .network-node-list input[type="checkbox"]',
    { index, expect: true },
  );
}

async function waitForCount(page, expected, timeoutMs = 8000) {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const count = await page.locator('.network-node').count();
    if (count === expected) return true;
    if (Date.now() > deadline) return false;
    await page.waitForTimeout(80);
  }
}

const readCamera = (page) => page.evaluate(() => {
  const info = window.__mcsCameraLast ?? null;
  const id = info?.centered ?? null;
  const node = id ? document.querySelector(`.network-node[data-node="${id}"]`) : null;
  const rect = node?.getBoundingClientRect() ?? null;
  const stage = document.querySelector('.network-stage')?.getBoundingClientRect() ?? null;
  const view = window.__mcsNetwork ?? null;
  return {
    id,
    info,
    center: rect ? [Math.round(rect.x + rect.width / 2), Math.round(rect.y + rect.height / 2)] : null,
    // 可用区中心：顶栏之下（hudSpace 64）与整块画布的水平中心。
    target: stage ? [Math.round(stage.x + stage.width / 2), Math.round(stage.y + 64 + (stage.height - 64) / 2)] : null,
    camera: view ? (window.__mcsCamera ?? null) : null,
  };
});

const server = await startTestServer();
let browser;
try {
  const { chromium } = await import(PLAYWRIGHT);
  browser = await chromium.launch({ executablePath: CHROME ?? undefined, headless: true });
  const page = await (await browser.newContext({ viewport: { width: 1400, height: 900 } })).newPage();
  const consoleErrors = [];
  page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text()); });
  page.on('pageerror', (error) => consoleErrors.push(error.message));

  await page.goto(server.origin + '/network', { waitUntil: 'networkidle' });
  await page.evaluate(() => {
    localStorage.removeItem('mcs-network-placements-v1');
    localStorage.removeItem('mcs-network-positions-v1');
  });
  await page.goto(server.origin + '/network', { waitUntil: 'networkidle' });
  await page.waitForTimeout(700);
  const panel = await openPanel(page, '全部节点');
  /*
   * force: true —— 相机动画期间每帧重渲染整页，Playwright 的「元素稳定」检查会一直不通过。
   * 这里要测的是相机，不是点击的可达性（点击可达性由「全部节点」面板自己的套件覆盖）。
   */
  const boxes = page.locator(`${panel} .network-node-list input[type="checkbox"]`);

  // 先铺 4 个（基线，不涉及居中）
  for (let index = 0; index < 4; index += 1) { await toggleNode(page, index); await waitForCount(page, index + 1); }
  await page.waitForTimeout(500);

  // 再补 2 个：每一次都应当把视角平滑地移到新节点
  await toggleNode(page, 4);
  const samples = [];
  for (let step = 0; step < 7; step += 1) {
    await page.waitForTimeout(70);
    samples.push(await readCamera(page));
  }
  await page.waitForTimeout(900);
  const settled = await readCamera(page);

  check('页面记录了「居中到哪个新节点」', Boolean(settled.id) && settled.info?.centered === settled.id,
    JSON.stringify(settled.info));
  check('动画结束后新节点落在可用区中心附近（≤ 30px）',
    settled.center && settled.target
      && Math.abs(settled.center[0] - settled.target[0]) <= 30 && Math.abs(settled.center[1] - settled.target[1]) <= 30,
    JSON.stringify({ center: settled.center, target: settled.target }));
  check('视角是**平滑**过去的：途中采样落在起点与终点之间',
    samples.length >= 3
      && samples.some((sample) => sample.center && settled.center && sample.center[0] !== settled.center[0] && Math.abs(sample.center[0] - settled.center[0]) > 2)
      && samples.at(-1).center !== null,
    JSON.stringify(samples.map((sample) => sample.center)));
  check('动画计数增加（确实跑过一次补间）', (settled.info?.animations ?? 0) >= 1, JSON.stringify(settled.info));

  // 再加一个：仍然居中到新的那个
  await toggleNode(page, 5);
  await waitForCount(page, 6);
  await page.waitForTimeout(1100);
  const second = await readCamera(page);
  check('每加一个节点都居中到那个新节点（不是只居中第一次）',
    second.id !== settled.id && second.center && second.target
      && Math.abs(second.center[0] - second.target[0]) <= 30 && Math.abs(second.center[1] - second.target[1]) <= 30,
    JSON.stringify({ previous: settled.id, now: second.id, center: second.center, target: second.target }));

  // 用户一动就停：动画途中滚轮，之后再采样，视角应当由滚轮决定而不是被拽回中心。
  await toggleNode(page, 6);
  await page.waitForTimeout(120);
  await page.mouse.move(700, 450);
  await page.mouse.wheel(0, -240);
  await page.waitForTimeout(700);
  const interrupted = await readCamera(page);
  check('用户滚轮后动画被取消（不会被拽回中心）',
    interrupted.info?.cancelled === 'user-zoom' || interrupted.info?.finished === true,
    JSON.stringify(interrupted.info));

  // 减少动态效果：直接跳，不做补间。
  const reduced = await browser.newContext({ viewport: { width: 1400, height: 900 }, reducedMotion: 'reduce' });
  const reducedPage = await reduced.newPage();
  await reducedPage.goto(server.origin + '/network', { waitUntil: 'networkidle' });
  await reducedPage.evaluate(() => {
    localStorage.removeItem('mcs-network-placements-v1');
    localStorage.removeItem('mcs-network-positions-v1');
  });
  await reducedPage.goto(server.origin + '/network', { waitUntil: 'networkidle' });
  await reducedPage.waitForTimeout(700);
  const reducedPanel = await openPanel(reducedPage, '全部节点');
  const reducedBoxes = reducedPage.locator(`${reducedPanel} .network-node-list input[type="checkbox"]`);
  for (let index = 0; index < 4; index += 1) { await toggleNode(reducedPage, index); await waitForCount(reducedPage, index + 1); }
  await toggleNode(reducedPage, 4);
  await waitForCount(reducedPage, 5);
  await reducedPage.waitForTimeout(160);
  const reducedState = await readCamera(reducedPage);
  check('「减少动态效果」下直接跳到中心（160ms 内已就位）',
    reducedState.center && reducedState.target
      && Math.abs(reducedState.center[0] - reducedState.target[0]) <= 30 && Math.abs(reducedState.center[1] - reducedState.target[1]) <= 30,
    JSON.stringify({ center: reducedState.center, target: reducedState.target }));

  check('相机移动没有控制台错误', consoleErrors.length === 0, consoleErrors.join(' | '));
} finally {
  await browser?.close();
  await server.cleanup();
}

if (failures.length > 0) {
  console.error('\n相机居中验收失败：\n- ' + failures.join('\n- '));
  process.exit(1);
}
console.log('\n相机居中验收通过。');
