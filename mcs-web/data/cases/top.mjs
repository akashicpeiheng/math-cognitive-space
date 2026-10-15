import {
  concept, claim, example, counterexample, method, theoryNode, patternNode,
  action, input, output, relation, evidence, support, claimRecord,
  representation, selfCheck, condition,
} from '../authoring.mjs';

/**
 * 点集拓扑案例（第八个案例，`top:` 前缀）。
 *
 * ## 为什么要有这个案例
 *
 * 用户提出：「为网站精心写一套尽可能完善的实例，设计以下节点：拓扑空间、可数公理、
 * 分离公理、同胚、紧、仿紧、σ-紧、连通性、拓扑流形、微分流形、坐标卡、图册」。
 *
 * 这 12 个名词本站**已经有三种不同深度的登记**，但都不是「单元级的点集拓扑」：
 *
 * | 已有 | 是什么 | 缺什么 |
 * |---|---|---|
 * | `bg:top:space` | 背景**接口**（拓扑空间与局部欧氏性合成一个最低接口） | 粒度是接口粒度，开集公理没有单元级节点；它的 boundary 自己写着「一般拓扑的分离公理与紧性理论未在本站展开」 |
 * | `dg:topological-space` | 微分几何语料里的一个概念节点 | 可数公理、分离公理、仿紧、σ-紧、连通性在 dg 案例里没有节点 |
 * | `manifold:top-manifold` | 专稿案例 02 的拓扑流形 | 与 dg 的版本互相独立登记，缺一条能说明「三处差别」的关系 |
 *
 * 因此本案例的做法是**新建**单元级登记，而不是改名、覆盖或合并既有节点：
 * 12 项各成一个 Concept 主节点，另加 1 个辅助前置（连续映射）、7 条断言、4 个反例、
 * 2 个例子、4 个误区模式、2 个方法与 1 个理论节点，共 32 个节点。
 *
 * ## id 与命名
 *
 * `core/ontology.mjs` 的 `NODE_BLOCK` 只接受 `[A-Za-z0-9:._-]+`，所以 id 一律小写 ASCII；
 * 中文名进 `title`。前缀 `top:` 与既有 id 无冲突：全库唯一含 `top:` 的 id 是 `bg:top:space`，
 * 它不以此开头（这一条由 `tests/topology-case.mjs` 现场核对）。
 *
 * ## 数学纪律
 *
 * - 每条断言都写明**它用到哪个分离性 / 可数性条件**——点集拓扑最常见的错误正是
 *   「把紧 Hausdorff 的结论用到紧 T₁ 上」；
 * - 反例一律写「精确否定了哪条命题」与「没有否定什么」（`formal.boundary` 与
 *   `teaching.conditions` 两处都写，不用一句话带过）；
 * - 证据一律 `prose-proof` / `not_run`：本站给出正文级论证，不签发任何机器证书或「已认证」结论。
 *
 * 来源与证据状态：正文由本站按经典教材的标准陈述撰写（Munkres《Topology》第 2 版、
 * Engelking《General Topology》修订版、Lee《Introduction to Topological Manifolds》第 2 版）。
 * 这三本用于核对**陈述与约定**；页码未逐条核对，因此证据登记为 `REF` 而不是逐页引用。
 */

const discipline = '拓扑';
const provenance = {
  sources: ['本站点集拓扑案例（第八个案例）：按经典教材标准陈述撰写'],
  note: '教材层级来源：Munkres《Topology》第 2 版；Engelking《General Topology》修订版；Lee《Introduction to Topological Manifolds》第 2 版。用于核对陈述与约定，未逐页核对。',
};

/**
 * 「本案例不含第二可数的版本差别」这类约定集中写在这里。
 *
 * 为什么要显式：本站对**同一层概念**有三处登记（本案例、`dg`、`manifold`），
 * 它们的公理表**故意不同**——`dg:topological-manifold` 按「Hausdorff + 局部欧氏」登记，
 * 本案例与 `manifold:top-manifold` 另加第二可数。把差别写在一处，
 * 免得后人在某一次「统一措辞」里把它抹掉（`tests/formal-statements.mjs` 有同类断言）。
 */
const CARRIER_NOTE = {
  topManifold: '本案例按「局部欧氏 + Hausdorff + 第二可数」登记；dg 案例的 dg:topological-manifold 按「Hausdorff + 局部欧氏」（不含第二可数）登记。两处都保留，差别如实写出，不合并。',
  background: 'bg:top:space 是**背景接口**（把拓扑空间与局部欧氏性合成一个最低接口），本案例的 top:space 是**单元级定义**（开集公理逐条写出）。两者不是同一个登记对象，也不互相替换。',
};

/* ------------------------------------------------------------------ *
 * 一、13 个主概念 + 1 个辅助前置
 * ------------------------------------------------------------------ */

