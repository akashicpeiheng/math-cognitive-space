````mcs-object
{
  "schema": "mcs-object/1",
  "id": "obj:tdg:cotangent",
  "version": "1",
  "title": "点态余切空间",
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
        "name": "CovectorLinear",
        "type": "o",
        "background": "固定 p 的候选余切向量是 TpM→R 的线性映射，不要求随 p 变化"
      }
    ]
  },
  "definitions": [],
  "assumptions": [],
  "declarations": [
    {
      "id": "definition",
      "kind": "formula",
      "source": "CovectorLinear",
      "status": "DEF"
    }
  ],
  "references": [
    {
      "id": "obj:tdg:tangent",
      "version": "1",
      "anchor": "$",
      "formalHash": "sha256:faf5aef9f1db873309a8ddb42686f2894808de79a0dd559d820b070b7205a74c"
    }
  ],
  "members": [],
  "imports": [],
  "exports": [],
  "links": [],
  "lean": []
}
````

# 点态余切空间

方向的线性读数构成切空间的对偶。

## 精确内容

Tp*M=Hom_R(TpM,R)。

## 依据与边界

DEF：这里只是一个点 p 的纤维；不等同于 Ω¹(M)。

形式接口中的低层符号由 context.background 逐项规定；类型与摘要检查仅为 FINITE，不把背景解释自动当作证明。

## 参考

- 本案例《迁移验收清单》与关系正文。
- Lee, Introduction to Topological Manifolds, 2nd ed., Springer, 2011（拓扑、流形与可数性；按主题引用，未声称逐页复核）。
- Lee, Introduction to Smooth Manifolds, 2nd ed., Springer, 2013（微分、张量、形式与流；按主题引用）。
