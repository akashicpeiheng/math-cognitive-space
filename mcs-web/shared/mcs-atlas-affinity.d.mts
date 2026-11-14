export type AtlasAffinityLevel = 'strong' | 'related' | 'weak' | 'unrated';
export interface AtlasAffinity {
  readonly level: AtlasAffinityLevel;
  readonly weight: number;
  readonly crossingId?: string;
}
export const MCS_ATLAS_AFFINITY_WEIGHTS: Readonly<Record<AtlasAffinityLevel, number>>;
export const MCS_ATLAS_AFFINITIES: readonly AtlasAffinity[];
/** D-layer display weights; not measured mathematical distances or M relations. */
export function atlasFieldAffinity(a: string, b: string): AtlasAffinity;
