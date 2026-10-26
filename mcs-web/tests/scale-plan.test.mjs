import test from 'node:test';
import assert from 'node:assert/strict';
import manifest from '../data/manifest.mjs';
import { SCALE_LEVELS, UNIT_SOURCES } from '../data/scale.mjs';
import {
  buildScalePlan, validateScalePlan, planVersion, deriveUnitTitle, scalePlanStats,
} from '../core/scale.mjs';

/**
 * 尺度登记的**数据层**验收（2026-10-17）。
 *
 * 这一套不 import 任何前端代码，只查：
 *
 * 1. 现有 15 个 `kind:'topic'` 聚合是否全部被映射，且映射方式与 `UNIT_SOURCES` 一致；
 * 2. 55 个单元 / 2 个话题 / 9 个分子 / 4 个路径组的成员、类型、父节点是否都能解析；
 * 3. 版本号是否由内容决定；生成标题是否确定性；
 * 4. 坏 fixture 是否**报错**而不是静默跳过（缺映射、悬空成员、成员成环）。
 *
 * 数据新增聚合时这一套会红——那正是提醒「先决定它在六级尺度里的位置」。
 */

const plan = buildScalePlan({ nodes: manifest.nodes, aggregates: manifest.aggregates });
const topicAggregates = manifest.aggregates.filter((aggregate) => aggregate.kind === 'topic');

test('当前数据快照：55 单元 / 2 话题 / 9 分子 / 4 路径组，328/428 节点有单元', () => {
  const stats = scalePlanStats(plan);
  assert.equal(stats.units, 55);
  assert.equal(stats.aggregateUnits, 12);
  assert.equal(stats.blockUnits, 43);
  assert.equal(stats.topics, 2);
  assert.equal(stats.molecules, 9);
  assert.equal(stats.paths, 4);
  assert.equal(stats.nodesCovered, 328);
  assert.equal(stats.nodes, 428);
  assert.equal(plan.units.find(unit => unit.sourceAggregate === 'agg-newvault')?.members.length, 23);
});

test('每个 topic 聚合恰好一次映射；整条单元成员等于块展平，块单元数等于块数', () => {
  for (const aggregate of topicAggregates) {
    const units = plan.units.filter((unit) => unit.sourceAggregate === aggregate.id);
    assert.ok(units.length >= 1, `${aggregate.id} 没有单元`);
    if (units.length === 1 && units[0].sourceBlock === null) {
      assert.deepEqual([...new Set(aggregate.blocks.flat())].sort(), [...units[0].members].sort(), `${aggregate.id} 整条单元成员不对`);
    } else {
      assert.equal(units.length, aggregate.blocks.length, `${aggregate.id} 块单元数不对`);
      units.forEach((unit) => {
        const index = unit.sourceBlock;
        assert.deepEqual(unit.members, [...new Set(aggregate.blocks[index])], `${unit.id} 的成员不对`);
        assert.equal(unit.sourceBlock, index);
      });
    }
  }
  assert.deepEqual(Object.keys(UNIT_SOURCES).sort(), topicAggregates.map((aggregate) => aggregate.id).sort());
});

test('话题成员都是已登记单元，分子父节点与原子明细可核，id 不撞节点', () => {
  const unitIds = new Set(plan.units.map((unit) => unit.id));
  const nodeIds = new Set(manifest.nodes.map((node) => node.id));
  for (const topic of plan.topics) {
    assert.ok(topic.members.length > 0);
    assert.equal(topic.unitCount, topic.members.length);
    for (const id of topic.members) assert.ok(unitIds.has(id), `${topic.id} 的成员 ${id} 不是单元`);
  }
  for (const unit of plan.units) {
    assert.ok(!nodeIds.has(unit.id));
    for (const id of unit.members) assert.ok(nodeIds.has(id), `${unit.id} 的成员 ${id} 不存在`);
  }
  for (const molecule of plan.molecules) {
    assert.ok(nodeIds.has(molecule.node), `${molecule.id} 的父节点不存在`);
    assert.ok(molecule.atoms.length > 0);
    assert.ok(molecule.expression && molecule.source);
    assert.ok(!nodeIds.has(molecule.id));
  }
  assert.equal(new Set(plan.units.map((unit) => unit.id)).size, plan.units.length);
  assert.equal(new Set(plan.topics.map((topic) => topic.id)).size, plan.topics.length);
  assert.equal(new Set(plan.molecules.map((molecule) => molecule.id)).size, plan.molecules.length);
});

