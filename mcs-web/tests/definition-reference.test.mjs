/**
 * 定义引用的可信性：**局部变量不得生成跨节点依赖**。
 *
 * 这一组断言来自 2026-10-04 验收反馈的 P1-1。当时的问题不是"实现有点松"，
 * 而是**假引用会被认证**：两个互不相关的节点各声明 `x : G` 与 `x : R`，
 * 系统判它们互相引用且返回 `proved`；本站数据里「群」与「阿贝尔群」
 * 只因共享局部参数名 `mul0` 就被认证成"群的定义引用阿贝尔群"。
 *
 * 那一类的共同根因是：**把"名字在正文里出现过"当成"引入了符号"**。
 * 所以这组测试的写法也照着这个来——既测"假的必须不成立"，也测"真的必须仍成立"，
 * 而且**两条都用同一份数据**：只测一边的实现可以靠"一律拒绝"蒙混过去。
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeJudge } from '../core/formal/judges/definition-reference.mjs';
import * as registry from '../data/formal/registry.mjs';

const judge = makeJudge('definitionReference', { registry });

/** 造一条最小 spec：只有声明与陈述，够本用例用。 */
function spec(node, declarations, statement, extra = {}) {
  return {
    specVersion: 'mcs-formal/1', node, nodeVersion: '1',
    background: extra.background ?? 'bg:group/1', theoryVersion: '1',
    declarations, definitions: extra.definitions ?? [], assumptions: [], claims: [],
    statement: { source: statement, kind: 'formula' },
    references: [], boundary: [], source: 'tests/definition-reference.test.mjs',
  };
}

test('两个互不相关的节点各声明同名参数（类型还不同）→ 不产生任何跨节点候选', () => {
  const alpha = spec('probe:alpha', [{ name: 'x', type: 'G', role: 'object' }], 'x = x');
  const beta = spec('probe:beta', [{ name: 'x', type: 'R', role: 'object' }], 'x = x');
  const ctx = { registry, specs: [alpha, beta] };

  const candidates = judge.candidates(alpha, ctx);
  assert.equal(candidates.length, 0, `局部参数不得生成候选；实际产生 ${candidates.length} 条：${JSON.stringify(candidates.map((c) => [c.from?.node, c.to?.node, c.symbol]))}`);

  // 反向也一样：两边都不能"引用"对方。
  assert.equal(judge.candidates(beta, ctx).length, 0, '反向同样不得产生候选');
});

test('在线数据核查：正文里出现别的节点的局部参数名，不构成定义引用', () => {
  /*
   * 这是本站真实数据的复现：`group:group-concept` 与 `concept:group:abelian`
   * 的声明逐字相同（`mul0` / `e0` / `inv0`），因为它们是同一套参数下的两个概念。
   * "参数同名"是**有意复用**，不是依赖——早先的实现把它认证成了定义引用。
   */
  const groupConcept = registry.specs.find((item) => item.node === 'group:group-concept');
  assert.ok(groupConcept, '登记表里应当有 group:group-concept');
  const ctx = { registry, specs: [...registry.specs, ...(registry.CONCEPT_SPECS ?? [])] };

  const toAbelian = judge.candidates(groupConcept, ctx)
    .filter((item) => String(item.to?.node ?? '').includes('abelian'));
  assert.equal(toAbelian.length, 0, `「群」不得因共享参数名而指向「阿贝尔群」；实际 ${JSON.stringify(toAbelian.map((c) => c.symbol))}`);
});

