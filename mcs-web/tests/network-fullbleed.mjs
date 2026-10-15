/**
 * 知识网络页占满工作区（2026-10-12 加）。
 *
 * 用户的原话：「网络视图外面还有一个上下滚动的空间，而除了视图外的信息只有作者和邮箱，
 * 使得视图操作起来有点别扭。直接让节点网络占满节点网络页面，除去边栏的所有空间。」
 *
 * 五件事：
 * 1. **页面不再滚动**（文档高度 == 视口高度），画布之外没有内容；
 * 2. **画布真的撑满**：它的底边贴着视口底边（留工作区的内边距），高度占视口的绝大部分；
 * 3. **不显示页脚**（作者与邮箱）——那一页画布之外不该有内容；
 * 4. **别的页面不受影响**：同一浏览器里换一页，页脚回来、页面照常滚动；
 * 5. **窄屏不变**：≤860px 时画布仍是 `46vh` 的普通卡片、页面照常滚动（这一档刻意不锁高度）。
 */
import { startTestServer } from './helpers.mjs';
import { PLAYWRIGHT_SPECIFIER as PLAYWRIGHT, CHROME_PATH as CHROME } from './browser-runtime.mjs';

const failures = [];
function check(name, condition, detail = '') {
  if (condition) console.log('  ✓ ' + name);
  else { failures.push(name + (detail ? ' :: ' + detail : '')); console.log('  ✗ ' + name + (detail ? ' :: ' + detail : '')); }
}

/** 量一页的高度关系：文档、视口、画布矩形、画布本体高度、页脚是否存在。 */
async function measure(page) {
  return page.evaluate(() => {
    const stage = document.querySelector('.network-stage');
    const rect = stage?.getBoundingClientRect();
    const canvas = document.querySelector('.network-canvas-full');
    return {
      docHeight: document.documentElement.scrollHeight,
      bodyHeight: document.body.scrollHeight,
      viewport: window.innerHeight,
      viewportWidth: window.innerWidth,
      scrollY: window.scrollY,
      /** 画布本体（窄屏下它是 46vh 的卡片；桌面端它铺满整块 stage）。 */
      canvasHeight: canvas ? Math.round(canvas.getBoundingClientRect().height) : 0,
      stage: rect ? { top: Math.round(rect.top), bottom: Math.round(rect.bottom), height: Math.round(rect.height), width: Math.round(rect.width), left: Math.round(rect.left) } : null,
      footer: Boolean(document.querySelector('.site-footer')),
      shellClass: document.querySelector('.app-shell')?.className ?? '',
      workspaceClass: document.querySelector('.workspace')?.className ?? '',
    };
  });
}

