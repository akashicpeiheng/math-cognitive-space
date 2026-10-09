/**
 * 关系可视化规范（网站内部条款）。
 *
 * 目标是让「关系越硬、视觉越明显」成为一条可核对的规则，而不是凭手感调出来的样式。
 * 因此这里把每一类关系映射到一个 **0–1 的视觉权重**，再由权重统一推出线宽、
 * 饱和度、不透明度与是否标注文字。任何一个视觉参数都能反查到它的依据。
 *
 * 权重从哪来（三条依据，都能在公共本体里核对）：
 *
 * 1. **关系种类本身的强度**。`hardPrereq` / `hardGeneralization` 是「不满足就不成立」
 *    的硬关系；`specialization` 是硬泛化的反方向；`bridge` / `application` / `crossDomain`
 *    是结构或用法层面的联系；`analogy` 只在 `ILLUSTRATION` 下登记，明确声明不构成同构，
 *    因此最弱。这一层来自 `data/` 里的关系登记。
 * 2. **见证状态**（`witness.status`）。同一种关系里，带 `PROOF` 见证的比只带 `DEF` /
 *    `REF` 的更强——前者有证明，后者只是定义或引用。这一层是逐条边读取的。
 * 3. **边源家族**。行动契约是结构骨架但**不是数学断言**；同一话题、共用前提、
 *    误区锚点、同一份证据、支持族依赖都只是登记上的关联。它们必须明显弱于语义关系，
 *    否则图会变成一团看不出重点的线。
 *
 * 硬性要求：**任何一条语义关系都不能画得比任何一条结构关系更弱**。
 * `assertHierarchyHolds()` 在测试里核对这条不变量。
 */

import type { EdgeFamily } from './network';

/**
 * 行动契约按 `mode` 分档：`mode` 不是装饰，它说明「这条输入是干什么用的」。
 *
 * 这一条是被用户骂出来的：知识网络里「同胚 → 流形」画成一条几乎看不见的灰虚线，
 * 而本体里 `a-dg:manifold` 明明写着 `inputs=[拓扑空间, 同胚]`、`outputs=[流形]`、
 * **`mode=definition`**——不用同胚就定义不出流形。旧规则把**所有**契约一律按
 * 「结构骨架」压到最弱一档（0.18 → ambient：1.1px、0.34 不透明、细虚线、不标名称），
 * 于是全库 85 条 definition 契约与 61 条 deduction 契约都被画得比 `crossDomain`（接口关系）还轻。
 *
 * 现在的读法：`definition` 与 `deduction` 是**语义依赖**（前者「靠它定义」、后者「靠它推出」），
 * 说得出的数学内容不比登记关系少；其余 mode 才是结构骨架。权重与关系权重同一把尺子。
 */
export const CONTRACT_MODE_WEIGHT: Record<string, number> = {
  definition: 0.9,      // 定义性前置：这个节点靠它定义出来（语义依赖）
  deduction: 0.5,       // 推导前置：结论靠它推出来（语义依赖）
  // 以下都是**结构骨架**，必须弱于最弱的语义关系——analogy 在最低见证下是 0.24，
  // 因此这一组的上界压在 0.2 以内（`assertHierarchyHolds()` 会连同它们一起核对）。
  construction: 0.2,    // 构造输入
  method: 0.18,         // 方法输入
  task: 0.17,           // 练习或任务输入
  evidence: 0.16,       // 证据输入
  representation: 0.16, // 表征输入
};

export const CONTRACT_MODE_LABELS: Record<string, string> = {
  definition: '定义性前置',
  deduction: '推导前置',
  construction: '构造输入',
  method: '方法输入',
  task: '任务输入',
  evidence: '证据输入',
  representation: '表征输入',
};

