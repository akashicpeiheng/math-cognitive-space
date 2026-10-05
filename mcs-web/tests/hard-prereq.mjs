import test from 'node:test';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { MCS_WEB_ROOT } from '../core/ontology.mjs';

const { loadOntology } = await import(pathToFileURL(resolve(MCS_WEB_ROOT, 'core/ontology.mjs')).href);
const { RELATION_WEIGHT, witnessFactorOf, edgeVisual, assertHierarchyHolds } = await import(
  pathToFileURL(resolve(MCS_WEB_ROOT, 'web/src/relation-visual.ts')).href
);

/**
 * 硬前置（`hardPrereq`）的登记口径与见证类型。
 *
 * 历史：第四十二轮只对「数学分析初步」与「微分几何」两案核心登记了 46 条，
 * 见证一律 `DEF` + `definitional-dependency`，并把两处欠账写在验收记录的边界里：
 * （1）其余案例一条都没有；（2）「某定理用到另一条定理」这类**证明依赖**没有表达，
 * 反函数 → 隐函数那一条还混在同一批 `DEF` 里，从数据上看不出区别。
 *
 * 2026-10 这一轮把两处都补上：
 * - 覆盖扩到 manifold / tensor / group / liang / rudin 五个案例（背景节点可以当前置的来源）；
 * - 引入 `witness.type = 'proof-dependency'`：见证状态必须**与所引用的证据一致**，
 *   且那条证据必须同时列出两端节点——「用到哪条定理」因此可核，而不是一句注释。
 *
 * 这一套把「写进去了」与「写得合法」分开钉。
 */
const PREVIOUS_HARD_PREREQ_COUNT = 46;
const MIN_HARD_PREREQ_COUNT = 100;

const ontology = await loadOntology();
const relations = ontology.raw.relationDescriptions ?? [];
const nodes = ontology.raw.nodes ?? [];
const evidence = ontology.raw.evidence ?? [];
const nodeIds = new Set(nodes.map((node) => node.id));
const byId = new Map(nodes.map((node) => [node.id, node]));
const hard = relations.filter((relation) => relation.kind === 'hardPrereq');

test('硬前置关系不再是空的，且已覆盖到五个以上案例', () => {
  assert.ok(hard.length > PREVIOUS_HARD_PREREQ_COUNT, `hardPrereq 仍停在 ${hard.length} 条`);
  assert.ok(hard.length >= MIN_HARD_PREREQ_COUNT, `条数偏少（${hard.length}），核心链应当不止几条`);
  const cases = new Set(hard.map((relation) => relation.to.split(':')[0]));
  for (const caseId of ['limit', 'dg', 'manifold', 'tensor', 'group', 'liang', 'rudin']) {
    assert.ok(cases.has(caseId), `${caseId} 案例一条硬前置都没有`);
  }
});

test('硬前置的端点都在本体里，且不与自己成环', () => {
  for (const relation of hard) {
    assert.ok(nodeIds.has(relation.from), `${relation.id} 的 from 不存在：${relation.from}`);
    assert.ok(nodeIds.has(relation.to), `${relation.id} 的 to 不存在：${relation.to}`);
    assert.notEqual(relation.from, relation.to, `${relation.id} 自环`);
  }
});

test('硬前置只出现在案例内部或「背景 → 案例」之间（不跨案例写前置）', () => {
  for (const relation of hard) {
    const fromCase = relation.from.split(':')[0];
    const toCase = relation.to.split(':')[0];
    if (fromCase === 'bg') continue; // 背景节点是共享边界，按设计可以当前置的来源。
    assert.equal(fromCase, toCase, `${relation.id} 跨案例：${relation.from} → ${relation.to}`);
  }
  // 背景只能当来源，不能当目标：目标必须是案例里可独立认知的对象。
  for (const relation of hard) {
    assert.notEqual(relation.to.split(':')[0], 'bg', `${relation.id} 把背景节点当成前置的目标`);
  }
});

test('两种见证类型分得开：定义性依赖用 DEF，证明依赖用 ref 指向可核证据', () => {
  const types = new Set();
  for (const relation of hard) {
    const witness = relation.witness ?? {};
    types.add(witness.type);
    assert.ok((witness.scope ?? '').length >= 10, `${relation.id} 没写清依据在定义/陈述的哪一处`);
    assert.ok((relation.scope ?? '').length >= 10, `${relation.id} 缺 scope 说明`);
    if (witness.type === 'definitional-dependency') {
      assert.equal(witness.status, 'DEF', `${relation.id} 定义性依赖的见证状态应为 DEF：${witness.status}`);
      continue;
    }
    assert.equal(witness.type, 'proof-dependency', `${relation.id} 的见证类型不在两类之内：${witness.type}`);
    // 证明依赖：ref 必须指向一条同时列出两端、且状态一致的证据。
    const record = evidence.find((item) => item.id === witness.ref);
    assert.ok(record, `${relation.id} 的 ref 指向未知证据：${witness.ref}`);
    assert.equal(witness.status, record.status, `${relation.id} 的见证状态与证据 ${record.id} 不一致`);
    for (const end of [relation.from, relation.to]) {
      assert.ok((record.nodes ?? []).includes(end), `证据 ${record.id} 没有列出 ${relation.id} 的端点 ${end}`);
    }
  }
  for (const expected of ['definitional-dependency', 'proof-dependency']) {
    assert.ok(types.has(expected), `没有登记过 ${expected} 类型的见证`);
  }
});

