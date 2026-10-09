/**
 * 英文覆盖：案例「梁灿彬、周彬《微分几何入门与广义相对论》上册」（`liang`）的**节点元数据**。
 *
 * 形状与 `en/limit.mjs` 一致：键是中文源的 id，只写含中文的字段；
 * `discipline`、`roles`、`construct`、`mode`、`provenance.sources[]`、`witness.ref`
 * 一律不出现（受控值与真实书目不是译文）。
 *
 * 三条口径：
 * - 正文是本站凝练笔记，不是教材原文的替代；`provenance.note` 如实这么说，
 *   完整论证与逐条件反例仍然指向教材对应章节。
 * - 术语按 `data/i18n/glossary.mjs`：矢量 = vector、克氏符 = Christoffel symbols、
 *   度规 = metric、联络 = connection、平移 = transport（沿曲线）。
 * - actions / evidence / relations 不在本文件登记（见 `en/actions.mjs` 等聚合文件）。
 */

/** 定义类节点共用的形成检查结论。 */
const FORMATION = 'Parameters and predicate are closed under their declared types.';

/** 凝练笔记的说明。 */
const SOURCE_NOTE = 'The body text is a condensed note written for this site and is not a substitute for the '
  + 'textbook; the complete arguments and the per-condition counterexamples are in the corresponding sections '
  + 'of the textbook.';

/** 方法节点：由教材对应小节的推导步骤提炼，教材没有单列同名方法条目。 */
const METHOD_NOTE = `${SOURCE_NOTE} The method is distilled from the derivation steps of the corresponding `
  + 'textbook section; the textbook does not list a separate method entry of the same name.';

/** 误区模式：取自教材该节明确指出的常见错误理解与它使用的对照例子。 */
const PATTERN_NOTE = `${SOURCE_NOTE} The misconception pattern is taken from a common misunderstanding that the `
  + 'textbook explicitly points out in that section, together with the contrasting example the textbook uses.';

