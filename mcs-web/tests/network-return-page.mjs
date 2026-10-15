/**
 * 「在网络中打开具体节点之后增加返回网络视图的选项」的真浏览器验收（2026-10 加）。
 *
 * 用户的原话就是这一句。因此这一套**只查用户看得见的那条链**：
 *
 * 1. 直接打开节点页（分享链接 / 书签）→ 给的是「在网络视图里打开这个节点」，
 *    并写明**为什么**没有「刚才那张图」可以回（不编一个假地址）；
 * 2. 从网络视图点进节点 → 给的是「回到网络视图」；
 * 3. 真点回去 → **回到同一张图**（`?nodes=` 与结构回放参数都在，不是空网络）；
 * 4. 网络里点进节点的**每个入口**都带上这件事（详情面板、推荐面板、回放条、关联列表）；
 * 5. 英文站上返回链接是 `/en/network…`（不会把英文读者送回中文页）；
 * 6. 窄屏不横向溢出。
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
const KEY_NODE = 'top:coordinate-chart';

/**
 * 打开某个浮动面板（面板的默认开合按「来过没有」分档，因此**显式**打开，
 * 不依赖默认值）。按面板标题文本定位，不用位置索引——面板顺序改了不该让这一套红。
 */
async function openPanel(page, title) {
  const already = await page.locator(`.floating-panel[aria-label*="${title}"]`).count();
  if (already > 0) return true;
  const opened = await page.evaluate((wanted) => {
    const box = [...document.querySelectorAll('.network-hud-toggle input')]
      .find((input) => (input.getAttribute('aria-label') ?? '').includes(wanted));
    if (!box) return false;
    if (!box.checked) box.click();
    return true;
  }, title);
  if (opened) await page.waitForTimeout(500);
  return opened;
}

