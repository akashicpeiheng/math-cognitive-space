/**
 * 证据记录的英文覆盖：id → 译文（标题 / scope / obligations / reference）。
 *
 * 证据是站点的可信度门面：`REF`（引用）、`PROOF`（正文论证）、`FINITE`（有限证书）
 * 这些标签**不翻译**，它们是与中文源、与专稿对齐的固定记号；译的只是说明文字。
 * 译文的措辞必须与标签同级：`prose-proof` 只能译成「正文有论证」，不能升格成「已核验」；
 * 教材引用只能译成「本站未逐页核对」，不能缩写成「已核对」。
 *
 * `reference` 是修订源的真实路径（`mcs-foundations/cases/02-Ck与光滑流形.md#3`、
 * `G:/DifferentialGeometry/object/def/拓扑空间.md`），**不翻译**，parity 也放行中文。
 *
 * 装配方式：先合并各案例模块自带的 `evidence`（`limit` / `rudin` 已完成），
 * 再合并本文件的 `remaining`。三组高度模板化的记录（Rudin 的 57 条教材条目、
 * Liang 的 57 条教材条目、dg 的源笔记条目）用工厂函数写出**同一份**样板文字：
 * 这样 57 条的范围声明不可能各写各的，也就不可能出现「有的说未核对、有的像已核对」。
 */

import limit from './limit.mjs';
import rudin from './rudin.mjs';

const MODULES = { limit, rudin };

/* —— 模板一：Rudin 教材条目（正文尚未撰写） —— */
const RUDIN_SCOPE = 'Only the title, the section and the dependencies are registered so far; the body text has not been written, and the textbook’s wording has not been checked line by line.';
const RUDIN_OBLIGATIONS = [
  'Write the node text (motivation, formal form, counterexample per condition, review questions)',
  'Not encoded as an ND certificate of Chapter 02 (there is not even a body text yet, let alone machine verification)',
  'Check the wording and numbering of the corresponding sections of the textbook one by one',
];
/**
 * Rudin 的章名**不能**复用 `CHAPTERS`：那是 Liang 教材的章名，两本书的第 2 章
 * 分别是 Basic Topology 与 Manifolds and Tensor Fields。混用会把「度量空间」的
 * 出处写成流形那一章——这是引用类证据里最不能出的错。
 */
const RUDIN_CHAPTERS = {
  1: 'The Real and Complex Number Systems',
  2: 'Basic Topology',
  3: 'Numerical Sequences and Series',
  4: 'Continuity',
  5: 'Differentiation',
  6: 'The Riemann-Stieltjes Integral',
  7: 'Sequences and Series of Functions',
  8: 'Some Special Functions',
  9: 'Functions of Several Variables',
  10: 'Integration of Differential Forms',
  11: 'The Lebesgue Theory',
};
/** `title` 里已经含「教材 Chapter N … §…（p…） 的对应内容」，这里只补英文句式。 */
const rudinEntry = (title) => ({ title, scope: RUDIN_SCOPE, obligations: [...RUDIN_OBLIGATIONS] });
const rudinRef = (concept, chapter, sections, pages) => rudinEntry(
  `${concept}: the corresponding material in Chapter ${chapter} (${RUDIN_CHAPTERS[chapter]}), ${sections}, p${pages}`,
);

/* —— 模板二：Liang & Zhou 教材条目（本站只写凝练笔记） —— */
const CHAPTERS = {
  1: 'An Introduction to Topological Spaces',
  2: 'Manifolds and Tensor Fields',
  3: 'The Riemann (Intrinsic) Curvature Tensor',
  4: 'Lie Derivatives, Killing Fields and Hypersurfaces',
  5: 'Differential Forms and Their Integrals',
  6: 'Special Relativity',
  7: 'Foundations of General Relativity',
  8: 'Solving the Einstein Equations',
  9: 'Schwarzschild Spacetime',
  10: 'Cosmology',
};
const LIANG_SCOPE = (chapter, sections) => `The body text on this site is a condensed note; the full argument lives in the textbook (Chapter ${chapter}, ${CHAPTERS[chapter]}, ${sections}), which this site has neither transcribed nor checked page by page.`;
const LIANG_OBLIGATIONS = [
  'Not encoded as an ND certificate of Chapter 02',
  'The textbook text has not been checked page by page against the section and page correspondence',
];
const liangEntry = (concept, chapter, sections) => ({
  title: `${concept}: the corresponding material in Chapter ${chapter}, ${CHAPTERS[chapter]}, ${sections}`,
  scope: LIANG_SCOPE(chapter, sections),
  obligations: [...LIANG_OBLIGATIONS],
});

