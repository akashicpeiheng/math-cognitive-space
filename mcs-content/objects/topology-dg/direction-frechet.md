````mcs-object
{
  "schema": "mcs-object/1",
  "id": "obj:tdg:direction-frechet",
  "version": "1",
  "title": "可微时 Dᵥf = Df[v]",
  "language": "mcs-formal/1",
  "grammar": "mcs-object-grammar/1",
  "scale": "unit",
  "context": {
    "signature": "signature:topology-dg/1",
    "bases": [
      "o",
      "X",
      "Family",
      "R"
    ],
    "constants": [
      {
        "name": "Differentiable",
        "type": "o",
        "background": "固定 f 在 x 处 Fréchet 可微；不是所有方向导数存在"
      },
      {
        "name": "LineValue",
        "type": "R",
        "background": "固定 f,x,v 的方向导数值"
      },
      {
        "name": "FrechetValue",
        "type": "R",
        "background": "固定 f,x,v 的连续线性微分 Df_x 作用于 v 的值"
      }
    ]
  },
  "definitions": [],
  "assumptions": [],
  "declarations": [
    {
      "id": "claim",
      "kind": "formula",
      "source": "Differentiable -> LineValue = FrechetValue",
      "status": "PROOF"
    }
  ],
  "references": [
    {
      "id": "obj:tdg:frechet",
      "version": "1",
      "anchor": "$",
      "formalHash": "sha256:934df91a6ede7a251bcc88df6b0c48fc4d555aa76117c91c5055931ff128669b"
    },
    {
      "id": "obj:tdg:directional",
      "version": "1",
      "anchor": "$",
      "formalHash": "sha256:8fe36dbd9d35e2958a215f376f8fa99b2b2096a1cd6b3741aa0eed3094e24b45"
    }
  ],
  "members": [],
  "imports": [],
  "exports": [],
  "links": [],
  "lean": [
    {
      "anchor": "claim",
      "registrationId": "lean-topology-dg",
      "target": "MCS.Expected.directionalFderiv",
      "mapping": "HOL 固定背景参数的闭包对应 Lean 目标的显式全称量化。Top/Family 等接口按正文定义解释；欧氏 d² 限整个 EuclideanSpace ℝ (Fin n) 上的 C² 实值 k 形式。方向导数目标限实赋范空间上在点 Fréchet 可微。T3 采用 regular+T1；mathlib T3 的 T0+regular 由本条件构造。一般翻译正确性不在本登记范围。",
      "review": "pending"
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
