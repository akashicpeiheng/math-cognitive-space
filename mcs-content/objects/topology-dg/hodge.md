````mcs-object
{
  "schema": "mcs-object/1",
  "id": "obj:tdg:hodge",
  "version": "1",
  "title": "Hodge 星",
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
        "name": "HodgeEquation",
        "type": "o",
        "background": "有向 n 维黎曼流形的候选星满足 α∧*β=<α,β>g vol_g，同点同次；Λk→Λ(n-k)"
      }
    ]
  },
  "definitions": [],
  "assumptions": [],
  "declarations": [
    {
      "id": "definition",
      "kind": "formula",
      "source": "HodgeEquation",
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
      "id": "obj:tdg:metric",
      "version": "1",
      "anchor": "$",
      "formalHash": "sha256:b582dd3b47d315238f890fda61fb3144a9de5437efc539a084e9304d50ac8491"
    }
  ],
  "members": [],
  "imports": [],
  "exports": [],
  "links": [],
  "lean": []
}
````

# Hodge 星

借助长度和定向，把 k 维有向测量换成余维测量。

## 精确内容

有向 n 维黎曼流形中 α∧*β=<α,β>g vol_g。

## 依据与边界

DEF：依赖度量与定向；本案例采用正定度量和实形式。

形式接口中的低层符号由 context.background 逐项规定；类型与摘要检查仅为 FINITE，不把背景解释自动当作证明。

## 参考

- 本案例《迁移验收清单》与关系正文。
- Lee, Introduction to Topological Manifolds, 2nd ed., Springer, 2011（拓扑、流形与可数性；按主题引用，未声称逐页复核）。
- Lee, Introduction to Smooth Manifolds, 2nd ed., Springer, 2013（微分、张量、形式与流；按主题引用）。
