/**
 * 「无关系节点」的清单与原因分类。
 *
 * 背景：本站的公共本体里有一百多个节点**不作为任何语义关系的端点**。这本身不一定是缺口——
 * 关系不是唯一的表达方式（行动契约、证据、支持族都在表达依赖），但「不连」必须能被分类，
 * 否则读者分不清「设计如此」与「忘了登记」。这份模块把分类写成可核对的规则 + 显式的待办清单。
 *
 * 五类（第 1–4 类是设计取值，第 5 类是**缺陷**）：
 *
 * | 类 | 含义 | 现在有多少个 |
 * |---|---|---|
 * | `background` | 背景接口（`bg:`）：按设计只在契约与边界里被引用；其中几个另有一条「背景 → 案例核心」的硬前置 | 见 `relationCoverage()` |
 * | `thread` | 话题级条目：**线索层**，不参与前置计算（2026-10 起，见 `web/src/network.ts` 的线索层） | 同上 |
 * | `contract-only` | 由契约引入的任务、方法、例子、反例、误区与证书：依赖已经写在行动契约里 | 同上 |
 * | `pending` | **尚待登记**：单元级的概念 / 断言 / 构造，语义关系仍是欠账（清单见下） | 同上 |
 * | `isolated` | **完全孤立**：既没有语义关系，也没有任何行动契约——这是缺陷，必须为 0 | 同上 |
 *
 * 规则只读数据（节点、关系、契约、粒度），不写死节点名单；`PENDING_RELATION_REGISTRATION`
 * 是唯一的显式清单，里面逐条写清「欠什么」。
 */

export const RELATIONLESS_CLASSES = [
  {
    id: 'background',
    title: '背景接口',
    note: 'bg: 节点是环境边界的声明（实数度量、拓扑、线性代数、群公理模板…）。按设计只在行动契约与边界引用里出现；2026-10 起其中 4 个还各有一条「背景 → 案例核心」的硬前置。',
  },
  {
    id: 'thread',
    title: '线索层（话题级条目）',
    note: '话题级条目是一条学习线索的名字，不是可独立认知的单元：它在网络里单独成层，也不参与前置计算，因此不登记语义关系是有意的。',
  },
  {
    id: 'contract-only',
    title: '由契约引入（本就不连语义关系）',
    note: '方法、练习、例子、反例、误区模式与证书片段由 mode=method/task/evidence 的行动引入；它们与对象的联系写在契约的输入输出里，再补一条语义关系只会重复。',
  },
  {
    id: 'pending',
    title: '尚待登记',
    note: '单元级的概念 / 断言 / 构造：它理应有一条语义关系（定义性依赖或推导依赖），目前只有契约。清单与欠的内容见 PENDING_RELATION_REGISTRATION。',
  },
  {
    id: 'isolated',
    title: '完全孤立（缺陷）',
    note: '既不是任何关系的端点，也不是任何契约的输入或输出：在网络视图里无法被引入，节点页的「行动」一栏永远是空的。这一类必须为空。',
  },
];

/** 参与「尚待登记」判定的构造：这几类是「对象 / 命题」本身。 */
const PRIMARY_CONSTRUCTS = ['Concept', 'Claim', 'Construction', 'Theory', 'Symbol'];

/**
 * 尚待登记的清单：`节点 id → 欠什么`。
 *
 * 这一份**就是待办列表**，不是「设计如此」的说明；每补一条关系就把它从这里删掉
 * （`tests/relation-coverage.test.mjs` 会核对：清单里的节点确实还没有关系，
 * 而清单外的单元级概念 / 断言 / 构造不得出现「无关系且无说明」的情况）。
 */