/**
 * 契约 mode 的英文名（与上面的中文表逐键对应）。
 *
 * 为什么纯模块自己成对维护、而不是从 `labels.ts` 取：`labels.ts` 为了 `useLabels()`
 * 引入 React，任何 `import` 它的模块都无法再被 `node --test` 直接加载
 * （`tests/relation-visual.test.mjs` 还按源码文本求值本文件）。
 * 因此这里保留一份**只有文案**的成对表，中文值与 `labels.ts` 的口径逐字一致。
 */
export const CONTRACT_MODE_LABELS_EN: Record<string, string> = {
  definition: 'Definitional prerequisite',
  deduction: 'Deduction prerequisite',
  construction: 'Construction input',
  method: 'Method input',
  task: 'Task input',
  evidence: 'Evidence input',
  representation: 'Representation input',
};

/** 取契约 mode 的显示名；未登记的 mode 回退原值（与 `labelOf` 同一条纪律）。 */
export function contractModeLabel(mode: string, locale: string = 'zh'): string {
  const table = locale === 'en' ? CONTRACT_MODE_LABELS_EN : CONTRACT_MODE_LABELS;
  return table[mode] ?? mode;
}

/**
 * 关系种类的显示名（纯模块用的副本，中文值与 `labels.ts` 的 `RELATION_LABELS` 逐字一致）。
 *
 * 放在这里而不是 `labels.ts`：`network.ts` 的 `reasonText` 与 `node-related.ts` 的候选说明
 * 都要在**没有 React** 的前提下按语种取名字，而这两个模块是被 `node --test` 直接 import 的。
 */
export const RELATION_KIND_LABELS: Record<string, string> = {
  hardPrereq: '硬前置',
  hardGeneralization: '硬泛化',
  specialization: '特化',
  bridge: '桥接',
  application: '应用',
  analogy: '类比',
  duality: '对偶',
  crossDomain: '跨域',
};

export const RELATION_KIND_LABELS_EN: Record<string, string> = {
  hardPrereq: 'Hard prerequisite',
  hardGeneralization: 'Hard generalization',
  specialization: 'Specialization',
  bridge: 'Bridge',
  application: 'Application',
  analogy: 'Analogy',
  duality: 'Duality',
  crossDomain: 'Cross-domain',
};

/** 取关系种类的显示名；未登记的 kind 回退原值，不显示空白。 */
export function relationKindLabel(kind: string, locale: string = 'zh'): string {
  if (!kind) return '';
  const table = locale === 'en' ? RELATION_KIND_LABELS_EN : RELATION_KIND_LABELS;
  return table[kind] ?? kind;
}

/** 属于**语义依赖**的契约 mode：它们必须强于任何结构关联，也强于最弱的语义关系。 */
export const SEMANTIC_CONTRACT_MODES: string[] = ['definition', 'deduction'];

/** 一条边在语义上叫什么（关系名，或语义契约的 mode 名）。`locale` 只影响契约 mode 的显示名。 */
export function edgeKindLabel(family: EdgeFamily, kind: string | null, mode: string | null, locale: string = 'zh'): string | null {
  if (family === 'relation') return kind;
  if (family === 'contract' && mode && SEMANTIC_CONTRACT_MODES.includes(mode)) return contractModeLabel(mode, locale);
  return null;
}

/** 视觉分层：从最硬的语义关系到最弱的结构关联。 */
export type RelationTier = 'core' | 'strong' | 'medium' | 'structural' | 'ambient';

export const TIER_LABELS: Record<RelationTier, string> = {
  core: '核心断言',
  strong: '强关系',
  medium: '结构性关系',
  structural: '行动骨架',
  ambient: '登记关联',
};

export const TIER_NOTES: Record<RelationTier, string> = {
  core: '不满足就不成立（硬前置、硬泛化），以及定义性前置——不用它就定义不出这个节点。',
  strong: '有明确数学内容的关系（特化、应用、跨域、对偶）。',
  medium: '桥接与类比、推导前置：结构或用法上的联系，不构成定义性的蕴含。',
  structural: '产出某节点需要哪些输入（构造 / 方法 / 任务 / 证据 / 表征）。是结构骨架，不是数学断言。',
  ambient: '同属一个话题块、共用前提、同一份证据、支持族依赖。只表示登记上的关联。',
};

