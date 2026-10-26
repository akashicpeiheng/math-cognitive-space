````mcs-node
{
  "schema": "mcs-node/1",
  "id": "learn:tdg:topology",
  "version": "1",
  "title": "拓扑结构",
  "case": "topology-dg",
  "goals": [
    "说明拓扑结构的条件、用途和失败边界"
  ],
  "objects": [
    {
      "id": "obj:tdg:topology",
      "version": "1",
      "anchor": "$",
      "formalHash": "sha256:25093237bbaf6983629d9d0c9bf15a446e79d0bda4e3b5e5fb2304cce6a95710"
    }
  ],
  "prerequisites": [],
  "routes": [
    {
      "id": "route:tdg:topology:1",
      "title": "直接引入（背景在正文列明）",
      "inputs": []
    }
  ]
}
````

# 拓扑结构

先只保留“附近”和“连续”需要的开集信息。

## 精确内容

在集合 X 上指定 τ⊆P(X)，使 ∅,X∈τ，任意并与有限交仍在 τ；拓扑空间是 (X,τ)，而“拓扑学”是学科组织。

## 依据与边界

DEF：本案例固定载体与开集族；本对象不是“拓扑学”学科话题。

形式接口中的低层符号由 context.background 逐项规定；类型与摘要检查仅为 FINITE，不把背景解释自动当作证明。

## 参考

- 本案例《迁移验收清单》与关系正文。
- Lee, Introduction to Topological Manifolds, 2nd ed., Springer, 2011（拓扑、流形与可数性；按主题引用，未声称逐页复核）。
- Lee, Introduction to Smooth Manifolds, 2nd ed., Springer, 2013（微分、张量、形式与流；按主题引用）。

## 怎样读

先用直觉重述本对象，再核对精确条件；阅读完成与掌握确认分开记录。

## 回看问题

去掉定义中的一项条件会改变什么？先检查表达仍有意义，再寻找反例或说明冗余。
