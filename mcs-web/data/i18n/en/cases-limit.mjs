/**
 * 案例 01（limit）正文块的英文覆盖：`<!-- node:id -->` 块 id → 英文 Markdown。
 *
 * ## 为什么单独一个文件
 *
 * 与 `cases.mjs` / `cases-dg.mjs` 同一分工：正文块跟着修订源走，节点元数据跟着节点 id 走
 * （元数据在 `en/limit.mjs`，本文件只管正文）。拆开是为了让「改一句摘要」和「重译一节正文」
 * 不挤在同一个区域里，冲突面最小。
 *
 * ## 装配
 *
 * `data/i18n/overlay.mjs` 把 `overlay.cases` 当正文块映射，按节点替换 `contentMarkdown`；
 * 未覆盖的节点保持中文原文并由 `coverage()` 计入缺口，不会出现半截英文正文。
 * **本文件必须在 `data/i18n/index.mjs` 的 REGISTRY `cases` 一节登记，否则不生效。**
 *
 * ## 译者约定（与 `data/i18n/glossary.mjs`、施工手册 §2 一致）
 *
 * - 公式（`$$…$$` 与行内 `$…$`）内容**逐字保留**，包括空格、`\ ` 与 `\,`；`\text{…}` 里没有中文，
 *   故本文件不含任何公式改动；
 * - 标题层级、段落与 `**加粗引导词。**` 的个数与顺序与中文块一一对应，不合并、不概括；
 * - 本案例的块**没有** `/nodes/<id>` 链接，故没有链接口径问题；
 * - 标题用 `en/limit.mjs` 里已登记的英文标题，术语沿用同一份覆盖，避免正文与元数据两种说法；
 * - 「去心邻域」统一作 `punctured neighbourhood`，「任意接近 / 最终」作
 *   `arbitrarily close / eventually`，「未声称 / 未编码为证书」仍是 `not claimed` /
 *   `not encoded as a certificate`，不抬高成 verified / certified；
 * - 每个条件的「删掉会怎样」照样写清后果（ε–N 的 N 可依赖 ε、ε–δ 的 `0<|x-a|`、
 *   量词次序、聚点条件、选择原则），不弱化、不省略。
 */

