// Reading navigation only. These links do not identify legacy NodeRecords with M
// objects or add mathematical membership, prerequisites or evidence.
// Chapter links deliberately retain their broader scope; related notes may cover
// only a special case and never replace an object's registered public reading.
const notes = {
  derivative: [['rudin:derivative']],
  directional: [['vault:directional-derivative']],
  jacobian: [['gt:jacobi-matrix']],
  topology: [['top:space']],
  continuous: [['top:continuous-map']],
  homeomorphism: [['top:homeomorphism']],
  connected: [['top:connectedness']],
  'continuous-connected': [['top:claim-connected-intermediate']],
  compact: [['top:compactness']],
  paracompact: [['top:paracompactness']],
  'sigma-compact': [['top:sigma-compact']],
  'compact-hausdorff-normal': [['top:claim-compact-normal']],
  'compact-para': [['top:claim-compact-paracompact', 'related']],
  c1: [['gt:countability-axioms', 'chapter']],
  c2: [['gt:countability-axioms', 'chapter']],
  'second-first': [['top:claim-a2-a1']],
  ...Object.fromEntries(['t1', 't2', 't3', 't4', 'two-one', 'three-two', 'four-three'].map(key => [key, [['gt:separation-axioms', 'chapter']]])),
  chart: [['top:coordinate-chart']],
  atlas: [['top:atlas']],
  'smooth-atlas': [['dg:smooth-atlas']],
  'top-manifold': [['top:topological-manifold']],
  'smooth-manifold': [['gt:differentiable-manifold', 'chapter']],
  'local-euclidean': [['top:topological-manifold', 'related']],
  tangent: [['dg:tangent-coordinate-basis', 'chapter'], ['dg:tangent-vector-derivation', 'related'], ['dg:tangent-vector-curve', 'related']],
  tensor: [['dg:tensor']],
  'tensor-field': [['gt:covariant-tensor-field', 'related']],
  metric: [['gt:riemannian-metric', 'chapter'], ['gt:inner-product', 'related']],
  forms: [['dg:differential-form']],
  exterior: [['liang:exterior-derivative', 'chapter']],
  lie: [['liang:lie-derivative']],
  'vector-field': [['dg:smooth-vector-field', 'chapter']],
};
const registered = {
  ...Object.fromEntries(Object.entries(notes).map(([key, links]) => [`obj:tdg:${key}`, links])),
  'obj:group:left-mul': [['group:left-mul']],
  'obj:group:injective': [['group:claim-injective'], ['group:proof-injective', 'related']],
};

/** Public L/NodeRecord navigation, derived without changing M or reading E. */
export function mcsNotes(library, ontology) {
  const available = new Map((ontology?.raw?.nodes ?? ontology?.nodes ?? []).map(node => [node.id, node]));
  const byObject = Object.fromEntries(library.objects.map(object => {
    const legacy = (registered[object.id] ?? []).flatMap(([id, coverage = 'object']) => {
      const note = typeof ontology?.maybeNode === 'function' ? ontology.maybeNode(id) : available.get(id);
      if (!note?.contentMarkdown?.trim()) return [];
      return [{ kind: 'node', id: note.id, title: note.title, coverage,
        href: `/nodes/${encodeURIComponent(note.id)}?from=mcs` }];
    });
    const readings = library.nodes.filter(node => node.objects.some(ref => ref.id === object.id && ref.version === object.version &&
      ref.formalHash === (ref.anchor === '$' ? object.formalHash : object.declarations.find(d => d.id === ref.anchor)?.formalHash)));
    const publicReadings = readings.map(node => ({ kind: 'learning-node', id: node.id, title: node.title, coverage: 'object',
      href: `/learning-nodes/${encodeURIComponent(node.id)}?from=mcs` }));
    return [object.id, [...legacy.filter(n => n.coverage !== 'related'), ...publicReadings, ...legacy.filter(n => n.coverage === 'related')]];
  }));
  return { schema: 'mcs-note-links/1', byObject };
}
