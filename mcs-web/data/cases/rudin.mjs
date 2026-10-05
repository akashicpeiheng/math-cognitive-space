/**
 * Rudin《数学分析原理》（Principles of Mathematical Analysis, 3rd ed.）案例。
 *
 * ## 来源与身份（可核验）
 *
 * 本机只读扫描件：`reference/paths/数学分析原理 英文版·原书第3版·典藏版＝PRINCIPLES OF
 * MATHEMATICAL ANALYSIS (THIRD EDITION).pdf`（355 页，DuXiu/SuperStar 扫描，无文本层）。
 * 章节、小节名与页码来自对该扫描件**目录页（PDF 第 8–11 页）的 OCR**
 * （rapidocr，逐行带纵坐标排序），OCR 结果与第三版通行的目录一致：
 * 11 章、每章的小节名与起始页码齐全。节点只引用「章 + 小节 + 页码」，
 * **不引用扫描件的正文文字**（那需要整本 OCR，本轮没做）。
 *
 * ## 本轮只挂名字，正文留空
 *
 * 按用户要求：这些节点**先挂个名字，内容空着**。因此
 * - 每个节点只写标题与一句话的 `predicate` / `formula`（形成检查要求这两项非空，
 *   并且它们本身就是「这个节点是什么」的最小信息）；
 * - 一律 `contentRef: false`，`data/cases/` 下**没有**对应的正文块——
 *   站点会如实显示「没有正文」，而不是编一段填充。
 * - `boundary` 统一写明「正文尚未撰写」，不假装已经核对过教材的逐条件反例。
 *
 * ## 路径规划
 *
 * 行动契约的输入取自 Rudin 自己的依赖顺序（例如反函数定理要先用压缩映射原理，
 * Stokes 定理要先用单形与链），而不是目录顺序。凝练成 11 章共 54 个里程碑 +
 * 2 个方法节点，按教材的自然接缝分成七程（见 `web/src/example-paths.ts`）。
 */
import {
  concept, claim, method,
  action, input, output, relation, evidence, support, claimRecord, selfCheck,
} from '../authoring.mjs';

const BOOK = 'Rudin, Principles of Mathematical Analysis, 3rd ed., McGraw-Hill（本机扫描件：reference/paths/数学分析原理 英文版·原书第3版·典藏版.pdf，355 页）';
const provenanceNote = '本轮只登记节点位置与依赖；正文尚未撰写（contentRef: false），教材对应小节的表述未逐条核对。';
const NOT_WRITTEN = ['正文尚未撰写：本节点目前只登记标题、所属小节与依赖关系；条件边界与逐条反例留待补写正文时核对教材对应小节。'];

const source = (chapter, section) => `${BOOK} ${chapter} ${section}`;

/** 概念节点：只写对象类型、参数与一句话谓词。 */
function C(slug, title, chapter, section, discipline, objectType, parameters, predicate) {
  return { kind: 'concept', slug, title, chapter, section, discipline, objectType, parameters, predicate };
}

/** 断言节点：只写公式本身与角色。 */
function T(slug, title, chapter, section, discipline, role, formula) {
  return { kind: 'claim', slug, title, chapter, section, discipline, role, predicate: formula };
}

/**
 * 11 章共 54 个里程碑。`section` 为教材小节号与起始页，便于逐条回查目录页的 OCR 结果。
 */