const server = await startTestServer();
let browser;
try {
  const { chromium } = await import(PLAYWRIGHT);
  browser = await chromium.launch({ executablePath: CHROME ?? undefined, headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  const consoleErrors = [];
  page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text()); });
  page.on('pageerror', (error) => consoleErrors.push(error.message));

  await page.goto(server.origin + '/network', { waitUntil: 'networkidle' });
  await page.waitForSelector('.network-stage');
  await page.waitForTimeout(700);
  const network = await measure(page);

  check('页面本身不再滚动（文档高度 == 视口高度）',
    Math.abs(network.docHeight - network.viewport) <= 2,
    JSON.stringify({ docHeight: network.docHeight, viewport: network.viewport }));
  check('画布占满视口的绝大部分（高度 > 80% 视口）',
    network.stage !== null && network.stage.height / network.viewport > 0.8,
    JSON.stringify(network.stage));
  check('画布底边贴着视口底边（只留工作区内边距）',
    network.stage !== null && network.viewport - network.stage.bottom <= 40 && network.stage.bottom <= network.viewport,
    JSON.stringify({ bottom: network.stage?.bottom, viewport: network.viewport }));
  check('画布顶边在顶栏之下（不被顶栏压住）',
    network.stage !== null && network.stage.top >= 40,
    JSON.stringify(network.stage));
  check('没有全站页脚（作者 / 邮箱不占画布之外的空间）', network.footer === false, JSON.stringify(network));
  check('外壳与工作区带上了 is-network 标记', network.shellClass.includes('is-network') && network.workspaceClass.includes('is-network'),
    JSON.stringify({ shell: network.shellClass, workspace: network.workspaceClass }));

  /*
   * ---- 四周不留框（2026-10-12 用户第二轮：「还是有边框，把图中红色的边框去掉」）----
   *
   * 三处线条必须真的是 0：画布自己的边框、边栏的右边框、顶栏的下边框。
   * 顺带核对**工作区的内边距也是 0**——留着它，画布与顶栏/边栏之间就有一条缝，
   * 那条缝配上任意一条线看起来又像一个框（用户报的就是这个观感）。
   */
  const edges = await page.evaluate(() => {
    const box = (selector) => {
      const element = document.querySelector(selector);
      if (!element) return null;
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return {
        selector,
        width: [style.borderTopWidth, style.borderRightWidth, style.borderBottomWidth, style.borderLeftWidth].map((value) => Number.parseFloat(value)),
        radius: style.borderRadius,
        padding: [style.paddingTop, style.paddingRight, style.paddingBottom, style.paddingLeft].map((value) => Number.parseFloat(value)),
        rect: { top: Math.round(rect.top), left: Math.round(rect.left), right: Math.round(rect.right), bottom: Math.round(rect.bottom) },
      };
    };
    return ['.network-stage', '.sidebar', '.topbar', '.workspace'].map(box);
  });
  const flush = (entry) => entry && entry.width.every((value) => value === 0);
  check('画布/边栏/顶栏都没有边框（红色那几道线）',
    edges.slice(0, 3).every(flush),
    JSON.stringify(edges.map((entry) => ({ selector: entry?.selector, width: entry?.width }))));
  check('工作区四周内边距为 0（画布与顶栏、边栏之间不留缝）',
    edges[3] !== null && edges[3].padding.every((value) => value === 0),
    JSON.stringify(edges[3]?.padding));
  check('画布没有圆角（边缘与视口齐平）',
    edges[0] !== null && Number.parseFloat(edges[0].radius) === 0,
    JSON.stringify(edges[0]?.radius));
  /*
   * 画布与顶栏、边栏、视口三边**贴在一起**：左边缘 == 边栏右边缘，上边缘 == 顶栏下边缘，
   * 右/下边缘 == 视口边缘。留了缝就说明内边距或边框又回来了。
   */
  const sidebarBox = edges[1]?.rect;
  const topbarBox = edges[2]?.rect;
  const stageBox = edges[0]?.rect;
  check('画布贴着边栏、顶栏与视口边缘（左边 == 边栏右，上边 == 顶栏下）',
    Boolean(sidebarBox && topbarBox && stageBox)
      && stageBox.left === sidebarBox.right
      && stageBox.top === topbarBox.bottom
      && stageBox.right >= network.viewportWidth - 1,
    JSON.stringify({ sidebarRight: sidebarBox?.right, topbarBottom: topbarBox?.bottom, stage: stageBox, viewportWidth: network.viewportWidth }));

  // 滚到底也不该冒出别的东西（画布之外没有内容）。
  await page.evaluate(() => window.scrollTo(0, 9999));
  await page.waitForTimeout(300);
  const afterScroll = await measure(page);
  check('试着往下滚也不会露出别的区块', afterScroll.scrollY === 0, String(afterScroll.scrollY));

  // 画布仍然可交互：HUD 与图例都在画布内。
  const chrome = await page.evaluate(() => {
    const stage = document.querySelector('.network-stage')?.getBoundingClientRect();
    const inside = (selector) => {
      const rect = document.querySelector(selector)?.getBoundingClientRect();
      if (!rect || !stage) return false;
      return rect.top >= stage.top - 1 && rect.bottom <= stage.bottom + 1;
    };
    return { hud: inside('.network-hud'), legend: inside('.network-legend-bar') };
  });
  check('HUD 与图例都落在画布内', chrome.hud && chrome.legend, JSON.stringify(chrome));

  /*
   * 面板标题栏不能被 HUD 压住（2026-10-11 加）。
   *
   * 用户报的：「节点详情的关闭键点不到」。HUD 是**浮在画布上**的（`z-index` 6 > 面板 5），
   * 而面板的夹取上边界原本是 0（只保证「落在画布内」）。HUD 长到三行之后
   * （加了排法 / 锚点 / 保留手动摆放，实测 174px），面板标题栏落在 HUD 底下就成了
   * 「看得见、点下去被 HUD 接走」。
   *
   * 两种来路都要验：
   * ① **存在本机的位置**（用户以前拖到过那里，HUD 变高之后就压住了）——写 y=0 再刷新；
   * ② **现拖**——把面板往最上面拖，夹取必须在 HUD 下沿停住。
   * 判据用 `elementFromPoint`：关闭键中心那一点必须命中关闭键自己。
   */
  const readHeaderReach = (label) => page.evaluate((panelLabel) => {
    const panel = document.querySelector(`.floating-panel[aria-label="${panelLabel}"]`);
    const hud = document.querySelector('.network-hud');
    const close = panel?.querySelector('.floating-panel-tools button:last-child');
    const cr = close?.getBoundingClientRect();
    const hr = hud?.getBoundingClientRect();
    const hit = cr ? document.elementFromPoint(cr.x + cr.width / 2, cr.y + cr.height / 2) : null;
    return {
      panelTop: panel ? Math.round(panel.getBoundingClientRect().top) : null,
      hudBottom: hr ? Math.round(hr.bottom) : null,
      closeTop: cr ? Math.round(cr.top) : null,
      below: Boolean(cr && hr && cr.top >= hr.bottom),
      reachable: Boolean(hit && close && (hit === close || close.contains(hit))),
      hit: hit ? `${hit.tagName}.${hit.getAttribute('class') ?? ''}` : null,
    };
  }, label);

  // ① 存了一个「贴顶」的位置 —— 打开详情面板之后必须被夹到 HUD 之下。
  await page.evaluate(() => {
    const stored = JSON.parse(localStorage.getItem('mcs-network-panels-v1') ?? '{}');
    stored.detail = { x: 0.02, y: 0 };
    localStorage.setItem('mcs-network-panels-v1', JSON.stringify(stored));
  });
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForSelector('.network-stage');
  await page.waitForTimeout(700);
  await page.locator('input[aria-label="显示节点详情面板"]').check();
  await page.waitForTimeout(500);
  const storedReach = await readHeaderReach('节点详情');
  check('存了贴顶位置的面板：标题栏与关闭键被夹到 HUD 之下且真的点得到',
    storedReach.below && storedReach.reachable, JSON.stringify(storedReach));

  // ② 现场把面板往最上面拖 —— 拖动过程中的夹取同样要在 HUD 下沿停住。
  const dragFrom = await page.evaluate(() => {
    const header = document.querySelector('.floating-panel[aria-label="节点详情"] .floating-panel-head');
    const rect = header?.getBoundingClientRect();
    return rect ? { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 } : null;
  });
  if (dragFrom) {
    await page.mouse.move(dragFrom.x, dragFrom.y);
    await page.mouse.down();
    await page.mouse.move(dragFrom.x, 40, { steps: 10 });
    await page.mouse.up();
    await page.waitForTimeout(400);
  }
  const draggedReach = await readHeaderReach('节点详情');
  check('现拖到最上面：面板停在 HUD 之下（关闭键仍然点得到）',
    draggedReach.below && draggedReach.reachable, JSON.stringify({ dragFrom, ...draggedReach }));

  // ---- 别的页面不受影响 ----
  await page.goto(server.origin + '/start', { waitUntil: 'networkidle' });
  await page.waitForTimeout(600);
  const start = await page.evaluate(() => ({
    footer: Boolean(document.querySelector('.site-footer')),
    shellClass: document.querySelector('.app-shell')?.className ?? '',
    canScroll: document.documentElement.scrollHeight > window.innerHeight,
  }));
  check('别的页面照旧：页脚在、外壳没有 is-network、页面可滚动',
    start.footer && !start.shellClass.includes('is-network') && start.canScroll,
    JSON.stringify(start));

  // ---- 窄屏：这一档刻意不锁高度（画布 46vh 的普通卡片，页面照常滚动）----
  const narrow = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const narrowPage = await narrow.newPage();
  await narrowPage.goto(server.origin + '/network', { waitUntil: 'networkidle' });
  await narrowPage.waitForSelector('.network-stage');
  await narrowPage.waitForTimeout(700);
  const mobile = await measure(narrowPage);
  const overflow = await narrowPage.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  /*
   * 悬浮框的高度**必须在注入任何调试样式之前**量：下面那段 `addStyleTag` 会改变布局，
   * 量在它之后会得到「看起来修好了」的假象（这份测试第一版就踩了这个坑）。
   */
  const mobilePanels = await narrowPage.evaluate(() => [...document.querySelectorAll('.floating-panel')]
    .map((panel) => Math.round(panel.getBoundingClientRect().height)));
  /*
   * 窄屏这一档刻意**不锁高度**：画布缩成 `46vh` 的卡片，悬浮框竖排成普通卡片，页面照常滚动。
   *
   * 注意量的是**画布本体**（`.network-canvas-full`）而不是 `.network-stage`：
   * 窄屏下 stage 是「画布 + HUD + 两个面板 + 图例」的纵向容器，它的高度本来就该等于
   * 这些卡片加起来的和（实测 ~2500px），拿它去比 46vh 会得到一个假的失败。
   */
  check('窄屏（390px）：画布是 46vh 的卡片，页面照常滚动',
    mobile.docHeight > mobile.viewport
      && Math.abs(mobile.canvasHeight / mobile.viewport - 0.46) < 0.06,
    JSON.stringify({ canvasHeight: mobile.canvasHeight, viewport: mobile.viewport, docHeight: mobile.docHeight, stage: mobile.stage }));
  check('窄屏的悬浮框按内容排（不再被 flex 拉高）',
    mobilePanels.length > 0 && mobilePanels.every((height) => height > 0 && height < 900),
    JSON.stringify(mobilePanels));
  check('窄屏没有横向溢出', overflow <= 2, String(overflow));
  check('窄屏同样不显示页脚（与桌面一致：这一页的画布之外不放内容）', mobile.footer === false, JSON.stringify({ footer: mobile.footer }));

  check('没有控制台错误', consoleErrors.length === 0, consoleErrors.slice(0, 3).join(' | '));
} finally {
  await browser?.close();
  await server?.cleanup();
  await server?.close?.();
}

if (failures.length) {
  console.log('\n网络页占满工作区验收失败：');
  for (const failure of failures) console.log('- ' + failure);
  process.exit(1);
}
console.log('\n网络页占满工作区验收通过。');
process.exit(0);
