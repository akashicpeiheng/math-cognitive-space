/**
 * 梁灿彬《微分几何入门与广义相对论》上册·凝练路径案例。
 *
 * 来源与身份（可核验）：
 * - 教材：梁灿彬、周彬《微分几何入门与广义相对论》上册（第二版），
 *   科学出版社，2006，现代物理基础丛书 7，ISBN 978-7-03-016460-5，xi + 442 页。
 *   本机只读扫描件：`reference/foundation of modern physics Series 7 …pdf`（464 页）。
 * - 章节与页码依据该扫描件自带的目录页（§ 编号与页码在文本层中未受损），
 *   并与科学出版社官网图书页（goods.php?id=154081）公布的目录逐条对齐；
 *   两处一致，见 `data/cases/07-liang-dg.md` 的文件头记录。
 * - 知识点清单依据作者本机的笔记目录（`nodes/catalogs/` 下的教材知识点节点清单，
 *   不随本仓库分发）；本案例把它**凝练**为
 *   上册十章各 3–7 个里程碑节点，不是原清单的逐条搬运，也不含下册专题。
 *
 * 证据纪律：
 * - 本站的正文块是**凝练笔记**，不是教材原文的替代，也没有转录教材中的完整证明。
 *   因此证据一律登记为 `kind: 'reference'`、`checkStatus: 'not_run'`，
 *   `reference` 写到章节号，obligations 写明「未编码为 ND 证书」与「未逐页核对教材原文」。
 * - `status` 按「教材里有什么」取值，而不是按「本站证明了什么」：概念类取 `DEF`，
 *   教材给出论证的定理取 `PROOF`（含义是「教材有论证」，本站没有转录也没有复核），
 *   场方程这类公设降为 `DEF`。方法节点是操作步骤而不是命题，同样取 `DEF`。
 * - 不签发 FINITE 或「已认证」结论；`teaching.evidenceStatus` 只表示
 *   「该命题在教材中有论证」，不表示本站已经验证过那份论证。
 * - 扫描件的文本层是**有损**的（抽样 111 个不同字形码，无法还原汉字），
 *   因此本案例不引用扫描件的文字，只引用它的目录结构与页码。
 */
import {
  concept, claim, patternNode, method,
  action, input, output, relation, evidence, support, claimRecord, selfCheck,
} from '../authoring.mjs';

const BOOK = '梁灿彬、周彬《微分几何入门与广义相对论》上册（第二版），科学出版社，2006（现代物理基础丛书 7，ISBN 978-7-03-016460-5）';
const provenanceNote = '正文为本站凝练笔记，不是教材原文的替代；完整论证与逐条件反例见教材对应章节。';

const source = (chapter, section) => `${BOOK} ${chapter} ${section}`;

/** 概念节点：对象类型 + 参数 + 分类谓词 + 边界。 */
function C(slug, title, chapter, section, discipline, objectType, parameters, predicate, boundary) {
  return { kind: 'concept', slug, title, chapter, section, discipline, objectType, parameters, predicate, boundary };
}

/** 断言节点：Claim + 角色（Theorem / Property / Axiom），formula 为公式本身。 */
function T(slug, title, chapter, section, discipline, role, formula, boundary) {
  return { kind: 'claim', slug, title, chapter, section, discipline, role, predicate: formula, boundary };
}

/**
 * 上册十章的知识点凝练：每章 3–7 个里程碑。
 * 顺序即教材顺序，`section` 为教材小节号，便于逐条回查。
 */
