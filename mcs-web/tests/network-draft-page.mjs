/**
 * 「一次学习中搭建的网络视图要暂时的保存下来」的真浏览器验收（2026-10-13 加）。
 *
 * 用户的原话就是这一句，后半句是「不能有切到另外一个页面之后就需要重新搭建的情况」。
 * 因此这一套**只查用户看得见的那条链**：
 *
 * 1. 搭好一张图 → 点侧栏去别的页 → 点回「知识网络」：画布还是刚才那张图（不是空画布）；
 * 2. 刷新（URL 已被写回 `?nodes=`）同样还是那张图；
 * 3. **显式链接优先**：带 `?nodes=` 进来（分享链接、学科导读）不被暂存劫持；
 * 4. 相机一起回来（离开时的 transform 与回来时逐字相同）；
 * 5. 可见边源一起回来；
 * 6. 恢复这件事**可丢弃**：提示条常驻、按钮真的点得到，丢弃之后切页回来仍是空画布；
 * 7. 空画布不写暂存（点「清空画布」只作用这一次，回来拿到最后一张非空网络）；
 * 8. 结构回放不污染暂存；
 * 9. 英文站与窄屏不例外。
 *
 * 需要先 `npm run build`（服务端跑的是构建产物）。
 */
import { startTestServer } from './helpers.mjs';
import { PLAYWRIGHT_SPECIFIER as PLAYWRIGHT, CHROME_PATH as CHROME } from './browser-runtime.mjs';

const failures = [];
function check(name, condition, detail = '') {
  if (condition) console.log('  ✓ ' + name);
  else { failures.push(name + (detail ? ' :: ' + detail : '')); console.log('  ✗ ' + name + (detail ? ' :: ' + detail : '')); }
}

/** 一组用来组网的节点（都要真在本体里）。 */
const GRAPH_NODES = ['top:space', 'top:coordinate-chart', 'top:topological-manifold'];
/**
 * 另一组：用来证明「显式链接优先」（与上面那张图不重合）。
 *
 * **必须选一个当前本体里真的作为独立节点存在的 id**：第一版写的是 `dg:manifold`，
 * 而那个 id 已被 `data/merges.mjs` 收口到 `manifold:manifold`（名字叫「流形」的同一对象），
 * 于是 URL 里那个节点解析不出来，画布上一个卡片都没有——红的却一条与合并无关的断言。
 */
const OTHER_NODE = 'limit:limit-ed';
const DRAFT_KEY = 'mcs-network-draft-v1';

/** 画布与暂存的现场：卡片、URL 里的节点、相机 transform、暂存键。 */
function readState(page) {
  return page.evaluate((key) => {
    const search = new URLSearchParams(location.search);
    return {
      path: location.pathname,
      search: location.search,
      nodes: [...document.querySelectorAll('.network-node')].map((element) => element.getAttribute('data-node')).sort(),
      urlNodes: (search.get('nodes') ?? '').split(',').filter(Boolean).sort(),
      transform: document.querySelector('.network-canvas-full svg > g')?.getAttribute('transform') ?? '',
      notice: document.querySelector('[data-draft-restored]')?.textContent?.trim() ?? '',
      noticeButtons: [...(document.querySelector('[data-draft-restored]')?.querySelectorAll('button') ?? [])]
        .map((button) => button.textContent.trim()),
      stored: (() => { try { return JSON.parse(sessionStorage.getItem(key) ?? 'null'); } catch { return 'unreadable'; } })(),
    };
  }, DRAFT_KEY);
}

/** 等画布的节点集合稳定成给定的那组（相机动画与布局各有一拍，不用固定 sleep）。 */
async function waitForNodes(page, ids, timeout = 20000) {
  const wanted = [...ids].sort().join(',');
  await page.waitForFunction((target) => {
    const found = [...document.querySelectorAll('.network-node')].map((element) => element.getAttribute('data-node')).sort().join(',');
    return found === target;
  }, wanted, { timeout }).catch(() => {});
  return (await readState(page)).nodes;
}

/** 点侧栏导航（站内跳转，不是整页导航）：按 href 精确找，避免与画布里的链接混起来。 */
async function clickNav(href) {
  const clicked = await page.evaluate((target) => {
    const link = [...document.querySelectorAll(`a[href="${target}"]`)].find((item) => item.closest('nav, .sidebar, aside, .topbar, .app-shell') !== null);
    if (!link) return false;
    link.click();
    return true;
  }, href);
  if (!clicked) throw new Error(`侧栏里找不到 ${href} 的链接`);
  await page.waitForURL((url) => url.pathname === href, { timeout: 10000 }).catch(() => {});
}

