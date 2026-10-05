---
tags:
  - #微分几何 #微分形式 #外代数 #定义
created: 2026-09-15
---

# 微分形式

微分形式（Differential form）是现代数学中一种基础而强大的工具，由埃利·嘉当（Élie Cartan）于1900年左右创立。它将向量微积分中的梯度、散度、旋度等概念统一为一种简洁的代数语言，是微分几何、代数拓扑和理论物理中不可或缺的工具。

---

# 前置知识

## 必备知识

- **线性代数**：对偶空间、[[张量]]、反对称多重线性映射
- **微积分**：多元函数微分、重积分、曲线曲面积分
- **[[微分流形]]**：[[光滑流形]]、切空间、[[余切空间]]、光滑映射

## 辅助知识

- **外代数**（Grassmann代数）：反对称[[张量积]]的基本运算
- **向量丛**：[[余切丛]] $T^*M$ 及其外幂 $\bigwedge^p T^*M$

## 拓展知识

- **同调论与上同调论**：de Rham上同调将微分形式与[[流形]]的拓扑结构联系起来
- **李群与李代数**：左不变微分形式与 Maurer-Cartan 形式
- **理论物理**：规范场论中的[[联络形式]]与[[曲率形式]]

---

# 动机

## 引入动机

在经典向量微积分中，我们有三个不同的微分算子：梯度（grad）、旋度（curl）和散度（div），以及三个积分定理：格林定理、斯托克斯定理和高斯定理。这些定理看起来各不相同，但本质上是同一个思想在不同维度下的表现。微分形式的引入正是为了将这三个算子统一为一个——**外微分** $d$，并将这三个积分定理统一为——**斯托克斯定理**：

$$\int_{\partial \Omega} \omega = \int_{\Omega} d\omega.$$

在更高的视角下，微分形式是[[流形]]上**可以进行积分**的自然对象，它不依赖于度量、坐标系或联络，仅依赖于[[流形]]本身的微分结构。

## 构造动机

外微分形式的乘法不是普通的交换乘法，而是**反交换**的。考虑 $(u,v)$ 平面上的微分 $du$ 和 $dv$，它们的乘法满足：

$$du \wedge du = 0, \quad dv \wedge dv = 0, \quad du \wedge dv = -dv \wedge du.$$

这里的 $\wedge$ 称为**外乘法**（exterior multiplication）。这一规则来源于从行列式的性质：交换两个坐标微元会改变符号。

以二元函数为例，对于光滑函数 $f(u,v)$，其全微分为：

$$df = \frac{\partial f}{\partial u} du + \frac{\partial f}{\partial v} dv.$$

而当我们考虑 $d(df)$ 时，由于混合偏导相等以及反交换律，自然得到 $d^2=0$。这一性质——**外微分的幂零性**——是整个理论的基石。

---

# 形式

## 规范的通用形式

### 微分形式的定义

设 $M$ 为 $n$ 维[[光滑流形]]。**$p$ 次微分形式**（简称 $p$-形式）是[[余切丛]] $T^*M$ 的第 $p$ 次外幂 $\bigwedge^p T^*M$ 的光滑截面。$p$-形式的全体记为 $\Omega^p(M)$。

在局部坐标 $(x^1,\dots,x^n)$ 下，一个 $p$-形式可以表示为：

$$\omega = \sum_{i_1 < \cdots < i_p} \omega_{i_1\cdots i_p}(x)\, dx^{i_1} \wedge \cdots \wedge dx^{i_p},$$

其中系数 $\omega_{i_1\cdots i_p}$ 是光滑函数。

具体来说：

- **0-形式**就是光滑函数 $f(x)$。
- **1-形式**是形如 $\omega = f_i(x)\,dx^i$ 的表达式，它是切向量的线性函数，即对每个切向量 $X$，$\omega(X) \in \mathbb{R}$。
- **2-形式**是形如 $\omega = \frac{1}{2}\omega_{ij}\,dx^i\wedge dx^j$（或等价地 $\sum_{i<j}\omega_{ij}\,dx^i\wedge dx^j$）的表达式。

一个 $p$-形式 $\omega$ 称为**反称协变[[张量]]**：对任意切向量 $X_1,\dots,X_p$ 和任意置换 $\pi$，

