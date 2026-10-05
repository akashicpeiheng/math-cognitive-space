/**
 * 路径规划页「范例路径」栏目的数据。
 *
 * 这里放的是**已经凝练好、并且在本站规划器里跑得通**的现成样本：
 * 每一程给出起点（要预先确认可用的背景节点）、目标（本章的里程碑）与建议事件界。
 * 卡片上的节点名、事件数一类数字都由本体与规划器现场核对，不写死文案里的猜测——
 * `tests/example-paths.test.mjs` 会按这里声明的 horizon 真跑一遍规划器。
 *
 * 第一批样本来自梁灿彬、周彬《微分几何入门与广义相对论》上册（第二版），
 * 科学出版社，2006（现代物理基础丛书 7，ISBN 978-7-03-016460-5）：把 442 页的十章
 * 凝练成 50 个里程碑节点，按教材的自然接缝分成七程。正文见
 * `data/cases/07-liang-dg.md`，节点与行动契约见 `data/cases/liang.mjs`。
 *
 * 约定：
 * - 每程的起点 = 基础背景 + **前面各程的全部里程碑**。这不是偷懒，而是分程学习的实际状态：
 *   走到第 n 程时，第 1…n−1 程的成果已经在手里了。这样每一程都能在事件界 ≤ 16 内走完。
 * - 目标节点全部落在「概念 / 断言 / 构造」上；方法节点与误区模式随案例一起登记，
 *   但它们标注的是「怎么算」与「边界」，不作为路线的终点。
 */

/** 上册第一程之前需要声明可用的两个共享背景。 */
export const LIANG_BASE_ENTRIES: string[] = ['bg:set:function', 'bg:linear:vector'];

export interface ExamplePath {
  id: string;
  /** 「第一程」这样的序数，用来在卡片上排次序。 */
  ordinal: string;
  title: string;
  /** 覆盖的教材章节。 */
  chapters: string;
  /** 教材印刷页码区间（依据教材目录页，已与出版社公布的目录对齐）。 */
  pages: string;
  /** 目标下拉框里显示的那一个目标；等于 goals[0]。 */
  goal: string;
  /** 本程的全部目标节点。 */
  goals: string[];
  /** 起点：需要预先确认可用的节点。 */
  entries: string[];
  /** 起点的来历，直接写在卡片上，不让人猜。 */
  entryNote: string;
  /** 建议事件界（写进规划表单的 h）。 */
  horizon: number;
  /** 实测最短事件数；由 tests/example-paths.test.mjs 守护。 */
  events: number;
  /** 特色简介：这一程的看点在哪里、最容易错在哪里。 */
  feature: string;
  /** 本程的里程碑标题（人工写在数据里，避免卡片依赖本体已加载）。 */
  highlights: string[];
}

export interface ExampleSet {
  id: string;
  title: string;
  /** 出处，可核验。 */
  source: string;
  /** 栏目导语。 */
  lead: string;
  /** 边界说明：这些样本能做什么、不能做什么。 */
  note: string;
  paths: ExamplePath[];
}

interface StageSpec {
  id: string;
  ordinal: string;
  title: string;
  chapters: string;
  pages: string;
  goals: string[];
  horizon: number;
  events: number;
  feature: string;
  highlights: string[];
}

/**
 * 七程的原始定义。
 *
 * 目标顺序不是教材顺序，而是「先给这一程的落点」：第一个目标是目标下拉框里显示的那一个。
 * 教材顺序写在 highlights 与 chapters 里，不靠数组顺序表达。
 */
