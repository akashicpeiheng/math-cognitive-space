````mcs-node
{
  "schema": "mcs-node/1",
  "id": "learn:tdg:cartan",
  "version": "1",
  "title": "Cartan 公式",
  "case": "topology-dg",
  "goals": [
    "说明Cartan 公式的条件、用途和失败边界"
  ],
  "objects": [
    {
      "id": "obj:tdg:cartan",
      "version": "1",
      "anchor": "$",
      "formalHash": "sha256:52f52c100ec9c7bd17a11ee8e2642a7bb0d9271c6ecd4e64eae54477c9ddc829"
    }
  ],
  "prerequisites": [],
  "routes": [
    {
      "id": "route:tdg:cartan:1",
      "title": "Lie 导数 + 外微分 d + 内乘 ι_X",
      "inputs": [
        {
          "id": "learn:tdg:lie",
          "version": "1"
        },
        {
          "id": "learn:tdg:exterior",
          "version": "1"
        },
        {
          "id": "learn:tdg:insertion",
          "version": "1"
        }
      ]
    }
  ]
}
````

# Cartan 公式

先把条件写全，再问结论是否还能失效。

## 精确内容

PROOF：两边都是形式代数上次数0的导子。函数上均为 Xf；在 df 上右边为 d(Xf)，左边由流拉回与 d 交换得到同式。局部形式由函数及坐标微分生成，Leibniz 律延拓即得。

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
