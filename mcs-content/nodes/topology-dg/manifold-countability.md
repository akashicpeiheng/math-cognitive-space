````mcs-node
{
  "schema": "mcs-node/1",
  "id": "learn:tdg:manifold-countability",
  "version": "1",
  "title": "局部欧氏 Hausdorff 空间的可数性判据",
  "case": "topology-dg",
  "goals": [
    "说明局部欧氏 Hausdorff 空间的可数性判据的条件、用途和失败边界"
  ],
  "objects": [
    {
      "id": "obj:tdg:manifold-countability",
      "version": "1",
      "anchor": "$",
      "formalHash": "sha256:45a77d888cc96fd334701c6ee78090669a452a0bbc28054e7b69603821251e4e"
    }
  ],
  "prerequisites": [],
  "routes": [
    {
      "id": "route:tdg:manifold-countability:1",
      "title": "局部欧氏性 + Hausdorff／T₂ 空间 + 仿紧空间",
      "inputs": [
        {
          "id": "learn:tdg:local-euclidean",
          "version": "1"
        },
        {
          "id": "learn:tdg:t2",
          "version": "1"
        },
        {
          "id": "learn:tdg:paracompact",
          "version": "1"
        }
      ]
    }
  ]
}
````

# 局部欧氏 Hausdorff 空间的可数性判据

先把条件写全，再问结论是否还能失效。

## 精确内容

REF：局部欧氏且 Hausdorff 时，第二可数等价于 σ 紧，也等价于“仿紧且分支至多可数”。局部相对紧坐标球与可数基给 σ 紧；紧覆盖各块可取有限坐标覆盖给可数基。仿紧流形分解为开闭的第二可数分支，加入可数分支才得全局可数。连通时分支只有一个。

## 依据与边界

PROOF / REF：PROOF 表示附有正文论证；结构检查不替代证明。人工对应审阅 pending。

形式接口中的低层符号由 context.background 逐项规定；类型与摘要检查仅为 FINITE，不把背景解释自动当作证明。

## 参考

- 本案例《迁移验收清单》与关系正文。
- Lee, Introduction to Topological Manifolds, 2nd ed., Springer, 2011（拓扑、流形与可数性；按主题引用，未声称逐页复核）。
- Lee, Introduction to Smooth Manifolds, 2nd ed., Springer, 2013（微分、张量、形式与流；按主题引用）。

## 怎样读

先用直觉重述本对象，再核对精确条件；阅读完成与掌握确认分开记录。

## 回看问题

指出论证使用每项假设的位置；若省略光滑性、分离性或定义域条件，哪一步失去依据？
