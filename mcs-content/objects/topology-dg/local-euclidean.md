````mcs-object
{
  "schema": "mcs-object/1",
  "id": "obj:tdg:local-euclidean",
  "version": "1",
  "title": "局部欧氏性",
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
        "name": "LocallyEuclidean",
        "type": "o",
        "background": "固定 n≥0，每点有到 R^n 开集的邻域同胚"
      }
    ]
  },
  "definitions": [],
  "assumptions": [],
  "declarations": [
    {
      "id": "definition",
      "kind": "formula",
      "source": "LocallyEuclidean",
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

# 局部欧氏性

只要求每点附近像 R^n，不要求全局能用一张图。

## 精确内容

固定维数 n，每点有同胚于 R^n 开集的开邻域。

## 依据与边界

DEF：不自动带 Hausdorff 或第二可数；长直线说明额外条件的作用。

形式接口中的低层符号由 context.background 逐项规定；类型与摘要检查仅为 FINITE，不把背景解释自动当作证明。

## 参考

- 本案例《迁移验收清单》与关系正文。
- Lee, Introduction to Topological Manifolds, 2nd ed., Springer, 2011（拓扑、流形与可数性；按主题引用，未声称逐页复核）。
- Lee, Introduction to Smooth Manifolds, 2nd ed., Springer, 2013（微分、张量、形式与流；按主题引用）。
