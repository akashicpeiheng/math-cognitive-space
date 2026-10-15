/**
 * 《简明高等代数》（蒋剑剑、林秀清 编著）案例。
 *
 * ## 来源与身份（可核验）
 *
 * 本机只读共享版 PDF：`reference/paths/简明高等代数（配套教材共享版）.pdf`
 * （208 页 PDF；正文印刷 1–199 页，纸版由厦门大学出版社发行，共享版按 CC BY 4.0 发布；
 * 编译日期 2026-04-26）。作者与书名取自该 PDF 的标题页（第 1–2 页）。
 *
 * **章节、节名与页码取自 PDF 自带书签（hyperref outline），不是 OCR**：
 * 这份 PDF 是 LaTeX + dvipdfmx 生成的，正文有文本层，但中文用的是缺 ToUnicode 映射的
 * 子集字体，`extract_text` 抽出来的中文是乱码（数字与页码正常）。书签里的中文标题是
 * 正常文本，因此目录用书签，**不引用 PDF 的正文文字**。
 *
 * 页码口径：PDF 页码 − 6 = 印刷页码（导言起于 PDF 7 = 印刷 1，第 1 章起于 PDF 15 = 印刷 9）。
 * 这个偏移对全部 8 章、44 节逐条核对过：书签页码与目录页上印的页码一致
 * （例如目录页印「3.3 行列式的定义 … 58」，书签给出 PDF 64 → 印刷 58）。
 * 节点只引用「章 + 节号 + 印刷页码」，用之前建议对着纸本再核一次。
 *
 * ## 内容与本次修订
 *
 * 47 个里程碑 + 4 个方法节点已有正文，原稿在 11-jiang.md。
 * 第一程四站及消元法于 2026-10-15 精修，独立源在 11-jiang-first-stage.md：
 * 同一个方程贯穿例子，明确任意域上的参数化和有限域计数，区分同解与双射。
 * 定义、一般正文证明、有限实例检查和机器检查状态分别记录。
 * 其余各程保留原稿与原有证据状态，本次未逐条复核。
 *
 * ## 路径规划
 *
 * 47 个里程碑（27 概念 + 20 断言）+ 4 个方法，八章分七程。
 * 推荐阅读顺序见 web/src/example-paths.ts；第一程行动契约与硬前置按实际
 * 数学依赖登记，不把教材节序当必要性，也不预借第二程的矩阵理论。
 */
import {
  concept, claim, method,
  action, input, output, relation, evidence, support, claimRecord, selfCheck,
} from '../authoring.mjs';
import { jiangFirstStage } from './jiang-first-stage.mjs';

const BOOK = '蒋剑剑、林秀清《简明高等代数》（纸版：厦门大学出版社；本机共享版 PDF：reference/paths/简明高等代数（配套教材共享版）.pdf，208 页 PDF / 正文印刷 1–199 页）';
const provenanceNote = '本轮只登记节点位置与依赖；正文尚未撰写（contentRef: false），教材对应小节的表述未逐条核对。';
const provenanceNoteWritten = '正文已按本站《MCS 节点写作指南》（mcs-object-note@2026-10-13.1）的 T0 骨架与类型卡撰写，正文块在 data/cases/11-jiang.md；章节、节号与印刷页码取自 PDF 书签，教材正文未逐字核对。';
const NOT_WRITTEN = ['正文尚未撰写：本节点目前只登记标题、所属小节与依赖关系；条件边界与逐条反例留待补写正文时核对教材对应小节。'];

/**
 * 已写出正文的节点（正文块在 `data/cases/11-jiang.md`）。
 *
 * 键是 slug，值给出这一版的**边界**（`formal.boundary`）与来源补充。三条纪律：
 * - 正文写了，就不能再挂着「正文尚未撰写」——边界与来源说明同步改写，页面不许自相矛盾；
 * - `contentRef` 指到真实块名（`jiang:<slug>`），形成检查会核对块存在且非空（`core/ontology.mjs`）；
 * - 边界里必须写明**这一版没有做什么**（教材正文未逐字核对、未证明的结论、未核验的出处），
 *   不许用「已按教材撰写」这类无法核对的措辞。
 */
