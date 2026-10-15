/**
 * 同一对象的多处登记：**合并表**与装配规则。
 *
 * ## 为什么要有这个模块
 *
 * 本站的本体是**按案例分头登记**的：同一个数学对象（拓扑空间、紧致性、度量空间、
 * 微分形式、Stokes 定理…）在不同案例里各写了一遍。这样做的历史原因是真的：
 * 每个案例要自足——`tests/hard-prereq.mjs` 禁止跨案例写硬前置，案例的正文块也
 * 只认自己那一份登记。代价同样真实：节点列表里出现三个「拓扑空间」、三个「紧致性」、
 * 两个「同胚」，网络视图里同一对象分成三个点，读者看到的是登记方式，不是数学。
 *
 * 用户的原话是「有很多重复名字或话题高度重合的节点，合并它们」。这个模块就是那件事的
 * 实现：**在装配期把同一对象的多处登记收成一个规范节点**，其余登记逐字保留，挂在
 * `node.registrations` 上（连自己的正文块、正式负载、教学字段、来源一起保留）。
 *
 * ## 三条不变量（改这里之前先读）
 *
 * 1. **只合并同一对象、同一粒度**。同一对象的两种**不同构造**（切向量的曲线定义与导子定义）、
 *    不同层（背景接口 `bg:*` 与单元级定义）、不同角色（概念版与断言版是同一个结论时，
 *    才按断言收口）都不在这里合并——它们进 `KEPT_SEPARATE`，逐条写明「为什么不合并」。
 *    这份「不合并」清单与合并表一样是交付内容：读者不必猜为什么还有两个像重复的节点。
 *
 * 2. **差异不抹平**。各案例登记的公理表**故意不同**（最典型的是拓扑流形：
 *    `dg:topological-manifold` 按「Hausdorff + 局部欧氏」登记，`top:topological-manifold`
 *    与 `manifold:top-manifold` 另加第二可数）。合并只收口**身份**，差异写进本表的
 *    `differences`，并在节点页与规范节点一起显示。第 2 条是数学纪律，不是排版问题。
 *
 * 3. **不改案例的自足性**。规范节点的 `cases` 是「自身案例 + 各被合并登记的案例」的并集；
 *    跨案例的硬前置因此仍然合法，判据从「同一个 `case` 前缀」放宽成「**两个端点共享
 *    至少一个登记案例**」。`tests/hard-prereq.mjs` 里那条断言按这个口径改写：
 *    不许出现的是「两个互不相干的案例之间凭空长出一条前置」，不是「共享登记的节点之间有前置」。
 *
 * ## 装配期改写做了什么
 *
 * `applyMerges()` 对**整个本体**做四件事，顺序不能颠倒：
 *
 * 1. 按 `MERGE_GROUPS` 建别名表（被合并 id → 规范 id），并把本体里**每一处**出现的
 *    被合并 id 逐字改写（关系端点、行动输入输出、证据 nodes、支持集 set、断言 node、
 *    误区锚点、聚合成员，以及节点内部引用 id 的字段：`formal.anchors` / `Use` / `Demo` /
 *    `applicableTo` / `concept` / 自检锚点）。逐字改写比逐处手写安全：漏一处就会出现
 *    「验证过不去」或更糟的「悄悄指向旧 id」。
 * 2. 修补改写带来的结构后果：关系变成自环的记进 `merges.sameObjectLinks`（它们本来
 *    就是「说明两处登记关系」的边，合并后这件事由本表承担）；三元组重复的关系、
 *    重复的行动输入输出、重复的支持集成员一律去重，被丢掉的那条记进
 *    `merges.droppedDuplicates`，不静默吞。
 * 3. 把被合并的登记原样挂到规范节点的 `registrations` 上，并补出 `cases` 与
 *    `alsoKnownAs`（别名标题，供检索用：合并后仍然搜得到「坐标图」「连通集」）。
 * 4. 被合并的节点从 `nodes` 里移除——站点上只出现一个规范节点。
 *
 * ## 与语言覆盖的关系
 *
 * 英文覆盖是**按 id**写的，被合并的 id 在里面有完整译文。装配顺序是
 * 「合并（这里）→ 内容块 → 语言覆盖」，因此 `data/i18n/overlay.mjs` 会把译文同样套到
 * `registrations` 上：英文视图里合并登记不会掉回中文。这一条由
 * `tests/merge-consistency.mjs` 与 `npm run check:i18n` 共同钉住。
 */

/**
 * 合并组：`canonical` 收口 `absorbed` 里的每一处登记。
 *
 * 字段：
 * - `id`：合并组自己的 id（进 `merges.groups`，供审计与页面显示）；
 * - `canonical`：规范节点 id（保留原 id 与它自己的正文块）；
 * - `absorbed`：被收口的登记 id（逐字保留进 `registrations`）；
 * - `rationale`：为什么这些登记是**同一个对象**（不是「名字像」）；
 * - `differences`：各处登记的差别，逐条保留——这是给读者的教学内容，不是待办。
 */
