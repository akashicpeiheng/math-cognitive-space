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
 * 凝练成 56 个里程碑节点，按教材的自然接缝分成七程。正文见
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
  /**
   * 短书名（2026-10-13 加）：压缩态下按学科选书时，按钮上只放这一个名字。
   *
   * 为什么不从 `title` 裁：中英两侧的书名结构不同（中文「作者《书名》」，英文
   * 「Author, Title, ed.」），裁出来的会一半带书名号一半不带。短书名是**写下来的数据**。
   */
  shortTitle: string;
  /** 出处，可核验。 */
  source: string;
  /**
   * 这套教材的主学科（受控词表 `data/fields.mjs` 里的值）。
   *
   * **它是兜底，不是分类本身**（2026-10-13 加）：分组默认仍然由本体现场统计
   * （`groupByDiscipline()` 数这套样本里程碑节点的 `discipline`，取最多的那一支）。
   * 但那一份统计要求本体里**已经有**这套样本的节点；本体比样本旧、或那一帧还没到齐时，
   * 统计会一个都查不到——那时若回落到「其他」，读者会看到一本明明属于线性代数的书被归到「其他」。
   * 因此这里声明一个主学科，只在统计拿不到东西时使用（`disciplineOfSet().resolved === 0`）。
   */
  discipline: string;
  /** 栏目导语。 */
  lead: string;
  /**
   * 这样规划的**特色**：这套路径和另外几套有什么不同（3–4 条，写具体）。
   *
   * 与 `merits` / `limits` 一样，都是**给人判断「要不要走这条线」**用的：
   * 悬浮书名时显示在简介下面，点开之后也显示一次（触屏没有悬浮）。
   */
  signature: string[];
  /** 这样规划的**优点**：具体的好处，不写「系统」「高效」这类空话。 */
  merits: string[];
  /** 这样规划的**代价与局限**：哪里不能用、哪里没核对、压缩掉了什么——如实写。 */
  limits: string[];
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
      'liang:abstract-index', 'top:continuous-map', 'top:differentiable-manifold', 'dg:tangent-vector-curve',
      'dg:smooth-vector-field', 'liang:dual-vector-field', 'tensor:field', 'liang:metric-tensor',
      'top:space',
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
      'dg:generalized-stokes-theorem', 'liang:pushforward-pullback', 'liang:lie-derivative', 'liang:killing-field',
      'liang:hypersurface', 'dg:differential-form', 'liang:exterior-derivative',
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
      'rudin:euclidean-space', 'rudin:countable-set', 'dg:metric-space', 'top:compactness',
      'rudin:perfect-set', 'top:connectedness',
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
      'rudin:absolute-convergence', 'limit:seq-conv', 'rudin:bolzano-weierstrass',
      'dg:metric-completeness', 'rudin:limit-superior', 'rudin:series-convergence', 'rudin:power-series',
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
      'rudin:mean-value-theorem', 'limit:limit-ed', 'limit:continuous',
      'rudin:continuity-compactness', 'top:claim-connected-intermediate', 'rudin:derivative',
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
      'rudin:contraction-principle', 'dg:inverse-function-theorem', 'dg:implicit-function-theorem',
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
      'rudin:l2-space', 'dg:partition-of-unity', 'dg:differential-form', 'rudin:simplex-chain',
      'dg:generalized-stokes-theorem', 'liang:exterior-derivative', 'rudin:set-function',
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

/**
 * 《简明高等代数》的基础背景：集合与函数、量词。
 *
 * 这本书**自带**域的公理（§1.1）与向量空间的公理化定义（§7.1），因此不把
 * `bg:linear:vector`（有限维线性代数）声明为背景——把它当背景会让「本站要教的内容」
 * 先被当成已经会了。这与 Rudin 那一套相反，那里的线性代数是分析的外部输入。
 */
export const JIANG_BASE_ENTRIES: string[] = ['bg:set:function', 'bg:logic:quantifier'];

/**
 * 《简明高等代数》（蒋剑剑、林秀清）的七程。
 *
 * 目标顺序不是教材顺序，而是「先给这一程的落点」：第一个目标是目标下拉框里显示的那一个。
 * 章节与**印刷页码**取自 PDF 自带书签（hyperref outline），PDF 页码 − 6 = 印刷页码
 * （见 `data/cases/jiang.mjs` 的文件头）。
 */
const JIANG_STAGES: StageSpec[] = [
  {
    id: 'jiang-jdga-stage-1',
    ordinal: '第一程',
    title: '从会消元到看懂全部解：域、行变换与换元',
    chapters: '第1章 线性方程组',
    pages: '印刷 9–28 页',
    goals: [
      'jiang:solution-cases', 'jiang:field-axioms', 'jiang:elementary-row-operations', 'jiang:linear-substitution',
    ],
    horizon: 6,
    events: 4,
    feature: '从熟悉的 x+y+z=2、2x+3y+z=5 出发，四站始终解同一道题：'
      + '先解释能怎样计算，再把消元整理成可撤销的行操作，用新变量重看同一个解，最后证明每个自由参数恰好给一个解。'
      + '建议按「域 → 行变换 → 换元 → 解的分类」阅读；也可由行变换直接读分类证明。'
      + '正文、条件反例和自检题已落实；特别区分有限域的有限多个解与实数中的无穷多解。',
    highlights: ['域的公理', '初等行变换', '线性换元', '线性方程组解的情况'],
  },
  {
    id: 'jiang-jdga-stage-2',
    ordinal: '第二程',
    title: '矩阵：从运算到相抵标准形',
    chapters: '第2章 矩阵论初步',
    pages: '印刷 29–50 页',
    goals: [
      'jiang:matrix-operations', 'jiang:matrix-multiplication', 'jiang:elementary-matrix', 'jiang:invertible-matrix',
      'jiang:block-matrix', 'jiang:matrix-rank', 'jiang:matrix-equivalence',
    ],
    horizon: 10,
    events: 7,
    feature: '把方程组里的系数表单独拿出来研究，就成了矩阵。这一程的骨架是「运算 → 变换 → 不变量」：'
      + '先定义乘法，并立刻看到它不交换、还有零因子（AB = 0 不等于 A 或 B 为零）；'
      + '再把初等行变换翻译成左乘初等矩阵，于是「可逆」有了可操作的判据；最后用秩把相抵的矩阵收成唯一的标准形。'
      + '这是全书第一次出现「把对象化到标准形」这条策略，它在后面还会回来两次（合同、相似）。',
    highlights: ['矩阵的基本运算', '矩阵乘法', '初等矩阵', '可逆矩阵', '分块矩阵', '矩阵的秩', '相抵标准形'],
  },
  {
    id: 'jiang-jdga-stage-3',
    ordinal: '第三程',
    title: '行列式：从面积到乘法定理',
    chapters: '第3章 行列式基础',
    pages: '印刷 51–76 页',
    goals: [
      'jiang:low-order-determinant', 'jiang:permutation-parity', 'jiang:determinant-definition',
      'jiang:determinant-properties', 'jiang:cofactor-expansion', 'jiang:determinant-multiplicative',
      'jiang:cramer-rule',
    ],
    horizon: 10,
    events: 7,
    feature: '行列式是这一程唯一的新对象，但它有三个面孔：低阶时是有向面积与体积，一般情形是带排列符号的全和式，'
      + '真要算的时候靠按行（列）展开。看点是「性质决定计算」——多重线性与反称性一旦写下来，'
      + '展开定理与乘法定理都是它的推论，而 Cramer 法则只是乘法定理在解方程上的用法：'
      + '解的唯一性与公式都来自 det A ≠ 0 这一条判据。',
    highlights: ['低阶行列式', '排列的逆序数', '行列式的定义', '行列式的性质', '代数余子式展开', '行列式的乘法定理', 'Cramer 法则'],
  },
  {
    id: 'jiang-jdga-stage-4',
    ordinal: '第四程',
    title: '有限维空间：基、维数与解的结构',
    chapters: '第4章 有限维空间模型',
    pages: '印刷 77–98 页',
    goals: [
      'jiang:column-vector-space', 'jiang:linear-dependence', 'jiang:maximal-independent-set',
      'jiang:basis-dimension', 'jiang:coordinate-transition', 'jiang:solution-structure',
    ],
    horizon: 9,
    events: 6,
    feature: '这一程把「解方程组」升格成「研究空间」：F^n 是第一个具体模型，线性相关与极大无关组回答「有多少个独立方向」，'
      + '基与维数把这个数目固定下来，过渡矩阵负责在两组基之间换算。最后回到方程组——'
      + '解集是「一个特解 + 齐次解空间」，维数由 n − rank A 给出，前三程的工具在这里合流。'
      + '注意极大无关组的个数与基的选择无关，这一条是维数能叫「维数」的全部理由。',
    highlights: ['列向量空间 F^n', '线性相关', '极大线性无关组', '空间的基', '过渡矩阵', '线性方程组解的结构'],
  },
  {
    id: 'jiang-jdga-stage-5',
    ordinal: '第五程',
    title: '内积与二次型：给空间加上度量',
    chapters: '第5章 内积与双线性型',
    pages: '印刷 99–120 页',
    goals: [
      'jiang:inner-product', 'jiang:orthogonalization', 'jiang:bilinear-quadratic-form',
      'jiang:quadratic-normal-form', 'jiang:positive-definite',
    ],
    horizon: 8,
    events: 5,
    feature: '内积是**额外加上去**的结构：有了它才有长度、夹角与正交，没有它向量空间照样成立。'
      + '这一程分两半——前半用 Gram–Schmidt 把线性无关组改造成标准正交基，并得到 V = W ⊕ W^⊥ 的分解；'
      + '后半把内积推广成对称双线性型与二次型，用配方或正交变换化成标准形。'
      + '分水岭是惯性定理：正、负惯性指数与所用的换元无关，于是实二次型的合同分类由这两个数完全决定。',
    highlights: ['内积', '正交化', '二次型', '二次型的标准形', '正定二次型'],
  },
  {
    id: 'jiang-jdga-stage-6',
    ordinal: '第六程',
    title: '一元多项式：与整数平行的第二条结构线',
    chapters: '第6章 一元多项式',
    pages: '印刷 121–148 页',
    goals: [
      'jiang:polynomial-ring', 'jiang:division-algorithm', 'jiang:gcd-polynomial', 'jiang:irreducible-polynomial',
      'jiang:polynomial-function', 'jiang:integer-polynomial', 'jiang:partial-fraction', 'jiang:chinese-remainder',
    ],
    horizon: 11,
    events: 8,
    feature: '多项式这一章是全书唯一一条「平行结构」：带余除法、辗转相除、Bézout 等式、唯一分解，'
      + '每一步都与整数一一对应，连证明的写法都可以照搬。看点在于哪些结论依赖「系数在域里」——'
      + '带余除法一旦成立，公因式与既约性就顺着下来；反过来在 Z[x] 上取余不唯一，'
      + '必须另加 Gauss 引理与 Eisenstein 判别法。收束处是部分分式与中国剩余定理：它们都是唯一分解的用法，不是新定理。',
    highlights: ['一元多项式环', '带余除法', '最大公因式', '既约多项式', '多项式函数', '整系数多项式', '部分分式分解', '中国剩余定理'],
  },
  {
    id: 'jiang-jdga-stage-7',
    ordinal: '第七程',
    title: '态射与欧氏算子：谱定理与奇异值分解',
    chapters: '第7章 向量空间的态射、第8章 欧氏空间算子论',
    pages: '印刷 149–196 页',
    goals: [
      'jiang:vector-space-axioms', 'jiang:linear-map-matrix', 'jiang:eigenvector', 'jiang:similar-criterion',
      'jiang:fundamental-theorem-algebra-proof', 'jiang:isometry', 'jiang:self-adjoint-spectral',
      'jiang:minimax-principle', 'jiang:normal-operator-calculus', 'jiang:polar-svd',
    ],
    horizon: 13,
    events: 10,
    feature: '最后两章把前面的对象全部升格成「映射」：向量空间公理化，线性映射取定基后成为矩阵，'
      + '换基就是相似，而特征值给出相似类里最简单的那组数据（特征多项式相同只是必要条件）。'
      + '第八章带着内积把同一件事再做一遍：自伴算子可以**正交**对角化（谱定理），'
      + '特征值还有极小极大的变分刻画（不再依赖特征方程的根），正规算子演算把自伴与等距统一起来，'
      + '最后落到极分解与奇异值分解——任意矩阵都能写成「半正定 × 部分等距」，奇异值由 A^*A 唯一确定。',
    highlights: ['向量空间的公理化定义', '线性映射的矩阵表示', '特征值与特征向量', '矩阵相似的判别', '代数基本定理', '等距变换', '自伴算子的谱定理', '极小极大原理', '正规算子演算', '奇异值分解'],
  },
];

