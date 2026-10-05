# 广义 Stokes 定理

#微分几何 #拓扑 #分析 #定理 #流形上的积分 #外[[微分形式]]

广义 Stokes 定理是[[流形]]上微积分的基本定理，它将外微分算子对[[微分形式的积分]]与在边界上的积分联系起来，统一了经典向量分析中的 Green 公式、Gauss-Ostrogradskii 散度公式和经典 Stokes 公式。该定理揭示了分析运算（外微分与积分）与几何拓扑运算（取边界）之间的深刻对偶关系，是连接微分几何、代数拓扑和数学物理的核心桥梁。

---

# 前置知识

## 必备知识

- **[[微分流形]]**：掌握[[光滑流形]]的定义、切空间、光滑映射等基本概念。
- **[[微分形式]]**：理解外代数、楔积、[[微分形式的拉回]]以及外微分算子 $d$ 的定义与性质（特别是 $d^2 = 0$）。
- **[[流形]]上的积分**：了解可定向[[流形]]、[[单位分解]]、具有紧支撑的[[微分形式]]在[[流形]]上的积分定义。
- **带边[[流形]]**：了解上半空间 $\mathbb{H}_+^n = \{x \in \mathbb{R}^n \mid x^n \geqslant 0\}$ 以及带边[[流形]]的定义，边界点与内点的区分。

## 辅助知识

- **向量分析**：熟悉 $\mathbb{R}^3$ 中的梯度、散度、旋度运算，以及经典的 Green 公式、散度定理和 Stokes 定理。
- **点集拓扑**：[[紧致性]]、连通性等基本拓扑概念。

## 拓展知识

- **[[de Rham 上同调]]**：利用 $d^2 = 0$ 定义[[闭形式与恰当形式]]，商空间 $H_{dR}^p(M) = Z^p(M)/B^p(M)$ 称为 [[de Rham 上同调]]群。Stokes 定理为建立 [[de Rham 上同调]]与奇异上同调之间的同构（de Rham 定理）提供了关键工具。
- **同调论**：外微分算子 $d$ 与边缘算子 $\partial$ 在积分意义下互相对偶，这一对偶性是上同调理论的核心思想之一。

---

# 动机

## 引入动机

### 学科内部线索

在经典向量分析中，$\mathbb{R}^3$ 中有三个看似独立却本质统一的积分公式：

1. **Green 公式**（平面区域）：$\iint_D \left(\frac{\partial Q}{\partial x} - \frac{\partial P}{\partial y}\right) dxdy = \oint_{\partial D} Pdx + Qdy$
2. **Gauss-Ostrogradskii 散度公式**（空间区域）：$\iiint_V \operatorname{div}\mathbf{F}\, dV = \iint_{\partial V} \langle \mathbf{F}, \mathbf{n}\rangle \, dA$
3. **经典 Stokes 公式**（曲面）：$\iint_S \langle \nabla \times \mathbf{F}, \mathbf{n}\rangle \, dA = \oint_{\partial S} \mathbf{F}\cdot d\mathbf{s}$

它们都形如"区域上的某种积分等于其边界上的另一种积分"。[[微分形式]]的语言揭示了这一共同结构：这些公式实际上是同一个定理在不同维数下的具体表现。广义 Stokes 定理正是这一统一表述的最终形式。

### 外部应用线索

在电动力学、流体力学和连续介质力学中，积分形式的守恒律（如 Maxwell 方程组、Navier-Stokes 方程）都依赖于将体积分与面积分相互转化的公式。广义 Stokes 定理为这些转化提供了严格的数学框架。

### 审美/结构线索

从范畴论的角度看，Stokes 定理断言外微分算子 $d$ 与边缘算子 $\partial$ 在积分这个双线性配对下互为"伴随"。这一发现引导了 [[de Rham 上同调]]理论的建立，并最终通向 de Rham 定理——[[光滑流形]]的 [[de Rham 上同调]]与实系数奇异上同调同构。

## 构造动机

