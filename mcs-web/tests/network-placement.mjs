import { startTestServer, toggleInAnimatedPage } from './helpers.mjs';

import { PLAYWRIGHT_SPECIFIER as PLAYWRIGHT, CHROME_PATH as CHROME } from './browser-runtime.mjs';

const failures = [];
function check(name, condition, detail = '') {
  if (condition) console.log('  ✓ ' + name);
  else { failures.push(name + (detail ? ' :: ' + detail : '')); console.log('  ✗ ' + name + (detail ? ' :: ' + detail : '')); }
}

/**
 * 往知识网络里加节点时的自动摆位。
 *
 * 用户的要求：「自动做视觉优化，选择合适的位置把新增的节点放进去，使得新增节点不与原有的
 * 节点重叠，新增的关系尽可能少一点与已有的关系的交错。」
 *
 * 这一套在真浏览器里量三件事：
 * 1. 加完之后**没有任何两张卡片重叠**（含间隙）；
 * 2. 加新节点时**原有节点一个都不动**（否则不叫「放进去」，叫「重排」）；
 * 3. 摆位是**确定性**的：同一 URL 重新加载得到同一套坐标。
 * 另外核对页面确实拿到了优化统计（`__mcsPlacementInfo`：待摆节点、交叉数、最小间隙）。
 */
const NODE_W = 172;
const NODE_H = 58;

function overlapPairs(nodes, gapX = 0, gapY = 0) {
  const pairs = [];
  for (let i = 0; i < nodes.length; i += 1) {
    for (let j = i + 1; j < nodes.length; j += 1) {
      if (Math.abs(nodes[i].x - nodes[j].x) < NODE_W + gapX && Math.abs(nodes[i].y - nodes[j].y) < NODE_H + gapY) {
        pairs.push(`${nodes[i].id}~${nodes[j].id}`);
      }
    }
  }
  return pairs;
}

const readNodes = (page) => page.evaluate(() => {
  const info = window.__mcsPlacementInfo;
  const placed = (info?.placed ?? []).map((node) => ({ id: node.id, x: node.x, y: node.y }));
  return {
    placed,
    pending: info?.pending ?? [],
    // 优化只发生在「刚加入」的那一帧，因此读的是「最近一次」的记录。
    stats: info?.last?.stats ?? null,
    lastPending: info?.last?.pending ?? [],
    count: document.querySelectorAll('.network-node').length,
  };
});

/**
 * 等画布上的节点数达到预期。
 *
 * 不用固定 sleep：批量跑测试时机器负载高，300ms 的固定等待会偶尔不够，
 * 于是「自动摆位」套件单跑通过、连着跑失败（实测）。
 */
