````mcs-object
{
  "schema": "mcs-object/1",
  "id": "obj:tdg:compact-para",
  "version": "1",
  "title": "紧 ⇒ 仿紧",
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
        "name": "OpenCover",
        "type": "Family -> o",
        "background": "族由开集组成且并为全空间"
      },
      {
        "name": "FiniteSubcover",
        "type": "Family -> o",
        "background": "该覆盖存在有限子覆盖"
      },
      {
        "name": "LocallyFiniteRefinement",
        "type": "Family -> o",
        "background": "覆盖存在局部有限的开加细覆盖"
      }
    ]
  },
  "definitions": [],
  "assumptions": [],
  "declarations": [
    {
      "id": "claim",
      "kind": "formula",
      "source": "(forall C:Family. OpenCover(C) -> FiniteSubcover(C)) -> (forall C:Family. OpenCover(C) -> LocallyFiniteRefinement(C))",
      "status": "PROOF"
    }
  ],
  "references": [
    {
      "id": "obj:tdg:compact",
      "version": "1",
      "anchor": "$",
      "formalHash": "sha256:605899be31df7572449f260cc1f1ed6773f73a5eebc93cfd8a0a5b8acf08cabd"
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
      "target": "MCS.Expected.compactToParacompact",
      "mapping": "HOL 固定背景参数的闭包对应 Lean 目标的显式全称量化。Top/Family 等接口按正文定义解释；欧氏 d² 限整个 EuclideanSpace ℝ (Fin n) 上的 C² 实值 k 形式。方向导数目标限实赋范空间上在点 Fréchet 可微。T3 采用 regular+T1；mathlib T3 的 T0+regular 由本条件构造。一般翻译正确性不在本登记范围。",
      "review": "pending"
    }
  ]
}
````

# 紧 ⇒ 仿紧

先把条件写全，再问结论是否还能失效。

## 精确内容

每个开覆盖取有限子覆盖。该子覆盖也是原覆盖的开加细，有限族必局部有限。此论证不使用 Hausdorff。

## 依据与边界

PROOF / REF：PROOF 表示附有正文论证；结构检查不替代证明。人工对应审阅 pending。

形式接口中的低层符号由 context.background 逐项规定；类型与摘要检查仅为 FINITE，不把背景解释自动当作证明。

## 参考

- 本案例《迁移验收清单》与关系正文。
- Lee, Introduction to Topological Manifolds, 2nd ed., Springer, 2011（拓扑、流形与可数性；按主题引用，未声称逐页复核）。
- Lee, Introduction to Smooth Manifolds, 2nd ed., Springer, 2013（微分、张量、形式与流；按主题引用）。
- mathlib4 固定版本 d13f23b723b8a846827a245b89c10fc7d3f11612；机器对应与覆盖边界见 mcs-foundations/lean/README.md。
