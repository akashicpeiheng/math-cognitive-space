````mcs-object
{
  "schema": "mcs-object/1",
  "id": "obj:grad:representation-iff",
  "version": "1",
  "title": "梯度与表征向量的充要条件",
  "language": "mcs-formal/1",
  "grammar": "mcs-object-grammar/1",
  "scale": "molecule",
  "context": {
    "signature": "signature:gradient-riesz/1",
    "bases": [
      "o",
      "R",
      "E"
    ],
    "constants": [
      {
        "name": "inner",
        "type": "E -> E -> R",
        "background": "E 上的二元函数参数；本片段不登记对称性、双线性与正定性，也不构造 E。节点中凡用到这些性质处均按标准模型标注。"
      },
      {
        "name": "deriv",
        "type": "(E -> R) -> E -> (E -> R)",
        "background": "把 f 在 x 处的导数登记为 E 上的函数；差商极限、Fréchet 导数、线性性与连续性均未在本片段内登记。"
      },
      {
        "name": "rep",
        "type": "(E -> R) -> E",
        "background": "把线性泛函送到 Riesz 表示向量的选取参数；其存在性与唯一性属于 Riesz 表示定理，本片段不证明。"
      }
    ]
  },
  "definitions": [
    {
      "name": "grad",
      "type": "(E -> R) -> E -> E",
      "source": "lam f:(E -> R). lam x:E. rep (deriv f x)"
    }
  ],
  "assumptions": [
    "forall f:(E -> R) x:E v:E. deriv f x v = inner (rep (deriv f x)) v",
    "forall g:E h:E. (forall v:E. inner g v = inner h v) -> g = h"
  ],
  "declarations": [
    {
      "id": "claim",
      "kind": "formula",
      "source": "forall f:(E -> R) x:E g:E. grad f x = g <=> (forall v:E. deriv f x v = inner g v)",
      "status": "PROOF"
    }
  ],
  "references": [
    {
      "id": "obj:grad:definition",
      "version": "1",
      "anchor": "$",
      "formalHash": "sha256:d409c20368584f8f6c55cd5a5833e9aef0b106de89ab1618d85f85d20429076f"
    },
    {
      "id": "obj:grad:characterization",
      "version": "1",
      "anchor": "claim",
      "formalHash": "sha256:6e0123698bb66226b118e3b578e93ff2553b9b8076fb81312b818857dea3a9ef"
    },
    {
      "id": "obj:grad:inner",
      "version": "1",
      "anchor": "$",
      "formalHash": "sha256:aef00e2a7efaf44e3ff156eb52ecfdc1d0e674033d6f52e2260291d9f948af9e"
    }
  ],
  "imports": [],
  "members": [],
  "exports": [],
  "links": [],
  "lean": []
}
````

# 梯度与表征向量的充要条件

## 注释

一个向量是梯度，当且仅当它与每个方向的内积都等于该方向的方向导数：
$$
\operatorname{grad} f\,x=g
\iff
\forall v\in E.\;(\operatorname{deriv} f\,x)(v)=\langle g,v\rangle .
$$
这个充要条件把“梯度是什么”变成一条可逐方向核对的判据，也把唯一性包含进来：若两个向量都满足，它们相等。

## 依据与边界

DEF：签名、定义与假设的类型。PROOF：相对两条假设的纸笔论证见学习节点 `learn:grad:proof`；本对象不重放内核，也不表示 Lean 已通过。NOT-CLAIMED：Riesz 表示定理、`deriv` 的解析定义与内积公理；Lean 机器重放不在本对象内。FINITE：候选检查脚本核对公式类型、展开与引用摘要。人工对应审阅为空。

## 参考

- MCS 专稿第 02、03、04、10 章。
- 候选片段协议见 `mcs-content/README.md`。