$$\omega(X_{\pi(1)},\dots,X_{\pi(p)}) = (-1)^\pi\,\omega(X_1,\dots,X_p).$$

### 外代数结构

所有微分形式的直和

$$\Omega^*(M) = \bigoplus_{p=0}^n \Omega^p(M)$$

构成一个**分次反交换代数**：若 $\alpha \in \Omega^p(M)$，$\beta \in \Omega^q(M)$，则

$$\alpha \wedge \beta = (-1)^{pq}\,\beta \wedge \alpha.$$

### 外微分算子

外微分 $d$ 是线性算子 $d: \Omega^p(M) \to \Omega^{p+1}(M)$，由以下规则定义：

1. **对 0-形式（函数）**：$df = \frac{\partial f}{\partial x^i}\,dx^i$。
2. **对一般 $p$-形式**：若 $\omega = \sum_{i_1<\cdots<i_p} \omega_{i_1\cdots i_p}\,dx^{i_1}\wedge\cdots\wedge dx^{i_p}$，则

$$d\omega = \sum_{i_1<\cdots<i_p} d\omega_{i_1\cdots i_p} \wedge dx^{i_1}\wedge\cdots\wedge dx^{i_p}.$$

外微分的抽象定义（不依赖坐标系）为：对任意[[光滑向量场]] $X_1,\dots,X_{p+1}$，

$$
\begin{aligned}
d\omega(X_1,\dots,X_{p+1}) = &\sum_{i=1}^{p+1} (-1)^{i-1}X_i\,\omega(X_1,\dots,\widehat{X_i},\dots,X_{p+1}) \\
&+ \sum_{i<j} (-1)^{i+j}\,\omega([X_i,X_j],X_1,\dots,\widehat{X_i},\dots,\widehat{X_j},\dots,X_{p+1}).
\end{aligned}
$$

### 外微分的性质

外微分算子 $d$ 满足：

1. **线性性**：$d(\lambda\omega + \mu\eta) = \lambda d\omega + \mu d\eta$，$\forall \lambda,\mu\in\mathbb{R}$。
2. **莱布尼茨法则**：$d(\omega\wedge\eta) = d\omega\wedge\eta + (-1)^p\,\omega\wedge d\eta$，其中 $\omega$ 为 $p$-形式。
3. **幂零性**：$d^2 = 0$，即 $d(d\omega)=0$ 对任意 $\omega$ 成立。
4. **与拉回交换**：设 $f: M\to N$ 为光滑映射，则 $d(f^*\omega) = f^*(d\omega)$。

### 拉回映射

设 $f: M\to N$ 为光滑映射，则 $f$ 诱导了微分形式的反向映射 $f^*: \Omega^p(N) \to \Omega^p(M)$，定义为

$$(f^*\omega)_p(X_1,\dots,X_p) = \omega_{f(p)}(f_*X_1,\dots,f_*X_p).$$

### 内乘与李导数

**内乘**：对向量场 $X$ 和 $p$-形式 $\omega$，定义 $(p-1)$-形式 $i_X\omega$：

$$i_X\omega(Y_1,\dots,Y_{p-1}) = \omega(X,Y_1,\dots,Y_{p-1}).$$

内乘满足：$i_X\circ i_X = 0$，以及反导性 $i_X(\omega\wedge\eta) = i_X\omega\wedge\eta + (-1)^p\,\omega\wedge i_X\eta$。

**李导数**：对向量场 $X$ 和 $p$-形式 $\omega$，李导数 $L_X\omega$ 定义为

$$L_X\omega = \frac{d}{dt}\Big|_{t=0} (\phi_t)^*\omega,$$

其中 $\{\phi_t\}$ 是 $X$ 生成的单参数变换群。李导数与内乘、外微分满足著名的**嘉当公式**：

$$L_X = i_X\circ d + d\circ i_X.$$

### [[闭形式与恰当形式]]

- 若 $d\omega = 0$，则称 $\omega$ 为**闭形式**（closed form）。
- 若存在 $\eta$ 使得 $\omega = d\eta$，则称 $\omega$ 为**恰当形式**（exact form）。

由 $d^2=0$ 可知：恰当形式必为闭形式。反之则不一定成立，这一差异由 [[de Rham 上同调]]群刻画。

