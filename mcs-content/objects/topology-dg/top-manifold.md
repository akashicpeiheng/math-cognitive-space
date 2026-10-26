````mcs-object
{
  "schema": "mcs-object/1",
  "id": "obj:tdg:top-manifold",
  "version": "1",
  "title": "拓扑流形",
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
        "name": "LocallyEuclidean",
        "type": "o",
        "background": "固定 n≥0，每点有到 R^n 开集的邻域同胚"
      }
    ]
  },
  "definitions": [],
  "assumptions": [],
  "declarations": [
    {
      "id": "definition",
      "kind": "formula",
      "source": "(forall x:X y:X. (x = y -> false) -> Separated(x)(y)) ∧ (exists B:Family. Countable(B) ∧ Base(B)) ∧ LocallyEuclidean",
      "status": "DEF"
    }
  ],
  "references": [
    {
      "id": "obj:tdg:t2",
      "version": "1",
      "anchor": "$",
      "formalHash": "sha256:27b05929a54c19b8d05e41d2f74921bedf88dd2423069d3f95875f9281d4bcfe"
    },
    {
      "id": "obj:tdg:c2",
      "version": "1",
      "anchor": "$",
      "formalHash": "sha256:d16031a145779df19cdb777239b85a36138902c10252e76a52f4ad4806a7fff6"
    },
    {
      "id": "obj:tdg:local-euclidean",
      "version": "1",
      "anchor": "$",
      "formalHash": "sha256:a59029dba54d3aa6ba4ed0fb5457c34964c9c8d83f2a94d677ea5ed494380ba9"
    }
  ],
  "members": [],
  "imports": [],
  "exports": [],
  "links": [],
  "lean": []
}
````

# 拓扑流形

局部像欧氏空间，还需排除无法分离与过多坐标块的病态。

## 精确内容

固定 n≥0，M Hausdorff、第二可数、局部同胚于 R^n。

## 依据与边界

DEF：本案例三条件并用；不使用允许非 Hausdorff 的流形定义。

形式接口中的低层符号由 context.background 逐项规定；类型与摘要检查仅为 FINITE，不把背景解释自动当作证明。

## 参考

- 本案例《迁移验收清单》与关系正文。
- Lee, Introduction to Topological Manifolds, 2nd ed., Springer, 2011（拓扑、流形与可数性；按主题引用，未声称逐页复核）。
- Lee, Introduction to Smooth Manifolds, 2nd ed., Springer, 2013（微分、张量、形式与流；按主题引用）。
