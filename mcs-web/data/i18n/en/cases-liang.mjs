/**
 * 案例 07（`liang`）正文块的英文覆盖：`<!-- node:id -->` 块 id → 英文 Markdown。
 *
 * 源：`data/cases/07-liang-dg.md`（教材《微分几何入门与广义相对论》上册的凝练路径，
 * 60 个块、约 11600 汉字）。术语与 `data/i18n/en/liang.mjs` 的 63 个节点元数据
 * 以及 `data/i18n/glossary.mjs` 的相对论/宇宙论词条**同一套说法**。
 *
 * ## 译者约定（与 `cases.mjs`、施工手册 §2 一致）
 *
 * - 公式从不翻译：`$$…$$` 与 `$…$` 的**内容逐字保留**（只有 `\text{…}` 里的说明文字随语种改）；
 * - 标题层级、`/nodes/<id>` 链接、`C^k`/`C¹` 这类记号原样保留；
 * - **段落分块数与每段的加粗引导词一一对应**：中文源的教学骨架是「每段一个论点」，
 *   合并段落等于改变论证结构，工具会当场报错；
 * - 引导词沿用站点既有译法：`**动机。** → **Motivation.**`、`**边界与对照。** →
 *   **Boundary and comparison.**`（站点既有 `**边界。** → **Boundary.**`）、
 *   `**回看提问。** → **Review question.**`、`**什么时候用。** → **When to use it.**`、
 *   `**步骤。** → **Steps.**`、`**失效范围。** → **Scope of failure.**`、
 *   `**为什么这个顺序最自然。** → **Why this order is the most natural one.**`；
 *   新定的两条：`**形式。** → **Form.**`、`**为什么这条策略是全局的。** →
 *   **Why this strategy is a global one.**`；
 * - 物理与几何的限定词（「局部的」「在无挠假设下」「近似」…）一个都不省；
 *   「未主张 / 未编码为证书」译成 `not claimed` / `not encoded as a certificate`，不抬高。
 *
 * 登记提醒：本文件需要在 `data/i18n/index.mjs` 的 REGISTRY `cases` 一节登记才会生效（归 Lead）。
 */