### [[de Rham 上同调]]

定义 $M$ 的 $p$ 次 [[de Rham 上同调]]群为：

$$H_{dR}^p(M;\mathbb{R}) = \frac{\{\text{闭 $p$-形式}\}}{\{\text{恰当 $p$-形式}\}} = \frac{Z^p(M)}{B^p(M)}.$$

光滑映射 $f: M\to N$ 通过拉回诱导上同调群之间的同态：

$$f^*: H_{dR}^p(N;\mathbb{R}) \to H_{dR}^p(M;\mathbb{R}), \quad f^*[\omega] = [f^*\omega].$$

如果两个光滑映射 $f,g: M\to N$ 同伦，则它们诱导相同的上同调同态。

### Poincaré 引理

**Poincaré 引理**：局部上（即在 $\mathbb{R}^n$ 或可缩[[流形]]上），次数 $>0$ 的闭形式都是恰当的。具体地：

$$H_{dR}^p(\mathbb{R}^n) = \begin{cases} \mathbb{R}, & p = 0,\\ 0, & p > 0. \end{cases}$$

这一结论说明 [[de Rham 上同调]]反映的是[[流形]]的**整体拓扑性质**，而非局部性质。

### 斯托克斯定理

**斯托克斯定理**（斯托克斯积分公式）是微积分基本定理在[[流形]]上的推广。设 $M$ 为 $n$ 维定向带边[[流形]]，$\omega$ 为 $M$ 上具有紧支集的 $(n-1)$-形式，则

$$\int_M d\omega = \int_{\partial M} \omega,$$

其中 $\partial M$ 取诱导定向。

特别地，经典的格林公式、斯托克斯公式和高斯公式都是这一统一公式的特例。

## 形式的类别

微分形式按照**次数**分类：

- **0-形式**：光滑函数。外微分给出梯度。
- **1-形式**：余切向量场，对偶于切向量。局部表示为 $f_i\,dx^i$。
- **2-形式**：可视为反对称的 $(0,2)$-[[张量]]场。局部表示为 $\sum_{i<j} f_{ij}\,dx^i\wedge dx^j$。
- **$k$-形式**：$k$ 次反称协变[[张量]]场，$k > n$ 时恒为零。

在 $n$ 维[[流形]]上，最高次非平凡形式是 $n$-形式。

## 降维表述

在更基本的语言中，微分形式是**[[余切丛]]外幂的光滑截面**。从范畴论的角度，$\Omega^p(M)$ 是 $M$ 上光滑函数层上的一个 $C^\infty(M)$-模。

外微分算子 $d$ 可以看作 $\Omega^*(M)$ 上的一个**分次导子**，其平方为零，这使得 $(\Omega^*(M), d)$ 构成一个**微分分次代数**（differential graded algebra, DGA）。

## 升维视角

- 微积分基本定理、格林公式、斯托克斯公式和高斯公式都是**通用的斯托克斯定理**在 1、2、3 维的特例。
- 在代数拓扑中，[[de Rham 上同调]]与奇异上同调（实系数）通过 **de Rham 定理** 同构，建立了分析语言与拓扑语言之间的桥梁。
- 在规范场论中，**联络 1-形式** 和 **曲率 2-形式** 是微分形式的核心应用。

---

# 证明

## 外微分的幂零性 $d^2=0$

从局部坐标表示出发。设 $\omega$ 为任意 $p$-形式，先考虑 $\omega = f\,dx^{i_1}\wedge\cdots\wedge dx^{i_p}$：

$$
\begin{aligned}
d(d\omega) &= d\big(df\wedge dx^{i_1}\wedge\cdots\wedge dx^{i_p}\big) \\
&= d\left(\frac{\partial f}{\partial x^i}dx^i\right)\wedge dx^{i_1}\wedge\cdots\wedge dx^{i_p} \\
&= \frac{\partial^2 f}{\partial x^i\partial x^j}dx^j\wedge dx^i\wedge dx^{i_1}\wedge\cdots\wedge dx^{i_p}.
\end{aligned}
$$

由于 $\frac{\partial^2 f}{\partial x^i\partial x^j}$ 对 $i,j$ 对称，而 $dx^j\wedge dx^i$ 对 $i,j$ 反对称，因此求和结果为零。由线性性即知 $d^2\omega=0$ 对所有微分形式成立。

