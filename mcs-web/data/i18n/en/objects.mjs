/**
 * 英文覆盖：**站点级登记表**（不属于任何单一案例的六节）。
 *
 * 这些小节与节点/行动的差别在于「它们描述的是站点自己」，不是某个数学对象：
 *
 * | 节 | 是什么 | 为什么值得翻 |
 * |---|---|---|
 * | `patterns` | 误区模式（11 条） | 学习者最容易踩的坑，英文站上必须可读 |
 * | `claims` | 形式陈述登记（45 条） | 研究台的「重要节点的形式表达」 |
 * | `support` | 支持族记录（43 条） | 「这个结论靠哪些资源撑着」 |
 * | `aggregates` | 话题聚合（13 条） | 知识网络里的分片名称与说明 |
 * | `templates` | 十三种角色模板 | 每个节点的「该有哪些字段」的说明 |
 * | `coverage` | 专稿章节 → 实现入口的覆盖表（23 条） | 网站维护页的核心内容 |
 *
 * 键是中文源的 id；数组按序对齐、长度必须相同（装配层会逐条核对）。
 * 空对象表示「这一块还没翻」，装配层保留中文并在覆盖率里记为缺口。
 *
 * ## 覆盖率的两处**如实天花板**（不是漏译，写在这里免得后来者当成缺口去追）
 *
 * - `claims`：45 条里 `claim-limit-eval-constant` 的陈述是纯记号（`(λn.a)(n)=a`），
 *   没有一句中文可译；因此这一节的上限是 **44/45**。
 * - `support`：43 条里只有 7 条带 `reason`（把「无需证明 / 未知不等于空支持」这类
 *   判断写出来）；其余 36 条的字段全是 id、状态与英文标识符，**没有任何中文**，
 *   上限是 **7/43**。把它们补成空对象只会把覆盖率做成好看的数字，那是自欺。
 *
 * ## `templates` 与 `coverage` 的键不是 `id`
 *
 * `templates` 的键是 `role`（`'Concept'`…），`coverage` 的键是 `chapter`（`'01'`…`'D.1'`），
 * 两者在中文源里都没有 `id` 字段。装配层、覆盖率与 parity 统一用
 * `data/i18n/overlay.mjs` 导出的 `keyOf(section, item)` 取键（这张表只有一处），
 * 所以下面两节直接按角色名 / 章号作键。写入对齐细节：
 * `coverage` 的 `definitions[]` / `implementation[]` / `tests[]` 里有非中文项
 * （`LC01–LC36`、`shared/types.d.ts`、`core/support.mjs：…`），它们必须**逐位保留**
 * 才能保证数组等长，这里只把全角冒号改成 `: `。
 */

/** 13 份角色模板共用的 12 个栏目（中文源逐字相同）。 */
const SHARED_FIELDS = [
  'Identity and role',
  'Problem motivation',
  'Intuition and representation',
  'Formal payload',
  'Conceptual support',
  'Public inputs and outputs',
  'Examples and boundary',
  'General misconception patterns',
  'Self-check tasks',
  'Application and transfer',
  'Optional structural routes',
  'Provenance and evidence status',
];

/** 13 份角色模板共用的说明。 */
const TEMPLATE_NOTE = 'Unknown fields stay Unknown; a blank does not mean that the matter has been settled, and teaching effects are evaluated separately by the external model.';

const template = (specificFields) => ({ sharedFields: [...SHARED_FIELDS], specificFields, note: TEMPLATE_NOTE });