test('判定器只认「引入登记」：没有引入登记时，真引用如实报未决而不是猜', () => {
  const consumer = spec('probe:consumer', [], 'left_mul(mul)(g0) = left_mul(mul)(h0)');
  /*
   * 刻意用一份**没有 `PROVIDES`** 的登记：这时"名字在正文里出现过"是唯一可得的信息，
   * 而它不足以断言跨节点依赖——所以候选应当为空、或即使存在也不得判 `proved`。
   */
  const bareRegistry = { specs: [consumer], BACKGROUND_REFERENCES: [] };
  const ctx = { registry: bareRegistry, specs: [consumer] };

  const candidates = judge.candidates(consumer, ctx);
  assert.equal(candidates.length, 0, `没有引入登记时不得凭名字生成候选；实际 ${JSON.stringify(candidates.map((c) => c.symbol))}`);
  for (const candidate of candidates) {
    assert.notEqual(judge.confirm(candidate, ctx).status, 'proved', `没有引入登记时不得判 proved；${candidate.symbol}`);
  }
});

test('引入登记就位后：真引用必须成立，且证据指向具体的登记条目', () => {
  /*
   * 用一份**显式的**引入登记（形状与 `PROVIDES` 相同）验证正向路径。
   * 这条断言的意义：修完 P1-1 之后，定义引用**不能变成"一律拒绝"**——
   * 那样虽然不会认证错的，但也永远不认证对的，等于这类关系不存在。
   * 所以"假的不成立"与"真的仍成立"必须同时成立，而且用同一份实现。
   */
  const provides = [
    { node: 'group:left-mul', symbol: 'left_mul', type: '(G -> G -> G) -> G -> G -> G', version: '1', background: 'bg:group/1' },
  ];
  const consumer = spec('group:claim-injective', [{ name: 'g0', type: 'G', role: 'object' }, { name: 'h0', type: 'G', role: 'object' }],
    'left_mul(mul)(g0) = left_mul(mul)(h0)');
  const ctx = { registry, specs: [consumer], provides };

  const candidates = judge.candidates(consumer, ctx);
  const hit = candidates.find((item) => item.symbol === 'left_mul');
  assert.ok(hit, `有引入登记时应当产生 left_mul 的候选；实际 ${JSON.stringify(candidates.map((c) => c.symbol))}`);
  assert.equal(hit.to?.node, 'group:left-mul');

  const verdict = judge.confirm(hit, ctx);
  assert.equal(verdict.status, 'proved', `真引用必须成立：${verdict.reason}`);
  // 证据要能回答"成立在哪一条登记上"，而不是一句"已核"。
  assert.equal(verdict.checkedBy, 'PROVIDES');
  assert.equal(verdict.provider?.node, 'group:left-mul');
  assert.equal(verdict.provider?.type, '(G -> G -> G) -> G -> G -> G');
});

test('四道核对逐条生效：引用自己 / 局部名字 / 未知符号 / 类型不符 都不成立', () => {
  const provides = [{ node: 'group:left-mul', symbol: 'left_mul', type: '(G -> G -> G) -> G -> G -> G' }];
  const ctx = { registry, specs: [], provides };

  // ① 引用自己
  const self = { kind: 'definitionReference', from: { node: 'group:left-mul', version: '1' }, to: { node: 'group:left-mul', version: '1' }, symbol: 'left_mul' };
  assert.notEqual(judge.confirm(self, ctx).status, 'proved', '不得认证引用自己');

  // ② 局部名字：提供方确实引入了这个符号，但**消费者自己也声明了它** → 是自用，不是依赖
  const shadow = spec('probe:shadow', [{ name: 'left_mul', type: '(G -> G -> G) -> G -> G -> G', role: 'function' }], 'left_mul(mul)(g0) = g0');
  const shadowCtx = { registry, specs: [shadow], provides };
  const shadowCandidate = { kind: 'definitionReference', from: { node: 'probe:shadow', version: '1' }, to: { node: 'group:left-mul', version: '1' }, symbol: 'left_mul' };
  const shadowVerdict = judge.confirm(shadowCandidate, shadowCtx);
  assert.notEqual(shadowVerdict.status, 'proved', '消费者的局部声明遮蔽了同名符号时，不得算作对外依赖');
  assert.match(String(shadowVerdict.reason), /局部/, `理由应当点明"局部声明"：${shadowVerdict.reason}`);

  // ③ 没人引入过的符号
  const unknown = { kind: 'definitionReference', from: { node: 'probe:x', version: '1' }, to: { node: 'group:left-mul', version: '1' }, symbol: 'nobody_provides_this' };
  assert.notEqual(judge.confirm(unknown, ctx).status, 'proved', '没人引入过的符号不得成立');

  // ④ 类型不符
  const mismatch = { kind: 'definitionReference', from: { node: 'probe:y', version: '1' }, to: { node: 'group:left-mul', version: '1' }, symbol: 'left_mul', symbolType: 'G' };
  const mismatchVerdict = judge.confirm(mismatch, ctx);
  assert.notEqual(mismatchVerdict.status, 'proved', '类型不符不得成立');
  assert.match(String(mismatchVerdict.reason), /类型/, `理由应当点明类型：${mismatchVerdict.reason}`);
});

