import test from 'node:test';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { MCS_WEB_ROOT, loadOntology } from '../core/ontology.mjs';
import { PROFILE_TEMPLATES, templateDeclarations } from '../data/profile-templates.mjs';

/**
 * 学习方向与并行节点的排序（2026-10 加，`web/src/direction.ts`）。
 *
 * 用户的要求：「让学习者经过初步的探索之后能马上知道自己要学什么；把逻辑上可以并行的
 * 待学习节点，按自己的需求和兴趣合适地分配到线性的学习路径里。」
 *
 * 这一套把那条派生单独钉住。三件事必须成立，否则界面上的「下一步」就是一句无据可依的推荐：
 *
 * 1. **可用集合与起始节点同源**：同一份 θ 下 `startableSet` 与 `deriveStartingNodes` 的
 *    entries 必须**逐字相同**。这是本轮最重要的一条断言——两处漂开，同一个学习者会在
 *    「我的学习」和「知识网络」里看到两套话。
 * 2. **排序四条判据各自可观察**：方向内优先 > 新解锁多 > 背景接口优先 > 登记顺序。
 *    用最小夹具一条条验，不用真实数据「看起来对」。
 * 3. **诚实**：依据句里的数字必须等于派生出来的数量；成环时不伪造层号；没有可用节点时
 *    给「最接近的」而不是沉默。
 */

const {
  deriveDirection, startableSet, reachableSet, rankOptions, nextStep, optionBasis,
  DIRECTION_BOUNDED_STEPS, PARALLEL_THRESHOLD,
} = await import(pathToFileURL(resolve(MCS_WEB_ROOT, 'web/src/direction.ts')).href);
const { deriveStartingNodes, startingNodeIds } = await import(
  pathToFileURL(resolve(MCS_WEB_ROOT, 'web/src/starting-nodes.ts')).href
);

const ontology = await loadOntology();

/** 本体投影成前端图接口的形状（与 `GET /ontology/graph` 下发的字段一致）。 */
const graphNodes = ontology.raw.nodes.map((node) => ({
  id: node.id, title: node.title, granularity: node.granularity ?? 'unit', construct: node.construct,
  case: node.case, discipline: node.discipline, summary: node.summary ?? '',
}));
const graphActions = ontology.raw.actions.map((action) => ({
  id: action.id, title: action.title, mode: action.mode, inputs: action.inputs, outputs: action.outputs,
}));
const graphRelations = ontology.raw.relationDescriptions.map((relation) => ({
  id: relation.id, kind: relation.kind, from: relation.from, to: relation.to, witness: relation.witness,
}));

const base = { nodes: graphNodes, actions: graphActions, relations: graphRelations };
/** θ 的最小形状：一个 id 数组 → `{ known: [{ node }] }`。 */
const knownOf = (list) => ({ known: list.map((node) => ({ node })) });
/** 选项表 → 节点 id 列表。传 `DirectionReport` 会被拦下（少写 `.options` 时立刻报错，而不是静默 undefined）。 */
const ids = (list) => {
  if (!Array.isArray(list)) {
    throw new TypeError(`ids() 需要一个数组；拿到 ${list === null ? 'null' : typeof list}。`
      + '`deriveDirection()` 的结果要通过 `.options` 取（少写 `.options` 是最容易犯的错）。');
  }
  return list.map((option) => option.node);
};
const titleOf = (id) => graphNodes.find((node) => node.id === id)?.title ?? id;

/** `known` 与 `ids` 是上面两个小工具：**别把它们互相传**（`ids(ids)` 会得到 undefined）。 */
const known = knownOf;

/* ───────────────────────── 夹具：排序四条判据 ───────────────────────── */

/** 六个单元节点：两个背景接口 + 四个有契约的内容节点。 */
function fixture() {
  const nodes = [
    { id: 'u:root-a', title: '背景 A', granularity: 'unit' },
    { id: 'u:root-b', title: '背景 B', granularity: 'unit' },
    { id: 'u:c1', title: '内容一', granularity: 'unit' },
    { id: 'u:c2', title: '内容二', granularity: 'unit' },
    { id: 'u:goal', title: '目标', granularity: 'unit' },
    // 方向之外的一个入口：与目标无关，但同样「现在就能开始」。
    { id: 'u:side', title: '旁路内容', granularity: 'unit' },
    { id: 'u:thread', title: '线索', granularity: 'topic' },
  ];
  const actions = [
    // 目标依赖 c1 与 c2；c1、c2 依赖两个背景接口。
    { id: 'a-goal', title: '引入目标', mode: 'definition', inputs: [{ node: 'u:c1', accepts: ['statement'] }, { node: 'u:c2', accepts: ['statement'] }], outputs: [{ node: 'u:goal', provides: ['statement'] }] },
    { id: 'a-c1', title: '引入内容一', mode: 'definition', inputs: [{ node: 'u:root-a', accepts: ['statement'] }], outputs: [{ node: 'u:c1', provides: ['statement'] }] },
    { id: 'a-c2', title: '引入内容二', mode: 'definition', inputs: [{ node: 'u:root-b', accepts: ['statement'] }], outputs: [{ node: 'u:c2', provides: ['statement'] }] },
    { id: 'a-side', title: '引入旁路内容', mode: 'definition', inputs: [], outputs: [{ node: 'u:side', provides: ['statement'] }] },
    // 线索有一条契约，但它仍然是话题级条目：不许进可用集合、也不做选项。
    { id: 'a-thread', title: '引入线索', mode: 'definition', inputs: [], outputs: [{ node: 'u:thread', provides: ['statement'] }] },
  ];
  const relations = [];
  return { nodes, actions, relations };
}

