/**
 * 背景理论登记（`core/formal/backgrounds.mjs`）。
 *
 * ## 这一层负责什么
 *
 * 规格 `docs/自动关系发现-接口与语言规格.md` §2.4 要求背景理论提供
 * `{ id, version, bases, constants, axioms, definitions, schemas }`。
 * 本文件是**数据**：类型、常量、透明缩写、公理、公理模式，以及
 * 「未展开部分」的原子谓词登记。解析与类型检查在 `core/formal/language.mjs`。
 *
 * ## 三条纪律（每条都是被检查的，不是注释里的口号）
 *
 * 1. **未展开的部分只能是原子谓词。** 一个谓词如果在首版里没法写成公式
 *    （定义只能是 `kind:'term'`，见 §1.5），它就必须作为**有类型、有来源、
 *    有解释范围**的原子谓词登记在这里，而不是被偷偷当成"显然成立"。
 *    每个原子谓词都带 `expansion`（它的本意写法）、`source`（对照哪份原稿）
 *    与 `scope`（能解释什么、不能解释什么）。
 * 2. **不把待证定理当成公理符号。** 案例里的目标命题（Cayley 定理、最大图册、
 *    张量同构……）在本文件里**没有**对应的 `o` 型常量，也**不会**出现在
 *    `axioms` 或任何 spec 的 `assumptions` 里。它们要么被拆成各自可检查的
 *    子命题，要么登记在 `data/formal/registry.mjs` 的未展开义务表里。
 * 3. **公理必须是闭公式且来源可追。** §0 的机制保证是「不能把待证结论偷偷
 *    塞进公理」；本文件里每条 `axioms[]` 都带 `source` 与 `status`，
 *    且只登记原稿或 `data/manifest.mjs#theory.modules` 明确标为
 *    `background-assumed` 的结构性事实。
 *
 * ## 与 §2.4 的落点差异（显式记录，不悄悄改口径）
 *
 * §2.4 把 `BG_*` 与 `backgroundTheory` 写在 `core/formal/theory.mjs`。本轮的分工
 * 里 `backgrounds.mjs` 是这份数据的唯一来源（`server/api.mjs` 已经按
 * `backgrounds.listBackgrounds()` 与 `backgrounds.DEFAULT_BACKGROUND` 调用）。
 * `theory.mjs` 需要这些名字时应当**从本文件再导出**，不要另写一份。
 */

/** 背景理论的版本号；`backgroundTheory(id, version)` 用它做精确匹配。 */
export const BACKGROUND_VERSION = '1';

/** §2.4 的连接词/量词/等式/外延/抽象公理模式层。 */
export const BG_ALGEBRA = 'bg:algebra/1';
/** 群公理模板（不是"某个群"的公理）。 */
export const BG_GROUP = 'bg:group/1';
/** 序列与 ε–δ 的原子谓词与来源。 */
export const BG_LIMIT = 'bg:limit/1';
/** 图册 / 坐标变换 / C^k 正则性。 */
export const BG_MANIFOLD = 'bg:manifold/1';
/** 可加 / 线性 / 秩一。 */
export const BG_TENSOR = 'bg:tensor/1';
/**
 * §1.6 的示例里出现过 `bg:core/1`。它指的就是 §2.4 的 `bg:algebra/1`
 * （连接词/量词/等式/外延的公理模式），因此登记为**别名**而不是第二份理论：
 * 两份同义背景会让 `references` 的哈希核对出现"同一物两个 id"。
 */
export const BG_CORE = 'bg:core/1';

/**
 * 默认背景：逻辑底座，而不是某一个案例的背景。
 *
 * 理由：自动发现跑在**整个本体**上，四个案例共用的是一个逻辑与类型底座。
 * 取 `bg:group/1` 或 `bg:tensor/1` 会让默认运行预先假定代数结构，
 * 这与"未登记不等于已成立"的边界口径冲突。
 */
export const DEFAULT_BACKGROUND = BG_ALGEBRA;

const BG_ALIASES = new Map([[BG_CORE, BG_ALGEBRA]]);

/* ========================================================================== *
 * bg:algebra/1 —— 连接词、量词、等式、外延、抽象
 * ========================================================================== */

const ALGEBRA = {
  id: BG_ALGEBRA,
  version: BACKGROUND_VERSION,
  title: '逻辑底座：连接词、量词、等式、外延与抽象',
  note:
    '首版语言可用的全部逻辑资源都在这里。它对应检查器 mcs-nd-subset/1 的规则白名单，'
    + '因而是「能用什么推理」的诚实清单，而不是一份"标准逻辑"的期望清单。',
  bases: [
    { name: 'o', note: '真值类型，§1.1 要求它必须存在' },
  ],
  constants: [],
  definitions: [],
  axioms: [
    {
      id: 'bg-eq-refl',
      formula: '∀(x:o). x = x',
      kind: 'logic',
      status: 'background-assumed',
      source: 'docs/自动关系发现-接口与语言规格.md §0（规则白名单含 refl）',
      note: '等式自反的闭实例。等式替换（eq_e）是规则，不在这里另立公理。',
    },
    {
      id: 'bg-logic-true',
      formula: 'true',
      kind: 'logic',
      status: 'background-assumed',
      source: 'docs/自动关系发现-接口与语言规格.md §1.3（true 是公式）',
      note: '真值常元。§0 的机制保证：对象项要进 hypotheses 必须先写成 B(t) = (t = true)。',
    },
    {
      id: 'bg-extensionality-o',
      formula: '∀(f:o -> o)(g:o -> o). (∀(x:o). f(x) = g(x)) ⇒ f = g',
      kind: 'logic',
      status: 'background-assumed',
      source: 'data/manifest.mjs#theory（「外延」在 §2.4 的公理模式清单内）',
      note: '函数外延性在 o->o 上的**闭实例**。完整模式由 schemas.extensionality 描述，'
        + '由生成器按类型参数实例化，不在这里堆一批同形公理。',
    },
    {
      id: 'bg-abstraction-o',
      formula: '∀(x:o). (λ(y:o). y)(x) = x',
      kind: 'logic',
      status: 'background-assumed',
      source: 'docs/自动关系发现-接口与语言规格.md §4（abstraction 公理实例的构造要求）',
      note: '首版唯一允许的 β 通道的闭实例：应用一个 lift 符号于实参，'
        + '等价于把实参代进抽象体。term_sub 不进入 lift 内部（§0 最后一条）。',
    },
  ],
  schemas: [
    { id: 'H-twoDistinct', name: 'twoDistinct', args: [], params: [], note: '构造"两个可区分元素"的 h_axiom 实例。' },
    { id: 'H-twoExhaustive', name: 'twoExhaustive', args: [], params: [], note: '构造"载体恰有两个元素"的 h_axiom 实例。' },
    { id: 'H-logic-and', name: 'logic', args: ['and'], params: [], note: '合取：and_i / and_l / and_r 都有规则。' },
    { id: 'H-logic-imp', name: 'logic', args: ['imp'], params: [], note: '蕴含：imp_i / imp_e 都有规则。' },
    { id: 'H-logic-all', name: 'logic', args: ['all'], params: [], note: '全称：all_i 需要本征变量，all_e 需要实例项。' },
    { id: 'H-logic-ex', name: 'logic', args: ['ex'], params: [], note: '存在：ex_i 需要见证项，ex_e 需要本征变量与 discharge。' },
    { id: 'H-equality', name: 'equality', args: ['G'], params: [], note: '类型参数由生成时填入（§2.4 的便利构造器 equality(\'G\')）。' },
    { id: 'H-quantifier-all', name: 'quantifier', args: ['all', 'G'], params: [], note: '§2.4 的便利构造器 quantifier(\'all\',\'G\')。' },
    { id: 'H-extensionality', name: 'extensionality', args: ['G', 'o'], params: [], note: '§2.4 的便利构造器 extensionality(\'G\',\'o\')。' },
    {
      id: 'H-abstraction',
      name: 'abstraction',
      args: ['lamTerm', 'sig'],
      params: [],
      note: 'term 必须是规范 λ 项；parameters(a) 按规范序列化字典序排序，'
        + 'x 取避开 object_fv(a) 与 sig.constants 的新名（kernel 用 fresh：z0, z1, …）。'
        + '还原时排序或取名规则不一致会得到 forged H_Sigma instance。',
    },
  ],
  forbidden: [
    {
      id: 'no-disjunction',
      item: '析取 ∨ / or 与 or_i / or_e',
      reason: '检查器的认证公式允许 or，但**没有** or_i / or_e 规则（§0）。',
      consequence: '首版语言不接受析取写法；遇到就报 unsupported，不"先收下再说"。',
    },
    {
      id: 'no-classical',
      item: '经典反证 / 双重否定消去 / false_e',
      reason: '规则白名单里没有它们（§0）。',
      consequence: '`¬a` 只是 `a ⇒ false` 的展开；由 false 不能推出任意命题。',
    },
    {
      id: 'no-new-axioms',
      item: '在 spec 里新增基本公理',
      reason: '§1.5 明言首版不提供新增基本公理的入口；§0 要求 theory 规则步骤带 witness = digest(axiom)。',
      consequence: 'spec 的 assumptions 只能进 hypotheses；把结论写进 axioms 会被目标核对打回（§2.10）。',
    },
  ],
  boundary: [
    '**不接受析取**：kernel 白名单没有 or_i / or_e / false_e，经典反证也不可用（规格 §0、§4）。',
    '本背景不提供新增基本公理的入口；spec 的 assumptions 只进 hypotheses，不进 theory.axioms。',
    '外延性与 abstraction 只登记为**闭实例**，完整模式由 schemas 描述、由生成器按 §4 的构造要求实例化。',
    '高阶合一、参数化引理的自动提升、任意模型搜索都不在本层能力内（§4「不做」）。',
  ],
  source: 'docs/自动关系发现-接口与语言规格.md §0 / §1.3 / §1.5 / §2.4 / §4 / §2.7 的编码约定表',
};

