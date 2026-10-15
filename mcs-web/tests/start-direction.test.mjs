import test from 'node:test';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { MCS_WEB_ROOT, loadOntology } from '../core/ontology.mjs';
import { DIRECTION_PRESETS, directionPresets } from '../web/src/direction-presets.ts';

/**
 * 开始学习页的方向派生（2026-10-11 加，`web/src/start-direction.ts`）。
 *
 * 用户的要求：「主要从**次级学科**、**已有的目标**入手，结合学习者的兴趣
 * 引导式地为学习者清晰展示学习方向。」
 *
 * 这一套把那条派生单独钉住。要成立的性质有五条，缺一条界面上那句「清晰展示学习方向」
 * 就没有依据：
 *
 * 1. **每个数字都能回溯**：卡片上的待学数、学科分布、入口，必须与同一次
 *    `deriveDirection` 的输出逐字相等——不另算一套；
 * 2. **不重不漏**：学科分布之和 + 背景接口数 == 待学节点数；
 * 3. **背景接口与内容分开**（本文件最重要的一条）：背景接口的 `discipline` 是「集合论」，
 *    混进内容分布会让每张卡都写着「集合论」——一个恰好在**每条**方向里都出现的词
 *    会让「学科分布」这件事整个失去信息量；
 * 4. **兴趣真的参与排序**，但**只改顺序**：换一组兴趣，顺序变；任何兴趣下六条都在；
 * 5. **诚实**：成环时列表非空且如实计数，不给伪造的次序；目标 id 漂了就不给卡。
 */

const {
  GOAL_INTENTS, buildGoalCard, buildGoalCards, disciplineTotals, interestMatch,
  presentDisciplines, presentPresets, previewOf, rankGoalCards, summarizeDirection,
} = await import(pathToFileURL(resolve(MCS_WEB_ROOT, 'web/src/start-direction.ts')).href);
const { deriveDirection } = await import(pathToFileURL(resolve(MCS_WEB_ROOT, 'web/src/direction.ts')).href);

const ontology = await loadOntology();

/** 本体投影成前端图接口的形状（与 `GET /ontology/graph` 下发的字段一致）。 */
const graphNodes = ontology.raw.nodes.map((node) => ({
  id: node.id, title: node.title, granularity: node.granularity ?? 'unit',
  case: node.case, construct: node.construct, discipline: node.discipline, summary: node.summary ?? '',
}));
const graphActions = ontology.raw.actions.map((action) => ({
  id: action.id, title: action.title, mode: action.mode, inputs: action.inputs, outputs: action.outputs,
}));
const graphRelations = ontology.raw.relationDescriptions.map((relation) => ({
  id: relation.id, kind: relation.kind, from: relation.from, to: relation.to, witness: relation.witness,
}));

const graph = { nodes: graphNodes, actions: graphActions, relations: graphRelations };
/** 与 `tests/direction.test.mjs` 同一份底稿：「高一」模板声明的那两条背景。 */
const known = (ids) => ({ known: ids.map((node) => ({ node })) });
const HIGH_SCHOOL = known(['bg:logic:equality', 'bg:real:metric']);
const presets = directionPresets('zh');
const pending = new Set();

/* ───────────────────────── 目标清单与本体一致 ───────────────────────── */

test('① 方向入口全部落在本体里，且都是单元级节点', () => {
  const byId = new Map(graphNodes.map((node) => [node.id, node]));
  assert.ok(DIRECTION_PRESETS.length >= 2, '方向入口至少要两条，否则「比较」无从谈起');
  for (const preset of DIRECTION_PRESETS) {
    const node = byId.get(preset.id);
    assert.ok(node, `方向入口 ${preset.id} 不在本体里（清单与本体漂了）`);
    assert.equal(node.granularity, 'unit', `方向入口 ${preset.id} 是话题级条目，不能当方向落点`);
    pending.add(preset.id);
  }
  // 中英成对：英文站上这些按钮不许回落中文（与 `direction-presets.ts` 的文件头同源）。
  for (const preset of DIRECTION_PRESETS) {
    assert.ok(preset.title.trim() && preset.titleEn.trim(), `${preset.id} 缺少成对标题`);
    assert.notEqual(preset.title, preset.titleEn, `${preset.id} 的英文标题与中文相同，可能忘了译`);
  }
  assert.deepEqual(directionPresets('en').map((item) => item.id), DIRECTION_PRESETS.map((item) => item.id));
});

