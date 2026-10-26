````mcs-node
{
  "schema": "mcs-node/1",
  "id": "learn:tdg:smooth-manifold",
  "version": "1",
  "title": "光滑流形",
  "case": "topology-dg",
  "goals": [
    "说明光滑流形的条件、用途和失败边界"
  ],
  "objects": [
    {
      "id": "obj:tdg:smooth-manifold",
      "version": "1",
      "anchor": "$",
      "formalHash": "sha256:a787e1f01f9e43f3dcd668a7ef27c82447433c4d95ccd5c5422bbecb9785c691"
    }
  ],
  "prerequisites": [],
  "routes": [
    {
      "id": "route:tdg:smooth-manifold:1",
      "title": "拓扑流形 + 光滑图册",
      "inputs": [
        {
          "id": "learn:tdg:top-manifold",
          "version": "1"
        },
        {
          "id": "learn:tdg:smooth-atlas",
          "version": "1"
        }
      ]
    }
  ]
}
````

# 光滑流形

比较不同坐标中的微分计算，需要过渡映射光滑。

## 精确内容

拓扑 n 流形配备一个 C∞ 相容图册的极大化；相容图册生成相同光滑结构。

## 依据与边界

DEF：同一拓扑流形的光滑结构不必唯一；不声称处处存在。

形式接口中的低层符号由 context.background 逐项规定；类型与摘要检查仅为 FINITE，不把背景解释自动当作证明。

## 参考

- 本案例《迁移验收清单》与关系正文。
- Lee, Introduction to Topological Manifolds, 2nd ed., Springer, 2011（拓扑、流形与可数性；按主题引用，未声称逐页复核）。
- Lee, Introduction to Smooth Manifolds, 2nd ed., Springer, 2013（微分、张量、形式与流；按主题引用）。

## 怎样读

先用直觉重述本对象，再核对精确条件；阅读完成与掌握确认分开记录。

## 回看问题

去掉定义中的一项条件会改变什么？先检查表达仍有意义，再寻找反例或说明冗余。
