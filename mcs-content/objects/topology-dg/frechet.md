````mcs-object
{
  "schema": "mcs-object/1",
  "id": "obj:tdg:frechet",
  "version": "1",
  "title": "Fréchet 全导数",
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
        "name": "FrechetRemainder",
        "type": "o",
        "background": "固定 f:R^n→R^m,x,A，A 线性连续且 ||f(x+h)-f(x)-Ah||/||h||→0"
      }
    ]
  },
  "definitions": [],
  "assumptions": [],
  "declarations": [
    {
      "id": "definition",
      "kind": "formula",
      "source": "FrechetRemainder",
      "status": "DEF"
    }
  ],
  "references": [
    {
      "id": "obj:tdg:derivative",
      "version": "1",
      "anchor": "$",
      "formalHash": "sha256:fa47019fbd377d68a02aad914a80c9e4dbe5f5b473d3f660ed37add394af1217"
    }
  ],
  "members": [],
  "imports": [],
  "exports": [],
  "links": [],
  "lean": []
}
````

# Fréchet 全导数

一次线性近似必须同时控制所有趋近方向。

## 精确内容

f(x+h)=f(x)+Ah+o(||h||)，其中 A 是连续线性映射。

## 依据与边界

DEF：有限维下所有方向导数存在不足以推出这个一致余项。

形式接口中的低层符号由 context.background 逐项规定；类型与摘要检查仅为 FINITE，不把背景解释自动当作证明。

## 参考

- 本案例《迁移验收清单》与关系正文。
- Lee, Introduction to Topological Manifolds, 2nd ed., Springer, 2011（拓扑、流形与可数性；按主题引用，未声称逐页复核）。
- Lee, Introduction to Smooth Manifolds, 2nd ed., Springer, 2013（微分、张量、形式与流；按主题引用）。