export const topConceptNodes = [
  concept('top:space', '拓扑空间', {
    discipline, case: 'top',
    summary: '一个集合加一族开集：任意并封闭、有限交封闭、含空集与全集。',
    objectType: '拓扑空间', parameters: ['X', 'τ'], predicate: 'TopSpace(X,τ)', type: 'o',
    formal: {
      symbols: ['X', 'τ', '∅', '∪', '∩'],
      typeEnv: { X: 'Set', τ: 'Set(Set(X))' },
      assumptions: ['τ ⊆ P(X)', '∅ ∈ τ 且 X ∈ τ'],
      boundary: [
        '开集公理只约束 τ，不要求 X 上另有度量或序结构。',
        CARRIER_NOTE.background,
      ],
    },
    representations: [
      representation('rep-top-space', 'definition', '开集公理', '公式', 'DEF', '三条：任意并封闭、有限交封闭、含 ∅ 与 X。'),
    ],
    motivation: {
      internal: ['实数线上「开区间」的全部性质里，只有并、交、含 ∅ 与 ℝ 这几条在证明中真正被用到；把它们抽出来，连续性就能脱离距离谈论。'],
      external: ['广义相对论的时空、机器人的构型空间、数据分析中的形状空间都需要「没有距离的邻域」这套语言。'],
      aesthetic: ['用一个集合族把「附近」这件事编码成一阶可写的条件，代价最小而信息足够。'],
      growthChain: ['实数开区间 → 度量开球 → 「开球之并」的公理化 → 任意集合族上的拓扑'],
    },
    teaching: {
      conditions: [
        condition('任意并封闭', '只要求有限并封闭', '余可数拓扑：可数个开集的并未必开', '「开集之并仍开」这条最常用的推理失效，连续性、紧性、连通性的证明都建立在它上面。'),
        condition('有限交封闭', '允许任意交封闭', '实数线上 ⋂_n (−1/n, 1/n) = {0} 不是开集', '这正是有限与任意的分界：要求任意交会排除 ℝ 上的通常拓扑。'),
        condition('∅ 与 X 属于 τ', '去掉 X ∈ τ', 'τ 只含 ∅ 的集合族', '全集不开放使 X 上没有任何非平凡连续映射、也没有收敛到定义域内的结构。'),
      ],
      commonMisconceptions: [
        '把「开集」读成「开区间」的推广式样子：开集没有形状要求，可以是任意集合，只要满足三条公理。',
        '以为拓扑必须由距离产生：Sorgenfrey 直线与余有限拓扑都不可度量化。',
      ],
      reviewQuestions: [
        '「有限交封闭」这一条如果换成「任意交封闭」，ℝ 上的通常拓扑为什么就不再是拓扑？',
        '同一个集合上可以有多少个不同的拓扑？列举 ℝ 上至少三个，并各给一个只有在前者中成立的性质。',
      ],
      selfCheck: [
        selfCheck('sc-top-space-1', '对 X={1,2,3} 写出全部 8 个拓扑，并指出哪个不是 T₁。', '构造与分类', 'top:space', '全部单点集开的那一个不满足 T₁ 的等价刻画以外的条件；T₁ 要求单点集闭。'),
      ],
      evidenceStatus: 'DEF',
    },
    provenance,
  }),
  concept('top:continuous-map', '连续映射', {
    discipline, case: 'top',
    summary: '开集的原像是开集；同胚定义的辅助前置。',
    objectType: '映射', parameters: ['X', 'Y', 'f'], predicate: 'Continuous(f)', type: 'o',
    formal: {
      symbols: ['f', 'f^{-1}', 'τ_X', 'τ_Y'],
      typeEnv: { X: 'TopSpace', Y: 'TopSpace', f: 'X -> Y' },
      assumptions: ['X、Y 是拓扑空间'],
      boundary: [
        '本节点是**辅助前置**：用户点名的 12 项里没有「连续映射」，它是「同胚」的定义材料，因此登记为辅助节点而不是主线之一。',
        '本节不展开网与滤子，也不讨论序列刻画在非第一可数空间上的失效（由 top:countability-axioms 承担）。',
      ],
    },
    representations: [
      representation('rep-top-continuous', 'definition', '开集原像判据', '公式', 'DEF', '∀V ∈ τ_Y: f⁻¹(V) ∈ τ_X。'),
    ],
    motivation: {
      internal: ['ε–δ 定义里的 δ 由 ε 决定，本质上是「对方每给一个开球，我都能找到原像里的开球」；这句话不需要距离就能写。'],
      external: ['数值算法与信号处理里，连续性是「输入的小扰动不引起输出的跳变」；拓扑版本允许「小」由任意邻域基定义。'],
      aesthetic: ['把量化条件的方向反转（前推改拉回），使定义在任意拓扑空间上成立——这是范畴式定义的雏形。'],
      growthChain: ['ε–δ → 「V 的原像开」→ 拓扑空间之间的态射'],
    },
    teaching: {
      conditions: [
        condition('开集的原像开（而不是像开）', '改成「开集的像是开集」', 'f: ℝ → ℝ，f(x)=x²；(−1,1) 的像是 [0,1)，不是开集', '方向一改，连最常见的连续函数都不满足，定义会退化成「开映射」这一无关概念。'),
        condition('对 Y 中**所有**开集成立', '只对某个邻域基成立', '只检验 (-ε,ε) 这类区间时，非连续函数在某些反例拓扑下会被误判', '定义需要覆盖全部开集；用邻域基检验时要额外证明「基里开集的原像开 ⇒ 全部开集的原像开」。'),
      ],
      commonMisconceptions: [
        '把连续性读作「图像可以一笔画完」：ℝ 上的函数 f(x)=1/x 在 ℝ∖{0} 上连续，但图像并不连通。',
        '以为连续映射把开集映成开集：连续只保证原像，开映射是另一件事。',
      ],
      reviewQuestions: ['连续映射为什么不要求「像开」？举出连续但不是开映射的例子。'],
      evidenceStatus: 'DEF',
    },
    provenance,
  }),
  concept('top:homeomorphism', '同胚', {
    discipline, case: 'top',
    summary: '双向连续的双射；拓扑空间的同构概念。',
    objectType: '映射', parameters: ['X', 'Y', 'f'], predicate: 'Homeomorphic(X,Y,f)', type: 'o',
    formal: {
      symbols: ['f', 'f^{-1}', '≅'],
      typeEnv: { X: 'TopSpace', Y: 'TopSpace', f: 'X -> Y' },
      assumptions: ['f 是双射', 'f 与 f^{-1} 都连续'],
      boundary: ['「双向连续」不能简化成单向：同胚的逆映射连续是定义的一部分，不是推论。'],
    },
    representations: [
      representation('rep-top-homeo', 'definition', '双射 + 双向连续', '公式与自然语言', 'DEF', 'f 是双射、f 与 f⁻¹ 都连续。'),
    ],
    motivation: {
      internal: ['定义了拓扑空间之后，自然要问「什么算同一个空间」；能保持全部拓扑信息的可逆映射就是同胚，它把开集系统一一对应。'],
      external: ['地图投影之间的换算、机器人的构型空间改写，都是在保持邻域结构的前提下换坐标。'],
      aesthetic: ['它使拓扑空间成为范畴、同胚成为同构，「拓扑不变性」由此得到意义。'],
      growthChain: ['双射 → 加连续性 → 发现连续双射的逆可以不连续 → 定义要求双向连续'],
    },
    teaching: {
      conditions: [
        condition('f⁻¹ 连续', '只要求 f 连续且为双射', '从离散拓扑到通常拓扑的恒等映射，以及 [0,1) → S¹（t ↦ e^{2πit}）', '前者是连续双射而非同胚，后者把 [0,1) 与圆周配对：去掉逆向连续性，「同一个空间」的判据立刻失真。'),
        condition('两侧的拓扑事先固定', '允许同时改两个拓扑', '(X,τ₁) ≅ (X,τ₂) 通常不成立', '同胚比较的是「集合 + 拓扑」，不是「裸集合」；不固定拓扑就没有可比较的对象。'),
      ],
      commonMisconceptions: [
        '把「连续双射」当作同胚：这需要开映射或闭映射的额外条件。',
        '用「看起来能连续变形」代替证明：变形直觉需要同伦语言，同胚本身只要求双向连续。',
      ],
      reviewQuestions: [
        '同胚是不是等价关系？逐条验证自反、对称、传递，并指出每一条用到的哪一半连续性。',
        '为什么有界性不是拓扑性质，而紧致性是？',
      ],
      selfCheck: [
        selfCheck('sc-top-homeo-1', '证明 (0,1) ≅ ℝ，并说明端点处为何没被用到。', '构造', 'top:homeomorphism', 'x ↦ tan(π(x−1/2)) 双向连续；端点不属于定义域，故不构成障碍。'),
      ],
      evidenceStatus: 'DEF',
    },
    provenance,
  }),
  concept('top:countability-axioms', '可数公理：A1、A2、可分与 Lindelöf', {
    discipline, case: 'top',
    summary: '第一可数（A1）、第二可数（A2）、可分与 Lindelöf 四条并列条款，以及它们之间的蕴含关系。',
    objectType: '拓扑空间性质', parameters: ['X'], predicate: 'CountabilityAxiom(X,·)', type: 'o',
    formal: {
      symbols: ['A1', 'A2', '𝔅', 'D', 'ℒ'],
      typeEnv: { X: 'TopSpace', 𝔅: 'Set(Open(X))', D: 'Set(X)' },
      assumptions: ['A2 指 X 有可数拓扑基', 'A1 指每点的邻域系有可数基'],
      boundary: [
        '四条条款是并列的四种条件，不是一个条件的四种写法：A2 ⇒ {A1, 可分, Lindelöf}，但反向的每条都不成立。',
        '可分与 Lindelöf 在一般拓扑空间里没有蕴含关系（两个方向都有反例）。',
      ],
    },
    representations: [
      representation('rep-top-count-a2', 'definition', '第二可数性', '公式', 'DEF', '存在可数基 𝔅，X 的每个开集都是 𝔅 中若干成员的并。'),
      representation('rep-top-count-tab', 'intuition', '四条条款对照表', '表格', 'ILLUSTRATION', 'A1 / A2 / 可分 / Lindelöf 的定义、被判别的对象、失效反例各一行。'),
    ],
    motivation: {
      internal: ['度量空间上的开球族已经足够谈论极限与连续，但开球可能不可数（ℝ 上每点都有不可数多个半径）；真正被用到的只是「每个邻域里能挑出一个可数族代表」，这就把「够不够小」拆成了 A1 与 A2 两个不同的问题。'],
      external: ['单位分解、嵌入定理与可度量化定理都要求 A2；算法与控制论里的「可数信息量」也落在这一层。'],
      aesthetic: ['四条条款各限定一种对象（邻域系、基、稠密子集、开覆盖），彼此只在「可数」上相撞——这正是为什么它们必须分开登记。'],
      growthChain: ['ℝ 的开球族 → 只保留可数个 → A1（局部够小）与 A2（整体够小）→ 可分的稠密子集 → Lindelöf 的覆盖性质'],
    },
    teaching: {
      conditions: [
        condition('A2（整体有可数基）', '只保留 A1', 'Sorgenfrey 直线（下极限拓扑）：它满足 A1，且 1 条可分性成立，但 A2 与 Lindelöf 这 2 条都失效', 'A2 是可数个开集覆盖住全部开集这一**整体**条件；退回 A1 后，仍可能不存在可数基，流形的可数图册、嵌入定理与单位分解的常见形式都随之失去前提。'),
        condition('A1（每点邻域系有可数基）', '一条都不要求', '不可数离散空间或长直线上的「按邻域系尺寸」构造', '序列刻画失效：在非 A1 空间里「序列收敛」不足以判定闭包与连续，必须改用网。'),
        condition('可分（存在可数稠密子集）', '去掉度量假设', 'Sorgenfrey 直线可分但不 A2', '度量空间里「可分 ⇒ A2」成立，靠的是度量球族的可数化；去掉度量这一步就用不了了。'),
      ],
      commonMisconceptions: [
        '把 A1 与 A2 当成同一个条件：A2 ⇒ A1，反向不成立，Sorgenfrey 直线是标准反例。',
        '以为 A2 是「开集不多」：ℝ 有不可数多个开集，但 A2 只看**基**是否可数。',
      ],
      reviewQuestions: [
        '为什么度量空间里可分 ⇒ A2，而一般拓扑空间不成立？指出证明里用到度量的哪一处。',
        'A2 空间一定是 Lindelöf 吗？可分性在证明里起了什么作用？',
      ],      selfCheck: [
        selfCheck('sc-top-count-1', '写出 Sorgenfrey 直线上的可数稠密子集，并说明为什么它没有可数基。', '构造与反驳', 'top:countability-axioms', 'ℚ 稠密；任一基都须含每点处的半开区间 [x, x+1/n)，从而不可数。'),
      ],
      evidenceStatus: 'DEF',
    },
    provenance,
  }),
  concept('top:separation-axioms', '分离公理：T0–T4、正则与正规', {
    discipline, case: 'top',
    summary: '用开集分离点与闭集的一族条件：T0、T1、T2（Hausdorff）、T3（正则 Hausdorff）、T4（正规 Hausdorff）。',
    objectType: '拓扑空间性质', parameters: ['X'], predicate: 'SeparationAxiom(X,·)', type: 'o',
    formal: {
      symbols: ['T0', 'T1', 'T2', 'T3', 'T4'],
      typeEnv: { X: 'TopSpace' },
      assumptions: ['T3 常指正则 Hausdorff，T4 常指正规 Hausdorff；本站按这一约定登记，并在正文里写出两种惯例的差别'],
      boundary: [
        '分离性是逐条递进的：T4 ⇒ T3 ⇒ T2 ⇒ T1 ⇒ T0，反向都不成立（每一条都有一个反例节点）。',
        '正规性（分离闭集）本身不含 Hausdorff 条件，因此「正规」与「T4」必须分开写，不能互相替换。',
      ],
    },
    representations: [
      representation('rep-top-sep-t2', 'definition', 'Hausdorff（T2）', '公式', 'DEF', '∀x≠y ∃U∋x ∃V∋y: U∩V=∅。'),
      representation('rep-top-sep-tab', 'intuition', '分离公理逐条对照表', '表格', 'ILLUSTRATION', '每行的对象（两点 / 点与闭集 / 两个闭集）、条件、反例各一列。'),
    ],
    motivation: {
      internal: ['「极限唯一」这条分析里从来不证的性质，在一般拓扑空间里是需要条件的：它恰好等价于 T2。分离公理就是把「要什么结论就得付什么条件」逐档写清。'],
      external: ['紧化、商空间与流形定义里都点名要 Hausdorff；正规性是 Urysohn 引理与单位分解的前提。'],
      aesthetic: ['每一档都只用一个开集分离条款，却把 T0 到 T4 排成一条严格的谱——它是「条件即反例」最整齐的一处展览。'],
      growthChain: ['序列极限唯一（分析里默认）→ 找出它等价于什么 → T2 → 闭集与点、闭集与闭集 → T3 与 T4'],
    },
    teaching: {
      conditions: [
        condition('T2（存在不交开邻域）', '退到 T1（每点闭）', '余有限拓扑空间：任两点闭、但不 T2', 'T1 不给「极限唯一」，也不给「紧子集闭」：紧 T1 空间里紧集可以不是闭集。'),
        condition('T3（点与闭集可用开集分离）', '去掉 Hausdorff 部分', '含一个稠密点的具体点空间', '正则性本身不含 T2；把「正则」与「T3」混同，会使「局部紧 Hausdorff ⇒ T3」这类定理的陈述失去意义：这里的 2 档（T3 与 T4）与 3 条要求都得另写。'),
        condition('T4（两个不交闭集可用开集分离）', '去掉紧性或 T2', 'Sorgenfrey 平面是 T4 但不可度量化；即使在这一档 4 级分离性上，紧性也不被蕴含', '正规性与紧性互不包含：紧 T2 空间必正规，但正规空间不必紧，紧空间不 Hausdorff 时也不必正规。'),
      ],
      commonMisconceptions: [
        '把 T3、T4 当作「再加一点 Hausdorff」：正规性可以单独成立而不 Hausdorff。',
        '以为紧空间一定正规：需要 Hausdorff；余有限拓扑空间紧且 T1，但不是 T2，也不是正规的。',
      ],
      reviewQuestions: [
        '「紧空间的紧子集闭」这一命题里 T2 用在哪一步，结论如何崩溃？提示：T1 与 T2 这两个条件里留下 1 条。',
        '把 T2 换成 T1 之后，紧 T1 空间的分类会失去哪条基本性质？',
      ],
      evidenceStatus: 'DEF',
    },
    provenance,
  }),
  concept('top:compactness', '紧致性', {
    discipline, case: 'top',
    summary: '每个开覆盖都有有限子覆盖；把无限控制化为有限。',
    objectType: '拓扑空间性质', parameters: ['X'], predicate: 'Compact(X)', type: 'o',
    formal: {
      symbols: ['𝒰', '⋃', '⊆'],
      typeEnv: { X: 'TopSpace', 𝒰: 'Set(Open(X))' },
      assumptions: ['𝒰 是 X 的开覆盖：⋃𝒰 = X'],
      boundary: [
        '用「开覆盖 ⇒ 有限子覆盖」定义，不用序列，也不用「有界且闭」——后两者只在度量空间里等价。',
        '「紧子集」指子空间拓扑下紧，不是「存在一个有限覆盖」——后者对任何非空空间都成立。',
      ],
    },
    representations: [
      representation('rep-top-compact', 'definition', '开覆盖有限子覆盖', '公式', 'DEF', '⋃𝒰 = X ⇒ ∃ 有限 𝒰₀ ⊆ 𝒰: ⋃𝒰₀ = X。'),
      representation('rep-top-compact-eq', 'intuition', '等价刻画', '表格', 'ILLUSTRATION', '闭集族的有限交性质：若某个有限子族的交为空 ⇒ 全族的交为空；度量空间中紧 ⇔ 序列紧，这一对是 2 条等价写法里的 ⇔ 与 2 类 ⇒ 各一。'),
    ],
    motivation: {
      internal: ['分析里「闭区间上连续函数有最大值」的证明只用到一件事：任意开覆盖都能抽出有限个。把这件事命名出来，ℝⁿ 上的结论就能搬到曲面与抽象空间上。'],
      external: ['最优化的存在性、数值积分的有界误差估计、物理系统的有限自由度近似都靠它。'],
      aesthetic: ['定义里出现的是**任意**覆盖，结论里出现的是**有限**子覆盖——「用有限控制无限」是分析里最反复出现的手法。'],
      growthChain: ['闭集族有限交性质 → 发现它只在紧集上成立 → 抽成开覆盖形式 → 与序列紧的关系（度量空间内等价，一般空间不等价）'],
    },
    teaching: {
      conditions: [
        condition('开覆盖 ⇒ 有限子覆盖', '改成「存在一个有限开覆盖」', '任何空间都有有限覆盖（取 {X}）', '条件退化为恒真，紧性失去全部内容。'),
        condition('Hausdorff（用在「紧 ⇒ 闭」上）', '只留 T1', '余有限拓扑的 ℝ：紧、T1、不 T2；紧集可以不是闭集', '「紧子集闭」「紧集与紧集可分离」这些常用推论全部失效。'),
        condition('A2（用在「紧 ⇒ 序列紧」上）', '去掉可数性', '[0,ω₁] 序拓扑：紧但不序列紧', '「紧 ⇒ 有收敛子列」在一般空间里不成立，必须换成网。'),
      ],
      commonMisconceptions: [
        '把紧性与有界性混同：只有 ℝⁿ 里「有界且闭 ⇔ 紧」，一般度量空间里需要完备性。',
        '以为紧空间的子集都紧：紧子集必须闭（要 T2）才有「闭子集紧」。',
      ],
      reviewQuestions: [
        '证明「紧空间的连续像紧」时哪一步用到 f 的连续性？（提示：开集的原像。）',
        '余有限拓扑的 ℝ 紧而不 T2，这否定了哪条常见命题、没有否定哪条？',
      ],
      selfCheck: [
        selfCheck('sc-top-compact-1', '用开覆盖定义直接证明「紧空间的闭子集紧」。', '证明', 'top:compactness', '把补集加入覆盖；T2 用不到这一步，只用于证明紧集闭。'),
      ],
      evidenceStatus: 'DEF',
    },
    provenance,
  }),
  concept('top:paracompactness', '仿紧性', {
    discipline, case: 'top',
    summary: '每个开覆盖都有局部有限的开加细。',
    objectType: '拓扑空间性质', parameters: ['X'], predicate: 'Paracompact(X)', type: 'o',
    formal: {
      symbols: ['𝒰', '𝒱', '局部有限'],
      typeEnv: { X: 'TopSpace', 𝒰: 'Set(Open(X))', 𝒱: 'Set(Open(X))' },
      assumptions: ['𝒱 是 𝒰 的开加细：每 V ∈ 𝒱 含于某个 U ∈ 𝒰', '𝒱 局部有限：每点有邻域只与有限多个 V 相交'],
      boundary: [
        '紧性要求**有限**子覆盖，仿紧性只要求**局部有限**加细；后者整体上可以是无限的，这是两者的关键差别。',
        '本站按「Hausdorff + 仿紧」使用它；「仿紧」一词本身不含 Hausdorff，凡定理陈述都点名 Hausdorff。',
      ],
    },
    representations: [
      representation('rep-top-paracompact', 'definition', '局部有限开加细', '公式', 'DEF', '每开覆盖有局部有限的加细覆盖；紧性是把「局部有限」换成「有限」的特例。'),
    ],
    motivation: {
      internal: ['分析里把局部定义的函数粘成整体函数时，需要「每点附近只有有限多个零件在起作用」——局部有限正是这句话，仿紧性保证每个覆盖都能被这样加细。'],
      external: ['单位分解的存在性是仿紧的直接推论；微分几何里的非局部构造（度量、联络、积分）全靠这一步。'],
      aesthetic: ['它把紧性「太强而 ℝⁿ 不满足」的缺陷补齐：ℝⁿ 不紧但仿紧，于是单位分解在 ℝⁿ 上照样实行。'],
      growthChain: ['局部定义 → 想粘起来 → 发现要「局部有限」→ 定义加细 → 发现不是每个空间都有 → 仿紧性'],
    },
    teaching: {
      conditions: [
        condition('局部有限', '退到「每个加细成员只与有限多个其他成员相交」或更弱', '把 ℝ 的覆盖加细成全体单点集 {x}：它是加细但整体无局部有限组织', '紧性与仿紧性的差别正在这里：局部有限的族可以无限，有限子覆盖不行。'),
        condition('Hausdorff（用在正规性与单位分解上）', '只留仿紧', '仿紧但非 Hausdorff 的空间', '「仿紧 Hausdorff ⇒ 正规」以及由此得到的单位分解都要 Hausdorff；只写仿紧会得到错误的一般性陈述。'),
        condition('正则性（用在 Stone 定理的充分条件上）', '去掉正则性', '仿紧但非正规的空间（存在这样的例子）', 'Stone 定理说的是：度量空间与**正则**仿紧空间的关系；去掉正则性，仿紧不再推出正规。'),
      ],
      commonMisconceptions: [
        '把仿紧与紧混为一谈：ℝⁿ 仿紧但不紧。',
        '以为局部有限加细一定是覆盖：定义要求加细本身仍覆盖 X，否则任何单点族都算加细。',
      ],
      reviewQuestions: [
        '为什么「局部有限」这一个词就够得到单位分解？指出紧性与仿紧性在证明里各自做了什么。',
        '长直线局部紧、连通、Hausdorff，却为什么不是仿紧？',
      ],
      evidenceStatus: 'DEF',
    },
    provenance,
  }),
  concept('top:sigma-compact', 'σ-紧性', {
    discipline, case: 'top',
    summary: '可数多个紧子集之并等于整个空间。',
    objectType: '拓扑空间性质', parameters: ['X'], predicate: 'SigmaCompact(X)', type: 'o',
    formal: {
      symbols: ['K_n', 'σ'],
      typeEnv: { X: 'TopSpace', K_n: 'Set(X)' },
      assumptions: ['每个 K_n 在子空间拓扑下紧'],
      boundary: [
        'K_n 不要求开、不要求闭（T2 时紧子集必闭，但那要用到分离性）。',
        '与紧性的关系是单向的：紧 ⇒ σ-紧（取 K₁=X），反向不成立。',
      ],
    },
    representations: [
      representation('rep-top-sigma', 'definition', '可数紧并', '公式', 'DEF', 'X = ⋃_{n∈ℕ} K_n，其中每个 K_n 紧。'),
    ],
    motivation: {
      internal: ['ℝⁿ 不紧，但它是可数多个紧盒之并——「每一层有界、层数可数」正是分析里把局部结论推成全空间结论的常用做法。'],
      external: ['流形的可数图册、可分度量空间的分层构造、随机过程的紧性判据都用到这层结构。'],
      aesthetic: ['它是紧性与可数性的一次折衷：把「有限子覆盖」换成「可数层」，恰好与第二可数性配合出流形的公理。'],
      growthChain: ['ℝⁿ 的紧盒序列 → 注意到 ⋃K_n = X → 定义 σ-紧 → 与局部紧、A2 联合辨认流形'],
    },
    teaching: {
      conditions: [
        condition('可数多个 K_n', '允许任意多个', '不可数离散空间写成单点集之并', '判据退化为恒真（每个空间都是它单点集之并），σ-紧性将失去区分力。'),
        condition('每个 K_n 紧（不是「有界」）', '改成「有界」', '无限维巴拿赫空间里的有界闭球不是紧的', '「有界 + 闭环 ⇒ 紧」只在 ℝⁿ 成立，其余情形会得到错误结论。'),
      ],
      commonMisconceptions: [
        '把 σ-紧当作紧：σ-紧只是把空间写成可数层，层内才紧。',
        '以为 σ-紧 + 局部紧 ⇒ 紧：不可数离散空间 σ-紧、局部紧（每点单点集是紧邻域）但不紧。',
      ],
      reviewQuestions: ['σ-紧性与可分性什么关系？谁推谁？给出反例。'],
      evidenceStatus: 'DEF',
    },
    provenance,
  }),
  concept('top:connectedness', '连通性', {
    discipline, case: 'top',
    summary: '不能写成两个非空不交开集之并；道路连通的相邻概念。',
    objectType: '拓扑空间性质', parameters: ['X'], predicate: 'Connected(X)', type: 'o',
    formal: {
      symbols: ['U', 'V', 'γ', '[0,1]'],
      typeEnv: { X: 'TopSpace' },
      assumptions: ['分离指 X 中没有既开又闭的真非空子集'],
      boundary: [
        '连通性是**整体**性质：局部连通、局部道路连通都是另外的条件，互相不包含。',
        '道路连通 ⇒ 连通，反向不成立（拓扑学家的正弦曲线）；两者都另外有局部版本。',
      ],
    },
    representations: [
      representation('rep-top-connected', 'definition', '不能分离', '公式', 'DEF', '不存在非空不交开集 U、V 使 X = U ∪ V。'),
      representation('rep-top-path', 'definition', '道路连通', '公式', 'DEF', '∀x,y ∃连续 γ: [0,1] → X, γ(0)=x, γ(1)=y。'),
    ],
    motivation: {
      internal: ['中值定理说连续函数在区间上取到中间值，它只用到「区间不能分成两块」这一点；把这一点抽出来就是连通性。'],
      external: ['相变与不变量、控制系统的可达性、数据分析中「一个连通分量」的判定，都用这层结构。'],
      aesthetic: ['连通性把「不能切开」写成了集合论条件；它是紧性之后第二个「整体性质」，两者搭配给出大量分类定理。'],
      growthChain: ['区间的中间值性质 → 抽成「不能分离」→ 连通性 → 道路连通更强的版本 → 正弦曲线说明两者不同'],
    },
    teaching: {
      conditions: [
        condition('用开集分离', '改用闭集或改用「不交非空子集」', '有理数 ℚ 是稠密的全不连通空间，但每个子集都既不开也不闭', '只用「不交子集」会把一切空间排除；必须指定这些子集相对整个空间既开又闭。'),
        condition('整体连通', '换成局部连通', '拓扑学家的正弦曲线：连通（甚至有连通闭包），但不局部连通、也不道路连通', '连续性定理用到的是整体连通；把局部连通当作前提会漏掉这类空间。'),
        condition('道路连通（用 [0,1] 的连续像）', '去掉 [0,1] 的紧致性', '用 (0,1] 或 ℝ 作参数空间的「道路」', '道路连通必须用紧参数区间；换成 ℝ 会得到更弱的「弧连通」变体，与连通性的关系也随之改变。'),
      ],
      commonMisconceptions: [
        '把连通当成「看起来是一整块」：正弦曲线与它的闭包看起来是两个部分，却是同一个连通空间。',
        '以为连通 + 局部连通 ⇒ 道路连通：还需要局部道路连通，或额外假设（如流形情形下局部欧氏性就够）。',
      ],
      reviewQuestions: [
        '为什么道路连通一定连通，而反过来不成立？指出哪一步用到了 [0,1] 的连通性。',
        '连续的连通空间像是连通——这条结论在证明里用的是连续映射的哪条性质？',
      ],
      selfCheck: [
        selfCheck('sc-top-connected-1', '用连通性证明中值定理。', '证明', 'top:connectedness', '若 f 取不到中间值，则原像把区间分成两个非空不交开集，与连通性矛盾。'),
      ],
      evidenceStatus: 'DEF',
    },
    provenance,
  }),
  concept('top:coordinate-chart', '坐标卡', {
    discipline, case: 'top',
    summary: '(U, φ)：U 是底空间的开集，φ 是到 ℝⁿ 开集的同胚。',
    objectType: '局部坐标系统', parameters: ['M', 'U', 'φ', 'n'], predicate: 'Chart(M,U,φ,n)', type: 'o',
    formal: {
      symbols: ['U', 'φ', 'ℝ^n', 'x^i'],
      typeEnv: { M: 'TopSpace', U: 'Open(M)', φ: 'U -> R^n' },
      assumptions: ['φ(U) 是 ℝⁿ 的开子集', 'φ 是同胚'],
      boundary: [
        'φ 的像必须开：射到 ℝⁿ 的闭子集（例如 [0,1]）不是坐标卡。',
        '坐标卡本身不含微分结构：C^r 条件加在图册的过渡映射上，由 top:atlas 与 top:differentiable-manifold 承担。',
      ],
    },
    representations: [
      representation('rep-top-chart', 'definition', '局部坐标卡', '公式', 'DEF', 'φ: U → φ(U) ⊆ ℝⁿ 同胚，φ(U) 开。'),
    ],
    motivation: {
      internal: ['要在弯曲的空间上做微积分，先要有一个「像平面一样」的小片；坐标卡就是这个片与 ℝⁿ 的开集之间的字典。'],
      external: ['地图册的一个图幅、机器人构型空间的一个局部参数化都是坐标卡。'],
      aesthetic: ['把「局部像欧氏空间」这句话变成一对 (U, φ)，于是整体结构问题化成这些对的相容性问题。'],
      growthChain: ['球面没有全局参数 → 用两个半球各参数化 → 抽象成 (U, φ) → 要求 φ(U) 开、φ 是同胚'],
    },
    teaching: {
      conditions: [
        condition('φ(U) 是 ℝⁿ 的开子集', '允许 φ(U) 闭或半开', '把 U 参数化到 [0,1] 或 [0,1)', '微分在边界点上无法双向进行：开性是「可以往每个方向微扰」的集合论说法。'),
        condition('φ 是同胚（不只是连续双射）', '只要求连续双射', '[0,1) → S¹，t ↦ e^{2πit} 是连续双射', '逆不连续使得 ℝⁿ 的局部结构无法搬回来，坐标卡必须双向。'),
        condition('U 相对 M 开', '允许 U 是任意子集', '把圆周上的单点取作 U', '单点集不能作为局部参数的载体：邻域结构必须来自 M 的拓扑。'),
      ],
      commonMisconceptions: [
        '把坐标卡与坐标系混同：坐标卡是「图 + 同胚」，坐标系只是 φ 的分量函数 (x¹,…,xⁿ)。',
        '以为坐标卡能覆盖整个空间：流形一般没有全局坐标卡（球面就是例子）。',
      ],
      reviewQuestions: ['为什么要求 φ(U) 开而不是任意子集？如果把 U 换成闭集上的参数化，微积分会在哪一步失败？'],
      evidenceStatus: 'DEF',
    },
    provenance,
  }),
  concept('top:atlas', '图册', {
    discipline, case: 'top',
    summary: '覆盖流形的坐标卡族，且两两过渡映射相容；相容性可以逐对检查。',
    objectType: '坐标卡族', parameters: ['M', '𝒜'], predicate: 'Atlas(M,𝒜)', type: 'o',
    formal: {
      symbols: ['𝒜', 'U_α', 'φ_α', 'φ_β∘φ_α^{-1}'],
      typeEnv: { M: 'TopSpace', 𝒜: 'Set(Chart(M))' },
      assumptions: ['⋃_{(U,φ)∈𝒜} U = M'],
      boundary: [
        '「相容」有层次：拓扑层面只要求过渡映射是同胚（此时叫拓扑图册），C^r 相容另外登记。',
        '覆盖条件不能省：只要有一点的所有邻域都不被覆盖，那一处的局部坐标断言就无从谈起。',
      ],
    },
    representations: [
      representation('rep-top-atlas', 'definition', '覆盖 + 相容', '公式', 'DEF', '每点至少落在一张卡内；重叠域 φ_α(U_α∩U_β) 上两个方向的过渡映射都须有定义且是相应层级的同构。'),
    ],
    motivation: {
      internal: ['一张坐标卡只能管一块；要谈整个空间的性质，必须让这些小块**互相翻译得通**。图册正是把「覆盖」与「翻译相容」两件事写在一起的对象。'],
      external: ['全球地图册的图幅拼接、机器人工作空间的局部参数化切换都靠这层相容性。'],
      aesthetic: ['它把「整体对象由局部数据粘成」这一模式做成可核查的条件：覆盖 + 逐对过渡。'],
      growthChain: ['单张卡 → 卡族 → 加覆盖条件 → 见重叠处需相容 → 图册 → 加 C^r 条件成微分图册'],
    },
    teaching: {
      conditions: [
        condition('覆盖 M', '删去覆盖条件', '只取球面上北半球的卡', '未覆盖的点没有坐标可言，「图册上的定义」在那些点失效。'),
        condition('过渡映射在重叠域上有定义且连续（同胚）', '只在非空重叠上检查一个方向', '两个方向的过渡是互逆的映射，单向有定义不保证逆连续', '相容性是双向条件；这是 manifold 案例已经登记的同一条纪律，此处独立登记以保持本案例自足。'),
        condition('两两检查（对全部有序卡对）', '只检查相邻编号的卡对', '三张卡首尾相接、只有非相邻对不兼容的构造', '相容性不是传递的局部条件；只查相邻对会漏掉真正的不相容。'),
      ],
      commonMisconceptions: [
        '把图册当作「一个集合」：它是带覆盖与相容条件的结构，换一组卡可能给出不同图册。',
        '以为图册必须有限或可数：一般图册可以任意大；第二可数流形**存在**可数图册，但这不是图册的定义。',
      ],
      reviewQuestions: ['为什么相容性要双向检查？给出一个单向光滑而逆向不光滑的具体情形。'],
      evidenceStatus: 'DEF',
    },
    provenance,
  }),
  concept('top:topological-manifold', '拓扑流形', {
    discipline, case: 'top',
    summary: '局部欧氏 + Hausdorff + 第二可数的拓扑空间。',
    objectType: '拓扑空间', parameters: ['M', 'n'], predicate: 'TopManifold(M,n)', type: 'o',
    formal: {
      symbols: ['M', 'n', 'ℝ^n', '≅'],
      typeEnv: { M: 'TopSpace', n: 'N' },
      assumptions: ['M 是 Hausdorff 空间', 'M 第二可数', '每点有开邻域同胚于 ℝⁿ 的开子集'],
      boundary: [
        CARRIER_NOTE.topManifold,
        '第二可数不是「技术性附加假设」：它保证可数图册、单位分解与嵌入定理，长直线说明去掉它之后局部欧氏 + Hausdorff 也能出「病态流形」。',
      ],
    },
    representations: [
      representation('rep-top-manifold', 'definition', '三条公理', '公式', 'DEF', '局部欧氏（每点有欧氏邻域）+ Hausdorff + 第二可数。'),
      representation('rep-top-manifold-why', 'intuition', '三条公理各自排除什么', '表格', 'ILLUSTRATION', '局部欧氏排除无坐标的空间；Hausdorff 排除「两个原点」；A2 排除长直线。'),
    ],
    motivation: {
      internal: ['有了坐标卡与图册，还要说清「什么样的底空间才允许这样铺图册」；局部欧氏给出坐标，Hausdorff 与 A2 保证这些坐标能整体拼合而不出怪例。'],
      external: ['时空与构型空间都要求这组公理；医学图像的形状空间、统计流形也在这一层。'],
      aesthetic: ['三条公理各自对应一类反例，删掉任何一条都能立刻写下一个病态例子——这是「条件即反例」最干净的一处。'],
      growthChain: ['曲面（直观）→ 局部欧氏 → 加 Hausdorff → 加第二可数 → 现代拓扑流形定义'],
    },
    teaching: {
      conditions: [
        condition('局部欧氏', '删去', '有理数 ℚ 或任何全不连通空间', '没有欧氏邻域就没有坐标，微积分与「维数」都无从定义。'),
        condition('Hausdorff', '删去', '带两个原点的直线（局部欧氏、A2、非 T2）', '极限不唯一、紧子集不必闭，粘连引理与唯一性论证失去前提。'),
        condition('第二可数', '删去', '长直线（局部欧氏、连通、Hausdorff、非 A2、非仿紧）', '单位分解与流形的可数图册消失，「仿紧 ⇒ 单位分解」这条最常用的工具用不了。'),
      ],
      commonMisconceptions: [
        '把「局部像 ℝⁿ」读成「整体像 ℝⁿ」：球面与射影空间都是局部欧氏而整体不欧氏。',
        '以为维数 n 是定义的一部分：n 是由局部欧氏条件确定的，且由连通性（或 Brouwer 不变性）保证在连通流形上唯一。',
      ],
      reviewQuestions: [
        '长直线满足除哪一条之外的全部流形公理？它在哪一步破坏单位分解的存在性？',
        '带两个原点的直线为什么不是 Hausdorff？它能否写成坐标卡的覆盖？',
      ],
      selfCheck: [
        selfCheck('sc-top-manifold-1', '为球面 S² 写出两张球极投影卡并核对三条公理。', '构造与核验', 'top:topological-manifold', '两张卡的像都是 ℝ² 开集，同胚；S² 是度量空间故 Hausdorff、A2；两张卡已覆盖。'),
      ],
      evidenceStatus: 'DEF',
    },
    provenance,
  }),
  concept('top:differentiable-manifold', '微分流形', {
    discipline, case: 'top',
    summary: '拓扑流形 + C^r 图册（r ≥ 1）：过渡映射有连续的 r 阶导数。',
    objectType: '拓扑空间', parameters: ['M', 'n', 'r'], predicate: 'DiffManifold(M,n,r)', type: 'o',
    formal: {
      symbols: ['C^r', 'φ_β∘φ_α^{-1}', 'D'],
      typeEnv: { M: 'TopSpace', n: 'N', r: 'N' },
      assumptions: ['M 是 n 维拓扑流形', '存在图册，其全部过渡映射为 C^r'],
      boundary: [
        '本站按「存在一个 C^r 图册」登记（不是指定某一张）；两个 C^r 图册若不相容，则给出不同的微分结构。',
        'C^0 不算微分流形：没有 C^1 结构就定义不出切空间。r = ∞ 时另外写作光滑流形。',
      ],
    },
    representations: [
      representation('rep-top-diffman', 'definition', 'C^r 图册', '公式', 'DEF', '过渡映射 φ_β∘φ_α⁻¹ 与它的逆都是 C^r（r ≥ 1）。'),
    ],
    motivation: {
      internal: ['拓扑流形只能谈连续，要在上面求导必须让换坐标不破坏可微性；把要求写在高阶导数上就是 C^r 结构。'],
      external: ['广义相对论要求 C^∞（或分段 C^r）；数值微分与图像匹配要求至少 C¹。'],
      aesthetic: ['「同一个拓扑流形上可以有几个不等价的微分结构」是一件反直觉而真实的事，它把拓扑与微分结构的区别暴露出来。'],
      growthChain: ['拓扑流形 → 想在坐标上求导 → 发现换坐标会破坏可微性 → 要求过渡映射 C^r → 微分流形'],
    },
    teaching: {
      conditions: [
        condition('r ≥ 1', '允许 r = 0', '只有连续过渡的图册', 'C⁰ 图册下「d( f∘φ⁻¹ )」没有定义，切空间无从谈起。'),
        condition('过渡映射两个方向都 C^r', '只检查一个方向', '同胚但逆不 C^r 的映射', 'C^r 条件是双向的；单向检查会把非微分结构误认为微分结构。'),
        condition('先有拓扑流形（含 A2 与 Hausdorff）', '只保留「局部欧氏」', '长直线上加任意图册', '微分流形的技术结论（单位分解、嵌入）依赖底层拓扑公理，不只是过渡映射的正则性。'),
      ],
      commonMisconceptions: [
        '把微分流形当作「局部像 ℝⁿ 的空间」：那只给出拓扑流形，缺 C^r 结构。',
        '以为拓扑流形上的微分结构唯一：同一个拓扑流形上可以存在不等价的 C^∞ 结构（高维情形有经典反例）。',
      ],
      reviewQuestions: [
        '为什么 r = 0 不算微分流形？用切空间的定义指出缺哪一步。',
        '两个不相容的 C^r 图册给出的是同一个微分流形吗？',
      ],
      evidenceStatus: 'DEF',
    },
    provenance,
  }),
  /*
   * 序列紧与局部紧（2026-10 加）。
   *
   * 为什么要有这两个节点：它们原来只出现在正文里（紧性的「等价表达」与「逐条件反例」），
   * 而**关系**却拿它们当理由——「局部紧 Hausdorff ⇒ T3」和「紧 Hausdorff ⇒ 正规」都用到
   * 这两条边，如果锚点不是节点，那条边在图上是**悬空的**。宁可多两个节点，也不留悬空引用。
   */
  concept('top:sequentially-compact', '序列紧性', {
    discipline, case: 'top',
    summary: '每个序列都有收敛子序列；在度量空间中与紧性等价，在一般空间里不等价。',
    objectType: '拓扑空间性质', parameters: ['X'], predicate: 'SeqCompact(X)', type: 'o',
    formal: {
      symbols: ['x_n', 'n_k'],
      typeEnv: { X: 'TopSpace' },
      assumptions: ['序列取值在 X 中，收敛按 X 的拓扑判定'],
      boundary: [
        '本节点是**辅助前置**：用户点名的 12 项里没有「序列紧性」，它是「紧性」的序列侧对照条件，因此登记为辅助节点而不是主线之一。',
        '这是**度量空间**里与紧性等价的那条刻画；一般拓扑空间里它严格弱于紧性，正确的一般化是网而不是序列。',
        '本站不展开网与子网的一般理论（由 top:countability-axioms 的边界声明序列刻画的失效范围）。',
      ],
    },
    representations: [
      representation('rep-top-seq-compact', 'definition', '每序列有收敛子序列', '公式', 'DEF', '∀(x_n) ∃ 子序列 x_{n_k} 与 x ∈ X 使 x_{n_k} → x。'),
    ],
    motivation: {
      internal: ['分析里「闭区间上连续函数有最值」的证明实际用的是「每序列有收敛子序列」；这个条件在度量空间里与紧性等价，于是两条直觉（序列 / 开覆盖）在最重要的场合一致。'],
      external: ['数值算法里「迭代序列有收敛子列」是可解性的常见判据。'],
      aesthetic: ['它把「有界闭区间」的序列性质与拓扑性质摆在一起对照，差额恰好是度量结构。'],
      growthChain: ['闭区间上的 Bolzano–Weierstrass → 抽象成「每序列有收敛子列」→ 与开覆盖形式对照 → 发现只在度量空间等价'],
    },
    teaching: {
      conditions: [
        condition('序列（而不是网）', '在不可数指标的空间里也用序列', '[0, ω₁] 的序拓扑紧而不序列紧', '序列只有可数多项，追不上第一个不可数序数；一般空间里必须换成网。'),
        condition('度量空间（与紧性等价的前提）', '去掉度量', '不可数离散空间：序列紧吗？——不是；它连紧都不是', '「序列紧 ⇔ 紧」的证明用到度量：序列紧的度量空间完备且全有界，因而紧。去掉度量这条推理断掉。'),
      ],
      commonMisconceptions: ['把「序列紧 ⇔ 紧」当作一般定理：它只在度量空间成立，这也是为什么一般空间的教材只用覆盖定义。'],
      reviewQuestions: ['举一个紧但不序列紧的空间，并指出它的哪条性质使序列刻画失效。'],
      evidenceStatus: 'DEF',
    },
    provenance,
  }),
  concept('top:locally-compact', '局部紧性', {
    discipline, case: 'top',
    summary: '每点有紧邻域；紧空间必局部紧，ℝⁿ 局部紧而不紧。',
    objectType: '拓扑空间性质', parameters: ['X'], predicate: 'LocallyCompact(X)', type: 'o',
    formal: {
      symbols: ['K', 'N(x)'],
      typeEnv: { X: 'TopSpace' },
      assumptions: ['每点有至少一个紧邻域（邻域不必开，T2 时可取到闭的紧邻域）'],
      boundary: [
        '本节点是**辅助前置**：用户点名的 12 项里没有「局部紧性」，它是「紧性」放松整体有限性之后的那一档，因此登记为辅助节点而不是主线之一。',
        '局部紧与紧的关系是单向的：紧 ⇒ 局部紧，反向不成立（ℝⁿ 局部紧而不紧）。',
        '「局部紧 + T2」是 T3 的充分条件；只写局部紧不够——它本身不含分离性。',
      ],
    },
    representations: [
      representation('rep-top-locally-compact', 'definition', '每点有紧邻域', '公式', 'DEF', '∀x ∈ X ∃ 紧集 K 使 x ∈ int K（在 T2 下等价于「有紧邻域」）。'),
    ],
    motivation: {
      internal: ['紧性太强（ℝⁿ 都不满足），但许多论证只需要「每点附近有一个紧块」；把这一条单独命名，就能说清哪些定理其实只要局部紧。'],
      external: ['局部紧性是单点紧化存在的前提，也是流形上「局部欧氏 ⇒ 局部紧」的来源。'],
      aesthetic: ['它把「整体有限」放松成「逐点有限」，与仿紧性把「有限」放松成「局部有限」是同一个手法。'],
      growthChain: ['紧性太强 → 逐点地要求紧邻域 → 局部紧 → 与 T2 合起来得到 T3'],
    },
    teaching: {
      conditions: [
        condition('每点有紧邻域', '退成「每点有相对紧的开邻域」而不要求闭包紧', '非 T2 空间里闭包可能不含于任何紧集', '在 T2 空间里两者等价；去掉 T2 之后「紧邻域」与「相对紧邻域」会分开。'),
        condition('Hausdorff（用在 T3 上）', '只留局部紧', '局部紧但非 T2 的空间', '「局部紧 Hausdorff ⇒ T3」里的 T2 不可省：那条证明用 T2 把点与闭集分开。'),
      ],
      commonMisconceptions: ['把局部紧当作紧的推论方向反了：ℝⁿ 局部紧而不紧，紧只是局部紧的一个充分条件。'],
      reviewQuestions: ['局部紧 + T2 能推出哪一档分离性？证明里 T2 的作用是什么？'],
      evidenceStatus: 'DEF',
    },
    provenance,
  }),
];

