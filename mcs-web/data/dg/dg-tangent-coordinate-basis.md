---
title: 切空间的坐标基
tags: #微分几何 #切空间 #坐标基 #定义 #定理
created: 2026-09-15
---

切空间的坐标基（也称自然基底）是[[微分流形]]上切向量的坐标表示基础。在 $n$ 维[[光滑流形]]的任一点处，局部坐标系 $(U;u^1,\dots,u^n)$ 自然地导出一组偏导数算子 $\{\partial/\partial u^i|_p\}$，它们构成该点切空间的基底。这一结构的核心在于：它将[[流形]]上"方向"的概念代数化为求导算子，使得切向量可以像欧氏空间中一样用分量计算，而坐标变换下基底与分量的变换规律又揭示了几何对象的内在[[张量]]性质。

---

# 前置知识

## 必备知识

- **[[光滑流形]]的定义**：$n$ 维[[光滑流形]] $M$ 是带有 $C^\infty$ 微分结构的 Hausdorff [[拓扑空间]]，其上存在容许坐标卡 $(U,\varphi)$，$\varphi(U)\subset\mathbb{R}^n$ 是开集，坐标函数记为 $u^i$ ($i=1,\dots,n$)。坐标卡之间的转移映射是光滑的。
- **[[向量空间]]与基底**：$n$ 维[[向量空间]] $V$ 的基底 $\{e_i\}$，任意 $v\in V$ 可唯一表示为 $v=v^i e_i$；对偶空间 $V^*$ 及其对偶基底 $\{e^i\}$，满足 $e^i(e_j)=\delta^i_j$。
- **Jacobi 矩阵**：[[光滑映射的微分]]的矩阵表示，行列式非零时保证坐标变换可逆。

## 辅助知识

- **方向导数**：$\mathbb{R}^n$ 中沿给定方向的方向导数算子 $D_v|_p f = \frac{d}{dt}|_{t=0}f(p+tv)$，是[[流形]]上切向量的原型。
- **曲线速度向量**：$\mathbb{R}^n$ 中曲线 $\gamma(t)$ 在 $p=\gamma(0)$ 处的速度 $\dot\gamma(0)=(\dot x^1(0),\dots,\dot x^n(0))$。
- **Einstein 求和约定**：在同一项中出现的上下重复指标自动求和，简化[[张量]]公式书写。

## 拓展知识

- **[[切丛]]** $TM=\bigcup_{p\in M}T_pM$ 是一个 $2n$ 维[[光滑流形]]，整体化地研究各点切空间。取局部坐标 $(U;u^i)$，则 $X=X^i\partial/\partial u^i|_q$ 对应 $2n$ 元组 $(u^1(q),\dots,u^n(q),X^1,\dots,X^n)$。
- **[[张量]]场**：$(r,s)$ 型[[张量]]场是在各点 $p$ 指定一个 $r$ 阶反变、$s$ 阶协变[[张量]]的光滑对应。坐标基是 $(1,0)$ 型[[张量]]（切向量）场的基础。
- **Lie 括号**：$[\partial/\partial x^i,\partial/\partial x^j]=0$，即坐标向量场是对易的。这一性质反过来也是局部坐标存在的标志（Frobenius 定理）。

---

# 动机

## 引入动机

人类对"方向"和"变化率"的认知从欧氏空间开始。在 $\mathbb{R}^n$ 中，方向导数 $D_v|_p f = \sum v^i(\partial f/\partial x^i)|_p$ 完全由分量 $v^i$ 和偏导数算子 $\partial/\partial x^i|_p$ 决定，其中 $(\partial/\partial x^1|_p,\dots,\partial/\partial x^n|_p)$ 构成自然基底。

然而[[流形]]不是 $\mathbb{R}^n$——它在局部与 $\mathbb{R}^n$ [[同胚]]，但整体可能弯曲。当我们试图在[[流形]]上做微积分时，立刻面临两个问题：

- **学科内部线索**：[[流形]]上每点 $p$ 附近有坐标卡 $(U,\varphi)$，点 $p$ 的坐标是 $n$ 个实数 $(u^1(p),\dots,u^n(p))$。要想定义"沿某方向的变化率"，我们需要一个不依赖具体坐标嵌入的对象。欧氏空间中"方向"对应向量，但在[[流形]]上，"方向"必须内在地定义。

