import { startTestServer } from './helpers.mjs';

import { PLAYWRIGHT_SPECIFIER as PLAYWRIGHT, CHROME_PATH as CHROME } from './browser-runtime.mjs';

/**
 * 网络视图的**右键节点菜单**（2026-10 加）。
 *
 * 用户的要求：「网络视图中增加功能：右键点击节点可选择一键添加所有硬前置。」
 *
 * 实现的两处约定：
 * 1. 右键从「点一下即移出视图」改成**打开一张小菜单**——菜单里既有新的「加入全部硬前置」，
 *    也有原来的「从视图移出」（旧行为换了个入口，没有丢）；
 * 2. 「全部硬前置」= **传递闭包**：先会它、才会它的前置，一层层都加进来
 *    （`web/src/hard-prereq-closure.ts`；算法本身另有单元测试 `tests/hard-prereq-closure.test.mjs`）。
 *
 * 这一套在**真浏览器**里核对端到端行为，期望值由测试自己从 `/api/v2/ontology/graph` 重算一遍
 * （不 import 被测实现），因此「一个不多、一个不少」是可核的，而不是对着同一份代码自证：
 *
 * - 右键打开菜单，且不改视图；
 * - 菜单报的数量与本体重算的闭包一致；
 * - 点一下真的把那批节点加进视图（URL 与画布都对）；
 * - 都已在视图里时该项禁用并说明；没有登记硬前置时也如实说明；
 * - Esc / 点空白都能关；键盘（Shift+F10）也能打开；
 * - 全程没有控制台错误。
 *
 * 为什么单独一个文件：这一套只需要一个节点就能跑，与「长按强关联圈」那套（`network-picker.mjs`）
 * 的夹具互不干扰，失败语义也不同——它红了说明**菜单这条交互**坏了，而不是手势或候选排序。
 */
const failures = [];
function check(name, condition, detail = '') {
  if (condition) console.log('  ✓ ' + name);
  else { failures.push(name + (detail ? ' :: ' + detail : '')); console.log('  ✗ ' + name + (detail ? ' :: ' + detail : '')); }
}

const ROOT = 'top:topological-manifold';

/** 右键打开菜单，并取回菜单上的读数。 */
async function openMenu(page, id) {
  const node = page.locator(`.network-node[data-node="${id}"]`);
  await node.waitFor();
  const point = await page.evaluate((nodeId) => {
    const element = document.querySelector(`.network-node[data-node="${nodeId}"]`);
    const rect = element.querySelector('rect').getBoundingClientRect();
    const spots = [
      [rect.left + rect.width / 2, rect.top + rect.height / 2],
      [rect.left + rect.width * 0.3, rect.top + rect.height / 2],
      [rect.left + rect.width / 2, rect.top + 4],
    ];
    for (const [x, y] of spots) {
      if (x < 0 || y < 0 || x > window.innerWidth || y > window.innerHeight) continue;
      const top = document.elementFromPoint(x, y);
      if (top && element.contains(top)) return { x, y };
    }
    return null;
  }, id);
  if (!point) throw new Error(`找不到能点中 ${id} 的位置（被悬浮框盖住？）`);
  await page.mouse.move(point.x, point.y);
  await page.mouse.down({ button: 'right' });
  await page.mouse.up({ button: 'right' });
  await page.locator('.node-menu').waitFor({ timeout: 4000 });
  return readMenu(page);
}