const spec = [
  // ---- 第1章 拓扑空间简介（印刷 1–14）----
  C('topological-space', '拓扑空间', '第1章 拓扑空间简介', '§1.2', '拓扑',
    '集合与开集族', ['X', 'T'],
    'T ⊆ P(X) 且 ∅, X ∈ T；T 对有限交封闭、对任意并封闭；T 的成员称为开集',
    ['拓扑公理本身不含分离性：去掉 Hausdorff 之后极限可以不唯一。',
      '拓扑不是集合自带的：同一集合上可以放离散拓扑与平凡拓扑，它们给出不同的收敛行为。']),
  C('continuous-map', '连续映射与同胚', '第1章 拓扑空间简介', '§1.2', '拓扑',
    '拓扑空间之间的映射', ['f', 'X', 'Y'],
    'f: X → Y 连续当且仅当 Y 中任一开集的原像在 X 中开；f 是同胚当且仅当 f 是一一对应且 f 与 f⁻¹ 都连续',
    ['连续性相对于两侧的拓扑而言：换掉任一侧的拓扑，同一映射就可能不连续。',
      '同胚保持拓扑性质，不保持长度、角度与曲率；它不是「形状相同」。']),
  C('compactness', '紧致性', '第1章 拓扑空间简介', '§1.3〔选读〕', '拓扑',
    '拓扑空间或其子集的性质', ['X', '{U_α}'],
    'X 的任一开覆盖都有有限子覆盖',
    ['紧致是拓扑性质，同胚不变；在一般拓扑空间中紧致不蕴含序列紧，后者还需要第一可数。',
      '紧致性本身不含度量信息：「有界闭」只在 R^n 中与紧致等价。']),

  // ---- 第2章 流形和张量场（印刷 15–54）----
  C('manifold', '微分流形', '第2章 流形和张量场', '§2.1', '微分几何',
    '带光滑图册的拓扑空间', ['M', 'n', 'A'],
    'M 为 Hausdorff、第二可数的拓扑空间，存在开覆盖 {U_α} 与同胚 φ_α: U_α → R^n 的开子集，使所有重叠上的坐标变换 φ_β∘φ_α⁻¹ 为 C^∞',
    ['坐标是局部的：一般不存在覆盖整个流形的单张图（S² 至少需要两张球极投影图）。',
      '第二可数不可删：去掉它会失去单位分解，从而失去「局部定义整体化」的工具。']),
  C('tangent-vector', '切矢量', '第2章 流形和张量场', '§2.2.1', '微分几何',
    '光滑流形在一点处的切矢量', ['v', 'p', 'M'],
    '过 p 的光滑曲线按「在某张坐标卡下 (φ∘γ)′(0) 相同」取等价类，每个等价类即 p 处的一个切矢量；T_pM 是 n 维实矢量空间',
    ['等价类的定义依赖光滑结构，但不依赖坐标卡的选取；只有 C^0 结构时无法这样定义。',
      '切矢量不是「从 p 伸出的箭头」：它不携带曲线的整体信息，只保留一阶行为。']),
  C('vector-field', '矢量场', '第2章 流形和张量场', '§2.2.2', '微分几何',
    '切丛的光滑截面', ['v', 'M'],
    'v 为映射 M → TM 且 π∘v = id_M，在任一坐标卡下分量 v^μ(x) 为 C^∞ 函数',
    ['光滑性是局部性质，用覆盖的每一张卡判定都必须成立，只验一张不够。',
      '矢量场与「一族切矢量」不同：后者不需要任何光滑性或连续性。']),
  C('dual-vector-field', '对偶矢量场', '第2章 流形和张量场', '§2.3', '微分几何',
    '余切丛的光滑截面', ['ω', 'M'],
    'ω: M → T*M 光滑，且 ω|_p ∈ T*_pM 是 T_pM 上的线性函数；df 由 df(v) = v(f) 定义',
    ['对偶矢量与矢量不是同一空间的对象；没有度规时两者不能自然等同。',
      'df 只用到 f 的一阶信息：f 为常数时 df = 0，反之在连通流形上亦真。']),
  C('tensor-field', '张量场与缩并', '第2章 流形和张量场', '§2.4', '微分几何',
    '(k, l) 型多重线性映射场', ['T', 'M', 'k', 'l'],
    'T 在每点把 k 个对偶矢量与 l 个矢量映为实数、对各变量线性，且在各坐标卡下分量为 C^∞ 函数；缩并是把一个上指标与一个下指标配对的线性运算',
    ['缩并必须一上一下配对：两个同类型上指标不能相缩。',
      '「分量按张量变换律变化」是判据而不是定义；先有定义才谈得上判据。']),
  C('metric-tensor', '度规张量场', '第2章 流形和张量场', '§2.5', '微分几何',
    '对称非退化的 (0,2) 型张量场', ['g', 'M'],
    'g 为 M 上对称、非退化的 (0,2) 型光滑张量场，在每点给出切空间上的对称双线性型，可用于升降指标并给出线元 ds² = g_{μν} dx^μ dx^ν',
    ['非退化不可删：退化时逆度规不存在，指标升降失效。',
      '黎曼度规要求正定，洛伦兹度规只要求非退化且号差为 (−,+,+,+)；后者不给出「长度为正」的度量。']),
  C('abstract-index', '抽象指标记号', '第2章 流形和张量场', '§2.6', '微分几何',
    '张量的指标写法约定', ['T^a{}_b', 'a, b, c, …'],
    '抽象指标只标记张量的类型与缩并配对，不依赖任何坐标基；等式两边的自由指标必须上下一一配平',
    ['抽象指标不是分量指标：写 T^a{}_b 时并未取任何基。',
      '配平规则是记号的合法性条件，不是数学结论；漏掉它会写出无意义的等式。']),

  // ---- 第3章 黎曼（内禀）曲率张量（印刷 55–85）----
  C('derivative-operator', '导数算符', '第3章 黎曼（内禀）曲率张量', '§3.1', '微分几何',
    '把 (k, l) 型张量场映为 (k, l+1) 型张量场的算子', ['∇', 'M'],
    '∇ 满足线性性、Leibniz 律、与缩并交换，且对函数的作用等于外微分：∇_a f = df',
    ['「与缩并交换」不可删：去掉它会得到只在特定坐标下才像导数的伪算子。',
      '一般流形上没有自然的导数算符；∇ 是额外结构，不是流形自带的。']),
  C('christoffel', '与度规适配的导数算符与克氏符', '第3章 黎曼（内禀）曲率张量', '§3.2.2', '微分几何',
    '满足无挠且与度规适配的导数算符', ['∇', 'g', 'Γ^μ{}_{νσ}'],
    '存在唯一导数算符 ∇ 同时满足 ∇_a g_{bc} = 0 与挠率 T^c{}_{ab} = 0；其分量为 Γ^μ{}_{νσ} = ½ g^{μρ}(∂_ν g_{ρσ} + ∂_σ g_{ρν} − ∂_ρ g_{νσ})',
    ['唯一性同时用到「适配」与「无挠」：只要求适配会得到无穷多个联络。',
      '克氏符不是张量：它在坐标变换下带一个非齐次项，因此「Γ 在某点为 0」不是坐标无关的陈述。']),
  C('parallel-transport', '沿曲线的平移', '第3章 黎曼（内禀）曲率张量', '§3.2.1', '微分几何',
    '沿曲线搬运切矢量的操作', ['γ', 'v', '∇'],
    '沿曲线 γ 平移的矢量满足 t^a∇_a v^b = 0；由此定义矢量沿曲线的导数 t^a∇_a v^b',
    ['平移依赖曲线：一般流形上沿不同曲线把同一矢量搬到同一点，结果可以不同——这正是曲率的来源。',
      '平移是沿曲线的，不能脱离曲线谈「把两点的矢量平移过去」。']),
  C('geodesic', '测地线', '第3章 黎曼（内禀）曲率张量', '§3.3', '微分几何',
    '切矢量沿自身平移的曲线', ['γ', 'λ'],
    '测地线满足 t^a∇_a t^b = 0；在坐标下为 d²x^μ/dλ² + Γ^μ{}_{νσ} (dx^ν/dλ)(dx^σ/dλ) = 0，λ 称为仿射参数',
    ['仿射参数只允许再作仿射变换 λ ↦ aλ + b；换成非仿射参数，方程会多出一项。',
      '测地线只给出局部极值，不是整体最短曲线；球面上大圆是测地线，但绕行多圈后不再是短的。']),
  C('riemann-tensor', '黎曼曲率张量', '第3章 黎曼（内禀）曲率张量', '§3.4.1', '微分几何',
    '(1,3) 型张量场', ['R^a{}_{bcd}', '∇'],
    'R^a{}_{bcd} 由两个导数算符的对易子定义：(∇_a∇_b − ∇_b∇_a)ω_c = R^d{}_{cab}ω_d；它度量沿不同曲线平移一圈后的差异',
    ['曲率是 ∇ 的性质，不是流形的性质：同一流形上不同联络给出不同曲率。',
      'R^a{}_{bcd} 的反对称性、配对对称性与 Bianchi 恒等式用到无挠；去掉无挠它们不再成立。']),
  C('ricci-einstein', '里奇张量、标量曲率与爱因斯坦张量', '第3章 黎曼（内禀）曲率张量', '§3.4.2', '微分几何',
    '黎曼张量的缩并', ['R_{ab}', 'R', 'G_{ab}'],
    'R_{ac} = R^b{}_{abc}，R = g^{ab}R_{ab}，G_{ab} = R_{ab} − ½ R g_{ab}；由 Bianchi 恒等式得 ∇^a G_{ab} = 0',
    ['里奇张量丢掉黎曼张量的全部信息：Weyl 张量部分对里奇无贡献，因此真空区（R_{ab} = 0）仍可以弯曲。',
      '∇^a G_{ab} = 0 是几何恒等式，先于任何场方程成立。']),
  C('intrinsic-extrinsic-curvature', '内禀曲率与外曲率', '第3章 黎曼（内禀）曲率张量', '§3.5', '微分几何',
    '子流形的两类弯曲', ['h_{ab}', 'K_{ab}'],
    '内禀曲率由子流形上诱导度规按自身的黎曼张量算出；外曲率 K_{ab} 由子流形在母流形中的嵌入方式给出（法矢量沿切方向导数的一半）',
    ['外曲率不是子流形内禀的：同一内禀几何可以有不同嵌入，从而有不同外曲率。',
      '柱面内禀平坦（黎曼张量为零）而外曲率非零，是二者互不推出的标准例子。']),

  // ---- 第4章 李导数、Killing场和超曲面（印刷 86–104）----
  C('pushforward-pullback', '流形间的映射、推前与拉回', '第4章 李导数、Killing场和超曲面', '§4.1', '微分几何',
    '光滑映射诱导的映射', ['φ', 'φ_*', 'φ^*'],
    'φ: M → N 诱导推前 φ_*: T_pM → T_{φ(p)}N 与拉回 φ^*: T^*_{φ(p)}N → T^*_pM，满足 φ_*(v)(f) = v(f∘φ)',
    ['推前把矢量正向送过去，对函数却是拉回；φ 非单射时不能用 φ_* 把 N 上的矢量场拉到 M 上。',
      '推前与拉回互为逆只在 φ 是微分同胚时成立。']),
  C('lie-derivative', '李导数', '第4章 李导数、Killing场和超曲面', '§4.2', '微分几何',
    '沿矢量场的流定义的张量场导数', ['L_v', 'v', 'T'],
    'L_v T = lim_{t→0} (φ_{-t}^* T − T)/t，其中 φ_t 是 v 生成的单参数微分同胚群；对矢量场有 L_v w = [v, w]',
    ['李导数不需要任何额外结构（不需要联络），因此它与 ∇ 是两个不同的算子。',
      '对矢量场，李导数就是李括号；它不是「分量逐个求方向导数」。']),
  C('killing-field', 'Killing 矢量场', '第4章 李导数、Killing场和超曲面', '§4.3', '微分几何',
    '保持度规的矢量场', ['ξ', 'g'],
    'L_ξ g_{ab} = 0，等价于 Killing 方程 ∇_a ξ_b + ∇_b ξ_a = 0；其积分曲线是单参数等距群',
    ['写成 ∇_a ξ_b + ∇_b ξ_a = 0 需要先取与度规适配的 ∇；定义本身是 L_ξ g = 0。',
      'n 维时空最多有 n(n+1)/2 个独立 Killing 场；达到上限即最大对称时空，闵氏与常曲率时空是仅有的例子。']),
  C('hypersurface', '超曲面与法矢量', '第4章 李导数、Killing场和超曲面', '§4.4', '微分几何',
    '余维 1 的子流形及其诱导结构', ['S', 'n_a', 'h_{ab}'],
    'S 局部由 f = const（df ≠ 0）给出时取法余矢量 n_a = ∇_a f；若 S 类空或类时，可归一化并诱导出 S 上的度规 h_{ab}',
    ['法矢量可以是类空的、类时的或零的；零超曲面（如事件视界）不能归一化，诱导度规退化。',
      'f = const 只是局部刻画：整体超曲面未必是某个函数的等值面，也未必可定向。']),

  // ---- 第5章 微分形式及其积分（印刷 105–131）----
  C('differential-form', '微分形式与外积', '第5章 微分形式及其积分', '§5.1', '微分几何',
    '全反称的 (0,p) 型张量场', ['ω', '∧'],
    'p 次形式在每点为全反称多重线性映射，全体记为 Ω^p(M)；外积满足 ω∧η = (−1)^{pq} η∧ω（ω、η 分别为 p、q 次）',
    ['全反称是定义的核心：把普通多重线性当形式，会在交换次序时算错符号。',
      'p > n 时 Ω^p(M) = {0}；这不是技术细节，而是外代数有限性的来源。']),
  C('exterior-derivative', '外微分与闭形式', '第5章 微分形式及其积分', '§5.1', '微分几何',
    'Ω^p(M) → Ω^{p+1}(M) 的算子', ['d', 'ω'],
    'd 由 df(v) = v(f) 与 d(ω∧η) = dω∧η + (−1)^p ω∧dη 唯一确定；恒有 d(dω) = 0；dω = 0 称闭，ω = dη 称恰当',
    ['「恰当 ⇒ 闭」恒成立；「闭 ⇒ 恰当」只对可缩区域成立，一般由 de Rham 上同调度量障碍。',
      'd 不需要任何额外结构，而 ∇ 需要联络：把两者混为一谈会丢失这个区别。']),
  C('volume-element', '体元与流形上的积分', '第5章 微分形式及其积分', '§5.4', '微分几何',
    '定向流形上的 n 次形式', ['ε', 'M'],
    '在带定向的 n 维流形上取处处非零的 n 次形式 ε 作为体元，并令 ∫_M f = ∫ f ε；度规存在时坐标下 ε = √|det g| dx¹∧…∧dxⁿ',
    ['体元需要定向；不可定向流形（如 Möbius 带）上不存在整体非零的 n 次形式。',
      '没有度规时体元不唯一：任一处处非零的 n 次形式都可充当体元，积分值随之改变。']),
  T('stokes-theorem', 'Stokes 定理', '第5章 微分形式及其积分', '§5.3', '微分几何', 'Theorem',
    '∫_M dω = ∫_{∂M} ω，其中 M 为带边定向 n 维流形、ω 为具紧支集的 (n−1) 次形式，∂M 取诱导定向',
    ['需要定向，也需要 ω 具紧支集（或 M 紧致）；否则两边都可能不收敛。',
      '它把 Newton–Leibniz 公式、Green 公式、Gauss 定理与经典 Stokes 公式统一为一条陈述。']),
  T('gauss-theorem', 'Gauss 定理与对偶微分形式', '第5章 微分形式及其积分', '§5.5–§5.6', '微分几何', 'Theorem',
    'Hodge 对偶 * 把 p 次形式线性同构到 (n−p) 次形式，*(dx^{i₁}∧…∧dx^{i_p}) = (√|g|/(n−p)!) ε_{i₁…i_p j₁…j_{n−p}} dx^{j₁}∧…；Gauss 定理即 Stokes 定理作用于对偶形式',
    ['Hodge 对偶依赖度规与定向；没有度规时只能说「把 p 次形式配成 (n−p) 次形式的同构」。',
      '*(*ω) = (−1)^{p(n−p)} s ω，符号由号差 s 决定，是最容易漏掉的一处。']),

  // ---- 第6章 狭义相对论（印刷 132–187）----
  C('minkowski-spacetime', '闵氏时空', '第6章 狭义相对论', '§6.1.2', '相对论与宇宙论',
    'R⁴ 上带洛伦兹度规的流形', ['η_{ab}', 'M'],
    'η_{ab} = diag(−1, 1, 1, 1)；两事件的间隔 η_{ab}Δx^aΔx^b 据此分为类时（< 0）、类光（= 0）与类空（> 0）',
    ['洛伦兹度规不给出「正的长度」：类时间隔的平方为负，因此不能把它当黎曼度规使用。',
      '惯性系之间的坐标变换是洛伦兹变换，而不是任意坐标变换；这是「时空是仿射空间 + 度规」的内容。']),
  C('inertial-observer', '惯性观者与惯性系', '第6章 狭义相对论', '§6.1.3', '相对论与宇宙论',
    '沿类时测地线运动的观者', ['γ', 'u^a'],
    '惯性观者的世界线是类时测地线，4 速 u^a = dx^a/dτ 满足 u^a u_a = −1 与 u^b∇_b u^a = 0',
    ['惯性系是整体概念，只在平坦时空中存在；弯曲时空中一般只有局部惯性系。',
      '「观者」是世界线而不是人：任何类时曲线都可以是某个观者的世界线，只是未必惯性。']),
  C('proper-time', '固有时与坐标时', '第6章 狭义相对论', '§6.1.4', '相对论与宇宙论',
    '沿观者世界线定义的时间参数', ['τ', 't'],
    '固有时由 dτ = √(−η_{ab}dx^a dx^b) 沿类时世界线定义；坐标时 t 是惯性系的坐标，二者由 dτ = dt/γ 联系',
    ['固有时是世界线的不变量，坐标时依赖参考系；两者只在观者自身处（且在其瞬时惯性系中）相等。',
      '类光曲线满足 dτ = 0：光子没有固有时，也没有「光子的钟」。']),
  C('kinematic-effects', '尺缩、钟慢与孪子效应', '第6章 狭义相对论', '§6.2', '相对论与宇宙论',
    '闵氏时空的运动学效应', ['L', 'τ', 'Δt'],
    '沿运动方向的长度测得 L = L₀/γ，钟慢给出 dτ = dt/γ，γ = 1/√(1−v²)；孪子效应的固有时差由两条世界线的长度不同给出',
    ['「尺缩」不是物体被压缩，而是同时性依赖参考系之后的测量结果。',
      '孪子效应不违反相对性原理：两条世界线的固有时本来就不同，其中一条必须经历加速。']),
  C('four-momentum', '4 维速度、4 维动量与质点动力学', '第6章 狭义相对论', '§6.3', '相对论与宇宙论',
    '质点的 4 维运动学与动力学量', ['u^a', 'p^a', 'm'],
    'p^a = m u^a 且 p^a p_a = −m²；4 维力 f^a = u^b∇_b p^a 与 p^a 正交',
    ['静质量 m 是标量；4 维动量的时间分量与牛顿力学中的能量只在指定参考系后对应。',
      '无静质量粒子（m = 0）沿类光测地线运动，不能用 p^a = m u^a 描述。']),
  C('energy-momentum-tensor', '能动张量与理想流体', '第6章 狭义相对论', '§6.4–§6.5', '相对论与宇宙论',
    '连续介质的 (0,2) 型对称张量场', ['T_{ab}', 'ρ', 'p', 'u^a'],
    'T_{ab} 对称且守恒 ∇^a T_{ab} = 0；理想流体 T_{ab} = (ρ + p)u_a u_b + p g_{ab}',
    ['守恒 ∇^a T_{ab} = 0 是 ∇ 下的守恒；在弯曲时空中一般不能写成对坐标的普通散度为零。',
      '理想流体假设无粘滞、无热流；去掉它需要加入相应项，结论形式随之改变。']),
  C('electromagnetic-tensor', '电磁场张量与麦克斯韦方程', '第6章 狭义相对论', '§6.6.1–§6.6.4', '相对论与宇宙论',
    '反对称 (0,2) 型张量场', ['F_{ab}', 'J^a'],
    'F_{ab} = ∇_a A_b − ∇_b A_a 反对称；麦氏方程为 ∇^a F_{ab} = −4π J_b 与 ∇_{[a}F_{bc]} = 0；电磁能动张量由 F 的二次式给出',
    ['F 的反对称性来自 A 的规范结构；∇_{[a}F_{bc]} = 0 等价于局部存在 A。',
      '电流守恒 ∇^a J_a = 0 由场方程与 F 的反对称性推出，不是额外假设。']),
  C('four-potential', '电磁 4 势与光波多普勒效应', '第6章 狭义相对论', '§6.6.5–§6.6.6', '相对论与宇宙论',
    '4 维势及其波动方程；光波的频率移动', ['A_a', 'k^a'],
    '在 Lorenz 规范 ∇^a A_a = 0 下 ∇^b∇_b A_a = −4π J_a；光子 4 维波矢 k^a 类光，观者测得频率 ω = −k_a u^a，频移由光源与观者的 4 速给出',
    ['规范不唯一：A_a → A_a + ∇_a χ 不改变 F；Lorenz 规范只是方便的选取，不是物理条件。',
      '多普勒公式在弯曲时空中同样成立，但频率沿光线如何变化要由 k^a∇_a ω 讨论。']),

  // ---- 第7章 广义相对论基础（印刷 188–244）----
  C('gravity-as-geometry', '引力与时空几何', '第7章 广义相对论基础', '§7.1', '相对论与宇宙论',
    '把引力几何化的基本立场', ['g_{ab}', '自由粒子'],
    '自由粒子沿时空的类时（或类光）测地线运动；引力不再作为力出现在运动方程中，而由度规 g_{ab} 编码',
    ['这是理论的选择而不是定理：等效原理排除了用局部实验区分引力与加速系，但并不逻辑地推出「引力就是曲率」。']),
  C('equivalence-principle', '等效原理与局部惯性系', '第7章 广义相对论基础', '§7.5', '相对论与宇宙论',
    '引力与惯性局部不可区分的原理', ['p', '局部惯性系'],
    '在任一点 p 可选取局部惯性系（黎曼法坐标）使 g_{ab}(p) = η_{ab} 且 Γ^μ{}_{νσ}(p) = 0，从而局部无法用实验区分引力场与加速系',
    ['只在一点（及其邻域的特定阶）成立：Γ 在 p 可为零，但 Γ 的导数（曲率）不能同时为零。',
      '潮汐效应正是局部惯性系消不掉的部分，所以等效原理本身推不出场方程。']),
  C('fermi-transport', '费米移动与无自转观者', '第7章 广义相对论基础', '§7.3–§7.4', '相对论与宇宙论',
    '沿任意观者世界线搬运矢量的规则', ['u^a', 'a^a', 'S^a'],
    '费米移动满足 u^b∇_b S^a = (S^b a_b)u^a − (u^b S_b)a^a；沿测地线（a^a = 0）退化为平行移动；无自转观者的自转矢量按费米移动且与 u^a 正交',
    ['费米移动依赖世界线的 4 速与 4 加速，只沿该世界线有定义。',
      '弯曲时空中「无自转」只能定义为费米移动；「始终指向同一方向」这种说法没有整体意义。']),
  T('tidal-deviation', '潮汐力与测地偏离方程', '第7章 广义相对论基础', '§7.6', '相对论与宇宙论', 'Theorem',
    'u^b∇_b(u^c∇_c ξ^a) = −R^a{}_{cbd}u^c u^d ξ^b，即相邻测地线的相对加速度由黎曼张量给出',
    ['方程只给出 ξ^a 的二阶演化，还需要初值条件才能定解。',
      '它说明曲率不能由坐标变换消去，因而是引力的「真实」部分——这是区分引力与加速系的关键。']),
  T('einstein-equation', '爱因斯坦场方程', '第7章 广义相对论基础', '§7.7', '相对论与宇宙论', 'Axiom',
    'G_{ab} + Λ g_{ab} = 8π T_{ab}（几何单位制 c = G = 1）',
    ['它是理论的公设而不是从更基本命题推出的定理；可推出的是「∇^a G_{ab} = 0」，它使 ∇^a T_{ab} = 0 自动成立。',
      '宇宙学常数 Λ 只能由观测确定；没有它理论同样自洽。']),
  T('linearized-gravity', '线性近似、牛顿极限与引力辐射', '第7章 广义相对论基础', '§7.8–§7.9', '相对论与宇宙论', 'Theorem',
    '取 g_{ab} = η_{ab} + h_{ab}（|h| ≪ 1）并在谐和规范下得 □h̄_{ab} = −16π T_{ab}；静态弱场低速时退回 ∇²Φ = 4πρ，传播解则给出以光速行进的引力波',
    ['线性近似只在 |h| ≪ 1 时可用；强场（黑洞附近、早期宇宙）必须解非线性方程。',
      '牛顿极限同时要求弱场、静态与低速；去掉任一条都会失去 ∇²Φ = 4πρ 的形式。']),

  // ---- 第8章 爱因斯坦方程的求解（印刷 245–307）----
  C('static-stationary', '稳态时空、静态时空与球对称时空', '第8章 爱因斯坦方程的求解', '§8.1–§8.2', '相对论与宇宙论',
    '带时间或空间对称性的时空', ['ξ^a', 'g_{ab}'],
    '稳态度规存在类时 Killing 场 ξ^a；静态还要求 ξ^a 无旋（ξ_{[a}∇_b ξ_{c]} = 0），从而可取时间坐标使 g_{ti} = 0；球对称要求存在 SO(3) 等距作用且轨道为二维球面',
    ['稳态与静态只在「存在 Killing 场」的意义上定义；Kerr 时空稳态但不静态。',
      '球对称的严格表述要用 Killing 场与轨道结构，「看上去像球」不是定义。']),
  T('schwarzschild-solution', '施瓦西真空解', '第8章 爱因斯坦方程的求解', '§8.3', '相对论与宇宙论', 'Property',
    'ds² = −(1 − r_s/r)dt² + (1 − r_s/r)⁻¹dr² + r²dΩ²，r_s = 2GM；在 r > r_s 上满足 R_{ab} = 0',
    ['r = r_s 处度规分量发散，但曲率标量有限，因此是坐标奇点而不是时空奇点。',
      '解只在真空区成立；恒星内部要另行接上内部解，衔接条件不可省。']),
  T('birkhoff-theorem', 'Birkhoff 定理', '第8章 爱因斯坦方程的求解', '§8.3.3', '相对论与宇宙论', 'Theorem',
    '球对称真空解必为施瓦西解（在其最大延拓的意义上）；球对称的真空区不会因恒星脉动而辐射引力波',
    ['它只对真空球对称区域成立；有物质（T_{ab} ≠ 0）时不适用。',
      '它不排除球对称天体的内部随时间演化，只说明外部真空区是静态的。']),
  T('reissner-nordstrom', 'Reissner–Nordström 解', '第8章 爱因斯坦方程的求解', '§8.4', '相对论与宇宙论', 'Property',
    'ds² = −(1 − r_s/r + Q²/r²)dt² + (1 − r_s/r + Q²/r²)⁻¹dr² + r²dΩ²，配合 F_{ab} = (Q/r²)(dt)_a∧(dr)_b 满足爱因斯坦–麦克斯韦方程',
    ['电荷使度规因子出现两个零点；当 |Q| 超过临界值时不再有事件视界，得到裸奇点。',
      '这正说明「奇点必被视界包裹」（宇宙监督）在已知解中不是自动成立的。']),
  C('np-formalism', 'Newman–Penrose 形式与规范自由性', '第8章 爱因斯坦方程的求解', '§8.5–§8.10', '相对论与宇宙论',
    '以零标架重写场方程的形式体系；坐标条件的地位', ['{l, n, m, m̄}', 'Ψ₀…Ψ₄'],
    '取零标架 {l^a, n^a, m^a, m̄^a} 并把黎曼张量分解为五个复标量 Ψ₀…Ψ₄，场方程化为一阶方程组；坐标条件只是规范选取',
    ['NP 形式是等价改写，不增加物理内容；它的价值在于把二阶方程化为一阶并给出 Petrov 分类。',
      '坐标条件（谐和、各向同性等）不携带几何信息：换一个条件得到的还是同一个时空。']),

  // ---- 第9章 施瓦西时空（印刷 308–357）----
  C('schwarzschild-geodesics', '施瓦西时空的测地线', '第9章 施瓦西时空', '§9.1', '相对论与宇宙论',
    '施瓦西度规下的类时与类光测地线', ['E', 'L', 'r'],
    '两个 Killing 场给出守恒量 E = −ξ^a u_a 与 L = ψ^a u_a，配合归一化条件 u^a u_a = −1（类时）或 0（类光），把测地线化为 r 方向的一维问题',
    ['守恒量只有两个（静态 + 球对称）；一般时空没有足够守恒量，测地线方程未必可积。',
      '类光测地线满足 u^a u_a = 0，不能像类时情形那样归一化 4 速。']),
  T('classical-tests', '广义相对论的经典实验验证', '第9章 施瓦西时空', '§9.2', '相对论与宇宙论', 'Theorem',
    '引力红移 1 + z = (1 − r_s/r)^{−1/2}；水星近日点每圈附加进动 6πGM/(a(1−e²))；光线偏折 Δφ = 4GM/b',
    ['这些都是弱场近似（后牛顿阶）的结果，不能当作强场区域的检验。',
      '每个数值都依赖推导到哪一阶；不写明阶数就无法与观测比较。']),
  T('stellar-interior', '球对称恒星内部解与恒星演化', '第9章 施瓦西时空', '§9.3', '相对论与宇宙论', 'Theorem',
    'TOV 方程 dp/dr = −(ρ + p)(m + 4πr³p)/(r(r − 2m))，其中 dm/dr = 4πr²ρ；在 r = R 处 p(R) = 0 并与施瓦西解衔接',
    ['TOV 方程来自 ∇^a T_{ab} = 0 加球对称假设，不是独立方程。',
      '存在最大质量上限；超过上限没有静态解，坍缩不可避免。']),
  C('kruskal-extension', 'Kruskal 延拓与无限红移面', '第9章 施瓦西时空', '§9.4.1–§9.4.5', '相对论与宇宙论',
    '施瓦西时空的最大延拓', ['U', 'V', 'r_s'],
    '用 Kruskal 坐标 (U, V) 把 r > r_s 与 r < r_s 两片拼接为最大延拓；r = r_s 处度规在 Kruskal 坐标下非退化，而 r = 0 处曲率标量发散',
    ['延拓的唯一性需要「最大」这一条件；不同延拓方案给出不同的整体结构。',
      '无限红移面与事件视界只在稳态情形重合；旋转黑洞中二者分离。']),
  T('schwarzschild-black-hole', '引力坍缩与施瓦西黑洞', '第9章 施瓦西时空', '§9.4.6', '相对论与宇宙论', 'Theorem',
    '球对称恒星坍缩到 r_s 以内后，其外部真空区由 Birkhoff 定理仍为施瓦西解；r = r_s 面成为事件视界，内部物质在有限固有时内到达 r = 0',
    ['事件视界是整体概念，由「能否逃到无穷远」定义，不能只看局部度规分量是否发散。',
      '经典广义相对论在 r → 0 处失效，奇点附近的结论需要量子引力。']),

  // ---- 第10章 宇宙论（印刷 358–417）----
  C('cosmological-principle', '宇宙学原理与空间几何', '第10章 宇宙论', '§10.1.1–§10.1.2', '相对论与宇宙论',
    '大尺度均匀各向同性的假设及其几何后果', ['Σ_t', 'k'],
    '存在一族类空超曲面 Σ_t 使时空分层，每层上物质分布均匀且各向同性；等曲率三维空间的曲率常数 k ∈ {−1, 0, +1}',
    ['均匀各向同性只在足够大的尺度上近似成立；把它当严格陈述会与观测到的结构矛盾。',
      '原理本身不含动力学：它只约束度规的形式，不决定 a(t)。']),
  T('rw-metric', 'Robertson–Walker 度规', '第10章 宇宙论', '§10.1.3', '相对论与宇宙论', 'Property',
    'ds² = −dt² + a²(t)[dr²/(1 − kr²) + r²dΩ²]，k ∈ {−1, 0, +1}；空间截面为最大对称空间',
    ['RW 度规是宇宙学原理下的唯一形式（至坐标选择），它的强度来自假设的强度。',
      'k 的数值依赖 a(t) 的归一化约定；有几何意义的是 k/|a| 这类组合。']),
  T('hubble-redshift', '哈勃定律与宇宙学红移', '第10章 宇宙论', '§10.2.1–§10.2.2', '相对论与宇宙论', 'Theorem',
    '1 + z = a(t_观测)/a(t_发射)；低红移下 z ≈ H₀d，即哈勃定律',
    ['宇宙学红移不是多普勒效应：它来自传播过程中尺度因子的变化，不能直接代入狭义相对论公式。',
      'H₀ 的测量依赖距离阶梯，不同方法的系统误差仍是当前争论的一部分。']),
  T('scale-factor', '尺度因子演化与宇宙学常数', '第10章 宇宙论', '§10.2.3–§10.2.4', '相对论与宇宙论', 'Theorem',
    '(ȧ/a)² = 8πρ/3 − k/a² + Λ/3 与 ä/a = −4π(ρ + 3p)/3 + Λ/3，配合 ρ̇ + 3(ȧ/a)(ρ + p) = 0',
    ['三个方程中只有两个独立：Friedmann 方程与守恒方程已蕴含加速方程。',
      'Λ > 0 时存在静态解（爱因斯坦静态宇宙），但它不稳定，微小扰动即导致膨胀或收缩。']),
  C('thermal-history', '宇宙热历史、暗物质与粒子视界', '第10章 宇宙论', '§10.3', '相对论与宇宙论',
    '膨胀宇宙的热演化与因果边界', ['T(t)', '粒子视界'],
    '随 a 减小，辐射温度按 T ∝ 1/a 升高，宇宙依次经历辐射主导与物质主导等阶段；粒子视界是共形时间 ∫dt/a 给出的因果边界',
    ['热历史的具体阶段划分依赖粒子物理模型，已超出广义相对论本身。',
      '暗物质是对观测到的引力效应的称呼，其微观身份未定；不能把某个候选粒子说成已确认。']),
  T('inflation', '暴涨模型及其对疑难的解决', '第10章 宇宙论', '§10.4', '相对论与宇宙论', 'Theorem',
    '若极早期存在加速膨胀阶段（ä > 0），则共形时间 ∫dt/a 被显著拉长，从而同时缓解视界（因果）疑难与平直性疑难',
    ['暴涨是一类模型而不是单一理论；其预言与观测相符不等于机制已被确认。',
      '它不解释奇点本身，只是把初始条件问题向前推。']),
  T('new-standard-cosmology', '暗能量与新标准宇宙模型', '第10章 宇宙论', '§10.5', '相对论与宇宙论', 'Property',
    'ΛCDM：以 Λ（或状态方程 w ≈ −1 的暗能量）加冷暗物质拟合当前的加速膨胀，且 Ω_Λ + Ω_m + Ω_k ≈ 1',
    ['暗能量与宇宙学常数在现有观测下尚不可区分；w 是否随时间变化是开放问题。',
      '「新标准模型」仍是可修订的模型而不是终局结论：宇宙的命运取决于 w 的未来行为。']),
];

