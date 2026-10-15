# Jacobi矩阵

> 光滑映射的线性逼近，微分几何与多变量分析的核心工具

#微分几何 #多变量微积分 #矩阵 #线性逼近

---

## 前置知识

### 必备知识

- **多元函数微分学**：偏导数的定义与计算，方向导数
- **矩阵代数**：矩阵乘法、行列式、矩阵的秩
- **线性映射**：线性映射可以用矩阵表示，线性映射的复合对应矩阵乘法

### 辅助知识

- **链式法则**：多元函数的链式法则是理解Jacobi矩阵复合性质的基础
- **隐函数定理与逆映射定理**：Jacobi矩阵的非退化性是判断映射局部可逆的关键条件

### 拓展知识

- **微分流形与切空间**：Jacobi矩阵是切映射（微分）在局部坐标下的表示，是流形框架下线性逼近的几何工具
- **微分拓扑**：浸入（immersion）、淹没（submersion）和正则值的概念都依赖于Jacobi矩阵的秩条件
- **同调论**：Jacobi行列式的正负号与映射的局部定向和映射度有深刻联系

---

## 动机

### 构造动机

考虑一个光滑映射 $f: \mathbb{R}^n \to \mathbb{R}^m$，在某点 $P_0$ 附近我们希望用线性映射来近似它，即寻找一个线性映射 $A$ 使得

$$
f(P_0 + \xi) = f(P_0) + A(\xi) + o(\|\xi\|).
$$

这个线性映射 $A$ 就是 $f$ 在 $P_0$ 处的微分（或导数）。在取定标准基后，$A$ 的矩阵表示正是由 $f$ 的各分量函数对各自变量的偏导数构成的矩阵，即 **Jacobi矩阵**。

**经典例子**：考虑线性映射 $f: \mathbb{R}^n \to \mathbb{R}^m$，$f(X) = AX$（$A$ 为 $m \times n$ 矩阵）。此时 $f$ 的Jacobi矩阵就是 $A$ 本身，且处处相同，因为线性映射的增量 $\Delta Y = A(X + \Delta X) - AX = A\Delta X$ 恒等于其线性部分，所以微分不依赖于点的位置。

---

## 形式

### 规范的通用形式

设 $f: \mathbb{R}^n \to \mathbb{R}^m$ 为光滑映射，在坐标下写为 $f(x^1, \dots, x^n) = (f^1, \dots, f^m)$。$f$ 在点 $P$ 处的 **Jacobi矩阵** 定义为

$$
df = \left( \frac{\partial f^i}{\partial x^j} \right) = \begin{pmatrix} 
\frac{\partial f^1}{\partial x^1} & \frac{\partial f^1}{\partial x^2} & \cdots & \frac{\partial f^1}{\partial x^n} \\[4pt]
\frac{\partial f^2}{\partial x^1} & \frac{\partial f^2}{\partial x^2} & \cdots & \frac{\partial f^2}{\partial x^n} \\[4pt]
\vdots & \vdots & \ddots & \vdots \\[4pt]
\frac{\partial f^m}{\partial x^1} & \frac{\partial f^m}{\partial x^2} & \cdots & \frac{\partial f^m}{\partial x^n}
\end{pmatrix}.
$$

这是一个 $m \times n$ 矩阵，其元素是依赖于点 $P$ 的函数。当 $m = n$ 时，可定义 **Jacobi行列式**，记为

$$
J(f) = \det(df).
$$

### 必要条件分析

**定理**（等高线流形定理）：设 $f: \mathbb{R}^n \to \mathbb{R}^k$ 是 $C^\infty$ 类光滑映射，$M_c = \{x \in \mathbb{R}^n \mid f(x) = c\}$。若映射 $f$ 的Jacobi矩阵的秩在每一点 $P_0 \in M_c$ 都取最大的秩（即 $\operatorname{rank} df(P_0) = k$），则 $M_c$ 是 $(n-k)$ 维 $C^\infty$ 类光滑流形。

