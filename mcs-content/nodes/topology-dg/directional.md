````mcs-node
{
  "schema": "mcs-node/1",
  "id": "learn:tdg:directional",
  "version": "1",
  "title": "方向导数",
  "case": "topology-dg",
  "goals": [
    "说明方向导数的条件、用途和失败边界"
  ],
  "objects": [
    {
      "id": "obj:tdg:directional",
      "version": "1",
      "anchor": "$",
      "formalHash": "sha256:8fe36dbd9d35e2958a215f376f8fa99b2b2096a1cd6b3741aa0eed3094e24b45"
    }
  ],
  "prerequisites": [],
  "routes": [
    {
      "id": "route:tdg:directional:1",
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

# 方向导数

坐标轴不是唯一可走的方向。

## 精确内容

Dv f(x)=lim(t→0)(f(x+t v)-f(x))/t，存在时定义；无需先假设全可微。

## 依据与边界

DEF：各方向导数存在仍可能不组成线性映射；不强依赖全导数。

形式接口中的低层符号由 context.background 逐项规定；类型与摘要检查仅为 FINITE，不把背景解释自动当作证明。

## 参考

- 本案例《迁移验收清单》与关系正文。
- Lee, Introduction to Topological Manifolds, 2nd ed., Springer, 2011（拓扑、流形与可数性；按主题引用，未声称逐页复核）。
- Lee, Introduction to Smooth Manifolds, 2nd ed., Springer, 2013（微分、张量、形式与流；按主题引用）。

## 怎样读

先用直觉重述本对象，再核对精确条件；阅读完成与掌握确认分开记录。

## 回看问题

去掉定义中的一项条件会改变什么？先检查表达仍有意义，再寻找反例或说明冗余。
