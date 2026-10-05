/**
 * 自动关系发现流程的共享形状（对外出口）。
 *
 * 实现在 `shared/formal-schema.mjs`（零依赖）；这里只做转出，
 * 让调用方有一个稳定的 import 路径。**不在这里放哈希算法**：
 * 规范化表达树的哈希只有一处实现——`core/formal/language.mjs` 的
 * `parseSpec(...).hash`；`data/formal/registry.mjs` 的 `specHash()` 是它的入口
 * （并在语言层不可用时退到源码级，且在响应里如实标明用的是哪一级）。
 */
export {
  FORMAL_SPEC_SCHEMA,
  RELATION_KINDS,
  MATH_JUDGMENTS,
  RUN_STATUSES,
  REVIEW_STATUSES,
  GENERALIZATION_DIRECTION,
  RELATION_KIND_LABELS,
  isRelationKind,
} from './formal-schema.mjs';