/** 上面两张档位表的英文版（与中文逐键对应，理由见 `CONTRACT_MODE_LABELS_EN`）。 */
export const TIER_LABELS_EN: Record<RelationTier, string> = {
  core: 'Core assertions',
  strong: 'Strong relations',
  medium: 'Structural relations',
  structural: 'Action skeleton',
  ambient: 'Registered associations',
};

export const TIER_NOTES_EN: Record<RelationTier, string> = {
  core: 'If it does not hold, the node does not stand (hard prerequisites, hard generalizations), plus definitional prerequisites — without them the node cannot be defined.',
  strong: 'Relations with definite mathematical content (specialization, application, cross-domain, duality).',
  medium: 'Bridges and analogies, deduction prerequisites: links of structure or usage, not definitional entailment.',
  structural: 'Which inputs it takes to produce a node (construction / method / task / evidence / representation). This is the structural skeleton, not a mathematical assertion.',
  ambient: 'Same topic block, shared prerequisites, same evidence record, support-family dependency. Registration-level association only.',
};

/** 取档位名；未登记的档位回退原值。 */
export function tierLabel(tier: RelationTier, locale: string = 'zh'): string {
  const table = locale === 'en' ? TIER_LABELS_EN : TIER_LABELS;
  return table[tier] ?? tier;
}

/** 取档位说明。 */
export function tierNote(tier: RelationTier, locale: string = 'zh'): string {
  const table = locale === 'en' ? TIER_NOTES_EN : TIER_NOTES;
  return table[tier] ?? '';
}

/** 每种关系的视觉权重基数（0–1）。数值即规格，改动必须同步更新本条注释与测试。 */
export const RELATION_WEIGHT: Record<string, number> = {
  hardPrereq: 1,
  hardGeneralization: 0.95,
  specialization: 0.9,
  application: 0.72,
  crossDomain: 0.68,
  duality: 0.62,
  bridge: 0.56,
  analogy: 0.4,
};

/** 见证状态对权重的修正：有证明的最强，只登记定义的次之。 */
export const WITNESS_FACTOR: Record<string, number> = {
  PROOF: 1,
  FINITE: 0.95,
  DEF: 0.82,
  REF: 0.7,
  ILLUSTRATION: 0.62,
  'NOT-CLAIMED': 0.6,
};

/**
 * 边源家族的权重上界。
 *
 * `contract` 这一项是**非语义 mode 的回落值**（构造 / 方法 / 任务 / 证据 / 表征）；
 * `definition` 与 `deduction` 走 `CONTRACT_MODE_WEIGHT`，不再压到这一档。
 * 取值必须让「最强族边 < 最弱语义依赖」成立，这一条由 `assertHierarchyHolds()` 核对：
 * 最弱的语义依赖是 deduction 契约 0.5，因此族边上界压在 0.2 以下。
 */
export const FAMILY_WEIGHT: Record<EdgeFamily, number> = {
  relation: 1,        // 占位：relation 家族逐条按 RELATION_WEIGHT × WITNESS_FACTOR 算
  contract: 0.18,     // 占位：contract 家族逐条按 CONTRACT_MODE_WEIGHT 算，未知 mode 落到这里
  sharedInput: 0.13,
  support: 0.11,
  evidence: 0.09,
  pattern: 0.08,
  topic: 0.05,
};

/** 每个层级的固定视觉参数：线宽、不透明度、虚线节奏、是否标注文字。 */
export interface TierStyle {
  width: number;
  opacity: number;
  dash: string | undefined;
  label: boolean;
}

export const TIER_STYLE: Record<RelationTier, TierStyle> = {
  core: { width: 4.6, opacity: 1, dash: undefined, label: true },
  strong: { width: 3.2, opacity: 0.95, dash: undefined, label: true },
  medium: { width: 2.2, opacity: 0.85, dash: '9 5', label: true },
  structural: { width: 1.7, opacity: 0.6, dash: '5 5', label: false },
  ambient: { width: 1.1, opacity: 0.34, dash: '2 5', label: false },
};