test('版本三处都要对得上：候选自己记的对端版本过期，也必须报 stale-reference', () => {
  /*
   * 这条来自 versioning 的审查：早先只比了「引入登记的版本」与「引入方当前版本」，
   * **漏了候选自己记的 `to.version`**。后果是"当时的快照"在重放时即使对端已经改版，
   * 只要登记与当前恰好相等就会被判成立——证据没有随条件行走。
   */
  const provides = [{ node: 'group:left-mul', symbol: 'left_mul', type: '(G -> G -> G) -> G -> G -> G', version: '1' }];
  const consumer = spec('group:claim-injective', [], 'left_mul(mul)(g0) = g0');
  const ctx = { registry, specs: [consumer], provides };

  // 候选记的对端版本是 2，而登记与当前都是 1 → 过期
  const staleCandidate = { kind: 'definitionReference', from: { node: 'group:claim-injective', version: '1' }, to: { node: 'group:left-mul', version: '2' }, symbol: 'left_mul' };
  const verdict = judge.confirm(staleCandidate, ctx);
  assert.equal(verdict.status, 'unsupported', `候选记的对端版本过期时必须报 stale-reference；实际 ${verdict.status}：${verdict.reason}`);
  assert.match(String(verdict.reason), /stale-reference|版本/, `理由要点明版本问题：${verdict.reason}`);

  // 版本一致时仍然成立（不能因为加了这道核对就一律拒绝）
  const freshCandidate = { ...staleCandidate, to: { node: 'group:left-mul', version: '1' } };
  assert.equal(judge.confirm(freshCandidate, ctx).status, 'proved', '版本一致时真引用仍须成立');
});

test('「用到」不等于「引入」：BACKGROUND_REFERENCES 不得被当成引入登记', () => {
  /*
   * 这条是防止回归的**结构性**断言：`BACKGROUND_REFERENCES` 里 `left_mul` 有多个节点，
   * 如果哪天有人又把它接进 `providerIndex`，`left_mul` 会立刻变成 ambiguous，
   * 这个用例会红并指出原因。
   */
  const references = registry.BACKGROUND_REFERENCES ?? [];
  const leftMulNodes = [...new Set(references.filter((item) => item.symbol === 'left_mul').map((item) => item.node))];
  assert.ok(leftMulNodes.length > 1, '前提：BACKGROUND_REFERENCES 里 left_mul 确实被多个节点"用到"（这是它不能当引入登记的原因）');

  const consumer = spec('probe:z', [], 'left_mul(mul)(g0) = g0');
  /*
   * 刻意只把"用到"的登记传进去、**不传 `PROVIDES`**，并给一份没有 `PROVIDES` 的登记对象：
   * 若哪天有人把 `BACKGROUND_REFERENCES` 接进 `providerIndex`，`left_mul` 会立刻变成
   * ambiguous（它被 4 个节点"用到"），这个用例就会红并指出原因。
   */
  const bareRegistry = { specs: [consumer], BACKGROUND_REFERENCES: references };
  const ctx = { registry: bareRegistry, specs: [consumer], backgroundReferences: references };
  assert.equal(judge.candidates(consumer, ctx).length, 0, '只给"用到"的登记时，不得产生定义引用候选');
});
