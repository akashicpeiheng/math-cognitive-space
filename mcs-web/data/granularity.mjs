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

  // ---- top（点集拓扑案例，2026-10 判定）----
  'top:countability-axioms': '并列 A1、A2、可分与 Lindelöf 四条各自可独立定义、各自有独立反例的条款；它们只在「可数」上相撞，判成话题而不是把它们压成一个概念的四种说法。',
  'top:separation-axioms': '并列 T0 至 T4、正则与正规七个各自独立的分离条款；每一条都对应一个否定上一档的具体空间，是一族线索而不是一个对象。',
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

  // ---- top（点集拓扑案例，2026-10 判定）----
  'top:continuous-map': '辅助前置：标题「连续映射」不含并列词，登记它是因为它是 top:homeomorphism 的定义材料；本案例把它作为**辅助节点**与 12 项区分开（12 项本身不含连续映射）。',
  'top:homeomorphism': '标题「同胚」不含并列词；登记它是因为它的定义写作「双射 + f 与 f⁻¹ 都连续」，两半是同一条定义的两个条件，不是两个并列对象。',
  'top:paracompactness': '标题「仿紧性」不含并列词；登记它是因为正文把它与紧性并置对照（有限子覆盖 对 局部有限加细），这一对是同一条件的两个档位，不是两个对象。',
  'top:metric-space': '辅助前置：标题「度量空间（本案例的辅助前置）」里的括号是说明而不是并列；它与 12 项的区分写在标题与 formal.boundary 里，粒度仍是单元。',

  // ---- jiang（《简明高等代数》案例，2026-10-13 判定）----
  /*
   * 这个案例 51 条标题里只有一条命中并列词：`jiang:eigenvector`（「特征值与特征向量」）。
   * 它属于例外规则 3——λ 是特征值，当且仅当存在非零向量 v 使 T(v) = λv：两个名字
   * 是同一条定义的两端，不是两个可独立认知的对象。其余 50 条标题不含并列词，按构造默认 unit。
   */
  'jiang:eigenvector': '例外规则 3：特征值就是「存在非零特征向量时那个 λ」，两个名字是同一条定义的两端，不是并列的两个对象。',

  // ---- axler（《Linear Algebra Done Right》案例，2026-10-14 判定）----
  /*
   * 这个案例 61 条标题里 17 条命中并列词（`、与及和`，见本文件头部的 `TOPIC_TITLE_HINTS`），
   * 逐条写在下面；另登记 1 条不含并列词但同样要说明判定的条目（`axler:polynomial-division`，
   * 「多项式的带余除法」按「像一节的范围」判 unit），因此下面共 18 条。它们分三类：
   * 1. **同一条定义/定理的两端**（特征值与特征向量、零空间与值域、内积与范数…）——
   *    例外规则 3：两个名字分开讲不成对象，合起来才是这一条；
   * 2. **同一节的一对结构**（自伴与正规、等距与酉、QR 与 Cholesky、积空间与商空间…）——
   *    例外规则 2：它们是同一节里并置对照的一对，粒度仍是一个单元；
   * 3. **术语里含并列字但不表并列**（「直和」里的「和」、「列表与 Fⁿ」里的「与」）——
   *    字面上命中，语义上不是清单。
   * 判据与规则表见本文件头部；这里只登记**为什么这一条是单元**。
   */
  'axler:list-fn': '例外规则 3：Fⁿ 就是「长度 n 的列表」的全体，两个名字是同一种对象的两端（列表是元素、Fⁿ 是集合），不是并列的两个对象。',
  'axler:direct-sum': '例外规则 1：标题里的「和」是术语的一部分（直和 = direct sum，写作 U₁ ⊕ … ⊕ Uₘ），不是「A 与 B」这样的并列；节点登记的是这一个构造与它的判据。',
  'axler:subspace-dimension': '例外规则 3：这条结论的主语就是「子空间的维数」，dim U ≤ dim V 与 dim(U₁+U₂) 的等式都写在同一句话里；两半分开不成一条结论。',
  'axler:null-range': '例外规则 3：零空间与值域是同一条定理（dim V = dim null T + dim range T）的两端，单个拿出来都只是「映射的一半」。',
  'axler:product-quotient': '例外规则 2：积空间与商空间是同一节（§3E）里并置对照的两种构造，共享同一个动机（由已知空间造新空间），粒度是一个单元。',
  'axler:dual-space': '例外规则 3：对偶映射的陪域就是 V′，两个名字是同一条对偶结构的两面（空间与它上面的泛函），分开讲不完整。',
  'axler:dual-null-range': '例外规则 3：null T′ = (range T)⁰ 与 range T′ = (null T)⁰ 是同一条定理的两条等式，同一个零化子的两侧。',
  'axler:polynomial-division': '例外规则 3：零点判据（x − z 整除 p）与带余除法是同一个小节里的同一件事（除法给出判据），不是两个可独立认知的对象。',
  'axler:eigenvalue': '例外规则 3：特征值就是「存在非零特征向量时那个 λ」，两个名字是同一条定义的两端，不是并列的两个对象（与 `jiang:eigenvector` 同一口径）。',
  'axler:inner-product': '例外规则 3：范数由内积定义（‖v‖ = √⟨v, v⟩），两个名字是同一个结构与其导出量，不是并列的两个对象。',
  'axler:orthogonal-decomposition': '例外规则 3：正交补就是正交分解的另一半（V = U ⊕ U^⊥），拆开讲任何一半都不成立。',
  'axler:self-adjoint-normal': '例外规则 2：自伴与正规是同一节（§7A）里并置对照的两类算子（正规是自伴的放宽），粒度是一个单元。',
  'axler:positive-operator': '例外规则 3：平方根是「正算子的唯一正平方根」这同一条存在性结论，主语只有一个（正算子）。',
  'axler:isometry-unitary': '例外规则 2：酉算子就是可逆的等距算子，两个名字是同一个定义加上可逆性，粒度是一个单元。',
  'axler:qr-cholesky': '例外规则 2：QR 与 Cholesky 是同一个小节（§7D）里的两种三角分解，后者由前者去掉符号得到——并置对照的一对。',
  'axler:generalized-eigenvector': '例外规则 3：广义特征空间上 T − λI 是幂零的，这两个名字是同一条结构描述的两半（空间与它上面的算子），分开讲不完整。',
  'axler:multiplicity': '例外规则 3：dim G(λ, T) 等于代数重数，块对角形式就是这条分解的写法；两半是同一条结论的两种表述。',
  'axler:bilinear-form': '例外规则 3：对称性是双线性形的一个附加条件（β(u,v) = β(v,u)），不是与它并列的第二个对象。',

  // ---- 讨论班笔记（2026-10-12 判定）----
  /*
   * 这批 19 个新节点里只有一条需要登记：`gt:holonomy-group`（「和乐群」）。
   * 它的标题命中了并列词表里的「群」，但那不是并列——和乐群是**一个具体的群对象**
   * （沿闭环平行移动所成的子群），不是「群论」那一族对象的范围，也不是若干并列对象的集合。
   * 其余 18 条标题不含并列词，按构造默认 unit，不必登记（校验器的规则：只有命中并列词的条目才要求写理由）。
   */
  'gt:holonomy-group': '标题里的「群」是对象名的一部分（和乐群 = 沿闭环平行移动所得的子群），不是并列词；节点登记的是这一个群对象，粒度是单元。',
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
 *
 * `mergedIds` 是被合并掉的登记 id（见 `data/merges.mjs`）：它们在节点表里不再出现，
 * 但**判定结果仍然有效**——那份登记仍挂在规范节点的 `registrations` 上，节点页照旧按
 * 它自己的粒度显示（话题级登记仍然显示成话题级）。因此这里对它们只查「有没有理由」，
 * 不查「节点在不在」。
 */
export function granularityGaps(nodes, { mergedIds = new Set() } = {}) {
  const problems = [];
  const byId = new Map(nodes.map((node) => [node.id, node]));
  for (const [id, reason] of Object.entries({ ...TOPIC_REASONS, ...UNIT_REASONS })) {
    if (!byId.has(id) && !mergedIds.has(id)) problems.push(`粒度登记表引用了不存在的节点：${id}`);
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
