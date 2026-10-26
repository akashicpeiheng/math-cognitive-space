````mcs-object
{
  "schema": "mcs-object/1",
  "id": "obj:tdg:compact-hausdorff-normal",
  "version": "1",
  "title": "紧 Hausdorff ⇒ T₄",
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
        "name": "TOne",
        "type": "o",
        "background": "每个单点集闭；不附带更强分离条件"
      },
      {
        "name": "Separated",
        "type": "X -> X -> o",
        "background": "两点具有不交开邻域"
      },
      {
        "name": "Normal",
        "type": "o",
        "background": "任意两个不交闭集可由不交开集分离；本符号不含 T1"
      },
      {
        "name": "OpenCover",
        "type": "Family -> o",
        "background": "族由开集组成且并为全空间"
      },
      {
        "name": "FiniteSubcover",
        "type": "Family -> o",
        "background": "该覆盖存在有限子覆盖"
      }
    ]
  },
  "definitions": [],
  "assumptions": [],
  "declarations": [
    {
      "id": "claim",
      "kind": "formula",
      "source": "(forall C:Family. OpenCover(C) -> FiniteSubcover(C)) ∧ (forall x:X y:X. (x = y -> false) -> Separated(x)(y)) -> Normal ∧ TOne",
      "status": "PROOF"
    }
  ],
  "references": [
    {
      "id": "obj:tdg:compact",
      "version": "1",
      "anchor": "$",
      "formalHash": "sha256:605899be31df7572449f260cc1f1ed6773f73a5eebc93cfd8a0a5b8acf08cabd"
    },
    {
      "id": "obj:tdg:t2",
      "version": "1",
      "anchor": "$",
      "formalHash": "sha256:27b05929a54c19b8d05e41d2f74921bedf88dd2423069d3f95875f9281d4bcfe"
    }
  ],
  "members": [],
  "imports": [],
  "exports": [],
  "links": [],
  "lean": []
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
