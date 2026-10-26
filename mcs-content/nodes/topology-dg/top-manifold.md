````mcs-node
{
  "schema": "mcs-node/1",
  "id": "learn:tdg:top-manifold",
  "version": "1",
  "title": "拓扑流形",
  "case": "topology-dg",
  "goals": [
    "说明拓扑流形的条件、用途和失败边界"
  ],
  "objects": [
    {
      "id": "obj:tdg:top-manifold",
      "version": "1",
      "anchor": "$",
      "formalHash": "sha256:4967c512c3592d2a0b1f1fa6562ffae9c85454c6aefb985c45779992d1cc2a6e"
    }
  ],
  "prerequisites": [],
  "routes": [
    {
      "id": "route:tdg:top-manifold:1",
      "title": "Hausdorff／T₂ 空间 + 第二可数 C₂ + 局部欧氏性",
      "inputs": [
        {
          "id": "learn:tdg:t2",
          "version": "1"
        },
        {
          "id": "learn:tdg:c2",
          "version": "1"
        },
        {
          "id": "learn:tdg:local-euclidean",
          "version": "1"
        }
      ]
    }
  ]
}
````

# 拓扑流形

局部像欧氏空间，还需排除无法分离与过多坐标块的病态。

## 精确内容

固定 n≥0，M Hausdorff、第二可数、局部同胚于 R^n。

## 依据与边界

DEF：本案例三条件并用；不使用允许非 Hausdorff 的流形定义。

形式接口中的低层符号由 context.background 逐项规定；类型与摘要检查仅为 FINITE，不把背景解释自动当作证明。

## 参考

- 本案例《迁移验收清单》与关系正文。
- Lee, Introduction to Topological Manifolds, 2nd ed., Springer, 2011（拓扑、流形与可数性；按主题引用，未声称逐页复核）。
- Lee, Introduction to Smooth Manifolds, 2nd ed., Springer, 2013（微分、张量、形式与流；按主题引用）。

## 怎样读

先用直觉重述本对象，再核对精确条件；阅读完成与掌握确认分开记录。

## 回看问题

去掉定义中的一项条件会改变什么？先检查表达仍有意义，再寻找反例或说明冗余。