/** 三个方法节点：两个局部技巧（可枚举步骤）与一个全局方法（跨场景策略）。 */
const methodSpec = [
  {
    id: 'liang:method-index-balance', title: '抽象指标配平与升降指标', scope: '局部方法',
    discipline: '微分几何', chapter: '第2章 流形和张量场', section: '§2.4–§2.6',
    summary: '写下一个张量等式之前，先按抽象指标逐项配平类型并检查缩并配对，再用度规做升降。',
    In: '一个用抽象指标写出的候选张量等式', Out: '配平后的等式或指出类型错误的位置',
    Pre: '已知各符号的张量类型与度规 g_{ab}', Post: '等式两侧类型一致，缩并配对合法，升降指标只用 g 及其逆',
    Use: ['liang:abstract-index', 'liang:tensor-field'], Demo: ['liang:christoffel', 'liang:ricci-einstein'],
    Fail: '配平只能排除类型错误，不能证明等式成立；指标合法而命题为假的等式照样存在。',
    body: '先写出每个因子的上下指标 → 检查每一项的自由指标集合是否完全相同 → 检查每个缩并是否一上一下配对 → 需要升降时只允许乘 g_{ab} 或 g^{ab} 并立即缩并 → 最后核对等式两侧的协变阶数。',
    formal: { applicableTo: ['liang:abstract-index'], boundary: ['只检查记号的合法性，不检查数学内容。'] },
    motivation: {
      internal: ['分量写法把「类型」埋在坐标里，抽象指标把它提到记号层面，错误在写下的那一刻就暴露。'],
      external: ['相对论计算中最常见的错误来源是上下指标不匹配。'],
      aesthetic: ['一个好的记号会让错误的写法写不出来。'],
      growthChain: ['分量式算出结果却对不上 → 发现上下指标混乱 → 改用抽象指标 → 配平成为前置步骤'],
    },
    teaching: {
      selfCheck: [selfCheck('sc-liang-index-balance-1', '判断 T^a{}_b = S_a V^b 是否合法，并说明理由。', '判定', 'liang:method-index-balance', '两侧自由指标类型不一致，等式不合法。')],
      reviewQuestions: ['为什么「自由指标必须两边一致」不是数学结论而是记号规则？'],
      evidenceStatus: 'DEF',
    },
  },
  {
    id: 'liang:method-metric-curvature', title: '从度规到曲率的固定计算流程', scope: '局部方法',
    discipline: '微分几何', chapter: '第3章 黎曼（内禀）曲率张量', section: '§3.2–§3.4',
    summary: '给定度规分量，按「克氏符 → 黎曼张量 → 里奇与标量曲率」的固定顺序计算，并逐段用对称性校验。',
    In: '一张坐标卡下的度规分量 g_{μν}(x)', Out: 'Γ^μ{}_{νσ}、R^ρ{}_{σμν}、R_{μν} 与 R',
    Pre: '度规非退化，已确认要算到哪一阶', Post: '给出各阶张量的分量，并用对称性与 Bianchi 恒等式做一致性检查',
    Use: ['liang:christoffel', 'liang:riemann-tensor', 'liang:ricci-einstein'], Demo: ['liang:schwarzschild-solution'],
    Fail: '流程只给出该坐标卡下的分量；换坐标后同一时空的分量不同，中间量（如 Γ）甚至不是张量，不能直接比较。',
    body: '写出 g_{μν} 与 g^{μν} → 按 Γ 的公式算出克氏符 → 按 R^ρ{}_{σμν} = ∂_μΓ^ρ{}_{νσ} − ∂_νΓ^ρ{}_{μσ} + Γ^ρ{}_{μλ}Γ^λ{}_{νσ} − Γ^ρ{}_{νλ}Γ^λ{}_{μσ} 逐项算 → 缩并得里奇与标量曲率 → 用 R_{ρσμν} 的对称性与 ∇^a G_{ab} = 0 检查。',
    formal: { applicableTo: ['liang:christoffel', 'liang:riemann-tensor'], boundary: ['只适用于已经写出度规分量的情形；不解决「怎么猜度规」。'] },
    motivation: {
      internal: ['曲率的每一步都只是偏导与代数运算，因此可以固定成流程，把注意力留给对称性和物理含义。'],
      external: ['黑洞、宇宙学与数值相对论都以这套计算为起点。'],
      aesthetic: ['所有弯曲信息都藏在 g_{μν} 的十个分量里，这本身就是一种压缩。'],
      growthChain: ['想知道时空弯曲 → 需要不依赖坐标的判据 → 黎曼张量 → 只能从度规算出来'],
    },
    teaching: {
      selfCheck: [selfCheck('sc-liang-metric-curvature-1', '写出施瓦西度规在 r 很大时 Γ^t{}_{tr} 的领头项并说明它为什么与牛顿势对应。', '计算', 'liang:method-metric-curvature', '领头项 1/(2r)·(r_s/r) 的积分给出 Φ ~ −GM/r 的对数形式对应。')],
      reviewQuestions: ['为什么算完之后要用 ∇^a G_{ab} = 0 而不是别的条件做检查？'],
      evidenceStatus: 'DEF',
    },
  },
  {
    id: 'liang:method-symmetry-conservation', title: '用 Killing 场换守恒量', scope: '全局方法',
    discipline: '微分几何', chapter: '第3章–第9章', section: '§3.3、§4.3、§9.1',
    summary: '面对一条要解的测地线方程，先找时空的 Killing 场，把方程降成低维问题，再去谈解的性质。',
    In: '一个给定的度规与一条待求的测地线', Out: '沿测地线守恒的量，以及降维后的运动方程',
    Pre: '度规已知，且能辨认出至少一个 Killing 场', Post: '得到若干守恒量与降维后的方程，或明确指出没有可用对称性',
    Use: ['liang:killing-field', 'liang:geodesic', 'liang:schwarzschild-geodesics'], Demo: ['liang:hubble-redshift', 'liang:classical-tests'],
    Fail: '没有 Killing 场时本方法不适用，而且不能说「因此测地线不可解」——只能说这条路走不通；一般时空的测地线确实未必可积。',
    body: '先读度规的连续对称性（不显含某坐标、球对称、轴对称）→ 把对应的 Killing 场写出来 → 用 ξ^a u_a = const 得到守恒量 → 代入归一化条件 u^a u_a = −1 或 0 → 把问题降成「一个坐标 + 一个有效势」的形状 → 在有效势上读出轨道类型。',
    formal: {applicableTo: ['liang:killing-field'], boundary: ['守恒量个数等于独立 Killing 场个数；对称性不足时不适用。'] },
    motivation: {
      internal: ['测地线方程是二阶非线性方程组，直接解不动；对称性把它变成一维问题，这不是技巧而是结构的直接后果。'],
      external: ['引力透镜、行星进动与宇宙学红移的定量预言都由此得到。'],
      aesthetic: ['「对称性给出守恒量」把几何与力学连成一句话。'],
      growthChain: ['面对写不动的测地线方程 → 注意到度规不显含 t 与 φ → 得到 E 与 L → 问题降到一维有效势'],
    },
    teaching: {
      selfCheck: [selfCheck('sc-liang-symmetry-conservation-1', '在施瓦西时空中指出两个 Killing 场并写出对应的守恒量。', '判定', 'liang:method-symmetry-conservation', 'ξ^a = (∂/∂t)^a 与 ψ^a = (∂/∂φ)^a，对应 E = −ξ^a u_a 与 L = ψ^a u_a。')],
      reviewQuestions: ['为什么「没有 Killing 场」不等于「测地线不可解」？'],
      evidenceStatus: 'DEF',
    },
  },
];

