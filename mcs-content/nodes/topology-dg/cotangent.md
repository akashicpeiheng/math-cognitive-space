````mcs-node
{
  "schema": "mcs-node/1",
  "id": "learn:tdg:cotangent",
  "version": "1",
  "title": "点态余切空间",
  "case": "topology-dg",
  "goals": [
    "说明点态余切空间的条件、用途和失败边界"
  ],
  "objects": [
    {
      "id": "obj:tdg:cotangent",
      "version": "1",
      "anchor": "$",
      "formalHash": "sha256:65ba1bde0005c5f0a66d4a4509f0e9b952692d1c1b2edbb2549cf7b84ab99389"
    }
  ],
  "prerequisites": [],
  "routes": [
    {
      "id": "route:tdg:cotangent:1",
      "title": "切空间",
      "inputs": [
        {
          "id": "learn:tdg:tangent",
          "version": "1"
        }
      ]
    }
  ]
}
````

# 点态余切空间

方向的线性读数构成切空间的对偶。

## 精确内容

Tp*M=Hom_R(TpM,R)。

## 依据与边界

DEF：这里只是一个点 p 的纤维；不等同于 Ω¹(M)。

形式接口中的低层符号由 context.background 逐项规定；类型与摘要检查仅为 FINITE，不把背景解释自动当作证明。

## 参考

- 本案例《迁移验收清单》与关系正文。
- Lee, Introduction to Topological Manifolds, 2nd ed., Springer, 2011（拓扑、流形与可数性；按主题引用，未声称逐页复核）。
- Lee, Introduction to Smooth Manifolds, 2nd ed., Springer, 2013（微分、张量、形式与流；按主题引用）。

## 怎样读

先用直觉重述本对象，再核对精确条件；阅读完成与掌握确认分开记录。

## 回看问题

去掉定义中的一项条件会改变什么？先检查表达仍有意义，再寻找反例或说明冗余。
