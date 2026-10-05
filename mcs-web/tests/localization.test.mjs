import test from 'node:test';
import assert from 'node:assert/strict';
import { testOntology } from './helpers.mjs';
import { makeLocalizer } from '../core/localization.mjs';
import { LOCALIZATION_CASES, TEST_PROFILE, runAllLocalizations } from './localization-cases.mjs';

test('LC01–LC36 全部登记且 ID 唯一、族覆盖完整', async () => {
  const ontology = await testOntology();
  const ids = ontology.raw.localizations.map((item) => item.id);
  assert.equal(ids.length, 36);
  assert.equal(new Set(ids).size, 36);
  const families = new Set(ontology.raw.localizations.map((item) => item.family));
  for (const family of ['logical', 'structural', 'problem', 'cognitive', 'comparison', 'hierarchy', 'resource']) {
    assert.ok(families.has(family), family);
  }
  for (const item of ontology.raw.localizations) {
    assert.ok(item.definition.length > 10, item.id);
    assert.ok(item.boundary.length > 5, item.id);
  }
});

test('每个算子都能运行并返回 Loc_λ(M) 的四个分量', async () => {
  const ontology = await testOntology();
  const localizer = makeLocalizer(ontology);
  const results = runAllLocalizations(localizer);
  assert.equal(results.length, 36);
  const statuses = {};
  for (const { id, result } of results) {
    assert.equal(result.id, id);
    assert.ok(Array.isArray(result.V), id);
    assert.ok(Array.isArray(result.boundary), id);
    assert.ok(result.tau && typeof result.tau === 'object', id);
    assert.ok(Array.isArray(result.pres) && result.pres.length > 0, id);
    assert.equal(result.meta.ontologyVersion, ontology.version);
    assert.ok(['computed', 'unknown', 'unsupported'].includes(result.status), `${id}: ${result.status}`);
    statuses[result.status] = (statuses[result.status] ?? 0) + 1;
  }
  assert.ok(statuses.computed >= 25, JSON.stringify(statuses));
  assert.equal(statuses.unsupported, 2, 'LC16 与 LC23 因缺少登记数据返回 unsupported');
});

test('缺少必需参数时明确拒绝，而不是猜测', async () => {
  const ontology = await testOntology();
  const localizer = makeLocalizer(ontology);
  assert.throws(() => localizer.compute('LC07', { params: {} }), (error) => error.code === 'BAD_REQUEST');
  assert.throws(() => localizer.compute('LC25', { params: {} }), (error) => error.code === 'BAD_REQUEST');
  assert.throws(() => localizer.compute('LC99', { params: {} }), (error) => error.code === 'UNKNOWN_LOCALIZATION');
});

test('缺少适配参数包 θ 的认知算子返回 unsupported，不伪造掌握', async () => {
  const ontology = await testOntology();
  const localizer = makeLocalizer(ontology);
  const lc20 = localizer.compute('LC20', { params: {} });
  assert.equal(lc20.status, 'unsupported');
  assert.ok(lc20.reason.includes('θ'));
  const lc24 = localizer.compute('LC24', { params: { goalId: 'limit:bridge' } });
  assert.equal(lc24.status, 'unsupported');
});

test('LC28 严格禁用语义能识别阻塞目标的禁用项', async () => {
  const ontology = await testOntology();
  const localizer = makeLocalizer(ontology);
  const result = localizer.compute('LC28', { params: LOCALIZATION_CASES.LC28 });
  assert.equal(result.status, 'computed');
  assert.ok(result.V.some((item) => item.id === 'limit:bridge'));
  assert.ok(result.pres[0].note.includes('禁用'));
});

test('LC14 通过反例锚点定位 Christoffel 反例', async () => {
  const ontology = await testOntology();
  const localizer = makeLocalizer(ontology);
  const result = localizer.compute('LC14', { params: { nodeId: 'tensor:basis-law' } });
  assert.equal(result.status, 'computed');
  assert.ok(result.V.some((item) => item.id === 'tensor:non-tensor-gamma'));
});

test('LC36 把 Unknown 支持与未完成证明放在未决区', async () => {
  const ontology = await testOntology();
  const localizer = makeLocalizer(ontology);
  const result = localizer.compute('LC36', { params: {} });
  assert.equal(result.status, 'computed');
  assert.ok(result.boundary.length > 0);
  assert.ok(result.V.some((item) => item.id === 'limit:limit-ed'));
});

test('LC19–LC22 使用显式 θ，不在算子内部读取个人档案', async () => {
  const ontology = await testOntology();
  const localizer = makeLocalizer(ontology);
  const lc19 = localizer.compute('LC19', { params: {}, profile: TEST_PROFILE });
  assert.equal(lc19.status, 'computed');
  assert.ok(Object.keys(lc19.tau).length >= 1);
  const lc21 = localizer.compute('LC21', { params: {}, profile: TEST_PROFILE });
  assert.equal(lc21.status, 'computed');
  assert.ok(lc21.V.some((item) => item.id === 'limit:constant-seq'));
  const lc22 = localizer.compute('LC22', { params: { nodeId: 'limit:limit-ed', allowed: ['formula'] } });
  assert.equal(lc22.status, 'computed');
});
