/**
 * 案例 10：笔记库（`MCS_vault/notes`）按类型模版写成的节点。
 *
 * 与其它案例的分工：这里收的是**仓库内笔记**（Obsidian 库）导入的节点，
 * 正文由 `scripts/build-vault-case.mjs` 从笔记生成到 `data/cases/10-vault-analysis.md`；
 * 本文件只登记结构——学科、形式负载、教学字段、契约与关系。
 *
 * 证据纪律（与 dg 案例同一条，理由也一样）：
 * - 正文是笔记，没有机器证书。凡笔记自己给了自然语言证明的，登记为 `prose-proof` + `PROOF` +
 *   `checkStatus: not_run`，并在 `obligations` 里写明「未编码为 ND 证书」；
 * - 只在笔记确实写了证明/反例的地方登记，不给「读过一遍」签发任何结论。
 *
 * 出身与学科分开：`case: 'vault'` 说出身（笔记库），`discipline: '分析'` 说知识的本质领域。
 */
import {
  concept, action, input, output, relation, evidence, support,
  representation, selfCheck, condition,
} from '../authoring.mjs';

const discipline = '分析';

const NOTE = 'MCS_vault/notes/Analysis/方向导数.md';
const provenance = {
  sources: [NOTE],
  note: '正文为该笔记的导入版本（标题层级归一化、wiki 链接重写；数学内容未改写）。'
    + '笔记自带的证据标签（DEF / PROOF / ILLUSTRATION / FINITE / NOT-CLAIMED）与「未核验」声明随正文一并保留。',
};

/** 契约见证：与 top / dg 案例同一口径——只声称输入输出与定义、正文一致，不声称充要。 */
const SPECIFIED = {
  type: 'declared-contract',
  status: 'DEF',
  scope: '契约声明的输入输出按节点定义与正文的一致性登记；不声称这些输入是逻辑上的充要条件。',
};

/*
 * 构造类型按本站「构造类型的登记约定」取 `Concept`（见 `tests/construct-registry.test.mjs`）：
 * **定义不作为独立节点**——它写在概念节点的 `formal.predicate` 与正文里，
 * 定义性依赖再用关系见证指出「依据在定义的哪一处」。因此这里不建 `Definition` 节点。
 */
