// 本文件描述自动关系发现与验证流程的线上协议（与 shared/formal.mjs 的运行时校验配对）。
// 这里只描述形状；真正的解析、类型检查与证书生成在 core/formal/ 下。

import type { EvidenceStatus, CheckStatus, EvidenceRecord, NodeRecord } from './types';

export type RelationKind =
  | 'definitionReference' | 'hardGeneralization' | 'equivalentTo'
  | 'conditionalDerivation' | 'instanceOf' | 'counterexampleTo';

export type MathJudgment = 'verified' | 'refuted' | 'undecided';

export type RunStatus =
  | 'completed' | 'timeout' | 'unsupported' | 'check_failed' | 'error' | 'cancelled';

export type ReviewStatus = 'pending' | 'accepted' | 'dismissed' | 'published' | 'stale';

/** §1.6：机器表达层。与给人读的 `formalStatement` 分开保存，互不覆盖。 */
export interface FormalSpec {
  specVersion: 'mcs-formal/1';
  node: string;
  nodeVersion: string;
  background: string;
  theoryVersion: string;
  declarations: Array<{ name: string; type: string; role: 'object' | 'element' | 'function' | 'predicate' | 'proposition' | 'constant'; label?: string }>;
  definitions: Array<{ name: string; type: string; source: string }>;
  assumptions: Array<{ id: string; source: string }>;
  statement: { source: string; kind: 'formula' };
  claims: Array<{ id: string; source: string; role: 'derived' | 'target' }>;
  references: Array<{ node: string; version: string; specHash: string; kind: RelationKind; symbols: string[] }>;
  boundary: string[];
  source: string;
  hash: string;
  /** 解析后的规范表达树由服务端缓存，不在协议里传输（太大且可重算）。 */
  normalized?: { statement: unknown; assumptions: unknown[] };
}

export interface RelationCandidate {
  id: string;
  runId: string;
  kind: RelationKind;
  from: { node: string; version: string };
  to: { node: string; version: string };
  /** hardGeneralization 的精确方向：证据证明的是 special ⇒ general。 */
  direction: { general: string; special: string } | null;
  conditions: Array<{ id: string; source: string; readable: string }>;
  goal: { source: string; canonical: unknown; hash: string } | null;
  reason: string;
  math: { status: MathJudgment; reason: string; scope: string };
  run: { status: RunStatus; reason: string; stats: Record<string, number> };
  review: ReviewStatus;
  evidence: EvidenceRecord | null;
  counterexample: { model: string; assignment: Record<string, unknown>; note: string } | null;
  replay: { status: CheckStatus; at: string; durationMs: number } | null;
  generatorVersion: string;
  inputHash: string;
}

export interface DiscoveryRunStats {
  candidates: number;
  coveredNodes: number;
  verified: number;
  refuted: number;
  undecided: number;
  unprocessed: number;
  durationMs: number;
}

export interface DiscoveryRun {
  id: string;
  draftId: string | null;
  nodeRef: { node: string; version: string } | null;
  ontologyVersion: string;
  background: string;
  status: 'queued' | 'running' | 'completed' | 'interrupted' | 'cancelled' | 'error';
  startedAt: string;
  finishedAt: string | null;
  budget: { maxCandidates: number; perCandidateMs: number; totalMs: number; depth: number; maxStates: number };
  stats: DiscoveryRunStats;
  /** 服务重启时置 true：保留已核验结果，不当作数学反驳。 */
  interrupted: boolean;
  candidates: RelationCandidate[];
}

export interface PublicationRevision {
  id: string;
  parent: string | null;
  createdAt: string;
  createdBy: string;
  kind: 'publish' | 'rollback';
  restores: string | null;
  baselineFingerprint: string;
  contentHash: string;
  packagePath: string;
  summary: { nodes: number; relations: number; evidence: number; definitions: number; contracts: number };
  reviewDigest: string;
  acceptedCandidateIds: string[];
  dismissedCandidateIds: string[];
  notes: string | null;
}

export interface AuthoringDraft {
  id: string;
  revision: number;
  name: string;
  construct: string;
  case: string;
  summary: string;
  reading: string;
  background: string;
  spec: FormalSpec | null;
  specSource: { declarations: string; definitions: string; assumptions: string; statement: string; claims: string };
  validation: { ok: boolean; problems: Array<{ code: string; message: string; line?: number; column?: number }>; checkedAt: string } | null;
  createdAt: string;
  updatedAt: string;
  publishedRevisionId: string | null;
}

export interface FormalCatalog {
  languageVersion: string;
  backgrounds: Array<{ id: string; version: string; title: string; note: string; constants: Array<{ name: string; type: string; note?: string }>; symbols: Array<{ symbol: string; type: string; note?: string }> }>;
  templates: Array<{ id: string; case: string; title: string; note: string; draft: Partial<AuthoringDraft> }>;
  boundedTypes: Array<{ name: string; note: string }>;
  budgets: { maxCandidates: number; perCandidateMs: number; totalMs: number; depth: number; maxStates: number };
  operators: Array<{ token: string; alias: string[]; note: string }>;
  coverage: Array<{ case: string; nodes: number; specs: number; missing: string[] }>;
  extension: { activeRevision: string | null; revisions: number; nodes: number };
}

export interface OntologySnapshotInfo {
  version: string;
  contentHash: string;
  builtAt: string;
  activeExtension: string | null;
  baseFingerprint: string;
  counts: Record<string, number>;
}