- **外部应用线索**：物理中的广义相对论将时空视为 4 维[[流形]]，质点的运动轨迹是曲线，曲线的速度（切向量）是定义引力、加速度和测地线的基础。没有切空间，就无法在弯曲时空描述"运动"。

- **审美/结构线索**：在几何中我们希望"方向"的概念在坐标变换下有一致的变换规律。如果某对象在坐标变换 $u\to v$ 下分量按 $(\partial v^j/\partial u^i)$ 变换，则称它为**反变向量**；它正是切空间中的元素。这种分类使几何量在坐标变换下保持形式不变。

## 构造动机

切向量的现代形式（作为 $\partial/\partial u^i|_p$ 的线性组合）并非凭空出现。它的"胚子"可以从以下路径追溯：

> **欧氏空间**（起点）→ **曲面上的切平面**（中间站）→ **[[流形]]上的切空间**（现代形式）

**从 $\mathbb{R}^n$ 开始**：在 $\mathbb{R}^n$ 的开子集 $U$ 中，点 $p$ 处的切向量本应理解为"带起点的箭头"：$T_pU\cong\{p\}\times\mathbb{R}^n$，标准基是 $(p,e_1),\dots,(p,e_n)$，向量 $e_i$ 对应曲线 $c_i(t)=p+t\cdot e_i$，也对应偏导数算子 $f\mapsto \partial f/\partial u^i|_p$。

**再到曲面**：对于 $\mathbb{R}^3$ 中的正则参数曲面 $S:\mathbf{r}=\mathbf{r}(u,v)$，点 $p=\mathbf{r}(u_0,v_0)$ 处的切平面由 $\mathbf{r}_u(u_0,v_0)$ 和 $\mathbf{r}_v(u_0,v_0)$ 张成。任意切向量可写成 $\xi=\mathbf{r}_u\Delta u+\mathbf{r}_v\Delta v$，$(\Delta u,\Delta v)$ 是分量。此时基底 $\{\mathbf{r}_u,\mathbf{r}_v\}$ 是自然基底 $\{\partial/\partial u,\partial/\partial v\}$ 在 $\mathbb{R}^3$ 中的具体表现——前者是后者的"坐标实现"。

**最终到一般[[流形]]**：在抽象[[流形]] $M$ 上，没有 $\mathbb{R}^3$ 可以嵌入。但局部坐标 $(U;u^i)$ 仍然给出了 $n$ 个"方向算子" $\partial/\partial u^i|_p$，它们在代数上满足线性无关和生成性，恰是切空间最自然的基底。这就把欧氏空间和曲面上"方向"的概念，代数化地移植到了任意[[光滑流形]]上。

---

# 形式

## 规范的通用形式

设 $(U,\varphi)$ 是 $n$ 维[[光滑流形]] $M$ 在点 $p$ 处的容许坐标卡，$(U;u^i)$ 是局部坐标系。定义算子：

$$\left.\frac{\partial}{\partial u^i}\right|_p f = \left.\frac{\partial}{\partial u^i}\right|_{\varphi(p)} (f\circ\varphi^{-1}),\quad \forall f\in C^\infty(M),\; i=1,\dots,n.$$

这是[[流形]]上**坐标基（自然基底）**的通用形式。在微分几何的不同分支中，它有不同的具体表达：

| 背景 | 局部坐标 | 自然基底 |
|------|----------|----------|
| 一般[[流形]] $M$ | $(U;u^1,\dots,u^n)$ | $\{\partial/\partial u^1|_p,\dots,\partial/\partial u^n|_p\}$ |
| 曲面 $S\subset\mathbb{R}^3$ | $(u,v)$ | $\{\mathbf{r}_u,\mathbf{r}_v\}$（或 $\{r_u,r_v\}$） |
| $\mathbb{R}^n$ 开区域 | $(x^1,\dots,x^n)$ | $\{\partial/\partial x^1|_p,\dots,\partial/\partial x^n|_p\}$ |

一般[[流形]]上的 $\partial/\partial u^i|_p$ 是抽象算子，而曲面上的 $\mathbf{r}_u$ 是它在 $\mathbb{R}^3$ 中的实现。两种形式表达相同的代数结构。

## 必要条件分析

笔记的核心对象是**自然基底 $\{\partial/\partial u^i|_p\}$ 构成切空间 $T_pM$ 的基底**（定理 3.1.1）。这一结论依赖于若干条件：