## [[闭形式与恰当形式]]的关系

**命题**：恰当形式必为闭形式，即 $d(d\eta)=0$。

**命题**（Poincaré 引理）**：在可缩[[流形]]（如 $\mathbb{R}^n$）上，闭形式必为恰当形式。

证明采用归纳法：对 $\mathbb{R}^n$ 上的 $p$ 次闭形式 $\omega$，将其分解为含 $dx^n$ 和不含 $dx^n$ 的部分，通过积分构造出 $\eta$ 使得 $d\eta=\omega$。

---

# 应用

## 直接应用

**例 1**（梯度场是保守场）在 $\mathbb{R}^3$ 中，设 $f$ 为光滑函数，则 $df = \frac{\partial f}{\partial x}dx + \frac{\partial f}{\partial y}dy + \frac{\partial f}{\partial z}dz$。沿曲线的积分与路径无关，仅取决于端点：

$$\int_\gamma df = f(\gamma(b)) - f(\gamma(a)).$$

这是微积分基本定理的直接推论。

**例 2**（格林公式）在二维区域中，对于 1-形式 $\omega = Pdx + Qdy$，

$$d\omega = \left(\frac{\partial Q}{\partial x} - \frac{\partial P}{\partial y}\right)dx\wedge dy,$$

斯托克斯定理给出：

$$\int_{\partial D} Pdx + Qdy = \iint_D \left(\frac{\partial Q}{\partial x} - \frac{\partial P}{\partial y}\right)dx\,dy.$$

**例 3**（球面的可定向性）考虑 $S^n\subset\mathbb{R}^{n+1}$，$\mathbb{R}^{n+1}$ 上的 $n$-形式

$$\omega = \sum_{i=1}^{n+1} (-1)^{i-1} x_i\, dx^1\wedge\cdots\wedge\widehat{dx^i}\wedge\cdots\wedge dx^{n+1},$$

其拉回 $i^*\omega$ 是 $S^n$ 上处处非零的 $n$-形式，因此 $S^n$ 是可定向的。

## 间接应用

- **在微分几何中**：用曲率 2-形式计算黎曼曲率[[张量]]，给出高斯-博内定理的简洁证明。
- **在代数拓扑中**：[[de Rham 上同调]]是研究[[流形]]拓扑不变量的强大工具。
- **在理论物理中**：麦克斯韦方程组可以用微分形式写为 $dF=0$ 和 $d\star F = J$ 的简洁形式；广义相对论中的爱因斯坦方程也广泛使用微分形式。
- **在偏微分方程中**：闭形式的 Poincaré 引理为势函数的存在性提供了理论保证。

---

# 推广

- **复微分形式**：在复[[流形]]上，外微分可以分解为 $(p,q)$-型，导出了 Dolbeault 上同调理论。
- **向量值微分形式**：取值于向量丛的微分形式，在规范场论中至关重要。
- **超渡**（Transgression）：将闭形式拉回到更大的空间后可能变为恰当形式，这是陈-西蒙斯理论的基础。
- **带边[[流形]]的 Stokes 定理**：可推广到奇异链上的积分，为 de Rham 定理提供基础。

---

# 常见的误解

1. **误解**：微分形式就是"无穷小量"的乘积。
   **纠正**：微分形式是余切向量的反对称多重线性函数，其运算规则由外代数严格定义，并非无穷小量的朴素乘积。

2. **误解**：$dx^i$ 就是"无穷小的 $x^i$ 变化量"。
   **纠正**：$dx^i$ 是[[余切空间]]中的对偶基向量，它将切向量 $\partial/\partial x^j$ 映射为 $\delta^i_j$。

3. **误解**：所有闭形式都是恰当的。
   **纠正**：这仅在局部（或可缩[[流形]]上）成立。整体上，$H_{dR}^p(M)$ 可能非平凡，反映了[[流形]]的拓扑"洞"。例如，$\mathbb{R}^2\setminus\{0\}$ 上的 1-形式 $\frac{-y\,dx + x\,dy}{x^2+y^2}$ 是闭的但不是恰当的。