- **条件分析**：秩条件 $\operatorname{rank} df = k$ 保证了映射的"横截性"，使得解集具有流形结构。
- **若秩不足**：如果在某点 $P_0 \in M_c$ 处 $\operatorname{rank} df(P_0) < k$，则该点称为奇点，$M_c$ 在该点附近可能不再是光滑流形，定理的结论不再成立。

### 等价表达

1. **作为切映射的矩阵表示**：设 $M$ 和 $N$ 分别为 $m$ 维和 $n$ 维光滑流形，$f: M \to N$ 为光滑映射。切映射 $f_{*p}: T_pM \to T_{f(p)}N$ 在局部坐标基 $\{\partial/\partial u^i\}$ 和 $\{\partial/\partial v^\alpha\}$ 下的矩阵正是Jacobi矩阵 $\left(\partial v^\alpha / \partial u^i|_p\right)$。

2. **作为线性逼近**：$f(P_0 + \xi) = f(P_0) + df_{P_0}(\xi) + o(\|\xi\|)$，其中 $df_{P_0}$ 就是Jacobi矩阵给出的线性映射。

3. **作为函数的梯度（$m=1$ 时）**：当 $f$ 是单值函数时，Jacobi矩阵退化为行向量，即函数 $f$ 的梯度 $\operatorname{grad} f$。函数 $f$ 的微分 $df_{P_0}$ 的矩阵与Jacobi矩阵完全一致。

### 形式的类别

Jacobi矩阵可按映射的维数分类：

- **$m=1$（函数）**：Jacobi矩阵为 $1 \times n$ 行向量，即梯度 $\operatorname{grad} f$。
- **$m=n$（方映射）**：Jacobi矩阵为方阵，可定义Jacobi行列式，非退化时映射局部可逆。
- **$m < n$（浸入情形）**：秩为 $m$ 时，映射是浸入（immersion），线性化是单射。
- **$m > n$（淹没情形）**：秩为 $n$ 时，映射是淹没（submersion），线性化是满射。

### 在自然语言中，相关命题如何表达？

- "Jacobi矩阵非退化" ⟺ "映射在局部可逆"（逆映射定理）。
- "Jacobi矩阵满秩" ⟺ "映射在该点附近是浸入或淹没"。
- "Jacobi行列式为零" ⟺ "该点是坐标变换的奇点"。

### 降维表述

Jacobi矩阵本质上就是 **线性映射的局部表示**。在 $\mathbb{R}^n$ 中，光滑映射在某点的微分 $df_{P_0}$ 是一个线性映射，其矩阵就是Jacobi矩阵。因此，Jacobi矩阵的代数性质（秩、行列式、可逆性）直接对应着映射在该点附近的局部几何性质。

### 升维视角

在微分流形的框架下，Jacobi矩阵是 **切映射（微分）** 在局部坐标下的具体表示。切映射是流形之间光滑映射的线性化，它不依赖于坐标选取，而Jacobi矩阵依赖于坐标的选取——不同坐标下Jacobi矩阵通过乘以坐标变换的Jacobi矩阵相联系。

### 联动理解

- **与链式法则的关系**：复合映射的Jacobi矩阵等于各映射Jacobi矩阵的乘积。因为 $z^i = z^i(y^1,\dots,y^n) = z^i(y^1(x^1,\dots,x^n),\dots,y^n(x^1,\dots,x^n))$，按复合函数的微分公式得到 $\frac{\partial z^i}{\partial x^j} = \sum_{k=1}^{n} \frac{\partial z^i}{\partial y^k} \frac{\partial y^k}{\partial x^j}$，即 $d\psi_{x,z} = dg \cdot df^{-1}$。

- **与反函数的关系**：因为 $f^{-1} \circ f = \text{id}$，所以 $d(f^{-1} \circ f) = df^{-1} \circ df = E$，从而 $df^{-1} = (df)^{-1}$，即反函数的Jacobi矩阵是原函数Jacobi矩阵的逆。

- **与坐标变换的关系**：坐标变换的Jacobi行列式满足 $J(\psi_{x,z}) = J(g) / J(f)$。

---

## 证明

### 概括证明