/** 三个误区模式：都是教材明确点出、且有标准反例的过度推广。 */
const patternSpec = [
  {
    id: 'liang:pattern-curvature-needs-embedding', title: '以为曲率必须靠外部嵌入才看得出来',
    discipline: '微分几何', chapter: '第3章 黎曼（内禀）曲率张量', section: '§3.5',
    wrongRule: '一个空间弯不弯，取决于它在更高维空间里怎么摆',
    task: '判断一个给定的弯曲陈述是内禀的还是依赖嵌入的',
    counterexample: '柱面在 R³ 中明显「弯」，但它的内禀黎曼张量为零；把它剪开摊平不会改变任何内禀距离',
    scope: '反驳的是「曲率必须靠外部嵌入定义」，不否定外曲率本身是有用的量。',
    anchors: ['liang:intrinsic-extrinsic-curvature', 'liang:riemann-tensor'],
  },
  {
    id: 'liang:pattern-christoffel-is-tensor', title: '把克氏符当作张量',
    discipline: '微分几何', chapter: '第3章 黎曼（内禀）曲率张量', section: '§3.2.2',
    wrongRule: 'Γ^μ{}_{νσ} 是一组张量分量，所以它在某点为零就是坐标无关的结论',
    task: '判断一个用 Γ 写出的等式是否具有坐标无关意义',
    counterexample: '在平直空间的直角坐标中 Γ ≡ 0，换到极坐标后 Γ 非零，而时空仍然是平的',
    scope: '反驳的是「Γ 是张量」，不否定 Γ 在具体坐标卡下是必需的计算工具。',
    anchors: ['liang:christoffel', 'liang:derivative-operator'],
  },
  {
    id: 'liang:pattern-redshift-is-doppler', title: '把宇宙学红移直接当成多普勒效应',
    discipline: '微分几何', chapter: '第10章 宇宙论', section: '§10.2.2',
    wrongRule: '红移就是光源在远离我们，按狭义相对论的多普勒公式算即可',
    task: '判断给定红移的解释是否需要膨胀的时空背景',
    counterexample: '遥远星系的红移随尺度因子增长，光源与观者各自都可以近似静止于各自的共动坐标，没有谁在「运动」',
    scope: '反驳的是「宇宙学红移 = 运动多普勒」，不否定两者在低红移极限下有相同的领头公式。',
    anchors: ['liang:hubble-redshift', 'liang:rw-metric'],
  },
];

