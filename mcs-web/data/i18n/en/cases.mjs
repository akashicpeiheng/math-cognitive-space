/**
 * 案例正文的英文覆盖：`<!-- node:id -->` 块 id → 英文 Markdown。
 *
 * ## 为什么正文单独一个文件
 *
 * 节点元数据（标题、摘要、动机…）与正文块是两种工作：前者一两行、跟着节点 id 走；
 * 后者是整篇 Markdown，跟着修订源走。放在一起会让「改一句摘要」和「重译一节正文」
 * 挤在同一个文件的同一个区域里，冲突面最大。
 *
 * ## 装配怎么用到它
 *
 * `data/i18n/overlay.mjs` 把 `overlay.cases` 当正文块映射，按节点替换 `contentMarkdown`。
 * 未覆盖的节点**保持中文原文**并由 `coverage()` 计入缺口——不会出现半截英文正文。
 *
 * ## 分文件
 *
 * 微分几何那 125k 汉字的正文单独放 `cases-dg.mjs`：它是生成物
 * （`data/cases/05-differential-geometry.md` 由 `scripts/build-dg-case.mjs` 产出），
 * 与手写的四案例正文节奏不同，分开也便于分批翻译。
 *
 * ## 译者约定（与 `data/i18n/glossary.mjs`、施工手册 §2 一致）
 *
 * - 公式从不翻译：`$$…$$` 与行内 `$…$` 的**内容逐字保留**（含 `\text{}` 里的说明文字
 *   才随语种改，因为中文字符不能出现在英文站上）；
 * - 标题层级、`/nodes/<id>` 链接、证据标签、`C^k`/`C¹` 这类记号原样保留；
 * - 语体面向学习者、结论先行：`**直觉。** → **Intuition.**`、
 *   `**边界。** → **Boundary.**`、`**删条件。** → **Deleting a condition.**`；
 * - 「未声称 / 未编码为证书」一律译成 `not claimed` / `not encoded as a certificate`，
 *   不抬高成「已验证」。
 */

/*
 * 注意：这里**不 import** `./cases-dg.mjs`。装配层（`data/i18n/index.mjs` 的注册表）
 * 把两份文件当同一节的两个来源逐文件合并，于是「微分几何那份还没建好」只会让那 30 个块
 * 记为缺口，而不会把这里已经翻好的块一起拖没（本轮真发生过一次：一个缺失的 import
 * 让 56 个已完成的节点译文静默消失）。
 */
