````mcs-object
{
  "schema": "mcs-object/1",
  "id": "obj:grad:unit",
  "version": "1",
  "title": "梯度片段：内积、导数与表征接口",
  "language": "mcs-formal/1",
  "grammar": "mcs-object-grammar/1",
  "scale": "unit",
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
  "assumptions": [
    "forall f:(E -> R) x:E v:E. deriv f x v = inner (rep (deriv f x)) v",
    "forall g:E h:E. (forall v:E. inner g v = inner h v) -> g = h"
  ],
  "declarations": [],
  "references": [],
  "imports": [],
  "members": [
    {
      "id": "obj:grad:inner",
      "version": "1",
      "anchor": "$",
      "formalHash": "sha256:aef00e2a7efaf44e3ff156eb52ecfdc1d0e674033d6f52e2260291d9f948af9e"
    },
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
    },
    {
      "id": "obj:grad:definition",
      "version": "1",
      "anchor": "$",
      "formalHash": "sha256:d409c20368584f8f6c55cd5a5833e9aef0b106de89ab1618d85f85d20429076f"
    },
    {
      "id": "obj:grad:characterization",
      "version": "1",
      "anchor": "$",
      "formalHash": "sha256:0279cd384ce1b79da11ae5150659985524df78e668587a1db18402f8e4f22b0d"
    },
    {
      "id": "obj:grad:representation-iff",
      "version": "1",
      "anchor": "$",
      "formalHash": "sha256:700a32255f51caefea18e2dd1ecbc8297bad88941b6a1c3ffa37a9b222ae3fbc"
    }
  ],
  "exports": [
    {
      "name": "inner",
      "ref": {
        "id": "obj:grad:inner",
        "version": "1",
        "anchor": "symbol",
        "formalHash": "sha256:763fde917d63d0c7b23a8357632a33fff98431c995e4232ace73047361ce28fb"
      },
      "type": "E -> E -> R"
    },
    {
      "name": "deriv",
      "ref": {
        "id": "obj:grad:deriv",
        "version": "1",
        "anchor": "symbol",
        "formalHash": "sha256:75810ab158d63332a37dabab7623f9bfce33915f5679b200cf8f17308cac1f94"
      },
      "type": "(E -> R) -> E -> (E -> R)"
    },
    {
      "name": "rep",
      "ref": {
        "id": "obj:grad:rep",
        "version": "1",
        "anchor": "symbol",
        "formalHash": "sha256:708e52254fab79785e62961763ede95a1c1cac352d6e7fe2c433bd48c9473451"
      },
      "type": "(E -> R) -> E"
    },
    {
      "name": "grad",
      "ref": {
        "id": "obj:grad:definition",
        "version": "1",
        "anchor": "definition",
        "formalHash": "sha256:ffbf6628d58081a7db9fb0f3976113acac50d696049b443806e15b53c2893870"
      },
      "type": "(E -> R) -> E -> E"
    },
    {
      "name": "characterization",
      "ref": {
        "id": "obj:grad:characterization",
        "version": "1",
        "anchor": "claim",
        "formalHash": "sha256:6e0123698bb66226b118e3b578e93ff2553b9b8076fb81312b818857dea3a9ef"
      },
      "type": "o"
    },
    {
      "name": "representationIff",
      "ref": {
        "id": "obj:grad:representation-iff",
        "version": "1",
        "anchor": "claim",
        "formalHash": "sha256:d37b6435d70c5d64e24a189816a9f92d6823ba0ed451999555175b0fd52afe7e"
      },
      "type": "o"
    }
  ],
  "links": [],
  "lean": []
}
````

# 梯度片段：内积、导数与表征接口

## 注释

把“内积、导数、表示、梯度定义、两条命题”封成一个可引用的单元。单元只保证成员类型、导出类型与接口一致；它不证明 Riesz 定理，也不把 `deriv` 的解析定义偷偷塞进签名。两条假设（表征与分离性）是本片段的公开接口条件：换掉它们，单元里的命题不再成立。

## 依据与边界

DEF：成员类型、导出类型与模块接口。FINITE：候选检查脚本核对成员尺度、导出类型、引用摘要与无环性。NOT-CLAIMED：两条假设在具体 `E` 上何时成立；这需要另行证明 Riesz 表示定理与内积公理。结构检查、命题证明与人工对应审阅分别记录；本对象没有 Lean 绑定。

## 参考

- MCS 专稿第 02、04、09 章。
- 候选片段协议见 `mcs-content/README.md`。
