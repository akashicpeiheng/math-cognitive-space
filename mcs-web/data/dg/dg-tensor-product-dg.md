---
tags:
  - #代数 #多重线性代数 #张量 #定义
created: 2026-09-15
---

# 张量积（Tensor Product）

张量积是多重线性代数中最核心的构造之一。它提供了一种将低阶[[张量]]"相乘"得到高阶[[张量]]的系统化方法，同时也是从双线性映射到线性映射的"万能转换器"。张量积不仅是微分几何中[[张量]]场理论的基础，在同调论、表示论、量子力学和广义相对论中都有根本性的应用。

---

## 前置知识

### 必备知识

- **[[向量空间]]与对偶空间**：理解有限维[[向量空间]] $V$ 及其对偶空间 $V^*$ 的概念，以及基与对偶基的关系。
- **多重线性映射**：一个 $r$ 重线性函数 $f: V \times \cdots \times V \to \mathbb{R}$ 是指对每个自变量都保持线性的函数。
- **线性泛函与双线性型**：$V$ 上的线性函数（1-形式）和 $V \times V$ 上的双线性型。

### 辅助知识

- **自由 Abel 群与商群构造**：张量积可以通过自由 Abel 群模去双线性关系来严格构造，这对理解其泛性质有帮助。
- **Einstein 求和约定**：在[[张量]]计算中，相同指标出现时自动求和，能极大简化表达式。
- **范畴论基本概念**：张量积可以看作一个双函子，理解函子性有助于把握其跨领域的统一性。

### 拓展知识

- **[[张量]]代数**：所有 $(r,s)$ 型[[张量]]空间的直和 $\bigoplus_{r,s\ge0} V_s^r$ 配上张量积运算构成一个分次代数，称为[[张量]]代数。
- **外代数**：对协变[[张量]]进行反对称化，并从张量积导出外积 $\wedge$，可得到外代数（Grassmann 代数）。
- **Künneth 公式**：在同调论中，链复形张量积的同调群可由各因子的同调群决定。

---

## 动机

### 引入动机

**从双线性映射到线性映射的普遍需求。** 在数学的各个分支中，我们经常遇到双线性映射 $\phi: V \times W \to U$——例如内积、矩阵乘法、李括号等。如果能找到一个"最通用"的[[向量空间]] $V \otimes W$，使得每一个双线性映射 $\phi$ 都**唯一对应**一个线性映射 $\tilde{\phi}: V \otimes W \to U$，那么所有关于双线性映射的问题都可以转化为线性映射的问题来研究。这种"把双线性转化为线性"的需求，就是张量积这个概念的原始驱动力。

**学科内部线索**：在微分几何中，我们需要将低阶[[张量]]组合成高阶[[张量]]来描述更复杂的几何结构（如曲率[[张量]]）。没有张量积，就无法系统性地构建 $(r,s)$ 型[[张量]]空间。

**外部应用线索**：在广义相对论中，能量-动量[[张量]] $T$ 是一个 $(0,2)$ 型[[张量]]，描述物质的分布与运动；黎曼曲率[[张量]] $R$ 是一个 $(1,3)$ 型[[张量]]，描述时空的弯曲。这些[[张量]]场的构造都依赖于张量积运算。

### 构造动机

以[[向量空间]] $V$ 和 $W$ 为例，考虑所有从 $V^* \times W^*$ 到 $\mathbb{R}$ 的双线性函数构成的集合。如果记
$$
V \otimes W = \{ f: V^* \times W^* \to \mathbb{R} \mid f \text{ 关于两个分量都是线性的} \},
$$
并在其上定义自然的加法和数乘，则 $V \otimes W$ 成为一个[[向量空间]]，称为 $V$ 和 $W$ 的张量积。对于 $v \in V$, $w \in W$，我们定义纯[[张量]]（或称可分解[[张量]]）$v \otimes w$ 为
$$
v \otimes w(\varphi, \psi) = \varphi(v) \cdot \psi(w), \quad \forall \varphi \in V^*, \psi \in W^*.
$$

另一种等价的构造（适用于 Abel 群）是：设 $F(A \times B)$ 是以 $A \times B$ 为基的自由 Abel 群，$R(A \times B)$ 是由双线性关系
$$
(a_1 + a_2, b) - (a_1, b) - (a_2, b), \quad (a, b_1 + b_2) - (a, b_1) - (a, b_2)
$$
生成的子群，则张量积定义为商群 $A \otimes B = F(A \times B) / R(A \times B)$，陪集 $(a,b)$ 记作 $a \otimes b$。

