import { startTestServer, toggleInAnimatedPage } from './helpers.mjs';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { isDeepStrictEqual } from 'node:util';
import { MCS_WEB_ROOT } from '../core/ontology.mjs';

import { PLAYWRIGHT_SPECIFIER as PLAYWRIGHT, CHROME_PATH as CHROME } from './browser-runtime.mjs';

/** 圈距从模块里取：界面上的判据与规则本体必须同源，写死一个 210 会随规则改动悄悄说谎。 */
const { ORDER_LAYOUT, coreCandidateOrder } = await import(pathToFileURL(resolve(MCS_WEB_ROOT, 'web/src/network-order.ts')).href);
const { buildEdges } = await import(pathToFileURL(resolve(MCS_WEB_ROOT, 'web/src/network.ts')).href);

const failures = [];
function check(name, condition, detail = '') {
  if (condition) console.log('  ✓ ' + name);
  else { failures.push(name + (detail ? ' :: ' + detail : '')); console.log('  ✗ ' + name + (detail ? ' :: ' + detail : '')); }
}

/**
 * 「摆位模式」的界面验收（2026-10-11 加）：学习顺序 / 逻辑核心。
 *
 * 用户的要求（原话）：「在网络视图中，为重排节点位置的按钮添加模式切换功能，区分倾向于学习顺序的
 * 节点位置和倾向于拟合节点天然的逻辑关系的节点位置……起始节点和核心节点的选择交给用户，
 * 在网络视图页面里添加这个可选项。」
 *
 * 规则本身由 `tests/network-order.test.mjs`（纯函数）钉住；这一套只钉**用户看得见的那条链**：
 * 下拉在不在、切过去画布真的按新规则重排、锚点能不能自己选、手动摆放是否仍然优先、
 * 切回自由摆位后是不是原来那张图、刷新之后还记不记得、英文站是不是也换了措辞。
 *
 * 失败语义与纯函数那一步不同：那一步红说明**判据**算错，这一步红说明**这条链断了一环**
 * （控件没渲染、切了没重排、选锚点没生效、手动位置被规则覆盖……）。
 */
const NODE_W = 172;
const NODE_H = 58;

function overlapPairs(nodes) {
  const pairs = [];
  for (let i = 0; i < nodes.length; i += 1) {
    for (let j = i + 1; j < nodes.length; j += 1) {
      if (Math.abs(nodes[i].x - nodes[j].x) < NODE_W && Math.abs(nodes[i].y - nodes[j].y) < NODE_H) {
        pairs.push(`${nodes[i].id}~${nodes[j].id}`);
      }
    }
  }
  return pairs;
}

const readState = (page) => page.evaluate(() => {
  const info = window.__mcsPlacementInfo ?? null;
  const order = window.__mcsNetworkOrder ?? null;
  const modeSelect = document.querySelector('select[aria-label*="摆位模式"]');
  const anchorSelect = document.querySelector('select[aria-label*="起始节点"], select[aria-label*="核心节点"]');
  const rectOf = (element) => {
    const rect = element?.getBoundingClientRect() ?? null;
    return rect ? { x: Math.round(rect.x), y: Math.round(rect.y), w: Math.round(rect.width), h: Math.round(rect.height) } : null;
  };
  return {
    mode: window.__mcsNetwork?.layoutMode ?? null,
    hudSpace: window.__mcsNetwork?.hudSpace ?? null,
    placed: (info?.placed ?? []).map((node) => ({ id: node.id, x: node.x, y: node.y })),
    domNodes: [...document.querySelectorAll('.network-node')].map((node) => ({
      id: node.getAttribute('data-node'),
      box: rectOf(node),
    })),
    order,
    modeSelect: modeSelect ? { value: modeSelect.value, options: [...modeSelect.options].map((option) => option.textContent), label: modeSelect.getAttribute('aria-label'), title: modeSelect.getAttribute('title') } : null,
    anchorSelect: anchorSelect ? {
      value: anchorSelect.value,
      label: anchorSelect.getAttribute('aria-label'),
      groups: [...anchorSelect.querySelectorAll('optgroup')].map((group) => ({ label: group.label, count: group.children.length })),
      options: [...anchorSelect.options].map((option) => ({ value: option.value, text: option.textContent })),
    } : null,
    notice: document.querySelector('.network-notice')?.textContent?.replace(/\s+/g, ' ').trim() ?? '',
    notices: [...document.querySelectorAll('.network-notice')].map((element) => element.textContent?.replace(/\s+/g, ' ').trim() ?? ''),
    keepManual: document.querySelector('input[aria-label="重排时保留手动摆放的节点"]')?.checked ?? null,
    overrides: JSON.parse(localStorage.getItem('mcs-network-positions-v1') ?? '{}'),
    placements: JSON.parse(localStorage.getItem('mcs-network-placements-v1') ?? '{}'),
    layoutMode: localStorage.getItem('mcs-network-layout-mode-v1'),
    layoutAnchor: localStorage.getItem('mcs-network-layout-anchor-v1'),
  };
});

