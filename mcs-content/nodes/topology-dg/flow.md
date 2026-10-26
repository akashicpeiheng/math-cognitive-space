````mcs-node
{
  "schema": "mcs-node/1",
  "id": "learn:tdg:flow",
  "version": "1",
  "title": "局部流",
  "case": "topology-dg",
  "goals": [
    "说明局部流的条件、用途和失败边界"
  ],
  "objects": [
    {
      "id": "obj:tdg:flow",
      "version": "1",
      "anchor": "$",
      "formalHash": "sha256:011ec27722a70679b9c50dc3f9ed74b257d68f440dd3c464873beb0ae67285e8"
    }
  ],
  "prerequisites": [],
  "routes": [
    {
      "id": "route:tdg:flow:1",
      "title": "向量场 + Fréchet 全导数",
      "inputs": [
        {
          "id": "learn:tdg:vector-field",
          "version": "1"
        },
        {
          "id": "learn:tdg:frechet",
          "version": "1"
        }
      ]
    }
  ]
}
````

# 局部流

把每点沿向量场的方向短时推进。

## 精确内容

Φ0=id，∂tΦt(p)=X(Φt(p))，局部满足 Φs∘Φt=Φ(s+t)。

## 依据与边界

DEF：存在唯一性使用光滑 ODE 定理；局部定义域不能省略。

形式接口中的低层符号由 context.background 逐项规定；类型与摘要检查仅为 FINITE，不把背景解释自动当作证明。

## 参考

- 本案例《迁移验收清单》与关系正文。
- Lee, Introduction to Topological Manifolds, 2nd ed., Springer, 2011（拓扑、流形与可数性；按主题引用，未声称逐页复核）。
- Lee, Introduction to Smooth Manifolds, 2nd ed., Springer, 2013（微分、张量、形式与流；按主题引用）。

## 怎样读

先用直觉重述本对象，再核对精确条件；阅读完成与掌握确认分开记录。

## 回看问题

去掉定义中的一项条件会改变什么？先检查表达仍有意义，再寻找反例或说明冗余。
