/**
 * 数学对象的尺度登记（**暂定迁移投影**，2026-10-17）。
 *
 * ## 它是什么，不是什么
 *
 * 最新专稿把公共知识对象分成六级：
 *
 *     原子 → 分子 → 节点 → 单元 → 话题 → 子学科
 *
 * 本文件只登记网络视图需要的四层（分子 / 节点 / 单元 / 话题），且**不重写**
 * `data/cases/*.mjs` 里已有的聚合、粒度与正文。它是从现有 `aggregates` 派生出来的一份
 * **展示投影**：`core/scale.mjs` 按下面的规则构建，`GET /api/v2/ontology/scale` 只读下发。
 *
 * 因此：
 *
 * - 它**不进入** `ontology.contentHash`，不会让既有档案、关系检查或保存视图失效；
 * - 单元/话题标 `provisional: true`、`evidenceStatus: 'ILLUSTRATION'`，界面必须如实标
 *   「迁移登记」，不得说成六级模型下的最终判定；
 * - 分子是逐条显式登记的中心对象，来源写在每条记录里；
 * - 将来分类审核通过后，把这份登记提升进本体，再统一升版本号。
 *
 * ## 映射裁决（逐条列出，不靠脚本猜）
 *
 * | 来源 | 映射 |
 * |---|---|
 * | 11 个内聚的 `kind:'topic'` 聚合 | 聚合整体 = 一个单元 |
 * | 4 条教材凝练路径（liang / rudin / jiang / axler） | 每个 block = 一个单元；聚合本身 = 路径组，不是画布尺度对象 |
 * | 2 个显式话题 | 成员是单元 id；允许交叉归属 |
 * | 9 个显式分子 | 父节点 + 中心表达式 + 原子明细 |
 *
 * 选「聚合整体 = 单元」而不是「每个 block = 单元」，是因为这 11 个聚合本身已经是
 * 一个对象族/工具族（例如「极限与连续」「C^k 与光滑流形」「微分几何：机制与切空间」）；
 * 教材凝练路径整体不是单元（一本书的阅读顺序），它的块才是可连续展开的模块。
 *
 * `core/scale.mjs` 的校验要求：**每个 `kind:'topic'` 聚合都必须在这里恰好出现一次**。
 * 数据新增聚合而这里没登记时，`npm run check` 与尺度接口都会红——不允许静默漏掉。
 */

export const SCALE_SCHEMA = 'mcs-scale-plan/1';
export const SCALE_STATUS = 'provisional-migration';

/**
 * 四层尺度。`sigma` 沿用专稿定义 9.1 的 0–5 编号，本视图只取 1–4。
 *
 * 卡片尺寸不在这里：它是屏幕像素的展示取值，住在 `web/src/scale-network.ts`，
 * 由 `data/design-values.mjs` 登记核对，避免数据层与展示层各写一份。
 */
export const SCALE_LEVELS = [
  { id: 'molecule', sigma: 1, title: '分子', titleEn: 'Molecule', parent: 'node' },
  { id: 'node', sigma: 2, title: '节点', titleEn: 'Node', parent: 'unit' },
  { id: 'unit', sigma: 3, title: '单元', titleEn: 'Unit', parent: 'topic' },
  { id: 'topic', sigma: 4, title: '话题', titleEn: 'Topic', parent: null },
];

/**
 * 教材凝练路径：其 block 各自成为一个单元，聚合本身只作面板分组，不是尺度对象。
 */
export const PATH_GROUPS = [
  {
    id: 'path:agg-liang-volume-1',
    aggregateId: 'agg-liang-volume-1',
    note: '教材凝练路径：阅读顺序不是单元；这里只用于把该书的 12 个块单元分组显示。',
  },
  {
    id: 'path:agg-rudin-pma',
    aggregateId: 'agg-rudin-pma',
    note: '教材凝练路径：阅读顺序不是单元；这里只用于把该书的 12 个块单元分组显示。',
  },
  {
    id: 'path:agg-jiang-jdga',
    aggregateId: 'agg-jiang-jdga',
    note: '教材凝练路径：阅读顺序不是单元；这里只用于把该书的 9 个块单元分组显示。',
  },
  {
    id: 'path:agg-axler-ladr',
    aggregateId: 'agg-axler-ladr',
    note: '教材凝练路径：阅读顺序不是单元；这里只用于把该书的 10 个块单元分组显示。',
  },
];

