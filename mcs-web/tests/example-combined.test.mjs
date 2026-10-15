import test from 'node:test';
import assert from 'node:assert/strict';
import { combineStages, combinedRouteSearch, parseStageSpans, stepStageIndex } from '../web/src/example-combined.ts';
import { EXAMPLE_SETS } from '../web/src/example-paths.ts';
import { parseRouteSearch, planFromSearch, serializeRouteSearch, planRoute } from '../web/src/route-replay.ts';

/**
 * 「把一本教材的好几程放进同一张网络视图」的合成规则。
 *
 * 它是纯函数：教材数据 + 勾了哪几程 → 一条可回放的路线（起点 / 展开序列 / 程边界）。
 * 这里核对的是四件事——接的顺序、去重、起点取哪一程的、以及程边界与 URL 的往返。
 */

const liang = EXAMPLE_SETS.find((set) => set.id === 'liang-volume-1');
const jiang = EXAMPLE_SETS.find((set) => set.id === 'jiang-volume-1') ?? EXAMPLE_SETS.find((set) => set.id.startsWith('jiang'));
const rudin = EXAMPLE_SETS.find((set) => set.id === 'rudin-pma');

test('多程合一图：没有这套样本就无从谈起（测试本身的前置）', () => {
  assert.ok(liang && jiang && rudin, '这三套样本都存在');
  assert.ok(liang.paths.length >= 3, `梁灿彬至少三程：${liang.paths.length}`);
});

test('多程合一图：序列按程的先后接起来，同一节点只出现一次', () => {
  const route = combineStages(liang, [0, 1, 2]);
  assert.ok(route);
  // 第 n 程的起点 = 基础背景 + 前 n−1 程的全部里程碑，因此后一程的目标里必然有已出现过的。
  const stageGoals = [0, 1, 2].flatMap((index) => liang.paths[index].goals);
  assert.deepEqual(route.path, [...new Set(stageGoals)].filter((id) => !route.entry.includes(id)),
    '展开序列 = 各程目标按序去重、去掉已在起点的');
  assert.equal(new Set(route.path).size, route.path.length, '不许重复');
  // 起点取选中里最早那一程的起点（未选中的程的里程碑也在里面，那是「已经在手里」）。
  assert.deepEqual(route.entry, [...new Set(liang.paths[0].entries)]);
});

test('多程合一图：程边界记下「每一程贡献了几步、从第几步开始」', () => {
  const route = combineStages(liang, [0, 1, 2]);
  assert.equal(route.stages.length, 3);
  let running = 0;
  for (const [position, stage] of route.stages.entries()) {
    assert.equal(stage.index, position, '按下标升序排列');
    assert.equal(stage.from, running, `第 ${position + 1} 程应当从第 ${running} 步开始`);
    assert.equal(stage.ordinal, liang.paths[position].ordinal);
    assert.equal(stage.title, liang.paths[position].title);
    running += stage.count;
  }
  assert.equal(running, route.path.length, '各程步数之和 = 序列长度');
  // 第 2 程的目标里有一部分在第 1 程已经给过，因此它贡献的新节点少于它的目标数。
  const second = liang.paths[1];
  assert.ok(route.stages[1].count <= second.goals.length);
  assert.ok(route.stages[1].count > 0, `第 2 程总该有新节点：${route.stages[1].count}`);
});

test('多程合一图：勾选顺序不影响结果，越界与重复的下标被丢掉', () => {
  const ordered = combineStages(liang, [0, 2, 1]);
  const shuffled = combineStages(liang, [2, 0, 1, 1, 0]);
  assert.deepEqual(shuffled, ordered, '去重 + 按下标排序');
  assert.deepEqual(combineStages(liang, [1, 99, -3])?.stages.map((stage) => stage.index), [1], '越界项丢掉');
  assert.equal(combineStages(liang, []), null, '一程都没选就没有路线');
  assert.equal(combineStages(liang, [99]), null);
});