**条件 1：$M$ 是[[光滑流形]]（$C^\infty$ 结构）**
- 删除此条件：如果[[流形]]只是 $C^k$（$k<\infty$），引理中函数 $f$ 的展开 $f=f(p)+\sum(u^i-u_0^i)g_i$ 仍然成立，但 $g_i$ 的光滑性可能丢失，推导仍然可行。若连微分结构都没有，则无法定义 $\partial/\partial u^i|_p$，整个切空间概念崩塌。
- 反例：[[拓扑流形]]（无微分结构）上不存在切空间的自然定义。

**条件 2：$(U,\varphi)$ 是容许坐标卡，$p\in U$**
- 删除此条件：若 $p$ 不在该坐标卡定义域内，则坐标函数 $u^i$ 在 $p$ 处无定义，无法构造算子 $\partial/\partial u^i|_p$。
- 反例：$S^2$ 上的球极投影坐标卡无法覆盖南极，用该坐标卡不能表示南极点的切空间基底。

**条件 3：切向量的莱布尼茨律**
- 删除此条件：如果映射 $X_p:C^\infty(M)\to\mathbb{R}$ 只满足线性而不满足莱布尼茨律，则它只是一个线性泛函，不一定能用 $\partial/\partial u^i|_p$ 线性表示。例如 $X_p(f)=f(p)$ 满足线性但不满足莱布尼茨律，它不是切向量。

**条件 4：$n$ 维（有限维）**
- 删除此条件：若[[流形]]是无限维的（如某些函数空间），切空间也是无限维的，上述有限线性组合的基底理论需替换为泛函分析框架。

## 等价表达

切空间 $T_pM$ 及其自然基底有以下相互等价的描述方式：

1. **代数定义（导子）**：$T_pM$ 是所有满足莱布尼茨律的线性映射 $X_p:C^\infty(M)\to\mathbb{R}$ 的集合，基底 $\{\partial/\partial u^i|_p\}$。

2. **几何定义（曲线等价类）**：$T_pM$ 是所有经过 $p$ 的光滑曲线 $\sigma(t)$（$\sigma(0)=p$）在等价关系 $\sigma_1\sim\sigma_2\iff\frac{d}{dt}|_{t=0}(x^i\circ\sigma_1-x^i\circ\sigma_2)=0$ 下的商集。$\sigma'(0)$ 的坐标基展开为 $\sigma'(0)=\sum \frac{d}{dt}|_{t=0}(x^i\circ\sigma(t))\cdot\partial/\partial x^i|_p$。

3. **"坐标分量"定义**：$T_pM$ 是所有满足坐标变换规则 $(b^1,\dots,b^n)^T=J(\psi\circ\varphi^{-1})(\varphi(p))(a^1,\dots,a^n)^T$ 的有序 $n$ 元组 $(a^1,\dots,a^n)$ 的集合。此定义直接以分量在坐标变换下的行为界定切向量。

这三种定义是等价的。第一种强调代数运算，第二种强调几何直观，第三种强调坐标计算。它们的等价性源于：任给切向量 $X_p$，其分量 $X_p^i=X_p(u^i)$ 在坐标变换 $u\to v$ 下按 $(\partial v^j/\partial u^i)$ 变换；反之，任给一组按此规则变换的分量，对应唯一切向量。

## 形式的类别

"坐标基"的概念在几何的不同层次上有以下类别：

- **自然基底（holonomic basis）**：来自局部坐标的偏导算子 $\partial/\partial u^i|_p$，对易子为零 $[\partial/\partial u^i,\partial/\partial u^j]=0$。
- **非坐标基（non-holonomic basis）**：一般的光滑切向量场构成的基底，不一定来自坐标，其对易子可能非零。例如球坐标系中的单位正交标架场。
- **活动标架（moving frame）**：在[[流形]]上逐点选取的基底（可非坐标），用于活动标架法计算曲率等几何量。

本文集中讨论第一种——自然基底（坐标基）。

## 在自然语言中，相关命题如何表达？

- "切向量 $v$ 在坐标基下的分量就是 $v$ 作用在坐标函数上的值"：$v^i=v(u^i)$。
- "自然基底随坐标变换按 Jacobi 矩阵转换"：$\partial/\partial u^i|_p = (\partial v^j/\partial u^i)|_p\cdot\partial/\partial v^j|_p$。
- "切向量的分量在坐标变换下与基底反变"：$\tilde{X}^j = X^i\cdot(\partial v^j/\partial u^i)|_p$。