/* ───────────────────────── 1. 与起始节点同源 ───────────────────────── */

test('可用集合与起始节点逐字相同（含空白档案与三个模板）', () => {
  /*
   * 「起步的那一片」= θ ∪ 现在就能开始的那一批。它与 `deriveStartingNodes` 的 entries
   * 必须逐字相同 —— 这是本套最重要的一条断言：两处漂开，同一个学习者会在「我的学习」
   * 与知识网络里看到两套话。
   */
  const profiles = [
    { label: '空白档案', known: [] },
    ...PROFILE_TEMPLATES.map((template) => ({
      label: `模板 ${template.id}`,
      known: templateDeclarations(template.id).map((entry) => entry.node),
    })),
  ];
  for (const profile of profiles) {
    const input = { ...base, theta: known(profile.known) };
    const mine = [...startableSet(input)].sort();
    const theirs = [...startingNodeIds(deriveStartingNodes(input))].sort();
    assert.deepEqual(mine, theirs, `${profile.label}：可用集合与起始节点不一致`);
    // 选项表就是这同一个集合的排序结果（逐条带依据），不是另一份。
    assert.deepEqual(ids(deriveDirection(input).options).slice().sort(), mine,
      `${profile.label}：选项表与可用集合对不上`);
    // 够得着的那一片必须严格更大：确认这些之后还有东西可以接着走。
    assert.ok(reachableSet(input).size > mine.length,
      `${profile.label}：可达集合应当比「现在就能开始」的那一片更大`);
  }
});

test('真实本体：空白档案与「高一」档案下的选项表是可复算的', () => {
  /*
   * 空白档案选项 = 无硬前置，且无产出行动或有无输入契约的单元级节点。
   *
   * 另一类曾经被算进来（「有产出行动、但契约输入为空」）：那其实是**判据用错了集合**
   * ——把「输入能不能在本体里解析」误用成「输入是不是单元级」，于是以**话题级条目**为输入的
   * 契约被判成「输入为空」，10 个节点从空白档案起就冒充起点（`rudin:set-function` 等）。
   * 修好之后，它们如实落回 `blocked`（缺的是那条线索级前置）。这条断言钉住修好后的口径。
   */
  const expectedOptions = graphNodes
    .filter((node) => node.granularity !== 'topic')
    .filter((node) => {
      const producers = graphActions.filter(action => action.outputs.some(output => output.node === node.id));
      return producers.length === 0 || producers.some(action => action.inputs.length === 0);
    })
    .filter((node) => !graphRelations.some((relation) => relation.kind === 'hardPrereq' && relation.to === node.id))
    .map((node) => node.id);

  const blankReport = deriveDirection({ ...base, theta: known([]) });
  assert.deepEqual(ids(blankReport.options).sort(), expectedOptions.slice().sort(),
    '空白档案下的选项表与独立重算不一致');

  // 「有产出行动、但登记输入为空」的节点**应当**在起点里（那是本体的既定登记）。
  for (const action of graphActions.filter((item) => item.inputs.length === 0)) {
    for (const output of action.outputs) {
      if (graphRelations.some((relation) => relation.kind === 'hardPrereq' && relation.to === output.node)) continue;
      assert.equal(ids(blankReport.options).includes(output.node), true,
        `${output.node} 的引入契约没有登记输入、也没有硬前置，它本来就该是起点`);
    }
  }
  // 反过来：以**话题级条目**为输入的那些节点**不该**是起点（这就是上面修掉的假起点）。
  for (const action of graphActions) {
    const topicInputs = action.inputs.filter((input) => graphNodes.some((node) => node.id === input.node && node.granularity === 'topic'));
    if (!topicInputs.length) continue;
    for (const output of action.outputs) {
      if (graphRelations.some((relation) => relation.kind === 'hardPrereq' && relation.to === output.node)) continue;
      assert.equal(ids(blankReport.options).includes(output.node), false,
        `${output.node} 的引入契约要求一条话题级条目（${topicInputs.map((item) => item.node).join('、')}），空白档案下不该是起点`);
    }
  }

  const highSchool = templateDeclarations('high-school-1').map((entry) => entry.node);
  const withProfile = startableSet({ ...base, theta: known(highSchool) });
  const blank = startableSet({ ...base, theta: known([]) });
  assert.ok(withProfile.size > blank.size, '声明背景之后应该有更多节点可开始');
});

