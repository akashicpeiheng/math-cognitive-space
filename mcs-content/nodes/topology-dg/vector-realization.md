````mcs-node
{
  "schema": "mcs-node/1",
  "id": "learn:tdg:vector-realization",
  "version": "1",
  "title": "欧氏三维向量分析的外微分实现",
  "case": "topology-dg",
  "goals": [
    "说明欧氏三维向量分析的外微分实现的条件、证明与边界"
  ],
  "objects": [
    {
      "id": "obj:tdg:vector-realization",
      "version": "1",
      "anchor": "claim",
      "formalHash": "sha256:4a6e3c562fd48e9cf6569b5b8cc442126cc4715c4d09ae2473c9d3f193810a45"
    }
  ],
  "prerequisites": [],
  "routes": [
    {
      "id": "route:tdg:vector-realization:1",
      "title": "定义展开与坐标核对",
      "inputs": [
        {
          "id": "learn:tdg:gradient",
          "version": "1"
        },
        {
          "id": "learn:tdg:curl",
          "version": "1"
        },
        {
          "id": "learn:tdg:divergence",
          "version": "1"
        },
        {
          "id": "learn:tdg:exterior",
          "version": "1"
        },
        {
          "id": "learn:tdg:hodge",
          "version": "1"
        },
        {
          "id": "learn:tdg:metric",
          "version": "1"
        }
      ]
    }
  ]
}
````

# 欧氏三维向量分析的外微分实现

先核对作用域，再按定义展开。

## 精确内容与依据

固定标准定向的欧氏三维空间，ScalarField、VectorField 与各次形式接口取光滑场。\((\operatorname{grad}f)^\flat=df\)，\((\operatorname{curl}F)^\flat=*d(F^\flat)\)，\(\operatorname{div}F=*d*(F^\flat)\)。逐坐标检查：第一式的 dx^i 系数同为 ∂i f；d(F♭) 的 dy∧dz、dz∧dx、dx∧dy 系数依次是 ∂yFz−∂zFy、∂zFx−∂xFz、∂xFy−∂yFx，Hodge 星送到 dx、dy、dz；而 *F♭=Fx dy∧dz+Fy dz∧dx+Fz dx∧dy，其外微分系数是 ∂xFx+∂yFy+∂zFz。两次 Hodge 操作都使用同一度量与定向。本命题不声称任意维数都有向量值旋度，也不声称非定向流形上有这一全局星算子。

PROOF：正文论证，未登记机器重放；人工审阅 pending。

## 回看问题

哪一步使用了光滑性、度量、定向和维数？

## 参考

- 对应形式命题的参考文献。