/* ========================================================================== *
 * bg:limit/1 —— 序列与 ε–δ
 * ========================================================================== */

/*
 * 极限背景两条谓词的展开式，抽成常量是为了让 `constants[].expansion` 与
 * `axioms[].origin.expansion` **引用同一份字符串**——两处各写一份，迟早只改一处，
 * 于是"公理声称的定义"与"登记里写的定义"会悄悄分叉。
 * 必须定义在 `LIMIT` 之前（下面两条谓词要用它）。
 */
const SEQ_CONV_EXPANSION =
  '∀(eps:R). lt(zero)(eps) ⇒ ∃(N0:N). ∀(n:N). (le(N0)(n) ⇒ lt(d(xx(n))(aa))(eps))';
/*
 * `limit_ed` 的展开**必须带上 `lt(zero)(d(y)(aa))`**（即 0 < |y − a|，去心邻域）。
 *
 * 这一条不能省：背景登记表里 `constants[limit_ed].expansion` 本来就写着它
 * （原稿「极限」那处明确要求去心），而 `d(y)(aa) < del` 在 `del > 0` 下**不排除 `y = aa`**。
 * 漏掉它会让前件更弱、公理更强——那正是"静默加强公理"，比漏一条测试严重得多。
 */
const LIMIT_ED_EXPANSION =
  '∀(eps:R). lt(zero)(eps) ⇒ ∃(del:R). (lt(zero)(del) ∧ '
  + '∀(y:R). ((lt(zero)(d(y)(aa)) ∧ lt(d(y)(aa))(del)) ⇒ lt(d(ff(y))(LL))(eps)))';
/*
 * 序列式定义。**展开式里只允许出现该谓词的参数名**（`ff` / `aa` / `LL`）：
 * 早先这里写的是裸的 `f` 与 `L`，它们既不是参数也不是量词绑定变量，
 * 于是 expansion 带两个自由变量、没法变成闭公理，`limit_seq` 永远只是未解释原子。
 */
const LIMIT_SEQ_EXPANSION =
  '∀(xx:N -> R). ((∀(n:N). ¬(xx(n) = aa)) ∧ seq_conv(xx)(aa)) ⇒ seq_conv((λ(n:N). ff(xx(n))))(LL)';