const spec = [
  // ---- 第1章 实数系与复数系（印刷 3–23）----
  C('ordered-field', '有序域', 'Chapter 1 The Real and Complex Number Systems', '§1.1–1.17（p3–8）', '域与数系',
    '带序的域', ['F', '<', '+', '·'],
    '域 F 上给定全序 <，且加法与乘法都与序相容（a<b ⇒ a+c<b+c；a<b 且 c>0 ⇒ ac<bc）'),
  T('least-upper-bound', '实数域与最小上界性', 'Chapter 1 The Real and Complex Number Systems', '§1.10、§1.19–1.21（p8–12）', '分析', 'Theorem',
    '存在满足域公理与序公理、且具有最小上界性的有序域 R；任意非空有上界的子集在 R 中有上确界'),
  C('extended-real', '扩充实数系', 'Chapter 1 The Real and Complex Number Systems', '§1.23（p11–12）', '分析',
    '实数系加上两个符号', ['R ∪ {−∞, +∞}'],
    '在 R 上添加 +∞ 与 −∞，并把序与算术按「任意实数小于 +∞」等约定扩充，使上确界对无上界的集合也有定义'),
  C('complex-field', '复数域', 'Chapter 1 The Real and Complex Number Systems', '§1.24–1.27（p12–16）', '域与数系',
    '实数对构成的域', ['C', 'i'],
    'C 是 R² 上以 (a,b)(c,d) = (ac−bd, ad+bc) 为乘法的域，i = (0,1) 满足 i² = −1；每个非零复数有乘法逆'),
  C('euclidean-space', '欧氏空间 R^k', 'Chapter 1 The Real and Complex Number Systems', '§1.35–1.38（p16–21）', '分析',
    '带内积的实向量空间', ['R^k', 'x·y', '|x|'],
    'R^k 上定义内积 x·y = Σ x_i y_i 与范数 |x| = (x·x)^{1/2}，满足 Cauchy–Schwarz 不等式 |x·y| ≤ |x||y|'),

  // ---- 第2章 基础拓扑（印刷 24–46）----
  C('countable-set', '有限集、可数集与不可数集', 'Chapter 2 Basic Topology', '§2.1–2.8（p24–30）', '拓扑',
    '集合的基数分类', ['A', 'J_n', 'N'],
    'A 与某个 J_n 一一对应时为有限集；与 N 一一对应时为可数集；否则为不可数集。可数集的任意可数并仍可数'),
  C('metric-space', '度量空间', 'Chapter 2 Basic Topology', '§2.15–2.20（p30–33）', '拓扑',
    '带距离函数的集合', ['X', 'd'],
    'd: X×X → R 满足 d(p,q) > 0（p ≠ q）、d(p,p) = 0、d(p,q) = d(q,p) 与三角不等式；开球与开集由此定义'),
  C('compact-set', '紧致集与 Heine–Borel 定理', 'Chapter 2 Basic Topology', '§2.31–2.41（p36–42）', '拓扑',
    '度量空间的子集性质', ['K', 'X'],
    'K ⊂ X 紧致当且仅当 K 的任一开覆盖有有限子覆盖；R^k 中 K 紧致当且仅当 K 有界且闭'),
  C('perfect-set', '完全集与 Cantor 集', 'Chapter 2 Basic Topology', '§2.41–2.44（p41–43）', '拓扑',
    '闭集的一种', ['P'],
    'P 是完全集当且仅当 P 的每个点都是 P 的极限点；R^1 中非空完全集不可数，Cantor 集是紧致、完全且完全不连通的例子'),
  C('connected-set', '连通集', 'Chapter 2 Basic Topology', '§2.45–2.47（p42–43）', '拓扑',
    '不能分成两个非空开集之并的子集', ['E', 'X'],
    'E ⊂ X 连通当且仅当不存在开集 A、B 使 E∩A、E∩B 非空、E ⊂ A∪B 且 E∩A∩B = ∅；R 中的连通集恰是区间'),

  // ---- 第3章 数值序列与级数（印刷 47–82）----
  C('convergent-sequence', '收敛序列与子序列', 'Chapter 3 Numerical Sequences and Series', '§3.1–3.7（p47–51）', '分析',
    '度量空间中的点列', ['{p_n}', 'p'],
    'p_n → p 指对任意 ε > 0 存在 N 使 n ≥ N 时 d(p_n,p) < ε；收敛序列有界，且其子序列收敛到同一点'),
  T('bolzano-weierstrass', 'Bolzano–Weierstrass 定理', 'Chapter 3 Numerical Sequences and Series', '§3.6–3.7（p51–52）', '分析', 'Theorem',
    'R^k 中任一有界无穷点集必有极限点；等价地，任一有界序列有收敛子序列'),
  C('cauchy-sequence', 'Cauchy 序列与完备性', 'Chapter 3 Numerical Sequences and Series', '§3.11–3.12（p52–55）', '分析',
    '自身越来越近的点列', ['{p_n}'],
    '对任意 ε > 0 存在 N 使 m,n ≥ N 时 d(p_m,p_n) < ε；在 R^k 中 Cauchy 序列恰是收敛序列（完备性）'),
  C('limit-superior', '上极限与下极限', 'Chapter 3 Numerical Sequences and Series', '§3.15–3.17（p55–57）', '分析',
    '实数列的两种极限', ['lim sup', 'lim inf'],
    'lim sup p_n = lim_{n→∞} (sup_{k≥n} p_k)，lim inf 对下确界同理；两者相等（含 ±∞ 的约定）时序列收敛到该值'),
  C('series-convergence', '级数及其收敛判据', 'Chapter 3 Numerical Sequences and Series', '§3.21–3.29（p58–65）', '分析',
    '无穷和', ['Σ a_n', '部分和'],
    'Σ a_n 收敛指部分和序列收敛；非负项级数可用比较判别法、根值判别法与比值判别法定性'),
  C('power-series', '幂级数', 'Chapter 3 Numerical Sequences and Series', '§3.39（p69–70）', '分析',
    '形如 Σ c_n z^n 的级数', ['Σ c_n z^n', 'R'],
    '存在收敛半径 R ∈ [0,∞] 使 |z| < R 时绝对收敛、|z| > R 时发散；在 |z| < R 的紧子集上一致收敛'),
  C('absolute-convergence', '绝对收敛与重排', 'Chapter 3 Numerical Sequences and Series', '§3.44–3.55（p71–78）', '分析',
    '级数的收敛方式', ['Σ |a_n|', '重排'],
    'Σ |a_n| 收敛时 Σ a_n 收敛且任一重排收敛到同一和；条件收敛级数可经重排得到任意指定的和（Riemann 重排定理）'),

  // ---- 第4章 连续性（印刷 83–102）----
  C('function-limit', '函数的极限', 'Chapter 4 Continuity', '§4.1–4.4（p83–85）', '分析',
    '函数在一点的极限', ['f', 'p', 'A'],
    'x → p 时 f(x) → A 指对任意 ε > 0 存在 δ > 0 使 0 < d_X(x,p) < δ 时 d_Y(f(x),A) < ε；p 须是定义域的极限点'),
  C('continuous-function', '连续函数', 'Chapter 4 Continuity', '§4.5–4.9（p85–89）', '分析',
    '在一点连续或在集合上连续的函数', ['f', 'p'],
    'f 在 p 连续指 lim_{x→p} f(x) = f(p)；等价地，Y 中任一开集的原像在定义域中相对开'),
  C('continuity-compactness', '连续性与紧致性', 'Chapter 4 Continuity', '§4.14–4.19（p89–93）', '分析',
    '紧致集上连续函数的性质', ['f', 'K'],
    '紧致集在连续映射下的像是紧致的；因此紧致集上的连续实函数有界并取到最大值与最小值，且一致连续'),
  C('continuity-connectedness', '连续性与连通性（介值定理）', 'Chapter 4 Continuity', '§4.20–4.23（p93–94）', '分析',
    '连通集上连续函数的性质', ['f', 'E'],
    '连通集在连续映射下的像是连通的；因此区间上的连续实函数取到介于两端函数值之间的一切值'),

  // ---- 第5章 微分（印刷 103–119）----
  C('derivative', '导数', 'Chapter 5 Differentiation', '§5.1–5.3（p103–107）', '分析',
    '实函数在一点的导数', ['f′(x)', 'x'],
    'f′(x) = lim_{t→x} (f(t) − f(x))/(t − x)；可导蕴含连续，反之不然（|x| 在 0 处）'),
  T('mean-value-theorem', '中值定理', 'Chapter 5 Differentiation', '§5.8–5.11（p107–110）', '分析', 'Theorem',
    'f 在 [a,b] 连续、在 (a,b) 可导，则存在 x ∈ (a,b) 使 f(b) − f(a) = f′(x)(b − a)；广义中值定理给出两个函数之比的同型结论'),
  T('lhospital-rule', 'L’Hospital 法则', 'Chapter 5 Differentiation', '§5.13（p109–110）', '分析', 'Theorem',
    '在 0/0 或 ∞/∞ 型不定式下，若 f′/g′ 的极限存在（含 ±∞），则 f/g 的极限与之相同；要求 g′ ≠ 0 且分母不为零'),
  T('taylor-theorem', 'Taylor 定理', 'Chapter 5 Differentiation', '§5.15（p110–113）', '分析', 'Theorem',
    'f 在 [a,b] 有 n 阶连续导数、在 (a,b) 有 n+1 阶导数，则 f(β) = P(β) + 余项，余项可写成 f^{(n+1)}(x)(β−a)^{n+1}/(n+1)! 或积分形式'),
  C('vector-derivative', '向量值函数的微分', 'Chapter 5 Differentiation', '§5.16–5.19（p113–114）', '分析',
    '映到 R^k 的函数的导数', ['f', 'f′'],
    'f: [a,b] → R^k 的导数按分量定义；中值定理对向量值函数不成立，代之以 |f(b) − f(a)| ≤ (b−a) sup|f′|'),

  // ---- 第6章 Riemann–Stieltjes 积分（印刷 120–142）----
  C('riemann-stieltjes', 'Riemann–Stieltjes 积分与存在性', 'Chapter 6 The Riemann-Stieltjes Integral', '§6.1–6.10（p120–128）', '分析',
    '关于单调增函数 α 的积分', ['∫ f dα', 'P', 'U(P,f,α)', 'L(P,f,α)'],
    '∫_a^b f dα = sup L(P,f,α) = inf U(P,f,α)；f 连续而 α 单调增时有界变差条件下积分存在'),
  C('integral-properties', '积分的性质', 'Chapter 6 The Riemann-Stieltjes Integral', '§6.11–6.16（p128–133）', '分析',
    '积分的代数与序性质', ['∫ f dα'],
    '积分对 f 与 α 都线性；f 可积时 |∫ f dα| ≤ ∫ |f| dα；区间可加；α 连续的跳跃点不影响积分值'),
  T('fundamental-theorem', '微积分基本定理', 'Chapter 6 The Riemann-Stieltjes Integral', '§6.17–6.22（p133–135）', '分析', 'Theorem',
    'f ∈ R(α) 时 F(x) = ∫_a^x f dα 连续；α 在 x_0 可导且 f 在 x_0 连续时 F′(x_0) = f(x_0)α′(x_0)；f 可导且 f′ 可积时 ∫_a^b f′ dx = f(b) − f(a)'),
  C('rectifiable-curve', '可求长曲线', 'Chapter 6 The Riemann-Stieltjes Integral', '§6.26–6.27（p136–138）', '分析',
    'R^k 中的连续曲线', ['γ', 'Λ(γ)'],
    'γ 可求长指其上折线长度之集有上界 Λ(γ)；γ 为 C¹ 时 Λ(γ) = ∫_a^b |γ′(t)| dt'),

  // ---- 第7章 函数序列与函数级数（印刷 143–171）----
  C('uniform-convergence', '一致收敛', 'Chapter 7 Sequences and Series of Functions', '§7.1–7.10（p143–149）', '分析',
    '函数序列的收敛方式', ['{f_n}', 'f'],
    'f_n → f 一致指 sup_x |f_n(x) − f(x)| → 0；一致收敛蕴含逐点收敛，反之不然（f_n(x) = x^n 在 [0,1] 上）'),
  C('uniform-convergence-properties', '一致收敛与连续、积分、微分', 'Chapter 7 Sequences and Series of Functions', '§7.11–7.17（p149–154）', '分析',
    '一致收敛保持的性质', ['{f_n}', 'f'],
    '各项连续且一致收敛时极限函数连续；在 [a,b] 上可逐项积分；各项可导且导数一致收敛时极限可导且可逐项求导'),
  C('equicontinuous', '等度连续族', 'Chapter 7 Sequences and Series of Functions', '§7.18–7.25（p154–159）', '分析',
    '一族函数的一致连续性', ['𝓕', 'K'],
    '𝓕 在 K 上等度连续指对任意 ε > 0 存在 δ > 0 使所有 f ∈ 𝓕 与所有满足 d(x,y) < δ 的 x,y 都有 |f(x) − f(y)| < ε；紧致集上等度连续且一致有界的族有在一致范数下收敛的子列'),
  T('stone-weierstrass', 'Stone–Weierstrass 定理', 'Chapter 7 Sequences and Series of Functions', '§7.26–7.33（p159–165）', '分析', 'Theorem',
    '紧致度量空间上分离点且不含零函数的多项式型代数 A 在 C(X) 中一致稠密；特别地，[a,b] 上的实连续函数可用多项式一致逼近'),

  // ---- 第8章 若干特殊函数（印刷 172–203）----
  C('exponential-logarithm', '指数函数与对数函数', 'Chapter 8 Some Special Functions', '§8.1–8.6（p172–182）', '分析',
    '由幂级数定义的初等函数', ['E(z)', 'L(y)'],
    'E(z) = Σ z^n/n! 在 C 上收敛且满足 E(z+w) = E(z)E(w)；L(y) = ∫_1^y dx/x 是 E 在 R 上的反函数'),
  C('trigonometric-functions', '三角函数', 'Chapter 8 Some Special Functions', '§8.7（p182–184）', '分析',
    '由指数函数定义的周期函数', ['C(x)', 'S(x)', 'π'],
    'C(x) = (E(ix) + E(−ix))/2、S(x) = (E(ix) − E(−ix))/(2i)；二者有周期 2π，π 定义为 C 的最小正零点'),
  T('algebraic-completeness', '复数域的代数完备性', 'Chapter 8 Some Special Functions', '§8.8（p184–185）', '域与数系', 'Theorem',
    '任一复系数非常数多项式在 C 中有根（代数基本定理）'),
  C('fourier-series', 'Fourier 级数', 'Chapter 8 Some Special Functions', '§8.9–8.15（p185–192）', '分析',
    '三角级数展开', ['f^(n)', 's_N(f;x)'],
    'f ∈ R 于 [−π,π] 时定义 Fourier 系数 f^(n) = (1/2π)∫ f(t)e^{−int}dt；Parseval 等式与 Bessel 不等式由 L² 内积给出'),
  C('gamma-function', 'Γ 函数', 'Chapter 8 Some Special Functions', '§8.17–8.22（p192–196）', '分析',
    '由积分定义的函数', ['Γ(x)'],
    'Γ(x) = ∫_0^∞ t^{x−1}e^{−t}dt（x > 0）；满足 Γ(x+1) = xΓ(x)、Γ(n+1) = n!，并可延拓为 C 上除非正整数外处处解析的函数'),

  // ---- 第9章 多元函数（印刷 204–244）----
  C('linear-transformation', '线性变换与算子范数', 'Chapter 9 Functions of Several Variables', '§9.1–9.8（p204–211）', '线性代数',
    'R^n → R^m 的线性映射', ['A', '‖A‖'],
    '‖A‖ = sup{|Ax| : |x| ≤ 1} 有限使 A 成为一致连续的 Lipschitz 映射；矩阵表示与范数的等价性由此建立'),
  C('several-variable-derivative', '多元函数的导数', 'Chapter 9 Functions of Several Variables', '§9.11–9.20（p211–220）', '分析',
    '向量值函数在一点的导数', ['f′(x)', 'D_j f'],
    'f′(x) 是唯一的线性映射 A 使 lim_{h→0} |f(x+h) − f(x) − Ah|/|h| = 0；偏导数存在不蕴含可导，链式法则对线性映射的复合成立'),
  T('contraction-principle', '压缩映射原理', 'Chapter 9 Functions of Several Variables', '§9.23（p220–221）', '分析', 'Theorem',
    '完备度量空间 X 上若 φ: X → X 满足 d(φ(x),φ(y)) ≤ c d(x,y)（0 ≤ c < 1），则 φ 有唯一不动点'),
  T('inverse-function-theorem', '反函数定理', 'Chapter 9 Functions of Several Variables', '§9.24（p221–223）', '分析', 'Theorem',
    'f 在开集 E 上连续可微且 f′(a) 可逆，则 a 有邻域 U 使 f 在 U 上单射、f(U) 开，且反函数在 f(a) 处可微、(f^{-1})′(f(a)) = [f′(a)]^{-1}'),
  T('implicit-function-theorem', '隐函数定理', 'Chapter 9 Functions of Several Variables', '§9.28（p223–228）', '分析', 'Theorem',
    'F(x,y) = 0、F(a,b) = 0 且 (∂F/∂y)(a,b) 可逆时，存在唯一局部定义的 g 使 F(x,g(x)) = 0 且 g′(a) 由 F 的偏导数给出'),
  T('rank-theorem', '秩定理', 'Chapter 9 Functions of Several Variables', '§9.32（p228–231）', '分析', 'Theorem',
    'f 在 a 附近秩恒为 r 时，存在局部坐标使 f 在该坐标下等于投影 (x_1,…,x_n) ↦ (x_1,…,x_r,0,…,0)'),

  // ---- 第10章 微分形式的积分（印刷 245–287）----
  C('primitive-mapping', '本原映射与单位分解', 'Chapter 10 Integration of Differential Forms', '§10.1–10.9（p245–253）', '分析',
    '标准单形上的可微映射；从属于覆盖的函数族', ['Φ', '{φ_i}'],
    '本原映射把标准 k-单形映入 R^k；单位分解是一族非负 C^∞ 函数，支集局部有限、和恒为 1 且每个支集含于给定开覆盖的某个成员中'),
  C('differential-form', '微分形式', 'Chapter 10 Integration of Differential Forms', '§10.10–10.23（p253–266）', '分析',
    'k 次外微分形式', ['ω', 'dx_I'],
    'ω = Σ f_I(x) dx_{i_1} ∧ … ∧ dx_{i_k}，系数可微；外积反交换、d² = 0，拉回与 d 交换'),
  C('simplex-chain', '单形与链', 'Chapter 10 Integration of Differential Forms', '§10.26–10.30（p266–273）', '分析',
    '带定向的标准单形及其整系数线性组合', ['σ', 'Γ', '∂'],
    'k-单形是标准单形到 R^n 的 C¹ 映射；k-链是 k-单形的整系数有限线性组合；边界算子 ∂ 满足 ∂² = 0'),
  T('stokes-theorem', 'Stokes 定理', 'Chapter 10 Integration of Differential Forms', '§10.33–10.36（p273–275）', '分析', 'Theorem',
    'k-链 Γ 与 (k−1) 次形式 ω 满足 ∫_Γ dω = ∫_{∂Γ} ω（在 ω 的系数连续可微、Γ 为 C² 时）'),
  C('closed-exact-form', '闭形式与恰当形式', 'Chapter 10 Integration of Differential Forms', '§10.37–10.40（p275–280）', '分析',
    '外微分为零的形式与可写成 dλ 的形式', ['dω = 0', 'ω = dλ'],
    '闭形式满足 dω = 0，恰当形式满足 ω = dλ；恰当必闭，反之在星形区域成立（Poincaré 引理），一般由 de Rham 上同调度量障碍'),

  // ---- 第11章 Lebesgue 理论（印刷 300–334）----
  C('set-function', '集合函数', 'Chapter 11 The Lebesgue Theory', '§11.1–11.4（p300–302）', '测度论',
    '定义在集族上的非负函数', ['μ', '𝓕'],
    'μ 把集合映为非负实数（含 +∞），通常要求空集取 0 且具有可数可加性'), 
  C('lebesgue-measure', 'Lebesgue 测度的构造', 'Chapter 11 The Lebesgue Theory', '§11.5–11.10（p302–310）', '测度论',
    '由区间体积生成的外测度与可测集', ['m*', 'm', '𝔐'],
    '由初等集的体积出发定义外测度 m*，再取满足 Carathéodory 条件的集合为可测集；可测集族是 σ-代数且 m 在其上可数可加'),
  C('measurable-function', '可测函数', 'Chapter 11 The Lebesgue Theory', '§11.11–11.17（p310–313）', '测度论',
    '关于 σ-代数可测的函数', ['f', '𝔐'],
    'f 可测指每个开集的原像属于 𝔐；可测函数的和、积与几乎处处极限仍可测'),
  C('lebesgue-integral', 'Lebesgue 积分', 'Chapter 11 The Lebesgue Theory', '§11.19–11.25（p313–322）', '测度论',
    '按简单函数逼近定义的积分', ['∫ f dμ'],
    '先对简单函数定义积分，再对非负可测函数取上确界，最后按正负部分拆分；控制收敛定理与单调收敛定理是其核心工具，Riemann 可积函数必 Lebesgue 可积且积分值相同'),
  C('l2-space', 'L² 空间', 'Chapter 11 The Lebesgue Theory', '§11.37–11.43（p325–332）', '分析',
    '平方可积函数构成的内积空间', ['L²(μ)', '⟨f,g⟩'],
    'L²(μ) 是 ⟨f,g⟩ = ∫ f ḡ dμ 下的完备内积空间（Riesz–Fischer 定理），因而 Fourier 级数的 Parseval 等式随之成立'),
];