test('② 本体里不存在的目标 id 会被过滤掉，不生成空卡', () => {
  const ghosts = [...presets, { id: 'ghost:not-in-ontology', title: '幽灵' }];
  assert.deepEqual(presentPresets(ghosts, graph).map((item) => item.id), presets.map((item) => item.id));
  assert.equal(buildGoalCard('ghost:not-in-ontology', graph, { theta: HIGH_SCHOOL }), null);
  // 没有图时不给任何卡（而不是抛错）：页面在接口还没回来时要能渲染。
  assert.deepEqual(buildGoalCards(null, presets), []);
  assert.equal(buildGoalCard('limit:bridge', null), null);
});

/* ───────────────────────── 卡上的数字与派生一致 ───────────────────────── */

test('③ 每张卡的数字都等于同一次 deriveDirection 的输出', () => {
  const cards = buildGoalCards(graph, presets, { theta: HIGH_SCHOOL });
  assert.equal(cards.length, presets.length, '六条方向都应出卡');
  for (const card of cards) {
    const report = deriveDirection({
      nodes: graphNodes, actions: graphActions, relations: graphRelations,
      theta: HIGH_SCHOOL, directions: [card.node], steps: 0,
    });
    assert.deepEqual(card.skeleton.all, report.core.nodes, `${card.node}：核心不一致`);
    assert.deepEqual(card.skeleton.pending, report.core.pending, `${card.node}：待学不一致`);
    assert.deepEqual(card.skeleton.unresolved, report.core.unresolved, `${card.node}：成环清单不一致`);
    assert.equal(card.skeleton.truncated, report.core.truncated);
    // 入口 = 核心 ∩ 可用集，顺序沿用选项表（不是自己再排一遍）。
    const inCore = report.options.filter((option) => option.inCore).map((option) => option.node);
    assert.deepEqual(card.skeleton.frontier, inCore, `${card.node}：入口集合不一致`);
    assert.deepEqual(card.skeleton.blockedNow, report.core.pending.filter((id) => !inCore.includes(id)));
    // 摘要里的每个数字都能在骨架上点到。
    const summary = summarizeDirection(card);
    assert.equal(summary.pending, card.skeleton.pending.length);
    assert.equal(summary.nowStartable, card.skeleton.frontier.length);
    assert.equal(summary.disciplines, card.skeleton.disciplines.length);
    assert.equal(summary.unresolved, card.skeleton.unresolved.length);
    assert.equal(summary.interfaces, card.skeleton.interfaces.length);
    assert.equal(summary.confirmed, card.skeleton.confirmed.length);
  }
});

test('④ 不重不漏：学科分布之和 + 背景接口数 == 待学节点数', () => {
  for (const card of buildGoalCards(graph, presets, { theta: HIGH_SCHOOL })) {
    const inSlices = card.skeleton.disciplines.reduce((sum, slice) => sum + slice.count, 0);
    const reached = card.skeleton.disciplines.reduce((sum, slice) => sum + slice.reached, 0);
    assert.equal(
      inSlices + card.skeleton.interfaces.length, card.skeleton.pending.length,
      `${card.node}：${inSlices} + ${card.skeleton.interfaces.length} ≠ ${card.skeleton.pending.length}`,
    );
    // 「现在能开始」也要守恒：切片里的 reached 之和 == 入门入口数（入口都在内容里，接口本来就不能开始）。
    assert.ok(reached <= card.skeleton.frontier.length, `${card.node}：reached 之和超过了入口数`);
    for (const slice of card.skeleton.disciplines) {
      assert.equal(slice.reached + slice.locked, slice.count, `${card.node}/${slice.id}：reached+locked≠count`);
      assert.ok(slice.count > 0, `${card.node}/${slice.id}：出现了 0 条的切片（应被过滤）`);
    }
  }
});

