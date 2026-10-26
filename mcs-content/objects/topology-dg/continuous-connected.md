````mcs-object
{
  "schema": "mcs-object/1",
  "id": "obj:tdg:continuous-connected",
  "version": "1",
  "title": "连续像保持连通",
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
        "name": "empty",
        "type": "X -> o",
        "background": "空子集"
      },
      {
        "name": "univ",
        "type": "X -> o",
        "background": "全体 X"
      },
      {
        "name": "Clopen",
        "type": "(X -> o) -> o",
        "background": "子集同时开且闭"
      },
      {
        "name": "Continuous",
        "type": "o",
        "background": "指定映射 f:X→Y 对所有开集的逆像开；定义不要求双射"
      },
      {
        "name": "ConnectedImage",
        "type": "o",
        "background": "指定连续映射的像（子空间拓扑）连通"
      }
    ]
  },
  "definitions": [],
  "assumptions": [],
  "declarations": [
    {
      "id": "claim",
      "kind": "formula",
      "source": "(forall U:(X -> o). Clopen(U) -> (U = empty -> false) -> U = univ) ∧ Continuous -> ConnectedImage",
      "status": "PROOF"
    }
  ],
  "references": [
    {
      "id": "obj:tdg:connected",
      "version": "1",
      "anchor": "$",
      "formalHash": "sha256:0cfcc4806df78e72304a10042ea58a601c0b8833726c838b75d7a235b6c59beb"
    },
    {
      "id": "obj:tdg:continuous",
      "version": "1",
      "anchor": "$",
      "formalHash": "sha256:dd998f46758ecfc4be3f7c85750993253244e4f62c2f956e671bb2c88e2dea57"
    }
  ],
  "members": [],
  "imports": [],
  "exports": [],
  "links": [],
  "lean": []
}
````

# 连续像保持连通

先把条件写全，再问结论是否还能失效。

## 精确内容

若像分成两个不交非空相对开集，其逆像也是源空间的两个不交非空开集且覆盖源空间，与连通矛盾。

## 依据与边界

PROOF / REF：PROOF 表示附有正文论证；结构检查不替代证明。人工对应审阅 pending。

形式接口中的低层符号由 context.background 逐项规定；类型与摘要检查仅为 FINITE，不把背景解释自动当作证明。

## 参考

- 本案例《迁移验收清单》与关系正文。
- Lee, Introduction to Topological Manifolds, 2nd ed., Springer, 2011（拓扑、流形与可数性；按主题引用，未声称逐页复核）。
- Lee, Introduction to Smooth Manifolds, 2nd ed., Springer, 2013（微分、张量、形式与流；按主题引用）。