export const vaultNodes = [
  concept('vault:directional-derivative', '方向导数', {
    discipline, case: 'vault',
    summary: '把多元函数沿一条过 x₀ 的直线压成一元函数后求导，得到沿指定方向的变化率；'
      + '它与全微分之间差的正是「关于方向的一致线性」——多元微分学里几乎所有经典反例都长在这道缝里。',
    objectType: '多元函数在一点沿指定方向的变化率',
    parameters: ['f', 'x_0', 'v'],
    predicate: 'D_v f(x_0) = lim_{t→0} (f(x_0+tv) − f(x_0))/t（极限存在且有限）',
    type: 'o',
    formal: {
      symbols: ['D_v'],
      typeEnv: { f: 'R^n -> R', x: 'R^n', v: 'R^n' },
      assumptions: ['x_0 是定义域内点，且沿 v 两侧都落在定义域内', 'v ≠ 0', '差商极限存在且有限'],
      formationWitness: '参数与谓词已按声明类型闭合：f 取值于 R，v 是 R^n 中的非零向量，谓词里的极限是一元差商的有限极限。',
      boundary: [
        '不要求 f 在 x_0 连续，也不要求可微——正文的五个反例正是这两个缺口的见证。',
        '本站只登记有限维实值情形；向量值与 Banach 空间版本（Gâteaux / Fréchet）只在正文「推广」与「升维视角」里登记接口，未在此编码。',
        '单位化（‖u‖=1）是读数约定，不是数学必要条件：D_{λv}=λD_v。',
      ],
    },
    formalStatement: {
      tex: 'D_v f(x_0)=\\lim_{t\\to 0}\\frac{f(x_0+tv)-f(x_0)}{t}',
      reading: '方向导数是差商沿直线 x_0+tv 在 t→0 时的有限极限：只沿这一条直线读变化率。',
      notation: [
        { symbol: 'D_v f(x_0)', means: 'f 在 x_0 沿方向 v 的方向导数（本节点引入的记号）' },
        { symbol: 'v', means: '方向向量，非零；单位化（‖v‖=1）只是「每单位长度」的读数约定，不是定义的必要条件' },
        { symbol: 't', means: '一元参数，可为负——所以要求 x_0 沿 v 两侧都落在定义域内，双侧极限才谈得上' },
        { symbol: 'f, x_0', means: 'f: Ω ⊂ ℝⁿ → ℝ 与 Ω 的一个内点 x_0；不要求 f 在 x_0 连续或可微' },
      ],
      label: 'DEF',
      note: 'tex 不含 $ 定界符，渲染层按行间公式处理。',
    },
    representations: [
      representation('rep-vault-dd-quotient', 'formula', '差商极限式（定义原型）', '公式', 'DEF', '沿直线取差商极限；证明存在性与构造反例都用它。'),
      representation('rep-vault-dd-one-variable', 'definition', '一元复合式', '公式', 'DEF', 'g(t)=f(x_0+tv)，则 D_v f(x_0)=g′(0)：把问题降成一元求导。'),
      representation('rep-vault-dd-slope', 'intuition', '山路坡度', '自然语言', 'ILLUSTRATION', '面朝 v 沿一条笔直的山路走，脚下的坡度；只有单位方向才等于「每单位长度」的变化率。'),
      representation('rep-vault-dd-gradient', 'formula', '可微时的内积式', '公式', 'PROOF', 'D_v f(x_0)=∇f(x_0)·v 是定理不是定义：它要求可微，反向不成立。'),
    ],
    motivation: {
      internal: [
        '一元导数是「一个数除以一个数」；到 ℝⁿ 里自变量变化是向量，差商除不下去——方向导数是最省力的修补：把 h 限制在一条直线上。',
        '偏导数绑在人为的坐标轴上，一般「沿曲线速度方向」的变化率用偏导数写不出来；复合函数求导需要一个沿任意方向的读数。',
      ],
      external: [
        '地形与导航：要问的是「沿我走的那个罗盘方向，坡度是多少」，不是东西向与南北向坡度。',
        '传热与场论：通过曲面的热流密度是法向导数 −k·∂T/∂n；绝热是 ∂T/∂n=0。',
        '优化与计算：最速下降方向、自动微分前向模式一次算出的 Jacobi 向量积 Jv，都是沿某方向的方向导数。',
      ],
      aesthetic: ['把「方向」这个自由度从导数里摘出来，再问这一族逐方向的读数能否拼成一个线性对象——能拼且关于方向一致，就是全微分。'],
      growthChain: [
        '一元导数（唯一方向）→ 偏导数（坐标轴方向）→ 方向导数（任意方向，逐方向互不通气）'
        + '→ 梯度与全微分（可微时压成一个线性映射）→ Gâteaux / Fréchet 导数与次梯度（无穷维与非光滑）。',
      ],
    },
    teaching: {
      conditions: [
        condition('x_0 沿 v 是内点', '只在边界上或只在一侧有定义', '取 Ω={y≥0}、v=(0,1)：t<0 一侧差商没有定义；畸形定义域上极限还会空洞成立', '定义失效或空真。'),
        condition('v ≠ 0', '允许零向量', 'f(x_0+t·0)−f(x_0)≡0，差商恒为 0/0', '无定义。'),
        condition('双侧极限 t→0', '改成 t→0⁺', '|x| 沿 e₁ 的单侧读数为 ±1，双侧极限不存在；D_{−v}=−D_v 这条对称性也随之丢失', '概念换成另一个：单侧方向导数。'),
        condition('只沿直线取极限（h=tv）', '改成沿任意曲线取差商', 'x²y/(x⁴+y²) 沿每条过原点的直线都趋于 0，沿抛物线 y=x² 却趋于 1/2', '定义变得接近可微性，但不再是「方向」的读数。'),
        condition('极限有限', '允许读数 ±∞', 'xy/(x²+y²) 沿非坐标方向的差商为 sin2θ/(2t)，发散', '线性与内积公式全部失效。'),
      ],
      proofOverview: '正文三条短证明共用一套动作：沿直线把多元问题压成一元（差商、中值不等式、局部极小），'
        + '再把「逐点」的信息通过连续性或线性提升为「一致」。',
      commonMisconceptions: [
        '所有方向导数存在 ⇒ 可微（甚至连续）：x³/(x²+y²) 连续却不可微；x²y/(x⁴+y²) 连连续都不满足。',
        '把 D_v f=∇f·v 当成定义：它只在可微时成立——x³/(x²+y²) 在原点 ∇f=(1,0)，而 D_u f=cos³θ。',
        '把方向导数当成「路径导数」：方向只含直线，弯曲路径不受它控制（沿 γ(t)=(t,t²) 的差商甚至发散）。',
        '以为方向导数关于方向线性：齐次不等于线性——x²y/(x⁴+y²) 的 D_v=a²/b 不满足可加性。',
        '以为沿 ±v 的读数相同：方向是向量，D_{−v}=−D_v。',
        '把 v=(3,4) 方向的 16 读成「每走 1 米变化 16」：单位化后是 3.2。',
      ],
      reviewQuestions: [
        '「方向导数存在 + 关于方向线性」仍不足以保证可微，缺的那条「一致性」在无穷维里该怎么说？',
        '如果把「直线」换成「曲线」，为什么得到的沿曲线导数在可微时反而不更强？',
        '在流形上没有 x₀+tv，「方向」靠什么承载？导子定义是唯一的选择吗？',
      ],
      selfCheck: [
        selfCheck('sc-vault-dd-1', '按定义算出 f=x²y 在 (1,2) 沿 v=(3,4) 的方向导数，并回答「每单位长度」是多少。', '按定义计算', 'vault:directional-derivative', '16；单位化方向 (3/5,4/5) 得 3.2。'),
        selfCheck('sc-vault-dd-2', '判定 f=x³y/(x⁴+y²)（补 f(0,0)=0）在原点是否可微，并给出理由。', '反例判定', 'vault:directional-derivative', '不可微：所有方向导数都是 0 且映射线性，但沿 h=(s,s²) 有 f(h)/‖h‖→1/2≠0，一致性失败。'),
        selfCheck('sc-vault-dd-3', '举一个「所有方向导数存在却不连续」的例子，并说明它打掉的是哪条直觉。', '反例构造', 'vault:directional-derivative', 'x²y/(x⁴+y²)：沿每条直线趋于 0、沿 y=x² 趋于 1/2；打掉「逐方向存在 ⇒ 连续」。'),
      ],
      evidenceStatus: 'DEF',
    },
    provenance,
  }),
];

