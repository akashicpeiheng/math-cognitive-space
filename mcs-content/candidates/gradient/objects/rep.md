````mcs-object
{
  "schema": "mcs-object/1",
  "id": "obj:grad:rep",
  "version": "1",
  "title": "Riesz 表示选取参数",
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
      "type": "(E -> R) -> E",
      "source": "rep",
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

# Riesz 表示选取参数

## 注释

`rep` 把“方向上的读数规则”换回一个具体的向量。Riesz 表示定理保证：在完备内积空间上，每个连续线性泛函都有唯一这样的向量。本对象只把 `rep` 登记为声明，是为了不把定理本身伪装成定义；`inner` 与 `deriv` 只作为共享签名出现。它存在与否、是否唯一，由使用处假设承担。

## 依据与边界

DEF：签名与接口约定；`rep : (E -> R) -> E` 是有类型参数。FINITE：候选检查脚本核对类型、构造与引用。NOT-CLAIMED：`rep` 的存在性、唯一性与 Riesz 表示定理都不在本对象内证明；表征与分离性由 `obj:grad:unit` 的两条假设承担。结构检查、命题证明与人工对应审阅分别记录；本对象没有 Lean 绑定。

## 参考

- MCS 专稿第 02、04、09 章。
- 候选片段协议见 `mcs-content/README.md`。
- Riesz 表示定理的外部教材定位待补；本对象只把它作为假设来源说明，不写未核对的定理号。