const LIMIT = {
  id: BG_LIMIT,
  version: BACKGROUND_VERSION,
  title: '极限：序列收敛、ε–δ、常值序列',
  note:
    '四个谓词（seq_conv / limit_ed / limit_seq / continuous_at）都是**原子**的：'
    + '它们的 ε–N / ε–δ 展开记在 expansion 里供人工核对，但没有被写成公式。'
    + '这样做的代价与收益都写在各条的 scope 里：'
    + '收益是绝不会把「取值等式」误当成「已证收敛」；代价是首版不能自动展开它们。',
  bases: [
    { name: 'o', note: '真值类型' },
    { name: 'R', note: '实数排序名；本站不编码完备性、确界定理与一般度量空间' },
    { name: 'N', note: '自然数排序名（序列指标、阈值）' },
  ],
  constants: [
    { name: 'd', type: 'R -> R -> R', note: '实数距离 d(x,y)=|x−y|；只作为原子常量，不展开为分段定义。' },
    { name: 'lt', type: 'R -> R -> o', note: '实数上的严格小于。' },
    { name: 'le', type: 'N -> N -> o', note: '自然数上的 ≤（"最终"的精确载体）。' },
    { name: 'zero', type: 'R', note: '实数零。' },
    { name: 'one', type: 'N', note: '自然数 1（常值序列验证里 N=1 的那个 1）。' },
    {
      name: 'seq_conv',
      type: '(N -> R) -> R -> o',
      note: '「序列收敛到某实数」的原子谓词。',
      expansionKind: 'formula',
      expansion: SEQ_CONV_EXPANSION,
      axiomId: 'bg-seq-conv-expansion',
      source: 'data/cases/01-limit.md「序列收敛」（第 11–19 行）',
      scope:
        '只登记谓词与它的本意写法，**不断言任何序列收敛**。量词次序（N 可依赖 ε、不可依赖 n）'
        + '写在原稿里、没有编码进类型；去心与聚点概念不在本谓词内。',
    },
    {
      name: 'limit_ed',
      type: '(R -> R) -> R -> R -> o',
      note: '函数极限的 ε–δ 定义，记作 limit_ed(f)(a)(L)。',
      expansionKind: 'formula',
      expansion: LIMIT_ED_EXPANSION,
      axiomId: 'bg-limit-ed-expansion',
      source: 'data/cases/01-limit.md「函数极限的 ε–δ 定义」（第 21–33 行）',
      scope:
        '不编码定义域 D、去心邻域 0<|x−a| 的开集结构，也不声称极限存在或唯一；'
        + '「a 为聚点」被单独登记为 cluster_point，只能当显式假设用。',
    },
    /*
     * `limit_seq` 的定义性公理（2026-10-04 补回）。
     *
     * 展开式里有 `seq_conv((λ(n:N). ff(xx(n))))(LL)`——**把 λ 项直接当函数参数应用**。
     * `language.parseFormula` 能解析它，但 kernel 的 `term_type` 不接受裸 λ 当项
     * （`object/certification language confusion`），所以早先这里"宁缺毋滥"地摘掉了
     * `axiomId`，代价是极限案例六条候选全部退化成只剩定义引用。
     *
     * 现在由 `theory.buildKernelTheory` 装配时做**认证化**：凡出现在项位置的裸 λ
     * 一律提升成 `lift(λ, 自由变量表)`——那是 kernel 唯一承认的 β 通道
     * （abstraction 公理：`lift(a) x = lift(a 体[x])`），含义不变、形状可检。
     * 于是这条 expansion 可以照原样登记，不必为了迁就检查器改写原文。
     */
    {
      name: 'limit_seq',
      type: '(R -> R) -> R -> R -> o',
      note: '序列式（Heine）函数极限定义，记作 limit_seq(f)(a)(L)。',
      /*
       * 展开式里的 `ff` / `LL` 必须与上面 `type` 里的两个参数位**对得上**：
       * `limit_seq` 的类型是 `(R -> R) -> R -> R -> o`，即 `limit_seq(f)(a)(L)`，
       * 所以 `f` 的位置写 `ff`、`L` 的位置写 `LL`。
       *
       * 早先这里写的是裸的 `f` 与 `L`——它们既不是谓词的参数、也不是量词绑定的变量，
       * 于是展开式**带两个自由变量**。后果不是"报错"，而是这条 expansion 没法变成
       * 定义性公理（公理必须闭），`limit_seq` 因此永远只是未解释的原子谓词。
       * 这与 `seq_conv` / `limit_ed` 的写法是同一个口径：展开式里的自由名**只能是该谓词的参数**。
       */
      expansion:
        '∀(xx:N -> R). ((∀(n:N). ¬(xx(n) = aa)) ∧ seq_conv(xx)(aa)) ⇒ seq_conv((λ(n:N). ff(xx(n))))(LL)',
      expansionKind: 'formula',
      axiomId: 'bg-limit-seq-expansion',
      source: 'data/cases/01-limit.md「序列式极限定义」（第 35–43 行）',
      scope:
        '「沿任何一条通往 a 的去心路径」被写成对**所有**序列的全称条件；'
        + '反向证明需要从「每个 δ 都有反例点」取出反例序列，那一步依赖选择，'
        + '本站把它登记为独立的 choice_principle 假设。',
    },
    {
      name: 'continuous_at',
      type: '(R -> R) -> R -> o',
      note: '函数在一点连续（含 x=a 的情形），记作 continuous_at(f)(a)。',
      expansion:
        '∀(eps:R). lt(zero)(eps) ⇒ ∃(del:R). (lt(zero)(del) ∧ '
        + '∀(y:R). (lt(d(y)(a))(del) ⇒ lt(d(f(y))(f(a)))(eps)))',
      source: 'data/cases/01-limit.md「函数在一点连续」（第 55–65 行）',
      scope: '与 limit_ed 的差别正是原稿强调的那一处：这里**不去心**，必须包含 x=a；孤立点上自动成立。',
    },
    {
      name: 'cluster_point',
      type: 'R -> o',
      note: '「a 是定义域 D 的聚点」的原子谓词。D 在本背景里没有编码，因此它只作为显式假设出现。',
      expansion: '（原稿未给出可写的公式形式：需要先编码 D 与其去心邻域）',
      source: 'data/cases/01-limit.md「两种定义的等价」条件即反例段落',
      scope: '只用来在 limit:bridge 的等价式上标明前提；删去它等价式会单侧退化（原稿原话）。',
    },
    {
      name: 'choice_principle',
      type: 'o',
      note: '元理论里的选择条件：从「每个 δ 都能找到反例点」取出反例序列 x_n（对 δ=1/n）。',
      expansion: '（不展开：它是元理论原则，不是对象语言公式）',
      source: 'data/cases/01-limit.md「两种定义的等价」精确边界段落',
      scope:
        '只登记为可显式声明的假设。它**不是**公理，也不进 theory.axioms；'
        + '对象理论削弱它时，桥梁的反向证明缺什么由该假设的缺失直接显示。',
    },
  ],
  definitions: [
    {
      name: 'const_seq',
      type: 'R -> N -> R',
      source: 'λ(a:R). λ(n:N). a',
      note: '常值序列 x_n = a 的透明缩写（原稿「常值序列」：设 x_n=a 对所有 n）。',
      origin: 'data/cases/01-limit.md「常值序列」（第 75–83 行）',
    },
  ],
  axioms: [
    {
      id: 'bg-distance-zero',
      formula: '∀(x:R)(y:R). d(x)(y) = zero ⇔ x = y',
      kind: 'structural',
      status: 'background-assumed',
      source: 'data/cases/01-limit.md「实数距离」边界段落',
      note:
        '原句「距离为零只表示两点相同，不表示"足够小"」。'
        + '这是本背景唯一的内容公理：它不涉及完备性、确界定理与一般度量空间。',
    },
    /*
     * 谓词的**定义性公理**：把 `constants[].expansion` 里已经写下的含义升成公式。
     *
     * 与 `bg:group/1` / `bg:tensor/1` / `bg:manifold/1` 同一口径（见 `definitionalAxiom` 的注释）：
     * 这不是"把待证结论塞进公理"，而是把背景**自己写下的定义**变成可推理、可版本化的东西
     * （它们会进 `theory_sha256`，所以"这份证书假定了什么"是可核的）。
     *
     * 没有它们，`seq_conv` / `limit_ed` 在证书里只是**未解释的原子谓词**——
     * 程序里提到它们的子句数为 0，于是"常值序列收敛"之类的目标连推理起点都没有，
     * `limit` 案例一条证书型关系都验不出来（2026-10-04 验收实测：另外三案各有一条，极限 0 条）。
     */
    {
      id: 'bg-seq-conv-expansion',
      formula:
        '∀(xx:N -> R)(aa:R). (seq_conv(xx)(aa) ⇔ '
        + '∀(eps:R). lt(zero)(eps) ⇒ ∃(N0:N). ∀(n:N). (le(N0)(n) ⇒ lt(d(xx(n))(aa))(eps)))',
      kind: 'definitional',
      status: 'background-assumed',
      origin: {
        predicate: 'seq_conv',
        carrier: 'R',
        params: [{ name: 'xx', type: 'N -> R' }, { name: 'aa', type: 'R' }],
        expansion: SEQ_CONV_EXPANSION,
        registration: 'core/formal/backgrounds.mjs#BG_LIMIT.constants[seq_conv].expansion',
        caseQuote: 'data/cases/01-limit.md「序列收敛」：x_n → a 意思是"从某项起，所有项都落在 a 的 ε 邻域内"。',
      },
      note: '把 ε–N 的展开升成公式。**只定义谓词的含义**：它不声称任何具体序列收敛（那要具体证明）。',
    },
    {
      id: 'bg-limit-ed-expansion',
      formula:
        '∀(ff:R -> R)(aa:R)(LL:R). (limit_ed(ff)(aa)(LL) ⇔ '
        + '∀(eps:R). lt(zero)(eps) ⇒ ∃(del:R). (lt(zero)(del) ∧ '
        + '∀(y:R). ((lt(zero)(d(y)(aa)) ∧ lt(d(y)(aa))(del)) ⇒ lt(d(ff(y))(LL))(eps))))',
      kind: 'definitional',
      status: 'background-assumed',
      origin: {
        predicate: 'limit_ed',
        carrier: 'R',
        params: [{ name: 'ff', type: 'R -> R' }, { name: 'aa', type: 'R' }, { name: 'LL', type: 'R' }],
        expansion: LIMIT_ED_EXPANSION,
        registration: 'core/formal/backgrounds.mjs#BG_LIMIT.constants[limit_ed].expansion',
        caseQuote: 'data/cases/01-limit.md「ε–δ 极限」：极限就是"任意误差都能被某个邻域控制"。',
      },
      note:
        '把 ε–δ 的展开升成公式。原文那处**多写了去心条件**（`0 < |y − a|`），'
        + '而 `d(y)(aa) < del` 在 `del > 0` 下不排除 `y = aa`，于是前件更强——'
        + '本登记照 `expansion` 逐字转写，**不做静默加强**；差异记在这里而不是"顺手补上"。',
    },
    {
      id: 'bg-limit-seq-expansion',
      /*
       * 谓词的三个参数位（`ff` / `aa` / `LL`）在闭公理里必须是**量词绑定**的：
       * `constants[limit_seq].expansion` 里它们是自由名（那是给人看的展开式），
       * 这里按 `type = (R -> R) -> R -> R -> o` 的参数位逐一对齐后 ∀ 封闭。
       * 内部再绑定序列变量 `xx`——与登记表里的 `expansion` 完全同形。
       *
       * **必须是 `谓词(参数) ⇔ expansion` 这个形状**：定义性公理的定义就是"把谓词的含义写成公式"，
       * 少掉左边那一件就退化成一条**单向蕴含**——那既不再与 `constants[].expansion` 同形
       * （`tests/formal-cases.test.mjs` 会拒），也等于**悄悄加强**了这个谓词
       * （只给反方向、把另一个方向留成未定义）。方向上的取舍写在 `note` 里，不写进公式形状。
       */
      formula:
        '∀(ff:R -> R)(aa:R)(LL:R). (limit_seq(ff)(aa)(LL) ⇔ '
        + '∀(xx:N -> R). ((∀(n:N). ¬(xx(n) = aa)) ∧ seq_conv(xx)(aa)) ⇒ seq_conv((λ(n:N). ff(xx(n))))(LL))',
      kind: 'definitional',
      status: 'background-assumed',
      origin: {
        predicate: 'limit_seq',
        carrier: 'R',
        params: [{ name: 'ff', type: 'R -> R' }, { name: 'aa', type: 'R' }, { name: 'LL', type: 'R' }],
        expansion: LIMIT_SEQ_EXPANSION,
        registration: 'core/formal/backgrounds.mjs#BG_LIMIT.constants[limit_seq].expansion',
        caseQuote: 'data/cases/01-limit.md「序列式极限定义」：沿任何一条通往 a 的去心路径，f(x_n) 都趋于 L。',
      },
      note:
        '把序列式的展开升成公式（`⇔`，与其他三个背景的写法同口径）。'
        + '**证明时只有「所有去心序列都对 ⇒ limit_seq」这一支是可用的**：'
        + '反向要从「每个 δ 都有反例点」取出反例序列，那一步依赖选择，'
        + '本背景把它登记为独立的 `choice_principle` 假设，不在这里偷偷用掉。'
        + '展开式里有「λ 项当函数参数」的形状，装配时由 `theory.buildKernelTheory` 认证化成 `lift(λ, 参数表)`。',
    },
  ],
  schemas: [
    {
      id: 'limit-eps-n-expansion',
      name: 'atomic-expansion',
      args: ['seq_conv'],
      params: [
        { name: 'xx', type: 'N -> R' },
        { name: 'aa', type: 'R' },
      ],
      template: '∀(eps:R). lt(zero)(eps) ⇒ ∃(N0:N). ∀(n:N). (le(N0)(n) ⇒ lt(d(xx(n))(aa))(eps))',
      note: 'seq_conv 的本意写法。它是**核对用的模板**，不注入为公理、也不参与搜索。',
    },
    {
      id: 'limit-eps-delta-expansion',
      name: 'atomic-expansion',
      args: ['limit_ed'],
      params: [
        { name: 'ff', type: 'R -> R' },
        { name: 'aa', type: 'R' },
        { name: 'LL', type: 'R' },
      ],
      template:
        '∀(eps:R). lt(zero)(eps) ⇒ ∃(del:R). (lt(zero)(del) ∧ '
        + '∀(yy:R). ((lt(zero)(d(yy)(aa)) ∧ lt(d(yy)(aa))(del)) ⇒ lt(d(ff(yy))(LL))(eps)))',
      note: 'limit_ed 的本意写法，同样只用于核对。',
    },
  ],
  boundary: [
    '**不把取值等式说成已证收敛**：`const_seq` 的取值恒等式（limit:claim-eval-constant 里被认证的那一条）'
      + '与 seq_conv 是两件事。原稿「否定范围」明确写了这一点。',
    '实数完备性、确界定理、一般度量空间都未编码（原稿「实数距离」边界）。',
    '去心邻域、定义域 D、开集结构未编码；聚点与选择原则只能作为显式假设出现。',
    '原稿「两种定义的等价」写明：完整证明只在自然语言里，机器证书只覆盖「常值取值」这一小步。',
  ],
  source: 'data/cases/01-limit.md 全篇（实数距离 / 序列收敛 / ε–δ / 序列式 / 两种定义的等价 / 常值序列 / 常值取值片段）',
};

