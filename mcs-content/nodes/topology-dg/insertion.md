````mcs-node
{
  "schema": "mcs-node/1",
  "id": "learn:tdg:insertion",
  "version": "1",
  "title": "内乘 ι_X",
  "case": "topology-dg",
  "goals": [
    "说明内乘 ι_X的条件、用途和失败边界"
  ],
  "objects": [
    {
      "id": "obj:tdg:insertion",
      "version": "1",
      "anchor": "$",
      "formalHash": "sha256:fbe91b71940fceb9ebd94ea24b759a40faaa15b47bf6eaf7cf6ee6ec0ef5ba98"
    }
  ],
  "prerequisites": [],
  "routes": [
    {
      "id": "route:tdg:insertion:1",
      "title": "微分形式 + 向量场",
      "inputs": [
        {
          "id": "learn:tdg:forms",
          "version": "1"
        },
        {
          "id": "learn:tdg:vector-field",
          "version": "1"
        }
      ]
    }
  ]
}
````

# 内乘 ι_X

把向量场填进形式的第一个输入。

## 精确内容

(ιXω)(v1,…,v(k−1))=ω(X,v1,…,v(k−1))；对0形式为0。

## 依据与边界

DEF：次数下降1，内乘不是两个向量的内积。

形式接口中的低层符号由 context.background 逐项规定；类型与摘要检查仅为 FINITE，不把背景解释自动当作证明。

## 参考

- 本案例《迁移验收清单》与关系正文。
- Lee, Introduction to Topological Manifolds, 2nd ed., Springer, 2011（拓扑、流形与可数性；按主题引用，未声称逐页复核）。
- Lee, Introduction to Smooth Manifolds, 2nd ed., Springer, 2013（微分、张量、形式与流；按主题引用）。

## 怎样读

先用直觉重述本对象，再核对精确条件；阅读完成与掌握确认分开记录。

## 回看问题

去掉定义中的一项条件会改变什么？先检查表达仍有意义，再寻找反例或说明冗余。