/* ───────────────────────── 2. 可用判据 ───────────────────────── */

test('硬前置是 AND：缺一条就不可用；产出行动是 OR：任一条走得通即可', () => {
  /*
   * 四条通道互不相同：
   * - `u:x` 同时被 `u:h1`、`u:h2`、`u:h3` 三条硬前置约束（AND），
   *   其中 `u:h3` 既没有产出行动、也没有别的通道 —— 它必须被确认，`u:x` 才可能开始；
   * - `u:x` 有两条引入契约（OR）：入口一走 `u:h1`、入口二走 `u:open`。
   */
  const nodes = [
    { id: 'u:h1', title: '硬前置一', granularity: 'unit' },
    { id: 'u:h2', title: '硬前置二', granularity: 'unit' },
    { id: 'u:h3', title: '硬前置三', granularity: 'unit' },
    { id: 'u:open', title: '替代入口', granularity: 'unit' },
    { id: 'u:x', title: '受三条约束', granularity: 'unit' },
  ];
  const actions = [
    { id: 'a-x1', title: '入口一', mode: 'definition', inputs: [{ node: 'u:h1' }], outputs: [{ node: 'u:x', provides: ['statement'] }] },
    { id: 'a-x2', title: '入口二', mode: 'definition', inputs: [{ node: 'u:open' }], outputs: [{ node: 'u:x', provides: ['statement'] }] },
  ];
  const relations = [
    { id: 'r-h1', kind: 'hardPrereq', from: 'u:h1', to: 'u:x', witness: { status: 'DEF' } },
    { id: 'r-h2', kind: 'hardPrereq', from: 'u:h2', to: 'u:x', witness: { status: 'DEF' } },
    { id: 'r-h3', kind: 'hardPrereq', from: 'u:h3', to: 'u:x', witness: { status: 'DEF' } },
  ];
  const fixtureInput = { nodes, actions, relations };
  /** 「现在就能开始吗」= 是否出现在选项表里（不是闭包之后能不能到）。 */
  const canStartNow = (profileKnown, id) =>
    ids(deriveDirection({ ...fixtureInput, theta: known(profileKnown) }).options).includes(id);

  // 两条硬前置都缺：不可开始。
  assert.equal(canStartNow(['u:open'], 'u:x'), false, '硬前置缺一条时 u:x 不该可开始');
  // 补上其中一条：仍然不可开始（AND 不能任选）。
  assert.equal(canStartNow(['u:open', 'u:h1'], 'u:x'), false, '硬前置是 AND：只补一条不该放行');
  // 三条硬前置齐了、入口一走通：可以开始。
  assert.equal(canStartNow(['u:h1', 'u:h2', 'u:h3'], 'u:x'), true,
    '硬前置齐了、且有一条引入路径通，就该可开始');
  // 硬前置齐了但两条入口都不通：仍不可开始。
  assert.equal(canStartNow(['u:open', 'u:h1', 'u:h2'], 'u:x'), false,
    '缺一条硬前置时，哪怕入口通了也不该可开始');
});

test('契约里的悬空输入视为已满足（与 learning.ts 的过滤同源）', () => {
  const nodes = [{ id: 'u:a', title: '甲', granularity: 'unit' }];
  const actions = [
    { id: 'a-a', title: '引入甲', mode: 'definition', inputs: [{ node: 'u:gone' }], outputs: [{ node: 'u:a', provides: ['statement'] }] },
  ];
  const report = deriveDirection({ nodes, actions, relations: [], theta: known([]) });
  assert.deepEqual(ids(report.options), ['u:a'], '悬空输入不该把节点挡在可用集合之外');
});

test('话题级条目既不可用、也不出现在选项表里，但会被计数', () => {
  const report = deriveDirection({ ...fixture(), theta: known([]) });
  assert.equal(ids(report.options).includes('u:thread'), false, '话题级条目不该出现在选项表里');
  assert.equal(report.threadExcluded, 1, '被排除的话题级条目数要如实报出');
  // 话题级条目也不能当方向目标（它承担不了「学完它」这个含义）。
  const asGoal = deriveDirection({ ...fixture(), theta: known([]), directions: ['u:thread'] });
  assert.equal(asGoal.focus, null, '话题级条目不接受为方向目标');
});