test('⑤ 背景接口与内容学科**分开**：接口不混进学科分布', () => {
  /*
   * 这条是本文件最重要的一条：每条方向的未决核心都含 `bg:set:function`，
   * 而它的 `discipline` 恰好登记为「集合论」。若混进内容分布，
   * 六张卡会全部写着「集合论」——一个到处都出现的词等于没有信息。
   */
  const byId = new Map(graphNodes.map((node) => [node.id, node]));
  const interfaceIds = new Set(
    graphNodes
      .filter((node) => !graphActions.some((action) => action.outputs.some((output) => output.node === node.id)))
      .map((node) => node.id),
  );
  assert.ok(interfaceIds.has('bg:set:function'), '判据失效：bg:set:function 应当是没有产出行动的背景接口');

  let sawSetTheoryInterface = false;
  for (const card of buildGoalCards(graph, presets, { theta: HIGH_SCHOOL })) {
    for (const id of card.skeleton.interfaces) {
      assert.ok(interfaceIds.has(id), `${card.node}：接口清单里出现了有产出行动的节点 ${id}`);
    }
    // 接口的学科不许出现在内容分布里（除非那一支另有真的内容节点）。
    const contentIds = new Set(
      card.skeleton.pending.filter((id) => !card.skeleton.interfaces.includes(id)),
    );
    for (const slice of card.skeleton.disciplines) {
      const realContent = [...contentIds].some((id) => byId.get(id)?.discipline === slice.id);
      assert.ok(realContent, `${card.node}：学科切片 ${slice.id} 只由背景接口凑出来`);
    }
    if (card.skeleton.interfaces.includes('bg:set:function')) sawSetTheoryInterface = true;
  }
  assert.ok(sawSetTheoryInterface, '实测每条方向的待学核心都含 bg:set:function；判据若不再成立要复核本测试');
});

/* ───────────────────────── 兴趣：只改顺序 ───────────────────────── */

test('⑥ 兴趣匹配只做计数：目标自身学科 +2，待学节点逐个 +1', () => {
  const cards = buildGoalCards(graph, presets, { theta: HIGH_SCHOOL });
  for (const card of cards) {
    assert.equal(interestMatch(card, []), 0, '没选兴趣时匹配分必须是 0（等于不动排序）');
    const ownOnly = interestMatch(card, [card.discipline]);
    const ownSlice = card.skeleton.disciplines.find((slice) => slice.id === card.discipline);
    assert.equal(ownOnly, 2 + (ownSlice?.count ?? 0), `${card.node}：自身学科计分不等于 2 + 该支待学数`);
    // 选一个这条方向里根本没有的学科：得 0，而不是「负数」或「略降」。
    const absent = presentDisciplines(graph).find(
      (id) => id !== card.discipline && !card.skeleton.disciplines.some((slice) => slice.id === id),
    );
    if (absent) assert.equal(interestMatch(card, [absent]), 0, `${card.node}：无关学科不该得分`);
  }
});

test('⑦ 换兴趣会真的换顺序，但**一条都不少**', () => {
  const base = buildGoalCards(graph, presets, { theta: HIGH_SCHOOL });
  const byGroup = buildGoalCards(graph, presets, { theta: HIGH_SCHOOL, interests: ['群论'] });
  const byGeometry = buildGoalCards(graph, presets, { theta: HIGH_SCHOOL, interests: ['微分几何'] });

  // 集合不变：三条序列互为同一批 id 的排列。
  const ids = (list) => list.map((card) => card.node);
  const sorted = (list) => [...list].sort();
  assert.deepEqual(sorted(ids(byGroup)), sorted(ids(base)), '兴趣把某些方向藏起来了');
  assert.deepEqual(sorted(ids(byGeometry)), sorted(ids(base)), '兴趣把某些方向藏起来了');

  // 顺序真的变了：选「群论」时群这条方向必须排到最前。
  assert.equal(ids(byGroup)[0], 'group:cayley', `选群论时排第一的是 ${ids(byGroup)[0]}`);
  assert.notDeepEqual(ids(byGroup), ids(base), '选群论之后顺序没变——兴趣没参与排序');
  assert.equal(ids(byGeometry)[0], 'dg:generalized-stokes-theorem', `选微分几何时排第一的是 ${ids(byGeometry)[0]}`);

  // 默认顺序是**确定的**：同样输入两次逐字相同。
  assert.deepEqual(ids(buildGoalCards(graph, presets, { theta: HIGH_SCHOOL })), ids(base));
});

