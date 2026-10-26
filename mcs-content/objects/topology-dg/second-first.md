````mcs-object
{
  "schema": "mcs-object/1",
  "id": "obj:tdg:second-first",
  "version": "1",
  "title": "C₂ ⇒ C₁",
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
        "name": "Countable",
        "type": "Family -> o",
        "background": "族为至多可数，允许有限或空族"
      },
      {
        "name": "Base",
        "type": "Family -> o",
        "background": "族中开集构成整个空间的基：任一开集是其中成员的并"
      },
      {
        "name": "LocalBase",
        "type": "Family -> X -> o",
        "background": "族为点的开邻域基：均含该点，且每个开邻域含其中一员"
      }
    ]
  },
  "definitions": [],
  "assumptions": [],
  "declarations": [
    {
      "id": "claim",
      "kind": "formula",
      "source": "(exists B:Family. Countable(B) ∧ Base(B)) -> (forall x:X. exists B:Family. Countable(B) ∧ LocalBase(B)(x))",
      "status": "PROOF"
    }
  ],
  "references": [
    {
      "id": "obj:tdg:c2",
      "version": "1",
      "anchor": "$",
      "formalHash": "sha256:d16031a145779df19cdb777239b85a36138902c10252e76a52f4ad4806a7fff6"
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
      "target": "MCS.Expected.secondToFirst",
      "mapping": "HOL 固定背景参数的闭包对应 Lean 目标的显式全称量化。Top/Family 等接口按正文定义解释；欧氏 d² 限整个 EuclideanSpace ℝ (Fin n) 上的 C² 实值 k 形式。方向导数目标限实赋范空间上在点 Fréchet 可微。T3 采用 regular+T1；mathlib T3 的 T0+regular 由本条件构造。一般翻译正确性不在本登记范围。",
      "review": "pending"
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
