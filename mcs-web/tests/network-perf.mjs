import { startTestServer, clickInAnimatedPage } from './helpers.mjs';

import { PLAYWRIGHT_SPECIFIER as PLAYWRIGHT, CHROME_PATH as CHROME } from './browser-runtime.mjs';

const failures = [];
function check(name, condition, detail = '') {
  if (condition) console.log('  ✓ ' + name);
  else { failures.push(name + (detail ? ' :: ' + detail : '')); console.log('  ✗ ' + name + (detail ? ' :: ' + detail : '')); }
}

/**
 * 预算内的性能观测（2026-10 加，TODO A5-37）。
 *
 * 第四十轮的边界：「相机动画期间每帧重渲染整页；节点上百时的开销未测。
 * *验收*：在 200 节点视图下测一次帧时间/长任务，记录数字；超阈值再优化。」
 *
 * 这一套在**227 个节点**（全库 232 减去 5 个，用来测增量加入）的视图上量五件事：
 * 一次铺开、重新布局（力导向重算）、加一个节点（增量摆位 + 相机动画）、打开面板、静态停留；
 * 每个都记录**端到端耗时**与**长任务**（`PerformanceObserver` 的 `longtask`，>50ms 的主线程阻塞）。
 *
 * 阈值是**回归网**而不是性能目标：取实测值的 3–5 倍，超了说明有人写出了平方级的路径。
 * 实测（优化前后）见 VALIDATION 第五十七轮：
 *
 * | 操作 | 优化前 | 优化后 |
 * |---|---|---|
 * | 铺开 227 节点 | 3322ms | 1516ms |
 * | 重新布局 | 2219ms（长任务 1129ms） | 483ms（238ms） |
 * | 加一个节点 | 2466ms（长任务 1321ms） | 643ms（393ms） |
 *
 * 帧间隔在 headless 里是空转时钟（约 6ms 一条），**不作为断言**，只记录。
 */
const VIEW_SIZE_MARGIN = 5;