/** 相机三元组：从 `translate(x y) scale(s)` 里取出三个数，供容差比较用。 */
function cameraTuple(transform) {
  const numbers = (transform.match(/-?\d+(\.\d+)?/g) ?? []).map(Number);
  return numbers.length >= 3 ? { x: numbers[0], y: numbers[1], scale: numbers[2] } : null;
}

const server = await startTestServer();
let browser;
/** 主页面句柄：`clickNav` 等小工具要用，因此声明在 try 之外（赋值仍在里面）。 */
let page;
try {
  const { chromium } = await import(PLAYWRIGHT);
  browser = await chromium.launch({ executablePath: CHROME ?? undefined, headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 950 } });
  page = await context.newPage();
  /*
   * 「丢弃暂存」与「删除视图」一样会弹确认框；这个上下文里一律确认。
   * 不注册的话 Playwright 默认自动关闭对话框（等于取消），那一条会假红。
   */
  page.on('dialog', (dialog) => { void dialog.accept(); });
  const consoleErrors = [];
  page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text()); });
  page.on('pageerror', (error) => consoleErrors.push(error.message));

  // ---- 1) 搭一张图 → 切页 → 回来还是那张图 ----
  await page.goto(`${server.origin}/network?nodes=${GRAPH_NODES.map(encodeURIComponent).join(',')}`, { waitUntil: 'networkidle' });
  await waitForNodes(page, GRAPH_NODES);
  await page.waitForTimeout(900);
  const built = await readState(page);
  check('起点：三张卡片都在画布上', built.nodes.length === 3, JSON.stringify(built.nodes));
  check('离开之前暂存已经写下这三个节点',
    built.stored && JSON.stringify([...built.stored.added].sort()) === JSON.stringify([...GRAPH_NODES].sort()),
    JSON.stringify(built.stored));

  await clickNav('/nodes');
  const left = await readState(page);
  check('切到「数学对象」页确实换了页', left.path === '/nodes', left.path);

  await clickNav('/network');
  const back = await waitForNodes(page, GRAPH_NODES);
  const returned = await readState(page);
  check('点回「知识网络」：画布还是刚才那张图（不是空画布）',
    back.length === 3 && JSON.stringify(back) === JSON.stringify([...GRAPH_NODES].sort()), JSON.stringify(back));
  check('恢复之后画布上的卡片与 URL 一致',
    JSON.stringify(returned.nodes) === JSON.stringify(returned.urlNodes), JSON.stringify({ cards: returned.nodes, url: returned.urlNodes }));
  check('URL 里带着恢复出来的节点（复制链接与刷新都能复现）',
    returned.urlNodes.length === 3, returned.search);
  check('给出「已恢复」提示条', returned.notice.includes('已恢复') && returned.notice.includes('本次会话'), returned.notice.slice(0, 40));
  check('提示条上有「丢弃暂存，重新开始」与「知道了」两个出口',
    returned.noticeButtons.some((text) => text.includes('丢弃暂存')) && returned.noticeButtons.some((text) => text.includes('知道了')),
    JSON.stringify(returned.noticeButtons));

  // ---- 2) 刷新（URL 路径）也还是那张图 ----
  await page.reload({ waitUntil: 'networkidle' });
  const reloaded = await waitForNodes(page, GRAPH_NODES);
  check('刷新之后仍是同一张图', reloaded.length === 3, JSON.stringify(reloaded));

  /*
   * 浏览器「后退」也是一条真实的「切到另一个页面再回来」的路径（用户报的那句话里最常见的一类）。
   * 这一条与前面不同：后退回来时 URL 上带着 `nodes`，走的是**URL 那条路**（不触发自动恢复），
   * 因此这里核的是「图还在」且不该弹恢复提示——两条路都要通。
   */
  await clickNav('/nodes');
  await page.goBack({ waitUntil: 'networkidle' });
  await page.waitForTimeout(700);
  const backState = await readState(page);
  check('浏览器后退回来：仍是同一张图，且不弹「已恢复」（走的是 URL 那条路）',
    JSON.stringify(backState.nodes) === JSON.stringify([...GRAPH_NODES].sort()) && backState.notice === '',
    JSON.stringify({ nodes: backState.nodes, notice: backState.notice.slice(0, 24) }));

  // ---- 3) 显式链接优先：带 ?nodes= 进来不被暂存劫持 ----
  await page.goto(`${server.origin}/network?nodes=${encodeURIComponent(OTHER_NODE)}`, { waitUntil: 'networkidle' });
  const explicit = await waitForNodes(page, [OTHER_NODE]);
  const explicitState = await readState(page);
  check('带 ?nodes= 的链接以 URL 为准（只有链接里的那个节点）',
    explicit.length === 1 && explicit[0] === OTHER_NODE, JSON.stringify(explicit));
  check('显式链接进来时不再弹「已恢复」提示条（没有发生恢复）',
    explicitState.notice === '', explicitState.notice.slice(0, 40));

  // 回到自己那张图：暂存已被这次显式访问覆盖成「链接里的那个节点」——如实核对这条口径。
  await clickNav('/nodes');
  await clickNav('/network');
  const afterExplicit = await waitForNodes(page, [OTHER_NODE]);
  check('显式访问本身就是一次「现在的图」：回来拿到的是它',
    afterExplicit.length === 1 && afterExplicit[0] === OTHER_NODE, JSON.stringify(afterExplicit));

  // ---- 4) 相机一起回来 ----
  await page.goto(`${server.origin}/network?nodes=${GRAPH_NODES.map(encodeURIComponent).join(',')}`, { waitUntil: 'networkidle' });
  await waitForNodes(page, GRAPH_NODES);
  await page.waitForTimeout(1200);
  // 换一个与「适配整张图」明显不同的视角：拖一段、滚一格。
  const box = await page.locator('.network-canvas-full').boundingBox();
  await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.9);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.5 - 170, box.y + box.height * 0.9 - 90, { steps: 10 });
  await page.mouse.up();
  await page.mouse.move(box.x + box.width * 0.31, box.y + box.height * 0.62);
  await page.mouse.wheel(0, -120);
  await page.waitForTimeout(700);
  const zoomed = await readState(page);
  await clickNav('/nodes');
  await clickNav('/network');
  const cameraBack = await waitForNodes(page, GRAPH_NODES);
  /*
   * 等一拍：相机落位之后，HUD 的高度与画布尺寸才刚量出来，本页的「加入节点后自动适配」
   * 会因此再跑一次。实测这一拍里被钉住的视角不会被换掉（让位窗口 600ms，用户动手即松手）。
   */
  await page.waitForTimeout(900);
  const restoredCamera = await readState(page);
  /*
   * 判据用相机三元组（`translate(x y) scale(s)`）逐个比，容差 1%：
   * 画布四边有平移夹取（`clampCamera`），贴边时的坐标会被夹回边界，逐字比会因为
   * 一两个像素的边界差而假红；1% 的容差仍然能抓住「相机压根没回来」（那是十倍量级的差）。
   */
  const before = cameraTuple(zoomed.transform);
  const after = cameraTuple(restoredCamera.transform);
  const close = (a, b) => (a !== null && b !== null
    && Math.abs(a.x - b.x) <= Math.max(6, Math.abs(b.x) * 0.01)
    && Math.abs(a.y - b.y) <= Math.max(6, Math.abs(b.y) * 0.01)
    && Math.abs(a.scale - b.scale) <= b.scale * 0.01);
  check('相机一起回来：离开时的视角与回来时一致（1% 容差）',
    before !== null && close(before, after), JSON.stringify({ before, after }));
  check('相机回来这一档的卡片也在', cameraBack.length === 3, JSON.stringify(cameraBack));

  // ---- 5) 可见边源一起回来 ----
  await page.locator('input[aria-label="显示连接类型面板"]').check();
  await page.waitForTimeout(400);
  const familiesBox = page.locator('.floating-panel[aria-label="连接类型"] .family-list li input');
  const familyCount = await familiesBox.count();
  // 默认只开两类；再多开两类，回来时应当还是四类。
  let opened = 0;
  for (let index = 0; index < familyCount && opened < 2; index += 1) {
    if (!(await familiesBox.nth(index).isChecked())) { await familiesBox.nth(index).check(); opened += 1; }
  }
  await page.waitForTimeout(600);
  const familiesBefore = await page.evaluate(() => [...document.querySelectorAll('.floating-panel[aria-label="连接类型"] .family-list li input')].filter((input) => input.checked).length);
  await clickNav('/nodes');
  await clickNav('/network');
  await waitForNodes(page, GRAPH_NODES);
  // 面板的开合状态是「来过就收起」的，因此回来要显式打开再看开关。
  await page.locator('input[aria-label="显示连接类型面板"]').check();
  await page.waitForTimeout(500);
  const familiesAfter = await page.evaluate(() => [...document.querySelectorAll('.floating-panel[aria-label="连接类型"] .family-list li input')].filter((input) => input.checked).length);
  check('可见边源一起回来（多开的两类仍然开着）',
    opened === 2 && familiesAfter === familiesBefore, JSON.stringify({ opened, before: familiesBefore, after: familiesAfter }));

  // ---- 6) 空画布不写暂存：清空只作用这一次 ----
  await page.locator('button:has-text("清空")').first().click();
  /*
   * 先断言「清空这一下真的清掉了」——这是**用户按下去的那一刻**该看到的结果。
   * 不核这一条的话，「点完立刻被自动恢复填回来」这种最糟的形态会漏掉：下面那条
   * 「切页回来还是原来那张图」当时仍然是绿的（实测 `browser.mjs` 的「可以清空网络」就是被它抓红的）。
   */
  await page.waitForFunction(() => document.querySelectorAll('.network-node').length === 0, null, { timeout: 5000 }).catch(() => {});
  const clearedNow = await readState(page);
  check('点「清空画布」：画布立刻空掉，暂存留着（切页还拿得回来）',
    clearedNow.nodes.length === 0 && clearedNow.stored !== null,
    JSON.stringify({ nodes: clearedNow.nodes, stored: clearedNow.stored?.added ?? null }));
  await page.waitForTimeout(600);
  const cleared = await readState(page);
  check('点「清空画布」之后画布是空的', cleared.nodes.length === 0, JSON.stringify(cleared.nodes));
  await clickNav('/nodes');
  await clickNav('/network');
  const afterClear = await waitForNodes(page, GRAPH_NODES);
  check('清空只作用这一次：切页回来拿到最后一张非空网络（不与「清空」的原意冲突——那旁边就有撤销）',
    afterClear.length === 3, JSON.stringify(afterClear));

  // ---- 7) 丢弃暂存：明确的从新开始 ----
  const discardButtons = page.locator('[data-draft-restored] button', { hasText: '丢弃暂存' });
  check('恢复提示条常驻到用户处理（丢弃入口可见）', (await discardButtons.count()) === 1, String(await discardButtons.count()));
  await discardButtons.first().click();
  await page.waitForTimeout(1100);
  const discarded = await readState(page);
  check('丢弃之后画布清空、暂存被删掉、提示条收起',
    discarded.nodes.length === 0 && discarded.stored === null && !discarded.notice,
    JSON.stringify({ nodes: discarded.nodes, stored: discarded.stored, notice: discarded.notice }));
  await clickNav('/nodes');
  await clickNav('/network');
  await page.waitForTimeout(900);
  const afterDiscard = await readState(page);
  check('丢弃之后切页回来仍是空画布（暂存真的没了）',
    afterDiscard.nodes.length === 0 && !afterDiscard.notice, JSON.stringify({ nodes: afterDiscard.nodes, notice: afterDiscard.notice }));

  // ---- 8) 空画布不产生暂存（守住 browser.mjs 那一段的前提） ----
  await page.evaluate((key) => sessionStorage.removeItem(key), DRAFT_KEY);
  await page.goto(`${server.origin}/network`, { waitUntil: 'networkidle' });
  await page.waitForSelector('.network-stage');
  await page.waitForTimeout(800);
  const fresh = await readState(page);
  check('空画布不写暂存：从没加过节点就不会留下记录',
    fresh.nodes.length === 0 && fresh.stored === null, JSON.stringify({ nodes: fresh.nodes.length, stored: fresh.stored }));
  check('空画布照旧有「网络还是空的」提示',
    ((await page.locator('.network-stage-hint').textContent()) ?? '').includes('网络还是空的'));

  // ---- 9) 结构回放不污染暂存 ----
  await page.goto(`${server.origin}/network?nodes=${GRAPH_NODES.map(encodeURIComponent).join(',')}`, { waitUntil: 'networkidle' });
  await waitForNodes(page, GRAPH_NODES);
  await page.waitForTimeout(700);
  const beforeReplay = await readState(page);
  const replayHref = `/network?play=1&entry=${encodeURIComponent('bg:set:function')}&path=${encodeURIComponent(GRAPH_NODES.join('>'))}&goal=${encodeURIComponent('top:topological-manifold')}`;
  /*
   * 真点回放链接要从路线页走，这里直接导航到回放地址：本套核的是「暂存有没有被回放改掉」，
   * 不是回放入口（那条链在 `tests/browser.mjs` 的回放段里）。
   */
  await page.goto(server.origin + replayHref, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  const duringReplay = await readState(page);
  check('回放态下不弹「已恢复」提示条（回放有它自己的控制台）', duringReplay.notice === '', duringReplay.notice.slice(0, 40));
  /*
   * 回放期间 `added` 是路线在驱动的；这一段的判据是**暂存没有被回放的节点集合改掉**。
   * 回放写入的节点集合与用户自己那张图不同，因此暂存里若出现回放的集合就是缺陷。
   */
  const storedAfterReplay = duringReplay.stored?.added ?? [];
  check('回放不污染暂存：暂存里仍是用户自己那张图',
    JSON.stringify([...storedAfterReplay].sort()) === JSON.stringify([...beforeReplay.nodes].sort()),
    JSON.stringify({ stored: storedAfterReplay, before: beforeReplay.nodes }));
  await clickNav('/nodes');
  await clickNav('/network');
  const afterReplay = await waitForNodes(page, GRAPH_NODES);
  check('退出回放后回到的是用户自己那张图（不是回放路线）',
    JSON.stringify(afterReplay) === JSON.stringify([...GRAPH_NODES].sort()), JSON.stringify(afterReplay));

  // ---- 10) 英文站：同一份暂存，提示条是英文 ----
  await page.goto(`${server.origin}/en/nodes`, { waitUntil: 'networkidle' });
  await page.goto(`${server.origin}/en/network`, { waitUntil: 'networkidle' });
  const enRestored = await waitForNodes(page, GRAPH_NODES);
  const enState = await readState(page);
  check('英文站也恢复同一份暂存（暂存与语种无关）',
    JSON.stringify(enRestored) === JSON.stringify([...GRAPH_NODES].sort()), JSON.stringify(enRestored));
  check('英文站的提示条与按钮都是英文',
    enState.notice.includes('Restored') && enState.noticeButtons.some((text) => text.includes('Discard')), enState.notice.slice(0, 40));

  // ---- 11) 提示条本身：真的点得到 ----
  const reachable = await page.evaluate(() => {
    const notice = document.querySelector('[data-draft-restored]');
    if (!notice) return null;
    const buttons = [...notice.querySelectorAll('button')];
    return buttons.map((button) => {
      const rect = button.getBoundingClientRect();
      const hit = document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2);
      return { text: button.textContent.trim().slice(0, 12), hit: hit ? `${hit.tagName}.${hit.getAttribute('class') ?? ''}`.slice(0, 30) : null, self: Boolean(hit && (hit === button || button.contains(hit))) };
    });
  });
  check('提示条上的两个按钮都点得到（没有被画布或 HUD 抢走）',
    Array.isArray(reachable) && reachable.length === 2 && reachable.every((item) => item.self), JSON.stringify(reachable));

  // ---- 12) 窄屏（390px）：仍是卡片式，无横向溢出 ----
  const narrow = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const narrowPage = await narrow.newPage();
  await narrowPage.goto(`${server.origin}/network?nodes=${encodeURIComponent(GRAPH_NODES[0])}`, { waitUntil: 'networkidle' });
  await narrowPage.waitForTimeout(1200);
  await narrowPage.goto(`${server.origin}/network`, { waitUntil: 'networkidle' });
  await narrowPage.waitForTimeout(1400);
  const narrowState = await narrowPage.evaluate(() => ({
    nodes: document.querySelectorAll('.network-node').length,
    notice: Boolean(document.querySelector('[data-draft-restored]')),
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  check('窄屏（390px）也能恢复且没有横向溢出',
    narrowState.nodes === 1 && narrowState.notice && narrowState.scrollWidth <= narrowState.clientWidth + 2,
    JSON.stringify(narrowState));

  check('没有控制台错误', consoleErrors.length === 0, consoleErrors.slice(0, 3).join(' | '));
} finally {
  await browser?.close();
  await server?.cleanup();
  await server?.close?.();
}

if (failures.length) {
  console.log('\n「本次学习的暂存与自动恢复」验收失败：');
  for (const failure of failures) console.log('- ' + failure);
  process.exit(1);
}
console.log('\n「本次学习的暂存与自动恢复」验收通过。');
process.exit(0);
