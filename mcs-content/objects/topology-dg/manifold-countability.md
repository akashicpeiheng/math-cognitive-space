````mcs-object
{
  "schema": "mcs-object/1",
  "id": "obj:tdg:manifold-countability",
  "version": "1",
  "title": "局部欧氏 Hausdorff 空间的可数性判据",
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
        "name": "Countable",
        "type": "Family -> o",
        "background": "族为至多可数，允许有限或空族"
      },
      {
        "name": "Base",
        "type": "Family -> o",
        "background": "族中开集构成整个空间的基：任一开集是其中成员的并"
      },
      {
        "name": "Separated",
        "type": "X -> X -> o",
        "background": "两点具有不交开邻域"
      },
      {
        "name": "OpenCover",
        "type": "Family -> o",
        "background": "族由开集组成且并为全空间"
      },
      {
        "name": "LocallyFiniteRefinement",
        "type": "Family -> o",
        "background": "覆盖存在局部有限的开加细覆盖"
      },
      {
        "name": "CompactExhaustion",
        "type": "Family -> o",
        "background": "族中各项为紧子集且并为全空间；不要求嵌套或包含于后项内部"
      },
      {
        "name": "LocallyEuclidean",
        "type": "o",
        "background": "固定 n≥0，每点有到 R^n 开集的邻域同胚"
      },
      {
        "name": "CountableComponents",
        "type": "o",
        "background": "连通分支的集合至多可数"
      }
    ]
  },
  "definitions": [],
  "assumptions": [],
  "declarations": [
    {
      "id": "claim",
      "kind": "formula",
      "source": "LocallyEuclidean ∧ (forall x:X y:X. (x = y -> false) -> Separated(x)(y)) -> (((exists B:Family. Countable(B) ∧ Base(B)) -> (exists C:Family. Countable(C) ∧ CompactExhaustion(C))) ∧ ((exists C:Family. Countable(C) ∧ CompactExhaustion(C)) -> (exists B:Family. Countable(B) ∧ Base(B))) ∧ (((forall C:Family. OpenCover(C) -> LocallyFiniteRefinement(C)) ∧ CountableComponents) -> (exists B:Family. Countable(B) ∧ Base(B))) ∧ ((exists B:Family. Countable(B) ∧ Base(B)) -> ((forall C:Family. OpenCover(C) -> LocallyFiniteRefinement(C)) ∧ CountableComponents)))",
      "status": "PROOF"
    }
  ],
  "references": [
    {
      "id": "obj:tdg:local-euclidean",
      "version": "1",
      "anchor": "$",
      "formalHash": "sha256:a59029dba54d3aa6ba4ed0fb5457c34964c9c8d83f2a94d677ea5ed494380ba9"
    },
    {
      "id": "obj:tdg:t2",
      "version": "1",
      "anchor": "$",
      "formalHash": "sha256:27b05929a54c19b8d05e41d2f74921bedf88dd2423069d3f95875f9281d4bcfe"
    },
    {
      "id": "obj:tdg:paracompact",
      "version": "1",
      "anchor": "$",
      "formalHash": "sha256:bcb44ddd78ffce2e9ce631f6dc2454f397f3c17caf731a51ff6cbd692e9412aa"
    }
  ],
  "members": [],
  "imports": [],
  "exports": [],
  "links": [],
  "lean": []
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