export const MERGE_GROUPS = [
  {
    id: 'm-top-space',
    canonical: 'top:space',
    absorbed: ['dg:topological-space', 'liang:topological-space'],
    rationale: '三处登记的是同一个对象：集合 X 加一族开集 τ，公理同为「含 ∅ 与 X、有限交封闭、任意并封闭」。',
    differences: [
      'dg 版与 liang 版都在 boundary 里点了「拓扑公理本身不含分离性」，top 版把这件事交给 top:separation-axioms 承担。',
      'liang 版另写了一条「拓扑不是集合自带的」（同一集合上的离散拓扑与平凡拓扑给出不同收敛行为），top 版没有这句。',
    ],
  },
  {
    id: 'm-top-manifold',
    canonical: 'top:topological-manifold',
    absorbed: ['dg:topological-manifold', 'dg:manifold', 'manifold:top-manifold'],
    rationale: '四处登记的都是「局部欧氏的拓扑流形」这同一个对象；dg 案例里的「流形」与「拓扑流形」是同一对象在两个小节里的两次登记。',
    differences: [
      '**公理表不同，这是有意的**：dg:topological-manifold 按「Hausdorff + 局部欧氏」登记（不含第二可数）；manifold:top-manifold 与 top:topological-manifold 另加第二可数。',
      '第二可数不是技术性附加假设：它保证可数图册、单位分解与嵌入定理；长直线（top:ce-long-line）说明去掉它之后「局部欧氏 + Hausdorff」也能出病态流形。',
      'dg:manifold 额外登记了维数记号 dim M = n 与「去掉 Hausdorff 会破坏极限唯一性」的边界说明。',
    ],
  },
  {
    id: 'm-diff-manifold',
    canonical: 'top:differentiable-manifold',
    absorbed: ['dg:smooth-manifold', 'liang:manifold'],
    rationale: '三处登记的是同一个对象：拓扑流形上再给一个 C^r（含 r=∞）图册；光滑流形是 r=∞ 的特例，不是另一个对象。',
    differences: [
      'top 版按「存在一个 C^r 图册」（r ≥ 1）登记，并写明 C^0 不算微分流形、r=∞ 时另称光滑流形；dg 版与 liang 版直接按 C^∞ 登记。',
      '三处都写了「第二可数不可删（否则失去单位分解）」；liang 版另写了「坐标是局部的，S² 至少需要两张球极投影图」。',
    ],
  },
  {
    id: 'm-compactness',
    canonical: 'top:compactness',
    absorbed: ['dg:compactness', 'liang:compactness', 'rudin:compact-set'],
    rationale: '同一个拓扑性质：任一开覆盖有有限子覆盖。rudin 版把它写成「子集紧致 + R^k 的 Heine–Borel 刻画」，仍是同一个概念（Heine–Borel 是它的度量空间特例）。',
    differences: [
      'top 版明确「用开覆盖定义，不用序列、不用有界且闭」；liang 版补了「一般拓扑空间中紧致不蕴含序列紧，还需要第一可数」。',
      'rudin 版带有 R^k 中「紧 ⇔ 有界且闭」的 Heine–Borel 定理——这是度量空间里的等价刻画，不是定义。',
      'dg 版补了同胚不变性这一条。',
    ],
  },
  {
    id: 'm-metric-space',
    canonical: 'dg:metric-space',
    absorbed: ['rudin:metric-space', 'top:metric-space'],
    rationale: '同一个对象：集合加距离函数 d（正定、对称、三角不等式）。top 版原先只是本案例的辅助前置，登记的是同一个定义，合并后不再需要第二份。',
    differences: [
      'dg 版强调「不同度量可以诱导同一拓扑，度量的数值不是拓扑不变量」；top 版只用两条性质（度量拓扑正规且仿紧）。',
      'rudin 版按 d(p,q) > 0（p ≠ q）、d(p,p) = 0、对称与三角不等式登记，并从开球定义开集。',
      '合并后 top 案例里「度量空间」不再是独立节点：`rel-top-pre-space-metric` 与 `a-top:aux-metric` 都指向本节点，仍属同案例共享登记，不影响案例自足性。',
    ],
  },
  {
    id: 'm-homeomorphism',
    canonical: 'top:homeomorphism',
    absorbed: ['dg:homeomorphism'],
    rationale: '同一个概念：双向连续的双射。两处的谓词写法不同（一个是自然语言、一个是 Homeomorphic(X,Y,f)），对象是同一个。',
    differences: [
      'dg 版强调「同胚是拓扑性质的等价，不是度量性质的等价，不保持长度与角度」。',
      'top 版强调「逆映射连续是定义的一部分，不是推论」。',
    ],
  },
  {
    id: 'm-continuous-map',
    canonical: 'top:continuous-map',
    absorbed: ['liang:continuous-map'],
    rationale: '同一个概念：开集的原像是开集。liang 版把「连续映射」与「同胚」写在一个话题块里，其中同胚部分与 top:homeomorphism 是同一对象。',
    differences: [
      'liang 版（话题级）把两个概念合写，并补了「连续性相对于两侧拓扑而言」；top 版是单元级登记，另有网与滤子的边界说明。',
      'liang 版的同胚部分见规范节点 top:homeomorphism——合并后不再单独登记。',
    ],
  },
  {
    id: 'm-chart',
    canonical: 'top:coordinate-chart',
    absorbed: ['dg:coordinate-chart'],
    rationale: '同一个对象：(U, φ)，U 开、φ 是到 R^n 开子集的同胚。两处只是名字不同（坐标卡 / 坐标图）。',
    differences: [
      'top 版写明「φ 的像必须开：射到 [0,1] 这类闭集不是坐标卡」，并交代坐标卡本身不含微分结构。',
      'dg 版只保留「坐标是局部的，一般没有覆盖整个流形的单张图」。',
    ],
  },
  {
    id: 'm-atlas',
    canonical: 'top:atlas',
    absorbed: ['manifold:chart-atlas'],
    rationale: '同一个对象：覆盖底空间的坐标卡族（相容性条件写在过渡映射上）。manifold 版把「图、图册与覆盖」合写在一个话题级条目里。',
    differences: [
      'top 版区分「拓扑图册」与 C^r 相容两个层次，并写明覆盖条件不能省。',
      'manifold 版的说法是「图册覆盖 X 且过渡映射有定义」，逐图核验覆盖与同胚条件。',
    ],
  },
  {
    id: 'm-smooth-atlas',
    canonical: 'dg:smooth-atlas',
    absorbed: ['manifold:smooth-atlas'],
    rationale: '同一个对象：两两过渡映射为 C^∞ 的图册。',
    differences: [
      'manifold 版是单元级性质登记（SmoothAtlas(A)），并写明「光滑化定理未在本站形式化」。',
      'dg 版把「覆盖」写成定义的一部分，并保留「只给出部分图不能称为图册」这条边界。',
    ],
  },
  {
    id: 'm-tangent-vector',
    canonical: 'dg:tangent-vector-curve',
    absorbed: ['liang:tangent-vector'],
    rationale: '两处给的是同一种构造：过 p 的光滑曲线按局部坐标下的一阶导取等价类。',
    differences: [
      'liang 版（「切矢量」）额外登记了 T_pM 是 n 维实矢量空间，并写了「切矢量不是从 p 伸出的箭头」。',
      'dg 案例的另一种构造（导子定义 dg:tangent-vector-derivation）**不合并**：见 KEPT_SEPARATE，两种定义的区别是该案例的主线。',
    ],
  },
  {
    id: 'm-tangent-equivalence',
    canonical: 'dg:claim-tangent-equivalence',
    absorbed: ['dg:tangent-vector-equivalence'],
    rationale: '同一结论的概念版与断言版：曲线等价类与导子之间存在保持线性结构与 Leibniz 法则的自然双射。断言版带证据与角色，因此按断言收口。',
    differences: [
      '被合并的概念版带着更长的正文（等价性的构造与验证），逐字保留在 registrations 里。',
      'PENDING_RELATION_REGISTRATION 里原先记的「概念版与断言版之间缺一条关系」由此注销：两者已经是同一个节点。',
    ],
  },
  {
    id: 'm-vector-field',
    canonical: 'dg:smooth-vector-field',
    absorbed: ['liang:vector-field'],
    rationale: '同一个对象：切丛的光滑截面 v: M → TM，π∘v = id_M。',
    differences: [
      'liang 版写的是分量判据（任一坐标卡下 v^μ 为 C^∞），并补了「只验一张卡不够」「矢量场不是一族切矢量」。',
      'dg 版写的是截面语言（光滑映射 + π∘X = id_M）。',
    ],
  },
  {
    id: 'm-tensor-field',
    canonical: 'tensor:field',
    absorbed: ['liang:tensor-field'],
    rationale: '同一个对象：张量丛的光滑截面。liang 版把「缩并」一并写在同一个话题块里。',
    differences: [
      'liang 版额外登记了缩并（一上一下配对）与「分量按张量变换律变化是判据而不是定义」。',
      'tensor 版把它放在张量丛构造之后，作为截面的单元级登记。',
    ],
  },
  {
    id: 'm-tensor',
    canonical: 'dg:tensor',
    absorbed: ['tensor:multilinear'],
    rationale: '同一个对象：对每个变量分别线性的多重线性函数（张量就是它，不是另一种东西）。',
    differences: [
      'tensor 版（「多重线性函数」）在张量代数案例里充当入口，随后接张量积与 (r,s) 型张量空间。',
      'dg 版写明 T ∈ T^r_s(V) 并保留「只对部分变量线性不构成张量」的边界。',
      '(r,s) 型张量空间 tensor:tensor-rs **不合并**：那是张量构成的空间，与「一个张量」不是同一个对象。',
    ],
  },
  {
    id: 'm-tensor-product',
    canonical: 'tensor:tensor-product',
    absorbed: ['dg:tensor-product-dg'],
    rationale: '同一个对象：由双线性映射的通用性质刻画的 V⊗W。',
    differences: [
      'dg 版补了「通用性质是定义的一部分；按分量逐个相乘不构成定义」。',
      'tensor 版把它写成「双线性映射的通用对象」，并在后面接换基规律与秩一映射的加法性。',
    ],
  },
  {
    id: 'm-differential-form',
    canonical: 'dg:differential-form',
    absorbed: ['rudin:differential-form', 'liang:differential-form'],
    rationale: '同一个对象：全反称的多重线性场，即外代数丛 ⋀^p T*M 的光滑截面。',
    differences: [
      'rudin 版按坐标写法 ω = Σ f_I dx_{I} 登记（并列出反交换、d² = 0、拉回与 d 交换），正文未撰写。',
      'liang 版（话题级）补了外积的反交换律 ω∧η = (−1)^{pq} η∧ω 与「p > n 时 Ω^p(M) = {0}」；外积的单元级登记另见 dg:form-wedge-product。',
      'dg 版写明「不反称的多重线性对象不是形式」。',
    ],
  },
  {
    id: 'm-d-squared-zero',
    canonical: 'dg:claim-d-squared-zero',
    absorbed: ['dg:d-squared-zero'],
    rationale: '同一结论的概念版与断言版：对任意微分形式 d(dω) = 0。断言版带证据与角色，因此按断言收口。',
    differences: [
      '被合并的概念版带着 17 KB 正文（恒等式的坐标验证与边界说明），逐字保留在 registrations 里。',
      'PENDING_RELATION_REGISTRATION 里原先记的「概念版与断言版之间缺一条关系」由此注销：两者已经是同一个节点。',
    ],
  },
  {
    id: 'm-closed-exact',
    canonical: 'liang:exterior-derivative',
    absorbed: ['rudin:closed-exact-form'],
    rationale: '同一个话题：外微分 d 的登记，以及由它定义的闭形式（dω = 0）与恰当形式（ω = dη）。',
    differences: [
      'liang 版给出 d 的唯一定义（df(v) = v(f) 与 Leibniz 律），并写明「恰当 ⇒ 闭恒成立，反向只对可缩区域成立」。',
      'rudin 版按「Poincaré 引理在星形区域成立、一般由 de Rham 上同调度量障碍」登记，正文未撰写。',
      '可缩区域上的断言另由 dg:poincare-lemma 单独登记（断言与话题不是一回事）。',
    ],
  },
  {
    id: 'm-stokes',
    canonical: 'dg:generalized-stokes-theorem',
    absorbed: ['liang:stokes-theorem', 'rudin:stokes-theorem'],
    rationale: '同一条定理：∫_M dω = ∫_{∂M} ω。rudin 版写的是链上的形式（∫_Γ dω = ∫_{∂Γ} ω），是同一个陈述在链语言下的写法。',
    differences: [
      'dg 版写明「需要定向与紧支集；去掉定向时带符号的边界积分没有定义」。',
      'liang 版补了「它把 Newton–Leibniz、Green、Gauss 与经典 Stokes 统一为一条陈述」，并写明 ∂M 取诱导定向。',
      'rudin 版的条件写成「ω 的系数连续可微、Γ 为 C²」，是与链语言配套的表述。',
    ],
  },
  {
    id: 'm-inverse',
    canonical: 'dg:inverse-function-theorem',
    absorbed: ['rudin:inverse-function-theorem'],
    rationale: '同一条定理：dF_p 可逆 ⇒ F 在 p 的邻域上是微分同胚（rudin 版另给出反函数的导数公式）。',
    differences: [
      'rudin 版额外写了 (f^{-1})′(f(a)) = [f′(a)]^{-1}，正文未撰写。',
      'dg 版保留「结论是局部的：dF 处处可逆也只给出局部同胚」这条边界。',
    ],
  },
  {
    id: 'm-implicit',
    canonical: 'dg:implicit-function-theorem',
    absorbed: ['rudin:implicit-function-theorem'],
    rationale: '同一条定理：∂F/∂y 在 (x₀,y₀) 可逆 ⇒ 方程 F(x,y) = 0 局部可解出 y = g(x)。',
    differences: [
      'rudin 版补了 g′(a) 由 F 的偏导数给出的公式与「唯一局部定义」的措辞，正文未撰写。',
      'dg 版只保留「可逆性失效时结论可能不成立」这条边界。',
    ],
  },
  {
    id: 'm-connected',
    canonical: 'top:connectedness',
    absorbed: ['rudin:connected-set'],
    rationale: '同一个概念：不能写成两个非空不交开集之并（rudin 版写成子集形式，并补了「R 中连通集恰是区间」）。',
    differences: [
      'top 版区分整体性质与局部连通、局部道路连通，并写明「道路连通 ⇒ 连通，反向不成立（拓扑学家的正弦曲线）」。',
      'rudin 版带「R 中连通集恰是区间」的刻画，正文未撰写。',
    ],
  },
  {
    id: 'm-intermediate',
    canonical: 'top:claim-connected-intermediate',
    absorbed: ['rudin:continuity-connectedness'],
    rationale: '同一条定理：连通集在连续映射下的像是连通的；对区间上的连续实函数即介值定理。',
    differences: [
      'top 版按拓扑层面登记（连通空间的连续像连通），并写明「对实值函数即中值定理」。',
      'rudin 版（话题级）写成「连续性与连通性（介值定理）」的分析版本，正文未撰写。',
    ],
  },
  {
    id: 'm-completeness',
    canonical: 'dg:metric-completeness',
    absorbed: ['rudin:cauchy-sequence'],
    rationale: '同一个性质：每个 Cauchy 序列都收敛于空间中的点（rudin 版把 Cauchy 序列与完备性写在一个话题块里）。',
    differences: [
      'dg 版写明「完备性是度量性质：等距同构保持它，同胚不保持」。',
      'rudin 版带「R^k 中 Cauchy 序列恰是收敛序列」的刻画，正文未撰写。',
    ],
  },
  {
    id: 'm-seq-conv',
    canonical: 'limit:seq-conv',
    absorbed: ['rudin:convergent-sequence'],
    rationale: '同一个对象：x_n → a 的 ε–N 定义（rudin 版写成度量空间中的点列，并把子序列收敛写在同一块里）。',
    differences: [
      'limit 版是实数序列的 ε–N 定义，边界写明「自然数标准模型与实数完备性作为声明背景」。',
      'rudin 版补了「收敛序列有界、其子序列收敛到同一点」，正文未撰写。',
    ],
  },
  {
    id: 'm-fn-limit',
    canonical: 'limit:limit-ed',
    absorbed: ['rudin:function-limit'],
    rationale: '同一个对象：去心邻域条件下的 ε–δ 极限定义。',
    differences: [
      'limit 版以实函数与聚点条件写出，并在同案例里另有序列式定义（limit:limit-seq）与两者的等价断言。',
      'rudin 版写成度量空间之间的映射（0 < d_X(x,p) < δ ⇒ d_Y(f(x),A) < ε），正文未撰写。',
    ],
  },
  {
    id: 'm-continuous-fn',
    canonical: 'limit:continuous',
    absorbed: ['rudin:continuous-function'],
    rationale: '同一个概念：连续（rudin 版写成一般度量空间上的连续函数，并含「开集的原像相对开」的等价刻画）。',
    differences: [
      'limit 版按一点处的 ε–δ 定义登记，并写明「孤立点上连续自动成立」。',
      'rudin 版把「在一点连续」与「在集合上连续」合并登记，正文未撰写。',
    ],
  },
  {
    id: 'm-partition',
    canonical: 'dg:partition-of-unity',
    absorbed: ['rudin:primitive-mapping'],
    rationale: '同一个对象：从属于给定开覆盖的单位分解（rudin 版把「本原映射」与它写在一个话题块里；本原映射是单形上的参数化，不是另一个单位分解）。',
    differences: [
      'dg 版写明「存在性依赖第二可数与 Hausdorff：去掉第二可数时不一定存在」。',
      'rudin 版把单位分解定义成非负 C^∞ 函数族（支集局部有限、和恒为 1、每个支集含于覆盖的某个成员）。',
      'rudin 版附带的「本原映射」没有别的登记处：它随这条登记一起保留在 registrations 里，正文未撰写。',
    ],
  },
  {
    id: 'm-riemann-curvature',
    canonical: 'liang:riemann-tensor',
    absorbed: ['gt:riemann-curvature-tensor'],
    rationale: '两处登记的是同一个对象：带联络流形上由协变导数对易子定义的 (1,3) 型曲率张量——dg 版写 R(X,Y)Z = ∇_X∇_Y Z − ∇_Y∇_X Z − ∇_{[X,Y]}Z，liang 版写 (∇_a∇_b − ∇_b∇_a)ω_c = R^d{}_{cab}ω_d，是同一个算子的两种逐字写法，不是两个对象。两处都是 Concept、都是单元级，构造类型与粒度相同。',
    differences: [
      '**指标次序不同，这是不抹平的差异**：liang 版用抽象指标把输出指标写在最前，记 R^a{}_{bcd}（对易子写成 R^d{}_{cab}ω_d）；dg 版按分量习惯记 R_{μνσ}{}^{ρ}（对偶 1-形式写成 R_{abc}{}^{d}ω_d）。同一张量、两套槽位次序，照抄公式前必须先对齐，合并只收口身份、不收口记号。',
      'dg 版（源笔记的更新世代，正文更全）另登记了三种定义方式（协变导数对易子 / 对偶 1-形式 / 无穷小平行四边形的和乐性）、指标下降后的 (0,4) 型 R_{abcd}、四条对称性与两条 Bianchi 恒等式、独立分量个数 n²(n²−1)/12，以及到 Gauss–Bonnet、测地偏离方程、Berger 和乐群分类的应用线索。',
      'liang 版（教材凝练路径 §3.4.1）只有 objectType、谓词与两条边界：它点出「曲率是 ∇ 的性质，不是流形的性质」与「R 的反对称性、配对对称性与 Bianchi 恒等式用到无挠」。',
      'dg 版把 liang 版第二条边界展开成「必要条件分析」的三条（无挠 / 与度量相容 / 至少 C^3 光滑），并各自给出删掉条件后的后果（带挠率要多出挠率项、度量相容一去掉配对对称性就没了）；同一条数学事实在两处各司其职，详略不同是有意的。',
      '证据与来源登记不同：liang 版是教材凝练笔记（reference / not_run，章节号 §3.4.1，正文是凝练笔记而非教材原文），dg 版是讨论班更新世代的正文块（data/dg/dg-riemann-curvature-tensor.md，模板化的十一节完整结构）。',
    ],
  },
  {
    id: 'm-lie-derivative',
    canonical: 'liang:lie-derivative',
    absorbed: ['gt:lie-derivative'],
    rationale: '两处登记的是同一个对象：沿向量场的流（单参数变换群）用拉回求导定义的张量场导数——liang 版写 L_v T = lim_{t→0} (φ_{-t}^* T − T)/t，dg 版写 L_ξ T = d/dt|_{t=0} F_t^* T，是同一个定义的两种逐字写法（dg 版另写明对函数 L_X f = X(f)、对向量场 L_X Y = [X,Y]）。两处都是 Concept、都是单元级，构造类型与粒度相同。',
    differences: [
      '记号不同，这是不抹平的差异：liang 版用 L_v（v 是矢量场），dg 版用 L_X 与 L_ξ；两处正文各自保留，不统一成一套写法。',
      'dg 版（更新世代，正文更全）分四种对象写出定义（光滑函数 / 向量场 / 微分形式 / 一般 (p,q) 型张量场），并有局部坐标分量公式、Cartan 魔术公式 L_X = d∘i_X + i_X∘d、五条等价表达、「必要条件分析」三条与应用（Killing 方程、Noether 守恒、应变张量 u_{ij} = ½L_ξ g_{ij}）。',
      'liang 版（教材凝练路径 §4.2）只有 objectType、谓词与两条边界：「李导数不需要任何额外结构（不需要联络），因此它与 ∇ 是两个不同的算子」与「对矢量场它就是李括号，不是分量逐个求方向导数」。',
      'dg 版把 liang 版那两条边界展开成四条「常见的误解」，其中 L_{fX} ≠ f L_X（实为 L_{fX}Y = f L_X Y − (Yf)X）是 liang 版没有的：它说明 L_X 对 X 只是 R-线性而不是 C^∞(M)-线性。',
      '依赖边不重复登记：liang 版原本就有 dg:smooth-vector-field → liang:lie-derivative 这条硬前置（rel-liang-pre-vectorfield-lie），合并后它同时承担 dg 登记那一侧的「向量场」依赖，本批因此在 data/relations/seminar-curvature.mjs 里不再写一条同向重复边。',
    ],
  },
];

