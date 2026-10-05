import test from 'node:test';
import assert from 'node:assert/strict';
import { testOntology, miniOntology } from './helpers.mjs';
import { validateOntologyShape, createOntology } from '../core/ontology.mjs';
import { checkFormation, checkOntologyLegality } from '../core/formation.mjs';
import { parseType, typeToString, checkTerm } from '../core/typecheck.mjs';
import { querySupport, supportIntersection, supportDifference, routeFamilyRequirement } from '../core/support.mjs';
import { composeRelations, inverseRelation, restrictRelation, reachableNodes, subrelationCheck } from '../core/relations.mjs';
import { evidenceSummary, evidenceView, replayCertificate } from '../core/evidence.mjs';
import { claimsIndex, obligationsIndex, notationIndex } from '../core/research.mjs';
import { adapt, adaptWithOntology, deriveExternalState, stageOf } from '../core/adaptation.mjs';

test('公共本体装配、版本哈希与十二坐标', async () => {
  const ontology = await testOntology();
  const stats = ontology.stats();
  // 105 = 背景 9 + limit 16 + manifold 17 + tensor 17 + group 15（四个专稿案例，含方法节点）
  // 7 = dg 概念 30 + 从语料提炼的断言 2 + 误区模式 4 + 方法论 2（第五个案例：微分几何）
  // 注：dg 的误区模式计入 nodes 统计，故 dg 合计 38。
  // 63 = liang 概念 41 + 断言 16 + 方法 3 + 误区模式 3（第六个案例：教材上册凝练路径）
  // 57 = rudin 概念 42 + 断言 13 + 方法 2（第七个案例：Rudin《数学分析原理》；本轮只挂名字、正文留空）
  assert.equal(stats.counts.nodes, 232);
  // 215 → 216：2026-10 给背景侧唯一「既无关系也无契约」的方法节点补了一条引入契约
  // （a-bg:counterexample-method），它是 data/relation-coverage.mjs 里「完全孤立」那一类清零的修法。
  assert.equal(stats.counts.actions, 216);
  assert.equal(stats.counts.localizations, 36);
  assert.equal(stats.counts.templates, 13);
  assert.match(stats.version, /^sha256:[0-9a-f]{64}$/);
  const second = await testOntology();
  assert.equal(second.version, stats.version, '同一数据重复装载必须给出同一版本哈希');
});

test('方法节点：每一条都声明分类（LocalMethod / GlobalMethod）', async () => {
  const ontology = await testOntology();
  const methods = ontology.raw.nodes.filter((node) => node.construct === 'Method');
  assert.ok(methods.length >= 16, `方法节点应 >= 16，实际 ${methods.length}`);
  for (const node of methods) {
    const roles = node.roles ?? [];
    const isLocal = roles.includes('LocalMethod');
    const isGlobal = roles.includes('GlobalMethod');
    assert.ok(isLocal || isGlobal, `${node.id} 既不是 LocalMethod 也不是 GlobalMethod`);
    assert.ok(!(isLocal && isGlobal), `${node.id} 不能同时是局部技巧与全局方法`);
  }
  // 七个案例都要有方法节点，否则「方法类区分」在某个案例里无从体现。
  for (const caseId of ['limit', 'manifold', 'tensor', 'group', 'dg', 'liang', 'rudin']) {
    const count = methods.filter((node) => node.case === caseId).length;
    assert.ok(count >= 2, `${caseId} 案例的方法节点应 >= 2，实际 ${count}`);
  }
});

test('微分几何案例：30 个核心节点全部通过形成检查，且分类计数正确', async () => {
  const ontology = await testOntology();
  const dg = ontology.raw.nodes.filter((node) => node.case === 'dg');
  assert.equal(dg.length, 38, 'dg 案例应为 30 个核心节点 + 2 个断言 + 4 个误区模式 + 2 个方法');
  const byConstruct = {};
  for (const node of dg) byConstruct[node.construct] = (byConstruct[node.construct] ?? 0) + 1;
  assert.equal(byConstruct.MisconceptionPattern, 4);
  assert.equal(byConstruct.Claim, 6, '定理 4 个 + 从语料提炼的断言 2 个');
  assert.equal(byConstruct.Method, 2, '两个从源文件推导步骤提炼的局部方法');
  for (const node of dg) {
    assert.match(node.id, /^dg:[a-z0-9-]+$/, `${node.id} 必须是小写 ASCII 的 dg 前缀 id`);
    const formation = checkFormation(node);
    assert.equal(formation.status, 'well-formed', `${node.id}: ${formation.checks.filter((c) => c.status !== 'passed').map((c) => c.key).join('、')}`);
  }
  // 有源文件的节点必须有正文；误区模式与提炼断言显式声明无内容块。
  const withContent = dg.filter((node) => (node.contentMarkdown ?? '').length > 0);
  assert.ok(withContent.length >= 32, `带正文的 dg 节点应 >= 32（含两个方法），实际 ${withContent.length}`);
});

