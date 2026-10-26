````mcs-object
{
  "schema": "mcs-object/1",
  "id": "obj:grad:definition",
  "version": "1",
  "title": "梯度的定义：导数的 Riesz 表示",
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
  "definitions": [],
  "assumptions": [],
  "declarations": [
    {
      "id": "definition",
      "kind": "term",
      "type": "(E -> R) -> E -> E",
      "source": "lam f:(E -> R). lam x:E. rep (deriv f x)",
      "status": "DEF"
    }
  ],
  "references": [
    {
      "id": "obj:grad:deriv",
      "version": "1",
      "anchor": "$",
      "formalHash": "sha256:01a209b6e38d1f4eedf2ece1f01c9c9462203f8a5fab54c97e53c1489d387cf0"
    },
    {
      "id": "obj:grad:rep",
      "version": "1",
      "anchor": "$",
      "formalHash": "sha256:d2a36d2dab063c46b0d9fcfccbc48290603a674644fef77e9090d25d6db9aeaf"
    }
  ],
  "imports": [],
  "members": [],
  "exports": [],
  "links": [],
  "lean": []
}
````

# 梯度的定义：导数的 Riesz 表示

## 注释

先把导数读成方向上的规则 `deriv f x`，再用内积把它换成一个向量 `rep (deriv f x)`。梯度不是“偏导数排成的一列”，而是“在给定内积下代表导数的那个向量”；定义本身不证明表示存在。

## 依据与边界

DEF：定义是透明项，展开后只含 `lam`、应用与已声明常元；声明锚点为 `definition`。FINITE：候选检查脚本核对类型、展开与引用摘要。NOT-CLAIMED：定义不产生存在性或唯一性；两项分别由 `characterization` 与 `representation-iff` 的假设条件处理。结构检查、命题证明与人工对应审阅分别记录；本对象没有 Lean 绑定。

## 参考

- MCS 专稿第 02、03、04、10 章。
- 候选片段协议见 `mcs-content/README.md`。
