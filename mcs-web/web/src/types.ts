import type { MasterView } from '../../shared/master-view.mjs';
export type Construct =
  | 'Symbol' | 'Term' | 'Concept' | 'Definition' | 'Claim' | 'Proof'
  | 'Example' | 'Counterexample' | 'Problem' | 'Theory' | 'Construction'
  | 'Method' | 'Representation' | 'MisconceptionPattern';

export type Role =
  | 'Concept' | 'Definition' | 'Axiom' | 'Theorem' | 'Property' | 'Proof'
  | 'Example' | 'Counterexample' | 'Problem' | 'Theory' | 'Construction'
  | 'GlobalMethod' | 'LocalMethod';

export interface NodeSummary {
  contentRefData?:import('../../shared/network-workspace.mjs').OntologyRef;
  master?: MasterView;
  id: string;
  version: string;
  title: string;
  construct: Construct;
  roles: Role[];
  discipline: string;
  case: string;
  summary: string;
  evidenceStatus: string | null;
  hasContent: boolean;
  actionCount: number;
  relationCount: number;
  evidenceCount: number;
  /** 是否登记了形式表达（列表接口只给标记，详情接口给式子与读法）。 */
  hasFormalStatement?: boolean;
  /**
   * 条目粒度：`unit` = 最小的可独立认知单元，`topic` = 话题级条目（一节/一章的范围）。
   * 列表接口默认只返回 unit；想连话题一起看要显式传 `granularity=all`。
   */
  granularity?: 'unit' | 'topic';
  /**
   * 这个节点**登记在哪些案例里**（2026-10 的节点合并，见 `data/merges.mjs`）：
   * 自身案例 + 被收口进来的各处登记的案例。案例筛选按它走，
   * 否则「同一个对象在三处登记过」会在两条案例线上各少一个点。
   */
  cases?: string[];
  /** 被收口进来的登记数（0 = 没有合并）。列表据此挂「含 N 处登记」的徽标。 */
  mergeCount?: number;
  /** 那些登记的标题（别名）：合并之后仍然搜得到「坐标图」「连通集」这些旧名字。 */
  alsoKnownAs?: string[];
}

/**
 * 一处**被合并的登记**（`node.registrations` 的一项）。
 *
 * 逐字保留登记当时的样子：标题、案例、形式负载、教学字段、来源与正文块。
 * 节点页把它与规范节点并列显示——合并收的是**身份**，不是内容；
 * 各处登记的差别（最典型的是拓扑流形的公理表含不含第二可数）必须留着。
 */
export interface MergedRegistration {
  id: string;
  title: string;
  construct: Construct;
  roles?: Role[];
  discipline: string;
  case: string;
  summary: string;
  granularity?: 'unit' | 'topic';
  formal?: Record<string, unknown>;
  formalStatement?: FormalStatement | null;
  teaching?: TeachingView;
  provenance?: { sources: string[]; note?: string };
  contentMarkdown?: string;
  /** 它被收口到的规范节点 id。 */
  mergedInto: string;
  /** 所属合并组（`data/merges.mjs` 的 `MERGE_GROUPS[].id`）。 */
  mergeGroup?: string;
  /** 这条登记原本的站内链接（旧链接仍然解析得到，会重定向到规范节点）。 */
  contentRef?: string | false;
}

/** 一组合并：规范节点 + 收口进来的登记 + 为什么它们是同一个对象。 */
export interface MergeGroupView {
  id: string;
  canonical: string;
  absorbed: string[];
  rationale: string;
  differences: string[];
}

export interface RepresentationView {
  id: string;
  kind: string;
  title: string;
  medium: string;
  status: string;
  note: string;
}

export interface SelfCheckView {
  id: string;
  prompt: string;
  competence: string;
  anchor?: string;
  criterion: string;
}

export interface ConditionView {
  condition: string;
  remove: string;
  counterexample: string;
  effect: string;
}