const cases = {
  /* —— 案例 02：C^k 流形与光滑流形（`data/cases/02-manifold.md`） —— */

  'manifold:top-manifold': `## Topological manifolds

**Intuition.** If a space looks like $\\mathbb R^n$ near each of its points, one can do calculus on it piece by piece; Hausdorff and second countability ensure that these local pieces do not degenerate and can be glued together as a whole.

**Why it is needed.** Within the discipline it gives curves, surfaces and higher-dimensional shapes a single language; outside it, applications include the spacetime of general relativity and the configuration spaces of robotics; structurally, it glues local linear structure into a global object.

**Boundary.** “Locally like $\\mathbb R^n$” does not mean that the space as a whole is $\\mathbb R^n$. Dropping Hausdorff produces the line with two origins; dropping second countability produces the long line, and the usual gluing and embedding theorems no longer hold.`,

  'manifold:chart-atlas': `## Charts, atlases and covers

**Intuition.** A chart is a system of local coordinates, and an atlas is a family of local coordinates covering the whole space. The covering condition turns “every point lies in at least one chart” into a checkable condition on sets.

**Boundary.** An atlas is not required to be finite, nor are its charts required to be pairwise disjoint. After deleting one chart one has to check point by point whether the space is still covered by the others; a maximal atlas is one to which no new chart can be added in the compatible sense, not an arbitrary collection with “the most charts”.`,

  'manifold:transition': `## Transition maps

**Intuition.** When two local coordinate charts overlap, the same point has two sets of coordinates; the transition map is the translation between the two.

$$\\psi\\circ\\varphi^{-1}:\\varphi(U\\cap V)\\to\\psi(U\\cap V).$$

**The trap in the domain.** One must work on $\\varphi(U\\cap V)$, not on the whole of $\\mathbb R^n$; $\\varphi^{-1}$ is not defined outside the image. The C^k condition must hold for every ordered pair of charts — one cannot check a single direction only.

**Counterexample awareness.** A homeomorphism need not automatically be C^k; regularity is not a property that the notion of homeomorphism brings with it.`,

  'manifold:ck-atlas': `## C^k atlases

**Intuition.** Only when the transition maps are smooth enough can one continue to speak of derivatives after a change of coordinates.

**Conditions.** $k\\ge1$, and both directed transition maps on every overlap are C^k. A $C^0$ atlas cannot define a tangent space; $C^k$ and $C^\\infty$ are not the same condition.

**Boundary.** A topological manifold can carry several mutually incompatible C^k structures; this site does not develop the smoothing theorem.`,

  'manifold:smooth-atlas': `## Smooth atlases

**Intuition.** All transition maps have derivatives of every order, so differentiation can be iterated indefinitely.

**Counterexample.** $h(x)=x+x|x|$ together with the identity chart forms a C¹ atlas; $h'(x)=1+2|x|$ is continuous and positive, so h is a homeomorphism; but the second derivative is 2 on one side of 0 and −2 on the other, so this atlas is not C².

**Scope of the refutation.** This counterexample refutes only “this atlas is C²”; it does not prove that $\\mathbb R$ cannot be given another smooth atlas. Properties of an atlas and properties of the underlying space must be kept apart.`,

  'manifold:compatible-k': `## C^k compatibility

**Intuition.** Two atlases can be used together exactly when their union is again a C^k atlas.

**Checklist.** Transitions within each atlas, transitions across the two atlases, both directions, every overlap domain. Checking only the transitions within one atlas misses the genuine compatibility problems; compatibility is not equality of atlases.`,

  'manifold:max-k': `## Maximal C^k compatible extension

**Proof sketch.** Let $A_{\\max}$ be the set of all charts C^k compatible with every chart of A. Covering is guaranteed by $A\\subseteq A_{\\max}$; near a point of an overlap, two new charts can both be routed through some chart of A, the transition is a composite of two C^k maps, and regularity is a local property, so the whole transition domain is C^k; maximality follows directly from “all compatible charts are collected”.

**Deleting a condition.** If A itself is not a C^k atlas, covering and the local composite both lose their basis, and the proof of maximality cannot even begin.

**Misconception.** Membership in $A_{\\max}$ is not membership in A; nor does it claim another structure unrelated to A.`,

  'manifold:example-h': `## An example of a C¹ atlas that is not C²

**Computation.** $h(x)=x+x|x|$, $h'(x)=1+2|x|$ is continuous and strictly positive. h is strictly increasing and tends to plus and minus infinity at the two ends, hence is a homeomorphism; the derivative of the inverse is given by $1/h'(h^{-1}(y))$ and is continuous. Thus $\\{id,h\\}$ is a C¹ atlas.

**Failure witness.** The second derivative of h is 2 on one side of 0 and −2 on the other, so h is not C², and the atlas is therefore not a C² atlas.

**Exact boundary.** The counterexample shows only that “the C¹ condition on one and the same atlas does not imply the C² condition”; it does not show that $\\mathbb R$ has no smooth structure. Avoid confusing a choice of presentation with an existence statement about the underlying space.`,

  'manifold:claim-max': `## The maximal extension is a C^k atlas and is maximal

**Claim.** For every C^k atlas A, its maximal compatible extension $A_{\\max}$ is a C^k atlas and is maximal under inclusion.

**Proof structure.** Covering → local composite between the new charts → locality of regularity → maximality. Each step corresponds to an explicit interface: the covering property of A, the chain rule and closure of C^k under composition, and locality.

**Review question.** Why can the transition between two new charts be factored through some chart of A? That “some chart” depends on the covering condition.`,

  'manifold:claim-generalization': `## Every smooth atlas is a C^k atlas

**Implication on the same carrier.** Under the same atlas encoding, $P_\\infty(A)\\Rightarrow P_k(A)$: derivatives of all orders exist and are continuous, so in particular the first k orders satisfy C^k.

**Mapping between carriers is another matter.** Sending the smooth structure $(X,[A]_\\infty)$ to the maximal C^k extension requires proving that the result does not depend on the choice of a representative atlas; this forgetful map does not claim that the maximal smooth atlas and the maximal C^k atlas are literally equal, nor that a canonical inverse function exists.

**Misconception.** Reading $P_\\infty\\Rightarrow P_k$ as the identity of the two structures.`,

  'manifold:claim-transition-eval': `## The value of a same-chart transition at a specified point

**Machine-certified scope.** Under the hypothesis of a right-inverse equality at a specified point y, it certifies $\\varphi(\\varphi^{-1}(y))=y$. Total functions on two sorts model the two carriers of one already fixed chart.

**Counterexample from deleting a condition.** Drop the right-inverse hypothesis, let $\\varphi$ be identically 0 and $\\varphi^{-1}$ the identity; at y=1 the composite value is not 1.

**Boundary.** It contains no open sets, restricted domains, atlases, covers, regularity, chain rule or maximal extension; this is not a machine certification of the whole manifold structure.`,

  'manifold:proof-transition': `## Certificate for a same-chart transition

**Status.** The certificate has been accepted by the existing checker, with one open hypothesis: the right-inverse equality at the specified point. The theory contains only total functions on two sorts; restricted domains and the structure of open sets are not encoded.

**Remaining obligations.** Connect open sets, restricted domains, atlas covers, regularity and the chain rule to the certificate; these are still future work.`,

  'manifold:method-regularity': `## Local method: checking the regularity of atlas transitions pair by pair

**Steps.** Enumerate every pair of charts → write out $\\varphi(U\\cap V)$ and $\\psi(U\\cap V)$ → write out the composite → check the derivatives of every order in both directions → record the failure points.

**Scope of failure.** For an infinite atlas, or when the domain is undecidable, it returns “undecided”; it cannot claim that all pairs of charts have been checked.`,

  'manifold:pattern-one-direction': `## Misconception: testing only one direction of a transition

**Wrong rule.** As soon as $\\psi\\circ\\varphi^{-1}$ is C^k, the pair of charts is taken to satisfy the C^k condition.

**Correction.** The C^k condition requires the transition maps of all ordered pairs of charts to be C^k; a homeomorphism does not automatically upgrade to regularity, and the regularity of the inverse map is not free.`,

  'manifold:problem-transition-domain': `## Exercise: write out the domain and the image of a transition map

**Task.** Given (U,φ) and (V,ψ), write out the complete expressions for $\\varphi(U\\cap V)$, $\\psi(U\\cap V)$ and $\\psi\\circ\\varphi^{-1}$, and explain where the two open sets come from.

**Review.** If the overlap is empty, does the transition condition still have to be checked? Why is the domain written as $\\varphi(U\\cap V)$ rather than U?`,

  'manifold:method-cover-by-charts': `## Local method: cover by finitely many charts first, then verify chart by chart

**When to use it.** Facing a concrete space and asking whether it is a manifold. The first sentence of the definition is “every point has a neighbourhood homeomorphic to R^n”, so the most direct entry point is **to go and find a cover**.

**Steps.** Find a coordinate chart for every point → write the overlap regions out explicitly → if for some point no chart neighbourhood can be found, stop there and report the failure point instead of skipping over it and applying the later steps anyway.

**Why cover first and compatibility afterwards.** These are two different things: covering answers “can local coordinates be introduced at all”, compatibility answers “can these local coordinates be glued into a smooth structure”. Keeping them apart tells you which step you are stuck at when something fails. Covering the sphere by two stereographic charts is the standard example of the “covering” step; whether it yields a smooth structure is a matter for the next step.

**Scope of failure.** Writing down a cover is **not** the same as verifying C^k compatibility. This method handles covering only; compatibility goes through the pair-by-pair check (see also “checking the regularity of atlas transitions pair by pair”).

**Review question.** Once the cover has been written down, which step is still missing before one can say that this is a smooth manifold?`,

  'manifold:method-extension-check': `## Local method: deciding smoothness by an extension test

**When to use it.** A function is given only on a closed subset, and one wants to know whether it can be extended smoothly to a larger region. This is common in piecewise modelling: local data have to be assembled into a global function.

**Steps.** Restrict the function to the boundary → differentiate order by order and check whether the values agree with the limits obtained by approaching from the interior → if some order disagrees, report the failure point and say which order it is.

**Why checking the boundary alone is enough.** Points in the interior of the closed set already lie in the domain, so smoothness can be checked there directly; the only place where trouble can arise is the boundary, where the two directions may impose conflicting requirements.

**Scope of failure.** The method does not apply when the boundary is not smooth or when the dimension is wrong. It decides compatibility only; it does **not construct** the extension and gives no explicit formula for it.

**Review question.** Why is it not enough to check a single point of the boundary? Note that consistency on the boundary is required on the **whole boundary**.`,

  /* —— 案例 03：张量与张量场（`data/cases/03-tensor.md`） —— */

  'tensor:dual': `## The dual space

**Intuition.** Vectors are “the objects being measured”, linear functions are “measuring instruments”. All the measuring instruments together form $V^*=\\mathrm{Hom}(V,F)$.

**Motivation.** Within the discipline one has to handle vectors and covectors at the same time in order to write down a general tensor; outside it, the application is linear functionals and response measurements; structurally, duality turns “acting on something” into an object.

**Boundary.** Without an extra structure (such as an inner product or a chosen basis) there is no natural isomorphism between $V$ and $V^*$. In finite dimension they have the same dimension, but equal dimension is not natural identity.`,

  'tensor:tensor-product': `## The tensor product

**Intuition.** Every bilinear map $V\\times W\\to U$ ought to factor uniquely through one universal object and then be linear. That universal object is $V\\otimes W$.

**Universal property.** For every bilinear b there is a unique linear $\\tilde b$ with $b=\\tilde b\\circ\\otimes$. Coordinate components are a representation, not the definition; when the coordinates change, the object does not change with them.

**Boundary.** Treating the tensor product as a componentwise product loses “finite sums” and “universality”; an arbitrary bilinear map cannot be factored through a linear map.`,

  'tensor:tensor-rs': `## The space of tensors of type (r,s)

**Intuition.** Upper and lower indices record how many covectors and how many vectors the object eats:
$$T^r_s(V)=V^{\\otimes r}\\otimes (V^*)^{\\otimes s}.$$

**Boundary.** r and s are finite; the empty tensor product is by convention the base field F. The order of upper and lower indices and the conventions must be stored together with the node; the name must not be treated as something already known.`,

  'tensor:multilinear': `## Multilinear functions

**Intuition.** Once the remaining variables are fixed, the map is linear in each variable separately.

**Interface with tensors.** The space of multilinear functions corresponds to $T^r_s$ through the universal property; this correspondence is not a licence to call an arbitrary function of several arguments a tensor. Linearity in the first variable alone is not enough to imply multilinearity.`,

  'tensor:basis-law': `## The change-of-basis law

**Proof sketch.** Let the new basis be $e'_j=\\sum_i e_iA^i{}_j$. Vector coordinates satisfy $[v]'=A^{-1}[v]$; if a linear map has matrix $[L]$, substituting the old coordinates $A[v]'$ and then expressing the output in the new coordinates gives
$$[L]'=A^{-1}[L]A.$$
In general each upper index of a tensor in $T^r_s$ is multiplied by $A^{-1}$ and each lower index by A, obtained by expanding pure tensors factor by factor and extending linearly.

**The key distinction.** This is one and the same object expressed in two bases, not the production of a new object. The transformation law is also the criterion for deciding whether a candidate array is a tensor.`,

  'tensor:end-iso': `## The isomorphism between tensors and linear operators

**Definition.** $\\Phi(v\\otimes\\alpha)(w)=\\alpha(w)v$. The map $(v,\\alpha)\\mapsto(w\\mapsto\\alpha(w)v)$ is linear in each variable separately, so the universal property of the tensor product induces a unique linear map $\\Phi$.

**Proof.** Take a basis $e_i$ and the dual basis $\\varepsilon^j$; $\\Phi(e_i\\otimes\\varepsilon^j)$ sends $e_k$ to $\\delta^j_k e_i$, that is, to the matrix unit $E_{ij}$. Both sides have bases and the bases correspond, so $\\Phi$ is an isomorphism. The definition of $\\Phi$ chooses no basis; the basis is used only to prove bijectivity.

**Counterexample from deleting a condition.** Finite dimension is used essentially in surjectivity. In infinite dimension every element of the algebraic tensor product is a finite sum, hence looks like a finite-rank operator; the identity operator has infinite rank and is not in the image. So the result cannot be extended to infinite dimension without qualification.`,

  'tensor:rank1-additive': `## Rank-one maps preserve addition

**Machine-certified scope.** Let $R(x)=\\alpha(x)v$. Under the declared hypotheses that α preserves addition and that scalars distribute over addition, it certifies
$$R(x+y)=\\alpha(x+y)v=(\\alpha(x)+\\alpha(y))v=\\alpha(x)v+\\alpha(y)v=R(x)+R(y).$$

**Counterexample per condition.** Delete the additivity of α: on a one-dimensional space over $\\mathbb F_2$ take α identically 1 and v=1; then $R(x+y)=1$ while $R(x)+R(y)=0$. Delete the distributivity of scalars while keeping α additive: again use $\\mathbb F_2$ addition and α=id, but define the scalar action to be identically 1, and the conclusion fails.

**Boundary.** This fragment does not need all the field axioms; the remaining vector-space axioms are not claimed to be independently necessary, and still less is the full tensor isomorphism certified.`,

  'tensor:proof-rank1-additive': `## Certificate for rank-one additivity

**Status.** The certificate has been accepted by the existing checker, with one open hypothesis: α preserves addition; distributivity of scalars is an axiom of the closed theory. The finite field and the bound on the number of steps are supplied by the checker.

**Remaining obligations.** Scalar linearity, the universal property of the tensor product, bases, the finite-dimensional bijection, and bundles with sections are all unencoded.`,

  'tensor:bundle': `## The tensor bundle

**Construction.** Take the fibre $T^r_s(T_xX)$ at each point, use coordinate charts to give local trivialisations, and verify the transition functions against the change-of-basis law.

**Boundary.** Smoothness and the transition law come from the definition of the bundle; this page gives a complete natural-language argument, but it is not encoded as a machine certificate.`,

  'tensor:field': `## Tensor fields

**Intuition.** A tensor field is a smooth section of the tensor bundle: a tensor at every point, varying smoothly with the point.

**Equivalent description.** On an atlas covering X, the smooth families of local components that satisfy the tensor transformation law on every overlap are in bijection with the smooth tensor fields. If the family of charts does not cover X, one obtains sections over the union only.

**Counterexample reminder.** The Christoffel symbols carry indices but come with an extra inhomogeneous term, so they are not a tensor; an arbitrary pointwise assignment whose transition law is wrong likewise cannot assemble into a tensor field.`,

  'tensor:non-tensor-gamma': `## Christoffel symbols are not a tensor

**Counterexample computation.** Under the coordinate change $y=x^2$, the value $\\Gamma^y_{yy}=0$ in the original coordinates computes, in the new coordinates, to a non-zero inhomogeneous term (for instance $-\\frac1{2y}$), which contradicts the tensor change-of-basis law.

**Scope of the refutation.** It refutes only “every array with upper and lower indices is a tensor”; it does not deny that some particular array really does satisfy the transformation law, nor does it deny richer geometric objects.`,

  'tensor:infinite-rank': `## The identity operator in infinite dimension: a counterexample

**Counterexample.** When V is infinite-dimensional, every output of $\\Phi$ is a finite-rank operator: the image of a single $v\\otimes\\alpha$ has dimension at most one, and a finite sum is still of finite rank. The identity operator is not of finite rank, so it is not in the image of $\\Phi$.

**Scope of the refutation.** It refutes only the infinite-dimensional surjectivity claim; injectivity and the finite-dimensional isomorphism are unaffected.`,

  'tensor:method-invariant': `## Global method: looking for invariants

**Steps.** Declare the family of transformations → find a quantity preserved under all the allowed transformations → prove the preservation → check whether it distinguishes the objects of interest.

**Scope of failure.** A quantity whose preservation has not been proved is only a candidate; several examples staying unchanged do not amount to a proof of invariance.`,

  'tensor:pattern-index-array': `## Misconception: every array of indices is a tensor

**Wrong rule.** As long as it is written as a pile of upper and lower indices, it transforms like a tensor.

**Correction.** Tensoriality is defined by the transformation law. The Christoffel symbols are the most convenient counterexample: the indices look exactly the same, but an inhomogeneous term appears under a change of coordinates.`,

  'tensor:problem-transform-law': `## Exercise: check the transformation law of a candidate array

**Task.** Given a coordinate change and candidate components, apply the transformation factors to upper and lower indices separately and decide whether the tensor transformation law holds; write out the domain and the justification of every step.

**Review.** What extra structure turns connection coefficients into a tensor? Why can the finite-dimensional hypothesis not be silently deleted from the proof about $\\Phi$?`,

  'tensor:method-basis-check': `## Local method: substituting index by index to verify the transformation law

**When to use it.** You have a candidate array with upper and lower indices and want to know whether it is a tensor. Do not memorise the transformation law — substitute directly.

**Steps.** Write out the transformation matrix A and its inverse A⁻¹ → attach A⁻¹ to upper indices and A to lower indices → sum term by term → compare with the values of the candidate array in the same coordinates → when they differ, write the difference as an inhomogeneous term.

**Why one substitution settles half the question.** The transformation law is an equality that can be checked term by term, so the **negative direction** is reliable: as soon as one family of transformations fails to give equality after substitution, the candidate is not a tensor (this is exactly how the Christoffel symbols are excluded). But the **positive direction does not work**: verifying a hundred families of transformations still does not yield “it holds for all transformations”; that needs a general proof.

**Scope of failure.** The method substitutes only for the one given family of transformations. What it produces is “this one counterexample” or “this family passes”, not a universal conclusion.

**Review question.** Why does one counterexample suffice to refute, while a hundred examples still do not suffice to confirm?`,

  'tensor:method-dimension-count': `## Local method: using dimension counts to separate an isomorphism from a concrete realisation of it

**When to use it.** You suspect that two tensor spaces are isomorphic — do not rush to write down a map, count dimensions first. Unequal dimensions rule it out at once and save a long construction.

**Steps.** Count the free indices of the two spaces to get their dimensions → if they differ, rule it out → if they agree, write down a candidate map and verify linearity and bijectivity.

**Why this settles only half the problem.** Equal dimension is a **necessary** condition for an isomorphism, not a sufficient one. The genuinely hard part (writing down and verifying the map) is not saved at all; only the impossible cases are filtered out in advance.

**Scope of failure.** The finite-dimensional hypothesis cannot be deleted. In infinite dimension the dimension argument fails completely, as the counterexample of the infinite-dimensional identity operator makes plain.

**Review question.** Where does the dimension argument depend on the finite-dimensional hypothesis? Try moving the same argument to an infinite-dimensional space and see where it breaks.`,

  /* —— 案例 04：群（`data/cases/04-group.md`） —— */

  'group:group-concept': `## Groups

**Intuition.** A group compresses “symmetry operations that can cancel each other” into four rules: closure, associativity, identity, inverse.

**Motivation.** Within the discipline it gives a single language to geometric symmetry, permutations and modular arithmetic; outside it, applications include crystal and molecular symmetry; structurally, it keeps the common properties with the fewest axioms. The chain from seed to canonical form is: symmetry operations → closure and associativity → identity and inverse → abstract group.

**Counterexample per condition.** Delete associativity, and the composite identity for left multiplication $L_g\\circ L_h=L_{gh}$ fails; keep only a right identity, and the injectivity step of Cayley lacks its hypothesis. Commutativity is not part of the definition of a group: multiplication mod 5 commutes, but $S_3$ does not.`,

  'group:perm': `## Permutation groups

**Intuition.** Bijections of a set can be composed, composition is associative, the identity map is a unit, and the inverse of a bijection is again a bijection. Hence all the bijections form a group.

**The other end of Cayley.** Permutation groups are not merely “examples of finite symmetry groups”; Cayley’s theorem embeds an arbitrary abstract group into some permutation group. The convention for the order of composition must be stored together with the node, otherwise counterexample computations come out reversed.`,

  'group:triangle-sym': `## Rigid symmetries of an equilateral triangle

**Intuition.** Rotations by 120° and 240° and the three reflections leave the triangle unchanged, and composites and inverses still leave it unchanged. The action of the six symmetry elements on the three vertices gives a faithful permutation representation.

**Boundary.** The geometric picture supplies the motivation but does not replace checking the group axioms; “it looks symmetric” is no reason to skip the verification of composites and inverses.`,

  'group:units5': `## The group of units under multiplication mod 5

**Verification.** $\\{1,2,3,4\\}$ is closed under multiplication mod 5. The powers of 2 are 1,2,4,3 in turn, giving a cyclic group of order four; the identity is 1, and the inverse of each element is given by negating the exponent.

**Key boundary.** The commutativity of this example is an accidental feature, not a group axiom. Generalising its commutativity to all groups is exactly the over-inference that the $S_3$ counterexample is meant to correct.`,

  'group:cayley': `## Cayley’s theorem

**Proof sketch.** For each $g\\in G$ define the left multiplication map $L_g(x)=gx$. $L_{g^{-1}}$ is its inverse, so $L_g$ is a bijection; moreover
$$(L_g\\circ L_h)(x)=g(hx)=(gh)x=L_{gh}(x),$$
so $g\\mapsto L_g$ is a group homomorphism. If $L_g=L_h$, evaluating at the identity e gives $g=ge=L_g(e)=L_h(e)=he=h$, so the homomorphism is injective. Its image is a subgroup of $\\mathrm{Perm}(G)$, hence every group is isomorphic to a subgroup of some permutation group.

**Deleting a condition.** Delete associativity, and the composite identity cannot be proved; delete the identity element, and the injectivity proof has no point at which to evaluate.

**Misconception.** The conclusion is not “every group is a finite symmetry group”, nor “every group is isomorphic to some complete $S_n$”; when G is infinite, the permutation group is correspondingly infinite.`,

  'group:noncomm': `## The non-commutativity of S₃: a counterexample

**Computation.** Under the convention that the rightmost factor acts first, $(12)(23)$ and $(23)(12)$ send 1 to 2 and to 3 respectively, so the two composites are not equal.

**Scope of the refutation.** It refutes only “all groups are commutative”; abelian groups are still groups, and the commutativity of multiplication mod 5 is unaffected. Nor does this counterexample refute Cayley’s theorem: $S_3$ is itself a permutation group.`,

  'group:claim-injective': `## Equal left multiplication maps force equal elements

**Machine-certified scope.** Under the right identity law and the open hypothesis $L_g=L_h$, it certifies
$$g=ge=L_g(e)=L_h(e)=he=h.$$

**Counterexample per condition.** Delete the right identity: on $\\{0,1\\}$ let every product be 0, then all the left multiplication maps are equal while $0\\ne1$. Delete $L_g=L_h$: take distinct g,h in the two-element cyclic group, and the conclusion cannot be derived. The free parameters g,h are not a new axiom.

**Boundary.** This step needs the right identity only; it does not need associativity, inverses or finiteness, and it is not the full Cayley theorem.`,

  'group:proof-injective': `## Certificate for the injectivity fragment of Cayley

**Status.** The certificate has been accepted by the existing checker. The theory contains only the right identity law; the open hypothesis is the certified translation of the object equality $L_g=L_h$; the conclusion is g=h after the object equality is converted back.

**Remaining obligations.** Bijectivity of left multiplication, the composite homomorphism, permutation groups and the image subgroup are still future machine-certification tasks.`,

  'group:left-mul': `## Left multiplication maps

**Construction.** Fix $g\\in G$ and define $L_g:G\\to G$, $L_g(x)=gx$. Use associativity to verify $L_g\\circ L_h=L_{gh}$; use inverses to give $L_g$ the inverse $L_{g^{-1}}$, hence a bijection.

**Boundary.** The full bijection and homomorphism argument depends on the full group axioms; the machine certificate currently covers the injectivity step only.`,

  'group:method-abstract': `## Global method: abstracting a common operation from special cases

**Steps.** List the operation, the identity and the inverses of each concrete structure → find the properties shared by all the examples → use counterexamples to check whether the candidate axioms are too strong → record which features are kept and which are discarded.

**Demonstration.** Permutations, geometric symmetries and modular multiplication all satisfy closure, associativity, identity and inverse; commutativity occurs only in the first two or in modular multiplication, so it is left out of the axioms.`,

  'group:method-counterexample': `## Local method: refuting a commutativity generalisation with S₃

**Steps.** Obtain a universal commutativity conjecture from commutative examples → choose the smallest non-commutative permutation group → fix the order of composition → compute the difference between the composites of two transpositions → record the scope of the refutation.

**Scope of failure.** The counterexample refutes universal commutativity only; it does not refute the subclass of abelian groups, nor does it replace the classification theorem for groups.`,

  'group:pattern-all-commutative': `## Misconception: all groups are commutative

**Wrong rule.** Writing the commutativity of multiplication mod 5 as holding for all groups.

**Counterexample.** In $S_3$, $(12)(23)\\ne(23)(12)$.

**Scope of the refutation.** Abelian groups are still groups; this counterexample rules out only writing commutativity into the definition of a group, or generalising from individual examples to a universal claim.`,

  'group:problem-inverse': `## Exercise: finding an inverse in Units5

**Task.** Find the inverse of 3 under multiplication mod 5 and verify it by multiplying. Since $3\\cdot2=6\\equiv1\\pmod5$, the inverse is 2.

**Review.** If the modulus is changed to 6, does 3 still have an inverse? Why does the inverse axiom for groups fail?`,

  'group:method-cayley-table': `## Local method: checking the axioms and commutativity with a small multiplication table

**When to use it.** When the order of the set is small and the elements can be listed one by one. Then all four axioms can be answered in one go, without arguing axiom by axiom.

**Steps.** List all the elements → compute the products cell by cell and fill in the table → read the table: does every row and every column contain exactly one identity element (identity and inverse)? → is the table symmetric (commutativity)? → when a failure point appears, say which cell it is.

**Why the table can answer so much at once.** The axioms are all statements about “an arbitrary element”, and in the small-order case “an arbitrary element” can be enumerated. The table turns that universal quantification into finitely many lookups.

**Scope of failure.** This is a **local technique**: once the order grows, the table no longer fits. More importantly, what the table gives is a **case-by-case conclusion**, which cannot be generalised into an assertion about all groups — the table for Units5 is symmetric, and that does not imply “all groups are commutative”.

**Review question.** If the table is not symmetric, may one conclude that the group is non-commutative? Conversely, is a symmetric table enough to conclude commutativity?`,

  'group:method-order-count': `## Local method: comparing two groups by the orders of their elements

**When to use it.** Two groups of the same small order, and you want to know whether they could be isomorphic. Constructing an isomorphism directly is hard, so first find an invariant to filter with.

**Steps.** Compute the order of each element → count how many elements there are of each order → if the two distributions differ, rule it out → if they agree, an isomorphism still has to be constructed separately.

**Why element orders are an isomorphism invariant.** An isomorphism preserves the operation, hence also preserves “how many times one must iterate the operation to get back to the identity”. So the distribution of orders must be preserved by an isomorphism, and different distributions make an isomorphism impossible.

**Scope of failure.** The same distribution is only a **necessary** condition. S₃ and Z₆ both have order 6, but the distributions of element orders differ (S₃ has no element of order 6), so they are ruled out; and two groups whose distributions do agree may still fail to be isomorphic. This method does not produce an isomorphism.

**Review question.** If the distributions agree, what is the next step? Think about which other invariants are worth trying first.`,

  /* —— 案例 06：微分几何方法（手写，`data/cases/06-dg-methods.md`） —— */

  'dg:method-inverse-check': `## Local method: checking a candidate map with the inverse function theorem

**When to use it.** You have a concrete smooth map F: M → N and want to know whether it can be inverted near some point. Global injectivity is usually hard to decide, whereas local invertibility needs only one linear-algebra computation.

**Steps.** Take a coordinate chart at p and write out the coordinate expression of F → compute the Jacobian matrix at p → decide whether its determinant is non-zero → if it is non-zero, the inverse function theorem gives a local inverse on some neighbourhood of p → state that this inverse exists on that neighbourhood only.

**Why this order is the most natural one.** The conclusion of the inverse function theorem is itself local, so “linearise first, then look at invertibility” is not a trick but the structure of the theorem: a non-linear problem is completely determined at a point by the Jacobian.

**Scope of failure.** When the Jacobian is singular at p the theorem does not apply, and then one **must not** conclude from this method that no inverse exists — only that the theorem does not apply. Moreover the method decides local invertibility only; it gives no global inverse and does not handle boundary points.

**Review question.** Why does a non-zero Jacobian guarantee only local invertibility? Compare it with y = x³ at 0: there the Jacobian vanishes, yet the function is still injective globally.`,

  'dg:method-closed-form-test': `## Local method: testing at the origin whether a closed form is exact

**When to use it.** A differential form ω is given and dω = 0 has already been computed; you want to know whether it is the exterior derivative of some η. Being closed is only a necessary condition; being exact depends on the **region**.

**Steps.** First compute dω to confirm that the form is closed → then check whether the region U is contractible → if it is contractible, construct η by the Poincaré lemma → if it is not, do not assert “not exact”; instead look for an obstruction on the concrete region (the angle form on the punctured plane is the standard comparison).

**Why the first step has to be deciding the region.** “Closed ⇒ exact” holds on contractible regions and fails on general ones, and the two statements look exactly alike — only the region differs. So the heart of the method is not computation but fixing the conditions under which it applies.

**Scope of failure.** When the region is not contractible the method **cannot** conclude that ω is not exact; it can only say that the Poincaré lemma does not apply. A negative conclusion requires a separate computation of the cohomology class. Moreover “closed + contractible ⇒ exact” is a sufficient condition, not a necessary and sufficient one.

**Review question.** Why is the angle form on the punctured plane the key comparison example? It is useful in both directions at once: on the punctured plane it is closed but not exact, while restricted to any contractible subregion it becomes exact.`,
};

export default cases;