/** 《Linear Algebra Done Right》第 4 版的共享起点：两个背景接口节点。 */
export const AXLER_BASE_ENTRIES = ['bg:set:function', 'bg:logic:quantifier'];

/**
 * Axler 的九程：**一章一程**（这是本栏目里程数最多的一套样本）。
 *
 * 事件数与事件界是**实测值**：`tmp/axler-stages-probe.mjs` 用真规划器在
 * 「基础背景 + 前面各程里程碑」下逐程跑过，每程的事件数恰好等于该程里程碑数
 * （61 个里程碑 61 个事件，没有冗余步）；事件界取实测 + 2。
 * `tests/example-paths.test.mjs` 会按声明的 horizon 再跑一遍核对。
 */
export const AXLER_STAGES: StageSpec[] = [
  {
    id: 'axler-ladr-stage-1',
    ordinal: '第一程',
    title: '向量空间：从复数与域到八条公理',
    chapters: '第1章 向量空间（1A–1C）',
    pages: '印刷 1–26 页',
    goals: ['axler:complex-numbers', 'axler:field', 'axler:list-fn', 'axler:vector-space', 'axler:subspace', 'axler:direct-sum'],
    horizon: 8,
    events: 6,
    feature: '从最小的例子起步：先把复数与域说清楚，再把 Fⁿ 的分量运算抽象成八条公理。'
      + '这一程的看点是「公理不是装饰」——子空间的判据、直和的唯一分解，都是这八条的直接后果；'
      + '而这本书把域的公理**自带**进来（1A 末尾的旁注），不假设读者已经学过线性代数。',
    highlights: ['复数', '域', '列表与 Fⁿ', '向量空间', '子空间', '直和'],
  },
  {
    id: 'axler-ladr-stage-2',
    ordinal: '第二程',
    title: '有限维向量空间：张成、无关、基与维数',
    chapters: '第2章 有限维向量空间（2A–2C）',
    pages: '印刷 27–50 页',
    goals: ['axler:span', 'axler:linear-independence', 'axler:basis', 'axler:dimension', 'axler:subspace-dimension'],
    horizon: 7,
    events: 5,
    feature: '这一程只做一件事：把「坐标」这件事说清楚。张成、线性无关、基、维数四步看似平常，'
      + '关键在两条比较——无关列表不长于任何张成它的列表，以及任意两个基长度相同。'
      + '后者是「维数」这个词合法的全部理由，也是后面每次计数的支点（子空间维数不等式已经在这一程末出现）。',
    highlights: ['张成', '线性无关', '基', '维数', '子空间与维数'],
  },
  {
    id: 'axler-ladr-stage-3',
    ordinal: '第三程',
    title: '线性映射：零空间、矩阵与对偶',
    chapters: '第3章 线性映射（3A–3F）',
    pages: '印刷 51–118 页',
    goals: [
      'axler:linear-map', 'axler:null-range', 'axler:fundamental-theorem', 'axler:matrix-of-map',
      'axler:rank-of-matrix', 'axler:invertibility', 'axler:change-of-basis', 'axler:product-quotient',
      'axler:dual-space', 'axler:dual-null-range',
    ],
    horizon: 12,
    events: 10,
    feature: '全书最长的一程，把「映射」而不是「矩阵」当主角：先有线性映射，才有它的零空间、值域与基本定理 '
      + 'dim V = dim null T + dim range T；矩阵是**选定基之后**的样子，基变换公式说明「同一个算子的不同矩阵」差在哪。'
      + '到这一程末，对偶空间与对偶映射给出「线性泛函」这套语言——第 6 章的里斯表示与第 9 章的行列式都要回头用它。',
    highlights: ['线性映射', '零空间与值域', '线性映射基本定理', '线性映射的矩阵', '矩阵的秩', '可逆的等价判别', '基变换', '积空间与商空间', '对偶空间与对偶映射', '对偶的零空间与值域'],
  },
  {
    id: 'axler-ladr-stage-4',
    ordinal: '第四程',
    title: '多项式：特征值存在性的来源',
    chapters: '第4章 多项式',
    pages: '印刷 119–131 页',
    goals: ['axler:zeros-of-polynomials', 'axler:polynomial-division', 'axler:factorization-over-c', 'axler:factorization-over-r'],
    horizon: 6,
    events: 4,
    feature: '只有四节，却是后面所有「特征值存在」的来源：零点判据 ⇒ 带余除法 ⇒ 代数基本定理 ⇒ 复数域上一定能分解成一次因式。'
      + '它排在算子之前不是随意的：5B 的极小多项式、8B 的重数关系都要用这一章。',
    highlights: ['多项式的零点', '多项式的带余除法', '复数域上的分解', '实数域上的分解'],
  },
  {
    id: 'axler-ladr-stage-5',
    ordinal: '第五程',
    title: '特征值与特征向量：判据落在极小多项式上',
    chapters: '第5章 特征值与特征向量（5A–5E）',
    pages: '印刷 132–180 页',
    goals: [
      'axler:eigenvalue', 'axler:eigenvector-independence', 'axler:minimal-polynomial', 'axler:complex-eigenvalue',
      'axler:odd-real-eigenvalue', 'axler:upper-triangular', 'axler:diagonalizable', 'axler:gershgorin',
      'axler:commuting-operators',
    ],
    horizon: 11,
    events: 9,
    feature: '从「方向不变的向量」出发，一路走到「能不能把算子化简成对角形」。这一程的看点是判据的落点：'
      + '可对角化不靠数特征向量，而看极小多项式有没有重根；复空间上一定有特征值（代数基本定理的功劳），'
      + '实空间上只在奇数维才有保证；上三角化是「不要求对角化时能做到什么」的答案。'
      + '末尾的圆盘定理与交换算子给出两个可算的旁证。',
    highlights: ['特征值与特征向量', '不同特征值的特征向量线性无关', '极小多项式', '复向量空间上必有特征值', '奇数维实空间上必有特征值', '上三角矩阵的存在', '可对角化的判别', '圆盘定理', '交换算子'],
  },
  {
    id: 'axler-ladr-stage-6',
    ordinal: '第六程',
    title: '内积空间：长度、正交与投影',
    chapters: '第6章 内积空间（6A–6C）',
    pages: '印刷 181–226 页',
    goals: [
      'axler:inner-product', 'axler:cauchy-schwarz', 'axler:orthonormal-list', 'axler:gram-schmidt',
      'axler:riesz-representation', 'axler:orthogonal-decomposition', 'axler:minimal-distance',
    ],
    horizon: 9,
    events: 7,
    feature: '加上内积之后，空间里才有长度、夹角与「垂直」。这一程把三件事连起来：柯西–施瓦茨不等式（内积与范数的关系）、'
      + '格拉姆–施密特正交化（任意无关列表变成规范正交列表的算法）、正交分解与最小距离（投影为什么是最优解）。'
      + '里斯表示定理落在这一程末，它把「对偶」换成了「配一个向量」——第 7 章的伴随算子直接建在它上面。',
    highlights: ['内积与范数', '柯西–施瓦茨不等式', '规范正交列表', '格拉姆–施密特正交化', '里斯表示定理', '正交补与正交分解', '极小化问题的解'],
  },
  {
    id: 'axler-ladr-stage-7',
    ordinal: '第七程',
    title: '内积空间上的算子：谱定理与奇异值分解',
    chapters: '第7章 内积空间上的算子（7A–7F）',
    pages: '印刷 227–296 页',
    goals: [
      'axler:adjoint', 'axler:self-adjoint-normal', 'axler:real-spectral', 'axler:complex-spectral',
      'axler:positive-operator', 'axler:isometry-unitary', 'axler:qr-cholesky', 'axler:svd', 'axler:svd-consequences',
    ],
    horizon: 11,
    events: 9,
    feature: '全书的高点：伴随算子把「转置」升级成内积里的配对，于是自伴、正规、等距、酉这些算子各有自己的谱定理。'
      + '正算子与平方根是 SVD 的入口，QR 与 Cholesky 分解是格拉姆–施密特在矩阵上的样子。'
      + '收尾的 SVD 把任意线性映射写成「旋转 × 沿坐标拉伸 × 旋转」，并给出范数、低秩逼近、极分解与体积四条推论——'
      + '这也是与《简明高等代数》第七程登记接口的地方。',
    highlights: ['伴随', '自伴与正规算子', '实谱定理', '复谱定理', '正算子与平方根', '等距与酉算子', 'QR 与 Cholesky 分解', '奇异值分解', '奇异值分解的推论'],
  },
  {
    id: 'axler-ladr-stage-8',
    ordinal: '第八程',
    title: '复向量空间上的算子：广义特征空间与若尔当形',
    chapters: '第8章 复向量空间上的算子（8A–8D）',
    pages: '印刷 297–331 页',
    goals: [
      'axler:generalized-eigenvector', 'axler:generalized-decomposition', 'axler:multiplicity',
      'axler:square-root', 'axler:jordan-form', 'axler:trace',
    ],
    horizon: 8,
    events: 6,
    feature: '特征向量不够多时怎么办？这一程把「不变子空间」放宽成「某个幂的零空间」，'
      + '于是复空间上的算子总能拆成广义特征空间的直和，再在每个块里分出若尔当块。'
      + '若尔当形是相似分类的终点（不计块的重排就唯一）；末尾的迹说明：矩阵对角元之和其实属于**算子**本身，与选哪组基无关。',
    highlights: ['广义特征向量与幂零算子', '广义特征空间分解', '重数关系与块对角形式', '可逆算子的平方根', '若尔当形', '迹'],
  },
  {
    id: 'axler-ladr-stage-9',
    ordinal: '第九程',
    title: '多重线性代数：行列式与张量积',
    chapters: '第9章 多重线性代数与行列式（9A–9D）',
    pages: '印刷 332–382 页',
    goals: ['axler:bilinear-form', 'axler:quadratic-form', 'axler:alternating-multilinear', 'axler:determinant', 'axler:tensor-product'],
    horizon: 7,
    events: 5,
    feature: '最后一程换一个方向：不研究算子，而研究「多个变量各自线性的函数」。'
      + '交错 n 重线性形式的**唯一性就是行列式的定义**——于是 det(AB) = det A det B 与「可逆 ⟺ 行列式非零」'
      + '成为两条性质的直接推论，而不是展开式上的技巧。末尾的张量积把这套多重线性的语言收进线性代数（泛性质 + 维数相乘）。',
    highlights: ['双线性形与对称双线性形', '二次型', '交错多重线性形式', '行列式', '张量积'],
  },
];