export interface TeachingView {
  /** 入门讲解先展示动机和正文，再提供独立形式摘要。 */
  readingFirst?: boolean;
  /** 证据等级：DEF / PROOF / REF / FINITE / ILLUSTRATION / NOT-CLAIMED。 */
  evidenceStatus?: string;
  conditions?: ConditionView[];
  proofOverview?: string;
  commonMisconceptions?: string[];
  reviewQuestions?: string[];
  selfCheck?: SelfCheckView[];
}

export interface FormalStatement {
  /** 纯 LaTeX，不含 `$` 定界符（渲染时补成行间公式）。 */
  tex: string;
  /** 把符号读回中文。 */
  reading: string;
  /** 记号约定：每个符号是什么。 */
  notation: Array<{ symbol: string; means: string }>;
  /** 证据状态标签（DEF / PROOF / REF / FINITE / ILLUSTRATION / NOT-CLAIMED）。 */
  label: string;
  /** 补充说明：条件次序、与相邻节点的差别、未证明的部分。 */
  note?: string;
}

export interface NodeDetail extends Omit<NodeSummary, 'actionCount' | 'relationCount' | 'evidenceCount'> {
  formal: Record<string, unknown>;
  /**
   * 形式表达：用形式语言写出的对象陈述。
   *
   * 只有挑出来的重要节点登记了这一项（`data/formal-statements.mjs`），其余节点为 `null`——
   * 空着比编一个像公式的东西诚实，页面也不为它留占位。
   */
  formalStatement?: FormalStatement | null;
  representations?: RepresentationView[];
  motivation?: { internal?: string[]; external?: string[]; aesthetic?: string[]; growthChain?: string[] };
  teaching?: TeachingView;
  contentMarkdown: string;
  provenance?: { sources: string[]; note?: string };
  /**
   * 同一对象的**其它登记**（2026-10 的节点合并）：
   * 合并把「同一个对象在多个案例里各登记一遍」收成一个规范节点，那些登记逐字保留在这里，
   * 节点页把它们连同正文一起显示。数组为空即「这个对象只登记过一次」。
   */
  registrations?: MergedRegistration[];
}

export interface ActionRecord {
  id: string;
  mode: string;
  title: string;
  inputs: Array<{ node: string; accepts: string[]; condition?: string }>;
  outputs: Array<{ node: string; provides: string[] }>;
  witness: { type: string; status: string; ref?: string; scope?: string };
  openAssumptions: string[];
}

export interface EvidenceRecord {
  id: string;
  kind: string;
  status: string;
  checkStatus: string;
  title: string;
  scope: string;
  nodes: string[];
  certificate: string | null;
  checker: string | null;
  backend?: 'lean4' | 'mcs-nd-subset' | null;
  leanRegistration?: string | null;
  checkerVerified: boolean;
  openAssumptions: string[];
  obligations: string[];
  reference: string | null;
  note?: string;
}

export interface SupportView {
  use: string;
  status: string;
  set?: string[] | null;
  reason?: string | null;
  minimal?: boolean | null;
}

export interface ScalingExplanation {
  summary: string;
  changes: Array<{ condition: string; special: string; general: string }>;
}

export interface NodeDetailResponse {
  version: string;
  /** 请求里的原始 id；与 `node.id` 不同时说明命中了合并别名（旧链接重定向）。 */
  requestedId?: string;
  node: NodeDetail;
  /** 本节点所属的合并组（为什么是同一个对象、各处登记的差别）；没有合并时为 `null`。 */
  merge?: MergeGroupView | null;
  formation: { status: string; checks: Array<{ name: string; status: string; detail: string }>; note: string };
  roles: { roles: Role[]; claimRoles: Role[]; note: string };
  actions: ActionRecord[];
  relations: Array<{ id: string; kind: string; from: string; to: string; witness: { type: string; status: string; ref?: string }; scope?: string; candidateNote?: string; connectionKey: string; direction?: { general: string; special: string } | null; scalingMode?: string; scalingExplanation?: ScalingExplanation | null }>;
  evidence: EvidenceRecord[];
  support: SupportView[];
  claims: Array<{ id: string; statement: string; status: string; evidence: EvidenceRecord[] }>;
  patterns: Array<{ id: string; node: string; anchors: string[]; title: string }>;
  provenance: { sources: string[]; note?: string };
  boundary: string[];
}