## 降维表述

用更基础的语言重述坐标基：

- **集合论/函数论语言**：$\partial/\partial u^i|_p$ 是函数空间 $C^\infty(M)$ 上的一个线性泛函，它将 $f$ 映射为 $\mathbb{R}^n$ 中复合函数 $f\circ\varphi^{-1}$ 在 $\varphi(p)$ 处的第 $i$ 个偏导数。
- **线性代数语言**：选定局部坐标相当于在 $T_pM$ 中选定了一组有序基 $\{e_i\}$，每个切向量 $v$ 对应一个坐标列向量 $(v^1,\dots,v^n)^T$。坐标变换对应基变换矩阵 $A=(a_j^i)$，其中 $a_j^i=(\partial v^i/\partial u^j)|_p$。
- **范畴论语言**：切空间函子 $T$ 将[[流形]]对象 $M$ 映为[[向量空间]]对象 $T_pM$，将光滑映射 $f:M\to N$ 映为线性映射 $df_p:T_pM\to T_{f(p)}N$（即切映射）。自然基底是局部坐标卡在该函子下的像。

## 升维视角

- **切空间是[[切丛]]的纤维**：[[切丛]] $TM=\bigcup_{p\in M}T_pM$ 本身是一个 $2n$ 维[[光滑流形]]。局部坐标 $(U;u^i)$ 给出 $TM$ 上的坐标 $(u^1,\dots,u^n,X^1,\dots,X^n)$，其中 $X^i$ 是切向量在自然基底下的分量。坐标基 $\partial/\partial u^i|_p$ 正是[[切丛]]局部平凡化中"竖直方向"的参照。
- **[[余切空间]]是对偶的视角**：$T_pM$ 的对偶空间 $T_p^*M$ 有自然对偶基 $\{du^i|_p\}$，满足 $du^i|_p(\partial/\partial u^j|_p)=\delta^i_j$。这引出[[微分形式]]理论，并将梯度等概念统一为余切向量。
- **切映射 $df_p$ 在自然基底下就是 Jacobi 矩阵**：$df_p(\partial/\partial u^i|_p)=\sum(\partial f^\alpha/\partial u^i)|_p\cdot\partial/\partial v^\alpha|_{f(p)}$。

## 如果该主题有与自身相似的对象，要联动理解

- **坐标基 vs. 一般基底**：坐标基是对易的（Lie 括号为零），一般切向量场基底不一定对易。能通过坐标变换变为坐标基的基底恰好是那些彼此对易的（Frobenius 可积性条件）。
- **坐标基 vs. 标架场**：$\mathbb{R}^3$ 中的球坐标自然标架 $\{\partial/\partial r,\partial/\partial\theta,\partial/\partial\phi\}$ 不是单位正交的，它的度量系数需要单独计算；这与笛卡儿坐标下自然基底 $\{\partial/\partial x,\partial/\partial y,\partial/\partial z\}$（单位正交）形成对比。两者的本质相同（都是坐标基），但计算性质（如度量 $g_{ij}$）不同。
- **$\partial/\partial u^i|_p$ vs. $du^i|_p$**：前者是切空间 $T_pM$ 的基底，后者是[[余切空间]] $T_p^*M$ 的对偶基底。两者在坐标变换下分别按反变和协变规律变换。

---

# 证明

## 概括证明

**定理 3.1.1**：在 $n$ 维[[光滑流形]] $M$ 上，取点 $p$ 的局部坐标系 $(U;u^i)$，则 $\{\partial/\partial u^i|_p\}_{i=1}^n$ 构成切空间 $T_pM$ 的基底，从而 $T_pM$ 是 $n$ 维[[向量空间]]。

**概括**：任意切向量作用于光滑函数，可借助函数在局部坐标下的展开式，将作用结果分解为坐标函数上的作用乘以偏导算子，从而证明 $\partial/\partial u^i|_p$ 生成整个切空间；再通过它们作用在坐标函数 $u^j$ 上得到 Kronecker 符号，证明线性无关。

**详细证明**：

**(i) 生成性**：任取 $v\in T_pM$。利用引理（基于 $C^\infty$ 函数的 Taylor 展开形式），任意 $f\in C_p^\infty$ 可表示为

