````mcs-object
{
  "schema": "mcs-object/1",
  "id": "obj:tdg:atlas",
  "version": "1",
  "title": "图册",
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
        "name": "ChartsCover",
        "type": "o",
        "background": "指定图族的定义域覆盖 X，每张图均为 chart 定义的局部坐标"
      }
    ]
  },
  "definitions": [],
  "assumptions": [],
  "declarations": [
    {
      "id": "definition",
      "kind": "formula",
      "source": "ChartsCover",
      "status": "DEF"
    }
  ],
  "references": [
    {
      "id": "obj:tdg:chart",
      "version": "1",
      "anchor": "$",
      "formalHash": "sha256:79f8585586698e9c8a1015d0114cb9b55a2b195cfb7764107b204dfe826088cb"
    }
  ],
  "members": [],
  "imports": [],
  "exports": [],
  "links": [],
  "lean": []
}
````

# 图册

一张图往往盖不住全空间，先允许多张图拼接。

## 精确内容

一族局部坐标图，其定义域覆盖 M。

## 依据与边界

DEF：拓扑图册没有自动的光滑相容性；定义图册不先假设光滑流形。

形式接口中的低层符号由 context.background 逐项规定；类型与摘要检查仅为 FINITE，不把背景解释自动当作证明。

## 参考

- 本案例《迁移验收清单》与关系正文。
- Lee, Introduction to Topological Manifolds, 2nd ed., Springer, 2011（拓扑、流形与可数性；按主题引用，未声称逐页复核）。
- Lee, Introduction to Smooth Manifolds, 2nd ed., Springer, 2013（微分、张量、形式与流；按主题引用）。