test('微分几何案例：正文里不残留 wiki 链接，链接都指向可解析的节点', async () => {
  const ontology = await testOntology();
  const dg = ontology.raw.nodes.filter((node) => node.case === 'dg' && (node.contentMarkdown ?? '').length > 0);
  const resolvable = new Set(ontology.raw.nodes.map((node) => node.id));
  let checked = 0;
  for (const node of dg) {
    assert.ok(!node.contentMarkdown.includes('[['), `${node.id} 的正文仍含未转换的 [[wiki 链接]]`);
    for (const match of node.contentMarkdown.matchAll(/\]\(\/nodes\/([^)]+)\)/g)) {
      const id = decodeURIComponent(match[1]);
      assert.ok(resolvable.has(id), `${node.id} 的正文链接指向未知节点：${id}`);
      checked += 1;
    }
  }
  assert.ok(checked > 500, `应转换出大量站内链接，实际 ${checked}`);
});

test('微分几何案例：证据不签发机器认证，全部为正文级记录', async () => {
  const ontology = await testOntology();
  const dgEvidence = ontology.raw.evidence.filter((item) => item.id.startsWith('ev-dg-'));
  // 30 个核心节点 + 4 个误区模式，各自一条正文级证据；外加 2 条方法证据。
  // 2026-10 再加 1 条：反函数 → 隐函数的**推导依赖**证据（ev-dg-inverse-implicit），
  // 它同时列出两端节点，是 `witness.type = 'proof-dependency'` 那种关系的可核依据。
  assert.equal(dgEvidence.length, 37, '每个 dg 节点一条正文级证据，方法另计，推导依赖另加一条');
  for (const record of dgEvidence) {
    assert.equal(record.kind, 'prose-proof');
    assert.equal(record.checkStatus, 'not_run', '语料没有机器证书，不得声称已核验');
    assert.equal(record.certificate, undefined);
    assert.ok(record.obligations.some((text) => text.includes('ND 证书')), '必须写明未编码的义务');
  }
});

test('方法节点的证据只声明「步骤与正文一致」，不把方法说成定理', async () => {
  const ontology = await testOntology();
  // 背景方法（bg:misc:counterexample-method）不属于任何专稿案例，它的证据在背景域里给，
  // 因此这里只核对五个案例内的方法节点。
  const methods = ontology.raw.nodes.filter((node) => node.construct === 'Method' && node.case !== 'background');
  const methodIds = new Set(methods.map((node) => node.id));

  /*
   * 只核对**以该方法为主体**的证据记录，即它排在 `nodes` 首位的那种。
   *
   * 为什么不能扫「nodes 里出现过方法 id」的全部记录：`ev-group-abstract` 的主体是
   * 「三入口抽象共同公理」这个断言（PROOF 名副其实），方法节点只是它顺带提到的对象。
   * 把这类记录算成「方法证据」会得出错误结论。
   */
  const ownRecords = ontology.raw.evidence.filter((item) => methodIds.has((item.nodes ?? [])[0]));
  const covered = new Set(ownRecords.map((item) => item.nodes[0]));
  const missing = methods.filter((node) => !covered.has(node.id)).map((node) => node.id);
  assert.deepEqual(missing, [], `以下方法节点没有以自己为主体的证据：${missing.join('、')}`);

  for (const record of ownRecords) {
    // 方法不是命题：证据等级不得写成 PROOF。
    assert.notEqual(record.status, 'PROOF', `${record.id} 把方法证据写成了 PROOF`);
    assert.ok(['DEF', 'ILLUSTRATION'].includes(record.status), `${record.id} 的方法证据等级应为 DEF 或 ILLUSTRATION，实际 ${record.status}`);
    assert.equal(record.checkStatus, 'not_run');
    assert.ok(record.obligations.some((text) => text.includes('ND 证书')), `${record.id} 必须写明未编码的义务`);
  }
});