/**
 * 勾选「全部节点」面板里第 index 个复选框。
 *
 * 用共享的 `toggleInAnimatedPage`（TODO A5-35）：加节点之后相机会平滑居中（每帧重渲染整页），
 * Playwright 的可操作性检查会与它打架，实测报「Clicking the checkbox did not change its state」。
 * 帮助函数派发原生 click（React 的 onChange 照样触发），并核对状态**真的变了**——
 * 因此不会出现「点了没反应却断言通过」的假通过。各套件不再各自抄一遍这个绕法。
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

const server = await startTestServer();
let browser;
try {
  const { chromium } = await import(PLAYWRIGHT);
  browser = await chromium.launch({ executablePath: CHROME ?? undefined, headless: true });
  const page = await (await browser.newContext({ viewport: { width: 1500, height: 950 } })).newPage();
  const consoleErrors = [];
  page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text()); });
  page.on('pageerror', (error) => consoleErrors.push(error.message));

  // 从一个空网络开始，用「全部节点」面板勾选：这是最普通的加节点路径。
  await page.goto(server.origin + '/network', { waitUntil: 'networkidle' });
  await page.evaluate(() => localStorage.removeItem('mcs-network-placements-v1'));
  await page.goto(server.origin + '/network', { waitUntil: 'networkidle' });
  await page.waitForTimeout(700);
  await page.locator('input[aria-label="显示全部节点面板"]').check();
  await page.waitForTimeout(400);
  const panel = '.floating-panel[aria-label="全部节点"]';

  // 第一次：铺开 4 个节点（基线布局，不做增量优化）。
  const boxes = page.locator(`${panel} .network-node-list input[type="checkbox"]`);
  for (let index = 0; index < 4; index += 1) { await toggleNode(page, index); await waitForCount(page, index + 1); }
  const base = await readNodes(page);
  check('先铺开 4 个节点作为已有网络', base.placed.length === 4 && base.count === 4, JSON.stringify(base.placed.map((node) => node.id)));
  check('基线铺开时没有重叠', overlapPairs(base.placed).length === 0, JSON.stringify(overlapPairs(base.placed)));

  // 第二次：再加 3 个 —— 这一次必须走增量摆位。
  for (let index = 4; index < 7; index += 1) { await toggleNode(page, index); await waitForCount(page, index + 1); }
  await page.waitForTimeout(400);
  const grown = await readNodes(page);
  check('新增节点走的是增量摆位（有最近一次优化的统计）',
    grown.count === 7 && grown.stats !== null && grown.stats.crossings >= 0 && grown.lastPending.length >= 1,
    JSON.stringify({ count: grown.count, stats: grown.stats, lastPending: grown.lastPending }));
  check('加完之后没有任何两张卡片重叠',
    overlapPairs(grown.placed).length === 0, JSON.stringify(overlapPairs(grown.placed)));
  check('最小间隙非负（摆位报告与实测一致）',
    grown.stats !== null && grown.stats.minGap >= 0 && overlapPairs(grown.placed).length === 0,
    JSON.stringify(grown.stats));
  check('新增节点尽量贴着已有关系（交叉数不多于新节点数）',
    grown.stats !== null && grown.stats.crossings <= grown.lastPending.length,
    JSON.stringify({ crossings: grown.stats?.crossings, pending: grown.lastPending.length }));

  const before = new Map(base.placed.map((node) => [node.id, node]));
  const moved = grown.placed.filter((node) => {
    const previous = before.get(node.id);
    return previous && (Math.abs(previous.x - node.x) > 0.5 || Math.abs(previous.y - node.y) > 0.5);
  });
  check('原有节点一个都没动（是「放进去」不是「重排」）',
    moved.length === 0, JSON.stringify(moved));

  // 再补两个：仍然不重叠，且先前的 7 个都不动。
  for (let index = 7; index < 9; index += 1) { await toggleNode(page, index); await waitForCount(page, index + 1); }
  await page.waitForTimeout(400);
  const more = await readNodes(page);
  const movedAgain = more.placed.filter((node) => {
    const previous = grown.placed.find((item) => item.id === node.id);
    return previous && (Math.abs(previous.x - node.x) > 0.5 || Math.abs(previous.y - node.y) > 0.5);
  });
  check('继续加节点时仍然不重叠、已有节点仍然不动',
    more.count === 9 && overlapPairs(more.placed).length === 0 && movedAgain.length === 0,
    JSON.stringify({ count: more.count, overlaps: overlapPairs(more.placed), moved: movedAgain.map((node) => node.id) }));

  // 确定性：同一 URL 重新加载得到同一套坐标。
  const url = page.url();
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);
  /**
   * 重新打开面板：面板的开合状态按「首次访问 / 再次访问」记在 localStorage 里，
   * 重新加载后是**收起**的（再次访问的默认），不打开就找不到列表里的复选框（实测超时）。
   */
  const openPanel = async () => {
    if ((await page.locator(panel).count()) === 0) {
      await page.locator('input[aria-label="显示全部节点面板"]').check();
      await page.waitForTimeout(400);
    }
  };
  await openPanel();
  const reloaded = await readNodes(page);
  const mismatch = more.placed.filter((node) => {
    const again = reloaded.placed.find((item) => item.id === node.id);
    return !again || Math.abs(again.x - node.x) > 0.5 || Math.abs(again.y - node.y) > 0.5;
  });
  check('同一 URL 重新加载得到同一套坐标（确定性）', mismatch.length === 0, JSON.stringify(mismatch));

  // 手动拖动仍然优先：拖一个节点之后，再加节点不会把它挪回去。
  const target = page.locator('.network-node').first();  const targetId = await target.getAttribute('data-node');
  const targetBox = await target.boundingBox();
  await page.mouse.move(targetBox.x + targetBox.width / 2, targetBox.y + targetBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(targetBox.x + targetBox.width / 2 + 160, targetBox.y + targetBox.height / 2 + 90, { steps: 8 });
  await page.mouse.up();
  await page.waitForTimeout(500);
  const dragged = await readNodes(page);
  const draggedNode = dragged.placed.find((node) => node.id === targetId);
  await openPanel();
  const boxesAfter = page.locator(`${panel} .network-node-list input[type="checkbox"]`);
  await toggleNode(page, 9);
  await waitForCount(page, 10);
  await page.waitForTimeout(300);
  const afterDrag = await readNodes(page);
  const draggedAfter = afterDrag.placed.find((node) => node.id === targetId);
  check('手动拖动的位置在之后加节点时保持不动',
    draggedNode && draggedAfter && Math.abs(draggedNode.x - draggedAfter.x) < 0.5 && Math.abs(draggedNode.y - draggedAfter.y) < 0.5,
    JSON.stringify({ before: draggedNode, after: draggedAfter }));
  check('拖动之后再新增节点也不重叠',
    overlapPairs(afterDrag.placed).length === 0, JSON.stringify(overlapPairs(afterDrag.placed)));

  /*
   * 「重新布局」（2026-10 加，TODO A2-12）。
   *
   * 第三十七轮的边界：自动摆位一旦写入就固定，想重排只能清空画布或删 localStorage——
   * 两个都不该是使用者的活。这一档核对按钮真的做了那件事，并且**只**做那件事：
   * 自动摆位清掉重算，手动拖过的节点**保持原位**；而「重置」只动相机、一个节点都不动。
   */
  const placementsBefore = await page.evaluate(() => JSON.parse(localStorage.getItem('mcs-network-placements-v1') ?? '{}'));
  const manualBefore = (await readNodes(page)).placed.find((node) => node.id === targetId) ?? null;
  await page.click('.network-zoom button:has-text("重新布局")');
  await page.waitForTimeout(900);
  const relayout = await page.evaluate((draggedId) => ({
    placements: JSON.parse(localStorage.getItem('mcs-network-placements-v1') ?? '{}'),
    overrides: JSON.parse(localStorage.getItem('mcs-network-positions-v1') ?? '{}'),
    notice: document.querySelector('.network-notice')?.textContent?.replace(/\s+/g, ' ').trim() ?? '',
    hud: document.querySelector('.network-hud-sub')?.textContent?.replace(/\s+/g, ' ').trim() ?? '',
    dragged: (window.__mcsPlacementInfo?.placed ?? []).find((item) => item.id === draggedId) ?? null,
    placed: (window.__mcsPlacementInfo?.placed ?? []).map((node) => ({ id: node.id, x: node.x, y: node.y })),
  }), targetId);
  const autoIdsBefore = Object.keys(placementsBefore).filter((id) => id !== targetId);
  const autoMoved = autoIdsBefore.filter((id) => {
    const before = placementsBefore[id];
    const after = relayout.placements[id];
    return !after || Math.abs(after.x - before.x) > 0.5 || Math.abs(after.y - before.y) > 0.5;
  });
  check('「重新布局」重算了自动摆位（至少一个自动摆放的节点换了位置）',
    autoIdsBefore.length > 0 && autoMoved.length > 0,
    JSON.stringify({ autoCount: autoIdsBefore.length, moved: autoMoved.length }));
  check('「重新布局」保留手动位置（拖过的那一个没被挪走）',
    Boolean(relayout.overrides[targetId]) && manualBefore !== null && relayout.dragged !== null
      && Math.abs(relayout.dragged.x - manualBefore.x) < 0.5 && Math.abs(relayout.dragged.y - manualBefore.y) < 0.5,
    JSON.stringify({ manualBefore, after: relayout.dragged, overrides: Object.keys(relayout.overrides) }));
  check('「重新布局」之后仍然没有重叠',
    overlapPairs(relayout.placed).length === 0, JSON.stringify(overlapPairs(relayout.placed)));
  check('动作有说明，并写清与「重置」的区别',
    relayout.notice.includes('重新布局') && relayout.notice.includes('原位'),
    relayout.notice);

  // 「重置」只动相机：点它之后节点坐标一个都不变。
  const beforeReset = (await readNodes(page)).placed;
  await page.click('.network-zoom button:has-text("重置")');
  await page.waitForTimeout(700);
  const afterReset = (await readNodes(page)).placed;
  const resetMoved = afterReset.filter((node) => {
    const previous = beforeReset.find((item) => item.id === node.id);
    return !previous || Math.abs(previous.x - node.x) > 0.5 || Math.abs(previous.y - node.y) > 0.5;
  });
  check('「重置」只复位视角：节点坐标一个都不变（与「重新布局」分工不同）',
    resetMoved.length === 0, JSON.stringify(resetMoved.map((node) => node.id)));

  check('自动摆位没有控制台错误', consoleErrors.length === 0, consoleErrors.join(' | '));
} finally {
  await browser?.close();
  await server.cleanup();
}

if (failures.length > 0) {
  console.error('\n自动摆位验收失败：\n- ' + failures.join('\n- '));
  process.exit(1);
}
console.log('\n自动摆位验收通过。');