/** 两个方法节点：一个局部估算技巧，一个全局策略。 */
const methodSpec = [
  {
    id: 'rudin:method-epsilon-estimate', title: 'ε–N 与 ε–δ 估算', scope: '局部方法',
    discipline: '分析', chapter: 'Chapter 3 Numerical Sequences and Series', section: '§3.1–3.7（p47–55）',
    summary: '把「趋于」的断言换成一个具体的 ε，反解出 N 或 δ，再用三角不等式把误差拆成可控的几段。',
    In: '一个形如「某量趋于某值」的断言', Out: '显式的 N(ε) 或 δ(ε)，以及误差被拆成的各段界',
    Pre: '已写出断言的全称形式（对任意 ε > 0 存在 δ …）', Post: '给出显式阈值与各段误差估计，或指出哪一段无法控制',
    Use: ['rudin:convergent-sequence', 'rudin:continuous-function'], Demo: ['rudin:cauchy-sequence', 'rudin:uniform-convergence'],
    Fail: '估算只能证明「能控制」；若某一段没有界，本方法给不出结论，也不等于命题为假。',
    body: '写出全称形式 → 把目标误差定为 ε 或 ε/M → 对每一项单独解出阈值 → 取阈值的最大值或最小值 → 用三角不等式把总误差压回 ε 以内 → 回头核对每个「充分大」是否互相兼容。',
    formal: { applicableTo: ['rudin:convergent-sequence'], boundary: ['只处理可以用三角不等式拆分的估计；非构造性的存在性证明不在范围内。'] },
    motivation: {
      internal: ['「充分接近」这句话要能被核对，就必须给出一个可解的阈值；估算过程本身就是证明。'],
      external: ['数值分析与误差分析的全部起点。'],
      aesthetic: ['把定性断言换成一个可以反解的不等式。'],
      growthChain: ['看懂「趋于」→ 试着写出 ε 与 N → 发现三角不等式能把误差拆开 → 估算成为固定套路'],
    },
    teaching: {
      selfCheck: [selfCheck('sc-rudin-epsilon-1', '用 ε–N 语言写出「两个收敛序列之和收敛」的证明骨架。', '证明', 'rudin:method-epsilon-estimate', '取 N = max(N₁, N₂)，用三角不等式分成两段各 ε/2。')],
      reviewQuestions: ['为什么拆误差时常常取 ε/2 而不是 ε？'],
      evidenceStatus: 'DEF',
    },
  },
  {
    id: 'rudin:method-compactness-transfer', title: '用紧致性把局部结论整体化', scope: '全局方法',
    discipline: '分析', chapter: 'Chapter 2 Basic Topology', section: '§2.31–2.41（p36–42）',
    summary: '先在每一点附近拿到局部结论，再用紧致性把有限多个局部拼成一个整体结论。',
    In: '一族逐点成立的局部结论与一个紧致集 K', Out: '在 K 上一致成立的整体结论，或一个指出紧致性不可省的反例',
    Pre: 'K 紧致，且每点的局部结论带一个邻域', Post: 'K 被有限多个邻域覆盖，整体结论成立',
    Use: ['rudin:compact-set', 'rudin:continuous-function'], Demo: ['rudin:continuity-compactness', 'rudin:equicontinuous'],
    Fail: 'K 不紧致时拼接不成立——(0,1) 上连续但不一致连续的函数就是标准反例；此时本方法不适用，也不能据此断言结论为假。',
    body: '对每点取一个使局部结论成立的邻域 → 这些邻域构成 K 的开覆盖 → 取有限子覆盖 → 把有限多个局部结论用「取最小 δ」的方式合并 → 得到 K 上的一致结论。',
    formal: { applicableTo: ['rudin:compact-set'], boundary: ['只适用于紧致集；非紧致情形需要另找一致性来源（例如等度连续）。'] },
    motivation: {
      internal: ['逐点成立听起来已经足够强，但它给不出统一的阈值；有限覆盖正是把「无穷多个阈值」压成「有限多个」的那一步。'],
      external: ['一致连续、一致收敛与数值方法的稳定性估计都靠这一步。'],
      aesthetic: ['用「有限」换取「一致」。'],
      growthChain: ['逐点结论在应用时失灵 → 发现缺的是统一阈值 → 用有限子覆盖补上 → 紧致性成为一致性的来源'],
    },
    teaching: {
      selfCheck: [selfCheck('sc-rudin-compact-1', '说明为什么「[0,1] 上连续 ⇒ 一致连续」的证明在 (0,1) 上失效。', '判定', 'rudin:method-compactness-transfer', '(0,1) 不紧致，开覆盖取不到有限子覆盖，δ 无法统一。')],
      reviewQuestions: ['有限覆盖定理在证明中究竟替代了哪一步？'],
      evidenceStatus: 'DEF',
    },
  },
];