test('十四种构造的形成检查全部通过，合法本体条件通过', async () => {
  const ontology = await testOntology();
  for (const node of ontology.raw.nodes) {
    const formation = checkFormation(node);
    assert.equal(formation.status, 'well-formed', `${node.id}: ${formation.checks.filter((check) => check.status !== 'passed').map((check) => check.detail).join('；')}`);
  }
  const legality = checkOntologyLegality(ontology.raw);
  assert.equal(legality.status, 'passed', JSON.stringify(legality.conditions.filter((item) => item.status !== 'passed')));
});

test('Claim 角色不能标注到其他构造类型', async () => {
  const ontology = await testOntology();
  const raw = structuredClone(ontology.raw);
  raw.nodes[0].roles = ['Theorem'];
  raw.nodes[0].construct = 'Concept';
  assert.throws(() => createOntology(raw, { validate: true }), (error) => {
    assert.equal(error.code, 'ONTOLOGY_INVALID');
    assert.ok(error.details.problems.some((problem) => problem.includes('角色 Theorem 只能标注在 Claim 上')));
    return true;
  });
});

test('Unknown 不变空集；Known 与部分界分开', async () => {
  const ontology = await testOntology();
  const unknown = querySupport(ontology, 'limit:limit-ed', 'proof');
  assert.equal(unknown.status, 'Unknown');
  assert.equal(unknown.set, undefined);
  assert.ok(unknown.reason.length > 0);
  const known = querySupport(ontology, 'limit:bridge', 'proof');
  assert.equal(known.status, 'Known');
  assert.ok(known.set.includes('limit:limit-ed'));
  const intersection = supportIntersection(ontology, 'limit:limit-ed', 'limit:seq-conv', 'expression');
  assert.equal(intersection.status, 'Known');
  assert.ok(intersection.set.includes('bg:real:metric'));
  const difference = supportDifference(ontology, 'limit:limit-ed', 'limit:seq-conv', 'expression');
  assert.equal(difference.status, 'Known');
  assert.equal(difference.minimal, false);
  const emptyFamily = routeFamilyRequirement([], ['limit:bridge'], { complete: false });
  assert.equal(emptyFamily.status, 'Unknown');
  assert.equal(emptyFamily.set.length, 0);
});

test('有限类型解析与 λ 项检查', () => {
  const type = parseType('(i -> o) -> o');
  assert.equal(typeToString(type), '(i -> o) -> o');
  const identity = checkTerm({ lam: { name: 'x', type: 'i', body: { var: 'x' } } });
  assert.equal(typeToString(identity), 'i -> i');
  const application = checkTerm({ app: { fn: { const: 'f' }, arg: { var: 'x' } } }, { f: 'i -> o', x: 'i' });
  assert.equal(typeToString(application), 'o');
  assert.throws(() => checkTerm({ app: { fn: { const: 'f' }, arg: { const: 'x' } } }, { f: 'i -> o', x: 'o' }));
  assert.throws(() => parseType('i -> -> o'));
});

test('关系代数：复合、逆、限制、闭包与包含见证', async () => {
  const ontology = await testOntology();
  const bridge = ontology.raw.relationDescriptions.find((relation) => relation.id === 'rel-limit-bridge');
  const inverse = inverseRelation(bridge);
  assert.equal(inverse.from, bridge.to);
  assert.equal(inverse.to, bridge.from);
  const synthetic = { id: 'rel-test', kind: 'test', from: bridge.to, to: 'limit:continuous', witness: { type: 'test', status: 'DEF' } };
  const composed = composeRelations([bridge], [synthetic]);
  assert.equal(composed.length, 1);
  assert.equal(composed[0].from, bridge.from);
  assert.equal(composed[0].to, synthetic.to);
  const restricted = restrictRelation(bridge, new Set([bridge.from]), new Set(['not-there']));
  assert.equal(restricted, null);
  const reachable = reachableNodes(ontology, [{ node: 'bg:real:metric', provides: ['statement'] }, { node: 'bg:logic:quantifier', provides: ['statement'] }]);
  assert.ok(reachable.available.includes('limit:limit-ed'));
  const disabled = reachableNodes(ontology, [{ node: 'bg:real:metric', provides: ['statement'] }, { node: 'bg:logic:quantifier', provides: ['statement'] }], { disabledNodes: ['bg:logic:quantifier'] });
  assert.ok(!disabled.available.includes('limit:limit-ed'));
  assert.equal(subrelationCheck({ witness: { type: 'declared', status: 'DEF' } }, {}).status, 'unverified');
  assert.equal(subrelationCheck({ witness: { type: 'inclusion', status: 'PROOF' } }, {}).status, 'certified');
});

