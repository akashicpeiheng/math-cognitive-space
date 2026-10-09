// 面向学习者的术语表（中英双语）。
// 规则：显示中文为主标签时保留原始值在 title 供核查；未登记的键回退显示原值，绝不显示空标签。
//
// 双语实现：每张表都成对写出（`zh` / `en`），取用时走 `web/src/i18n/useLabels.tsx` 的
// `useLabels()`（随语种重渲染）或显式传 `{ locale }`。**不翻译**受控词表键本身
// （`Symbol`、`hardPrereq`、`DEF`…）——它们是本体与 API 的标识，只翻译它们的显示名。
//
// **这个文件不准 import React，也不准 import 组件/i18n 目录**：它被纯 Node 测试
// 直接 import（`tests/relation-visual.test.mjs` 等），任何 React 依赖都会让那些测试
// 以 `ERR_UNSUPPORTED_DIR_IMPORT` 整体失败。钩子在 `web/src/i18n/useLabels.tsx`。

import type { Locale } from './i18n/locales';

/** 成对的显示名。 */
interface Pair { zh: string; en: string }

/** 成对表：键是受控词表键（永不翻译），值是显示名。 */
type PairedTable = Record<string, Pair>;

function pickText(value: Pair | undefined, locale: Locale, fallback: string): string {
  if (!value) return fallback;
  return value[locale] ?? value.zh;
}

/** 把成对表摊平成某一语种的普通表（给 `<option>` 这类需要 `Object.keys` 的地方用）。 */
export function tableFor(table: PairedTable, locale: Locale): Record<string, string> {
  return Object.fromEntries(Object.entries(table).map(([key, value]) => [key, pickText(value, locale, key)]));
}

export const CONSTRUCT_LABELS: PairedTable = {
  Symbol: { zh: '符号', en: 'Symbol' },
  Term: { zh: '项', en: 'Term' },
  Concept: { zh: '概念', en: 'Concept' },
  Definition: { zh: '定义', en: 'Definition' },
  Claim: { zh: '命题', en: 'Claim' },
  Proof: { zh: '证明', en: 'Proof' },
  Example: { zh: '例子', en: 'Example' },
  Counterexample: { zh: '反例', en: 'Counterexample' },
  Problem: { zh: '问题', en: 'Problem' },
  Theory: { zh: '背景理论', en: 'Background theory' },
  Construction: { zh: '构造', en: 'Construction' },
  Method: { zh: '方法', en: 'Method' },
  Representation: { zh: '表征', en: 'Representation' },
  MisconceptionPattern: { zh: '误区模式', en: 'Misconception pattern' },
};

export const ROLE_LABELS: PairedTable = {
  Concept: { zh: '概念', en: 'Concept' },
  Definition: { zh: '定义', en: 'Definition' },
  Axiom: { zh: '公理', en: 'Axiom' },
  Theorem: { zh: '定理', en: 'Theorem' },
  Property: { zh: '性质', en: 'Property' },
  Proof: { zh: '证明', en: 'Proof' },
  Example: { zh: '例子', en: 'Example' },
  Counterexample: { zh: '反例', en: 'Counterexample' },
  Problem: { zh: '问题', en: 'Problem' },
  Theory: { zh: '理论', en: 'Theory' },
  Construction: { zh: '构造', en: 'Construction' },
  GlobalMethod: { zh: '全局方法', en: 'Global method' },
  LocalMethod: { zh: '局部方法', en: 'Local method' },
};

export const RELATION_LABELS: PairedTable = {
  hardPrereq: { zh: '硬前置', en: 'Hard prerequisite' },
  hardGeneralization: { zh: '硬泛化', en: 'Hard generalization' },
  specialization: { zh: '特化', en: 'Specialization' },
  bridge: { zh: '桥接', en: 'Bridge' },
  application: { zh: '应用', en: 'Application' },
  analogy: { zh: '类比', en: 'Analogy' },
  duality: { zh: '对偶', en: 'Duality' },
  crossDomain: { zh: '跨域', en: 'Cross-domain' },
};

