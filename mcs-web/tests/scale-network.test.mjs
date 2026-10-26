import test from 'node:test';
import assert from 'node:assert/strict';
import {
  SCALE_LOD, SCALE_CARD_PX, SCALE_ORDER,
  buildScaleCatalogue, resolveScaleDisplay, projectScaleEdges, displayRect, rectAnchors,
  scaleFitBounds, parseScaleLevels, parseScaleIds, scaleIdsParam, existingScaleIds,
} from '../web/src/scale-network.ts';

/**
 * 尺度视图派生层的验收（2026-10-17）。
 *
 * 不开浏览器：可见性、自动合拢、滞后、边投影、锚点与相机包围盒都是纯函数。
 * 场景夹具刻意小（两个单元、一个话题、两个分子），每个断言都能指出是**哪条规则**坏了。
 */

function makePlan() {
  return {
    schema: 'mcs-scale-plan/1',
    status: 'provisional-migration',
    levels: SCALE_ORDER.map((id, index) => ({ id, sigma: index + 1, title: id, titleEn: id, parent: null })),
    units: [
      { id: 'unit:u1', scale: 'unit', sigma: 3, title: '单元一', titleSource: 'manual', members: ['n1', 'n2'], organization: 'o', source: 's', sourceAggregate: 'a', sourceBlock: null, pathId: null, provisional: true, evidenceStatus: 'ILLUSTRATION' },
      { id: 'unit:u2', scale: 'unit', sigma: 3, title: '单元二', titleSource: 'manual', members: ['n3', 'n4'], organization: 'o', source: 's', sourceAggregate: 'a', sourceBlock: null, pathId: null, provisional: true, evidenceStatus: 'ILLUSTRATION' },
    ],
    topics: [
      { id: 'topic:t1', scale: 'topic', sigma: 4, title: '话题一', titleSource: 'manual', members: ['unit:u1', 'unit:u2'], organization: 'o', source: 's', provisional: true, evidenceStatus: 'ILLUSTRATION', unitCount: 2 },
    ],
    paths: [],
    molecules: [
      { id: 'mol:n1', scale: 'molecule', sigma: 1, title: 'm1', expression: 'm1', construct: 'm1', atoms: [{ label: 'a', meaning: 'a' }], node: 'n1', parent: 'node', source: 's', formulaStatus: 'DEF', evidenceStatus: 'ILLUSTRATION', provisional: false },
      { id: 'mol:n1b', scale: 'molecule', sigma: 1, title: 'm1b', expression: 'm1b', construct: 'm1b', atoms: [{ label: 'a', meaning: 'a' }], node: 'n1', parent: 'node', source: 's', formulaStatus: 'DEF', evidenceStatus: 'ILLUSTRATION', provisional: false },
      { id: 'mol:n2', scale: 'molecule', sigma: 1, title: 'm2', expression: 'm2', construct: 'm2', atoms: [{ label: 'b', meaning: 'b' }], node: 'n2', parent: 'node', source: 's', formulaStatus: 'DEF', evidenceStatus: 'ILLUSTRATION', provisional: false },
    ],
    counts: { levels: 4, units: 2, topics: 1, paths: 0, molecules: 3, aggregateUnits: 2, blockUnits: 0, nodes: 4, nodesCovered: 4, nodesUncovered: 0, unfinishedNodeIds: [] },
    notes: [],
  };
}

const catalogue = buildScaleCatalogue(makePlan());
const positions = (map = { n1: { x: 0, y: 0 }, n2: { x: 100, y: 0 }, n3: { x: 200, y: 0 }, n4: { x: 300, y: 0 } }) =>
  new Map(Object.entries(map));
const display = (overrides = {}) => resolveScaleDisplay({
  catalogue,
  enabled: new Set(SCALE_ORDER),
  addedNodes: new Set(['n1', 'n2', 'n3', 'n4']),
  addedScale: new Set(['topic:t1']),
  expanded: new Set(['topic:t1', 'unit:u1', 'unit:u2']),
  autoMerge: false,
  zoom: 1,
  nodePositions: positions(),
  ...overrides,
});

test('目录：主父对象、后代节点、根与分子索引都是确定性的', () => {
  assert.deepEqual(catalogue.roots.map((object) => object.id), ['unit:u1', 'unit:u2', 'topic:t1'].sort((a, b) => {
    const rank = { topic: 2, unit: 1 };
    return (rank[b.split(':')[0]] ?? 0) - (rank[a.split(':')[0]] ?? 0) || a.localeCompare(b);
  }).filter((id) => catalogue.roots.some((object) => object.id === id)));
  assert.equal(catalogue.primaryParentOfNode.get('n1'), 'unit:u1');
  assert.equal(catalogue.primaryParentOfUnit.get('unit:u1'), 'topic:t1');
  assert.deepEqual(catalogue.moleculeOfNode.get('n1'), ['mol:n1', 'mol:n1b']);
  assert.deepEqual(catalogue.descendantNodeIds.get('topic:t1'), ['n1', 'n2', 'n3', 'n4']);
  assert.deepEqual(catalogue.nodeToUnits.get('n1'), ['unit:u1']);
});

