/**
 * 英文覆盖：案例 07「数学分析原理（Rudin）」的**全部 57 个节点** + 已登记的证据与行动。
 *
 * 这个案例的 57 个节点**全部** `contentRef: false`（正文尚未撰写，见 README
 * 「Rudin 那套：只有名字，没有正文」），因此这里没有正文译块；覆盖的是节点元数据
 * （标题、摘要、谓词、边界、回看问题、出处说明）与证据记录里的说明。
 *
 * ## 三条模板文字（中文源在多数节点上逐字相同）
 *
 * 中文源里 `formal.boundary[0]`、`provenance.note`、`formal.formationWitness` 在
 * 53 / 55 / 40 个节点上逐字重复。这里把它们写成常量，理由不是省字，而是**一致**：
 * 57 条各写各的，迟早出现「有的说正文未撰写、有的读起来像已核对」。
 *
 * ## 两条可推导的不变式（已逐条验证）
 *
 * - 40 个「定义型」节点：`formal.predicate` **恰好**是 `summary` 去掉句末的 `。`；
 * - 13 个「定理型」节点：`formal.formula` **恰好**是 `summary` 去掉句末的 `。`。
 *
 * 因此下面用 `definition()` / `theorem()` 从**同一句英文**生成两处，杜绝
 * 「摘要与谓词各译一遍、两处不一致」这类最难查的错位。数学记号（`⇒ ≤ ≠ ⊂ ⇔ ε δ →`）
 * 在句中逐字保留。
 */

/** 中文源：`formal.formationWitness`（40 个定义型节点逐字相同）。 */
const WITNESS = 'Parameters and predicate are closed under their declared types.';
/** 中文源：`formal.boundary[0]`（55 个节点逐字相同；两个方法节点另有边界）。 */
const UNWRITTEN = 'Body text not yet written: this node currently registers only the title, its section and its dependencies; the condition boundary and the counterexample for each condition are to be checked against the corresponding textbook section when the body text is written.';
/** 中文源：`provenance.note`（普通节点）。 */
const NOTE = 'This round registers only the position of the node and its dependencies; the body text has not been written (contentRef: false), and the wording of the corresponding textbook section has not been checked item by item.';
/** 中文源：`provenance.note`（两个方法节点多出的一句）。 */
const NOTE_METHOD = `${NOTE} The method is distilled from a recurring argument in the corresponding chapters of the textbook; the textbook does not list an entry of the same name.`;

const definitionReview = (title) => `In the definition of ${title}, which condition can be dropped without losing the main conclusion?`;
const theoremReview = (title) => `Dropping which hypothesis of ${title} makes the conclusion fail?`;

/** 定义型节点：`predicate` 与 `summary` 由同一句英文生成（见文件头的不变式）。 */
const definition = (title, statement, objectType, extra = {}) => ({
  title,
  summary: `${statement}.`,
  formal: { objectType, predicate: statement, formationWitness: WITNESS, boundary: [UNWRITTEN] },
  teaching: { reviewQuestions: [definitionReview(title)] },
  provenance: { note: NOTE },
  ...extra,
});

/** 定理型节点：`formula` 与 `summary` 由同一句英文生成。 */
const theorem = (title, statement, extra = {}) => ({
  title,
  summary: `${statement}.`,
  formal: { formula: statement, boundary: [UNWRITTEN] },
  teaching: { reviewQuestions: [theoremReview(title)] },
  provenance: { note: NOTE },
  ...extra,
});

/**
 * 本文件早先已完成的两条：**标题与摘要逐字保留**（不重写已有译文），
 * 按同一条不变式补出 `predicate`（= 摘要去掉句末的 `.`）与其余字段。
 */
const completed = (title, summary, objectType) => ({
  title,
  summary,
  formal: { objectType, predicate: summary.replace(/\.$/, ''), formationWitness: WITNESS, boundary: [UNWRITTEN] },
  teaching: { reviewQuestions: [definitionReview(title)] },
  provenance: { note: NOTE },
});

