````mcs-object
{
  "schema": "mcs-object/1",
  "id": "obj:tdg:insertion",
  "version": "1",
  "title": "内乘 ι_X",
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
        "name": "InsertionEquation",
        "type": "o",
        "background": "对 k≥1，(ιXω)p(v1,…,v(k-1))=ωp(Xp,v1,…,v(k-1))；0 形式内乘为0"
      }
    ]
  },
  "definitions": [],
  "assumptions": [],
  "declarations": [
    {
      "id": "definition",
      "kind": "formula",
      "source": "InsertionEquation",
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
      "id": "obj:tdg:vector-field",
      "version": "1",
      "anchor": "$",
      "formalHash": "sha256:bf09a53f23b5767aea7d67433601734b4b3a62444375a2c3fb29a154e1e2d3a7"
    }
  ],
  "members": [],
  "imports": [],
  "exports": [],
  "links": [],
  "lean": []
}
````

# 内乘 ι_X

把向量场填进形式的第一个输入。

## 精确内容

(ιXω)(v1,…,v(k−1))=ω(X,v1,…,v(k−1))；对0形式为0。

## 依据与边界

DEF：次数下降1，内乘不是两个向量的内积。

形式接口中的低层符号由 context.background 逐项规定；类型与摘要检查仅为 FINITE，不把背景解释自动当作证明。

## 参考

- 本案例《迁移验收清单》与关系正文。
- Lee, Introduction to Topological Manifolds, 2nd ed., Springer, 2011（拓扑、流形与可数性；按主题引用，未声称逐页复核）。
- Lee, Introduction to Smooth Manifolds, 2nd ed., Springer, 2013（微分、张量、形式与流；按主题引用）。
