````mcs-object
{
  "schema": "mcs-object/1",
  "id": "obj:tdg:vector-field",
  "version": "1",
  "title": "向量场",
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
        "name": "SmoothVectorSection",
        "type": "o",
        "background": "光滑截面 X:M→TM，π∘X=id；不是单个切向量"
      }
    ]
  },
  "definitions": [],
  "assumptions": [],
  "declarations": [
    {
      "id": "definition",
      "kind": "formula",
      "source": "SmoothVectorSection",
      "status": "DEF"
    }
  ],
  "references": [
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

# 向量场

每点指定一个方向，还要让方向光滑变化。

## 精确内容

TM 的光滑截面 X，满足 π∘X=id。

## 依据与边界

DEF：与一个切空间中的向量严格区分。

形式接口中的低层符号由 context.background 逐项规定；类型与摘要检查仅为 FINITE，不把背景解释自动当作证明。

## 参考

- 本案例《迁移验收清单》与关系正文。
- Lee, Introduction to Topological Manifolds, 2nd ed., Springer, 2011（拓扑、流形与可数性；按主题引用，未声称逐页复核）。
- Lee, Introduction to Smooth Manifolds, 2nd ed., Springer, 2013（微分、张量、形式与流；按主题引用）。
