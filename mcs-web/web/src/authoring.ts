/**
 * 「自动关联」流程的接口适配与本地状态。
 *
 * 这一层只做三件事，**不做数学判断**：
 *
 * 1. **接口适配**：把 `POST /formal/validate`、`/authoring/drafts`、`/relation-discovery/jobs`、
 *    `/authoring/publications`、`/authoring/rollback` 的返回归一到界面能直接用的形状；
 *    形状对不上时如实记进 `problems`，不猜、不补一个「看起来像结果」的空壳。
 * 2. **本地状态**：草稿自动保存与恢复（`localStorage`，键带版本号，**不依赖学习者档案**）。
 *    草稿只留在浏览器本机，不是 E 事件，也不进公共本体 M。
 * 3. **纯派生**：把候选按数学判断分组、把联合推导的共同输入摊开、把「只叠加草稿与结果」的
 *    网络预览算出来。
 *
 * 三条纪律（会进验收，写在代码里而不是写在文档里）：
 *
 * - **未验证不画成已成立关系**：`refuted` 与 `undecided` 只出现在审阅视图；
 *   网络预览只收 `verified`（且未被驳回）的边。
 * - **联合推导必须显示共同输入**：`conditions` 逐条列出，线段上标出「联合 N 项」，
 *   分不出共同输入时按**无附加条件**显示，不假装独立蕴含。
 * - **不编造解释**：草稿里空着的解释/读法一律显示「待补充」。
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiError, attempt, type Attempt, type UnavailableInfo } from './api';
import { CASE_LABELS } from './labels';
import type { Locale } from './i18n/locales';
import type { AuthoringDraft, DiscoveryRun, MathJudgment, PublicationRevision, RelationCandidate, RelationKind, ReviewStatus, RunStatus } from '@shared/formal';
import type { EvidenceRecord } from './types';

/**
 * 协议类型统一从 `shared/formal.d.ts` 取，并在这里转出去：
 * 页面与组件只 import 本模块，避免各处各写一份「差不多的」接口。
 */
export type { AuthoringDraft, DiscoveryRun, MathJudgment, PublicationRevision, RelationCandidate, RelationKind, ReviewStatus, RunStatus } from '@shared/formal';

