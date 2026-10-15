/**
 * 英文覆盖：第八个案例「点集拓扑」（`top`）的**除正文块以外**的全部小节。
 *
 * 为什么集中在一个文件里：本案例是 2026-10 一次成批加入的（34 个节点、33 条行动、
 * 34 条证据、51 条关系），而这些小节**全部**只有本案例需要更新。散进六个既有聚合文件
 * （actions / evidence / relations / objects）会让这次改动横跨六处，且看不出它属于同一个案例。
 * 正文块的译文单独放在 `en/cases-top.mjs`（那是另一套强核对规则）。
 *
 * 形状与 `en/manifold.mjs` 一致：键是中文源的 id，只写含中文的字段。
 * 不写的三类字段：
 * - `provenance.sources` / `provenance.note`：来源与教材层级是中文登记，翻了就是谎报来源；
 * - 已经是英文或纯记号的值（`formal.typeEnv`、`formal.symbols`、`witness.status`、
 *   `witness.type`）：不重复声明；
 * - 数学内容（`formalStatement.tex`、公式）：覆盖里根本没有它们的译文，`i18n-parity` 会核对逐字相同。
 *
 * 重复项用**生成器**写（`conceptEvidence` / `patternEvidence` / `methodEvidence`）：
 * 中文源那 14 条概念证据的 scope 与 obligations 逐字相同，只有标题不同；
 * 手抄 14 遍会让一处笔误永远查不出来。生成器的输入是**中文源的节点标题**，
 * 因此英文标题与中文标题的对应关系是算出来的，不是抄出来的。
 *
 * 术语按 `data/i18n/glossary.mjs`：拓扑空间 topological space、开集 open set、
 * 可数公理 countability axiom、第二可数 second-countable、分离公理 separation axiom、
 * 同胚 homeomorphism、紧致 compact、仿紧 paracompact、σ-紧 σ-compact、
 * 连通 connected、拓扑流形 topological manifold、微分流形 differentiable manifold、
 * 坐标卡 coordinate chart、图册 atlas、过渡映射 transition map、局部有限 locally finite、
 * 加细 refinement、单位分解 partition of unity。
 */

const CONCEPT_SCOPE = 'This evidence states only that the node text and the registered definition agree; it does not claim that this site proves any theorem about that definition.';
const CONCEPT_OBLIGATIONS = ['Encode it as an ND certificate of Chapter 02', 'Check item by item whether the formulation of the definition is equivalent to the standard statement in the cited textbooks'];
const CONCEPT_REFERENCE = 'Point-set topology case on this site (the eighth case): written according to the standard statements of the classical textbooks';
const PATTERN_SCOPE = 'A misconception pattern is not a proposition; this evidence states only that the correspondence between the wrong rule and the counterexample is written in the node text and agrees with its anchor nodes.';
const PATTERN_OBLIGATIONS = ['Encode it as an ND certificate of Chapter 02', 'Check whether the counterexample really refutes the universal form of that wrong rule'];
const METHOD_SCOPE = 'A method is a procedure, not a provable proposition; this evidence states only that the description of the steps does not go beyond the case text, and that the range in which it fails is written out.';
const METHOD_OBLIGATIONS = ['Encode it as an ND certificate of Chapter 02', 'Check whether the range of failure (non-paracompact spaces, covers with no finite subcover, and so on) is stated clearly'];

/** 概念与理论节点的证据：标题由节点标题算出，其余字段逐字相同。 */
const conceptEvidence = (title) => ({
  title: `${title}: definition and boundary`,
  scope: CONCEPT_SCOPE,
  obligations: [...CONCEPT_OBLIGATIONS],
  reference: CONCEPT_REFERENCE,
});

const patternEvidence = (title) => ({
  title: `${title}: public description and counterexample`,
  scope: PATTERN_SCOPE,
  obligations: [...PATTERN_OBLIGATIONS],
  reference: CONCEPT_REFERENCE,
});

const methodEvidence = (title) => ({
  title: `${title}: the steps agree with the case text`,
  scope: METHOD_SCOPE,
  obligations: [...METHOD_OBLIGATIONS],
  reference: CONCEPT_REFERENCE,
});

