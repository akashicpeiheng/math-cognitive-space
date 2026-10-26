````mcs-node
{
  "schema": "mcs-node/1",
  "id": "learn:tdg:tangent-dual",
  "version": "1",
  "title": "余切空间是切空间的线性对偶",
  "case": "topology-dg",
  "goals": [
    "说明余切空间是切空间的线性对偶的条件、用途和失败边界"
  ],
  "objects": [
    {
      "id": "obj:tdg:tangent-dual",
      "version": "1",
      "anchor": "$",
      "formalHash": "sha256:7389d5206eee1227242b55a245fa1556ae76382804a591d0a7f4037796cbbbf8"
    }
  ],
  "prerequisites": [],
  "routes": [
    {
      "id": "route:tdg:tangent-dual:1",
      "title": "切空间 + 点态余切空间",
      "inputs": [
        {
          "id": "learn:tdg:tangent",
          "version": "1"
        },
        {
          "id": "learn:tdg:cotangent",
          "version": "1"
        }
      ]
    }
  ]
}
````

# 余切空间是切空间的线性对偶

先把条件写全，再问结论是否还能失效。

## 精确内容

DEF：Tp*M 按定义为 TpM 的线性对偶。有限维下评价映射 v↦(α↦α(v)) 给二次对偶同构；它不提供不依赖度量的一次对偶识别。

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
