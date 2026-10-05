---
tags: #微分几何 #流形 #微分形式 #外积 #外代数
---

# 微分形式的外积

外积（exterior product / wedge product）是[[微分形式]]之间最重要的代数运算之一。它将一个 $p$ 次[[微分形式]]与一个 $q$ 次[[微分形式]]结合为一个 $p+q$ 次[[微分形式]]，使得[[微分形式]]的全体构成一个分次代数——外代数（Grassmann 代数）。外积与[[外微分]]、[[拉回映射]]等运算相互配合，构成了[[流形]]上微积分（又称"外微分法"）的核心工具。

---

# 前置知识

## 必备知识

- **线性代数**：对偶空间、[[张量积]]、反对称化、行列式。
- **[[微分流形]]**：切空间、[[余切空间]]、[[光滑向量场]]。
- **协变[[张量]]场**：$(0,s)$ 型[[张量]]场的定义与局部坐标表示。

## 辅助知识

- **反称协变[[张量]]**（外形式）：在每一点 $p\in M$ 上，$s$ 阶反称协变[[张量]] $\omega$ 满足对任意置换 $\pi$ 有
  $$
  \omega(X_{\pi(1)},\dots,X_{\pi(s)}) = (-1)^\pi\,\omega(X_1,\dots,X_s).
  $$
  $s$ 阶反称协变[[张量]]的全体记为 $\bigwedge^s T_p^*M$。

- **外形式丛**：$\bigwedge^s T^*M = \bigcup_{p\in M}\bigwedge^s T_p^*M$ 是 $M$ 上的向量丛（$s$ 阶外形式丛），其光滑截面称为 $s$ 次[[微分形式]]，记为 $\Omega^s(M)$。

## 拓展知识

- **外代数**：令 $\bigwedge T_p^*M = \bigoplus_{k=0}^{n}\bigwedge^k T_p^*M$（其中 $n=\dim M$），则 $\{1,\, e^i,\, e^i\land e^j,\, \dots,\, e^1\land\dots\land e^n\}$ 构成其基，且有 $\dim\bigwedge T_p^*M = 2^n$。外积运算 $\land$ 使 $\bigwedge T_p^*M$ 成为一个代数，称为**外代数**。
- **[[de Rham 上同调]]**：外积在 [[de Rham 上同调]]类之间诱导出乘法，使 $H^*_{\mathrm{dR}}(M)$ 成为一个分次环。

---

# 动机

## 引入动机

在多变量微积分中，我们希望有一种自然的乘法来处理微分 $dx^i$，使得：
- 面积的"有向"性质被自动捕获——即交换两个微分会改变符号；
- 重积分中的变量替换公式（Jacobi 行列式）能自然地出现；
- Stokes 定理等高维积分公式可以被统一表述。

从代数角度看，[[张量积]] $\otimes$ 给出的 $(0,s)$ 型[[张量]]空间过于庞大，而我们真正关心的是**反称**的部分——因为只有反称部分才能在有向区域上积分。外积正是[[张量积]]与反对称化运算结合的产物。

## 构造动机

外积的构造思路很自然：先做[[张量积]]，再对结果进行反对称化，最后适当缩放以保证结合律等良好性质。

从历史上看，二维情形最为直观。在 $(u,v)$ 平面上，一次[[微分形式]] $\alpha = a_1du + a_2dv$ 和 $\beta = b_1du + b_2dv$ 的楔积为
$$
\alpha\land\beta = (a_1b_2 - a_2b_1)\,du\land dv,
$$
其系数恰为系数矩阵的行列式。这正对应了平行四边形有向面积的计算。更高维情形是这一思想的自然推广。

---

# 形式

## 规范的通用形式

### 代数定义（逐点）

设 $f\in\bigwedge^r V^*$，$g\in\bigwedge^s V^*$ 是[[向量空间]] $V$ 上的外形式，则 $f$ 与 $g$ 的**外积**定义为
$$
f\land g = \frac{(r+s)!}{r!\,s!}\,A_{r+s}(f\otimes g),
$$
其中 $A_{r+s}$ 是 $(r+s)$ 重线性函数的反对称化算子：
$$
A_{r+s}(h)(u_1,\dots,u_{r+s}) = \frac{1}{(r+s)!}\sum_{\pi\in S_{r+s}}(-1)^\pi\,h(u_{\pi(1)},\dots,u_{\pi(r+s)}).
$$