test('⑧ 排序三条判据可观察：兴趣 > 待学数 > 候选清单顺序', () => {
  // 用最小夹具逐条验，不靠真实数据「看起来对」。
  const card = (node, match, count) => ({
    node, title: node, discipline: 'D', intent: 'route', next: null, frontierOptions: [],
    preview: [], previewTruncated: false, match,
    skeleton: {
      all: [], confirmed: [], pending: new Array(count).fill('x'), levels: [], unresolved: [],
      truncated: false, limited: false, disciplines: [], interfaces: [], frontier: [], blockedNow: [],
    },
  });
  const order = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
  // 兴趣优先：match 大者在前，哪怕待学数更少。
  assert.deepEqual(
    rankGoalCards([card('a', 0, 99), card('b', 5, 1)], order).map((item) => item.node), ['b', 'a'],
    '兴趣匹配没有压过待学节点数',
  );
  // 次判据：match 相同时待学多者在前。
  assert.deepEqual(
    rankGoalCards([card('a', 3, 1), card('b', 3, 9)], order).map((item) => item.node), ['b', 'a'],
  );
  // 末判据：前两条并列时按候选清单顺序，保证确定性。
  assert.deepEqual(
    rankGoalCards([card('c', 0, 2), card('a', 0, 2), card('b', 0, 2)], order).map((item) => item.node), ['a', 'b', 'c'],
  );
});

/* ───────────────────────── 诚实：成环与入口 ───────────────────────── */

test('⑨ 成环如实报告，不伪造一条通顺的次序', () => {
  const cards = buildGoalCards(graph, presets, { theta: HIGH_SCHOOL });
  const dg = cards.find((card) => card.node === 'dg:generalized-stokes-theorem');
  assert.ok(dg.skeleton.unresolved.length > 0, '微分几何方向实测有拆不开的核心节点；判据变了要复核');
  assert.equal(dg.skeleton.truncated, true, '有拆不开的节点时 truncated 必须为真');
  // 成环节点不许出现在层次表里（层号是「能排出来的先后」，不是猜测）。
  const inLevels = new Set(dg.skeleton.levels.flatMap((level) => level.nodes));
  for (const id of dg.skeleton.unresolved) {
    assert.ok(!inLevels.has(id), `${id} 既在成环清单里又拿到了层号`);
  }
  // 层次表的层号从 1 起、连续、节点不重复。
  const seen = new Set();
  dg.skeleton.levels.forEach((level, index) => {
    assert.equal(level.level, index + 1, '层号必须从 1 起且连续');
    for (const id of level.nodes) {
      assert.ok(!seen.has(id), `${id} 在两个层里各出现一次`);
      seen.add(id);
    }
  });
});

test('⑩ 入口是一句可核对的依据，而不是一句评价', () => {
  /*
   * 措辞纪律的**免责声明**要先排除再查。
   *
   * `optionBasis()` 生成的句子末尾自带一句声明：「这句说的是『现在能用它做出什么』，
   * 不是『它更重要』」——它出现的**目的**正是提醒读者这一栏不是评价。用正则查整串，
   * 就会把声明里的「更重要」当成违规（实测：`dg:generalized-stokes-theorem` 因此挂了）。
   * 这与 `data/design-values.mjs` 那条「检查取值不该依赖注释长度」是同一类缺陷：
   * **检查的对象要是内容，不是内容旁边的说明**。
   */
  const stripDisclaimer = (text) => text.replace(/。这句说的是[^。]*。/g, '。');
  for (const card of buildGoalCards(graph, presets, { theta: HIGH_SCHOOL })) {
    if (!card.next) continue;
    assert.ok(card.next.basis.trim().length > 0, `${card.node}：入口没有依据`);
    // 与 `direction.ts` 同一条措辞纪律：不许出现掌握 / 更重要 / 最优（声明句除外）。
    const body = stripDisclaimer(card.next.basis);
    assert.equal(/掌握|更重要|最优/.test(body), false, `${card.node}：依据里出现了不该有的评价词（${body}）`);
    // 入口若是核心内节点，它必须真的在入口清单里。
    if (card.skeleton.frontier.includes(card.next.node)) {
      assert.ok(card.frontierOptions.some((item) => item.node === card.next.node));
    }
  }
});