const LIANG_STAGES: StageSpec[] = [
  {
    id: 'liang-v1-stage-1',
    ordinal: '第一程',
    title: '几何底座：从开集公理到抽象指标',
    chapters: '第1章 拓扑空间简介、第2章 流形和张量场',
    pages: '印刷 1–54 页',
    goals: [
      'liang:abstract-index', 'liang:continuous-map', 'liang:manifold', 'liang:tangent-vector',
      'liang:vector-field', 'liang:dual-vector-field', 'liang:tensor-field', 'liang:metric-tensor',
      'liang:topological-space',
    ],
    horizon: 12,
    events: 9,
    feature: '上册的起点最低：从集合与映射出发，先只用开集公理把「邻近」说清楚，再把坐标一片片贴成流形，最后在每一点造出切空间。'
      + '这一程的看点是两个容易被直观带偏的地方：切矢量是曲线等价类而不是箭头；度规是额外附加的结构，不是流形自带的。'
      + '走完它，后面所有「局部」的话才有落脚点。',
    highlights: ['拓扑空间', '连续映射与同胚', '微分流形', '切矢量', '矢量场', '对偶矢量场', '张量场与缩并', '度规张量场', '抽象指标记号'],
  },
  {
    id: 'liang-v1-stage-2',
    ordinal: '第二程',
    title: '联络、测地线与黎曼曲率',
    chapters: '第3章 黎曼（内禀）曲率张量',
    pages: '印刷 55–85 页',
    goals: [
      'liang:ricci-einstein', 'liang:derivative-operator', 'liang:christoffel',
      'liang:parallel-transport', 'liang:geodesic', 'liang:riemann-tensor',
      'liang:intrinsic-extrinsic-curvature',
    ],
    horizon: 9,
    events: 7,
    feature: '有了度规还不够：不同点的矢量属于不同的空间，必须补一个导数算符才能比较。'
      + '这一程是一串连锁反应——「与度规适配 + 无挠」唯一确定克氏符；克氏符不是张量（极坐标下平直空间也有非零分量）；'
      + '曲率则来自平移对曲线的依赖。测地线在这里被定义为「切矢量沿自身平移」，而不是「最短线」。',
    highlights: ['导数算符', '与度规适配的导数算符与克氏符', '沿曲线的平移', '测地线', '黎曼曲率张量', '里奇张量与爱因斯坦张量', '内禀曲率与外曲率'],
  },
  {
    id: 'liang-v1-stage-3',
    ordinal: '第三程',
    title: '对称性与积分：李导数、Killing 场与 Stokes 定理',
    chapters: '第4章 李导数、Killing场和超曲面、第5章 微分形式及其积分',
    pages: '印刷 86–131 页',
    goals: [
      'liang:stokes-theorem', 'liang:pushforward-pullback', 'liang:lie-derivative', 'liang:killing-field',
      'liang:hypersurface', 'liang:differential-form', 'liang:exterior-derivative',
      'liang:volume-element', 'liang:gauss-theorem',
    ],
    horizon: 11,
    events: 9,
    feature: '这一程换了工具。要谈时空的对称性，需要一个不依赖联络的导数，于是有了李导数；把「度规不变」写下来就是 Killing 方程。'
      + '另一半是把积分讲到底：微分形式的全反称性让符号自动正确，Stokes 定理把 Newton–Leibniz、Green、Gauss 收成一条。'
      + '这是上册前五章的收束点，也是后面相对论部分的全部语言。',
    highlights: ['推前与拉回', '李导数', 'Killing 矢量场', '超曲面与法矢量', '微分形式与外积', '外微分', '体元与积分', 'Stokes 定理', 'Gauss 定理与对偶形式'],
  },
  {
    id: 'liang-v1-stage-4',
    ordinal: '第四程',
    title: '狭义相对论：把时间与空间放进同一个度规',
    chapters: '第6章 狭义相对论',
    pages: '印刷 132–187 页',
    goals: [
      'liang:electromagnetic-tensor', 'liang:minkowski-spacetime', 'liang:inertial-observer',
      'liang:proper-time', 'liang:kinematic-effects', 'liang:four-momentum',
      'liang:energy-momentum-tensor', 'liang:four-potential',
    ],
    horizon: 10,
    events: 8,
    feature: '前五章造出的工具第一次大规模派上用场：把度规换成洛伦兹号差，时间与空间就进入同一个几何对象。'
      + '这一程的看点是两点：三个「佯谬」最终都还原成一句话——不同世界线的固有时不同；电磁场写成一个反对称张量之后，麦氏方程变成两个几何方程，电流守恒还是被推出来的，不是假设。',
    highlights: ['闵氏时空', '惯性观者与惯性系', '固有时与坐标时', '尺缩、钟慢与孪子效应', '4 维动量与质点动力学', '能动张量与理想流体', '电磁场张量与麦氏方程', '电磁 4 势与光波多普勒效应'],
  },
  {
    id: 'liang-v1-stage-5',
    ordinal: '第五程',
    title: '广义相对论基础：引力不再是力',
    chapters: '第7章 广义相对论基础',
    pages: '印刷 188–244 页',
    goals: [
      'liang:einstein-equation', 'liang:gravity-as-geometry', 'liang:equivalence-principle',
      'liang:fermi-transport', 'liang:tidal-deviation', 'liang:linearized-gravity',
    ],
    horizon: 8,
    events: 6,
    feature: '全书在这里转折。看点是两条互不替代的线索：等效原理说「局部可以把引力消掉」（黎曼法坐标让 Γ 在一点为零），'
      + '潮汐效应说「曲率消不掉」（测地偏离方程）；爱因斯坦场方程正是把消不掉的那部分与物质联系起来。'
      + '线性近似负责收尾：它既接回牛顿引力，又立刻给出以光速传播的引力波。',
    highlights: ['引力与时空几何', '等效原理与局部惯性系', '费米移动与无自转观者', '潮汐力与测地偏离方程', '爱因斯坦场方程', '线性近似、牛顿极限与引力辐射'],
  },
  {
    id: 'liang-v1-stage-6',
    ordinal: '第六程',
    title: '场方程的解与黑洞：从施瓦西度规到事件视界',
    chapters: '第8章 爱因斯坦方程的求解、第9章 施瓦西时空',
    pages: '印刷 245–357 页',
    goals: [
      'liang:schwarzschild-black-hole', 'liang:static-stationary', 'liang:schwarzschild-solution',
      'liang:birkhoff-theorem', 'liang:reissner-nordstrom', 'liang:np-formalism',
      'liang:schwarzschild-geodesics', 'liang:classical-tests', 'liang:stellar-interior',
      'liang:kruskal-extension',
    ],
    horizon: 12,
    events: 10,
    feature: '解场方程之前先减元：稳态、静态、球对称都用 Killing 场写清楚，不能靠「看上去像球」。'
      + '这一程从一个度规出发走完全程——施瓦西解 → 三项经典实验 → 恒星内部解与质量上限 → Kruskal 延拓与黑洞。'
      + '分水岭是坐标奇点与真奇点的区别：r = r_s 处度规分量发散但曲率有限，r = 0 处才真的坏了。',
    highlights: ['稳态、静态与球对称时空', '施瓦西真空解', 'Birkhoff 定理', 'Reissner–Nordström 解', 'Newman–Penrose 形式', '施瓦西时空的测地线', '经典实验验证', '恒星内部解与演化', 'Kruskal 延拓', '引力坍缩与施瓦西黑洞'],
  },
  {
    id: 'liang-v1-stage-7',
    ordinal: '第七程',
    title: '宇宙论：把场方程用到最大尺度',
    chapters: '第10章 宇宙论',
    pages: '印刷 358–417 页',
    goals: [
      'liang:new-standard-cosmology', 'liang:cosmological-principle', 'liang:rw-metric',
      'liang:hubble-redshift', 'liang:scale-factor', 'liang:thermal-history', 'liang:inflation',
    ],
    horizon: 9,
    events: 7,
    feature: '最后一程把场方程用到最大尺度：宇宙学原理先把度规钉成 Robertson–Walker 形式，只剩下一个尺度因子 a(t)，'
      + '哈勃定律与宇宙学红移随之成为几何结论，而不是运动学类比。看点在于分清哪些是模型的结论、哪些是超出广义相对论的输入——'
      + '热历史依赖粒子物理模型，暗物质与暗能量的身份仍是开放问题。',
    highlights: ['宇宙学原理与空间几何', 'Robertson–Walker 度规', '哈勃定律与宇宙学红移', '尺度因子演化与宇宙学常数', '宇宙热历史与粒子视界', '暴涨模型', '暗能量与新标准宇宙模型'],
  },
];

