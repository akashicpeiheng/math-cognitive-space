````mcs-object
{
  "schema": "mcs-object/1",
  "id": "obj:tdg:curl-grad",
  "version": "1",
  "title": "curl grad f = 0",
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
        "name": "C2Scalar",
        "type": "o",
        "background": "开集 U⊆R^3 上的 C² 标量函数"
      },
      {
        "name": "CurlGradZero",
        "type": "o",
        "background": "标准定向欧氏 R^3 上 curl(grad f)=0"
      }
    ]
  },
  "definitions": [],
  "assumptions": [],
  "declarations": [
    {
      "id": "claim",
      "kind": "formula",
      "source": "C2Scalar -> CurlGradZero",
      "status": "PROOF"
    }
  ],
  "references": [
    {
      "id": "obj:tdg:gradient",
      "version": "1",
      "anchor": "$",
      "formalHash": "sha256:f2c51eb95f719bb2ee7252efcda7ef3d5ec2bb994dd5ddc7e9240bbfc7d09020"
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

# curl grad f = 0

先把条件写全，再问结论是否还能失效。

## 精确内容

C² 标量函数的混合二阶偏导可交换，旋度的三个分量各为一对差，逐项为0。需在 R³ 的开域及标准定向欧氏结构下理解。

## 依据与边界

PROOF / REF：PROOF 表示附有正文论证；结构检查不替代证明。人工对应审阅 pending。

形式接口中的低层符号由 context.background 逐项规定；类型与摘要检查仅为 FINITE，不把背景解释自动当作证明。

## 参考

- 本案例《迁移验收清单》与关系正文。
- Lee, Introduction to Topological Manifolds, 2nd ed., Springer, 2011（拓扑、流形与可数性；按主题引用，未声称逐页复核）。
- Lee, Introduction to Smooth Manifolds, 2nd ed., Springer, 2013（微分、张量、形式与流；按主题引用）。