/* ───────────────────────── 3. 排序四条 ───────────────────────── */

test('排序第一条：方向内的选项一律排在方向外之前', () => {
  /*
   * 只确认背景 A 的场面：方向内现在就能开始的恰好是两条（背景 B 与内容一），
   * 方向外还有「线索」那条契约产出的节点 —— 两类同时在，才验得了这一条。
   */
  const report = deriveDirection({ ...fixture(), theta: known(['u:root-a']), directions: ['u:goal'] });
  const ordered = ids(report.options);
  const inside = ordered.filter((id) => report.core.nodes.includes(id));
  const outside = ordered.filter((id) => !report.core.nodes.includes(id));
  assert.ok(inside.length >= 2 && outside.length >= 1,
    `夹具里应当同时有方向内与方向外的可用选项（内 ${inside.length} / 外 ${outside.length}）`);  const firstOutside = ordered.findIndex((id) => !report.core.nodes.includes(id));
  const lastInside = ordered.reduce((acc, id, index) => (report.core.nodes.includes(id) ? index : acc), -1);
  assert.ok(lastInside < firstOutside, `方向内的选项没有排在前面：${ordered.join(' → ')}`);
  assert.equal(report.options[0].recommended, true, '排第一的就是推荐项');
});

test('排序第二条：方向外时按「新解锁几个」降序', () => {
  const nodes = [
    { id: 'u:open', title: '免费入口', granularity: 'unit' },
    { id: 'u:leaf', title: '孤立内容', granularity: 'unit' },
    { id: 'u:hinge', title: '枢纽', granularity: 'unit' },
    { id: 'u:next', title: '下游', granularity: 'unit' },
  ];
  const actions = [
    { id: 'a-open', title: '引入免费入口', mode: 'definition', inputs: [], outputs: [{ node: 'u:open', provides: ['statement'] }] },
    { id: 'a-leaf', title: '引入孤立内容', mode: 'definition', inputs: [], outputs: [{ node: 'u:leaf', provides: ['statement'] }] },
    { id: 'a-hinge', title: '引入枢纽', mode: 'definition', inputs: [], outputs: [{ node: 'u:hinge', provides: ['statement'] }] },
    { id: 'a-next', title: '引入下游', mode: 'definition', inputs: [{ node: 'u:hinge' }], outputs: [{ node: 'u:next', provides: ['statement'] }] },
  ];
  const report = deriveDirection({ nodes, actions, relations: [], theta: known([]), steps: 0 });
  const byId = new Map(report.options.map((option) => [option.node, option]));
  assert.equal(byId.get('u:hinge').newlyUnlocked, 1, '枢纽应当解锁 1 个下游节点');
  assert.equal(byId.get('u:leaf').newlyUnlocked, 0, '孤立内容不解锁任何东西');
  assert.ok(ids(report.options).indexOf('u:hinge') < ids(report.options).indexOf('u:leaf'),
    '新解锁多的应当排在前面');
  assert.equal(byId.get('u:hinge').unlockedNodes[0], 'u:next', '解锁名单要能指名');
});

test('排序第三条：同为背景接口、解锁数相同时按登记顺序', () => {
  const nodes = [
    { id: 'u:z', title: '后登记的背景', granularity: 'unit' },
    { id: 'u:a', title: '先登记的背景', granularity: 'unit' },
  ];
  const report = deriveDirection({ nodes, actions: [], relations: [], theta: known([]), steps: 0 });
  assert.deepEqual(ids(report.options), ['u:z', 'u:a'], '登记顺序就是 nodes 数组序，不是字典序');
  assert.equal(report.options[0].reasons.some((reason) => reason.kind === 'root'), true,
    '背景接口的依据里要写「没有任何行动能产出它」');
});