export default {
  'limit:distance': `## Distance on the reals

**Intuition.** To say that f(x) is close to L, there must first be a “closeness” that can be quantified. The distance on the reals reduces this step to a non-negative real number: $d(x,y)=|x-y|$, so that “the error is smaller than ε” becomes an inequality that can be checked directly.

**Growth chain.** The geometric intuition of a neighbourhood → absolute error → the distance function. Every $|x-a|<\\delta$ and $|f(x)-L|<\\varepsilon$ in the definition of a limit is the end form of this chain.

**Boundary.** This node does not encode completeness of the reals, the least-upper-bound theorem or general metric spaces; those are declared background. A distance of zero only says that two points coincide; it does not say “small enough”.
`,

  'limit:seq-conv': `## Convergence of a sequence

**Intuition.** “$x_n$ eventually comes arbitrarily close to $a$” contains two verbs: arbitrarily close, and eventually. ε governs the first, N the second. The definition folds an infinite process into a single finite condition: once ε is given, only one N has to be found.

$$x_n\\to a \\iff \\forall \\varepsilon>0\\ \\exists N\\ \\forall n\\ge N,\\ |x_n-a|<\\varepsilon.$$

**Order of quantifiers.** N may depend on ε, but not on n; reading $\\forall n\\ge N$ as “every term” misses the finite initial segment. The constant sequence $x_n=a$ has error identically zero, and N=1 already works, so convergence does not exclude attaining the limit.
`,

  'limit:limit-ed': `## The ε–δ definition of a limit of a function

**Why it is needed.** The sequential definition requires a sequence tending to a to be given first, whereas the functional definition acts directly on every point of the domain. There are two paths of motivation: inside the discipline one wants to describe the local behaviour at a removable discontinuity; in external applications one wants to translate an output error budget into an input tolerance; structurally, one replaces the dynamic “approach” by a finite chain of quantifiers.

**From seed idea to canonical form.** Dynamic approach → testing along sequences one by one → a direct quantifier description → the punctured-neighbourhood definition.

$$\\lim_{x\\to a}f(x)=L \\iff \\forall \\varepsilon>0\\ \\exists \\delta>0\\ \\forall x\\in D,\\ 0<|x-a|<\\delta \\Rightarrow |f(x)-L|<\\varepsilon.$$

**Counterexample per condition.** Drop $0<|x-a|$: redefining f(a) at a changes the conclusion, and the limit is forced to agree with the value of the function. Allow a to be an isolated point: the punctured neighbourhood is empty, the condition holds vacuously, every L satisfies it, and the limit is no longer unique. Interchange the order of the quantifiers: fixing δ first and then letting ε tend to zero fails even for $f(x)=x$.

**Common misconceptions.** Taking the limit value to be f(a); letting δ depend on a particular x; reading “there exists δ” as “for all δ”.
`,

  'limit:limit-seq': `## The sequential characterisation of a limit

**Intuition.** If the limit of the function exists, then along every punctured path leading to a the values of the function should be pulled towards one and the same L. Conversely, if every path tends to L, the function has no other way out near a.

$$\\lim_{x\\to a}f(x)=L \\iff \\forall (x_n)\\subset D\\setminus\\{a\\},\\ x_n\\to a \\Rightarrow f(x_n)\\to L.$$

**Boundary.** Testing a single sequence is not enough; allowing $x_n=a$ would pull f(a) into the condition; the backward proof selects a counterexample sequence by $\\delta=1/n$, and this step relies on a choice condition in the metatheory.
`,

  'limit:bridge': `## Equivalence of the ε–δ and sequential definitions

**Proof sketch.** Forward: given ε, take δ from the ε–δ condition; the sequence eventually falls inside the δ-neighbourhood, so its image enters the ε-neighbourhood. Backward: if ε–δ fails, then there is $\\varepsilon_0$ such that for every δ a counterexample point can be found; for $\\delta=1/n$ take $x_n$, which gives $x_n\\to a$ while $f(x_n)$ does not tend to L, a contradiction.

**Conditions as counterexamples.** Delete “a is an accumulation point”: near an isolated point there is no punctured sequence, the sequential condition holds vacuously, and the equivalence degenerates on one side. Delete the choice condition: the existence of the counterexample sequence stops.

**Exact boundary.** This page gives a complete natural-language proof; the machine certificate covers only the small step “evaluation at a constant”. Proving that a counterexample sequence exists is not the same as giving an executable algorithm. The first line of the backward proof is the layer-by-layer negation of the ε–δ quantifier chain.
`,

  'limit:continuous': `## Continuity of a function at a point

**Intuition.** Continuity stitches the value of the function to the limit: not only is the output pulled towards some value, but that value is exactly f(a).

$$\\text{Continuous}(f,a) \\iff \\forall \\varepsilon>0\\ \\exists \\delta>0\\ \\forall x\\in D,\\ |x-a|<\\delta \\Rightarrow |f(x)-f(a)|<\\varepsilon.$$

**What happens if the condition is dropped.** If one switches to the punctured condition, a function redefined at a would still be judged continuous; continuity has to include the case x=a. If a does not lie in the domain, f(a) has no object, and the assertion cannot hold.

**Boundary case.** Continuity at an isolated point holds automatically: the only point satisfying $|x-a|<\\delta$ is x=a, and the error is zero. This is not a gap in the definition but the correct behaviour of the definition in a degenerate case.
`,

  'limit:bridge-cont': `## Continuity and the limit of a function

**Proof sketch.** Forward: restrict the neighbourhood condition of continuity to $x\\ne a$, which gives a limit of the function with value f(a). Backward: merge the punctured limit condition with the trivial case x=a, where the error is zero, and recover the definition of continuity.

**Conditions.** a must belong to D and be used as an accumulation point in this discussion. At an isolated point continuity holds but there is no punctured limit, so the equivalence has to state these hypotheses explicitly and cannot be used unconditionally.
`,

  'limit:constant-seq': `## Constant sequence

**Why it matters.** It is the smallest convergent example, and also the smallest counterexample to the implicit belief that “approaching cannot attain”.

**Verification.** Let $x_n=a$ for every n. For any ε>0, take N=1; then for $n\\ge1$ we have $|x_n-a|=0<\\varepsilon$, hence $x_n\\to a$. At the same time every term equals the limit.

**Scope of the refutation.** This example acts on convergence of sequences only; the punctured condition in the definition of a limit of a function speaks about $x\\ne a$, so the two quantify over different objects, and this counterexample cannot refute the latter.
`,

  'limit:no-never-equal': `## Convergence does not force every term to differ from the limit

**Claim.** There exist a convergent sequence and a real number a such that the sequence converges to a and some term equals a.

**Proof.** Take the constant sequence $x_n=a$; by the previous node it converges to a, and $x_1=a$.

**Why it is common.** “Arbitrarily close” is easily mixed up with “always different”. To correct this one does not need to discuss general sequences: it suffices to give a sequence whose error is identically zero and to point out that it does not touch the punctured condition for limits of functions.
`,

  'limit:claim-eval-constant': `## Evaluation of a constant function

**Machine-certified scope.** What the existing certificate certifies is
$$\\forall a\\ \\forall n,\\ (\\lambda n.a)(n)=a.$$
It unfolds one λ-abstraction and substitutes the actual argument; there are no open assumptions. In this certificate N and R are merely sort names: the real metric, the definition of convergence, the bridge between the ε–δ and the sequential definitions, and the choice needed for the backward proof are not encoded either.

**Why it is worth listing separately.** Showing a proof, checking a certificate and saying that somebody has mastered something are three different things. The role of this small fragment is precisely to keep these three layers apart.
`,

  'limit:proof-eval-constant': `## Certificate for constant evaluation

**Status.** The certificate has been accepted by the existing ND-subset checker, with check status passed. The checker itself has not been formally verified, so this entry cannot be written as “the correctness of the checker has been machine-proved”.

**Remaining obligations.** The real-metric background, convergence of sequences, the complete bridge between the two definitions of a limit, the choice condition for the backward proof, and real learning outcomes are all outside the scope of this certificate.
`,

  'limit:problem-quantifier-negation': `## Write the quantifier negation of the backward bridge

**Task.** Write out the full quantifier form of the failure of the ε–δ condition, keeping $0<|x-a|$ and writing “there exists a counterexample point” as a condition that can be checked layer by layer.

**Review question.** In the passage from the failure condition to the choice of the counterexample sequence $x_n$, at which step is the choice principle used? If the object theory weakens this principle, what is missing from the backward proof of the bridge?
`,

  'limit:pattern-never-equal': `## Misconception: every term of a convergent sequence differs from the limit

**Wrong rule.** $x_n\\to a$ is strengthened into $x_n\\ne a$ for every n.

**Counterexample.** The constant sequence $x_n=a$ converges to a, and every term equals a.

**Scope of the refutation.** This counterexample does not refute the punctured condition in the definition of a limit of a function. Convergence of sequences allows the limit point to be attained, whereas the limit of a function discusses the behaviour for $x\\ne a$; the two cannot be interchanged.
`,

  'limit:method-constant-test': `## Testing the dynamic image of approach with a constant sequence

**When to use it.** When a conjecture reads “arbitrarily close” as “never equal”, first check it with the cheapest constant or eventually constant sequence.

**Steps.** Write the conjecture as a universal statement in ε–N form → take a sequence whose error is identically zero → check whether the universal strengthening still holds → record what it refutes and what it does not.

**Scope of failure.** If the target statement is about a punctured neighbourhood, or about limits along all paths, this counterexample does not apply; the output of the method is candidates and their scope, not an automatic proof.
`,

  'limit:method-ratio-test': `## Comparing growth by ratios of consecutive terms

**When to use it.** When two sequences of positive terms have to be compared for which grows faster, and one does not want to take limits term by term. A typical setting is deciding whether the cost of one algorithm can be bounded by another.

**Steps.** First check that both sequences have positive terms → compute the limits of a_{n+1}/a_n and of b_{n+1}/b_n separately and compare them → read off from the ratio which one has the higher order → if necessary, use squeezing to lift the conclusion to a_n/b_n itself.

**It need not apply in another setting.** This is a **local technique**, not a general strategy: it requires both sequences to be positive, and the ratios of consecutive terms to have a limit. Sequences with signs, sequences that attain zero, and sequences whose ratios oscillate all call for other methods.

**Scope of failure.** When the ratios have no limit the method does not apply. Moreover it yields only a comparison of growth rates; it does **not** give the numerical value of the limit—for that one has to compute separately.

**Review question.** If the ratios oscillate (for example jumping between 1/2 and 2), what other way is there to compare the growth rates?
`,

  'limit:method-neighborhood-estimate': `## Replacing pointwise evaluation by a neighbourhood estimate

**When to use it.** The function is undefined at a, or substitution produces an indeterminate form such as 0/0. Pointwise evaluation then gets nowhere, but a **uniform estimate** on a punctured neighbourhood can usually be written down.

**Steps.** Write the target as |f(x) − L| → find an upper bound that depends only on |x − a| → solve for the δ that makes the upper bound smaller than ε → if it cannot be solved, report “the estimate is insufficient” rather than giving a numerical value.

**Why this is not a trick.** What the ε–δ definition requires is precisely a uniform bound depending only on the radius of the neighbourhood, not a pointwise value. This method simply takes that requirement as its operating procedure.

**Scope of failure.** An empirical estimate that “holds at a list of sample points” is **not** a uniform bound and cannot be used as evidence for the existence of a limit. The method produces a candidate δ and an estimate; whether they hold still has to be verified against the definition, and it does not replace a proof.

**Review question.** Why can “it holds at a list of sample points” not support the existence of a limit? Construct a function that takes the value 0 at rational points and 1 elsewhere, for comparison.
`,
};