/**
 * 累进地算出每一程的起点：基础背景 + 前面各程的全部里程碑。
 *
 * 这样写而不是逐程手抄一份入口清单，是为了让「起点 = 前几程的成果」这件事**不可能写错**：
 * 改动任何一程的目标，后面各程的起点会自动跟着变。每套样本各跑一次。
 */
function buildPaths(baseEntries: string[], stages: StageSpec[], firstEntryNote: string): ExamplePath[] {
  let carried: string[] = [...baseEntries];
  const built: ExamplePath[] = [];
  let index = 0;
  for (const stage of stages) {
    const entries = [...carried];
    built.push({
      id: stage.id,
      ordinal: stage.ordinal,
      title: stage.title,
      chapters: stage.chapters,
      pages: stage.pages,
      goal: stage.goals[0],
      goals: [...stage.goals],
      entries,
      entryNote: index === 0
        ? firstEntryNote
        : `起点是基础背景加上前 ${index} 程的全部里程碑，共 ${entries.length} 项：走到这一程时它们已经在手里了。`,
      horizon: stage.horizon,
      events: stage.events,
      feature: stage.feature,
      highlights: stage.highlights,
    });
    carried = [...carried, ...stage.goals];
    index += 1;
  }
  return built;
}

/** Rudin 案例的基础背景：集合与函数、量词、有限维线性代数。 */
export const RUDIN_BASE_ENTRIES: string[] = ['bg:set:function', 'bg:logic:quantifier', 'bg:linear:vector'];