/* ------------------------------------------------------------------ *
 * 二、7 条断言
 * ------------------------------------------------------------------ */

export const topClaimNodes = [
  claim('top:claim-compact-normal', '紧 Hausdorff 空间是正规空间', {
    discipline, case: 'top', roles: ['Theorem'],
    summary: '紧 + T2 ⇒ T4：任意两个不交闭集可用不交开集分离。',
    formula: 'Compact(X) ∧ T2(X) ⇒ Normal(X)', typeEnv: { X: 'TopSpace' },
    formal: { assumptions: ['X 紧', 'X 是 Hausdorff 空间'], boundary: ['Hausdorff 不可省：余有限拓扑空间紧、T1，但不正规。'] },
    motivation: {
      internal: ['正规性是 Urysohn 引理与单位分解的前提；分析里要构造「分离函数」时，第一步就是这条定理。'],
      external: ['数值方法里构造缓冲区（把两个不相交区域用光滑函数分开）靠它。'],
      aesthetic: ['结论（分离闭集）比前提（分离点）强，靠的是紧性提供的有限性。'],
      growthChain: ['T2 分离两点 → 用紧性把「逐点分离」升成「开集的有限交」→ 分离两个闭集'],
    },
    teaching: {
      proofOverview: '先对每个点 x ∈ A 用 T2 找开邻域与 B 的不交分离；紧性把覆盖 A 的这一族抽出有限子覆盖，取对应邻域的交与并，得到分离 A 与 B 的不交开集。',
      conditions: [
        condition('Hausdorff', '只留 T1', '余有限拓扑的实数集', 'T1 只能分离点与点，不能分离点与闭集，证明在「找不交邻域」这一步就断了。'),
        condition('紧性', '只留局部紧', '长直线：局部紧 Hausdorff，但不正规（T4 的分离在无穷远处失败）', '有限子覆盖换取「有限交」，去掉紧性后这一步必须换成局部有限，而这正需要仿紧性。'),
      ],
      commonMisconceptions: ['以为紧空间必正规：需要 Hausdorff；紧 T1 空间可以既不 T2 也不正规。'],
      reviewQuestions: ['证明里「有限子覆盖」具体换来了什么？如果换成局部有限加细，还需要额外假设什么？'],
      evidenceStatus: 'PROOF',
    },
    provenance,
  }),
  claim('top:claim-compact-paracompact', '紧 Hausdorff 空间是仿紧空间', {
    discipline, case: 'top', roles: ['Theorem'],
    summary: '紧 + T2 ⇒ 仿紧：任意开覆盖有局部有限开加细。',
    formula: 'Compact(X) ∧ T2(X) ⇒ Paracompact(X)', typeEnv: { X: 'TopSpace' },
    formal: { assumptions: ['X 紧', 'X 是 Hausdorff 空间'], boundary: ['紧性只给「有限子覆盖」；「局部有限」严格更弱，所以这是一条真推广，不是等价改写。'] },
    motivation: {
      internal: ['单位分解的存在性定理陈述为「仿紧 Hausdorff 空间上」，把紧空间纳入同一个定理的最省事方式就是这条蕴含。'],
      external: ['有限元网格的局部化、覆盖数据的有限邻域组织都依赖这层结构。'],
      aesthetic: ['它把紧性「整体有限」的强条件转成「局部有限」的弱条件，于是 ℝⁿ 这类非紧空间也能享受同样的工具。'],
      growthChain: ['紧 ⇒ 有限子覆盖 → 弱化成局部有限 → 仿紧 → 与单位分解对接'],
    },
    teaching: {
      proofOverview: '取开覆盖的有限子覆盖，再用 T2 与紧性把每个成员缩小成局部有限的族（正则性由紧 Hausdorff ⇒ 正规性给出），得到局部有限的开加细。',
      conditions: [
        condition('紧性', '删去，只留 T2', '考虑 T2 空间能否当反例：ℝ 同时具有仿紧与非紧这 2 条性质，它不是反例', '这条蕴含证明里紧性提供有限性；删去后定理不成立（存在 T2 非仿紧空间），但举反例要用比 ℝ 复杂的例子。'),
        condition('Hausdorff', '只留紧', '余有限拓扑的实数集紧但非 T2，也非仿紧', '紧性本身给不出局部有限加细所需的分离工具。'),
      ],
      commonMisconceptions: ['以为仿紧与紧同义：ℝⁿ 仿紧而不紧，紧只是仿紧的一个充分条件。'],
      reviewQuestions: ['为什么「有限子覆盖」可以推出「局部有限加细」，而反过来不行？'],
      evidenceStatus: 'PROOF',
    },
    provenance,
  }),
  claim('top:claim-metric-paracompact', '度量空间是仿紧空间', {
    discipline, case: 'top', roles: ['Theorem'],
    summary: '每个度量空间都是仿紧的（Stone 定理的第一部分）；度量空间也是正规的。',
    formula: 'MetricSpace(X) ⇒ Paracompact(X) ∧ Normal(X)', typeEnv: { X: 'TopSpace' },
    formal: { assumptions: ['X 的拓扑由某个度量 d 诱导'], boundary: ['结论给了仿紧与正规，但不给第二可数：不可数离散空间是度量空间、仿紧、但不 A2。'] },
    motivation: {
      internal: ['分析里默认的 ℝⁿ 与巴拿赫空间都自动落在定理的适用范围内，这条断言解释了「为什么分析中几乎不需要检查仿紧性」。'],
      external: ['任何用距离建模的空间（信号空间、概率度量空间）都自动获得单位分解与嵌入工具。'],
      aesthetic: ['度量这一条额外结构一次给出两条分离性质，是「结构越丰富、条件越自动」的典型。'],
      growthChain: ['度量 → 开球族可数化尝试 → 得到局部有限加细 → 仿紧'],
    },
    teaching: {
      proofOverview: '用度量给每个覆盖做细化：按点到补集的距离把覆盖缩小到局部有限的族；正规性由度量给出连续分离函数得到。',
      conditions: [
        condition('由度量诱导的拓扑', '只留一般 T2', 'Sorgenfrey 直线可度量化，长直线不可度量化', '这条断言的前提是度量存在；长直线是 T2 非仿紧且不可度量化的例子，说明不能把结论推广到一切 T2 空间。'),
        condition('仿紧（不加 A2）', '误以为仿紧 ⇒ A2', '不可数离散空间：仿紧、度量、非 A2', '仿紧与可数性互不包含，这是两条独立的公理。'),
      ],
      commonMisconceptions: ['把「度量空间」当作「一定第二可数」：可分度量空间才 A2，一般不是。'],
      reviewQuestions: ['不可数离散空间是度量空间吗？它仿紧吗？它 A2 吗？三个问题各给一句依据。'],
      evidenceStatus: 'PROOF',
    },
    provenance,
  }),
  claim('top:claim-a2-a1', '第二可数蕴含第一可数', {
    discipline, case: 'top', roles: ['Theorem'],
    summary: 'A2 ⇒ A1：全局可数基限制到每点给出可数邻域基。',
    formula: 'A2(X) ⇒ A1(X)', typeEnv: { X: 'TopSpace' },
    formal: { assumptions: ['X 有可数基 𝔅'], boundary: ['反向不成立：Sorgenfrey 直线 A1 但不 A2。'] },
    motivation: {
      internal: ['这是四条可数性条款之间唯一一条无条件成立的蕴含；把它钉下来，才能说明为什么 A1 与 A2 必须分成两个节点。'],
      external: ['证明「序列充分」时只需要 A1；这解释了为什么度量空间（自动 A1）里用序列就够。'],
      aesthetic: ['把全局对象（基）限制到一点，得到局部对象（邻域基）——一句话的构造完成一次降维。'],
      growthChain: ['全局基 → 取「含该点的成员」→ 局部邻域基 → A2 ⇒ A1'],
    },
    teaching: {
      proofOverview: '设 𝔅 是可数基，取 𝔅_x = {B ∈ 𝔅 : x ∈ B}，它是可数的；对任一邻域 U 取开集 W ⊆ U 含 x，再由基的定义取 B ∈ 𝔅 使 x ∈ B ⊆ W ⊆ U，于是 B ∈ 𝔅_x，得邻域基。',
      conditions: [condition('𝔅 是基（不只是一族开集）', '只给出一族含 x 的开集', '任取一族开集都可能不构成邻域基', '证明的第二步「找到基成员夹在中间」正是基的定义。')],
      commonMisconceptions: ['以为 A1 ⇒ A2：Sorgenfrey 直线是标准反例。'],
      reviewQuestions: ['若把「可数基」换成「局部有限的可数基」，结论还成立吗？'],
      evidenceStatus: 'PROOF',
    },
    provenance,
  }),
  claim('top:claim-a2-separable', '第二可数蕴含可分', {
    discipline, case: 'top', roles: ['Property'],
    summary: 'A2 ⇒ 可分：可数基中每个非空成员取一点即得可数稠密子集。',
    formula: 'A2(X) ⇒ Separable(X)', typeEnv: { X: 'TopSpace' },
    formal: { assumptions: ['X 有可数基 𝔅'], boundary: ['反向不成立：Sorgenfrey 直线与 (ℝ, τ_c) 都是可数补拓扑或下极限拓扑下的可分非 A2 例子。'] },
    motivation: {
      internal: ['度量空间的标准结论「可分 ⇔ A2」有两个方向：这一条是无条件的那一半，反方向要度量。把两半分开登记，才不会把度量的作用藏起来。'],
      external: ['「用可数多个代表点近似整个空间」是数值逼近与统计估计的基本假设。'],
      aesthetic: ['选择公理在这里只是可数次使用（从每个非空基成员取一点），不构成额外假设。'],
      growthChain: ['可数基 → 每个非空成员取一点 → 可数稠密子集 → 可分'],
    },
    teaching: {
      proofOverview: '从 𝔅 的每个非空成员取一点组成 D；D 可数。任一非空开集含基成员，因而与 D 相交，故 D 稠密。',
      conditions: [
        condition('可数基中每个非空成员都可选取点', '要求显式给出选取规则', '一般拓扑空间里基成员没有自然代表元', '这一步是可数多次选择，在 ZF 中一般需要可数选择；本站如实记为 REF 级前提——证据标签 REF 说的正是这件事，不声称给出了显式 D。'),
        condition('基成员非空', '把空集也计入', '空集不能提供点', '取点步骤只在非空成员上进行；这是构造里唯一的细节。'),
      ],
      commonMisconceptions: ['把可分当作「空间小」：任何集合上的余可数拓扑都可分，即使集合不可数。'],
      reviewQuestions: ['可分 ⇒ A2 的证明只在度量空间成立，它用到度量的什么性质？'],
      evidenceStatus: 'REF',
    },
    provenance,
  }),
  claim('top:claim-sigma-local-not-compact', 'σ-紧且局部紧不蕴含紧', {
    discipline, case: 'top', roles: ['Property'],
    summary: '存在一个 σ-紧、局部紧、Hausdorff、第一可数的空间，它不是紧的（取 ℕ 上的离散拓扑这 1 个见证）。',
    formula: '∃X: SigmaCompact(X) ∧ LocallyCompact(X) ∧ ¬Compact(X)', typeEnv: { X: 'TopSpace' },
    formal: { assumptions: ['反例空间取 ℕ 上的离散拓扑'], boundary: ['本命题只否定「σ-紧 + 局部紧 ⇒ 紧」这一条蕴含；长直线（连通、σ-紧失败）不能当这条的见证，它的 σ-紧性不成立。'] },
    motivation: {
      internal: ['σ-紧与紧常被混为一谈；把两个条件都调到很强（局部紧、Hausdorff）再给出非紧的例子，才能把这层差额钉住。'],
      external: ['程序状态空间与配置空间常被假设为 σ-紧（可数层）而非紧，这层区别决定了算法是否必须处理无限情形。'],
      aesthetic: ['ℕ 的离散拓扑上每条性质都能一行核验，是「条件即反例」的最小展览。'],
      growthChain: ['紧 ⇒ σ-紧 → 问反向 → 想用不可数离散空间 → 发现它不 σ-紧 → 改用 ℕ 的离散拓扑'],
    },
    teaching: {
      proofOverview: '取 X = ℕ 上的离散拓扑。σ-紧：X = ⋃_{n∈ℕ} {n}，每个单点集（有限集）紧。局部紧：每点的开邻域 {n} 紧。Hausdorff：离散族分离任两点。不紧：覆盖 {{n} : n ∈ ℕ} 没有有限子覆盖。',
      conditions: [
        condition('可数并（不是任意并）', '改用不可数离散空间', '不可数离散空间不是 σ-紧的（任一可数族至多覆盖可数子集）', 'σ-紧的见证必须真的**可数**并；用不可数离散空间会得到一个不满足前提的伪反例。'),
        condition('局部紧这一条要单独核验', '只核验 σ-紧', 'ℚ 是 σ-紧（可数）但不局部紧', '局部紧不能从 σ-紧读出；本命题的形式陈述把两条并列，缺一不可。'),
      ],
      commonMisconceptions: ['以为 σ-紧 + 局部紧就自动紧：ℕ 的离散拓扑同时满足两条而不紧。'],
      reviewQuestions: ['不可数离散空间 σ-紧吗？它与 ℕ 的离散拓扑在差在哪一条上？'],
      evidenceStatus: 'PROOF',
    },
    provenance,
  }),
  /*
   * 有限补拓扑空间的单元登记（2026-10 加）。
   *
   * 为什么从「一个空间」升成一条腿：它同时承担**两条**不同的反例——
   * ① 紧 + T1 ⇏ 正规（`top:claim-compact-normal` 的反例方向）；② 紧 ⇏ 紧子集闭（不需要 T2）。
   * 原来它只在 `top:ce-cofinite` 里被讲一次，断言那边只给了文字，图上没有边。
   */
  claim('top:claim-cofinite-t1-not-t2', '有限补拓扑空间是 T1 而不是 T2', {
    discipline, case: 'top', roles: ['Property'],
    summary: 'ℝ 上的有限补拓扑：单点集闭（T1），但任意两个非空开集相交（非 T2）；它紧、连通，且不正规。',
    formula: 'CofiniteSpace(ℝ) ⇒ T1(ℝ) ∧ ¬T2(ℝ) ∧ Compact(ℝ) ∧ ¬Normal(ℝ)',
    typeEnv: { X: 'TopSpace' },
    formal: {
      assumptions: ['开集 = 空集或有限补集'],
      boundary: [
        '本命题只说明「T1 与 T2 之间不能互相替换」，以及「紧 + T1 ⇏ 正规」；它**不**否定「紧 + T2 ⇒ 正规」。',
        '它也**不**否定「紧 Hausdorff 空间中紧子集闭」——本条的空间不满足 T2，正在那条定理的假设之外。',
      ],
    },
    motivation: {
      internal: ['分离公理的谱系需要一个只满足最低档的具体模型；有限补拓扑是最标准的一个，而且它还顺带否定了「紧 ⇒ 正规」。'],
      external: ['在允许「几乎所有点都相同」的粗粒度模型里，这类拓扑自然出现。'],
      aesthetic: ['一个只把补集限制成有限的改动，就把 T1、T2、正规性三条分开。'],
      growthChain: ['想造 T1 非 T2 的空间 → 让开集都很大（补集有限）→ 单点集闭 → 得到模型'],
    },
    teaching: {
      proofOverview: 'T1：单点集的补集是 ℝ∖{x}，它的补集 {x} 有限，故 ℝ∖{x} 开。非 T2：两个非空开集的补集都有限，故必相交。紧：任一开覆盖含一个非空开集 U，其补有限，用有限多个成员覆盖补。非正规：两个不交闭集至少有一个有限，它的开邻域必与另一个闭集的开邻域相交。',
      conditions: [
        condition('补集有限（不是可数补）', '换成可数补集', '余可数拓扑：T1 仍成立，但不紧', '本命题的紧性依赖「补集有限」；换成可数会把紧性一并丢掉，反例就不再指向同一件事。'),
      ],
      commonMisconceptions: ['以为 T1 + 紧就有分离性：T1 只保证单点集闭，不保证两点可用不交开邻域分开。'],
      reviewQuestions: ['这个空间 A1 吗？A2 吗？可分吗？逐一给出依据。'],
      evidenceStatus: 'PROOF',
    },
    provenance,
  }),
  claim('top:claim-connected-intermediate', '连通空间的连续像是连通的（中值定理的拓扑来源）', {
    discipline, case: 'top', roles: ['Theorem'],
    summary: '连通空间在连续映射下的像是连通的；对实值函数即中值定理。',
    formula: 'Connected(X) ∧ Continuous(f) ⇒ Connected(f(X))', typeEnv: { X: 'TopSpace', f: 'X -> Y' },
    formal: { assumptions: ['X 连通', 'f 连续'], boundary: ['本站在此只登记拓扑层面的结论；rudin 案例的 rudin:continuity-connectedness 是它在 ℝ 上的分析版本，两处互不覆盖。'] },
    motivation: {
      internal: ['中值定理常被当作分析定理，它的证明其实只用到「区间的像是区间」这一条拓扑事实；把载体从 ℝ 换成任意连通空间，定理照样成立。'],
      external: ['可达性判定、连续变形下的不变量传播都靠这条结论。'],
      aesthetic: ['证明只有两行：原像保持开集、连通性按原像定义否定分离。'],
      growthChain: ['区间上的中值定理 → 抽掉序结构 → 连通空间的连续像 → 一般的传播定理'],
    },
    teaching: {
      proofOverview: '设 f(X) = U ∪ V 为两个不交非空开集之并（相对 f(X)）。取原像得 X = f⁻¹(U) ∪ f⁻¹(V)，两者不交非空且开（连续性），与 X 连通矛盾。',
      conditions: [
        condition('f 连续', '删去', '从连通空间到两点的离散空间的任意非连续满射', '非连续映射可以把连通的区间映成两个孤立点，结论立即失败。'),
          { condition: 'X 连通', remove: '换成「局部连通」', counterexample: '拓扑学家的正弦曲线连通但不局部连通：0 个公共点、0 条连接路径、1 个连通分量；而局部连通也不蕴含连通', effect: '结论要求整体连通；把局部连通当前提会改变命题。' },
      ],
      commonMisconceptions: ['把中值定理当作实数的序性质：它用的是连通性，不是序。'],
      reviewQuestions: ['若把「连通」换成「道路连通」，结论还成立吗？证明要改哪一步？'],
      evidenceStatus: 'REF',
    },
    provenance,
  }),
];