/* ==========================================================================
 * 1. 形状兜底：服务端字段缺失/多给时不让界面崩，也不假装拿到了结果
 * ======================================================================== */

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function asNumber(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function asStringArray(value: unknown): string[] {
  return asArray(value).filter((item): item is string => typeof item === 'string');
}

/* ==========================================================================
 * 2. 案例、证据标签与边界文案
 * ======================================================================== */

/** 四种形式背景对应的案例；标签沿用站点既有的 CASE_LABELS，不另起一套口径。 */
export const AUTHORING_CASES = ['limit', 'manifold', 'tensor', 'group'] as const;
export type AuthoringCase = (typeof AUTHORING_CASES)[number];

/** 形式语言版本：与 `core/formal/language.mjs` 的 `FORMAL_LANGUAGE_VERSION` 同名同值。 */
export const FORMAL_SPEC_VERSION = 'mcs-formal/1';

/** 草稿节点 id 的前缀：与规格 §1.6 的「草稿用 draft 标识」一致，一眼看得出还没入库。 */
export const DRAFT_NODE_PREFIX = 'draft:';

/**
 * 节点名称 → 将要发布的 node id。
 *
 * 规则写死在这里，界面与解析请求共用同一个函数，避免「显示一个 id、检查时送另一个」：
 *
 * 1. 名称里已经带 `:` 时**原样当作显式 id**（用户想自己指定，就尊重它）；
 * 2. 否则补 `draft:` 前缀，并把空白折成 `-`、去掉会破坏 id 的字符（`: / \ # ? %` 与控制字符），
 *    折叠重复的 `-`、去掉首尾 `-`；
 * 3. 名称为空 → 没有 id（不编占位 id）。
 *
 * 为什么不做拼音化或哈希：id 要能被人读出来、和名称对得上；`draft:` 已经说明它是草稿。
 */
export function draftNodeId(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return '';
  if (trimmed.includes(':')) return trimmed.replace(/\s+/g, '');
  const slug = trimmed
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u001f\u007f]/g, '')
    .replace(/[:/\\#?%]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug ? `${DRAFT_NODE_PREFIX}${slug}` : '';
}

/**
 * 四案例各自的学科默认值。
 *
 * 依据是 `data/fields.mjs` 的受控词表（FIELD_IDS）与各案例对象的性质：极限→分析、
 * 流形→微分几何、张量→多重线性与张量代数、群→群论。**只是默认值**：表单里可以改，
 * 发布时由 `buildNodeRecord` 按受控词表核对（不在词表里就会多一条阻断项）。
 *
 * 为什么要给默认值：入库要求 discipline 非空且受控，空着会让「入库预览」永远带一条阻断项，
 * 而这条信息其实从案例就能推出来。
 */
export const CASE_DISCIPLINE: Record<string, string> = {
  limit: '分析',
  manifold: '微分几何',
  tensor: '多重线性与张量代数',
  group: '群论',
};

export function caseDiscipline(caseId: string): string {
  return CASE_DISCIPLINE[caseId] ?? '';
}

/**
 * 案例的显示名（默认中文）。
 *
 * `CASE_LABELS` 已改成 `{ zh, en }` 成对表；本模块是纯函数模块，**不引入 React**，
 * 语种用第三个位置参数显式传入，默认 `'zh'` 保证既有调用与中文站逐字不变
 * （`AuthoringPage` 等调用方按当前语种传 `locale`）。
 */
export function caseLabel(id: string, locale: Locale = 'zh'): string {
  const pair = CASE_LABELS[id];
  return pair ? (pair[locale] ?? pair.zh) : id;
}

export const CONSTRUCT_OPTIONS = ['Concept', 'Definition', 'Claim', 'Proof', 'Example', 'Counterexample', 'Problem', 'Theory', 'Construction', 'Method', 'Representation', 'Symbol', 'Term', 'MisconceptionPattern'] as const;

/** 关系种类：与 §2.11 的六种判定器一一对应。 */
export const RELATION_KIND_LABEL: Record<string, string> = {
  definitionReference: '定义引用',
  hardGeneralization: '硬推广',
  equivalentTo: '等价',
  conditionalDerivation: '条件推导',
  instanceOf: '实例',
  counterexampleTo: '反例',
};

/**
 * 上表的英文版（2026-10 双语化，键与中文逐字对应）。
 *
 * 中文表形状保持 `Record<string, string>` 不变：它进的是 SVG `<text>`、`<option>` 与
 * `data-*` 附近，且 `tests/authoring-page.mjs`、`tests/formal-authoring-api.test.mjs`
 * 按中文逐字核对。调用方按当前语种取，缺英文时回落中文。
 */
export const RELATION_KIND_LABEL_EN: Record<string, string> = {
  definitionReference: 'Definition reference',
  hardGeneralization: 'Hard generalization',
  equivalentTo: 'Equivalent',
  conditionalDerivation: 'Conditional derivation',
  instanceOf: 'Instance of',
  counterexampleTo: 'Counterexample to',
};

/** 取关系种类显示名；未登记的键回退原键名，绝不返回空白。 */
export function relationKindLabel(kind: string, locale: Locale = 'zh'): string {
  const table = locale === 'en' ? RELATION_KIND_LABEL_EN : RELATION_KIND_LABEL;
  return table[kind] ?? kind;
}

/**
 * 数学判断的**文字 + 记号**双通道。
 *
 * 只靠颜色区分状态在色觉缺陷下会失效（见 `tests/a11y-contrast.test.mjs` 的取向：
 * 要么色差够大，要么另有冗余通道）。这里每一档都同时给出中文短语与一个非颜色记号，
 * 并且每档配一句边界说明——「已通过检查」不是「数学上已证明」。
 */
export const MATH_JUDGMENT_LABEL: Record<MathJudgment, string> = {
  verified: '已通过检查',
  refuted: '已被有限反例反驳',
  undecided: '未决',
};

export const MATH_JUDGMENT_LABEL_EN: Record<MathJudgment, string> = {
  verified: 'Check passed',
  refuted: 'Refuted by a finite counterexample',
  undecided: 'Undecided',
};

export const MATH_JUDGMENT_MARK: Record<MathJudgment, string> = {
  verified: '✓',
  refuted: '✗',
  undecided: '?',
};

export const MATH_JUDGMENT_TONE: Record<MathJudgment, 'ok' | 'warn' | 'mid'> = {
  verified: 'ok',
  refuted: 'warn',
  undecided: 'mid',
};

export const MATH_JUDGMENT_BOUNDARY: Record<MathJudgment, string> = {
  verified: '「已通过检查」= 证书过了检查器，且目标核对通过；检查器本身未获形式验证。',
  refuted: '「已反驳」只来自预置有限对象上的反模型：它反驳的是该背景下的这条蕴含，不推翻实数或流形中的结论。',
  undecided: '「未决」= 界内没搜到证明、也没找到反例；它既不支持也不否定命题。',
};

export const MATH_JUDGMENT_BOUNDARY_EN: Record<MathJudgment, string> = {
  verified: '“Check passed” = the certificate passed the checker and the goal matched; the checker itself is not formally verified.',
  refuted: '“Refuted” only ever comes from a counter-model on a predefined finite object: it refutes this implication in this background, it does not overturn results about the reals or manifolds.',
  undecided: '“Undecided” = no proof was found within the bound, and no counterexample either; it neither supports nor refutes the claim.',
};

/** 取数学判断的短语（默认中文；未登记的键回退原值）。 */
export function mathJudgmentLabel(status: MathJudgment | string, locale: Locale = 'zh'): string {
  const table = locale === 'en' ? MATH_JUDGMENT_LABEL_EN : MATH_JUDGMENT_LABEL;
  return (table as Record<string, string>)[status] ?? status;
}

/** 取数学判断那一档的边界说明。 */
export function mathJudgmentBoundary(status: MathJudgment | string, locale: Locale = 'zh'): string {
  const table = locale === 'en' ? MATH_JUDGMENT_BOUNDARY_EN : MATH_JUDGMENT_BOUNDARY;
  return (table as Record<string, string>)[status] ?? '';
}

export const RUN_STATUS_LABEL: Record<RunStatus | string, string> = {
  queued: '排队中',
  running: '运行中',
  completed: '已完成',
  interrupted: '已中断（服务重启）',
  cancelled: '已取消',
  error: '执行错误',
  timeout: '超时',
  unsupported: '语言不支持',
  check_failed: '检查未通过',
};

export const RUN_STATUS_LABEL_EN: Record<RunStatus | string, string> = {
  queued: 'Queued',
  running: 'Running',
  completed: 'Completed',
  interrupted: 'Interrupted (server restarted)',
  cancelled: 'Cancelled',
  error: 'Execution error',
  timeout: 'Timed out',
  unsupported: 'Unsupported by the language',
  check_failed: 'Check failed',
};

export const REVIEW_LABEL: Record<ReviewStatus | string, string> = {
  pending: '未审阅',
  accepted: '已采纳',
  dismissed: '已驳回',
  published: '已入库',
  stale: '已失效',
};

export const REVIEW_LABEL_EN: Record<ReviewStatus | string, string> = {
  pending: 'Not reviewed',
  accepted: 'Accepted',
  dismissed: 'Dismissed',
  published: 'Published',
  stale: 'Stale',
};

/** 取运行状态显示名；未登记的状态回退原值（原始状态码本身就是信息）。 */
export function runStatusLabel(status: string, locale: Locale = 'zh'): string {
  const table = locale === 'en' ? RUN_STATUS_LABEL_EN : RUN_STATUS_LABEL;
  return table[status] ?? status;
}

/** 取审阅状态显示名。 */
export function reviewStatusLabel(status: string, locale: Locale = 'zh'): string {
  const table = locale === 'en' ? REVIEW_LABEL_EN : REVIEW_LABEL;
  return table[status] ?? status;
}

/** 采集入库前必须解释清楚的边界，逐条显示在界面上。 */
export const FLOW_BOUNDARIES = [
  '这是**本机维护入口**：写入的是 `data/extensions/` 下的内容包，不改既有案例文件，也不覆盖笔记。',
  '网络预览只叠加当前草稿与本次结果，**公共图此刻没有变化**；要改公共图必须走「确认入库」。',
  '已反驳与未决项只出现在审阅视图，不会画成已成立关系。',
  '联合推导的每条连线都列出它的共同输入；没有附加条件的候选才显示为无条件的独立蕴含。',
  '「已通过检查」是必要条件不是充分条件：检查器本身未获形式验证（§2.5 的 `kernelFormallyVerified` 恒为 false）。',
];

/* ==========================================================================
 * 3. 草稿字段（含参数类型表）与「待补充」
 * ======================================================================== */

export type DeclarationRole = 'object' | 'element' | 'function' | 'predicate' | 'proposition';

export const DECLARATION_ROLE_LABEL: Record<DeclarationRole, string> = {
  object: '对象集',
  element: '元素',
  function: '函数',
  predicate: '谓词',
  proposition: '命题',
};

export const DECLARATION_ROLE_LABEL_EN: Record<DeclarationRole, string> = {
  object: 'Object sort',
  element: 'Element',
  function: 'Function',
  predicate: 'Predicate',
  proposition: 'Proposition',
};

/** 取参数类型表的角色显示名。 */
export function declarationRoleLabel(role: DeclarationRole | string, locale: Locale = 'zh'): string {
  const table = locale === 'en' ? DECLARATION_ROLE_LABEL_EN : DECLARATION_ROLE_LABEL;
  return (table as Record<string, string>)[role] ?? role;
}

export interface DeclarationRow {
  name: string;
  type: string;
  role: DeclarationRole;
  label: string;
}

export interface DraftFields {
  name: string;
  /** 学科：入库时**必须**是受控词表（`data/fields.mjs` 的 FIELD_IDS）里的值，否则发布会多一条阻断项。 */
  discipline: string;
  construct: string;
  case: string;
  summary: string;
  reading: string;
  background: string;
  /** 参数类型表：界面按行编辑，保存时序列化成 `specSource.declarations` 文本。 */
  declarations: DeclarationRow[];
  definitions: string;
  assumptions: string;
  statement: string;
  claims: string;
}

export const EMPTY_DECLARATION: DeclarationRow = { name: '', type: '', role: 'object', label: '' };

export function emptyFields(): DraftFields {
  return {
    name: '', discipline: '', construct: 'Concept', case: 'group', summary: '', reading: '',
    background: '', declarations: [{ ...EMPTY_DECLARATION }],
    definitions: '', assumptions: '', statement: '', claims: '',
  };
}

/**
 * 参数类型表的文本口径（写死在这里，服务端与界面共用同一段序列化）：
 *
 * ```
 * 名字 : 类型 [ # 说明 ]
 * ```
 *
 * 空行与以 `#` 开头的整行注释忽略；缺名字或缺类型的行保留原文，交由 `/formal/validate`
 * 报位置错误——界面不替它补默认值。
 */
export function declarationsToSource(rows: DeclarationRow[]): string {
  return rows
    .filter((row) => row.name.trim() || row.type.trim() || row.label.trim())
    .map((row) => {
      const head = `${row.name.trim()} : ${row.type.trim()}`;
      return row.label.trim() ? `${head}   # ${row.label.trim()}` : head;
    })
    .join('\n');
}

export function parseDeclarationsSource(source: string): DeclarationRow[] {
  const rows: DeclarationRow[] = [];
  for (const rawLine of source.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const [head, ...rest] = line.split('#');
    const label = rest.join('#').trim();
    const colon = head.indexOf(':');
    if (colon < 0) {
      rows.push({ ...EMPTY_DECLARATION, name: head.trim(), label });
      continue;
    }
    rows.push({
      name: head.slice(0, colon).trim(),
      type: head.slice(colon + 1).trim(),
      role: 'object',
      label,
    });
  }
  return rows.length ? rows : [{ ...EMPTY_DECLARATION }];
}

const SPEC_SOURCE_KEYS = ['declarations', 'definitions', 'assumptions', 'statement', 'claims'] as const;
export type SpecSourceKey = (typeof SPEC_SOURCE_KEYS)[number];

export const SPEC_FIELD_LABEL: Record<SpecSourceKey, string> = {
  declarations: '参数类型表',
  definitions: '定义（透明缩写）',
  assumptions: '局部假设',
  statement: '陈述（必须解析为认证公式）',
  claims: '派生断言',
};

export const SPEC_FIELD_LABEL_EN: Record<SpecSourceKey, string> = {
  declarations: 'Parameter type table',
  definitions: 'Definitions (transparent abbreviations)',
  assumptions: 'Local assumptions',
  statement: 'Statement (must parse as a certified formula)',
  claims: 'Derived claims',
};

/** 取源码块的显示名（未知键回退键名，不返回空白）。 */
export function specFieldLabel(key: SpecSourceKey | string, locale: Locale = 'zh'): string {
  const table = locale === 'en' ? SPEC_FIELD_LABEL_EN : SPEC_FIELD_LABEL;
  return (table as Record<string, string>)[key] ?? key;
}

export function fieldsToSpecSource(fields: DraftFields): Record<SpecSourceKey, string> {
  return {
    declarations: declarationsToSource(fields.declarations),
    definitions: fields.definitions,
    assumptions: fields.assumptions,
    statement: fields.statement,
    claims: fields.claims,
  };
}

export function draftToFields(draft: AuthoringDraft | null | undefined): DraftFields {
  const base = emptyFields();
  if (!draft) return base;
  const source = (asRecord(draft.specSource) ?? {}) as Record<string, unknown>;
  return {
    name: asString(draft.name, base.name),
    discipline: asString((draft as { discipline?: unknown }).discipline, base.discipline),
    construct: asString(draft.construct, base.construct),
    case: asString(draft.case, base.case),
    summary: asString(draft.summary, base.summary),
    reading: asString(draft.reading, base.reading),
    background: asString(draft.background, base.background),
    declarations: parseDeclarationsSource(asString(source.declarations, '')),
    definitions: asString(source.definitions, ''),
    assumptions: asString(source.assumptions, ''),
    statement: asString(source.statement, ''),
    claims: asString(source.claims, ''),
  };
}

/** 服务端草稿的写入体（PATCH 只发这些字段；空字符串是**真的空**，不是「未修改」）。 */
export interface DraftPatch {
  name?: string;
  /** 学科：写进编写库的 `node.discipline`，发布时由 `buildNodeRecord` 核对受控词表。 */
  discipline?: string;
  construct?: string;
  case?: string;
  summary?: string;
  reading?: string;
  background?: string;
  specSource?: Record<SpecSourceKey, string>;
  /** 解析后的归一 spec（只在它与当前源码一致时随草稿保存，避免存下过期表达）。 */
  spec?: unknown | null;
  /** 最近一次解析结果（服务端允许整块存，便于下次打开时还原「上次检查」）。 */
  validation?: unknown | null;
}

export function fieldsToPatch(fields: DraftFields): DraftPatch {
  return {
    name: fields.name,
    discipline: fields.discipline,
    construct: fields.construct,
    case: fields.case,
    summary: fields.summary,
    reading: fields.reading,
    background: fields.background,
    specSource: fieldsToSpecSource(fields),
  };
}

export const PENDING_TEXT = '待补充';
export const PENDING_TEXT_EN = 'To be supplied';

/**
 * 空着的解释一律显示「待补充」——不生成占位内容，也不留一个空框让人以为加载失败。
 *
 * `locale` 只影响**这个占位符本身**（英文站上是 `To be supplied`）；有内容时原样返回，
 * 内容永不翻译（它来自草稿或服务端）。
 */
export function pending(text: string | null | undefined, locale: Locale = 'zh'): { text: string; pending: boolean } {
  const value = (text ?? '').trim();
  return value ? { text: value, pending: false } : { text: locale === 'en' ? PENDING_TEXT_EN : PENDING_TEXT, pending: true };
}

/* ==========================================================================
 * 4. 四案例模板（服务端登记表未装配时的兜底）
 * ======================================================================== */

export interface AuthoringTemplate {
  id: string;
  case: string;
  title: string;
  note: string;
  /** 只填「骨架」字段：案例、背景、参数类型表。陈述与解释留空，由登记人填写。 */
  fields: DraftFields;
}

function templateDeclarations(rows: Array<[string, string, DeclarationRole, string]>): DeclarationRow[] {
  return rows.map(([name, type, role, label]) => ({ name, type, role, label }));
}

/**
 * 四案例骨架模板。
 *
 * **只填骨架**：背景、参数类型表（符号及其类型）、案例归属。陈述、假设、定义与中文解释
 * 一律留空并显示「待补充」——模板不能替登记人写数学内容，否则「检查表达」这一步就成了
 * 走过场。符号与背景的对应关系来自规格 §2.4 的背景标识。
 */
export const FALLBACK_TEMPLATES: AuthoringTemplate[] = [
  {
    id: 'tpl-limit',
    case: 'limit',
    title: '极限：序列收敛骨架',
    note: '背景 `bg:limit/1`；只给出序列、极限与收敛谓词的参数类型，陈述与解释留空待填。',
    fields: {
      ...emptyFields(),
      name: '（待命名）序列收敛',
      case: 'limit',
      discipline: '分析',
      background: 'bg:limit/1',
      declarations: templateDeclarations([
        ['N', 'Set', 'object', '指标集'],
        ['R', 'Set', 'object', '实数集'],
        ['seq', 'N -> R', 'function', '序列'],
        ['L', 'R', 'element', '候选极限'],
        ['tendsTo', '(N -> R) -> R -> o', 'predicate', '收敛谓词'],
      ]),
    },
  },
  {
    id: 'tpl-manifold',
    case: 'manifold',
    title: '流形：C^k 结构骨架',
    note: '背景 `bg:manifold/1`；给出坐标卡与图册的参数类型，光滑性条件留空待填。',
    fields: {
      ...emptyFields(),
      name: '（待命名）C^k 结构',
      case: 'manifold',
      discipline: '微分几何',
      background: 'bg:manifold/1',
      declarations: templateDeclarations([
        ['M', 'Set', 'object', '底空间'],
        ['Rn', 'Set', 'object', '坐标空间'],
        ['chart', 'M -> Rn', 'function', '坐标卡'],
        ['atlas', 'Set', 'object', '图册'],
        ['smooth', '(M -> Rn) -> o', 'predicate', '光滑性谓词'],
      ]),
    },
  },
  {
    id: 'tpl-tensor',
    case: 'tensor',
    title: '张量：多重线性骨架',
    note: '背景 `bg:tensor/1`；给出向量空间、对偶与多重线性映射的参数类型，张量积性质留空待填。',
    fields: {
      ...emptyFields(),
      name: '（待命名）张量积',
      case: 'tensor',
      discipline: '多重线性与张量代数',
      background: 'bg:tensor/1',
      declarations: templateDeclarations([
        ['V', 'Set', 'object', '向量空间'],
        ['Vdual', 'Set', 'object', '对偶空间'],
        ['mul', 'V -> V -> V', 'function', '双线性乘法'],
        ['multi', '(V -> V -> V) -> o', 'predicate', '多重线性谓词'],
      ]),
    },
  },
  {
    id: 'tpl-group',
    case: 'group',
    title: '群：群公理骨架',
    note: '背景 `bg:group/1`；给出对象集、乘法、单位与逆元的参数类型，群公理与交换性留空待填。',
    fields: {
      ...emptyFields(),
      name: '（待命名）群结构',
      case: 'group',
      discipline: '群论',
      background: 'bg:group/1',
      declarations: templateDeclarations([
        ['G', 'Set', 'object', '群的对象集'],
        ['mul', 'G -> G -> G', 'function', '乘法'],
        ['e', 'G', 'element', '单位元'],
        ['inv', 'G -> G', 'function', '逆元'],
        ['groupConcept', 'o', 'proposition', '群概念'],
      ]),
    },
  },
];

/* ==========================================================================
 * 5. 本地草稿（自动保存与恢复；键带版本号；不依赖学习者档案）
 * ======================================================================== */

/**
 * 本地草稿的存储键前缀。
 *
 * 带 `-v1` 是为了**改字段格式时旧草稿不会假装兼容**：读不出当前版本就当没有草稿，
 * 而不是把旧字段硬塞进新界面（那会让用户以为内容还在）。
 * 键里没有 `profileId`：编写草稿属于站点维护，不进学习者档案 E。
 */
export const LOCAL_DRAFT_PREFIX = 'mcs-authoring-draft-v1';
export const LOCAL_DRAFT_SCHEMA = 1;

export type ReviewDecision = 'accepted' | 'dismissed' | null;

export interface LocalDraftRecord {
  schema: number;
  key: string;
  fields: DraftFields;
  /** 服务端草稿 id 与修订号（未接服务端时为 null；本地草稿照样可用）。 */
  draftId: string | null;
  draftRevision: number | null;
  /** 审阅决策：候选 id → 采纳/驳回；未列出的表示「未审阅」。 */
  decisions: Record<string, ReviewDecision>;
  /** 最近一次解析结果与它对应的源码快照：刷新后仍能看到上次的错误位置。 */
  validation: ValidateResult | null;
  validatedSource: Record<SpecSourceKey, string> | null;
  savedAt: string;
}

/**
 * 检查结果是否已经过期。
 *
 * 判据是**源码快照**：检查之后又改了任何一个源码块，这份结果就不再对应当前草稿，
 * 界面必须显式说明「这是上一次的结果」，并且**不**把它当作可入库的依据。
 */
export function isValidationStale(validatedSource: Record<SpecSourceKey, string> | null, fields: DraftFields): boolean {
  if (!validatedSource) return false;
  const current = fieldsToSpecSource(fields);
  return (Object.keys(current) as SpecSourceKey[]).some((key) => current[key] !== validatedSource[key]);
}

/**
 * 草稿内容的签名。
 *
 * 为什么需要它：**入库用的是服务端那一份草稿**（发布事务从编写库里取 `spec` / `specSource`），
 * 而编辑区改的是浏览器里的这一份。两者不一致时必须显式说出来，并且在保存之前不让入库——
 * 否则会出现「屏幕上是一版、发出去的是另一版」这种最难查的偏差。
 */
export function draftSignature(fields: DraftFields): string {
  return JSON.stringify([
    fields.name, fields.discipline, fields.construct, fields.case, fields.summary, fields.reading,
    fields.background, fieldsToSpecSource(fields),
  ]);
}

export function localDraftKey(nodeRef: string | null): string {
  return `${LOCAL_DRAFT_PREFIX}:${nodeRef ?? 'new'}`;
}

function storage(): Storage | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function readLocalDraft(key: string): LocalDraftRecord | null {
  const store = storage();
  if (!store) return null;
  try {
    const raw = store.getItem(key);
    if (!raw) return null;
    const parsed = asRecord(JSON.parse(raw));
    if (!parsed || parsed.schema !== LOCAL_DRAFT_SCHEMA) return null;
    const fields = asRecord(parsed.fields);
    if (!fields) return null;
    const decisions: Record<string, ReviewDecision> = {};
    const rawDecisions = asRecord(parsed.decisions) ?? {};
    for (const [id, value] of Object.entries(rawDecisions)) {
      if (value === 'accepted' || value === 'dismissed') decisions[id] = value;
    }
    return {
      schema: LOCAL_DRAFT_SCHEMA,
      key,
      fields: {
        ...emptyFields(),
        name: asString(fields.name),
        discipline: asString(fields.discipline),
        construct: asString(fields.construct, 'Concept'),
        case: asString(fields.case, 'group'),
        summary: asString(fields.summary),
        reading: asString(fields.reading),
        background: asString(fields.background),
        declarations: Array.isArray(fields.declarations) && fields.declarations.length
          ? (fields.declarations as unknown[]).map((row) => {
            const record = asRecord(row) ?? {};
            const role = asString(record.role, 'object') as DeclarationRole;
            return {
              name: asString(record.name),
              type: asString(record.type),
              role: (['object', 'element', 'function', 'predicate', 'proposition'] as string[]).includes(role) ? role : 'object',
              label: asString(record.label),
            };
          })
          : [{ ...EMPTY_DECLARATION }],
        definitions: asString(fields.definitions),
        assumptions: asString(fields.assumptions),
        statement: asString(fields.statement),
        claims: asString(fields.claims),
      },
      draftId: typeof parsed.draftId === 'string' ? parsed.draftId : null,
      draftRevision: typeof parsed.draftRevision === 'number' ? parsed.draftRevision : null,
      decisions,
      // 上次解析结果与其源码快照：读不出来就当没有（宁可让人重跑一次检查，也不显示过期结论）。
      validation: asRecord(parsed.validation) ? normalizeValidate(parsed.validation) : null,
      validatedSource: (() => {
        const record = asRecord(parsed.validatedSource);
        if (!record) return null;
        return {
          declarations: asString(record.declarations),
          definitions: asString(record.definitions),
          assumptions: asString(record.assumptions),
          statement: asString(record.statement),
          claims: asString(record.claims),
        };
      })(),
      savedAt: asString(parsed.savedAt),
    };
  } catch {
    return null;
  }
}

export function writeLocalDraft(record: LocalDraftRecord): void {
  const store = storage();
  if (!store) return;
  try {
    store.setItem(record.key, JSON.stringify({ ...record, schema: LOCAL_DRAFT_SCHEMA }));
  } catch { /* 隐私模式或配额满：草稿退化为「本次会话可用、刷新后丢失」，不阻断编写 */ }
}

export function clearLocalDraft(key: string): void {
  const store = storage();
  if (!store) return;
  try { store.removeItem(key); } catch { /* 同上 */ }
}

/** 草稿是否「等于空」：真正的空草稿不落盘，避免刷新后又冒出来一个空案例。 */
export function isBlankFields(fields: DraftFields): boolean {
  return !fields.name.trim() && !fields.discipline.trim() && !fields.summary.trim() && !fields.reading.trim()
    && !fields.definitions.trim() && !fields.assumptions.trim() && !fields.statement.trim()
    && !fields.claims.trim() && fields.declarations.every((row) => !row.name.trim() && !row.type.trim() && !row.label.trim());
}

/* ==========================================================================
 * 6. 形式目录（背景、符号、模板、预算）
 * ======================================================================== */

export interface CatalogSymbol { name: string; type: string; note?: string }
export interface CatalogOperator { token: string; alias: string[]; note: string; /** 语言明确**不接受**的记号（例如析取）：只作为说明，不给插入。 */ rejected: boolean }
export interface CatalogBackground {
  id: string;
  version: string;
  title: string;
  note: string;
  constants: CatalogSymbol[];
  symbols: CatalogSymbol[];
}
export interface CatalogTemplate { id: string; case: string; title: string; note: string; draft: Partial<AuthoringDraft> }
export interface DiscoveryBudget { maxCandidates: number; perCandidateMs: number; totalMs: number; depth: number; maxStates: number }
export interface CatalogCoverage { case: string; nodes: number; specs: number; missing: string[] }

export interface FormalCatalogView {
  /** 解析器未就绪时为 null（服务端如实返回 null，不假装有版本号）。 */
  languageVersion: string | null;
  languageReady: boolean;
  backgrounds: CatalogBackground[];
  templates: CatalogTemplate[];
  boundedTypes: Array<{ name: string; note: string }>;
  budgets: DiscoveryBudget | null;
  operators: CatalogOperator[];
  coverage: CatalogCoverage[];
  coverageNote: string;
  instances: Array<{ id: string; note: string }>;
  extension: { activeRevision: string | null; revisions: number; nodes: number };
}

export const DEFAULT_BUDGET: DiscoveryBudget = { maxCandidates: 100, perCandidateMs: 2000, totalMs: 30000, depth: 8, maxStates: 10000 };

/**
 * 背景里的常量与符号。
 *
 * 两种排布都要认：`constants` 用 `{name, type, note}`，而 `symbols` 用 `{symbol, type, note}`
 * （见 `shared/formal.d.ts` 与 `core/formal/backgrounds.mjs`）。这里归一成 `name`，
 * 界面只处理一种形状；识别不出来的条目不进候选，也不编一个名字。
 */
function normalizeSymbols(value: unknown): CatalogSymbol[] {
  return asArray(value).map((item) => {
    const record = asRecord(item) ?? {};
    return {
      name: asString(record.name) || asString(record.symbol),
      type: asString(record.type),
      note: asString(record.note) || undefined,
    };
  }).filter((item) => item.name);
}

function normalizeCatalog(raw: unknown): FormalCatalogView {
  const record = asRecord(raw) ?? {};
  const budgets = asRecord(record.budgets);
  return {
    languageVersion: typeof record.languageVersion === 'string' ? record.languageVersion : null,
    languageReady: record.languageReady === true,
    backgrounds: asArray(record.backgrounds).map((item) => {
      const entry = asRecord(item) ?? {};
      return {
        id: asString(entry.id),
        version: asString(entry.version, '1'),
        title: asString(entry.title, asString(entry.id)),
        note: asString(entry.note),
        constants: normalizeSymbols(entry.constants),
        symbols: normalizeSymbols(entry.symbols),
      };
    }).filter((item) => item.id),
    templates: asArray(record.templates).map((item) => {
      const entry = asRecord(item) ?? {};
      return {
        id: asString(entry.id),
        case: asString(entry.case),
        title: asString(entry.title),
        note: asString(entry.note),
        draft: asRecord(entry.draft) ?? {},
      };
    }).filter((item) => item.id),
    boundedTypes: asArray(record.boundedTypes).map((item) => {
      const entry = asRecord(item) ?? {};
      return { name: asString(entry.name), note: asString(entry.note) };
    }),
    budgets: budgets ? {
      maxCandidates: asNumber(budgets.maxCandidates, DEFAULT_BUDGET.maxCandidates),
      perCandidateMs: asNumber(budgets.perCandidateMs, DEFAULT_BUDGET.perCandidateMs),
      totalMs: asNumber(budgets.totalMs, DEFAULT_BUDGET.totalMs),
      depth: asNumber(budgets.depth, DEFAULT_BUDGET.depth),
      maxStates: asNumber(budgets.maxStates, DEFAULT_BUDGET.maxStates),
    } : null,
    operators: asArray(record.operators).map((item) => {
      const entry = asRecord(item) ?? {};
      return {
        token: asString(entry.token),
        alias: asStringArray(entry.alias),
        note: asString(entry.note),
        rejected: entry.rejected === true,
      };
    }),
    coverage: asArray(record.coverage).map((item) => {
      const entry = asRecord(item) ?? {};
      return { case: asString(entry.case), nodes: asNumber(entry.nodes), specs: asNumber(entry.specs), missing: asStringArray(entry.missing) };
    }),
    coverageNote: asString(record.coverageNote),
    instances: asArray(record.instances).map((item) => {
      const entry = asRecord(item) ?? {};
      return { id: asString(entry.id), note: asString(entry.note) };
    }),
    extension: (() => {
      const entry = asRecord(record.extension) ?? {};
      return {
        activeRevision: typeof entry.activeRevision === 'string' ? entry.activeRevision : null,
        revisions: asNumber(entry.revisions),
        nodes: asNumber(entry.nodes),
      };
    })(),
  };
}

export function fetchCatalog(signal?: AbortSignal): Promise<Attempt<FormalCatalogView>> {
  return attempt<unknown>('/formal/catalog', { signal }).then((result) => (
    result.ok ? { ok: true, data: normalizeCatalog(result.data) } : result
  ));
}

/* ==========================================================================
 * 7. 校验（查错）与错误位置
 * ======================================================================== */

export interface ValidateProblem {
  code: string;
  message: string;
  /** 行号/列号由服务端给出（1 起算，相对它报错的那一段源码）；缺省表示服务端没给位置。 */
  line: number | null;
  column: number | null;
  token: string | null;
  /** 若服务端指明属于哪个源码块（declarations/statement/…），就能直接定位到输入框。 */
  field: string | null;
}

export interface ValidateWarning { code: string; message: string }

export interface ValidateResult {
  ok: boolean;
  problems: ValidateProblem[];
  /** 「需要人看一眼但不拦路」的项（背景未登记、引用哈希无从核对、未绑定节点…）。 */
  warnings: ValidateWarning[];
  /** 服务端给出的规范读法与 TeX；没给就为 null，界面如实显示「未返回」。 */
  statementReadable: string | null;
  statementTex: string | null;
  assumptionsReadable: string[];
  assumptionsTex: string[];
  claimsReadable: string[];
  hash: string | null;
  specVersion: string | null;
  notes: string[];
  /** 解析后的归一 spec（服务端 `parseSpec` 的产物）：保存草稿时随草稿一起存。 */
  spec: unknown | null;
}

function normalizeProblem(raw: unknown): ValidateProblem {
  const record = asRecord(raw) ?? {};
  return {
    code: asString(record.code, 'unknown'),
    message: asString(record.message, '（服务端未给出说明）'),
    line: typeof record.line === 'number' ? record.line : null,
    column: typeof record.column === 'number' ? record.column : null,
    token: typeof record.token === 'string' && record.token ? record.token : null,
    field: typeof record.field === 'string' && record.field ? record.field : null,
  };
}

function normalizeWarning(raw: unknown): ValidateWarning {
  const record = asRecord(raw) ?? {};
  return { code: asString(record.code, 'warning'), message: asString(record.message, '（服务端未给出说明）') };
}

function normalizeValidate(raw: unknown): ValidateResult {
  const record = asRecord(raw) ?? {};
  const readable = asRecord(record.readable) ?? {};
  const tex = asRecord(record.tex) ?? {};
  const specRecord = asRecord(record.spec);
  return {
    ok: record.ok === true,
    problems: asArray(record.problems).map(normalizeProblem),
    warnings: asArray(record.warnings).map(normalizeWarning),
    statementReadable: typeof readable.statement === 'string' ? readable.statement
      : typeof record.statementReadable === 'string' ? record.statementReadable : null,
    statementTex: typeof tex.statement === 'string' ? tex.statement : null,
    assumptionsReadable: asStringArray(readable.assumptions ?? record.assumptionsReadable),
    assumptionsTex: asStringArray(tex.assumptions),
    claimsReadable: asStringArray(readable.claims ?? record.claimsReadable),
    hash: typeof record.hash === 'string' ? record.hash : (specRecord?.hash as string | undefined) ?? null,
    specVersion: typeof record.specVersion === 'string' ? record.specVersion : (typeof specRecord?.specVersion === 'string' ? specRecord.specVersion : null),
    notes: asStringArray(record.notes),
    spec: specRecord ?? null,
  };
}

/** 定义行：`def 名字 : 类型 = 项`。名字必须与解析层的口径一致（Unicode 字母 + 若干数学后缀）。 */
const DEFINITION_LINE = /^\s*def\s+([\p{L}_][\p{L}\p{N}_'′₀-₉]*)/u;
/** 结构化写法：`名字 : 类型 = 项`（登记表与模板用的就是这一种）。 */
const STRUCTURED_DEFINITION = /^\s*([\p{L}_][\p{L}\p{N}_'′₀-₉]*)\s*:([^=]*)=([\s\S]*)$/u;
/** 最简写法：`名字 = 项`。 */
const BARE_DEFINITION = /^\s*([\p{L}_][\p{L}\p{N}_'′₀-₉]*)\s*=\s*([\s\S]*)$/u;

/**
 * 一行定义 → 解析层要的 `{name, source, type?}`。
 *
 * 三种写法都收（编辑区手写、登记表与模板导出、最简赋值）；**拆不出来的行原样交出去**，
 * 让解析器报错并给出位置，而不是在这里猜一个定义体。
 */
export function definitionEntry(line: string, index: number): { name: string; source: string; type?: string } {
  const defForm = DEFINITION_LINE.exec(line);
  if (defForm) return { name: defForm[1], source: line.trim() };
  const structured = STRUCTURED_DEFINITION.exec(line);
  if (structured) {
    const type = structured[2].trim();
    return { name: structured[1], source: structured[3].trim(), ...(type ? { type } : {}) };
  }
  const bare = BARE_DEFINITION.exec(line);
  if (bare) return { name: bare[1], source: bare[2].trim() };
  return { name: `def${index + 1}`, source: line.trim() };
}

function sourceLines(text: string): string[] {
  return text.split(/\r?\n/).map((line) => line.trim()).filter((line) => line.length > 0 && !line.startsWith('#'));
}

/**
 * 把草稿字段组成 §1.6 的 **formalSpec 原始输入**，交给解析层 `parseSpec`。
 *
 * 为什么要有这一步：编辑区的四个源码块是**给人写的一行行文本**，而解析层要的是
 * `statement: {source, kind}`、`assumptions: [{id, source}]` 这样的结构。转换只做
 * 「一行 = 一条」的机械拆分，**不补默认值、不猜测类型**：写不出来就让解析器报出来。
 */
export function specFromFields(
  fields: DraftFields,
  options: { nodeRef?: { node: string; version: string } | null; draftId?: string | null; nodeId?: string | null } = {},
): Record<string, unknown> {
  return {
    specVersion: FORMAL_SPEC_VERSION,
    /*
     * 节点 id 的来源按可靠性排序：显式传入（界面按名称派生的那个）> 来源节点 > 空。
     *
     * 「空值也要继续往下退」而不是就地把空字符串用掉：`options.nodeId` 是**可能为空串**的
     * （界面在名称为空时不编占位 id，于是传进来的是 `''`）。早先写的是
     * `options.nodeId ?? …`，`''` 不是 nullish，会把来源节点也一起短路掉——
     * 从节点页「以此为基础创建」进来的路径就会丢掉那个真实的 node id。
     * 现在按"非空才算数"逐级退，最后才是空串。
     */
    node: [options.nodeId, options.nodeRef?.node].find((value) => typeof value === 'string' && value.trim().length > 0) ?? '',
    nodeVersion: options.nodeRef?.version ?? '1',
    background: fields.background.trim(),
    theoryVersion: '1',
    declarations: fields.declarations
      .filter((row) => row.name.trim() && row.type.trim())
      .map((row) => ({
        name: row.name.trim(),
        type: row.type.trim(),
        role: row.role,
        ...(row.label.trim() ? { label: row.label.trim() } : {}),
      })),
    definitions: sourceLines(fields.definitions).map((line, index) => definitionEntry(line, index)),
    assumptions: sourceLines(fields.assumptions).map((line, index) => ({ id: `A${index + 1}`, source: line })),
    statement: { source: fields.statement.trim(), kind: 'formula' },
    claims: sourceLines(fields.claims).map((line, index) => ({ id: `C${index + 1}`, source: line, role: 'derived' })),
    references: [],
    boundary: [],
    // 来源写清楚是「本机编辑页登记」，不冒充从专稿核对过。
    source: options.draftId ? `本机编辑页登记（草稿 ${options.draftId}）` : '本机编辑页登记',
  };
}

/**
 * 请求解析与类型检查。
 *
 * 请求体给两份东西：`spec`（解析层要的结构）与 `specSource`（用户写的原文，随草稿保存）。
 * 这样「检查」用的就是**草稿里的那份表达**，而不是另拼一份可能已经走样的输入。
 * **这一步不改任何状态**。
 */
export function validateDraft(
  fields: DraftFields,
  extra: {
    draftId?: string | null;
    draftRevision?: number | null;
    nodeRef?: { node: string; version: string } | null;
    nodeId?: string | null;
  } = {},
): Promise<Attempt<ValidateResult>> {
  return attempt<unknown>('/formal/validate', {
    method: 'POST',
    body: {
      spec: specFromFields(fields, { nodeRef: extra.nodeRef ?? null, draftId: extra.draftId ?? null, nodeId: extra.nodeId ?? null }),
      draftId: extra.draftId ?? null,
      draftRevision: extra.draftRevision ?? null,
      name: fields.name,
      construct: fields.construct,
      case: fields.case,
      summary: fields.summary,
      reading: fields.reading,
      specSource: fieldsToSpecSource(fields),
    },
  }).then((result) => (result.ok ? { ok: true, data: normalizeValidate(result.data) } : result));
}

export interface ProblemLocation {
  field: SpecSourceKey | null;
  line: number | null;
  column: number | null;
  /** 能否在输入框里真的选中那一段；不能时要如实说明只是「给了行号」。 */
  precise: boolean;
  /** 判据是什么：服务端给的字段、记号命中、消息前缀，还是判不出来。 */
  basis: 'field' | 'token' | 'message-prefix' | 'none';
}

/**
 * 把一条问题定位到具体的源码块。
 *
 * 判据按可靠性排序，**逐条可解释**：
 *
 * 1. 服务端显式给的 `field`（解析层 `failAt` 的 `details.field`）；
 * 2. 用 `token` 在各块里查找——解析报错一定带着出错的那个记号；
 * 3. 消息前缀：解析层的缺字段错误都以字段名开头（`statement.source 必须是非空字符串`、
 *    `declarations[0].name ...`），按前缀映射到对应输入框；
 * 4. 都拿不到就**不猜**：保留行号并标明未能定位（`precise: false`），
 *    免得用户照着错的行号去改另一块内容。
 */
export function locateProblem(problem: ValidateProblem, fields: DraftFields): ProblemLocation {
  const sources = fieldsToSpecSource(fields);
  const keys = Object.keys(sources) as SpecSourceKey[];
  if (problem.field && keys.includes(problem.field as SpecSourceKey)) {
    return { field: problem.field as SpecSourceKey, line: problem.line, column: problem.column, precise: true, basis: 'field' };
  }
  if (problem.token) {
    const hit = keys.find((key) => sources[key].includes(problem.token as string));
    if (hit) return { field: hit, line: problem.line, column: problem.column, precise: Boolean(problem.line), basis: 'token' };
  }
  const byPrefix = keys.find((key) => problem.message.trimStart().startsWith(key));
  if (byPrefix) {
    return { field: byPrefix, line: problem.line, column: problem.column, precise: Boolean(problem.line), basis: 'message-prefix' };
  }
  return { field: null, line: problem.line, column: problem.column, precise: false, basis: 'none' };
}

/**
 * 位置文本（给界面显示用）：`问题在源码的哪一行/哪一列`。
 *
 * 中文是源语言（`第 3 行第 5 列`），英文用 `line 3, column 5`；`locale` 默认 `'zh'`，
 * 既有调用与中文站逐字不变。
 */
export function problemLocationText(problem: ValidateProblem, locale: Locale = 'zh'): string {
  if (problem.line === null) return locale === 'en' ? 'the server gave no location' : '服务端未给出位置';
  if (locale === 'en') {
    return problem.column === null ? `line ${problem.line}` : `line ${problem.line}, column ${problem.column}`;
  }
  return problem.column === null ? `第 ${problem.line} 行` : `第 ${problem.line} 行第 ${problem.column} 列`;
}

/* ==========================================================================
 * 8. 草稿（服务端编写库，不混入学习者 E 库）
 * ======================================================================== */

export interface DraftListView { drafts: AuthoringDraft[]; unavailable: UnavailableInfo | null; problems: string[] }

export async function listDrafts(): Promise<DraftListView> {
  const result = await attempt<unknown>('/authoring/drafts');
  if (!result.ok) return { drafts: [], unavailable: result.unavailable, problems: [describeFailure(result.error, result.unavailable)] };
  const record = asRecord(result.data) ?? {};
  return { drafts: asArray(record.drafts) as AuthoringDraft[], unavailable: null, problems: [] };
}

export async function fetchDraft(id: string): Promise<Attempt<AuthoringDraft | null>> {
  const result = await attempt<unknown>(`/authoring/drafts/${encodeURIComponent(id)}`);
  if (!result.ok) return result;
  const record = asRecord(result.data) ?? {};
  return { ok: true, data: (asRecord(record.draft) ?? record) as unknown as AuthoringDraft };
}

export async function createDraft(fields: DraftFields, ontologyVersion: string | null, extra: DraftPatch = {}): Promise<Attempt<AuthoringDraft | null>> {
  const result = await attempt<unknown>('/authoring/drafts', {
    method: 'POST',
    body: { ...fieldsToPatch(fields), ...extra, ontologyVersion: ontologyVersion ?? undefined },
  });
  if (!result.ok) return result;
  const record = asRecord(result.data) ?? {};
  return { ok: true, data: (asRecord(record.draft) ?? record) as unknown as AuthoringDraft };
}

/**
 * 带期望修订号的更新（乐观锁）。
 *
 * `expectedRevision` 是协议硬要求：两个标签页同时编辑时，后提交的拿到 409 而不是
 * 悄悄覆盖别人刚写的公式。冲突要显示给用户，并保留本地草稿。
 */
export async function updateDraft(id: string, patch: DraftPatch, expectedRevision: number, ontologyVersion: string | null): Promise<Attempt<AuthoringDraft | null>> {
  const result = await attempt<unknown>(`/authoring/drafts/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: { ...patch, expectedRevision, ontologyVersion: ontologyVersion ?? undefined },
  });
  if (!result.ok) return result;
  const record = asRecord(result.data) ?? {};
  return { ok: true, data: (asRecord(record.draft) ?? record) as unknown as AuthoringDraft };
}

/* ==========================================================================
 * 9. 自动发现任务（后台运行，不阻塞页面）
 * ======================================================================== */

export interface StartDiscoveryRequest {
  draftId?: string | null;
  draftRevision?: number | null;
  node?: string | null;
  nodeVersion?: string | null;
  background: string;
  budget?: Partial<DiscoveryBudget>;
  ontologyVersion?: string | null;
}

/**
 * 候选的界面视图。
 *
 * 与 `shared/formal.d.ts` 的 `RelationCandidate` 同形，只有两处放宽，且都是**往保守方向**放：
 * `evidence` 用本站既有的展示形状（字段全是字符串，能原样显示服务端给的证据标签）；
 * `replay.status` 保留原始字符串。除此以外字段名与含义与 §5 完全一致。
 *
 * `problems` 记录归一过程中发现的形状问题（例如关系种类不在 §2.11 的六种里）。
 * 这类问题**不会**把候选升级成「已验证」：判不出来就按未决处理。
 */
export interface CandidateView extends Omit<RelationCandidate, 'evidence' | 'replay'> {
  evidence: EvidenceRecord | null;
  replay: { status: string; at: string; durationMs: number } | null;
  problems: string[];
}

/** 发现任务视图：候选换成 `CandidateView`，其余与 §5 的 `DiscoveryRun` 一致。 */
export interface RunView extends Omit<DiscoveryRun, 'candidates'> {
  candidates: CandidateView[];
}

const MATH_JUDGMENTS: MathJudgment[] = ['verified', 'refuted', 'undecided'];
const RUN_STATUSES: Array<DiscoveryRun['status']> = ['queued', 'running', 'completed', 'interrupted', 'cancelled', 'error'];
const RELATION_KINDS: RelationKind[] = ['definitionReference', 'hardGeneralization', 'equivalentTo', 'conditionalDerivation', 'instanceOf', 'counterexampleTo'];
const REVIEW_STATUSES: ReviewStatus[] = ['pending', 'accepted', 'dismissed', 'published', 'stale'];

function normalizeCandidate(raw: unknown): CandidateView | null {
  const record = asRecord(raw);
  if (!record) return null;
  const id = asString(record.id);
  if (!id) return null;
  const problems: string[] = [];
  const from = asRecord(record.from) ?? {};
  const to = asRecord(record.to) ?? {};
  const direction = asRecord(record.direction);
  const goal = asRecord(record.goal);
  const math = asRecord(record.math) ?? {};
  const run = asRecord(record.run) ?? {};
  const replay = asRecord(record.replay);
  const counterexample = asRecord(record.counterexample);

  const rawMath = asString(math.status, '');
  if (rawMath && !MATH_JUDGMENTS.includes(rawMath as MathJudgment)) {
    problems.push(`数学判断「${rawMath}」不在 verified / refuted / undecided 之内，按未决处理（不升级为已验证）。`);
  }
  const rawKind = asString(record.kind, '');
  if (rawKind && !RELATION_KINDS.includes(rawKind as RelationKind)) {
    problems.push(`关系种类「${rawKind}」不在 §2.11 的六种里，按「定义引用」显示但未识别。`);
  }
  const rawRun = asString(run.status, '');
  if (rawRun && !RUN_STATUSES.includes(rawRun as DiscoveryRun['status'])) {
    problems.push(`候选执行状态「${rawRun}」不在协议枚举里，按「执行错误」显示。`);
  }
  const rawReview = asString(record.review, 'pending');
  if (!REVIEW_STATUSES.includes(rawReview as ReviewStatus)) {
    problems.push(`审阅状态「${rawReview}」不在协议枚举里，按「未审阅」显示。`);
  }

  return {
    id,
    runId: asString(record.runId),
    kind: (RELATION_KINDS.includes(rawKind as RelationKind) ? rawKind : 'definitionReference') as RelationKind,
    from: { node: asString(from.node), version: asString(from.version, '1') },
    to: { node: asString(to.node), version: asString(to.version, '1') },
    direction: direction ? { general: asString(direction.general), special: asString(direction.special) } : null,
    conditions: asArray(record.conditions).map((item) => {
      const entry = asRecord(item) ?? {};
      return { id: asString(entry.id), source: asString(entry.source), readable: asString(entry.readable) };
    }),
    goal: goal ? { source: asString(goal.source), canonical: goal.canonical ?? null, hash: asString(goal.hash) } : null,
    reason: asString(record.reason),
    math: {
      status: (MATH_JUDGMENTS.includes(rawMath as MathJudgment) ? rawMath : 'undecided') as MathJudgment,
      reason: asString(math.reason),
      scope: asString(math.scope),
    },
    run: {
      status: (RUN_STATUSES.includes(rawRun as DiscoveryRun['status']) ? rawRun : 'error') as RunStatus,
      reason: asString(run.reason),
      stats: (asRecord(run.stats) ?? {}) as Record<string, number>,
    },
    review: (REVIEW_STATUSES.includes(rawReview as ReviewStatus) ? rawReview : 'pending') as ReviewStatus,
    evidence: normalizeEvidence(record.evidence),
    counterexample: counterexample ? {
      model: asString(counterexample.model),
      assignment: (asRecord(counterexample.assignment) ?? {}),
      note: asString(counterexample.note),
    } : null,
    replay: replay ? {
      status: asString(replay.status, 'not_run'),
      at: asString(replay.at),
      durationMs: asNumber(replay.durationMs),
    } : null,
    generatorVersion: asString(record.generatorVersion),
    inputHash: asString(record.inputHash),
    problems,
  };
}

function normalizeEvidence(raw: unknown): EvidenceRecord | null {
  const record = asRecord(raw);
  if (!record) return null;
  return {
    id: asString(record.id),
    kind: asString(record.kind),
    status: asString(record.status),
    checkStatus: asString(record.checkStatus, 'not_run'),
    title: asString(record.title),
    scope: asString(record.scope),
    nodes: asStringArray(record.nodes),
    certificate: typeof record.certificate === 'string' ? record.certificate : null,
    checker: typeof record.checker === 'string' ? record.checker : null,
    checkerVerified: record.checkerVerified === true,
    openAssumptions: asStringArray(record.openAssumptions),
    obligations: asStringArray(record.obligations),
    reference: typeof record.reference === 'string' ? record.reference : null,
    note: asString(record.note) || undefined,
  };
}

function normalizeRun(raw: unknown): RunView | null {
  const record = asRecord(raw);
  if (!record) return null;
  const id = asString(record.id);
  if (!id) return null;
  const stats = asRecord(record.stats) ?? {};
  const budget = asRecord(record.budget) ?? {};
  const nodeRef = asRecord(record.nodeRef);
  const status = asString(record.status, 'queued');
  return {
    id,
    draftId: typeof record.draftId === 'string' ? record.draftId : null,
    nodeRef: nodeRef ? { node: asString(nodeRef.node), version: asString(nodeRef.version, '1') } : null,
    ontologyVersion: asString(record.ontologyVersion),
    background: asString(record.background),
    status: (RUN_STATUSES.includes(status as DiscoveryRun['status']) ? status : 'error') as DiscoveryRun['status'],
    startedAt: asString(record.startedAt),
    finishedAt: typeof record.finishedAt === 'string' ? record.finishedAt : null,
    budget: {
      maxCandidates: asNumber(budget.maxCandidates, DEFAULT_BUDGET.maxCandidates),
      perCandidateMs: asNumber(budget.perCandidateMs, DEFAULT_BUDGET.perCandidateMs),
      totalMs: asNumber(budget.totalMs, DEFAULT_BUDGET.totalMs),
      depth: asNumber(budget.depth, DEFAULT_BUDGET.depth),
      maxStates: asNumber(budget.maxStates, DEFAULT_BUDGET.maxStates),
    },
    stats: {
      candidates: asNumber(stats.candidates),
      coveredNodes: asNumber(stats.coveredNodes),
      verified: asNumber(stats.verified),
      refuted: asNumber(stats.refuted),
      undecided: asNumber(stats.undecided),
      unprocessed: asNumber(stats.unprocessed),
      durationMs: asNumber(stats.durationMs),
    },
    interrupted: record.interrupted === true,
    candidates: asArray(record.candidates).map(normalizeCandidate).filter((item): item is CandidateView => item !== null),
  };
}

export async function startDiscoveryJob(request: StartDiscoveryRequest): Promise<Attempt<RunView | null>> {
  const result = await attempt<unknown>('/relation-discovery/jobs', {
    method: 'POST',
    body: {
      draftId: request.draftId ?? null,
      draftRevision: request.draftRevision ?? null,
      node: request.node ?? null,
      nodeVersion: request.nodeVersion ?? null,
      background: request.background,
      budget: request.budget,
      ontologyVersion: request.ontologyVersion ?? undefined,
    },
  });
  if (!result.ok) return result;
  const record = asRecord(result.data) ?? {};
  return { ok: true, data: normalizeRun(record.run ?? record) };
}

export async function fetchRun(id: string): Promise<Attempt<RunView | null>> {
  const result = await attempt<unknown>(`/relation-discovery/jobs/${encodeURIComponent(id)}`);
  if (!result.ok) return result;
  return { ok: true, data: normalizeRun(result.data) };
}

export async function listRuns(): Promise<{ runs: RunView[]; unavailable: UnavailableInfo | null; problems: string[] }> {
  const result = await attempt<unknown>('/relation-discovery/jobs');
  if (!result.ok) return { runs: [], unavailable: result.unavailable, problems: [describeFailure(result.error, result.unavailable)] };
  const record = asRecord(result.data) ?? {};
  return {
    runs: asArray(record.runs).map(normalizeRun).filter((item): item is RunView => item !== null),
    unavailable: null,
    problems: [],
  };
}

export async function cancelRun(id: string): Promise<Attempt<RunView | null>> {
  const result = await attempt<unknown>(`/relation-discovery/jobs/${encodeURIComponent(id)}`, { method: 'DELETE' });
  if (!result.ok) return result;
  return { ok: true, data: normalizeRun(result.data) };
}

export interface ReplayOutcome {
  candidateId: string;
  ok: boolean;
  problems: string[];
  checkStatus: string | null;
  checker: string | null;
  checkerSha256: string | null;
  durationMs: number | null;
  note: string;
}

export interface ReplayView { runId: string; results: ReplayOutcome[]; note: string }

export async function replayCandidates(runId: string, candidateIds: string[]): Promise<Attempt<ReplayView | null>> {
  const result = await attempt<unknown>(`/relation-discovery/jobs/${encodeURIComponent(runId)}/replay`, {
    method: 'POST',
    body: { candidateIds },
  });
  if (!result.ok) return result;
  const record = asRecord(result.data) ?? {};
  const check = (value: unknown) => asRecord(value);
  return {
    ok: true,
    data: {
      runId: asString(record.runId, runId),
      note: asString(record.note),
      results: asArray(record.results).map((item) => {
        const entry = asRecord(item) ?? {};
        const info = check(entry.check) ?? {};
        return {
          candidateId: asString(entry.candidateId),
          ok: entry.ok === true,
          problems: asStringArray(entry.problems),
          checkStatus: typeof info.status === 'string' ? info.status : null,
          checker: typeof info.checker === 'string' ? info.checker : null,
          checkerSha256: typeof info.checkerSha256 === 'string' ? info.checkerSha256 : null,
          durationMs: typeof info.durationMs === 'number' ? info.durationMs : null,
          note: asString(info.note),
        };
      }),
    },
  };
}

/* ==========================================================================
 * 10. 审阅：分组、联合输入、网络叠加
 * ======================================================================== */

export interface CandidateGroup {
  status: MathJudgment;
  label: string;
  mark: string;
  tone: 'ok' | 'warn' | 'mid';
  boundary: string;
  candidates: CandidateView[];
}

const GROUP_ORDER: MathJudgment[] = ['verified', 'refuted', 'undecided'];

/**
 * 按数学判断分组。**refuted / undecided 只在这一层出现**，不进入任何「已成立关系」的视图。
 *
 * `locale` 只影响分组标题与边界说明的文字；分组依据（`math.status`）与顺序与语言无关。
 */
export function groupCandidates(candidates: CandidateView[], locale: Locale = 'zh'): CandidateGroup[] {
  return GROUP_ORDER.map((status) => ({
    status,
    label: mathJudgmentLabel(status, locale),
    mark: MATH_JUDGMENT_MARK[status],
    tone: MATH_JUDGMENT_TONE[status],
    boundary: mathJudgmentBoundary(status, locale),
    candidates: candidates.filter((candidate) => candidate.math.status === status),
  }));
}

/** 带「精确条件」的候选/边：共同输入的计算只依赖这一个形状。 */
export interface JointLike { conditions: Array<{ id: string; source: string; readable: string }> }

export interface JointInput { id: string; source: string; readable: string }

/**
 * 一条候选的「共同输入」。
 *
 * 语义：`conditions` 里的每一条都是这份证明**同时**用到的输入；只要有两条以上，
 * 这条连线就是**联合推导**，不能读成「`from` 单独蕴含 `to`」。因此界面上必须
 * 把它标注成组，而不是画成一条普通的独立蕴含。
 */
export function jointInputs(item: JointLike): JointInput[] {
  return item.conditions.map((condition, index) => ({
    id: condition.id || `c${index + 1}`,
    source: condition.source,
    readable: condition.readable,
  }));
}

export function isJointDerivation(item: JointLike): boolean {
  return item.conditions.length > 1;
}

/**
 * 候选能不能进「本次入库范围」。
 *
 * 判据来自**服务端**（`server/publication.mjs` 的三分法）：`math.status === 'verified'`
 * 且不在这份预览的 `excluded` 名单里（概念锚点、已被反驳等）。
 *
 * `excludedIds` 由预览结果喂进来（`excludedReasonsFrom(diff)`）——**不在前端猜节点 id 前缀**：
 * 那种判据会随登记表变化而失效，而且会把「数学上成立、只是发布模型里没有位置」误报成系统出错。
 */
export function isPublishable(candidate: CandidateView, excludedIds: ReadonlySet<string> = new Set()): boolean {
  return candidate.math.status === 'verified' && !excludedIds.has(candidate.id);
}

export interface ExclusionNote { reason: string; reasonCode: string }

/**
 * 从服务端预览里取出「哪些候选不入库、为什么」。
 *
 * 用来做两件事：默认勾选排除它们；在审阅面板上单独标出来并写明原因
 * （让用户知道**不是**系统出错、也**不是**它不成立）。
 */
export function excludedReasonsFrom(diff: PublicationDiff): Record<string, ExclusionNote> {
  const notes: Record<string, ExclusionNote> = {};
  for (const entry of diff.excluded) {
    if (!entry.candidateId) continue;
    notes[entry.candidateId] = { reason: entry.reason, reasonCode: entry.reasonCode };
  }
  return notes;
}

/** 共同输入的指纹：相同的输入集合意味着这些连线来自同一组前提，界面上要成组显示。 */
export function jointInputKey(item: JointLike): string {
  return jointInputs(item).map((input) => input.id || input.source).sort().join('|');
}

export interface JointGroup<T> { key: string; inputs: JointInput[]; items: T[] }

export function groupByJointInputs<T extends JointLike>(items: T[]): JointGroup<T>[] {
  const groups = new Map<string, JointGroup<T>>();
  for (const item of items) {
    const key = jointInputKey(item) || '∅';
    const existing = groups.get(key);
    if (existing) existing.items.push(item);
    else groups.set(key, { key, inputs: jointInputs(item), items: [item] });
  }
  return [...groups.values()];
}

export interface OverlayNode { id: string; label: string; role: 'draft' | 'existing' }
export interface OverlayEdge {
  id: string;
  candidateId: string;
  kind: RelationKind;
  from: string;
  to: string;
  jointInputs: JointInput[];
  joint: boolean;
  /** 证据标签：`PROOF`（证书）/ `FINITE`（有限核验）等，来自候选自带的证据记录。 */
  evidenceLabel: string | null;
}
/** 同一组共同输入下的一批连线：它们在图上必须成组标注，不能被读成各自独立的蕴含。 */
export interface OverlayGroup { key: string; inputs: JointInput[]; edges: OverlayEdge[] }
export interface OverlayExcluded { refuted: number; undecided: number; dismissed: number; pendingDecision: number; notIncluded: number }
export interface OverlayView {
  nodes: OverlayNode[];
  edges: OverlayEdge[];
  groups: OverlayGroup[];
  excluded: OverlayExcluded;
  note: string;
}

/**
 * 网络预览：**只叠加当前草稿与本次结果**。
 *
 * - 只收 `verified` 且审阅决策不是 `dismissed` 的候选；
 * - 未决/已反驳/已驳回只计数，不画线（计数会写在图下面，让「没画出来」是有交代的）；
 * - 这是一个**局部视图**：它不读也不写公共本体图，公共图在入库前保持不变。
 */
export function buildOverlay(options: {
  fields: DraftFields;
  nodeRef: { node: string; version: string } | null;
  candidates: CandidateView[];
  decisions: Record<string, ReviewDecision>;
  /** 本次入库实际纳入的候选；给 null 表示「还没挑选，先把所有已验证的画出来」。 */
  includeIds?: string[] | null;
  /** 显示语的语种：只影响草稿节点的占位名与图下那句说明，默认中文。 */
  locale?: Locale;
}): OverlayView {
  const { fields, nodeRef, candidates, decisions, includeIds = null, locale = 'zh' } = options;
  const draftId = nodeRef?.node ?? (locale === 'en' ? '(current draft)' : '（当前草稿）');
  const nodes: OverlayNode[] = [{ id: draftId, label: fields.name.trim() || draftId, role: 'draft' }];
  const drawn: CandidateView[] = [];
  const excluded: OverlayExcluded = { refuted: 0, undecided: 0, dismissed: 0, pendingDecision: 0, notIncluded: 0 };

  for (const candidate of candidates) {
    if (candidate.math.status === 'refuted') { excluded.refuted += 1; continue; }
    if (candidate.math.status === 'undecided') { excluded.undecided += 1; continue; }
    if (decisions[candidate.id] === 'dismissed') { excluded.dismissed += 1; continue; }
    if (decisions[candidate.id] !== 'accepted') excluded.pendingDecision += 1;
    if (includeIds && !includeIds.includes(candidate.id)) { excluded.notIncluded += 1; continue; }
    drawn.push(candidate);
    for (const endpoint of [candidate.from.node, candidate.to.node]) {
      if (!endpoint || endpoint === draftId) continue;
      if (!nodes.some((node) => node.id === endpoint)) nodes.push({ id: endpoint, label: endpoint, role: 'existing' });
    }
  }

  const edges: OverlayEdge[] = drawn.map((candidate) => {
    const inputs = jointInputs(candidate);
    return {
      id: candidate.id,
      candidateId: candidate.id,
      kind: candidate.kind,
      from: candidate.direction?.general ?? candidate.from.node,
      to: candidate.direction?.special ?? candidate.to.node,
      jointInputs: inputs,
      joint: inputs.length > 1,
      evidenceLabel: candidate.evidence?.status ?? null,
    };
  });
  const byCandidate = new Map(edges.map((edge) => [edge.candidateId, edge]));

  return {
    nodes,
    edges,
    groups: groupByJointInputs(drawn).map((group) => ({
      key: group.key,
      inputs: group.inputs,
      edges: group.items.map((item) => byCandidate.get(item.id)).filter((edge): edge is OverlayEdge => Boolean(edge)),
    })),
    excluded,
    note: locale === 'en'
      ? 'This graph overlays only the current draft and this run’s results: the public ontology graph is unchanged right now, and refuted or undecided items are not on it.'
      : '此图只叠加当前草稿与本次结果：公共本体图此刻没有变化；已反驳与未决项不在图上。',
  };
}

/* ==========================================================================
 * 11. 入库预览、提交、版本与回滚
 * ======================================================================== */

/**
 * 入库前的差异。
 *
 * 形状按 `server/publication.mjs` 的 `diffView(plan)` 写：每一类都分
 * **新增 / 变更 / 移除 / 未变**四档（`unchanged` 是条数不是清单），另有
 * `pending`（被挡住、等人处理的候选）与 `refused`（服务端拒绝的候选，带原因）。
 * 「未变」也要显示出来：只列新增会让人以为整个网络都要重写。
 */
export interface DiffBuckets<T> { added: T[]; changed: T[]; removed: T[]; unchanged: number }
export interface DiffNodeEntry { id: string; title: string; note: string; construct: string; discipline: string }
export interface DiffRelationEntry {
  id: string;
  candidateId: string | null;
  kind: string;
  from: string;
  to: string;
  evidenceRef: string | null;
  verificationStatus: string;
}
export interface DiffEvidenceEntry { id: string; kind: string; label: string; checkStatus: string; nodes: string[] }
export interface DiffDefinitionEntry { id: string; node: string; name: string }
export interface DiffContractEntry { id: string; mode: string; title: string }
/**
 * 入库三分法（服务端 `server/publication.mjs` 的稳定字段）：
 *
 * - `publishable`：端点都在本体里（含本次要发布的新节点）→ 入库；
 * - `pending`：端点尚未入库但将来可能 → **记为待证，不阻断**；
 * - `excluded`：概念锚点这类发布模型里没有位置的端点 → **不入库，不阻断**，但要写明原因。
 *
 * 真阻断项只在 `problems` 里（提交时 409）。界面按**这些字段**分栏，
 * 不靠节点 id 前缀去猜——`reasonCode` 就是服务端给的判据。
 */
export interface DiffPublishableEntry {
  candidateId: string;
  relationId: string;
  kind: string;
  from: string;
  to: string;
  evidenceRef: string | null;
  verificationStatus: string;
}
export interface DiffPendingEntry {
  id: string;
  candidateId: string;
  kind: string;
  from: string;
  to: string;
  reason: string;
  reasonCode: string;
}
export interface DiffExcludedEntry {
  candidateId: string;
  kind: string;
  from: string;
  to: string;
  reason: string;
  reasonCode: string;
}
export interface DiffRefusedEntry { candidateId: string; kind: string; from: string; to: string; reason: string; reasonCode: string }

export interface DiffTotals {
  added: Record<string, number>;
  changed: Record<string, number>;
  unchanged: Record<string, number>;
  pending: number;
  refused: number;
  dismissed: number;
}

export interface PublicationDiff {
  nodes: DiffBuckets<DiffNodeEntry>;
  relations: DiffBuckets<DiffRelationEntry>;
  evidence: DiffBuckets<DiffEvidenceEntry>;
  definitions: DiffBuckets<DiffDefinitionEntry>;
  contracts: DiffBuckets<DiffContractEntry>;
  /** 服务端三分法：入库 / 待证 / 不入库（三者都不是「阻断」）。 */
  publishable: DiffPublishableEntry[];
  pending: DiffPendingEntry[];
  excluded: DiffExcludedEntry[];
  refused: DiffRefusedEntry[];
  dismissed: string[];
  totals: DiffTotals;
  /** 选中的内容一条都进不了库（可提前看见的状态，**不是**阻断项）。 */
  nothingToPublish: boolean;
  /** 发布事务的六步（服务端下发，界面照抄，不自己编一套顺序）。 */
  steps: string[];
  /** 阻断项：现在提交会返回 409。 */
  problems: string[];
  /** 不拦路但要看一眼的项。 */
  warnings: string[];
  /** `sealed === false` 表示有阻断项（提交会 409）。 */
  sealed: boolean;
  origin: 'server' | 'local';
  raw: unknown;
  recognized: boolean;
}

export interface PublicationPreviewView { revision: PublicationRevision | null; diff: PublicationDiff }

export interface PublicationRequest {
  draftId: string | null;
  draftRevision: number | null;
  /** 本次审阅的那个发现任务。**显式带上**：服务端不带时会自己挑「该草稿最近一次运行」，
   *  那可能不是屏幕上这一次，候选 id 对不上会报 409。 */
  runId: string | null;
  acceptedCandidateIds: string[];
  dismissedCandidateIds: string[];
  reviewDigest: string;
  idempotencyKey: string;
  notes: string | null;
  ontologyVersion: string | null;
}

/**
 * 审阅摘要（幂等与一致性核对用）。
 *
 * **不是密码学承诺**：它只保证「同一批采纳/驳回 + 同一草稿修订」算出同一个串，
 * 供服务端判断这次提交是不是重复提交。真正的哈希由服务端在内容包上算。
 */
export function reviewDigest(accepted: string[], dismissed: string[], draftRevision: number | null): string {
  const payload = `acc:${[...accepted].sort().join(',')}|dis:${[...dismissed].sort().join(',')}|rev:${draftRevision ?? 'local'}`;
  let hash = 0x811c9dc5;
  for (let index = 0; index < payload.length; index += 1) {
    hash ^= payload.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return `rev1-${hash.toString(16).padStart(8, '0')}-${payload.length}`;
}

export function newIdempotencyKey(): string {
  const cryptoObj = typeof globalThis !== 'undefined' ? (globalThis.crypto as Crypto | undefined) : undefined;
  if (cryptoObj?.randomUUID) return `pub-${cryptoObj.randomUUID()}`;
  return `pub-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function emptyBuckets<T>(): DiffBuckets<T> {
  return { added: [], changed: [], removed: [], unchanged: 0 };
}

function unchangedCount(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (Array.isArray(value)) return value.length;
  return 0;
}

/** 把 `{added, changed, removed, unchanged}` 或（兼容）一个平铺数组读成一档差异。 */
function readBuckets<T>(value: unknown, map: (raw: unknown) => T): DiffBuckets<T> {
  if (Array.isArray(value)) return { ...emptyBuckets<T>(), added: value.map(map) };
  const record = asRecord(value) ?? {};
  return {
    added: asArray(record.added).map(map),
    changed: asArray(record.changed).map(map),
    removed: asArray(record.removed).map(map),
    unchanged: unchangedCount(record.unchanged),
  };
}

function normalizeTotals(value: unknown, diff: Omit<PublicationDiff, 'totals' | 'origin' | 'raw' | 'recognized'>): DiffTotals {
  const record = asRecord(value) ?? {};
  const numbers = (source: unknown, fallback: Record<string, number>) => {
    const entry = asRecord(source);
    if (!entry) return fallback;
    const out: Record<string, number> = {};
    for (const [key, raw] of Object.entries(entry)) out[key] = asNumber(raw);
    return Object.keys(out).length ? out : fallback;
  };
  const countAdded = (bucket: { added: unknown[] }) => bucket.added.length;
  return {
    added: numbers(record.added, {
      nodes: countAdded(diff.nodes),
      relations: countAdded(diff.relations),
      evidence: countAdded(diff.evidence),
      definitions: countAdded(diff.definitions),
      contracts: countAdded(diff.contracts),
    }),
    changed: numbers(record.changed, {
      nodes: diff.nodes.changed.length,
      relations: diff.relations.changed.length,
      evidence: diff.evidence.changed.length,
      definitions: diff.definitions.changed.length,
      contracts: diff.contracts.changed.length,
    }),
    unchanged: numbers(record.unchanged, {
      nodes: diff.nodes.unchanged,
      relations: diff.relations.unchanged,
      evidence: diff.evidence.unchanged,
      definitions: diff.definitions.unchanged,
      contracts: diff.contracts.unchanged,
    }),
    pending: asNumber(record.pending, diff.pending.length),
    refused: asNumber(record.refused, diff.refused.length),
    dismissed: asNumber(record.dismissed, diff.dismissed.length),
  };
}

function normalizeDiff(raw: unknown, origin: 'server' | 'local'): PublicationDiff {
  const record = asRecord(raw) ?? {};
  const recognized = ['nodes', 'relations', 'evidence', 'definitions', 'contracts'].some((key) => record[key] !== undefined);

  const diff = {
    nodes: readBuckets<DiffNodeEntry>(record.nodes, (item) => {
      const entry = asRecord(item) ?? {};
      return {
        id: asString(entry.id),
        title: asString(entry.title, asString(entry.id)),
        note: asString(entry.note),
        construct: asString(entry.construct),
        discipline: asString(entry.discipline),
      };
    }),
    relations: readBuckets<DiffRelationEntry>(record.relations, (item) => {
      const entry = asRecord(item) ?? {};
      const id = asString(entry.id);
      return {
        id,
        // 关系 id 的口径是 `rel:<候选 id>`（见 server/publication.mjs）：拆出来才能把
        // 共同输入、候选与证据连起来显示。拆不出来就为 null，不硬猜。
        candidateId: id.startsWith('rel:') ? id.slice(4) : (typeof entry.candidateId === 'string' ? entry.candidateId : null),
        kind: asString(entry.kind),
        from: asString(entry.from),
        to: asString(entry.to),
        evidenceRef: typeof entry.evidenceRef === 'string' ? entry.evidenceRef : (typeof entry.evidenceId === 'string' ? entry.evidenceId : null),
        verificationStatus: asString(entry.verificationStatus, asString(entry.status)),
      };
    }),
    evidence: readBuckets<DiffEvidenceEntry>(record.evidence, (item) => {
      const entry = asRecord(item) ?? {};
      return {
        id: asString(entry.id),
        kind: asString(entry.kind),
        label: asString(entry.status, asString(entry.label)),
        checkStatus: asString(entry.checkStatus),
        nodes: asStringArray(entry.nodes),
      };
    }),
    definitions: readBuckets<DiffDefinitionEntry>(record.definitions, (item) => {
      const entry = asRecord(item) ?? {};
      return { id: asString(entry.id, asString(entry.name)), node: asString(entry.node), name: asString(entry.name) };
    }),
    contracts: readBuckets<DiffContractEntry>(record.contracts, (item) => {
      const entry = asRecord(item) ?? {};
      return { id: asString(entry.id), mode: asString(entry.mode), title: asString(entry.title, asString(entry.id)) };
    }),
    pending: asArray(record.pending).map((item) => {
      const entry = asRecord(item) ?? {};
      return {
        id: asString(entry.id),
        candidateId: asString(entry.candidateId),
        kind: asString(entry.kind),
        from: asString(entry.from),
        to: asString(entry.to),
        reason: asString(entry.reason),
        reasonCode: asString(entry.reasonCode, 'pending'),
      };
    }),
    excluded: asArray(record.excluded).map((item) => {
      const entry = asRecord(item) ?? {};
      return {
        candidateId: asString(entry.candidateId),
        kind: asString(entry.kind),
        from: asString(entry.from),
        to: asString(entry.to),
        reason: asString(entry.reason),
        reasonCode: asString(entry.reasonCode, 'excluded'),
      };
    }),
    publishable: asArray(record.publishable).map((item) => {
      const entry = asRecord(item) ?? {};
      return {
        candidateId: asString(entry.candidateId),
        relationId: asString(entry.relationId),
        kind: asString(entry.kind),
        from: asString(entry.from),
        to: asString(entry.to),
        evidenceRef: typeof entry.evidenceRef === 'string' ? entry.evidenceRef : null,
        verificationStatus: asString(entry.verificationStatus),
      };
    }),
    refused: asArray(record.refused).map((item) => {
      const entry = asRecord(item) ?? {};
      return {
        candidateId: asString(entry.candidateId),
        kind: asString(entry.kind),
        from: asString(entry.from),
        to: asString(entry.to),
        reason: asString(entry.reason),
        reasonCode: asString(entry.reasonCode, 'refuted'),
      };
    }),
    nothingToPublish: record.nothingToPublish === true,
    dismissed: asStringArray(record.dismissed),
    steps: asStringArray(record.steps),
    problems: asStringArray(record.problems),
    warnings: asStringArray(record.warnings),
    sealed: record.sealed === true,
  };
  return {
    ...diff,
    totals: normalizeTotals(record.totals, diff),
    origin,
    raw,
    recognized,
  };
}

/**
 * 本地预演（服务端预览不可用时）。
 *
 * 由「草稿 + 已采纳的已验证候选」直接推出变更清单。它**只描述界面已经知道的东西**：
 * 节点（1 个）、关系（逐条带上候选 id）、证据（取自候选自带的证据记录）。
 * 定义与行动契约由服务端在隔离区合成，这里**不生成**——那属于编造。
 */
export function buildLocalPreview(options: {
  fields: DraftFields;
  nodeRef: { node: string; version: string } | null;
  candidates: CandidateView[];
  includeIds: string[];
}): PublicationDiff {
  const { fields, nodeRef, candidates, includeIds } = options;
  const included = candidates.filter((candidate) => candidate.math.status === 'verified' && includeIds.includes(candidate.id));
  const nodeId = nodeRef?.node ?? '（草稿节点）';
  const relations: DiffRelationEntry[] = included.map((candidate) => ({
    id: `rel:${candidate.id}`,
    candidateId: candidate.id,
    kind: candidate.kind,
    from: candidate.direction?.general ?? candidate.from.node,
    to: candidate.direction?.special ?? candidate.to.node,
    evidenceRef: candidate.evidence?.id ?? null,
    verificationStatus: candidate.evidence?.status ?? '',
  }));
  const evidence: DiffEvidenceEntry[] = included
    .filter((candidate) => candidate.evidence)
    .map((candidate) => ({
      id: candidate.evidence?.id ?? candidate.id,
      kind: candidate.evidence?.kind ?? '',
      label: candidate.evidence?.status ?? '',
      checkStatus: candidate.evidence?.checkStatus ?? '',
      nodes: candidate.evidence?.nodes ?? [],
    }));
  const problems: string[] = [];
  if (fields.background.trim() === '') problems.push('尚未选择背景理论：关系到别的概念的蕴含必须在某个背景下才可判。');
  if (fields.statement.trim() === '') problems.push('陈述为空：本次入库的节点没有形式陈述，只能作为「待证」骨架登记。');
  const pendingLedger: DiffPendingEntry[] = candidates
    .filter((candidate) => candidate.math.status === 'undecided')
    .map((candidate) => ({
      id: `pending:${candidate.id}`,
      candidateId: candidate.id,
      kind: candidate.kind,
      from: candidate.from.node,
      to: candidate.to.node,
      reason: '未决：既没证成也没反驳，本地预演不把它放进本次变更。',
      reasonCode: 'not-verified',
    }));

  const shape = {
    nodes: {
      added: [{
        id: nodeId,
        title: fields.name.trim() || '（未命名草稿）',
        note: relations.length > 0 ? '' : '没有任何已验证关系；节点可以独立入库，未证命题保留「待证」状态。',
        construct: fields.construct,
        discipline: '',
      }],
      changed: [], removed: [], unchanged: 0,
    },
    relations: { added: relations, changed: [], removed: [], unchanged: 0 },
    evidence: { added: evidence, changed: [], removed: [], unchanged: 0 },
    definitions: emptyBuckets<DiffDefinitionEntry>(),
    contracts: emptyBuckets<DiffContractEntry>(),
    // 本地预演按同一套三分法装填：本次纳入的 = publishable，未决的 = pending，
    // 概念锚点这类要等**服务端**判定（本地不猜前缀），所以 excluded 留空并写明由服务端判。
    publishable: included.map((candidate) => ({
      candidateId: candidate.id,
      relationId: `rel:${candidate.id}`,
      kind: candidate.kind,
      from: candidate.direction?.general ?? candidate.from.node,
      to: candidate.direction?.special ?? candidate.to.node,
      evidenceRef: candidate.evidence?.id ?? null,
      verificationStatus: candidate.evidence?.status ?? '',
    })),
    pending: candidates
      .filter((candidate) => candidate.math.status === 'undecided')
      .map((candidate) => ({
        id: `pending:${candidate.id}`,
        candidateId: candidate.id,
        kind: candidate.kind,
        from: candidate.from.node,
        to: candidate.to.node,
        reason: '未决：既没证成也没反驳，本次只把它记为待证。',
        reasonCode: 'not-verified',
      })),
    excluded: [] as DiffExcludedEntry[],
    refused: [] as DiffRefusedEntry[],
    dismissed: [] as string[],
    nothingToPublish: false,
    steps: [] as string[],
    problems,
    warnings: [
      '本地预演：定义与行动契约由服务端在隔离区合成，这里不生成，也不猜测。',
      '本地预演不等于服务端预览；真正入库前请先用服务端预览核对同一批变更。',
    ],
    sealed: problems.length === 0,
  };

  return {
    ...shape,
    totals: normalizeTotals(null, shape),
    origin: 'local',
    raw: null,
    recognized: true,
  };
}

/** 版本记录的归一：id 缺失就返回 null（一条没有 id 的版本记录无法被回滚，不能显示成可选）。 */
function normalizeRevision(raw: unknown): PublicationRevision | null {
  const record = asRecord(raw);
  if (!record) return null;
  const id = asString(record.id);
  if (!id) return null;
  const summary = asRecord(record.summary) ?? {};
  const kind = asString(record.kind, 'publish');
  return {
    id,
    parent: typeof record.parent === 'string' ? record.parent : null,
    createdAt: asString(record.createdAt),
    createdBy: asString(record.createdBy),
    kind: kind === 'rollback' ? 'rollback' : 'publish',
    restores: typeof record.restores === 'string' ? record.restores : null,
    baselineFingerprint: asString(record.baselineFingerprint),
    contentHash: asString(record.contentHash),
    packagePath: asString(record.packagePath),
    summary: {
      nodes: asNumber(summary.nodes),
      relations: asNumber(summary.relations),
      evidence: asNumber(summary.evidence),
      definitions: asNumber(summary.definitions),
      contracts: asNumber(summary.contracts),
    },
    reviewDigest: asString(record.reviewDigest),
    acceptedCandidateIds: asStringArray(record.acceptedCandidateIds),
    dismissedCandidateIds: asStringArray(record.dismissedCandidateIds),
    notes: typeof record.notes === 'string' ? record.notes : null,
  };
}

export async function previewPublication(request: PublicationRequest): Promise<Attempt<PublicationPreviewView | null>> {
  const result = await attempt<unknown>('/authoring/publications/preview', {
    method: 'POST',
    body: publicationBody(request),
  });
  if (!result.ok) return result;
  const record = asRecord(result.data) ?? {};
  const diffSource = record.diff ?? record;
  return { ok: true, data: { revision: normalizeRevision(record.revision), diff: normalizeDiff(diffSource, 'server') } };
}

export interface CommitResult {
  revision: PublicationRevision | null;
  ontologyVersion: string | null;
  /** 服务端多给的字段（例如新节点入口）原样留着，不丢信息。 */
  extra: Record<string, unknown>;
}

/** 发布/预览的请求体：与 `server/publication.mjs` 的 `buildChangeSet` 逐字段对应。 */
function publicationBody(request: PublicationRequest): Record<string, unknown> {
  return {
    draftId: request.draftId,
    draftRevision: request.draftRevision,
    runId: request.runId,
    acceptedCandidateIds: request.acceptedCandidateIds,
    dismissedCandidateIds: request.dismissedCandidateIds,
    reviewDigest: request.reviewDigest,
    idempotencyKey: request.idempotencyKey,
    notes: request.notes,
    ontologyVersion: request.ontologyVersion ?? undefined,
  };
}

export async function commitPublication(request: PublicationRequest): Promise<Attempt<CommitResult | null>> {
  const result = await attempt<unknown>('/authoring/publications', {
    method: 'POST',
    body: publicationBody(request),
  });
  if (!result.ok) return result;
  const record = asRecord(result.data) ?? {};
  return {
    ok: true,
    data: {
      revision: normalizeRevision(record.revision),
      ontologyVersion: typeof record.ontologyVersion === 'string' ? record.ontologyVersion : null,
      extra: record,
    },
  };
}

export async function listRevisions(): Promise<{
  revisions: PublicationRevision[];
  /** 当前生效的版本 id（没有扩展包时为 null）。 */
  active: string | null;
  /** 本体快照自检的结果：失效的自动关系会被标为待复核，不作为当前已认证推导。 */
  integrityProblems: string[];
  unavailable: UnavailableInfo | null;
  problems: string[];
  recognized: boolean;
  raw: unknown;
}> {
  const result = await attempt<unknown>('/authoring/revisions');
  if (!result.ok) {
    return { revisions: [], active: null, integrityProblems: [], unavailable: result.unavailable, problems: [describeFailure(result.error, result.unavailable)], recognized: false, raw: null };
  }
  const record = asRecord(result.data) ?? {};
  const list = Array.isArray(result.data) ? result.data : asArray(record.revisions);
  const recognized = Array.isArray(result.data) || Array.isArray(record.revisions);
  const integrity = asRecord(record.integrity);
  const integrityProblems = integrity
    ? [...asStringArray(integrity.problems), ...asStringArray(integrity.staleRelations).map((id) => `关系 ${id} 的依赖已变化，标为待复核`), ...asStringArray(integrity.staleEvidence).map((id) => `证据 ${id} 已失效，标为待复核`)]
    : [...asStringArray(record.problems)];
  return {
    revisions: list.map(normalizeRevision).filter((item): item is PublicationRevision => item !== null),
    active: typeof record.active === 'string' ? record.active : null,
    integrityProblems,
    unavailable: null,
    problems: recognized ? [] : ['服务端返回了未识别的版本清单形状，已原样保留在下方，未当作「没有版本」。'],
    recognized,
    raw: result.data,
  };
}

export interface RollbackResult { revision: PublicationRevision | null; ontologyVersion: string | null; extra: Record<string, unknown> }

export async function rollbackPublication(revisionId: string, options: { idempotencyKey: string; notes?: string | null; ontologyVersion?: string | null }): Promise<Attempt<RollbackResult | null>> {
  const result = await attempt<unknown>('/authoring/rollback', {
    method: 'POST',
    body: {
      revisionId,
      idempotencyKey: options.idempotencyKey,
      notes: options.notes ?? null,
      ontologyVersion: options.ontologyVersion ?? undefined,
    },
  });
  if (!result.ok) return result;
  const record = asRecord(result.data) ?? {};
  return {
    ok: true,
    data: {
      revision: normalizeRevision(record.revision),
      ontologyVersion: typeof record.ontologyVersion === 'string' ? record.ontologyVersion : null,
      extra: record,
    },
  };
}

/* ==========================================================================
 * 12. 失败说明与 hooks
 * ======================================================================== */

/** 把任何失败说成一句人话；未就绪的失败会带上服务端给的具体原因。 */
export function describeFailure(error: unknown, unavailable: UnavailableInfo | null = null): string {
  if (unavailable) {
    if (unavailable.kind === 'module') {
      return `功能尚未就绪：${unavailable.specifier ?? '所需模块'} 未能装载${unavailable.reason ? `（${unavailable.reason}）` : ''}`;
    }
    if (unavailable.kind === 'route') return `服务端还没有这个接口（${unavailable.code}）：本机服务版本可能落后于页面。`;
    return unavailable.message;
  }
  /*
   * 带上错误码：阻断项要能一眼看出是 409 冲突还是 500 内部错误——
   * 只说「服务器内部错误」会把「你这批内容有问题」与「服务端自己坏了」混成一句。
   * 口径与 `api.ts` 的 `formatError` 一致。
   */
  if (error instanceof ApiError) return `${error.message}${error.code ? `（${error.code}）` : ''}`;
  if (error instanceof Error) return error.message;
  return String(error);
}

/** 防抖值：编辑时不要每个按键都打一次网络。 */
export function useDebounced<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delayMs);
    return () => window.clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}

export interface DiscoveryPollingState {
  run: RunView | null;
  setRun: (run: RunView | null) => void;
  polling: boolean;
  error: string | null;
  refresh: () => void;
}

/**
 * 后台任务轮询。
 *
 * 「后台搜索不阻塞页面」在这里是结构性的：任务在服务端跑，页面只是按间隔取一次状态；
 * 轮询只在任务处于 `queued / running` 时进行，任务结束或组件卸载即清定时器。
 * 这里**不做乐观伪造**：取不到新状态时保持上一次的真实状态，并把失败原因显示出来。
 */
export function useDiscoveryRun(intervalMs = 2500): DiscoveryPollingState {
  const [run, setRun] = useState<RunView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);

  const runId = run?.id ?? null;
  const active = run?.status === 'queued' || run?.status === 'running';

  useEffect(() => {
    if (!runId || !active) return () => {};
    let cancelled = false;
    let timer: number | null = null;
    const schedule = () => {
      if (cancelled) return;
      timer = window.setTimeout(() => { void tick(); }, intervalMs);
    };
    const tick = async () => {
      const result = await fetchRun(runId);
      if (cancelled) return;
      if (result.ok && result.data) {
        setRun(result.data);
        setError(null);
      } else if (!result.ok) {
        // 轮询失败只在页面上留一句说明，不改任务状态（状态是服务端的事实）。
        setError(describeFailure(result.error, result.unavailable));
      }
      schedule();
    };
    schedule();
    return () => {
      cancelled = true;
      if (timer !== null) window.clearTimeout(timer);
    };
  }, [runId, active, intervalMs, nonce]);

  const refresh = useCallback(() => { setNonce((value) => value + 1); }, []);

  return { run, setRun, polling: Boolean(active), error, refresh };
}