test('证据索引：四份机器证书、检查状态与开放假设分开呈现', async () => {
  const ontology = await testOntology();
  const summary = evidenceSummary(ontology);
  assert.equal(summary.machineCertificates.length, 4);
  for (const record of ontology.raw.evidence.filter((item) => item.kind === 'machine-certificate')) {
    const view = evidenceView(record);
    assert.equal(view.checkerVerified, false);
    assert.ok(view.certificate.includes('mcs-foundations/validation/certification/certificates/'));
    assert.equal(record.checkStatus, 'passed');
  }
  assert.ok(summary.byKind['prose-proof'] >= 4);
  assert.ok(summary.byStatus[ 'NOT-CLAIMED' ] >= 4);
});

test('研究索引：断言、义务与记号覆盖', async () => {
  const ontology = await testOntology();
  const claims = claimsIndex(ontology);
  assert.ok(claims.length >= 10);
  assert.ok(claims.every((claim) => claim.evidence.length > 0));
  const obligations = obligationsIndex(ontology);
  assert.ok(obligations.length >= 10);
  assert.ok(obligations.some((item) => item.obligation.includes('机器编码')));
  const notation = notationIndex(ontology);
  assert.ok(notation.baseTypes.length >= 10);
  assert.ok(notation.constants.some((item) => item.name === 'd'));
});

test('教学正文：关键节点含公式与边界，未登记正文的节点保持为空', async () => {
  const ontology = await testOntology();
  const bridge = ontology.node('limit:bridge');
  assert.ok(bridge.contentMarkdown.includes('\\(') || bridge.contentMarkdown.includes('$'));
  assert.ok(bridge.contentMarkdown.includes('量词'));
  const background = ontology.node('bg:real:metric');
  assert.equal(background.contentMarkdown, '');
  for (const node of ontology.raw.nodes) {
    if (node.contentRef && node.contentRef !== false) assert.ok(node.contentMarkdown.length > 0, node.id);
  }
});

// ---- 学习闭环：已读与已确认必须严格分开 ----

test('view 事件产生 θ.viewed，但绝不进入 θ.known', async () => {
  const ontology = await testOntology();
  const profile = {
    id: 'p-view',
    revision: 1,
    modelVersion: 'mcs-manual-model/1',
    events: [
      { eventId: 'e1', kind: 'view', nodeId: 'limit:limit-ed', occurredAt: '2026-01-01T00:00:00.000Z', payload: { context: 'read' } },
    ],
  };
  const theta = adapt(ontology, profile);
  assert.equal(theta.known.length, 0, '已读不能被当成已知');
  assert.equal(theta.unknown.length, 0);
  assert.equal(theta.viewed.length, 1);
  assert.equal(theta.viewed[0].node, 'limit:limit-ed');
  assert.equal(theta.viewed[0].reviewCount, 0);
  // 已读是「读过」这一条轴，未指定是「没有对可用性表态」这一条轴；两者彼此独立。
  // 读过但没有确认过的节点仍然算未指定，否则会把「读过」偷偷当成一种掌握声明。
  assert.ok(theta.unspecified.includes('limit:limit-ed'));
});

