````mcs-object
{
  "schema": "mcs-object/1",
  "id": "obj:tdg:chart",
  "version": "1",
  "title": "局部坐标图",
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
        "name": "Continuous",
        "type": "o",
        "background": "指定映射 f:X→Y 对所有开集的逆像开；定义不要求双射"
      },
      {
        "name": "Bijective",
        "type": "o",
        "background": "指定映射 f 为双射"
      },
      {
        "name": "InverseContinuous",
        "type": "o",
        "background": "指定双射的逆映射连续"
      },
      {
        "name": "ChartDomain",
        "type": "o",
        "background": "指定 U⊆X 是开集，坐标像 V⊆R^n 是开集"
      }
    ]
  },
  "definitions": [],
  "assumptions": [],
  "declarations": [
    {
      "id": "definition",
      "kind": "formula",
      "source": "ChartDomain ∧ Continuous ∧ Bijective ∧ InverseContinuous",
      "status": "DEF"
    }
  ],
  "references": [
    {
      "id": "obj:tdg:topology",
      "version": "1",
      "anchor": "$",
      "formalHash": "sha256:25093237bbaf6983629d9d0c9bf15a446e79d0bda4e3b5e5fb2304cce6a95710"
    },
    {
      "id": "obj:tdg:homeomorphism",
      "version": "1",
      "anchor": "$",
      "formalHash": "sha256:87d3a7c2d3f15e77eed860e7cd83fab6f49e7e5b447112e34f43d44804a44744"
    }
  ],
  "members": [],
  "imports": [],
  "exports": [],
  "links": [],
  "lean": []
}
````

# 局部坐标图

把一块空间送入欧氏空间，才有坐标。

## 精确内容

图 (U,φ) 中 U⊆M 开，φ:U→V⊆R^n 是到开集 V 的同胚。

## 依据与边界

DEF：U 是局部定义域；不要求 M 自身同胚于欧氏开集。

形式接口中的低层符号由 context.background 逐项规定；类型与摘要检查仅为 FINITE，不把背景解释自动当作证明。

## 参考

- 本案例《迁移验收清单》与关系正文。
- Lee, Introduction to Topological Manifolds, 2nd ed., Springer, 2011（拓扑、流形与可数性；按主题引用，未声称逐页复核）。
- Lee, Introduction to Smooth Manifolds, 2nd ed., Springer, 2013（微分、张量、形式与流；按主题引用）。
