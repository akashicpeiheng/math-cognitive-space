````mcs-object
{
  "schema": "mcs-object/1",
  "id": "obj:tdg:homeomorphism",
  "version": "1",
  "title": "同胚",
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
        "name": "Continuous",
        "type": "o",
        "background": "指定映射 f:X→Y 对所有开集的逆像开；定义不要求双射"
      },
      {
        "name": "Bijective",
        "type": "o",
        "background": "指定映射 f 为双射"
      },
      {
        "name": "InverseContinuous",
        "type": "o",
        "background": "指定双射的逆映射连续"
      }
    ]
  },
  "definitions": [],
  "assumptions": [],
  "declarations": [
    {
      "id": "definition",
      "kind": "formula",
      "source": "Continuous ∧ Bijective ∧ InverseContinuous",
      "status": "DEF"
    }
  ],
  "references": [
    {
      "id": "obj:tdg:continuous",
      "version": "1",
      "anchor": "$",
      "formalHash": "sha256:dd998f46758ecfc4be3f7c85750993253244e4f62c2f956e671bb2c88e2dea57"
    }
  ],
  "members": [],
  "imports": [],
  "exports": [],
  "links": [],
  "lean": []
}
````

# 同胚

连续可逆且逆向也连续，才真正保留邻近关系。

## 精确内容

映射 f:X→Y 为双射，且 f、f⁻¹ 均连续。

## 依据与边界

DEF：连续双射不足：恒等映射从离散实线到通常实线的逆不连续。

形式接口中的低层符号由 context.background 逐项规定；类型与摘要检查仅为 FINITE，不把背景解释自动当作证明。

## 参考

- 本案例《迁移验收清单》与关系正文。
- Lee, Introduction to Topological Manifolds, 2nd ed., Springer, 2011（拓扑、流形与可数性；按主题引用，未声称逐页复核）。
- Lee, Introduction to Smooth Manifolds, 2nd ed., Springer, 2013（微分、张量、形式与流；按主题引用）。