const WRITTEN = {
  'matrix-operations': {
    boundary: '正文给出按位置加法与数乘的定义、F^{m×n} 是向量空间的逐位置证明（含与 F^{mn} 的同构），以及尺寸不符、误把乘法读成逐格相乘两类反例；**没有核对教材 §2.1 的正文表述**；矩阵的历史归属未核验（NOT-CLAIMED）。',
    note: '运算律的逐位置验证与同构由正文给出；教材正文未逐字核对。',
  },
  'matrix-multiplication': {
    boundary: '正文给出矩阵乘法的定义与尺寸条件、结合律与分配律的求和重排证明，以及不交换、有零因子、消去律失效的具体 2×2 反例；**没有核对教材 §2.2 的正文表述**；「矩阵乘法 = 映射复合」只登记（第七程建立），乘法复杂度的下界未核验（NOT-CLAIMED）。',
    note: '结合律的求和证明与三类反例由正文给出；复合解释留待第七程。',
  },
  'elementary-matrix': {
    boundary: '正文给出三类初等矩阵的定义、左乘即行变换（右乘即列变换）的逐类验证与显式逆，以及左右混用、把 $I$ 改一处就当可逆两类反例；**没有核对教材 §2.3 的正文表述**；「初等矩阵生成 $GL_n(F)$」只登记结论，证明在可逆矩阵节点；历史归属未核验（NOT-CLAIMED）。',
    note: '左乘右乘的逐类验证与逆矩阵由正文给出。',
  },
  'invertible-matrix': {
    boundary: '正文给出双边逆的定义与唯一性、四条等价判据，以及倒读消元过程给出的证明（含有限维下 AB=I 蕴含 BA=I 的零空间论证）；**没有核对教材 §2.3 的正文表述**；行列式判据明确留到第三程、本节点不预用；无限维单边逆只登记现象、未给例子与证明（NOT-CLAIMED）。',
    note: '等价判据的证明由正文给出；行列式判据按「不预用」处理。',
  },
  'block-matrix': {
    boundary: '正文给出分块加法与乘法的规则、尺寸匹配条件、块乘法等于指标级求和重新分组的证明，以及尺寸不匹配与块次序两类反例；**没有核对教材 §2.4 的正文表述**；分块算法与缓存的实际收益只作说明（ILLUSTRATION），未做实测；历史归属未核验（NOT-CLAIMED）。',
    note: '分块规则与重新分组证明由正文给出。',
  },
  'matrix-rank': {
    boundary: '正文给出秩的定义（阶梯形非零行数）、与消元顺序无关的论证、行秩等于列秩的初等证明（主元结构），以及四类常见误解的反例；**没有核对教材 §2.5 的正文表述**；「极大线性无关组」在第四程才正式定义，本节点只用其含义并已标注；数值秩与环上秩只登记现象（NOT-CLAIMED）。',
    note: '行秩等于列秩的证明由正文给出；极大无关组的正式定义留待第四程。',
  },
  'matrix-equivalence': {
    boundary: '正文给出相抵的定义、秩相等的充要判据、标准形 diag(I_r,O) 的存在性与唯一性（消元构造 + 秩的不变性），以及与相似/合同的对照；**没有核对教材 §2.5 的正文表述**；Smith 标准形只登记名词未核验（NOT-CLAIMED）；相似标准形属第七程。',
    note: '相抵判据与标准形的存在唯一由正文给出。',
  },
  'low-order-determinant': {
    boundary: '正文给出 2 阶与 3 阶行列式的公式、2 阶情形的完整论证（为零当且仅当成比例）与几何含义（有向面积 / 有向体积）；**没有核对教材 §3.1 的正文表述**；3 阶与混合积的一致性只作核对（ILLUSTRATION），雅可比行列式与体积形式只登记名词（NOT-CLAIMED）。',
    note: '2 阶的完整论证与 3 阶的核对由正文给出；高维推广见下一节点。',
  },
  'permutation-parity': {
    boundary: '正文给出逆序数与符号的定义、交换两个位置必改变符号的完整证明（相邻交换归约），并区分「数值依赖参照顺序」与「奇偶性不依赖」；**没有核对教材 §3.2 的正文表述**；Vandermonde 比率只登记为等价表达、未展开；拼图判据等外部应用只登记（NOT-CLAIMED）。',
    note: '相邻交换归约的证明由正文给出。',
  },
  'determinant-definition': {
    boundary: '正文给出 n 阶行列式的排列和式定义、n=2,3 的逐项核对与反称性的验证，以及「每行每列各取一个」的结构说明；**没有核对教材 §3.3 的正文表述**；「反称多重线性形式空间为一维」的唯一性刻画只登记未证；永久式的复杂性结论未核验（NOT-CLAIMED）。',
    note: '定义式与 n=2,3 核对由正文给出；唯一性刻画留待后续。',
  },
  'determinant-properties': {
    boundary: '正文给出性质 1–6 与「可逆当且仅当 det≠0」的完整论证（逐条回到定义式 + 消元论证），并逐条列出删掉每条性质的后果与四类误解的反例；**没有核对教材 §3.4 的正文表述**；唯一性公理刻画只登记（REF）；数值上「接近奇异」的判据只登记（NOT-CLAIMED）。',
    note: '性质与可逆判据的证明由正文给出；数值判据未涉及。',
  },
  'cofactor-expansion': {
    boundary: '正文给出余子式与代数余子式的定义、按任意一行（列）展开的证明（按 σ(i) 分类排列）、异行展开为零与伴随恒等式，以及四类误解的反例；**没有核对教材 §3.5 的正文表述**；Laplace 展开与 Cauchy–Binet 只登记名词未核验（NOT-CLAIMED）；伴随矩阵的数值不稳定性只作定性说明。',
    note: '展开定理与伴随恒等式的证明由正文给出。',
  },
  'determinant-multiplicative': {
    boundary: '正文给出 det(AB)=det A·det B 的分支完整证明（可逆用初等矩阵之积、不可逆用右逆矛盾），以及三条推论与三类误解的反例；**没有核对教材 §3.6 的正文表述**；长方形情形的 Cauchy–Binet 与雅可比链式法则只登记名词（NOT-CLAIMED）。',
    note: '乘法定理的两分支证明由正文给出。',
  },
  'cramer-rule': {
    boundary: '正文给出 Cramer 法则的陈述、前提（方阵且 det≠0）与完整推导（伴随公式 + 替换列的展开），并如实写明它在计算上不如消元、数值上易失稳；**没有核对教材 §3.6 的正文表述**；误差界的定量结论与 Fredholm 二择一只登记（NOT-CLAIMED）。',
    note: '公式的推导与前提说明由正文给出；效率与稳定性为定性结论。',
  },
  'column-vector-space': {
    boundary: '正文给出 F^n 的定义、八条公理的逐分量验证、标准基，以及 Ax 的两种读法（行乘列 / 列组合）；**没有核对教材 §4.1 的正文表述**；Banach/Hilbert 空间等推广只登记名词（NOT-CLAIMED）；「同维空间同构」的完整论证留到本程后段。',
    note: '公理的逐分量验证与两种读法由正文给出。',
  },
  'linear-dependence': {
    boundary: '正文给出线性相关/无关的定义与「相关 ⟺ 某向量可由其余表示」的完整证明，并逐条列出量词误读、含零向量必相关、环上失效等反例；**没有核对教材 §4.2 的正文表述**；无限组的定义与 Wronskian 判据只登记（NOT-CLAIMED）。',
    note: '等价刻画的证明与量词讨论由正文给出。',
  },
  'maximal-independent-set': {
    boundary: '正文给出极大无关组的定义、个数不变的交换引理论证、与矩阵秩的一致性，以及「极大 vs 最大」「组不唯一」等反例；**没有核对教材 §4.3 的正文表述**；环上极小生成组与拟阵等条目只登记（NOT-CLAIMED）；交换引理按逐步替换给出思路，未展开全部归纳细节。',
    note: '个数不变与主元列算法由正文给出；交换引理为概述式证明。',
  },
  'basis-dimension': {
    boundary: '正文给出基与维数的定义、坐标唯一性的证明、与极大无关组/极小生成组的等价，以及三类误解反例；**没有核对教材 §4.4 的正文表述**；无限维 Hamel 基与选择公理只登记（NOT-CLAIMED）。',
    note: '坐标唯一性与维数良定义由正文给出。',
  },
  'coordinate-transition': {
    boundary: '正文给出过渡矩阵的定义（列 = 新基在旧基下的坐标）、坐标换算公式的推导、可逆性与互逆关系，以及方向写反等四类反例；**没有核对教材 §4.5 的正文表述**；相似/合同的严格表述留到第五、七程，无限维对应物只登记（NOT-CLAIMED）。',
    note: '坐标公式与可逆性由正文给出；方向约定写明。',
  },
  'solution-structure': {
    boundary: '正文给出解集 = 特解 + 核的完整证明、维数公式 n − rank A 的自由未知量构造证明，以及齐次/非齐次对照与有限域计数（|F|^{n−r}）；**没有核对教材 §4.6 的正文表述**；Fredholm 理论与数值求基础解系的稳定性只登记（NOT-CLAIMED）；微分方程只作形式类比并已标注。',
    note: '解的形状与维数公式的证明由正文给出。',
  },
  'inner-product': {
    boundary: '正文给出内积的定义（实/复两种写法）、三条性质各自「删掉会怎样」的分析，以及 Cauchy–Schwarz 与三角不等式的完整证明；**没有核对教材 §5.1 的正文表述**；Hilbert 空间、不定型几何（洛伦兹）只登记（NOT-CLAIMED）；「内积 = 正定对称双线性型」在正定二次型节点闭环。',
    note: '三条性质的逐条分析与 C–S 的配方证明由正文给出。',
  },
  'orthogonalization': {
    boundary: '正文给出 Gram–Schmidt 过程、正交性与张成不变性的归纳证明、正交补与 V = W ⊕ W^⊥ 的完整论证，以及四类误解反例；**没有核对教材 §5.2 的正文表述**；QR 分解、正交多项式与经典过程的数值不稳定性只登记（NOT-CLAIMED）。',
    note: '过程与直和分解的证明由正文给出。',
  },
  'bilinear-quadratic-form': {
    boundary: '正文给出二次型的定义、对称矩阵表示的唯一性证明、极化公式与合同关系 A ↦ PᵀAP，以及与相抵/相似的对照；**没有核对教材 §5.3 的正文表述**；特征 2 的域与 Hessian 的具体条件只登记（NOT-CLAIMED）。',
    note: '对称表示唯一性与极化公式由正文给出。',
  },
  'quadratic-normal-form': {
    boundary: '正文给出标准形存在性的逐步配方证明（含三种对角元情形）、惯性定理的正定子空间维数法证明，以及与相抵标准形的对照；**没有核对教材 §5.4 的正文表述**；正交变换法（对角元为特征值）与一般域分类只登记（NOT-CLAIMED / REF 到第七程）。',
    note: '配方与惯性定理的证明由正文给出。',
  },
  'positive-definite': {
    boundary: '正文给出四条等价判据的循环证明（以标准形为枢纽）、顺序主子式判据的归纳段，以及四类误解反例；**没有核对教材 §5.5 的正文表述**；半正定的完整判据与 Sylvester 判据的历史归属只登记（NOT-CLAIMED）；Hessian 判据属多元微积分，未展开。',
    note: '四条等价的证明由正文给出；半正定只作差异登记。',
  },
  'polynomial-ring': {
    boundary: '正文给出 F[x] 的定义、次数可加与可逆元恰为非零常数的证明、与 Z 的逐条平行及失效处（系数在有零因子环上次数可加失效）；**没有核对教材 §6.1 的正文表述**；多元多项式与形式幂级数只登记（NOT-CLAIMED）。',
    note: '次数可加与可逆元的证明由正文给出。',
  },
  'division-algorithm': {
    boundary: '正文给出带余除法的存在唯一性完整证明（对次数归纳 + 次数可加证唯一）、终止性说明与整系数情形的失效分析；**没有核对教材 §6.1 的正文表述**；伪除法与 Gröbner 基只登记（NOT-CLAIMED）。',
    note: '存在唯一性的证明由正文给出。',
  },
  'gcd-polynomial': {
    boundary: '正文给出最大公因式的定义（被一切公因式整除）、辗转相除与回代给出的存在性与 Bézout 等式、首一化唯一性，以及三类误解反例；**没有核对教材 §6.2 的正文表述**；一般环上 gcd 不存在与多元情形只登记（NOT-CLAIMED）。',
    note: '存在性、Bézout 与唯一性的证明由正文给出。',
  },
  'irreducible-polynomial': {
    boundary: '正文给出既约多项式的定义、分解存在性与唯一性的完整证明（含「既约 ⟹ 素」的 Bézout 论证）、既约性与系数域的相对性，以及四类误解反例；**没有核对教材 §6.3 的正文表述**；非 UFD 环例子与有限域分解算法只登记（NOT-CLAIMED）；既约多项式分布不做断言。',
    note: '唯一分解与「既约 ⟺ 素」的证明由正文给出。',
  },
  'polynomial-function': {
    boundary: '正文给出因式定理、根的个数上界与插值唯一性的完整证明，以及系数在环上失效（Z/8Z 中 x²−1 有四个根）与有限域上「多项式 ≠ 多项式函数」的反例；**没有核对教材 §6.4 的正文表述**；代数基本定理与重数版本只登记（REF 到第七程），多元零点集只登记（NOT-CLAIMED）。',
    note: '因式定理、根数上界与插值唯一性由正文给出。',
  },
  'integer-polynomial': {
    boundary: '正文给出 Gauss 引理与 Eisenstein 判别法的模 p 完整证明、条件的逐条删改分析，并明确写出「判别法只是充分条件」（x⁴+1 需平移后使用）；**没有核对教材 §6.5 的正文表述**；「Z[x] 是唯一分解整环」的完整证明与 Hensel 提升只登记（NOT-CLAIMED）。',
    note: 'Gauss 引理与 Eisenstein 的证明由正文给出；UFD 结论只登记。',
  },
  'partial-fraction': {
    boundary: '正文给出部分分式分解的形状（外层互素块 + 内层幂次）、存在性的两步构造（Bézout + 带余除法）与唯一性论证，以及四类误解反例；**没有核对教材 §6.6 的正文表述**；有理函数积分的初等性与一般 UFD 上的对应理论只登记（NOT-CLAIMED）。',
    note: '分解的存在性与唯一性由正文给出。',
  },
  'chinese-remainder': {
    boundary: '正文给出中国剩余定理的存在唯一性（幂等元构造）、环同构、不互素时的反例，以及与 Lagrange 插值的对应；**没有核对教材 §6.7 的正文表述**；不互素时的完整表述、史料（物不知数等）与 CRT 加速只登记（NOT-CLAIMED）。',
    note: '幂等元构造与唯一性由正文给出；史料未核验。',
  },
  'vector-space-axioms': {
    boundary: '正文给出八条公理的逐条用途分析、三个例子（F^n、F^{m×n}、次数 ≤ n 的多项式）与两个反例（次数恰为 n、单位球面），并说明与模的关系；**没有核对教材 §7.1 的正文表述**；公理独立性未构造、Hilbert 空间等推广只登记（NOT-CLAIMED）。',
    note: '公理的逐条用途与反例由正文给出；独立性未构造。',
  },
  'linear-map-matrix': {
    boundary: '正文给出线性映射的定义、矩阵表示的存在唯一性、合成=乘法与可逆=可逆矩阵的对应、换基给出相似/相抵，以及四类误解反例；**没有核对教材 §7.2 的正文表述**；无限维算子表示只登记（NOT-CLAIMED）。',
    note: '表示的存在唯一性与复合对应由正文给出。',
  },
  'eigenvector': {
    boundary: '正文给出特征值与特征向量的定义、特征子空间是核、特征方程的等价链、三类误解反例（实矩阵可无实特征值等）；**没有核对教材 §7.3 的正文表述**；「几何重数 ≤ 代数重数」只登记未证，若尔当形与算子谱只登记（NOT-CLAIMED）。',
    note: '特征方程的等价链由正文给出；重数不等式只登记。',
  },
  'similar-criterion': {
    boundary: '正文给出相似的几何刻画、不变量计算（行列式、迹、特征多项式）、可对角化判据与「特征多项式相同不充分」的反例；**没有核对教材 §7.4 的正文表述**；迹的循环性按待补标准事实登记，若尔当形与最小多项式判据只登记（NOT-CLAIMED）；数值相似判定未涉及。',
    note: '几何刻画、不变量与可对角化判据由正文给出。',
  },
  'fundamental-theorem-algebra-proof': {
    boundary: '正文给出定理的三种等价说法与标准的模-极小值证明（并逐条写明所用分析前提：连续性、紧性、复数开 k 次方）；**没有核对教材 §7.5 的证明路线与引理**（本体依赖登记指向多项式函数与矩阵表示，本笔记未沿该路线）；代数闭包存在性、Liouville 路线与「五次以上无根式解」只登记（NOT-CLAIMED）。',
    note: '本笔记的证明为标准路线，**不声称与教材一致**；教材路线未核对。',
  },
  'isometry': {
    boundary: '正文给出等距的定义、四条等价（含用极化公式从保范数推出保内积）、行列式模为 1 与群结构，以及四类误解反例；**没有核对教材 §8.1 的正文表述**；无限维等距只需 U*U=I 的差异只登记（NOT-CLAIMED）；正交群的李群结构未涉及。',
    note: '四条等价与行列式模的证明由正文给出。',
  },
  'self-adjoint-spectral': {
    boundary: '正文给出谱定理三步完整证明（特征值实、不同特征值正交、正交特征基的归纳构造）、谱分解与正定的谱判据；**没有核对教材 §8.2 的正文表述**；无限维自伴算子谱定理与对称矩阵的数值特征值算法只登记（NOT-CLAIMED）。',
    note: '三步证明与谱分解由正文给出；无限维情形未涉及。',
  },
  'minimax-principle': {
    boundary: '正文给出 Courant–Fischer 两种形式（并写明排序约定）、Rayleigh 商是特征值加权平均的论证、双向夹逼的完整证明（含维数计算）与四类误解反例；**没有核对教材 §8.3 的正文表述**；排序约定按本体登记（递增 min-max 形式）；紧自伴算子的无限维版本与特征值扰动界只登记（NOT-CLAIMED）。',
    note: '双向夹逼证明由正文给出；排序约定写明。',
  },
  'normal-operator-calculus': {
    boundary: '正文给出正规性定义、谱分解与多项式演算的完整推导、自伴/等距/正交投影都是特例的验证，以及复实情形差异（实正规矩阵只能分块对角）；**没有核对教材 §8.4 的正文表述**；「正规 ⟹ 可正交对角化」只给证明骨架（Schur + Frobenius 范数），连续函数演算与谱测度只登记（NOT-CLAIMED）。',
    note: '多项式演算由正文给出；正规性的完整刻画只给骨架。',
  },
  'polar-svd': {
    boundary: '正文给出 SVD 存在性的构造证明（A*A 谱分解 + u_i=Av_i/σ_i）、非零奇异值个数等于秩的论证、唯一性范围（奇异值唯一、奇异向量一般不唯一）与极分解；**没有核对教材 §8.5 的正文表述**；Eckart–Young 定理、随机 SVD 与紧算子 Schmidt 展开只登记（NOT-CLAIMED）。',
    note: '存在性构造与唯一性范围由正文给出。',
  },
};

const source = (chapter, section) => `${BOOK} ${chapter} ${section}`;

/** 八章的章名（取自 PDF 书签，印刷页码见各节点）。 */
const CH = {
  1: '第1章 线性方程组',
  2: '第2章 矩阵论初步',
  3: '第3章 行列式基础',
  4: '第4章 有限维空间模型',
  5: '第5章 内积与双线性型',
  6: '第6章 一元多项式',
  7: '第7章 向量空间的态射',
  8: '第8章 欧氏空间算子论',
};

/** 概念节点：只写对象类型、参数与一句话谓词。 */
function C(slug, title, chapter, section, discipline, objectType, parameters, predicate) {
  return { kind: 'concept', slug, title, chapter, section, discipline, objectType, parameters, predicate };
}

/** 断言节点：只写公式本身与角色。 */
function T(slug, title, chapter, section, discipline, role, formula) {
  return { kind: 'claim', slug, title, chapter, section, discipline, role, predicate: formula };
}

/**
 * 47 个里程碑。`section` 为教材节号与**印刷页码**，便于逐条回查 PDF 书签与目录页。
 *
 * 学科取受控词表 `data/fields.mjs` 里的两支：`线性代数`（矩阵、行列式、空间、内积、
 * 算子）与 `域与数系`（域公理、数系、一元多项式）。第六、七章的多项式一节按
 * 「域上的多项式环」归 `域与数系`——它的用途是域扩张与唯一分解，不是线性结构。
 */
