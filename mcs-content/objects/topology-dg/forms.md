````mcs-object
{
  "schema": "mcs-object/1",
  "id": "obj:tdg:forms",
  "version": "1",
  "title": "微分形式",
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
        "name": "AlternatingSection",
        "type": "o",
        "background": "光滑赋值 p↦ωp∈Λ^k(Tp*M)，等价于光滑交替协变 k 张量场；k=0 为函数"
      }
    ]
  },
  "definitions": [],
  "assumptions": [],
  "declarations": [
    {
      "id": "definition",
      "kind": "formula",
      "source": "AlternatingSection",
      "status": "DEF"
    }
  ],
  "references": [
    {
      "id": "obj:tdg:cotangent",
      "version": "1",
      "anchor": "$",
      "formalHash": "sha256:65ba1bde0005c5f0a66d4a4509f0e9b952692d1c1b2edbb2549cf7b84ab99389"
    },
    {
      "id": "obj:tdg:smooth-manifold",
      "version": "1",
      "anchor": "$",
      "formalHash": "sha256:a787e1f01f9e43f3dcd668a7ef27c82447433c4d95ccd5c5422bbecb9785c691"
    }
  ],
  "members": [],
  "imports": [],
  "exports": [],
  "links": [],
  "lean": []
}
````

# 微分形式

积分需要随点变化、且交换方向会变号的多线性数据。

## 精确内容

光滑 k 形式是 Λ^k T*M 的光滑截面；k=0 时是光滑函数。

## 依据与边界

DEF：点处余切向量是一形式的纤维值；不等于整个全局一形式。

形式接口中的低层符号由 context.background 逐项规定；类型与摘要检查仅为 FINITE，不把背景解释自动当作证明。

## 参考

- 本案例《迁移验收清单》与关系正文。
- Lee, Introduction to Topological Manifolds, 2nd ed., Springer, 2011（拓扑、流形与可数性；按主题引用，未声称逐页复核）。
- Lee, Introduction to Smooth Manifolds, 2nd ed., Springer, 2013（微分、张量、形式与流；按主题引用）。