/**
 * 行动契约。
 *
 * 每条行动的输出是它自己那个节点；输入是该节点在教材里**真正**依赖的前置节点，
 * 而不是「同一章里排在前面」的节点。推进顺序因此由依赖决定，而不是由目录决定。
 * 输入统一声明可用资源 `['definition', 'statement']`，与站内规划页的背景声明格式一致。
 */
const actionSpecs = [
  ['topological-space', 'definition', '引入拓扑空间', ['bg:set:function']],
  ['continuous-map', 'definition', '引入连续映射与同胚', ['liang:topological-space']],
  ['compactness', 'definition', '引入紧致性', ['liang:continuous-map']],
  ['manifold', 'definition', '引入微分流形', ['liang:topological-space', 'liang:continuous-map']],
  ['tangent-vector', 'definition', '引入切矢量', ['liang:manifold']],
  ['vector-field', 'definition', '引入矢量场', ['liang:tangent-vector']],
  ['dual-vector-field', 'definition', '引入对偶矢量场', ['liang:vector-field']],
  ['tensor-field', 'definition', '引入张量场与缩并', ['liang:vector-field', 'liang:dual-vector-field']],
  ['metric-tensor', 'definition', '引入度规张量场', ['liang:tensor-field', 'bg:linear:vector']],
  ['abstract-index', 'representation', '引入抽象指标记号', ['liang:tensor-field']],
  ['derivative-operator', 'definition', '引入导数算符', ['liang:tensor-field']],
  ['christoffel', 'construction', '构造与度规适配的导数算符', ['liang:derivative-operator', 'liang:metric-tensor']],
  ['parallel-transport', 'definition', '引入沿曲线的平移', ['liang:derivative-operator']],
  ['geodesic', 'definition', '引入测地线', ['liang:parallel-transport', 'liang:christoffel']],
  ['riemann-tensor', 'definition', '引入黎曼曲率张量', ['liang:derivative-operator', 'liang:parallel-transport']],
  ['ricci-einstein', 'deduction', '缩并出里奇张量与爱因斯坦张量', ['liang:riemann-tensor', 'liang:metric-tensor']],
  ['intrinsic-extrinsic-curvature', 'definition', '区分内禀曲率与外曲率', ['liang:riemann-tensor']],
  ['pushforward-pullback', 'definition', '引入推前与拉回', ['liang:manifold']],
  ['lie-derivative', 'definition', '引入李导数', ['liang:pushforward-pullback', 'liang:vector-field']],
  ['killing-field', 'definition', '引入 Killing 矢量场', ['liang:lie-derivative', 'liang:metric-tensor']],
  ['hypersurface', 'definition', '引入超曲面与法矢量', ['liang:derivative-operator', 'liang:metric-tensor']],
  ['differential-form', 'definition', '引入微分形式与外积', ['liang:tensor-field', 'liang:dual-vector-field']],
  ['exterior-derivative', 'definition', '引入外微分', ['liang:differential-form']],
  ['volume-element', 'construction', '构造体元', ['liang:manifold', 'liang:metric-tensor']],
  ['stokes-theorem', 'deduction', '陈述 Stokes 定理', ['liang:differential-form', 'liang:exterior-derivative', 'liang:volume-element']],
  ['gauss-theorem', 'deduction', '陈述 Gauss 定理与对偶形式', ['liang:stokes-theorem', 'liang:metric-tensor']],
  ['minkowski-spacetime', 'definition', '引入闵氏时空', ['liang:metric-tensor']],
  ['inertial-observer', 'definition', '引入惯性观者与惯性系', ['liang:minkowski-spacetime', 'liang:geodesic']],
  ['proper-time', 'definition', '引入固有时与坐标时', ['liang:inertial-observer']],
  ['kinematic-effects', 'deduction', '分析尺缩、钟慢与孪子效应', ['liang:proper-time']],
  ['four-momentum', 'definition', '引入 4 维速度与 4 维动量', ['liang:proper-time', 'liang:geodesic']],
  ['energy-momentum-tensor', 'definition', '引入能动张量与理想流体', ['liang:four-momentum', 'liang:tensor-field']],
  ['electromagnetic-tensor', 'definition', '引入电磁场张量与麦氏方程', ['liang:energy-momentum-tensor', 'liang:differential-form']],
  ['four-potential', 'deduction', '引入电磁 4 势与光波多普勒效应', ['liang:electromagnetic-tensor']],
  ['gravity-as-geometry', 'definition', '把引力几何化', ['liang:geodesic', 'liang:metric-tensor']],
  ['equivalence-principle', 'deduction', '陈述等效原理与局部惯性系', ['liang:christoffel', 'liang:geodesic']],
  ['fermi-transport', 'definition', '引入费米移动与无自转观者', ['liang:parallel-transport', 'liang:proper-time']],
  ['tidal-deviation', 'deduction', '导出潮汐力与测地偏离方程', ['liang:riemann-tensor', 'liang:geodesic']],
  ['einstein-equation', 'deduction', '陈述爱因斯坦场方程', ['liang:ricci-einstein', 'liang:energy-momentum-tensor', 'liang:equivalence-principle']],
  ['linearized-gravity', 'deduction', '做线性近似并取牛顿极限', ['liang:einstein-equation']],
  ['static-stationary', 'definition', '引入稳态、静态与球对称时空', ['liang:killing-field', 'liang:manifold']],
  ['schwarzschild-solution', 'construction', '解出施瓦西真空解', ['liang:static-stationary', 'liang:einstein-equation']],
  ['birkhoff-theorem', 'deduction', '陈述 Birkhoff 定理', ['liang:schwarzschild-solution']],
  ['reissner-nordstrom', 'construction', '解出 Reissner–Nordström 解', ['liang:schwarzschild-solution', 'liang:electromagnetic-tensor']],
  ['np-formalism', 'representation', '改写为 Newman–Penrose 形式', ['liang:riemann-tensor', 'liang:einstein-equation']],
  ['schwarzschild-geodesics', 'deduction', '解施瓦西时空的测地线', ['liang:schwarzschild-solution', 'liang:geodesic', 'liang:killing-field']],
  ['classical-tests', 'deduction', '导出三项经典实验预言', ['liang:schwarzschild-geodesics']],
  ['stellar-interior', 'deduction', '导出恒星内部解与质量上限', ['liang:einstein-equation', 'liang:energy-momentum-tensor', 'liang:static-stationary']],
  ['kruskal-extension', 'construction', '构造 Kruskal 延拓', ['liang:schwarzschild-solution', 'liang:classical-tests']],
  ['schwarzschild-black-hole', 'deduction', '论证引力坍缩与施瓦西黑洞', ['liang:kruskal-extension', 'liang:birkhoff-theorem', 'liang:stellar-interior']],
  ['cosmological-principle', 'definition', '引入宇宙学原理', ['liang:manifold', 'liang:energy-momentum-tensor']],
  ['rw-metric', 'construction', '导出 Robertson–Walker 度规', ['liang:cosmological-principle', 'liang:metric-tensor']],
  ['hubble-redshift', 'deduction', '导出哈勃定律与宇宙学红移', ['liang:rw-metric']],
  ['scale-factor', 'deduction', '导出尺度因子演化方程', ['liang:rw-metric', 'liang:einstein-equation']],
  ['thermal-history', 'deduction', '整理宇宙热历史与粒子视界', ['liang:scale-factor', 'liang:hubble-redshift']],
  ['inflation', 'deduction', '陈述暴涨模型及其解决的问题', ['liang:thermal-history', 'liang:cosmological-principle']],
  ['new-standard-cosmology', 'deduction', '整理暗能量与新标准宇宙模型', ['liang:scale-factor', 'liang:thermal-history', 'liang:inflation']],
];