/** 行动契约：输入取自 Rudin 自己的依赖顺序。 */
const actionSpecs = [
  ['ordered-field', 'definition', '引入有序域', ['bg:set:function', 'bg:logic:quantifier']],
  ['least-upper-bound', 'deduction', '陈述实数域的最小上界性', ['rudin:ordered-field']],
  ['extended-real', 'definition', '引入扩充实数系', ['rudin:least-upper-bound']],
  ['complex-field', 'construction', '构造复数域', ['rudin:least-upper-bound']],
  ['euclidean-space', 'definition', '引入欧氏空间 R^k', ['rudin:complex-field', 'rudin:least-upper-bound']],
  ['countable-set', 'definition', '引入可数与不可数集', ['bg:set:function', 'rudin:ordered-field']],
  ['metric-space', 'definition', '引入度量空间', ['rudin:euclidean-space', 'rudin:countable-set']],
  ['compact-set', 'deduction', '陈述紧致性与 Heine–Borel 定理', ['rudin:metric-space']],
  ['perfect-set', 'definition', '引入完全集与 Cantor 集', ['rudin:compact-set']],
  ['connected-set', 'definition', '引入连通集', ['rudin:metric-space']],
  ['convergent-sequence', 'definition', '引入收敛序列与子序列', ['rudin:metric-space']],
  ['bolzano-weierstrass', 'deduction', '陈述 Bolzano–Weierstrass 定理', ['rudin:convergent-sequence', 'rudin:compact-set']],
  ['cauchy-sequence', 'definition', '引入 Cauchy 序列与完备性', ['rudin:convergent-sequence']],
  ['limit-superior', 'definition', '引入上极限与下极限', ['rudin:cauchy-sequence']],
  ['series-convergence', 'deduction', '给出级数收敛判据', ['rudin:cauchy-sequence', 'rudin:limit-superior']],
  ['power-series', 'deduction', '给出幂级数的收敛半径', ['rudin:series-convergence']],
  ['absolute-convergence', 'deduction', '讨论绝对收敛与重排', ['rudin:series-convergence']],
  ['function-limit', 'definition', '引入函数的极限', ['rudin:metric-space']],
  ['continuous-function', 'definition', '引入连续函数', ['rudin:function-limit']],
  ['continuity-compactness', 'deduction', '证明紧致集上连续函数的性质', ['rudin:continuous-function', 'rudin:compact-set']],
  ['continuity-connectedness', 'deduction', '证明介值定理', ['rudin:continuous-function', 'rudin:connected-set']],
  ['derivative', 'definition', '引入导数', ['rudin:continuous-function', 'rudin:function-limit']],
  ['mean-value-theorem', 'deduction', '证明中值定理', ['rudin:derivative', 'rudin:continuity-compactness']],
  ['lhospital-rule', 'deduction', '陈述 L’Hospital 法则', ['rudin:mean-value-theorem']],
  ['taylor-theorem', 'deduction', '陈述 Taylor 定理', ['rudin:mean-value-theorem']],
  ['vector-derivative', 'definition', '引入向量值函数的微分', ['rudin:derivative', 'rudin:euclidean-space']],
  ['riemann-stieltjes', 'construction', '构造 Riemann–Stieltjes 积分', ['rudin:continuity-compactness', 'rudin:limit-superior']],
  ['integral-properties', 'deduction', '给出积分的性质', ['rudin:riemann-stieltjes']],
  ['fundamental-theorem', 'deduction', '证明微积分基本定理', ['rudin:integral-properties', 'rudin:derivative']],
  ['rectifiable-curve', 'definition', '引入可求长曲线', ['rudin:integral-properties', 'rudin:vector-derivative']],
  ['uniform-convergence', 'definition', '引入一致收敛', ['rudin:series-convergence', 'rudin:continuous-function']],
  ['uniform-convergence-properties', 'deduction', '讨论一致收敛保持的性质', ['rudin:uniform-convergence', 'rudin:fundamental-theorem']],
  ['equicontinuous', 'definition', '引入等度连续族', ['rudin:uniform-convergence-properties', 'rudin:compact-set']],
  ['stone-weierstrass', 'deduction', '陈述 Stone–Weierstrass 定理', ['rudin:equicontinuous']],
  ['exponential-logarithm', 'construction', '构造指数函数与对数函数', ['rudin:power-series', 'rudin:uniform-convergence-properties']],
  ['trigonometric-functions', 'construction', '构造三角函数', ['rudin:exponential-logarithm']],
  ['algebraic-completeness', 'deduction', '证明代数基本定理', ['rudin:exponential-logarithm', 'rudin:complex-field']],
  ['fourier-series', 'construction', '展开 Fourier 级数', ['rudin:trigonometric-functions', 'rudin:uniform-convergence-properties']],
  ['gamma-function', 'construction', '构造 Γ 函数', ['rudin:integral-properties', 'rudin:exponential-logarithm']],
  ['linear-transformation', 'definition', '引入线性变换与算子范数', ['bg:linear:vector', 'rudin:euclidean-space']],
  ['several-variable-derivative', 'definition', '引入多元函数的导数', ['rudin:linear-transformation', 'rudin:derivative']],
  ['contraction-principle', 'deduction', '证明压缩映射原理', ['rudin:metric-space', 'rudin:several-variable-derivative']],
  ['inverse-function-theorem', 'deduction', '证明反函数定理', ['rudin:contraction-principle', 'rudin:several-variable-derivative']],
  ['implicit-function-theorem', 'deduction', '证明隐函数定理', ['rudin:inverse-function-theorem']],
  ['rank-theorem', 'deduction', '证明秩定理', ['rudin:implicit-function-theorem', 'rudin:linear-transformation']],
  ['primitive-mapping', 'definition', '引入本原映射与单位分解', ['rudin:several-variable-derivative', 'rudin:integral-properties']],
  ['differential-form', 'definition', '引入微分形式', ['rudin:primitive-mapping', 'bg:linear:vector']],
  ['simplex-chain', 'definition', '引入单形与链', ['rudin:differential-form']],
  ['stokes-theorem', 'deduction', '证明 Stokes 定理', ['rudin:simplex-chain', 'rudin:fundamental-theorem']],
  ['closed-exact-form', 'deduction', '讨论闭形式与恰当形式', ['rudin:stokes-theorem']],
  ['set-function', 'definition', '引入集合函数', ['rudin:integral-properties']],
  ['lebesgue-measure', 'construction', '构造 Lebesgue 测度', ['rudin:set-function']],
  ['measurable-function', 'definition', '引入可测函数', ['rudin:lebesgue-measure']],
  ['lebesgue-integral', 'construction', '构造 Lebesgue 积分', ['rudin:measurable-function', 'rudin:riemann-stieltjes']],
  ['l2-space', 'construction', '构造 L² 空间', ['rudin:lebesgue-integral', 'rudin:fourier-series']],
];