const server = await startTestServer();
let browser;
try {
  const { chromium } = await import(PLAYWRIGHT);
  browser = await chromium.launch({ executablePath: CHROME ?? undefined, headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 950 } });
  const page = await context.newPage();
  const consoleErrors = [];
  page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text()); });
  page.on('pageerror', (error) => consoleErrors.push(error.message));

  // ---- 1) 直接打开节点页：降级入口 ----
  await page.goto(server.origin + `/nodes/${encodeURIComponent(KEY_NODE)}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(700);
  const direct = await page.evaluate(() => {
    const nav = document.querySelector('.node-return');
    return {
      buttons: [...(nav?.querySelectorAll('a') ?? [])].map((link) => ({ text: link.textContent.trim(), href: link.getAttribute('href') })),
      hint: nav?.querySelector('.muted')?.textContent?.trim() ?? '',
    };
  });
  check('直接打开节点页：给「在网络视图里打开这个节点」而不是假的「回到」',
    direct.buttons.length === 1 && direct.buttons[0].text.includes('在网络视图里打开这个节点'),
    JSON.stringify(direct.buttons));
  check('并写明为什么没有「刚才那张图」（分享链接 / 书签）',
    direct.hint.includes('不是从网络视图点进来') && direct.hint.includes('新建一张只含它的图'),
    direct.hint.slice(0, 60));
  check('降级入口只带这一个节点（不在网络里凭空铺开一张图）',
    direct.buttons[0].href === `/network?nodes=${encodeURIComponent(KEY_NODE)}`, direct.buttons[0].href);

  // 点它 → 网络里只有这一个节点。
  await page.locator('.node-return a').first().click();
  await page.waitForURL(/\/network\?nodes=/, { timeout: 10000 });
  await page.waitForTimeout(700);
  const openedInNetwork = await page.evaluate(() => ({
    url: location.pathname + location.search,
    cards: document.querySelectorAll('[data-node]').length,
  }));
  check('降级入口真的打开网络视图并含该节点',
    openedInNetwork.url.includes('nodes=') && openedInNetwork.cards >= 1, JSON.stringify(openedInNetwork));

  // ---- 2) 从网络视图点进节点：真「回到网络视图」----
  /*
   * 空网络（没有 `nodes` 参数）会给出「推荐加入」列表——那是从网络进入节点最自然的一条路，
   * 也正是「打开具体节点之后要能回来」的起点。因此这一档走空网络 + 推荐面板。
   *
   * 清掉**本次学习的暂存**（sessionStorage 的 `mcs-network-draft-v1`）：2026-10-13 起
   * 本页在没有 `nodes` 参数时会自动恢复上次离开时那张图，而上面第 1 段已经往画布里放过节点。
   * 这一套要核的是「从空网络进去、加两个节点、再回来」，不是自动恢复（那一套在
   * `tests/network-draft-page.mjs`），因此这里显式把暂存清掉，让起点确定为空。
   */
  await page.goto(`${server.origin}/network`, { waitUntil: 'networkidle' });
  await page.evaluate(() => sessionStorage.removeItem('mcs-network-draft-v1'));
  await page.goto(`${server.origin}/network`, { waitUntil: 'networkidle' });
  /*
   * 打开「推荐加入」面板——空网络下它列出 `bg:*` 那 8 个起始节点，是从网络进入节点最自然的入口。
   *
   * 两个坑：① 只等 `networkidle` 不够，本体图还在路上时 DOM 里一个节点链接都没有；
   * ② 面板的默认开合**按「来过没有」分档**（`VISITED_KEY`）——前面几段已经来过这一站，
   * 因此回访档可能不收「推荐加入」这一栏。所以这里显式把开关打开，不依赖默认值。
   */
  if (await page.locator('.recommend-title').count() === 0) await openPanel(page, '推荐加入');
  await page.waitForSelector('.recommend-title', { timeout: 15000 });
  await page.waitForTimeout(300);

  const panelButtons = await page.evaluate(() => {
    const openers = [...document.querySelectorAll('a[href*="from=network"]')];
    return {
      url: location.pathname + location.search,
      title: document.title,
      bodyText: (document.body.innerText ?? '').slice(0, 120),
      openers: openers.map((link) => ({ text: link.textContent.trim().slice(0, 24), href: link.getAttribute('href') })),
      recommendCount: document.querySelectorAll('.recommend-title').length,
      nodeLinks: [...document.querySelectorAll('a')].map((link) => link.getAttribute('href') ?? '')
        .filter((href) => href.includes('/nodes/')).slice(0, 6),
      headings: [...document.querySelectorAll('h2, h3')].map((h) => h.textContent.trim()).slice(0, 12),
    };
  });
  check('网络里的节点链接都带上「从网络来」的标记',
    panelButtons.openers.length >= 1 && panelButtons.openers.every((item) => item.href.includes('from=network')),
    JSON.stringify(panelButtons));

  // 先把两个节点真的加进图里，于是「回到网络视图」有一个**具体的图**可以核对。
  const addButtons = page.locator('.recommend-list li .card-actions button', { hasText: '加入网络' });
  await addButtons.nth(0).click();
  await page.waitForTimeout(500);
  await addButtons.nth(1).click();
  await page.waitForTimeout(700);
  const addedIds = await page.evaluate(() => [...new URLSearchParams(location.search).get('nodes').split(',')]);
  check('先往图里加两个节点（后面要核对回到的是这张图）',
    addedIds.length === 2, JSON.stringify(addedIds));

  /*
   * 从「推荐加入」的标题链接点进节点：这是空网络起步时最自然的入口。
   * 注意标题链接**只打开节点页**，不把节点加进图——加图是旁边那个按钮的事。
   */
  const target = await page.evaluate(() => {
    const link = document.querySelector('a[href*="from=network"]');
    return link ? { href: link.getAttribute('href'), node: decodeURIComponent(link.getAttribute('href')).match(/\/nodes\/([^?]+)/)?.[1] ?? '' } : null;
  });
  if (!target) throw new Error('网络页上找不到带 from=network 的节点链接');
  await page.locator(`a[href="${target.href}"]`).first().click();
  await page.waitForURL(/\/nodes\/.*from=network/, { timeout: 10000 });
  await page.waitForTimeout(800);

  const fromNetwork = await page.evaluate(() => {
    const nav = document.querySelector('.node-return');
    return {
      url: location.pathname + location.search,
      buttons: [...(nav?.querySelectorAll('a') ?? [])].map((link) => ({ text: link.textContent.trim(), href: link.getAttribute('href') })),
      hint: nav?.querySelector('.muted')?.textContent?.trim() ?? '',
    };
  });
  check('从网络点进节点：给「← 回到网络视图」',
    fromNetwork.buttons.length === 1 && fromNetwork.buttons[0].text.includes('回到网络视图'),
    JSON.stringify(fromNetwork.buttons));
  /*
   * 关键性质：返回地址指向**点进来时那张图**（刚才加进去的两个节点都在），而不是一个空网络。
   */
  check('返回地址指向同一张图（刚加入的两个节点都在）',
    fromNetwork.buttons[0].href.startsWith('/network?') && addedIds.every((id) => decodeURIComponent(fromNetwork.buttons[0].href).includes(id)),
    JSON.stringify({ added: addedIds, back: fromNetwork.buttons[0].href }));
  check('并写明「回到你刚才那张图」', fromNetwork.hint.includes('刚才那张图'), fromNetwork.hint.slice(0, 40));

  // ---- 3) 真点回去：回到同一张图 ----
  await page.locator('.node-return a').first().click();
  await page.waitForURL(/\/network/, { timeout: 10000 });
  await page.waitForTimeout(900);
  const returned = await page.evaluate(() => ({
    search: decodeURIComponent(location.search),
    cards: document.querySelectorAll('[data-node]').length,
  }));
  check('点回去落在同一张图上（URL 里那两个节点都在）',
    addedIds.every((id) => returned.search.includes(id)), JSON.stringify({ added: addedIds, url: returned.search }));
  check('回去之后图里确实有卡片（不是空网络）', returned.cards >= 2, String(returned.cards));

  // ---- 4) 回放与英文站：来路标记在**链接属性**上就带着（不依赖面板布局）----
  await page.goto(`${server.origin}/network?nodes=${GRAPH_NODES.map(encodeURIComponent).join(',')}&play=1&goal=${encodeURIComponent('top:topological-manifold')}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);
  /* 面板的开合状态存在本机、跨页面保留——因此这里照样显式打开它，不假设它开着。 */
  await openPanel(page, '推荐加入');
  await page.waitForTimeout(400);
  const replayHrefs = await page.evaluate(() => [...document.querySelectorAll('a')]
    .map((link) => link.getAttribute('href') ?? '')
    .filter((href) => href.includes('/nodes/')));
  check('回放模式下节点链接也带着「从网络来」的标记',
    replayHrefs.length > 0 && replayHrefs.every((href) => href.includes('from=network')),
    JSON.stringify(replayHrefs.slice(0, 3)));
  /*
   * 回放参数由 `networkSearchOf` 保存，纯函数那一侧已经逐条钉住
   * （`tests/network-return.test.mjs`）；这一套只核对界面这一侧真的走了那条路。
   */

  // ---- 5) 英文站：链接与返回地址都在 /en 下（不把英文读者送回中文页）----
  await page.goto(`${server.origin}/en/network?nodes=${GRAPH_NODES.map(encodeURIComponent).join(',')}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);
  await openPanel(page, 'Suggested additions');
  await page.waitForTimeout(400);
  const enHrefs = await page.evaluate(() => [...document.querySelectorAll('a')]
    .map((link) => link.getAttribute('href') ?? '')
    .filter((href) => href.includes('/nodes/')));
  check('英文网络页：节点链接是 /en/nodes/… 且带 from=network',
    enHrefs.length > 0 && enHrefs.every((href) => href.startsWith('/en/nodes/') && href.includes('from=network')),
    JSON.stringify(enHrefs.slice(0, 3)));

  // 英文节点页本身：返回链接也必须是 /en/network（中文存的图不能把英文读者送回去）。
  await page.evaluate(() => {
    const link = [...document.querySelectorAll('a')].find((item) => (item.getAttribute('href') ?? '').includes('/nodes/')
      && (item.getAttribute('href') ?? '').includes('from=network'));
    if (link) link.click();
  });
  await page.waitForURL(/\/en\/nodes\/.*from=network/, { timeout: 10000 });
  await page.waitForTimeout(700);
  const enBack = await page.evaluate(() => ({
    text: document.querySelector('.node-return a')?.textContent?.trim() ?? '',
    href: document.querySelector('.node-return a')?.getAttribute('href') ?? '',
  }));
  check('英文站：返回链接是 /en/network（不把读者送回中文页）', enBack.href.startsWith('/en/network?'), enBack.href);
  check('英文站：按钮文案是英文', enBack.text.includes('Back to the network'), enBack.text);

  // ---- 6) 窄屏 ----
  const narrow = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const narrowPage = await narrow.newPage();
  await narrowPage.goto(`${server.origin}/nodes/${encodeURIComponent(KEY_NODE)}?from=network`, { waitUntil: 'networkidle' });
  await narrowPage.waitForTimeout(700);
  const narrowState = await narrowPage.evaluate(() => ({
    present: document.querySelectorAll('.node-return a').length,
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  check('窄屏（390px）有返回入口且没有横向溢出',
    narrowState.present === 1 && narrowState.scrollWidth <= narrowState.clientWidth + 2,
    JSON.stringify(narrowState));

  check('没有控制台错误', consoleErrors.length === 0, consoleErrors.slice(0, 3).join(' | '));
} finally {
  await browser?.close();
  await server?.cleanup();
  await server?.close?.();
}

if (failures.length) {
  console.log('\n「回到网络视图」验收失败：');
  for (const failure of failures) console.log('- ' + failure);
  process.exit(1);
}
console.log('\n「回到网络视图」验收通过。');
process.exit(0);
