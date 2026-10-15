import test from 'node:test';
import assert from 'node:assert/strict';
import { buildLearningPlan, personalizePlanResult } from '../core/learning-plan.mjs';
import { makePlanner } from '../core/planner.mjs';
import { miniOntology, action, input, output, testOntology } from './helpers.mjs';
import { normalizeLearningPlan, scheduleLearningSteps, moveLearningStep, validateLearningOrder } from '../shared/learning-plan.mjs';

const confirmed = ids => ids.map(node => ({ node, entryId: node, kind: 'confirmed', confirmed: true, provides: ['statement', 'definition'] }));
const nodeStep = (key, discipline, lane = 'main') => ({ key, node: key, discipline, construct: 'Concept', lane });
const parallel = [nodeStep('a', '分析'), nodeStep('b', '群论'), nodeStep('c', '分析')];
const edges = [['a', 'c'], ['b', 'c']];

test('并行节点依兴趣换序，联合前置仍在汇合节点之前', () => {
  assert.deepEqual(scheduleLearningSteps(parallel, edges, { interests: ['分析'] }).order, ['a', 'b', 'c']);
  assert.deepEqual(scheduleLearningSteps(parallel, edges, { interests: ['群论'] }).order, ['b', 'a', 'c']);
});
test('提前、延后与选为下一步只接受完整且满足依赖的排列', () => {
  assert.equal(moveLearningStep(parallel, edges, ['a', 'b', 'c'], 'c', 0).valid, false);
  assert.deepEqual(moveLearningStep(parallel, edges, ['a', 'b', 'c'], 'b', 0).order, ['b', 'a', 'c']);
  assert.equal(validateLearningOrder(parallel, edges, ['a', 'c']).valid, false);
  assert.equal(validateLearningOrder(parallel, [['missing', 'a']], ['a', 'b', 'c']).valid, false);
});
test('支线默认在主线里程碑后，但有效的手动排列可以提前支线', () => {
  const steps = [...parallel, nodeStep('x', '群论', 'branch')];
  const result = scheduleLearningSteps(steps, edges, { interests: ['群论'] });
  assert.deepEqual(result.order, ['b', 'a', 'c', 'x']);
  const manualOrder = { ontologyVersion: 'v1', graphHash: 'h1', steps: ['x', 'b', 'a', 'c'] };
  assert.deepEqual(scheduleLearningSteps(steps, edges, { manualOrder }, manualOrder).order, manualOrder.steps);
  assert.equal(scheduleLearningSteps(steps, edges, { manualOrder }, { ontologyVersion: 'v2', graphHash: 'h1' }).staleManual, true);
});
test('成环不伪造顺序；相同输入可复现且不改变输入', () => {
  const before = JSON.stringify(parallel);
  const a = scheduleLearningSteps(parallel, [...edges, ['c', 'a']]);
  assert.ok(a.unresolved.includes('a'));
  assert.deepEqual(scheduleLearningSteps(parallel, edges), scheduleLearningSteps(parallel, edges));
  assert.equal(JSON.stringify(parallel), before);
});
test('AND/OR 选择与硬前置通过同一规划器补齐，计划没有写入确认', () => {
  const ontology = miniOntology({
    nodes: ['root', 'a', 'b', 'c', 'g', 'x'].map(id => ({ id })),
    actions: [action('a', [input('root')], [output('a')]), action('b', [input('root')], [output('b')]),
      action('c', [input('a'), input('b')], [output('c')]), action('g', [input('c')], [output('g')]), action('x', [input('a')], [output('x')])],
    relations: [{ id: 'hard-b-g', kind: 'hardPrereq', from: 'b', to: 'g', witness: { status: 'DEF' } }], boundary: ['root'],
  });
  const before = JSON.stringify(ontology.raw);
  const plan = buildLearningPlan(ontology, { primaryGoal: 'g', branches: ['x'] }, confirmed(['root']));
  assert.equal(plan.status, 'Found');
  assert.equal(new Set(plan.steps.map(step => step.node)).size, plan.steps.length, '共享前置只安排一次');
  assert.equal(validateLearningOrder(plan.steps, plan.edges, plan.order).valid, true);
  const order = plan.order.map(key => plan.steps.find(step => step.key === key).node);
  assert.ok(order.indexOf('a') < order.indexOf('c') && order.indexOf('b') < order.indexOf('c'));
  assert.ok(order.indexOf('g') < order.indexOf('x'));
  assert.ok(plan.currentReady.includes('a') && !plan.currentReady.includes('c'));
  const manualOrder = { ontologyVersion: plan.ontologyVersion, graphHash: plan.graphHash, steps: [...plan.order] };
  const again = buildLearningPlan(ontology, { primaryGoal: 'g', branches: ['x'], manualOrder }, confirmed(['root']));
  assert.deepEqual(again.order, plan.order); assert.equal(again.staleManual, false);
  assert.equal(JSON.stringify(ontology.raw), before);
});
test('选择替代来源，不把两个 OR 方案都当成必须学', () => {
  const ontology = miniOntology({ nodes: ['root', 'a', 'b', 'g'].map(id => ({ id })), actions: [
    action('a', [input('root')], [output('a')]), action('b', [input('root')], [output('b')]),
    action('ga', [input('a')], [output('g')]), action('gb', [input('b')], [output('g')]),
  ], boundary: ['root'] });
  const plan = buildLearningPlan(ontology, { primaryGoal: 'g' }, confirmed(['root']));
  assert.equal(plan.steps.length, 2);
  assert.equal(plan.steps.filter(step => ['a', 'b'].includes(step.node)).length, 1);
  assert.ok(plan.steps.every(step => step.lane === 'main'), '实际选择的替代方案全部属于主线');
});

