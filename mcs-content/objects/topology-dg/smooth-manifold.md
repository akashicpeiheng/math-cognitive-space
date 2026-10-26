````mcs-object
{
  "schema": "mcs-object/1",
  "id": "obj:tdg:smooth-manifold",
  "version": "1",
  "title": "光滑流形",
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
        "name": "Countable",
        "type": "Family -> o",
        "background": "族为至多可数，允许有限或空族"
      },
      {
        "name": "Base",
        "type": "Family -> o",
        "background": "族中开集构成整个空间的基：任一开集是其中成员的并"
      },
      {
        "name": "Separated",
        "type": "X -> X -> o",
        "background": "两点具有不交开邻域"
      },
      {
        "name": "LocallyEuclidean",
        "type": "o",
        "background": "固定 n≥0，每点有到 R^n 开集的邻域同胚"
      },
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
      "source": "(forall x:X y:X. (x = y -> false) -> Separated(x)(y)) ∧ (exists B:Family. Countable(B) ∧ Base(B)) ∧ LocallyEuclidean ∧ ChartsCover ∧ SmoothTransitions",
      "status": "DEF"
    }
  ],
  "references": [
    {
      "id": "obj:tdg:top-manifold",
      "version": "1",
      "anchor": "$",
      "formalHash": "sha256:4967c512c3592d2a0b1f1fa6562ffae9c85454c6aefb985c45779992d1cc2a6e"
    },
    {
      "id": "obj:tdg:smooth-atlas",
      "version": "1",
      "anchor": "$",
      "formalHash": "sha256:e18b82814091b24a3672725e22121d3658fcdf88859bf0d19229cb1516c067e7"
    }
  ],
  "members": [],
  "imports": [],
  "exports": [],
  "links": [],
  "lean": []
}
````

# 光滑流形

比较不同坐标中的微分计算，需要过渡映射光滑。

## 精确内容

拓扑 n 流形配备一个 C∞ 相容图册的极大化；相容图册生成相同光滑结构。

## 依据与边界

DEF：同一拓扑流形的光滑结构不必唯一；不声称处处存在。

形式接口中的低层符号由 context.background 逐项规定；类型与摘要检查仅为 FINITE，不把背景解释自动当作证明。

## 参考

- 本案例《迁移验收清单》与关系正文。
- Lee, Introduction to Topological Manifolds, 2nd ed., Springer, 2011（拓扑、流形与可数性；按主题引用，未声称逐页复核）。
- Lee, Introduction to Smooth Manifolds, 2nd ed., Springer, 2013（微分、张量、形式与流；按主题引用）。
