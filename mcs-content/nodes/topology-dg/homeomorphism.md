````mcs-node
{
  "schema": "mcs-node/1",
  "id": "learn:tdg:homeomorphism",
  "version": "1",
  "title": "同胚",
  "case": "topology-dg",
  "goals": [
    "说明同胚的条件、用途和失败边界"
  ],
  "objects": [
    {
      "id": "obj:tdg:homeomorphism",
      "version": "1",
      "anchor": "$",
      "formalHash": "sha256:87d3a7c2d3f15e77eed860e7cd83fab6f49e7e5b447112e34f43d44804a44744"
    }
  ],
  "prerequisites": [],
  "routes": [
    {
      "id": "route:tdg:homeomorphism:1",
      "title": "连续映射",
      "inputs": [
        {
          "id": "learn:tdg:continuous",
          "version": "1"
        }
      ]
    }
  ]
}
````

# 同胚

连续可逆且逆向也连续，才真正保留邻近关系。

## 精确内容

映射 f:X→Y 为双射，且 f、f⁻¹ 均连续。

## 依据与边界

DEF：连续双射不足：恒等映射从离散实线到通常实线的逆不连续。

形式接口中的低层符号由 context.background 逐项规定；类型与摘要检查仅为 FINITE，不把背景解释自动当作证明。

## 参考

- 本案例《迁移验收清单》与关系正文。
- Lee, Introduction to Topological Manifolds, 2nd ed., Springer, 2011（拓扑、流形与可数性；按主题引用，未声称逐页复核）。
- Lee, Introduction to Smooth Manifolds, 2nd ed., Springer, 2013（微分、张量、形式与流；按主题引用）。

## 怎样读

先用直觉重述本对象，再核对精确条件；阅读完成与掌握确认分开记录。

## 回看问题

去掉定义中的一项条件会改变什么？先检查表达仍有意义，再寻找反例或说明冗余。
