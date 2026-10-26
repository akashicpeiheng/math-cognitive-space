````mcs-object
{
  "schema": "mcs-object/1",
  "id": "obj:tdg:formal-adjoint",
  "version": "1",
  "title": "梯度与负散度的形式伴随",
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
        "name": "AdjointEquation",
        "type": "o",
        "background": "欧氏开集上光滑紧支撑 f,F 满足 ∫<grad f,F>=-∫f div F；支撑条件消去边界项"
      }
    ]
  },
  "definitions": [],
  "assumptions": [],
  "declarations": [
    {
      "id": "claim",
      "kind": "formula",
      "source": "AdjointEquation",
      "status": "PROOF"
    }
  ],
  "references": [
    {
      "id": "obj:tdg:gradient",
      "version": "1",
      "anchor": "$",
      "formalHash": "sha256:f2c51eb95f719bb2ee7252efcda7ef3d5ec2bb994dd5ddc7e9240bbfc7d09020"
    },
    {
      "id": "obj:tdg:divergence",
      "version": "1",
      "anchor": "$",
      "formalHash": "sha256:6806bcc3b80aed0e0c773aae27ed8afbcd89361b89ee304216e104832a986565"
    }
  ],
  "members": [],
  "imports": [],
  "exports": [],
  "links": [],
  "lean": []
}
````

# 梯度与负散度的形式伴随

先把条件写全，再问结论是否还能失效。

## 精确内容

分部积分：逐坐标积分 ∂if·Fi=∂i(fFi)−f∂iFi，再求和。紧支撑使边界积分为0；有边界且非紧支撑时必须保留通量边界项。这是算子的形式伴随，非向量空间线性对偶。

## 依据与边界

PROOF / REF：PROOF 表示附有正文论证；结构检查不替代证明。人工对应审阅 pending。

形式接口中的低层符号由 context.background 逐项规定；类型与摘要检查仅为 FINITE，不把背景解释自动当作证明。

## 参考

- 本案例《迁移验收清单》与关系正文。
- Lee, Introduction to Topological Manifolds, 2nd ed., Springer, 2011（拓扑、流形与可数性；按主题引用，未声称逐页复核）。
- Lee, Introduction to Smooth Manifolds, 2nd ed., Springer, 2013（微分、张量、形式与流；按主题引用）。
