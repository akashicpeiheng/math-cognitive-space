import test from 'node:test';
import assert from 'node:assert/strict';
import { testOntology } from './helpers.mjs';
import { makePlanner } from '../core/planner.mjs';
import { EXAMPLE_SETS, LIANG_BASE_ENTRIES, RUDIN_BASE_ENTRIES, JIANG_BASE_ENTRIES, AXLER_BASE_ENTRIES } from '../web/src/example-paths.ts';
import { groupByDiscipline } from '../web/src/example-paths-grouping.ts';
import { FIELD_IDS } from '../data/fields.mjs';

/**
 * 「范例路径」栏目不是文案：卡片上写的事件数、起点、目标都必须能当场跑出来。
 *
 * 这里对每一个范例按它自己声明的 horizon 真跑一遍规划器，核对：
 * 1. 目标节点与起点节点都在当前本体里解析得到；
 * 2. 状态是 Found 且搜索未被截断（否则卡片上的「实测事件数」就是空话）；
 * 3. 最短路线的事件数与卡片上写的一致；
 * 4. 路线的起止与声明一致：没有待决入口（entry 为空），且所有目标都由某个事件产出。
 *
 * Node 24 原生剥离类型，所以这里可以直接 import 那个 .ts 数据模块——
 * 与 `relation-visual.test.mjs` 的读源码求值不同，这条路不需要手工正则清洗。
 */

const paths = EXAMPLE_SETS.flatMap((set) => set.paths.map((path) => ({ set, path })));
/** 每套样本声明的起点集合与里程碑总数，逐套核对累进关系。 */
const EXPECTED = {
  'liang-volume-1': { base: LIANG_BASE_ENTRIES, milestones: 56 },
  'rudin-pma': { base: RUDIN_BASE_ENTRIES, milestones: 55 },
  // 《简明高等代数》：47 个里程碑 + 4 个方法节点，方法节点不作为路线终点。
  'jiang-jdga': { base: JIANG_BASE_ENTRIES, milestones: 47 },
  // 《Linear Algebra Done Right》：**一章一程**（九程），61 个里程碑 + 4 个方法节点。
  'axler-ladr': { base: AXLER_BASE_ENTRIES, milestones: 61 },
};

/** 样本 id → 登记它的案例名。第三套起不再是「不是 rudin 就是 liang」的二选一。 */
const SET_CASE = {
  'liang-volume-1': 'liang',
  'rudin-pma': 'rudin',
  'jiang-jdga': 'jiang',
  'axler-ladr': 'axler',
};

/**
 * 每套样本的**程数**。
 *
 * 这里特意不写死「七程」：一开始三套样本恰好都是七程，于是测试里写成
 * `['第一程', …, '第七程']`——Axler（九章一章一程）一进来就会红。
 * 程数是**数据**：改一程就要同时改这里，不让界面上的「展开这 N 程」悄悄漂掉。
 */
const STAGE_COUNTS = {
  'liang-volume-1': 7,
  'rudin-pma': 7,
  'jiang-jdga': 7,
  'axler-ladr': 9,
};

const ZH_ORDINALS = ['第一程', '第二程', '第三程', '第四程', '第五程', '第六程', '第七程', '第八程', '第九程', '第十程'];