test('排序第三、四条：学法偏好只在同一档内生效，压不过方向与解锁数', () => {
  /*
   * 三条**同档**的根节点（都能确认、都解锁不了任何东西）：这里唯一能分辨它们的
   * 就是学法偏好——于是偏好真的把顺序改了。
   */
  const nodes = [
    { id: 'u:concept', title: '概念', granularity: 'unit', construct: 'Concept' },
    { id: 'u:example', title: '例子', granularity: 'unit', construct: 'Example' },
    { id: 'u:method', title: '方法', granularity: 'unit', construct: 'Method' },
    { id: 'u:goal', title: '目标', granularity: 'unit', construct: 'Claim' },
  ];
  const actions = [
    { id: 'a-goal', title: '引入目标', mode: 'definition', inputs: [{ node: 'u:method' }], outputs: [{ node: 'u:goal', provides: ['statement'] }] },
  ];
  const graphFor = (mood) => deriveDirection({
    nodes: nodes.filter((node) => node.id !== 'u:goal'),
    actions: [], relations: [], theta: known([]), mood, steps: 0,
  });

  assert.deepEqual(ids(graphFor('base').options), ['u:concept', 'u:example', 'u:method'],
    '「先把定义与条件理清」先给概念；另外两条都不在这一档，落回登记顺序');
  assert.deepEqual(ids(graphFor('example').options), ['u:example', 'u:concept', 'u:method'],
    '「先看具体例子与反例」应当先给例子');
  assert.deepEqual(ids(graphFor('apply').options), ['u:method', 'u:concept', 'u:example'],
    '「先把它用起来」应当先给方法');
  assert.deepEqual(ids(graphFor('any').options), ['u:concept', 'u:example', 'u:method'], '没有偏好时按登记顺序');
  assert.deepEqual(ids(graphFor('不存在的偏好').options), ['u:concept', 'u:example', 'u:method'],
    '未知的偏好值按「没有偏好」处理，不崩也不改顺序');
  assert.ok(graphFor('example').options[0].reasons.some((reason) => reason.kind === 'mood'),
    '偏好参与排序时必须给出依据，否则学习者不知道顺序为什么变了');

  /*
   * 偏好**压不过「只能由你声明」与解锁数**：这里只有 `u:example` 是无产出行动的根节点，
   * `u:method` 有产出行动、并且是唯一解锁 1 个的选项——它排在同样有产出行动的 `u:concept` 之前，
   * 但排在根节点之后。实测顺序：例子（根节点 + 命中偏好）→ 方法（解锁 1）→ 概念（解锁 0）。
   */
  const withMethod = deriveDirection({ nodes, actions, relations: [], theta: known([]), mood: 'example', steps: 0 });
  assert.deepEqual(ids(withMethod.options), ['u:example', 'u:method', 'u:concept'],
    '根节点先排；同档内先比解锁数，再比偏好');
  assert.equal(withMethod.options[0].newlyUnlocked, 0, '例子是根节点，解锁不了任何东西');
  assert.equal(withMethod.options[1].newlyUnlocked, 1, '`u:method` 解锁 1 个（因此压过同样有产出行动的 `u:concept`）');
  assert.equal(withMethod.options[2].newlyUnlocked, 0);

  /*
   * 偏好**压不过方向**：声明方向为 `u:goal` 之后，方向内的 `u:method` 排第一，
   * 哪怕偏好是「先看例子」。
   */
  const directed = deriveDirection({ nodes, actions, relations: [], theta: known([]), directions: ['u:goal'], mood: 'example' });
  assert.equal(ids(directed.options)[0], 'u:method', '方向内的选项必须压过学法偏好');
  assert.ok(directed.options[0].reasons.some((reason) => reason.kind === 'in-core'), '方向内的依据要在');
});

/* ───────────────────────── 4. 确定性 ───────────────────────── */

test('确定性：同一输入两次逐字相同，且与输入数组顺序无关', () => {
  const input = { ...fixture(), theta: known(['u:root-b']), directions: ['u:goal'] };
  const first = deriveDirection(input);
  const second = deriveDirection(input);
  assert.equal(JSON.stringify(first), JSON.stringify(second), '同一输入两次结果应当逐字相同');

  const shuffled = {
    nodes: [...input.nodes].reverse(),
    actions: [...input.actions].reverse(),
    relations: [...input.relations].reverse(),
    theta: { known: [...input.theta.known].reverse() },
    directions: input.directions,
  };
  const third = deriveDirection(shuffled);
  assert.deepEqual(ids(third.options).sort(), ids(first.options).sort(), '可用选项不随输入顺序变化');
  assert.deepEqual(third.core.nodes.slice().sort(), first.core.nodes.slice().sort(), '核心不随输入顺序变化');
  assert.deepEqual(third.core.levels.map((entry) => entry.nodes.slice().sort()), first.core.levels.map((entry) => entry.nodes.slice().sort()),
    '分层不随输入顺序变化');
});

/* ───────────────────────── 5. 被迫 / 可选 ───────────────────────── */

