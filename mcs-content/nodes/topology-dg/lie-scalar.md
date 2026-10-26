````mcs-node
{
  "schema": "mcs-node/1",
  "id": "learn:tdg:lie-scalar",
  "version": "1",
  "title": "Lie 导数在标量场上的限制",
  "case": "topology-dg",
  "goals": [
    "说明Lie 导数在标量场上的限制的条件、证明与边界"
  ],
  "objects": [
    {
      "id": "obj:tdg:lie-scalar",
      "version": "1",
      "anchor": "claim",
      "formalHash": "sha256:2858d00998b01e473de8deeb5942eeacb71d358211bd9e17e3117539294788ee"
    }
  ],
  "prerequisites": [],
  "routes": [
    {
      "id": "route:tdg:lie-scalar:1",
      "title": "定义展开与坐标核对",
      "inputs": [
        {
          "id": "learn:tdg:lie",
          "version": "1"
        },
        {
          "id": "learn:tdg:directional",
          "version": "1"
        },
        {
          "id": "learn:tdg:vector-field",
          "version": "1"
        },
        {
          "id": "learn:tdg:flow",
          "version": "1"
        }
      ]
    }
  ]
}
````

# Lie 导数在标量场上的限制

先核对作用域，再按定义展开。

## 精确内容与依据

对光滑函数 f 与光滑向量场 X，在局部流共同定义域内，\(\mathcal L_X f(p)=D_{X_p}f\)。局部流曲线 t↦Φ_t(p) 过 p，初速度为 X_p。把流定义中的 Φ_t^*f(p) 写为 f(Φ_t(p))，按曲线方向微分的定义求 t=0 导数即得等式。只限制作用域为标量场；不把任意点态方向导数说成已给定的全局向量场。V 为带基点切向量接口；一般张量场的拉回还需逆微分。

PROOF：正文论证，未登记机器重放；人工审阅 pending。

## 回看问题

哪一步使用了光滑性、度量、定向和维数？

## 参考

- 对应形式命题的参考文献。
