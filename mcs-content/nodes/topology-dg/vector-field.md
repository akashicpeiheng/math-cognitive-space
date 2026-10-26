````mcs-node
{
  "schema": "mcs-node/1",
  "id": "learn:tdg:vector-field",
  "version": "1",
  "title": "向量场",
  "case": "topology-dg",
  "goals": [
    "说明向量场的条件、用途和失败边界"
  ],
  "objects": [
    {
      "id": "obj:tdg:vector-field",
      "version": "1",
      "anchor": "$",
      "formalHash": "sha256:bf09a53f23b5767aea7d67433601734b4b3a62444375a2c3fb29a154e1e2d3a7"
    }
  ],
  "prerequisites": [],
  "routes": [
    {
      "id": "route:tdg:vector-field:1",
      "title": "切空间",
      "inputs": [
        {
          "id": "learn:tdg:tangent",
          "version": "1"
        }
      ]
    }
  ]
}
````

# 向量场

每点指定一个方向，还要让方向光滑变化。

## 精确内容

TM 的光滑截面 X，满足 π∘X=id。

## 依据与边界

DEF：与一个切空间中的向量严格区分。

形式接口中的低层符号由 context.background 逐项规定；类型与摘要检查仅为 FINITE，不把背景解释自动当作证明。

## 参考

- 本案例《迁移验收清单》与关系正文。
- Lee, Introduction to Topological Manifolds, 2nd ed., Springer, 2011（拓扑、流形与可数性；按主题引用，未声称逐页复核）。
- Lee, Introduction to Smooth Manifolds, 2nd ed., Springer, 2013（微分、张量、形式与流；按主题引用）。

## 怎样读

先用直觉重述本对象，再核对精确条件；阅读完成与掌握确认分开记录。

## 回看问题

去掉定义中的一项条件会改变什么？先检查表达仍有意义，再寻找反例或说明冗余。
