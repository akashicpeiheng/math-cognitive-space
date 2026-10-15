import test from 'node:test';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { MCS_WEB_ROOT } from '../core/ontology.mjs';

/**
 * `web/src/start-direction.ts` 的**自足**夹具验收。
 *
 * ## 为什么要有这一套（与 `tests/start-direction.test.mjs` 的分工）
 *
 * `tests/start-direction.test.mjs` 在**真实本体**上核对（数字与语料一致、背景接口的学科
 * 确实是「集合论」这类事实），但它依赖 `loadOntology()`——只要装配链上有任何一个文件
 * 暂时坏掉（并行开发时很常见），它就连带跑不了，于是「本模块本身对不对」这个问题
 * 也跟着无法回答。
 *
 * 这一套用**手写夹具**，不读任何 `data/`，因此：
 * - 本体的内容怎么改都不影响它（不会因为语料变化而假红）；
 * - 装配链坏掉时它照样能跑，能回答「判据本身错了，还是数据坏了」这个区分。
 *
 * 夹具刻意造出四个场面，每个对应一条必须成立的性质：
 * 1. **背景接口**（没有任何行动能产出它）与**内容节点**要在学科分布里分开；
 * 2. **成环**（互相要求、拆不开）不许伪造层号；
 * 3. **兴趣只改顺序**，集合一个都不少；
 * 4. **悬空目标 id / 话题级目标**都不给卡，也不抛错。
 */

const {
  buildGoalCard, buildGoalCards, disciplineTotals, interestMatch, presentDisciplines,
  presentPresets, previewOf, rankGoalCards, summarizeDirection,
} = await import(pathToFileURL(resolve(MCS_WEB_ROOT, 'web/src/start-direction.ts')).href);

/**
 * 夹具本体。
 *
 * 结构（`→` 读作「产出」）：
 * - `bg:set`（**没有产出行动**，学科登记为 `集合论`——正是真实语料里 `bg:set:function` 的处境）
 * - `bg:top`（同样没有产出行动，学科 `拓扑`）
 * - `g:space` ← bg:top（学科 `拓扑`）
 * - `g:dual`  ← g:space（学科 `线性代数`）
 * - `g:goal`  ← g:dual **且** 硬前置 g:space（学科 `线性代数`）
 * - `g:loop-a` ⇄ `g:loop-b`（互相是对方的输入 —— 成环，拆不开）
 */
const nodes = [
  // 背景接口：没有任何行动产出它们（判据与 `starting-nodes.ts` 的 root 同源）。
  { id: 'bg:set', title: '函数与集合背景', granularity: 'unit', discipline: '集合论', case: 'background' },
  { id: 'bg:top', title: '拓扑空间与局部欧氏性', granularity: 'unit', discipline: '拓扑', case: 'background' },
  // 内容节点。
  { id: 'g:space', title: '拓扑空间', granularity: 'unit', discipline: '拓扑', case: 'demo' },
  { id: 'g:dual', title: '对偶空间', granularity: 'unit', discipline: '线性代数', case: 'demo' },
  { id: 'g:goal', title: '目标：对偶与算子的同构', granularity: 'unit', discipline: '线性代数', case: 'demo' },
  // 成环的一对：拆不开，因此不许拿到层号。
  { id: 'g:loop-a', title: '环 A', granularity: 'unit', discipline: '拓扑', case: 'demo' },
  { id: 'g:loop-b', title: '环 B', granularity: 'unit', discipline: '拓扑', case: 'demo' },
  // 话题级条目：不能当方向落点。
  { id: 'g:thread', title: '话题级线索', granularity: 'topic', discipline: '拓扑', case: 'demo' },
];