const server = await startTestServer();
let browser;
try {
  const { chromium } = await import(PLAYWRIGHT);
  browser = await chromium.launch({ executablePath: CHROME ?? undefined, headless: true });
  const page = await (await browser.newContext({ viewport: { width: 1440, height: 950 } })).newPage();
  const consoleErrors = [];
  page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text()); });
  page.on('pageerror', (error) => consoleErrors.push(error.message));

  const graph = await (await fetch(server.origin + '/api/v2/ontology/graph')).json();
  const ids = graph.data.nodes.map((node) => node.id);
  const viewIds = ids.slice(0, ids.length - VIEW_SIZE_MARGIN);
  console.log(`  · 视图规模：${viewIds.length} 个节点（全库 ${ids.length}，留 ${VIEW_SIZE_MARGIN} 个用于增量加入）`);

  const startObserver = () => page.evaluate(() => {
    window.__perf = { longTasks: [], total: 0 };
    if (typeof PerformanceObserver !== 'undefined') {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) { window.__perf.longTasks.push(Math.round(entry.duration)); window.__perf.total += entry.duration; }
      });
      try { observer.observe({ entryTypes: ['longtask'] }); } catch { /* 不支持就不观测 */ }
    }
  });
  const readObserver = () => page.evaluate(() => {
    const data = window.__perf ?? { longTasks: [], total: 0 };
    window.__perf = { longTasks: [], total: 0 };
    return { count: data.longTasks.length, max: data.longTasks.length ? Math.max(...data.longTasks) : 0, totalMs: Math.round(data.total) };
  });
  const timed = async (label, action) => {
    await startObserver();
    const started = Date.now();
    await action();
    const elapsed = Date.now() - started;
    const observer = await readObserver();
    console.log(`  · ${label}：${elapsed} ms，长任务 ${observer.count} 个（最大 ${observer.max} ms，合计 ${observer.totalMs} ms）`);
    return { elapsed, ...observer };
  };

  const spread = await timed('铺开（网络 + 首帧 + 布局）', async () => {
    await page.goto(server.origin + '/network?nodes=' + encodeURIComponent(viewIds.join(',')), { waitUntil: 'networkidle' });
    await page.waitForFunction((expected) => document.querySelectorAll('.network-node').length === expected, viewIds.length, { timeout: 60000 });
  });
  check(`${viewIds.length} 节点一次铺开在预算内（≤ 8000ms）`, spread.elapsed <= 8000, JSON.stringify(spread));
  const rendered = await page.evaluate(() => ({
    nodes: document.querySelectorAll('.network-node').length,
    edges: document.querySelectorAll('.network-edge').length,
    title: document.querySelector('.network-hud-count')?.textContent?.replace(/\s+/g, ' ').trim() ?? '',
  }));
  check('铺开之后节点数与视图一致（不是渲染了一半）', rendered.nodes === viewIds.length, JSON.stringify(rendered));

  await page.waitForTimeout(1200);
  const idle = await timed('静态停留 1.2s（不该有长任务）', async () => { await page.waitForTimeout(1200); });
  check('静态停留没有长任务（没有后台重算）', idle.max <= 120, JSON.stringify(idle));

  const relayout = await timed('重新布局（力导向重算）', async () => {
    await page.locator('.network-zoom button:has-text("重新布局")').click({ force: true });
    await page.waitForFunction(() => (document.querySelector('.network-notice')?.textContent ?? '').includes('重新布局'), null, { timeout: 60000 });
  });
  check('重新布局在预算内（≤ 2500ms）且单次阻塞 ≤ 800ms',
    relayout.elapsed <= 2500 && relayout.max <= 800, JSON.stringify(relayout));

  const addNode = await timed('加一个节点（增量摆位 + 相机动画）', async () => {
    await page.locator('input[aria-label="显示全部节点面板"]').check({ force: true });
    await page.waitForSelector('.floating-panel[aria-label="全部节点"] .network-node-list li', { timeout: 15000 });
    const before = await page.locator('.network-node').count();
    await page.evaluate(() => {
      const boxes = [...document.querySelectorAll('.floating-panel[aria-label="全部节点"] .network-node-list input[type="checkbox"]')];
      boxes.find((box) => !box.checked)?.click();
    });
    await page.waitForFunction((expected) => document.querySelectorAll('.network-node').length === expected, before + 1, { timeout: 30000 });
  });
  check('加一个节点在预算内（≤ 3000ms）且单次阻塞 ≤ 800ms',
    addNode.elapsed <= 3000 && addNode.max <= 800, JSON.stringify(addNode));

  const panel = await timed('打开连接类型面板', async () => {
    await page.locator('input[aria-label="显示连接类型面板"]').check({ force: true });
    await page.waitForSelector('.floating-panel[aria-label="连接类型"] .family-list li', { timeout: 15000 });
  });
  check('打开面板很轻（≤ 800ms）', panel.elapsed <= 800, JSON.stringify(panel));

  const select = await timed('选择节点（详情 + 相连边提层）', async () => {
    await clickInAnimatedPage(page, '.network-node', { index: 0, required: false });
    await page.waitForTimeout(500);
  });
  check('选择节点不产生长阻塞（≤ 800ms）', select.max <= 800, JSON.stringify(select));

  // 帧间隔：headless 下 rAF 是空转时钟，只记录不断言。
  const frames = await page.evaluate(() => new Promise((resolve) => {
    const list = []; let last = performance.now(); const started = last;
    const tick = (now) => {
      list.push(now - last); last = now;
      if (now - started < 2000) requestAnimationFrame(tick);
      else {
        const sorted = [...list].sort((a, b) => a - b);
        resolve({
          frames: list.length,
          median: Math.round(sorted[Math.floor(sorted.length / 2)] * 10) / 10,
          p95: Math.round(sorted[Math.floor(sorted.length * 0.95)] * 10) / 10,
          max: Math.round(sorted[sorted.length - 1] * 10) / 10,
        });
      }
    };
    requestAnimationFrame(tick);
  }));
  console.log('  · 帧间隔（headless 空转时钟，仅供参考）：' + JSON.stringify(frames));
  const heap = await page.evaluate(() => (performance.memory
    ? { usedMB: Math.round(performance.memory.usedJSHeapSize / 1048576), totalMB: Math.round(performance.memory.totalJSHeapSize / 1048576) }
    : null));
  console.log('  · JS 堆（若可得）：' + JSON.stringify(heap));

  check('性能观测没有控制台错误', consoleErrors.length === 0, consoleErrors.join(' | '));
} finally {
  await browser?.close();
  await server.cleanup();
}

if (failures.length > 0) {
  console.error('\n性能观测验收失败：\n- ' + failures.join('\n- '));
  process.exit(1);
}
console.log('\n性能观测验收通过。');
