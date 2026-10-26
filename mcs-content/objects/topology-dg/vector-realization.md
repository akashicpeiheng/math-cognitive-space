````mcs-object
{
  "schema": "mcs-object/1",
  "id": "obj:tdg:vector-realization",
  "version": "1",
  "title": "欧氏三维向量分析的外微分实现",
  "language": "mcs-formal/1",
  "grammar": "mcs-object-grammar/1",
  "scale": "unit",
  "context": {
    "signature": "signature:topology-dg/1",
    "bases": [
      "o",
      "X",
      "R",
      "ScalarField",
      "VectorField",
      "OneForm",
      "TwoForm",
      "ThreeForm"
    ],
    "constants": [
      {
        "name": "Grad",
        "type": "ScalarField -> VectorField",
        "background": "标准欧氏 R³ 上的梯度，输入光滑函数"
      },
      {
        "name": "Curl",
        "type": "VectorField -> VectorField",
        "background": "标准定向 R³ 上坐标定义的旋度"
      },
      {
        "name": "Div",
        "type": "VectorField -> ScalarField",
        "background": "R³ 上导数矩阵迹定义的散度"
      },
      {
        "name": "Flat",
        "type": "VectorField -> OneForm",
        "background": "由标准正定欧氏内积降指标"
      },
      {
        "name": "D0",
        "type": "ScalarField -> OneForm",
        "background": "外微分在零形式上的分量 ∂i f"
      },
      {
        "name": "D1",
        "type": "OneForm -> TwoForm",
        "background": "外微分在一形式上按 ∂i αj−∂j αi 定义"
      },
      {
        "name": "D2",
        "type": "TwoForm -> ThreeForm",
        "background": "外微分在二形式上的坐标交替和"
      },
      {
        "name": "Star21",
        "type": "TwoForm -> OneForm",
        "background": "标准定向 dx∧dy∧dz 下的 Hodge 星 Ω²→Ω¹"
      },
      {
        "name": "Star12",
        "type": "OneForm -> TwoForm",
        "background": "同一定向下的 Hodge 星 Ω¹→Ω²"
      },
      {
        "name": "Star30",
        "type": "ThreeForm -> ScalarField",
        "background": "同一定向下的 Hodge 星 Ω³→Ω⁰"
      }
    ]
  },
  "definitions": [],
  "assumptions": [],
  "declarations": [
    {
      "id": "claim",
      "kind": "formula",
      "source": "forall f:ScalarField F:VectorField. (Flat (Grad f) = D0 f) ∧ (Flat (Curl F) = Star21 (D1 (Flat F))) ∧ (Div F = Star30 (D2 (Star12 (Flat F))))",
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
      "id": "obj:tdg:curl",
      "version": "1",
      "anchor": "$",
      "formalHash": "sha256:74260bb6bba1d0142e7a30d5364704524ae4b48c1973230dd0cdf73032faaaa2"
    },
    {
      "id": "obj:tdg:divergence",
      "version": "1",
      "anchor": "$",
      "formalHash": "sha256:6806bcc3b80aed0e0c773aae27ed8afbcd89361b89ee304216e104832a986565"
    },
    {
      "id": "obj:tdg:exterior",
      "version": "1",
      "anchor": "$",
      "formalHash": "sha256:68670268c11c1999c48f6bd60ea2b9000bb04963f17fcf0c505b80aec38b2c74"
    },
    {
      "id": "obj:tdg:hodge",
      "version": "1",
      "anchor": "$",
      "formalHash": "sha256:57e9d7554ac5093231182095e6353c366ec0fedd5af66c99a8c29835a0202448"
    },
    {
      "id": "obj:tdg:metric",
      "version": "1",
      "anchor": "$",
      "formalHash": "sha256:b582dd3b47d315238f890fda61fb3144a9de5437efc539a084e9304d50ac8491"
    }
  ],
  "members": [],
  "imports": [],
  "exports": [],
  "links": [],
  "lean": []
}
````

# 欧氏三维向量分析的外微分实现

同一个变化率为什么会有不同的表达？先比较输入、输出，再指定识别映射。

## 精确内容与证明

固定标准定向的欧氏三维空间，ScalarField、VectorField 与各次形式接口取光滑场。\((\operatorname{grad}f)^\flat=df\)，\((\operatorname{curl}F)^\flat=*d(F^\flat)\)，\(\operatorname{div}F=*d*(F^\flat)\)。逐坐标检查：第一式的 dx^i 系数同为 ∂i f；d(F♭) 的 dy∧dz、dz∧dx、dx∧dy 系数依次是 ∂yFz−∂zFy、∂zFx−∂xFz、∂xFy−∂yFx，Hodge 星送到 dx、dy、dz；而 *F♭=Fx dy∧dz+Fy dz∧dx+Fz dx∧dy，其外微分系数是 ∂xFx+∂yFy+∂zFz。两次 Hodge 操作都使用同一度量与定向。本命题不声称任意维数都有向量值旋度，也不声称非定向流形上有这一全局星算子。

## 依据与边界

PROOF：正文的定义展开与坐标论证；未登记机器证明，人工对应审阅 pending。背景只约定各算子的独立定义，不假定本命题等式。

## 参考

- Lee, Introduction to Smooth Manifolds, 2nd ed., Springer, 2013，张量、微分形式与流相关章节（主题引用，未声称逐页核对）。
