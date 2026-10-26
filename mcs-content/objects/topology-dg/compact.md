````mcs-object
{
  "schema": "mcs-object/1",
  "id": "obj:tdg:compact",
  "version": "1",
  "title": "紧空间",
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
        "name": "OpenCover",
        "type": "Family -> o",
        "background": "族由开集组成且并为全空间"
      },
      {
        "name": "FiniteSubcover",
        "type": "Family -> o",
        "background": "该覆盖存在有限子覆盖"
      }
    ]
  },
  "definitions": [],
  "assumptions": [],
  "declarations": [
    {
      "id": "definition",
      "kind": "formula",
      "source": "forall C:Family. OpenCover(C) -> FiniteSubcover(C)",
      "status": "DEF"
    }
  ],
  "references": [
    {
      "id": "obj:tdg:topology",
      "version": "1",
      "anchor": "$",
      "formalHash": "sha256:25093237bbaf6983629d9d0c9bf15a446e79d0bda4e3b5e5fb2304cce6a95710"
    }
  ],
  "members": [],
  "imports": [],
  "exports": [],
  "links": [],
  "lean": []
}
````

# 紧空间

若局部信息覆盖整个空间，能否只用有限份？

## 精确内容

每个开覆盖都有有限子覆盖。

## 依据与边界

DEF：不默认 Hausdorff；紧与连通互不蕴含。

形式接口中的低层符号由 context.background 逐项规定；类型与摘要检查仅为 FINITE，不把背景解释自动当作证明。

## 参考

- 本案例《迁移验收清单》与关系正文。
- Lee, Introduction to Topological Manifolds, 2nd ed., Springer, 2011（拓扑、流形与可数性；按主题引用，未声称逐页复核）。
- Lee, Introduction to Smooth Manifolds, 2nd ed., Springer, 2013（微分、张量、形式与流；按主题引用）。
