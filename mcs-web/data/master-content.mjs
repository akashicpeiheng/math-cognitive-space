/** Public reading projections only. Never attach these edits to canonical M or its hash.
 * Every override condenses already registered material; it adds no new theorem.
 * Bump when selections change so browser/detail caches cannot mix revisions.
 */
export const MASTER_CONTENT_VERSION = 'master-reading/1.20261020';
const tex = (markdown, extra = {}) => ({ markdown: `$$\n${markdown}\n$$`, ...extra });
// Existing short descriptions, separated from summaries that also contain a
// full definition. These are reading aids, never substitutes for visible scope.
export const MASTER_INTUITIONS = {
  'gt:holonomy-group': '沿闭曲线平行移动产生切空间上的等距自同构。',
  'gt:covariant-tensor-field': '光滑地给每点指定一个多重线性形式。',
  'gt:transversality': '相交处的切方向合起来张成环境空间的切空间。',
  'gt:sard-theorem': '几乎每一点都是正则值。',
  'gt:embedding-theorem': '把抽象光滑流形放进欧氏空间。',
  'gt:jacobi-matrix': '用矩阵表示一点处的微分。',
  'gt:sigma-algebra': '对可数运算封闭的集合族。',
  'gt:contraction-principle': '反复迭代压缩映射，逼近唯一不动点。',
  'gt:countability-axioms': '用可数邻域基或可数拓扑基控制局部或整体的开集。',
  'gt:separation-axioms': '用开集分离点与闭集。',
  'gt:differentiable-manifold': '给拓扑流形配上相容的可微坐标。',
  'gt:tangent-vector': '用导子或曲线等价类描述一点处的切向量。',
  'gt:ricci-flow': '让黎曼度量按 Ricci 曲率演化。',
  'axler:svd': '把线性映射写成旋转、沿坐标拉伸、再旋转。',
  'axler:determinant': '用交错多线性与归一化刻画行列式。',
};
// Free-form "note" and "boundary" fields also contain proofs, motivation and
// teaching examples. Read only these explicitly selected scope statements;
// the typed assumptions and the formal expressions are always kept separately.
export const MASTER_BOUNDARY_SELECTIONS = Object.fromEntries([
  'limit:seq-conv','limit:limit-seq','limit:bridge','limit:claim-eval-constant',
  'limit:method-constant-test','limit:method-ratio-test','limit:method-neighborhood-estimate',
  'manifold:claim-generalization','manifold:claim-transition-eval','manifold:method-regularity',
  'manifold:method-cover-by-charts','manifold:method-extension-check',
  'tensor:tensor-rs','tensor:rank1-additive','tensor:method-dimension-count',
  'group:method-cayley-table','group:method-order-count',
  'jiang:method-elimination','jiang:method-completing-square','jiang:method-euclidean-algorithm','jiang:method-reduce-to-normal-form',
  'axler:method-gram-schmidt','axler:method-qr','axler:method-jordan',
  'liang:abstract-index','liang:parallel-transport','liang:fermi-transport',
  'liang:birkhoff-theorem','liang:classical-tests','liang:method-index-balance','liang:method-metric-curvature',
  'rudin:method-epsilon-estimate','rudin:method-compactness-transfer',
  'top:method-cover-check','top:method-local-to-global',
].map(id => [id, [0]]));
export const MASTER_CONTEXT_ADDITIONS = {
  'tensor:tensor-rs': ['指标约定：先 $r$ 个 $V$，再 $s$ 个 $V^*$。'],
  'tensor:dual': ['未给度量或内积时，不作自然的 $V\\cong V^*$ 识别。'],
  'gt:geodesic': ['仿射参数；$\\nabla$ 为所指定的联络。'],
  'gt:sard-theorem': ['有限维、无边流形；$M$ 第二可数。'],
  'gt:embedding-theorem': ['第二可数光滑流形。'],
  'liang:metric-tensor': ['非退化；Lorentz 号差按 $(-,+,+,+)$。'],
  'liang:derivative-operator': ['联络为额外指定的结构；与缩并交换。'],
  'liang:christoffel': ['Levi-Civita 唯一性：度量适配且无挠。'],
  'liang:geodesic': ['参数为仿射参数。'],
  'liang:killing-field': ['$\\nabla_a\\xi_b+\\nabla_b\\xi_a=0$ 使用度量适配联络。'],
  'liang:hypersurface': ['等值面刻画是局部的；零超曲面的诱导度规退化。'],
  'liang:volume-element': ['已选定向；度量体元使用给定度量。'],
  'liang:gauss-theorem': ['Hodge 对偶使用给定度规与定向；符号依度规号差。'],
  'liang:four-momentum': ['$p^a=mu^a$ 限于有静质量粒子。'],
  'liang:energy-momentum-tensor': ['理想流体式：无粘滞、无热流。'],
  'liang:gravity-as-geometry': ['理论公设。'],
  'liang:equivalence-principle': ['局部陈述；曲率不由坐标选择消去。'],
  'liang:einstein-equation': ['理论公设。'],
  'liang:linearized-gravity': ['$|h|\\ll1$；牛顿极限另要求静态与低速。'],
  'liang:schwarzschild-solution': ['真空区。'],
  'liang:schwarzschild-geodesics': ['类光情形 $u^au_a=0$，不作类时归一化。'],
  'rudin:derivative': ['有限导数；端点另用单侧定义。'],
  'rudin:lebesgue-integral': ['有符号积分排除 $\\infty-\\infty$；非负积分可为 $+\\infty$。'],
  'top:paracompactness': ['仿紧的定义本身不含 Hausdorff；本站相关定理另加 Hausdorff。'],
  'top:atlas': ['拓扑图册；$C^r$ 相容另行登记。'],
  'top:differentiable-manifold': ['$r\\ge1$；不相容的图册给出不同微分结构。'],
  'vault:directional-derivative': ['有限维、实值；单位方向为读数约定，$D_{\\lambda v}=\\lambda D_v$。'],
  'tensor:multilinear-map': ['复数情形区分多线性与半线性。'],
  'logic:propositional-formula': ['经典二值语义。'],
  'logic:first-order-formula': ['量词仅量化个体。'],
  'logic:structure': ['非空论域。'],
  'logic:completeness': ['一阶逻辑的全部模型；不限定标准自然数模型。'],
};
// Reviewed repetitions whose mathematical content is already present in the
// canonical view (including its conditional equivalents). Keep their sources
// and the ontology's alias resolution, without repeating the same definition.
export const MASTER_REDUNDANT_REGISTRATIONS = {
  'top:compactness': ['dg:compactness','liang:compactness','rudin:compact-set'],
  'top:topological-manifold': ['manifold:top-manifold','dg:topological-manifold'],
};
export const MASTER_OVERRIDES = {
  'limit:limit-ed': {
    context: ['\u0024f:D\\subseteq\\mathbb R\\to\\mathbb R,\\quad a\\in D\u0027,\\quad L\\in\\mathbb R\u0024'],
    expressions: [tex(String.raw`\lim_{x\to a}f(x)=L\iff\forall\varepsilon>0\ \exists\delta>0\ \forall x\in D:\quad 0<|x-a|<\delta\Rightarrow |f(x)-L|<\varepsilon`)],
    intuition: { zh: '任意输出误差都能由足够小的输入邻域控制。', en: 'Every output tolerance admits a sufficiently small input neighborhood.' },
  },
  'limit:continuous': {
    context: [String.raw`$f:D\subseteq\mathbb R\to\mathbb R,\quad a\in D$`],
    expressions: [tex(String.raw`f\text{ continuous at }a\iff\forall\varepsilon>0\ \exists\delta>0\ \forall x\in D:\quad |x-a|<\delta\Rightarrow |f(x)-f(a)|<\varepsilon`)],
    intuition: { zh: '点附近的函数值由该点的函数值控制。', en: 'Nearby inputs have values close to the value at the point.' },
  },
  // The old registration conflates continuity at p with continuity on all X.
  // Select its metric pointwise definition; do not repeat the unsupported iff.
  'rudin:continuous-function': {
    context: [String.raw`$(X,d_X),(Y,d_Y),\quad f:X\to Y,\quad p\in X$`],
    expressions: [tex(String.raw`f\text{ continuous at }p\iff\forall\varepsilon>0\ \exists\delta>0\ \forall x\in X:\quad d_X(x,p)<\delta\Rightarrow d_Y(f(x),f(p))<\varepsilon`)],
    completeness: 'partial',
    gaps: { zh: ['原登记混合点连续与整体连续；此处仅保留点连续条件。'], en: ['The registration mixes pointwise and global continuity; only the pointwise condition is retained here.'] },
  },
  'top:compactness': {
    context: [String.raw`$(X,\tau)$；子集取子空间拓扑。`],
    expressions: [tex(String.raw`X\text{ compact}\iff\forall\mathcal U\subseteq\tau:\ \bigcup\mathcal U=X\Rightarrow\exists\mathcal U_0\subseteq\mathcal U\text{ finite}:\ \bigcup\mathcal U_0=X`)],
    equivalents: [
      { markdown: '任意具有有限交性质的闭集族，其全体交非空。', locale: 'zh', status: 'REF', conditions: ['拓扑空间；闭集族的任意有限子族交非空。'], source: 'formalStatement.reading' },
      { ...tex(String.raw`K\text{ compact}\iff K\text{ closed and bounded}`), conditions: [String.raw`$K\subseteq\mathbb R^n$`], status: 'REF', source: 'rudin:compact-set/formalStatement' },
    ],
    intuition: { zh: '任何开覆盖都能缩减为有限子覆盖。', en: 'Every open cover reduces to a finite subcover.' },
  },
  'top:topological-manifold': {
    context: [String.raw`$n\in\mathbb N;\quad M$ Hausdorff; second countable`],
    expressions: [tex(String.raw`\forall p\in M\ \exists U\ni p\text{ open},\quad \varphi:U\xrightarrow{\cong}V\subseteq_{\mathrm{open}}\mathbb R^n`)],
    intuition: { zh: '每点附近具有同一个维数的欧氏局部模型。', en: 'Each point has a Euclidean local model of the same dimension.' },
  },
  'dg:topological-manifold': { context: ['Hausdorff', '本登记不要求第二可数。'], contextLocale: 'zh' },
  'dg:manifold': { context: ['Hausdorff', '本登记不要求第二可数；不含光滑结构。'], contextLocale: 'zh' },
  'dg:tangent-bundle': {
    context: [String.raw`$M$ 光滑 $n$ 维流形；$(U,(x^i))$ 为局部坐标卡，切丛结构由 $M$ 的光滑图册诱导。`],
    expressions: [
      tex(String.raw`TM=\bigsqcup_{p\in M}T_pM,\qquad\pi:TM\to M,\quad X_p\mapsto p,\qquad\dim TM=2n`),
      tex(String.raw`\theta:\pi^{-1}(U)\xrightarrow{\cong}U\times\mathbb R^n,\qquad X_p\mapsto\bigl(p,X_p(x^1),\ldots,X_p(x^n)\bigr)`),
      tex(String.raw`\widetilde X^j=\sum_i X^i\frac{\partial\widetilde x^j}{\partial x^i}`),
    ],
    intuition: { zh: '将每点的切空间光滑地拼成一个空间。', en: 'Assemble the tangent spaces smoothly over their base points.' },
  },
  'group:left-mul': {
    context: [String.raw`$\mu:G\times G\to G,\quad g\in G$`],
    expressions: [tex(String.raw`L_g:G\to G,\qquad L_g(x)=\mu(g,x)`)],
    intuition: { zh: '固定二元运算的第一个输入。', en: 'Fix the first input of a binary operation.' },
  },
  'group:claim-injective': {
    context: [String.raw`$\mu:G\times G\to G,\quad e\in G,\quad\forall x\in G:\mu(x,e)=x,\quad L_g(x)=\mu(g,x)$`],
    expressions: [tex(String.raw`\forall g,h\in G:\quad L_g=L_h\Rightarrow g=h`)],
    intuition: { zh: '在共同右单位处取值即可恢复左乘参数。', en: 'Evaluation at the common right identity recovers the left parameter.' },
  },

  // ---- 梁灿彬、周彬《微分几何入门与广义相对论》上册：大师模式待审稿 ----
  // 依据 data/cases/liang.mjs 的登记与 data/cases/07-liang-dg.md 的凝练笔记压缩。
  // 条件、量词与符号范围按教材约定重述；不新增定理，不声称已复审教材证明。
  'liang:topological-space': {
    context: [
      String.raw`$(X,\mathcal T)$，$\mathcal T\subseteq\mathcal P(X)$；不预设分离性。`,
      String.raw`子集取子空间拓扑时另行声明；$X$ 与 $\varnothing$ 都算开集。`,
    ],
    expressions: [
      tex(String.raw`\varnothing,X\in\mathcal T;\qquad U,V\in\mathcal T\Rightarrow U\cap V\in\mathcal T;\qquad \{U_\alpha\}_{\alpha\in A}\subseteq\mathcal T\Rightarrow\bigcup_{\alpha\in A}U_\alpha\in\mathcal T`),
      tex(String.raw`F\subseteq X\ \text{closed}\iff X\setminus F\in\mathcal T`),
    ],
    intuition: { zh: '用开集记录「哪些点挨着」，把距离的数值全部丢掉。', en: 'Open sets record which points are near, discarding numerical distance.' },
    gaps: { zh: ['公理不含 Hausdorff；去掉它极限可以不唯一。本稿只压缩定义，未逐页核对教材原文。'], en: ['The axioms do not include Hausdorff; without it limits may fail to be unique. This entry compresses the definition only and does not verify the textbook page by page.'] },
  },
  'liang:continuous-map': {
    context: [
      String.raw`$f:X\to Y$，$(X,\mathcal T_X)$ 与 $(Y,\mathcal T_Y)$ 为拓扑空间。`,
      String.raw`同胚要求 $f$ 为双射且 $f^{-1}$ 连续。`,
    ],
    expressions: [
      tex(String.raw`f\ \text{continuous}\iff\forall V\in\mathcal T_Y:\ f^{-1}(V)\in\mathcal T_X`),
      tex(String.raw`f\ \text{homeomorphism}\iff f\ \text{bijective},\quad f,f^{-1}\ \text{continuous}`),
    ],
    intuition: { zh: '连续就是开集的原像仍然开，与距离无关。', en: 'Continuity means open preimages stay open, with no distance involved.' },
    gaps: { zh: ['同胚保持拓扑性质，不保持长度与曲率；本稿只压缩拓扑层面的定义。'], en: ['Homeomorphisms preserve topological properties, not lengths or curvature; only the topological definition is compressed here.'] },
  },
  'liang:compactness': {
    context: [
      String.raw`$X$ 为拓扑空间；$K\subseteq X$ 取子空间拓扑。`,
      String.raw`开覆盖由 $X$ 的开集组成；有限子覆盖取有限个成员。`,
    ],
    expressions: [
      tex(String.raw`X\ \text{compact}\iff\forall\{U_\alpha\}_{\alpha\in A}\subseteq\mathcal T:\ X=\bigcup_{\alpha\in A}U_\alpha\Rightarrow\exists\alpha_1,\dots,\alpha_n:\ X=\bigcup_{i=1}^nU_{\alpha_i}`),
      tex(String.raw`K\ \text{compact}\iff\forall\{U_\alpha\}\subseteq\mathcal T:\ K\subseteq\bigcup_{\alpha}U_\alpha\Rightarrow\exists\alpha_1,\dots,\alpha_n:\ K\subseteq\bigcup_{i=1}^nU_{\alpha_i}`),
    ],
    intuition: { zh: '任何开覆盖都能抽出有限个成员仍然覆盖。', en: 'Every open cover has a finite subcover.' },
    gaps: { zh: [String.raw`紧致不蕴含序列紧，后者还需第一可数；「有界闭」只在 $\mathbb R^n$ 中与紧致等价。教材本节标为选读。`], en: [String.raw`Compactness does not imply sequential compactness without first countability; closed-and-bounded is equivalent to compact only in $\mathbb R^n$. The textbook marks this section as optional.`] },
  },
  'liang:manifold': {
    context: [
      String.raw`$M$ 为 Hausdorff、第二可数的拓扑空间；$n\in\mathbb N$。`,
      String.raw`图册 $\{(U_\alpha,\varphi_\alpha)\}$ 覆盖 $M$，$\varphi_\alpha:U_\alpha\to\varphi_\alpha(U_\alpha)\subseteq_{\mathrm{open}}\mathbb R^n$ 为同胚。`,
      String.raw`所有非空重叠上的坐标变换为 $C^\infty$，并取极大图册。`,
    ],
    expressions: [
      tex(String.raw`\varphi_\beta\circ\varphi_\alpha^{-1}:\varphi_\alpha(U_\alpha\cap U_\beta)\to\varphi_\beta(U_\alpha\cap U_\beta)\quad C^\infty`),
      tex(String.raw`\forall p\in M\ \exists U\ni p:\quad \varphi:U\xrightarrow{\cong}V\subseteq_{\mathrm{open}}\mathbb R^n`),
    ],
    intuition: { zh: String.raw`每点附近用 $\mathbb R^n$ 的开集作坐标，重叠处光滑换图。`, en: 'Use Euclidean charts locally, glued smoothly on overlaps.' },
    gaps: { zh: ['不展开第二可数性在单位分解中的用途，也不分类同一拓扑流形上的不同光滑结构。'], en: ['The role of second countability in partitions of unity and the classification of smooth structures on one topological manifold are not developed here.'] },
  },
  'liang:tangent-vector': {
    context: [
      String.raw`$p\in M$，$M$ 为 $C^\infty$ 流形；$\gamma:(-\varepsilon,\varepsilon)\to M$ 光滑且 $\gamma(0)=p$。`,
      String.raw`坐标卡 $(U,\varphi)$ 含 $p$；等价性不依赖坐标卡的选取。`,
    ],
    expressions: [
      tex(String.raw`\gamma_1\sim\gamma_2\iff(\varphi\circ\gamma_1)'(0)=(\varphi\circ\gamma_2)'(0)`),
      tex(String.raw`T_pM=\{[\gamma]\},\qquad \dim T_pM=n`),
      tex(String.raw`v(f)=\left.\frac{d}{dt}\right|_{0}(f\circ\gamma)`),
    ],
    intuition: { zh: '一点处的切矢量由过该点的曲线的一阶行为决定。', en: 'A tangent vector is the first-order behavior of curves through the point.' },
    gaps: { zh: [String.raw`等价类定义依赖 $C^\infty$ 结构；曲线的整体信息不进入 $T_pM$，只保留一阶行为。`], en: [String.raw`The equivalence-class definition uses the $C^\infty$ structure; global information of the curve is discarded, leaving first-order behavior only.`] },
  },
  'liang:vector-field': {
    context: [
      String.raw`$M$ 为光滑流形；$\pi:TM\to M$ 为切丛。`,
      String.raw`坐标卡 $(U,(x^\mu))$；光滑性需对覆盖的每一张卡验证。`,
    ],
    expressions: [
      tex(String.raw`v:M\to TM,\qquad \pi\circ v=\mathrm{id}_M`),
      tex(String.raw`v=v^\mu(x)\frac{\partial}{\partial x^\mu},\qquad v^\mu\in C^\infty(U)`),
    ],
    intuition: { zh: '每点光滑地指定一个切矢量。', en: 'Assign a tangent vector smoothly at every point.' },
    gaps: { zh: ['只压缩光滑截面定义；积分曲线与流的存在唯一性另见教材。'], en: ['Only the smooth-section definition is compressed; existence and uniqueness of integral curves and flows are treated elsewhere in the textbook.'] },
  },
  'liang:dual-vector-field': {
    context: [
      String.raw`$T_p^*M=(T_pM)^*$；$\omega:M\to T^*M$ 为截面，$\omega_p$ 在每点线性。`,
      String.raw`$f\in C^\infty(M)$；$df$ 由对切矢量的作用定义。`,
    ],
    expressions: [
      tex(String.raw`\omega_p:T_pM\to\mathbb R\ \text{linear},\qquad \omega=\omega_\mu dx^\mu`),
      tex(String.raw`df(v)=v(f)`),
    ],
    intuition: { zh: '每点给出一台把切矢量变成数的线性机器。', en: 'At each point, a linear machine turning tangent vectors into numbers.' },
    gaps: { zh: ['没有度规时 $T_pM$ 与 $T_p^*M$ 不作自然等同；本稿不引入这种识别。'], en: ['Without a metric, $T_pM$ and $T_p^*M$ are not naturally identified; no such identification is introduced here.'] },
  },
  'liang:tensor-field': {
    context: [
      String.raw`$T$ 为 $M$ 上的 $(k,l)$ 型张量场：每点接收 $k$ 个对偶矢量与 $l$ 个矢量。`,
      String.raw`分量在每张坐标卡下为 $C^\infty$；缩并每次配对一个上指标与一个下指标。`,
    ],
    expressions: [
      tex(String.raw`T|_p:\underbrace{T_p^*M\times\cdots\times T_p^*M}_{k}\times\underbrace{T_pM\times\cdots\times T_pM}_{l}\to\mathbb R`),
      tex(String.raw`T=T^{\mu_1\cdots\mu_k}{}_{\nu_1\cdots\nu_l}\frac{\partial}{\partial x^{\mu_1}}\otimes\cdots\otimes\frac{\partial}{\partial x^{\mu_k}}\otimes dx^{\nu_1}\otimes\cdots\otimes dx^{\nu_l}`),
      tex(String.raw`(CT)^{\mu_1\cdots\mu_{k-1}}{}_{\nu_1\cdots\nu_{l-1}}=T^{\mu_1\cdots\mu_{k-1}\rho}{}_{\nu_1\cdots\nu_{l-1}\rho}`),
    ],
    intuition: { zh: '每点接收若干矢量与对偶矢量、对每个变量线性的对象。', en: 'A multilinear object fed vectors and covectors at each point.' },
    gaps: { zh: ['缩并必须一上一下配对；「按张量变换律变化」是判据而不是定义。'], en: ['Contraction pairs one upper with one lower index; transforming by the tensor law is a test, not the definition.'] },
  },
  'liang:metric-tensor': {
    context: [
      String.raw`$g$ 为 $M$ 上对称、非退化的 $(0,2)$ 型光滑张量场；号差按 $(-,+,+,+)$。`,
      String.raw`$\det(g_{\mu\nu})\neq0$；黎曼正定情形是特例。`,
      String.raw`$g$ 与逆 $g^{-1}$ 用于升降指标；线元 $ds^2=g_{\mu\nu}dx^\mu dx^\nu$。`,
    ],
    expressions: [
      tex(String.raw`g=g_{ab}dx^a\otimes dx^b,\qquad g_{ab}=g_{ba},\qquad \det(g_{ab})\neq0`),
      tex(String.raw`ds^2=g_{\mu\nu}dx^\mu dx^\nu`),
      tex(String.raw`g^{ab}g_{bc}=\delta^a{}_c`),
    ],
    intuition: { zh: '给每点切空间一个对称非退化双线性型，用来量长度与角度。', en: 'A symmetric nondegenerate bilinear form measuring lengths and angles.' },
    gaps: { zh: ['洛伦兹度规不给出正长度，类时间隔平方为负；本稿不把黎曼正定直觉套到洛伦兹情形。'], en: ['A Lorentzian metric does not give positive lengths: timelike intervals have negative square. Riemannian positivity is not carried over to the Lorentzian case.'] },
  },
  'liang:abstract-index': {
    context: [
      String.raw`抽象指标 $a,b,c,\dots$ 标记类型与缩并配对，不取任何坐标基。`,
      String.raw`重复指标一上一下表示求和；自由指标在等式两边上下一一配平。`,
    ],
    expressions: [
      tex(String.raw`T^a{}_b,\qquad \nabla_a\omega_b,\qquad R^a{}_{bcd}`),
      tex(String.raw`T^a{}_a=\text{contraction},\qquad g^{ab}g_{bc}=\delta^a{}_c`),
      tex(String.raw`T^a{}_b=S_aV^b\ \text{(illegal: free indices differ in type)}`),
    ],
    intuition: { zh: '把张量类型写在指标上，让不合法写法写不出来。', en: 'Put tensor types on indices so illegal expressions cannot be written.' },
    gaps: { zh: ['配平只检查记号合法性，不证明等式成立；指标合法而命题为假的等式照样存在。'], en: ['Balancing checks only notational legality, not truth: a well-typed equation can still be false.'] },
  },
  'liang:derivative-operator': {
    context: [
      String.raw`$\nabla$ 把 $(k,l)$ 型张量场映为 $(k,l+1)$ 型张量场。`,
      String.raw`$\nabla$ 是额外结构：一般流形上没有自然的导数算符；无挠条件另行声明。`,
    ],
    expressions: [
      tex(String.raw`\nabla_a(fT)=(\nabla_af)T+f\nabla_aT,\qquad \nabla_af=df`),
      tex(String.raw`\nabla_a(T\otimes S)=(\nabla_aT)\otimes S+T\otimes\nabla_aS`),
      tex(String.raw`\nabla_a\delta^b{}_c=0`),
    ],
    intuition: { zh: '补上「把邻近点的张量放进同一空间比较」的结构。', en: 'Supply the structure needed to compare tensors at nearby points.' },
    gaps: { zh: ['「与缩并交换」不可删；去掉它会得到只在特定坐标下才像导数的伪算子。'], en: ['Commutation with contraction cannot be dropped; without it one gets pseudo-operators that look like derivatives only in special coordinates.'] },
  },
  'liang:christoffel': {
    context: [
      String.raw`$(M,g)$ 为伪黎曼流形；$\nabla$ 无挠且与 $g$ 适配：$\nabla_ag_{bc}=0$、$T^c{}_{ab}=0$。`,
      String.raw`坐标卡 $(x^\mu)$；$\Gamma^\mu{}_{\nu\sigma}$ 为该卡下的联络分量。`,
    ],
    expressions: [
      tex(String.raw`\exists!\,\nabla:\quad \nabla_ag_{bc}=0,\qquad T^c{}_{ab}=2\Gamma^c{}_{[ab]}=0`),
      tex(String.raw`\Gamma^\mu{}_{\nu\sigma}=\frac12g^{\mu\rho}\left(\partial_\nu g_{\rho\sigma}+\partial_\sigma g_{\rho\nu}-\partial_\rho g_{\nu\sigma}\right)`),
      tex(String.raw`\Gamma^{\mu'}{}_{\nu'\sigma'}=\frac{\partial x^{\mu'}}{\partial x^\mu}\frac{\partial x^\nu}{\partial x^{\nu'}}\frac{\partial x^\sigma}{\partial x^{\sigma'}}\Gamma^\mu{}_{\nu\sigma}+\frac{\partial^2x^\mu}{\partial x^{\nu'}\partial x^{\sigma'}}\frac{\partial x^{\mu'}}{\partial x^\mu}`),
    ],
    intuition: { zh: '无挠且与度规适配的联络被度规唯一确定。', en: 'Torsion-free metric compatibility determines the connection uniquely.' },
    gaps: { zh: ['唯一性同时用到适配与无挠；只要求适配会得到无穷多个联络。克氏符不是张量，它在某点为 $0$ 不是坐标无关陈述。'], en: ['Uniqueness uses both metric compatibility and vanishing torsion; metric compatibility alone leaves infinitely many connections. The Christoffel symbols are not a tensor, so vanishing at a point is not coordinate-independent.'] },
  },
  'liang:parallel-transport': {
    context: [
      String.raw`$\gamma:I\to M$ 为光滑曲线，切矢量 $t^a$；$v^a$ 为沿 $\gamma$ 的矢量场；$\lambda$ 为曲线参数。`,
      String.raw`$\nabla$ 为给定联络；平移沿整条曲线定义。`,
    ],
    expressions: [
      tex(String.raw`t^a\nabla_av^b=0`),
      tex(String.raw`\frac{Dv^b}{d\lambda}=\frac{dv^b}{d\lambda}+\Gamma^b{}_{ac}t^av^c`),
    ],
    intuition: { zh: '沿曲线搬运矢量，并要求搬运过程中协变导数为零。', en: 'Carry a vector along a curve with vanishing covariant derivative.' },
    gaps: { zh: ['平移依赖曲线：沿不同曲线把同一矢量搬到同一点，结果可以不同——这正是曲率的来源。'], en: ['Transport depends on the curve: transporting the same vector to the same point along different curves can give different results, which is the source of curvature.'] },
  },
  'liang:geodesic': {
    context: [
      String.raw`$\gamma$ 为类时、类光或类空曲线；$\lambda$ 为仿射参数。`,
      String.raw`$\nabla$ 为给定联络；类光情形不能用 $u^au_a=-1$ 归一化。`,
    ],
    expressions: [
      tex(String.raw`t^a\nabla_at^b=0`),
      tex(String.raw`\frac{d^2x^\mu}{d\lambda^2}+\Gamma^\mu{}_{\nu\sigma}\frac{dx^\nu}{d\lambda}\frac{dx^\sigma}{d\lambda}=0`),
      tex(String.raw`\lambda\mapsto a\lambda+b\qquad(a\neq0)`),
    ],
    intuition: { zh: '切矢量沿自身平移，所以曲线不转弯。', en: 'The tangent transports into itself, so the curve does not turn.' },
    gaps: { zh: ['测地线只给局部极值，不是整体最短曲线；仿射参数之外会多出一项。'], en: ['Geodesics give local extremals, not global shortest curves; non-affine parameters introduce an extra term.'] },
  },
  'liang:riemann-tensor': {
    context: [
      String.raw`$(M,g,\nabla)$，$g$ 非退化，$\nabla$ 无挠且与 $g$ 适配；$\omega_c$ 为任意对偶矢量场。`,
      String.raw`符号约定按教材：$(\nabla_a\nabla_b-\nabla_b\nabla_a)\omega_c=R^d{}_{cab}\omega_d$。`,
    ],
    expressions: [
      tex(String.raw`(\nabla_a\nabla_b-\nabla_b\nabla_a)\omega_c=R^d{}_{cab}\omega_d`),
      tex(String.raw`R^\rho{}_{\sigma\mu\nu}=\partial_\mu\Gamma^\rho{}_{\nu\sigma}-\partial_\nu\Gamma^\rho{}_{\mu\sigma}+\Gamma^\rho{}_{\mu\lambda}\Gamma^\lambda{}_{\nu\sigma}-\Gamma^\rho{}_{\nu\lambda}\Gamma^\lambda{}_{\mu\sigma}`),
      tex(String.raw`R^a{}_{bcd}=-R^a{}_{bdc},\qquad R_{abcd}=-R_{bacd},\qquad R_{abcd}=R_{cdab}`),
    ],
    intuition: { zh: '曲率度量沿不同路径平移一圈后的差异。', en: 'Curvature measures the discrepancy of parallel transport around loops.' },
    gaps: { zh: [String.raw`曲率是 $\nabla$ 的性质，不是流形的性质；反对称性与 Bianchi 恒等式用到无挠。符号约定不同教材可能差一个号。`], en: [String.raw`Curvature belongs to $\nabla$, not to the manifold alone; antisymmetries and Bianchi identities use vanishing torsion. Sign conventions differ across textbooks.`] },
  },
  'liang:ricci-einstein': {
    context: [
      String.raw`$R^a{}_{bcd}$ 为黎曼张量；$g$ 非退化；缩并约定 $R_{ac}=R^b{}_{abc}$。`,
      String.raw`$G_{ab}$ 的定义不依赖场方程；$\nabla^aG_{ab}=0$ 是几何恒等式。`,
    ],
    expressions: [
      tex(String.raw`R_{ac}=R^b{}_{abc},\qquad R=g^{ab}R_{ab}`),
      tex(String.raw`G_{ab}=R_{ab}-\frac12Rg_{ab}`),
      tex(String.raw`\nabla^aG_{ab}=0`),
    ],
    intuition: { zh: '把黎曼张量缩并成体积变化的部分。', en: 'Contract the Riemann tensor to its volume-changing part.' },
    gaps: { zh: ['里奇张量丢掉 Weyl 部分，$R_{ab}=0$ 的真空区仍可弯曲；本稿不展开 Weyl 张量。'], en: ['The Ricci tensor discards the Weyl part, so a vacuum region with $R_{ab}=0$ can still be curved; the Weyl tensor is not developed here.'] },
  },
  'liang:intrinsic-extrinsic-curvature': {
    context: [
      String.raw`$S$ 为 $(M,g)$ 的子流形，余维 $1$；$h_{ab}$ 为诱导度规，$n^a$ 为法矢量；$\nabla$ 与 $g$ 适配。`,
      String.raw`$n^cn_c\neq0$（类空或类时法矢量）；外曲率 $K_{ab}$ 由嵌入方式给出。`,
    ],
    expressions: [
      tex(String.raw`h_{ab}=g_{ab}-\frac{n_an_b}{n^cn_c}`),
      tex(String.raw`K_{ab}=h_a{}^ch_b{}^d\nabla_cn_d`),
    ],
    intuition: { zh: '内禀曲率由诱导度规自己算出，外曲率记录嵌入方式。', en: 'Intrinsic curvature comes from the induced metric; extrinsic curvature records the embedding.' },
    gaps: { zh: ['外曲率不是内禀量：同一内禀几何可以有不同嵌入。柱面内禀平坦而外曲率非零；符号约定随法矢量定向。'], en: ['Extrinsic curvature is not intrinsic: one intrinsic geometry admits different embeddings. A cylinder is intrinsically flat but has nonzero extrinsic curvature; signs depend on the normal orientation.'] },
  },
  'liang:pushforward-pullback': {
    context: [
      String.raw`$\varphi:M\to N$ 光滑；$p\in M$，$v\in T_pM$，$\omega\in T^*_{\varphi(p)}N$。`,
      String.raw`推前把切矢量正向送出；拉回把对偶矢量反向送回。`,
    ],
    expressions: [
      tex(String.raw`(\varphi_*v)(f)=v(f\circ\varphi)`),
      tex(String.raw`(\varphi^*\omega)(v)=\omega(\varphi_*v)`),
      tex(String.raw`(\varphi^*\omega)_p=\omega_{\varphi(p)}\circ\varphi_{*,p}`),
    ],
    intuition: { zh: '矢量沿映射正向推，对偶矢量沿反向拉。', en: 'Push vectors forward, pull covectors back.' },
    gaps: { zh: [String.raw`推前矢量场需要 $\varphi$ 为微分同胚；拉回对任意光滑映射有定义。`], en: [String.raw`Pushing vector fields forward requires $\varphi$ to be a diffeomorphism; pullback is defined for any smooth map.`] },
  },
  'liang:lie-derivative': {
    context: [
      String.raw`$v$ 为 $M$ 上光滑矢量场，$\varphi_t$ 为其流；$T$ 为任意张量场。`,
      String.raw`李导数不需要联络或度规。`,
    ],
    expressions: [
      tex(String.raw`\mathcal L_vT=\left.\frac{d}{dt}\right|_{0}\varphi_{-t}^*T`),
      tex(String.raw`\mathcal L_vw=[v,w]=v^b\partial_bw^a-w^b\partial_bv^a`),
      tex(String.raw`\mathcal L_v(f)=v(f)`),
    ],
    intuition: { zh: '沿矢量场的流拖动张量，再对时间求导。', en: 'Drag the tensor along the flow and differentiate in time.' },
    gaps: { zh: [String.raw`李导数与协变导数不同：$\nabla$ 逐点比较，$\mathcal L$ 沿流比较；对矢量场它恰是李括号。`], en: [String.raw`The Lie derivative differs from the covariant derivative: $\nabla$ compares pointwise, $\mathcal L$ compares along the flow; on vector fields it is the Lie bracket.`] },
  },
  'liang:killing-field': {
    context: [
      String.raw`$(M,g)$，$\xi$ 为光滑矢量场；$\nabla$ 为与 $g$ 适配的 Levi-Civita 联络。`,
      String.raw`$n=\dim M$；$\xi$ 的积分曲线给出局部单参数等距群，整体性需额外假设。`,
    ],
    expressions: [
      tex(String.raw`\mathcal L_\xi g_{ab}=0`),
      tex(String.raw`\nabla_a\xi_b+\nabla_b\xi_a=0`),
      tex(String.raw`\dim\{Killing fields\}\le\frac{n(n+1)}2`),
    ],
    equivalents: [
      { markdown: String.raw`$\mathcal L_\xi g=0\iff\nabla_a\xi_b+\nabla_b\xi_a=0$`, conditions: [String.raw`$\nabla$ 与 $g$ 适配（$\nabla g=0$）`], status: 'REF' },
    ],
    intuition: { zh: String.raw`沿 $\xi$ 挪动时度规不变。`, en: String.raw`The metric is unchanged by dragging along $\xi$.` },
    gaps: { zh: [String.raw`写成 Killing 方程需要先取与度规适配的联络；定义本身是 $\mathcal L_\xi g=0$。达到 $n(n+1)/2$ 上界的分类未展开。`], en: [String.raw`Writing the Killing equation presupposes a metric-compatible connection; the definition itself is $\mathcal L_\xi g=0$. The classification at the bound $n(n+1)/2$ is not developed.`] },
  },
  'liang:hypersurface': {
    context: [
      String.raw`$S\subset M$ 余维 $1$，局部由 $S=\{f=\mathrm{const}\}$、$df\neq0$ 给出。`,
      String.raw`$n_a=\nabla_af$；$S$ 类空或类时，$n^an_a\neq0$；$\nabla$ 与 $g$ 适配。`,
    ],
    expressions: [
      tex(String.raw`n_a=\nabla_af,\qquad n^an_a\neq0`),
      tex(String.raw`h_{ab}=g_{ab}-\frac{n_an_b}{n^cn_c}`),
      tex(String.raw`K_{ab}=h_a{}^ch_b{}^d\nabla_cn_d`),
    ],
    intuition: { zh: '用等值面的法余矢量把母流形结构诱导到余维 $1$ 子流形上。', en: 'Induce ambient structure on a codimension-one submanifold via the normal covector.' },
    gaps: { zh: [String.raw`零超曲面（如事件视界）不能归一化，诱导度规退化；$f=\mathrm{const}$ 只是局部刻画。`], en: ['Null hypersurfaces such as event horizons cannot be normalized and have degenerate induced metrics; the level-set description is local only.'] },
  },
  'liang:differential-form': {
    context: [
      String.raw`$M$ 为光滑 $n$ 维流形；$\Omega^p(M)$ 为全反称 $(0,p)$ 型张量场。`,
      String.raw`$\omega\in\Omega^p(M)$，$\eta\in\Omega^q(M)$；外积双线性且分次交换。`,
    ],
    expressions: [
      tex(String.raw`\omega\wedge\eta=(-1)^{pq}\eta\wedge\omega`),
      tex(String.raw`(\omega\wedge\eta)_{a_1\cdots a_{p+q}}=\frac{(p+q)!}{p!q!}\omega_{[a_1\cdots a_p}\eta_{a_{p+1}\cdots a_{p+q}]}`),
      tex(String.raw`\Omega^p(M)=\{0\}\qquad(p>n)`),
    ],
    intuition: { zh: '全反称的多重线性对象天然携带定向符号。', en: 'Totally antisymmetric multilinear objects carry orientation signs naturally.' },
    gaps: { zh: ['只压缩代数定义；外积结合律与分次 Leibniz 律未逐条列出。'], en: ['Only the algebraic definition is compressed; associativity and the graded Leibniz rule are not listed in full.'] },
  },
  'liang:exterior-derivative': {
    context: [
      String.raw`$d:\Omega^p(M)\to\Omega^{p+1}(M)$；$M$ 光滑。`,
      String.raw`$d$ 不依赖联络或度规；闭形式与恰当形式在每点逐次定义。`,
    ],
    expressions: [
      tex(String.raw`df(v)=v(f)`),
      tex(String.raw`d(\omega\wedge\eta)=d\omega\wedge\eta+(-1)^p\omega\wedge d\eta`),
      tex(String.raw`d^2=0`),
    ],
    equivalents: [
      { markdown: String.raw`在可缩区域上，$d\omega=0$ 当且仅当存在 $\eta$ 使 $\omega=d\eta$。`, conditions: [String.raw`区域可缩；$\omega$ 光滑`], status: 'REF' },
    ],
    intuition: { zh: '与坐标无关、且把边界代数化的导数。', en: 'A coordinate-free derivative that algebraizes the boundary.' },
    gaps: { zh: [String.raw`「恰当 $\Rightarrow$ 闭」恒成立；「闭 $\Rightarrow$ 恰当」只对可缩区域成立，一般由 de Rham 上同调度量障碍。本稿不展开上同调。`], en: ['Exact implies closed always; closed implies exact only on contractible regions, with the obstruction measured by de Rham cohomology. Cohomology is not developed here.'] },
  },
  'liang:volume-element': {
    context: [
      String.raw`$M$ 为可定向 $n$ 维流形；$\varepsilon$ 为处处非零的 $n$ 次形式。`,
      String.raw`有度规时按定向取 $\varepsilon=\sqrt{|\det g|}\,dx^1\wedge\cdots\wedge dx^n$；积分按该体元定义。`,
    ],
    expressions: [
      tex(String.raw`\varepsilon\in\Omega^n(M),\qquad \varepsilon|_p\neq0\ \ \forall p\in M`),
      tex(String.raw`\int_M f\,\varepsilon`),
      tex(String.raw`\varepsilon=\sqrt{|\det g|}\,dx^1\wedge\cdots\wedge dx^n`),
    ],
    intuition: { zh: '选一个处处非零的 $n$ 次形式，规定每小块的有向体积。', en: 'Choose a nowhere-zero $n$-form to assign oriented volume.' },
    gaps: { zh: ['不可定向流形（如 Möbius 带）上没有整体非零的 $n$ 次形式；没有度规时体元不唯一，积分值随选择改变。'], en: ['A nonorientable manifold such as a Möbius band admits no global nowhere-zero $n$-form; without a metric the volume element is not unique and integrals depend on the choice.'] },
  },
  'liang:stokes-theorem': {
    context: [
      String.raw`$M$ 为带边可定向 $n$ 维流形；$\omega\in\Omega^{n-1}(M)$ 具紧支集。`,
      String.raw`$\partial M$ 取诱导定向；$M$ 紧致时紧支集条件自动满足。`,
    ],
    expressions: [
      tex(String.raw`\int_Md\omega=\int_{\partial M}\omega`),
    ],
    intuition: { zh: String.raw`内部的 $d$ 积分等于边界上的值。`, en: 'The integral of $d\omega$ over the interior equals the boundary value.' },
    gaps: { zh: ['需要定向与紧支集（或 $M$ 紧致）；否则两边都可能不收敛。经典公式是其特例，本稿不逐一展开。'], en: ['Orientation and compact support (or compact $M$) are needed; otherwise either side may fail to converge. Classical formulas are special cases and are not expanded here.'] },
  },
  'liang:gauss-theorem': {
    context: [
      String.raw`$(M,g)$ 为可定向 $n$ 维流形；$*$ 为 Hodge 对偶，号差为 $s$。`,
      String.raw`$p$ 次形式与外积按定向定义；$s=\pm1$。`,
    ],
    expressions: [
      tex(String.raw`*:\Omega^p(M)\to\Omega^{n-p}(M)`),
      tex(String.raw`*(dx^{i_1}\wedge\cdots\wedge dx^{i_p})=\frac{\sqrt{|g|}}{(n-p)!}\varepsilon_{i_1\cdots i_p j_1\cdots j_{n-p}}dx^{j_1}\wedge\cdots\wedge dx^{j_{n-p}}`),
      tex(String.raw`*(*\omega)=(-1)^{p(n-p)}s\,\omega`),
    ],
    intuition: { zh: 'Hodge 对偶把 $p$ 次形式翻译成 $(n-p)$ 次形式，Gauss 定理是 Stokes 的对偶版本。', en: 'Hodge duality translates $p$-forms to $(n-p)$-forms; Gauss is Stokes dualized.' },
    gaps: { zh: ['对偶依赖度规与定向；没有度规时只能说存在把 $p$ 次形式配成 $(n-p)$ 次形式的同构。号差符号最易漏。'], en: ['Duality uses both metric and orientation; without a metric only a noncanonical isomorphism remains. The signature sign is the easiest omission.'] },
  },

  // ---- 第6章 狭义相对论 ----
  'liang:minkowski-spacetime': {
    context: [
      String.raw`$M\cong\mathbb R^4$；$\eta_{ab}=\mathrm{diag}(-1,1,1,1)$，号差 $(-,+,+,+)$；$c=1$。`,
      String.raw`$\Delta x^a$ 为两事件的坐标差；惯性系之间的坐标变换为 Poincaré 变换。`,
    ],
    expressions: [
      tex(String.raw`\eta_{ab}=\mathrm{diag}(-1,1,1,1)`),
      tex(String.raw`\eta_{ab}\Delta x^a\Delta x^b\begin{cases}<0&\text{timelike}\\=0&\text{null}\\>0&\text{spacelike}\end{cases}`),
      tex(String.raw`\eta^{ab}=(\eta^{-1})^{ab},\qquad \eta^{ab}\eta_{bc}=\delta^a{}_c`),
    ],
    intuition: { zh: String.raw`把时间与空间放进同一个度规，号差把一个方向单独分出来。`, en: String.raw`Put time and space in one metric, with a signature singling out one direction.` },
    gaps: { zh: [String.raw`洛伦兹度规不给出正长度，类时间隔平方为负；惯性系之间只允许 Poincaré 变换，不是任意坐标变换。`], en: [String.raw`A Lorentzian metric does not give positive lengths: timelike intervals have negative square. Inertial frames are related by Poincaré transformations, not arbitrary coordinate changes.`] },
  },
  'liang:inertial-observer': {
    context: [
      String.raw`$\gamma$ 为类时曲线，$u^a=dx^a/d\tau$，$u^au_a=-1$；$\nabla$ 为 Levi-Civita 联络。`,
      String.raw`惯性系是整体概念，只在平坦时空中存在。`,
    ],
    expressions: [
      tex(String.raw`u^a=\frac{dx^a}{d\tau},\qquad u^au_a=-1`),
      tex(String.raw`u^b\nabla_bu^a=0`),
    ],
    intuition: { zh: String.raw`惯性观者的世界线是类时测地线。`, en: String.raw`An inertial observer's worldline is a timelike geodesic.` },
    gaps: { zh: [String.raw`弯曲时空中一般只有局部惯性系；「观者」是世界线，不一定是人。`], en: [String.raw`In curved spacetime only local inertial frames generally exist; an observer is a worldline, not necessarily a person.`] },
  },
  'liang:proper-time': {
    context: [
      String.raw`世界线 $\Gamma$ 类时；$\tau$ 沿世界线；$t$ 为惯性系坐标时；$c=1$。`,
      String.raw`$v$ 为观者相对惯性系的速度；$\gamma=(1-v^2)^{-1/2}$。`,
    ],
    expressions: [
      tex(String.raw`d\tau=\sqrt{-\eta_{ab}dx^adx^b}`),
      tex(String.raw`d\tau=\frac{dt}{\gamma},\qquad \gamma=\frac1{\sqrt{1-v^2}}`),
    ],
    intuition: { zh: String.raw`固有时是观者自带钟沿世界线积出的读数。`, en: String.raw`Proper time is the reading of the observer's own clock along the worldline.` },
    gaps: { zh: [String.raw`固有时是世界线不变量，坐标时依赖参考系；类光曲线满足 $d\tau=0$，光子没有固有时。`], en: [String.raw`Proper time is a worldline invariant while coordinate time is frame-dependent; null curves have $d\tau=0$, so photons have no proper time.`] },
  },
  'liang:kinematic-effects': {
    context: [
      String.raw`闵氏时空；$v$ 为相对速度；$L_0$ 为固有长度；$\gamma=(1-v^2)^{-1/2}$；$c=1$。`,
      String.raw`长度测量依赖同时性约定；$\Delta\tau$ 为两条世界线的固有时之差。`,
    ],
    expressions: [
      tex(String.raw`L=\frac{L_0}{\gamma}`),
      tex(String.raw`d\tau=\frac{dt}{\gamma}`),
      tex(String.raw`\Delta\tau=\int_{\Gamma_1}d\tau-\int_{\Gamma_2}d\tau`),
    ],
    intuition: { zh: String.raw`同时性依赖参考系，长度与时间间隔的测量随之改变。`, en: String.raw`Simultaneity is frame-dependent, so length and time measurements change.` },
    gaps: { zh: [String.raw`尺缩是测量结果而非物体被压缩；孪子效应中两条世界线地位不对称，其中一条经历加速。`], en: [String.raw`Length contraction is a measurement result, not compression of the object; in the twin effect the two worldlines are not symmetric, since one undergoes acceleration.`] },
  },
  'liang:four-momentum': {
    context: [
      String.raw`$m>0$；$u^a$ 为 4 速；$p^a=mu^a$；$c=1$。`,
      String.raw`$\nabla$ 为 Levi-Civita 联络；$f^a$ 为 4 维力。`,
    ],
    expressions: [
      tex(String.raw`p^a=mu^a,\qquad p^ap_a=-m^2`),
      tex(String.raw`f^a=u^b\nabla_bp^a,\qquad f^au_a=0`),
    ],
    intuition: { zh: String.raw`把质量乘速度提升为 4 维矢量，静质量是其模长。`, en: String.raw`Lift mass times velocity to a four-vector whose norm is the rest mass.` },
    gaps: { zh: [String.raw`$m=0$ 的粒子不能写成 $p^a=mu^a$；时间分量与能量的对应依赖参考系。`], en: [String.raw`Massless particles cannot be written as $p^a=mu^a$; the correspondence between the time component and energy depends on the frame.`] },
  },
  'liang:energy-momentum-tensor': {
    context: [
      String.raw`$T_{ab}$ 为对称 $(0,2)$ 张量场；$\nabla$ 与 $g$ 适配。`,
      String.raw`理想流体：无粘滞、无热流；$\rho$ 为能量密度，$p$ 为压强，$u^a$ 为 4 速。`,
    ],
    expressions: [
      tex(String.raw`T_{ab}=T_{ba},\qquad \nabla^aT_{ab}=0`),
      tex(String.raw`T_{ab}=(\rho+p)u_au_b+pg_{ab}`),
    ],
    intuition: { zh: String.raw`每点每方向记录能量与动量的流动。`, en: String.raw`Record energy and momentum flow at each point and in each direction.` },
    gaps: { zh: [String.raw`守恒是协变守恒，一般不能写成坐标散度为零；理想流体假设去掉后要加粘滞与热流项。`], en: [String.raw`Conservation is covariant and generally cannot be written as an ordinary coordinate divergence; dropping the ideal-fluid assumption requires viscous and heat-flow terms.`] },
  },
  'liang:electromagnetic-tensor': {
    context: [
      String.raw`$F_{ab}$ 反对称；$A_a$ 为 4 势；$J^a$ 为电流；高斯单位制。`,
      String.raw`$\nabla$ 与 $g$ 适配；$F_{ab}=\nabla_aA_b-\nabla_bA_a$。`,
    ],
    expressions: [
      tex(String.raw`F_{ab}=\nabla_aA_b-\nabla_bA_a=-F_{ba}`),
      tex(String.raw`\nabla^aF_{ab}=-4\pi J_b,\qquad \nabla_{[a}F_{bc]}=0`),
      tex(String.raw`\nabla^aJ_a=0`),
    ],
    intuition: { zh: String.raw`电场与磁场是同一个反对称张量在不同惯性系下的分量。`, en: String.raw`Electric and magnetic fields are components of one antisymmetric tensor in different inertial frames.` },
    gaps: { zh: [String.raw`$\nabla_{[a}F_{bc]}=0$ 等价于局部存在 $A$；整体存在性受拓扑阻碍。`], en: [String.raw`$\nabla_{[a}F_{bc]}=0$ is equivalent to the local existence of $A$; global existence can be obstructed by topology.`] },
  },
  'liang:four-potential': {
    context: [
      String.raw`闵氏时空；Lorenz 规范 $\nabla^aA_a=0$；规范变换 $A_a\to A_a+\nabla_a\chi$。`,
      String.raw`$k^a$ 类光；$u^a$ 为观者 4 速；$c=1$。`,
    ],
    expressions: [
      tex(String.raw`\nabla^b\nabla_bA_a=-4\pi J_a`),
      tex(String.raw`\omega=-k_au^a`),
      tex(String.raw`A_a\to A_a+\nabla_a\chi,\qquad F_{ab}\ \text{unchanged}`),
    ],
    intuition: { zh: String.raw`用 4 势把麦氏方程化成二阶波动方程，规范变换不改变场。`, en: String.raw`A four-potential turns Maxwell into a second-order wave equation; gauge changes leave $F$ fixed.` },
    gaps: { zh: [String.raw`Lorenz 规范不是物理条件；弯曲时空中频率沿光线的变化需由 $k^a\nabla_a\omega$ 讨论。`], en: [String.raw`The Lorenz gauge is not a physical condition; in curved spacetime the change of frequency along a ray requires $k^a\nabla_a\omega$.`] },
  },

  // ---- 第7章 广义相对论基础 ----
  'liang:gravity-as-geometry': {
    context: [
      String.raw`理论公设；$g_{ab}$ 为时空度规；自由粒子沿测地线。`,
      String.raw`不把引力当作力；等效原理只作局部陈述。`,
    ],
    expressions: [
      tex(String.raw`\nabla_uu^a=0\qquad(\text{free particle})`),
      tex(String.raw`g_{ab}\ \text{encodes gravity}`),
    ],
    intuition: { zh: String.raw`把引力归入时空几何，自由粒子沿测地线运动。`, en: String.raw`Absorb gravity into spacetime geometry; free particles follow geodesics.` },
    gaps: { zh: [String.raw`这是理论选择而非定理；等效原理不逻辑推出「引力就是曲率」。`], en: [String.raw`This is a theoretical choice, not a theorem; the equivalence principle does not logically imply that gravity is curvature.`] },
  },
  'liang:equivalence-principle': {
    context: [
      String.raw`$p\in M$；黎曼法坐标；$g_{ab}(p)=\eta_{ab}$，$\Gamma^\mu{}_{\nu\sigma}(p)=0$。`,
      String.raw`局部陈述：只在一点及其邻域的特定阶成立。`,
    ],
    expressions: [
      tex(String.raw`g_{ab}(p)=\eta_{ab},\qquad \Gamma^\mu{}_{\nu\sigma}(p)=0`),
      tex(String.raw`R^\mu{}_{\nu\rho\sigma}(p)\neq0\quad\text{in general}`),
    ],
    intuition: { zh: String.raw`在一点附近总能选到让引力「局部消失」的坐标。`, en: String.raw`Near a point one can always choose coordinates where gravity locally disappears.` },
    gaps: { zh: [String.raw`曲率不能由坐标变换消去；等效原理本身推不出场方程。`], en: [String.raw`Curvature cannot be removed by coordinate changes; the equivalence principle alone does not yield the field equations.`] },
  },
  'liang:fermi-transport': {
    context: [
      String.raw`$\gamma$ 为任意类时世界线；$u^a$ 为 4 速；$a^a=u^b\nabla_bu^a$ 为 4 加速；$S^a$ 为自转矢量，$S^au_a=0$。`,
      String.raw`$\nabla$ 与 $g$ 适配。`,
    ],
    expressions: [
      tex(String.raw`u^b\nabla_bS^a=(S^ba_b)u^a-(u^bS_b)a^a`),
      tex(String.raw`a^a=0\Rightarrow u^b\nabla_bS^a=0`),
    ],
    intuition: { zh: String.raw`把平行移动推广到加速观者，使陀螺不产生人为自转。`, en: String.raw`Extend parallel transport to accelerated observers so gyroscopes do not acquire spurious rotation.` },
    gaps: { zh: [String.raw`费米移动只沿给定世界线定义；弯曲时空中「无自转」只能这样定义。`], en: [String.raw`Fermi transport is defined only along a given worldline; in curved spacetime non-rotation can only be defined this way.`] },
  },
  'liang:tidal-deviation': {
    context: [
      String.raw`$\gamma$ 为类时测地线，$u^a$ 为切矢量；$\xi^a$ 为相邻测地线的分离矢量，$\xi^au_a=0$。`,
      String.raw`$\nabla$ 与 $g$ 适配；$R^a{}_{cbd}$ 为黎曼张量。`,
    ],
    expressions: [
      tex(String.raw`u^b\nabla_b(u^c\nabla_c\xi^a)=-R^a{}_{cbd}u^cu^d\xi^b`),
      tex(String.raw`\frac{D^2\xi^a}{d\tau^2}=-R^a{}_{cbd}u^cu^d\xi^b`),
    ],
    intuition: { zh: String.raw`相邻自由落体的相对加速度由黎曼张量给出。`, en: String.raw`The relative acceleration of nearby free fallers is given by the Riemann tensor.` },
    gaps: { zh: [String.raw`方程只给二阶演化，需初值；曲率不能由坐标变换消去。`], en: [String.raw`The equation gives only second-order evolution and needs initial data; curvature cannot be removed by coordinate changes.`] },
  },
  'liang:einstein-equation': {
    context: [
      String.raw`几何单位制 $c=G=1$；$G_{ab}=R_{ab}-\frac12Rg_{ab}$；$\Lambda$ 为宇宙学常数；$T_{ab}$ 为能动张量。`,
      String.raw`场方程是理论公设；$\nabla^aG_{ab}=0$ 是几何恒等式。`,
    ],
    expressions: [
      tex(String.raw`G_{ab}+\Lambda g_{ab}=8\pi T_{ab}`),
      tex(String.raw`\nabla^aG_{ab}=0,\qquad \nabla^aT_{ab}=0`),
    ],
    intuition: { zh: String.raw`把时空曲率与物质能量按一个无散的张量方程联系起来。`, en: String.raw`Link spacetime curvature to matter energy through a divergence-free tensor equation.` },
    gaps: { zh: [String.raw`场方程是公设；$\Lambda$ 只能由观测确定；本站未复核任何观测拟合。`], en: [String.raw`The field equation is postulated; $\Lambda$ can only be fixed observationally, and no observational fit is checked here.`] },
  },
  'liang:linearized-gravity': {
    context: [
      String.raw`$g_{ab}=\eta_{ab}+h_{ab}$，$|h|\ll1$；谐和规范；$\bar h_{ab}=h_{ab}-\frac12\eta_{ab}h$；$c=G=1$。`,
      String.raw`牛顿极限另要求静态与低速。`,
    ],
    expressions: [
      tex(String.raw`\Box\bar h_{ab}=-16\pi T_{ab}`),
      tex(String.raw`\nabla^2\Phi=4\pi\rho`),
      tex(String.raw`\bar h_{ab}\ \text{propagates at }c`),
    ],
    intuition: { zh: String.raw`弱场下把度规写成平背景加小扰动，波动解立刻出现。`, en: String.raw`In weak fields, write the metric as a flat background plus a small perturbation; wave solutions follow.` },
    gaps: { zh: [String.raw`线性近似只在 $|h|\ll1$ 时可用；强场必须解非线性方程；牛顿极限还需静态与低速。`], en: [String.raw`The linear approximation requires $|h|\ll1$; strong fields need the nonlinear equations; the Newtonian limit also needs static and slow motion.`] },
  },

  // ---- 第8章 爱因斯坦方程的求解 ----
  'liang:static-stationary': {
    context: [
      String.raw`$(M,g)$ 有类时 Killing 场 $\xi^a$；$\nabla$ 与 $g$ 适配；$\xi^a$ 无旋条件 $\xi_{[a}\nabla_b\xi_{c]}=0$。`,
      String.raw`球对称要求存在 $SO(3)$ 等距作用，轨道为二维球面。`,
    ],
    expressions: [
      tex(String.raw`\mathcal L_\xi g_{ab}=0`),
      tex(String.raw`\xi_{[a}\nabla_b\xi_{c]}=0`),
      tex(String.raw`g_{ti}=0\qquad(\text{static coordinates})`),
    ],
    intuition: { zh: String.raw`用 Killing 场把「不随时间变」与「不转动」写成几何条件。`, en: String.raw`Killing fields encode time independence and non-rotation geometrically.` },
    gaps: { zh: [String.raw`Kerr 稳态但不静态；「看上去像球」不是球对称的定义。`], en: [String.raw`Kerr is stationary but not static; looking spherical is not the definition of spherical symmetry.`] },
  },
  'liang:schwarzschild-solution': {
    context: [
      String.raw`真空、静态、球对称；$r>r_s$；$r_s=2GM$；$c=G=1$；号差 $(-,+,+,+)$。`,
      String.raw`$d\Omega^2=d\theta^2+\sin^2\theta\,d\varphi^2$。`,
    ],
    expressions: [
      tex(String.raw`ds^2=-\left(1-\frac{r_s}{r}\right)dt^2+\left(1-\frac{r_s}{r}\right)^{-1}dr^2+r^2d\Omega^2`),
      tex(String.raw`r_s=2GM`),
      tex(String.raw`R_{ab}=0\qquad(r>r_s)`),
    ],
    intuition: { zh: String.raw`真空球对称的静态解被一个质量参数完全确定。`, en: String.raw`The static vacuum spherically symmetric solution is fixed by one mass parameter.` },
    gaps: { zh: [String.raw`$r=r_s$ 处度规分量发散但曲率标量有限，是坐标奇点；解只在真空区成立，恒星内部需另接内部解。`], en: [String.raw`At $r=r_s$ metric components diverge while curvature scalars stay finite, so it is a coordinate singularity; the solution holds only in the vacuum region, and an interior solution must be matched.`] },
  },
  'liang:birkhoff-theorem': {
    context: [
      String.raw`球对称真空区域；$T_{ab}=0$；$\Lambda=0$（按教材）。`,
      String.raw`在最大延拓的意义下讨论。`,
    ],
    expressions: [
      tex(String.raw`T_{ab}=0,\quad\text{spherical symmetry}\Rightarrow ds^2=ds^2_{\mathrm{Schwarzschild}}`),
    ],
    intuition: { zh: String.raw`球对称真空区必为施瓦西解，因此不会辐射引力波。`, en: String.raw`A spherically symmetric vacuum region must be Schwarzschild, so it cannot radiate gravitational waves.` },
    gaps: { zh: [String.raw`只对真空球对称区域成立；有物质时不适用；不排除球对称天体内部随时间演化。`], en: [String.raw`It applies only to a vacuum spherically symmetric region; it fails with matter present and does not exclude time evolution inside a spherically symmetric body.`] },
  },
  'liang:reissner-nordstrom': {
    context: [
      String.raw`球对称带电真空；$Q$ 为电荷；$r_s=2GM$；高斯单位制；$c=G=1$。`,
      String.raw`$F_{ab}$ 为电磁场张量；$d\Omega^2=d\theta^2+\sin^2\theta\,d\varphi^2$。`,
    ],
    expressions: [
      tex(String.raw`ds^2=-\left(1-\frac{r_s}{r}+\frac{Q^2}{r^2}\right)dt^2+\left(1-\frac{r_s}{r}+\frac{Q^2}{r^2}\right)^{-1}dr^2+r^2d\Omega^2`),
      tex(String.raw`F_{ab}=\frac{Q}{r^2}(dt)_a\wedge(dr)_b`),
    ],
    intuition: { zh: String.raw`电荷让球对称解多一个参数，并可能抹掉事件视界。`, en: String.raw`Charge adds a parameter to the spherically symmetric solution and can remove the event horizon.` },
    gaps: { zh: [String.raw`$|Q|$ 超临界时出现裸奇点；宇宙监督在已知解中不是自动成立。`], en: [String.raw`For supercritical $|Q|$ a naked singularity appears; cosmic censorship is not automatic in the known solutions.`] },
  },
  'liang:np-formalism': {
    context: [
      String.raw`零标架 $\{l^a,n^a,m^a,\bar m^a\}$；$l^an_a=-1$，$m^a\bar m_a=1$，其余内积为零。`,
      String.raw`$\Psi_0,\dots,\Psi_4$ 为 Weyl 张量的五个复分量。`,
    ],
    expressions: [
      tex(String.raw`l^an_a=-1,\qquad m^a\bar m_a=1`),
      tex(String.raw`\Psi_0,\Psi_1,\Psi_2,\Psi_3,\Psi_4`),
      tex(String.raw`\text{Petrov types: I, II, D, III, N, O}`),
    ],
    intuition: { zh: String.raw`换一组零标架，把二阶场方程化成一阶方程，并让曲率的代数分类可见。`, en: String.raw`A null tetrad turns second-order field equations into first-order ones and exposes algebraic curvature types.` },
    gaps: { zh: [String.raw`NP 形式是等价改写，不增加物理内容；坐标条件只是规范选取。`], en: [String.raw`The NP formalism is an equivalent rewrite with no added physics; coordinate conditions are gauge choices.`] },
  },

  // ---- 第9章 施瓦西时空 ----
  'liang:schwarzschild-geodesics': {
    context: [
      String.raw`施瓦西度规；$\xi^a=(\partial_t)^a$，$\psi^a=(\partial_\varphi)^a$；$E=-\xi^au_a$，$L=\psi^au_a$；$\dot{}=\mathrm d/\mathrm d\lambda$。`,
      String.raw`类时 $\epsilon=1$，类光 $\epsilon=0$；$u^au_a=-\epsilon$；$\lambda$ 为仿射参数。`,
    ],
    expressions: [
      tex(String.raw`E=-\xi^au_a,\qquad L=\psi^au_a`),
      tex(String.raw`\frac12\dot r^2+V_{\mathrm{eff}}(r)=\frac12E^2`),
      tex(String.raw`V_{\mathrm{eff}}(r)=\frac12\left(1-\frac{r_s}{r}\right)\left(\frac{L^2}{r^2}+\epsilon\right)`),
    ],
    intuition: { zh: String.raw`两个 Killing 场把测地线降成一维有效势问题。`, en: String.raw`Two Killing fields reduce geodesics to a one-dimensional effective potential.` },
    gaps: { zh: [String.raw`一般时空没有足够守恒量；类光情形不能按类时归一化。`], en: [String.raw`Generic spacetimes lack enough conserved quantities; the null case cannot be normalized as the timelike one.`] },
  },
  'liang:classical-tests': {
    context: [
      String.raw`施瓦西弱场；$r\gg r_s$；$a$ 为半长轴，$e$ 为离心率，$b$ 为瞄准距离；$c=G=1$。`,
      String.raw`$\Delta\varphi$ 为每圈附加进动；$\Delta\varphi_{\mathrm{light}}$ 为光线总偏折；后牛顿阶近似。`,
    ],
    expressions: [
      tex(String.raw`1+z=\left(1-\frac{r_s}{r}\right)^{-1/2}`),
      tex(String.raw`\Delta\varphi=\frac{6\pi GM}{a(1-e^2)}`),
      tex(String.raw`\Delta\varphi_{\mathrm{light}}=\frac{4GM}{b}`),
    ],
    intuition: { zh: String.raw`施瓦西解给出红移、进动与光线偏折三个可测数字。`, en: String.raw`Schwarzschild gives three measurable numbers: redshift, precession, and light bending.` },
    gaps: { zh: [String.raw`均为弱场后牛顿阶结果；不适用于强场；本站未复核观测数据。`], en: [String.raw`All three are weak-field post-Newtonian results, not strong-field tests; no observational data are checked here.`] },
  },
  'liang:stellar-interior': {
    context: [
      String.raw`球对称静态恒星；$p(r)$ 为压强，$\rho(r)$ 为能量密度，$m(r)$ 为质量函数；$G=c=1$。`,
      String.raw`表面 $r=R$ 处 $p(R)=0$，与外部施瓦西解衔接。`,
    ],
    expressions: [
      tex(String.raw`\frac{dp}{dr}=-\frac{(\rho+p)(m+4\pi r^3p)}{r(r-2m)}`),
      tex(String.raw`\frac{dm}{dr}=4\pi r^2\rho`),
      tex(String.raw`p(R)=0,\qquad m(R)=M`),
    ],
    intuition: { zh: String.raw`把球对称物质代进场方程，得到恒星内部的压强与质量分布。`, en: String.raw`Spherical matter in the field equations yields interior pressure and mass profiles.` },
    gaps: { zh: [String.raw`TOV 方程由 $\nabla^aT_{ab}=0$ 加球对称得到，不是独立方程；最大质量上限依赖物态方程。`], en: [String.raw`The TOV equation follows from $\nabla^aT_{ab}=0$ plus spherical symmetry and is not independent; the maximum mass depends on the equation of state.`] },
  },
  'liang:kruskal-extension': {
    context: [
      String.raw`施瓦西时空；Kruskal 坐标 $(U,V)$；最大延拓；$r>0$。`,
      String.raw`$r=r_s$ 对应 $UV=0$；$r=0$ 为曲率奇点。`,
    ],
    expressions: [
      tex(String.raw`ds^2=-F(r)\,dUdV+r^2d\Omega^2,\qquad F(r)>0`),
      tex(String.raw`UV=\left(\frac{r}{r_s}-1\right)e^{r/r_s}`),
      tex(String.raw`r=r_s\iff UV=0`),
    ],
    intuition: { zh: String.raw`换坐标把 $r=r_s$ 处的坐标奇点抹平，露出最大延拓的整体结构。`, en: String.raw`New coordinates remove the coordinate singularity at $r=r_s$ and reveal the maximal extension.` },
    gaps: { zh: [String.raw`延拓的唯一性需要「最大」条件；白洞区域的物理地位未定。`], en: [String.raw`Uniqueness of the extension needs maximality; the physical status of the white-hole region is not settled.`] },
  },
  'liang:schwarzschild-black-hole': {
    context: [
      String.raw`球对称坍缩；$r_s=2GM$；事件视界按「能否逃到无穷远」定义；$c=G=1$。`,
      String.raw`$\mathscr I^+$ 为未来类光无穷远。`,
    ],
    expressions: [
      tex(String.raw`\mathcal H=\left\{p\in M:\ \text{no future-directed causal curve from }p\text{ reaches }\mathscr I^+\right\}`),
      tex(String.raw`r=r_s`),
    ],
    intuition: { zh: String.raw`坍缩到视界以内后，连光都逃不出去。`, en: String.raw`Inside the horizon, even light cannot escape.` },
    gaps: { zh: [String.raw`事件视界是整体概念；$r=0$ 处经典理论失效，量子引力结论未定。`], en: [String.raw`The event horizon is a global notion; classical theory breaks down at $r=0$, and quantum-gravity conclusions remain open.`] },
  },

  // ---- 第10章 宇宙论 ----
  'liang:cosmological-principle': {
    context: [
      String.raw`时空分层 $\Sigma_t$；每层上物质分布均匀且各向同性；$k\in\{-1,0,+1\}$。`,
      String.raw`均匀各向同性只在足够大尺度上近似成立。`,
    ],
    expressions: [
      tex(String.raw`\Sigma_t\ \text{spacelike},\qquad \text{homogeneous and isotropic}`),
      tex(String.raw`k\in\{-1,0,+1\}`),
    ],
    intuition: { zh: String.raw`假设我们不在宇宙中的特殊位置，把均匀各向同性写成几何条件。`, en: String.raw`Assume no special position in the universe, encoding homogeneity and isotropy geometrically.` },
    gaps: { zh: [String.raw`只在足够大尺度上近似成立；原理不含动力学，不决定 $a(t)$。`], en: [String.raw`It holds only approximately on large scales; the principle contains no dynamics and does not determine $a(t)$.`] },
  },
  'liang:rw-metric': {
    context: [
      String.raw`$k\in\{-1,0,+1\}$；$a(t)>0$；$d\Omega^2=d\theta^2+\sin^2\theta\,d\varphi^2$；$c=1$。`,
      String.raw`空间截面为最大对称空间。`,
    ],
    expressions: [
      tex(String.raw`ds^2=-dt^2+a^2(t)\left[\frac{dr^2}{1-kr^2}+r^2d\Omega^2\right]`),
    ],
    intuition: { zh: String.raw`宇宙学原理把度规定到只剩一个尺度因子。`, en: String.raw`The cosmological principle leaves only one scale factor in the metric.` },
    gaps: { zh: [String.raw`$k$ 的数值依赖 $a$ 的归一化；有几何意义的是 $k/|a|^2$ 这类组合。`], en: [String.raw`The numerical value of $k$ depends on the normalization of $a$; combinations such as $k/|a|^2$ carry geometric meaning.`] },
  },
  'liang:hubble-redshift': {
    context: [
      String.raw`RW 度规；$a(t)$ 为尺度因子；$z$ 为红移；$H_0=\left.\dot a/a\right|_0$；低红移。`,
      String.raw`$c=1$；$d$ 为低红移下使用的距离。`,
    ],
    expressions: [
      tex(String.raw`1+z=\frac{a(t_{\mathrm{obs}})}{a(t_{\mathrm{em}})}`),
      tex(String.raw`z\approx H_0d\qquad(z\ll1)`),
    ],
    intuition: { zh: String.raw`光在膨胀时空中传播时波长被拉长，红移记录尺度因子的变化。`, en: String.raw`Wavelengths stretch during propagation; redshift records the change in the scale factor.` },
    gaps: { zh: [String.raw`宇宙学红移不是多普勒效应；$H_0$ 的测量依赖距离阶梯，系统误差仍有争论。`], en: [String.raw`Cosmological redshift is not a Doppler effect; measuring $H_0$ relies on the distance ladder, and systematic discrepancies remain debated.`] },
  },
  'liang:scale-factor': {
    context: [
      String.raw`RW 度规；$\rho$ 为能量密度，$p$ 为压强；$k$；$\Lambda$；$c=G=1$。`,
      String.raw`三个方程中两个独立。`,
    ],
    expressions: [
      tex(String.raw`\left(\frac{\dot a}{a}\right)^2=\frac{8\pi\rho}{3}-\frac{k}{a^2}+\frac{\Lambda}{3}`),
      tex(String.raw`\frac{\ddot a}{a}=-\frac{4\pi(\rho+3p)}{3}+\frac{\Lambda}{3}`),
      tex(String.raw`\dot\rho+3\frac{\dot a}{a}(\rho+p)=0`),
    ],
    intuition: { zh: String.raw`把 RW 度规代进场方程，膨胀史由能量组分与曲率决定。`, en: String.raw`Insert the RW metric into the field equations; expansion is fixed by energy content and curvature.` },
    gaps: { zh: [String.raw`只有两个独立方程；$\Lambda>0$ 的静态解不稳定。`], en: [String.raw`Only two of the three equations are independent; the static solution with $\Lambda>0$ is unstable.`] },
  },
  'liang:thermal-history': {
    context: [
      String.raw`膨胀宇宙；辐射温度 $T\propto1/a$；共形时间 $\int dt/a$；粒子视界。`,
      String.raw`具体阶段划分依赖粒子物理模型。`,
    ],
    expressions: [
      tex(String.raw`T\propto\frac1a`),
      tex(String.raw`\eta=\int\frac{dt}{a}`),
      tex(String.raw`d_{\mathrm{ph}}(t)=a(t)\int_0^t\frac{dt'}{a(t')}`),
    ],
    intuition: { zh: String.raw`把膨胀倒过来读，宇宙过去更热更密，热历史由此展开。`, en: String.raw`Read expansion backwards: the universe was hotter and denser, yielding a thermal history.` },
    gaps: { zh: [String.raw`具体阶段依赖粒子物理模型；暗物质微观身份未定。`], en: [String.raw`The stage divisions depend on particle-physics models; the microscopic identity of dark matter is undetermined.`] },
  },
  'liang:inflation': {
    context: [
      String.raw`极早期加速膨胀 $\ddot a>0$；共形时间被拉长；解决视界与平直性疑难。`,
      String.raw`一类模型，不是单一理论。`,
    ],
    expressions: [
      tex(String.raw`\ddot a>0`),
      tex(String.raw`\int\frac{dt}{a}\ \text{increases significantly}`),
    ],
    intuition: { zh: String.raw`极早期加速膨胀把今天可观测的区域在暴涨前压到因果相连的小尺度。`, en: String.raw`Early acceleration brings today's observable region from a tiny causal patch.` },
    gaps: { zh: [String.raw`暴涨是一类模型；预言符合观测不等于机制确认；不解释奇点本身。`], en: [String.raw`Inflation is a class of models; agreement with observation does not confirm the mechanism, and it does not explain the singularity itself.`] },
  },
  'liang:new-standard-cosmology': {
    context: [
      String.raw`$\Lambda$CDM；忽略辐射时 $\Omega_\Lambda+\Omega_m+\Omega_k\approx1$；$w=p/\rho$；$w\approx-1$。`,
      String.raw`暗能量与宇宙学常数在现有观测下不可区分。`,
    ],
    expressions: [
      tex(String.raw`\Omega_\Lambda+\Omega_m+\Omega_k\simeq1`),
      tex(String.raw`w=\frac{p}{\rho}\approx-1`),
    ],
    intuition: { zh: String.raw`用宇宙学常数加冷暗物质拟合当前的加速膨胀。`, en: String.raw`Fit the current accelerated expansion with a cosmological constant plus cold dark matter.` },
    gaps: { zh: [String.raw`暗能量与 $\Lambda$ 尚不可区分；$w$ 是否随时间变化是开放问题。`], en: [String.raw`Dark energy and $\Lambda$ are not yet distinguishable; whether $w$ varies with time is open.`] },
  },

  // ---- 方法节点 ----
  'liang:method-index-balance': {
    context: [
      String.raw`输入：用抽象指标写出的候选张量等式；已知各符号类型与 $g_{ab}$。`,
      String.raw`输出：配平后的等式，或指出类型错误的位置。`,
    ],
    expressions: [
      tex(String.raw`T^a{}_b=S^a{}_b\qquad(\text{legal})`),
      tex(String.raw`T^a{}_b=S_aV^b\qquad(\text{illegal: free indices differ in type})`),
      tex(String.raw`g_{ab}T^b{}_c=T_a{}_c,\qquad g^{ab}T_{bc}=T^a{}_c`),
    ],
    intuition: { zh: String.raw`先配平指标类型，再谈等式是否成立。`, en: String.raw`Balance index types before asking whether the equation is true.` },
    gaps: { zh: [String.raw`配平只排除类型错误，不证明等式成立。`], en: [String.raw`Balancing excludes type errors only; it does not prove the equation.`] },
  },
  'liang:method-metric-curvature': {
    context: [
      String.raw`输入：坐标卡下的度规分量 $g_{\mu\nu}(x)$；度规非退化。`,
      String.raw`输出：$\Gamma^\mu{}_{\nu\sigma}$、$R^\rho{}_{\sigma\mu\nu}$、$R_{\mu\nu}$、$R$；只给该卡分量。`,
    ],
    expressions: [
      tex(String.raw`g_{\mu\nu}\longrightarrow\Gamma^\mu{}_{\nu\sigma}\longrightarrow R^\rho{}_{\sigma\mu\nu}\longrightarrow R_{\mu\nu}\longrightarrow R`),
      tex(String.raw`R^\rho{}_{\sigma\mu\nu}=\partial_\mu\Gamma^\rho{}_{\nu\sigma}-\partial_\nu\Gamma^\rho{}_{\mu\sigma}+\Gamma^\rho{}_{\mu\lambda}\Gamma^\lambda{}_{\nu\sigma}-\Gamma^\rho{}_{\nu\lambda}\Gamma^\lambda{}_{\mu\sigma}`),
      tex(String.raw`\nabla^aG_{ab}=0\qquad(\text{check})`),
    ],
    intuition: { zh: String.raw`从度规出发，按固定顺序算出各阶曲率，并用恒等式自查。`, en: String.raw`From the metric, compute curvature in a fixed order and self-check with identities.` },
    gaps: { zh: [String.raw`只适用于已写出度规分量的情形；不解决「怎么猜度规」。`], en: [String.raw`It applies only once metric components are given; it does not address how to guess a metric.`] },
  },
  'liang:method-symmetry-conservation': {
    context: [
      String.raw`输入：度规与待求测地线；至少一个 Killing 场；$\dot{}=\mathrm d/\mathrm d\lambda$，$\lambda$ 为仿射参数。`,
      String.raw`输出：守恒量与降维方程；没有 Killing 场时不适用。`,
    ],
    expressions: [
      tex(String.raw`\xi^au_a=\mathrm{const}`),
      tex(String.raw`u^au_a=-1\ \text{or}\ 0`),
      tex(String.raw`\frac12\dot r^2+V_{\mathrm{eff}}(r)=\frac12E^2`),
    ],
    intuition: { zh: String.raw`把几何的对称性直接翻译成沿测地线的守恒量。`, en: String.raw`Translate geometric symmetry directly into conserved quantities along geodesics.` },
    gaps: { zh: [String.raw`守恒量个数等于独立 Killing 场个数；没有对称性时本方法不适用，但不等于测地线不可解。`], en: [String.raw`The number of conserved quantities equals the number of independent Killing fields; without symmetry the method does not apply, but geodesics need not be unsolvable.`] },
  },
};

