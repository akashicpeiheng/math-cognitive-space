````mcs-node
{
  "schema": "mcs-node/1",
  "id": "learn:tdg:curl",
  "version": "1",
  "title": "旋度",
  "case": "topology-dg",
  "goals": [
    "说明旋度的条件、用途和失败边界"
  ],
  "objects": [
    {
      "id": "obj:tdg:curl",
      "version": "1",
      "anchor": "$",
      "formalHash": "sha256:74260bb6bba1d0142e7a30d5364704524ae4b48c1973230dd0cdf73032faaaa2"
    }
  ],
  "prerequisites": [],
  "routes": [
    {
      "id": "route:tdg:curl:1",
      "title": "偏导数",
      "inputs": [
        {
          "id": "learn:tdg:partial",
          "version": "1"
        }
      ]
    }
  ]
}
````

# 旋度

在三维中度量局部环流，并把二形式重新识别成向量。

## 精确内容

在标准定向欧氏 R³ 中采用通常三分量偏导差公式。

## 依据与边界

DEF：经典向量值旋度限定三维及定向；不是任意维的同型算子。

形式接口中的低层符号由 context.background 逐项规定；类型与摘要检查仅为 FINITE，不把背景解释自动当作证明。

## 参考

- 本案例《迁移验收清单》与关系正文。
- Lee, Introduction to Topological Manifolds, 2nd ed., Springer, 2011（拓扑、流形与可数性；按主题引用，未声称逐页复核）。
- Lee, Introduction to Smooth Manifolds, 2nd ed., Springer, 2013（微分、张量、形式与流；按主题引用）。

## 怎样读

先用直觉重述本对象，再核对精确条件；阅读完成与掌握确认分开记录。

## 回看问题

去掉定义中的一项条件会改变什么？先检查表达仍有意义，再寻找反例或说明冗余。