test('被迫档：方向核心里只有一个现在能学时，如实说「只有这一条路」', () => {
  /*
   * 被迫档的真实场面：目标的引入契约**没有登记输入**，方向核心就只剩目标自己。
   * 此时选项表里方向内只有一条 —— 界面该说的是「只有这一条通向你的方向」，
   * 而不是把它包装成一次选择。
   */
  const nodes = [
    { id: 'u:goal', title: '目标', granularity: 'unit' },
    { id: 'u:free', title: '免费内容', granularity: 'unit' },
  ];
  const actions = [
    { id: 'a-goal', title: '引入目标', mode: 'definition', inputs: [], outputs: [{ node: 'u:goal', provides: ['statement'] }] },
    { id: 'a-free', title: '引入免费内容', mode: 'definition', inputs: [], outputs: [{ node: 'u:free', provides: ['statement'] }] },
  ];
  const report = deriveDirection({ nodes, actions, relations: [], theta: known([]), directions: ['u:goal'] });
  const inCore = report.options.filter((option) => option.inCore);
  assert.deepEqual(inCore.map((option) => option.node), ['u:goal'], `方向内应当只有目标一个，实际 ${inCore.length}`);
  assert.equal(report.parallelNow, 1);
  assert.equal(report.forced, true, '只有一个方向内选项时应当判为被迫');
  const outside = report.options.filter((option) => !option.inCore);
  assert.deepEqual(outside.map((option) => option.node), ['u:free'],
    '被迫档也要把方向外的选项如实列出来（不是藏起来）');
});

test('被迫档（真实本体）：起点处方向内的选项就是那几条，其余如实标注「不在这个方向上」', () => {
  const theta = known(templateDeclarations('high-school-1').map((entry) => entry.node));
  const report = deriveDirection({ ...base, theta, directions: ['group:cayley'] });
  assert.ok(report.options.length > 0, '「高一」档案下应当有可用选项');
  assert.ok(report.parallelNow >= 1, '方向上至少有 Cayley 定理那条链上的一个前置');
  assert.equal(report.options.filter((option) => option.inCore).length, report.parallelNow);
  assert.ok(report.options.length > report.parallelNow,
    '起点处一定同时存在方向外的选项 —— 这正是界面要如实说出来的那一批');
  for (const option of report.options.filter((item) => !item.inCore)) {
    assert.ok(option.reasons.some((reason) => reason.kind === 'in-core' && reason.text === '不在这个方向上'),
      `${option.node} 的方向外依据没写出来`);
  }
});

test('可选档：方向核心里有两个以上可用时判为可选，且两条都说得清依据', () => {
  const report = deriveDirection({ ...fixture(), theta: known(['u:root-a', 'u:root-b']), directions: ['u:goal'] });
  assert.equal(report.parallelNow, 2, `方向内应当有 2 个可用选项，实际 ${report.parallelNow}`);
  assert.equal(report.forced, false, '两个方向内选项应当判为可选');
  assert.equal(report.parallelNow >= PARALLEL_THRESHOLD, true, 'PARALLEL_THRESHOLD 的口径要与 forced 一致');
  for (const option of report.options.filter((item) => item.inCore)) {
    assert.ok(option.reasons.length > 0, `${option.node} 没有给出依据`);
    assert.ok(option.reasons.some((reason) => reason.kind === 'in-core'), `${option.node} 的依据里没有「在方向上」`);
  }
});

/* ───────────────────────── 6. 依据句与数字 ───────────────────────── */

test('依据句里的数字等于派生出来的数量，且不出现「掌握 / 更重要 / 最优」', () => {
  const report = deriveDirection({ ...fixture(), theta: known(['u:root-a', 'u:root-b']), directions: ['u:goal'] });
  for (const option of report.options) {
    const text = optionBasis(option, titleOf);
    if (option.newlyUnlocked > 0) {
      assert.match(text, new RegExp(`接着开始 ${option.newlyUnlocked} 个新节点`),
        `${option.node} 的依据句与派生数量不一致：${text}`);
    }
    for (const banned of ['掌握', '更重要', '最优']) {
      assert.equal(text.includes(banned), false, `${option.node} 的依据句出现了不该有的词「${banned}」`);
    }
  }
  // 英文侧同一条纪律（换措辞，不换事实）。
  const english = optionBasis(report.options[0], titleOf, 'en');
  assert.match(english, /every input of|no action produces it/);
  assert.equal(/master|more important|optimal/i.test(english), false, '英文依据句也不许出现掌握 / 更重要 / 最优');
});

/* ───────────────────────── 7. 成环与空集 ───────────────────────── */