/**
 * 每个 `kind:'topic'` 聚合的映射方式。
 *
 * - `aggregate`：整条聚合 = 一个单元；
 * - `blocks`：每个 block = 一个单元，必须给出 `pathId`（指向 PATH_GROUPS）。
 *
 * `title` / `organization` 省略时由 `core/scale.mjs` 从聚合标题、聚合 note 与成员生成；
 * 生成标题会标 `titleSource: 'derived'`，界面必须显示「标题待审」而不是冒充人工命名。
 */
export const UNIT_SOURCES = {
  // 11 个内聚聚合：整体即对象族/工具族。
  'agg-limit': { mode: 'aggregate' },
  'agg-manifold': { mode: 'aggregate' },
  'agg-tensor': { mode: 'aggregate' },
  'agg-group': { mode: 'aggregate' },
  'agg-dg': { mode: 'aggregate' },
  'agg-top-foundation': { mode: 'aggregate' },
  'agg-top-compactness': { mode: 'aggregate' },
  'agg-top-manifold': { mode: 'aggregate' },
  'agg-top-counterexample': { mode: 'aggregate' },
  'agg-top-method': { mode: 'aggregate' },
  'agg-vault-analysis': { mode: 'aggregate' },
  'agg-newvault': { mode: 'aggregate' },

  // 4 条教材路径：聚合只作路径组，块作单元。
  'agg-liang-volume-1': { mode: 'blocks', pathId: 'path:agg-liang-volume-1' },
  'agg-rudin-pma': {
    mode: 'blocks',
    pathId: 'path:agg-rudin-pma',
    titleOverrides: {
      // 第 6 块（下标 5）是积分一节；给它一个人工标题，避免「黎曼–施蒂尔杰斯积分、积分性质…等 4 项」这种长串。
      5: '黎曼–施蒂尔杰斯积分与积分性质',
    },
  },
  'agg-jiang-jdga': { mode: 'blocks', pathId: 'path:agg-jiang-jdga' },
  'agg-axler-ladr': { mode: 'blocks', pathId: 'path:agg-axler-ladr' },
};

/**
 * 显式话题：围绕共同问题组织若干单元。成员允许交叉归属（同一单元可属于多个话题）。
 *
 * 这里只登记两条能在专稿例子里找到依据的话题；其余单元在面板里以「未归话题」分组，
 * 不为了凑满而编一个话题。
 */
export const TOPICS = [
  {
    id: 'topic:manifold-calculus',
    title: '流形上的微积分',
    members: ['unit:agg-manifold', 'unit:agg-dg', 'unit:agg-tensor'],
    organization: '围绕「流形上的微分、积分与张量场」这组共同问题，组织 C^k 与光滑流形、微分几何机制、张量与张量场三个单元；成员允许交叉归属，整体联系不读成整体先修。',
    source: 'mcs-foundations/notes/数学对象六级尺度模型.md §3；mcs-foundations/09-话题、领域、学科与元理论.md §9.4 的示例「流形上的微积分」',
    evidenceStatus: 'ILLUSTRATION',
  },
  {
    id: 'topic:point-set-topology',
    title: '点集拓扑：从空间到图册',
    members: [
      'unit:agg-top-foundation',
      'unit:agg-top-compactness',
      'unit:agg-top-manifold',
      'unit:agg-top-counterexample',
      'unit:agg-top-method',
    ],
    organization: '围绕「空间能分辨多少信息、哪些结构可比较、紧性如何传递」组织点集拓扑案例的五个单元；概念、断言、反例与方法分属不同单元。',
    source: 'data/cases/top.mjs 的五个聚合；组织依据按六级模型的「共同问题」读法整理',
    evidenceStatus: 'ILLUSTRATION',
  },
];

/**
 * 显式分子：节点的中心对象，取自专稿实例或节点已登记的形式表达式。
 *
 * `atoms` 是人工拆出的原子明细，**不**用字符串正则去切公式：尺度相对语法，
 * 自动切分会在 `∧`/`⇒`/`¬` 的嵌套与优先级上出错。`formulaStatus` 说明表达式本身
 * 在节点数据里的登记状态，`evidenceStatus` 说明「把它判为分子」的证据状态。
 */
