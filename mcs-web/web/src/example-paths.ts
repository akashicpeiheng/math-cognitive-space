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
 * 起点说明的**中文**续程模板：第 n 程的起点是基础背景 + 前 n−1 程的全部里程碑。
 *
 * 抽成常量而不是写在内联处，是为了让英文版能换一条模板（中英词序不同），
 * 而中文这条**逐字**保持原样。
 */
const ZH_ENTRY_CONTINUATION = (index: number, count: number): string => (
  `起点是基础背景加上前 ${index} 程的全部里程碑，共 ${count} 项：走到这一程时它们已经在手里了。`
);

/**
 * 累进地算出每一程的起点：基础背景 + 前面各程的全部里程碑。
 *
 * 这样写而不是逐程手抄一份入口清单，是为了让「起点 = 前几程的成果」这件事**不可能写错**：
 * 改动任何一程的目标，后面各程的起点会自动跟着变。每套样本各跑一次。
 *
 * `continuation` 只换「续程起点」那句话的写法（英文用另一条模板）；
 * 不传时走 `ZH_ENTRY_CONTINUATION`，中文输出逐字不变。
 */
function buildPaths(
  baseEntries: string[],
  stages: StageSpec[],
  firstEntryNote: string,
  continuation: (index: number, count: number) => string = ZH_ENTRY_CONTINUATION,
): ExamplePath[] {
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
      entryNote: index === 0 ? firstEntryNote : continuation(index, entries.length),
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

/* ======================================================================
 * 英文版（2026-10 中英双语）
 *
 * **只有文字是英文**：`id` / `horizon` / `events` / `goals` / `entries` /
 * 每套样本的 `paths` 条数全部与中文版逐字相同——`tests/example-paths.test.mjs`
 * 会按 `horizon` 真跑规划器核对「实测最短 N 个事件」，数字因翻译改动就是造假。
 *
 * 出处（`source`）保留原书信息：梁书是中文出版物，引文按原文给出（ISBN 可核）；
 * Rudin 的英文原版书名与本机扫描件路径同样原样保留，只把中文注解译出。
 * ==================================================================== */

/** 英文的续程起点模板：中英词序不同，因此另给一条，而不是逐程手写。 */
const EN_ENTRY_CONTINUATION = (index: number, count: number): string => (
  `Starts from the shared background plus every milestone of the previous ${index} stage${index > 1 ? 's' : ''}, ${count} items in all: by the time you reach this stage they are already in hand.`
);

const LIANG_STAGES_EN: StageSpec[] = [
  {
    id: 'liang-v1-stage-1',
    ordinal: 'Stage 1',
    title: 'Geometric foundations: from the open-set axioms to abstract indices',
    chapters: 'Ch. 1 A brief introduction to topological spaces; Ch. 2 Manifolds and tensor fields',
    pages: 'pp. 1–54 (print)',
    goals: [
      'liang:abstract-index', 'liang:continuous-map', 'liang:manifold', 'liang:tangent-vector',
      'liang:vector-field', 'liang:dual-vector-field', 'liang:tensor-field', 'liang:metric-tensor',
      'liang:topological-space',
    ],
    horizon: 12,
    events: 9,
    feature: 'Volume 1 starts at the lowest rung: sets and maps first, then the open-set axioms alone to make “nearness” precise, then coordinate patches glued into a manifold, and finally a tangent space built at each point. '
      + 'Two things in this stage are easy to get wrong by intuition: a tangent vector is an equivalence class of curves, not an arrow; and a metric is extra structure attached on top, not something a manifold comes with. '
      + 'Walk it once, and every later sentence about “locally” has somewhere to stand.',
    highlights: ['Topological space', 'Continuous maps and homeomorphism', 'Differentiable manifold', 'Tangent vector', 'Vector field', 'Dual vector field', 'Tensor fields and contraction', 'Metric tensor field', 'Abstract index notation'],
  },
  {
    id: 'liang-v1-stage-2',
    ordinal: 'Stage 2',
    title: 'Connection, geodesics and Riemann curvature',
    chapters: 'Ch. 3 The Riemann (intrinsic) curvature tensor',
    pages: 'pp. 55–85 (print)',
    goals: [
      'liang:ricci-einstein', 'liang:derivative-operator', 'liang:christoffel',
      'liang:parallel-transport', 'liang:geodesic', 'liang:riemann-tensor',
      'liang:intrinsic-extrinsic-curvature',
    ],
    horizon: 9,
    events: 7,
    feature: 'A metric is not enough: vectors at different points live in different spaces, so a derivative operator has to be added before they can be compared. '
      + 'This stage is one chain reaction — “compatible with the metric and torsion-free” fixes the Christoffel symbols uniquely; the Christoffel symbols are not a tensor (flat space in polar coordinates has non-zero components); '
      + 'and curvature comes from the dependence of parallel transport on the curve. A geodesic is defined here as “a curve whose tangent vector is parallel-transported along itself”, not as “the shortest line”.',
    highlights: ['Derivative operator', 'Metric-compatible derivative operator and Christoffel symbols', 'Parallel transport along a curve', 'Geodesic', 'Riemann curvature tensor', 'Ricci tensor and Einstein tensor', 'Intrinsic and extrinsic curvature'],
  },
  {
    id: 'liang-v1-stage-3',
    ordinal: 'Stage 3',
    title: 'Symmetry and integration: Lie derivatives, Killing fields and Stokes’ theorem',
    chapters: 'Ch. 4 Lie derivatives, Killing fields and hypersurfaces; Ch. 5 Differential forms and their integrals',
    pages: 'pp. 86–131 (print)',
    goals: [
      'liang:stokes-theorem', 'liang:pushforward-pullback', 'liang:lie-derivative', 'liang:killing-field',
      'liang:hypersurface', 'liang:differential-form', 'liang:exterior-derivative',
      'liang:volume-element', 'liang:gauss-theorem',
    ],
    horizon: 11,
    events: 9,
    feature: 'This stage changes tools. Talking about the symmetry of spacetime needs a derivative that does not depend on a connection, and that is the Lie derivative; writing “the metric does not change” down gives the Killing equation. '
      + 'The other half takes integration all the way: the total antisymmetry of differential forms makes the signs come out right by themselves, and Stokes’ theorem collects Newton–Leibniz, Green and Gauss into one statement. '
      + 'This is where the first five chapters close, and it is also the whole language of the relativity chapters that follow.',
    highlights: ['Pushforward and pullback', 'Lie derivative', 'Killing vector field', 'Hypersurfaces and normal vectors', 'Differential forms and the wedge product', 'Exterior derivative', 'Volume element and integration', 'Stokes’ theorem', 'Gauss’ theorem and the dual form'],
  },
  {
    id: 'liang-v1-stage-4',
    ordinal: 'Stage 4',
    title: 'Special relativity: time and space in one metric',
    chapters: 'Ch. 6 Special relativity',
    pages: 'pp. 132–187 (print)',
    goals: [
      'liang:electromagnetic-tensor', 'liang:minkowski-spacetime', 'liang:inertial-observer',
      'liang:proper-time', 'liang:kinematic-effects', 'liang:four-momentum',
      'liang:energy-momentum-tensor', 'liang:four-potential',
    ],
    horizon: 10,
    events: 8,
    feature: 'The tools built in the first five chapters are used at scale for the first time: change the metric to the Lorentzian signature and time and space enter one geometric object. '
      + 'Two things to watch here: the three “paradoxes” all come down to one sentence — different worldlines have different proper times; and once the electromagnetic field is written as an antisymmetric tensor, Maxwell’s equations become two geometric equations, with charge conservation derived rather than assumed.',
    highlights: ['Minkowski spacetime', 'Inertial observers and inertial frames', 'Proper time and coordinate time', 'Length contraction, time dilation and the twin effect', 'Four-momentum and particle dynamics', 'Energy–momentum tensor and perfect fluids', 'Electromagnetic field tensor and Maxwell’s equations', 'Electromagnetic four-potential and the Doppler effect for light'],
  },
  {
    id: 'liang-v1-stage-5',
    ordinal: 'Stage 5',
    title: 'Foundations of general relativity: gravity is no longer a force',
    chapters: 'Ch. 7 Foundations of general relativity',
    pages: 'pp. 188–244 (print)',
    goals: [
      'liang:einstein-equation', 'liang:gravity-as-geometry', 'liang:equivalence-principle',
      'liang:fermi-transport', 'liang:tidal-deviation', 'liang:linearized-gravity',
    ],
    horizon: 8,
    events: 6,
    feature: 'The book turns here. Two lines that do not replace each other: the equivalence principle says gravity can be removed locally (Riemann normal coordinates make Γ vanish at a point), '
      + 'while the tidal effect says curvature cannot be removed (the geodesic deviation equation); the Einstein field equation is exactly what ties the part that cannot be removed to matter. '
      + 'The linear approximation closes the stage: it recovers Newtonian gravity and immediately yields gravitational waves travelling at the speed of light.',
    highlights: ['Gravity and spacetime geometry', 'Equivalence principle and local inertial frames', 'Fermi transport and non-rotating observers', 'Tidal forces and the geodesic deviation equation', 'Einstein field equation', 'Linear approximation, Newtonian limit and gravitational radiation'],
  },
  {
    id: 'liang-v1-stage-6',
    ordinal: 'Stage 6',
    title: 'Solutions and black holes: from the Schwarzschild metric to the event horizon',
    chapters: 'Ch. 8 Solving the Einstein equations; Ch. 9 Schwarzschild spacetime',
    pages: 'pp. 245–357 (print)',
    goals: [
      'liang:schwarzschild-black-hole', 'liang:static-stationary', 'liang:schwarzschild-solution',
      'liang:birkhoff-theorem', 'liang:reissner-nordstrom', 'liang:np-formalism',
      'liang:schwarzschild-geodesics', 'liang:classical-tests', 'liang:stellar-interior',
      'liang:kruskal-extension',
    ],
    horizon: 12,
    events: 10,
    feature: 'Before solving the field equations, cut the variables down: stationarity, staticity and spherical symmetry are all written with Killing fields, not with “it looks like a sphere”. '
      + 'This stage runs all the way from one metric — the Schwarzschild solution → the three classical tests → interior solutions and the mass limit → the Kruskal extension and black holes. '
      + 'The watershed is the difference between a coordinate singularity and a real one: at r = r_s the metric components diverge while the curvature stays finite; only at r = 0 does something genuinely break.',
    highlights: ['Stationary, static and spherically symmetric spacetimes', 'Schwarzschild vacuum solution', 'Birkhoff’s theorem', 'Reissner–Nordström solution', 'Newman–Penrose formalism', 'Geodesics in Schwarzschild spacetime', 'Classical tests', 'Stellar interior solutions and evolution', 'Kruskal extension', 'Gravitational collapse and the Schwarzschild black hole'],
  },
  {
    id: 'liang-v1-stage-7',
    ordinal: 'Stage 7',
    title: 'Cosmology: the field equations at the largest scale',
    chapters: 'Ch. 10 Cosmology',
    pages: 'pp. 358–417 (print)',
    goals: [
      'liang:new-standard-cosmology', 'liang:cosmological-principle', 'liang:rw-metric',
      'liang:hubble-redshift', 'liang:scale-factor', 'liang:thermal-history', 'liang:inflation',
    ],
    horizon: 9,
    events: 7,
    feature: 'The last stage applies the field equations at the largest scale: the cosmological principle first pins the metric to the Robertson–Walker form, leaving only a scale factor a(t), '
      + 'and Hubble’s law with cosmological redshift then become geometric conclusions rather than kinematic analogies. What matters is telling apart what the model concludes from what is put in beyond general relativity — '
      + 'the thermal history depends on a particle-physics model, and the identity of dark matter and dark energy is still an open question.',
    highlights: ['Cosmological principle and spatial geometry', 'Robertson–Walker metric', 'Hubble’s law and cosmological redshift', 'Evolution of the scale factor and the cosmological constant', 'Thermal history and the particle horizon', 'Inflation', 'Dark energy and the new standard cosmological model'],
  },
];

const RUDIN_STAGES_EN: StageSpec[] = [
  {
    id: 'rudin-pma-stage-1',
    ordinal: 'Stage 1',
    title: 'The real number system and basic topology',
    chapters: 'Ch. 1 The real and complex number systems; Ch. 2 Basic topology',
    pages: 'pp. 3–46 (print)',
    goals: [
      'rudin:least-upper-bound', 'rudin:ordered-field', 'rudin:extended-real', 'rudin:complex-field',
      'rudin:euclidean-space', 'rudin:countable-set', 'rudin:metric-space', 'rudin:compact-set',
      'rudin:perfect-set', 'rudin:connected-set',
    ],
    horizon: 13,
    events: 10,
    feature: 'Rudin starts one step further back than most textbooks: the real numbers are not assumed, they are built from the field and order axioms, '
      + 'with the least-upper-bound property taken as what separates them from the rationals. That step has to be solid before stage 2 — '
      + 'almost every later proof ends by taking a supremum. Then point-set topology: countability, metric spaces, compactness and connectedness, '
      + 'four notions that come back in every later chapter.',
    highlights: ['Ordered fields', 'The real field and the least-upper-bound property', 'The extended real number system', 'The complex field', 'Euclidean space R^k', 'Countable and uncountable sets', 'Metric spaces', 'Compact sets and the Heine–Borel theorem', 'Perfect sets and the Cantor set', 'Connected sets'],
  },
  {
    id: 'rudin-pma-stage-2',
    ordinal: 'Stage 2',
    title: 'Numerical sequences and series',
    chapters: 'Ch. 3 Numerical sequences and series',
    pages: 'pp. 47–82 (print)',
    goals: [
      'rudin:absolute-convergence', 'rudin:convergent-sequence', 'rudin:bolzano-weierstrass',
      'rudin:cauchy-sequence', 'rudin:limit-superior', 'rudin:series-convergence', 'rudin:power-series',
    ],
    horizon: 10,
    events: 7,
    feature: 'This stage translates the topological notions of stage 1 into ε–N language and supplies the two tools the rest of the book uses most: completeness and the limit superior. '
      + 'Watch how the two characterisations of convergence divide the work — Cauchy’s criterion needs no limit in advance, while the limit superior gives you something to say even when a sequence does not converge. '
      + 'In the series part the watershed is absolute convergence: only there may terms be rearranged; a conditionally convergent series can be rearranged to any prescribed sum.',
    highlights: ['Convergent sequences and subsequences', 'Bolzano–Weierstrass theorem', 'Cauchy sequences and completeness', 'Limit superior and limit inferior', 'Series and convergence tests', 'Power series', 'Absolute convergence and rearrangement'],
  },
  {
    id: 'rudin-pma-stage-3',
    ordinal: 'Stage 3',
    title: 'Continuity and differentiation',
    chapters: 'Ch. 4 Continuity; Ch. 5 Differentiation',
    pages: 'pp. 83–119 (print)',
    goals: [
      'rudin:mean-value-theorem', 'rudin:function-limit', 'rudin:continuous-function',
      'rudin:continuity-compactness', 'rudin:continuity-connectedness', 'rudin:derivative',
      'rudin:lhospital-rule', 'rudin:taylor-theorem', 'rudin:vector-derivative',
    ],
    horizon: 12,
    events: 9,
    feature: 'Both “big theorems” of continuity are direct corollaries of the topology in stage 1: a continuous function on a compact set attains its extrema and is uniformly continuous, '
      + 'and on a connected set it takes intermediate values. Differentiation then gives the most useful single result in the book — the mean value theorem, '
      + 'of which L’Hospital’s rule and Taylor’s theorem are corollaries. The point to watch is the section on vector-valued functions: there the mean value theorem **fails**, '
      + 'and must be replaced by an integral inequality — the standard example of one-dimensional intuition that cannot simply be carried over.',
    highlights: ['Limits of functions', 'Continuous functions', 'Continuity and compactness', 'Continuity and connectedness (intermediate value theorem)', 'The derivative', 'Mean value theorem', 'L’Hospital’s rule', 'Taylor’s theorem', 'Differentiation of vector-valued functions'],
  },
  {
    id: 'rudin-pma-stage-4',
    ordinal: 'Stage 4',
    title: 'The Riemann–Stieltjes integral',
    chapters: 'Ch. 6 The Riemann–Stieltjes integral',
    pages: 'pp. 120–142 (print)',
    goals: [
      'rudin:fundamental-theorem', 'rudin:riemann-stieltjes', 'rudin:integral-properties',
      'rudin:rectifiable-curve',
    ],
    horizon: 7,
    events: 4,
    feature: 'Stieltjes rather than Riemann: replacing “integrate with respect to x” by “integrate with respect to an increasing function α” costs almost nothing in difficulty '
      + 'and lets sums, series and integrals be written in one language. Watch the existence criterion (upper integral equals lower integral) '
      + 'and the two halves of the fundamental theorem: first build a continuous F from f, then ask when F is differentiable and whether its derivative is f.',
    highlights: ['The Riemann–Stieltjes integral and existence', 'Properties of the integral', 'The fundamental theorem of calculus', 'Rectifiable curves'],
  },
  {
    id: 'rudin-pma-stage-5',
    ordinal: 'Stage 5',
    title: 'Sequences of functions and special functions',
    chapters: 'Ch. 7 Sequences and series of functions; Ch. 8 Some special functions',
    pages: 'pp. 143–203 (print)',
    goals: [
      'rudin:stone-weierstrass', 'rudin:uniform-convergence', 'rudin:uniform-convergence-properties',
      'rudin:equicontinuous', 'rudin:exponential-logarithm', 'rudin:trigonometric-functions',
      'rudin:algebraic-completeness', 'rudin:fourier-series', 'rudin:gamma-function',
    ],
    horizon: 12,
    events: 9,
    feature: '“May the limit be interchanged?” is the whole subject of this stage: under what conditions continuity, integration and differentiation commute with a limit. '
      + 'The answer is uniform convergence, and on compact sets uniform convergence itself has a practical criterion in equicontinuity. '
      + 'The second half uses these tools to build the elementary functions again — exponential, logarithm and trigonometric functions no longer rest on geometric intuition, '
      + 'but are defined by power series and checked property by property. Analysis first, functions after.',
    highlights: ['Uniform convergence', 'Uniform convergence with continuity, integration and differentiation', 'Equicontinuous families', 'Stone–Weierstrass theorem', 'The exponential and logarithmic functions', 'The trigonometric functions', 'Algebraic completeness of the complex field', 'Fourier series', 'The gamma function'],
  },
  {
    id: 'rudin-pma-stage-6',
    ordinal: 'Stage 6',
    title: 'Functions of several variables',
    chapters: 'Ch. 9 Functions of several variables',
    pages: 'pp. 204–244 (print)',
    goals: [
      'rudin:rank-theorem', 'rudin:linear-transformation', 'rudin:several-variable-derivative',
      'rudin:contraction-principle', 'rudin:inverse-function-theorem', 'rudin:implicit-function-theorem',
    ],
    horizon: 9,
    events: 6,
    feature: 'The core shift of multivariable differentiation: the derivative is no longer a number but the linear map that approximates f at a point. '
      + 'Follow one chain of reasoning — the contraction principle gives a unique fixed point, the inverse function theorem is that principle applied to linearisation, '
      + 'the implicit function theorem is a rewrite of the inverse function theorem, and the rank theorem says that where the rank is constant the map is locally a projection. '
      + 'Existence of partial derivatives does **not** imply differentiability here, which is where one-dimensional intuition misleads most often.',
    highlights: ['Linear transformations and the operator norm', 'The derivative of a function of several variables', 'The contraction principle', 'The inverse function theorem', 'The implicit function theorem', 'The rank theorem'],
  },
  {
    id: 'rudin-pma-stage-7',
    ordinal: 'Stage 7',
    title: 'Differential forms and Lebesgue theory',
    chapters: 'Ch. 10 Integration of differential forms; Ch. 11 The Lebesgue theory',
    pages: 'pp. 245–334 (print)',
    goals: [
      'rudin:l2-space', 'rudin:primitive-mapping', 'rudin:differential-form', 'rudin:simplex-chain',
      'rudin:stokes-theorem', 'rudin:closed-exact-form', 'rudin:set-function',
      'rudin:lebesgue-measure', 'rudin:measurable-function', 'rudin:lebesgue-integral',
    ],
    horizon: 13,
    events: 10,
    feature: 'The last two chapters each close a line. Chapter 10 collects Green, Gauss, the classical Stokes theorem and the fundamental theorem of calculus into one statement ∫_Γ dω = ∫_{∂Γ} ω, '
      + 'which first requires the language of chains and the boundary operator (∂² = 0); the difference between closed and exact forms then becomes a question about the topology of the region. '
      + 'Chapter 11 replaces the integral itself: a measure is built from interval lengths, an integral is defined by approximation with simple functions, '
      + 'Riemann-integrable functions stay integrable with the same value, and the dominated convergence theorem finally lets a limit move inside the integral sign.',
    highlights: ['Primitive mappings and partitions of unity', 'Differential forms', 'Simplices and chains', 'Stokes’ theorem', 'Closed and exact forms', 'Set functions', 'Construction of the Lebesgue measure', 'Measurable functions', 'The Lebesgue integral', 'L² spaces'],
  },
];

/** 英文版范例集：与 `EXAMPLE_SETS` 同 id、同顺序、同条数、同数字，只有文字是英文。 */
export const EXAMPLE_SETS_EN: ExampleSet[] = [
  {
    id: 'liang-volume-1',
    title: 'Liang Canbin & Zhou Bin, Differential Geometry: An Introduction to General Relativity, vol. 1 — a condensed path',
    source: '梁灿彬、周彬《微分几何入门与广义相对论》上册（第二版），科学出版社，2006，现代物理基础丛书 7，ISBN 978-7-03-016460-5（xi + 442 页，共 10 章）。',
    lead: 'The 442 pages of the ten chapters are condensed into 56 milestone nodes and cut, along the textbook’s own seams, into seven stages: the first five chapters introduce differential geometry, chapter 6 turns to special relativity, and chapters 7–10 are general relativity. '
      + 'Every stage can be planned on this page right away; the event counts on the cards are measured values, not estimates.',
    note: 'The sample covers volume 1 only, and it is a **condensation**, not the whole book: sections marked as optional reading in the original (§1.3, §5.7, §8.5–§8.8 and others) keep only one node or are left out entirely. '
      + 'The node texts here are condensed notes, not a substitute for the textbook, and no complete proof from the book has been transcribed — the evidence is registered as “cites the textbook” (REF), not encoded as a machine-checkable certificate.',
    paths: buildPaths(LIANG_BASE_ENTRIES, LIANG_STAGES_EN, 'The starting point is two shared background nodes (no action can produce them; the learner has to confirm them first).', EN_ENTRY_CONTINUATION),
  },
  {
    id: 'rudin-pma',
    title: 'Rudin, Principles of Mathematical Analysis, 3rd ed. — a condensed path',
    source: 'Walter Rudin, Principles of Mathematical Analysis, 3rd ed., McGraw-Hill（本机扫描件：reference/paths/数学分析原理 英文版·原书第3版·典藏版.pdf，355 页；章节与页码取自扫描件目录页的 OCR）。',
    lead: 'The 11 chapters are condensed into 55 milestone nodes in seven stages: chapters 1–2 establish the real numbers and topology, chapter 3 sequences and series, '
      + 'chapters 4–5 continuity and differentiation, chapter 6 integration, chapters 7–8 sequences of functions and special functions, chapter 9 functions of several variables, and chapters 10–11 differential forms and Lebesgue theory.',
    note: '**In this sample the nodes carry nothing but names; the body text is empty.** As required this round, the 54 concept/claim nodes and 2 method nodes register only '
      + 'title, section/page and dependencies, with `contentRef: false` — opening a node page will say honestly that there is no body text rather than invent filler. '
      + 'It can therefore be used to see **structure** (what comes before what, which step depends on which), but not yet to learn the content. '
      + 'Evidence is registered throughout as “cites the textbook” (REF), `checkStatus: not_run`; the textbook’s statements have not been checked one by one.',
    paths: buildPaths(RUDIN_BASE_ENTRIES, RUDIN_STAGES_EN, 'The starting point is three shared background nodes (sets and functions, quantifiers, finite-dimensional linear algebra; no action can produce them, so the learner has to confirm them first).', EN_ENTRY_CONTINUATION),
  },
];

/** 成对的两套样本：页面用 `useI18n().pick(EXAMPLE_SETS_BY_LOCALE)` 取。 */
export const EXAMPLE_SETS_BY_LOCALE: { zh: ExampleSet[]; en: ExampleSet[] } = {
  zh: EXAMPLE_SETS,
  en: EXAMPLE_SETS_EN,
};
