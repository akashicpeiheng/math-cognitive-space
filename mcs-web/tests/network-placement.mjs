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
  /*
   * 拖哪一个：**挑一个真的点得到的节点**（2026-10-11 修）。
   *
   * 原来固定取 DOM 序里的第一个，那是个偶然的依赖：画布是整屏浮层版式，
   * 顶部 HUD 与左右悬浮框都压在画布上，而适配只保证「内容落在它们**之间**的可用区」——
   * 面板是**之后**才打开的，适配时并不知道它会盖住哪一片。于是同一个页面，
   * HUD 高一点、或者内容按可用区重心挪一点，第一个节点就可能落到面板底下，
   * `page.mouse.down()` 点在面板上，拖动静默失败（实测两种都踩过：先是 HUD，后是面板）。
   *
   * 判据用 `elementFromPoint`：节点中心那一点确实命中这个节点（或它的子元素）。
   * 这**不是放宽**断言——拖动的三条断言一条没动，只是让「拖哪一个」不再依赖版面巧合；
   * 万一一个可拖的节点都没有，这里会红，而不是静默跳过。
   */
  const pickDraggable = () => page.evaluate(() => {
    for (const node of document.querySelectorAll('.network-node')) {
      const rect = node.getBoundingClientRect();
      const x = rect.x + rect.width / 2;
      const y = rect.y + rect.height / 2;
      if (x < 0 || y < 0 || x > window.innerWidth || y > window.innerHeight) continue;
      const hit = document.elementFromPoint(x, y);
      if (hit && node.contains(hit)) return node.getAttribute('data-node');
    }
    return null;
  });
  const targetId = await pickDraggable();
  check('画布上至少有一个可以直接拖动的节点（不被 HUD 与悬浮框盖住）', Boolean(targetId), String(targetId));
  const target = page.locator(`.network-node[data-node="${targetId}"]`);
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

  /*
   * ---- 拖动时的斥力（2026-10-15 加）----
   *
   * 用户的要求：「拖动节点使其与另一个节点靠近的时候会有闪的情况，是因为之前写的避免节点遮挡的逻辑，
   * 现在改进为节点被拖动的时候会因为斥力相互挤压而不至于出现闪的情况。」
   *
   * 「闪」在旧实现里量得出来：**放手时**才做避让（螺线搜索找空位），把卡片拖到邻座中心再松手，
   * 它当场下移 128px、再飘 31px；有序摆位还会在拖动中把别的卡片跟着重算（实测 23 步里有 5 步在动）。
   * 现在拖动中每帧做斥力（拖动者不动、被压住的让开一点点），放手只是一次确认。
   *
   * 这一段在**干净的场景**里量（另开一张小图）：前面那些手动位置会让「谁被挤开」不可预期，
   * 而这里要断言的正是「被挤开的那一张到底动了多少」。四件事：
   * ① 放手不跳；② 邻座是**连续**被挤开的（单步位移小、总位移够）；③ 全程没有残留重叠；
   * ④ 有序摆位下拖动中远处的卡片一个都不动（布局冻结，不再整片重排）。
   */
  const cleanIds = await page.evaluate(() => [...document.querySelectorAll('.network-node')]
    .map((node) => node.dataset.node).filter((id) => !id.startsWith('note:')).slice(0, 6));
  await page.goto(server.origin + '/network?nodes=' + encodeURIComponent(cleanIds.join(',')), { waitUntil: 'networkidle' });
  await page.waitForFunction((count) => document.querySelectorAll('.network-node').length === count, cleanIds.length);
  for (const label of ['显示全部节点面板', '显示推荐加入面板']) {
    const input = page.locator(`input[aria-label="${label}"]`);
    if (await input.count()) await input.uncheck().catch(() => {});
  }
  await page.waitForTimeout(700);

  const readWorld = () => page.evaluate(() => Object.fromEntries([...document.querySelectorAll('.network-node')].map((node) => {
    const match = /translate\((-?[\d.]+),(-?[\d.]+)\)/.exec(node.getAttribute('transform') ?? '');
    return [node.dataset.node, { id: node.dataset.node, x: Number(match[1]), y: Number(match[2]) }];
  })));

  /** 挑一对「拖得动、且点得到」的节点：A 拖向 B（与上面那段拖动同一套 `elementFromPoint` 判据）。 */
  const pickPair = () => page.evaluate(() => {
    const boxes = [...document.querySelectorAll('.network-node')].map((node) => ({ id: node.dataset.node, rect: node.getBoundingClientRect() }));
    const hits = (rect) => Boolean(document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2)?.closest('.network-node'));
    for (const source of boxes) {
      if (!hits(source.rect)) continue;
      const target = boxes.filter((item) => item.id !== source.id && hits(item.rect))
        .sort((a, b) => Math.hypot(a.rect.x - source.rect.x, a.rect.y - source.rect.y) - Math.hypot(b.rect.x - source.rect.x, b.rect.y - source.rect.y))[0];
      if (target) return { source, target };
    }
    return null;
  });

  const dragOnto = async (pair, steps) => {
    const from = { x: pair.source.rect.x + pair.source.rect.width / 2, y: pair.source.rect.y + pair.source.rect.height / 2 };
    const to = { x: pair.target.rect.x + pair.target.rect.width / 2, y: pair.target.rect.y + pair.target.rect.height / 2 };
    await page.mouse.move(from.x, from.y);
    await page.mouse.down();
    const track = [];
    let frozenDuring = '';
    for (let index = 1; index <= steps; index += 1) {
      const t = index / steps;
      await page.mouse.move(from.x + (to.x - from.x) * t, from.y + (to.y - from.y) * t);
      await page.waitForTimeout(55);
      track.push(await readWorld());
      // 布局本身（不含拖动层）必须在**松手之前**读，否则读到的已经是落位后的那一份。
      frozenDuring = await page.evaluate(() => JSON.stringify(window.__mcsNetwork?.columns ?? []));
    }
    await page.mouse.up();
    await page.waitForTimeout(600);
    return { track, frozenDuring, settled: await readWorld() };
  };

  const pair = await pickPair();
  check('斥力用例：找得到一对可拖动的节点', pair !== null, JSON.stringify(pair?.source?.id ?? null));
  let pushedAppart = 0;
  if (pair) {
    const before = await readWorld();
    const { track, settled } = await dragOnto(pair, 12);
    const draggedBeforeUp = track[track.length - 1][pair.source.id];
    const targetTrack = track.map((frame) => frame[pair.target.id]).filter(Boolean);
    const first = targetTrack[0];
    const last = targetTrack[targetTrack.length - 1];
    pushedAppart = Math.hypot(last.x - first.x, last.y - first.y);
    let maxStep = 0;
    for (let index = 1; index < targetTrack.length; index += 1) {
      maxStep = Math.max(maxStep, Math.hypot(targetTrack[index].x - targetTrack[index - 1].x, targetTrack[index].y - targetTrack[index - 1].y));
    }
    check('斥力用例：松手不再跳位（落点与松手前一帧一致）',
      Math.hypot(settled[pair.source.id].x - draggedBeforeUp.x, settled[pair.source.id].y - draggedBeforeUp.y) < 1.5,
      JSON.stringify({ 松手前: draggedBeforeUp, 稳定后: settled[pair.source.id] }));
    check('邻座被斥力挤开，而且是连续的（单步位移不超过卡片高度的一半）',
      pushedAppart >= 40 && maxStep <= NODE_H / 2,
      JSON.stringify({ 总位移: Math.round(pushedAppart), 单步最大: Math.round(maxStep * 10) / 10 }));
    check('挤开之后没有任何两张卡片重叠',
      overlapPairs(Object.values(settled)).length === 0, JSON.stringify(overlapPairs(Object.values(settled))));
    check('被挤开的那一张与拖动者之间留出了缝（不是刚好贴住）',
      Math.abs(last.x - settled[pair.source.id].x) >= NODE_W + 8 || Math.abs(last.y - settled[pair.source.id].y) >= NODE_H + 6,
      JSON.stringify({ 被挤开: last, 拖动者: settled[pair.source.id] }));
    check('拖动前后没有凭空多出/少掉卡片',
      Object.keys(before).length === Object.keys(settled).length,
      JSON.stringify({ before: Object.keys(before).length, after: Object.keys(settled).length }));
  }

  // 有序摆位：拖动中布局**冻结**（debug 钩子里的 columns 是布局本身，不含拖动层）。
  const modeSelect = page.locator('.network-zoom select').first();
  if (await modeSelect.count()) {
    await modeSelect.selectOption({ label: '学习顺序' });
    await page.waitForTimeout(900);
    const orderedPair = await pickPair();
    if (orderedPair) {
      const frozenBefore = await page.evaluate(() => JSON.stringify(window.__mcsNetwork?.columns ?? []));
      const beforeOrdered = await readWorld();
      const { track, frozenDuring, settled } = await dragOnto(orderedPair, 10);
      const duringOrdered = track[track.length - 1];
      check('有序摆位下拖动中布局本身没有重算（整片重排被冻结）',
        frozenBefore === frozenDuring && frozenBefore !== '[]',
        JSON.stringify({ same: frozenBefore === frozenDuring, length: frozenBefore.length }));

      /*
       * 动的只能是**被碰到的那几张**：拖动者 + 被它压住的一圈（连带把邻居顶开）。
       * 旧实现是「布局跟着 `overrides` 每帧重算」，实测 8 个节点里有 4 张会在拖动中移动。
       * 单步位移的上界按**拖动本身的步长**给：这段拖动分 10 步、每步几十个世界单位，
       * 被挤开的那张同步跟一段是应有的行为；真正要排除的是「布局重排」那种整卡跳位。
       */
      const movedIds = Object.keys(beforeOrdered).filter((id) => {
        const start = beforeOrdered[id];
        const now = duringOrdered[id];
        return now && Math.hypot(now.x - start.x, now.y - start.y) > 1;
      }).filter((id) => id !== orderedPair.source.id);
      let maxStep = 0;
      for (let index = 1; index < track.length; index += 1) {
        for (const id of Object.keys(track[index])) {
          const previous = track[index - 1][id];
          const now = track[index][id];
          if (!previous || !now) continue;
          maxStep = Math.max(maxStep, Math.hypot(now.x - previous.x, now.y - previous.y));
        }
      }
      check('有序摆位下拖动中只有被挤压的那几张在动，且没有整卡跳位',
        movedIds.length <= 4 && maxStep <= 120,
        JSON.stringify({ 移动的卡片: movedIds, 单步最大: Math.round(maxStep * 10) / 10 }));
      check('有序摆位下松手也不跳位',
        Math.hypot(settled[orderedPair.source.id].x - duringOrdered[orderedPair.source.id].x,
          settled[orderedPair.source.id].y - duringOrdered[orderedPair.source.id].y) < 1.5,
        JSON.stringify({ 拖动中: duringOrdered[orderedPair.source.id], 松手后: settled[orderedPair.source.id] }));
      check('有序摆位下挤开之后也不重叠',
        overlapPairs(Object.values(settled)).length === 0, JSON.stringify(overlapPairs(Object.values(settled))));
      await modeSelect.selectOption({ label: '自由摆位' });
      await page.waitForTimeout(600);
    } else {
      check('有序摆位下找得到一对可拖动的节点', false, '没有可拖的一对（版面被面板挡住？）');
    }
  }

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
