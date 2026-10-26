````mcs-node
{
  "schema": "mcs-node/1",
  "id": "learn:tdg:smooth-atlas",
  "version": "1",
  "title": "光滑图册",
  "case": "topology-dg",
  "goals": [
    "说明光滑图册的条件、用途和失败边界"
  ],
  "objects": [
    {
      "id": "obj:tdg:smooth-atlas",
      "version": "1",
      "anchor": "$",
      "formalHash": "sha256:e18b82814091b24a3672725e22121d3658fcdf88859bf0d19229cb1516c067e7"
    }
  ],
  "prerequisites": [],
  "routes": [
    {
      "id": "route:tdg:smooth-atlas:1",
      "title": "图册 + Fréchet 全导数",
      "inputs": [
        {
          "id": "learn:tdg:atlas",
          "version": "1"
        },
        {
          "id": "learn:tdg:frechet",
          "version": "1"
        }
      ]
    }
  ]
}
````

# 光滑图册

在重叠区校验同一计算换坐标后仍可微。

## 精确内容

覆盖全空间的图册，其全部重叠过渡映射为 C∞。

## 依据与边界

DEF：相容性是双向坐标变换条件；背景实微积分不假设任何待证流形定理。

形式接口中的低层符号由 context.background 逐项规定；类型与摘要检查仅为 FINITE，不把背景解释自动当作证明。

## 参考

- 本案例《迁移验收清单》与关系正文。
- Lee, Introduction to Topological Manifolds, 2nd ed., Springer, 2011（拓扑、流形与可数性；按主题引用，未声称逐页复核）。
- Lee, Introduction to Smooth Manifolds, 2nd ed., Springer, 2013（微分、张量、形式与流；按主题引用）。

## 怎样读

先用直觉重述本对象，再核对精确条件；阅读完成与掌握确认分开记录。

## 回看问题

去掉定义中的一项条件会改变什么？先检查表达仍有意义，再寻找反例或说明冗余。
