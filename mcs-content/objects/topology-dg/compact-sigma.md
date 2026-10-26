````mcs-object
{
  "schema": "mcs-object/1",
  "id": "obj:tdg:compact-sigma",
  "version": "1",
  "title": "紧 ⇒ σ 紧",
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
        "name": "CompactExhaustion",
        "type": "Family -> o",
        "background": "族中各项为紧子集且并为全空间；不要求嵌套或包含于后项内部"
      }
    ]
  },
  "definitions": [],
  "assumptions": [],
  "declarations": [
    {
      "id": "claim",
      "kind": "formula",
      "source": "(forall C:Family. OpenCover(C) -> FiniteSubcover(C)) -> (exists C:Family. Countable(C) ∧ CompactExhaustion(C))",
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
  "lean": []
}
````

# 紧 ⇒ σ 紧

先把条件写全，再问结论是否还能失效。

## 精确内容

用常值序列 K_n=X 即得可数紧覆盖；紧的空空间也成立。

## 依据与边界

PROOF / REF：PROOF 表示附有正文论证；结构检查不替代证明。人工对应审阅 pending。

形式接口中的低层符号由 context.background 逐项规定；类型与摘要检查仅为 FINITE，不把背景解释自动当作证明。

## 参考

- 本案例《迁移验收清单》与关系正文。
- Lee, Introduction to Topological Manifolds, 2nd ed., Springer, 2011（拓扑、流形与可数性；按主题引用，未声称逐页复核）。
- Lee, Introduction to Smooth Manifolds, 2nd ed., Springer, 2013（微分、张量、形式与流；按主题引用）。
