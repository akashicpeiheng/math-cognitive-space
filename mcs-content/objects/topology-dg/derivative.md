````mcs-object
{
  "schema": "mcs-object/1",
  "id": "obj:tdg:derivative",
  "version": "1",
  "title": "一元导数",
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
        "name": "DerivativeLimit",
        "type": "o",
        "background": "固定 f:R→R,x,a，lim(h→0)(f(x+h)-f(x))/h=a；删去 h=0"
      }
    ]
  },
  "definitions": [],
  "assumptions": [],
  "declarations": [
    {
      "id": "definition",
      "kind": "formula",
      "source": "DerivativeLimit",
      "status": "DEF"
    }
  ],
  "references": [],
  "members": [],
  "imports": [],
  "exports": [],
  "links": [],
  "lean": []
}
````

# 一元导数

先沿一条实直线观察变化率。

## 精确内容

f:R→R 在 x 的导数是差商极限；向量值情形另说明陪域。

## 依据与边界

DEF：本项为一元导数，不用它替代 Fréchet 全导数。

形式接口中的低层符号由 context.background 逐项规定；类型与摘要检查仅为 FINITE，不把背景解释自动当作证明。

## 参考

- 本案例《迁移验收清单》与关系正文。
- Lee, Introduction to Topological Manifolds, 2nd ed., Springer, 2011（拓扑、流形与可数性；按主题引用，未声称逐页复核）。
- Lee, Introduction to Smooth Manifolds, 2nd ed., Springer, 2013（微分、张量、形式与流；按主题引用）。
