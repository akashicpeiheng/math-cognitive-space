import { formalStatement } from './authoring.mjs';

/**
 * 形式表达登记表：把重要节点用**形式语言**写出来。
 *
 * ## 为什么要单独一份表
 *
 * 每个节点已经有 `formal`（形式**负载**：theory / type / symbols / boundary），
 * 那是喂给形成检查器的元数据，`predicate` 是自然语言混符号的速记。
 * 本表登记的是**给人读的形式陈述**：`tex` 是纯 LaTeX（不含 `$`，渲染时按行间公式处理），
 * `reading` 把它读回中文，`notation` 交代每个符号是什么，`label` 是证据状态。
 *
 * 集中成一份表而不是散在各案例文件里，有三个理由：
 * 1. 挑选是**一次编辑决定**，要能一眼看清挑了哪些、没挑哪些；
 * 2. 案例文件的节点定义是数据驱动的（Rudin 用位置参数的 `C()/T()` 构造），散着加会改造它们的结构；
 * 3. 这份表可以被测试整体遍历（见 `tests/formal-statements.mjs`）。
 *
 * ## 挑选依据（不是"重要的都写了"）
 *
 * 按本体里的**关联度**（登记关系 + 行动契约参与次数）排序，再补上四个案例的概念核心，
 * 最后**只保留能写出无争议形式陈述的那些**。因此：
 * - 12 条定义（DEF）：四个案例的定义类核心（极限、收敛、连续、度量、紧致、流形、同胚、坐标图、
 *   光滑流形、光滑图册、张量空间、群、微分形式、向量空间）；
 * - 1 条教材陈述（REF）：实数系的最小上界性；
 * - **没有**给「方法」「误区」「证明」类节点写形式陈述——那类对象的形式内容是步骤与失效条件，
 *   硬套一个公式只会编造。
 *
 * ## 纪律
 *
 * - `tex` 一律**照本站已登记的措辞**写，不引入与节点正文冲突的约定。最典型的是 `dg:manifold`：
 *   本站按「Hausdorff + 局部欧氏」登记（不含第二可数），而 `dg:smooth-manifold` 那一版另加第二可数
 *   ——两份陈述因此不同，`note` 里写明差别，而不是把两者统一成"更标准"的那一种。
 * - 证不出、只是教材这么写的，`label` 用 `REF` 而不是 `PROOF`。
 */
