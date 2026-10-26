````mcs-object
{
  "schema": "mcs-object/1",
  "id": "obj:tdg:tensor",
  "version": "1",
  "title": "点态张量",
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
        "name": "Multilinear",
        "type": "o",
        "background": "在指定有限维实向量空间 V 上，候选 (r,s) 张量为 (V*)^r×V^s→R 的多线性映射；不预设 V 是切空间"
      }
    ]
  },
  "definitions": [],
  "assumptions": [],
  "declarations": [
    {
      "id": "definition",
      "kind": "formula",
      "source": "Multilinear",
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

# 点态张量

把多个向量与协向量的输入组合成坐标无关的数。

## 精确内容

有限维 V 上 (r,s) 张量可视为 (V*)^r×V^s→R 的多线性映射。

## 依据与边界

DEF：抽象 V 无须来自切空间；张量场是另一个对象。

形式接口中的低层符号由 context.background 逐项规定；类型与摘要检查仅为 FINITE，不把背景解释自动当作证明。

## 参考

- 本案例《迁移验收清单》与关系正文。
- Lee, Introduction to Topological Manifolds, 2nd ed., Springer, 2011（拓扑、流形与可数性；按主题引用，未声称逐页复核）。
- Lee, Introduction to Smooth Manifolds, 2nd ed., Springer, 2013（微分、张量、形式与流；按主题引用）。
