import type { ObjectScale, ObjectRef, FormalDeclaration, ContentRelation } from './content-documents.mjs';

/** Structural input: accepts the richer mcs-view data without coupling to its producer. */
export interface McsSpaceData {
  schema: 'mcs-view/1';
  objectVersion: string;
  contentLocale: 'zh';
  levels: ReadonlyArray<{ id: ObjectScale }>;
  objects: ReadonlyArray<{
    id: string; version: string; title: string; scale: ObjectScale; formalHash: string;
    declarations: ReadonlyArray<Pick<FormalDeclaration, 'id' | 'kind' | 'source' | 'type' | 'status' | 'constructionCount' | 'formalHash'>>;
    members: readonly ObjectRef[]; references: readonly ObjectRef[]; imports: readonly ObjectRef[];
  }>;
  relations: readonly ContentRelation[];
  groups: ReadonlyArray<{ id: string; title: { zh: string; en: string }; objectIds: readonly string[] }>;
}
export interface McsFilters {
  groups: string[]; scales: ObjectScale[]; relations: string[]; evidence: string[]; query: string;
}
export interface McsState {
  schema: 'mcs-view-state/1'; objectVersion: string; filters: McsFilters;
  camera: { x: number; y: number; scale: number };
  expanded: string[]; manual: Record<string, 'open' | 'closed'>; selected: string | null;
  /** Local deltas from the original layout, recursively inherited by children. */
  positions: Record<string, { x: number; y: number }>;
}
export interface Box {
  id: string; objectId: string; kind: 'object' | 'declaration' | 'reference';
  anchor?: string; target?: string;
  x: number; y: number; w: number; h: number; depth: number; parent: string | null;
}
export type McsBox = Box;
export interface McsLayout {
  boxes: Record<string, Box>; children: Record<string, string[]>;
  parents: Record<string, string>; roots: string[];
}
export interface McsFilterResult {
  matched: Set<string>; context: Set<string>;
  /** Direct member objects plus own declarations; declarations follow their owner. */
  counts: Record<string, { matched: number; total: number }>;
}
export interface McsRelationProjection {
  edges: Array<{
    id: string; kind: string; from: string; to: string; relationIds: string[];
    missingPremises: number;
    /** Visible box IDs for AND junctions; source premises remain in relationIds. */
    premises: string[]; aggregate: boolean;
  }>;
  structure: Array<{ id: string; kind: 'reference' | 'import'; from: string; to: string }>;
}
export const MCS_STORAGE_KEY: 'mcs-view-state-v1';
export const MCS_LOD: Readonly<{ expand: 240; collapse: 180 }>;
export function defaultMcsState(data: McsSpaceData): McsState;
export function createMcsLayout(data: McsSpaceData, rootCenters?: Record<string, { x: number; y: number }>): McsLayout;
/** Always pass the original layout. The returned enclosure is unsuitable as an LOD baseline. */
export function positionedMcsLayout(layout: McsLayout, positions: McsState['positions']): McsLayout;
export function filterMcsObjects(data: McsSpaceData, filters: McsFilters): McsFilterResult;
export function visibleMcsBoxes(data: McsSpaceData, layout: McsLayout, state: McsState, filterResult?: McsFilterResult): Box[];
/** focus is in world coordinates; camera and original layout are unchanged. */
export function updateMcsLod(data: McsSpaceData, layout: McsLayout, state: McsState, focus: { x: number; y: number }): McsState;
export function normalizeMcsState(raw: unknown, data: McsSpaceData): { state: McsState; issues: string[] };
export function encodeMcsState(state: McsState): string;
export function decodeMcsState(hash: string, data: McsSpaceData): { state: McsState; issues: string[] } | null;
/** Assign stable lanes to projected edges that share kind and endpoints. */
export function assignMcsRelationLanes(edges: Array<Pick<McsRelationProjection['edges'][number], 'id' | 'kind' | 'from' | 'to'>>): Map<string, { index: number; count: number }>;
export function projectMcsRelations(data: McsSpaceData, layout: McsLayout, state: McsState, visibleBoxes: Box[], matched: Set<string>): McsRelationProjection;
