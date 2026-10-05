import test from 'node:test';
import assert from 'node:assert/strict';
import { canonicalString } from '../shared/contracts.mjs';
import { makePlanner } from '../core/planner.mjs';
import { testOntology, miniOntology, action, input, output } from './helpers.mjs';

function andOrFixture() {
  return miniOntology({
    nodes: [{ id: 'u' }, { id: 'v' }, { id: 'w' }, { id: 'g' }],
    actions: [
      action('a_and', [input('u'), input('v')], [output('g')]),
      action('a_or', [input('w')], [output('g')]),
    ],
    boundary: ['u', 'v', 'w'],
  });
}

const confirmed = (ids) => ids.map((id) => ({ entryId: id, node: id, provides: ['statement'], kind: 'confirmed' }));

test('AND 输入是联合前提，OR 是同一目标的替代行动', () => {
  const planner = makePlanner(andOrFixture());
  const result = planner.plan({ goalId: 'g', background: confirmed(['u', 'v', 'w']) });
  assert.equal(result.status, 'Found');
  assert.equal(result.routes.length, 2);
  const andRoute = result.routes.find((route) => route.events[0].actionId === 'a_and');
  assert.ok(andRoute);
  assert.deepEqual(Object.keys(andRoute.events[0].sources).sort(), ['u', 'v']);
  assert.deepEqual(result.familyRequired, []);
});

test('缺少部分联合前提时给出显式入口，状态为 Conditional', () => {
  const planner = makePlanner(andOrFixture());
  const result = planner.plan({ goalId: 'g', background: confirmed(['u']) });
  assert.equal(result.status, 'Conditional');
  assert.ok(result.entryConditions.includes('v'));
  assert.ok(result.entryConditions.includes('w'));
  assert.ok(result.unknownEntries.every((item) => item.question.includes('确认')));
});

test('禁用未知入口时缺前提申报为界内不可行', () => {
  const planner = makePlanner(andOrFixture());
  const result = planner.plan({ goalId: 'g', background: confirmed(['u']), useUnknownEntries: false });
  assert.equal(result.status, 'InfeasibleWithinBound');
  assert.equal(result.routes.length, 0);
  assert.equal(result.search.complete, true);
});

test('来源边与策略边合并后成环则拒绝候选', () => {
  const ontology = miniOntology({
    nodes: [{ id: 'x' }, { id: 'y' }, { id: 'z' }],
    actions: [action('a1', [input('x')], [output('y')]), action('a2', [input('y')], [output('z')])],
    boundary: ['x'],
  });
  const planner = makePlanner(ontology);
  const result = planner.plan({
    goalId: 'z',
    background: confirmed(['x']),
    strategy: { orderSets: [[{ from: { action: 'a2', index: 0 }, to: { action: 'a1', index: 0 } }]] },
  });
  assert.equal(result.status, 'InfeasibleWithinBound');
  assert.ok(result.search.reasons.includes('JOINT_CYCLE'));
});

test('多输出行动可以只执行一次同时满足多个目标', () => {
  const ontology = miniOntology({
    nodes: [{ id: 'u' }, { id: 'g' }, { id: 'h' }],
    actions: [action('a_both', [input('u')], [output('g'), output('h')])],
    boundary: ['u'],
  });
  const planner = makePlanner(ontology);
  const result = planner.plan({ goalIds: ['g', 'h'], background: confirmed(['u']) });
  assert.equal(result.status, 'Found');
  assert.equal(result.routes.length, 1);
  assert.equal(result.routes[0].events.length, 1);
  assert.deepEqual(Object.keys(result.routes[0].goalSources).sort(), ['g', 'h']);
});

test('事件界限制：超出 h 的链申报为界内不可行', () => {
  const ontology = miniOntology({
    nodes: [{ id: 'a' }, { id: 'b' }, { id: 'c' }],
    actions: [action('a1', [input('a')], [output('b')]), action('a2', [input('b')], [output('c')])],
    boundary: ['a'],
  });
  const planner = makePlanner(ontology);
  const result = planner.plan({ goalId: 'c', background: confirmed(['a']), horizon: 1, useUnknownEntries: false });
  assert.equal(result.status, 'InfeasibleWithinBound');
  assert.equal(result.search.bounds.horizon, 1);
});

