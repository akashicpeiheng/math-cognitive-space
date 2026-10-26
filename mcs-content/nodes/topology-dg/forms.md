````mcs-node
{
  "schema": "mcs-node/1",
  "id": "learn:tdg:forms",
  "version": "1",
  "title": "微分形式",
  "case": "topology-dg",
  "goals": [
    "说明微分形式的条件、用途和失败边界"
  ],
  "objects": [
    {
      "id": "obj:tdg:forms",
      "version": "1",
      "anchor": "$",
      "formalHash": "sha256:b3464e9cc85a77a11178290d5a90eceaf97a17a89167a874a671d6d59a876082"
    }
  ],
  "prerequisites": [],
  "routes": [
    {
      "id": "route:tdg:forms:1",
      "title": "张量场 + 点态余切空间",
      "inputs": [
        {
          "id": "learn:tdg:tensor-field",
          "version": "1"
        },
        {
          "id": "learn:tdg:cotangent",
          "version": "1"
        }
      ]
    },
    {
      "id": "route:tdg:forms:2",
      "title": "点态余切空间 + 光滑流形",
      "inputs": [
        {
          "id": "learn:tdg:cotangent",
          "version": "1"
        },
        {
          "id": "learn:tdg:smooth-manifold",
          "version": "1"
        }
      ]
    }
  ]
}
````

# 微分形式

积分需要随点变化、且交换方向会变号的多线性数据。

## 精确内容

光滑 k 形式是 Λ^k T*M 的光滑截面；k=0 时是光滑函数。

## 依据与边界

DEF：点处余切向量是一形式的纤维值；不等于整个全局一形式。

形式接口中的低层符号由 context.background 逐项规定；类型与摘要检查仅为 FINITE，不把背景解释自动当作证明。

## 参考

- 本案例《迁移验收清单》与关系正文。
- Lee, Introduction to Topological Manifolds, 2nd ed., Springer, 2011（拓扑、流形与可数性；按主题引用，未声称逐页复核）。
- Lee, Introduction to Smooth Manifolds, 2nd ed., Springer, 2013（微分、张量、形式与流；按主题引用）。

## 怎样读

先用直觉重述本对象，再核对精确条件；阅读完成与掌握确认分开记录。本节点有多条替代引入路线，每条路线的输入同时需要；不同路线不合并成全部必修。

## 回看问题

去掉定义中的一项条件会改变什么？先检查表达仍有意义，再寻找反例或说明冗余。