$$f = f(p) + \sum_{i=1}^n (u^i-u_0^i)g_i,\quad g_i(p)=\left.\frac{\partial}{\partial u^i}\right|_p(f).$$

由 $v$ 的莱布尼茨律及 $v(1)=0$（因 $v(1)=v(1\cdot1)=2v(1)$）得 $v(f(p))=0$, $v(u_0^i)=0$，从而

$$v(f)=\sum_{i=1}^n v(u^i)\cdot g_i(p)=\sum_{i=1}^n v(u^i)\cdot\left.\frac{\partial}{\partial u^i}\right|_p(f),\quad\forall f\in C_p^\infty.$$

故 $v=\sum_{i=1}^n v(u^i)\cdot\partial/\partial u^i|_p$，即任意切向量可表为 $\partial/\partial u^i|_p$ 的线性组合。

**(ii) 线性无关性**：设 $\sum_{i=1}^n c_i\cdot\partial/\partial u^i|_p=0$（零映射）。作用在坐标函数 $u^j$ 上：

$$0=\sum_{i=1}^n c_i\cdot\left.\frac{\partial}{\partial u^i}\right|_p(u^j)=\sum_{i=1}^n c_i\delta_i^j=c_j,\quad 1\le j\le n.$$

所有系数 $c_j=0$，故线性无关。

---

# 应用

## 直接应用

**例 1**：设 $\gamma(t)$ 是 $M$ 上的光滑曲线，在局部坐标 $(U;u^i)$ 下参数方程为 $u^i=u^i(t)$，则曲线在 $p=\gamma(0)$ 处的速度向量为

$$\dot\gamma(0)=\sum_{i=1}^n\frac{du^i}{dt}(0)\cdot\left.\frac{\partial}{\partial u^i}\right|_p.$$

这完全类比 $\mathbb{R}^n$ 中的曲线速度公式，分量正是坐标对参数的变化率。

**例 2**：已知切向量 $X\in T_pM$，其分量 $X^i=X(u^i)$。对于光滑函数 $f$，有

$$X(f)=X^i\left.\frac{\partial f}{\partial u^i}\right|_p.$$

这统一了方向导数的概念：$X$ 就是沿"方向 $X$"的导数算子。

**例 3**：曲面 $S:\mathbf{r}=\mathbf{r}(u,v)$ 在 $p$ 处的切空间有自然基底 $\{\mathbf{r}_u,\mathbf{r}_v\}$。切向量 $\xi=\mathbf{r}_u du+\mathbf{r}_v dv$ 的分量 $(du,dv)$ 满足 $du(\xi)=du$, $dv(\xi)=dv$，即 $du$ 和 $dv$ 是对偶基。曲面的第一基本形式 $I=d\mathbf{r}\cdot d\mathbf{r}=Edu^2+2Fdudv+Gdv^2$ 反应了自然基底 $\{\mathbf{r}_u,\mathbf{r}_v\}$ 的度量系数。

**例 4**：在 $\mathbb{R}^n$ 的开子集 $U$ 中，$T_pU\cong\{p\}\times\mathbb{R}^n$，标准基 $(p,e_1),\dots,(p,e_n)$ 正好对应 $\{\partial/\partial x^1|_p,\dots,\partial/\partial x^n|_p\}$。在此意义下，通常的切向量和坐标基就是[[流形]]切空间在 $\mathbb{R}^n$ 中的特例。

## 间接应用

- **在微分几何中**：自然基底是定义[[黎曼度量]] $g=g_{ij}du^i\otimes du^j$、联络 $\nabla_{\partial_i}\partial_j=\Gamma_{ij}^k\partial_k$ 和曲率[[张量]]的基础。没有坐标基，这些[[张量]]就失去了局部分量表达。
- **在广义相对论中**：时空[[流形]]的切向量给出质点的 4-速度，坐标基 $\partial/\partial x^\mu$ 对应坐标轴方向。度规[[张量]] $g_{\mu\nu}$ 在坐标基下的分量决定时空几何。坐标变换（如从 Schwarzschild 坐标到 Eddington–Finkelstein 坐标）通过 Jacobi 矩阵联系两套自然基底。
- **在物理中**：切空间是规范场论中[[协变导数]]的基础；联络系数（Christoffel 符号）在自然基底下的表达式 $\Gamma_{ij}^k$ 直接参与场方程的计算。
- **在计算机图形学中**：曲面自然基底 $\{r_u,r_v\}$ 用于计算法向量 $r_u\times r_v$，进而实现光照渲染。