从 $\mathbb{R}^1$ 上的 Newton-Leibniz 公式出发：
$$\int_a^b f'(x)dx = f(b) - f(a)$$

将区间 $[a,b]$ 视为一维带边[[流形]]，其边界为两点 $\{a,b\}$（赋予适当定向），微分 $0$-形式 $f$ 的外微分 $df = f'(x)dx$。则公式变为 $\int_{[a,b]} df = \int_{\partial[a,b]} f$。

推广到高维：将 $k$ 维带边[[流形]]上的 $(k-1)$-形式 $\omega$ 的外微分 $d\omega$ 在整体上的积分，等于 $\omega$ 本身在边界上的积分。这正是广义 Stokes 定理的内容。

---

# 形式

## 规范的通用形式

广义 Stokes 定理有若干等价表述，以下是最常用的两个版本：

**版本一（紧致带边[[流形]]）**：设 $M$ 为 $n$ 维可定向带边[[光滑流形]]，$\omega$ 为 $M$ 上具有紧支撑的 $C^\infty$ 光滑 $(n-1)$-[[微分形式]]，则
$$\int_M d\omega = \int_{\partial M} \omega$$
其中 $\partial M$ 赋予由 $M$ 诱导的边界定向（Stokes 定向），右端理解为 $\omega$ 在含入映射 $i: \partial M \hookrightarrow M$ 下的拉回 $i^*\omega$ 在 $\partial M$ 上的积分。

**版本二（链形式）**：设 $\sigma$ 为[[光滑流形]] $M$ 上的光滑奇异 $(q+1)$-链，$\omega \in \Omega^q(M)$，则
$$\int_{\partial \sigma} \omega = \int_{\sigma} d\omega$$

**版本三（欧氏空间中带光滑边界的紧集）**：设 $B \subset \mathbb{R}^k$ 为具光滑边界的紧集，$\omega$ 为定义在 $B$ 的邻域上的可微 $(k-1)$-形式，则
$$\int_B d\omega = \int_{\partial B} \omega$$

三个版本中，版本一最常在[[微分流形]]教材中使用；版本二将 Stokes 定理置于链与上链的对偶框架中，便于与代数拓扑衔接；版本三则最贴近经典向量分析的表述方式。

## 必要条件分析

### 条件1：可定向性

如果[[流形]] $M$ 不可定向，则整体积分无法良好定义（积分值依赖于坐标卡的选择，符号不定）。例如 $\mathbb{RP}^2$（实射影平面）是不可定向的二维[[流形]]，在其上无法对所有 $2$-形式定义一致符号的积分，因此 Stokes 定理不成立。

### 条件2：边界 $\partial M$ 赋予诱导定向

边界定向的选取直接影响等式的符号。边界 $\partial M$ 的诱导定向由以下方式确定：若 $x^1,\dots,x^n$ 为 $M$ 在边界点附近的定向坐标且 $x^n \geqslant 0$ 为内方向，则 $(-1)^{n-1}dx^1 \wedge \cdots \wedge dx^{n-1}$ 给出 $\partial M$ 上的诱导定向。若取相反定向，等式右端将反号。

### 条件3：$\omega$ 具有紧支撑

若 $\omega$ 的支集非紧，则两侧积分可能发散（不收敛）。对于紧致[[流形]] $M$，所有光滑形式自然具有紧支撑，故条件自动满足。

### 条件4：$\omega$ 为 $C^\infty$（或至少 $C^1$）光滑

若 $\omega$ 不够光滑，外微分 $d\omega$ 可能不存在或非可积。例如在 $\mathbb{R}^1$ 上取 $\omega$ 为绝对连续但非 $C^1$ 的函数，则 $d\omega$ 可能不是通常意义下的[[微分形式]]。

## 等价表达