两种构造虽然形式上不同，但核心思想一致：**张量积是双线性映射的泛对象**。

---

## 形式

### 规范的通用形式

张量积有几种通用的定义方式，各有优劣：

**方式一：通过多重线性函数定义（几何风格）**
设 $V$ 是 $n$ 维[[向量空间]]，$f$ 是 $r$ 重线性函数，$g$ 是 $s$ 重线性函数，则 $f$ 和 $g$ 的张量积 $f \otimes g$ 定义为 $r+s$ 重线性函数：
$$
(f \otimes g)(u_1, \dots, u_{r+s}) = f(u_1, \dots, u_r) \cdot g(u_{r+1}, \dots, u_{r+s}).
$$

**方式二：通过对偶空间的构造（代数风格）**
$$
V \otimes W = \{ f: V^* \times W^* \to \mathbb{R} \mid f \text{ 双线性} \},
$$
其中 $v \otimes w$ 定义为 $v \otimes w(\varphi, \psi) = \varphi(v) \psi(w)$。

**方式三：通过自由[[向量空间]]模去关系（泛性质风格）**
$$
V \otimes W = F(V \times W) / \text{span}\{ (v_1+v_2,w) - (v_1,w) - (v_2,w), (v,w_1+w_2) - (v,w_1) - (v,w_2) \}
$$
这种方式强调了张量积的泛性质：对任意双线性映射 $\phi: V \times W \to U$，存在唯一的线性映射 $\tilde{\phi}: V \otimes W \to U$ 使得 $\tilde{\phi}(v \otimes w) = \phi(v,w)$。

**方式四：[[张量]]场上的张量积（微分几何风格）**
在[[流形]] $M$ 的切空间 $T_pM$ 上，定义张量积运算为
$$
\otimes: \otimes^{r,s} T_p M \times \otimes^{t,h} T_p M \to \otimes^{r+t,s+h} T_p M,
$$
对 $\theta \in \otimes^{r,s} T_p M$, $\eta \in \otimes^{t,h} T_p M$，有
$$
\theta \otimes \eta(W_1,\dots,W_{r+t}; X_1,\dots,X_{s+h}) = \theta(W_1,\dots,W_r; X_1,\dots,X_s) \cdot \eta(W_{r+1},\dots,W_{r+t}; X_{s+1},\dots,X_{s+h}).
$$

这四种方式视角不同，但在同构意义下是等价的。

### 必要条件分析

张量积的核心特征由**泛性质**刻画：

> **（泛性质）** 存在双线性映射 $\otimes: V \times W \to V \otimes W$，使得对任意双线性映射 $\phi: V \times W \to U$，存在唯一的线性映射 $\tilde{\phi}: V \otimes W \to U$ 满足 $\tilde{\phi} \circ \otimes = \phi$。

- 如果去掉"双线性"要求，则张量积退化为普通的 Cartesian 积上的自由[[向量空间]]，失去了将双线性转化为线性这一关键功能。
- 如果去掉"唯一性"要求，则张量积可以有多种不同构的候选，缺乏典范性。

### 等价表达

1. **分量形式**：设 $\{e_i\}$ 是 $V$ 的基，$\{e^j\}$ 是对偶基，则 $(r,s)$ 型[[张量]] $\theta$ 可表示为
   $$
   \theta = \theta_{j_1 \dots j_s}^{i_1 \dots i_r} \, e_{i_1} \otimes \dots \otimes e_{i_r} \otimes e^{j_1} \otimes \dots \otimes e^{j_s},
   $$
   其中分量 $\theta_{j_1 \dots j_s}^{i_1 \dots i_r} = \theta(e^{i_1}, \dots, e^{i_r}; e_{j_1}, \dots, e_{j_s})$。

2. **变换规则**：基变换下，[[张量]]分量按反变和协变指标分别变换
   $$
   \tilde{\theta}_{j_1 \dots j_s}^{i_1 \dots i_r} = d_{k_1}^{i_1} \dots d_{k_r}^{i_r} \cdot c_{j_1}^{l_1} \dots c_{j_s}^{l_s} \cdot \theta_{l_1 \dots l_s}^{k_1 \dots k_r}.
   $$

3. **泛性质图式**：存在交换图
   ```
             V × W ──⊗──→ V ⊗ W
               \         ╲
              ϕ \         ╲ ∃!φ̃
                  \         ↘
                    U
   ```

### 形式的类别

张量积概念可以在不同数学结构中平行出现：

