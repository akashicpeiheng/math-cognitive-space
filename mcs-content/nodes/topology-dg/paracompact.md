````mcs-node
{
  "schema": "mcs-node/1",
  "id": "learn:tdg:paracompact",
  "version": "1",
  "title": "仿紧空间",
  "case": "topology-dg",
  "goals": [
    "说明仿紧空间的条件、用途和失败边界"
  ],
  "objects": [
    {
      "id": "obj:tdg:paracompact",
      "version": "1",
      "anchor": "$",
      "formalHash": "sha256:bcb44ddd78ffce2e9ce631f6dc2454f397f3c17caf731a51ff6cbd692e9412aa"
    }
  ],
  "prerequisites": [],
  "routes": [
    {
      "id": "route:tdg:paracompact:1",
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

# 仿紧空间

有限份太强时，退成每个点附近只遇到有限份。

## 精确内容

每个开覆盖都有局部有限的开加细覆盖。

## 依据与边界

DEF：本定义不把 Hausdorff 并入；单位分解的流形应用另加分离与光滑条件。

形式接口中的低层符号由 context.background 逐项规定；类型与摘要检查仅为 FINITE，不把背景解释自动当作证明。

## 参考

- 本案例《迁移验收清单》与关系正文。
- Lee, Introduction to Topological Manifolds, 2nd ed., Springer, 2011（拓扑、流形与可数性；按主题引用，未声称逐页复核）。
- Lee, Introduction to Smooth Manifolds, 2nd ed., Springer, 2013（微分、张量、形式与流；按主题引用）。

## 怎样读

先用直觉重述本对象，再核对精确条件；阅读完成与掌握确认分开记录。

## 回看问题

去掉定义中的一项条件会改变什么？先检查表达仍有意义，再寻找反例或说明冗余。
