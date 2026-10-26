````mcs-node
{
  "schema": "mcs-node/1",
  "id": "learn:tdg:hodge",
  "version": "1",
  "title": "Hodge 星",
  "case": "topology-dg",
  "goals": [
    "说明Hodge 星的条件、用途和失败边界"
  ],
  "objects": [
    {
      "id": "obj:tdg:hodge",
      "version": "1",
      "anchor": "$",
      "formalHash": "sha256:57e9d7554ac5093231182095e6353c366ec0fedd5af66c99a8c29835a0202448"
    }
  ],
  "prerequisites": [],
  "routes": [
    {
      "id": "route:tdg:hodge:1",
      "title": "微分形式 + 欧氏内积与黎曼度量",
      "inputs": [
        {
          "id": "learn:tdg:forms",
          "version": "1"
        },
        {
          "id": "learn:tdg:metric",
          "version": "1"
        }
      ]
    }
  ]
}
````

# Hodge 星

借助长度和定向，把 k 维有向测量换成余维测量。

## 精确内容

有向 n 维黎曼流形中 α∧*β=<α,β>g vol_g。

## 依据与边界

DEF：依赖度量与定向；本案例采用正定度量和实形式。

形式接口中的低层符号由 context.background 逐项规定；类型与摘要检查仅为 FINITE，不把背景解释自动当作证明。

## 参考

- 本案例《迁移验收清单》与关系正文。
- Lee, Introduction to Topological Manifolds, 2nd ed., Springer, 2011（拓扑、流形与可数性；按主题引用，未声称逐页复核）。
- Lee, Introduction to Smooth Manifolds, 2nd ed., Springer, 2013（微分、张量、形式与流；按主题引用）。

## 怎样读

先用直觉重述本对象，再核对精确条件；阅读完成与掌握确认分开记录。

## 回看问题

去掉定义中的一项条件会改变什么？先检查表达仍有意义，再寻找反例或说明冗余。