const methodInputs = {
  'liang:method-index-balance': ['liang:abstract-index'],
  'liang:method-metric-curvature': ['liang:christoffel', 'liang:riemann-tensor'],
  'liang:method-symmetry-conservation': ['liang:killing-field', 'liang:geodesic'],
};

const patternInputs = {
  'liang:pattern-curvature-needs-embedding': ['liang:intrinsic-extrinsic-curvature'],
  'liang:pattern-christoffel-is-tensor': ['liang:christoffel'],
  'liang:pattern-redshift-is-doppler': ['liang:hubble-redshift'],
};

const bySlug = new Map(spec.map((item) => [item.slug, item]));
const accepts = ['definition', 'statement'];
const provides = ['definition', 'statement'];

/*
 * 话题级条目（2026-10 加）不再在本文件里判。
 *
 * 用户的原话：「节点是最小的可独立认知单元，这些是话题范畴下的内容，要去分开。」
 * 判据与**逐条判定结果**都收进 `data/granularity.mjs`（话题清单 + 判为单元的例外，各带理由），
 * 由 `data/manifest.mjs` 在装配时统一套用：一份登记表管全库，
 * 这里的节点只负责自己的学科、案例与负载，不各写一份粒度。
 * 这样一来，第五十二轮只判过的 `liang` 与 2026-10 补判的 `manifold` / `rudin`
 * 用的是同一张表、同一套理由格式。
 */

function shared(item) {
  return {
    discipline: item.discipline,
    // 粒度由 data/granularity.mjs 在装配时统一写入（见那里的判据与登记表）。
    case: 'liang',
    summary: item.predicate + '。',
    formal: { assumptions: [], boundary: item.boundary },
    representations: [],
    provenance: {
      sources: [source(item.chapter, item.section)],
      note: provenanceNote,
    },
  };
}

function buildNode(item) {
  if (item.kind === 'claim') {
    return claim(`liang:${item.slug}`, item.title, {
      ...shared(item),
      roles: [item.role],
      formula: item.predicate,
      teaching: {
        evidenceStatus: item.role === 'Axiom' ? 'REF' : 'PROOF',
        reviewQuestions: [`${item.title}的结论在去掉哪个前提后会失效？`],
      },
    });
  }
  return concept(`liang:${item.slug}`, item.title, {
    ...shared(item),
    objectType: item.objectType,
    parameters: item.parameters,
    predicate: item.predicate,
    teaching: {
      evidenceStatus: 'DEF',
      reviewQuestions: [`${item.title}的定义中，哪个条件可以去掉而不失去主要结论？`],
    },
  });
}

export const liangNodes = spec.map(buildNode);

export const liangMethodNodes = methodSpec.map((item) => method(item.id, item.title, {
  discipline: item.discipline, case: 'liang', scope: item.scope,
  summary: item.summary, In: item.In, Out: item.Out, Pre: item.Pre, Post: item.Post,
  Use: item.Use, Demo: item.Demo, Fail: item.Fail, body: item.body,
  formal: item.formal,
  motivation: item.motivation,
  teaching: item.teaching,
  provenance: { sources: [source(item.chapter, item.section)], note: provenanceNote + ' 方法由教材对应小节的推导步骤提炼，教材未单列同名方法条目。' },
}));

export const liangPatternNodes = patternSpec.map((item) => patternNode(item.id, item.title, {
  discipline: item.discipline, case: 'liang',
  summary: `${item.wrongRule}。`,
  contentRef: false,
  formal: { boundary: [item.scope] },
  /*
   * 证据等级（2026-10 补）：误区模式登记的是**一条错误理解连同教材的对照例子**，
   * 不是本站提出的待证命题，因此取 `ILLUSTRATION`——本站不声称证明过教材里那条论证。
   */
  teaching: {
    evidenceStatus: 'ILLUSTRATION',
    reviewQuestions: [`「${item.wrongRule}」这条理解在教材的哪一处被纠正，对照例子是什么？`],
  },
  wrongRule: item.wrongRule,
  task: item.task,
  counterexample: item.counterexample,
  scope: item.scope,
  anchors: item.anchors,
  provenance: { sources: [source(item.chapter, item.section)], note: provenanceNote + ' 误区模式取自教材该节明确指出的常见错误理解，并给出教材使用的对照例子。' },
}));

export const liangActions = actionSpecs.map(([slug, mode, title, inputs]) => action(
  `a-liang:${slug}`, mode, title,
  inputs.map((nodeId) => input(nodeId, accepts)),
  [output(`liang:${slug}`, provides)],
  { witness: { type: 'declared-contract', status: 'REF', ref: source(bySlug.get(slug).chapter, bySlug.get(slug).section) } },
));

export const liangMethodActions = methodSpec.map((item) => action(
  `a-${item.id}`, 'method', `提出方法：${item.title}`,
  methodInputs[item.id].map((nodeId) => input(nodeId, accepts)),
  [output(item.id, ['method'])],
  { witness: { type: 'method-presentation', status: 'DEF', ref: source(item.chapter, item.section) } },
));

export const liangPatternActions = patternSpec.map((item) => action(
  `a-${item.id}`, 'task', `登记误区：${item.title}`,
  patternInputs[item.id].map((nodeId) => input(nodeId, accepts)),
  [output(item.id, provides)],
  { witness: { type: 'declared-contract', status: 'DEF', ref: source(item.chapter, item.section) } },
));

/**
 * 关系：只登记教材明确断言的对应，以及与本站既有案例的跨案例接口。
 * 不把「同一章里相邻」当成关系。
 */