/**
 * Rudin《数学分析原理》第三版的七程。
 *
 * 目标顺序不是教材顺序，而是「先给这一程的落点」：第一个目标是目标下拉框里显示的那一个。
 * 页码来自对扫描件目录页的 OCR（见 data/cases/rudin.mjs 的文件头）。
 */
const RUDIN_STAGES: StageSpec[] = [
  {
    id: 'rudin-pma-stage-1',
    ordinal: '第一程',
    title: '实数系统与基础拓扑',
    chapters: '第1章 实数系与复数系、第2章 基础拓扑',
    pages: '印刷 3–46 页',
    goals: [
      'rudin:least-upper-bound', 'rudin:ordered-field', 'rudin:extended-real', 'rudin:complex-field',
      'rudin:euclidean-space', 'rudin:countable-set', 'rudin:metric-space', 'rudin:compact-set',
      'rudin:perfect-set', 'rudin:connected-set',
    ],
    horizon: 13,
    events: 10,
    feature: 'Rudin 的起点比多数教材都要「往回退一步」：不假设实数已经会了，而是先用域公理加序公理把它造出来，'
      + '再把「最小上界性」当作实数区别于有理数的那一条。第二程之前必须先把这一步站稳——'
      + '后面几乎每条定理的证明都以「取上确界」收尾。接着是点集拓扑：可数性、度量空间、紧致性、连通性，'
      + '这四个概念会在后面每一章里反复回来。',
    highlights: ['有序域', '实数域与最小上界性', '扩充实数系', '复数域', '欧氏空间 R^k', '可数与不可数集', '度量空间', '紧致集与 Heine–Borel 定理', '完全集与 Cantor 集', '连通集'],
  },
  {
    id: 'rudin-pma-stage-2',
    ordinal: '第二程',
    title: '数值序列与级数',
    chapters: '第3章 数值序列与级数',
    pages: '印刷 47–82 页',
    goals: [
      'rudin:absolute-convergence', 'rudin:convergent-sequence', 'rudin:bolzano-weierstrass',
      'rudin:cauchy-sequence', 'rudin:limit-superior', 'rudin:series-convergence', 'rudin:power-series',
    ],
    horizon: 10,
    events: 7,
    feature: '这一程把第一程的拓扑概念全部翻译成 ε–N 语言，并给出整本书最常用的两件工具：完备性与上极限。'
      + '看点在于「收敛」的两种刻画如何分工——Cauchy 判据不需要预先知道极限，而上极限让「不收敛」也有话可说。'
      + '级数部分的分水岭是绝对收敛：只有它允许重排，条件收敛级数可以被重排成任意指定的和。',
    highlights: ['收敛序列与子序列', 'Bolzano–Weierstrass 定理', 'Cauchy 序列与完备性', '上极限与下极限', '级数及其收敛判据', '幂级数', '绝对收敛与重排'],
  },
  {
    id: 'rudin-pma-stage-3',
    ordinal: '第三程',
    title: '连续与微分',
    chapters: '第4章 连续性、第5章 微分',
    pages: '印刷 83–119 页',
    goals: [
      'rudin:mean-value-theorem', 'rudin:function-limit', 'rudin:continuous-function',
      'rudin:continuity-compactness', 'rudin:continuity-connectedness', 'rudin:derivative',
      'rudin:lhospital-rule', 'rudin:taylor-theorem', 'rudin:vector-derivative',
    ],
    horizon: 12,
    events: 9,
    feature: '连续性的两个「大定理」都是第一程拓扑的直接推论：紧致集上的连续函数取到极值且一致连续，'
      + '连通集上的连续函数取到中间值。微分部分则给出这本书里最实用的一条——中值定理，'
      + 'L’Hospital 法则与 Taylor 定理都是它的推论。看点是向量值函数那一节：中值定理在那里**失效**，'
      + '必须换成积分形式的不等式，这是「一维直觉不能直接搬」的标准例子。',
    highlights: ['函数的极限', '连续函数', '连续性与紧致性', '连续性与连通性（介值定理）', '导数', '中值定理', 'L’Hospital 法则', 'Taylor 定理', '向量值函数的微分'],
  },
  {
    id: 'rudin-pma-stage-4',
    ordinal: '第四程',
    title: 'Riemann–Stieltjes 积分',
    chapters: '第6章 Riemann–Stieltjes 积分',
    pages: '印刷 120–142 页',
    goals: [
      'rudin:fundamental-theorem', 'rudin:riemann-stieltjes', 'rudin:integral-properties',
      'rudin:rectifiable-curve',
    ],
    horizon: 7,
    events: 4,
    feature: '用 Stieltjes 而不是 Riemann：把「对 x 积分」换成「对单调增函数 α 积分」几乎不增加难度，'
      + '却让求和、级数与积分能用同一套语言写下来。看点是积分存在的判据（上积分等于下积分）'
      + '与微积分基本定理的两半：先由 f 造出连续函数 F，再问 F 什么时候可导、导数是不是 f。',
    highlights: ['Riemann–Stieltjes 积分与存在性', '积分的性质', '微积分基本定理', '可求长曲线'],
  },
  {
    id: 'rudin-pma-stage-5',
    ordinal: '第五程',
    title: '函数序列与特殊函数',
    chapters: '第7章 函数序列与函数级数、第8章 若干特殊函数',
    pages: '印刷 143–203 页',
    goals: [
      'rudin:stone-weierstrass', 'rudin:uniform-convergence', 'rudin:uniform-convergence-properties',
      'rudin:equicontinuous', 'rudin:exponential-logarithm', 'rudin:trigonometric-functions',
      'rudin:algebraic-completeness', 'rudin:fourier-series', 'rudin:gamma-function',
    ],
    horizon: 12,
    events: 9,
    feature: '「极限能不能换序」是这一程的唯一主题：连续、积分、微分三种运算在什么条件下可以与极限交换。'
      + '答案是一致收敛，而一致收敛本身在紧致集上又有等度连续这一条实用判据。'
      + '后半程是用这套工具把初等函数重新造一遍——指数、对数、三角函数都不再靠几何直观，'
      + '而是由幂级数定义并逐条验证性质。这是「先有分析、后有函数」的写法。',
    highlights: ['一致收敛', '一致收敛与连续、积分、微分', '等度连续族', 'Stone–Weierstrass 定理', '指数函数与对数函数', '三角函数', '复数域的代数完备性', 'Fourier 级数', 'Γ 函数'],
  },
  {
    id: 'rudin-pma-stage-6',
    ordinal: '第六程',
    title: '多元函数',
    chapters: '第9章 多元函数',
    pages: '印刷 204–244 页',
    goals: [
      'rudin:rank-theorem', 'rudin:linear-transformation', 'rudin:several-variable-derivative',
      'rudin:contraction-principle', 'rudin:inverse-function-theorem', 'rudin:implicit-function-theorem',
    ],
    horizon: 9,
    events: 6,
    feature: '多元微分的核心转移：导数不再是数，而是在一点处**逼近 f 的那个线性映射**。'
      + '看点是一条完整的推演链——压缩映射原理给出唯一不动点，反函数定理是它在线性化上的应用，'
      + '隐函数定理又是反函数定理的改写，秩定理则说明「秩恒定」时映射局部就是投影。'
      + '偏导数存在在这里**不蕴含**可导，这是最常被一维直觉误导的地方。',
    highlights: ['线性变换与算子范数', '多元函数的导数', '压缩映射原理', '反函数定理', '隐函数定理', '秩定理'],
  },
  {
    id: 'rudin-pma-stage-7',
    ordinal: '第七程',
    title: '微分形式与 Lebesgue 理论',
    chapters: '第10章 微分形式的积分、第11章 Lebesgue 理论',
    pages: '印刷 245–334 页',
    goals: [
      'rudin:l2-space', 'rudin:primitive-mapping', 'rudin:differential-form', 'rudin:simplex-chain',
      'rudin:stokes-theorem', 'rudin:closed-exact-form', 'rudin:set-function',
      'rudin:lebesgue-measure', 'rudin:measurable-function', 'rudin:lebesgue-integral',
    ],
    horizon: 13,
    events: 10,
    feature: '最后两章各收一条线。第 10 章把 Green、Gauss、经典 Stokes 与微积分基本定理收成一条 ∫_Γ dω = ∫_{∂Γ} ω，'
      + '为此必须先有链与边界算子（∂² = 0）这套语言；闭形式与恰当形式的差别随后成为区域拓扑的问题。'
      + '第 11 章换掉积分本身：从区间长度出发构造测度，再按简单函数逼近定义积分，'
      + 'Riemann 可积的函数仍然可积且值相同，但控制收敛定理让人终于可以把极限搬进积分号。',
    highlights: ['本原映射与单位分解', '微分形式', '单形与链', 'Stokes 定理', '闭形式与恰当形式', '集合函数', 'Lebesgue 测度的构造', '可测函数', 'Lebesgue 积分', 'L² 空间'],
  },
];

