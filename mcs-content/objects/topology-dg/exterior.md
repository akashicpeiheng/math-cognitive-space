````mcs-object
{
  "schema": "mcs-object/1",
  "id": "obj:tdg:exterior",
  "version": "1",
  "title": "外微分 d",
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
        "name": "ExteriorFormula",
        "type": "o",
        "background": "局部光滑 k 形式 ω=ΣI aI dxI 的候选 dω=ΣI,j ∂j aI dxj∧dxI；坐标不变性需另证"
      }
    ]
  },
  "definitions": [],
  "assumptions": [],
  "declarations": [
    {
      "id": "definition",
      "kind": "formula",
      "source": "ExteriorFormula",
      "status": "DEF"
    }
  ],
  "references": [
    {
      "id": "obj:tdg:forms",
      "version": "1",
      "anchor": "$",
      "formalHash": "sha256:b3464e9cc85a77a11178290d5a90eceaf97a17a89167a874a671d6d59a876082"
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

# 外微分 d

把变化率扩展到可积的有向面积、体积信息。

## 精确内容

局部 ω=ΣI aI dxI，定义 dω=ΣI,j ∂jaI dxj∧dxI；全局用坐标变换一致性粘合。

## 依据与边界

DEF：d 本身不需要度量或定向；本次机器 d² 覆盖欧氏域上的足够光滑形式。

形式接口中的低层符号由 context.background 逐项规定；类型与摘要检查仅为 FINITE，不把背景解释自动当作证明。

## 参考

- 本案例《迁移验收清单》与关系正文。
- Lee, Introduction to Topological Manifolds, 2nd ed., Springer, 2011（拓扑、流形与可数性；按主题引用，未声称逐页复核）。
- Lee, Introduction to Smooth Manifolds, 2nd ed., Springer, 2013（微分、张量、形式与流；按主题引用）。