/* ------------------------------------------------------------------ *
 * 三、反例与例子
 * ------------------------------------------------------------------ */

export const topCounterexampleNodes = [
  counterexample('top:ce-sorgenfrey', 'Sorgenfrey 直线：A1 且可分，却不 A2', {
    discipline, case: 'top',
    summary: '下极限拓扑（基为 [a,b)）；它同时是「σ-紧 ⋠ 仿紧」的见证。',
    target: '第一可数 ⇒ 第二可数（以及可分 ⇒ 第二可数）',
    objectSpec: { set: 'ℝ', base: '{[a,b) : a < b}', 性质: 'A1、可分、正规、σ-紧；不 A2、不仿紧、不可分度量化的替代' },
    failureWitness: 'ℚ 是它的可数稠密子集（故可分）；而任一基都须包含形如 [x, x+1/n) 的成员，逐点取 n 给出不可数族，故不存在可数基：这 2 条分别否定了 A2 与可分带来的可数性。',
    formal: {
      anchors: ['top:countability-axioms'],
      boundary: [
        '本反例只否定「A1 ⇒ A2」与「可分 ⇒ A2」；它**不**否定「可度量化 + 可分 ⇒ A2」（Sorgenfrey 直线恰是不可度量化的）。',
        '它也不否定 A2 ⇒ A1：那条蕴含另由 top:claim-a2-a1 登记并证明——A1 与 A2 这两条的方向不能互换。',
      ],
    },
    representations: [
      representation('rep-top-ce-sorgenfrey', 'counterexample', 'Sorgenfrey 直线', '集合论构造', 'PROOF', 'ℚ 稠密；基里必须出现每点处的半开区间，故基不可数。'),
    ],
    motivation: {
      internal: ['A1 与 A2 的定义只差一个量词（「每点的邻域系」对「整体的基」），需要具体空间说明这个差别是真的。'],
      external: ['在算法与逻辑里，把「局部可数信息」误当成「全局可数信息」是常见的错误推广。'],
      aesthetic: ['一个只改了开集族一半（把左端点闭起来）的例子，就把四条可数性条款全部区分开。'],
      growthChain: ['A2 ⇒ A1 成立 → 问反向 → 改动 ℝ 的拓扑保 A1 → 检查可数基 → 得到反例'],
    },
    teaching: {
      proofOverview: '可分：ℚ 与任何非空基成员相交。不 A2：设 𝔅 为基，对每个 x 与 n 取基成员 B 使 x ∈ B ⊆ [x, x+1/n)，则 B 含 x 为其左端点，故 x 由 B 的左端点确定，映射 B ↦ (左端点, 右端点) 单射到不可数集，𝔅 不可数。',
      conditions: [
        condition('把 ℝ 的拓扑换成下极限拓扑', '保留通常拓扑', '通常拓扑是 A2 的（可数基为开区间 with rational endpoints）', '反例依赖拓扑改变；这一步说明「A1 但不 A2」不是逻辑缺陷而是真的空间性质。'),
        condition('σ-紧但不仿紧', '误以为 σ-紧 ⇒ 仿紧', '同上空间', '本反例同时承担两条否定；正文分别写出两类见证，不混用。'),
      ],
      commonMisconceptions: ['把 Sorgenfrey 直线当作可度量化的空间，从而以为它违反「可分度量空间 ⇒ A2」：这条推理恰恰是有和无这 2 个方向里不该用的那一边。'],
      reviewQuestions: ['Sorgenfrey 直线是 Lindelöf 的吗？如果是，为什么它仍不是仿紧的？'],
      evidenceStatus: 'PROOF',
    },
    provenance,
  }),
  counterexample('top:ce-cofinite', '余有限拓扑：紧、T1，但不 T2', {
    discipline, case: 'top',
    summary: 'ℝ 上的余有限拓扑（开集为补集有限者与空集）。',
    target: '紧空间 ⇒ 正规（以及紧空间 ⇒ 子集闭、T1 ⇒ T2）',
    objectSpec: { set: 'ℝ', open: '{U : ℝ∖U 有限} ∪ {∅}', 性质: '紧、T1、连通；不 T2、不正规、不仿紧、不 A1' },
    failureWitness: '任两点都在每个非空开集里同时出现，故不存在不交非空开集；同时任一开覆盖含一个非空开集 U，其补有限，用有限多个开集覆盖补即得有限子覆盖。',
    formal: {
      anchors: ['top:compactness', 'top:separation-axioms'],
      boundary: [
        '本反例只否定「紧 + T1 ⇒ 正规」「紧 ⇒ 子集闭」；它**不**否定「紧 + T2 ⇒ 正规」（另由 top:claim-compact-normal 登记）。',
        'T1 在这里成立（单点集是有限的，故补集开），这一条必须核验，否则反例会被误读为「连 T1 都不满足」。',
      ],
    },
    representations: [
      representation('rep-top-ce-cofinite', 'counterexample', '余有限拓扑空间', '集合论构造', 'PROOF', '任一非空开集补集有限，故开覆盖有有限子覆盖；任两非空开集相交，故非 T2。'),
    ],
    motivation: {
      internal: ['「紧」「T1」两条都满足而不 T2 的例子最省事：它把紧性的分离性前提与 Hausdorff 的作用一次说清。'],
      external: ['在验证与模型检验中，把「有限覆盖可提取」误当成「可分离」是同类错误。'],
      aesthetic: ['余有限拓扑是「开集很少」的极端：正因为它少，覆盖容易有限，也是因为它少，分离无从谈起。'],
      growthChain: ['紧的定义 → 找满足紧的最简空间 → 余有限拓扑 → 检查 T2 → 失败 → 分离性前提不可省'],
    },
    teaching: {
      proofOverview: '紧：取开覆盖，任取非空开集 U，其余有限多个点各取一个覆盖成员，得有限子覆盖。T1：单点集补集开。非 T2：任两个非空开集相交。非正规：两个不交闭集至少有一个有限，它的开邻域与另一个闭集的邻域必相交。',
      conditions: [
        condition('T1（单点集闭）', '改成余可数拓扑（可数补集）', '同样的构造在可数补集下仍有 T1 但不紧', '反例的指向必须精确：本节点否定的是「紧 + T1 ⇒ 正规」，若构造不出 T1，否定范围会变形。'),
        condition('补集有限', '允许补集可数', '余可数拓扑空间：仍 T1，但不紧', '「紧」这一步依赖补集有限；换成可数会同时失去紧性，反例就不再指向同一个错误命题。'),
      ],
      commonMisconceptions: ['以为 T1 + 紧就有分离性：T1 只保证单点集闭，不保证两点可用不交开集分开。'],
      reviewQuestions: ['这个空间 A1 吗？A2 吗？可分吗？逐一给出依据。'],
      evidenceStatus: 'PROOF',
    },
    provenance,
  }),
  counterexample('top:ce-long-line', '长直线：局部欧氏 + Hausdorff + 连通，但非 A2、非仿紧', {
    discipline, case: 'top',
    summary: '把不可数多个 [0,1) 按序粘起来得到的空间；它是第二可数与仿紧不可省的见证。',
    target: '局部欧氏 + Hausdorff ⇒ 第二可数（以及局部欧氏 + Hausdorff ⇒ 仿紧）',
    objectSpec: { set: 'ω₁ × [0,1) 上的字典序（去掉最小元）', 性质: '局部欧氏（1 维）、连通、道路连通、Hausdorff、局部紧、Γ-紧；非 A2、非仿紧、不可度量化' },
    failureWitness: '任一基在每个 [0,1) 段内都要有不可数多个成员，故不存在可数基；开覆盖 {[α, α+1)} 不存在局部有限开加细，故非仿紧。',
    formal: {
      anchors: ['top:topological-manifold', 'top:paracompactness'],
      boundary: [
        '本反例只否定「局部欧氏 + Hausdorff ⇒ A2」与「同样的假设 ⇒ 仿紧」；它**不**否定「第二可数 + 局部欧氏 ⇒ 仿紧」。',
        '长直线是连通的：不能因为「不可数多个小块」就以为它不连通，这一点必须核验。',
      ],
    },
    representations: [
      representation('rep-top-ce-longline', 'counterexample', '长直线', '集合论构造', 'REF', '不可数序数的序拓扑；A2 与仿紧的缺失由基与覆盖论证给出。'),
    ],
    motivation: {
      internal: ['流形定义的三条公理里，第二可数最容易被当作「技术性附加」；长直线正是把它变成实质条件的那种空间。'],
      external: ['在把「局部像 ℝⁿ」当作建模前提的工程里，忽略可数性会引出无法用单位分解的病态模型。'],
      aesthetic: ['它比 ℝ 长、比 ℝ 复杂，却在每一点上与 ℝ 完全一样——局部与整体的差距在这里最大。'],
      growthChain: ['局部欧氏 → 加 Hausdorff → 想加 A2 → 去掉 A2 造例子 → 长直线'],
    },
    teaching: {
      proofOverview: '非 A2：若存在这 1 个可数基，则在每个 [α, α+1) 段内给出 1 个可数邻域基，但每点处的半开区间族不可数，与「基可数」这 2 条要求都冲突。非仿紧：覆盖 {[α, α+1)} 的任一加细都必须含每个 α 处的一个成员，且这些成员在序数方向上的分布使任何邻域的相交数都无界。',
      conditions: [
        condition('不可数多个区间段', '只取可数多段', '可数多个 [0,1) 粘起来即 [0,∞)，它是 A2 的', '反例依赖不可数性；可数版本恰恰是 A2 空间，这说明 A2 是真实的分界。'),
        condition('Hausdorff 与连通性必须核验', '只说明非 A2', '带两个原点的直线：非 Hausdorff、A2、非连通', '本反例的价值在于除 A2 与仿紧外**所有**公理都成立；少核验一条，它的指向就变弱。'),
      ],
      commonMisconceptions: [
        '以为「不可数多个小块粘起来」一定不连通：长直线是连通且道路连通的。',
        '把长直线当成流形：按本站与教材的一致约定，流形要求第二可数，故长直线不是流形。',
      ],
      reviewQuestions: ['长直线满足流形公理中的哪几条？缺的那一条在单位分解的存在性证明里被用在哪里？'],
      evidenceStatus: 'REF',
    },
    provenance,
  }),
  counterexample('top:ce-uncountable-discrete', '不可数离散空间：仿紧、度量，但不 A2', {
    discipline, case: 'top',
    summary: '离散拓扑下的不可数集：它把「仿紧 ⇒ A2」与「度量 ⇒ A2」两种误推一次否定。',
    target: '仿紧 ⇒ 第二可数（以及度量空间 ⇒ 第二可数）',
    objectSpec: { set: '不可数集合 X', open: 'P(X)', 性质: '离散、度量（d 为 0/1 度量）、A1、仿紧、正规；不 A2、不可分、σ-紧失败' },
    failureWitness: '任一基都须包含全部单点集，故基不可数；每个子集都是开集，故任意覆盖本身就是局部有限的开加细，从而仿紧。',
    formal: {
      anchors: ['top:paracompactness', 'top:topological-manifold'],
      boundary: [
        '本反例只否定「仿紧 ⇒ A2」与「度量 ⇒ A2」；它**不**否定「可分度量 ⇒ A2」（本空间不可分）。',
        '它也不能当作「σ-紧 + 局部紧 ⇎ 紧」的见证：不可数离散空间不是 σ-紧的（该见证改由 ℕ 的离散拓扑承担，见 top:claim-sigma-local-not-compact）。',
      ],
    },
    representations: [
      representation('rep-top-ce-discrete', 'counterexample', '不可数离散空间', '集合论构造', 'PROOF', '每个子集开 ⇒ 覆盖即加细；单点集都须入基 ⇒ 基不可数。'),
    ],
    motivation: {
      internal: ['可数性公理与分离公理、紧性条件互相独立，需要一批「只满足其中几条」的空间来定位每条公理的边界。'],
      external: ['在把索引集当作离散空间的构造（如不可数基下的信号族）里，这类空间自然出现。'],
      aesthetic: ['离散拓扑是最简单的拓扑，却给出 A2 与仿紧完全分离的例子。'],
      growthChain: ['度量 ⇒ 正规 → 问 A2 → 取不可数离散空间 → 得到反例'],
    },
    teaching: {
      proofOverview: '离散空间中 {x} 是开集，故任一覆盖自身就是它的开加细；而每点的邻域 {x} 只与这一个成员相交，故该族局部有限——加细与局部有限两条同时成立，故仿紧。基须含每个 {x}，故基不可数。',
      conditions: [
        condition('集合不可数', '换成可数集合', 'ℕ 的离散拓扑是 A2 的（可数基）', '反例依赖不可数性；可数版本反而是 A2，这再次说明 A2 不可由仿紧或度量推出。'),
        condition('离散拓扑（每点孤立）', '换成不可数集上的余可数拓扑', '该空间紧、T1，但不 A2，且**不是**度量空间', '若只想要「非 A2」，用余可数拓扑更省事；但它不能同时充当「度量且非 A2」的见证。'),
      ],
      commonMisconceptions: ['以为度量空间都可分或都 A2：不可数离散空间是度量空间，两者都不满足。'],
      reviewQuestions: ['不可数离散空间上 σ-紧性为什么失败？这与你对「紧 ⇒ σ-紧」的理解是否矛盾？'],
      evidenceStatus: 'PROOF',
    },
    provenance,
  }),
];

