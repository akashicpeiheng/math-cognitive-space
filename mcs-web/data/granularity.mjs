/**
 * 条目粒度（`unit` / `topic`）的**判据**与**逐条判定结果**。
 *
 * 判据与判定结果必须放在同一处：只写判据，没人知道哪些条目真判过；
 * 只写结果，没人知道凭什么。这里两者都有，而且**可以被断言核对**——
 * 一个标题里出现并列词的条目，要么在 `TOPIC_REASONS` 里（判为话题），
 * 要么在 `UNIT_REASONS` 里（判为单元，且写明为什么）。没有第三种可能。
 *
 * ## 判据
 *
 * 节点是**最小的可独立认知单元**：一读就知道「它在讲哪一个对象」。
 * 当一个条目的标题把两个以上独立对象并列（含「、」「与」「及」「和」），
 * 或者它本身是一节/一章的范围（如「宇宙学原理与空间几何」），它就是**话题**：
 * 那是一条学习线索的名字，不是可独立认知的单元。
 *
 * 三条例外规则（同样可核对，写在下面的登记表里）：
 *
 * 1. **任务与方法不判**：`Method` / `Problem` / `Proof` / `MisconceptionPattern` /
 *    `Example` / `Counterexample` 的标题描述的是任务、方法或示例，标题里的并列词是任务描述
 *    （「用维数计数区分同构与同构的具体实现」是一个方法，不是两个对象）。
 * 2. **背景接口不判**：`bg:` 节点是环境边界的声明，按设计就把若干基础概念收在一个接口里
 *    （「函数、复合与逆」），粒度是**接口粒度**；它们同时是规划器的「可用背景」，
 *    判成话题会让背景网格与前置计算失去对象。
 * 3. **同一条命题的两个名字不算并列**：如「ε–δ 与序列定义的等价」，
 *    标题里的两个名字是同一条等价命题的两端，不是两个可独立认知的对象。
 *
 * ## 判定结果
 *
 * `TOPIC_REASONS` 是话题清单（id → 为什么是话题），`UNIT_REASONS` 是**判为单元的例外**
 * （标题命中并列词或范围特征，但判为单元，同样写明理由）。
 * 只有命中并列词、或落在上面三条例外之外的条目才需要登记；其余条目按构造默认 `unit`。
 */
export const TOPIC_TITLE_HINTS = ['、', '与', '及', '和'];

export function isTopicTitle(title) {
  return TOPIC_TITLE_HINTS.some((hint) => String(title ?? '').includes(hint));
}

export const GRANULARITY_VALUES = Object.freeze(['unit', 'topic']);

/** 参与单元 / 话题之分的构造类型：其余构造描述的是任务、方法或示例。 */
export const GRANULARITY_CONSTRUCTS = Object.freeze(['Concept', 'Claim', 'Construction']);

/**
 * 话题清单：`节点 id → 判定理由`。
 *
 * 前 36 条是第五十二轮逐条判过的 `liang` 案例（当时写在 `data/cases/liang.mjs` 的局部
 * `TOPIC_SLUGS` 里）；其余是 2026-10 对其余案例按同一判据复核后补进来的
 * （`manifold` 1 条、`rudin` 16 条）。
 */
