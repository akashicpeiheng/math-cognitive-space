````mcs-node
{
  "schema": "mcs-node/1",
  "id": "learn:tdg:tangent",
  "version": "1",
  "title": "切空间",
  "case": "topology-dg",
  "goals": [
    "说明切空间的条件、用途和失败边界"
  ],
  "objects": [
    {
      "id": "obj:tdg:tangent",
      "version": "1",
      "anchor": "$",
      "formalHash": "sha256:faf5aef9f1db873309a8ddb42686f2894808de79a0dd559d820b070b7205a74c"
    }
  ],
  "prerequisites": [],
  "routes": [
    {
      "id": "route:tdg:tangent:1",
      "title": "光滑流形 + 一元导数",
      "inputs": [
        {
          "id": "learn:tdg:smooth-manifold",
          "version": "1"
        },
        {
          "id": "learn:tdg:derivative",
          "version": "1"
        }
      ]
    }
  ]
}
````

# 切空间

用函数的瞬时变化来定义方向，避免依赖嵌入。

## 精确内容

TpM 为在 p 处光滑函数芽上满足 Leibniz 律的 R 线性导子空间；有限维光滑流形上等价于曲线速度。

## 依据与边界

DEF：这里只是一个点的空间；向量场还要求随点光滑变化。

形式接口中的低层符号由 context.background 逐项规定；类型与摘要检查仅为 FINITE，不把背景解释自动当作证明。

## 参考

- 本案例《迁移验收清单》与关系正文。
- Lee, Introduction to Topological Manifolds, 2nd ed., Springer, 2011（拓扑、流形与可数性；按主题引用，未声称逐页复核）。
- Lee, Introduction to Smooth Manifolds, 2nd ed., Springer, 2013（微分、张量、形式与流；按主题引用）。

## 怎样读

先用直觉重述本对象，再核对精确条件；阅读完成与掌握确认分开记录。

## 回看问题

去掉定义中的一项条件会改变什么？先检查表达仍有意义，再寻找反例或说明冗余。