export interface PlanEventView {
  id: string;
  actionId: string;
  focus: { node: string; resource: string };
  sources: Record<string, { kind: string; node?: string; resource?: string; eventId?: string; entryId?: string; confirmed?: boolean; question?: string }>;
  provides: Array<{ node: string; provides: string[] }>;
  kind?: string;
}

export interface PlanPackageView {
  learningSchedule?: {
    order: string[]; steps: Array<{ key: string; eventId: string }>; background: string[];
    graphHash: string; ontologyVersion: string; staleManual: boolean;
  } | null;
  id: string;
  goals: string[];
  events: PlanEventView[];
  sourceEdges: Array<[string, string]>;
  strategyEdges: Array<[string, string]>;
  order: Array<[string, string]>;
  linearExtensions: string[][];
  goalSources: Record<string, { kind: string; node?: string; eventId?: string; confirmed?: boolean }>;
  entry: string[];
  usedBackground: string[];
  cost: { status: string; vector: number[] | null; note?: string };
  effects: { statements: number; proofs: number; certificates: number; goals: number };
  witness: Array<{ eventId: string; actionId: string; ref?: string; status: string }>;
}

export interface PlanResultView {
  status: string;
  goals: string[];
  routes: PlanPackageView[];
  pareto: PlanPackageView[];
  search: { complete: boolean; reasons: string[]; bounds: { horizon: number; maxCandidates: number; visited: number; firstSolutionDepth?: number | null }; domain: string };
  familyRequired: string[];
  familyScope: { complete: boolean; note: string };
  entryConditions: string[];
  unknownEntries: Array<{ node: string; question: string }>;
  meta: { ontologyVersion: string; plannerVersion: string; request: Record<string, unknown> };
}