/**
 * 明确**不合并**的相近节点：每一对都写清为什么不合并。
 *
 * 这份清单与合并表同等重要：站点上仍会出现「看起来像重复」的节点对，读者（以及
 * 以后改数据的人）应当在数据里就找到理由，而不是靠猜。
 */
export const KEPT_SEPARATE = [
  {
    ids: ['bg:top:space', 'top:space'],
    reason: '层次不同：`bg:*` 是**背景接口**（把拓扑空间与局部欧氏性合成一个最低接口，只在契约与边界里被引用），`top:space` 是**单元级定义**（开集公理逐条写出）。背景接口层是本站刻意保留的另一层，接口不替换单元登记。',
  },
  {
    ids: ['bg:real:metric', 'limit:distance'],
    reason: '同上：`bg:real:metric` 是实数与距离的共享背景接口（Theory，无正文），`limit:distance` 是极限案例里的单元级概念登记。合并会把背景接口层与单元层搅在一起。',
  },
  {
    ids: ['bg:group:binary', 'group:group-concept'],
    reason: '同上：背景接口给出的是群公理**模板**（供各案例声明依赖），`group:group-concept` 是群本身的单元登记。',
  },
  {
    ids: ['dg:tangent-vector-curve', 'dg:tangent-vector-derivation'],
    reason: '同一对象的两种**不同构造**：曲线等价类与导子。两者的差别正是 dg 案例的主线（随后由 dg:claim-tangent-equivalence 给出等价性），合并会把「两种定义 + 一条等价定理」的教学结构压成一个点。',
  },
  {
    ids: ['dg:form-wedge-product', 'liang:differential-form'],
    reason: '外积是单独的运算，不是「微分形式」这个对象的另一处登记。liang 的话题块合并写了两者，因此它的外积部分与被合并的登记一起保留在 `registrations` 里。',
  },
  {
    ids: ['tensor:tensor-rs', 'dg:tensor'],
    reason: '「一个张量」与「(r,s) 型张量空间」不是同一个对象：前者是元素，后者是它构成的空间。',
  },
  {
    ids: ['tensor:non-tensor-gamma', 'liang:pattern-christoffel-is-tensor'],
    reason: '构造类型不同：一个是反例（tensor 案例，带失败见证），一个是误区模式（liang 案例，带错误规则与锚点）。同一件数学事实在两层里各司其职（反例进证据链，误区进教学提示），合并会丢掉其中一层的作用。',
  },
  {
    ids: ['dg:form-pullback', 'liang:pushforward-pullback'],
    reason: '对象不同：`dg:form-pullback` 是微分形式的拉回，`liang:pushforward-pullback` 是流形间映射诱导的推前与对偶矢量场的拉回。名字都含「拉回」，但一个作用在形式上、一个作用在矢量与对偶矢量上。',
  },
  {
    ids: ['dg:smooth-embedding', 'gt:embedding-theorem'],
    reason: '构造类型不同（三条不变量第 1 条）：`dg:smooth-embedding` 是 Concept——「f: M → N 为单浸入，且 f 是到其像上的同胚」这个**概念**的登记；`dg:embedding-theorem` 是 Claim——Whitney 嵌入定理：n 维光滑流形可嵌入 R^{2n+1}、可浸入 R^{2n}（强形式进一步到 R^{2n} / R^{2n−1}）的**存在性与维数上界断言**。一个是「嵌入是什么」，一个是「嵌入总存在、维数能压到多低」：同一份数学材料在两层里各司其职（概念当陈述的词项，定理给存在性结论），合并会把「定义 → 定理」的结构压成一个点，Claim 构造（带 formula）也无处安放。两者的正确联系是陈述依赖，不是同一对象：定理陈述里的「嵌入」就是 `dg:smooth-embedding`，见 `data/relations/seminar-topology-theorems.mjs` 的硬前置 `dg:smooth-embedding → dg:embedding-theorem`。',
  },
  {
    ids: ['gt:covariant-tensor-field', 'tensor:field'],
    reason: '同一对象才合并，这里是「一般 ↔ 特例」：`tensor:field` 登记的是张量丛的**一般 (r,s) 型**光滑截面（参数写 T^r_s），`dg:covariant-tensor-field` 登记的是**纯协变**的 (0,r) 型张量场。源笔记自己在「升维视角」里写「所有 (r,s) 型张量场的集合构成一个分级代数，而协变张量场恰好是其中的『纯协变』部分」，「应用」里又把黎曼度量与微分形式列为它的例子——这是特例，不是同一对象的另一处登记。站内对这类关系的既有做法是分开成点再加依赖边（`tensor:field → liang:metric-tensor` 的硬前置、rel-liang-metric-specialization 的 scaling 边），不是合并。',
  },
  {
    ids: ['gt:covariant-tensor-field', 'liang:metric-tensor'],
    reason: '度规（黎曼）张量是 (0,2) 型**对称非退化**协变张量场，是协变张量场的一个特例：源笔记「应用 → 例 1」把它作为例子列出（「黎曼度量 g 是一个二阶对称正定协变张量场」）。特例与一般对象不是同一对象的两次登记；合并会把「度量在协变张量场框架里的位置」这条教学线索压平。',
  },
  {
    ids: ['gt:covariant-tensor-field', 'dg:tensor'],
    reason: '「一个张量」（逐点的多重线性映射）与「张量场」（它在流形上的光滑场，即张量丛的光滑截面）不是同一个对象：前者是代数对象，后者多一层「逐点粘合 + 光滑性」。这也正是站内既有那条 `tensor:tensor-rs` / `dg:tensor` 不合并理由的场化版本。',
  },
  {
    ids: ['gt:holonomy-group', 'liang:parallel-transport'],
    reason: '对象不同：`liang:parallel-transport` 是「沿曲线搬运切矢量」的**操作**（定义 t^a∇_a v^b = 0），`dg:holonomy-group` 是这些操作沿**闭**曲线复合后构成的**群**（H 与 H^*，定义为 M_x 上等距自同构群的子群，H ⊆ H^* ⊆ O(n)）。源笔记把两者的关系写成「沿 γ 的平行移动给出等距同构 γ̃，所有闭曲线的 γ̃ 自然构成一个群」——是「操作 → 由操作生成的群」，不是同一对象的两次登记。和乐群对平行移动的定义性依赖因此没有硬前置边（两者没有共享登记案例，判据见 tests/hard-prereq.mjs），如实留在 data/relations/seminar-curvature.mjs 的文件头与本条的说明里。',
  },
  {
    ids: ['liang:lie-derivative', 'liang:christoffel'],
    reason: '不同对象：李导数沿流形自身的微分同胚（向量场的流）定义，**不需要任何联络**；克氏符是（与度规适配的）联络在坐标卡下的分量。源笔记「常见的误解」1、2 正是在澄清「李导数与协变导数是一样的」——合并会把这条教学分界抹掉。',
  },
];