export default {
  patterns: {
    'limit:pattern-never-equal': { title: 'Every term of a convergent sequence differs from the limit' },
    'manifold:pattern-one-direction': { title: 'Checking only one transition direction' },
    'tensor:pattern-index-array': { title: 'Every array of indices is a tensor' },
    'group:pattern-all-commutative': { title: 'Every group is abelian' },
    'dg:pattern-manifold-is-surface': { title: 'Identifying a smooth manifold with a surface embedded in R^N' },
    'dg:pattern-global-coordinates': { title: 'Believing that every point of a manifold can be labelled by a unique coordinate' },
    'dg:pattern-derivation-ignores-leibniz': { title: 'Omitting the Leibniz rule when defining a derivation' },
    'dg:pattern-closed-implies-exact': { title: 'Treating every closed form as exact' },
    'liang:pattern-curvature-needs-embedding': { title: 'Believing that curvature is visible only through an external embedding' },
    'liang:pattern-christoffel-is-tensor': { title: 'Treating the Christoffel symbols as a tensor' },
    'liang:pattern-redshift-is-doppler': { title: 'Reading cosmological redshift directly as a Doppler effect' },
  },

  claims: {
    'claim-limit-bridge': { statement: 'Under the accumulation-point condition, the ε–δ limit and the sequential limit are equivalent.' },
    'claim-limit-bridge-cont': { statement: 'When a is an accumulation point and a∈D, continuity is equivalent to the limit value being f(a).' },
    'claim-limit-never-equal': { statement: 'There is a convergent sequence that attains its limit.' },
    'claim-manifold-max': { statement: 'A_max is a C^k atlas and is maximal under inclusion.' },
    'claim-manifold-generalization': { statement: 'Under the same atlas encoding, C^∞ transitions imply C^k transitions.' },
    'claim-manifold-transition-eval': { statement: 'Under the right-inverse assumption, a same-chart transition at a given point maps that point to itself.' },
    'claim-tensor-basis-law': { statement: 'Tensor components change basis according to their upper and lower indices.' },
    'claim-tensor-end-iso': { statement: 'In finite dimension, V⊗V* is isomorphic to End(V).' },
    'claim-tensor-rank1': { statement: 'A rank-one map preserves addition under the declared conditions.' },
    'claim-group-cayley': { statement: 'Every group is isomorphic to a subgroup of the permutation group of its underlying set.' },
    'claim-group-injective': { statement: 'L_g=L_h ⇒ g=h (using the right identity only).' },
    'claim-dg-tangent-equivalence': { statement: 'The curve definition and the derivation definition give naturally isomorphic tangent spaces.' },
    'claim-dg-d-squared-zero': { statement: 'For every differential form ω, d(dω)=0.' },
    'claim-dg-stokes': { statement: 'On an oriented smooth manifold with boundary, ∫_M dω = ∫_{∂M} ω.' },
    'claim-dg-poincare': { statement: 'Every closed form on a contractible open set is exact.' },
    'claim-liang-stokes-theorem': { statement: '∫_M dω = ∫_{∂M} ω, where M is an oriented n-dimensional manifold with boundary, ω is a compactly supported (n−1)-form, and ∂M carries the induced orientation' },
    'claim-liang-gauss-theorem': { statement: 'The Hodge dual * maps p-forms linearly isomorphically onto (n−p)-forms, *(dx^{i₁}∧…∧dx^{i_p}) = (√|g|/(n−p)!) ε_{i₁…i_p j₁…j_{n−p}} dx^{j₁}∧…; Gauss’ theorem is Stokes’ theorem applied to the dual form' },
    'claim-liang-tidal-deviation': { statement: 'u^b∇_b(u^c∇_c ξ^a) = −R^a{}_{cbd}u^c u^d ξ^b, that is, the relative acceleration of neighbouring geodesics is given by the Riemann tensor' },
    'claim-liang-einstein-equation': { statement: 'G_{ab} + Λ g_{ab} = 8π T_{ab} (in geometric units c = G = 1)' },
    'claim-liang-linearized-gravity': { statement: 'Writing g_{ab} = η_{ab} + h_{ab} with |h| ≪ 1 and imposing the harmonic gauge gives □h̄_{ab} = −16π T_{ab}; in the static weak-field slow-motion limit this reduces to ∇²Φ = 4πρ, while the propagating solutions give gravitational waves travelling at the speed of light' },
    'claim-liang-schwarzschild-solution': { statement: 'ds² = −(1 − r_s/r)dt² + (1 − r_s/r)⁻¹dr² + r²dΩ² with r_s = 2GM; it satisfies R_{ab} = 0 for r > r_s' },
    'claim-liang-birkhoff-theorem': { statement: 'A spherically symmetric vacuum solution must be the Schwarzschild solution (in the sense of its maximal extension); a spherically symmetric vacuum region does not radiate gravitational waves because of stellar pulsation' },
    'claim-liang-reissner-nordstrom': { statement: 'ds² = −(1 − r_s/r + Q²/r²)dt² + (1 − r_s/r + Q²/r²)⁻¹dr² + r²dΩ², which together with F_{ab} = (Q/r²)(dt)_a∧(dr)_b satisfies the Einstein–Maxwell equations' },
    'claim-liang-classical-tests': { statement: 'Gravitational redshift 1 + z = (1 − r_s/r)^{−1/2}; the extra perihelion precession of Mercury is 6πGM/(a(1−e²)) per orbit; the deflection of light is Δφ = 4GM/b' },
    'claim-liang-stellar-interior': { statement: 'The TOV equation dp/dr = −(ρ + p)(m + 4πr³p)/(r(r − 2m)) with dm/dr = 4πr²ρ; at r = R one has p(R) = 0, and the solution joins the Schwarzschild solution' },
    'claim-liang-schwarzschild-black-hole': { statement: 'After a spherically symmetric star has collapsed inside r_s, its exterior vacuum region is still the Schwarzschild solution by Birkhoff’s theorem; the surface r = r_s becomes the event horizon, and the interior matter reaches r = 0 within finite proper time' },
    'claim-liang-rw-metric': { statement: 'ds² = −dt² + a²(t)[dr²/(1 − kr²) + r²dΩ²] with k ∈ {−1, 0, +1}; the spatial sections are maximally symmetric' },
    'claim-liang-hubble-redshift': { statement: '1 + z = a(t_observed)/a(t_emitted); at low redshift z ≈ H₀d, which is Hubble’s law' },
    'claim-liang-scale-factor': { statement: '(ȧ/a)² = 8πρ/3 − k/a² + Λ/3 and ä/a = −4π(ρ + 3p)/3 + Λ/3, together with ρ̇ + 3(ȧ/a)(ρ + p) = 0' },
    'claim-liang-inflation': { statement: 'If an accelerating phase of expansion (ä > 0) existed in the very early universe, the conformal time ∫dt/a is stretched substantially, which alleviates both the horizon (causality) problem and the flatness problem' },
    'claim-liang-new-standard-cosmology': { statement: 'ΛCDM: Λ (or dark energy with an equation of state w ≈ −1) together with cold dark matter fits the present accelerated expansion, and Ω_Λ + Ω_m + Ω_k ≈ 1' },
    'claim-rudin-least-upper-bound': { statement: 'There is an ordered field R that satisfies the field axioms and the order axioms and has the least-upper-bound property; every non-empty subset of R that is bounded above has a supremum in R' },
    'claim-rudin-bolzano-weierstrass': { statement: 'Every bounded infinite set of points in R^k has a limit point; equivalently, every bounded sequence has a convergent subsequence' },
    'claim-rudin-mean-value-theorem': { statement: 'If f is continuous on [a,b] and differentiable on (a,b), then there is x ∈ (a,b) with f(b) − f(a) = f′(x)(b − a); the generalized mean value theorem gives the analogous conclusion for a quotient of two functions' },
    'claim-rudin-lhospital-rule': { statement: 'For an indeterminate form of type 0/0 or ∞/∞, if the limit of f′/g′ exists (including ±∞) then the limit of f/g is the same; one requires g′ ≠ 0 and a non-vanishing denominator' },
    'claim-rudin-taylor-theorem': { statement: 'If f has n continuous derivatives on [a,b] and an (n+1)-st derivative on (a,b), then f(β) = P(β) + a remainder, where the remainder can be written as f^{(n+1)}(x)(β−a)^{n+1}/(n+1)! or in integral form' },
    'claim-rudin-fundamental-theorem': { statement: 'If f ∈ R(α) then F(x) = ∫_a^x f dα is continuous; if α is differentiable at x_0 and f is continuous at x_0 then F′(x_0) = f(x_0)α′(x_0); if f is differentiable and f′ is integrable then ∫_a^b f′ dx = f(b) − f(a)' },
    'claim-rudin-stone-weierstrass': { statement: 'A polynomial-type algebra A on a compact metric space that separates points and contains no zero function is uniformly dense in C(X); in particular, every real continuous function on [a,b] can be uniformly approximated by polynomials' },
    'claim-rudin-algebraic-completeness': { statement: 'Every non-constant polynomial with complex coefficients has a root in C (the fundamental theorem of algebra)' },
    'claim-rudin-contraction-principle': { statement: 'If on a complete metric space X a map φ: X → X satisfies d(φ(x),φ(y)) ≤ c d(x,y) with 0 ≤ c < 1, then φ has a unique fixed point' },
    'claim-rudin-inverse-function-theorem': { statement: 'If f is continuously differentiable on an open set E and f′(a) is invertible, then a has a neighbourhood U on which f is injective and f(U) is open, and the inverse function is differentiable at f(a) with (f^{-1})′(f(a)) = [f′(a)]^{-1}' },
    'claim-rudin-implicit-function-theorem': { statement: 'If F(x,y) = 0, F(a,b) = 0 and (∂F/∂y)(a,b) is invertible, then there is a unique locally defined g with F(x,g(x)) = 0, and g′(a) is given by the partial derivatives of F' },
    'claim-rudin-rank-theorem': { statement: 'If f has constant rank r near a, then there are local coordinates in which f equals the projection (x_1,…,x_n) ↦ (x_1,…,x_r,0,…,0)' },
    'claim-rudin-stokes-theorem': { statement: 'A k-chain Γ and a (k−1)-form ω satisfy ∫_Γ dω = ∫_{∂Γ} ω (when the coefficients of ω are continuously differentiable and Γ is C²)' },
  },

  support: {
    'sup-limit-ed-proof': { reason: 'A definition node has no proof obligation; Unknown is kept here so that “no proof needed” is not written as empty support.' },
    'sup-limit-method-route': { reason: 'The presentation of a method certifies the interface only; no route-level input support is registered.' },
    'sup-manifold-pattern-route': { reason: 'A misconception pattern is a public description; no individual route-level input support is registered for it.' },
    'sup-group-pattern-route': { reason: 'A misconception pattern does not register individual route-level input support.' },
    'sup-dg-partition-route': { reason: 'The source notes do not register route-level input support; unknown is not the same as empty support.' },
    'sup-liang-np-route': { reason: 'The textbook marks §8.5–§8.10 as optional reading, and no route-level input support is registered; unknown is not the same as empty support.' },
    'sup-rudin-rank-route': { reason: 'Route-level input support for the rank theorem has not been registered yet; unknown is not the same as empty support.' },
  },

  aggregates: {
    'agg-limit': {
      title: 'Limits and Continuity',
      note: 'Topic blocks may overlap, and membership is not to be read as a chain of requirements; method nodes form a block of their own.',
    },
    'agg-manifold': {
      title: 'C^k and Smooth Manifolds',
      note: 'Topic blocks keep overlapping members and provenance; method nodes form a block of their own.',
    },
    'agg-tensor': {
      title: 'Tensors, coordinate changes and tensor fields',
      note: 'Topic blocks may overlap; method nodes form a block of their own.',
    },
    'agg-group': {
      title: 'Groups: the meeting of geometry, permutations and modular multiplication',
      note: 'The three entries share the goal Group; commutativity is explicitly excluded. Method nodes form a block of their own.',
    },
    'agg-dg': {
      title: 'Differential Geometry: machinery and tangent spaces',
      note: 'Topic blocks are grouped as in the source notes; blocks may overlap, and membership is not to be read as a chain of requirements.',
    },
    'agg-liang-volume-1': {
      title: 'Liang & Zhou, *Introduction to Differential Geometry and General Relativity*, Volume One — condensed path',
      note: 'Blocks are divided by the ten chapters of the textbook; cross-chapter dependencies are expressed by action contracts, and the membership of a block does not itself form a chain of requirements.',
    },
    'agg-rudin-pma': {
      title: 'Rudin, *Principles of Mathematical Analysis*, third edition — condensed path',
      note: 'Blocks are divided by the eleven chapters of the textbook; cross-chapter dependencies are expressed by action contracts, and the membership of a block does not itself form a chain of requirements.',
    },
    'agg-analysis': {
      title: 'Analysis',
      note: 'Subject aggregates may overlap and may contain members from different cases.',
    },
    'agg-algebra': {
      title: 'Algebra',
      note: 'A subject aggregate does not read membership as a chain of requirements.',
    },
    'agg-geometry': {
      title: 'Geometry and topology',
      note: 'The geometry aggregate keeps the cross-domain interfaces.',
    },
    'agg-topology': {
      title: 'Topology',
      note: 'The prerequisite layer for point-set topology and manifolds; overlapping members with the geometry aggregate are allowed.',
    },
    'agg-relativity': {
      title: 'Relativity and cosmology',
      note: 'A physics branch introduced by the textbook case; overlapping members with the geometry and topology aggregates are allowed.',
    },
    'agg-measure': {
      title: 'Measure theory',
      note: 'A branch introduced by Chapter 11 of the Rudin case; overlapping members with the “Analysis” aggregate are allowed.',
    },
  },

  /* 键是角色名（`role`），不是 id：全体角色共用 12 个栏目。 */
  templates: {
    Concept: template('Objects and boundary, equivalence and discrimination, cognitive entry points, structural connections, dimensions of self-check.'),
    Definition: template('New symbols, the body of the definition, legitimacy, conservativeness, explanation and exercises.'),
    Axiom: template('The theory it belongs to, exact formulas, membership witnesses, boundaries of independence and consistency.'),
    Theorem: template('Hypotheses, conclusion, proof or cited evidence, counterexample per condition, range of applicability.'),
    Property: template('Use, evidence status, conditions and the boundary where it fails.'),
    Proof: template('The target claim, the finite certificate code, the check status and the open assumptions.'),
    Example: template('Concept references, object specification, satisfaction assertion and the mode of verification.'),
    Counterexample: template('The exact target, object specification, failure witness and the scope of the negation.'),
    Problem: template('Inputs and outputs, goal specification, constraints and the source of the solution.'),
    Theory: template('Language, calculus, axiom presentation or module references, consistency boundary.'),
    Construction: template('Inputs and outputs, finite steps, verification target and termination.'),
    GlobalMethod: template('Global scope, task interface, heuristics, public examples and the scope of failure.'),
    LocalMethod: template('Local scope of application, task interface, heuristics and the scope of failure.'),
  },

  /* 键是专稿章号（`chapter`）。`status` 是受控值，不翻译。 */
  coverage: {
    '01': {
      module: 'Metatheory and the constructible universe',
      definitions: ['Definition 1.9', 'Cited fact 1.10', 'Counterexample 1.11', 'Boundary statement 1.12', 'Proposition 1.13'],
      implementation: ['the theory and environmentBoundary of data/manifest.mjs'],
      tests: ['tests/core.test.mjs: ontology legality check'],
      boundary: 'This site does not formalise ZFC metatheory and does not assume V=L; it registers only the metatheoretic conventions and boundaries that it uses.',
    },
    '02': {
      module: 'Object language, types and calculus',
      definitions: ['Definitions 2.1–2.7', 'Propositions 2.8–2.9', 'Definitions 2.10–2.13', 'Proposition 2.14'],
      implementation: ['the finite type and λ-term checks of core/typecheck.mjs', 'the ND whitelist subset of mcs-foundations/validation/certification/kernel.py'],
      tests: ['tests/core.test.mjs: type parsing and application checks', 'doctor.mjs: replay of the four local certificates'],
      boundary: 'A full HOL checker is not implemented; disjunction, classical proof by contradiction and general derivation rules remain unsupported, and the checker itself has not been formally verified.',
    },
    '03': {
      module: 'Henkin semantics and standard semantics',
      definitions: ['Definition 3.6', 'Propositions 3.5, 3.7–3.9', 'Corollaries 3.10–3.11', 'Proposition 3.13', 'Example 3.17'],
      implementation: ['the theory records and evidence labels in the ontology', 'the semantic-boundary entries on the research page'],
      tests: ['no automatic semantic tests; cited monograph proofs and finite model reports'],
      boundary: 'No model checker is provided, and satisfaction or standard validity is not decided automatically; cited conclusions keep the REF label and their conditions of applicability.',
    },
    '04': {
      module: 'Node generation, payload and stable identity',
      definitions: ['Definitions 4.1–4.4', 'Proposition 4.5', 'Definitions 4.6, 4.8, 4.10', 'Proposition 4.11'],
      implementation: ['core/ontology.mjs: twelve coordinates, version hash, reference-closure check', 'core/formation.mjs: formation checks for the fourteen constructs', 'core/typecheck.mjs: finite type expressions'],
      tests: ['tests/core.test.mjs: construct types, role restrictions, unknown as a non-empty set, functionality of identity'],
      boundary: 'Bounded candidate generation covers only the registered data and the test fixtures, and does not claim to enumerate all mathematical objects; node identity is not logical equivalence.',
    },
    '05': {
      module: 'Concept functions and support families',
      definitions: ['Definitions 5.9–5.12', 'Proposition 5.15'],
      implementation: ['core/support.mjs: querySupport / supportIntersection / supportDifference', 'the support records of data/manifest.mjs'],
      tests: ['tests/core.test.mjs: Known(A), Unknown, no mixing of partial bounds; display of minimal support'],
      boundary: 'Support records do not automatically have global minimality or necessity; the existence of minimal support in general is undecided.',
    },
    '06': {
      module: 'Hard relations, action contracts and prerequisites',
      definitions: ['Definition 6.2', 'Propositions 6.3–6.4', 'Definitions 6.5–6.6, 6.13–6.15', 'Theorem 6.19'],
      implementation: ['core/relations.mjs: relation operations and inclusion-witness checks', 'core/planner.mjs: AND inputs, OR outputs, event provenance and common preconditions', 'the actions and relations of data/cases/*.mjs'],
      tests: ['tests/planner.test.mjs: joint preconditions, alternative routes, cycles formed by merging, shared outputs, hidden preconditions'],
      boundary: 'Hard prerequisites are reported only for the declared route family; without a proof of enumerative completeness this is a revisable search conclusion with a stated scope.',
    },
    '07': {
      module: 'Soft relations and the external cognitive model',
      definitions: ['Definitions 7.1–7.9', 'Definitions 7.11–7.14', 'Contract 7.15', 'Propositions 7.16–7.19', 'Definition 7.20'],
      implementation: ['core/adaptation.mjs: Adapt(E,s,g,b), the default human-confirmation model, competence anchoring and misconception instances', 'the explicit parameter entries of LC19–LC24'],
      tests: ['tests/planner.test.mjs: cold start and unspecified states', 'tests/api.test.mjs: learning events, confirmations and retractions'],
      boundary: 'The default external model is an explicit interpretation of human confirmations and observations, not an empirically calibrated cognitive model; it does not predict success rates of learning.',
    },
    '08': {
      module: 'Relation algebra, generation and structure preservation',
      definitions: ['Definitions 8.1–8.6', 'Definitions 8.7–8.9', 'Definitions 8.11–8.15', 'Definitions 8.18, 8.20, 8.22', 'Propositions 8.19, 8.21, 8.23–8.24'],
      implementation: ['core/relations.mjs: composition, inverse, restriction, closure, subrelation witnesses, Horn reachability', 'the institution and MCS morphism records on the research page'],
      tests: ['tests/core.test.mjs: relation operations and inclusion witnesses'],
      boundary: 'General institution morphisms, model gluing and conservativeness are not decided automatically; only the registered witnesses and obligations are displayed.',
    },
    '09': {
      module: 'Topics, domains, disciplines and the metatheoretic hierarchy',
      definitions: ['the definitions of Chapter 09'],
      implementation: ['the aggregates of data/manifest.mjs', 'LC31–LC33 of core/localization.mjs', 'data/granularity.mjs: the criteria for units and topics, with the item-by-item decision table', 'data/fields.mjs: the controlled vocabulary of disciplines (essential domains)'],
      tests: ['tests/localization.test.mjs: topic aggregation and level projection', 'tests/granularity-fields.mjs: completeness of granularity and the 12 disciplines', 'tests/thread-layer.test.mjs: the thread layer does not take part in prerequisite computation'],
      boundary: 'Aggregates may overlap; having a connection is not interpreted as the whole topic being required, and level projection does not claim to be exhaustive. “Does not take part in prerequisite computation” for topic-level entries is at present how the network view and the planning page read them, not a constraint inside the planning algorithm.',
    },
    '10': {
      module: 'Human-friendly node templates and presentation roles',
      definitions: ['Definition 10.1', 'Definitions 10.2–10.15'],
      implementation: ['the templates of data/manifest.mjs (thirteen roles)', 'data/cases/*.md (the natural-language teaching text)', 'the separation of construct and role in core/formation.mjs'],
      tests: ['doctor.mjs: all thirteen role templates present', 'tests/core.test.mjs: restrictions on the Claim role'],
      boundary: 'Complete template fields do not mean that the teaching effect has been verified; individual input and diagnosis stay in the external model.',
    },
    '11': {
      module: 'The 36 localization schemes',
      definitions: ['Definitions 11.1–11.5, 11.9, 11.11', 'LC01–LC36', 'Propositions 11.6, 11.8, 11.10, 11.12'],
      implementation: ['core/localization.mjs: the 36 handlers', 'data/localizations.mjs: registration of definitions, inputs, preservation, boundary and computability'],
      tests: ['tests/localization.test.mjs: the 36 registrations, valid inputs and missing conditions', 'the browser research page: operator list and run entry'],
      boundary: 'Many operators return unsupported/unknown when individual state, model evidence or finer registration is missing; having a definition is not the same as being decidable.',
    },
    '12': {
      module: 'View transformation and event-partial-order planning',
      definitions: ['Definitions 12.1–12.3, 12.5, 12.8, 12.9, 12.11', 'Algorithm 12.12', 'Theorem 12.13', 'Proposition 12.14', 'Definition 12.15'],
      implementation: ['core/planner.mjs: the bounded reference algorithm, the four states, the Pareto display subfamily, review events'],
      tests: ['tests/planner.test.mjs: about 20 groups of semantic and counterexample tests'],
      boundary: 'No industrial-scale performance or global optimality is promised; Pareto keeps a display subfamily only; structural feasibility does not mean that real learning is effective.',
    },
    '13': {
      module: 'The end-to-end cases',
      definitions: ['Cases 01–04'],
      implementation: ['the four data sets limit, manifold, tensor and group under data/cases, with their teaching text'],
      tests: ['doctor.mjs: evidence and action reference checks for the four cases', 'tests/browser.mjs: the four case pages can be entered'],
      boundary: 'The four cases cover only the mathematical fragments selected by the monograph; the machine formalisation of the complete bridge is still missing.',
    },
    '14': {
      module: 'Counterexample and boundary audit',
      definitions: ['14.1–14.14'],
      implementation: ['the counterexample nodes, pattern nodes and per-condition counterexamples of the individual cases', 'LC36 unknown boundary'],
      tests: ['tests/core.test.mjs: Unknown as a non-empty set, and over-generalisation checks'],
      boundary: 'The counterexample collection does not exhaust all marginal cases; when a condition is redundant or its necessity is unknown, the “to be checked” label is kept.',
    },
    '15': {
      module: 'Verification, completion status and proof obligations',
      definitions: ['the evidence-status table', 'the acceptance entries 15.2–15.8'],
      implementation: ['scripts/doctor.mjs: data, evidence, certificate and coverage checks', 'server/api.mjs: /api/v2/evidence/replay', 'data/relation-coverage.mjs: classification of nodes without relations and the to-do list', 'VALIDATION.md: the acceptance record'],
      tests: ['npm run check and npm test', 'tests/relation-coverage.test.mjs: classification of nodes without relations'],
      boundary: 'Implementation checks, finite replays and general mathematical proofs are kept apart; no machine metatheoretic proof of the checker and no verification of teaching benefits is claimed.',
    },
    '16': {
      module: 'Boundaries and further research',
      definitions: ['16.1–16.7'],
      implementation: ['the open-problem list on the research page'],
      tests: ['no automatic tests'],
      boundary: 'Machine formalisation, the usability of conceptual support, the identification of cognitive models, infinite planning, translation gluing and content expansion remain open problems.',
    },
    D: {
      module: 'Cross-chapter interface contracts',
      definitions: ['D.1–D.6'],
      implementation: ['the /api/v2 of server/api.mjs', 'the runtime validation of shared/contracts.mjs', 'the M/E/D layering and the version hash'],
      tests: ['tests/api.test.mjs: version conflicts, event deduplication, non-interference hash', 'tests/browser.mjs: profile switching and restore after a restart'],
      boundary: 'Interface obligations are honoured only where the corresponding implementation check exists; an interface name by itself produces no theorem.',
    },
    E: {
      module: 'Core axioms and verification conditions',
      definitions: ['E.1–E.5'],
      implementation: ['the eight legality-condition checks of core/formation.mjs'],
      tests: ['doctor.mjs: report on the ontology legality conditions'],
      boundary: 'The core axioms have not been encoded in full HOL with a proof of the model obligations; this site checks only the registered structure and references.',
    },
    A: {
      module: 'Index of definitions, theorems and counterexamples',
      definitions: ['the index of Appendix A'],
      implementation: ['the index of nodes, claims, evidence and obligations on the research page'],
      tests: ['doctor.mjs: closure of the claim and evidence references'],
      boundary: 'The index covers the objects registered on this site and is not the same as a machine encoding of all the definitions and theorems of the monograph.',
    },
    B: {
      module: 'Bibliography evidence table and citation boundaries',
      definitions: ['B.1–B.7'],
      implementation: ['the reference evidence records of data/cases/*.mjs', 'node provenance'],
      tests: ['doctor.mjs: existence checks for citation records'],
      boundary: 'Not every reference has been checked page by page; an accurate page number does not by itself prove that the citation applies.',
    },
    C: {
      module: 'Notation, types and direction',
      definitions: ['C.1–C.4'],
      implementation: ['shared/types.d.ts', 'the signature of data/manifest.mjs', 'the notation table on the research page'],
      tests: ['tests/core.test.mjs: type parsing'],
      boundary: 'The notation table covers only the fragment used on this site; it does not replace the complete index of the monograph.',
    },
    'D.5': {
      module: 'Optional DeepTutor tutoring',
      definitions: ['the separation of duties between Adapt and Loc', 'external events and version constraints'],
      implementation: ['server/tutor.mjs: health check, context packing, session and event adaptation', 'the verified WS transport shape of mcs-bridge/deeptutor.mjs'],
      tests: ['tests/tutor.test.mjs: disconnection paths, context boundaries, event deduplication'],
      boundary: 'If the real model integration has not been run in this round, it must be shown as not verified; tutoring feedback does not modify M and does not automatically confirm mastery.',
    },
    'D.1': {
      module: 'Personal database, backup and restore',
      definitions: ['the state and observation interfaces of the external model E'],
      implementation: ['server/db.mjs: SQLite transactions, event deduplication, revision numbers', 'scripts/backup.ps1 and restore.ps1'],
      tests: ['tests/api.test.mjs: profile CRUD, event conflicts, import and export', 'doctor.mjs: the database opens and reports its schema version'],
      boundary: 'Local, single-user, multiple profiles; no multi-tenant permission system and no cloud sync are provided.',
    },
  },
};