export default {
  nodes: {
    /* —— 早先完成的两条（补齐其余字段，标题与摘要未改） —— */
    'rudin:limit-superior': completed(
      'Limit superior and limit inferior',
      'The two limits of a real sequence: lim sup p_n = lim_{n→∞} (sup_{k≥n} p_k), and lim inf likewise with infimum on both sides; when the two agree (with the ±∞ conventions) the sequence converges to that value.',
      'the two kinds of limit of a real sequence',
    ),
    'rudin:function-limit': completed(
      'Limit of a function',
      'f(x) → A as x → p means: for every ε > 0 there is δ > 0 such that 0 < d_X(x,p) < δ implies d_Y(f(x),A) < ε; p must be a limit point of the domain.',
      'the limit of a function at a point',
    ),

    /* —— 第 1 章 实数系与复数系 —— */
    'rudin:ordered-field': definition(
      'Ordered fields',
      'A total order < is given on a field F, and both addition and multiplication are compatible with the order (a<b ⇒ a+c<b+c; a<b with c>0 ⇒ ac<bc)',
      'a field with an order',
    ),
    'rudin:least-upper-bound': theorem(
      'The real field and the least-upper-bound property',
      'There is an ordered field R that satisfies the field axioms and the order axioms and has the least-upper-bound property; every non-empty subset of R that is bounded above has a supremum in R',
      {
        formalStatement: {
          reading: 'Every non-empty subset of the reals that is bounded above has a supremum, and this supremum is again a real number.',
          notation: [
            { means: 'the least upper bound of S: the smallest of the upper bounds of S' },
            { means: 'there is M such that s ≤ M for every s ∈ S' },
          ],
          note: 'The textbook characterises the real number system by this property together with the field axioms and the order axioms (§1.10, §1.19–1.21), that is, by completeness; this site does not prove its equivalence with other formulations of completeness (such as convergence of Cauchy sequences).',
        },
      },
    ),
    'rudin:extended-real': definition(
      'The extended real number system',
      'The symbols +∞ and −∞ are adjoined to R, and the order and the arithmetic are extended by conventions such as “every real number is less than +∞”, so that the supremum is defined even for a set that is not bounded above',
      'the real number system with two extra symbols',
    ),
    'rudin:complex-field': definition(
      'The complex field',
      'C is the field on R² whose multiplication is (a,b)(c,d) = (ac−bd, ad+bc); i = (0,1) satisfies i² = −1, and every non-zero complex number has a multiplicative inverse',
      'a field built from pairs of real numbers',
    ),
    'rudin:euclidean-space': definition(
      'Euclidean space R^k',
      'On R^k one defines the inner product x·y = Σ x_i y_i and the norm |x| = (x·x)^{1/2}, which satisfy the Cauchy–Schwarz inequality |x·y| ≤ |x||y|',
      'a real vector space with an inner product',
    ),

    /* —— 第 2 章 基础拓扑 —— */
    'rudin:countable-set': definition(
      'Finite, countable and uncountable sets',
      'A is finite when it is in one-to-one correspondence with some J_n, countable when it is in one-to-one correspondence with N, and uncountable otherwise; any countable union of countable sets is still countable',
      'the cardinality classification of sets',
    ),
    'rudin:metric-space': definition(
      'Metric spaces',
      'd: X×X → R satisfies d(p,q) > 0 for p ≠ q, d(p,p) = 0, d(p,q) = d(q,p) and the triangle inequality; open balls and open sets are defined from it',
      'a set with a distance function',
      {
        formalStatement: {
          reading: 'A metric is a non-negative real-valued function on X × X: it equals 0 exactly when the two points coincide (positive definiteness), it is symmetric, and it satisfies the triangle inequality.',
          notation: [
            { means: 'the open ball {q : d(p, q) < r}; open sets are defined as unions of open balls' },
            { symbol: 'triangle inequality', means: 'a detour is never shorter: d(p, r) ≤ d(p, q) + d(q, r)' },
          ],
          note: 'The positive-definiteness condition is often written d(p,q) ≥ 0 together with d(p,q) = 0 ⇔ p = q; writing only the first half leaves out “distinct points have non-zero distance”. The registration status of the node is REF (§2.15–2.20).',
        },
      },
    ),
    'rudin:compact-set': definition(
      'Compact sets and the Heine–Borel theorem',
      'K ⊂ X is compact if and only if every open cover of K has a finite subcover; in R^k, K is compact if and only if K is bounded and closed',
      'a property of subsets of a metric space',
      {
        formalStatement: {
          reading: 'Compact = every open cover has a finite subcover; in R^k compactness is equivalent to being bounded and closed (Heine–Borel).',
          notation: [
            { symbol: 'open cover', means: 'a family of open sets whose union contains K' },
            { symbol: 'finite subcover', means: 'finitely many members of that family whose union still contains K' },
            { symbol: 'equivalence in R^k', means: 'it holds in this one space only; in a general metric space “bounded and closed” does not imply compact' },
          ],
          note: 'The second clause is the Heine–Borel theorem (textbook §2.41); this site registers the statement only and does not reproduce the proof.',
        },
      },
    ),
    'rudin:perfect-set': definition(
      'Perfect sets and the Cantor set',
      'P is perfect if and only if every point of P is a limit point of P; in R^1 a non-empty perfect set is uncountable, and the Cantor set is an example that is compact, perfect and totally disconnected',
      'a kind of closed set',
    ),
    'rudin:connected-set': definition(
      'Connected sets',
      'E ⊂ X is connected if and only if there are no open sets A, B with E∩A and E∩B non-empty, E ⊂ A∪B and E∩A∩B = ∅; the connected subsets of R are exactly the intervals',
      'a subset that cannot be written as the union of two non-empty open sets',
    ),

    /* —— 第 3 章 数列与级数 —— */
    'rudin:convergent-sequence': definition(
      'Convergent sequences and subsequences',
      'p_n → p means that for every ε > 0 there is N such that d(p_n,p) < ε whenever n ≥ N; a convergent sequence is bounded, and its subsequences converge to the same point',
      'a sequence of points in a metric space',
    ),
    'rudin:bolzano-weierstrass': theorem(
      'The Bolzano–Weierstrass theorem',
      'Every bounded infinite set of points in R^k has a limit point; equivalently, every bounded sequence has a convergent subsequence',
    ),
    'rudin:cauchy-sequence': definition(
      'Cauchy sequences and completeness',
      'For every ε > 0 there is N such that d(p_m,p_n) < ε whenever m,n ≥ N; in R^k the Cauchy sequences are exactly the convergent ones (completeness)',
      'a sequence of points that become close to one another',
    ),
    'rudin:series-convergence': definition(
      'Series and their convergence criteria',
      'Σ a_n converges means that the sequence of partial sums converges; for a series of non-negative terms one can decide convergence by the comparison test, the root test and the ratio test',
      'an infinite sum',
    ),
    'rudin:power-series': definition(
      'Power series',
      'There is a radius of convergence R ∈ [0,∞] such that the series converges absolutely for |z| < R and diverges for |z| > R; it converges uniformly on compact subsets of |z| < R',
      'a series of the form Σ c_n z^n',
    ),
    'rudin:absolute-convergence': definition(
      'Absolute convergence and rearrangement',
      'If Σ |a_n| converges then Σ a_n converges and every rearrangement converges to the same sum; a conditionally convergent series can be rearranged to any prescribed sum (Riemann’s rearrangement theorem)',
      'a mode of convergence of a series',
    ),

    /* —— 第 4 章 连续性 —— */
    'rudin:continuous-function': definition(
      'Continuous functions',
      'f is continuous at p means lim_{x→p} f(x) = f(p); equivalently, the preimage of every open set in Y is relatively open in the domain',
      'a function continuous at a point or on a set',
      {
        formalStatement: {
          reading: 'f is continuous at p if and only if the ε–δ condition holds; equivalently, the preimage of every open set in Y is open in X.',
          notation: [
            { means: 'the distance functions of the two metric spaces; in the topological case ε–δ is replaced by the language of neighbourhoods' },
            { means: 'preimage; f need not be invertible' },
          ],
          note: 'The registration status of the node is REF (only the textbook position §4.5–4.9 is registered); this statement is a definition, and the textbook’s wording has not been checked item by item.',
        },
      },
    ),
    'rudin:continuity-compactness': definition(
      'Continuity and compactness',
      'The image of a compact set under a continuous map is compact; consequently a continuous real function on a compact set is bounded, attains its maximum and minimum, and is uniformly continuous',
      'a property of continuous functions on a compact set',
    ),
    'rudin:continuity-connectedness': definition(
      'Continuity and connectedness (the intermediate value theorem)',
      'The image of a connected set under a continuous map is connected; consequently a continuous real function on an interval takes every value between its values at the two ends',
      'a property of continuous functions on a connected set',
    ),

    /* —— 第 5 章 微分 —— */
    'rudin:derivative': definition(
      'The derivative',
      'f′(x) = lim_{t→x} (f(t) − f(x))/(t − x); differentiability implies continuity, but not conversely (|x| at 0)',
      'the derivative of a real function at a point',
    ),
    'rudin:mean-value-theorem': theorem(
      'The mean value theorem',
      'If f is continuous on [a,b] and differentiable on (a,b), then there is x ∈ (a,b) with f(b) − f(a) = f′(x)(b − a); the generalized mean value theorem gives the analogous conclusion for a quotient of two functions',
    ),
    'rudin:lhospital-rule': theorem(
      'L’Hospital’s rule',
      'For an indeterminate form of type 0/0 or ∞/∞, if the limit of f′/g′ exists (including ±∞) then the limit of f/g is the same; one requires g′ ≠ 0 and a non-vanishing denominator',
    ),
    'rudin:taylor-theorem': theorem(
      'Taylor’s theorem',
      'If f has n continuous derivatives on [a,b] and an (n+1)-st derivative on (a,b), then f(β) = P(β) + a remainder, where the remainder can be written as f^{(n+1)}(x)(β−a)^{n+1}/(n+1)! or in integral form',
    ),
    'rudin:vector-derivative': definition(
      'Differentiation of vector-valued functions',
      'The derivative of f: [a,b] → R^k is defined componentwise; the mean value theorem fails for vector-valued functions and is replaced by |f(b) − f(a)| ≤ (b−a) sup|f′|',
      'the derivative of a function into R^k',
    ),

    /* —— 第 6 章 Riemann–Stieltjes 积分 —— */
    'rudin:riemann-stieltjes': definition(
      'The Riemann–Stieltjes integral and its existence',
      '∫_a^b f dα = sup L(P,f,α) = inf U(P,f,α); when f is continuous and α is monotonically increasing, the integral exists under the bounded-variation condition',
      'the integral with respect to a monotonically increasing function α',
    ),
    'rudin:integral-properties': definition(
      'Properties of the integral',
      'The integral is linear in both f and α; when f is integrable, |∫ f dα| ≤ ∫ |f| dα; it is additive over intervals; a jump point at which α is continuous does not affect the value of the integral',
      'the algebraic and order properties of the integral',
    ),
    'rudin:fundamental-theorem': theorem(
      'The fundamental theorem of calculus',
      'If f ∈ R(α) then F(x) = ∫_a^x f dα is continuous; if α is differentiable at x_0 and f is continuous at x_0 then F′(x_0) = f(x_0)α′(x_0); if f is differentiable and f′ is integrable then ∫_a^b f′ dx = f(b) − f(a)',
    ),
    'rudin:rectifiable-curve': definition(
      'Rectifiable curves',
      'γ is rectifiable when the set of lengths of inscribed polygonal lines has an upper bound Λ(γ); when γ is C¹, Λ(γ) = ∫_a^b |γ′(t)| dt',
      'a continuous curve in R^k',
    ),

    /* —— 第 7 章 函数序列与函数级数 —— */
    'rudin:uniform-convergence': definition(
      'Uniform convergence',
      'f_n → f uniformly means sup_x |f_n(x) − f(x)| → 0; uniform convergence implies pointwise convergence, but not conversely (f_n(x) = x^n on [0,1])',
      'a mode of convergence of a sequence of functions',
    ),
    'rudin:uniform-convergence-properties': definition(
      'Uniform convergence, continuity, integration and differentiation',
      'If the terms are continuous and convergence is uniform, the limit function is continuous; the series may be integrated term by term on [a,b]; if the terms are differentiable and the derivatives converge uniformly, the limit is differentiable and may be differentiated term by term',
      'the properties preserved by uniform convergence',
    ),
    'rudin:equicontinuous': definition(
      'Equicontinuous families',
      '𝓕 is equicontinuous on K when for every ε > 0 there is δ > 0 such that |f(x) − f(y)| < ε for every f ∈ 𝓕 and all x,y with d(x,y) < δ; on a compact set, an equicontinuous and uniformly bounded family has a subsequence that converges in the uniform norm',
      'the uniform continuity of a family of functions',
    ),
    'rudin:stone-weierstrass': theorem(
      'The Stone–Weierstrass theorem',
      'A polynomial-type algebra A on a compact metric space that separates points and contains no zero function is uniformly dense in C(X); in particular, every real continuous function on [a,b] can be uniformly approximated by polynomials',
    ),

    /* —— 第 8 章 一些特殊函数 —— */
    'rudin:exponential-logarithm': definition(
      'The exponential and logarithmic functions',
      'E(z) = Σ z^n/n! converges on C and satisfies E(z+w) = E(z)E(w); L(y) = ∫_1^y dx/x is the inverse of E on R',
      'elementary functions defined by power series',
    ),
    'rudin:trigonometric-functions': definition(
      'The trigonometric functions',
      'C(x) = (E(ix) + E(−ix))/2 and S(x) = (E(ix) − E(−ix))/(2i); both have period 2π, and π is defined as the smallest positive zero of C',
      'periodic functions defined from the exponential function',
    ),
    'rudin:algebraic-completeness': theorem(
      'Algebraic completeness of the complex field',
      'Every non-constant polynomial with complex coefficients has a root in C (the fundamental theorem of algebra)',
    ),
    'rudin:fourier-series': definition(
      'Fourier series',
      'For f ∈ R on [−π,π] one defines the Fourier coefficients f^(n) = (1/2π)∫ f(t)e^{−int}dt; Parseval’s identity and Bessel’s inequality come from the L² inner product',
      'expansion in a trigonometric series',
    ),
    'rudin:gamma-function': definition(
      'The Γ function',
      'Γ(x) = ∫_0^∞ t^{x−1}e^{−t}dt (x > 0); it satisfies Γ(x+1) = xΓ(x) and Γ(n+1) = n!, and extends to a function analytic on C except at the non-positive integers',
      'a function defined by an integral',
    ),

    /* —— 第 9 章 多元函数 —— */
    'rudin:linear-transformation': definition(
      'Linear transformations and the operator norm',
      '‖A‖ = sup{|Ax| : |x| ≤ 1} is finite, which makes A a uniformly continuous Lipschitz map; the matrix representation and the equivalence of norms are established from this',
      'a linear map R^n → R^m',
    ),
    'rudin:several-variable-derivative': definition(
      'The derivative of functions of several variables',
      'f′(x) is the unique linear map A with lim_{h→0} |f(x+h) − f(x) − Ah|/|h| = 0; the existence of partial derivatives does not imply differentiability, and the chain rule holds for composites of linear maps',
      'the derivative of a vector-valued function at a point',
    ),
    'rudin:contraction-principle': theorem(
      'The contraction mapping principle',
      'If on a complete metric space X a map φ: X → X satisfies d(φ(x),φ(y)) ≤ c d(x,y) with 0 ≤ c < 1, then φ has a unique fixed point',
    ),
    'rudin:inverse-function-theorem': theorem(
      'The inverse function theorem',
      'If f is continuously differentiable on an open set E and f′(a) is invertible, then a has a neighbourhood U on which f is injective and f(U) is open, and the inverse function is differentiable at f(a) with (f^{-1})′(f(a)) = [f′(a)]^{-1}',
    ),
    'rudin:implicit-function-theorem': theorem(
      'The implicit function theorem',
      'If F(x,y) = 0, F(a,b) = 0 and (∂F/∂y)(a,b) is invertible, then there is a unique locally defined g with F(x,g(x)) = 0, and g′(a) is given by the partial derivatives of F',
    ),
    'rudin:rank-theorem': theorem(
      'The rank theorem',
      'If f has constant rank r near a, then there are local coordinates in which f equals the projection (x_1,…,x_n) ↦ (x_1,…,x_r,0,…,0)',
    ),

    /* —— 第 10 章 微分形式的积分 —— */
    'rudin:primitive-mapping': definition(
      'Primitive mappings and partitions of unity',
      'A primitive mapping takes the standard k-simplex into R^k; a partition of unity is a family of non-negative C^∞ functions whose supports are locally finite, whose sum is identically 1, and each of whose supports is contained in some member of a given open cover',
      'a differentiable map on the standard simplex; a family of functions subordinate to a cover',
    ),
    'rudin:differential-form': definition(
      'Differential forms',
      'ω = Σ f_I(x) dx_{i_1} ∧ … ∧ dx_{i_k} with differentiable coefficients; the wedge product is anticommutative, d² = 0, and the pullback commutes with d',
      'an exterior differential form of degree k',
    ),
    'rudin:simplex-chain': definition(
      'Simplices and chains',
      'A k-simplex is a C¹ map from the standard simplex into R^n; a k-chain is a finite linear combination of k-simplices with integer coefficients; the boundary operator ∂ satisfies ∂² = 0',
      'oriented standard simplices and their integer linear combinations',
    ),
    'rudin:stokes-theorem': theorem(
      'Stokes’ theorem',
      'A k-chain Γ and a (k−1)-form ω satisfy ∫_Γ dω = ∫_{∂Γ} ω (when the coefficients of ω are continuously differentiable and Γ is C²)',
    ),
    'rudin:closed-exact-form': definition(
      'Closed and exact forms',
      'A closed form satisfies dω = 0 and an exact form satisfies ω = dλ; exact implies closed, the converse holds on star-shaped regions (the Poincaré lemma), and in general de Rham cohomology measures the obstruction',
      'forms whose exterior derivative vanishes, and forms that can be written as dλ',
    ),

    /* —— 第 11 章 Lebesgue 理论 —— */
    'rudin:set-function': definition(
      'Set functions',
      'μ maps sets to non-negative real numbers (including +∞); it is usually required to take the value 0 on the empty set and to be countably additive',
      'a non-negative function defined on a family of sets',
    ),
    'rudin:lebesgue-measure': definition(
      'The construction of the Lebesgue measure',
      'Starting from the volume of elementary sets one defines the outer measure m*, and then takes the sets satisfying the Carathéodory condition as the measurable sets; the measurable sets form a σ-algebra on which m is countably additive',
      'the outer measure generated by the volumes of intervals, and the measurable sets',
    ),
    'rudin:measurable-function': definition(
      'Measurable functions',
      'f is measurable when the preimage of every open set belongs to 𝔐; sums, products and almost-everywhere limits of measurable functions are again measurable',
      'a function measurable with respect to a σ-algebra',
    ),
    'rudin:lebesgue-integral': definition(
      'The Lebesgue integral',
      'One first defines the integral for simple functions, then takes the supremum over non-negative measurable functions, and finally splits into positive and negative parts; the dominated and monotone convergence theorems are the core tools, and every Riemann-integrable function is Lebesgue-integrable with the same value',
      'an integral defined by approximation with simple functions',
    ),
    'rudin:l2-space': definition(
      'The L² space',
      'L²(μ) is the complete inner product space under ⟨f,g⟩ = ∫ f ḡ dμ (the Riesz–Fischer theorem), and Parseval’s identity for Fourier series follows',
      'an inner product space of square-integrable functions',
    ),

    /* —— 两个方法节点（正文未撰写，方法由教材惯用论证提炼） —— */
    'rudin:method-epsilon-estimate': {
      title: 'ε–N and ε–δ estimates',
      summary: 'Replace an assertion of “tending to” by a concrete ε, solve for N or δ, and then split the error into a few controllable pieces with the triangle inequality.',
      formal: {
        name: 'ε–N and ε–δ estimates',
        scope: 'local method',
        In: 'an assertion of the form “some quantity tends to some value”',
        Out: 'an explicit N(ε) or δ(ε), together with the bounds for the pieces into which the error is split',
        Pre: 'the universal form of the assertion has been written out (for every ε > 0 there is δ …)',
        Post: 'an explicit threshold and error estimates for the pieces, or a statement of which piece cannot be controlled',
        Fail: 'An estimate can only prove that something can be controlled; if one piece has no bound, the method yields no conclusion — and that does not mean the proposition is false.',
        fail: 'An estimate can only prove that something can be controlled; if one piece has no bound, the method yields no conclusion — and that does not mean the proposition is false.',
        body: 'Write the universal form → set the target error to ε or ε/M → solve for a threshold for each term separately → take the maximum or the minimum of the thresholds → push the total error back below ε with the triangle inequality → check that the various “sufficiently large” conditions are mutually compatible.',
        boundary: ['It handles only estimates that can be split by the triangle inequality; non-constructive existence proofs are outside its scope.'],
      },
      motivation: {
        internal: ['If the phrase “sufficiently close” is to be checked, it must come with a solvable threshold; the estimation process itself is the proof.'],
        external: ['The starting point of all of numerical analysis and error analysis.'],
        aesthetic: ['It replaces a qualitative assertion by an inequality that can be solved backwards.'],
        growthChain: ['understand “tends to” → try to write down ε and N → notice that the triangle inequality splits the error → estimation becomes a fixed routine'],
      },
      teaching: {
        selfCheck: [
          { prompt: 'Write the skeleton of a proof, in ε–N language, that the sum of two convergent sequences converges.', competence: 'proof', criterion: 'Take N = max(N₁, N₂) and split into two pieces of ε/2 each by the triangle inequality.' },
        ],
        reviewQuestions: ['Why does one usually split the error into ε/2 rather than ε?'],
      },
      provenance: { note: NOTE_METHOD },
    },
    'rudin:method-compactness-transfer': {
      title: 'Using compactness to globalise local conclusions',
      summary: 'First obtain a local conclusion near every point, then use compactness to glue finitely many local conclusions into one global conclusion.',
      formal: {
        name: 'Using compactness to globalise local conclusions',
        scope: 'global method',
        In: 'a family of local conclusions that hold pointwise, together with a compact set K',
        Out: 'a global conclusion holding uniformly on K, or a counterexample showing that compactness cannot be dropped',
        Pre: 'K is compact, and the local conclusion at each point comes with a neighbourhood',
        Post: 'K is covered by finitely many of those neighbourhoods, and the global conclusion holds',
        Fail: 'When K is not compact the gluing fails — a function on (0,1) that is continuous but not uniformly continuous is the standard counterexample; the method then does not apply, and one cannot conclude that the statement is false either.',
        fail: 'When K is not compact the gluing fails — a function on (0,1) that is continuous but not uniformly continuous is the standard counterexample; the method then does not apply, and one cannot conclude that the statement is false either.',
        body: 'For each point take a neighbourhood on which the local conclusion holds → these neighbourhoods form an open cover of K → take a finite subcover → merge the finitely many local conclusions by “taking the smallest δ” → obtain the uniform conclusion on K.',
        boundary: ['It applies to compact sets only; in the non-compact case uniformity has to come from elsewhere (for instance from equicontinuity).'],
      },
      motivation: {
        internal: ['Holding pointwise sounds strong enough, but it gives no uniform threshold; the finite cover is exactly the step that compresses infinitely many thresholds into finitely many.'],
        external: ['Uniform continuity, uniform convergence and stability estimates for numerical methods all rely on this step.'],
        aesthetic: ['Finiteness is traded for uniformity.'],
        growthChain: ['the pointwise conclusion fails in practice → notice that what is missing is a uniform threshold → supply it with a finite subcover → compactness becomes the source of uniformity'],
      },
      teaching: {
        selfCheck: [
          { prompt: 'Explain why the proof of “[0,1] continuous ⇒ uniformly continuous” fails on (0,1).', competence: 'judgement', criterion: '(0,1) is not compact, the open cover has no finite subcover, and δ cannot be made uniform.' },
        ],
        reviewQuestions: ['Which step of the proof does the finite-cover theorem actually replace?'],
      },
      provenance: { note: NOTE_METHOD },
    },
  },

  evidence: {
    'ev-rudin-limit-superior': {
      title: 'Limit superior and inferior: the corresponding material in Chapter 3 (Numerical Sequences and Series), §3.15–3.17, p55–57',
      scope: 'Only the title, the section and the dependencies are registered so far; the body text has not been written, and the textbook’s wording has not been checked line by line.',
      obligations: [
        'Write the node text (motivation, formal form, counterexample per condition, review questions)',
        'Not encoded as an ND certificate of Chapter 02 (there is not even a body text yet, let alone machine verification)',
        'Check the wording and numbering of the corresponding sections of the textbook one by one',
      ],
    },
    'ev-rudin-function-limit': {
      title: 'Limit of a function: the corresponding material in Chapter 4 (Continuity), §4.1–4.4, p83–85',
      scope: 'Only the title, the section and the dependencies are registered so far; the body text has not been written, and the textbook’s wording has not been checked line by line.',
      obligations: [
        'Write the node text (motivation, formal form, counterexample per condition, review questions)',
        'Not encoded as an ND certificate of Chapter 02 (there is not even a body text yet, let alone machine verification)',
        'Check the wording and numbering of the corresponding sections of the textbook one by one',
      ],
    },
  },

  actions: {
    'a-rudin:limit-superior': { title: 'Introduce limit superior and limit inferior' },
    'a-rudin:function-limit': { title: 'Introduce the limit of a function' },
  },
};