export const MOLECULES = [
  {
    id: 'mol:top:topological-manifold',
    node: 'top:topological-manifold',
    title: 'P_n = H ∧ (C ∧ L_n)',
    expression: 'P_n(X) ⇔ H(X) ∧ C(X) ∧ L_n(X)',
    construct: 'And(H, And(C, L_n))',
    atoms: [
      { label: 'H', meaning: 'Hausdorff' },
      { label: 'C', meaning: '第二可数' },
      { label: 'L_n', meaning: '局部欧氏，维数为 n' },
    ],
    source: 'mcs-foundations/notes/数学对象六级尺度模型.md §4；mcs-foundations/09-话题、领域、学科与元理论.md §9.8 的拓扑流形实例链',
    formulaStatus: 'ILLUSTRATION',
    evidenceStatus: 'ILLUSTRATION',
  },
  {
    id: 'mol:top:claim-compact-normal',
    node: 'top:claim-compact-normal',
    title: 'Compact(X) ∧ T2(X) ⇒ Normal(X)',
    expression: 'Compact(X) ∧ T2(X) ⇒ Normal(X)',
    construct: 'Implies(And(Compact(X), T2(X)), Normal(X))',
    atoms: [
      { label: 'Compact(X)', meaning: 'X 紧' },
      { label: 'T2(X)', meaning: 'X 是 Hausdorff 空间' },
      { label: 'Normal(X)', meaning: 'X 正规' },
    ],
    source: 'data/cases/top.mjs 的 top:claim-compact-normal / formal.formula',
    formulaStatus: 'DEF',
    evidenceStatus: 'ILLUSTRATION',
  },
  {
    id: 'mol:top:claim-compact-paracompact',
    node: 'top:claim-compact-paracompact',
    title: 'Compact(X) ∧ T2(X) ⇒ Paracompact(X)',
    expression: 'Compact(X) ∧ T2(X) ⇒ Paracompact(X)',
    construct: 'Implies(And(Compact(X), T2(X)), Paracompact(X))',
    atoms: [
      { label: 'Compact(X)', meaning: 'X 紧' },
      { label: 'T2(X)', meaning: 'X 是 Hausdorff 空间' },
      { label: 'Paracompact(X)', meaning: 'X 仿紧' },
    ],
    source: 'data/cases/top.mjs 的 top:claim-compact-paracompact / formal.formula',
    formulaStatus: 'DEF',
    evidenceStatus: 'ILLUSTRATION',
  },
  {
    id: 'mol:top:claim-metric-paracompact',
    node: 'top:claim-metric-paracompact',
    title: 'MetricSpace(X) ⇒ Paracompact(X) ∧ Normal(X)',
    expression: 'MetricSpace(X) ⇒ Paracompact(X) ∧ Normal(X)',
    construct: 'Implies(MetricSpace(X), And(Paracompact(X), Normal(X)))',
    atoms: [
      { label: 'MetricSpace(X)', meaning: 'X 是度量空间' },
      { label: 'Paracompact(X)', meaning: 'X 仿紧' },
      { label: 'Normal(X)', meaning: 'X 正规' },
    ],
    source: 'data/cases/top.mjs 的 top:claim-metric-paracompact / formal.formula',
    formulaStatus: 'DEF',
    evidenceStatus: 'ILLUSTRATION',
  },
  {
    id: 'mol:top:claim-a2-a1',
    node: 'top:claim-a2-a1',
    title: 'A2(X) ⇒ A1(X)',
    expression: 'A2(X) ⇒ A1(X)',
    construct: 'Implies(A2(X), A1(X))',
    atoms: [
      { label: 'A2(X)', meaning: 'X 第二可数' },
      { label: 'A1(X)', meaning: 'X 第一可数' },
    ],
    source: 'data/cases/top.mjs 的 top:claim-a2-a1 / formal.formula',
    formulaStatus: 'DEF',
    evidenceStatus: 'ILLUSTRATION',
  },
  {
    id: 'mol:top:claim-a2-separable',
    node: 'top:claim-a2-separable',
    title: 'A2(X) ⇒ Separable(X)',
    expression: 'A2(X) ⇒ Separable(X)',
    construct: 'Implies(A2(X), Separable(X))',
    atoms: [
      { label: 'A2(X)', meaning: 'X 第二可数' },
      { label: 'Separable(X)', meaning: 'X 可分' },
    ],
    source: 'data/cases/top.mjs 的 top:claim-a2-separable / formal.formula',
    formulaStatus: 'DEF',
    evidenceStatus: 'ILLUSTRATION',
  },
  {
    id: 'mol:top:claim-sigma-local-not-compact',
    node: 'top:claim-sigma-local-not-compact',
    title: '∃X: SigmaCompact(X) ∧ LocallyCompact(X) ∧ ¬Compact(X)',
    expression: '∃X: SigmaCompact(X) ∧ LocallyCompact(X) ∧ ¬Compact(X)',
    construct: 'Exists(X, And(SigmaCompact(X), LocallyCompact(X), Not(Compact(X))))',
    atoms: [
      { label: '∃X', meaning: '存在一个空间 X' },
      { label: 'SigmaCompact(X)', meaning: 'X σ-紧' },
      { label: 'LocallyCompact(X)', meaning: 'X 局部紧' },
      { label: '¬Compact(X)', meaning: 'X 不紧' },
    ],
    source: 'data/cases/top.mjs 的 top:claim-sigma-local-not-compact / formal.formula',
    formulaStatus: 'DEF',
    evidenceStatus: 'ILLUSTRATION',
  },
  {
    id: 'mol:top:claim-cofinite-t1-not-t2',
    node: 'top:claim-cofinite-t1-not-t2',
    title: 'CofiniteSpace(ℝ) ⇒ T1(ℝ) ∧ ¬T2(ℝ) ∧ Compact(ℝ) ∧ ¬Normal(ℝ)',
    expression: 'CofiniteSpace(ℝ) ⇒ T1(ℝ) ∧ ¬T2(ℝ) ∧ Compact(ℝ) ∧ ¬Normal(ℝ)',
    construct: 'Implies(CofiniteSpace(R), And(T1(R), Not(T2(R)), Compact(R), Not(Normal(R))))',
    atoms: [
      { label: 'CofiniteSpace(ℝ)', meaning: 'ℝ 携带有限补拓扑' },
      { label: 'T1(ℝ)', meaning: 'ℝ 是 T1 空间' },
      { label: '¬T2(ℝ)', meaning: 'ℝ 不是 Hausdorff 空间' },
      { label: 'Compact(ℝ)', meaning: 'ℝ 紧' },
      { label: '¬Normal(ℝ)', meaning: 'ℝ 不正规' },
    ],
    source: 'data/cases/top.mjs 的 top:claim-cofinite-t1-not-t2 / formal.formula',
    formulaStatus: 'DEF',
    evidenceStatus: 'ILLUSTRATION',
  },
  {
    id: 'mol:top:claim-connected-intermediate',
    node: 'top:claim-connected-intermediate',
    title: 'Connected(X) ∧ Continuous(f) ⇒ Connected(f(X))',
    expression: 'Connected(X) ∧ Continuous(f) ⇒ Connected(f(X))',
    construct: 'Implies(And(Connected(X), Continuous(f)), Connected(f(X)))',
    atoms: [
      { label: 'Connected(X)', meaning: 'X 连通' },
      { label: 'Continuous(f)', meaning: 'f 连续' },
      { label: 'Connected(f(X))', meaning: '像 f(X) 连通' },
    ],
    source: 'data/cases/top.mjs 的 top:claim-connected-intermediate / formal.formula',
    formulaStatus: 'DEF',
    evidenceStatus: 'ILLUSTRATION',
  },
];

/**
 * 面板与详情里固定显示的说明。中文是源语言；英文版在界面层另写（PAGE_TEXT），
 * 不把这段说明当作已翻译的数据。
 */
export const SCALE_NOTES = [
  '旧版内容组织：本视图保留原有阅读卡片的布局兼容；含“节点”的层级不是新版数学对象尺度。新版五级形式结构见“形式对象与阅读节点”入口。',
  '单元/话题是从现有聚合派生出来的迁移登记（provisional），不是六级模型下的最终分类；标题生成或沿用聚合标题，组织依据待逐条复审。',
  '分子是逐条显式登记的中心对象；没有登记中心分子的节点不能分裂到分子层，界面会如实说明。',
  '不是每个节点都已有单元：当前 405 个节点里只有一部分进入聚合块，其余作为无单元的节点根显示，缩小时不会强行合并。',
  '合拢只改变显示，不改变成员与关系；聚合边读作存在联系（R∃），不代表整体先修。',
];