4. **误解**：$d^2=0$ 是平凡的。
   **纠正**：$d^2=0$ 是外微分理论的关键性质，它定义了上链复形，从而使得 [[de Rham 上同调]]得以定义。

---

# 启发

- 外微分的反交换律 $dx\wedge dy = -dy\wedge dx$ 本质上来自定向的概念：交换两个坐标相当于反转定向。
- 统一性思想：用同一个算子 $d$ 统一了 grad、curl、div，用同一个积分定理统一了格林、斯托克斯和高斯公式——这是数学中"寻求统一"的绝佳范例。
- $d^2=0$ 与边界算子的 $\partial^2=0$ 对偶，这一格局贯穿整个代数拓扑。

---

# 总结

## 思想

微分形式实现了"将分析对象嵌套到代数结构中"，使得积分和微分都能以纯代数的方式操作，从而剥离了度量的干扰，暴露了问题的拓扑本质。

## 方法

| 方法 | 说明 |
|------|------|
| **外代数运算** | 利用 $\wedge$ 的反对称性简化计算 |
| **外微分 $d$** | 统一的微分算子，$d^2=0$ 提供上链复形 |
| **拉回 $f^*$** | 在不同空间之间转移微分形式 |
| **闭形式/恰当形式** | 通过 [[de Rham 上同调]]刻画[[流形]]拓扑 |
| **斯托克斯定理** | 积分与微分的对偶关系 |

---

# 回看并提问

- 为什么[[闭形式与恰当形式]]的差异恰好刻画了[[流形]]的拓扑结构？背后是否有更深层的范畴论解释？
- 在复[[流形]]上，外微分分解为 $\partial$ 和 $\bar\partial$，对应的 Dolbeault 上同调与 [[de Rham 上同调]]有何关系？
- 微分形式是否可以推广到非交换几何的框架中？

---

# 参考文献

1. 梅加强. *[[流形]]与几何初步*. 2.5 微分形式；2.7 Stokes 积分公式；4.1 Poincaré 引理；4.2 [[de Rham 上同调]]群的计算.
2. Shoshichi Kobayashi. *Differential Geometry of Curves and Surfaces*. 2.5 Exterior Differential Forms in Two Variables; 4.1 Integration of Exterior Differential Forms.
3. Wolfgang Kühnel. *Differential Geometry: Curves - Surfaces - Manifolds* (Third Edition). 4.33 Definition of Differential Forms; 4.36 Theorem of Stokes.
4. 贝尔热, 戈斯丢. *微分几何：[[流形]]、曲线和曲面*（第二版修订本）. 0.3 [[向量空间]]的开集上的微分形式.
5. 特里斯坦·尼达姆. *可视化微分几何和形式：一部五幕数学正剧*. 第32章 1-形式的定义；第36章 微分学（外导数、[[闭形式与恰当形式]]）；第37章 积分学（斯托克斯定理）.
6. William Fulton. *Algebraic Topology: A First Course* (GTM 153). 微分形式与路径积分.
7. 陈维桓. *微分几何*. 第七章 活动标架和外微分法（§7.1 外形式，§7.2 外微分式和外微分）.
8. 梁灿彬, 周彬. *微分几何入门与广义相对论*. 第2-3节 微分形式；第5章 微分形式及其积分.
9. B. A. Dubrovin, A. T. Fomenko, S. P. Novikov. *Modern Geometry — Methods and Applications* (Part I, GTM 93). 外微分的定义.
10. B. A. Dubrovin, A. T. Fomenko, S. P. Novikov. *Modern Geometry — Methods and Applications* (Part III, GTM 124). Poincaré 引理；[[de Rham 上同调]].
11. Clifford Henry Taubes. *Differential Geometry: Bundles, Connections, Metrics and* (Oxford Graduate Texts). Poincaré 引理；[[de Rham 上同调]].
12. Victor W. Guillemin, Alan Pollack. *Differential Topology*. 斯托克斯定理；Poincaré 引理.
13. 姜伯驹. *同调论*. de Rham 定理.
14. 陈维桓. *微分几何引论*. §4.2 外微分式的外微分；§4.4 Stokes 定理.
15. Jean-Pierre Françoise, Gregory L. Naber 等. *数学物理学百科全书 11*：代数拓扑；辛几何与拓扑. 微分形式在 $\mathbb{R}^n$ 上的定义.