test('可见性：父未展开时隐藏子；展开后逐层露出节点', () => {
  const topicOnly = display({ expanded: new Set(['topic:t1']) });
  assert.deepEqual([...topicOnly.visibleScale.keys()].sort(), ['topic:t1', 'unit:u1', 'unit:u2']);
  assert.equal(topicOnly.visibleNodes.size, 0, '单元未展开，节点不该出现');

  const unitsOnly = display();
  assert.equal(unitsOnly.visibleNodes.size, 4);
  assert.ok(unitsOnly.visibleScale.has('unit:u1') && unitsOnly.visibleScale.has('topic:t1'));

  const rootUnit = display({ addedNodes: new Set(['n1', 'n2']), addedScale: new Set(['unit:u1']), expanded: new Set(['unit:u1']) });
  assert.ok(rootUnit.visibleNodes.has('n1') && rootUnit.visibleNodes.has('n2'));
  assert.equal(rootUnit.visibleNodes.size, 2, '没有被加入的单元成员不应出现');
});

test('分子：父节点展开才出现；加入分子会把节点展开路径当作前提', () => {
  const closed = display({ expanded: new Set(['topic:t1', 'unit:u1', 'unit:u2']) });
  assert.equal(closed.visibleScale.size, 3, '节点未展开时不应有分子卡片');

  const open = display({
    addedScale: new Set(['topic:t1', 'mol:n1']),
    expanded: new Set(['topic:t1', 'unit:u1', 'unit:u2', 'n1']),
    autoMerge: false,
  });
  assert.ok(open.visibleScale.has('mol:n1'));
  assert.ok(!open.visibleScale.has('mol:n2'), '未加入且 n2 未展开，不该出现');
});

test('自动合拢：全部成员可见且同屏相近才并回单元（≤55%）', () => {
  const near = display({ autoMerge: true, zoom: 0.55 });
  assert.equal(near.visibleNodes.size, 0, '两个节点都应收进单元');
  assert.equal(near.visibleScale.get('unit:u1')?.form, 'card');
  assert.deepEqual(near.visibleScale.get('unit:u1')?.merged, { count: 2, total: 2 });
  assert.equal(near.mergedChildren.get('unit:u1')?.length, 2);

  const above = display({ autoMerge: true, zoom: 0.56 });
  assert.equal(above.visibleNodes.size, 4, '超过阈值不合并');

  const disabled = display({ autoMerge: false, zoom: 0.3 });
  assert.equal(disabled.visibleNodes.size, 4, '关闭开关不合并');
});

test('自动合拢：成员不全、成员分散、只有一个成员都不合并', () => {
  const partial = display({ autoMerge: true, zoom: 0.3, addedNodes: new Set(['n1', 'n2', 'n3']), addedScale: new Set(['unit:u1', 'unit:u2']), expanded: new Set(['unit:u1', 'unit:u2']) });
  assert.equal(partial.visibleNodes.size, 1, '单元一完整合并，单元二差一个成员所以 n3 留下');
  assert.ok(partial.visibleNodes.has('n3'));
  assert.deepEqual(partial.visibleScale.get('unit:u1')?.merged, { count: 2, total: 2 });
  assert.equal(partial.visibleScale.get('unit:u2')?.merged ?? null, null, '单元二少一个成员，不应合并');

  const far = display({ autoMerge: true, zoom: 0.55, nodePositions: positions({ n1: { x: 0, y: 0 }, n2: { x: 1000, y: 0 }, n3: { x: 200, y: 0 }, n4: { x: 300, y: 0 } }) });
  assert.equal(far.visibleNodes.size, 2, '单元一成员分散，不应合并；单元二成员相近，合并后只剩 n1、n2');
  assert.equal(far.visibleScale.get('unit:u1')?.merged ?? null, null);
  assert.deepEqual(far.visibleScale.get('unit:u2')?.merged, { count: 2, total: 2 });
});

test('自动合拢：话题在 ≤30% 且成员单元全部可见时合并；节点合拢后单元仍可再合拢', () => {
  const topicMerged = display({ autoMerge: true, zoom: 0.3 });
  assert.deepEqual(topicMerged.visibleScale.get('topic:t1')?.merged, { count: 2, total: 2 });
  assert.ok(!topicMerged.visibleScale.has('unit:u1'));
  assert.equal(topicMerged.visibleNodes.size, 0);
  assert.equal(topicMerged.counts.merged >= 2, true);
});

