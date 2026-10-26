````mcs-node
{
  "schema": "mcs-node/1",
  "id": "learn:tdg:lie",
  "version": "1",
  "title": "Lie 导数",
  "case": "topology-dg",
  "goals": [
    "说明Lie 导数的条件、用途和失败边界"
  ],
  "objects": [
    {
      "id": "obj:tdg:lie",
      "version": "1",
      "anchor": "$",
      "formalHash": "sha256:0e6a4b822c743b43b41b1c686cef36a83def4156afe2fb478d008abf9b48932c"
    }
  ],
  "prerequisites": [],
  "routes": [
    {
      "id": "route:tdg:lie:1",
      "title": "局部流 + 张量场",
      "inputs": [
        {
          "id": "learn:tdg:flow",
          "version": "1"
        },
        {
          "id": "learn:tdg:tensor-field",
          "version": "1"
        }
      ]
    }
  ]
}
````

# Lie 导数

沿流移动比较几何场；先拉回到同一点再求差。

## 精确内容

对光滑向量场 X 的局部流 Φt，L_XT=(d/dt)|0 Φt* T；只在共同定义域讨论。

## 依据与边界

DEF：任意向量场只保证局部流；不假定完备。

形式接口中的低层符号由 context.background 逐项规定；类型与摘要检查仅为 FINITE，不把背景解释自动当作证明。

## 参考

- 本案例《迁移验收清单》与关系正文。
- Lee, Introduction to Topological Manifolds, 2nd ed., Springer, 2011（拓扑、流形与可数性；按主题引用，未声称逐页复核）。
- Lee, Introduction to Smooth Manifolds, 2nd ed., Springer, 2013（微分、张量、形式与流；按主题引用）。

## 怎样读

先用直觉重述本对象，再核对精确条件；阅读完成与掌握确认分开记录。

## 回看问题

去掉定义中的一项条件会改变什么？先检查表达仍有意义，再寻找反例或说明冗余。