export default {
  nodes: {
    'top:space': {
      title: 'Topological space',
      summary: 'A set together with a family of open sets: closed under arbitrary unions and finite intersections, containing the empty set and the whole set.',
      formal: {
        objectType: 'topological space',
        formationWitness: 'Parameters and predicate are closed under their declared types.',
        boundary: [
          'The open-set axioms constrain τ only; no metric or order structure on X is required.',
          'bg:top:space is a background interface (it fuses topological spaces with local Euclideanity into one minimal interface); top:space on this site is a unit-level definition that spells out the open-set axioms one by one. They are different registered objects and do not replace each other.',
        ],
      },
      representations: [
        { title: 'The open-set axioms', medium: 'formula', note: 'Three of them: arbitrary unions, finite intersections, and ∅ and X.' },
      ],
      motivation: {
        internal: ['Of all the properties of open intervals on the real line, only unions, intersections and the two endpoint conditions are actually used in proofs; extracting them lets continuity be discussed without a distance.'],
        external: ['Spacetimes in general relativity, configuration spaces of robots, and shape spaces in data analysis all need neighbourhood language without a distance.'],
        aesthetic: ['One family of subsets encodes “nearby” as a first-order condition, at minimal cost and with enough information.'],
        growthChain: ['open intervals on the real line → metric open balls → axiomatising “unions of open balls” → a topology on an arbitrary set'],
      },
      teaching: {
        conditions: [
          { remove: 'require only finite unions', counterexample: 'the cocountable topology: a countable union of open sets need not be open', effect: '“A union of open sets is open”, the most used inference of all, fails, and with it the proofs of continuity, compactness and connectedness.' },
          { remove: 'require arbitrary intersections instead', counterexample: 'on the real line, ⋂_n (−1/n, 1/n) = {0} is not open', effect: 'This is exactly the finite/arbitrary divide: demanding arbitrary intersections would exclude the usual topology on ℝ.' },
          { condition: '∅ and X belong to τ', remove: 'drop X ∈ τ', counterexample: 'the family containing only ∅', effect: 'The whole set not being open leaves X with no non-trivial continuous map and no structure converging inside its own domain.' },
        ],
        commonMisconceptions: [
          'Reading “open set” as a generalised open interval: an open set has no shape requirement, it need only satisfy the three axioms.',
          'Assuming a topology must come from a distance: the Sorgenfrey line and the cofinite topology are both non-metrisable.',
        ],
        reviewQuestions: [
          'If “finite intersections” were replaced by “arbitrary intersections”, why would the usual topology on ℝ no longer be a topology?',
          'How many different topologies can one set carry? List at least three on ℝ and give a property that holds only in the first.',
        ],
        selfCheck: [
          { prompt: 'On X = {1,2,3} write down all the topologies and say which one is not T₁; there are 8 of them.', competence: 'Construction and classification', criterion: 'T₁ requires every singleton to be closed, not merely that singletons are open.' },
        ],
      },
      provenance: { note: 'Textbooks at the reference level: Munkres, Topology, 2nd ed.; Engelking, General Topology, revised ed.; Lee, Introduction to Topological Manifolds, 2nd ed. Used to check statements and conventions; not checked page by page.' },
    },

    'top:continuous-map': {
      title: 'Continuous map',
      summary: 'The preimage of every open set is open; the auxiliary prerequisite of the definition of a homeomorphism.',
      formal: {
        objectType: 'map',
        formationWitness: 'Parameters and predicate are closed under their declared types.',
        boundary: [
          'This node is an **auxiliary prerequisite**: of the 12 threads named by the requester none is “continuous map”; it is definition material for “homeomorphism”, so it is registered as an auxiliary node rather than as one of the main threads.',
          'This node does not develop nets or filters, nor the failure of the sequential description in spaces that are not first countable (that is carried by top:countability-axioms).',
        ],
      },
      representations: [
        { title: 'The preimage criterion', medium: 'formula', note: '∀V ∈ τ_Y: f⁻¹(V) ∈ τ_X.' },
      ],
      motivation: {
        internal: ['In the ε–δ definition δ is produced in response to ε; in essence, “whatever open ball the other side gives, I can find one in the preimage” — a sentence that needs no distance.'],
        external: ['In numerical algorithms and signal processing continuity is “a small perturbation of the input does not jump the output”; the topological version lets “small” be given by any neighbourhood base.'],
        aesthetic: ['Reversing the direction of the quantifier (push forward becomes pull back) makes the definition work on any topological space — the seed of the categorical formulation.'],
        growthChain: ['ε–δ → “the preimage of V is open” → a morphism between topological spaces'],
      },
      teaching: {
        conditions: [
          { condition: 'the preimage of an open set is open (not the image)', remove: 'require instead that the image of an open set is open', counterexample: 'f: ℝ → ℝ, f(x)=x²; the image of (−1,1) is [0,1), which is not open', effect: 'Reversing the direction excludes even the most familiar continuous functions; “open image” is a different notion — an open map.' },
          { remove: 'check only at a single point', counterexample: 'checking only intervals of the form (−ε,ε) around one point a: a function continuous at that point but nowhere else passes such a check while failing the definition', effect: 'The definition needs all open sets of Y; a base is enough, but only because the preimage of a union is the union of the preimages ⇒ that reason has to be stated: the preimage of a base member being open implies that every preimage of an open set is open.' },
        ],
        commonMisconceptions: [
          'Reading continuity as “the graph can be drawn in one stroke”: f(x)=1/x is continuous on ℝ∖{0} while its graph is not connected.',
          'Thinking a continuous map sends open sets to open sets: continuity guarantees only preimages; being open is another matter.',
        ],
        reviewQuestions: ['Why does a continuous map not require the image of an open set to be open? Give an example of a continuous map that is not open.'],
      },
      provenance: { note: 'Textbooks at the reference level: Munkres, Topology, 2nd ed.; Engelking, General Topology, revised ed.; Lee, Introduction to Topological Manifolds, 2nd ed. Used to check statements and conventions; not checked page by page.' },
    },

    'top:homeomorphism': {
      title: 'Homeomorphism',
      summary: 'A bijection continuous in both directions; the notion of isomorphism for topological spaces.',
      formal: {
        objectType: 'map',
        formationWitness: 'Parameters and predicate are closed under their declared types.',
        boundary: ['“Continuous in both directions” cannot be reduced to one direction: continuity of the inverse is part of the definition, not a consequence.'],
      },
      representations: [
        { title: 'Bijection + continuity both ways', medium: 'formula and natural language', note: 'f is a bijection, and f and f⁻¹ are both continuous.' },
      ],
      motivation: {
        internal: ['Having defined topological spaces one has to ask what counts as the same space; a reversible map preserving all topological information is a homeomorphism, matching the two open-set systems point by point.'],
        external: ['Converting between map projections and rewriting the configuration space of a robot both change coordinates while preserving neighbourhood structure.'],
        aesthetic: ['It makes topological spaces a category and homeomorphism its isomorphisms, which is what gives “topological invariance” its meaning.'],
        growthChain: ['bijection → add continuity → notice that the inverse of a continuous bijection may fail to be continuous → require continuity in both directions'],
      },
      teaching: {
        conditions: [
          { condition: 'f⁻¹ is continuous', remove: 'require only that f is a continuous bijection', counterexample: 'the identity from the discrete topology to the usual one, and [0,1) → S¹, t ↦ e^{2πit}', effect: 'The first is a continuous bijection but not a homeomorphism; the second pairs [0,1) with the circle: without continuity of the inverse the criterion for “the same space” immediately becomes false.' },
          { condition: 'the topologies on both sides are fixed in advance', remove: 'allow both topologies to change', counterexample: '(X,τ₁) ≅ (X,τ₂) usually fails', effect: 'A homeomorphism compares “set + topology”, not a bare set; without fixing the topologies there is nothing to compare.' },
        ],
        commonMisconceptions: [
          'Taking a continuous bijection to be a homeomorphism: that requires being open or closed in addition.',
          'Replacing proof by “it can be deformed continuously”: the deformation intuition needs homotopy; a homeomorphism itself only requires continuity both ways.',
        ],
        reviewQuestions: [
          'Is being homeomorphic an equivalence relation? Verify reflexivity, symmetry and transitivity, and say which half of the continuity is used in each.',
          'Why is boundedness not a topological property while compactness is?',
        ],
        selfCheck: [
          { prompt: 'Prove that (0,1) ≅ ℝ and explain why the endpoints are never used.', competence: 'Construction', criterion: 'x ↦ tan(π(x−1/2)) is continuous both ways; the endpoints are not in the domain, so they are no obstacle.' },
        ],
      },
      provenance: { note: 'Textbooks at the reference level: Munkres, Topology, 2nd ed.; Engelking, General Topology, revised ed.; Lee, Introduction to Topological Manifolds, 2nd ed. Used to check statements and conventions; not checked page by page.' },
    },

    'top:countability-axioms': {
      title: 'Countability axioms: A1, A2, separable and Lindelöf',
      summary: 'First countable (A1), second countable (A2), separable and Lindelöf: four parallel clauses and the implications between them.',
      formal: {
        objectType: 'property of a topological space',
        formationWitness: 'Parameters and predicate are closed under their declared types.',
        boundary: [
          'The four clauses are four different conditions, not four ways of writing one: A2 ⇒ {A1, separable, Lindelöf}, and no converse holds.',
          'Separability and Lindelöf-ness have no implication in either direction for general topological spaces (there are counterexamples on both sides).',
        ],
      },
      representations: [
        { title: 'Second countability', medium: 'formula', note: 'There is a countable base 𝔅 such that every open set of X is a union of members of 𝔅.' },
        { title: 'The four clauses side by side', medium: 'table', note: 'A1 / A2 / separable / Lindelöf: definition, the object being tested, and a counterexample, one row each.' },
      ],
      motivation: {
        internal: ['In a metric space the family of open balls already suffices to discuss limits and continuity, yet there may be uncountably many of them (on ℝ every point has uncountably many radii); what is really used is that every neighbourhood contains one member of a countable family, and this splits “small enough” into two different questions, A1 and A2.'],
        external: ['Partitions of unity, embedding theorems and metrisation theorems all require A2; questions of “countable information” in algorithms and control theory live on the same layer.'],
        aesthetic: ['Each clause constrains a different object — neighbourhood bases, bases, dense subsets, open covers — and they collide only over the word “countable”; that is exactly why they must be registered separately.'],
        growthChain: ['the family of open balls on ℝ → keep only countably many → A1 (locally small) and A2 (globally small) → separable dense subsets → the covering property of Lindelöf'],
      },
      teaching: {
        conditions: [
          { condition: 'A2 (a countable base for the whole space)', remove: 'keep only A1', counterexample: 'the Sorgenfrey line (lower limit topology): it satisfies A1, and 1 separability clause holds, but A2 and Lindelöf, these 2 clauses, fail', effect: 'A2 is the global condition that countably many open sets generate all of them; falling back to A1 still allows the absence of a countable base, and with it countable atlases and further tools all lose their premise.' },
          { condition: 'A1 (a countable base of neighbourhoods at each point)', remove: 'require neither', counterexample: 'an uncountable discrete space, or a construction by the size of neighbourhood systems', effect: 'The sequential description fails: in a space that is not first countable, a sequence is 1 object and “a sequence converges” no longer detects closures and continuity, so nets are needed.' },
          { condition: 'separable (a countable dense subset)', remove: 'drop the metric assumption', counterexample: 'the Sorgenfrey line is separable but not second countable; the standard metric proof of the converse uses 2 countable families (dense points and rational radii)', effect: 'In a metric space “separable ⇒ A2” rests on countably many rational-radius balls; without a metric that step is unavailable.' },
        ],
        commonMisconceptions: [
          'Treating A1 and A2 as one condition: A2 ⇒ A1, but not conversely, and the Sorgenfrey line is the standard counterexample.',
          'Thinking A2 means “few open sets”: ℝ has uncountably many open sets, while A2 only asks whether a **base** is countable.',
        ],
        reviewQuestions: [
          'Why does separable ⇒ A2 hold in a metric space but not in a general topological space? Point to where the metric is used in the proof (dense points and rational radii).',
          'Is a second-countable space always Lindelöf? What role does separability play in the proof of A2 and Lindelöf?',
        ],
        selfCheck: [
          { prompt: 'Write down a countable dense subset of the Sorgenfrey line and explain why it has no countable base.', competence: 'Construction and refutation', criterion: 'ℚ is dense; any base must contain, at each point, a half-open interval [x, x+1/n), so no base is countable.' },
        ],
      },
      provenance: { note: 'Textbooks at the reference level: Munkres, Topology, 2nd ed.; Engelking, General Topology, revised ed.; Lee, Introduction to Topological Manifolds, 2nd ed. Used to check statements and conventions; not checked page by page.' },
    },

    'top:separation-axioms': {
      title: 'Separation axioms: T0–T4, regular and normal',
      summary: 'A family of conditions separating points and closed sets by open sets: T0, T1, T2 (Hausdorff), T3 (regular Hausdorff), T4 (normal Hausdorff).',
      formal: {
        objectType: 'property of a topological space',
        formationWitness: 'Parameters and predicate are closed under their declared types.',
        boundary: [
          'Separation is graded: T4 ⇒ T3 ⇒ T2 ⇒ T1 ⇒ T0, and no converse holds (each has a counterexample node).',
          'Normality (separating closed sets) does not itself include the Hausdorff condition, so “normal” and “T4” must be written separately and not interchanged.',
        ],
      },
      representations: [
        { title: 'Hausdorff (T2)', medium: 'formula', note: '∀x≠y ∃U∋x ∃V∋y: U∩V=∅.' },
        { title: 'The separation axioms side by side', medium: 'table', note: 'For each row: the objects (two points / a point and a closed set / two closed sets), the condition, and a counterexample.' },
      ],
      motivation: {
        internal: ['The uniqueness of limits, never proved in analysis, needs a hypothesis in a general topological space: it is equivalent to T2. The separation axioms record, grade by grade, exactly which conclusion costs which hypothesis.'],
        external: ['Compactifications, quotient spaces and the definition of a manifold all ask for Hausdorff by name; normality is the premise of Urysohn’s lemma and of partitions of unity.'],
        aesthetic: ['Each grade is a single open-set clause, yet T0 to T4 form a strict spectrum — the tidiest exhibition of “a condition is a counterexample”.'],
        growthChain: ['uniqueness of limits (taken for granted in analysis) → find what it is equivalent to → T2 → separating points from closed sets, closed sets from closed sets → T3 and T4'],
      },
      teaching: {
        conditions: [
          { condition: 'T2 (disjoint open neighbourhoods exist)', remove: 'fall back to T1 (every point is closed)', counterexample: 'the cofinite topology on ℝ: every point is closed, yet it is not T2', effect: 'T1 gives neither uniqueness of limits nor “compact subsets are closed”: in a compact T1 space a compact set may fail to be closed.' },
          { condition: 'T3 (a point and a closed set can be separated)', remove: 'the Hausdorff part', counterexample: 'a particular-point space with one dense point', effect: 'Regularity alone does not include T2; conflating “regular” with “T3” would make the statement “locally compact Hausdorff ⇒ T3” fail to say what it means: 2 of the grades here, T3 and T4, need 3 further requirements.' },
          { condition: 'T4 (two disjoint closed sets can be separated)', remove: 'compactness or T2', counterexample: 'the Sorgenfrey plane, which is T4 but not metrisable; even at that 4th grade of separation, compactness is not implied', effect: 'Normality and compactness do not contain each other: a compact Hausdorff space is normal, but a normal space need not be compact, and a compact space without Hausdorff need not be normal; so of the 2 conditions in the hypothesis, neither can be dropped in general.' },
        ],
        commonMisconceptions: [
          'Taking T3 and T4 to be “a bit more Hausdorff”: normality can hold without Hausdorff.',
          'Assuming a compact space is automatically normal: Hausdorff is needed; the cofinite topology on ℝ is compact and T1, but neither T2 nor normal.',
        ],
        reviewQuestions: [
          'Where in the proof is T2 used, and how does the conclusion collapse without it? Of the 2 conditions, T1 is the 1 that would remain.',
          'Which basic property of compact T1 spaces is lost when T2 is weakened to T1, and which conditions does the classification still need?',
        ],
      },
      provenance: { note: 'Textbooks at the reference level: Munkres, Topology, 2nd ed.; Engelking, General Topology, revised ed.; Lee, Introduction to Topological Manifolds, 2nd ed. Used to check statements and conventions; not checked page by page.' },
    },

    'top:compactness': {
      title: 'Compactness',
      summary: 'Every open cover has a finite subcover; turning control of the infinite into control of the finite.',
      formal: {
        objectType: 'property of a topological space',
        formationWitness: 'Parameters and predicate are closed under their declared types.',
        boundary: [
          'Defined by “open cover ⇒ finite subcover”, not by sequences and not by “bounded and closed” — the latter two agree only in metric spaces.',
          '“Compact subset” means compact in the subspace topology, not “there exists a finite cover” — the latter holds for every non-empty space.',
        ],
      },
      representations: [
        { title: 'Open cover, finite subcover', medium: 'formula', note: '⋃𝒰 = X ⇒ ∃ finite 𝒰₀ ⊆ 𝒰 with ⋃𝒰₀ = X.' },
        { title: 'Equivalent descriptions', medium: 'table', note: 'The finite intersection property for closed families: a subfamily with empty intersection ⇒ the whole family has empty intersection; in metric spaces compact ⇔ sequentially compact, and these 2 descriptions, of the 2 lists of ⇔ and ⇒ forms, are one.' },
      ],
      motivation: {
        internal: ['The proof that a continuous function on a closed bounded interval attains its maximum uses exactly one thing: that finitely many of any open cover suffice. Naming that thing carries the conclusions of ℝⁿ over to surfaces and abstract spaces.'],
        external: ['Existence in optimisation, bounded error estimates in numerical integration, and finite-degree-of-freedom approximations in physics all rest on it.'],
        aesthetic: ['The definition quantifies over **all** covers and the conclusion names a **finite** subcover — “controlling the infinite by the finite” is the most recurrent device in analysis.'],
        growthChain: ['the finite intersection property for closed sets → noticing that it holds only for compact sets → extracting the open-cover form → its relation to sequential compactness (equivalent in metric spaces, not in general)'],
      },
      teaching: {
        conditions: [
          { remove: 'ask instead for “some finite open cover”', counterexample: 'any space has the finite cover {X}', effect: 'The condition becomes vacuously true and compactness loses all content.' },
          { condition: 'Hausdorff (used for “compact ⇒ closed”)', remove: 'keep only T1', counterexample: 'ℝ with the cofinite topology: compact and T1 but not T2, and compact subsets need not be closed', effect: 'The usual corollaries “compact subsets are closed” and “disjoint compact sets can be separated” all fail.' },
          { condition: 'A2 (used for “compact ⇒ sequentially compact”)', remove: 'the countability assumption', counterexample: '[0,ω₁] with the order topology: compact but not sequentially compact', effect: '“Compact ⇒ a convergent subsequence exists” fails in general and must be replaced by nets.' },
        ],
        commonMisconceptions: [
          'Confusing compactness with boundedness: “bounded and closed ⇔ compact” holds only in ℝⁿ; in a general metric space completeness is also needed.',
          'Thinking every subset of a compact space is compact: a compact subset must be closed (and that needs T2) for closed subsets to inherit compactness.',
        ],
        reviewQuestions: [
          'Which step of the proof that the continuous image of a compact space is compact uses continuity? (Hint: the preimage of an open set.)',
          'ℝ with the cofinite topology is compact but not T2: which familiar proposition does that refute, and which does it leave standing?',
        ],
        selfCheck: [
          { prompt: 'Prove directly from the open-cover definition that a closed subset of a compact space is compact.', competence: 'Proof', criterion: 'Throw the complement into the cover; T2 is not needed here, only for proving that compact sets are closed.' },
        ],
      },
      provenance: { note: 'Textbooks at the reference level: Munkres, Topology, 2nd ed.; Engelking, General Topology, revised ed.; Lee, Introduction to Topological Manifolds, 2nd ed. Used to check statements and conventions; not checked page by page.' },
    },

    'top:paracompactness': {
      title: 'Paracompactness',
      summary: 'Every open cover has a locally finite open refinement.',
      formal: {
        objectType: 'property of a topological space',
        formationWitness: 'Parameters and predicate are closed under their declared types.',
        boundary: [
          'Compactness asks for a **finite** subcover; paracompactness asks only for a **locally finite** refinement; the latter may be infinite, which is the essential difference.',
          'This site uses it as “Hausdorff + paracompact”; the word “paracompact” alone does not include Hausdorff, so every theorem statement names Hausdorff explicitly.',
        ],
      },
      representations: [
        { title: 'Locally finite open refinement', medium: 'formula', note: 'Every open cover has a locally finite refining cover; compactness is the special case with “locally finite” replaced by “finite”.' },
      ],
      motivation: {
        internal: ['Gluing locally defined functions into a global one needs “only finitely many pieces are active near each point” — that is local finiteness, and paracompactness guarantees that every cover can be refined this way.'],
        external: ['The existence of partitions of unity is a direct consequence of paracompactness; non-local constructions in differential geometry (metrics, connections, integration) all depend on that step.'],
        aesthetic: ['It repairs the defect of compactness — that ℝⁿ does not satisfy it: ℝⁿ is not compact but is paracompact, so partitions of unity still work on ℝⁿ.'],
        growthChain: ['local definitions → wanting to glue them → discovering the need for local finiteness → defining refinements → not every space has one → paracompactness'],
      },
      teaching: {
        conditions: [
          { condition: 'local finiteness', remove: 'fall back to “each member meets finitely many others”, or weaker still', counterexample: 'refining a cover of ℝ into all the singletons {x}: a refinement, but with no locally finite organisation at all', effect: 'This is exactly where compactness and paracompactness part: a locally finite family may be infinite, a finite subcover may not.' },
          { condition: 'Hausdorff (used for normality and partitions of unity)', remove: 'keep paracompactness only', counterexample: 'a paracompact but non-Hausdorff space', effect: '“Paracompact Hausdorff ⇒ normal”, and the partitions of unity that follow, both need Hausdorff; stating only paracompactness gives a false generality.' },
          { condition: 'regularity (used as the sufficient condition in Stone’s theorem)', remove: 'the regularity assumption', counterexample: 'a paracompact space that is not normal', effect: 'Stone’s theorem relates metric spaces and **regular** paracompact spaces; without regularity, paracompactness no longer yields normality.' },
        ],
        commonMisconceptions: [
          'Identifying paracompact with compact: ℝⁿ is paracompact but not compact.',
          'Taking every locally finite refinement to be a cover: the definition requires the refinement itself to cover X, otherwise the family of singletons would always qualify.',
        ],
        reviewQuestions: [
          'Why does the single word “locally finite” suffice to obtain partitions of unity? What do compactness and paracompactness each contribute to the proof?',
          'The long line is locally compact, connected and Hausdorff — so why is it not paracompact?',
        ],
      },
      provenance: { note: 'Textbooks at the reference level: Munkres, Topology, 2nd ed.; Engelking, General Topology, revised ed.; Lee, Introduction to Topological Manifolds, 2nd ed. Used to check statements and conventions; not checked page by page.' },
    },

    'top:sigma-compact': {
      title: 'σ-compactness',
      summary: 'A countable union of compact subsets equals the whole space.',
      formal: {
        objectType: 'property of a topological space',
        formationWitness: 'Parameters and predicate are closed under their declared types.',
        boundary: [
          'The K_n need not be open or closed (under T2 a compact subset is automatically closed, but that uses separation).',
          'The relation to compactness is one-directional: compact ⇒ σ-compact (take K₁ = X), and not conversely.',
        ],
      },
      representations: [
        { title: 'A countable union of compact sets', medium: 'formula', note: 'X = ⋃_{n∈ℕ} K_n with every K_n compact.' },
      ],
      motivation: {
        internal: ['ℝⁿ is not compact, but it is a countable union of compact boxes — “each layer bounded, countably many layers” is precisely how analysis pushes local conclusions to the whole space.'],
        external: ['Countable atlases of a manifold, the layered construction of separable metric spaces, and compactness criteria for stochastic processes all use this structure.'],
        aesthetic: ['It is a compromise between compactness and countability: replacing “finite subcover” by “countably many layers” is exactly what pairs with second countability to yield the manifold axioms.'],
        growthChain: ['a sequence of compact boxes in ℝⁿ → noticing that ⋃K_n = X → defining σ-compactness → combining with local compactness and A2 to characterise manifolds'],
      },
      teaching: {
        conditions: [
          { remove: 'allow arbitrarily many K_n', counterexample: 'an uncountable discrete space written as a union of singletons', effect: 'The criterion becomes vacuous (every space is the union of its singletons) and σ-compactness loses all discriminating power.' },
          { remove: 'replace “each K_n compact” by “bounded”', counterexample: 'the closed unit ball in an infinite-dimensional Banach space, bounded and closed but not compact', effect: '“Bounded and closed ⇒ compact” holds only in ℝⁿ; elsewhere it yields false conclusions.' },
        ],
        commonMisconceptions: [
          'Taking σ-compact to be compact: σ-compact only writes the space as countably many layers, and only the layers are compact.',
          'Assuming σ-compact + locally compact ⇒ compact via an uncountable discrete space: that space is not σ-compact at all; the correct witness is ℕ with the discrete topology, which is σ-compact, locally compact and not compact.',
        ],
        reviewQuestions: ['How do σ-compactness and separability relate? Which implies which? Give a counterexample.'],
      },
      provenance: { note: 'Textbooks at the reference level: Munkres, Topology, 2nd ed.; Engelking, General Topology, revised ed.; Lee, Introduction to Topological Manifolds, 2nd ed. Used to check statements and conventions; not checked page by page.' },
    },

    'top:connectedness': {
      title: 'Connectedness',
      summary: 'Not expressible as the union of two non-empty disjoint open sets; path connectedness is the neighbouring notion.',
      formal: {
        objectType: 'property of a topological space',
        formationWitness: 'Parameters and predicate are closed under their declared types.',
        boundary: [
          'Connectedness is a **global** property: local connectedness and local path connectedness are different conditions, and none contains another.',
          'Path connected ⇒ connected, and not conversely (the topologist’s sine curve); both also have local versions.',
        ],
      },
      representations: [
        { title: 'Not separable', medium: 'formula', note: 'There are no non-empty disjoint open U, V with X = U ∪ V.' },
        { title: 'Path connected', medium: 'formula', note: '∀x,y ∃ continuous γ: [0,1] → X, γ(0)=x, γ(1)=y.' },
      ],
      motivation: {
        internal: ['The intermediate value theorem says a continuous function on an interval takes intermediate values, and it uses only that an interval cannot be cut into two pieces; extracting that gives connectedness.'],
        external: ['Phase transitions and invariants, reachability in control systems, and deciding whether a data set forms one connected component all use this structure.'],
        aesthetic: ['Connectedness writes “cannot be cut apart” as a set-theoretic condition; it is the second global property after compactness, and together they yield a great many classification theorems.'],
        growthChain: ['the intermediate value property of intervals → extracting “cannot be separated” → connectedness → the stronger notion of path connectedness → the sine curve showing the two differ'],
      },
      teaching: {
        conditions: [
          { remove: 'separate by arbitrary disjoint subsets', counterexample: 'ℚ is a dense totally disconnected space, yet every subset is both open and closed in itself', effect: 'Separating by disjoint subsets alone excludes nothing; the two pieces must be open (and closed) relative to the whole space.' },
          { condition: 'connected globally', remove: 'replace it by local connectedness', counterexample: 'the topologist’s sine curve: connected (its closure is connected too), but neither locally connected nor path connected', effect: 'The continuity theorems use global connectedness; taking local connectedness as the hypothesis would omit exactly these spaces.' },
          { condition: 'path connected (the continuous image of [0,1])', remove: 'drop the compactness of [0,1]', counterexample: '“paths” parameterised by (0,1] or by ℝ', effect: 'Path connectedness must use a compact parameter interval; using ℝ gives a weaker variant of arc connectedness whose relation to connectedness changes accordingly.' },
        ],
        commonMisconceptions: [
          'Taking connected to mean “looks like one piece”: the sine curve and its closure look like two parts, yet they form one connected space.',
          'Assuming connected + locally connected ⇒ path connected: local path connectedness is needed, or an extra hypothesis (for manifolds, local Euclideanity suffices).',
        ],
        reviewQuestions: [
          'Why is a path connected space necessarily connected, while the converse fails? Identify where the connectedness of [0,1] is used.',
          'A continuous image of a connected space is connected — which property of continuous maps does the proof use?',
        ],
        selfCheck: [
          { prompt: 'Use connectedness to prove the intermediate value theorem.', competence: 'Proof', criterion: 'If f missed an intermediate value, the preimages would split the interval into two non-empty disjoint open sets, contradicting connectedness.' },
        ],
      },
      provenance: { note: 'Textbooks at the reference level: Munkres, Topology, 2nd ed.; Engelking, General Topology, revised ed.; Lee, Introduction to Topological Manifolds, 2nd ed. Used to check statements and conventions; not checked page by page.' },
    },

    'top:coordinate-chart': {
      title: 'Coordinate chart',
      summary: '(U, φ): U is an open subset of the space and φ a homeomorphism onto an open subset of ℝⁿ.',
      formal: {
        objectType: 'local coordinate system',
        formationWitness: 'Parameters and predicate are closed under their declared types.',
        boundary: [
          'The image φ(U) must be open: mapping onto a closed subset of ℝⁿ (say [0,1]) is not a coordinate chart.',
          'A chart carries no differentiable structure: the C^r condition is imposed on the transition maps of an atlas, which is carried by top:atlas and top:differentiable-manifold.',
        ],
      },
      representations: [
        { title: 'Local coordinate chart', medium: 'formula', note: 'φ: U → φ(U) ⊆ ℝⁿ a homeomorphism with φ(U) open.' },
      ],
      motivation: {
        internal: ['To do calculus on a curved space one first needs a piece that looks like a plane; a coordinate chart is precisely the dictionary between such a piece and an open subset of ℝⁿ.'],
        external: ['A sheet of a world atlas and a local parameterisation of a robot configuration space are both coordinate charts.'],
        aesthetic: ['It turns “locally like Euclidean space” into a pair (U, φ), reducing the global structure question to the compatibility of these pairs.'],
        growthChain: ['no global parameterisation of a sphere → parameterise the hemispheres → abstract to (U, φ) → require φ(U) open and φ a homeomorphism'],
      },
      teaching: {
        conditions: [
          { condition: 'φ(U) is an open subset of ℝⁿ', remove: 'allow φ(U) closed or half-open', counterexample: 'parameterising U onto [0,1] or [0,1)', effect: 'Derivatives cannot be taken in both directions at boundary points: openness is the set-theoretic way of saying “one may perturb in every direction”.' },
          { condition: 'φ is a homeomorphism, not merely a continuous bijection', remove: 'ask only for a continuous bijection', counterexample: '[0,1) → S¹, t ↦ e^{2πit} is a continuous bijection', effect: 'The inverse failing to be continuous prevents pulling the local structure of ℝⁿ back, so a chart must work in both directions.' },
          { condition: 'U is open relative to M', remove: 'allow U to be an arbitrary subset', counterexample: 'taking U to be a single point of the circle', effect: 'A single point cannot carry local parameters: neighbourhood structure must come from the topology of M.' },
        ],
        commonMisconceptions: [
          'Confusing a coordinate chart with a coordinate system: a chart is a region together with a homeomorphism; a coordinate system is just the component functions (x¹,…,xⁿ) of φ.',
          'Assuming a chart can cover the whole space: manifolds generally have no global chart (the sphere is an example).',
        ],
        reviewQuestions: ['Why require φ(U) to be open rather than an arbitrary subset? If U were parameterised by a closed region, at which step would calculus fail?'],
      },
      provenance: { note: 'Textbooks at the reference level: Munkres, Topology, 2nd ed.; Engelking, General Topology, revised ed.; Lee, Introduction to Topological Manifolds, 2nd ed. Used to check statements and conventions; not checked page by page.' },
    },

    'top:atlas': {
      title: 'Atlas',
      summary: 'A family of charts covering the manifold whose transition maps are pairwise compatible; compatibility can be checked pair by pair.',
      formal: {
        objectType: 'a family of coordinate charts',
        formationWitness: 'Parameters and predicate are closed under their declared types.',
        boundary: [
          'Compatibility comes in levels: topologically it asks only that transition maps be homeomorphisms (a topological atlas), while C^r compatibility is registered separately.',
          'The covering condition cannot be dropped: if some point has no neighbourhood that is covered, the local-coordinate statement has nothing to say there.',
        ],
      },
      representations: [
        { title: 'Covering + compatibility', medium: 'formula', note: 'Every point lies in at least one chart; over the overlap φ_α(U_α∩U_β) the transition maps in both directions must be defined and isomorphisms at the relevant level.' },
      ],
      motivation: {
        internal: ['A single chart governs one piece only; to discuss properties of the whole space these pieces must translate into each other. An atlas writes “covering” and “compatible translation” into one object.'],
        external: ['Stitching the sheets of a world atlas and switching between local parameterisations of a robot workspace both rely on this compatibility.'],
        aesthetic: ['It turns the pattern “a global object glued from local data” into checkable conditions: a cover plus pairwise transitions.'],
        growthChain: ['one chart → a family of charts → add the covering condition → notice that overlaps need compatibility → atlas → add C^r to obtain a differentiable atlas'],
      },
      teaching: {
        conditions: [
          { condition: 'the charts cover M', remove: 'the covering condition', counterexample: 'keeping only the northern hemisphere chart of the sphere', effect: 'Points that are not covered have no coordinates, and “defined on the atlas” fails at those points.' },
          { condition: 'transition maps are defined and continuous (homeomorphisms) on overlaps', remove: 'check only one direction on non-empty overlaps', counterexample: 'the two transitions are mutually inverse maps: one direction being defined does not make the inverse continuous', effect: 'Compatibility is a two-way condition; this is the same discipline already registered in the manifold case, registered here independently so that the case is self-contained.' },
          { condition: 'check all ordered pairs of charts', remove: 'check only adjacent pairs by index', counterexample: 'three charts laid end to end where only the non-adjacent pair is incompatible', effect: 'Compatibility is not locally transmitted along an enumeration; checking adjacent pairs alone misses the real incompatibility.' },
        ],
        commonMisconceptions: [
          'Taking an atlas to be “a set”: it is a structure with covering and compatibility conditions, and a different family of charts may give a different atlas.',
          'Assuming an atlas must be finite or countable: a general atlas can be arbitrarily large; a second-countable manifold **has** a countable atlas, but that is not part of the definition.',
        ],
        reviewQuestions: ['Why must compatibility be checked in both directions? Give a concrete case where one direction is smooth and the reverse is not.'],
      },
      provenance: { note: 'Textbooks at the reference level: Munkres, Topology, 2nd ed.; Engelking, General Topology, revised ed.; Lee, Introduction to Topological Manifolds, 2nd ed. Used to check statements and conventions; not checked page by page.' },
    },

    'top:topological-manifold': {
      title: 'Topological manifold',
      summary: 'A locally Euclidean Hausdorff second-countable topological space.',
      formal: {
        objectType: 'topological space',
        formationWitness: 'Parameters and predicate are closed under their declared types.',
        boundary: [
          'This site registers it as “locally Euclidean + Hausdorff + second-countable”; dg:topological-manifold is registered as “Hausdorff + locally Euclidean” (without second countability). Both registrations are kept and the difference is stated, not merged.',
          'Second countability is not a technical add-on: it guarantees countable atlases, partitions of unity and the embedding theorem, and the long line shows that without it local Euclideanity plus Hausdorff can still produce a pathological manifold.',
        ],
      },
      representations: [
        { title: 'The three axioms', medium: 'formula', note: 'Locally Euclidean (every point has a Euclidean neighbourhood) + Hausdorff + second-countable.' },
        { title: 'What each axiom rules out', medium: 'table', note: 'Local Euclideanity rules out spaces without coordinates; Hausdorff rules out “two origins”; A2 rules out the long line.' },
      ],
      motivation: {
        internal: ['With charts and atlases in hand one still has to say which underlying spaces can carry them; local Euclideanity supplies coordinates, and Hausdorff and A2 ensure that the coordinates glue globally without pathology.'],
        external: ['Spacetimes and configuration spaces require exactly this set of axioms; shape spaces in medical imaging and statistical manifolds live on the same layer.'],
        aesthetic: ['Each of the three axioms matches a counterexample, so dropping any one of them immediately produces a pathological space — the cleanest instance of “a condition is a counterexample”.'],
        growthChain: ['surfaces (intuition) → local Euclideanity → add Hausdorff → add second countability → the modern definition of a topological manifold'],
      },
      teaching: {
        conditions: [
          { remove: 'local Euclideanity', counterexample: 'the rationals ℚ, or any totally disconnected space', effect: 'Without Euclidean neighbourhoods there are no coordinates, and neither calculus nor “dimension” can be defined.' },
          { remove: 'Hausdorff', counterexample: 'the line with two origins (locally Euclidean, A2, not T2)', effect: 'Limits cease to be unique, compact subsets need not be closed, and gluing lemmas and uniqueness arguments lose their premise.' },
          { remove: 'second countability', counterexample: 'the long line (locally Euclidean, connected, Hausdorff, not A2, not paracompact)', effect: 'Partitions of unity and countable atlases disappear, and the most used tool “paracompact ⇒ partition of unity” becomes unavailable.' },
        ],
        commonMisconceptions: [
          'Reading “locally like ℝⁿ” as “globally like ℝⁿ”: the sphere and projective space are locally Euclidean but globally not.',
          'Taking the dimension n to be part of the definition: n is determined by the local Euclidean condition, and on a connected manifold uniqueness needs a theorem (Brouwer’s invariance of dimension).',
        ],
        reviewQuestions: [
          'Which single manifold axiom does the long line fail? At which step does that failure destroy the existence of partitions of unity?',
          'Why is the line with two origins not Hausdorff? Can it still be covered by coordinate charts?',
        ],
        selfCheck: [
          { prompt: 'Write down the two stereographic charts of S² and check the three axioms.', competence: 'Construction and verification', criterion: 'Both images are open subsets of ℝ² and both maps are homeomorphisms; S² is a metric space, hence Hausdorff and A2; the two charts already cover it.' },
        ],
      },
      provenance: { note: 'Textbooks at the reference level: Munkres, Topology, 2nd ed.; Engelking, General Topology, revised ed.; Lee, Introduction to Topological Manifolds, 2nd ed. Used to check statements and conventions; not checked page by page.' },
    },

    'top:differentiable-manifold': {
      title: 'Differentiable manifold',
      summary: 'A topological manifold with a C^r atlas (r ≥ 1): transition maps have r continuous derivatives.',
      formal: {
        objectType: 'topological space',
        formationWitness: 'Parameters and predicate are closed under their declared types.',
        boundary: [
          'This site registers it as “there exists a C^r atlas” (not as a designated one); two incompatible C^r atlases give different differentiable structures.',
          'C⁰ does not count as a differentiable manifold: without a C¹ structure the tangent space cannot be defined; r = 0 and r = 1 are genuinely different cases. For r = ∞ one writes smooth manifold.',
        ],
      },
      representations: [
        { title: 'C^r atlas', medium: 'formula', note: 'The transition maps φ_β∘φ_α⁻¹ and their inverses are C^r (r ≥ 1).' },
      ],
      motivation: {
        internal: ['A topological manifold supports only continuity; to differentiate on it, changing coordinates must not destroy differentiability. Writing that requirement on higher derivatives is the C^r structure.'],
        external: ['General relativity asks for C^∞ (or piecewise C^r); numerical differentiation and image matching ask for at least C¹.'],
        aesthetic: ['That one topological manifold can carry several inequivalent differentiable structures is counter-intuitive and true; it exposes the difference between topological and differentiable structure.'],
        growthChain: ['topological manifold → wanting to differentiate in coordinates → noticing that changing coordinates breaks differentiability → requiring transition maps to be C^r → differentiable manifold'],
      },
      teaching: {
        conditions: [
          { condition: 'r ≥ 1', remove: 'allow r = 0', counterexample: 'an atlas whose transitions are only continuous', effect: 'With a C⁰ atlas “d(f∘φ⁻¹)” is undefined and the tangent space has no definition.' },
          { condition: 'both directions of the transition maps are C^r', remove: 'check only one direction', counterexample: 'a homeomorphism whose inverse is not C^r', effect: 'The C^r condition is two-way; checking one direction would mistake a non-differentiable structure for a differentiable one.' },
          { condition: 'a topological manifold is presupposed (including A2 and Hausdorff)', remove: 'keep only “locally Euclidean”', counterexample: 'the long line with an arbitrary atlas', effect: 'The technical conclusions for differentiable manifolds (partitions of unity, embeddings) depend on the underlying topological axioms, not only on the regularity of transitions.' },
        ],
        commonMisconceptions: [
          'Taking a differentiable manifold to be “a space that looks locally like ℝⁿ”: that gives only a topological manifold, with no C^r structure.',
          'Assuming the differentiable structure on a topological manifold is unique: in higher dimensions a topological manifold may carry inequivalent C^∞ structures.',
        ],
        reviewQuestions: [
          'Why does r = 0 not count as a differentiable manifold? Using the definition of the tangent space, say which step is missing.',
          'Do two incompatible C^r atlases give the same differentiable manifold?',
        ],
      },
      provenance: { note: 'Textbooks at the reference level: Munkres, Topology, 2nd ed.; Engelking, General Topology, revised ed.; Lee, Introduction to Topological Manifolds, 2nd ed. Used to check statements and conventions; not checked page by page.' },
    },
    'top:sequentially-compact': {
      title: 'Sequential compactness',
      summary: 'Every sequence has a convergent subsequence; in metric spaces this is equivalent to compactness, in general spaces it is not.',
      formal: {
        objectType: 'property of a topological space',
        formationWitness: 'Parameters and predicate are closed under their declared types.',
        assumptions: ['the sequence takes values in X, and convergence is judged by the topology of X'],
        boundary: [
          'This node is an **auxiliary prerequisite**: of the 12 threads named by the requester none is “sequential compactness”; it is the sequential-side contrast condition to compactness, so it is registered as an auxiliary node rather than as one of the main threads.',
          'This is the characterisation equivalent to compactness **in metric spaces**; for a general topological space it is strictly weaker than compactness, and the right generalisation uses nets rather than sequences.',
          'This site does not develop the general theory of nets and subnets (the countability-axioms node states where the sequential description fails).',
        ],
      },
      representations: [
        { title: 'Every sequence has a convergent subsequence', medium: 'formula', note: '∀(x_n) ∃ a subsequence x_{n_k} and x ∈ X with x_{n_k} → x.' },
      ],
      motivation: {
        internal: ['The proof that a continuous function on a closed interval attains its maximum actually uses the sequential description; in metric spaces sequential compactness and compactness are equivalent, so the two intuitions (sequences / open covers) coincide where it matters most.'],
        external: ['“The iteration sequence has a convergent subsequence” is a common solvability criterion in numerical algorithms.'],
        aesthetic: ['It places the sequential property of closed bounded intervals next to the topological one, and the gap between them is exactly the metric structure.'],
        growthChain: ['Bolzano–Weierstrass on a closed interval → abstracted to “every sequence has a convergent subsequence” → compared with the open-cover form → they agree only in metric spaces'],
      },
      teaching: {
        conditions: [
          { condition: 'sequences (not nets)', remove: 'use sequences even when the index set is uncountable', counterexample: '[0, ω₁] with the order topology is compact but not sequentially compact', effect: 'A sequence has only countably many terms and cannot catch up with the first uncountable ordinal; in a general space one must switch to nets.' },
          { condition: 'metric space (the hypothesis for equivalence with compactness)', remove: 'drop the metric', counterexample: 'an uncountable discrete space: is it sequentially compact? — no; it is not even compact', effect: 'The proof of “sequentially compact ⇔ compact” uses the metric: a sequentially compact metric space is complete and totally bounded, hence compact. Without a metric that chain breaks.' },
        ],
        commonMisconceptions: ['Taking “sequentially compact ⇔ compact” to be a general theorem: it holds only in metric spaces, which is also why textbooks of general topology define compactness by covers alone.'],
        reviewQuestions: ['Give a space that is compact but not sequentially compact, and say which property makes the sequential description fail.'],
      },
      provenance: { note: 'Textbooks at the reference level: Munkres, Topology, 2nd ed.; Engelking, General Topology, revised ed.; Lee, Introduction to Topological Manifolds, 2nd ed. Used to check statements and conventions; not checked page by page.' },
    },
    'top:locally-compact': {
      title: 'Local compactness',
      summary: 'Every point has a compact neighbourhood; compact spaces are locally compact, and ℝⁿ is locally compact without being compact.',
      formal: {
        objectType: 'property of a topological space',
        formationWitness: 'Parameters and predicate are closed under their declared types.',
        assumptions: ['every point has at least one compact neighbourhood (neighbourhoods need not be open; under T2 one may take closed compact neighbourhoods)'],
        boundary: [
          'This node is an **auxiliary prerequisite**: of the 12 threads named by the requester none is “local compactness”; it is the grade obtained by relaxing the global finiteness of compactness, so it is registered as an auxiliary node rather than as one of the main threads.',
          'The relation to compactness is one-directional: compact ⇒ locally compact, and not conversely (ℝⁿ is locally compact but not compact).',
          '“Locally compact + T2” is sufficient for T3; local compactness alone is not, since it carries no separation.',
        ],
      },
      representations: [
        { title: 'Every point has a compact neighbourhood', medium: 'formula', note: '∀x ∈ X ∃ a compact K with x ∈ int K (under T2 this is equivalent to “has a compact neighbourhood”).' },
      ],
      motivation: {
        internal: ['Compactness is too strong (even ℝⁿ fails it), yet many arguments need only “a compact block near each point”; naming that condition separately makes it clear which theorems need only local compactness.'],
        external: ['Local compactness is the premise for the existence of the one-point compactification, and it is where “locally Euclidean ⇒ locally compact” comes from for manifolds.'],
        aesthetic: ['It relaxes “globally finite” to “pointwise finite”, the same move by which paracompactness relaxes “finite” to “locally finite”.'],
        growthChain: ['compactness is too strong → ask for a compact neighbourhood point by point → local compactness → combine with T2 to obtain T3'],
      },
      teaching: {
        conditions: [
          { condition: 'every point has a compact neighbourhood', remove: 'weaken to “every point has a relatively compact open neighbourhood” without requiring the closure to be compact', counterexample: 'in a non-T2 space the closure may fail to lie in any compact set', effect: 'In a T2 space the two formulations agree; without T2, “compact neighbourhood” and “relatively compact neighbourhood” come apart.' },
          { condition: 'Hausdorff (used for T3)', remove: 'keep local compactness only', counterexample: 'a locally compact but non-T2 space', effect: 'T2 cannot be dropped from “locally compact Hausdorff ⇒ T3”: that proof uses T2 to separate a point from a closed set.' },
        ],
        commonMisconceptions: ['Reversing the direction: ℝⁿ is locally compact but not compact, so compactness is only a sufficient condition for local compactness.'],
        reviewQuestions: ['Which grade of separation does locally compact + T2 yield, and where in the proof is T2 used?'],
      },
      provenance: { note: 'Textbooks at the reference level: Munkres, Topology, 2nd ed.; Engelking, General Topology, revised ed.; Lee, Introduction to Topological Manifolds, 2nd ed. Used to check statements and conventions; not checked page by page.' },
    },


    'top:claim-compact-normal': {
      title: 'A compact Hausdorff space is normal',
      summary: 'Compact + T2 ⇒ T4: any two disjoint closed sets can be separated by disjoint open sets.',
      motivation: {
        internal: ['Normality is the premise of Urysohn’s lemma and of partitions of unity; constructing a “separating function” in analysis starts here.'],
        external: ['Constructing buffers in numerical methods (separating two disjoint regions by a smooth function) depends on it.'],
        aesthetic: ['The conclusion (separating closed sets) is stronger than the hypothesis (separating points), and compactness supplies the finite step that makes the upgrade.'],
        growthChain: ['T2 separates two points → compactness upgrades “separate pointwise” into “a finite intersection of open sets” → separating two closed sets'],
      },
      teaching: {
        proofOverview: 'For each x ∈ A use T2 to find an open neighbourhood disjoint from B; compactness extracts a finite subcover of A, and intersecting the corresponding neighbourhoods and taking the union of the others separates A from B by disjoint open sets.',
        conditions: [
          { condition: 'Hausdorff', remove: 'keep only T1', counterexample: 'ℝ with the cofinite topology', effect: 'T1 separates points from points, not points from closed sets, and the proof breaks at “find disjoint neighbourhoods”.' },
          { condition: 'compactness', remove: 'keep only local compactness', counterexample: 'the long line: locally compact Hausdorff but not normal, and its central gap, the space of 4 axioms it fails, is exactly the separation needed here', effect: 'Finite subcovers buy the finite intersections; without compactness that step must be replaced by local finiteness, which is exactly what paracompactness supplies.' },
        ],
        commonMisconceptions: ['Assuming a compact space is automatically normal: Hausdorff is needed; a compact T1 space may be neither T2 nor normal.'],
        reviewQuestions: ['What exactly does the finite subcover buy in the proof? If it is replaced by a locally finite refinement, what extra hypothesis is needed?'],
      },
      provenance: { note: 'Textbooks at the reference level: Munkres, Topology, 2nd ed.; Engelking, General Topology, revised ed.; Lee, Introduction to Topological Manifolds, 2nd ed. Used to check statements and conventions; not checked page by page.' },
    },

    'top:claim-compact-paracompact': {
      title: 'A compact Hausdorff space is paracompact',
      summary: 'Compact + T2 ⇒ paracompact: every open cover has a locally finite open refinement.',
      motivation: {
        internal: ['The existence theorem for partitions of unity is stated for paracompact Hausdorff spaces; this implication is the cheapest way to bring compact spaces under the same theorem.'],
        external: ['Localisation in finite element meshes and the finite-neighbourhood organisation of covering data rely on this structure.'],
        aesthetic: ['It converts the strong global finiteness of compactness into the weaker local finiteness, so that non-compact spaces such as ℝⁿ enjoy the same tools.'],
        growthChain: ['compact ⇒ finite subcover → weaken to locally finite → paracompact → meet partitions of unity'],
      },
      teaching: {
        proofOverview: 'Take a finite subcover and use the normality of a compact Hausdorff space (from T2 plus compactness) to shrink each member into a locally finite family, obtaining a locally finite open refinement: compact ⇒ paracompact for a Hausdorff space.',
        conditions: [
          { condition: 'compactness', remove: 'keep only T2', counterexample: 'consider whether a T2 space is a counterexample: ℝ, with its 2 properties paracompact and non-compact, is not one', effect: 'Compactness supplies the finiteness; without it the theorem fails (there exist T2 non-paracompact spaces), but a counterexample must be more complicated than ℝ.' },
          { condition: 'Hausdorff', remove: 'keep only compactness', counterexample: 'ℝ with the cofinite topology: compact but not T2, nor paracompact', effect: 'Compactness alone provides no separation tool for building locally finite refinements.' },
        ],
        commonMisconceptions: ['Assuming paracompact and compact coincide: ℝⁿ is paracompact but not compact, and compactness is merely one sufficient condition.'],
        reviewQuestions: ['Why does a finite subcover yield a locally finite refinement, while the converse fails?'],
      },
      provenance: { note: 'Textbooks at the reference level: Munkres, Topology, 2nd ed.; Engelking, General Topology, revised ed.; Lee, Introduction to Topological Manifolds, 2nd ed. Used to check statements and conventions; not checked page by page.' },
    },

    'top:claim-metric-paracompact': {
      title: 'A metric space is paracompact',
      summary: 'Every metric space is paracompact (the first half of Stone’s theorem); every metric space is also normal.',
      motivation: {
        internal: ['The spaces taken for granted in analysis — ℝⁿ and Banach spaces — automatically fall inside the theorem, which explains why paracompactness is almost never checked in analysis.'],
        external: ['Any space modelled by a distance (signal spaces, spaces of probability measures) automatically acquires partitions of unity and embedding tools.'],
        aesthetic: ['One extra structure, the metric, yields two separation properties at once: the paradigm of “the richer the structure, the more automatic the conditions”.'],
        growthChain: ['metric → attempt to make the ball family countable → obtain a locally finite refinement → paracompact'],
      },
      teaching: {
        proofOverview: 'Use the metric to shrink a given cover: the family obtained by distances to complements is locally finite; normality follows from an explicit continuous separating function.',
        conditions: [
          { condition: 'the topology is induced by a metric', remove: 'keep only general T2', counterexample: 'the Sorgenfrey line is metrisable, the long line is not', effect: 'The hypothesis of this statement is the existence of a metric; the long line is a T2 non-paracompact non-metrisable example, showing the conclusion does not extend to all T2 spaces.' },
          { condition: 'paracompactness (without A2)', remove: 'assume paracompact ⇒ A2', counterexample: 'an uncountable discrete space: paracompact, metrisable, not A2', effect: 'Paracompactness and countability are mutually independent axioms.' },
        ],
        commonMisconceptions: ['Taking “metric space” to mean “second-countable”: only separable metric spaces are A2.'],
        reviewQuestions: ['Is an uncountable discrete space metrisable? Is it paracompact? Is it A2? Give one line of justification for each.'],
      },
      provenance: { note: 'Textbooks at the reference level: Munkres, Topology, 2nd ed.; Engelking, General Topology, revised ed.; Lee, Introduction to Topological Manifolds, 2nd ed. Used to check statements and conventions; not checked page by page.' },
    },

    'top:claim-a2-a1': {
      title: 'Second countability implies first countability',
      summary: 'A2 ⇒ A1: restricting a global countable base to each point gives a countable neighbourhood base.',
      motivation: {
        internal: ['This is the only implication among the four countability clauses that holds unconditionally; pinning it down is what shows A1 and A2 must be separate nodes.'],
        external: ['Proving “sequences suffice” needs only A1, 1 of the clauses; this explains why sequences are enough in metric spaces.'],
        aesthetic: ['Restricting a global object (a base) to a point yields a local object (a neighbourhood base) — a one-line construction that performs one level of reduction.'],
        growthChain: ['global base → take the members containing the point → a local neighbourhood base → A2 ⇒ A1'],
      },
      teaching: {
        proofOverview: 'Let 𝔅 be a countable base and set 𝔅_x = {B ∈ 𝔅 : x ∈ B}; it is countable. For any neighbourhood U take an open W ⊆ U containing x, and by the definition of a base take B ∈ 𝔅 with x ∈ B ⊆ W ⊆ U; then B ∈ 𝔅_x, so 𝔅_x is a neighbourhood base.',
        conditions: [
          { condition: '𝔅 is a base (not just a family of open sets)', remove: 'supply an arbitrary family of open sets containing x', counterexample: 'an arbitrary family of open sets need not form a neighbourhood base', effect: 'The second step, “find a base member in between”, is precisely the definition of a base.' },
        ],
        commonMisconceptions: ['Assuming A1 ⇒ A2: the Sorgenfrey line is the standard counterexample.'],
        reviewQuestions: ['Does the conclusion survive if “countable base” is replaced by “locally finite countable base”?'],
      },
      provenance: { note: 'Textbooks at the reference level: Munkres, Topology, 2nd ed.; Engelking, General Topology, revised ed.; Lee, Introduction to Topological Manifolds, 2nd ed. Used to check statements and conventions; not checked page by page.' },
    },

    'top:claim-a2-separable': {
      title: 'Second countability implies separability',
      summary: 'A2 ⇒ separable: choosing one point from each non-empty member of a countable base gives a countable dense subset.',
      motivation: {
        internal: ['The standard metric-space theorem “separable ⇔ A2” has two halves; this is the unconditional half, and separating the two halves keeps the role of the metric from being hidden.'],
        external: ['“Approximating the whole space by countably many representative points” is a basic assumption of numerical approximation and statistical estimation.'],
        aesthetic: ['The axiom of choice is used only countably many times here (one point from each non-empty base member), so it imposes no extra hypothesis.'],
        growthChain: ['countable base → one point from each non-empty member → a countable dense subset → separable'],
      },
      teaching: {
        proofOverview: 'Choose a point from each non-empty member of 𝔅 to obtain a countable set D; every non-empty open set contains a base member and therefore meets D, so D is dense.',
        conditions: [
          { condition: 'a point can be chosen from each non-empty base member', remove: 'demand an explicit choice rule', counterexample: 'in a general topological space base members have no canonical representative', effect: 'This step is countably many choices and generally needs countable choice in ZF; this site registers it honestly as a REF premise (that is exactly what the REF label says) and does not claim to have constructed D explicitly.' },
          { condition: 'base members are non-empty', remove: 'include the empty set', counterexample: 'the empty set provides no point', effect: 'The selection step runs only over non-empty members; this is the only detail in the construction.' },
        ],
        commonMisconceptions: ['Reading separable as “the space is small”: the cocountable topology on any set is separable even when the set is uncountable.'],
        reviewQuestions: ['The proof of separable ⇒ A2 works only in metric spaces; which property of the metric does it use?'],
      },
      provenance: { note: 'Textbooks at the reference level: Munkres, Topology, 2nd ed.; Engelking, General Topology, revised ed.; Lee, Introduction to Topological Manifolds, 2nd ed. Used to check statements and conventions; not checked page by page.' },
    },

    'top:claim-sigma-local-not-compact': {
      title: 'σ-compact and locally compact does not imply compact',
      summary: 'There is 1 space that is σ-compact, locally compact, Hausdorff and first countable and is not compact: ℕ with the discrete topology.',
      motivation: {
        internal: ['σ-compactness and compactness are often conflated; pushing both conditions up (local compactness, Hausdorff) before giving a non-compact example pins the gap down.'],
        external: ['Program state spaces and configuration spaces are often assumed σ-compact (countably many layers) rather than compact, and that difference decides whether an algorithm must handle an infinite case.'],
        aesthetic: ['Every property of ℕ with the discrete topology can be checked in one line — the smallest available exhibition of “a condition is a counterexample”.'],
        growthChain: ['compact ⇒ σ-compact → ask about the converse → try an uncountable discrete space → discover it is not σ-compact → switch to ℕ with the discrete topology'],
      },
      teaching: {
        proofOverview: 'Take X = ℕ with the discrete topology. σ-compact: X = ⋃_{n∈ℕ} {n} with each singleton compact. Locally compact: the open neighbourhood {n} of each point is compact. Hausdorff: the discrete family separates any two points. Not compact: the cover {{n} : n ∈ ℕ} has no finite subcover.',
        conditions: [
          { condition: 'a countable union (not an arbitrary one)', remove: 'use an uncountable discrete space instead', counterexample: 'an uncountable discrete space is not σ-compact (any countable family covers at most a countable subset)', effect: 'The witness for σ-compactness must genuinely be a **countable** union; using an uncountable discrete space gives a pseudo-counterexample that fails the hypothesis.' },
          { condition: 'local compactness must be checked separately', remove: 'check σ-compactness only', counterexample: 'ℚ is σ-compact (countable) but not locally compact', effect: 'Local compactness cannot be read off σ-compactness; the formal statement of this claim lists both and neither is dispensable.' },
        ],
        commonMisconceptions: ['Assuming σ-compact + locally compact automatically gives compact: ℕ with the discrete topology satisfies both and is not compact.'],
        reviewQuestions: ['Is an uncountable discrete space σ-compact? At which clause does it differ from ℕ with the discrete topology?'],
      },
      provenance: { note: 'Textbooks at the reference level: Munkres, Topology, 2nd ed.; Engelking, General Topology, revised ed.; Lee, Introduction to Topological Manifolds, 2nd ed. Used to check statements and conventions; not checked page by page.' },
    },
    'top:claim-cofinite-t1-not-t2': {
      title: 'The cofinite topology is T1 but not T2',
      summary: 'The cofinite topology on ℝ: singletons are closed (T1), yet any two non-empty open sets meet (not T2); it is compact and connected, and not normal.',
      formal: {
        assumptions: ['open sets are the empty set and the sets with finite complement'],
        boundary: [
          'This claim states only that T1 and T2 cannot be interchanged, and that compact + T1 does not imply normal; it does **not** refute “compact + T2 ⇒ normal”.',
          'It also does **not** refute “in a compact Hausdorff space a compact subset is closed” — this space is not T2, so it lies outside the hypotheses of that theorem.',
        ],
      },
      motivation: {
        internal: ['The spectrum of separation axioms needs a concrete model satisfying only its lowest grade; the cofinite topology is the standard one, and it also refutes “compact ⇒ normal”.'],
        external: ['Such topologies occur in coarse-grained models where “almost all points are the same”.'],
        aesthetic: ['Restricting complements to be finite, and nothing else, separates T1, T2 and normality.'],
        growthChain: ['wanting a T1 but non-T2 space → make all open sets large (finite complements) → singletons become closed → the model'],
      },
      teaching: {
        proofOverview: 'T1: the complement of a singleton is ℝ∖{x}, whose own complement {x} is finite, so ℝ∖{x} is open. Not T2: two non-empty open sets both have finite complement, hence they meet. Compact: any open cover contains a non-empty open U whose complement is finite, and finitely many members cover that complement. Not normal: of two disjoint closed sets at least one is finite, and its open neighbourhood must meet the neighbourhood of the other.',
        conditions: [
          { condition: 'finite complements (not countable complements)', remove: 'switch to countable complements', counterexample: 'the cocountable topology: T1 still holds, but compactness is lost', effect: 'The compactness of this claim depends on “finite complement”; allowing countable complements throws compactness away too, so the example no longer points at the same proposition.' },
        ],
        commonMisconceptions: ['Assuming T1 + compact gives separation: T1 guarantees only that singletons are closed, not that two points have disjoint open neighbourhoods.'],
        reviewQuestions: ['Is this space A1? Is it A2? Is it separable? Give a justification for each.'],
      },
      provenance: { note: 'Textbooks at the reference level: Munkres, Topology, 2nd ed.; Engelking, General Topology, revised ed.; Lee, Introduction to Topological Manifolds, 2nd ed. Used to check statements and conventions; not checked page by page.' },
    },

    'top:claim-connected-intermediate': {
      title: 'The continuous image of a connected space is connected (the topological source of the intermediate value theorem)',
      summary: 'A connected space under a continuous map has connected image; for real-valued functions this is the intermediate value theorem.',
      motivation: {
        internal: ['The intermediate value theorem is usually taken to be a theorem of analysis, but its proof uses only that the image of an interval is an interval; replacing ℝ by an arbitrary connected space keeps it true.'],
        external: ['Reachability tests and the propagation of invariants under continuous deformation rest on this conclusion.'],
        aesthetic: ['The proof is two lines: preimages preserve open sets, and connectedness is defined by denying a separation.'],
        growthChain: ['the intermediate value theorem on intervals → strip away the order structure → continuous images of connected spaces → a general propagation theorem'],
      },
      teaching: {
        proofOverview: 'Suppose f(X) = U ∪ V is a union of two disjoint non-empty open sets (relative to f(X)). Taking preimages gives X = f⁻¹(U) ∪ f⁻¹(V), disjoint, non-empty and open by continuity, contradicting the connectedness of X.',
        conditions: [
          { condition: 'f is continuous', remove: 'continuity', counterexample: 'an arbitrary non-continuous surjection from a connected space onto two discrete points', effect: 'A non-continuous map can send a connected interval to two isolated points, and the conclusion fails at once.' },
          { condition: 'X is connected', remove: 'replace it by local connectedness', counterexample: 'the topologist’s sine curve: connected (its closure is connected too), but neither locally connected nor path connected: 0 common points, 0 connecting paths, 1 connected component', effect: 'The conclusion needs global connectedness; taking local connectedness as the hypothesis changes the proposition.' },
        ],
        commonMisconceptions: ['Taking the intermediate value theorem to be a property of the order on ℝ: it uses connectedness, not order.'],
        reviewQuestions: ['Does the conclusion still hold if “connected” is replaced by “path connected”? Which step of the proof changes?'],
      },
      provenance: { note: 'Textbooks at the reference level: Munkres, Topology, 2nd ed.; Engelking, General Topology, revised ed.; Lee, Introduction to Topological Manifolds, 2nd ed. Used to check statements and conventions; not checked page by page.' },
    },

    'top:ce-sorgenfrey': {
      title: 'The Sorgenfrey line: A1 and separable, but not A2',
      summary: 'The lower limit topology (base [a,b)); it is also the witness for “σ-compact does not imply paracompact”.',
      formal: {
        boundary: [
          'This counterexample refutes only “A1 ⇒ A2” and “separable ⇒ A2”; it does **not** refute “metrisable + separable ⇒ A2” (the Sorgenfrey line is precisely non-metrisable).',
          'It does not refute A2 ⇒ A1 either: that implication is registered and proved separately as top:claim-a2-a1 — for A1 and A2 these two conditions are not interchangeable.',
        ],
      },
      representations: [
        { title: 'The Sorgenfrey line', medium: 'set-theoretic construction', note: 'ℚ is dense; any base must contain, at each point, a half-open interval, so no base is countable.' },
      ],
      motivation: {
        internal: ['The definitions of A1 and A2 differ by a single quantifier (“the neighbourhood system at each point” versus “a base for the whole space”), and a concrete space is needed to show the difference is real.'],
        external: ['Mistaking locally countable information for globally countable information is a common over-generalisation in algorithms and logic.'],
        aesthetic: ['Changing only half of the topology of ℝ (closing the left endpoint) separates all four countability clauses.'],
        growthChain: ['A2 ⇒ A1 holds → ask about the converse → modify the topology of ℝ while keeping A1 → check for a countable base → a counterexample'],
      },
      teaching: {
        proofOverview: 'Separable: ℚ meets every non-empty base member. Not A2: given a base 𝔅, for each x and n choose B with x ∈ B ⊆ [x, x+1/n); then B has x as its left endpoint, so the left endpoint determines x and the map B ↦ (left endpoint, right endpoint) is injective into an uncountable set.',
        conditions: [
          { condition: 'replace the topology of ℝ by the lower limit topology', remove: 'keep the usual topology', counterexample: 'the usual topology is A2 (a countable base is given by intervals with rational endpoints)', effect: 'The counterexample depends on changing the topology; this step shows that “A1 but not A2” is a genuine spatial property, not a logical defect.' },
          { condition: 'σ-compact but not paracompact', remove: 'assume σ-compact ⇒ paracompact', counterexample: 'the same space', effect: 'This counterexample bears two refutations; the body of the node writes the two kinds of witness separately rather than mixing them.' },
        ],
        commonMisconceptions: ['Treating the Sorgenfrey line as metrisable, and therefore as violating “separable metric spaces ⇒ A2”: of the 2 directions, that is the one that must not be used.'],
        reviewQuestions: ['Is the Sorgenfrey line Lindelöf? If it is, why is it still not paracompact?'],
      },
      provenance: { note: 'Textbooks at the reference level: Munkres, Topology, 2nd ed.; Engelking, General Topology, revised ed.; Lee, Introduction to Topological Manifolds, 2nd ed. Used to check statements and conventions; not checked page by page.' },
    },

    'top:ce-cofinite': {
      title: 'The cofinite topology: compact and T1, but not T2',
      summary: 'The cofinite topology on ℝ (open sets are those with finite complement, plus the empty set).',
      formal: {
        boundary: [
          'This counterexample refutes only “compact + T1 ⇒ normal” and “compact ⇒ every subset is closed”; it does **not** refute “compact + T2 ⇒ normal” (registered separately as top:claim-compact-normal).',
          'T1 does hold here (singletons are finite, hence have open complement), and that must be checked, otherwise the example would be misread as failing even T1.',
        ],
      },
      representations: [
        { title: 'A cofinite topological space', medium: 'set-theoretic construction', note: 'Every non-empty open set has finite complement, so every open cover has a finite subcover; any two non-empty open sets meet, so the space is not T2.' },
      ],
      motivation: {
        internal: ['A space satisfying both “compact” and “T1” while failing T2 is the cheapest way to expose the separation hypothesis hidden inside compactness arguments.'],
        external: ['Mistaking “a finite subcover can be extracted” for “points can be separated” is the same error in verification and model checking.'],
        aesthetic: ['The cofinite topology is the extreme case of “few open sets”: because there are few, covers are easily finite, and because there are few, nothing can be separated.'],
        growthChain: ['the definition of compactness → look for the simplest compact space → the cofinite topology → check T2 → it fails → the separation hypothesis is indispensable'],
      },
      teaching: {
        proofOverview: 'Compact: given an open cover, take a non-empty open member U; the remaining finitely many points are covered by finitely many members, giving a finite subcover. T1: the complement of a singleton is open. Not T2: any two non-empty open sets meet. Not normal: of two disjoint closed sets at least one is finite, and its open neighbourhood must meet the neighbourhood of the other closed set.',
        conditions: [
          { condition: 'T1 (singletons are closed)', remove: 'switch to the cocountable topology', counterexample: 'the same construction with countable complements is still T1 but does not stay compact', effect: 'The refutation must be precise: this node refutes “compact + T1 ⇒ normal”, and if the construction lost T1 the refutation would change shape.' },
          { condition: 'complements are finite', remove: 'allow countable complements', counterexample: 'the cocountable topology: still T1, but not compact', effect: 'The compactness step depends on finite complements; allowing countable ones loses compactness as well, so the example would no longer point at the same false proposition.' },
        ],
        commonMisconceptions: ['Assuming T1 + compact gives separation: T1 guarantees only that singletons are closed, not that two points have disjoint open neighbourhoods.'],
        reviewQuestions: ['Is this space A1? Is it A2? Is it separable? Give a justification for each.'],
      },
      provenance: { note: 'Textbooks at the reference level: Munkres, Topology, 2nd ed.; Engelking, General Topology, revised ed.; Lee, Introduction to Topological Manifolds, 2nd ed. Used to check statements and conventions; not checked page by page.' },
    },

    'top:ce-long-line': {
      title: 'The long line: locally Euclidean, Hausdorff and connected, but not A2 and not paracompact',
      summary: 'The space obtained by gluing uncountably many copies of [0,1) end to end; the witness that second countability and paracompactness cannot be dropped.',
      formal: {
        boundary: [
          'This counterexample refutes only “locally Euclidean + Hausdorff ⇒ A2” and the same hypothesis ⇒ paracompactness; it does **not** refute “second countable + locally Euclidean ⇒ paracompact”.',
          'The long line is connected: the fact that it is glued from uncountably many pieces does not make it disconnected, and that has to be checked.',
        ],
      },
      representations: [
        { title: 'The long line', medium: 'set-theoretic construction', note: 'The order topology of the uncountable ordinals; the failure of A2 and paracompactness is shown by a base argument and by a cover with no locally finite refinement.' },
      ],
      motivation: {
        internal: ['Of the three manifold axioms, second countability is the one most easily dismissed as technical; the long line is exactly the space that turns it into a substantive condition.'],
        external: ['In engineering where “locally like ℝⁿ” is taken as the modelling premise, ignoring countability produces pathological models for which partitions of unity do not exist.'],
        aesthetic: ['It is longer and more complicated than ℝ, yet at every point it is indistinguishable from ℝ — nowhere else is the gap between local and global so wide.'],
        growthChain: ['local Euclideanity → add Hausdorff → want to add A2 → drop A2 and build an example → the long line'],
      },
      teaching: {
        proofOverview: 'Not A2: if 1 such countable base existed, it would give 1 countable neighbourhood base inside each [α, α+1) block, but the family of half-open intervals at a point is uncountable, which conflicts with both of the 2 requirements on a base. Not paracompact: any refinement of the cover {[α, α+1)} must contain a member at each α, and these are distributed along the ordinals in such a way that the number meeting any neighbourhood is unbounded.',
        conditions: [
          { condition: 'uncountably many interval blocks', remove: 'take only countably many', counterexample: 'countably many copies of [0,1) glued together give [0,∞), which is A2', effect: 'The counterexample depends on uncountability; the countable version is precisely an A2 space, which shows A2 is a genuine dividing line.' },
          { condition: 'Hausdorff and connectedness must be verified', remove: 'show only that it is not A2', counterexample: 'the line with two origins: not Hausdorff, A2, not connected', effect: 'The value of this counterexample lies in satisfying **all** axioms except A2 and paracompactness; omitting one verification weakens what it points at.' },
        ],
        commonMisconceptions: [
          'Assuming “uncountably many pieces glued together” must be disconnected: the long line is connected and path connected.',
          'Taking the long line to be a manifold: on this site and in the textbooks a manifold is required to be second countable, so the long line is not one.',
        ],
        reviewQuestions: ['Which manifold axioms does the long line satisfy? Where is the missing one used in the proof that partitions of unity exist?'],
      },
      provenance: { note: 'Textbooks at the reference level: Munkres, Topology, 2nd ed.; Engelking, General Topology, revised ed.; Lee, Introduction to Topological Manifolds, 2nd ed. Used to check statements and conventions; not checked page by page.' },
    },

    'top:ce-uncountable-discrete': {
      title: 'An uncountable discrete space: paracompact and metrisable, but not A2',
      summary: 'An uncountable set with the discrete topology: it refutes both “paracompact ⇒ A2” and “metric ⇒ A2”.',
      formal: {
        boundary: [
          'This counterexample refutes only “paracompact ⇒ A2” and “metric ⇒ A2”; it does **not** refute “separable metric ⇒ A2” (this space is not separable).',
          'It cannot serve as a witness for “σ-compact + locally compact ⇏ compact”: an uncountable discrete space is not σ-compact (that witness is ℕ with the discrete topology, see top:claim-sigma-local-not-compact).',
        ],
      },
      representations: [
        { title: 'An uncountable discrete space', medium: 'set-theoretic construction', note: 'Every subset is open ⇒ any cover is its own refinement; every singleton must belong to a base ⇒ no base is countable.' },
      ],
      motivation: {
        internal: ['The countability axioms and the compactness conditions are mutually independent, and a family of spaces satisfying only some of them is needed to locate each axiom’s boundary.'],
        external: ['Such spaces arise naturally in constructions that treat an index set as a discrete space (uncountable families of signals, for instance).'],
        aesthetic: ['The discrete topology is the simplest topology there is, yet it separates A2 from paracompactness completely.'],
        growthChain: ['metric ⇒ normal → ask about A2 → take an uncountable discrete space → a counterexample'],
      },
      teaching: {
        proofOverview: 'In a discrete space every {x} is open, so any cover is its own open refinement, and the neighbourhood {x} of each point meets a single member, so that family is locally finite — refinement and local finiteness both hold, hence the space is paracompact. A base must contain every {x}, so no base is countable.',
        conditions: [
          { condition: 'the set is uncountable', remove: 'take a countable set', counterexample: 'ℕ with the discrete topology is A2 (a countable base)', effect: 'The counterexample depends on uncountability; the countable version is A2, which again shows A2 does not follow from paracompactness or metrisability.' },
          { condition: 'the discrete topology (every point isolated)', remove: 'use the cocountable topology on an uncountable set', counterexample: 'that space is compact and T1 but not A2, and it is **not** metrisable', effect: 'For “not A2” alone the cocountable topology is cheaper, but it cannot simultaneously witness “metrisable and not A2”.' },
        ],
        commonMisconceptions: ['Assuming metric spaces are separable or A2: an uncountable discrete space is metrisable and satisfies neither.'],
        reviewQuestions: ['Why does σ-compactness fail for an uncountable discrete space? Does that contradict “compact ⇒ σ-compact”?'],
      },
      provenance: { note: 'Textbooks at the reference level: Munkres, Topology, 2nd ed.; Engelking, General Topology, revised ed.; Lee, Introduction to Topological Manifolds, 2nd ed. Used to check statements and conventions; not checked page by page.' },
    },

    'top:example-sphere-charts': {
      title: 'The two stereographic charts of the sphere',
      summary: 'S² is covered by two charts; the transition map is written out explicitly on ℝ²∖{0}, the minimal example of a topological atlas.',
      representations: [
        { title: 'Stereographic projection', medium: 'formula and diagram', note: 'The transition map is y = x/|x|² on ℝ²∖{0}: smooth and self-inverse.' },
      ],
      motivation: {
        internal: ['The sphere has no global chart, yet two charts suffice; this example shows that “atlas” is not an empty abstraction.'],
        external: ['Geographic coordinates and the polar difficulty of map projections are exactly this construction.'],
        aesthetic: ['The transition map of the two charts happens to be inversion: minimal form, completely computable.'],
        growthChain: ['the sphere cannot be parameterised globally → it can after removing one point → remove the two poles → compute the transition map'],
      },
      teaching: {
        proofOverview: 'φ_N and φ_S are given by central projection with explicit mutually inverse formulas; the overlap is S²∖{N,S}, and the transition map is x ↦ x/|x|², smooth on ℝ²∖{0}.',
        conditions: [
          { condition: 'two charts rather than one', remove: 'keep a single chart', counterexample: 'the remaining pole is uncovered', effect: 'The covering condition cannot be dropped: one chart missing is a counterexample to the manifold definition.' },
          { condition: 'the transition map is defined on the image of the overlap', remove: 'work on the whole of ℝ²', counterexample: 'φ_S∘φ_N⁻¹ is undefined at 0 (the north pole)', effect: 'The transition map must be restricted to the image of the overlap, and this is exactly why a chart requires φ(U) to be open.' },
        ],
        commonMisconceptions: ['Thinking that “the sphere is a manifold” needs the embedding in three-dimensional space: local Euclideanity has nothing to do with an embedding.'],
        reviewQuestions: ['What atlas of S² do these two charts give? Are they C^∞ compatible?'],
        selfCheck: [
          { prompt: 'Write the explicit stereographic formulas and verify φ_S∘φ_N⁻¹(x)=x/|x|².', competence: 'Computation', criterion: 'Solving the collinearity relation gives the parameter directly.' },
        ],
      },
      provenance: { note: 'Textbooks at the reference level: Munkres, Topology, 2nd ed.; Engelking, General Topology, revised ed.; Lee, Introduction to Topological Manifolds, 2nd ed. Used to check statements and conventions; not checked page by page.' },
    },

    'top:example-projective-line': {
      title: 'The two affine charts of the real projective line',
      summary: 'ℝP¹ is covered by the affine charts U₀ and U₁ with transition map t ↦ 1/t: the minimal “quotient space with an atlas” example.',
      representations: [
        { title: 'The affine charts of the projective line', medium: 'formula', note: 'Two charts cover it; the transition map is t ↦ 1/t.' },
      ],
      motivation: {
        internal: ['It is the first manifold example that is not a subspace of some ℝⁿ, showing that local Euclideanity does not need an embedding.'],
        external: ['Projective geometry, and vanishing points and directions in computer vision, live here.'],
        aesthetic: ['ℝP¹ is in fact a circle, but constructing it from charts exhibits the abstractness of manifolds better than an embedding does.'],
        growthChain: ['homogeneous coordinates → quotient by scaling → two affine charts → transition t ↦ 1/t'],
      },
      teaching: {
        proofOverview: 'Split [x:y] according to whether x = 0; on each piece homogeneous coordinates normalise uniquely to a homeomorphism onto ℝ, and over the overlap the two normalisations are mutually inverse, giving the transition map.',
        conditions: [
          { condition: 'Hausdorffness under the quotient topology', remove: 'write the charts but never check separation', counterexample: 'without that check one cannot confirm the manifold axioms', effect: 'This example writes out the step “charts are easy, separation and A2 need a separate proof”, avoiding the jump from “has an atlas” to “is a manifold”.' },
        ],
        commonMisconceptions: ['Assuming a quotient space is automatically Hausdorff: quotient maps do not preserve separation in general, and a separate argument is required.'],
        reviewQuestions: ['ℝP¹ is homeomorphic to the circle — why is it still worth writing down in the language of charts?'],
      },
      provenance: { note: 'Textbooks at the reference level: Munkres, Topology, 2nd ed.; Engelking, General Topology, revised ed.; Lee, Introduction to Topological Manifolds, 2nd ed. Used to check statements and conventions; not checked page by page.' },
    },

    'top:pattern-local-euclidean': {
      title: 'Misconception: locally like Euclidean space means globally like it',
      summary: 'Reading “every point has a Euclidean neighbourhood” as “the whole space is ℝⁿ or an open subset of it”.',
      formal: {
        boundary: ['Whether an individual holds this misconception belongs to the external model E; this node registers the public description only.'],
      },
      motivation: {
        internal: ['The gap between local and global is the difficulty of the manifold concept: the definition gives the local picture, while conclusions are often stated globally.'],
        external: ['Mistaking “linearised locally” for “linear globally” is the same error in engineering modelling.'],
        aesthetic: ['Compactness provides the cheapest tool of refutation: a globally Euclidean space would not be compact.'],
        growthChain: ['locally Euclidean → intuitively like a plane → check the whole using compactness → a counterexample'],
      },
      teaching: {
        selfCheck: [
          { prompt: 'Use compactness to prove that S² is not homeomorphic to any open subset of ℝ².', competence: 'Refutation', criterion: 'S² is compact; an open subset of ℝ² is not compact (or is empty, which is not homeomorphic to S²).' },
        ],
        reviewQuestions: ['Which extra conditions would upgrade “locally Euclidean” to “globally Euclidean”? (Hint: even compact and connected together do not.)'],
      },
      provenance: { note: 'Textbooks at the reference level: Munkres, Topology, 2nd ed.; Engelking, General Topology, revised ed.; Lee, Introduction to Topological Manifolds, 2nd ed. Used to check statements and conventions; not checked page by page.' },
    },

    'top:pattern-a1-a2': {
      title: 'Misconception: first countable means second countable',
      summary: 'Conflating “a countable neighbourhood base at every point” with “a countable base for the whole space”.',
      formal: {
        boundary: ['This node registers the public description only; whether an individual confuses the two is recorded by the external model.'],
      },
      motivation: {
        internal: ['The two axioms differ by a single quantifier, “at every point” versus “globally”, which makes them the easiest pair to merge.'],
        external: ['Taking locally countable information for globally countable information is the same error in complexity judgements for algorithms.'],
        aesthetic: ['A space differing from ℝ in half of its topology separates the two axioms: the most economical counterexample available.'],
        growthChain: ['compare the definitions → notice the different quantifiers → look for a counterexample → the Sorgenfrey line'],
      },
      teaching: {
        selfCheck: [
          { prompt: 'Give a countable dense subset of the Sorgenfrey line and explain why it cannot produce a countable base.', competence: 'Discrimination', criterion: 'A dense subset guarantees intersections, not the members of a local neighbourhood base.' },
        ],
        reviewQuestions: ['Why does separable ⇒ A2 hold for metric spaces? Where does the metric property used there (countably many radii) fail for the Sorgenfrey line?'],
      },
      provenance: { note: 'Textbooks at the reference level: Munkres, Topology, 2nd ed.; Engelking, General Topology, revised ed.; Lee, Introduction to Topological Manifolds, 2nd ed. Used to check statements and conventions; not checked page by page.' },
    },

    'top:pattern-compact-closed': {
      title: 'Misconception: a compact subset is necessarily closed',
      summary: 'Treating a conclusion that needs Hausdorff as a corollary of compactness alone.',
      formal: {
        boundary: ['The missing hypothesis in this step is a common omission; this node registers the public description only.'],
      },
      motivation: {
        internal: ['“Closed compact subsets” is the most used form in analysis (compactness criteria, Heine–Borel), so it must be stated as compact + Hausdorff.'],
        external: ['Taking “bounded and closed” as a general criterion for compactness is the same missing hypothesis.'],
        aesthetic: ['The cofinite topology supplies T1 and compactness at once, exposing the missing separation in one step.'],
        growthChain: ['Heine–Borel in ℝⁿ → over-generalise → check separation → the cofinite counterexample'],
      },
      teaching: {
        selfCheck: [
          { prompt: 'Prove that compact subsets of a compact Hausdorff space are closed and identify where T2 is used.', competence: 'Proof and localisation', criterion: 'For a point outside the compact set, use T2 to find disjoint neighbourhoods and take a finite intersection to make the complement open.' },
        ],
        reviewQuestions: ['If T2 is replaced by T1, which step of this proof fails?'],
      },
      provenance: { note: 'Textbooks at the reference level: Munkres, Topology, 2nd ed.; Engelking, General Topology, revised ed.; Lee, Introduction to Topological Manifolds, 2nd ed. Used to check statements and conventions; not checked page by page.' },
    },

    'top:pattern-sigma-compact': {
      title: 'Misconception: σ-compact means compact',
      summary: 'Treating “a countable union of compact subsets” as “compact as a whole”.',
      formal: {
        boundary: ['A common over-generalisation; this node registers the public description only.'],
      },
      motivation: {
        internal: ['σ is merely a notation for a countable union, yet “countably many layers” and “finitely many layers” behave completely differently in proofs.'],
        external: ['Taking a countable-layer approximation for a finite one leads to wrong termination judgements in algorithms.'],
        aesthetic: ['ℕ with the discrete topology is the smallest witness: every property can be verified in one line.'],
        growthChain: ['compact ⇒ σ-compact → ask about the converse → take ℕ with the discrete topology → isolate the role of σ'],
      },
      teaching: {
        selfCheck: [
          { prompt: 'Verify that ℕ with the discrete topology is σ-compact, locally compact and Hausdorff, and explain why it is not compact.', competence: 'Verification', criterion: 'Singletons are compact and countably many cover ℕ; the cover {{n}} has no finite subcover.' },
        ],
        reviewQuestions: ['Under what conditions does σ-compact + locally compact imply compact? (Hint: adding connectedness is not enough — the long line is connected but not σ-compact.)'],
      },
      provenance: { note: 'Textbooks at the reference level: Munkres, Topology, 2nd ed.; Engelking, General Topology, revised ed.; Lee, Introduction to Topological Manifolds, 2nd ed. Used to check statements and conventions; not checked page by page.' },
    },

    'top:method-cover-check': {
      title: 'Deciding compactness, paracompactness and connectedness by covering arguments',
      summary: 'Given a space and a covering property, first write down the cover, then decide whether a finite subcover or a locally finite refinement can be extracted.',
      motivation: {
        internal: ['The definitions of compactness and paracompactness both read “for every cover there exists a subfamily”, so a decision procedure must hold on to one concrete cover.'],
        external: ['Finite cover checks on numerical grids and locality verification in finite element subdivisions are instances of this flow.'],
        aesthetic: ['It turns the “for all — there exists” quantifier structure into a checkable checklist.'],
        growthChain: ['the definition → “for every cover” → only cover-by-cover checks are possible → give a concrete witness when it fails'],
      },
      teaching: {
        selfCheck: [
          { prompt: 'Give an open cover of ℝ with no finite subcover and explain why it proves that ℝ is not compact.', competence: 'Construction', criterion: '{(−n,n)} covers ℝ; any finite subfamily covers only (−N,N).' },
        ],
        reviewQuestions: ['What form of witness is needed to refute paracompactness? (Hint: a single cover is not enough by itself.)'],
      },
      provenance: { note: 'Textbooks at the reference level: Munkres, Topology, 2nd ed.; Engelking, General Topology, revised ed.; Lee, Introduction to Topological Manifolds, 2nd ed. Used to check statements and conventions; not checked page by page.' },
    },

    'top:method-local-to-global': {
      title: 'Gluing local properties into a global one (with local finiteness and partitions of unity)',
      summary: 'Break a global problem into locally solvable pieces, then glue the local solutions using a locally finite refinement and a partition of unity.',
      motivation: {
        internal: ['Almost every global construction on a manifold (metric, connection, integral) follows this flow; it is the other side of the same coin as local Euclideanity.'],
        external: ['Assembling local models into a global model is the basic technique of finite elements, splines and computer graphics.'],
        aesthetic: ['The single phrase “locally finite” guarantees that a pointwise sum is finite — the most economical one-off hypothesis in analysis.'],
        growthChain: ['local solutions → wanting to add them → a pointwise infinite sum diverges → require local finiteness → paracompactness supplies it'],
      },
      teaching: {
        selfCheck: [
          { prompt: 'Explain why local finiteness makes the sum of a partition of unity meaningful at every point.', competence: 'Argument', criterion: 'Each point has a neighbourhood meeting only finitely many supports, so the sum is a finite sum there.' },
        ],
        reviewQuestions: ['At which step does the long line make this method fail? Would a weakened “almost everywhere” version still work?'],
      },
      provenance: { note: 'Textbooks at the reference level: Munkres, Topology, 2nd ed.; Engelking, General Topology, revised ed.; Lee, Introduction to Topological Manifolds, 2nd ed. Used to check statements and conventions; not checked page by page.' },
    },

    'top:sep-t1-theory': {
      title: 'Characterising T1 in the cofinite topology',
      summary: 'In the cofinite topology on ℝ singletons are finite, so their complements are open: T1 holds while T2 fails.',
      motivation: {
        internal: ['The spectrum of separation axioms needs a concrete model satisfying only its lowest grade, and the cofinite topology is the standard one.'],
        external: ['Such topologies occur in coarse-grained models where “almost all points are the same”.'],
        aesthetic: ['It shows at once that compactness, T1 and normality are mutually independent.'],
        growthChain: ['wanting a T1 but non-T2 space → make all open sets large (finite complements) → singletons become closed → the model'],
      },
      teaching: {
        conditions: [
          { condition: 'finite complements (not countable)', remove: 'switch to countable complements', counterexample: 'the cocountable topology: still T1, but compactness fails', effect: 'This characterisation depends on “finite”; switching to countable changes the compactness conclusions that come with it.' },
        ],
        reviewQuestions: ['Which axiom is used in the proof of T1 here? Which one fails once “finite” is replaced by “countable”?'],
      },
      provenance: { note: 'Textbooks at the reference level: Munkres, Topology, 2nd ed.; Engelking, General Topology, revised ed.; Lee, Introduction to Topological Manifolds, 2nd ed. Used to check statements and conventions; not checked page by page.' },
    },
  },

  representations: {
    'rep-top-space': { title: 'The open-set axioms', note: 'Three of them: arbitrary unions, finite intersections, and ∅ and X.' },
    'rep-top-continuous': { title: 'The preimage criterion', note: '∀V ∈ τ_Y: f⁻¹(V) ∈ τ_X.' },
    'rep-top-homeo': { title: 'Bijection + continuity both ways', note: 'f is a bijection, and f and f⁻¹ are both continuous.' },
    'rep-top-count-a2': { title: 'Second countability', note: 'There is a countable base 𝔅 such that every open set of X is a union of members of 𝔅.' },
    'rep-top-count-tab': { title: 'The four clauses side by side', note: 'A1 / A2 / separable / Lindelöf: definition, the object being tested, and a counterexample, one row each.' },
    'rep-top-sep-t2': { title: 'Hausdorff (T2)', note: '∀x≠y ∃U∋x ∃V∋y: U∩V=∅.' },
    'rep-top-sep-tab': { title: 'The separation axioms side by side', note: 'For each row: the objects (two points / a point and a closed set / two closed sets), the condition, and a counterexample.' },
    'rep-top-compact': { title: 'Open cover, finite subcover', note: '⋃𝒰 = X ⇒ ∃ finite 𝒰₀ ⊆ 𝒰 with ⋃𝒰₀ = X.' },
    'rep-top-compact-eq': { title: 'Equivalent descriptions', note: 'The finite intersection property for closed families: a subfamily with empty intersection ⇒ the whole family has empty intersection; in metric spaces compact ⇔ sequentially compact, and these 2 descriptions, of the 2 lists of ⇔ and ⇒ forms, are one.' },
    'rep-top-paracompact': { title: 'Locally finite open refinement', note: 'Every open cover has a locally finite refining cover; compactness is the special case with “locally finite” replaced by “finite”.' },
    'rep-top-sigma': { title: 'A countable union of compact sets', note: 'X = ⋃_{n∈ℕ} K_n with every K_n compact.' },
    'rep-top-connected': { title: 'Not separable', note: 'There are no non-empty disjoint open U, V with X = U ∪ V.' },
    'rep-top-path': { title: 'Path connected', note: '∀x,y ∃ continuous γ: [0,1] → X, γ(0)=x, γ(1)=y.' },
    'rep-top-chart': { title: 'Local coordinate chart', note: 'φ: U → φ(U) ⊆ ℝⁿ a homeomorphism with φ(U) open.' },
    'rep-top-atlas': { title: 'Covering + compatibility', note: 'Every point lies in at least one chart; over the overlap φ_α(U_α∩U_β) the transition maps in both directions must be defined and isomorphisms at the relevant level.' },
    'rep-top-manifold': { title: 'The three axioms', note: 'Locally Euclidean (every point has a Euclidean neighbourhood) + Hausdorff + second-countable.' },
    'rep-top-manifold-why': { title: 'What each axiom rules out', note: 'Local Euclideanity rules out spaces without coordinates; Hausdorff rules out “two origins”; A2 rules out the long line.' },
    'rep-top-diffman': { title: 'C^r atlas', note: 'The transition maps φ_β∘φ_α⁻¹ and their inverses are C^r (r ≥ 1).' },
    'rep-top-ce-sorgenfrey': { title: 'The Sorgenfrey line', note: 'ℚ is dense; any base must contain, at each point, a half-open interval, so no base is countable.' },
    'rep-top-ce-cofinite': { title: 'A cofinite topological space', note: 'Every non-empty open set has finite complement, so every open cover has a finite subcover; any two non-empty open sets meet, so the space is not T2.' },
    'rep-top-ce-longline': { title: 'The long line', note: 'The order topology of the uncountable ordinals; the failure of A2 and paracompactness is shown by a base argument and by a cover with no locally finite refinement.' },
    'rep-top-ce-discrete': { title: 'An uncountable discrete space', note: 'Every subset is open ⇒ any cover is its own refinement; every singleton must belong to a base ⇒ no base is countable.' },
    'rep-top-ex-sphere': { title: 'Stereographic projection', note: 'The transition map is y = x/|x|² on ℝ²∖{0}: smooth and self-inverse.' },
    'rep-top-ex-rp1': { title: 'The affine charts of the projective line', note: 'Two charts cover it; the transition map is t ↦ 1/t.' },
    // 2026-10 新增的两个节点各一条表征。
    // 注意：`rep-manifold-atlas` 与 `rep-manifold-top` **不在这里**重复登记——
    // 它们原本登记在 `en/manifold.mjs`，合并后虽然挂到了 top 节点上，译文仍由那一份提供；
    // 重复登记会被装配层当场拒绝（两份译文会静默覆盖一份）。
    'rep-top-seq-compact': { title: 'Every sequence has a convergent subsequence', note: '∀(x_n) ∃ a subsequence x_{n_k} and x ∈ X with x_{n_k} → x.' },
    'rep-top-locally-compact': { title: 'Every point has a compact neighbourhood', note: '∀x ∈ X ∃ a compact K with x ∈ int K (under T2 this is equivalent to “has a compact neighbourhood”).' },
  },

  actions: {
    'a-top:space': { title: 'Introduce topological spaces' },
    'a-top:map': { title: 'Introduce continuous maps and homeomorphisms' },
    'a-top:count': { title: 'Introduce the countability axioms' },
    'a-top:separation': { title: 'Introduce the separation axioms' },
    'a-top:sep-theory': { title: 'Characterise T1 for the cofinite topology' },
    'a-top:compact': { title: 'Introduce compactness' },
    'a-top:paracompact': { title: 'Introduce paracompactness' },
    'a-top:sigma': { title: 'Introduce σ-compactness' },
    'a-top:connected': { title: 'Introduce connectedness' },
    'a-top:chart': { title: 'Introduce coordinate charts' },
    'a-top:atlas': { title: 'Introduce atlases' },
    'a-top:manifold': { title: 'Introduce topological manifolds' },
    'a-top:diffmanifold': { title: 'Introduce differentiable manifolds' },
    'a-top:claim-compact-normal': { title: 'Prove that a compact Hausdorff space is normal' },
    'a-top:claim-compact-paracompact': { title: 'Prove that a compact Hausdorff space is paracompact' },
    'a-top:claim-metric-paracompact': { title: 'State that metric spaces are paracompact and normal' },
    'a-top:claim-a2-a1': { title: 'Prove that second countability implies first countability' },
    'a-top:claim-a2-separable': { title: 'State that second countability implies separability' },
    'a-top:claim-sigma': { title: 'Construct a σ-compact non-compact witness' },
    'a-top:claim-connected': { title: 'Prove that the continuous image of a connected space is connected' },
    'a-top:ce-sorgenfrey': { title: 'Construct the Sorgenfrey line' },
    'a-top:ce-cofinite': { title: 'Construct a cofinite topological space' },
    'a-top:claim-cofinite': { title: 'State that the cofinite topological space is T1 but not T2' },
    'a-top:seq-compact': { title: 'Introduce sequential compactness' },
    'a-top:locally-compact': { title: 'Introduce local compactness' },
    'a-top:ce-longline': { title: 'Construct the long line' },
    'a-top:ce-discrete': { title: 'Construct an uncountable discrete space' },
    'a-top:example-sphere': { title: 'Give the two coordinate charts of the sphere' },
    'a-top:example-rp1': { title: 'Give the two affine charts of the projective line' },
    'a-top:pattern-local': { title: 'Register the “locally Euclidean means globally Euclidean” misconception' },
    'a-top:pattern-a1': { title: 'Register the “A1 means A2” misconception' },
    'a-top:pattern-closed': { title: 'Register the “a compact subset is necessarily closed” misconception' },
    'a-top:pattern-sigma': { title: 'Register the “σ-compact means compact” misconception' },
    'a-top:method-cover': { title: 'Propose the covering-argument test' },
    'a-top:method-local-global': { title: 'Propose the local-to-global gluing method' },
    'a-top:aux-metric': { title: 'Introduce metric spaces (auxiliary prerequisite of this case)' },
  },

  evidence: {
    'ev-top-space': conceptEvidence('Topological space'),
    'ev-top-continuous-map': conceptEvidence('Continuous map'),
    'ev-top-homeomorphism': conceptEvidence('Homeomorphism'),
    'ev-top-countability-axioms': conceptEvidence('Countability axioms: A1, A2, separable and Lindelöf'),
    'ev-top-separation-axioms': conceptEvidence('Separation axioms: T0–T4, regular and normal'),
    'ev-top-compactness': conceptEvidence('Compactness'),
    'ev-top-paracompactness': conceptEvidence('Paracompactness'),
    'ev-top-sigma-compact': conceptEvidence('σ-compactness'),
    'ev-top-connectedness': conceptEvidence('Connectedness'),
    'ev-top-coordinate-chart': conceptEvidence('Coordinate chart'),
    'ev-top-atlas': conceptEvidence('Atlas'),
    'ev-top-topological-manifold': conceptEvidence('Topological manifold'),
    'ev-top-differentiable-manifold': conceptEvidence('Differentiable manifold'),
    'ev-top-metric-space': conceptEvidence('Metric space (auxiliary prerequisite of this case)'),
    'ev-top-sequentially-compact': conceptEvidence('Sequential compactness'),
    'ev-top-locally-compact': conceptEvidence('Local compactness'),
    /* 度量空间里「紧 ⇔ 序列紧」的引用型证据（对应 rel-top-compact-seq-generalization）。 */
    'ev-top-compact-seq': {
      title: 'In metric spaces compactness and sequential compactness are equivalent',
      scope: 'Registered as a citation of a standard textbook conclusion: compact + metric ⇒ complete and totally bounded ⇒ sequentially compact; sequentially compact + metric ⇒ compact. This site gives the outline of both arguments but claims no machine verification, and does not extend the equivalence to general topological spaces ([0, ω₁] is a counterexample).',
      obligations: ['Encode it as an ND certificate of Chapter 02', 'Check whether the metric property used in “complete and totally bounded ⇒ compact” is written out'],
      reference: CONCEPT_REFERENCE,
    },

    /* 有限补拓扑空间的断言：四条（T1 / 非 T2 / 紧 / 非正规）的正文级核验。 */
    'ev-top-cofinite-t1-not-t2': {
      title: 'The cofinite topological space: T1, not T2, compact, not normal',
      scope: 'T1 comes from the complement of a singleton being open; not T2 from any two non-empty open sets meeting; compactness from “the complement of any non-empty open set is finite”; non-normality from “of two disjoint closed sets at least one is finite”.',
      obligations: ['Encode it as an ND certificate of Chapter 02', 'Check that it **cannot** serve as a witness for “compact + T2 ⇏ normal” (this space does not satisfy T2)'],
      reference: CONCEPT_REFERENCE,
    },

    'ev-top-compact-normal': {
      title: 'Prose proof that a compact Hausdorff space is normal',
      scope: 'A two-step argument: separate pointwise, then extract a finite subcover using compactness.',
      obligations: ['Encode it as an ND certificate of Chapter 02', 'Check where T2 and where compactness are each used in the proof'],
      reference: CONCEPT_REFERENCE,
    },
    'ev-top-compact-paracompact': {
      title: 'Prose proof that a compact Hausdorff space is paracompact',
      scope: 'The argument that constructs a locally finite open refinement from a finite subcover; it also checks what Hausdorff contributes here (the cofinite topology is compact and T1 but not paracompact, 1 counterexample).',
      obligations: ['Encode it as an ND certificate of Chapter 02', 'Check whether the step “finite ⇒ locally finite” needs Hausdorff'],
      reference: CONCEPT_REFERENCE,
    },
    'ev-top-metric-paracompact': {
      title: 'Prose argument that metric spaces are paracompact and normal',
      scope: 'Use the distance function of the metric to construct a locally finite refinement and a continuous separating function.',
      obligations: ['Encode it as an ND certificate of Chapter 02', 'Check that the scope of Stone’s theorem is stated as registered here (the metric-space case only)'],
      reference: 'Engelking, General Topology, revised ed. (a statement-level citation; not checked page by page)',
    },
    'ev-top-a2-a1': {
      title: 'Prose proof of A2 ⇒ A1',
      scope: 'Restrict a countable base to one point to obtain a countable neighbourhood base; the second step traps an intermediate member using the definition of a base.',
      obligations: ['Encode it as an ND certificate of Chapter 02', 'Check the dependency in the step that traps a base member between x and U'],
      reference: CONCEPT_REFERENCE,
    },
    'ev-top-a2-separable': {
      title: 'The standard statement of A2 ⇒ separable',
      scope: 'Registered as a citation of a standard textbook conclusion; this site provides no machine certificate and does not claim to have formalised countable choice.',
      obligations: ['Encode it as an ND certificate of Chapter 02', 'If countable choice is used, it must be written out explicitly in the node text'],
      reference: CONCEPT_REFERENCE,
    },
    'ev-top-sigma-not-compact': {
      title: 'Prose witness that σ-compact + locally compact does not imply compact',
      scope: 'The witness space is ℕ with the discrete topology: σ-compact, locally compact, Hausdorff, not compact, all four checked one by one; the implication compact ⇒ σ-compact is checked as well.',
      obligations: ['Encode it as an ND certificate of Chapter 02', 'Check whether the witness really is σ-compact (a countable union is required)'],
      reference: CONCEPT_REFERENCE,
    },
    'ev-top-connected-intermediate': {
      title: 'The continuous image of a connected space is connected (the topological version of the intermediate value theorem)',
      scope: 'Registered as a citation of a standard textbook conclusion; this site gives a two-line argument but does not claim machine verification.',
      obligations: ['Encode it as an ND certificate of Chapter 02', 'Check whether the difference from rudin:continuity-connectedness is stated clearly'],
    },

    'ev-top-ce-sorgenfrey': {
      title: 'The Sorgenfrey line: A1 and separable but not A2',
      scope: 'Two kinds of witness: the density of ℚ; and the fact that any base must contain, at each point, a half-open interval, which forces uncountably many members.',
      obligations: ['Encode it as an ND certificate of Chapter 02', 'Check whether the “non-metrisable” clause is misused (this counterexample does not refute the separable metric case)'],
    },
    'ev-top-ce-cofinite': {
      title: 'The cofinite topology: compact, T1, not T2',
      scope: 'Compactness comes from “any non-empty open set has finite complement”; T1 from the fact that singletons are finite; non-T2 from the fact that any two non-empty open sets meet.',
      obligations: ['Encode it as an ND certificate of Chapter 02', 'Check the witness for non-normality (of two disjoint closed sets, one must be finite)'],
      reference: CONCEPT_REFERENCE,
    },
    'ev-top-ce-long-line': {
      title: 'The long line: locally Euclidean + Hausdorff + connected, not A2 and not paracompact',
      scope: 'Registered as a textbook conclusion; this site gives the outline of two arguments, one about bases and one about covers, and does not claim machine verification of ordinal arithmetic.',
      obligations: ['Encode it as an ND certificate of Chapter 02', 'Check whether the arguments for connectedness and path connectedness are both given', 'Check that it is excluded from being a manifold by second countability and not by Hausdorffness'],
    },
    'ev-top-ce-discrete': {
      title: 'An uncountable discrete space: paracompact, metrisable, not A2',
      scope: 'In a discrete space a cover is its own open refinement and is locally finite; a base must contain every singleton, hence is uncountable.',
      obligations: ['Encode it as an ND certificate of Chapter 02', 'Check that it **cannot** serve as a σ-compact witness (an uncountable discrete space is not σ-compact)'],
      reference: CONCEPT_REFERENCE,
    },

    'ev-top-example-sphere': {
      title: 'Checking the two stereographic charts of the sphere',
      scope: 'The covering, the homeomorphisms and the explicit computation of the transition map x ↦ x/|x|².',
      obligations: ['Encode it as an ND certificate of Chapter 02', 'Check that the domain of the transition map is restricted to the image of the overlap'],
    },
    'ev-top-example-rp1': {
      title: 'Checking the two affine charts of the projective line',
      scope: 'The covering, the homeomorphisms given by normalisation, and the transition map t ↦ 1/t.',
      obligations: ['Encode it as an ND certificate of Chapter 02', 'Check whether Hausdorffness and A2 under the quotient topology are proved separately'],
    },

    'ev-top-pattern-local-euclidean': patternEvidence('Misconception: locally like Euclidean space means globally like it'),
    'ev-top-pattern-a1-a2': patternEvidence('Misconception: first countable means second countable'),
    'ev-top-pattern-compact-closed': patternEvidence('Misconception: a compact subset is necessarily closed'),
    'ev-top-pattern-sigma-compact': patternEvidence('Misconception: σ-compact means compact'),

    'ev-top-method-cover-check': methodEvidence('Deciding compactness, paracompactness and connectedness by covering arguments'),
    'ev-top-method-local-to-global': methodEvidence('Gluing local properties into a global one (with local finiteness and partitions of unity)'),

    'ev-top-not-claimed': {
      title: 'What this case does not claim',
      scope: 'It is not claimed that the assertions of this case have been machine verified; that the axiom of choice has been formalised; or that all theorems about ordinal topologies and paracompactness (for instance the general form of Stone’s theorem) are covered.',
    },
  },

  relations: {
    'rel-top-pre-set-space': {
      witness: { scope: 'The subject of the definition is “a set X together with a family τ of its subsets”; the words “family of subsets”, “arbitrary union” and “finite intersection” all come from the language of sets and functions.' },
      scope: 'A family of open sets is a subset of P(X), and intersections and unions are set operations; without set language the clause “closed under finite intersections” cannot be written.',
    },
    'rel-top-pre-real-space': {
      witness: { scope: 'The first example right after the definition is “the usual topology on ℝ (the family of open intervals)”; without it, the counterexample to replacing finite intersections by arbitrary ones and every later counterexample would have no underlying set.' },
      scope: 'Every counterexample in this case (the Sorgenfrey line, the cofinite topology, the uncountable discrete space, the long line) uses ℝ or ℕ as its underlying set, and its distance and order structure come from this background node.',
    },
    'rel-top-pre-quantifier-compact': {
      witness: { scope: 'The definition is “for every open cover 𝒰 there exists a finite 𝒰₀ ⊆ 𝒰 with ⋃𝒰₀ = X” — the order of the universal ∀ followed by the existential ∃ is the definition itself; the definition of paracompactness uses the same order with “finite” replaced by “locally finite”.' },
      scope: 'Getting the quantifier order wrong (∃ a finite subfamily ∀ the cover) yields a vacuously true pseudo-condition; this is the first instance of “a condition is a counterexample”.',
    },
    'rel-top-pre-map-homeo': {
      witness: { scope: 'A homeomorphism is defined as “f is a bijection and both f and f⁻¹ are continuous” — the word “continuous” is supplied by top:continuous-map.' },
      scope: 'Remove continuity from the definition of a homeomorphism and (f, f⁻¹) is just a pair of mutually inverse bijections with all topological information lost.',
    },
    'rel-top-pre-space-count': {
      witness: { scope: 'A2 says “there exists a countable base”, A1 says “the neighbourhood system at each point has a countable base”, and the third clause says “there exists a countable dense subset” — bases, neighbourhood systems and dense sets are all internal objects of a topological space.' },
      scope: 'All four countability clauses act on the family of open sets; change the topology and all of them change.',
    },
    'rel-top-pre-space-sep': {
      witness: { scope: 'The definition of T2, “there exist disjoint open neighbourhoods”, uses open sets and neighbourhoods word for word; each grade from T0 to T4 says only what open sets can separate.' },
      scope: 'The separation axioms say how far the family of open sets can separate points (or closed sets); their subject is the topology.',
    },
    'rel-top-pre-space-paracompact': {
      witness: { scope: 'Both “open refinement” and “locally finite (each point has a neighbourhood meeting only finitely many members)” use open sets and neighbourhoods.' },
      scope: 'Paracompactness is a statement about refinements of open covers, and its subject is a topological space.',
    },
    'rel-top-pre-space-sigma': {
      witness: { scope: 'In the definition each K_n is a subset of X and is compact in the **subspace topology** — both “subset of X” and “subspace topology” are given by a topological space.' },
      scope: 'The defining sentence of σ-compactness uses only “subset”, “subspace topology” and “countable union”, and does **not** mention compactness as a whole condition. The compactness half is an implication (see the scaling section below); the two edges share their direction but differ in what they depend on, so both are kept.',
    },
    'rel-top-pre-space-connected': {
      witness: { scope: 'Connectedness is written as “there are no non-empty disjoint open sets U, V with X = U ∪ V”, and the open sets come from the topology; the path-connected clause additionally uses the connectedness of [0, 1], which the same definition supplies.' },
      scope: 'Connectedness is the topological rendering of “the space cannot be cut into two pieces”; its subject is a topological space.',
    },
    'rel-top-compact-seq-generalization': {
      witness: { type: 'proof-dependency', status: 'REF', ref: 'ev-top-compact-seq', scope: 'In a metric space compact ⇔ sequentially compact: both directions are standard arguments (compact + metric ⇒ complete and totally bounded ⇒ sequentially compact; sequentially compact + metric ⇒ compact). This entry is registered as REF, following the standard textbook conclusion.' },
      scope: 'In a metric space the two descriptions coincide; in general they do not — [0, ω₁] with the order topology is compact but not sequentially compact, because a sequence has only countably many terms. This edge also carries the reason why sequential compactness must hang on compactness at all: it is the sequential-side contrast condition.',
    },
    'rel-top-compact-locally-compact-generalization': {
      witness: { type: 'same-carrier-implication', status: 'DEF', scope: 'Every point of a compact space has a compact neighbourhood (take the whole space, or a compact subspace containing the point); this is a direct addition of definitions.' },
      scope: 'Compact ⇒ locally compact; the converse fails (ℝⁿ is locally compact but not compact). The difference from the previous edge matters: this one depends on definitions alone, that one depends on a metric. The definition material of local compactness (the word “compact” in “a compact neighbourhood at every point”) is supplied by the source of this edge as well.',
    },
    'rel-top-compact-sigma-generalization': {
      witness: { type: 'proof-dependency', status: 'PROOF', ref: 'ev-top-sigma-not-compact', scope: 'A compact space is σ-compact by taking K₁ = X (a single countable layer); the evidence also supplies the witness for the converse direction (ℕ with the discrete topology: σ-compact + locally compact but not compact).' },
      scope: 'Compact ⇒ σ-compact; the converse fails, with ℕ under the discrete topology as the witness. This is an **implication**, not definition material — the defining sentence of σ-compactness does not mention compactness (that definitional dependency is top:space → top:sigma-compact).',
    },
    'rel-top-compact-paracompact-generalization': {
      witness: { type: 'proof-dependency', status: 'PROOF', ref: 'ev-top-compact-paracompact', scope: 'A compact Hausdorff space is paracompact: the proof builds a locally finite open refinement from a finite subcover.' },
      scope: 'Compact Hausdorff ⇒ paracompact; the converse fails (ℝⁿ is paracompact but not compact). Neither hypothesis can be dropped: with compactness but without T2 the conclusion fails (see the cofinite topological space), and with T2 but without compactness it fails as well.',
    },
    'rel-top-count-a2-a1-generalization': {
      witness: { type: 'proof-dependency', status: 'PROOF', ref: 'ev-top-a2-a1', scope: 'The statement “second countability ⇒ first countability” contains both clauses A2 and A1, each defined by the countability-axioms node; the proof restricts a countable base to one point to obtain 𝔅_x.' },
      scope: 'A2 ⇒ A1; the converse fails (the Sorgenfrey line is A1 but not A2). This is the **only** implication among the four countability clauses that holds unconditionally.',
    },
    'rel-top-count-a2-separable-generalization': {
      witness: { type: 'proof-dependency', status: 'REF', ref: 'ev-top-a2-separable', scope: 'The statement “second countability ⇒ separability” contains the clauses A2 and separability; the proof chooses one point from each non-empty member of a countable base. This entry is registered as REF, following the standard textbook conclusion.' },
      scope: 'A2 ⇒ separable; the converse fails (the Sorgenfrey line is separable but not A2), and that converse needs a metric (a separable metric space ⇔ A2). This site does not claim to have encoded countable choice as a machine certificate.',
    },
    'rel-top-compact-normal-generalization': {
      witness: { type: 'proof-dependency', status: 'PROOF', ref: 'ev-top-compact-normal', scope: 'The claim is “compact + T2 ⇒ T4”: the first step of the proof uses T2 to find, for each x ∈ A, an open neighbourhood disjoint from B; the second step uses compactness to extract a finite subcover.' },
      scope: 'The first separation consequence of compactness. Note that the step “normal ⇒ T4” needs T2 as well: with compactness but without T2 not even normality holds (the cofinite topological space), and the evidence ev-top-cofinite-t1-not-t2 supplies the witness on that side.',
    },
    'rel-top-compact-paracompact-claim-generalization': {
      witness: { type: 'proof-dependency', status: 'PROOF', ref: 'ev-top-compact-paracompact', scope: 'The claim is “compact + T2 ⇒ paracompact”: the proof builds a locally finite open refinement from a finite subcover.' },
      scope: 'Parallel to the previous edge: compactness on the **refinement** side (the previous one was on the **separation** side). The two claims share their hypotheses and differ in their conclusions; neither replaces the other.',
    },
    'rel-top-pre-space-chart': {
      witness: { scope: 'In a coordinate chart (U, φ) the set U is an **open subset** of M, and φ(U) is an open subset of ℝⁿ.' },
      scope: 'Both openness conditions presuppose a topology; this is also where the counterexample “φ(U) must be required to be open” lands.',
    },
    'rel-top-pre-chart-atlas': {
      witness: { scope: 'An atlas is a collection 𝒜 of coordinate charts, together with the requirements ⋃U = M and pairwise compatibility of the transition maps.' },
      scope: 'Every member of an atlas is a coordinate chart; the domain φ(U∩V) of a transition map is given by the charts as well.',
    },
    'rel-top-pre-space-atlas': {
      witness: { scope: 'In “covers M”, the set M is a topological space and covering is a topological notion.' },
      scope: 'The same family of coordinate charts placed on a different underlying space may cover it or not.',
    },
    'rel-top-pre-chart-manifold': {
      witness: { scope: 'The precise content of the local Euclideanity clause is “every point belongs to the domain of some coordinate chart”.' },
      scope: 'A coordinate chart is the atomic unit of the definition of a manifold: local Euclideanity = every point has a chart.',
    },
    'rel-top-pre-sep-manifold': {
      witness: { scope: 'The second axiom in the definition is “M is a Hausdorff space (T2)”, and T2 is defined by the separation-axioms node.' },
      scope: 'The separation axioms are where this case defines Hausdorff self-containedly; it does not depend on registrations in other cases.',
    },
    'rel-top-pre-count-manifold': {
      witness: { scope: 'The third axiom in the definition is “M is second countable (A2)”, and A2 is defined by the countability-axioms node.' },
      scope: 'Second countability is the last manifold axiom; the long line shows it cannot be dropped (see rel-top-count-longline).',
    },
    'rel-top-pre-atlas-diffmanifold': {
      witness: { scope: 'The C^r condition is imposed on the transition maps of an **atlas**; without an atlas there are no transition maps.' },
      scope: 'A differentiable structure is a condition on the atlas, not a property of the underlying space.',
    },
    'rel-top-space-metric-generalization': {
      witness: { scope: 'The registration “metric space” includes “the topology induced by the metric” as part of its content: an open ball is an open set, and “open set” is checked against the definition of a topological space.' },
      scope: 'Metric and topology are two independent structures: a metric space **produces** a topology, it is not a special case of one. Hence the direction is topological space → metric space (the language of the former is part of the definition of the latter), not the other way round.',
    },
    'rel-top-pre-metric-paracompact': {
      witness: { scope: 'The statement “every metric space is paracompact and normal” has a metric space as its subject.' },
      scope: 'Without the carrier “metric space” this assertion has no object. The metric-space registration of this site has been collapsed by the merge table onto dg:metric-space (which carries the dg, rudin and top cases at once), so both endpoints of this edge share the registration case “top” and the rule “no hard prerequisite between unrelated cases” is not violated.',
    },
    'rel-top-space-metrization-crossdomain': {
      witness: { type: 'cross-domain-interface', status: 'DEF' },
      scope: 'The two registrations cover different layers of the same family of results: the dg and rudin cases use “metric ⇒ first countable, normal”, while this case adds the difference between A2 and A1 (A2 ⇒ A1, not conversely) and the equivalence “separable metric ⇔ A2”, which needs a metric. Both registrations are kept and neither overrides the other. This is the only genuinely cross-case edge of this case (the endpoints of the two edges above share the “top” registration).',
      task: 'The countability interface for metric spaces: handing the implications among A2 / A1 / separability to the other two cases.',
    },
    'rel-top-pre-connected-map': {
      witness: { scope: 'The **statement** of the propagation theorem for connectedness (a continuous image is connected) has two subjects: a connected space and a continuous map; the definition of the latter is supplied by top:continuous-map.' },
      scope: 'This edge is the definition material for “the conclusion about connectedness can only be propagated through continuity”. It does not mean that continuous maps depend on connectedness — that is the other direction.',
    },
    'rel-top-connected-application': {
      witness: { type: 'proof-dependency', status: 'REF', ref: 'ev-top-connected-intermediate', scope: 'The conclusion is “the continuous image of a connected space is connected”, and the word “connected” in the statement is defined by this node; the proof uses “preimages preserve open sets” and the definition of connectedness to deny a separation. This entry is registered as REF, following the standard textbook conclusion.' },
      task: 'The application of connectedness to continuity: the connectedness of continuous images, and the intermediate value theorem. The proof itself is carried by the action contract a-top:claim-connected.',
    },
    'rel-top-sep-cofinite-application': {
      witness: { type: 'application-description', status: 'DEF' },
      task: 'Use the cofinite topology to show that T1 and T2 cannot be interchanged (it is a T1 space that is not T2).',
    },
    'rel-top-compact-cofinite-application': {
      witness: { type: 'proof-dependency', status: 'PROOF', ref: 'ev-top-cofinite-t1-not-t2', scope: 'The statement of the claim contains the four clauses “compact”, “T1”, “not T2” and “not normal”; the proof uses the open-cover form of compactness (the complement of any non-empty open set is finite) and the failure of T2.' },
      task: 'The counterexample side of compactness: the cofinite topological space is compact and T1, yet neither T2 nor normal — it refutes exactly “compact + T1 ⇒ normal”.',
    },
    'rel-top-compact-normal-cofinite-application': {
      witness: { type: 'application-description', status: 'DEF' },
      task: 'The counterexample boundary of “compact Hausdorff ⇒ normal”: the cofinite topological space is compact but **not Hausdorff**, so it lies outside the hypotheses of that theorem; it lets one check whether the reader distinguishes “compact” from “compact + T2”.',
    },
    'rel-top-sep-theory-application': {
      witness: { type: 'application-description', status: 'DEF' },
      task: 'Use the cofinite topology to separate the two axioms “T1 holds” and “T2 fails”, as the smallest instance in the spectrum of separation axioms.',
    },
    'rel-top-count-sorgenfrey-application': {
      witness: { type: 'application-description', status: 'DEF' },
      task: 'Use the Sorgenfrey line to separate the four countability clauses one by one: it satisfies A1 and separability, does not satisfy A2, and is not Lindelöf.',
    },
    'rel-top-paracompact-longline': {
      witness: { type: 'application-description', status: 'REF' },
      task: 'The long line witnesses “locally Euclidean + Hausdorff but not paracompact”, so it also shows that paracompactness is not a consequence of local Euclideanity, and that the existence of partitions of unity depends on global conditions such as second countability.',
    },
    'rel-top-count-longline': {
      witness: { scope: 'The **statement** of the long line contains “not A2, not paracompact” — the clause “A2” is defined by the countability-axioms node.' },
      scope: 'To write down “the long line is not a second-countable space” one first needs the definition of A2. This is the anchor of the clause that excludes it from being a manifold.',
    },
    'rel-top-compact-discrete-application': {
      witness: { type: 'application-description', status: 'DEF' },
      task: 'Use an uncountable discrete space to show that neither paracompactness nor metrisability implies second countability (it is at once a metric space, a paracompact space and a non-A2 space).',
    },
    'rel-top-compact-method-cover': {
      witness: { type: 'application-description', status: 'DEF' },
      task: 'The covering-argument test is the decision procedure for the definition of compactness: write the open cover, try to extract a finite subcover (a locally finite refinement when the space is paracompact), and give a concrete witness when it fails.',
    },
    'rel-top-paracompact-method-local-global': {
      witness: { type: 'application-description', status: 'DEF' },
      task: 'Paracompactness supplies a locally finite refinement, which lets local solutions be glued into a global one (the premise for the existence of partitions of unity); the long line is exactly the space where this method fails.',
    },
    'rel-top-atlas-sphere-application': {
      witness: { type: 'application-description', status: 'DEF' },
      task: 'The two stereographic charts of the sphere are the smallest non-trivial instance of “a cover plus pairwise compatible transitions”: their transition map is the inversion x ↦ x/|x|².',
    },
    'rel-top-atlas-rp1-application': {
      witness: { type: 'application-description', status: 'DEF' },
      task: 'The two affine charts of the projective line are another smallest instance, and they force one to check Hausdorffness under the quotient topology (charts are easy, axioms need a separate proof).',
    },
    'rel-top-pattern-local-euclidean-anchor': {
      witness: { type: 'application-description', status: 'DEF' },
      task: 'The material for the wrong rule “locally like Euclidean space means globally like it”: the sphere and projective space are locally Euclidean but globally not (compactness supplies the tool of refutation).',
    },
    'rel-top-pattern-a1-a2-anchor': {
      witness: { type: 'application-description', status: 'DEF' },
      task: 'The material for the wrong rule “A1 means A2”: the Sorgenfrey line is A1 and separable without being A2.',
    },
    'rel-top-pattern-compact-closed-anchor': {
      witness: { type: 'application-description', status: 'DEF' },
      task: 'The material for the wrong rule “a compact subset is necessarily closed”: in the cofinite topological space a compact subset need not be closed (T2 is missing).',
    },
    'rel-top-pattern-sigma-compact-anchor': {
      witness: { type: 'application-description', status: 'DEF' },
      task: 'The positive counterexample for the wrong rule “σ-compact means compact”: the witness space of that claim is σ-compact and locally compact without being compact.',
    },
  },

  support: {
    'sup-top-a2sep-route': { reason: 'This entry is registered as REF following the standard textbook conclusion; no verifiable route-level input support is registered.' },
    'sup-top-pattern-route': { reason: 'A misconception pattern is a public description; no individual route-level input support is registered for it.' },
  },

  claims: {
    'claim-top-compact-normal': { statement: 'A compact Hausdorff space is normal (T4).' },
    'claim-top-compact-paracompact': { statement: 'A compact Hausdorff space is paracompact.' },
    'claim-top-metric-paracompact': { statement: 'Every metric space is paracompact and normal.' },
    'claim-top-a2-a1': { statement: 'A second-countable space is first countable.' },
    'claim-top-a2-separable': { statement: 'A second-countable space is separable.' },
    'claim-top-sigma-not-compact': { statement: 'There exists a σ-compact, locally compact, Hausdorff space that is not compact (ℕ with the discrete topology).' },
    'claim-top-connected-intermediate': { statement: 'The continuous image of a connected space is connected.' },
  },

  patterns: {
    'top:pattern-local-euclidean': { title: 'Misconception: locally like Euclidean space means globally like it' },
    'top:pattern-a1-a2': { title: 'Misconception: first countable means second countable' },
    'top:pattern-compact-closed': { title: 'Misconception: a compact subset is necessarily closed' },
    'top:pattern-sigma-compact': { title: 'Misconception: σ-compact means compact' },
  },

  aggregates: {
    'agg-top-foundation': {
      title: 'Point-set topology: spaces, countability and separation',
      note: 'The topic blocks are organised as “first a space, then the question of how much information it can distinguish”; blocks may overlap, and membership is not to be read as a chain of requirements.',
    },
    'agg-top-compactness': {
      title: 'Point-set topology: compactness and connectedness',
      note: 'The four concepts of the compactness family and the seven assertions form separate blocks: the concept block answers “what it is”, the assertion block answers “what it implies”.',
    },
    'agg-top-manifold': {
      title: 'Point-set topology: manifolds and atlases',
      note: 'The manifold entries and the two concrete atlas examples form separate blocks; the example block shows that the definition is not empty.',
    },
    'agg-top-counterexample': {
      title: 'Point-set topology: counterexamples and misconceptions',
      note: 'The counterexample block and the misconception block come in pairs: every wrong rule can point to a concrete space.',
    },
    'agg-top-method': {
      title: 'Point-set topology: methods',
      note: 'Methods form a block of their own: they are “how to compute”, not members of the same kind as the concept blocks.',
    },
  },
};
