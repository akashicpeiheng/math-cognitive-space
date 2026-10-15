import test from 'node:test';
import assert from 'node:assert/strict';
import { testOntology, miniOntology } from './helpers.mjs';
import { makeLocalizer } from '../core/localization.mjs';
import { normalizeScalingRecord, scalingEndpoints, scalingEvidenceKey } from '../shared/scaling.mjs';
import { RELATION_KINDS } from '../shared/formal-schema.mjs';
import { collectCandidates } from '../core/formal/judges.mjs';
import { discoverRelations, replayCandidate } from '../core/formal/discovery.mjs';
import localizations from '../data/localizations.mjs';

test('放缩合并保留原关系 ID、见证与方向，不增加独立关系类型', async () => {
  const ontology = await testOntology();
  const relations = ontology.raw.relationDescriptions;
  assert.equal(relations.filter((record) => record.kind === 'scaling').length, 25);
  assert.ok(relations.every((record) => !['hardGeneralization', 'specialization'].includes(record.kind)));
  assert.ok(RELATION_KINDS.includes('scaling'));
  assert.ok(!RELATION_KINDS.includes('hardGeneralization'));
  assert.ok(!RELATION_KINDS.includes('specialization'));
  for (const [forwardId, backwardId] of [
    ['rel-manifold-generalization', 'rel-manifold-specialization'],
    ['rel-tensor-generalization', 'rel-tensor-specialization'],
    ['rel-group-generalization-mod', 'rel-group-specialization'],
  ]) {
    const forward = relations.find((record) => record.id === forwardId);
    const backward = relations.find((record) => record.id === backwardId);
    assert.ok(forward && backward, '旧 ID 必须仍可解析');
    assert.equal(forward.from, backward.to);
    assert.equal(forward.to, backward.from);
    assert.equal(forward.witness.ref, backward.witness.ref);
    assert.equal(forward.direction.general, backward.direction.general);
    assert.equal(forward.direction.special, backward.direction.special);
    assert.equal(forward.direction.reading, 'contract');
    assert.equal(backward.direction.reading, 'expand');
  }
  for (const relation of relations.filter((record) => record.kind === 'scaling')) {
    if (relation.scalingMode === 'unresolved') assert.equal(scalingEndpoints(relation), null);
    else assert.ok(scalingEndpoints(relation), relation.id);
  }
});

test('放、缩锥按显式一般/特殊端导航，反向登记不制造对称闭包，未核验旧边不入锥', async () => {
  const ontology = await testOntology();
  const localizer = makeLocalizer(ontology);
  const ids = (kind, nodeId) => localizer.compute(kind, { params: { nodeId } }).V.map((node) => node.id);
  assert.ok(ids('LC10', 'dg:smooth-atlas').includes('manifold:ck-atlas'));
  assert.ok(!ids('LC10', 'manifold:ck-atlas').includes('dg:smooth-atlas'));
  assert.ok(ids('LC11', 'manifold:ck-atlas').includes('dg:smooth-atlas'));
  assert.ok(!ids('LC11', 'dg:smooth-atlas').includes('manifold:ck-atlas'));
  assert.deepEqual(ids('LC10', 'top:sigma-compact'), ['top:sigma-compact']);
  // 张量的跨载体对应保留原证据；反向导航不构造逆函数。
  const cross = ontology.raw.relationDescriptions.find((record) => record.id === 'rel-tensor-generalization');
  const witness = structuredClone(cross.witness);
  ids('LC10', cross.direction.special);
  ids('LC11', cross.direction.general);
  assert.equal(cross.scalingMode, 'cross-carrier');
  assert.deepEqual(cross.witness, witness);
});

test('兼容旧记录只归一关系键，不改原 payload、端点、证据或凭空推定方向', () => {
  for (const kind of ['hardGeneralization', 'specialization']) {
    const old = { id: 'old', kind, from: 'a', to: 'b', witness: { status: 'REF', ref: 'old-proof' } };
    const before = structuredClone(old);
    const next = normalizeScalingRecord(old);
    assert.equal(next.kind, 'scaling');
    assert.equal(next.from, old.from);
    assert.equal(next.to, old.to);
    assert.equal(next.witness, old.witness);
    assert.equal(scalingEndpoints(next), null);
    assert.deepEqual(old, before);
  }
});

test('放缩锥分别计算每个模式，不能把跨载体/实例边接到同载体路径上', () => {
  const edge = (id, general, special, mode) => ({ id, kind: 'scaling', from: general, to: special, direction: { general, special, reading: 'contract' }, scalingMode: mode, witness: { status: 'DEF', type: 'declared' } });
  const relations = [edge('same', 'a', 'b', 'same-carrier'), edge('cross', 'b', 'c', 'cross-carrier'), edge('instance', 'b', 'd', 'instance')];
  const ontology = miniOntology({ nodes: ['a', 'b', 'c', 'd'].map((id) => ({ id })), actions: [] });
  ontology.raw.relationDescriptions = relations;
  ontology.raw.localizations = localizations;
  const localizer = makeLocalizer(ontology);
  const contracted = localizer.compute('LC11', { params: { nodeId: 'a' } });
  assert.deepEqual(contracted.V.map((node) => node.id), ['a', 'b']);
  assert.deepEqual(contracted.scaling.projections.find((item) => item.mode === 'cross-carrier').nodes, ['a']);
  assert.ok(contracted.boundary.some((item) => item.ref === 'cross' && item.kind === 'scaling-mode-boundary'));
  const expanded = localizer.compute('LC10', { params: { nodeId: 'c' } });
  assert.deepEqual(expanded.V.map((node) => node.id), ['c', 'b']);
  assert.ok(!expanded.V.some((node) => node.id === 'a'));
  const explicit = localizer.compute('LC11', { params: { nodeId: 'b', scalingMode: 'cross-carrier' } });
  assert.deepEqual(explicit.V.map((node) => node.id), ['b', 'c']);
  assert.equal(explicit.scaling.projections.length, 1);
  assert.throws(() => localizer.compute('LC10', { params: { nodeId: 'a', scalingMode: 'guess' } }), (error) => error.code === 'BAD_REQUEST');
});

