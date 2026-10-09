/**
 * 英文覆盖：案例「微分几何」（`dg`）的**节点元数据**（正文块见 `en/cases-dg.mjs`）。
 *
 * 形状与 `en/limit.mjs` 一致：键是中文源的 id，只写含中文的字段；
 * `discipline`、`roles`、`construct`、`mode`、`provenance.sources[]`、`witness.ref`
 * 一律不出现（它们是受控值与真实路径，不是译文）。
 *
 * 本案例的两条特殊口径：
 * - 源语料是笔记快照（`G:/DifferentialGeometry/object`），证据一律是正文级论证而非机器证书；
 *   `provenance.note` 因此逐字说明「只做格式归一化与链接重写，未改动数学内容」。
 * - `dg.mjs`/`liang.mjs` 只登记 `nodes`：actions / evidence / relations 由
 *   `en/actions.mjs`、`en/evidence.mjs`、`en/relations.mjs` 统一覆盖（避免重复登记）。
 */

/** 定义类节点共用的形成检查结论（与 limit 案例同一句）。 */
const FORMATION = 'Parameters and predicate are closed under their declared types.';

/** 语料快照的说明。 */
const SOURCE_NOTE = 'The body text is a read-only snapshot of G:/DifferentialGeometry/object, see data/dg/; '
  + 'this pass only normalised the formatting and rewrote links, without changing any mathematical content.';

/** 断言节点：正文由源文件提炼，语料没有独立定理文件。 */
const CLAIM_NOTE = `${SOURCE_NOTE} This entry is a claim node distilled from the source body text; `
  + 'the corpus has no separate theorem file for it.';

/** 方法节点：由源文件正文的推导步骤提炼。 */
const METHOD_NOTE = `${SOURCE_NOTE} This method is distilled from the derivation steps in the body text of that '
  + 'source file; the corpus does not list a separate method entry of the same name.`;

