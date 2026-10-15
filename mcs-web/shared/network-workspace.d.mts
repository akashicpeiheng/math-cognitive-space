export interface OntologyRef { source: 'ontology'; id: string; version: string }
export interface VaultRef { source: 'vault'; storage: 'browser' | 'account'; vaultId: string; fileId: string; revision: number; sha256: string }
export type NetworkNodeRef = OntologyRef | VaultRef;
export interface FormalBinding { excerpt: string; section: string; correspondenceConfirmed: boolean; spec: Record<string, unknown> }
export interface PrivateRelation { id?: string; revision?: number; from: NetworkNodeRef; to: NetworkNodeRef; kind: string; conditions: string; reason: string; source: string; bindings: Partial<Record<'from' | 'to', FormalBinding>>; significance?: string; checks?: RelationCheck[]; history?: unknown[]; deleted?: boolean; local?: boolean }
export interface RelationCheck { id?: string; inputHash: string; relationSignature?: string; ontologyVersion: string; structure: { status: string; problems: string[]; scope: string }; math: { status: 'verified' | 'refuted' | 'undecided'; reason: string; scope: string }; run: { status: string; reason?: string }; label?: string; evidence?: unknown; correspondence?: Record<string, boolean>; createdAt?: string; stale?: boolean }
export interface NetworkExtras { schema?: string; refs?: NetworkNodeRef[]; sources?: Array<{ kind: 'ontology' } | { kind: 'vault'; storage: string; vaultId: string }>; filters?: { noteReference: boolean; privateReference: boolean; privateRelation: boolean }; placements?: Record<string, { x: number; y: number }>; layout?: { mode: 'free' | 'learning' | 'logic'; anchors: { learning: string | null; logic: string | null } } }
export const NETWORK_SCHEMA: string;
export const PRIVATE_KINDS: string[];
export function normalizeNodeRef(raw: unknown): NetworkNodeRef;
export function nodeRefKey(ref: NetworkNodeRef): string;
export function decodeNoteKey(key: string): { source: 'vault'; storage: 'browser' | 'account'; vaultId: string; fileId: string } | null;
export function normalizePrivateRelation(raw: unknown): PrivateRelation;
export function relationSignature(raw: unknown): string;
export function checkRelationStructure(relation: PrivateRelation): RelationCheck['structure'];
export function normalizeNetworkExtras(payload: Record<string, unknown>): NetworkExtras;
export function normalizeSubmission(raw: unknown): { relation: Record<string, unknown>; endpoints: Record<string, Record<string, string>> };