- **闭形式的积分**：若 $M$ 为紧致无边可定向[[流形]]，则对任意恰当 $n$-形式 $\omega = d\eta$，有 $\int_M \omega = 0$。等价地，对任意闭 $k$-形式 $\omega$ 和任意 $k$ 维无边[[流形]] $M$，$\int_M \omega$ 仅依赖于 $\omega$ 的上同调类。
- **映射度公式**：设 $f: X \to Y$ 为紧致无边定向[[流形]]之间的光滑映射，则对任意闭 $k$-形式 $\omega$（$k = \dim X = \dim Y$），有 $\int_X f^*\omega = (\deg f)\int_Y \omega$。
- **对偶表述**：记 $\langle \omega, c \rangle = \int_c \omega$，则 Stokes 定理可写为 $\langle d\omega, c \rangle = \langle \omega, \partial c \rangle$，即 $d$ 与 $\partial$ 互为对偶算子。

## 形式的类别

广义 Stokes 定理本身是一个**定理**，但它在不同的上下文中有不同的名称和表现形式：
- 当 $n=1$ 时称为 **Newton-Leibniz 公式**（微积分基本定理）
- 当 $n=2$ 时称为 **Green 公式**
- 当 $n=3$ 且积分区域为三维体时称为 **Gauss-Ostrogradskii 散度定理**
- 当 $n=3$ 且积分区域为二维曲面时称为 **经典 Stokes 定理**
- 在代数拓扑中称为 **Stokes 公式**或广义 Stokes 定理

所有这些都可以看作广义 Stokes 定理在不同维数和 $n$ 维欧氏空间中的特例。

## 在自然语言中，相关命题如何表达？

"一个区域上的外微分的积分等于其边界上的原形式的积分。"

或者说："边界上的积分等于内部的外微分积分。"

更形象地："整体等于其边界的累积。"

## 降维表述

在最底层的数学语言中，Stokes 定理可以看作对坐标的反复应用 Fubini 定理和微积分基本定理的结果。对于 $\mathbb{R}^k$ 中的矩形区域，通过将 $(k-1)$-形式写为
$$\nu = \sum_{i=1}^k (-1)^{i-1} f_i \, dx^1 \wedge \cdots \wedge \widehat{dx^i} \wedge \cdots \wedge dx^k$$
计算 $d\nu = \sum_i \frac{\partial f_i}{\partial x^i} dx^1 \wedge \cdots \wedge dx^k$，再利用 Fubini 定理逐次积分，每个方向上的积分归结为 Newton-Leibniz 公式。

从范畴论对偶的视角看，Stokes 定理断言 $(d, \partial)$ 构成一对伴随算子，类似于线性代数中线性映射与其转置的关系。

## 升维视角

广义 Stokes 定理本身是 **Newton-Leibniz 公式** 在任意维数、任意[[光滑流形]]上的推广。换句话说，微积分基本定理是 Stokes 定理在 $1$ 维[[流形]]上的特例。

在更高的视角下，Stokes 定理是 **Atiyah-Singer 指标定理**（将解析指标与拓扑指标联系起来的深刻定理）的雏形和特例之一。它也是 **Hodge 理论** 中不可或缺的工具——利用 Stokes 定理可以证明[[调和形式]]空间与 [[de Rham 上同调]]群的同构。

## 相似对象的联动理解

与 **散度定理**（Gauss 公式）对比：散度定理是广义 Stokes 定理在 $n=3$、被积函数为 $2$-形式时的特例。将 $2$-形式 $\omega = F^1 dy\wedge dz + F^2 dz\wedge dx + F^3 dx\wedge dy$ 代入广义 Stokes 定理即得 $\iiint_V \operatorname{div} \mathbf{F}\, dV = \iint_{\partial V} \langle \mathbf{F}, \mathbf{n}\rangle\, dA$。

与 **残数定理**（复分析）对比：在复平面上，利用 Green 公式可以从一般 Stokes 公式推导出 Cauchy 积分公式和残数定理，显示了解析函数理论与[[流形]]上微积分的深刻联系。

---

# 证明

## 概括证明

利用[[单位分解]]将问题局部化：由于等式两侧关于 $\omega$ 都是线性的，可以假设 $\omega$ 的支集包含在某个局部坐标邻域 $U$ 中。通过局部坐标将积分化为 $\mathbb{R}^k$ 或上半空间 $\mathbb{H}_+^k$ 上的积分，然后直接利用 Fubini 定理和微积分基本定理计算并比较两端。

