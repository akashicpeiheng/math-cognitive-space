````mcs-node
{
  "schema": "mcs-node/1",
  "id": "learn:tdg:divergence",
  "version": "1",
  "title": "散度",
  "case": "topology-dg",
  "goals": [
    "说明散度的条件、用途和失败边界"
  ],
  "objects": [
    {
      "id": "obj:tdg:divergence",
      "version": "1",
      "anchor": "$",
      "formalHash": "sha256:6806bcc3b80aed0e0c773aae27ed8afbcd89361b89ee304216e104832a986565"
    }
  ],
  "prerequisites": [],
  "routes": [
    {
      "id": "route:tdg:divergence:1",
      "title": "偏导数",
      "inputs": [
        {
          "id": "learn:tdg:partial",
          "version": "1"
        }
      ]
    }
  ]
}
````

# 散度

把流出微小体积的净通量写成一个标量。

## 精确内容

标准欧氏 R^n 中 div F=Σi∂iFi，F 至少 C¹。

## 依据与边界

DEF：坐标和必须配合欧氏度量；一般坐标另有体积密度因子。

形式接口中的低层符号由 context.background 逐项规定；类型与摘要检查仅为 FINITE，不把背景解释自动当作证明。

## 参考

- 本案例《迁移验收清单》与关系正文。
- Lee, Introduction to Topological Manifolds, 2nd ed., Springer, 2011（拓扑、流形与可数性；按主题引用，未声称逐页复核）。
- Lee, Introduction to Smooth Manifolds, 2nd ed., Springer, 2013（微分、张量、形式与流；按主题引用）。

## 怎样读

先用直觉重述本对象，再核对精确条件；阅读完成与掌握确认分开记录。

## 回看问题

去掉定义中的一项条件会改变什么？先检查表达仍有意义，再寻找反例或说明冗余。