export const topExampleNodes = [
  example('top:example-sphere-charts', '球面的两张球极投影卡', {
    discipline, case: 'top',
    summary: 'S² 由两张卡覆盖；过渡映射在 ℝ²∖{0} 上显式写出，是拓扑图册的最小例子。',
    concept: 'top:atlas',
    objectSpec: { M: 'S² = {(x,y,z) : x²+y²+z²=1}', charts: 'φ_N: S²∖{N} → ℝ² 与 φ_S: S²∖{S} → ℝ² 的球极投影' },
    satisfaction: '两张卡的像都是 ℝ² 的开集（整个 ℝ²），都是同胚，且 U_N ∪ U_S = S²，故构成图册。',
    formal: { boundary: ['本例子只核验拓扑图册（过渡映射连续且为同胚）；C^r 条件由 top:differentiable-manifold 另行登记。'] },
    representations: [
      representation('rep-top-ex-sphere', 'example', '球极投影', '公式与图示', 'PROOF', '过渡映射 y = x/|x|²（在 ℝ²∖{0} 上）光滑且自逆。'),
    ],
    motivation: {
      internal: ['球面没有全局坐标卡，但两张就够了；这个例子说明「图册」不是抽象空话。'],
      external: ['地理坐标（经纬）与地图投影的南北极问题正是这个构造。'],
      aesthetic: ['两张卡的过渡映射恰好是反演，形式极简而可完整计算。'],
      growthChain: ['球面无法整体参数化 → 去掉一个点后可以 → 去掉北极与南极两张 → 计算过渡映射'],
    },
    teaching: {
      proofOverview: 'φ_N 与 φ_S 由中心投影给出，互为逆的显式公式；重叠域为 S²∖{N,S}，过渡映射为 x ↦ x/|x|²，在 ℝ²∖{0} 上光滑。',
      conditions: [
        condition('两张卡而非一张', '只取一张卡', '剩下一极未被覆盖', '覆盖条件不能省：少一张卡就有流形定义一个反例。'),
        condition('过渡映射定义域是重叠域的像', '在整个 ℝ² 上讨论', 'φ_S∘φ_N⁻¹ 在 0 处无定义（对应北极）', '过渡映射的定义域必须限制到重叠域的像，这正是坐标卡要 φ(U) 开的原因。'),
      ],
      commonMisconceptions: ['以为「球面是流形」需要三维空间中的嵌入：局部欧氏性与嵌入无关。'],
      reviewQuestions: ['这两张卡给出 S² 的什么图册？它们是否 C^∞ 相容？'],
      selfCheck: [selfCheck('sc-top-ex-sphere-1', '写出球极投影的显式公式并验证 φ_S∘φ_N⁻¹(x)=x/|x|²。', '计算', 'top:example-sphere-charts', '由共线关系解出参数即得。')],
      evidenceStatus: 'PROOF',
    },
    provenance,
  }),
  example('top:example-projective-line', '实射影直线的两张仿射卡', {
    discipline, case: 'top',
    summary: 'ℝP¹ 由仿射卡 U₀、U₁ 覆盖，过渡映射为 t ↦ 1/t，是「商空间带图册」的最小例子。',
    concept: 'top:atlas',
    objectSpec: { M: 'ℝP¹ = (ℝ²∖{0})/∼，[x:y] 为齐次坐标', charts: 'U₀ = {x≠0} 与 U₁ = {y≠0}，φ₀([x:y])=y/x，φ₁([x:y])=x/y' },
    satisfaction: '两张卡覆盖 ℝP¹，过渡映射 t ↦ 1/t 在 ℝ∖{0} 上光滑且自逆。',
    formal: { boundary: ['本例子用齐次坐标写卡；商空间的 Hausdorff 性与局部欧氏性需另行核验（正文给出），不在本节点的形式负载里。'] },
    representations: [
      representation('rep-top-ex-rp1', 'example', '射影直线的仿射卡', '公式', 'PROOF', '两张卡覆盖；过渡映射为 t ↦ 1/t。'),
    ],
    motivation: {
      internal: ['它是第一个「不是某个 ℝⁿ 子空间」的流形例子，说明局部欧氏性不依赖嵌入。'],
      external: ['射影几何、计算机视觉中的灭点与方向都活在这里。'],
      aesthetic: ['ℝP¹ 恰是一个圆周，但按图册构造比按嵌入构造更能说明流形的抽象性。'],
      growthChain: ['齐次坐标 → 商掉缩放 → 两张仿射卡 → 过渡 t ↦ 1/t'],
    },
    teaching: {
      proofOverview: '把 [x:y] 按是否 x=0 分成两片；每片上齐次坐标可唯一归一化，给出到 ℝ 的同胚；重叠域上两片归一化互为倒数，得过渡映射。',
      conditions: [
        condition('商拓扑下的 Hausdorff 性', '只写卡而不查分离性', '若不核验，无法确认它满足流形公理', '本例子把「卡好写、分离性与 A2 要另证」这一步显式写出，避免「有图册就是流形」的跳步。'),
      ],
      commonMisconceptions: ['以为商空间自动 Hausdorff：一般商映射不保持分离性，需要单独论证。'],
      reviewQuestions: ['ℝP¹ 与圆周同胚，为什么仍然值得用图册语言写一遍？'],
      evidenceStatus: 'PROOF',
    },
    provenance,
  }),
];

/* ------------------------------------------------------------------ *
 * 四、误区模式（只有 4 条进独立节点，其余进教学字段）
 * ------------------------------------------------------------------ */

export const topPatternNodes = [
  patternNode('top:pattern-local-euclidean', '误区：局部像欧氏空间就等于整体像', {
    discipline, case: 'top',
    summary: '把「每点有欧氏邻域」误读为「整体是 ℝⁿ 或 ℝⁿ 的开子集」。',
    wrongRule: '若 M 每点都有邻域同胚于 ℝⁿ，则 M 同胚于 ℝⁿ 的开子集',
    task: '找出局部欧氏但整体不欧氏的紧例',
    counterexample: 'S² 与 ℝP² 都局部欧氏、紧、连通，但紧空间不可能同胚于 ℝⁿ 的开子集（ℝⁿ 非紧）',
    scope: '只否定「局部欧氏 ⇒ 整体欧氏」；不否定嵌入定理（每个第二可数流形都可嵌入某个 ℝ^N，那是另一条断言）。',
    anchors: ['top:topological-manifold', 'top:coordinate-chart'],
    formal: { boundary: ['个体是否持有该误解属于外部模型 E，本节点只登记公共描述。'] },
    motivation: {
      internal: ['局部与整体的差距是流形概念的难点：定义只给局部，结论却常被当成整体。'],
      external: ['把「局部线性化」当成「全局线性」是工程建模中的同类错误。'],
      aesthetic: ['紧性给出了最小的否定工具：整体欧氏就不紧。'],
      growthChain: ['局部欧氏 → 直觉上像平面 → 用紧性检查整体 → 得到反例'],
    },
    teaching: {
      selfCheck: [selfCheck('sc-top-pattern-local-1', '用紧性证明 S² 不同胚于 ℝ² 的任何开子集。', '反驳', 'top:pattern-local-euclidean', 'S² 紧；ℝ² 的开子集非紧（或为空集，不与 S² 同胚）。')],
      reviewQuestions: ['「局部欧氏」加上哪些条件才能推出整体欧氏？（提示：同时紧与连通时也没有。）'],
      evidenceStatus: 'ILLUSTRATION',
    },
    provenance,
  }),
  patternNode('top:pattern-a1-a2', '误区：第一可数就是第二可数', {
    discipline, case: 'top',
    summary: '把「每点有可数邻域基」与「整体有可数基」混为一谈。',
    wrongRule: 'A1 空间必是 A2 空间（等价地：可分的拓扑空间必 A2）',
    task: '检查一个 A1、可分但不 A2 的空间',
    counterexample: 'Sorgenfrey 直线：A1、可分、正规，但不 A2，也不可度量化',
    scope: '只否定 A1 ⇒ A2 与「可分 ⇒ A2」；不否定度量空间里「可分 ⇒ A2」这一条件化结论。',
    anchors: ['top:countability-axioms'],
    formal: { boundary: ['本节点只登记公共描述；个人是否混淆由外部模型记录。'] },
    motivation: {
      internal: ['两个公理的定义只差「每点」与「整体」一个量词，最容易被并成一条。'],
      external: ['把局部可数信息当成全局可数信息，在算法复杂度判断里是同一种错误。'],
      aesthetic: ['一个只改一半开集族的例子就把两条公理分开，是最经济的反例。'],
      growthChain: ['定义对比 → 发现量词不同 → 找反例 → Sorgenfrey 直线'],
    },
    teaching: {
      selfCheck: [selfCheck('sc-top-pattern-a1-1', '给出 Sorgenfrey 直线上的可数稠密子集，并说明它为何不足以产生可数基。', '辨析', 'top:pattern-a1-a2', '稠密子集只保证相交，不给出局部邻域基的成员。')],
      reviewQuestions: ['为什么度量空间里可分 ⇒ A2？证明用到的度量性质（球半径可数化）在 Sorgenfrey 直线为何失效？'],
      evidenceStatus: 'ILLUSTRATION',
    },
    provenance,
  }),
  patternNode('top:pattern-compact-closed', '误区：紧子集一定是闭集', {
    discipline, case: 'top',
    summary: '把需要 Hausdorff 的结论当作紧性的推论。',
    wrongRule: '紧空间的紧子集一定闭（不需要分离性假设）',
    task: '在紧 T1 而非 T2 的空间里找一个非闭的紧子集',
    counterexample: '余有限拓扑的 ℝ：紧、T1；任一子集紧，而任意无限子集的补集非开，故不闭',
    scope: '只否定「紧 ⇒ 紧子集闭」的无条件版本；不否定「紧 Hausdorff 空间中紧子集闭」。',
    anchors: ['top:compactness', 'top:separation-axioms'],
    formal: { boundary: ['该结论的条件缺失是常见跳步；本节点只登记公共描述。'] },
    motivation: {
      internal: ['「紧的闭子集」是分析里最常用的形式（紧致性判据、Heine–Borel），必须写清它是紧 + Hausdorff。'],
      external: ['把「有界闭」当作紧的一般判据是同类的条件缺失。'],
      aesthetic: ['余有限拓扑同时给出 T1 与紧，把缺失的分离性一次暴露。'],
      growthChain: ['Heine–Borel（ℝⁿ）→ 误推广 → 检查分离性 → 余有限反例'],
    },
    teaching: {
      selfCheck: [selfCheck('sc-top-pattern-compact-1', '证明紧 Hausdorff 空间中紧子集闭，并指出哪一步用到 T2。', '证明与定位', 'top:pattern-compact-closed', '对紧子集外的点用 T2 找不交邻域，取有限交得补集开。')],
      reviewQuestions: ['把 T2 换成 T1，这个证明的哪一步失效？'],
      evidenceStatus: 'ILLUSTRATION',
    },
    provenance,
  }),
  patternNode('top:pattern-sigma-compact', '误区：σ-紧就是紧', {
    discipline, case: 'top',
    summary: '把「可数多个紧子集之并」当作「整体紧」。',
    wrongRule: 'σ-紧空间是紧空间（尤其：σ-紧 + 局部紧 ⇒ 紧）',
    task: '找一个 σ-紧、局部紧、Hausdorff 但非紧的空间',
    counterexample: 'ℕ 的离散拓扑：σ-紧（单点集之并）、局部紧、Hausdorff（度量），但不紧',
    scope: '只否定 σ-紧 ⇒ 紧；不否定在附加仿紧或 A2 条件下若干等价刻画（那些要另行陈述条件）。',
    anchors: ['top:sigma-compact', 'top:compactness'],
    formal: { boundary: ['常见误推；只登记公共描述。'] },
    motivation: {
      internal: ['σ 只是一个可数并的记号，但「可数层」与「有限层」在证明中完全不同。'],
      external: ['把可数层近似当作有限近似，会导致算法终止性判断出错。'],
      aesthetic: ['ℕ 的离散拓扑是最小的见证：每条性质都能一行核验。'],
      growthChain: ['紧 ⇒ σ-紧 → 反问反向 → 取 ℕ 离散拓扑 → 分离出 σ 的作用'],
    },
    teaching: {
      selfCheck: [selfCheck('sc-top-pattern-sigma-1', '核验 ℕ 的离散拓扑满足 σ-紧、局部紧、Hausdorff，并说明它为何不紧。', '核验', 'top:pattern-sigma-compact', '单点集紧且可数多个覆盖 ℕ；覆盖 {{n}} 无有限子覆盖。')],
      reviewQuestions: ['什么条件下 σ-紧 + 局部紧能推出紧？（提示：加连通性也要小心，不可数离散空间不连通、长直线连通但非 σ-紧。）'],
      evidenceStatus: 'ILLUSTRATION',
    },
    provenance,
  }),
];

/* ------------------------------------------------------------------ *
 * 五、方法（每案例至少两个）
 * ------------------------------------------------------------------ */

export const topMethodNodes = [
  method('top:method-cover-check', '用覆盖论证判定紧、仿紧与连通', {
    discipline, case: 'top', scope: '局部方法',
    summary: '对给定空间与给定性质，先写出覆盖的形式，再判断能否抽出有限子覆盖或局部有限加细。',
    In: '一个具体空间与一条覆盖性质（紧 / 仿紧 / Lindelöf）', Out: '满足结论的论证，或一处具体的失败见证',
    Pre: '空间的开集族已能显式描述', Post: '结论及其适用范围，或指出在哪个覆盖上失败',
    Use: ['top:compactness', 'top:paracompactness'],
    Demo: ['top:ce-sorgenfrey', 'top:ce-long-line'],
    Fail: '写不出开集的显式描述时本方法不适用；抽不出有限子覆盖不等于空间不紧（可能只是没选对覆盖），必须给出**具体的反例覆盖**才能否定紧性。',
    body: '写出空间的基或不含该点的开集族；对任意覆盖尝试用紧性/局部有限性抽子族；失败时把那个覆盖写成显式见证，并核验它确实覆盖。',
    formal: { applicableTo: ['top:compactness', 'top:paracompactness'], boundary: ['方法只处理能显式写出开集的空间；抽象存在性论证不在范围内。'] },
    motivation: {
      internal: ['紧性与仿紧性的定义都是「对任意覆盖存在某个子族」，判定时必须抓住一个具体覆盖。'],
      external: ['数值网格的有限覆盖检查、有限元细分的局部性验证都是这个流程的实例。'],
      aesthetic: ['把「任意—存在」的量词结构换成一份可核对的清单。'],
      growthChain: ['定义 → 「对任意覆盖」→ 只能逐覆盖检查 → 失败时给具体见证'],
    },
    teaching: {
      selfCheck: [selfCheck('sc-top-method-cover-1', '对 ℝ 给出一个没有有限子覆盖的开覆盖，并说明为何它证明 ℝ 不紧。', '构造', 'top:method-cover-check', '{(−n,n)} 覆盖 ℝ；任一有限子族只覆盖 (−N,N)。')],
      reviewQuestions: ['要否定仿紧性，需要给出什么形式的见证？（提示：不能只给一个覆盖。）'],
      evidenceStatus: 'ILLUSTRATION',
    },
    provenance,
  }),
  method('top:method-local-to-global', '局部性质粘成整体（配合局部有限与单位分解）', {
    discipline, case: 'top', scope: '全局方法',
    summary: '把整体问题拆成局部可解的片，再用局部有限加细与单位分解把局部解粘起来。',
    In: '一个在每张坐标卡上都能解的局部问题', Out: '整体解，或指出哪一步缺少局部有限性',
    Pre: '底层空间是仿紧 Hausdorff（或紧 Hausdorff）', Post: '整体解，以及所用局部有限族与单位分解的记录',
    Use: ['top:paracompactness', 'top:atlas'],
    Demo: ['top:example-sphere-charts', 'top:ce-long-line'],
    Fail: '空间非仿紧时粘合步骤会失败（长直线就是见证）；此外本方法只给出存在性，不给显式构造。',
    body: '取覆盖并加细成局部有限的族；在每片局部求解；用从属于该族的单位分解把局部解加权求和；核验局部有限性使求和逐点有限。',
    formal: { applicableTo: ['top:paracompactness'], boundary: ['方法不构造单位分解本身；存在性依赖仿紧 + Hausdorff。'] },
    motivation: {
      internal: ['流形上几乎每个整体构造（度量、联络、积分）都是这个流程；它与「局部欧氏」是同一件事的两面。'],
      external: ['把局部模型拼成全局模型是有限元、样条与图形学的基本手法。'],
      aesthetic: ['「局部有限」一个词就保证了逐点求和是有限的——分析里最省事的一次性条件。'],
      growthChain: ['局部解 → 想相加 → 逐点无限求和发散 → 要求局部有限 → 仿紧性提供它'],
    },
    teaching: {
      selfCheck: [selfCheck('sc-top-method-local-1', '说明为什么局部有限性能保证单位分解的和逐点有意义。', '论证', 'top:method-local-to-global', '每点有邻域只与有限多个支集相交，故和是该邻域上的有限和。')],
      reviewQuestions: ['长直线在哪一步使这个方法失效？如果把单位分解换成「几乎处处成立」的弱化版本，还能用吗？'],
      evidenceStatus: 'ILLUSTRATION',
    },
    provenance,
  }),
];

/* ------------------------------------------------------------------ *
 * 六、理论节点：T1 在余有限拓扑下等价于「补集有限」
 * ------------------------------------------------------------------ */

export const topTheoryNodes = [
  theoryNode('top:sep-t1-theory', '余有限拓扑上 T1 的刻画', {
    discipline, case: 'top',
    summary: 'ℝ 上的余有限拓扑里，单点集是有限的，故其补集开：T1 成立而 T2 不成立。',
    formal: {
      language: '拓扑空间 + 开集族的有限补集刻画',
      calculus: '经典一阶逻辑片段（本站不形式化选择原则）',
      axioms: [
        { id: 'ax-cof-open', statement: 'U 是开集 ⟺ U = ∅ 或 ℝ∖U 有限', kind: '定义' },
        { id: 'ax-cof-t1', statement: '每个单点集闭（单点的补集开）', kind: '推论' },
        { id: 'ax-cof-not-t2', statement: '任两个非空开集相交', kind: '推论' },
      ],
      symbols: ['τ_cof', 'ℝ∖U'],
      boundary: ['本节点只核验 T1 与非 T2 两条；紧性与非仿紧性由 top:ce-cofinite 登记，两者不互相替代。'],
    },
    motivation: {
      internal: ['分离公理的谱系需要一个只满足最低档的具体模型；余有限拓扑是最标准的一个。'],
      external: ['在允许「几乎所有点都相同」的粗粒度模型里，这类拓扑自然出现。'],
      aesthetic: ['它同时说明紧性、T1 与正规性三者互相独立。'],
      growthChain: ['想造一个 T1 非 T2 的空间 → 让开集都很大（补集有限）→ 单点集闭 → 得模型'],
    },
    teaching: {
      conditions: [condition('补集有限（不是可数）', '换成可数补集', '余可数拓扑：T1 仍成立，但不紧', '本节点的刻画依赖「有限」；换成可数会改变与之配套的紧性结论。')],
      reviewQuestions: ['这个理论里 T1 的证明用到哪一条公理？把「有限」换成「可数」后哪一条不再成立？'],
      evidenceStatus: 'DEF',
    },
    provenance,
  }),
];

export const topNodes = [
  ...topConceptNodes,
  ...topClaimNodes,
  ...topCounterexampleNodes,
  ...topExampleNodes,
  ...topPatternNodes,
  ...topMethodNodes,
  ...topTheoryNodes,
];

/* ------------------------------------------------------------------ *
 * 七、行动契约
 *
 * 每条契约的输出就是「这个节点怎么被引入」。规划器只认行动契约，
 * 因此**每个节点都要有产出它的行动**，否则它在本体里落进 `isolated`（缺陷类）；
 * 这一点由 `data/relation-coverage.mjs` 与 `tests/topology-case.mjs` 一起核对。
 * ------------------------------------------------------------------ */

/** `bg:` 节点声明的是环境边界，输入按「statement + definition」口径给出（与 dg 案例同一写法）。 */
const acceptsOf = (nodeId) => (nodeId.startsWith('bg:') ? ['statement', 'definition'] : ['definition', 'statement']);

const SPECIFIED = { type: 'declared-contract', status: 'DEF', scope: '契约声明的输入输出按节点定义与正文的一致性登记；不声称这些输入是逻辑上的充要条件。' };