export const PENDING_RELATION_REGISTRATION = {
  // ---- manifold：两条断言与构造之间只有契约 ----
  'manifold:claim-max': '与构造 manifold:max-k 之间应有「构造 → 断言」的关系（现在是引入它的行动契约）。',
  'manifold:claim-generalization': '与 manifold:smooth-atlas / manifold:ck-atlas 之间应有陈述级关系（现在只在契约里）。',

  // ---- dg：两条「同一结论的概念版与断言版」------
  'dg:claim-tangent-equivalence': '与 dg:tangent-vector-equivalence 是同一结论的两种登记，两者之间没有关系，只有各自的行动契约。',
  'dg:claim-d-squared-zero': '与 dg:d-squared-zero 同上：概念版与断言版之间缺少一条显式关系。',

  // ---- liang：主干已登记，次一级里程碑仍欠 ----
  'liang:compactness': '与 liang:topological-space 之间应有定义性依赖（开覆盖用开集定义），本轮只登记了主干。',
  'liang:dual-vector-field': '与 liang:vector-field / liang:tensor-field 之间应有定义性依赖（对偶矢量场是 (0,1) 型张量场）。',
  'liang:minkowski-spacetime': '与 liang:manifold / liang:metric-tensor 之间应有定义性依赖（闵氏度规是平直时空的度规）。',
  'liang:birkhoff-theorem': '与 liang:schwarzschild-solution 之间应有推导依赖（Birkhoff 定理的结论说的是球对称真空解必为施瓦西解）。',
  'liang:reissner-nordstrom': '与 liang:einstein-equation 之间应有「解 → 方程」关系（与施瓦西解同一形状）。',

  // ---- rudin：第 5–11 章的其余里程碑 ----
  'rudin:extended-real': '与 rudin:least-upper-bound 之间应有定义性依赖（扩充实数系是为上确界写的）。',
  'rudin:complex-field': '与 rudin:ordered-field 之间缺乏关系（两个数系结构之间只通过节点顺序相邻）。',
  'rudin:euclidean-space': '与 rudin:metric-space 之间应有定义性依赖（R^k 的度量由内积给出）。',
  'rudin:bolzano-weierstrass': '与 rudin:convergent-sequence / rudin:compact-set 之间应有推导依赖。',
  'rudin:continuous-function': '与 rudin:function-limit 之间应有定义性依赖（连续 = 极限等于函数值）。',
  'rudin:lhospital-rule': '与 rudin:mean-value-theorem 之间应有推导依赖（法则的证明用中值定理）。',
  'rudin:taylor-theorem': '与 rudin:mean-value-theorem 之间应有推导依赖（Taylor 定理是广义中值定理）。',
  'rudin:vector-derivative': '与 rudin:derivative / rudin:linear-transformation 之间应有定义性依赖。',
  'rudin:riemann-stieltjes': '与 rudin:derivative 之间应有定义性依赖（Stieltjes 积分用 α 的差分与有界变差）。',
  'rudin:integral-properties': '与 rudin:riemann-stieltjes 之间应有关系（性质是对该积分的性质）。',
  'rudin:fundamental-theorem': '与 rudin:riemann-stieltjes / rudin:derivative 之间应有推导依赖。',
  'rudin:rectifiable-curve': '与 rudin:derivative 之间应有定义性依赖（可求长用分割与上和）。',
  'rudin:uniform-convergence': '与 rudin:convergent-sequence 之间应有定义性依赖（一致收敛是在函数空间上的一致 Cauchy 条件）。',
  'rudin:equicontinuous': '与 rudin:uniform-convergence / rudin:continuity-compactness 之间应有定义性依赖。',
  'rudin:stone-weierstrass': '与 rudin:uniform-convergence / rudin:continuous-function 之间应有推导依赖。',
  'rudin:fourier-series': '与 rudin:trigonometric-functions / rudin:l2-space 之间应有定义性依赖。',
  'rudin:gamma-function': '与 rudin:integral-properties 之间应有定义性依赖（Γ 由含参积分定义）。',
  'rudin:rank-theorem': '与 rudin:implicit-function-theorem / rudin:linear-transformation 之间应有推导依赖。',
  'rudin:lebesgue-measure': '与 rudin:set-function 之间应有定义性依赖。',
  'rudin:measurable-function': '与 rudin:lebesgue-measure 之间应有定义性依赖。',
  'rudin:lebesgue-integral': '与 rudin:measurable-function 之间应有定义性依赖。',
  'rudin:l2-space': '与 rudin:lebesgue-integral 之间应有定义性依赖。',
  'rudin:trigonometric-functions': '与 rudin:exponential-logarithm 之间应有定义性依赖（三角函数由指数函数定义）。',
  'rudin:algebraic-completeness': '与 rudin:complex-field 之间应有关系（代数完备性是关于这个域的性质）。',
  'rudin:set-function': '与 rudin:lebesgue-measure 之间应有定义性依赖（测度是一种集合函数）。',
};

