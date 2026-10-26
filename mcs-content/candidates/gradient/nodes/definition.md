````mcs-node
{
  "schema": "mcs-node/1",
  "id": "learn:grad:definition",
  "version": "1",
  "title": "梯度的形式定义：从导数泛函到 Riesz 表示",
  "goals": [
    "读出形式定义中每个参数的类型与作用",
    "说明 Riesz 表示定理在定义中承担什么，为什么它被登记为假设",
    "区分定义、表征命题与存在性定理三件事"
  ],
  "objects": [
    {
      "id": "obj:grad:definition",
      "version": "1",
      "anchor": "definition",
      "formalHash": "sha256:ffbf6628d58081a7db9fb0f3976113acac50d696049b443806e15b53c2893870"
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
      "id": "obj:grad:unit",
      "version": "1",
      "anchor": "$",
      "formalHash": "sha256:e8c3ad57eb2a2b9b971703883adfb1909a630f03b6be96d822baac420497bf04"
    }
  ],
  "prerequisites": [
    {
      "id": "learn:grad:why",
      "version": "1"
    }
  ]
}
````

# 梯度的形式定义：从导数泛函到 Riesz 表示

#微积分 #微分 #梯度 #形式验证

<!-- mcs-section:overview -->
## 对象与任务

本篇把梯度写成可检查的形式对象：先登记签名与参数，再给出定义，最后说明两条假设各自承担什么。任务是读懂形式定义、分清“定义”“表征”“存在性”三件事；不把 Riesz 定理伪装成定义。

<!-- mcs-section:background -->
## 背景与约定

签名 `signature:gradient-riesz/1` 固定基本类型 $o,\mathbb R,E$ 与三个常元：

| 符号 | 类型 | 角色 |
| --- | --- | --- |
| $\operatorname{inner}$ | $E\to E\to\mathbb R$ | 二元函数参数；内积公理未登记 |
| $\operatorname{deriv}$ | $(E\to\mathbb R)\to E\to(E\to\mathbb R)$ | 导数泛函参数；线性性未登记 |
| $\operatorname{rep}$ | $(E\to\mathbb R)\to E$ | Riesz 表示选取参数 |

$E$ 没有被构造成 $\mathbb R^n$，$\operatorname{inner}$ 也没有被要求满足内积公理。因此下文的“内积”是标准模型中的读法，不是形式结论；这些条件若需要，必须作为假设或另建单元。对象正文只是说明，权威形式负载在 JSON 接口里。

<!-- mcs-section:form -->
## 精确内容

定义（透明项）：
$$
\operatorname{grad}:=\lambda f:(E\to\mathbb R).\ \lambda x:E.\ \operatorname{rep}(\operatorname{deriv} f\,x).
$$

两条公开假设：

1. 表征假设：$\forall f,x,v.\ (\operatorname{deriv} f\,x)(v)=\langle \operatorname{rep}(\operatorname{deriv} f\,x),v\rangle$。
2. 分离假设：$\forall g,h.\ (\forall v.\ \langle g,v\rangle=\langle h,v\rangle)\Rightarrow g=h$。

两条命题：

- 表征命题：$\forall f,x,v.\ (\operatorname{deriv} f\,x)(v)=\langle \operatorname{grad} f(x),v\rangle$。
- 充要命题：$\forall f,x,g.\ \operatorname{grad} f(x)=g\iff \forall v.\ (\operatorname{deriv} f\,x)(v)=\langle g,v\rangle$。

### 逐条件分析

| 条件 | 用途 | 删掉后的结果 | 证据状态 |
| --- | --- | --- | --- |
| $\operatorname{deriv}$ 是 $E\to\mathbb R$ 的规则 | 把“方向”与“变化率”分开 | 只剩一个未解释的向量场，无法谈方向导数 | DEF |
| $\operatorname{rep}$ 存在 | 把规则换成向量 | 只能谈导数泛函，不能谈梯度向量 | NOT-CLAIMED（假设；Riesz 定理未证） |
| 表征假设 | 让内积读数等于方向导数 | 梯度即使存在也不代表导数 | NOT-CLAIMED（假设） |
| 分离假设 | 保证表示向量唯一 | 可以有多个向量满足同一读数；退化形式给出反例 | NOT-CLAIMED（假设；反例见证明节点） |
| $\operatorname{inner}$ 的类型 | 提供 $\langle\cdot,\cdot\rangle$ 的记号 | 没有它就不能把泛函写成向量 | DEF（类型）；公理未登记 |

内积公理（对称、双线性、正定）与 $\operatorname{deriv}$ 的解析定义都不在签名里；它们不是本片段的隐藏前提，而是标准模型或后续假设的内容。

## 与阅读节点的分工

形式对象 `obj:grad:unit` 封装成员、导出与两条假设；它不包含坐标公式、最速上升或链式法则。那些内容需要额外的签名与定理，放在阅读节点中作为展开，并明确标注哪些是本片段已形式化的、哪些是标准微分学中的结果。节点不因为讲得更长而获得形式尺度。

<!-- mcs-section:evidence -->
## 依据与边界

DEF：签名、定义、假设的类型。PROOF：两条命题相对假设成立；证明在对象正文，不表示内核重放或 Lean 通过。NOT-CLAIMED：Riesz 定理、内积公理、$\operatorname{deriv}$ 的解析定义。FINITE：候选检查脚本核对类型、成员、导出与摘要；结构合法不判定数学真值。人工对应审阅为空。

## 回看

- 如果把 $\operatorname{inner}$ 换成另一个同类型的常元，哪些符号的展开会变？哪些命题的陈述不变？
- 如果删掉分离假设，充要命题的哪个方向先失效？
- 如果要证明 Riesz 定理，至少需要给 $E$ 增加什么结构？

## 参考文献

- MCS 专稿第 02、03、04、09、10 章。
- 候选片段 `README.md` 与 `objects/` 下的定义、表征、充要对象。
- 外部泛函分析教材定位待补；本篇不写未核对的定理号。
