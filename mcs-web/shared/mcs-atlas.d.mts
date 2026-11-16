import type { McsViewData } from './mcs-view.mjs';
import type { AtlasAffinity } from './mcs-atlas-affinity.mjs';
import type { AtlasConstellationState } from './mcs-atlas-relations.mjs';

export interface AtlasNode {
  id: string;
  title: { zh: string; en: string };
  description?: { zh: string; en: string };
  objectId?: string;
  children: AtlasNode[];
  parentId?: string;
  depth: number;
  x: number; y: number; w: number; h: number;
  color: string;
  /** Editorial relationship to the chosen core, for peripheral area only. */
  affinity?: AtlasAffinity;
  /** D navigation into a sourced crossing, not an M object/membership. */
  crossingId?: string;
  /** The other coarse field; directs the crossing toward that neighbour. */
  neighbourId?: string;
  /** D navigation only: object constellation selected for a deep-zoom parent. */
  constellation?: AtlasConstellationState;
}
export interface McsAtlas {
  root: AtlasNode;
  nodes: AtlasNode[];
  byId: Record<string, AtlasNode>;
}
export interface AtlasCamera { x: number; y: number; scale: number }
export interface AtlasSize { width: number; height: number }

/** Derived navigation only: neither new formal objects nor mathematical relations. */
export function createMcsAtlas(data: McsViewData, portrait?: boolean, coreId?: string): McsAtlas;
export function atlasFitCamera(node: AtlasNode, size: AtlasSize, padding?: number): AtlasCamera;
export function atlasZoomCamera(camera: AtlasCamera, factor: number, point: { x: number; y: number }, size: AtlasSize, worldSize?: AtlasSize): AtlasCamera;
export function atlasRegionPath(node: Pick<AtlasNode, 'id' | 'x' | 'y' | 'w' | 'h'>, inset?: number): string;
export function atlasCrossingPoint(a: Pick<AtlasNode, 'x' | 'y' | 'w' | 'h'>, b: Pick<AtlasNode, 'x' | 'y' | 'w' | 'h'>): { x: number; y: number };
