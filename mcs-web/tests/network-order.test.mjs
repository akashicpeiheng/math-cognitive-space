import test from 'node:test';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { MCS_WEB_ROOT } from '../core/ontology.mjs';

/**
 * 网络视图的两种「重排模式」（2026-10-11 加，`web/src/network-order.ts`）。
 *
 * 用户的要求：「为重排节点位置的按钮添加模式切换功能，区分倾向于学习顺序的节点位置
 * 和倾向于拟合节点天然的逻辑关系的节点位置：前者按照节点与起始节点的距离（隔了几个硬前置）
 * 给节点分配上下的位置关系，起始节点在最上面，高阶的节点在下面；后者按照节点在视图中的
 * 节点群里面的核心程度去决定节点在中心还是周围。起始节点和核心节点的选择交给用户。」（原话）
 *
 * 这一套只查**规则本身**（纯函数，不起浏览器）：层号算得对不对、谁在上、核心在不在中心、
 * 卡片压不压、同一输入两次结果是否逐位相同。界面上可不可以切换、锚点能不能选，
 * 由 `tests/network-order-page.mjs`（真浏览器）管——两处的失败语义不同，因此分开列。
 *
 * 为什么把「确定性」也写进单测：这一页对用户的承诺是「同一 URL 得到同一张图」，
 * 而规则一旦引入 `Set`/`Map` 的遍历顺序之外的东西（随机、时间、DOM），
 * 断言就会红——它是这条承诺的可执行形式。
 */

const order = await import(pathToFileURL(resolve(MCS_WEB_ROOT, 'web/src/network-order.ts')).href);
const network = await import(pathToFileURL(resolve(MCS_WEB_ROOT, 'web/src/network.ts')).href);
const { loadOntology } = await import(pathToFileURL(resolve(MCS_WEB_ROOT, 'core/ontology.mjs')).href);

const {
  ORDER_LAYOUT, LAYOUT_MODES, isLayoutMode, hardPrereqDepths, hardPrereqAncestorCount,
  startCandidateOrder, suggestStartNode, coreScores, coreCandidateOrder, suggestCoreNode,
  learningOrderArrangement, coreRingArrangement, separateFromManual,
} = order;
const { NODE_W, NODE_H, buildEdges, DEFAULT_FAMILIES } = network;

/** 硬前置关系的简写：`pre('a','b')` = a 是 b 的硬前置。 */
const pre = (from, to) => ({ kind: 'hardPrereq', from, to });

function titlesOf(ids) {
  return new Map(ids.map((id) => [id, id.toUpperCase()]));
}