export const TOPIC_REASONS = {
  // ---- liang（梁灿彬《微分几何入门与广义相对论》上册凝练路径，第五十二轮判定）----
  'liang:continuous-map': '并列「连续映射」与「同胚」两个各自可独立定义的对象。',
  'liang:tensor-field': '并列「张量场」与「缩并」两个对象。',
  'liang:christoffel': '并列「与度规适配的导数算符」与「克氏符」两个对象。',
  'liang:ricci-einstein': '并列里奇张量、标量曲率与爱因斯坦张量三个对象。',
  'liang:intrinsic-extrinsic-curvature': '并列内禀曲率与外曲率两个对象。',
  'liang:pushforward-pullback': '并列流形间的映射、推前与拉回三块内容。',
  'liang:hypersurface': '并列超曲面与法矢量两个对象。',
  'liang:differential-form': '并列微分形式与外积两个对象。',
  'liang:exterior-derivative': '并列外微分与闭形式（含恰当形式）两个对象。',
  'liang:volume-element': '并列体元与流形上的积分两个对象。',
  'liang:gauss-theorem': '并列 Gauss 定理与 Hodge 对偶微分形式两个对象。',
  'liang:proper-time': '并列固有时与坐标时两个对象。',
  'liang:kinematic-effects': '并列尺缩、钟慢与孪子效应三个运动学结果。',
  'liang:four-momentum': '并列 4 维速度、4 维动量与质点动力学三块内容。',
  'liang:energy-momentum-tensor': '并列能动张量与理想流体两个对象。',
  'liang:electromagnetic-tensor': '并列电磁场张量与麦克斯韦方程两个对象。',
  'liang:four-potential': '并列电磁 4 势与光波多普勒效应两个对象。',
  'liang:gravity-as-geometry': '并列「引力」与「时空几何」，是一节的整段范围。',
  'liang:equivalence-principle': '并列等效原理与局部惯性系两个对象。',
  'liang:fermi-transport': '并列费米移动与无自转观者两个对象。',
  'liang:tidal-deviation': '并列潮汐力与测地偏离方程两个对象。',
  'liang:linearized-gravity': '并列线性近似、牛顿极限与引力辐射三块内容。',
  'liang:static-stationary': '并列稳态、静态与球对称三类时空。',
  'liang:np-formalism': '并列 Newman–Penrose 形式与规范自由性两个对象。',
  'liang:schwarzschild-geodesics': '一节的整段范围：施瓦西时空里的各类测地线（类时、类光、束缚与散射轨道）。',
  'liang:classical-tests': '一节的整段范围：广义相对论的三类经典检验。',
  'liang:stellar-interior': '并列球对称恒星内部解与恒星演化两个对象。',
  'liang:kruskal-extension': '并列 Kruskal 延拓与无限红移面两个对象。',
  'liang:schwarzschild-black-hole': '并列引力坍缩与施瓦西黑洞两个对象。',
  'liang:cosmological-principle': '并列宇宙学原理与等曲率空间几何（用户点名的例子）。',
  'liang:hubble-redshift': '并列哈勃定律与宇宙学红移两个对象。',
  'liang:scale-factor': '并列尺度因子演化与宇宙学常数两个对象。',
  'liang:thermal-history': '并列宇宙热历史、暗物质与粒子视界三块内容。',
  'liang:inflation': '一节的整段范围：暴涨模型与它所解决的两大疑难。',
  'liang:new-standard-cosmology': '并列暗能量与新标准宇宙模型两个对象。',
  'liang:inertial-observer': '并列惯性观者与惯性系两个对象。',

  // ---- manifold（2026-10 复核补判）----
  'manifold:chart-atlas': '标题并列图、图册与覆盖三个可分别定义的对象；dg 案例把「坐标图」与「光滑图册」拆成两个节点，这里是压缩条目。',

  // ---- rudin（2026-10 复核补判：标题并列举或一节的范围）----
  'rudin:countable-set': '并列有限集、可数集与不可数集三个对象，再加可数并的封闭性，是一节的范围。',
  'rudin:perfect-set': '并列完全集与 Cantor 集两个对象（后者是另一类例子）。',
  'rudin:convergent-sequence': '并列收敛序列与子序列两个对象（含收敛序列的有界性）。',
  'rudin:limit-superior': '并列上极限与下极限两个对象。',
  'rudin:series-convergence': '一节的整段范围：级数定义与比较、根值、比值三种收敛判据。',
  'rudin:absolute-convergence': '并列绝对收敛与重排两个对象（含 Riemann 重排定理）。',
  'rudin:continuity-compactness': '并列连续性与紧致性两个对象（含一致连续）。',
  'rudin:continuity-connectedness': '并列连续性与连通性两个对象（含介值定理）。',
  'rudin:uniform-convergence-properties': '并列一致收敛在连续、积分、微分三处的三条定理。',
  'rudin:exponential-logarithm': '并列指数函数与对数函数两个对象。',
  'rudin:linear-transformation': '并列线性变换与算子范数两个对象。',
  'rudin:primitive-mapping': '并列本原映射与单位分解两个对象。',
  'rudin:simplex-chain': '并列单形与链两个对象（含边界算子 ∂²=0）。',
  'rudin:closed-exact-form': '并列闭形式与恰当形式两个对象。',
  'rudin:integral-properties': '标题没有并列词，但登记范围是「积分的性质」这一整节（线性性、单调性、可加性、估计式…），不是可独立认知的单个对象。',
};

/**
 * 判为**单元**的例外：`节点 id → 为什么它不是话题`。
 *
 * 这些条目的标题命中了并列词（或看起来像一节的范围），但按判据仍是最小可独立认知单元。
 * 把它们显式写出来，是为了「判过」与「没判」在数据上能分开：
 * 校验器要求每一个命中并列词的条目都出现在这张表或话题清单里。
 */