test('多程合一图：跳着选时，中间没选的程不进图（图里只有选中的那几程）', () => {
  const spanning = combineStages(rudin, [0, 1]);
  const skipping = combineStages(rudin, [0, 2]);
  assert.ok(spanning && skipping);
  assert.equal(spanning.goal, rudin.paths[1].goal);
  assert.equal(skipping.goal, rudin.paths[2].goal);
  /*
   * 起点取**选中里最早那一程**的起点，因此跳着选（0 与 2，漏掉 1）时，
   * 第 2 程的里程碑并不在图里——图等于「选中的那几程的里程碑并集」。
   * 这是刻意的：勾选表达的就是「我要看这几程」，不该替用户把没勾的也放进来。
   */
  assert.deepEqual(skipping.entry, [...new Set(rudin.paths[0].entries)]);
  const skipped = rudin.paths[1].goals.filter((id) => !rudin.paths[0].goals.includes(id));
  assert.ok(skipped.length > 0, '这一程确实有新节点（否则这条断言没意义）');
  assert.ok(skipped.every((id) => !skipping.entry.includes(id) && !skipping.path.includes(id)),
    '没勾的那一程的里程碑不出现在起点里，也不出现在展开序列里');
});

test('多程合一图：URL 往返——序列、程边界、教材 id 都还在', () => {
  const route = combineStages(jiang, [0, 1, 2]);
  assert.ok(route);
  const search = new URLSearchParams(combinedRouteSearch(route));
  assert.equal(search.get('play'), '1');
  const state = parseRouteSearch(search);
  assert.ok(state);
  assert.deepEqual(state.entry, route.entry);
  assert.deepEqual(state.path, route.path);
  assert.equal(state.routeId, route.routeId);
  assert.deepEqual(state.stages, route.stages.map((stage) => ({ index: stage.index, count: stage.count })));

  // 回放计划：每个节点一步，且每一步都知道自己属于哪一程。
  const plan = planFromSearch(state);
  assert.equal(plan.steps.length, route.path.length);
  assert.deepEqual(plan.steps.map((step) => step.added[0]), route.path);
  const perStage = plan.steps.map((step) => step.stageIndex);
  for (const stage of route.stages) {
    const slice = perStage.slice(stage.from, stage.from + stage.count);
    assert.ok(slice.every((index) => index === stage.index), `第 ${stage.index + 1} 程的步都标着它`);
  }
});

test('多程合一图：单程回放与规划器路线不带程边界（不影响既有链接）', () => {
  const single = parseRouteSearch(new URLSearchParams(combinedRouteSearch(combineStages(jiang, [0]))));
  assert.ok(single);
  assert.deepEqual(single.stages, [], '只勾一程时不写 stages（写了也只是噪音）');
  // 规划器出来的路线照旧没有程：序列化不带 stages，解析回来是空数组。
  const plan = planRoute({ id: 'route-1', goals: ['a'], entry: ['e'], events: [] }, [], new Map());
  const search = new URLSearchParams(serializeRouteSearch(plan));
  assert.equal(search.get('stages'), null);
  assert.deepEqual(parseRouteSearch(search).stages, []);
  assert.equal(plan.stageSpans.length, 0);
});

test('多程合一图：stages 参数解析宽松（手改的链接不至于整段打不开）', () => {
  assert.deepEqual(parseStageSpans('2:5,3:4'), [{ index: 2, count: 5 }, { index: 3, count: 4 }]);
  assert.deepEqual(parseStageSpans('2:5,坏,3:x,-1:2,4:0'), [{ index: 2, count: 5 }, { index: 4, count: 0 }]);
  assert.deepEqual(parseStageSpans(''), []);
  assert.deepEqual(parseStageSpans(null), []);
  assert.deepEqual(parseStageSpans(undefined), []);
  // 步数比序列长时以序列为准：多出来的标注不生成步骤。
  const state = parseRouteSearch(new URLSearchParams('play=1&entry=e&path=a,b&stages=0:9'));
  assert.equal(state.path.length, 2);
  assert.equal(planFromSearch(state).steps.length, 2, 'stages 只用来标注，不决定放几个节点');
});

test('多程合一图：步 → 程的映射与程边界一致', () => {
  assert.deepEqual(stepStageIndex([{ index: 0, count: 2 }, { index: 3, count: 1 }]), [0, 0, 3]);
  assert.deepEqual(stepStageIndex([]), []);
});
