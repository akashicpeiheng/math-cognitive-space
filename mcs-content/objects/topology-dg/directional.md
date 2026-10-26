````mcs-object
{
  "schema": "mcs-object/1",
  "id": "obj:tdg:directional",
  "version": "1",
  "title": "方向导数",
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
        "name": "DirectionLimit",
        "type": "o",
        "background": "指定 v 的差商 lim(t→0)(f(x+t v)-f(x))/t 存在，v=0 时为0"
      }
    ]
  },
  "definitions": [],
  "assumptions": [],
  "declarations": [
    {
      "id": "definition",
      "kind": "formula",
      "source": "DirectionLimit",
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

# 方向导数

坐标轴不是唯一可走的方向。

## 精确内容

Dv f(x)=lim(t→0)(f(x+t v)-f(x))/t，存在时定义；无需先假设全可微。

## 依据与边界

DEF：各方向导数存在仍可能不组成线性映射；不强依赖全导数。

形式接口中的低层符号由 context.background 逐项规定；类型与摘要检查仅为 FINITE，不把背景解释自动当作证明。

## 参考

- 本案例《迁移验收清单》与关系正文。
- Lee, Introduction to Topological Manifolds, 2nd ed., Springer, 2011（拓扑、流形与可数性；按主题引用，未声称逐页复核）。
- Lee, Introduction to Smooth Manifolds, 2nd ed., Springer, 2013（微分、张量、形式与流；按主题引用）。
