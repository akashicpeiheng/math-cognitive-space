````mcs-object
{
  "schema": "mcs-object/1",
  "id": "obj:tdg:cartan",
  "version": "1",
  "title": "Cartan 公式",
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
        "name": "CartanEquality",
        "type": "o",
        "background": "任意光滑形式上 L_Xω=d(ιXω)+ιX(dω)；0形式按内乘约定"
      }
    ]
  },
  "definitions": [],
  "assumptions": [],
  "declarations": [
    {
      "id": "claim",
      "kind": "formula",
      "source": "CartanEquality",
      "status": "PROOF"
    }
  ],
  "references": [
    {
      "id": "obj:tdg:lie",
      "version": "1",
      "anchor": "$",
      "formalHash": "sha256:0e6a4b822c743b43b41b1c686cef36a83def4156afe2fb478d008abf9b48932c"
    },
    {
      "id": "obj:tdg:exterior",
      "version": "1",
      "anchor": "$",
      "formalHash": "sha256:68670268c11c1999c48f6bd60ea2b9000bb04963f17fcf0c505b80aec38b2c74"
    },
    {
      "id": "obj:tdg:insertion",
      "version": "1",
      "anchor": "$",
      "formalHash": "sha256:fbe91b71940fceb9ebd94ea24b759a40faaa15b47bf6eaf7cf6ee6ec0ef5ba98"
    }
  ],
  "members": [],
  "imports": [],
  "exports": [],
  "links": [],
  "lean": []
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