- **[[向量空间]]的张量积** $V \otimes_{\mathbb{R}} W$：最常见的类型，记过 $\otimes_{\mathbb{R}}$ 可省略。
- **Abel 群的张量积** $A \otimes_{\mathbb{Z}} B$：以整数环 $\mathbb{Z}$ 为基环。
- **模的张量积** $M \otimes_R N$：环 $R$ 上的模之间的张量积。
- **链复形的张量积** $(C \otimes D)_n = \bigoplus_{p+q=n} C_p \otimes D_q$，带微份 $\partial(c_p \otimes d_q) = (\partial_p c_p) \otimes d_q + (-1)^p c_p \otimes (\partial_q d_q)$。
- **向量丛的张量积** $E \otimes F = \bigcup_{p \in M} E_p \otimes F_p$，是[[流形]]上秩为 $\text{rank}(E) \cdot \text{rank}(F)$ 的向量丛。
- **函子的张量积** 在 Topos 理论中还有内张量积（internal tensor product）的概念。

### 降维表述

张量积在集合论和范畴论层面可以这样理解：张量积是集合 Cartesian 积在双线性范畴中的"修正"——Cartesian 积 $V \times W$ 上自然的映射是双线性的，而张量积通过"强制"双线性关系，使得 $V \times W$ 上的双线性映射对应于 $V \otimes W$ 上的线性映射。这本质上是一个**自由构造**（自由[[向量空间]]）模去**关系**（双线性条件）的过程。

在范畴论语言中，固定一个变元 $- \otimes G$ 是一个协变函子：它将 Abel 群 $A$ 映到 $A \otimes G$，将同态 $f: A \to A'$ 映到 $f \otimes \text{id}_G: A \otimes G \to A' \otimes G$。

### 升维视角

在更高层的理论下，张量积是**单性子（monoidal category）**中的张量积运算的特例。[[向量空间]]范畴 $(\text{Vect}_\mathbb{R}, \otimes, \mathbb{R})$ 构成一个对称单性子，其中 $\otimes$ 是张量积，单位对象是 $\mathbb{R}$，且存在结合约束和交换约束。外积 $\wedge$ 可以视为张量积在反对称化后的导出结构。

在同调代数中，张量积函子 $-\otimes G$ 是右正合函子，其左导出函子 $\text{Tor}$ 衡量了张量积破坏正合性的程度。

---

## 性质与运算律

张量积运算满足以下基本性质：

**分配律**
$$
(\theta + \xi) \otimes \eta = \theta \otimes \eta + \xi \otimes \eta, \quad
\theta \otimes (\xi + \eta) = \theta \otimes \xi + \theta \otimes \eta.
$$

**数乘结合律**
$$
(\lambda \theta) \otimes \eta = \theta \otimes (\lambda \eta) = \lambda (\theta \otimes \eta), \quad \forall \lambda \in \mathbb{R}.
$$

**结合律**
$$
(\theta \otimes \xi) \otimes \eta = \theta \otimes (\xi \otimes \eta).
$$

**基与维数**：如果 $\{v^i\}$, $\{w^j\}$ 分别是 $V$, $W$ 的基，则 $\{v^i \otimes w^j\}$ 是 $V \otimes W$ 的一组基，且
$$
\dim(V \otimes W) = \dim V \cdot \dim W.
$$

**单位元（Abel 群）**：存在自然同构 $\mathbb{Z} \otimes A \cong A \cong A \otimes \mathbb{Z}$，使得 $1 \otimes a \leftrightarrow a \leftrightarrow a \otimes 1$。

**交换性**：
- 对于[[向量空间]]，$V \otimes W \cong W \otimes V$（典范同构）。
- 对于 Abel 群，同样有 $A \otimes B \cong B \otimes A$，$a \otimes b \leftrightarrow b \otimes a$。
- 但作为[[张量]]的具体元素，**张量积顺序的交换一般会改变[[张量]]本身**：两个向量（或两个对偶向量）的张量积交换顺序后一般成为另一个[[张量]]，即 $v \otimes u \neq u \otimes v$, $\omega \otimes \mu \neq \mu \otimes \omega$。欧氏空间的并矢 $\bar{v}\bar{u}$ 就是一个例子。
- 特殊地，向量与对偶向量的张量积满足 $v \otimes \omega = \omega \otimes v$（在典范等同 $V \cong V^{**}$ 下）。

**直和性质**：存在自然同构
$$
\left( \bigoplus_i A_i \right) \otimes B \cong \bigoplus_i (A_i \otimes B), \quad
A \otimes \left( \bigoplus_j B_j \right) \cong \bigoplus_j (A \otimes B_j).
$$

