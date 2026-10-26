````mcs-node
{
  "schema": "mcs-node/1",
  "id": "learn:tdg:direction-frechet",
  "version": "1",
  "title": "可微时 Dᵥf = Df[v]",
  "case": "topology-dg",
  "goals": [
    "说明可微时 Dᵥf = Df[v]的条件、用途和失败边界"
  ],
  "objects": [
    {
      "id": "obj:tdg:direction-frechet",
      "version": "1",
      "anchor": "$",
      "formalHash": "sha256:1e4b64120b32dff5b43435e60d277f37c5c2eafc8ab3fd568f7cbb4e4db8db2f"
    }
  ],
  "prerequisites": [],
  "routes": [
    {
      "id": "route:tdg:direction-frechet:1",
      "title": "Fréchet 全导数 + 方向导数",
      "inputs": [
        {
          "id": "learn:tdg:frechet",
          "version": "1"
        },
        {
          "id": "learn:tdg:directional",
          "version": "1"
        }
      ]
    }
  ]
}
````

# 可微时 Dᵥf = Df[v]

先把条件写全，再问结论是否还能失效。

## 精确内容

把 Fréchet 展开中的 h 取为 tv。余项除以 t 的绝对值趋于0（v固定），故差商极限为 Av；v=0 单独直接计算。

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