/** 菜单上的读数：数量、还差几个、深度、两项的文案与禁用状态。 */
function readMenu(page) {
  return page.evaluate(() => {
    const menu = document.querySelector('.node-menu');
    const add = menu?.querySelector('.node-menu-item[data-action="add-hard-prereqs"]');
    const remove = menu?.querySelector('.node-menu-item[data-action="remove-from-view"]');
    return {
      node: menu?.getAttribute('data-node') ?? null,
      aria: menu?.getAttribute('aria-label') ?? '',
      total: Number(menu?.getAttribute('data-prereq-total') ?? -1),
      missing: Number(menu?.getAttribute('data-prereq-missing') ?? -1),
      depth: Number(menu?.getAttribute('data-prereq-depth') ?? -1),
      addText: add?.textContent?.trim() ?? '',
      addDisabled: add?.disabled ?? null,
      removeText: remove?.textContent?.trim() ?? '',
      note: menu?.querySelector('.node-menu-note')?.textContent?.replace(/\s+/g, ' ').trim() ?? '',
    };
  });
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

  /*
   * 期望值：测试自己从本体关系里算一遍硬前置闭包（不 import 被测模块的同一个实现）。
   */
  await page.goto(server.origin + '/network?nodes=' + encodeURIComponent(ROOT), { waitUntil: 'networkidle' });
  await page.waitForSelector('.network-node');
  const expected = await page.evaluate(async (root) => {
    const graph = await (await fetch('/api/v2/ontology/graph')).json();
    const found = new Set();
    let frontier = [root];
    while (frontier.length) {
      const next = [];
      for (const node of frontier) {
        for (const relation of graph.data.relations) {
          if (relation.kind !== 'hardPrereq' || relation.to !== node) continue;
          if (found.has(relation.from) || relation.from === root) continue;
          found.add(relation.from);
          next.push(relation.from);
        }
      }
      frontier = next;
    }
    return [...found].sort();
  }, ROOT);
  check('夹具前提：这个节点确实登记了硬前置（含间接）', expected.length >= 5, `闭包 ${expected.length} 个`);

  // ---- 右键打开菜单，且不改视图 ----
  const before = await page.locator('.network-node').count();
  const menu = await openMenu(page, ROOT);
  const nodesAfterOpen = await page.locator('.network-node').count();
  check('右键打开菜单，且不直接改动视图',
    menu.node === ROOT && nodesAfterOpen === before,
    JSON.stringify({ menu: menu.node, before, after: nodesAfterOpen }));
  check('菜单标题里带节点名（读屏可辨）', menu.aria.includes('节点菜单'), menu.aria);
  check('菜单有两项：加入全部硬前置、从视图移出',
    menu.addText.includes('硬前置') && menu.removeText.includes('从视图移出'),
    JSON.stringify({ add: menu.addText, remove: menu.removeText }));
  check('菜单报的数量与本体重算的闭包一致，并给出层数',
    menu.total === expected.length && menu.missing === expected.length && menu.depth >= 2,
    JSON.stringify({ ...menu, expected: expected.length }));
  check('说明里写清含间接前置、只改本页显示',
    menu.note.includes('间接') && menu.note.includes('不写本体') && menu.note.includes('学习记录'),
    menu.note);

  // ---- 点一下：把闭包加进视图 ----
  await page.locator('.node-menu-item[data-action="add-hard-prereqs"]').click();
  await page.waitForTimeout(1200);
  const afterAdd = await page.evaluate(() => ({
    ids: (new URLSearchParams(location.search).get('nodes') ?? '').split(',').filter(Boolean).sort(),
    canvas: [...document.querySelectorAll('.network-node')].map((node) => node.getAttribute('data-node')).sort(),
    menu: Boolean(document.querySelector('.node-menu')),
    notice: document.querySelector('.network-notice')?.textContent?.replace(/\s+/g, ' ').trim() ?? '',
  }));
  check('加进来的正是本体的硬前置闭包（一个不多、一个不少）',
    JSON.stringify(afterAdd.ids) === JSON.stringify([ROOT, ...expected].sort())
      && JSON.stringify(afterAdd.canvas) === JSON.stringify(afterAdd.ids),
    JSON.stringify({ got: afterAdd.ids, expected: expected.length }));
  check('点完自动收起菜单，并说明加了几个、只改本页显示',
    !afterAdd.menu && afterAdd.notice.includes(`${expected.length} 个硬前置`) && afterAdd.notice.includes('只改本页显示'),
    afterAdd.notice.slice(0, 180));

  // ---- 都已在视图里：禁用并说明，不装作可点 ----
  await page.goto(
    server.origin + '/network?nodes=' + encodeURIComponent([ROOT, ...expected].join(',')),
    { waitUntil: 'networkidle' },
  );
  await page.waitForSelector('.network-node');
  await page.waitForTimeout(1000);
  const allPresent = await openMenu(page, ROOT);
  check('都已在本视图里时该项禁用并说明',
    allPresent.addDisabled === true && allPresent.missing === 0 && allPresent.addText.includes('都已在本视图里'),
    JSON.stringify(allPresent));
  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);
  check('Esc 关闭菜单', (await page.locator('.node-menu').count()) === 0);

  // ---- 键盘也能打开（Shift+F10 = 系统约定的上下文菜单键）----
  /*
   * 换一个「还有前置没加入」的视图再试键盘：上面那个视图里硬前置已经全在，
   * 按钮是**禁用**的，焦点按设计会落到第一个可用项（移出视图）——那是正确行为，
   * 只是不该拿它来验「焦点在第一项」。
   */
  await page.goto(server.origin + '/network?nodes=' + encodeURIComponent(ROOT), { waitUntil: 'networkidle' });
  await page.waitForSelector('.network-node');
  await page.waitForTimeout(900);
  await page.locator(`.network-node[data-node="${ROOT}"]`).focus();
  await page.keyboard.press('Shift+F10');
  await page.locator('.node-menu').waitFor({ timeout: 3000 });
  const byKeyboard = await readMenu(page);
  check('键盘 Shift+F10 也能打开同一个菜单', byKeyboard.node === ROOT, JSON.stringify(byKeyboard));
  // 菜单打开时焦点落在第一项上，回车即可执行。
  const focused = await page.evaluate(() => document.activeElement?.getAttribute('data-action') ?? null);
  check('打开后焦点在第一项（键盘可直接回车）', focused === 'add-hard-prereqs', String(focused));
  await page.keyboard.press('Enter');
  await page.waitForTimeout(1200);
  const byEnter = await page.evaluate(() => ({
    ids: (new URLSearchParams(location.search).get('nodes') ?? '').split(',').filter(Boolean).sort(),
    menu: Boolean(document.querySelector('.node-menu')),
  }));
  check('回车真的执行了那一项（键盘路径与鼠标同一条）',
    !byEnter.menu && JSON.stringify(byEnter.ids) === JSON.stringify([ROOT, ...expected].sort()),
    JSON.stringify({ got: byEnter.ids.length, expected: expected.length + 1 }));

  // ---- 没有登记硬前置的节点：禁用 + 如实说明；点空白关闭 ----
  await page.goto(server.origin + '/network?nodes=' + encodeURIComponent('bg:set:function'), { waitUntil: 'networkidle' });
  await page.waitForSelector('.network-node');
  await page.waitForTimeout(800);
  const bare = await openMenu(page, 'bg:set:function');
  check('没有硬前置的节点：禁用并如实说明',
    bare.total === 0 && bare.addDisabled === true && bare.addText.includes('没有登记硬前置'),
    JSON.stringify(bare));
  const bareBox = await page.locator('.network-node[data-node="bg:set:function"]').boundingBox();
  await page.mouse.click(bareBox.x + 4, bareBox.y + bareBox.height + 120);
  await page.waitForTimeout(250);
  check('点空白处关闭菜单', (await page.locator('.node-menu').count()) === 0);

  // ---- 菜单里的「从视图移出」仍然真的移出（旧行为换了个入口）----
  await page.goto(server.origin + '/network?nodes=' + encodeURIComponent(`${ROOT},top:space`), { waitUntil: 'networkidle' });
  await page.waitForSelector('.network-node');
  await page.waitForTimeout(900);
  const beforeRemove = await page.locator('.network-node').count();
  await openMenu(page, 'top:space');
  await page.locator('.node-menu-item[data-action="remove-from-view"]').click();
  await page.waitForTimeout(500);
  const removed = await page.evaluate(() => ({
    nodes: document.querySelectorAll('.network-node').length,
    menu: Boolean(document.querySelector('.node-menu')),
    notice: document.querySelector('.network-notice')?.textContent?.replace(/\s+/g, ' ').trim() ?? '',
  }));
  check('菜单里的「从视图移出」仍然真的移出',
    removed.nodes === beforeRemove - 1 && !removed.menu && removed.notice.includes('移出视图'),
    JSON.stringify({ ...removed, before: beforeRemove }));

  // ---- 详情面板里的同一条路径（触摸设备没有右键，菜单在那儿打不开）----
  await page.goto(server.origin + '/network?nodes=' + encodeURIComponent(ROOT), { waitUntil: 'networkidle' });
  await page.waitForSelector('.network-node');
  await page.waitForTimeout(900);
  await page.locator(`.network-node[data-node="${ROOT}"]`).click();
  const detail = page.locator('.floating-panel[aria-label="节点详情"]');
  await detail.waitFor();
  const detailButton = detail.locator('[data-action="add-hard-prereqs"]');
  await detailButton.waitFor({ timeout: 3000 });
  const detailText = (await detailButton.textContent())?.trim() ?? '';
  check('详情面板里也有同一条路径，并写着还差几个',
    detailText.includes(`${expected.length} 个`),
    detailText);
  await detailButton.click();
  await page.waitForTimeout(1200);
  const afterDetail = await page.evaluate(() => ({
    ids: (new URLSearchParams(location.search).get('nodes') ?? '').split(',').filter(Boolean).sort(),
    // 加完之后没有可加的了：按钮应当从面板上消失（详情面板是任务入口，没得做就不占位置）。
    buttonGone: !document.querySelector('.floating-panel[aria-label="节点详情"] [data-action="add-hard-prereqs"]'),
  }));
  check('详情面板里点它得到同一批节点，且按钮随之消失',
    JSON.stringify(afterDetail.ids) === JSON.stringify([ROOT, ...expected].sort()) && afterDetail.buttonGone,
    JSON.stringify({ got: afterDetail.ids.length, expected: expected.length + 1, buttonGone: afterDetail.buttonGone }));

  check('右键菜单没有控制台错误', consoleErrors.length === 0, consoleErrors.join(' | '));
} finally {
  await browser?.close();
  await server.cleanup();
}

if (failures.length > 0) {
  console.error('\n右键节点菜单验收失败：\n- ' + failures.join('\n- '));
  process.exit(1);
}
console.log('\n右键节点菜单验收通过。');
