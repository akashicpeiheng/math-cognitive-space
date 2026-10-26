````mcs-node
{
  "schema": "mcs-node/1",
  "id": "learn:tdg:derivative",
  "version": "1",
  "title": "一元导数",
  "case": "topology-dg",
  "goals": [
    "说明一元导数的条件、用途和失败边界"
  ],
  "objects": [
    {
      "id": "obj:tdg:derivative",
      "version": "1",
      "anchor": "$",
      "formalHash": "sha256:fa47019fbd377d68a02aad914a80c9e4dbe5f5b473d3f660ed37add394af1217"
    }
  ],
  "prerequisites": [],
  "routes": [
    {
      "id": "route:tdg:derivative:1",
      "title": "直接引入（背景在正文列明）",
      "inputs": []
    }
  ]
}
````

# 一元导数

先沿一条实直线观察变化率。

## 精确内容

f:R→R 在 x 的导数是差商极限；向量值情形另说明陪域。

## 依据与边界

DEF：本项为一元导数，不用它替代 Fréchet 全导数。

形式接口中的低层符号由 context.background 逐项规定；类型与摘要检查仅为 FINITE，不把背景解释自动当作证明。

## 参考

- 本案例《迁移验收清单》与关系正文。
- Lee, Introduction to Topological Manifolds, 2nd ed., Springer, 2011（拓扑、流形与可数性；按主题引用，未声称逐页复核）。
- Lee, Introduction to Smooth Manifolds, 2nd ed., Springer, 2013（微分、张量、形式与流；按主题引用）。

## 怎样读

先用直觉重述本对象，再核对精确条件；阅读完成与掌握确认分开记录。

## 回看问题

去掉定义中的一项条件会改变什么？先检查表达仍有意义，再寻找反例或说明冗余。
