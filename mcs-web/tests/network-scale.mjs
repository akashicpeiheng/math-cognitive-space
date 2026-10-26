import { startTestServer, clickInAnimatedPage } from './helpers.mjs';
import { PLAYWRIGHT_SPECIFIER, CHROME_PATH } from './browser-runtime.mjs';

/**
 * 尺度视图的真浏览器验收（2026-10-17）。
 *
 * 覆盖用户点名的三件事：
 * 1. 同一画布同时出现分子 / 节点 / 单元 / 话题；
 * 2. 右键大尺度对象分裂为小尺度成员；
 * 3. 缩小时把临近对象自动合拢到下一尺度（开关可关）。
 *
 * 每一步都从真实 DOM/URL 读数；期望值尽量由页面的 data-* 与接口计数交叉核对，
 * 不 import 被测实现。
 */
const failures = [];
function check(name, condition, detail = '') {
  if (condition) console.log('  ✓ ' + name);
  else { failures.push(name + (detail ? ' :: ' + detail : '')); console.log('  ✗ ' + name + (detail ? ' :: ' + detail : '')); }
}

async function contextAt(page, selector) {
  const box = await page.locator(selector).first().boundingBox();
  if (!box) throw new Error(`找不到 ${selector}`);
  await page.evaluate(({ target, x, y }) => {
    const element = document.querySelector(target);
    element.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true, button: 2, clientX: x, clientY: y }));
  }, { target: selector, x: box.x + box.width / 2, y: box.y + box.height / 2 });
  await page.waitForSelector('.node-menu');
}

async function dragBy(page, selector, dx, dy) {
  const box = await page.locator(selector).first().boundingBox();
  if (!box) throw new Error(`找不到 ${selector}`);
  const before = await page.evaluate((target) => document.querySelector(target)?.getAttribute('transform') ?? '', selector);
  await page.mouse.move(box.x + Math.min(box.width / 2, 60), box.y + Math.min(box.height / 2, 20));
  await page.mouse.down();
  await page.mouse.move(box.x + Math.min(box.width / 2, 60) + dx, box.y + Math.min(box.height / 2, 20) + dy, { steps: 6 });
  await page.waitForTimeout(140);
  const during = await page.evaluate((target) => {
    const element = document.querySelector(target);
    const inner = element?.querySelector('.scale-card-inner, .network-card-body');
    return {
      className: element?.getAttribute('class') ?? '',
      transform: inner ? getComputedStyle(inner).transform : null,
    };
  }, selector);
  await page.mouse.up();
  await page.waitForTimeout(450);
  const after = await page.evaluate((target) => document.querySelector(target)?.getAttribute('transform') ?? '', selector);
  const stored = await page.evaluate(() => {
    const read = (key) => { try { return JSON.parse(localStorage.getItem(key) || '{}'); } catch { return {}; } };
    return { scale: read('mcs-network-scale-positions-v1'), nodes: read('mcs-network-positions-v1') };
  });
  return { before, after, during, stored };
}

