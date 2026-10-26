````mcs-object
{
  "schema": "mcs-object/1",
  "id": "obj:tdg:paracompact",
  "version": "1",
  "title": "仿紧空间",
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
        "name": "LocallyFiniteRefinement",
        "type": "Family -> o",
        "background": "覆盖存在局部有限的开加细覆盖"
      }
    ]
  },
  "definitions": [],
  "assumptions": [],
  "declarations": [
    {
      "id": "definition",
      "kind": "formula",
      "source": "forall C:Family. OpenCover(C) -> LocallyFiniteRefinement(C)",
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

# 仿紧空间

有限份太强时，退成每个点附近只遇到有限份。

## 精确内容

每个开覆盖都有局部有限的开加细覆盖。

## 依据与边界

DEF：本定义不把 Hausdorff 并入；单位分解的流形应用另加分离与光滑条件。

形式接口中的低层符号由 context.background 逐项规定；类型与摘要检查仅为 FINITE，不把背景解释自动当作证明。

## 参考

- 本案例《迁移验收清单》与关系正文。
- Lee, Introduction to Topological Manifolds, 2nd ed., Springer, 2011（拓扑、流形与可数性；按主题引用，未声称逐页复核）。
- Lee, Introduction to Smooth Manifolds, 2nd ed., Springer, 2013（微分、张量、形式与流；按主题引用）。