/** Exact declaration anchors in the M/L pilot; notation condenses their HOL sources. */
export const MASTER_OBJECT_PRESENTATIONS = {
  'obj:group:mul': { symbol: tex(String.raw`\mu:G\times G\to G`) },
  'obj:group:e': { symbol: tex(String.raw`e\in G`) },
  'obj:group:right-unit': { condition: tex(String.raw`\forall x\in G:\quad\mu(x,e)=x`) },
  'obj:group:left-mul': { definition: tex(String.raw`L:G\to G^G,\qquad L_g(x)=\mu(g,x)`) },
  'obj:group:injective': { claim: tex(String.raw`\left(\forall x\in G:\mu(x,e)=x\right)\Rightarrow\forall g,h\in G:\left[\left(\forall x\in G:\mu(g,x)=\mu(h,x)\right)\Rightarrow g=h\right]`) },
};

export const MASTER_OBJECT_INTUITIONS = {
  'obj:group:mul': '先声明二元运算，再区分它满足哪些规律。',
  'obj:group:e': '单位元素先作为参数，其规律由公式另行规定。',
  'obj:group:right-unit': '在右侧乘上这个元素，原元素不变。',
  'obj:group:left-mul': '固定第一个输入，把运算看成一个函数。',
  'obj:group:injective': '在共同右单位处取值，恢复左乘参数。',
  'obj:group:unit': '将符号、条件、映射与结论封装为可引用接口。',
  'obj:group:topic': '按明确成员组织这一有限映射表示片段。',
  'obj:group:subdiscipline': '在更高层组织已登记话题及其引用边界。',
};

