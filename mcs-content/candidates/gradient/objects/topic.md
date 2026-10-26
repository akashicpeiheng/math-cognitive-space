````mcs-object
{
  "schema": "mcs-object/1",
  "id": "obj:grad:topic",
  "version": "1",
  "title": "梯度片段：单成员话题",
  "language": "mcs-formal/1",
  "grammar": "mcs-object-grammar/1",
  "scale": "topic",
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
  "declarations": [],
  "references": [],
  "imports": [],
  "members": [
    {
      "id": "obj:grad:unit",
      "version": "1",
      "anchor": "$",
      "formalHash": "sha256:e8c3ad57eb2a2b9b971703883adfb1909a630f03b6be96d822baac420497bf04"
    }
  ],
  "exports": [],
  "links": [],
  "lean": []
}
````

# 梯度片段：单成员话题

## 注释

用显式成员表把一个已登记的梯度单元组织成话题。话题成员只能是单元；这里只有一个成员，不虚构跨单元定理，也不声称覆盖一般流形上的梯度。坐标公式、最速上升与度量依赖属于阅读节点的展开内容，尚未各自登记为形式单元。

## 依据与边界

DEF：话题成员类型与版本。FINITE：候选检查脚本核对成员尺度与摘要。NOT-CLAIMED：一般内积空间、流形上的梯度、坐标变换与约束优化均不在本片段内。结构检查、命题证明与人工对应审阅分别记录；本对象没有 Lean 绑定。

## 参考

- MCS 专稿第 04、09 章。
- 候选片段协议见 `mcs-content/README.md`。
