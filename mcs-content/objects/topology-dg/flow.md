````mcs-object
{
  "schema": "mcs-object/1",
  "id": "obj:tdg:flow",
  "version": "1",
  "title": "局部流",
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
        "name": "LocalFlowLaw",
        "type": "o",
        "background": "局部光滑 Φ(t,p) 满足 Φ(0,p)=p, ∂tΦ(t,p)=X(Φ(t,p))；组合仅在共同定义域成立"
      }
    ]
  },
  "definitions": [],
  "assumptions": [],
  "declarations": [
    {
      "id": "definition",
      "kind": "formula",
      "source": "LocalFlowLaw",
      "status": "DEF"
    }
  ],
  "references": [
    {
      "id": "obj:tdg:vector-field",
      "version": "1",
      "anchor": "$",
      "formalHash": "sha256:bf09a53f23b5767aea7d67433601734b4b3a62444375a2c3fb29a154e1e2d3a7"
    },
    {
      "id": "obj:tdg:frechet",
      "version": "1",
      "anchor": "$",
      "formalHash": "sha256:934df91a6ede7a251bcc88df6b0c48fc4d555aa76117c91c5055931ff128669b"
    }
  ],
  "members": [],
  "imports": [],
  "exports": [],
  "links": [],
  "lean": []
}
````

# 局部流

把每点沿向量场的方向短时推进。

## 精确内容

Φ0=id，∂tΦt(p)=X(Φt(p))，局部满足 Φs∘Φt=Φ(s+t)。

## 依据与边界

DEF：存在唯一性使用光滑 ODE 定理；局部定义域不能省略。

形式接口中的低层符号由 context.background 逐项规定；类型与摘要检查仅为 FINITE，不把背景解释自动当作证明。

## 参考

- 本案例《迁移验收清单》与关系正文。
- Lee, Introduction to Topological Manifolds, 2nd ed., Springer, 2011（拓扑、流形与可数性；按主题引用，未声称逐页复核）。
- Lee, Introduction to Smooth Manifolds, 2nd ed., Springer, 2013（微分、张量、形式与流；按主题引用）。