export const EVENT_KIND_LABELS: PairedTable = {
  view: { zh: '已读', en: 'Read' },
  hint: { zh: '用了提示', en: 'Hint used' },
  answer: { zh: '作答', en: 'Answer' },
  evaluation: { zh: '模型评价', en: 'Model evaluation' },
  mastery_estimate: { zh: '能力估计', en: 'Ability estimate' },
  confirmation: { zh: '确认可用', en: 'Confirmed usable' },
  misconception: { zh: '误区实例', en: 'Misconception instance' },
  goal: { zh: '学习目标', en: 'Learning goal' },
  note: { zh: '笔记', en: 'Note' },
  tutor_message: { zh: '辅导回复', en: 'Tutor reply' },
};

export const ACTION_MODE_LABELS: PairedTable = {
  definition: { zh: '引入定义', en: 'Introduce a definition' },
  deduction: { zh: '推导', en: 'Deduction' },
  evidence: { zh: '证据核验', en: 'Evidence check' },
  construction: { zh: '构造', en: 'Construction' },
  problem: { zh: '解题', en: 'Problem solving' },
  method: { zh: '方法应用', en: 'Method application' },
  representation: { zh: '表征', en: 'Representation' },
  task: { zh: '任务', en: 'Task' },
};

export const RESOURCE_LABELS: PairedTable = {
  statement: { zh: '陈述', en: 'Statement' },
  definition: { zh: '定义', en: 'Definition' },
  proof: { zh: '证明', en: 'Proof' },
  certificate: { zh: '证书', en: 'Certificate' },
  construction: { zh: '构造', en: 'Construction' },
  task: { zh: '任务', en: 'Task' },
  method: { zh: '方法', en: 'Method' },
  representation: { zh: '表征', en: 'Representation' },
  condition: { zh: '条件', en: 'Condition' },
  competence: { zh: '能力', en: 'Competence' },
};

export const SUPPORT_USE_LABELS: PairedTable = {
  expression: { zh: '表达', en: 'Expression' },
  proof: { zh: '证明', en: 'Proof' },
  route: { zh: '路线', en: 'Route' },
};

export const SUPPORT_STATUS_LABELS: PairedTable = {
  Known: { zh: '已知', en: 'Known' },
  Unknown: { zh: '未知', en: 'Unknown' },
  known: { zh: '已知', en: 'Known' },
  unknown: { zh: '未知', en: 'Unknown' },
};

export const REPRESENTATION_KIND_LABELS: PairedTable = {
  formula: { zh: '公式', en: 'Formula' },
  intuition: { zh: '直觉', en: 'Intuition' },
  proof: { zh: '证明', en: 'Proof' },
  example: { zh: '例子', en: 'Example' },
  definition: { zh: '定义', en: 'Definition' },
  construction: { zh: '构造', en: 'Construction' },
  counterexample: { zh: '反例', en: 'Counterexample' },
  naturalLanguage: { zh: '自然语言', en: 'Natural language' },
};

export const CASE_LABELS: PairedTable = {
  limit: { zh: '极限', en: 'Limits' },
  manifold: { zh: 'C^k 与光滑流形', en: 'C^k and smooth manifolds' },
  tensor: { zh: '张量', en: 'Tensors' },
  group: { zh: '群', en: 'Groups' },
  background: { zh: '共享背景', en: 'Shared background' },
  dg: { zh: '微分几何', en: 'Differential geometry' },
  liang: { zh: '微分几何与广义相对论（上册）', en: 'Differential geometry and general relativity, Vol. 1' },
  rudin: { zh: '数学分析原理（Rudin）', en: 'Principles of Mathematical Analysis (Rudin)' },
};

