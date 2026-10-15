/**
 * 《Linear Algebra Done Right》第 4 版（Sheldon Axler）案例。
 *
 * ## 来源与身份（可核验）
 *
 * 本机只读 PDF：`reference/paths/Linear Algebra Done Right, 4th Edition (Sheldon Axler) (Z-Library).pdf`
 * （408 页 PDF；正文印刷 1–382 页，之后是 Photo Credits / Symbol Index / Index / Colophon）。
 * 作者、书名与版次取自该 PDF 第 1 页的标题页（Undergraduate Texts in Mathematics，
 * Sheldon Axler，Fourth Edition）。
 *
 * **章节、节名与页码取自 PDF 自带书签（outline，169 条）**，不是 OCR：
 * 这份 PDF 有文本层（中英混排的数学排版，公式用 Unicode 数学字母），书签与正文页码一致。
 * 页码口径：**PDF 页码 − 18 = 印刷页码**（第 1 章起于 PDF 19 = 印刷 1；抽查 PDF 20/100/200
 * 三页的页眉分别是印刷 2/82/182，逐条对上）。节点只引用「章 + 节号 + 印刷页码」，
 * **不引用 PDF 的正文文字**。
 *
 * ## 本轮只挂名字，正文留空
 *
 * 与 `rudin.mjs` / `jiang.mjs` 同一条纪律：这些节点**先挂个名字，内容空着**。因此
 * - 每个节点只写标题与一句话的 `predicate` / `formula`（形成检查要求这两项非空，
 *   并且它们本身就是「这个节点是什么」的最小信息）；
 * - 一律 `contentRef: false`，`data/cases/` 下**没有**对应的正文块——站点如实显示「没有正文」，
 *   而不是编一段填充；
 * - 61 个里程碑的 `boundary` 写明「正文尚未撰写」，不假装已经核对过教材的逐条件反例；
 *   4 个方法节点的 `boundary` 写的是它的数学适用范围（方法本身没有「这一节的正文」），
 *   它们的证据 `scope` 仍然写明正文未撰写；
 * - 一句话谓词是**按该节的通行内容**写的，**未逐条核对教材原文**；**不引用定理编号**
 *   （Axler 的编号随版次变动，写了就成了不可核的细节）。
 *
 * ## 路径规划
 *
 * 61 个里程碑（26 概念 + 35 断言）+ 4 个方法节点，按教材**九章一章一程**分成九程
 * （见 `web/src/example-paths.ts` 的 `AXLER_STAGES`）。行动契约的输入取自这本书自己的
 * 依赖顺序：**不是目录顺序**——例如极小多项式要先有多项式一章（第 4 章）与特征值（5A），
 * 上三角化要在复特征值存在之后，SVD 要先用 T*T 是正算子这一条。
 *
 * ## 为什么没有 `data/cases/*.md` 正文文件
 *
 * 与 `rudin.mjs` / `jiang.mjs` 同理：正文没有写，就不放一个空壳文件冒充「有正文」。
 */
import {
  concept, claim, method,
  action, input, output, relation, evidence, support, claimRecord, selfCheck,
} from '../authoring.mjs';

const BOOK = 'Sheldon Axler, Linear Algebra Done Right, 4th ed.（本机 PDF：reference/paths/Linear Algebra Done Right, 4th Edition (Sheldon Axler) (Z-Library).pdf，408 页 PDF / 正文印刷 1–382 页）';
const provenanceNote = '本轮只登记节点位置与依赖；正文尚未撰写（contentRef: false），教材对应小节的表述未逐条核对，也不引用定理编号。';
const NOT_WRITTEN = ['正文尚未撰写：本节点目前只登记标题、所属小节与依赖关系；条件边界与逐条反例留待补写正文时核对教材对应小节。'];

const source = (chapter, section) => `${BOOK} ${chapter} ${section}`;

