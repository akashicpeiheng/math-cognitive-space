// MCS Web 公共类型。运行时校验在 contracts.mjs；此处只描述线上协议。

export type Construct =
  | 'Symbol' | 'Term' | 'Concept' | 'Definition' | 'Claim' | 'Proof'
  | 'Example' | 'Counterexample' | 'Problem' | 'Theory' | 'Construction'
  | 'Method' | 'Representation' | 'MisconceptionPattern';

export type Role =
  | 'Concept' | 'Definition' | 'Axiom' | 'Theorem' | 'Property' | 'Proof'
  | 'Example' | 'Counterexample' | 'Problem' | 'Theory' | 'Construction'
  | 'GlobalMethod' | 'LocalMethod';

export type EvidenceStatus =
  | 'DEF' | 'PROOF' | 'REF' | 'FINITE' | 'ILLUSTRATION' | 'NOT-CLAIMED';

export type CheckStatus =
  | 'not_run' | 'passed' | 'failed' | 'unsupported' | 'resource_exhausted' | 'corrupt';

export type ResourceKind =
  | 'statement' | 'definition' | 'proof' | 'certificate' | 'construction'
  | 'task' | 'method' | 'representation' | 'condition' | 'competence';

export type SupportUse = 'expression' | 'proof' | 'route';

export interface NodeRecord {
  id: string;
  version: string;
  construct: Construct;
  roles: Role[];
  title: string;
  discipline: string;
  summary: string;
  formal?: Record<string, unknown>;
  payload?: Record<string, unknown>;
  motivation?: Record<string, string[]>;
  teaching?: Record<string, unknown>;
  provenance?: { sources: string[]; note?: string; evidenceStatus?: EvidenceStatus };
  contentMarkdown?: string;
}

export interface ActionInput {
  node: string;
  accepts: ResourceKind[];
  condition?: string;
}

export interface ActionOutput {
  node: string;
  provides: ResourceKind[];
}

export interface ActionRecord {
  id: string;
  mode: 'definition' | 'deduction' | 'representation' | 'task' | 'method' | 'construction' | 'evidence';
  title: string;
  inputs: ActionInput[];
  outputs: ActionOutput[];
  witness: { type: string; ref?: string; status: EvidenceStatus; scope?: string };
  theory?: string;
  openAssumptions?: string[];
  version: string;
}

export interface RelationRecord {
  id: string;
  kind: 'hardPrereq' | 'hardGeneralization' | 'specialization' | 'application' | 'analogy' | 'duality' | 'bridge' | 'crossDomain';
  from: string;
  to: string;
  witness: { type: string; ref?: string; status: EvidenceStatus };
  scope?: string;
  task?: string;
  candidateNote?: string;
}

export interface EvidenceRecord {
  id: string;
  kind: 'prose-proof' | 'machine-certificate' | 'reference' | 'finite-check' | 'illustration' | 'not-claimed' | 'counterexample' | 'model-pair';
  status: EvidenceStatus;
  checkStatus: CheckStatus;
  title: string;
  scope: string;
  nodes: string[];
  certificate?: string;
  checker?: string;
  checkerVerified?: boolean;
  usedAxioms?: string[];
  openAssumptions?: string[];
  dependsOn?: string[];
  obligations?: string[];
  reference?: string;
}

export interface SupportRecord {
  id: string;
  node: string;
  use: SupportUse;
  status: 'known' | 'unknown';
  set?: string[];
  partial?: { lower: string[]; upper: string[]; note?: string };
  minimal?: boolean;
  reason?: string;
  evidence?: string[];
}

export interface LocalizationResult {
  id: string;
  status: 'computed' | 'unknown' | 'unsupported';
  V: Array<{ id: string; type: 'node' | 'aggregate' | 'event'; label: string; source?: string[] }>;
  boundary: Array<{ ref: string; kind: string; note: string }>;
  tau: Record<string, string[]>;
  pres: Array<{ claim: string; status: 'kept' | 'conditional' | 'not-claimed'; note: string }>;
  losses: string[];
  reason?: string;
  params: Record<string, unknown>;
  meta: { ontologyVersion: string; algorithmVersion: string; computedAt: string };
}

export type PlanStatus = 'Found' | 'Conditional' | 'InfeasibleWithinBound' | 'Unknown';

export interface PlanEvent {
  id: string;
  actionId: string;
  focus: { node: string; resource: ResourceKind };
  sources: Record<string, SourceRef>;
  provides: ActionOutput[];
  kind?: 'learning' | 'review';
}

export type SourceRef =
  | { kind: 'background'; entryId: string; node: string; resource: ResourceKind; confirmed: boolean }
  | { kind: 'event'; eventId: string; node: string; resource: ResourceKind }
  | { kind: 'boundary'; node: string; resource: ResourceKind; question: string };

export interface PlanPackage {
  id: string;
  goals: string[];
  events: PlanEvent[];
  sourceEdges: Array<[string, string]>;
  strategyEdges: Array<[string, string]>;
  order: Array<[string, string]>;
  linearExtensions: string[][];
  goalSources: Record<string, SourceRef>;
  entry: string[];
  usedBackground: string[];
  cost: { status: 'known' | 'unknown'; vector: number[] | null; note?: string };
  effects: { statements: number; proofs: number; certificates: number; goals: number };
  witness: Array<{ eventId: string; actionId: string; ref?: string; status: EvidenceStatus }>;
  meta: Record<string, unknown>;
}

export interface PlanResult {
  status: PlanStatus;
  goals: string[];
  routes: PlanPackage[];
  pareto: PlanPackage[];
  search: {
    complete: boolean;
    reasons: string[];
    bounds: { horizon: number; maxCandidates: number; visited: number };
    domain: string;
  };
  familyRequired: string[];
  familyScope: { complete: boolean; note: string };
  entryConditions: string[];
  unknownEntries: Array<{ node: string; question: string }>;
  meta: { ontologyVersion: string; plannerVersion: string; request: Record<string, unknown> };
}

export interface ProfileRecord {
  id: string;
  name: string;
  modelVersion: string;
  revision: number;
  createdAt: string;
  updatedAt: string;
  archived?: boolean;
}

export interface LearningEvent {
  eventId: string;
  profileId: string;
  kind: 'view' | 'hint' | 'answer' | 'evaluation' | 'mastery_estimate' | 'confirmation' | 'misconception' | 'goal' | 'note' | 'tutor_message';
  nodeId: string;
  occurredAt: string;
  baseRevision: number;
  source: { kind: 'browser' | 'deeptutor' | 'import' | 'system' | 'user'; ref: string };
  evidenceRefs: string[];
  payload: Record<string, unknown>;
}

export interface ApiError {
  ok: false;
  error: { code: string; message: string; details?: unknown; retryable?: boolean };
}

export interface Envelope<T> {
  ok: true;
  protocol: 'mcs-web/1';
  ontologyVersion: string;
  data: T;
}
