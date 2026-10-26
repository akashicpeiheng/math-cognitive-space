````mcs-object
{
  "schema": "mcs-object/1",
  "id": "obj:tdg:div-curl",
  "version": "1",
  "title": "div curl F = 0",
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
        "name": "C2Vector",
        "type": "o",
        "background": "开集 U⊆R^3 上的 C² 向量场"
      },
      {
        "name": "DivCurlZero",
        "type": "o",
        "background": "标准定向欧氏 R^3 上 div(curl F)=0"
      }
    ]
  },
  "definitions": [],
  "assumptions": [],
  "declarations": [
    {
      "id": "claim",
      "kind": "formula",
      "source": "C2Vector -> DivCurlZero",
      "status": "PROOF"
    }
  ],
  "references": [
    {
      "id": "obj:tdg:divergence",
      "version": "1",
      "anchor": "$",
      "formalHash": "sha256:6806bcc3b80aed0e0c773aae27ed8afbcd89361b89ee304216e104832a986565"
    },
    {
      "id": "obj:tdg:curl",
      "version": "1",
      "anchor": "$",
      "formalHash": "sha256:74260bb6bba1d0142e7a30d5364704524ae4b48c1973230dd0cdf73032faaaa2"
    }
  ],
  "members": [],
  "imports": [],
  "exports": [],
  "links": [],
  "lean": []
}
````

# div curl F = 0

先把条件写全，再问结论是否还能失效。

## 精确内容

将散度和旋度坐标式展开，六项二阶偏导因 C² 可交换而两两抵消。

## 依据与边界

PROOF / REF：PROOF 表示附有正文论证；结构检查不替代证明。人工对应审阅 pending。

形式接口中的低层符号由 context.background 逐项规定；类型与摘要检查仅为 FINITE，不把背景解释自动当作证明。

## 参考

- 本案例《迁移验收清单》与关系正文。
- Lee, Introduction to Topological Manifolds, 2nd ed., Springer, 2011（拓扑、流形与可数性；按主题引用，未声称逐页复核）。
- Lee, Introduction to Smooth Manifolds, 2nd ed., Springer, 2013（微分、张量、形式与流；按主题引用）。
