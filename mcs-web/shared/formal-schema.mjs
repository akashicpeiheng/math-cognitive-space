/**
 * 自动关系发现流程的共享类型（运行时）。
 *
 * 这个文件**故意很小且没有依赖**：它是 `shared/` 与 `core/formal/` 两边都引用的
 * 词表与形状常量，谁 import 它都不会带出别的模块（共享层不该依赖内核层，
 * 否则「共享」就变成了「内核的别名」）。
 *
 * 哈希口径**不在这里**：规范化表达树的哈希只有一处实现——
 * `core/formal/language.mjs` 的 `parseSpec(...).hash`。两份算法就是两个事实。
 */

export const FORMAL_SPEC_SCHEMA = 'mcs-formal-spec/1';

export const RELATION_KINDS = Object.freeze([
  'definitionReference',
  'scaling',
  'equivalentTo',
  'conditionalDerivation',
  'instanceOf',
  'counterexampleTo',
]);

export const MATH_JUDGMENTS = Object.freeze(['verified', 'refuted', 'undecided']);

export const RUN_STATUSES = Object.freeze([
  'completed', 'timeout', 'unsupported', 'check_failed', 'error', 'cancelled',
]);

export const REVIEW_STATUSES = Object.freeze([
  'pending', 'accepted', 'dismissed', 'published', 'stale',
]);

/**
 * `scaling` 的方向约定（规格 §2.11）。
 *
 * 自动发现的同载体记录中 `from` 是**一般概念**、`to` 是**特殊概念**（缩读法）；证据证明的是 `特殊 ⇒ 一般`。
 * 同一命题的放读法不产生第二份证据；逆命题仍须独立证明——所以这个常量存在的意义是：
 * **读的人不必猜方向**。
 */
export const SCALING_DIRECTION = Object.freeze({
  from: 'general',
  to: 'special',
  reading: 'contract',
  evidence: 'special-implies-general',
});

// 旧调用方的常量导出兼容；它不是第二种关系。
export const GENERALIZATION_DIRECTION = SCALING_DIRECTION;

export const RELATION_KIND_LABELS = Object.freeze({
  definitionReference: '定义引用',
  scaling: '放缩',
  equivalentTo: '等价表达',
  conditionalDerivation: '条件推导',
  instanceOf: '有限实例',
  counterexampleTo: '反例',
});

export function isRelationKind(value) {
  return RELATION_KINDS.includes(value);
}
