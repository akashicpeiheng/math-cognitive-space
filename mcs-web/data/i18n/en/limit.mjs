/**
 * 英文覆盖：案例 01「极限与连续」（`limit`）。
 *
 * 这是英文覆盖的**参考实现**：后续案例（manifold / tensor / group / dg / liang / rudin）
 * 按同一形状写。几条写在最前面的约定：
 *
 * - 键是**中文源的 id**，一个字都不能改（`data/i18n/overlay.mjs` 按 id 配对，错了直接报错）；
 * - 只写**含中文的字段**：结构与受控词表值（`discipline`、`roles`、`mode`、证据标签）
 *   不重复出现在这里——重复=分歧的来源，parity 会把它当错误；
 * - 数组**按序对齐且长度必须相同**：`teaching.conditions[0]` 说的是中文源的同一个条件，
 *   少写一条即错位，所以宁可留空数组也不要截断；
 * - 数学记号（LaTeX、`$…$`、量词、`0<|x−a|<δ` 这类式子）**原样保留**，
 *   它们是中英两版共享的数学内容，不是文案；
 * - `provenance.sources` 与 `witness.ref` 是**修订源的真实路径**，不翻译。
 *
 * 翻译口径见 `data/i18n/glossary.mjs`；`node scripts/i18n-parity.mjs --locale en`
 * 检查结构，`node scripts/i18n-extract.mjs --case <id>` 导出待译字段。
 */