/**
 * 案例名里的数学记号。
 *
 * `CASE_LABELS` 保持**纯文本**（它出现在 `<option>`、SVG 文本等不能排版的地方），
 * 需要排版的地方（首页卡片标题）走这里取 LaTeX 源再交给 Markdown。
 * 两边分开，避免「在 select 里显示 $C^k$」这种问题。
 */
export const CASE_MATH: Record<string, string> = {
  manifold: '$C^k$ 与光滑流形',
};

/**
 * 把标签里少量数学记号换成 Unicode 上标，供 SVG `<text>` 这类不能排版的地方使用。
 *
 * 为什么需要：SVG 文本没法用 KaTeX（它输出的是 HTML），而「C^k」在画布上读起来像
 * 带脱字符的乱码。只处理本项目实际用到的几个记号，不做通用 LaTeX 转换——
 * 那属于排版引擎的活，不该在这里重造。
 */
export function plainMathText(text: string): string {
  const superscripts: Record<string, string> = {
    '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹',
    a: 'ᵃ', b: 'ᵇ', c: 'ᶜ', d: 'ᵈ', e: 'ᵉ', f: 'ᶠ', g: 'ᵍ', h: 'ʰ', i: 'ⁱ', j: 'ʲ', k: 'ᵏ', l: 'ˡ', m: 'ᵐ',
    n: 'ⁿ', o: 'ᵒ', p: 'ᵖ', r: 'ʳ', s: 'ˢ', t: 'ᵗ', u: 'ᵘ', v: 'ᵛ', w: 'ʷ', x: 'ˣ', y: 'ʸ', z: 'ᶻ',
    A: 'ᴬ', B: 'ᴮ', D: 'ᴰ', E: 'ᴱ', G: 'ᴳ', H: 'ᴴ', I: 'ᴵ', J: 'ᴶ', K: 'ᴷ', L: 'ᴸ', M: 'ᴹ', N: 'ᴺ',
    O: 'ᴼ', P: 'ᴾ', R: 'ᴿ', T: 'ᵀ', U: 'ᵁ', V: 'ⱽ', W: 'ᵂ',
    '+': '⁺', '-': '⁻', '−': '⁻', '=': '⁼', '(': '⁽', ')': '⁾',
  };
  return text
    .replace(/\$([^$]*)\$/g, '$1')
    // Unicode 没有上标 ∞：`C^∞` 退成 `C∞`（数学上照旧读得通），比在界面上留一个脱字符好。
    .replace(/\^\s*\{?\s*(?:\\infty|∞)\s*\}?/g, '∞')
    // `^{-1}` 这类可以整体上标；`^{k,α}` 没有对应的上标写法，退成 `^(k,α)`，至少不留 `^{`。
    .replace(/\^\{([^{}]+)\}/g, (_match, body: string) => (
      [...body].every((ch) => superscripts[ch])
        ? [...body].map((ch) => superscripts[ch]).join('')
        : `^(${body})`
    ))
    .replace(/\^\{?([0-9A-Za-z])\}?/g, (_match, ch: string) => superscripts[ch] ?? `^${ch}`)
    .replace(/\\mathbb\{R\}/g, 'ℝ')
    .replace(/\\mathbb\{N\}/g, 'ℕ');
}

/**
 * 把散文里的裸数学记号包成行内 LaTeX，交给 Markdown 排版。
 *
 * 语料里的标题与说明是纯文本（`R^N`、`C^k`、`S₃`），直接放进 Markdown 会被 GFM 的
 * 上标语法吃掉、渲染成「R^N」这种带脱字符的样子。这里给它们补上 `$…$`。
 * 只认白名单模式，不做通用解析——`^` 在正文里也可能只是普通字符。
 */