test('同一蕴含的放缩读法共用证据，反向蕴含与不同条件不能被无向去重吞掉', () => {
  const base = { from: { node: 'g' }, to: { node: 's' }, direction: { general: 'g', special: 's' }, goal: { source: 'P_s ⇒ P_g' }, conditions: [] };
  const otherReading = { ...base, from: base.to, to: base.from };
  assert.equal(scalingEvidenceKey(base), scalingEvidenceKey(otherReading));
  const inverseClaim = { ...otherReading, direction: { general: 's', special: 'g' }, goal: { source: 'P_g ⇒ P_s' } };
  assert.notEqual(scalingEvidenceKey(base), scalingEvidenceKey(inverseClaim));
  assert.notEqual(scalingEvidenceKey(base), scalingEvidenceKey({ ...base, conditions: [{ id: 'C', source: 'Q' }] }));
});

test('实际候选枚举保留正反命题及不同条件，反例仅排除精确匹配的一条', () => {
  const forward = { id: 'forward', kind: 'scaling', from: { node: 'g', version: '1' }, to: { node: 's', version: '1' }, direction: { general: 'g', special: 's' }, goal: { source: 'P_s ⇒ P_g' }, conditions: [] };
  const reverse = { ...forward, id: 'reverse', from: forward.to, to: forward.from, direction: { general: 's', special: 'g' }, goal: { source: 'P_g ⇒ P_s' } };
  const conditional = { ...forward, id: 'conditional', conditions: [{ id: 'Q', source: 'Q' }] };
  const enumerate = (RELATIONS) => collectCandidates({ registry: { RELATIONS }, specs: [] }, { kinds: ['scaling'], specs: [] });
  assert.deepEqual(enumerate([forward, reverse, conditional]).candidates.map((item) => item.registeredId), ['forward', 'reverse', 'conditional']);
  const counterexample = { ...reverse, id: 'counterexample', kind: 'counterexampleTo' };
  const filtered = enumerate([forward, reverse, conditional, counterexample]);
  assert.deepEqual(filtered.candidates.map((item) => item.registeredId), ['forward', 'conditional']);
  assert.equal(filtered.warnings.length, 1);
  assert.match(filtered.warnings[0], /reverse/);
});

test('启发式概念配对也枚举两个有序方向，不在登记前丢失反向候选', () => {
  const specs = ['a', 'b'].map((node) => ({ node, nodeVersion: '1', background: 'bg:test/1', declarations: [{ name: 'x', type: 'G', role: 'element' }], assumptions: [], statement: { source: node === 'a' ? 'P(x)' : 'Q(x)' } }));
  const { candidates } = collectCandidates({ specs, registry: { specs }, variables: { x: 'G' } }, { kinds: ['scaling'], specs });
  assert.equal(candidates.length, 2);
  assert.deepEqual(new Set(candidates.map((item) => `${item.direction.special}⇒${item.direction.general}`)), new Set(['a⇒b', 'b⇒a']));
});

test('完整发现与重放保留命题条件；原条件消失时 stale，不替换成同端点另一命题', async () => {
  const forward = { id: 'unconditional', kind: 'scaling', from: { node: 'g', version: '1' }, to: { node: 's', version: '1' }, direction: { general: 'g', special: 's' }, goal: { source: 'P_s ⇒ P_g' }, conditions: [] };
  const conditional = { ...forward, id: 'conditional', conditions: [{ id: 'Q', source: 'Q' }] };
  const registry = { RELATIONS: [forward, conditional] };
  // 无概念 spec，判定如实未决；本测试只验证命题身份，不声称取得证明。
  const run = await discoverRelations({ registry, specs: [], kinds: ['scaling'] });
  assert.equal(run.candidates.length, 2);
  assert.equal(new Set(run.candidates.map((item) => item.id)).size, 2);
  assert.equal(new Set(run.candidates.map((item) => item.inputHash)).size, 2);
  const candidate = run.candidates.find((item) => item.conditions.length === 1);
  const before = structuredClone(candidate);
  const replayed = await replayCandidate({ candidate, registry, kinds: ['scaling'] });
  assert.deepEqual(replayed.candidate.conditions, conditional.conditions);
  assert.equal(replayed.candidate.review, 'pending');
  const removed = await replayCandidate({ candidate, registry: { RELATIONS: [forward] }, kinds: ['scaling'] });
  assert.equal(removed.ok, false);
  assert.equal(removed.candidate.review, 'stale');
  assert.deepEqual(removed.candidate.conditions, conditional.conditions);
  assert.deepEqual(candidate, before);
});
