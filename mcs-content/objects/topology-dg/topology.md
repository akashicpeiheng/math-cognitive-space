````mcs-object
{
  "schema": "mcs-object/1",
  "id": "obj:tdg:topology",
  "version": "1",
  "title": "拓扑结构",
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
        "name": "Open",
        "type": "(X -> o) -> o",
        "background": "指定开集族参数；拓扑公理在 topology 对象陈述，不预设成立"
      },
      {
        "name": "Inter",
        "type": "(X -> o) -> (X -> o) -> X -> o",
        "background": "集合交"
      },
      {
        "name": "Union",
        "type": "Family -> X -> o",
        "background": "集合族的并"
      },
      {
        "name": "Subfamily",
        "type": "Family -> o",
        "background": "族中每个成员都属于 Open"
      }
    ]
  },
  "definitions": [],
  "assumptions": [],
  "declarations": [
    {
      "id": "definition",
      "kind": "formula",
      "source": "Open(empty) ∧ Open(univ) ∧ (forall U:(X -> o) V:(X -> o). Open(U) ∧ Open(V) -> Open(Inter(U)(V))) ∧ (forall C:Family. Subfamily(C) -> Open(Union(C)))",
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

# 拓扑结构

先只保留“附近”和“连续”需要的开集信息。

## 精确内容

在集合 X 上指定 τ⊆P(X)，使 ∅,X∈τ，任意并与有限交仍在 τ；拓扑空间是 (X,τ)，而“拓扑学”是学科组织。

## 依据与边界

DEF：本案例固定载体与开集族；本对象不是“拓扑学”学科话题。

形式接口中的低层符号由 context.background 逐项规定；类型与摘要检查仅为 FINITE，不把背景解释自动当作证明。

## 参考

- 本案例《迁移验收清单》与关系正文。
- Lee, Introduction to Topological Manifolds, 2nd ed., Springer, 2011（拓扑、流形与可数性；按主题引用，未声称逐页复核）。
- Lee, Introduction to Smooth Manifolds, 2nd ed., Springer, 2013（微分、张量、形式与流；按主题引用）。