test('复习计数只统计 context=review 的 view 事件；已读不改变 θ.known', async () => {
  const ontology = await testOntology();
  const profile = {
    id: 'p-review',
    revision: 1,
    events: [
      { eventId: 'e1', kind: 'view', nodeId: 'limit:bridge', occurredAt: '2026-01-01T00:00:00.000Z', payload: { context: 'read' } },
      { eventId: 'e2', kind: 'view', nodeId: 'limit:bridge', occurredAt: '2026-01-02T00:00:00.000Z', payload: { context: 'review' } },
      { eventId: 'e3', kind: 'view', nodeId: 'limit:bridge', occurredAt: '2026-01-03T00:00:00.000Z', payload: { context: 'review' } },
    ],
  };
  const theta = adapt(ontology, profile);
  assert.equal(theta.viewed.length, 1);
  assert.equal(theta.viewed[0].reviewCount, 2);
  assert.equal(theta.known.length, 0, '复习过也不等于已掌握');
});

test('已读与「尚未确认」可以共存，得到「已读但没懂」', async () => {
  const ontology = await testOntology();
  const profile = {
    id: 'p-both',
    revision: 1,
    events: [
      { eventId: 'e1', kind: 'view', nodeId: 'limit:bridge', occurredAt: '2026-01-01T00:00:00.000Z', payload: { context: 'read' } },
      { eventId: 'e2', kind: 'confirmation', nodeId: 'limit:bridge', occurredAt: '2026-01-02T00:00:00.000Z', payload: { confirmed: false, reason: '还不懂' } },
    ],
  };
  const theta = adapt(ontology, profile);
  assert.equal(theta.viewed.length, 1);
  assert.equal(theta.unknown.length, 1);
  assert.equal(theta.known.length, 0);
});

test('已读节点在当前版本本体无法解析时进入 boundary，而不是被静默丢弃', async () => {
  const ontology = await testOntology();
  const profile = {
    id: 'p-dangling',
    revision: 1,
    events: [
      { eventId: 'e1', kind: 'view', nodeId: 'limit:已删除的节点', occurredAt: '2026-01-01T00:00:00.000Z', payload: { context: 'read' } },
    ],
  };
  const theta = adapt(ontology, profile);
  assert.equal(theta.viewed.length, 1);
  assert.equal(theta.viewed[0].unresolved, true);
});

test('adaptWithOntology 只把显式确认当作规划背景', async () => {
  const ontology = await testOntology();
  const profile = {
    id: 'p-bg',
    revision: 1,
    events: [
      { eventId: 'e1', kind: 'view', nodeId: 'bg:real:metric', occurredAt: '2026-01-01T00:00:00.000Z', payload: { context: 'read' } },
      { eventId: 'e2', kind: 'confirmation', nodeId: 'bg:logic:quantifier', occurredAt: '2026-01-02T00:00:00.000Z', payload: { confirmed: true } },
    ],
  };
  const { background } = adaptWithOntology(ontology, profile);
  assert.equal(background.length, 1);
  assert.equal(background[0].node, 'bg:logic:quantifier');
  assert.equal(background[0].kind, 'confirmed');
});

/*
 * 发布前回归（2026-10）：检查器「没跑起来」绝不能报成「通过」。
 *
 * 复现的是真实缺陷：从前 `exitCode` 在 `error.code` 是字符串（ENOENT/EACCES）时
 * 缺省成 0，而 0 映射 `passed`。于是本机没装 python 时，证书重放会显示成功——
 * 这是把环境故障伪装成数学结论，最坏的一类伪通过。
 */
test('证书重放：检查器无法启动时报环境故障，不得伪报通过', async () => {
  const ontology = await testOntology();
  const record = ontology.raw.evidence.find((entry) => entry.kind === 'machine-certificate');
  assert.ok(record, '本体里应当存在至少一份机器证书');
  await assert.rejects(
    () => replayCertificate(record, { python: 'mcs-preflight-missing-python-binary' }),
    (error) => {
      assert.equal(error.code, 'EVIDENCE_UNSUPPORTED');
      return true;
    },
  );
});

test('证书重放：检查器与证书都在时给出真实判定并标明检查器未获形式验证', async () => {
  const ontology = await testOntology();
  const record = ontology.raw.evidence.find((entry) => entry.kind === 'machine-certificate');
  const result = await replayCertificate(record);
  assert.equal(result.status, 'passed');
  assert.equal(result.ran, true);
  assert.equal(result.checkerVerified, false);
});