### 详细证明（梅加强版本）

设 $M$ 为 $n$ 维可定向带边[[流形]]，$\omega$ 为 $M$ 上具有紧支集的 $(n-1)$-次[[微分形式]]。通过[[单位分解]]，不妨设 $\omega$ 含于某个坐标邻域 $U$ 中，其上有坐标函数 $(x^1,\dots,x^n)$ 且 $x^n \geqslant 0$（对应边界点）或 $x^n$ 无限制（对应内点）。在 $U$ 中 $\omega$ 可表示为
$$\omega = \sum_{i=1}^n (-1)^{i-1} f_i \, dx^1 \wedge \cdots \wedge \widehat{dx^i} \wedge \cdots \wedge dx^n$$

则
$$d\omega = \sum_{i=1}^n \frac{\partial f_i}{\partial x^i} \, dx^1 \wedge \cdots \wedge dx^n$$

分两种情形：

**(1) $U \cap \partial M = \varnothing$（$\omega$ 的支集不触及边界）**

此时 $\int_{\partial M} \omega = 0$。另一方面，
$$\int_M d\omega = \int_U d\omega = \sum_{i=1}^n \int_{\mathbb{R}^n} \frac{\partial f_i}{\partial x^i} \, dx^1\cdots dx^n$$

对第 $i$ 项先对 $x^i$ 积分：
$$\int_{-\infty}^{+\infty} \frac{\partial f_i}{\partial x^i} dx^i = \lim_{R\to\infty} [f_i(\dots,R,\dots) - f_i(\dots,-R,\dots)] = 0$$
（因为 $f_i$ 具有紧支撑），故 $\int_M d\omega = 0$。两边均为 $0$，等式成立。

**(2) $U \cap \partial M \neq \varnothing$**

此时 $U$ 对应 $\mathbb{H}_+^n$ 中的开集。设 $\omega$ 的局部坐标表示为
$$\omega = (-1)^{n-1} f_n \, dx^1 \wedge \cdots \wedge dx^{n-1} \quad (\text{仅含 } dx^{n-1} \text{ 项})$$
（更一般的情况可由线性性化归为此形式）。则
$$d\omega = \frac{\partial f_n}{\partial x^n} dx^1 \wedge \cdots \wedge dx^n$$

于是
$$\int_M d\omega = \int_{\mathbb{H}_+^n} \frac{\partial f_n}{\partial x^n} dx^1\cdots dx^n = \int_{\mathbb{R}^{n-1}} \left(\int_0^{+\infty} \frac{\partial f_n}{\partial x^n} dx^n\right) dx^1\cdots dx^{n-1}$$

由微积分基本定理和紧支撑性质，
$$\int_0^{+\infty} \frac{\partial f_n}{\partial x^n} dx^n = -f_n(x^1,\dots,x^{n-1},0)$$

而 $\omega$ 在边界上的拉回为
$$i^*\omega = f_n(x^1,\dots,x^{n-1},0) dx^1 \wedge \cdots \wedge dx^{n-1}$$
（取适当诱导定向后符号对应）。因此
$$\int_M d\omega = -\int_{\mathbb{R}^{n-1}} f_n(x^1,\dots,x^{n-1},0) dx^1\cdots dx^{n-1} = \int_{\partial M} \omega$$

综合两种情形，广义 Stokes 定理成立。

### 另一种证明思路（Guillemin & Pollack 版本）

利用局部参数化 $h: U \to X$（$U \subset \mathbb{R}^k$ 或 $\mathbb{H}^k$）将积分拉回到欧氏空间。设 $\nu = h^*\omega$ 为 $U$ 上的 $(k-1)$-形式，则
$$\int_X d\omega = \int_U h^*(d\omega) = \int_U d(h^*\omega) = \int_U d\nu$$
$$\int_{\partial X} \omega = \int_{\partial U} h^*\omega = \int_{\partial U} \nu$$