/* —— 模板三：dg 源笔记条目（正文由只读快照提供） —— */
const DG_SCOPE = 'The body text is provided by a read-only snapshot of the source note; the file path is kept verbatim in the reference field. This evidence claims only that a body-level argument exists, and makes no claim of machine verification.';
const DG_OBLIGATIONS = [
  'Encode it as an ND certificate of Chapter 02',
  'Check the equivalence of the definitions and of the theorem statements item by item',
];
const dgEntry = (concept) => ({
  title: `${concept}: prose proof and derivation in the source notes`,
  scope: DG_SCOPE,
  obligations: [...DG_OBLIGATIONS],
});

/**
 * 其余证据（188 条）。键是中文源的证据 id；只写含中文的字段。
 * 证据标签（DEF / PROOF / REF / FINITE / ILLUSTRATION / NOT-CLAIMED）与
 * `openAssumptions` 的存在与否都保持中文源的样子。
 */
const remaining = {
  /* —— 案例 02：C^k 与光滑流形 —— */
  'ev-manifold-max': {
    title: 'Prose proof of the maximal compatible extension',
    scope: 'Cover, local C^k composition and maximality.',
    obligations: ['Encode local composition and the chain rule for the machine'],
  },
  'ev-manifold-generalization': {
    title: 'Proof of the generalization directions, same-carrier and cross-carrier',
    scope: 'P_∞⇒P_k and well-definedness of the forgetting map; the two modes are not mixed.',
    obligations: ['Encode the well-definedness proof for the machine'],
  },
  'ev-manifold-h': {
    title: 'The C¹ but not C² atlas counterexample',
    scope: 'It refutes only the C² property of the given atlas; it does not deny that a smooth structure exists.',
  },
  'ev-manifold-transition-cert': {
    title: 'Same-chart transition fragment certificate',
    scope: 'φ(φ⁻¹(y))=y under the right-inverse equation at a given point; it contains no restricted domain, atlas or regularity.',
    openAssumptions: ['the right-inverse equation at the given point'],
    obligations: ['Open sets, restricted domains, atlases, covers, regularity, the chain rule and the maximal extension are not encoded'],
  },
  'ev-manifold-reference': {
    title: 'Classical sources for manifold structure',
    scope: 'The range of definitions of classical textbooks on differentiable manifolds; not all proofs have been checked page by page.',
  },
  'ev-manifold-not-claimed': {
    title: 'Scope of what is not claimed',
    scope: 'It is not claimed that an arbitrary continuous bijection is differentiable, nor is the machine check of the maximal atlas certified.',
  },
  'ev-manifold-method-cover': {
    title: 'Finite-cover method: the steps agree with the case text',
    scope: 'A method is not a proposition; this evidence states only that the description of the steps does not go beyond the case text, and that the boundary “a cover ≠ compatibility” is written out.',
    obligations: ['Encode it as an ND certificate of Chapter 02', 'Check that the two steps, covering and transition compatibility, are kept clearly apart'],
  },
  'ev-manifold-method-extension': {
    title: 'Extension test: the steps agree with the case text',
    scope: 'A method is not a proposition; this evidence states only that the description of the steps does not go beyond the case text, and that it does not claim to construct the extension.',
    obligations: ['Encode it as an ND certificate of Chapter 02', 'Check that the restriction “decide compatibility only, do not construct the extension” is preserved'],
  },
  'ev-manifold-method-regularity': {
    title: 'Pairwise check: the steps agree with the case text',
    scope: 'A method is not a proposition; this evidence states only that the description of the steps does not go beyond the case text, and that “an infinite atlas returns undecided” is written out.',
    obligations: ['Encode it as an ND certificate of Chapter 02', 'Check that the hypothesis of finite enumerability is preserved'],
  },

  /* —— 案例 03：张量与张量场 —— */
  'ev-tensor-basis-law': {
    title: 'Prose proof of the change-of-basis law',
    scope: 'The change-of-basis computation for type (1,1) and for general type (r,s).',
    obligations: ['Encode matrix similarity and the general index extension for the machine'],
  },
  'ev-tensor-end-iso': {
    title: 'Prose proof that Φ is an isomorphism',
    scope: 'Finite dimension; the basis is used only to prove bijectivity; the infinite-dimensional counterexample is listed separately.',
    obligations: ['Encode the universal property of the tensor product and the matrix units for the machine'],
  },
  'ev-tensor-bundle': {
    title: 'Proof of the correspondence between tensor fields and local components',
    scope: 'An atlas covering X; the transition functions must be the correct tensor-bundle transitions.',
    obligations: ['Encode the gluing conditions of the bundle for the machine'],
  },
  'ev-tensor-gamma': {
    title: 'Counterexample: the Christoffel symbols',
    scope: 'It rules out “every array of indices is a tensor”.',
  },
  'ev-tensor-infinite': {
    title: 'Counterexample: the infinite-dimensional identity operator',
    scope: 'It rules out the generalisation of surjectivity to infinite dimension.',
  },
  'ev-tensor-rank1-cert': {
    title: 'Rank-one addition fragment certificate',
    scope: 'R(x+y)=R(x)+R(y) under the scalar distributive law and additivity of α.',
    openAssumptions: ['α preserves addition'],
    obligations: ['Scalar linearity, the universal property of the tensor product, bases, the finite-dimensional bijection, and bundles or sections are not encoded'],
  },
  'ev-tensor-not-claimed': {
    title: 'Scope of what is not claimed',
    scope: 'It is not claimed that the full tensor algebra or bundle theory has been machine-formalised.',
  },
  'ev-tensor-method-basis': {
    title: 'Term-by-term substitution: the steps agree with the case text',
    scope: 'A method is not a proposition; this evidence states only that the description of the steps does not go beyond the case text, and that the boundary “a single substitution can only refute” is written out.',
    obligations: ['Encode it as an ND certificate of Chapter 02', 'Check that the transformation factors for upper and lower indices agree with the case text'],
  },
  'ev-tensor-method-dimension': {
    title: 'Dimension count: the steps agree with the case text',
    scope: 'A method is not a proposition; this evidence states only that the description of the steps does not go beyond the case text, and that the finite-dimensional hypothesis is written into the boundary.',
    obligations: ['Encode it as an ND certificate of Chapter 02', 'Check that the finite-dimensional hypothesis is preserved in the boundary of the method'],
  },
  'ev-tensor-method-invariant': {
    title: 'Finding invariants: the steps agree with the case text',
    scope: 'A method is not a proposition; this evidence states only that the description of the steps does not go beyond the case text, and that “a quantity whose preservation is unproved is only a candidate” is written out.',
    obligations: ['Encode it as an ND certificate of Chapter 02', 'Check the restriction that it does not replace a proof of preservation'],
  },

  /* —— 案例 04：群 —— */
  'ev-group-cayley': {
    title: 'Prose proof of Cayley’s theorem',
    scope: 'Bijectivity of left multiplication, the composite homomorphism, injectivity and the image subgroup.',
    obligations: ['Encode bijectivity of left multiplication, the composite homomorphism and the image subgroup for the machine'],
  },
  'ev-group-noncomm': {
    title: 'The non-abelian counterexample S₃',
    scope: 'The two composites are computed according to the declared convention.',
  },
  'ev-group-perm': {
    title: 'Verification of the group axioms for the permutation group',
    scope: 'Associativity of composition, the identity and inverses.',
  },
  'ev-group-triangle': {
    title: 'Verification of the group axioms for the triangle symmetry group',
    scope: 'Three rotations and three reflections; the action on the vertices is faithful.',
  },
  'ev-group-units5': {
    /*
     * `FINITE` 的语义是「有限表上**核过**」，不是「证明了」。中文「核验」直译成 `verified`
     * 没有译错，但英文 `verified` 更容易被读成结果状态（已验证），所以这里降一档用 `checked`，
     * 与 obligations 的「不推广到其他模数」一起读才不会被抬高。
     */
    title: 'Checking the Units5 power table',
    scope: 'Closure, identity and inverses of the four elements are checked on a finite table.',
    obligations: ['It is not generalised to other moduli.'],
  },
  'ev-group-abstract': {
    title: 'Abstracting the common axioms from the three entries',
    scope: 'Closure, associativity, identity and inverses are kept; commutativity is discarded.',
  },
  'ev-group-injective-cert': {
    title: 'Certificate for the injectivity fragment of Cayley',
    scope: 'L_g=L_h ⇒ g=h; the theory contains the right identity law only.',
    openAssumptions: ['the certified translation of the object equality L_g=L_h'],
    obligations: ['Bijectivity of left multiplication, the composite homomorphism, the permutation group and the image subgroup are not encoded'],
  },
  'ev-group-not-claimed': {
    title: 'Scope of what is not claimed',
    scope: 'It is not claimed that the full Cayley theorem has been machine-certified, nor that any teaching benefit has been measured.',
  },
  'ev-group-method-cayley-table': {
    title: 'Multiplication-table check: the steps agree with the case text',
    scope: 'A method is not a proposition; this evidence states only that the description of the steps does not go beyond the case text, and that the boundary “it does not apply once the order grows” is written out.',
    obligations: ['Encode it as an ND certificate of Chapter 02', 'Check that every axiom read off the table agrees with the wording of the case text'],
  },
  'ev-group-method-order': {
    title: 'Element-order comparison: the steps agree with the case text',
    scope: 'A method is not a proposition; this evidence states only that the description of the steps does not go beyond the case text, and that “the same distribution is not enough” is written into the boundary.',
    obligations: ['Encode it as an ND certificate of Chapter 02', 'Check that the necessary condition is nowhere phrased as a sufficient one'],
  },
  'ev-group-method-counterexample': {
    title: 'Refuting commutativity with S₃: the steps agree with the case text',
    scope: 'A method is not a proposition; this evidence states only that the description of the steps does not go beyond the case text, and that “it produces a counterexample only and does not replace a classification theorem” is written out.',
    obligations: ['Encode it as an ND certificate of Chapter 02', 'Check the declaration of the order of composition of permutations'],
  },
  'ev-group-method-abstract': {
    title: 'Abstracting the common operation from special cases: the steps agree with the case text',
    scope: 'A method is not a proposition; this evidence states only that the description of the steps does not go beyond the case text, and that “accidental features must not be written into the axioms” is written out.',
    obligations: ['Encode it as an ND certificate of Chapter 02', 'Check the requirement that at least one failure boundary is kept'],
  },

  /* —— 案例 05：微分几何（源笔记） —— */
  'ev-dg-topological-space': dgEntry('Topological spaces'),
  'ev-dg-homeomorphism': dgEntry('Homeomorphisms'),
  'ev-dg-manifold': dgEntry('Manifolds'),
  'ev-dg-topological-manifold': dgEntry('Topological manifolds'),
  'ev-dg-coordinate-chart': dgEntry('Coordinate charts'),
  'ev-dg-smooth-structure': dgEntry('Smooth structures'),
  'ev-dg-smooth-atlas': dgEntry('Smooth atlases'),
  'ev-dg-smooth-manifold': dgEntry('Smooth manifolds'),
  'ev-dg-smooth-embedding': dgEntry('Smooth embeddings'),
  'ev-dg-smooth-distribution': dgEntry('Smooth tangent distributions'),
  'ev-dg-partition-of-unity': dgEntry('Partitions of unity'),
  'ev-dg-compactness': dgEntry('Compactness'),
  'ev-dg-metric-space': dgEntry('Metric spaces'),
  'ev-dg-metric-completeness': dgEntry('Metric completeness'),
  'ev-dg-tangent-vector-curve': dgEntry('The curve definition of a tangent vector'),
  'ev-dg-tangent-vector-derivation': dgEntry('The derivation definition of a tangent vector'),
  'ev-dg-tangent-vector-equivalence': dgEntry('The equivalence of the two definitions of a tangent vector'),
  'ev-dg-tangent-coordinate-basis': dgEntry('The coordinate basis of the tangent space'),
  'ev-dg-tangent-bundle': dgEntry('The tangent bundle'),
  'ev-dg-smooth-vector-field': dgEntry('Smooth vector fields'),
  'ev-dg-tensor': dgEntry('Tensors'),
  'ev-dg-tensor-product-dg': dgEntry('The tensor product (differential geometry)'),
  'ev-dg-differential-form': dgEntry('Differential forms'),
  'ev-dg-form-wedge-product': dgEntry('The wedge product of differential forms'),
  'ev-dg-d-squared-zero': dgEntry('The exterior derivative squares to zero'),
  'ev-dg-form-pullback': dgEntry('The pullback of differential forms'),
  'ev-dg-implicit-function-theorem': dgEntry('The implicit function theorem'),
  'ev-dg-inverse-function-theorem': dgEntry('The inverse function theorem'),
  'ev-dg-generalized-stokes-theorem': dgEntry('The generalized Stokes theorem'),
  'ev-dg-poincare-lemma': dgEntry('The Poincaré lemma'),
  'ev-dg-pattern-manifold-is-surface': dgEntry('Identifying a smooth manifold with a surface embedded in R^N'),
  'ev-dg-pattern-global-coordinates': dgEntry('Believing that every point of a manifold can be labelled by a unique coordinate'),
  'ev-dg-pattern-derivation-ignores-leibniz': dgEntry('Omitting the Leibniz rule when defining a derivation'),
  'ev-dg-pattern-closed-implies-exact': dgEntry('Treating every closed form as exact'),
  'ev-dg-inverse-implicit': {
    title: 'The derivation of the implicit function theorem depends on the inverse function theorem',
    scope: 'The equation F(x,y)=0 is turned into the inverse-function problem for (x,y) ↦ (x, F(x,y)), and the inverse function theorem is then applied; the ground is the body text of the two theorems and the derivation as narrated on this site.',
    obligations: ['Encode this derivation as an ND certificate of Chapter 02 (at present it is only a body-level narration)', 'Check that the hypotheses of the two theorem statements are aligned item by item (open sets, C¹, invertible Jacobian)'],
  },
  'ev-dg-method-inverse-check': {
    title: 'Inverse-function-theorem check: distilled from the derivation steps in the body of the source file',
    scope: 'The method itself is a procedure, not a provable proposition; this evidence states only that “the steps agree with the source file”, not that it is a theorem.',
    obligations: ['Encode it as an ND certificate of Chapter 02', 'Check whether the distilled steps omit any hypothesis of the source file'],
  },
  'ev-dg-method-closed-form-test': {
    title: 'Exactness test for closed forms: distilled from the derivation steps in the body of the source file',
    scope: 'The method itself is a procedure, not a provable proposition; this evidence states only that “the steps agree with the source file”, not that it is a theorem.',
    obligations: ['Encode it as an ND certificate of Chapter 02', 'Check that the treatment of non-contractible regions agrees with the source file'],
  },

  /* —— 案例 06：梁灿彬《微分几何与广义相对论》第一册 —— */
  'ev-liang-topological-space': liangEntry('Topological spaces', 1, '§1.2'),
  'ev-liang-continuous-map': liangEntry('Continuous maps and homeomorphisms', 1, '§1.2'),
  'ev-liang-compactness': liangEntry('Compactness', 1, '§1.3 [optional reading]'),
  'ev-liang-manifold': liangEntry('Differentiable manifolds', 2, '§2.1'),
  'ev-liang-tangent-vector': liangEntry('Tangent vectors', 2, '§2.2.1'),
  'ev-liang-vector-field': liangEntry('Vector fields', 2, '§2.2.2'),
  'ev-liang-dual-vector-field': liangEntry('Dual vector fields', 2, '§2.3'),
  'ev-liang-tensor-field': liangEntry('Tensor fields and contraction', 2, '§2.4'),
  'ev-liang-metric-tensor': liangEntry('The metric tensor field', 2, '§2.5'),
  'ev-liang-abstract-index': liangEntry('Abstract index notation', 2, '§2.6'),
  'ev-liang-derivative-operator': liangEntry('Derivative operators', 3, '§3.1'),
  'ev-liang-christoffel': liangEntry('The derivative operator compatible with the metric, and the Christoffel symbols', 3, '§3.2.2'),
  'ev-liang-parallel-transport': liangEntry('Parallel transport along a curve', 3, '§3.2.1'),
  'ev-liang-geodesic': liangEntry('Geodesics', 3, '§3.3'),
  'ev-liang-riemann-tensor': liangEntry('The Riemann curvature tensor', 3, '§3.4.1'),
  'ev-liang-ricci-einstein': liangEntry('The Ricci tensor, the scalar curvature and the Einstein tensor', 3, '§3.4.2'),
  'ev-liang-intrinsic-extrinsic-curvature': liangEntry('Intrinsic and extrinsic curvature', 3, '§3.5'),
  'ev-liang-pushforward-pullback': liangEntry('Maps between manifolds, pushforwards and pullbacks', 4, '§4.1'),
  'ev-liang-lie-derivative': liangEntry('The Lie derivative', 4, '§4.2'),
  'ev-liang-killing-field': liangEntry('Killing vector fields', 4, '§4.3'),
  'ev-liang-hypersurface': liangEntry('Hypersurfaces and normal vectors', 4, '§4.4'),
  'ev-liang-differential-form': liangEntry('Differential forms and the wedge product', 5, '§5.1'),
  'ev-liang-exterior-derivative': liangEntry('The exterior derivative and closed forms', 5, '§5.1'),
  'ev-liang-volume-element': liangEntry('The volume element and integration on manifolds', 5, '§5.4'),
  'ev-liang-stokes-theorem': liangEntry('Stokes’ theorem', 5, '§5.3'),
  'ev-liang-gauss-theorem': liangEntry('Gauss’ theorem and dual differential forms', 5, '§5.5–§5.6'),
  'ev-liang-minkowski-spacetime': liangEntry('Minkowski spacetime', 6, '§6.1.2'),
  'ev-liang-inertial-observer': liangEntry('Inertial observers and inertial frames', 6, '§6.1.3'),
  'ev-liang-proper-time': liangEntry('Proper time and coordinate time', 6, '§6.1.4'),
  'ev-liang-kinematic-effects': liangEntry('Length contraction, time dilation and the twin effect', 6, '§6.2'),
  'ev-liang-four-momentum': liangEntry('4-velocity, 4-momentum and particle dynamics', 6, '§6.3'),
  'ev-liang-energy-momentum-tensor': liangEntry('The energy-momentum tensor and perfect fluids', 6, '§6.4–§6.5'),
  'ev-liang-electromagnetic-tensor': liangEntry('The electromagnetic field tensor and Maxwell’s equations', 6, '§6.6.1–§6.6.4'),
  'ev-liang-four-potential': liangEntry('The electromagnetic 4-potential and the light-wave Doppler effect', 6, '§6.6.5–§6.6.6'),
  'ev-liang-gravity-as-geometry': liangEntry('Gravity and the geometry of spacetime', 7, '§7.1'),
  'ev-liang-equivalence-principle': liangEntry('The equivalence principle and local inertial frames', 7, '§7.5'),
  'ev-liang-fermi-transport': liangEntry('Fermi transport and non-rotating observers', 7, '§7.3–§7.4'),
  'ev-liang-tidal-deviation': liangEntry('Tidal forces and the geodesic deviation equation', 7, '§7.6'),
  'ev-liang-einstein-equation': liangEntry('The Einstein field equations', 7, '§7.7'),
  'ev-liang-linearized-gravity': liangEntry('The linear approximation, the Newtonian limit and gravitational radiation', 7, '§7.8–§7.9'),
  'ev-liang-static-stationary': liangEntry('Stationary, static and spherically symmetric spacetimes', 8, '§8.1–§8.2'),
  'ev-liang-schwarzschild-solution': liangEntry('The Schwarzschild vacuum solution', 8, '§8.3'),
  'ev-liang-birkhoff-theorem': liangEntry('Birkhoff’s theorem', 8, '§8.3.3'),
  'ev-liang-reissner-nordstrom': liangEntry('The Reissner–Nordström solution', 8, '§8.4'),
  'ev-liang-np-formalism': liangEntry('The Newman–Penrose formalism and gauge freedom', 8, '§8.5–§8.10'),
  'ev-liang-schwarzschild-geodesics': liangEntry('Geodesics of Schwarzschild spacetime', 9, '§9.1'),
  'ev-liang-classical-tests': liangEntry('The classical experimental tests of general relativity', 9, '§9.2'),
  'ev-liang-stellar-interior': liangEntry('Spherically symmetric stellar interior solutions and stellar evolution', 9, '§9.3'),
  'ev-liang-kruskal-extension': liangEntry('The Kruskal extension and the infinite-redshift surface', 9, '§9.4.1–§9.4.5'),
  'ev-liang-schwarzschild-black-hole': liangEntry('Gravitational collapse and the Schwarzschild black hole', 9, '§9.4.6'),
  'ev-liang-cosmological-principle': liangEntry('The cosmological principle and spatial geometry', 10, '§10.1.1–§10.1.2'),
  'ev-liang-rw-metric': liangEntry('The Robertson–Walker metric', 10, '§10.1.3'),
  'ev-liang-hubble-redshift': liangEntry('Hubble’s law and cosmological redshift', 10, '§10.2.1–§10.2.2'),
  'ev-liang-scale-factor': liangEntry('Evolution of the scale factor and the cosmological constant', 10, '§10.2.3–§10.2.4'),
  'ev-liang-thermal-history': liangEntry('The thermal history of the universe, dark matter and the particle horizon', 10, '§10.3'),
  'ev-liang-inflation': liangEntry('Inflationary models and the problems they solve', 10, '§10.4'),
  'ev-liang-new-standard-cosmology': liangEntry('Dark energy and the new standard cosmological model', 10, '§10.5'),
  'ev-liang-method-index-balance': {
    title: 'Abstract index balancing and raising and lowering indices: distilled from the derivation steps of the corresponding textbook section',
    scope: 'The method itself is a procedure, not a provable proposition; this evidence states only that “the steps agree with the textbook”, not that it is a theorem.',
    obligations: ['Not encoded as an ND certificate of Chapter 02', 'The textbook text has not been checked page by page'],
  },
  'ev-liang-method-metric-curvature': {
    title: 'A fixed computation from metric to curvature: distilled from the derivation steps of the corresponding textbook section',
    scope: 'The method itself is a procedure, not a provable proposition; this evidence states only that “the steps agree with the textbook”, not that it is a theorem.',
    obligations: ['Not encoded as an ND certificate of Chapter 02', 'The textbook text has not been checked page by page'],
  },
  'ev-liang-method-symmetry-conservation': {
    title: 'Turning Killing fields into conserved quantities: distilled from the derivation steps of the corresponding textbook section',
    scope: 'The method itself is a procedure, not a provable proposition; this evidence states only that “the steps agree with the textbook”, not that it is a theorem.',
    obligations: ['Not encoded as an ND certificate of Chapter 02', 'The textbook text has not been checked page by page'],
  },
  'ev-liang-pattern-curvature-needs-embedding': {
    title: 'Believing that curvature is visible only through an external embedding: a common misconception pointed out in the textbook, with a contrasting example',
    scope: 'A misconception pattern is not a theorem; this evidence states only that “the misconception and the contrasting example come from the corresponding textbook section”.',
    obligations: ['Not encoded as an ND certificate of Chapter 02', 'The textbook text has not been checked page by page'],
  },
  'ev-liang-pattern-christoffel-is-tensor': {
    title: 'Treating the Christoffel symbols as a tensor: a common misconception pointed out in the textbook, with a contrasting example',
    scope: 'A misconception pattern is not a theorem; this evidence states only that “the misconception and the contrasting example come from the corresponding textbook section”.',
    obligations: ['Not encoded as an ND certificate of Chapter 02', 'The textbook text has not been checked page by page'],
  },
  'ev-liang-pattern-redshift-is-doppler': {
    title: 'Reading cosmological redshift directly as a Doppler effect: a common misconception pointed out in the textbook, with a contrasting example',
    scope: 'A misconception pattern is not a theorem; this evidence states only that “the misconception and the contrasting example come from the corresponding textbook section”.',
    obligations: ['Not encoded as an ND certificate of Chapter 02', 'The textbook text has not been checked page by page'],
  },

  /* —— 案例 07：Rudin《数学分析原理》 —— */
  'ev-rudin-ordered-field': rudinRef('Ordered fields', 1, '§1.1–1.17', '3–8'),
  'ev-rudin-least-upper-bound': rudinRef('The real field and the least-upper-bound property', 1, '§1.10, §1.19–1.21', '8–12'),
  'ev-rudin-extended-real': rudinRef('The extended real number system', 1, '§1.23', '11–12'),
  'ev-rudin-complex-field': rudinRef('The complex field', 1, '§1.24–1.27', '12–16'),
  'ev-rudin-euclidean-space': rudinRef('Euclidean space R^k', 1, '§1.35–1.38', '16–21'),
  'ev-rudin-countable-set': rudinRef('Finite, countable and uncountable sets', 2, '§2.1–2.8', '24–30'),
  'ev-rudin-metric-space': rudinRef('Metric spaces', 2, '§2.15–2.20', '30–33'),
  'ev-rudin-compact-set': rudinRef('Compact sets and the Heine–Borel theorem', 2, '§2.31–2.41', '36–42'),
  'ev-rudin-perfect-set': rudinRef('Perfect sets and the Cantor set', 2, '§2.41–2.44', '41–43'),
  'ev-rudin-connected-set': rudinRef('Connected sets', 2, '§2.45–2.47', '42–43'),
  'ev-rudin-convergent-sequence': rudinRef('Convergent sequences and subsequences', 3, '§3.1–3.7', '47–51'),
  'ev-rudin-bolzano-weierstrass': rudinRef('The Bolzano–Weierstrass theorem', 3, '§3.6–3.7', '51–52'),
  'ev-rudin-cauchy-sequence': rudinRef('Cauchy sequences and completeness', 3, '§3.11–3.12', '52–55'),
  'ev-rudin-series-convergence': rudinRef('Series and their convergence criteria', 3, '§3.21–3.29', '58–65'),
  'ev-rudin-power-series': rudinRef('Power series', 3, '§3.39', '69–70'),
  'ev-rudin-absolute-convergence': rudinRef('Absolute convergence and rearrangement', 3, '§3.44–3.55', '71–78'),
  'ev-rudin-continuous-function': rudinRef('Continuous functions', 4, '§4.5–4.9', '85–89'),
  'ev-rudin-continuity-compactness': rudinRef('Continuity and compactness', 4, '§4.14–4.19', '89–93'),
  'ev-rudin-continuity-connectedness': rudinRef('Continuity and connectedness (the intermediate value theorem)', 4, '§4.20–4.23', '93–94'),
  'ev-rudin-derivative': rudinRef('The derivative', 5, '§5.1–5.3', '103–107'),
  'ev-rudin-mean-value-theorem': rudinRef('The mean value theorem', 5, '§5.8–5.11', '107–110'),
  'ev-rudin-lhospital-rule': rudinRef('L’Hospital’s rule', 5, '§5.13', '109–110'),
  'ev-rudin-taylor-theorem': rudinRef('Taylor’s theorem', 5, '§5.15', '110–113'),
  'ev-rudin-vector-derivative': rudinRef('Differentiation of vector-valued functions', 5, '§5.16–5.19', '113–114'),
  'ev-rudin-riemann-stieltjes': rudinRef('The Riemann–Stieltjes integral and its existence', 6, '§6.1–6.10', '120–128'),
  'ev-rudin-integral-properties': rudinRef('Properties of the integral', 6, '§6.11–6.16', '128–133'),
  'ev-rudin-fundamental-theorem': rudinRef('The fundamental theorem of calculus', 6, '§6.17–6.22', '133–135'),
  'ev-rudin-rectifiable-curve': rudinRef('Rectifiable curves', 6, '§6.26–6.27', '136–138'),
  'ev-rudin-uniform-convergence': rudinRef('Uniform convergence', 7, '§7.1–7.10', '143–149'),
  'ev-rudin-uniform-convergence-properties': rudinRef('Uniform convergence, continuity, integration and differentiation', 7, '§7.11–7.17', '149–154'),
  'ev-rudin-equicontinuous': rudinRef('Equicontinuous families', 7, '§7.18–7.25', '154–159'),
  'ev-rudin-stone-weierstrass': rudinRef('The Stone–Weierstrass theorem', 7, '§7.26–7.33', '159–165'),
  'ev-rudin-exponential-logarithm': rudinRef('The exponential and logarithmic functions', 8, '§8.1–8.6', '172–182'),
  'ev-rudin-trigonometric-functions': rudinRef('The trigonometric functions', 8, '§8.7', '182–184'),
  'ev-rudin-algebraic-completeness': rudinRef('Algebraic completeness of the complex field', 8, '§8.8', '184–185'),
  'ev-rudin-fourier-series': rudinRef('Fourier series', 8, '§8.9–8.15', '185–192'),
  'ev-rudin-gamma-function': rudinRef('The Γ function', 8, '§8.17–8.22', '192–196'),
  'ev-rudin-linear-transformation': rudinRef('Linear transformations and the operator norm', 9, '§9.1–9.8', '204–211'),
  'ev-rudin-several-variable-derivative': rudinRef('The derivative of functions of several variables', 9, '§9.11–9.20', '211–220'),
  'ev-rudin-contraction-principle': rudinRef('The contraction mapping principle', 9, '§9.23', '220–221'),
  'ev-rudin-inverse-function-theorem': rudinRef('The inverse function theorem', 9, '§9.24', '221–223'),
  'ev-rudin-implicit-function-theorem': rudinRef('The implicit function theorem', 9, '§9.28', '223–228'),
  'ev-rudin-rank-theorem': rudinRef('The rank theorem', 9, '§9.32', '228–231'),
  'ev-rudin-primitive-mapping': rudinRef('Primitive mappings and partitions of unity', 10, '§10.1–10.9', '245–253'),
  'ev-rudin-differential-form': rudinRef('Differential forms', 10, '§10.10–10.23', '253–266'),
  'ev-rudin-simplex-chain': rudinRef('Simplices and chains', 10, '§10.26–10.30', '266–273'),
  'ev-rudin-stokes-theorem': rudinRef('Stokes’ theorem', 10, '§10.33–10.36', '273–275'),
  'ev-rudin-closed-exact-form': rudinRef('Closed and exact forms', 10, '§10.37–10.40', '275–280'),
  'ev-rudin-set-function': rudinRef('Set functions', 11, '§11.1–11.4', '300–302'),
  'ev-rudin-lebesgue-measure': rudinRef('The construction of the Lebesgue measure', 11, '§11.5–11.10', '302–310'),
  'ev-rudin-measurable-function': rudinRef('Measurable functions', 11, '§11.11–11.17', '310–313'),
  'ev-rudin-lebesgue-integral': rudinRef('The Lebesgue integral', 11, '§11.19–11.25', '313–322'),
  'ev-rudin-l2-space': rudinRef('The L² space', 11, '§11.37–11.43', '325–332'),
  'ev-rudin-method-epsilon-estimate': {
    title: 'ε–N and ε–δ estimates: distilled from a recurring argument in the corresponding chapters of the textbook',
    scope: 'The method itself is a procedure, not a provable proposition; the body text has not been written.',
    obligations: ['Write the body text of the method node', 'Not encoded as an ND certificate of Chapter 02', 'Check that the distilled steps agree with the textbook argument'],
  },
  'ev-rudin-method-compactness-transfer': {
    title: 'Using compactness to globalise local conclusions: distilled from a recurring argument in the corresponding chapters of the textbook',
    scope: 'The method itself is a procedure, not a provable proposition; the body text has not been written.',
    obligations: ['Write the body text of the method node', 'Not encoded as an ND certificate of Chapter 02', 'Check that the distilled steps agree with the textbook argument'],
  },
  'ev-rudin-inverse-from-contraction': {
    title: 'The proof of the inverse function theorem depends on the contraction mapping principle',
    scope: 'The textbook gives the inverse function theorem of §9.24 after the contraction mapping principle of §9.23: it first turns the local invertibility of f into a fixed-point problem for a contraction, then returns to the original map.',
    obligations: ['The textbook proof text has not been checked page by page (registered only from the order of the table of contents and the inputs of this case’s action contracts)', 'Not encoded as an ND certificate of Chapter 02'],
  },
  'ev-rudin-implicit-from-inverse': {
    title: 'The proof of the implicit function theorem depends on the inverse function theorem',
    scope: 'The textbook proves the implicit function theorem of §9.28 by means of the inverse function theorem: it turns the equation F(x,y)=0 into the inverse-function problem for the map (x,y) ↦ (x, F(x,y)).',
    obligations: ['The textbook proof text has not been checked page by page (registered only from the order of the table of contents and the inputs of this case’s action contracts)', 'Not encoded as an ND certificate of Chapter 02'],
  },
};

const evidence = {};
const register = (id, entry, source) => {
  if (evidence[id]) throw new Error(`证据译文重复登记：${id}（来源 ${source}）`);
  evidence[id] = entry;
};

for (const [caseId, module] of Object.entries(MODULES)) {
  const overlay = module?.default ?? module;
  for (const [id, entry] of Object.entries(overlay.evidence ?? {})) register(id, entry, caseId);
}
for (const [id, entry] of Object.entries(remaining)) register(id, entry, 'evidence.mjs/remaining');

export default evidence;