/* ========================================================================== *
 * bg:group/1 —— 群、阿贝尔群、左乘
 * ========================================================================== */

/**
 * 群概念谓词的**本意写法**（定义性公理用）。
 *
 * 三个合取支用了**互不相同**的绑定名（`a0/b0/c0`、`e1`、`i1`）。
 * 这不是"绑定名必须不同"的规定——`∀x.P(x) ∧ ∀x.Q(x)`（同名绑定出现在**兄弟**作用域）
 * 是合法的，也与本写法 α 等价。之所以写成现在这样，是因为 2026-10-04 实测
 * `theory.formulaFv` 会把第二个同名绑定当成自由变量，于是 `buildKernelTheory`
 * 报「theory.axioms 的每条必须是闭公式」。也就是说：**这是绕过，不是规范**。
 * 语言层修好那个误判之后，本写法可以原样保留（α 等价、含义不变），
 * 但不要据此推断登记时绑定名必须互不相同。缺口已报 lang-layer。
 */
const groupConceptExpansion = (carrier) =>
  `((∀(a0:${carrier})(b0:${carrier})(c0:${carrier}). mm(mm(a0)(b0))(c0) = mm(a0)(mm(b0)(c0))) `
  + `∧ (∀(e1:${carrier}). (mm(e1)(ee) = e1 ∧ mm(ee)(e1) = e1)) `
  + `∧ (∀(i1:${carrier}). (mm(i1)(ii(i1)) = ee ∧ mm(ii(i1))(i1) = ee)))`;

const abelianGroupExpansion = (carrier, groupPredicate) =>
  `(${groupPredicate}(mm)(ee)(ii) ∧ ∀(a0:${carrier})(b0:${carrier}). mm(a0)(b0) = mm(b0)(a0))`;

/** 把「谓词 ⇔ 本意」写成一条闭公式；参数在 `∀` 上绑全，kernel 要求 axioms 无自由变量。 */
const definitionalAxiom = (carrier, predicate, expansion) =>
  `∀(mm:${carrier} -> ${carrier} -> ${carrier})(ee:${carrier})(ii:${carrier} -> ${carrier}). `
  + `(${predicate}(mm)(ee)(ii) ⇔ ${expansion})`;

const GROUP_CARRIERS = ['G', 'Z5', 'S3'];