export const EXAMPLE_SETS: ExampleSet[] = [
  {
    id: 'liang-volume-1',
    title: '梁灿彬《微分几何入门与广义相对论》上册 · 凝练路径',
    source: '梁灿彬、周彬《微分几何入门与广义相对论》上册（第二版），科学出版社，2006，现代物理基础丛书 7，ISBN 978-7-03-016460-5（xi + 442 页，共 10 章）。',
    lead: '把 442 页的十章凝练成 56 个里程碑节点，按教材的自然接缝分成七程：前五章是微分几何入门，第 6 章转向狭义相对论，第 7–10 章是广义相对论。'
      + '每一程都能在本页的规划器里当场跑出路线；卡片上的事件数是实测值，不是估算。',
    note: '样本只覆盖上册，且是**凝练**而非全量：原书 §1.3、§5.7、§8.5–§8.8 等标为选读的小节只保留了一个节点或干脆未列。'
      + '本站的节点正文是凝练笔记，不是教材原文的替代，也没有转录教材中的完整证明——证据登记为「引用教材」（REF），未编码为机器证书。',
    paths: buildPaths(LIANG_BASE_ENTRIES, LIANG_STAGES, '起点是两个共享背景节点（它们没有任何行动能产出，只能由学习者先确认）。'),
  },
  {
    id: 'rudin-pma',
    title: 'Rudin《数学分析原理》第三版 · 凝练路径',
    source: 'Walter Rudin, Principles of Mathematical Analysis, 3rd ed., McGraw-Hill（本机扫描件：reference/paths/数学分析原理 英文版·原书第3版·典藏版.pdf，355 页；章节与页码取自扫描件目录页的 OCR）。',
    lead: '把 11 章凝练成 55 个里程碑节点，分成七程：第 1–2 章立实数与拓扑，第 3 章序列与级数，'
      + '第 4–5 章连续与微分，第 6 章积分，第 7–8 章函数序列与特殊函数，第 9 章多元函数，第 10–11 章微分形式与 Lebesgue 理论。',
    note: '**这套样本的节点只挂了名字，正文是空的。** 按本轮要求，54 个概念/断言节点与 2 个方法节点只登记了'
      + '标题、所属小节/页码与依赖关系，`contentRef: false`——点进节点页会如实显示「没有正文」，而不是编一段填充。'
      + '因此它现在能用来看**结构**：谁先谁后、哪一步依赖哪一步；但还不能用来学内容。'
      + '证据一律登记为「引用教材」（REF），`checkStatus: not_run`，未逐条核对教材表述。',
    paths: buildPaths(RUDIN_BASE_ENTRIES, RUDIN_STAGES, '起点是三个共享背景节点（集合与函数、量词、有限维线性代数；它们没有任何行动能产出，只能由学习者先确认）。'),
  },
];
