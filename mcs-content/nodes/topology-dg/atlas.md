````mcs-node
{
  "schema": "mcs-node/1",
  "id": "learn:tdg:atlas",
  "version": "1",
  "title": "图册",
  "case": "topology-dg",
  "goals": [
    "说明图册的条件、用途和失败边界"
  ],
  "objects": [
    {
      "id": "obj:tdg:atlas",
      "version": "1",
      "anchor": "$",
      "formalHash": "sha256:50fdb0ecd27a589ba7f06a49369e8fb4ba0c9e80f09c41e58902447b78df2118"
    }
  ],
  "prerequisites": [],
  "routes": [
    {
      "id": "route:tdg:atlas:1",
      "title": "局部坐标图",
      "inputs": [
        {
          "id": "learn:tdg:chart",
          "version": "1"
        }
      ]
    }
  ]
}
````

# 图册

一张图往往盖不住全空间，先允许多张图拼接。

## 精确内容

一族局部坐标图，其定义域覆盖 M。

## 依据与边界

DEF：拓扑图册没有自动的光滑相容性；定义图册不先假设光滑流形。

形式接口中的低层符号由 context.background 逐项规定；类型与摘要检查仅为 FINITE，不把背景解释自动当作证明。

## 参考

- 本案例《迁移验收清单》与关系正文。
- Lee, Introduction to Topological Manifolds, 2nd ed., Springer, 2011（拓扑、流形与可数性；按主题引用，未声称逐页复核）。
- Lee, Introduction to Smooth Manifolds, 2nd ed., Springer, 2013（微分、张量、形式与流；按主题引用）。

## 怎样读

先用直觉重述本对象，再核对精确条件；阅读完成与掌握确认分开记录。

## 回看问题

去掉定义中的一项条件会改变什么？先检查表达仍有意义，再寻找反例或说明冗余。
