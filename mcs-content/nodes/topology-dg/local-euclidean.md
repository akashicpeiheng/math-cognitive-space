````mcs-node
{
  "schema": "mcs-node/1",
  "id": "learn:tdg:local-euclidean",
  "version": "1",
  "title": "局部欧氏性",
  "case": "topology-dg",
  "goals": [
    "说明局部欧氏性的条件、用途和失败边界"
  ],
  "objects": [
    {
      "id": "obj:tdg:local-euclidean",
      "version": "1",
      "anchor": "$",
      "formalHash": "sha256:a59029dba54d3aa6ba4ed0fb5457c34964c9c8d83f2a94d677ea5ed494380ba9"
    }
  ],
  "prerequisites": [],
  "routes": [
    {
      "id": "route:tdg:local-euclidean:1",
      "title": "局部坐标图",
      "inputs": [
        {
          "id": "learn:tdg:chart",
          "version": "1"
        }
      ]
    }
  ]
}
````

# 局部欧氏性

只要求每点附近像 R^n，不要求全局能用一张图。

## 精确内容

固定维数 n，每点有同胚于 R^n 开集的开邻域。

## 依据与边界

DEF：不自动带 Hausdorff 或第二可数；长直线说明额外条件的作用。

形式接口中的低层符号由 context.background 逐项规定；类型与摘要检查仅为 FINITE，不把背景解释自动当作证明。

## 参考

- 本案例《迁移验收清单》与关系正文。
- Lee, Introduction to Topological Manifolds, 2nd ed., Springer, 2011（拓扑、流形与可数性；按主题引用，未声称逐页复核）。
- Lee, Introduction to Smooth Manifolds, 2nd ed., Springer, 2013（微分、张量、形式与流；按主题引用）。

## 怎样读

先用直觉重述本对象，再核对精确条件；阅读完成与掌握确认分开记录。

## 回看问题

去掉定义中的一项条件会改变什么？先检查表达仍有意义，再寻找反例或说明冗余。