const contractSpecs = [
  // 基础层
  ['a-top:space', 'definition', '引入拓扑空间', ['bg:set:function', 'bg:real:metric'], ['top:space']],
  ['a-top:map', 'definition', '引入连续映射与同胚', ['top:space'], ['top:continuous-map', 'top:homeomorphism']],
  // 可数与分离
  ['a-top:count', 'definition', '引入可数公理', ['top:space', 'bg:set:function'], ['top:countability-axioms']],
  ['a-top:separation', 'definition', '引入分离公理', ['top:space'], ['top:separation-axioms']],
  ['a-top:sep-theory', 'definition', '给出余有限拓扑上 T1 的刻画', ['top:separation-axioms', 'bg:set:function'], ['top:sep-t1-theory']],
  // 紧性族
  ['a-top:compact', 'definition', '引入紧致性', ['top:space', 'bg:logic:quantifier'], ['top:compactness']],
  ['a-top:paracompact', 'definition', '引入仿紧性', ['top:space', 'top:compactness'], ['top:paracompactness']],
  ['a-top:sigma', 'definition', '引入 σ-紧性', ['top:space', 'top:compactness'], ['top:sigma-compact']],
  // 连通
  ['a-top:connected', 'definition', '引入连通性', ['top:space'], ['top:connectedness']],
  // 流形与图册
  ['a-top:chart', 'definition', '引入坐标卡', ['top:space', 'top:homeomorphism', 'bg:real:metric'], ['top:coordinate-chart']],
  ['a-top:atlas', 'definition', '引入图册', ['top:coordinate-chart', 'bg:set:function'], ['top:atlas']],
  ['a-top:manifold', 'definition', '引入拓扑流形', ['top:space', 'top:homeomorphism', 'top:coordinate-chart', 'top:separation-axioms', 'top:countability-axioms'], ['top:topological-manifold']],
  ['a-top:diffmanifold', 'definition', '引入微分流形', ['top:topological-manifold', 'top:atlas', 'bg:manifold:calc'], ['top:differentiable-manifold']],
  // 断言
  ['a-top:claim-compact-normal', 'deduction', '证明紧 Hausdorff 空间正规', ['top:compactness', 'top:separation-axioms'], ['top:claim-compact-normal']],
  ['a-top:claim-compact-paracompact', 'deduction', '证明紧 Hausdorff 空间仿紧', ['top:compactness', 'top:paracompactness'], ['top:claim-compact-paracompact']],
  ['a-top:claim-metric-paracompact', 'deduction', '陈述度量空间仿紧与正规', ['dg:metric-space', 'top:paracompactness'], ['top:claim-metric-paracompact']],
  ['a-top:claim-a2-a1', 'deduction', '证明第二可数蕴含第一可数', ['top:countability-axioms'], ['top:claim-a2-a1']],
  ['a-top:claim-a2-separable', 'deduction', '陈述第二可数蕴含可分', ['top:countability-axioms', 'bg:set:function'], ['top:claim-a2-separable']],
  ['a-top:claim-sigma', 'construction', '构造 σ-紧非紧的见证', ['top:sigma-compact', 'top:compactness'], ['top:claim-sigma-local-not-compact']],
  ['a-top:claim-connected', 'deduction', '证明连通空间的连续像连通', ['top:connectedness', 'top:continuous-map'], ['top:claim-connected-intermediate']],
  // 反例
  ['a-top:ce-sorgenfrey', 'construction', '构造 Sorgenfrey 直线', ['top:countability-axioms', 'bg:real:metric'], ['top:ce-sorgenfrey']],
  ['a-top:ce-cofinite', 'construction', '构造余有限拓扑空间', ['top:compactness', 'top:separation-axioms'], ['top:ce-cofinite']],
  ['a-top:claim-cofinite', 'deduction', '陈述有限补拓扑空间的 T1 与非 T2', ['top:ce-cofinite', 'top:separation-axioms'], ['top:claim-cofinite-t1-not-t2']],
  ['a-top:seq-compact', 'definition', '引入序列紧性', ['top:compactness', 'bg:real:metric'], ['top:sequentially-compact']],
  ['a-top:locally-compact', 'definition', '引入局部紧性', ['top:compactness', 'top:separation-axioms'], ['top:locally-compact']],
  ['a-top:ce-longline', 'construction', '构造长直线', ['top:countability-axioms', 'top:topological-manifold', 'top:paracompactness'], ['top:ce-long-line']],
  ['a-top:ce-discrete', 'construction', '构造不可数离散空间', ['top:paracompactness', 'bg:set:function'], ['top:ce-uncountable-discrete']],
  // 例子
  ['a-top:example-sphere', 'construction', '给出球面的两张坐标卡', ['top:atlas', 'top:coordinate-chart', 'bg:real:metric'], ['top:example-sphere-charts']],
  ['a-top:example-rp1', 'construction', '给出射影直线的两张仿射卡', ['top:atlas', 'top:coordinate-chart'], ['top:example-projective-line']],
  // 误区模式
  ['a-top:pattern-local', 'task', '登记「局部欧氏即整体欧氏」误区', ['top:topological-manifold'], ['top:pattern-local-euclidean']],
  ['a-top:pattern-a1', 'task', '登记「A1 即 A2」误区', ['top:countability-axioms', 'top:ce-sorgenfrey'], ['top:pattern-a1-a2']],
  ['a-top:pattern-closed', 'task', '登记「紧子集必闭」误区', ['top:compactness', 'top:separation-axioms', 'top:ce-cofinite'], ['top:pattern-compact-closed']],
  ['a-top:pattern-sigma', 'task', '登记「σ-紧即紧」误区', ['top:sigma-compact', 'top:claim-sigma-local-not-compact'], ['top:pattern-sigma-compact']],
  // 方法
  ['a-top:method-cover', 'method', '提出覆盖论证判定法', ['top:compactness', 'top:paracompactness', 'top:paracompactness'], ['top:method-cover-check']],
  ['a-top:method-local-global', 'method', '提出局部粘合方法', ['top:paracompactness', 'top:atlas'], ['top:method-local-to-global']],
];

/**
 * 一个辅助节点：`top:metric-space`。
 *
 * 为什么它必须存在：本站「度量空间」的登记全在**别的案例**里（`dg:metric-space`、
 * `rudin:metric-space`），而 `tests/hard-prereq.mjs` 禁止跨案例写硬前置。
 * 因此本案例需要自己的度量空间节点，才能说「度量空间仿紧」这条断言与
 * 「紧 + T2 ⇒ 仿紧」并列登记。它是本案例的辅助前置，不在用户点名的 12 项之内，
 * 与 12 项的区别由 `tests/topology-case.mjs` 显式核对。
 */
export const topAuxNodes = [
  concept('top:metric-space', '度量空间（本案例的辅助前置）', {
    discipline, case: 'top',
    summary: '带距离 d 的集合：本案例只用它来陈述「度量空间仿紧、正规」与给出反例。',
    objectType: '度量空间', parameters: ['X', 'd'], predicate: 'MetricSpace(X,d)', type: 'o',
    formal: {
      symbols: ['d'],
      typeEnv: { X: 'Set', d: 'X -> X -> R' },
      assumptions: ['d 满足正定、对称与三角不等式'],
      boundary: [
        '本节点是**辅助前置**：用户点名的 12 项里没有「度量空间」；本站的度量空间完整登记在 dg 与 rudin 两个案例（dg:metric-space、rudin:metric-space），这里只登记本案例自足所需的最小负载，不覆盖那两处。',
        '本案例只用两条性质：度量拓扑是正规且仿紧的。',
      ],
    },
    representations: [
      representation('rep-top-metric', 'definition', '度量公理', '公式', 'DEF', 'd(x,y) ≥ 0，d(x,y)=0 ⟺ x=y，对称，三角不等式。'),
    ],
    motivation: {
      internal: ['仿紧性最常用的充分条件就是「拓扑由度量诱导」；要陈述这一点，本案例需要一个自己的度量空间节点。'],
      external: ['一切用距离建模的空间（信号、图像、概率分布）都落在它里面。'],
      aesthetic: ['度量同时给出 A1、正规与仿紧三条结论，是「结构越丰富、结论越自动」的范例。'],
      growthChain: ['ℝ 上的距离 → 一般集合上的距离 → 度量拓扑 → 正规与仿紧'],
    },
    teaching: {
      conditions: [
        condition('拓扑由 d 诱导', '去掉度量只留 T2', '长直线是 T2 但不可度量化', '「度量 ⇒ 仿紧」的前提是度量存在；不可度量化的 T2 空间可以非仿紧。'),
        condition('三角不等式', '只要求正定与对称', '不满足三角不等式的「距离」不能保证开球构成拓扑基', '开球族成为基（可数化论证、局部有限加细的构造）依赖三角不等式。'),
      ],
      commonMisconceptions: ['以为度量空间一定可分或一定第二可数：不可数离散空间是度量空间，两者都不满足。'],
      reviewQuestions: ['为什么度量空间一定正规？指出证明里用到的连续分离函数。'],
      evidenceStatus: 'DEF',
    },
    provenance,
  }),
];

export const topActions = [
  ...[...contractSpecs, ['a-top:aux-metric', 'definition', '引入度量空间（本案例辅助前置）', ['bg:set:function', 'bg:real:metric'], ['top:metric-space']]]
    .map(([id, mode, title, inputs, outputs]) => action(
      id, mode, title,
      inputs.map((nodeId) => input(nodeId, acceptsOf(nodeId))),
      outputs.map((nodeId) => output(nodeId, mode === 'method' ? ['method'] : (mode === 'task' ? ['statement'] : ['definition', 'statement']))),
      { witness: SPECIFIED },
    )),
];

/* ------------------------------------------------------------------ *
 * 八、关系
 * ------------------------------------------------------------------ */

