// 面向学习者的中文术语表。
// 规则：显示中文为主标签，原始值保留在 title 供核查；未登记的键回退显示原值，绝不显示空标签。

export const CONSTRUCT_LABELS: Record<string, string> = {
  Symbol: '符号',
  Term: '项',
  Concept: '概念',
  Definition: '定义',
  Claim: '命题',
  Proof: '证明',
  Example: '例子',
  Counterexample: '反例',
  Problem: '问题',
  Theory: '背景理论',
  Construction: '构造',
  Method: '方法',
  Representation: '表征',
  MisconceptionPattern: '误区模式',
};

export const ROLE_LABELS: Record<string, string> = {
  Concept: '概念',
  Definition: '定义',
  Axiom: '公理',
  Theorem: '定理',
  Property: '性质',
  Proof: '证明',
  Example: '例子',
  Counterexample: '反例',
  Problem: '问题',
  Theory: '理论',
  Construction: '构造',
  GlobalMethod: '全局方法',
  LocalMethod: '局部方法',
};

export const RELATION_LABELS: Record<string, string> = {
  hardPrereq: '硬前置',
  hardGeneralization: '硬泛化',
  specialization: '特化',
  bridge: '桥接',
  application: '应用',
  analogy: '类比',
  duality: '对偶',
  crossDomain: '跨域',
};

export const EVENT_KIND_LABELS: Record<string, string> = {
  view: '已读',
  hint: '用了提示',
  answer: '作答',
  evaluation: '模型评价',
  mastery_estimate: '能力估计',
  confirmation: '确认可用',
  misconception: '误区实例',
  goal: '学习目标',
  note: '笔记',
  tutor_message: '辅导回复',
};

export const ACTION_MODE_LABELS: Record<string, string> = {
  definition: '引入定义',
  deduction: '推导',
  evidence: '证据核验',
  construction: '构造',
  problem: '解题',
  method: '方法应用',
};

export const RESOURCE_LABELS: Record<string, string> = {
  statement: '陈述',
  definition: '定义',
  proof: '证明',
  certificate: '证书',
  construction: '构造',
  task: '任务',
  method: '方法',
  representation: '表征',
  condition: '条件',
  competence: '能力',
};

export const SUPPORT_USE_LABELS: Record<string, string> = {
  expression: '表达',
  proof: '证明',
  route: '路线',
};

export const SUPPORT_STATUS_LABELS: Record<string, string> = {
  Known: '已知',
  Unknown: '未知',
  known: '已知',
  unknown: '未知',
};

export const REPRESENTATION_KIND_LABELS: Record<string, string> = {
  formula: '公式',
  intuition: '直觉',
  proof: '证明',
  example: '例子',
  definition: '定义',
  construction: '构造',
  counterexample: '反例',
};

export const CASE_LABELS: Record<string, string> = {
  limit: '极限',
  manifold: 'C^k 与光滑流形',
  tensor: '张量',
  group: '群',
  background: '共享背景',
  dg: '微分几何',
  liang: '微分几何与广义相对论（上册）',
  rudin: '数学分析原理（Rudin）',
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
export const AGGREGATE_KIND_LABELS: Record<string, string> = {
  topic: '话题',
  discipline: '学科',
  case: '案例',
  aggregate: '聚合',
};

export const DISCIPLINE_LABELS: Record<string, string> = {
  分析: '分析',
  代数: '代数',
  几何与拓扑: '几何与拓扑',
  未分类: '未分类',
};

/** formal 负载键的中文名。未登记的键回退显示原键名。 */
export const FORMAL_FIELD_LABELS: Record<string, string> = {
  objectType: '对象类型',
  parameters: '参数',
  predicate: '谓词',
  type: '类型',
  typeEnv: '类型环境',
  theory: '背景理论',
  symbols: '符号',
  assumptions: '假设',
  formationWitness: '形成见证',
  boundary: '边界',
  formula: '公式',
  declaration: '声明',
  signatureVersion: '签名版本',
  language: '语言',
  calculus: '演算',
  axioms: '公理',
  modules: '模块',
  term: '项',
  newSymbol: '新符号',
  oldTerm: '旧语言中的表达式',
  expansion: '展开方式',
  conservative: '保守性',
  target: '目标',
  code: '证明项',
  checkStatus: '检查状态',
  openAssumptions: '开放假设',
  concept: '所属概念',
  objectSpec: '对象规格',
  satisfaction: '满足情况',
  failureWitness: '失败见证',
  anchors: '锚点',
  inputs: '输入',
  outputs: '输出',
  goal: '目标',
  constraints: '约束',
  steps: '步骤',
  verificationTarget: '验证目标',
  name: '名称',
  scope: '适用范围',
  In: '输入接口',
  Out: '输出接口',
  Pre: '前置条件',
  Post: '后置条件',
  Use: '使用位置',
  Demo: '演示',
  Fail: '失效情形（Fail）',
  fail: '失效情形（fail）',
  body: '启发体',
  applicableTo: '适用对象',
  medium: '载体',
  correspondence: '对应说明',
  wrongRule: '错误规则',
  task: '任务',
  counterexample: '反例',
  generationDepth: '生成深度',
  invariants: '不变量',
};

/** 稳定的中文标签查找：找不到就回退原值，避免出现空白徽章。 */
export function labelOf(table: Record<string, string>, value: string | null | undefined, fallback = ''): string {
  if (!value) return fallback;
  return table[value] ?? value;
}

export function constructLabel(value: string | null | undefined): string {
  return labelOf(CONSTRUCT_LABELS, value, '未分类');
}

export function roleLabel(value: string | null | undefined): string {
  return labelOf(ROLE_LABELS, value, '未分类');
}

export function relationLabel(value: string | null | undefined): string {
  return labelOf(RELATION_LABELS, value, '未登记关系');
}

export function eventKindLabel(value: string | null | undefined): string {
  return labelOf(EVENT_KIND_LABELS, value, '未知事件');
}

export function actionModeLabel(value: string | null | undefined): string {
  return labelOf(ACTION_MODE_LABELS, value, '行动');
}

export function resourceLabel(value: string | null | undefined): string {
  return labelOf(RESOURCE_LABELS, value, value ?? '');
}

export function supportUseLabel(value: string | null | undefined): string {
  return labelOf(SUPPORT_USE_LABELS, value, value ?? '');
}

export function representationKindLabel(value: string | null | undefined): string {
  return labelOf(REPRESENTATION_KIND_LABELS, value, '其他表征');
}

export function formalFieldLabel(key: string): string {
  return FORMAL_FIELD_LABELS[key] ?? key;
}

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