const GROUP = {
  id: BG_GROUP,
  version: BACKGROUND_VERSION,
  title: '群公理模板、阿贝尔群与左乘映射',
  note:
    '本背景**不判断任何具体结构是群**：它只提供 group_concept / abelian_group 两个原子谓词、'
    + 'left_mul 这个透明缩写，以及四条公理的**模板**（schemas）。'
    + '具体结构是不是群，由有限求值器按 §2.12 逐格核对（data/formal/instances.mjs），'
    + '或者由 spec 把某条律写成显式假设。',
  bases: [
    { name: 'o', note: '真值类型' },
    { name: 'G', note: '一般群载体（bg:group/1 的通用排序）' },
    { name: 'H', note: '备用群载体：两个结构并置、需要区分载体时使用' },
    { name: 'Z5', note: '模 5 乘法单位群 {1,2,3,4} 的载体排序' },
    { name: 'S3', note: '三个字母上双射的对称群载体排序' },
  ],
  constants: [
    { name: 'mul', type: 'G -> G -> G', note: '一般载体上的二元运算**符号**。本背景不断言它满足任何律。' },
    { name: 'e', type: 'G', note: '一般载体上的单位元符号。同样不被断言任何性质。' },
    { name: 'inv', type: 'G -> G', note: '一般载体上的逆元符号。同样不被断言任何性质。' },
    {
      name: 'group_concept',
      type: '(G -> G -> G) -> G -> (G -> G) -> o',
      note: '「这三件套构成一个群」的原子谓词，记作 group_concept(M)(E)(I)。',
      expansionKind: 'formula',
      expansion: groupConceptExpansion('G'),
      axiomId: 'bg-group-concept-expansion',
      source: 'data/cases/04-group.md「群」（第 1–9 行）',
      scope:
        '只断言四条公理。交换律**不在**其中；子群、同态、商群、阶、有限性都不在本谓词内。'
        + '本谓词不被写成公式，也不被假定为真：它出现在 statement / claims 里，不出现在 assumptions 与 axioms 里。',
    },
    {
      name: 'abelian_group',
      type: '(G -> G -> G) -> G -> (G -> G) -> o',
      note: '「这三件套构成一个阿贝尔群」的原子谓词，记作 abelian_group(M)(E)(I)。',
      expansionKind: 'formula',
      expansion: abelianGroupExpansion('G', 'group_concept'),
      axiomId: 'bg-abelian-group-expansion',
      source: 'data/cases/04-group.md「群」逐条件反例段（「交换律不属于群定义：模 5 乘法交换，但 S3 不交换」）',
      scope:
        '阿贝尔群在案例本体里**没有独立节点**，因此它以一条**概念 spec** 的形式登记在 '
        + 'registry.mjs 的 CONCEPT_SPECS（`concept:group:abelian`，锚点 group:group-concept）。'
        + '特化方向是 abelian_group ⇒ group_concept，证据形式是上面那条合取式；'
        + '它不宣称"所有群交换"（那正是 group:pattern-all-commutative 被反驳的规则）。',
    },
    {
      /*
       * 简单类型论（§1.1）**没有类型变量**：ATOM 就是 'o' 或一个标识符，
       * 所以 `group_concept : (G->G->G) -> G -> (G->G) -> o` 里的 G 是一个**固定排序**，
       * 不能让 `mul5 : Z5 -> Z5 -> Z5` 套进去。具体载体因此需要具体类型的谓词。
       *
       * 为什么不干脆把 Z5 写成 G：那会把「模 5 单位群是一个群」偷换成
       * 「某个抽象 G 上的群」，恰好丢掉这条实例登记的全部意义（Lead 2026-10-04 指出的正是这一点）。
       */
      name: 'group_concept_Z5',
      type: '(Z5 -> Z5 -> Z5) -> Z5 -> (Z5 -> Z5) -> o',
      note: 'group_concept 在**模 5 乘法单位群**载体上的具体类型实例。',
      expansionKind: 'formula',
      expansion: groupConceptExpansion('Z5'),
      axiomId: 'bg-group-concept-expansion-Z5',
      source: 'data/cases/04-group.md「模 5 乘法单位群」（第 27–33 行）',
      scope: '只覆盖载体 {1,2,3,4}；完备的有限核对由 data/formal/instances.mjs#finite:z5-units 的 4×4 表给出。',
    },
    {
      name: 'abelian_group_Z5',
      type: '(Z5 -> Z5 -> Z5) -> Z5 -> (Z5 -> Z5) -> o',
      note: 'abelian_group 在模 5 乘法单位群载体上的具体类型实例。',
      expansionKind: 'formula',
      expansion: abelianGroupExpansion('Z5', 'group_concept_Z5'),
      axiomId: 'bg-abelian-group-expansion-Z5',
      source: 'data/cases/04-group.md「模 5 乘法单位群」关键边界段',
      scope: '交换性是这个例子的偶然特征，不是群公理；本谓词只描述这一个载体。',
    },
    {
      name: 'group_concept_S3',
      type: '(S3 -> S3 -> S3) -> S3 -> (S3 -> S3) -> o',
      note: 'group_concept 在**三个字母上的对称群**载体上的具体类型实例。',
      expansionKind: 'formula',
      expansion: groupConceptExpansion('S3'),
      axiomId: 'bg-group-concept-expansion-S3',
      source: 'data/cases/04-group.md「S₃ 非交换反例」（第 47–53 行）',
      scope: '只覆盖 6 个置换；完整核对由 data/formal/instances.mjs#finite:s3 的 6×6 表给出（右侧先作用）。',
    },
    {
      name: 'abelian_group_S3',
      type: '(S3 -> S3 -> S3) -> S3 -> (S3 -> S3) -> o',
      note: 'abelian_group 在 S3 载体上的具体类型实例。它**不成立**，登记它是为了让否定有精确落点。',
      expansionKind: 'formula',
      expansion: abelianGroupExpansion('S3', 'group_concept_S3'),
      axiomId: 'bg-abelian-group-expansion-S3',
      source: 'data/cases/04-group.md「S₃ 非交换反例」否定范围段',
      scope: '本谓词在 finite:s3 上被反例否定（comp3(g12)(g23) ≠ comp3(g23)(g12)）；它不否定交换群子类。',
    },
    {
      name: 'right_identity',
      type: '(G -> G -> G) -> G -> o',
      note: '右单位律，记作 right_identity(M)(E)：∀a. M(a)(E) = a。',
      expansion: '∀(aa:G). mm(aa)(ee) = aa',
      source: 'data/cases/04-group.md「左乘映射相等推出元素相等」（「在右单位律与开放假设 L_g=L_h 下」）',
      scope:
        '把原稿里的"右单位律"写成一个**有类型的谓词**，便于放进 spec 的 assumptions。'
        + '本背景不把它当公理断言（原稿说证书的"理论仅含右单位律"，'
        + '登记口径差异记在 formal:group:claim-injective 的 boundary 里）。',
    },
    {
      name: 'left_mul_bijective',
      type: '(G -> G -> G) -> G -> o',
      note: '「L_g 是双射」的原子谓词。**未展开**。',
      expansion: '（需要完整群公理：用结合律得到复合等式、用逆元给出 L_{g^{-1}} 是左逆与右逆）',
      source: 'data/cases/04-group.md「左乘映射」边界（「完整的双射与同态论证依赖完整群公理」）',
      scope: '只作为 Cayley 的**待证义务**登记（见 registry.mjs 的 UNEXPANDED_OBLIGATIONS）；不出现在任何 assumptions 里。',
    },
    {
      name: 'left_mul_hom',
      type: '(G -> G -> G) -> o',
      note: '「g ↦ L_g 是群同态」的原子谓词。**未展开**。',
      expansion: '∀(g:G)(h:G). L_g ∘ L_h = L_{gh}（本站写成逐点形式，见 formal:group:left-mul 的 statement）',
      source: 'data/cases/04-group.md「Cayley 定理」概括证明',
      scope: '只作为待证义务登记：本站在 group:left-mul 里登记的只是**复合等式的条件形式**，不是同态结论。',
    },
    {
      name: 'perm_subgroup',
      type: '(G -> G -> G) -> G -> (G -> G) -> o',
      note: '「像是 Perm(G) 的一个子群」的原子谓词。**未展开**。',
      expansion: '（需要先编码置换群 Perm(G) 与子群接口；两者都不在本背景里）',
      source: 'data/cases/04-group.md「Cayley 定理」概括证明末尾',
      scope: '只作为待证义务登记。它**不是**"Cayley 定理"的替身符号：Cayley 的三段义务'
        + '（left_mul_bijective / left_mul_hom / perm_subgroup）各自独立登记，谁也没被假定为真。',
    },
  ],
  definitions: [
    {
      name: 'left_mul',
      type: '(G -> G -> G) -> G -> G -> G',
      source: 'λ(mm:G -> G -> G). λ(gg:G). λ(xx:G). mm(gg)(xx)',
      note: '左乘映射 L_g(x) = g·x 的透明缩写。',
      origin: 'data/cases/04-group.md「左乘映射」（第 74–80 行）',
    },
  ],
  /*
   * ## 公理集：**只有定义性公理**
   *
   * Lead 2026-10-04 裁决：把谓词 `expansion` 里**已经写下的含义**从注释升成公式。
   * 这不是"把待证结论塞进公理"——被 stipulate 的是背景**自己未解释谓词**的定义，
   * 四案例的目标命题（Cayley、最大图册、张量同构……）一条都没有进来。
   * 代价是这些式子会进 `theory_sha256`，所以每条的 `origin` 都必须能追溯到
   * 对应的 `expansion` 与原稿原句（测试逐条核对）。
   *
   * **群公理本身仍然是模板**（见 schemas），没有被注入：
   * 注入它们等于让背景预先假定"G 是一个群"，而具体结构是不是群，
   * 由有限求值器逐格核对或由 spec 把某条律写成显式假设。
   *
   * 为什么每个载体各出两条：kernel 是单态的，`all_e` 只能填项、不能填类型。
   */
  axioms: GROUP_CARRIERS.flatMap((carrier) => {
    const suffix = carrier === 'G' ? '' : `-${carrier}`;
    const groupPredicate = carrier === 'G' ? 'group_concept' : `group_concept_${carrier}`;
    const abelianPredicate = carrier === 'G' ? 'abelian_group' : `abelian_group_${carrier}`;
    const groupExpansion = groupConceptExpansion(carrier);
    const abelianExpansion = abelianGroupExpansion(carrier, groupPredicate);
    return [
      {
        id: `bg-group-concept-expansion${suffix}`,
        formula: definitionalAxiom(carrier, groupPredicate, groupExpansion),
        kind: 'definitional',
        status: 'background-assumed',
        origin: {
          predicate: groupPredicate,
          carrier,
          params: [
            { name: 'mm', type: `${carrier} -> ${carrier} -> ${carrier}` },
            { name: 'ee', type: carrier },
            { name: 'ii', type: `${carrier} -> ${carrier}` },
          ],
          expansion: groupExpansion,
          registration: `core/formal/backgrounds.mjs#BG_GROUP.constants[${groupPredicate}].expansion`,
          caseQuote: 'data/cases/04-group.md「群」：群是把"可以互相抵消的对称操作"压缩成四条规则：闭合、结合、单位、逆。',
        },
        note: '把 expansion 升成公式。**只定义谓词的含义**：它不声称任何具体结构是群。',
      },
      {
        id: `bg-abelian-group-expansion${suffix}`,
        formula: definitionalAxiom(carrier, abelianPredicate, abelianExpansion),
        kind: 'definitional',
        status: 'background-assumed',
        origin: {
          predicate: abelianPredicate,
          carrier,
          params: [
            { name: 'mm', type: `${carrier} -> ${carrier} -> ${carrier}` },
            { name: 'ee', type: carrier },
            { name: 'ii', type: `${carrier} -> ${carrier}` },
          ],
          expansion: abelianExpansion,
          registration: `core/formal/backgrounds.mjs#BG_GROUP.constants[${abelianPredicate}].expansion`,
          caseQuote: 'data/cases/04-group.md「群」逐条件反例段：交换律不属于群定义：模 5 乘法交换，但 S3 不交换。',
        },
        note: '阿贝尔群 ≜ 群 ∧ 交换。这条同时给出 `abelian ⇒ group`（合取消去）与'
          + '「群 ∧ 交换 ⇒ abelian」（合取引入）两个方向——`⇔` 在 §1.3 里就是这样展开的。',
      },
    ];
  }),
  schemas: [
    {
      id: 'group-assoc',
      name: 'group_axiom',
      args: ['assoc'],
      params: [{ name: 'mm', type: 'G -> G -> G' }],
      template: '∀(a0:G)(b0:G)(c0:G). mm(mm(a0)(b0))(c0) = mm(a0)(mm(b0)(c0))',
      note: '结合律模板。原稿「删去结合律，左乘映射的复合等式 L_g∘L_h=L_{gh} 失效」。',
    },
    {
      id: 'group-identity',
      name: 'group_axiom',
      args: ['identity'],
      params: [
        { name: 'mm', type: 'G -> G -> G' },
        { name: 'ee', type: 'G' },
      ],
      template: '∀(a0:G). (mm(a0)(ee) = a0 ∧ mm(ee)(a0) = a0)',
      note: '单位律模板。原稿「只保留右单位，Cayley 的单射步骤缺条件」——单侧与双侧的差别是实质的。',
    },
    {
      id: 'group-inverse',
      name: 'group_axiom',
      args: ['inverse'],
      params: [
        { name: 'mm', type: 'G -> G -> G' },
        { name: 'ee', type: 'G' },
        { name: 'ii', type: 'G -> G' },
      ],
      template: '∀(a0:G). (mm(a0)(ii(a0)) = ee ∧ mm(ii(a0))(a0) = ee)',
      note: '逆元律模板。',
    },
    {
      id: 'group-closure',
      name: 'group_axiom',
      args: ['closure'],
      params: [],
      template: null,
      note: '封闭性已含在 mm : G -> G -> G 的**类型**里，不另立公式——原稿也把它列在四条里，这里说明它为什么没有独立模板。',
    },
  ],
  boundary: [
    '**群公理不以公理形式注入**：它们是 schemas 里的模板，由具体结构逐项检查（有限对象走 §2.12，一般情形走 spec 的显式假设）。',
    '本背景不声称任何具体结构是群；group:units5 与 S3 的完整运算表在 data/formal/instances.mjs。',
    '**不声称完整 Cayley 定理已机器认证**：三段义务各自登记为未展开的原子谓词，机器证书目前只覆盖单射步骤。',
    '同态基本定理、自由群、群分类都不在本站范围内（data/cases/background.mjs 的 bg:group:binary 边界）。',
  ],
  source: 'data/cases/04-group.md 全篇；data/manifest.mjs#theory.modules 的 M_group_axioms（status: background-assumed）',
};

/* ========================================================================== *
 * bg:manifold/1 —— 图册、过渡映射、C^k
 * ========================================================================== */