const methodInputs = {
  'rudin:method-epsilon-estimate': ['rudin:convergent-sequence', 'rudin:continuous-function'],
  'rudin:method-compactness-transfer': ['rudin:compact-set', 'rudin:continuous-function'],
};

const bySlug = new Map(spec.map((item) => [item.slug, item]));
const accepts = ['definition', 'statement'];
const provides = ['definition', 'statement'];

function shared(item) {
  return {
    discipline: item.discipline,
    case: 'rudin',
    summary: item.predicate + '。',
    formal: { assumptions: [], boundary: NOT_WRITTEN },
    representations: [],
    // 只挂名字：没有正文块，站点如实显示「没有正文」。
    contentRef: false,
    provenance: { sources: [source(item.chapter, item.section)], note: provenanceNote },
  };
}

function buildNode(item) {
  if (item.kind === 'claim') {
    return claim(`rudin:${item.slug}`, item.title, {
      ...shared(item),
      roles: [item.role],
      formula: item.predicate,
      teaching: {
        evidenceStatus: 'REF',
        reviewQuestions: [`${item.title}的结论在去掉哪个前提后会失效？`],
      },
    });
  }
  return concept(`rudin:${item.slug}`, item.title, {
    ...shared(item),
    objectType: item.objectType,
    parameters: item.parameters,
    predicate: item.predicate,
    teaching: {
      evidenceStatus: 'REF',
      reviewQuestions: [`${item.title}的定义中，哪个条件可以去掉而不失去主要结论？`],
    },
  });
}