test('替代方案的硬前置各自补齐，不合并无法完成的另一方案', () => {
  const ontology = miniOntology({ nodes: ['root', 'a', 'b', 'missing', 'g'].map(id => ({ id })), actions: [
    action('a', [input('root')], [output('a')]), action('b', [input('root')], [output('b')]),
    action('missing', [input('missing')], [output('missing')]),
    action('ga', [input('a')], [output('g')]), action('gb', [input('b')], [output('g')]),
  ], relations: [{ id: 'h', kind: 'hardPrereq', from: 'missing', to: 'a' }], boundary: ['root'] });
  const plan = buildLearningPlan(ontology, { primaryGoal: 'g' }, confirmed(['root']));
  assert.equal(plan.milestone, 'g');
  assert.deepEqual(plan.steps.map(step => step.node).sort(), ['b', 'g']);
  assert.ok(plan.steps.every(step => step.lane === 'main'));
});

test('外部背景目标给出核对入口，依赖环如实阻塞', () => {
  const root = miniOntology({ nodes: [{ id: 'root' }], actions: [], boundary: ['root'] });
  const plan = buildLearningPlan(root, { primaryGoal: 'root' });
  assert.deepEqual(plan.background, ['root']); assert.equal(plan.status, 'Conditional');
  const cyclic = miniOntology({ nodes: [{ id: 'a' }, { id: 'b' }], actions: [
    action('a', [input('b')], [output('a')]), action('b', [input('a')], [output('b')]),
  ] });
  const blocked = buildLearningPlan(cyclic, { primaryGoal: 'a' });
  assert.equal(blocked.status, 'Blocked'); assert.ok(blocked.unresolved.includes('a'));
});
test('真实本体六个入口都提供近期内容或明确背景，不把选入计划当作已学', async () => {
  const ontology = await testOntology();
  for (const primaryGoal of ['limit:bridge', 'group:cayley', 'tensor:end-iso', 'manifold:claim-max', 'dg:generalized-stokes-theorem', 'top:atlas']) {
    const plan = buildLearningPlan(ontology, { primaryGoal });
    assert.ok(plan.steps.length > 0, primaryGoal);
    assert.ok(plan.background.length > 0, primaryGoal);
    assert.equal(plan.currentReady.length, 0, '空白档案不能假装前置已确认');
    assert.equal(validateLearningOrder(plan.steps, plan.edges, plan.order).valid, true);
    const after = buildLearningPlan(ontology, { primaryGoal }, confirmed(plan.background));
    assert.ok(after.currentReady.length > 0, primaryGoal);
  }
});

test('主目标确认后继续主动支线，不把已经完成的主线重新排入待学任务', () => {
  const ontology = miniOntology({ nodes: ['root', 'g', 'x'].map(id => ({ id })), actions: [
    action('g', [input('root')], [output('g')]), action('x', [input('root')], [output('x')]),
  ], boundary: ['root'] });
  const next = buildLearningPlan(ontology, { primaryGoal: 'g', branches: ['x'] }, confirmed(['root', 'g']));
  assert.equal(next.primaryGoal, 'g'); assert.equal(next.primaryComplete, true);
  assert.deepEqual(next.steps.map(step => step.node), ['x']);
  assert.equal(next.steps[0].lane, 'branch'); assert.deepEqual(next.currentReady, ['x']);
  const branchDone = buildLearningPlan(ontology, { primaryGoal: 'g', branches: ['x'] }, confirmed(['root', 'x']));
  assert.deepEqual(branchDone.steps.map(step => step.node), ['g']);
  assert.deepEqual(branchDone.deferredBranches, []);
});
test('事件实例与重复阅读保留独立标识，详细路线沿用相同排序层', () => {
  const ontology = miniOntology({ nodes: ['root', 'g'].map(id => ({ id })), actions: [action('a', [input('root')], [output('g')])], boundary: ['root'] });
  const planner = makePlanner(ontology);
  const result = planner.withReview(planner.plan({ goalId: 'g', background: confirmed(['root']) }), { node: 'g' });
  const personalized = personalizePlanResult(ontology, result, { primaryGoal: 'g' }, confirmed(['root']));
  const schedule = personalized.routes[0].learningSchedule;
  assert.equal(schedule.steps.length, 2);
  assert.equal(new Set(schedule.steps.map(step => step.key)).size, 2);
});
test('旧设置缺字段可读；不接受重复步骤或非法偏好', () => {
  assert.deepEqual(normalizeLearningPlan({ primaryGoal: 'g' }).interests, []);
  assert.throws(() => normalizeLearningPlan({ mood: 'invented' }));
  assert.throws(() => normalizeLearningPlan({ manualOrder: { ontologyVersion: 'v', graphHash: 'h', steps: ['a', 'a'] } }));
});