const MANIFOLD = {
  id: BG_MANIFOLD,
  version: BACKGROUND_VERSION,
  title: '流形：图册、过渡映射与 C^k 正则性',
  note:
    '本背景**不注入任何几何公理**。原稿把开集、限制域、图册覆盖、正则性、链式法则'
    + '全部标为「剩余义务」，所以这里九个谓词/常量都是原子的，'
    + '它们的本意写法在 expansion 里，能解释到哪里在 scope 里。',
  bases: [
    { name: 'o', note: '真值类型' },
    { name: 'Set', note: '集合排序（流形载体、重叠域的载体）' },
    { name: 'Atlas', note: '图册排序' },
    { name: 'Chart', note: '坐标图排序' },
    { name: 'Map', note: '映射排序（过渡映射、坐标变换）' },
    { name: 'N', note: '自然数排序名（用来放 k）' },
    { name: 'R', note: '实数排序名（R^n 的那个 R）' },
    { name: 'S', note: '两个排序上的总函数模拟里的第一个载体（原稿「两个排序上的总函数模拟一张已固定图的两个载体」）' },
    { name: 'T', note: '两个排序上的总函数模拟里的第二个载体' },
  ],
  constants: [
    { name: 'carrier', type: 'Atlas -> Set', note: '图册覆盖的空间载体。原子常量；不展开。' },
    {
      name: 'trans',
      type: 'Chart -> Chart -> Map',
      note: '过渡映射 ψ∘φ^{-1}。**原子常量**：不展开为 comp(inv(φ))(ψ)。',
      source: 'data/cases/02-manifold.md「过渡映射」（第 19–29 行）',
      scope: '定义域是 φ(U∩V) 而不是整个 R^n——这一条只在 scope 里声明，没有被类型编码。',
    },
    {
      name: 'is_ck',
      type: 'Map -> N -> o',
      note: '映射的 C^k 正则性。原子谓词。',
      source: 'data/cases/02-manifold.md「C^k 图册」（第 31–39 行）',
      scope: 'k≥1 的算术条件未编码（本背景没有实数序结构），只能靠登记时的文字条件说明。',
    },
    {
      name: 'smooth',
      type: 'Map -> o',
      note: '映射的 C^∞（任意阶导数存在且连续）。原子谓词。',
      source: 'data/cases/02-manifold.md「光滑图册」（第 41–49 行）',
      scope: 'smooth 与 is_ck(·)(k) **不是同一个条件**：原稿 C¹ 非 C² 的例子专门纠正这一点。',
    },
    {
      name: 'covers',
      type: 'Atlas -> Set -> o',
      note: '覆盖：图册的图定义域之并等于载体。原子谓词。',
      source: 'data/cases/02-manifold.md「图、图册与覆盖」（第 11–17 行）',
      scope: '不要求有限、不要求图互不相交（原稿「边界」原话）。',
    },
    {
      name: 'is_atlas',
      type: 'Atlas -> Set -> o',
      note: '图册：覆盖 + 每张图的坐标是同胚到 R^n 的开集。原子谓词。',
      expansion: 'covers(A)(M) ∧ 每张图 (U,φ) 的 φ 是同胚到 R^n 中开集',
      source: 'data/cases/02-manifold.md「图、图册与覆盖」',
      scope: 'Hausdorff、第二可数、维数唯一性都不在本谓词内（原稿「拓扑流形」边界）。',
    },
    {
      name: 'ck_atlas',
      type: 'Atlas -> N -> o',
      note: 'C^k 图册。原子谓词；它的可写展开被登记在 formal:manifold:ck-atlas 的 statement 里。',
      expansionKind: 'formula',
      expansion: '(is_atlas(AA)(carrier(AA)) ∧ ∀(phi:Chart)(psi:Chart). is_ck(trans(phi)(psi))(kk))',
      axiomId: 'bg-ck-atlas-expansion',
      source: 'data/cases/02-manifold.md「C^k 图册」条件段（k≥1，并且每个重叠域上的两个方向过渡映射都 C^k——「并且」把图册条件当既有前提）',
      scope: 'k≥1、C^0 不能定义切空间、C^k 与 C^∞ 不是同一条件——三条都只在文字里，不在类型里。',
    },
    {
      name: 'smooth_atlas',
      type: 'Atlas -> o',
      note: '光滑图册。原子谓词。',
      expansionKind: 'formula',
      expansion: '(is_atlas(AA)(carrier(AA)) ∧ ∀(phi:Chart)(psi:Chart). smooth(trans(phi)(psi)))',
      axiomId: 'bg-smooth-atlas-expansion',
      source: 'data/cases/02-manifold.md「光滑图册」（节点名就是图册，主体与 C^k 图册同构）',
      scope: '「图册性质」与「底空间性质」必须分开（原稿否定范围）；本谓词只说图册。',
    },
    {
      name: 'compatible_k',
      type: 'Atlas -> Atlas -> N -> o',
      note: '两份图册 C^k 兼容（并仍是 C^k 图册）。原子谓词。',
      source: 'data/cases/02-manifold.md「C^k 兼容」（第 51–57 行）',
      scope: '相容关系不是图册相等；只检查册内过渡会漏掉真正的兼容性问题（原稿检查清单）。',
    },
    {
      name: 'max_ext',
      type: 'Atlas -> Atlas',
      note: '最大 C^k 兼容扩张 A_max。原子常量：**存在性与最大性都未认证**。',
      expansion: '（原稿给出自然语言概括证明：覆盖 → 新增图之间的局部复合 → 正则性的局部性 → 最大性）',
      source: 'data/cases/02-manifold.md「最大 C^k 兼容扩张」与「最大扩张是 C^k 图册且最大」',
      scope: '依赖链式法则与 C^k 复合封闭性；两者都在 bg:manifold:calc 里声明为背景（background-assumed），没有形式化。',
    },
    {
      name: 'maximal_ck',
      type: 'Atlas -> Atlas -> o',
      note: '「前者是按包含关系最大的 C^k 图册扩张」的原子谓词。',
      source: 'data/cases/02-manifold.md「最大扩张是 C^k 图册且最大」命题段',
      scope: '不展开为包含关系与全称条件；只作为 formal:manifold:claim-max 的待证目标。',
    },
  ],
  definitions: [],
  /*
   * 两条**定义性公理**（Lead 2026-10-04 裁决）：把 `ck_atlas` / `smooth_atlas` 的
   * `expansion` 升成公式。原稿「条件」段用「并且」把图册条件当作既有前提
   * （「C^k 图册」这个名字本身就含"图册"），所以展开是 `is_atlas ∧ 过渡正则`。
   *
   * **`smooth ⇒ is_ck(·)(k)` 没有写进来**：那不是定义展开，而是关于导数阶的**数学事实**
   * （"所有阶导数存在"⇒"前 k 阶存在"）。把它 stipulate 下来就等于把一条定理当公理，
   * 超出"只许背景概念谓词之间的定义性关系"这条界线。因此
   * `rel:manifold:ck-atlas-generalizes-smooth-atlas` 仍保持 unverified，
   * 原因记在它的 `missingObligations` / `proofAttempt` 里。
   */
  axioms: [
    {
      id: 'bg-ck-atlas-expansion',
      formula: '∀(AA:Atlas)(kk:N). (ck_atlas(AA)(kk) ⇔ (is_atlas(AA)(carrier(AA)) ∧ ∀(phi:Chart)(psi:Chart). is_ck(trans(phi)(psi))(kk)))',
      kind: 'definitional',
      status: 'background-assumed',
      origin: {
        predicate: 'ck_atlas',
        carrier: null,
        params: [{ name: 'AA', type: 'Atlas' }, { name: 'kk', type: 'N' }],
        expansion: '(is_atlas(AA)(carrier(AA)) ∧ ∀(phi:Chart)(psi:Chart). is_ck(trans(phi)(psi))(kk))',
        registration: 'core/formal/backgrounds.mjs#BG_MANIFOLD.constants[ck_atlas].expansion',
        caseQuote: 'data/cases/02-manifold.md「C^k 图册」条件段：k≥1，并且每个重叠域上的两个方向过渡映射都 C^k。',
      },
      note: '这条让 `ck_atlas ⇒ is_atlas` 可证（合取消去 + 定义展开），'
        + '也就是 rel:manifold:chart-atlas-generalizes-ck-atlas 的方向。',
    },
    {
      id: 'bg-smooth-atlas-expansion',
      formula: '∀(AA:Atlas). (smooth_atlas(AA) ⇔ (is_atlas(AA)(carrier(AA)) ∧ ∀(phi:Chart)(psi:Chart). smooth(trans(phi)(psi))))',
      kind: 'definitional',
      status: 'background-assumed',
      origin: {
        predicate: 'smooth_atlas',
        carrier: null,
        params: [{ name: 'AA', type: 'Atlas' }],
        expansion: '(is_atlas(AA)(carrier(AA)) ∧ ∀(phi:Chart)(psi:Chart). smooth(trans(phi)(psi)))',
        registration: 'core/formal/backgrounds.mjs#BG_MANIFOLD.constants[smooth_atlas].expansion',
        caseQuote: 'data/cases/02-manifold.md「光滑图册」：所有过渡映射都有任意阶导数。',
      },
      note: '只定义谓词含义。它**不**蕴含 `ck_atlas`：那一步需要 smooth ⇒ is_ck（未编码）。',
    },
  ],
  schemas: [
    {
      id: 'manifold-ck-atlas-expansion',
      name: 'atomic-expansion',
      args: ['ck_atlas'],
      params: [
        { name: 'AA', type: 'Atlas' },
        { name: 'kk', type: 'N' },
      ],
      template: '∀(phi:Chart)(psi:Chart). is_ck(trans(phi)(psi))(kk)',
      note: 'ck_atlas 的本意写法。核对用模板，不注入为公理。',
    },
    {
      id: 'manifold-smooth-atlas-expansion',
      name: 'atomic-expansion',
      args: ['smooth_atlas'],
      params: [{ name: 'AA', type: 'Atlas' }],
      template: '∀(phi:Chart)(psi:Chart). smooth(trans(phi)(psi))',
      note: 'smooth_atlas 的本意写法。同样只用于核对。',
    },
  ],
  boundary: [
    '**不认证最大图册**：max_ext 的存在性与最大性都只是原子常量/谓词，原稿的证明是自然语言。',
    '**不认证链式法则**：它连同 C^k 复合封闭性都在 data/cases/background.mjs 的 bg:manifold:calc 里标为 background-assumed。',
    '**不给任意全局定义域结论**：过渡映射只在 φ(U∩V) 上有定义；开集、限制域、覆盖条件都没有被类型编码。',
    '光滑化定理、Milnor 怪球、第二可数性都不在本站范围内。',
  ],
  source: 'data/cases/02-manifold.md 全篇（拓扑流形 / 图册与覆盖 / 过渡映射 / C^k 图册 / 光滑图册 / 兼容 / 最大扩张 / 例子 / 同图过渡取值）',
};