const selectMode = async (page, value) => {
  await page.selectOption('select[aria-label*="摆位模式"]', value);
  await page.waitForTimeout(700);
};

const server = await startTestServer();
let browser;
try {
  const { chromium } = await import(PLAYWRIGHT);
  browser = await chromium.launch({ executablePath: CHROME ?? undefined, headless: true });
  const page = await (await browser.newContext({ viewport: { width: 1500, height: 950 } })).newPage();
  const consoleErrors = [];
  page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text()); });
  page.on('pageerror', (error) => consoleErrors.push(error.message));

  await page.goto(server.origin + '/network', { waitUntil: 'networkidle' });
  await page.evaluate(() => {
    localStorage.removeItem('mcs-network-placements-v1');
    localStorage.removeItem('mcs-network-positions-v1');
    localStorage.removeItem('mcs-network-layout-mode-v1');
    localStorage.removeItem('mcs-network-layout-anchor-v1');
  });
  await page.goto(server.origin + '/network', { waitUntil: 'networkidle' });
  await page.waitForTimeout(700);

  // 先铺开一批节点：两种模式都要在「一张真图」上验，空画布上的断言没有意义。
  await page.locator('input[aria-label="显示全部节点面板"]').check();
  await page.waitForTimeout(400);
  const checkbox = '.floating-panel[aria-label="全部节点"] .network-node-list input[type="checkbox"]';
  const WANT = 14;
  for (let index = 0; index < WANT; index += 1) {
    await toggleInAnimatedPage(page, checkbox, { index, expect: true });
    await page.waitForTimeout(60);
  }
  await page.waitForTimeout(900);
  const base = await readState(page);
  check('铺开一批节点作为待排的图', base.domNodes.length === WANT && base.order === null,
    JSON.stringify({ count: base.domNodes.length, order: base.order }));
  check('默认档是自由摆位：下拉三个选项、锚点下拉不出现',
    base.mode === 'free' && base.modeSelect?.options.length === 3 && base.anchorSelect === null,
    JSON.stringify(base.modeSelect));

  /* —— 学习顺序 —— */
  await selectMode(page, 'learning');
  const learning = await readState(page);
  const place = new Map(learning.placed.map((node) => [node.id, node]));
  check('切到「学习顺序」：画布按新规则重排（页面记录了层与锚点）',
    learning.mode === 'learning' && learning.order?.mode === 'learning' && learning.order.bands.length >= 2,
    JSON.stringify({ mode: learning.mode, bands: learning.order?.bands?.map((band) => band.nodes.length) }));
  check('起始节点在最上面（y 最小），层号越大越靠下',
    (() => {
      const bands = learning.order?.bands ?? [];
      if (bands.length < 2) return false;
      const rowsOf = (band) => band.nodes.map((id) => place.get(id)?.y ?? Number.NaN);
      const top = Math.min(...learning.placed.map((node) => node.y));
      if ((place.get(learning.order.anchor)?.y ?? Number.NaN) !== top) return false;
      for (let index = 0; index + 1 < bands.length; index += 1) {
        if (Math.max(...rowsOf(bands[index])) >= Math.min(...rowsOf(bands[index + 1]))) return false;
      }
      return true;
    })(),
    JSON.stringify(learning.order?.bands?.map((band) => band.nodes.map((id) => place.get(id)?.y))));
  check('卡片不重叠（规则构造保证）', overlapPairs(learning.placed).length === 0, JSON.stringify(overlapPairs(learning.placed)));
  check('提示里写清了判据与锚点，并点明「不在下游」的那一档',
    learning.notice.includes('学习顺序') && learning.notice.includes('硬前置'),
    learning.notice);
  check('锚点下拉出现在 HUD 上，且是第一项「自动」+ 分组选项',
    learning.anchorSelect !== null && /起始节点/.test(learning.anchorSelect.label)
      && learning.anchorSelect.options[0].text.startsWith('自动：') && learning.anchorSelect.groups.length >= 1,
    JSON.stringify(learning.anchorSelect));

  /* —— 用户自己选起始节点 —— */
  const alternatives = (learning.anchorSelect?.options ?? []).filter((option) => option.value && option.value !== learning.order.anchor);
  check('锚点下拉里给出了可选的其它节点（选择交给用户）', alternatives.length > 0,
    JSON.stringify((learning.anchorSelect?.options ?? []).slice(0, 4)));
  if (alternatives.length > 0) {
    await page.selectOption('select[aria-label*="起始节点"]', alternatives[0].value);
    await page.waitForTimeout(700);
    const picked = await readState(page);
    const pickedPlace = new Map(picked.placed.map((node) => [node.id, node]));
    check('换一个起始节点之后，它自己落在最上面、层重新算过',
      picked.order?.anchor === alternatives[0].value
        && pickedPlace.get(alternatives[0].value)?.y === Math.min(...picked.placed.map((node) => node.y)),
      JSON.stringify({ anchor: picked.order?.anchor, wanted: alternatives[0].value, y: pickedPlace.get(alternatives[0].value) }));
    check('换锚点之后仍然不重叠', overlapPairs(picked.placed).length === 0, JSON.stringify(overlapPairs(picked.placed)));
  }

  /* —— 手动摆放优先于规则 —— */
  /*
   * 拖哪一个：挑一个**能点到的、且不是当前锚点**的节点。
   *
   * 前一个条件是因为 HUD 与悬浮框都压在画布上（适配只保证内容落在它们之间的可用区里）；
   * 后一个是为了让后面「刷新之后起点仍在最上面」那条断言不被手动位置挡住——
   * 手动位置优先于规则是对的，但那样就没验到规则本身。
   */
  const anchorBeforeDrag = (await readState(page)).order?.anchor ?? null;
  const graph = (await (await fetch(server.origin + '/api/v2/ontology/graph')).json()).data;
  const placedIds = base.placed.map(node => node.id), futureCore = coreCandidateOrder(placedIds, buildEdges(graph, new Set(placedIds), ['contract', 'relation']))[0];
  const draggable = await page.evaluate((exclude) => {
    for (const node of document.querySelectorAll('.network-node')) {
      const id = node.getAttribute('data-node');
      if (exclude.includes(id)) continue;
      const rect = node.getBoundingClientRect();
      const x = rect.x + rect.width / 2;
      const y = rect.y + rect.height / 2;
      if (x < 0 || y < 0 || x > window.innerWidth || y > window.innerHeight) continue;
      const hit = document.elementFromPoint(x, y);
      if (hit && node.contains(hit)) return { id, x, y };
    }
    return null;
  }, [anchorBeforeDrag, futureCore]);
  check('有序模式下画布上仍有点得到的节点（HUD 不压内容）', Boolean(draggable), JSON.stringify(draggable));
  if (draggable) {
    await page.mouse.move(draggable.x, draggable.y);
    await page.mouse.down();
    await page.mouse.move(draggable.x + 120, draggable.y + 80, { steps: 8 });
    await page.mouse.up();
    await page.waitForTimeout(600);
    const dragged = await readState(page);
    const draggedPlace = new Map(dragged.placed.map((node) => [node.id, node]));
    const rulePlace = (learning.order?.bands ?? []).flatMap((band) => band.nodes).indexOf(draggable.id);
    check('手动拖过的节点在有序模式下保持原位（不被规则拽回）',
      Boolean(dragged.overrides[draggable.id])
        && draggedPlace.get(draggable.id)?.x === Math.round(dragged.overrides[draggable.id].x)
        && draggedPlace.get(draggable.id)?.y === Math.round(dragged.overrides[draggable.id].y)
        && rulePlace >= 0,
      JSON.stringify({ overrides: Object.keys(dragged.overrides), placed: draggedPlace.get(draggable.id) }));
  }

  /* —— 逻辑核心 —— */
  await selectMode(page, 'logic');
  const logic = await readState(page);
  const logicPlace = new Map(logic.placed.map((node) => [node.id, node]));
  const coreId = logic.order?.anchor ?? '';
  /*
   * 「核心在中心」怎么量：拿**除核心以外的规则节点**的质心当图形中心。
   *
   * 不用包围盒中心：手动拖过的节点、以及为它让位而挪开的规则卡片都会把包围盒拉歪
   * （实测把偏差从 60px 拉到 434px），那量到的是让位的结果，不是「核心在中心」。
   * 一圈圈同心圆上均匀撒开的节点，质心就在圆心上；分圈若按核心度整体偏心，
   * 这条断言照样会红（换成左右分层的摆法，质心会离核心几百像素）。
   */
  const ringNodes = logic.placed.filter((node) => node.id !== coreId && !logic.overrides[node.id]);
  const centroid = {
    x: ringNodes.reduce((sum, node) => sum + node.x + NODE_W / 2, 0) / Math.max(ringNodes.length, 1),
    y: ringNodes.reduce((sum, node) => sum + node.y + NODE_H / 2, 0) / Math.max(ringNodes.length, 1),
  };
  const corePoint = logicPlace.get(coreId);
  const coreOverridden = Boolean(logic.overrides[coreId]);
  const coreGap = corePoint && !coreOverridden
    ? Math.hypot(corePoint.x + NODE_W / 2 - centroid.x, corePoint.y + NODE_H / 2 - centroid.y)
    : Number.NaN;
  check('切到「逻辑核心」：核心落在图形中心（偏差小于一圈）',
    logic.mode === 'logic' && logic.order?.mode === 'logic' && coreGap < ORDER_LAYOUT.ringStep,
    JSON.stringify({
      mode: logic.mode, core: coreId, coreGap: Math.round(coreGap), ringStep: ORDER_LAYOUT.ringStep, coreOverridden,
      bands: logic.order?.bands?.map((band) => band.nodes),
      positions: logic.placed.map((node) => `${node.id}@${node.x},${node.y}`),
      overrides: logic.overrides,
    }));
  check('核心程度决定内外：每一圈的核心度不低于外一圈',
    (() => {
      const scores = logic.order?.scores ?? {};
      const bands = logic.order?.bands ?? [];
      for (let ring = 1; ring + 1 < bands.length; ring += 1) {
        const inner = Math.min(...bands[ring].nodes.map((id) => scores[id] ?? 0));
        const outer = Math.max(...bands[ring + 1].nodes.map((id) => scores[id] ?? 0));
        if (inner < outer) return false;
      }
      return bands.length >= 1;
    })(),
    JSON.stringify(logic.order?.bands?.map((band) => band.nodes.length)));
  check('逻辑核心下规则摆出来的卡片互不重叠',
    overlapPairs(logic.placed.filter((node) => !logic.overrides[node.id])).length === 0,
    JSON.stringify(overlapPairs(logic.placed.filter((node) => !logic.overrides[node.id]))));
  check('锚点下拉换成「核心节点」，并按核心程度由高到低列出',
    logic.anchorSelect !== null && /核心节点/.test(logic.anchorSelect.label) && logic.anchorSelect.groups.length === 1,
    JSON.stringify(logic.anchorSelect));
  check('提示写清了核心与分圈依据', logic.notice.includes('逻辑核心') && logic.notice.includes('核心程度'), logic.notice);

  /* —— 手动拖过的节点在换模式之后仍然在原处 —— */
  if (draggable) {
    const afterMode = new Map((await readState(page)).placed.map((node) => [node.id, node]));
    check('换模式之后手动位置仍然优先（不被新规则拽走）',
      Math.abs((afterMode.get(draggable.id)?.x ?? 0) - (logic.overrides[draggable.id]?.x ?? -1)) < 1.5,
      JSON.stringify({ node: afterMode.get(draggable.id), override: logic.overrides[draggable.id] }));
  }

  /* —— 「重新布局」在有序档下按当前模式重排并说明 —— */
  await page.click('.network-zoom button:has-text("重新布局")');
  await page.waitForTimeout(700);
  const relayout = await readState(page);
  check('有序档下点「重新布局」：说明按哪个模式重排',
    relayout.notice.includes('逻辑核心') && relayout.notice.includes('重排'), relayout.notice);
  check('有序档下点「重新布局」不会清掉手动摆放',
    !draggable || Boolean(relayout.overrides[draggable.id]),
    JSON.stringify(Object.keys(relayout.overrides)));

  /* —— 「保留手动摆放」这个勾选（2026-10-11 追加）—— */
  const KEEP_SELECTOR = 'input[aria-label="重排时保留手动摆放的节点"]';
  check('「重新布局」左边有「保留手动摆放」勾选，默认勾上（不动它就还是老行为）',
    relayout.keepManual === true, JSON.stringify({ keepManual: relayout.keepManual }));
  if (draggable) {
    /** 某个节点在逻辑核心下的**圈号**（0 = 核心）。 */
    const ringOf = (state, id) => (state.order?.bands ?? []).findIndex((band) => band.nodes.includes(id));
    /** 与核心的距离：规则摆出来的卡片应当正好等于「圈号 × 圈距」。 */
    const distFromCore = (state, id) => {
      const core = state.placed.find((node) => node.id === state.order?.anchor);
      const node = state.placed.find((item) => item.id === id);
      return core && node ? Math.hypot(node.x - core.x, node.y - core.y) : Number.NaN;
    };
    const ringBefore = ringOf(relayout, draggable.id);
    const wasOffRing = Math.abs(distFromCore(relayout, draggable.id) - ringBefore * ORDER_LAYOUT.ringStep) > 2;

    // 取消勾选：这一次重排应当把手动摆放也一起归位。
    const uncheckedOk = await toggleInAnimatedPage(page, KEEP_SELECTOR, { expect: false });
    await page.waitForTimeout(200);
    const unchecked = await readState(page);
    check('取消勾选本身不动画布（要等点了「重新布局」才生效）',
      uncheckedOk && unchecked.keepManual === false && Boolean(unchecked.overrides[draggable.id])
        && isDeepStrictEqual(unchecked.overrides, relayout.overrides),
      JSON.stringify({ keepManual: unchecked.keepManual, overrides: Object.keys(unchecked.overrides), changed: uncheckedOk }));

    await page.click('.network-zoom button:has-text("重新布局")');
    await page.waitForTimeout(700);
    const cleared = await readState(page);
    check('取消勾选后点「重新布局」：手动位置被清掉（画布与本机存储都清）',
      Object.keys(cleared.overrides).length === 0 && Object.keys(cleared.placements).length === 0,
      JSON.stringify({ overrides: Object.keys(cleared.overrides), placements: Object.keys(cleared.placements) }));
    check('被拖过的那张卡片回到它那一圈（半径 = 圈号 × 圈距，说明是规则摆的而不是老位置）',
      wasOffRing && Math.abs(distFromCore(cleared, draggable.id) - ringOf(cleared, draggable.id) * ORDER_LAYOUT.ringStep) <= 2,
      JSON.stringify({
        wasOffRing,
        dist: Math.round(distFromCore(cleared, draggable.id)),
        ring: ringOf(cleared, draggable.id) * ORDER_LAYOUT.ringStep,
        before: { dist: Math.round(distFromCore(relayout, draggable.id)), ring: ringBefore * ORDER_LAYOUT.ringStep },
      }));
    check('这一步的提示写明「手动摆放的 N 个节点也一起归位」',
      cleared.notices.some((text) => text.includes('也一起归位') && text.includes('逻辑核心')),
      JSON.stringify(cleared.notices));
    check('清掉的是手动位置，规则仍然把卡片摆在该在的地方（不重叠）',
      overlapPairs(cleared.placed).length === 0, JSON.stringify(overlapPairs(cleared.placed)));
    check('给出撤销入口，并写明刚才归位了几个',
      Object.keys(unchecked.overrides).length > 0
        && cleared.notices.some((text) => text.includes('恢复手动摆放')
          && text.includes(`手动摆放的 ${Object.keys(unchecked.overrides).length} 个节点`)),
      JSON.stringify(cleared.notices));

    /*
     * 撤销：手动位置原样回来（连同 localStorage），后面几段断言也仍然成立。
     * 撤销按钮按文字点——它是 network-notice 里的 link-button。
     */
    await page.click('.network-notice button:has-text("恢复手动摆放")');
    await page.waitForTimeout(600);
    const restored = await readState(page);
    const restoredPlace = new Map(restored.placed.map((node) => [node.id, node]));
    check('撤销把手动摆放原样放回去（画布与本机存储都回来了，撤销入口收起）',
      Math.abs((restoredPlace.get(draggable.id)?.x ?? 0) - (relayout.overrides[draggable.id]?.x ?? -1)) < 1.5
        && Boolean(restored.overrides[draggable.id])
        && isDeepStrictEqual(restored.overrides, unchecked.overrides)
        && !restored.notices.some((text) => text.includes('恢复手动摆放')),
      JSON.stringify({ node: restoredPlace.get(draggable.id), override: relayout.overrides[draggable.id], notices: restored.notices }));

    // 把勾选放回默认，后面几段（切回自由摆位、刷新）沿用老行为。
    await toggleInAnimatedPage(page, KEEP_SELECTOR, { expect: true });
    await page.waitForTimeout(200);
    check('勾选状态不落本机存储（它是「这一次怎么排」的选择，不是长期偏好）',
      (await page.evaluate(() => Object.keys(localStorage))).every((key) => !/keep/i.test(key)),
      JSON.stringify(await page.evaluate(() => Object.keys(localStorage))));
  }

  /* —— 切回自由摆位 —— */
  const beforeFree = relayout.placed;
  await selectMode(page, 'free');
  const free = await readState(page);
  const freePlace = new Map(free.placed.map((node) => [node.id, node]));
  const moved = (draggable ? beforeFree.filter((node) => node.id !== draggable.id) : beforeFree)
    .filter((node) => Math.abs((freePlace.get(node.id)?.x ?? 0) - node.x) > 0.5 || Math.abs((freePlace.get(node.id)?.y ?? 0) - node.y) > 0.5);
  check('切回自由摆位：位置回到力导向那一套（有序摆位不再生效）',
    free.mode === 'free' && free.order === null && moved.length > 0,
    JSON.stringify({ mode: free.mode, order: free.order, moved: moved.length }));
  check('切回自由摆位有说明', free.notice.includes('自由摆位'), free.notice);

  /* —— 刷新之后记得上次选的排法 —— */
  await selectMode(page, 'learning');
  const learningAgain = await readState(page);
  await page.goto(page.url(), { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  const reloaded = await readState(page);
  check('刷新之后仍然是上次选的学习顺序（模式与锚点都记在本机）',
    reloaded.mode === 'learning' && reloaded.order?.mode === 'learning'
      && reloaded.order.anchor === learningAgain.order?.anchor,
    JSON.stringify({ mode: reloaded.mode, anchor: reloaded.order?.anchor, before: learningAgain.order?.anchor }));
  if (draggable && learning.overrides[draggable.id]) {
    const kept = reloaded.placed.find((node) => node.id === draggable.id);
    check('刷新之后手动摆放仍然在（位置记在本机，规则不把它抹掉）',
      Boolean(kept) && Math.abs(kept.x - learning.overrides[draggable.id].x) < 1.5
        && Math.abs(kept.y - learning.overrides[draggable.id].y) < 1.5,
      JSON.stringify({ kept, override: learning.overrides[draggable.id] }));
  }
  const released = await readState(page);
  check('刷新之后起点仍在最上面（规则本身仍然生效）',
    (() => {
      // 手动拖过的节点可以在任何地方（那是它的意义），因此这一条只看规则摆出来的那些。
      const rule = released.placed.filter((node) => !released.overrides[node.id]);
      const at = rule.find((node) => node.id === released.order?.anchor);
      return Boolean(at) && at.y === Math.min(...rule.map((node) => node.y));
    })(),
    JSON.stringify({ anchor: released.order?.anchor, overrides: Object.keys(released.overrides) }));

  /* —— 英文站：控件与提示都换措辞（不留中文） —— */
  const enPage = await (await browser.newContext({ viewport: { width: 1500, height: 950 } })).newPage();
  const enErrors = [];
  enPage.on('pageerror', (error) => enErrors.push(error.message));
  await enPage.goto(server.origin + '/en/network', { waitUntil: 'networkidle' });
  await enPage.evaluate(() => {
    localStorage.removeItem('mcs-network-placements-v1');
    localStorage.removeItem('mcs-network-layout-mode-v1');
    localStorage.removeItem('mcs-network-layout-anchor-v1');
  });
  await enPage.goto(server.origin + '/en/network', { waitUntil: 'networkidle' });
  await enPage.waitForTimeout(700);
  // 按控件职责定位；第一个 HUD 开关现为旧尺度显示，不是节点列表。
  await enPage.getByRole('checkbox', { name: 'Show the All nodes panel', exact: true }).check();
  await enPage.waitForTimeout(300);
  const enCheckbox = '.floating-panel .network-node-list input[type="checkbox"]';
  for (let index = 0; index < 8; index += 1) {
    await toggleInAnimatedPage(enPage, enCheckbox, { index, expect: true });
    await enPage.waitForTimeout(60);
  }
  await enPage.waitForTimeout(600);
  await enPage.selectOption('select[aria-label="Arrangement mode (re-layout arranges the cards by it)"]', 'learning');
  await enPage.waitForTimeout(700);
  const en = await enPage.evaluate(() => ({
    mode: window.__mcsNetwork?.layoutMode ?? null,
    anchorLabel: document.querySelector('select[aria-label^="Start node"]')?.getAttribute('aria-label') ?? null,
    notice: document.querySelector('.network-notice')?.textContent?.replace(/\s+/g, ' ').trim() ?? '',
    anchorTitle: document.querySelector(`.network-node[data-node="${window.__mcsNetworkOrder?.anchor}"]`)?.getAttribute('aria-label') ?? '',
    modeOptions: [...(document.querySelector('select[aria-label^="Arrangement mode"]')?.options ?? [])].map((option) => option.textContent),
  }));
  check('英文站：模式与锚点控件都有英文标签、提示没有中文',
    en.mode === 'learning' && Boolean(en.anchorLabel) && en.notice.includes('learning order') && !/[\u4e00-\u9fff]/.test(en.notice.replace(en.anchorTitle, '')),
    JSON.stringify({ ...en, notice: en.notice.slice(0, 120) }));
  check('英文站没有页面错误', enErrors.length === 0, enErrors.join(' | '));

  check('摆位模式全流程没有控制台错误', consoleErrors.length === 0, consoleErrors.join(' | '));
} finally {
  await browser?.close();
  await server.cleanup();
}

if (failures.length > 0) {
  console.error('\n摆位模式验收失败：\n- ' + failures.join('\n- '));
  process.exit(1);
}
console.log('\n摆位模式验收通过。');