问题化归为 $\mathbb{R}^k$（或 $\mathbb{H}^k$）中的标准情形，然后对 $\nu$ 展开并利用 Fubini 定理逐次积分，每次应用微积分基本定理。当 $U \subset \mathbb{R}^k$（即参数化区域不触及边界）时，$\int_{\partial U} \nu = 0$ 且 $\int_U d\nu = 0$；当 $U \subset \mathbb{H}^k$ 且触及边界时，通过直接计算验证 $\int_U d\nu = \int_{\partial U} \nu$。

---

# 应用

## 直接应用

**例1：散度定理**。设 $M$ 为 $\mathbb{R}^3$ 中具有光滑边界的定向带边[[流形]]，$\mathbf{F}$ 为[[光滑向量场]]。取 $2$-形式
$$\omega = F^1 dy\wedge dz + F^2 dz\wedge dx + F^3 dx\wedge dy$$
则 $d\omega = (\operatorname{div} \mathbf{F}) dx\wedge dy\wedge dz$，代入广义 Stokes 定理即得
$$\iiint_M \operatorname{div} \mathbf{F}\, dV = \iint_{\partial M} \langle \mathbf{F}, \mathbf{n}\rangle \, dA$$

**例2：经典 Stokes 定理**。设 $S$ 为 $\mathbb{R}^3$ 中定向曲面，$\mathbf{F}$ 为[[光滑向量场]]。取 $1$-形式
$$\omega = F^1 dx + F^2 dy + F^3 dz$$
则 $d\omega = (\nabla\times\mathbf{F})_1 dy\wedge dz + (\nabla\times\mathbf{F})_2 dz\wedge dx + (\nabla\times\mathbf{F})_3 dx\wedge dy$，代入得
$$\iint_S \langle \nabla\times\mathbf{F}, \mathbf{n}\rangle\, dA = \oint_{\partial S} \mathbf{F} \cdot d\mathbf{s}$$

**例3：Green 公式**。取 $\mathbb{R}^2$ 中有界区域 $D$，对 $1$-形式 $\omega = Pdx + Qdy$ 应用 Stokes 定理：
$$\iint_D \left(\frac{\partial Q}{\partial x} - \frac{\partial P}{\partial y}\right) dxdy = \oint_{\partial D} Pdx + Qdy$$

**例4：微积分基本定理**。取 $1$ 维带边[[流形]] $M = [a,b]$（定向由 $x$ 增加方向给出），$0$-形式 $\omega = f$（光滑函数），则 $d\omega = f'(x)dx$，Stokes 定理给出
$$\int_a^b f'(x)dx = f(b) - f(a)$$

**例5：闭[[流形]]上恰当形式的积分为零**。若 $M$ 为紧致无边可定向[[流形]]，$\omega = d\eta$，则 $\int_M \omega = \int_{\partial M} \eta = 0$，因为 $\partial M = \varnothing$。此结论是 [[de Rham 上同调]]理论的基本工具。

## 间接应用

### 数学中的应用

- **映射度（Brouwer 度）**：广义 Stokes 定理是证明映射度公式 $\int_X f^*\omega = (\deg f)\int_Y \omega$ 的核心工具，由此可推导 **[[Gauss-Bonnet 定理]]**（曲面的总曲率等于 $2\pi$ 乘以 Euler 示性数）以及 **Brouwer 不动点定理** 和 **代数基本定理**。
- **[[de Rham 上同调]]**：利用 Stokes 定理可以证明积分在闭形式的上同调类上定义良好，进而建立 [[de Rham 上同调]]与奇异上同调之间的同构（de Rham 定理）。
- **Hodge 理论**：在紧致黎曼[[流形]]上，Stokes 定理用于证明 Laplace 算子的自伴性和[[调和形式]]空间与 [[de Rham 上同调]]群的同构（Hodge 定理）。
- **Lefschetz 对偶**：在带边[[流形]]的同调论中，Stokes 公式所揭示的 $d$ 与 $\partial$ 的对偶关系是 Lefschetz 对偶定理的基础。

### 物理中的应用