/* ========================================================================== *
 * bg:tensor/1 —— 可加、线性、秩一
 * ========================================================================== */

const TENSOR = {
  id: BG_TENSOR,
  version: BACKGROUND_VERSION,
  title: '张量：可加、线性与秩一映射',
  note:
    '可加 / 线性 / 多重线性 / 秩一 四个谓词都是原子的。'
    + '本背景只注入一条内容公理（标量对加法分配），因为原稿明言它在证书里就是'
    + '「闭理论公理」；其余向量空间公理原稿明确说「不被宣称独立必要」，所以不注入。',
  bases: [
    { name: 'o', note: '真值类型' },
    { name: 'F', note: '基域排序名' },
    { name: 'V', note: '向量排序名（载体的元素）' },
    { name: 'Vt', note: '张量空间的元素（v⊗α 及其有限和）' },
    { name: 'VS', note: '向量空间对象本身的排序名（V、V*、V^{⊗r} 都是它的元素）' },
    { name: 'N', note: '自然数排序名（r、s 与维数）' },
    { name: 'Arr', note: '带上下指标的数组（Christoffel 系数一类的候选对象）' },
  ],
  constants: [
    { name: 'add', type: 'V -> V -> V', note: '向量加法（符号；只有分配律那条被断言）。' },
    { name: 'addF', type: 'F -> F -> F', note: '域加法。' },
    { name: 'smul', type: 'F -> V -> V', note: '标量作用。' },
    { name: 'zeroV', type: 'V', note: '零向量。' },
    { name: 'vt', type: 'VS', note: '一般向量空间对象（用于 ts / tpow / tprod 的下标）。' },
    { name: 'tstar', type: 'VS -> VS', note: '对偶空间 V* = Hom(V,F)。原子常量。' },
    { name: 'tpow', type: 'VS -> N -> VS', note: '张量幂 V^{⊗r}。原子常量。' },
    { name: 'tprod', type: 'VS -> VS -> VS', note: '张量积 ⊗。原子常量。' },
    {
      name: 'ts',
      type: 'VS -> N -> N -> VS',
      note: '(r,s) 型张量空间 T^r_s(V)。原子常量。',
      expansion: 'ts(v)(r)(s) = tprod(tpow(v)(r))(tpow(tstar(v))(s))',
      source: 'data/cases/03-tensor.md「(r,s) 型张量空间」（第 21–28 行）',
      scope: 'r、s 有限；零重张量积约定为基域 F **没有编码**（本背景没有 F 作为 VS 元素的常量）。',
    },
    {
      name: 'tensor_of',
      type: 'V -> (V -> F) -> Vt',
      note: 'v ⊗ α ∈ V⊗V*。原子常量。',
      source: 'data/cases/03-tensor.md「张量与线性算子的同构」定义段',
      scope: '只登记这个记号；张量积的通用性质**没有**被编码（原稿「边界」：任意双线性映射不能经线性映射分解）。',
    },
    {
      name: 'Phi',
      type: 'Vt -> V -> V',
      note: 'Φ(v⊗α)(w) = α(w)v 诱导的线性映射。原子常量（不是定义：通用性质未编码）。',
      source: 'data/cases/03-tensor.md「张量与线性算子的同构」',
      scope: '「没有选基」这一点只在文字里；本背景不编码基与有限维双射。',
    },
    {
      name: 'is_iso',
      type: '(Vt -> V -> V) -> o',
      note: '「这个映射是同构」的原子谓词。',
      source: 'data/cases/03-tensor.md「张量与线性算子的同构」证明段',
      scope: '有限维在满射性处实质使用（原稿删条件反例）；本谓词不区分有限维与无限维。',
    },
    {
      name: 'finite_dim',
      type: 'VS -> o',
      note: '有限维谓词。原子。',
      source: 'data/cases/03-tensor.md「无限维恒等算子反例」',
      scope: '维数计数与基的存在性都没有编码（data/manifest.mjs 的 M_linear 是 background-assumed）。',
    },
    {
      name: 'indexed',
      type: 'Arr -> o',
      note: '「这个数组带上下指标」的原子谓词。',
      source: 'data/cases/03-tensor.md「误区：所有指标数组都是张量」',
      scope: '只描述外形，不涉及变换行为。',
    },
    {
      name: 'transforms_as_tensor',
      type: 'Arr -> o',
      note: '「这个数组按张量换基规律变换」的原子谓词。',
      source: 'data/cases/03-tensor.md「换基规律」关键区分段',
      scope: '变换律本身没有编码（需要坐标变换与 A、A^{-1}）；本谓词只作为被检验/被反驳的候选出现。',
    },
    {
      name: 'additive',
      type: '(V -> V) -> o',
      note: '映射保持加法：additive(T) ⇔ ∀x y. T(add(x)(y)) = add(T(x))(T(y))。原子谓词。',
      expansionKind: 'formula',
      expansion: '∀(x0:V)(y0:V). TT(add(x0)(y0)) = add(TT(x0))(TT(y0))',
      axiomId: 'bg-additive-expansion',
      source: 'data/cases/03-tensor.md「秩一映射保持加法」',
      scope: '**只有可加性**，不含标量齐性。原稿边界：可加性不升级为完整线性。',
    },
    {
      name: 'linear_map',
      type: '(V -> V) -> o',
      note: '线性映射：可加 ∧ 标量齐性。原子谓词。',
      expansionKind: 'formula',
      expansion: '(additive(TT) ∧ ∀(c0:F)(x0:V). TT(smul(c0)(x0)) = smul(c0)(TT(x0)))',
      axiomId: 'bg-linear-map-expansion',
      source: 'data/cases/03-tensor.md「多重线性函数」与「秩一映射保持加法」',
      scope: 'linear_map ⇒ additive 是特化方向（见 registry.mjs 的 CONCEPT_SPECS#concept:tensor:linear 与 CONCEPT_RELATIONS）；反向不成立。',
    },
    {
      name: 'multilinear',
      type: '(V -> V -> F) -> o',
      note: '多重线性：固定其余变量后对每一个变量分别线性。原子谓词。',
      expansion: '对每个槽位分别 additive 且标量齐性（两个槽位都要，不能只做第一个）',
      source: 'data/cases/03-tensor.md「多重线性函数」',
      scope: '原稿原话：「只对第一个变量线性不足以推出多线性」。本谓词不展开，方向性由 registry 登记。',
    },
    {
      name: 'rank1',
      type: '(V -> V) -> o',
      note: '秩一映射（形如 R(x) = α(x)v）。原子谓词。',
      expansion: '∃(alpha:V -> F)(v0:V). ∀(x0:V). TT(x0) = smul(alpha(x0))(v0)',
      source: 'data/cases/03-tensor.md「秩一映射保持加法」机器认证范围段',
      scope: '只登记外形；具体的 R1 由 spec 用 definitions 写出来（透明缩写），不走本谓词。',
    },
  ],
  definitions: [],
  axioms: [
    {
      id: 'bg-smul-distributive-add',
      formula: '∀(c:F)(u:V)(v:V). smul(c)(add(u)(v)) = add(smul(c)(u))(smul(c)(v))',
      kind: 'structural',
      status: 'background-assumed',
      source: 'data/cases/03-tensor.md「秩一加法证书」（「标量分配律作为闭理论公理」）',
      note:
        '这是本背景唯一的内容公理，来源是原稿对证书的直接描述。'
        + '原稿同时写明：「本片段不需要域的全部公理；其余向量空间公理不被宣称独立必要」——'
        + '因此加法交换、加法结合、smul 单位元等**都故意不注入**。',
    },
    /*
     * 两条**定义性公理**（Lead 2026-10-04 裁决）：把 `additive` / `linear_map` 的
     * `expansion` 升成公式。它们只管"谓词是什么意思"，不声称任何具体映射是线性的。
     * `linear_map` 的展开里含 `additive`，于是 `linear ⇒ additive` 变成一次合取消去。
     */
    {
      id: 'bg-additive-expansion',
      formula: '∀(TT:V -> V). (additive(TT) ⇔ ∀(x0:V)(y0:V). TT(add(x0)(y0)) = add(TT(x0))(TT(y0)))',
      kind: 'definitional',
      status: 'background-assumed',
      origin: {
        predicate: 'additive',
        carrier: 'V',
        params: [{ name: 'TT', type: 'V -> V' }],
        expansion: '∀(x0:V)(y0:V). TT(add(x0)(y0)) = add(TT(x0))(TT(y0))',
        registration: 'core/formal/backgrounds.mjs#BG_TENSOR.constants[additive].expansion',
        caseQuote: 'data/cases/03-tensor.md「秩一映射保持加法」：α 保持加法。',
      },
      note: '只定义"保持加法"是什么意思；**不含**标量齐性（原稿边界：可加性不升级为完整线性）。',
    },
    {
      id: 'bg-linear-map-expansion',
      formula: '∀(TT:V -> V). (linear_map(TT) ⇔ (additive(TT) ∧ ∀(c0:F)(x0:V). TT(smul(c0)(x0)) = smul(c0)(TT(x0))))',
      kind: 'definitional',
      status: 'background-assumed',
      origin: {
        predicate: 'linear_map',
        carrier: 'V',
        params: [{ name: 'TT', type: 'V -> V' }],
        expansion: '(additive(TT) ∧ ∀(c0:F)(x0:V). TT(smul(c0)(x0)) = smul(c0)(TT(x0)))',
        registration: 'core/formal/backgrounds.mjs#BG_TENSOR.constants[linear_map].expansion',
        caseQuote: 'data/cases/03-tensor.md「多重线性函数」：固定其余变量后，对每一个变量分别线性。',
      },
      note: '线性 ≜ 可加 ∧ 标量齐性。同时给出 `linear ⇒ additive` 与反向的合取引入，'
        + '正是 CONCEPT_RELATIONS 里 rel:concept:linear-refines-additive 需要的两个方向。',
    },
  ],
  schemas: [
    {
      id: 'tensor-rank1-additive-goal',
      name: 'goal-shape',
      args: ['rank1_additive'],
      params: [
        { name: 'RR', type: 'V -> V' },
        { name: 'xx', type: 'V' },
        { name: 'yy', type: 'V' },
      ],
      template: 'RR(add(xx)(yy)) = add(RR(xx))(RR(yy))',
      note: '秩一可加性的目标形状。生成器只把它当目标，不允许当公理取用。',
    },
  ],
  boundary: [
    '**不把可加性升级为完整线性**：标量齐性未被认证，也没有被假定。',
    '**不声称张量同构已认证**：Φ 的满射性依赖有限维与基，两者都在本站背景里没有形式化。',
    '张量积的通用性质、坐标变换律、丛与截面都未编码（原稿各节点的「剩余义务」）。',
    'Christoffel 系数反例与无限维恒等算子反例都是自然语言论证，不是机器证书。',
  ],
  source: 'data/cases/03-tensor.md 全篇（对偶 / 张量积 / (r,s) / 多重线性 / 换基 / 同构 / 秩一可加 / 反例）',
};