const cases = {
  /* —— 第 1 章 拓扑空间简介 —— */

  'liang:topological-space': `## Topological spaces

**Motivation.** On the real line one talks about “continuity” using $\\varepsilon$-$\\delta$, that is, using distance. But the only information continuity really uses is “which points count as next to each other”; throw away the numerical value of the distance and keep only the open sets, and one obtains a topological space. This is the smallest structure in the whole book, and the point on which every later notion of “local” rests.

**Form.** A topology $\\mathcal{T} \\subseteq \\mathcal{P}(X)$ on a set $X$ requires: $\\varnothing, X \\in \\mathcal{T}$; closure under finite intersections; closure under arbitrary unions. The members of $\\mathcal{T}$ are called open sets, and $(X, \\mathcal{T})$ is called a topological space. A closed set is the complement of an open set.

**Boundary and comparison.** The axioms contain **no** separation condition. Drop Hausdorff and the limit of a sequence need not be unique: in the trivial topology $\\mathcal{T} = \\{\\varnothing, X\\}$, every point is a limit of every sequence. A topology is also not something a set carries by itself — put the discrete topology and the trivial topology on the same set and convergence behaves completely differently.

**Review question.** Why can “finite intersections” not be relaxed to “arbitrary intersections”? (Consider $\\bigcap_n (-1/n, 1/n)$ on the real line.)`,

  'liang:continuous-map': `## Continuous maps and homeomorphisms

**Motivation.** Once open sets are available, “continuous” no longer has to depend on distance: continuous means “does not tear open sets apart”. This definition turns continuity in analysis into a purely set-theoretic condition, and it also gives a precise meaning to “two spaces have the same structure”.

**Form.** $f: X \\to Y$ is continuous if and only if the preimage of every open set in $Y$ is open in $X$. $f$ is a homeomorphism if and only if $f$ is a bijection and both $f$ and $f^{-1}$ are continuous.

**Boundary and comparison.** Continuity is relative to **the topologies on both sides**: change the topology on either side and the same map may fail to be continuous. A homeomorphism preserves topological properties (compactness, connectedness, countability) and does **not** preserve lengths, angles or curvature — so “the same topologically” and “the same geometrically” are two different things.

**Review question.** Why is “$f$ is continuous and a bijection” still not enough to call it a homeomorphism? (Find a continuous bijection whose inverse is not continuous: $[0,1) \\to S^1$.)`,

  'liang:compactness': `## Compactness

**Motivation.** Almost every genuinely useful theorem in analysis needs to “extract finitely many pieces of information out of infinitely many local ones”: Heine–Borel, uniform continuity, existence of extrema. Compactness is the abstract form of that operation.

**Form.** $X$ is compact if and only if every open cover of it has a finite subcover.

**Boundary and comparison.** Compactness is a topological property and is invariant under homeomorphism. In a general topological space compactness does **not** imply sequential compactness — the latter also needs first countability (the textbook marks this section as optional reading precisely because the compactness theory of general topology goes beyond what this book needs). “Bounded and closed” is equivalent to compactness only in $\\mathbb{R}^n$ and cannot be carried elsewhere.

**Review question.** Why is $(0,1)$ not compact while $[0,1]$ is? Write the cover out as a concrete family of open intervals.`,

  'liang:manifold': `## Differentiable manifolds

**Motivation.** The sphere has no global coordinates, yet every small piece of it looks like a plane. So “use $\\mathbb{R}^n$ coordinates locally and glue them together globally by an atlas” becomes the most natural scheme for doing calculus on curved spaces.

**Form.** $M$ is a Hausdorff, second-countable topological space, and there is an open cover $\\{U_\\alpha\\}$ together with homeomorphisms $\\varphi_\\alpha: U_\\alpha \\to \\mathbb{R}^n$ onto open subsets, such that every coordinate change $\\varphi_\\beta \\circ \\varphi_\\alpha^{-1}$ on an overlap is $C^\\infty$. This family of charts, together with maximality, gives a smooth structure.

**Boundary and comparison.** Coordinates are local: $S^2$ needs at least two stereographic charts. Second countability **cannot be deleted** — without it one loses partitions of unity, and with them the tool for globalising local definitions (the integration of Chapter 5 depends on exactly that).

**Review question.** How many mutually incompatible smooth structures can one topological manifold carry? What does that mean for the intuition behind “manifold”?`,

  'liang:tangent-vector': `## Tangent vectors

**Motivation.** To speak of “direction” and “rate of change” one has to build a linear space at a point of a curved space. There is no external $\\mathbb{R}^N$ to borrow from, so one can only use the curves of the manifold itself.

**Form.** Two smooth curves $\\gamma_1, \\gamma_2$ through $p$ are equivalent if there is (equivalently: if for every) coordinate chart $(\\varphi \\circ \\gamma_1)'(0) = (\\varphi \\circ \\gamma_2)'(0)$. The equivalence class is a tangent vector at $p$, and the set $T_pM$ of all of them is an $n$-dimensional real vector space.

**Boundary and comparison.** The equivalence depends on the smooth structure but not on the choice of coordinate chart. A tangent vector is **not** “an arrow sticking out of $p$”: it carries no global information about the curve, only its first-order behaviour — so information such as “walk around a closed loop and come back” is not in $T_pM$; that is a matter for curvature.

**Review question.** If only a $C^1$ structure were required, could the equivalence-class definition above be carried over as it stands? (Yes; but the later proofs would need higher order everywhere, which is exactly why this book requires $C^\\infty$.)`,

  'liang:vector-field': `## Vector fields

**Motivation.** A direction at a single point is not enough; to speak of “flow” and “change” one needs a tangent vector at every point, and it has to vary smoothly with the point.

**Form.** A vector field is a map $v: M \\to TM$ satisfying $\\pi \\circ v = \\mathrm{id}_M$; smoothness is decided in any one coordinate chart: the components $v^\\mu(x)$ are $C^\\infty$. Integral curves turn the vector field into a “flow”, a one-parameter group of diffeomorphisms.

**Boundary and comparison.** Smoothness is a local property, but it must hold for **every** chart of the cover — checking one chart is not enough. A vector field differs from “a family of tangent vectors”: the latter needs neither smoothness nor continuity, and no flow can be spoken of.

**Review question.** Why do integral curves always exist and are unique locally when $v \\neq 0$? (Write the equation as $dx^\\mu/d\\lambda = v^\\mu(x)$ and use the fundamental theorem of ordinary differential equations.)`,

  'liang:dual-vector-field': `## Dual vector fields

**Motivation.** “The derivative along a direction” needs a machine that turns vectors into numbers. The differential $df$ of a function $f$ is exactly such a machine, and it is itself an object that varies smoothly with the point.

**Form.** A dual vector field is a smooth map $\\omega: M \\to T^*M$ such that $\\omega|_p \\in T_p^*M$ is a linear function on $T_pM$. $df$ is defined by $df(v) = v(f)$.

**Boundary and comparison.** Dual vectors and vectors are not objects of the same space; **without a metric the two cannot be naturally identified** — a point that keeps mattering after Chapter 2 (raising and lowering indices needs the metric, not the manifold).

**Review question.** On a connected manifold, is $df = 0$ equivalent to “$f$ is constant”? (Yes; explain where connectedness is used.)`,

  'liang:tensor-field': `## Tensor fields and contraction

**Motivation.** The metric has to eat two vectors, the curvature three, and the energy-momentum tensor is to be given two — objects that “eat several vectors and dual vectors and are linear in each variable” need a single name.

**Form.** A tensor field of type $(k,l)$ maps, at every point, $k$ dual vectors and $l$ vectors to a real number, linearly in each variable, with components that are $C^\\infty$ in every coordinate chart. Contraction pairs one upper with one lower index and sums, producing a tensor of one order lower.

**Boundary and comparison.** Contraction must pair **one upper with one lower** index: two upper indices cannot be contracted with each other. “Components transform by the tensor transformation law” is a criterion, not the definition; only once the definition is in place can a criterion be discussed, and reversing that order is exactly the root of mistaking the Christoffel symbols for a tensor (see the misconception “treating the Christoffel symbols as a tensor”).

**Review question.** What information does writing “contraction” itself in abstract index notation require? (Only the pairing of indices, no coordinates; this is exactly the starting point of the abstract index notation of the next section.)`,

  'liang:metric-tensor': `## The metric tensor field

**Motivation.** A manifold alone still cannot speak of length, angle or time. The metric is extra geometric information attached to it; it decides “which curve is longer” and “which two directions are orthogonal”, and it also decides how all the later kinematics look.

**Form.** The metric $g$ is a symmetric, non-degenerate smooth tensor field of type $(0,2)$ on $M$: $g_{ab} = g_{ba}$, and the matrix $(g_{\\mu\\nu})$ is invertible everywhere. It gives the line element $ds^2 = g_{\\mu\\nu}dx^\\mu dx^\\nu$, and indices are raised and lowered with $g$ and its inverse.

**Boundary and comparison.** Non-degeneracy **cannot be deleted**: when the metric is degenerate the inverse metric does not exist, and raising and lowering indices and “taking a unit normal vector” all fail completely. A Riemannian metric is required to be positive definite; a Lorentzian metric only has to be non-degenerate with signature $(-,+,+,+)$, so it **gives no notion of “positive length”** — the square of a timelike interval is negative.

**Review question.** Why is non-degeneracy the entire cost of raising indices? Give an example of a symmetric degenerate bilinear form and explain why it cannot raise indices.`,

  'liang:abstract-index': `## Abstract index notation

**Motivation.** Component notation buries the “type” inside the coordinates: a mistake in upper and lower indices often only shows up when the result fails to match. Abstract indices lift the type to the level of notation, so that a wrong expression **cannot be written down**.

**Form.** Abstract indices $a,b,c,\\dots$ mark only the type of a tensor and the pairing of contractions; they depend on no coordinate basis. The rules: free indices on the two sides of an equation must balance one upper against one lower; a contraction must pair one upper with one lower index; a repeated index means summation (Einstein convention). For example $T^a{}_b$ and $\\nabla_a \\omega_b$.

**Boundary and comparison.** Abstract indices are **not** component indices: writing $T^a{}_b$ does not choose any basis. Balancing is a condition for the notation to be legal, not a mathematical conclusion — a legally written equation can still be false.

**Review question.** Write “the transformation law of the Christoffel symbols acquires one inhomogeneous term” in this notation, and see why that term is exactly what destroys tensoriality.`,

  /* —— 第 3 章 黎曼（内禀）曲率张量 —— */

  'liang:derivative-operator': `## Derivative operators

**Motivation.** In flat space one can differentiate components directly; on a general manifold the components at different points belong to different bases, and subtracting them directly is meaningless. A derivative operator supplies exactly the missing structure: how to put objects at two points into one space and compare them.

**Form.** $\\nabla$ maps a tensor field of type $(k,l)$ to one of type $(k,l+1)$ and satisfies: linearity; the Leibniz rule $\\nabla_a(TS) = T\\nabla_a S + S\\nabla_a T$; commutation with contraction; and $\\nabla_a f = df$ on functions.

**Boundary and comparison.** “Commutation with contraction” cannot be deleted — without it one obtains pseudo-operators that look like derivatives only in particular coordinates. On a general manifold there is **no** natural derivative operator: $\\nabla$ is extra structure, not something a manifold carries by itself. The same manifold can carry two different $\\nabla$, and they give different curvatures.

**Review question.** Why must the clause $\\nabla_a f = df$ be written into the definition? (Because the first derivative of a function can have only one answer; otherwise $\\nabla$ would be decoupled from the differential.)`,

  'liang:christoffel': `## The derivative operator compatible with the metric, and the Christoffel symbols

**Motivation.** Once a metric is available, one naturally wants “comparison” to be compatible with it: parallel-transported vectors keep their length and their angles. This requirement, together with torsion-freeness, pins down exactly one derivative operator.

**Form.** There is a unique $\\nabla$ satisfying both $\\nabla_a g_{bc} = 0$ and vanishing torsion $T^c{}_{ab} = 0$; its components are
$$\\Gamma^\\mu{}_{\\nu\\sigma} = \\tfrac{1}{2}g^{\\mu\\rho}\\left(\\partial_\\nu g_{\\rho\\sigma} + \\partial_\\sigma g_{\\rho\\nu} - \\partial_\\rho g_{\\nu\\sigma}\\right).$$

**Boundary and comparison.** Uniqueness uses “compatibility” and “torsion-freeness” **at the same time**: requiring compatibility alone leaves infinitely many connections (one may add an arbitrary antisymmetric torsion part). The Christoffel symbols are **not a tensor**: an inhomogeneous term appears in the transformation law, so “$\\Gamma$ vanishes at some point” is not a coordinate-independent statement — in flat space, polar coordinates already make $\\Gamma \\neq 0$.

**Review question.** Why is “$\\Gamma^\\mu{}_{\\nu\\sigma}$ vanishes identically at some point” equivalent to “a local inertial frame can be chosen at that point”, while this **does not** mean that spacetime is flat?`,

  'liang:parallel-transport': `## Parallel transport along a curve

**Motivation.** “Moving one and the same vector to another point” has no unique answer in a curved space. Since it is not unique, one **defines** it by a rule: transport along a given curve, and require that the process does not change the “direction” of the vector.

**Form.** A vector parallel-transported along a curve $\\gamma$ (with tangent vector $t^a$) satisfies $t^a\\nabla_a v^b = 0$; the derivative of a vector along a curve is written $t^a\\nabla_a v^b$.

**Boundary and comparison.** Transport **depends on the curve**: on a general manifold, carrying the same vector to the same point along different curves can give different results — and that difference is exactly where curvature comes from (Section 3.4). So one cannot speak of “transporting the vectors at two points to each other” without a curve.

**Review question.** In polar coordinates in flat space, transport a vector along a curve: do the non-zero components of $\\Gamma$ show up? (Yes; distinguish “apparent change caused by the coordinates” from “a genuine geometric rotation”.)`,

  'liang:geodesic': `## Geodesics

**Motivation.** How should “the straightest possible line” be defined in a curved space? One workable answer is: the tangent vector is transported along itself — that is, the line **does not turn**.

**Form.** A geodesic satisfies $t^a\\nabla_a t^b = 0$; in coordinates,
$$\\frac{d^2x^\\mu}{d\\lambda^2} + \\Gamma^\\mu{}_{\\nu\\sigma}\\frac{dx^\\nu}{d\\lambda}\\frac{dx^\\sigma}{d\\lambda} = 0,$$
where $\\lambda$ is called an affine parameter.

**Boundary and comparison.** The affine parameter admits only a further affine transformation $\\lambda \\mapsto a\\lambda + b$; with a non-affine parameter the equation acquires an extra term. A geodesic gives a **local** extremum only, not a global shortest path: a great circle on the sphere is a geodesic, but after going round several times it is no longer the shortest.

**Review question.** Why are timelike geodesics in Lorentzian spacetime the worldlines of free particles? (Write out the isochronous variation (the first variation with fixed endpoints) and look at the extremal condition for $\\int d\\tau$.)`,

  'liang:riemann-tensor': `## The Riemann curvature tensor

**Motivation.** Transport depends on the curve, and that fact is itself the quantitative entry point to “curvature”: transport a vector around a loop along two different paths — through how large an angle does it turn?

**Form.** It is defined by the commutator of two derivative operators: $(\\nabla_a\\nabla_b - \\nabla_b\\nabla_a)\\omega_c = R^d{}_{cab}\\omega_d$. Equivalently, the transport difference around an infinitesimal closed loop is measured by $R^a{}_{bcd}$.

**Boundary and comparison.** Curvature is a property of $\\nabla$, **not** of the manifold: different connections on the same manifold give different curvatures. The antisymmetries of $R^a{}_{bcd}$, the pair symmetries and the Bianchi identities all use torsion-freeness; drop it and they no longer hold.

**Review question.** Why is “$R^a{}_{bcd} = 0$” equivalent to “transport around every closed loop is the identity”? (This is where the whole geometric content of curvature lies.)`,

  'liang:ricci-einstein': `## The Ricci tensor, the scalar curvature and the Einstein tensor

**Motivation.** The curvature tensor has four indices and is heavy to use. What physics cares about is the part that says “how does volume change”, and that is exactly one contraction of the curvature.

**Form.** $R_{ac} = R^b{}_{abc}$, $R = g^{ab}R_{ab}$, $G_{ab} = R_{ab} - \\tfrac{1}{2}Rg_{ab}$. The Bianchi identities give $\\nabla^a G_{ab} = 0$.

**Boundary and comparison.** The Ricci tensor **throws away** information contained in the Riemann tensor: the Weyl part contributes nothing to the Ricci tensor, so a vacuum region with $R_{ab} = 0$ can still be curved (gravitational waves and tidal forces live precisely there). $\\nabla^a G_{ab} = 0$ is a geometric identity that holds before any field equation — it is exactly the source of the self-consistency of the field equations.

**Review question.** Why put $G_{ab}$ rather than $R_{ab}$ on the left-hand side of the field equations? (Hint: one needs $\\nabla^a T_{ab} = 0$ to hold automatically.)`,

  'liang:intrinsic-extrinsic-curvature': `## Intrinsic and extrinsic curvature

**Motivation.** There are two kinds of “bending”: one that a two-dimensional bug living in the surface could measure by itself (intrinsic), and one that exists only as seen from outside (extrinsic curvature). Separating the two is what keeps intuitions such as “a cylinder looks bent” from misleading us.

**Form.** The intrinsic curvature is computed from the **induced metric** on the submanifold via its own Riemann tensor; the extrinsic curvature $K_{ab}$ is given by the embedding (one half of the derivative of the normal vector along tangential directions).

**Boundary and comparison.** Extrinsic curvature is **not** intrinsic to the submanifold: the same intrinsic geometry can have different embeddings and hence different extrinsic curvatures. The standard comparison is the cylinder — intrinsically flat (Riemann tensor zero) with non-zero extrinsic curvature, and cutting it open and flattening it changes no intrinsic distance.

**Review question.** What are the intrinsic and the extrinsic curvature of the sphere? Why is it only the intrinsic curvature that can enter the physical laws of a two-dimensional bug?`,

  'liang:pushforward-pullback': `## Maps between manifolds, pushforwards and pullbacks

**Motivation.** To compare structures on two manifolds one has to know where a map sends vectors and dual vectors. The directions matter: pushforwards of vectors go along the map, pullbacks of dual vectors go against it.

**Form.** $\\varphi: M \\to N$ induces a pushforward $\\varphi_*: T_pM \\to T_{\\varphi(p)}N$ and a pullback $\\varphi^*: T^*_{\\varphi(p)}N \\to T^*_pM$, satisfying $\\varphi_*(v)(f) = v(f \\circ \\varphi)$.

**Boundary and comparison.** The pushforward sends vectors forwards, but acts on functions as a pullback. When $\\varphi$ is not injective one **cannot** use $\\varphi_*$ to push a vector field on $N$ back to $M$ — this is not a technical limitation but the fact that there is no way to choose when two source points map to the same point. Pushforward and pullback are mutually inverse only when $\\varphi$ is a diffeomorphism.

**Review question.** Why is “the pullback of a tensor field” defined for an arbitrary smooth $\\varphi$, while the “pushforward” needs a homeomorphism?`,

  'liang:lie-derivative': `## The Lie derivative

**Motivation.** Transport needs a connection, but sometimes the question we want to ask is a different one: follow the flow of a vector field for a little while — by how much has a tensor field changed? This question needs no extra structure at all.

**Form.** $\\mathcal{L}_v T = \\lim_{t\\to 0}\\frac{\\varphi_{-t}^*T - T}{t}$, where $\\varphi_t$ is the one-parameter group of diffeomorphisms generated by $v$. For vector fields, $\\mathcal{L}_v w = [v,w]$.

**Boundary and comparison.** The Lie derivative **needs no connection**, so it and $\\nabla$ are two different operators: $\\nabla$ compares point by point, $\\mathcal{L}$ compares along a flow. For vector fields the Lie derivative is the Lie bracket, not “differentiating the components one by one in the direction”.

**Review question.** Write $\\mathcal{L}_v w^\\mu$ in coordinates and compare it with $v^\\sigma\\partial_\\sigma w^\\mu - w^\\sigma\\partial_\\sigma v^\\mu$: why is it “first order” in both $v$ and $w$?`,

  'liang:killing-field': `## Killing vector fields

**Motivation.** Symmetry makes equations solvable. A symmetry of spacetime is “shift a little in some direction and the metric does not change” — which is exactly the vanishing of the Lie derivative.

**Form.** $\\mathcal{L}_\\xi g_{ab} = 0$, equivalently the Killing equation $\\nabla_a\\xi_b + \\nabla_b\\xi_a = 0$; its integral curves form a one-parameter group of isometries.

**Boundary and comparison.** Writing it as $\\nabla_a\\xi_b + \\nabla_b\\xi_a = 0$ requires first taking the $\\nabla$ compatible with the metric; the definition itself is $\\mathcal{L}_\\xi g = 0$. An $n$-dimensional spacetime has at most $n(n+1)/2$ independent Killing fields; reaching the bound means a maximally symmetric spacetime (Minkowski and constant-curvature spacetimes). **With too little symmetry there are no conserved quantities** — this is the watershed for whether the geodesic equations are integrable later on.

**Review question.** Which two Killing fields in Schwarzschild spacetime give conservation of energy and of angular momentum? If spherical symmetry is replaced by axial symmetry, what appears and what is lost?`,

  /* —— 第 4–5 章 李导数、Killing 场、超曲面；微分形式及其积分 —— */

  'liang:hypersurface': `## Hypersurfaces and normal vectors

**Motivation.** Black-hole horizons, stellar surfaces and the spatial sections of the universe are all objects “of codimension 1”. Studying them requires inducing the structure of the ambient manifold onto them.

**Form.** When $S$ is given locally by $f = \\mathrm{const}$ (with $df \\neq 0$), $n_a = \\nabla_a f$ is a normal covector; if $S$ is spacelike or timelike it can be normalised to a normal vector, and a metric $h_{ab}$ on $S$ is induced.

**Boundary and comparison.** A normal vector can be spacelike, timelike or **null**; a null hypersurface (such as an event horizon) cannot be normalised and the induced metric is degenerate — this is not a technical blemish but the geometric source of the “one-way” character of a horizon. $f = \\mathrm{const}$ is only a local description; a global hypersurface need not be a level set of any function.

**Review question.** Why is the induced metric on the surface $r = r_s$ (the horizon) degenerate? What does that mean for “which clocks can be hung on the horizon”?`,

  'liang:differential-form': `## Differential forms and the wedge product

**Motivation.** Integration needs an “oriented volume element”, but the ordinary product of tensors carries no sign information. Making a multilinear object **totally antisymmetric** produces forms, which carry signs naturally.

**Form.** A $p$-form is at each point a totally antisymmetric multilinear map, and the whole is denoted $\\Omega^p(M)$. The wedge product satisfies $\\omega \\wedge \\eta = (-1)^{pq}\\eta \\wedge \\omega$ (with $\\omega$ a $p$-form and $\\eta$ a $q$-form).

**Boundary and comparison.** Total antisymmetry is the core of the definition: treating an ordinary “multilinear” object as a form makes one get the sign wrong when the order is swapped. For $p > n$ one has $\\Omega^p(M) = \\{0\\}$ — this is not a technical detail but the source of the finiteness of the exterior algebra, and the reason why “on an $n$-dimensional manifold there are no forms of degree higher than $n$”.

**Review question.** Why does $\\omega \\wedge \\omega = 0$ hold for forms of odd degree but not necessarily for forms of even degree?`,

  'liang:exterior-derivative': `## The exterior derivative and closed forms

**Motivation.** One wants a derivative that is independent of coordinates and that turns “boundary” into algebra. The exterior derivative $d$ strings Newton–Leibniz, Green, Gauss and Stokes together in a single formula.

**Form.** $d$ is uniquely determined by $df(v) = v(f)$ and $d(\\omega \\wedge \\eta) = d\\omega \\wedge \\eta + (-1)^p\\omega \\wedge d\\eta$; one always has $d(d\\omega) = 0$. A form with $d\\omega = 0$ is called closed, and a form with $\\omega = d\\eta$ is called exact.

**Boundary and comparison.** “Exact $\\Rightarrow$ closed” always holds; “closed $\\Rightarrow$ exact” holds **only on contractible regions**, and in general the obstruction is measured by de Rham cohomology — the angle form on the punctured plane is the standard counterexample. $d$ needs no extra structure, whereas $\\nabla$ needs a connection; conflating the two loses this distinction.

**Review question.** Why are $d^2 = 0$ and “mixed partial derivatives commute” the same thing? Where is $C^\\infty$ used?`,

  'liang:volume-element': `## The volume element and integration on manifolds

**Motivation.** To integrate a “total amount” on a curved space one first has to decide “how large a small piece is”. This needs two things: an orientation and (when a metric is present) the metric.

**Form.** On an oriented $n$-dimensional manifold one takes a nowhere-vanishing $n$-form $\\varepsilon$ as the volume element and sets $\\int_M f = \\int f\\varepsilon$. When a metric is present, in coordinates $\\varepsilon = \\sqrt{|\\det g|}\\,dx^1 \\wedge \\cdots \\wedge dx^n$.

**Boundary and comparison.** A volume element needs an **orientation**: on a non-orientable manifold (such as the Möbius band) no globally non-zero $n$-form exists. Without a metric the volume element is **not unique** — any nowhere-vanishing $n$-form will do, and the value of the integral changes accordingly.

**Review question.** Why does the volume element in a Lorentzian metric contain $\\sqrt{|\\det g|}$ rather than $\\sqrt{\\det g}$?`,

  'liang:stokes-theorem': `## Stokes’ theorem

**Motivation.** The intuition “the integral of a derivative over the interior = the values on the boundary” takes a single line in the language of forms. It is the point at which the calculus part of the book converges.

**Form.** $\\displaystyle\\int_M d\\omega = \\int_{\\partial M}\\omega$, where $M$ is an oriented $n$-dimensional manifold with boundary, $\\omega$ is a compactly supported $(n-1)$-form, and $\\partial M$ carries the induced orientation.

**Boundary and comparison.** It needs an **orientation**, and it also needs $\\omega$ to be compactly supported (or $M$ compact); otherwise either side may fail to converge. It unifies Newton–Leibniz, Green, Gauss and the classical Stokes theorem into one statement: they differ only in “which form is substituted”.

**Review question.** Take $\\omega$ to be a function on a one-dimensional manifold, and $P\\,dx + Q\\,dy$ on a two-dimensional region: which classical formula does each give?`,

  'liang:gauss-theorem': `## Gauss’ theorem and dual differential forms

**Motivation.** To speak of “flux” in an $n$-dimensional space one has to match $(n-1)$-forms with 1-forms. The Hodge dual is that translation machine, and Gauss’ theorem is Stokes’ theorem rewritten after dualising.

**Form.** The Hodge dual $*$ maps $p$-forms linearly isomorphically onto $(n-p)$-forms; in coordinates $*(dx^{i_1}\\wedge\\cdots\\wedge dx^{i_p}) = \\frac{\\sqrt{|g|}}{(n-p)!}\\varepsilon_{i_1\\cdots i_p j_1\\cdots j_{n-p}}dx^{j_1}\\wedge\\cdots$. Gauss’ theorem is Stokes’ theorem applied to the dual form.

**Boundary and comparison.** The Hodge dual depends on **the metric and the orientation**; without a metric one can only say that “there exists an isomorphism matching $p$-forms with $(n-p)$-forms”. $*(*\\omega) = (-1)^{p(n-p)}s\\,\\omega$, where the sign is determined by the signature $s$ — the easiest place to slip — and under Lorentzian signature $*(*F) = -F$.

**Review question.** Why is $*(*F) = -F$ in Lorentzian spacetime? At which step does this minus sign appear in Maxwell’s equations?`,

  'liang:minkowski-spacetime': `## Minkowski spacetime

**Motivation.** The tools built from Chapter 1 to Chapter 5 have their first large-scale use in rewriting special relativity. To bring “time” and “space” into one geometric object, the metric has to change signature.

**Form.** $\\eta_{ab} = \\mathrm{diag}(-1,1,1,1)$; the interval $\\eta_{ab}\\Delta x^a\\Delta x^b$ between two events is accordingly classified as timelike ($<0$), null ($=0$) or spacelike ($>0$).

**Boundary and comparison.** A Lorentzian metric **gives no notion of “positive length”**: the square of a timelike interval is negative, so the metric cannot be used as a Riemannian one (this also explains the absolute value in the volume element). Coordinate transformations between inertial frames are Lorentz transformations, **not** arbitrary coordinate transformations.

**Review question.** Why is “null” an intrinsic division rather than a coordinate convention? (Hint: $\\eta_{ab}\\Delta x^a\\Delta x^b$ is a scalar.)`,

  'liang:inertial-observer': `## Inertial observers and inertial frames

**Motivation.** In relativity there is no “absolute rest”, only the worldlines of observers. Defining an “observer that feels no force” as a geodesic connects kinematics to geometry.

**Form.** The worldline of an inertial observer is a timelike geodesic; its 4-velocity $u^a = dx^a/d\\tau$ satisfies $u^a u_a = -1$ and $u^b\\nabla_b u^a = 0$.

**Boundary and comparison.** An inertial frame is a **global** notion and exists only in flat spacetime; in curved spacetime there are in general only local inertial frames (Section 7.5). An “observer” is a worldline, not a person: any timelike curve can be the worldline of some observer, though not necessarily an inertial one.

**Review question.** The worldline of an accelerating observer is not a geodesic; is his 4-velocity still orthogonal to itself? (Yes; $u^a u_a = -1$ holds along any timelike curve.)`,

  'liang:proper-time': `## Proper time and coordinate time

**Motivation.** In relativity everyone’s own clock runs differently, and a clock reading has to be a measurable quantity. Proper time is exactly the reading obtained by integrating along a worldline.

**Form.** Along a timelike worldline $d\\tau = \\sqrt{-\\eta_{ab}dx^a dx^b}$, that is, $d\\tau = dt/\\gamma$ with $\\gamma = 1/\\sqrt{1-v^2}$; the coordinate time $t$ is the coordinate of an inertial frame.

**Boundary and comparison.** Proper time is an **invariant of the worldline**, whereas coordinate time depends on the reference frame; the two agree only at the observer itself (in its instantaneous inertial frame). A null curve satisfies $d\\tau = 0$: a photon has no proper time, and there is no “clock of a photon”.

**Review question.** Why is $\\int d\\tau$ different along two different worldlines? How is that related to the twin effect?`,

  'liang:kinematic-effects': `## Length contraction, time dilation and the twin effect

**Motivation.** Once “simultaneity” depends on the reference frame, the measurement of lengths and of time intervals necessarily depends on the reference frame. The three classical effects are different faces of one and the same fact.

**Form.** A length along the direction of motion is $L = L_0/\\gamma$; time dilation is $d\\tau = dt/\\gamma$; the proper-time difference in the twin effect is given by the different lengths of the two worldlines.

**Boundary and comparison.** “Length contraction” is not the object being squeezed, but the result of a measurement after a **convention about simultaneity**: in the object’s own frame it has not become shorter. The twin effect does not violate the principle of relativity — the proper times of the two worldlines were different to begin with, one of them must undergo acceleration, and the two are not on an equal footing.

**Review question.** Why is the “twin paradox” not a contradiction inside special relativity? Point out at which step acceleration is used.`,

  /* —— 第 6 章 狭义相对论 —— */

  'liang:four-momentum': `## 4-velocity, 4-momentum and particle dynamics

**Motivation.** To rewrite Newtonian mechanics in geometric form, the plainest formula of all, “mass times velocity”, needs a four-dimensional counterpart.

**Form.** $p^a = mu^a$ and $p^ap_a = -m^2$; the 4-force $f^a = u^b\\nabla_b p^a$ is orthogonal to $p^a$.

**Boundary and comparison.** The rest mass $m$ is a scalar; the time component of the 4-momentum corresponds to energy in Newtonian mechanics only **after a reference frame has been specified**. A particle of zero rest mass ($m=0$) moves along a null geodesic and cannot be described by $p^a = mu^a$.

**Review question.** Why is $f^a$ orthogonal to $p^a$? (Differentiate $p^ap_a = -m^2$ along the worldline.)`,

  'liang:energy-momentum-tensor': `## The energy-momentum tensor and perfect fluids

**Motivation.** The right-hand side of the field equations needs a quantity that can describe “how the distribution of matter curves spacetime”, and it has to be finer than the 4-momentum: there must be information at every point and in every direction.

**Form.** $T_{ab}$ is symmetric and conserved, $\\nabla^aT_{ab} = 0$; for a perfect fluid $T_{ab} = (\\rho+p)u_au_b + pg_{ab}$.

**Boundary and comparison.** Conservation $\\nabla^aT_{ab} = 0$ is conservation with respect to $\\nabla$; in curved spacetime it **cannot** in general be written as the vanishing of an ordinary coordinate divergence. The perfect-fluid assumption is that there is no viscosity and no heat flow — dropping it requires adding the corresponding terms, and the form of the conclusions changes accordingly.

**Review question.** Write $\\nabla^aT_{ab} = 0$ out in the static, spherically symmetric case: which equation do you get? (The TOV equation of Section 9.3.)`,

  'liang:electromagnetic-tensor': `## The electromagnetic field tensor and Maxwell’s equations

**Motivation.** The electric and magnetic fields turn into each other in different inertial frames, which shows that they are not two independent objects. Combining them into one antisymmetric tensor turns Maxwell’s equations into two geometric equations.

**Form.** $F_{ab} = \\nabla_aA_b - \\nabla_bA_a$ is antisymmetric; Maxwell’s equations are $\\nabla^aF_{ab} = -4\\pi J_b$ and $\\nabla_{[a}F_{bc]} = 0$; the electromagnetic energy-momentum tensor is given by a quadratic expression in $F$.

**Boundary and comparison.** The antisymmetry of $F$ comes from the gauge structure of $A$; $\\nabla_{[a}F_{bc]} = 0$ is equivalent to the local existence of $A$. Conservation of current, $\\nabla^aJ_a = 0$, is **derived** from the field equations together with antisymmetry, not assumed separately.

**Review question.** Why does $\\nabla^aJ_a = 0$ not need a separate assumption? (Apply $\\nabla^b$ once more to $\\nabla^aF_{ab} = -4\\pi J_b$, and use the antisymmetry of $F$.)`,

  'liang:four-potential': `## The electromagnetic 4-potential and the light-wave Doppler effect

**Motivation.** Maxwell’s equations are second-order equations for $A$, easier to solve than the first-order equations for $F$; and the frequency shift of light is the most direct geometric quantity relating the 4-wavevector to the observer’s 4-velocity.

**Form.** In the Lorenz gauge $\\nabla^aA_a = 0$ one has $\\nabla^b\\nabla_bA_a = -4\\pi J_a$; the photon 4-wavevector $k^a$ is null, and an observer measures the frequency $\\omega = -k_au^a$.

**Boundary and comparison.** The gauge is not unique: $A_a \\to A_a + \\nabla_a\\chi$ leaves $F$ unchanged; the Lorenz gauge is only a convenient choice, not a physical condition. The Doppler formula holds in curved spacetime as well, but how the frequency changes along a ray has to be discussed through $k^a\\nabla_a\\omega$.

**Review question.** Why $\\omega = -k_au^a$ rather than some other sign combination of $k^au_a$? (Check it with a static observer, $u^a = (\\partial_t)^a$.)`,

  'liang:gravity-as-geometry': `## Gravity and the geometry of spacetime

**Motivation.** The equivalence principle says that “gravity” can locally be imitated by an accelerating frame. If so, there is no need to treat it as a force — folding it into the geometry of spacetime is both less trouble and more unified.

**Form.** A free particle moves along a timelike (or null) geodesic of spacetime; gravity no longer appears in the equations of motion but is encoded in the metric $g_{ab}$.

**Boundary and comparison.** This is a **choice** of the theory, not a theorem: the equivalence principle rules out distinguishing gravity from an accelerating frame by local experiments, but it does not logically imply that “gravity is curvature”. The real watershed is the tidal effect — that one cannot be removed.

**Review question.** If gravity is only geometry, why is there still talk of “gravitational waves carrying energy”? How is energy defined in general relativity?`,

  'liang:equivalence-principle': `## The equivalence principle and local inertial frames

**Motivation.** In a freely falling lift, gravity “disappears”. Turning that sentence into mathematics gives: at any point one can choose coordinates in which $g_{ab} = \\eta_{ab}$ and $\\Gamma = 0$.

**Form.** At any point $p$ one can choose Riemann normal coordinates with $g_{ab}(p) = \\eta_{ab}$ and $\\Gamma^\\mu{}_{\\nu\\sigma}(p) = 0$, so that locally no experiment can distinguish a gravitational field from an accelerating frame.

**Boundary and comparison.** This holds only at one point (and to a particular order in its neighbourhood): $\\Gamma$ can vanish at $p$, but the derivatives of $\\Gamma$ (the curvature) **cannot** vanish at the same time. The tidal effect is exactly the part that a local inertial frame cannot remove, so the equivalence principle by itself does not yield the field equations.

**Review question.** Why can “curvature cannot be removed by a coordinate transformation” be proved, while “gravity is curvature” cannot?`,

  'liang:fermi-transport': `## Fermi transport and non-rotating observers

**Motivation.** Parallel transport is most natural on a geodesic. How should a gyroscope in the hands of an accelerating observer “keep pointing”? One needs a rule generalising parallel transport to an arbitrary worldline.

**Form.** Fermi transport is $u^b\\nabla_bS^a = (S^ba_b)u^a - (u^bS_b)a^a$; along a geodesic ($a^a = 0$) it reduces to parallel transport. The spin vector of a non-rotating observer is Fermi-transported and orthogonal to $u^a$.

**Boundary and comparison.** Fermi transport depends on the 4-velocity and the 4-acceleration of the worldline and is defined only along that worldline. In curved spacetime “non-rotating” **can only** be defined as Fermi transport; talk of “always pointing in the same direction” has no global meaning.

**Review question.** Why does a gyroscope in orbit exhibit geodesic precession? (Along a geodesic, Fermi transport = parallel transport, and after going round a closed loop the vector has turned through an angle determined by the curvature.)`,

  'liang:tidal-deviation': `## Tidal forces and the geodesic deviation equation

**Motivation.** The equivalence principle can remove gravity, but it cannot remove the fact that “two freely falling bodies approach each other”. Computing the relative acceleration of neighbouring geodesics gives the direct physical meaning of curvature.

**Form.** $u^b\\nabla_b(u^c\\nabla_c\\xi^a) = -R^a{}_{cbd}u^cu^d\\xi^b$.

**Boundary and comparison.** The equation gives only the second-order evolution of $\\xi^a$; initial data are still needed to fix a solution. It shows that curvature **cannot be removed by a coordinate transformation**, and is therefore the “real” part of gravity — this is the key to separating gravity from an accelerating frame, and the reason why the left-hand side of the Einstein field equations must contain curvature.

**Review question.** In a free-fall experiment near the Earth, why do two falling balls approach each other? Explain it using the components of $R^a{}_{cbd}$.`,

  'liang:einstein-equation': `## The Einstein field equations

**Motivation.** One needs an equation linking “matter” and “geometry”. The constraints are rigid: the left-hand side must be a second-order geometric quantity with $\\nabla^a(\\cdot)_{ab} = 0$, and the right-hand side must be a conserved matter quantity.

**Form.** $G_{ab} + \\Lambda g_{ab} = 8\\pi T_{ab}$ (in geometric units $c = G = 1$).

**Boundary and comparison.** It is a **postulate** of the theory, not a theorem derived from more basic propositions; what can be derived is $\\nabla^aG_{ab} = 0$, which makes $\\nabla^aT_{ab} = 0$ hold automatically — the equations of motion are therefore not an independent assumption, and this is the point at which the theory is self-consistent. The cosmological constant $\\Lambda$ can be determined only by observation; without it the theory is equally self-consistent.

**Review question.** Why is $G_{ab}$ the “unique” second-order divergence-free tensor that can be placed on the left-hand side (under the given conditions)?`,

  'liang:linearized-gravity': `## The linear approximation, the Newtonian limit and gravitational radiation

**Motivation.** The field equations are non-linear and cannot be solved directly. Linearising them in the weak-field case both connects with Newtonian gravity and immediately gives wave solutions travelling at the speed of light.

**Form.** Writing $g_{ab} = \\eta_{ab} + h_{ab}$ with $|h| \\ll 1$, in the harmonic gauge $\\Box\\bar h_{ab} = -16\\pi T_{ab}$; in the static weak-field slow-motion case this reduces to $\\nabla^2\\Phi = 4\\pi\\rho$; the propagating solutions give gravitational waves travelling at the speed of light.

**Boundary and comparison.** The linear approximation is valid only for $|h| \\ll 1$; strong fields (near a black hole, or in the early universe) require solving the non-linear equations. The Newtonian limit requires **weak field, static and slow motion at the same time**; dropping any one of them loses the form $\\nabla^2\\Phi = 4\\pi\\rho$.

**Review question.** Why are gravitational waves “transverse waves of the metric”? Which structure of $h_{ab}$ do their two polarisation states correspond to?`,

  /* —— 第 8–9 章 爱因斯坦方程的求解；施瓦西时空 —— */

  'liang:static-stationary': `## Stationary, static and spherically symmetric spacetimes

**Motivation.** Before solving the field equations, reduce the number of unknowns. A symmetry assumption is the most effective tool for that, and it has to be written down in terms of Killing fields, not settled by “what it looks like”.

**Form.** A stationary metric admits a timelike Killing field $\\xi^a$; being static additionally requires $\\xi^a$ to be irrotational ($\\xi_{[a}\\nabla_b\\xi_{c]} = 0$), so that a time coordinate with $g_{ti} = 0$ can be chosen; spherical symmetry requires an isometric action of $SO(3)$ whose orbits are two-dimensional spheres.

**Boundary and comparison.** Stationary and static are defined only in the sense of “there exists a Killing field”: Kerr spacetime is **stationary but not static**. A rigorous formulation of spherical symmetry uses Killing fields and orbit structure — “it looks like a sphere” is not a definition.

**Review question.** Why does “stationary + irrotational” yield $g_{ti} = 0$? Which one is missing for a rotating black hole?`,

  'liang:schwarzschild-solution': `## The Schwarzschild vacuum solution

**Motivation.** The simplest approximation to a celestial body: vacuum, static, spherically symmetric. Substituting these three conditions into the general form of a spherically symmetric metric reduces the field equations to a pair of equations.

**Form.** $\\displaystyle ds^2 = -\\left(1-\\frac{r_s}{r}\\right)dt^2 + \\left(1-\\frac{r_s}{r}\\right)^{-1}dr^2 + r^2d\\Omega^2$ with $r_s = 2GM$; it satisfies $R_{ab} = 0$ for $r > r_s$.

**Boundary and comparison.** At $r = r_s$ the metric components diverge, but the **curvature scalars stay finite**, so this is a coordinate singularity and not a spacetime singularity — a point one only sees fully in Kruskal coordinates. The solution holds in the vacuum region only; the interior of a star has to be joined to an interior solution, and the junction conditions cannot be skipped.

**Review question.** Why is “$g_{tt} = 0$” both the infinite-redshift surface and something that a coordinate transformation can “remove”? Compare it with the genuine singularity at $r=0$.`,

  'liang:birkhoff-theorem': `## Birkhoff’s theorem

**Motivation.** A star pulsates; does the exterior spacetime oscillate with it and radiate gravitational waves? Uniqueness of the spherically symmetric vacuum solution answers no.

**Form.** A spherically symmetric vacuum solution must be the Schwarzschild solution (in the sense of its maximal extension); a spherically symmetric vacuum region does not radiate gravitational waves because of stellar pulsation.

**Boundary and comparison.** It holds only for a **vacuum, spherically symmetric** region; when matter is present ($T_{ab} \\neq 0$) it does not apply. It does not rule out that the interior of a spherically symmetric body evolves in time; it says only that the **exterior vacuum region** is static — which is exactly the ground for “during collapse the exterior metric is always Schwarzschild”.

**Review question.** Why is “spherically symmetric” a necessary condition? Replace spherical symmetry by axial symmetry: what happens to the conclusion (think of Kerr spacetime)?`,

  'liang:reissner-nordstrom': `## The Reissner–Nordström solution

**Motivation.** A celestial body can carry charge. Including the electromagnetic field, the spherically symmetric solution acquires one more parameter, and the metric function changes with it.

**Form.** $\\displaystyle ds^2 = -\\left(1-\\frac{r_s}{r}+\\frac{Q^2}{r^2}\\right)dt^2 + \\left(1-\\frac{r_s}{r}+\\frac{Q^2}{r^2}\\right)^{-1}dr^2 + r^2d\\Omega^2$, which together with $F_{ab} = \\frac{Q}{r^2}(dt)_a\\wedge(dr)_b$ satisfies the Einstein–Maxwell equations.

**Boundary and comparison.** The charge gives the metric function **two** zeros; when $|Q|$ exceeds a critical value there is no event horizon any more, and one obtains a naked singularity. This shows that “a singularity must be wrapped in a horizon” (cosmic censorship) does not hold automatically in the known solutions.

**Review question.** Why does the RN solution have two horizons while Schwarzschild has one? How do they merge in the limiting case?`,

  'liang:np-formalism': `## The Newman–Penrose formalism and gauge freedom

**Motivation.** The field equations are second order, whereas classifying spacetimes (Petrov type) requires looking at the algebraic structure of the curvature. Switching to a “null tetrad” reduces the equations to first order and makes the algebraic classification visible.

**Form.** Take a null tetrad $\\{l^a, n^a, m^a, \\bar m^a\\}$ and decompose the Riemann tensor into five complex scalars $\\Psi_0,\\dots,\\Psi_4$; the field equations become a first-order system.

**Boundary and comparison.** The NP formalism is an **equivalent rewriting** and adds no physical content. Coordinate conditions (harmonic, isotropic and so on) are only gauge choices and carry no geometric information: a different condition still describes the same spacetime — which is exactly what “the gauge freedom of general relativity” means.

**Review question.** Why can a coordinate condition not be taken as a physical prediction? (Find a coordinate transformation that matches the solutions of two “different coordinate conditions”.)`,

  'liang:schwarzschild-geodesics': `## Geodesics of Schwarzschild spacetime

**Motivation.** With the metric in hand, the next question is “how do particles move and how does light move”. Solving the second-order system directly is hard, but the symmetry supplies two conserved quantities.

**Form.** The two Killing fields give $E = -\\xi^au_a$ and $L = \\psi^au_a$; together with the normalisation condition $u^au_a = -1$ (timelike) or $0$ (null), the geodesic equation becomes a one-dimensional problem in the $r$ direction, in which $1 - r_s/r$ and $L^2/r^2$ compete inside an effective potential.

**Boundary and comparison.** There are only **two** conserved quantities (static + spherically symmetric). A general spacetime does not have enough conserved quantities, and the geodesic equations need not be integrable — this is why the later computations of gravitational lensing and precession can be carried out, and why elsewhere they cannot. A null geodesic has $u^au_a = 0$ and cannot be normalised as in the timelike case.

**Review question.** Why does the angular-momentum term in the effective potential correspond to a “centrifugal barrier”? Where does the photon sphere appear?`,

  'liang:classical-tests': `## The classical experimental tests of general relativity

**Motivation.** A geometrised theory of gravity has to produce measurable numbers. The Schwarzschild solution conveniently gives three: redshift, precession and deflection.

**Form.** Gravitational redshift $1+z = (1-r_s/r)^{-1/2}$; the extra perihelion precession of Mercury per orbit $\\dfrac{6\\pi GM}{a(1-e^2)}$; the deflection of light $\\Delta\\varphi = \\dfrac{4GM}{b}$.

**Boundary and comparison.** These are all results of the **weak-field approximation (post-Newtonian order)** and cannot be taken as tests in the strong-field regime. Each number depends on the order to which the derivation is carried; without stating the order it cannot be compared with observation.

**Review question.** Which of the three effects is most sensitive to the assumption that “light travels along a geodesic”? Give your reasons.`,

  'liang:stellar-interior': `## Spherically symmetric stellar interior solutions and stellar evolution

**Motivation.** The Schwarzschild solution is a vacuum solution, while the interior of a star contains matter; one has to solve another set of equations and join it to the vacuum solution at the surface.

**Form.** The TOV equation $\\dfrac{dp}{dr} = -\\dfrac{(\\rho+p)(m+4\\pi r^3p)}{r(r-2m)}$ with $\\dfrac{dm}{dr} = 4\\pi r^2\\rho$; at $r = R$ one has $p(R) = 0$ and the solution joins the Schwarzschild solution.

**Boundary and comparison.** The TOV equation comes from $\\nabla^aT_{ab} = 0$ together with the spherical-symmetry assumption; it is **not** an independent equation. There is a maximum mass; beyond it there is no static solution and collapse is unavoidable — exactly the starting point of black-hole formation.

**Review question.** Why does $p$ appear inside $(m + 4\\pi r^3p)$? (Hint: in general relativity pressure is itself a source of gravity.)`,

  'liang:kruskal-extension': `## The Kruskal extension and the infinite-redshift surface

**Motivation.** Schwarzschild coordinates fail at $r = r_s$, yet the curvature there is finite — which shows that only the coordinates are bad. Switching to another set of coordinates that “repairs” this reveals the true global structure of the spacetime.

**Form.** Kruskal coordinates $(U,V)$ join the two pieces $r > r_s$ and $r < r_s$ into the maximal extension; at $r = r_s$ the metric is non-degenerate in Kruskal coordinates, while at $r = 0$ the curvature scalars diverge.

**Boundary and comparison.** Uniqueness of the extension needs the condition “**maximal**”; different extension schemes give different global structures. The infinite-redshift surface and the event horizon coincide only in the stationary case; in a rotating black hole the two separate.

**Review question.** Why does a “white hole” region appear in the maximal extension? Is it physical, or a by-product of the coordinate structure?`,

  'liang:schwarzschild-black-hole': `## Gravitational collapse and the Schwarzschild black hole

**Motivation.** Putting the mass limit of the TOV equation together with the horizon of the Schwarzschild solution gives the simplest argument for black-hole formation.

**Form.** After a spherically symmetric star has collapsed inside $r_s$, its exterior vacuum region is still the Schwarzschild solution by Birkhoff’s theorem; the surface $r = r_s$ becomes the event horizon, and the interior matter reaches $r = 0$ within finite proper time.

**Boundary and comparison.** The event horizon is a **global** notion, defined by “whether one can escape to infinity”, and it cannot be read off from whether a local metric component diverges. Classical general relativity fails at $r \\to 0$, and conclusions near the singularity need quantum gravity — this must be marked honestly as an open problem.

**Review question.** Why can the statement “the horizon is a one-way membrane” not be written in terms of local metric components? (Hint: locally every non-degenerate metric looks like the Minkowski metric.)`,

  /* —— 第 10 章 宇宙论 —— */

  'liang:cosmological-principle': `## The cosmological principle and spatial geometry

**Motivation.** There is only one universe, so no repeated experiment is possible. The only workable approach is to assume that “we are not in a special position” — making that plain idea precise gives homogeneity and isotropy.

**Form.** There is a family of spacelike hypersurfaces $\\Sigma_t$ that foliates spacetime, with the distribution of matter on each leaf homogeneous and isotropic; the curvature constant of a space of constant curvature is $k \\in \\{-1,0,+1\\}$.

**Boundary and comparison.** Homogeneity and isotropy hold approximately only **on sufficiently large scales**; taking them as an exact statement contradicts the observed structure (galaxies, voids). The principle itself contains no dynamics: it constrains only the form of the metric and does not determine $a(t)$.

**Review question.** Are “homogeneous” and “isotropic” two independent conditions? What does one get by requiring isotropy alone (about every point)?`,

  'liang:rw-metric': `## The Robertson–Walker metric

**Motivation.** Substituting the cosmological principle into the general form of the metric determines the geometry completely, leaving only one undetermined function $a(t)$.

**Form.** $\\displaystyle ds^2 = -dt^2 + a^2(t)\\left[\\frac{dr^2}{1-kr^2} + r^2d\\Omega^2\\right]$ with $k \\in \\{-1,0,+1\\}$; the spatial sections are maximally symmetric spaces.

**Boundary and comparison.** The RW metric is the **unique** form (up to the choice of coordinates) under the cosmological principle, so its strength comes from the strength of the assumptions. The numerical value of $k$ depends on the normalisation convention for $a(t)$; what has geometric meaning are combinations such as $k/|a|$.

**Review question.** Why does “the numerical value of $k$” have no absolute meaning, while “the sign of $k$” does?`,

  'liang:hubble-redshift': `## Hubble’s law and cosmological redshift

**Motivation.** When light travels through an expanding spacetime its wavelength is stretched. Writing that down gives at once the redshift formula and, at low redshift, Hubble’s law.

**Form.** $1 + z = \\dfrac{a(t_{\\text{observed}})}{a(t_{\\text{emitted}})}$; at low redshift $z \\approx H_0 d$.

**Boundary and comparison.** Cosmological redshift is **not** a Doppler effect: it comes from the change of the scale factor during propagation, and both the source and the observer may be at rest in their own comoving coordinates, so one cannot simply substitute into the special-relativistic formula. The measurement of $H_0$ relies on the distance ladder, and the systematic errors of the different methods are still part of the current debate.

**Review question.** Why do cosmological redshift and the Doppler formula share the same leading term in the low-redshift limit? At which order does this coincidence break down?`,

  'liang:scale-factor': `## Evolution of the scale factor and the cosmological constant

**Motivation.** The field equations determine $a(t)$. Substituting the RW metric into the Einstein equations, two independent equations determine the whole expansion history.

**Form.** $\\left(\\dfrac{\\dot a}{a}\\right)^2 = \\dfrac{8\\pi\\rho}{3} - \\dfrac{k}{a^2} + \\dfrac{\\Lambda}{3}$ and $\\dfrac{\\ddot a}{a} = -\\dfrac{4\\pi(\\rho+3p)}{3} + \\dfrac{\\Lambda}{3}$, together with $\\dot\\rho + 3\\dfrac{\\dot a}{a}(\\rho+p) = 0$.

**Boundary and comparison.** Of the three equations only **two are independent**: the Friedmann equation and the conservation equation already imply the acceleration equation. For $\\Lambda > 0$ there is a static solution (the Einstein static universe), but it is unstable, and a tiny perturbation leads to expansion or contraction.

**Review question.** Why is $\\rho + 3p < 0$ needed to make $\\ddot a > 0$? Why can ordinary matter not do it?`,

  'liang:thermal-history': `## The thermal history of the universe, dark matter and the particle horizon

**Motivation.** Since the universe is expanding, it must have been hotter and denser in the past. Reading $a(t)$ backwards gives the whole thermal history.

**Form.** As $a$ decreases the radiation temperature rises as $T \\propto 1/a$; the universe passes through, in turn, radiation-dominated and matter-dominated stages. The particle horizon is the causal boundary given by the conformal time $\\int dt/a$.

**Boundary and comparison.** The detailed division into stages of the thermal history **depends on the particle-physics model** and goes beyond general relativity itself. Dark matter is a name for the observed gravitational effects, and its microscopic identity is undetermined — no candidate particle may be called confirmed.

**Review question.** Why is the “horizon problem” a problem about causality rather than a technical problem? What is the difference between the particle horizon and the event horizon?`,

  'liang:inflation': `## Inflationary models and the problems they solve

**Motivation.** The standard model leaves two difficulties: why do regions that are not causally connected have such a uniform temperature, and why is space so flat? A very early phase of accelerating expansion can answer both at once.

**Form.** If an accelerating phase of expansion ($\\ddot a > 0$) existed in the very early universe, the conformal time $\\int dt/a$ is stretched substantially, which alleviates both the horizon (causality) problem and the flatness problem.

**Boundary and comparison.** Inflation is a **class of models**, not a single theory; that its predictions agree with observation does not mean that the mechanism has been confirmed. It does not explain the singularity itself, but pushes the problem of initial conditions further back.

**Review question.** Why does “accelerating expansion stretches the conformal time” solve the causality problem? Translate it into “how small was today’s observable universe before inflation”.`,

  'liang:new-standard-cosmology': `## Dark energy and the new standard cosmological model

**Motivation.** Observations show that the expansion is **accelerating**. In general relativity acceleration requires negative pressure, and neither ordinary matter nor dark matter can supply it.

**Form.** ΛCDM: fitting the present accelerated expansion with $\\Lambda$ (or dark energy with an equation of state $w \\approx -1$) plus cold dark matter, with $\\Omega_\\Lambda + \\Omega_m + \\Omega_k \\approx 1$.

**Boundary and comparison.** Dark energy and the cosmological constant are **not yet distinguishable** with present observations; whether $w$ varies with time is an open question. The “new standard model” is still a revisable model and not a final conclusion: the fate of the universe depends on the future behaviour of $w$.

**Review question.** If $w$ were slightly less than $-1$, what would happen to the fate of the universe? Why is this case called a “problem” rather than a “prediction”?`,

  /* —— 三个方法块（局部 ×2、全局 ×1） —— */

  'liang:method-index-balance': `## Local method: abstract index balancing and raising and lowering indices

**When to use it.** You have a tensor equation written in abstract index notation and want to know whether it is **written legally**. This is the most time-saving step in relativity calculations: the overwhelming majority of mistakes are caught here.

**Steps.** Write out the upper and lower indices of each factor → check that the set of free indices is exactly the same in every term → check that each contraction pairs one upper with one lower index → when indices must be raised or lowered, only multiplication by $g_{ab}$ or $g^{ab}$ is allowed, followed immediately by contraction → finally check the covariant order on the two sides of the equation.

**Why this order is the most natural one.** Type errors are **local**: one needs to know no geometry at all, since the notation alone decides. Putting this first in a computation means using the cheapest check to block the most expensive rework.

**Scope of failure.** Balancing can only rule out type errors; it **cannot** prove that an equation holds: equations with legal indices and a false content exist all the same. It also does not check questions such as existence or uniqueness.

**Review question.** Decide whether $T^a{}_b = S_aV^b$ is legal and give your reasons. (The types of the free indices on the two sides do not match, so the equation is not legal.)`,

  'liang:method-metric-curvature': `## Local method: a fixed computation from metric to curvature

**When to use it.** You have written down $g_{\\mu\\nu}$ in some coordinate chart and need any one of the Christoffel symbols, the Riemann tensor, the Ricci tensor or the scalar curvature.

**Steps.** Write out $g_{\\mu\\nu}$ and $g^{\\mu\\nu}$ → compute $\\Gamma^\\mu{}_{\\nu\\sigma}$ from the formula → compute term by term from $R^\\rho{}_{\\sigma\\mu\\nu} = \\partial_\\mu\\Gamma^\\rho{}_{\\nu\\sigma} - \\partial_\\nu\\Gamma^\\rho{}_{\\mu\\sigma} + \\Gamma^\\rho{}_{\\mu\\lambda}\\Gamma^\\lambda{}_{\\nu\\sigma} - \\Gamma^\\rho{}_{\\nu\\lambda}\\Gamma^\\lambda{}_{\\mu\\sigma}$ → contract to get the Ricci tensor and the scalar curvature → use the symmetries of $R_{\\rho\\sigma\\mu\\nu}$ and $\\nabla^aG_{ab} = 0$ as consistency checks.

**Why this order is the most natural one.** Every step uses only the result of the previous one, and every step can be checked against symmetries; the checks are put at the end rather than after each step because a symmetry check needs the complete tensor.

**Scope of failure.** The procedure gives components **in that coordinate chart** only; after a change of coordinates the intermediate quantities (such as $\\Gamma$) are not tensors at all and cannot be compared directly. It also does not address “how to guess the metric” — that is the job of Chapter 8.

**Review question.** Why check the result with $\\nabla^aG_{ab} = 0$ rather than some other condition? (It is an identity that every result must satisfy; if it fails, the computation is wrong.)`,

  'liang:method-symmetry-conservation': `## Global method: turning Killing fields into conserved quantities

**When to use it.** You face a geodesic equation to be solved. Direct integration means a second-order non-linear system, whereas symmetry can reduce it to “one coordinate plus one effective potential”.

**Steps.** Read off the continuous symmetries of the metric (no explicit dependence on some coordinate, spherical symmetry, axial symmetry) → write down the corresponding Killing fields → use $\\xi^au_a = \\mathrm{const}$ to obtain the conserved quantities → substitute into the normalisation condition $u^au_a = -1$ or $0$ → reduce the problem to a one-dimensional effective potential → read the orbit type off the effective potential (bound, escape, circular orbit, photon sphere).

**Why this strategy is a global one.** It is not tied to one concrete task: from Schwarzschild geodesics to cosmological redshift, from Kerr orbits to gravitational lensing, the road is the same. It translates “symmetry of the geometry” directly into “conserved quantities of the mechanics”, and this is the most transferable move in the whole book.

**Scope of failure.** Without a Killing field the method does **not apply**, and one may not conclude “therefore the geodesics are unsolvable” — only that this road is blocked; geodesics in a general spacetime need indeed not be integrable. The number of conserved quantities equals the number of independent Killing fields, so too little symmetry is simply too little.

**Review question.** In Schwarzschild spacetime, point out two Killing fields and write down the corresponding conserved quantities. ($\\xi^a = (\\partial_t)^a$ and $\\psi^a = (\\partial_\\varphi)^a$, corresponding to $E = -\\xi^au_a$ and $L = \\psi^au_a$.)`,
};

export default cases;
