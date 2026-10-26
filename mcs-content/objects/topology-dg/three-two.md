````mcs-object
{
  "schema": "mcs-object/1",
  "id": "obj:tdg:three-two",
  "version": "1",
  "title": "T₃ ⇒ T₂",
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
        "name": "TOne",
        "type": "o",
        "background": "每个单点集闭；不附带更强分离条件"
      },
      {
        "name": "Separated",
        "type": "X -> X -> o",
        "background": "两点具有不交开邻域"
      },
      {
        "name": "Regular",
        "type": "o",
        "background": "每个点与不含它的闭集可由不交开集分离；本符号不含 T1"
      }
    ]
  },
  "definitions": [],
  "assumptions": [],
  "declarations": [
    {
      "id": "claim",
      "kind": "formula",
      "source": "Regular ∧ TOne -> (forall x:X y:X. (x = y -> false) -> Separated(x)(y))",
      "status": "PROOF"
    }
  ],
  "references": [
    {
      "id": "obj:tdg:t3",
      "version": "1",
      "anchor": "$",
      "formalHash": "sha256:82ec6c08c48ee3a5155e23eebba5bdba0138d58a923e92980d9e692849688113"
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
      "target": "MCS.Expected.t3ToT2",
      "mapping": "HOL 固定背景参数的闭包对应 Lean 目标的显式全称量化。Top/Family 等接口按正文定义解释；欧氏 d² 限整个 EuclideanSpace ℝ (Fin n) 上的 C² 实值 k 形式。方向导数目标限实赋范空间上在点 Fréchet 可微。T3 采用 regular+T1；mathlib T3 的 T0+regular 由本条件构造。一般翻译正确性不在本登记范围。",
      "review": "pending"
    }
  ]
}
````

# T₃ ⇒ T₂

先把条件写全，再问结论是否还能失效。

## 精确内容

T1 使 {y} 闭；正则性分离 x 与 {y}，得到两点的不交开邻域。

## 依据与边界

PROOF / REF：PROOF 表示附有正文论证；结构检查不替代证明。人工对应审阅 pending。

形式接口中的低层符号由 context.background 逐项规定；类型与摘要检查仅为 FINITE，不把背景解释自动当作证明。

## 参考

- 本案例《迁移验收清单》与关系正文。
- Lee, Introduction to Topological Manifolds, 2nd ed., Springer, 2011（拓扑、流形与可数性；按主题引用，未声称逐页复核）。
- Lee, Introduction to Smooth Manifolds, 2nd ed., Springer, 2013（微分、张量、形式与流；按主题引用）。
- mathlib4 固定版本 d13f23b723b8a846827a245b89c10fc7d3f11612；机器对应与覆盖边界见 mcs-foundations/lean/README.md。