// These stable identities were inspected for the named formal sections. Only the
// section's own blocks are selected: child teaching/proof sections are excluded.
export const MASTER_SECTION_SELECTIONS = Object.fromEntries([
  'dg:smooth-structure','dg:smooth-atlas','dg:smooth-embedding','dg:smooth-distribution',
  'dg:partition-of-unity','dg:metric-space','dg:metric-completeness','dg:tangent-vector-curve',
  'dg:tangent-vector-derivation','dg:tangent-coordinate-basis','dg:tangent-bundle','dg:smooth-vector-field',
  'dg:tensor','dg:differential-form','dg:form-wedge-product','dg:form-pullback',
  'dg:implicit-function-theorem','dg:inverse-function-theorem','dg:generalized-stokes-theorem','dg:poincare-lemma',
  'rudin:ordered-field','rudin:least-upper-bound','rudin:complex-field','rudin:derivative','rudin:riemann-stieltjes',
  'rudin:fundamental-theorem','rudin:uniform-convergence','rudin:algebraic-completeness','rudin:lebesgue-measure','rudin:measurable-function','rudin:lebesgue-integral',
  'jiang:matrix-operations','jiang:matrix-multiplication','jiang:elementary-matrix','jiang:invertible-matrix','jiang:block-matrix',
  'jiang:matrix-rank','jiang:matrix-equivalence','jiang:low-order-determinant','jiang:permutation-parity','jiang:determinant-definition',
  'jiang:determinant-properties','jiang:cofactor-expansion','jiang:determinant-multiplicative','jiang:cramer-rule','jiang:column-vector-space',
  'jiang:linear-dependence','jiang:maximal-independent-set','jiang:basis-dimension','jiang:coordinate-transition','jiang:solution-structure',
  'jiang:inner-product','jiang:orthogonalization','jiang:bilinear-quadratic-form','jiang:quadratic-normal-form','jiang:positive-definite',
  'jiang:polynomial-ring','jiang:division-algorithm','jiang:gcd-polynomial','jiang:irreducible-polynomial','jiang:polynomial-function',
  'jiang:integer-polynomial','jiang:partial-fraction','jiang:chinese-remainder','jiang:vector-space-axioms','jiang:linear-map-matrix',
  'jiang:eigenvector','jiang:similar-criterion','jiang:fundamental-theorem-algebra-proof','jiang:isometry','jiang:self-adjoint-spectral',
  'jiang:minimax-principle','jiang:normal-operator-calculus','jiang:polar-svd','jiang:method-completing-square','jiang:method-euclidean-algorithm',
  'jiang:method-reduce-to-normal-form','vault:directional-derivative','field:field','field:rational','field:finite','field:extension',
].map(id => [id, {
  formal: ['标准形式','规范的通用形式','直觉与精确定义','形式与条件'],
  equivalents: id.startsWith('jiang:') ? ['等价表达与类别'] : [],
}]));