---

# 推广

- **条件可以放宽**：$C^\infty$ [[流形]]可以放宽为 $C^k$ [[流形]]（$k\ge1$），自然基底的定义和定理在 $C^k$ 框架下仍然成立，只需函数空间的阶数相应调整。
- **结论可以泛化**：从切空间 $T_pM$ 的基底可推广到[[切丛]] $TM$ 的局部标架场。进一步，向量丛的局部截面在局部平凡化下也可有类似"坐标基"的表示（局部基截面）。
- **公开问题/前沿**：在 $\mathbb{R}^4$ 上的反常微分结构（exotic $\mathbb{R}^4$）中，[[光滑结构]]的不同选取是否会影响切空间基底的可积性？这涉及微分拓扑的深层问题。另外，在齐性[[流形]]上，自然基底可借助 Lie 代数结构进行整体化描述（Maurer–Cartan 形式）。

---

# 常见的误解

1. **误解：$\partial/\partial u^i|_p$ 就是 $\mathbb{R}^n$ 中的偏导**  
   实际上，[[流形]]上的 $\partial/\partial u^i|_p$ 定义中包含了坐标卡映射 $\varphi$ 的复合 $f\circ\varphi^{-1}$，并非直接对 $f$ 求偏导。只有在 $M=\mathbb{R}^n$ 且取恒等坐标时，两者才一致。

2. **误解：切向量的坐标分量 $X^i$ 就是"向量的长度"**  
   $X^i$ 是在自然基底下的代数分量，两个切向量的内积不能简单由分量乘积之和给出。只有黎曼度规 $g_{ij}$ 确定后，$X\cdot Y=g_{ij}X^iY^j$ 才有几何意义。在自然基底非正交时，分量与几何长度没有直接对应。

3. **误解：自然基底与坐标系一一对应，与点无关**  
   事实上，$\partial/\partial u^i|_p$ 随点 $p$ 变化。在不同点，即使使用同一坐标卡，$\partial/\partial u^i|_q$ 也定义在不同[[向量空间]] $T_qM$ 中。初学者容易忽略"黏附于 $p$"这一事实。

4. **误解：坐标变换下基底的分量就是"新坐标关于老坐标的偏导"**  
   $\partial/\partial u^i|_p = (\partial v^j/\partial u^i)|_p\cdot\partial/\partial v^j|_p$ 中，$(\partial v^j/\partial u^i)$ 是在点 $p$ 处计算的 Jacobi 矩阵。初学者容易忘记这些偏导是在具体点 $p$ 处取值，从而误以为基底变换有全局统一的系数。

5. **误解：切向量 $\sum X^i\partial_i$ 与向量场 $\sum X^i\partial_i$ 没有区别**  
   切向量是"在单点 $p$ 处的"代数对象，向量场则是"各点指定一个切向量"的光滑截面。前者只在一个切空间中，后者对应[[切丛]] $TM$ 的光滑截面。

---

# 启发

- **"方向"本质上是导子**：从 $\mathbb{R}^n$ 中的箭头到[[流形]]上的偏导算子，坐标基 $\partial/\partial u^i|_p$ 告诉我们：在数学中，一个对象的结构往往由它与其他对象的相互作用（这里是作用于光滑函数的方式）定义，而非由其几何形象定义。

- **坐标变换下的变换规律定义了几何对象类型**：切向量分量的反变性（$(\partial v^j/\partial u^i)$ 变换）和对偶基的协变性（$(\partial u^i/\partial v^j)$ 变换）是一体两面。在微分几何中，"对象是什么"不如"对象在坐标变换下怎么变"重要——这分类出了[[张量]]的不同品种。

- **局部坐标是一把双刃剑**：坐标基极大地方便了计算，但它依赖于坐标系的选取。好的几何理论应当不依赖坐标（坐标无关性），但好的计算又离不开坐标。微分几何的张力正体现在坐标方法和坐标无关方法的平衡之间。

---

# 总结

## 思想

**"用局部坐标把切方向代数化为求导算子，使[[流形]]上的微积分成为可能。"**  
坐标基 $\partial/\partial u^i|_p$ 将[[流形]] $M$ 上每一点的"方向空间"同构于 $\mathbb{R}^n$，从而把欧氏空间中的所有线性代数工具移植到了[[流形]]上——但代价是：依赖坐标选取，且必须跟踪变换规律。