export function mathify(text: string): string {
  return text
    // 形如 R^N / C^k / R^n 的单字母底数幂
    .replace(/(?<![$\w\\])([A-Za-z])\^\{?([A-Za-z0-9])\}?(?![$\w])/g, '$$$1^$2$$')
    // 形如 C^∞ / C^\infty 的光滑性记号（上面那条只认单字母数字，∞ 要单列）
    .replace(/(?<![$\w\\])([A-Za-z])\^\{?(?:\\infty|∞)\}?(?![$\w])/g, '$$$1^\\infty$$')
    // 形如 Φ^{-1} / f^{-1} 的逆映射
    .replace(/(?<![$\w\\])([A-Za-zΑ-ωΦΨ])\^\{(-1)\}/g, '$$$1^{$2}$$');
}

/** 聚合块类型：topic / discipline 等。未登记的值回退原值。 */
export const AGGREGATE_KIND_LABELS: PairedTable = {
  topic: { zh: '话题', en: 'Topic' },
  discipline: { zh: '学科', en: 'Discipline' },
  case: { zh: '案例', en: 'Case' },
  aggregate: { zh: '聚合', en: 'Aggregate' },
};

/**
 * 学科（知识的**本质领域**）的显示名。
 *
 * 键取自 `data/fields.mjs` 的受控词表——那是**唯一来源**，这里只给显示名。
 * 表必须**逐支覆盖**：少一支的后果是英文站的下拉里出现「Analysis + 一堆中文」，
 * 而这类缺口不会有任何报错（渲染时回退原值），只能靠逐项核对发现。
 * `tests/granularity-fields.mjs` 会数受控词表的支数；两边数目对不上时应当被发现。
 */
export const DISCIPLINE_LABELS: PairedTable = {
  分析: { zh: '分析', en: 'Analysis' },
  测度论: { zh: '测度论', en: 'Measure theory' },
  拓扑: { zh: '拓扑', en: 'Topology' },
  微分几何: { zh: '微分几何', en: 'Differential geometry' },
  群论: { zh: '群论', en: 'Group theory' },
  线性代数: { zh: '线性代数', en: 'Linear algebra' },
  多重线性与张量代数: { zh: '多重线性与张量代数', en: 'Multilinear and tensor algebra' },
  域与数系: { zh: '域与数系', en: 'Fields and number systems' },
  集合论: { zh: '集合论', en: 'Set theory' },
  数理逻辑: { zh: '数理逻辑', en: 'Mathematical logic' },
  相对论与宇宙论: { zh: '相对论与宇宙论', en: 'Relativity and cosmology' },
  数学方法: { zh: '数学方法', en: 'Mathematical methods' },
  未分类: { zh: '未分类', en: 'Uncategorized' },
};