export const rudinNodes = spec.map(buildNode);

export const rudinMethodNodes = methodSpec.map((item) => method(item.id, item.title, {
  discipline: item.discipline, case: 'rudin', scope: item.scope,
  summary: item.summary, In: item.In, Out: item.Out, Pre: item.Pre, Post: item.Post,
  Use: item.Use, Demo: item.Demo, Fail: item.Fail, body: item.body,
  formal: item.formal,
  motivation: item.motivation,
  teaching: item.teaching,
  contentRef: false,
  provenance: { sources: [source(item.chapter, item.section)], note: provenanceNote + ' 方法由教材相应章节的惯用论证提炼，教材未单列同名条目。' },
}));

export const rudinActions = [
  ...actionSpecs.map(([slug, mode, title, inputs]) => action(
    `a-rudin:${slug}`, mode, title,
    inputs.map((nodeId) => input(nodeId, accepts)),
    [output(`rudin:${slug}`, provides)],
    { witness: { type: 'declared-contract', status: 'REF', ref: source(bySlug.get(slug).chapter, bySlug.get(slug).section) } },
  )),
  ...methodSpec.map((item) => action(
    `a-${item.id}`, 'method', `提出方法：${item.title}`,
    methodInputs[item.id].map((nodeId) => input(nodeId, accepts)),
    [output(item.id, ['method'])],
    { witness: { type: 'method-presentation', status: 'DEF', ref: source(item.chapter, item.section) } },
  )),
];