const spec = [
  // ---- 第1章 线性方程组（印刷 9–28）----
  C('field-axioms', '域的公理', CH[1], '§1.1（印刷 9–12）', '域与数系',
    '带两种运算的集合', ['F', '+', '·'],
    'F 上定义加法与乘法：加法构成交换群，非零元对乘法构成交换群，乘法对加法满足分配律，且 0 ≠ 1；有理数域 Q、实数域 R、复数域 C 与有限域 F_p（p 为素数）都是例子，解线性方程组只需用到这几条公理'),
  C('elementary-row-operations', '初等行变换', CH[1], '§1.2（印刷 13–18）', '线性代数',
    '方程组的系数表与它的同解变形', ['A', 'b', '(A|b)'],
    '把线性方程组的系数与常数项排成增广矩阵 (A|b)，对它施行三种初等行变换（交换两行、某行乘非零常数、某行加上另一行的倍数），所得方程组与原方程组同解，因此解集不变'),
  C('linear-substitution', '线性换元', CH[1], '§1.3（印刷 19–23）', '线性代数',
    '变量替换下的方程组', ['x', 'y', 'P'],
    '在域 F 上令 x_j=Σ_k p_jk y_k：若 T:y↦x 为 F^n 上的双射，将原方程完整代入得到新解集 S′=T⁻¹(S)，限制映射 T:S′→S 是双射；不可逆代入可能遗漏原解或重复表示'),
  T('solution-cases', '线性方程组解的情况', CH[1], '§1.4（印刷 24–25）', '线性代数', 'Theorem',
    '设 F 为域，A∈F^{m×n}，b∈F^m，将 [A|b] 用初等行变换化为阶梯形 [U|c]：有系数全零而常数非零的行时无解；否则令 r 为系数列主元数，解集与 F^{n−r} 双射，r=n 时唯一；若 |F|=q<∞ 则有 q^{n−r} 个解，F 无限且 r<n 时有无穷多解'),

  // ---- 第2章 矩阵论初步（印刷 29–50）----
  C('matrix-operations', '矩阵的基本运算', CH[2], '§2.1（印刷 29–32）', '线性代数',
    '数域上的矩形数表', ['A', 'B', 'λ'],
    'm×n 矩阵按位置相加、按位置与数相乘：全体 m×n 矩阵在这两种运算下构成域 F 上的向量空间 F^{m×n}，零矩阵与负矩阵由按位置运算给出'),
  C('matrix-multiplication', '矩阵乘法', CH[2], '§2.2（印刷 33–34）', '线性代数',
    '矩阵之间的乘法', ['A', 'B', 'AB'],
    '(AB)_{ij} = Σ_k a_{ik}b_{kj}，要求左矩阵的列数等于右矩阵的行数；乘法满足结合律与对加法的分配律，但一般不交换，且 AB = 0 不蕴含 A = 0 或 B = 0'),
  C('elementary-matrix', '初等矩阵', CH[2], '§2.3（印刷 35–38）', '线性代数',
    '单位矩阵经一次初等变换得到的矩阵', ['E', 'E(i,j)', 'E(i(λ))'],
    '对单位矩阵施行一次初等行（列）变换得到初等矩阵；用初等矩阵左乘 A 等于对 A 做相应的行变换，右乘等于做相应的列变换，每个初等矩阵都可逆且逆仍是同类初等矩阵'),
  C('invertible-matrix', '可逆矩阵', CH[2], '§2.3（印刷 35–38）', '线性代数',
    '存在双边逆的方阵', ['A', 'A^{-1}'],
    'n 阶方阵 A 可逆指存在同阶方阵 B 使 AB = BA = I；A 可逆当且仅当 A 可写成有限个初等矩阵之积，此时逆矩阵唯一，且用 (A|I) → (I|A^{-1}) 的初等行变换可以把它算出来'),
  C('block-matrix', '分块矩阵', CH[2], '§2.4（印刷 39–41）', '线性代数',
    '按行、列切块后的矩阵', ['A', 'A_{ij}'],
    '把矩阵的行列各分成若干段得到分块矩阵：分块加法与分块乘法按与普通矩阵相同的规则进行，只要各块的尺寸互相匹配；分块乘法让高阶矩阵的运算归约成低阶块的运算'),
  C('matrix-rank', '矩阵的秩', CH[2], '§2.5（印刷 42–44）', '线性代数',
    '矩阵的行（列）秩', ['A', 'rank A', 'r'],
    '矩阵的秩定义为它的行阶梯形中非零行的行数，也等于行向量组的极大线性无关组所含向量个数；初等变换不改变秩，因此秩是相抵意义下的不变量'),
  T('matrix-equivalence', '相抵标准形', CH[2], '§2.5（印刷 42–44）', '线性代数', 'Theorem',
    '同尺寸矩阵 A 与 B 相抵（存在可逆 P、Q 使 B = PAQ）当且仅当 rank A = rank B；每个秩为 r 的 m×n 矩阵都相抵于唯一的标准形 diag(I_r, 0)'),

  // ---- 第3章 行列式基础（印刷 51–76）----
  C('low-order-determinant', '低阶行列式', CH[3], '§3.1（印刷 51–55）', '线性代数',
    '2 阶与 3 阶方阵的行列式', ['det A', '|A|'],
    '2 阶行列式 ad − bc 是两列向量张成的有向面积；3 阶行列式按六项展开，是三个列向量张成的平行六面体的有向体积，行列式为 0 表示这些向量线性相关'),
  C('permutation-parity', '排列的逆序数', CH[3], '§3.2（印刷 56–57）', '线性代数',
    '有限集合上的排列', ['σ', 'N(σ)', 'sgn σ'],
    'n 元排列 σ 的逆序数 N(σ) 是满足 i < j 而 σ(i) > σ(j) 的数对个数；偶排列的符号 sgn σ 取 +1、奇排列取 −1，交换排列中两个位置改变奇偶性'),
  C('determinant-definition', '行列式的定义', CH[3], '§3.3（印刷 58–59）', '线性代数',
    'n 阶方阵的行列式', ['A', 'det A', 'S_n'],
    'det A = Σ_{σ ∈ S_n} sgn(σ) · a_{1σ(1)}a_{2σ(2)}…a_{nσ(n)}：对全部 n! 个排列求和，每一项的符号由该排列的奇偶性给出；n = 2、3 时它退化成低阶行列式'),
  T('determinant-properties', '行列式的性质', CH[3], '§3.4（印刷 60–62）', '线性代数', 'Theorem',
    '行列式对每一行（列）是线性的、交换两行（列）变号、两行（列）相同则为 0、把一行的倍数加到另一行不变；由此 A 可逆当且仅当 det A ≠ 0'),
  T('cofactor-expansion', '代数余子式展开', CH[3], '§3.5（印刷 63–68）', '线性代数', 'Theorem',
    'det A = Σ_j a_{ij}A_{ij}，其中 A_{ij} = (−1)^{i+j}M_{ij} 是代数余子式；异行展开给出 Σ_j a_{kj}A_{ij} = 0（k ≠ i）。这条展开把 n 阶行列式归约成 n 个 n−1 阶行列式，并给出伴随矩阵恒等式 A·adj(A) = det(A)·I'),
  T('determinant-multiplicative', '行列式的乘法定理', CH[3], '§3.6（印刷 69–71）', '线性代数', 'Theorem',
    'det(AB) = det A · det B；因此 A 可逆时 det(A^{-1}) = (det A)^{-1}，且相似矩阵的行列式相同'),
  T('cramer-rule', 'Cramer 法则', CH[3], '§3.6（印刷 69–71）', '线性代数', 'Theorem',
    'n 个方程 n 个未知量的线性方程组 Ax = b 在 det A ≠ 0 时有唯一解 x_i = det(A_i)/det A，其中 A_i 是把 A 的第 i 列换成 b 得到的矩阵'),

  // ---- 第4章 有限维空间模型（印刷 77–98）----
  C('column-vector-space', '列向量空间 F^n', CH[4], '§4.1（印刷 77–79）', '线性代数',
    'n 元列向量的全体', ['F^n', 'x', 'Ax'],
    'F^n 是全体 n 元列向量按分量加法与数乘构成的向量空间，它是有限维空间的第一个具体模型：m×n 矩阵 A 通过 x ↦ Ax 给出 F^n 到 F^m 的映射，方程组 Ax = b 就是问 b 是否在这个像里'),
  C('linear-dependence', '线性相关', CH[4], '§4.2（印刷 80–83）', '线性代数',
    '向量组之间的关系', ['α_i', 'λ_i', 'β'],
    'β 是 α_1,…,α_s 的线性组合指存在系数使 β = Σλ_iα_i；向量组线性相关指存在**不全为零**的系数使 Σλ_iα_i = 0，否则线性无关。含零向量或成比例的向量组必相关'),
  C('maximal-independent-set', '极大线性无关组', CH[4], '§4.3（印刷 84–87）', '线性代数',
    '向量组中不能再扩大的无关部分组', ['α_1,…,α_s', 'r'],
    '向量组的一个部分组线性无关、且添进原组中任一其余向量后都线性相关，就叫极大线性无关组；同一向量组的任意两个极大无关组所含向量个数相同，这个数就是向量组的秩'),
  C('basis-dimension', '空间的基', CH[4], '§4.4（印刷 88–92）', '线性代数',
    '向量空间的基与维数', ['V', 'ε_1,…,ε_n', 'dim V'],
    'V 的一组基是张成 V 的线性无关向量组；一组基所含向量的个数（维数 dim V）与基的选择无关，且 V 中每个向量表成基的线性组合的方式唯一（这组系数就是它的坐标）'),
  C('coordinate-transition', '过渡矩阵', CH[4], '§4.5（印刷 93–95）', '线性代数',
    '两组基之间的换算', ['x', 'P', 'ε', 'η'],
    '同一向量在基 ε 与基 η 下的坐标由过渡矩阵 P 联系：x_ε = P·x_η，其中 P 的第 j 列是 η_j 在 ε 下的坐标；P 可逆，且从 η 到 ε 的过渡矩阵是 P^{-1}'),
  T('solution-structure', '线性方程组解的结构', CH[4], '§4.6（印刷 96–98）', '线性代数', 'Theorem',
    'Ax = b 有解时，它的解集是 x_0 + ker A（x_0 为任一特解）；齐次方程组 Ax = 0 的解集是 F^n 的子空间，维数等于 n − rank A，它的一组基（基础解系）加上一个特解就给出全部解'),

  // ---- 第5章 内积与双线性型（印刷 99–120）----
  C('inner-product', '内积', CH[5], '§5.1（印刷 99–102）', '线性代数',
    '实（复）向量空间上的内积', ['⟨x,y⟩', '‖x‖'],
    '内积是对每个自变量线性、共轭对称且正定的二元函数；由它定义范数 ‖x‖ = √⟨x,x⟩ 与距离，并满足 Cauchy–Schwarz 不等式 |⟨x,y⟩| ≤ ‖x‖‖y‖ 与三角不等式'),
  C('orthogonalization', '正交化', CH[5], '§5.2（印刷 103–105）', '线性代数',
    '把无关组改造成正交组的过程与正交补', ['α_i', 'β_i', 'W^⊥'],
    '任意线性无关组都可以用 Gram–Schmidt 过程改造成正交组，再单位化得到标准正交基；子空间 W 的正交补 W^⊥ 与它满足 V = W ⊕ W^⊥，因此任何向量都有唯一的正交分解'),
  C('bilinear-quadratic-form', '二次型', CH[5], '§5.3（印刷 106–109）', '线性代数',
    '二次齐次多项式与它的矩阵表示', ['Q(x)', 'B(x,y)', 'A'],
    '二次型 Q(x) = Σ_{i≤j} a_{ij}x_ix_j 由对称双线性型 B 通过 Q(x) = B(x,x) 给出，在基下写成 Q(x) = x^T A x（A 对称）；换基时 A 按 A ↦ P^T A P 变化，这个关系叫合同'),
  T('quadratic-normal-form', '二次型的标准形', CH[5], '§5.4（印刷 110–113）', '线性代数', 'Theorem',
    '任一实二次型都能通过可逆线性换元化为只含平方项的标准形 Σ d_i y_i²（配方法与正交变换都可做到）；惯性定理说明标准形中正项个数 p 与负项个数 q（正、负惯性指数）由二次型本身决定，与所用的换元无关'),
  T('positive-definite', '正定二次型', CH[5], '§5.5（印刷 114–116）', '线性代数', 'Theorem',
    '实对称矩阵 A 正定（对一切 x ≠ 0 有 x^T A x > 0）当且仅当它的各阶顺序主子式都大于零，当且仅当正惯性指数等于阶数，也当且仅当存在可逆 C 使 A = C^T C'),

  // ---- 第6章 一元多项式（印刷 121–148）----
  C('polynomial-ring', '一元多项式环', CH[6], '§6.1（印刷 121–125）', '域与数系',
    '系数在域 F 中的一元多项式全体', ['F[x]', 'f(x)', 'deg f'],
    'F[x] 在通常的多项式加法与乘法下构成交换环，非零多项式有次数 deg f 且满足 deg(fg) = deg f + deg g；因此 F[x] 是整环，可逆元恰为非零常数，这与整数环 Z 的结构平行'),
  T('division-algorithm', '带余除法', CH[6], '§6.1（印刷 121–125）', '域与数系', 'Theorem',
    '对 f, g ∈ F[x]（g ≠ 0）存在唯一的 q, r 使 f = qg + r 且 deg r < deg g；r = 0 时称 g 整除 f，此时 g 的每个根都是 f 的根。它是 F[x] 与 Z 共有的第一条结构定理'),
  T('gcd-polynomial', '最大公因式', CH[6], '§6.2（印刷 126–128）', '域与数系', 'Theorem',
    'F[x] 中任两个不全为零的多项式都有最大公因式 d，且存在 u, v 使 d = uf + vg（Bézout 等式）；d 可用辗转相除法有限步算出，首一化之后唯一'),
  T('irreducible-polynomial', '既约多项式', CH[6], '§6.3（印刷 129–131）', '域与数系', 'Theorem',
    'F[x] 中次数 ≥ 1 且不能写成两个次数更低的多项式之积的多项式叫既约多项式；每个次数 ≥ 1 的多项式都能分解为既约多项式之积，且在不计次序与常数因子时分解唯一（F[x] 是唯一分解整环）'),
  T('polynomial-function', '多项式函数', CH[6], '§6.4（印刷 132–134）', '域与数系', 'Theorem',
    'a 是 f 的根当且仅当 (x − a) 整除 f；由此 n 次非零多项式在域中至多有 n 个根（计重数），并且两个次数都不超过 n 的多项式若在 n + 1 个不同点上取值相同，则它们相等'),
  T('integer-polynomial', '整系数多项式', CH[6], '§6.5（印刷 135–137）', '域与数系', 'Theorem',
    '本原整系数多项式之积仍本原（Gauss 引理），因此它在 Z[x] 中可约当且仅当在 Q[x] 中可约；若存在素数 p 使 p 不整除首项系数、p 整除其余全部系数而 p² 不整除常数项，则 f 在 Q 上既约（Eisenstein 判别法）'),
  C('partial-fraction', '部分分式分解', CH[6], '§6.6（印刷 138–140）', '域与数系',
    '有理分式的分解', ['f/g', 'g = ∏ p_i^{e_i}'],
    '真分式 f/g（deg f < deg g）在 g 的既约分解 g = c∏p_i^{e_i} 下可唯一写成 Σ_i Σ_{k≤e_i} f_{ik}/p_i^k（deg f_{ik} < deg p_i）之和；它是 F[x] 唯一分解在有理函数域上的写法，也是积分有理函数的入口'),
  T('chinese-remainder', '中国剩余定理', CH[6], '§6.7（印刷 141–143）', '域与数系', 'Theorem',
    '若 m_1,…,m_k 两两互素，则同余方程组 x ≡ a_i (mod m_i) 在模 M = m_1⋯m_k 下有唯一解；环语言下 F[x]/(M) ≅ ∏_i F[x]/(m_i)，整数情形与多项式情形是同一条定理'),

  // ---- 第7章 向量空间的态射（印刷 149–174）----
  C('vector-space-axioms', '向量空间的公理化定义', CH[7], '§7.1（印刷 149–152）', '线性代数',
    '域上的向量空间', ['V', 'F', '+', '·'],
    'V 配上加法与 F 的数乘，满足八条形变公理（加法构成交换群；数乘满足结合律、分配律与单位律）；F^n、矩阵空间与多项式空间都是例子，而「次数恰好为 n」这类额外条件不属于向量空间结构'),
  C('linear-map-matrix', '线性映射的矩阵表示', CH[7], '§7.2（印刷 153–157）', '线性代数',
    '保持线性结构的映射', ['T', 'V', 'W', '[T]'],
    'T: V → W 线性指 T(αx + βy) = αT(x) + βT(y)；取定 V 与 W 的基后 T 由唯一矩阵表示，合成对应矩阵乘法、可逆对应可逆矩阵，而换基把它改成相似（同空间）或相抵（不同空间）的矩阵'),
  C('eigenvector', '特征值与特征向量', CH[7], '§7.3（印刷 158–162）', '线性代数',
    '被线性变换保持方向的非零向量', ['T', 'λ', 'v', 'V_λ'],
    '非零向量 v 是 T 的特征向量指存在 λ 使 T(v) = λv，λ 称为特征值；在任何基下 λ 是特征方程 det(λI − A) = 0 的根，同一个 λ 的特征向量连同零向量构成特征子空间 V_λ'),
  T('similar-criterion', '矩阵相似的判别', CH[7], '§7.4（印刷 163–166）', '线性代数', 'Theorem',
    'A 与 B 相似（存在可逆 P 使 B = P^{-1}AP）当且仅当它们是同一个线性变换在两组基下的矩阵；相似矩阵有相同的特征多项式、迹与行列式，但特征多项式相同只是必要条件——可对角化的判别还要看特征子空间的维数是否铺满全空间'),
  T('fundamental-theorem-algebra-proof', '代数基本定理', CH[7], '§7.5（印刷 167–169）', '域与数系', 'Theorem',
    '任一次数 ≥ 1 的复系数多项式在 C 中至少有一个根；等价地，C 是代数闭域，每个 n 次复系数多项式恰有 n 个复根（计重数），因此 C[x] 中的既约多项式恰是一次多项式'),

  // ---- 第8章 欧氏空间算子论（印刷 175–196）----
  C('isometry', '等距变换', CH[8], '§8.1（印刷 175–179）', '线性代数',
    '保持内积的线性算子', ['U', 'U^*', 'Q'],
    'U 是等距变换指对一切 x, y 有 ⟨Ux,Uy⟩ = ⟨x,y⟩；这等价于 U 保持范数，等价于 U^*U = I；在标准正交基下它的矩阵是正交矩阵（复情形为酉矩阵），因而 det U 的模为 1'),
  T('self-adjoint-spectral', '自伴算子的谱定理', CH[8], '§8.2（印刷 180–182）', '线性代数', 'Theorem',
    '实对称矩阵（复情形自伴算子，T^* = T）的特征值都是实数，属于不同特征值的特征向量互相正交；因此存在标准正交基使 A = QΛQ^T，即实对称矩阵一定可以正交对角化'),
  T('minimax-principle', '极小极大原理', CH[8], '§8.3（印刷 183–186）', '线性代数', 'Theorem',
    '自伴算子的特征值可写成 λ_k = min_{dim W = k} max_{0 ≠ x ∈ W} ⟨Tx,x⟩/⟨x,x⟩（Courant–Fischer 极小极大原理）；它把特征值刻画成子空间上的极值，不再依赖特征多项式的根，因而可以逐个给出特征值的变分意义'),
  C('normal-operator-calculus', '正规算子演算', CH[8], '§8.4（印刷 187–190）', '线性代数',
    '与自身伴随可交换的算子及其多项式演算', ['T', 'T^*', 'p(T)', 'P_i'],
    'T 正规指 TT^* = T^*T；对正规算子可以把多项式 p 代入 T 得到 p(T)，且谱定理给出 T = Σ_i λ_i P_i（P_i 为两两正交的投影）；自伴算子、等距变换与正交投影都是正规算子的特例'),
  T('polar-svd', '奇异值分解', CH[8], '§8.5（印刷 191–192）', '线性代数', 'Theorem',
    '任一线性算子 T 可写成 T = UP，其中 P = √(T^*T) 半正定、U 为部分等距（极分解）；对矩阵即 A = UΣV^*，奇异值 σ_i = √(λ_i(A^*A)) 非负且由 A 唯一确定，非零奇异值的个数等于 rank A'),
];

