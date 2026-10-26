````mcs-object
{
  "schema": "mcs-object/1",
  "id": "obj:tdg:sigma-compact",
  "version": "1",
  "title": "σ 紧空间",
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
        "name": "CompactExhaustion",
        "type": "Family -> o",
        "background": "族中各项为紧子集且并为全空间；不要求嵌套或包含于后项内部"
      }
    ]
  },
  "definitions": [],
  "assumptions": [],
  "declarations": [
    {
      "id": "definition",
      "kind": "formula",
      "source": "exists C:Family. Countable(C) ∧ CompactExhaustion(C)",
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
      "id": "obj:tdg:compact",
      "version": "1",
      "anchor": "$",
      "formalHash": "sha256:605899be31df7572449f260cc1f1ed6773f73a5eebc93cfd8a0a5b8acf08cabd"
    }
  ],
  "members": [],
  "imports": [],
  "exports": [],
  "links": [],
  "lean": []
}
````

# σ 紧空间

允许分成可数块，每块仍能有限控制。

## 精确内容

空间可写成可数个紧子集之并。

## 依据与边界

DEF：不要求紧集有内点，也不要求嵌套；一般空间中不等于仿紧。

形式接口中的低层符号由 context.background 逐项规定；类型与摘要检查仅为 FINITE，不把背景解释自动当作证明。

## 参考

- 本案例《迁移验收清单》与关系正文。
- Lee, Introduction to Topological Manifolds, 2nd ed., Springer, 2011（拓扑、流形与可数性；按主题引用，未声称逐页复核）。
- Lee, Introduction to Smooth Manifolds, 2nd ed., Springer, 2013（微分、张量、形式与流；按主题引用）。