/** 图例里每一档用的示意颜色。硬关系用主题紫的深浅，与画布上的关系色系相容。 */
export const TIER_SAMPLE_COLOR: Record<RelationTier, string> = {
  core: '#4c1d95',
  strong: '#2563eb',
  medium: '#ea580c',
  structural: '#64748b',
  ambient: '#94a3b8',
};

export function tierOf(weight: number): RelationTier {
  if (weight >= 0.85) return 'core';
  if (weight >= 0.55) return 'strong';
  if (weight >= 0.4) return 'medium';
  if (weight >= 0.25) return 'structural';
  return 'ambient';
}

/** 提高颜色饱和度：把 HSL 的 s 拉到目标值，硬关系因此更「跳」。 */
export function saturate(hex: string, factor: number): string {
  const match = /^#([0-9a-f]{6})$/i.exec(hex.trim());
  if (!match) return hex;
  const value = parseInt(match[1], 16);
  const r = ((value >> 16) & 255) / 255;
  const g = ((value >> 8) & 255) / 255;
  const b = (value & 255) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const lightness = (max + min) / 2;
  let hue = 0;
  let saturation = 0;
  if (max !== min) {
    const delta = max - min;
    saturation = lightness > 0.5 ? delta / (2 - max - min) : delta / (max + min);
    if (max === r) hue = ((g - b) / delta + (g < b ? 6 : 0)) / 6;
    else if (max === g) hue = ((b - r) / delta + 2) / 6;
    else hue = ((r - g) / delta + 4) / 6;
  }
  // 只提饱和度，不动色相与明度：色相承载「哪一种关系」，明度承载可读性。
  const nextSaturation = Math.min(1, Math.max(0, saturation * factor + (factor - 1) * 0.28));
  const q = lightness < 0.5 ? lightness * (1 + nextSaturation) : lightness + nextSaturation - lightness * nextSaturation;
  const p = 2 * lightness - q;
  const toChannel = (t: number) => {
    let value = t;
    if (value < 0) value += 1;
    if (value > 1) value -= 1;
    if (value < 1 / 6) return p + (q - p) * 6 * value;
    if (value < 1 / 2) return q;
    if (value < 2 / 3) return p + (q - p) * (2 / 3 - value) * 6;
    return p;
  };
  const channels = lightness === 0 || lightness === 1
    ? [lightness, lightness, lightness]
    : [toChannel(hue + 1 / 3), toChannel(hue), toChannel(hue - 1 / 3)];
  return `#${channels.map((channel) => Math.round(channel * 255).toString(16).padStart(2, '0')).join('')}`;
}

/** 一条边的视觉描述，渲染处只需照用。 */
export interface EdgeVisual {
  weight: number;
  tier: RelationTier;
  width: number;
  opacity: number;
  dash: string | undefined;
  /** 颜色已被提饱和。 */
  color: string;
  /** 是否在画布上直接标注关系名。 */
  label: boolean;
}

/**
 * 见证状态对权重的修正，按**关系种类**取。
 *
 * 一般规则就是 `WITNESS_FACTOR[status]`；唯一的例外是 `hardPrereq` + `DEF`：
 *
 * 「硬前置」的典型见证恰恰是**定义本身**——说「不用拓扑空间就定义不出同胚」，
 * 依据就是同胚的定义里写着拓扑空间。若对这种见证再打 DEF 折扣（0.82），
 * 一条显式登记的「不满足就不成立」会比从行动接口推出来的**定义性前置**（契约 0.9）还轻，
 * 于是最高一档「核心断言」里永远只剩契约、看不到关系。
 * 2026-10 本体里开始登记 `hardPrereq`（此前为 0 条）时一并定了这条。
 *
 * 范围说清：只对 `hardPrereq` + `DEF` 生效。其它种类、其它见证一律照旧打折——
 * 一条只登记了定义、没有证明的「硬泛化」本来就该弱于有证明的那条。
 */
