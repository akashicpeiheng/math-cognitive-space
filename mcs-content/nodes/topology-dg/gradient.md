````mcs-node
{
  "schema": "mcs-node/1",
  "id": "learn:tdg:gradient",
  "version": "1",
  "title": "梯度",
  "case": "topology-dg",
  "goals": [
    "说明梯度的条件、用途和失败边界"
  ],
  "objects": [
    {
      "id": "obj:tdg:gradient",
      "version": "1",
      "anchor": "$",
      "formalHash": "sha256:f2c51eb95f719bb2ee7252efcda7ef3d5ec2bb994dd5ddc7e9240bbfc7d09020"
    }
  ],
  "prerequisites": [],
  "routes": [
    {
      "id": "route:tdg:gradient:1",
      "title": "偏导数 + 欧氏内积与黎曼度量",
      "inputs": [
        {
          "id": "learn:tdg:partial",
          "version": "1"
        },
        {
          "id": "learn:tdg:metric",
          "version": "1"
        }
      ]
    },
    {
      "id": "route:tdg:gradient:2",
      "title": "Fréchet 全导数 + 欧氏内积与黎曼度量",
      "inputs": [
        {
          "id": "learn:tdg:frechet",
          "version": "1"
        },
        {
          "id": "learn:tdg:metric",
          "version": "1"
        }
      ]
    }
  ]
}
````

# 梯度

把所有方向上的变化率压缩成一个向量。

## 精确内容

欧氏标量函数可微时，grad f 是满足 <grad f,v>=Df[v] 的唯一向量。坐标式为 (∂1f,…,∂nf)。

## 依据与边界

DEF：使用内积把协向量转为向量；一般流形需度量，不仅有光滑结构。

形式接口中的低层符号由 context.background 逐项规定；类型与摘要检查仅为 FINITE，不把背景解释自动当作证明。

## 参考

- 本案例《迁移验收清单》与关系正文。
- Lee, Introduction to Topological Manifolds, 2nd ed., Springer, 2011（拓扑、流形与可数性；按主题引用，未声称逐页复核）。
- Lee, Introduction to Smooth Manifolds, 2nd ed., Springer, 2013（微分、张量、形式与流；按主题引用）。

## 怎样读

先用直觉重述本对象，再核对精确条件；阅读完成与掌握确认分开记录。本节点有多条替代引入路线，每条路线的输入同时需要；不同路线不合并成全部必修。

## 回看问题

去掉定义中的一项条件会改变什么？先检查表达仍有意义，再寻找反例或说明冗余。
