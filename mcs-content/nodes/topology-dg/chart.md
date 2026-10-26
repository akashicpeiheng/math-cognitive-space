````mcs-node
{
  "schema": "mcs-node/1",
  "id": "learn:tdg:chart",
  "version": "1",
  "title": "局部坐标图",
  "case": "topology-dg",
  "goals": [
    "说明局部坐标图的条件、用途和失败边界"
  ],
  "objects": [
    {
      "id": "obj:tdg:chart",
      "version": "1",
      "anchor": "$",
      "formalHash": "sha256:79f8585586698e9c8a1015d0114cb9b55a2b195cfb7764107b204dfe826088cb"
    }
  ],
  "prerequisites": [],
  "routes": [
    {
      "id": "route:tdg:chart:1",
      "title": "拓扑结构 + 同胚",
      "inputs": [
        {
          "id": "learn:tdg:topology",
          "version": "1"
        },
        {
          "id": "learn:tdg:homeomorphism",
          "version": "1"
        }
      ]
    }
  ]
}
````

# 局部坐标图

把一块空间送入欧氏空间，才有坐标。

## 精确内容

图 (U,φ) 中 U⊆M 开，φ:U→V⊆R^n 是到开集 V 的同胚。

## 依据与边界

DEF：U 是局部定义域；不要求 M 自身同胚于欧氏开集。

形式接口中的低层符号由 context.background 逐项规定；类型与摘要检查仅为 FINITE，不把背景解释自动当作证明。

## 参考

- 本案例《迁移验收清单》与关系正文。
- Lee, Introduction to Topological Manifolds, 2nd ed., Springer, 2011（拓扑、流形与可数性；按主题引用，未声称逐页复核）。
- Lee, Introduction to Smooth Manifolds, 2nd ed., Springer, 2013（微分、张量、形式与流；按主题引用）。

## 怎样读

先用直觉重述本对象，再核对精确条件；阅读完成与掌握确认分开记录。

## 回看问题

去掉定义中的一项条件会改变什么？先检查表达仍有意义，再寻找反例或说明冗余。