/**
 * 合并的**已知后果**：三条，都是取舍而不是缺陷。写在这里，因为它们会被误当成 bug。
 *
 * 1. **案例线按「登记归属」筛**。规范节点的 `cases` 是「自身案例 ∪ 各处登记的案例」的并集
 *    （`applyMerges` 生成），节点列表、网络视图、首页案例卡片与 `/ontology/graph?case=`
 *    都按它筛与计数。因此「微分几何案例有多少节点」现在有两个口径：
 *    `case === 'dg'` 是**节点归属**（28），`cases` 含 'dg' 是**登记归属**（35）。
 *    界面上要展示的是后者——否则收口会让某条案例线凭空瘦一圈。
 *
 * 2. **硬前置取并集**。同一对象在两处登记的前置不同时，合并后的节点要同时满足两套
 *    （判据：两个端点共享至少一个登记案例，见 `tests/hard-prereq.mjs`）。
 *    可见后果之一：原先「有行动、但没登记输入」的 `dg:topological-space` / `dg:metric-space`
 *    现在带着 top 案例登记的前置，空白档案下**只剩背景接口**是起始节点
 *    （`tests/starting-nodes.test.mjs` 把这件事写成断言，而不是把它藏起来）。
 *
 * 3. **引入路径取并集（OR）**。同一对象的几条引入契约都还在，任一条走得通就能引入它：
 *    `limit:limit-ed`（函数极限）因此多了一条经由 `dg:metric-space` 的路径
 *    （`tests/core.test.mjs` 的「关系代数」那一条记录了这件事）。
 *
 * 换句话说：合并让**身份**唯一，但不让前置与路径唯一。真要收紧某一条，办法是回到
 * `data/cases/*.mjs` 改那条登记，而不是在这里加特例。
 */