/** 关系：与本站既有案例对接的同名接口，以及教材内部的包含方向。 */
export const rudinRelations = [
  relation('rel-rudin-lub-specialization', 'specialization', 'rudin:least-upper-bound', 'rudin:ordered-field',
    { witness: { type: 'same-carrier-implication', status: 'REF', ref: source('Chapter 1 The Real and Complex Number Systems', '§1.19') },
      scope: '实数域是在有序域上再加最小上界性得到的；反过来不成立（有理数域是有序域但不满足最小上界性）。' }),
  relation('rel-rudin-complete-specialization', 'specialization', 'rudin:cauchy-sequence', 'rudin:convergent-sequence',
    { witness: { type: 'same-carrier-implication', status: 'REF', ref: source('Chapter 3 Numerical Sequences and Series', '§3.11') },
      scope: '在 R^k 中 Cauchy 序列恰是收敛序列；一般度量空间里只有一边成立。' }),
  relation('rel-rudin-crossdomain-metric', 'crossDomain', 'dg:metric-space', 'rudin:metric-space',
    { witness: { type: 'cross-domain-interface', status: 'DEF' },
      scope: '本站 dg 案例（微分几何笔记语料）与 Rudin 案例登记的是同一层度量空间概念；两处保留，不互相覆盖。',
      task: '度量空间在两个案例之间的接口。' }),
  relation('rel-rudin-crossdomain-compact', 'crossDomain', 'dg:compactness', 'rudin:compact-set',
    { witness: { type: 'cross-domain-interface', status: 'DEF' },
      scope: 'dg 案例按「开覆盖有有限子覆盖」登记紧致性；Rudin 案例额外把 R^k 中的有界闭判据（Heine–Borel）写进同一节点。',
      task: '紧致性的跨案例接口。' }),
  relation('rel-rudin-crossdomain-inverse', 'crossDomain', 'dg:inverse-function-theorem', 'rudin:inverse-function-theorem',
    { witness: { type: 'cross-domain-interface', status: 'DEF' },
      scope: '两处登记同一条定理；dg 案例的表述要求 dF_p 为线性同构，Rudin 案例的表述要求 f′(a) 可逆，二者等价。',
      task: '反函数定理的跨案例接口。' }),
  relation('rel-rudin-crossdomain-implicit', 'crossDomain', 'dg:implicit-function-theorem', 'rudin:implicit-function-theorem',
    { witness: { type: 'cross-domain-interface', status: 'DEF' },
      scope: '同一条定理的两处登记；Rudin 案例补出 g′(a) 由 F 的偏导数给出的那一半。',
      task: '隐函数定理的跨案例接口。' }),
  relation('rel-rudin-crossdomain-stokes', 'crossDomain', 'dg:generalized-stokes-theorem', 'rudin:stokes-theorem',
    { witness: { type: 'cross-domain-interface', status: 'DEF' },
      scope: 'dg 案例按带边流形与具紧支集形式表述；Rudin 案例按单形与链表述，二者是同一恒等式的两种语言。',
      task: 'Stokes 定理的跨案例接口。' }),
  relation('rel-rudin-crossdomain-form', 'crossDomain', 'dg:differential-form', 'rudin:differential-form',
    { witness: { type: 'cross-domain-interface', status: 'DEF' },
      scope: '两处登记同微分形式概念；Rudin 案例的系数写在 R^n 的坐标下，dg 案例写在流形上。',
      task: '微分形式的跨案例接口。' }),
  relation('rel-rudin-crossdomain-real', 'crossDomain', 'bg:real:metric', 'rudin:least-upper-bound',
    { witness: { type: 'cross-domain-interface', status: 'DEF' },
      scope: '本站共享背景 bg:real:metric 把实数完备性当作**已声明的背景**；Rudin 案例恰是把这条性质本身作为第一个里程碑来建立。',
      task: '实数完备性作为背景与作为结论的两种用法。' }),
  relation('rel-rudin-crossdomain-case', 'crossDomain', 'limit:limit-ed', 'rudin:function-limit',
    { witness: { type: 'cross-domain-interface', status: 'DEF' },
      scope: '本站 limit 案例的 ε–δ 定义与 Rudin 的函数极限是同一层概念；limit 案例另立序列式定义并在 Bridge 定理汇合。',
      task: '函数极限的跨案例接口。' }),

  /*
   * 硬前置（`hardPrereq`，2026-10 补）。
   *
   * 分两种见证，**从数据上就能分开**（这正是第五十二轮留下的两处欠账）：
   * 1. `definitional-dependency` + `DEF`：不用它，目标节点的**定义或陈述**就写不出来；
   * 2. `proof-dependency` + `PROOF` + `ref` 指向证据条目：目标的**论证**用到它。
   *    第二种的 `ref` 必须指向一条同时列了两端节点的证据记录（校验器会核对），
   *    所以「某定理用到另一条定理」这句话是可核的，不是一句注释。
   *
   * 只登记主干与两处定理连接；方法、练习类节点不登记。
   */
  relation('rel-rudin-pre-metric-convergent', 'hardPrereq', 'rudin:metric-space', 'rudin:convergent-sequence', {
    witness: { type: 'definitional-dependency', status: 'DEF', scope: '谓词写「p_n → p 指对任意 ε > 0 存在 N 使 n ≥ N 时 d(p_n,p) < ε」：距离 d、收敛的邻域语言都来自度量空间。' },
    scope: '序列收敛在度量空间里定义；删去度量，ε 与 d 都没有对象。',
  }),
  relation('rel-rudin-pre-metric-cauchy', 'hardPrereq', 'rudin:metric-space', 'rudin:cauchy-sequence', {
    witness: { type: 'definitional-dependency', status: 'DEF', scope: '谓词写「对任意 ε > 0 存在 N 使 m,n ≥ N 时 d(p_m,p_n) < ε」：Cauchy 条件完全由度量 d 表述。' },
    scope: 'Cauchy 序列是「自身越来越近」的点列，靠近由 d 给出。',
  }),
  relation('rel-rudin-pre-metric-compact', 'hardPrereq', 'rudin:metric-space', 'rudin:compact-set', {
    witness: { type: 'definitional-dependency', status: 'DEF', scope: '谓词写「K ⊂ X 紧致当且仅当 K 的任一开覆盖有有限子覆盖」，并给出 R^k 的有界闭判据：开集、子集、有界都按度量空间定义。' },
    scope: '紧致性是度量（拓扑）空间里子集的性质。',
  }),
  relation('rel-rudin-pre-metric-connected', 'hardPrereq', 'rudin:metric-space', 'rudin:connected-set', {
    witness: { type: 'definitional-dependency', status: 'DEF', scope: '谓词用「不存在开集 A、B 使 E∩A、E∩B 非空、E ⊂ A∪B 且 E∩A∩B = ∅」定义连通：开集来自度量空间。' },
    scope: '连通性由开集分离表述；没有拓扑就没有这条定义。',
  }),
  relation('rel-rudin-pre-convergent-series', 'hardPrereq', 'rudin:convergent-sequence', 'rudin:series-convergence', {
    witness: { type: 'definitional-dependency', status: 'DEF', scope: '谓词写「Σ a_n 收敛指部分和序列收敛」：级数的收敛性直接定义为序列的收敛性。' },
    scope: '级数是部分和序列的简称；删去序列收敛，级数收敛无从定义。',
  }),
  relation('rel-rudin-pre-power-exponential', 'hardPrereq', 'rudin:power-series', 'rudin:exponential-logarithm', {
    witness: { type: 'definitional-dependency', status: 'DEF', scope: '谓词写「E(z) = Σ z^n/n! 在 C 上收敛」：E 就是一条幂级数，收敛半径的语言来自幂级数。' },
    scope: '指数函数是幂级数的第一个用例；没有幂级数就没有这个定义。',
  }),
  relation('rel-rudin-pre-compact-continuity', 'hardPrereq', 'rudin:compact-set', 'rudin:continuity-compactness', {
    witness: { type: 'definitional-dependency', status: 'DEF', scope: '谓词写「紧致集在连续映射下的像是紧致的；因此紧致集上的连续实函数有界并取到最值，且一致连续」：主语是紧致集。' },
    scope: '这一组结论全部以紧致集为条件；删去它没有可陈述的定理。',
  }),
  relation('rel-rudin-pre-connected-continuity', 'hardPrereq', 'rudin:connected-set', 'rudin:continuity-connectedness', {
    witness: { type: 'definitional-dependency', status: 'DEF', scope: '谓词写「连通集在连续映射下的像是连通的；因此区间上的连续实函数取到中间值」：主语是连通集。' },
    scope: '介值定理是连通性在连续映射下的推论；条件就是连通集。',
  }),
  relation('rel-rudin-pre-derivative-mvt', 'hardPrereq', 'rudin:derivative', 'rudin:mean-value-theorem', {
    witness: { type: 'definitional-dependency', status: 'DEF', scope: '中值定理的陈述里出现 f′(x)：导数节点给出这个记号与它的定义。' },
    scope: '没有导数，中值定理的等式 f(b) − f(a) = f′(x)(b − a) 写不出来。',
  }),
  relation('rel-rudin-pre-linear-several', 'hardPrereq', 'rudin:linear-transformation', 'rudin:several-variable-derivative', {
    witness: { type: 'definitional-dependency', status: 'DEF', scope: 'R^n 上函数的导数定义为线性映射 A 加上 o(h) 的余项；「线性映射」与算子范数由线性变换节点给出。' },
    scope: '多元导数是线性映射；它的估计式用算子范数写。',
  }),
  relation('rel-rudin-pre-simplex-stokes', 'hardPrereq', 'rudin:simplex-chain', 'rudin:stokes-theorem', {
    witness: { type: 'definitional-dependency', status: 'DEF', scope: 'Stokes 定理按「单形与链」表述：积分域是 k-链，边界算子 ∂ 出现在定理的左边。' },
    scope: '定理的主语是链与它的边界；没有链就没有这条定理的陈述。',
  }),
  // 见证类型 2：论证用到它。ref 指向同时列了两端节点的证据记录，校验器核对。
  relation('rel-rudin-proof-contraction-inverse', 'hardPrereq', 'rudin:contraction-principle', 'rudin:inverse-function-theorem', {
    witness: { type: 'proof-dependency', status: 'PROOF', ref: 'ev-rudin-inverse-from-contraction', scope: '教材把反函数定理放在压缩映射原理之后证明：把局部可逆性化为压缩映射的不动点问题。' },
    scope: '这是**推导**依赖（不是定义材料）：反函数定理的陈述里没有压缩映射，但它的证明要用。',
  }),
  relation('rel-rudin-proof-inverse-implicit', 'hardPrereq', 'rudin:inverse-function-theorem', 'rudin:implicit-function-theorem', {
    witness: { type: 'proof-dependency', status: 'PROOF', ref: 'ev-rudin-implicit-from-inverse', scope: '教材按「反函数定理 → 隐函数定理」的顺序给出证明：把 F(x,y)=0 化为 (x,y) ↦ (x, F(x,y)) 的反函数问题。' },
    scope: '同样是**推导**依赖：隐函数定理的陈述里没有反函数定理，但它的证明要用。',
  }),
];

/**
 * 证据：每个节点一条 `reference` 级记录。
 *
 * 正文尚未撰写，因此这里只声明「该节点对应教材某章某节」，
 * 不声明本站写过任何论证；`checkStatus` 固定 `not_run`。
 */