/** 四个方法节点：三个局部技巧 + 一条贯穿全书的全局策略。 */
const methodSpec = [
  {
    id: 'jiang:method-elimination', title: 'Gauss 消元法', scope: '局部方法',
    discipline: '线性代数', chapter: CH[1], section: '§1.2（印刷 13–18）',
    summary: '把方程组写成增广矩阵，用初等行变换消成行阶梯形，再回代解出未知量；解的存在与自由度在阶梯形上一眼可读。',
    In: '一个具体的线性方程组 Ax = b（系数在域 F 中）', Out: '行阶梯形增广矩阵，以及无解 / 唯一解 / 自由未知量的判定',
    Pre: '已把方程组写成增广矩阵，且允许的三种同解变形已明确', Post: '得到行阶梯形；若有 0 = c（c ≠ 0）行则判无解，否则回代给出解集',
    Use: ['jiang:elementary-row-operations', 'jiang:solution-cases'], Demo: ['jiang:matrix-rank', 'jiang:solution-structure'],
    Fail: '消元法给出的是**解集**而不是解的公式：自由未知量较多时输出是一族解；数值情形下主元接近零时直接消元会放大误差，需要选主元——本方法不含数值稳定性分析。',
    body: '写增广矩阵 → 从左向右在当前行及下方找非零主元，必要时换行，整列为零则跳列 → 清零主元下方并向右下推进 → 检查矛盾行 → 无矛盾时选自由参数并倒序回代；有限域有 q^{n−r} 个解，无限域有自由变量时才有无穷多解。',
    formal: { applicableTo: ['jiang:solution-cases'], boundary: ['只处理有限个方程与未知量的线性方程组；非线性方程组的消元不在范围内。'] },
    motivation: {
      internal: ['「解方程组」这件事必须有一个能停下来的机械过程，否则「解出来」只是一句愿望；消元法把「同解变形」固定成三种行变换，于是过程可以逐步核对。'],
      external: ['数值线性代数的 LU 分解、工程与统计里的最小二乘求解都以它为骨架。'],
      aesthetic: ['把「求解」化归为「化到标准形」：形状对了，解就在里面。'],
      growthChain: ['中学的加减消元 → 写成矩阵 → 只对系数表操作 → 三种行变换固定下来 → 同一套动作也用来求逆与求秩'],
    },
    teaching: {
      readingFirst: true,
      selfCheck: [selfCheck('sc-jiang-elimination-1', '实数上对 y=1、x+y=2 消元；再把第二条改成 2y=2，说明何时换行、何时跳列。', '判定', 'jiang:method-elimination', '第一题第一列下方非零，先换行，解为 (1,1)；第二题第一列全零，应跳列，得到 y=1、x 自由。有限域中自由参数只取域内的有限值。')],
      reviewQuestions: ['为什么「某行乘非零常数」这一条里的「非零」不能去掉？'],
      evidenceStatus: 'DEF',
    },
  },
  {
    id: 'jiang:method-completing-square', title: '配方法化二次型', scope: '局部方法',
    summary: '按平方项的系数把二次型逐次配方，每配一次就少一个变量，直到只剩平方项，从而得到标准形与正负惯性指数。',
    discipline: '线性代数', chapter: CH[5], section: '§5.4（印刷 110–113）',
    In: '一个具体的实二次型 Q(x) = x^T A x', Out: '标准形 Σ d_i y_i²，以及所用的可逆线性换元',
    Pre: '已写出二次型的对称矩阵表示', Post: '得到只含平方项的标准形；正项、负项个数即正、负惯性指数，按惯性定理与换元无关',
    Use: ['jiang:bilinear-quadratic-form', 'jiang:quadratic-normal-form'], Demo: ['jiang:positive-definite'],
    Fail: '配方要求系数域上能做除法；特征为 2 的域上对称与交错混在一起，本方法不适用。若不要求换元可逆，任意二次型都能消成零——所以「换元可逆」是结论的一部分。',
    body: '写出二次型 → 若有平方项，就按它配方并作换元 → 若没有平方项，先用 x_i + x_j 型换元造出一个平方项 → 对剩余变量重复 → 汇总换元的矩阵并核对其可逆性 → 读出正负惯性指数。',
    formal: { applicableTo: ['jiang:quadratic-normal-form'], boundary: ['只在实（或特征 ≠ 2 的）系数域上讨论；复情形要另外约定「标准形」的口径。'] },
    motivation: {
      internal: ['二次型的交叉项让人看不出它的「形状」；配方把交叉项消掉，剩下的平方项系数就是它的全部不变量。'],
      external: ['多元函数的极值判定、最小二乘的正规方程与统计学里的协方差结构都归结为二次型的正定性。'],
      aesthetic: ['用一组坐标变换把对象摆正，让它自己显出标准形。'],
      growthChain: ['一元二次配方 → 多元二次型的逐次配方 → 正交变换对角化 → 惯性定理说明不变量是什么'],
    },
    teaching: {
      selfCheck: [selfCheck('sc-jiang-square-1', '把 Q(x,y) = x² + 4xy + y² 用配方法化成标准形，并写出正负惯性指数。', '计算', 'jiang:method-completing-square', 'Q = (x + 2y)² − 3y²，正惯性指数 1、负惯性指数 1。')],
      reviewQuestions: ['为什么配方得到的标准形里的正项个数换一种配法也不会变？'],
      evidenceStatus: 'REF',
    },
  },
  {
    id: 'jiang:method-euclidean-algorithm', title: '辗转相除法', scope: '局部方法',
    discipline: '域与数系', chapter: CH[6], section: '§6.2（印刷 126–128）',
    summary: '对两个多项式反复做带余除法，余式次数严格下降，最后一个非零余式（首一化后）就是最大公因式，同时把 Bézout 系数一并回代出来。',
    In: '两个不全为零的多项式 f, g ∈ F[x]', Out: '最大公因式 d = gcd(f,g) 与 Bézout 系数 u, v（d = uf + vg）',
    Pre: '带余除法已成立（F 是域）', Post: '得到首一的最大公因式与一组 Bézout 系数；过程必然终止，因为余式次数每次严格下降',
    Use: ['jiang:division-algorithm', 'jiang:gcd-polynomial'], Demo: ['jiang:partial-fraction', 'jiang:chinese-remainder'],
    Fail: '在非域的系数环（如 Z[x]）上取余不唯一，算法可能不终止或给出非最大公因式；此时要用伪除法或先化到 Q[x] 上再做。',
    body: 'f = q₁g + r₁ → 若 r₁ ≠ 0 则 g = q₂r₁ + r₂ → 每次用上一个余式除以下一个余式 → 直到余式为零 → 最后一个非零余式首一化即 d → 从后往前回代得到 u, v。',
    formal: { applicableTo: ['jiang:gcd-polynomial'], boundary: ['只适用于系数在域上的多项式环（或有 Euclid 除法的环）；一般整环上最大公因式可能不存在。'] },
    motivation: {
      internal: ['「公因式」如果只能靠观察，就不是一个可计算的概念；辗转相除把「公共」变成「余式序列的终点」。'],
      external: ['有理函数积分、部分分式分解、密码学里的多项式同余都直接调用它。'],
      aesthetic: ['同一段算法在 Z 与 F[x] 上逐字通用——结构相同，对象不同。'],
      growthChain: ['整数的辗转相除 → 换成带余除法可用的环 → 余式次数下降保证终止 → Bézout 等式说明公因式「能表示出来」'],
    },
    teaching: {
      selfCheck: [selfCheck('sc-jiang-euclid-1', '求 x³ − 1 与 x² − 1 在 Q[x] 中的最大公因式，并说明为什么不能直接「取公共的因子」。', '计算', 'jiang:method-euclidean-algorithm', 'x³ − 1 = x(x² − 1) + (x − 1)，故 gcd = x − 1。')],
      reviewQuestions: ['为什么算法一定终止？终止性用到了哪个量在严格下降？'],
      evidenceStatus: 'REF',
    },
  },
  {
    id: 'jiang:method-reduce-to-normal-form', title: '归约到标准形', scope: '全局方法',
    discipline: '线性代数', chapter: CH[2], section: '§2.5（印刷 42–44）',
    summary: '把「两个对象是否同类」的问题化成「两者的标准形是否一致」：相抵、合同、相似分别对应矩阵经可逆变换、换基、换基后的三类标准形。',
    In: '一族在某个变换群下等价的对象（矩阵、二次型、线性算子）', Out: '该等价类的标准形与完全不变量，以及同类判据',
    Pre: '已明确允许的变换（换元是否可逆、变换群是什么）', Post: '得到标准形（相抵为 diag(I_r,0)、合同为规范对角形、相似为特征值与特征子空间结构）与相应的不变量（秩、惯性指数、特征多项式与最小多项式）',
    Use: ['jiang:matrix-equivalence', 'jiang:quadratic-normal-form', 'jiang:similar-criterion'],
    Demo: ['jiang:matrix-rank', 'jiang:positive-definite', 'jiang:self-adjoint-spectral'],
    Fail: '标准形存在不等于标准形容易算：相似类的完全不变量在一般域上要靠 Jordan 形或初等因子，而合同分类在实对称情形才由惯性指数完全决定。方法本身不提供算法复杂度上的保证。',
    body: '确定允许的变换群 → 找一个在该群下最简单的代表（标准形）→ 证明每个对象都能变到它 → 找出变换下的不变量 → 用不变量作判据 → 必要时给出算法（消元、配方、求特征向量）。',
    formal: { applicableTo: ['jiang:matrix-equivalence'], boundary: ['只在该变换群与系数域固定时给出分类；换一个群（例如要求正交变换）标准形与不变量都要重新定。'] },
    motivation: {
      internal: ['「A 与 B 是不是同类的」如果靠找一个 P 来回答，就永远回答不完；标准形把无穷多个候选压成有限的形状与不变量。'],
      external: ['数值线性代数里的分解（LU、QR、SVD）本质上都是在给不同的变换群找标准形。'],
      aesthetic: ['同一句话贯穿三种关系：相抵看秩、合同看惯性指数、相似看谱。'],
      growthChain: ['解方程组要消元 → 消元就是行变换 → 行变换下矩阵化到相抵标准形 → 换二次型的基得到合同 → 换算子的基得到相似 → 三种「标准形」是同一策略的三次实例'],
    },
    teaching: {
      selfCheck: [selfCheck('sc-jiang-normalform-1', '说明「秩相同」为什么能完全判定相抵、却不能判定相似。', '判定', 'jiang:method-reduce-to-normal-form', '相抵的变换群是可逆矩阵左右乘，轨道由秩唯一确定；相似的变换群限制为同一个 P 与 P^{-1}，轨道还要看特征值等更细的不变量。')],
      reviewQuestions: ['换一个变换群，标准形为什么会变？请各举一例（相抵 / 合同 / 相似）。'],
      evidenceStatus: 'REF',
    },
  },
];

