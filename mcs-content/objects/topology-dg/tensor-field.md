````mcs-object
{
  "schema": "mcs-object/1",
  "id": "obj:tdg:tensor-field",
  "version": "1",
  "title": "张量场",
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
        "name": "TensorSection",
        "type": "o",
        "background": "光滑赋值 p↦Tp∈(TpM)⊗r⊗(Tp*M)⊗s；坐标系数光滑"
      }
    ]
  },
  "definitions": [],
  "assumptions": [],
  "declarations": [
    {
      "id": "definition",
      "kind": "formula",
      "source": "TensorSection",
      "status": "DEF"
    }
  ],
  "references": [
    {
      "id": "obj:tdg:tensor",
      "version": "1",
      "anchor": "$",
      "formalHash": "sha256:bfe093bd723de88756a6b7e682b965db2f487b87b89d3ea8228b9d4e37bfbb66"
    },
    {
      "id": "obj:tdg:smooth-manifold",
      "version": "1",
      "anchor": "$",
      "formalHash": "sha256:a787e1f01f9e43f3dcd668a7ef27c82447433c4d95ccd5c5422bbecb9785c691"
    },
    {
      "id": "obj:tdg:tangent",
      "version": "1",
      "anchor": "$",
      "formalHash": "sha256:faf5aef9f1db873309a8ddb42686f2894808de79a0dd559d820b070b7205a74c"
    }
  ],
  "members": [],
  "imports": [],
  "exports": [],
  "links": [],
  "lean": []
}
````

# 张量场

把点态多线性数据随点光滑安排。

## 精确内容

光滑截面 T∈Γ((TM)⊗r⊗(T*M)⊗s)。

## 依据与边界

DEF：光滑性是额外要求；一般张量无须依赖切空间。

形式接口中的低层符号由 context.background 逐项规定；类型与摘要检查仅为 FINITE，不把背景解释自动当作证明。

## 参考

- 本案例《迁移验收清单》与关系正文。
- Lee, Introduction to Topological Manifolds, 2nd ed., Springer, 2011（拓扑、流形与可数性；按主题引用，未声称逐页复核）。
- Lee, Introduction to Smooth Manifolds, 2nd ed., Springer, 2013（微分、张量、形式与流；按主题引用）。