/** 九章的章名（取自 PDF 书签；印刷页码见各节点）。 */
const CH = {
  1: '第1章 向量空间',
  2: '第2章 有限维向量空间',
  3: '第3章 线性映射',
  4: '第4章 多项式',
  5: '第5章 特征值与特征向量',
  6: '第6章 内积空间',
  7: '第7章 内积空间上的算子',
  8: '第8章 复向量空间上的算子',
  9: '第9章 多重线性代数与行列式',
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
 * 61 个里程碑。`section` 为教材节号与**印刷页码**，便于逐条回查 PDF 书签。
 *
 * 学科取受控词表 `data/fields.mjs` 里的三支：
 * - `线性代数`：向量空间、线性映射、矩阵、特征值、内积、算子、若尔当形与迹；
 * - `域与数系`：复数域、域的公理与多项式（第 4 章的多项式是域上的结构，与 `jiang` 同一口径）；
 * - `多重线性与张量代数`：双线性形、二次型、交错多重线性形式、行列式与张量积
 *   （第 9 章的对象由多重线性结构构成，行列式在这里被定义为唯一的交错 n 重线性形式）。
 */
const spec = [
  // ---- 第1章 向量空间（印刷 1–26）----
  C('complex-numbers', '复数', CH[1], '§1A（印刷 2–5）', '域与数系',
    '带共轭的数系', ['C', 'i', 'a + bi'],
    'C = {a + bi : a, b ∈ R} 且 i² = −1：加法与乘法按实数的方式展开、再用 i² = −1 化简，乘法可交换，每个非零复数有乘法逆；共轭 z̄ 与绝对值满足 |z|² = z z̄，是本书第一个「域」的例子'),
  C('field', '域', CH[1], '§1A 的旁注（印刷 10–11）', '域与数系',
    '带两种运算的集合', ['F', '+', '·'],
    '域是带加法与乘法的集合：两种运算各自交换、结合，各有单位元，每个元素有加法逆元、每个非零元素有乘法逆元，且乘法对加法分配；R 与 C 是域，Z 不是（2 在 Z 里没有乘法逆元），本书的结论大多只用到这几条公理'),
  C('list-fn', '列表与 Fⁿ', CH[1], '§1A（印刷 5–10）', '线性代数',
    '有限长列表的集合', ['F', 'n', 'Fⁿ'],
    'Fⁿ 是 F 上长度 n 的列表 (x₁, …, xₙ) 的全体，加法与数乘按分量定义；它是全书所有向量空间的样板，F = R 或 C 时就是坐标空间'),
  C('vector-space', '向量空间', CH[1], '§1B（印刷 12–17）', '线性代数',
    '带加法与数乘的集合', ['V', '+', '·', 'F'],
    'F 上的向量空间是集合 V 连同加法 V × V → V 与数乘 F × V → V：加法交换、结合、有零元与逆元，数乘满足 1v = v 与两种分配律；元素叫向量，公理是「能用线性组合说话」的最小代价'),
  C('subspace', '子空间', CH[1], '§1C（印刷 18–19）', '线性代数',
    '含于向量空间且自身成空间的子集', ['U', 'V'],
    'U ⊆ V 是子空间，当且仅当 U 非空、对加法封闭、对数乘封闭；等价说法是 0 ∈ U 且 U 对任意线性组合封闭。子空间不必长成 Fⁿ 的样子，这为后面「值域、零空间、特征空间」提供了统一的说话方式'),
  T('direct-sum', '直和', CH[1], '§1C（印刷 21–24）', '线性代数', 'Theorem',
    'V = U₁ ⊕ … ⊕ Uₘ 当且仅当 V = U₁ + … + Uₘ 且每个向量写成 u₁ + … + uₘ（uᵢ ∈ Uᵢ）的方式唯一；等价判据是「只有取全部 uᵢ = 0 才使和为零」。直和把「分解唯一」这件事变成了可检验的条件，第 8 章的广义特征空间分解就靠它'),

  // ---- 第2章 有限维向量空间（印刷 27–50）----
  C('span', '张成', CH[2], '§2A（印刷 28–31）', '线性代数',
    '一族向量的全部线性组合', ['v₁, …, vₘ', 'span'],
    'span(v₁, …, vₘ) 是这些向量的全部线性组合构成的集合，它是 V 中包含这些向量的最小子空间；当它等于 V 时称这族向量张成 V'),
  C('linear-independence', '线性无关', CH[2], '§2A（印刷 31–38）', '线性代数',
    '列表的一种性质', ['v₁, …, vₘ'],
    '列表 v₁, …, vₘ 线性无关，指只有取全部系数为 0 才能使 a₁v₁ + … + aₘvₘ = 0；否则线性相关，即其中某个向量可以写成其余向量的线性组合。关键比较：无关列表的长度不超过任何张成它的列表的长度，这条是「基」存在性的支点'),
  C('basis', '基', CH[2], '§2B（印刷 39–43）', '线性代数',
    '既张成又线性无关的列表', ['v₁, …, vₘ', 'V'],
    'V 的基是既张成 V 又线性无关的列表；有有限基的空间叫有限维的。此时每个向量写成基的线性组合的方式唯一，这组系数就是坐标——「选一组基」等于「选一套坐标」'),
  T('dimension', '维数', CH[2], '§2C（印刷 44–46）', '线性代数', 'Theorem',
    '有限维向量空间的任意两个基长度相同，这个共同的长度叫 V 的维数 dim V；因此维数不依赖基的选取，而 Fⁿ 的维数正是 n。「基长度相同」这件事本身需要证明，不能当成定义'),
  T('subspace-dimension', '子空间与维数', CH[2], '§2C（印刷 47–50）', '线性代数', 'Theorem',
    '若 U 是有限维空间 V 的子空间，则 dim U ≤ dim V，且等号成立当且仅当 U = V；两个子空间的和满足 dim(U₁ + U₂) = dim U₁ + dim U₂ − dim(U₁ ∩ U₂)。这条等式是「直和维数相加」与后面秩-零化度的共同来源'),

  // ---- 第3章 线性映射（印刷 51–118）----
  C('linear-map', '线性映射', CH[3], '§3A（印刷 52–58）', '线性代数',
    '保持加法与数乘的映射', ['T', 'V', 'W'],
    'T : V → W 是线性映射，指对任意 u, v ∈ V 与 λ ∈ F 有 T(u + v) = Tu + Tv 与 T(λv) = λTv；全体线性映射本身构成向量空间 L(V, W)，其维数为 (dim V)(dim W)。「同一种结构之间的映射保结构」是全书的主线'),
  C('null-range', '零空间与值域', CH[3], '§3B（印刷 59–62）', '线性代数',
    '线性映射两端给出的子空间', ['null T', 'range T'],
    'null T = {v ∈ V : Tv = 0} 是 V 的子空间，range T = {Tv : v ∈ V} 是 W 的子空间；T 单射当且仅当 null T = {0}，T 满射当且仅当 range T = W。两个子空间的维数之和被下一条定理锁住'),
  T('fundamental-theorem', '线性映射基本定理', CH[3], '§3B（印刷 62–64）', '线性代数', 'Theorem',
    'dim V = dim null T + dim range T。它把「单射」与「满射」在同维数的情形下变成同一件事，也是秩-零化度、上三角化与谱定理反复使用的计数；本条与 `jiang` 案例里的「解的结构」是同一件事的两种讲法'),

  T('matrix-of-map', '线性映射的矩阵', CH[3], '§3C（印刷 69–77）', '线性代数', 'Theorem',
    '取定 V 的基 v₁, …, vₙ 与 W 的基 w₁, …, wₘ，线性映射 T 由矩阵 M(T) 唯一表示：它的第 k 列是 Tv_k 的坐标；两个映射复合的矩阵是矩阵的乘积。矩阵不是新对象，而是「线性映射在选定基下的样子」'),
  T('rank-of-matrix', '矩阵的秩', CH[3], '§3C（印刷 77–80）', '线性代数', 'Theorem',
    '矩阵的列秩（列的极大线性无关组大小）与行秩相等，这个公共的数等于对应线性映射值域的维数；把矩阵按列-行分解成 A = CR（C 取列空间的一组基、R 记下坐标）也由它给出。秩是相抵意义下的完全不变量'),
  T('invertibility', '可逆的等价判别', CH[3], '§3D（印刷 84–88）', '线性代数', 'Theorem',
    '有限维空间上的线性映射 T : V → V 可逆 ⟺ T 单射 ⟺ T 满射（同维数时三者等价）；更一般地 dim V = dim W 时 V 与 W 同构，而同构由「把一组基映到另一组基」唯一确定'),
  T('change-of-basis', '基变换', CH[3], '§3D（印刷 90–93）', '线性代数', 'Theorem',
    '同一个算子在不同基下的矩阵由 M(T, (u), (w)) = A⁻¹ M(T, (v), (w)) B 联系（A、B 是换基矩阵）；由此算子的**迹、行列式与特征多项式**在这类变换下不变，它们是算子自身的不变量，而不是某组基的产物'),
  C('product-quotient', '积空间与商空间', CH[3], '§3E（印刷 96–104）', '线性代数',
    '由已知空间造出的新空间', ['V × W', 'V/U'],
    'V × W 上的加法与数乘按分量定义，dim(V × W) = dim V + dim W；商空间 V/U 的元素是陪集 v + U，其维数为 dim V − dim U。商空间让「模掉一个子空间」变成一个有结构的对象，后面迹与若尔当形都要用到这种「不管内部差异」的看法'),
  C('dual-space', '对偶空间与对偶映射', CH[3], '§3F（印刷 105–117）', '线性代数',
    '线性泛函及其对偶', ["V'", "T'"],
    "V' = L(V, F) 叫 V 的对偶空间，元素是线性泛函；线性映射 T : V → W 的对偶 T' : W' → V' 由 T'(φ) = φ ∘ T 定义。对偶把「映射」与「函数」互换，是内积与行列式两章的入口"),
  T('dual-null-range', '对偶的零空间与值域', CH[3], '§3F（印刷 110–115）', '线性代数', 'Theorem',
    "dim V' = dim V（有限维空间与它的对偶同构，但同构依赖基的选取，没有自然的一个）；且 null T' = (range T)⁰、range T' = (null T)⁰，其中 U⁰ 是零化子 {φ : φ(u) = 0 对一切 u ∈ U}"),

  // ---- 第4章 多项式（印刷 119–131）----
  C('zeros-of-polynomials', '多项式的零点', CH[4], '第4章（印刷 122–123）', '域与数系',
    '多项式在一点的取值与它的零点', ['p', 'z'],
    'F[x] 上的多项式可以在一点 z 处取值（把 x 代成 z 做域运算）；p 以 z 为零点当且仅当 x − z 整除 p。这条对应把「求根」与「因式分解」变成同一件事，一般域上每个非零多项式至多有 deg p 个零点'),
  C('polynomial-division', '多项式的带余除法', CH[4], '第4章（印刷 123–124）', '域与数系',
    '以域元素为系数的多项式', ['p', 'q', 's', 'r', 'F[x]'],
    'F[x] 上的带余除法：对任意 p 与 q ≠ 0 存在唯一的多项式 s, r 使 p = sq + r 且 deg r < deg q。它要求首项系数可逆（域上恰好如此），是「多项式像整数一样有除法」的那条性质，也是后面欧几里得式论证的入口'),
  T('factorization-over-c', '复数域上的分解', CH[4], '第4章（印刷 124–127）', '域与数系', 'Theorem',
    '每个次数 ≥ 1 的复系数多项式都有零点（代数基本定理）；因此 C 上的不可约多项式正是一次多项式，每个复多项式唯一分解成一次因式之积。这条把「算子的特征值」变成了「多项式必有根」的推论'),
  T('factorization-over-r', '实数域上的分解', CH[4], '第4章（印刷 127–129）', '域与数系', 'Theorem',
    '实系数多项式的不可约因式只有一次因式与无实根的二次因式两类；奇次实多项式必有实根。因此实算子的特征多项式即使没有实根，也能按「一次 + 二次」拆干净'),

  // ---- 第5章 特征值与特征向量（印刷 132–180）----
  C('eigenvalue', '特征值与特征向量', CH[5], '§5A（印刷 133–142）', '线性代数',
    '算子作用下方向不变的向量', ['T', 'λ', 'v'],
    '若 Tv = λv 且 v ≠ 0，则 λ 是 T 的特征值、v 是相应的特征向量；λ 是特征值当且仅当 T − λI 不是单射（等价地 det(T − λI) = 0）；属于 λ 的特征向量连同 0 构成子空间 E(λ, T) = null(T − λI)'),
  T('eigenvector-independence', '不同特征值的特征向量线性无关', CH[5], '§5A（印刷 138–140）', '线性代数', 'Theorem',
    '属于互不相同的特征值的特征向量线性无关；更一般地，若每个特征值各取一组线性无关的特征向量，合起来仍线性无关。因此一个算子的不同特征值个数不超过空间维数，而「能不能对角化」就是问这些特征向量够不够多'),
  C('minimal-polynomial', '极小多项式', CH[5], '§5B（印刷 143–149）', '线性代数',
    '使 p(T) = 0 的最低次首一多项式', ['T', 'p', 'm_T'],
    'T 的极小多项式是使 p(T) = 0 的次数最低的首一多项式；它的零点恰是 T 的特征值，其次数不超过 dim V。它是「算子满足的多项式关系」里最省的那一个，可对角化的判据就写在它上面'),
  T('complex-eigenvalue', '复向量空间上必有特征值', CH[5], '§5B（印刷 143–144）', '线性代数', 'Theorem',
    '复向量空间上每个算子都有特征值（由极小多项式在 C 上有根得到）；这条结论在实空间上不成立——R² 上转 90° 的算子没有特征值。「有特征值」不是算子的普遍性质，而是系数域的功劳'),
  T('odd-real-eigenvalue', '奇数维实空间上必有特征值', CH[5], '§5B（印刷 149–150）', '线性代数', 'Theorem',
    '奇数维实向量空间上的每个算子都有实特征值（因为奇次实多项式必有实根）；偶数维时没有这种保证，转 90° 的例子就出现在二维'),
  T('upper-triangular', '上三角矩阵的存在', CH[5], '§5C（印刷 154–160）', '线性代数', 'Theorem',
    '复向量空间上每个算子都有上三角矩阵表示，且对角线上的元素恰是它的特征值（按重数计）；等价说法是存在一列层层不变的子空间 {0} = V₀ ⊂ V₁ ⊂ … ⊂ Vₙ = V 且 dim V_k = k。这是「不要求对角化时能做到什么」的答案'),
  T('diagonalizable', '可对角化的判别', CH[5], '§5D（印刷 165–170）', '线性代数', 'Theorem',
    '算子在某个基下的矩阵是对角矩阵 ⟺ V 有由特征向量组成的基 ⟺ 极小多项式分解成互不相同的一次因式之积（没有重根）⟺ 每个特征值的几何重数等于代数重数。判别落在极小多项式上，比逐个数特征向量可靠'),
  T('gershgorin', '圆盘定理', CH[5], '§5D（印刷 170–175）', '线性代数', 'Theorem',
    '对复方阵 A，每个特征值都落在某个 Gershgorin 圆盘 {z : |z − A_jj| ≤ Σ_{k≠j} |A_jk|} 中，因此全部特征值落在这些圆盘的并集里；这给出「特征值大概在哪」的可算估计，而不必解特征方程'),
  T('commuting-operators', '交换算子', CH[5], '§5E（印刷 175–180）', '线性代数', 'Theorem',
    '复向量空间上两个可交换的算子（ST = TS）有公共特征向量；进一步，一族两两交换的算子可以同时上三角化，若其中每个都单独可对角化则还可以同时对角化。交换性是「能否同时化简」的钥匙'),

  // ---- 第6章 内积空间（印刷 181–226）----
  C('inner-product', '内积与范数', CH[6], '§6A（印刷 182–189）', '线性代数',
    '给实或复空间加上长度与夹角', ['⟨u, v⟩', '‖v‖'],
    '内积是 V × V → F 的映射：对第一个变量线性、对第二个变量共轭线性，且 ⟨v, v⟩ ≥ 0、等号只在 v = 0 时成立（实情形下还有对称性）；由它定义范数 ‖v‖ = √⟨v, v⟩ 与正交关系 ⟨u, v⟩ = 0。同一批向量空间加上内积后才有「长度」'),
  T('cauchy-schwarz', '柯西–施瓦茨不等式', CH[6], '§6A（印刷 189–196）', '线性代数', 'Theorem',
    '|⟨u, v⟩| ≤ ‖u‖‖v‖，等号当且仅当 u、v 线性相关；由它得到三角不等式 ‖u + v‖ ≤ ‖u‖ + ‖v‖ 与平行四边形恒等式 ‖u + v‖² + ‖u − v‖² = 2(‖u‖² + ‖v‖²)。后者反过来是个判据：满足它的范数一定来自某个内积'),
  C('orthonormal-list', '规范正交列表', CH[6], '§6B（印刷 197–203）', '线性代数',
    '两两正交且长度为 1 的列表', ['e₁, …, eₘ'],
    'e₁, …, eₘ 规范正交指 ⟨e_j, e_k⟩ 在 j = k 时为 1、否则为 0；这样的列表一定线性无关，且 ‖a₁e₁ + … + aₘeₘ‖² = |a₁|² + … + |aₘ|²（勾股定理的一般形式）。在规范正交列表下，坐标可以直接用内积算出来'),
  T('gram-schmidt', '格拉姆–施密特正交化', CH[6], '§6B（印刷 197–204）', '线性代数', 'Theorem',
    '每个线性无关列表 v₁, …, vₘ 都能化成规范正交列表 e₁, …, eₘ，使得对每个 k 都有 span(v₁, …, v_k) = span(e₁, …, e_k)；因此有限维内积空间都有规范正交基。这条同时给出算法与存在性'),
  T('riesz-representation', '里斯表示定理', CH[6], '§6B（印刷 204–208）', '线性代数', 'Theorem',
    "对每个线性泛函 φ ∈ V' 存在唯一向量 v 使 φ(u) = ⟨u, v⟩ 对一切 u 成立；因此 v ↦ ⟨·, v⟩ 是 V 到 V' 的同构（复情形是共轭线性同构）。它把「抽象的对偶」变成了「用内积配一个向量」，伴随算子就是它的直接推论"),
  T('orthogonal-decomposition', '正交补与正交分解', CH[6], '§6C（印刷 211–217）', '线性代数', 'Theorem',
    'U^⊥ = {v : ⟨v, u⟩ = 0 对一切 u ∈ U} 是子空间；U 有限维时 V = U ⊕ U^⊥，于是 dim U^⊥ = dim V − dim U，且 (U^⊥)^⊥ = U。正交补让「投影」有了不需要坐标的定义'),
  T('minimal-distance', '极小化问题的解', CH[6], '§6C（印刷 217–224）', '线性代数', 'Theorem',
    '给定 v ∈ V 与子空间 U，距离 ‖v − u‖ 在 u = P_U v（v 在 U 上的正交投影）处取到最小值，最小值为 ‖v − P_U v‖，且 v − P_U v ∈ U^⊥；把同一套写法用到线性方程组上就得到伪逆与最小范数解'),

  // ---- 第7章 内积空间上的算子（印刷 227–296）----
  C('adjoint', '伴随', CH[7], '§7A（印刷 228–233）', '线性代数',
    '由内积配出来的配对算子', ['T*', 'T'],
    'T 的伴随 T* 是唯一满足 ⟨Tv, w⟩ = ⟨v, T*w⟩ 对一切 v, w 成立的算子（存在唯一性由里斯表示定理给出）；映射 T ↦ T* 是共轭线性的，且 (S + T)* = S* + T*、(ST)* = T*S*、T** = T'),
  C('self-adjoint-normal', '自伴与正规算子', CH[7], '§7A（印刷 233–238）', '线性代数',
    '与自身伴随相等（或与伴随交换）的算子', ['T', 'T*'],
    'T 自伴指 T = T*（实空间上即对称、复空间上即 Hermite），T 正规指 TT* = T*T；自伴算子的特征值全是实数，且属于不同特征值的特征向量互相正交。这两类算子是「能对角化」的主力'),
  T('real-spectral', '实谱定理', CH[7], '§7B（印刷 243–247）', '线性代数', 'Theorem',
    '实内积空间上的自伴算子有由特征向量组成的规范正交基，且特征值全为实数；等价说法是存在规范正交基使它在这组基下是对角矩阵。这条把「对称矩阵可以对角化」变成内积空间里的结构性结论'),
  T('complex-spectral', '复谱定理', CH[7], '§7B（印刷 246–248）', '线性代数', 'Theorem',
    '复内积空间上的算子有规范正交的特征向量基 ⟺ 它是正规算子；因此自伴算子、等距算子与酉算子都可对角化，且不同特征子空间互相正交'),
  T('positive-operator', '正算子与平方根', CH[7], '§7C（印刷 251–256）', '线性代数', 'Theorem',
    'T 是正算子指 T 自伴且 ⟨Tv, v⟩ ≥ 0 对一切 v 成立；每个正算子有唯一的正平方根，且对任意算子 T，T*T 是正算子、√(T*T) 是「T 里那个只负责拉伸的部分」。SVD 与极分解都以它为基础'),
  C('isometry-unitary', '等距与酉算子', CH[7], '§7D（印刷 258–264）', '线性代数',
    '保持范数的算子', ['S', 'U'],
    'S 是等距指 ‖Sv‖ = ‖v‖ 对一切 v 成立，等价于 S*S = I，也等价于把规范正交列表映成规范正交列表；可逆的等距叫酉算子（实情形叫正交算子），酉算子的特征值绝对值都为 1'),
  T('qr-cholesky', 'QR 与 Cholesky 分解', CH[7], '§7D（印刷 263–268）', '线性代数', 'Theorem',
    '每个方阵可以分解成 A = QR（Q 是酉矩阵、R 是上三角），把格拉姆–施密特过程用到 A 的各列即得；每个正定方阵可以分解成 A = R*R（R 为上三角且对角元为正），这个分解唯一，由 QR 去掉符号得到'),
  T('svd', '奇异值分解', CH[7], '§7E（印刷 270–278）', '线性代数', 'Theorem',
    '奇异值是 T*T 的特征值的平方根；存在 V 的规范正交基 e₁, …, eₙ 与 W 的规范正交基 f₁, …, fₘ 使 Tv = s₁⟨v, e₁⟩f₁ + … + sₙ⟨v, eₙ⟩fₙ，矩阵形式即 A = F diag(s₁, …, sₙ) E*。它把任意线性映射写成「旋转 × 沿坐标拉伸 × 旋转」'),
  T('svd-consequences', '奇异值分解的推论', CH[7], '§7F（印刷 280–294）', '线性代数', 'Theorem',
    '由 SVD 得到：算子的范数（最大拉伸比）等于最大奇异值；秩不超过 k 的最佳逼近由前 k 个奇异值给出（Eckart–Young）；每个算子可分解为「等距 × 正算子」（极分解）；像椭球的半轴与平行多面体的体积分别由奇异值与奇异值之积给出'),

  // ---- 第8章 复向量空间上的算子（印刷 297–331）----
  C('generalized-eigenvector', '广义特征向量与幂零算子', CH[8], '§8A（印刷 298–306）', '线性代数',
    '某个幂作用下落回特征空间的向量', ['G(λ, T)', 'N'],
    '若 (T − λI)^k v = 0 对某个正整数 k 成立，则 v 是 T 的广义特征向量，全体这样的向量构成广义特征空间 G(λ, T)；算子是幂零的指它的某个幂等于 0，幂零算子在适当的基下是严格上三角矩阵。这一步把「特征向量不够多」的情形也纳入结构'),
  T('generalized-decomposition', '广义特征空间分解', CH[8], '§8B（印刷 308–314）', '线性代数', 'Theorem',
    '复向量空间上 V = G(λ₁, T) ⊕ … ⊕ G(λₘ, T)（λᵢ 为互不相同的特征值），每个 G(λ, T) 在 T 下不变，且 T − λI 限制在 G(λ, T) 上是幂零的；因此 T 在这个分解下是块对角的，每块是「λI + 幂零」'),
  T('multiplicity', '重数关系与块对角形式', CH[8], '§8B（印刷 310–316）', '线性代数', 'Theorem',
    'dim G(λ, T) 等于 λ 作为特征多项式根的重数（代数重数），于是特征多项式为 ∏(z − λ)^{dim G(λ, T)}；在这个分解下 T 有块对角矩阵表示，每块对应一个广义特征空间。它让「重数」从多项式的系数变成可数维数'),
  T('square-root', '可逆算子的平方根', CH[8], '§8C（印刷 319–322）', '线性代数', 'Theorem',
    '复向量空间上每个可逆算子都有平方根（在广义特征空间上把 T 写成 λI + 幂零，再对 λI + N 用二项式级数展开）；不可逆的算子未必有平方根。存在性用的是分解，不是迭代'),
  T('jordan-form', '若尔当形', CH[8], '§8C（印刷 321–324）', '线性代数', 'Theorem',
    '复向量空间上每个算子都有若尔当形，且在不计若尔当块重排的意义下唯一；它由特征值、各广义特征空间的维数与幂零部分的块结构完全决定。因此两个算子相似当且仅当它们的若尔当形相同——相似分类到此闭合'),
  T('trace', '迹', CH[8], '§8D（印刷 326–330）', '线性代数', 'Theorem',
    '算子的迹等于它在任意一组基下矩阵的对角元之和，因此不依赖基的选取；tr(ST) = tr(TS)，tr(T) 等于全部特征值之和（按重数计），特征多项式中 z^{n−1} 的系数是 −tr T、常数项是 (−1)ⁿ det T。迹把「矩阵的一个和」变成了算子的不变量'),

  // ---- 第9章 多重线性代数与行列式（印刷 332–382）----
  C('bilinear-form', '双线性形与对称双线性形', CH[9], '§9A（印刷 333–341）', '多重线性与张量代数',
    '两个变量各自线性的函数', ['β(u, v)'],
    '双线性形 β : V × V → F 对每个变量分别线性；对称指 β(u, v) = β(v, u)。在特征不等于 2 的域上，对称双线性形与二次型一一对应，这是「把二次问题化成线性问题」的第一步'),
  C('quadratic-form', '二次型', CH[9], '§9A（印刷 341–344）', '多重线性与张量代数',
    '齐二次函数', ['q(v)', 'β'],
    '二次型 q : V → F 满足 q(λv) = λ²q(v)，并由极化恒等式 q(u + v) − q(u) − q(v) = 2β(u, v) 与唯一的对称双线性形对应（char F ≠ 2）；正定指 q(v) > 0 对一切 v ≠ 0 成立。长度平方 ‖v‖² 就是最熟悉的那个二次型'),
  C('alternating-multilinear', '交错多重线性形式', CH[9], '§9B（印刷 346–352）', '多重线性与张量代数',
    'm 个变量各自线性的函数', ['β(v₁, …, vₘ)', 'sgn σ'],
    'm 重线性形式对每个变量分别线性；交错指交换两个变量时取值变号（等价于有重复变量时取值为 0）；交错 n 重形式的空间维数是 C(n, m)（n = dim V），这个计数是行列式唯一性的来源'),
  T('determinant', '行列式', CH[9], '§9C（印刷 354–367）', '多重线性与张量代数', 'Theorem',
    '行列式是 V 上唯一的交错 n 重线性形式，并约定 det(I) = 1；它满足 det(AB) = det(A)det(B)、det(Aᵀ) = det(A)，且 A 可逆 ⟺ det A ≠ 0；几何上 |det A| 等于像平行多面体的体积。这条把行列式从「展开式的计算规则」改成了「唯一满足两条性质的函数」'),
  C('tensor-product', '张量积', CH[9], '§9D（印刷 370–378）', '多重线性与张量代数',
    '把双线性问题化成线性问题的空间', ['V ⊗ W', '⊗'],
    '张量积 V ⊗ W 由双线性映射 ⊗ : V × W → V ⊗ W 的泛性质唯一确定：任何双线性映射 β : V × W → U 都唯一地穿过 ⊗；dim(V ⊗ W) = (dim V)(dim W)，内积空间上的张量积还带一个自然内积。「多重线性」由此被收纳进「线性」'),
];

/**
 * 四个方法节点：这本书里**成步骤**的构造（不是定理）。
 *
 * 与 `jiang.mjs` 同一口径：方法随案例登记，但**不作为路线终点**——路线的里程碑是对象与结论，
 * 方法是走这些对象时手上的工具。每条的 `Use` 指向它服务的结论。
 */
const methodSpec = [
  {
    id: 'axler:method-gram-schmidt', title: '格拉姆–施密特正交化', scope: '局部方法',
    discipline: '线性代数', chapter: CH[6], section: '§6B（印刷 197–204）',
    summary: '把一组线性无关的向量逐个改造成规范正交列表：每一步减去前面所有方向上的投影，再除以长度；每一步的张成不变。',
    In: '一组线性无关的向量 v₁, …, vₘ', Out: '规范正交列表 e₁, …, eₘ，且每个 k 上 span(v₁, …, v_k) = span(e₁, …, e_k)',
    Pre: '空间上已给定内积（否则「投影」与「长度」无从谈起）', Post: '得到规范正交基；把过程写成矩阵形式就得到 QR 分解中的 Q 与 R',
    Use: ['axler:gram-schmidt', 'axler:qr-cholesky'],
    Demo: ['axler:orthonormal-list', 'axler:orthogonal-decomposition'],
    Fail: '对**线性相关**的列表直接照做会除以零：某一步的「剩下的部分」可能已经是零向量。这时要先把相关的向量丢掉，或者接受得到的是零向量而不是单位向量。',
    body: '令 e₁ = v₁/‖v₁‖；对 k = 2, …, m：先算 v_k 减去它在 e₁, …, e_{k−1} 上的投影之和，得到与前面全部正交的余项，再除以它的长度得到 e_k。若余项为零向量，说明 v_k 落在前面张成的空间里，此时该列表不是线性无关的。',
    formal: { applicableTo: ['axler:gram-schmidt', 'axler:qr-cholesky'], boundary: ['要求系数域是 R 或 C，且列表线性无关；对无穷列表需要额外的收敛条件。'] },
    motivation: {
      internal: ['内积给的定义是「正交」，但手上一开始只有一组随便取的基；正交化是把「定义」变成「已有对象」的那一步。'],
      external: ['数值线性代数里最小二乘、QR 分解、正交基的构造，第一步都是它；它也是「病态基」换成「良态基」的标准手段。'],
      aesthetic: ['一步只做一件事：先正交，再单位化；每一步的张成都不变，因此过程本身就是一个不变量的守恒。'],
      growthChain: ['希望坐标好算 → 希望基两两正交 → 希望长度为 1 → 从任意无关列表出发逐个改造 → 得到格拉姆–施密特过程 → 写成矩阵形式得到 QR 分解'],
    },
    teaching: {
      selfCheck: [selfCheck('sc-axler-gs-1', '把 R³ 里的 (1,1,0), (1,0,1), (0,1,1) 正交化，并说明第二步为什么要减去两个投影而不是一个。', '计算', 'axler:method-gram-schmidt', '先得 e₁；第二个向量要与 e₁ 正交，只减 e₁ 上的投影；第三个要与 e₁、e₂ 都正交，因此两个投影都要减。')],
      reviewQuestions: ['如果列表线性相关，过程会在哪一步暴露出来？暴露的形式是什么？'],
      evidenceStatus: 'REF',
    },
  },
  {
    id: 'axler:method-qr', title: 'QR 分解的算法', scope: '局部方法',
    discipline: '线性代数', chapter: CH[7], section: '§7D（印刷 263–265）',
    summary: '把方阵 A 的列看成一组向量，对它们做格拉姆–施密特正交化：得到的规范正交列组成 Q，过程中用到的系数组成上三角的 R。',
    In: '一个方阵 A（列线性无关）', Out: '分解 A = QR，其中 Q 酉（列规范正交）、R 上三角且对角元为正',
    Pre: '空间上已给定内积；A 的列线性无关（否则 R 的对角元会出现 0）', Post: '得到酉矩阵与上三角矩阵；求解最小二乘问题时把 A = QR 代进去，方程会变成上三角的',
    Use: ['axler:qr-cholesky', 'axler:gram-schmidt'],
    Demo: ['axler:isometry-unitary', 'axler:orthonormal-list'],
    Fail: '列线性相关时 R 会出现零对角元，Q 的列也就不再唯一（缺的方向可以任取一组正交补）。此外这个分解不唯一：把 Q 的某些列同时变号、R 的相应行也变号，等式照样成立——所以定理里才要约定 R 的对角元为正。',
    body: '对 A 的各列 a₁, …, aₙ 做格拉姆–施密特：得到规范正交列 q₁, …, qₙ；把每一步减掉的投影系数记下来，就得到上三角矩阵 R（第 k 列记录 a_k 在 q₁, …, q_k 上的坐标）。于是 A = QR。',
    formal: { applicableTo: ['axler:qr-cholesky'], boundary: ['要求列线性无关且 R 的对角元取正，唯一性才成立；长方阵要用扩展的 QR（补零列）。'] },
    motivation: {
      internal: ['格拉姆–施密特给出正交基，但要把「换基」写成矩阵运算，就需要把过程本身编码成一个矩阵等式。'],
      external: ['最小二乘、特征值算法（QR 迭代）、求解线性方程组都用它；它是「正交化」在数值上的可用形式。'],
      aesthetic: ['一个几何过程（正交化）与一个代数等式（A = QR）在这里是同一件事的两种写法。'],
      growthChain: ['需要正交基 → 有了格拉姆–施密特过程 → 把过程写成矩阵 → 得到 A = QR → 用 R 的上三角性解最小二乘'],
    },
    teaching: {
      selfCheck: [selfCheck('sc-axler-qr-1', '对 A = [[1,1],[0,1]] 求 QR 分解。', '计算', 'axler:method-qr', 'q₁ = (1,0)，q₂ = (0,1)，故 Q = I、R = A。')],
      reviewQuestions: ['R 的对角元在数值上代表什么？为什么它们不能是 0？'],
      evidenceStatus: 'REF',
    },
  },
  {
    id: 'axler:method-cholesky', title: 'Cholesky 分解的算法', scope: '局部方法',
    discipline: '线性代数', chapter: CH[7], section: '§7D（印刷 266–268）',
    summary: '对正定方阵做 QR 分解，再把 R 的对角元搬到 Q 上，使 Q 变成单位阵、R 变成对角元为正的上三角矩阵：得到 A = R*R。',
    In: '一个正定方阵 A', Out: '唯一分解 A = R*R，R 上三角、对角元为正',
    Pre: '已判定 A 正定（等价地：对应的二次型恒正）', Post: '得到唯一的三角分解；解方程组时把它化成两次三角回代',
    Use: ['axler:qr-cholesky', 'axler:positive-operator'],
    Demo: ['axler:positive-operator', 'axler:quadratic-form'],
    Fail: '非正定的矩阵没有这种分解：半正定会出现零对角元（可以允许零但不再唯一），不定的矩阵则连正的对角元都凑不出来。写成 A = R*R 时若不约定对角元为正，分解也不唯一。',
    body: '对 A 做 QR 分解得 A = QR；令 D 为 R 的对角元组成的对角矩阵，则 A = (QD)(D⁻¹R)，其中 QD 酉、D⁻¹R 是上三角且对角元为 1。由 A 自伴与正定可推出这个上三角矩阵其实是单位阵——于是 A = R*R。',
    formal: { applicableTo: ['axler:qr-cholesky'], boundary: ['只对正定（或半正定）矩阵成立；复情形用共轭转置，实情形即 A = RᵀR。'] },
    motivation: {
      internal: ['既然正定矩阵能写成 R*R，那么在什么条件下这个 R 唯一？把 QR 里多余的自由度用完，就得到了唯一性。'],
      external: ['数值上解正定方程组、最小二乘的正规方程、卡尔曼滤波里的协方差分解都优先用它（比 LU 更省且稳定）。'],
      aesthetic: ['「正定」这个二次型的条件，恰好等于「有一个对角元为正的三角平方根」。'],
      growthChain: ['正定 ↔ 二次型恒正 → 希望写成平方 → 借用 QR 的三角结构 → 消掉多余的自由度 → 得到唯一的 A = R*R'],
    },
    teaching: {
      selfCheck: [selfCheck('sc-axler-cholesky-1', '对 A = [[4,2],[2,3]] 求 Cholesky 分解。', '计算', 'axler:method-cholesky', 'R = [[2,1],[0,√2]]，验算 R*R = A。')],
      reviewQuestions: ['为什么 A = R*R 里要求 R 的对角元为正，唯一性才成立？'],
      evidenceStatus: 'REF',
    },
  },
  {
    id: 'axler:method-jordan', title: '求若尔当形', scope: '全局方法',
    discipline: '线性代数', chapter: CH[8], section: '§8C（印刷 321–324）',
    summary: '先求全部特征值与广义特征空间（即各 (T − λI)^k 的零空间稳定下来的那个子空间），再把每个广义特征空间上的幂零部分拆成若尔当块。',
    In: '复向量空间上的一个算子 T（或它的矩阵）', Out: '若尔当形（每块形如 λI + 严格上三角的幂零块）与换基矩阵',
    Pre: '已算出特征多项式或极小多项式，并已确认系数域是 C（实情形要先复化）', Post: '得到相似分类的完全不变量：特征值、各广义特征空间维数与若尔当块的大小分布',
    Use: ['axler:jordan-form', 'axler:generalized-decomposition'],
    Demo: ['axler:generalized-eigenvector', 'axler:trace'],
    Fail: '若尔当形对**数值计算**并不稳定：特征值的微小扰动会把一个大的若尔当块分裂成若干小块（相似形随之改变）。因此它在理论上是完全的相似不变量，在数值上通常改用 Schur 形或 SVD。方法本身也不保证给出唯一的换基矩阵。',
    body: '求特征多项式得到特征值 λ₁, …, λₘ → 对每个 λ 求 (T − λI)^k 的零空间直到维数稳定，得到 G(λ, T) → 在每个 G(λ, T) 上把 N = T − λI 看成幂零算子，求它的零空间链得到块结构 → 把每块写成 λI + 幂零块，拼成若尔当形。',
    formal: { applicableTo: ['axler:jordan-form'], boundary: ['要求系数域代数闭（复情形）；实矩阵若不看复化，只能得到实若尔当形或有理标准形。'] },
    motivation: {
      internal: ['可对角化是特例而不是常态；若尔当形回答的是「不能对角化时，最简能到什么程度」。'],
      external: ['线性常微分方程组的解（含重根时的 t^k 因子）、矩阵函数（e^{tA}、log A）的计算都要用到块结构。'],
      aesthetic: ['相似分类以「若尔当形相同」这一句话结束：复杂的换基问题被压成一组块的清单。'],
      growthChain: ['想化简算子 → 先求特征值 → 特征向量不够 → 引入广义特征向量 → 幂零部分分块 → 得到若尔当形 → 相似分类闭合'],
    },
    teaching: {
      selfCheck: [selfCheck('sc-axler-jordan-1', '求 A = [[2,1],[0,2]] 的若尔当形，并说明它为什么不能对角化。', '计算', 'axler:method-jordan', '特征值只有 2，特征空间维数为 1 < 2，故不可对角化；若尔当形就是一个 2×2 的块 J₂(2)。')],
      reviewQuestions: ['为什么「若尔当形唯一」与「换基矩阵不唯一」可以同时成立？'],
      evidenceStatus: 'REF',
    },
  },
];

/**
 * 行动契约：输入取自这本书自己的依赖顺序（不是目录顺序）。
 *
 * `[slug, mode, title, inputs]`；输出恒为一个节点 `axler:<slug>`。
 * 输入里**本案例的节点可以写短名**（`subspace`），映射时补 `axler:` 前缀；
 * 背景（`bg:…`）与跨案例的接口（`field:…`、`jiang:…`）本来就带 `:`，原样通过。
 */
const resolveInput = (nodeId) => (nodeId.includes(':') ? nodeId : `axler:${nodeId}`);

const actionSpecs = [
  // 第一程：向量空间
  ['complex-numbers', 'definition', '引入复数域', ['bg:set:function', 'bg:logic:quantifier']],
  ['field', 'definition', '引入域的公理', ['complex-numbers', 'bg:set:function']],
  ['list-fn', 'definition', '引入列表与 Fⁿ', ['field']],
  ['vector-space', 'definition', '给出向量空间的公理化定义', ['field', 'list-fn']],
  ['subspace', 'definition', '引入子空间', ['vector-space']],
  ['direct-sum', 'deduction', '给出直和的判据', ['subspace']],

  // 第二程：有限维向量空间
  ['span', 'definition', '引入张成', ['vector-space', 'subspace']],
  ['linear-independence', 'definition', '引入线性无关', ['span']],
  ['basis', 'definition', '引入基', ['span', 'linear-independence']],
  ['dimension', 'deduction', '证明维数良定义', ['basis']],
  ['subspace-dimension', 'deduction', '给出子空间与维数的关系', ['dimension', 'subspace']],

  // 第三程：线性映射
  ['linear-map', 'definition', '引入线性映射', ['vector-space', 'list-fn']],
  ['null-range', 'definition', '引入零空间与值域', ['linear-map']],
  ['fundamental-theorem', 'deduction', '证明线性映射基本定理', ['null-range', 'dimension']],
  ['matrix-of-map', 'definition', '引入线性映射的矩阵表示', ['linear-map', 'basis']],
  ['rank-of-matrix', 'deduction', '证明行秩等于列秩', ['matrix-of-map', 'span']],
  ['invertibility', 'deduction', '给出可逆的等价判别', ['fundamental-theorem', 'matrix-of-map']],
  ['change-of-basis', 'deduction', '给出基变换公式', ['matrix-of-map', 'basis']],
  ['product-quotient', 'definition', '引入积空间与商空间', ['subspace', 'linear-map']],
  ['dual-space', 'definition', '引入对偶空间与对偶映射', ['linear-map', 'matrix-of-map']],
  ['dual-null-range', 'deduction', '给出对偶的零空间与值域', ['dual-space', 'null-range']],

  // 第四程：多项式
  ['zeros-of-polynomials', 'definition', '引入多项式的零点', ['field', 'complex-numbers']],
  ['polynomial-division', 'deduction', '证明带余除法', ['zeros-of-polynomials']],
  ['factorization-over-c', 'deduction', '证明复数域上的分解', ['polynomial-division']],
  ['factorization-over-r', 'deduction', '证明实数域上的分解', ['polynomial-division', 'factorization-over-c']],

  // 第五程：特征值与特征向量
  ['eigenvalue', 'definition', '引入特征值与特征向量', ['linear-map', 'null-range']],
  ['eigenvector-independence', 'deduction', '证明不同特征值的特征向量线性无关', ['eigenvalue', 'linear-independence']],
  ['minimal-polynomial', 'definition', '引入极小多项式', ['eigenvalue', 'factorization-over-c']],
  ['complex-eigenvalue', 'deduction', '证明复空间上必有特征值', ['minimal-polynomial', 'factorization-over-c']],
  ['odd-real-eigenvalue', 'deduction', '证明奇数维实空间上必有特征值', ['factorization-over-r', 'minimal-polynomial']],
  ['upper-triangular', 'deduction', '证明上三角矩阵的存在', ['complex-eigenvalue', 'matrix-of-map']],
  ['diagonalizable', 'deduction', '给出可对角化的判别', ['minimal-polynomial', 'eigenvector-independence']],
  ['gershgorin', 'deduction', '给出圆盘定理', ['upper-triangular', 'eigenvalue']],
  ['commuting-operators', 'deduction', '给出交换算子的同时化简', ['diagonalizable', 'upper-triangular']],

  // 第六程：内积空间
  ['inner-product', 'definition', '引入内积与范数', ['vector-space', 'list-fn']],
  ['cauchy-schwarz', 'deduction', '证明柯西–施瓦茨不等式', ['inner-product']],
  ['orthonormal-list', 'definition', '引入规范正交列表', ['inner-product', 'linear-independence']],
  ['gram-schmidt', 'construction', '实行格拉姆–施密特正交化', ['orthonormal-list', 'span']],
  ['riesz-representation', 'deduction', '证明里斯表示定理', ['orthonormal-list', 'dual-space']],
  ['orthogonal-decomposition', 'deduction', '证明正交分解', ['gram-schmidt', 'subspace']],
  ['minimal-distance', 'deduction', '解出极小化问题', ['orthogonal-decomposition', 'riesz-representation']],

  // 第七程：内积空间上的算子
  ['adjoint', 'definition', '引入伴随算子', ['inner-product', 'riesz-representation']],
  ['self-adjoint-normal', 'definition', '引入自伴与正规算子', ['adjoint', 'eigenvalue']],
  ['real-spectral', 'deduction', '证明实谱定理', ['self-adjoint-normal', 'diagonalizable', 'orthonormal-list']],
  ['complex-spectral', 'deduction', '证明复谱定理', ['self-adjoint-normal', 'upper-triangular']],
  ['positive-operator', 'deduction', '给出正算子与平方根', ['self-adjoint-normal', 'real-spectral']],
  ['isometry-unitary', 'definition', '引入等距与酉算子', ['inner-product', 'orthonormal-list', 'adjoint']],
  ['qr-cholesky', 'deduction', '给出 QR 与 Cholesky 分解', ['gram-schmidt', 'positive-operator', 'isometry-unitary']],
  ['svd', 'deduction', '证明奇异值分解', ['qr-cholesky', 'positive-operator', 'isometry-unitary']],
  ['svd-consequences', 'deduction', '给出奇异值分解的推论', ['svd', 'minimal-distance']],

  // 第八程：复向量空间上的算子
  ['generalized-eigenvector', 'definition', '引入广义特征向量与幂零算子', ['eigenvalue', 'upper-triangular']],
  ['generalized-decomposition', 'deduction', '证明广义特征空间分解', ['generalized-eigenvector', 'factorization-over-c']],
  ['multiplicity', 'deduction', '给出重数关系与块对角形式', ['generalized-decomposition', 'polynomial-division']],
  ['square-root', 'deduction', '证明可逆算子有平方根', ['generalized-decomposition', 'multiplicity']],
  ['jordan-form', 'deduction', '证明若尔当形的存在与唯一', ['generalized-decomposition', 'multiplicity', 'upper-triangular']],
  ['trace', 'deduction', '给出迹的性质', ['matrix-of-map', 'multiplicity', 'change-of-basis']],

  // 第九程：多重线性代数与行列式
  ['bilinear-form', 'definition', '引入双线性形', ['vector-space', 'linear-map']],
  ['quadratic-form', 'definition', '引入二次型', ['bilinear-form']],
  ['alternating-multilinear', 'definition', '引入交错多重线性形式', ['bilinear-form', 'bg:set:function']],
  ['determinant', 'deduction', '给出行列式的定义与性质', ['alternating-multilinear', 'matrix-of-map', 'invertibility']],
  ['tensor-product', 'construction', '构造张量积', ['bilinear-form', 'inner-product', 'product-quotient']],
];

const methodInputs = {
  'axler:method-gram-schmidt': ['axler:orthonormal-list', 'axler:span'],
  'axler:method-qr': ['axler:qr-cholesky', 'axler:gram-schmidt'],
  'axler:method-cholesky': ['axler:qr-cholesky', 'axler:positive-operator'],
  'axler:method-jordan': ['axler:jordan-form', 'axler:generalized-decomposition'],
};

const bySlug = new Map(spec.map((item) => [item.slug, item]));
const accepts = ['definition', 'statement'];
const provides = ['definition', 'statement'];

function shared(item) {
  return {
    discipline: item.discipline,
    case: 'axler',
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
    return claim(`axler:${item.slug}`, item.title, {
      ...shared(item),
      roles: [item.role],
      formula: item.predicate,
      teaching: {
        evidenceStatus: 'REF',
        reviewQuestions: [`${item.title}的结论在去掉哪个前提后会失效？`],
      },
    });
  }
  return concept(`axler:${item.slug}`, item.title, {
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

export const axlerNodes = spec.map(buildNode);

export const axlerMethodNodes = methodSpec.map((item) => method(item.id, item.title, {
  discipline: item.discipline, case: 'axler', scope: item.scope,
  summary: item.summary, In: item.In, Out: item.Out, Pre: item.Pre, Post: item.Post,
  Use: item.Use, Demo: item.Demo, Fail: item.Fail, body: item.body,
  formal: item.formal,
  motivation: item.motivation,
  teaching: item.teaching,
  contentRef: false,
  provenance: { sources: [source(item.chapter, item.section)], note: provenanceNote + ' 方法由教材相应章节的惯用论证提炼，教材未单列同名条目。' },
}));

export const axlerActions = [
  ...actionSpecs.map(([slug, mode, title, inputs]) => action(
    `a-axler:${slug}`, mode, title,
    inputs.map((nodeId) => input(resolveInput(nodeId), accepts)),
    [output(`axler:${slug}`, provides)],
    { witness: { type: 'declared-contract', status: 'REF', ref: source(bySlug.get(slug).chapter, bySlug.get(slug).section) } },
  )),
  ...methodSpec.map((item) => action(
    `a-${item.id}`, 'method', `提出方法：${item.title}`,
    methodInputs[item.id].map((nodeId) => input(nodeId, accepts)),
    [output(item.id, ['method'])],
    { witness: { type: 'method-presentation', status: 'DEF', ref: source(item.chapter, item.section) } },
  )),
];

/**
 * 关系：案例内部的**定义性依赖**主干，以及与本站既有登记的接口。
 *
 * 判据与 `jiang.mjs` 相同：不用它，目标节点的**定义或陈述**就写不出来。
 * 见证一律 `definitional-dependency` + `DEF`；本案例**没有**登记 `proof-dependency`
 * （那要求一条同时列出两端节点的证据记录），因为正文尚未撰写——不登记比编一条不可核的依赖更诚实。
 */
const prereqSpecs = [
  ['axler:complex-numbers', 'axler:field', '复数是最先拿出来对照的域的例子：i² = −1 与共轭都写在复数里，「域」是它满足的那组公理的抽象。'],
  ['axler:field', 'axler:list-fn', 'Fⁿ 的每个分量取值在域 F 里，数乘就是域的乘法。'],
  ['axler:field', 'axler:vector-space', '向量空间的数乘要求「系数取自域 F」：没有域的公理，「数乘」两个字没有内容。'],
  ['axler:list-fn', 'axler:vector-space', '向量空间的公理是按 Fⁿ 的分量运算逐条抽象出来的，例子先于公理。'],
  ['axler:vector-space', 'axler:subspace', '子空间是「本身也满足向量空间公理」的子集，判据里出现的加法与数乘就来自 V。'],
  ['axler:subspace', 'axler:direct-sum', '直和是两个子空间之间的关系：陈述里出现的 U₁, …, Uₘ 都是子空间。'],
  ['axler:vector-space', 'axler:span', '张成是「某个集合的线性组合的全体」，线性组合的定义依赖向量空间的加法与数乘。'],
  ['axler:subspace', 'axler:span', 'span 被刻画为「包含这族向量的最小子空间」，这句话用到了子空间。'],
  ['axler:span', 'axler:linear-independence', '线性无关的判据 a₁v₁ + … + aₘvₘ = 0 用的就是线性组合，而线性组合属于 span。'],
  ['axler:span', 'axler:basis', '基的定义有一半是「张成 V」，直接用到 span。'],
  ['axler:linear-independence', 'axler:basis', '基的定义另一半是「线性无关」，两条合起来才是基。'],
  ['axler:basis', 'axler:dimension', '维数被定义为基的长度；「任意两个基长度相同」这条结论的主语就是基。'],
  ['axler:dimension', 'axler:subspace-dimension', 'dim U ≤ dim V 与 dim(U₁ + U₂) 的等式两边都是维数。'],
  ['axler:subspace', 'axler:subspace-dimension', '结论讲的是子空间的维数关系，U 与 U₁ ∩ U₂ 都是子空间。'],
  ['axler:vector-space', 'axler:linear-map', '线性映射是「两个向量空间之间保持运算的映射」，两端的结构都由向量空间给出。'],
  ['axler:linear-map', 'axler:null-range', '零空间与值域是线性映射的两端产物，定义里直接出现 T。'],
  ['axler:null-range', 'axler:fundamental-theorem', '定理的陈述 dim V = dim null T + dim range T 里出现的就是这两个子空间。'],
  ['axler:dimension', 'axler:fundamental-theorem', '等式的四项都是维数；没有维数就写不出这条计数。'],
  ['axler:linear-map', 'axler:matrix-of-map', '矩阵是「线性映射在选定基下的样子」，主语是线性映射。'],
  ['axler:basis', 'axler:matrix-of-map', '矩阵的列是基向量的像的坐标，坐标又依赖 V 与 W 的基。'],
  ['axler:matrix-of-map', 'axler:rank-of-matrix', '矩阵的秩用列向量的张成维数定义，而「矩阵的列」这个概念来自矩阵表示。'],
  ['axler:span', 'axler:rank-of-matrix', '列秩是列向量的极大线性无关组大小，判据用的是「张成」与「无关」。'],
  ['axler:fundamental-theorem', 'axler:invertibility', '同维数时单射、满射、可逆三者等价的证明用的是 dim V = dim null T + dim range T。'],
  ['axler:matrix-of-map', 'axler:invertibility', '可逆的矩阵判据与「映射可逆」是通过矩阵表示互相翻译的。'],
  ['axler:matrix-of-map', 'axler:change-of-basis', '换基公式的两边都是矩阵表示，换的正是表示所依赖的那组基。'],
  ['axler:basis', 'axler:change-of-basis', '公式里的 A、B 就是两组基之间的换基矩阵。'],
  ['axler:subspace', 'axler:product-quotient', '商空间的元素是陪集 v + U，U 必须是子空间；积空间的构造也以子空间为边界。'],
  ['axler:linear-map', 'axler:product-quotient', '积空间与商空间上的运算按分量或按陪集定义，都要验证它们是线性的，用的还是线性映射的语言。'],
  ['axler:linear-map', 'axler:dual-space', "对偶空间的元素 V' = L(V, F) 就是取值为数的线性映射。"],
  ['axler:matrix-of-map', 'axler:dual-space', '对偶映射的矩阵是原矩阵的转置（在相应基下），这条对应关系要用矩阵表示来陈述。'],
  ['axler:dual-space', 'axler:dual-null-range', '零化子与对偶映射的零空间、值域都在对偶空间里定义。'],
  ['axler:null-range', 'axler:dual-null-range', '定理的两条等式把 null T、range T 与它们的零化子对应起来。'],
  ['axler:field', 'axler:zeros-of-polynomials', '多项式的系数取自域 F，在一点取值用的就是域上的加法与乘法。'],
  ['axler:complex-numbers', 'axler:zeros-of-polynomials', 'C[x] 是第一个被讨论的多项式环，代数基本定理讲的正是复系数多项式的零点。'],
  ['axler:zeros-of-polynomials', 'axler:polynomial-division', '带余除法是判定零点的工具：p 以 z 为零点当且仅当 x − z 整除 p，而「整除」要靠除法定义。'],
  ['axler:polynomial-division', 'axler:factorization-over-c', '唯一分解成一次因式用的是带余除法与零点判据。'],
  ['axler:polynomial-division', 'axler:factorization-over-r', '实系数多项式的分解同样从带余除法出发，再把复根成对合并。'],
  ['axler:factorization-over-c', 'axler:factorization-over-r', '实多项式的复根成共轭对出现，这条结论是把 C 上的分解搬到 R 上的那一步。'],
  ['axler:linear-map', 'axler:eigenvalue', '特征值与特征向量是算子的性质：陈述里 Tv = λv 的 T 是线性映射。'],
  ['axler:null-range', 'axler:eigenvalue', 'λ 是特征值等价于 null(T − λI) ≠ {0}，判别直接落在零空间上。'],
  ['axler:eigenvalue', 'axler:eigenvector-independence', '结论讲的就是不同特征值的特征向量之间的关系。'],
  ['axler:linear-independence', 'axler:eigenvector-independence', '证明的手法是把一组特征向量的线性组合化为零，判据用的是线性无关。'],
  ['axler:eigenvalue', 'axler:minimal-polynomial', '极小多项式的零点恰好是特征值，这条对应关系的主语就是特征值。'],
  ['axler:factorization-over-c', 'axler:minimal-polynomial', '极小多项式的次数有限且能分解，分解方式决定了算子能否对角化。'],
  ['axler:minimal-polynomial', 'axler:complex-eigenvalue', '复空间上必有特征值，是因为极小多项式在 C 上一定有一次因式。'],
  ['axler:factorization-over-r', 'axler:odd-real-eigenvalue', '奇数维情形的存在性来自奇次实多项式必有实根。'],
  ['axler:complex-eigenvalue', 'axler:upper-triangular', '上三角表示的存在性证明逐层用「限制在不变子空间上的算子仍有特征值」。'],
  ['axler:matrix-of-map', 'axler:upper-triangular', '上三角矩阵是矩阵表示的一种形状，陈述里必须指定基。'],
  ['axler:minimal-polynomial', 'axler:diagonalizable', '可对角化的判据是「极小多项式没有重根」，判据本身写在极小多项式上。'],
  ['axler:eigenvector-independence', 'axler:diagonalizable', '「有由特征向量组成的基」这一条等价说法，其可行性由特征向量的无关性保证。'],
  ['axler:upper-triangular', 'axler:gershgorin', '圆盘定理的证明把矩阵化成上三角（或直接用特征值的重数计数）。'],
  ['axler:diagonalizable', 'axler:commuting-operators', '同时化简的结论以「各自可对角化」为条件之一。'],
  ['axler:vector-space', 'axler:inner-product', '内积是定义在向量空间上的额外结构，公理里出现的仍是加法与数乘。'],
  ['axler:list-fn', 'axler:inner-product', '最熟悉的例子是 Fⁿ 上的标准内积，一般定义是它的公理化。'],
  ['axler:inner-product', 'axler:cauchy-schwarz', '不等式的两边分别是内积与由内积定义的范数。'],
  ['axler:inner-product', 'axler:orthonormal-list', '「正交」与「长度 1」都由内积定义。'],
  ['axler:linear-independence', 'axler:orthonormal-list', '规范正交列表一定线性无关，这条结论用无关性表述。'],
  ['axler:orthonormal-list', 'axler:gram-schmidt', '正交化的产物就是规范正交列表，定理的结论以它命名。'],
  ['axler:span', 'axler:gram-schmidt', '过程保持每一步的张成不变，这句话用到 span。'],
  ['axler:orthonormal-list', 'axler:riesz-representation', '表示定理的证明先在规范正交基上写出坐标，再拼回一般向量。'],
  ['axler:dual-space', 'axler:riesz-representation', "定理把 V 与对偶空间 V' 用内积配成同构，两端分别是向量与线性泛函。"],
  ['axler:gram-schmidt', 'axler:orthogonal-decomposition', '正交分解的构造用正交化把任意向量拆成 U 内与 U^⊥ 内的两部分。'],
  ['axler:subspace', 'axler:orthogonal-decomposition', 'U^⊥ 是与子空间 U 正交的全体向量，V = U ⊕ U^⊥ 用的是直和。'],
  ['axler:orthogonal-decomposition', 'axler:minimal-distance', '最小距离的解是正交投影，而正交投影的存在性由 V = U ⊕ U^⊥ 给出。'],
  ['axler:riesz-representation', 'axler:minimal-distance', '把极小化写成线性泛函的表示问题之后才能解出来，这一步用里斯表示定理。'],
  ['axler:inner-product', 'axler:adjoint', '伴随算子的定义式 ⟨Tv, w⟩ = ⟨v, T*w⟩ 整体建立在两个内积上。'],
  ['axler:riesz-representation', 'axler:adjoint', '伴随的存在唯一性由里斯表示定理给出（对每个 w 把 v ↦ ⟨Tv, w⟩ 表示成内积）。'],
  ['axler:adjoint', 'axler:self-adjoint-normal', '自伴与正规都是用伴随写出来的条件（T = T*、TT* = T*T）。'],
  ['axler:eigenvalue', 'axler:self-adjoint-normal', '「自伴算子的特征值都是实数」这条结论的主语是特征值。'],
  ['axler:self-adjoint-normal', 'axler:real-spectral', '实谱定理的陈述以「自伴」为前提，结论里的特征向量基还要正交。'],
  ['axler:diagonalizable', 'axler:real-spectral', '定理给出的是更强的对角化：不仅可对角，还能选到规范正交基。'],
  ['axler:self-adjoint-normal', 'axler:complex-spectral', '复谱定理把「有规范正交特征向量基」等价于「正规」，判别写在正规性上。'],
  ['axler:upper-triangular', 'axler:complex-spectral', '证明先把算子化成上三角，再用正规性迫使它对角。'],
  ['axler:self-adjoint-normal', 'axler:positive-operator', '正算子的定义以自伴为前提，再加上 ⟨Tv, v⟩ ≥ 0。'],
  ['axler:real-spectral', 'axler:positive-operator', '平方根与正分解的构造用自伴算子的规范正交特征基逐特征值开方。'],
  ['axler:orthonormal-list', 'axler:isometry-unitary', '等距的等价刻画之一是「把规范正交列表映成规范正交列表」。'],
  ['axler:adjoint', 'axler:isometry-unitary', '等距的判据写成 S*S = I，用伴随表述。'],
  ['axler:gram-schmidt', 'axler:qr-cholesky', 'QR 分解的存在性就是把格拉姆–施密特过程写成矩阵等式。'],
  ['axler:positive-operator', 'axler:qr-cholesky', 'Cholesky 分解要求矩阵正定，正定正是用正算子/二次型刻画的。'],
  ['axler:isometry-unitary', 'axler:qr-cholesky', '分解里的 Q 是酉矩阵，酉性是等距算子的可逆情形。'],
  ['axler:positive-operator', 'axler:svd', '奇异值是 T*T 的特征值的平方根，T*T 是正算子是整条构造的入口。'],
  ['axler:isometry-unitary', 'axler:svd', 'SVD 的两组规范正交基分别来自两个等距因子，酉算子的语言是它的外壳。'],
  ['axler:svd', 'axler:svd-consequences', '范数、低秩逼近、极分解与体积四条推论全部由 SVD 的形式直接读出。'],
  ['axler:minimal-distance', 'axler:svd-consequences', '最佳低秩逼近的证明用「到子空间的最小距离由正交投影给出」。'],
  ['axler:eigenvalue', 'axler:generalized-eigenvector', '广义特征向量是「(T − λI)^k 的零空间」，λ 仍是特征值。'],
  ['axler:upper-triangular', 'axler:generalized-eigenvector', '幂零算子在适当基下是严格上三角的，这一步把广义特征空间写成上三角形状。'],
  ['axler:generalized-eigenvector', 'axler:generalized-decomposition', '分解的每一块都是广义特征空间 G(λ, T)。'],
  ['axler:factorization-over-c', 'axler:generalized-decomposition', '特征值来自特征多项式在 C 上的分解；没有代数闭性就凑不出这些 λ。'],
  ['axler:generalized-decomposition', 'axler:multiplicity', 'dim G(λ, T) 与特征多项式里 (z − λ) 的重数是同一个数，这条对应关系定义在分解之上。'],
  ['axler:polynomial-division', 'axler:multiplicity', '「重数」这个概念本身来自多项式因式分解。'],
  ['axler:generalized-decomposition', 'axler:square-root', '平方根在每个广义特征空间上分别构造，再拼起来。'],
  ['axler:multiplicity', 'axler:square-root', '构造用的是「λI + 幂零」，幂零部分的规模由重数（即广义特征空间维数）决定。'],
  ['axler:generalized-decomposition', 'axler:jordan-form', '若尔当形的块按广义特征空间分组。'],
  ['axler:multiplicity', 'axler:jordan-form', '块的个数与大小由重数与幂零部分的零空间链决定。'],
  ['axler:matrix-of-map', 'axler:trace', '迹最初写成矩阵对角元之和，因此必须说明它与基的选取无关。'],
  ['axler:change-of-basis', 'axler:trace', '「与基无关」这条性质用的是基变换公式与 tr(AB) = tr(BA)。'],
  ['axler:multiplicity', 'axler:trace', '迹等于全部特征值之和，这条等式把迹与特征多项式的系数连起来。'],
  ['axler:vector-space', 'axler:bilinear-form', '双线性形的定义域是 V × V，两个变量各自线性，用的还是向量空间的运算。'],
  ['axler:linear-map', 'axler:bilinear-form', '「对每个变量分别线性」就是一个映射在固定另一个变量后是线性映射。'],
  ['axler:bilinear-form', 'axler:quadratic-form', '二次型通过对角化（极化恒等式）与唯一的对称双线性形对应。'],
  ['axler:bilinear-form', 'axler:alternating-multilinear', '交错多重线性形式是双线性形向多个变量的推广，交错性是额外的一条。'],
  ['axler:alternating-multilinear', 'axler:determinant', '行列式被定义为唯一的交错 n 重线性形式，「唯一」这句话是定理的核心。'],
  ['axler:matrix-of-map', 'axler:determinant', '矩阵的行列式与它表示的算子一致，因此要用矩阵表示来陈述 det(AB) = det(A)det(B)。'],
  ['axler:invertibility', 'axler:determinant', '「可逆 ⟺ 行列式非零」这条判据把行列式与可逆性接在一起。'],
  ['axler:bilinear-form', 'axler:tensor-product', '张量积把双线性映射化成线性映射，入口是双线性形。'],
  ['axler:inner-product', 'axler:tensor-product', '内积空间上的张量积带一个自然内积，这条结构建立在两个内积上。'],
  ['axler:product-quotient', 'axler:tensor-product', '张量积的构造用商空间把「双线性」的等式关系模掉，泛性质里出现的正是它。'],
];

export const axlerRelations = [
  ...prereqSpecs.map(([from, to, scope]) => relation(
    `rel-axler-pre-${from.replace('axler:', '')}-${to.replace('axler:', '')}`,
    'hardPrereq', from, to,
    { witness: { type: 'definitional-dependency', status: 'DEF', scope }, scope },
  )),
  /*
   * 与本站既有登记的接口：这几条不是「谁先谁后」，而是「同一个对象/同一个结论在本站别处也有登记」。
   * 判据与 `jiang.mjs` 的 crossDomain 相同：两端讲的是同一个数学对象，换个案例不该换一套名字。
   */
  relation('rel-axler-crossdomain-field', 'crossDomain', 'field:field', 'axler:field', {
    witness: { type: 'cross-domain-interface', status: 'DEF', scope: '两处讲的是同一个对象（域的公理）：`field` 案例从有序域与实数系那一侧引入，本案例从 C 与 R 的例子引入，公理逐条相同。' },
    scope: '同一对象在本站的两处登记；不表示两套路线必须互相经过。',
  }),
  relation('rel-axler-crossdomain-linear-bg', 'crossDomain', 'bg:linear:vector', 'axler:vector-space', {
    witness: { type: 'cross-domain-interface', status: 'DEF', scope: '背景节点「向量空间与线性映射」与本案例第 1 章的向量空间是同一批对象：声明学过前者，等于承认后者的公理层可用。' },
    scope: '背景接口；把它声明为背景后，第一程的起点可以整体前移。',
  }),
  relation('rel-axler-crossdomain-svd-jiang', 'crossDomain', 'jiang:polar-svd', 'axler:svd', {
    witness: { type: 'cross-domain-interface', status: 'REF', scope: '《简明高等代数》第七程的「奇异值分解」与本案例第 7 章的 SVD 是同一结论的两种讲法（一个从欧氏空间算子出发，一个从 T*T 的正算子出发）。正文都未撰写，这里只登记接口，不声称两处已逐条核对一致。' },
    scope: '同一结论的跨案例接口；不声称两边的条件与证明逐条等价。',
  }),
  relation('rel-axler-crossdomain-det-tensor', 'crossDomain', 'tensor:end-iso', 'axler:tensor-product', {
    witness: { type: 'cross-domain-interface', status: 'DEF', scope: '张量代数案例里的 V ⊗ V* ≅ End(V) 与本案例第 9 章的张量积讲同一个构造（本案例只登记泛性质与维数公式）。' },
    scope: '同一构造的跨案例接口。',
  }),
];

export const axlerEvidence = [
  ...spec.map((item) => evidence(
    `ev-axler-${item.slug}`,
    'reference',
    'REF',
    'not_run',
    `${item.title}：教材 ${item.chapter} ${item.section} 的对应内容`,
    {
      scope: '本节点目前只登记标题、所属小节与依赖关系，正文尚未撰写；教材表述未逐条核对。',
      nodes: [`axler:${item.slug}`],
      obligations: [
        '撰写节点正文（动机、形式、条件反例、回看提问）',
        '未编码为第 02 章 ND 证书（正文都还没有，更谈不上机器核验）',
        '逐条核对教材对应小节的表述（本案例的章节与页码取自 PDF 书签，不是 OCR；也未引用定理编号）',
      ],
      reference: source(item.chapter, item.section),
    },
  )),
  ...methodSpec.map((item) => evidence(
    `ev-axler-${item.id.split(':')[1]}`,
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

export const axlerSupport = [
  support('sup-axler-svd-route', 'axler:svd', 'route', 'known',
    { set: ['axler:positive-operator', 'axler:isometry-unitary'], minimal: true, evidence: ['ev-axler-svd'] }),
  support('sup-axler-jordan-route', 'axler:jordan-form', 'route', 'known',
    { set: ['axler:generalized-decomposition', 'axler:multiplicity'], minimal: true, evidence: ['ev-axler-jordan-form'] }),
  // 未登记支持记录时保留 Unknown；「没查」不写成空集。
  support('sup-axler-tensor-route', 'axler:tensor-product', 'route', 'unknown',
    { reason: '张量积的路线级输入支持尚未登记；未知不等于空支持。' }),
];

export const axlerClaims = spec
  .filter((item) => item.kind === 'claim')
  .map((item) => claimRecord(
    `claim-axler-${item.slug}`,
    `axler:${item.slug}`,
    item.predicate,
    [`ev-axler-${item.slug}`],
    'PROOF',
  ));

/** 话题聚合按教材九章分块（最后一块是方法节点）。 */
export const axlerAggregates = [
  {
    id: 'agg-axler-ladr', kind: 'topic', title: '《Linear Algebra Done Right》九程凝练路径',
    blocks: [
      ['axler:complex-numbers', 'axler:field', 'axler:list-fn', 'axler:vector-space', 'axler:subspace', 'axler:direct-sum'],
      ['axler:span', 'axler:linear-independence', 'axler:basis', 'axler:dimension', 'axler:subspace-dimension'],
      ['axler:linear-map', 'axler:null-range', 'axler:fundamental-theorem', 'axler:matrix-of-map', 'axler:rank-of-matrix',
        'axler:invertibility', 'axler:change-of-basis', 'axler:product-quotient', 'axler:dual-space', 'axler:dual-null-range'],
      ['axler:zeros-of-polynomials', 'axler:polynomial-division', 'axler:factorization-over-c', 'axler:factorization-over-r'],
      ['axler:eigenvalue', 'axler:eigenvector-independence', 'axler:minimal-polynomial', 'axler:complex-eigenvalue',
        'axler:odd-real-eigenvalue', 'axler:upper-triangular', 'axler:diagonalizable', 'axler:gershgorin', 'axler:commuting-operators'],
      ['axler:inner-product', 'axler:cauchy-schwarz', 'axler:orthonormal-list', 'axler:gram-schmidt',
        'axler:riesz-representation', 'axler:orthogonal-decomposition', 'axler:minimal-distance'],
      ['axler:adjoint', 'axler:self-adjoint-normal', 'axler:real-spectral', 'axler:complex-spectral', 'axler:positive-operator',
        'axler:isometry-unitary', 'axler:qr-cholesky', 'axler:svd', 'axler:svd-consequences'],
      ['axler:generalized-eigenvector', 'axler:generalized-decomposition', 'axler:multiplicity', 'axler:square-root',
        'axler:jordan-form', 'axler:trace'],
      ['axler:bilinear-form', 'axler:quadratic-form', 'axler:alternating-multilinear', 'axler:determinant', 'axler:tensor-product'],
      ['axler:method-gram-schmidt', 'axler:method-qr', 'axler:method-cholesky', 'axler:method-jordan'],
    ],
    note: '块按教材九章划分（最后一块是方法节点）；跨章依赖由行动契约与硬前置表达，块成员关系本身不构成必修链。',
  },
];

export const axler = {
  nodes: [...axlerNodes, ...axlerMethodNodes],
  actions: axlerActions,
  relations: axlerRelations,
  evidence: axlerEvidence,
  support: axlerSupport,
  claims: axlerClaims,
  patterns: [],
  aggregates: axlerAggregates,
};

/** 供接线与测试核对：本案例的规模。 */
export const axlerSummary = {
  conceptCount: spec.filter((item) => item.kind === 'concept').length,
  claimCount: spec.filter((item) => item.kind === 'claim').length,
  methodNodeCount: axlerMethodNodes.length,
  nodeCount: axler.nodes.length,
  actionCount: axlerActions.length,
  relationCount: axlerRelations.length,
  evidenceCount: axlerEvidence.length,
};