**函子性质**：$\text{id}_A \otimes \text{id}_B = \text{id}_{A \otimes B}$，且 $(f \otimes g) \circ (f' \otimes g') = (f \circ f') \otimes (g \circ g')$。

---

## 张量积与缩并

张量积的作用是将低阶[[张量]]相乘得到高阶[[张量]]；而缩并（contraction）则将 $(r,s)$ 型[[张量]]变为 $(r-1,s-1)$ 型[[张量]]。

设 $\tau \in V_s^r$（$r,s \ge 1$），取基底 $\{e_i\}$ 和对偶基底 $\{e^j\}$，定义缩并
$$
\sigma(\alpha^1,\dots,\alpha^{r-1}, v_1,\dots,v_{s-1}) = \tau(e^i, \alpha^1,\dots,\alpha^{r-1}, e_i, v_1,\dots,v_{s-1}),
$$
所得 $\sigma$ 是一个 $(r-1,s-1)$ 型[[张量]]，且与基底的选取无关。

联合使用张量积和缩并，可以从原有[[张量]]得到各种类型的新[[张量]]。例如，设 $\nu \in V$, $\omega \in V^*$，则 $\nu \otimes \omega$ 是 $(1,1)$ 型[[张量]]，其缩并 $C(\nu \otimes \omega)$ 是标量：
$$
C(\nu \otimes \omega) = \omega_\mu \nu^\mu = \omega(\nu) = \nu(\omega).
$$

---

## 应用

### 直接应用

**例 1：度规[[张量]]的表达式**
在广义相对论中，度规[[张量]] $g$ 可以写为
$$
g = g_{\mu\nu} \, dx^\mu \otimes dx^\nu,
$$
其中 $dx^\mu$ 是坐标对偶基，$g_{\mu\nu}$ 是度规分量。这表明线元 $ds^2$ 实际上就是度规[[张量]] $g$ 使用张量积记号的简写。

**例 2：并矢**
欧氏空间矢量场论中的并矢 $\bar{v}\bar{u}$ 其实就是矢量 $\bar{v}$ 和 $\bar{u}$ 的张量积，只不过略去了 $\otimes$ 号。

**例 3：线性映射的迹**
将线性映射 $\tau: V \to V$ 视为 $(1,1)$ 型[[张量]]，则
$$
\tau = \tau_i^j \, e_j \otimes e^i,
$$
其分量 $\tau_i^j$ 恰好是映射矩阵的元素，而缩并 $\tau_i^i$ 就是矩阵的迹，与基底的选取无关。

### 间接应用

- **同调论中的 Künneth 公式**：自由链复形的张量积的同调群 $H_*(C \otimes D)$ 完全由 $H_*(C)$ 和 $H_*(D)$ 决定，这是计算乘积空间同调群的基本工具。
- **广义相对论中的能量-动量[[张量]]**：描述物质能量分布的 $(0,2)$ 型对称[[张量]] $T$，与里奇[[张量]]通过爱因斯坦场方程 $R_{\mu\nu} - \frac{1}{2}R g_{\mu\nu} = 8\pi T_{\mu\nu}$ 相联系。
- **黎曼曲率[[张量]]**：作为一个 $(1,3)$ 型[[张量]]，黎曼曲率[[张量]] $R$ 的定义和运算处处依赖于张量积结构。
- **量子力学中的张量积**：多粒子系统的态空间是各单粒子态空间的张量积，纠缠态就是不可分解的[[张量]]（即不能写成单个 $v \otimes w$ 的形式）。

---

## 推广

- **模的张量积**：将基域从域 $\mathbb{R}$ 推广到环 $R$，可定义环上模的张量积 $M \otimes_R N$。当环非交换时，张量积的定义更加精细，需要考虑左右模结构。
- **导出张量积**：由于张量积函子 $-\otimes G$ 是右正合而非正合的，其左导出函子 $\text{Tor}$ 给出了衡量其破坏正合性的方式，在同调代数中有核心地位。
- **内张量积**：在 Topos 理论中，可以在赋环 topos 上定义内张量积（internal tensor product），将张量积的概念进一步泛化。
- **链复形的张量积**：两个链复形的张量积通过交错符号 $(-1)^p$ 定义边缘算子 $\partial(c_p \otimes d_q) = (\partial_p c_p) \otimes d_q + (-1)^p c_p \otimes (\partial_q d_q)$，这保证了 $\partial^2 = 0$。
- **向量丛的张量积**：将各纤维的张量积拼起来得到[[流形]]上的新向量丛。

---

## 常见的误解