export default {
  nodes: {
    /* —— 拓扑空间与流形（第 1–2 章） —— */
    'liang:topological-space': {
      title: 'Topological space',
      summary: 'T ⊆ P(X) with ∅, X ∈ T; T is closed under finite intersections and under arbitrary unions; the members of T are called open sets.',
      formal: {
        objectType: 'a set together with a family of open sets',
        predicate: 'T ⊆ P(X) with ∅, X ∈ T; T is closed under finite intersections and under arbitrary unions; the members of T are called open sets',
        formationWitness: FORMATION,
        boundary: [
          'The topological axioms do not include separation: once Hausdorff is dropped, limits need not be unique.',
          'A topology is not intrinsic to a set: the same set can carry the discrete topology and the trivial topology, and the two give different convergence behaviour.',
        ],
      },
      teaching: {
        reviewQuestions: ['Which condition in the definition of a topological space can be dropped without losing the main conclusion?'],
      },
      provenance: { note: SOURCE_NOTE },
    },

    'liang:continuous-map': {
      title: 'Continuous maps and homeomorphisms',
      summary: 'f: X → Y is continuous exactly when the preimage of every open set in Y is open in X; f is a homeomorphism exactly when f is a bijection and both f and f⁻¹ are continuous.',
      formal: {
        objectType: 'a map between topological spaces',
        predicate: 'f: X → Y is continuous exactly when the preimage of every open set in Y is open in X; f is a homeomorphism exactly when f is a bijection and both f and f⁻¹ are continuous',
        formationWitness: FORMATION,
        boundary: [
          'Continuity is relative to the topologies on the two sides: change the topology on either side and the same map may fail to be continuous.',
          'A homeomorphism preserves topological properties but not lengths, angles or curvature; it is not “sameness of shape”.',
        ],
      },
      teaching: {
        reviewQuestions: ['Which condition in the definition of continuous maps and homeomorphisms can be dropped without losing the main conclusion?'],
      },
      provenance: { note: SOURCE_NOTE },
    },

    'liang:compactness': {
      title: 'Compactness',
      summary: 'Every open cover of X has a finite subcover.',
      formal: {
        objectType: 'a property of a topological space or of a subset',
        predicate: 'every open cover of X has a finite subcover',
        formationWitness: FORMATION,
        boundary: [
          'Compactness is a topological property, invariant under homeomorphism; in a general topological space compactness does not imply sequential compactness, which also needs first countability.',
          'Compactness itself carries no metric information: “closed and bounded” is equivalent to compact only in R^n.',
        ],
      },
      teaching: {
        reviewQuestions: ['Which condition in the definition of compactness can be dropped without losing the main conclusion?'],
      },
      provenance: { note: SOURCE_NOTE },
    },

    'liang:manifold': {
      title: 'Differentiable manifold',
      summary: 'M is a Hausdorff, second-countable topological space, and there is an open cover {U_α} with homeomorphisms φ_α: U_α → open subsets of R^n such that all transition maps φ_β∘φ_α⁻¹ on overlaps are C^∞.',
      formal: {
        objectType: 'a topological space with a smooth atlas',
        predicate: 'M is a Hausdorff, second-countable topological space, and there is an open cover {U_α} with homeomorphisms φ_α: U_α → open subsets of R^n such that all transition maps φ_β∘φ_α⁻¹ on overlaps are C^∞',
        formationWitness: FORMATION,
        boundary: [
          'Coordinates are local: in general no single chart covers the whole manifold (S² needs at least two stereographic charts).',
          'Second countability cannot be dropped: without it one loses partitions of unity, and with them the tool that turns local definitions into global ones.',
        ],
      },
      teaching: {
        reviewQuestions: ['Which condition in the definition of a differentiable manifold can be dropped without losing the main conclusion?'],
      },
      provenance: { note: SOURCE_NOTE },
    },

    'liang:tangent-vector': {
      title: 'Tangent vector',
      summary: 'Smooth curves through p are classified up to the equivalence “(φ∘γ)′(0) agrees in some coordinate chart”, and each equivalence class is a tangent vector at p; T_pM is an n-dimensional real vector space.',
      formal: {
        objectType: 'a tangent vector to a smooth manifold at a point',
        predicate: 'smooth curves through p are classified up to the equivalence “(φ∘γ)′(0) agrees in some coordinate chart”, and each equivalence class is a tangent vector at p; T_pM is an n-dimensional real vector space',
        formationWitness: FORMATION,
        boundary: [
          'The definition of the equivalence class depends on the smooth structure but not on the choice of coordinate chart; with only a C^0 structure it cannot be defined this way.',
          'A tangent vector is not “an arrow sticking out of p”: it carries no global information about the curve, only its first-order behaviour.',
        ],
      },
      teaching: {
        reviewQuestions: ['Which condition in the definition of a tangent vector can be dropped without losing the main conclusion?'],
      },
      provenance: { note: SOURCE_NOTE },
    },

    'liang:vector-field': {
      title: 'Vector field',
      summary: 'v is a map M → TM with π∘v = id_M whose components v^μ(x) are C^∞ functions in every coordinate chart.',
      formal: {
        objectType: 'a smooth section of the tangent bundle',
        predicate: 'v is a map M → TM with π∘v = id_M whose components v^μ(x) are C^∞ functions in every coordinate chart',
        formationWitness: FORMATION,
        boundary: [
          'Smoothness is a local property: it has to hold in every chart of a cover, and checking a single chart is not enough.',
          'A vector field differs from “a family of tangent vectors”: the latter needs no smoothness or continuity at all.',
        ],
      },
      teaching: {
        reviewQuestions: ['Which condition in the definition of a vector field can be dropped without losing the main conclusion?'],
      },
      provenance: { note: SOURCE_NOTE },
    },

    'liang:dual-vector-field': {
      title: 'Dual vector field',
      summary: 'ω: M → T*M is smooth and ω|_p ∈ T*_pM is a linear function on T_pM; df is defined by df(v) = v(f).',
      formal: {
        objectType: 'a smooth section of the cotangent bundle',
        predicate: 'ω: M → T*M is smooth and ω|_p ∈ T*_pM is a linear function on T_pM; df is defined by df(v) = v(f)',
        formationWitness: FORMATION,
        boundary: [
          'A dual vector and a vector are not objects of the same space; without a metric the two cannot be naturally identified.',
          'df uses only first-order information about f: df = 0 when f is constant, and on a connected manifold the converse also holds.',
        ],
      },
      teaching: {
        reviewQuestions: ['Which condition in the definition of a dual vector field can be dropped without losing the main conclusion?'],
      },
      provenance: { note: SOURCE_NOTE },
    },

    'liang:tensor-field': {
      title: 'Tensor fields and contraction',
      summary: 'At every point T maps k dual vectors and l vectors to a real number, linearly in each argument, and its components are C^∞ functions in every coordinate chart; contraction is the linear operation that pairs one upper with one lower index.',
      formal: {
        objectType: 'a field of (k, l)-type multilinear maps',
        predicate: 'at every point T maps k dual vectors and l vectors to a real number, linearly in each argument, and its components are C^∞ functions in every coordinate chart; contraction is the linear operation that pairs one upper with one lower index',
        formationWitness: FORMATION,
        boundary: [
          'Contraction must pair one upper with one lower index: two upper indices of the same type cannot be contracted.',
          '“The components transform according to the tensor transformation law” is a criterion, not the definition; the definition comes first and only then the criterion.',
        ],
      },
      teaching: {
        reviewQuestions: ['Which condition in the definition of tensor fields and contraction can be dropped without losing the main conclusion?'],
      },
      provenance: { note: SOURCE_NOTE },
    },

    'liang:metric-tensor': {
      title: 'Metric tensor field',
      summary: 'g is a symmetric, non-degenerate smooth (0,2)-tensor field on M; at every point it gives a symmetric bilinear form on the tangent space, it can raise and lower indices, and it gives the line element ds² = g_{μν} dx^μ dx^ν.',
      formal: {
        objectType: 'a symmetric non-degenerate (0,2)-tensor field',
        predicate: 'g is a symmetric, non-degenerate smooth (0,2)-tensor field on M; at every point it gives a symmetric bilinear form on the tangent space, it can raise and lower indices, and it gives the line element ds² = g_{μν} dx^μ dx^ν',
        formationWitness: FORMATION,
        boundary: [
          'Non-degeneracy cannot be dropped: for a degenerate metric the inverse metric does not exist and raising and lowering indices fails.',
          'A Riemannian metric is required to be positive definite, whereas a Lorentzian metric only has to be non-degenerate with signature (−,+,+,+); the latter does not give a notion of “positive length”.',
        ],
      },
      teaching: {
        reviewQuestions: ['Which condition in the definition of a metric tensor field can be dropped without losing the main conclusion?'],
      },
      provenance: { note: SOURCE_NOTE },
    },

    'liang:abstract-index': {
      title: 'Abstract index notation',
      summary: 'Abstract indices only record the type of a tensor and the pairing of contractions, without reference to any coordinate basis; the free indices on the two sides of an equation must balance one upper for one lower.',
      formal: {
        objectType: 'a notational convention for tensor indices',
        predicate: 'abstract indices only record the type of a tensor and the pairing of contractions, without reference to any coordinate basis; the free indices on the two sides of an equation must balance one upper for one lower',
        formationWitness: FORMATION,
        boundary: [
          'Abstract indices are not component indices: writing T^a{}_b does not choose any basis.',
          'The balancing rule is a legality condition on the notation, not a mathematical conclusion; ignoring it produces meaningless equations.',
        ],
      },
      teaching: {
        reviewQuestions: ['Which condition in the definition of abstract index notation can be dropped without losing the main conclusion?'],
      },
      provenance: { note: SOURCE_NOTE },
    },

    /* —— 导数算符与曲率（第 3 章） —— */
    'liang:derivative-operator': {
      title: 'Derivative operator',
      summary: '∇ is linear, satisfies the Leibniz rule, commutes with contraction, and acts on functions as the exterior derivative: ∇_a f = df.',
      formal: {
        objectType: 'an operator taking (k, l)-tensor fields to (k, l+1)-tensor fields',
        predicate: '∇ is linear, satisfies the Leibniz rule, commutes with contraction, and acts on functions as the exterior derivative: ∇_a f = df',
        formationWitness: FORMATION,
        boundary: [
          '“Commutes with contraction” cannot be dropped: without it one gets a pseudo-operator that looks like a derivative only in particular coordinates.',
          'A general manifold carries no natural derivative operator; ∇ is extra structure, not something the manifold comes with.',
        ],
      },
      teaching: {
        reviewQuestions: ['Which condition in the definition of a derivative operator can be dropped without losing the main conclusion?'],
      },
      provenance: { note: SOURCE_NOTE },
    },

    'liang:christoffel': {
      title: 'The metric-compatible derivative operator and the Christoffel symbols',
      summary: 'There is a unique derivative operator ∇ satisfying both ∇_a g_{bc} = 0 and vanishing torsion T^c{}_{ab} = 0; its components are Γ^μ{}_{νσ} = ½ g^{μρ}(∂_ν g_{ρσ} + ∂_σ g_{ρν} − ∂_ρ g_{νσ}).',
      formal: {
        objectType: 'the derivative operator that is torsion-free and compatible with the metric',
        predicate: 'there is a unique derivative operator ∇ satisfying both ∇_a g_{bc} = 0 and vanishing torsion T^c{}_{ab} = 0; its components are Γ^μ{}_{νσ} = ½ g^{μρ}(∂_ν g_{ρσ} + ∂_σ g_{ρν} − ∂_ρ g_{νσ})',
        formationWitness: FORMATION,
        boundary: [
          'Uniqueness uses both “compatible” and “torsion-free”: requiring compatibility alone leaves infinitely many connections.',
          'The Christoffel symbols are not a tensor: under a change of coordinates they pick up an inhomogeneous term, so “Γ is 0 at a point” is not a coordinate-independent statement.',
        ],
      },
      teaching: {
        reviewQuestions: ['Which condition in the definition of the metric-compatible derivative operator and the Christoffel symbols can be dropped without losing the main conclusion?'],
      },
      provenance: { note: SOURCE_NOTE },
    },

    'liang:parallel-transport': {
      title: 'Parallel transport along a curve',
      summary: 'A vector parallel-transported along a curve γ satisfies t^a∇_a v^b = 0; this defines the derivative t^a∇_a v^b of a vector along the curve.',
      formal: {
        objectType: 'an operation that carries tangent vectors along a curve',
        predicate: 'a vector parallel-transported along a curve γ satisfies t^a∇_a v^b = 0; this defines the derivative t^a∇_a v^b of a vector along the curve',
        formationWitness: FORMATION,
        boundary: [
          'Transport depends on the curve: on a general manifold, carrying the same vector to the same point along different curves can give different results — this is exactly where curvature comes from.',
          'Transport is along a curve; one cannot speak of “transporting a vector between two points” independently of the curve.',
        ],
      },
      teaching: {
        reviewQuestions: ['Which condition in the definition of parallel transport along a curve can be dropped without losing the main conclusion?'],
      },
      provenance: { note: SOURCE_NOTE },
    },

    'liang:geodesic': {
      title: 'Geodesic',
      summary: 'A geodesic satisfies t^a∇_a t^b = 0; in coordinates this reads d²x^μ/dλ² + Γ^μ{}_{νσ} (dx^ν/dλ)(dx^σ/dλ) = 0, and λ is called an affine parameter.',
      formal: {
        objectType: 'a curve whose tangent vector is parallel-transported along itself',
        predicate: 'a geodesic satisfies t^a∇_a t^b = 0; in coordinates this reads d²x^μ/dλ² + Γ^μ{}_{νσ} (dx^ν/dλ)(dx^σ/dλ) = 0, and λ is called an affine parameter',
        formationWitness: FORMATION,
        boundary: [
          'The affine parameter admits only further affine transformations λ ↦ aλ + b; with a non-affine parameter the equation acquires an extra term.',
          'A geodesic gives only a local extremum, not a globally shortest curve; a great circle on the sphere is a geodesic, but after going round several times it is no longer short.',
        ],
      },
      teaching: {
        reviewQuestions: ['Which condition in the definition of a geodesic can be dropped without losing the main conclusion?'],
      },
      provenance: { note: SOURCE_NOTE },
    },

    'liang:riemann-tensor': {
      title: 'Riemann curvature tensor',
      summary: 'R^a{}_{bcd} is defined by the commutator of two derivative operators: (∇_a∇_b − ∇_b∇_a)ω_c = R^d{}_{cab}ω_d; it measures the discrepancy after transporting around a loop along different curves.',
      formal: {
        objectType: 'a (1,3)-tensor field',
        predicate: 'R^a{}_{bcd} is defined by the commutator of two derivative operators: (∇_a∇_b − ∇_b∇_a)ω_c = R^d{}_{cab}ω_d; it measures the discrepancy after transporting around a loop along different curves',
        formationWitness: FORMATION,
        boundary: [
          'Curvature is a property of ∇, not of the manifold: different connections on one and the same manifold give different curvatures.',
          'The antisymmetries of R^a{}_{bcd}, the pair-exchange symmetry and the Bianchi identities use vanishing torsion; without it they no longer hold.',
        ],
      },
      teaching: {
        reviewQuestions: ['Which condition in the definition of the Riemann curvature tensor can be dropped without losing the main conclusion?'],
      },
      provenance: { note: SOURCE_NOTE },
    },

    'liang:ricci-einstein': {
      title: 'Ricci tensor, scalar curvature and Einstein tensor',
      summary: 'R_{ac} = R^b{}_{abc}, R = g^{ab}R_{ab}, G_{ab} = R_{ab} − ½ R g_{ab}; the Bianchi identities give ∇^a G_{ab} = 0.',
      formal: {
        objectType: 'contractions of the Riemann tensor',
        predicate: 'R_{ac} = R^b{}_{abc}, R = g^{ab}R_{ab}, G_{ab} = R_{ab} − ½ R g_{ab}; the Bianchi identities give ∇^a G_{ab} = 0',
        formationWitness: FORMATION,
        boundary: [
          'The Ricci tensor discards all the information contained in the Riemann tensor: the Weyl part contributes nothing to Ricci, so a vacuum region (R_{ab} = 0) can still be curved.',
          '∇^a G_{ab} = 0 is a geometric identity and holds before any field equation.',
        ],
      },
      teaching: {
        reviewQuestions: ['Which condition in the definition of the Ricci tensor, scalar curvature and Einstein tensor can be dropped without losing the main conclusion?'],
      },
      provenance: { note: SOURCE_NOTE },
    },

    'liang:intrinsic-extrinsic-curvature': {
      title: 'Intrinsic and extrinsic curvature',
      summary: 'Intrinsic curvature is computed from the induced metric on the submanifold through its own Riemann tensor; the extrinsic curvature K_{ab} is given by the way the submanifold is embedded in the ambient manifold (half the derivative of the normal vector along tangential directions).',
      formal: {
        objectType: 'the two kinds of bending of a submanifold',
        predicate: 'intrinsic curvature is computed from the induced metric on the submanifold through its own Riemann tensor; the extrinsic curvature K_{ab} is given by the way the submanifold is embedded in the ambient manifold (half the derivative of the normal vector along tangential directions)',
        formationWitness: FORMATION,
        boundary: [
          'Extrinsic curvature is not intrinsic to the submanifold: one and the same intrinsic geometry can have different embeddings and hence different extrinsic curvatures.',
          'The cylinder is intrinsically flat (its Riemann tensor vanishes) while its extrinsic curvature is non-zero — the standard example showing that neither implies the other.',
        ],
      },
      teaching: {
        reviewQuestions: ['Which condition in the definition of intrinsic and extrinsic curvature can be dropped without losing the main conclusion?'],
      },
      provenance: { note: SOURCE_NOTE },
    },

    /* —— 李导数与超曲面（第 4 章） —— */
    'liang:pushforward-pullback': {
      title: 'Maps between manifolds, pushforward and pullback',
      summary: 'φ: M → N induces the pushforward φ_*: T_pM → T_{φ(p)}N and the pullback φ^*: T^*_{φ(p)}N → T^*_pM, satisfying φ_*(v)(f) = v(f∘φ).',
      formal: {
        objectType: 'the maps induced by a smooth map',
        predicate: 'φ: M → N induces the pushforward φ_*: T_pM → T_{φ(p)}N and the pullback φ^*: T^*_{φ(p)}N → T^*_pM, satisfying φ_*(v)(f) = v(f∘φ)',
        formationWitness: FORMATION,
        boundary: [
          'The pushforward sends vectors forwards, whereas for functions it is the pullback; when φ is not injective, φ_* cannot carry a vector field on N back to M.',
          'Pushforward and pullback are mutually inverse only when φ is a diffeomorphism.',
        ],
      },
      teaching: {
        reviewQuestions: ['Which condition in the definition of maps between manifolds, pushforward and pullback can be dropped without losing the main conclusion?'],
      },
      provenance: { note: SOURCE_NOTE },
    },

    'liang:lie-derivative': {
      title: 'Lie derivative',
      summary: 'L_v T = lim_{t→0} (φ_{-t}^* T − T)/t, where φ_t is the one-parameter group of diffeomorphisms generated by v; for vector fields L_v w = [v, w].',
      formal: {
        objectType: 'a derivative of tensor fields defined by the flow of a vector field',
        predicate: 'L_v T = lim_{t→0} (φ_{-t}^* T − T)/t, where φ_t is the one-parameter group of diffeomorphisms generated by v; for vector fields L_v w = [v, w]',
        formationWitness: FORMATION,
        boundary: [
          'The Lie derivative needs no extra structure (no connection), so it and ∇ are two different operators.',
          'On vector fields the Lie derivative is the Lie bracket; it is not “differentiating the components along each direction one by one”.',
        ],
      },
      teaching: {
        reviewQuestions: ['Which condition in the definition of the Lie derivative can be dropped without losing the main conclusion?'],
      },
      provenance: { note: SOURCE_NOTE },
    },

    'liang:killing-field': {
      title: 'Killing vector field',
      summary: 'L_ξ g_{ab} = 0, equivalently the Killing equation ∇_a ξ_b + ∇_b ξ_a = 0; its integral curves are a one-parameter group of isometries.',
      formal: {
        objectType: 'a vector field that preserves the metric',
        predicate: 'L_ξ g_{ab} = 0, equivalently the Killing equation ∇_a ξ_b + ∇_b ξ_a = 0; its integral curves are a one-parameter group of isometries',
        formationWitness: FORMATION,
        boundary: [
          'Writing it as ∇_a ξ_b + ∇_b ξ_a = 0 presupposes the metric-compatible ∇; the definition itself is L_ξ g = 0.',
          'An n-dimensional spacetime has at most n(n+1)/2 independent Killing fields; reaching that bound means a maximally symmetric spacetime, and Minkowski and constant-curvature spacetimes are the only examples.',
        ],
      },
      teaching: {
        reviewQuestions: ['Which condition in the definition of a Killing vector field can be dropped without losing the main conclusion?'],
      },
      provenance: { note: SOURCE_NOTE },
    },

    'liang:hypersurface': {
      title: 'Hypersurfaces and normal vectors',
      summary: 'When S is locally given by f = const (df ≠ 0), take the normal covector n_a = ∇_a f; if S is spacelike or timelike it can be normalised and induces a metric h_{ab} on S.',
      formal: {
        objectType: 'a codimension-1 submanifold and its induced structure',
        predicate: 'when S is locally given by f = const (df ≠ 0), take the normal covector n_a = ∇_a f; if S is spacelike or timelike it can be normalised and induces a metric h_{ab} on S',
        formationWitness: FORMATION,
        boundary: [
          'The normal vector can be spacelike, timelike or null; a null hypersurface (such as an event horizon) cannot be normalised and its induced metric is degenerate.',
          'f = const is only a local description: a global hypersurface need not be a level set of any function, nor need it be orientable.',
        ],
      },
      teaching: {
        reviewQuestions: ['Which condition in the definition of hypersurfaces and normal vectors can be dropped without losing the main conclusion?'],
      },
      provenance: { note: SOURCE_NOTE },
    },

    'liang:differential-form': {
      title: 'Differential forms and the exterior product',
      summary: 'A p-form is a totally antisymmetric multilinear map at every point, and the space of all of them is denoted Ω^p(M); the exterior product satisfies ω∧η = (−1)^{pq} η∧ω (with ω of degree p and η of degree q).',
      formal: {
        objectType: 'a totally antisymmetric (0,p)-tensor field',
        predicate: 'a p-form is a totally antisymmetric multilinear map at every point, and the space of all of them is denoted Ω^p(M); the exterior product satisfies ω∧η = (−1)^{pq} η∧ω (with ω of degree p and η of degree q)',
        formationWitness: FORMATION,
        boundary: [
          'Total antisymmetry is the core of the definition: treating an ordinary multilinear object as a form gives wrong signs when the order is exchanged.',
          'For p > n one has Ω^p(M) = {0}; this is not a technical detail but the source of the finite-dimensionality of the exterior algebra.',
        ],
      },
      teaching: {
        reviewQuestions: ['Which condition in the definition of differential forms and the exterior product can be dropped without losing the main conclusion?'],
      },
      provenance: { note: SOURCE_NOTE },
    },

    /* —— 微分形式及其积分（第 5 章） —— */
    'liang:exterior-derivative': {
      title: 'Exterior derivative and closed forms',
      summary: 'd is uniquely determined by df(v) = v(f) and d(ω∧η) = dω∧η + (−1)^p ω∧dη; always d(dω) = 0; dω = 0 is called closed and ω = dη is called exact.',
      formal: {
        objectType: 'an operator Ω^p(M) → Ω^{p+1}(M)',
        predicate: 'd is uniquely determined by df(v) = v(f) and d(ω∧η) = dω∧η + (−1)^p ω∧dη; always d(dω) = 0; dω = 0 is called closed and ω = dη is called exact',
        formationWitness: FORMATION,
        boundary: [
          '“Exact ⇒ closed” always holds; “closed ⇒ exact” holds only on contractible regions, and in general the obstruction is measured by de Rham cohomology.',
          'd needs no extra structure, whereas ∇ needs a connection: conflating the two loses this distinction.',
        ],
      },
      teaching: {
        reviewQuestions: ['Which condition in the definition of the exterior derivative and closed forms can be dropped without losing the main conclusion?'],
      },
      provenance: { note: SOURCE_NOTE },
    },

    'liang:volume-element': {
      title: 'Volume element and integration on a manifold',
      summary: 'On an oriented n-dimensional manifold take a nowhere-zero n-form ε as the volume element and set ∫_M f = ∫ f ε; when a metric exists, in coordinates ε = √|det g| dx¹∧…∧dxⁿ.',
      formal: {
        objectType: 'an n-form on an oriented manifold',
        predicate: 'on an oriented n-dimensional manifold take a nowhere-zero n-form ε as the volume element and set ∫_M f = ∫ f ε; when a metric exists, in coordinates ε = √|det g| dx¹∧…∧dxⁿ',
        formationWitness: FORMATION,
        boundary: [
          'A volume element needs an orientation; on a non-orientable manifold (such as the Möbius band) no global nowhere-zero n-form exists.',
          'Without a metric the volume element is not unique: any nowhere-zero n-form can serve as one, and the value of the integral changes with the choice.',
        ],
      },
      teaching: {
        reviewQuestions: ['Which condition in the definition of the volume element and integration on a manifold can be dropped without losing the main conclusion?'],
      },
      provenance: { note: SOURCE_NOTE },
    },

    'liang:stokes-theorem': {
      title: 'Stokes theorem',
      summary: '∫_M dω = ∫_{∂M} ω, where M is an oriented n-dimensional manifold with boundary, ω a compactly supported (n−1)-form, and ∂M carries the induced orientation.',
      formal: {
        formula: '∫_M dω = ∫_{∂M} ω, where M is an oriented n-dimensional manifold with boundary, ω a compactly supported (n−1)-form, and ∂M carries the induced orientation',
        boundary: [
          'An orientation is needed, and ω must have compact support (or M must be compact); otherwise either side may fail to converge.',
          'It unifies the Newton–Leibniz formula, Green’s formula, the Gauss theorem and the classical Stokes formula into a single statement.',
        ],
      },
      teaching: {
        reviewQuestions: ['Which hypothesis, when dropped, makes the conclusion of the Stokes theorem fail?'],
      },
      provenance: { note: SOURCE_NOTE },
    },

    'liang:gauss-theorem': {
      title: 'Gauss theorem and the dual differential form',
      summary: 'The Hodge dual * maps p-forms linearly isomorphically onto (n−p)-forms, *(dx^{i₁}∧…∧dx^{i_p}) = (√|g|/(n−p)!) ε_{i₁…i_p j₁…j_{n−p}} dx^{j₁}∧…; the Gauss theorem is the Stokes theorem applied to the dual form.',
      formal: {
        formula: 'the Hodge dual * maps p-forms linearly isomorphically onto (n−p)-forms, *(dx^{i₁}∧…∧dx^{i_p}) = (√|g|/(n−p)!) ε_{i₁…i_p j₁…j_{n−p}} dx^{j₁}∧…; the Gauss theorem is the Stokes theorem applied to the dual form',
        boundary: [
          'The Hodge dual depends on the metric and the orientation; without a metric one can only speak of “an isomorphism pairing p-forms with (n−p)-forms”.',
          '*(*ω) = (−1)^{p(n−p)} s ω, where the sign is determined by the signature s — the point most easily overlooked.',
        ],
      },
      teaching: {
        reviewQuestions: ['Which hypothesis, when dropped, makes the conclusion of the Gauss theorem and the dual differential form fail?'],
      },
      provenance: { note: SOURCE_NOTE },
    },

    /* —— 狭义相对论（第 6 章） —— */
    'liang:minkowski-spacetime': {
      title: 'Minkowski spacetime',
      summary: 'η_{ab} = diag(−1, 1, 1, 1); the interval η_{ab}Δx^aΔx^b between two events is accordingly classified as timelike (< 0), null (= 0) or spacelike (> 0).',
      formal: {
        objectType: 'a manifold on R⁴ with a Lorentzian metric',
        predicate: 'η_{ab} = diag(−1, 1, 1, 1); the interval η_{ab}Δx^aΔx^b between two events is accordingly classified as timelike (< 0), null (= 0) or spacelike (> 0)',
        formationWitness: FORMATION,
        boundary: [
          'A Lorentzian metric does not give “positive lengths”: the square of a timelike interval is negative, so it cannot be used as a Riemannian metric.',
          'The coordinate transformations between inertial frames are Lorentz transformations, not arbitrary coordinate transformations; this is the content of “spacetime is an affine space plus a metric”.',
        ],
      },
      teaching: {
        reviewQuestions: ['Which condition in the definition of Minkowski spacetime can be dropped without losing the main conclusion?'],
      },
      provenance: { note: SOURCE_NOTE },
    },

    'liang:inertial-observer': {
      title: 'Inertial observers and inertial frames',
      summary: 'The worldline of an inertial observer is a timelike geodesic, and its 4-velocity u^a = dx^a/dτ satisfies u^a u_a = −1 and u^b∇_b u^a = 0.',
      formal: {
        objectType: 'an observer moving along a timelike geodesic',
        predicate: 'the worldline of an inertial observer is a timelike geodesic, and its 4-velocity u^a = dx^a/dτ satisfies u^a u_a = −1 and u^b∇_b u^a = 0',
        formationWitness: FORMATION,
        boundary: [
          'An inertial frame is a global notion and exists only in flat spacetime; in curved spacetime there are in general only local inertial frames.',
          'An “observer” is a worldline, not a person: any timelike curve can be the worldline of some observer, though not necessarily an inertial one.',
        ],
      },
      teaching: {
        reviewQuestions: ['Which condition in the definition of inertial observers and inertial frames can be dropped without losing the main conclusion?'],
      },
      provenance: { note: SOURCE_NOTE },
    },

    'liang:proper-time': {
      title: 'Proper time and coordinate time',
      summary: 'Proper time is defined along a timelike worldline by dτ = √(−η_{ab}dx^a dx^b); the coordinate time t is a coordinate of the inertial frame, and the two are related by dτ = dt/γ.',
      formal: {
        objectType: 'a time parameter defined along an observer’s worldline',
        predicate: 'proper time is defined along a timelike worldline by dτ = √(−η_{ab}dx^a dx^b); the coordinate time t is a coordinate of the inertial frame, and the two are related by dτ = dt/γ',
        formationWitness: FORMATION,
        boundary: [
          'Proper time is an invariant of the worldline, whereas coordinate time depends on the reference frame; the two agree only at the observer itself (and in its instantaneous inertial frame).',
          'A null curve satisfies dτ = 0: a photon has no proper time, and there is no “photon clock”.',
        ],
      },
      teaching: {
        reviewQuestions: ['Which condition in the definition of proper time and coordinate time can be dropped without losing the main conclusion?'],
      },
      provenance: { note: SOURCE_NOTE },
    },

    'liang:kinematic-effects': {
      title: 'Length contraction, time dilation and the twin effect',
      summary: 'A length measured along the direction of motion is L = L₀/γ, time dilation gives dτ = dt/γ with γ = 1/√(1−v²); the proper-time difference in the twin effect comes from the two worldlines having different lengths.',
      formal: {
        objectType: 'kinematic effects in Minkowski spacetime',
        predicate: 'a length measured along the direction of motion is L = L₀/γ, time dilation gives dτ = dt/γ with γ = 1/√(1−v²); the proper-time difference in the twin effect comes from the two worldlines having different lengths',
        formationWitness: FORMATION,
        boundary: [
          '“Length contraction” is not the compression of a body but a measurement result, once simultaneity depends on the reference frame.',
          'The twin effect does not violate the principle of relativity: the two worldlines simply have different proper times, and one of them must undergo acceleration.',
        ],
      },
      teaching: {
        reviewQuestions: ['Which condition in the definition of length contraction, time dilation and the twin effect can be dropped without losing the main conclusion?'],
      },
      provenance: { note: SOURCE_NOTE },
    },

    'liang:four-momentum': {
      title: '4-velocity, 4-momentum and particle dynamics',
      summary: 'p^a = m u^a and p^a p_a = −m²; the 4-force f^a = u^b∇_b p^a is orthogonal to p^a.',
      formal: {
        objectType: 'the 4-dimensional kinematic and dynamic quantities of a particle',
        predicate: 'p^a = m u^a and p^a p_a = −m²; the 4-force f^a = u^b∇_b p^a is orthogonal to p^a',
        formationWitness: FORMATION,
        boundary: [
          'The rest mass m is a scalar; the time component of the 4-momentum corresponds to the energy of Newtonian mechanics only after a reference frame has been specified.',
          'A massless particle (m = 0) moves along a null geodesic and cannot be described by p^a = m u^a.',
        ],
      },
      teaching: {
        reviewQuestions: ['Which condition in the definition of 4-velocity, 4-momentum and particle dynamics can be dropped without losing the main conclusion?'],
      },
      provenance: { note: SOURCE_NOTE },
    },

    'liang:energy-momentum-tensor': {
      title: 'Energy-momentum tensor and perfect fluids',
      summary: 'T_{ab} is symmetric and conserved, ∇^a T_{ab} = 0; for a perfect fluid T_{ab} = (ρ + p)u_a u_b + p g_{ab}.',
      formal: {
        objectType: 'a symmetric (0,2)-tensor field of a continuous medium',
        predicate: 'T_{ab} is symmetric and conserved, ∇^a T_{ab} = 0; for a perfect fluid T_{ab} = (ρ + p)u_a u_b + p g_{ab}',
        formationWitness: FORMATION,
        boundary: [
          'Conservation ∇^a T_{ab} = 0 is conservation with respect to ∇; in curved spacetime it generally cannot be written as the vanishing of the ordinary coordinate divergence.',
          'The perfect-fluid assumption means no viscosity and no heat flow; dropping it requires adding the corresponding terms, and the form of the conclusion changes with them.',
        ],
      },
      teaching: {
        reviewQuestions: ['Which condition in the definition of the energy-momentum tensor and perfect fluids can be dropped without losing the main conclusion?'],
      },
      provenance: { note: SOURCE_NOTE },
    },

    'liang:electromagnetic-tensor': {
      title: 'Electromagnetic field tensor and Maxwell equations',
      summary: 'F_{ab} = ∇_a A_b − ∇_b A_a is antisymmetric; Maxwell’s equations are ∇^a F_{ab} = −4π J_b and ∇_{[a}F_{bc]} = 0; the electromagnetic energy-momentum tensor is given by a quadratic expression in F.',
      formal: {
        objectType: 'an antisymmetric (0,2)-tensor field',
        predicate: 'F_{ab} = ∇_a A_b − ∇_b A_a is antisymmetric; Maxwell’s equations are ∇^a F_{ab} = −4π J_b and ∇_{[a}F_{bc]} = 0; the electromagnetic energy-momentum tensor is given by a quadratic expression in F',
        formationWitness: FORMATION,
        boundary: [
          'The antisymmetry of F comes from the gauge structure of A; ∇_{[a}F_{bc]} = 0 is equivalent to the local existence of A.',
          'Charge conservation ∇^a J_a = 0 follows from the field equations together with the antisymmetry of F; it is not an extra assumption.',
        ],
      },
      teaching: {
        reviewQuestions: ['Which condition in the definition of the electromagnetic field tensor and Maxwell equations can be dropped without losing the main conclusion?'],
      },
      provenance: { note: SOURCE_NOTE },
    },

    'liang:four-potential': {
      title: 'Electromagnetic 4-potential and the Doppler effect for light',
      summary: 'In the Lorenz gauge ∇^a A_a = 0 one has ∇^b∇_b A_a = −4π J_a; the photon 4-wave-vector k^a is null, an observer measures the frequency ω = −k_a u^a, and the shift is given by the 4-velocities of source and observer.',
      formal: {
        objectType: 'the 4-dimensional potential and its wave equation; the frequency shift of light',
        predicate: 'in the Lorenz gauge ∇^a A_a = 0 one has ∇^b∇_b A_a = −4π J_a; the photon 4-wave-vector k^a is null, an observer measures the frequency ω = −k_a u^a, and the shift is given by the 4-velocities of source and observer',
        formationWitness: FORMATION,
        boundary: [
          'The gauge is not unique: A_a → A_a + ∇_a χ leaves F unchanged; the Lorenz gauge is only a convenient choice, not a physical condition.',
          'The Doppler formula holds in curved spacetime as well, but how the frequency varies along a ray has to be discussed through k^a∇_a ω.',
        ],
      },
      teaching: {
        reviewQuestions: ['Which condition in the definition of the electromagnetic 4-potential and the Doppler effect for light can be dropped without losing the main conclusion?'],
      },
      provenance: { note: SOURCE_NOTE },
    },

    /* —— 广义相对论基础（第 7 章） —— */
    'liang:gravity-as-geometry': {
      title: 'Gravity and spacetime geometry',
      summary: 'A free particle moves along a timelike (or null) geodesic of spacetime; gravity no longer appears as a force in the equations of motion but is encoded in the metric g_{ab}.',
      formal: {
        objectType: 'the basic stance that geometrises gravity',
        predicate: 'a free particle moves along a timelike (or null) geodesic of spacetime; gravity no longer appears as a force in the equations of motion but is encoded in the metric g_{ab}',
        formationWitness: FORMATION,
        boundary: [
          'This is a choice of theory, not a theorem: the equivalence principle rules out distinguishing gravity from an accelerating frame by local experiments, but it does not logically entail that “gravity is curvature”.',
        ],
      },
      teaching: {
        reviewQuestions: ['Which condition in the definition of gravity and spacetime geometry can be dropped without losing the main conclusion?'],
      },
      provenance: { note: SOURCE_NOTE },
    },

    'liang:equivalence-principle': {
      title: 'Equivalence principle and local inertial frames',
      summary: 'At any point p one can choose a local inertial frame (Riemann normal coordinates) with g_{ab}(p) = η_{ab} and Γ^μ{}_{νσ}(p) = 0, so that locally no experiment can distinguish a gravitational field from an accelerating frame.',
      formal: {
        objectType: 'the principle that gravity and inertia are locally indistinguishable',
        predicate: 'at any point p one can choose a local inertial frame (Riemann normal coordinates) with g_{ab}(p) = η_{ab} and Γ^μ{}_{νσ}(p) = 0, so that locally no experiment can distinguish a gravitational field from an accelerating frame',
        formationWitness: FORMATION,
        boundary: [
          'It holds only at a point (and to a specific order in its neighbourhood): Γ can be zero at p, but the derivatives of Γ (the curvature) cannot vanish at the same time.',
          'The tidal effect is exactly the part that a local inertial frame cannot remove, so the equivalence principle by itself does not yield the field equations.',
        ],
      },
      teaching: {
        reviewQuestions: ['Which condition in the definition of the equivalence principle and local inertial frames can be dropped without losing the main conclusion?'],
      },
      provenance: { note: SOURCE_NOTE },
    },

    'liang:fermi-transport': {
      title: 'Fermi transport and non-rotating observers',
      summary: 'Fermi transport satisfies u^b∇_b S^a = (S^b a_b)u^a − (u^b S_b)a^a; along a geodesic (a^a = 0) it reduces to parallel transport; the spin vector of a non-rotating observer is Fermi-transported and orthogonal to u^a.',
      formal: {
        objectType: 'a rule for carrying vectors along an arbitrary observer’s worldline',
        predicate: 'Fermi transport satisfies u^b∇_b S^a = (S^b a_b)u^a − (u^b S_b)a^a; along a geodesic (a^a = 0) it reduces to parallel transport; the spin vector of a non-rotating observer is Fermi-transported and orthogonal to u^a',
        formationWitness: FORMATION,
        boundary: [
          'Fermi transport depends on the 4-velocity and the 4-acceleration of the worldline and is defined only along that worldline.',
          'In curved spacetime “non-rotating” can only be defined as Fermi transport; the phrase “always pointing in the same direction” has no global meaning.',
        ],
      },
      teaching: {
        reviewQuestions: ['Which condition in the definition of Fermi transport and non-rotating observers can be dropped without losing the main conclusion?'],
      },
      provenance: { note: SOURCE_NOTE },
    },

    'liang:tidal-deviation': {
      title: 'Tidal forces and the geodesic deviation equation',
      summary: 'u^b∇_b(u^c∇_c ξ^a) = −R^a{}_{cbd}u^c u^d ξ^b, that is, the relative acceleration of neighbouring geodesics is given by the Riemann tensor.',
      formal: {
        formula: 'u^b∇_b(u^c∇_c ξ^a) = −R^a{}_{cbd}u^c u^d ξ^b, that is, the relative acceleration of neighbouring geodesics is given by the Riemann tensor',
        boundary: [
          'The equation only gives the second-order evolution of ξ^a; initial conditions are still needed to single out a solution.',
          'It shows that curvature cannot be removed by a coordinate transformation and is therefore the “real” part of gravity — the key to distinguishing gravity from an accelerating frame.',
        ],
      },
      teaching: {
        reviewQuestions: ['Which hypothesis, when dropped, makes the conclusion of tidal forces and the geodesic deviation equation fail?'],
      },
      provenance: { note: SOURCE_NOTE },
    },

    'liang:einstein-equation': {
      title: 'Einstein field equations',
      summary: 'G_{ab} + Λ g_{ab} = 8π T_{ab} (in geometric units c = G = 1).',
      formal: {
        formula: 'G_{ab} + Λ g_{ab} = 8π T_{ab} (in geometric units c = G = 1)',
        boundary: [
          'It is a postulate of the theory, not a theorem deduced from more basic propositions; what can be deduced is “∇^a G_{ab} = 0”, which makes ∇^a T_{ab} = 0 hold automatically.',
          'The cosmological constant Λ can only be determined by observation; without it the theory is just as consistent.',
        ],
      },
      teaching: {
        reviewQuestions: ['Which hypothesis, when dropped, makes the conclusion of the Einstein field equations fail?'],
      },
      provenance: { note: SOURCE_NOTE },
    },

    'liang:linearized-gravity': {
      title: 'Linear approximation, Newtonian limit and gravitational radiation',
      summary: 'Taking g_{ab} = η_{ab} + h_{ab} (|h| ≪ 1) and imposing the harmonic gauge gives □h̄_{ab} = −16π T_{ab}; in the static weak-field slow-motion case this reduces to ∇²Φ = 4πρ, while the propagating solutions give gravitational waves travelling at the speed of light.',
      formal: {
        formula: 'taking g_{ab} = η_{ab} + h_{ab} (|h| ≪ 1) and imposing the harmonic gauge gives □h̄_{ab} = −16π T_{ab}; in the static weak-field slow-motion case this reduces to ∇²Φ = 4πρ, while the propagating solutions give gravitational waves travelling at the speed of light',
        boundary: [
          'The linear approximation is valid only for |h| ≪ 1; strong fields (near black holes, the early universe) require solving the nonlinear equations.',
          'The Newtonian limit also requires a weak field, staticity and slow motion; dropping any one of them loses the form ∇²Φ = 4πρ.',
        ],
      },
      teaching: {
        reviewQuestions: ['Which hypothesis, when dropped, makes the conclusion of the linear approximation, the Newtonian limit and gravitational radiation fail?'],
      },
      provenance: { note: SOURCE_NOTE },
    },

    /* —— 爱因斯坦方程的求解（第 8 章） —— */
    'liang:static-stationary': {
      title: 'Stationary, static and spherically symmetric spacetimes',
      summary: 'A stationary metric admits a timelike Killing field ξ^a; static additionally requires ξ^a to be hypersurface-orthogonal (ξ_{[a}∇_b ξ_{c]} = 0), so that a time coordinate with g_{ti} = 0 can be chosen; spherical symmetry requires an SO(3) isometric action whose orbits are two-dimensional spheres.',
      formal: {
        objectType: 'a spacetime with a time or space symmetry',
        predicate: 'a stationary metric admits a timelike Killing field ξ^a; static additionally requires ξ^a to be hypersurface-orthogonal (ξ_{[a}∇_b ξ_{c]} = 0), so that a time coordinate with g_{ti} = 0 can be chosen; spherical symmetry requires an SO(3) isometric action whose orbits are two-dimensional spheres',
        formationWitness: FORMATION,
        boundary: [
          'Stationary and static are defined only through “there exists a Killing field”; Kerr spacetime is stationary but not static.',
          'A rigorous formulation of spherical symmetry uses Killing fields and orbit structure; “it looks like a ball” is not the definition.',
        ],
      },
      teaching: {
        reviewQuestions: ['Which condition in the definition of stationary, static and spherically symmetric spacetimes can be dropped without losing the main conclusion?'],
      },
      provenance: { note: SOURCE_NOTE },
    },

    'liang:schwarzschild-solution': {
      title: 'Schwarzschild vacuum solution',
      summary: 'ds² = −(1 − r_s/r)dt² + (1 − r_s/r)⁻¹dr² + r²dΩ² with r_s = 2GM; it satisfies R_{ab} = 0 for r > r_s.',
      formal: {
        formula: 'ds² = −(1 − r_s/r)dt² + (1 − r_s/r)⁻¹dr² + r²dΩ² with r_s = 2GM; it satisfies R_{ab} = 0 for r > r_s',
        boundary: [
          'The metric components diverge at r = r_s, but the curvature scalars stay finite, so this is a coordinate singularity and not a singularity of spacetime.',
          'The solution holds only in the vacuum region; inside a star an interior solution has to be matched on, and the matching conditions cannot be skipped.',
        ],
      },
      teaching: {
        reviewQuestions: ['Which hypothesis, when dropped, makes the conclusion of the Schwarzschild vacuum solution fail?'],
      },
      provenance: { note: SOURCE_NOTE },
    },

    'liang:birkhoff-theorem': {
      title: 'Birkhoff theorem',
      summary: 'A spherically symmetric vacuum solution must be the Schwarzschild solution (in the sense of its maximal extension); a spherically symmetric vacuum region does not radiate gravitational waves because of stellar pulsations.',
      formal: {
        formula: 'a spherically symmetric vacuum solution must be the Schwarzschild solution (in the sense of its maximal extension); a spherically symmetric vacuum region does not radiate gravitational waves because of stellar pulsations',
        boundary: [
          'It holds only for a vacuum spherically symmetric region; it does not apply when matter is present (T_{ab} ≠ 0).',
          'It does not rule out the interior of a spherically symmetric body evolving in time; it only says that the exterior vacuum region is static.',
        ],
      },
      teaching: {
        reviewQuestions: ['Which hypothesis, when dropped, makes the conclusion of the Birkhoff theorem fail?'],
      },
      provenance: { note: SOURCE_NOTE },
    },

    'liang:reissner-nordstrom': {
      title: 'Reissner–Nordström solution',
      summary: 'ds² = −(1 − r_s/r + Q²/r²)dt² + (1 − r_s/r + Q²/r²)⁻¹dr² + r²dΩ², together with F_{ab} = (Q/r²)(dt)_a∧(dr)_b, satisfies the Einstein–Maxwell equations.',
      formal: {
        formula: 'ds² = −(1 − r_s/r + Q²/r²)dt² + (1 − r_s/r + Q²/r²)⁻¹dr² + r²dΩ², together with F_{ab} = (Q/r²)(dt)_a∧(dr)_b, satisfies the Einstein–Maxwell equations',
        boundary: [
          'The charge makes the metric factor acquire two zeros; when |Q| exceeds the critical value there is no event horizon any more and one obtains a naked singularity.',
          'This shows precisely that “singularities are always hidden behind a horizon” (cosmic censorship) does not hold automatically in the known solutions.',
        ],
      },
      teaching: {
        reviewQuestions: ['Which hypothesis, when dropped, makes the conclusion of the Reissner–Nordström solution fail?'],
      },
      provenance: { note: SOURCE_NOTE },
    },

    'liang:np-formalism': {
      title: 'Newman–Penrose formalism and gauge freedom',
      summary: 'Take a null tetrad {l^a, n^a, m^a, m̄^a} and decompose the Riemann tensor into five complex scalars Ψ₀…Ψ₄, turning the field equations into a first-order system; coordinate conditions are only a gauge choice.',
      formal: {
        objectType: 'a formalism that rewrites the field equations in a null tetrad; the status of coordinate conditions',
        predicate: 'take a null tetrad {l^a, n^a, m^a, m̄^a} and decompose the Riemann tensor into five complex scalars Ψ₀…Ψ₄, turning the field equations into a first-order system; coordinate conditions are only a gauge choice',
        formationWitness: FORMATION,
        boundary: [
          'The NP formalism is an equivalent rewriting and adds no physical content; its value lies in turning second-order equations into first-order ones and in yielding the Petrov classification.',
          'Coordinate conditions (harmonic, isotropic and so on) carry no geometric information: another choice still describes the same spacetime.',
        ],
      },
      teaching: {
        reviewQuestions: ['Which condition in the definition of the Newman–Penrose formalism and gauge freedom can be dropped without losing the main conclusion?'],
      },
      provenance: { note: SOURCE_NOTE },
    },

    /* —— 施瓦西时空（第 9 章） —— */
    'liang:schwarzschild-geodesics': {
      title: 'Geodesics in Schwarzschild spacetime',
      summary: 'The two Killing fields give the conserved quantities E = −ξ^a u_a and L = ψ^a u_a; together with the normalisation u^a u_a = −1 (timelike) or 0 (null) they reduce the geodesic equation to a one-dimensional problem in r.',
      formal: {
        objectType: 'timelike and null geodesics in the Schwarzschild metric',
        predicate: 'the two Killing fields give the conserved quantities E = −ξ^a u_a and L = ψ^a u_a; together with the normalisation u^a u_a = −1 (timelike) or 0 (null) they reduce the geodesic equation to a one-dimensional problem in r',
        formationWitness: FORMATION,
        boundary: [
          'There are only two conserved quantities (staticity + spherical symmetry); a general spacetime has too few of them, and its geodesic equation need not be integrable.',
          'A null geodesic satisfies u^a u_a = 0 and cannot be normalised in the way a timelike 4-velocity is.',
        ],
      },
      teaching: {
        reviewQuestions: ['Which condition in the definition of geodesics in Schwarzschild spacetime can be dropped without losing the main conclusion?'],
      },
      provenance: { note: SOURCE_NOTE },
    },

    'liang:classical-tests': {
      title: 'Classical experimental tests of general relativity',
      summary: 'Gravitational redshift 1 + z = (1 − r_s/r)^{−1/2}; the extra perihelion precession of Mercury per orbit is 6πGM/(a(1−e²)); light deflection Δφ = 4GM/b.',
      formal: {
        formula: 'gravitational redshift 1 + z = (1 − r_s/r)^{−1/2}; the extra perihelion precession of Mercury per orbit is 6πGM/(a(1−e²)); light deflection Δφ = 4GM/b',
        boundary: [
          'These are all weak-field (post-Newtonian order) results and cannot serve as tests in strong-field regions.',
          'Every numerical value depends on the order to which the derivation is carried; without stating that order it cannot be compared with observation.',
        ],
      },
      teaching: {
        reviewQuestions: ['Which hypothesis, when dropped, makes the conclusion of the classical experimental tests of general relativity fail?'],
      },
      provenance: { note: SOURCE_NOTE },
    },

    'liang:stellar-interior': {
      title: 'Interior solution of a spherically symmetric star and stellar evolution',
      summary: 'The TOV equation dp/dr = −(ρ + p)(m + 4πr³p)/(r(r − 2m)) with dm/dr = 4πr²ρ; at r = R one requires p(R) = 0 and matches to the Schwarzschild solution.',
      formal: {
        formula: 'the TOV equation dp/dr = −(ρ + p)(m + 4πr³p)/(r(r − 2m)) with dm/dr = 4πr²ρ; at r = R one requires p(R) = 0 and matches to the Schwarzschild solution',
        boundary: [
          'The TOV equation follows from ∇^a T_{ab} = 0 together with the spherical-symmetry assumption; it is not an independent equation.',
          'There is a maximum mass; beyond it no static solution exists and collapse is unavoidable.',
        ],
      },
      teaching: {
        reviewQuestions: ['Which hypothesis, when dropped, makes the conclusion of the interior solution of a spherically symmetric star and stellar evolution fail?'],
      },
      provenance: { note: SOURCE_NOTE },
    },

    'liang:kruskal-extension': {
      title: 'Kruskal extension and the infinite-redshift surface',
      summary: 'Kruskal coordinates (U, V) glue the regions r > r_s and r < r_s into the maximal extension; at r = r_s the metric is non-degenerate in Kruskal coordinates, whereas at r = 0 the curvature scalars diverge.',
      formal: {
        objectType: 'the maximal extension of Schwarzschild spacetime',
        predicate: 'Kruskal coordinates (U, V) glue the regions r > r_s and r < r_s into the maximal extension; at r = r_s the metric is non-degenerate in Kruskal coordinates, whereas at r = 0 the curvature scalars diverge',
        formationWitness: FORMATION,
        boundary: [
          'Uniqueness of the extension needs the condition “maximal”; different extension schemes give different global structures.',
          'The infinite-redshift surface and the event horizon coincide only in the stationary case; in a rotating black hole they separate.',
        ],
      },
      teaching: {
        reviewQuestions: ['Which condition in the definition of the Kruskal extension and the infinite-redshift surface can be dropped without losing the main conclusion?'],
      },
      provenance: { note: SOURCE_NOTE },
    },

    'liang:schwarzschild-black-hole': {
      title: 'Gravitational collapse and the Schwarzschild black hole',
      summary: 'Once a spherically symmetric star has collapsed inside r_s, its exterior vacuum region is still the Schwarzschild solution by Birkhoff’s theorem; the surface r = r_s becomes the event horizon, and the interior matter reaches r = 0 in finite proper time.',
      formal: {
        formula: 'once a spherically symmetric star has collapsed inside r_s, its exterior vacuum region is still the Schwarzschild solution by Birkhoff’s theorem; the surface r = r_s becomes the event horizon, and the interior matter reaches r = 0 in finite proper time',
        boundary: [
          'The event horizon is a global notion, defined by “whether one can escape to infinity”, and cannot be read off merely from whether local metric components diverge.',
          'Classical general relativity breaks down at r → 0, and conclusions near the singularity need quantum gravity.',
        ],
      },
      teaching: {
        reviewQuestions: ['Which hypothesis, when dropped, makes the conclusion of gravitational collapse and the Schwarzschild black hole fail?'],
      },
      provenance: { note: SOURCE_NOTE },
    },

    /* —— 宇宙论（第 10 章） —— */
    'liang:cosmological-principle': {
      title: 'Cosmological principle and spatial geometry',
      summary: 'There is a family of spacelike hypersurfaces Σ_t that foliates spacetime, and on every leaf the matter distribution is homogeneous and isotropic; the curvature constant of a space of constant curvature is k ∈ {−1, 0, +1}.',
      formal: {
        objectType: 'the assumption of large-scale homogeneity and isotropy, and its geometric consequences',
        predicate: 'there is a family of spacelike hypersurfaces Σ_t that foliates spacetime, and on every leaf the matter distribution is homogeneous and isotropic; the curvature constant of a space of constant curvature is k ∈ {−1, 0, +1}',
        formationWitness: FORMATION,
        boundary: [
          'Homogeneity and isotropy hold only approximately, on sufficiently large scales; treating them as an exact statement contradicts the observed structure.',
          'The principle itself contains no dynamics: it constrains only the form of the metric and does not determine a(t).',
        ],
      },
      teaching: {
        reviewQuestions: ['Which condition in the definition of the cosmological principle and spatial geometry can be dropped without losing the main conclusion?'],
      },
      provenance: { note: SOURCE_NOTE },
    },

    'liang:rw-metric': {
      title: 'Robertson–Walker metric',
      summary: 'ds² = −dt² + a²(t)[dr²/(1 − kr²) + r²dΩ²], k ∈ {−1, 0, +1}; the spatial sections are maximally symmetric spaces.',
      formal: {
        formula: 'ds² = −dt² + a²(t)[dr²/(1 − kr²) + r²dΩ²], k ∈ {−1, 0, +1}; the spatial sections are maximally symmetric spaces',
        boundary: [
          'The RW metric is the only form allowed by the cosmological principle (up to coordinate choice); its strength comes from the strength of the assumption.',
          'The value of k depends on the normalisation convention for a(t); what carries geometric meaning is a combination such as k/|a|.',
        ],
      },
      teaching: {
        reviewQuestions: ['Which hypothesis, when dropped, makes the conclusion of the Robertson–Walker metric fail?'],
      },
      provenance: { note: SOURCE_NOTE },
    },

    'liang:hubble-redshift': {
      title: 'Hubble law and cosmological redshift',
      summary: '1 + z = a(t_obs)/a(t_emit); at low redshift z ≈ H₀d, which is the Hubble law.',
      formal: {
        formula: '1 + z = a(t_obs)/a(t_emit); at low redshift z ≈ H₀d, which is the Hubble law',
        boundary: [
          'Cosmological redshift is not a Doppler effect: it comes from the change of the scale factor during propagation and cannot be plugged directly into a special-relativistic formula.',
          'Measuring H₀ relies on the distance ladder, and the systematic errors of the different methods are still part of the current debate.',
        ],
      },
      teaching: {
        reviewQuestions: ['Which hypothesis, when dropped, makes the conclusion of the Hubble law and cosmological redshift fail?'],
      },
      provenance: { note: SOURCE_NOTE },
    },

    'liang:scale-factor': {
      title: 'Evolution of the scale factor and the cosmological constant',
      summary: '(ȧ/a)² = 8πρ/3 − k/a² + Λ/3 and ä/a = −4π(ρ + 3p)/3 + Λ/3, together with ρ̇ + 3(ȧ/a)(ρ + p) = 0.',
      formal: {
        formula: '(ȧ/a)² = 8πρ/3 − k/a² + Λ/3 and ä/a = −4π(ρ + 3p)/3 + Λ/3, together with ρ̇ + 3(ȧ/a)(ρ + p) = 0',
        boundary: [
          'Only two of the three equations are independent: the Friedmann equation together with conservation already implies the acceleration equation.',
          'For Λ > 0 there is a static solution (Einstein’s static universe), but it is unstable, and an arbitrarily small perturbation leads to expansion or contraction.',
        ],
      },
      teaching: {
        reviewQuestions: ['Which hypothesis, when dropped, makes the conclusion of the evolution of the scale factor and the cosmological constant fail?'],
      },
      provenance: { note: SOURCE_NOTE },
    },

    'liang:thermal-history': {
      title: 'Thermal history of the universe, dark matter and the particle horizon',
      summary: 'As a decreases the radiation temperature rises as T ∝ 1/a, and the universe passes through a radiation-dominated and then a matter-dominated stage; the particle horizon is the causal boundary given by the conformal time ∫dt/a.',
      formal: {
        objectType: 'the thermal evolution and causal boundary of an expanding universe',
        predicate: 'as a decreases the radiation temperature rises as T ∝ 1/a, and the universe passes through a radiation-dominated and then a matter-dominated stage; the particle horizon is the causal boundary given by the conformal time ∫dt/a',
        formationWitness: FORMATION,
        boundary: [
          'The concrete division into stages depends on the particle-physics model and goes beyond general relativity itself.',
          'Dark matter is a name for the observed gravitational effects, and its microscopic identity is undetermined; no candidate particle may be presented as already confirmed.',
        ],
      },
      teaching: {
        reviewQuestions: ['Which condition in the definition of the thermal history of the universe, dark matter and the particle horizon can be dropped without losing the main conclusion?'],
      },
      provenance: { note: SOURCE_NOTE },
    },

    'liang:inflation': {
      title: 'Inflationary models and the problems they solve',
      summary: 'If an accelerating phase (ä > 0) occurred very early, the conformal time ∫dt/a is stretched considerably, which alleviates the horizon (causality) problem and the flatness problem at the same time.',
      formal: {
        formula: 'if an accelerating phase (ä > 0) occurred very early, the conformal time ∫dt/a is stretched considerably, which alleviates the horizon (causality) problem and the flatness problem at the same time',
        boundary: [
          'Inflation is a class of models, not a single theory; agreement of its predictions with observation is not confirmation of the mechanism.',
          'It does not explain the singularity itself; it only pushes the initial-condition problem further back.',
        ],
      },
      teaching: {
        reviewQuestions: ['Which hypothesis, when dropped, makes the conclusion of inflationary models and the problems they solve fail?'],
      },
      provenance: { note: SOURCE_NOTE },
    },

    'liang:new-standard-cosmology': {
      title: 'Dark energy and the new standard cosmological model',
      summary: 'ΛCDM: Λ (or dark energy with equation of state w ≈ −1) together with cold dark matter fits the current accelerating expansion, and Ω_Λ + Ω_m + Ω_k ≈ 1.',
      formal: {
        formula: 'ΛCDM: Λ (or dark energy with equation of state w ≈ −1) together with cold dark matter fits the current accelerating expansion, and Ω_Λ + Ω_m + Ω_k ≈ 1',
        boundary: [
          'Dark energy and the cosmological constant cannot yet be distinguished with present observations; whether w varies with time is an open question.',
          'The “new standard model” is still a revisable model rather than a final conclusion: the fate of the universe depends on the future behaviour of w.',
        ],
      },
      teaching: {
        reviewQuestions: ['Which hypothesis, when dropped, makes the conclusion of dark energy and the new standard cosmological model fail?'],
      },
      provenance: { note: SOURCE_NOTE },
    },

    /* —— 局部方法 —— */
    'liang:method-index-balance': {
      title: 'Balancing abstract indices and raising and lowering them',
      summary: 'Before writing down a tensor equation, first balance the type index by index and check the contraction pairings, and only then use the metric to raise and lower.',
      formal: {
        name: 'Balancing abstract indices and raising and lowering them',
        scope: 'local method',
        In: 'a candidate tensor equation written in abstract indices',
        Out: 'the balanced equation, or the place where the type error is',
        Pre: 'the tensor type of every symbol and the metric g_{ab} are known',
        Post: 'the two sides of the equation have the same type, every contraction pairs one upper with one lower index, and only g and its inverse are used to raise and lower',
        Fail: 'Balancing can only exclude type errors, not prove that the equation holds; index-legal equations that are nonetheless false exist all the same.',
        fail: 'Balancing can only exclude type errors, not prove that the equation holds; index-legal equations that are nonetheless false exist all the same.',
        body: 'Write out the upper and lower indices of every factor → check that the set of free indices is exactly the same in every term → check that every contraction pairs one upper with one lower index → when raising or lowering is needed, only multiply by g_{ab} or g^{ab} and contract immediately → finally compare the covariant orders on the two sides of the equation.',
        boundary: ['It checks only the legality of the notation, not the mathematical content.'],
      },
      motivation: {
        internal: ['Component notation buries the “type” inside the coordinates, whereas abstract indices lift it to the level of notation, so an error is exposed the moment it is written down.'],
        external: ['The most common source of error in relativity calculations is a mismatch of upper and lower indices.'],
        aesthetic: ['Good notation makes the wrong thing impossible to write.'],
        growthChain: ['a component computation that does not match → discovering the index confusion → switching to abstract indices → balancing becomes a preliminary step'],
      },
      teaching: {
        selfCheck: [
          { prompt: 'Decide whether T^a{}_b = S_a V^b is legal, and explain why.', competence: 'judgement', criterion: 'The free indices on the two sides have different types, so the equation is not legal.' },
        ],
        reviewQuestions: ['Why is “free indices must agree on both sides” a rule of notation rather than a mathematical conclusion?'],
      },
      provenance: { note: METHOD_NOTE },
    },

    'liang:method-metric-curvature': {
      title: 'A fixed computational pipeline from the metric to curvature',
      summary: 'Given the metric components, compute in the fixed order “Christoffel symbols → Riemann tensor → Ricci and scalar curvature”, checking each stage against the symmetries.',
      formal: {
        name: 'A fixed computational pipeline from the metric to curvature',
        scope: 'local method',
        In: 'the metric components g_{μν}(x) in a coordinate chart',
        Out: 'Γ^μ{}_{νσ}, R^ρ{}_{σμν}, R_{μν} and R',
        Pre: 'the metric is non-degenerate and it is clear to which order the computation is to be carried',
        Post: 'the components of the tensors at each stage, checked for consistency against the symmetries and the Bianchi identities',
        Fail: 'The pipeline gives the components in that chart only; after a change of coordinates the components of the same spacetime differ, and intermediate quantities such as Γ are not even tensors and cannot be compared directly.',
        fail: 'The pipeline gives the components in that chart only; after a change of coordinates the components of the same spacetime differ, and intermediate quantities such as Γ are not even tensors and cannot be compared directly.',
        body: 'Write down g_{μν} and g^{μν} → compute the Christoffel symbols from the formula for Γ → compute term by term from R^ρ{}_{σμν} = ∂_μΓ^ρ{}_{νσ} − ∂_νΓ^ρ{}_{μσ} + Γ^ρ{}_{μλ}Γ^λ{}_{νσ} − Γ^ρ{}_{νλ}Γ^λ{}_{μσ} → contract to get the Ricci tensor and the scalar curvature → check against the symmetries of R_{ρσμν} and ∇^a G_{ab} = 0.',
        boundary: ['It applies only once the metric components have been written down; it does not address “how to guess the metric”.'],
      },
      motivation: {
        internal: ['Every step of the curvature computation is just partial differentiation and algebra, so it can be fixed into a pipeline and one’s attention left free for the symmetries and the physical meaning.'],
        external: ['Black holes, cosmology and numerical relativity all start from this computation.'],
        aesthetic: ['All the information about bending is hidden in the ten components of g_{μν}, which is a compression in itself.'],
        growthChain: ['wanting to know whether spacetime is curved → needing a coordinate-independent criterion → the Riemann tensor → which can only be computed from the metric'],
      },
      teaching: {
        selfCheck: [
          { prompt: 'Write the leading term of Γ^t{}_{tr} for the Schwarzschild metric at large r and explain why it corresponds to the Newtonian potential.', competence: 'computation', criterion: 'Integrating the leading term 1/(2r)·(r_s/r) gives the logarithmic counterpart of Φ ~ −GM/r.' },
        ],
        reviewQuestions: ['Why check the result against ∇^a G_{ab} = 0 rather than against some other condition?'],
      },
      provenance: { note: METHOD_NOTE },
    },

    'liang:method-symmetry-conservation': {
      title: 'Trading Killing fields for conserved quantities',
      summary: 'Faced with a geodesic equation to solve, first look for the Killing fields of the spacetime, reduce the equation to a lower-dimensional problem, and only then discuss the properties of the solutions.',
      formal: {
        name: 'Trading Killing fields for conserved quantities',
        scope: 'global method',
        In: 'a given metric and a geodesic to be found',
        Out: 'the quantities conserved along the geodesic, and the reduced equations of motion',
        Pre: 'the metric is known and at least one Killing field can be identified',
        Post: 'several conserved quantities and the reduced equations, or an explicit statement that no usable symmetry is available',
        Fail: 'When there is no Killing field the method does not apply, and one may not conclude that “the geodesic is therefore unsolvable” — only that this route fails; geodesics in a general spacetime are indeed not necessarily integrable.',
        fail: 'When there is no Killing field the method does not apply, and one may not conclude that “the geodesic is therefore unsolvable” — only that this route fails; geodesics in a general spacetime are indeed not necessarily integrable.',
        body: 'Read off the continuous symmetries of the metric (no explicit dependence on some coordinate, spherical symmetry, axial symmetry) → write down the corresponding Killing fields → use ξ^a u_a = const to get the conserved quantities → substitute into the normalisation condition u^a u_a = −1 or 0 → reduce the problem to the shape “one coordinate plus one effective potential” → read off the orbit types from the effective potential.',
        boundary: ['The number of conserved quantities equals the number of independent Killing fields; when the symmetry is insufficient the method does not apply.'],
      },
      motivation: {
        internal: ['The geodesic equation is a second-order nonlinear system and cannot be solved directly; symmetry turns it into a one-dimensional problem, which is not a trick but a direct consequence of structure.'],
        external: ['The quantitative predictions for gravitational lensing, planetary precession and cosmological redshift all come from it.'],
        aesthetic: ['“Symmetry gives conserved quantities” links geometry and mechanics in one sentence.'],
        growthChain: ['facing a geodesic equation one cannot solve → noticing that the metric depends on neither t nor φ → getting E and L → the problem reduces to a one-dimensional effective potential'],
      },
      teaching: {
        selfCheck: [
          { prompt: 'Point out two Killing fields in Schwarzschild spacetime and write down the corresponding conserved quantities.', competence: 'judgement', criterion: 'ξ^a = (∂/∂t)^a and ψ^a = (∂/∂φ)^a, corresponding to E = −ξ^a u_a and L = ψ^a u_a.' },
        ],
        reviewQuestions: ['Why does “there is no Killing field” not mean “the geodesic is unsolvable”?'],
      },
      provenance: { note: METHOD_NOTE },
    },

    /* —— 误区模式 —— */
    'liang:pattern-curvature-needs-embedding': {
      title: 'Believing that curvature can only be seen through an external embedding',
      summary: 'Whether a space is bent depends on how it is placed in a higher-dimensional space.',
      formal: {
        wrongRule: 'whether a space is bent depends on how it is placed in a higher-dimensional space',
        task: 'decide whether a given statement about bending is intrinsic or depends on an embedding',
        counterexample: 'the cylinder is visibly “bent” in R³, yet its intrinsic Riemann tensor is zero; cutting it open and flattening it changes no intrinsic distance',
        scope: 'What is refuted is “curvature must be defined through an external embedding”, not the usefulness of extrinsic curvature itself.',
        boundary: ['What is refuted is “curvature must be defined through an external embedding”, not the usefulness of extrinsic curvature itself.'],
      },
      teaching: {
        reviewQuestions: ['Where does the textbook correct the understanding “whether a space is bent depends on how it is placed in a higher-dimensional space”, and what is the contrasting example?'],
      },
      provenance: { note: PATTERN_NOTE },
    },

    'liang:pattern-christoffel-is-tensor': {
      title: 'Treating the Christoffel symbols as a tensor',
      summary: 'Γ^μ{}_{νσ} is a set of tensor components, so its vanishing at a point is a coordinate-independent conclusion.',
      formal: {
        wrongRule: 'Γ^μ{}_{νσ} is a set of tensor components, so its vanishing at a point is a coordinate-independent conclusion',
        task: 'decide whether an equation written with Γ has coordinate-independent meaning',
        counterexample: 'in Cartesian coordinates on flat space Γ ≡ 0, while in polar coordinates Γ is non-zero — and spacetime is still flat',
        scope: 'What is refuted is “Γ is a tensor”, not the fact that Γ is an indispensable computational tool in a given coordinate chart.',
        boundary: ['What is refuted is “Γ is a tensor”, not the fact that Γ is an indispensable computational tool in a given coordinate chart.'],
      },
      teaching: {
        reviewQuestions: ['Where does the textbook correct the understanding “Γ^μ{}_{νσ} is a set of tensor components, so its vanishing at a point is a coordinate-independent conclusion”, and what is the contrasting example?'],
      },
      provenance: { note: PATTERN_NOTE },
    },

    'liang:pattern-redshift-is-doppler': {
      title: 'Taking cosmological redshift to be simply a Doppler effect',
      summary: 'Redshift just means that the source is moving away from us, so one may use the special-relativistic Doppler formula.',
      formal: {
        wrongRule: 'redshift just means that the source is moving away from us, so one may use the special-relativistic Doppler formula',
        task: 'decide whether a given explanation of redshift requires an expanding spacetime background',
        counterexample: 'the redshift of a distant galaxy grows with the scale factor, while source and observer can each be approximately at rest in their own comoving coordinates — nobody is “moving”',
        scope: 'What is refuted is “cosmological redshift = kinematic Doppler”, not the fact that the two share the same leading formula in the low-redshift limit.',
        boundary: ['What is refuted is “cosmological redshift = kinematic Doppler”, not the fact that the two share the same leading formula in the low-redshift limit.'],
      },
      teaching: {
        reviewQuestions: ['Where does the textbook correct the understanding “redshift just means that the source is moving away from us, so one may use the special-relativistic Doppler formula”, and what is the contrasting example?'],
      },
      provenance: { note: PATTERN_NOTE },
    },
  },
};
