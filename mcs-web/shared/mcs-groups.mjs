/** Explicit navigation identities; these groups never become M objects. */
export const GROUP_OBJECT_IDS = Object.freeze([
  'obj:group:e',
  'obj:group:injective',
  'obj:group:left-mul',
  'obj:group:mul',
  'obj:group:right-unit',
  'obj:group:subdiscipline',
  'obj:group:topic',
  'obj:group:unit',
]);

// Same registered presets as web/src/content-case.ts. Pure data for either runtime.
export const PRESETS = Object.freeze({
  topology: Object.freeze(['topology','c1','c2','t1','t2','t3','t4','compact','paracompact','sigma-compact','connected','second-first','four-three','three-two','two-one','compact-para']),
  manifolds: Object.freeze(['topology','continuous','homeomorphism','chart','atlas','smooth-atlas','local-euclidean','top-manifold','smooth-manifold','manifold-countability']),
  operators: Object.freeze(['derivative','partial','directional','frechet','gradient','curl','divergence','tangent','cotangent','tensor','tensor-field','forms','exterior','vector-field','flow','lie','metric','hodge','insertion','direction-frechet','d-squared','curl-grad','div-curl','cartan','formal-adjoint']),
});

export const MCS_GROUP_TITLES = Object.freeze({
  all: Object.freeze({ zh: '全部', en: 'All' }),
  group: Object.freeze({ zh: '群论', en: 'Group theory' }),
  'topology-dg': Object.freeze({ zh: '拓扑—微分几何', en: 'Topology and differential geometry' }),
  topology: Object.freeze({ zh: '拓扑性质', en: 'Topological properties' }),
  manifolds: Object.freeze({ zh: '流形', en: 'Manifolds' }),
  operators: Object.freeze({ zh: '算子', en: 'Operators' }),
});
