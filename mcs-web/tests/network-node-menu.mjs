import { startTestServer } from './helpers.mjs';

import { PLAYWRIGHT_SPECIFIER as PLAYWRIGHT, CHROME_PATH as CHROME } from './browser-runtime.mjs';

/**
 * 网络视图的**右键节点菜单**（2026-10 加；2026-10-22 加「一阶」）。
 *
 * 用户的要求：「网络视图中增加功能：右键点击节点可选择一键添加所有硬前置。」
 *
 * 实现的两处约定：
 * 1. 右键从「点一下即移出视图」改成**打开一张小菜单**——菜单里有「加入一阶硬前置」
 *    「加入全部硬前置」，也有原来的「从视图移出」（旧行为换了个入口，没有丢）；
 * 2. 「一阶」只收**直接**指向它的硬前置（`maxDepth: 1`），「全部」收**传递闭包**
 *    （先会它、才会它的前置，一层层都加进来）。两者共用
 *    `web/src/hard-prereq-closure.ts`（算法本身另有单元测试 `tests/hard-prereq-closure.test.mjs`）。
 *
 * 这一套在**真浏览器**里核对端到端行为，期望值由测试自己从 `/api/v2/ontology/graph` 重算一遍
 * （不 import 被测实现），因此「一个不多、一个不少」是可核的，而不是对着同一份代码自证：
 *
 * - 右键打开菜单，且不改视图；
 * - 菜单报的数量与本体重算的一阶 / 全部闭包一致；
 * - 点「一阶」只加直接前置，点「全部」才加间接前置（URL 与画布都对）；
 * - 都已在视图里时对应项禁用并说明；没有登记硬前置时也如实说明；
 * - 详情面板里也有这两条路径（触摸设备没有右键）；
 * - Esc / 点空白都能关；键盘（Shift+F10）也能打开，且焦点落在第一项（一阶）；
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

/** 菜单上的读数：硬前置 / 按关系加入的计数、文案、禁用状态与项的顺序。 */
function readMenu(page) {
  return page.evaluate(() => {
    const menu = document.querySelector('.node-menu');
    const add = menu?.querySelector('.node-menu-item[data-action="add-hard-prereqs"]');
    const direct = menu?.querySelector('.node-menu-item[data-action="add-direct-hard-prereqs"]');
    const remove = menu?.querySelector('.node-menu-item[data-action="remove-from-view"]');
    const relationItems = [...(menu?.querySelectorAll('.node-menu-item[data-action="add-relation-objects"]') ?? [])]
      .map((item) => ({
        kind: item.getAttribute('data-kind'),
        total: Number(item.getAttribute('data-total') ?? -1),
        missing: Number(item.getAttribute('data-missing') ?? -1),
        text: item.textContent?.trim() ?? '',
        disabled: item.disabled ?? null,
      }));
    return {
      node: menu?.getAttribute('data-node') ?? null,
      aria: menu?.getAttribute('aria-label') ?? '',
      total: Number(menu?.getAttribute('data-prereq-total') ?? -1),
      missing: Number(menu?.getAttribute('data-prereq-missing') ?? -1),
      depth: Number(menu?.getAttribute('data-prereq-depth') ?? -1),
      directTotal: Number(menu?.getAttribute('data-prereq-direct-total') ?? -1),
      directMissing: Number(menu?.getAttribute('data-prereq-direct-missing') ?? -1),
      relationKinds: Number(menu?.getAttribute('data-relation-kinds') ?? -1),
      order: [...(menu?.querySelectorAll('.node-menu-item[data-action="add-direct-hard-prereqs"], .node-menu-item[data-action="add-hard-prereqs"]') ?? [])]
        .map((item) => item.getAttribute('data-action')),
      relationItems,
      relationSection: menu?.querySelector('.node-menu-section')?.textContent?.trim() ?? '',
      addText: add?.textContent?.trim() ?? '',
      addDisabled: add?.disabled ?? null,
      directText: direct?.textContent?.trim() ?? '',
      directDisabled: direct?.disabled ?? null,
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
   * 期望值：测试自己从本体关系里算三套——
   * 一阶硬前置、全部硬前置闭包、按关系种类的直接对象（双向、不含 hardPrereq）。
   * 不 import 被测模块的同一个实现。
   */
  await page.goto(server.origin + '/network?nodes=' + encodeURIComponent(ROOT), { waitUntil: 'networkidle' });
  await page.waitForSelector('.network-node');
  const expected = await page.evaluate(async (root) => {
    const graph = await (await fetch('/api/v2/ontology/graph')).json();
    const direct = [];
    for (const relation of graph.data.relations) {
      if (relation.kind !== 'hardPrereq' || relation.to !== root || relation.from === root) continue;
      if (!direct.includes(relation.from)) direct.push(relation.from);
    }
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
    const related = {};
    for (const relation of graph.data.relations) {
      if (relation.from !== root && relation.to !== root) continue;
      const other = relation.from === root ? relation.to : relation.from;
      if (other === root) continue;
      if (!related[relation.kind]) related[relation.kind] = [];
      if (!related[relation.kind].includes(other)) related[relation.kind].push(other);
    }
    delete related.hardPrereq;
    return { closure: [...found].sort(), direct: [...direct].sort(), related };
  }, ROOT);
  check('夹具前提：这个节点登记了一阶与间接硬前置',
    expected.direct.length >= 1 && expected.closure.length >= 5 && expected.direct.length < expected.closure.length,
    JSON.stringify({ direct: expected.direct.length, closure: expected.closure.length }));
  check('夹具前提：这个节点还登记了可一键加入的关系对象',
    Object.keys(expected.related).length >= 2 && Object.values(expected.related).every((nodes) => nodes.length >= 1),
    JSON.stringify(expected.related));

  // ---- 右键打开菜单，且不改视图 ----
  const before = await page.locator('.network-node').count();
  const menu = await openMenu(page, ROOT);
  const nodesAfterOpen = await page.locator('.network-node').count();
  check('右键打开菜单，且不直接改动视图',
    menu.node === ROOT && nodesAfterOpen === before,
    JSON.stringify({ menu: menu.node, before, after: nodesAfterOpen }));
  check('菜单标题里带节点名（读屏可辨）', menu.aria.includes('节点菜单'), menu.aria);
  check('硬前置菜单项有两项（一阶在前、全部在后），另有「从视图移出」',
    menu.order.join(',') === 'add-direct-hard-prereqs,add-hard-prereqs'
      && menu.directText.includes('一阶硬前置') && menu.addText.includes('硬前置')
      && menu.removeText.includes('从视图移出'),
    JSON.stringify({ order: menu.order, direct: menu.directText, add: menu.addText, remove: menu.removeText }));
  check('菜单报的一阶 / 全部数量与本体重算一致，并给出层数',
    menu.directTotal === expected.direct.length && menu.directMissing === expected.direct.length
      && menu.total === expected.closure.length && menu.missing === expected.closure.length
      && menu.depth >= 2,
    JSON.stringify({ ...menu, expected }));
  check('说明里写清一阶 / 全部的区别、只改本页显示',
    menu.note.includes('一阶') && menu.note.includes('间接') && menu.note.includes('不写本体') && menu.note.includes('学习记录'),
    menu.note);
  const menuBounds = await page.evaluate(() => {
    const menuRect = document.querySelector('.node-menu')?.getBoundingClientRect();
    const stageRect = document.querySelector('.network-stage')?.getBoundingClientRect();
    const rect = (value) => value ? { left: value.left, top: value.top, right: value.right, bottom: value.bottom } : null;
    return { menu: rect(menuRect), stage: rect(stageRect) };
  });
  check('菜单变长后完整落在画布 stage 内（边缘右键不会伸出窗口）',
    Boolean(menuBounds.menu && menuBounds.stage)
      && menuBounds.menu.left >= menuBounds.stage.left - 1
      && menuBounds.menu.top >= menuBounds.stage.top - 1
      && menuBounds.menu.right <= menuBounds.stage.right + 1
      && menuBounds.menu.bottom <= menuBounds.stage.bottom + 1,
    JSON.stringify(menuBounds));
  const expectedRelationKinds = Object.keys(expected.related).sort();
  const menuRelationKinds = menu.relationItems.map((item) => item.kind).sort();
  check('按关系加入：列出这个节点真有的种类，数量与本体一致',
    menu.relationSection.includes('按关系加入')
      && menu.relationKinds === expectedRelationKinds.length
      && JSON.stringify(menuRelationKinds) === JSON.stringify(expectedRelationKinds)
      && menu.relationItems.every((item) => item.total === expected.related[item.kind].length && item.missing === item.total),
    JSON.stringify({ section: menu.relationSection, items: menu.relationItems, expected: expected.related }));
  check('按关系加入：硬关系排在前面（这个夹具的第一项是放缩）',
    menu.relationItems[0]?.kind === 'scaling',
    JSON.stringify(menu.relationItems.map((item) => item.kind)));

  // ---- 点「一阶」：只加直接前置，间接前置仍留在外面 ----
  await page.locator('.node-menu-item[data-action="add-direct-hard-prereqs"]').click();
  await page.waitForTimeout(1200);
  const afterDirect = await page.evaluate(() => ({
    ids: (new URLSearchParams(location.search).get('nodes') ?? '').split(',').filter(Boolean).sort(),
    canvas: [...document.querySelectorAll('.network-node')].map((node) => node.getAttribute('data-node')).sort(),
    menu: Boolean(document.querySelector('.node-menu')),
    notice: [...document.querySelectorAll('.network-notice')].map(node => node.textContent.replace(/\s+/g, ' ').trim()).find(text => text.includes('一阶硬前置')) ?? '',
  }));
  check('「一阶」加进来的正是直接硬前置（一个不多、一个不少）',
    JSON.stringify(afterDirect.ids) === JSON.stringify([ROOT, ...expected.direct].sort())
      && JSON.stringify(afterDirect.canvas) === JSON.stringify(afterDirect.ids),
    JSON.stringify({ got: afterDirect.ids, expectedDirect: expected.direct }));
  check('「一阶」没有把间接前置一起拉进来',
    expected.closure.every((id) => expected.direct.includes(id) || !afterDirect.ids.includes(id)),
    JSON.stringify(afterDirect.ids));
  check('点完自动收起菜单，并说明只加了一层、只改本页显示',
    !afterDirect.menu && afterDirect.notice.includes(`${expected.direct.length} 个一阶硬前置`)
      && afterDirect.notice.includes('只加了一层') && afterDirect.notice.includes('只改本页显示'),
    afterDirect.notice.slice(0, 200));

  // ---- 一阶已在视图里：一阶项禁用并说明；全部项仍可补间接前置 ----
  const afterDirectMenu = await openMenu(page, ROOT);
  check('一阶已在视图里时：一阶项禁用并说明，全部项仍可点',
    afterDirectMenu.directMissing === 0 && afterDirectMenu.directDisabled === true
      && afterDirectMenu.directText.includes('都已在本视图里')
      && afterDirectMenu.missing === expected.closure.length - expected.direct.length
      && afterDirectMenu.addDisabled === false,
    JSON.stringify(afterDirectMenu));

  // ---- 再点「全部」：补上间接前置 ----
  await page.locator('.node-menu-item[data-action="add-hard-prereqs"]').click();
  await page.waitForTimeout(1200);
  const afterAdd = await page.evaluate(() => ({
    ids: (new URLSearchParams(location.search).get('nodes') ?? '').split(',').filter(Boolean).sort(),
    canvas: [...document.querySelectorAll('.network-node')].map((node) => node.getAttribute('data-node')).sort(),
    menu: Boolean(document.querySelector('.node-menu')),
    notice: [...document.querySelectorAll('.network-notice')].map(node => node.textContent.replace(/\s+/g, ' ').trim()).find(text => text.includes('只改本页显示')) ?? '',
  }));
  check('「全部」加进来的正是本体的硬前置闭包（一个不多、一个不少）',
    JSON.stringify(afterAdd.ids) === JSON.stringify([ROOT, ...expected.closure].sort())
      && JSON.stringify(afterAdd.canvas) === JSON.stringify(afterAdd.ids),
    JSON.stringify({ got: afterAdd.ids, expected: expected.closure.length }));
  check('点完自动收起菜单，并说明加了几个、只改本页显示',
    !afterAdd.menu && afterAdd.notice.includes(`${expected.closure.length - expected.direct.length} 个硬前置`)
      && afterAdd.notice.includes('只改本页显示'),
    afterAdd.notice.slice(0, 200));

  // ---- 都已在视图里：禁用并说明，不装作可点 ----
  await page.goto(
    server.origin + '/network?nodes=' + encodeURIComponent([ROOT, ...expected.closure].join(',')),
    { waitUntil: 'networkidle' },
  );
  await page.waitForSelector('.network-node');
  await page.waitForTimeout(1000);
  const allPresent = await openMenu(page, ROOT);
  check('都已在本视图里时两项都禁用并说明',
    allPresent.addDisabled === true && allPresent.missing === 0 && allPresent.addText.includes('都已在本视图里')
      && allPresent.directDisabled === true && allPresent.directMissing === 0
      && allPresent.directText.includes('都已在本视图里'),
    JSON.stringify(allPresent));
  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);
  check('Esc 关闭菜单', (await page.locator('.node-menu').count()) === 0);

  // ---- 键盘也能打开（Shift+F10 = 系统约定的上下文菜单键）----
  /*
   * 换一个「一阶 / 全部都没加入」的视图再试键盘：上面那个视图里硬前置已经全在，
   * 两项都是**禁用**的，焦点按设计会落到第一个可用项（移出视图）——那是正确行为，
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
  // 菜单打开时焦点落在第一项（一阶）上，回车即可执行——默认只加一层，不一次拉进整片背景。
  const focused = await page.evaluate(() => document.activeElement?.getAttribute('data-action') ?? null);
  check('打开后焦点在第一项「一阶硬前置」（键盘可直接回车）', focused === 'add-direct-hard-prereqs', String(focused));
  await page.keyboard.press('Enter');
  await page.waitForTimeout(1200);
  const byEnter = await page.evaluate(() => ({
    ids: (new URLSearchParams(location.search).get('nodes') ?? '').split(',').filter(Boolean).sort(),
    menu: Boolean(document.querySelector('.node-menu')),
  }));
  check('回车真的执行了第一项（键盘路径与鼠标同一条）',
    !byEnter.menu && JSON.stringify(byEnter.ids) === JSON.stringify([ROOT, ...expected.direct].sort()),
    JSON.stringify({ got: byEnter.ids.length, expected: expected.direct.length + 1 }));

  // ---- 按关系种类一键加入：只加该类直接相连的对象（两个方向都算） ----
  await page.goto(server.origin + '/network?nodes=' + encodeURIComponent(ROOT), { waitUntil: 'networkidle' });
  await page.waitForSelector('.network-node');
  await page.waitForTimeout(900);
  const relationMenu = await openMenu(page, ROOT);
  check('按关系加入的两端都能被找到（对偶 / 放缩等直接对象）',
    relationMenu.relationItems.some((item) => item.kind === 'scaling')
      && relationMenu.relationItems.some((item) => item.kind === 'application')
      && relationMenu.relationItems.some((item) => item.kind === 'crossDomain'),
    JSON.stringify(relationMenu.relationItems));

  await page.locator('.node-menu-item[data-action="add-relation-objects"][data-kind="scaling"]').click();
  await page.waitForTimeout(1200);
  const afterScaling = await page.evaluate(() => ({
    ids: (new URLSearchParams(location.search).get('nodes') ?? '').split(',').filter(Boolean).sort(),
    canvas: [...document.querySelectorAll('.network-node')].map((node) => node.getAttribute('data-node')).sort(),
    menu: Boolean(document.querySelector('.node-menu')),
    notice: [...document.querySelectorAll('.network-notice')].map(node => node.textContent.replace(/\s+/g, ' ').trim()).find(text => text.includes('关系对象')) ?? '',
  }));
  const expectedAfterScaling = [...new Set([ROOT, ...expected.related.scaling])].sort();
  check('按关系加入「放缩」：加进来的正是该类的直接对象（一个不多、一个不少）',
    JSON.stringify(afterScaling.ids) === JSON.stringify(expectedAfterScaling)
      && JSON.stringify(afterScaling.canvas) === JSON.stringify(afterScaling.ids),
    JSON.stringify({ got: afterScaling.ids, expected: expectedAfterScaling }));
  check('按关系加入：菜单关闭，并说明只加这一类、只改本页显示',
    !afterScaling.menu && afterScaling.notice.includes('「放缩」') && afterScaling.notice.includes('只改本页显示'),
    afterScaling.notice.slice(0, 200));

  const afterScalingMenu = await openMenu(page, ROOT);
  const scalingItem = afterScalingMenu.relationItems.find((item) => item.kind === 'scaling');
  const applicationItem = afterScalingMenu.relationItems.find((item) => item.kind === 'application');
  check('一种关系加完后：该项禁用并写明，其它种类仍可点',
    scalingItem?.disabled === true && scalingItem.missing === 0 && scalingItem.text.includes('都已在本视图里')
      && applicationItem?.disabled === false && (applicationItem?.missing ?? 0) > 0,
    JSON.stringify(afterScalingMenu.relationItems));
  await page.locator('.node-menu-item[data-action="add-relation-objects"][data-kind="application"]').click();
  await page.waitForTimeout(1200);
  const afterApplication = await page.evaluate(() => ({
    ids: (new URLSearchParams(location.search).get('nodes') ?? '').split(',').filter(Boolean).sort(),
    notice: [...document.querySelectorAll('.network-notice')].map(node => node.textContent.replace(/\s+/g, ' ').trim()).find(text => text.includes('关系对象')) ?? '',
  }));
  const expectedAfterApplication = [...new Set([ROOT, ...expected.related.scaling, ...expected.related.application])].sort();
  check('再按关系加入「应用」：只补这一类，不重复已有对象',
    JSON.stringify(afterApplication.ids) === JSON.stringify(expectedAfterApplication)
      && afterApplication.notice.includes('「应用」'),
    JSON.stringify({ got: afterApplication.ids, expected: expectedAfterApplication }));

  // ---- 没有登记硬前置的节点：禁用 + 如实说明；点空白关闭 ----
  await page.goto(server.origin + '/network?nodes=' + encodeURIComponent('bg:set:function'), { waitUntil: 'networkidle' });
  await page.waitForSelector('.network-node');
  await page.waitForTimeout(800);
  const bare = await openMenu(page, 'bg:set:function');
  check('没有硬前置的节点：两项都禁用并如实说明',
    bare.total === 0 && bare.directTotal === 0
      && bare.addDisabled === true && bare.addText.includes('没有登记硬前置')
      && bare.directDisabled === true && bare.directText.includes('没有登记一阶硬前置'),
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
    notice: [...document.querySelectorAll('.network-notice')].find(node => node.textContent.includes('移出视图'))?.textContent?.replace(/\s+/g, ' ').trim() ?? '',
  }));
  check('菜单里的「从视图移出」仍然真的移出',
    removed.nodes === beforeRemove - 1 && !removed.menu && removed.notice.includes('移出视图'),
    JSON.stringify({ ...removed, before: beforeRemove }));

  // ---- 详情面板里的同一组路径（触摸设备没有右键，菜单在那儿打不开）----
  await page.goto(server.origin + '/network?nodes=' + encodeURIComponent(ROOT), { waitUntil: 'networkidle' });
  await page.waitForSelector('.network-node');
  await page.waitForTimeout(900);
  await page.locator(`.network-node[data-node="${ROOT}"]`).click();
  const detail = page.locator('.floating-panel[aria-label="节点详情"]');
  await detail.waitFor();
  const detailDirectButton = detail.locator('[data-action="add-direct-hard-prereqs"]');
  const detailAllButton = detail.locator('[data-action="add-hard-prereqs"]');
  await detailDirectButton.waitFor({ timeout: 3000 });
  await detailAllButton.waitFor({ timeout: 3000 });
  const detailDirectText = (await detailDirectButton.textContent())?.trim() ?? '';
  const detailAllText = (await detailAllButton.textContent())?.trim() ?? '';
  check('详情面板里有两颗按钮，分别写清一阶 / 全部还差几个',
    detailDirectText.includes(`${expected.direct.length} 个`) && detailAllText.includes(`${expected.closure.length} 个`),
    JSON.stringify({ direct: detailDirectText, all: detailAllText }));

  await detailDirectButton.click();
  await page.waitForTimeout(1200);
  const afterDetailDirect = await page.evaluate(() => ({
    ids: (new URLSearchParams(location.search).get('nodes') ?? '').split(',').filter(Boolean).sort(),
    directGone: !document.querySelector('.floating-panel[aria-label="节点详情"] [data-action="add-direct-hard-prereqs"]'),
    allText: document.querySelector('.floating-panel[aria-label="节点详情"] [data-action="add-hard-prereqs"]')?.textContent?.trim() ?? '',
  }));
  check('详情面板里点「一阶」只加直接前置，且「全部」按钮仍在并更新了还差几个',
    JSON.stringify(afterDetailDirect.ids) === JSON.stringify([ROOT, ...expected.direct].sort())
      && afterDetailDirect.directGone
      && afterDetailDirect.allText.includes(`${expected.closure.length - expected.direct.length} 个`),
    JSON.stringify({ ...afterDetailDirect, direct: expected.direct.length }));

  await detailAllButton.click();
  await page.waitForTimeout(1200);
  const afterDetail = await page.evaluate(() => ({
    ids: (new URLSearchParams(location.search).get('nodes') ?? '').split(',').filter(Boolean).sort(),
    // 加完之后没有可加的了：两颗按钮都应当从面板上消失（详情面板是任务入口，没得做就不占位置）。
    buttonGone: !document.querySelector('.floating-panel[aria-label="节点详情"] [data-action="add-hard-prereqs"]')
      && !document.querySelector('.floating-panel[aria-label="节点详情"] [data-action="add-direct-hard-prereqs"]'),
  }));
  check('再点「全部」补上间接前置，两颗按钮都随之消失',
    JSON.stringify(afterDetail.ids) === JSON.stringify([ROOT, ...expected.closure].sort()) && afterDetail.buttonGone,
    JSON.stringify({ got: afterDetail.ids.length, expected: expected.closure.length + 1, buttonGone: afterDetail.buttonGone }));

  // ---- 详情面板里的「按关系加入」（触摸设备没有右键）----
  await page.goto(server.origin + '/network?nodes=' + encodeURIComponent(ROOT), { waitUntil: 'networkidle' });
  await page.waitForSelector('.network-node');
  await page.waitForTimeout(900);
  await page.locator(`.network-node[data-node="${ROOT}"]`).click();
  const detailForRelations = page.locator('.floating-panel[aria-label="节点详情"]');
  await detailForRelations.waitFor();
  const relationSelect = detailForRelations.locator('#network-detail-relation-kind');
  const relationButton = detailForRelations.locator('[data-action="add-relation-objects"]');
  await relationButton.waitFor({ timeout: 3000 });
  const initialRelationUi = await page.evaluate(() => {
    const panel = document.querySelector('.floating-panel[aria-label="节点详情"]');
    const select = panel?.querySelector('#network-detail-relation-kind');
    const button = panel?.querySelector('[data-action="add-relation-objects"]');
    return {
      options: [...(select?.options ?? [])].map((option) => option.textContent?.trim() ?? ''),
      value: select?.value ?? '',
      button: button?.textContent?.trim() ?? '',
      kind: button?.getAttribute('data-kind') ?? '',
    };
  });
  check('详情面板的「按关系加入」列出可加的种别，默认第一项是放缩',
    initialRelationUi.options.length === Object.keys(expected.related).length
      && initialRelationUi.options.some((text) => text.includes('放缩'))
      && initialRelationUi.options.some((text) => text.includes('应用'))
      && initialRelationUi.options.some((text) => text.includes('跨域'))
      && initialRelationUi.value === 'scaling' && initialRelationUi.button.includes('放缩'),
    JSON.stringify(initialRelationUi));

  await relationButton.click();
  await page.waitForTimeout(1200);
  const afterDetailScaling = await page.evaluate(() => {
    const panel = document.querySelector('.floating-panel[aria-label="节点详情"]');
    const select = panel?.querySelector('#network-detail-relation-kind');
    const button = panel?.querySelector('[data-action="add-relation-objects"]');
    return {
      ids: (new URLSearchParams(location.search).get('nodes') ?? '').split(',').filter(Boolean).sort(),
      value: select?.value ?? '',
      button: button?.textContent?.trim() ?? '',
      kind: button?.getAttribute('data-kind') ?? '',
    };
  });
  check('详情面板里加完放缩后：下拉自动落到下一类（应用）',
    JSON.stringify(afterDetailScaling.ids) === JSON.stringify(expectedAfterScaling)
      && afterDetailScaling.value === 'application' && afterDetailScaling.kind === 'application'
      && afterDetailScaling.button.includes('应用'),
    JSON.stringify(afterDetailScaling));

  await relationButton.click();
  await page.waitForTimeout(1200);
  const afterDetailApplication = await page.evaluate(() => {
    const panel = document.querySelector('.floating-panel[aria-label="节点详情"]');
    const select = panel?.querySelector('#network-detail-relation-kind');
    const button = panel?.querySelector('[data-action="add-relation-objects"]');
    return {
      ids: (new URLSearchParams(location.search).get('nodes') ?? '').split(',').filter(Boolean).sort(),
      value: select?.value ?? '',
      button: button?.textContent?.trim() ?? '',
      kind: button?.getAttribute('data-kind') ?? '',
    };
  });
  check('再加应用后：下拉自动落到跨域，URL 不重复已有节点',
    JSON.stringify(afterDetailApplication.ids) === JSON.stringify(expectedAfterApplication)
      && afterDetailApplication.value === 'crossDomain' && afterDetailApplication.kind === 'crossDomain'
      && afterDetailApplication.button.includes('跨域'),
    JSON.stringify(afterDetailApplication));

  await relationButton.click();
  await page.waitForTimeout(1200);
  const afterDetailRelations = await page.evaluate(() => {
    const panel = document.querySelector('.floating-panel[aria-label="节点详情"]');
    return {
      ids: (new URLSearchParams(location.search).get('nodes') ?? '').split(',').filter(Boolean).sort(),
      // 三类都加完：这一行没有可加的了，应当从面板上消失（与硬前置按钮同一取舍）。
      rowGone: !panel?.querySelector('.detail-relation-add'),
    };
  });
  const expectedAfterAllRelations = [...new Set([
    ROOT, ...expected.related.scaling, ...expected.related.application, ...expected.related.crossDomain,
  ])].sort();
  check('三类都加完后：「按关系加入」这一行从详情面板消失',
    JSON.stringify(afterDetailRelations.ids) === JSON.stringify(expectedAfterAllRelations) && afterDetailRelations.rowGone,
    JSON.stringify({ ...afterDetailRelations, expected: expectedAfterAllRelations }));

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
