````mcs-node
{
  "schema": "mcs-node/1",
  "id": "learn:tdg:metric",
  "version": "1",
  "title": "欧氏内积与黎曼度量",
  "case": "topology-dg",
  "goals": [
    "说明欧氏内积与黎曼度量的条件、用途和失败边界"
  ],
  "objects": [
    {
      "id": "obj:tdg:metric",
      "version": "1",
      "anchor": "$",
      "formalHash": "sha256:b582dd3b47d315238f890fda61fb3144a9de5437efc539a084e9304d50ac8491"
    }
  ],
  "prerequisites": [],
  "routes": [
    {
      "id": "route:tdg:metric:1",
      "title": "直接引入（背景在正文列明）",
      "inputs": []
    }
  ]
}
````

# 欧氏内积与黎曼度量

导数首先是协向量，长度与角度提供转成向量的接口。

## 精确内容

每点给定光滑变化的对称正定双线性型；欧氏情形用标准内积。

## 依据与边界

DEF：不把度量当作拓扑或光滑流形的自动数据。

形式接口中的低层符号由 context.background 逐项规定；类型与摘要检查仅为 FINITE，不把背景解释自动当作证明。

## 参考

- 本案例《迁移验收清单》与关系正文。
- Lee, Introduction to Topological Manifolds, 2nd ed., Springer, 2011（拓扑、流形与可数性；按主题引用，未声称逐页复核）。
- Lee, Introduction to Smooth Manifolds, 2nd ed., Springer, 2013（微分、张量、形式与流；按主题引用）。

## 怎样读

先用直觉重述本对象，再核对精确条件；阅读完成与掌握确认分开记录。

## 回看问题

去掉定义中的一项条件会改变什么？先检查表达仍有意义，再寻找反例或说明冗余。