**命题**（等高线流形定理）：若 $f: \mathbb{R}^n \to \mathbb{R}^k$ 是光滑映射，且 $\operatorname{rank} df = k$ 在 $M_c = f^{-1}(c)$ 上每点成立，则 $M_c$ 是 $(n-k)$ 维光滑流形。

**证明思路**：在每点 $P_0 \in M_c$ 附近，利用Jacobi矩阵的秩条件，通过调整坐标选取使前 $k$ 列构成的 $k \times k$ 子阵非退化。定义辅助映射 $g: \mathbb{R}^n \to \mathbb{R}^n$，将 $f$ 的前 $k$ 个分量与剩余的 $n-k$ 个坐标组合，得到 $g$ 在 $P_0$ 处Jacobi矩阵非退化。由逆映射定理，$g$ 局部可逆，从而 $f$ 的局部表示可化为前 $k$ 个坐标为常数，余下的 $n-k$ 个坐标作为自由参数，这就给出了 $M_c$ 的 $(n-k)$ 维局部参数化。

---

## 应用

### 直接应用

**例1（球坐标变换）**：三维欧氏空间中的球坐标变换

$$
x^1 = r\sin\theta\cos\varphi,\quad x^2 = r\sin\theta\sin\varphi,\quad x^3 = r\cos\theta,
$$

其中 $r \ge 0,\; 0 \le \theta \le \pi,\; 0 \le \varphi < 2\pi$。Jacobi矩阵为

$$
d\psi = \begin{pmatrix} \sin\theta\cos\varphi & r\cos\theta\cos\varphi & -r\sin\theta\sin\varphi \\ \sin\theta\sin\varphi & r\cos\theta\sin\varphi & r\sin\theta\cos\varphi \\ \cos\theta & -r\sin\theta & 0 \end{pmatrix},
$$

Jacobi行列式为 $J = r^2\sin\theta$。当 $r = 0$ 或 $\theta = 0,\pi$ 时行列式为 $0$，这些点是球坐标系的奇点。在 $r > 0,\; 0 < \theta < \pi,\; 0 < \varphi < 2\pi$ 的区域，球坐标是双方单值的且无奇点。

**例2（极坐标变换）**：平面极坐标变换 $(r,\varphi) \to (x^1,x^2)$：

$$
x^1 = r\cos\varphi,\quad x^2 = r\sin\varphi.
$$

Jacobi矩阵为

$$
A = \begin{pmatrix} \cos\varphi & -r\sin\varphi \\ \sin\varphi & r\cos\varphi \end{pmatrix},
$$

Jacobi行列式为 $J = r$。原点 $r=0$ 是奇点。

**例3（方程组定义的曲面）**：在 $\mathbb{R}^4$ 中，考虑方程组

$$
f^1(x^1,x^2,x^3,x^4) = (x^1)^2 + (x^2)^2,\quad f^2(x^1,x^2,x^3,x^4) = (x^3)^2 + (x^4)^2,
$$

Jacobi矩阵为

$$
df = \begin{pmatrix} 2x^1 & 2x^2 & 0 & 0 \\ 0 & 0 & 2x^3 & 2x^4 \end{pmatrix}.
$$

在 $(x^1)^2+(x^2)^2 = 1$ 且 $(x^3)^2+(x^4)^2 = 1$ 的点处，秩为 $2$，因此解集是 $2$ 维光滑流形。

### 间接应用

- **逆映射定理**：Jacobi矩阵非退化是映射局部可逆的充分条件，保证了局部微分同胚的存在。
- **隐函数定理**：Jacobi矩阵的某块子阵非退化，保证能从方程组中局部解出部分变量。
- **浸入与淹没**：映射的秩条件（Jacobi矩阵的秩）决定了映射是浸入（秩等于定义域维数）还是淹没（秩等于余定义域维数），进而决定了像的局部结构。
- **可定向流形**：流形坐标覆盖中，若每对坐标卡之间的转换映射的Jacobi行列式恒正，则流形是可定向的。
- **同调论中的映射度**：光滑同胚的Jacobi行列式的正负号，决定该映射是保持定向还是反转定向，从而影响同调群之间的诱导映射。
- **第一基本形式**：曲面参数变换下，第一基本形式的系数矩阵按 $(\widetilde{g}_{ij}) = (D\varphi)^T (g_{ij}) (D\varphi)$ 变换，其中 $D\varphi$ 是参数变换的Jacobi矩阵。
- **方向导数**：向量场 $Y$ 在方向 $X$ 上的方向导数可通过 $Y$ 的Jacobi矩阵计算：$D_X Y_p = DY_p(X)$。