test('滞后带：已合拢的单元在阈值 + 0.06 以内保持合拢', () => {
  const previous = new Set(['unit:u1', 'unit:u2']);
  const held = display({ autoMerge: true, zoom: 0.59, previousMerged: previous });
  assert.equal(held.visibleNodes.size, 0, '0.59 在 0.55 + 0.06 内，应保持合拢');
  const released = display({ autoMerge: true, zoom: 0.62, previousMerged: previous });
  assert.equal(released.visibleNodes.size, 4, '超过滞后带应解开');
});

test('分子并回节点：同一节点的分子在 ≤90% 时隐藏；单分子也收（它是节点的明细）', () => {
  const base = { autoMerge: true, addedScale: new Set(['topic:t1', 'mol:n1', 'mol:n1b', 'mol:n2']), expanded: new Set(['topic:t1', 'unit:u1', 'unit:u2', 'n1', 'n2']) };
  const open = display({ ...base, zoom: 0.91 });
  assert.ok(open.visibleScale.has('mol:n1') && open.visibleScale.has('mol:n1b'), '0.91 高于阈值');
  const merged = display({ ...base, zoom: 0.9 });
  assert.ok(!merged.visibleScale.has('mol:n1') && !merged.visibleScale.has('mol:n1b'));
  assert.ok(!merged.visibleScale.has('mol:n2'), '单分子也收：它不是独立对象，只是节点的中心对象明细');
  assert.deepEqual(merged.mergedChildren.get('n1')?.sort(), ['mol:n1', 'mol:n1b']);
  assert.deepEqual(merged.mergedChildren.get('n2'), ['mol:n2']);
});

test('边投影：隐藏节点映射到单元卡片，同对合并计数，内部边丢弃', () => {
  const hidden = display({ autoMerge: true, zoom: 0.55 });
  const edges = [
    { source: 'contract', id: 'e1', from: 'n1', to: 'n3', actionId: 'a', actionTitle: 'a', mode: 'definition' },
    { source: 'relation', id: 'e2', from: 'n1', to: 'n3', kind: 'hardPrereq', witnessStatus: 'PROOF', scope: null, scaling: null },
    { source: 'contract', id: 'e3', from: 'n1', to: 'n2', actionId: 'a', actionTitle: 'a', mode: 'definition' },
  ];
  const projected = projectScaleEdges(edges, hidden, () => 1);
  assert.equal(projected.internal, 1, 'n1→n2 都落在单元一，属于内部边');
  assert.equal(projected.edges.length, 1);
  assert.equal(projected.edges[0].count, 2);
  assert.equal(projected.edges[0].from, 'unit:u1');
  assert.equal(projected.edges[0].to, 'unit:u2');
  assert.equal(projected.edges[0].representative.id, 'e1', '同权重时按 id 稳定排序');
});

test('放置：单元 header 在节点包围盒上方；话题 header 在单元上方；码头无重叠', () => {
  const shown = display();
  const unit = shown.visibleScale.get('unit:u1');
  assert.ok(unit, '单元应有位置');
  assert.equal(unit.form, 'header');
  assert.ok(unit.anchor.y < 0, 'header 应在节点 y=0 上方');
  const topic = shown.visibleScale.get('topic:t1');
  assert.ok(topic && topic.anchor.y < unit.anchor.y, '话题 header 应叠在单元上方');

  const docked = display({ addedNodes: new Set(), expanded: new Set(), addedScale: new Set(['unit:u1', 'unit:u2']) });
  const one = docked.visibleScale.get('unit:u1');
  const two = docked.visibleScale.get('unit:u2');
  assert.ok(one && two);
  assert.ok(one.anchor.x !== two.anchor.x || one.anchor.y !== two.anchor.y, '码头卡片不能完全重合');
  assert.ok(scaleFitBounds(docked, positions()) !== null);
});

test('矩形锚点与 fit 包围盒覆盖可见节点和尺度卡片', () => {
  const shown = display();
  const from = displayRect('n1', shown, positions());
  const to = displayRect('unit:u2', shown, positions());
  assert.ok(from && to);
  const anchors = rectAnchors(from, to);
  assert.ok(Number.isFinite(anchors.x1) && Number.isFinite(anchors.y2));
  const bounds = scaleFitBounds(shown, positions());
  assert.ok(bounds && bounds.maxX >= 300 && bounds.minY < 0);
});