/** formal 负载键的中文名。未登记的键回退显示原键名。 */
export const FORMAL_FIELD_LABELS: PairedTable = {
  objectType: { zh: '对象类型', en: 'Object type' },
  parameters: { zh: '参数', en: 'Parameters' },
  predicate: { zh: '谓词', en: 'Predicate' },
  type: { zh: '类型', en: 'Type' },
  typeEnv: { zh: '类型环境', en: 'Type environment' },
  theory: { zh: '背景理论', en: 'Background theory' },
  symbols: { zh: '符号', en: 'Symbols' },
  assumptions: { zh: '假设', en: 'Assumptions' },
  formationWitness: { zh: '形成见证', en: 'Formation witness' },
  boundary: { zh: '边界', en: 'Boundary' },
  formula: { zh: '公式', en: 'Formula' },
  declaration: { zh: '声明', en: 'Declaration' },
  signatureVersion: { zh: '签名版本', en: 'Signature version' },
  language: { zh: '语言', en: 'Language' },
  calculus: { zh: '演算', en: 'Calculus' },
  axioms: { zh: '公理', en: 'Axioms' },
  modules: { zh: '模块', en: 'Modules' },
  term: { zh: '项', en: 'Term' },
  newSymbol: { zh: '新符号', en: 'New symbol' },
  oldTerm: { zh: '旧语言中的表达式', en: 'Expression in the old language' },
  expansion: { zh: '展开方式', en: 'Expansion' },
  conservative: { zh: '保守性', en: 'Conservativeness' },
  target: { zh: '目标', en: 'Target' },
  code: { zh: '证明项', en: 'Proof term' },
  checkStatus: { zh: '检查状态', en: 'Check status' },
  openAssumptions: { zh: '开放假设', en: 'Open assumptions' },
  concept: { zh: '所属概念', en: 'Concept' },
  objectSpec: { zh: '对象规格', en: 'Object specification' },
  satisfaction: { zh: '满足情况', en: 'Satisfaction' },
  failureWitness: { zh: '失败见证', en: 'Failure witness' },
  anchors: { zh: '锚点', en: 'Anchors' },
  inputs: { zh: '输入', en: 'Inputs' },
  outputs: { zh: '输出', en: 'Outputs' },
  goal: { zh: '目标', en: 'Goal' },
  constraints: { zh: '约束', en: 'Constraints' },
  steps: { zh: '步骤', en: 'Steps' },
  verificationTarget: { zh: '验证目标', en: 'Verification target' },
  name: { zh: '名称', en: 'Name' },
  scope: { zh: '适用范围', en: 'Scope' },
  In: { zh: '输入接口', en: 'Input interface' },
  Out: { zh: '输出接口', en: 'Output interface' },
  Pre: { zh: '前置条件', en: 'Preconditions' },
  Post: { zh: '后置条件', en: 'Postconditions' },
  Use: { zh: '使用位置', en: 'Where it is used' },
  Demo: { zh: '演示', en: 'Demonstration' },
  Fail: { zh: '失效情形（Fail）', en: 'Failure case (Fail)' },
  fail: { zh: '失效情形（fail）', en: 'Failure case (fail)' },
  body: { zh: '启发体', en: 'Heuristic body' },
  applicableTo: { zh: '适用对象', en: 'Applies to' },
  medium: { zh: '载体', en: 'Medium' },
  correspondence: { zh: '对应说明', en: 'Correspondence' },
  wrongRule: { zh: '错误规则', en: 'Wrong rule' },
  task: { zh: '任务', en: 'Task' },
  counterexample: { zh: '反例', en: 'Counterexample' },
  generationDepth: { zh: '生成深度', en: 'Generation depth' },
  invariants: { zh: '不变量', en: 'Invariants' },
};

/** 稳定的显示名查找：找不到就回退原值，避免出现空白徽章。 */
export function labelOf(table: PairedTable, value: string | null | undefined, fallback = '', locale: Locale = 'zh'): string {
  if (!value) return fallback;
  const pair = table[value];
  return pair ? pickText(pair, locale, value) : value;
}

/*
 * 以下为**默认中文**的便捷函数。
 *
 * 语种用**选项对象**（`{ locale: 'en' }`）而不是第二个位置参数，这不是风格问题：
 * 这些函数经常被 `.map(constructLabel)` 这样直接当回调传，第二个位置参数会被
 * 数组下标占用（`map(constructLabel)` 会把 `1` 当语种），而对象参数不会——
 * 传下标进去只是多一个被忽略的字段，不会静默换掉语言。
 *
 * 组件请一律用 `useLabels()`：只有它会随语种重渲染。
 */
interface LabelOptions { locale?: Locale }