/**
 * 行动契约：输入取自本书自己的依赖顺序。
 *
 * `[slug, mode, title, inputs]`；输出恒为一个节点 `jiang:<slug>`。
 * 输入只引用背景节点（`bg:`）与本案例节点——跨案例的输入会让规划器在别的案例里找材料。
 */
const actionSpecs = [
  // 第一程：线性方程组
  ['field-axioms', 'definition', '引入域的公理', ['bg:set:function', 'bg:logic:quantifier']],
  ['elementary-row-operations', 'definition', '引入增广矩阵与初等行变换', ['jiang:field-axioms']],
  ['linear-substitution', 'definition', '引入可逆线性换元并核验解集双射', ['jiang:field-axioms', 'bg:set:function']],
  ['solution-cases', 'deduction', '用阶梯形与回代判定全部解', ['jiang:elementary-row-operations']],

  // 第二程：矩阵论初步
  ['matrix-operations', 'definition', '引入矩阵的基本运算', ['jiang:field-axioms', 'jiang:elementary-row-operations']],
  ['matrix-multiplication', 'definition', '引入矩阵乘法', ['jiang:matrix-operations']],
  ['elementary-matrix', 'definition', '引入初等矩阵', ['jiang:matrix-multiplication', 'jiang:elementary-row-operations']],
  ['invertible-matrix', 'deduction', '给出可逆矩阵的判别与求法', ['jiang:elementary-matrix']],
  ['block-matrix', 'definition', '引入分块矩阵', ['jiang:matrix-multiplication']],
  ['matrix-rank', 'definition', '引入矩阵的秩', ['jiang:elementary-matrix', 'jiang:invertible-matrix']],
  ['matrix-equivalence', 'deduction', '证明相抵标准形', ['jiang:matrix-rank']],

  // 第三程：行列式基础
  ['low-order-determinant', 'definition', '引入低阶行列式', ['jiang:matrix-operations']],
  ['permutation-parity', 'definition', '引入排列的逆序数', ['bg:set:function', 'bg:logic:quantifier']],
  ['determinant-definition', 'definition', '给出 n 阶行列式的定义', ['jiang:low-order-determinant', 'jiang:permutation-parity']],
  ['determinant-properties', 'deduction', '证明行列式的性质', ['jiang:determinant-definition', 'jiang:invertible-matrix']],
  ['cofactor-expansion', 'deduction', '证明代数余子式展开', ['jiang:determinant-properties']],
  ['determinant-multiplicative', 'deduction', '证明行列式的乘法定理', ['jiang:cofactor-expansion']],
  ['cramer-rule', 'deduction', '陈述 Cramer 法则', ['jiang:determinant-multiplicative', 'jiang:invertible-matrix']],

  // 第四程：有限维空间模型
  ['column-vector-space', 'definition', '引入列向量空间 F^n', ['jiang:field-axioms', 'jiang:matrix-multiplication']],
  ['linear-dependence', 'definition', '引入线性相关', ['jiang:column-vector-space']],
  ['maximal-independent-set', 'definition', '引入极大线性无关组', ['jiang:linear-dependence']],
  ['basis-dimension', 'definition', '引入空间的基', ['jiang:maximal-independent-set', 'jiang:column-vector-space']],
  ['coordinate-transition', 'definition', '引入过渡矩阵', ['jiang:basis-dimension', 'jiang:invertible-matrix']],
  ['solution-structure', 'deduction', '给出线性方程组解的结构', ['jiang:basis-dimension', 'jiang:matrix-rank', 'jiang:cramer-rule']],

  // 第五程：内积与双线性型
  ['inner-product', 'definition', '引入内积', ['jiang:column-vector-space']],
  ['orthogonalization', 'construction', '实行正交化与正交分解', ['jiang:inner-product']],
  ['bilinear-quadratic-form', 'definition', '引入二次型', ['jiang:inner-product', 'jiang:coordinate-transition']],
  ['quadratic-normal-form', 'deduction', '化二次型为标准形', ['jiang:bilinear-quadratic-form']],
  ['positive-definite', 'deduction', '刻画正定二次型', ['jiang:quadratic-normal-form']],

  // 第六程：一元多项式
  ['polynomial-ring', 'definition', '引入一元多项式环', ['jiang:field-axioms']],
  ['division-algorithm', 'deduction', '证明带余除法', ['jiang:polynomial-ring']],
  ['gcd-polynomial', 'deduction', '给出最大公因式与 Bézout 等式', ['jiang:division-algorithm']],
  ['irreducible-polynomial', 'deduction', '证明唯一分解', ['jiang:gcd-polynomial']],
  ['polynomial-function', 'deduction', '证明根与整除的对应', ['jiang:division-algorithm']],
  ['integer-polynomial', 'deduction', '证明 Gauss 引理与 Eisenstein 判别法', ['jiang:irreducible-polynomial', 'jiang:polynomial-function']],
  ['partial-fraction', 'construction', '写出部分分式分解', ['jiang:gcd-polynomial', 'jiang:irreducible-polynomial']],
  ['chinese-remainder', 'deduction', '证明中国剩余定理', ['jiang:gcd-polynomial', 'jiang:irreducible-polynomial']],

  // 第七程：向量空间的态射与欧氏空间算子论
  ['vector-space-axioms', 'definition', '给出向量空间的公理化定义', ['jiang:field-axioms', 'jiang:column-vector-space']],
  ['linear-map-matrix', 'definition', '引入线性映射的矩阵表示', ['jiang:vector-space-axioms', 'jiang:basis-dimension']],
  ['eigenvector', 'definition', '引入特征值与特征向量', ['jiang:linear-map-matrix', 'jiang:determinant-properties']],
  ['similar-criterion', 'deduction', '给出矩阵相似的判别', ['jiang:eigenvector', 'jiang:coordinate-transition']],
  ['fundamental-theorem-algebra-proof', 'deduction', '证明代数基本定理', ['jiang:polynomial-function', 'jiang:linear-map-matrix']],
  ['isometry', 'definition', '引入等距变换', ['jiang:inner-product', 'jiang:linear-map-matrix']],
  ['self-adjoint-spectral', 'deduction', '证明自伴算子的谱定理', ['jiang:isometry', 'jiang:eigenvector']],
  ['minimax-principle', 'deduction', '证明极小极大原理', ['jiang:self-adjoint-spectral']],
  ['normal-operator-calculus', 'definition', '引入正规算子演算', ['jiang:self-adjoint-spectral', 'jiang:isometry']],
  ['polar-svd', 'deduction', '证明奇异值分解', ['jiang:normal-operator-calculus', 'jiang:self-adjoint-spectral']],
];

const methodInputs = {
  'jiang:method-elimination': ['jiang:elementary-row-operations', 'jiang:solution-cases'],
  'jiang:method-completing-square': ['jiang:bilinear-quadratic-form', 'jiang:quadratic-normal-form'],
  'jiang:method-euclidean-algorithm': ['jiang:division-algorithm', 'jiang:gcd-polynomial'],
  'jiang:method-reduce-to-normal-form': ['jiang:matrix-equivalence', 'jiang:quadratic-normal-form', 'jiang:similar-criterion'],
};

const bySlug = new Map(spec.map((item) => [item.slug, item]));
const accepts = ['definition', 'statement'];
const provides = ['definition', 'statement'];

function shared(item) {
  const written = jiangFirstStage[item.slug] ?? WRITTEN[item.slug] ?? null;
  const polished = jiangFirstStage[item.slug];
  return {
    ...(polished ? { version: polished.version, formalStatement: polished.formalStatement, motivation: polished.motivation } : {}),
    discipline: item.discipline,
    case: 'jiang',
    summary: polished?.summary ?? item.predicate + '。',
    /*
     * `formal.boundary` 的类型必须是**字符串数组**：前端 `NodePage.tsx` 对它调 `.map()`，
     * `web/src/types.ts` 也声明为 `string[]`；这里写成字符串会让 47 个节点页全部渲染失败
     * （实测报错 `me.map is not a function`）。未写正文的节点用 `NOT_WRITTEN`（同样是数组）。
     */
    formal: { assumptions: [], ...(polished?.formal ?? {}), boundary: polished ? [polished.boundary] : written ? [written.boundary] : NOT_WRITTEN },
    representations: [],
    /*
     * 正文块在 `data/cases/11-jiang.md`：已写出的节点把 `contentRef` 指到真实块名
     * （形成检查会核对块存在且非空），还没写的仍显式 `contentRef: false`——
     * 站点如实显示「没有正文」，不放空壳冒充有正文。
     */
    contentRef: written ? `jiang:${item.slug}` : false,
    provenance: {
      sources: [source(item.chapter, item.section)],
      note: polished ? '2026-10-15 第一程精修：正文在 data/cases/11-jiang-first-stage.md，本站独立重写；教材位置沿用 PDF 书签，正文未逐字核对。一般数学论证与机器检查状态分开记录。' : written ? `${provenanceNoteWritten}${written.note ? ' ' + written.note : ''}` : provenanceNote,
    },
  };
}