const server = await startTestServer();
let browser;
try {
  const { chromium } = await import(PLAYWRIGHT_SPECIFIER);
  browser = await chromium.launch({ executablePath: CHROME_PATH ?? undefined, headless: true });
  const page = await (await browser.newContext({ viewport: { width: 1500, height: 950 } })).newPage();
  const consoleErrors = [];
  page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text()); });
  page.on('pageerror', (error) => consoleErrors.push(error.message));

  const topic = 'topic:point-set-topology';
  const unit = 'unit:agg-top-manifold';
  const molecule = 'mol:top:topological-manifold';
  const base = `/network?scales=all&scaleNodes=${encodeURIComponent(topic)}`;
  await page.goto(server.origin + base, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);

  const initial = await page.evaluate(() => ({
    scaleToggle: document.querySelector('input[aria-label="尺度"]')?.checked ?? null,
    topicCount: document.querySelectorAll('[data-scale="topic"]').length,
    unitCount: document.querySelectorAll('[data-scale="unit"]').length,
    nodeCount: document.querySelectorAll('.network-node').length,
    legend: document.querySelector('.legend-scale')?.textContent ?? '',
  }));
  check('尺度开关随 URL 打开，画布出现话题卡片', initial.scaleToggle === true && initial.topicCount === 1, JSON.stringify(initial));
  check('未展开时只显示话题，不显示单元/节点', initial.unitCount === 0 && initial.nodeCount === 0, JSON.stringify(initial));
  check('图例给出四层计数', initial.legend.includes('话题 1') && initial.legend.includes('单元 0') && initial.legend.includes('节点 0'), initial.legend);

  // ---- 面板：列出 54 单元 / 2 话题 / 9 分子 ----
  await page.locator('input[aria-label="显示尺度对象面板"]').check();
  await page.waitForSelector('.scale-panel');
  const panel = await page.evaluate(() => ({
    plan: document.querySelector('.scale-panel')?.getAttribute('data-scale-plan'),
    rowCount: document.querySelectorAll('.scale-panel .scale-row').length,
    hasNote: document.querySelector('.scale-panel')?.textContent?.includes('迁移登记') ?? false,
    nodeScale: Boolean(document.querySelector('.scale-panel [data-scale-section="node"]')),
    nodeHint: document.querySelector('.scale-panel [data-scale-section="node"]')?.textContent ?? '',
    nodeAdd: Boolean(document.querySelector('.scale-panel [data-action="add-node-scale"]')),
  }));
  check('尺度面板加载真实计划并列出对象', panel.plan === 'provisional-migration' && panel.rowCount >= 60, JSON.stringify(panel));
  check('面板如实说明迁移登记', panel.hasNote, String(panel.hasNote));
  check('面板加入「节点尺度」入口并说明节点可拖动', panel.nodeScale && panel.nodeHint.includes('节点尺度') && panel.nodeHint.includes('拖动') && panel.nodeAdd, JSON.stringify({ nodeScale: panel.nodeScale, nodeHint: panel.nodeHint, nodeAdd: panel.nodeAdd }));

  // ---- 自动合拢开关写回 URL（关闭 = merge=0，重新打开 = 不写） ----
  const autoMergeBox = page.locator('input[data-scale-auto-merge]');
  check('自动合拢默认打开', await autoMergeBox.isChecked());
  await clickInAnimatedPage(page, 'input[data-scale-auto-merge]');
  await page.waitForTimeout(500);
  const mergeOff = await page.evaluate(() => new URLSearchParams(location.search).get('merge') ?? new URLSearchParams(location.hash.replace(/^#/, '')).get('merge'));
  await clickInAnimatedPage(page, 'input[data-scale-auto-merge]');
  await page.waitForTimeout(500);
  const mergeOn = await page.evaluate(() => new URLSearchParams(location.search).get('merge') ?? new URLSearchParams(location.hash.replace(/^#/, '')).get('merge'));
  check('自动合拢开关写回 URL（关闭 merge=0，打开恢复默认）', mergeOff === '0' && mergeOn === null, JSON.stringify({ mergeOff, mergeOn }));

  // ---- 右键话题：分裂成 5 个单元 ----
  await contextAt(page, `[data-scale-object="${topic}"]`);
  const topicMenu = await page.evaluate(() => ({
    text: document.querySelector('.scale-menu')?.textContent ?? '',
    action: document.querySelector('.scale-menu [data-action="split-scale"]')?.textContent ?? '',
  }));
  check('右键话题菜单给出分裂数量', topicMenu.action.includes('5 个'), JSON.stringify(topicMenu));
  await page.locator('.scale-menu [data-action="split-scale"]').click();
  await page.waitForTimeout(1600);
  const afterTopic = await page.evaluate(({ topic }) => ({
    units: document.querySelectorAll('.scale-layer [data-scale="unit"]').length,
    topicForm: document.querySelector(`.scale-layer [data-scale-object="${topic}"]`)?.getAttribute('data-form'),
    url: (() => { const hash = new URLSearchParams(location.hash.replace(/^#/, '')); return { split: hash.get('split') ?? new URLSearchParams(location.search).get('split'), scales: hash.get('scales') ?? new URLSearchParams(location.search).get('scales') }; })(),
  }), { topic });
  check('分裂话题后出现 5 个单元，话题变成 header', afterTopic.units === 5 && afterTopic.topicForm === 'header', JSON.stringify(afterTopic));
  check('分裂状态写进 URL split', afterTopic.url.split?.includes(topic), JSON.stringify(afterTopic.url));

  // ---- 右键单元：分裂成 6 个节点 ----
  await contextAt(page, `[data-scale-object="${unit}"]`);
  await page.locator('.scale-menu [data-action="split-scale"]').click();
  await page.waitForTimeout(1800);
  const afterUnit = await page.evaluate(({ unit }) => ({
    nodes: document.querySelectorAll('.network-node').length,
    unitForm: document.querySelector(`[data-scale-object="${unit}"]`)?.getAttribute('data-form'),
    nodesInUrl: new URLSearchParams(location.search).get('nodes') ?? '',
    unitHeader: document.querySelector(`[data-scale-object="${unit}"] .scale-meta`)?.textContent ?? '',
  }), { unit });
  check('分裂单元后出现 6 个节点，单元变成 header', afterUnit.nodes === 6 && afterUnit.unitForm === 'header', JSON.stringify(afterUnit));
  check('节点集合写进 URL', afterUnit.nodesInUrl.includes('top%3Atopological-manifold') || afterUnit.nodesInUrl.includes('top:topological-manifold'), afterUnit.nodesInUrl.slice(0, 120));

  // ---- 右键节点：分裂为中心分子 ----
  await contextAt(page, '.network-node[data-node="top:topological-manifold"]');
  const nodeMenu = await page.evaluate(() => document.querySelector('.node-menu [data-action="split-to-molecule"]')?.textContent ?? '');
  check('节点菜单里有「分裂为中心分子」', nodeMenu.includes('分子'), nodeMenu);
  await page.locator('.node-menu [data-action="split-to-molecule"]').click();
  await page.waitForTimeout(1200);
  const fourLayers = await page.evaluate(({ molecule }) => ({
    scales: [...new Set([...document.querySelectorAll('.scale-layer [data-scale]')].map((element) => element.getAttribute('data-scale')))].sort(),
    molecule: Boolean(document.querySelector(`.scale-layer [data-scale-object="${molecule}"]`)),
    moleculeForm: document.querySelector(`.scale-layer [data-scale-object="${molecule}"]`)?.getAttribute('data-form'),
    node: Boolean(document.querySelector('.network-node[data-scale="node"]')),
  }), { molecule });
  check('四层尺度同时出现在 DOM 中', JSON.stringify(fourLayers.scales) === JSON.stringify(['molecule', 'topic', 'unit']) && fourLayers.node, JSON.stringify(fourLayers));
  check('分子卡片以 molecule 形态出现', fourLayers.molecule && fourLayers.moleculeForm === 'molecule', JSON.stringify(fourLayers));

  // ---- 缩小时自动合拢：节点并回单元、分子并回节点 ----
  await page.mouse.move(820, 520);
  for (let i = 0; i < 14; i += 1) { await page.mouse.wheel(0, 120); await page.waitForTimeout(70); }
  await page.waitForTimeout(1200);
  const merged = await page.evaluate(({ unit }) => ({
    zoom: document.querySelector('.network-canvas-full')?.dataset.zoom,
    nodes: document.querySelectorAll('.network-node').length,
    molecules: document.querySelectorAll('.scale-layer [data-scale="molecule"]').length,
    unitMerged: document.querySelector(`.scale-layer [data-scale-object="${unit}"]`)?.getAttribute('data-merged'),
    legend: document.querySelector('.legend-scale')?.textContent ?? '',
    mergedLegend: document.querySelector('.legend-scale-merged')?.textContent ?? '',
  }), { unit });
  check('缩到 25% 时节点并回单元、分子并回节点', merged.nodes === 0 && merged.molecules === 0, JSON.stringify(merged));
  check('合拢卡片如实标出成员数', merged.unitMerged === '6', JSON.stringify(merged));
  check('图例写明已合拢', merged.mergedLegend.includes('已合拢'), JSON.stringify(merged));

  // ---- 放大恢复 ----
  await page.mouse.move(820, 520);
  for (let i = 0; i < 18; i += 1) { await page.mouse.wheel(0, -120); await page.waitForTimeout(70); }
  await page.waitForTimeout(1200);
  const restored = await page.evaluate(() => ({
    zoom: document.querySelector('.network-canvas-full')?.dataset.zoom,
    nodes: document.querySelectorAll('.network-node').length,
    molecules: document.querySelectorAll('.scale-layer [data-scale="molecule"]').length,
  }));
  check('放大到 90% 以上后节点与分子恢复', Number(restored.zoom) > 0.9 && restored.nodes === 6 && restored.molecules === 1, JSON.stringify(restored));

  // 先把相机复位再放大一步：既让四层都在视口内，又保持分子（>90%）；收起两侧面板避免挡住目标。
  for (const label of ['显示全部节点面板', '显示推荐加入面板']) {
    const box = page.locator(`input[aria-label="${label}"]`);
    if (await box.isChecked()) await box.uncheck();
  }
  await page.waitForTimeout(400);
  await page.click('.network-zoom button:has-text("重置")');
  await page.waitForTimeout(1200);
  await page.click('button[aria-label="放大"]');
  await page.waitForTimeout(1000);

  // ---- 各尺度都能拖动：节点、分子、单元、话题；拖动时有抬升过渡，落手后写本机 ----
  const nodeId = 'top:atlas';
  const unitDrag = await dragBy(page, `[data-scale-object="${unit}"]`, 52, 22);
  check('单元 header 可拖动并写入本机位置', unitDrag.after !== unitDrag.before && Boolean(unitDrag.stored.scale[unit]) && unitDrag.during.className.includes('is-dragging'), JSON.stringify(unitDrag));
  const nodeDrag = await dragBy(page, `.network-node[data-node="${nodeId}"]`, 44, 20);
  check('节点卡片可拖动并写入本机位置', nodeDrag.after !== nodeDrag.before && Boolean(nodeDrag.stored.nodes[nodeId]) && nodeDrag.during.className.includes('dragging-node'), JSON.stringify(nodeDrag));

  // 分子在四层同屏时会被其他单元卡片压住；用只有单元+节点的页面验收，避免误点。
  await page.goto(server.origin + `/network?scales=all&scaleNodes=${encodeURIComponent(unit)}&split=${encodeURIComponent(`${unit},top:topological-manifold`)}&nodes=${encodeURIComponent('top:atlas,top:coordinate-chart,top:differentiable-manifold,top:example-projective-line,top:example-sphere-charts,top:topological-manifold')}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1400);
  for (const label of ['显示全部节点面板', '显示推荐加入面板']) {
    const box = page.locator(`input[aria-label="${label}"]`);
    if (await box.isChecked()) await box.uncheck();
  }
  await page.waitForTimeout(300);
  await page.click('.network-zoom button:has-text("重置")');
  await page.waitForTimeout(1200);
  const moleculeDrag = await dragBy(page, `[data-scale-object="${molecule}"]`, 36, 18);
  check('分子卡片可拖动并写入本机位置', moleculeDrag.after !== moleculeDrag.before && Boolean(moleculeDrag.stored.scale[molecule]) && moleculeDrag.during.className.includes('is-dragging'), JSON.stringify(moleculeDrag));

  // 话题 header 在四层同屏时位于最上方，单独用话题页验收，避免被相机裁掉。
  // 清掉本标签页的会话暂存：只有 scaleNodes 没有 nodes 时，恢复支路会把上一张图拉回来。
  await page.evaluate(() => sessionStorage.clear());
  await page.goto(server.origin + `/network?scales=all&scaleNodes=${encodeURIComponent(topic)}&split=${encodeURIComponent(topic)}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1400);
  const topicDrag = await dragBy(page, `[data-scale-object="${topic}"]`, 70, 28);
  check('话题 header 可拖动并写入本机位置', topicDrag.after !== topicDrag.before && Boolean(topicDrag.stored.scale[topic]) && topicDrag.during.className.includes('is-dragging'), JSON.stringify(topicDrag));
  check('拖动时有 CSS 抬升动效（不是瞬移）', [topicDrag, unitDrag, moleculeDrag, nodeDrag].every((item) => item.during.transform && item.during.transform !== 'none'), JSON.stringify([topicDrag.during, moleculeDrag.during, nodeDrag.during]));

  // ---- 关闭自动合拢：缩到 25% 仍保留节点 ----
  const noMergeUrl = server.origin + `/network?scales=all&merge=0&scaleNodes=${encodeURIComponent(`${topic},${unit}`)}&split=${encodeURIComponent(`top:topological-manifold,${topic},${unit}`)}&nodes=${encodeURIComponent('top:atlas,top:coordinate-chart,top:differentiable-manifold,top:example-projective-line,top:example-sphere-charts,top:topological-manifold')}`;
  await page.goto(noMergeUrl, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1400);
  await page.mouse.move(820, 520);
  for (let i = 0; i < 14; i += 1) { await page.mouse.wheel(0, 120); await page.waitForTimeout(70); }
  await page.waitForTimeout(1000);
  const noMerge = await page.evaluate(() => ({
    zoom: document.querySelector('.network-canvas-full')?.dataset.zoom,
    nodes: document.querySelectorAll('.network-node').length,
    molecules: document.querySelectorAll('.scale-layer [data-scale="molecule"]').length,
  }));
  check('关闭「自动合拢」后缩到 25% 仍显示节点与分子', Number(noMerge.zoom) < 0.3 && noMerge.nodes === 6 && noMerge.molecules === 1, JSON.stringify(noMerge));

  // ---- 命名视图：尺度状态随快照保存/载入（本机，不写 E） ----
  await page.goto(server.origin + `/network?scales=all&scaleNodes=${encodeURIComponent(`${topic},${unit}`)}&split=${encodeURIComponent(`top:topological-manifold,${topic},${unit}`)}&nodes=${encodeURIComponent('top:topological-manifold')}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1300);
  await page.locator('input[aria-label="显示保存的视图面板"]').check();
  await page.waitForTimeout(500);
  page.once('dialog', (dialog) => dialog.accept('尺度验收视图'));
  await page.locator('.floating-panel[aria-label="保存的视图"] button:has-text("保存当前视图")').first().click();
  await page.waitForTimeout(900);
  const savedScalePositions = await page.evaluate((name) => {
    const views = JSON.parse(localStorage.getItem('mcs-network-views-local-v1') || '[]');
    const entry = Array.isArray(views) ? views.find((view) => view.name === name) : null;
    return Object.keys(entry?.payload?.scale?.positions ?? {});
  }, '尺度验收视图');
  check('命名视图保存尺度卡片位置', savedScalePositions.includes(topic) && savedScalePositions.includes(unit), JSON.stringify(savedScalePositions));
  await page.evaluate(() => sessionStorage.clear());
  await page.goto(server.origin + '/network', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);
  await page.locator('input[aria-label="显示保存的视图面板"]').check();
  await page.waitForTimeout(500);
  await page.locator('.saved-view-list li', { hasText: '尺度验收视图' }).locator('button:has-text("载入")').click();
  await page.waitForTimeout(1600);
  const restoredView = await page.evaluate(({ topic }) => {
    const hash = new URLSearchParams(location.hash.replace(/^#/, ''));
    let positions = {};
    try { positions = JSON.parse(localStorage.getItem('mcs-network-scale-positions-v1') || '{}'); } catch { /* 坏值按空 */ }
    return {
      topic: Boolean(document.querySelector(`.scale-layer [data-scale-object="${topic}"]`)),
      scales: hash.get('scales') ?? new URLSearchParams(location.search).get('scales'),
      split: hash.get('split') ?? new URLSearchParams(location.search).get('split'),
      positions: Object.keys(positions),
    };
  }, { topic });
  check('命名视图载入后尺度对象与 split 一起回来', restoredView.topic && restoredView.scales?.includes('topic') && restoredView.split?.includes(topic), JSON.stringify(restoredView));
  check('命名视图载入后尺度卡片位置也回来', restoredView.positions.includes(topic) && restoredView.positions.includes(unit), JSON.stringify(restoredView.positions));

  // ---- 节点尺度入口：一键把已加入话题的成员节点放进画布 ----
  await page.evaluate(() => sessionStorage.clear());
  await page.goto(server.origin + `/network?scales=all&scaleNodes=${encodeURIComponent(topic)}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1300);
  await page.locator('input[aria-label="显示尺度对象面板"]').check();
  await page.waitForTimeout(400);
  await page.locator('[data-action="add-node-scale"]').click();
  await page.waitForTimeout(1800);
  const addedNodeScale = await page.evaluate(() => ({
    nodes: document.querySelectorAll('.network-node').length,
    nodeScale: document.querySelectorAll('.network-node[data-scale="node"]').length,
    urlNodes: decodeURIComponent(new URLSearchParams(location.search).get('nodes') ?? (new URLSearchParams(location.hash.replace(/^#/, '')).get('nodes') ?? '')).split(',').filter(Boolean).length,
  }));
  check('「加入节点尺度」把节点放上画布', addedNodeScale.nodes > 0 && addedNodeScale.nodeScale === addedNodeScale.nodes && addedNodeScale.urlNodes === addedNodeScale.nodes, JSON.stringify(addedNodeScale));

  // ---- 英文界面：尺度开关、面板标题与徽标都换语言（数据标题本身允许中文） ----
  await page.goto(server.origin + '/en/network?scales=all&scaleNodes=' + encodeURIComponent(topic), { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);
  await page.locator('input[aria-label="Show the Scale objects panel"]').check();
  await page.waitForTimeout(500);
  const english = await page.evaluate(() => ({
    toggle: document.querySelector('input[aria-label="Scales"]')?.checked ?? null,
    panelToggle: Boolean(document.querySelector('input[aria-label="Show the Scale objects panel"]')),
    badge: document.querySelector('.network-scale-object[data-scale="topic"] .scale-badge')?.textContent ?? '',
    nodeScale: document.querySelector('.scale-panel [data-scale-section="node"]')?.textContent ?? '',
  }));
  check('英文界面：尺度开关、面板入口与话题徽标都已翻译',
    english.toggle === true && english.panelToggle && english.badge === 'Topic', JSON.stringify(english));
  check('英文界面：节点尺度入口也翻译', english.nodeScale.includes('Node scale') && english.nodeScale.includes('draggable'), JSON.stringify(english.nodeScale));

  check('尺度视图没有控制台错误', consoleErrors.length === 0, consoleErrors.slice(0, 3).join(' | '));
} finally {
  await browser?.close();
  await server.cleanup();
}

if (failures.length > 0) {
  console.error('\n尺度视图验收失败：\n- ' + failures.join('\n- '));
  process.exit(1);
}