test('URL 解析与 id 过滤：all、未知值、去重、计划存在性', () => {
  assert.deepEqual(parseScaleLevels('all'), ['molecule', 'node', 'unit', 'topic']);
  assert.deepEqual(parseScaleLevels('topic,unit,unknown,unit'), ['unit', 'topic']);
  assert.deepEqual(parseScaleLevels(null), []);
  assert.deepEqual(parseScaleIds('a,a,b,,'), ['a', 'b']);
  assert.equal(scaleIdsParam([]), null);
  assert.equal(scaleIdsParam(['a', 'b']), 'a,b');
  assert.deepEqual(existingScaleIds(['unit:u1', 'missing'], catalogue), ['unit:u1']);
  assert.equal(SCALE_CARD_PX.unit.w, 196);
  assert.equal(SCALE_LOD.nearPx, 320);
});

test('手动位置：拖过的卡片按世界坐标左上角落位，不被成员包围盒拉回', () => {
  const manual = display({ manualPositions: new Map([['unit:u1', { x: 999, y: 888 }]]) });
  assert.deepEqual(manual.visibleScale.get('unit:u1')?.anchor, { x: 999, y: 888 });
  assert.notDeepEqual(manual.visibleScale.get('unit:u2')?.anchor, { x: 999, y: 888 });
});

test('折叠话题 / 未展开话题：整支节点隐藏，边归到话题卡片', () => {
  const collapsed = display({ addedScale: new Set(['topic:t1']), expanded: new Set(), addedNodes: new Set(['n1', 'n2', 'n3', 'n4']) });
  assert.equal(collapsed.visibleNodes.size, 0);
  assert.equal(collapsed.displayOfNode.get('n1'), 'topic:t1');
  assert.equal(collapsed.visibleScale.get('topic:t1')?.form, 'card');
});

test('跨归属节点：显示时主父对象取当前可见的那个，不按全库 id 排序', () => {
  const cross = buildScaleCatalogue({
    schema: 'x', status: 'y', levels: [],
    units: [
      { id: 'unit:a', scale: 'unit', sigma: 3, title: 'A', titleSource: 'manual', members: ['n1', 'n9'], organization: 'o', source: 's', sourceAggregate: 'a', sourceBlock: null, pathId: null, provisional: true, evidenceStatus: 'ILLUSTRATION' },
      { id: 'unit:b', scale: 'unit', sigma: 3, title: 'B', titleSource: 'manual', members: ['n1', 'n2'], organization: 'o', source: 's', sourceAggregate: 'a', sourceBlock: null, pathId: null, provisional: true, evidenceStatus: 'ILLUSTRATION' },
    ],
    topics: [], paths: [], molecules: [],
    counts: { levels: 4, units: 2, topics: 0, paths: 0, molecules: 0, aggregateUnits: 2, blockUnits: 0, nodes: 3, nodesCovered: 3, nodesUncovered: 0, unfinishedNodeIds: [] },
    notes: [],
  });
  const shown = resolveScaleDisplay({
    catalogue: cross,
    enabled: new Set(['node', 'unit']),
    addedNodes: new Set(['n1', 'n2']),
    addedScale: new Set(['unit:b']),
    expanded: new Set(['unit:b']),
    autoMerge: true,
    zoom: 0.5,
    nodePositions: new Map([['n1', { x: 0, y: 0 }], ['n2', { x: 90, y: 0 }]]),
  });
  assert.deepEqual(shown.visibleScale.get('unit:b')?.merged, { count: 2, total: 2 }, '显示主父应是可见的 unit:b');
  assert.equal(shown.visibleNodes.size, 0);
});

test('话题不替「成员节点还摊在外面」的单元合拢', () => {
  const spread = display({
    autoMerge: true,
    zoom: 0.3,
    nodePositions: positions({ n1: { x: -1000, y: 0 }, n2: { x: 1000, y: 0 }, n3: { x: -100, y: 0 }, n4: { x: 100, y: 0 } }),
  });
  assert.equal(spread.visibleScale.get('topic:t1')?.merged ?? null, null, '单元一还有可见节点，话题不该合并它');
  assert.ok(spread.visibleScale.has('unit:u1'), '单元一应保留 header/card 与可见节点');
});

test('手动展开豁免：本轮不自动合拢，去掉豁免后恢复阈值', () => {
  const exempt = display({
    autoMerge: true, zoom: 0.3, addedScale: new Set(['unit:u1', 'unit:u2']), expanded: new Set(['unit:u1', 'unit:u2']),
    enabled: new Set(['node', 'unit']), exemptMerges: new Set(['unit:u1', 'unit:u2']),
  });
  assert.equal(exempt.visibleNodes.size, 4, '刚手动展开的父对象不该在同一帧被收回');
  assert.equal(exempt.visibleScale.get('unit:u1')?.merged ?? null, null);
});