/** 重叠对（含间隙为 0 时的「贴住」不算重叠：判据与网络页其它验收一致）。 */
function overlaps(nodes) {
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

const byId = (layout) => new Map(layout.placed.map((node) => [node.id, node]));
/** 由边列表造一条 NetworkEdge（只用到 from/to 与权重表需要的字段）。 */
const edge = (from, to, source = 'contract') => (source === 'contract'
  ? { source: 'contract', id: `ct-${from}-${to}`, from, to, mode: 'deduction', actionId: 'a1', witnessType: 'test', witnessStatus: 'DEF' }
  : { source: 'relation', id: `rl-${from}-${to}`, from, to, kind: 'hardPrereq', witnessStatus: 'DEF', scope: null });

/* —— 1. 层号：只沿正向数，且不因视图缺中间节点而变短 —— */

test('层号按硬前置的正向数：起始节点是 0，它的前置不在表里', () => {
  const relations = [pre('a', 'b'), pre('b', 'c'), pre('z', 'a')];
  const depths = hardPrereqDepths(relations, 'a');
  assert.deepEqual([...depths.entries()].sort(), [['a', 0], ['b', 1], ['c', 2]]);
  assert.equal(depths.has('z'), false, '反向（前置）不该被算成下游');
});

test('层号取最短路径；距离按本体算，不按视图里恰好放了谁算', () => {
  const relations = [pre('a', 'b'), pre('b', 'c'), pre('a', 'c'), pre('c', 'd')];
  const depths = hardPrereqDepths(relations, 'a');
  assert.equal(depths.get('c'), 1, '有直达路径时不该记成长路径');
  assert.equal(depths.get('d'), 2);
  // 视图里没有 b，也不影响 a→c 的距离（函数只吃本体关系）。
  const arrangement = learningOrderArrangement({ ids: ['a', 'c', 'd'], titles: titlesOf(['a', 'c', 'd']), edges: [], relations, start: 'a' });
  assert.deepEqual(arrangement.bands.map((band) => [band.value, band.nodes]), [[0, ['a']], [1, ['c']], [2, ['d']]]);
});

/* —— 2. 学习顺序：起始节点在最上面，层号越大越靠下 —— */

test('学习顺序：起始节点在最上面，高阶节点在下面，层号大的一律更低', () => {
  const relations = [pre('a', 'b'), pre('b', 'c'), pre('a', 'd')];
  const ids = ['a', 'b', 'c', 'd'];
  const arrangement = learningOrderArrangement({ ids, titles: titlesOf(ids), edges: [], relations, start: 'a' });
  const place = byId(arrangement.layout);
  assert.equal(place.get('a').y, Math.min(...arrangement.layout.placed.map((node) => node.y)), '起始节点必须在最上面');
  assert.ok(place.get('b').y > place.get('a').y && place.get('c').y > place.get('b').y, '层号越大越靠下');
  assert.deepEqual(arrangement.bands.map((band) => band.value), [0, 1, 2]);
  assert.equal(arrangement.ranked, 4);
  assert.deepEqual(arrangement.offPath, []);
});

test('学习顺序：不在下游的节点（起始节点自己的前置、无关节点）单独放在最下一层，并标出来', () => {
  const relations = [pre('z', 'a'), pre('a', 'b')];
  const ids = ['a', 'b', 'z', 'lonely'];
  const arrangement = learningOrderArrangement({ ids, titles: titlesOf(ids), edges: [], relations, start: 'a' });
  const place = byId(arrangement.layout);
  const offBand = arrangement.bands.at(-1);
  assert.equal(offBand.offPath, true);
  assert.deepEqual([...offBand.nodes].sort(), ['lonely', 'z'], '前置与无关节点都进「不在下游」那一档');
  assert.ok(place.get('z').y > place.get('b').y && place.get('lonely').y > place.get('b').y, '它们在所有下游层之下');
  assert.deepEqual([...arrangement.offPath].sort(), ['lonely', 'z']);
  assert.equal(arrangement.ranked, 2, 'ranked 只数下游（含起始节点）');
});

test('学习顺序：同层按上一层的前置列重心排（不按 id 字典序）', () => {
  // s → a、s → b 先定下 a 在左、b 在右；再让 y 依赖 a、x 依赖 b：
  // 重心法应当把 y 排在 x 左边，尽管 id 字典序是 x < y。
  const relations = [pre('s', 'a'), pre('s', 'b'), pre('a', 'y'), pre('b', 'x')];
  const ids = ['s', 'a', 'b', 'x', 'y'];
  const arrangement = learningOrderArrangement({ ids, titles: titlesOf(ids), edges: [], relations, start: 's' });
  const layer = arrangement.bands.find((band) => band.value === 2);
  assert.deepEqual(layer.nodes, ['y', 'x'], '依赖左边的那个排左边');
  const place = byId(arrangement.layout);
  assert.ok(place.get('y').x < place.get('x').x);
});

test('学习顺序：一层超过列数上限就折行，宽度不会无限摊开', () => {
  const ids = ['s', ...Array.from({ length: 12 }, (_, index) => `n${String(index).padStart(2, '0')}`)];
  const relations = ids.slice(1).map((id) => pre('s', id));
  const arrangement = learningOrderArrangement({ ids, titles: titlesOf(ids), edges: [], relations, start: 's' });
  const layer = arrangement.bands.find((band) => band.value === 1);
  assert.equal(layer.nodes.length, 12);
  const place = byId(arrangement.layout);
  const xs = layer.nodes.map((id) => place.get(id).x);
  const ys = layer.nodes.map((id) => place.get(id).y);
  const columns = new Set(xs);
  assert.equal(columns.size, ORDER_LAYOUT.maxColumns, '一层最多摆 ' + ORDER_LAYOUT.maxColumns + ' 列');
  assert.equal(new Set(ys).size, 2, '多出来的折到第二行');
  const width = Math.max(...xs) - Math.min(...xs);
  assert.ok(width <= (ORDER_LAYOUT.maxColumns - 1) * (NODE_W + ORDER_LAYOUT.columnGap) + 0.001, '宽度受列数上限约束');
});

test('学习顺序：卡片不重叠（构造保证），同一输入两次结果逐位相同', () => {
  const relations = [pre('a', 'b'), pre('a', 'c'), pre('b', 'd'), pre('c', 'd'), pre('d', 'e'), pre('z', 'a')];
  const ids = ['a', 'b', 'c', 'd', 'e', 'z', 'w'];
  const input = { ids, titles: titlesOf(ids), edges: [edge('a', 'b'), edge('d', 'e')], relations, start: 'a' };
  const first = learningOrderArrangement(input);
  const again = learningOrderArrangement(input);
  assert.deepEqual(first, again, '确定性：两次调用必须完全一样');
  assert.deepEqual(overlaps(first.layout.placed), []);
  assert.deepEqual([...first.layout.isolated].sort(), ['c', 'w', 'z'], '只有真正没有边的节点才算未连接');
});

/* —— 3. 逻辑核心：核心在中心，核心程度高的在内圈 —— */

test('核心程度：枢纽分数最高，孤立节点最低，且可复现', () => {
  const edges = [edge('hub', 'a'), edge('hub', 'b'), edge('hub', 'c'), edge('a', 'b')];
  const ids = ['hub', 'a', 'b', 'c', 'island'];
  const scores = coreScores(ids, edges);
  assert.ok(scores.get('hub') > scores.get('c'), '直接连三个的枢纽高于只连一个的叶子');
  for (const other of ['hub', 'a', 'b', 'c']) {
    assert.ok(scores.get('island') < scores.get(other), `没有边的节点必须低于 ${other}`);
  }
  assert.equal(Math.max(...scores.values()), 1, '归一化到 0–1');
  assert.deepEqual([...coreScores(ids, edges)], [...scores], '同一输入同一结果');
  assert.equal(coreCandidateOrder(ids, edges)[0], 'hub');
  assert.equal(suggestCoreNode(ids, edges), 'hub');
});

test('逻辑核心：核心在中心，其余按核心程度由内到外分圈', () => {
  const edges = [edge('core', 'a'), edge('core', 'b'), edge('a', 'b'), edge('a', 'c')];
  const ids = ['core', 'a', 'b', 'c', 'd'];
  const arrangement = coreRingArrangement({ ids, titles: titlesOf(ids), edges, core: 'core' });
  const place = byId(arrangement.layout);
  const centre = { x: arrangement.layout.width / 2, y: arrangement.layout.height / 2 };
  const distance = (id) => Math.hypot(place.get(id).x + NODE_W / 2 - centre.x, place.get(id).y + NODE_H / 2 - centre.y);
  assert.equal(arrangement.anchor, 'core');
  assert.equal(arrangement.bands[0].nodes[0], 'core');
  for (const other of ids.filter((id) => id !== 'core')) {
    assert.ok(distance('core') < distance(other), `核心应当比 ${other} 更靠中心`);
  }
  // 圆心那一圈是**用户选的**，不参与「核心程度决定内外」的比较；
  // 从第一圈起，每一圈的核心程度都不低于外一圈（这是那条规则的可执行形式）。
  const scores = arrangement.scores;
  for (let ring = 1; ring + 1 < arrangement.bands.length; ring += 1) {
    const inner = Math.min(...arrangement.bands[ring].nodes.map((id) => scores.get(id)));
    const outer = Math.max(...arrangement.bands[ring + 1].nodes.map((id) => scores.get(id)));
    assert.ok(inner >= outer, `第 ${ring} 圈里最弱的（${inner}）不该低于第 ${ring + 1} 圈里最强的（${outer}）`);
  }
  assert.deepEqual(coreRingArrangement({ ids, titles: titlesOf(ids), edges, core: 'core' }),
    coreRingArrangement({ ids, titles: titlesOf(ids), edges, core: 'core' }), '确定性');
  assert.deepEqual(overlaps(arrangement.layout.placed), []);
});

test('逻辑核心：核心不在视图里时退到核心程度最高的那个，不抛错', () => {
  const edges = [edge('hub', 'a'), edge('hub', 'b')];
  const ids = ['hub', 'a', 'b'];
  const arrangement = coreRingArrangement({ ids, titles: titlesOf(ids), edges, core: 'missing' });
  assert.equal(arrangement.anchor, 'hub');
});

test('空视图与空边集都不抛错，形状与力导向的空输入一致', () => {
  const empty = learningOrderArrangement({ ids: [], titles: new Map(), edges: [], relations: [], start: 'a' });
  assert.deepEqual(empty.layout, { placed: [], width: 0, height: 0, isolated: [], maxColumn: -1, maxRow: -1 });
  const noEdges = coreRingArrangement({ ids: ['a', 'b'], titles: titlesOf(['a', 'b']), edges: [], core: 'a' });
  assert.equal(noEdges.layout.placed.length, 2);
  assert.deepEqual(overlaps(noEdges.layout.placed), []);
  assert.deepEqual(noEdges.layout.isolated, ['a', 'b']);
});

/* —— 4. 让位：手动摆过的卡片不动，规则摆出来的绕开它 —— */

test('让位：手动卡片原地不动，压上来的规则卡片被推开（不出现重叠）', () => {
  const edges = [edge('core', 'a'), edge('core', 'b'), edge('a', 'b')];
  const ids = ['core', 'a', 'b', 'c', 'd'];
  const arrangement = coreRingArrangement({ ids, titles: titlesOf(ids), edges, core: 'core' });
  const victim = arrangement.layout.placed.find((node) => node.id === 'a');
  // 模拟「使用者把 a 拖到了核心正上方」：让位必须把核心这张规则卡片推开，而不是动 a。
  const manual = new Map([['a', { x: victim.x, y: victim.y }]]);
  const moved = { ...victim, x: arrangement.layout.placed.find((node) => node.id === 'core').x, y: arrangement.layout.placed.find((node) => node.id === 'core').y };
  const clashing = {
    ...arrangement.layout,
    placed: arrangement.layout.placed.map((node) => (node.id === 'a' ? moved : node)),
  };
  assert.ok(overlaps(clashing.placed).length > 0, '构造的场面本来应当重叠（否则这条测不到东西）');
  const settled = separateFromManual(clashing, new Set(['a']));
  assert.deepEqual(overlaps(settled.placed), [], '让位之后不应当再有重叠');
  const after = settled.placed.find((node) => node.id === 'a');
  assert.deepEqual({ x: after.x, y: after.y }, { x: moved.x, y: moved.y }, '手动摆的那一张必须原地不动');
  assert.ok(settled.width >= Math.max(...settled.placed.map((node) => node.x)) + NODE_W, '包围盒要跟着让位后的坐标重算');
  // 没有手动卡片时是纯粹的直通（不改变任何坐标）。
  assert.equal(separateFromManual(arrangement.layout, new Set()), arrangement.layout);
});

/* —— 5. 锚点的候选次序（用户看到的那个下拉）—— */

test('起始节点候选：档案里现在就能开始的排前面，其余按登记前置由少到多', () => {
  const relations = [pre('bg', 'x'), pre('bg', 'y'), pre('x', 'y')];
  const ids = ['y', 'x', 'bg'];
  const ordered = startCandidateOrder(ids, ['y'], relations);
  assert.equal(ordered[0], 'y', '被标为起始节点的排最前');
  assert.deepEqual(ordered.slice(1), ['bg', 'x'], '其余按传递前置条数：bg 0 条、x 1 条');
  assert.equal(hardPrereqAncestorCount(relations, 'y'), 2);
  assert.equal(suggestStartNode(ids, [], relations), 'bg', '没有起始节点时退到前置最少的那个');
  assert.equal(suggestStartNode([], [], relations), null);
});

/* —— 5. 真数据：整库视图下两种模式都成立（不重叠、确定、起点在顶 / 核心在中心）—— */

const ontology = await loadOntology();
const rawNodes = ontology.raw.nodes ?? [];
const allIds = rawNodes.map((node) => node.id);
const allTitles = new Map(rawNodes.map((node) => [node.id, node.title]));
const graph = {
  nodes: rawNodes,
  relations: ontology.raw.relationDescriptions ?? [],
  actions: ontology.raw.actions ?? [],
};

test('真数据：整库视图在学习顺序下不重叠、起点在最上面、逐位可复现', () => {
  const edges = buildEdges(graph, new Set(allIds), DEFAULT_FAMILIES);
  const start = suggestStartNode(allIds, [], graph.relations);
  assert.ok(start, '整库视图里应当能选出一个起点');
  const input = { ids: allIds, titles: allTitles, edges, relations: graph.relations, start };
  const arrangement = learningOrderArrangement(input);
  assert.deepEqual(overlaps(arrangement.layout.placed), [], `节点数 ${allIds.length} 时出现重叠`);
  assert.deepEqual(arrangement, learningOrderArrangement(input), '同一输入两次结果必须一样');
  const place = byId(arrangement.layout);
  assert.equal(place.get(start).y, Math.min(...arrangement.layout.placed.map((node) => node.y)));
  const depthOf = hardPrereqDepths(graph.relations, start);
  for (const node of arrangement.layout.placed) {
    const depth = depthOf.get(node.id);
    if (depth === undefined) continue;
    // 层号越小越靠上：任何一对下游节点都满足这条不等式。
    for (const other of arrangement.layout.placed) {
      const otherDepth = depthOf.get(other.id);
      if (otherDepth === undefined || otherDepth <= depth) continue;
      assert.ok(node.y < other.y, `${node.id}（第 ${depth} 层）不该低于 ${other.id}（第 ${otherDepth} 层）`);
    }
  }
  console.log(`  · 学习顺序：整库 ${allIds.length} 个节点、起点 ${start}、${arrangement.bands.length} 档、`
    + `不在下游 ${arrangement.offPath.length} 个；尺寸 ${Math.round(arrangement.layout.width)}×${Math.round(arrangement.layout.height)}`);
});

test('真数据：整库视图在逻辑核心下不重叠、核心在中心、逐位可复现', () => {
  const edges = buildEdges(graph, new Set(allIds), DEFAULT_FAMILIES);
  const core = suggestCoreNode(allIds, edges);
  assert.ok(core, '整库视图里应当能选出一个核心');
  const input = { ids: allIds, titles: allTitles, edges, core };
  const arrangement = coreRingArrangement(input);
  assert.deepEqual(overlaps(arrangement.layout.placed), [], `节点数 ${allIds.length} 时出现重叠`);
  assert.deepEqual(arrangement, coreRingArrangement(input), '同一输入两次结果必须一样');
  const place = byId(arrangement.layout);
  const centre = { x: arrangement.layout.width / 2, y: arrangement.layout.height / 2 };
  const distance = (id) => Math.hypot(place.get(id).x + NODE_W / 2 - centre.x, place.get(id).y + NODE_H / 2 - centre.y);
  const coreGap = Math.hypot(place.get(core).x + NODE_W / 2 - centre.x, place.get(core).y + NODE_H / 2 - centre.y);
  /*
   * 「核心在中心」的判据取**不到一圈的距离**：每一圈都是整圆，因此核心与图形几何中心
   * 的偏差只可能来自最外圈的填充不满（横向/纵向伸展不对称），最大不超过一个圈距。
   * 用「离中心最近的节点就是它」会依赖具体填充，不是这条规则的必然结果。
   */
  assert.ok(coreGap < ORDER_LAYOUT.ringStep, `核心离图形中心 ${Math.round(coreGap)}px，超过了一圈（${ORDER_LAYOUT.ringStep}px）`);
  for (const band of arrangement.bands.slice(1)) {
    for (const id of band.nodes) {
      const radius = Math.hypot(place.get(id).x - place.get(core).x, place.get(id).y - place.get(core).y);
      assert.ok(radius > ORDER_LAYOUT.ringStep * 0.5, `${id} 与核心的距离（${Math.round(radius)}px）不足以说明它在外圈`);
    }
  }
  console.log(`  · 逻辑核心：核心 ${core}、${arrangement.bands.length} 圈、核心离几何中心 ${Math.round(coreGap)}px、`
    + `尺寸 ${Math.round(arrangement.layout.width)}×${Math.round(arrangement.layout.height)}`);
});

test('模式枚举与解析：未知值一律回落到默认档', () => {
  assert.deepEqual([...LAYOUT_MODES], ['free', 'learning', 'logic']);
  assert.equal(isLayoutMode('learning'), true);
  assert.equal(isLayoutMode('logic'), true);
  assert.equal(isLayoutMode('free'), true);
  assert.equal(isLayoutMode('随便'), false);
  assert.equal(isLayoutMode(null), false);
  // 设计取值集中在一处，改小数会同时让登记表红。
  assert.equal(ORDER_LAYOUT.maxColumns, 10);
  assert.equal(ORDER_LAYOUT.ringStep, 210);
  assert.equal(ORDER_LAYOUT.minChord, 200);
});
