````mcs-object
{
  "schema": "mcs-object/1",
  "id": "obj:tdg:gradient",
  "version": "1",
  "title": "梯度",
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
        "name": "InnerRepresentation",
        "type": "o",
        "background": "固定标量 f 可微，候选 g∈R^n 满足所有 v 有 <g,v>=Df_x(v)；标准内积正定"
      },
      {
        "name": "Differentiable",
        "type": "o",
        "background": "固定 f 在 x 处 Fréchet 可微；不是所有方向导数存在"
      }
    ]
  },
  "definitions": [],
  "assumptions": [],
  "declarations": [
    {
      "id": "definition",
      "kind": "formula",
      "source": "Differentiable ∧ InnerRepresentation",
      "status": "DEF"
    }
  ],
  "references": [
    {
      "id": "obj:tdg:frechet",
      "version": "1",
      "anchor": "$",
      "formalHash": "sha256:934df91a6ede7a251bcc88df6b0c48fc4d555aa76117c91c5055931ff128669b"
    },
    {
      "id": "obj:tdg:metric",
      "version": "1",
      "anchor": "$",
      "formalHash": "sha256:b582dd3b47d315238f890fda61fb3144a9de5437efc539a084e9304d50ac8491"
    },
    {
      "id": "obj:tdg:partial",
      "version": "1",
      "anchor": "$",
      "formalHash": "sha256:2eeb91ebf8e69735ab8460256a0713501f0813a0596ceedf1fce514c451e52cd"
    }
  ],
  "members": [],
  "imports": [],
  "exports": [],
  "links": [],
  "lean": []
}
````

# 梯度

把所有方向上的变化率压缩成一个向量。

## 精确内容

欧氏标量函数可微时，grad f 是满足 <grad f,v>=Df[v] 的唯一向量。坐标式为 (∂1f,…,∂nf)。

## 依据与边界

DEF：使用内积把协向量转为向量；一般流形需度量，不仅有光滑结构。

形式接口中的低层符号由 context.background 逐项规定；类型与摘要检查仅为 FINITE，不把背景解释自动当作证明。

## 参考

- 本案例《迁移验收清单》与关系正文。
- Lee, Introduction to Topological Manifolds, 2nd ed., Springer, 2011（拓扑、流形与可数性；按主题引用，未声称逐页复核）。
- Lee, Introduction to Smooth Manifolds, 2nd ed., Springer, 2013（微分、张量、形式与流；按主题引用）。
