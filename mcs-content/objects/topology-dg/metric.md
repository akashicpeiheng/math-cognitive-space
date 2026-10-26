````mcs-object
{
  "schema": "mcs-object/1",
  "id": "obj:tdg:metric",
  "version": "1",
  "title": "欧氏内积与黎曼度量",
  "language": "mcs-formal/1",
  "grammar": "mcs-object-grammar/1",
  "scale": "unit",
  "context": {
    "signature": "signature:topology-dg/1",
    "bases": [
      "o",
      "X",
      "Family",
      "R"
    ],
    "constants": [
      {
        "name": "PositiveMetric",
        "type": "o",
        "background": "光滑对称正定双线性场 gp，黎曼度量；伪黎曼情形不包含在此接口"
      }
    ]
  },
  "definitions": [],
  "assumptions": [],
  "declarations": [
    {
      "id": "definition",
      "kind": "formula",
      "source": "PositiveMetric",
      "status": "DEF"
    }
  ],
  "references": [],
  "members": [],
  "imports": [],
  "exports": [],
  "links": [],
  "lean": []
}
````

# 欧氏内积与黎曼度量

导数首先是协向量，长度与角度提供转成向量的接口。

## 精确内容

每点给定光滑变化的对称正定双线性型；欧氏情形用标准内积。

## 依据与边界

DEF：不把度量当作拓扑或光滑流形的自动数据。

形式接口中的低层符号由 context.background 逐项规定；类型与摘要检查仅为 FINITE，不把背景解释自动当作证明。

## 参考

- 本案例《迁移验收清单》与关系正文。
- Lee, Introduction to Topological Manifolds, 2nd ed., Springer, 2011（拓扑、流形与可数性；按主题引用，未声称逐页复核）。
- Lee, Introduction to Smooth Manifolds, 2nd ed., Springer, 2013（微分、张量、形式与流；按主题引用）。