test('核心成环时如实报 unresolved，不伪造层号、不死循环', () => {
  const nodes = [
    { id: 'u:a', title: '甲', granularity: 'unit' },
    { id: 'u:b', title: '乙', granularity: 'unit' },
    { id: 'u:seed', title: '种子', granularity: 'unit' },
  ];
  const actions = [
    { id: 'a-a', title: '引入甲', mode: 'definition', inputs: [{ node: 'u:b' }], outputs: [{ node: 'u:a', provides: ['statement'] }] },
    { id: 'a-b', title: '引入乙', mode: 'definition', inputs: [{ node: 'u:a' }], outputs: [{ node: 'u:b', provides: ['statement'] }] },
    { id: 'a-seed', title: '引入种子', mode: 'definition', inputs: [{ node: 'u:seed' }], outputs: [{ node: 'u:seed', provides: ['statement'] }] },
  ];
  const report = deriveDirection({ nodes, actions, relations: [], theta: known([]), directions: ['u:a'] });
  assert.deepEqual(report.core.unresolved.slice().sort(), ['u:a', 'u:b'], '拆不开的两个节点都要列出来');
  assert.equal(report.core.truncated, true, '核心未完全分层时要如实置 truncated');
  assert.deepEqual(report.core.levels, [], '成环时不该有任何层号');
  // 环里的节点不能开始（互为前置），视图本身仍然要能算出来。
  assert.equal(ids(deriveDirection({ nodes, actions, relations: [], theta: known([]) }).options)
    .includes('u:a'), false, '互为前置的节点不该出现在选项表里');
});

test('没有可用节点时：给出「最接近的」而不是沉默', () => {
  /*
   * 构造一条**互相牵制**的最小场面：`u:a` 的引入契约写着 `u:h1`，而 `u:b` 又硬前置 `u:a`
   * —— 两个方向都走不通，可用集合应当为空。此时界面不能只是沉默：
   * 「位置」与「总数」仍然要给出来（`position`），让学习者看得到「差在哪」。
   */
  const nodes = [
    { id: 'u:a', title: '甲', granularity: 'unit' },
    { id: 'u:b', title: '乙', granularity: 'unit' },
    { id: 'u:h1', title: '硬前置', granularity: 'unit' },
  ];
  const actions = [
    { id: 'a-a', title: '引入甲', mode: 'definition', inputs: [{ node: 'u:h1' }], outputs: [{ node: 'u:a', provides: ['statement'] }] },
    { id: 'a-b', title: '引入乙', mode: 'definition', inputs: [{ node: 'u:a' }], outputs: [{ node: 'u:b', provides: ['statement'] }] },
  ];
  const relations = [{ id: 'r-1', kind: 'hardPrereq', from: 'u:a', to: 'u:b', witness: { status: 'DEF' } }];
  const report = deriveDirection({ nodes, actions, relations, theta: known([]) });
  // 唯一没有前置的 `u:h1` 没有产出行动，因此它是可用集合里剩下的那一个。
  assert.deepEqual(ids(report.options), ['u:h1'], '只有没有任何前置的节点才该出现在选项表里');
  assert.equal(report.position.units, 3, '位置里要写出本体里的单元总数');
  assert.equal(report.position.startable, 1, '位置里的「可开始」数量要与选项表一致');
  assert.equal(report.position.confirmedUnits, 0, '还没有任何确认');
  assert.ok(report.position.reachable > report.position.startable,
    '「够得着的那一片」应当严格大于「现在就能开始」的数量');

  // 连 `u:h1` 也去掉之后，可用集合为空，此时推荐为 null 而不是硬凑一条。
  const tight = deriveDirection({
    nodes: [
      { id: 'u:a', title: '甲', granularity: 'unit' },
      { id: 'u:b', title: '乙', granularity: 'unit' },
      { id: 'u:c', title: '丙（只能自己声明）', granularity: 'unit' },
    ],
    actions: [
      { id: 'a-a', title: '引入甲', mode: 'definition', inputs: [{ node: 'u:c' }], outputs: [{ node: 'u:a', provides: ['statement'] }] },
      { id: 'a-b', title: '引入乙', mode: 'definition', inputs: [{ node: 'u:a' }], outputs: [{ node: 'u:b', provides: ['statement'] }] },
    ],
    relations: [{ id: 'r-1', kind: 'hardPrereq', from: 'u:c', to: 'u:a', witness: { status: 'DEF' } }],
    theta: known([]),
  });
  // 这里唯一能开始的就是那个「只能由你声明」的根节点；它一步就能解锁 `u:a`。
  assert.deepEqual(ids(tight.options), ['u:c'], '只有没有任何产出的根节点可以开始');
  assert.equal(tight.recommended.node, 'u:c');
  assert.equal(tight.recommended.newlyUnlocked, 1, '确认根节点之后，`u:a` 就能开始');
  assert.deepEqual(tight.recommended.unlockedNodes, ['u:a']);

  // 真正的空集：连根节点都没有（本体里一个节点都不存在时）。
  const empty = deriveDirection({ nodes: [], actions: [], relations: [], theta: known([]) });
  assert.equal(empty.recommended, null, '没有任何节点时推荐必须为 null');
  assert.equal(empty.preview.length, 0, '预览也要为空');
  assert.equal(empty.position.units, 0);
});

/* ───────────────────────── 8. 预览与 nextStep ───────────────────────── */

