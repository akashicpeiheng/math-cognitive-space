````mcs-node
{
  "schema": "mcs-node/1",
  "id": "learn:grad:geometry",
  "version": "1",
  "title": "等值线、最速上升与度量边界",
  "goals": [
    "解释梯度与等值线正交、指向最速上升的含义与证明依据",
    "指出度量改变时梯度改变，而方向导数作为方向的函数不变",
    "说明约束问题中“最速上升”需要另行表述"
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

# 等值线、最速上升与度量边界

#微积分 #微分 #梯度 #几何

<!-- mcs-section:overview -->
## 对象与任务

本篇解释梯度的几何读法：方向导数是投影，单位方向上的最大值是 $|g|$，等值线的法向是 $g$。同时把“最速上升”限定在正确的度量与约束条件下；任务是能区分“导数是固有的”与“梯度依赖度量”。

<!-- mcs-section:background -->
## 背景与约定

在 $\mathbb R^n$ 配内积 $\langle\cdot,\cdot\rangle$ 中，$f$ 在 $x$ 可微，$g=\operatorname{grad} f(x)$。只考虑单位方向 $|v|=1$，且 $g\ne0$。若换一个内积，$g$ 会换，但 $(\operatorname{deriv} f\,x)(v)$ 作为 $v$ 的函数不变。约束情形另行说明，不混入无约束结论。本节的 Cauchy–Schwarz 论证使用内积的对称、双线性与正定性；这些公理没有在 M 中登记，因此相关结论按标准模型标注，而不是形式片段内的定理。

<!-- mcs-section:form -->
## 精确内容

投影与最速上升。由表征式，
$$
D_v f(x)=\langle g,v\rangle=|g|\,|v|\cos\theta .
$$
当 $|v|=1$ 时，$D_v f(x)=|g|\cos\theta$。于是：

- 最大值 $|g|$ 在 $v=g/|g|$ 取得；
- 最小值 $-|g|$ 在 $v=-g/|g|$ 取得；
- 零值在 $v\perp g$ 的方向取得（$n\ge2$ 时）。

PROOF（标准模型：Cauchy–Schwarz 的初等形式，使用未登记的内积公理）：对单位 $v$，
$$
0\le |g-\langle g,v\rangle v|^2=|g|^2-\langle g,v\rangle^2,
$$
故 $|\langle g,v\rangle|\le|g|$；等号当且仅当 $g$ 与 $v$ 共线。这个证明只用内积的正性与线性；这些性质在本篇按标准模型假设，M 未登记，因此这里标的是标准模型中的证明，不需要 Riesz 定理。

## 等值线的法向

设 $\gamma$ 是光滑曲线，满足 $f(\gamma(t))=c$，且 $\gamma(0)=x$。在标准微分学中，链式法则给出
$$
0=\frac{d}{dt}f(\gamma(t))\Big|_{t=0}=\langle \operatorname{grad} f(x),\gamma'(0)\rangle .
$$
所以梯度与等值线 $f=c$ 在 $x$ 处的切向垂直。条件匹配：这里用了链式法则与“曲线落在等值线上”两个前提；本片段没有链式法则的形式规则，因此这条结论是标准模型中的定理，不是 M 片段内的 PROOF。若 $g=0$，法向陈述退化，等值线在该点可能仍有切向，但梯度不给方向。

## 度量改变：同一个导数，不同的梯度

取 $E=\mathbb R^2$，$f(x,y)=x+y$，标准内积下 $\operatorname{grad} f=(1,1)$。改取
$$
\langle u,v\rangle_A=u^{\mathsf T}Av,\qquad A=\begin{pmatrix}2&0\\0&1\end{pmatrix}.
$$
则 $A^{-1}=\begin{pmatrix}1/2&0\\0&1\end{pmatrix}$，候选梯度为
$$
g_A=A^{-1}\nabla f=\left(\frac12,1\right).
$$
核对：
$$
\langle g_A,v\rangle_A=\frac12\cdot2v_1+1\cdot v_2=v_1+v_2=(\operatorname{deriv} f\,x)(v).
$$
所以 $g_A$ 是同一导数泛函在新内积下的表示。PROOF：有限矩阵计算。这个例子说明：$f$ 与 $x$ 没变，方向导数规则没变，梯度向量变了。把梯度当成“函数本身的箭头”而不提度量，是不完整的。

## 约束情形：只作为边界提示

在约束集（例如曲面或曲线）上，“最速上升”应理解为在切空间内的最速上升；完整梯度在切空间上的投影才给出可行方向。拉格朗日乘子法处理的是另一套条件，不能由无约束的“梯度指向最速上升”直接推出。本段是 ILLUSTRATION，不是本片段的形式命题；约束优化的形式化需要另建单元。

例子（仅示意）：$f(x,y)=x+y$ 在单位圆 $x^2+y^2=1$ 上，最大值在 $(1/\sqrt2,1/\sqrt2)$；该点的环境梯度 $(1,1)$ 与半径同向，切向分量为零。计算与论证属于标准约束优化，本篇不把它登记为 M 命题。

## 常见误区

- “梯度方向就是函数值增加最快的方向。”在标准内积、无约束、可微且 $g\ne0$ 时成立；换度量或加约束后，方向会变，甚至可行方向里没有 $g$。
- “梯度垂直于等值线，所以等值线一定光滑。”垂直陈述需要曲线可微与链式法则；在 $g=0$ 或等值线有奇点时，不能这样推。
- “方向导数变了，所以梯度也变了。”方向导数作为 $v$ 的函数在换度量时不变；变的是表示向量。区分这两层是本节的核心。

<!-- mcs-section:evidence -->
## 依据与边界

| 断言 | 标签 | 核对入口与边界 |
| --- | --- | --- |
| 单位方向最大值 $|g|$ 在 $g/|g|$ | PROOF（标准模型；内积公理未在 M 登记） | 上面的 Cauchy–Schwarz 初等证明 |
| 等值线法向 | REF（标准微分学；未在 M 中形式化） | 依赖链式法则；未在 M 中形式化 |
| 度量改变给出不同梯度 | FINITE（有限矩阵计算） | $A=\operatorname{diag}(2,1)$ 的核对 |
| 约束情形 | ILLUSTRATION / 未形式化 | 需要切空间与约束优化单元 |

## 回看

- 旋转坐标但不换内积，梯度的分量怎么变？向量本身变吗？
- 若 $g=0$，等值线在 $x$ 附近一定不是光滑曲线吗？请找例子或反例。
- 在约束集上，为什么“把梯度投影到切空间”比“沿梯度走”更合理？请用单位圆的例子说明。

## 参考文献

- MCS 专稿第 02、04、10 章。
- 候选片段 `README.md`、表征与充要对象。
- 标准微分学与约束优化的教材定位待补；本篇不写未核对的页码或定理号。