/** 别名表：被合并 id → 规范 id。 */
export function mergeAliasMap(groups = MERGE_GROUPS) {  const aliasOf = new Map();
  for (const group of groups) {
    for (const id of group.absorbed) {
      if (aliasOf.has(id)) throw new Error(`合并表里同一个 id 被吸收两次：${id}`);
      if (id === group.canonical) throw new Error(`合并组 ${group.id} 的 canonical 出现在 absorbed 里：${id}`);
      aliasOf.set(id, group.canonical);
    }
  }
  return aliasOf;
}

/** 深度改写：把**恰好等于**被合并 id 的字符串换成规范 id。 */
function rewriteIds(value, aliasOf) {
  if (typeof value === 'string') return aliasOf.get(value) ?? value;
  if (Array.isArray(value)) return value.map((item) => rewriteIds(item, aliasOf));
  if (value && typeof value === 'object') {
    const out = {};
    for (const [key, item] of Object.entries(value)) out[key] = rewriteIds(item, aliasOf);
    return out;
  }
  return value;
}

/** 去重（保序）：只用于「节点 id 的列表」这类字段。 */
function unique(items) {
  return [...new Set(items)];
}

/** 合并行动输入/输出：同一个节点出现两次时把资源并起来，不产生重复行。 */
function mergeContracts(items, aliasOf, key) {
  const byNode = new Map();
  const order = [];
  for (const item of items ?? []) {
    const node = aliasOf.get(item.node) ?? item.node;
    const existing = byNode.get(node);
    if (!existing) {
      const next = { ...item, node };
      byNode.set(node, next);
      order.push(next);
      continue;
    }
    existing[key] = unique([...(existing[key] ?? []), ...(item[key] ?? [])]);
    if (item.condition && !existing.condition) existing.condition = item.condition;
  }
  return order;
}