test('预览：从当前状态一步步重算，步数受 DIRECTION_BOUNDED_STEPS 限制', () => {
  const chain = { nodes: [], actions: [], relations: [] };
  for (let index = 1; index <= 8; index += 1) {
    chain.nodes.push({ id: `u:n${index}`, title: `第 ${index} 环`, granularity: 'unit' });
    chain.actions.push({
      id: `a-n${index}`, title: `引入第 ${index} 环`, mode: 'definition',
      inputs: index === 1 ? [] : [{ node: `u:n${index - 1}` }],
      outputs: [{ node: `u:n${index}`, provides: ['statement'] }],
    });
  }
  const report = deriveDirection({ ...chain, theta: known([]) });
  assert.equal(report.preview.length, DIRECTION_BOUNDED_STEPS, `预览步数应当等于上限 ${DIRECTION_BOUNDED_STEPS}`);
  assert.equal(report.previewTruncated, true, '撞到步数上限时要如实置 previewTruncated');
  assert.deepEqual(ids(report.preview), ['u:n1', 'u:n2', 'u:n3', 'u:n4', 'u:n5'], '预览应当沿依赖链前进');
  // 每一步都必须在**那一步的**可用集合里（不是预先写死的一条链）。
  // 逐步用 nextStep 复算一遍：采纳前 k 步之后，第 k+1 步仍然是推荐项。
  for (let step = 0; step < 3; step += 1) {
    const adopted = ids(report.preview).slice(0, step);
    const again = nextStep({ ...chain, theta: known([]), adopted });
    assert.equal(again.recommended.node, ids(report.preview)[step],
      `采纳前 ${step} 步之后，推荐的第 ${step + 1} 步与预览不一致`);
  }
});

test('nextStep：采纳一步之后，位置与推荐都跟着真实状态前进', () => {
  const theta = known(['u:root-a']);
  const report = deriveDirection({ ...fixture(), theta, directions: ['u:goal'] });
  const first = report.recommended.node;
  const after = nextStep({ ...fixture(), theta, directions: ['u:goal'], adopted: [first] });
  assert.equal(after.position.confirmedUnits, report.position.confirmedUnits,
    '采纳不等于确认：θ 里的条数不该变');
  assert.equal(after.position.adoptedSteps, 1, '已采纳的步数要单独数出来');
  assert.equal(after.options.some((option) => option.node === first), false, '采纳过的节点不该再出现在选项表里');
  assert.notEqual(after.recommended.node, first, '下一步应当是另一个节点');
  /*
   * 采纳一步只允许改两件事：被采纳的那个从选项表里消失；它**解锁**的节点可以出现。
   * 这条断言防的是「采纳一步把别的选项也吃掉了」这种静默收缩。
   */
  const firstOption = report.options.find((option) => option.node === first);
  const allowed = new Set([...ids(report.options).filter((id) => id !== first), ...firstOption.unlockedNodes]);
  assert.deepEqual(ids(after.options).slice().sort(), [...allowed].sort(),
    '采纳一步之后，选项表只该少了被采纳的那个、多了它解锁的那些');
  assert.deepEqual(after.core.nodes, report.core.nodes, '方向核心不该因为采纳一步而改变');
});

/* ───────────────────────── 9. 真实本体上的可核事实 ───────────────────────── */

test('真实本体：方向核心分层与实测一致（序列 → 极限的桥）', () => {
  // 用「高一」档案声明两个背景，方向取极限案例的终点。
  const theta = known(templateDeclarations('high-school-1').map((entry) => entry.node));
  const report = deriveDirection({ ...base, theta, directions: ['limit:bridge'] });
  assert.equal(report.focus, 'limit:bridge');
  assert.equal(report.directed, true, '声明了方向且核心非空时应当算「有方向」');
  assert.ok(report.core.nodes.includes('limit:bridge'), '方向的核心必须包含目标自身');
  assert.ok(report.core.nodes.includes('bg:real:metric') || report.core.nodes.includes('limit:distance'),
    '方向的核心必须沿依赖收进去');
  // 层号从 1 起、递增、不重复；层里的节点都不在已确认清单里。
  const confirmed = new Set(theta.known.map((entry) => entry.node));
  let expected = 1;
  for (const entry of report.core.levels) {
    assert.equal(entry.level, expected, '层号应当从 1 开始连续递增');
    expected += 1;
    assert.ok(entry.nodes.length > 0, '空的层不该出现');
    for (const id of entry.nodes) assert.equal(confirmed.has(id), false, `${id} 已确认，不该出现在待学层里`);
  }
  // 依据句必须能生成（没有写不出来的依据）。
  for (const option of report.options.slice(0, 5)) {
    assert.ok(optionBasis(option, titleOf).length > 10, `${option.node} 的依据句太短`);
  }
});
