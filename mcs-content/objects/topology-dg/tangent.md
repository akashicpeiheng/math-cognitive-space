````mcs-object
{
  "schema": "mcs-object/1",
  "id": "obj:tdg:tangent",
  "version": "1",
  "title": "切空间",
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
        "name": "Derivation",
        "type": "o",
        "background": "TpM 的候选元素是作用于 p 附近光滑函数芽的 R 线性映射，并满足 Leibniz：v(fg)=f(p)v(g)+g(p)v(f)"
      }
    ]
  },
  "definitions": [],
  "assumptions": [],
  "declarations": [
    {
      "id": "definition",
      "kind": "formula",
      "source": "Derivation",
      "status": "DEF"
    }
  ],
  "references": [
    {
      "id": "obj:tdg:smooth-manifold",
      "version": "1",
      "anchor": "$",
      "formalHash": "sha256:a787e1f01f9e43f3dcd668a7ef27c82447433c4d95ccd5c5422bbecb9785c691"
    },
    {
      "id": "obj:tdg:derivative",
      "version": "1",
      "anchor": "$",
      "formalHash": "sha256:fa47019fbd377d68a02aad914a80c9e4dbe5f5b473d3f660ed37add394af1217"
    }
  ],
  "members": [],
  "imports": [],
  "exports": [],
  "links": [],
  "lean": []
}
````

# 切空间

用函数的瞬时变化来定义方向，避免依赖嵌入。

## 精确内容

TpM 为在 p 处光滑函数芽上满足 Leibniz 律的 R 线性导子空间；有限维光滑流形上等价于曲线速度。

## 依据与边界

DEF：这里只是一个点的空间；向量场还要求随点光滑变化。

形式接口中的低层符号由 context.background 逐项规定；类型与摘要检查仅为 FINITE，不把背景解释自动当作证明。

## 参考

- 本案例《迁移验收清单》与关系正文。
- Lee, Introduction to Topological Manifolds, 2nd ed., Springer, 2011（拓扑、流形与可数性；按主题引用，未声称逐页复核）。
- Lee, Introduction to Smooth Manifolds, 2nd ed., Springer, 2013（微分、张量、形式与流；按主题引用）。
