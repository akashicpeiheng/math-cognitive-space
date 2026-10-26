````mcs-node
{
  "schema": "mcs-node/1",
  "id": "learn:tdg:compact-sigma",
  "version": "1",
  "title": "紧 ⇒ σ 紧",
  "case": "topology-dg",
  "goals": [
    "说明紧 ⇒ σ 紧的条件、用途和失败边界"
  ],
  "objects": [
    {
      "id": "obj:tdg:compact-sigma",
      "version": "1",
      "anchor": "$",
      "formalHash": "sha256:ecefd65b743dc3b3700fe57317b2cd1dfa732fb7d37554f96dbb552165e53249"
    }
  ],
  "prerequisites": [],
  "routes": [
    {
      "id": "route:tdg:compact-sigma:1",
      "title": "紧空间",
      "inputs": [
        {
          "id": "learn:tdg:compact",
          "version": "1"
        }
      ]
    }
  ]
}
````

# 紧 ⇒ σ 紧

先把条件写全，再问结论是否还能失效。

## 精确内容

用常值序列 K_n=X 即得可数紧覆盖；紧的空空间也成立。

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
