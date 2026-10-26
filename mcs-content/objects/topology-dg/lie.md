````mcs-object
{
  "schema": "mcs-object/1",
  "id": "obj:tdg:lie",
  "version": "1",
  "title": "Lie 导数",
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
        "name": "LieFlowFormula",
        "type": "o",
        "background": "光滑向量场 X 的局部流 Φt，候选 L_X T= d/dt|0 Φt* T；张量场拉回使用可逆微分，对向量有 L_XY=[X,Y]"
      }
    ]
  },
  "definitions": [],
  "assumptions": [],
  "declarations": [
    {
      "id": "definition",
      "kind": "formula",
      "source": "LieFlowFormula",
      "status": "DEF"
    }
  ],
  "references": [
    {
      "id": "obj:tdg:flow",
      "version": "1",
      "anchor": "$",
      "formalHash": "sha256:011ec27722a70679b9c50dc3f9ed74b257d68f440dd3c464873beb0ae67285e8"
    },
    {
      "id": "obj:tdg:tensor-field",
      "version": "1",
      "anchor": "$",
      "formalHash": "sha256:7a8202e0aafca44042779469f219aac1a0f3b83854848fb25506fc852e16b2f2"
    }
  ],
  "members": [],
  "imports": [],
  "exports": [],
  "links": [],
  "lean": []
}
````

# Lie 导数

沿流移动比较几何场；先拉回到同一点再求差。

## 精确内容

对光滑向量场 X 的局部流 Φt，L_XT=(d/dt)|0 Φt* T；只在共同定义域讨论。

## 依据与边界

DEF：任意向量场只保证局部流；不假定完备。

形式接口中的低层符号由 context.background 逐项规定；类型与摘要检查仅为 FINITE，不把背景解释自动当作证明。

## 参考

- 本案例《迁移验收清单》与关系正文。
- Lee, Introduction to Topological Manifolds, 2nd ed., Springer, 2011（拓扑、流形与可数性；按主题引用，未声称逐页复核）。
- Lee, Introduction to Smooth Manifolds, 2nd ed., Springer, 2013（微分、张量、形式与流；按主题引用）。
