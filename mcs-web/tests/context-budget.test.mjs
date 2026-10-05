import test from 'node:test';
import assert from 'node:assert/strict';
import { loadOntology } from '../core/ontology.mjs';
import { buildNodeContext, contextBudget, CONTEXT_TIERS } from '../core/context.mjs';
import { McsError, CODES } from '../shared/errors.mjs';
import { errorEnvelope } from '../shared/contracts.mjs';

/**
 * 上下文预算**按节点分档**（2026-10 加，TODO A4-30）。
 *
 * 第三十四轮的边界原文：「桥接契约的 `max_chars` 下限 3000，而部分节点需要一万多字符；
 * 失败信封没有机器可读的「可恢复」字段。」这一套把两件事都钉住：
 *
 * 1. **预算够用**：每个节点都能在它自己那一档的预算内不截断地构建出上下文——
 *    默认 16000 曾经让 15 个节点直接失败（实测最大 22543）；
 * 2. **失败可判**：预算不足时报的是可恢复的失败（`recoverable: true`），
 *    并带上 `minimum_chars` / `tier` / `suggested_chars`，调用方不必猜要加多少。
 */
const ontology = await loadOntology();

test('每个节点都能算出自己的预算档位，且档位与实测需要一致', () => {
  const rows = ontology.raw.nodes.map((node) => ({ id: node.id, ...contextBudget(ontology, node.id) }));
  assert.equal(rows.length, ontology.raw.nodes.length);
  for (const row of rows) {
    assert.ok(Number.isFinite(row.requiredChars) && row.requiredChars > 0, `${row.id} 算不出需要的字符数`);
    assert.ok(CONTEXT_TIERS[row.tier], `${row.id} 的档位未登记：${row.tier}`);
    // 档位必须真的覆盖这个节点：建议预算 ≥ 实测需要。
    assert.ok(row.budgetChars >= row.requiredChars,
      `${row.id} 属 ${row.tier} 档但建议预算 ${row.budgetChars} < 实测需要 ${row.requiredChars}`);
  }
  const tiers = rows.reduce((acc, row) => ({ ...acc, [row.tier]: (acc[row.tier] ?? 0) + 1 }), {});
  const largest = rows.reduce((max, row) => (row.requiredChars > max.requiredChars ? row : max), rows[0]);
  console.log('  · 档位分布', JSON.stringify(tiers), '· 最大节点', largest.id, largest.requiredChars, '字符',
    '· 建议预算', largest.budgetChars);
  // 最大的节点必须落在最高一档——否则档位边界挑错了。
  assert.equal(largest.tier, 'extended', `最大节点 ${largest.id} 落在 ${largest.tier} 档，档位边界需要重算`);
});

test('按档位给预算时，每个节点都能不截断地构建上下文（旧默认 16000 有 15 个失败）', () => {
  const failures = [];
  for (const node of ontology.raw.nodes) {
    const budget = contextBudget(ontology, node.id);
    try {
      const context = buildNodeContext(ontology, node.id, { maxChars: budget.budgetChars });
      if (context.omitted_sections.length > 0) failures.push(`${node.id}（档位内仍截断 ${context.omitted_sections.length} 段）`);
      if (context.context_chars > budget.budgetChars) failures.push(`${node.id} 超出预算`);
    } catch (error) {
      failures.push(`${node.id}：${error.message}`);
    }
  }
  assert.deepEqual(failures, [], '有节点在自己的档位内建不出上下文：' + failures.join('；'));
});

test('预算不足时报可恢复的失败，并给出差额、档位与建议值', () => {
  const biggest = ontology.raw.nodes
    .map((node) => ({ id: node.id, ...contextBudget(ontology, node.id) }))
    .reduce((max, row) => (row.requiredChars > max.requiredChars ? row : max));
  // 给一个明显不够的预算，看失败信封。
  assert.throws(
    () => buildNodeContext(ontology, biggest.id, { maxChars: 3000 }),
    (error) => {
      assert.ok(error instanceof McsError);
      assert.equal(error.code, CODES.EVIDENCE_RESOURCE);
      assert.equal(error.status, 422);
      assert.equal(error.recoverable, true, '预算不足是「换个参数就能过」的失败');
      assert.equal(error.retryable, false, '同一个请求重发不会变好，因此不可重试');
      assert.ok(error.details.minimum_chars > 3000);
      assert.equal(error.details.tier, biggest.tier);
      assert.ok(error.details.suggested_chars >= error.details.minimum_chars);
      // 信封里两个布尔都要在，且与 McsError 上的取值一致。
      const envelope = errorEnvelope(error);
      assert.equal(envelope.error.recoverable, true);
      assert.equal(envelope.error.retryable, false);
      assert.equal(envelope.ok, false);
      return true;
    },
  );
});

test('失败信封的 recoverable 与 retryable 是两件事，且按码逐条给出', () => {
  const samples = [
    [CODES.BAD_REQUEST, true],
    [CODES.EVIDENCE_RESOURCE, true],
    [CODES.UNKNOWN_NODE, true],
    [CODES.TUTOR_UNAVAILABLE, true],
    [CODES.ONTOLOGY_INVALID, false],
    [CODES.INTERNAL, false],
  ];
  for (const [code, expected] of samples) {
    const envelope = errorEnvelope(new McsError(code, 'x', 400));
    assert.equal(envelope.error.recoverable, expected, `${code} 的可恢复判定不对`);
    assert.equal(typeof envelope.error.retryable, 'boolean');
  }
  // 未登记的码不假装知道它能不能救：默认不可恢复。
  assert.equal(errorEnvelope(new McsError('SOMETHING_NEW', 'x')).error.recoverable, false);
  // 非 McsError 的兜底信封也要带这两个字段（否则调用方要分两种形状处理）。
  const fallback = errorEnvelope(new Error('boom'));
  assert.equal(fallback.error.recoverable, false);
  assert.equal(fallback.error.retryable, false);
});
