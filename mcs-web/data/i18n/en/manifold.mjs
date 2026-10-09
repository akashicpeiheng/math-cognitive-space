/**
 * 英文覆盖：案例 02「C^k 与光滑流形」（`manifold`）的**节点元数据与表征**。
 *
 * 形状与 `en/limit.mjs` 相同：键是中文源的 id，只写含中文的字段。
 * 不写的两类字段：
 * - `provenance.sources`：修订源的真实文件名与章节名，翻了就是谎报来源；
 * - 已经是英文或纯记号的值（`formal.assumptions[0] = "Hausdorff"`、
 *   `teaching.conditions[0].condition = "k≥1"`）——数组仍按下标对齐写出，
 *   只是那些位置不重复声明。
 *
 * 术语按 `data/i18n/glossary.mjs`：图 chart、图册 atlas、过渡映射 transition map、
 * 相容/兼容 compatible、正则性 regularity、C^k 结构 C^k structure、
 * 单位分解 partition of unity、嵌入 embedding。
 */

export default {
  nodes: {
    'manifold:top-manifold': {
      title: 'Topological manifold',
      summary: 'A Hausdorff, second-countable, locally Euclidean topological space.',
      formal: {
        objectType: 'topological space',
        assumptions: ['Hausdorff', 'second-countable'],
        formationWitness: 'Parameters and predicate are closed under their declared types.',
        boundary: ['The full definitions of the topology and of local Euclideanity live in the shared background.'],
      },
      representations: [
        { title: 'Locally Euclidean topological space', medium: 'formula and natural language', note: 'Every point has a neighbourhood homeomorphic to an open subset of R^n.' },
      ],
      motivation: {
        internal: ['Calculus needs local coordinates while the whole is still allowed to be curved.'],
        external: ['Spacetimes in general relativity, and configuration spaces of robots.'],
        aesthetic: ['It glues local linear structure into a global object.'],
        growthChain: ['parameterising a surface → atlas → topological manifold'],
      },
      teaching: {
        conditions: [
          { remove: 'remove the Hausdorff condition', counterexample: 'the line with two origins', effect: 'Uniqueness in limit and continuity arguments loses its background.' },
          { condition: 'second-countable', remove: 'remove the countable base', counterexample: 'the long line', effect: 'The usual forms of partitions of unity and of the embedding theorem fail.' },
        ],
        commonMisconceptions: ['Taking “locally looks like R^n” to mean that the whole is R^n.'],
        reviewQuestions: ['Why is second-countability required?'],
      },
      provenance: { note: 'Same-carrier implication and cross-carrier forgetting are registered separately.' },
    },

    'manifold:chart-atlas': {
      title: 'Charts, atlases and covers',
      summary: '(U,φ) is a local coordinate chart; the atlas covers X and the transition maps are defined.',
      formal: {
        objectType: 'a collection of local coordinate systems',
        formationWitness: 'Parameters and predicate are closed under their declared types.',
        boundary: ['The covering and homeomorphism conditions are checked chart by chart.'],
      },
      representations: [
        { title: 'Covering atlas', medium: 'formula and diagram', note: 'Every point lies in at least one chart.' },
      ],
      motivation: {
        internal: ['Local coordinates have to cover the whole space.'],
        external: ['A world atlas covers the surface of the Earth.'],
        aesthetic: ['Local information is glued.'],
        growthChain: ['a single chart → the covering condition → atlas'],
      },
      teaching: {
        conditions: [
          { condition: 'it covers X', remove: 'delete one chart', counterexample: 'a point left uncovered may still lie in another chart and has to be checked one by one; if a point has no chart at all then this is not an atlas', effect: 'Local-coordinate claims fail at the gap.' },
        ],
        commonMisconceptions: ['Looking only at the charts themselves and never checking the cover.'],
        reviewQuestions: ['What does “maximal” mean for an atlas?'],
      },
      provenance: { note: 'Same-carrier implication and cross-carrier forgetting are registered separately.' },
    },

    'manifold:transition': {
      title: 'Transition maps',
      summary: 'The map ψ∘φ⁻¹ on the overlap, with domain and image in R^n.',
      formal: {
        objectType: 'coordinate change',
        assumptions: ['the overlap φ(U∩V) is non-empty'],
        formationWitness: 'Parameters and predicate are closed under their declared types.',
        boundary: ['The restricted domain and the openness condition must be kept explicitly.'],
      },
      representations: [
        { title: 'Transition-map formula', medium: 'formula', note: 'Check in both directions on the overlap.' },
      ],
      motivation: {
        internal: ['When coordinates are changed, the representations of one object have to be compatible.'],
        external: ['Conversion between map projections.'],
        aesthetic: ['It reduces compatibility to regularity on R^n.'],
        growthChain: ['two charts → overlap → transition map'],
      },
      teaching: {
        conditions: [
          { condition: 'restrict to φ(U∩V)', remove: 'discuss it on all of R^n', counterexample: 'φ⁻¹ is not defined outside its image', effect: 'The composite map loses its domain.' },
          { condition: 'check both directions', remove: 'check only ψ∘φ⁻¹', counterexample: 'an inverse homeomorphism that is not C^k can be smooth in one direction only', effect: 'The C^k atlas condition is weakened.' },
        ],
        commonMisconceptions: ['Treating a homeomorphism as automatically C^k.'],
        reviewQuestions: ['Why must the C^k condition hold for every ordered pair of charts?'],
      },
      provenance: { note: 'Same-carrier implication and cross-carrier forgetting are registered separately.' },
    },

    'manifold:ck-atlas': {
      title: 'C^k atlas',
      summary: 'An atlas all of whose transition maps are C^k.',
      formal: {
        objectType: 'a property of atlases',
        formationWitness: 'Parameters and predicate are closed under their declared types.',
        boundary: ['Multivariable differentiation and closure under composition come from the shared background.'],
      },
      representations: [
        { title: 'Pairwise regularity', medium: 'formula', note: 'Every transition map is C^k.' },
      ],
      motivation: {
        internal: ['A differentiable structure is needed before tangent spaces and differentiation can be discussed.'],
        external: ['General relativity requires a smooth structure.'],
        aesthetic: ['It glues the local differential structure.'],
        growthChain: ['topological manifold → atlas → C^k transition condition'],
      },
      teaching: {
        conditions: [
          { remove: 'allow k=0', counterexample: 'a C^0 atlas has only continuous transitions', effect: 'Tangent spaces cannot be defined.' },
        ],
        commonMisconceptions: ['Using C^k and C^∞ interchangeably.'],
        reviewQuestions: ['Can the same topological manifold carry different C^k structures?'],
      },
      provenance: { note: 'Same-carrier implication and cross-carrier forgetting are registered separately.' },
    },

    'manifold:smooth-atlas': {
      title: 'Smooth atlas',
      summary: 'An atlas all of whose transition maps are C^∞.',
      formal: {
        objectType: 'a property of atlases',
        formationWitness: 'Parameters and predicate are closed under their declared types.',
        boundary: ['The smoothing theorem is not formalised on this site.'],
      },
      representations: [
        { title: 'C^∞ transitions', medium: 'formula', note: 'Derivatives of every order exist and are continuous.' },
      ],
      motivation: {
        internal: ['Smoothness makes the differential operations iterable to every order.'],
        external: ['Classical field theory and differential geometry.'],
        aesthetic: ['Regularity of unbounded order.'],
        growthChain: ['C^k → every k → C^∞'],
      },
      teaching: {
        conditions: [
          { condition: 'every order', remove: 'require only a finite k', counterexample: 'h(x)=x+x|x| gives a C¹ but not C² example', effect: 'The C^∞ conclusion fails.' },
        ],
        commonMisconceptions: ['Taking C¹ for C^∞.'],
        reviewQuestions: ['What does the C¹ but not C² example refute, and what does it not refute?'],
      },
      provenance: { note: 'Same-carrier implication and cross-carrier forgetting are registered separately.' },
    },

    'manifold:compatible-k': {
      title: 'C^k compatibility',
      summary: 'The union of two atlases is a C^k atlas.',
      formal: {
        objectType: 'a relation between atlases',
        formationWitness: 'Parameters and predicate are closed under their declared types.',
        boundary: ['Compatibility requires checking every cross-atlas transition.'],
      },
      representations: [
        { title: 'Transition condition for the union', medium: 'formula', note: 'Both cross-atlas and within-atlas transitions must be C^k.' },
      ],
      motivation: {
        internal: ['Atlases need a finer structure along which they can be compared.'],
        external: ['Merging different coordinate covers.'],
        aesthetic: ['The union of equivalence classes.'],
        growthChain: ['C^k atlas → union → compatibility relation'],
      },
      teaching: {
        conditions: [
          { condition: 'every cross-atlas transition', remove: 'check only the transitions inside each atlas', counterexample: 'take two mutually incompatible atlases', effect: 'The union loses the C^k property.' },
        ],
        commonMisconceptions: ['Taking compatibility to be equality of atlases.'],
        reviewQuestions: ['Do symmetry and transitivity hold for the compatibility relation?'],
      },
      provenance: { note: 'Same-carrier implication and cross-carrier forgetting are registered separately.' },
    },

    'manifold:max-k': {
      title: 'Maximal C^k compatible extension',
      summary: 'A_max is the C^k atlas consisting of all charts compatible with A.',
      formal: {
        steps: [{ note: 'Finite steps to be expanded.' }],
        verificationTarget: 'A_max is a C^k atlas and is maximal under inclusion.',
        boundary: ['Regularity is a local property; the chain rule comes from the shared background.'],
      },
      representations: [
        { title: 'Compatible-extension construction', medium: 'finite steps', note: 'The cover is guaranteed by A⊆A_max.' },
      ],
      motivation: {
        internal: ['It removes the slack in the choice of atlas and yields the structure itself.'],
        external: ['A model of one and the same differentiable structure.'],
        aesthetic: ['It selects a maximal representative of an equivalence class.'],
        growthChain: ['atlas → compatibility → maximal extension'],
      },
      teaching: {
        proofOverview: 'First prove that A_max covers: A⊆A_max. Then prove that the transition between two newly added charts is a local C^k composite; maximality finally follows from “every chart that could still be added has already been collected”.',
        conditions: [
          { condition: 'A is itself a C^k atlas', remove: 'drop the regularity of A', counterexample: 'A_max loses the grounds for both its cover and its regularity', effect: 'The proof of maximality cannot even start.' },
        ],
        commonMisconceptions: ['Taking the maximal extension to be another atlas unrelated to A.'],
        reviewQuestions: ['Why can the transition between two newly added charts be decomposed through charts of A?'],
      },
      provenance: { note: 'Same-carrier implication and cross-carrier forgetting are registered separately.' },
    },

    'manifold:example-h': {
      title: 'The C¹ but not C² atlas example',
      summary: 'h(x)=x+x|x| together with the identity chart forms a C¹ atlas, but not a C² atlas.',
      formal: {
        satisfaction: 'h is strictly increasing and is a homeomorphism; the transition map h has a second derivative that is discontinuous at 0.',
        boundary: ['This counterexample does not prove that R cannot be given another smooth atlas.'],
      },
      representations: [
        { title: 'Atlas counterexample for h', medium: 'computation', note: 'The derivative of h, 1+2|x|, is continuous and positive.' },
      ],
      motivation: {
        internal: ['It separates “this atlas is not C²” from “the underlying space has no smooth structure”.'],
        external: ['It guards against over-inferring the existence of a structure.'],
        aesthetic: ['The smallest one-variable counterexample.'],
        growthChain: ['definition of C^k → construct an atlas → compute the second derivative → exact scope of the refutation'],
      },
      teaching: {
        proofOverview: 'The derivative of h is continuous and positive, so h is a homeomorphism; the second derivative is 2 on one side of 0 and −2 on the other, so h is not C².',
        conditions: [
          { condition: 'only the given atlas is examined', remove: 'enlarge the counterexample into “the underlying space admits no smooth atlas”', counterexample: 'R itself has the identity smooth atlas', effect: 'The over-generalisation is refuted.' },
        ],
        commonMisconceptions: ['Taking a property of an atlas for a property of the underlying space.'],
        reviewQuestions: ['Exactly which proposition does this counterexample refute?'],
        selfCheck: [
          { prompt: 'Compute the derivative and the second derivative of h.', competence: 'computation', criterion: 'The derivative is 1+2|x|; the two second derivatives are 2 and −2.' },
        ],
      },
      provenance: { note: 'Same-carrier implication and cross-carrier forgetting are registered separately.' },
    },

    'manifold:claim-max': {
      title: 'The maximal extension is a C^k atlas and is maximal',
      summary: 'For every C^k atlas A, its maximal compatible extension A_max is a C^k atlas and is maximal under inclusion.',
      formal: {
        assumptions: ['A is a C^k atlas'],
        formula: 'CkAtlas(A,k) ⇒ CkAtlas(A_max,k) ∧ ∀ chart g compatible with A ⇒ g∈A_max',
        boundary: ['The locality of regularity comes from the shared background.'],
      },
      motivation: {
        internal: ['Different atlases of the same C^k structure should give the same maximal extension.'],
        external: ['A canonical representative of a differentiable structure.'],
        aesthetic: ['Maximality eliminates the choice.'],
        growthChain: ['compatibility → collection → local composition → maximality'],
      },
      teaching: {
        proofOverview: 'The cover comes from A⊆A_max; at every point the transition between newly added charts can be decomposed through charts of A into a C^k composite; maximality follows directly from the collection rule.',
        conditions: [
          { condition: 'A covers X', remove: 'drop the cover', counterexample: 'in an uncovered region there are no coordinates with which to decompose the transition', effect: 'The local-composition argument has a gap.' },
        ],
        commonMisconceptions: ['Taking membership in the maximal extension for membership in the original atlas.'],
        reviewQuestions: ['Which property of “all compatible charts” does the proof of maximality use?'],
      },
      provenance: { note: 'Same-carrier implication and cross-carrier forgetting are registered separately.' },
    },

    'manifold:claim-generalization': {
      title: 'A smooth atlas is a C^k atlas',
      summary: 'Under the same atlas encoding, C^∞ transitions imply C^k transitions for every finite k.',
      formal: {
        formula: 'P_∞(A) ⇒ P_k(A) (same atlas encoding)',
        boundary: ['The cross-carrier map is a different forgetting construction and is not mixed with this same-carrier implication.'],
      },
      motivation: {
        internal: ['Higher regularity should be forgettable down to lower order.'],
        external: ['Choosing a model for different smoothness requirements.'],
        aesthetic: ['Monotonicity on one and the same carrier.'],
        growthChain: ['definition of C^∞ → truncation to finite order → same-carrier implication'],
      },
      teaching: {
        proofOverview: 'C^∞ says that derivatives of every order exist and are continuous; in particular orders 1..k satisfy C^k.',
        conditions: [
          { condition: 'the same atlas encoding', remove: 'replace the implication by a cross-structure map', counterexample: 'a smooth structure and the maximal C^k extension are not literally equal', effect: 'An extra forgetting map and a well-definedness proof are needed.' },
        ],
        commonMisconceptions: ['Mistaking P_∞⇒P_k for the identity of the C^∞ structure with the C^k structure.'],
        reviewQuestions: ['Why does the cross-carrier forgetting map not depend on the representative atlas?'],
      },
      provenance: { note: 'Same-carrier implication and cross-carrier forgetting are registered separately.' },
    },

    'manifold:claim-transition-eval': {
      title: 'Value of a same-chart transition at a given point',
      summary: 'Machine-certified fragment: under the right-inverse assumption, φ(φ⁻¹(y))=y.',
      formal: {
        assumptions: ['at the given point y, φ∘φ⁻¹(y)=y'],
        formula: '∀y. φ⁻¹ is a right inverse at the given point y ⇒ φ(φ⁻¹(y))=y',
        boundary: ['It contains no open sets, restricted domain, atlas, cover or chain rule.'],
      },
      motivation: {
        internal: ['It unfolds the composite of transition maps into a single replayable step.'],
        external: ['It shows how an open assumption is carried along with the certificate.'],
        aesthetic: ['The smallest composite identity.'],
        growthChain: ['definition of a transition → a given point → right-inverse assumption → ND certificate'],
      },
      teaching: {
        proofOverview: 'The certificate unfolds the composite and uses the open assumption at the right-inverse equation.',
        conditions: [
          { condition: 'the right-inverse assumption', remove: 'delete the assumption', counterexample: 'let φ be constantly 0 and φ⁻¹ the identity; at y=1 the composite value is not 1', effect: 'The evaluation conclusion fails.' },
        ],
        commonMisconceptions: ['Taking this step to mean that the whole manifold structure has been certified.'],
        reviewQuestions: ['If the right inverse is strengthened to a two-sided inverse, which further conditions does the certificate need?'],
      },
      provenance: { note: 'Same-carrier implication and cross-carrier forgetting are registered separately.' },
    },

    'manifold:proof-transition': {
      title: 'Same-chart transition certificate',
      summary: 'A local certificate accepted by the existing ND-subset checker, carrying one open assumption.',
      formal: {
        openAssumptions: ['the right-inverse equation at the given point'],
        boundary: ['Total functions on two sorts; the real restricted domain is not encoded.'],
      },
      teaching: {
        reviewQuestions: ['What is the open assumption of this certificate? Where does it come in the full transition argument?'],
      },
      provenance: { note: 'Same-carrier implication and cross-carrier forgetting are registered separately.' },
    },

    'manifold:method-regularity': {
      title: 'Check atlas transition regularity pair by pair',
      summary: 'For every pair of charts of a given atlas, check the overlap and the C^k condition.',
      formal: {
        name: 'Check atlas transition regularity pair by pair',
        scope: 'local method',
        In: 'a finite atlas and a target k',
        Out: 'the result of the compatibility check, or the point of failure',
        Pre: 'the atlas is finite and every overlap can be handled',
        Post: 'a C^k conclusion for every pair of transitions, or a concrete point of failure',
        Fail: 'With an infinite atlas or an undecidable domain it returns undecided and does not claim that all pairs have been checked.',
        fail: 'With an infinite atlas or an undecidable domain it returns undecided and does not claim that all pairs have been checked.',
        body: 'Enumerate every pair of charts, write out φ(U∩V) and the composite ψ∘φ⁻¹, then check the existence and continuity of the derivatives of each order.',
        boundary: ['The method handles only finitely many enumerable pairs of charts.'],
      },
      motivation: {
        internal: ['The C^k condition is a local property that can be verified pair by pair.'],
        external: ['Engineering checks of a finite atlas.'],
        aesthetic: ['It reduces a global condition to a finite check.'],
        growthChain: ['definition of C^k → pairwise enumeration → locating the point of failure'],
      },
      teaching: {
        selfCheck: [
          { prompt: 'For one pair of charts, write the domain and the image of the transition map.', competence: 'computation', criterion: 'The domain is φ(U∩V) and the image is ψ(U∩V).' },
        ],
        reviewQuestions: ['Why is checking only one direction not enough?'],
      },
      provenance: { note: 'Same-carrier implication and cross-carrier forgetting are registered separately.' },
    },

    'manifold:pattern-one-direction': {
      title: 'Misconception: checking only one transition direction',
      summary: 'Taking the regularity of ψ∘φ⁻¹ to make the inverse map automatically regular.',
      formal: {
        wrongRule: 'If ψ∘φ⁻¹ is C^k, then the pair of charts satisfies the C^k condition',
        task: 'Examine an example of a homeomorphism whose inverse is not smooth',
        counterexample: 'There are homeomorphisms that are C^k while their inverse is not; a general homeomorphism does not automatically gain regularity',
        scope: 'It concerns only the wrong rule “a one-directional check suffices”; it does not refute the C^k conclusion for the inverse under extra conditions.',
        boundary: ['Whether an individual holds this misconception belongs to the external model E.'],
      },
      motivation: {
        internal: ['Regularity is not a built-in property of a homeomorphism.'],
        external: ['A common confusion of directions in engineering work with coordinate changes.'],
        aesthetic: ['The two-directional condition is part of the definition.'],
        growthChain: ['homeomorphism intuition → one-directional check → correction by counterexample'],
      },
      teaching: {
        selfCheck: [
          { prompt: 'Write out the two families of maps that the C^k condition requires checking.', competence: 'stating a definition', criterion: 'The transition maps in both directions have to be C^k.' },
        ],
        reviewQuestions: ['When is the inverse map automatically C^k?'],
      },
      provenance: { note: 'Same-carrier implication and cross-carrier forgetting are registered separately.' },
    },

    'manifold:problem-transition-domain': {
      title: 'Write the domain and the image of a transition map',
      summary: 'Given two charts, write the coordinate description of the overlap.',
      formal: {
        goal: 'Write the domain, the image and the composite expression of the transition map correctly.',
        boundary: ['An open problem does not pretend to have a general decision procedure.'],
      },
      motivation: {
        internal: ['A wrong domain is a common point of failure in discussions of transitions.'],
        external: ['Coordinate conversion has to fix its range of validity first.'],
        aesthetic: ['It writes a geometric overlap as two open sets.'],
        growthChain: ['chart → overlap → coordinate domain → composite'],
      },
      teaching: {
        selfCheck: [
          { prompt: 'Write the full domain of ψ∘φ⁻¹.', competence: 'computation', criterion: 'The domain is φ(U∩V).' },
        ],
        reviewQuestions: ['If the overlap is empty, does the transition condition still have to be checked?'],
      },
      provenance: { note: 'Same-carrier implication and cross-carrier forgetting are registered separately.' },
    },

    'manifold:method-cover-by-charts': {
      title: 'Cover with finitely many charts first, then verify chart by chart',
      summary: 'Given a concrete space, first write down finitely many coordinate charts covering it, turning the global problem into a Euclidean problem on each chart.',
      formal: {
        name: 'Cover with finitely many charts first, then verify chart by chart',
        scope: 'local method',
        In: 'a concrete space to be decided whether it is a manifold',
        Out: 'a candidate atlas, or the point that cannot be covered',
        Pre: 'at least one coordinate chart can already be written on the space',
        Post: 'a finite cover, or an explicit report of the uncovered point as the point of failure',
        Fail: 'Writing a cover is not the same as verifying C^k compatibility; this method handles only “can it be covered”, and compatibility has to go through the pairwise check separately.',
        fail: 'Writing a cover is not the same as verifying C^k compatibility; this method handles only “can it be covered”, and compatibility has to go through the pairwise check separately.',
        body: 'For every point of the space find a coordinate chart; write the overlaps out explicitly; if no chart neighbourhood can be found for some point, stop there and report the point of failure instead of carrying on with the remaining steps.',
        boundary: ['It handles the cover only, not transition regularity.'],
      },
      motivation: {
        internal: ['The first sentence of the definition of a manifold is “every point has a neighbourhood homeomorphic to R^n”, and a cover is its direct unfolding.'],
        external: ['The atlas of the sphere, and the division of a robot’s workspace into local coordinate systems.'],
        aesthetic: ['It splits global geometry into finitely many Euclidean pieces.'],
        growthChain: ['the whole resists coordinates → split into local pieces → finite cover → the problem of transition compatibility appears'],
      },
      teaching: {
        selfCheck: [
          { prompt: 'Write two stereographic charts for the sphere and explain why two are enough.', competence: 'construction', criterion: 'The north and south poles are each covered by the other chart.' },
        ],
        reviewQuestions: ['Once the cover is written, which step is still missing before one may call it a smooth manifold?'],
      },
      provenance: { note: 'Same-carrier implication and cross-carrier forgetting are registered separately.' },
    },

    'manifold:method-extension-check': {
      title: 'Decide smoothness with an extension test',
      summary: 'To decide whether a function given only on a closed set extends smoothly, first look at the compatibility of its derivatives of each order at the boundary.',
      formal: {
        name: 'Decide smoothness with an extension test',
        scope: 'local method',
        In: 'a function defined on a closed subset',
        Out: 'a conclusion that it extends, or the point of failure at the boundary',
        Pre: 'the closed subset has a well-behaved boundary (for instance the boundary of a manifold with boundary)',
        Post: 'an existence conclusion for the extension, or the order of the derivative that is incompatible on the boundary',
        Fail: 'When the boundary is not smooth or the dimension is wrong the method does not apply; it also does not give an explicit formula for the extension.',
        fail: 'When the boundary is not smooth or the dimension is wrong the method does not apply; it also does not give an explicit formula for the extension.',
        body: 'Restrict the function to the boundary; differentiate order by order and check whether the result agrees with the interior limit; if some order disagrees, report the point of failure.',
        boundary: ['It decides compatibility only; it does not construct the extension.'],
      },
      motivation: {
        internal: ['The derivatives of every order of a smooth function at the boundary have to come from the interior.'],
        external: ['Piecewise modelling, where local data are assembled into a global function.'],
        aesthetic: ['It turns an existence problem into a check of finitely many derivatives.'],
        growthChain: ['local data → boundary compatibility → the extension exists, or a point of failure'],
      },
      teaching: {
        selfCheck: [
          { prompt: 'Write the one-sided derivatives of each order of f at the boundary point and compare them.', competence: 'computation', criterion: 'If one order disagrees, report the point of failure.' },
        ],
        reviewQuestions: ['Why is checking a single point of the boundary not enough?'],
      },
      provenance: { note: 'Same-carrier implication and cross-carrier forgetting are registered separately.' },
    },
  },

  representations: {
    'rep-manifold-top': { title: 'Locally Euclidean topological space', medium: 'formula and natural language', note: 'Every point has a neighbourhood homeomorphic to an open subset of R^n.' },
    'rep-manifold-atlas': { title: 'Covering atlas', medium: 'formula and diagram', note: 'Every point lies in at least one chart.' },
    'rep-manifold-transition': { title: 'Transition-map formula', medium: 'formula', note: 'Checked in both directions on the overlap.' },
    'rep-manifold-ck': { title: 'Pairwise regularity', medium: 'formula', note: 'Every transition map is C^k.' },
    'rep-manifold-smooth': { title: 'C^∞ transitions', medium: 'formula', note: 'Derivatives of every order exist and are continuous.' },
    'rep-manifold-compatible': { title: 'Transition condition for the union', medium: 'formula', note: 'Both cross-atlas and within-atlas transitions must be C^k.' },
    'rep-manifold-max': { title: 'Compatible-extension construction', medium: 'finite steps', note: 'The cover is guaranteed by A⊆A_max.' },
    'rep-manifold-h': { title: 'Atlas counterexample for h', medium: 'computation', note: 'The derivative of h, 1+2|x|, is continuous and positive.' },
  },
};