test('层级顺序固定；单元/话题是迁移登记，分子是显式登记', () => {
  assert.deepEqual(SCALE_LEVELS.map((level) => level.id), ['molecule', 'node', 'unit', 'topic']);
  assert.deepEqual(plan.levels.map((level) => level.sigma), [1, 2, 3, 4]);
  for (const unit of plan.units) {
    assert.equal(unit.scale, 'unit');
    assert.equal(unit.sigma, 3);
    assert.equal(unit.provisional, true);
    assert.equal(unit.evidenceStatus, 'ILLUSTRATION');
    assert.ok(['aggregate', 'derived', 'manual'].includes(unit.titleSource));
  }
  for (const topic of plan.topics) {
    assert.equal(topic.scale, 'topic');
    assert.equal(topic.sigma, 4);
    assert.equal(topic.provisional, true);
  }
  for (const molecule of plan.molecules) {
    assert.equal(molecule.scale, 'molecule');
    assert.equal(molecule.sigma, 1);
    assert.equal(molecule.provisional, false);
  }
});

test('版本号由内容决定：同输入同版本，改一个标题就变', () => {
  const again = buildScalePlan({ nodes: manifest.nodes, aggregates: manifest.aggregates });
  assert.equal(again.version, plan.version);
  assert.equal(planVersion(plan), plan.version);
  const mutated = { ...plan, units: plan.units.map((unit, index) => index === 0 ? { ...unit, title: `${unit.title}（改）` } : unit) };
  assert.notEqual(planVersion(mutated), plan.version);
});

test('生成标题是确定性的、带方法前缀、会截断', () => {
  const nodes = new Map([
    ['a', { id: 'a', title: '第一', construct: 'Concept' }],
    ['b', { id: 'b', title: '第二', construct: 'Concept' }],
    ['c', { id: 'c', title: '第三', construct: 'Concept' }],
    ['d', { id: 'd', title: '第四', construct: 'Concept' }],
    ['m', { id: 'm', title: '方法甲', construct: 'Method' }],
  ]);
  assert.equal(deriveUnitTitle(['a', 'b'], nodes), '第一、第二');
  assert.equal(deriveUnitTitle(['a', 'b', 'c', 'd'], nodes), '第一、第二、第三 等 4 项');
  assert.equal(deriveUnitTitle(['m'], nodes), '方法：方法甲');
  assert.equal(deriveUnitTitle([], nodes), '未命名单元');
  const long = deriveUnitTitle(['a', 'b', 'c', 'd'], new Map([
    ['a', { id: 'a', title: `${'很长的第一个对象名称'.repeat(3)}` }],
    ['b', { id: 'b', title: `${'很长的第二个对象名称'.repeat(3)}` }],
    ['c', { id: 'c', title: `${'很长的第三个对象名称'.repeat(3)}` }],
    ['d', { id: 'd', title: `${'很长的第四个对象名称'.repeat(3)}` }],
  ]));
  assert.ok(long.length <= 48, long);
  assert.match(long, /…$/);
});

test('缺映射的聚合必须报错，而不是静默漏掉', () => {
  const sources = { ...UNIT_SOURCES };
  delete sources['agg-limit'];
  assert.throws(
    () => buildScalePlan({ nodes: manifest.nodes, aggregates: manifest.aggregates }, { sources, topics: [], molecules: [], pathGroups: [] }),
    (error) => Array.isArray(error.problems) && error.problems.some((problem) => problem.includes('agg-limit') && problem.includes('没有 UNIT_SOURCES')),
  );
});

test('悬空成员必须报错', () => {
  const nodes = [{ id: 'n1', title: '节点一', construct: 'Concept' }];
  const aggregates = [{ id: 'agg-x', kind: 'topic', title: '测试', blocks: [['n1', 'missing']], note: '' }];
  assert.throws(
    () => buildScalePlan({ nodes, aggregates }, {
      sources: { 'agg-x': { mode: 'aggregate' } }, pathGroups: [], topics: [], molecules: [], notes: [],
    }),
    (error) => Array.isArray(error.problems) && error.problems.some((problem) => problem.includes('missing')),
  );
});

test('成员关系成环会被 validateScalePlan 抓到', () => {
  const base = {
    schema: 'mcs-scale-plan/1',
    status: 'provisional-migration',
    levels: SCALE_LEVELS,
    units: [
      { id: 'unit:a', scale: 'unit', sigma: 3, title: 'A', titleSource: 'manual', members: ['unit:b'], organization: 'x', source: 'x', pathId: null, provisional: true, evidenceStatus: 'ILLUSTRATION' },
      { id: 'unit:b', scale: 'unit', sigma: 3, title: 'B', titleSource: 'manual', members: ['unit:a'], organization: 'x', source: 'x', pathId: null, provisional: true, evidenceStatus: 'ILLUSTRATION' },
    ],
    topics: [], paths: [], molecules: [],
    counts: { units: 2, topics: 0, paths: 0, molecules: 0, nodes: 0, nodesCovered: 0, nodesUncovered: 0 },
    notes: [],
  };
  const problems = validateScalePlan(base, { nodes: [], aggregates: [] });
  assert.ok(problems.some((problem) => problem.includes('成环')), problems.join('；'));
});
