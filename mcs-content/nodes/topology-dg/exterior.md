````mcs-node
{
  "schema": "mcs-node/1",
  "id": "learn:tdg:exterior",
  "version": "1",
  "title": "外微分 d",
  "case": "topology-dg",
  "goals": [
    "说明外微分 d的条件、用途和失败边界"
  ],
  "objects": [
    {
      "id": "obj:tdg:exterior",
      "version": "1",
      "anchor": "$",
      "formalHash": "sha256:68670268c11c1999c48f6bd60ea2b9000bb04963f17fcf0c505b80aec38b2c74"
    }
  ],
  "prerequisites": [],
  "routes": [
    {
      "id": "route:tdg:exterior:1",
      "title": "微分形式 + 光滑流形",
      "inputs": [
        {
          "id": "learn:tdg:forms",
          "version": "1"
        },
        {
          "id": "learn:tdg:smooth-manifold",
          "version": "1"
        }
      ]
    }
  ]
}
````

# 外微分 d

把变化率扩展到可积的有向面积、体积信息。

## 精确内容

局部 ω=ΣI aI dxI，定义 dω=ΣI,j ∂jaI dxj∧dxI；全局用坐标变换一致性粘合。

## 依据与边界

DEF：d 本身不需要度量或定向；本次机器 d² 覆盖欧氏域上的足够光滑形式。

形式接口中的低层符号由 context.background 逐项规定；类型与摘要检查仅为 FINITE，不把背景解释自动当作证明。

## 参考

- 本案例《迁移验收清单》与关系正文。
- Lee, Introduction to Topological Manifolds, 2nd ed., Springer, 2011（拓扑、流形与可数性；按主题引用，未声称逐页复核）。
- Lee, Introduction to Smooth Manifolds, 2nd ed., Springer, 2013（微分、张量、形式与流；按主题引用）。

## 怎样读

先用直觉重述本对象，再核对精确条件；阅读完成与掌握确认分开记录。

## 回看问题

去掉定义中的一项条件会改变什么？先检查表达仍有意义，再寻找反例或说明冗余。
