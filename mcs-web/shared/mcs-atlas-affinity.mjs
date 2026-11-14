import { MCS_CROSS_FIELDS } from './mcs-crossfields.mjs';

/**
 * Editorial affinity for map navigation (D), not a measured mathematical metric.
 * Sources attached to the crossing support that bridge, not this ranking.
 * Keep one adjustable tier per existing crossing; neither library size nor E
 * determines the area. Missing pairs stay unrated, never implicitly "weak".
 */
export const MCS_ATLAS_AFFINITY_WEIGHTS = Object.freeze({
  strong: 1.8, related: 1, weak: .55, unrated: .85,
});

const tiers = Object.freeze({
  'harmonic-representations': 'related',
  'geometric-analysis': 'strong',
  'de-rham': 'related',
  'analytic-number-theory': 'strong',
  'analytic-combinatorics': 'weak',
  'stochastic-analysis': 'strong',
  'numerical-differential-equations': 'related',
  'algebraic-geometry': 'strong',
  'algebraic-topology': 'strong',
  'algebraic-number-theory': 'strong',
  'algebraic-combinatorics': 'related',
  'random-walks-groups': 'weak',
  'computational-algebra': 'related',
  'differential-topology': 'strong',
  'arithmetic-geometry': 'related',
  'discrete-geometry': 'related',
  'random-field-geometry': 'weak',
  'computational-geometry': 'related',
  'combinatorial-topology': 'related',
  'random-field-topology': 'weak',
  'computational-topology': 'related',
  'additive-combinatorics': 'related',
  'computational-number-theory': 'related',
  'probabilistic-combinatorics': 'strong',
  'graph-algorithms': 'strong',
  'monte-carlo': 'related',
});

export const MCS_ATLAS_AFFINITIES = Object.freeze(MCS_CROSS_FIELDS.map(crossing => {
  const level = tiers[crossing.id.slice(6)] ?? 'unrated';
  return Object.freeze({ crossingId: crossing.id, level, weight: MCS_ATLAS_AFFINITY_WEIGHTS[level] });
}));
const pairKey = (a, b) => [a, b].sort().join('|');
const byPair = new Map(MCS_CROSS_FIELDS.map((crossing, i) => [pairKey(...crossing.domains), MCS_ATLAS_AFFINITIES[i]]));
const unrated = Object.freeze({ level: 'unrated', weight: MCS_ATLAS_AFFINITY_WEIGHTS.unrated });

/** Symmetric navigation weight. Unknown identities cannot fabricate a bridge. */
export function atlasFieldAffinity(a, b) {
  return byPair.get(pairKey(a, b)) ?? unrated;
}