function buildNode(item) {
  if (item.kind === 'claim') {
    return claim(`jiang:${item.slug}`, item.title, {
      ...shared(item),
      roles: [item.role],
      formula: item.predicate,
      teaching: jiangFirstStage[item.slug]?.teaching ?? {
        evidenceStatus: 'REF',
        reviewQuestions: [`${item.title}的结论在去掉哪个前提后会失效？`],
      },
    });
  }
  return concept(`jiang:${item.slug}`, item.title, {
    ...shared(item),
    objectType: item.objectType,
    parameters: item.parameters,
    predicate: item.predicate,
    teaching: jiangFirstStage[item.slug]?.teaching ?? {
      evidenceStatus: 'REF',
      reviewQuestions: [`${item.title}的定义中，哪个条件可以去掉而不失去主要结论？`],
    },
  });
}

export const jiangNodes = spec.map(buildNode);

/**
 * 已写出正文的方法节点（正文块在 `data/cases/11-jiang.md`）。
 *
 * 键是**完整节点 id**（方法节点的 id 形如 `jiang:method-*`，不走 `shared()` 那条 slug 通路）。
 * 与方法节点原有的 `formal.boundary` **追加**而不是替换：原有那条讲方法的适用范围，
 * 新增那条讲「这一版正文没有做什么」。
 */
const WRITTEN_METHODS = {
  'jiang:method-elimination': {
    boundary: '精修正文在 11-jiang-first-stage.md，说明换行、整列为零时跳列、常数列同步、倒序回代、同解性与有限步终止；要求可执行的域运算与准确零判断。数值稳定性未分析，未登记机器证明；教材正文未逐字核对。',
    note: '步骤与合法性由正文给出；数值稳定性未涉及。',
  },
  'jiang:method-completing-square': {
    boundary: '正文给出三种情形（有平方项 / 无平方项 / 特征 2）的处理、每步换元的可逆性与终止性；**没有核对教材 §5.4 的正文表述**，教材未单列「配方法」条目；复域口径与正交变换路线未展开（NOT-CLAIMED）。',
    note: '配方步骤与可逆性核对由正文给出。',
  },
  'jiang:method-euclidean-algorithm': {
    boundary: '正文给出交替相除、终止性与回代得 Bézout 系数的完整说明，以及非域环上失效的检验；**没有核对教材 §6.2 的正文表述**，教材未单列「辗转相除法」条目；一般欧几里得整环的推广只登记（NOT-CLAIMED）。',
    note: '算法步骤、终止性与回代由正文给出。',
  },
  'jiang:method-reduce-to-normal-form': {
    boundary: '正文给出「确定变换群 → 标准形 → 可达性 → 不变量 → 判据 → 算法」六步与三个实例的对照；**没有核对教材 §2.5 等处的正文表述**（该策略散见多节），教材未单列此条目；Jordan 形与初等因子只登记未展开（NOT-CLAIMED）。',
    note: '六步策略与三实例对照由正文给出；Jordan 形未展开。',
  },
};

export const jiangMethodNodes = methodSpec.map((item) => {
  const written = WRITTEN_METHODS[item.id] ?? null;
  return method(item.id, item.title, {
    version: item.id === 'jiang:method-elimination' ? '2' : '1',
    discipline: item.discipline, case: 'jiang', scope: item.scope,
    summary: item.summary, In: item.In, Out: item.Out, Pre: item.Pre, Post: item.Post,
    Use: item.Use, Demo: item.Demo, Fail: item.Fail, body: item.body,
    formal: written
      ? { ...item.formal, boundary: [...(item.formal?.boundary ?? []), written.boundary] }
      : item.formal,
    motivation: item.motivation,
    teaching: item.teaching,
    // 写出的方法节点把 contentRef 指到真实块名；未写的仍显式 false。
    contentRef: written ? item.id : false,
    provenance: {
      sources: [source(item.chapter, item.section)],
      note: (item.id === 'jiang:method-elimination' ? '2026-10-15 精修正文在 data/cases/11-jiang-first-stage.md；正确性与终止性为正文论证，机器检查未运行。' : written ? provenanceNoteWritten : provenanceNote)
        + ' 方法由教材相应章节的惯用论证提炼，教材未单列同名条目。'
        + (written?.note ? ' ' + written.note : ''),
    },
  });
});

export const jiangActions = [
  ...actionSpecs.map(([slug, mode, title, inputs]) => action(
    `a-jiang:${slug}`, mode, title,
    inputs.map((nodeId) => input(nodeId, accepts)),
    [output(`jiang:${slug}`, provides)],
    { witness: { type: 'declared-contract', status: jiangFirstStage[slug] ? (mode === 'deduction' ? 'PROOF' : 'DEF') : 'REF', ref: jiangFirstStage[slug] ? `ev-jiang-${slug}` : source(bySlug.get(slug).chapter, bySlug.get(slug).section) } },
  )),
  ...methodSpec.map((item) => action(
    `a-${item.id}`, 'method', `提出方法：${item.title}`,
    methodInputs[item.id].map((nodeId) => input(nodeId, accepts)),
    [output(item.id, ['method'])],
    { witness: { type: 'method-presentation', status: 'DEF', ref: source(item.chapter, item.section) } },
  )),
];

/**
 * 关系：案例内部的**定义性依赖**主干（40 + 7 条），以及与本站既有登记的四处接口。
 *
 * 第一程区分定义依赖、正文证明依赖和教学类比；教材节序不直接充当硬前置。
 * 其余各程沿用既有登记，不据本次第一程精修宣称已逐条复核。
 */