export const topRelations = [
  /* ==================================================================
   * 点集拓扑案例的关系（2026-10 逐条重审后的版本）
   *
   * 判定口径（每条边都必须能回答这三问，答不上就不登记）：
   *
   * 1. **方向**：「谁是谁的前置 / 谁推出谁」。定义材料一律 A → B（A 是 B 的定义里出现的对象）；
   *    蕴含一律 一般 → 特殊（`compactness → sigma-compact`）。
   * 2. **种类**：只在八类里选，且不与别的边重复——
   *    - `hardPrereq`：不用它，目标节点的**定义或陈述**写不出来（见证 = `definitional-dependency` + `DEF`，
   *      `witness.scope` 必须指到定义里的具体那一处）；断言类目标可另用 `proof-dependency`（带 `ref`）。
   *    - `scaling`：同一载体上的真蕴含（A ⇒ B），且**不能**写成定义依赖。
   *    - 放与缩是 `scaling` 的两种读法；本节旧记录的端点含义待核验，保留原见证且不进入方向锥。
   *    - `application`：B 是 A 的一个实例、反例或用法（例子/反例/方法/误区都用这一类）。
   *    - `crossDomain`：两端分别属于不同案例族的登记（本案例只有度量空间这一处）。
   *    - `bridge`：把本案例的抽象结论与**别的案例**里的具体版本对照起来。
   *    - `analogy` / `duality`：本案例**没有**登记——「开集 ↔ 闭集」那条对偶还停在正文里，
   *      要登记必须先写清范畴（偏序集的反同构）；宁可少登记两类，也不编一条方向说不清的边。
   * 3. **不重复**：同一对节点只留**一条**，且这条的 `scope` 必须把被合并的那条的信息也写进去。
   *    判据是「信息量最大」：定义材料 > 真蕴含 > 应用；两者依据真正不同的（陈述材料 对 传播定理）
   *    才允许并行，并在 `scope` 里点明「为什么不并」。
   *
   * 结果：37 个节点的主干是一条有向无环的定义链
   * 　拓扑空间 → 连续映射 → 同胚 → 坐标卡 → 图册 → 拓扑流形 →（加载 C^r 图册）微分流形
   * 　拓扑空间 → 紧性 → {序列紧 ⇔（度量）紧、局部紧 ⇐ 紧、σ-紧 ⇐ 紧、仿紧 ⇐ 紧 + T2}
   * 　拓扑空间 → 连通性 →（加连续映射）中值定理
   * 　可数公理 / 分离公理 是多条定义链的**共同材料**（入度最高的两个节点）
   * ================================================================== */

  /* ---- 一、基础层：定义材料来自哪里 ---- */

  relation('rel-top-pre-set-space', 'hardPrereq', 'bg:set:function', 'top:space', {
    witness: { type: 'definitional-dependency', status: 'DEF', scope: '定义的主语是「集合 X 与它的子集族 τ」；「子集族」「任意并」「有限交」三个词都来自集合与函数的语言。' },
    scope: '开集族是 P(X) 的子集，交与并都是集合运算；没有集合语言，「有限交封闭」这句话写不出来。',
  }),

  relation('rel-top-pre-real-space', 'hardPrereq', 'bg:real:metric', 'top:space', {
    witness: { type: 'definitional-dependency', status: 'DEF', scope: '定义之后的第一个例子就是「ℝ 上的通常拓扑（开区间族）」——不给它，「有限交封闭不可换成任意交」这条反例与下面所有反例都没有底集合。' },
    scope: '本案例的全部反例（Sorgenfrey 直线、有限补拓扑、不可数离散空间、长直线）都以 ℝ 或 ℕ 为底集合，距离与序结构来自这个背景节点。',
  }),

  relation('rel-top-pre-quantifier-compact', 'hardPrereq', 'bg:logic:quantifier', 'top:compactness', {
    witness: { type: 'definitional-dependency', status: 'DEF', scope: '定义是「∀ 开覆盖 𝒰 ∃ 有限 𝒰₀ ⊆ 𝒰: ⋃𝒰₀ = X」——全称后接存在的次序就是定义本身；仿紧性的定义同样靠这个次序（把「有限」换成「局部有限」）。' },
    scope: '把量词次序写错（∃ 有限子族 ∀ 覆盖）会得到恒真的伪条件；这正是「条件即反例」的第一处。',
  }),

  relation('rel-top-pre-space-map', 'hardPrereq', 'top:space', 'top:continuous-map', {
    witness: { type: 'definitional-dependency', status: 'DEF', scope: '定义写作「∀V ∈ τ_Y: f⁻¹(V) ∈ τ_X」——两侧的开集族 τ_X、τ_Y 都由拓扑空间给出。' },
    scope: '连续性是拓扑空间之间映射的性质；没有拓扑，「开集的原像」无从谈起。这一条是把「开集公理」变成「结构保持映射」的第一步。',
  }),

  relation('rel-top-pre-map-homeo', 'hardPrereq', 'top:continuous-map', 'top:homeomorphism', {
    witness: { type: 'definitional-dependency', status: 'DEF', scope: '同胚的定义是「f 是双射、f 与 f⁻¹ 都连续」——「连续」这两个字由 top:continuous-map 给出。' },
    scope: '把连续性从同胚的定义里去掉，(f, f⁻¹) 只剩两个互逆的双射，拓扑信息全部丢失。',
  }),

  /* ---- 二、三条性质族：材料都是拓扑空间 ---- */

  relation('rel-top-pre-space-count', 'hardPrereq', 'top:space', 'top:countability-axioms', {
    witness: { type: 'definitional-dependency', status: 'DEF', scope: 'A2 说「存在可数基」、A1 说「每点的邻域系有可数基」，另一条是「存在可数稠密子集」——基、邻域系、稠密集全是拓扑空间内部的对象。' },
    scope: '四条可数性条款全部作用在开集族上；换了拓扑，它们全部改变。',
  }),

  relation('rel-top-pre-space-sep', 'hardPrereq', 'top:space', 'top:separation-axioms', {
    witness: { type: 'definitional-dependency', status: 'DEF', scope: 'T2 的定义「存在不交开邻域」逐字使用开集与邻域；T0–T4 每一档都只说开集能分开什么。' },
    scope: '分离公理说的是开集族能把点（或闭集）分开到什么程度，主语就是拓扑。',
  }),

  relation('rel-top-pre-space-compact', 'hardPrereq', 'top:space', 'top:compactness', {
    witness: { type: 'definitional-dependency', status: 'DEF', scope: '定义里「𝒰 是 X 的开覆盖」中的「开」由拓扑给出，覆盖是拓扑概念。' },
    scope: '紧性只用「开集」与「覆盖」两个词；这也是它比序列紧更拓扑的原因。',
  }),

  relation('rel-top-pre-space-paracompact', 'hardPrereq', 'top:space', 'top:paracompactness', {
    witness: { type: 'definitional-dependency', status: 'DEF', scope: '定义里「开加细」「局部有限（每点有邻域只与有限多个成员相交）」两处都使用开集与邻域。' },
    scope: '仿紧性是对开覆盖的加细性质的陈述，主语是拓扑空间。',
  }),

  relation('rel-top-pre-space-sigma', 'hardPrereq', 'top:space', 'top:sigma-compact', {
    witness: { type: 'definitional-dependency', status: 'DEF', scope: '定义里 K_n 是 X 的子集且在**子空间拓扑**下紧——「X 的子集」与「子空间拓扑」两者都由拓扑空间给出。' },
    scope: 'σ-紧性的定义句子只用「子集」「子空间拓扑」「可数并」，**不出现**「紧」这个整体条件。紧的那一半是蕴含（见下面 scaling 一节），两条边方向相同、依据不同，都保留。',
  }),

  relation('rel-top-pre-space-connected', 'hardPrereq', 'top:space', 'top:connectedness', {
    witness: { type: 'definitional-dependency', status: 'DEF', scope: '连通性写作「不存在非空不交开集 U、V 使 X = U ∪ V」，开集来自拓扑；道路连通那条另用 [0, 1] 的连通性，也由同一个定义承担。' },
    scope: '连通性是「空间不能被切成两块」的拓扑化，主语是拓扑空间。',
  }),

  /* ---- 三、序列紧与局部紧：定义材料 + 蕴含，各自只留一条 ---- */

  /*
   * 「紧 vs 序列紧」：这里**只留蕴含**。
   *
   * 初稿同时登记了 `hardPrereq`（定义材料）与 `scaling`（度量空间里等价），
   * 两者在视图里叠成一条。按判据取信息量最大的：这两条性质的关系**就是**「度量空间里等价」，
   * 而「序列紧的定义要对照紧性」这件事只是叙述方式，写进 scope 即可。
   */
  relation('rel-top-compact-seq-generalization', 'scaling', 'top:compactness', 'top:sequentially-compact', { direction: null, scalingMode: 'unresolved',
    witness: { type: 'proof-dependency', status: 'REF', ref: 'ev-top-compact-seq', scope: '度量空间中紧 ⇔ 序列紧：两条方向都有标准论证（紧 + 度量 ⇒ 完备且全有界 ⇒ 序列紧；序列紧 + 度量 ⇒ 紧）。本条按教材标准结论登记为 REF。' },
    scope: '在度量空间里两条刻画重合；一般空间里不成立——[0, ω₁] 的序拓扑紧而不序列紧，因为序列只有可数多项。这条边同时承担「序列紧为什么要挂在紧性上」：它是紧性的序列侧对照条件。',
  }),

  relation('rel-top-compact-locally-compact-generalization', 'scaling', 'top:compactness', 'top:locally-compact', { direction: null, scalingMode: 'unresolved',
    witness: { type: 'same-carrier-implication', status: 'DEF', scope: '紧空间的每点有紧邻域（取整个空间，或取含该点的紧子空间）；这是定义的直接相加。' },
    scope: '紧 ⇒ 局部紧；反向不成立（ℝⁿ 局部紧而不紧）。与上一条的差别要看清：这一条**只依赖定义**，那一条依赖度量。局部紧的定义材料（「每点有**紧**邻域」里的「紧」）也由本条的起点给出。',
  }),

  /* ---- 四、放缩：旧蕴含记录保留原端点，方向含义待核验 ---- */

  relation('rel-top-compact-sigma-generalization', 'scaling', 'top:compactness', 'top:sigma-compact', { direction: null, scalingMode: 'unresolved',
    witness: { type: 'proof-dependency', status: 'PROOF', ref: 'ev-top-sigma-not-compact', scope: '紧空间取 K₁ = X 即是 σ-紧（单层可数并）；证据同时给出反方向的见证（ℕ 上的离散拓扑：σ-紧 + 局部紧而不紧）。' },
    scope: '紧 ⇒ σ-紧；反向不成立，见证是 ℕ 上的离散拓扑。这一条是**蕴含**，不是定义材料——σ-紧的定义句子不出现「紧」（那条定义依赖归 top:space → top:sigma-compact）。',
  }),

  relation('rel-top-compact-paracompact-generalization', 'scaling', 'top:compactness', 'top:paracompactness', { direction: null, scalingMode: 'unresolved',
    witness: { type: 'proof-dependency', status: 'PROOF', ref: 'ev-top-compact-paracompact', scope: '紧 Hausdorff 空间是仿紧空间：证明从有限子覆盖出发构造局部有限开加细。' },
    scope: '紧 Hausdorff ⇒ 仿紧；反向不成立（ℝⁿ 仿紧而不紧）。两条假设都不可省：只紧不 T2 时结论不成立（见有限补拓扑空间），只 T2 不紧时也不成立。',
  }),

  relation('rel-top-count-a2-a1-generalization', 'scaling', 'top:countability-axioms', 'top:claim-a2-a1', { direction: null, scalingMode: 'unresolved',
    witness: { type: 'proof-dependency', status: 'PROOF', ref: 'ev-top-a2-a1', scope: '断言「第二可数 ⇒ 第一可数」的陈述里出现 A2 与 A1 两个条款，都由可数公理节点定义；证明把可数基限制到一点得 𝔅_x。' },
    scope: 'A2 ⇒ A1；反向不成立（Sorgenfrey 直线 A1 而不可 A2）。这是四条可数性条款之间**唯一**无条件成立的蕴含。',
  }),

  relation('rel-top-count-a2-separable-generalization', 'scaling', 'top:countability-axioms', 'top:claim-a2-separable', { direction: null, scalingMode: 'unresolved',
    witness: { type: 'proof-dependency', status: 'REF', ref: 'ev-top-a2-separable', scope: '断言「第二可数 ⇒ 可分」的陈述里出现 A2 与「可分」两个条款；证明从可数基的每个非空成员取一点。本条按教材标准结论登记为 REF。' },
    scope: 'A2 ⇒ 可分；反向不成立（Sorgenfrey 直线可分而不可 A2），且反向的证明需要度量（可分度量空间 ⇔ A2）。本站不声称把可数选择编码成了机器证书。',
  }),

  relation('rel-top-compact-normal-generalization', 'scaling', 'top:compactness', 'top:claim-compact-normal', { direction: null, scalingMode: 'unresolved',
    witness: { type: 'proof-dependency', status: 'PROOF', ref: 'ev-top-compact-normal', scope: '断言是「紧 + T2 ⇒ T4」：证明的第一步对每个 x ∈ A 用 T2 找与 B 分离的开邻域，第二步用紧性抽有限子覆盖。' },
    scope: '紧性的第一条分离性后果。注意「正规 ⇒ T4」这一步还要 T2；只紧不 T2 时连正规都不成立（有限补拓扑空间），证据 ev-top-cofinite-t1-not-t2 给出这一侧的见证。',
  }),

  relation('rel-top-compact-paracompact-claim-generalization', 'scaling', 'top:compactness', 'top:claim-compact-paracompact', { direction: null, scalingMode: 'unresolved',
    witness: { type: 'proof-dependency', status: 'PROOF', ref: 'ev-top-compact-paracompact', scope: '断言是「紧 + T2 ⇒ 仿紧」：证明从有限子覆盖构造局部有限的开加细。' },
    scope: '与上一条并列：紧性在**覆盖加细**上的后果（上一条在**分离性**上）。两条断言的假设相同、结论不同，都不可由对方代替。',
  }),

  /* ---- 五、流形链：坐标卡 → 图册 → 流形 →（加载 C^r 图册）微分流形 ---- */

  relation('rel-top-pre-space-chart', 'hardPrereq', 'top:space', 'top:coordinate-chart', {
    witness: { type: 'definitional-dependency', status: 'DEF', scope: '坐标卡的定义里，U 是 M 的**开集**，φ(U) 是 ℝⁿ 的开子集；两个开性条件都写在定义句里。' },
    scope: '两个开性条件都以拓扑为前提；这也是「必须要求 φ(U) 开」这条反例的落点。',
  }),

  relation('rel-top-pre-homeo-chart', 'hardPrereq', 'top:homeomorphism', 'top:coordinate-chart', {
    witness: { type: 'definitional-dependency', status: 'DEF', scope: '定义要求 φ 是从 U 到 φ(U) 的**同胚**。' },
    scope: '把同胚换成连续双射，坐标卡的局部结构就不再能与 ℝⁿ 等价。',
  }),

  relation('rel-top-pre-chart-atlas', 'hardPrereq', 'top:coordinate-chart', 'top:atlas', {
    witness: { type: 'definitional-dependency', status: 'DEF', scope: '图册的定义是「坐标卡的集合 𝒜」，并要求 ⋃U = M 与逐对过渡相容。' },
    scope: '图册的每个成员都是坐标卡；过渡映射的定义域 φ(U∩V) 也由坐标卡给出。',
  }),

  relation('rel-top-pre-space-atlas', 'hardPrereq', 'top:space', 'top:atlas', {
    witness: { type: 'definitional-dependency', status: 'DEF', scope: '「覆盖 M」里的 M 是拓扑空间，覆盖是拓扑概念。' },
    scope: '同一族坐标卡放在不同底空间上，覆盖与否完全不同。',
  }),

  relation('rel-top-pre-chart-manifold', 'hardPrereq', 'top:coordinate-chart', 'top:topological-manifold', {
    witness: { type: 'definitional-dependency', status: 'DEF', scope: '局部欧氏条款的精确内容就是「每点属于某张坐标卡的定义域」。' },
    scope: '坐标卡是流形定义的原子单位：局部欧氏 = 每点有坐标卡。',
  }),

  relation('rel-top-pre-sep-manifold', 'hardPrereq', 'top:separation-axioms', 'top:topological-manifold', {
    witness: { type: 'definitional-dependency', status: 'DEF', scope: '定义里的第二条公理是「M 是 Hausdorff 空间（T2）」——T2 由分离公理节点定义。' },
    scope: '分离公理是本案例内部自足地定义 Hausdorff 的地方；不依赖其它案例的登记。',
  }),

  relation('rel-top-pre-count-manifold', 'hardPrereq', 'top:countability-axioms', 'top:topological-manifold', {
    witness: { type: 'definitional-dependency', status: 'DEF', scope: '定义里的第三条公理是「M 第二可数（A2）」，A2 由可数公理节点定义。' },
    scope: '第二可数是流形公理的最后一条；长直线说明它不能省（见 rel-top-count-longline）。',
  }),

  /*
   * 「拓扑流形 → 微分流形」：**只留定义材料**这一条。
   *
   * 初稿另立了一条 `scaling` 说「同一载体上加一本 C^r 图册」——那其实是
   * **构造接口**（输入：拓扑流形 + 图册），不是同一载体上的性质蕴含，种类本身就选错了；
   * 而且两条边在视图里叠成一条。它的内容并进这里的 scope。
   */
  relation('rel-top-pre-manifold-diffmanifold', 'hardPrereq', 'top:topological-manifold', 'top:differentiable-manifold', {
    witness: { type: 'definitional-dependency', status: 'DEF', scope: '定义写作「拓扑流形 + 一个 C^r 图册」，拓扑流形是主语。' },
    scope: '去掉底层拓扑公理只留局部欧氏，C^r 结构的技术结论（单位分解、嵌入）全部失去基础。注意这条边**不能**读成「两者等价」或「同一载体上的蕴含」：微分流形是在拓扑流形上**加载**一本 C^r 图册（构造接口，输入是拓扑流形与图册），反向不成立——同一个拓扑流形上可以有不兼容的 C^r 结构。',
  }),

  relation('rel-top-pre-atlas-diffmanifold', 'hardPrereq', 'top:atlas', 'top:differentiable-manifold', {
    witness: { type: 'definitional-dependency', status: 'DEF', scope: '微分流形的定义把 C^r 条件加在**图册**的过渡映射上；没有图册就没有过渡映射。' },
    scope: '微分结构是图册上的等阶条件，不是底空间的性质。',
  }),

  /* ---- 六、度量空间：本案例唯一的跨案例登记 ---- */

  relation('rel-top-space-metric-generalization', 'hardPrereq', 'top:space', 'dg:metric-space', {
    witness: { type: 'definitional-dependency', status: 'DEF', scope: '「度量空间」这个登记以「度量诱导的拓扑」为一部分内容：开球是开集，而「开集」要按拓扑空间的定义检验。' },
    scope: '度量与拓扑是两套独立结构：度量空间**产生**拓扑，不是拓扑的特例。因此方向是拓扑空间 → 度量空间（前者的语言是后者定义的一部分），不是反过来。',
  }),

  relation('rel-top-pre-metric-paracompact', 'hardPrereq', 'dg:metric-space', 'top:claim-metric-paracompact', {
    witness: { type: 'definitional-dependency', status: 'DEF', scope: '断言的陈述「每个度量空间都仿紧且正规」以度量空间为主语。' },
    scope: '去掉度量空间这个载体，这条断言没有对象。本站的度量空间登记已被合并表收口到 `dg:metric-space`（它同时挂着 dg / rudin / top 三个案例），因此这条边两端共享登记案例 `top`，不违反「硬前置不跨互不相干的案例」。',
  }),

  relation('rel-top-space-metrization-crossdomain', 'crossDomain', 'top:countability-axioms', 'dg:metric-space', {
    witness: { type: 'cross-domain-interface', status: 'DEF' },
    scope: '两处登记的是同一批结论的不同层次：dg 与 rudin 案例用「度量 ⇒ 第一可数、正规」，本案例补上 A2 与 A1 的差别（A2 ⇒ A1，反之不成立）以及「可分度量 ⇔ A2」这条需要度量的等价。两处登记都保留，不互相覆盖。这是本案例唯一一条真正的跨案例边（上面两条的端点都共享 `top` 登记）。',
    task: '度量空间的可数性接口：把 A2 / A1 / 可分三条的蕴含关系交给另外两个案例引用。',
  }),

  /* ---- 七、连通性：材料、传播定理、与别的案例的分析版本 ---- */

  relation('rel-top-pre-connected-map', 'hardPrereq', 'top:connectedness', 'top:continuous-map', {
    witness: { type: 'definitional-dependency', status: 'DEF', scope: '连通性的传播定理（连续像连通）的**陈述**里有两个主语：连通空间与连续映射；后者的定义由 top:continuous-map 给出。' },
    scope: '这条边是「连通性的结论要靠连续性才能传出去」的定义材料。它不表示连续映射依赖连通性——那是反方向。',
  }),

  relation('rel-top-connected-application', 'application', 'top:connectedness', 'top:claim-connected-intermediate', {
    witness: { type: 'proof-dependency', status: 'REF', ref: 'ev-top-connected-intermediate', scope: '结论是「连通空间的连续像是连通的」，陈述里的「连通」由本节点定义；证明用「原像保持开集」与连通性的定义否定分离。本条按教材标准结论登记为 REF。' },
    task: '连通性在连续性上的应用：连续像的连通性与中值定理。证明本身另由行动契约 a-top:claim-connected 承载。',
  }),

  /*
   * 「中值定理的分析版」这条 `bridge` 边**不再登记**（2026-10）。
   *
   * 初版把它指向 `rudin:continuity-connectedness`；但合并表已经把那条登记收口进本节点的
   * `top:claim-connected-intermediate`——分析版与拓扑版成了**同一个规范节点**的两条登记，
   * 而不是两个节点。两端相同的边在装配时会被识别成自环并丢弃，所以这里如实删掉，
   * 把「分析版在哪儿」这件事写进本节点的 `scope`（rudin 那一条登记仍在节点上可见）。
   */

  /* ---- 八、两个分离性断言与它们的反例 ---- */

  relation('rel-top-sep-cofinite-application', 'application', 'top:separation-axioms', 'top:ce-cofinite', {
    witness: { type: 'application-description', status: 'DEF' },
    task: '用有限补拓扑说明 T1 与 T2 之间不能互相替换（它是 T1 而非 T2 的空间）。',
  }),

  relation('rel-top-compact-cofinite-application', 'application', 'top:compactness', 'top:claim-cofinite-t1-not-t2', {
    witness: { type: 'proof-dependency', status: 'PROOF', ref: 'ev-top-cofinite-t1-not-t2', scope: '断言的陈述里出现「紧」「T1」「非 T2」「非正规」四条；证明依赖紧性的开覆盖形式（任一非空开集的补有限）与分离性的 T2 缺失。' },
    task: '紧性的反例侧：有限补拓扑空间是紧的、T1 的，却不 T2、也不正规——它精确否定了「紧 + T1 ⇒ 正规」。',
  }),

  relation('rel-top-compact-normal-cofinite-application', 'application', 'top:claim-compact-normal', 'top:ce-cofinite', {
    witness: { type: 'application-description', status: 'DEF' },
    task: '「紧 Hausdorff ⇒ 正规」的反例边界：有限补拓扑空间紧而**不 Hausdorff**，正好落在这条定理的假设之外；用它可以检验读者是否分清「紧」与「紧 + T2」。',
  }),

  relation('rel-top-sep-theory-application', 'application', 'top:separation-axioms', 'top:sep-t1-theory', {
    witness: { type: 'application-description', status: 'DEF' },
    task: '用有限补拓扑把「T1 成立而 T2 不成立」这两条公理分开，作为分离公理谱系的最小事例。',
  }),

  /* ---- 九、可数性、仿紧、σ-紧的反例侧 ---- */

  relation('rel-top-count-sorgenfrey-application', 'application', 'top:countability-axioms', 'top:ce-sorgenfrey', {
    witness: { type: 'application-description', status: 'DEF' },
    task: '用 Sorgenfrey 直线逐条区分四条可数性条款：它满足 A1 与可分，不满足 A2，也不 Lindelöf。',
  }),

  relation('rel-top-paracompact-longline', 'application', 'top:paracompactness', 'top:ce-long-line', {
    witness: { type: 'application-description', status: 'REF' },
    task: '长直线是「局部欧氏 + Hausdorff 但不仿紧」的见证，因此它同时说明：仿紧性不是局部欧氏性的推论，单位分解的存在性依赖第二可数这类整体条件。',
  }),

  relation('rel-top-count-longline', 'hardPrereq', 'top:countability-axioms', 'top:ce-long-line', {
    witness: { type: 'definitional-dependency', status: 'DEF', scope: '长直线的**陈述**里出现「非 A2、非仿紧」——「A2」这个条款由可数公理节点定义。' },
    scope: '要写下「长直线不是第二可数的空间」这句话，先得有 A2 的定义。这是它被排除在流形之外那一条依据的锚点。',
  }),

  relation('rel-top-compact-discrete-application', 'application', 'top:paracompactness', 'top:ce-uncountable-discrete', {
    witness: { type: 'application-description', status: 'DEF' },
    task: '用不可数离散空间说明仿紧与度量都不蕴含第二可数（它同时是度量空间、仿紧空间，也是非 A2 空间）。',
  }),

  /* ---- 十、方法 ---- */

  relation('rel-top-compact-method-cover', 'application', 'top:compactness', 'top:method-cover-check', {
    witness: { type: 'application-description', status: 'DEF' },
    task: '覆盖论证判定法是紧性定义的判定化：写出开覆盖、尝试抽有限子覆盖（仿紧时抽局部有限加细），失败时给出具体见证。',
  }),

  relation('rel-top-paracompact-method-local-global', 'application', 'top:paracompactness', 'top:method-local-to-global', {
    witness: { type: 'application-description', status: 'DEF' },
    task: '仿紧性给出局部有限加细，使局部解可以粘成整体解（单位分解的存在性前提）；长直线正是这个方法失效的空间。',
  }),

  /* ---- 十一、两个图册实例 ---- */

  relation('rel-top-atlas-sphere-application', 'application', 'top:atlas', 'top:example-sphere-charts', {
    witness: { type: 'application-description', status: 'DEF' },
    task: '球面的两张球极投影卡是「覆盖 + 逐对过渡相容」的最小非平凡实例：两张卡的过渡映射是反演 x ↦ x/|x|²。',
  }),

  relation('rel-top-atlas-rp1-application', 'application', 'top:atlas', 'top:example-projective-line', {
    witness: { type: 'application-description', status: 'DEF' },
    task: '射影直线的两张仿射卡是另一个最小实例，并且它逼着人核验商拓扑下的 Hausdorff 性（卡好写、公理要另证）。',
  }),

  /* ---- 十二、四个误区模式：每个锚在它要辨析的那条边上 ---- */

  relation('rel-top-pattern-local-euclidean-anchor', 'application', 'top:topological-manifold', 'top:pattern-local-euclidean', {
    witness: { type: 'application-description', status: 'DEF' },
    task: '「局部像欧氏空间就等于整体像」这条错误规则的辨析素材：球面与射影空间都局部欧氏而整体不欧氏（紧性给出否定工具）。',
  }),

  relation('rel-top-pattern-a1-a2-anchor', 'application', 'top:countability-axioms', 'top:pattern-a1-a2', {
    witness: { type: 'application-description', status: 'DEF' },
    task: '「A1 就是 A2」这条错误规则的辨析素材：Sorgenfrey 直线 A1 且可分而不 A2。',
  }),

  relation('rel-top-pattern-compact-closed-anchor', 'application', 'top:compactness', 'top:pattern-compact-closed', {
    witness: { type: 'application-description', status: 'DEF' },
    task: '「紧子集一定是闭集」这条错误规则的辨析素材：有限补拓扑空间里紧子集可以不是闭集（缺 T2）。',
  }),

  relation('rel-top-pattern-sigma-compact-anchor', 'application', 'top:claim-sigma-local-not-compact', 'top:pattern-sigma-compact', {
    witness: { type: 'application-description', status: 'DEF' },
    task: '「σ-紧就是紧」这条错误规则的正面反例：该断言的见证空间 σ-紧、局部紧而不紧。',
  }),
];

/* ------------------------------------------------------------------ *
 * 九、证据
 *
 * 全部 `prose-proof` / `not_run`：本站给出正文级论证，不签发任何机器证书。
 * `obligations` 一律写明未编码为 ND 证书，另加该条自身的核对义务。
 * ------------------------------------------------------------------ */

const conceptEvidence = topConceptNodes.concat(topAuxNodes).map((node) => evidence(
  `ev-top-${node.id.replace(/^top:/, '')}`,
  'prose-proof',
  'DEF',
  'not_run',
  `${node.title}：定义与边界`,
  {
    scope: '本证据只声明「节点正文与定义登记一致」，不声明本站证明了任何关于该定义的定理。',
    /*
     * 序列紧与局部紧还要列出 `top:compactness`：它们各有一条 `scaling` 从紧性出发，
     * 而 `proof-dependency` 的判据是「证据必须同时列出关系的两端」。漏一处，装配自检当场报错
     * （2026-10 真的报过一次，就是在这里）。
     */
    nodes: ['top:sequentially-compact', 'top:locally-compact'].includes(node.id) ? [node.id, 'top:compactness'] : [node.id],
    obligations: ['机器编码为第 02 章 ND 证书', '逐条核对定义表述与所引教材的标准陈述是否等价'],
    reference: provenance.sources[0],
  },
));

const claimEvidence = [
  evidence('ev-top-compact-normal', 'prose-proof', 'PROOF', 'not_run', '紧 Hausdorff 空间正规的正文证明', {
    scope: '逐点分离 + 紧性抽有限子覆盖的两步论证。',
    nodes: ['top:claim-compact-normal', 'top:compactness', 'top:separation-axioms'],
    obligations: ['机器编码为第 02 章 ND 证书', '核对证明里 T2 与紧性各自用在哪一步'],
    reference: provenance.sources[0],
  }),
  evidence('ev-top-compact-paracompact', 'prose-proof', 'PROOF', 'not_run', '紧 Hausdorff 空间仿紧的正文证明', {
    scope: '从有限子覆盖构造局部有限开加细的论证；同时核对这句话里 Hausdorff 的那一份作用（余有限拓扑是紧 T1 非仿紧，是第 1 个反例）。',
    nodes: ['top:claim-compact-paracompact', 'top:compactness', 'top:paracompactness'],
    obligations: ['机器编码为第 02 章 ND 证书', '核对「有限 ⇒ 局部有限」这一步是否需要 Hausdorff'],
    reference: provenance.sources[0],
  }),
  evidence('ev-top-metric-paracompact', 'prose-proof', 'PROOF', 'not_run', '度量空间仿紧与正规的正文论证', {
    scope: '用度量的距离函数构造局部有限加细与连续分离函数。',
    nodes: ['top:claim-metric-paracompact', 'dg:metric-space'],
    obligations: ['机器编码为第 02 章 ND 证书', '核对 Stone 定理的适用范围表述（本站只按度量空间的情形登记）'],
    reference: 'Engelking《General Topology》修订版（陈述层级引用，未逐页核对）',
  }),
  evidence('ev-top-a2-a1', 'prose-proof', 'PROOF', 'not_run', 'A2 ⇒ A1 的正文证明', {
    scope: '把可数基限制到一点得可数邻域基；第二步用基的定义夹出中间成员。',
    nodes: ['top:claim-a2-a1', 'top:countability-axioms'],
    obligations: ['机器编码为第 02 章 ND 证书', '核对「基成员夹在 x 与 U 之间」这一步的依赖'],
    reference: provenance.sources[0],
  }),
  evidence('ev-top-a2-separable', 'prose-proof', 'REF', 'not_run', 'A2 ⇒ 可分的标准陈述', {
    scope: '按教材标准结论登记为引用；本站不给机器证书，也不声称把可数选择形式化了。',
    nodes: ['top:claim-a2-separable', 'top:countability-axioms'],
    obligations: ['机器编码为第 02 章 ND 证书', '若要用到可数选择，必须在正文里显式写明'],
    reference: provenance.sources[0],
  }),
  evidence('ev-top-sigma-not-compact', 'prose-proof', 'PROOF', 'not_run', 'σ-紧 + 局部紧不蕴含紧的正文见证', {
    scope: '见证空间为 ℕ 的离散拓扑：σ-紧、局部紧、Hausdorff、非紧，四条逐一核验；同时核验「紧 ⇒ σ-紧」的方向（紧空间取 K₁ = X 即是 σ-紧）。',
    nodes: ['top:claim-sigma-local-not-compact', 'top:sigma-compact', 'top:compactness'],
    obligations: ['机器编码为第 02 章 ND 证书', '核对见证空间是否真的满足 σ-紧（必须是可数并）'],
    reference: provenance.sources[0],
  }),
  evidence('ev-top-connected-intermediate', 'prose-proof', 'REF', 'not_run', '连通空间连续像连通（中值定理的拓扑版）', {
    scope: '按教材标准结论登记为引用；本站给出两行论证但不声称机器核验。',
    nodes: ['top:claim-connected-intermediate', 'top:connectedness', 'top:continuous-map'],
    obligations: ['机器编码为第 02 章 ND 证书', '核对与 rudin:continuity-connectedness 的表述差别是否写清'],
    reference: provenance.sources[2],
  }),
  evidence('ev-top-compact-seq', 'prose-proof', 'REF', 'not_run', '度量空间中紧性与序列紧性等价', {
    scope: '按教材标准结论登记为引用：紧 + 度量 ⇒ 完备且全有界 ⇒ 序列紧；序列紧 + 度量 ⇒ 紧。本站给出两条论证的轮廓但不声称机器核验，也不把它推广到一般拓扑空间（[0, ω₁] 是反例）。',
    nodes: ['top:sequentially-compact', 'top:compactness'],
    obligations: ['机器编码为第 02 章 ND 证书', '核对「完备且全有界 ⇒ 紧」这一步用到的度量性质是否写明'],
    reference: provenance.sources[0],
  }),
  /* 2026-10 加：有限补拓扑空间的 T1 / 非 T2 / 紧 / 非正规，四条的正文级核验。 */  evidence('ev-top-cofinite-t1-not-t2', 'prose-proof', 'PROOF', 'not_run', '有限补拓扑空间：T1、非 T2、紧、非正规', {
    scope: 'T1 由单点集的补集开得到；非 T2 由任意两个非空开集必相交得到；紧性由「任一非空开集的补有限」得到；非正规性由「两个不交闭集至少有一个有限」得到。',
    nodes: ['top:claim-cofinite-t1-not-t2', 'top:ce-cofinite', 'top:separation-axioms', 'top:compactness'],
    obligations: ['机器编码为第 02 章 ND 证书', '核对它**不能**充当「紧 + T2 ⇏ 正规」的见证（本条的空间不满足 T2）'],
    reference: provenance.sources[0],
  }),
];