export const UNIT_REASONS = {
  // 例外规则 2：背景接口。
  'bg:logic:quantifier': '背景接口：按设计把全称 / 存在与量词次序收在一个环境边界里，粒度是接口粒度。',
  'bg:logic:equality': '背景接口：等式的自反、对称、传递与替换按设计合成一个接口。',
  'bg:set:function': '背景接口：函数、复合与逆按设计合成一个最低接口。',
  'bg:linear:vector': '背景接口：向量空间与线性映射按设计合成一个最低接口。',
  'bg:top:space': '背景接口：拓扑空间与局部欧氏性按设计合成一个最低接口。',
  'bg:manifold:calc': '背景接口：多元微分与 C^k 正则性按设计合成一个最低接口。',
  'bg:group:binary': '背景接口：二元运算与群公理模板按设计合成一个最低接口。',

  // 例外规则 3：同一条命题的两个名字。
  'limit:bridge': '标题里的两个名字是同一条等价命题的两端（ε–δ 与序列定义），不是两个并列对象。',
  'limit:bridge-cont': '同上：这是「连续 ⇔ 极限值为 f(a)」这一条等价命题。',
  'tensor:end-iso': '同一条同构命题：Φ: V⊗V* → End(V) 的陈述与证明是一个整体。',
  'rudin:least-upper-bound': '第二个名字（最小上界性）是同一条定理里实数域的性质，不是并列的另一个对象。',
  'rudin:compact-set': '第二个名字（Heine–Borel）是关于紧致集的同一条定理，不是并列的另一个对象。',
  'rudin:cauchy-sequence': '两个名字由同一条等价命题（R^k 中 Cauchy 序列恰是收敛序列）连起来。',
  'rudin:riemann-stieltjes': '「存在性」是这条积分的性质（何时可积），不是并列的另一个对象。',

  // 例外规则 1：任务与方法。
  'manifold:problem-transition-domain': '习题条目：标题描述一个任务（写出定义域与像），不是对象清单。',
  'tensor:method-dimension-count': '方法条目：标题描述一个方法的两步，不是对象清单。',
  'group:method-cayley-table': '方法条目：核验公理与交换性是同一个查表流程的两件事。',
  'liang:method-index-balance': '方法条目：配平与升降指标是同一个流程的两步。',
  'rudin:method-epsilon-estimate': '方法条目：ε–N 与 ε–δ 是同一种估算手法的两个场景。',
};

/**
 * 一个节点的粒度。登记表是唯一真源——`data/authoring.mjs` 的默认值只是
 * 「没有判定结果时的保守取值」，装配时由 `applyGranularity()` 统一覆盖。
 */
export function granularityOf(node) {
  const id = typeof node === 'string' ? node : node?.id;
  if (TOPIC_REASONS[id]) return 'topic';
  return 'unit';
}

/** 装配时统一套用粒度登记表：节点自己不需要（也不应该）各写一份。 */
export function applyGranularity(nodes) {
  return nodes.map((node) => ({ ...node, granularity: granularityOf(node) }));
}

/**
 * 判定完备性检查：返回没有被判定过的条目。
 *
 * 规则：**参与判定的构造**（`GRANULARITY_CONSTRUCTS`）里，标题命中并列词、
 * 或本身就是话题的条目，必须出现在 `TOPIC_REASONS` 或 `UNIT_REASONS` 里；
 * 反过来，登记表里的 id 必须真的存在。背景节点只在标题命中并列词时要求登记（例外规则 2）。
 */
export function granularityGaps(nodes) {
  const problems = [];
  const byId = new Map(nodes.map((node) => [node.id, node]));
  for (const [id, reason] of Object.entries({ ...TOPIC_REASONS, ...UNIT_REASONS })) {
    if (!byId.has(id)) problems.push(`粒度登记表引用了不存在的节点：${id}`);
    if (!reason || reason.length < 8) problems.push(`粒度登记表缺少理由：${id}`);
  }
  for (const node of nodes) {
    const judged = TOPIC_REASONS[node.id] ?? UNIT_REASONS[node.id];
    if (judged) continue;
    if (node.granularity === 'topic') { problems.push(`话题 ${node.id} 没有登记判定理由`); continue; }
    const inScope = GRANULARITY_CONSTRUCTS.includes(node.construct);
    if (!inScope) continue;
    if (isTopicTitle(node.title)) problems.push(`标题命中并列词但没有判定记录：${node.id}（${node.title}）`);
  }
  return problems;
}