export const constructLabel = (value: string | null | undefined, options: LabelOptions = {}): string => labelOf(CONSTRUCT_LABELS, value, options.locale === 'en' ? 'Uncategorized' : '未分类', options.locale ?? 'zh');
export const roleLabel = (value: string | null | undefined, options: LabelOptions = {}): string => labelOf(ROLE_LABELS, value, options.locale === 'en' ? 'Uncategorized' : '未分类', options.locale ?? 'zh');
export const relationLabel = (value: string | null | undefined, options: LabelOptions = {}): string => labelOf(RELATION_LABELS, value, options.locale === 'en' ? 'Unregistered relation' : '未登记关系', options.locale ?? 'zh');
export const eventKindLabel = (value: string | null | undefined, options: LabelOptions = {}): string => labelOf(EVENT_KIND_LABELS, value, options.locale === 'en' ? 'Unknown event' : '未知事件', options.locale ?? 'zh');
export const actionModeLabel = (value: string | null | undefined, options: LabelOptions = {}): string => labelOf(ACTION_MODE_LABELS, value, options.locale === 'en' ? 'Action' : '行动', options.locale ?? 'zh');
export const resourceLabel = (value: string | null | undefined, options: LabelOptions = {}): string => labelOf(RESOURCE_LABELS, value, value ?? '', options.locale ?? 'zh');
export const supportUseLabel = (value: string | null | undefined, options: LabelOptions = {}): string => labelOf(SUPPORT_USE_LABELS, value, value ?? '', options.locale ?? 'zh');
export const representationKindLabel = (value: string | null | undefined, options: LabelOptions = {}): string => labelOf(REPRESENTATION_KIND_LABELS, value, options.locale === 'en' ? 'Other representation' : '其他表征', options.locale ?? 'zh');
export const formalFieldLabel = (key: string, options: LabelOptions = {}): string => labelOf(FORMAL_FIELD_LABELS, key, key, options.locale ?? 'zh');
export const caseLabel = (value: string | null | undefined, options: LabelOptions = {}): string => labelOf(CASE_LABELS, value, value ?? '', options.locale ?? 'zh');

/**
 * 关系图例配色：与 GraphPage 的 SVG 线色保持一致。
 *
 * 取色族跟随站点标志（design/mcs-logo-v6）：依赖越紧的关系用越深的品牌紫，
 * 桥接与对偶分别借标志里的暖色丝线与品红丝线，其余关系退到蓝／灰／绿，
 * 保证八种关系在白底画布上互相可分。
 */
/**
 * 关系种类的颜色：**色相承载「哪一种关系」**，明度/饱和度承载「有多硬」。
 *
 * 设计约束（不是随手挑的颜色）：
 * - 八种关系色相互不相同：硬前置紫、硬泛化蓝、特化淡紫、桥接橙、应用金、类比石板灰、对偶品红、跨域绿；
 * - 每一色的**明度**都压在中深区间（HSL 的 L 约 35–55%），因为画布底色是近白的浅紫，
 *   太浅的线在浅底上读不出来；
 * - 饱和度靠 `saturate()` 按权重再提一档（硬关系更「跳」），这里给的是**基数**。
 *
 * 改这里的任何一色都要同步 `relation-visual.ts` 的权重表与条款面板：颜色与权重是两套独立信息，
 * 不能互相代替（色相说「是什么关系」，粗细与虚实说「有多硬」）。
 */
export const RELATION_COLOR: Record<string, string> = {
  hardPrereq: '#4c1d95',
  hardGeneralization: '#2563eb',
  specialization: '#0284c7',
  bridge: '#ea580c',
  application: '#854d0e',
  analogy: '#64748b',
  duality: '#db2777',
  crossDomain: '#059669',
};

/**
 * 行动契约按 `mode` 上色。
 *
 * 这一条是用户报「全都是大黑箭头」之后加的：契约是全库最多的一类边（386 条），
 * 旧版**所有**契约共用一个中性灰（`THEME.contractEdge`），于是画布上绝大多数线都是同一团灰，
 * 只有少数几条语义关系有颜色。现在按 mode 分色，与 `CONTRACT_MODE_WEIGHT` 的分档一一对应：
 * 定义性前置与推导前置是**语义依赖**，给足饱和度；其余是结构骨架，保持低饱和不抢注意力。
 */
export const CONTRACT_MODE_COLOR: Record<string, string> = {
  definition: '#6d28d9',
  deduction: '#1d4ed8',
  construction: '#0e7490',
  method: '#0f766e',
  task: '#a16207',
  evidence: '#7c2d12',
  representation: '#be185d',
};