export const jiangRelations = [
  // ---- 第一程 ----
  relation('rel-jiang-pre-field-rowops', 'hardPrereq', 'jiang:field-axioms', 'jiang:elementary-row-operations', {
    witness: { type: 'definitional-dependency', status: 'DEF', scope: '本程把方程组定义在域 F 上；行操作参数 λ∈F，非零倍乘的逆操作使用域中 λ⁻¹。正文「精确定义」列出全部参数与范围。' },
    scope: '这是本程系数结构的定义依赖；一般环上部分行操作仍可做，不能据此声称每次加减都必须有域。',
  }),
  relation('rel-jiang-pre-rowops-substitution', 'analogy', 'jiang:elementary-row-operations', 'jiang:linear-substitution', {
    witness: { type: 'candidate-analogy', status: 'ILLUSTRATION', scope: '两种变换都以可逆性保证不丢信息；行变换重组方程，换元重组变量，比较见换元正文「与行变换并排看」。' },
    scope: '教学对照：行变换保持原坐标中解集相等，换元通过还原映射保持双射；行变换不是定义可逆换元的必要前置。',
    candidateNote: '只类比可逆操作的思路，不把解集相等与解集双射混为一谈。',
  }),
  relation('rel-jiang-pre-substitution-cases', 'analogy', 'jiang:linear-substitution', 'jiang:solution-cases', {
    witness: { type: 'candidate-analogy', status: 'ILLUSTRATION', scope: '换元用新坐标描述全部旧解，回代用自由参数描述全部解：共同检查存在与唯一，定义域分别是 F^n 与 F^{n−r}。' },
    scope: '教学联动：全局可逆换元保持全部 n 个变量，参数化只保留自由坐标；分类的正文证明直接依赖行变换与回代。',
    candidateNote: '参数化并非必然是 F^n 上的可逆换元；它只在解集和自由参数集合之间给出双射。',
  }),
  relation('rel-jiang-pre-field-substitution', 'hardPrereq', 'jiang:field-axioms', 'jiang:linear-substitution', {
    witness: { type: 'definitional-dependency', status: 'DEF', scope: '本程线性换元 T(y)ⱼ=Σₖpⱼₖyₖ 中系数 pⱼₖ 与变量都取自域 F，分量和式由 F 的加乘运算定义。' },
    scope: '定义性依赖是系数域及其运算；双射条件通过正反代入检查，不预借矩阵乘法或逆矩阵。',
  }),
  relation('rel-jiang-pre-rowops-cases', 'hardPrereq', 'jiang:elementary-row-operations', 'jiang:solution-cases', {
    witness: { type: 'proof-dependency', status: 'PROOF', ref: 'ev-jiang-solution-cases', scope: '解的分类正文第一步使用初等行变换保持原解集，再在阶梯形上从最后一行开始回代，构造自由参数到解集的双射。' },
    scope: '正文证明依赖，证据同时登记两端。自由变量数来自系数列主元；不需先做可逆换元，也不借用后续秩定理。',
  }),

  // ---- 第二程 ----
  relation('rel-jiang-pre-matrixops-multiplication', 'hardPrereq', 'jiang:matrix-operations', 'jiang:matrix-multiplication', {
    witness: { type: 'definitional-dependency', status: 'DEF', scope: '矩阵乘法定义为「行乘列再相加」，其中的加法与数乘就是矩阵的基本运算。' },
    scope: '乘法是在加法与数乘之上定义的。',
  }),
  relation('rel-jiang-pre-multiplication-elementary', 'hardPrereq', 'jiang:matrix-multiplication', 'jiang:elementary-matrix', {
    witness: { type: 'definitional-dependency', status: 'DEF', scope: '初等矩阵对 A 的作用写成 EA 或 AE：没有矩阵乘法就写不出「左乘等于做一次行变换」这句话。' },
    scope: '初等矩阵的功用完全由它与一般矩阵的乘积表述。',
  }),
  relation('rel-jiang-pre-elementary-invertible', 'hardPrereq', 'jiang:elementary-matrix', 'jiang:invertible-matrix', {
    witness: { type: 'definitional-dependency', status: 'DEF', scope: '可逆的判别写成「A 是有限个初等矩阵之积」，求逆写成对 (A|I) 施行初等行变换。' },
    scope: '没有初等矩阵，就没有可逆性的可操作判据。',
  }),
  relation('rel-jiang-pre-multiplication-block', 'hardPrereq', 'jiang:matrix-multiplication', 'jiang:block-matrix', {
    witness: { type: 'definitional-dependency', status: 'DEF', scope: '分块乘法按与普通乘法相同的「行块乘列块」规则定义，尺寸匹配条件也照搬。' },
    scope: '分块运算只是同一套乘法规则的粗粒化。',
  }),
  relation('rel-jiang-pre-invertible-rank', 'hardPrereq', 'jiang:invertible-matrix', 'jiang:matrix-rank', {
    witness: { type: 'definitional-dependency', status: 'DEF', scope: '秩定义为行阶梯形中非零行的行数：阶梯形由初等行变换得到，因此秩的计算依赖可逆的初等变换这一层。' },
    scope: '秩是初等变换下的不变量，判据就在这条依赖上。',
  }),
  relation('rel-jiang-pre-rank-equivalence', 'hardPrereq', 'jiang:matrix-rank', 'jiang:matrix-equivalence', {
    witness: { type: 'definitional-dependency', status: 'DEF', scope: '相抵标准形 diag(I_r, 0) 里的 r 就是秩；定理的陈述里直接出现 rank。' },
    scope: '「相抵」与「秩相等」是同一条判据的两端。',
  }),

  // ---- 第三程 ----
  relation('rel-jiang-pre-lowdet-definition', 'hardPrereq', 'jiang:low-order-determinant', 'jiang:determinant-definition', {
    witness: { type: 'definitional-dependency', status: 'DEF', scope: 'n 阶行列式的定义在 n = 2、3 时退化为低阶行列式，讲解顺序与符号（|A|、展开式）都从它出发。' },
    scope: '一般定义是低阶情形的推广，低阶是它的可核验模型。',
  }),
  relation('rel-jiang-pre-parity-definition', 'hardPrereq', 'jiang:permutation-parity', 'jiang:determinant-definition', {
    witness: { type: 'definitional-dependency', status: 'DEF', scope: '定义式 det A = Σ_σ sgn(σ)·a_{1σ(1)}⋯a_{nσ(n)} 里的 sgn σ 就是排列的符号，取自逆序数。' },
    scope: '没有排列的奇偶性，展开式的符号无从确定。',
  }),
  relation('rel-jiang-pre-definition-properties', 'hardPrereq', 'jiang:determinant-definition', 'jiang:determinant-properties', {
    witness: { type: 'definitional-dependency', status: 'DEF', scope: '多重线性、反称与「两行相同则为 0」都是对定义式逐项重组的结果；陈述的主语就是 det A。' },
    scope: '性质是对这条定义的直接推论。',
  }),
  relation('rel-jiang-pre-properties-cofactor', 'hardPrereq', 'jiang:determinant-properties', 'jiang:cofactor-expansion', {
    witness: { type: 'definitional-dependency', status: 'DEF', scope: '展开定理的证明要把行列式按一行拆成 n 个行列式之和，用的正是多重线性与「有两行相同则为 0」。' },
    scope: '没有性质，展开定理既写不出也证不了。',
  }),
  relation('rel-jiang-pre-cofactor-multiplicative', 'hardPrereq', 'jiang:cofactor-expansion', 'jiang:determinant-multiplicative', {
    witness: { type: 'definitional-dependency', status: 'DEF', scope: 'det(AB) = det A · det B 的证明用到按行展开与代数余子式的组合恒等式；伴随矩阵公式本身也来自展开。' },
    scope: '乘法定理与伴随矩阵公式共用同一套展开工具。',
  }),
  relation('rel-jiang-pre-multiplicative-cramer', 'hardPrereq', 'jiang:determinant-multiplicative', 'jiang:cramer-rule', {
    witness: { type: 'definitional-dependency', status: 'DEF', scope: 'Cramer 法则写成 x = A^{-1}b 的行列式版本，而 A^{-1} = adj(A)/det A 依赖乘法定理与 det A ≠ 0。' },
    scope: '没有「det A ≠ 0 ⇔ A 可逆」这一条，法则的分母无从谈起。',
  }),

  // ---- 第四程 ----
  relation('rel-jiang-pre-columnspace-dependence', 'hardPrereq', 'jiang:column-vector-space', 'jiang:linear-dependence', {
    witness: { type: 'definitional-dependency', status: 'DEF', scope: '线性组合、线性相关都是 F^n 中向量之间的关系：加法与数乘由列向量空间提供。' },
    scope: '相关性是向量空间里的说法，没有空间就没有它。',
  }),
  relation('rel-jiang-pre-dependence-maximal', 'hardPrereq', 'jiang:linear-dependence', 'jiang:maximal-independent-set', {
    witness: { type: 'definitional-dependency', status: 'DEF', scope: '极大线性无关组的定义用「线性无关」与「添一个就线性相关」两句写成。' },
    scope: '极大无关组是相关性概念的直接延伸。',
  }),
  relation('rel-jiang-pre-maximal-basis', 'hardPrereq', 'jiang:maximal-independent-set', 'jiang:basis-dimension', {
    witness: { type: 'definitional-dependency', status: 'DEF', scope: '基就是「张成整个空间的极大线性无关组」，维数是任意两组基所含向量个数相同这一结论。' },
    scope: '基与维数由极大无关组的唯一性定理支撑。',
  }),
  relation('rel-jiang-pre-basis-transition', 'hardPrereq', 'jiang:basis-dimension', 'jiang:coordinate-transition', {
    witness: { type: 'definitional-dependency', status: 'DEF', scope: '过渡矩阵的每一列是「同一个向量在另一组基下的坐标」，坐标与基的概念都来自这一节点。' },
    scope: '没有坐标的唯一性，过渡矩阵写不出来。',
  }),
  relation('rel-jiang-pre-rank-columnspace', 'hardPrereq', 'jiang:matrix-rank', 'jiang:column-vector-space', {
    witness: { type: 'definitional-dependency', status: 'DEF', scope: '矩阵的列（行）向量属于 F^m（F^n）；「矩阵的秩 = 列向量组的秩」这句话要先把矩阵看成一组列向量。' },
    scope: '矩阵与向量组之间的翻译由列向量空间提供。',
  }),
  relation('rel-jiang-pre-rank-basis', 'hardPrereq', 'jiang:matrix-rank', 'jiang:basis-dimension', {
    witness: { type: 'definitional-dependency', status: 'DEF', scope: '「秩 = 行向量组的极大无关组所含向量个数」把矩阵的秩接到向量组的秩与维数上。' },
    scope: '矩阵的秩与空间的维数是同一个数在两种对象上的名字。',
  }),
  relation('rel-jiang-pre-cramer-structure', 'hardPrereq', 'jiang:cramer-rule', 'jiang:solution-structure', {
    witness: { type: 'definitional-dependency', status: 'DEF', scope: '解的结构把「有解时解集 = 特解 + 齐次解空间」写成一般结论，Cramer 法则给出的是 det A ≠ 0 这一特例下的唯一解。' },
    scope: '一般结构以唯一解的特例为出发点。',
  }),
  relation('rel-jiang-pre-rank-structure', 'hardPrereq', 'jiang:matrix-rank', 'jiang:solution-structure', {
    witness: { type: 'definitional-dependency', status: 'DEF', scope: '解空间的维数写成 n − rank A：这个公式的主语就是秩。' },
    scope: '没有秩，解的自由度只是一个数不清的观察。',
  }),

  // ---- 第五程 ----
  relation('rel-jiang-pre-columnspace-inner', 'hardPrereq', 'jiang:column-vector-space', 'jiang:inner-product', {
    witness: { type: 'definitional-dependency', status: 'DEF', scope: '内积是 F^n（或一般实向量空间）上的二元函数，它的定义域由向量空间给出。' },
    scope: '内积是附加在向量空间上的结构。',
  }),
  relation('rel-jiang-pre-inner-orthogonal', 'hardPrereq', 'jiang:inner-product', 'jiang:orthogonalization', {
    witness: { type: 'definitional-dependency', status: 'DEF', scope: '正交、范数与正交补都用内积表述；Gram–Schmidt 每一步的投影公式里也直接出现内积。' },
    scope: '没有内积，「垂直」没有定义。',
  }),
  relation('rel-jiang-pre-inner-quadratic', 'hardPrereq', 'jiang:inner-product', 'jiang:bilinear-quadratic-form', {
    witness: { type: 'definitional-dependency', status: 'DEF', scope: '二次型写成 x^T A x 用的就是标准内积下的配对；对称双线性型是内积概念去掉正定性与共轭对称后的推广。' },
    scope: '二次型是内积那套记号的代数化推广。',
  }),
  relation('rel-jiang-pre-transition-quadratic', 'hardPrereq', 'jiang:coordinate-transition', 'jiang:bilinear-quadratic-form', {
    witness: { type: 'definitional-dependency', status: 'DEF', scope: '换基时二次型的矩阵按 A ↦ P^T A P 变化，其中 P 是两组基之间的过渡矩阵。' },
    scope: '没有过渡矩阵，「合同」这个关系写不出来。',
  }),
  relation('rel-jiang-pre-quadratic-normal', 'hardPrereq', 'jiang:bilinear-quadratic-form', 'jiang:quadratic-normal-form', {
    witness: { type: 'definitional-dependency', status: 'DEF', scope: '标准形是同一个二次型在另一组基下的写法：变量与矩阵表示都取自这一节点。' },
    scope: '标准形的对象就是二次型本身。',
  }),
  relation('rel-jiang-pre-normal-positive', 'hardPrereq', 'jiang:quadratic-normal-form', 'jiang:positive-definite', {
    witness: { type: 'definitional-dependency', status: 'DEF', scope: '正定性的判别（顺序主子式、正惯性指数）都以标准形与惯性定理为前提。' },
    scope: '正定是标准形系数全为正这一情形。',
  }),

  // ---- 第六程 ----
  relation('rel-jiang-pre-field-polynomial', 'hardPrereq', 'jiang:field-axioms', 'jiang:polynomial-ring', {
    witness: { type: 'definitional-dependency', status: 'DEF', scope: '多项式的系数取自域 F，加法与乘法按 F 中的运算逐项进行；F[x] 是整环这一结论用到 F 没有零因子。' },
    scope: '系数所在的域变了，多项式环的性质也变（例如 F[x] 中可逆元恰为非零常数）。',
  }),
  relation('rel-jiang-pre-polynomial-division', 'hardPrereq', 'jiang:polynomial-ring', 'jiang:division-algorithm', {
    witness: { type: 'definitional-dependency', status: 'DEF', scope: '带余除法的主语是 f, g ∈ F[x] 与它们的次数 deg：对象与度量都由多项式环给出。' },
    scope: '没有次数，「余式次数严格小于除式次数」这句话无从表述。',
  }),
  relation('rel-jiang-pre-division-gcd', 'hardPrereq', 'jiang:division-algorithm', 'jiang:gcd-polynomial', {
    witness: { type: 'definitional-dependency', status: 'DEF', scope: '最大公因式的定义用「公因式」与整除，而整除由带余除法的余式为零定义；Bézout 等式靠回代得到。' },
    scope: '辗转相除法的每一步都是一次带余除法。',
  }),
  relation('rel-jiang-pre-gcd-irreducible', 'hardPrereq', 'jiang:gcd-polynomial', 'jiang:irreducible-polynomial', {
    witness: { type: 'definitional-dependency', status: 'DEF', scope: '既约性的判别与唯一分解的证明都要先有「互素」「公因式唯一到常数因子」这一层结论。' },
    scope: '唯一分解是最大公因式理论的收束。',
  }),
  relation('rel-jiang-pre-division-function', 'hardPrereq', 'jiang:division-algorithm', 'jiang:polynomial-function', {
    witness: { type: 'definitional-dependency', status: 'DEF', scope: '「a 是 f 的根 ⇔ (x − a) 整除 f」的证明就是把 f 除以 (x − a) 看余式。' },
    scope: '根与整除的对应是一条带余除法的特例。',
  }),
  relation('rel-jiang-pre-irreducible-integer', 'hardPrereq', 'jiang:irreducible-polynomial', 'jiang:integer-polynomial', {
    witness: { type: 'definitional-dependency', status: 'DEF', scope: 'Gauss 引理与 Eisenstein 判别法讨论的是整系数多项式在 Q 上的既约性：既约性的定义取自 F[x] 中的一般讨论。' },
    scope: 'Z[x] 上的可约性判据要借 Q[x] 中的既约性来表述。',
  }),
  relation('rel-jiang-pre-gcd-partial', 'hardPrereq', 'jiang:gcd-polynomial', 'jiang:partial-fraction', {
    witness: { type: 'definitional-dependency', status: 'DEF', scope: '部分分式分解的每一块分母 p_i^{e_i} 来自既约分解，系数由 Bézout 等式逐层求出。' },
    scope: '分解的存在唯一性建立在互素与 Bézout 等式上。',
  }),
  relation('rel-jiang-pre-gcd-chinese', 'hardPrereq', 'jiang:gcd-polynomial', 'jiang:chinese-remainder', {
    witness: { type: 'definitional-dependency', status: 'DEF', scope: '同余方程组的解法要构造 M_i 与它的逆元，靠的是互素的 m_i 之间的 Bézout 等式。' },
    scope: '「两两互素」这个条件本身就是最大公因式的语言。',
  }),

  // ---- 第七程 ----
  relation('rel-jiang-pre-field-vectorspace', 'hardPrereq', 'jiang:field-axioms', 'jiang:vector-space-axioms', {
    witness: { type: 'definitional-dependency', status: 'DEF', scope: '向量空间的八条公理里，数乘的分配律与单位律都以域 F 的运算为参照。' },
    scope: '向量空间是「域上的」空间，域先于它。',
  }),
  relation('rel-jiang-pre-vectorspace-linearmap', 'hardPrereq', 'jiang:vector-space-axioms', 'jiang:linear-map-matrix', {
    witness: { type: 'definitional-dependency', status: 'DEF', scope: '线性映射的定义写成 T(αx + βy) = αT(x) + βT(y)，两端的加法与数乘都取自向量空间。' },
    scope: '线性映射是向量空间之间的映射，这是它的定义域与值域。',
  }),
  relation('rel-jiang-pre-basis-linearmap', 'hardPrereq', 'jiang:basis-dimension', 'jiang:linear-map-matrix', {
    witness: { type: 'definitional-dependency', status: 'DEF', scope: '矩阵表示要取定 V 与 W 的基，矩阵的每一列是基向量像的坐标。' },
    scope: '没有基与坐标，抽象映射落不到矩阵上。',
  }),
  relation('rel-jiang-pre-linearmap-eigen', 'hardPrereq', 'jiang:linear-map-matrix', 'jiang:eigenvector', {
    witness: { type: 'definitional-dependency', status: 'DEF', scope: '特征值与特征向量按算子 T（或它在某组基下的矩阵 A）定义，特征方程 det(λI − A) = 0 里出现的就是矩阵表示。' },
    scope: '特征值是算子的性质，算子在有限维上由矩阵表示承载。',
  }),
  relation('rel-jiang-pre-det-eigen', 'hardPrereq', 'jiang:determinant-properties', 'jiang:eigenvector', {
    witness: { type: 'definitional-dependency', status: 'DEF', scope: '特征方程 det(λI − A) = 0 是一个行列式方程；「λ 是特征值 ⇔ det(λI − A) = 0」直接用行列式为 0 的判别。' },
    scope: '没有行列式，「特征方程」写不出来。',
  }),
  relation('rel-jiang-pre-eigen-similar', 'hardPrereq', 'jiang:eigenvector', 'jiang:similar-criterion', {
    witness: { type: 'definitional-dependency', status: 'DEF', scope: '相似的判别用的是特征多项式、特征子空间与可对角化条件，全部由特征值这一层给出。' },
    scope: '「相似」的不变量就是特征值这套数据。',
  }),
  relation('rel-jiang-pre-transition-similar', 'hardPrereq', 'jiang:coordinate-transition', 'jiang:similar-criterion', {
    witness: { type: 'definitional-dependency', status: 'DEF', scope: '相似的定义 B = P^{-1}AP 里的 P 正是同一个空间两组基之间的过渡矩阵。' },
    scope: '相似就是「同一个算子在两组基下的矩阵」，这句话要用过渡矩阵说。',
  }),
  relation('rel-jiang-pre-function-aft', 'hardPrereq', 'jiang:polynomial-function', 'jiang:fundamental-theorem-algebra-proof', {
    witness: { type: 'definitional-dependency', status: 'DEF', scope: '代数基本定理的主语是复系数多项式的根；「根」与「次数」由多项式函数这一节给出。' },
    scope: '定理讨论的是多项式的根的存在性。',
  }),
  relation('rel-jiang-pre-inner-isometry', 'hardPrereq', 'jiang:inner-product', 'jiang:isometry', {
    witness: { type: 'definitional-dependency', status: 'DEF', scope: '等距变换的定义就是「保持内积」，判据 U^*U = I 里的伴随也由内积定义。' },
    scope: '没有内积，「等距」没有内容。',
  }),
  relation('rel-jiang-pre-isometry-spectral', 'hardPrereq', 'jiang:isometry', 'jiang:self-adjoint-spectral', {
    witness: { type: 'definitional-dependency', status: 'DEF', scope: '谱定理的证明要用标准正交基与正交变换把矩阵化为对角形，标准正交基的存在性由正交化与等距变换提供。' },
    scope: '正交对角化这句话的两个词都来自内积与等距变换。',
  }),
  relation('rel-jiang-pre-eigen-spectral', 'hardPrereq', 'jiang:eigenvector', 'jiang:self-adjoint-spectral', {
    witness: { type: 'definitional-dependency', status: 'DEF', scope: '谱定理的结论是「特征值实、特征向量正交、可正交对角化」，主语与结论都由特征值这一层给出。' },
    scope: '没有特征值与特征子空间，谱定理没有可陈述的内容。',
  }),
  relation('rel-jiang-pre-spectral-minimax', 'hardPrereq', 'jiang:self-adjoint-spectral', 'jiang:minimax-principle', {
    witness: { type: 'definitional-dependency', status: 'DEF', scope: '极小极大原理把自伴算子的第 k 个特征值写成子空间上的极值：特征值的存在与排序由谱定理保证。' },
    scope: '这是特征值的另一种刻画，前提是谱定理。',
  }),
  relation('rel-jiang-pre-spectral-normal', 'hardPrereq', 'jiang:self-adjoint-spectral', 'jiang:normal-operator-calculus', {
    witness: { type: 'definitional-dependency', status: 'DEF', scope: '正规算子的谱分解 T = Σ λ_i P_i 是谱定理在正规情形下的推广；自伴是它的特例。' },
    scope: '算子演算建立在谱分解之上。',
  }),
  relation('rel-jiang-pre-isometry-normal', 'hardPrereq', 'jiang:isometry', 'jiang:normal-operator-calculus', {
    witness: { type: 'definitional-dependency', status: 'DEF', scope: '等距变换是正规算子的标准例子（U^*U = I = UU^*），演算的适用范围用它们来举例与检验。' },
    scope: '正规性是把自伴与等距放在一起的那个条件。',
  }),
  relation('rel-jiang-pre-normal-svd', 'hardPrereq', 'jiang:normal-operator-calculus', 'jiang:polar-svd', {
    witness: { type: 'definitional-dependency', status: 'DEF', scope: '奇异值分解由 T^*T 的谱分解得到（T^*T 自伴半正定），极分解里的 P = √(T^*T) 是它的算子演算。' },
    scope: '没有谱分解与算子演算，极分解与奇异值都定义不出来。',
  }),

  /*
   * 与本站既有登记的接口（crossDomain）。
   *
   * 只登记真的指向同一层对象的四处：
   * 1. 域的公理在 field 案例与本书各有一处登记；
   * 2. 共享背景 bg:linear:vector 与本书第七章的公理化定义是接口与案例的关系；
   * 3. 代数基本定理在 rudin 案例（分析路线）与本书（代数路线）各一处；
   * 4. 线性映射的矩阵表示与 tensor 案例的 V⊗V* ≅ End(V) 是同一件事的两种语言。
   * 其余同名概念（如内积）本站没有第三方登记，不制造接口。
   */
  relation('rel-jiang-crossdomain-field', 'crossDomain', 'field:field', 'jiang:field-axioms', {
    witness: { type: 'cross-domain-interface', status: 'DEF' },
    scope: 'field 案例把域登记成代数结构本身（含域扩张的用途）；本书 §1.1 登记的是「解线性方程组够用的那几条公理」与几个具体数系。两处保留，不互相覆盖。',
    task: '域的公理在两处登记之间的接口。',
  }),
  relation('rel-jiang-crossdomain-linear-bg', 'crossDomain', 'bg:linear:vector', 'jiang:vector-space-axioms', {
    witness: { type: 'cross-domain-interface', status: 'DEF' },
    scope: 'bg:linear:vector 是**共享背景接口**：它声明「有限维线性代数」是环境的边界，不展开内容；本书 §7.1 给出的是一条单元级的公理化定义，是这个接口的展开处。',
    task: '「线性代数作为背景」与「线性代数作为课程内容」的接口。',
  }),
  relation('rel-jiang-crossdomain-aft', 'crossDomain', 'rudin:algebraic-completeness', 'jiang:fundamental-theorem-algebra-proof', {
    witness: { type: 'cross-domain-interface', status: 'DEF' },
    scope: '同一条定理的两处登记：rudin 案例按分析路线（在特殊函数一章）陈述 C 的代数完备性；本书 §7.5 给出的是代数/线性代数路线的证明。两处都标 REF（教材有论证，本站未转录也未复核）。',
    task: '代数基本定理的跨案例接口。',
  }),
  relation('rel-jiang-crossdomain-endomorphism', 'crossDomain', 'tensor:end-iso', 'jiang:linear-map-matrix', {
    witness: { type: 'cross-domain-interface', status: 'DEF' },
    scope: 'tensor 案例的 V⊗V* ≅ End(V) 与本书的「线性映射取定基后由矩阵唯一表示」是同一件事的两种语言：前者不取基，后者取定基。',
    task: '线性映射与矩阵表示之间的接口。',
  }),
];