export interface ProfileView {
  id: string;
  name: string;
  modelVersion: string;
  revision: number;
  kind: string;
  archived: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * 档案模板（2026-10 加，公共只读登记表）。
 *
 * 模板是 θ 的**初值**：建档案时选一个，服务端就把 `declares` 里的背景接口节点写成一串
 * confirmation 事件（`source = { kind: 'system', ref: 'profile-template:<id>' }`、
 * `payload.declared = true`）。因此模板本身不进本体 M，也不改 `contentHash`。
 *
 * 文案按成对下发（界面按当前语种取）：说明文字是资料性文案，不是本体内容；
 * 而 `declares[].title` 是本体内容，由服务端按请求语种下发。
 */
export interface ProfileTemplateDeclaration {
  node: string;
  title: string;
  case: string | null;
  basis: { zh: string; en: string };
}

export interface ProfileTemplateView {
  id: string;
  name: { zh: string; en: string };
  stage: { zh: string; en: string };
  summary: { zh: string; en: string };
  note: { zh: string; en: string };
  declares: ProfileTemplateDeclaration[];
}

export interface ProfileTemplatesResponse {
  version: string;
  defaultTemplateId: string;
  templates: ProfileTemplateView[];
  note: string;
}

/**
 * 学习者声明的**学习方向**（E 层，2026-10 加）。
 *
 * 它是「我现在要去哪」这一句显式声明：一个目标节点 + 一句自己写的说明。
 * 界面靠它把「现在可以开始的 N 个节点」排出次序（`web/src/direction.ts`），
 * 而不是替学习者猜兴趣——浏览记录不参与推导。
 */
export interface LearningDirectionView {
  directionId: string;
  profileId: string;
  /** 声明的方向目标（节点 id）。 */
  nodeId: string;
  note: string | null;
  /** 谁写的：`ui` = 界面上声明的，`seed` / `import` = 脚本或导入来的。事后可核。 */
  sourceRef: string;
  createdAt: string;
  updatedAt: string;
}

export interface DirectionsResponse {
  directions: LearningDirectionView[];
  ontologyVersion: string;
}

/** θ：Adapt(E,s,g,b) 产生的显式参数包。已知、未知、未指定与已读严格分开。 */export interface ThetaKnownEntry {
  node: string;
  resources: string[];
  evidence: string[];
  competences: Array<{ dimension: string; value: number | null; uncertainty: string | null }>;
}

export interface ThetaUnknownEntry {
  node: string;
  reason: string;
}

export interface ThetaViewedEntry {
  node: string;
  /** 该节点在当前版本本体中无法解析时为 true（悬空引用）。 */
  unresolved: boolean;
  lastViewedAt: string;
  reviewCount: number;
}

export interface ProfileTheta {
  known: ThetaKnownEntry[];
  unknown: ThetaUnknownEntry[];
  /** 计数与节点名单都给：只有计数无法判断「哪些还没碰过」。 */
  unspecified: { count: number; nodes: string[] };
  viewed: ThetaViewedEntry[];
  misconceptions: Array<{ patternId: string; evidence: string; uncertainty: string | null }>;
  coverage: Record<string, number>;
  boundary: Array<{ ref: string; kind: string; note: string }>;
}

export interface ProfileDetailResponse {
  profile: ProfileView;
  state: unknown;
  theta: ProfileTheta;
}

export interface EventView {
  seq: number;
  eventId: string;
  profileId: string;
  kind: string;
  nodeId: string;
  occurredAt: string;
  source: { kind: string; ref: string };
  evidenceRefs: string[];
  payload: Record<string, unknown>;
}

export interface NoteView {
  noteId: string;
  profileId: string;
  nodeId: string | null;
  title: string;
  body: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  revision: number;
}

export interface LocalizationDefinition {
  id: string;
  name: string;
  family: string;
  definition: string;
  inputs: string[];
  preserves: string;
  boundary: string;
  computable: string;
}

export interface LocalizationResultView {
  id: string;
  status: string;
  V: Array<{ id: string; type: string; label: string; source?: string[] }>;
  boundary: Array<{ ref: string; kind: string; note: string }>;
  tau: Record<string, string[]>;
  pres: Array<{ claim: string; status: string; note: string }>;
  losses: string[];
  reason?: string;
  meta: { ontologyVersion: string; algorithmVersion: string; computedAt: string };
}

export interface CoverageEntry {
  module: string;
  chapter: string;
  status: string;
  definitions: string[];
  implementation: string[];
  tests: string[];
  boundary: string;
}

export interface TutorBridgeStatus {
  url: string;
  reachable: boolean;
  protocol_version: string | null;
  deeptutor_ready: boolean;
  note: string;
}

export interface TutorStatus {
  available: boolean;
  enabled?: boolean;
  adapter?: string;
  frontend_url?: string;
  backend_url?: string;
  authenticated?: boolean;
  auth_required?: boolean;
  liveVerified: boolean;
  completed_turns?: number;
  since?: string;
  note: string;
  /**
   * 上游版本快照（TODO A4-26）：服务端运行期只读本机检出。
   * 读不到时 `available: false`，界面据此显示「手工核对，可能滞后」，不假装实时探测。
   */
  upstream?: {
    available: boolean;
    version: string | null;
    label: string | null;
    source: string | null;
    sourceKind: 'runtime-read' | 'unavailable';
    fileModifiedAt: string | null;
    readAt: string;
    note: string;
  };
  /** 桥接（mcs-bridge, 3783）的状态：两套集成同时披露，避免混用结论。 */
  bridge?: TutorBridgeStatus;
}

export interface HealthView {
  ok: boolean;
  service: string;
  protocol: string;
  version: string;
  ontology: { version: string; contentHash: string; counts: Record<string, unknown> };
  db: { profiles: number; events: number; notes: number; file: string; schemaVersion: string };
  tutor: TutorStatus;
  runtime: { node: string; platform: string; pid: number; uptime: number };
}
