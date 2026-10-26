````mcs-object
{
  "schema": "mcs-object/1",
  "id": "obj:tdg:curl",
  "version": "1",
  "title": "旋度",
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
        "name": "CurlFormula",
        "type": "o",
        "background": "R^3 中 C1 向量场 F 的候选旋度等于 (∂2F3-∂3F2,∂3F1-∂1F3,∂1F2-∂2F1)；标准定向"
      }
    ]
  },
  "definitions": [],
  "assumptions": [],
  "declarations": [
    {
      "id": "definition",
      "kind": "formula",
      "source": "CurlFormula",
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

# 旋度

在三维中度量局部环流，并把二形式重新识别成向量。

## 精确内容

在标准定向欧氏 R³ 中采用通常三分量偏导差公式。

## 依据与边界

DEF：经典向量值旋度限定三维及定向；不是任意维的同型算子。

形式接口中的低层符号由 context.background 逐项规定；类型与摘要检查仅为 FINITE，不把背景解释自动当作证明。

## 参考

- 本案例《迁移验收清单》与关系正文。
- Lee, Introduction to Topological Manifolds, 2nd ed., Springer, 2011（拓扑、流形与可数性；按主题引用，未声称逐页复核）。
- Lee, Introduction to Smooth Manifolds, 2nd ed., Springer, 2013（微分、张量、形式与流；按主题引用）。
