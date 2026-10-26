# 梁灿彬《微分几何入门与广义相对论》上册：大师模式节点（待审稿）

- 依据：`data/cases/liang.mjs` 的 60 个登记节点与 `data/cases/07-liang-dg.md` 的凝练笔记；[科学出版社商品页](https://www.ecsponline.com/goods.php?id=74095) 的目录确认上册共 10 章（前 5 章微分几何，第 6 章狭义相对论，第 7–10 章广义相对论）。
- 正式数据：`data/master-content.mjs` 的 `MASTER_OVERRIDES`（`liang:*` 共 60 条），`MASTER_CONTENT_VERSION = master-reading/1.20261020`。
- 证据：`DEF` 为定义或约定；`PROOF` 表示教材有论证（本站未重放）；`REF` 表示公设或引用。未逐页核对教材原文，未新增定理。
- 范围：57 个里程碑 + 3 个方法。`liang:compactness` 在网站按重复登记规则折叠到 `top:compactness`；5 个作为既有节点的登记变体显示。
- 本文件是阅读稿，不是导入协议；以代码登记为准。

## 拓扑空间（liang:topological-space）[DEF/registered]

**一句直觉** 用开集记录「哪些点挨着」，把距离的数值全部丢掉。

**背景与约定**
- $(X,\mathcal T)$，$\mathcal T\subseteq\mathcal P(X)$；不预设分离性。
- 子集取子空间拓扑时另行声明；$X$ 与 $\varnothing$ 都算开集。

**精确内容**
$$
\varnothing,X\in\mathcal T;\qquad U,V\in\mathcal T\Rightarrow U\cap V\in\mathcal T;\qquad \{U_\alpha\}_{\alpha\in A}\subseteq\mathcal T\Rightarrow\bigcup_{\alpha\in A}U_\alpha\in\mathcal T
$$

$$
F\subseteq X\ \text{closed}\iff X\setminus F\in\mathcal T
$$

**依据与边界**
- 公理不含 Hausdorff；去掉它极限可以不唯一。本稿只压缩定义，未逐页核对教材原文。

## 连续映射与同胚（liang:continuous-map）[DEF/registered]

**一句直觉** 连续就是开集的原像仍然开，与距离无关。

**背景与约定**
- $f:X\to Y$，$(X,\mathcal T_X)$ 与 $(Y,\mathcal T_Y)$ 为拓扑空间。
- 同胚要求 $f$ 为双射且 $f^{-1}$ 连续。

**精确内容**
$$
f\ \text{continuous}\iff\forall V\in\mathcal T_Y:\ f^{-1}(V)\in\mathcal T_X
$$

$$
f\ \text{homeomorphism}\iff f\ \text{bijective},\quad f,f^{-1}\ \text{continuous}
$$

**依据与边界**
- 同胚保持拓扑性质，不保持长度与曲率；本稿只压缩拓扑层面的定义。

## 紧致性（liang:compactness）[DEF/registered]

**一句直觉** 任何开覆盖都能抽出有限个成员仍然覆盖。

**背景与约定**
- $X$ 为拓扑空间；$K\subseteq X$ 取子空间拓扑。
- 开覆盖由 $X$ 的开集组成；有限子覆盖取有限个成员。

**精确内容**
$$
X\ \text{compact}\iff\forall\{U_\alpha\}_{\alpha\in A}\subseteq\mathcal T:\ X=\bigcup_{\alpha\in A}U_\alpha\Rightarrow\exists\alpha_1,\dots,\alpha_n:\ X=\bigcup_{i=1}^nU_{\alpha_i}
$$

$$
K\ \text{compact}\iff\forall\{U_\alpha\}\subseteq\mathcal T:\ K\subseteq\bigcup_{\alpha}U_\alpha\Rightarrow\exists\alpha_1,\dots,\alpha_n:\ K\subseteq\bigcup_{i=1}^nU_{\alpha_i}
$$

**依据与边界**
- 紧致不蕴含序列紧，后者还需第一可数；「有界闭」只在 $\mathbb R^n$ 中与紧致等价。教材本节标为选读。

## 微分流形（liang:manifold）[DEF/registered]

**一句直觉** 每点附近用 $\mathbb R^n$ 的开集作坐标，重叠处光滑换图。

**背景与约定**
- $M$ 为 Hausdorff、第二可数的拓扑空间；$n\in\mathbb N$。
- 图册 $\{(U_\alpha,\varphi_\alpha)\}$ 覆盖 $M$，$\varphi_\alpha:U_\alpha\to\varphi_\alpha(U_\alpha)\subseteq_{\mathrm{open}}\mathbb R^n$ 为同胚。
- 所有非空重叠上的坐标变换为 $C^\infty$，并取极大图册。

**精确内容**
$$
\varphi_\beta\circ\varphi_\alpha^{-1}:\varphi_\alpha(U_\alpha\cap U_\beta)\to\varphi_\beta(U_\alpha\cap U_\beta)\quad C^\infty
$$

$$
\forall p\in M\ \exists U\ni p:\quad \varphi:U\xrightarrow{\cong}V\subseteq_{\mathrm{open}}\mathbb R^n
$$

**依据与边界**
- 不展开第二可数性在单位分解中的用途，也不分类同一拓扑流形上的不同光滑结构。

## 切矢量（liang:tangent-vector）[DEF/registered]

**一句直觉** 一点处的切矢量由过该点的曲线的一阶行为决定。

**背景与约定**
- $p\in M$，$M$ 为 $C^\infty$ 流形；$\gamma:(-\varepsilon,\varepsilon)\to M$ 光滑且 $\gamma(0)=p$。
- 坐标卡 $(U,\varphi)$ 含 $p$；等价性不依赖坐标卡的选取。

**精确内容**
$$
\gamma_1\sim\gamma_2\iff(\varphi\circ\gamma_1)'(0)=(\varphi\circ\gamma_2)'(0)
$$

$$
T_pM=\{[\gamma]\},\qquad \dim T_pM=n
$$

$$
v(f)=\left.\frac{d}{dt}\right|_{0}(f\circ\gamma)
$$

**依据与边界**
- 等价类定义依赖 $C^\infty$ 结构；曲线的整体信息不进入 $T_pM$，只保留一阶行为。

## 矢量场（liang:vector-field）[DEF/registered]

**一句直觉** 每点光滑地指定一个切矢量。

**背景与约定**
- $M$ 为光滑流形；$\pi:TM\to M$ 为切丛。
- 坐标卡 $(U,(x^\mu))$；光滑性需对覆盖的每一张卡验证。

**精确内容**
$$
v:M\to TM,\qquad \pi\circ v=\mathrm{id}_M
$$

$$
v=v^\mu(x)\frac{\partial}{\partial x^\mu},\qquad v^\mu\in C^\infty(U)
$$

**依据与边界**
- 只压缩光滑截面定义；积分曲线与流的存在唯一性另见教材。

## 对偶矢量场（liang:dual-vector-field）[DEF/registered]

**一句直觉** 每点给出一台把切矢量变成数的线性机器。

**背景与约定**
- $T_p^*M=(T_pM)^*$；$\omega:M\to T^*M$ 为截面，$\omega_p$ 在每点线性。
- $f\in C^\infty(M)$；$df$ 由对切矢量的作用定义。

**精确内容**
$$
\omega_p:T_pM\to\mathbb R\ \text{linear},\qquad \omega=\omega_\mu dx^\mu
$$

$$
df(v)=v(f)
$$

**依据与边界**
- 没有度规时 $T_pM$ 与 $T_p^*M$ 不作自然等同；本稿不引入这种识别。

## 张量场与缩并（liang:tensor-field）[DEF/registered]

**一句直觉** 每点接收若干矢量与对偶矢量、对每个变量线性的对象。

**背景与约定**
- $T$ 为 $M$ 上的 $(k,l)$ 型张量场：每点接收 $k$ 个对偶矢量与 $l$ 个矢量。
- 分量在每张坐标卡下为 $C^\infty$；缩并每次配对一个上指标与一个下指标。

**精确内容**
$$
T|_p:\underbrace{T_p^*M\times\cdots\times T_p^*M}_{k}\times\underbrace{T_pM\times\cdots\times T_pM}_{l}\to\mathbb R
$$

$$
T=T^{\mu_1\cdots\mu_k}{}_{\nu_1\cdots\nu_l}\frac{\partial}{\partial x^{\mu_1}}\otimes\cdots\otimes\frac{\partial}{\partial x^{\mu_k}}\otimes dx^{\nu_1}\otimes\cdots\otimes dx^{\nu_l}
$$

$$
(CT)^{\mu_1\cdots\mu_{k-1}}{}_{\nu_1\cdots\nu_{l-1}}=T^{\mu_1\cdots\mu_{k-1}\rho}{}_{\nu_1\cdots\nu_{l-1}\rho}
$$

**依据与边界**
- 缩并必须一上一下配对；「按张量变换律变化」是判据而不是定义。

## 度规张量场（liang:metric-tensor）[DEF/registered]

**一句直觉** 给每点切空间一个对称非退化双线性型，用来量长度与角度。

**背景与约定**
- $g$ 为 $M$ 上对称、非退化的 $(0,2)$ 型光滑张量场；号差按 $(-,+,+,+)$。
- $\det(g_{\mu\nu})\neq0$；黎曼正定情形是特例。
- $g$ 与逆 $g^{-1}$ 用于升降指标；线元 $ds^2=g_{\mu\nu}dx^\mu dx^\nu$。

**精确内容**
$$
g=g_{ab}dx^a\otimes dx^b,\qquad g_{ab}=g_{ba},\qquad \det(g_{ab})\neq0
$$

$$
ds^2=g_{\mu\nu}dx^\mu dx^\nu
$$

$$
g^{ab}g_{bc}=\delta^a{}_c
$$

**依据与边界**
- 洛伦兹度规不给出正长度，类时间隔平方为负；本稿不把黎曼正定直觉套到洛伦兹情形。

## 抽象指标记号（liang:abstract-index）[DEF/registered]

**一句直觉** 把张量类型写在指标上，让不合法写法写不出来。

**背景与约定**
- 抽象指标 $a,b,c,\dots$ 标记类型与缩并配对，不取任何坐标基。
- 重复指标一上一下表示求和；自由指标在等式两边上下一一配平。

**精确内容**
$$
T^a{}_b,\qquad \nabla_a\omega_b,\qquad R^a{}_{bcd}
$$

$$
T^a{}_a=\text{contraction},\qquad g^{ab}g_{bc}=\delta^a{}_c
$$

$$
T^a{}_b=S_aV^b\ \text{(illegal: free indices differ in type)}
$$

**依据与边界**
- 配平只检查记号合法性，不证明等式成立；指标合法而命题为假的等式照样存在。

## 导数算符（liang:derivative-operator）[DEF/registered]

**一句直觉** 补上「把邻近点的张量放进同一空间比较」的结构。

**背景与约定**
- $\nabla$ 把 $(k,l)$ 型张量场映为 $(k,l+1)$ 型张量场。
- $\nabla$ 是额外结构：一般流形上没有自然的导数算符；无挠条件另行声明。

**精确内容**
$$
\nabla_a(fT)=(\nabla_af)T+f\nabla_aT,\qquad \nabla_af=df
$$

$$
\nabla_a(T\otimes S)=(\nabla_aT)\otimes S+T\otimes\nabla_aS
$$

$$
\nabla_a\delta^b{}_c=0
$$

**依据与边界**
- 「与缩并交换」不可删；去掉它会得到只在特定坐标下才像导数的伪算子。

## 与度规适配的导数算符与克氏符（liang:christoffel）[DEF/registered]

**一句直觉** 无挠且与度规适配的联络被度规唯一确定。

**背景与约定**
- $(M,g)$ 为伪黎曼流形；$\nabla$ 无挠且与 $g$ 适配：$\nabla_ag_{bc}=0$、$T^c{}_{ab}=0$。
- 坐标卡 $(x^\mu)$；$\Gamma^\mu{}_{\nu\sigma}$ 为该卡下的联络分量。

**精确内容**
$$
\exists!\,\nabla:\quad \nabla_ag_{bc}=0,\qquad T^c{}_{ab}=2\Gamma^c{}_{[ab]}=0
$$

$$
\Gamma^\mu{}_{\nu\sigma}=\frac12g^{\mu\rho}\left(\partial_\nu g_{\rho\sigma}+\partial_\sigma g_{\rho\nu}-\partial_\rho g_{\nu\sigma}\right)
$$

$$
\Gamma^{\mu'}{}_{\nu'\sigma'}=\frac{\partial x^{\mu'}}{\partial x^\mu}\frac{\partial x^\nu}{\partial x^{\nu'}}\frac{\partial x^\sigma}{\partial x^{\sigma'}}\Gamma^\mu{}_{\nu\sigma}+\frac{\partial^2x^\mu}{\partial x^{\nu'}\partial x^{\sigma'}}\frac{\partial x^{\mu'}}{\partial x^\mu}
$$

**依据与边界**
- 唯一性同时用到适配与无挠；只要求适配会得到无穷多个联络。克氏符不是张量，它在某点为 $0$ 不是坐标无关陈述。

## 沿曲线的平移（liang:parallel-transport）[DEF/registered]

**一句直觉** 沿曲线搬运矢量，并要求搬运过程中协变导数为零。

**背景与约定**
- $\gamma:I\to M$ 为光滑曲线，切矢量 $t^a$；$v^a$ 为沿 $\gamma$ 的矢量场；$\lambda$ 为曲线参数。
- $\nabla$ 为给定联络；平移沿整条曲线定义。

**精确内容**
$$
t^a\nabla_av^b=0
$$

$$
\frac{Dv^b}{d\lambda}=\frac{dv^b}{d\lambda}+\Gamma^b{}_{ac}t^av^c
$$

**依据与边界**
- 平移依赖曲线：沿不同曲线把同一矢量搬到同一点，结果可以不同——这正是曲率的来源。

## 测地线（liang:geodesic）[DEF/registered]

**一句直觉** 切矢量沿自身平移，所以曲线不转弯。

**背景与约定**
- $\gamma$ 为类时、类光或类空曲线；$\lambda$ 为仿射参数。
- $\nabla$ 为给定联络；类光情形不能用 $u^au_a=-1$ 归一化。

**精确内容**
$$
t^a\nabla_at^b=0
$$

$$
\frac{d^2x^\mu}{d\lambda^2}+\Gamma^\mu{}_{\nu\sigma}\frac{dx^\nu}{d\lambda}\frac{dx^\sigma}{d\lambda}=0
$$

$$
\lambda\mapsto a\lambda+b\qquad(a\neq0)
$$

**依据与边界**
- 测地线只给局部极值，不是整体最短曲线；仿射参数之外会多出一项。

## 黎曼曲率张量（liang:riemann-tensor）[DEF/registered]

**一句直觉** 曲率度量沿不同路径平移一圈后的差异。

**背景与约定**
- $(M,g,\nabla)$，$g$ 非退化，$\nabla$ 无挠且与 $g$ 适配；$\omega_c$ 为任意对偶矢量场。
- 符号约定按教材：$(\nabla_a\nabla_b-\nabla_b\nabla_a)\omega_c=R^d{}_{cab}\omega_d$。

**精确内容**
$$
(\nabla_a\nabla_b-\nabla_b\nabla_a)\omega_c=R^d{}_{cab}\omega_d
$$

$$
R^\rho{}_{\sigma\mu\nu}=\partial_\mu\Gamma^\rho{}_{\nu\sigma}-\partial_\nu\Gamma^\rho{}_{\mu\sigma}+\Gamma^\rho{}_{\mu\lambda}\Gamma^\lambda{}_{\nu\sigma}-\Gamma^\rho{}_{\nu\lambda}\Gamma^\lambda{}_{\mu\sigma}
$$

$$
R^a{}_{bcd}=-R^a{}_{bdc},\qquad R_{abcd}=-R_{bacd},\qquad R_{abcd}=R_{cdab}
$$

**依据与边界**
- 曲率是 $\nabla$ 的性质，不是流形的性质；反对称性与 Bianchi 恒等式用到无挠。符号约定不同教材可能差一个号。

## 里奇张量、标量曲率与爱因斯坦张量（liang:ricci-einstein）[DEF/registered]

**一句直觉** 把黎曼张量缩并成体积变化的部分。

**背景与约定**
- $R^a{}_{bcd}$ 为黎曼张量；$g$ 非退化；缩并约定 $R_{ac}=R^b{}_{abc}$。
- $G_{ab}$ 的定义不依赖场方程；$\nabla^aG_{ab}=0$ 是几何恒等式。

**精确内容**
$$
R_{ac}=R^b{}_{abc},\qquad R=g^{ab}R_{ab}
$$

$$
G_{ab}=R_{ab}-\frac12Rg_{ab}
$$

$$
\nabla^aG_{ab}=0
$$

**依据与边界**
- 里奇张量丢掉 Weyl 部分，$R_{ab}=0$ 的真空区仍可弯曲；本稿不展开 Weyl 张量。

## 内禀曲率与外曲率（liang:intrinsic-extrinsic-curvature）[DEF/registered]

**一句直觉** 内禀曲率由诱导度规自己算出，外曲率记录嵌入方式。

**背景与约定**
- $S$ 为 $(M,g)$ 的子流形，余维 $1$；$h_{ab}$ 为诱导度规，$n^a$ 为法矢量；$\nabla$ 与 $g$ 适配。
- $n^cn_c\neq0$（类空或类时法矢量）；外曲率 $K_{ab}$ 由嵌入方式给出。

**精确内容**
$$
h_{ab}=g_{ab}-\frac{n_an_b}{n^cn_c}
$$

$$
K_{ab}=h_a{}^ch_b{}^d\nabla_cn_d
$$

**依据与边界**
- 外曲率不是内禀量：同一内禀几何可以有不同嵌入。柱面内禀平坦而外曲率非零；符号约定随法矢量定向。

## 流形间的映射、推前与拉回（liang:pushforward-pullback）[DEF/registered]

**一句直觉** 矢量沿映射正向推，对偶矢量沿反向拉。

**背景与约定**
- $\varphi:M\to N$ 光滑；$p\in M$，$v\in T_pM$，$\omega\in T^*_{\varphi(p)}N$。
- 推前把切矢量正向送出；拉回把对偶矢量反向送回。

**精确内容**
$$
(\varphi_*v)(f)=v(f\circ\varphi)
$$

$$
(\varphi^*\omega)(v)=\omega(\varphi_*v)
$$

$$
(\varphi^*\omega)_p=\omega_{\varphi(p)}\circ\varphi_{*,p}
$$

**依据与边界**
- 推前矢量场需要 $\varphi$ 为微分同胚；拉回对任意光滑映射有定义。

## 李导数（liang:lie-derivative）[DEF/registered]

**一句直觉** 沿矢量场的流拖动张量，再对时间求导。

**背景与约定**
- $v$ 为 $M$ 上光滑矢量场，$\varphi_t$ 为其流；$T$ 为任意张量场。
- 李导数不需要联络或度规。

**精确内容**
$$
\mathcal L_vT=\left.\frac{d}{dt}\right|_{0}\varphi_{-t}^*T
$$

$$
\mathcal L_vw=[v,w]=v^b\partial_bw^a-w^b\partial_bv^a
$$

$$
\mathcal L_v(f)=v(f)
$$

**依据与边界**
- 李导数与协变导数不同：$\nabla$ 逐点比较，$\mathcal L$ 沿流比较；对矢量场它恰是李括号。

## Killing 矢量场（liang:killing-field）[DEF/registered]

**一句直觉** 沿 $\xi$ 挪动时度规不变。

**背景与约定**
- $(M,g)$，$\xi$ 为光滑矢量场；$\nabla$ 为与 $g$ 适配的 Levi-Civita 联络。
- $n=\dim M$；$\xi$ 的积分曲线给出局部单参数等距群，整体性需额外假设。

**精确内容**
$$
\mathcal L_\xi g_{ab}=0
$$

$$
\nabla_a\xi_b+\nabla_b\xi_a=0
$$

$$
\dim\{Killing fields\}\le\frac{n(n+1)}2
$$

**等价表达**
- $\mathcal L_\xi g=0\iff\nabla_a\xi_b+\nabla_b\xi_a=0$（条件：$\nabla$ 与 $g$ 适配（$\nabla g=0$））

**依据与边界**
- 写成 Killing 方程需要先取与度规适配的联络；定义本身是 $\mathcal L_\xi g=0$。达到 $n(n+1)/2$ 上界的分类未展开。

## 超曲面与法矢量（liang:hypersurface）[DEF/registered]

**一句直觉** 用等值面的法余矢量把母流形结构诱导到余维 $1$ 子流形上。

**背景与约定**
- $S\subset M$ 余维 $1$，局部由 $S=\{f=\mathrm{const}\}$、$df\neq0$ 给出。
- $n_a=\nabla_af$；$S$ 类空或类时，$n^an_a\neq0$；$\nabla$ 与 $g$ 适配。

**精确内容**
$$
n_a=\nabla_af,\qquad n^an_a\neq0
$$

$$
h_{ab}=g_{ab}-\frac{n_an_b}{n^cn_c}
$$

$$
K_{ab}=h_a{}^ch_b{}^d\nabla_cn_d
$$

**依据与边界**
- 零超曲面（如事件视界）不能归一化，诱导度规退化；$f=\mathrm{const}$ 只是局部刻画。

## 微分形式与外积（liang:differential-form）[DEF/registered]

**一句直觉** 全反称的多重线性对象天然携带定向符号。

**背景与约定**
- $M$ 为光滑 $n$ 维流形；$\Omega^p(M)$ 为全反称 $(0,p)$ 型张量场。
- $\omega\in\Omega^p(M)$，$\eta\in\Omega^q(M)$；外积双线性且分次交换。

**精确内容**
$$
\omega\wedge\eta=(-1)^{pq}\eta\wedge\omega
$$

$$
(\omega\wedge\eta)_{a_1\cdots a_{p+q}}=\frac{(p+q)!}{p!q!}\omega_{[a_1\cdots a_p}\eta_{a_{p+1}\cdots a_{p+q}]}
$$

$$
\Omega^p(M)=\{0\}\qquad(p>n)
$$

**依据与边界**
- 只压缩代数定义；外积结合律与分次 Leibniz 律未逐条列出。

## 外微分与闭形式（liang:exterior-derivative）[DEF/registered]

**一句直觉** 与坐标无关、且把边界代数化的导数。

**背景与约定**
- $d:\Omega^p(M)\to\Omega^{p+1}(M)$；$M$ 光滑。
- $d$ 不依赖联络或度规；闭形式与恰当形式在每点逐次定义。

**精确内容**
$$
df(v)=v(f)
$$

$$
d(\omega\wedge\eta)=d\omega\wedge\eta+(-1)^p\omega\wedge d\eta
$$

$$
d^2=0
$$

**等价表达**
- 在可缩区域上，$d\omega=0$ 当且仅当存在 $\eta$ 使 $\omega=d\eta$。（条件：区域可缩；$\omega$ 光滑）

**依据与边界**
- 「恰当 $\Rightarrow$ 闭」恒成立；「闭 $\Rightarrow$ 恰当」只对可缩区域成立，一般由 de Rham 上同调度量障碍。本稿不展开上同调。

## 体元与流形上的积分（liang:volume-element）[DEF/registered]

**一句直觉** 选一个处处非零的 $n$ 次形式，规定每小块的有向体积。

**背景与约定**
- $M$ 为可定向 $n$ 维流形；$\varepsilon$ 为处处非零的 $n$ 次形式。
- 有度规时按定向取 $\varepsilon=\sqrt{|\det g|}\,dx^1\wedge\cdots\wedge dx^n$；积分按该体元定义。

**精确内容**
$$
\varepsilon\in\Omega^n(M),\qquad \varepsilon|_p\neq0\ \ \forall p\in M
$$

$$
\int_M f\,\varepsilon
$$

$$
\varepsilon=\sqrt{|\det g|}\,dx^1\wedge\cdots\wedge dx^n
$$

**依据与边界**
- 不可定向流形（如 Möbius 带）上没有整体非零的 $n$ 次形式；没有度规时体元不唯一，积分值随选择改变。

## Stokes 定理（liang:stokes-theorem）[PROOF/registered]

**一句直觉** 内部的 $d$ 积分等于边界上的值。

**背景与约定**
- $M$ 为带边可定向 $n$ 维流形；$\omega\in\Omega^{n-1}(M)$ 具紧支集。
- $\partial M$ 取诱导定向；$M$ 紧致时紧支集条件自动满足。

**精确内容**
$$
\int_Md\omega=\int_{\partial M}\omega
$$

**依据与边界**
- 需要定向与紧支集（或 $M$ 紧致）；否则两边都可能不收敛。经典公式是其特例，本稿不逐一展开。

## Gauss 定理与对偶微分形式（liang:gauss-theorem）[PROOF/registered]

**一句直觉** Hodge 对偶把 $p$ 次形式翻译成 $(n-p)$ 次形式，Gauss 定理是 Stokes 的对偶版本。

**背景与约定**
- $(M,g)$ 为可定向 $n$ 维流形；$*$ 为 Hodge 对偶，号差为 $s$。
- $p$ 次形式与外积按定向定义；$s=\pm1$。

**精确内容**
$$
*:\Omega^p(M)\to\Omega^{n-p}(M)
$$

$$
*(dx^{i_1}\wedge\cdots\wedge dx^{i_p})=\frac{\sqrt{|g|}}{(n-p)!}\varepsilon_{i_1\cdots i_p j_1\cdots j_{n-p}}dx^{j_1}\wedge\cdots\wedge dx^{j_{n-p}}
$$

$$
*(*\omega)=(-1)^{p(n-p)}s\,\omega
$$

**依据与边界**
- 对偶依赖度规与定向；没有度规时只能说存在把 $p$ 次形式配成 $(n-p)$ 次形式的同构。号差符号最易漏。

## 闵氏时空（liang:minkowski-spacetime）[DEF/registered]

**一句直觉** 把时间与空间放进同一个度规，号差把一个方向单独分出来。

**背景与约定**
- $M\cong\mathbb R^4$；$\eta_{ab}=\mathrm{diag}(-1,1,1,1)$，号差 $(-,+,+,+)$；$c=1$。
- $\Delta x^a$ 为两事件的坐标差；惯性系之间的坐标变换为 Poincaré 变换。

**精确内容**
$$
\eta_{ab}=\mathrm{diag}(-1,1,1,1)
$$

$$
\eta_{ab}\Delta x^a\Delta x^b\begin{cases}<0&\text{timelike}\\=0&\text{null}\\>0&\text{spacelike}\end{cases}
$$

$$
\eta^{ab}=(\eta^{-1})^{ab},\qquad \eta^{ab}\eta_{bc}=\delta^a{}_c
$$

**依据与边界**
- 洛伦兹度规不给出正长度，类时间隔平方为负；惯性系之间只允许 Poincaré 变换，不是任意坐标变换。

## 惯性观者与惯性系（liang:inertial-observer）[DEF/registered]

**一句直觉** 惯性观者的世界线是类时测地线。

**背景与约定**
- $\gamma$ 为类时曲线，$u^a=dx^a/d\tau$，$u^au_a=-1$；$\nabla$ 为 Levi-Civita 联络。
- 惯性系是整体概念，只在平坦时空中存在。

**精确内容**
$$
u^a=\frac{dx^a}{d\tau},\qquad u^au_a=-1
$$

$$
u^b\nabla_bu^a=0
$$

**依据与边界**
- 弯曲时空中一般只有局部惯性系；「观者」是世界线，不一定是人。

## 固有时与坐标时（liang:proper-time）[DEF/registered]

**一句直觉** 固有时是观者自带钟沿世界线积出的读数。

**背景与约定**
- 世界线 $\Gamma$ 类时；$\tau$ 沿世界线；$t$ 为惯性系坐标时；$c=1$。
- $v$ 为观者相对惯性系的速度；$\gamma=(1-v^2)^{-1/2}$。

**精确内容**
$$
d\tau=\sqrt{-\eta_{ab}dx^adx^b}
$$

$$
d\tau=\frac{dt}{\gamma},\qquad \gamma=\frac1{\sqrt{1-v^2}}
$$

**依据与边界**
- 固有时是世界线不变量，坐标时依赖参考系；类光曲线满足 $d\tau=0$，光子没有固有时。

## 尺缩、钟慢与孪子效应（liang:kinematic-effects）[DEF/registered]

**一句直觉** 同时性依赖参考系，长度与时间间隔的测量随之改变。

**背景与约定**
- 闵氏时空；$v$ 为相对速度；$L_0$ 为固有长度；$\gamma=(1-v^2)^{-1/2}$；$c=1$。
- 长度测量依赖同时性约定；$\Delta\tau$ 为两条世界线的固有时之差。

**精确内容**
$$
L=\frac{L_0}{\gamma}
$$

$$
d\tau=\frac{dt}{\gamma}
$$

$$
\Delta\tau=\int_{\Gamma_1}d\tau-\int_{\Gamma_2}d\tau
$$

**依据与边界**
- 尺缩是测量结果而非物体被压缩；孪子效应中两条世界线地位不对称，其中一条经历加速。

## 4 维速度、4 维动量与质点动力学（liang:four-momentum）[DEF/registered]

**一句直觉** 把质量乘速度提升为 4 维矢量，静质量是其模长。

**背景与约定**
- $m>0$；$u^a$ 为 4 速；$p^a=mu^a$；$c=1$。
- $\nabla$ 为 Levi-Civita 联络；$f^a$ 为 4 维力。

**精确内容**
$$
p^a=mu^a,\qquad p^ap_a=-m^2
$$

$$
f^a=u^b\nabla_bp^a,\qquad f^au_a=0
$$

**依据与边界**
- $m=0$ 的粒子不能写成 $p^a=mu^a$；时间分量与能量的对应依赖参考系。

## 能动张量与理想流体（liang:energy-momentum-tensor）[DEF/registered]

**一句直觉** 每点每方向记录能量与动量的流动。

**背景与约定**
- $T_{ab}$ 为对称 $(0,2)$ 张量场；$\nabla$ 与 $g$ 适配。
- 理想流体：无粘滞、无热流；$\rho$ 为能量密度，$p$ 为压强，$u^a$ 为 4 速。

**精确内容**
$$
T_{ab}=T_{ba},\qquad \nabla^aT_{ab}=0
$$

$$
T_{ab}=(\rho+p)u_au_b+pg_{ab}
$$

**依据与边界**
- 守恒是协变守恒，一般不能写成坐标散度为零；理想流体假设去掉后要加粘滞与热流项。

## 电磁场张量与麦克斯韦方程（liang:electromagnetic-tensor）[DEF/registered]

**一句直觉** 电场与磁场是同一个反对称张量在不同惯性系下的分量。

**背景与约定**
- $F_{ab}$ 反对称；$A_a$ 为 4 势；$J^a$ 为电流；高斯单位制。
- $\nabla$ 与 $g$ 适配；$F_{ab}=\nabla_aA_b-\nabla_bA_a$。

**精确内容**
$$
F_{ab}=\nabla_aA_b-\nabla_bA_a=-F_{ba}
$$

$$
\nabla^aF_{ab}=-4\pi J_b,\qquad \nabla_{[a}F_{bc]}=0
$$

$$
\nabla^aJ_a=0
$$

**依据与边界**
- $\nabla_{[a}F_{bc]}=0$ 等价于局部存在 $A$；整体存在性受拓扑阻碍。

## 电磁 4 势与光波多普勒效应（liang:four-potential）[DEF/registered]

**一句直觉** 用 4 势把麦氏方程化成二阶波动方程，规范变换不改变场。

**背景与约定**
- 闵氏时空；Lorenz 规范 $\nabla^aA_a=0$；规范变换 $A_a\to A_a+\nabla_a\chi$。
- $k^a$ 类光；$u^a$ 为观者 4 速；$c=1$。

**精确内容**
$$
\nabla^b\nabla_bA_a=-4\pi J_a
$$

$$
\omega=-k_au^a
$$

$$
A_a\to A_a+\nabla_a\chi,\qquad F_{ab}\ \text{unchanged}
$$

**依据与边界**
- Lorenz 规范不是物理条件；弯曲时空中频率沿光线的变化需由 $k^a\nabla_a\omega$ 讨论。

## 引力与时空几何（liang:gravity-as-geometry）[DEF/registered]

**一句直觉** 把引力归入时空几何，自由粒子沿测地线运动。

**背景与约定**
- 理论公设；$g_{ab}$ 为时空度规；自由粒子沿测地线。
- 不把引力当作力；等效原理只作局部陈述。

**精确内容**
$$
\nabla_uu^a=0\qquad(\text{free particle})
$$

$$
g_{ab}\ \text{encodes gravity}
$$

**依据与边界**
- 这是理论选择而非定理；等效原理不逻辑推出「引力就是曲率」。

## 等效原理与局部惯性系（liang:equivalence-principle）[DEF/registered]

**一句直觉** 在一点附近总能选到让引力「局部消失」的坐标。

**背景与约定**
- $p\in M$；黎曼法坐标；$g_{ab}(p)=\eta_{ab}$，$\Gamma^\mu{}_{\nu\sigma}(p)=0$。
- 局部陈述：只在一点及其邻域的特定阶成立。

**精确内容**
$$
g_{ab}(p)=\eta_{ab},\qquad \Gamma^\mu{}_{\nu\sigma}(p)=0
$$

$$
R^\mu{}_{\nu\rho\sigma}(p)\neq0\quad\text{in general}
$$

**依据与边界**
- 曲率不能由坐标变换消去；等效原理本身推不出场方程。

## 费米移动与无自转观者（liang:fermi-transport）[DEF/registered]

**一句直觉** 把平行移动推广到加速观者，使陀螺不产生人为自转。

**背景与约定**
- $\gamma$ 为任意类时世界线；$u^a$ 为 4 速；$a^a=u^b\nabla_bu^a$ 为 4 加速；$S^a$ 为自转矢量，$S^au_a=0$。
- $\nabla$ 与 $g$ 适配。

**精确内容**
$$
u^b\nabla_bS^a=(S^ba_b)u^a-(u^bS_b)a^a
$$

$$
a^a=0\Rightarrow u^b\nabla_bS^a=0
$$

**依据与边界**
- 费米移动只沿给定世界线定义；弯曲时空中「无自转」只能这样定义。

## 潮汐力与测地偏离方程（liang:tidal-deviation）[PROOF/registered]

**一句直觉** 相邻自由落体的相对加速度由黎曼张量给出。

**背景与约定**
- $\gamma$ 为类时测地线，$u^a$ 为切矢量；$\xi^a$ 为相邻测地线的分离矢量，$\xi^au_a=0$。
- $\nabla$ 与 $g$ 适配；$R^a{}_{cbd}$ 为黎曼张量。

**精确内容**
$$
u^b\nabla_b(u^c\nabla_c\xi^a)=-R^a{}_{cbd}u^cu^d\xi^b
$$

$$
\frac{D^2\xi^a}{d\tau^2}=-R^a{}_{cbd}u^cu^d\xi^b
$$

**依据与边界**
- 方程只给二阶演化，需初值；曲率不能由坐标变换消去。

## 爱因斯坦场方程（liang:einstein-equation）[REF/registered]

**一句直觉** 把时空曲率与物质能量按一个无散的张量方程联系起来。

**背景与约定**
- 几何单位制 $c=G=1$；$G_{ab}=R_{ab}-\frac12Rg_{ab}$；$\Lambda$ 为宇宙学常数；$T_{ab}$ 为能动张量。
- 场方程是理论公设；$\nabla^aG_{ab}=0$ 是几何恒等式。

**精确内容**
$$
G_{ab}+\Lambda g_{ab}=8\pi T_{ab}
$$

$$
\nabla^aG_{ab}=0,\qquad \nabla^aT_{ab}=0
$$

**依据与边界**
- 场方程是公设；$\Lambda$ 只能由观测确定；本站未复核任何观测拟合。

## 线性近似、牛顿极限与引力辐射（liang:linearized-gravity）[PROOF/registered]

**一句直觉** 弱场下把度规写成平背景加小扰动，波动解立刻出现。

**背景与约定**
- $g_{ab}=\eta_{ab}+h_{ab}$，$|h|\ll1$；谐和规范；$\bar h_{ab}=h_{ab}-\frac12\eta_{ab}h$；$c=G=1$。
- 牛顿极限另要求静态与低速。

**精确内容**
$$
\Box\bar h_{ab}=-16\pi T_{ab}
$$

$$
\nabla^2\Phi=4\pi\rho
$$

$$
\bar h_{ab}\ \text{propagates at }c
$$

**依据与边界**
- 线性近似只在 $|h|\ll1$ 时可用；强场必须解非线性方程；牛顿极限还需静态与低速。

## 稳态时空、静态时空与球对称时空（liang:static-stationary）[DEF/registered]

**一句直觉** 用 Killing 场把「不随时间变」与「不转动」写成几何条件。

**背景与约定**
- $(M,g)$ 有类时 Killing 场 $\xi^a$；$\nabla$ 与 $g$ 适配；$\xi^a$ 无旋条件 $\xi_{[a}\nabla_b\xi_{c]}=0$。
- 球对称要求存在 $SO(3)$ 等距作用，轨道为二维球面。

**精确内容**
$$
\mathcal L_\xi g_{ab}=0
$$

$$
\xi_{[a}\nabla_b\xi_{c]}=0
$$

$$
g_{ti}=0\qquad(\text{static coordinates})
$$

**依据与边界**
- Kerr 稳态但不静态；「看上去像球」不是球对称的定义。

## 施瓦西真空解（liang:schwarzschild-solution）[PROOF/registered]

**一句直觉** 真空球对称的静态解被一个质量参数完全确定。

**背景与约定**
- 真空、静态、球对称；$r>r_s$；$r_s=2GM$；$c=G=1$；号差 $(-,+,+,+)$。
- $d\Omega^2=d\theta^2+\sin^2\theta\,d\varphi^2$。

**精确内容**
$$
ds^2=-\left(1-\frac{r_s}{r}\right)dt^2+\left(1-\frac{r_s}{r}\right)^{-1}dr^2+r^2d\Omega^2
$$

$$
r_s=2GM
$$

$$
R_{ab}=0\qquad(r>r_s)
$$

**依据与边界**
- $r=r_s$ 处度规分量发散但曲率标量有限，是坐标奇点；解只在真空区成立，恒星内部需另接内部解。

## Birkhoff 定理（liang:birkhoff-theorem）[PROOF/registered]

**一句直觉** 球对称真空区必为施瓦西解，因此不会辐射引力波。

**背景与约定**
- 球对称真空区域；$T_{ab}=0$；$\Lambda=0$（按教材）。
- 在最大延拓的意义下讨论。

**精确内容**
$$
T_{ab}=0,\quad\text{spherical symmetry}\Rightarrow ds^2=ds^2_{\mathrm{Schwarzschild}}
$$

**依据与边界**
- 只对真空球对称区域成立；有物质时不适用；不排除球对称天体内部随时间演化。

## Reissner–Nordström 解（liang:reissner-nordstrom）[PROOF/registered]

**一句直觉** 电荷让球对称解多一个参数，并可能抹掉事件视界。

**背景与约定**
- 球对称带电真空；$Q$ 为电荷；$r_s=2GM$；高斯单位制；$c=G=1$。
- $F_{ab}$ 为电磁场张量；$d\Omega^2=d\theta^2+\sin^2\theta\,d\varphi^2$。

**精确内容**
$$
ds^2=-\left(1-\frac{r_s}{r}+\frac{Q^2}{r^2}\right)dt^2+\left(1-\frac{r_s}{r}+\frac{Q^2}{r^2}\right)^{-1}dr^2+r^2d\Omega^2
$$

$$
F_{ab}=\frac{Q}{r^2}(dt)_a\wedge(dr)_b
$$

**依据与边界**
- $|Q|$ 超临界时出现裸奇点；宇宙监督在已知解中不是自动成立。

## Newman–Penrose 形式与规范自由性（liang:np-formalism）[DEF/registered]

**一句直觉** 换一组零标架，把二阶场方程化成一阶方程，并让曲率的代数分类可见。

**背景与约定**
- 零标架 $\{l^a,n^a,m^a,\bar m^a\}$；$l^an_a=-1$，$m^a\bar m_a=1$，其余内积为零。
- $\Psi_0,\dots,\Psi_4$ 为 Weyl 张量的五个复分量。

**精确内容**
$$
l^an_a=-1,\qquad m^a\bar m_a=1
$$

$$
\Psi_0,\Psi_1,\Psi_2,\Psi_3,\Psi_4
$$

$$
\text{Petrov types: I, II, D, III, N, O}
$$

**依据与边界**
- NP 形式是等价改写，不增加物理内容；坐标条件只是规范选取。

## 施瓦西时空的测地线（liang:schwarzschild-geodesics）[DEF/registered]

**一句直觉** 两个 Killing 场把测地线降成一维有效势问题。

**背景与约定**
- 施瓦西度规；$\xi^a=(\partial_t)^a$，$\psi^a=(\partial_\varphi)^a$；$E=-\xi^au_a$，$L=\psi^au_a$；$\dot{}=\mathrm d/\mathrm d\lambda$。
- 类时 $\epsilon=1$，类光 $\epsilon=0$；$u^au_a=-\epsilon$；$\lambda$ 为仿射参数。

**精确内容**
$$
E=-\xi^au_a,\qquad L=\psi^au_a
$$

$$
\frac12\dot r^2+V_{\mathrm{eff}}(r)=\frac12E^2
$$

$$
V_{\mathrm{eff}}(r)=\frac12\left(1-\frac{r_s}{r}\right)\left(\frac{L^2}{r^2}+\epsilon\right)
$$

**依据与边界**
- 一般时空没有足够守恒量；类光情形不能按类时归一化。

## 广义相对论的经典实验验证（liang:classical-tests）[PROOF/registered]

**一句直觉** 施瓦西解给出红移、进动与光线偏折三个可测数字。

**背景与约定**
- 施瓦西弱场；$r\gg r_s$；$a$ 为半长轴，$e$ 为离心率，$b$ 为瞄准距离；$c=G=1$。
- $\Delta\varphi$ 为每圈附加进动；$\Delta\varphi_{\mathrm{light}}$ 为光线总偏折；后牛顿阶近似。

**精确内容**
$$
1+z=\left(1-\frac{r_s}{r}\right)^{-1/2}
$$

$$
\Delta\varphi=\frac{6\pi GM}{a(1-e^2)}
$$

$$
\Delta\varphi_{\mathrm{light}}=\frac{4GM}{b}
$$

**依据与边界**
- 均为弱场后牛顿阶结果；不适用于强场；本站未复核观测数据。

## 球对称恒星内部解与恒星演化（liang:stellar-interior）[PROOF/registered]

**一句直觉** 把球对称物质代进场方程，得到恒星内部的压强与质量分布。

**背景与约定**
- 球对称静态恒星；$p(r)$ 为压强，$\rho(r)$ 为能量密度，$m(r)$ 为质量函数；$G=c=1$。
- 表面 $r=R$ 处 $p(R)=0$，与外部施瓦西解衔接。

**精确内容**
$$
\frac{dp}{dr}=-\frac{(\rho+p)(m+4\pi r^3p)}{r(r-2m)}
$$

$$
\frac{dm}{dr}=4\pi r^2\rho
$$

$$
p(R)=0,\qquad m(R)=M
$$

**依据与边界**
- TOV 方程由 $\nabla^aT_{ab}=0$ 加球对称得到，不是独立方程；最大质量上限依赖物态方程。

## Kruskal 延拓与无限红移面（liang:kruskal-extension）[DEF/registered]

**一句直觉** 换坐标把 $r=r_s$ 处的坐标奇点抹平，露出最大延拓的整体结构。

**背景与约定**
- 施瓦西时空；Kruskal 坐标 $(U,V)$；最大延拓；$r>0$。
- $r=r_s$ 对应 $UV=0$；$r=0$ 为曲率奇点。

**精确内容**
$$
ds^2=-F(r)\,dUdV+r^2d\Omega^2,\qquad F(r)>0
$$

$$
UV=\left(\frac{r}{r_s}-1\right)e^{r/r_s}
$$

$$
r=r_s\iff UV=0
$$

**依据与边界**
- 延拓的唯一性需要「最大」条件；白洞区域的物理地位未定。

## 引力坍缩与施瓦西黑洞（liang:schwarzschild-black-hole）[PROOF/registered]

**一句直觉** 坍缩到视界以内后，连光都逃不出去。

**背景与约定**
- 球对称坍缩；$r_s=2GM$；事件视界按「能否逃到无穷远」定义；$c=G=1$。
- $\mathscr I^+$ 为未来类光无穷远。

**精确内容**
$$
\mathcal H=\left\{p\in M:\ \text{no future-directed causal curve from }p\text{ reaches }\mathscr I^+\right\}
$$

$$
r=r_s
$$

**依据与边界**
- 事件视界是整体概念；$r=0$ 处经典理论失效，量子引力结论未定。

## 宇宙学原理与空间几何（liang:cosmological-principle）[DEF/registered]

**一句直觉** 假设我们不在宇宙中的特殊位置，把均匀各向同性写成几何条件。

**背景与约定**
- 时空分层 $\Sigma_t$；每层上物质分布均匀且各向同性；$k\in\{-1,0,+1\}$。
- 均匀各向同性只在足够大尺度上近似成立。

**精确内容**
$$
\Sigma_t\ \text{spacelike},\qquad \text{homogeneous and isotropic}
$$

$$
k\in\{-1,0,+1\}
$$

**依据与边界**
- 只在足够大尺度上近似成立；原理不含动力学，不决定 $a(t)$。

## Robertson–Walker 度规（liang:rw-metric）[PROOF/registered]

**一句直觉** 宇宙学原理把度规定到只剩一个尺度因子。

**背景与约定**
- $k\in\{-1,0,+1\}$；$a(t)>0$；$d\Omega^2=d\theta^2+\sin^2\theta\,d\varphi^2$；$c=1$。
- 空间截面为最大对称空间。

**精确内容**
$$
ds^2=-dt^2+a^2(t)\left[\frac{dr^2}{1-kr^2}+r^2d\Omega^2\right]
$$

**依据与边界**
- $k$ 的数值依赖 $a$ 的归一化；有几何意义的是 $k/|a|^2$ 这类组合。

## 哈勃定律与宇宙学红移（liang:hubble-redshift）[PROOF/registered]

**一句直觉** 光在膨胀时空中传播时波长被拉长，红移记录尺度因子的变化。

**背景与约定**
- RW 度规；$a(t)$ 为尺度因子；$z$ 为红移；$H_0=\left.\dot a/a\right|_0$；低红移。
- $c=1$；$d$ 为低红移下使用的距离。

**精确内容**
$$
1+z=\frac{a(t_{\mathrm{obs}})}{a(t_{\mathrm{em}})}
$$

$$
z\approx H_0d\qquad(z\ll1)
$$

**依据与边界**
- 宇宙学红移不是多普勒效应；$H_0$ 的测量依赖距离阶梯，系统误差仍有争论。

## 尺度因子演化与宇宙学常数（liang:scale-factor）[PROOF/registered]

**一句直觉** 把 RW 度规代进场方程，膨胀史由能量组分与曲率决定。

**背景与约定**
- RW 度规；$\rho$ 为能量密度，$p$ 为压强；$k$；$\Lambda$；$c=G=1$。
- 三个方程中两个独立。

**精确内容**
$$
\left(\frac{\dot a}{a}\right)^2=\frac{8\pi\rho}{3}-\frac{k}{a^2}+\frac{\Lambda}{3}
$$

$$
\frac{\ddot a}{a}=-\frac{4\pi(\rho+3p)}{3}+\frac{\Lambda}{3}
$$

$$
\dot\rho+3\frac{\dot a}{a}(\rho+p)=0
$$

**依据与边界**
- 只有两个独立方程；$\Lambda>0$ 的静态解不稳定。

## 宇宙热历史、暗物质与粒子视界（liang:thermal-history）[DEF/registered]

**一句直觉** 把膨胀倒过来读，宇宙过去更热更密，热历史由此展开。

**背景与约定**
- 膨胀宇宙；辐射温度 $T\propto1/a$；共形时间 $\int dt/a$；粒子视界。
- 具体阶段划分依赖粒子物理模型。

**精确内容**
$$
T\propto\frac1a
$$

$$
\eta=\int\frac{dt}{a}
$$

$$
d_{\mathrm{ph}}(t)=a(t)\int_0^t\frac{dt'}{a(t')}
$$

**依据与边界**
- 具体阶段依赖粒子物理模型；暗物质微观身份未定。

## 暴涨模型及其对疑难的解决（liang:inflation）[PROOF/registered]

**一句直觉** 极早期加速膨胀把今天可观测的区域在暴涨前压到因果相连的小尺度。

**背景与约定**
- 极早期加速膨胀 $\ddot a>0$；共形时间被拉长；解决视界与平直性疑难。
- 一类模型，不是单一理论。

**精确内容**
$$
\ddot a>0
$$

$$
\int\frac{dt}{a}\ \text{increases significantly}
$$

**依据与边界**
- 暴涨是一类模型；预言符合观测不等于机制确认；不解释奇点本身。

## 暗能量与新标准宇宙模型（liang:new-standard-cosmology）[PROOF/registered]

**一句直觉** 用宇宙学常数加冷暗物质拟合当前的加速膨胀。

**背景与约定**
- $\Lambda$CDM；忽略辐射时 $\Omega_\Lambda+\Omega_m+\Omega_k\approx1$；$w=p/\rho$；$w\approx-1$。
- 暗能量与宇宙学常数在现有观测下不可区分。

**精确内容**
$$
\Omega_\Lambda+\Omega_m+\Omega_k\simeq1
$$

$$
w=\frac{p}{\rho}\approx-1
$$

**依据与边界**
- 暗能量与 $\Lambda$ 尚不可区分；$w$ 是否随时间变化是开放问题。

## 抽象指标配平与升降指标（liang:method-index-balance）[DEF/registered]

**一句直觉** 先配平指标类型，再谈等式是否成立。

**背景与约定**
- 输入：用抽象指标写出的候选张量等式；已知各符号类型与 $g_{ab}$。
- 输出：配平后的等式，或指出类型错误的位置。

**精确内容**
$$
T^a{}_b=S^a{}_b\qquad(\text{legal})
$$

$$
T^a{}_b=S_aV^b\qquad(\text{illegal: free indices differ in type})
$$

$$
g_{ab}T^b{}_c=T_a{}_c,\qquad g^{ab}T_{bc}=T^a{}_c
$$

**依据与边界**
- 配平只排除类型错误，不证明等式成立。

## 从度规到曲率的固定计算流程（liang:method-metric-curvature）[DEF/registered]

**一句直觉** 从度规出发，按固定顺序算出各阶曲率，并用恒等式自查。

**背景与约定**
- 输入：坐标卡下的度规分量 $g_{\mu\nu}(x)$；度规非退化。
- 输出：$\Gamma^\mu{}_{\nu\sigma}$、$R^\rho{}_{\sigma\mu\nu}$、$R_{\mu\nu}$、$R$；只给该卡分量。

**精确内容**
$$
g_{\mu\nu}\longrightarrow\Gamma^\mu{}_{\nu\sigma}\longrightarrow R^\rho{}_{\sigma\mu\nu}\longrightarrow R_{\mu\nu}\longrightarrow R
$$

$$
R^\rho{}_{\sigma\mu\nu}=\partial_\mu\Gamma^\rho{}_{\nu\sigma}-\partial_\nu\Gamma^\rho{}_{\mu\sigma}+\Gamma^\rho{}_{\mu\lambda}\Gamma^\lambda{}_{\nu\sigma}-\Gamma^\rho{}_{\nu\lambda}\Gamma^\lambda{}_{\mu\sigma}
$$

$$
\nabla^aG_{ab}=0\qquad(\text{check})
$$

**依据与边界**
- 只适用于已写出度规分量的情形；不解决「怎么猜度规」。

## 用 Killing 场换守恒量（liang:method-symmetry-conservation）[DEF/registered]

**一句直觉** 把几何的对称性直接翻译成沿测地线的守恒量。

**背景与约定**
- 输入：度规与待求测地线；至少一个 Killing 场；$\dot{}=\mathrm d/\mathrm d\lambda$，$\lambda$ 为仿射参数。
- 输出：守恒量与降维方程；没有 Killing 场时不适用。

**精确内容**
$$
\xi^au_a=\mathrm{const}
$$

$$
u^au_a=-1\ \text{or}\ 0
$$

$$
\frac12\dot r^2+V_{\mathrm{eff}}(r)=\frac12E^2
$$

**依据与边界**
- 守恒量个数等于独立 Killing 场个数；没有对称性时本方法不适用，但不等于测地线不可解。

