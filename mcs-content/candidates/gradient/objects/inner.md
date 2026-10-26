````mcs-object
{
  "schema": "mcs-object/1",
  "id": "obj:grad:inner",
  "version": "1",
  "title": "内积参数",
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
      "type": "E -> E -> R",
      "source": "inner",
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

# 内积参数

## 注释

内积是“把向量读成方向上的变化率”的测量工具；梯度依赖这个工具，换一个内积，同一个导数泛函会得到不同的表示向量。本对象只登记有类型常元 `inner : E -> E -> R`，不声称它满足内积公理。

## 依据与边界

DEF：签名与接口约定；`inner` 的声明是形式负载中唯一被登记的声明，`deriv` 与 `rep` 只作为共享签名出现。FINITE：候选检查脚本核对类型、构造与引用；结构合法不推出对称性、双线性或正定性。NOT-CLAIMED：本对象不证明 `inner` 是某个具体 $E$ 上的内积。结构检查、命题证明与人工对应审阅分别记录；本对象没有 Lean 绑定。

## 参考

- MCS 专稿第 02、04、09 章。
- 候选片段协议见 `mcs-content/README.md`。
- 内积空间与 Riesz 表示的外部教材定位待补；本对象不写未核对的页码或定理号。