const actions = [
  { id: 'a-space', title: '引入拓扑空间', mode: 'definition', inputs: [{ node: 'bg:top', accepts: ['statement'] }], outputs: [{ node: 'g:space', provides: ['statement'] }] },
  { id: 'a-dual', title: '引入对偶空间', mode: 'definition', inputs: [{ node: 'g:space', accepts: ['statement'] }], outputs: [{ node: 'g:dual', provides: ['statement'] }] },
  // 目标要 g:dual（契约输入）与 g:space（硬前置，见下面 relations）。
  { id: 'a-goal', title: '引入目标', mode: 'definition', inputs: [{ node: 'g:dual', accepts: ['statement'] }], outputs: [{ node: 'g:goal', provides: ['statement'] }] },
  // 成环：两条契约互为输入。
  { id: 'a-loop-a', title: '引入环 A', mode: 'definition', inputs: [{ node: 'g:loop-b', accepts: ['statement'] }], outputs: [{ node: 'g:loop-a', provides: ['statement'] }] },
  { id: 'a-loop-b', title: '引入环 B', mode: 'definition', inputs: [{ node: 'g:loop-a', accepts: ['statement'] }], outputs: [{ node: 'g:loop-b', provides: ['statement'] }] },
];

const relations = [
  { id: 'r-hard', kind: 'hardPrereq', from: 'g:space', to: 'g:goal', witness: { status: 'DEF' } },
];

const graph = { nodes, actions, relations };
const theta = { known: [] };

const presets = [
  { id: 'g:goal', title: '对偶与算子的同构' },
  { id: 'g:dual', title: '对偶空间' },
  { id: 'g:space', title: '拓扑空间' },
];

/* ───────────────────── 1) 背景接口与内容分开 ───────────────────── */

test('夹具：背景接口不混进内容学科分布', () => {
  const card = buildGoalCard('g:goal', graph, { theta, steps: 0 });
  assert.ok(card, '目标应当出卡');

  /*
   * `bg:set` 与 `bg:top` 都**没有**产出行动，因此都是背景接口。
   * 但 `bg:set` 不在这条目标的核心链上（没有行动引它进来），所以它出现在骨架里
   * 只可能是因为被误算进去——这正是本测试要排除的。
   */
  assert.deepEqual([...card.skeleton.interfaces].sort(), ['bg:top']);

  // 内容分布里不许出现「集合论」——夹具里只有 bg:set 一支学科是集合论。
  const sliceIds = card.skeleton.disciplines.map((slice) => slice.id);
  assert.equal(sliceIds.includes('集合论'), false, `背景接口的学科混进了内容分布：${JSON.stringify(sliceIds)}`);

  // 不重不漏：分布之和 + 接口数 == 待学数。
  const sum = card.skeleton.disciplines.reduce((total, slice) => total + slice.count, 0);
  assert.equal(sum + card.skeleton.interfaces.length, card.skeleton.pending.length);

  // 每一个出现在分布里的学科，都必须有**真的内容节点**属于它。
  const contentIds = new Set(card.skeleton.pending.filter((id) => !card.skeleton.interfaces.includes(id)));
  for (const slice of card.skeleton.disciplines) {
    assert.ok(
      [...contentIds].some((id) => nodes.find((node) => node.id === id).discipline === slice.id),
      `学科切片的 ${slice.id} 只由背景接口凑出来`,
    );
  }
});

/* ───────────────────── 2) 待学集合与可用入口 ───────────────────── */

test('夹具：待学 = 未决核心，入口 = 现在就能开始的那部分', () => {
  const card = buildGoalCard('g:goal', graph, { theta, steps: 0 });
  /*
   * 核心 = 目标 + 绕不过去的那条链，一条不少：
   * `g:goal` ← 契约输入 `g:dual`、硬前置 `g:space`；`g:dual` ← `g:space`；`g:space` ← `bg:top`。
   * `bg:set` 不在链上（没有行动引它进来），因此不该出现在待学里。
   */
  assert.deepEqual(
    [...card.skeleton.pending].sort(),
    ['bg:top', 'g:dual', 'g:goal', 'g:space'],
  );
  // 现在能开始的只有 bg:top：没有任何行动产出它，因此不需要等前置。
  assert.deepEqual([...card.skeleton.frontier].sort(), ['bg:top']);
  // 其余都是「还不能开始」，且差集不漏。
  assert.deepEqual(
    [...card.skeleton.blockedNow].sort(),
    card.skeleton.pending.filter((id) => !card.skeleton.frontier.includes(id)).sort(),
  );
  // 摘要与骨架一一对应。
  const summary = summarizeDirection(card);
  assert.equal(summary.pending, card.skeleton.pending.length);
  assert.equal(summary.nowStartable, card.skeleton.frontier.length);
  assert.equal(summary.interfaces, card.skeleton.interfaces.length);
});