---

## 推广

- **复Jacobi矩阵**：对于复解析映射 $w^k = w^k(z^1,\dots,z^n)$，复Jacobi矩阵 $(\partial w^k/\partial z^j)$ 的行列式（称为复Jacobi行列式）决定了复坐标变换的局部性质。在复坐标变换下，对应的实 $2n \times 2n$ Jacobi矩阵具有特殊的分块结构 $\begin{pmatrix} A & 0 \\ 0 & \bar{A} \end{pmatrix}$，其行列式为 $|\det A|^2$。

- **推广到流形之间**：对于流形之间的光滑映射 $f: M \to N$，切映射 $f_*$ 是坐标无关的推广，而Jacobi矩阵是它在局部坐标下的具体表示。

---

## 常见的误解

1. **"Jacobi矩阵总是方阵"**：实际上，Jacobi矩阵可以是 $m \times n$ 的任意矩形矩阵，只有 $m=n$ 时才能定义Jacobi行列式。例如从 $\mathbb{R}^4$ 到 $\mathbb{R}^2$ 的映射的Jacobi矩阵是 $2 \times 4$ 矩阵。

2. **"Jacobi行列式为零意味着映射不可逆"**：严格来说，Jacobi行列式为零意味着在该点逆映射定理不适用，即映射在该点附近不是局部微分同胚。例如球坐标变换在 $r=0$ 处Jacobi行列式为 $0$，但映射本身仍然有定义，只是该点处坐标变换退化。

3. **"Jacobi矩阵与微分 $df$ 是两回事"**：实际上，对于光滑函数 $f$，微分 $df_{P_0}$ 的矩阵表示就是Jacobi矩阵，二者在取定坐标后完全一致。符号 $df$ 用于Jacobi矩阵不会引起混淆。

4. **"Jacobi矩阵处处非退化就是整体可逆"**：Jacobi矩阵的非退化性只保证局部可逆（逆映射定理），不保证整体可逆性，后者需要额外的单射性和满射性条件。

---

## 启发

- **线性化的力量**：Jacobi矩阵体现了数学中一个核心思想——用线性对象来研究非线性对象。这个思想贯穿了整个微分几何和现代分析。
- **局部与整体的关系**：Jacobi矩阵的秩条件给出了局部几何结构的刻画（如子流形结构），但局部性质如何拼成整体结构是一个更深层的问题。
- **坐标依赖与坐标无关**：Jacobi矩阵本身依赖于坐标的选取，但它所代表的线性映射（切映射）是坐标无关的几何对象。这提醒我们区分"表示"与"被表示的对象"。

---

## 总结

### 思想

**用线性逼近非线性**：Jacobi矩阵是光滑映射在某点处的"最佳线性近似"，它将复杂的非线性映射简化为一个线性映射来研究，使我们可以利用线性代数工具分析局部几何性质。

### 方法

| 方法 | 在笔记中的位置 |
|------|----------------|
| 线性逼近（微分） | 动机、形式 |
| 秩条件判定流形结构 | 形式（必要条件分析）、应用（等高线流形定理） |
| 复合映射的链式法则（矩阵乘法） | 等价表达、联动理解 |
| 行列式判别奇点 | 应用（坐标变换例子） |
| 局部线性化 → 局部几何性质 | 推广、启发 |

---

## 回看并提问

1. 如果一个映射的Jacobi矩阵在某点秩为 $r$，那么该点附近映射的像有什么样的局部结构？
2. 坐标变换下，Jacobi矩阵如何变化？这与张量的变换规律有何联系？
3. 为什么在流形可定向性的定义中，要求转换映射的Jacobi行列式恒正而不是恒负？
4. 在复分析中，全纯函数的Jacobi矩阵（视为实矩阵）有什么特殊的分块结构？