const counterexampleEvidence = [
  evidence('ev-top-ce-sorgenfrey', 'counterexample', 'PROOF', 'not_run', 'Sorgenfrey 直线：A1 且可分但不 A2', {
    scope: '两类见证：ℚ 的稠密性；任一基都须含每点处的半开区间导致不可数。',
    nodes: ['top:ce-sorgenfrey', 'top:countability-axioms'],
    obligations: ['机器编码为第 02 章 ND 证书', '核对「不可度量化」这一条是否被误用（本反例不否定可分度量空间的情形）'],
    reference: provenance.sources[1],
  }),
  evidence('ev-top-ce-cofinite', 'counterexample', 'PROOF', 'not_run', '余有限拓扑：紧、T1、非 T2', {
    scope: '紧性由「任取非空开集其补有限」得到；T1 由单点集有限得到；非 T2 由任意两非空开集相交得到。',
    nodes: ['top:ce-cofinite', 'top:compactness', 'top:separation-axioms'],
    obligations: ['机器编码为第 02 章 ND 证书', '核对非正规性的见证（两个不交闭集必有一个有限）'],
    reference: provenance.sources[0],
  }),
  evidence('ev-top-ce-long-line', 'counterexample', 'REF', 'not_run', '长直线：局部欧氏 + Hausdorff + 连通，非 A2 非仿紧', {
    scope: '按教材标准结论登记；本站给出基与覆盖两处论证的轮廓，不声称机器核验序数运算。',
    nodes: ['top:ce-long-line', 'top:topological-manifold', 'top:paracompactness'],
    obligations: ['机器编码为第 02 章 ND 证书', '核对连通性与道路连通性的论证是否给出', '核对它被排除在流形之外的原因是第二可数而不是 Hausdorff'],
    reference: provenance.sources[1],
  }),
  evidence('ev-top-ce-discrete', 'counterexample', 'PROOF', 'not_run', '不可数离散空间：仿紧、度量、非 A2', {
    scope: '离散空间中覆盖自身即开加细且局部有限；基须含全部单点集故不可数。',
    nodes: ['top:ce-uncountable-discrete', 'top:paracompactness'],
    obligations: ['机器编码为第 02 章 ND 证书', '核对它**不能**充当 σ-紧见证（不可数离散空间非 σ-紧）'],
    reference: provenance.sources[0],
  }),
];

const exampleEvidence = [
  evidence('ev-top-example-sphere', 'prose-proof', 'PROOF', 'not_run', '球面两张球极投影卡的核验', {
    scope: '覆盖、同胚与过渡映射 x ↦ x/|x|² 的显式计算。',
    nodes: ['top:example-sphere-charts', 'top:atlas', 'top:coordinate-chart'],
    obligations: ['机器编码为第 02 章 ND 证书', '核对过渡映射的定义域限制到重叠域的像'],
    reference: provenance.sources[2],
  }),
  evidence('ev-top-example-rp1', 'prose-proof', 'PROOF', 'not_run', '射影直线两张仿射卡的核验', {
    scope: '覆盖、归一化给出的同胚与过渡映射 t ↦ 1/t。',
    nodes: ['top:example-projective-line', 'top:atlas'],
    obligations: ['机器编码为第 02 章 ND 证书', '核对商拓扑下的 Hausdorff 性与 A2 是否另证'],
    reference: provenance.sources[2],
  }),
];

const patternEvidence = topPatternNodes.map((node) => evidence(
  `ev-top-${node.id.replace(/^top:pattern-/, 'pattern-')}`,
  'prose-proof',
  'ILLUSTRATION',
  'not_run',
  `${node.title}：公共描述与反例`,
  {
    scope: '误区模式不是命题；本证据只声明「错误规则与反例的对应关系写在正文里且与锚点节点一致」。',
    nodes: [node.id],
    obligations: ['机器编码为第 02 章 ND 证书', '核对反例是否真的否定该错误规则的全称形式'],
    reference: provenance.sources[0],
  },
));

const methodEvidence = topMethodNodes.map((node) => evidence(
  `ev-top-${node.id.replace(/^top:/, '')}`,
  'prose-proof',
  'ILLUSTRATION',
  'not_run',
  `${node.title}：步骤与案例正文一致`,
  {
    scope: '方法本身是操作步骤，不是可证命题；本证据只声明步骤描述没有超出正文，且失效范围已写出。',
    nodes: [node.id],
    obligations: ['机器编码为第 02 章 ND 证书', '核对失效范围（非仿紧空间、抽不出有限子覆盖等）是否写清'],
    reference: provenance.sources[0],
  },
));

export const topEvidence = [
  ...conceptEvidence,
  ...claimEvidence,
  ...counterexampleEvidence,
  ...exampleEvidence,
  ...patternEvidence,
  ...methodEvidence,
  evidence('ev-top-not-claimed', 'not-claimed', 'NOT-CLAIMED', 'not_run', '本案例未声称的范围', {
    scope: '不声称：本案例的断言已机器核验；不声称选择原则被形式化；不声称覆盖了序数拓扑与仿紧性的全部定理（如 Stone 定理的一般形式）。',
    nodes: ['top:paracompactness', 'top:claim-a2-separable'],
  }),
];

/* ------------------------------------------------------------------ *
 * 十、支持族、断言登记、误区登记与聚合
 * ------------------------------------------------------------------ */

const EXPRESSION_SUPPORT = {
  'top:space': ['bg:set:function', 'bg:real:metric'],
  'top:continuous-map': ['top:space'],
  'top:homeomorphism': ['top:space', 'top:continuous-map', 'bg:set:function'],
  'top:countability-axioms': ['top:space', 'bg:set:function'],
  'top:separation-axioms': ['top:space'],
  'top:compactness': ['top:space', 'bg:logic:quantifier'],
  'top:paracompactness': ['top:space', 'top:compactness'],
  'top:sigma-compact': ['top:space', 'top:compactness'],
  'top:connectedness': ['top:space'],
  /*
   * 度量空间这一行用**规范 id**（合并表已把本案例的 `top:metric-space` 收口到 `dg:metric-space`），
   * 但它的证据 id 仍是本案例生成的那条 `ev-top-metric-space`——证据是按**登记项**生成的，
   * 不是按规范节点生成的。两者必须分开写，否则装配自检会报「引用了未知证据」。
   */
  'dg:metric-space': { set: ['bg:set:function', 'bg:real:metric'], evidence: 'ev-top-metric-space' },
  'top:coordinate-chart': ['top:space', 'top:homeomorphism', 'bg:real:metric'],
  'top:atlas': ['top:coordinate-chart', 'bg:set:function'],
  'top:topological-manifold': ['top:space', 'top:homeomorphism', 'top:coordinate-chart', 'top:separation-axioms', 'top:countability-axioms'],
  'top:differentiable-manifold': ['top:topological-manifold', 'top:atlas', 'bg:manifold:calc'],
};

export const topSupport = [
  ...Object.entries(EXPRESSION_SUPPORT).map(([node, entry]) => {
    // 两种写法：数组（支持集）或 `{ set, evidence }`（证据 id 与规范节点 id 不同名时用）。
    const set = Array.isArray(entry) ? entry : entry.set;
    const evidenceId = Array.isArray(entry) ? `ev-top-${node.replace(/^top:/, '')}` : entry.evidence;
    return support(
      `sup-top-${node.replace(/^top:/, '')}-expr`, node, 'expression', 'known',
      { set, minimal: false, evidence: [evidenceId] },
    );
  }),
  support('sup-top-compact-normal-proof', 'top:claim-compact-normal', 'proof', 'known', { set: ['top:compactness', 'top:separation-axioms'], minimal: false, evidence: ['ev-top-compact-normal'] }),
  support('sup-top-compact-paracompact-proof', 'top:claim-compact-paracompact', 'proof', 'known', { set: ['top:compactness', 'top:paracompactness'], minimal: false, evidence: ['ev-top-compact-paracompact'] }),
  support('sup-top-a2-a1-proof', 'top:claim-a2-a1', 'proof', 'known', { set: ['top:countability-axioms'], minimal: true, evidence: ['ev-top-a2-a1'] }),
  support('sup-top-sigma-claim-proof', 'top:claim-sigma-local-not-compact', 'proof', 'known', { set: ['top:sigma-compact', 'top:compactness'], minimal: false, evidence: ['ev-top-sigma-not-compact'] }),
  // 未登记路线级输入时保留 Unknown：未知不等于空支持。
  support('sup-top-a2sep-route', 'top:claim-a2-separable', 'route', 'unknown', { reason: '本条按教材标准结论登记为 REF，未登记可核的路线级输入支持。' }),
  support('sup-top-pattern-route', 'top:pattern-a1-a2', 'route', 'unknown', { reason: '误区模式是公共描述，不登记个人的路线输入支持。' }),
];

export const topClaims = [
  claimRecord('claim-top-compact-normal', 'top:claim-compact-normal', '紧 Hausdorff 空间是正规空间（T4）。', ['ev-top-compact-normal']),
  claimRecord('claim-top-compact-paracompact', 'top:claim-compact-paracompact', '紧 Hausdorff 空间是仿紧空间。', ['ev-top-compact-paracompact']),
  claimRecord('claim-top-metric-paracompact', 'top:claim-metric-paracompact', '每个度量空间都是仿紧的且是正规的。', ['ev-top-metric-paracompact']),
  claimRecord('claim-top-a2-a1', 'top:claim-a2-a1', '第二可数空间是第一可数的。', ['ev-top-a2-a1']),
  claimRecord('claim-top-a2-separable', 'top:claim-a2-separable', '第二可数空间是可分的。', ['ev-top-a2-separable'], 'REF'),
  claimRecord('claim-top-sigma-not-compact', 'top:claim-sigma-local-not-compact', '存在 σ-紧、局部紧、Hausdorff 而非紧的空间（ℕ 的离散拓扑）。', ['ev-top-sigma-not-compact']),
  claimRecord('claim-top-connected-intermediate', 'top:claim-connected-intermediate', '连通空间的连续像是连通的。', ['ev-top-connected-intermediate'], 'REF'),
];

export const topPatterns = topPatternNodes.map((node) => ({
  id: node.id,
  node: node.id,
  anchors: node.formal.anchors,
  title: node.title,
}));

export const topAggregates = [
  {
    id: 'agg-top-foundation', kind: 'topic', title: '点集拓扑：空间、可数与分离',
    blocks: [
      ['top:space', 'top:continuous-map', 'top:homeomorphism'],
      ['top:countability-axioms', 'top:separation-axioms', 'top:sep-t1-theory'],
      ['dg:metric-space'],
    ],
    note: '话题块按「先有空间、再问它能分辨多少信息」组织；块之间可重叠，不把成员关系读成必修链。',
  },
  {
    id: 'agg-top-compactness', kind: 'topic', title: '点集拓扑：紧性与连通性',
    blocks: [
      ['top:compactness', 'top:paracompactness', 'top:sigma-compact', 'top:connectedness'],
      ['top:claim-compact-normal', 'top:claim-compact-paracompact', 'top:claim-metric-paracompact', 'top:claim-a2-a1', 'top:claim-a2-separable', 'top:claim-sigma-local-not-compact', 'top:claim-connected-intermediate'],
    ],
    note: '紧性族的四个概念与七条断言分块：概念块回答「是什么」，断言块回答「能推出什么」。',
  },
  {
    id: 'agg-top-manifold', kind: 'topic', title: '点集拓扑：流形与图册',
    blocks: [
      ['top:coordinate-chart', 'top:atlas', 'top:topological-manifold', 'top:differentiable-manifold'],
      ['top:example-sphere-charts', 'top:example-projective-line'],
    ],
    note: '流形条目与两个具体图册例子分块；例子块说明定义不是空的。',
  },
  {
    id: 'agg-top-counterexample', kind: 'topic', title: '点集拓扑：反例与误区',
    blocks: [
      ['top:ce-sorgenfrey', 'top:ce-cofinite', 'top:ce-long-line', 'top:ce-uncountable-discrete'],
      ['top:pattern-local-euclidean', 'top:pattern-a1-a2', 'top:pattern-compact-closed', 'top:pattern-sigma-compact'],
    ],
    note: '反例块与误区块成对出现：每一条错误规则都能指向一个具体空间。',
  },
  {
    id: 'agg-top-method', kind: 'topic', title: '点集拓扑：方法',
    blocks: [['top:method-cover-check', 'top:method-local-to-global']],
    note: '方法单独成块：它们是「怎么算」，与概念块不是同一类成员。',
  },
];

export const top = {
  nodes: [...topNodes, ...topAuxNodes],
  actions: topActions,
  relations: topRelations,
  evidence: topEvidence,
  support: topSupport,
  claims: topClaims,
  patterns: topPatterns,
  aggregates: topAggregates,
};

/* ------------------------------------------------------------------ *
 * 十一、装配前的现场自检
 *
 * 这段只在本模块被 import 时运行，不写任何文件：它把「12 项 → 节点」的映射
 * 与几条最容易写错的结构条件先钉住，免得错误被带到 manifest 里才暴露。
 * 完整的断言在 `tests/topology-case.mjs`（那里的口径与本体校验器一致）。
 * ------------------------------------------------------------------ */

const REQUIRED_TWELVE = [
  'top:space', 'top:countability-axioms', 'top:separation-axioms', 'top:homeomorphism',
  'top:compactness', 'top:paracompactness', 'top:sigma-compact', 'top:connectedness',
  'top:topological-manifold', 'top:differentiable-manifold', 'top:coordinate-chart', 'top:atlas',
];

/** 本案例之外合法出现的端点：共享背景与四个跨案例接口（不在这里的端点一定是拼错）。 */
const EXTERNAL_ENDPOINTS = new Set([
  'bg:set:function', 'bg:real:metric', 'bg:logic:quantifier', 'bg:manifold:calc', 'bg:top:space',
  'dg:metric-space', 'dg:topological-manifold',
  'manifold:chart-atlas', 'manifold:top-manifold',
  'rudin:continuity-connectedness',
]);

{
  const ids = new Set(top.nodes.map((node) => node.id));
  const problems = [];
  const duplicate = (kind, list) => {
    if (new Set(list).size !== list.length) problems.push(`${kind} id 重复`);
  };
  duplicate('行动', top.actions.map((a) => a.id));
  duplicate('关系', top.relations.map((r) => r.id));
  duplicate('证据', top.evidence.map((e) => e.id));
  duplicate('支持', top.support.map((s) => s.id));
  duplicate('聚合', top.aggregates.map((a) => a.id));

  for (const action of top.actions) {
    for (const item of [...action.inputs, ...action.outputs]) {
      if (!ids.has(item.node) && !EXTERNAL_ENDPOINTS.has(item.node)) {
        problems.push(`行动 ${action.id} 引用了不存在的节点：${item.node}`);
      }
    }
  }
  for (const rel of top.relations) {
    for (const end of [rel.from, rel.to]) {
      if (!ids.has(end) && !EXTERNAL_ENDPOINTS.has(end)) problems.push(`关系 ${rel.id} 的端点无法解析：${end}`);
    }
    const witness = rel.witness ?? {};
    if (witness.type === 'definitional-dependency' && witness.status !== 'DEF') {
      problems.push(`关系 ${rel.id} 是定义性依赖，见证状态应为 DEF`);
    }
    if (witness.type === 'proof-dependency') {
      const record = top.evidence.find((item) => item.id === witness.ref);
      if (!record) problems.push(`关系 ${rel.id} 的证明依赖指向未知证据：${witness.ref}`);
      else {
        if (record.status !== witness.status) problems.push(`关系 ${rel.id} 的见证状态与证据 ${record.id} 不一致`);
        for (const end of [rel.from, rel.to]) {
          if (!(record.nodes ?? []).includes(end)) problems.push(`证据 ${record.id} 没有列出 ${rel.id} 的端点 ${end}`);
        }
      }
    }
  }
  for (const record of top.support) {
    if (!ids.has(record.node) && !EXTERNAL_ENDPOINTS.has(record.node)) problems.push(`支持记录 ${record.id} 引用了不存在的节点：${record.node}`);
    for (const ref of record.evidence ?? []) {
      if (!top.evidence.some((item) => item.id === ref)) problems.push(`支持记录 ${record.id} 引用了未知证据 ${ref}`);
    }
  }
  for (const claim of top.claims) {
    const node = top.nodes.find((item) => item.id === claim.node);
    if (!node) problems.push(`断言 ${claim.id} 引用未知节点 ${claim.node}`);
    else if (node.construct !== 'Claim') problems.push(`断言 ${claim.id} 的节点不是 Claim`);
    for (const ref of claim.evidence ?? []) {
      if (!top.evidence.some((item) => item.id === ref)) problems.push(`断言 ${claim.id} 引用未知证据 ${ref}`);
    }
  }

  const produced = new Set(top.actions.flatMap((a) => a.outputs.map((o) => o.node)));
  for (const node of top.nodes) {
    if (!produced.has(node.id)) problems.push(`节点 ${node.id} 没有产出它的行动契约`);
    if (!node.teaching?.evidenceStatus) problems.push(`节点 ${node.id} 没有证据等级`);
  }
  for (const id of REQUIRED_TWELVE) {
    if (!ids.has(id)) problems.push(`用户点名的 12 项缺少节点：${id}`);
  }
  if (REQUIRED_TWELVE.length !== 12) problems.push('12 项清单被改动');

  /* ------------------------------------------------------------------
   * 关系图的四条不变量（2026-10 加；这四条是本轮「逐条重审」沉淀下来的判据）
   *
   * 审计的时候是靠脚本一条条看出来的，那就必须让脚本一直看着：
   * 关系是可以随手加的，而「同一对节点叠两条」「硬关系成环」这类错误在视图上
   * 表现为**少了一条线**，肉眼几乎发现不了（本轮用户就是这么看出问题的）。
   * ------------------------------------------------------------------ */
  {
    // 1. 同一对节点只留一条（方向或依据真正不同的，必须在注释里写明，不靠这一条放行）。
    const pairs = new Map();
    for (const relation of top.relations) {
      const key = [relation.from, relation.to].sort().join('~');
      const list = pairs.get(key) ?? [];
      list.push(relation);
      pairs.set(key, list);
    }
    for (const [key, list] of pairs) {
      if (list.length > 1) {
        problems.push(`同一对节点登记了 ${list.length} 条关系（视图里会叠成一条）：${key} → ${list.map((item) => item.kind).join(', ')}`);
      }
    }

    // 2. 硬关系必须无环（定义链不成环）。
    const hard = top.relations.filter((relation) => relation.kind === 'hardPrereq' || relation.kind === 'scaling');
    const adjacency = new Map();
    for (const relation of hard) adjacency.set(relation.from, [...(adjacency.get(relation.from) ?? []), relation.to]);
    const color = new Map();
    const visit = (node, path) => {
      color.set(node, 1);
      for (const next of adjacency.get(node) ?? []) {
        if (color.get(next) === 1) problems.push(`硬关系成环：${path.concat(next).join(' → ')}`);
        else if (!color.get(next)) visit(next, path.concat(next));
      }
      color.set(node, 2);
    };
    for (const node of new Set([...adjacency.keys(), ...hard.map((relation) => relation.to)])) {
      if (!color.get(node)) visit(node, [node]);
    }

    // 3. 见证与端点一致：定义性依赖的两端必须是真节点；证明依赖必须指向列出两端的证据。
    for (const relation of top.relations) {
      const witness = relation.witness ?? {};
      if (witness.type === 'definitional-dependency') {
        for (const end of [relation.from, relation.to]) {
          if (!ids.has(end) && !EXTERNAL_ENDPOINTS.has(end)) problems.push(`关系 ${relation.id} 的定义性依赖端点不存在：${end}`);
        }
        /*
         * 「指到定义里的具体那一处」的可核对判据：见证里必须出现**被定义对象的原词**——
         * 中文源用 `「…」` 包住它，或者直接写 `定义` / `陈述` 两个字。
         * 只写一句「这条依赖是定义链条上的」不算数（本轮就是这样混进两条假依赖的）。
         */
        if (!/「[^」]+」|定义|陈述/.test(witness.scope ?? '')) {
          problems.push(`关系 ${relation.id} 的定义性依赖没有指到定义里的具体那一处（witness.scope 要写出被定义对象的原词）`);
        }
      }
    }

    // 4. 七类受控词表：本案例**刻意**没有 analogy / duality，若哪天加了，必须在这里显式放行。
    const allowedKinds = new Set(['hardPrereq', 'scaling', 'bridge', 'application', 'analogy', 'duality', 'crossDomain']);
    for (const relation of top.relations) {
      if (!allowedKinds.has(relation.kind)) problems.push(`关系 ${relation.id} 的种类不在七类之内：${relation.kind}`);
      if (relation.kind === 'analogy' || relation.kind === 'duality') {
        problems.push(`关系 ${relation.id} 用了 analogy / duality：本案例刻意不登记这两类，要加先在注释里写清范畴与方向`);
      }
    }
  }

  if (problems.length) throw new Error(`top 案例装配前自检失败：\n- ${problems.join('\n- ')}`);
}
