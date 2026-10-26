````mcs-node
{
  "schema": "mcs-node/1",
  "id": "learn:grad:proof",
  "version": "1",
  "title": "表征唯一性的证明与假设边界",
  "goals": [
    "重建充要命题的双向证明，指出分离假设的使用位置",
    "区分纸笔证明、片段假设与 Riesz 表示定理，说明还缺什么才能成为完整形式定理"
  ],
  "objects": [
    {
      "id": "obj:grad:characterization",
      "version": "1",
      "anchor": "claim",
      "formalHash": "sha256:6e0123698bb66226b118e3b578e93ff2553b9b8076fb81312b818857dea3a9ef"
    },
    {
      "id": "obj:grad:representation-iff",
      "version": "1",
      "anchor": "claim",
      "formalHash": "sha256:d37b6435d70c5d64e24a189816a9f92d6823ba0ed451999555175b0fd52afe7e"
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
      "id": "learn:grad:definition",
      "version": "1"
    }
  ]
}
````

# 表征唯一性的证明与假设边界

#微积分 #微分 #梯度 #形式验证

<!-- mcs-section:overview -->
## 对象与任务

本篇重建“梯度由方向导数唯一确定”的证明，逐条指出假设的使用位置，并说明这个证明与 Riesz 表示定理的分工。目标是能独立写出双向推导，能指出删掉哪条假设会失去哪一半结论。

<!-- mcs-section:background -->
## 背景与约定

沿用片段的签名与两条假设：

- (R) $\forall f,x,v.\ (\operatorname{deriv} f\,x)(v)=\langle \operatorname{rep}(\operatorname{deriv} f\,x),v\rangle$；
- (S) $\forall g,h.\ (\forall v.\ \langle g,v\rangle=\langle h,v\rangle)\Rightarrow g=h$。

定义 $\operatorname{grad} f(x)=\operatorname{rep}(\operatorname{deriv} f\,x)$。

两条假设是片段的接口条件，不是内积公理；内积公理与 Riesz 定理都不在 M 内。下文的证明只使用 (R)、(S) 与定义。

<!-- mcs-section:form -->
## 精确内容

目标命题：
$$
\operatorname{grad} f(x)=g\iff \forall v.\ (\operatorname{deriv} f\,x)(v)=\langle g,v\rangle .
$$

## 概括证明

右到左：若 $g$ 逐方向代表导数，则它与 $\operatorname{grad} f(x)$ 有相同的内积读数；由 (S) 得相等。左到右：若 $g$ 就是梯度，则表征式直接把导数写成 $\langle g,v\rangle$。两条方向分别使用 (S) 与 (R)+(定义)。

## 细节与条件使用位置

**(⇒)** 设 $\operatorname{grad} f(x)=g$。对任意 $v$，
$$
(\operatorname{deriv} f\,x)(v)
=\langle \operatorname{rep}(\operatorname{deriv} f\,x),v\rangle
=\langle \operatorname{grad} f(x),v\rangle
=\langle g,v\rangle .
$$
第一处等号用 (R)，第二处用定义，第三处用假设的等式。此方向不用 (S)。

**(⇐)** 设 $\forall v.\ (\operatorname{deriv} f\,x)(v)=\langle g,v\rangle$。对任意 $v$，
$$
\langle \operatorname{grad} f(x),v\rangle
=(\operatorname{deriv} f\,x)(v)
=\langle g,v\rangle .
$$
第一处等号是表征命题（由 (R)+定义得到），第二处是假设。于是 $\forall v.\ \langle \operatorname{grad} f(x),v\rangle=\langle g,v\rangle$；对 $h:=\operatorname{grad} f(x)$ 与 $g$ 用 (S)，得 $\operatorname{grad} f(x)=g$。此方向用 (S)。

## 两条假设都不是装饰

### 删掉 (S)：表示不唯一

取 $E=\mathbb R^2$，但把“内积”退化为
$$
\langle (a,b),(c,d)\rangle=ac .
$$
它不是内积（不满足正定性），只作为说明 (S) 不可省的代数例子。令 $f(x,y)=x$，则 $(\operatorname{deriv} f\,x)(v)=v_1$。取 $g=(1,0)$ 与 $g'=(1,1)$，都有
$$
\langle g,v\rangle=v_1=\langle g',v\rangle .
$$
所以表示向量不唯一，充要命题的“右到左”失败。PROOF：有限计算。这个例子不否定“内积空间上表示唯一”；它说明唯一性来自 (S)，而不是来自“有一个 rep 符号”。

### 删掉 (R)：可能根本没有表示

仍取退化形式 $\langle (a,b),(c,d)\rangle=ac$，考虑线性泛函 $L(c,d)=d$。若 $L=\langle g,\cdot\rangle$，则 $g_1c=d$ 对所有 $c,d$ 成立，不可能。于是这样的 $L$ 没有表示；若把 $L$ 当作某个导数泛函，梯度不存在。PROOF：比较 $c=1,d=0$ 与 $c=0,d=1$。

### Riesz 定理在哪里

(R) 不是凭空假设：在完备内积空间上，每个连续线性泛函都有唯一表示向量，这就是 Riesz 表示定理。它需要 $E$ 的完备性、泛函的连续性，以及内积的正定性；证明通常用闭子空间与正交分解或极小化。本片段没有这些结构，所以把 (R) 登记为假设，把“证明 Riesz”留作后续单元。把 (R) 说成“已由本片段证明”会混淆假设与定理。

## 与机器检查的距离

对象里的 `status: PROOF` 表示有纸笔论证；它不表示已编码成第 02 章的认证演算并运行内核。本片段没有 Lean 绑定；`lean` 为空。若要把这条证明机器化，需要先形式化 `deriv` 的线性性、内积公理与 Riesz 定理，工作量远大于本片段。

<!-- mcs-section:evidence -->
## 依据与边界

| 断言 | 标签 | 核对入口与边界 |
| --- | --- | --- |
| 充要命题 | PROOF（相对两条假设） | 上面的双向推导 |
| 删掉 (S) 的反例 | PROOF（有限计算） | 退化形式与 $f(x,y)=x$ |
| 删掉 (R) 的反例 | PROOF（有限计算） | 泛函 $L(c,d)=d$ |
| Riesz 定理 | REF（标准泛函分析；本片段不证） | 需要完备性与连续性；本片段不证 |
| Lean 重放 | NOT-CLAIMED | `lean` 为空 |

## 回看

- 双向证明中，(S) 只出现在哪个方向？如果 (S) 只对某个子空间成立，结论会削弱成什么？
- 无限维时，为什么“连续”对 Riesz 定理不可省？请找一个不连续线性泛函的例子（提示：选择公理）。
- 如果要给本片段加一条链式法则，至少需要新增哪些符号与假设？

## 参考文献

- MCS 专稿第 02、03、04、15 章（演算、语义、对象、证据标准）。
- 候选片段 `README.md`、`objects/representation-iff.md`。
- Riesz 表示定理的外部教材定位待补；本篇只把它作为假设的来源说明，不写未核对的定理号。