/**
 * 一条契约：产出本节点。
 *
 * 输入取**背景节点**（多元微分、实数度量、向量空间与线性映射）——正文「前置知识 · 必备」
 * 列的正是这三样；`bg:` 节点是共享边界，按设计可以当前置的来源。
 */
export const vaultActions = [
  action(
    'a-vault:directional-derivative', 'definition', '引入方向导数',
    [
      input('bg:manifold:calc', ['statement', 'definition']),
      input('bg:real:metric', ['statement', 'definition']),
      input('bg:linear:vector', ['statement', 'definition']),
    ],
    [output('vault:directional-derivative', ['definition', 'statement'])],
    { witness: SPECIFIED },
  ),
];

/**
 * 关系：只登记正文自己写了理由的两条。
 *
 * 1. 与 dg 案例的**切向量导子定义**：正文「升维视角」写明流形上没有 x₀+tv，
 *    方向导数被内在化为满足线性与 Leibniz 律的导子 X(f)——ℝⁿ 的方向导数是它的原型。
 * 2. 与 rudin 案例的**多元函数的导数**：正文「等价表达 E2」与「证明 1」给出
 *    可微时 D_v f(x_0)=df(x_0)(v)=∇f(x_0)·v，且反向不成立（五个反例）。
 *
 * 为什么不登记硬前置：本案例目前只有一个节点，而硬前置的端点必须**共享登记案例**
 * （`tests/hard-prereq.mjs`）；笔记真正的前置（一元导数、偏导数、极限）本站尚无节点。
 * 这条缺口如实留在正文与 `provenance` 里，不靠拉一条跨案例的前置来凑。
 */