$f\land g$ 是一个 $r+s$ 次外形式，因此 $\land$ 是映射
$$
\land:\;\bigwedge^r V^* \times \bigwedge^s V^* \longrightarrow \bigwedge^{r+s} V^*.
$$

### [[微分形式]]的全局定义

对于[[流形]] $M$ 上的[[微分形式]] $\alpha\in\Omega^r(M)$ 和 $\beta\in\Omega^s(M)$，它们的**外积** $\alpha\land\beta\in\Omega^{r+s}(M)$ 逐点定义为
$$
(\alpha\land\beta)|_p = \alpha|_p \land \beta|_p,\quad \forall p\in M.
$$

用切向量求值的形式，对任意[[光滑向量场]] $X_1,\dots,X_{r+s}$ 有
$$
\alpha\land\beta\,(X_1,\dots,X_{r+s}) = \frac{1}{r!\,s!}\sum_{\pi\in S_{r+s}}(-1)^\pi\,\alpha(X_{\pi(1)},\dots,X_{\pi(r)})\,\beta(X_{\pi(r+1)},\dots,X_{\pi(r+s)}).
$$

特别地，当 $r=s=1$ 时，
$$
\alpha\land\beta\,(X,Y) = \alpha(X)\beta(Y) - \alpha(Y)\beta(X),\quad \forall X,Y\in T_pM.
$$

### 局部坐标表示

在局部坐标系 $(U,\{x^i\})$ 下，$p$ 次[[微分形式]] $\omega$ 可唯一地表示为
$$
\omega = \sum_{i_1<\dots<i_p} \omega_{i_1\dots i_p}\, dx^{i_1}\land\dots\land dx^{i_p},
$$
其中系数函数
$$
\omega_{i_1\dots i_p} = \omega\!\left(\frac{\partial}{\partial x^{i_1}},\dots,\frac{\partial}{\partial x^{i_p}}\right)
$$
关于指标是反称的。

两个[[微分形式]] $\omega\in\Omega^r(M)$ 与 $\eta\in\Omega^s(M)$ 的外积在局部坐标下通过分配律和基本关系 $dx^i\land dx^j = -dx^j\land dx^i$ 直接计算。

### 两种约定的说明

关于外积定义中的常数因子，存在两种常用约定：
- **行列式约定**（determinant convention）：如本文采用的 $f\land g = \frac{(r+s)!}{r!s!}A_{r+s}(f\otimes g)$，在大多数微分几何教材中使用。
- **Alt 约定**（Alt convention）：$f\land g = A_{r+s}(f\otimes g)$，不带组合数因子。

两种约定下外积的代数性质（分配律、结合律、反交换律）一致，但在局部坐标表达式中系数因子不同。

## 等价表达

### 用广义 Kronecker 符号
$$
f\land g\,(u_1,\dots,u_{r+s}) = \frac{1}{r!\,s!}\,\delta^{i_1\dots i_{r+s}}_{1\dots r+s}\,
f(u_{i_1},\dots,u_{i_r})\,g(u_{i_{r+1}},\dots,u_{i_{r+s}}).
$$

### 一次形式的外积 = 行列式
设有 $r$ 个一次形式 $\xi^1,\dots,\xi^r\in V^*$，则对任意 $v_1,\dots,v_r\in V$，
$$
\xi^1\land\dots\land\xi^r\,(v_1,\dots,v_r) = \det\bigl(\xi^i(v_j)\bigr).
$$
这是外积与行列式最直接的联系。

## 形式的类别

微分形式的外积可以根据所涉及的形式次数分类：
- **0-形式与 $p$-形式的外积**：$f\land\omega = f\omega$（即函数乘法），其中 $f$ 是 0-形式。
- **两个 1-形式的外积**：得到 2-形式，系数为行列式。
- **$p$-形式与 $q$-形式的外积**：得到 $(p+q)$-形式。

当 $p+q > \dim M$ 时，$\alpha\land\beta = 0$（因为不存在高于 $n$ 次的反称形式）。