/* ========================================================================== *
 * 装配与查询
 * ========================================================================== */

const ALL = [ALGEBRA, GROUP, LIMIT, MANIFOLD, TENSOR];

const BY_ID = new Map(ALL.map((bg) => [bg.id, bg]));

function resolveId(id) {
  if (typeof id !== 'string' || id.length === 0) return DEFAULT_BACKGROUND;
  return BG_ALIASES.get(id) ?? id;
}

/** 全部背景 id（不含别名）。 */
export const BACKGROUND_IDS = ALL.map((bg) => bg.id);

/** 别名表（`bg:core/1` → `bg:algebra/1`）。 */
export const BACKGROUND_ALIASES = Object.freeze({ [BG_CORE]: BG_ALGEBRA });

/** 这个背景 id（含别名）是否已登记。 */
export function hasBackground(id) {
  return BY_ID.has(resolveId(id));
}

/**
 * 返回完整背景理论：`{ id, version, bases, constants, axioms, definitions, schemas }`。
 *
 * 未登记的 id 或版本不匹配一律返回 `null`——不抛异常、也不返回一份"看起来能用"的空理论：
 * §2.10 的目标核对要求理论 id/版本/哈希逐条对得上，静默兜底会让核对失去意义。
 */
export function backgroundTheory(id, version) {
  const bg = BY_ID.get(resolveId(id));
  if (!bg) return null;
  const want = version === undefined || version === null ? BACKGROUND_VERSION : String(version);
  if (bg.version !== want) return null;
  // 浅拷贝顶层数组，避免调用方 push 污染登记表；元素本身是只读数据，不再深拷。
  return {
    id: bg.id,
    version: bg.version,
    title: bg.title,
    note: bg.note,
    bases: [...bg.bases],
    constants: bg.constants.map((item) => ({ ...item })),
    definitions: bg.definitions.map((item) => ({ ...item })),
    axioms: bg.axioms.map((item) => ({ ...item })),
    schemas: bg.schemas.map((item) => ({ ...item })),
    forbidden: (bg.forbidden ?? []).map((item) => ({ ...item })),
    boundary: [...bg.boundary],
    source: bg.source,
  };
}

/**
 * `server/api.mjs` 的 `/api/v2/formal/catalog` 直接读这个函数的返回值
 * （形状对齐 `shared/formal.d.ts#FormalCatalog.backgrounds`）。
 */
export function listBackgrounds() {
  return ALL.map((bg) => ({
    id: bg.id,
    version: bg.version,
    title: bg.title,
    note: bg.note,
    constants: bg.constants.map(({ name, type, note }) => ({ name, type, note })),
    symbols: [
      ...bg.constants.map(({ name, type, note }) => ({ symbol: name, type, note })),
      ...bg.definitions.map(({ name, type, note, source }) => ({
        symbol: name,
        type,
        note: note ?? `透明缩写：${source}`,
      })),
    ],
    bases: bg.bases.map(({ name, note }) => ({ name, note })),
    predicates: bg.constants
      .filter((item) => typeof item.expansion === 'string' || typeof item.scope === 'string')
      .map(({ name, type, expansion, source, scope }) => ({ name, type, expansion, source, scope })),
    boundary: [...bg.boundary],
  }));
}

/** 背景里登记的原子谓词（带 expansion / source / scope 的那些）。 */
export function backgroundPredicates(id) {
  const bg = BY_ID.get(resolveId(id));
  if (!bg) return [];
  return bg.constants
    .filter((item) => typeof item.expansion === 'string' || typeof item.scope === 'string')
    .map((item) => ({ ...item }));
}

/** 背景里的全部名字 → 类型，供解析上下文（`ctx.constants`）使用。 */
export function backgroundSignature(id) {
  const bg = BY_ID.get(resolveId(id));
  if (!bg) return { bases: [], constants: {} };
  const constants = {};
  for (const item of bg.constants) constants[item.name] = item.type;
  for (const item of bg.definitions) constants[item.name] = item.type;
  return { bases: bg.bases.map((item) => item.name), constants };
}

/** 别名归一：`bg:core/1` → `bg:algebra/1`；其它 id 原样返回。 */
export function normalizeBackgroundId(id) {
  return resolveId(id);
}

/** 公理的 `kind` 只允许这三种（测试核对）。 */
export const AXIOM_KINDS = Object.freeze(['logic', 'definitional', 'structural']);

/**
 * 把背景公理转成 `theory.buildKernelTheory(specs, { axioms })` 认的形状。
 *
 * 为什么要这个函数：`buildKernelTheory` **不会**自动把背景对象的 `axioms` 收进去
 * （那一步是 caller 的显式承诺——只有真要 commit 的才进 `theory_sha256`）。
 * lang-layer 的实现收 `{ id, source }` 文本形式（内部 `parseFormula`），
 * 所以这里把 `formula` 映射成 `source`，并保留 `kind` / `origin` 供审计。
 *
 * `kinds` 缺省给**定义性 + 结构性**两类：
 * - 逻辑公理仍然排除（它们由语言层按 `h_axiom` 模式现场重建，收进来会变成第二份口径）；
 * - 结构性的**内容公理**必须给。它们已经登记为 `status:'background-assumed'`，
 *   而且是这个背景对世界唯一的实质承诺（`bg:limit/1` 只有 `bg-distance-zero` 一条）。
 *   早先缺省只给定义性，后果不是"少一条可选公理"，而是**这类背景的命题根本证不出来**：
 *   「常值序列收敛」的 ε–N 证明必须用 `d(a,a) = zero`，而那正是结构公理
 *   （实测：缺它时 90 秒 / 40 万状态仍是 undecided）。要不要用由证书自己决定——
 *   用了就写进 `theory_sha256` 与 `dependencies`，不用就与它无关。
 */
export function backgroundAxiomsForKernel(id, { kinds = ['definitional', 'structural'] } = {}) {
  const bg = BY_ID.get(resolveId(id));
  if (!bg) return [];
  const wanted = new Set(kinds);
  return bg.axioms
    .filter((axiom) => wanted.has(axiom.kind))
    .map((axiom) => ({
      id: axiom.id,
      source: axiom.formula,
      kind: axiom.kind,
      status: axiom.status,
      origin: axiom.origin ? { ...axiom.origin } : null,
    }));
}

/** 背景定义的**源码**形状（`{name, type, source}`）；解析成规范项由语言层负责。 */
export function backgroundDefinitions(id) {
  const bg = BY_ID.get(resolveId(id));
  if (!bg) return [];
  return bg.definitions.map((item) => ({ ...item }));
}