export const vaultRelations = [
  relation('rel-vault-dd-application-tangent', 'application', 'vault:directional-derivative', 'dg:tangent-vector-derivation', {
    witness: {
      type: 'prototype-generalization',
      status: 'DEF',
      scope: '正文「升维视角」第 2 条：流形上没有 x₀+tv，方向导数被内在化为导子 X(f)，Leibniz 律是 ℝⁿ 中方向导数关于乘积那条性质的代数化。',
    },
    scope: 'ℝⁿ 中沿仿射直线的读数 → 流形上满足线性与 Leibniz 律的导子；本节点在这条推广里是原型。',
    task: '把「沿方向求导」搬到没有全局线性结构的流形上。',
  }),
  relation('rel-vault-dd-proof-differential', 'application', 'rudin:several-variable-derivative', 'vault:directional-derivative', {
    witness: {
      type: 'proof-dependency',
      status: 'PROOF',
      ref: 'ev-vault-dd-differential',
      scope: '正文「证明 1」：可微时 D_v f(x_0)=df(x_0)(v)=∇f(x_0)·v。',
    },
    scope: '可微（线性化）一次性给出全部方向读数；反向不成立——这正是本节点正文五个反例的主题。',
  }),
];

/** 证据：正文自带的三条短证明与五个反例，都只到「散文证明」这一档，未编码为证书。 */
export const vaultEvidence = [
  evidence('ev-vault-dd-differential', 'prose-proof', 'PROOF', 'not_run',
    '可微时方向导数由微分给出：D_v f(x_0)=df(x_0)(v)=∇f(x_0)·v', {
      scope: '笔记「证明 1」（正文第 §证明 1 节）；两边端点是「多元函数的导数（微分）」与「方向导数」。',
      nodes: ['rudin:several-variable-derivative', 'vault:directional-derivative'],
      obligations: [
        '自然语言证明，未编码为 ND 证书；检查器未运行。',
        '反向不成立的反例（x³/(x²+y²)、x²y/(x⁴+y²)、x³y/(x⁴+y²)）在笔记里给了逐条计算，同样未形式化。',
      ],
    }),
  evidence('ev-vault-dd-note', 'prose-proof', 'DEF', 'not_run',
    '方向导数：定义、逐条条件分析与谱系（笔记导入版本）', {
      scope: '笔记「形式」与「存在性、唯一性与良定义」两节：定义、五条条件的删条件分析、L1–L5 谱系与严格性反例。',
      nodes: ['vault:directional-derivative'],
      obligations: [
        '内容为自然语言与反例，未编码为 ND 证书；本站不声称这些反例已被机器核验。',
        '笔记自带的本机数值复核（FINITE 级旁证）与「未核验」声明随正文保留，不升级为本站结论。',
      ],
    }),
];

export const vaultSupport = [
  /* 表达层支持：写得出这条定义所需的背景（正文「前置知识 · 必备」的三条）。 */
  support('sup-vault-dd-expression', 'vault:directional-derivative', 'expression', 'known', {
    set: ['bg:real:metric', 'bg:linear:vector'],
    minimal: false,
    evidence: ['ev-vault-dd-note'],
  }),
];

export const vaultClaims = [];
export const vaultPatterns = [];

export const vaultAggregates = [
  {
    id: 'agg-vault-analysis',
    kind: 'topic',
    title: '笔记库：多元微分（分析）',
    blocks: [['vault:directional-derivative']],
    note: '按「笔记 → 节点」逐篇导入，块内目前只有一篇；后续导入的笔记按学科另立话题块，不把成员关系读成必修链。',
  },
];

export const vault = {
  nodes: vaultNodes,
  actions: vaultActions,
  relations: vaultRelations,
  evidence: vaultEvidence,
  support: vaultSupport,
  claims: vaultClaims,
  patterns: vaultPatterns,
  aggregates: vaultAggregates,
};
