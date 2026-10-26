````mcs-node
{
  "schema": "mcs-node/1",
  "id": "learn:tdg:connected",
  "version": "1",
  "title": "连通空间",
  "case": "topology-dg",
  "goals": [
    "说明连通空间的条件、用途和失败边界"
  ],
  "objects": [
    {
      "id": "obj:tdg:connected",
      "version": "1",
      "anchor": "$",
      "formalHash": "sha256:0cfcc4806df78e72304a10042ea58a601c0b8833726c838b75d7a235b6c59beb"
    }
  ],
  "prerequisites": [],
  "routes": [
    {
      "id": "route:tdg:connected:1",
      "title": "拓扑结构",
      "inputs": [
        {
          "id": "learn:tdg:topology",
          "version": "1"
        }
      ]
    }
  ]
}
````

# 连通空间

“一整块”应描述不能被分开，而不是有限覆盖。

## 精确内容

唯一的既开又闭子集是 ∅ 与 X；用无析取的等价写法：非空开闭集必为全空间。

## 依据与边界

DEF：连通不等于道路连通；与紧不存在强依赖。

形式接口中的低层符号由 context.background 逐项规定；类型与摘要检查仅为 FINITE，不把背景解释自动当作证明。

## 参考

- 本案例《迁移验收清单》与关系正文。
- Lee, Introduction to Topological Manifolds, 2nd ed., Springer, 2011（拓扑、流形与可数性；按主题引用，未声称逐页复核）。
- Lee, Introduction to Smooth Manifolds, 2nd ed., Springer, 2013（微分、张量、形式与流；按主题引用）。

## 怎样读

先用直觉重述本对象，再核对精确条件；阅读完成与掌握确认分开记录。

## 回看问题

去掉定义中的一项条件会改变什么？先检查表达仍有意义，再寻找反例或说明冗余。