## 降维表述

外积本质上是对"有向体积元"的代数化。考虑 $n$ 维[[向量空间]] $V$，$\xi^1\land\dots\land\xi^n(v_1,\dots,v_n)$ 就是平行 $n$ 面体的有向体积。从这个角度看，外积就是从低维有向体积"生成"高维有向体积的运算。

## 升维视角

外积使 $\bigwedge T_p^*M = \bigoplus_{k=0}^n\bigwedge^k T_p^*M$ 成为一个**分次代数**（$\mathbb{Z}_2$-分次交换代数），分次交换律体现为
$$
\alpha\land\beta = (-1)^{\deg\alpha\,\deg\beta}\,\beta\land\alpha.
$$

在 [[de Rham 上同调]]中，外积诱导出上同调类之间的乘法，使 $H^*_{\mathrm{dR}}(M)$ 成为一个分次环——这是代数拓扑与微分几何之间的重要桥梁。

---

# 证明

## 外积的运算律

以下设 $f\in\bigwedge^r V^*$，$g\in\bigwedge^s V^*$，$h\in\bigwedge^t V^*$。

### 1. 分配律
$$
(f_1+f_2)\land g = f_1\land g + f_2\land g,\qquad
f\land(g_1+g_2) = f\land g_1 + f\land g_2.
$$
这是[[张量积]]的分配律和反对称化的线性性的直接推论。

### 2. 结合律
$$
(f\land g)\land h = f\land(g\land h).
$$
证明：根据定义，
$$
\begin{aligned}
(f\land g)\land h &= \frac{(r+s+t)!}{(r+s)!\,t!}\,A_{r+s+t}\bigl((f\land g)\otimes h\bigr)\\
&= \frac{(r+s+t)!}{(r+s)!\,t!}\,\frac{(r+s)!}{r!\,s!}\,A_{r+s+t}\bigl(A_{r+s}(f\otimes g)\otimes h\bigr)\\
&= \frac{(r+s+t)!}{r!\,s!\,t!}\,A_{r+s+t}\bigl(A_{r+s}(f\otimes g)\otimes h\bigr).
\end{aligned}
$$
类似地，
$$
f\land(g\land h) = \frac{(r+s+t)!}{r!\,s!\,t!}\,A_{r+s+t}\bigl(f\otimes A_{s+t}(g\otimes h)\bigr).
$$
可以验证两个表达式都等于 $\frac{(r+s+t)!}{r!\,s!\,t!}\,A_{r+s+t}(f\otimes g\otimes h)$，故结合律成立。

### 3. 反交换律（分次交换律）
$$
f\land g = (-1)^{rs}\,g\land f.
$$
证明概要：
$$
\begin{aligned}
f\land g\,(x_1,\dots,x_{r+s})
&= \frac{1}{r!\,s!}\sum_{\pi\in S_{r+s}}(-1)^\pi\,f(x_{\pi(1)},\dots,x_{\pi(r)})\,g(x_{\pi(r+1)},\dots,x_{\pi(r+s)})\\
&= (-1)^{rs}\,\frac{1}{s!\,r!}\sum_{\pi\in S_{r+s}}(-1)^\pi\,g(x_{\pi(1)},\dots,x_{\pi(s)})\,f(x_{\pi(s+1)},\dots,x_{\pi(s+r)})\\
&= (-1)^{rs}\,g\land f\,(x_1,\dots,x_{r+s}).
\end{aligned}
$$

**推论**：对于一次形式 $\xi,\eta$，有 $\xi\land\eta = -\eta\land\xi$，特别地 $\xi\land\xi = 0$。对于偶次形式（$r$ 为偶数），反交换律退化为交换律。

## 外积与拉回映射的相容性

