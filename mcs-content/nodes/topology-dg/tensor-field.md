````mcs-node
{
  "schema": "mcs-node/1",
  "id": "learn:tdg:tensor-field",
  "version": "1",
  "title": "张量场",
  "case": "topology-dg",
  "goals": [
    "说明张量场的条件、用途和失败边界"
  ],
  "objects": [
    {
      "id": "obj:tdg:tensor-field",
      "version": "1",
      "anchor": "$",
      "formalHash": "sha256:7a8202e0aafca44042779469f219aac1a0f3b83854848fb25506fc852e16b2f2"
    }
  ],
  "prerequisites": [],
  "routes": [
    {
      "id": "route:tdg:tensor-field:1",
      "title": "点态张量 + 光滑流形 + 切空间",
      "inputs": [
        {
          "id": "learn:tdg:tensor",
          "version": "1"
        },
        {
          "id": "learn:tdg:smooth-manifold",
          "version": "1"
        },
        {
          "id": "learn:tdg:tangent",
          "version": "1"
        }
      ]
    }
  ]
}
````

# 张量场

把点态多线性数据随点光滑安排。

## 精确内容

光滑截面 T∈Γ((TM)⊗r⊗(T*M)⊗s)。

## 依据与边界

DEF：光滑性是额外要求；一般张量无须依赖切空间。

形式接口中的低层符号由 context.background 逐项规定；类型与摘要检查仅为 FINITE，不把背景解释自动当作证明。

## 参考

- 本案例《迁移验收清单》与关系正文。
- Lee, Introduction to Topological Manifolds, 2nd ed., Springer, 2011（拓扑、流形与可数性；按主题引用，未声称逐页复核）。
- Lee, Introduction to Smooth Manifolds, 2nd ed., Springer, 2013（微分、张量、形式与流；按主题引用）。

## 怎样读

先用直觉重述本对象，再核对精确条件；阅读完成与掌握确认分开记录。

## 回看问题

去掉定义中的一项条件会改变什么？先检查表达仍有意义，再寻找反例或说明冗余。
