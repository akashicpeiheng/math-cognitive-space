````mcs-node
{
  "schema": "mcs-node/1",
  "id": "learn:tdg:partial",
  "version": "1",
  "title": "偏导数",
  "case": "topology-dg",
  "goals": [
    "说明偏导数的条件、用途和失败边界"
  ],
  "objects": [
    {
      "id": "obj:tdg:partial",
      "version": "1",
      "anchor": "$",
      "formalHash": "sha256:2eeb91ebf8e69735ab8460256a0713501f0813a0596ceedf1fce514c451e52cd"
    }
  ],
  "prerequisites": [],
  "routes": [
    {
      "id": "route:tdg:partial:1",
      "title": "一元导数",
      "inputs": [
        {
          "id": "learn:tdg:derivative",
          "version": "1"
        }
      ]
    }
  ]
}
````

# 偏导数

冻结其他坐标，只让一个坐标移动。

## 精确内容

∂if(x)=lim(t→0)(f(x+t ei)-f(x))/t，存在时定义。

## 依据与边界

DEF：所有偏导存在并不保证连续或可微。

形式接口中的低层符号由 context.background 逐项规定；类型与摘要检查仅为 FINITE，不把背景解释自动当作证明。

## 参考

- 本案例《迁移验收清单》与关系正文。
- Lee, Introduction to Topological Manifolds, 2nd ed., Springer, 2011（拓扑、流形与可数性；按主题引用，未声称逐页复核）。
- Lee, Introduction to Smooth Manifolds, 2nd ed., Springer, 2013（微分、张量、形式与流；按主题引用）。

## 怎样读

先用直觉重述本对象，再核对精确条件；阅读完成与掌握确认分开记录。

## 回看问题

去掉定义中的一项条件会改变什么？先检查表达仍有意义，再寻找反例或说明冗余。