export const liangRelations = [
  relation('rel-liang-metric-specialization', 'specialization', 'liang:metric-tensor', 'liang:tensor-field',
    { witness: { type: 'same-carrier-implication', status: 'DEF', ref: source('第2章 流形和张量场', '§2.5') },
      scope: '度规是加了对称与非退化条件的 (0,2) 型张量场；反过来不成立。' }),
  relation('rel-liang-killing-specialization', 'specialization', 'liang:killing-field', 'liang:lie-derivative',
    { witness: { type: 'same-carrier-implication', status: 'DEF', ref: source('第4章 李导数、Killing场和超曲面', '§4.3') },
      scope: 'Killing 场是李导数为零的特例；李导数本身对任意矢量场有定义。' }),
  relation('rel-liang-schwarzschild-specialization', 'specialization', 'liang:schwarzschild-solution', 'liang:einstein-equation',
    { witness: { type: 'solution-of-equation', status: 'REF', ref: source('第8章 爱因斯坦方程的求解', '§8.3') },
      scope: '施瓦西度规是场方程在真空、静态、球对称条件下的解；它不覆盖一般解。' }),
  relation('rel-liang-rw-specialization', 'specialization', 'liang:rw-metric', 'liang:einstein-equation',
    { witness: { type: 'solution-of-equation', status: 'REF', ref: source('第10章 宇宙论', '§10.1.3') },
      scope: 'RW 度规是场方程在均匀各向同性条件下的解族，a(t) 由物质内容决定。' }),
  relation('rel-liang-tangent-application', 'application', 'liang:abstract-index', 'liang:christoffel',
    { witness: { type: 'application-description', status: 'DEF', ref: source('第2章 流形和张量场', '§2.6') },
      task: '克氏符的「非张量性」只有用抽象指标写出来才看得清楚：变换律里多出的非齐次项正是指标配平失败的地方。' }),
  relation('rel-liang-geodesic-application', 'application', 'liang:method-symmetry-conservation', 'liang:schwarzschild-geodesics',
    { witness: { type: 'application-description', status: 'DEF', ref: source('第9章 施瓦西时空', '§9.1') },
      task: '施瓦西测地线是「用 Killing 场换守恒量」的标准演示。' }),
  // 与本站既有案例对接：同名概念保留两处登记，用关系表达接口，不合并节点。
  relation('rel-liang-crossdomain-topology', 'crossDomain', 'bg:top:space', 'liang:topological-space',
    { witness: { type: 'cross-domain-interface', status: 'DEF' },
      scope: '本站背景节点 bg:top:space 与教材 §1.2 的拓扑空间是同一层；本案例给出开集公理的完整版本。',
      task: '点集拓扑背景在教材路径中的接口。' }),
  relation('rel-liang-crossdomain-dg-manifold', 'crossDomain', 'dg:smooth-manifold', 'liang:manifold',
    { witness: { type: 'cross-domain-interface', status: 'DEF' },
      scope: '本站 dg 案例（笔记语料）与教材案例对「光滑流形」的表述覆盖同一层概念；两处保留，不互相覆盖。',
      task: '光滑流形在两个案例之间的接口。' }),
  relation('rel-liang-crossdomain-dg-tangent', 'crossDomain', 'dg:tangent-bundle', 'liang:tangent-vector',
    { witness: { type: 'cross-domain-interface', status: 'DEF' },
      scope: 'dg 案例按「曲线定义 / 导子定义 / 二者等价」分三个节点登记切向量；教材案例把它作为一个里程碑，并在正文里给出两种定义的对照。',
      task: '切向量表述的跨案例接口。' }),
  relation('rel-liang-crossdomain-dg-stokes', 'crossDomain', 'dg:generalized-stokes-theorem', 'liang:stokes-theorem',
    { witness: { type: 'cross-domain-interface', status: 'DEF' },
      scope: '两处登记同一条定理；教材案例额外给出体元与 Hodge 对偶的处理顺序。',
      task: 'Stokes 定理的跨案例接口。' }),
  relation('rel-liang-crossdomain-tensor', 'crossDomain', 'tensor:tensor-rs', 'liang:tensor-field',
    { witness: { type: 'cross-domain-interface', status: 'DEF' },
      scope: '本站 tensor 案例在有限维向量空间上登记 (r,s) 型张量；教材案例把它推广到流形上的张量场。',
      task: '张量概念的跨案例接口。' }),

  /*
   * 硬前置（`hardPrereq`，2026-10 补，与 limit / dg 两案例同一口径）：
   * **不用它，目标节点的定义（或定理陈述）就写不出来**。见证一律 `DEF` + `definitional-dependency`，
   * `witness.scope` 指明依据出现在目标节点登记的谓词/陈述的哪一处。
   *
   * 依据是**本站登记的节点谓词与陈述**（`data/cases/liang.mjs` 的 spec，来源为教材对应小节），
   * 不是对教材证明正文的转录——本站正文是凝练笔记，这一点在证据的 `scope` 里一直写着。
   * 只登记主干：拓扑 → 连续映射 → 流形 → 切矢量 / 张量场 → 导数算符 → 平移 / 曲率，
   * 以及形式、李导数与两条解链。方法、误区、练习类节点不登记。
   */
  relation('rel-liang-pre-top-continuous', 'hardPrereq', 'liang:topological-space', 'liang:continuous-map', {
    witness: { type: 'definitional-dependency', status: 'DEF', scope: '谓词写作「f: X → Y 连续当且仅当 Y 中任一开集的原像在 X 中开」：开集由 X、Y 的拓扑给出。' },
    scope: '没有拓扑，「连续」与「同胚」都无从定义。',
  }),
  relation('rel-liang-pre-continuous-manifold', 'hardPrereq', 'liang:continuous-map', 'liang:manifold', {
    witness: { type: 'definitional-dependency', status: 'DEF', scope: '谓词里的「同胚 φ_α: U_α → R^n 的开子集」是同胚，即连续双射且逆连续；Hausdorff 与第二可数也按拓扑表述。' },
    scope: '微分流形的局部欧氏条件逐字用到同胚；删去它只剩一个拓扑空间。',
  }),
  relation('rel-liang-pre-manifold-tangent', 'hardPrereq', 'liang:manifold', 'liang:tangent-vector', {
    witness: { type: 'definitional-dependency', status: 'DEF', scope: '谓词里的「过 p 的光滑曲线按在某张坐标卡下 (φ∘γ)′(0) 相同取等价类」用到了流形上的坐标卡与光滑曲线。' },
    scope: '切矢量是流形上的对象：没有 M 与它的坐标卡，等价关系没有定义域。',
  }),
  relation('rel-liang-pre-tangent-vectorfield', 'hardPrereq', 'liang:tangent-vector', 'liang:vector-field', {
    witness: { type: 'definitional-dependency', status: 'DEF', scope: '谓词写「v 为映射 M → TM 且 π∘v = id_M，在任一坐标卡下分量 v^μ(x) 为 C^∞」：纤维 TM 的每一点是切矢量。' },
    scope: '矢量场逐点取值是切矢量；分量就是切矢量的坐标分量。',
  }),
  relation('rel-liang-pre-tensor-metric', 'hardPrereq', 'liang:tensor-field', 'liang:metric-tensor', {
    witness: { type: 'definitional-dependency', status: 'DEF', scope: '谓词写「g 为 M 上对称、非退化的 (0,2) 型光滑张量场」：(0,2) 型张量与「张量场」都来自目标节点。' },
    scope: '度规是加了两条条件（对称、非退化）的 (0,2) 型张量场；条件之外的部分就是张量场。',
  }),
  relation('rel-liang-pre-tensor-abstractindex', 'hardPrereq', 'liang:tensor-field', 'liang:abstract-index', {
    witness: { type: 'definitional-dependency', status: 'DEF', scope: '谓词写「抽象指标只标记张量的类型与缩并配对」：被标记的对象是张量与张量场。' },
    scope: '抽象指标是写张量等式的记号；没有张量就没有要配平的东西。',
  }),
  relation('rel-liang-pre-tensor-derivative', 'hardPrereq', 'liang:tensor-field', 'liang:derivative-operator', {
    witness: { type: 'definitional-dependency', status: 'DEF', scope: '谓词写「∇ 满足线性性、Leibniz 律、与缩并交换」：缩并是张量场上的运算，Leibniz 律作用在张量场的乘积上。' },
    scope: '导数算符的适用对象就是张量场；删去它，三条要求没有主语。',
  }),
  relation('rel-liang-pre-metric-christoffel', 'hardPrereq', 'liang:metric-tensor', 'liang:christoffel', {
    witness: { type: 'definitional-dependency', status: 'DEF', scope: '谓词里的分量公式 Γ^μ{}_{νσ} = ½ g^{μρ}(∂_ν g_{ρσ} + ∂_σ g_{ρν} − ∂_ρ g_{νσ}) 完全由度规 g 与其逆给出。' },
    scope: '与度规适配的导数算符是「唯一满足 ∇g = 0 且无挠」的那一个；它的分量由度规决定。',
  }),
  relation('rel-liang-pre-derivative-parallel', 'hardPrereq', 'liang:derivative-operator', 'liang:parallel-transport', {
    witness: { type: 'definitional-dependency', status: 'DEF', scope: '谓词写「沿曲线 γ 平移的矢量满足 t^a∇_a v^b = 0」：方程里的 ∇ 就是导数算符。' },
    scope: '平行移动是「沿切方向的导数为零」；没有 ∇ 就没有这条方程。',
  }),
  relation('rel-liang-pre-parallel-geodesic', 'hardPrereq', 'liang:parallel-transport', 'liang:geodesic', {
    witness: { type: 'definitional-dependency', status: 'DEF', scope: '谓词「测地线满足 t^a∇_a t^b = 0」是「切矢量沿自身平行移动」的直接写法，坐标形式里出现的正是同一条方程。' },
    scope: '测地线是平行移动的特例（把被移动的矢量取成切矢量本身）。',
  }),
  relation('rel-liang-pre-derivative-riemann', 'hardPrereq', 'liang:derivative-operator', 'liang:riemann-tensor', {
    witness: { type: 'definitional-dependency', status: 'DEF', scope: '谓词写「R^a{}_{bcd} 由两个导数算符的对易子定义：(∇_a∇_b − ∇_b∇_a)ω_c = R^d{}_{cab}ω_d」。' },
    scope: '曲率张量的定义就是 ∇ 的对易子；没有 ∇ 就没有这个对象。',
  }),
  relation('rel-liang-pre-riemann-ricci', 'hardPrereq', 'liang:riemann-tensor', 'liang:ricci-einstein', {
    witness: { type: 'definitional-dependency', status: 'DEF', scope: '谓词写「R_{ac} = R^b{}_{abc}，R = g^{ab}R_{ab}，G_{ab} = R_{ab} − ½ R g_{ab}」：里奇张量是黎曼张量的缩并。' },
    scope: '这一条链上三个对象都由黎曼张量缩并而来。',
  }),
  relation('rel-liang-pre-manifold-form', 'hardPrereq', 'liang:manifold', 'liang:differential-form', {
    witness: { type: 'definitional-dependency', status: 'DEF', scope: '谓词写「p 次形式在每点为全反称多重线性映射，全体记为 Ω^p(M)」：形式是流形上的对象。' },
    scope: 'Ω^p(M) 的 M 就是流形；没有流形，只有逐点的多重线性代数。',
  }),
  relation('rel-liang-pre-form-exterior', 'hardPrereq', 'liang:differential-form', 'liang:exterior-derivative', {
    witness: { type: 'definitional-dependency', status: 'DEF', scope: '谓词写「d 由 df(v) = v(f) 与 d(ω∧η) = dω∧η + (−1)^p ω∧dη 唯一确定」：外积与形式次数是这条定义的构件。' },
    scope: '外微分作用于形式；没有形式与外积，两条定义式都写不出来。',
  }),
  relation('rel-liang-pre-exterior-stokes', 'hardPrereq', 'liang:exterior-derivative', 'liang:stokes-theorem', {
    witness: { type: 'definitional-dependency', status: 'DEF', scope: 'Stokes 定理的陈述写作 ∫_∂R ω = ∫_R dω：等号两边用的就是外微分 d 与形式 ω。' },
    scope: '这条定理没有别的对象：一边是形式的积分，一边是它外微分的积分。',
  }),
  relation('rel-liang-pre-vectorfield-lie', 'hardPrereq', 'liang:vector-field', 'liang:lie-derivative', {
    witness: { type: 'definitional-dependency', status: 'DEF', scope: '谓词写「L_v T = lim (φ_{-t}^* T − T)/t，其中 φ_t 是 v 生成的单参数微分同胚群；对矢量场有 L_v w = [v, w]」。' },
    scope: '李导数沿一个矢量场取；没有矢量场就没有 v。',
  }),
  relation('rel-liang-pre-einstein-schwarzschild', 'hardPrereq', 'liang:einstein-equation', 'liang:schwarzschild-solution', {
    witness: { type: 'definitional-dependency', status: 'DEF', scope: '「施瓦西真空解」的「解」是对场方程而言：陈述里说的是 G_{ab} = 0 在静态球对称条件下的解。' },
    scope: '解这个词必须有方程作对象；删去场方程，施瓦西度规只是一个度规。',
  }),
  relation('rel-liang-pre-einstein-rw', 'hardPrereq', 'liang:einstein-equation', 'liang:rw-metric', {
    witness: { type: 'definitional-dependency', status: 'DEF', scope: 'RW 度规的适用范围由场方程加均匀各向同性条件给出；a(t) 由场方程与物态方程确定。' },
    scope: '同上：解的意义来自场方程，而不是度规本身。',
  }),
];