/**
 * 分类一个**没有语义关系**的节点。返回 `null` 表示它有语义关系（不该出现在报告里）。
 *
 * @param node         节点
 * @param context      { hasContract: boolean }
 */
export function classifyRelationless(node, context = {}) {
  if (node.id.startsWith('bg:')) return 'background';
  if (node.granularity === 'topic') return 'thread';
  if (PENDING_RELATION_REGISTRATION[node.id]) return 'pending';
  if (!context.hasContract) return 'isolated';
  if (PRIMARY_CONSTRUCTS.includes(node.construct)) return 'pending';
  return 'contract-only';
}

/**
 * 报告：无关系节点的分类、计数与清单。
 *
 * 只读数据：关系端点、行动契约端点、节点自身的粒度与构造。
 */
export function relationCoverage(nodes, relations, actions) {
  const relationEndpoints = new Set();
  for (const relation of relations) { relationEndpoints.add(relation.from); relationEndpoints.add(relation.to); }
  const contractEndpoints = new Set();
  for (const action of actions) {
    for (const input of action.inputs) contractEndpoints.add(input.node);
    for (const output of action.outputs) contractEndpoints.add(output.node);
  }
  const items = [];
  for (const node of nodes) {
    if (relationEndpoints.has(node.id)) continue;
    const cls = classifyRelationless(node, { hasContract: contractEndpoints.has(node.id) });
    items.push({
      id: node.id,
      case: node.case,
      construct: node.construct,
      title: node.title,
      granularity: node.granularity ?? 'unit',
      hasContract: contractEndpoints.has(node.id),
      cls,
      why: PENDING_RELATION_REGISTRATION[node.id]
        ?? RELATIONLESS_CLASSES.find((entry) => entry.id === cls)?.note
        ?? '',
    });
  }
  const counts = Object.fromEntries(RELATIONLESS_CLASSES.map((entry) => [entry.id, 0]));
  for (const item of items) counts[item.cls] = (counts[item.cls] ?? 0) + 1;
  const byCase = {};
  for (const item of items) {
    byCase[item.case] ??= {};
    byCase[item.case][item.cls] = (byCase[item.case][item.cls] ?? 0) + 1;
  }
  return {
    totalNodes: nodes.length,
    withRelations: nodes.length - items.length,
    relationless: items.length,
    counts,
    byCase,
    items,
  };
}

/** 报告的自检：待办清单必须真的还没有关系、且不能指向不存在的节点。 */
export function relationCoverageProblems(nodes, relations) {
  const problems = [];
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const endpoints = new Set();
  for (const relation of relations) { endpoints.add(relation.from); endpoints.add(relation.to); }
  for (const [id, why] of Object.entries(PENDING_RELATION_REGISTRATION)) {
    if (!byId.has(id)) problems.push(`待办清单引用了不存在的节点：${id}`);
    else if (endpoints.has(id)) problems.push(`待办清单里的 ${id} 已经有语义关系了，请从清单里删掉`);
    if (!why || why.length < 8) problems.push(`待办清单缺少说明：${id}`);
  }
  return problems;
}
