````mcs-node
{
  "schema": "mcs-node/1",
  "id": "learn:tdg:compact-hausdorff-normal",
  "version": "1",
  "title": "紧 Hausdorff ⇒ T₄",
  "case": "topology-dg",
  "goals": [
    "说明紧 Hausdorff ⇒ T₄的条件、用途和失败边界"
  ],
  "objects": [
    {
      "id": "obj:tdg:compact-hausdorff-normal",
      "version": "1",
      "anchor": "$",
      "formalHash": "sha256:771e88184b46a1fbbe4d79855a259aeb6e79ba56374b42d14246b7c86e6e9760"
    }
  ],
  "prerequisites": [],
  "routes": [
    {
      "id": "route:tdg:compact-hausdorff-normal:1",
      "title": "紧空间 + Hausdorff／T₂ 空间",
      "inputs": [
        {
          "id": "learn:tdg:compact",
          "version": "1"
        },
        {
          "id": "learn:tdg:t2",
          "version": "1"
        }
      ]
    }
  ]
}
````

# 紧 Hausdorff ⇒ T₄

先把条件写全，再问结论是否还能失效。

## 精确内容

Hausdorff 给出 T1。给定不交闭集 A,B，闭集均紧：先对固定 a 用有限覆盖分离 a 与 B，再对 A 取有限覆盖，把有限交与并组合成不交开邻域。

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
