````mcs-node
{
  "schema": "mcs-node/1",
  "id": "learn:tdg:formal-adjoint",
  "version": "1",
  "title": "梯度与负散度的形式伴随",
  "case": "topology-dg",
  "goals": [
    "说明梯度与负散度的形式伴随的条件、用途和失败边界"
  ],
  "objects": [
    {
      "id": "obj:tdg:formal-adjoint",
      "version": "1",
      "anchor": "$",
      "formalHash": "sha256:a783e8768e5f8cd5909f575f234ab964e3698b2f3fe86b9a85cb7c7bd0d80f36"
    }
  ],
  "prerequisites": [],
  "routes": [
    {
      "id": "route:tdg:formal-adjoint:1",
      "title": "梯度 + 散度",
      "inputs": [
        {
          "id": "learn:tdg:gradient",
          "version": "1"
        },
        {
          "id": "learn:tdg:divergence",
          "version": "1"
        }
      ]
    }
  ]
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

## 怎样读

先用直觉重述本对象，再核对精确条件；阅读完成与掌握确认分开记录。

## 回看问题

指出论证使用每项假设的位置；若省略光滑性、分离性或定义域条件，哪一步失去依据？
