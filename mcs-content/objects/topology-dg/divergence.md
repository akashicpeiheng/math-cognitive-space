````mcs-object
{
  "schema": "mcs-object/1",
  "id": "obj:tdg:divergence",
  "version": "1",
  "title": "散度",
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
        "name": "DivergenceFormula",
        "type": "o",
        "background": "R^n 中 C1 向量场 F 的候选散度等于 Σi∂iFi；标准欧氏度量"
      }
    ]
  },
  "definitions": [],
  "assumptions": [],
  "declarations": [
    {
      "id": "definition",
      "kind": "formula",
      "source": "DivergenceFormula",
      "status": "DEF"
    }
  ],
  "references": [
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

# 散度

把流出微小体积的净通量写成一个标量。

## 精确内容

标准欧氏 R^n 中 div F=Σi∂iFi，F 至少 C¹。

## 依据与边界

DEF：坐标和必须配合欧氏度量；一般坐标另有体积密度因子。

形式接口中的低层符号由 context.background 逐项规定；类型与摘要检查仅为 FINITE，不把背景解释自动当作证明。

## 参考

- 本案例《迁移验收清单》与关系正文。
- Lee, Introduction to Topological Manifolds, 2nd ed., Springer, 2011（拓扑、流形与可数性；按主题引用，未声称逐页复核）。
- Lee, Introduction to Smooth Manifolds, 2nd ed., Springer, 2013（微分、张量、形式与流；按主题引用）。