/**
 * 证据：每条节点一条 `reference` 级记录。
 *
 * 为什么不是 `prose-proof`：本站没有录入教材的证明正文，只给出凝练陈述。
 * 声明「存在教材级论证」是 `REF` 的准确含义；`checkStatus` 固定 `not_run`。
 * 方法节点是操作步骤而不是命题，等级降为 `DEF`。
 */
export const liangEvidence = spec.map((item) => evidence(
  `ev-liang-${item.slug}`,
  'reference',
  item.kind === 'claim' && item.role !== 'Axiom' ? 'PROOF' : 'DEF',
  'not_run',
  `${item.title}：教材 ${item.chapter} ${item.section} 的对应内容`,
  {
    scope: `本站正文是凝练笔记；教材原文（${item.chapter} ${item.section}）才是完整论证所在，本站未转录、也未逐页核对。`,
    nodes: [`liang:${item.slug}`],
    obligations: ['未编码为第 02 章 ND 证书', '未逐页核对教材原文与页码对应关系'],
    reference: source(item.chapter, item.section),
  },
));

export const liangMethodEvidence = methodSpec.map((item) => evidence(
  `ev-${item.id.replace(':', '-')}`,
  'reference', 'DEF', 'not_run',
  `${item.title}：由教材对应小节的推导步骤提炼`,
  {
    scope: '方法本身是操作步骤，不是可证命题；本证据只声明「步骤与教材一致」，不声明它是定理。',
    nodes: [item.id],
    obligations: ['未编码为第 02 章 ND 证书', '未逐页核对教材原文'],
    reference: source(item.chapter, item.section),
  },
));

export const liangPatternEvidence = patternSpec.map((item) => evidence(
  `ev-${item.id.replace(':', '-')}`,
  'reference', 'DEF', 'not_run',
  `${item.title}：教材指出的常见误解与对照例子`,
  {
    scope: '误区模式不是定理；本证据只声明「该误解与对照例子出自教材对应小节」。',
    nodes: [item.id],
    obligations: ['未编码为第 02 章 ND 证书', '未逐页核对教材原文'],
    reference: source(item.chapter, item.section),
  },
));

export const liangSupport = [
  support('sup-liang-schwarzschild-route', 'liang:schwarzschild-solution', 'route', 'known',
    { set: ['liang:static-stationary', 'liang:einstein-equation'], minimal: false, evidence: ['ev-liang-schwarzschild-solution'] }),
  support('sup-liang-einstein-route', 'liang:einstein-equation', 'route', 'known',
    { set: ['liang:ricci-einstein', 'liang:energy-momentum-tensor', 'liang:equivalence-principle'], minimal: true, evidence: ['ev-liang-einstein-equation'] }),
  support('sup-liang-kruskal-route', 'liang:kruskal-extension', 'route', 'known',
    { set: ['liang:schwarzschild-solution'], minimal: false, evidence: ['ev-liang-kruskal-extension'] }),
  // 没有登记支持记录时保留 Unknown；「没查」不写成空集。
  support('sup-liang-np-route', 'liang:np-formalism', 'route', 'unknown',
    { reason: '教材把 §8.5–§8.10 标为选读，未登记路线级输入支持；未知不等于空支持。' }),
];

export const liangClaims = spec
  .filter((item) => item.kind === 'claim')
  .map((item) => claimRecord(
    `claim-liang-${item.slug}`,
    `liang:${item.slug}`,
    item.predicate,
    [`ev-liang-${item.slug}`],
    item.role === 'Axiom' ? 'REF' : 'PROOF',
  ));

export const liangPatterns = patternSpec.map((item) => ({
  id: item.id,
  node: item.id,
  anchors: item.anchors,
  title: item.title,
}));

/** 话题聚合按教材十章分块；块之间允许重叠，不把成员关系读成必修链。 */
export const liangAggregates = [
  {
    id: 'agg-liang-volume-1', kind: 'topic', title: '梁灿彬《微分几何入门与广义相对论》上册·凝练路径',
    blocks: [
      ['liang:topological-space', 'liang:continuous-map', 'liang:compactness'],
      ['liang:manifold', 'liang:tangent-vector', 'liang:vector-field', 'liang:dual-vector-field', 'liang:tensor-field', 'liang:metric-tensor', 'liang:abstract-index'],
      ['liang:derivative-operator', 'liang:christoffel', 'liang:parallel-transport', 'liang:geodesic', 'liang:riemann-tensor', 'liang:ricci-einstein', 'liang:intrinsic-extrinsic-curvature'],
      ['liang:pushforward-pullback', 'liang:lie-derivative', 'liang:killing-field', 'liang:hypersurface'],
      ['liang:differential-form', 'liang:exterior-derivative', 'liang:volume-element', 'liang:stokes-theorem', 'liang:gauss-theorem'],
      ['liang:minkowski-spacetime', 'liang:inertial-observer', 'liang:proper-time', 'liang:kinematic-effects', 'liang:four-momentum', 'liang:energy-momentum-tensor', 'liang:electromagnetic-tensor', 'liang:four-potential'],
      ['liang:gravity-as-geometry', 'liang:equivalence-principle', 'liang:fermi-transport', 'liang:tidal-deviation', 'liang:einstein-equation', 'liang:linearized-gravity'],
      ['liang:static-stationary', 'liang:schwarzschild-solution', 'liang:birkhoff-theorem', 'liang:reissner-nordstrom', 'liang:np-formalism'],
      ['liang:schwarzschild-geodesics', 'liang:classical-tests', 'liang:stellar-interior', 'liang:kruskal-extension', 'liang:schwarzschild-black-hole'],
      ['liang:cosmological-principle', 'liang:rw-metric', 'liang:hubble-redshift', 'liang:scale-factor', 'liang:thermal-history', 'liang:inflation', 'liang:new-standard-cosmology'],
      // 方法节点单独成块：它们是「怎么算」，与概念块不是同一类成员。
      ['liang:method-index-balance', 'liang:method-metric-curvature', 'liang:method-symmetry-conservation'],
      // 误区模式也单独成块：它们标注的是边界，不是路径上的里程碑。
      ['liang:pattern-curvature-needs-embedding', 'liang:pattern-christoffel-is-tensor', 'liang:pattern-redshift-is-doppler'],
    ],
    note: '块按教材十章划分；跨章依赖由行动契约表达，块成员关系本身不构成必修链。',
  },
];

export const liang = {
  nodes: [...liangNodes, ...liangMethodNodes, ...liangPatternNodes],
  actions: [...liangActions, ...liangMethodActions, ...liangPatternActions],
  relations: liangRelations,
  evidence: [...liangEvidence, ...liangMethodEvidence, ...liangPatternEvidence],
  support: liangSupport,
  claims: liangClaims,
  patterns: liangPatterns,
  aggregates: liangAggregates,
};

/** 供接线与测试核对：本案例的规模。 */
export const liangSummary = {
  conceptCount: spec.filter((item) => item.kind === 'concept').length,
  claimCount: spec.filter((item) => item.kind === 'claim').length,
  methodNodeCount: liangMethodNodes.length,
  patternCount: liangPatternNodes.length,
  nodeCount: liang.nodes.length,
  actionCount: liang.actions.length,
  relationCount: liangRelations.length,
  evidenceCount: liang.evidence.length,
};
