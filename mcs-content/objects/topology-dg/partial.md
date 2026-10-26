````mcs-object
{
  "schema": "mcs-object/1",
  "id": "obj:tdg:partial",
  "version": "1",
  "title": "偏导数",
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
        "name": "PartialLimit",
        "type": "o",
        "background": "指定 i 的一元差商 lim(t→0)(f(x+t e_i)-f(x))/t 存在"
      }
    ]
  },
  "definitions": [],
  "assumptions": [],
  "declarations": [
    {
      "id": "definition",
      "kind": "formula",
      "source": "PartialLimit",
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

# 偏导数

冻结其他坐标，只让一个坐标移动。

## 精确内容

∂if(x)=lim(t→0)(f(x+t ei)-f(x))/t，存在时定义。

## 依据与边界

DEF：所有偏导存在并不保证连续或可微。

形式接口中的低层符号由 context.background 逐项规定；类型与摘要检查仅为 FINITE，不把背景解释自动当作证明。

## 参考

- 本案例《迁移验收清单》与关系正文。
- Lee, Introduction to Topological Manifolds, 2nd ed., Springer, 2011（拓扑、流形与可数性；按主题引用，未声称逐页复核）。
- Lee, Introduction to Smooth Manifolds, 2nd ed., Springer, 2013（微分、张量、形式与流；按主题引用）。