设 $F:M\to N$ 为光滑映射，$\omega\in\Omega^r(N)$，$\eta\in\Omega^s(N)$，则
$$
F^*(\omega\land\eta) = F^*\omega\land F^*\eta.
$$
证明：任取 $u_1,\dots,u_{r+s}\in T_pM$，
$$
\begin{aligned}
(F^*(\omega\land\eta))(u_1,\dots,u_{r+s})
&= (\omega\land\eta)(F_*u_1,\dots,F_*u_{r+s})\\
&= \frac{1}{r!\,s!}\sum_{\pi}(-1)^\pi\,\omega(F_*u_{\pi(1)},\dots,F_*u_{\pi(r)})\,\eta(F_*u_{\pi(r+1)},\dots,F_*u_{\pi(r+s)})\\
&= \frac{1}{r!\,s!}\sum_{\pi}(-1)^\pi\,(F^*\omega)(u_{\pi(1)},\dots,u_{\pi(r)})\,(F^*\eta)(u_{\pi(r+1)},\dots,u_{\pi(r+s)})\\
&= (F^*\omega\land F^*\eta)(u_1,\dots,u_{r+s}).
\end{aligned}
$$

## 外积与外微分的 Leibniz 法则

若 $\omega$ 为 $r$ 次[[微分形式]]，则
$$
d(\omega\land\eta) = d\omega\land\eta + (-1)^r\,\omega\land d\eta.
$$
证明思路：利用外微分的定义和[[微分形式]]的局部表示，可设 $\omega = f\omega_0$，$\eta = g\eta_0$ 且 $d\omega_0=0$，$d\eta_0=0$，然后直接计算。

---

# 应用

## 直接应用

### 例 1：两个 1-形式的外积
在 $(u,v)$ 平面上，设
$$
\alpha = a_1\,du + a_2\,dv,\quad \beta = b_1\,du + b_2\,dv,
$$
则
$$
\alpha\land\beta = (a_1b_2 - a_2b_1)\,du\land dv.
$$
系数恰为 $\begin{pmatrix}a_1&a_2\\ b_1&b_2\end{pmatrix}$ 的行列式。

### 例 2：外积化简
化简 $(3x+4y-5z)\land(2x-3y+z)$（其中 $x,y,z$ 为一次形式）：
$$
\begin{aligned}
&= -9\,x\land y + 3\,x\land z + 8\,y\land x + 4\,y\land z - 10\,z\land x + 15\,z\land y\\
&= -17\,x\land y - 11\,y\land z - 13\,z\land x.
\end{aligned}
$$

### 例 3：线性无关性的判定
$\xi^1,\dots,\xi^r\in V^*$ 线性相关当且仅当 $\xi^1\land\dots\land\xi^r = 0$。
- 若线性相关，不妨设 $\xi^1 = \sum_{i=2}^r a_i\xi^i$，代入后展开每一项都含相同因子，故结果为 0。
- 若线性无关，可扩充为 $V^*$ 的基，则对偶基下的求值给出非零行列式。

## 间接应用

### Stokes 定理的统一表述
外积与外微分的配合使得高维 Stokes 定理可以统一为
$$
\int_M d\omega = \int_{\partial M}\omega,
$$
其中 $M$ 是定向带边[[流形]]，$\omega$ 是[[微分形式]]。

### [[de Rham 上同调]]环
由于 $d(\omega\land\eta) = d\omega\land\eta + (-1)^{\deg\omega}\omega\land d\eta$，两个闭形式的外积仍是闭形式；若其中一个为恰当形式，外积仍为恰当形式。因此外积在 [[de Rham 上同调]]类上诱导出良定义的乘法，使
$$
H^*_{\mathrm{dR}}(M) = \bigoplus_{k=0}^n H^k_{\mathrm{dR}}(M)
$$
成为一个分次环（上同调环）。de Rham 定理进一步表明，这个环与拓扑上同调环 $H^*(M;\mathbb{R})$ 是同构的——这是代数拓扑与微分几何之间的主要桥梁。

### $\mathbb{R}^3$ 中的向量分析
在三维欧氏空间中，通过[[微分形式]]的对应：
- 1-形式 $\leftrightarrow$ 向量场
- 2-形式 $\leftrightarrow$ 向量场
- 外微分 $d$ 对应 $\mathrm{grad},\,\mathrm{curl},\,\mathrm{div}$
- 外积 $\land$ 对应叉积（两个 1-形式的楔积对应叉积的"对偶"）

Maxwell 方程组可以用[[微分形式]]极其简洁地写作
$$
dF = 0,\quad d*F = J,
$$
其中 $F$ 是电磁场强度 2-形式。

