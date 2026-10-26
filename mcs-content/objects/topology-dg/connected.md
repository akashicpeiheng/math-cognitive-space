````mcs-object
{
  "schema": "mcs-object/1",
  "id": "obj:tdg:connected",
  "version": "1",
  "title": "连通空间",
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
        "name": "empty",
        "type": "X -> o",
        "background": "空子集"
      },
      {
        "name": "univ",
        "type": "X -> o",
        "background": "全体 X"
      },
      {
        "name": "Clopen",
        "type": "(X -> o) -> o",
        "background": "子集同时开且闭"
      }
    ]
  },
  "definitions": [],
  "assumptions": [],
  "declarations": [
    {
      "id": "definition",
      "kind": "formula",
      "source": "forall U:(X -> o). Clopen(U) -> (U = empty -> false) -> U = univ",
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

# 连通空间

“一整块”应描述不能被分开，而不是有限覆盖。

## 精确内容

唯一的既开又闭子集是 ∅ 与 X；用无析取的等价写法：非空开闭集必为全空间。

## 依据与边界

DEF：连通不等于道路连通；与紧不存在强依赖。

形式接口中的低层符号由 context.background 逐项规定；类型与摘要检查仅为 FINITE，不把背景解释自动当作证明。

## 参考

- 本案例《迁移验收清单》与关系正文。
- Lee, Introduction to Topological Manifolds, 2nd ed., Springer, 2011（拓扑、流形与可数性；按主题引用，未声称逐页复核）。
- Lee, Introduction to Smooth Manifolds, 2nd ed., Springer, 2013（微分、张量、形式与流；按主题引用）。