/** 未登记的 mode 用中性灰：不假装知道它是什么类型。 */
export const CONTRACT_UNKNOWN_COLOR = '#8d85ae';

export function contractModeColor(mode: string | null | undefined, fallback: string): string {
  if (!mode) return fallback;
  return CONTRACT_MODE_COLOR[mode] ?? fallback;
}

/**
 * 构造类型的浅色底：用于节点列表里的类型标签，让不同构造一眼可分。
 * 只表示分类，不表示先后、难度或重要性。图谱里的节点底色复用同一张表。
 */
export const CONSTRUCT_COLOR: Record<string, string> = {
  Symbol: '#efeafd',
  Concept: '#e7edfd',
  Claim: '#e4f4f1',
  Proof: '#f0e9fd',
  Example: '#e9f5f0',
  Counterexample: '#fdeee7',
  Problem: '#fdf3e0',
  Theory: '#e8f3ef',
  Construction: '#f7efe6',
  Method: '#f2efe9',
  MisconceptionPattern: '#fbe9f0',
  Representation: '#e7f2f8',
};

/**
 * 组件用的标签工具集：**跟着语种走**。
 *
 * 组件一律用它，而不是直接调上面的默认中文函数——后者不会在切换语言时重渲染，
 * 表现就是「切到英文后类型徽章还是中文」，而且不报错。
 *
 * 钩子本身在 `web/src/i18n/useLabels.tsx`（这个文件不能 import React，见文件头说明）。
 */
export interface Labels {
  constructLabel: (value: string | null | undefined) => string;
  roleLabel: (value: string | null | undefined) => string;
  relationLabel: (value: string | null | undefined) => string;
  eventKindLabel: (value: string | null | undefined) => string;
  actionModeLabel: (value: string | null | undefined) => string;
  resourceLabel: (value: string | null | undefined) => string;
  supportUseLabel: (value: string | null | undefined) => string;
  representationKindLabel: (value: string | null | undefined) => string;
  formalFieldLabel: (key: string) => string;
  caseLabel: (value: string | null | undefined) => string;
  /** 摊平后的表（给 `<option>` 的枚举与图例用）。 */
  tables: {
    constructs: Record<string, string>;
    roles: Record<string, string>;
    relations: Record<string, string>;
    eventKinds: Record<string, string>;
    actionModes: Record<string, string>;
    resources: Record<string, string>;
    representationKinds: Record<string, string>;
    cases: Record<string, string>;
    disciplines: Record<string, string>;
    aggregateKinds: Record<string, string>;
  };
}

export function makeLabels(locale: Locale): Labels {
  const options: LabelOptions = { locale };
  return {
    constructLabel: (value) => constructLabel(value, options),
    roleLabel: (value) => roleLabel(value, options),
    relationLabel: (value) => relationLabel(value, options),
    eventKindLabel: (value) => eventKindLabel(value, options),
    actionModeLabel: (value) => actionModeLabel(value, options),
    resourceLabel: (value) => resourceLabel(value, options),
    supportUseLabel: (value) => supportUseLabel(value, options),
    representationKindLabel: (value) => representationKindLabel(value, options),
    formalFieldLabel: (key) => formalFieldLabel(key, options),
    caseLabel: (value) => caseLabel(value, options),
    tables: {
      constructs: tableFor(CONSTRUCT_LABELS, locale),
      roles: tableFor(ROLE_LABELS, locale),
      relations: tableFor(RELATION_LABELS, locale),
      eventKinds: tableFor(EVENT_KIND_LABELS, locale),
      actionModes: tableFor(ACTION_MODE_LABELS, locale),
      resources: tableFor(RESOURCE_LABELS, locale),
      representationKinds: tableFor(REPRESENTATION_KIND_LABELS, locale),
      cases: tableFor(CASE_LABELS, locale),
      disciplines: tableFor(DISCIPLINE_LABELS, locale),
      aggregateKinds: tableFor(AGGREGATE_KIND_LABELS, locale),
    },
  };
}