test('⑪ 换档案（θ）之后「要学几个」跟着变——这是自己的数，不是空档案的数', () => {
  const blank = buildGoalCard('limit:bridge', graph, { theta: known([]), steps: 0 });
  const high = buildGoalCard('limit:bridge', graph, { theta: HIGH_SCHOOL, steps: 0 });
  assert.ok(blank.skeleton.pending.length > high.skeleton.pending.length,
    '声明两条背景之后待学节点应变少');

  /*
   * 不变量：**待学集合的差 == 确认集合的差**（方向核心里少掉的每一个节点，都恰好出现在
   * 新确认的那一批里）。
   *
   * 两处细节（都是实测校正过的，别再改回去）：
   * 1. **方向**：确认数随 θ 声明**增加**，所以是 `high.confirmed - blank.confirmed`。
   *    原式写的是 `blank - high`（−1），而实际差是 +1 —— 断言因此稳定失败。
   *    这个不变量的语义是「多确认了一个，待学里就少一个」，符号写反就不是它了。
   * 2. **数量可以小于声明的条数**：`HIGH_SCHOOL` 声明两条背景，但只有真正落在
   *    `limit:bridge` 方向核心里的那条才会进 `confirmed`（`bg:logic:equality` 不在核心里，
   *    因此不产生增量）。所以这里比的是**两个集合的差**，不是「声明了几条」。
   */
  assert.equal(
    blank.skeleton.pending.filter((id) => !high.skeleton.pending.includes(id)).length,
    high.skeleton.confirmed.length - blank.skeleton.confirmed.length,
    '两张卡的确认数之差必须等于待学集合的差',
  );
});

test('⑫ 预览是逐步重算出来的，且步数上限是上限不是长度', () => {
  const card = previewOf('limit:bridge', graph, { theta: HIGH_SCHOOL });
  assert.ok(card.preview.length > 0 && card.preview.length <= 5, `预览步数 ${card.preview.length} 不在 1..5`);
  assert.equal(card.previewTruncated, true, '5 步上限用满时应当如实说「只是预览上限」');
  // 预览里出现的节点都必须能在本体里解析（不念一个查不到的 id）。
  const ids = new Set(graphNodes.map((node) => node.id));
  for (const step of card.preview) {
    assert.ok(ids.has(step.node), `预览里有解析不到的节点 ${step.node}`);
    assert.ok(step.title.trim().length > 0, `预览步骤 ${step.node} 没有标题`);
  }
  // 列表用的卡不带预览（steps: 0）——那是唯一昂贵的部分。
  for (const listed of buildGoalCards(graph, presets, { theta: HIGH_SCHOOL })) {
    assert.deepEqual(listed.preview, [], '列表里的卡不该付预览的代价');
  }
});

test('⑬ 次级学科清单与本体一致，且没有 0 个节点的选项', () => {
  const ids = presentDisciplines(graph);
  const tally = new Map();
  for (const node of graphNodes) tally.set(node.discipline, (tally.get(node.discipline) ?? 0) + 1);
  assert.deepEqual([...ids].sort(), [...tally.keys()].sort(), '次级学科清单与本体里的取值不一致');
  for (const item of disciplineTotals(graph, 'unit')) {
    assert.ok(item.count > 0, `${item.id} 的计数为 0，不该成为选项`);
  }
  // 只算单元：话题级条目不算「可独立认知的对象」（与列表页同一口径）。
  const units = graphNodes.filter((node) => node.granularity === 'unit').length;
  const topics = graphNodes.length - units;
  assert.ok(topics > 0, '本体里应当有话题级条目，否则这条断言测不到东西');
  const unitSum = disciplineTotals(graph, 'unit').reduce((sum, item) => sum + item.count, 0);
  const allSum = disciplineTotals(graph, 'all').reduce((sum, item) => sum + item.count, 0);
  assert.equal(unitSum, units);
  assert.equal(allSum, graphNodes.length);
});

test('⑭ 方向性质：只有「补具体缺口」那条不是按顺序推进', () => {
  assert.equal(GOAL_INTENTS['limit:bridge'], 'gap');
  for (const preset of presets) {
    const card = buildGoalCard(preset.id, graph, { theta: HIGH_SCHOOL, steps: 0 });
    assert.ok(['gap', 'route', 'overview', 'concept'].includes(card.intent), `${preset.id} 的方向性质不合法`);
    assert.equal(card.intent, GOAL_INTENTS[preset.id] ?? 'route');
  }
});