test('夹具：声明背景之后待学数变小（θ 真的参与）', () => {
  const blank = buildGoalCard('g:goal', graph, { theta: { known: [] }, steps: 0 });
  // 只声明链上那一个背景接口 `bg:top`；`bg:set` 本来就不在这条核心链上。
  const declared = buildGoalCard('g:goal', graph, { theta: { known: [{ node: 'bg:top' }] }, steps: 0 });
  assert.ok(declared.skeleton.pending.length < blank.skeleton.pending.length, '声明背景之后待学数应当变少');
  assert.deepEqual(declared.skeleton.confirmed, ['bg:top']);
  // 而且差值恰好是「那一个确认的节点」：待学集合变化只有这一个来源。
  assert.equal(
    blank.skeleton.pending.length - declared.skeleton.pending.length, 1,
    '待学数只该减少已确认的那一个节点',
  );
  // 背景确认之后，拓扑空间成为新的入口（它的契约输入已确认）。
  assert.ok(declared.skeleton.frontier.includes('g:space'), '背景确认后 g:space 应当成为入口');
});

/* ───────────────────── 3) 成环：不伪造层号 ───────────────────── */

test('夹具：成环的节点如实报告，且不拿到层号', () => {
  const card = buildGoalCard('g:loop-a', graph, { theta, steps: 0 });
  assert.ok(card.skeleton.unresolved.length > 0, 'g:loop-a 的目标核心应当成环');
  assert.equal(card.skeleton.truncated, true, '有拆不开的节点时 truncated 必须为真');
  const inLevels = new Set(card.skeleton.levels.flatMap((level) => level.nodes));
  for (const id of card.skeleton.unresolved) {
    assert.equal(inLevels.has(id), false, `${id} 既在成环清单里又拿到了层号`);
  }
  // 层号从 1 起、连续、节点不重复。
  const seen = new Set();
  card.skeleton.levels.forEach((level, index) => {
    assert.equal(level.level, index + 1, '层号必须从 1 起且连续');
    for (const id of level.nodes) {
      assert.equal(seen.has(id), false, `${id} 在两个层里各出现一次`);
      seen.add(id);
    }
  });
});

/* ───────────────────── 4) 兴趣：只改顺序 ───────────────────── */

test('夹具：兴趣匹配是整数计数，且只改顺序', () => {
  const cards = buildGoalCards(graph, presets, { theta });
  assert.equal(cards.length, presets.length, '每条预设都应当出卡');
  for (const card of cards) {
    assert.equal(interestMatch(card, []), 0, '没选兴趣时匹配分为 0');
    const ownSlice = card.skeleton.disciplines.find((slice) => slice.id === card.discipline);
    assert.equal(interestMatch(card, [card.discipline]), 2 + (ownSlice?.count ?? 0));
    // 夹具里没有的学科：得 0，不是负数。
    assert.equal(interestMatch(card, ['不存在的学科']), 0);
  }

  const baseline = buildGoalCards(graph, presets, { theta }).map((card) => card.node);
  const byTopology = buildGoalCards(graph, presets, { theta, interests: ['拓扑'] }).map((card) => card.node);
  // 集合不变（兴趣不隐藏任何方向）。
  assert.deepEqual([...byTopology].sort(), [...baseline].sort(), '兴趣把某些方向藏起来了');
  // 顺序确实可能变：这里用「拓扑」把 g:space 提前。
  assert.equal(byTopology[0], 'g:space', `选拓扑时排第一的是 ${byTopology[0]}`);
  assert.equal(new Set(byTopology).size, presets.length, '同一个方向出现了两次');
});