## 方法

| 具体技术 | 在笔记中的使用位置 |
|----------|-------------------|
| 局部坐标系下的函数 Taylor 展开 | 定理 3.1.1 证明中引理 (3.1.1) |
| 偏导数算子作为切向量 | §2 坐标基的定义 |
| Kronecker 符号检验线性无关 | 定理 3.1.1 线性无关性证明 |
| Jacobi 矩阵作为基底变换矩阵 | §4 自然基底变换规律 |
| 反变/协变变换规律 | §4.2 分量变换 & §5 [[余切空间]]对偶基 |
| 对偶基构造 | §5 [[余切空间]]自然基底 $\{du^i\|_p\}$ |
| 切映射（微分）的矩阵表示 | §6 |

---

# 回看并提问

1. 在定理 3.1.1 的证明中，引理 $f=f(p)+\sum(u^i-u_0^i)g_i$ 为什么成立？$g_i(p)$ 为什么恰好是 $\partial f/\partial u^i|_p$？
2. 为什么 $v(1)=0$？如果 $v$ 不满足莱布尼茨律，这个结论是否还成立？
3. 坐标基 $\partial/\partial u^i|_p$ 之间的 Lie 括号是多少？这反映了什么几何意义？
4. 曲面的自然基底 $\{\mathbf{r}_u,\mathbf{r}_v\}$ 和一般[[流形]]的 $\{\partial/\partial u,\partial/\partial v\}$ 之间是什么关系？后者是前者的"抽象版本"吗？
5. 切向量分量在坐标变换下按 $(\partial v^j/\partial u^i)$ 变换，而余切向量分量按 $(\partial u^i/\partial v^j)$ 变换。这两者为什么互逆？请推导验证。
6. 给定两个不同的局部坐标系，它们对应的自然基底之间的转换系数是坐标变换的 Jacobi 矩阵。如果坐标变换是线性的（例如仿射变换），这个 Jacobi 矩阵是常数。那么自然基底之间是否也是"常数"线性组合？

---

## 参考文献

1. 陈维桓. *微分几何引论*. 北京大学出版社, 2013. （第 3 章 §3.1 切空间，定理 3.1.1 自然基底的定义与证明、自然基底变换规律、[[余切空间]]与对偶基.）

2. Wolfgang Kühnel. *Differential Geometry: Curves - Surfaces - Manifolds*, Third Edition. American Mathematical Society. （第 5B 节 The Tangent Space，定理 5.6 切空间由 $\partial/\partial x^i|_p$ 张成，$\mathbb{R}^n$ 中切空间的标准基.）

3. John M. Lee. *Introduction to Riemannian Manifolds*, Second Edition. Springer. （附录 A，坐标向量 $\partial/\partial x^i|_p$ 的定义、切映射 $dF_p$，分量 $v^i=v(x^i)$.）

4. B. A. Dubrovin, S. P. Novikov, A. T. Fomenko. *Modern Geometry — Methods and Applications, Part II: The Geometry and Topology of Manifolds*. Springer-Verlag, 1985. （切空间基底 $e_\alpha=\partial/\partial x^\alpha$，分量变换公式 $\xi_p^\alpha = (\partial x_p^\alpha/\partial x_q^\beta)_x\xi_q^\beta$.）

5. 梅加强. *[[流形]]与几何初步*. （第 1.4 节 切空间和切映射，切向量代数定义（满足莱布尼茨律的线性映射），切空间的曲线等价类定义，对偶基 $dx_\alpha^i(p)$.）

6. Manfredo P. do Carmo. *Differential Geometry of Curves and Surfaces*. （曲面的切平面、自然基底 $\{x_u,x_v\}$ 及其对偶形式 $du,dv$.）

7. 陈维桓. *微分几何*. 北京大学出版社, 2017. （曲面的切空间与自然基底 $\{r_u,r_v\}$，[[余切空间]]基底 $\{du,dv\}$，第一基本形式 $Edu^2+2Fdudv+Gdv^2$.）

8. А. С. 米先柯, А. Т. 福明柯. *微分几何与拓扑学简明教程*. （切向量与切空间的定义，坐标变换的[[张量]]规则.）