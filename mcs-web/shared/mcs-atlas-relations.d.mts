import type { McsViewRelation } from './mcs-view.mjs';

export interface AtlasConstellationText {
  zh: string;
  en: string;
}

export interface AtlasConstellationGroup {
  id: string;
  title: AtlasConstellationText;
  members: readonly string[];
  anchor: { x: number; y: number };
}

export interface AtlasConstellation {
  core: string;
  coreSlot: { x: number; y: number };
  groups: readonly (AtlasConstellationGroup & { slots: readonly { x: number; y: number }[] })[];
}

export interface AtlasConstellationState {
  core: string;
  groups: AtlasConstellationGroup[];
}

export interface AtlasRelationEdge {
  id: string;
  from: string;
  to: string;
  kind: string;
  count: number;
}

export interface AtlasArrangement {
  core: string;
  groups: AtlasConstellationGroup[];
  positions: Map<string, { x: number; y: number }>;
}

export const MAIN_RELATION_KINDS: readonly string[];
export const MCS_ATLAS_CONSTELLATIONS: Readonly<Record<string, AtlasConstellation>>;

export function constellationFor(objectId: string): AtlasConstellation | null;
export function chooseConstellationCore(
  children: ReadonlyArray<{ objectId?: string }>,
  relations: readonly McsViewRelation[],
): string | null;
export function arrangeConstellation(
  parent: { objectId?: string; x: number; y: number; w: number; h: number },
  children: ReadonlyArray<{ objectId?: string; w: number; h: number }>,
  relations: readonly McsViewRelation[],
  constellation?: AtlasConstellation | null,
): AtlasArrangement | null;
export function relationEdgesForObjects(
  relations: readonly McsViewRelation[],
  objectIds: ReadonlySet<string> | readonly string[],
  options?: { limit?: number },
): AtlasRelationEdge[];
export function relationsForObject(
  relations: readonly McsViewRelation[],
  objectId: string,
): McsViewRelation[];