test('预算在成本可比较时是硬界，未知成本不被静默比较', () => {
  const planner = makePlanner(andOrFixture());
  const withCosts = { costs: { a_and: 3, a_or: 1 } };
  const chosen = planner.plan({ goalId: 'g', background: confirmed(['u', 'v', 'w']), strategy: withCosts, budget: { maxCost: 1 } });
  assert.equal(chosen.status, 'Found');
  assert.ok(chosen.routes.every((route) => route.events[0].actionId === 'a_or'));
  const tooSmall = planner.plan({ goalId: 'g', background: confirmed(['u', 'v', 'w']), strategy: withCosts, budget: { maxCost: 0 } });
  assert.equal(tooSmall.status, 'InfeasibleWithinBound');
  const unknownCost = planner.plan({ goalId: 'g', background: confirmed(['u', 'v', 'w']), budget: { maxCost: 0 } });
  assert.equal(unknownCost.status, 'Conditional');
  assert.ok(unknownCost.routes.every((route) => route.cost.status === 'unknown'));
});

test('复习事件是同一行动的另一个事件实例，并依赖其输入来源', async () => {
  const ontology = await testOntology();
  const planner = makePlanner(ontology);
  const background = ['bg:real:metric', 'bg:logic:quantifier', 'bg:set:function', 'bg:manifold:calc'].map((id) => ({ entryId: id, node: id, provides: ['statement', 'definition'], kind: 'confirmed' }));
  const plan = planner.plan({ goalId: 'limit:bridge', background });
  const reviewed = planner.withReview(plan, { node: 'limit:limit-ed', actionId: 'a-limit:d' });
  const route = reviewed.routes[0];
  assert.equal(route.events.length, plan.routes[0].events.length + 1);
  const reviewEvent = route.events.find((event) => event.kind === 'review');
  assert.ok(reviewEvent);
  assert.equal(reviewEvent.actionId, 'a-limit:d');
  assert.ok(plan.routes[0].events.some((event) => event.actionId === 'a-limit:d'), '复习复用已经出现过的行动');
  assert.ok(route.order.some(([from, to]) => from === reviewEvent.id || to === reviewEvent.id));
  assert.ok(route.linearExtensions[0].includes(reviewEvent.id));
});

test('候选上限截断时返回 Unknown 与原因，不伪装成界内无解', () => {
  const producers = Array.from({ length: 40 }, (_, index) => action(`p${index}`, [input('x')], [output('m')]));
  const ontology = miniOntology({
    nodes: [{ id: 'x' }, { id: 'm' }, { id: 'g' }],
    actions: [...producers, action('fin', [input('m')], [output('g')])],
    boundary: ['x'],
  });
  const planner = makePlanner(ontology);
  const result = planner.plan({ goalId: 'g', background: confirmed(['x']), maxCandidates: 5, horizon: 4 });
  assert.equal(result.status, 'Unknown');
  assert.equal(result.search.complete, false);
  assert.ok(result.search.reasons.includes('CANDIDATE_LIMIT'));
});

test('固定输入下规划结果可复现', async () => {
  const ontology = await testOntology();
  const planner = makePlanner(ontology);
  const background = ['bg:group:binary', 'bg:set:function'].map((id) => ({ entryId: id, node: id, provides: ['statement', 'definition'], kind: 'confirmed' }));
  const request = { goalId: 'group:cayley', background, horizon: 6 };
  const first = planner.plan(request);
  const second = planner.plan(request);
  assert.equal(first.status, 'Found');
  assert.equal(canonicalString(first), canonicalString(second));
});

test('四组贯通案例在声明背景下都能找到最少事件路线', async () => {
  const ontology = await testOntology();
  const planner = makePlanner(ontology);
  const background = ['bg:real:metric', 'bg:logic:quantifier', 'bg:logic:equality', 'bg:set:function', 'bg:linear:vector', 'bg:top:space', 'bg:manifold:calc', 'bg:group:binary'].map((id) => ({ entryId: id, node: id, provides: ['statement', 'definition'], kind: 'confirmed' }));
  const goals = ['limit:bridge', 'manifold:claim-max', 'tensor:end-iso', 'group:cayley'];
  for (const goal of goals) {
    const result = planner.plan({ goalId: goal, background, horizon: 8 });
    assert.equal(result.status, 'Found', `${goal}: ${JSON.stringify(result.search)}`);
    assert.ok(result.routes[0].events.length >= 1);
    assert.ok(result.routes[0].linearExtensions.length >= 1);
    assert.ok(result.routes[0].witness.every((item) => item.status));
  }
});