test('夹具：排序三条判据逐条可观察', () => {
  const card = (node, match, count) => ({
    node, title: node, discipline: 'D', intent: 'route', next: null, frontierOptions: [],
    preview: [], previewTruncated: false, match,
    skeleton: {
      all: [], confirmed: [], pending: new Array(count).fill('x'), levels: [], unresolved: [],
      truncated: false, limited: false, disciplines: [], interfaces: [], frontier: [], blockedNow: [],
    },
  });
  const order = presets;
  assert.deepEqual(rankGoalCards([card('g:goal', 0, 9), card('g:dual', 5, 1)], order).map((c) => c.node), ['g:dual', 'g:goal']);
  assert.deepEqual(rankGoalCards([card('g:goal', 3, 1), card('g:dual', 3, 9)], order).map((c) => c.node), ['g:dual', 'g:goal']);
  assert.deepEqual(
    rankGoalCards([card('g:space', 0, 2), card('g:goal', 0, 2), card('g:dual', 0, 2)], order).map((c) => c.node),
    ['g:goal', 'g:dual', 'g:space'],
  );
});

/* ───────────────────── 5) 边界：不给假卡 ───────────────────── */

test('夹具：悬空与话题级的目标都不给卡，也不抛错', () => {
  assert.equal(buildGoalCard('nope:missing', graph, { theta }), null);
  assert.equal(buildGoalCard('g:thread', graph, { theta }), null, '话题级条目不能当方向落点');
  assert.equal(buildGoalCard('g:goal', null), null);
  assert.deepEqual(buildGoalCards(null, presets), []);
  assert.deepEqual(buildGoalCards(graph, []), []);
  // 悬空 id 从预设里被过滤掉，不生成空卡。
  assert.deepEqual(
    presentPresets([...presets, { id: 'nope:missing', title: '幽灵' }], graph).map((preset) => preset.id),
    presets.map((preset) => preset.id),
  );
});

test('夹具：次级学科清单来自数据，且只算单元', () => {
  const ids = presentDisciplines(graph);
  assert.deepEqual([...ids].sort(), ['拓扑', '线性代数', '集合论']);
  // 单元计数：拓扑 = bg:top + g:space + 两个环 = 4；线性代数 = g:dual + g:goal = 2；集合论 = bg:set = 1。
  const totals = new Map(disciplineTotals(graph, 'unit').map((item) => [item.id, item.count]));
  assert.equal(totals.get('拓扑'), 4);
  assert.equal(totals.get('线性代数'), 2);
  assert.equal(totals.get('集合论'), 1);
  // 话题级条目（g:thread，学科也是拓扑）只在「全部」档里出现，不进单元档。
  const all = new Map(disciplineTotals(graph, 'all').map((item) => [item.id, item.count]));
  assert.equal(all.get('拓扑'), totals.get('拓扑') + 1);
});

test('夹具：预览不超过步数上限，且如实说「只是上限」', () => {
  const card = previewOf('g:goal', graph, { theta });
  assert.ok(card.preview.length > 0 && card.preview.length <= 5, `预览步数 ${card.preview.length} 不在 1..5`);
  const ids = new Set(nodes.map((node) => node.id));
  for (const step of card.preview) {
    assert.ok(ids.has(step.node), `预览里有解析不到的节点 ${step.node}`);
    assert.ok(step.title.trim().length > 0, `预览步骤 ${step.node} 没有标题`);
  }
  // 列表用的卡不付预览的代价。
  for (const listed of buildGoalCards(graph, presets, { theta })) {
    assert.deepEqual(listed.preview, [], '列表里的卡不该带预览');
  }
});
