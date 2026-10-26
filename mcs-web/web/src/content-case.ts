export const CASE_ID='topology-dg';
export const PRESETS={topology:['topology','c1','c2','t1','t2','t3','t4','compact','paracompact','sigma-compact','connected','second-first','four-three','three-two','two-one','compact-para'],manifolds:['topology','continuous','homeomorphism','chart','atlas','smooth-atlas','local-euclidean','top-manifold','smooth-manifold','manifold-countability'],operators:['derivative','partial','directional','frechet','gradient','curl','divergence','tangent','cotangent','tensor','tensor-field','forms','exterior','vector-field','flow','lie','metric','hodge','insertion','direction-frechet','d-squared','curl-grad','div-curl','cartan','formal-adjoint']} as const;
export function caseNetworkHref(layer='M',preset='topology'){
 const keys=PRESETS[preset as keyof typeof PRESETS]??PRESETS.topology;
 return '/network?'+new URLSearchParams({contentCase:CASE_ID,layer,preset,nodes:keys.map(k=>`${layer==='M'?'obj':'learn'}:tdg:${k}`).join(',')});
}