- **电磁学**：Maxwell 方程的积分形式（如 Faraday 定律 $\oint_{\partial S} \mathbf{E}\cdot d\mathbf{l} = -\frac{d}{dt}\iint_S \mathbf{B}\cdot d\mathbf{A}$）本质上是 Stokes 定理在物理中的直接应用。
- **流体力学**：散度定理将体积分与面积分联系起来，是质量守恒与动量守恒定律的积分形式的数学基础。
- **热传导**：热流通过边界等于内部热源产生（或吸收）的热量，这一物理守恒律的数学表达正是散度定理。

---

# 推广

- **[[流形]]的推广**：Stokes 定理可以推广到 **带角的[[流形]]**（manifold with corners），此时边界由不同维数的面拼成，证明思路与标准情形类似。
- **形式的推广**：可以推广到 **电流（currents）**——de Rham 将[[微分形式]]和链统一为电流的概念，Stokes 定理在其中仍然成立。
- **非光滑情况**：对于 Lipschitz 边界或分片光滑边界的区域，Stokes 定理在适当的 Sobolev 空间框架下仍然成立，这是偏微分方程理论中的重要推广。
- **从实系数到复系数**：推广到 **复[[流形]]** 上的 Dolbeault 上同调，对应的有 Dolbeault 引理和推广的 Stokes 型公式。
- **非交换推广**：在非交换几何中，Stokes 定理的形式由非交换积分和循环（co)同调中的某个算子给出。

### 公开问题

Stokes 定理本身是一个成熟的经典结果，但其在各种广义空间（如分形、度量测度空间、Wiener 空间等）上的推广形式仍是活跃的研究方向。例如，在 **路径空间** 上的无限维 Stokes 定理涉及随机分析和 Malliavin 微积分。

---

# 常见的误解

**误解1：Stokes 定理只是曲面积分公式。**
真相：经典 Stokes 定理（$\mathbb{R}^3$ 中的曲面）只是特例。广义 Stokes 定理在任意维数的[[流形]]上成立，将 Green 公式、散度定理、经典 Stokes 定理甚至微积分基本定理统一为同一个公式。

**误解2：边界定向是无关紧要的。**
真相：边界定向至关重要。若边界取相反定向，等式右端将多一个负号。诱导定向的定义（使用外法向量或通过坐标限制）必须仔细处理。例如在一维情况 $\int_a^b f'(x)dx = f(b) - f(a)$ 中，右端的符号顺序依赖于区间 $[a,b]$ 的正定向（从 $a$ 到 $b$）。

**误解3：$\int_M d\omega = \int_{\partial M} \omega$ 中的积分是相同的积分概念。**
真相：左端是 $n$-形式在 $n$ 维[[流形]]上的积分，右端是 $(n-1)$-形式在 $n-1$ 维[[流形]]上的积分，两者定义不同（积分区域的维数不同）。等式的奇迹之处在于它们通过外微分 $d$ 和边界算子 $\partial$ 建立了相等关系。

**误解4：只要 $M$ 是[[光滑流形]]，Stokes 定理就对任意 $\omega$ 成立。**
真相：$\omega$ 必须有紧支撑，或者 $M$ 本身是紧致的（此时 $\omega$ 自动具紧支撑）。否则两侧的积分可能发散或没有定义。

**误解5：$d^2 = 0$ 和 $\partial^2 = 0$ 是独立的事实。**
真相：这两个事实通过对偶性密切相关。Stokes 定理表明 $d$ 与 $\partial$ 在积分下对偶，从而 $d^2 = 0$ 和 $\partial^2 = 0$ 是对偶的结论：$\langle d^2\omega, c \rangle = \langle \omega, \partial^2 c \rangle$。

---

# 启发