**误解 1：张量积就是 Cartesian 积。**
张量积 $V \otimes W$ 的维数是 $\dim V \cdot \dim W$，而 Cartesian 积 $V \times W$ 的维数是 $\dim V + \dim W$。两者是完全不同的构造。张量积本质上将双线性映射线性化，而 Cartesian 积只是将两个空间"并列"。

**误解 2：$v \otimes w = w \otimes v$。**
一般来说不成立。对于两个向量 $v,u \in V$，$v \otimes u \neq u \otimes v$。欧氏空间的并矢就不满足交换律。但向量与对偶向量的张量积 $v \otimes \omega = \omega \otimes v$（在自然同构 $V \cong V^{**}$ 下）是一个特例，不应过度推广。

**误解 3：张量积的元素都是 $v \otimes w$ 这种形式。**
实际上，$V \otimes W$ 中的一般元素是有限和 $\sum a_i \otimes b_i$ 的形式，写法通常不唯一。并非每个元素都能写成单个纯[[张量]] $v \otimes w$——这正对应了量子力学中可分态与纠缠态的区别。

**误解 4：张量积只对[[向量空间]]有意义。**
张量积的概念在 Abel 群、模、链复形、向量丛、代数乃至范畴中都有对应的版本，是一个普适的数学构造。

**误解 5：在抽象指标记号中，$\omega_a \mu_b$ 和 $\mu_b \omega_a$ 代表不同的[[张量]]。**
在抽象指标记号中，$\omega_a \mu_b$ 和 $\mu_b \omega_a$ 作用对象相同，实际上是同一个[[张量]]。张量积顺序的不可交换性体现在指标的位置上：$\omega_a \mu_b \neq \omega_b \mu_a$。

---

## 启发

- **"将多线性转化为线性"** 是数学中极为强大的思维范式。张量积的泛性质告诉我们，**所有关于双线性映射的问题本质上都是线性代数问题**，只是需要先把域"张量积"一下。类似的思想在泛代数中反复出现：自由构造模去关系。
  
- **符号系统的重要性**：张量积在不同语境下的多种表达（分量记号、抽象指标记号、无指标记号）各有优劣。学习张量积的过程会让人深刻体会到，选择一个好的符号系统对数学理解有多大的影响。

- **"乘积"不只有一种**：Cartesian 积、张量积、外积、对称积……同样叫"积"，结构截然不同。当遇到一个新的"积"时，首先要问的是：它满足什么泛性质？它能将什么样的问题"线性化"？

---

## 总结

### 思想

**"张量积是双线性映射的线性化"**——通过张量积，所有双线性问题都可以转化为线性问题来处理。更广泛地说，张量积提供了一种用低阶对象构造高阶对象的系统化代数框架。

### 方法

| 技术 | 在笔记中的位置 |
|------|----------------|
| 多重线性函数定义 | 规范的通用形式 |
| 自由构造模去关系 | 构造动机 / 降维表述 |
| 泛性质 | 等价表述 |
| 基展开与分量计算 | 等价表达 |
| 缩并运算 | 张量积与缩并 |
| Einstein 求和约定 | 等价表达中普遍使用 |

---

## 回看并提问

- 为什么向量与对偶向量的张量积 $v \otimes \omega$ 是可交换的，而两个向量的张量积却不可交换？背后的本质是什么？
- 张量积的泛性质与 Cartesian 积的泛性质（乘积范畴中的积）有什么联系与区别？
- 外积 $\wedge$ 和张量积 $\otimes$ 的关系是什么？为什么在定义外积时需要引入系数 $\frac{(r+s)!}{r!s!}$？
- 在链复形的张量积中，交错符号 $(-1)^p$ 的几何直观是什么？
- 在量子信息论中，不可分解的[[张量]] $\sum_i \alpha_i v_i \otimes w_i$（不能写为单个 $v \otimes w$）对应了纠缠态——这与张量积的数学结构有何内在联系？

---

## 参考文献

1. 梅加强. *[[流形]]与几何初步*. （知识库来源 id: pdf_2）
2. 陈维桓. *微分几何引论*. 2013. （知识库来源 id: pdf_3）
3. 姜伯驹. *同调论*. 2006. （知识库来源 id: pdf_4）
4. 梁灿彬, 周彬. *微分几何入门与广义相对论*（全三册）. （知识库来源 id: pdf_5）
5. 特里斯坦·尼达姆 (Tristan Needham). *可视化微分几何和形式：一部五幕数学正剧*. 2024. （知识库来源 id: pdf_6）
6. 陈维桓. *微分几何*. 2017. （知识库来源 id: pdf_7）
7. 黎景辉. *Topos 理论*（现代数学基础 97）. （知识库来源 id: pdf_8）