export default {
  nodes: {
    /* —— 拓扑与度量 —— */
    'dg:topological-space': {
      title: 'Topological space',
      summary: 'A set together with a family of open sets: T ⊆ P(X) with ∅, X ∈ T; T is closed under finite intersections and under arbitrary unions.',
      formal: {
        objectType: 'a set together with a family of open sets',
        predicate: 'T ⊆ P(X) with ∅, X ∈ T; T is closed under finite intersections and under arbitrary unions',
        formationWitness: FORMATION,
        boundary: ['Dropping Hausdorff allows spaces in which limits are not unique; the axioms of a topological space do not by themselves guarantee separation.'],
      },
      teaching: {
        reviewQuestions: ['Which condition in the definition of a topological space can be dropped without losing the main conclusion?'],
      },
      provenance: { note: SOURCE_NOTE },
    },

    'dg:homeomorphism': {
      title: 'Homeomorphism',
      summary: 'A map between topological spaces: f: X → Y is a bijection, and both f and f⁻¹ are continuous.',
      formal: {
        objectType: 'a map between topological spaces',
        predicate: 'f: X → Y is a bijection and both f and f⁻¹ are continuous',
        formationWitness: FORMATION,
        boundary: ['Homeomorphism is the equivalence of topological properties, not of metric ones; it preserves neither lengths nor angles.'],
      },
      formalStatement: {
        reading: 'f is a homeomorphism exactly when f is a bijection, is continuous, and has a continuous inverse.',
        notation: [
          { means: 'injective and surjective, so that f⁻¹ exists as a map' },
          { symbol: 'f⁻¹ continuous', means: 'this does not follow from “f is continuous and bijective”; an equivalent formulation is that f maps open sets to open sets' },
        ],
        note: 'A homeomorphism is the notion of “sameness” between topological spaces: it preserves every property defined purely in terms of open sets, but neither distances nor angles.',
      },
      teaching: {
        reviewQuestions: ['Which condition in the definition of a homeomorphism can be dropped without losing the main conclusion?'],
      },
      provenance: { note: SOURCE_NOTE },
    },

    'dg:metric-space': {
      title: 'Metric space',
      summary: 'A set together with a distance function: d: X×X → R satisfies positive definiteness, symmetry and the triangle inequality, and d(x,y)=0 ⇔ x=y.',
      formal: {
        objectType: 'a set together with a distance function',
        predicate: 'd: X×X → R satisfies positive definiteness, symmetry and the triangle inequality, and d(x,y)=0 ⇔ x=y',
        formationWitness: FORMATION,
        boundary: ['A metric induces a topology, but different metrics may induce the same topology; the numerical values of a metric are not topological invariants.'],
      },
      teaching: {
        reviewQuestions: ['Which condition in the definition of a metric space can be dropped without losing the main conclusion?'],
      },
      provenance: { note: SOURCE_NOTE },
    },

    'dg:metric-completeness': {
      title: 'Metric completeness',
      summary: 'A property of a metric space: every Cauchy sequence in X converges to a point of X.',
      formal: {
        objectType: 'a property of a metric space',
        predicate: 'every Cauchy sequence in X converges to a point of X',
        formationWitness: FORMATION,
        boundary: ['Completeness is a metric property — a different metric can change it; isometries preserve it, homeomorphisms do not.'],
      },
      teaching: {
        reviewQuestions: ['Which condition in the definition of metric completeness can be dropped without losing the main conclusion?'],
      },
      provenance: { note: SOURCE_NOTE },
    },

    'dg:compactness': {
      title: 'Compactness',
      summary: 'A topological space, or a subset of one: every open cover of A has a finite subcover.',
      formal: {
        objectType: 'a topological space or a subset of one',
        predicate: 'every open cover of A has a finite subcover',
        formationWitness: FORMATION,
        boundary: ['Compactness is a topological property and is invariant under homeomorphism; it does not imply Euclidean properties beyond boundedness in a metric.'],
      },
      teaching: {
        reviewQuestions: ['Which condition in the definition of compactness can be dropped without losing the main conclusion?'],
      },
      provenance: { note: SOURCE_NOTE },
    },

    /* —— 流形与图册 —— */
    'dg:manifold': {
      title: 'Manifold',
      summary: 'A topological space: M is Hausdorff and every point has a neighbourhood homeomorphic to an open subset of R^n, with dim M = n.',
      formal: {
        objectType: 'a topological space',
        predicate: 'M is Hausdorff and every point has a neighbourhood homeomorphic to an open subset of R^n, with dim M = n',
        formationWitness: FORMATION,
        boundary: ['“Manifold” here means topological manifold; it carries no smooth structure of its own. Dropping Hausdorff destroys uniqueness of limits.'],
      },
      formalStatement: {
        reading: 'M is a Hausdorff space and every point has a neighbourhood homeomorphic to an open subset of R^n; n is called the dimension of M.',
        notation: [
          { means: 'the dimension; by Brouwer invariance, n is unique on a connected non-empty manifold' },
          { symbol: 'locally Euclidean', means: '“near every point it looks like R^n” — but globally it need not be R^n (the sphere and the torus are both manifolds)' },
        ],
        note: 'This site registers this entry as “Hausdorff + locally Euclidean”, **without second countability**; the version in `dg:smooth-manifold` adds second countability and a smooth atlas. The two are not a terse and an expanded form of one definition but two distinct registrations, and the difference is written here rather than quietly unified.',
      },
      teaching: {
        reviewQuestions: ['Which condition in the definition of a manifold can be dropped without losing the main conclusion?'],
      },
      provenance: { note: SOURCE_NOTE },
    },

    'dg:topological-manifold': {
      title: 'Topological manifold',
      summary: 'A locally Euclidean Hausdorff space: M is Hausdorff and every point p has an open neighbourhood U with a map φ: U → R^n such that φ(U) is open in R^n and φ is a homeomorphism.',
      formal: {
        objectType: 'a locally Euclidean Hausdorff space',
        predicate: 'M is Hausdorff and every point p has an open neighbourhood U with a map φ: U → R^n such that φ(U) is open in R^n and φ is a homeomorphism',
        formationWitness: FORMATION,
        boundary: ['Transition maps are not required to be smooth; hence tangent vectors and differentiation cannot yet be defined on a topological manifold.'],
      },
      formalStatement: {
        reading: 'M is a Hausdorff space and every point p has an open neighbourhood U and a homeomorphism φ onto an open subset of R^n.',
        notation: [
          { means: 'distinct points have disjoint neighbourhoods; this guarantees uniqueness of limits' },
          { means: 'a homeomorphism (a bijective correspondence continuous in both directions)' },
          { means: 'a coordinate chart; a family of charts covering M is an atlas' },
        ],
        note: 'Transition maps are not required to be smooth, so tangent vectors and differentiation cannot yet be defined on a topological manifold; a smooth structure is extra data.',
      },
      teaching: {
        reviewQuestions: ['Which condition in the definition of a topological manifold can be dropped without losing the main conclusion?'],
      },
      provenance: { note: SOURCE_NOTE },
    },

    'dg:coordinate-chart': {
      title: 'Coordinate chart',
      summary: 'An open set together with its coordinate map: in (U, φ), U ⊆ M is open and φ: U → φ(U) ⊆ R^n is a homeomorphism.',
      formal: {
        objectType: 'an open set together with its coordinate map',
        predicate: 'in (U, φ), U ⊆ M is open and φ: U → φ(U) ⊆ R^n is a homeomorphism',
        formationWitness: FORMATION,
        boundary: ['Coordinates are local: in general no single chart covers the whole manifold.'],
      },
      formalStatement: {
        reading: 'A coordinate chart is a pair consisting of an open set U and a map φ taking it homeomorphically onto an open subset of R^n.',
        notation: [
          { means: 'an open set in M (the domain of the chart)' },
          { means: 'the coordinate map; φ(p) is the coordinate of p in this chart' },
          { symbol: 'φ(U) open', means: 'the image is required to be open as well — this is the precise meaning of “locally Euclidean”' },
        ],
        note: 'Coordinates are local: in general no single chart covers the whole manifold (the sphere needs at least two).',
      },
      teaching: {
        reviewQuestions: ['Which condition in the definition of a coordinate chart can be dropped without losing the main conclusion?'],
      },
      provenance: { note: SOURCE_NOTE },
    },

    'dg:smooth-structure': {
      title: 'Smooth structure',
      summary: 'A maximal atlas on a topological manifold: σ is a maximal smooth atlas on M, equivalently an equivalence class of compatible smooth atlases.',
      formal: {
        objectType: 'a maximal atlas on a topological manifold',
        predicate: 'σ is a maximal smooth atlas on M, equivalently an equivalence class of compatible smooth atlases',
        formationWitness: FORMATION,
        boundary: ['One and the same topological manifold can carry mutually incompatible smooth structures; a smooth structure is extra data independent of the topology.'],
      },
      teaching: {
        reviewQuestions: ['Which condition in the definition of a smooth structure can be dropped without losing the main conclusion?'],
      },
      provenance: { note: SOURCE_NOTE },
    },

    'dg:smooth-atlas': {
      title: 'Smooth atlas',
      summary: 'A collection of coordinate charts: A = {(U_α, φ_α)} covers M, and the transition map of any two charts is C^∞ on the overlap.',
      formal: {
        objectType: 'a collection of coordinate charts',
        predicate: 'A = {(U_α, φ_α)} covers M, and the transition map of any two charts is C^∞ on the overlap',
        formationWitness: FORMATION,
        boundary: ['An atlas is required to cover; giving only some of the charts does not make an atlas.'],
      },
      formalStatement: {
        reading: 'A smooth atlas is a family of coordinate charts covering M such that the transition map of any two charts is C^∞ on the overlap.',
        notation: [
          { symbol: 'cover', means: 'the union equals M (not “contains”): every point lies in at least one chart' },
          { means: 'transition map: it moves one piece of R^n onto another piece of R^n' },
          { means: 'infinitely differentiable; requiring only C^k gives a C^k atlas' },
        ],
        note: 'Compatibility only has to be checked on the overlap U_α ∩ U_β; taking A to be “all charts compatible with it” yields a maximal atlas, that is, a smooth structure.',
      },
      teaching: {
        reviewQuestions: ['Which condition in the definition of a smooth atlas can be dropped without losing the main conclusion?'],
      },
      provenance: { note: SOURCE_NOTE },
    },

    'dg:smooth-manifold': {
      title: 'Smooth manifold',
      summary: 'A topological manifold with a smooth structure: M is a Hausdorff, second-countable topological space and there is an atlas making every transition map φ_β∘φ_α⁻¹ of class C^∞.',
      formal: {
        objectType: 'a topological manifold with a smooth structure',
        predicate: 'M is a Hausdorff, second-countable topological space and there is an atlas making every transition map φ_β∘φ_α⁻¹ of class C^∞',
        formationWitness: FORMATION,
        boundary: [
          'Hausdorff and second countability cannot be dropped: without second countability one loses partitions of unity.',
          'This node is semantically adjacent to manifold:smooth-atlas on this site and is connected to it by a relation rather than registered twice.',
        ],
      },
      formalStatement: {
        reading: 'M is a Hausdorff, second-countable space and there is an atlas covering M such that the transition map of any two charts is C^∞.',
        notation: [
          { means: 'there is a countable topological basis; this excludes pathological spaces such as the long line and guarantees that partitions of unity exist' },
          { symbol: 'atlas A', means: 'the smooth structure is given by this family of charts, not by the topology' },
        ],
        note: 'One and the same topological manifold can carry mutually incompatible smooth structures (Milnor’s exotic spheres are the extreme example); a “smooth manifold” therefore carries one more piece of data than a “topological manifold”.',
      },
      teaching: {
        reviewQuestions: ['Which condition in the definition of a smooth manifold can be dropped without losing the main conclusion?'],
      },
      provenance: { note: SOURCE_NOTE },
    },

    'dg:smooth-embedding': {
      title: 'Smooth embedding',
      summary: 'A map between smooth manifolds: f: M → N is an injective immersion and f is a homeomorphism onto its image (the image carrying the subspace topology).',
      formal: {
        objectType: 'a map between smooth manifolds',
        predicate: 'f: M → N is an injective immersion and f is a homeomorphism onto its image (the image carrying the subspace topology)',
        formationWitness: FORMATION,
        boundary: ['An injective immersion need not be an embedding; its image need not carry the submanifold topology.'],
      },
      teaching: {
        reviewQuestions: ['Which condition in the definition of a smooth embedding can be dropped without losing the main conclusion?'],
      },
      provenance: { note: SOURCE_NOTE },
    },

    'dg:partition-of-unity': {
      title: 'Partition of unity',
      summary: 'A family of smooth functions: the g_i are smooth, have compact and locally finite support, satisfy Σ g_i ≡ 1, and each supp g_i is contained in some U_α.',
      formal: {
        objectType: 'a family of smooth functions',
        predicate: 'the g_i are smooth, have compact and locally finite support, satisfy Σ g_i ≡ 1, and each supp g_i is contained in some U_α',
        formationWitness: FORMATION,
        boundary: ['Existence depends on second countability and Hausdorff; without second countability a partition of unity need not exist.'],
      },
      teaching: {
        reviewQuestions: ['Which condition in the definition of a partition of unity can be dropped without losing the main conclusion?'],
      },
      provenance: { note: SOURCE_NOTE },
    },

    /* —— 切空间与向量场 —— */
    'dg:tangent-vector-curve': {
      title: 'The curve definition of a tangent vector',
      summary: 'A tangent vector to a smooth manifold at a point: smooth curves through p are classified up to equivalence by (φ∘γ)′(0) in local coordinates, and an equivalence class is a tangent vector at p.',
      formal: {
        objectType: 'a tangent vector to a smooth manifold at a point',
        predicate: 'smooth curves through p are classified up to equivalence by (φ∘γ)′(0) in local coordinates, and an equivalence class is a tangent vector at p',
        formationWitness: FORMATION,
        boundary: ['The equivalence is expressed with the help of a coordinate chart, but the equivalence relation itself does not depend on the chart; a smooth structure is needed first.'],
      },
      teaching: {
        reviewQuestions: ['Which condition in the definition of a tangent vector via curves can be dropped without losing the main conclusion?'],
      },
      provenance: { note: SOURCE_NOTE },
    },

    'dg:tangent-vector-derivation': {
      title: 'The derivation definition of a tangent vector',
      summary: 'A linear functional on germs of smooth functions: X_p: C^∞(M) → R is linear and satisfies the Leibniz rule X_p(fg) = f(p)X_p(g) + g(p)X_p(f).',
      formal: {
        objectType: 'a linear functional on germs of smooth functions',
        predicate: 'X_p: C^∞(M) → R is linear and satisfies the Leibniz rule X_p(fg) = f(p)X_p(g) + g(p)X_p(f)',
        formationWitness: FORMATION,
        boundary: ['The Leibniz rule is indispensable; requiring linearity alone yields a set of functionals far larger than the tangent space.'],
      },
      teaching: {
        reviewQuestions: ['Which condition in the definition of a tangent vector via derivations can be dropped without losing the main conclusion?'],
      },
      provenance: { note: SOURCE_NOTE },
    },

    'dg:tangent-vector-equivalence': {
      title: 'Equivalence of the two definitions of a tangent vector',
      summary: 'A correspondence between the two definitions of a tangent vector: there is a natural bijection between curve equivalence classes and derivations that preserves the linear structure and the Leibniz rule.',
      formal: {
        objectType: 'a correspondence between the two definitions of a tangent vector',
        predicate: 'there is a natural bijection between curve equivalence classes and derivations that preserves the linear structure and the Leibniz rule',
        formationWitness: FORMATION,
        boundary: ['The equivalence holds for C^∞ structures; for finite C^k structures the correspondence between the two definitions needs extra notational conventions.'],
      },
      teaching: {
        reviewQuestions: ['Which condition in the definition of the equivalence of the two definitions of a tangent vector can be dropped without losing the main conclusion?'],
      },
      provenance: { note: SOURCE_NOTE },
    },

    'dg:tangent-coordinate-basis': {
      title: 'The coordinate basis of the tangent space',
      summary: 'A basis of the tangent space: ∂/∂u^i|_p is defined by (∂/∂u^i)(f) = ∂(f∘φ⁻¹)/∂x^i|_{φ(p)}, and the ∂/∂u^i|_p form an n-element basis of T_pM.',
      formal: {
        objectType: 'a basis of the tangent space',
        predicate: '∂/∂u^i|_p is defined by (∂/∂u^i)(f) = ∂(f∘φ⁻¹)/∂x^i|_{φ(p)}, and the ∂/∂u^i|_p form an n-element basis of T_pM',
        formationWitness: FORMATION,
        boundary: ['This basis depends on the choice of coordinate chart and transforms by the Jacobian matrix under a change of coordinates.'],
      },
      teaching: {
        reviewQuestions: ['Which condition in the definition of the coordinate basis of the tangent space can be dropped without losing the main conclusion?'],
      },
      provenance: { note: SOURCE_NOTE },
    },

    'dg:tangent-bundle': {
      title: 'Tangent bundle',
      summary: 'A vector bundle: TM = ⊔_{p∈M} T_pM with π: TM → M given by π(T_pM) = p, and TM carries a 2n-dimensional smooth manifold structure making π a smooth submersion.',
      formal: {
        objectType: 'a vector bundle',
        predicate: 'TM = ⊔_{p∈M} T_pM with π: TM → M given by π(T_pM) = p, and TM carries a 2n-dimensional smooth manifold structure making π a smooth submersion',
        formationWitness: FORMATION,
        boundary: ['The smooth structure on the tangent bundle is induced by an atlas of M; changing the atlas changes the smooth structure on TM.'],
      },
      teaching: {
        reviewQuestions: ['Which condition in the definition of the tangent bundle can be dropped without losing the main conclusion?'],
      },
      provenance: { note: SOURCE_NOTE },
    },

    'dg:smooth-vector-field': {
      title: 'Smooth vector field',
      summary: 'A smooth section of the tangent bundle: X: M → TM is a smooth map with π∘X = id_M.',
      formal: {
        objectType: 'a smooth section of the tangent bundle',
        predicate: 'X: M → TM is a smooth map with π∘X = id_M',
        formationWitness: FORMATION,
        boundary: ['“Smooth” is relative to the smooth structure on TM; without that structure one can only speak of a set-theoretic section.'],
      },
      teaching: {
        reviewQuestions: ['Which condition in the definition of a smooth vector field can be dropped without losing the main conclusion?'],
      },
      provenance: { note: SOURCE_NOTE },
    },

    'dg:smooth-distribution': {
      title: 'Smooth tangent distribution',
      summary: 'A subbundle of the tangent bundle: D assigns to each point p a k-dimensional linear subspace of T_pM, and near each point it is locally spanned by k smooth vector fields.',
      formal: {
        objectType: 'a subbundle of the tangent bundle',
        predicate: 'D assigns to each point p a k-dimensional linear subspace of T_pM, and near each point it is locally spanned by k smooth vector fields',
        formationWitness: FORMATION,
        boundary: ['Smoothness of a distribution is a local condition; involutivity is not part of the definition of a distribution but an extra hypothesis of the integrability theorem.'],
      },
      teaching: {
        reviewQuestions: ['Which condition in the definition of a smooth tangent distribution can be dropped without losing the main conclusion?'],
      },
      provenance: { note: SOURCE_NOTE },
    },

    /* —— 张量与微分形式 —— */
    'dg:tensor': {
      title: 'Tensor',
      summary: 'A multilinear function: T is linear in each of its r covector arguments and s vector arguments, that is, T ∈ T^r_s(V).',
      formal: {
        objectType: 'a multilinear function',
        predicate: 'T is linear in each of its r covector arguments and s vector arguments, that is, T ∈ T^r_s(V)',
        formationWitness: FORMATION,
        boundary: ['Multilinearity is the core of the definition; being linear in only some of the variables does not make a tensor. The object of the same name over the zero vector space has to be connected to tensor:tensor-rs on this site rather than registered a second time.'],
      },
      teaching: {
        reviewQuestions: ['Which condition in the definition of a tensor can be dropped without losing the main conclusion?'],
      },
      provenance: { note: SOURCE_NOTE },
    },

    'dg:tensor-product-dg': {
      title: 'Tensor product (differential geometry)',
      summary: 'The object induced by bilinear maps: V⊗W is characterised by the universal property of bilinear maps — every bilinear map factors uniquely through ⊗.',
      formal: {
        objectType: 'the object induced by bilinear maps',
        predicate: 'V⊗W is characterised by the universal property of bilinear maps: every bilinear map factors uniquely through ⊗',
        formationWitness: FORMATION,
        boundary: ['The universal property is part of the definition; multiplying components one by one does not by itself constitute the definition of the tensor product.'],
      },
      teaching: {
        reviewQuestions: ['Which condition in the definition of the tensor product (differential geometry) can be dropped without losing the main conclusion?'],
      },
      provenance: { note: SOURCE_NOTE },
    },

    'dg:differential-form': {
      title: 'Differential form',
      summary: 'A smooth section of an exterior algebra bundle: a differential p-form is a smooth section of ⋀^p T*M, and the space of all of them is denoted Ω^p(M).',
      formal: {
        objectType: 'a smooth section of an exterior algebra bundle',
        predicate: 'a differential p-form is a smooth section of ⋀^p T*M, and the space of all of them is denoted Ω^p(M)',
        formationWitness: FORMATION,
        boundary: ['A p-form is required to be totally antisymmetric; a multilinear object that is not antisymmetric is not a form.'],
      },
      formalStatement: {
        reading: 'A differential p-form is a smooth section of the exterior algebra bundle ⋀^p T*M: at every point p it gives an antisymmetric p-fold cotangent vector.',
        notation: [
          { means: 'the cotangent bundle; T*_p M is the dual of the tangent space' },
          { means: 'the p-th exterior power: the tensor after antisymmetrisation, which changes sign when two slots are exchanged' },
          { means: 'the space of smooth sections' },
        ],
        note: 'For p = 1 this is a 1-form (a cotangent vector field); for p = 0 it is a smooth function. Antisymmetry comes from ⋀ and needs no extra hypothesis.',
      },
      teaching: {
        reviewQuestions: ['Which condition in the definition of a differential form can be dropped without losing the main conclusion?'],
      },
      provenance: { note: SOURCE_NOTE },
    },

    'dg:form-wedge-product': {
      title: 'The exterior product of differential forms',
      summary: 'An operation between exterior forms: f∧g is the antisymmetrised multilinear form, satisfying f∧g = (−1)^{rs} g∧f.',
      formal: {
        objectType: 'an operation between exterior forms',
        predicate: 'f∧g is the antisymmetrised multilinear form, satisfying f∧g = (−1)^{rs} g∧f',
        formationWitness: FORMATION,
        boundary: ['The exterior product carries a graded-commutative sign; treating it as ordinary commutative multiplication produces wrong signs.'],
      },
      teaching: {
        reviewQuestions: ['Which condition in the definition of the exterior product of differential forms can be dropped without losing the main conclusion?'],
      },
      provenance: { note: SOURCE_NOTE },
    },

    'dg:d-squared-zero': {
      title: 'The exterior derivative squares to zero',
      summary: 'An identity of the exterior derivative: d(dω) = 0 for every differential form ω.',
      formal: {
        objectType: 'an identity of the exterior derivative',
        predicate: 'd(dω) = 0 for every differential form ω',
        formationWitness: FORMATION,
        boundary: ['The identity holds for smooth forms; at singularities or in non-smooth situations extra hypotheses are needed.'],
      },
      teaching: {
        reviewQuestions: ['Which condition in the definition of the exterior derivative squaring to zero can be dropped without losing the main conclusion?'],
      },
      provenance: { note: SOURCE_NOTE },
    },

    'dg:form-pullback': {
      title: 'Pullback of a differential form',
      summary: 'The map of forms induced by a smooth map: f*ω is defined by (f*ω)_p(v_1,…,v_r) = ω_{f(p)}(f_{*p}v_1,…,f_{*p}v_r).',
      formal: {
        objectType: 'the map of forms induced by a smooth map',
        predicate: 'f*ω is defined by (f*ω)_p(v_1,…,v_r) = ω_{f(p)}(f_{*p}v_1,…,f_{*p}v_r)',
        formationWitness: FORMATION,
        boundary: ['The pullback goes in the direction opposite to the map; it preserves the exterior product and d, but not integration (integration needs an orientation).'],
      },
      teaching: {
        reviewQuestions: ['Which condition in the definition of the pullback of a differential form can be dropped without losing the main conclusion?'],
      },
      provenance: { note: SOURCE_NOTE },
    },

    /* —— 定理 —— */
    'dg:implicit-function-theorem': {
      title: 'Implicit function theorem',
      summary: 'A theorem on the local solvability of equations: F(x₀,y₀)=0 and ∂F/∂y invertible at (x₀,y₀), then there is g with F(x,g(x))=0.',
      formal: {
        formula: 'F(x₀,y₀)=0 and ∂F/∂y invertible at (x₀,y₀), then there is g with F(x,g(x))=0',
        boundary: ['The partial derivative is required to be invertible; when invertibility fails the conclusion may fail as well.'],
      },
      teaching: {
        reviewQuestions: ['Which condition in the implicit function theorem can be dropped without losing the main conclusion?'],
      },
      provenance: { note: SOURCE_NOTE },
    },

    'dg:inverse-function-theorem': {
      title: 'Inverse function theorem',
      summary: 'A theorem on local invertibility: F is C^k (k≥1) and dF_p is a linear isomorphism, then F is a C^k diffeomorphism on a neighbourhood of p.',
      formal: {
        formula: 'F is C^k (k≥1) and dF_p is a linear isomorphism, then F is a C^k diffeomorphism on a neighbourhood of p',
        boundary: ['The conclusion is local; even if dF is invertible everywhere this only gives a local homeomorphism, and global injectivity needs a separate argument.'],
      },
      teaching: {
        reviewQuestions: ['Which condition in the inverse function theorem can be dropped without losing the main conclusion?'],
      },
      provenance: { note: SOURCE_NOTE },
    },

    'dg:generalized-stokes-theorem': {
      title: 'Generalized Stokes theorem',
      summary: 'An integral identity on manifolds with boundary: ∫_M dω = ∫_{∂M} ω, where M is an oriented smooth manifold with boundary and ω a compactly supported (n−1)-form.',
      formal: {
        formula: '∫_M dω = ∫_{∂M} ω, where M is an oriented smooth manifold with boundary and ω a compactly supported (n−1)-form',
        boundary: ['An orientation and compact support are needed; without an orientation the signed boundary integral is not defined.'],
      },
      teaching: {
        reviewQuestions: ['Which condition in the generalized Stokes theorem can be dropped without losing the main conclusion?'],
      },
      provenance: { note: SOURCE_NOTE },
    },

    'dg:poincare-lemma': {
      title: 'Poincaré lemma',
      summary: 'The relation between closed and exact forms: on a contractible open set U, if dω = 0 then there is η with ω = dη.',
      formal: {
        formula: 'on a contractible open set U, if dω = 0 then there is η with ω = dη',
        boundary: ['It holds only on contractible regions; a general closed form need not be exact, and the obstruction is measured by de Rham cohomology.'],
      },
      teaching: {
        reviewQuestions: ['Which condition in the Poincaré lemma can be dropped without losing the main conclusion?'],
      },
      provenance: { note: SOURCE_NOTE },
    },

    /* —— 断言节点（由正文提炼） —— */
    'dg:claim-tangent-equivalence': {
      title: 'The two definitions of a tangent vector give the same tangent space',
      summary: 'There is a natural bijection between curve equivalence classes and derivations that preserves the linear structure and the Leibniz rule.',
      formal: {
        assumptions: ['M is a smooth manifold and p ∈ M'],
        formula: 'there is a natural bijection T_p^{curve}M ≅ T_p^{derivation}M',
        boundary: ['The equivalence holds for C^∞ structures; for finite C^k structures extra notational conventions are needed.'],
      },
      teaching: {
        reviewQuestions: ['Where in the proof of the equivalence is the Leibniz rule used?'],
      },
      provenance: { note: CLAIM_NOTE },
    },

    'dg:claim-d-squared-zero': {
      title: 'The exterior derivative squares to zero',
      summary: 'd(dω) = 0 for every differential form ω.',
      formal: {
        assumptions: ['ω is a smooth differential form'],
        boundary: ['It holds for smooth forms; the non-smooth case needs extra hypotheses.'],
      },
      teaching: {
        reviewQuestions: ['What identity does d²=0 reduce to in coordinates?'],
      },
      provenance: { note: CLAIM_NOTE },
    },

    /* —— 误区模式 —— */
    'dg:pattern-manifold-is-surface': {
      title: 'Identifying a smooth manifold with a surface embedded in R^N',
      formal: {
        wrongRule: 'a smooth manifold is a surface embedded in R^N',
        task: 'decide whether an object given by an abstract definition depends on an external embedding',
        counterexample: 'the Whitney embedding theorem guarantees embeddability, but the tangent space defined by derivations needs no external R^N whatsoever',
        scope: 'What is refuted is “the definition depends on an embedding”, not the value of embeddings as a tool for intuition.',
      },
      teaching: {
        reviewQuestions: ['Where is the counterexample to the rule “a smooth manifold is a surface embedded in R^N”, exactly what does it refute, and what does it not refute?'],
      },
      provenance: { note: SOURCE_NOTE },
    },

    'dg:pattern-global-coordinates': {
      title: 'Assuming every point of a manifold can be labelled by one coordinate system',
      formal: {
        wrongRule: 'there is a single coordinate system on the manifold covering the whole of it',
        task: 'decide whether a given space can be covered by one chart',
        counterexample: 'the sphere needs at least two stereographic charts; there is no single coordinate chart covering S²',
        scope: 'What is refuted is “a single global coordinate system”, not the existence of local coordinates.',
      },
      teaching: {
        reviewQuestions: ['Where is the counterexample to the rule “there is a single coordinate system on the manifold covering the whole of it”, exactly what does it refute, and what does it not refute?'],
      },
      provenance: { note: SOURCE_NOTE },
    },

    'dg:pattern-derivation-ignores-leibniz': {
      title: 'Omitting the Leibniz rule when defining derivations',
      formal: {
        wrongRule: 'a tangent vector is any linear functional on C^∞(M)',
        task: 'test whether a functional belongs to the tangent space',
        counterexample: 'requiring linearity alone yields a set of functionals far larger than T_pM, whose dimension is no longer n',
        scope: 'What is refuted is “linearity suffices”; the Leibniz rule is the key condition that singles out the tangent space.',
      },
      teaching: {
        reviewQuestions: ['Where is the counterexample to the rule “a tangent vector is any linear functional on C^∞(M)”, exactly what does it refute, and what does it not refute?'],
      },
      provenance: { note: SOURCE_NOTE },
    },

    'dg:pattern-closed-implies-exact': {
      title: 'Treating every closed form as exact',
      formal: {
        wrongRule: 'dω = 0 implies that there is η with ω = dη',
        task: 'decide whether a closed form is exact on a given region',
        counterexample: 'the angular form on the punctured plane is closed but not exact; the obstruction is given by de Rham cohomology',
        scope: 'The Poincaré lemma holds only on contractible regions; the range of the conclusion is determined by the topology of the region.',
      },
      teaching: {
        reviewQuestions: ['Where is the counterexample to the rule “dω = 0 implies that there is η with ω = dη”, exactly what does it refute, and what does it not refute?'],
      },
      provenance: { note: SOURCE_NOTE },
    },

    /* —— 局部方法 —— */
    'dg:method-inverse-check': {
      title: 'Checking a candidate map with the inverse function theorem',
      summary: 'For a given smooth map, first compute the Jacobian at a point and check that it is invertible, then invert locally by the inverse function theorem.',
      formal: {
        name: 'Checking a candidate map with the inverse function theorem',
        scope: 'local method',
        In: 'a smooth map F: M → N and a point p',
        Out: 'a conclusion about the existence of a local inverse, or the failure point',
        Pre: 'some coordinate representation of F at p has computable partial derivatives',
        Post: 'a local inverse on a neighbourhood of p, or the failure point that the Jacobian is singular',
        Fail: 'When the Jacobian is singular at p the theorem does not apply, and this method cannot then assert that an inverse exists; it also does not give a global inverse.',
        fail: 'When the Jacobian is singular at p the theorem does not apply, and this method cannot then assert that an inverse exists; it also does not give a global inverse.',
        body: 'Take a coordinate chart at p and write the coordinate representation of F and its Jacobian matrix; decide whether its determinant is non-zero; if it is, the theorem yields a local inverse, and one should state that the inverse exists only on some neighbourhood of p.',
        boundary: ['It decides local invertibility only; global injectivity is outside the scope of this method.'],
      },
      motivation: {
        internal: ['The inverse function theorem is local, so “compute the Jacobian first, then discuss invertibility” is the most natural order of testing.'],
        external: ['Deciding the feasibility of numerical solving and of coordinate changes.'],
        aesthetic: ['It linearises a nonlinear problem at a point.'],
        growthChain: ['confusion about solving implicit equations → linearisation → the Jacobian invertibility criterion → a local inverse'],
      },
      teaching: {
        selfCheck: [
          { prompt: 'Write the Jacobian of F at p and decide whether it is invertible.', competence: 'computation', criterion: 'When it is invertible, state the existence of a local inverse; when it is singular, report the failure point.' },
        ],
        reviewQuestions: ['Why does a non-zero Jacobian guarantee only local invertibility?'],
      },
      provenance: { note: METHOD_NOTE },
    },

    'dg:method-closed-form-test': {
      title: 'Testing at the origin whether a closed form is exact',
      summary: 'Given a closed form, first decide whether the region is contractible; if it is, use the Poincaré lemma to construct a primitive, and if it is not, look for an obstruction.',
      formal: {
        name: 'Testing at the origin whether a closed form is exact',
        scope: 'local method',
        In: 'a differential form ω and the region U on which it lives',
        Out: 'a primitive η, or an obstruction at the level of the region',
        Pre: 'dω = 0 is known',
        Post: 'on a contractible region, ω = dη; otherwise, the obstruction comes from the topology of the region and not from the form itself',
        Fail: 'When the region is not contractible the method cannot conclude that ω is not exact, only that the Poincaré lemma does not apply; the obstruction has to be computed separately.',
        fail: 'When the region is not contractible the method cannot conclude that ω is not exact, only that the Poincaré lemma does not apply; the obstruction has to be computed separately.',
        body: 'First compute dω to confirm that the form is closed; then check whether U is contractible. If it is, construct η by the lemma; if it is not, move to a region such as the punctured plane and look for a counterexample.',
        boundary: ['“Closed + contractible ⇒ exact” is a sufficient condition, not a necessary and sufficient one.'],
      },
      motivation: {
        internal: ['The difference between closed and exact lies entirely in the topology of the region, so the first step of the method must be to decide the region.'],
        external: ['Deciding whether a potential function for a vector field exists.'],
        aesthetic: ['It reduces an analytic problem to a topological property of the region.'],
        growthChain: ['dω=0 yet no primitive can be found → inspect the region → contractibility and obstructions'],
      },
      teaching: {
        selfCheck: [
          { prompt: 'Decide whether the given U is contractible and explain why this step is necessary.', competence: 'judgement', criterion: 'If it is contractible, use the lemma; if it is not, give the obstruction and do not assert that the form is not exact.' },
        ],
        reviewQuestions: ['Why is the angular form on the punctured plane the key contrasting example?'],
      },
      provenance: { note: METHOD_NOTE },
    },
  },
};