export const EXAMPLE_SETS: ExampleSet[] = [
  {
    id: 'liang-volume-1',
    title: '梁灿彬《微分几何入门与广义相对论》上册 · 凝练路径',
    shortTitle: '梁灿彬《微分几何入门与广义相对论》上册',
    discipline: '相对论与宇宙论',
    source: '梁灿彬、周彬《微分几何入门与广义相对论》上册（第二版），科学出版社，2006，现代物理基础丛书 7，ISBN 978-7-03-016460-5（xi + 442 页，共 10 章）。',
    lead: '把 442 页的十章凝练成 56 个里程碑节点，按教材的自然接缝分成七程：前五章是微分几何入门，第 6 章转向狭义相对论，第 7–10 章是广义相对论。'
      + '每一程都能在本页的规划器里当场跑出路线；卡片上的事件数是实测值，不是估算。',
    signature: [
      '四套样本里唯一**带正文**的一套：每个节点都有凝练笔记，走通之后可以真读内容。',
      '按教材的自然接缝分程：前五章把流形、张量、联络与微分形式这套语言搭起来，第 6 章转狭义相对论，第 7–10 章进场方程、黑洞与宇宙论。',
      '依赖链**跨案例**：拓扑空间、连续映射、张量场这些节点复用站内既有登记，不是这一套自造的名字。',
    ],
    merits: [
      '唯一能「边规划边读」的样本：节点页有正文、有逐条件反例、有回看提问。',
      '每一程的目标数适中，都能在声明的事件界内被判为 `Found`，不会走到一条规划不出来的死路上。',
      '把「上册」单独成一套：在同一套里能看完整的物理脉络——几何语言 → 狭义相对论 → 场方程 → 黑洞 → 宇宙论。',
    ],
    limits: [
      '只覆盖**上册**，而且标为选读的小节（§1.3、§5.7、§8.5–§8.8 等）只保留一个节点或干脆未列。',
      '正文是**凝练笔记**，不是教材的替代：没有转录教材里的完整证明，证据一律按「教材有论证」登记。',
      '相对论那几程依赖物理直觉（同时性、固有时、潮汐力）；本站不声称教学效果，也没有做过学习实验。',
    ],
    note: '样本只覆盖上册，且是**凝练**而非全量：原书 §1.3、§5.7、§8.5–§8.8 等标为选读的小节只保留了一个节点或干脆未列。'
      + '本站的节点正文是凝练笔记，不是教材原文的替代，也没有转录教材中的完整证明——证据登记为「引用教材」（REF），未编码为机器证书。',
    paths: buildPaths(LIANG_BASE_ENTRIES, LIANG_STAGES, '起点是两个共享背景节点（它们没有任何行动能产出，只能由学习者先确认）。'),
  },
  {
    id: 'rudin-pma',
    title: 'Rudin《数学分析原理》第三版 · 凝练路径',
    shortTitle: 'Rudin《数学分析原理》第三版',
    discipline: '分析',
    source: 'Walter Rudin, Principles of Mathematical Analysis, 3rd ed., McGraw-Hill（本机扫描件：reference/paths/数学分析原理 英文版·原书第3版·典藏版.pdf，355 页；章节与页码取自扫描件目录页的 OCR）。',
    lead: '把 11 章凝练成 55 个里程碑节点，分成七程：第 1–2 章立实数与拓扑，第 3 章序列与级数，'
      + '第 4–5 章连续与微分，第 6 章积分，第 7–8 章函数序列与特殊函数，第 9 章多元函数，第 10–11 章微分形式与 Lebesgue 理论。',
    signature: [
      '**只挂名字、正文留空**的样本：先让人看清结构，内容留待补写。',
      '章节与页码取自扫描件**目录页的 OCR**（那份 PDF 连文本层都没有），节点只引用「章 + 小节 + 页码」。',
      '起点里**必须有有限维线性代数**：第 9、10 章都以它为输入，少了它第六、七程直接判为界内不可行——这是量出来的，不是猜的。',
    ],
    merits: [
      '结构完整：谁先谁后、哪一步依赖哪一步都能查，可以先据此判断「这条线值不值得走」。',
      '把「分析需要哪些前置」摊开了：度量空间的完备性、拓扑、线性代数在路线上一眼可见。',
      '只 OCR 目录页，来源与页码可回查——便宜、可核，且不必等正文写完。',
    ],
    limits: [
      '**不能用来学内容**：所有节点 `contentRef: false`，节点页如实显示「正文尚未撰写」。',
      '页码来自 OCR，个别数字可能识别错（例如 §1.23 的起始页）；若干小节合成一个节点属编辑取舍。',
      '证据一律是「引用教材」（REF），没有编码成机器可核的证书。',
    ],
    note: '**这套样本的节点只挂了名字，正文是空的。** 按本轮要求，54 个概念/断言节点与 2 个方法节点只登记了'
      + '标题、所属小节/页码与依赖关系，`contentRef: false`——点进节点页会如实显示「没有正文」，而不是编一段填充。'
      + '因此它现在能用来看**结构**：谁先谁后、哪一步依赖哪一步；但还不能用来学内容。'
      + '证据一律登记为「引用教材」（REF），`checkStatus: not_run`，未逐条核对教材表述。',
    paths: buildPaths(RUDIN_BASE_ENTRIES, RUDIN_STAGES, '起点是三个共享背景节点（集合与函数、量词、有限维线性代数；它们没有任何行动能产出，只能由学习者先确认）。'),
  },
  {
    id: 'jiang-jdga',
    title: '蒋剑剑、林秀清《简明高等代数》 · 凝练路径',
    shortTitle: '蒋剑剑、林秀清《简明高等代数》',
    discipline: '线性代数',
    source: '蒋剑剑、林秀清《简明高等代数》，纸版由厦门大学出版社发行（本机共享版 PDF：reference/paths/简明高等代数（配套教材共享版）.pdf，208 页 PDF / 正文印刷 1–199 页，8 章 44 节；章节与页码取自 PDF 自带书签，PDF 页码 − 6 = 印刷页码）。',
    lead: '把 8 章凝练成 47 个里程碑节点，分成七程：第 1 章从域的公理与消元法起步，第 2–3 章是矩阵与行列式，'
      + '第 4 章立有限维空间，第 5 章加上内积与二次型，第 6 章是多项式这条与整数平行的线，'
      + '第 7–8 章把对象升格成态射，收于谱定理、极小极大原理与奇异值分解。',
    signature: [
      '**自带域的公理与向量空间**：不把「有限维线性代数」声明为背景，从「什么是数」开始。',
      '第 6 章的多项式是全书唯一一条**与整数平行**的结构线：带余除法 → 辗转相除 → 唯一分解 → 中国剩余定理。',
      '消元法、配方法、辗转相除法、归约到标准形这四个**方法节点**随案例登记，但**不作为路线终点**——方法随对象一起学。',
    ],
    merits: [
      '起点最低：只要会集合、函数与量词就能上路，不需要先学过线性代数。',
      '**依赖序 ≠ 教材节序**在它身上最明显：过渡矩阵、正交化、代数基本定理都被排到各程最后——那是谁依赖谁算出来的。',
      '每一步都能回指教材的章、节与印刷页码，事件数在声明的界内，路线当场可复算。',
    ],
    limits: [
      '**第一程四站与消元法已精修**：有贯穿例子、定义、证明、条件反例和自检；其余各程已有草稿，未纳入本次逐条精修。',
      '凝练不是全量：§2.6（矩阵若干应用）与各章习题没有单独成节点。',
      '教材章节与页码来自书签，**正文未逐字核对**；本站重写的一般证明没有机器证书，实际教学收益未测量。',
    ],
    note: '**第一程已可跟着读、跟着算**：四个主节点与配套 Gauss 消元法用同一组方程串联，'
      + '包含可读的形式陈述、回代证明、条件反例、自检及后续链接。推荐阅读顺序不强制充当数学前置，'
      + '行变换保解集相等、换元保解集双射的边界分别说明。其余各程已有草稿，本次未逐条精修。'
      + '教材正文未逐字核对；第一程定义与正文证明分列，机器检查仍为 not_run。'
      + '§2.6 与各章习题未单独成节点；阅读或载入路径不会自动确认掌握。',
    paths: buildPaths(JIANG_BASE_ENTRIES, JIANG_STAGES, '起点是两个共享背景节点（集合与函数、量词；它们没有任何行动能产出，只能由学习者先确认）。这本书自带域的公理与向量空间，因此不把「有限维线性代数」声明为背景。'),
  },
  {
    id: 'axler-ladr',
    title: 'Axler《Linear Algebra Done Right》第 4 版 · 凝练路径',
    shortTitle: 'Axler《Linear Algebra Done Right》第 4 版',
    discipline: '线性代数',
    source: 'Sheldon Axler, Linear Algebra Done Right, 4th ed., Springer（Undergraduate Texts in Mathematics；本机 PDF：reference/paths/Linear Algebra Done Right, 4th Edition (Sheldon Axler) (Z-Library).pdf，408 页 PDF / 正文印刷 1–382 页，9 章；章节与页码取自 PDF 自带书签，PDF 页码 − 18 = 印刷页码）。',
    lead: '把 9 章凝练成 61 个里程碑节点，按教材**一章一程**分成九程（本栏目里程数最多的一套）：'
      + '第 1–2 章立向量空间、基与维数，第 3 章是全书最长的线性映射与对偶，第 4 章多项式为特征值做准备，'
      + '第 5–8 章是算子（特征值、内积、谱定理与若尔当形），第 9 章用多重线性形式重新定义行列式。'
      + '每一程都能在本页的规划器里当场跑出路线；卡片上的事件数是实测值。',
    signature: [
      '**一本讲「算子」而不讲「矩阵」的教材**：矩阵是选定基之后的样子，秩、可逆、迹都从算子那一侧讲——因此这条路径的依赖顺序与多数线性代数课不同。',
      '**一章一程**（九程）：章节接缝与教材完全一致，走完一程就是读完一章，点哪一程就是哪一章。',
      '**自带域的公理与多项式**：不把「有限维线性代数」当背景，从复数与域出发；与《简明高等代数》同一口径，两套可以对照着走。',
      '依赖链**跨案例**：域的公理复用 `field` 案例的登记，SVD 与《简明高等代数》第七程登记为接口。',
    ],
    merits: [
      '九程与教材九章一一对应：不需要先猜「这本书怎么分块」，想看哪一章就点哪一程。',
      '每一程都能在声明的事件界内被判为 `Found`，而且实测每程事件数 = 该程里程碑数：61 个里程碑走 61 步，没有冗余步。',
      '第 7 程的 SVD 与第 9 程的行列式给了两条「换个角度重讲旧知识」的线：前者接《简明高等代数》，后者用多重线性形式替代展开式。',
    ],
    limits: [
      '节点**只挂了名字**：61 个里程碑全部 `contentRef: false`，现在能用来看结构与依赖，**不能用来学内容**。',
      '凝练不是全量：3E（积空间与商空间）只保留一个节点，各章习题与书末的符号索引、照片来源都没有成节点。',
      '一句话谓词按各节的通行内容写，**未逐条核对教材原文**，也不引用定理编号（Axler 的编号随版次变动，写了就成了不可核的细节）。',
      '页码口径（PDF − 18）与书签、页眉抽查核对过（PDF 20/100/200 → 印刷 2/82/182），但**没有 OCR 正文**：正文里的定理编号、例子编号都未登记。',
    ],
    note: '**这套样本的节点只挂了名字，正文是空的。** 61 个里程碑（26 概念 + 35 断言）与 4 个方法节点只登记了'
      + '标题、所属小节、印刷页码与依赖关系，`contentRef: false`——点进节点页会如实显示「没有正文」，而不是编一段填充。'
      + '章节与页码取自 PDF 自带书签（169 条），不引用 PDF 正文文字，也不引用定理编号；'
      + '证据一律登记为「引用教材」（REF），`checkStatus: not_run`。',
    paths: buildPaths(AXLER_BASE_ENTRIES, AXLER_STAGES, '起点是两个共享背景节点（集合与函数、量词；它们没有任何行动能产出，只能由学习者先确认）。这本书自带域的公理与多项式，因此不把「有限维线性代数」声明为背景。'),
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
      'liang:abstract-index', 'top:continuous-map', 'top:differentiable-manifold', 'dg:tangent-vector-curve',
      'dg:smooth-vector-field', 'liang:dual-vector-field', 'tensor:field', 'liang:metric-tensor',
      'top:space',
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
      'dg:generalized-stokes-theorem', 'liang:pushforward-pullback', 'liang:lie-derivative', 'liang:killing-field',
      'liang:hypersurface', 'dg:differential-form', 'liang:exterior-derivative',
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
      'rudin:euclidean-space', 'rudin:countable-set', 'dg:metric-space', 'top:compactness',
      'rudin:perfect-set', 'top:connectedness',
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
      'rudin:absolute-convergence', 'limit:seq-conv', 'rudin:bolzano-weierstrass',
      'dg:metric-completeness', 'rudin:limit-superior', 'rudin:series-convergence', 'rudin:power-series',
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
      'rudin:mean-value-theorem', 'limit:limit-ed', 'limit:continuous',
      'rudin:continuity-compactness', 'top:claim-connected-intermediate', 'rudin:derivative',
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
      'rudin:contraction-principle', 'dg:inverse-function-theorem', 'dg:implicit-function-theorem',
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
      'rudin:l2-space', 'dg:partition-of-unity', 'dg:differential-form', 'rudin:simplex-chain',
      'dg:generalized-stokes-theorem', 'liang:exterior-derivative', 'rudin:set-function',
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

const JIANG_STAGES_EN: StageSpec[] = [
  {
    id: 'jiang-jdga-stage-1',
    ordinal: 'Stage 1',
    title: 'From elimination to all solutions: fields, row operations and substitution',
    chapters: 'Ch. 1 Systems of linear equations',
    pages: 'pp. 9–28 (print)',
    goals: [
      'jiang:solution-cases', 'jiang:field-axioms', 'jiang:elementary-row-operations', 'jiang:linear-substitution',
    ],
    horizon: 6,
    events: 4,
    feature: 'Follow x+y+z=2 and 2x+3y+z=5 through four stops: choose calculation rules, use reversible row operations, describe the same solutions with new variables, and prove that free coordinates describe every solution exactly once. '
      + 'Read fields → row operations → substitution → classification, or go directly from row operations to the classification proof. '
      + 'The revised Chinese notes include examples, proofs, counterexamples and checks; a finite field gives finitely many parameter choices, while an infinite field with a free coordinate gives infinitely many solutions.',
    highlights: ['Field axioms', 'Elementary row operations', 'Linear substitution', 'The three cases for a linear system'],
  },
  {
    id: 'jiang-jdga-stage-2',
    ordinal: 'Stage 2',
    title: 'Matrices: from operations to the equivalence normal form',
    chapters: 'Ch. 2 First steps in matrix theory',
    pages: 'pp. 29–50 (print)',
    goals: [
      'jiang:matrix-operations', 'jiang:matrix-multiplication', 'jiang:elementary-matrix', 'jiang:invertible-matrix',
      'jiang:block-matrix', 'jiang:matrix-rank', 'jiang:matrix-equivalence',
    ],
    horizon: 10,
    events: 7,
    feature: 'Take the table of coefficients out of a linear system and study it on its own, and you have matrices. The skeleton here is “operations → transformations → invariants”: '
      + 'multiplication is defined first, and immediately shows that it is not commutative and has zero divisors (AB = 0 does not force A or B to vanish); '
      + 'elementary row operations are then read as multiplication by elementary matrices, which turns invertibility into something you can compute; '
      + 'and rank finally collapses every equivalence class to one normal form. This is the book’s first appearance of “reduce the object to a normal form”, a strategy that returns twice (congruence, similarity).',
    highlights: ['Matrix addition and scalar multiplication', 'Matrix multiplication', 'Elementary matrices', 'Invertible matrices', 'Block matrices', 'Rank of a matrix', 'Equivalence normal form'],
  },
  {
    id: 'jiang-jdga-stage-3',
    ordinal: 'Stage 3',
    title: 'Determinants: from area to the product theorem',
    chapters: 'Ch. 3 Foundations of determinants',
    pages: 'pp. 51–76 (print)',
    goals: [
      'jiang:low-order-determinant', 'jiang:permutation-parity', 'jiang:determinant-definition',
      'jiang:determinant-properties', 'jiang:cofactor-expansion', 'jiang:determinant-multiplicative',
      'jiang:cramer-rule',
    ],
    horizon: 10,
    events: 7,
    feature: 'The determinant is the one new object of this stage, but it has three faces: for low order it is signed area and volume, in general it is a sum over permutations with signs, '
      + 'and to actually compute it you expand along a row or column. The point is that the properties do the work — once multilinearity and antisymmetry are written down, '
      + 'the expansion theorem and the product theorem are corollaries, and Cramer’s rule is just the product theorem applied to solving equations: both uniqueness and the formula come from det A ≠ 0.',
    highlights: ['Determinants of low order', 'Inversions of a permutation', 'Definition of the determinant', 'Properties of determinants', 'Expansion by cofactors', 'Multiplicativity of the determinant', 'Cramer’s rule'],
  },
  {
    id: 'jiang-jdga-stage-4',
    ordinal: 'Stage 4',
    title: 'Finite-dimensional spaces: bases, dimension and the structure of solutions',
    chapters: 'Ch. 4 A model of finite-dimensional spaces',
    pages: 'pp. 77–98 (print)',
    goals: [
      'jiang:column-vector-space', 'jiang:linear-dependence', 'jiang:maximal-independent-set',
      'jiang:basis-dimension', 'jiang:coordinate-transition', 'jiang:solution-structure',
    ],
    horizon: 9,
    events: 6,
    feature: 'This stage upgrades “solving a system” into “studying a space”: F^n is the first concrete model, linear dependence and maximal independent subsets answer “how many independent directions are there”, '
      + 'a basis and its dimension pin that number down, and the transition matrix converts between two bases. The stage then returns to systems of equations — '
      + 'the solution set is “one particular solution plus the kernel”, of dimension n − rank A — and the tools of the first three stages meet here. '
      + 'Note that the size of a maximal independent subset does not depend on the basis: that is the whole reason dimension deserves the name.',
    highlights: ['The column space F^n', 'Linear dependence', 'Maximal independent subsets', 'Bases of a space', 'Transition matrices', 'Structure of the solution set'],
  },
  {
    id: 'jiang-jdga-stage-5',
    ordinal: 'Stage 5',
    title: 'Inner products and quadratic forms: adding a metric',
    chapters: 'Ch. 5 Inner products and bilinear forms',
    pages: 'pp. 99–120 (print)',
    goals: [
      'jiang:inner-product', 'jiang:orthogonalization', 'jiang:bilinear-quadratic-form',
      'jiang:quadratic-normal-form', 'jiang:positive-definite',
    ],
    horizon: 8,
    events: 5,
    feature: 'An inner product is **extra structure**: length, angle and orthogonality exist only once it is added, and a vector space is perfectly fine without it. '
      + 'The stage has two halves — the first turns a linearly independent set into an orthonormal basis by Gram–Schmidt and yields the decomposition V = W ⊕ W^⊥; '
      + 'the second generalises the inner product to symmetric bilinear forms and quadratic forms and reduces them to a normal form by completing squares or by an orthogonal change of basis. '
      + 'The watershed is the law of inertia: the numbers of positive and negative squares do not depend on the reduction, so they classify real quadratic forms up to congruence.',
    highlights: ['Inner product', 'Orthogonalisation', 'Quadratic forms', 'Normal form of a quadratic form', 'Positive definite quadratic forms'],
  },
  {
    id: 'jiang-jdga-stage-6',
    ordinal: 'Stage 6',
    title: 'Polynomials in one variable: a second structural line, parallel to the integers',
    chapters: 'Ch. 6 Polynomials in one variable',
    pages: 'pp. 121–148 (print)',
    goals: [
      'jiang:polynomial-ring', 'jiang:division-algorithm', 'jiang:gcd-polynomial', 'jiang:irreducible-polynomial',
      'jiang:polynomial-function', 'jiang:integer-polynomial', 'jiang:partial-fraction', 'jiang:chinese-remainder',
    ],
    horizon: 11,
    events: 8,
    feature: 'Polynomials are the book’s one “parallel structure”: division with remainder, the Euclidean algorithm, Bézout’s identity and unique factorisation each match the integers step for step, '
      + 'proofs included. What matters is which conclusions need the coefficients to lie in a field — once division with remainder holds, greatest common divisors and irreducibility follow; '
      + 'over Z[x] the remainder is not unique, so Gauss’s lemma and Eisenstein’s criterion have to be added. The stage closes with partial fractions and the Chinese remainder theorem, '
      + 'which are uses of unique factorisation rather than new theorems.',
    highlights: ['The polynomial ring in one variable', 'Division with remainder', 'Greatest common divisors', 'Irreducible polynomials', 'Polynomial functions', 'Integer-coefficient polynomials', 'Partial fraction decomposition', 'Chinese remainder theorem'],
  },
  {
    id: 'jiang-jdga-stage-7',
    ordinal: 'Stage 7',
    title: 'Maps and Euclidean operators: the spectral theorem and the SVD',
    chapters: 'Ch. 7 Morphisms of vector spaces; Ch. 8 Operator theory on Euclidean spaces',
    pages: 'pp. 149–196 (print)',
    goals: [
      'jiang:vector-space-axioms', 'jiang:linear-map-matrix', 'jiang:eigenvector', 'jiang:similar-criterion',
      'jiang:fundamental-theorem-algebra-proof', 'jiang:isometry', 'jiang:self-adjoint-spectral',
      'jiang:minimax-principle', 'jiang:normal-operator-calculus', 'jiang:polar-svd',
    ],
    horizon: 13,
    events: 10,
    feature: 'The last two chapters promote every earlier object to a map: vector spaces are axiomatised, a linear map becomes a matrix once bases are chosen, '
      + 'changing the basis is similarity, and eigenvalues give the simplest data in a similarity class (equal characteristic polynomials are only necessary). '
      + 'Chapter 8 then redoes the same work with an inner product present: self-adjoint operators diagonalise **orthogonally** (the spectral theorem), '
      + 'their eigenvalues also have a min–max variational description that no longer needs roots of the characteristic equation, '
      + 'the calculus of normal operators unifies self-adjoint and isometric ones, and everything lands on polar and singular value decomposition — '
      + 'every matrix factors as “positive semidefinite × partial isometry”, with singular values fixed by A^*A.',
    highlights: ['Axiomatic definition of a vector space', 'Matrix representation of a linear map', 'Eigenvalues and eigenvectors', 'Similarity of matrices', 'Fundamental theorem of algebra', 'Isometries', 'Spectral theorem for self-adjoint operators', 'Min–max principle', 'Calculus of normal operators', 'Singular value decomposition'],
  },
];

/** Axler 九程的英文版：目标 id、事件数与事件界与中文版逐字相同，只有文字是英文。 */
const AXLER_STAGES_EN: StageSpec[] = [
  {
    id: 'axler-ladr-stage-1',
    ordinal: 'Stage 1',
    title: 'Vector spaces: from complex numbers and fields to eight axioms',
    chapters: 'Ch. 1 Vector Spaces (1A–1C)',
    pages: 'pp. 1–26 (print)',
    goals: ['axler:complex-numbers', 'axler:field', 'axler:list-fn', 'axler:vector-space', 'axler:subspace', 'axler:direct-sum'],
    horizon: 8,
    events: 6,
    feature: 'Start from the smallest examples: complex numbers and fields first, then abstract the componentwise operations on Fⁿ into eight axioms. '
      + 'The point of this stage is that the axioms are not decoration — the subspace test and the uniqueness of a direct-sum decomposition are immediate consequences. '
      + 'The book brings its own field axioms along (the digression at the end of 1A) instead of assuming prior linear algebra.',
    highlights: ['Complex numbers', 'Fields', 'Lists and Fⁿ', 'Vector spaces', 'Subspaces', 'Direct sums'],
  },
  {
    id: 'axler-ladr-stage-2',
    ordinal: 'Stage 2',
    title: 'Finite-dimensional spaces: span, independence, bases, dimension',
    chapters: 'Ch. 2 Finite-Dimensional Vector Spaces (2A–2C)',
    pages: 'pp. 27–50 (print)',
    goals: ['axler:span', 'axler:linear-independence', 'axler:basis', 'axler:dimension', 'axler:subspace-dimension'],
    horizon: 7,
    events: 5,
    feature: 'This stage does one thing: it makes “coordinates” precise. Span, linear independence, bases and dimension look routine, '
      + 'but two comparisons carry the weight — an independent list is never longer than a spanning list, and any two bases have the same length. '
      + 'The second is the entire reason the word “dimension” is legitimate, and the subspace dimension inequality already appears at the end of the stage.',
    highlights: ['Span', 'Linear independence', 'Bases', 'Dimension', 'Subspaces and dimension'],
  },
  {
    id: 'axler-ladr-stage-3',
    ordinal: 'Stage 3',
    title: 'Linear maps: null spaces, matrices and duality',
    chapters: 'Ch. 3 Linear Maps (3A–3F)',
    pages: 'pp. 51–118 (print)',
    goals: [
      'axler:linear-map', 'axler:null-range', 'axler:fundamental-theorem', 'axler:matrix-of-map',
      'axler:rank-of-matrix', 'axler:invertibility', 'axler:change-of-basis', 'axler:product-quotient',
      'axler:dual-space', 'axler:dual-null-range',
    ],
    horizon: 12,
    events: 10,
    feature: 'The longest stage of the book, and it puts maps rather than matrices in the leading role: linear maps come first, '
      + 'then their null spaces, ranges and the fundamental theorem dim V = dim null T + dim range T. '
      + 'A matrix is what a map looks like once bases are chosen, and the change-of-basis formula says exactly how two such matrices differ. '
      + 'By the end, dual spaces and dual maps supply the language of linear functionals that stages 6 and 9 come back to.',
    highlights: ['Linear maps', 'Null spaces and ranges', 'Fundamental theorem of linear maps', 'Matrix of a linear map', 'Rank of a matrix', 'Invertibility criteria', 'Change of basis', 'Products and quotients', 'Dual space and dual map', 'Null space and range of the dual'],
  },
  {
    id: 'axler-ladr-stage-4',
    ordinal: 'Stage 4',
    title: 'Polynomials: where eigenvalues come from',
    chapters: 'Ch. 4 Polynomials',
    pages: 'pp. 119–131 (print)',
    goals: ['axler:zeros-of-polynomials', 'axler:polynomial-division', 'axler:factorization-over-c', 'axler:factorization-over-r'],
    horizon: 6,
    events: 4,
    feature: 'Four short sections that supply every existence result about eigenvalues later on: zeros ⇒ division with remainder ⇒ '
      + 'the fundamental theorem of algebra ⇒ every complex polynomial factors into linear factors. '
      + 'Its position is deliberate: the minimal polynomial in 5B and the multiplicity relation in 8B both depend on it.',
    highlights: ['Zeros of polynomials', 'Division with remainder', 'Factorisation over C', 'Factorisation over R'],
  },
  {
    id: 'axler-ladr-stage-5',
    ordinal: 'Stage 5',
    title: 'Eigenvalues and eigenvectors: the test lives on the minimal polynomial',
    chapters: 'Ch. 5 Eigenvalues and Eigenvectors (5A–5E)',
    pages: 'pp. 132–180 (print)',
    goals: [
      'axler:eigenvalue', 'axler:eigenvector-independence', 'axler:minimal-polynomial', 'axler:complex-eigenvalue',
      'axler:odd-real-eigenvalue', 'axler:upper-triangular', 'axler:diagonalizable', 'axler:gershgorin',
      'axler:commuting-operators',
    ],
    horizon: 11,
    events: 9,
    feature: 'From “vectors whose direction does not change” to “can this operator be simplified to a diagonal matrix?”. '
      + 'The point of the stage is where the test lands: diagonalisability is decided by whether the minimal polynomial has repeated roots, not by counting eigenvectors; '
      + 'a complex space always has eigenvalues (the fundamental theorem of algebra does the work), while a real space only guarantees them in odd dimensions, '
      + 'and upper-triangular form is the answer to “what can be done when diagonalisation is too much to ask”. '
      + 'Gershgorin disks and commuting operators close the stage with two computable side results.',
    highlights: ['Eigenvalues and eigenvectors', 'Eigenvectors for distinct eigenvalues are independent', 'The minimal polynomial', 'Eigenvalues exist over C', 'Eigenvalues exist in odd real dimensions', 'Existence of upper-triangular form', 'Conditions for diagonalisability', 'Gershgorin disk theorem', 'Commuting operators'],
  },
  {
    id: 'axler-ladr-stage-6',
    ordinal: 'Stage 6',
    title: 'Inner product spaces: length, orthogonality, projection',
    chapters: 'Ch. 6 Inner Product Spaces (6A–6C)',
    pages: 'pp. 181–226 (print)',
    goals: [
      'axler:inner-product', 'axler:cauchy-schwarz', 'axler:orthonormal-list', 'axler:gram-schmidt',
      'axler:riesz-representation', 'axler:orthogonal-decomposition', 'axler:minimal-distance',
    ],
    horizon: 9,
    events: 7,
    feature: 'With an inner product a space finally has length, angle and “perpendicular”. The stage links three things: '
      + 'the Cauchy–Schwarz inequality (how inner product and norm are related), the Gram–Schmidt procedure (turning any independent list into an orthonormal one), '
      + 'and orthogonal decomposition with minimisation (why the projection is the optimal answer). '
      + 'The Riesz representation theorem sits at the end and replaces “duality” by “pair with a vector” — the adjoint in stage 7 is built directly on it.',
    highlights: ['Inner products and norms', 'Cauchy–Schwarz inequality', 'Orthonormal lists', 'Gram–Schmidt procedure', 'Riesz representation theorem', 'Orthogonal complements and decomposition', 'The minimisation problem'],
  },
  {
    id: 'axler-ladr-stage-7',
    ordinal: 'Stage 7',
    title: 'Operators on inner product spaces: spectral theorems and the SVD',
    chapters: 'Ch. 7 Operators on Inner Product Spaces (7A–7F)',
    pages: 'pp. 227–296 (print)',
    goals: [
      'axler:adjoint', 'axler:self-adjoint-normal', 'axler:real-spectral', 'axler:complex-spectral',
      'axler:positive-operator', 'axler:isometry-unitary', 'axler:qr-cholesky', 'axler:svd', 'axler:svd-consequences',
    ],
    horizon: 11,
    events: 9,
    feature: 'The high point of the book: the adjoint promotes “transpose” to a pairing inside the inner product, '
      + 'so self-adjoint, normal, isometric and unitary operators each get their own spectral theorem. '
      + 'Positive operators and square roots are the gateway to the SVD, while QR and Cholesky factorisation are what Gram–Schmidt looks like in matrix form. '
      + 'The SVD writes an arbitrary linear map as “rotate × stretch along coordinates × rotate” and yields four corollaries: operator norm, best low-rank approximation, polar decomposition and volume — '
      + 'this is also where the sample registers an interface with stage 7 of A Concise Text on Advanced Algebra.',
    highlights: ['Adjoints', 'Self-adjoint and normal operators', 'Real spectral theorem', 'Complex spectral theorem', 'Positive operators and square roots', 'Isometries and unitary operators', 'QR and Cholesky factorisation', 'Singular value decomposition', 'Consequences of the SVD'],
  },
  {
    id: 'axler-ladr-stage-8',
    ordinal: 'Stage 8',
    title: 'Operators on complex spaces: generalised eigenspaces and Jordan form',
    chapters: 'Ch. 8 Operators on Complex Vector Spaces (8A–8D)',
    pages: 'pp. 297–331 (print)',
    goals: [
      'axler:generalized-eigenvector', 'axler:generalized-decomposition', 'axler:multiplicity',
      'axler:square-root', 'axler:jordan-form', 'axler:trace',
    ],
    horizon: 8,
    events: 6,
    feature: 'What if there are not enough eigenvectors? This stage relaxes “invariant subspace” into “null space of some power”, '
      + 'so every operator on a complex space splits into a direct sum of generalised eigenspaces, and each block splits further into Jordan blocks. '
      + 'Jordan form is where the classification of similarity ends (unique up to reordering the blocks); '
      + 'the closing section on trace shows that the sum of the diagonal entries belongs to the operator itself, independent of the basis chosen.',
    highlights: ['Generalised eigenvectors and nilpotent operators', 'Generalised eigenspace decomposition', 'Multiplicity and block-diagonal form', 'Square roots of invertible operators', 'Jordan form', 'Trace'],
  },
  {
    id: 'axler-ladr-stage-9',
    ordinal: 'Stage 9',
    title: 'Multilinear algebra: determinants and tensor products',
    chapters: 'Ch. 9 Multilinear Algebra and Determinants (9A–9D)',
    pages: 'pp. 332–382 (print)',
    goals: ['axler:bilinear-form', 'axler:quadratic-form', 'axler:alternating-multilinear', 'axler:determinant', 'axler:tensor-product'],
    horizon: 7,
    events: 5,
    feature: 'The last stage changes direction: instead of operators it studies functions that are linear in each of several variables. '
      + 'The uniqueness of the alternating n-linear form is the definition of the determinant — so det(AB) = det A det B and “invertible ⟺ determinant ≠ 0” '
      + 'become immediate consequences of two properties rather than tricks with expansions. '
      + 'Tensor products close the book by folding this multilinear language back into linear algebra (universal property plus the dimension formula).',
    highlights: ['Bilinear and symmetric bilinear forms', 'Quadratic forms', 'Alternating multilinear forms', 'Determinants', 'Tensor products'],
  },
];

/** 英文版范例集：与 `EXAMPLE_SETS` 同 id、同顺序、同条数、同数字，只有文字是英文。 */
export const EXAMPLE_SETS_EN: ExampleSet[] = [
  {
    id: 'liang-volume-1',
    title: 'Liang Canbin & Zhou Bin, Differential Geometry: An Introduction to General Relativity, vol. 1 — a condensed path',
    shortTitle: 'Liang & Zhou, Differential Geometry and General Relativity, Vol. 1',
    discipline: '相对论与宇宙论',
    source: '梁灿彬、周彬《微分几何入门与广义相对论》上册（第二版），科学出版社，2006，现代物理基础丛书 7，ISBN 978-7-03-016460-5（xi + 442 页，共 10 章）。',
    lead: 'The 442 pages of the ten chapters are condensed into 56 milestone nodes and cut, along the textbook’s own seams, into seven stages: the first five chapters introduce differential geometry, chapter 6 turns to special relativity, and chapters 7–10 are general relativity. '
      + 'Every stage can be planned on this page right away; the event counts on the cards are measured values, not estimates.',
    signature: [
      'The only sample whose nodes **carry body text**: every node has condensed notes, so a route can actually be read once it is walked.',
      'Cut along the textbook’s own seams: the first five chapters build the language (manifolds, tensors, connection, differential forms), chapter 6 turns to special relativity, chapters 7–10 move to the field equations, black holes and cosmology.',
      'Its dependency chain **crosses cases**: topological spaces, continuous maps and tensor fields reuse registrations that already exist elsewhere on the site.',
    ],
    merits: [
      'The only sample you can plan *and* read: node pages carry body text, per-condition counterexamples and review questions.',
      'Each stage has a moderate number of goals and is judged `Found` within its declared event horizon — no stage ends in a route that cannot be planned.',
      'Volume 1 stands alone as one sample, so the whole physics arc is visible in one place: geometry → special relativity → field equations → black holes → cosmology.',
    ],
    limits: [
      'Covers **volume 1 only**, and sections marked as optional reading (§1.3, §5.7, §8.5–§8.8 and others) keep only one node or are left out entirely.',
      'The body text is **condensed notes**, not a substitute for the textbook: no complete proof is transcribed, and evidence is registered as “the textbook argues this”.',
      'The relativity stages lean on physical intuition (simultaneity, proper time, tidal forces); this site claims no teaching effect and has run no learning experiment.',
    ],
    note: 'The sample covers volume 1 only, and it is a **condensation**, not the whole book: sections marked as optional reading in the original (§1.3, §5.7, §8.5–§8.8 and others) keep only one node or are left out entirely. '
      + 'The node texts here are condensed notes, not a substitute for the textbook, and no complete proof from the book has been transcribed — the evidence is registered as “cites the textbook” (REF), not encoded as a machine-checkable certificate.',
    paths: buildPaths(LIANG_BASE_ENTRIES, LIANG_STAGES_EN, 'The starting point is two shared background nodes (no action can produce them; the learner has to confirm them first).', EN_ENTRY_CONTINUATION),
  },
  {
    id: 'rudin-pma',
    title: 'Rudin, Principles of Mathematical Analysis, 3rd ed. — a condensed path',
    shortTitle: 'Rudin, Principles of Mathematical Analysis, 3rd ed.',
    discipline: '分析',
    source: 'Walter Rudin, Principles of Mathematical Analysis, 3rd ed., McGraw-Hill（本机扫描件：reference/paths/数学分析原理 英文版·原书第3版·典藏版.pdf，355 页；章节与页码取自扫描件目录页的 OCR）。',
    lead: 'The 11 chapters are condensed into 55 milestone nodes in seven stages: chapters 1–2 establish the real numbers and topology, chapter 3 sequences and series, '
      + 'chapters 4–5 continuity and differentiation, chapter 6 integration, chapters 7–8 sequences of functions and special functions, chapter 9 functions of several variables, and chapters 10–11 differential forms and Lebesgue theory.',
    signature: [
      'The sample with **names only and an empty body**: it shows the structure first and leaves the content for later.',
      'Chapters and page numbers come from **OCR of the scan’s table of contents** (that PDF has no text layer at all); nodes cite “chapter + section + page” and nothing else.',
      'Its starting point **must include finite-dimensional linear algebra**: chapters 9 and 10 take it as input, and without it stages 6–7 are judged infeasible within the horizon — measured, not guessed.',
    ],
    merits: [
      'Structurally complete: what comes before what, and which step depends on which, are both checkable — enough to judge whether the line is worth walking.',
      'It lays out what analysis needs: completeness of metric spaces, topology and linear algebra are all visible along the route.',
      'Only the table of contents was OCRed, so the source and page numbers can be re-checked cheaply, without waiting for the body text.',
    ],
    limits: [
      '**It cannot be used to learn the content**: every node has `contentRef: false`, and node pages say honestly that no body text has been written.',
      'Page numbers come from OCR and an individual number may be misread (e.g. the start page of §1.23); merging several sections into one node is an editorial choice.',
      'Evidence is registered throughout as “cites the textbook” (REF); nothing is encoded as a machine-checkable certificate.',
    ],
    note: '**In this sample the nodes carry nothing but names; the body text is empty.** As required this round, the 54 concept/claim nodes and 2 method nodes register only '
      + 'title, section/page and dependencies, with `contentRef: false` — opening a node page will say honestly that there is no body text rather than invent filler. '
      + 'It can therefore be used to see **structure** (what comes before what, which step depends on which), but not yet to learn the content. '
      + 'Evidence is registered throughout as “cites the textbook” (REF), `checkStatus: not_run`; the textbook’s statements have not been checked one by one.',
    paths: buildPaths(RUDIN_BASE_ENTRIES, RUDIN_STAGES_EN, 'The starting point is three shared background nodes (sets and functions, quantifiers, finite-dimensional linear algebra; no action can produce them, so the learner has to confirm them first).', EN_ENTRY_CONTINUATION),
  },
  {
    id: 'jiang-jdga',
    title: 'Jiang Jianjian & Lin Xiuqing, A Concise Text on Advanced Algebra — a condensed path',
    shortTitle: 'Jiang & Lin, A Concise Text on Advanced Algebra',
    discipline: '线性代数',
    source: '蒋剑剑、林秀清《简明高等代数》，纸版由厦门大学出版社发行（本机共享版 PDF：reference/paths/简明高等代数（配套教材共享版）.pdf，208 页 PDF / 正文印刷 1–199 页，8 章 44 节；章节与页码取自 PDF 自带书签，PDF 页码 − 6 = 印刷页码）。',
    lead: 'The 8 chapters are condensed into 47 milestone nodes in seven stages: chapter 1 starts from the field axioms and elimination, chapters 2–3 cover matrices and determinants, '
      + 'chapter 4 sets up finite-dimensional spaces, chapter 5 adds inner products and quadratic forms, chapter 6 is the line of polynomials parallel to the integers, '
      + 'and chapters 7–8 promote the objects to maps and close with the spectral theorem, the min–max principle and the singular value decomposition.',
    signature: [
      'It **brings its own field axioms and vector spaces**: “finite-dimensional linear algebra” is deliberately *not* declared as background — the route starts from “what is a number”.',
      'Chapter 6 on polynomials is the book’s one line **parallel to the integers**: division with remainder → Euclidean algorithm → unique factorisation → Chinese remainder theorem.',
      'Gauss elimination, completing the square, the Euclidean algorithm and reduction to a normal form are registered as **method nodes** but are **never route goals** — methods are learned together with the objects.',
    ],
    merits: [
      'The lowest starting point of the four: sets, functions and quantifiers are enough — no prior linear algebra required.',
      '**Dependency order ≠ section order** shows up most clearly here: transition matrices, orthogonalisation and the fundamental theorem of algebra all get ordered last — computed from what depends on what.',
      'Every step points back to a chapter, section and printed page of the textbook, and the event counts stay inside the declared horizon, so any route can be recomputed on the spot.',
    ],
    limits: [
      '**Stage 1 and its elimination method have revised Chinese notes** with a shared example, definitions, proofs, counterexamples and checks. Later stages retain drafts and were not reviewed in this pass.',
      'A condensation, not the whole book: §2.6 (applications of matrices) and the end-of-chapter exercises get no node of their own.',
      'Textbook sections and pages come from bookmarks; the wording has not been checked line by line. The prose proofs have no machine certificate and learning outcomes have not been measured.',
    ],
    note: '**Stage 1 now has revised Chinese reading material** for its four milestones and Gauss elimination: one running example, precise statements, back-substitution proofs, counterexamples, checks and links. '
      + 'Reading order is distinguished from mathematical prerequisites; row operations preserve equality of solution sets and substitution gives a specified bijection. '
      + 'Later stages retain drafts. Textbook wording has not been checked line by line, and machine checking remains not_run. '
      + 'The Chinese lesson text is not translated in this pass; §2.6 and chapter exercises have no separate milestones. Reading or loading a path does not confirm mastery.',
    paths: buildPaths(JIANG_BASE_ENTRIES, JIANG_STAGES_EN, 'The starting point is two shared background nodes (sets and functions, quantifiers; no action can produce them, so the learner has to confirm them first). The book supplies its own field axioms and vector spaces, so “finite-dimensional linear algebra” is deliberately not declared as background here.', EN_ENTRY_CONTINUATION),
  },
  {
    id: 'axler-ladr',
    title: 'Axler, Linear Algebra Done Right, 4th ed. — a condensed path',
    shortTitle: 'Axler, Linear Algebra Done Right, 4th ed.',
    discipline: '线性代数',
    source: 'Sheldon Axler, Linear Algebra Done Right, 4th ed., Springer (Undergraduate Texts in Mathematics; local PDF: reference/paths/Linear Algebra Done Right, 4th Edition (Sheldon Axler) (Z-Library).pdf, 408 PDF pages / printed pages 1–382, 9 chapters; chapters and page numbers come from the PDF’s own bookmarks, printed page = PDF page − 18).',
    lead: 'The 9 chapters are condensed into 61 milestone nodes in nine stages, **one stage per chapter** (the sample with the most stages in this section): '
      + 'chapters 1–2 set up vector spaces, bases and dimension; chapter 3 is the book’s long treatment of linear maps and duality; '
      + 'chapter 4 on polynomials prepares the ground for eigenvalues; chapters 5–8 are about operators (eigenvalues, inner products, spectral theorems, Jordan form); '
      + 'and chapter 9 redefines determinants through multilinear forms. Every stage can be planned on this page right away; the event counts on the cards are measured values.',
    signature: [
      'A textbook about **operators rather than matrices**: a matrix is what a map looks like once a basis is chosen, so rank, invertibility and trace are all discussed on the operator side — which is why the dependency order here differs from most linear algebra courses.',
      '**One stage per chapter** (nine stages): the seams match the textbook exactly, so finishing a stage means finishing a chapter, and picking a stage means picking a chapter.',
      'It **brings its own field axioms and polynomials**: “finite-dimensional linear algebra” is deliberately not declared as background — it starts from complex numbers and fields (the same stance as A Concise Text on Advanced Algebra, so the two can be walked side by side).',
      'Its dependency chain **crosses cases**: the field axioms reuse the `field` case registration, and the SVD is registered as an interface to stage 7 of A Concise Text on Advanced Algebra.',
    ],
    merits: [
      'Nine stages map one-to-one onto the nine chapters, so there is nothing to guess about how the book is divided: pick the chapter you want and that is the stage.',
      'Every stage is judged `Found` within its declared event horizon, and the measured event count equals the number of milestones in that stage: 61 milestones in 61 steps, with no redundant step.',
      'The SVD in stage 7 and determinants in stage 9 offer two lines that retell old material from a new angle: the first links to A Concise Text on Advanced Algebra, the second replaces expansions by multilinear forms.',
    ],
    limits: [
      'The nodes are **names only**: all 61 milestones have `contentRef: false`, so this sample is good for structure and dependencies, **not for learning the content**.',
      'A condensation, not the whole book: 3E (products and quotients) keeps a single node, and the chapter exercises plus the symbol index and photo credits get no nodes at all.',
      'The one-line predicates follow the usual content of each section and have **not** been checked against the textbook wording item by item; theorem numbers are deliberately not cited (Axler’s numbering changes between editions).',
      'The page offset (PDF − 18) was spot-checked against the bookmarks and running heads (PDF 20/100/200 → printed 2/82/182), but the body text was **not OCRed**: theorem and example numbers from the body are not registered.',
    ],
    note: '**The nodes of this sample are names only; the body is empty.** The 61 milestones (26 concepts + 35 claims) and 4 method nodes register a title, a section, a printed page range and dependencies, with `contentRef: false` — opening a node page says honestly that no body text has been written. '
      + 'Chapters and page numbers come from the PDF’s own bookmarks (169 entries); no text from the PDF body is quoted and no theorem numbers are cited. '
      + 'Evidence is registered throughout as “cites the textbook” (REF) with `checkStatus: not_run`.',
    paths: buildPaths(AXLER_BASE_ENTRIES, AXLER_STAGES_EN, 'The starting point is two shared background nodes (sets and functions, quantifiers; no action can produce them, so the learner has to confirm them first). The book supplies its own field axioms and polynomials, so “finite-dimensional linear algebra” is deliberately not declared as background here.', EN_ENTRY_CONTINUATION),
  },
];

/** 成对的四套样本：页面用 `useI18n().pick(EXAMPLE_SETS_BY_LOCALE)` 取。 */
export const EXAMPLE_SETS_BY_LOCALE: { zh: ExampleSet[]; en: ExampleSet[] } = {
  zh: EXAMPLE_SETS,
  en: EXAMPLE_SETS_EN,
};