### 第一基本形式
在曲面论中，第一基本形式 $I = dr\cdot dr$ 可以视为一次[[微分形式]] $dr$ 与其自身的内积，在参数变换下具有形式不变性。

---

# 推广

- **向量值[[微分形式]]**：外积可以推广到取值于向量丛的[[微分形式]]上，配合相应的[[联络形式]]使用。
- **超[[流形]]与分次几何**：外代数是 $\mathbb{Z}_2$-分次交换代数的原型，在超对称物理中有重要应用。
- **Clifford 代数**：外积在 Clifford 代数中与内积结合为 Clifford 积，是 Dirac 算子的代数基础。
- **Kähler [[流形]]**：在复[[流形]]上，$(p,q)$-型[[微分形式]]之间的外积与复结构相容，导出 Dolbeault 上同调理论。

---

# 常见的误解

- **"外积就是叉积的推广"**：在 $\mathbb{R}^3$ 中两个 1-形式的楔积确实与叉积有密切关系，但外积是更一般的概念，适用于任意次数的形式和任意维数的[[流形]]，而叉积仅存在于 $\mathbb{R}^3$。
- **"外积可交换"**：初学者容易忘记反交换律。外积是**分次交换**的，即交换两个形式会带来 $(-1)^{(\deg\alpha)(\deg\beta)}$ 的符号因子。只有当中至少有一个是偶次形式时，交换才不会产生负号。
- **"外积的定义是唯一的"**：事实上存在行列式约定和 Alt 约定两种定义方式，相差一个组合数因子，但它们给出相同的代数结构。

---

# 启发

- 外积的构造是"先[[张量积]]，再反对称化"这一通用模式的典型代表。这种"先做大再投影"的思路在数学中反复出现（如对称化、齐次化等）。
- 反交换律 $du\land dv = -dv\land du$ 天然地捕获了"有向面积"的定向性质——这比在向量分析中通过"右手定则"规定叉积方向更加内蕴和代数化。
- 外积使[[微分形式]]的运算完全代数化，将多变量微积分中复杂的坐标变换归结为简洁的代数规则。

---

# 总结

## 思想

**"用代数的方式捕获有向体积"**——外积通过反称化将行列式结构嵌入[[微分形式]]的乘法中，使得积分理论中的定向和坐标变换自动得到处理。

## 方法

| 方法 | 用途 | 在笔记中的位置 |
|------|------|----------------|
| 反对称化 | 从[[张量积]]构造外积 | 形式 - 定义 |
| 局部坐标展开 | 外积的具体计算 | 形式 - 局部坐标表示 |
| Leibniz 法则 | 外积与外微分的配合 | 证明 - 外微分与外积 |
| 拉回保持外积 | 在映射下传递结构 | 证明 - 拉回与外积 |

---

# 回看并提问

- 为什么外积定义中的常数因子 $\frac{(r+s)!}{r!s!}$ 是必要的？去掉它会怎样？
- 外积和行列式之间的深刻联系还能推广到什么场景？
- 在 [[de Rham 上同调]]中，外积诱导的环结构与[[拓扑空间]]的上积（cup product）之间是什么关系？
- 如果[[流形]] $M$ 是定向的，体积形式与最高次外积有何关系？

---

# 参考文献

1. 梅加强. *[[流形]]与几何初步*. (知识库 doc_id: pdf_2)
2. 陈维桓. *微分几何引论*. (知识库 doc_id: pdf_4)
3. 陈维桓. *微分几何*. (知识库 doc_id: pdf_10)
4. Kobayashi S. *Differential Geometry of Curves and Surfaces*. (知识库 doc_id: pdf_5)
5. Dubrovin B. A., Fomenko A. T., Novikov S. P. *Modern Geometry — Methods and Applications, Part I: The Geometry of Surfaces, Transformation Groups, and Fields*. GTM 93, Springer. (知识库 doc_id: pdf_3)
6. Lee J. M. *Introduction to Riemannian Manifolds*. 2nd ed. (知识库 doc_id: pdf_6)
7. 姜伯驹. *同调论*. (知识库 doc_id: pdf_12)
8. Guillemin V., Pollack A. *Differential Topology*. AMS, 2014. (知识库 doc_id: pdf_11)