export default {
  nodes: {
    'limit:distance': {
      title: 'Distance on the reals',
      summary: 'd(x,y)=|x−y| is the metric background for the discussion of limits and continuity.',
      formal: {
        objectType: 'pair of real numbers',
        formationWitness: 'Parameters and predicate are closed under their declared types.',
        boundary: ['Completeness of the reals is not encoded inside this node.'],
      },
      representations: [{ title: 'Absolute-value formula', medium: 'formula' }],
      motivation: {
        internal: [
          'The ε–δ language has to write “close to” as a finite condition that depends only on distance.',
          'Without a distance notation, the condition inside the universal quantifier cannot be stated.',
        ],
        external: ['Physical measurement and numerical approximation both need an error bound.'],
        aesthetic: ['It compresses geometric closeness into a single non-negative real number.'],
        growthChain: ['naive closeness → absolute error → the distance function d(x,y)=|x−y|'],
      },
      teaching: {
        commonMisconceptions: ['Treating “the distance is small” as “the distance is zero”.'],
        reviewQuestions: ['Why does the definition of a limit use 0<|x−a|?'],
      },
      provenance: { note: 'Natural-language proofs and machine-checked fragments are registered separately.' },
    },

    'limit:seq-conv': {
      title: 'Convergence of a sequence',
      summary: 'The ε–N definition of x_n→a.',
      formal: {
        objectType: 'sequence of real numbers',
        formationWitness: 'Parameters and predicate are closed under their declared types.',
        boundary: ['The standard model of the natural numbers and completeness of the reals are declared background.'],
      },
      formalStatement: {
        reading: 'The sequence converges to a exactly when for every ε > 0 there is a natural number N such that all terms beyond the N-th lie inside the ε-neighbourhood of a.',
        notation: [
          { means: 'the threshold for ε (in general it depends on ε; the smaller ε is, the larger N must be)' },
          { means: 'the precise meaning of “eventually”: only finitely many terms may fall outside the neighbourhood' },
        ],
        note: 'The only difference from ε–δ is the type of the threshold: here it is a natural number used to compare indices, there it is a neighbourhood radius. It is not the informal phrase “n tends to infinity”.',
      },
      representations: [
        { title: 'ε–N definition', medium: 'formula', note: 'The termwise error is eventually smaller than any positive ε.' },
        { title: 'Eventually inside any neighbourhood', medium: 'natural language', note: 'It reads ε as the radius of a neighbourhood.' },
      ],
      motivation: {
        internal: ['It replaces the “eventually” of an infinite process by a finite N.'],
        external: ['It is the convergence criterion used by numerical algorithms.'],
        aesthetic: ['It expresses infinite approach through a finite verification structure.'],
        growthChain: ['observing approach → error sequence → the order of the ε–N quantifiers'],
      },
      teaching: {
        conditions: [
          { remove: 'require it only for some ε', counterexample: 'for a smaller ε the error need not stay controlled', effect: 'The conclusion degrades from “arbitrary precision” to precision at a single point.' },
          { condition: 'eventually (n≥N)', remove: 'require it for every term', counterexample: 'finitely many initial terms may deviate arbitrarily', effect: 'The definition does not inspect the finite initial segment.' },
        ],
        commonMisconceptions: ['Reading “eventually” as “for every term”.'],
        reviewQuestions: ['May N depend on ε?'],
      },
      provenance: { note: 'Natural-language proofs and machine-checked fragments are registered separately.' },
    },

    'limit:limit-ed': {
      title: 'The ε–δ definition of a limit of a function',
      summary: 'The limit of a function under the punctured-neighbourhood condition.',
      formal: {
        objectType: 'limit of a function at an accumulation point',
        assumptions: ['a is an accumulation point of D'],
        formationWitness: 'Parameters and predicate are closed under their declared types.',
        boundary: ['D, a and the accumulation-point condition must be stored together with the node.'],
      },
      formalStatement: {
        reading: 'The limit equals L exactly when: for every ε > 0 there is δ > 0 such that every x in the domain D with 0 < |x − a| < δ satisfies |f(x) − L| < ε.',
        notation: [
          { means: 'the point being approached; it must be an accumulation point of D (it need not itself lie in D)' },
          { means: 'the admissible error bound, supplied arbitrarily by the other party' },
          { means: 'the radius of the punctured neighbourhood determined by ε; in general it depends on ε' },
          { means: 'the domain of f; the punctured condition 0 < |x − a| says that f need not be defined at a' },
        ],
        note: 'The order of the quantifiers is part of the definition: ∃δ comes after ∀ε and before ∀x. Interchanging ∀x and ∃δ yields the much weaker condition “every point has some neighbourhood”.',
      },
      representations: [
        { title: 'ε–δ definition', medium: 'formula', note: 'In the universal prefix, ε precedes δ.' },
        { title: 'Error budget and response radius', medium: 'natural language', note: 'ε is the target error and δ the admissible range of the input.' },
      ],
      motivation: {
        internal: [
          'Continuity has to describe the behaviour of f(x) near a without relying on f(a).',
          'The sequential definition presupposes a sequence; ε–δ acts directly on the domain of the function.',
        ],
        external: [
          'Engineering tolerances require turning an output error budget into an input tolerance.',
          'Numerical analysis needs a quantified stability radius.',
        ],
        aesthetic: ['It replaces the dynamic image of “approaching” by a finite chain of quantifiers.'],
        growthChain: ['dynamic intuition of approach → sequential test → direct quantifier definition → ε–δ'],
      },
      teaching: {
        conditions: [
          { remove: 'change it to |x−a|<δ (including x=a)', counterexample: 'take a function redefined at a so as to differ from its other values', effect: 'The limit would be forced to agree with f(a); that is exactly what continuity, and not the limit, requires.' },
          { condition: 'a is an accumulation point', remove: 'allow a to be an isolated point', counterexample: 'for D={a} the punctured neighbourhood is empty, the quantified condition holds vacuously, and every L satisfies it', effect: 'The limit of the function is no longer unique.' },
          { condition: 'ε precedes δ', remove: 'interchange ∃δ∀ε', counterexample: 'take f(x)=x, a=0; fixing δ first and then letting ε→0 fails', effect: 'The order of the quantifiers cannot be interchanged.' },
        ],
        proofOverview: 'The two-way bridge between ε–δ and the sequential definition: forwards, a sequence eventually falls inside the δ-neighbourhood; backwards, quantifier negation and δ=1/n select a counterexample sequence.',
        commonMisconceptions: ['Taking the limit value to be f(a).', 'Believing that δ may depend on x.'],
        reviewQuestions: ['Why does the backward bridge need the axiom of choice, or an equivalent principle?'],
        selfCheck: [
          { prompt: 'Write out the full quantifier order of the ε–δ definition.', competence: 'stating a definition', criterion: 'The quantifiers agree word for word with the standard definition.' },
          { prompt: 'Construct an example where the limit exists but f(a) is different.', competence: 'constructing an example', criterion: 'Give a piecewise function and verify the punctured condition.' },
        ],
      },
      provenance: { note: 'Natural-language proofs and machine-checked fragments are registered separately.' },
    },

    'limit:limit-seq': {
      title: 'The sequential characterisation of a limit',
      summary: 'Heine’s condition: the images of all punctured sequences tending to a tend to L.',
      formal: {
        objectType: 'sequential characterisation of a limit of a function',
        assumptions: ['a is an accumulation point of D'],
        formationWitness: 'Parameters and predicate are closed under their declared types.',
        boundary: ['The metatheoretic assumptions needed for sequence selection are declared together with the case.'],
      },
      representations: [
        { title: 'Heine condition', medium: 'formula', note: 'It reduces a limit of a function to a test over all sequences.' },
      ],
      motivation: {
        internal: ['Once the language of convergence of sequences is available, functions can be tested directly.'],
        external: ['Computationally, one may approximate a limit by discrete sampling.'],
        aesthetic: ['It reduces continuity at the level of functions to the level of sequences.'],
        growthChain: ['convergence of sequences → testing sequence by sequence → raising the quantifier to all sequences'],
      },
      teaching: {
        conditions: [
          { condition: 'for all sequences', remove: 'test only one sequence', counterexample: 'another path besides the constant sequence x_n=a gives a different limit', effect: 'A single sequence cannot determine the limit of the function.' },
          { remove: 'allow x_n=a', counterexample: 'when f(a) is redefined, the constant sequence yields a wrong limit', effect: 'The punctured condition has to be kept.' },
        ],
        commonMisconceptions: ['Replacing all paths by a single path.'],
        reviewQuestions: ['What does each direction of the bridge to the ε–δ definition require?'],
      },
      provenance: { note: 'Natural-language proofs and machine-checked fragments are registered separately.' },
    },

    'limit:bridge': {
      title: 'Equivalence of the ε–δ and sequential definitions',
      summary: 'Under the accumulation-point condition, LimitED ⇔ LimitSeq.',
      formal: {
        assumptions: ['a is an accumulation point of D'],
        boundary: ['The sequence selection inside the proof holds in the ZFC metatheory; weakening the choice principle requires an extra hypothesis.'],
      },
      representations: [
        { title: 'Two-way proof', medium: 'natural language and quantifier calculus', note: 'The forward and backward directions are expanded separately.' },
      ],
      motivation: {
        internal: ['The two definitions must translate into each other, otherwise the concept of a limit is not one concept.'],
        external: ['Reducing a continuity problem to a sequence problem makes computation and counterexample construction easier.'],
        aesthetic: ['It is a dual transformation of quantifier structure.'],
        growthChain: ['two definitions → forward verification → backward quantifier negation → equivalence theorem'],
      },
      teaching: {
        proofOverview: 'Forwards: given ε choose δ; a sequence eventually falls inside the δ-neighbourhood, hence its image enters the ε-neighbourhood. Backwards: if ε–δ fails, then for each δ=1/n pick a counterexample point x_n; this yields a convergent sequence whose image does not converge.',
        conditions: [
          { condition: 'a is an accumulation point', remove: 'drop the accumulation-point condition', counterexample: 'near an isolated point there is no punctured sequence, so the sequential condition holds vacuously', effect: 'The equivalence degenerates on one side.' },
          { condition: 'the choice principle', remove: 'use the δ=1/n selection directly in an object theory with weakened choice', counterexample: 'the existence of the sequence (x_n) cannot be guaranteed', effect: 'The backward proof stops.' },
        ],
        commonMisconceptions: ['Taking “prove that a counterexample sequence exists” to be a constructive algorithm.'],
        reviewQuestions: ['How should the first line of the quantifier negation for the backward proof read?'],
        selfCheck: [
          { prompt: 'Write the quantifier negation of the failure of LimitED.', competence: 'proof', criterion: 'There is ε₀ such that every δ admits a counterexample point.' },
          { prompt: 'Explain why this theorem does not merge the two definitions into a single node.', competence: 'structural analysis', criterion: 'Node identity is fixed by expression and provenance; equivalence is not identity.' },
        ],
      },
      provenance: { note: 'Natural-language proofs and machine-checked fragments are registered separately.' },
    },

    'limit:continuous': {
      title: 'Continuity of a function at a point',
      summary: 'The ε–δ definition of continuity, including the case x=a.',
      formal: {
        objectType: 'continuity of a function at a point a',
        formationWitness: 'Parameters and predicate are closed under their declared types.',
        boundary: ['Continuity at an isolated point holds automatically; this is a consequence of the definition, not a defect.'],
      },
      representations: [
        { title: 'Definition of continuity', medium: 'formula', note: 'The neighbourhood condition does not use the punctured restriction.' },
      ],
      motivation: {
        internal: ['Only when the limit exists and equals the value of the function can one say that the function has no break at that point.'],
        external: ['A control system requires the output perturbation to stay controlled under an input perturbation.'],
        aesthetic: ['It stitches the value of the function and the limit into a single condition.'],
        growthChain: ['limit of a function → require f(a)=L → direct neighbourhood definition'],
      },
      teaching: {
        conditions: [
          { remove: 'allow a∉D', counterexample: 'outside D the expression f(a) is undefined', effect: 'The assertion of continuity loses its object.' },
          { condition: 'no punctured neighbourhood is used', remove: 'switch to the punctured condition', counterexample: 'a function redefined at a would still be judged continuous', effect: 'Continuity includes the value of the function; the punctured condition cannot express that.' },
        ],
        commonMisconceptions: ['Believing that continuity is equivalent to the graph being drawable in one stroke.'],
        reviewQuestions: ['Why does continuity at an isolated point hold automatically?'],
      },
      provenance: { note: 'Natural-language proofs and machine-checked fragments are registered separately.' },
    },

    'limit:bridge-cont': {
      title: 'Continuity and the limit of a function',
      summary: 'When a is an accumulation point, continuity is equivalent to the limit being f(a).',
      formal: {
        assumptions: ['a∈D', 'a is an accumulation point of D'],
        boundary: ['The isolated-point case is described separately.'],
      },
      motivation: {
        internal: ['Continuity ought to be expressible in the language of limits.'],
        external: ['It turns continuity questions into limit computations.'],
        aesthetic: ['It stitches the interfaces of the two definitions.'],
        growthChain: ['definition of continuity → restrict to the punctured condition → add back the case x=a'],
      },
      teaching: {
        proofOverview: 'Forwards, restrict the neighbourhood condition of continuity to x≠a; backwards, at x=a the error is zero and merges with the punctured limit condition.',
        conditions: [
          { condition: 'a is an accumulation point', remove: 'drop the accumulation-point condition', counterexample: 'a function continuous at an isolated point has no punctured limit there', effect: 'The equivalence fails.' },
        ],
        commonMisconceptions: ['Confusing continuity with the mere existence of a limit.'],
        reviewQuestions: ['Why does the isolated point have to be treated separately?'],
      },
      provenance: { note: 'Natural-language proofs and machine-checked fragments are registered separately.' },
    },

    'limit:constant-seq': {
      title: 'Constant sequence',
      summary: 'x_n=a for every n; the limit is a, and every term equals the limit.',
      formal: {
        objectSpec: { a: 'an arbitrary real number' },
        satisfaction: 'Taking N=1 gives |x_n−a|=0<ε for every ε>0.',
        boundary: ['This node concerns convergence of sequences only; it does not concern the punctured condition for limits of functions.'],
      },
      representations: [
        { title: 'Constant-sequence test', medium: 'example', note: 'It verifies the ε–N condition directly.' },
      ],
      motivation: {
        internal: ['The simplest convergent sequence exposes the difference between “eventually” and “every term”.'],
        external: ['A numerical iteration may reach a fixed point immediately.'],
        aesthetic: ['It tests a definition with a zero-error example.'],
        growthChain: ['quantified definition → take zero error → constant counterexample'],
      },
      teaching: {
        proofOverview: 'For any ε>0 take N=1; the error is identically 0.',
        commonMisconceptions: ['Believing that a limit point cannot be attained by the sequence.'],
        reviewQuestions: ['If one dropped N=1 and wrote only “eventually”, what would the definition still check?'],
      },
      provenance: { note: 'Natural-language proofs and machine-checked fragments are registered separately.' },
    },

    'limit:no-never-equal': {
      title: 'Convergence does not force every term to differ from the limit',
      summary: 'There is a convergent sequence some of whose terms equal the limit.',
      formal: {
        boundary: ['This claim refutes only the universal error “in every convergent sequence all terms differ from the limit”; it does not refute the punctured condition for limits of functions.'],
      },
      motivation: {
        internal: ['The definition of convergence of a sequence does not exclude attaining the limit point.'],
        external: ['A numerical algorithm may reach the solution in one step.'],
        aesthetic: ['The constant sequence is the smallest counterexample model.'],
        growthChain: ['wrong universal rule → construct a constant sequence → exact scope of the refutation'],
      },
      teaching: {
        proofOverview: 'For the constant sequence x_n=a the error is identically zero, and there is n with x_n=a.',
        conditions: [
          { condition: 'the sequence may attain its limit', remove: 'mistakenly strengthen “arbitrarily close” to “every term differs”', counterexample: 'a constant sequence', effect: 'The wrong rule is refuted directly.' },
        ],
        commonMisconceptions: ['Transplanting the punctured condition of limits of functions to sequences.'],
        reviewQuestions: ['Why does this counterexample not refute 0<|x−a| in the ε–δ definition?'],
      },
      provenance: { note: 'Natural-language proofs and machine-checked fragments are registered separately.' },
    },

    'limit:claim-eval-constant': {
      title: 'Evaluation of a constant function',
      summary: 'The machine-checked fragment: (λn.a)(n)=a, with no open assumptions.',
      formal: {
        boundary: ['This fragment contains no real metric, no definition of convergence and no limit bridge; in the certificate N and R are merely sort names.'],
      },
      motivation: {
        internal: ['It splits a single evaluation step of the limit proof into a replayable certificate.'],
        external: ['It shows the difference between a record of a demonstration and the acceptance of a certificate.'],
        aesthetic: ['A minimal certificate validates β-reduction.'],
        growthChain: ['natural-language evaluation → typed λ-term → a certificate in the ND subset'],
      },
      teaching: {
        proofOverview: 'The certificate unfolds the λ-abstraction and substitutes the actual argument, yielding the object equality requested.',
        commonMisconceptions: ['Taking this step to mean that the convergence bridge has been certified.'],
        reviewQuestions: ['Once this certificate is complete, which obligations does the bridge still lack?'],
      },
      provenance: { note: 'Natural-language proofs and machine-checked fragments are registered separately.' },
    },

    'limit:proof-eval-constant': {
      title: 'Certificate for constant evaluation',
      summary: 'A finite certificate accepted by the existing ND-subset checker.',
      formal: {
        boundary: ['The certificate covers the evaluation step only, not the reals or convergence.'],
      },
      teaching: {
        reviewQuestions: ['Up to which step does this certificate reach? Where are the reals and the definition of convergence?'],
      },
      provenance: { note: 'Natural-language proofs and machine-checked fragments are registered separately.' },
    },

    'limit:problem-quantifier-negation': {
      title: 'Write the quantifier negation of the backward bridge',
      summary: 'Put the failure of ε–δ into a usable existential form.',
      formal: {
        goal: 'Write ∃ε₀>0 ∀δ>0 ∃x∈D: 0<|x−a|<δ ∧ |f(x)−L|≥ε₀',
        boundary: ['An open proof problem does not pretend to have a general decision procedure.'],
      },
      motivation: {
        internal: ['Quantifier negation is the entry point of the backward proof.'],
        external: ['It gives a checkable form of an error state.'],
        aesthetic: ['Negation preserves structure.'],
        growthChain: ['definition of a limit → negate level by level → select the counterexample sequence'],
      },
      teaching: {
        selfCheck: [
          { prompt: 'Negate the ε–δ formula level by level.', competence: 'proof', criterion: 'Quantifier order and inequality directions are correct.' },
        ],
        reviewQuestions: ['Where does the sequence selection δ=1/n use the choice principle?'],
      },
      provenance: { note: 'Natural-language proofs and machine-checked fragments are registered separately.' },
    },

    'limit:pattern-never-equal': {
      title: 'Misconception: every term of a convergent sequence differs from the limit',
      summary: 'Strengthening “arbitrarily close” into “every term differs”.',
      formal: {
        wrongRule: 'x_n→a ⇒ for all n, x_n≠a',
        task: 'Give a sequence that both converges to a and attains a',
        counterexample: 'the constant sequence x_n=a',
        scope: 'It refutes only the wrong rule at the level of sequences; it does not refute the punctured condition in the definition of the limit of a function.',
        boundary: ['Whether an individual holds this misconception belongs to the external model E.'],
      },
      motivation: {
        internal: ['The intuition “approaches but never attains” needs a counterexample to correct it.'],
        external: ['An algorithm may reach the solution in one step.'],
        aesthetic: ['A minimal counterexample.'],
        growthChain: ['dynamic image of approach → over-strengthening → constant counterexample'],
      },
      teaching: {
        selfCheck: [
          { prompt: 'Write out the verification that the constant sequence satisfies the definition of convergence.', competence: 'constructing a counterexample', criterion: 'For every ε take N=1.' },
        ],
        reviewQuestions: ['Where does this wrong intuition come from?'],
      },
      provenance: { note: 'Natural-language proofs and machine-checked fragments are registered separately.' },
    },

    'limit:method-constant-test': {
      title: 'Testing the dynamic image of approach with a constant sequence',
      summary: 'Use a sequence that attains its limit to check the implicit belief that approaching cannot attain.',
      formal: {
        name: 'Testing the dynamic image of approach with a constant sequence',
        scope: 'local method',
        In: 'a guess about dynamic approach containing a universal quantifier',
        Out: 'candidate counterexamples and the scope of the refutation',
        Pre: 'a definition of convergence of sequences is available',
        Post: 'a counterexample instance and a refutation scope that is not over-extended',
        Fail: 'The counterexample does not apply to the punctured condition for limits of functions; the two quantify over different objects.',
        fail: 'The counterexample does not apply to the punctured condition for limits of functions; the two quantify over different objects.',
        body: 'Write “arbitrarily close” as an ε–N condition, then take a sequence whose error is identically zero and check whether the universal strengthening survives.',
        boundary: ['The method outputs candidates and their scope; it does not replace a mathematical proof.'],
      },
      motivation: {
        internal: ['A single zero-error example suffices to refute the universal strengthening.'],
        external: ['It tests whether a numerical algorithm allows exact hits.'],
        aesthetic: ['A minimal counterexample.'],
        growthChain: ['natural-language intuition → formalisation → counterexample test'],
      },
      teaching: {
        selfCheck: [
          { prompt: 'Use the method template to test the belief that a limit cannot be attained.', competence: 'using a method', criterion: 'Output the constant counterexample and state its scope.' },
        ],
        reviewQuestions: ['When does this method fail?'],
      },
      provenance: { note: 'Natural-language proofs and machine-checked fragments are registered separately.' },
    },

    'limit:method-ratio-test': {
      title: 'Comparing growth by ratios of consecutive terms',
      summary: 'Compare the growth of two sequences of positive terms: first look at the limit of the ratios of consecutive terms, then use squeezing to pin down the stronger one.',
      formal: {
        name: 'Comparing growth by ratios of consecutive terms',
        scope: 'local method',
        In: 'two sequences of positive terms a_n and b_n',
        Out: 'a comparison of growth rates, or the point of failure',
        Pre: 'both sequences consist of positive terms and the ratios of consecutive terms have limits',
        Post: 'the limit of a_n / b_n, or a statement that the ratios have no limit and the method therefore does not apply',
        Fail: 'When the ratios have no limit (for instance when they oscillate) the method does not apply; it also cannot handle terms that change sign or vanish.',
        fail: 'When the ratios have no limit (for instance when they oscillate) the method does not apply; it also cannot handle terms that change sign or vanish.',
        body: 'First confirm that both sequences consist of positive terms; compute the limits of a_{n+1}/a_n and b_{n+1}/b_n and take their ratio; read off which one grows faster, and use squeezing when the conclusion has to be raised to a_n/b_n.',
        boundary: ['The method yields a comparison of growth rates only; it does not produce the numerical value of the limit.'],
      },
      motivation: {
        internal: ['A comparison of growth rates can bypass term-by-term limit computation.'],
        external: ['Estimating the complexity of an algorithm requires comparing growth orders.'],
        aesthetic: ['It reduces “which one is larger” to a single ratio.'],
        growthChain: ['confusion about comparing two sequences → ratios of consecutive terms → conclusion about growth → squeezing to make it rigorous'],
      },
      teaching: {
        selfCheck: [
          { prompt: 'For the two given sequences of positive terms, write the ratios of consecutive terms and take their ratio.', competence: 'computation', criterion: 'When the ratio tends to 0, one should say that the stronger conclusion needs squeezing.' },
        ],
        reviewQuestions: ['If the ratios have no limit, can growth rates still be compared in another way?'],
      },
      provenance: { note: 'Natural-language proofs and machine-checked fragments are registered separately.' },
    },

    'limit:method-neighborhood-estimate': {
      title: 'Replacing pointwise evaluation by a neighbourhood estimate',
      summary: 'When the function is undefined at a or is hard to evaluate there, give a uniform estimate on a punctured neighbourhood of a and then pass to the limit.',
      formal: {
        name: 'Replacing pointwise evaluation by a neighbourhood estimate',
        scope: 'local method',
        In: 'an expression bounded on a punctured neighbourhood of a',
        Out: 'the value of the limit, or the conclusion that the estimate is not strong enough to determine it',
        Pre: 'one can write a uniform bound that depends only on ε or on the radius of the neighbourhood',
        Post: 'a δ satisfying the ε–δ condition, or a statement that the estimate is not sharp enough',
        Fail: 'An empirical estimate that holds only at a list of sample points is not a uniform bound and cannot support the existence of a limit; the method does not replace a proof.',
        fail: 'An empirical estimate that holds only at a list of sample points is not a uniform bound and cannot support the existence of a limit; the method does not replace a proof.',
        body: 'First write the target expression in the form |f(x) − L|; find a uniform upper bound that depends only on |x − a|; solve for the δ that makes the bound smaller than ε; if it cannot be solved, report the insufficiency of the estimate instead of producing a number.',
        boundary: ['The method produces a candidate δ and an estimate; whether they hold still has to be verified against the definition.'],
      },
      motivation: {
        internal: ['A uniform bound on a punctured neighbourhood is exactly the content of ε–δ.'],
        external: ['Numerical computation needs to choose a step size for a given accuracy.'],
        aesthetic: ['It replaces pointwise evaluation by a uniform estimate.'],
        growthChain: ['substitution fails → uniform estimate on the neighbourhood → solve for δ'],
      },
      teaching: {
        selfCheck: [
          { prompt: 'For the given |f(x)−L|, find an upper bound that depends only on |x−a|.', competence: 'estimation', criterion: 'Solve for δ, or report explicitly that the estimate is insufficient.' },
        ],
        reviewQuestions: ['Why can “it holds at a list of sample points” not support the existence of a limit?'],
      },
      provenance: { note: 'Natural-language proofs and machine-checked fragments are registered separately.' },
    },
  },

  representations: {
    'rep-limit-distance-formula': { title: 'Absolute-value formula', medium: 'formula' },
    'rep-limit-seq-eps': { title: 'ε–N definition', medium: 'formula', note: 'The termwise error is eventually smaller than any positive ε.' },
    'rep-limit-seq-image': { title: 'Eventually inside any neighbourhood', medium: 'natural language', note: 'It reads ε as the radius of a neighbourhood.' },
    'rep-limit-ed-formula': { title: 'ε–δ definition', medium: 'formula', note: 'In the universal prefix, ε precedes δ.' },
    'rep-limit-ed-intuition': { title: 'Error budget and response radius', medium: 'natural language', note: 'ε is the target error and δ the admissible range of the input.' },
    'rep-limit-seq-def': { title: 'Heine condition', medium: 'formula', note: 'It reduces a limit of a function to a test over all sequences.' },
    'rep-limit-bridge-proof': { title: 'Two-way proof', medium: 'natural language and quantifier calculus', note: 'The forward and backward directions are expanded separately.' },
    'rep-limit-cont-def': { title: 'Definition of continuity', medium: 'formula', note: 'The neighbourhood condition does not use the punctured restriction.' },
    'rep-limit-constant': { title: 'Constant-sequence test', medium: 'example', note: 'It verifies the ε–N condition directly.' },
  },

  actions: {
    'a-limit:distance': { title: 'Introduce distance on the reals' },
    'a-limit:d': { title: 'Introduce the ε–δ definition' },
    'a-limit:s': { title: 'Introduce convergence of sequences and the sequential limit' },
    'a-limit:bridge': { title: 'Prove that the two definitions of a limit are equivalent' },
    'a-limit:continuous': { title: 'Introduce the definition of continuity' },
    'a-limit:bridge-cont': { title: 'Prove the relation between continuity and the limit value' },
    'a-limit:constant': { title: 'Construct the constant sequence' },
    'a-limit:counter': { title: 'Refute “every term differs from the limit”' },
    'a-limit:method': { title: 'Propose the constant-sequence test' },
    'a-limit:eval-constant': { title: 'Replay the constant-evaluation certificate' },
    'a-limit:pattern': { title: 'Register the misconception pattern' },
    'a-limit:problem': { title: 'Pose the quantifier-negation exercise' },
    'a-limit:method-ratio': { title: 'Propose the ratio test for growth rates' },
    'a-limit:method-neighborhood': { title: 'Propose the neighbourhood-estimate method' },
  },

  evidence: {
    'ev-limit-bridge-proof': {
      title: 'Equivalence of the two definitions of a limit: a two-way prose proof',
      scope: 'A complete natural-language proof; it has not yet been encoded as an ND certificate of Chapter 02.',
      obligations: ['Encode the bridge proof for the machine', 'Handle the choice principle explicitly'],
    },
    'ev-limit-bridge-cont-proof': {
      title: 'Prose proof of continuity and the limit value',
      scope: 'a∈D and a is an accumulation point; the isolated-point case is described separately.',
      obligations: ['Encode the continuity bridge for the machine'],
    },
    'ev-limit-never-equal': {
      title: 'Counterexample: the constant sequence',
      scope: 'It refutes “every term of a convergent sequence differs from the limit” and does not touch the punctured condition for limits of functions.',
    },
    'ev-limit-constant-cert': {
      title: 'Certificate for the constant-evaluation fragment',
      scope: '(λn.a)(n)=a; in the certificate N and R are merely sort names.',
      obligations: ['The real metric, the definition of convergence, the ε–δ and sequential bridge, and the required choice are all unencoded'],
    },
    'ev-limit-reference-stillwell': {
      title: 'Historical source for the motivation of limits',
      scope: 'Stillwell, Chapter 9; a historical source does not serve as a hard prerequisite.',
    },
    'ev-limit-not-claimed': {
      title: 'Scope of what is not claimed',
      scope: 'This case is not used to claim real teaching benefits, population-level regularities, or a complete machine formalisation.',
    },
    'ev-limit-method-ratio': {
      title: 'Ratio test for growth rates: the steps agree with the case text',
      scope: 'A method is not a proposition and can be neither proved nor refuted; this evidence states only that the description of the steps does not go beyond the text.',
      obligations: ['Encode it as an ND certificate of Chapter 02', 'Check that both hypotheses (positive terms, ratios with a limit) are written into the boundary of the method'],
    },
    'ev-limit-method-neighborhood': {
      title: 'Neighbourhood-estimate method: the steps agree with the case text',
      scope: 'A method is not a proposition and can be neither proved nor refuted; this evidence states only that the description of the steps does not go beyond the text.',
      obligations: ['Encode it as an ND certificate of Chapter 02', 'Check that the failure branch “the estimate is insufficient” is written out explicitly'],
    },
    'ev-limit-method-constant-test': {
      title: 'Constant-sequence test: the steps agree with the case text',
      scope: 'A method is not a proposition; this evidence states only that the description of the steps does not go beyond the text and that the scope of failure is written out.',
      obligations: ['Encode it as an ND certificate of Chapter 02', 'Check that the failure condition (punctured neighbourhood) is preserved'],
    },
  },
};
