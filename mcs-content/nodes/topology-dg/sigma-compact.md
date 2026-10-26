````mcs-node
{
  "schema": "mcs-node/1",
  "id": "learn:tdg:sigma-compact",
  "version": "1",
  "title": "σ 紧空间",
  "case": "topology-dg",
  "goals": [
    "说明σ 紧空间的条件、用途和失败边界"
  ],
  "objects": [
    {
      "id": "obj:tdg:sigma-compact",
      "version": "1",
      "anchor": "$",
      "formalHash": "sha256:d0ce2d8595b36111e7f7ca5a1d2083d0d96bc75bd4f4acf430fa8f779693573b"
    }
  ],
  "prerequisites": [],
  "routes": [
    {
      "id": "route:tdg:sigma-compact:1",
      "title": "拓扑结构 + 紧空间",
      "inputs": [
        {
          "id": "learn:tdg:topology",
          "version": "1"
        },
        {
          "id": "learn:tdg:compact",
          "version": "1"
        }
      ]
    }
  ]
}
````

# σ 紧空间

允许分成可数块，每块仍能有限控制。

## 精确内容

空间可写成可数个紧子集之并。

## 依据与边界

DEF：不要求紧集有内点，也不要求嵌套；一般空间中不等于仿紧。

形式接口中的低层符号由 context.background 逐项规定；类型与摘要检查仅为 FINITE，不把背景解释自动当作证明。

## 参考

- 本案例《迁移验收清单》与关系正文。
- Lee, Introduction to Topological Manifolds, 2nd ed., Springer, 2011（拓扑、流形与可数性；按主题引用，未声称逐页复核）。
- Lee, Introduction to Smooth Manifolds, 2nd ed., Springer, 2013（微分、张量、形式与流；按主题引用）。

## 怎样读

先用直觉重述本对象，再核对精确条件；阅读完成与掌握确认分开记录。

## 回看问题

去掉定义中的一项条件会改变什么？先检查表达仍有意义，再寻找反例或说明冗余。
