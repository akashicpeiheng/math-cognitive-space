````mcs-object
{
  "schema": "mcs-object/1",
  "id": "obj:grad:deriv",
  "version": "1",
  "title": "导数泛函参数",
  "language": "mcs-formal/1",
  "grammar": "mcs-object-grammar/1",
  "scale": "atom",
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
      "id": "symbol",
      "kind": "term",
      "type": "(E -> R) -> E -> (E -> R)",
      "source": "deriv",
      "status": "DEF"
    }
  ],
  "references": [],
  "imports": [],
  "members": [],
  "exports": [],
  "links": [],
  "lean": []
}
````

# 导数泛函参数

## 注释

导数首先是一条“吃方向、吐变化率”的规则，而不是一个箭头；把这条规则改写成向量才需要内积，方向导数本身不依赖内积。本对象只把 `deriv : (E -> R) -> E -> (E -> R)` 登记为声明，`deriv f x` 的类型为 `E -> R`；`inner` 与 `rep` 只作为共享签名出现。

## 依据与边界

DEF：签名与接口约定。FINITE：候选检查脚本核对类型、构造与引用。NOT-CLAIMED：`deriv` 的解析定义、线性性与连续性未在本对象内登记或证明；节点中凡用到这些性质处均标为标准模型或假设。结构检查、命题证明与人工对应审阅分别记录；本对象没有 Lean 绑定。

## 参考

- MCS 专稿第 02、04、09 章。
- 候选片段协议见 `mcs-content/README.md`。
- 微分学中导数与方向导数的外部教材定位待补；本对象不写未核对的页码或定理号。