- **统一的力量**：在数学中，一个简洁的表述能统一看似无关的众多经典结果，这是数学理论发展的重要动力。广义 Stokes 定理正是一个绝佳的例子——它将微积分中几个独立的公式统一为一个高度简洁的等式。
- **对偶性思维**：任何"结构"都有其对偶结构。在广义 Stokes 定理中，$d$（分析算子）与 $\partial$（几何算子）的配对关系提醒我们，寻找数学对象之间天然的对偶关系往往能带来深刻的洞察。
- **从局部到整体**：广义 Stokes 定理的证明（通过[[单位分解]]化归为局部计算）体现了微分几何中一个核心的思维方式——利用局部工具研究整体性质。

---

# 总结

## 思想

**"一个区域上的外微分的积分等于其边界上的原形式的积分。"** 或者说：**"微分算子 $d$ 与边界算子 $\partial$ 在积分下是对偶的。"**

更深一层：广义 Stokes 定理揭示了分析（积分、微分）与几何拓扑（边界、[[流形]]）之间的内在统一性，是数学统一性的典范。

## 方法

| 方法 | 在笔记中的使用位置 |
|------|-------------------|
| **[[单位分解]]** | 将整体积分问题分解为局部坐标邻域上的积分 |
| **局部坐标化** | 将[[流形]]上的积分转化为欧氏空间中的 Riemann 积分 |
| **Fubini 定理 + 微积分基本定理** | 核心计算工具，将 $k$ 重积分化为逐次单积分 |
| **线性性 + 紧支撑** | 通过线性分解减少待处理的情形，用紧支撑保证边界项消失 |

---

# 回看并提问

- 为什么广义 Stokes 定理要求[[流形]]是可定向的？如果[[流形]]不可定向，问题出在哪里？
- 能否从广义 Stokes 定理推导出同伦不变性（即同伦的映射诱导相同的拉回积分）？
- 在 $n=0$ 的情况下，广义 Stokes 定理应该如何理解？（提示：$0$ 维[[流形]]的边界是什么？）
- $d^2 = 0$ 和 $\partial^2 = 0$ 能否通过 Stokes 定理互相推导？
- 如果 $M$ 是无穷维[[流形]]，Stokes 定理还有意义吗？（提示：Wiener 空间上的积分）

---

## 参考文献

1. Victor W. Guillemin, Alan Pollack. *Differential Topology*. American Mathematical Society, 2011. ISBN 9780821851937.
2. Wolfgang Kühnel. *Differential Geometry: Curves — Surfaces — Manifolds*, Third Edition.
3. Shoshichi Kobayashi. *Differential Geometry of Curves and Surfaces*. Springer, 1995.
4. John M. Lee. *Introduction to Riemannian Manifolds*, Second Edition. Springer. ISBN 978-1-4612-4180-5.
5. B. A. Dubrovin, A. T. Fomenko, S. P. Novikov. *Modern Geometry — Methods and Applications, Part I: The Geometry of Surfaces, Transformation Groups, and Fields*. Springer. ISBN 978-1-4684-9946-9.
6. B. A. Dubrovin, S. P. Novikov, A. T. Fomenko. *Modern Geometry — Methods and Applications, Part II: The Geometry and Topology of Manifolds*. Springer, 1985. ISBN 978-1-4612-1100-6.
7. B. A. Dubrovin, A. T. Fomenko, S. P. Novikov. *Modern Geometry — Methods and Applications, Part III: Introduction to Homology Theory*. Springer. ISBN 978-0-387-97271-8.
8. William Fulton. *Algebraic Topology: A First Course*. Graduate Texts in Mathematics 153, Springer, 1995.
9. 陈维桓. *微分几何引论*. 高等教育出版社, 2013.
10. 梅加强. *[[流形]]与几何初步*. 2012.
11. 姜伯驹. *同调论*. 北京大学出版社, 2006.
12. А. С. 米先柯, А. Т. 福明柯. *微分几何与拓扑学简明教程*.
13. Jean-Pierre Françoise, Gregory L. Naber, 等. *数学物理学百科全书 11：代数拓扑；辛几何与拓扑；常微分和偏微分方程*. 2008.
14. Christian Bär. *Elementary Differential Geometry*. Cambridge University Press, 2010.
15. 伍鸿熙, 陈维桓. *黎曼几何选讲*. 北京大学出版社, 2020.