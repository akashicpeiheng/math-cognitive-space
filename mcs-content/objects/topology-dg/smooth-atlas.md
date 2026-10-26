````mcs-object
{
  "schema": "mcs-object/1",
  "id": "obj:tdg:smooth-atlas",
  "version": "1",
  "title": "光滑图册",
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
      },
      {
        "name": "SmoothTransitions",
        "type": "o",
        "background": "重叠图的双向坐标变换为 C∞；只在重叠开集上检查"
      }
    ]
  },
  "definitions": [],
  "assumptions": [],
  "declarations": [
    {
      "id": "definition",
      "kind": "formula",
      "source": "ChartsCover ∧ SmoothTransitions",
      "status": "DEF"
    }
  ],
  "references": [
    {
      "id": "obj:tdg:atlas",
      "version": "1",
      "anchor": "$",
      "formalHash": "sha256:50fdb0ecd27a589ba7f06a49369e8fb4ba0c9e80f09c41e58902447b78df2118"
    },
    {
      "id": "obj:tdg:frechet",
      "version": "1",
      "anchor": "$",
      "formalHash": "sha256:934df91a6ede7a251bcc88df6b0c48fc4d555aa76117c91c5055931ff128669b"
    }
  ],
  "members": [],
  "imports": [],
  "exports": [],
  "links": [],
  "lean": []
}
````

# 光滑图册

在重叠区校验同一计算换坐标后仍可微。

## 精确内容

覆盖全空间的图册，其全部重叠过渡映射为 C∞。

## 依据与边界

DEF：相容性是双向坐标变换条件；背景实微积分不假设任何待证流形定理。

形式接口中的低层符号由 context.background 逐项规定；类型与摘要检查仅为 FINITE，不把背景解释自动当作证明。

## 参考

- 本案例《迁移验收清单》与关系正文。
- Lee, Introduction to Topological Manifolds, 2nd ed., Springer, 2011（拓扑、流形与可数性；按主题引用，未声称逐页复核）。
- Lee, Introduction to Smooth Manifolds, 2nd ed., Springer, 2013（微分、张量、形式与流；按主题引用）。