/**
 * 把合并表套到**装配好的本体分段**上，返回同一形状的新分段（外加 `merges` 报告）。
 *
 * 传入的形状就是 `data/manifest.mjs` 的默认导出：`{ schema, signature, theory, nodes,
 * actions, relations, evidence, support, claims, patterns, aggregates, templates,
 * environmentBoundary }`。本函数不读文件、不依赖具体案例，因此可以在测试里单独调用。
 */
export function applyMerges(parts, { groups = MERGE_GROUPS } = {}) {
  const aliasOf = mergeAliasMap(groups);
  const canonicalOf = new Map(groups.map((group) => [group.canonical, group]));
  const sourceNodes = new Map((parts.nodes ?? []).map((node) => [node.id, node]));

  /* ---- 1. 关系：改写端点；自环与重复三元组分别记账 ---- */
  const relations = [];
  const sameObjectLinks = [];
  const droppedDuplicates = [];
  const seenTriples = new Map();
  for (const relation of parts.relations ?? []) {
    const from = aliasOf.get(relation.from) ?? relation.from;
    const to = aliasOf.get(relation.to) ?? relation.to;
    if (from === to) {
      /*
       * 这条边原本的作用就是「说明两处登记的关系」（本站的 crossDomain / bridge 边）。
       * 合并之后这件事由合并组承担，边本身没有意义了；但它写的依据不能丢，记进报告。
       */
      sameObjectLinks.push({
        id: relation.id, kind: relation.kind, node: from,
        note: relation.scope ?? relation.task ?? relation.witness?.scope ?? '',
      });
      continue;
    }
    const key = `${from}|${to}|${relation.kind}`;
    if (seenTriples.has(key)) {
      droppedDuplicates.push({ kind: 'relation', dropped: relation.id, kept: seenTriples.get(key), triple: key });
      continue;
    }
    seenTriples.set(key, relation.id);
    relations.push({
      ...relation, from, to,
      ...(relation.direction ? { direction: {
        ...relation.direction,
        general: aliasOf.get(relation.direction.general) ?? relation.direction.general,
        special: aliasOf.get(relation.direction.special) ?? relation.direction.special,
      } } : {}),
    });
  }

  /* ---- 2. 行动契约：输入输出改写并合并重复行 ---- */
  const actions = (parts.actions ?? []).map((action) => ({
    ...action,
    inputs: mergeContracts(action.inputs, aliasOf, 'accepts'),
    outputs: mergeContracts(action.outputs, aliasOf, 'provides'),
  }));

  /* ---- 3. 证据 / 支持 / 断言 / 误区 / 聚合 ---- */
  const evidence = (parts.evidence ?? []).map((record) => ({
    ...record,
    ...(Array.isArray(record.nodes) ? { nodes: unique(record.nodes.map((id) => aliasOf.get(id) ?? id)) } : {}),
  }));

  const support = (parts.support ?? []).map((record) => ({
    ...record,
    node: aliasOf.get(record.node) ?? record.node,
    ...(Array.isArray(record.set) ? { set: unique(record.set.map((id) => aliasOf.get(id) ?? id)) } : {}),
  }));

  const claims = (parts.claims ?? []).map((claim) => ({
    ...claim,
    node: aliasOf.get(claim.node) ?? claim.node,
  }));

  const patterns = (parts.patterns ?? []).map((pattern) => ({
    ...pattern,
    node: aliasOf.get(pattern.node) ?? pattern.node,
    ...(Array.isArray(pattern.anchors) ? { anchors: unique(pattern.anchors.map((id) => aliasOf.get(id) ?? id)) } : {}),
  }));

  const aggregates = (parts.aggregates ?? []).map((aggregate) => ({
    ...aggregate,
    blocks: aggregate.blocks
      .map((block) => unique(block.map((id) => aliasOf.get(id) ?? id)))
      .filter((block) => block.length > 0),
  }));

  /* ---- 4. 节点：留下规范节点，被合并的登记原样挂上去 ---- */
  const absorbedRecords = new Map();
  for (const group of groups) {
    const records = [];
    for (const id of group.absorbed) {
      const node = sourceNodes.get(id);
      if (!node) throw new Error(`合并组 ${group.id} 要吸收的节点不存在：${id}`);
      records.push({ ...node, mergedInto: group.canonical, mergeGroup: group.id });
    }
    absorbedRecords.set(group.canonical, records);
  }

  const nodes = (parts.nodes ?? [])
    .filter((node) => !aliasOf.has(node.id))
    .map((node) => {
      const rewritten = rewriteIds(node, aliasOf);
      const records = absorbedRecords.get(node.id);
      if (!records) return rewritten;
      const cases = unique([node.case, ...records.map((record) => record.case)].filter(Boolean));
      const alsoKnownAs = unique(records.map((record) => record.title).filter((title) => title && title !== node.title));
      /*
       * 表征（`representations`）**不在这里上移**：装配层（`core/ontology.mjs`）会把
       * `registrations[].representations` 一并导进 `representations` 一节，并标出它属于
       * 哪一处登记。放进节点自己的数组会与语言覆盖的按序数组冲突（长度对不上），
       * 也会让「这条表征属于哪一处登记」这个信息丢掉。
       */
      return {
        ...rewritten,
        registrations: records,
        cases,
        alsoKnownAs,
        mergeGroup: canonicalOf.get(node.id)?.id,
      };
    });

  const merges = {
    version: '1',
    groups: groups.map((group) => ({
      id: group.id,
      canonical: group.canonical,
      absorbed: [...group.absorbed],
      rationale: group.rationale,
      differences: [...(group.differences ?? [])],
    })),
    aliases: Object.fromEntries(aliasOf),
    keptSeparate: KEPT_SEPARATE.map((item) => ({ ids: [...item.ids], reason: item.reason })),
    sameObjectLinks,
    droppedDuplicates,
  };

  return { ...parts, nodes, actions, relations, evidence, support, claims, patterns, aggregates, merges };
}

/** 审计用的一行人话（`npm run check` 与测试都用它，措辞只有一处）。 */
export function mergeSummary(groups = MERGE_GROUPS) {
  const absorbed = groups.reduce((sum, group) => sum + group.absorbed.length, 0);
  return `${groups.length} 组、吸收 ${absorbed} 处登记`;
}