test('反函数 → 隐函数那条已经是可区分的证明依赖（不再是混在 DEF 里的推导）', () => {
  const edge = hard.find((relation) => relation.from === 'dg:inverse-function-theorem'
    && relation.to === 'dg:implicit-function-theorem');
  assert.ok(edge, '反函数 → 隐函数那条硬前置不见了');
  assert.equal(edge.witness.type, 'proof-dependency');
  assert.equal(edge.witness.status, 'PROOF');
  assert.ok(evidence.some((record) => record.id === edge.witness.ref
    && record.status === 'PROOF'
    && (record.nodes ?? []).includes('dg:inverse-function-theorem')
    && (record.nodes ?? []).includes('dg:implicit-function-theorem')), '该依赖没有可核的证据记录');
});

test('硬前置没有重复的同向三元组', () => {
  const seen = new Set();
  for (const relation of hard) {
    const key = `${relation.from}→${relation.to}`;
    assert.ok(!seen.has(key), `重复的硬前置：${key}`);
    seen.add(key);
  }
});

test('硬前置 + DEF 见证落在最高一档「核心断言」', () => {
  const visual = edgeVisual('relation', 'hardPrereq', 'DEF', '#4c1d95');
  assert.equal(visual.weight, RELATION_WEIGHT.hardPrereq, 'DEF 见证不该打折');
  assert.equal(visual.tier, 'core', `落在 ${visual.tier} 而不是 core`);
  // 与定义性前置契约同档，但不更轻。
  const contract = edgeVisual('contract', null, null, '#6d28d9', 'definition');
  assert.ok(visual.weight >= contract.weight, `硬前置 ${visual.weight} 轻于定义性前置 ${contract.weight}`);
  assert.equal(visual.width >= contract.width, true, JSON.stringify({ hard: visual.width, contract: contract.width }));
});

test('证明依赖的 FINITE 见证仍在核心档（证书片段不该被画得比契约轻）', () => {
  const visual = edgeVisual('relation', 'hardPrereq', 'FINITE', '#4c1d95');
  const contract = edgeVisual('contract', null, null, '#6d28d9', 'definition');
  assert.equal(visual.tier, 'core', `落在 ${visual.tier} 而不是 core`);
  assert.ok(visual.weight >= contract.weight, `FINITE 见证的硬前置 ${visual.weight} 轻于定义性前置 ${contract.weight}`);
});

test('见证折扣只对 hardPrereq + DEF 例外，其它种类照旧打折', () => {
  assert.equal(witnessFactorOf('hardPrereq', 'DEF'), 1);
  assert.ok(witnessFactorOf('hardGeneralization', 'DEF') < 1, '硬泛化的 DEF 见证应当打折');
  assert.ok(witnessFactorOf('hardPrereq', 'ILLUSTRATION') < 1, '硬前置只登记为示例时应当打折');
});

test('关系可视化不变量成立（含最高档不被契约反超）', () => {
  const problems = assertHierarchyHolds();
  assert.deepEqual(problems, [], problems.join('；'));
});

test('前置的语义合理性：定义性依赖的目标不是「方法 / 误区 / 练习 / 证书」', () => {
  /*
   * 登记口径（README「硬前置关系」一节）：只登记核心链上的定义与陈述依赖。
   * 方法与误区模式是任务描述、练习是题目、证书是证明片段——它们都不是「先有才能定义」的关系，
   * 因此不能作为**定义性依赖**的目标。例子与反例可以：它们的定义本身要用到被依赖的对象
   * （如「常值序列」要成为收敛的实例，仍然依赖收敛的定义），这是 limit 案例里的既有登记。
   * 证书片段可以作为目标，但只能用**证明依赖**（它依赖的是自己证明的那条断言）。
   */
  const forbidden = new Set(['Method', 'MisconceptionPattern', 'Problem', 'Proof']);
  for (const relation of hard) {
    const target = byId.get(relation.to);
    if (!forbidden.has(target.construct)) continue;
    assert.equal(relation.witness.type, 'proof-dependency',
      `${relation.id} 的目标是 ${target.construct}（${relation.to}），这类目标只能用证明依赖登记`);
  }
});
