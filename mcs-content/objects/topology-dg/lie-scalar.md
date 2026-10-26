````mcs-object
{
  "schema": "mcs-object/1",
  "id": "obj:tdg:lie-scalar",
  "version": "1",
  "title": "Lie 导数在标量场上的限制",
  "language": "mcs-formal/1",
  "grammar": "mcs-object-grammar/1",
  "scale": "unit",
  "context": {
    "signature": "signature:topology-dg/1",
    "bases": [
      "o",
      "X",
      "R",
      "V"
    ],
    "constants": [
      {
        "name": "SmoothScalar",
        "type": "(X -> R) -> o",
        "background": "定义在本案例光滑流形上的光滑实函数谓词"
      },
      {
        "name": "LieScalar",
        "type": "(X -> R) -> X -> R",
        "background": "由局部流拉回定义的标量 Lie 导数；尚未假定与方向微分相等"
      },
      {
        "name": "DirectionalAt",
        "type": "(X -> R) -> X -> V -> R",
        "background": "在点 p 沿切向量 v 的曲线方向微分；光滑函数时与所选代表曲线无关"
      },
      {
        "name": "Velocity",
        "type": "X -> V",
        "background": "固定光滑向量场在各点的切向量；V 使用带基点标记的切向量接口"
      }
    ]
  },
  "definitions": [],
  "assumptions": [],
  "declarations": [
    {
      "id": "claim",
      "kind": "formula",
      "source": "forall f:X -> R p:X. SmoothScalar f -> LieScalar f p = DirectionalAt f p (Velocity p)",
      "status": "PROOF"
    }
  ],
  "references": [
    {
      "id": "obj:tdg:lie",
      "version": "1",
      "anchor": "$",
      "formalHash": "sha256:0e6a4b822c743b43b41b1c686cef36a83def4156afe2fb478d008abf9b48932c"
    },
    {
      "id": "obj:tdg:directional",
      "version": "1",
      "anchor": "$",
      "formalHash": "sha256:8fe36dbd9d35e2958a215f376f8fa99b2b2096a1cd6b3741aa0eed3094e24b45"
    },
    {
      "id": "obj:tdg:vector-field",
      "version": "1",
      "anchor": "$",
      "formalHash": "sha256:bf09a53f23b5767aea7d67433601734b4b3a62444375a2c3fb29a154e1e2d3a7"
    },
    {
      "id": "obj:tdg:flow",
      "version": "1",
      "anchor": "$",
      "formalHash": "sha256:011ec27722a70679b9c50dc3f9ed74b257d68f440dd3c464873beb0ae67285e8"
    }
  ],
  "members": [],
  "imports": [],
  "exports": [],
  "links": [],
  "lean": []
}
````

# Lie 导数在标量场上的限制

同一个变化率为什么会有不同的表达？先比较输入、输出，再指定识别映射。

## 精确内容与证明

对光滑函数 f 与光滑向量场 X，在局部流共同定义域内，\(\mathcal L_X f(p)=D_{X_p}f\)。局部流曲线 t↦Φ_t(p) 过 p，初速度为 X_p。把流定义中的 Φ_t^*f(p) 写为 f(Φ_t(p))，按曲线方向微分的定义求 t=0 导数即得等式。只限制作用域为标量场；不把任意点态方向导数说成已给定的全局向量场。V 为带基点切向量接口；一般张量场的拉回还需逆微分。

## 依据与边界

PROOF：正文的定义展开与坐标论证；未登记机器证明，人工对应审阅 pending。背景只约定各算子的独立定义，不假定本命题等式。

## 参考

- Lee, Introduction to Smooth Manifolds, 2nd ed., Springer, 2013，张量、微分形式与流相关章节（主题引用，未声称逐页核对）。