test('范例路径：栏目里每一个样本的 id 与序数唯一', () => {
  assert.ok(EXAMPLE_SETS.length >= 4, '栏目里应当有四套样本（梁灿彬上册、Rudin、简明高等代数、Axler）');
  assert.ok(paths.length > 0, '栏目里至少要有一个样本');
  const ids = paths.map(({ path }) => path.id);
  assert.equal(new Set(ids).size, ids.length, '样本 id 必须唯一');
  for (const { path } of paths) {
    assert.ok(path.ordinal && path.title && path.chapters, `${path.id} 缺少序数、标题或章节`);
    assert.ok(path.feature.length >= 40, `${path.id} 的特色简介太短，不足以说明这一程的特点`);
    assert.ok(path.highlights.length >= 3, `${path.id} 的里程碑太少`);
  }
  // 每套样本内部按「第一程…第 N 程」排序；各套样本之间彼此独立。
  for (const set of EXAMPLE_SETS) {
    const count = STAGE_COUNTS[set.id];
    assert.ok(count, `${set.id} 没有登记程数`);
    assert.deepEqual(
      set.paths.map((path) => path.ordinal),
      ZH_ORDINALS.slice(0, count),
      `${set.id} 应当按教材顺序排出 ${count} 程`,
    );
    assert.ok(set.title && set.source && set.lead && set.note, `${set.id} 缺少标题、出处、导语或边界说明`);
    /*
     * 短书名：压缩态下按学科选书时，按钮上只放这一个名字（2026-10-13 第二版）。
     * 它是**写下来的数据**，不从 `title` 裁——中英两侧的书名结构不同，裁出来会一半带书名号。
     */
    assert.ok(set.shortTitle && set.shortTitle.length >= 4, `${set.id} 缺少短书名（压缩态的选书按钮要用它）`);
    /*
     * 「这条路径是怎么排的、买到什么、代价是什么」（2026-10-13 加）：
     * 悬浮书名时显示这三块，点开之后显示同一份内容。三块都**不许空**——
     * 空着的「优点」比不写更糟：读者会以为没什么可说的。
     */
    for (const [key, label] of [['signature', '特色'], ['merits', '优点'], ['limits', '代价与局限']]) {
      assert.ok(Array.isArray(set[key]) && set[key].length >= 2, `${set.id} 的「${label}」至少要有 2 条`);
      assert.ok(set[key].every((item) => typeof item === 'string' && item.length >= 10),
        `${set.id} 的「${label}」里有太短的条目——利弊要写具体，不能是一句口号`);
    }
    /*
     * 声明主学科：**兜底用的分组名**，必须在受控词表里。
     * 分组默认由本体现场统计（下面那条测试），统计拿不到东西时用它，
     * 否则一本属于线性代数的书会被显示成「其他」（2026-10-13 用户截图里的那一处）。
     */
    assert.ok(FIELD_IDS.includes(set.discipline), `${set.id} 的声明主学科「${set.discipline}」不在受控词表里`);
  }
});

test('范例路径：学科分组先量后兜底（本体查不到里程碑时也不落到「其他」）', async () => {
  /*
   * 两种输入各跑一次：
   * 1. **本体一份都没有**（等价于本体比样本旧、或那一帧还没到齐）：分组名应当取声明主学科；
   * 2. **真实本体**：分组名应当由里程碑的 `discipline` 现场统计出来。
   * 两条都不许出现「其他」。
   */
  const fromNothing = groupByDiscipline(EXAMPLE_SETS, new Map());
  /*
   * 组的数量 = **声明主学科的种数**，不是样本套数（2026-10-14 修）：
   * 线性代数下现在有两本（《简明高等代数》与 Axler），它们本来就该在同一组里。
   * 两件事一起守：没有「其他」，且每套样本恰好出现在一组里。
   */
  const declared = new Set(EXAMPLE_SETS.map((set) => set.discipline));
  assert.equal(fromNothing.length, declared.size, '组的数量应当等于声明主学科的种数');
  assert.deepEqual(
    fromNothing.flatMap((group) => group.sets.map((set) => set.id)).sort(),
    EXAMPLE_SETS.map((set) => set.id).sort(),
    '每套样本都要恰好出现在一组里',
  );
  for (const group of fromNothing) {
    assert.notEqual(group.discipline, '其他', `统计不到时不该落到「其他」：${group.sets.map((set) => set.id).join('、')}`);
    assert.equal(group.measured, false, '一条都没量到时，measured 应当是 false（界面据此不显示分布行）');
    assert.ok(group.sets.every((set) => set.discipline === group.discipline), '组名应当等于该书的声明主学科');
  }

  const ontology = await testOntology();
  const disciplineById = new Map(ontology.raw.nodes.map((node) => [node.id, node.discipline]));
  const measured = groupByDiscipline(EXAMPLE_SETS, disciplineById);
  for (const group of measured) {
    assert.notEqual(group.discipline, '其他', `真实本体下不该出现「其他」：${group.sets.map((set) => set.id).join('、')}`);
  }
  const jiang = measured.find((group) => group.sets.some((set) => set.id === 'jiang-jdga'));
  assert.equal(jiang?.discipline, '线性代数', '《简明高等代数》应当落在「线性代数」');
  assert.equal(jiang?.measured, true, '这条组名是量出来的');
  assert.ok(jiang.tally.length >= 2, '组内应当给出学科分布');
  // Axler 也归线性代数：两本书同组，是「按学科而不是按教材分类」的直接体现。
  assert.ok(jiang.sets.some((set) => set.id === 'axler-ladr'), 'Axler 应当与《简明高等代数》同组（线性代数）');
});

