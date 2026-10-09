/**
 * 段落级与集合级英文覆盖。
 *
 * ## 覆盖哪些东西
 *
 * 1. `__meta` 下的**单例段落**：`signature`（签名与常元说明）、`theory`（背景理论、公理、
 *    演算）、`environmentBoundary`（环境边界）、`templates` / `aggregates` 之类的说明文本。
 *    这些是「站点的元层内容」，不是某一个节点的字段，所以不走 `en/nodes.mjs`。
 * 2. 集合里那些**没有案例归属**的记录：`coverage`（专稿章节 → 实现入口的覆盖表）、
 *    `templates`（十三种角色模板）、`aggregates`（话题聚合）、`patterns`（误区模式）、
 *    `claims`（形式陈述登记）。
 *
 * ## 为什么先留空
 *
 * 空对象表示「这一块还没翻」，装配层会保留中文并在覆盖率里记为缺口。
 * 编一段占位英文比留中文更糟：读者分不出「本站这么写的」与「还没翻」。
 */

export default {
  __meta: {
    /* 例：
    signature: { note: '…' },
    theory: { title: '…', calculus: '…', note: '…' },
    environmentBoundary: { note: '…' },
    */
  },
};