export function witnessFactorOf(kind: string | null, status: string | null): number {
  if (!status) return 0.7;
  const base = WITNESS_FACTOR[status] ?? 0.7;
  if (kind === 'hardPrereq' && status === 'DEF') return 1;
  return base;
}

/**
 * 计算一条边的视觉参数。
 *
 * @param kind       关系种类（仅 source==='relation' 时有意义）
 * @param witness    见证状态
 * @param family     边源家族
 * @param baseColor  该关系种类的基础颜色
 * @param mode       行动契约的 mode（仅 source==='contract' 时有意义）
 */
export function edgeVisual(
  family: EdgeFamily,  kind: string | null,
  witness: string | null,
  baseColor: string,
  mode: string | null = null,
): EdgeVisual {
  let weight: number;
  if (family === 'relation' && kind) {
    const base = RELATION_WEIGHT[kind] ?? 0.4;
    // 见证折扣按种类取：hardPrereq + DEF 不打折（见 witnessFactorOf 的说明）。
    const factor = witnessFactorOf(kind, witness);
    weight = base * factor;
  } else if (family === 'contract') {
    // 契约的语义强度由 mode 决定；未登记的 mode 才落到结构骨架档。
    weight = (mode ? CONTRACT_MODE_WEIGHT[mode] : undefined) ?? FAMILY_WEIGHT.contract;
  } else {
    weight = FAMILY_WEIGHT[family] ?? 0.1;
  }
  const tier = tierOf(weight);
  const style = TIER_STYLE[tier];
  // 同一层级内再用权重微调线宽，使 0.95 与 0.85 仍可分辨。
  const semantic = family === 'relation' || (family === 'contract' && SEMANTIC_CONTRACT_MODES.includes(mode ?? ''));
  const width = style.width * (semantic ? 0.9 + weight * 0.2 : 1);
  /*
   * 饱和度的提法是分层的，不是一刀切：
   * - 语义关系提 1.5 档（它们承载「哪一种关系」，色相要立得住）；
   * - 语义契约只提 1.2 档——定义性前置数量多（全库 85 条），再往上提会把整块画布染成一种电紫，
   *   反而看不出哪条更硬；它的「硬」由线宽与实线表达，颜色只需与结构骨架区分开。
   * - 结构骨架保持原饱和度（1）：它们是背景层，抢注意力就错了。
   */
  const saturateFactor = family === 'relation' ? 1.5 : semantic ? 1.2 : 1;
  return {
    weight,
    tier,
    width: +width.toFixed(2),
    opacity: style.opacity,
    dash: style.dash,
    color: saturate(baseColor, saturateFactor),
    // 语义依赖要标出名字：「定义性前置」比一条没有说明的线有用得多。
    label: style.label && semantic,
  };
}

/**
 * 层级不变量。
 *
 * **旧规则**（上一版）：「任何语义关系都必须强于任何结构关系」，把契约一律算作结构关系。
 * 那条规则字面上成立、语义上是反的：本体把「不用它就定义不出来」全部登记在契约的 `mode` 里
 * （全库 215 条契约：definition 85、deduction 61…）。2026-10 起 `hardPrereq` 关系不再是空的：\n * 数学分析初步与微分几何两案的核心依赖已按定义登记（见 `data/cases/limit.mjs`、`data/cases/dg.mjs`）。
 *
 * **新规则**（三条，全部在这里核对）：
 *
 * A. 任何语义关系 > 任何结构关联（结构关联 = 五类族边 + 非语义 mode 的契约）；
 * B. 任何语义依赖（definition / deduction 契约）> 任何结构关联；
 * C. 定义性前置 ≤ 最硬的语义关系（hardPrereq），并且 > 最弱的语义关系（analogy 最弱见证）。
 *
 * 返回违反项（空数组表示成立）。
 */
