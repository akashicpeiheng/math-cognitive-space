````mcs-object
{
  "schema": "mcs-object/1",
  "id": "obj:tdg:tangent-dual",
  "version": "1",
  "title": "余切空间是切空间的线性对偶",
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
        "name": "DualIdentification",
        "type": "o",
        "background": "Tp*M=Hom_R(TpM,R)；有限维时 TpM 自然同构于其二次对偶，不自然同构于一次对偶"
      }
    ]
  },
  "definitions": [],
  "assumptions": [],
  "declarations": [
    {
      "id": "claim",
      "kind": "formula",
      "source": "DualIdentification",
      "status": "PROOF"
    }
  ],
  "references": [
    {
      "id": "obj:tdg:tangent",
      "version": "1",
      "anchor": "$",
      "formalHash": "sha256:faf5aef9f1db873309a8ddb42686f2894808de79a0dd559d820b070b7205a74c"
    },
    {
      "id": "obj:tdg:cotangent",
      "version": "1",
      "anchor": "$",
      "formalHash": "sha256:65ba1bde0005c5f0a66d4a4509f0e9b952692d1c1b2edbb2549cf7b84ab99389"
    }
  ],
  "members": [],
  "imports": [],
  "exports": [],
  "links": [],
  "lean": []
}
````

# 余切空间是切空间的线性对偶

先把条件写全，再问结论是否还能失效。

## 精确内容

DEF：Tp*M 按定义为 TpM 的线性对偶。有限维下评价映射 v↦(α↦α(v)) 给二次对偶同构；它不提供不依赖度量的一次对偶识别。

## 依据与边界

PROOF / REF：PROOF 表示附有正文论证；结构检查不替代证明。人工对应审阅 pending。

形式接口中的低层符号由 context.background 逐项规定；类型与摘要检查仅为 FINITE，不把背景解释自动当作证明。

## 参考

- 本案例《迁移验收清单》与关系正文。
- Lee, Introduction to Topological Manifolds, 2nd ed., Springer, 2011（拓扑、流形与可数性；按主题引用，未声称逐页复核）。
- Lee, Introduction to Smooth Manifolds, 2nd ed., Springer, 2013（微分、张量、形式与流；按主题引用）。