test('范例路径：起点、目标与里程碑都指向当前本体里存在的节点', async () => {
  const ontology = await testOntology();
  const known = new Set(ontology.raw.nodes.map((node) => node.id));
  for (const { path } of paths) {
    for (const id of [...path.goals, ...path.entries]) {
      assert.ok(known.has(id), `${path.id} 引用了不存在的节点：${id}`);
    }
    assert.equal(path.goal, path.goals[0], `${path.id} 的 goal 必须是 goals[0]`);
    assert.ok(path.goals.length >= 4, `${path.id} 的目标太少，不成一程`);
    // 起点不能与目标重叠：同一节点既当起点又当目标会让「这一程学到了什么」失去意义。
    const overlap = path.goals.filter((id) => path.entries.includes(id));
    assert.deepEqual(overlap, [], `${path.id} 的起点与目标重叠：${overlap.join('、')}`);
  }
});

test('范例路径：每一程都能在声明的 horizon 内被规划器判定为 Found 且未截断', async () => {
  const ontology = await testOntology();
  const planner = makePlanner(ontology);
  for (const { path } of paths) {
    const background = path.entries.map((node) => ({
      entryId: `example:${node}`, node, provides: ['statement', 'definition'], kind: 'confirmed',
    }));
    const result = planner.plan({
      goalId: path.goals[0],
      goalIds: path.goals.slice(1),
      background,
      horizon: path.horizon,
      maxCandidates: 1000000,
    });
    assert.equal(result.status, 'Found', `${path.id} 未能在声明的 horizon=${path.horizon} 内找到路线（状态 ${result.status}）`);
    assert.ok(result.search.complete, `${path.id} 的搜索被截断，卡片上的事件数不可信`);
    const route = result.routes[0];
    assert.ok(route, `${path.id} 没有路线`);
    assert.equal(route.events.length, path.events, `${path.id} 的实测事件数与卡片不一致`);
    assert.deepEqual(route.entry, [], `${path.id} 还有待决入口：${route.entry.join('、')}`);
    // 每个目标都必须由某个事件产出，而不是悄悄退化成背景。
    const produced = new Set(route.events.flatMap((event) => event.provides.map((output) => output.node)));
    for (const goal of path.goals) {
      assert.ok(produced.has(goal), `${path.id} 的目标 ${goal} 并没有被任何事件产出`);
    }
  }
});

test('范例路径：起点按「基础背景 + 前面各程的里程碑」累进，且不重复', async () => {
  const ontology = await testOntology();
  for (const set of EXAMPLE_SETS) {
    const spec = EXPECTED[set.id];
    assert.ok(spec, `${set.id} 没有登记预期的起点集合与里程碑总数`);
    assert.deepEqual(set.paths[0].entries, spec.base, `${set.id} 第一程的起点应当只有共享背景`);
    let expected = [...spec.base];
    for (const path of set.paths) {
      assert.deepEqual(path.entries, expected, `${path.id} 的起点与「前几程成果之和」不一致`);
      assert.equal(new Set(path.entries).size, path.entries.length, `${path.id} 的起点有重复项`);
      expected = [...expected, ...path.goals];
    }
    // 里程碑总数由测试守护：改了目标就要同时改这里，不让卡片上的数字悄悄漂掉。
    assert.equal(expected.length - spec.base.length, spec.milestones,
      `${set.id} 的里程碑总数应为 ${spec.milestones}`);
    /*
     * 一程的目标不该跨套：Rudin 与梁灿彬两套样本的节点不能互相混入。
     *
     * 判据从「id 前缀就是那一套」放宽成「那一套**登记过**这个节点」：2026-10 的节点合并
     * 把两套里的若干处登记收口到别的案例的规范节点上（见 `data/merges.mjs`），
     * 目标的 id 前缀因此不再等于套名，但它仍然是那一套登记的对象。
     */
    const setCase = SET_CASE[set.id];
    assert.ok(setCase, `${set.id} 没有登记它属于哪个案例`);
    const belongs = (id) => (ontology.maybeNode(id)?.cases ?? [id.split(':')[0]]).includes(setCase);
    for (const path of set.paths) {
      const foreign = path.goals.filter((id) => !belongs(id));
      assert.deepEqual(foreign, [], `${path.id} 混入了别的案例的节点：${foreign.join('、')}`);
    }
  }
});