export function assertHierarchyHolds(): string[] {
  const problems: string[] = [];

  /** 结构关联的上界：五类族边 + 契约族 + **所有非语义 mode 的契约**里最强的那个。 */
  const structuralWeights = [
    ...Object.entries(FAMILY_WEIGHT)
      .filter(([key]) => key !== 'relation' && key !== 'contract')
      .map(([, value]) => value),
    FAMILY_WEIGHT.contract,
    ...Object.entries(CONTRACT_MODE_WEIGHT)
      .filter(([mode]) => !SEMANTIC_CONTRACT_MODES.includes(mode))
      .map(([, value]) => value),
  ];
  const structuralMax = Math.max(...structuralWeights);
  /** 语义依赖的下界：definition / deduction 契约里最弱的那个。 */
  const semanticContractMin = Math.min(...SEMANTIC_CONTRACT_MODES.map((mode) => CONTRACT_MODE_WEIGHT[mode]));
  const worstWitness = Math.min(...Object.values(WITNESS_FACTOR));
  const weakestRelation = Math.min(...Object.values(RELATION_WEIGHT)) * worstWitness;

  // A + B：语义关系与语义依赖都必须强于结构关联。
  for (const [kind, base] of Object.entries(RELATION_WEIGHT)) {
    const worst = base * worstWitness;
    if (worst <= structuralMax) {
      problems.push(`${kind} 最弱情形 ${worst.toFixed(3)} 未强于结构关联上界 ${structuralMax.toFixed(3)}`);
    }
  }
  if (semanticContractMin <= structuralMax) {
    problems.push(`语义契约最弱情形 ${semanticContractMin.toFixed(3)} 未强于结构关联上界 ${structuralMax.toFixed(3)}`);
  }
  if (semanticContractMin <= weakestRelation) {
    problems.push(`语义契约最弱情形 ${semanticContractMin.toFixed(3)} 未强于最弱语义关系 ${weakestRelation.toFixed(3)}`);
  }
  // C：定义性前置不能超过最硬的语义关系，否则「硬前置」这个最高档会被契约反超。
  const hardestRelation = Math.max(...Object.values(RELATION_WEIGHT));
  if (CONTRACT_MODE_WEIGHT.definition > hardestRelation) {
    problems.push(`定义性前置 ${CONTRACT_MODE_WEIGHT.definition} 超过了最硬语义关系 ${hardestRelation}`);
  }
  /*
   * D：**以定义为见证的硬前置**必须真的落在最高一档「核心断言」里，并且不弱于定义性前置。
   *
   * 这两句话是一回事：契约里的 definition 说的是「这个节点靠它定义出来」，
   * 硬前置 + DEF 见证说的是同一件事，而且是一条显式登记的关系。
   * 2026-10 本体里开始登记 `hardPrereq` 之前，最高一档只有契约能进；
   * 这条不变量保证以后再改权重表时，不会把关系一侧又悄悄压下去（或压到 core 门槛以下）。
   */
  const hardPrereqDef = RELATION_WEIGHT.hardPrereq * witnessFactorOf('hardPrereq', 'DEF');
  if (hardPrereqDef < CONTRACT_MODE_WEIGHT.definition) {
    problems.push(`以定义为见证的硬前置 ${hardPrereqDef.toFixed(3)} 弱于定义性前置 ${CONTRACT_MODE_WEIGHT.definition}`);
  }
  if (tierOf(hardPrereqDef) !== 'core') {
    problems.push(`以定义为见证的硬前置 ${hardPrereqDef.toFixed(3)} 不在最高一档（tier=${tierOf(hardPrereqDef)}）`);
  }
  for (const [key, style] of Object.entries(TIER_STYLE)) {
    if (style.width <= 0 || style.opacity <= 0 || style.opacity > 1) problems.push(`层级 ${key} 的线宽/不透明度非法`);
  }
  return problems;
}

