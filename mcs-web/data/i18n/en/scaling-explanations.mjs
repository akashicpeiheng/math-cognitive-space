const explanation = (summary, changes = []) => ({ summary, changes });
const change = (condition, special, general) => ({ condition, special, general });
const regularity = explanation('Relax regularity: all orders → finite order k (the same atlas)', [change('Regularity of transition maps', 'C^∞: derivatives of every order exist and are continuous', 'C^k: only derivatives through finite order k are required')]);
const tensor = explanation('Representation correspondence: multilinear functions ↔ tensor spaces; no condition is removed');
const units = explanation('Release the chosen instance: units modulo 5 → abstract group', [change('Specified carrier and operation', 'Nonzero residue classes modulo 5 with multiplication', 'Any carrier and operation satisfying the group axioms')]);
export default {
  'rel-limit-generalization': explanation('Relax value matching: L = f(a) → the limit L need not equal f(a)', [change('Matching the limit to the point value', 'Continuity at a, with L = f(a)', 'Only the limit L on a punctured neighbourhood is considered')]),
  'rel-manifold-generalization': regularity,
  'rel-manifold-specialization': regularity,
  'rel-tensor-generalization': tensor,
  'rel-tensor-specialization': tensor,
  'rel-group-generalization': explanation('Release the chosen instance: permutation group → abstract group', [change('Specified elements and operation', 'Permutations with composition', 'Any elements and operation satisfying the group axioms')]),
  'rel-group-generalization-geom': explanation('Release the chosen instance: rigid triangle symmetries → abstract group', [change('Specified elements and operation', 'Rigid symmetries of an equilateral triangle with composition', 'Any elements and operation satisfying the group axioms')]),
  'rel-group-generalization-mod': units,
  'rel-group-specialization': units,
  'rel-dg-smooth-manifold-generalization': explanation('Forget smooth structure: a smooth atlas → the underlying topological manifold', [change('Additional smooth atlas', 'A topological manifold equipped with smooth structure', 'Only the underlying topological manifold is retained')]),
  'rel-liang-metric-specialization': explanation('Relax tensor type, symmetry and non-degeneracy: metric → tensor field', [change('Tensor type', 'Fixed type (0,2)', 'Any type (r,s)'), change('Symmetry', 'Symmetric', 'Symmetry is not required'), change('Non-degeneracy', 'Non-degenerate', 'Degeneracy is allowed')]),
  'rel-liang-schwarzschild-specialization': explanation('Relax solution restrictions: vacuum, static, spherical symmetry → general field equations', [change('Matter and symmetry restrictions', 'A vacuum, static, spherically symmetric solution', 'Field equations without these three imposed restrictions')]),
  'rel-liang-rw-specialization': explanation('Relax cosmological symmetry: homogeneity and isotropy → general field equations', [change('Spatial symmetry', 'Homogeneous and isotropic', 'Neither homogeneity nor isotropy is imposed in advance')]),
  'rel-rudin-lub-specialization': explanation('Remove the least-upper-bound property: real field → ordered field', [change('Least-upper-bound property', 'Every nonempty bounded-above set has a least upper bound', 'Only the ordered-field axioms are required')]),
};