export const rudinEvidence = [
  ...spec.map((item) => evidence(
    `ev-rudin-${item.slug}`,
    'reference',
    item.kind === 'claim' ? 'PROOF' : 'DEF',
    'not_run',
    `${item.title}：教材 ${item.chapter} ${item.section} 的对应内容`,
    {
      scope: '本节点目前只登记标题、所属小节与依赖关系，正文尚未撰写；教材表述未逐条核对。',
      nodes: [`rudin:${item.slug}`],
      obligations: [
        '撰写节点正文（动机、形式、条件反例、回看提问）',
        '未编码为第 02 章 ND 证书（正文都还没有，更谈不上机器核验）',
        '逐条核对教材对应小节的表述与编号',
      ],
      reference: source(item.chapter, item.section),
    },
  )),
  ...methodSpec.map((item) => evidence(
    `ev-${item.id.replace(':', '-')}`,
    'reference', 'DEF', 'not_run',
    `${item.title}：教材相应章节惯用论证的提炼`,
    {
      scope: '方法本身是操作步骤，不是可证命题；正文尚未撰写。',
      nodes: [item.id],
      obligations: [
        '撰写方法节点正文',
        '未编码为第 02 章 ND 证书',
        '核对提炼出的步骤与教材论证一致',
      ],
      reference: source(item.chapter, item.section),
    },
  )),
  /*
   * 两条**证明依赖**的证据记录（2026-10 加）。
   *
   * 形状与别的证据一样，区别只在用途：`hardPrereq` 里 `witness.type = 'proof-dependency'`
   * 的边必须指向一条**同时列出两端节点**的证据——这样「某定理用到另一条定理」在数据上可核：
   * 校验器会检查引用存在、状态为 PROOF、且 `nodes` 同时包含被依赖者与依赖者。
   *
   * 依据说明：本案例的正文尚未撰写，这两条依赖的依据是**教材的证明顺序**
   * （与 `data/cases/rudin.mjs` 里行动契约的输入一致：a-rudin:inverse-function-theorem 的输入含
   * rudin:contraction-principle，a-rudin:implicit-function-theorem 的输入含 rudin:inverse-function-theorem），
   * **不是**本站转录的证明。义务里写明「未逐页核对教材证明文本」。
   */
  evidence('ev-rudin-inverse-from-contraction', 'reference', 'PROOF', 'not_run',
    '反函数定理的证明依赖压缩映射原理', {
      scope: '教材 §9.24 的反函数定理在 §9.23 的压缩映射原理之后给出：先把 f 的局部可逆性化为压缩映射的不动点问题，再回到原映射。',
      nodes: ['rudin:contraction-principle', 'rudin:inverse-function-theorem'],
      obligations: [
        '未逐页核对教材证明文本（只按目录顺序与本案例行动契约的输入登记）',
        '未编码为第 02 章 ND 证书',
      ],
      reference: source('Chapter 9 Functions of Several Variables', '§9.23–9.24（p220–223）'),
    }),
  evidence('ev-rudin-implicit-from-inverse', 'reference', 'PROOF', 'not_run',
    '隐函数定理的证明依赖反函数定理', {
      scope: '教材 §9.28 的隐函数定理用反函数定理证明：把方程 F(x,y)=0 化为映射 (x,y) ↦ (x, F(x,y)) 的反函数问题。',
      nodes: ['rudin:inverse-function-theorem', 'rudin:implicit-function-theorem'],
      obligations: [
        '未逐页核对教材证明文本（只按目录顺序与本案例行动契约的输入登记）',
        '未编码为第 02 章 ND 证书',
      ],
      reference: source('Chapter 9 Functions of Several Variables', '§9.24、§9.28（p221–228）'),
    }),
];

export const rudinSupport = [
  support('sup-rudin-inverse-route', 'rudin:inverse-function-theorem', 'route', 'known',
    { set: ['rudin:contraction-principle', 'rudin:several-variable-derivative'], minimal: true, evidence: ['ev-rudin-inverse-function-theorem'] }),
  support('sup-rudin-stokes-route', 'rudin:stokes-theorem', 'route', 'known',
    { set: ['rudin:simplex-chain', 'rudin:fundamental-theorem'], minimal: true, evidence: ['ev-rudin-stokes-theorem'] }),
  // 未登记支持记录时保留 Unknown；「没查」不写成空集。
  support('sup-rudin-rank-route', 'rudin:rank-theorem', 'route', 'unknown',
    { reason: '秩定理的路线级输入支持尚未登记；未知不等于空支持。' }),
];

export const rudinClaims = spec
  .filter((item) => item.kind === 'claim')
  .map((item) => claimRecord(
    `claim-rudin-${item.slug}`,
    `rudin:${item.slug}`,
    item.predicate,
    [`ev-rudin-${item.slug}`],
    'PROOF',
  ));

/** 话题聚合按教材十一章分块。 */
export const rudinAggregates = [
  {
    id: 'agg-rudin-pma', kind: 'topic', title: 'Rudin《数学分析原理》第三版·凝练路径',
    blocks: [
      ['rudin:ordered-field', 'rudin:least-upper-bound', 'rudin:extended-real', 'rudin:complex-field', 'rudin:euclidean-space'],
      ['rudin:countable-set', 'rudin:metric-space', 'rudin:compact-set', 'rudin:perfect-set', 'rudin:connected-set'],
      ['rudin:convergent-sequence', 'rudin:bolzano-weierstrass', 'rudin:cauchy-sequence', 'rudin:limit-superior', 'rudin:series-convergence', 'rudin:power-series', 'rudin:absolute-convergence'],
      ['rudin:function-limit', 'rudin:continuous-function', 'rudin:continuity-compactness', 'rudin:continuity-connectedness'],
      ['rudin:derivative', 'rudin:mean-value-theorem', 'rudin:lhospital-rule', 'rudin:taylor-theorem', 'rudin:vector-derivative'],
      ['rudin:riemann-stieltjes', 'rudin:integral-properties', 'rudin:fundamental-theorem', 'rudin:rectifiable-curve'],
      ['rudin:uniform-convergence', 'rudin:uniform-convergence-properties', 'rudin:equicontinuous', 'rudin:stone-weierstrass'],
      ['rudin:exponential-logarithm', 'rudin:trigonometric-functions', 'rudin:algebraic-completeness', 'rudin:fourier-series', 'rudin:gamma-function'],
      ['rudin:linear-transformation', 'rudin:several-variable-derivative', 'rudin:contraction-principle', 'rudin:inverse-function-theorem', 'rudin:implicit-function-theorem', 'rudin:rank-theorem'],
      ['rudin:primitive-mapping', 'rudin:differential-form', 'rudin:simplex-chain', 'rudin:stokes-theorem', 'rudin:closed-exact-form'],
      ['rudin:set-function', 'rudin:lebesgue-measure', 'rudin:measurable-function', 'rudin:lebesgue-integral', 'rudin:l2-space'],
      ['rudin:method-epsilon-estimate', 'rudin:method-compactness-transfer'],
    ],
    note: '块按教材十一章划分；跨章依赖由行动契约表达，块成员关系本身不构成必修链。',
  },
];

export const rudin = {
  nodes: [...rudinNodes, ...rudinMethodNodes],
  actions: rudinActions,
  relations: rudinRelations,
  evidence: rudinEvidence,
  support: rudinSupport,
  claims: rudinClaims,
  patterns: [],
  aggregates: rudinAggregates,
};

/** 供接线与测试核对：本案例的规模。 */
export const rudinSummary = {
  conceptCount: spec.filter((item) => item.kind === 'concept').length,
  claimCount: spec.filter((item) => item.kind === 'claim').length,
  methodNodeCount: rudinMethodNodes.length,
  nodeCount: rudin.nodes.length,
  actionCount: rudinActions.length,
  relationCount: rudinRelations.length,
  evidenceCount: rudinEvidence.length,
};