const STATEMENTS = {
  /* ---------------- 极限与分析 ---------------- */
  'limit:limit-ed': {
    tex: String.raw`\lim_{x \to a} f(x) = L \\[6pt] \iff \forall \varepsilon > 0\ \exists \delta > 0\ \forall x \in D:\ 0 < |x - a| < \delta \\[4pt] \implies |f(x) - L| < \varepsilon`,
    reading: '极限等于 L，当且仅当：对每个 ε > 0 都存在 δ > 0，使得定义域 D 中一切满足 0 < |x − a| < δ 的 x 都有 |f(x) − L| < ε。',
    notation: [
      { symbol: 'a', means: '趋近的位置；必须是 D 的聚点（本身可以不在 D 中）' },
      { symbol: 'ε', means: '允许的误差上界，由对方任意给出' },
      { symbol: 'δ', means: '由 ε 决定的去心邻域半径，一般依赖 ε' },
      { symbol: 'D', means: 'f 的定义域；去心条件 0 < |x − a| 说明不要求 f 在 a 处有定义' },
    ],
    label: 'DEF',
    note: '量词次序是定义的一部分：∃δ 在 ∀ε 之后、在 ∀x 之前。交换 ∀x 与 ∃δ 会得到「逐点有邻域」这种弱得多的条件。',
  },
  'limit:seq-conv': {
    tex: String.raw`x_n \to a \\[6pt] \iff \forall \varepsilon > 0\ \exists N \in \mathbb{N}\ \forall n \ge N:\ |x_n - a| < \varepsilon`,
    reading: '序列收敛到 a，当且仅当对每个 ε > 0 都存在自然数 N，使第 N 项之后的所有项都落在 a 的 ε 邻域内。',
    notation: [
      { symbol: 'N', means: '关于 ε 的阈值（一般依赖 ε；ε 越小 N 越大）' },
      { symbol: 'n ≥ N', means: '「最终」的精确含义：只有有限多项允许落在邻域外' },
    ],
    label: 'DEF',
    note: '与 ε–δ 的差别只在阈值的类型：这里是比较指标的自然数，那里是邻域半径。不是「n 趋于无穷」的直观说法。',
  },
  'rudin:continuous-function': {
    tex: String.raw`\forall \varepsilon > 0\ \exists \delta > 0\ \forall x \in X:\ d_X(x, p) < \delta\\[4pt] \implies d_Y(f(x), f(p)) < \varepsilon \\[6pt] \iff \forall V \subseteq Y\ \text{open}:\ f^{-1}(V)\ \text{open in}\ X`,
    reading: 'f 在 p 连续，当且仅当给出 ε–δ 条件；也等价于 Y 中每个开集的原像在 X 中开。',
    notation: [
      { symbol: 'd_X, d_Y', means: '两个度量空间的距离函数；拓扑空间情形把 ε–δ 换成邻域语言' },
      { symbol: 'f⁻¹(V)', means: '原像，不需要 f 可逆' },
    ],
    label: 'DEF',
    note: '节点登记状态为 REF（只登记教材位置 §4.5–4.9）；本条陈述是定义，教材表述未逐条核对。',
  },
  'rudin:metric-space': {
    tex: String.raw`d: X \times X \to \mathbb{R}_{\ge 0}:\\[4pt] d(p,q) = 0 \iff p = q,\qquad d(p,q) = d(q,p),\\[4pt] d(p,r) \le d(p,q) + d(q,r)`,
    reading: '度量是 X × X 上的非负实值函数：等于 0 当且仅当两点重合（正定）、对称、满足三角不等式。',
    notation: [
      { symbol: 'B(p, r)', means: '开球 {q : d(p, q) < r}；开集由开球的并定义' },
      { symbol: '三角不等式', means: '绕道不更近：d(p, r) ≤ d(p, q) + d(q, r)' },
    ],
    label: 'DEF',
    note: '正定条件常写成 d(p,q) ≥ 0 且 d(p,q) = 0 ⇔ p = q；只写前半会漏掉「不同点距离非零」。节点登记状态为 REF（§2.15–2.20）。',
  },
  'rudin:compact-set': {
    tex: String.raw`K\ \text{compact} \iff \text{every open cover of}\ K\\[4pt] \text{has a finite subcover}\\[8pt] K \subseteq \mathbb{R}^k:\quad K\ \text{compact} \iff K\ \text{closed and bounded}`,
    reading: '紧致 = 任一开覆盖都有有限子覆盖；在 R^k 中紧致等价于有界且闭（Heine–Borel）。',
    notation: [
      { symbol: '开覆盖', means: '一族开集，其并包含 K' },
      { symbol: '有限子覆盖', means: '从这族里挑出有限个，其并仍包含 K' },
      { symbol: 'R^k 中的等价', means: '只在这一个空间成立；一般度量空间里「有界且闭」推不出紧致' },
    ],
    label: 'REF',
    note: '第二条是 Heine–Borel 定理（教材 §2.41）；本站只登记陈述，未复述证明。',
  },
  'rudin:least-upper-bound': {
    tex: String.raw`\forall S \subseteq \mathbb{R}:\quad S \neq \varnothing\ \text{and}\ S\ \text{bounded above} \implies \sup S \in \mathbb{R}`,
    reading: '每个非空有上界的实数子集都有上确界，且这个上确界仍是实数。',
    notation: [
      { symbol: 'sup S', means: 'S 的最小上界：S 的上界中最小的那个' },
      { symbol: 'bounded above', means: '存在 M 使一切 s ∈ S 满足 s ≤ M' },
    ],
    label: 'REF',
    note: '教材把它与域公理、序公理并列刻画实数系（§1.10、§1.19–1.21），即完备性；本站未证明它与其它完备性表述（如 Cauchy 列收敛）的等价性。',
  },

  /* ---------------- 流形与拓扑 ---------------- */
  'dg:homeomorphism': {
    tex: String.raw`f: X \to Y\ \text{is a homeomorphism} \iff f\ \text{bijective},\\[4pt] f\ \text{continuous},\ f^{-1}\ \text{continuous}`,
    reading: 'f 是同胚，当且仅当 f 是一一对应、连续，且逆映射也连续。',
    notation: [
      { symbol: 'bijective', means: '单射且满射，因此 f⁻¹ 作为映射存在' },
      { symbol: 'f⁻¹ 连续', means: '不能由「f 连续且是双射」推出；等价说法是 f 把开集映成开集' },
    ],
    label: 'DEF',
    note: '同胚是拓扑空间之间的「相同」：它保持一切只由开集定义的性质，不保持距离与角度。',
  },
  'dg:coordinate-chart': {
    tex: String.raw`(U, \varphi):\quad U \subseteq M\ \text{open},\\[4pt] \varphi: U \to \varphi(U) \subseteq \mathbb{R}^n\ \text{a homeomorphism onto an open set}`,
    reading: '坐标图是「开集 U 加上把它同胚地映到 R^n 中开集的映射 φ」这样一对。',
    notation: [
      { symbol: 'U', means: 'M 中的开集（图的定义域）' },
      { symbol: 'φ', means: '坐标映射；φ(p) 就是 p 在这张图里的坐标' },
      { symbol: 'φ(U) 开', means: '要求像也是开集——这是「局部欧氏」的精确含义' },
    ],
    label: 'DEF',
    note: '坐标是局部的：一般没有覆盖整个流形的单个坐标图（球面就需要至少两张）。',
  },
  'dg:topological-manifold': {
    tex: String.raw`M\ \text{Hausdorff};\\[4pt] \forall p \in M\ \exists\, U \ni p\ \text{open},\ \exists\, \varphi: U \xrightarrow{\ \cong\ } \varphi(U) \subseteq_{\text{open}} \mathbb{R}^n`,
    reading: 'M 是 Hausdorff 空间，且每点 p 都有开邻域 U 与到 R^n 中开集的同胚 φ。',
    notation: [
      { symbol: 'Hausdorff', means: '不同两点有不相交的邻域；它保证极限唯一' },
      { symbol: '≅', means: '同胚（双向连续的一一对应）' },
      { symbol: '(U, φ)', means: '坐标图；一族覆盖 M 的坐标图就是图册' },
    ],
    label: 'DEF',
    note: '不要求坐标变换光滑，因此拓扑流形上还不能定义切向量与微分；光滑结构是额外信息。',
  },
  'dg:manifold': {
    tex: String.raw`M\ \text{Hausdorff};\\[4pt] \forall p \in M\ \exists\, U \ni p\ \text{open},\ \exists\, \varphi: U \xrightarrow{\ \cong\ } \varphi(U) \subseteq_{\text{open}} \mathbb{R}^n;\\[4pt] \dim M = n`,
    reading: 'M 是 Hausdorff 空间，每点都有同胚于 R^n 中开集的邻域；n 称为 M 的维数。',
    notation: [
      { symbol: 'n', means: '维数；由 Brouwer 不变性，连通的非空流形上 n 唯一' },
      { symbol: '局部欧氏', means: '「每点附近长得像 R^n」——但整体不必是 R^n（球面、环面都是流形）' },
    ],
    label: 'DEF',
    note: '本站这一条按「Hausdorff + 局部欧氏」登记，**不含第二可数**；`dg:smooth-manifold` 那一版另加第二可数与光滑图册。两者不是同一条定义的繁简，是两份不同的登记，差别写在这里而不是悄悄统一。',
  },
  'dg:smooth-atlas': {
    tex: String.raw`\mathcal{A} = \{(U_\alpha, \varphi_\alpha)\}_{\alpha \in A}:\quad \bigcup_{\alpha} U_\alpha = M,\\[6pt] \forall \alpha, \beta:\ \varphi_\beta \circ \varphi_\alpha^{-1} \in C^\infty\bigl(\varphi_\alpha(U_\alpha \cap U_\beta)\bigr)`,
    reading: '光滑图册是一族覆盖 M 的坐标图，且任意两图的坐标变换在重叠域上是 C^∞。',
    notation: [
      { symbol: '覆盖', means: '并集等于 M（不是"包含"）：每点至少落在一张图里' },
      { symbol: 'φ_β ∘ φ_α⁻¹', means: '坐标变换：把 R^n 中的一块搬到 R^n 中的另一块' },
      { symbol: 'C^∞', means: '无穷次可微；只要求到 C^k 就得到 C^k 图册' },
    ],
    label: 'DEF',
    note: '相容性只需在重叠域 U_α ∩ U_β 上验证；把 A 取成「所有与它相容的图」就得到极大图册，也就是一个光滑结构。',
  },
  'dg:smooth-manifold': {
    tex: String.raw`M\ \text{Hausdorff, second countable};\\[4pt] \exists\, \mathcal{A} = \{(U_\alpha, \varphi_\alpha)\}\ \text{covering}\ M:\ \varphi_\beta \circ \varphi_\alpha^{-1} \in C^\infty`,
    reading: 'M 是 Hausdorff、第二可数空间，且存在覆盖 M 的图册，使任意两图的坐标变换都是 C^∞。',
    notation: [
      { symbol: 'second countable', means: '有可数拓扑基；它排除病态的长直线一类空间，保证单位分解存在' },
      { symbol: '图册 A', means: '光滑结构由这一族图给出，而不是由拓扑给出' },
    ],
    label: 'DEF',
    note: '同一拓扑流形可以承载互不相容的光滑结构（Milnor 的怪球即是极端例子）；因此「光滑流形」比「拓扑流形」多一份数据。',
  },
  'dg:differential-form': {
    tex: String.raw`\Omega^p(M) = \Gamma\bigl(M,\ \textstyle\bigwedge^p T^*M\bigr),\\[6pt] \omega: M \to \bigwedge^p T^*M,\quad \omega_p \in \bigwedge^p T_p^*M`,
    reading: 'p 次微分形式是外代数丛 ⋀^p T*M 的光滑截面：在每点 p 给出一个反对称的 p 重余切向量。',
    notation: [
      { symbol: 'T*M', means: '余切丛；T*_p M 是切空间的对偶' },
      { symbol: '⋀^p', means: 'p 次外幂：反对称化后的张量，交换两个槽会变号' },
      { symbol: 'Γ', means: '光滑截面空间' },
    ],
    label: 'DEF',
    note: 'p = 1 时是 1-形式（余切向量场）；p = 0 时是光滑函数。反对称性由 ⋀ 给出，不需要额外假设。',
  },

  /* ---------------- 代数与线性 ---------------- */
  'tensor:tensor-rs': {
    tex: String.raw`T^r_s(V) = \underbrace{V \otimes \cdots \otimes V}_{r}\ \otimes\ \underbrace{V^{*} \otimes \cdots \otimes V^{*}}_{s},\\[4pt] \dim T^r_s(V) = (\dim V)^{\,r+s}`,
    reading: '(r, s) 型张量空间是 r 个 V 与 s 个 V* 的张量积；维数是 (dim V)^{r+s}。',
    notation: [
      { symbol: 'V*', means: '对偶空间 Hom(V, F)' },
      { symbol: 'r, s', means: '反变与协变的阶数；指标在上是反变、在下是协变' },
      { symbol: '⊗', means: '张量积；双线性映射的泛对象' },
    ],
    label: 'DEF',
    note: '指标顺序各书写法不一（有的先协变）；本站按「先 r 个 V、再 s 个 V*」登记，与 `tensor:tensor-rs` 的记号一致。',
  },
  'bg:linear:vector': {
    tex: String.raw`(V, +)\ \text{abelian group};\\[4pt] \cdot: \mathbb{F} \times V \to V:\quad \lambda(u + v) = \lambda u + \lambda v,\\[4pt] (\lambda + \mu)v = \lambda v + \mu v,\quad (\lambda\mu)v = \lambda(\mu v),\\[4pt] 1_{\mathbb{F}}\,v = v`,
    reading: '向量空间 = 加法交换群，加上域作用；作用对向量加法与域加法都分配、与域乘法相容、单位元作用为恒等。',
    notation: [
      { symbol: 'F', means: '基域（R 或 C；换成环就得到模）' },
      { symbol: '交换群', means: '加法有单位元 0、每个元素有相反数、可交换' },
      { symbol: '1_F v = v', means: '这条常被漏写，但没有它标量作用可以是任意的' },
    ],
    label: 'DEF',
    note: '这是背景理论节点（背景层），本站没有为它登记逐条出处；陈述按标准定义写出。',
  },
  'group:group-concept': {
    tex: String.raw`(G, \cdot, e, {}^{-1}):\quad \forall a, b, c \in G:\ (ab)c = a(bc),\\[4pt] ae = ea = a,\\[4pt] aa^{-1} = a^{-1}a = e`,
    reading: '群是集合带上满足结合律的二元运算、单位元与逆元：运算结合、e 是双边单位元、每个元素有双边逆元。',
    notation: [
      { symbol: 'e', means: '单位元；由公理可证唯一' },
      { symbol: 'a⁻¹', means: 'a 的逆元；由公理可证唯一' },
      { symbol: '· 封闭', means: '「G 上的二元运算」已含封闭性，不另列公理' },
    ],
    label: 'DEF',
    note: '交换律**不在**公理里：交换群是额外一类。运算记号省略时写作 ab，但非交换群里 ab ≠ ba。',
  },

  /* ---------------- 点集拓扑（2026-10 第八个案例） ---------------- */
  'top:space': {
    tex: String.raw`\tau \subseteq \mathcal{P}(X):\quad \emptyset \in \tau,\quad X \in \tau,\\[4pt] \{U_i\}_{i \in I} \subseteq \tau \Rightarrow \bigcup_{i \in I} U_i \in \tau,\\[4pt] U, V \in \tau \Rightarrow U \cap V \in \tau`,
    reading: '拓扑是 X 的一族子集：含空集与全集、对任意并封闭、对有限交封闭；$\\tau$ 的成员叫开集，$(X, \\tau)$ 叫拓扑空间。',
    notation: [
      { symbol: 'X', means: '底集合；拓扑只约束它的子集族，不要求额外的距离或序' },
      { symbol: 'τ', means: '被指定为「开」的子集族；换成闭集族是等价写法' },
      { symbol: '任意并', means: '指标集 I 可以是不可数的；这一条不能弱化成有限并' },
      { symbol: '有限交', means: '只对有限多个成员要求；换成任意交会排除 ℝ 上的通常拓扑' },
    ],
    label: 'DEF',
    note: '本站另有背景接口 bg:top:space（把拓扑空间与局部欧氏性合成一个最低接口）与本案例的单元级登记 top:topological-manifold；三者是不同粒度的登记，不合并。',
  },
  'top:compactness': {
    tex: String.raw`\forall \mathcal{U} \subseteq \tau:\ \bigcup \mathcal{U} = X\\[4pt] \Rightarrow\ \exists \mathcal{U}_0 \subseteq \mathcal{U}\ \text{finite}:\ \bigcup \mathcal{U}_0 = X`,
    reading: 'X 紧：任意开覆盖都能抽出有限子覆盖。等价地，闭集族的任意有限子族交非空则全体交非空。',
    notation: [
      { symbol: '𝒰', means: 'X 的一个开覆盖：全由开集组成且并等于 X' },
      { symbol: '𝒰₀ 有限', means: '有限子覆盖是结论的全部内容；「存在某个有限开覆盖」是恒真条件，不是紧性' },
      { symbol: '量词次序', means: '∀ 覆盖 之后才 ∃ 有限子族；交换次序会得到恒真的伪条件' },
    ],
    label: 'DEF',
    note: '序列刻画（每序列有收敛子序列）只在**度量空间**与紧性等价；一般空间要换成网。[0, ω₁] 的序拓扑紧而不序列紧。',
  },
  'top:paracompactness': {
    tex: String.raw`\forall \mathcal{U} \subseteq \tau,\ \bigcup \mathcal{U} = X,\ \exists \mathcal{V} \subseteq \tau:\\[4pt] \bigcup \mathcal{V} = X,\quad \forall V \in \mathcal{V}\ \exists U \in \mathcal{U}:\ V \subseteq U,\\[4pt] \forall x \in X\ \exists N(x):\ \#\{V \in \mathcal{V} : V \cap N(x) \neq \emptyset\} < \infty`,
    reading: 'X 仿紧：每个开覆盖都有局部有限的开加细。「局部有限」指每点有一个邻域只与有限多个加细成员相交。',
    notation: [
      { symbol: '𝒱 是加细', means: '每个 V 装进某个 U；加细的成员不必是原覆盖的成员' },
      { symbol: '局部有限', means: '整体可以是无限族；只要每点附近只有有限多个成员在起作用' },
      { symbol: '与紧性的差别', means: '紧性要求有限子覆盖（整体有限），仿紧只要求局部有限——所以 ℝⁿ 仿紧而不紧' },
    ],
    label: 'DEF',
    note: '本站按「Hausdorff + 仿紧」使用它：正规性与单位分解都需要 Hausdorff，而「仿紧」一词本身不含分离性。',
  },
  'top:sigma-compact': {
    tex: String.raw`X = \bigcup_{n \in \mathbb{N}} K_n,\qquad K_n \subseteq X\ \text{compact in the subspace topology}`,
    reading: 'X 是 σ-紧的：可以写成可数多个紧子集之并。',
    notation: [
      { symbol: 'K_n', means: '紧子集；不要求开，也不要求闭（T2 时紧集自动闭）' },
      { symbol: '可数并', means: '并必须可数；换成「任意并」则每个空间都满足，判据失去意义' },
      { symbol: '子空间拓扑', means: 'K_n 的紧性按 X 诱导的子空间拓扑判定' },
    ],
    label: 'DEF',
    note: '紧 ⇒ σ-紧（取 K₁ = X）；反向不成立。不可数离散空间**不是** σ-紧的，不能用来否定「σ-紧 + 局部紧 ⇒ 紧」。',
  },
  'top:connectedness': {
    tex: String.raw`\nexists\, U, V \in \tau:\ U \neq \emptyset,\ V \neq \emptyset,\ U \cap V = \emptyset,\ U \cup V = X\\[4pt] \text{路径连通}:\quad \forall x, y\ \exists \gamma: [0,1] \to X\ \text{continuous},\ \gamma(0) = x,\ \gamma(1) = y`,
    reading: 'X 连通：不能被写成两个非空不交开集之并。路径连通：任意两点可用 [0, 1] 的连续像连接。',
    notation: [
      { symbol: 'U, V', means: '要求相对 X 既开又闭地分开；只要求「不交子集」会得到恒真条件' },
      { symbol: '[0,1]', means: '路径的参数区间必须是紧的；换成 (0,1] 或 ℝ 得到更弱的变体' },
      { symbol: 'γ 连续', means: '路径连通 ⇒ 连通，反向不成立（拓扑学家的正弦曲线）' },
    ],
    label: 'DEF',
    note: '连通子集在 ℝ 上恰好是区间，中值定理因此成为「连通空间的连续像连通」的推论。',
  },
  'top:topological-manifold': {
    tex: String.raw`M\ \text{Hausdorff},\quad M\ \text{second countable},\\[4pt] \forall x \in M\ \exists U \ni x\ \text{open},\ \exists \varphi:\ U \to \mathbb{R}^n\ \text{homeomorphism},\\[4pt] \varphi(U) \subseteq \mathbb{R}^n\ \text{open}:\quad M\ \text{is an}\ n\text{-manifold}`,
    reading: 'n 维拓扑流形：Hausdorff、第二可数，且每点有开邻域与 ℝⁿ 的开子集同胚。',
    notation: [
      { symbol: 'φ(U) 开', means: '局部坐标的像必须是开集；射到带边或闭子集不构成坐标卡' },
      { symbol: '同胚', means: '双向连续，不只是连续双射' },
      { symbol: 'Hausdorff', means: '排除「带两个原点的直线」这类局部欧氏而非 T2 的空间' },
      { symbol: '第二可数', means: '排除长直线；本站与教材一致，流形要求第二可数' },
    ],
    label: 'DEF',
    note: '本站对同一层概念有三处登记：本节点含第二可数，dg:topological-manifold 按「Hausdorff + 局部欧氏」（不含第二可数）登记，manifold:top-manifold 与本节点公理表相同但登记深度不同。差别如实保留，不合并。',
  },
  'top:coordinate-chart': {
    tex: String.raw`U \subseteq M\ \text{open},\quad \varphi:\ U \to \varphi(U) \subseteq \mathbb{R}^n\\[4pt] \varphi\ \text{a homeomorphism},\quad \varphi(U)\ \text{open in}\ \mathbb{R}^n:\quad (U, \varphi)\ \text{is a chart}`,
    reading: '坐标卡 (U, φ)：U 是 M 的开集，φ(U) 是 ℝⁿ 的开集，且 φ 是从 U 到 φ(U) 的同胚；φ 的分量函数就是局部坐标。',
    notation: [
      { symbol: 'U', means: '底空间的开集（局部参数的有效范围）' },
      { symbol: 'φ(U) 开', means: '像必须开：射到带边或闭子集都不构成坐标卡' },
      { symbol: '同胚', means: 'φ 与 φ⁻¹ 都连续；只要求连续双射不够' },
      { symbol: 'ℝⁿ', means: '局部模型的维数 n；在连通流形上 n 唯一（需要维数不变性定理）' },
    ],
    label: 'DEF',
    note: '坐标卡本身不含微分结构：C^r 条件加在图册的过渡映射上（见 top:atlas 与 top:differentiable-manifold）。',
  },
  'top:atlas': {    tex: String.raw`\mathcal{A} = \{(U_\alpha, \varphi_\alpha)\}:\quad \bigcup_{\alpha} U_\alpha = M,\\[4pt] \forall \alpha, \beta:\ \varphi_\beta \circ \varphi_\alpha^{-1}:\ \varphi_\alpha(U_\alpha \cap U_\beta) \to \varphi_\beta(U_\alpha \cap U_\beta)\ \text{compatible}`,
    reading: '图册是覆盖 M 的一族坐标卡，并且每对卡的重叠域上两个方向的过渡映射都有定义且（按 C^r 层级）相容。',
    notation: [
      { symbol: '覆盖', means: '每点至少落在一张卡里；删掉这一条，未覆盖处没有坐标可言' },
      { symbol: '过渡映射的定义域', means: 'φ_α(U_α ∩ U_β)，不是整个 ℝⁿ；在重叠域的像之外 φ_α⁻¹ 没有定义' },
      { symbol: '全部有序卡对', means: '相容性不是只对相邻编号的卡检查；也不是单向检查' },
    ],
    label: 'DEF',
    note: '「相容」按层级分：拓扑图册要求过渡映射是同胚，C^r 图册要求它与逆都 C^r。本节点登记拓扑层；C^r 层见 top:differentiable-manifold。',
  },
  'top:claim-compact-normal': {
    tex: String.raw`\text{Compact}(X)\ \wedge\ T_2(X)\\[4pt] \Rightarrow\ \forall A, B\ \text{closed},\ A \cap B = \emptyset\ \exists U \supseteq A,\ V \supseteq B\ \text{open}:\ U \cap V = \emptyset`,
    reading: '紧 Hausdorff 空间是正规空间：任意两个不交闭集都可用不交开集分离。',
    notation: [
      { symbol: 'T₂', means: 'Hausdorff：任意两点有不交开邻域；不可省，余有限拓扑是紧 T₁ 而非正规的反例' },
      { symbol: '紧', means: '提供两处有限子覆盖，用来把「逐点分离」压成「闭集分离」' },
      { symbol: 'A, B 闭', means: '正规性分离的是闭集；只分离点就是 T₂，条件会弱很多' },
    ],
    label: 'PROOF',
    note: '证明分两步：先对每个 x ∈ A 用 T₂ 分离 x 与整个 B，再用 A、B 的紧性各取一次有限子覆盖。本站给出正文级论证，未编码为 ND 证书。',
  },
  'top:claim-connected-intermediate': {
    tex: String.raw`\text{Connected}(X)\ \wedge\ f: X \to Y\ \text{continuous}:\quad \text{Connected}(f(X))\\[4pt] X = [a, b],\ Y = \mathbb{R}\ \Rightarrow\ f[a,b]\ \text{is an interval (Intermediate Value Theorem)}`,
    reading: '连通空间的连续像是连通的；在 ℝ 上取 [a, b] 与实值连续函数，就得到中值定理。',
    notation: [
      { symbol: 'f(X)', means: '取 f(X) 上的子空间拓扑；连通性是对这个子空间说的' },
      { symbol: '证明的两行', means: '若 f(X) = U ∪ V 为不交非空开集，则原像把 X 也分开，与 X 连通矛盾' },
      { symbol: '连续', means: '唯一用到的性质是「开集的原像开」' },
    ],
    label: 'REF',
    note: '本站按教材标准结论登记为引用（不声称机器核验）；rudin 案例的 rudin:continuity-connectedness 是它在 ℝ 上的分析版本，两处互不覆盖。',
  },
};

/** 说明每一条为什么被挑中（测试与页面都会读它，避免挑选变成没有理由的清单）。 */
export const FORMAL_STATEMENT_NOTES = {
  selection: '按关联度（登记关系 + 行动契约参与）排序，补上四个案例的概念核心，只保留能写出无争议形式陈述的节点。',
  excluded: '方法、误区、证明与练习类节点没有登记形式陈述：它们的形式内容是步骤与失效条件，硬套公式等于编造。',
};

/** 把登记表贴到节点上；没登记的节点保持 null，不补默认值。 */
export function attachFormalStatements(nodes) {
  return nodes.map((node) => {
    const entry = STATEMENTS[node.id];
    if (entry) return { ...node, formalStatement: formalStatement(entry) };
    if ('formalStatement' in node) return node;
    return { ...node, formalStatement: null };
  });
}

export const FORMAL_STATEMENT_IDS = Object.keys(STATEMENTS).sort();
