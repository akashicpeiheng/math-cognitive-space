import type { ObjectScale, ObjectRef, FormalDeclaration, ContentRelation } from './content-documents.mjs';

/** Structural input: accepts the richer mcs-view data without coupling to its producer. */
export interface McsSpaceData {
  presentation?: import('./mcs-view.mjs').McsPresentation;
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
  schema: 'mcs-view-state/2'; presentationVersion: string; lodMode: 'auto' | 'fixed'; level: number; edgeMode: 'selected' | 'all' | 'none'; objectVersion: string; filters: McsFilters;
  camera: { x: number; y: number; scale: number };
  viewport?: { width: number; height: number };
  expanded: string[]; manual: Record<string, 'open' | 'closed'>; selected: string | null;
  relationIds?: string[];
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
  /** Unique descendant matches propagate to folded ancestors; own declarations follow their owner. */
  counts: Record<string, { matched: number; total: number }>;
}
export interface McsRelationProjection {
  edges: Array<{
    id: string; kind: string; from: string | null; to: string; relationIds: string[];
    missingPremises: number;
    /** Visible box IDs for AND junctions; source premises remain in relationIds. */
    premises: string[]; aggregate: boolean; internal: boolean;
  }>;
  structure: Array<{ id: string; kind: 'reference' | 'import'; from: string; to: string }>;
}
export const MCS_STORAGE_KEY: 'mcs-view-state-v2';
export const MCS_LEGACY_STORAGE_KEY: 'mcs-view-state-v1';
export const MCS_LOD: Readonly<{ enter: readonly number[]; leave: readonly number[] }>;
export function defaultMcsState(data: McsSpaceData): McsState;
export function createMcsLayout(data: McsSpaceData, rootCenters?: Record<string, { x: number; y: number }>): McsLayout;
/** Always pass the original layout. The returned enclosure is unsuitable as an LOD baseline. */
export function positionedMcsLayout(layout: McsLayout, positions: McsState['positions']): McsLayout;
export function filterMcsObjects(data: McsSpaceData, filters: McsFilters): McsFilterResult;
export function visibleMcsBoxes(data: McsSpaceData, layout: McsLayout, state: McsState, filterResult?: McsFilterResult): Box[];
/** focus is in world coordinates; camera and original layout are unchanged. */
export function updateMcsLod(data: McsSpaceData, layout: McsLayout, state: McsState, focus: { x: number; y: number }): McsState;
export function normalizeMcsState(raw: unknown, data: McsSpaceData): { state: McsState; issues: string[] };
export function resizeMcsCamera(camera: McsState['camera'], before: { width: number; height: number }, after: { width: number; height: number }, fit?: boolean): McsState['camera'];
export function encodeMcsState(state: McsState): string;
export function decodeMcsState(hash: string, data: McsSpaceData): { state: McsState; issues: string[] } | null;
/** Assign stable lanes to projected edges that share kind and endpoints. */
export function assignMcsRelationLanes(edges: Array<Pick<McsRelationProjection['edges'][number], 'id' | 'kind' | 'from' | 'to'>>): Map<string, { index: number; count: number }>;
export function projectMcsRelations(data: McsSpaceData, layout: McsLayout, state: McsState, visibleBoxes: Box[], matched: Set<string>): McsRelationProjection;

export function mcsOverviewCamera(data: McsSpaceData, layout: McsLayout, viewport?: { width: number; height: number }): McsState['camera'];
export function setMcsLevel(data: McsSpaceData, state: McsState, level: number, mode?: 'auto' | 'fixed'): McsState;
export function displayedMcsRelations(data: McsSpaceData, layout: McsLayout, state: McsState, projection: McsRelationProjection): McsRelationProjection & { internal: McsRelationProjection['edges']; emphasizedRelationIds: string[] };
