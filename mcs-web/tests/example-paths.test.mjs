import test from 'node:test';
import assert from 'node:assert/strict';
import { testOntology } from './helpers.mjs';
import { makePlanner } from '../core/planner.mjs';
import { EXAMPLE_SETS, LIANG_BASE_ENTRIES, RUDIN_BASE_ENTRIES } from '../web/src/example-paths.ts';

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
};

test('范例路径：栏目里每一个样本的 id 与序数唯一', () => {
  assert.ok(EXAMPLE_SETS.length >= 2, '栏目里应当有不止一套样本（梁灿彬上册、Rudin）');
  assert.ok(paths.length > 0, '栏目里至少要有一个样本');
  const ids = paths.map(({ path }) => path.id);
  assert.equal(new Set(ids).size, ids.length, '样本 id 必须唯一');
  for (const { path } of paths) {
    assert.ok(path.ordinal && path.title && path.chapters, `${path.id} 缺少序数、标题或章节`);
    assert.ok(path.feature.length >= 40, `${path.id} 的特色简介太短，不足以说明这一程的特点`);
    assert.ok(path.highlights.length >= 3, `${path.id} 的里程碑太少`);
  }
  // 每套样本内部按「第一程…第七程」排序；两套样本之间彼此独立。
  for (const set of EXAMPLE_SETS) {
    assert.deepEqual(
      set.paths.map((path) => path.ordinal),
      ['第一程', '第二程', '第三程', '第四程', '第五程', '第六程', '第七程'],
      `${set.id} 应当按教材顺序排出七程`,
    );
    assert.ok(set.title && set.source && set.lead && set.note, `${set.id} 缺少标题、出处、导语或边界说明`);
  }
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

test('范例路径：起点按「基础背景 + 前面各程的里程碑」累进，且不重复', () => {
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
    // 一程的目标不该跨套：Rudin 与梁灿彬两套样本的节点不能互相混入。
    for (const path of set.paths) {
      const foreign = path.goals.filter((id) => !id.startsWith(set.id === 'rudin-pma' ? 'rudin:' : 'liang:'));
      assert.deepEqual(foreign, [], `${path.id} 混入了别的案例的节点：${foreign.join('、')}`);
    }
  }
});
