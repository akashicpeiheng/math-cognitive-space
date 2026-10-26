````mcs-node
{
  "schema": "mcs-node/1",
  "id": "learn:tdg:second-first",
  "version": "1",
  "title": "C₂ ⇒ C₁",
  "case": "topology-dg",
  "goals": [
    "说明C₂ ⇒ C₁的条件、用途和失败边界"
  ],
  "objects": [
    {
      "id": "obj:tdg:second-first",
      "version": "1",
      "anchor": "$",
      "formalHash": "sha256:7c5c5f8f12445f8c8dda535d043887ced6fa6eb556276979ace0b8a23fb19e06"
    }
  ],
  "prerequisites": [],
  "routes": [
    {
      "id": "route:tdg:second-first:1",
      "title": "第二可数 C₂",
      "inputs": [
        {
          "id": "learn:tdg:c2",
          "version": "1"
        }
      ]
    }
  ]
}
````

# C₂ ⇒ C₁

先把条件写全，再问结论是否还能失效。

## 精确内容

从一份可数拓扑基 B 取出含 x 的成员，仍可数；任意 x 的开邻域包含这样一员，故为 x 的邻域基。

## 依据与边界

PROOF / REF：PROOF 表示附有正文论证；结构检查不替代证明。人工对应审阅 pending。

形式接口中的低层符号由 context.background 逐项规定；类型与摘要检查仅为 FINITE，不把背景解释自动当作证明。

## 参考

- 本案例《迁移验收清单》与关系正文。
- Lee, Introduction to Topological Manifolds, 2nd ed., Springer, 2011（拓扑、流形与可数性；按主题引用，未声称逐页复核）。
- Lee, Introduction to Smooth Manifolds, 2nd ed., Springer, 2013（微分、张量、形式与流；按主题引用）。
- mathlib4 固定版本 d13f23b723b8a846827a245b89c10fc7d3f11612；机器对应与覆盖边界见 mcs-foundations/lean/README.md。

## 怎样读

先用直觉重述本对象，再核对精确条件；阅读完成与掌握确认分开记录。

## 回看问题

指出论证使用每项假设的位置；若省略光滑性、分离性或定义域条件，哪一步失去依据？