/**
 * 证据：节点定义、正文命题与方法步骤分开登记。
 *
 * 第一程以本站定义或正文论证登记，保留 not_run 以明确没有机器核验。
 * 其他节点沿用原记录，不据已有草稿升级其证据状态。
 */
export const jiangEvidence = [
  ...spec.map((item) => jiangFirstStage[item.slug] ? evidence(
    `ev-jiang-${item.slug}`, item.slug === 'field-axioms' ? 'definition' : 'prose-proof',
    item.slug === 'field-axioms' ? 'DEF' : 'PROOF', 'not_run',
    `${item.title}：第一程正文${item.slug === 'field-axioms' ? '定义与模型' : '论证'}`,
    {
      scope: jiangFirstStage[item.slug].boundary,
      nodes: item.slug === 'solution-cases' ? ['jiang:solution-cases', 'jiang:elementary-row-operations'] : [`jiang:${item.slug}`],
      obligations: ['尚未编码为 Lean 或 ND 机器证明；一般正文论证与有限实例枚举分开', '教材对应小节正文尚未逐字核对；独立人工审阅未登记'],
      reference: `data/cases/11-jiang-first-stage.md#node:jiang:${item.slug}`,
    },
  ) : evidence(
    `ev-jiang-${item.slug}`,
    'reference',
    item.kind === 'claim' ? 'PROOF' : 'DEF',
    'not_run',
    `${item.title}：教材 ${item.chapter} ${item.section} 的对应内容`,
    {
      scope: '本节点目前只登记标题、所属小节与依赖关系，正文尚未撰写；教材表述未逐条核对。',
      nodes: [`jiang:${item.slug}`],
      obligations: [
        '撰写节点正文（动机、形式、条件反例、回看提问）',
        '未编码为第 02 章 ND 证书（正文都还没有，更谈不上机器核验）',
        '逐条核对教材对应小节的表述与编号（本案例的章节与页码取自 PDF 书签，不是 OCR）',
      ],
      reference: source(item.chapter, item.section),
    },
  )),
  evidence('ev-jiang-elimination-correctness', 'prose-proof', 'PROOF', 'not_run', '消元正确性与终止性：精确域运算下的命题', {
    scope: '给定有限线性方程组，假定域运算和零判断可执行，正文证明找主元、换行和跳列在有限步内得到同解阶梯形；无矛盾行时回代给出全部解且参数不重复。数值稳定性不在此结论内。',
    nodes: ['jiang:solution-cases', 'jiang:method-elimination', 'jiang:elementary-row-operations'],
    dependsOn: ['ev-jiang-elementary-row-operations', 'ev-jiang-solution-cases'],
    obligations: ['尚未编码为 Lean 或 ND 证书；独立人工审阅未登记；数值误差未分析'],
    reference: 'data/cases/11-jiang-first-stage.md#node:jiang:method-elimination',
  }),
  ...methodSpec.map((item) => item.id === 'jiang:method-elimination' ? evidence(
    'ev-jiang-method-elimination', 'definition', 'DEF', 'not_run', 'Gauss 消元法：操作步骤的定义',
    {
      scope: '本记录声明找主元、换行、跳列、检查常数列与回代的操作步骤；方法的正确性和终止性命题另记于 ev-jiang-elimination-correctness，不把操作步骤本身登记成定理。',
      nodes: ['jiang:method-elimination', 'jiang:elementary-row-operations', 'jiang:solution-cases'],
      dependsOn: ['ev-jiang-elementary-row-operations', 'ev-jiang-solution-cases'],
      obligations: ['未编码为 ND 证书；独立人工审阅未登记；不声明数值误差保证'],
      reference: 'data/cases/11-jiang-first-stage.md#node:jiang:method-elimination',
    },
  ) : evidence(
    `ev-jiang-${item.id.split(':')[1]}`,
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
];

export const jiangSupport = [
  support('sup-jiang-elimination-route', 'jiang:solution-structure', 'route', 'known',
    { set: ['jiang:method-elimination', 'jiang:matrix-rank'], minimal: false, evidence: ['ev-jiang-solution-structure'] }),
  support('sup-jiang-svd-route', 'jiang:polar-svd', 'route', 'known',
    { set: ['jiang:self-adjoint-spectral', 'jiang:normal-operator-calculus'], minimal: true, evidence: ['ev-jiang-polar-svd'] }),
  // 未登记支持记录时保留 Unknown；「没查」不写成空集。
  support('sup-jiang-crt-route', 'jiang:chinese-remainder', 'route', 'unknown',
    { reason: '中国剩余定理的路线级输入支持尚未登记；未知不等于空支持。' }),
];

export const jiangClaims = spec
  .filter((item) => item.kind === 'claim')
  .map((item) => claimRecord(
    `claim-jiang-${item.slug}`,
    `jiang:${item.slug}`,
    item.predicate,
    [`ev-jiang-${item.slug}`],
    'PROOF',
  ));

/** 话题聚合按教材八章分块。 */
export const jiangAggregates = [
  {
    id: 'agg-jiang-jdga', kind: 'topic', title: '《简明高等代数》七程凝练路径',
    blocks: [
      ['jiang:field-axioms', 'jiang:elementary-row-operations', 'jiang:linear-substitution', 'jiang:solution-cases'],
      ['jiang:matrix-operations', 'jiang:matrix-multiplication', 'jiang:elementary-matrix', 'jiang:invertible-matrix', 'jiang:block-matrix', 'jiang:matrix-rank', 'jiang:matrix-equivalence'],
      ['jiang:low-order-determinant', 'jiang:permutation-parity', 'jiang:determinant-definition', 'jiang:determinant-properties', 'jiang:cofactor-expansion', 'jiang:determinant-multiplicative', 'jiang:cramer-rule'],
      ['jiang:column-vector-space', 'jiang:linear-dependence', 'jiang:maximal-independent-set', 'jiang:basis-dimension', 'jiang:coordinate-transition', 'jiang:solution-structure'],
      ['jiang:inner-product', 'jiang:orthogonalization', 'jiang:bilinear-quadratic-form', 'jiang:quadratic-normal-form', 'jiang:positive-definite'],
      ['jiang:polynomial-ring', 'jiang:division-algorithm', 'jiang:gcd-polynomial', 'jiang:irreducible-polynomial', 'jiang:polynomial-function', 'jiang:integer-polynomial', 'jiang:partial-fraction', 'jiang:chinese-remainder'],
      ['jiang:vector-space-axioms', 'jiang:linear-map-matrix', 'jiang:eigenvector', 'jiang:similar-criterion', 'jiang:fundamental-theorem-algebra-proof'],
      ['jiang:isometry', 'jiang:self-adjoint-spectral', 'jiang:minimax-principle', 'jiang:normal-operator-calculus', 'jiang:polar-svd'],
      ['jiang:method-elimination', 'jiang:method-completing-square', 'jiang:method-euclidean-algorithm', 'jiang:method-reduce-to-normal-form'],
    ],
    note: '块按教材八章划分（最后一块是方法节点）；跨章依赖由行动契约与硬前置表达，块成员关系本身不构成必修链。',
  },
];

export const jiang = {
  nodes: [...jiangNodes, ...jiangMethodNodes],
  actions: jiangActions,
  relations: jiangRelations,
  evidence: jiangEvidence,
  support: jiangSupport,
  claims: jiangClaims,
  patterns: [],
  aggregates: jiangAggregates,
};

/** 供接线与测试核对：本案例的规模。 */
export const jiangSummary = {
  conceptCount: spec.filter((item) => item.kind === 'concept').length,
  claimCount: spec.filter((item) => item.kind === 'claim').length,
  methodNodeCount: jiangMethodNodes.length,
  nodeCount: jiang.nodes.length,
  actionCount: jiangActions.length,
  relationCount: jiangRelations.length,
  evidenceCount: jiangEvidence.length,
};
