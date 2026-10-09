/**
 * 英文覆盖：案例 05「微分几何」的正文块（30 块，键是 `<!-- node:dg:… -->` 的 id）。
 *
 * 单独一个文件的原因：这是本仓库最大的一块正文（约 12.5 万汉字），按块增量翻译时
 * 它的改动会把 `cases.mjs` 的 diff 淹没。装配层只认 `cases.mjs` 的 default 导出，
 * 后者用 `...dg` 把这里并进去。
 *
 * **本文件由 `tmp/i18n/build-dg.mjs` 从 `tmp/i18n/dg/*.md` 装配**：译者只写 Markdown，
 * 转义与拼装交给脚本，避免模板字符串把 LaTeX 的反斜杠吃掉。手工改这里会被下次装配覆盖。
 *
 * 装配前逐块做结构核对（行间公式段数与内容、行内公式多重集、标题序列、散文无中文）；
 * **没通过的块不收**，它在站点上保持中文并计入覆盖率缺口，原因见装配脚本的输出。
 */

export default {
  'dg:topological-space': `## Topological spaces

**Source tags.** #topological-space #point-set-topology #geometry

**Source.** The read-only snapshot \`G:/DifferentialGeometry/object/def/拓扑空间.md\` (see \`data/dg/\`).

---

Topology is the branch of mathematics that studies “continuity” and “nearness”. The topological space is the central object of that study: it uses the least possible structure (the axioms for open sets) to describe “which points stick together”, and thereby generalises continuity, convergence, connectedness and compactness from the real numbers to the most general spaces. If a [metric space](/nodes/dg%3Ametric-space) measures nearness by a distance, then a topological space discards the “numerical value” and keeps only the “relation of nearness” itself.

---

## Prerequisites

### Essential knowledge

- **Foundations of set theory**: sets, subsets, intersections, unions, complements, power sets. An understanding of arbitrary unions and finite intersections of sets.
- **Foundations of logic**: propositions and quantifiers (∀, ∃), and the ability to follow the reasoning pattern “if … then …”.
- **First notions about the real numbers**: knowing the difference between an open interval $(a,b)$ and a closed interval $[a,b]$ on the real line, and having an intuition for “open balls” in the $\\varepsilon$-$\\delta$ language.

### Supporting knowledge

- **[Metric spaces](/nodes/dg%3Ametric-space)**: knowing the Euclidean distance in $\\mathbb{R}^n$ and the definition of an open ball. The [metric space](/nodes/dg%3Ametric-space) is the most important source of topological spaces, and understanding the [metric space](/nodes/dg%3Ametric-space) gives a concrete “anchor” when one first meets the abstract axioms for open sets.
- **Elementary analysis**: the notions of a convergent sequence and of a continuous function. Their generalisation to topological spaces is one of the core motivations.

### Further knowledge

- **Category theory**: topological spaces with continuous maps form the category **Top**. The [homeomorphism](/nodes/dg%3Ahomeomorphism) is its notion of isomorphism. The language of categories helps one see that a topological space is merely one instance of “a certain kind of structure”.
- **Algebraic topology**: a topological space is further equipped with algebraic invariants such as homotopy groups and homology groups, used to distinguish different topological spaces.
- **Further notions of point-set topology**: separation axioms ($T_0, T_1, T_2, \\dots$), countability axioms, Urysohn's lemma, the Tietze extension theorem and so on.

---

## Motivation

### Motivation for introducing them

**Why are topological spaces needed?**

**A line of thought internal to the discipline**: at the end of the nineteenth century analysis had already developed a theory of continuous functions on $\\mathbb{R}^n$, and mathematicians noticed that the essence of many theorems (such as the intermediate value theorem and the extreme value theorem) depends only on the notions of an “open set” and of “nearness”, not on a particular distance formula. In 1906 Fréchet introduced the [metric space](/nodes/dg%3Ametric-space), abstracting the distance; but people soon found that some important spaces (such as certain function spaces, or algebraic varieties with the Zariski topology) cannot be described by a metric. A more general framework was therefore needed—the topological space.

**A line of thought from external applications**: phase spaces in physics, Calabi–Yau [manifolds](/nodes/dg%3Amanifold) in string theory and digital topology in computer science all involve “relations of nearness” that cannot be described by a traditional metric.

**An aesthetic and structural line of thought**: the axioms for a topological space are extremely concise—only three axioms for open sets. This “capturing the most essential structure with the fewest conditions” is a model of the modern style in mathematics and an early embodiment of the spirit of category theory.

### Motivation for the construction

**From [metric spaces](/nodes/dg%3Ametric-space) to topological spaces: the natural evolution of the seed idea**

Consider the Euclidean distance in $\\mathbb{R}^2$, $d(x,y) = \\sqrt{(x_1 - y_1)^2 + (x_2 - y_2)^2}$. We define an “open set” $U$ to be a set such that for every $x \\in U$ there is an $\\varepsilon > 0$ with the open ball $B(x,\\varepsilon) \\subseteq U$. Now ask: if we know only “which sets are open” and completely forget the distance formula, can continuity be reconstructed?

The answer is: **a continuous map $f: X \\to Y$ is exactly equivalent to “the preimage of every open set is open”**. This means that continuity is determined entirely by the structure of “open sets”, with no need for a distance! We can therefore abstract the properties of open sets into axioms:

- the empty set and the whole set are open;
- the union of arbitrarily many open sets is open;
- the intersection of finitely many open sets is open.

This is how the seed idea of a topological space “peels off” from the [metric space](/nodes/dg%3Ametric-space). Once these three axioms are accepted, we have a framework of study broader and more flexible than that of [metric spaces](/nodes/dg%3Ametric-space).

---

## Form

### The canonical general form

**Definition (topological space)**: let $X$ be a non-empty set. A **topology** on $X$ is a family of subsets of $X$, $\\mathcal{T} \\subseteq \\mathcal{P}(X)$, satisfying:
1. $\\varnothing, X \\in \\mathcal{T}$;
2. for every index set $\\Lambda$, if $\\{U_\\alpha\\}_{\\alpha \\in \\Lambda} \\subseteq \\mathcal{T}$, then $\\bigcup_{\\alpha \\in \\Lambda} U_\\alpha \\in \\mathcal{T}$ (closure under arbitrary unions);
3. for finitely many $U_1, \\dots, U_n \\in \\mathcal{T}$ we have $\\bigcap_{i=1}^n U_i \\in \\mathcal{T}$ (closure under finite intersections).

The pair $(X, \\mathcal{T})$ is called a topological space, and the elements of $\\mathcal{T}$ are called **open sets**.

**Three common topologies**:
- **Discrete topology**: $\\mathcal{T} = \\mathcal{P}(X)$ (every subset is open). Every point is isolated.
- **Trivial topology** (also called the indiscrete topology): $\\mathcal{T} = \\{\\varnothing, X\\}$. There are only two open sets.
- **Cofinite topology**: $\\mathcal{T} = \\{U \\subseteq X \\mid X \\setminus U \\text{ is finite}\\} \\cup \\{\\varnothing\\}$. Common in algebraic geometry.

**Comparison**: the discrete topology is “the most informative” (every point is separated from every other), the trivial topology “the least informative” (all points stick together). Most interesting topologies lie between the two.

### Analysis of the necessary conditions

**If closure under arbitrary unions were not required**: if only finite unions were allowed, the notion of an “open set” could no longer express an “open cover”—the central tool in the definition of [compactness](/nodes/dg%3Acompactness)—and many theorems of analysis would fail.

**If closure under finite intersections were not required**: if only finite unions were allowed but arbitrary intersections were permitted, the family of “open sets” would degenerate into a kind of “ultrametric” structure and lose its natural connection with continuous functions and with the notion of a neighbourhood.

**If $X$ itself were not required to be open**: then the definition of continuity, “$f^{-1}(\\text{open set})$ is open”, would no longer guarantee that the identity map is continuous, which clashes with intuition.

### Equivalent formulations

A topological space can be defined in several equivalent ways, each highlighting a different aspect:

1. **The open-set axioms** (as above): the most commonly used definition.
2. **The closed-set axioms**: a set $F \\subseteq X$ is called closed if $X \\setminus F$ is open. The closed sets satisfy: $\\varnothing, X$ are closed; arbitrary intersections are closed; finite unions are closed.
3. **The neighbourhood axioms**: to each $x \\in X$ one assigns a family of subsets $\\mathcal{N}(x)$ (called the neighbourhood system of $x$) satisfying: every neighbourhood contains $x$; a finite intersection of neighbourhoods is again a neighbourhood; the superset relation; and “inside every neighbourhood there is an open neighbourhood”.
4. **The closure operator** (Kuratowski's closure axioms): one assigns an operator $\\operatorname{cl}: \\mathcal{P}(X) \\to \\mathcal{P}(X)$ satisfying: $\\operatorname{cl}(\\varnothing)=\\varnothing$; $A \\subseteq \\operatorname{cl}(A)$; $\\operatorname{cl}(\\operatorname{cl}(A)) = \\operatorname{cl}(A)$; $\\operatorname{cl}(A \\cup B) = \\operatorname{cl}(A) \\cup \\operatorname{cl}(B)$.
5. **The interior operator**: $\\operatorname{int}(A) = X \\setminus \\operatorname{cl}(X \\setminus A)$.

**A short proof of the equivalence** (taking open sets $\\Rightarrow$ closure as the example): define $\\operatorname{cl}(A) = \\bigcap\\{F \\text{ closed} \\mid A \\subseteq F\\}$; the four closure axioms can then be verified. Conversely, given a closure operator, define the closed sets to be those with $F = \\operatorname{cl}(F)$; the closed-set axioms hold, and a topology follows.

### How are the relevant statements expressed in natural language?

- “Continuous map”: between topological spaces $X, Y$, a map $f: X \\to Y$ is continuous if the preimage of every open set in $Y$ is an open set in $X$.
- “Convergence”: a sequence $(x_n)$ converges to $x$ if for every neighbourhood $U$ of $x$ there is an $N$ such that $x_n \\in U$ whenever $n > N$. (Note: in a general topological space sequences do not suffice to describe the topology; one has to use nets or filters.)
- “Compact”: every open cover of $X$ has a finite subcover.
- “Connected”: $X$ cannot be decomposed into the union of two non-empty disjoint open sets.

### A lower-dimensional formulation

Restating a topological space in the language of set theory: a topological space is a set $X$ together with a subset of its power set, $\\mathcal{T} \\subseteq \\mathcal{P}(X)$, satisfying $\\varnothing, X \\in \\mathcal{T}$, with $\\mathcal{T}$ closed under arbitrary unions and finite intersections. A continuous map $f: (X,\\mathcal{T}_X) \\to (Y,\\mathcal{T}_Y)$ is a map of sets satisfying $\\forall V \\in \\mathcal{T}_Y,\\ f^{-1}(V) \\in \\mathcal{T}_X$.

From the point of view of category theory: **Top** is the category whose objects are topological spaces and whose morphisms are continuous maps. Its isomorphisms are the [homeomorphisms](/nodes/dg%3Ahomeomorphism)—bijections that are continuous in both directions.

### A higher-dimensional viewpoint

Topological spaces are the underlying stage for **sheaf theory**, and sheaves in turn are a cornerstone of modern algebraic geometry and complex analysis. In **topos** theory a topological space is generalised to a “site”, an open set to a “cover”, and the notion of a “point” to a “topos”—a view of space that does not need underlying points. A topological space can therefore be seen as a special case of a “topos with enough points”.

---

## Proof

### Proof sketch

**Theorem (a composite of continuous maps is continuous)**: if $f: X \\to Y$ and $g: Y \\to Z$ are continuous, then $g \\circ f: X \\to Z$ is continuous.

**In one sentence**: the preimage of the preimage of an open set is again an open set, because $(g \\circ f)^{-1} = f^{-1} \\circ g^{-1}$.

**Detailed proof**: let $W \\subseteq Z$ be open. Since $g$ is continuous, $g^{-1}(W) \\subseteq Y$ is open. Since $f$ is continuous, $f^{-1}(g^{-1}(W)) \\subseteq X$ is open. But $(g \\circ f)^{-1}(W) = f^{-1}(g^{-1}(W))$, so $g \\circ f$ is continuous.

---

## Applications

### Direct applications

**Worked example 1**: decide whether the cofinite topology on $\\mathbb{R}$ is a Hausdorff space (a $T_2$ space).

**Solution**: in the cofinite topology the open sets are those whose complement is finite. Take any two distinct points $x, y \\in \\mathbb{R}$, let $U$ be an open neighbourhood of $x$ and $V$ an open neighbourhood of $y$. If $U \\cap V = \\varnothing$, then $U \\subseteq \\mathbb{R} \\setminus V$, and $\\mathbb{R} \\setminus V$ is finite, so $U$ is finite. But $U$ is a non-empty open set, and in the cofinite topology a non-empty open set has finite complement, so $U$ is infinite (because $\\mathbb{R}$ is infinite), a contradiction. Hence the cofinite topology is not Hausdorff.

**Worked example 2**: prove that $(0,1)$ and $\\mathbb{R}$ are [homeomorphic](/nodes/dg%3Ahomeomorphism).

**Solution**: take $f: (0,1) \\to \\mathbb{R}$, $f(x) = \\tan(\\pi x - \\pi/2)$. This $f$ is a continuous bijection and its inverse $f^{-1}(y) = \\frac{1}{\\pi}\\arctan y + \\frac12$ is continuous as well, so it is a [homeomorphism](/nodes/dg%3Ahomeomorphism).

### Indirect applications

- **In analysis**: [compactness](/nodes/dg%3Acompactness) guarantees that a continuous function attains its extrema (a generalisation of the Heine–Borel theorem), and connectedness guarantees the intermediate value theorem (a generalisation of the Intermediate Value Theorem).
- **In geometry**: topological spaces are the foundation of [manifolds](/nodes/dg%3Amanifold). A [manifold](/nodes/dg%3Amanifold) is a topological space that is “locally [homeomorphic](/nodes/dg%3Ahomeomorphism) to $\\mathbb{R}^n$”, and it is the starting point of all work in differential geometry and differential topology.
- **In physics**: spacetime is regarded as a 4-dimensional [topological manifold](/nodes/dg%3Atopological-manifold), and the mathematical description of topological defects (such as cosmic strings) relies on the theory of topological spaces.
- **In computer science**: domain theory uses the Scott topology to build models of program semantics, and data types are interpreted as partially ordered sets carrying a certain topology.

---

## Generalisations

- **Relaxing the conditions**: the topological space is already one of the most general structures, unless one gives up “finite intersections” or “arbitrary unions”—but then the natural connection with continuity is lost. Nevertheless, variants such as **generalized topology** (requiring only arbitrary unions, not finite intersections) and **pretopology** have found use in special settings.
- **Generalising the conclusion**: a topological space can be equipped with additional structure to become a **uniform space** (in which uniform continuity can be defined) or a **[metrizable space](/nodes/dg%3Ametric-space)** (in which a distance can be defined).
- **An open problem**: the **Moore space problem** was unsolved for a long time—does there exist a normal Moore space that is not [metrizable](/nodes/dg%3Ametric-space)? It concerns a deep question about the relation between topological spaces and [metric spaces](/nodes/dg%3Ametric-space) (it has since been settled: counterexamples exist). In addition, the **$M_3$ problem** (whether there is a non-metrizable normal Moore space that is $M_3$) and others have played an important role in the history of topology.

---

## Common misconceptions

**Misconception 1**: “an open set must be ‘open-looking’, and a closed set must be ‘closed-looking’.”

**The fact**: in a general topological space an open set is merely one of the family of subsets singled out by the topology axioms and need not have any “open-looking” geometric intuition. For example, in the cofinite topology $\\mathbb{R} \\setminus \\{1,2,3\\}$ is open, yet it does not look “open”. Beginners often overlook that “open set” is a notion **chosen by axioms**, not a geometric intuition.

**Misconception 2**: “convergence of sequences describes the topology completely.”

**The fact**: in a general topological space the convergence of sequences is not enough to describe the closure (that is, $\\bar{A}$ cannot be described by limits of sequences). This requires the first countability axiom. In more general spaces one has to use **nets** or **filters** to describe the topology. Beginners tend to generalise the experience from $\\mathbb{R}^n$, where “sequences $\\iff$ topology”, to all topological spaces.

**Misconception 3**: “a continuous map is one that ‘neither tears nor glues’.”

**The fact**: a continuous map in topology only requires that the preimage of an open set be open; it allows “gluing” (as in a quotient map) but not “tearing” (that is, splitting behaviour). Beginners often confuse “continuous” with “[homeomorphism](/nodes/dg%3Ahomeomorphism)” and forget that a [homeomorphism](/nodes/dg%3Ahomeomorphism) additionally requires a bijection that is continuous in both directions.

---

## Insights

- **Structure determines continuity**: in topology, continuity is decided neither by “how smooth” a map is nor by a distance, but by whether “the preimage of every open set is open”. This made me realise: **the properties of a map often depend on how it interacts with the structure of the target space, not on how “smooth” it looks in itself**.
- **The power of axiomatisation**: three axioms suffice to define so rich a theory—from $\\mathbb{R}^n$ to infinite-dimensional function spaces and on to the Zariski topology on algebraic varieties, all unified by one framework. This mathematical aesthetic of “less is more” is striking.
- **“Nearness” can do without distance**: I used to think that “two points are close” must be measured by a numerical value, but topological spaces tell me that it is enough to know the spectrum running from “which points always stick together (trivial topology)” to “which points can be completely separated (discrete topology)”. This way of thinking has influenced how I regard “measurement” itself.

---

## Summary

### The idea

**“Liberate the relation of nearness from numerical values and keep only the structure itself.”**

A topological space does not measure “how close” things are; it only answers “whether they are close enough”—abstracting the essence of continuity from the numerical computations of the $\\varepsilon$-$\\delta$ language into the purely structural relation of open sets.

### Methods

| Method | Where it appears in the notes |
|------|------------------|
| Axiomatisation (the three axioms for open sets) | Form — the canonical general form |
| Converting between equivalent formulations (open sets ↔ closed sets ↔ neighbourhoods ↔ closure) | Form — equivalent formulations |
| Constructing counterexamples (deleting a necessary condition and watching the conclusion collapse) | Form — analysis of the necessary conditions |
| A lower-dimensional formulation (restating in set-theoretic or categorical language) | Form — a lower-dimensional formulation |
| A higher-dimensional viewpoint (a topological space as a special case of a topos) | Form — a higher-dimensional viewpoint |
| Constructing [homeomorphisms](/nodes/dg%3Ahomeomorphism) (establishing structural equivalence between different spaces) | Applications — direct applications (worked example 2) |

---

## Looking back and asking

- Why do the topology axioms require “arbitrary unions” but only “finite intersections”? What would happen if one changed this to “finite unions” or “arbitrary intersections”?
- Is a continuous map between [metric spaces](/nodes/dg%3Ametric-space) necessarily continuous in the sense of topological spaces? Conversely, can a continuous map between topological spaces “look” discontinuous under some metric?
- Does there exist a topological space whose topology cannot be induced by any metric? How can one construct one?
- Why is it that, although both describe a “relation of nearness”, some spaces have the Hausdorff property and others do not? What substantive difference does this make?
- If you had to teach the definition of a “topological space” to someone who has never studied topology, which example would you start from?`,

  'dg:homeomorphism': `## Homeomorphisms

> **Definition** If $f: X \\to Y$ is a one-to-one correspondence and both $f$ and its inverse $f^{-1}: Y \\to X$ are continuous, then $f$ is called a homeomorphism, or a topological transformation, or simply a homeomorphism. When a homeomorphism from $X$ to $Y$ exists, $X$ and $Y$ are said to be homeomorphic, or topologically equivalent, written $X \\cong Y$.

**Source tags.** #topology #point-set-topology #definition #continuous-map

**Source.** The read-only snapshot \`G:/DifferentialGeometry/object/def/同胚.md\` (see \`data/dg/\`).

---

A homeomorphism is the central notion of equivalence in topology: if there is a two-way continuous one-to-one correspondence between two [topological spaces](/nodes/dg%3Atopological-space), they are called homeomorphic. A homeomorphism matches the continuity structures of the two spaces well, so that once one of them is understood, the other is understood automatically. Topologists therefore treat homeomorphic [topological spaces](/nodes/dg%3Atopological-space) as essentially the same object of study, differing only in their outward form of presentation.

## Prerequisites

### Essential

- **[Topological spaces](/nodes/dg%3Atopological-space) and open sets**: a [topological space](/nodes/dg%3Atopological-space) $(X, \\mathcal{T})$ consists of a set $X$ together with a topology $\\mathcal{T}$ on it made up of “open sets”.
- **Continuous maps**: let $(X, \\mathcal{T})$ and $(Y, \\mathcal{S})$ be [topological spaces](/nodes/dg%3Atopological-space); a map $f: X \\to Y$ is called continuous if the preimage of every open set of $Y$ is an open set of $X$, that is, $f^{-1}[O] \\in \\mathcal{T}, \\ \\forall O \\in \\mathcal{S}$. (When $X = Y = \\mathbb{R}$ with the usual topologies, this returns exactly the $\\varepsilon - \\delta$ definition.)
- **Bijection (one-to-one correspondence)**: $f$ is a one-to-one map onto the whole codomain, so an inverse map $f^{-1}$ exists.

### Supporting

- **Metric topologies and the $\\varepsilon - \\delta$ language**: for the topology induced by a metric on a [metric space](/nodes/dg%3Ametric-space), $f$ is continuous at $x_0$ if and only if $\\forall \\varepsilon > 0, \\exists \\delta > 0$ such that $d_X(x, x_0) < \\delta$ implies $d_Y(f(x), f(x_0)) < \\varepsilon$. Most maps with an explicit analytic expression can be checked for continuity in this way.
- **Neighbourhoods**: continuity can also be defined pointwise: $f$ is continuous at a point $x$ if the preimage of any neighbourhood of $f(x)$ is a neighbourhood of $x$.
- **Continuity of composites**: if $f: X \\to Y$ is continuous at $x$ and $g: Y \\to Z$ is continuous at $f(x)$, then $g \\circ f: X \\to Z$ is continuous at $x$. This is the basis for proving that “the composite of homeomorphisms is a homeomorphism”.

### Further

- **[Manifolds](/nodes/dg%3Amanifold)**: the definition of a [manifold](/nodes/dg%3Amanifold) requires every point to have a neighbourhood homeomorphic to an open subset of $\\mathbb{R}^n$; homeomorphisms are the cornerstone of [manifold](/nodes/dg%3Amanifold) theory.
- **Homotopy**: a homeomorphism is a map that works in one step, whereas a “gradual process of deformation” corresponds to another central notion of topology — homotopy.
- **Diffeomorphisms**: between [smooth manifolds](/nodes/dg%3Asmooth-manifold), a bijection preserving the [smooth structure](/nodes/dg%3Asmooth-structure) is called a diffeomorphism, and may be seen as a strengthened version of a homeomorphism.

## Motivation

### Motivation for introducing it

#### A thread internal to the discipline

In Euclidean geometry we care about properties invariant under isometries (transformations preserving distance), such as length, angle and area. But mathematicians gradually discovered a deeper class of geometric properties — whether a figure can be drawn in one stroke, how many “holes” a surface has — which remain invariant even under arbitrary deformation that neither stretches, compresses nor tears. To study such properties rigorously one needs a precise language for the intuitive notion of “two figures being equivalent under continuous deformation”, and this is the reason for the birth of the homeomorphism.

In the development of the discipline, work on the one-stroke drawing problem for graphs (Euler’s seven bridges problem) and on the Euler formula for polyhedra $V-E+F=2$ already hinted that there is a class of geometric properties beyond the traditional metric ones. But without the notion of a homeomorphism one cannot define what it means for figures to be “essentially the same”, nor distinguish which properties are genuinely topological and which depend on a particular metric or embedding.

#### A thread from outside

- **Electrical networks**: the topological structure of a circuit (which nodes are connected) determines its function, while the exact length and shape of the wires do not matter. Topology gave rise in this context to the applied branch of “network topology”.
- **Geometry on a rubber sheet**: in popular language, topology is described as “geometry on a rubber sheet” — if the space is a rubber sheet that can be stretched, compressed and bent arbitrarily but not torn or glued, then figures on the sheet are homeomorphic before and after the deformation.

#### An aesthetic/structural thread

From the structuralist point of view, once we have defined [topological spaces](/nodes/dg%3Atopological-space) and continuous maps, it is natural to ask: when can two [topological spaces](/nodes/dg%3Atopological-space) be regarded as “essentially the same”? A homeomorphism gives the most natural notion of equivalence in the sense of “preserving the continuity structure” — it establishes not only a one-to-one correspondence between points but also a one-to-one correspondence between open sets. This symmetric, complete structural beauty makes the homeomorphism an unavoidable basic notion in topology.

### Motivation for the construction

- The most naive seed is a **bijection at the level of sets**: only a one-to-one correspondence of points is required.
- Then **continuity** is added: the map should preserve the relation of “being sufficiently close”, that is, if $x$ is sufficiently close to $a$ then $f(x)$ is sufficiently close to $f(a)$.
- But a “continuous bijection” alone is not enough — the inverse direction may fail to preserve closeness. So one requires **$f^{-1}$ to be continuous as well**, so that the structure of open sets is preserved in both directions. The modern canonical definition is thereby fixed:

This form starts from the seed of a bijection, adds continuity constraints step by step, and ends up as the standard of [topological spaces](/nodes/dg%3Atopological-space) being “as alike as they can possibly be”.

## Form

### Canonical general form

Different textbooks state it slightly differently, but the substance is exactly the same:

| Formulation | Content | Features |
| --- | --- | --- |
| \`尤承业《基础拓扑学讲义》（You Chengye, Lectures on Basic Topology）\` | $f: X \\to Y$ is a one-to-one correspondence, and $f$ and its inverse $f^{-1}$ are both continuous | emphasises the alternative name “topological transformation” |
| \`包志强《点集拓扑与代数拓扑引论》（Bao Zhiqiang, Introduction to Point-Set Topology and Algebraic Topology）\` | $f: X \\to Y$ is a bijection, and $f$ and $f^{-1}$ are both continuous | explicitly gives the alternative name “topological equivalence” |
| \`梁灿彬《微分几何入门与广义相对论》（Liang Canbin, An Introduction to Differential Geometry and General Relativity）\` | $f$ satisfies (a) one-to-one and onto; (b) both $f$ and $f^{-1}$ are continuous | splits “one-to-one and onto” and “two-way continuity” into two parallel conditions to stress them |

Merits and drawbacks of the three formulations: You Chengye’s is concise and gives the alternative name “topological transformation”; Bao Zhiqiang’s brings out the conceptual content of “topological equivalence”; Liang Canbin’s puts the two conditions side by side, which makes them easy for a beginner to check one by one.

### Analysis of the necessary conditions

**The condition “$f^{-1}$ is continuous” cannot be dropped** — it does not follow from “one-to-one correspondence” and “$f$ continuous”. The classical counterexample:

Let $S^1$ be the unit circle in the complex plane and define $f: [0,1) \\to S^1$ by

$$ f(t) = e^{i2\\pi t} = (\\cos 2\\pi t, \\sin 2\\pi t). $$

This map coils a half-open interval onto the circle so that its two ends meet. It is easy to verify that it is a continuous bijection, but $f^{-1}$ is not continuous: $[0, \\frac{1}{2})$ is an open set of $[0,1)$, whereas $(f^{-1})^{-1}([0, \\frac{1}{2}]) = f([0, \\frac{1}{2}))$ is the upper semicircle including the point $1$, and $1$ is not an interior point of it, so it is not an open set. In other words, $[0,1/2)$ is a neighbourhood of $0$, but its preimage under $f^{-1}$ contains only half of an arc and is not a neighbourhood of $f(0)$.

**“Continuity in both directions” cannot be reduced to one direction**, and a homeomorphism requires the topological structures fixed on the two sides not to be altered: in the theorem, the pair $X, Y$ are [topological spaces](/nodes/dg%3Atopological-space) whose topologies are each fixed in advance, and they may not be changed at will. For example, taking two different topologies $\\tau_1, \\tau_2$, the statement $(X, \\tau_1) \\cong (X, \\tau_2)$ usually fails.

**A classical counterexample** (showing that the continuity of $f^{-1}$ cannot be omitted):  
Take $X=[0,1)$ (a half-open interval) and $Y=S^1=\\{ (x,y)\\in\\mathbb{E}^2\\mid x^2+y^2=1\\}$ (the circle), each with the metric topology induced by the Euclidean metric. Define  
$$f:[0,1)\\to S^1,\\quad t\\mapsto (\\cos(2\\pi t),\\sin(2\\pi t)).$$  
This is a continuous bijection, but its inverse $f^{-1}$ is not continuous: for $[0,1/2)$ is an open neighbourhood of $0$ in $[0,1)$, while its image under $f$ (an upper semicircular arc including the point $1$) is not an open neighbourhood of $f(0)= (1,0)$ in $S^1$. This shows that the inverse of a continuous bijection need not be continuous.
### Equivalent expressions

A homeomorphism has several important equivalent characterisations:

1. **Correspondence of open sets**: $f: X \\to Y$ is a homeomorphism if and only if $f$ is a bijection and the image $f(U)$ of every open set $U$ of $X$ is an open set of $Y$, while the preimage $f^{-1}(V)$ of every open set $V$ of $Y$ is an open set of $X$. In other words, a homeomorphism establishes not only a one-to-one correspondence between points but also a **one-to-one correspondence between the families of open sets and between the families of closed sets**.
2. **The inverse-map viewpoint**: $f$ is a homeomorphism if and only if $f$ is a continuous bijection and $f^{-1}$ is continuous (equivalently, $f$ and $f^{-1}$ both take open sets to open sets).
3. **The topological-property viewpoint**: homeomorphic spaces have essentially the same continuity, and every property determined by the topology can be carried over to the other space “holographically” by $f$. Hence from the purely topological point of view, two mutually homeomorphic [topological spaces](/nodes/dg%3Atopological-space) may be regarded as equal.

**A short proof of (1) ⇒ (2)**: if $f$ and $f^{-1}$ are both continuous and $f$ is a bijection, then for an open set $U$ of $X$ note that $f(U) = (f^{-1})^{-1}(U)$ is an open set of $Y$; and for an open set $V$ of $Y$, the set $f^{-1}(V)$ is open directly by continuity. The converse is argued in the same way. □

### Kinds of statement

Related notions in the family of homeomorphism concepts:

- **Embeddings**: if $f: X \\to Y$ is an injective continuous map and $f: X \\to f(X)$ is a homeomorphism, then $f: X \\to Y$ is called an embedding. For example, the inclusion map $i: A \\to X$ is an embedding. If $f: X \\to Y$ is a homeomorphism and $A \\subset X$, then $f|_A: A \\to Y$ is an embedding.
- **Simplicial homeomorphisms (isomorphisms)**: between simplicial complexes, if a correspondence of vertices preserves the relation of “spanning a simplex” and the induced simplicial map is a homeomorphism, it is called a simplicial homeomorphism or an isomorphism.
- **Diffeomorphisms**: between [smooth manifolds](/nodes/dg%3Asmooth-manifold), a map that is smooth, invertible and smooth in both directions; this is a homeomorphism strengthened by a [smooth structure](/nodes/dg%3Asmooth-structure).
- **The relation between homeomorphisms and quotient maps**: quotient spaces and quotient maps essentially consider the same problem — the former is convenient for understanding a space itself, the latter for considering maps between spaces.

### How are the relevant statements expressed in natural language?

- “$X$ and $Y$ are homeomorphic” is often said as: **“from the topological point of view, $X$ and $Y$ are the same space”**.
- “$f$ is a homeomorphism” is often said as: **“$f$ sets up a perfect correspondence between the two spaces, point by point and open set by open set”**.

### Reduction

In the language of set theory: a homeomorphism $f: (X, \\mathcal{T}) \\to (Y, \\mathcal{S})$ is a bijection $f: X \\to Y$ such that the induced map on power sets $f[\\cdot]: \\mathcal{P}(X) \\to \\mathcal{P}(Y)$ maps the topology $\\mathcal{T}$ bijectively onto the topology $\\mathcal{S}$ — that is, $f[\\mathcal{T}] = \\mathcal{S}$. A homeomorphism carries the whole “set of points + structure of open sets” over unchanged.

### Lifting

- For maps between [topological spaces](/nodes/dg%3Atopological-space), the differentiability $C^r$ ($r > 0$) of an ordinary function cannot be generalised in terms of open sets; the strongest requirement for maps between [topological spaces](/nodes/dg%3Atopological-space) is already embodied in the definition of a homeomorphism. $C^0$ (continuity) can be generalised, whereas $C^r$ and $C^\\infty$ (smoothness) make sense only between [smooth manifolds](/nodes/dg%3Asmooth-manifold) carrying a differentiable structure — there the corresponding notion is the diffeomorphism.
- From the categorical point of view (as a way of understanding), a homeomorphism is an isomorphism in the category of [topological spaces](/nodes/dg%3Atopological-space): a morphism that is invertible and preserves the structure (the open sets) in both directions.

### Understanding through links with similar objects

- **Homotopy**: a homeomorphism is a map that works in one step, not a slow, gradual deformation; such a gradual process of deformation corresponds to another central notion of topology — homotopy. The rigorous mathematical definition and the popular “plasticine deformation” phrasing are different things.
- **Isomorphism/equivalence relation**: homeomorphism is an equivalence relation on the set of all [topological spaces](/nodes/dg%3Atopological-space), exactly parallel in logical structure to an equivalence relation on a set (reflexivity, symmetry, transitivity).
- **Continuous maps**: a homeomorphism is a “bijection continuous in both directions”, whereas a continuous map is the most basic morphism of topology.
- **Quotient spaces**: one classical pattern of argument is: to prove that a quotient space $X/\\!\\sim$ is homeomorphic to a known space $Y$, construct a quotient map $f:X\\to Y$ with $f(x)=f(x')\\iff x\\sim x'$, and then use the properties of quotient maps to conclude $X/\\!\\sim\\cong Y$.
- **Topological invariants**: to prove that two spaces are **not homeomorphic**, one usually has to find a property preserved under homeomorphisms (a topological invariant) whose values differ for the two spaces. Common topological invariants include: connectedness, [compactness](/nodes/dg%3Acompactness), the countability axioms, the separation axioms, the Euler characteristic, the fundamental group and the homology groups.

## Proof

**Theorem (homeomorphism is an equivalence relation between [topological spaces](/nodes/dg%3Atopological-space))**

(1) Reflexivity: $X \\cong X$; (2) Symmetry: if $X \\cong Y$, then $Y \\cong X$; (3) Transitivity: if $X \\cong Y, \\ Y \\cong Z$, then $X \\cong Z$.

### Proof sketch

In one sentence: the identity map, the inverse map and the composite map each preserve the property of being a “bijection continuous in both directions”.

### Detailed proof

**(1)** The identity map $id_X: X \\to X$ is a homeomorphism (the preimage of every neighbourhood is that neighbourhood itself; note that here the domain and the codomain are required to carry exactly the same topological structure).

**(2)** If $f: X \\to Y$ is a homeomorphism, then $f^{-1}: Y \\to X$ is a homeomorphism too (the inverse of $f^{-1}$ is $f$, and both are continuous).

**(3)** If there are homeomorphisms $f: X \\to Y$ and $g: Y \\to Z$, then the composite map $g \\circ f: X \\to Z$ is a bijection and its inverse

$$ (g \\circ f)^{-1} = f^{-1} \\circ g^{-1} $$

is continuous as well (the composite of continuous maps is continuous), so $g \\circ f$ is a homeomorphism. □

## Applications

### Direct applications

The following are the most classical constructions of homeomorphisms (all are standard examples given by the textbooks in the knowledge base):

**Example 1 (an open interval and the line)** An open interval (as a subspace of $E^1$) is homeomorphic to $E^1$. For instance, a homeomorphism from $(-\\frac{\\pi}{2}, \\frac{\\pi}{2})$ onto $E^1$ can be prescribed as

$$ f(x) = \\tan x, \\quad \\forall x \\in \\left(-\\frac{\\pi}{2}, \\frac{\\pi}{2}\\right). $$

An explicit homeomorphism in the other direction is $f: \\mathbb{E}^1 \\to (-1, 1), \\ x \\mapsto \\frac{x}{1 + |x|}$. Any open interval $(a, b) \\subset \\mathbb{R}$ is homeomorphic to $\\mathbb{R}$.

**Example 2 (the interior of a ball and the whole space)** The interior $\\dot{D}^n$ of the unit ball $D^n = \\{x \\in E^n \\mid \\|x\\| \\le 1\\}$ in $E^n$ is homeomorphic to $E^n$, with the homeomorphism $f(x) = \\frac{x}{1 - \\|x\\|}$ and its inverse $f^{-1}(y) = \\frac{y}{1 + \\|y\\|}$.

Generalising to higher dimensions: let $B^n = \\{(x_1, \\cdots, x_n) \\in \\mathbb{E}^n \\mid x_1^2 + \\cdots + x_n^2 < 1\\}$; then $\\mathbb{E}^n \\cong B^n$, and the map $f: \\mathbb{E}^n \\to B^n, \\ x \\mapsto \\frac{x}{1 + \\|x\\|}$ is a homeomorphism.

**Example 3 (the whole space with one point removed)** $E^n \\setminus \\{O\\} \\cong E^n \\setminus D^n$ (where $O$ is the origin). Prescribe $f(x) = x + \\frac{x}{\\|x\\|}$: every point moves a unit length away from the origin, and $f$ is a one-to-one correspondence and continuous; $f^{-1}$ moves every point a unit length towards $O$, and is continuous too.

**Example 4 (stereographic projection)** The sphere $S^2$ with one point (the north pole) removed is homeomorphic to $E^2$. Stereographic projection is the homeomorphism taking the sphere minus the north pole to the equatorial plane, and its analytic expression is

$$ f(x, y, z) = \\left( \\frac{x}{1-z}, \\frac{y}{1-z} \\right). $$

Similarly, stereographic projection from the south pole, $\\varphi_1(x,y,z) = \\left( \\frac{x}{1+z}, \\frac{y}{1+z} \\right)$, maps $S^2 \\setminus \\{P_1\\}$ homeomorphically onto the whole plane. In the more general $n$-dimensional case, the two open sets obtained by removing the north pole and the south pole from $S^n$ are homeomorphic to $\\mathbb{R}^n$ under stereographic projection, and this is the standard atlas for proving that $S^n$ is an $n$-dimensional [smooth manifold](/nodes/dg%3Asmooth-manifold).

**Example 5 (a square and the circle)** Consider the circle $S^1 = \\{(x,y) \\in \\mathbb{E}^2 \\mid x^2 + y^2 = 1\\}$ and the square $X = (\\{-1,1\\} \\times [-1,1]) \\cup ([-1,1] \\times \\{-1,1\\})$. Central projection

$$ p: X \\to S^1, \\quad (x, y) \\mapsto \\left( \\frac{x}{\\sqrt{x^2+y^2}}, \\frac{y}{\\sqrt{x^2+y^2}} \\right) $$

is a bijection, and in the $\\varepsilon - \\delta$ language it is not hard to verify that both $p$ and $p^{-1}$ are continuous; hence it is a homeomorphism.

**Example 6 (a polygonal line and a closed interval)** Let $A_0, A_1, \\dots, A_m$ be a set of points in $n$-dimensional Euclidean space such that adjacent segments have no common points apart from their shared endpoints; then their union $L$ is homeomorphic to the closed interval $[0,1]$: construct piecewise homeomorphisms $f_i: \\overline{A_{i-1}A_i} \\to [\\frac{i-1}{m}, \\frac{i}{m}]$, glue all the $f_i$ together to obtain a continuous map $f$, and gluing all the $f_i^{-1}$ together gives exactly $f^{-1}$. Similarly, a closed loop made of such polygonal lines is homeomorphic to $S^1$.

**Example 7 (convex polygons)** Any convex polygons (interiors included) are mutually homeomorphic, and a convex polygon is homeomorphic to the disc $D^2$. Take a pentagon and a triangle: join diagonals to split each figure into three triangles, set up the affine transformations matching corresponding vertices — they agree on the common parts, so by the gluing lemma the assembled map $f$ and its inverse $f^{-1}$ are both continuous.

**Example 8 (a belt twisted $n$ times)** Match the points of the “flat belt” and the “belt twisted $n$ times” (the parametrised surface $A_n$) that have the same parameters; the map $f_n$ is a homeomorphism. Whether two spaces are homeomorphic depends on their internal topological structure, not on how the models look when placed in $E^3$.

### Indirect applications

- **Deciding that spaces are not homeomorphic (topological properties)**: a notion preserved under homeomorphisms is called a topological notion, and a property preserved under them a topological property. The notion of an open set is topological, and the closed sets, closures, neighbourhoods and interior points defined from it are topological too; [compactness](/nodes/dg%3Acompactness), connectedness, the $T_2$ property and separability are all topological properties. Studying the homeomorphism classification of [topological spaces](/nodes/dg%3Atopological-space) is a basic problem of topology, and topological properties play an important role in it: for example $(\\mathbb{R}, \\tau_f)$ is separable while $(\\mathbb{R}, \\tau_c)$ is not, so they are not homeomorphic. Conversely, boundedness is not a topological property — the open interval $(a,b)$ is homeomorphic to $\\mathbb{R}$, yet the former is bounded and the latter is not, from which one also sees that length is not a topological property.
- **Defining [manifolds](/nodes/dg%3Amanifold)**: a [manifold](/nodes/dg%3Amanifold) requires every point to have a neighbourhood homeomorphic to an open subset of Euclidean space. For example $S^1$ can be covered by four “open semicircles”, and the projection maps $\\psi_i^\\pm$ from each open semicircle to the open interval $(-1,1)$ are homeomorphisms, so $S^1$ is a one-dimensional [manifold](/nodes/dg%3Amanifold); an atlas with only two charts also covers $S^1$.
- **Quotient spaces and gluing**: take the torus $T^2$ as an example. The gluing process prescribes a continuous map from the cylinder $X$ to $T^2$, and using the compactness of $X$ and the fact that $T^2$ is a Hausdorff space one can prove that the corresponding one-to-one correspondence $g$ is a homeomorphism — in the topological sense, $T^2$ is the quotient space $X/\\sim$. Constructions by gluing that are otherwise hard to grasp, such as the projective plane, acquire a clear meaning in this way.
- **Characterising spaces by quotient maps**: theorem — if $p: X \\to Y$ and $q: X \\to Z$ are both quotient maps and $p(x) = p(x')$ if and only if $q(x) = q(x')$, then $Y$ and $Z$ are homeomorphic. This is the standard way of showing that “the space obtained by a gluing construction agrees with some space already defined”. A related theorem: let $f: X \\to Y$ be a quotient map and let $\\tilde{f}$ be the equivalence relation on $X$ defined by $f(x) = f(x')$; then the quotient space $X/\\tilde{f}$ is homeomorphic to $Y$.
- **Constructing lens spaces**: take two solid tori and glue their surfaces by the homeomorphism $h: (e^{i\\theta}, e^{i\\phi}) \\mapsto (e^{i(s\\theta+p\\phi)}, e^{i(t\\theta+q\\phi)})$ between the tori; the resulting space $V_1 \\cup_h V_2$ is called the lens space $L(p, q)$ — the homeomorphism is a basic tool for constructing new spaces.
- **Homeomorphism of convex sets with balls**: between a bounded convex set $\\bar{U}$ in $\\mathbb{R}^n$ and the unit ball $B^n$ there is a homeomorphism carrying the boundary $BdU$ onto the unit sphere $S^{n-1}$ (constructed using the fact that every ray starting from an interior point meets the boundary in exactly one point).

## Generalizations

- **Relaxing and strengthening the conditions**: between [topological spaces](/nodes/dg%3Atopological-space) a homeomorphism is already the “highest requirement”; if a differentiable structure is added between [smooth manifolds](/nodes/dg%3Asmooth-manifold), one obtains a diffeomorphism (for example, the map $(\\bar{x}, \\bar{y}) \\mapsto (x + \\frac{1}{2}, -\\bar{y})$ on $T^2 = \\mathbb{R}^2/\\mathbb{Z}^2$ is a diffeomorphism, and the Klein bottle is given by its fixed-point-free properly discontinuous group). Conversely, if $X$ is a [manifold](/nodes/dg%3Amanifold) and $f: X \\to Y$ is a homeomorphism, one can define a differentiable structure on $Y$ making $f$ a diffeomorphism.
- **Generalizing the conclusion**: the conclusion that an open interval is homeomorphic to $\\mathbb{R}$ generalises to higher dimensions: $\\mathbb{E}^n \\cong B^n$. That a sphere with a point removed is homeomorphic to a plane (stereographic projection) holds in every dimension, and further gives the complex analytic [manifold](/nodes/dg%3Amanifold) structure on $S^2$ (the transition map between the two stereographic projections, $w_0 = 1/w_1$, is a complex analytic function).
- **A compactness criterion**: in the example of the torus as a quotient space the following fact was used: when $X$ is compact and $Y$ is a Hausdorff space, a continuous one-to-one correspondence $g: X/\\sim \\to Y$ is a homeomorphism. This is a commonly used sufficient condition for verifying that a continuous bijection really is a homeomorphism (it converts the difficulty of “verifying that the inverse is continuous” into [compactness](/nodes/dg%3Acompactness) plus separation).

## Common misconceptions

1. **“A continuous bijection is a homeomorphism.”** This overlooks the condition that “$f^{-1}$ is continuous”. The counterexample is the map $f: [0,1) \\to S^1$ above (coiling a half-open interval onto the circle): continuous and bijective, but with discontinuous inverse. Beginners often assume that “bijective + continuous” automatically gives a continuous inverse, forgetting that continuity is a one-directional property.
2. **Understanding a homeomorphism as a slow “plasticine deformation”.** The rigorous definition is a map that works in one step, not a gradual process of deformation; gradual deformation corresponds to the notion of homotopy.
3. **Judging whether spaces are homeomorphic by their outward appearance.** Beginners easily think that the “flat belt” and the “belt twisted $n$ times” are not homeomorphic, yet they are — being homeomorphic depends on the internal topological structure of the space, not on how the models look when placed in $E^3$.
4. **Thinking that different topologies on the same set are homeomorphic.** The [topological spaces](/nodes/dg%3Atopological-space) $X, Y$ each have a topology fixed in advance, and $(X, \\tau_1) \\cong (X, \\tau_2)$ usually fails. A homeomorphism compares the whole “set + topology”, not the bare set.
5. **Thinking that boundedness and length are topological properties.** The open interval $(a,b)$ is homeomorphic to $\\mathbb{R}$, yet the former is bounded and the latter is not; length is not preserved under homeomorphisms either.

## Insights

- **“Topologists draw circles and squares”**: the “little differences” of geometric shape are entirely meaningless for the topological questions that concern a topologist. This reminds us to distinguish the two levels of “geometric information” and “topological information”.
- **“Holographic carrying”**: a homeomorphism establishes not only a one-to-one correspondence between points but also one between open subsets, so that every property determined by the topology can be “carried holographically” by $f$ — from the purely topological point of view, mutually homeomorphic spaces may be regarded as equal. This viewpoint of “carrying a whole structure over” recurs throughout mathematics.
- **The teaching value of counterexamples**: the counterexample $[0,1) \\to S^1$ shows profoundly the necessity of every condition in the definition. Constructing counterexamples and deleting conditions to see how a conclusion collapses is the best way to understand a definition.
- **Quotient spaces make intuition rigorous**: through homeomorphisms the intuitive construction of “gluing” acquires a rigorous quotient-space meaning, and constructions by gluing that are otherwise hard to grasp, such as the projective plane, acquire a clear meaning too — abstract notions and intuitive background confirm each other here.

## Summary

### Idea

A homeomorphism = a bijection continuous in both directions = carrying the topological structure of one space (its family of open sets) unchanged onto another space. It is the standard of “being essentially the same” in topology.

### Methods

- **Explicit construction**: write down the map and verify continuity in both directions (such as $\\tan x$, $\\frac{x}{1+\\|x\\|}$, stereographic projection, central projection).
- **Making the inverse explicit**: to prove that $\\varphi$ is a homeomorphism it suffices to write the inverse map in explicit form and believe in its continuity (such as the circle projection $\\varphi_1^{-1}(x) = (x, \\sqrt{1-x^2})$).
- **Gluing/assembling**: glue piecewise homeomorphisms consistently on common parts; by the gluing lemma (continuous on a locally finite closed cover implies continuous overall) one obtains a global homeomorphism (convex polygons, polygonal lines).
- **The topological-invariant method**: use separability, [compactness](/nodes/dg%3Acompactness), connectedness, the $T_2$ property and other topological properties to decide that two spaces are not homeomorphic (the classification problem).
- **The compactness–Hausdorff criterion**: a continuous one-to-one correspondence from a compact space to a Hausdorff space is automatically a homeomorphism (verification of quotient spaces).

## Looking back and asking

- Why is $S^1$ with one point removed homeomorphic to $\\mathbb{R}$, whereas $S^1$ as a whole is not homeomorphic to $\\mathbb{R}$? (Hint: think of topological properties such as [compactness](/nodes/dg%3Acompactness) and connectedness.)
- In the counterexample $[0,1) \\to S^1$, exactly which “topological event” destroys the continuity of the inverse map? If $[0,1)$ is replaced by $(0,1)$, can a similar counterexample still be constructed?
- Between [topological spaces](/nodes/dg%3Atopological-space) the “highest requirement” is a homeomorphism; after adding a differentiable structure, where exactly does the difference between a “diffeomorphism” and a homeomorphism show up? Can you give an example of spaces that are homeomorphic but not diffeomorphic?
- The homeomorphism classification is a basic problem of topology: which tools (topological invariants) are available today for distinguishing non-homeomorphic spaces? For which classes of spaces is a complete classification still unsolved?

---

## References

1. \`尤承业（You Chengye），基础拓扑学讲义（Lectures on Basic Topology）\`
2. \`包志强（Bao Zhiqiang），点集拓扑与代数拓扑引论（Introduction to Point-Set Topology and Algebraic Topology）\`
3. \`梁灿彬、周彬（Liang Canbin, Zhou Bin），微分几何入门与广义相对论（3 册合集 / An Introduction to Differential Geometry and General Relativity, three-volume set）\`
4. \`А. С. 米先柯、А. Т. 福明柯（A. S. Mishchenko, A. T. Fomenko），微分几何与拓扑学简明教程（A Concise Course in Differential Geometry and Topology）\`
5. \`梅加强（Mei Jiaqiang），流形与几何初步（Manifolds and Introductory Geometry）\`
6. \`Munkres，代数拓扑基础（Elements of Algebraic Topology）\`
7. \`姜伯驹（Jiang Boju），同调论（Homology Theory）\`
8. \`贝尔热、戈斯丢（Berger, Gostiaux）（王耀东译 / trans. Wang Yaodong），微分几何：流形、曲线和曲面（第二版修订本）（Differential Geometry: Manifolds, Curves and Surfaces, 2nd revised ed.）\``,

  'dg:manifold': `## Manifolds

> A manifold is one of the most important foundational notions of modern mathematics. It abstracts geometric objects such as curves and surfaces, which look locally like Euclidean space, into a general kind of space, so that calculus can be applied locally while the richness of the global topological structure is retained. Manifolds are the common cornerstone of modern differential geometry, topology, general relativity, gauge field theory and many other fields.

**Source tags.** #geometry #topology #differential-geometry #manifold

**Source.** The read-only snapshot \`G:/DifferentialGeometry/object/def/流形.md\` (see \`data/dg/\`).

---

---

## Prerequisites

### Essential

- **[Topological spaces](/nodes/dg%3Atopological-space)**: knowing what an open set, a continuous map and a [homeomorphism](/nodes/dg%3Ahomeomorphism) are. The definition of a manifold first requires the underlying space to be a [topological space](/nodes/dg%3Atopological-space).
- **Euclidean space**: familiarity with $\\mathbb{R}^n$ and the notion of an open subset of it. A manifold is locally [homeomorphic](/nodes/dg%3Ahomeomorphism) to an open subset of $\\mathbb{R}^n$.
- **Basic calculus**: understanding the differentiability of functions of several variables, the Jacobi matrix and the Jacobi determinant. These are the basic tools for defining a differentiable structure and differentiable maps.

### Supporting

- **The Hausdorff axiom ($T_2$)**: any two distinct points have disjoint open neighbourhoods. A manifold is required to be Hausdorff so that limits are unique and certain “strange” [topological spaces](/nodes/dg%3Atopological-space) are excluded.
- **The second countability axiom ($A_2$)**: the [topological space](/nodes/dg%3Atopological-space) has a countable topological basis. This property guarantees that a manifold has a countable coordinate cover, and is the premise of technical results such as the [embedding theorem](/nodes/dg%3Asmooth-embedding).
- **Linear algebra**: the tangent space is a linear space; understanding [vector spaces](/nodes/bg%3Alinear%3Avector), linear transformations and dual spaces is crucial for the later study of the [tangent bundle](/nodes/dg%3Atangent-bundle) and [tensor](/nodes/dg%3Atensor) fields.

### Further

- **The fundamental group and homology groups**: tools of algebraic topology used to distinguish manifolds of different topological types and to define orientability. For example, $S^2$ and $T^2$ have different fundamental groups, so they are not [homeomorphic](/nodes/dg%3Ahomeomorphism).
- **[Riemannian metrics](/nodes/manifold%3Achart-atlas)**: adding a smooth inner product structure to a manifold gives a Riemannian manifold, on which distances, angles and curvature can be measured.
- **Complex manifolds**: manifolds that are locally [homeomorphic](/nodes/dg%3Ahomeomorphism) to $\\mathbb{C}^n$ with holomorphic transition maps; they are the central objects of complex geometry and algebraic geometry.

---

## Motivation

### Motivation for introducing it

**Why are manifolds needed?**

Human understanding of space has passed from the local to the global. On the Euclidean plane we can describe the whole space in one coordinate system; but on a sphere (the surface of the Earth, say) no single coordinate system can cover all points at once without producing singular points — the ancient practice of map-making already tells us that a sphere needs several maps glued together for a complete description.

Inside mathematics, Gauss’s study of surfaces found that curvature is an **intrinsic geometric quantity**, depending only on the first fundamental form of the surface and not on the way the surface is embedded in the surrounding space. This inspired Riemann to abstract the notion of a surface away from Euclidean space and generalise it to higher dimensions. In his 1854 inaugural lecture Riemann put forward the notion of a manifold, to describe the set of values that variables subject to certain constraints can take — for example, the unit sphere in Euclidean space is a manifold, the constraint being that the length of the vector is 1.

In physics, the spacetime of general relativity is a four-dimensional “continuous space” that looks locally like $\\mathbb{R}^4$ but may globally differ from $\\mathbb{R}^4$. A [differentiable manifold](/nodes/manifold%3Ack-atlas) is precisely the accurate formulation of such a “continuous space”.

**Three threads converge on the same point:**

- **A thread internal to the discipline**: the Gauss–Bonnet theorem links a geometric quantity (curvature) with a topological quantity (the Euler characteristic), encouraging us to study topological questions by geometric means, which requires a framework accommodating both geometry and topology.
- **A thread from outside**: in general relativity spacetime is not flat but a curved four-dimensional manifold; the phase space of classical mechanics and the configuration space of a robot arm are manifolds as well.
- **An aesthetic/structural thread**: mathematicians wanted to generalise calculus from $\\mathbb{R}^n$ to more general spaces, and a manifold is exactly “the largest natural stage on which calculus can be developed”.

### Motivation for the construction

**From an atlas to a manifold: from the sphere to the abstract definition**

The idea behind the construction of a manifold is exactly that of map-making. Take the surface of the Earth $S^2$ as an example:

1. **Draw maps region by region**: divide the surface of the Earth into several regions (the eastern and western hemispheres, say) and draw a flat map for each region. Each map is a [homeomorphism](/nodes/dg%3Ahomeomorphism) from that region onto an open subset of $\\mathbb{R}^2$.
2. **Reconcile the overlaps**: adjacent maps must agree on their overlap — that is, passing from coordinates on one map to coordinates on another must be smooth (differentiable).
3. **Assemble the whole**: all the maps together describe the sphere completely.

This simple idea is abstracted into the language of modern mathematics: a family of **local charts** $(U_\\alpha, \\varphi_\\alpha)$ covering the whole space, with the **transition maps** between charts satisfying a differentiability condition, constitutes a **[differentiable manifold](/nodes/manifold%3Ack-atlas)**.

---

## Form

### Canonical general form

#### [Topological manifolds](/nodes/dg%3Atopological-manifold)

If every point of a Hausdorff space $M$ has a neighbourhood [homeomorphic](/nodes/dg%3Ahomeomorphism) to an open subset of $\\mathbb{R}^n$, then $M$ is called an **$n$-dimensional [topological manifold](/nodes/dg%3Atopological-manifold)** (or an $n$-dimensional manifold for short); $n$ is called the dimension of the manifold $M$, written $\\dim M = n$.

#### $C^r$ [differentiable manifolds](/nodes/manifold%3Ack-atlas) ([smooth manifolds](/nodes/dg%3Asmooth-manifold))

Let $M$ be a [topological space](/nodes/dg%3Atopological-space) with the properties $A_2$ (second countable) and $T_2$ (Hausdorff). If there is an open cover $\\{U_\\alpha\\}_{\\alpha \\in \\Gamma}$ of $M$ together with a corresponding family of continuous maps $\\varphi_\\alpha : U_\\alpha \\to \\mathbb{R}^n$ such that:

1. $\\varphi_\\alpha : U_\\alpha \\to \\varphi_\\alpha(U_\\alpha) \\subset \\mathbb{R}^n$ is a **[homeomorphism](/nodes/dg%3Ahomeomorphism)** from $U_\\alpha$ onto the open subset $\\varphi_\\alpha(U_\\alpha)$ of Euclidean space;
2. whenever $U_\\alpha \\cap U_\\beta \\neq \\varnothing$, the transition map
   $$\\varphi_\\beta \\circ \\varphi_\\alpha^{-1} : \\varphi_\\alpha(U_\\alpha \\cap U_\\beta) \\to \\varphi_\\beta(U_\\alpha \\cap U_\\beta)$$
   is a $C^r$ map ($r \\ge 1$),

then $M$ is called a $C^r$ manifold. If $r = \\infty$, then $M$ is called a **[smooth manifold](/nodes/dg%3Asmooth-manifold)** (or a $C^\\infty$ manifold). If all the transition maps are real analytic ($C^\\omega$), then $M$ is called a **real analytic manifold**.

**Terminology**: $\\{U_\\alpha\\}$ or $\\{(U_\\alpha, \\varphi_\\alpha)\\}$ is called a **local coordinate cover** (or **atlas**) of $M$, $(U_\\alpha, \\varphi_\\alpha)$ is a **local coordinate system** (or **chart**), $U_\\alpha$ is a local coordinate neighbourhood, and $\\varphi_\\alpha$ is a local coordinate map.

#### Differentiable structures

A “maximal” local coordinate cover compatible with a given local coordinate cover $\\mathcal{D}$ is called a **differentiable structure** on $M$. The same [topological manifold](/nodes/dg%3Atopological-manifold) can carry different differentiable structures. For example:
- **Moise’s theorem**: a [topological manifold](/nodes/dg%3Atopological-manifold) of dimension $\\le 3$ carries a unique differentiable structure.
- **Milnor’s exotic spheres**: the seven-dimensional sphere $S^7$ carries 28 different differentiable structures (forming a finite cyclic group).
- **The exotic phenomenon in $\\mathbb{R}^4$**: apart from $\\mathbb{R}^4$, Euclidean space carries a unique differentiable structure; on $\\mathbb{R}^4$ there are uncountably many different differentiable structures (Freedman–Donaldson and others).

### Analysis of the necessary conditions

#### Why is the Hausdorff axiom ($T_2$) needed?

If the Hausdorff property is not required, some “strange” spaces appear. For example, on the union of two lines $\\mathbb{E}^1 \\times \\{0,1\\}$, define an equivalence relation that glues together every pair $(x,0)$ and $(x,1)$ except for $(0,0)$ and $(0,1)$. Every point of the resulting quotient space $X$ has a neighbourhood [homeomorphic](/nodes/dg%3Ahomeomorphism) to an open subset of $\\mathbb{E}^1$, but any neighbourhoods of $(0,0)$ and $(0,1)$ intersect, so $X$ is not a Hausdorff space. Such a space does not match our intuition that “points can be distinguished”, and limits are not unique, so analysis cannot be developed well on it.

#### Why is the second countability axiom ($A_2$) needed?

Second countability guarantees that a manifold has a countable coordinate cover, which is the premise of many important theorems (Whitney’s [embedding theorem](/nodes/dg%3Asmooth-embedding), for instance, requires the manifold to be second countable). Without this condition a manifold may be too “huge” to be embedded in a finite-dimensional Euclidean space.

### Equivalent expressions

The definition of a manifold has several equivalent formulations; two common ones are the following:

| Formulation | Key points |
|---------|---------|
| **Cover by charts** (the definition above) | an open cover + [homeomorphisms](/nodes/dg%3Ahomeomorphism) onto open subsets of $\\mathbb{R}^n$ + differentiable transition maps |
| **The atlas definition** | a family of charts $(U_i, \\varphi_i)$ with $M = \\bigcup_i U_i$, each $\\varphi_i(U_i)$ an open subset of $\\mathbb{R}^n$, each $\\varphi_i$ a bijection, and each $\\varphi_j \\circ \\varphi_i^{-1}$ differentiable |

The two definitions are essentially equivalent; the atlas definition emphasises the viewpoint that a “maximal compatible atlas” is the differentiable structure.

### How are the relevant statements expressed in natural language?

- **“A manifold is a space that looks locally like Euclidean space”** — the most intuitive understanding.
- **“A manifold is a surface/space on which coordinate systems can be laid out”** — emphasising the role of charts.
- **“A manifold is the largest stage on which calculus can be developed”** — from the point of view of analysis.

### Reduction

Restating the definition of a [differentiable manifold](/nodes/manifold%3Ack-atlas) in more basic language:

> A [differentiable manifold](/nodes/manifold%3Ack-atlas) = a [topological space](/nodes/dg%3Atopological-space) + a family of open sets covering it + a [homeomorphism](/nodes/dg%3Ahomeomorphism) from each open set onto an open subset of $\\mathbb{R}^n$ + the condition that the composite of [homeomorphisms](/nodes/dg%3Ahomeomorphism) on overlaps is differentiable.

This is in essence a **compatibility condition**: the way in which different “maps” describe the same position on an overlap must be smooth.

### Lifting

In higher-level theories, a manifold is:

- a special case of a **Riemannian manifold** (a [smooth manifold](/nodes/dg%3Asmooth-manifold) with a [Riemannian metric](/nodes/manifold%3Achart-atlas)), which allows us to measure distances, angles and curvature;
- the central object studied in **differential geometry** and **differential topology** — the former concerned with additional geometric structure (metrics, connections and so on), the latter with the differentiable classification of manifolds themselves;
- the real analogue of a **complex manifold** — a complex manifold is locally [homeomorphic](/nodes/dg%3Ahomeomorphism) to $\\mathbb{C}^n$ with holomorphic transition maps, and is the foundation of algebraic geometry;
- the natural stage for **Stokes’ theorem** — Stokes’ theorem on manifolds unifies Green’s formula, the Gauss formula and the Stokes formula of multivariable calculus.

---

## Proof

### Proof sketch

**Lemma: a connected [topological manifold](/nodes/dg%3Atopological-manifold) must be path connected.**

**Idea of the proof**: let $M$ be a connected [topological manifold](/nodes/dg%3Atopological-manifold). For any $p \\in M$, define $C_p = \\{q \\in M \\mid \\text{there is a path joining } p \\text{ and } q\\}$. Since a manifold is locally [homeomorphic](/nodes/dg%3Ahomeomorphism) to Euclidean space, that is, locally path connected, $C_p$ is a non-empty open set. For $p \\neq q$, the sets $C_p$ and $C_q$ are either equal or disjoint. If $C_p \\neq M$, then $M - C_p = \\bigcup_{q \\notin C_p} C_q$ is also open, contradicting the connectedness of $M$. Hence $C_p = M$, that is, $M$ is path connected. □

This proof shows how a local property of manifolds (locally Euclidean → locally path connected) yields a global property (connected → path connected); it is a classical example of “local to global” reasoning in manifold theory.

---

## Applications

### Direct applications

#### Example 1: the unit circle $S^1$

$$S^1 = \\{(x,y) \\in \\mathbb{R}^2 \\mid x^2 + y^2 = 1\\} = \\{e^{i\\theta} \\mid \\theta \\in [0,2\\pi]\\}$$

Let $U_1 = S^1 - \\{(1,0)\\}$ and $U_2 = S^1 - \\{(-1,0)\\}$, so that $S^1 = U_1 \\cup U_2$. Define
$$\\varphi_1(e^{i\\theta}) = \\theta,\\ \\theta \\in (0,2\\pi)$$
$$\\varphi_2(e^{i\\eta}) = \\eta,\\ \\eta \\in (\\pi,3\\pi)$$

Both are [homeomorphisms](/nodes/dg%3Ahomeomorphism). The transition map
$$\\varphi_2 \\circ \\varphi_1^{-1}(\\theta) = \\begin{cases} \\theta + 2\\pi, & \\theta \\in (0,\\pi) \\\\ \\theta, & \\theta \\in (\\pi,2\\pi) \\end{cases}$$
is a smooth map, so $S^1$ is a [smooth manifold](/nodes/dg%3Asmooth-manifold). **In the sense of classification, $\\mathbb{R}$ and $S^1$ are the only two connected one-dimensional manifolds.**

#### Example 2: the $n$-dimensional sphere $S^n$

$$S^n = \\left\\{(x^1,\\dots,x^{n+1}) \\mid \\sum_{i=1}^{n+1} (x^i)^2 = 1\\right\\}$$

Cover it with two charts: $U_1 = S^n - \\{(0,\\dots,0,-1)\\}$ and $U_2 = S^n - \\{(0,\\dots,0,1)\\}$, and define the stereographic projections respectively:
$$\\varphi_1(x^1,\\dots,x^{n+1}) = \\left(\\frac{x^1}{1 + x^{n+1}},\\dots,\\frac{x^n}{1 + x^{n+1}}\\right)$$
$$\\varphi_2(x^1,\\dots,x^{n+1}) = \\left(\\frac{x^1}{1 - x^{n+1}},\\dots,\\frac{x^n}{1 - x^{n+1}}\\right)$$
The transition map $\\varphi_2 \\circ \\varphi_1^{-1} : \\mathbb{R}^n - \\{0\\} \\to \\mathbb{R}^n - \\{0\\}$ is smooth. $S^n$ is an $n$-dimensional smooth, orientable, compact and connected manifold.

#### Example 3: the $n$-dimensional real projective space $\\mathbb{RP}^n$

$$\\mathbb{RP}^n = (\\mathbb{R}^{n+1} - \\{0\\}) / \\sim,\\quad x \\sim y \\iff \\exists \\lambda \\neq 0 \\text{ such that } x = \\lambda y$$

$\\mathbb{RP}^n$ can also be seen as the quotient space $S^n / \\sim$ of $S^n$ (identifying antipodal points). It has a natural [differentiable manifold](/nodes/manifold%3Ack-atlas) structure, and is a compact manifold that is non-orientable (when $n$ is even) or orientable (when $n$ is odd).

### Indirect applications

#### Applications in physics

- **General relativity**: spacetime is a four-dimensional pseudo-Riemannian manifold, and the distribution of matter determines the curvature of spacetime through the Einstein field equations.
- **Gauge field theory**: physical fields are sections of fibre bundles over a manifold, and Yang–Mills theory describes the interactions of elementary particles on a manifold.
- **Classical mechanics**: the configuration space of a system is a manifold — the configuration space of a simple pendulum is $S^1$, and that of a double pendulum is $T^2$.

#### Applications in computer science

- **Manifold learning**: high-dimensional data often lie near a low-dimensional manifold, and dimensionality-reduction algorithms (such as Isomap and t-SNE) try to recover this low-dimensional manifold structure.
- **Robotics**: the joint space of a robot arm is a manifold (such as $S^1 \\times S^1$), and motion planning requires finding paths on that manifold.

#### Applications inside mathematics

- **Stokes’ theorem on manifolds**: it unifies Green’s theorem, the Gauss divergence theorem and the classical Stokes theorem of multivariable calculus.
- **Poincaré duality**: on a compact oriented manifold there is an elegant duality between homology and cohomology.
- **The Atiyah–Singer index theorem**: the analytic index of an elliptic operator on a manifold equals its topological index, linking analysis and topology.

---

## Generalizations

### Relaxing the hypotheses

#### Manifolds with boundary

Replacing $\\mathbb{R}^n$ by the upper half-space $\\mathbb{H}_+^n = \\{(x^1,\\dots,x^n) \\in \\mathbb{R}^n \\mid x^n \\ge 0\\}$ gives the notion of a **manifold with boundary**. Boundary points correspond to the points with $x^n = 0$. A compact connected manifold without boundary is called a **closed manifold**, and a non-compact connected manifold without boundary is called an **open manifold**. One can prove that the boundary $\\partial M$ of a manifold with boundary is an $n-1$-dimensional manifold without boundary.

#### Complex manifolds

Replacing $\\mathbb{R}^n$ by $\\mathbb{C}^n$ and requiring the transition maps to be holomorphic gives a **complex manifold**. A complex manifold is automatically a $2n$-dimensional [smooth manifold](/nodes/dg%3Asmooth-manifold). For example $\\mathbb{CP}^n$ (complex projective space) is an important complex manifold.

### Generalizing the conclusion

#### Infinite-dimensional manifolds

Replacing $\\mathbb{R}^n$ by an infinite-dimensional Banach space or Hilbert space gives an infinite-dimensional manifold, a common object of study in functional analysis and global analysis.

### Open problems

- **Existence and uniqueness of differentiable structures**: which [topological manifolds](/nodes/dg%3Atopological-manifold) carry a differentiable structure? How many do they carry? The discovery of uncountably many differentiable structures on $\\mathbb{R}^4$ was one of the most startling achievements of twentieth-century differential topology, but the situation for higher-dimensional Euclidean spaces is not yet completely clear.
- **The Poincaré conjecture** (proved by Perelman): a simply connected closed three-dimensional manifold is [homeomorphic](/nodes/dg%3Ahomeomorphism) to $S^3$. Its higher-dimensional generalisations (the generalised Poincaré conjecture) have also been settled, but the classification problem is still active.
- **The Borel conjecture**: are homotopy equivalent closed manifolds of non-positive curvature necessarily [homeomorphic](/nodes/dg%3Ahomeomorphism)?

---

## Common misconceptions

**Misconception 1: “A manifold must be embedded in some Euclidean space.”**

**Fact**: the definition of a manifold is **intrinsic** — it does not depend on any ambient space. Although Whitney’s [embedding theorem](/nodes/dg%3Asmooth-embedding) tells us that every [smooth manifold](/nodes/dg%3Asmooth-manifold) can be embedded in a Euclidean space of sufficiently high dimension, the embedding is not part of the definition. In essence “a manifold is itself a space”, not “a subset of Euclidean space”.

**Misconception 2: “Calculus on a manifold is the same as calculus in Euclidean space.”**

**Fact**: calculus on a manifold is done by pulling the problem back into Euclidean space through **local coordinate systems**, but **globally** one has to handle the compatibility brought about by coordinate transformations. For instance, a function on a manifold is differentiable if and only if its expression in every local coordinate system is differentiable, and the expressions in different coordinate systems must be mutually compatible through the coordinate transformations.

**Misconception 3: “The Hausdorff condition in the definition of a manifold is optional.”**

**Fact**: the Hausdorff condition is indispensable. Without it there appear strange spaces in which “two points are too close to be separated by open sets”, so that limits are not unique and analysis cannot be carried out properly. Beginners often overlook its necessity because Hausdorff is a “common” condition, but there do exist spaces that are locally Euclidean without being Hausdorff (such as the example of a line with the origin doubled).

**Misconception 4: “All manifolds are orientable.”**

**Fact**: many common manifolds (the sphere, the torus) are indeed orientable, but there are also non-orientable manifolds, the most famous examples being the Möbius band (with boundary), the Klein bottle (without boundary) and the real projective plane $\\mathbb{RP}^2$ (without boundary). On a non-orientable manifold one cannot consistently define a “clockwise” direction.

---

## Insights

- **“The dialectic of the local and the global”** is the most central lesson of the idea of a manifold. A manifold uses local coordinate systems to “simplify” a complicated space into Euclidean space, and then ensures global consistency through the compatibility conditions on coordinate transformations. This pattern of thought, “localise + glue”, recurs throughout mathematics (fibre bundles, sheaves, the fundamental group of a [topological space](/nodes/dg%3Atopological-space) …).

- **“Understanding the unknown by means of the known”** — a complicated space that cannot be understood directly is approximated near each point by the $\\mathbb{R}^n$ we know best, and then the local information is assembled into a whole through compatibility conditions. This is the deep wisdom of “breaking the whole into pieces, and then reassembling the pieces into a whole”.

- The history of manifolds is itself a history of mathematical ideas: from the classical theory of curves and surfaces (Gauss), to Riemann’s abstract notion, to Weyl’s formalisation, and on to Whitney’s [embedding theorem](/nodes/dg%3Asmooth-embedding) — from the concrete to the abstract and back to the concrete; after abstraction, a mathematical notion acquires a stronger power of application instead.

---

## Summary

### Idea

**“Locally Euclidean, globally structured.”** — A manifold finds the perfect balance between the most familiar Euclidean space and the most general [topological space](/nodes/dg%3Atopological-space): locally one can use calculus just as in $\\mathbb{R}^n$, while globally a rich topological and geometric structure is retained.

### Methods

- **The chart-cover method**: covering a manifold by a family of local coordinate systems is the “meta-method” of manifold theory.
- **Testing the compatibility of transition maps**: ensuring that different coordinate systems “speak the same language” on overlaps is the core technique of the definition of a differentiable structure.
- **Localise + assemble**: turning a global problem into a local one and then assembling the local answers into a global answer through compatibility conditions is the general strategy of almost every construction on a manifold (tangent spaces, [differential forms](/nodes/dg%3Adifferential-form), integration and so on).

---

## Looking back and asking

- Why can the same [topological manifold](/nodes/dg%3Atopological-manifold) carry different differentiable structures? How are Milnor’s 28 exotic spheres constructed?
- How should the tangent space and the [tangent bundle](/nodes/dg%3Atangent-bundle) of a manifold be understood intuitively? Why is the [tangent bundle](/nodes/dg%3Atangent-bundle) said to be “the total space of all tangent vectors on the manifold”?
- How is integration on a manifold defined? Why is the technical tool of a [partition of unity](/nodes/dg%3Apartition-of-unity) needed?
- How are the fundamental group and the homology groups of a manifold computed? How do they help in distinguishing non-[homeomorphic](/nodes/dg%3Ahomeomorphism) manifolds?
- Riemannian manifolds, complex manifolds, symplectic manifolds … what geometric properties does each of these additional structures bring to a manifold?`,

  'dg:topological-manifold': `## Topological manifolds

> A topological manifold is one of the most important foundational notions of modern mathematics. It is a [topological space](/nodes/dg%3Atopological-space) that carries a Euclidean structure locally, so that analytic tools can be applied within local regions. The sphere, the torus and other surfaces we are familiar with are globally far more complicated than the plane, yet near each point there is a region that is [homeomorphic](/nodes/dg%3Ahomeomorphism) to the plane — this “locally Euclidean” property is the heart of the notion of a [manifold](/nodes/dg%3Amanifold). It is a cornerstone of differential geometry, algebraic topology, theoretical physics and many other disciplines.

**Source tags.** #topology #manifold #definition #geometry

**Source.** The read-only snapshot \`G:/DifferentialGeometry/object/def/拓扑流形.md\` (see \`data/dg/\`).

---

---

## Prerequisites

### Essential

- **Basics of point-set topology**: topological spaces, open sets, continuous maps, [homeomorphisms](/nodes/dg%3Ahomeomorphism), Hausdorff spaces, the second countability axiom, connectedness, [compactness](/nodes/dg%3Acompactness). These form the linguistic basis for understanding the definition of a [manifold](/nodes/dg%3Amanifold).
- **Basic topology of Euclidean space $\\mathbb{R}^n$**: the standard topology, open balls, open subsets, boundary and related notions.

### Auxiliary

- **[Metric spaces](/nodes/dg%3Ametric-space)**: a [metric space](/nodes/dg%3Ametric-space) is an important source of [topological spaces](/nodes/dg%3Atopological-space), and its natural topology provides the intuitive background for understanding the Hausdorff property.
- **Path connectedness and local path connectedness**: the local path connectedness that a [manifold](/nodes/dg%3Amanifold) possesses automatically makes the notions of connectedness and path connectedness equivalent on a [manifold](/nodes/dg%3Amanifold).

### Further background

- **[Differentiable manifolds](/nodes/manifold%3Ack-atlas)**: adding a differential structure to a topological manifold (that is, requiring the coordinate transformations to be smooth) yields a [differentiable manifold](/nodes/manifold%3Ack-atlas), the main object of study in modern differential geometry.
- **Algebraic topology**: tools such as the fundamental group and homology groups can prove many deep properties of topological manifolds, for example invariance of dimension and the distinction of boundary points.
- **[Manifolds](/nodes/dg%3Amanifold) with boundary**: replacing the local model $\\mathbb{R}^n$ by the upper half-space $\\mathbb{H}_+^n$ gives the notion of a [manifold](/nodes/dg%3Amanifold) with boundary.

---

## Motivation

### Introducing motivation

#### Internal line of thought

In classical differential geometry one studies curves and surfaces in $\\mathbb{R}^3$. Gauss discovered that the curvature of a surface actually depends only on its first fundamental form (intrinsic geometry), which laid the foundation for abstracting surfaces away from the ambient Euclidean space. However, when we want to study more general spaces — for instance the $n$-dimensional sphere $S^n$, real projective space $\\mathbb{RP}^n$, the torus $T^n$ — they are not naturally embedded in some Euclidean space, or even if they can be embedded, the embedding is not unique. Hence one must develop an “intrinsic” language to describe these spaces themselves, and the topological manifold is the first step of that language.

#### External application

- **General relativity**: Einstein described spacetime as a four-dimensional [manifold](/nodes/dg%3Amanifold), with gravity interpreted as the curvature of spacetime. Mass and energy determine the geometry of spacetime, and the geometry in turn determines the motion of matter.
- **Theoretical physics**: modern physical theories such as gauge field theory and string theory are built on the framework of [manifolds](/nodes/dg%3Amanifold) (and fibre bundles over them).
- **Robotics and computer graphics**: the pose space (configuration space) of a robot is often a [manifold](/nodes/dg%3Amanifold); when computer graphics processes surface meshes, it is essentially working with discretised two-dimensional [manifolds](/nodes/dg%3Amanifold).

#### Aesthetic/structural line of thought

Mathematicians pursue the aesthetic of “simple locally, complicated globally”. A [manifold](/nodes/dg%3Amanifold) embodies exactly this idea: locally it is identical to Euclidean space (so calculus can be used), but globally it may have a complicated topological structure (holes, twists and so on). This “tension between the local and the global” is the source of the enduring appeal of [manifold](/nodes/dg%3Amanifold) theory.

### Motivation for the construction

#### From the sphere to an abstract [manifold](/nodes/dg%3Amanifold): a classical example

Let us take the **two-dimensional sphere $S^2$** as an example and see how the notion of a [manifold](/nodes/dg%3Amanifold) arises naturally.

**Step one: local coordinates on the sphere.** Near each of its points the sphere $S^2 = \\{(x,y,z) \\in \\mathbb{R}^3 \\mid x^2+y^2+z^2=1\\}$ looks like a plane. For instance, take the upper hemisphere $U^+ = \\{(x,y,z) \\in S^2 \\mid z > 0\\}$ and define the map $\\varphi^+: U^+ \\to \\mathbb{R}^2$ by $\\varphi^+(x,y,z) = (x,y)$ (the vertical projection). This is a [homeomorphism](/nodes/dg%3Ahomeomorphism) from $U^+$ onto the unit open disc $\\{(x,y) \\in \\mathbb{R}^2 \\mid x^2+y^2<1\\}$. Similarly, the other five hemispheres can be used to cover all of $S^2$.

**Step two: compatibility between charts.** When two charts overlap, the coordinate transformation on the overlap must be continuous. For example, the upper hemisphere $U^+$ and the lower hemisphere $U^-$ overlap near the equator, and the transformation from the $(x,y)$ coordinates to the $(x',y')$ coordinates is continuous. This “compatibility between charts” is precisely the central requirement in the definition of a [manifold](/nodes/dg%3Amanifold).

**Step three: abstraction.** Now forget that $S^2$ is a subset of $\\mathbb{R}^3$. We keep only this: there is a set $M$ covered by some “charts”, each chart $\\varphi: U \\to \\mathbb{R}^n$ maps $U$ [homeomorphically](/nodes/dg%3Ahomeomorphism) onto an open set in $\\mathbb{R}^n$, and the transition maps where charts overlap are continuous. Such an object is an **$n$-dimensional topological manifold**.

---

## Form

### The canonical general form

**Definition ($n$-dimensional topological manifold).** Let $M$ be a Hausdorff [topological space](/nodes/dg%3Atopological-space). If for every point $p \\in M$ there exist an open neighbourhood $U$ of $p$ and a map $\\varphi: U \\to \\mathbb{R}^n$ from $U$ to $n$-dimensional Euclidean space $\\mathbb{R}^n$ such that the image $\\varphi(U)$ is an open subset of $\\mathbb{R}^n$ and $\\varphi$ is a [homeomorphism](/nodes/dg%3Ahomeomorphism) from $U$ onto $\\varphi(U)$, then $M$ is called an $n$-dimensional topological manifold.

**Another equivalent formulation**: a Hausdorff space $M$ is called an $n$-dimensional topological manifold if every point of $M$ has an open neighbourhood [homeomorphic](/nodes/dg%3Ahomeomorphism) to some open subset of $\\mathbb{R}^n$.

**A convention on dimension**: sometimes “[homeomorphic](/nodes/dg%3Ahomeomorphism) to an open subset of $\\mathbb{R}^n$” is relaxed to “[homeomorphic](/nodes/dg%3Ahomeomorphism) to $\\mathbb{R}^n$ or to $\\mathbb{R}_+^n$ (the upper half-space)”, which allows a [manifold](/nodes/dg%3Amanifold) to have a boundary. In this note we discuss by default topological manifolds without boundary.

**Examples**

- **Euclidean space $\\mathbb{R}^n$**: take $U = \\mathbb{R}^n$ and $\\varphi = \\text{id}$; then $\\mathbb{R}^n$ is an $n$-dimensional topological manifold.
- **The $n$-dimensional sphere $S^n$**: $S^n = \\{x \\in \\mathbb{R}^{n+1} \\mid \\|x\\| = 1\\}$, and charts can be constructed by stereographic projection or by hemisphere projection.
- **The $n$-dimensional torus $T^n = S^1 \\times \\cdots \\times S^1$**: the standard example of a product [manifold](/nodes/dg%3Amanifold).
- **Real projective space $\\mathbb{RP}^n$**: the quotient of $\\mathbb{R}^{n+1}\\setminus\\{0\\}$ by scalar multiplication, an $n$-dimensional compact [manifold](/nodes/dg%3Amanifold).

### Analysis of the necessary conditions

Several conditions appear in the definition of a topological manifold, and none of them is superfluous:

#### 1. The Hausdorff condition (the $T_2$ axiom)

**If it is dropped**: one can construct a “non-Hausdorff [manifold](/nodes/dg%3Amanifold)”. For example, take two real lines $X_1 = \\{(x,1)\\}$ and $X_2 = \\{(x,2)\\}$ and glue together all corresponding points except $(0,1)$ and $(0,2)$. Every point of the resulting space has an open neighbourhood [homeomorphic](/nodes/dg%3Ahomeomorphism) to $\\mathbb{R}$, but any neighbourhoods of the two origins $(0,1)$ and $(0,2)$ intersect, so the space is not Hausdorff. Such a space destroys the uniqueness of limits, so that the basic tools of calculus no longer work properly.

#### 2. The locally Euclidean condition

**If it is dropped**: the locally Euclidean condition guarantees that a [manifold](/nodes/dg%3Amanifold) can be “coordinatised” locally, so that one can define local coordinate systems and discuss the representation of continuous functions in local coordinates. Without this condition we are facing a general [topological space](/nodes/dg%3Atopological-space), and the tools of calculus cannot get off the ground.

#### 3. Second countability (usually added)

Many authors require a [manifold](/nodes/dg%3Amanifold) to be second countable (that is, to have a countable topological basis); this guarantees the existence of [partitions of unity](/nodes/dg%3Apartition-of-unity), the embeddability of a [manifold](/nodes/dg%3Amanifold) into a finite-dimensional Euclidean space (the Whitney [embedding theorem](/nodes/dg%3Asmooth-embedding)) and other deep properties. Strictly speaking it is not part of the weakest definition of a topological manifold, but in practice it is almost always needed.

### Equivalent expressions

- **Chart-covering form**: there exists an open cover $\\{U_\\alpha\\}$ of $M$ together with [homeomorphisms](/nodes/dg%3Ahomeomorphism) $\\varphi_\\alpha: U_\\alpha \\to \\varphi_\\alpha(U_\\alpha) \\subset \\mathbb{R}^n$ such that $\\varphi_\\alpha(U_\\alpha)$ is an open set in $\\mathbb{R}^n$.
- **Locally Euclidean form**: $\\forall p \\in M$, $\\exists$ an open neighbourhood $U \\ni p$ such that $U$ is [homeomorphic](/nodes/dg%3Ahomeomorphism) to some open ball in $\\mathbb{R}^n$.
- **Embedding viewpoint (Whitney’s theorem)**: every $n$-dimensional [smooth manifold](/nodes/dg%3Asmooth-manifold) can be embedded in $\\mathbb{R}^{2n}$, but as an abstract space a topological manifold is defined without reference to any embedding.

### How are the relevant claims expressed in natural language?

- “A [manifold](/nodes/dg%3Amanifold) is a space in which coordinate systems can be set up locally.”
- “A [manifold](/nodes/dg%3Amanifold) is something pieced together from patches of ‘Euclidean space’, and where the piecing is good (on the overlaps) the coordinate transformations are continuous.”
- “On a single map, the region near every point looks just like a flat map; the whole world is these maps glued together.”

### Lower-dimensional formulation

Restating the definition of a topological manifold in the language of set theory and topology:

> A [topological space](/nodes/dg%3Atopological-space) $(M, \\tau)$ is an $n$-dimensional topological manifold if and only if it satisfies:
> 1. $(M, \\tau)$ is a $T_2$ space (Hausdorff);
> 2. there exist a cover by open sets $\\{U_\\alpha\\}_{\\alpha \\in \\Gamma}$ and a family of [homeomorphisms](/nodes/dg%3Ahomeomorphism) $\\varphi_\\alpha: U_\\alpha \\to \\mathbb{R}^n$ (open embeddings).

Here “[homeomorphism](/nodes/dg%3Ahomeomorphism)” means that $\\varphi_\\alpha$ is a continuous bijection whose inverse is continuous, which guarantees that the topological structure is “standard” locally.

### Higher-dimensional viewpoint

- **A topological manifold is the “topological skeleton” of a [differentiable manifold](/nodes/manifold%3Ack-atlas)**: adding a differential structure to a topological manifold (that is, requiring the coordinate transformations to be smooth) yields a [differentiable manifold](/nodes/manifold%3Ack-atlas). Topological manifolds are the starting point of richer structures such as [differentiable manifolds](/nodes/manifold%3Ack-atlas), complex [manifolds](/nodes/dg%3Amanifold) and symplectic [manifolds](/nodes/dg%3Amanifold).
- **From the viewpoint of category theory**: a topological manifold can be seen as an embodiment of a Grothendieck topology for the property “locally Euclidean space”. From a more general standpoint, a [manifold](/nodes/dg%3Amanifold) is a special case of the idea of a “locally modelable space”.

---

## Proof

### Proof sketch

One of the central conclusions of topological manifold theory is: **a connected topological manifold is path connected**. The idea of the proof: partition the [manifold](/nodes/dg%3Amanifold) into equivalence classes under the path-connectedness relation, use the locally Euclidean property to show that each equivalence class is both open and closed, and conclude from connectedness that there is only one equivalence class.

#### Detailed proof

**Theorem**: let $M$ be a connected topological manifold. Then $M$ is path connected.

**Proof**: $\\forall p \\in M$, let
$$
C_p = \\{q \\in M \\mid \\text{there exists a continuous path joining } p \\text{ and } q\\}.
$$

Since $p \\in C_p$, we have $C_p \\neq \\emptyset$. For any $q \\in C_p$, because $M$ is a topological manifold there is an open neighbourhood $U$ of $q$ that is [homeomorphic](/nodes/dg%3Ahomeomorphism) to an open ball in $\\mathbb{R}^n$, hence $U$ is path connected. Every point of $U$ can be joined to $q$ by a path in $U$, and then to $p$ by the path from $p$ to $q$, so $U \\subset C_p$. This shows that $C_p$ is open.

On the other hand, if $q \\notin C_p$, take likewise a path-connected open neighbourhood $U$ of $q$; then no point of $U$ can be joined to $p$ (otherwise $q$ could be joined to $p$ as well), so $U \\subset M \\setminus C_p$, that is, $M \\setminus C_p$ is open too.

Therefore $C_p$ is both open and closed. Since $M$ is connected and $C_p \\neq \\emptyset$, we must have $C_p = M$. $\\square$

---

## Applications

### Direct applications

**Example 1: continuous functions on $S^1$.** $S^1$ is a one-dimensional topological manifold. Take two charts: $U_1 = S^1 \\setminus \\{( -1,0)\\}$ with $\\varphi_1$ the angular coordinate $\\theta \\in (-\\pi, \\pi)$, and $U_2 = S^1 \\setminus \\{(1,0)\\}$ with $\\varphi_2$ the angular coordinate $\\theta \\in (0, 2\\pi)$. On the overlap the coordinate transformation $\\theta \\mapsto \\theta$ (up to integer multiples of $2\\pi$) is continuous. Hence we can study a continuous function $f$ on $S^1$ by means of local coordinate systems: on $U_1$ the function $f$ can be written as $f \\circ \\varphi_1^{-1}(\\theta)$, that is, as a periodic function.

**Example 2: classification of surfaces.** Two-dimensional compact connected topological manifolds (closed surfaces) have a complete classification: orientable closed surfaces (the sphere $S^2$, and connected sums of $g$ tori $T^2\\#\\cdots\\#T^2$) and non-orientable closed surfaces (connected sums of $g$ projective planes $\\mathbb{RP}^2$). This classification is one of the most beautiful achievements of topological manifold theory.

### Indirect applications

- **Global analysis**: topological manifolds provide the stage for studying partial differential equations on a global space. For example, the Laplace equation on the sphere can be solved by spherical harmonic analysis.
- **General relativity**: spacetime is a four-dimensional Lorentz [manifold](/nodes/dg%3Amanifold). Near each point spacetime looks like Minkowski space, but globally it may be curved or even singular.
- **Robotics**: the pose space of a rigid body is $SO(3)$ (the three-dimensional rotation group), which is a three-dimensional [manifold](/nodes/dg%3Amanifold). The joint space of a robot is also a [manifold](/nodes/dg%3Amanifold) — for instance, the configuration space of a two-joint arm is $S^1 \\times S^1 = T^2$.
- **Data science**: [manifold](/nodes/dg%3Amanifold) learning assumes that high-dimensional data actually lie on a low-dimensional [manifold](/nodes/dg%3Amanifold), and reduces the dimension by discovering this [manifold](/nodes/dg%3Amanifold) structure.

---

## Generalisations

- **[Manifolds](/nodes/dg%3Amanifold) with boundary**: relaxing the local model from $\\mathbb{R}^n$ to the upper half-space $\\mathbb{H}_+^n = \\{(x_1,\\dots,x_n) \\in \\mathbb{R}^n \\mid x_n \\ge 0\\}$ gives a [manifold](/nodes/dg%3Amanifold) with boundary. Its boundary $\\partial M$ is an $(n-1)$-dimensional [manifold](/nodes/dg%3Amanifold) without boundary.
- **[Differentiable manifolds](/nodes/manifold%3Ack-atlas)**: requiring the coordinate transformations to be smooth ($C^\\infty$), so that tangent vectors, [differential forms](/nodes/dg%3Adifferential-form), [tensor](/nodes/dg%3Atensor) fields and so on can be defined on the [manifold](/nodes/dg%3Amanifold) and calculus can be carried out.
- **Complex [manifolds](/nodes/dg%3Amanifold)**: the local model is taken to be $\\mathbb{C}^n$ and the coordinate transformations are required to be holomorphic (complex analytic); this is the foundation of complex geometry and algebraic geometry.
- **Banach [manifolds](/nodes/dg%3Amanifold) / Hilbert [manifolds](/nodes/dg%3Amanifold)**: generalising the local model to infinite-dimensional Banach spaces, for handling infinite-dimensional problems (such as the calculus of variations and functional analysis).
- **Open problem**: **[smooth structures](/nodes/dg%3Asmooth-structure) on four-dimensional topological manifolds**. There are uncountably many mutually incompatible differentiable structures on $\\mathbb{R}^4$ (exotic $\\mathbb{R}^4$), whereas Euclidean spaces of other dimensions have only the unique standard differentiable structure. This is a phenomenon peculiar to four-dimensional [manifolds](/nodes/dg%3Amanifold), and it is still being studied intensively today.

---

## Common misconceptions

**Misconception 1: “a [manifold](/nodes/dg%3Amanifold) must be a subset of some Euclidean space.”**

The fact: the definition of a [manifold](/nodes/dg%3Amanifold) is intrinsic and does not depend on an embedding. The notion of an abstract [manifold](/nodes/dg%3Amanifold) was developed precisely in order to get rid of the ambient space. The Whitney [embedding theorem](/nodes/dg%3Asmooth-embedding) says that a [smooth manifold](/nodes/dg%3Asmooth-manifold) can be embedded in a Euclidean space, but that is a **theorem**, not a **definition**.

**Misconception 2: “the dimension of a [manifold](/nodes/dg%3Amanifold) is just the number of coordinates of a point of the [manifold](/nodes/dg%3Amanifold).”**

The fact: dimension is a global invariant of a [manifold](/nodes/dg%3Amanifold). On an $n$-dimensional [manifold](/nodes/dg%3Amanifold) the local coordinates of each point have $n$ components, but the number of coordinates must be the same for different charts. The dimension does not depend on the choice of charts — this is guaranteed by the “invariance of domain” theorem.

**Misconception 3: “one can do calculus on a topological manifold.”**

The fact: on a topological manifold one can only talk about continuous functions, because the coordinate transformations are merely continuous and do not guarantee that differentiability is consistent across charts. To talk about derivatives, tangent spaces and so on, one must add a differential structure and upgrade to a [differentiable manifold](/nodes/manifold%3Ack-atlas).

**Misconception 4: “the Hausdorff condition is superfluous because it always holds.”**

The fact: there exist locally Euclidean spaces that are not Hausdorff (such as the “line with two origins” constructed above), so the Hausdorff condition has to be verified independently.

---

## Insights

- **The “local–global” mode of thinking**: the essence of the [manifold](/nodes/dg%3Amanifold) idea is “simple locally, complicated globally”. This way of thinking recurs throughout mathematics (local rings of algebraic varieties, localisation of categories) and has a counterpart in physics (the equivalence principle of general relativity: locally, spacetime is flat).
- **The courage to “forget the embedding”**: the history of the [manifold](/nodes/dg%3Amanifold) concept tells us that sometimes, by letting go of the crutch of an “ambient space”, one can go further. This shift from “being embedded” to “being intrinsic” is a classical paradigm of mathematical abstraction.
- **The meaning of the Hausdorff condition**: why does the definition of a [manifold](/nodes/dg%3Amanifold) emphasise Hausdorff? Because we want to exclude “pathological” locally Euclidean spaces, ensure the uniqueness of limits, and let analytic tools work properly. This reminds us that every condition in a definition has a deep reason.

---

## Summary

### Idea

**“Locally Euclidean, globally topological”** — piece together locally simple charts into a globally complicated space, use the tools of Euclidean space locally, and study topological invariants globally.

### Methods

| Method | Where it is used |
|------|---------|
| Chart coverings | Defining a topological manifold and reducing local problems to problems in Euclidean space |
| Coordinate transformations | Studying the relations between different charts and ensuring compatibility of the structure |
| Local–global arguments | Pushing local properties to global ones by means of connectedness (as in the proof that “connected ⇒ path connected”) |
| [Partitions of unity](/nodes/dg%3Apartition-of-unity) | Gluing locally defined functions/structures into global ones (especially important on a [differentiable manifold](/nodes/manifold%3Ack-atlas)) |
| Quotient constructions | Constructing new [manifolds](/nodes/dg%3Amanifold) (such as projective spaces and connected sums) |

---

## Review questions

- Why does the definition of a topological manifold require second countability? In which key theorems is it indispensable?
- Does there exist a [topological space](/nodes/dg%3Atopological-space) that has a neighbourhood [homeomorphic](/nodes/dg%3Ahomeomorphism) to $\\mathbb{R}^n$ at every point but is not Hausdorff? Try to construct an example.
- Is a connected topological manifold necessarily path connected? Conversely, is a path-connected topological manifold necessarily connected?
- Why are $\\mathbb{R}^n$ and $\\mathbb{R}^m$ not [homeomorphic](/nodes/dg%3Ahomeomorphism) when $n \\neq m$? This “invariance of dimension” looks obvious, but its proof needs tools from algebraic topology.
- On a topological manifold, can we define “differentiable functions”? Why not? What structure has to be added in order to do so?
- Which topological tools does the proof of the classification theorem for two-dimensional surfaces rely on (the fundamental group, triangulation, the Euler characteristic and so on)?`,

  'dg:coordinate-chart': `## Coordinate charts

> A coordinate chart (also called a coordinate card or simply a chart) is one of the most basic tools of differential geometry and topology. It maps points of a [manifold](/nodes/dg%3Amanifold) to points of Euclidean space $\\mathbb{R}^n$, so that we can describe positions on a curved surface or in an abstract space by familiar real coordinates. From Cartesian coordinates in the plane to latitude and longitude on the sphere, and on to local coordinate charts on an abstract [manifold](/nodes/dg%3Amanifold), the core idea of a coordinate chart is: **use an open set in $\\mathbb{R}^n$ to “parametrise” an open set in the [manifold](/nodes/dg%3Amanifold)**, thereby carrying the tools of calculus over to the [manifold](/nodes/dg%3Amanifold).

**Source tags.** #geometry #differential-geometry #topology #definition #coordinate-chart #coordinate-system #manifold

**Source.** The read-only snapshot \`G:/DifferentialGeometry/object/def/坐标图.md\` (see \`data/dg/\`).

---

### Introduction

A coordinate chart (also called a coordinate card or simply a chart) is one of the most basic tools of differential geometry and topology. It maps points of a [manifold](/nodes/dg%3Amanifold) to points of Euclidean space $\\mathbb{R}^n$, so that we can describe positions on a curved surface or in an abstract space by familiar real coordinates. From Cartesian coordinates in the plane to latitude and longitude on the sphere, and on to local coordinate charts on an abstract [manifold](/nodes/dg%3Amanifold), the core idea of a coordinate chart is: **use an open set in $\\mathbb{R}^n$ to “parametrise” an open set in the [manifold](/nodes/dg%3Amanifold)**, thereby carrying the tools of calculus over to the [manifold](/nodes/dg%3Amanifold).

## Prerequisites

### Essential knowledge

- **Euclidean space $\\mathbb{R}^n$**: the $n$-dimensional real [vector space](/nodes/bg%3Alinear%3Avector), equipped with the standard Cartesian coordinates $(x^1,\\dots,x^n)$.
- **[Topological spaces](/nodes/dg%3Atopological-space) and continuous maps**: the notions of an open set and of a [homeomorphism](/nodes/dg%3Ahomeomorphism).
- **Multivariable calculus**: partial derivatives, the Jacobi matrix, the [implicit function theorem](/nodes/dg%3Aimplicit-function-theorem).

### Supporting knowledge

- **Linear algebra**: [vector spaces](/nodes/bg%3Alinear%3Avector), bases and coordinates, linear transformations.
- **Foundations of topology**: Hausdorff spaces, open covers.

### Further knowledge

- **Complex [manifolds](/nodes/dg%3Amanifold)**: identify $\\mathbb{R}^{2n}$ with $\\mathbb{C}^n$; the transition functions are then required to be holomorphic.
- **Coordinate charts on fibre bundles**: natural coordinate charts can be introduced on the [tangent bundle](/nodes/dg%3Atangent-bundle) $TM$, on the cotangent bundle $T^*M$ and on the frame bundle $L(M)$.
- **Coordinates on algebraic varieties**: in algebraic geometry the notion of a coordinate ring is the algebraic analogue of coordinate functions on a [manifold](/nodes/dg%3Amanifold).

## Motivation

### Motivation for introducing them

#### A line of thought internal to the discipline

When studying curves and surfaces, people noticed very early on that **the points of a space cannot necessarily be labelled globally by one and the same set of coordinates**. For example, although points on the two-dimensional sphere $S^2$ can be described by Cartesian coordinates $(x,y,z)$ in $\\mathbb{R}^3$, these three coordinates are redundant (because $x^2+y^2+z^2=1$), and there is no continuous bijection from the whole sphere onto $\\mathbb{R}^2$. In other words, **a single unified coordinate system cannot cover the whole sphere**. One therefore has to settle for the next best thing: cover the whole space by several “local coordinate systems” (that is, coordinate charts), each of which covers only an open subset.

#### A line of thought from external applications

In physics, when describing the motion of a particle in a central force field, polar coordinates are far more convenient than Cartesian ones—Kepler's law $r^2\\dot\\varphi = \\text{constant}$ is expressed extremely concisely in polar coordinates. In general relativity, different regions of the spacetime [manifold](/nodes/dg%3Amanifold) often require different coordinate systems (such as Schwarzschild coordinates and Kruskal coordinates), and coordinate transformations are a key tool for understanding spacetime geometry.

#### An aesthetic and structural line of thought

The notion of a coordinate chart makes it possible to define the object “[manifold](/nodes/dg%3Amanifold)” rigorously: a [manifold](/nodes/dg%3Amanifold) is precisely a **[topological space](/nodes/dg%3Atopological-space) that is locally [homeomorphic](/nodes/dg%3Ahomeomorphism) to $\\mathbb{R}^n$**. The elegance of this definition lies in the fact that it captures the essence of a “curved space” with the fewest possible conditions (local Euclideanity + Hausdorff + second countability), and the coordinate chart is exactly the bridge between the “local” and the “global”.

### Motivation for the construction

The seed of the idea of a coordinate chart can be traced back to the analytic geometry founded by Descartes. Descartes labelled points of the plane by pairs of real numbers $(x,y)$, so that geometric problems could be turned into algebraic equations. Afterwards polar, cylindrical, spherical and other curvilinear coordinate systems were introduced one after another, and people discovered that the same space can be parametrised by different coordinates.

In the nineteenth century, Gauss, in his study of the intrinsic geometry of surfaces, realised that the “curvilinear coordinates” $(u,v)$ of points on a surface are essentially a local map from the surface to $\\mathbb{R}^2$. Riemann then generalised this idea to higher dimensions and proposed the germ of the “[manifold](/nodes/dg%3Amanifold)”. At the beginning of the twentieth century, Veblen, Whitney and others axiomatised the notions of a [manifold](/nodes/dg%3Amanifold) and of a coordinate chart rigorously, laying the foundations of modern differential geometry.

The modern canonical definition of a coordinate chart is the following:

> Let $M$ be a [topological space](/nodes/dg%3Atopological-space), let $U\\subset M$ be an open set and let $\\varphi:U\\to \\varphi(U)\\subset\\mathbb{R}^n$ be a [homeomorphism](/nodes/dg%3Ahomeomorphism). Then $(U,\\varphi)$ is called a **coordinate chart** of $M$, $U$ is called a **coordinate neighbourhood**, and $\\varphi$ is called a **coordinate map**. The component functions $(x^1,\\dots,x^n)$ of $\\varphi$ are called **local coordinates**.

## Form

### The canonical general form

There are several common ways of stating what a coordinate chart is; they are essentially equivalent but suit different contexts:

1. **In the language of point-set topology**: $(U,\\varphi)$, where $U\\subset M$ is open and $\\varphi:U\\to\\mathbb{R}^n$ is a [homeomorphism](/nodes/dg%3Ahomeomorphism) onto its image.
2. **In terms of coordinate functions**: define $n$ continuous functions $x^1,\\dots,x^n$ on $U$ such that the map $p\\mapsto (x^1(p),\\dots,x^n(p))$ is a [homeomorphism](/nodes/dg%3Ahomeomorphism).
3. **In terms of a parametrisation (the inverse map)**: $\\varphi^{-1}:\\varphi(U)\\to U$ is called a local parametrisation; it “glues” a region of $\\mathbb{R}^n$ onto the [manifold](/nodes/dg%3Amanifold).

Each of these three viewpoints has its advantages: the first two emphasise “labelling points with coordinates”, the third emphasises “covering a surface with parameters”.

### Equivalent formulations

- **A coordinate chart = a local coordinate system**: in practice “coordinate chart” and “local coordinate system” are often used interchangeably. A local coordinate system $\\{x^\\mu\\}$ is a coordinate chart.
- **Atlas**: a family of coordinate charts $\\{(U_\\alpha,\\varphi_\\alpha)\\}$ such that $\\{U_\\alpha\\}$ covers $M$. Any two charts in an atlas are required to satisfy the **compatibility condition**: when $U_\\alpha\\cap U_\\beta\\neq\\varnothing$, the transition map
  $$
  \\varphi_\\beta\\circ\\varphi_\\alpha^{-1}:\\varphi_\\alpha(U_\\alpha\\cap U_\\beta)\\to\\varphi_\\beta(U_\\alpha\\cap U_\\beta)
  $$
  is smooth (or continuous, depending on the differentiability class required).

### Classes of forms

Coordinate charts can be classified according to their target space and additional structure:

1. **Topological coordinate charts**: $\\varphi$ is only required to be a [homeomorphism](/nodes/dg%3Ahomeomorphism); differentiability is not required. Used in the definition of a [topological manifold](/nodes/dg%3Atopological-manifold).
2. **Smooth coordinate charts**: the transition maps are $C^\\infty$. Used for [differentiable manifolds](/nodes/manifold%3Ack-atlas).
3. **Real-analytic coordinate charts**: the transition maps are real-analytic functions.
4. **Complex coordinate charts**: the target space is regarded as $\\mathbb{C}^n$ and the transition maps are holomorphic. Used for complex [manifolds](/nodes/dg%3Amanifold).

In addition, according to the special properties of the coordinate net, there are:
- **Cartesian coordinate systems**: the coordinate basis is orthonormal with respect to the Euclidean metric.
- **Curvilinear coordinate systems**: such as polar, spherical and cylindrical coordinates, whose coordinate lines are curves.
- **Orthogonal coordinate systems**: the coordinate curves are orthogonal everywhere.
- **Barycentric coordinate systems**: used for coordinates on a simplex, satisfying $\\sum\\lambda_i=1$.

### A lower-dimensional formulation

The notion of a coordinate chart can be stated in the more basic language of set theory:

> A coordinate chart $(U,\\varphi)$ of $M$ is a **bijection** between an open subset $U$ of $M$ and an open subset of $\\mathbb{R}^n$ (with the additional requirement that it be continuous in both directions, that is, a [homeomorphism](/nodes/dg%3Ahomeomorphism)).

From the point of view of category theory, a coordinate chart is a local “window” from the category of [manifolds](/nodes/dg%3Amanifold) to the category of Euclidean spaces: each coordinate chart gives a local equivalence, and an atlas records how these local equivalences are glued together.

### A higher-dimensional viewpoint

In more advanced theories, the coordinate chart is a special case or a prototype of the following notions:

- **Local trivialisation of a fibre bundle**: the local coordinates $(x^\\mu, \\xi^\\mu)$ on the [tangent bundle](/nodes/dg%3Atangent-bundle) $TM$ can be viewed as the direct product of a coordinate chart on the base [manifold](/nodes/dg%3Amanifold) with coordinates on the tangent space.
- **Coordinate charts on the frame bundle**: on $L(M)$ (the linear frame bundle), a coordinate chart is built jointly from a coordinate chart on the base [manifold](/nodes/dg%3Amanifold) and the components of tangent vectors.
- **Local sections in sheaf theory**: the coordinate map $\\varphi$ can be viewed as a local coordinatisation of the structure sheaf.

## Proof

### Proof sketch

A key conclusion in the theory of coordinate charts is that **the dimension of a [manifold](/nodes/dg%3Amanifold) is well defined**. If $M$ is both an $m$-dimensional [manifold](/nodes/dg%3Amanifold) and an $n$-dimensional [manifold](/nodes/dg%3Amanifold), then $m=n$.

**Idea of the proof**: let $p\\in M$ and take the two coordinate charts at $p$, namely $(U,\\varphi)$ into $\\mathbb{R}^m$ and $(V,\\psi)$ into $\\mathbb{R}^n$. On the intersection $U\\cap V$, consider the transition map $\\psi\\circ\\varphi^{-1}:\\varphi(U\\cap V)\\to\\psi(U\\cap V)$. This is a [homeomorphism](/nodes/dg%3Ahomeomorphism) from an open set of one Euclidean space onto an open set of another Euclidean space, so by the invariance of domain theorem or by a linearisation argument (using the rank of the Jacobi matrix) we must have $m=n$.

## Applications

### Direct applications

**Example 1: a coordinate chart cover of the circle $S^1$**.

Regard $S^1$ as $\\{(x,y)\\in\\mathbb{R}^2:x^2+y^2=1\\}$. A single coordinate chart cannot cover the whole circle, but four charts can:
- $U_1=\\{(x,y)\\in S^1:y>0\\}$, $\\varphi_1(x,y)=x$;
- $U_2=\\{(x,y)\\in S^1:y<0\\}$, $\\varphi_2(x,y)=x$;
- $U_3=\\{(x,y)\\in S^1:x>0\\}$, $\\varphi_3(x,y)=y$;
- $U_4=\\{(x,y)\\in S^1:x<0\\}$, $\\varphi_4(x,y)=y$.

Each chart maps an arc of the circle [homeomorphically](/nodes/dg%3Ahomeomorphism) onto the open interval $(-1,1)$.

**Example 2: a coordinate chart cover of the sphere $S^2$**.

The unit sphere $S^2$ can be covered by six charts, for example by projecting the upper hemisphere $z>0$ onto the $(x,y)$-plane: $\\varphi_1(x,y,z)=(x,y)$ with domain $U_1=\\{(x,y,z)\\in S^2:z>0\\}$. Similarly one takes the six hemispheres $z<0$, $y>0$, $y<0$, $x>0$ and $x<0$.

### Indirect applications

- **In physics**: in general relativity, the spacetime [manifold](/nodes/dg%3Amanifold) is covered by coordinate charts, and coordinate transformations correspond to changes of reference frame between observers. For example, the coordinate singularity of the Schwarzschild metric at the event horizon can be removed by choosing Kruskal coordinates.
- **In computer graphics**: texture mapping (UV mapping) of a three-dimensional surface is essentially the construction of a local coordinate chart on the surface, matching points of the surface to coordinates in a two-dimensional texture image.
- **In robotics**: the configuration space of a robot manipulator is a [manifold](/nodes/dg%3Amanifold), and its local coordinate charts correspond to parametrisations of the joint angles.
- **In data analysis**: [manifold](/nodes/dg%3Amanifold) learning (such as t-SNE and UMAP) seeks low-dimensional coordinate charts for high-dimensional data, which in essence is the construction of coordinate representations on the [manifold](/nodes/dg%3Amanifold) on which the data points live.

## Generalisations

- **Relaxing the conditions**: from a [topological manifold](/nodes/dg%3Atopological-manifold) to a [differentiable manifold](/nodes/manifold%3Ack-atlas), the transition maps are required to be strengthened from continuous to smooth; one may go further and require them to be real-analytic or holomorphic.
- **Generalising the conclusion**: the notion of a coordinate chart can be generalised to [manifolds](/nodes/dg%3Amanifold) **with boundary** (where the target space of the coordinate map is the half-space $\\mathbb{H}^n$), to **Banach [manifolds](/nodes/dg%3Amanifold)** (where the target space is an infinite-dimensional Banach space) and to other, more general settings.
- **A directional generalisation**: if the Jacobi determinant of every transition map is positive, then the [manifold](/nodes/dg%3Amanifold) is **orientable**. This condition is used to define the theory of integration on a [manifold](/nodes/dg%3Amanifold).
- **An open problem**: when $n=4$, there exist uncountably many [smooth structures](/nodes/dg%3Asmooth-structure) on $\\mathbb{R}^4$ that are pairwise non-diffeomorphic, although they are indistinguishable by [homeomorphism](/nodes/dg%3Ahomeomorphism) alone (“exotic $\\mathbb{R}^4$”); this reveals the depth and complexity of the classification of [smooth structures](/nodes/dg%3Asmooth-structure) by coordinate charts.

## Common misconceptions

1. **“Coordinates are an intrinsic property of a point.”** The fact is: coordinates are chosen by us, and the same point has different coordinate values in different coordinate charts. A point of a [manifold](/nodes/dg%3Amanifold) exists independently of coordinates.
2. **“A [manifold](/nodes/dg%3Amanifold) needs only one coordinate system.”** The fact is: most [manifolds](/nodes/dg%3Amanifold) (such as $S^1,S^2,\\mathbb{RP}^2$) cannot be covered by a single coordinate chart. A [manifold](/nodes/dg%3Amanifold) that can be covered by one chart is [homeomorphic](/nodes/dg%3Ahomeomorphism) to an open set in $\\mathbb{R}^n$.
3. **“Coordinate curves are ‘straight’.”** The fact is: in curvilinear coordinate systems the coordinate curves may be curved. For example, in polar coordinates the $\\varphi$ coordinate lines are concentric circles centred at the origin, and the $r$ coordinate lines are rays issuing from the origin.
4. **“The polar basis $\\{\\hat e_r,\\hat e_\\varphi\\}$ is the coordinate basis.”** The fact is: the basis $\\{\\hat e_r,\\hat e_\\varphi\\}$ commonly used in physics is an orthonormal basis, not the coordinate basis $\\{\\partial/\\partial r,\\partial/\\partial\\varphi\\}$. The key difference is that the length of $\\partial/\\partial\\varphi$ is $r$ rather than $1$.
5. **“Every coordinate system covers the whole space.”** The fact is: the Jacobi determinant of polar coordinates $(r,\\varphi)$ vanishes at the origin, so they do not form a regular coordinate system; moreover $(r,\\varphi)$ and $(r,\\varphi+2\\pi)$ denote the same point, so polar coordinates are not a global bijection.

## Insights

- **The tension between the local and the global**: the idea of a coordinate chart tells us that although a complicated space may be globally distorted, have holes and be multiply connected, locally it is no different from flat Euclidean space. This paradigm of “linearise locally, glue globally” runs through the whole of differential geometry.
- **The freedom and the constraints of coordinates**: we are free to choose coordinates, but although the expression of geometric quantities (such as curvature) depends on the coordinates, their intrinsic geometric meaning does not. This tension—“dependent on coordinates, yet geometrically independent”—is the key to understanding [tensor](/nodes/dg%3Atensor) analysis.
- **From the concrete to the abstract**: the notion of a coordinate chart was abstracted from concrete examples such as rectangular coordinates in the plane and latitude and longitude on the sphere, and it in turn became a cornerstone for defining abstract notions such as a [manifold](/nodes/dg%3Amanifold). This path of thought—from instances to axioms and back to applications—recurs again and again in mathematics.

## Summary

### The idea

**“Model a [manifold](/nodes/dg%3Amanifold) locally on $\\mathbb{R}^n$, and glue the local information together by transition maps”**—this is the core idea of the coordinate chart and indeed of the whole theory of [manifolds](/nodes/dg%3Amanifold).

### Methods

| Method | Where it is used in the notes |
|------|----------------|
| Local parametrisation | use the coordinate map $\\varphi$ to send an open set of the [manifold](/nodes/dg%3Amanifold) into $\\mathbb{R}^n$ |
| Transition maps | switch between different charts by means of $\\varphi_\\beta\\circ\\varphi_\\alpha^{-1}$ |
| The Jacobi matrix | describe how the components of a tangent vector transform under a change of coordinates |
| Covering by an atlas | cover the whole [manifold](/nodes/dg%3Amanifold) by a family of compatible coordinate charts |
| Regularity conditions | decide whether a coordinate system is regular by the non-vanishing of the Jacobi determinant |

## Looking back and asking

- Why can no single global coordinate system be set up on the sphere $S^2$? What does this have to do with the topological properties of the sphere (such as [compactness](/nodes/dg%3Acompactness) and non-contractibility)?
- In the compatibility condition for coordinate charts, why are the transition maps required to be differentiable? What would happen if only continuity were required?
- On one and the same [manifold](/nodes/dg%3Amanifold), can two inequivalent atlases give different [smooth structures](/nodes/dg%3Asmooth-structure)? (Hint: exotic spheres.)
- What is the relation between a coordinate chart and a “reference frame” in physics?

---

## References

1. \`数学笔记模版.md（mathematical note template）, 知识库文档 markdown_1。\` (knowledge-base document \`markdown_1\`).
2. \`А. С. 米先柯, А. Т. 福明柯.《微分几何与拓扑学简明教程》. 高等教育出版社。\` (A. S. Mishchenko, A. T. Fomenko, *A Concise Course in Differential Geometry and Topology*, Higher Education Press). Knowledge-base document \`pdf_6\`.
3. \`梁灿彬, 周彬.《微分几何入门与广义相对论》（3册合集）. 科学出版社。\` (Liang Canbin, Zhou Bin, *An Introduction to Differential Geometry and General Relativity*, three-volume set, Science Press). Knowledge-base document \`pdf_5\`.
4. \`陈维桓.《微分几何》. 北京大学出版社, 2017。\` (Chen Weihuan, *Differential Geometry*, Peking University Press, 2017). Knowledge-base document \`pdf_3\`.
5. \`陈维桓.《微分几何引论》. 高等教育出版社, 2013。\` (Chen Weihuan, *An Introduction to Differential Geometry*, Higher Education Press, 2013). Knowledge-base document \`pdf_12\`.
6. John M. Lee. *Introduction to Riemannian Manifolds*, Second Edition. Springer, 2018. Knowledge-base document \`pdf_4\`.
7. B. A. Dubrovin, A. T. Fomenko, S. P. Novikov. *Modern Geometry — Methods and Applications, Part I: The Geometry of Surfaces, Transformation Groups, and Fields*. Springer GTM 93, 1992. Knowledge-base document \`pdf_7\`.
8. \`特里斯坦·尼达姆.《可视化微分几何和形式：一部五幕数学正剧》. 2024。\` (Tristan Needham, *Visual Differential Geometry and Forms: A Mathematical Drama in Five Acts*, 2024). Knowledge-base document \`pdf_8\`.
9. \`梅加强.《流形与几何初步》. 科学出版社。\` (Mei Jiaqiang, *Manifolds and Introductory Geometry*, Science Press). Knowledge-base document \`pdf_15\`.
10. Christian Bär. *Elementary Differential Geometry*. Cambridge University Press, 2010. Knowledge-base document \`pdf_17\`.
11. \`徐森林, 薛春华.《代数拓扑：同调论》.\` (Xu Senlin, Xue Chunhua, *Algebraic Topology: Homology Theory*). Knowledge-base document \`pdf_9\`.
12. \`姜伯驹.《同调论》. 北京大学出版社, 2006。\` (Jiang Boju, *Homology Theory*, Peking University Press, 2006). Knowledge-base document \`pdf_10\`.
13. Clifford Henry Taubes. *Differential Geometry: Bundles, Connections, Metrics and Curvature*. Oxford Graduate Texts in Mathematics, 2011. Knowledge-base document \`pdf_2\`.
14. \`贝尔热, 戈斯丢.《微分几何：流形、曲线和曲面》（第二版修订本）. 法兰西数学精品译丛。\` (Berger, Gostiaux, *Differential Geometry: Manifolds, Curves and Surfaces*, second revised edition, French Mathematics Translation Series). Knowledge-base document \`pdf_14\`.
15. B. A. Dubrovin, S. P. Novikov, A. T. Fomenko. *Modern Geometry — Methods and Applications, Part II: The Geometry and Topology of Manifolds*. Springer GTM 104, 1985. Knowledge-base document \`pdf_11\`.`,

  'dg:smooth-structure': `## Smooth structures

> A smooth structure, also called a $C^\\infty$ structure or a differential structure, is the extra structure that endows a [topological manifold](/nodes/dg%3Atopological-manifold) with “differentiability”. A [topological manifold](/nodes/dg%3Atopological-manifold) lets us perform continuous operations on it, but doing calculus — taking derivatives, defining tangent spaces, setting up differential equations — requires a smooth structure. A smooth structure essentially designates a family of “admissible charts” such that the coordinate transformation functions are infinitely differentiable ($C^\\infty$). One and the same [topological manifold](/nodes/dg%3Atopological-manifold) may carry several essentially different smooth structures (such as Milnor’s exotic spheres, or the exotic structures on $\\mathbb{R}^4$), which makes smooth structures a deep object of study.

**Source tags.** #geometry #differential-geometry #differential-topology #smooth-structure #definition

**Source.** The read-only snapshot \`G:/DifferentialGeometry/object/def/光滑结构.md\` (see \`data/dg/\`).

---

### Introduction

A smooth structure, also called a $C^\\infty$ structure or a differential structure, is the extra structure that endows a [topological manifold](/nodes/dg%3Atopological-manifold) with “differentiability”. A [topological manifold](/nodes/dg%3Atopological-manifold) lets us perform continuous operations on it, but doing calculus — taking derivatives, defining tangent spaces, setting up differential equations — requires a smooth structure. A smooth structure essentially designates a family of “admissible charts” such that the coordinate transformation functions are infinitely differentiable ($C^\\infty$). One and the same [topological manifold](/nodes/dg%3Atopological-manifold) may carry several essentially different smooth structures (such as Milnor’s exotic spheres, or the exotic structures on $\\mathbb{R}^4$), which makes smooth structures a deep object of study.

---

### Prerequisites

#### Essential

- **[Topological manifolds](/nodes/dg%3Atopological-manifold)**: an $n$-dimensional [topological manifold](/nodes/dg%3Atopological-manifold) $(M,\\sigma)$ is a Hausdorff space in which every point has an open neighbourhood [homeomorphic](/nodes/dg%3Ahomeomorphism) to an open subset of $\\mathbb{R}^n$ or of $\\mathbb{R}^n_+$ (the case with boundary).
- **Charts and atlases**: a chart $(U,\\varphi)$ consists of an open subset $U$ of a [topological manifold](/nodes/dg%3Atopological-manifold) $M$ and a [homeomorphism](/nodes/dg%3Ahomeomorphism) $\\varphi:U\\to\\varphi(U)\\subset\\mathbb{R}^n$; a family of charts covering $M$ forms an atlas.
- **Multivariable calculus**: the notion of a $C^\\infty$ function on $\\mathbb{R}^n$ (all partial derivatives exist and are continuous).

#### Auxiliary

- The notion of a [homeomorphism](/nodes/dg%3Ahomeomorphism) in topology: a bijective, continuous map between two [topological spaces](/nodes/dg%3Atopological-space) whose inverse is continuous.
- Linear algebra: the Jacobian matrix, the differential of a change of coordinates.

#### Further background

- Deep results in differential topology on the existence and uniqueness of smooth structures (the work of Kervaire, Milnor, Donaldson, Freedman and others).
- **$C^r$ differential structures**: if the coordinate transformation functions are only required to be $r$ times continuously differentiable, one obtains the notion of a $C^r$ [differentiable manifold](/nodes/manifold%3Ack-atlas).
- **Complex [manifolds](/nodes/dg%3Amanifold)**: if the coordinate transformation functions are complex analytic, one obtains the notion of a complex [manifold](/nodes/dg%3Amanifold).

---

### Motivation

#### Introducing motivation

**Internal line of thought**: on $\\mathbb{R}^n$, calculus is a ready-made tool. But if one relies only on the structure of a [topological manifold](/nodes/dg%3Atopological-manifold), a function defined on a [manifold](/nodes/dg%3Amanifold) may have inconsistent differentiability when expressed in different charts — because the coordinate transformation functions need not be differentiable. To make “is a function on a [manifold](/nodes/dg%3Amanifold) differentiable?” a well-defined notion, one must restrict the charts that are allowed on the [manifold](/nodes/dg%3Amanifold), so that the expressions in different charts have consistent differentiability. Smooth structures were introduced precisely to solve this fundamental problem.

**External application**: problems in physics such as general relativity and gauge field theory require differential operations on a curved space (that is, a [manifold](/nodes/dg%3Amanifold)). For example, the Einstein field equations require spacetime to have a smooth structure before a curvature [tensor](/nodes/dg%3Atensor) can be defined.

**Aesthetic/structural line of thought**: mathematicians want to “transplant” calculus from $\\mathbb{R}^n$ onto an arbitrary [topological manifold](/nodes/dg%3Atopological-manifold). This requires the [manifold](/nodes/dg%3Amanifold) to “look like $\\mathbb{R}^n$ not only locally, but also, in the differentiable sense, like $\\mathbb{R}^n$”.

#### Motivation for the construction

Take the classical example — the **unit sphere $S^2$** — to see how a smooth structure arises naturally.

$S^2 = \\{(x,y,z)\\in\\mathbb{R}^3 : x^2+y^2+z^2=1\\}$ is a two-dimensional [topological manifold](/nodes/dg%3Atopological-manifold). We need to specify a smooth structure on it.

**Idea one (stereographic projection)**: take $U = S^2\\setminus\\{(0,0,1)\\}$ (removing the north pole) and define $\\varphi:U\\to\\mathbb{R}^2$ as stereographic projection from the north pole; take $V = S^2\\setminus\\{(0,0,-1)\\}$ (removing the south pole) and define $\\psi:V\\to\\mathbb{R}^2$ as stereographic projection from the south pole. One verifies that the coordinate transformation
$$ \\psi\\circ\\varphi^{-1}(u^1,u^2) = \\left(\\frac{u^1}{(u^1)^2+(u^2)^2}, \\frac{u^2}{(u^1)^2+(u^2)^2}\\right), \\quad (u^1)^2+(u^2)^2\\neq 0 $$
is $C^\\infty$. Hence $\\{(U,\\varphi),(V,\\psi)\\}$ is a [smooth atlas](/nodes/dg%3Asmooth-atlas) on $S^2$ and defines a smooth structure on $S^2$.

**Idea two (six charts)**: split $S^2$ into the six open sets $z>0$, $z<0$, $x>0$, $x<0$, $y>0$, $y<0$ and project each of them orthogonally onto the corresponding coordinate plane. For example
$$ \\varphi_1(x,y,z) = (x,y),\\quad z>0; \\qquad \\varphi_4(x,y,z) = (x,z),\\quad y<0. $$
The transformations between these charts are again $C^\\infty$, which defines another smooth structure. In fact one can prove that the smooth structures defined by these two approaches are equivalent — they give one and the same smooth structure.

---

### Form

#### The canonical general form

**Definition ($C^\\infty$-related)**: let $(M,\\sigma)$ be an $n$-dimensional [topological manifold](/nodes/dg%3Atopological-manifold) and let $(U,\\varphi)$ and $(V,\\psi)$ be two of its charts. If $U\\cap V=\\varnothing$, or if $U\\cap V\\neq\\varnothing$ and the coordinate transformations
$$ \\varphi\\circ\\psi^{-1}:\\psi(U\\cap V)\\subset\\mathbb{R}^n\\to\\varphi(U\\cap V)\\subset\\mathbb{R}^n $$
and
$$ \\psi\\circ\\varphi^{-1}:\\varphi(U\\cap V)\\subset\\mathbb{R}^n\\to\\psi(U\\cap V)\\subset\\mathbb{R}^n $$
are both $C^\\infty$ (that is, infinitely differentiable), then $(U,\\varphi)$ and $(V,\\psi)$ are said to be **$C^\\infty$-related**.

**Definition ($C^\\infty$ coordinate cover / [smooth atlas](/nodes/dg%3Asmooth-atlas))**: let $\\Sigma = \\{(U_\\alpha,\\varphi_\\alpha)\\}_{\\alpha\\in\\Lambda}$ be a family of charts on $M$. If
1. $\\{U_\\alpha\\}_{\\alpha\\in\\Lambda}$ forms an open cover of $M$;
2. any two of its charts are $C^\\infty$-related;
then $\\Sigma$ is called a **$C^\\infty$ coordinate cover** of $M$ (also called a [smooth atlas](/nodes/dg%3Asmooth-atlas)).

**Definition (smooth structure / differential structure)**: a **smooth structure** (or $C^\\infty$ structure) on a [topological manifold](/nodes/dg%3Atopological-manifold) $M$ is a **maximal $C^\\infty$ coordinate cover** $\\Sigma$ of $M$, that is, $\\Sigma$ contains every chart that is $C^\\infty$-related to every chart in $\\Sigma$.

**Definition ([smooth manifold](/nodes/dg%3Asmooth-manifold))**: if a smooth structure $\\Sigma$ is specified on an $n$-dimensional [topological manifold](/nodes/dg%3Atopological-manifold) $(M,\\sigma)$, then $(M,\\Sigma)$ is called an **$n$-dimensional [smooth manifold](/nodes/dg%3Asmooth-manifold)** (or $C^\\infty$ [manifold](/nodes/dg%3Amanifold)). The charts belonging to $\\Sigma$ are called **admissible charts**.

> **Remark**: in practice, to define a smooth structure it suffices to fix a [smooth atlas](/nodes/dg%3Asmooth-atlas) (not necessarily a maximal one) and then take the union of all charts that are $C^\\infty$-related to every chart of that atlas; this yields a maximal smooth structure.

#### Equivalent expressions

**Defined by a [smooth atlas](/nodes/dg%3Asmooth-atlas)**: by the remark above, defining a smooth structure on a [manifold](/nodes/dg%3Amanifold) is equivalent to specifying a [smooth atlas](/nodes/dg%3Asmooth-atlas). For example, the standard smooth structure on $\\mathbb{R}^n$ is generated by the single chart $(\\mathbb{R}^n,\\mathrm{id})$.

**Defined by a family of smooth functions**: a smooth structure $\\Sigma$ uniquely determines the set $C^\\infty(M)$ of all smooth functions on the [manifold](/nodes/dg%3Amanifold) $M$. Conversely, in certain settings $C^\\infty(M)$ determines the smooth structure back.

#### Kinds of form

Smooth structures can be classified by the smoothness of their coordinate transformation functions:
- **$C^r$ structures**: the coordinate transformation functions are of class $C^r$ ($r$ times continuously differentiable).
- **$C^\\infty$ structures** (smooth structures): the coordinate transformation functions are of class $C^\\infty$.
- **$C^\\omega$ structures** (real analytic structures): the coordinate transformation functions are real analytic.

One and the same [topological manifold](/nodes/dg%3Atopological-manifold) may carry **inequivalent** smooth structures (see the “Generalisations” section below).

#### How are the relevant claims expressed in natural language?

- “There is a smooth structure on the [manifold](/nodes/dg%3Amanifold) $M$” is equivalent to “$M$ is a [smooth manifold](/nodes/dg%3Asmooth-manifold)”.
- “Two smooth structures $\\Sigma$ and $\\tilde\\Sigma$ are equivalent” is equivalent to “the [smooth manifolds](/nodes/dg%3Asmooth-manifold) $(M,\\Sigma)$ and $(M,\\tilde\\Sigma)$ are diffeomorphic”, that is, [homeomorphic](/nodes/dg%3Ahomeomorphism) in the differentiable sense.

#### Lower-dimensional formulation

A smooth structure is essentially the imposition of an “infinitely differentiable” constraint on the coordinate transformations of a [topological manifold](/nodes/dg%3Atopological-manifold). In the language of category theory:
- a [topological manifold](/nodes/dg%3Atopological-manifold) is a locally Euclidean object of $\\mathbf{Top}$;
- a smooth structure is the extra structure that lifts it into $\\mathbf{Diff}$ (the category of [smooth manifolds](/nodes/dg%3Asmooth-manifold) and smooth maps).

#### Higher-dimensional viewpoint

A smooth structure is the basis for “doing analysis on a [topological manifold](/nodes/dg%3Atopological-manifold)”. At higher levels of theory:
- **Riemannian geometry** adds a Riemannian metric to a [smooth manifold](/nodes/dg%3Asmooth-manifold); the smooth structure is a prerequisite.
- **Fibre bundle theory**: vector bundles, principal bundles and so on are constructed over [smooth manifolds](/nodes/dg%3Asmooth-manifold), and they themselves need a smooth structure in order to define smooth sections and connections.
- **Algebraic topology**: a smooth structure is the prerequisite for defining tools such as [de Rham cohomology](/nodes/dg%3Apoincare-lemma) and Morse theory.

#### Understanding through similar objects

- **Complex structures**: on an even-dimensional [smooth manifold](/nodes/dg%3Asmooth-manifold) one can further require the coordinate transformations to be complex analytic, obtaining a complex [manifold](/nodes/dg%3Amanifold). A smooth structure is the basis of a complex structure.
- **P L structures** (piecewise linear structures): the coordinate transformations are required to be piecewise linear [homeomorphisms](/nodes/dg%3Ahomeomorphism); a notion intermediate between a topological structure and a smooth structure.
- **Symplectic structures**: specifying a closed non-degenerate 2-form on a [smooth manifold](/nodes/dg%3Asmooth-manifold) presupposes a smooth structure.

---

### Proof

#### Proof sketch

The existence of a smooth structure is not a universal conclusion — there are [topological manifolds](/nodes/dg%3Atopological-manifold) with no smooth structure at all (such as the 10-dimensional [topological manifold](/nodes/dg%3Atopological-manifold) found by Kervaire in 1961), and there are [topological manifolds](/nodes/dg%3Atopological-manifold) carrying several different smooth structures (such as Milnor’s 7-dimensional exotic spheres). But the basic method of constructing a smooth structure can be summed up as:

> **Construct a family of $C^\\infty$-related charts on the [topological manifold](/nodes/dg%3Atopological-manifold) covering the whole [manifold](/nodes/dg%3Amanifold), then take the maximal one.**

The standard smooth structure on $\\mathbb{R}^n$ serves as an example:

**Construction**: take $U = \\mathbb{R}^n$ and let $\\varphi = \\mathrm{id}: \\mathbb{R}^n\\to\\mathbb{R}^n$. Then $\\Sigma_0 = \\{(U,\\varphi)\\}$ consists of a single chart and is automatically a $C^\\infty$ coordinate cover. The maximal $C^\\infty$ structure it generates is the **standard smooth structure** on $\\mathbb{R}^n$.

For an arbitrary finite-dimensional [vector space](/nodes/bg%3Alinear%3Avector) $V$, take a basis $\\{b_1,\\dots,b_n\\}$ and define the linear isomorphism $B:\\mathbb{R}^n\\to V$, $B(x^1,\\dots,x^n)=x^ib_i$; its inverse is a global chart, and all such charts are smoothly compatible with one another, so $V$ carries a natural **standard smooth structure**.

---

### Applications

#### Direct applications

**Example 1 (the smooth structure of the unit sphere $S^2$)**: on $S^2$, use the six charts
$$ U_1 = \\{z>0\\},\\; U_2 = \\{z<0\\},\\; U_3 = \\{x>0\\},\\; U_4 = \\{x<0\\},\\; U_5 = \\{y>0\\},\\; U_6 = \\{y<0\\} $$
and project each of them orthogonally onto the corresponding coordinate plane to obtain $\\varphi_i$. Verifying that the transformation between any two charts is $C^\\infty$ shows that $\\Sigma_0 = \\{(U_\\alpha,\\varphi_\\alpha):1\\le\\alpha\\le6\\}$ is a $C^\\infty$ coordinate cover of $S^2$, defining the standard smooth structure on $S^2$.

**Example 2 (the smooth structure of real projective space $\\mathbb{RP}^2$)**: let $U_1 = \\{[x^1,x^2,x^3]\\in\\mathbb{RP}^2 : x^1\\neq 0\\}$ and $\\varphi_1([x^1,x^2,x^3]) = (x^2/x^1, x^3/x^1)$; define $U_2$ ($x^2\\neq 0$) and $U_3$ ($x^3\\neq 0$) similarly. Verifying that the coordinate transformation functions are $C^\\infty$ yields the standard smooth structure on $\\mathbb{RP}^2$. This generalises to $\\mathbb{RP}^n$.

#### Indirect applications

- **In differential geometry**: a smooth structure is the basis for defining Riemannian metrics, connections, curvature and every other geometric notion.
- **In physics**: the spacetime model of general relativity is a 4-dimensional [smooth manifold](/nodes/dg%3Asmooth-manifold); in gauge field theory the gauge potential is a connection on a principal bundle, and the principal bundle itself is a [smooth manifold](/nodes/dg%3Asmooth-manifold).
- **In topology**: smooth structures define deep invariants such as differentiable homotopy and cobordism theory.

---

### Generalisations

#### Existence and uniqueness of smooth structures

Not every [topological manifold](/nodes/dg%3Atopological-manifold) admits a smooth structure. For example, in 1961 Kervaire found a 10-dimensional [topological manifold](/nodes/dg%3Atopological-manifold) with no differential structure at all.

#### Examples of different smooth structures

- **Milnor’s exotic spheres (1956)**: Milnor constructed on the 7-dimensional sphere $S^7$ a structure different from the standard differential structure — an “exotic sphere”. Further work showed that $S^7$ carries 28 different differential structures in all, forming a finite cyclic group.
- **Exotic structures on $\\mathbb{R}^4$**: for $n\\neq 4$, $\\mathbb{R}^n$ carries only one smooth structure (the standard one). But in the 1980s the work of Donaldson and Freedman showed that there exist [differentiable manifolds](/nodes/manifold%3Ack-atlas) that are [homeomorphic](/nodes/dg%3Ahomeomorphism) but **not [diffeomorphic](/nodes/dg%3Ahomeomorphism)** to standard $\\mathbb{R}^4$ — that is, $\\mathbb{R}^4$ carries uncountably many different smooth structures.
- **The low-dimensional case**: Moise and others proved that a [topological manifold](/nodes/dg%3Atopological-manifold) of dimension at most 3 carries a unique smooth structure.

#### Related open problems

- In dimension 4, $\\mathbb{R}^4$ carries uncountably many exotic structures; what then are the existence conditions and the classification of smooth structures on a general 4-dimensional [topological manifold](/nodes/dg%3Atopological-manifold)?
- The number of different smooth structures on the sphere $S^n$ (the group structure of the “exotic spheres”) is known to be closely related to stable homotopy groups; this is an active field of research.

---

### Common misconceptions

**Misconception 1: “a [smooth manifold](/nodes/dg%3Asmooth-manifold) is just a [manifold](/nodes/dg%3Amanifold) on which one can differentiate”**  
*Correction*: a [smooth manifold](/nodes/dg%3Asmooth-manifold) itself carries no “differentiation” operation. A smooth structure only guarantees that the coordinate transformations are smooth enough that the notions of a smooth function and a smooth map **can be defined**. Tangent vectors, derivatives and so on are **constructed additionally** on top of the smooth structure.

**Misconception 2: “a smooth structure can always be defined on a [topological manifold](/nodes/dg%3Atopological-manifold)”**  
*Correction*: there exist [topological manifolds](/nodes/dg%3Atopological-manifold) with no smooth structure at all (such as Kervaire’s 10-dimensional [manifold](/nodes/dg%3Amanifold)). The existence of a smooth structure is a non-trivial question.

**Misconception 3: “a [topological manifold](/nodes/dg%3Atopological-manifold) carries at most one smooth structure”**  
*Correction*: as early as 1956 Milnor discovered the exotic sphere structures on $S^7$, and $\\mathbb{R}^4$ even carries uncountably many different smooth structures. These discoveries marked the birth of differential topology.

**Misconception 4: “the differentiability condition on coordinate transformations is an unnecessary technical detail”**  
*Correction*: if the coordinate transformations are not smooth, then the expressions of one function in different charts may be differentiable in one and not in the other, so that the basic notion “is a function on a [manifold](/nodes/dg%3Amanifold) differentiable?” cannot be well defined. Smooth structures exist precisely to solve this fundamental problem.

---

### Insights

- **Structure before operations**: on a [topological manifold](/nodes/dg%3Atopological-manifold) one must first define a smooth structure before one can speak of differential operations. This mode of thinking — “first endow with structure, then define operations” — runs through all of mathematics (topological, metric, algebraic structures and so on).
- **The tension between the local and the global**: a smooth structure is defined “locally” (by charts), yet its global properties (whether it exists, whether it is unique) are often determined by the global topology of the [manifold](/nodes/dg%3Amanifold) — a central theme throughout differential geometry.
- **The special role of dimension**: dimension 4 is the most special and deepest dimension in the theory of smooth structures. $\\mathbb{R}^4$ carries exotic smooth structures, whereas $\\mathbb{R}^n$ of other dimensions carries a unique smooth structure. This dependence on dimension displays the richness and complexity of higher-dimensional geometry.

---

### Summary

#### Idea

> **By “restricting the admissible charts”, a smooth structure transplants calculus from $\\mathbb{R}^n$ onto a [topological manifold](/nodes/dg%3Atopological-manifold), making “smoothness” a well-defined notion on a [manifold](/nodes/dg%3Amanifold).**

#### Methods

| Method | Where it is used in the note |
|------|-------------|
| Testing $C^\\infty$-relatedness | Verifying the infinite differentiability of coordinate transformation functions, used to define a [smooth atlas](/nodes/dg%3Asmooth-atlas) |
| Constructing a maximal atlas | Starting from a given [smooth atlas](/nodes/dg%3Asmooth-atlas), taking all compatible charts to obtain a smooth structure |
| Constructing counterexamples | In the analysis of necessary conditions, showing how the notion collapses when the smoothness requirement is dropped |
| Constructing exotic spheres / exotic structures | The work of Milnor, Donaldson and Freedman exhibits the non-uniqueness of smooth structures |

---

### Review questions

- Why does $\\mathbb{R}^4$ carry exotic smooth structures while $\\mathbb{R}^n$ of other dimensions carries only the standard structure? What is the topological reason behind this?
- How can the existence of a smooth structure be characterised by topological invariants such as characteristic classes?
- How is the group structure of the 28 different smooth structures on the exotic sphere $S^7$ related to the stable homotopy groups of homotopy theory?

---

### References

1. \`陈维桓（Chen Weihuan）. 微分几何引论（Introduction to Differential Geometry）. 北京大学出版社（Peking University Press）, 2013.\`
2. Clifford Henry Taubes. *Differential Geometry: Bundles, Connections, Metrics and Curvature*. Oxford Graduate Texts in Mathematics, 2011.
3. John M. Lee. *Introduction to Riemannian Manifolds*, 2nd Edition. Springer, 2013.
4. \`А. С. 米先柯（A. S. Mishchenko）, А. Т. 福明柯（A. T. Fomenko）. 微分几何与拓扑学简明教程（A Concise Course in Differential Geometry and Topology）. 高等教育出版社（Higher Education Press）.\`
5. \`梅加强（Mei Jiaqiang）. 流形与几何初步（[Manifolds](/nodes/dg%3Amanifold) and Introductory Geometry）. 科学出版社（Science Press）.\`
6. John W. Milnor. *Topology from the Differentiable Viewpoint*. University Press of Virginia, 1997.
7. William Fulton. *Algebraic Topology: A First Course*. GTM 153, Springer, 1995.
8. Tammo tom Dieck. *Algebraic Topology*. EMS, 2008.
9. \`梁灿彬（Liang Canbin）, 周彬（Zhou Bin）. 微分几何入门与广义相对论（An Introduction to Differential Geometry and General Relativity）. 科学出版社（Science Press）.\``,

  'dg:smooth-atlas': `## Smooth atlases

> A smooth atlas is one of the core notions of the theory of [differentiable manifolds](/nodes/manifold%3Ack-atlas). When we try to do calculus on a [topological space](/nodes/dg%3Atopological-space), knowing merely that it “looks locally like Euclidean space” is not enough — we also have to ensure that the coordinate transformations between different local coordinate systems are smooth enough that the smoothness of a function does not depend on the choice of coordinate system. A smooth atlas is exactly the structure that encodes this compatibility information. Two charts are called smoothly compatible if the coordinate transformation on their overlap is smooth; a cover by pairwise smoothly compatible charts is a smooth atlas. A maximal smooth atlas is called a [smooth structure](/nodes/dg%3Asmooth-structure) (or differential structure), and a [topological manifold](/nodes/dg%3Atopological-manifold) carrying a [smooth structure](/nodes/dg%3Asmooth-structure) is a [smooth manifold](/nodes/dg%3Asmooth-manifold).

**Source.** The read-only snapshot \`G:/DifferentialGeometry/object/def/光滑图册.md\` (see \`data/dg/\`).

---

### Introduction

A smooth atlas is one of the core notions of the theory of [differentiable manifolds](/nodes/manifold%3Ack-atlas). When we try to do calculus on a [topological space](/nodes/dg%3Atopological-space), knowing merely that it “looks locally like Euclidean space” is not enough — we also have to ensure that the coordinate transformations between different local coordinate systems are smooth enough that the smoothness of a function does not depend on the choice of coordinate system. A smooth atlas is exactly the structure that encodes this compatibility information. Two charts are called smoothly compatible if the coordinate transformation on their overlap is smooth; a cover by pairwise smoothly compatible charts is a smooth atlas. A maximal smooth atlas is called a [smooth structure](/nodes/dg%3Asmooth-structure) (or differential structure), and a [topological manifold](/nodes/dg%3Atopological-manifold) carrying a [smooth structure](/nodes/dg%3Asmooth-structure) is a [smooth manifold](/nodes/dg%3Asmooth-manifold).

> Tags: #differential-geometry #topology #definition #manifold #smooth-structure #atlas #coordinate-chart

---

### Prerequisites

#### Essential

- **[Topological spaces](/nodes/dg%3Atopological-space) and continuous maps**: understanding such basic notions as open sets, [homeomorphisms](/nodes/dg%3Ahomeomorphism), the Hausdorff property and second countability.
- **Euclidean space and multivariable calculus**: open sets in $\\\\mathbb{R}^n$, smooth functions (of class $C^\\\\infty$, that is, partial derivatives of every order exist and are continuous), the Jacobian matrix and determinant, the [inverse function theorem](/nodes/dg%3Ainverse-function-theorem).
- **[Topological manifolds](/nodes/dg%3Atopological-manifold)**: a Hausdorff, second countable [topological space](/nodes/dg%3Atopological-space) in which every point has an open neighbourhood [homeomorphic](/nodes/dg%3Ahomeomorphism) to some open subset of $\\\\mathbb{R}^n$.

#### Supporting

- **Linear algebra**: linear maps, the rank of a matrix, [vector spaces](/nodes/bg%3Alinear%3Avector) and change of basis.
- **Complex analysis**: helpful for understanding complex analytic [manifolds](/nodes/dg%3Amanifold) (such as $S^2$ as the Riemann sphere), but not required.

#### Further

- **$C^r$ and $C^\\\\omega$ [manifolds](/nodes/dg%3Amanifold)**: if the coordinate transformations are required only to be $C^r$ ($r$ times continuously differentiable) rather than $C^\\\\infty$, one obtains a $C^r$ [differentiable manifold](/nodes/manifold%3Ack-atlas); if they are required to be real analytic ($C^\\\\omega$), one obtains a real analytic [manifold](/nodes/dg%3Amanifold). Most of differential geometry uses only $C^\\\\infty$, because the [inverse function theorem](/nodes/dg%3Ainverse-function-theorem) relies only on continuous differentiability, while $C^\\\\infty$ offers the greatest convenience in practice.
- **Complex [manifolds](/nodes/dg%3Amanifold)**: replacing $\\\\mathbb{R}^{2n}$ by $\\\\mathbb{C}^n$ and requiring the coordinate transformations to be complex analytic gives a complex [manifold](/nodes/dg%3Amanifold). Via stereographic projection $S^2$ becomes a complex [manifold](/nodes/dg%3Amanifold) (the Riemann sphere).
- **[Manifolds](/nodes/dg%3Amanifold) with boundary**: replacing the model space $\\\\mathbb{R}^n$ by the half-space $\\\\mathbb{H}^n = \\\\{(x^1,\\\\dots,x^n)\\\\in\\\\mathbb{R}^n \\\\mid x^n \\\\ge 0\\\\}$ allows one to define [manifolds](/nodes/dg%3Amanifold) with boundary and their smooth atlases.

---

### Motivation

#### Motivation for introducing it

In classical differential geometry the objects we study (curves, surfaces) are subsets embedded in $\\\\mathbb{R}^3$ and come with a global coordinate system for free. As mathematics developed, however, more general spaces had to be handled:

- **A thread internal to the discipline**: $S^1$ (the circle) is globally different from $\\\\mathbb{R}$ and cannot be covered by a single coordinate system; several local coordinate systems have to be glued together. To speak of differentiable functions on such a “glued-together space”, the coordinate transformations between different local coordinate systems must satisfy a compatibility condition.
- **A thread from outside**: configuration spaces in physics (such as the space of attitudes of a rigid body, $SO(3)$, or phase spaces) are often curved, non-trivial [manifolds](/nodes/dg%3Amanifold). In general relativity spacetime itself is a 4-dimensional [smooth manifold](/nodes/dg%3Asmooth-manifold).
- **An aesthetic/structural thread**: mathematicians wanted to generalise calculus from Euclidean space to as general a space as possible, and “locally like $\\\\mathbb{R}^n$ + smooth coordinate transformations” is the most natural condition that makes this generalisation work.

#### Motivation for the construction

The modern form of the smooth atlas evolved step by step:

1. **The seed — charts on a surface**: in handling surfaces, nineteenth-century mathematicians already used parametrisations (that is, local coordinates) to map a piece of the surface onto an open subset of $\\\\mathbb{R}^2$, and noticed the differentiability of the transformations between different parametrisations.
2. **Abstraction — [topological manifolds](/nodes/dg%3Atopological-manifold)**: at the beginning of the twentieth century Hausdorff and others axiomatised the notion of a “space”, producing the notion of a [topological manifold](/nodes/dg%3Atopological-manifold): a [topological space](/nodes/dg%3Atopological-space) that is locally [homeomorphic](/nodes/dg%3Ahomeomorphism) to $\\\\mathbb{R}^n$.
3. **Adding a [smooth structure](/nodes/dg%3Asmooth-structure)**: a [topological manifold](/nodes/dg%3Atopological-manifold) alone is not enough, because the transformations between different local coordinate systems may only be continuous, which is insufficient to define differentiability. For this reason we specify a compatible atlas (a smooth atlas) and then extend it to a maximal atlas (a differential structure); this completely determines the set of smooth functions on the manifold.

---

### Form

#### Canonical general form

##### 1. Chart (chart / coordinate chart)

Let $M$ be an $n$-dimensional [topological manifold](/nodes/dg%3Atopological-manifold). A **chart** (or **coordinate chart**) on $M$ is a pair $(U,\\\\varphi)$, where $U\\\\subset M$ is an open set and $\\\\varphi:U\\\\to \\\\varphi(U)\\\\subset\\\\mathbb{R}^n$ is a [homeomorphism](/nodes/dg%3Ahomeomorphism). $U$ is called a **coordinate neighbourhood** and $\\\\varphi$ a **coordinate map**. For $p\\\\in U$, the tuple $\\\\varphi(p)=(x^1(p),\\\\dots,x^n(p))$ is called the **local coordinates** of $p$.

> Note: a point $p\\\\in M$ may belong to several charts at once and thus have several sets of local coordinates. The coordinates given by different charts are related by coordinate transformations.

##### 2. Smooth compatibility

Let $(U,\\\\varphi)$ and $(V,\\\\psi)$ be two charts on $M$ with $U\\\\cap V\\\\neq\\\\varnothing$. If the transition map

$$\\\\psi\\\\circ\\\\varphi^{-1}:\\\\varphi(U\\\\cap V)\\\\to\\\\psi(U\\\\cap V)$$

and its inverse $\\\\varphi\\\\circ\\\\psi^{-1}$ are both $C^\\\\infty$ (smooth), then $(U,\\\\varphi)$ and $(V,\\\\psi)$ are called **smoothly compatible**. Since the two are mutually inverse, this is equivalent to saying that $\\\\psi\\\\circ\\\\varphi^{-1}$ is a diffeomorphism — that is, a [homeomorphism](/nodes/dg%3Ahomeomorphism) preserving the smooth structure.

##### 3. Atlases and smooth atlases

An **atlas** on $M$ is a collection of charts $\\\\mathcal{A}=\\\\{(U_\\\\alpha,\\\\varphi_\\\\alpha)\\\\}$ with $\\\\bigcup_\\\\alpha U_\\\\alpha = M$.

If any two charts in the atlas $\\\\mathcal{A}$ are smoothly compatible, $\\\\mathcal{A}$ is called a **smooth atlas**.

##### 4. [Smooth structure](/nodes/dg%3Asmooth-structure) and maximal atlases

A **[smooth structure](/nodes/dg%3Asmooth-structure)** (or **differential structure**) is a **maximal smooth atlas** $\\\\mathcal{D}$, that is, one that is not properly contained in any larger smooth atlas. Concretely:

- $\\\\mathcal{D}$ is a smooth atlas;
- if $(U,\\\\varphi)$ is smoothly compatible with every chart of $\\\\mathcal{D}$, then $(U,\\\\varphi)\\\\in\\\\mathcal{D}$.

> Proposition: every smooth atlas $\\\\mathcal{A}$ determines a unique maximal smooth atlas $\\\\mathcal{D}(\\\\mathcal{A})$ containing it. Two smooth atlases $\\\\mathcal{A}$ and $\\\\mathcal{B}$ define the same [smooth structure](/nodes/dg%3Asmooth-structure) if and only if $\\\\mathcal{A}\\\\cup\\\\mathcal{B}$ is again a smooth atlas.

##### 5. [Smooth manifolds](/nodes/dg%3Asmooth-manifold)

A **[smooth manifold](/nodes/dg%3Asmooth-manifold)** is a [topological manifold](/nodes/dg%3Atopological-manifold) $M$ together with a [smooth structure](/nodes/dg%3Asmooth-structure) on it. Usually one specifies only a smaller smooth atlas and then lets it generate the unique maximal atlas.

#### Analysis of the necessary conditions

Every condition in the definition of a “smooth atlas” is essential:

1. **The essence of the condition**: any two charts are required to have a smooth coordinate transformation on their overlap.

2. **Counterexample: dropping smooth compatibility**
   - Take $M=\\\\mathbb{R}^1$ (the real line) and define two charts: $(U_1=\\\\mathbb{R}^1,\\\\varphi_1(x)=x)$ and $(U_2=\\\\mathbb{R}^1,\\\\varphi_2(x)=x^3)$.
   - Compute the transition maps:
     $$\\\\varphi_2\\\\circ\\\\varphi_1^{-1}(x)=x^3,\\\\quad \\\\varphi_1\\\\circ\\\\varphi_2^{-1}(x)=\\\\sqrt[3]{x}.$$
   - $\\\\varphi_2\\\\circ\\\\varphi_1^{-1}(x)=x^3$ is smooth (a polynomial), but $\\\\varphi_1\\\\circ\\\\varphi_2^{-1}(x)=\\\\sqrt[3]{x}$ has no derivative at $x=0$. Hence the two charts are not smoothly compatible, $\\\\{(U_1,\\\\varphi_1),(U_2,\\\\varphi_2)\\\\}$ is not a smooth atlas, and with this atlas $M$ is not a [smooth manifold](/nodes/dg%3Asmooth-manifold).

3. **If the union of the charts is not required to cover $M$** (the union axiom for an atlas): if the union of the charts does not cover the whole of $M$, then some points have no local coordinates and the [manifold](/nodes/dg%3Amanifold) structure cannot be defined completely.

4. **If neither Hausdorff nor second countability is required**: $M$ may lack good separation or countability properties, so that important tools such as [partitions of unity](/nodes/dg%3Apartition-of-unity) and Sard’s theorem break down.

#### Equivalent expressions

1. **In the language of transition maps**: an atlas is smooth if and only if for all $\\\\alpha,\\\\beta$ the transition map $\\\\varphi_\\\\beta\\\\circ\\\\varphi_\\\\alpha^{-1}:\\\\varphi_\\\\alpha(U_\\\\alpha\\\\cap U_\\\\beta)\\\\to\\\\varphi_\\\\beta(U_\\\\alpha\\\\cap U_\\\\beta)$ is $C^\\\\infty$.

2. **In the language of smooth functions**: given an atlas $\\\\mathcal{A}$, a function $f:M\\\\to\\\\mathbb{R}$ on $M$ is defined to be smooth if on every chart $(U_\\\\alpha,\\\\varphi_\\\\alpha)\\\\in\\\\mathcal{A}$ the map $f\\\\circ\\\\varphi_\\\\alpha^{-1}$ is a smooth function on $\\\\varphi_\\\\alpha(U_\\\\alpha)\\\\subset\\\\mathbb{R}^n$. The atlas $\\\\mathcal{A}$ is smooth if and only if this definition of a smooth function does not depend on the choice of charts (that is, defining it with another atlas gives the same set of functions).

3. **In the language of maximal atlases**: a [smooth structure](/nodes/dg%3Asmooth-structure) is equivalent to a maximal smooth atlas, and a maximal smooth atlas is equivalent to specifying a ring of smooth functions $C^\\\\infty(M)$ on $M$.

#### Kinds of atlases

- **Classified by the degree of smoothness**:
  - A $C^0$ atlas (a topological atlas): the transition maps are continuous — this defines a [topological manifold](/nodes/dg%3Atopological-manifold).
  - A $C^r$ atlas ($1\\\\le r<\\\\infty$): the transition maps are $C^r$ — this defines a $C^r$ [differentiable manifold](/nodes/manifold%3Ack-atlas).
  - A $C^\\\\infty$ atlas (a smooth atlas): the transition maps are $C^\\\\infty$ — this defines a [smooth manifold](/nodes/dg%3Asmooth-manifold).
  - A $C^\\\\omega$ atlas (a real analytic atlas): the transition maps are real analytic — this defines a real analytic [manifold](/nodes/dg%3Amanifold).
  - A complex analytic atlas: the transition maps are complex analytic — this defines a complex [manifold](/nodes/dg%3Amanifold).

- **Classified by orientability**:
  - An orienting atlas: the Jacobian determinant of the coordinate transformation between any two charts is everywhere positive. A [manifold](/nodes/dg%3Amanifold) that admits an orienting atlas is called an orientable [manifold](/nodes/dg%3Amanifold).

- **Classified by the number of charts**:
  - A one-chart atlas: available when $M$ is [homeomorphic](/nodes/dg%3Ahomeomorphism) to a region in $\\\\mathbb{R}^n$ (such as $\\\\mathbb{R}^n$ itself).
  - A many-chart atlas: most non-trivial [manifolds](/nodes/dg%3Amanifold) (such as $S^1,S^2$) need at least two charts.

#### How are the relevant statements expressed in natural language?

- “A smooth atlas is a way of covering a [manifold](/nodes/dg%3Amanifold) by several local coordinate systems such that wherever these coordinate systems overlap, the coordinate transformation is smooth.”
- “If a function is a smooth function in every local coordinate system (with respect to the coordinate variables of that system), then it is smooth on the [manifold](/nodes/dg%3Amanifold) — the smooth atlas guarantees that this definition does not depend on the choice of coordinate system.”

#### Reduction

From the point of view of set theory and topology, a smooth atlas is in essence an extra algebraic condition imposed on an open cover of a [topological manifold](/nodes/dg%3Atopological-manifold):

- choose an open cover $\\\\{U_\\\\alpha\\\\}$ of $M$;
- for each $U_\\\\alpha$ choose a [homeomorphism](/nodes/dg%3Ahomeomorphism) $\\\\varphi_\\\\alpha$ onto an open subset of $\\\\mathbb{R}^n$;
- require that on every $U_\\\\alpha\\\\cap U_\\\\beta$ the map $\\\\varphi_\\\\beta\\\\circ\\\\varphi_\\\\alpha^{-1}$, regarded as a map $\\\\mathbb{R}^n\\\\supset\\\\varphi_\\\\alpha(U_\\\\alpha\\\\cap U_\\\\beta)\\\\to\\\\varphi_\\\\beta(U_\\\\alpha\\\\cap U_\\\\beta)\\\\subset\\\\mathbb{R}^n$, is $C^\\\\infty$.

In other words, a smooth atlas adds to “having local coordinates” the condition that “the coordinate transformations are smooth”, so that calculus in Euclidean space can be “transplanted” to the [manifold](/nodes/dg%3Amanifold).

#### Lifting

From the point of view of sheaf theory, a [smooth structure](/nodes/dg%3Asmooth-structure) is equivalent to specifying a sheaf of smooth functions $\\\\mathcal{O}_M$ on $M$: for every open set $U\\\\subset M$, $\\\\mathcal{O}_M(U)$ is the ring of smooth functions on $U$. A smooth atlas gives a concrete way of constructing this sheaf. Going further, the viewpoint of $C^\\\\infty$ rings ($C^\\\\infty$-ring) regards a [smooth manifold](/nodes/dg%3Asmooth-manifold) as a locally ringed space, and the smooth atlas is precisely the gluing data that binds these local models together.

#### Understanding through links with other notions

A smooth atlas is closely connected with the following notions:

- **Local trivialisation of vector bundles**: an atlas on a vector bundle requires the transition functions to take values in $GL(n,\\\\mathbb{R})$ and to be smooth. This shares with the atlas of a [manifold](/nodes/dg%3Amanifold) the pattern “local model + compatibility condition”.
- **Riemannian metrics**: once a [manifold](/nodes/dg%3Amanifold) has a smooth atlas, extra geometric structures such as a Riemannian metric can be defined.
- **[Partitions of unity](/nodes/dg%3Apartition-of-unity)**: on a [smooth manifold](/nodes/dg%3Asmooth-manifold) there exist [partitions of unity](/nodes/dg%3Apartition-of-unity) subordinate to any open cover, and their construction relies on the fact that every chart of the smooth atlas is [homeomorphic](/nodes/dg%3Ahomeomorphism) to an open ball in $\\\\mathbb{R}^n$ in the smooth sense (a diffeomorphism).

---

### Proof

#### Proof sketch

Among the foundational results of the theory of smooth atlases, the two most central are:

1. **Every smooth atlas determines a unique maximal smooth atlas (a [smooth structure](/nodes/dg%3Asmooth-structure))**: one simply adds to the atlas every chart that is smoothly compatible with each chart of the given atlas, and then verifies that the resulting atlas is still smooth and is maximal.
2. **On every [smooth manifold](/nodes/dg%3Asmooth-manifold) there is an atlas in which every chart is diffeomorphic to $\\\\mathbb{R}^n$ — that is, [homeomorphic](/nodes/dg%3Ahomeomorphism) to it in the smooth sense** (and not merely [homeomorphic](/nodes/dg%3Ahomeomorphism) to an open subset of $\\\\mathbb{R}^n$). This is achieved by taking coordinate balls of sufficiently small radius and then mapping each ball onto the whole of $\\\\mathbb{R}^n$ by an explicit diffeomorphism (an invertible map that is smooth together with its inverse, hence in particular a [homeomorphism](/nodes/dg%3Ahomeomorphism)).

##### Proposition: a smooth atlas generates a maximal smooth atlas

Let $\\\\mathcal{A}$ be a smooth atlas on $M$. Define

$$\\\\mathcal{D}(\\\\mathcal{A}) = \\\\{(U,\\\\varphi) \\\\mid \\\\varphi \\\\text{ is a chart on } M \\\\text{ that is smoothly compatible with every chart of }\\\\mathcal{A}\\\\text{ }\\\\}.$$

Then $\\\\mathcal{D}(\\\\mathcal{A})$ is the unique maximal smooth atlas containing $\\\\mathcal{A}$.

Idea of the proof:
- Any two charts in $\\\\mathcal{D}(\\\\mathcal{A})$ are smoothly compatible: by definition both are compatible with the charts of $\\\\mathcal{A}$, and the transitivity of compatibility gives the claim.
- $\\\\mathcal{D}(\\\\mathcal{A})$ is maximal: if $\\\\mathcal{A}'$ is a smooth atlas containing $\\\\mathcal{D}(\\\\mathcal{A})$, take $(U,\\\\varphi)\\\\in\\\\mathcal{A}'$; then it is compatible with every chart of $\\\\mathcal{D}(\\\\mathcal{A})$, hence $(U,\\\\varphi)\\\\in\\\\mathcal{D}(\\\\mathcal{A})$, so $\\\\mathcal{A}'=\\\\mathcal{D}(\\\\mathcal{A})$.
- Uniqueness: if two maximal smooth atlases contain $\\\\mathcal{A}$, their union is again a smooth atlas (by compatibility), and maximality forces them to be equal.

##### Lemma: every [smooth manifold](/nodes/dg%3Asmooth-manifold) has an atlas in which each chart is diffeomorphic — [homeomorphic](/nodes/dg%3Ahomeomorphism) in the smooth sense — to $\\\\mathbb{R}^n$

Let $M$ be a [smooth manifold](/nodes/dg%3Asmooth-manifold) and $\\\\{(U_\\\\alpha,\\\\varphi_\\\\alpha)\\\\}$ one of its smooth atlases. For any $P_0\\\\in M$, take $U_\\\\alpha\\\\ni P_0$ and the coordinate [homeomorphism](/nodes/dg%3Ahomeomorphism) $\\\\varphi_\\\\alpha:U_\\\\alpha\\\\to V_\\\\alpha\\\\subset\\\\mathbb{R}^n$. Since $V_\\\\alpha$ is open, there is $\\\\varepsilon>0$ with $O_\\\\varepsilon(Q_0)\\\\subset V_\\\\alpha$ (where $Q_0=\\\\varphi_\\\\alpha(P_0)$). Put $W_P = \\\\varphi_\\\\alpha^{-1}(O_\\\\varepsilon(Q_0))$. The family $\\\\{W_P\\\\}$ is an atlas on $M$, and each $W_P$ is [homeomorphic](/nodes/dg%3Ahomeomorphism) to the open ball $O_\\\\varepsilon(Q_0)$.

To obtain a diffeomorphism (a [homeomorphism](/nodes/dg%3Ahomeomorphism) preserving smoothness) onto $\\\\mathbb{R}^n$, consider the map from the unit open ball to $\\\\mathbb{R}^n$:

$$ y^k = \\\\frac{x^k}{\\\\sqrt{1-(x^1)^2-\\\\cdots-(x^n)^2}},\\\\quad
x^k = \\\\frac{y^k}{\\\\sqrt{1+(y^1)^2+\\\\cdots+(y^n)^2}}, $$

which is $C^\\\\infty$ and self-inverse, so the open ball is diffeomorphic — [homeomorphic](/nodes/dg%3Ahomeomorphism) in the smooth sense — to $\\\\mathbb{R}^n$. Hence $W_P$ is diffeomorphic to $\\\\mathbb{R}^n$, that is, [homeomorphic](/nodes/dg%3Ahomeomorphism) to it with respect to the smooth structure.

---

### Applications

#### Direct applications

**Example 1: the [smooth structure](/nodes/dg%3Asmooth-structure) of $\\\\mathbb{R}^n$**
Take $U=\\\\mathbb{R}^n$ and $\\\\varphi=\\\\mathrm{id}:\\\\mathbb{R}^n\\\\to\\\\mathbb{R}^n$. The one-chart atlas $\\\\{(\\\\mathbb{R}^n,\\\\mathrm{id})\\\\}$ is a smooth atlas, and it generates the standard [smooth structure](/nodes/dg%3Asmooth-structure) on $\\\\mathbb{R}^n$.

**Example 2: a smooth atlas for the circle $S^1$**
Let $S^1 = \\\\{(x,y)\\\\in\\\\mathbb{R}^2\\\\mid x^2+y^2=1\\\\}$.
- **The four-chart scheme**:
  $$\\\\begin{aligned}
  U_1 &= \\\\{(x,y)\\\\in S^1: y>0\\\\}, & \\\\varphi_1(x,y)&=x,\\\\
  U_2 &= \\\\{(x,y)\\\\in S^1: y<0\\\\}, & \\\\varphi_2(x,y)&=x,\\\\
  U_3 &= \\\\{(x,y)\\\\in S^1: x>0\\\\}, & \\\\varphi_3(x,y)&=y,\\\\
  U_4 &= \\\\{(x,y)\\\\in S^1: x<0\\\\}, & \\\\varphi_4(x,y)&=y.
  \\\\end{aligned}$$
  The image of each $\\\\varphi_k$ is the open interval $(-1,1)\\\\subset\\\\mathbb{R}^1$. On the overlaps the transition maps are smooth (for instance on $U_1\\\\cap U_3$ we have $\\\\varphi_3\\\\circ\\\\varphi_1^{-1}(x)=\\\\sqrt{1-x^2}$, which is smooth for $x\\\\in(0,1)$).
- **The two-chart scheme (angular coordinates)**:
  $U_1=S^1\\\\setminus\\\\{(1,0)\\\\}$ with $\\\\varphi_1$ the polar angle $\\\\theta\\\\in(0,2\\\\pi)$; $U_2=S^1\\\\setminus\\\\{(-1,0)\\\\}$ with $\\\\varphi_2$ the polar angle $\\\\eta\\\\in(-\\\\pi,\\\\pi)$. On the overlaps the transition map is $\\\\theta\\\\mapsto\\\\theta$ (on the upper semicircle) or $\\\\theta\\\\mapsto\\\\theta-2\\\\pi$ (on the lower semicircle), both smooth.

**Example 3: a smooth atlas for the sphere $S^2$ — stereographic projection**
Let $S^2 = \\\\{(x,y,z)\\\\in\\\\mathbb{R}^3\\\\mid x^2+y^2+z^2=1\\\\}$.
- Projection from the north pole $P_0=(0,0,1)$ to the $xy$-plane:
  $$U_0 = S^2\\\\setminus\\\\{P_0\\\\},\\\\quad \\\\varphi_0(x,y,z)=\\\\left(\\\\frac{x}{1-z},\\\\frac{y}{1-z}\\\\right).$$
- Projection from the south pole $P_1=(0,0,-1)$ to the $xy$-plane:
  $$U_1 = S^2\\\\setminus\\\\{P_1\\\\},\\\\quad \\\\varphi_1(x,y,z)=\\\\left(\\\\frac{x}{1+z},\\\\frac{y}{1+z}\\\\right).$$
- On $U_0\\\\cap U_1$ the transition map is
  $$(u,v)\\\\mapsto\\\\left(\\\\frac{u}{u^2+v^2},\\\\frac{v}{u^2+v^2}\\\\right),$$
  which is smooth on $\\\\mathbb{R}^2\\\\setminus\\\\{(0,0)\\\\}$. Hence $\\\\{(U_0,\\\\varphi_0),(U_1,\\\\varphi_1)\\\\}$ is a smooth atlas for $S^2$. Introducing the complex coordinates $w_0=\\\\frac{x+iy}{1-z}$ and $w_1=\\\\frac{x-iy}{1+z}$ gives $w_0=1/w_1$, which is complex analytic, so $S^2$ is also a complex [manifold](/nodes/dg%3Amanifold) (the Riemann sphere).

#### Indirect applications

- **In differential topology**: a smooth atlas is the foundation for defining smooth maps, the differential, tangent spaces, [differential forms](/nodes/dg%3Adifferential-form) and every other notion belonging to the differential structure.
- **In physics**:
  - General relativity models spacetime as a 4-dimensional [smooth manifold](/nodes/dg%3Asmooth-manifold), and the Einstein field equations on it are equations for a [smooth tensor field](/nodes/dg%3Atensor).
  - In gauge field theory the gauge potential is a connection on a principal bundle, and the construction of the principal bundle depends on the smooth atlas of the base [manifold](/nodes/dg%3Amanifold).
  - In analytical mechanics the configuration space is a [smooth manifold](/nodes/dg%3Asmooth-manifold), and Lagrangian and Hamiltonian mechanics unfold on it.
- **In data science**: [manifold](/nodes/dg%3Amanifold) learning assumes that high-dimensional data lie on a low-dimensional [manifold](/nodes/dg%3Amanifold), and the smooth atlas provides the theoretical benchmark for “having local coordinates”.

---

### Generalizations

- **$C^r$ smoothness**: one may require the transition maps to be only $C^r$ ($r$ a finite integer) rather than $C^\\\\infty$. Most geometric theories are most convenient in the $C^\\\\infty$ framework.
- **Complex [manifolds](/nodes/dg%3Amanifold)**: regard $\\\\mathbb{R}^{2n}$ as $\\\\mathbb{C}^n$ and require the transition maps to be complex analytic (holomorphic).
- **Banach [manifolds](/nodes/dg%3Amanifold) and Fréchet [manifolds](/nodes/dg%3Amanifold)**: generalise the model space from the finite-dimensional $\\\\mathbb{R}^n$ to an infinite-dimensional Banach space or Fréchet space; the corresponding notion of an atlas is the foundation of infinite-dimensional differential geometry.
- **Foliations**: a foliation on a [manifold](/nodes/dg%3Amanifold) can also be described by a local atlas (splitting the [manifold](/nodes/dg%3Amanifold) into the form $\\\\mathbb{R}^k\\\\times\\\\mathbb{R}^{n-k}$).
- **Open problems**: how many different [smooth structures](/nodes/dg%3Asmooth-structure) can a given [topological manifold](/nodes/dg%3Atopological-manifold) carry? For example, on $\\\\mathbb{R}^4$ there exist uncountably many pairwise non-diffeomorphic [smooth structures](/nodes/dg%3Asmooth-structure) (exotic $\\\\mathbb{R}^4$) — not carried into one another by any [homeomorphism](/nodes/dg%3Ahomeomorphism) — while $S^7$ carries 28 of them (Milnor’s exotic spheres). When do two smooth atlases define equivalent [smooth structures](/nodes/dg%3Asmooth-structure)? This is the classification problem of differential topology.

---

### Common misconceptions

1. **“The atlas of a [smooth manifold](/nodes/dg%3Asmooth-manifold) must be maximal”**
   In fact one usually only has to give a (smaller) smooth atlas, which then generates the unique maximal atlas. The maximal atlas exists only for theoretical convenience (for instance, it guarantees that every compatible chart is already contained in the structure); in concrete computations only a few of its charts are ever used.

2. **“An atlas may consist of arbitrarily many charts”**
   In theory yes, but in practice one always wants to cover the [manifold](/nodes/dg%3Amanifold) with as few and as simple charts as possible. For example $S^1$ can be covered by 2 charts (angular coordinates), and $S^2$ by 2 stereographic charts. Superfluous overlaps only add to the work of verification.

3. **“A smooth function is a function that can be written as a smooth function in coordinates”**
   That is correct, but beginners easily overlook that the definition of smoothness depends on the atlas. If the atlas is changed, a function may go from smooth to non-smooth. The role of the smooth atlas is precisely to fix a “standard” so that the smoothness of a function does not depend on the choice of charts.

4. **“On $M=\\\\mathbb{R}^1$ the charts $(U_1,\\\\varphi_1(x)=x)$ and $(U_2,\\\\varphi_2(x)=x^3)$ form a smooth atlas”**
   This is a classical wrong example. Although $\\\\varphi_2\\\\circ\\\\varphi_1^{-1}(x)=x^3$ is smooth, its inverse $\\\\varphi_1\\\\circ\\\\varphi_2^{-1}(x)=\\\\sqrt[3]{x}$ is not differentiable at $x=0$. The transition maps must therefore be smooth in **both** directions.

---

### Insights

- **“Local + compatible” is the most central construction pattern in geometry**: [manifolds](/nodes/dg%3Amanifold), vector bundles, principal bundles, foliations … almost every geometric object is defined by a “local model + gluing condition”. The smooth atlas is the purest example of this pattern.
- **The leap from “one coordinate system” to “an atlas”**: human knowledge of the Earth began with local maps, until the need for a collection of maps became apparent — which is exactly the intuitive source of the word “atlas”. The naming of mathematical notions often carries deep intuition.
- **Smoothness is not inherited automatically**: the structure of a [topological manifold](/nodes/dg%3Atopological-manifold) alone is not enough to define differentiability. The smooth atlas is an extra structure that humans “invented” in order to do calculus on curved spaces; it is neither unique nor naturally given (for instance, $S^7$ carries several different [smooth structures](/nodes/dg%3Asmooth-structure)).

---

### Summary

#### Idea

**“Transplant Euclidean calculus to a curved space by introducing local coordinates, and guarantee the consistency of the transplant through smooth compatibility.”**

The smooth atlas provides a framework in which we can talk about “differentiability” on a general [topological space](/nodes/dg%3Atopological-space), thereby generalising classical calculus to [manifolds](/nodes/dg%3Amanifold).

#### Methods

| Method / technique | Where it is used |
|-----------|----------|
| **Verification of transition maps** | the core means of deciding whether an atlas is smooth |
| **Constructing explicit coordinate maps** | used when building atlases on concrete [manifolds](/nodes/dg%3Amanifold) (such as $S^1,S^2$) |
| **Constructing diffeomorphisms** (smooth [homeomorphisms](/nodes/dg%3Ahomeomorphism)) | mapping a coordinate ball onto $\\\\mathbb{R}^n$ (Lemma 1) |
| **Maximal extension** | generating a [smooth structure](/nodes/dg%3Asmooth-structure) from a given smooth atlas |
| **Solving explicitly for the inverse map** | verifying that a transition map is smooth in both directions (as in the counterexample with $x$ and $x^3$) |

---

### Looking back and asking

- When verifying that two charts are smoothly compatible, is it enough to verify that the transition map is smooth in one direction? Why?
- If an atlas on $S^1$ contains the four projection charts, is the maximal atlas it generates the same as the maximal atlas generated by the two-chart angular-coordinate scheme? Why?
- Does there exist a [topological manifold](/nodes/dg%3Atopological-manifold) on which no smooth atlas exists at all? (Hint: the work of Kervaire — there exist non-differentiable [topological manifolds](/nodes/dg%3Atopological-manifold).)
- If the Hausdorff condition is dropped, which results in the theory of [smooth manifolds](/nodes/dg%3Asmooth-manifold) break down?

---

### References

1. \`А. С. 米先柯（A. S. Mishchenko）, А. Т. 福明柯（A. T. Fomenko）. 微分几何与拓扑学简明教程（A Concise Course in Differential Geometry and Topology）.\` (z-library)
2. John M. Lee. *Introduction to Riemannian Manifolds*, Second Edition. (z-library)
3. Tammo tom Dieck. *Algebraic Topology*. EMS Textbooks in Mathematics, 2008. (z-library)
4. \`陈维桓（Chen Weihuan）. 微分几何引论（Introduction to Differential Geometry）. 2013.\` (z-library)
5. \`梁灿彬（Liang Canbin）, 周彬（Zhou Bin）. 微分几何入门与广义相对论（An Introduction to Differential Geometry and General Relativity）.\` (z-library)
6. \`梅加强（Mei Jiaqiang）. 流形与几何初步（Manifolds and Introductory Geometry）.\` (z-library)
7. \`贝尔热（Berger）, 戈斯丢（Gostiaux）. 微分几何：流形、曲线和曲面（Differential Geometry: Manifolds, Curves and Surfaces）(法兰西数学精品译丛 / French Mathematics Classics translation series).\` (z-library)
8. Clifford Henry Taubes. *Differential Geometry: Bundles, Connections, Metrics and Curvature*. Oxford Graduate Texts in Mathematics, 2011. (z-library)
9. B. A. Dubrovin, S. P. Novikov, A. T. Fomenko. *Modern Geometry — Methods and Applications, Part II: The Geometry and Topology of Manifolds*. GTM 104, 1985. (z-library)
10. John Willard Milnor. *Topology from the Differentiable Viewpoint*. University Press of Virginia, 1997. (z-library)`,

  'dg:smooth-manifold': `## Smooth manifolds

> A smooth manifold is the precise description of a space on which calculus can be performed. It generalises the notion of smoothness in Euclidean space to arbitrarily curved spaces, so that we can talk about differentiable functions, tangent vectors, [differential forms](/nodes/dg%3Adifferential-form) and other tools of analysis on abstract spaces such as the sphere, the torus and projective space.

**Source.** The read-only snapshot \`G:/DifferentialGeometry/object/def/光滑流形.md\` (see \`data/dg/\`).

---

**Tags**: #differential-geometry #topology #manifold #smooth-structure #geometry

---

## Prerequisites

### Essential

- **Basics of point-set topology**: understanding [topological spaces](/nodes/dg%3Atopological-space), open sets, continuous maps, [homeomorphisms](/nodes/dg%3Ahomeomorphism), Hausdorff spaces, second countability and so on. A smooth manifold is first of all a [topological manifold](/nodes/dg%3Atopological-manifold), so the topological background is the entry threshold for understanding [manifolds](/nodes/dg%3Amanifold).
- **Multivariable calculus**: familiarity with smooth functions on $\\mathbb{R}^n$, partial derivatives, the Jacobian matrix, the [implicit function theorem](/nodes/dg%3Aimplicit-function-theorem) and the [inverse function theorem](/nodes/dg%3Ainverse-function-theorem). These are the core tools for defining [smooth structure](/nodes/dg%3Asmooth-structure) and tangent spaces.
- **Linear algebra**: [vector spaces](/nodes/bg%3Alinear%3Avector), linear maps, dual spaces, the [rank](/nodes/bg%3Alinear%3Avector) of a matrix and so on.

### Supporting

- **A first course in differential equations**: knowing the existence and uniqueness theorem for solutions of ordinary differential equations helps in understanding the relation between tangent vector fields and flows.
- **Abstract algebra**: the notion of a [group](/nodes/bg%3Agroup%3Abinary) helps in understanding [manifolds](/nodes/dg%3Amanifold) that carry a group structure, such as Lie groups.
- **The classical theory of curves and surfaces**: parametrisation of curves and surfaces in $\\mathbb{R}^3$, the first and second fundamental forms and so on are the most intuitive source of the seed ideas of smooth manifold theory.

### Further

- **Algebraic topology**: homology and homotopy theory help in understanding the global topological invariants of a [manifold](/nodes/dg%3Amanifold), such as Betti numbers and the fundamental group.
- **Differential topology**: transversality, Morse theory, cobordism theory and so on study the classification of smooth manifolds up to diffeomorphism — that is, up to [homeomorphism](/nodes/dg%3Ahomeomorphism) that respects the smooth structure.
- **Algebraic geometry**: algebraic varieties are the analogue of smooth manifolds in the framework of polynomial/algebraic functions; the two meet in complex geometry through complex [manifolds](/nodes/dg%3Amanifold).
- **Fibre bundle theory**: vector bundles and principal bundles over a smooth manifold are the cornerstones of gauge field theory and modern differential geometry.

---

## Motivation

### Motivation for introducing it

The introduction of smooth manifolds has at least three parallel threads:

- **A thread internal to the discipline**: classical differential geometry studies curves and surfaces in $\\mathbb{R}^3$ using local parametrisations. But when one wants to study a “surface” in a higher-dimensional space (such as a three-dimensional surface in $\\mathbb{R}^4$), or an object such as the sphere $S^2$, one finds that there is no hope of covering the whole space with a single global coordinate system. There has to be a notion that allows different coordinate systems in different regions, with coordinate transformations smooth enough that calculus can be carried across regions. **Without introducing smooth manifolds, calculus on a curved space cannot be carried out systematically.**

- **A thread from outside**: Einstein’s general relativity interprets gravitation as the curvature of spacetime, and spacetime itself is a four-dimensional Lorentz [manifold](/nodes/dg%3Amanifold). Physicists need to write Maxwell’s equations and Dirac’s equation on a curved spacetime, which forced them to develop a language of differential geometry capable of computing on an arbitrary smooth manifold. Moreover, the connections on fibre bundles in gauge field theory and the path integrals of quantum field theory both take the smooth manifold as their basic stage.

- **An aesthetic/structural thread**: mathematicians wanted to generalise calculus on $\\mathbb{R}^n$ to as general a space as possible while preserving the core property of “being locally linearisable”. A smooth manifold is exactly a space that “looks locally like $\\mathbb{R}^n$, with smooth coordinate transformations”; this definition is both concise and natural, retaining analytic power while releasing the freedom of topological form.

#### The most classical example: from curves to the sphere

The evolution from the classical theory of curves and surfaces to smooth manifolds is a natural process of abstraction. The original seed was the regular parametrised surface in $\\mathbb{R}^3$: two parameters $(u, v)$ describe a surface $r(u, v)$, and near each point of the surface there is a two-dimensional coordinate system. But a single surface (the sphere, say) cannot be covered by one global parametrisation — the sphere needs at least two charts (stereographic projections, for instance). This idea of “assembling several local charts” is the germ of the notion of a smooth manifold. The modern canonical form extracts exactly this idea into the abstract definition “[topological manifold](/nodes/dg%3Atopological-manifold) + [smooth atlas](/nodes/dg%3Asmooth-atlas)”.

### Motivation for the construction

The construction of a smooth manifold can be understood as follows: we want a space on which calculus can be done “locally”, but which may globally be curved, knotted, or have holes. The procedure is:

1. Start from the most basic building blocks — each block is [homeomorphic](/nodes/dg%3Ahomeomorphism) to an open subset of $\\mathbb{R}^n$.
2. Put coordinates on these blocks, letting the coordinate maps take a block to an open subset of $\\mathbb{R}^n$.
3. On the overlapping parts of the blocks, require the coordinate transformations to be smooth (that is, $C^\\infty$), so that functions and operations defined on different blocks are compatible.
4. Glue all the blocks together along these coordinate transformations, and a smooth manifold is obtained.

For example, the construction of the sphere $S^2$: take two open sets $U_1 = S^2 \\setminus \\{N\\}$ (the north pole) and $U_2 = S^2 \\setminus \\{S\\}$ (the south pole), mapped to $\\mathbb{R}^2$ by stereographic projection. On the overlap near the equator the coordinate transformation between the two is smooth. These two charts therefore form a [smooth atlas](/nodes/dg%3Asmooth-atlas) for $S^2$, and $S^2$ becomes a smooth manifold.

---

## Form

### Canonical general form

#### Definition (smooth manifold)

Let $M$ be a Hausdorff, second countable [topological space](/nodes/dg%3Atopological-space). If there is an open cover $\\{U_\\alpha\\}_{\\alpha \\in \\Lambda}$ of $M$ together with [homeomorphisms](/nodes/dg%3Ahomeomorphism) $\\varphi_\\alpha : U_\\alpha \\to \\varphi_\\alpha(U_\\alpha) \\subseteq \\mathbb{R}^n$ (where $\\varphi_\\alpha(U_\\alpha)$ is an open subset of $\\mathbb{R}^n$) such that for all $\\alpha, \\beta$ with $U_\\alpha \\cap U_\\beta \\neq \\varnothing$ the coordinate transformation map

$$
\\varphi_\\beta \\circ \\varphi_\\alpha^{-1} : \\varphi_\\alpha(U_\\alpha \\cap U_\\beta) \\to \\varphi_\\beta(U_\\alpha \\cap U_\\beta)
$$

is $C^\\infty$ (smooth), then $M$ is called an **$n$-dimensional smooth manifold** (or a $C^\\infty$ [manifold](/nodes/dg%3Amanifold)).

- Each $(U_\\alpha, \\varphi_\\alpha)$ is called a **chart**.
- The collection $\\{(U_\\alpha, \\varphi_\\alpha)\\}$ of all charts is called a **[smooth atlas](/nodes/dg%3Asmooth-atlas)**.
- Two [smooth atlases](/nodes/dg%3Asmooth-atlas) are called equivalent if their union is again a [smooth atlas](/nodes/dg%3Asmooth-atlas); a [smooth structure](/nodes/dg%3Asmooth-structure) on a smooth manifold is a maximal [smooth atlas](/nodes/dg%3Asmooth-atlas).

#### The key points of the definition

- **Hausdorff + second countable**: this guarantees that the [manifold](/nodes/dg%3Amanifold) has good point-set topological properties (such as the existence of [partitions of unity](/nodes/dg%3Apartition-of-unity)).
- **Locally Euclidean**: every point has a neighbourhood [homeomorphic](/nodes/dg%3Ahomeomorphism) to an open subset of $\\mathbb{R}^n$ — the precise formulation of “being locally linearisable”.
- **Smooth coordinate transformations**: this makes the notion of “smoothness” for functions and maps defined in different coordinate systems self-consistent.

### Analysis of the necessary conditions

Several conditions in the definition of a smooth manifold are essential, each for its own reason:

1. **The Hausdorff condition**: dropping it can produce “strange” spaces, such as the “line with two origins” — the behaviour near the origin cannot be distinguished, uniqueness of limits is destroyed, and calculus cannot be developed properly.
2. **Second countability**: this guarantees the existence of [partitions of unity](/nodes/dg%3Apartition-of-unity), the key tool for assembling local constructions into global ones. Without second countability, some smooth manifolds may not carry enough smooth functions.
3. **Smooth coordinate transformations**: requiring only $C^0$ (continuity) gives a [topological manifold](/nodes/dg%3Atopological-manifold), but tangent vectors and differentiation cannot be defined. Requiring only $C^k$ ($k$ finite) gives a $C^k$ [manifold](/nodes/dg%3Amanifold), on which calculus up to order $k$ is still possible, but $C^\\infty$ is the most natural and most commonly used setting.
4. **Locally Euclidean**: dropping it degenerates to a general [topological space](/nodes/dg%3Atopological-space) and loses the foundation of calculus.

### Equivalent expressions

A smooth manifold can be defined in several equivalent ways:

- **Via embeddings** (the Whitney [embedding theorem](/nodes/dg%3Asmooth-embedding)): every $n$-dimensional smooth manifold can be [smoothly embedded](/nodes/dg%3Asmooth-embedding) in $\\mathbb{R}^{2n}$ as a closed sub[manifold](/nodes/dg%3Amanifold). Hence a smooth manifold can equivalently be defined as a smooth sub[manifold](/nodes/dg%3Amanifold) of $\\mathbb{R}^{2n}$. But this is an existence theorem, not a definition.
- **Via a structure sheaf**: a smooth manifold can be defined as a locally ringed space $(M, \\mathcal{O}_M)$, where $\\mathcal{O}_M$ is the sheaf of smooth functions on $M$ and $(M, \\mathcal{O}_M)$ is locally isomorphic to $(\\mathbb{R}^n, C^\\infty_{\\mathbb{R}^n})$. This is the equivalent definition from the point of view of algebraic geometry.
- **Via an equivalence class of atlases**: a smooth manifold is an equivalence class of [smooth atlases](/nodes/dg%3Asmooth-atlas) on a [topological manifold](/nodes/dg%3Atopological-manifold). This is the most commonly used definition.

### How are the relevant statements expressed in natural language?

- “A smooth manifold is a space that looks locally like $\\mathbb{R}^n$, with smooth coordinate transformations.”
- “On a smooth manifold one can do calculus just as on $\\mathbb{R}^n$, except that globally it may be curved.”
- “The sphere, the torus, hyperbolic space — these are all smooth manifolds.”

### Reduction

Restating a smooth manifold in the more basic language of set theory:

A smooth manifold is a set $M$ equipped with a topology $\\mathcal{T}$ and a [smooth atlas](/nodes/dg%3Asmooth-atlas) $\\mathcal{A}$ such that:
- the topology on $M$ makes $M$ a Hausdorff, second countable space;
- every chart $(U, \\varphi)$ in $\\mathcal{A}$ is a [homeomorphism](/nodes/dg%3Ahomeomorphism) from $U$ onto an open subset of $\\mathbb{R}^n$;
- any two charts of the atlas are compatible on their overlap through a $C^\\infty$ map.

From the categorical point of view: smooth manifolds form a category $\\mathsf{Man}^\\infty$ whose objects are smooth manifolds and whose morphisms are smooth maps. This category has finite products and fibre products (under a transversality condition), and there is a forgetful functor $\\mathsf{Man}^\\infty \\to \\mathsf{Top}$ to the category of [topological spaces](/nodes/dg%3Atopological-space).

### Lifting

In higher-level theories, a smooth manifold is a special case of the following objects:

- A **[differentiable manifold](/nodes/manifold%3Ack-atlas)** (a $C^k$ [manifold](/nodes/dg%3Amanifold)) is the case $k = \\infty$ of a smooth manifold.
- A **complex [manifold](/nodes/dg%3Amanifold)** is the special case in which the coordinate transformations are holomorphic; for instance $\\mathbb{C}P^n$ is both a smooth manifold and a complex [manifold](/nodes/dg%3Amanifold).
- A **Banach [manifold](/nodes/dg%3Amanifold)** is the generalisation in which $\\mathbb{R}^n$ is replaced by an infinite-dimensional Banach space; it appears in the calculus of variations and in functional analysis.
- An **algebraic variety** (over $\\mathbb{C}$) is the analogue of a smooth manifold in the framework of polynomial/algebraic functions, but an algebraic variety may have singularities whereas a smooth manifold may not.
- **Generalised smooth spaces** (such as diffeological spaces and smooth sets) generalise the definition of [smooth structure](/nodes/dg%3Asmooth-structure) further to more general categories, so that infinite-dimensional objects such as function spaces also acquire a [smooth structure](/nodes/dg%3Asmooth-structure).

---

## Basic properties and proofs

### Smooth maps

**Definition**: let $M, N$ be smooth manifolds and $f: M \\to N$ a continuous map. If for every $p \\in M$, every chart $(U, \\varphi)$ near $p$ and every chart $(V, \\psi)$ near $f(p)$ with $f(U) \\subseteq V$, the local representation

$$
\\psi \\circ f \\circ \\varphi^{-1} : \\varphi(U) \\to \\psi(V)
$$

is a smooth map, then $f$ is called a smooth map. The set of all smooth maps is written $C^\\infty(M, N)$.

**Properties**: the composite of smooth maps is again smooth, and the identity map is smooth. Hence smooth manifolds and smooth maps form a category.

### Tangent spaces and tangent maps

The tangent space is the “linearisation” of a [manifold](/nodes/dg%3Amanifold) at a point. There are two equivalent definitions:

**Definition (the curve approach)**: let $M$ be a smooth manifold and $p \\in M$. Consider all smooth curves through $p$, $\\gamma: (-\\varepsilon, \\varepsilon) \\to M$ with $\\gamma(0) = p$. Two curves $\\gamma_1, \\gamma_2$ are equivalent if in some local coordinate system $(\\varphi \\circ \\gamma_1)'(0) = (\\varphi \\circ \\gamma_2)'(0)$. An equivalence class is called a tangent vector at $p$, and the set of all tangent vectors forms the tangent space $T_p M$, which is an $n$-dimensional [vector space](/nodes/bg%3Alinear%3Avector).

**Definition (the derivation approach)**: $T_p M$ is the set of all linear maps $X_p: C^\\infty(M) \\to \\mathbb{R}$ satisfying the Leibniz rule (that is, $X_p(fg) = f(p)X_pg + g(p)X_pf$); it is called the tangent space at $p$.

**The tangent map**: let $f: M \\to N$ be smooth; then $f$ induces at $p$ a linear map $f_{*p}: T_p M \\to T_{f(p)} N$, defined by $f_{*p}(X_p)g = X_p(g \\circ f)$, $\\forall g \\in C^\\infty(N)$. The tangent map satisfies the chain rule: $(g \\circ f)_{*p} = g_{*f(p)} \\circ f_{*p}$.

**Proof sketch**: the dimension of the tangent space equals the dimension of the [manifold](/nodes/dg%3Amanifold), because in a local coordinate system $\\{\\partial/\\partial x^i|_p\\}_{i=1}^n$ is a basis, and this basis does not depend on the choice of chart (under a change of coordinates it transforms by the Jacobian matrix).

### The [partition of unity](/nodes/dg%3Apartition-of-unity) theorem

**Theorem**: on a smooth manifold there exist [partitions of unity](/nodes/dg%3Apartition-of-unity): for every open cover $\\{U_\\alpha\\}$ there is a sequence of smooth functions $\\{\\rho_i\\}$ such that:
- $\\operatorname{supp} \\rho_i$ is compact;
- the support of each $\\rho_i$ is contained in some $U_\\alpha$;
- at every point only finitely many $\\rho_i$ are non-zero;
- $\\sum_i \\rho_i \\equiv 1$.

A [partition of unity](/nodes/dg%3Apartition-of-unity) is the universal tool for assembling local constructions (locally defined functions, vector fields, metrics) into global objects.

---

## Applications

### Direct applications

**Example 1: smooth functions on the sphere $S^2$.** Using stereographic charts, verify that $S^2$ is a smooth manifold; then one can define smooth functions on $S^2$, such as the height function $f(x, y, z) = z$. Its critical points (the south and north poles) give the first example of Morse theory.

**Example 2: the construction of the [tangent bundle](/nodes/dg%3Atangent-bundle).** For any smooth manifold $M$, its [tangent bundle](/nodes/dg%3Atangent-bundle) $TM = \\bigcup_{p \\in M} T_p M$ is a $2n$-dimensional smooth manifold. The projection map $\\pi: TM \\to M$ is smooth, and $TM$ is locally trivialised as $U \\times \\mathbb{R}^n$. The [tangent bundle](/nodes/dg%3Atangent-bundle) is the prototype of a vector bundle over a [manifold](/nodes/dg%3Amanifold) and the foundation for defining vector fields, connections, curvature and every other geometric structure.

**Example 3: Lie groups.** $GL(n, \\mathbb{R})$ is an open subset of $\\mathbb{R}^{n^2}$ and hence a smooth manifold; matrix multiplication and inversion are smooth maps. Closed subgroups such as $SL(n, \\mathbb{R})$ and $O(n)$ are regular sub[manifolds](/nodes/dg%3Amanifold) and hence also smooth manifolds. A Lie group is the perfect combination of a smooth manifold with a group structure.

### Indirect applications

- **Inside mathematics**: smooth manifolds provide the stage for [de Rham cohomology](/nodes/dg%3Apoincare-lemma). The de Rham theorem links the closed-mod-exact quotient of [differential forms](/nodes/dg%3Adifferential-form) with the singular cohomology of the [manifold](/nodes/dg%3Amanifold), and is a meeting point of algebraic topology and differential geometry. The Atiyah–Singer index theorem establishes a link between the analytic index and the topological index of an elliptic operator on a compact smooth manifold, and is one of the deepest achievements of twentieth-century mathematics.

- **In physics**: general relativity models spacetime as a four-dimensional Lorentz [manifold](/nodes/dg%3Amanifold), in which the distribution of matter determines the curvature of spacetime through the Einstein field equations. In gauge field theory, physical fields are sections of fibre bundles and the Yang–Mills equations are the equations of motion for a connection on a fibre bundle. String theory operates on higher-dimensional [manifolds](/nodes/dg%3Amanifold), and Calabi–Yau [manifolds](/nodes/dg%3Amanifold) are the central objects of compactification schemes.

- **In computer science**: in computer graphics, the triangulation and smooth subdivision of surfaces (two-dimensional [manifolds](/nodes/dg%3Amanifold)), and data-reduction methods such as [manifold](/nodes/dg%3Amanifold) learning, all depend directly on the notion of a smooth manifold.

---

## Generalizations

- **[Manifolds](/nodes/dg%3Amanifold) with boundary**: allow a [manifold](/nodes/dg%3Amanifold) to be locally [homeomorphic](/nodes/dg%3Ahomeomorphism) to the upper half-space $\\mathbb{H}^n_+ = \\{x \\in \\mathbb{R}^n \\mid x^n \\ge 0\\}$, with boundary points mapping to $x^n = 0$. Stokes’ theorem is stated precisely in the framework of [manifolds](/nodes/dg%3Amanifold) with boundary.

- **$C^k$ [manifolds](/nodes/dg%3Amanifold)**: lower the smoothness of the coordinate transformations to $C^k$, obtaining a $C^k$ [manifold](/nodes/dg%3Amanifold), on which calculus up to order $k$ is still possible.

- **Infinite-dimensional [manifolds](/nodes/dg%3Amanifold)**: replace $\\mathbb{R}^n$ by a Banach space or a Hilbert space, obtaining Banach [manifolds](/nodes/dg%3Amanifold) or Hilbert [manifolds](/nodes/dg%3Amanifold), which appear in the calculus of variations, functional analysis and gauge field theory.

- **Complex [manifolds](/nodes/dg%3Amanifold)**: replace $\\mathbb{R}^n$ by $\\mathbb{C}^n$ and require the coordinate transformations to be holomorphic, obtaining a complex [manifold](/nodes/dg%3Amanifold). A Kähler [manifold](/nodes/dg%3Amanifold) is a special complex [manifold](/nodes/dg%3Amanifold) carrying a [Riemannian metric](/nodes/manifold%3Achart-atlas), a complex structure and a symplectic structure at the same time; it is a meeting ground of algebraic geometry and mathematical physics.

- **Orbifolds**: these allow a local description as $\\mathbb{R}^n$ modulo the action of a finite group, and appear in moduli spaces and mirror symmetry.

---

## Common misconceptions

1. **“A smooth manifold is just a surface embedded in $\\mathbb{R}^N$”**
   This is the most common but one-sided understanding. The Whitney [embedding theorem](/nodes/dg%3Asmooth-embedding) guarantees that a smooth manifold can be embedded in a Euclidean space of sufficiently high dimension, but conceptually a smooth manifold does not depend on any external space — it is an “intrinsic” object. Viewing a [manifold](/nodes/dg%3Amanifold) as an embedded sub[manifold](/nodes/dg%3Amanifold) helps intuition, but loses the intrinsic viewpoint (for instance, the tangent space can be defined by derivations, with no need for an external $\\mathbb{R}^N$).

2. **“Every point of a smooth manifold can be labelled by a unique coordinate”**
   In fact a smooth manifold usually has no global coordinates. Coordinates are local, and several different coordinate systems usually cover the same point, connected by smooth coordinate transformations. Beginners may underestimate the essential difference between “local coordinates” and “global coordinates”.

3. **“A smooth manifold is just a [topological manifold](/nodes/dg%3Atopological-manifold) plus a [smooth atlas](/nodes/dg%3Asmooth-atlas)”**
   Although this is roughly right, one has to note that the same [topological manifold](/nodes/dg%3Atopological-manifold) can carry different, incompatible [smooth structures](/nodes/dg%3Asmooth-structure). For example, on $\\mathbb{R}^4$ there exist uncountably many pairwise non-diffeomorphic [smooth structures](/nodes/dg%3Asmooth-structure) (exotic $\\mathbb{R}^4$) — not carried into one another by any [homeomorphism](/nodes/dg%3Ahomeomorphism) — whereas the [smooth structure](/nodes/dg%3Asmooth-structure) on $\\mathbb{R}^n$ for $n \\neq 4$ is unique (the standard structure). This means that a “[smooth structure](/nodes/dg%3Asmooth-structure)” is extra information independent of the topological structure.

4. **“A tangent space on a smooth manifold can always be written as $\\partial/\\partial x^i$”**
   It is true that in a local coordinate system the tangent space has the natural basis $\\{\\partial/\\partial x^i\\}$, but beginners may mistakenly think that this is the only way to represent a tangent vector. In essence a tangent vector is a linear functional satisfying the Leibniz rule, or an equivalence class of smooth curves; a local coordinate basis is only a representation in one chart.

---

## Insights

- **“The tension between the local and the global”** is the central habit of thought running through the whole theory of [manifolds](/nodes/dg%3Amanifold). The definition of a smooth manifold is itself “locally $\\mathbb{R}^n$, globally curved” — this idea of divide and conquer, local first and global afterwards, is everywhere in mathematics. Whatever object one studies, one can first ask “what does it look like locally?” and then “how do the local pieces assemble into a whole?”.

- **“Smoothness is the compatibility of coordinate transformations”** is an insight worth savouring repeatedly. A smooth manifold does not define “what smoothness is”; it guarantees, by requiring the coordinate transformations to be smooth, that the notion of a “smooth function” is the same in every coordinate system. This way of defining structure through compatibility (compare vector bundles, fibre bundles and sheaves on a [manifold](/nodes/dg%3Amanifold)) is an extremely important paradigm in modern mathematics.

- The shift to the **“intrinsic viewpoint”** is an important sign of the maturity of a mathematical notion. From curves and surfaces in $\\mathbb{R}^3$ to abstract smooth manifolds, mathematics completed a liberation from “being embedded” to “existing in its own right”. This liberation allows us to talk about spacetime itself, configuration space, phase space and other more abstract objects without relying on the framework of an external $\\mathbb{R}^N$.

---

## Summary

### Idea

**“Linearise locally, and glue globally in a compatible way”** — a smooth manifold is the most natural stage on which calculus can still be done on a curved space.

### Methods

- **The chart method**: turn a problem on a [manifold](/nodes/dg%3Amanifold) into a problem in $\\mathbb{R}^n$ using local coordinates, and verify compatibility under coordinate transformations (this runs through the definitions in the “Form” part and the derivation of tangent spaces in the “Basic properties” part).
- **[Partitions of unity](/nodes/dg%3Apartition-of-unity)**: assemble locally defined functions, vector fields and metrics into global objects (used to prove the [partition of unity](/nodes/dg%3Apartition-of-unity) theorem in “Basic properties”).
- **Linearising by the tangent map**: capture the information of a smooth map near a point by the linear map $f_{*p}$, and then use the tools of linear algebra (rank, kernel, image) to infer local properties of the map (immersions, submersions, transversality and so on).
- **Equivalence classes of atlases**: equip a [manifold](/nodes/dg%3Amanifold) with a [smooth structure](/nodes/dg%3Asmooth-structure) through a maximal atlas, handling the compatibility of different atlases equivalently.

---

## Looking back and asking

1. The definition of a smooth manifold requires the Hausdorff and second countability properties. Try to construct a “locally Euclidean” but non-Hausdorff space and see at which step calculus fails.
2. Why is the atlas $\\varphi(u) = u^3$ on $\\mathbb{R}$ incompatible with the standard atlas $\\operatorname{id}(u) = u$? Do these two atlases define different differential structures on $\\mathbb{R}$? Why are they in fact diffeomorphic (that is, [homeomorphic](/nodes/dg%3Ahomeomorphism) with respect to the smooth structure)?
3. Verify that $S^n$ and $\\mathbb{R}P^n$ really are smooth manifolds. Try to write down their charts and coordinate transformation formulae.
4. Where exactly is second countability used in the proof of the [partition of unity](/nodes/dg%3Apartition-of-unity)?
5. Why do “exotic” [smooth structures](/nodes/dg%3Asmooth-structure) exist on $\\mathbb{R}^4$ but not on $\\mathbb{R}^n$ of other dimensions? This question is still not completely settled in differential topology; it belongs to the realm of characteristic classes and cobordism theory.`,

  'dg:smooth-embedding': `## Smooth embeddings

**Source tags.** #differential-geometry #embedding #immersion #submanifold

**Source.** The read-only snapshot \`G:/DifferentialGeometry/object/def/光滑嵌入.md\` (see \`data/dg/\`).

---

A smooth embedding is one of the most central notions of differential geometry and topology: it describes a way of “placing” one [manifold](/nodes/dg%3Amanifold) inside another [manifold](/nodes/dg%3Amanifold) while preserving its [smooth structure](/nodes/dg%3Asmooth-structure). It is stronger than an immersion—not only is the tangent map required to be injective point by point (the immersion condition), but the map itself must be injective and a [homeomorphism](/nodes/dg%3Ahomeomorphism) onto its image, so that the original [manifold](/nodes/dg%3Amanifold) can be regarded as a “regular sub[manifold](/nodes/dg%3Amanifold)” of the ambient [manifold](/nodes/dg%3Amanifold). The Whitney [embedding theorem](/nodes/dg%3Asmooth-embedding) shows that every [smooth manifold](/nodes/dg%3Asmooth-manifold) can be embedded into a Euclidean space of sufficiently high dimension, which provides abstract [manifolds](/nodes/dg%3Amanifold) with a concrete geometric realisation.

---

## Prerequisites

### Essential knowledge

- **[Topological spaces](/nodes/dg%3Atopological-space) and continuous maps**: an understanding of open sets, [homeomorphisms](/nodes/dg%3Ahomeomorphism), the subspace topology and similar basic notions.
- **The definition of a [differentiable manifold](/nodes/manifold%3Ack-atlas)**: knowing what a $C^k$ [differentiable manifold](/nodes/manifold%3Ack-atlas), a [smooth structure](/nodes/dg%3Asmooth-structure) and a local coordinate system are.
- **Tangent spaces and tangent maps**: an understanding of the tangent space $T_pM$ of a [manifold](/nodes/dg%3Amanifold) at a point, of the differential (tangent map) $f_{*p}$ of a map and of the notion of rank.

### Supporting knowledge

- **The inverse mapping theorem**: the proof of the local normal form of an immersion relies directly on the inverse mapping theorem.
- **[Partitions of unity](/nodes/dg%3Apartition-of-unity)**: in the proof of the Whitney [embedding theorem](/nodes/dg%3Asmooth-embedding), a [partition of unity](/nodes/dg%3Apartition-of-unity) is the key technique for assembling local information into a global object.

### Further knowledge

- **[Riemannian metrics](/nodes/manifold%3Achart-atlas) and isometric embeddings**: an embedding induces a pullback metric; in fact every Riemannian [manifold](/nodes/dg%3Amanifold) can be isometrically embedded into a Euclidean space of high dimension (the Nash [embedding theorem](/nodes/dg%3Asmooth-embedding)).
- **Transversality theory**: Sard's theorem together with transverse intersection can be used to prove the existence of embeddings of a [manifold](/nodes/dg%3Amanifold) into a lower-dimensional Euclidean space.

---

## Motivation

### Motivation for introducing them

- **A line of thought internal to the discipline**: in the nineteenth century Gauss discovered that the curvature of a surface depends only on the first fundamental form (intrinsic geometry), and Riemann generalised this to $n$-dimensional [manifolds](/nodes/dg%3Amanifold). But a [manifold](/nodes/dg%3Amanifold) was originally defined as an abstract object: how can we be sure that these “abstract spaces” can be placed back into the Euclidean spaces we are familiar with? The [embedding theorem](/nodes/dg%3Asmooth-embedding) answers this question—every abstract [manifold](/nodes/dg%3Amanifold) can find a “hiding place” in a Euclidean space.
- **A line of thought from external applications**: constrained systems in physics (such as the configuration space of a rigid body) are often sub[manifolds](/nodes/dg%3Amanifold) of a Euclidean space; in computer graphics, the embedding of a surface in $\\mathbb{R}^3$ is the basis of visualisation.
- **An aesthetic and structural line of thought**: the distinction between an immersion and an embedding reveals the tension between the “local” and the “global”—locally every immersion is an embedding (the local [embedding theorem](/nodes/dg%3Asmooth-embedding)), but globally self-intersections may occur. An embedding gives the most “faithful” way of placing one manifold in another.

### Motivation for the construction

The notion of a smooth embedding arose as a natural generalisation from curves and surfaces in Euclidean space. At first people studied curves and surfaces in $\\mathbb{R}^3$ (such as the circular helix and the torus); these objects are subsets of $\\mathbb{R}^3$ whose local coordinate charts are given by parametric equations. Later Weyl and Whitney made the notion of a [manifold](/nodes/dg%3Amanifold) abstract and asked the converse question: can an abstract [manifold](/nodes/dg%3Amanifold) be realised as a sub[manifold](/nodes/dg%3Amanifold) of a Euclidean space? This leads to the notion of an embedding—we need a map that preserves the [smooth structure](/nodes/dg%3Asmooth-structure) (immersivity), produces no “self-intersection” (injectivity) and also preserves the topology (the [homeomorphism](/nodes/dg%3Ahomeomorphism) property); none of the three can be dropped.

---

## Form

### The canonical general form

Let $M^m$ and $N^n$ be [smooth manifolds](/nodes/dg%3Asmooth-manifold) and let $f: M \\to N$ be a smooth map.

- **Immersion**: $\\operatorname{rank}_p f \\equiv m$ for all $\\forall p \\in M$, equivalently the tangent map $f_{*p}: T_pM \\to T_{f(p)}N$ is injective everywhere.
- **Smooth embedding**: $f$ is an injective immersion and $f$ is a [homeomorphism](/nodes/dg%3Ahomeomorphism) from $M$ onto its image $f(M)$ (equipped with the subspace topology).
- **Submersion**: $\\operatorname{rank}_p f \\equiv n$ for all $\\forall p \\in M$, equivalently the tangent map is surjective everywhere.

### Analysis of the necessary conditions

None of the three conditions in the definition of an embedding can be dropped:

1. **Dropping the “immersion” condition**: a continuous injection need not be smooth, let alone preserve the [manifold](/nodes/dg%3Amanifold) structure. For example, $f(t) = (t^3, t^{1/3})$ has insufficient rank at $0$.
2. **Dropping the “injectivity” condition**: $f: \\mathbb{R} \\to \\mathbb{R}^2$ with $f(t) = (\\cos t, \\sin t)$ is an immersion but not injective, and its image $S^1$ overlaps itself infinitely often in $\\mathbb{R}^2$.
3. **Dropping the “[homeomorphism](/nodes/dg%3Ahomeomorphism) onto the image” condition**: $f: \\mathbb{R} \\to \\mathbb{R}^2$ with $f(t) = \\left(\\frac{t^3+t}{t^4+1}, \\frac{t^3-t}{t^4+1}\\right)$ is an injective immersion but not an embedding, because its image is the lemniscate, which is compact in $\\mathbb{R}^2$, whereas $\\mathbb{R}$ itself is not compact, so $f$ is not a [homeomorphism](/nodes/dg%3Ahomeomorphism) onto its image.

### Equivalent formulations

- $f$ is a smooth embedding $\\iff$ $f$ is an injective immersion and $f$ is a proper map (for a compact [manifold](/nodes/dg%3Amanifold), an injective immersion is automatically an embedding).
- $f$ is a smooth embedding $\\iff$ $f$ is an immersion and $f$ maps $M$ [homeomorphically](/nodes/dg%3Ahomeomorphism) onto $f(M)$ (where $f(M)$ carries the subspace topology).

### Classes of forms

Embeddings form a subclass of immersions. Among embeddings one can distinguish further:

- **Embedded sub[manifold](/nodes/dg%3Amanifold)**: the inclusion map $i: M \\to N$ is an embedding; in this case the topology of $M$ equals the subspace topology induced from $N$.
- **Immersed sub[manifold](/nodes/dg%3Amanifold)**: the inclusion map $i: M \\to N$ is an immersion; in this case the topology of $M$ is in general finer than the subspace topology.
- **Proper embedding**: the inclusion map is a proper map. An embedding of a compact [manifold](/nodes/dg%3Amanifold) is automatically proper.

### How are the relevant statements expressed in natural language?

- “One [manifold](/nodes/dg%3Amanifold) is placed smoothly inside another [manifold](/nodes/dg%3Amanifold), neither shrinking nor intersecting itself”—an embedding.
- “Locally it is placed well, but globally it may loop back and touch itself”—an immersion.
- “In local coordinates the sub[manifold](/nodes/dg%3Amanifold) looks inside the ambient [manifold](/nodes/dg%3Amanifold) just like $\\mathbb{R}^m$ sitting inside $\\mathbb{R}^n$”—the slice condition for an embedded sub[manifold](/nodes/dg%3Amanifold).

### A lower-dimensional formulation

Let $f: M \\to N$ be a smooth map. Then $f$ is an embedding if and only if:

- at every point $p \\in M$ there are local coordinates in which $f$ takes the form $(x^1,\\dots,x^m) \\mapsto (x^1,\\dots,x^m,0,\\dots,0)$ (this is the local normal form of an immersion);
- and globally $f$ is injective, and the topology of $M$ equals the topology of $f(M)$ as a subspace of $N$.

### A higher-dimensional viewpoint

A smooth embedding is the strengthened version of a **topological embedding** in the smooth category. In topology an embedding is only required to be a continuous injection that is a [homeomorphism](/nodes/dg%3Ahomeomorphism) onto its image; in differential geometry we additionally require the tangent map to have full rank (that is, immersivity), in order to guarantee that the image is smooth. Moreover, in Riemannian geometry an **isometric embedding** requires in addition that the map preserve the metric, that is, $g_M = f^* g_N$.

### Objects similar to this topic, to be understood in connection with it

- **Immersion vs embedding**: locally there is no difference (an immersion is locally an embedding), but globally there is an essential difference (whether the map is injective and whether it is a [homeomorphism](/nodes/dg%3Ahomeomorphism) onto its image).
- **Topological embedding vs smooth embedding**: a topological embedding does not guarantee that the image is smooth (for example, a Peano curve is a continuous surjection but not a smooth embedding).
- **Isometric embedding vs smooth embedding**: an isometric embedding is required to preserve the [Riemannian metric](/nodes/manifold%3Achart-atlas), which is stronger than a smooth embedding; Nash's theorem guarantees that every Riemannian [manifold](/nodes/dg%3Amanifold) can be isometrically embedded into a Euclidean space of high dimension.

---

## Proof

### Proof sketch

**The local [embedding theorem](/nodes/dg%3Asmooth-embedding)** (Thm A.16, Lee): every smooth immersion is locally an embedding. This is essentially a direct corollary of the inverse mapping theorem—the Jacobi matrix of an immersion has full rank, so in suitable local coordinates the map can be brought into the normal form $(x^1,\\dots,x^m) \\mapsto (x^1,\\dots,x^m,0,\\dots,0)$, and hence is locally injective and a diffeo[homeomorphism](/nodes/dg%3Ahomeomorphism) onto its image.

**The Whitney [embedding theorem](/nodes/dg%3Asmooth-embedding) (compact case)**: every $n$-dimensional compact [smooth manifold](/nodes/dg%3Asmooth-manifold) $M$ can be embedded into $\\mathbb{R}^{2n+1}$. Idea of the proof: first cover $M$ by finitely many local coordinate neighbourhoods, use a [partition of unity](/nodes/dg%3Apartition-of-unity) to construct an injective immersion $M \\to \\mathbb{R}^{N}$ (with $N$ fairly large), and then use Sard's theorem to perform central projections repeatedly into lower dimensions, preserving immersivity or embeddability during the projection, until the dimension drops to $2n+1$ (embedding) or $2n$ (immersion); [compactness](/nodes/dg%3Acompactness) then guarantees that an injective immersion is automatically an embedding.

**Whitney's best dimension**: in 1944 Whitney further proved that every $n$-dimensional [smooth manifold](/nodes/dg%3Asmooth-manifold) can be embedded into $\\mathbb{R}^{2n}$ and immersed into $\\mathbb{R}^{2n-1}$.

---

## Applications

### Direct applications

**Example 1 (embedding of the unit circle)**: the inclusion map $i: S^1 \\to \\mathbb{R}^2$, $i(x,y) = (x,y)$, is an embedding, with $\\operatorname{rank} i \\equiv 1$.

**Example 2 (standard embedding of the torus)**: $f: T^2 = S^1 \\times S^1 \\to \\mathbb{R}^3$,
$$
f(e^{i\\theta}, e^{i\\phi}) = ((a+b\\cos\\phi)\\cos\\theta,\\; (a+b\\cos\\phi)\\sin\\theta,\\; b\\sin\\phi)
$$
is a smooth embedding whose image is the torus of revolution in $\\mathbb{R}^3$.

**Example 3 (the standard embedding)**: for $m \\le n$, the map $f: \\mathbb{R}^m \\to \\mathbb{R}^n$, $f(x^1,\\dots,x^m) = (x^1,\\dots,x^m,0,\\dots,0)$ is a smooth embedding.

**Example 4 (an immersion that is not injective)**: $f: \\mathbb{R} \\to \\mathbb{R}^2$ with $f(t) = (\\cos t, \\sin t)$ is an immersion but not an embedding, because different points of $\\mathbb{R}$ are mapped to the same point of $S^1$ (it is not injective).

**Example 5 (an injective immersion that is not an embedding)**: $f: \\mathbb{R} \\to \\mathbb{R}^2$ with
$$
f(t)=\\left(\\frac{t^3+t}{t^4+1},\\frac{t^3-t}{t^4+1}\\right)
$$
is an injective immersion but not an embedding, because its image, the lemniscate $(x^2+y^2)^2 = x^2 - y^2$, is a compact subset of $\\mathbb{R}^2$, whereas $\\mathbb{R}$ is not compact, so $f$ is not a [homeomorphism](/nodes/dg%3Ahomeomorphism) onto its image.

### Indirect applications

- **Geometry of sub[manifolds](/nodes/dg%3Amanifold)**: embeddings are used to define an induced [Riemannian metric](/nodes/manifold%3Achart-atlas) on the ambient [manifold](/nodes/dg%3Amanifold) by pullback, so as to study geometric quantities of the sub[manifold](/nodes/dg%3Amanifold) such as its curvature and mean curvature.
- **The Gauss–Bonnet–Chern formula**: the early proofs relied on techniques for embedding a [manifold](/nodes/dg%3Amanifold) into a Euclidean space (an intrinsic proof was later given by Chern).
- **Physics and engineering**: the configuration space $SO(3)$ of a rigid body can be embedded into $\\mathbb{R}^9$; in robotics, the configuration space of a manipulator is often a sub[manifold](/nodes/dg%3Amanifold) of a Euclidean space.

---

## Generalisations

- **Improvements of the Whitney [embedding theorem](/nodes/dg%3Asmooth-embedding)**: every $n$-dimensional [smooth manifold](/nodes/dg%3Asmooth-manifold) can be embedded into $\\mathbb{R}^{2n}$ and immersed into $\\mathbb{R}^{2n-1}$. It is conjectured that an $n$-dimensional [manifold](/nodes/dg%3Amanifold) can be embedded into $\\mathbb{R}^{2n-\\alpha(n)+1}$ (where $\\alpha(n)$ is the number of $1$s in the binary expansion of $n$); the conjecture concerning the immersion part was proved correct by Cohen (1982), while the embedding part remains unsolved to this day.
- **The Nash isometric [embedding theorem](/nodes/dg%3Asmooth-embedding)**: every Riemannian [manifold](/nodes/dg%3Amanifold) can be isometrically embedded into a Euclidean space of high dimension.
- **Embeddings of complex [manifolds](/nodes/dg%3Amanifold)**: the problem of embedding a complex [manifold](/nodes/dg%3Amanifold) in a complex Euclidean space is more complicated and involves the Kodaira [embedding theorem](/nodes/dg%3Asmooth-embedding) and others.

---

## Common misconceptions

**Misconception 1**: “an immersion is necessarily an embedding”. Correction: an immersion only guarantees local injectivity; globally it may intersect itself (such as the figure-eight curve from $\\mathbb{R}$ into $\\mathbb{R}^2$).

**Misconception 2**: “an injective immersion is necessarily an embedding”. Correction: one also needs the topology of the image to agree with the topology of the original [manifold](/nodes/dg%3Amanifold) (that is, $f$ must be a [homeomorphism](/nodes/dg%3Ahomeomorphism) onto its image). The lemniscate example shows that an injective immersion need not be an embedding.

**Misconception 3**: “the topology of an embedded sub[manifold](/nodes/dg%3Amanifold) is necessarily the subspace topology”. Correction: that is exactly the definition of an embedded sub[manifold](/nodes/dg%3Amanifold); but for an immersed sub[manifold](/nodes/dg%3Amanifold) the topology is in general finer than the subspace topology.

**Misconception 4**: “every [smooth manifold](/nodes/dg%3Asmooth-manifold) can be embedded into $\\mathbb{R}^3$”. Correction: for example the real projective plane $\\mathbb{RP}^2$ cannot be embedded into $\\mathbb{R}^3$ (it needs $\\mathbb{R}^5$), and the Klein bottle cannot be embedded into $\\mathbb{R}^3$ either (it can only be immersed).

---

## Insights

- **“Locally easy, globally hard”**: the local normal form of an immersion shows that locally every immersion looks like the standard embedding, but global properties (injectivity, [compactness](/nodes/dg%3Acompactness) of the image) decide whether an immersion can become an embedding. This is a typical manifestation of the “tension between the local and the global” in differential geometry.
- **“Attacking a high-dimensional problem from below”**: Whitney used Sard's theorem to reduce the dimension by repeated projection—a geometric object is easy to place in a high-dimensional space, but placing it into the lowest possible dimension without destroying its structure requires an ingenious construction.
- **“Embedding = immersion + topological compatibility”**: injectivity together with a full-rank tangent map is still not enough; one must also require the topology of the original [manifold](/nodes/dg%3Amanifold) to agree with the subspace topology of its image. Beginners very easily overlook this subtle condition.

---

## Summary

### The idea

“Put one [manifold](/nodes/dg%3Amanifold) faithfully inside another [manifold](/nodes/dg%3Amanifold)”—faithfully means that the [smooth structure](/nodes/dg%3Asmooth-structure), the one-to-one correspondence of points and the topological structure are all preserved at the same time.

### Methods

- **The inverse mapping theorem**: prove the local normal form of an immersion, and thereby obtain the local [embedding theorem](/nodes/dg%3Asmooth-embedding).
- **[Partitions of unity](/nodes/dg%3Apartition-of-unity)**: assemble local coordinate information into a global map, used to construct embeddings.
- **Sard's theorem + central projection**: lower the codimension of an embedding and prove the Whitney [embedding theorem](/nodes/dg%3Asmooth-embedding).
- **[Compactness](/nodes/dg%3Acompactness) arguments**: an injective immersion of a compact [manifold](/nodes/dg%3Amanifold) is necessarily an embedding (because a continuous bijection from a compact space to a Hausdorff space is a [homeomorphism](/nodes/dg%3Ahomeomorphism)).

---

## Looking back and asking

1. Why is the figure-eight immersion of $S^1$ into $\\mathbb{R}^2$ not an embedding? How does the subspace topology induced on its image from $\\mathbb{R}^2$ differ from the topology of the original [manifold](/nodes/dg%3Amanifold) $S^1$?
2. Can one construct an example of an injective immersion from a non-compact [manifold](/nodes/dg%3Amanifold) into a Euclidean space that is not an embedding?
3. Why can $\\mathbb{RP}^2$ not be embedded into $\\mathbb{R}^3$? Which topological tools are needed for the proof?
4. In the Whitney [embedding theorem](/nodes/dg%3Asmooth-embedding), how is the optimality of the dimension $2n$ proved?

---

## References

1. \`梅加强. 流形与几何初步.\` (Mei Jiaqiang, *Manifolds and Introductory Geometry*). Chapter 1. Definition 1.2.2 (immersion, embedding, submersion), Examples 1.2.2–1.2.7, Theorem 1.2.2 (local normal form of an immersion), Corollary 1.2.3, Lemma 1.2.6, Theorem 1.2.7 (structure of an embedded submanifold), Theorem 1.3.4 (the Whitney embedding theorem), Theorem 1.5.6, and the remark on Whitney's best dimension.
2. John M. Lee. *Introduction to Riemannian Manifolds*, Second Edition. Appendix A, Theorem A.16 (the local embedding theorem); definitions: smooth embedding, immersed/embedded submanifold.
3. \`А. С. 米先柯, А. Т. 福明柯. 微分几何与拓扑学简明教程.\` (A. S. Mishchenko, A. T. Fomenko, *A Concise Course in Differential Geometry and Topology*). Section 3.4.3: embedding of a manifold in a Euclidean space (Whitney's weak theorem); the Riemannian metric induced by an embedding; exercises.
4. \`贝尔热, 戈斯丢. 微分几何 流形 曲线和曲面, 第二版修订本.\` (Berger, Gostiaux, *Differential Geometry: Manifolds, Curves and Surfaces*, second revised edition). Section 2.6: definitions of and comments on submanifolds, immersions, submersions and embeddings (Definition 2.6.1).
5. B. A. Dubrovin, S. P. Novikov, A. T. Fomenko. *Modern Geometry — Methods and Applications, Part II*. §9: definitions of immersions and embeddings; the theorem on embedding a compact manifold in a Euclidean space.
6. \`包志强. 点集拓扑与代数拓扑引论.\` (Bao Zhiqiang, *Introduction to Point-Set Topology and Algebraic Topology*). Definition 1.6.2 (topological embedding), Example 6 (the standard embedding $\\mathbb{E}^m \\to \\mathbb{E}^n$).`,

  'dg:smooth-distribution': `## Smooth tangent distributions

> A smooth tangent distribution is a subbundle of the [tangent bundle](/nodes/dg%3Atangent-bundle) — at each point of a [manifold](/nodes/dg%3Amanifold) a tangent subspace is assigned smoothly. The Frobenius theorem gives the necessary and sufficient condition for it to be integrable, and is the model example in differential geometry of “turning the infinitesimal into the global”.

**Source.** The read-only snapshot \`G:/DifferentialGeometry/object/def/光滑切分布.md\` (see \`data/dg/\`).

---

**tags:** #differential-geometry #calculus-on-manifolds #distribution #theorem #integrability #Frobenius-theorem

---

### Prerequisites

#### Essential

- **[Smooth manifolds](/nodes/dg%3Asmooth-manifold)**: a Hausdorff, second countable [topological space](/nodes/dg%3Atopological-space) with a [smooth atlas](/nodes/dg%3Asmooth-atlas), whose coordinate transition maps are $C^\\infty$.
- **Tangent spaces and tangent vectors**: the tangent space $T_pM$ of a [manifold](/nodes/dg%3Amanifold) $M$ at a point $p$ is an $n$-dimensional linear space built from equivalence classes of smooth curves through $p$.
- **[Tangent bundle](/nodes/dg%3Atangent-bundle)**: $TM = \\bigsqcup_{p\\in M} T_pM$ is a $2n$-dimensional [smooth manifold](/nodes/dg%3Asmooth-manifold) with projection $\\pi:TM\\to M$. The [tangent bundle](/nodes/dg%3Atangent-bundle) is a vector bundle of rank $\\dim M$.
- **[Smooth vector fields](/nodes/dg%3Asmooth-vector-field)**: smooth maps $X:M\\to TM$ satisfying $\\pi\\circ X = \\mathrm{id}_M$. In local coordinates $X(p)=\\sum a^i(p)\\frac{\\partial}{\\partial x^i}\\big|_p$.
- **The Lie bracket**: $[X,Y]f = X(Yf)-Y(Xf)$. In local coordinates $[X,Y] = \\sum_{i,j}\\left(X^j\\frac{\\partial Y^i}{\\partial x^j} - Y^j\\frac{\\partial X^i}{\\partial x^j}\\right)\\frac{\\partial}{\\partial x^i}$. It is bilinear, antisymmetric and satisfies the Jacobi identity.

#### Supporting

- **Vector bundles and subbundles**: a subbundle $F\\subset E$ of a vector bundle $E\\to M$ is a regular sub[manifold](/nodes/dg%3Amanifold) of $E$ whose local trivialisations satisfy $\\psi(\\pi^{-1}(U)\\cap F)=U\\times\\mathbb{R}^l$. A subbundle of the [tangent bundle](/nodes/dg%3Atangent-bundle) is exactly a distribution.
- **Immersions and integral curves**: an integral curve $\\sigma$ of a vector field $X$ satisfies $\\sigma'(t)=X_{\\sigma(t)}$; the theory of ordinary differential equations gives local existence and uniqueness.
- **[Differential forms](/nodes/dg%3Adifferential-form) and the exterior derivative**: a 1-form is a section of the cotangent bundle, and the exterior derivative $d$ takes $k$-forms to $(k+1)$-forms.

#### Further

- **Foliations**: the maximal integral [manifolds](/nodes/dg%3Amanifold) of an involutive distribution form a foliation of $M$.
- **Lie groups and Lie algebras**: the left-invariant vector fields corresponding to a Lie subalgebra generate an involutive distribution, and the Frobenius theorem guarantees the existence of the connected Lie subgroup.
- **Pfaffian systems**: the Frobenius condition $d\\omega^\\alpha \\equiv 0 \\pmod{\\omega^1,\\dots,\\omega^r}$ is equivalent to the involutivity of the distribution.

---

### Motivation

#### Motivation for introducing it

##### A thread internal to the discipline

After studying the integral curves of a single vector field on a [manifold](/nodes/dg%3Amanifold), it is natural to ask: if at every point one specifies a $k$-dimensional tangent subspace (rather than a single line), can one find a $k$-dimensional sub[manifold](/nodes/dg%3Amanifold) through each point whose tangent space is exactly that subspace? This leads to the notions of a distribution and of an integral [manifold](/nodes/dg%3Amanifold).

At the same time, the [tangent bundle](/nodes/dg%3Atangent-bundle) is the most important vector bundle over a [manifold](/nodes/dg%3Amanifold), so its subbundles are naturally objects of study. Many geometric problems need not a single direction but a family of directions — the vertical and horizontal distributions of a Riemannian submersion, or a connection on a principal bundle, for instance. This requires generalising “vector field” to “distribution”.

##### A thread from outside

- **PDE theory**: the integrability condition for a first-order overdetermined system of partial differential equations (a Pfaffian system) is exactly the Frobenius condition.
- **Analytical mechanics**: the distinction between holonomic and non-holonomic constraints corresponds to the integrability of the constraint distribution.
- **Control theory**: the reachable distribution of a system determines whether the system can move from one point to another.

##### An aesthetic / structural thread

A “distribution” is a subbundle of the [tangent bundle](/nodes/dg%3Atangent-bundle), and an “involutive distribution” is a subbundle closed under the Lie bracket. The Frobenius theorem reveals in a most elegant way that **an infinitesimal condition (involutivity) and a geometric conclusion (the existence of integral [manifolds](/nodes/dg%3Amanifold)) are equivalent**. This is the classical presentation of the central theme of differential geometry: “turning the infinitesimal into the global”.

#### Motivation for the construction: one concrete example throughout

**The seed — the integral curves of a single vector field (rank 1)**

Consider the vector field $X = \\dfrac{\\partial}{\\partial x}$ on $\\mathbb{R}^3$. Through each point, $\\mathrm{span}\\{X\\}$ determines a one-dimensional tangent subspace. The integral curve through the point $(x_0,y_0,z_0)$ is $t\\mapsto (x_0+t,y_0,z_0)$. A rank-1 distribution is always integrable, because $[X,X]=0$.

**Development — two commuting vector fields (rank 2, integrable)**

Consider $X=\\dfrac{\\partial}{\\partial x},\\;Y=\\dfrac{\\partial}{\\partial y}$ on $\\mathbb{R}^3$. They are everywhere linearly independent and span a rank-2 distribution $\\mathcal{D}$. Since $[X,Y]=0$, involutivity holds. The integral [manifolds](/nodes/dg%3Amanifold) of $\\mathcal{D}$ are the horizontal planes $z=$ constant — the two-dimensional sub[manifold](/nodes/dg%3Amanifold) through each point has exactly $\\mathcal{D}$ as its tangent space.

**Conflict — two non-commuting vector fields (rank 2, not integrable)**

Now take $X=\\dfrac{\\partial}{\\partial x},\\;Y=\\dfrac{\\partial}{\\partial y}+x\\dfrac{\\partial}{\\partial z}$. A computation gives $[X,Y]=\\dfrac{\\partial}{\\partial z}\\notin\\mathrm{span}\\{X,Y\\}$, so $\\mathcal{D}$ is not involutive. Intuitively, if going first along $X$ and then along $Y$ lands at a point whose $z$-coordinate differs from going first along $Y$ and then along $X$, this “discrepancy” has escaped the two-dimensional subspace, and hence no two-dimensional surface can be assembled. This is the classical non-holonomic constraint (a rolling coin, for instance).

**Canonical form — the axiomatised theory of distributions**

The general definition is abstracted from these concrete examples: a distribution assigns a tangent subspace at each point, varying smoothly; involutivity captures “the bracket does not escape the subspace”; and the Frobenius theorem supplies the general criterion.

---

### Form

#### Canonical general form

**Definition (distribution)** Let $M$ be an $n$-dimensional [differentiable manifold](/nodes/manifold%3Ack-atlas). A **distribution** $\\mathcal{D}$ on $M$ is a map assigning to each point $p\\in M$ a $k$-dimensional linear subspace $\\mathcal{D}(p)$ of $T_pM$; $k$ is called the **rank** of the distribution. If for every $p\\in M$ there is an open neighbourhood $U$ of $p$ and [smooth vector fields](/nodes/dg%3Asmooth-vector-field) $X_1,\\dots,X_k$ on $U$ such that $\\mathcal{D}(q)$ is spanned by $X_1(q),\\dots,X_k(q)$, $\\forall q\\in U$, then $\\mathcal{D}$ is called a **smooth distribution**.

**Definition (belonging to a distribution)** Let $\\mathcal{D}$ be a smooth distribution and $X$ a [smooth vector field](/nodes/dg%3Asmooth-vector-field). If $X(p)\\in\\mathcal{D}(p)$, $\\forall p\\in M$, then $X$ is said to **belong to** $\\mathcal{D}$, written $X\\in\\mathcal{D}$.

**Definition (involutive distribution)** If $[X,Y]\\in\\mathcal{D}$ for all $X,Y\\in\\mathcal{D}$, then $\\mathcal{D}$ is called an **involutive** distribution, or an **integrable distribution**.

**Definition (integral [manifold](/nodes/dg%3Amanifold))** Let $i:N\\to M$ be an injective immersion and $\\mathcal{D}$ a smooth distribution. If $i_{*p}(T_pN)=\\mathcal{D}(i(p))$, $\\forall p\\in N$, then $(N,i)$ is called an **integral [manifold](/nodes/dg%3Amanifold)** of $\\mathcal{D}$.

**The subbundle viewpoint** A subbundle of the [tangent bundle](/nodes/dg%3Atangent-bundle) $TM$ is called a distribution on $M$. This viewpoint places distributions inside vector bundle theory, so that tools such as subbundles, quotient bundles and exact sequences can be used directly.

#### Analysis of the necessary conditions — each hypothesis of the Frobenius theorem

**Hypothesis of the Frobenius theorem**: $\\mathcal{D}$ is a **smooth involutive distribution** of rank $k$ on $M$.

**Conclusion**: there exists a $k$-dimensional integral [manifold](/nodes/dg%3Amanifold) (a local coordinate slice) through every point.

Each hypothesis is analysed below: what happens to the conclusion if it is missing.

---

**Condition 1: $\\mathcal{D}$ must be smooth (locally spanned by [smooth vector fields](/nodes/dg%3Asmooth-vector-field))**

- **Counterexample**: on $\\mathbb{R}^2$ define $\\mathcal{D}(0)=0$ (zero-dimensional) and, for $p\\neq0$, $\\mathcal{D}(p)=\\mathrm{span}\\{\\partial/\\partial x\\}$. This distribution has rank 0 at the origin and rank 1 elsewhere, so it is not smooth (the rank is discontinuous, and there is no [smooth vector field](/nodes/dg%3Asmooth-vector-field) spanning it near the origin). There is no 1-dimensional integral [manifold](/nodes/dg%3Amanifold) through the origin — if there were, its tangent space at the origin would have to be $\\mathcal{D}(0)=0$, but a 1-dimensional sub[manifold](/nodes/dg%3Amanifold) has tangent space of dimension at least 1 at every point, a contradiction.
- **Explanation**: smoothness guarantees the smooth dependence of the local frame and is the premise for solving the PDE in the proof of the Frobenius theorem. A non-constant rank amounts to “the distribution has singularities”, and the existence of integral [manifolds](/nodes/dg%3Amanifold) at singularities requires extra analysis (the theory of singular distributions).

**Condition 2: the rank of $\\mathcal{D}$ must be the constant $k$**

- **Counterexample**: the same example as above. The rank “collapses” to 0 at the origin. The conclusion collapses for the same reason — the dimension of an integral [manifold](/nodes/dg%3Amanifold) must equal the rank of the distribution everywhere, and with non-constant rank no sub[manifold](/nodes/dg%3Amanifold) of a consistent dimension can be found.
- **Explanation**: constant rank is the premise for “a distribution is a subbundle of the [tangent bundle](/nodes/dg%3Atangent-bundle)” (the rank of a subbundle should be constant). A non-constant-rank distribution is called a **singular distribution**, and needs the Stefan–Sussman theorem for its generalisation.

**Condition 3: $\\mathcal{D}$ must be involutive ($[X,Y]\\in\\mathcal{D}$)**

- **Counterexample**: in $\\mathbb{R}^3$ take $X=\\partial/\\partial x,\\;Y=\\partial/\\partial y + x\\partial/\\partial z$ and $\\mathcal{D}=\\mathrm{span}\\{X,Y\\}$. Then $[X,Y]=\\partial/\\partial z\\notin\\mathcal{D}$. This distribution is smooth of constant rank 2 but not involutive. The conclusion of the Frobenius theorem fails: there is no two-dimensional integral [manifold](/nodes/dg%3Amanifold) through an arbitrary point.
- **Geometric intuition**: going along $X$ by $\\Delta x$ and then along $Y$ by $\\Delta y$, versus going along $Y$ by $\\Delta y$ and then along $X$ by $\\Delta x$, gives endpoints whose $z$-coordinates differ by $\\Delta x\\Delta y$. This “gap” measures the failure of involutivity. If $\\mathcal{D}$ were integrable, the two paths would have to lie in the same integral [manifold](/nodes/dg%3Amanifold) and the endpoints would have to coincide; the actual discrepancy shows that no such two-dimensional surface exists.
- **Explanation**: involutivity is the most central hypothesis of the Frobenius theorem; it is precisely the exact algebraic formulation of the “infinitesimal integrability condition”.

---

#### Equivalent expressions

1. **The subbundle language**: $\\mathcal{D}\\subset TM$ is a vector subbundle, and involutivity is equivalent to the space of sections of $\\mathcal{D}$ being closed under the Lie bracket.
2. **The language of Pfaffian systems**: let $\\omega^1,\\dots,\\omega^{n-k}$ be 1-forms defining $\\mathcal{D}$ locally (that is, $\\mathcal{D}=\\bigcap_{\\alpha}\\ker\\omega^\\alpha$); then $\\mathcal{D}$ is involutive if and only if there exist local 1-forms $\\omega^\\beta_\\alpha$ with $d\\omega^\\alpha = \\sum_\\beta \\omega^\\beta_\\alpha\\wedge\\omega^\\beta$. This is called the **Frobenius condition**.
3. **The dual language**: the dual of $\\mathcal{D}$ is the subbundle $\\mathrm{Ann}(\\mathcal{D})$ of the cotangent bundle (the annihilator bundle); involutivity is equivalent to $\\mathrm{Ann}(\\mathcal{D})$ being closed under the exterior derivative $d$ (modulo the exterior ideal it generates).

#### Kinds of distributions

- **Classified by rank**: a rank-1 distribution is generated by a single vector field (away from its zeros) and is always involutive ($[X,X]=0$); for rank $k>1$ involutivity is non-trivial.
- **Classified by integrability**:
  - **Involutive distributions (integrable distributions)**: they satisfy the Frobenius condition and admit a foliation by integral [manifolds](/nodes/dg%3Amanifold).
  - **Non-involutive distributions**: not integrable, with no integral [manifolds](/nodes/dg%3Amanifold).
- **Classified by global properties**: on a parallelisable [manifold](/nodes/dg%3Amanifold) one can define a global, everywhere linearly independent frame.

#### How are the relevant statements expressed in natural language?

- **“Distribution”**: at each point of a [manifold](/nodes/dg%3Amanifold) choose a tangent subspace, varying smoothly as the point moves.
- **“Smooth distribution”**: locally it can be spanned by finitely many [smooth vector fields](/nodes/dg%3Asmooth-vector-field).
- **“The vector field $X$ belongs to the distribution $\\mathcal{D}$”**: the value of $X$ at every point lies in the subspace specified by $\\mathcal{D}$.
- **“Involutive distribution”**: take any two vector fields from the distribution; their Lie bracket still lies in the distribution — “the discrepancy between travelling in two directions does not escape the subspace”.
- **“Integral [manifold](/nodes/dg%3Amanifold)”**: a sub[manifold](/nodes/dg%3Amanifold) whose tangent space at each point is exactly the subspace specified by the distribution at that point.
- **“Frobenius theorem”**: a distribution can be assembled locally into sub[manifolds](/nodes/dg%3Amanifold) if and only if it is involutive. In plain words: **“if the bracket does not escape, the pieces can be glued together into a surface.”**

#### Reduction

A distribution $\\mathcal{D}$ is a field of linear subspaces, one at each point. In set-theoretic language, $\\mathcal{D}:M\\to\\bigsqcup_{p\\in M}\\mathrm{Gr}_k(T_pM)$ is a section. In categorical language, a distribution is a subobject of the [tangent bundle](/nodes/dg%3Atangent-bundle), and an involutive distribution is a sub-Lie-algebra object (its sections are closed under the Lie bracket).

#### Lifting

- **Foliations**: the maximal integral [manifolds](/nodes/dg%3Amanifold) of an involutive distribution form a $k$-dimensional foliation of $M$. The Frobenius theorem guarantees the local triviality of the foliation (foliation charts).
- **A bridge between Lie groups and Lie algebras**: a Lie subalgebra $\\mathfrak{h}$ of a Lie algebra $\\mathfrak{g}$ generates an involutive distribution on $G$ through left-invariant vector fields, and its maximal integral [manifolds](/nodes/dg%3Amanifold) are exactly the corresponding connected Lie subgroups.
- **Connection theory**: an Ehresmann connection on a principal bundle is a horizontal distribution; if that distribution is involutive the connection is flat — the Frobenius theorem gives the classification of flat connections.

#### Understanding through links

The relation between distributions and vector fields is analogous to the relation between “subspaces” and “vectors” — a vector field is the special case of a rank-1 distribution, and its integral curves are the rank-1 integral [manifolds](/nodes/dg%3Amanifold). Involutivity is the generalisation of closure under the Lie bracket. The Frobenius theorem forms deep links with “reachability” in control theory, with “integrability conditions” in analysis, and with “foliations” in geometry. Moreover, the Pfaffian form of the Frobenius theorem turns the involutivity of a distribution into a condition on the exterior derivative, which has a natural connection with [de Rham cohomology](/nodes/dg%3Apoincare-lemma).

---

### Proof

#### Proof sketch

**The core idea**: “adjust” the frame of an involutive distribution into a family of commuting vector fields (with pairwise vanishing Lie brackets), and then use the fact that a bracket-free frame can be made into coordinates to obtain the integral coordinate slices directly.

**In one sentence**: involutive → the basis can be adjusted so that the new basis has vanishing brackets → a bracket-free frame coincides with the coordinate vector fields → the coordinate slices are the integral [manifolds](/nodes/dg%3Amanifold).

#### Detailed proof (the vector-field method)

**Lemma 1** Let $Y_1,\\dots,Y_k$ be [smooth vector fields](/nodes/dg%3Asmooth-vector-field) on $M$ that are linearly independent at $p$ and satisfy $[Y_i,Y_j]=0$, $\\forall i,j$. Then there is a local coordinate system $(U,\\varphi)$ near $p$ with $Y_i|_U=\\partial/\\partial\\varphi^i$ ($i=1,\\dots,k$).

> **Idea of the proof of the lemma**: take local coordinates $(x^1,\\dots,x^n)$ near $p$ and write $Y_i$ as $Y_i=\\sum_j a_i^j\\partial/\\partial x^j$. Consider the local one-parameter transformation groups $\\varphi_i^{t_i}$ generated by the $Y_i$. Since $[Y_i,Y_j]=0$, these flows commute, and one can define $\\varphi(t_1,\\dots,t_k,x^{k+1},\\dots,x^n)=\\varphi_1^{t_1}\\circ\\cdots\\circ\\varphi_k^{t_k}(0,\\dots,0,x^{k+1},\\dots,x^n)$. By the inverse mapping theorem, $\\varphi$ gives the required local coordinate system.

**Theorem (Frobenius)** Let $\\mathcal{D}$ be an involutive distribution of rank $k$ on $M$. Then for every $p\\in M$ there is a local coordinate system $(V,\\psi)$ near $p$ (with coordinate functions $y^1,\\dots,y^n$) such that the coordinate slices
$$
\\{q\\in V\\mid y^l(q)=c_l,\\;c_l\\text{ constant},\\;l=k+1,\\dots,n\\}
$$
are all integral [manifolds](/nodes/dg%3Amanifold) of $\\mathcal{D}$.

> **Proof**:
> 
> **Step 1 (take a local frame)**: take a neighbourhood $U$ of $p$ and a local frame $X_1,\\dots,X_k$ of $\\mathcal{D}$ on $U$ (everywhere linearly independent on $U$ and spanning $\\mathcal{D}$). By involutivity, $[X_i,X_j]=\\sum_{l=1}^k c_{ij}^l X_l$.
> 
> Add $n-k$ vector fields $X_{k+1},\\dots,X_n$ so that $\\{X_1,\\dots,X_n\\}$ is a local frame on $U$.
> 
> **Step 2 (adjust the basis to kill the brackets)**: construct
> $$
> Y_i = X_i + \\sum_{\\alpha=k+1}^n \\lambda_i^\\alpha X_\\alpha,\\quad i=1,\\dots,k,
> $$
> choosing the $\\lambda_i^\\alpha$ so that $[Y_i,Y_j]=0$. From the involutivity condition $[X_i,X_j]\\in\\mathcal{D}$ it follows that the $\\lambda_i^\\alpha$ must satisfy a first-order linear system of PDEs, whose solvability is guaranteed precisely by that involutivity (that is, by the compatibility conditions satisfied by the $c_{ij}^l$). Having solved for the $\\lambda_i^\\alpha$, the fields $Y_1,\\dots,Y_k$ still span $\\mathcal{D}$ and satisfy $[Y_i,Y_j]=0$.
> 
> **Step 3 (apply the lemma)**: apply Lemma 1 to $Y_1,\\dots,Y_k$ to obtain a local coordinate system $(V,\\psi)$ near $p$ (with coordinate functions $y^1,\\dots,y^n$) such that
> $$
> Y_i = \\frac{\\partial}{\\partial y^i},\\quad 1\\le i\\le k.
> $$
> 
> **Step 4 (verify that the coordinate slices are integral [manifolds](/nodes/dg%3Amanifold))**: on the coordinate slice $\\{y^{k+1}=c_{k+1},\\dots,y^n=c_n\\}$ the tangent space is spanned by $\\partial/\\partial y^1,\\dots,\\partial/\\partial y^k$, that is, it equals $\\mathcal{D}$; hence these coordinate slices are all integral [manifolds](/nodes/dg%3Amanifold) of $\\mathcal{D}$.
> 
> **The uniqueness part**: if $(N,i)$ is a connected integral [manifold](/nodes/dg%3Amanifold) of $\\mathcal{D}$ with $i(N)\\subset V$, consider the composite map $\\pi\\circ\\psi\\circ i:N\\to\\mathbb{R}^{n-k}$; its tangent map is zero, and since $N$ is connected the map is constant, so $i(N)$ lies in one of the coordinate slices. □

#### A second method: the Pfaffian-system method

**Theorem (the Pfaffian form of the Frobenius theorem)** Let $\\omega^1,\\dots,\\omega^r$ be linearly independent 1-forms on an open set $D$ of $M$ and let $\\mathcal{D}=\\bigcap_{\\alpha=1}^r\\ker\\omega^\\alpha$. If there exist local 1-forms $\\omega^\\beta_\\alpha$ such that
$$
d\\omega^\\alpha = \\sum_{\\beta=1}^r \\omega^\\beta_\\alpha\\wedge\\omega^\\beta,\\quad 1\\le\\alpha\\le r,
$$
then for every $p\\in D$ there is an $n-r$-dimensional surface near $p$ on which the restrictions of $\\omega^1,\\dots,\\omega^r$ vanish identically — that is, the surface is an integral [manifold](/nodes/dg%3Amanifold) of $\\mathcal{D}$.

> **Idea of the proof**: by a non-degenerate linear change of variables bring the $\\omega^\\alpha$ into the normal form $\\bar\\omega^\\alpha = dx^\\alpha + \\sum_{\\eta=r+1}^n c^\\alpha_\\eta dx^\\eta$; the Frobenius condition becomes the integrability condition satisfied by the $c^\\alpha_\\eta$ (namely $\\partial c^\\alpha_\\eta/\\partial x^\\beta = \\partial c^\\alpha_\\beta/\\partial x^\\eta$ and so on), so that the system of partial differential equations $\\partial f^\\alpha/\\partial x^\\eta = -c^\\alpha_\\eta(f^1,\\dots,f^r,x^{r+1},\\dots,x^n)$ has a solution, and its solution $x^\\alpha=f^\\alpha(x^{r+1},\\dots,x^n)$ gives the required integral surface.

---

### Applications

#### Direct applications

**Example 1 (a rank-1 distribution is automatically integrable)**
A single [smooth vector field](/nodes/dg%3Asmooth-vector-field) $X$ (away from its zeros) generates a rank-1 distribution. Since $[X,X]=0$, involutivity holds automatically, and the Frobenius theorem degenerates into the existence and uniqueness theorem for integral curves.
> **“How the new tool relieves an old pain”**: previously one could only solve the ODE curve by curve; the Frobenius theorem tells us that the rank-1 case is a special case of the general rank-$k$ theory and needs no separate treatment.

**Example 2 (deciding whether a distribution in $\\mathbb{R}^3$ is integrable)**
The distribution $\\mathcal{D}_1=\\mathrm{span}\\{\\partial/\\partial x,\\partial/\\partial y\\}$ has $[\\partial/\\partial x,\\partial/\\partial y]=0$ and is integrable. Its integral [manifolds](/nodes/dg%3Amanifold) are the planes $z=\\text{const}$.
The distribution $\\mathcal{D}_2=\\mathrm{span}\\{\\partial/\\partial x,\\partial/\\partial y+x\\partial/\\partial z\\}$ has $[\\partial/\\partial x,\\partial/\\partial y+x\\partial/\\partial z]=\\partial/\\partial z\\notin\\mathcal{D}_2$ and is not integrable.
> **“How the new tool relieves an old pain”**: there is no need to guess whether a two-dimensional surface exists; computing the Lie bracket decides it at once — a geometric question is turned into an algebraic computation.

**Example 3 (existence of Lie subgroups — Proposition 2.2.5)**
Let $\\mathfrak{g}$ be the Lie algebra of a Lie group $G$ and $\\mathfrak{h}\\subset\\mathfrak{g}$ a Lie subalgebra. Take a basis $X_1,\\dots,X_k$ of $\\mathfrak{h}$ and extend it to left-invariant vector fields on $G$; these span a distribution $\\mathcal{D}$. Since $\\mathfrak{h}$ is a subalgebra, $[X_i,X_j]\\in\\mathfrak{h}$, so $\\mathcal{D}$ is involutive. The maximal integral [manifold](/nodes/dg%3Amanifold) $(H,\\varphi)$ through the identity $e$ is invariant under left translations, and one shows that $\\varphi(H)$ is a connected Lie subgroup of $G$ with $\\varphi_{*e}(T_eH)=\\mathfrak{h}$.
> **“How the new tool relieves an old pain”**: previously the subgroup had to be constructed explicitly; now the Frobenius theorem “integrates” the existence of the subgroup automatically, and uniqueness is guaranteed by the uniqueness of the integral [manifold](/nodes/dg%3Amanifold).

#### Indirect applications

- **Partial differential equations**: whether an overdetermined PDE system has a solution is equivalent to whether the corresponding Pfaffian system satisfies the Frobenius condition.
- **Riemannian geometry**: the horizontal distribution of a Riemannian submersion is in general not integrable, and the degree of its non-integrability is measured by curvature.
- **Connections on principal bundles**: an Ehresmann connection is a horizontal distribution, and its integrability is equivalent to the flatness of the connection; the Frobenius theorem gives the classification of all flat connections.
- **Analytical mechanics**: a constraint distribution is integrable $\\iff$ the constraint is holonomic (describable by generalised coordinates).

---

### Generalizations

- **Relaxing the hypotheses**: the Frobenius theorem generalises to distributions of class $C^r$ ($r\\ge1$) with the same conclusion. There is a similar result for real analytic distributions.
- **Generalising the conclusion**:
  - **The Stefan–Sussman theorem**: for a singular distribution of non-constant rank, if it is closed under a generalised Lie bracket then there exists a maximal integral sub[manifold](/nodes/dg%3Amanifold) through every point.
  - **The global theory of foliations**: an involutive distribution gives a foliation of $M$; the Reeb stability theorem and the classification of foliations are important topics in differential topology.
- **Open problems**:
  - the existence of integral [manifolds](/nodes/dg%3Amanifold) for real analytic or smooth singular distributions (can the necessary and sufficient condition given by Stefan–Sussman also serve as the foundation of a geometric tool?);
  - how to understand the integrability of distributions in the framework of non-commutative geometry.

---

### Common misconceptions

- **“A distribution is just a collection of vector fields”**
  Not quite. A distribution is a subspace at each point; a smooth distribution has to be locally spanned by [smooth vector fields](/nodes/dg%3Asmooth-vector-field), but different collections of vector fields may generate the same distribution.

- **“Involutivity only needs to be checked on a frame of vector fields”**
  This **is correct** — if $[X_i,X_j]\\in\\mathcal{D}$ for a basis $X_i$ spanning $\\mathcal{D}$, then $[X,Y]\\in\\mathcal{D}$ for all $X,Y\\in\\mathcal{D}$. Beginners easily think that all vector fields have to be checked; that is right, and is not a misconception. It is listed among “common misconceptions” to stress a point that puzzles beginners: the frame condition really does imply the condition for all fields.

- **“If a distribution is integrable, the vector fields in it must commute”**
  No. An involutive distribution requires only $[X,Y]\\in\\mathcal{D}$, not $[X,Y]=0$. The proof of the Frobenius theorem needs the basis to be adjusted so that the new basis commutes; the original frame need not commute.

- **“The Frobenius theorem is just a technical conclusion about PDEs”**
  Quite the contrary. The Frobenius theorem is one of the most pervasive theorems in differential geometry: it matches “infinitesimal data (an involutive distribution)” with “a global geometric object (a foliation)”, and plays a central role in Lie theory, Riemannian geometry and connection theory.

---

### Insights

- **The moment that struck me most**: the Frobenius theorem says in essence “involutive $\\Leftrightarrow$ coordinatisable” — it turns the algebraic condition “closed under the bracket” into the geometric existence statement “there is a coordinate slice”. An abstract Lie bracket computation can decide whether a geometric object exists. This made me understand anew the geometric nature of an “infinitesimal integrability condition”.
- **“Mathematics can be seen this way”**: when I learned partial differential equations I knew only the “integrability condition”; only after learning the Frobenius theorem did I realise that it is the same thing as the involutivity of a distribution in the dual language (Pfaffian systems). Seen geometrically, the condition becomes intuitive: no integral [manifold](/nodes/dg%3Amanifold) means “two different routes do not arrive at the same place”.
- **A habit of thought**: when handling a geometric problem, first ask “what is its infinitesimal version?” — the involutivity of a distribution is exactly such an “infinitesimal integrability condition”. When we want to decide whether a global object exists, first check whether the infinitesimal version is already self-consistent.
- **Resonance and conflict**: I used to think “integrable” meant that an explicit integral could be found. The Frobenius theorem taught me that “integrable” means that coordinate slices exist — an explicit formula need not be written down; geometric existence is itself the right definition of “integrable”. This let me let go of the fixation on “explicit solutions”.

---

### Summary

#### Idea

> **“Involutivity is the exact algebraic description of integrability”** — the infinitesimal condition (closure under the Lie bracket) is equivalent to local existence of integrals (a foliation by coordinate slices). This is the classical example of turning the infinitesimal into the global.

#### Methods

| Method | Where it is used |
|------|----------|
| Adjusting the basis to kill the brackets | the key construction in the proof of the Frobenius theorem |
| Existence and uniqueness for ODEs | integral curves / the construction of coordinates in Lemma 1 |
| The inverse mapping theorem | building a coordinate system from a bracket-free family of vector fields in Lemma 1 |
| Generating a distribution by left-invariant vector fields | the proof of the existence of Lie subgroups (Proposition 2.2.5) |
| The Frobenius condition for Pfaffian systems | the equivalent formulation in [differential forms](/nodes/dg%3Adifferential-form) |
| Uniqueness of the maximal integral [manifold](/nodes/dg%3Amanifold) | gives the uniqueness of the Lie subgroup |

---

### Looking back and asking

1. How are the Frobenius condition $d\\omega^\\alpha\\equiv0\\pmod{\\omega^1,\\dots,\\omega^r}$ and $[X,Y]\\in\\mathcal{D}$ proved to be strictly equivalent from the dual point of view? Is there a deeper linear-algebraic structure behind their duality?
2. For a non-involutive distribution, can one take its “bracket closure” to obtain the smallest involutive distribution containing it? How is this used in control theory (reachable distributions)?
3. In Riemannian geometry the degree to which a horizontal distribution fails to be integrable is measured by curvature — can curvature be understood anew, from the point of view of the Frobenius theorem, as “the obstruction to involutivity”?
4. For singular distributions of variable rank, what are the precise hypotheses of the Stefan–Sussman theorem? How does its proof differ in essence from that of the Frobenius theorem?

---

### References

1. **\`梅加强（Mei Jiaqiang）\`**. \`流形与几何初步（Manifolds and Introductory Geometry）\`. \`第 2 章 §2.2 可积性定理及应用\`. This chapter contains the complete definition of a distribution, involutive distributions, integral [manifolds](/nodes/dg%3Amanifold), the Frobenius theorem (Theorem 2.2.3), Proposition 2.2.5 (the correspondence between Lie subalgebras and Lie subgroups) with its proof, and related exercises.
2. **\`伍鸿熙（Wu Hongxi）, 陈维桓（Chen Weihuan）\`**. \`黎曼几何选讲（Selected Topics in Riemannian Geometry）\`. \`第 2 章\`. It mentions that “a subbundle of the [tangent bundle](/nodes/dg%3Atangent-bundle) $TM$ is called a distribution on $M$”, providing the subbundle viewpoint.
3. **\`陈维桓（Chen Weihuan）\`**. \`微分几何（Differential Geometry）\`. \`附录 §1.4 Frobenius 定理（The Frobenius theorem）\`. Gives an equivalent formulation and proof of the Frobenius theorem from the point of view of Pfaffian systems and the exterior derivative.
4. **\`А. С. 米先柯（A. S. Mishchenko）, А. Т. 福明柯（A. T. Fomenko）\`**. \`微分几何与拓扑学简明教程（A Concise Course in Differential Geometry and Topology）\`. \`第 3 章\`. It provides geometric intuition and background for the [tangent bundle](/nodes/dg%3Atangent-bundle) and tangent vector fields, forming the supporting prerequisites of this note.`,

  'dg:partition-of-unity': `## Partitions of unity

> Second countable + locally compact $\\implies$ paracompact $\\implies$ a partition of unity exists

**Source tags.** #differential-geometry #topology #manifold #definition #theorem #general-technique

**Source.** The read-only snapshot \`G:/DifferentialGeometry/object/def/单位分解.md\` (see \`data/dg/\`).

---

A partition of unity is a basic tool in the theory of [differentiable manifolds](/nodes/manifold%3Ack-atlas): it decomposes the constant function $1$ into a sum of at most countably many smooth functions, each of which is non-zero only inside one prescribed open set. With this tool one can glue quantities defined locally (a metric in local coordinates, a [differential form](/nodes/dg%3Adifferential-form), a [tensor](/nodes/dg%3Atensor) field, and so on) into a global quantity defined on the whole [manifold](/nodes/dg%3Amanifold), and so build a bridge between the local and the global. Partitions of unity are used widely in the theory of [differentiable manifolds](/nodes/manifold%3Ack-atlas), in Riemannian geometry and in differential topology.

---

### Prerequisites

#### Essential background

- **[Differentiable manifolds](/nodes/manifold%3Ack-atlas)**: a Hausdorff [topological space](/nodes/dg%3Atopological-space) satisfying the second countability axiom, in which every point has an open neighbourhood [homeomorphic](/nodes/dg%3Ahomeomorphism) to an open set in $\\mathbb{R}^n$ and the coordinate changes are smooth. The number $n$ is called the dimension of the [manifold](/nodes/dg%3Amanifold).
- **Smooth functions**: let $M$ be a [differentiable manifold](/nodes/manifold%3Ack-atlas); a map $f: M \\to \\mathbb{R}$ is called smooth if it is $C^\\infty$ in every local coordinate system.
- **Support of a function**: $\\operatorname{supp} \\varphi = \\overline{\\{x \\in M \\mid \\varphi(x) \\neq 0\\}}$; the function vanishes identically outside its support.
- **Locally finite family of subsets**: a family of subsets $\\{A_\\alpha\\}$ of a [topological space](/nodes/dg%3Atopological-space) $M$ is such that every point has a neighbourhood meeting only finitely many of the $A_\\alpha$ non-trivially; such a family $\\{A_\\alpha\\}$ is called locally finite.
- **Open cover and refinement**: if $\\{U_\\alpha\\}$ is an open cover of $M$ and every member of $\\{V_\\beta\\}$ is contained in some $U_\\alpha$, then $\\{V_\\beta\\}$ is called a refinement of $\\{U_\\alpha\\}$.
- **Second countability axiom**: the [topological space](/nodes/dg%3Atopological-space) has a countable topological basis. An $n$-dimensional [topological manifold](/nodes/dg%3Atopological-manifold) satisfies the second countability axiom.

#### Supporting background

- **Paracompactness in topology**: a [topological space](/nodes/dg%3Atopological-space) $X$ is called paracompact if every open cover of $X$ has a locally finite open refinement. A paracompact Hausdorff space is normal. A locally compact Hausdorff space satisfying the second countability axiom is paracompact, and so is every [metric space](/nodes/dg%3Ametric-space).
- **Partitions of unity on normal spaces**: for a normal [topological space](/nodes/dg%3Atopological-space) $X$, if there is a family of continuous functions $\\{t_j: X \\to [0,1]\\}$ subordinate to an open cover $\\{U_j\\}$ with $\\operatorname{supp} t_j \\subset U_j$, local finiteness and $\\sum_j t_j(x)=1$, then the open cover is called numerable.

#### Further background

- **The sheaf-theoretic viewpoint**: a partition of unity embodies the idea of “gluing” from the local to the global — local smooth functions (sections) are assembled into a global smooth function. In fibre bundle theory the transition functions use a similar idea to define a global structure.
- **Exhaustion by compact sets**: using second countability and local [compactness](/nodes/dg%3Acompactness) of the [manifold](/nodes/dg%3Amanifold), one can construct a sequence of open sets $\\{G_i\\}$ with $\\bar{G}_i$ compact, $\\bar{G}_i \\subset G_{i+1}$ and $\\bigcup_i G_i = M$. Exhaustion is one of the core tools in proving that partitions of unity exist.

---

### Motivation

#### Motivation for introducing it

The notion of a partition of unity arises from a basic tension in the theory of [differentiable manifolds](/nodes/manifold%3Ack-atlas): a [manifold](/nodes/dg%3Amanifold) is only locally [homeomorphic](/nodes/dg%3Ahomeomorphism) to Euclidean space, yet we need to define and use smooth objects globally. Several paths lead from this tension to the necessity of partitions of unity.

**A thread internal to the discipline**

Every point of a [differentiable manifold](/nodes/manifold%3Ack-atlas) $M$ has an admissible coordinate chart, so near each point one can easily construct quantities in local coordinates (locally defined functions, [tensor](/nodes/dg%3Atensor) fields, [differential forms](/nodes/dg%3Adifferential-form)). Initially, however, these quantities are defined only on local coordinate neighbourhoods. How can such locally defined quantities be assembled into quantities defined globally on the whole [manifold](/nodes/dg%3Amanifold)? For example, on each coordinate neighbourhood $U_\\alpha$ one can define a local [Riemannian metric](/nodes/manifold%3Achart-atlas) $g^{(\\alpha)}$ by means of the Euclidean metric, but these $g^{(\\alpha)}$ may fail to agree on $U_\\alpha \\cap U_\\beta$. We need a tool that “glues these local metrics smoothly” into a globally defined [Riemannian metric](/nodes/manifold%3Achart-atlas).

Conversely, given a smooth object defined globally on $M$ (such as a [differential form](/nodes/dg%3Adifferential-form)), we need to compute with it and integrate it in local coordinates; how to “decompose” a global object into a sum of local objects is then a natural question as well. A partition of unity solves both directions at once.

**A thread from external applications**

In general relativity spacetime is a 4-dimensional Lorentz [manifold](/nodes/dg%3Amanifold): physical quantities (the energy-momentum [tensor](/nodes/dg%3Atensor), the electromagnetic field [tensor](/nodes/dg%3Atensor)) have to be defined globally, whereas computations and observations are usually carried out in local coordinates. Partitions of unity supply the rigorous foundation ensuring that local physical laws can be glued smoothly into global physical laws. In gauge field theory the connection on a fibre bundle has to be expressed in local trivialisations, and a partition of unity can be used to construct a global connection.

**An aesthetic and structural thread**

From the point of view of mathematical structure, a [differentiable manifold](/nodes/manifold%3Ack-atlas) lacks the tool of “decomposition of the identity” that is common in linear algebra. In a finite-dimensional [vector space](/nodes/bg%3Alinear%3Avector) we can decompose the identity map $I$ into a sum of projection operators. A partition of unity is precisely the generalisation of this idea to a [differentiable manifold](/nodes/manifold%3Ack-atlas) — the constant function $1$ is decomposed into a sum of smooth functions, each non-zero only on a prescribed open set. This “divide and conquer” idea recurs throughout analysis and geometry (Fourier series, wavelet frames, and so on), and a partition of unity is its most natural geometric embodiment.

#### Motivation for the construction

The form of a concept has a natural genesis in human cognition. From its first “seed” to its modern canonical “form”, the partition of unity went through a clear evolution.

**The seed: a special smooth function**

The simplest starting point is the following function:

$$
\\varphi(x) = \\begin{cases} e^{-\\frac{1}{x}}, & x > 0, \\\\ 0, & x \\le 0, \\end{cases} \\qquad x \\in \\mathbb{R}.
$$

This function is smooth on the whole of $\\mathbb{R}$: it suffices to compute the one-sided derivatives of $e^{-\\frac{1}{x}}$ at $0$ inductively and check that they all vanish. $\\varphi$ is the first “non-trivial” smooth function — it is not analytic (all its Taylor coefficients at $0$ vanish, yet it is non-zero for $x>0$), and it displays the flexibility of smooth functions.

**Development: bump functions (cutoff functions)**

Starting from $\\varphi$, algebraic operations and composition produce an important class of smooth functions — **bump functions**, also called **cutoff functions**. Concretely:

$$
g(x) = \\frac{\\varphi(x)}{\\varphi(x) + \\varphi(1-x)},\\quad x \\in \\mathbb{R},
$$

then $g$ is smooth, with $g(x)=0$ for $x \\le 0$ and $g(x)=1$ for $x \\ge 1$. Furthermore, putting $g_1(x)=g(2x+2)$ gives

$$
x \\le -1 \\Rightarrow g_1(x)=0,\\quad x \\ge -1/2 \\Rightarrow g_1(x)=1.
$$

Setting $h(x)=g_1(|x|)$ then yields a smooth function $h$ on $\\mathbb{R}$:

$$
h(x) = 0,\\ \\forall |x| \\ge 1;\\quad h(x) \\in (0,1],\\ \\forall |x| < 1;\\quad h(x) = 1,\\ \\forall |x| \\le 1/2.
$$

Through $f(x)=h(\\|x\\|)$ this can be generalised to $\\mathbb{R}^n$. The characteristic feature of this function is that it is non-zero only near the origin and does attain $1$: it is like a “bump” — flat at $1$ in the central region and decaying smoothly to $0$ outside.

**Formation: from bumps to a decomposition**

With bump functions in hand, one can construct on any open ball in $\\mathbb{R}^n$ a smooth function that equals $1$ inside the ball and vanishes outside a larger closed ball. Then, using second countability and local [compactness](/nodes/dg%3Acompactness) of the [manifold](/nodes/dg%3Amanifold), one constructs a compact exhaustion and a family of open covers, and places one bump function on each local coordinate neighbourhood. Finally, “normalisation” (dividing by the sum of all the bump functions) makes the total sum identically $1$, which yields the modern canonical form of a partition of unity.

**The modern canonical form**

As the concept stands today, the standard definition is: let $\\{U_\\alpha\\}$ be an open cover of a [differentiable manifold](/nodes/manifold%3Ack-atlas) $M$; there exist at most countably many smooth functions $\\{g_i\\}$ such that
- $0 \\le g_i(x) \\le 1$;
- the support of each $g_i$ is contained in some $U_{\\alpha(i)}$;
- $\\{\\operatorname{supp} g_i\\}$ is locally finite;
- $\\sum_i g_i(x) \\equiv 1$.

This form “decomposes” the global constant function $1$ into a sum of local functions, and it solves the passage from the local to the global perfectly.

---

### Form

#### The canonical general form

We give two general forms of a partition of unity; they are essentially equivalent, though they are emphasised differently in different applications.

**Definition A (countable form)**: let $\\{U_\\alpha\\}_{\\alpha \\in \\Gamma}$ be an open cover of a [differentiable manifold](/nodes/manifold%3Ack-atlas) $M$. If there exist at most countably many smooth functions $\\{g_i: M \\to \\mathbb{R}\\}$ such that:
- (i) $0 \\le g_i(x) \\le 1$, $\\forall x \\in M$;
- (ii) for each $g_i$ there is $\\alpha(i) \\in \\Gamma$ with $\\operatorname{supp} g_i \\subset U_{\\alpha(i)}$;
- (iii) $\\{\\operatorname{supp} g_i\\}$ is a locally finite family of subsets of $M$;
- (iv) $\\sum_i g_i(x) \\equiv 1$, $\\forall x \\in M$;

then $\\{g_i\\}$ is called a **partition of unity** subordinate to $\\{U_\\alpha\\}$.

**Definition B (general form)**: if condition (ii) is relaxed to: for every $\\alpha \\in \\Gamma$ there is a smooth function $g_\\alpha: M \\to \\mathbb{R}$ with $0 \\le g_\\alpha \\le 1$, $\\operatorname{supp} g_\\alpha \\subset U_\\alpha$ and $\\sum_\\alpha g_\\alpha \\equiv 1$ (where only at most countably many $g_\\alpha$ are non-zero), then $\\{g_\\alpha\\}$ is called a **generalised partition of unity** subordinate to $\\{U_\\alpha\\}$.

**Comparison of the two**: Definition A emphasises the constructive result “there exists a countable family”, whose number of functions is at most countable and each of which corresponds explicitly to a member of the open cover. Definition B emphasises instead the symmetry “one smooth function for each open set”, and its index set may be the same as that of the open cover. Definition B can be obtained from Definition A by summing the functions with the same $\\alpha$, and Definition A can be seen as the normalised form of Definition B after choosing a countable subfamily. In practice, Definition A is used more often in constructive arguments (gluing local objects), and Definition B more often in theoretical analysis (writing sums).

#### Analysis of the necessary conditions

Each of the four conditions in the definition has an irreplaceable role:

- **Condition (i) $0 \\le g_i \\le 1$**: non-negativity and boundedness give each $g_i$ the interpretation of a “weight” or a “probability”, and prevent anomalies caused by cancellation between positive and negative values. In applications such as smooth extension, this condition ensures that the functions constructed have a controllable range of values.
- **Condition (ii) $\\operatorname{supp} g_i \\subset U_{\\alpha(i)}$**: this is the core condition of being “subordinate” to the open cover; it ensures that each function lies entirely “inside” the prescribed open set. Without it, a partition of unity loses the ability to distribute a global quantity among local open sets.
- **Condition (iii) local finiteness**: this is the key to the sum $\\sum_i g_i$ being well defined at every point. If the family of subsets is not locally finite, then at some point infinitely many $g_i$ may be non-zero simultaneously, and the convergence of the infinite sum $\\sum_i g_i(x)$ cannot be guaranteed (and even if it converges, it need not be smooth). Conversely, local finiteness means that every point has a neighbourhood meeting only finitely many supports, so near every point the sum is a finite sum and smoothness is automatic.
- **Condition (iv) $\\sum_i g_i \\equiv 1$**: the normalisation condition makes $\\{g_i\\}$ a “decomposition”, that is, $1 = \\sum_i g_i$. This means that when a global object (such as a [tensor](/nodes/dg%3Atensor) field) is written as a local sum, multiplying by $1$ and expanding it into the partition of unity writes the global object as a weighted sum of local objects. Without normalisation this “decomposition” would be meaningless.

#### Equivalent formulations

The following statements describe equivalent forms of a partition of unity:

**Equivalent to a generalised partition of unity**: if $\\{g_i\\}$ is a partition of unity subordinate to the open cover $\\{U_\\alpha\\}$, put $\\Gamma' = \\{\\alpha(i)\\}$, define $g_\\alpha = \\sum_{\\alpha(i)=\\alpha} g_i$ for $\\alpha \\in \\Gamma'$ and $g_\\alpha = 0$ for $\\alpha \\notin \\Gamma'$; then $\\{g_\\alpha\\}$ is a generalised partition of unity subordinate to $\\{U_\\alpha\\}$. Conversely, at most countably many terms of a generalised partition of unity $\\{g_\\alpha\\}$ are non-zero, and taking those non-zero terms gives a partition of unity in countable form.

**Equivalent to the existence of a positive function $\\psi$**: if $\\{g_i\\}$ is a partition of unity, then $\\psi = \\sum_i i g_i$ is a smooth proper function on $M$. Conversely, if $\\psi$ is a smooth proper function, then $G_i = \\psi^{-1}(-i,i)$ is an exhaustion of $M$, from which a partition of unity can be constructed.

#### Kinds of partition of unity

Depending on the requirements on the underlying space and on the class of functions, the common partitions of unity fall into the following types:

- **Smooth partitions of unity**: defined on a [differentiable manifold](/nodes/manifold%3Ack-atlas) with function class $C^\\infty(M)$; this is the form mainly used in differential geometry.
- **Continuous partitions of unity**: defined on a paracompact [topological space](/nodes/dg%3Atopological-space) with continuous functions as the function class. For a normal space, every locally finite open cover admits a subordinate continuous partition of unity.
- **$C^k$ partitions of unity**: intermediate between $C^\\infty$ and continuous, with function class $C^k(M)$; used in situations where only finitely many degrees of smoothness are needed.
- **Compactly supported partitions of unity**: the partitions of unity constructed in proofs of the existence theorem usually have the support of every $g_i$ compact.

#### How are the relevant statements expressed in natural language?

- “We can split $1$ into a sum of finitely many smooth functions, each non-zero only in the corresponding coordinate neighbourhood.” — this is the most intuitive description of a partition of unity.
- “Given an open cover of a [manifold](/nodes/dg%3Amanifold), one can find a family of smooth functions, each carried by one region of the cover, whose sum is $1$ everywhere.” — a description emphasising the idea of “carrying”.
- “A locally finite assignment of smooth weights, such that near every point the weights involve only finitely many open sets and the total weight is always $1$.” — a description emphasising local finiteness and normalisation.
- “A partition of the identity on a [manifold](/nodes/dg%3Amanifold).” — by analogy with the decomposition of the identity in linear algebra.

#### Reduction

Restated in the basic language of topology: let $X$ be a paracompact Hausdorff space and $\\{U_\\alpha\\}_{\\alpha \\in \\Gamma}$ an open cover of it. Then there is a locally finite open refinement $\\{V_\\beta\\}_{\\beta \\in B}$ and a family of continuous functions $\\{f_\\beta: X \\to [0,1]\\}$ with $\\operatorname{supp} f_\\beta \\subset V_\\beta$ and $\\sum_{\\beta} f_\\beta \\equiv 1$.

At the level of logic and set theory, “a partition of unity exists” is equivalent to: “for every $x \\in X$, $\\sum_\\beta f_\\beta(x)$ is a finite sum and equals $1$; and for every $\\beta$, $f_\\beta$ vanishes identically on $X \\setminus V_\\beta$”.

#### Lifting

In a higher-level theory, the existence of a partition of unity is essentially a theorem about the topological properties of the [manifold](/nodes/dg%3Amanifold). For a locally Euclidean space, the key condition for a partition of unity to exist is that the space satisfies the second countability axiom (equivalently, that it is paracompact). The existence theorem for partitions of unity can therefore be regarded as:

In general topology, a paracompact space is defined as a Hausdorff space in which every open cover has a locally finite open refinement. Compact spaces are paracompact, and so are [metric spaces](/nodes/dg%3Ametric-space). For a [differentiable manifold](/nodes/manifold%3Ack-atlas), the existence of a partition of unity is equivalent to the [manifold](/nodes/dg%3Amanifold) being paracompact, which in turn is equivalent to the [manifold](/nodes/dg%3Amanifold) satisfying the second countability axiom (already assumed in the usual definition of a [manifold](/nodes/dg%3Amanifold)).

From the sheaf-theoretic point of view, a partition of unity means that the sheaf of smooth functions on $M$ is a “fine sheaf” — that is, for any locally finite open cover one can use a partition of unity to write a global section as a weighted sum of local sections. This property is the foundation of the theory of [de Rham cohomology](/nodes/dg%3Apoincare-lemma) on a [manifold](/nodes/dg%3Amanifold).

#### Connections

Partitions of unity are deeply related in spirit to the following mathematical notions:

- **Decomposition of the identity in linear algebra**: in a finite-dimensional [vector space](/nodes/bg%3Alinear%3Avector) $V$, if $V$ decomposes as a direct sum of subspaces $V = \\bigoplus_i V_i$, then there are projection operators $P_i: V \\to V_i$ with $\\sum_i P_i = \\mathrm{id}_V$. A partition of unity is the analogue of the decomposition of the identity in a function space, except that “subspaces” are replaced by “open sets” and “projections” by “smooth weight functions”.
- **Fourier series**: a periodic function is decomposed into a weighted sum of trigonometric functions $\\{e^{in\\theta}\\}$, $f(\\theta) = \\sum_{n \\in \\mathbb{Z}} a_n e^{in\\theta}$. The trigonometric system of a Fourier series corresponds, on a [manifold](/nodes/dg%3Amanifold), to the family of functions in a partition of unity — both express a “global object” as a weighted sum of “local constituents”.
- **Approximate identities by convolution**: in harmonic analysis, bump functions and convolution are used to construct smooth approximations (mollifiers), an idea directly in line with the construction of bump functions in a partition of unity.

---

### Proof

#### Proof sketch

In one sentence: use second countability and local [compactness](/nodes/dg%3Acompactness) of the [manifold](/nodes/dg%3Amanifold) to construct a compact exhaustion, use bump functions on each layer of the exhaustion to construct locally defined smooth functions, and then normalise all the local functions to obtain a partition of unity.

Two different proofs are given below.

#### Proof one: the exhaustion method

**Theorem** (existence of a partition of unity): for any open cover $\\{U_\\alpha\\}_{\\alpha \\in \\Gamma}$ of a [differentiable manifold](/nodes/manifold%3Ack-atlas) $M$, there exists a partition of unity subordinate to it.

**Proof**:

**Step 1: construct an exhaustion**

Since $M$ satisfies the second countability axiom, the Lindelöf lemma gives at most countably many points $x_i$ such that the local coordinate neighbourhoods $\\{V_{x_i}\\}$ form an open cover of $M$ and each $\\bar{V}_{x_i}$ is compact. Define open sets $G_i$ recursively:

- $G_1 = V_{x_1}$.
- Suppose $G_1, \\dots, G_i$ have been defined. Since $\\bigcup_{k \\le i} \\bar{G}_k$ is compact, there is $I$ with $\\bigcup_{k \\le i} \\bar{G}_k \\subset \\bigcup_{j \\le I} V_{x_j}$. Put $G_{i+1} = \\bigcup_{j \\le I} V_{x_j}$.

Then $\\{\\bar{G}_i\\}$ is compact, $\\bar{G}_i \\subset G_{i+1}$ and $\\bigcup_i G_i = M$; this is called an **exhaustion** of $M$.

**Step 2: construct the local functions**

Put $A_i = \\bar{G}_i - G_{i-1}$ (with $G_0 = \\varnothing$); then $A_i$ is a compact closed set, and these sets cover $M$. Fix $A_i$; for every point $x \\in A_i$ choose a local coordinate system $(U_x, \\varphi_x)$ such that:
- $\\varphi_x(U_x) = B_2(0)$;
- there is $\\alpha(x) \\in \\Gamma$ with $U_x \\subset U_{\\alpha(x)}$;
- $U_x \\cap A_j = \\varnothing$ for all $|j-i| > 1$.

Let $f$ be a bump function on $\\mathbb{R}^n$ (that is, $f = 1$ on $B_{1/2}(0)$ and $f = 0$ outside $B_1(0)$), and define

$$
f_x(p) = \\begin{cases} f(\\varphi_x(p)), & p \\in U_x, \\\\ 0, & p \\in M - U_x, \\end{cases}
$$

then $f_x$ is a smooth function on $M$ and $f_x(p) = 1$ for all $p \\in V_x = \\varphi_x^{-1}(B_{1/2}(0))$.

**Step 3: finite selection and local finiteness**

Since $A_i$ is compact, there are finitely many points $x_1^i, \\dots, x_{k(i)}^i \\in A_i$ such that

$$
A_i \\subset \\bigcup_{j \\le k(i)} V_{x_j^i}.
$$

The choice of the local coordinate neighbourhoods ensures that $\\{\\operatorname{supp} f_{x_j^i}\\}$ is locally finite (the supports are disjoint when $|i-i'| > 1$, and for a fixed $i$ there are only finitely many).

Put $\\psi(x) = \\sum_i \\sum_{j=1}^{k(i)} f_{x_j^i}(x)$; then $\\psi$ is a smooth function on $M$ that is positive everywhere (because every $A_i$ is covered, so every point belongs to some $V_{x_j^i}$, where $f_{x_j^i} = 1$; the choice of coordinates in the previous step also ensures that functions from different layers do not cancel).

**Step 4: normalisation**

Put

$$
g_{x_j^i}(x) = \\frac{f_{x_j^i}(x)}{\\psi(x)},
$$

then $\\{g_{x_j^i}\\}$ is a partition of unity subordinate to the open cover $\\{U_\\alpha\\}$. $\\square$

The proof shows that the supports of the smooth functions in the partition of unity constructed here are all compact. Moreover, summing the $g_{x_j^i}$ with the same index $\\alpha$ yields a generalised partition of unity $\\{g_\\alpha\\}$.

#### Proof two: refinement using the second countability axiom

This is the framework of the proof used in Chen Weihuan, *Introduction to Differential Geometry*, §2.3; it brings out the step-by-step refinement made possible by the second countability axiom.

**Theorem** (existence of a partition of unity): let $M$ be a [smooth manifold](/nodes/dg%3Asmooth-manifold) satisfying the second countability axiom and let $\\Sigma = \\{U_\\alpha\\}$ be any open cover of it. Then there is a countable, locally finite open cover $\\Sigma_0 = \\{W_i\\}$ refining $\\Sigma$, together with a family of smooth functions $\\{f_i\\}$ defined on the whole of $M$ with $0 \\le f_i \\le 1$, $\\operatorname{supp} f_i \\subset W_i$ and $\\sum_i f_i \\equiv 1$.

**Sketch of the proof**:

1. Using second countability of $M$, reduce the open cover $\\Sigma$ to a countable open cover (using a countable topological basis).
2. Construct a sequence of compact subsets $K_n$ with $K_n \\subset K_{n+1}^{\\circ}$ and $\\bigcup_n K_n = M$ (Lemma 4).
3. Based on $\\{K_n\\}$, construct a countable locally finite open cover $\\Sigma_0 = \\{W_i\\}$ refining $\\Sigma$ whose members have compact closures (Lemma 5).
4. Shrink $\\{W_i\\}$ to $\\{Z_i\\}$ with $\\bar{Z}_i \\subset W_i$, still a cover (Lemma 6, constructed by mathematical induction).
5. Using bump functions on $\\mathbb{R}^n$, construct on each $W_i$ a smooth function $\\psi_i$ with $\\psi_i = 1$ on $Z_i$ and $\\operatorname{supp} \\psi_i \\subset W_i$.
6. Put $f_i = \\psi_i \\big/ \\sum_j \\psi_j$; then $\\{f_i\\}$ is the required partition of unity. $\\square$

**Comparison of the two proofs**: proof one (the exhaustion method) stays closer to the intuition of a local construction, and every step has a clear geometric meaning; proof two (the refinement method) displays the use of point-set topology on a [manifold](/nodes/dg%3Amanifold), has a clearer logical layering, and serves well as a bridge between partitions of unity and general topology.

---

### Applications

#### Direct applications

##### 1. Existence of a [Riemannian metric](/nodes/manifold%3Achart-atlas)

**Theorem**: on every [differentiable manifold](/nodes/manifold%3Ack-atlas) $M$ there exists a [Riemannian metric](/nodes/manifold%3Achart-atlas).

**Construction**: take a locally finite coordinate cover $\\{U_\\alpha\\}$ of $M$ and let $\\{g_i\\}$ be a partition of unity subordinate to it. In each coordinate neighbourhood $U_\\alpha$, use the local coordinates $\\{x^1, \\dots, x^n\\}$ to define the local metric

$$
g^{(\\alpha)} = \\sum_{k=1}^{n} dx^k \\otimes dx^k,
$$

that is, the standard Euclidean metric. Then

$$
g = \\sum_i g_i \\cdot g^{(\\alpha(i))}
$$

is a smooth second-order covariant [tensor](/nodes/dg%3Atensor) field defined globally on $M$. For any non-zero tangent vector $X$, since $\\sum_i g_i = 1$ with $g_i \\ge 0$, and since every $g^{(\\alpha(i))}$ is positive definite, one has $g(X, X) > 0$; symmetry is preserved automatically as well. Hence $g$ is a [Riemannian metric](/nodes/manifold%3Achart-atlas) on $M$.

This example is a model illustration of “how a new tool relieves an old pain”: without partitions of unity, proving the existence of a [Riemannian metric](/nodes/manifold%3Achart-atlas) requires a complicated inductive construction; with a partition of unity, one only has to “take the Euclidean metric locally and sum globally with weights”.

##### 2. Smooth extension

**Proposition** (smooth extension): let $A$ be a closed subset of a [differentiable manifold](/nodes/manifold%3Ack-atlas) $M$ and let $U$ be an open neighbourhood of $A$. Then there is a smooth function $\\phi: M \\to \\mathbb{R}$ with $\\phi|_A \\equiv 1$ and $\\operatorname{supp} \\phi \\subset U$.

**Proof**: consider the open cover $\\{U,\\ M - A\\}$ of $M$ and let $\\{\\phi, \\psi\\}$ be a partition of unity subordinate to it. From $\\operatorname{supp} \\psi \\subset M - A$ we get $\\psi|_A = 0$, hence $\\phi|_A = 1$, and $\\operatorname{supp} \\phi \\subset U$. $\\square$

More generally, if $B$ is a subset of $M$ and $f: B \\to \\mathbb{R}$ agrees near every point with some local smooth function, then there is an open neighbourhood $V$ of $B$ and a smooth function $\\tilde{f}: V \\to \\mathbb{R}$ with $\\tilde{f}|_B = f$. The construction takes $\\{U_x\\}_{x \\in B}$ as an open cover, lets $\\{g_i\\}$ be a partition of unity subordinate to it, and sets $\\tilde{f} = \\sum_i g_i f_{x_i}$.

##### 3. Smooth approximation of continuous maps

**Theorem**: let $f: M \\to N$ be a continuous map between [differentiable manifolds](/nodes/manifold%3Ack-atlas). Then there is a smooth map $g: M \\to N$ such that $g$ and $f$ are homotopic.

#### Indirect applications

##### Applications in the theory of [differentiable manifolds](/nodes/manifold%3Ack-atlas)

- **Existence of proper functions**: take a local coordinate cover $\\{U_i\\}$ of $M$ with $\\bar{U}_i$ compact, let $\\{g_i\\}$ be a generalised partition of unity, and put $\\rho(x) = \\sum_i i g_i(x)$. Then $\\rho$ is smooth, and if $\\rho(x) \\le k$ then $x \\in \\bigcup_{i=1}^k \\bar{U}_i$ (compact), so $\\rho$ is a proper function; it can be used to construct exhaustions of a [manifold](/nodes/dg%3Amanifold) and in the proof of the Whitney [embedding theorem](/nodes/dg%3Asmooth-embedding).
- **Defining the integral of a differential form in local coordinates**: use a partition of unity to decompose a global $n$-form [differential form](/nodes/dg%3Adifferential-form) into a sum of forms whose supports lie in coordinate neighbourhoods, define the integral of each in the standard Riemann sense, and sum. The definition does not depend on the choice of partition of unity.
- **Proof of Stokes’ formula**: use a partition of unity to reduce the problem to the case where the support lies in a single coordinate neighbourhood, where it becomes the classical Stokes formula on $\\mathbb{R}^n$ or $\\mathbb{R}^n_+$.
- **Existence of a [Riemannian metric](/nodes/manifold%3Achart-atlas) on a vector bundle**: as for the existence of a [Riemannian metric](/nodes/manifold%3Achart-atlas) on the [tangent bundle](/nodes/dg%3Atangent-bundle), a partition of unity glues the inner products on the fibres smoothly into a global inner product.
- **Construction of [tensor](/nodes/dg%3Atensor) fields and connections**: partitions of unity can be used to construct a connection on an arbitrary vector bundle, and to extend locally defined [tensor](/nodes/dg%3Atensor) fields to global [tensor](/nodes/dg%3Atensor) fields.

##### The role in physics and related fields

- **General relativity**: in curved spacetime, partitions of unity extend locally defined physical quantities (such as the stress-energy [tensor](/nodes/dg%3Atensor)) smoothly to global ones, which is how global energy-momentum conservation is handled.
- **Gauge field theory**: in local trivialisations of a fibre bundle, a partition of unity constructs a global connection from local gauge potentials.
- **Computational geometry**: in surface parametrisation and finite element analysis, the idea of a partition of unity is used to construct numerical methods such as “partition of unity interpolation” and “moving least squares approximation”.

---

### Generalisation

#### Relaxing the conditions

- **The underlying space may be a paracompact [topological space](/nodes/dg%3Atopological-space)**: the existence of a partition of unity does not require the underlying space to be a [differentiable manifold](/nodes/manifold%3Ack-atlas). For a paracompact Hausdorff space $X$ there is a locally finite continuous partition of unity subordinate to any open cover. The reason a [differentiable manifold](/nodes/manifold%3Ack-atlas) can go further and obtain a smooth partition of unity is that a [manifold](/nodes/dg%3Amanifold) carries a $C^\\infty$ structure and bump functions.
- **The smoothness requirement on the [manifold](/nodes/dg%3Amanifold) can be lowered**: for a $C^k$ [manifold](/nodes/dg%3Amanifold) with $1 \\le k < \\infty$ there is likewise a $C^k$ partition of unity; only the construction of the bump functions has to be changed to $C^k$.
- **The open cover need not be locally finite**: even if the open cover is not locally finite, the existence theorem for partitions of unity still guarantees that its refinement is locally finite.

#### Generalising the conclusions

- **From the [tangent bundle](/nodes/dg%3Atangent-bundle) to vector bundles**: the relation between the existence of a [Riemannian metric](/nodes/manifold%3Achart-atlas) and partitions of unity generalises to arbitrary vector bundles — a partition of unity constructs a [Riemannian metric](/nodes/manifold%3Achart-atlas) (that is, an inner product on the fibres) on any vector bundle.
- **From smooth functions to sections**: the technique of partitions of unity extends to the space of smooth sections of a vector bundle, allowing local sections to be glued into global ones; this idea has deep applications in sheaf theory.

#### Related open problems

In the theory of [differentiable manifolds](/nodes/manifold%3Ack-atlas), the existence of a partition of unity is by now a very mature result. The *idea* of a partition of unity, however, is still actively studied in the following directions:

- In symplectic geometry, is there a tool analogous to a partition of unity that glues local symplectic embeddings into a global one?
- In non-commutative geometry, how to construct a “partition of unity” on a non-commutative [manifold](/nodes/dg%3Amanifold) is one of the key questions for understanding non-commutative metrics.

---

### Common misconceptions

**Misconception one: the members of a partition of unity must correspond one-to-one with the indices of the open cover**

This is not so. In the standard definition $\\{g_i\\}$ may have at most countably many members, whereas the open cover $\\{U_\\alpha\\}$ may have uncountably many. Refining and “merging the $g_i$ with the same $\\alpha$” yields a generalised partition of unity $\\{g_\\alpha\\}$, but the original construction does not require $g_\\alpha$ to be defined for every $\\alpha$.

**Misconception two: the functions in a partition of unity “partition” the open sets**

The “partition” in “partition of unity” refers to decomposing the constant function $1$, not to partitioning the [manifold](/nodes/dg%3Amanifold). Each $g_i$ is like a “hat” placed on some open set; the supporting regions of different hats may overlap, and all that is required is that locally only finitely many hats are non-zero at the same time.

**Misconception three: a partition of unity is always unique**

Partitions of unity are highly non-unique. Given the same open cover, different exhaustions, different choices of local coordinates and different bump functions produce different partitions of unity. In practice a partition of unity is only an existence tool, and its concrete form does not matter.

**Misconception four: confusing “support inside $U$” with “equal to $1$ on $U$”**

That a function satisfies $\\operatorname{supp} g \\subset U$ means that $g$ vanishes identically on the complement of $U$, but $g$ may take any values inside $U$ (subject to $0 \\le g \\le 1$). This means that $g$ may be only “partly” non-zero inside $U$ — a completely different notion from “equal to $1$ on $U$”. A bump function satisfies both properties at once (equal to $1$ on $V_x$, zero outside $U_x$), but that is a special feature of the construction, not a requirement of the definition.

**Misconception five: local finiteness is automatic on a compact [manifold](/nodes/dg%3Amanifold)**

For a compact [manifold](/nodes/dg%3Amanifold) a finite cover is already locally finite, so local finiteness holds automatically. Beginners, however, tend to overlook the crucial role of this condition on a non-compact [manifold](/nodes/dg%3Amanifold): without local finiteness the infinite sum $\\sum_i g_i$ may diverge at some point, or converge without being smooth.

---

### Lessons

- **The habit of thinking “from the local to the global”**: the deepest lesson of a partition of unity is that when a problem can be solved locally (for instance, a [Riemannian metric](/nodes/manifold%3Achart-atlas) exists on every coordinate neighbourhood), one should not rush to design a global scheme from scratch, but ask instead: is there a tool that can “glue” local solutions into a global one? This way of thinking recurs throughout mathematics: from the gluing axioms of sheaves to the Mayer-Vietoris sequence in homological algebra and to descent theory in Grothendieck topologies, it is essentially the same “local to global” framework in different guises.
- **A way of seeing mathematics — “taking $1$ apart”**: the constant function $1$ is normally regarded as the most “bland” of objects, yet a partition of unity tells us that even $1$ can be decomposed into a family of smooth functions, each with a specific “geometric duty” (to work on just one open set). This seemingly simple idea is one of the cornerstones of global analysis.
- **Resonance**: this reminds me of the Chinese idea of “divide and conquer” — break a difficult global problem into several easy local problems, solve them one by one, and then merge the local solutions into a global one. A partition of unity is precisely the mathematical realisation of that ancient wisdom.

---

### Summary

#### The idea

**“Turn the global into the local, then glue it back smoothly.”** The core idea of a partition of unity is to decompose $1$ into a locally finite sum of smooth functions, so that every global object can be written as a weighted sum of locally defined objects. This is the deepest embodiment of the “divide and conquer” strategy in differential geometry.

#### The methods

- **The bump-function method**: use cutoff functions on $\\mathbb{R}^n$ to construct local smooth functions (used in the bump function lemma). → Used in step 2 of the existence proof, and in the construction of smooth extensions.
- **The exhaustion method**: use second countability and local [compactness](/nodes/dg%3Acompactness) to construct a compact exhaustion $\\{G_i\\}$. → Used in step 1 of the existence proof.
- **The normalisation technique**: turn the locally constructed positive function $\\psi$ into a partition of unity with sum $1$ by dividing, $\\frac{f_i}{\\psi}$. → Used in step 4 of the existence proof.
- **The countable refinement method**: use the second countability axiom to reduce an arbitrary open cover to a countable, locally finite open cover. → Used in steps 1–3 of proof two (the refinement method).
- **The closed-set separation trick**: use a partition of unity to construct a smooth function equal to $1$ on one closed set and to $0$ on another. → Used in the smooth extension theorem.

---

### Review and questions

1. In the proof of the existence of a partition of unity, which topological properties of the [manifold](/nodes/dg%3Amanifold) are used in constructing the exhaustion $\\{G_i\\}$? What role does each of them play in the proof?
2. The definition of a generalised partition of unity requires $\\operatorname{supp} g_\\alpha \\subset U_\\alpha$. If this is relaxed to $\\operatorname{supp} g_\\alpha \\subset$ some larger open set depending on $U_\\alpha$, how does the conclusion change?
3. How is the existence of a [Riemannian metric](/nodes/manifold%3Achart-atlas) on a vector bundle proved using a partition of unity? Compared with the existence of a [Riemannian metric](/nodes/manifold%3Achart-atlas) on the [tangent bundle](/nodes/dg%3Atangent-bundle), are extra conditions needed?
4. On a non-compact [manifold](/nodes/dg%3Amanifold), if partitions of unity are not used, can you design another way to prove the existence of a [Riemannian metric](/nodes/manifold%3Achart-atlas)?
5. Why is a partition of unity needed in the proof of Stokes’ formula? Is its role in that proof technical or essential?

---

### References

1. \`梅加强. 流形与几何初步. 2012.\` (Mei Jiaqiang, *Manifolds and Geometric Preliminaries*, 2012.)
2. \`陈维桓. 微分几何引论. 高等教育出版社, 2013.\` (Chen Weihuan, *Introduction to Differential Geometry*, Higher Education Press, 2013.)
3. Wolfgang Kühnel. Differential Geometry: Curves - Surfaces - Manifolds, Third Edition.
4. Victor W. Guillemin, Alan Pollack. Differential Topology. American Mathematical Society, 2011.
5. B. A. Dubrovin, S. P. Novikov, A. T. Fomenko. Modern Geometry — Methods and Applications, Part II: The Geometry and Topology of Manifolds. GTM 104, Springer, 1985.
6. Tammo tom Dieck. Algebraic Topology.
7. William Fulton. Algebraic Topology - A First Course. GTM 153, Springer, 1995.
8. Allen Hatcher. Algebraic Topology.
9. Clifford Henry Taubes. Differential Geometry: Bundles, Connections, Metrics and. Oxford Graduate Texts in Mathematics, 2011.
10. \`尤承业. 基础拓扑学讲义. 北京大学出版社, 2006.\` (You Chengye, *Lectures on Basic Topology*, Peking University Press, 2006.)
11. \`包志强. 点集拓扑与代数拓扑引论. 北京大学出版社, 2013.\` (Bao Zhiqiang, *Introduction to Point-Set and Algebraic Topology*, Peking University Press, 2013.)`,

  'dg:compactness': `## Compactness

> $A$ is compact $\\iff$ for every family of open sets $\\{O_\\alpha\\}_{\\alpha \\in I}$, if $A \\subset \\bigcup_{\\alpha} O_\\alpha$, then there is a finite subset $\\{\\alpha_1, \\dots, \\alpha_n\\} \\subset I$ with $A \\subset \\bigcup_{i=1}^n O_{\\alpha_i}$.

**Source tags.** #topology #point-set-topology #compactness #definition #theorem #property #introductory

**Source.** The read-only snapshot \`G:/DifferentialGeometry/object/prop/紧致性.md\` (see \`data/dg/\`).

---

Compactness is one of the important properties of a [topological space](/nodes/dg%3Atopological-space). It appeared early in analysis and has many applications there, especially in the study of the real numbers and of continuous functions, where it is a basic property; yet in essence it belongs to topology, and is one of the most basic and most common topological properties. The core idea of compactness can be summed up as: **turning the control of the infinite into the control of the finite** — a space is compact if it is “small” enough that a finite subcover can be extracted from any open cover. Compactness plays a foundational role in topology, in differential geometry (for instance [partitions of unity](/nodes/dg%3Apartition-of-unity) on a [manifold](/nodes/dg%3Amanifold), and the theory of the total curvature of compact surfaces) and even in algebraic topology.

---

## Prerequisites

### Essential

- **Open sets and [topological spaces](/nodes/dg%3Atopological-space)**: a [topological space](/nodes/dg%3Atopological-space) $(X, \\mathcal{T})$ is a set $X$ equipped with a family of open sets $\\mathcal{T}$; $\\mathcal{T}$ is closed under arbitrary unions and finite intersections and contains $X$ and $\\emptyset$. The definition of compactness uses only this most primitive topological material, the “open set”.
- **The subspace topology**: when $A \\subset X$ is regarded as a subspace, its open sets are of the form $U \\cap A$ (with $U$ an open set of $X$).
- **Covers, finite covers and subcovers**: a family of subsets $\\mathcal{U}$ of $X$ with $\\bigcup_{U \\in \\mathcal{U}} U = X$; then $\\mathcal{U}$ is called a cover of $X$; if $\\mathcal{U}$ has only finitely many members it is called a finite cover; a subfamily $\\mathcal{U}' \\subset \\mathcal{U}$ which is itself a cover is called a subcover of $\\mathcal{U}$.
- **Closed sets and complements**: the complement of an open set is a closed set, and closed sets are closed under finite unions and arbitrary intersections.

### Supporting

- **Hausdorff spaces (the separation axiom #T₂ (the Hausdorff property))**: $\\forall x \\ne y \\in X$ there exist disjoint open sets $O_1, O_2$ containing $x, y$ respectively. Common [topological spaces](/nodes/dg%3Atopological-space) such as $\\mathbb{R}^n$ are $T_2$ spaces; the indiscrete [topological space](/nodes/dg%3Atopological-space) is an example of a non-$T_2$ space.
- **Sequences, limits and cluster points**: $x \\in X$ is a limit of the sequence $\\{x_n\\}$ if for every open neighbourhood $O$ of $x$ there is $N$ such that $x_n \\in O$ whenever $n > N$; $x$ is a cluster point if every open neighbourhood of $x$ contains infinitely many points of $\\{x_n\\}$. A limit is necessarily a cluster point, but not conversely.
- **Sequential compactness**: a [topological space](/nodes/dg%3Atopological-space) is called sequentially compact if every sequence in it has a convergent subsequence. This notion is generalised, word for word, from analysis (every sequence in a bounded closed interval has a convergent subsequence).
- **First and second countability ($C_1, C_2$) and the separation axioms ($T_3, T_4$)**: a [metric space](/nodes/dg%3Ametric-space) satisfies $C_1$; $(\\mathbb{R}^n, \\mathcal{T}_u)$ is second countable.

### Further

- **Nets and subnets**: in a general [topological space](/nodes/dg%3Atopological-space) sequences are not a good form of expression; replacing sequences by nets gives a more complete theory of convergence.
- **Simplicial complexes**: the compactness of the polyhedron $|K|$ of a finite simplicial complex is a basic fact of algebraic topology.
- **The precedent in calculus**: a continuous function on a bounded closed interval is bounded, attains its extrema and is uniformly continuous — the earliest battleground of the idea of compactness.

---

## Motivation

### Motivation for introducing it

The introduction of compactness can be traced along several threads:

- **A thread internal to the discipline (analysis)**: in analysis it had long been known that a continuous function on a bounded closed interval is bounded, attains its maximum and minimum, and is uniformly continuous. The proofs of all these conclusions use the same fact: **every sequence in a bounded closed interval has a convergent subsequence**. This property later came to be called “sequential compactness” (self-sequential-compactness), and it generalises word for word to a general [topological space](/nodes/dg%3Atopological-space). Another notion characterising the same feature of a closed interval is “compactness” — which looks less natural and intuitive than sequential compactness, but expresses the topological character better: in a [topological space](/nodes/dg%3Atopological-space) sequences are not a good form of expression, whereas **the formulation of compactness in terms of open sets is more natural from the topological point of view**.
- **An aesthetic/structural thread**: the passage from sequential compactness to compactness replaces a property depending on the order structure of the natural numbers (“a sequence converges”) by a purely open-set (purely topological) property, “open cover — finite subcover”. The advantage is that the notion then makes sense in an arbitrary [topological space](/nodes/dg%3Atopological-space), no longer depending on a metric or on countability.
- **A thread from outside**: in differential geometry and general relativity, compactness is a prerequisite for discussing global properties of a [manifold](/nodes/dg%3Amanifold) (the area of a closed surface, its total curvature, the existence of [partitions of unity](/nodes/dg%3Apartition-of-unity)).

### Motivation for the construction

The “seed” of the notion of compactness is sequential compactness in analysis: the Bolzano–Weierstrass statement that “a bounded sequence has a convergent subsequence”. Its development went through the following stages:

1. **The seed stage — sequential compactness**: originally a space satisfying “every open cover has a finite subcover” was called **sequentially compact**, and only a sequentially compact [metric space](/nodes/dg%3Ametric-space) was called a **compact space**.
2. **The evolution of terminology**: in recent literature such a space (every open cover has a finite subcover) is simply called compact. Some references (such as tom Dieck’s textbook on algebraic topology) call the same property *quasi-compact*.
3. **The modern canonical form**: the form that prevails today is — a [topological space](/nodes/dg%3Atopological-space) $X$ is compact if and only if **every open cover of $X$ has a finite subcover**. For a [metric space](/nodes/dg%3Ametric-space) sequential compactness and compactness are equivalent (see “Equivalent expressions”), so the modern terminology and the classical intuition agree completely on the most important stage ([metric spaces](/nodes/dg%3Ametric-space) and Euclidean space).

---

## Form

### Canonical general form

**Definition (open covers and finite subcovers)**: let $\\{O_\\alpha\\}$ be an open cover of $A \\subset X$. If $\\{O_\\alpha\\}$ has a subset $\\{O_{\\alpha_1}, \\dots, O_{\\alpha_n}\\}$ consisting of finitely many of its elements that also covers $A$, then $\\{O_\\alpha\\}$ is said to have a finite subcover.

**Definition (compact)**: $A \\subset X$ is called compact if every open cover of it has a finite subcover.

(Equivalently: a [topological space](/nodes/dg%3Atopological-space) $X$ is called compact if every open cover of it has a finite subcover.)

**Proposition (a criterion for the compactness of a subset)**: $A$ is a compact subset of $X$ $\\iff$ every open cover of $A$ in $X$ (a cover by open sets of $X$) has a finite subcover. In practice this criterion is often more convenient than the definition.

A word on “the compactness of a subset”: if a subset $A$ of a [topological space](/nodes/dg%3Atopological-space) $X$ is compact as a subspace, it is called a compact subset of $X$; conceptually no new idea is involved.

### Analysis of the necessary conditions

Taking the core theorem “a compact subset of a $T_2$ space is closed” as the example, let us examine the conditions one by one:

- **What happens if the $T_2$ condition is dropped?** $T_2$ guarantees that any two points can be separated by disjoint open sets, and is the engine of the proof. The indiscrete [topological space](/nodes/dg%3Atopological-space) (in which no two points can be separated) is the typical example of a non-$T_2$ space, and in such a space “compact $\\Rightarrow$ closed” may fail.
- **Can compactness be dropped?** Beware of thinking that a closed set must be compact: even in $\\mathbb{R}$ there are non-compact closed sets (for example $\\mathbb{R}$ itself is closed but not compact). Compactness and closedness are closely related, but not equivalent.
- For “in $\\mathbb{R}^n$, compact $\\iff$ bounded and closed”: drop boundedness and $\\mathbb{R}$ is a counterexample — closed but not compact; drop closedness and $(0,1]$ is not compact — the open cover $\\{(1/n, 2) \\mid n \\in N\\}$ has no finite subcover.

### Equivalent expressions

1. **The open-cover form (the definition)**: every open cover has a finite subcover.
2. **The closed-set-intersection form**: taking complements shows that if $X$ is compact, then among any family of closed sets with empty intersection there must be **finitely many** members with empty intersection. Equivalently: $X$ is compact $\\iff$ every family of closed sets of $X$ with the finite intersection property (every finite subfamily has non-empty intersection) has non-empty intersection.
3. **The sequential form for [metric spaces](/nodes/dg%3Ametric-space)**: when $X$ is a [metric space](/nodes/dg%3Ametric-space), $X$ is compact $\\iff$ every sequence $\\{x_n\\}$ has a convergent subsequence (sequential compactness); $\\iff$ every nested sequence of non-empty closed subsets $F_n \\supset F_{n+1}$ has non-empty intersection.
4. **The cluster-point form for second countable spaces**: if $A \\subset X$ is compact, then every sequence in $A$ has a cluster point in $A$; conversely, if $X$ is second countable and every sequence in $A$ has a cluster point in $A$, then $A$ is compact. In particular, every infinite subset of a compact space has a cluster point (the Bolzano–Weierstrass property).
5. **The net form**: $X$ is compact if and only if every net in $X$ has a convergent subnet (a cluster value). This is the correct generalisation of the sequential form to a general [topological space](/nodes/dg%3Atopological-space).

An important boundary remark: for a general (non-metrizable) [topological space](/nodes/dg%3Atopological-space), sequential compactness and compactness are **not** equivalent, and usually only the notion of compactness is discussed.

### Kinds of statement

The division of labour within the family of compactness notions:

- **Compact**: the topic of this note — every open cover has a finite subcover.
- **Relatively compact**: a set $A$ in $X$ is called relatively compact if its closure $\\bar{A}$ is compact.
- **Sequentially compact**: every sequence has a convergent subsequence; equivalent to compactness for [metric spaces](/nodes/dg%3Ametric-space).
- **Locally compact**: every point has a compact neighbourhood. A compact space is necessarily locally compact, and $\\mathbb{E}^n$ is locally compact too.
- **Paracompact**: another generalisation of compactness, see the “Generalizations” section.

### How are the relevant statements expressed in natural language?

- “Compact” in natural language: **this space has no freedom to “escape to infinity”** — however extravagantly you try to cover it with open sets, you can always pick out finitely many pieces that do the job.
- “A compact subset of a Hausdorff space is closed”: a “small” (compact) set in a space where “points can be separated” ($T_2$) cannot both contain its own limits and miss its boundary.
- “A continuous function on a compact space attains its extrema”: a problem about values at infinitely many points is compressed into a local problem on finitely many open sets.

### Reduction

Restating it in more basic language of set theory:

Dually (taking complements):

> $A$ is compact $\\iff$ for every family of closed sets $\\{F_\\alpha\\}$, if $A \\cap \\bigcap_\\alpha F_\\alpha = \\emptyset$, then there are already finitely many $F_{\\alpha_1}, \\dots, F_{\\alpha_n}$ with $A \\cap \\bigcap_{i=1}^n F_{\\alpha_i} = \\emptyset$.

This helps to see the essence: compactness is a purely set-theoretic assertion about the gap between “arbitrary intersection” and “finite intersection”; topology contributes only the open/closed dichotomy.

### Lifting

- Compactness is the abstraction of the notion of a “bounded closed set in $\\mathbb{R}$”: the notion of compactness is precisely the topological abstraction of the notion of a bounded closed subset of $\\mathbb{R}^n$.
- From the categorical point of view, compactness is a property of the category of [topological spaces](/nodes/dg%3Atopological-space) preserved by continuous maps (the image of a compact space under a continuous map is compact), and is therefore a **topological property** (a topological invariant).
- The Тихонов (Tychonoff) theorem generalises compactness from finite products to arbitrary products: under the product topology, the product of an arbitrary family of compact spaces is again compact — this is the identity of compactness in “higher-dimensional” theory.

### Understanding through links with similar objects

- **Compact vs sequentially compact**: two formalisations of the same classical intuition — one using open covers (the topological style), the other using sequences (the analytic style). For a [metric space](/nodes/dg%3Ametric-space) the two coincide; in a general space they part company. Understanding “why sequences are not a good tool in a general [topological space](/nodes/dg%3Atopological-space)” explains why the definition of compactness uses the open-cover form.
- **Compact vs closed**: closedness is the “intrinsic completeness of the boundary” relative to the ambient space, whereas compactness is “absolute smallness”. A $T_2$ ambient space welds the two together: compact $\\Rightarrow$ closed.
- **Compact vs connected**: both are among the most basic topological properties, and both are productive (preserved by products), but compactness is not hereditary (the closed interval $[a,b]$ is compact while its subset $(a,b)$ is not).

---

## Proof

This section gives detailed proofs of the core theorems about compactness.

### Proof sketch

- **The closed interval $[a,b]$ is compact**: examine “the part that can be covered by finitely many sets starting from the left endpoint”, and use the supremum to push all the way to the right endpoint in one stroke.
- **In a $T_2$ space, compact $\\Rightarrow$ closed**: for each exterior point $x$, use $T_2$ to separate out a neighbourhood disjoint from the compact set — compactness compresses “separate once for each $y$” into “the intersection of finitely many separations”.
- **The continuous image is compact**: pull an open cover of the image back to an open cover of the domain by taking preimages, extract a finite subcover and push it forward again.
- **Products are compact**: use the “tube neighbourhood lemma” to inflate a finite cover of $X \\times \\{y\\}$ to a cover of $X \\times V_y$, and then use the compactness of $Y$ to make it finite.

### Theorem 1: the closed interval $[a,b]$ is compact

**Proof** (the classical supremum argument): let $\\{U_\\alpha\\}$ be an open cover of the interval $[a,b]$; without loss of generality each element $U_\\alpha$ of the cover may be taken to be an interval $(c_\\alpha, d_\\alpha)$ (apart from the two half-open intervals $[a, a')$ and $(b', b]$). Let $P$ be the set of numbers $x$ such that $x \\in [a,b]$ and $[a,x]$ can be covered by finitely many of the $U_\\alpha$. Then if $x \\in P$ and $y < x$, $y$ also belongs to $P$. Since $a$ belongs to the element $[a,a')$ of the cover (with $a' > a$), the set $P$ contains more than the single point $a$. Let $x_0 = \\sup P > a$. If $x_0 < b$, then $x_0$ lies in some interval $U_{\\alpha_0} = (c_{\\alpha_0}, d_{\\alpha_0})$, that is, $c_{\\alpha_0} < x_0 < d_{\\alpha_0}$.
Take $y, z$ with $c_{\\alpha_0} < y < x_0 < z < d_{\\alpha_0}$; then $y \\in P$, that is, finitely many sets $U_\\beta$ cover $[a,y]$, and hence $[a,z]$ is also covered by finitely many sets $U_\\beta$, contradicting the fact that $x_0$ is the supremum of $P$. Hence $x_0 = b$; then $b' < b$, and taking $b' < y < b$ we get $y \\in P$, and $[a,y]$ is covered by finitely many $U_\\beta$, so together with $(b',b]$ the whole of $[a,b]$ is covered by finitely many sets. $\\blacksquare$

This is the classical **Heine–Borel theorem** of calculus: the unit interval $I = [0,1]$ is compact.

### Theorem 2: a compact subset of a $T_2$ space is closed

**Proof**: let $(X, \\mathcal{T})$ be a $T_2$ space and $A \\subset X$ compact. Assume without loss of generality that $A \\ne \\emptyset$; it suffices to prove that $X - A \\in \\mathcal{T}$, that is, that $\\forall x \\in X - A$ there is an open set $O$ with $x \\in O \\subset X - A$. Since $X$ is a $T_2$ space, after $x$ is fixed, $\\forall y \\in A$ there are open sets $O_y, G_y \\in \\mathcal{T}$ with $x \\in O_y$, $y \\in G_y$ and $O_y \\cap G_y = \\emptyset$. Letting $y$ run over $A$ gives an open cover $\\{G_y \\mid y \\in A\\}$ of $A$. The compactness of $A$ guarantees that it contains a finite subcover $\\{G_{y_1}, \\cdots, G_{y_n}\\}$. Put $O = O_{y_1} \\cap \\cdots \\cap O_{y_n}$; then $O$ is an open set (a finite intersection), contains $x$, and satisfies $O \\cap A = \\emptyset$, that is, $x \\in O \\subset X - A$. Hence $A$ is closed. $\\blacksquare$

The key point: **“finiteness” saves openness** — the intersection of infinitely many $O_y$ need not be open, but compactness replaces it by a finite intersection.

### Theorem 3: a closed subset of a compact space is compact

**Proof**: let $X$ be a compact [topological space](/nodes/dg%3Atopological-space) and $A$ a closed subset of $X$. It suffices to prove that every open cover $\\mathcal{U}$ of $A$ in $X$ has a finite subcover. Since $A$ is closed, $A^c$ is open, and adding $A^c$ to $\\mathcal{U}$ gives an open cover of $X$. Since $X$ is compact, it has a subcover $\\{U_1, \\dots, U_n, A^c\\}$. Hence $\\{U_1, \\dots, U_n\\}$ is a finite subcover of $\\mathcal{U}$ (covering $A$). $\\blacksquare$

(Combined with Theorem 2 in the converse direction: in a compact space, the closed subsets are exactly the compact subsets.)

### Theorem 4: continuous maps preserve compactness

**Proposition**: let $A \\subset X$ be compact and $f: X \\to Y$ continuous; then $f[A] \\subset Y$ is compact.

**Proof**: let $\\{O_\\alpha\\}$ be any open cover of $f[A]$. The continuity of $f$ guarantees that $f^{-1}[O_\\alpha]$ is open, so $\\{f^{-1}[O_\\alpha]\\}$ is an open cover of $A$. Since $A$ is compact there is a finite subcover $\\{f^{-1}[O_1], \\cdots, f^{-1}[O_n]\\}$, and hence $\\{O_1, \\cdots, O_n\\}$ is a finite subcover of $\\{O_\\alpha\\}$. Therefore $f[A]$ is compact. $\\blacksquare$

**Corollary 1**: compactness is a topological property (this also follows directly from the definition); a [homeomorphism](/nodes/dg%3Ahomeomorphism) preserves the compactness of subsets.

**Corollary 2 (the extreme value theorem for continuous functions on a compact space)**: a continuous function $f: X \\to \\mathbb{R}$ defined on a compact space is bounded, and attains its maximum and minimum.

*Proof*: by Theorem 4, $f(X)$ is a compact subspace of $\\mathbb{R}^1$ and hence a closed set; if $f(X)$ were unbounded, the family of intervals $U_n = (-n, n)$ would cover $f(X)$ without a finite subcover, a contradiction. Let $A = \\sup_{x \\in X} f(x)$ and $B = \\inf_{x \\in X} f(x)$; then $A, B$ are both points of contact of $f(X)$, and since $f(X)$ is closed we have $A, B \\in f(X)$, that is, the extrema are attained. $\\blacksquare$

### Theorem 5: the Heine–Borel theorem (higher-dimensional form)

**Theorem**: $A \\subset \\mathbb{R}^n$ is compact if and only if it is bounded and closed.

**Sketch of the proof**: ($\\Rightarrow$) let $A$ be compact. Since $\\mathbb{R}$ is a $T_2$ space, Theorem 2 shows that $A$ is closed; also $\\{(-n, n) \\mid n \\in \\mathbb{N}\\}$ is an open cover of $A$, and compactness guarantees a finite subcover, so $A \\subset (-m, m)$, that is, $A$ is bounded. ($\\Leftarrow$) Boundedness gives $A \\subset [-M, M]$; the closed interval is compact, and a closed subset ($A$) of a compact space is compact (Theorem 3), and then the product and closed-subset properties give the conclusion. $\\blacksquare$

Consequently: a bounded closed interval, the sphere $S^n$ and the solid ball $D^n$ are all compact.

### Theorem 6: the product theorem for compactness

**Lemma (tube neighbourhood)**: let $A$ be a compact subset of $X$ and $y \\in Y$; if $W$ is a neighbourhood of $A \\times \\{y\\}$ in the product space $X \\times Y$, then there are open neighbourhoods $U$ of $A$ and $V$ of $y$ with $U \\times V \\subset W$.

**Theorem**: if $X$ and $Y$ are both compact, then $X \\times Y$ is compact as well.

**Proof**: let $\\mathcal{U}$ be an open cover of $X \\times Y$. $\\forall y \\in Y$, $X \\times \\{y\\} \\cong X$ is compact, so the restriction of $\\mathcal{U}$ to $X \\times \\{y\\}$ has a finite subcover whose union $W_y$ is a neighbourhood of $X \\times \\{y\\}$; by the lemma there is an open neighbourhood $V_y$ of $y$ with $X \\times V_y \\subset W_y$, that is, $X \\times V_y$ is covered by finitely many open sets of $\\mathcal{U}$. The family $\\{V_y \\mid y \\in Y\\}$ is an open cover of the compact space $Y$ and has a subcover $\\{V_{y_1}, \\cdots, V_{y_m}\\}$, so $X \\times Y = \\bigcup_{i=1}^m (X \\times V_{y_i})$, each piece of which is covered by finitely many open sets of $\\mathcal{U}$. Hence $\\mathcal{U}$ has a finite subcover. $\\blacksquare$

For the [metric space](/nodes/dg%3Ametric-space) case there is a more intuitive sequential proof: consider the sequence $z_n = (x_n, y_n)$; by the compactness (sequential compactness) of $X$ extract a convergent subsequence $\\{x_{n_k}\\}$, then by the compactness of $Y$ extract a convergent subsequence from $\\{y_{n_k}\\}$; the corresponding subsequence of $z_n$ then converges, so $X \\times Y$ is sequentially compact, and a [metric space](/nodes/dg%3Ametric-space) that is sequentially compact is compact. The conclusion of the theorem extends easily to finite products; for infinite products there is the **Тихонов theorem**: if the topology on $\\prod_{\\lambda \\in \\Lambda} X_\\lambda$ is the product topology, then whenever every $X_\\lambda$ is compact, $\\prod_{\\lambda \\in \\Lambda} X_\\lambda$ is compact as well (the proof uses Zorn’s lemma or a logically equivalent proposition).

### Theorem 7: in a [metric space](/nodes/dg%3Ametric-space), sequentially compact $\\iff$ compact

**($\\Rightarrow$ sequentially compact $\\Rightarrow$ compact)** Let $(X, d)$ be a sequentially compact [metric space](/nodes/dg%3Ametric-space) and $\\mathcal{U}$ an open cover of it. Assume without loss of generality that $\\mathcal{U}$ does not contain $X$, so that it has a Lebesgue number $L(\\mathcal{U})$. Take a positive number $\\delta < L(\\mathcal{U})$ and let $A = \\{a_1, \\dots, a_n\\}$ be a $\\delta$-net for $X$; then $\\bigcup_{i=1}^n B(a_i, \\delta) = X$, and by the property of the Lebesgue number, $\\forall i$ there is $U_i \\in \\mathcal{U}$ with $B(a_i, \\delta) \\subset U_i$. Hence $\\{U_1, \\dots, U_n\\}$ is a finite subcover of $\\mathcal{U}$.

**($\\Leftarrow$ compact $\\Rightarrow$ sequentially compact)** In a compact space there must be a point $x$ every neighbourhood of which contains infinitely many terms of $\\{x_n\\}$ (otherwise some neighbourhood of every point contains only finitely many terms, and these form an open cover without a finite subcover, a contradiction); then, using the $C_1$ property of a [metric space](/nodes/dg%3Ametric-space) to take a countable decreasing neighbourhood basis, one can extract a convergent subsequence.

Putting the two together: **in a [metric space](/nodes/dg%3Ametric-space), sequentially compact $\\iff$ compact**. As a corollary one obtains a basic property of the real numbers: a nested sequence of closed intervals on the real line has a common point.

### Theorem 8: from compactness to [homeomorphism](/nodes/dg%3Ahomeomorphism) (an important applied theorem)

**Theorem**: let $f: X \\to Y$ be a continuous one-to-one correspondence with $X$ compact and $Y$ a Hausdorff space; then $f$ is a [homeomorphism](/nodes/dg%3Ahomeomorphism).

**Proof**: it suffices to show that $f$ is a closed map. Let $A$ be a closed subset of $X$; by Theorem 3, $A$ is compact; by Theorem 4, $f(A)$ is a compact subset of $Y$; and by Theorem 2 (a compact subset of a $T_2$ space is closed), $f(A)$ is a closed subset of $Y$. $\\blacksquare$

The accompanying separation conclusions: a compact subset of a Hausdorff space and any point have disjoint neighbourhoods; disjoint compact subsets of a Hausdorff space have disjoint neighbourhoods; hence **a compact Hausdorff space satisfies the axioms $T_3, T_4$**.

---

## Applications

### Direct applications

**Example 1 (practice with the definition of compactness)**:

- A singleton $A = \\{x\\}$ is necessarily compact: if $\\{O_\\alpha\\}$ is any open cover of $A$, some $O_{\\alpha_1}$ contains $x$, and $\\{O_{\\alpha_1}\\}$ is a finite subcover.
- $(0, 1] \\subset \\mathbb{R}$ is not compact: $\\{(1/n, 2) \\mid n \\in N\\}$ is an open cover of it with no finite subcover. Similarly, every open or half-open interval in $\\mathbb{R}$ is non-compact.
- $\\mathbb{R}$ is not compact: $\\{(-\\infty, a) \\mid a \\in \\mathbb{R}\\}$ and $\\{(n, n+2) \\mid n \\in \\mathbb{Z}\\}$ are both open covers without a finite subcover.
- A discrete [topological space](/nodes/dg%3Atopological-space) is compact $\\iff$ it is finite (every point is open, and if the space is infinite the cover by singletons has no finite subcover).
- A [topological space](/nodes/dg%3Atopological-space) with only finitely many points, or with only finitely many open sets, is compact. $(\\mathbb{R}, \\tau_f)$ (the cofinite topology) is compact: any open cover contains a non-empty open set $U$, whose complement is finite, and finitely many further open sets cover $U^c$.

**Example 2 (deciding a topological invariant — the model case of “a new tool relieving an old pain”)**: consider $(\\mathbb{R}^2, \\mathcal{T}_u)$. Let $S^1$ be any circle in $\\mathbb{R}^2$; it is plainly bounded and closed, hence compact (Heine–Borel). Since continuous maps preserve compactness, while $\\mathbb{R}$ and any of its open intervals are not compact, **$S^1$ cannot be [homeomorphic](/nodes/dg%3Ahomeomorphism) to $\\mathbb{R}$ or to any of its open intervals**; similarly, no closed interval in $\\mathbb{R}$ can be [homeomorphic](/nodes/dg%3Ahomeomorphism) to $\\mathbb{R}$ or to any of its open intervals. Without any constructive argument, the decision is reached by the single sentence “compactness is a topological invariant”.

**Example 3 (finite simplicial complexes)**: if $K$ is a finite simplicial complex, then the polyhedron $|K|$ is a finite union of compact subspaces $\\sigma$ (simplices) and is therefore compact. Conversely, if a subset $A$ of $|K|$ is compact, then $A$ is contained in the geometric realisation of some finite subcomplex of $K$ (otherwise one could pick a point inside each of infinitely many simplices to form an infinite closed discrete subset, contradicting the fact that every infinite subset of a compact space has a limit point). This settles the compactness of “finite complexes” in algebraic topology once and for all.

### Indirect applications

- **A unified proof of propositions in analysis**: the classical conclusions of analysis — that a continuous function on a bounded closed interval (and on a general compact space) is bounded, attains its extrema, and that the limit of a uniformly convergent sequence is still continuous — are all supported uniformly by compactness. The proof that a continuous function on a sequentially compact [topological space](/nodes/dg%3Atopological-space) is bounded and attains its extrema can be carried out in complete imitation of the method used in analysis.
- **Differential geometry — area and integration theory**: on an oriented two-dimensional Riemannian [manifold](/nodes/dg%3Amanifold) $(M, g)$, the area $A(D)$ of a compact closed region $D$ is defined by a double integral over oriented charts and is independent of the choice of charts; precisely because $D$ is compact can one split $D$ into the union of finitely many subregions $D_a$, each lying inside some admissible chart (the precise procedure uses the [partition of unity](/nodes/dg%3Apartition-of-unity) theorem), so that $A(D) = \\sum_{a=1}^N A(D_a)$ is well defined. Compactness turns “infinite subdivision — infinite summation” into “assembly from finitely many pieces”.
- **Differential geometry — the construction of the [partition of unity](/nodes/dg%3Apartition-of-unity) theorem**: when a [manifold](/nodes/dg%3Amanifold) $M$ has a countable topological basis and so on, one can construct a sequence of compact subsets $K_1 \\subset K_2^\\circ \\subset K_2 \\subset K_3^\\circ \\subset \\cdots$ with $M = \\bigcup_i K_i$; its use is to refine an arbitrary open cover of $M$ into a locally finite open cover — the key lemma for the [partition of unity](/nodes/dg%3Apartition-of-unity) theorem (and hence for the tools of global analysis on a [manifold](/nodes/dg%3Amanifold)).
- **Differential geometry — the theory of the total curvature of compact surfaces**: for a compact two-dimensional sub[manifold](/nodes/dg%3Amanifold) of $\\mathbb{R}^3$, the total absolute curvature satisfies $\\int_M |K|\\, dA \\ge 2\\pi(4 - \\chi(M))$ (where $\\chi$ is the Euler characteristic); when equality holds the surface is called tight — it “has only as much positive curvature as it must have”. Compactness (which guarantees that the integral is finite and the extrema are attained) is the premise of such global theorems. The tightness of a compact surface is invariant under projective transformations of the ambient space.
- **Algebraic topology — fixed point theorems**: every compact, locally contractible space embeddable in $\\mathbb{R}^n$ (including compact [manifolds](/nodes/dg%3Amanifold) and finite CW complexes) is a retract of some finite simplicial complex; the compactness hypothesis is essential — for example the translation $\\tau = 1$ of $\\mathbb{R}$ has no fixed point.
- **General relativity**: in discussing global properties of spacetime, the cooperation of the $T_2$ separation axiom with compactness is a basic tool; there are even non-$T_2$ examples of spacetimes aimed at physical applications (Hawking and Ellis).

---

## Generalizations

- **The conditions can be relaxed: from “globally compact” to “locally compact at each point”**. Compactness is after all too strong: even Euclidean space $\\mathbb{E}^n$ is not compact. A [topological space](/nodes/dg%3Atopological-space) $X$ is called **locally compact** if every point has a compact neighbourhood, that is, $\\forall x \\in X$. A compact space is locally compact, and $\\mathbb{E}^n$ is locally compact too. Local compactness combined with $T_2$ is extremely powerful: a locally compact Hausdorff space satisfies the axiom $T_3$, and the compact neighbourhoods of each point form a neighbourhood basis for it.
- **Paracompactness**: another generalisation of compactness, commonly used in topology and differential geometry. Basic facts: a compact space is paracompact; a paracompact Hausdorff space satisfies the axiom $T_4$; a locally compact Hausdorff space satisfying $C_2$ is paracompact (hence $\\mathbb{E}^n$ is paracompact); a [metric space](/nodes/dg%3Ametric-space) is paracompact.
- **One-point compactification (the Alexandroff compactification)**: for a non-compact Hausdorff space $X$, add a new element $\\Omega$ to obtain $X_*$, and prescribe the topology $\\tau_* = \\tau \\cup \\{X_*\\} \\cup \\{X_* \\setminus K \\mid K \\text{ is a compact subset of } X \\text{ }\\}$; one verifies that $\\tau_*$ really is a topology and induces the original topology on $X$ — the standard device for “completing a non-compact space to a compact one”.
- **The conclusion can be generalised: the Тихонов theorem**: the compactness of arbitrary (infinite) products — under the product topology the product of an arbitrary family of compact spaces is again compact. This is the deepest generalisation in the theory of compactness, and is equivalent to the axiom of choice (Zorn’s lemma).
- **Generalising closure under operations**: a Hausdorff space which is the union of finitely many of its own compact subspaces is compact; the intersection of arbitrarily many compact subsets of a Hausdorff space is also compact.
- **Related open/deep problem directions**: the equivalence of the Тихонов theorem with the axiom of choice; compactification theory (such as deeper properties of the Stone–Čech compactification); compact groups and global structure on compact [manifolds](/nodes/dg%3Amanifold). These directions lie beyond the scope of this note.

---

## Common misconceptions

1. **“A closed set is necessarily compact”**. Wrong. Even in $\\mathbb{R}$ there are non-compact closed sets ($\\mathbb{R}$ itself is one). Compactness and closedness are closely related but not equivalent; their correct relationship is given by two theorems: in a $T_2$ space compact $\\Rightarrow$ closed; in a compact space closed $\\Rightarrow$ compact. Beginners easily overlook that the first conclusion needs a $T_2$ ambient space and the second needs the ambient space itself to be compact.
2. **“Compactness is hereditary”**. Wrong. The closed interval $[a,b]$ is compact, but its subset $(a,b)$ is not. What compactness does have is **productivity** (preserved by products) and **closed heredity** (a closed subset of a compact space is compact), not full heredity.
3. **“Sequentially compact is the same as compact”**. True for a [metric space](/nodes/dg%3Ametric-space), false in a general [topological space](/nodes/dg%3Atopological-space). Beginners easily overlook the “metric” hypothesis: for a general [topological space](/nodes/dg%3Atopological-space) sequential compactness and compactness are not equivalent, which is also why standard textbooks choose to discuss only the notion of compactness.
4. **“A space is non-compact only if no finite collection of points can cover it”**. To disprove compactness one must construct **one concrete open cover** and show that it has no finite subcover, for instance $\\{(1/n, 2)\\}$ for $(0,1]$ and $\\{(-\\infty, a)\\}$ for $\\mathbb{R}$. Being non-compact does not mean that “no cover works”, but that “some cover fails”.
5. **“Compact and bounded are the same thing”**. Boundedness is a metric notion depending on an ambient distance; compactness is a purely topological notion. The two coincide only on a special stage such as $\\mathbb{R}^n$ (together with $T_2$ and completeness), by the Heine–Borel theorem. Talking about “bounded” without a metric is meaningless.

---

## Insights

- **“Turning the infinite into control over the finite”**: almost all applications of compactness follow the same pattern — first compress a problem involving the infinite (infinitely many open sets, infinitely many points) into a finite situation by compactness, and then finish with the obviousness of the finite situation. The “finite exemption rights” such as “a finite intersection of open sets is open” and “a finite union preserves compactness” are exactly where the engine lies.
- **A “mathematics can be seen this way” moment**: sequential compactness (the language of sequences) and compactness (the language of open covers) lead to the same place for a [metric space](/nodes/dg%3Ametric-space), but part company in a general space. This suggests that **choosing the language in which to express a notion is itself a mathematical decision** — sequences depend on the order structure of the natural numbers, open covers only on the topological structure; when intuition and analysis conflict, it is often not the theorem that is wrong but the language that is ill chosen.
- **A definition “uglier” than intuition, but “more correct” than intuition**: at first sight the open-cover definition of compactness looks clumsy (who would think of counting open covers?), far less intuitive than “every sequence has a convergent subsequence”. But it buys maximal universality of the domain of definition — exactly the script that topology performs over and over: sacrifice surface naturalness for essential generality.
- **A resonance with the experience of learning calculus**: as a beginner one meets “a continuous function on a closed interval attains its extrema” as an isolated theorem; after encountering compactness one understands that it is the shadow cast by the deeper structure of compactness, and that “closed interval” is merely the name of a compact set in $\\mathbb{R}$.

---

## Summary

### Idea

**Compactness = the ability to compress control over infinitely many open sets into finite control; it is the purely topological abstraction of the metric intuition of a “bounded closed set in $\\mathbb{R}^n$”.**

### Methods

| Technique | Description | Where it is used |
|---|---|---|
| The supremum argument | use $\\sup$ to push a “finitely coverable region” all the way to cover the whole interval | Theorem 1 ($[a,b]$ is compact) |
| The “exemption rights” of finite intersections/unions | an infinite intersection need not be open while a finite one is; a finite union preserves compactness | Theorem 2, the lemma of Theorem 6 |
| Duality by taking complements | open covers ↔ the finite intersection property for families of closed sets | Form · Reduction; the nested closed set characterisation |
| Proof by contradiction | assume no cluster point / no convergent subsequence and construct an open cover without a finite subcover | Theorem 7 (compact $\\Rightarrow$ sequentially compact) |
| The pullback (preimage) technique | pull a cover of the image space back to the domain | Theorem 4 (a continuous image is compact) |
| $\\delta$-nets and Lebesgue numbers | the core tools for “sequentially compact $\\Rightarrow$ compact” in a [metric space](/nodes/dg%3Ametric-space) | Theorem 7 |
| The tube neighbourhood lemma | the key geometric fact in the proof of the product theorem | Theorem 6 |
| The topological-invariant argument | use “a [homeomorphism](/nodes/dg%3Ahomeomorphism) preserves compactness” to rule out the existence of a [homeomorphism](/nodes/dg%3Ahomeomorphism) | Applications · Example 2 |

---

## Looking back and asking

1. Why is “every sequence has a convergent subsequence” not enough, in a general [topological space](/nodes/dg%3Atopological-space), to replace “every open cover has a finite subcover”? Can one construct a counterexample using the indiscrete topology or an uncountable discrete space?
2. Where in the proof of Theorem 2 is $T_2$ used? If only $T_1$ is assumed, how does the conclusion collapse? (Hint: consider the indiscrete [topological space](/nodes/dg%3Atopological-space).)
3. Why must the Тихонов theorem depend on the axiom of choice? Try to understand the connection between “choosing one point in each of infinitely many coordinates” and Zorn’s lemma.
4. Locally compact + $C_2$ + Hausdorff $\\Rightarrow$ paracompact: what kind of pathological space does each link of this chain of hypotheses rule out?
5. What role does compactness play in the “[partition of unity](/nodes/dg%3Apartition-of-unity) theorem” of differential geometry? If a [manifold](/nodes/dg%3Amanifold) is not second countable, at which step does the [partition of unity](/nodes/dg%3Apartition-of-unity) fail?
6. Exercises (from the textbooks cited):
   - Prove that every infinite subset of a compact space has a cluster point (the Bolzano–Weierstrass property).
   - Prove that if $X$ is a non-compact [metric space](/nodes/dg%3Ametric-space), then there is a continuous unbounded function on it.
   - Prove that a compact [metric space](/nodes/dg%3Ametric-space) is separable, and hence a $C_2$ space.
   - Let $X$ be a Hausdorff space; prove that the intersection of arbitrarily many compact subsets of $X$ is also compact.
   - A family $\\mathcal{A}$ of subsets of $X$ is called centred if every finite subfamily of $\\mathcal{A}$ has non-empty intersection. Prove: $X$ is compact $\\iff$ every centred family of closed sets in $X$ has non-empty intersection.
   - If $X \\times Y$ is compact, then $X$ and $Y$ are both compact.

---

## References

1. \`梁灿彬、周彬（Liang Canbin, Zhou Bin）：微分几何入门与广义相对论（An Introduction to Differential Geometry and General Relativity）（三册合集 / three-volume set）\`
2. \`尤承业（You Chengye）：基础拓扑学讲义（Lectures on Basic Topology）\`
3. \`А. С. 米先柯、А. Т. 福明柯（A. S. Mishchenko, A. T. Fomenko）：微分几何与拓扑学简明教程（A Concise Course in Differential Geometry and Topology）\`
4. \`陈维桓（Chen Weihuan）：微分几何（Differential Geometry）\`
5. \`陈维桓（Chen Weihuan）：微分几何引论（Introduction to Differential Geometry）\`
6. Czes Kosniowski, *A First Course in Algebraic Topology*
7. Tammo tom Dieck, *Algebraic Topology*
8. Allen Hatcher, *Algebraic Topology*
9. \`J. R. Munkres：代数拓扑基础（Elements of Algebraic Topology）\`
10. Wolfgang Kühnel, *Differential Geometry: Curves — Surfaces — Manifolds* (Third Edition)`,

  'dg:metric-space': `## Metric spaces

> A metric space is one of the most basic spatial notions in mathematical analysis. It abstracts the “distance” of the real line and thereby provides a unified framework for defining limits, continuity, completeness and the other core notions of analysis on an arbitrary set. From Euclidean spaces to function spaces, metric spaces build a bridge between the finite-dimensional and the infinite-dimensional, and between the discrete and the continuous.

**Source.** The read-only snapshot \`G:/DifferentialGeometry/object/def/度量空间.md\` (see \`data/dg/\`).

---

**Source tags.** #analysis #topology #metric-space #foundational-concepts

---

## Prerequisites

### Essential knowledge

- **Foundations of set theory**: sets, subsets, unions, intersections, Cartesian products. The language of sets is the prerequisite for entering any mathematical structure.
- **The real number system**: the absolute value on the reals and its properties (the triangle inequality $|a+b| \\leq |a|+|b|$ is the germ of the notion of a metric).
- **Functions and maps**: maps from one set to another, injective, surjective and bijective maps.
- **The Euclidean distance in $\\mathbb{R}^n$**: $d(x,y)=\\sqrt{(x_1-y_1)^2+\\cdots+(x_n-y_n)^2}$; this is the most intuitive model of a metric space.

### Supporting knowledge

- **Limits of sequences**: the $\\varepsilon$-$N$ language—the limit in a metric space is the direct generalisation of that language.
- **Open and closed sets**: open and closed intervals in $\\mathbb{R}$ and their properties.
- **Foundations of linear algebra**: the notion of a [vector space](/nodes/bg%3Alinear%3Avector), which helps in understanding the relation between normed linear spaces and metric spaces.

### Further knowledge

- **Topological spaces**: a metric space is the most important special case of a [topological space](/nodes/dg%3Atopological-space)—every metric space naturally induces a topological structure.
- **Normed linear spaces**: a linear space carrying a norm, which naturally induces a metric. Banach spaces and Hilbert spaces are deepenings of this idea.
- **Functional analysis**: the completion of a metric space, the contraction mapping principle and so on are core tools of functional analysis.
- **Computational geometry and machine learning**: various distance metrics (Manhattan distance, cosine distance, Mahalanobis distance) are widely used in classification and clustering algorithms.

---

## Motivation

### Motivation for introducing them

**A line of thought internal to the discipline:**

In classical mathematical analysis the notions of a limit, of continuity and of convergence are all built on the real line $\\mathbb{R}$ or on Euclidean space $\\mathbb{R}^n$, and their core tools are the absolute value $|\\cdot|$ or the Euclidean norm $\\|\\cdot\\|$. But when mathematicians began to study function spaces (such as the set of all continuous functions on $[0,1]$), sequence spaces, or even more abstract sets, a natural question arose:

> Can a notion of “far and near” be defined on a completely arbitrary set, so that we can still speak of limits and continuity?

The answer is yes—all one needs is a “distance function” satisfying three plain axioms. This prompted the leap from “Euclidean distance, which depends on coordinates” to “an abstract, axiomatic distance”.

**A line of thought from external applications:**

- **Physics**: state transitions in a phase space need a metric in order to describe “how close two states are”.
- **Computer science**: algorithms such as cluster analysis, nearest-neighbour search and image matching all rely on a quantitative definition of distance.
- **Data science**: different metrics such as $L^1$, $L^2$ and the cosine distance suit different kinds of data features.

**An aesthetic and structural line of thought:**

The axiomatic metric space unifies convergence notions that look different—convergence of a sequence of numbers, uniform convergence of a sequence of functions, convergence of a sequence of points in $\\mathbb{R}^n$—and brings them all under the single framework of “convergence of a sequence of points in a metric space”. This unity is precisely what displays the simplicity and the power of mathematics.

### Motivation for the construction

Let us start from the most classical example—the Euclidean plane $\\mathbb{R}^2$—and watch how the notion of “distance” is abstracted step by step from concrete geometric intuition into a system of axioms.

**The seed stage: the Pythagorean theorem**

In $\\mathbb{R}^2$, the straight-line distance between two points $P=(x_1,y_1)$ and $Q=(x_2,y_2)$ is given by the Pythagorean theorem:
$$d(P,Q)=\\sqrt{(x_1-x_2)^2+(y_1-y_2)^2}.$$

**Three key properties become visible:**

1. **Non-negativity and identity**: a distance is never less than $0$, and two points have distance $0$ if and only if they coincide.
2. **Symmetry**: the distance from $P$ to $Q$ equals the distance from $Q$ to $P$.
3. **The triangle inequality**: the distance from $P$ to $Q$ does not exceed the distance from $P$ to some intermediate point $R$ plus the distance from $R$ to $Q$—the quantitative expression of “a straight line is the shortest path between two points”.

**Abstraction:**

If we detach these three properties from Euclidean space and take them as the defining axioms of “distance”, then any set equipped with a function satisfying these three axioms may be called a “metric space”. We can then define a distance on a function space:
$$d(f,g)=\\max_{x\\in[0,1]}|f(x)-g(x)|,$$
and a distance on a sequence space:
$$d(x,y)=\\sum_{n=1}^{\\infty}\\frac{1}{2^n}\\frac{|x_n-y_n|}{1+|x_n-y_n|},$$
—they all satisfy the same three axioms, so the notions of limit, continuity and so on can be carried over to these spaces without modification.

---

## Form

### The canonical general form

**Definition:** let $X$ be a non-empty set. If a map $d: X\\times X\\to \\mathbb{R}$ satisfies the following three axioms:

1. **Non-negativity and identity (positive definiteness):** $\\forall x,y\\in X,\\ d(x,y)\\geq 0$, and $d(x,y)=0 \\iff x=y$.
2. **Symmetry:** $\\forall x,y\\in X,\\ d(x,y)=d(y,x)$.
3. **The triangle inequality:** $\\forall x,y,z\\in X,\\ d(x,z)\\leq d(x,y)+d(y,z)$.

then $d$ is called a **metric (distance function)** on $X$, and $(X,d)$ is called a **metric space**.

---

### Analysis of the necessary conditions

This part concerns mainly the theorems related to metric spaces (such as the contraction mapping principle and the completeness theorem); here we first analyse the necessity of the individual conditions in the definition of a metric itself.

**Condition 1 (positive definiteness): what happens if it is deleted?**

If two distinct points were allowed to have distance $0$, the notion of a “limit point” would become blurred—a sequence could converge to two different points, because no distance can tell them apart. For example, on the set $X=\\{a,b\\}$ define $d(a,b)=0$; then the sequence $a,a,a,\\dots$ both “converges” to $a$ and “converges” to $b$, and the uniqueness of limits collapses.

**Condition 2 (symmetry): what happens if it is deleted?**

If $d(x,y)\\neq d(y,x)$, the notion of a neighbourhood becomes asymmetric—the $\\varepsilon$-neighbourhood of $x$ contains $y$, but the $\\varepsilon$-neighbourhood of $y$ need not contain $x$. This would make the notion of convergence unreasonable. In fact, “quasi-metric spaces” have been studied historically, but most results of analysis require symmetry.

**Condition 3 (the triangle inequality): what happens if it is deleted?**

Without the triangle inequality we cannot control a distance through an “intermediate point”. For example, even on $\\mathbb{R}$ one may define $d(x,y)=(x-y)^2$; it satisfies positive definiteness and symmetry, but $d(0,2)=4$, $d(0,1)=1$, $d(1,2)=1$, and $4\\not\\leq 1+1$, so the triangle inequality fails. The usual theory of limits (such as the $\\varepsilon$-$N$ language) can still be set up, but many important conclusions (such as the uniqueness of limits, whose proof uses the triangle inequality) can no longer be guaranteed.

---

### Equivalent formulations

**1. In the language of balls:** a metric space $(X,d)$ is equivalent to specifying on $X$ the family of all open balls $B(x,r)=\\{y\\in X \\mid d(x,y)<r\\}$ in such a way that the corresponding axioms for open sets induce a topology.

**2. In terms of a uniform structure:** a metric space can be regarded as a uniform space whose entourage system is generated by the $\\varepsilon$-neighbourhoods $U_\\varepsilon=\\{(x,y)\\mid d(x,y)<\\varepsilon\\}$.

**3. In terms of a countable neighbourhood base:** a metric space is first countable—every point $x$ has the countable neighbourhood base $\\{B(x,1/n)\\mid n\\in\\mathbb{N}\\}$.

---

### How are the relevant statements expressed in natural language?

- “The sequence of points $\\{x_n\\}$ converges to $x$”: when $n$ is large enough, the distance between $x_n$ and $x$ can be made arbitrarily small.
- “$X$ is complete”: there are no “holes”—every sequence of points that “ought to” converge (a Cauchy sequence) really does converge.
- “$X$ is compact”: every sequence of points has a convergent subsequence, or equivalently $X$ can be covered by finitely many balls of any given small radius.
- “The map $f$ is continuous”: when the input is close enough, the output is close enough too.

---

### A lower-dimensional formulation

Restating a metric space in the language of set theory and logic:

- A metric space $(X,d)$ is a set $X$ together with a binary real-valued function $d$ on it satisfying certain axioms of first-order logic.
- Convergence $x_n\\to x$ is expressed in the $\\varepsilon$-$N$ language as: $\\forall\\varepsilon>0,\\ \\exists N\\in\\mathbb{N},\\ \\forall n\\geq N,\\ d(x_n,x)<\\varepsilon$.
- The $\\varepsilon$-$\\delta$ definition of a continuous function $f:(X,d_X)\\to(Y,d_Y)$: $\\forall x\\in X,\\ \\forall\\varepsilon>0,\\ \\exists\\delta>0,\\ \\forall y\\in X,\\ d_X(y,x)<\\delta \\Rightarrow d_Y(f(y),f(x))<\\varepsilon$.

From the topological point of view: “metric space” = “set” + “a base of open balls” + “a topology with a countable neighbourhood base satisfying the Hausdorff separation property”.

---

### A higher-dimensional viewpoint

- **A metric space is a special case of a [topological space](/nodes/dg%3Atopological-space)**: every metric space $(X,d)$ naturally induces a topology—the topology generated by taking all open balls as a base, called the metric topology.
- **A metric space is a special case of a uniform space**: a metric space naturally induces a uniform structure, so that uniform continuity, total boundedness and similar notions can be handled uniformly.
- **A metric space is an object of a category**: taking metric spaces as objects and uniformly continuous maps (or contraction mappings) as morphisms yields various categories.
- **From metric spaces to normed linear spaces**: if $X$ is a linear space and the metric is induced by a norm (that is, $d(x,y)=\\|x-y\\|$), one obtains a normed linear space. If it is moreover complete, it is a Banach space.

---

## Proof

A metric space is itself a conceptual framework rather than a single theorem. We prove a few core conclusions below.

### 1. Uniqueness of the limit

**Theorem:** in a metric space $(X,d)$, if a sequence $\\{x_n\\}$ converges, then its limit is unique.

**Proof:** suppose that $x_n\\to a$ and $x_n\\to b$ with $a\\neq b$. Then $\\varepsilon = d(a,b)/2>0$. By the definition of convergence, $\\exists N_1$ such that $d(x_n,a)<\\varepsilon$ whenever $n\\geq N_1$, and $\\exists N_2$ such that $d(x_n,b)<\\varepsilon$ whenever $n\\geq N_2$. Taking $N=\\max\\{N_1,N_2\\}$, we get
$$d(a,b)\\leq d(a,x_N)+d(x_N,b)<\\varepsilon+\\varepsilon=2\\varepsilon=d(a,b),$$
a contradiction. Hence $a=b$. $\\square$

**Proof sketch:** if a sequence had two distinct limits, take half the distance between them as $\\varepsilon$; the triangle inequality then yields a contradiction.

### 2. Composition of continuous maps

**Theorem:** let $(X,d_X)$, $(Y,d_Y)$ and $(Z,d_Z)$ be metric spaces, let $f:X\\to Y$ be continuous at $x_0$ and let $g:Y\\to Z$ be continuous at $f(x_0)$. Then $g\\circ f$ is continuous at $x_0$.

**Proof:** take any $\\varepsilon>0$. Since $g$ is continuous at $f(x_0)$, there is $\\exists\\eta>0$ such that $d_Z(g(y),g(f(x_0)))<\\varepsilon$ whenever $d_Y(y,f(x_0))<\\eta$. Since $f$ is continuous at $x_0$, for this $\\eta$ there is $\\exists\\delta>0$ such that $d_Y(f(x),f(x_0))<\\eta$ whenever $d_X(x,x_0)<\\delta$. Hence $d_Z(g(f(x)),g(f(x_0)))<\\varepsilon$ whenever $d_X(x,x_0)<\\delta$. $\\square$

**Proof sketch:** the $\\varepsilon$-$\\delta$ definition of continuity can be chained together like links—control is passed on through the $\\eta$ of the intermediate space.

---

## Applications

### Direct applications

**Example 1 (the contraction mapping principle—a fixed-point theorem):** let $(X,d)$ be a complete metric space and let $T:X\\to X$ be a contraction mapping (that is, there is $\\lambda\\in[0,1)$ with $d(Tx,Ty)\\leq\\lambda d(x,y)$). Then $T$ has a unique fixed point.

This is one of the most classical applications of metric spaces. For example, take $X=\\mathbb{R}$ (complete) and $T(x)=\\cos x$. Although $\\cos$ is not a global contraction mapping, it satisfies the contraction condition on certain intervals, which guarantees the existence of a fixed point—this explains why $x=\\cos x$ has a unique solution.

**Example 2 (approximation in a function space):** on $C[0,1]$ (the set of all continuous functions on $[0,1]$) define the metric $d(f,g)=\\max_{x\\in[0,1]}|f(x)-g(x)|$. With respect to this metric, the polynomial approximation theorem (the Weierstrass approximation theorem) can be stated as: for every $f\\in C[0,1]$ there is a sequence of polynomials $\\{p_n\\}$ converging to $f$—that is, the set of polynomials is dense in $C[0,1]$.

### Indirect applications

- **In mathematics**: metric spaces provide the basic framework for the Banach fixed-point theorem in functional analysis and for the existence and uniqueness of solutions of ordinary differential equations (the Picard–Lindelöf theorem). In topology, the metrization theorem (Urysohn's theorem) characterises which [topological spaces](/nodes/dg%3Atopological-space) can be given a metric.
- **In physics**: the evolution of states in a phase space can be described by trajectories in a metric space. In general relativity, the metric on the spacetime [manifold](/nodes/dg%3Amanifold) (a [Riemannian metric](/nodes/manifold%3Achart-atlas)) describes the geometry of gravity directly.
- **In computer science**: the $k$-nearest-neighbour algorithm, $k$-means clustering and approximate nearest-neighbour search in vector databases all depend on the definition of various distance metrics. The edit distance (Levenshtein distance) is used in natural language processing to measure the similarity of strings. Tree-based index structures over metric spaces (such as VP-trees and BK-trees) are widely used for efficient similarity search.

---

## Generalisations

### Conditions that can be relaxed

- **Giving up symmetry**: one obtains a **quasi-metric space**, used in theoretical computer science to describe the semantic distance between programs.
- **Giving up the implication $d(x,y)=0\\Rightarrow x=y$ in positive definiteness**: one obtains a **pseudometric space**, used in functional analysis for structures induced by seminorms.
- **Strengthening the triangle inequality to $d(x,z)\\leq\\max\\{d(x,y),d(y,z)\\}$**: one obtains an **ultrametric space**, which has important applications in number theory ($p$-adic numbers) and in phylogenetics.

### Conclusions that can be generalised

- **Analysis on metric spaces** can be generalised to **topological [vector spaces](/nodes/bg%3Alinear%3Avector)**, to **uniform spaces** and to other, more general frameworks.
- **Completion**: every metric space can be completed uniquely (up to isometric isomorphism), and the construction is exactly the same as the construction of the real numbers from the rationals (equivalence classes of Cauchy sequences).
- **[Compactness](/nodes/dg%3Acompactness)**: in a metric space, compactness, limit-point compactness and sequential compactness are equivalent—a far-reaching generalisation of the Heine–Borel theorem and the Bolzano–Weierstrass theorem on $\\mathbb{R}$.

### Related open problems

- **The metrization problem**: given a [topological space](/nodes/dg%3Atopological-space), when does there exist a metric inducing its topology? (Urysohn's metrization theorem gives sufficient conditions, but a necessary and sufficient condition for a [topological space](/nodes/dg%3Atopological-space) to be metrizable is still a classical topic in topology.)
- **The embedding problem for Lipschitz distance spaces**: can every metric space be isometrically embedded into some $\\mathbb{R}^n$ or into some Banach space? What is the lower bound on the dimension of such an embedding? (This is connected with Bourgain's [embedding theorem](/nodes/dg%3Asmooth-embedding) and with the geometric complexity of the “NP-complete problem”, one of the Millennium Prize problems.)

---

## Common misconceptions

**Misconception 1: “a metric space is just Euclidean space.”**

This is the most common misunderstanding. In fact, Euclidean space is a drop in the ocean of metric spaces. Discrete metric spaces ($d(x,y)=1$ when $x\\neq y$), metrics on the $p$-adic numbers, metrics on function spaces—their geometric properties are utterly different from those of Euclidean space. What beginners tend to overlook is that the metric axioms allow far more “distances” than the straight-line distance we are used to.

**Misconception 2: “the triangle inequality is obvious and unimportant.”**

The triangle inequality is far from “obvious”—it is the most restrictive and the most crucial of the metric axioms. Many seemingly reasonable “distances” (such as the squared Euclidean distance $d(x,y)=(x-y)^2$ on $\\mathbb{R}$) fail to be metrics precisely because the triangle inequality fails. The triangle inequality lets us estimate a distance through an “intermediate point”, and it is the cornerstone of the $\\varepsilon/2$ trick in the theory of limits.

**Misconception 3: “convergence in every metric space is as intuitive as convergence on the real line.”**

What beginners tend to overlook is that in a general metric space convergence can be very “strange”. For example, in a discrete metric space a sequence converges if and only if it is constant from some term onwards—completely unlike the experience gained on $\\mathbb{R}$. In the function space $C[0,1]$, pointwise convergence and uniform convergence correspond to different metrics, and beginners often confuse the two.

**Misconception 4: “an open ball must be round.”**

In a general metric space, the shape of an “open ball” $B(x,r)$ depends entirely on the definition of the metric. On $\\mathbb{R}^2$ with the Manhattan metric $d((x_1,y_1),(x_2,y_2))=|x_1-x_2|+|y_1-y_2|$, an open ball is a square rotated by $45^\\circ$; with the Chebyshev metric $d((x_1,y_1),(x_2,y_2))=\\max\\{|x_1-x_2|,|y_1-y_2|\\}$, an open ball is an axis-aligned square. Hence a “ball” is only a conventional name and should not be tied to the image of a ball in Euclidean geometry.

---

## Insights

- **“Abstraction is not emptiness but a multiplication of power.”** Introducing metric spaces looks as though it turns something simple into something complicated, but it is precisely this abstraction that makes one body of theory apply at once to sequences of numbers on $\\mathbb{R}$, to continuous functions on $[0,1]$ and to number theory over the $p$-adic numbers—this experience of “prove once, use everywhere” is a rare delight in mathematics.
- **“Axioms are not laid down at will; they are distilled from concrete examples.”** The three axioms of a metric space were not invented off the top of a mathematician's head; they are the “minimal workable core conditions” extracted from the Euclidean distance. The necessity of each axiom can be seen in a concrete example.
- **“The limit is the soul of analysis, and a metric is the stage on which limits perform.”** Before meeting metric spaces, a limit always clung to a particular expression (the $\\varepsilon$-$N$ language of the absolute value); after meeting them, one realises that a limit needs in essence only the notion of “far and near”, and that “far and near” needs only three axioms.
- **From $\\mathbb{R}$ to metric spaces** is like going from “knowing a city” to “understanding the concept of a city”—the former is concrete experience, the latter an abstract structure, and the latter lets us discuss properties shared by cities we have never visited.

---

## Summary

### The idea

> **“Abstract ‘far and near’ into three axioms, and free the limit from the shackles of coordinates.”**

The core idea of a metric space is: the basic notions of analysis—convergence, continuity, completeness—depend neither on coordinates nor on algebraic structure; a distance function satisfying the three axioms is all that is needed.

### Methods

| Method | Where it appears in the notes |
|------|-------------------|
| The $\\varepsilon/2$ trick (splitting a distance with the triangle inequality) | the proof of uniqueness of the limit, the proof of the composition of continuous functions |
| Constructing counterexamples (analysing the necessity of the axioms) | the analysis of the necessary conditions |
| Axiomatic abstraction (from the concrete to the general) | the motivation for the construction |
| The language of balls and the topology of open sets | the equivalent formulations |
| Isometric embedding and completion | the generalisations |

---

## Looking back and asking

1. Why do the metric axioms not require $d(x,y)\\leq\\max\\{d(x,z),d(z,y)\\}$ (the stronger ultrametric inequality)? Under what circumstances does this inequality hold?
2. Two metrics $d_1$ and $d_2$ are called “equivalent metrics” if they induce the same topology. How can equivalent metrics be characterised by inequalities?
3. Under what conditions can a metric space be embedded into $\\mathbb{R}^n$ while preserving all distances? (That is, when is it isometric to a subset of $\\mathbb{R}^n$?)
4. If one kept only positive definiteness and the triangle inequality and dropped symmetry, would the theorem on uniqueness of the limit still hold? How would the definition of convergence have to be adjusted?
5. In data science, how should one choose the most suitable metric for a given problem? How large is the influence of different metrics on the result of clustering?`,

  'dg:metric-completeness': `## Metric completeness

> Let $(X, d)$ be a [metric space](/nodes/dg%3Ametric-space). Then $X$ is complete if and only if for every sequence $\\{x_n\\}$ in $X$ satisfying $\\lim_{n,m\\to\\infty} d(x_n, x_m) = 0$ there is an $x \\in X$ with $\\lim_{n\\to\\infty} d(x_n, x) = 0$.

**Source tags.** #metric-completeness #metric-space #topology #geometry #mathematical-analysis

**Source.** The read-only snapshot \`G:/DifferentialGeometry/object/def/度量完备性.md\` (see \`data/dg/\`).

---

Metric completeness is a core notion in the theory of [metric spaces](/nodes/dg%3Ametric-space): it describes the property that “no point is missing” from the space—that is, every Cauchy sequence has a limit in the space. The notion starts from the completeness of the real numbers and, through the work of Fréchet, was generalised to arbitrary [metric spaces](/nodes/dg%3Ametric-space), becoming an indispensable cornerstone of analysis, geometry and topology.

---

## Prerequisites

### Essential knowledge

- **Sets and maps**: the basic operations on sets, maps and functions, Cartesian products.
- **Basic properties of the real numbers**: the order structure of the reals, the absolute value, suprema and infima.
- **Limits of sequences**: convergence of sequences of real numbers, the ε-N language.

### Supporting knowledge

- **[Topological spaces](/nodes/dg%3Atopological-space)**: the basic notions of open sets, closed sets, neighbourhoods and continuous maps. A [metric space](/nodes/dg%3Ametric-space) can be regarded as a special case of a [topological space](/nodes/dg%3Atopological-space)—a metric naturally induces a topological structure.
- **Continuous functions**: the description of continuity in the language of sequences and in the ε–δ language. In a [metric space](/nodes/dg%3Ametric-space), sequential convergence and the Heine formulation of continuity are equivalent.

### Further knowledge

- **Functional analysis**: the completeness of Banach spaces and Hilbert spaces, and applications of the contraction mapping principle.
- **Riemannian geometry**: the Hopf–Rinow theorem reveals deeply the equivalence between metric completeness and geodesic completeness.
- **Point-set topology**: Urysohn's metrization theorem, conditions for metrizability and so on.

---

## Motivation

### Motivation for introducing it

#### A line of thought internal to the discipline

In mathematical analysis the set of real numbers $\\mathbb{R}$ has a key property—the **Cauchy convergence criterion**: every Cauchy sequence in $\\mathbb{R}$ converges. This property guarantees that the operation of taking limits stays inside the real numbers, and it is a cornerstone on which the calculus is built.

Not every space has this kind of “completeness”, however. Consider the rational numbers $\\mathbb{Q}$ with the usual metric given by the absolute value. Take a sequence of rational numbers approximating $\\sqrt{2}$:

$$
x_1 = 1,\\; x_2 = 1.4,\\; x_3 = 1.41,\\; x_4 = 1.414,\\; \\dots
$$

This sequence is a Cauchy sequence in $\\mathbb{Q}$ (because as the number of terms grows, the distances between the terms tend to zero), but it does **not converge** in $\\mathbb{Q}$ (the limit $\\sqrt{2}$ is not in $\\mathbb{Q}$). This shows that $\\mathbb{Q}$ has a “hole”—as a [metric space](/nodes/dg%3Ametric-space) it is incomplete.

This defect prompted mathematicians to ask: in what kind of space can one take limits freely without worrying about “running out of the space”? This led to the notion of metric completeness.

#### A line of thought from external applications

In differential equations, probability theory and functional analysis, many existence and uniqueness theorems for solutions take the completeness of a space as a hypothesis. The most typical example is the contraction mapping principle (the Banach fixed-point theorem), which asserts that in a complete [metric space](/nodes/dg%3Ametric-space) a contraction mapping has a unique fixed point. Without completeness this powerful tool would not be available.

### Motivation for the construction

The “seed” of metric completeness can be found in the completeness of the real numbers. Starting from the Cauchy convergence criterion in $\\mathbb{R}$, Fréchet in 1906 generalised it to abstract [metric spaces](/nodes/dg%3Ametric-space): if we have a set $X$ carrying a distance function (a metric), then we can speak of Cauchy sequences in $X$ and hence define completeness.

Why does the definition of completeness happen to take exactly the form “every Cauchy sequence converges”? Because a Cauchy sequence captures the intuitive picture that “the terms of the sequence come arbitrarily close to one another once we are far enough along”, while convergence demands that the “limit point of that picture” must lie inside the space. Completeness requires precisely that these two descriptions—“the sequence comes arbitrarily close to itself” and “there is a limit point”—agree everywhere in the space.

---

## Form

### The canonical general form

#### The definition of a [metric space](/nodes/dg%3Ametric-space)

Let $X$ be a non-empty set. If there is a map $d: X \\times X \\to \\mathbb{R}$ satisfying the following three conditions:

1. **Positive definiteness**: $d(x, y) \\ge 0$, and $d(x, y) = 0$ if and only if $x = y$;
2. **Symmetry**: $d(x, y) = d(y, x)$;
3. **The triangle inequality**: $d(x, z) \\le d(x, y) + d(y, z)$ for all $\\forall x, y, z \\in X$;

then $d$ is called a **metric** on $X$ and $(X, d)$ is called a **[metric space](/nodes/dg%3Ametric-space)**.

The set $\\mathbb{R}^n$ of real vectors, with the standard metric

$$
d(x, y) = \\sqrt{\\sum_{i=1}^{n} (x_i - y_i)^2}
$$

forms a [metric space](/nodes/dg%3Ametric-space), called $n$-dimensional Euclidean space $E^n$.

#### The definition of a Cauchy sequence

Let $(X, d)$ be a [metric space](/nodes/dg%3Ametric-space) and let $\\{x_i\\}$ be a sequence in $X$. If for every $\\varepsilon > 0$ there is an index $i_0$ such that for all $i, j > i_0$

$$
d(x_i, x_j) < \\varepsilon,
$$

then $\\{x_i\\}$ is called a **Cauchy sequence** (or a fundamental sequence).

#### The definition of metric completeness

A [metric space](/nodes/dg%3Ametric-space) $(X, d)$ is called **complete** if every Cauchy sequence in $X$ converges in $X$ (that is, there is an $x_0 \\in X$ with $\\lim_{i\\to\\infty} x_i = x_0$).

When the object under discussion is a connected Riemannian [manifold](/nodes/dg%3Amanifold), the term “metrically complete” is used in order to emphasise that the completeness is that of a [metric space](/nodes/dg%3Ametric-space) (induced by the Riemannian distance function $d_g$).

#### Ball neighbourhoods and the metric topology

In a [metric space](/nodes/dg%3Ametric-space) $(X, d)$, the **open ball** (spherical neighbourhood) with centre $x_0$ and radius $\\varepsilon > 0$ is defined by

$$
B(x_0, \\varepsilon) = \\{x \\in X \\mid d(x_0, x) < \\varepsilon\\}.
$$

The union of all spherical neighbourhoods constitutes a topology on $X$, called the **metric topology** induced by the metric $d$. Consequently every [metric space](/nodes/dg%3Ametric-space) is naturally regarded as a [topological space](/nodes/dg%3Atopological-space).

### Analysis of the necessary conditions

In the definition of completeness, the phrase “every Cauchy sequence converges” uses a light, intrinsic language. The definition of a Cauchy sequence describes the mutual closeness of the terms of the sequence entirely by means of the metric, without relying on a potential limit point, so it can serve as a “purely intrinsic” criterion for detecting whether a space has “holes”.

- **If the condition is relaxed**: for example, requiring only that “every bounded sequence has a convergent subsequence” corresponds in fact to sequential compactness. Sequential compactness is far stronger than completeness—a compact [metric space](/nodes/dg%3Ametric-space) is sequentially compact, and a compact [metric space](/nodes/dg%3Ametric-space) is certainly complete, but a complete [metric space](/nodes/dg%3Ametric-space) need not be compact ($\\mathbb{R}$ is an example).

### Equivalent formulations

#### The nested-balls property

A complete [metric space](/nodes/dg%3Ametric-space) has an important equivalent characterisation: if $\\{F_n\\}$ is a decreasing sequence of non-empty closed subsets of $X$ ($F_n \\supset F_{n+1}$) and the diameter of $F_n$ tends to $0$, then $\\bigcap_{n=1}^\\infty F_n$ is non-empty (in fact it contains exactly one point). This characterisation has a similar form in the discussion of compact [metric spaces](/nodes/dg%3Ametric-space): any nested sequence of non-empty closed subsets has non-empty intersection.

#### Metric completeness and geodesic completeness

On a connected Riemannian [manifold](/nodes/dg%3Amanifold) $(M, g)$ there are two different notions of completeness:

- **Metrically complete**: $(M, d_g)$ is complete as a [metric space](/nodes/dg%3Ametric-space), that is, every Cauchy sequence converges.
- **Geodesically complete**: every maximal geodesic is defined for all $t \\in \\mathbb{R}$.

The Hopf–Rinow theorem asserts that for a connected Riemannian [manifold](/nodes/dg%3Amanifold), **metric completeness and geodesic completeness are equivalent**.

### Classes of forms

**Completeness** can be classified according to the type of space involved:

- **Completeness of a [metric space](/nodes/dg%3Ametric-space)** (metric completeness): Cauchy sequences induced by the metric converge.
- **Geodesic completeness**: in a Riemannian [manifold](/nodes/dg%3Amanifold), the maximal interval of definition of a geodesic is the whole of $\\mathbb{R}$.
- **Completeness of a uniform space** (a generalisation of the [metric space](/nodes/dg%3Ametric-space)): in a more general framework one uses a uniform structure to define Cauchy filters.

In Riemannian geometry the sphere $S^n$ and hyperbolic space $H^n$ are both typical examples of complete Riemannian [manifolds](/nodes/dg%3Amanifold).

### A lower-dimensional formulation

Completeness can be expressed in more basic language as:

In other words, **the space contains no sequence that “looks as though it ought to converge but has no limit point”**.

### A higher-dimensional viewpoint

In a more general framework, the completeness of a [metric space](/nodes/dg%3Ametric-space) is a special case of completeness in a **uniform space**. The convergence of Cauchy filters in a uniform space is precisely the generalisation of the convergence of Cauchy sequences in a [metric space](/nodes/dg%3Ametric-space).

From the constructive point of view, “completion” can be used to embed an incomplete [metric space](/nodes/dg%3Ametric-space) into a complete [metric space](/nodes/dg%3Ametric-space)—the construction of $\\mathbb{R}$ from $\\mathbb{Q}$ is the most classical instance of this idea; in differential geometry the Sobolev space $H_s(M)$ is likewise constructed by completing the space of smooth [differential forms](/nodes/dg%3Adifferential-form) with respect to the Sobolev norm $\\|\\cdot\\|_s$.

### Related notions to be understood together

**Completeness and [compactness](/nodes/dg%3Acompactness)** are closely related but different notions:

- A compact [metric space](/nodes/dg%3Ametric-space) is certainly complete: a compact [metric space](/nodes/dg%3Ametric-space) is sequentially compact (every sequence has a convergent subsequence), and a Cauchy sequence with a convergent subsequence converges as a whole, so compactness implies completeness.
- A complete [metric space](/nodes/dg%3Ametric-space) need not be compact (for example, $\\mathbb{R}$ is complete but not compact).
- For a [metric space](/nodes/dg%3Ametric-space), **[compactness](/nodes/dg%3Acompactness) = completeness + total boundedness**: total boundedness is reflected in the property that “there is a finite $\\delta$-net”.

---

## Theorems and proofs

### Completeness of the real numbers (the Cauchy convergence criterion)

> **Theorem**: let $\\{x_i\\}$ be a sequence in $\\mathbb{R}$. Then $\\{x_i\\}$ converges if and only if it is a Cauchy sequence.

**Sketch of the proof**:

($\\Rightarrow$) Suppose that $\\{x_i\\} \\to x_0$. For any $\\varepsilon > 0$ there is an $i_0$ such that $|x_i - x_0| < \\varepsilon/2$ whenever $i > i_0$. Hence for $i, j > i_0$,

$$
|x_i - x_j| \\le |x_i - x_0| + |x_j - x_0| < \\varepsilon.
$$

So $\\{x_i\\}$ is a Cauchy sequence.

($\\Leftarrow$) Suppose that $\\{x_i\\}$ is a Cauchy sequence. First, $\\{x_i\\}$ is bounded. Let $a_1 = \\inf\\{x_i\\}$ and $b_1 = \\sup\\{x_i\\}$. If one of these points is a limit point of $\\{x_i\\}$, the sequence converges to that point. Otherwise $a_1$ and $b_1$ are both isolated points; consider the set of points in the open interval $(a_1, b_1)$ and repeat the process, obtaining monotone bounded sequences $a_1 < a_2 < \\cdots$ and $b_1 > b_2 > \\cdots$. Let $a = \\sup\\{a_i\\}$ and $b = \\inf\\{b_i\\}$. The Cauchy condition implies that $a = b$; writing $x_0$ for this common value, $x_0$ is the only limit point of $\\{x_i\\}$, so $\\{x_i\\} \\to x_0$.

This form of completeness generalises naturally to Euclidean space $\\mathbb{R}^n$.

### The Hopf–Rinow theorem

> **Theorem (Hopf–Rinow)**: let $(M, g)$ be a connected Riemannian [manifold](/nodes/dg%3Amanifold). Then $M$ is metrically complete if and only if it is geodesically complete.

**Sketch of the proof**:

($\\Leftarrow$) Suppose that $M$ is geodesically complete. Take $p \\in M$; for any Cauchy sequence $\\{q_i\\}$, let $\\gamma_i(t) = \\exp_p(t v_i)$ be the unit-speed minimising geodesic from $p$ to $q_i$ and let $d_i = d_g(p, q_i)$. The sequence $\\{d_i\\}$ is bounded (a Cauchy sequence in a [metric space](/nodes/dg%3Ametric-space) is bounded) and $\\{v_i\\}$ is a sequence of unit vectors in $T_pM$, so $\\{d_i v_i\\}$ has a subsequence converging to some $v \\in T_pM$. By continuity of the exponential map, the corresponding subsequence converges to $\\exp_p(v)$. Since the original sequence is a Cauchy sequence, it converges to the same limit.

($\\Rightarrow$) Suppose that $M$ is metrically complete but not geodesically complete. Then there is a unit-speed geodesic $\\gamma: [0, b) \\to M$ that cannot be extended to $[0, b')$ (with $b'>b$). Take $t_i \\nearrow b$ and let $q_i = \\gamma(t_i)$. Since $\\gamma$ is parametrised by arc length, the length of $\\gamma|_{[t_i, t_j]}$ is exactly $|t_j - t_i|$, so $d_g(q_i, q_j) \\le |t_j - t_i|$, and hence $\\{q_i\\}$ is a Cauchy sequence. By completeness, $\\{q_i\\}$ converges to some $q \\in M$. The exponential map can then be used to construct an extension of $\\gamma$ at $b$, contradicting the hypothesis. Hence $M$ must be geodesically complete.

### The contraction mapping principle (the Banach fixed-point theorem)

> **Theorem**: let $X$ be a complete [metric space](/nodes/dg%3Ametric-space) and let $T: X \\to X$ be a contraction mapping (that is, there is $k \\in (0,1)$ with $d(Tx, Ty) \\le k\\, d(x, y)$ for all $x, y \\in X$). Then $T$ has a unique fixed point $z \\in X$, and for every $x \\in X$ the iteration sequence $T^n(x)$ converges to $z$.

**Sketch of the proof**: starting from any $x_0 \\in X$, construct the iteration sequence $\\{x_n = T(x_{n-1})\\}$. The contraction condition gives $d(x_n, x_{n-1}) \\le k^{n-1} d(x_1, x_0)$, from which one shows that the sequence is a Cauchy sequence. By completeness it converges to some $z \\in X$. The continuity of $T$ gives $T(z) = z$. Uniqueness follows from the contraction property: if $z'$ is also a fixed point, then $d(z, z') = d(T(z), T(z')) \\le k\\, d(z, z')$, forcing $d(z, z') = 0$, that is, $z = z'$.

### Completeness of a compact [metric space](/nodes/dg%3Ametric-space)

> **Proposition**: a compact [metric space](/nodes/dg%3Ametric-space) is complete.

**Explanation**: a compact [metric space](/nodes/dg%3Ametric-space) is sequentially compact (that is, every sequence has a convergent subsequence). Take an arbitrary Cauchy sequence $\\{x_n\\}$; by sequential compactness it has a convergent subsequence $\\{x_{n_k}\\}$, say with limit $x$. A Cauchy sequence with a convergent subsequence converges as a whole to the same limit, so $\\{x_n\\} \\to x$. Hence a compact [metric space](/nodes/dg%3Ametric-space) is complete.

---

## Applications

### Direct applications

#### Example 1: the geometric meaning of the Cauchy convergence criterion
In Euclidean space $\\mathbb{R}^n$, Cauchy sequences are exactly the convergent sequences. This gives a practical criterion for deciding whether a sequence converges without knowing its limit in advance—one only has to check whether the terms of the sequence are “close enough” to one another.

#### Example 2: an open ball is not complete
Let $M$ be an open ball in $\\mathbb{R}^n$ with the Euclidean metric. Any sequence that converges in $\\mathbb{R}^n$ to a boundary point is a Cauchy sequence in $M$ but does not converge in $M$. Hence an open ball is incomplete as a [metric space](/nodes/dg%3Ametric-space).

#### Example 3: completeness of a matrix space
Let $M(n, \\mathbb{R})$ be the space of $n \\times n$ real matrices with the usual norm. Then $M(n, \\mathbb{R})$ is complete with respect to this norm: every Cauchy sequence has a limit. In particular, when $\\|X\\| < 1$ the series $\\sum_{k=0}^\\infty (-1)^k X^k$ converges, which yields a proof that the matrix $I+X$ is invertible.

#### Example 4: Hilbert space
Let $\\mathbb{R}^\\omega = \\{\\{x_n\\} \\mid \\sum_{n=1}^\\infty x_n^2 < \\infty\\}$ and define the metric

$$
d(\\{x_n\\}, \\{y_n\\}) = \\sqrt{\\sum_{n=1}^\\infty (x_n - y_n)^2},
$$

Then $(\\mathbb{R}^\\omega, d)$ is a complete [metric space](/nodes/dg%3Ametric-space), called Hilbert space.

### Indirect applications

#### Applications in differential equations
The contraction mapping principle (the Banach fixed-point theorem) on a complete [metric space](/nodes/dg%3Ametric-space) provides a unified theoretical framework for the existence and uniqueness of solutions of ordinary differential equations and integral equations. For example, for the differential equation $\\frac{d\\alpha}{dt} = f(\\alpha)$, under suitable conditions one can construct a contraction mapping on a complete [metric space](/nodes/dg%3Ametric-space) to prove the existence and uniqueness of solutions.

#### Applications in Riemannian geometry
The Hopf–Rinow theorem is one of the most basic theorems of Riemannian geometry; it allows many geometric and topological questions on a Riemannian [manifold](/nodes/dg%3Amanifold) to be turned into problems of analysis in a [metric space](/nodes/dg%3Ametric-space). For example: any two points of a complete Riemannian [manifold](/nodes/dg%3Amanifold) can be joined by a minimising geodesic; and on a non-compact complete surface the total curvature satisfies the Cohn–Vossen inequality.

#### Applications in the theory of Sobolev spaces
In differential geometry and partial differential equations, the Sobolev space $H_s(M)$ is constructed by completing the space of smooth [differential forms](/nodes/dg%3Adifferential-form) (with respect to the Sobolev norm $\\|\\cdot\\|_s$). Without completeness one could not perform limit operations or functional analysis in this space.

---

## Generalisations

- **Relaxing the conditions**: in a uniform space one can replace the metric by a uniform structure in order to define Cauchy filters and completeness, thereby generalising the notion of completeness from [metric spaces](/nodes/dg%3Ametric-space) to a more general framework.
- **Generalising the conclusion**: the Hopf–Rinow theorem reveals a deep equivalence between two apparently different notions of completeness on a Riemannian [manifold](/nodes/dg%3Amanifold) (metric completeness and geodesic completeness). Similar discussions take place for broader classes of geometric structures.
- **The completion construction of Sobolev spaces**: the completion of $A^*$ with respect to the norm $\\|\\cdot\\|_s$ is called the Sobolev space $H_s(M)$, and it is a basic tool in the regularity theory of elliptic operators.
- **An open problem**: on a general pseudo-Riemannian [manifold](/nodes/dg%3Amanifold), metric completeness and geodesic completeness are no longer automatically equivalent; when and under what conditions the two are equivalent or inequivalent is still an active direction of research.

---

## Common misconceptions

**Misconception 1: “a complete [metric space](/nodes/dg%3Ametric-space) is just a closed set”**

A closed set is closed relative to some larger space. A [metric space](/nodes/dg%3Ametric-space) is always closed in itself, but as a subset of a larger [metric space](/nodes/dg%3Ametric-space) it need not be closed. Completeness is an “intrinsic” property: the open interval $(0,1)$ in $\\mathbb{R}$ is incomplete as a subspace of $\\mathbb{R}$, because it is not a closed subset of $\\mathbb{R}$; yet $(0,1)$ is closed in its own metric topology (a whole space is always closed) while still being incomplete. **Completeness detects “holes” using the metric defined inside the space itself, and does not depend on an external space**.

**Misconception 2: “a complete [metric space](/nodes/dg%3Ametric-space) must be compact”**

[Compactness](/nodes/dg%3Acompactness) is far stronger than completeness: a compact [metric space](/nodes/dg%3Ametric-space) is certainly complete, but the converse fails. $\\mathbb{R}$ itself is complete but not compact (because the open cover $\\{(-n, n) \\mid n \\in \\mathbb{N}\\}$ of $\\mathbb{R}$ has no finite subcover). A compact [metric space](/nodes/dg%3Ametric-space) is exactly “complete + totally bounded”.

**Misconception 3: “if a subspace of a complete [metric space](/nodes/dg%3Ametric-space) is complete, then it must be a closed subset”**

Part of the converse of this statement is correct: a closed subset of a complete [metric space](/nodes/dg%3Ametric-space) is complete. But must a complete subspace be closed? If the parent space is a complete [metric space](/nodes/dg%3Ametric-space), then a subspace is complete if and only if it is a closed subset. If the parent space is incomplete, however, a complete subspace need not be closed in its parent space.

---

## Insights

- **The intrinsic detection of “holes”**: a Cauchy sequence is defined without any reference to a potential limit point; it uses only the distances between points of the space to detect whether the sequence “tends somewhere”. This reflects a style of thought in mathematics that characterises an extrinsic property by intrinsic quantities—a kind of “introspective” viewpoint.
- **The idea of completion**: the completion from $\\mathbb{Q}$ to $\\mathbb{R}$ tells us that when a space “has holes” we can “fill” them by formally adding the limits of all Cauchy sequences. Completion recurs in many areas of mathematics (from the construction of the real numbers to the construction of Sobolev spaces), and it is an extremely important mathematical method of going “from defect to wholeness”.
- **The tension between the local and the global**: the Hopf–Rinow theorem links a “global property” (metric completeness) with “an extension of a local property” (geodesic completeness), showing how local geometric information on a Riemannian [manifold](/nodes/dg%3Amanifold) determines global geometric properties.

---

## Summary

### The idea

> **“Fill in the holes—make sure that taking limits does not run out of the space.”**

The core idea of completeness is: in the space, every sequence that “comes arbitrarily close to itself inside the space” must have a limit inside the space. This guarantees the closedness and the safety of all kinds of limit operations in analysis.

### Methods

| Method | Where it is used in the notes |
|------|--------------|
| The ε-N language | the definitions of a Cauchy sequence and of convergence; the proof of completeness of the reals |
| Proof by contradiction | the proof of the Hopf–Rinow theorem in the ($\\Rightarrow$) direction |
| Iterative approximation | the constructive proof of the contraction mapping principle |
| The subsequence method | the relation between the convergence of a Cauchy sequence and that of its subsequences |
| The completion construction | the construction of Sobolev spaces |

---

## Looking back and asking

- Why is $\\mathbb{Q}$ incomplete? Which important theoretical innovations in the history of mathematics did this defect bring about?
- In the proof of the Hopf–Rinow theorem, how does metric completeness “imply” geodesic completeness? Can you draw an intuitive geometric picture of it?
- If the connectedness hypothesis is dropped, does the Hopf–Rinow theorem still hold?
- On a general pseudo-Riemannian [manifold](/nodes/dg%3Amanifold), why are metric completeness and geodesic completeness no longer equivalent?
- Can you use the “nested-balls property” to reprove the completeness of some concrete [metric space](/nodes/dg%3Ametric-space)?

---

## References

[1] Manfredo P. do Carmo. *Differential Geometry of Curves and Surfaces*. Appendix: Point-Set Topology of Euclidean Spaces.

[2] John M. Lee. *Introduction to Riemannian Manifolds*, Second Edition. Springer.

[3] \`包志强. 点集拓扑与代数拓扑引论. 北京大学出版社, 2013.\` (Bao Zhiqiang, *Introduction to Point-Set Topology and Algebraic Topology*, Peking University Press, 2013).

[4] \`尤承业. 基础拓扑学讲义. 北京大学出版社, 2006.\` (You Chengye, *Lectures on Basic Topology*, Peking University Press, 2006).

[5] \`А. С. 米先柯, А. Т. 福明柯. 微分几何与拓扑学简明教程.\` (A. S. Mishchenko, A. T. Fomenko, *A Concise Course in Differential Geometry and Topology*).

[6] \`贝尔热, 戈斯丢. 微分几何——流形、曲线和曲面, 第二版修订本. 法兰西数学精品译丛.\` (Berger, Gostiaux, *Differential Geometry: Manifolds, Curves and Surfaces*, second revised edition, French Mathematics Translation Series).

[7] \`伍鸿熙, 陈维桓. 黎曼几何选讲. 北京大学出版社, 2020.\` (Wu Hongxi, Chen Weihuan, *Selected Topics in Riemannian Geometry*, Peking University Press, 2020).

[8] B. A. Dubrovin, A. T. Fomenko, S. P. Novikov. *Modern Geometry — Methods and Applications, Part I: The Geometry of Surfaces, Transformation Groups, and Fields*. GTM 93, Springer.

[9] \`陈维桓. 微分几何引论. 北京大学出版社, 2013.\` (Chen Weihuan, *An Introduction to Differential Geometry*, Peking University Press, 2013).

[10] Wolfgang Kühnel. *Differential Geometry: Curves - Surfaces - Manifolds*, Third Edition. AMS.

[11] Clifford Henry Taubes. *Differential Geometry: Bundles, Connections, Metrics and*. Oxford Graduate Texts in Mathematics, 2011.`,

  'dg:tangent-vector-curve': `## The curve definition of a tangent vector

> A tangent vector is one of the most central foundational notions of differential geometry. Intuitively, the tangent vector of a curve at a point captures the instantaneous direction and speed of the curve at that point. Making this intuition precise and extending it to an arbitrary [smooth manifold](/nodes/dg%3Asmooth-manifold) yields the **curve definition** of a tangent vector: a tangent vector of a [manifold](/nodes/dg%3Amanifold) $M$ at a point $p$ is defined as the “velocity” at that point of some smooth curve passing through $p$. This way of defining things is geometrically very intuitive, and it is compatible with the other equivalent definitions of tangent vectors on a [manifold](/nodes/dg%3Amanifold) (such as the algebraic definition and the coordinate-transformation definition).

**Source tags.** #geometry

**Source.** The read-only snapshot \`G:/DifferentialGeometry/object/def/切向量的曲线定义.md\` (see \`data/dg/\`).

---

### Introduction

A tangent vector is one of the most central foundational notions of differential geometry. Intuitively, the tangent vector of a curve at a point captures the instantaneous direction and speed of the curve at that point. Making this intuition precise and extending it to an arbitrary [smooth manifold](/nodes/dg%3Asmooth-manifold) yields the **curve definition** of a tangent vector: a tangent vector of a [manifold](/nodes/dg%3Amanifold) $M$ at a point $p$ is defined as the “velocity” at that point of some smooth curve passing through $p$. This way of defining things is geometrically very intuitive, and it is compatible with the other equivalent definitions of tangent vectors on a [manifold](/nodes/dg%3Amanifold) (such as the algebraic definition and the coordinate-transformation definition).

---

## Prerequisites

### Essential

- **[Smooth manifolds](/nodes/dg%3Asmooth-manifold)**: understanding the basic notions of an $n$-dimensional [smooth manifold](/nodes/dg%3Asmooth-manifold) $M$, a local coordinate system $(U;\\varphi)$, a chart, and so on.
- **Smooth maps**: smooth maps between [manifolds](/nodes/dg%3Amanifold) $f:M\\to N$ and the composition of maps.
- **Curves in Euclidean space**: parametrised curves in $\\mathbb{R}^n$, $r(t)=(x^1(t),\\dots,x^n(t))$, and their tangent vectors $r'(t)=(x^{1\\prime}(t),\\dots,x^{n\\prime}(t))$.
- **Linear algebra**: the basic notions of [vector spaces](/nodes/bg%3Alinear%3Avector), linear maps, linear combinations and so on.

### Auxiliary

- **Directional derivatives**: the directional derivative of a function $f$ in $\\mathbb{R}^n$ along a vector $v$, $\\nabla_v f = \\sum v^i\\frac{\\partial f}{\\partial x^i}$.
- **The Leibniz rule**: the product rule satisfied by differentiation, $(fg)' = f'g + fg'$.

### Further background

- **The [tangent bundle](/nodes/dg%3Atangent-bundle)**: the union of all tangent spaces of a [manifold](/nodes/dg%3Amanifold), $TM = \\bigcup_{p\\in M} T_pM$, is a $2n$-dimensional [smooth manifold](/nodes/dg%3Asmooth-manifold) called the [tangent bundle](/nodes/dg%3Atangent-bundle).
- **Vector fields**: assigning a tangent vector smoothly to each point of a [manifold](/nodes/dg%3Amanifold) gives a vector field. The tangent vector $\\gamma'(t)$ of a curve $\\gamma(t)$ is precisely the vector field defined along the curve.
- **The tangent map**: a smooth map $f:M\\to N$ induces a linear map between tangent spaces $f_{*p}:T_pM\\to T_{f(p)}N$, which sends the tangent vector of a curve to the tangent vector of the image curve.

---

## Motivation

### Introducing motivation

**Why define tangent vectors by means of curves?**

In Euclidean space $\\mathbb{R}^n$, the tangent vector of a parametrised curve $r(t)$ at the point $r(t_0)$ is defined as the derivative $r'(t_0)$, whose geometric meaning is the instantaneous direction of motion of the curve. When we want to extend the notion of a tangent vector to a general abstract [manifold](/nodes/dg%3Amanifold) $M$, the most natural idea is: **define tangent vectors by means of curves on the [manifold](/nodes/dg%3Amanifold)**. For a curve is “a road one can walk along on the [manifold](/nodes/dg%3Amanifold)”, and taking a directional derivative along a curve defines a tangent vector naturally.

Three independent lines of motivation:

- **Internal line of thought**: on a surface in $\\mathbb{R}^n$, the tangent vector of a curve is given by $r_u\\frac{du}{dt}+r_v\\frac{dv}{dt}$. But an abstract [manifold](/nodes/dg%3Amanifold) has no ambient space, so one cannot write down $r(u,v)$ directly, and hence one must find a way of defining tangent vectors that does not depend on an ambient space. The curve definition satisfies exactly this requirement.
- **External application**: in physics the trajectory of a particle is a curve on a [manifold](/nodes/dg%3Amanifold), and its velocity vector is a tangent vector. In general relativity, the world line of a particle is a curve on the spacetime [manifold](/nodes/dg%3Amanifold), and its tangent vector (the four-velocity) is a fundamental physical quantity.
- **Aesthetic/structural line of thought**: once tangent vectors are defined by curves, one can naturally define a whole series of structures — the tangent map, the [tangent bundle](/nodes/dg%3Atangent-bundle) and so on — which makes the theoretical framework of differential geometry more elegant and unified in the category-theoretic sense.

### Motivation for the construction

**How did the curve definition of a tangent vector evolve from intuition into a rigorous form?**

**Step one — the prototype in Euclidean space**: in $\\mathbb{R}^n$, the tangent vector of a curve $r(t)$ is
$$r'(t_0)=\\lim_{\\Delta t\\to0}\\frac{r(t_0+\\Delta t)-r(t_0)}{\\Delta t}$$
which is the most intuitive notion of “velocity”.

**Step two — the tangent vector of a curve on a surface**: let $S:r=r(u,v)$ be a regular parametrised surface in $\\mathbb{R}^3$ and let a curve on the surface be given by $u=u(t),v=v(t)$; then
$$\\frac{dr(u(t),v(t))}{dt} = r_u\\frac{du}{dt}+r_v\\frac{dv}{dt}$$
which reveals that the tangent vector is given by a linear combination of the derivatives of the coordinate functions with the basis vectors of the surface.

**Step three — extension to an abstract [manifold](/nodes/dg%3Amanifold)**: if $M$ is an abstract [manifold](/nodes/dg%3Amanifold), there is no ambient space in which to take differences. But we can compose a curve $\\gamma(t)$ with a smooth function $f$ to get a function of one variable $f\\circ\\gamma(t)$, and then differentiate:
$$(\\gamma'(0))(f)=\\frac{d}{dt}\\Big|_{t=0}f(\\gamma(t))$$
In this way a tangent vector becomes a “differentiation operator acting on functions”.

**Step four — the equivalence-class form**: declare two curves through $p$ to be equivalent when they have “first-order contact” (that is, when the derivatives of the coordinate functions in a local coordinate system agree); then a tangent vector can be defined as an equivalence class of curves. This form of the definition is the most geometric of all.

---

## Form

### The canonical general form

#### Form one: defining tangent vectors by smooth curves (the operator viewpoint)

Let $M$ be an $n$-dimensional [smooth manifold](/nodes/dg%3Asmooth-manifold), let $\\gamma:(-\\varepsilon,\\varepsilon)\\to M$ be a smooth curve and let $p=\\gamma(0)$. Define a map $\\gamma'(0):C_p^\\infty\\to\\mathbb{R}$ as follows: for any $f\\in C_p^\\infty$,
$$(\\gamma'(0))(f)=\\frac{d}{dt}\\Big|_{t=0}(f\\circ\\gamma(t))=\\lim_{t\\to0}\\frac{f(\\gamma(t))-f(\\gamma(0))}{t}$$

Here $C_p^\\infty$ denotes the set of smooth functions near the point $p$. Since differentiation satisfies linearity and the Leibniz rule, $\\gamma'(0)$ is a tangent vector at $p$.

#### Form two: defining tangent vectors by equivalence classes of curves

Consider all smooth curves through $p$, $\\sigma:(-a,a)\\to M$ with $\\sigma(0)=p$. In a local coordinate system $(U;\\varphi)$ we have $\\varphi\\circ\\sigma(t)=(x^1\\circ\\sigma(t),\\dots,x^n\\circ\\sigma(t))$. If two curves $\\sigma_1,\\sigma_2$ satisfy
$$\\frac{d}{dt}\\Big|_{t=0}(x^i\\circ\\sigma_1(t)-x^i\\circ\\sigma_2(t))=0,\\quad 1\\le i\\le n$$
then we write $\\sigma_1\\sim\\sigma_2$. An equivalence class of curves is called a tangent vector at $p$. The tangent space is defined as
$$T_pM=\\{\\text{curves through the point }p\\text{ that are smooth}\\}/\\sim$$

#### Form three: the curve definition of a tangent vector in the sub[manifold](/nodes/dg%3Amanifold) case

Let $V$ be a sub[manifold](/nodes/dg%3Amanifold) of $\\mathbb{R}^n$. A vector $z$ of $\\mathbb{R}^n$ is called a tangent vector of $V$ at the point $x$ if there exists a $C^1$ curve $\\alpha$ in $V$ (a map defined on an interval $I$ of $\\mathbb{R}$ containing $0$ and taking values in $V$) such that $\\alpha(0)=x$ and $\\alpha'(0)=z$.

Remark: the condition $0\\in I$ is only a notational convenience. The curve may equally well be defined on an interval $I$ containing $t_0$ and satisfy $\\alpha(t_0)=x$ and $\\alpha'(t_0)=z$.

### Equivalent expressions

#### Equivalent to the algebraic definition

The algebraic definition of a tangent vector is: $v:C_p^\\infty\\to\\mathbb{R}$ satisfying
1. **Linearity**: $v(f+\\lambda g)=v(f)+\\lambda v(g)$
2. **The Leibniz rule**: $v(fg)=v(f)g(p)+f(p)v(g)$

The $\\gamma'(0)$ given by the curve definition automatically satisfies the two conditions above, hence is a tangent vector in the sense of the algebraic definition. Conversely, given a tangent vector in the algebraic sense $X_p=\\sum a^i\\frac{\\partial}{\\partial x^i}\\big|_p$, take the curve $\\sigma(t)=\\varphi^{-1}(a^1t,\\dots,a^nt)$; then $\\sigma'(0)=X_p$. Hence the two definitions are equivalent.

#### Equivalent to the coordinate-transformation definition

The general definition of a tangent vector (the coordinate-transformation viewpoint): associate with every local coordinate system $(x_\\alpha^1,\\dots,x_\\alpha^n)$ a family of numbers $(\\xi_\\alpha^1,\\dots,\\xi_\\alpha^n)$ such that for every pair of local coordinate systems the [tensor](/nodes/dg%3Atensor) rule
$$\\xi_\\alpha^k = \\sum_{i=1}^n \\frac{\\partial x_\\alpha^k}{\\partial x_\\beta^i}(P_0)\\,\\xi_\\beta^i$$
holds; then this association is called a tangent vector of the [manifold](/nodes/dg%3Amanifold) $M$ at the point $P_0$.

Let $\\gamma:(-1,1)\\to M$ be a smooth curve with $P_0=\\gamma(0)$. Associate with every local coordinate system $(x^1,\\dots,x^n)$ in a neighbourhood of $P_0$ the family of numbers
$$\\left(\\frac{dx^1}{dt}(\\gamma(t)),\\dots,\\frac{dx^n}{dt}(\\gamma(t))\\right)_{t=0}$$
then this association satisfies the [tensor](/nodes/dg%3Atensor) rule above and is therefore a tangent vector in the coordinate-transformation sense. Conversely, given any family of numbers $(\\xi^1,\\dots,\\xi^n)$ satisfying the [tensor](/nodes/dg%3Atensor) rule, one can also construct a curve having it as its tangent vector.

### Kinds of form

“Tangent vector” has different emphases in different contexts:

- **The curve definition** (geometric viewpoint): emphasises that a tangent vector is the velocity of a curve; intuitive and easy to picture.
- **The algebraic definition** (operator viewpoint): emphasises that a tangent vector is a linear map satisfying the Leibniz rule; convenient for algebraic manipulation.
- **The coordinate-transformation definition** ([tensor](/nodes/dg%3Atensor) viewpoint): emphasises the behaviour of a tangent vector under a change of coordinates; convenient for computing components.
- **Tangent vectors in physics**: in general relativity the four-velocity of a particle $u^\\mu=dx^\\mu/d\\tau$ is precisely the tangent vector of its world line on the spacetime [manifold](/nodes/dg%3Amanifold).

### How are the relevant claims expressed in natural language?

- “The tangent vector of a curve $\\gamma$ at a point $p$ is $\\gamma'(0)$; it tells us the instantaneous direction and speed of motion along $\\gamma$ at $p$.”
- “A tangent vector acting on a function $f$ gives the directional derivative of $f$ along the curve: $\\gamma'(0)(f)=d(f\\circ\\gamma)/dt|_{t=0}$.”
- “If two curves have the same tangent vector at $p$, then they have first-order contact there (that is, the first derivatives of their coordinates agree).”

### Lower-dimensional formulation

Once a local coordinate system $(U;x^1,\\dots,x^n)$ is given on a [manifold](/nodes/dg%3Amanifold) $M$, the tangent vector $\\gamma'(0)$ can be written as
$$\\gamma'(0) = \\sum_{i=1}^n \\frac{d(x^i\\circ\\gamma)}{dt}\\Big|_{t=0} \\frac{\\partial}{\\partial x^i}\\Big|_p$$
where $\\frac{\\partial}{\\partial x^i}\\big|_p$ is the natural basis of the tangent space $T_pM$. Hence a tangent vector is essentially a linear combination of “directional derivative operators”.

### Higher-dimensional viewpoint

- **From the viewpoint of the [tangent bundle](/nodes/dg%3Atangent-bundle)**: a tangent vector is an element of the [tangent bundle](/nodes/dg%3Atangent-bundle) $TM$. A curve $\\gamma:I\\to M$ defines the lifted curve $\\dot{\\gamma}:I\\to TM$, $t\\mapsto(\\gamma(t),\\gamma'(t))$, called the tangent lift of $\\gamma$.
- **From the viewpoint of category theory**: the tangent space is the value at the point $p$ of a “functor $T$” that maps [manifolds](/nodes/dg%3Amanifold) to [vector spaces](/nodes/bg%3Alinear%3Avector) and smooth maps to linear maps (tangent maps). Defining tangent vectors by curves embodies the functoriality of the tangent functor: $(f\\circ\\gamma)'(0)=f_{*p}(\\gamma'(0))$.

---

## Proof

### Equivalence of the curve definition and the algebraic definition

Let $\\gamma:(-\\varepsilon,\\varepsilon)\\to M$ be smooth and let $p=\\gamma(0)$. Define $\\gamma'(0):C_p^\\infty\\to\\mathbb{R}$ by
$$\\gamma'(0)(f)=\\frac{d}{dt}\\Big|_{t=0}(f\\circ\\gamma(t))$$

**Verifying linearity**: for any $f,g\\in C_p^\\infty$ and $\\lambda\\in\\mathbb{R}$,
$$\\begin{aligned}
\\gamma'(0)(f+\\lambda g) &= \\frac{d}{dt}\\Big|_{t=0}\\big((f+\\lambda g)\\circ\\gamma(t)\\big) \\\\
&= \\frac{d}{dt}\\Big|_{t=0}\\big(f(\\gamma(t))+\\lambda g(\\gamma(t))\\big) \\\\
&= \\frac{d}{dt}\\Big|_{t=0}f(\\gamma(t)) + \\lambda\\frac{d}{dt}\\Big|_{t=0}g(\\gamma(t)) \\\\
&= \\gamma'(0)(f) + \\lambda\\,\\gamma'(0)(g)
\\end{aligned}$$

**Verifying the Leibniz rule**:
$$\\begin{aligned}
\\gamma'(0)(fg) &= \\frac{d}{dt}\\Big|_{t=0}\\big((fg)\\circ\\gamma(t)\\big) = \\frac{d}{dt}\\Big|_{t=0}\\big(f(\\gamma(t))g(\\gamma(t))\\big) \\\\
&= \\frac{df(\\gamma(t))}{dt}\\Big|_{t=0}g(\\gamma(0)) + f(\\gamma(0))\\frac{dg(\\gamma(t))}{dt}\\Big|_{t=0} \\\\
&= \\gamma'(0)(f)\\,g(p) + f(p)\\,\\gamma'(0)(g)
\\end{aligned}$$

Hence $\\gamma'(0)$ is a tangent vector in the sense of the algebraic definition.

**The converse construction**: in a local coordinate system $(U;\\varphi)$, let $X_p=\\sum a^i\\frac{\\partial}{\\partial x^i}\\big|_p$. Assume without loss of generality that $\\varphi(p)=0$ and define the curve
$$\\sigma(t)=\\varphi^{-1}(a^1t,a^2t,\\dots,a^nt)$$
Then $\\sigma(0)=p$, and for any $f$,
$$\\sigma'(0)(f)=\\frac{d}{dt}\\Big|_{t=0}f(\\sigma(t))=\\sum a^i\\frac{\\partial f}{\\partial x^i}(p)=X_p(f)$$
so $\\sigma'(0)=X_p$. Hence tangent vectors in the sense of the curve definition correspond one-to-one to tangent vectors in the sense of the algebraic definition.

---

## Applications

### Direct applications

**Example 1: computing the tangent vector of a curve on a surface**

Let $S:r=r(u,v)$ be a regular parametrised surface and let $C:u=u(t),v=v(t)$ be a curve on it. Then the tangent vector of $C$ at $t=t_0$ is
$$\\left.\\frac{dr(u(t),v(t))}{dt}\\right|_{t=0}=r_u\\left.\\frac{du}{dt}\\right|_{t=0}+r_v\\left.\\frac{dv}{dt}\\right|_{t=0}$$
where $r_u=\\partial r/\\partial u$ and $r_v=\\partial r/\\partial v$ form a basis of the tangent space.

**Example 2: computing the tangent map**

Let $f:M\\to N$ be a smooth map and let $v\\in T_pM$. Take a curve $\\gamma:(-\\varepsilon,\\varepsilon)\\to M$ with $\\gamma(0)=p,\\gamma'(0)=v$; then the tangent map $f_{*p}(v)$ equals the tangent vector of the image curve $f\\circ\\gamma$ at $f(p)$:
$$f_{*p}(v) = (f\\circ\\gamma)'(0)$$

**Example 3: the tangent vector of the $u^j$-curve**

In a local coordinate system $(U;u^i)$, fix an index $j$ and keep the other coordinates constant; this gives the $u^j$-curve
$$\\gamma_j(t)=\\varphi^{-1}(u_0^1,\\dots,u_0^{j-1},u_0^j+t,u_0^{j+1},\\dots,u_0^n)$$
whose tangent vector is precisely the natural basis vector $\\partial/\\partial u^j\\big|_p$.

### Indirect applications

- **Geodesics**: on a Riemannian [manifold](/nodes/dg%3Amanifold) $(M,g)$ a geodesic is defined as a curve whose tangent vector is parallel along itself, that is, a curve satisfying $\\nabla_{\\gamma'(t)}\\gamma'(t)=0$. This is the core geometric application of the curve definition of tangent vectors.
- **The Lie derivative**: the Lie derivative of vector fields $\\mathcal{L}_XY$ is defined by means of the tangent vectors of two curves, and measures the rate of change of a vector field along the direction of another vector field.
- **Applications in physics**: in general relativity the tangent vector $u^\\mu=dx^\\mu/d\\tau$ of the world line $x^\\mu(\\tau)$ of a particle is its four-velocity, and the geodesic equation $u^\\nu\\nabla_\\nu u^\\mu=0$ describes the motion of a free particle.

---

## Generalisations

- **From $C^\\infty$ to $C^k$**: the smoothness requirement on the curve can be relaxed to $C^1$ or $C^k$ ($k\\ge 1$), and the corresponding definition of a tangent vector still works, as long as the composite function is differentiable.
- **From finite to infinite dimension**: on an infinite-dimensional [manifold](/nodes/dg%3Amanifold) (such as a Banach [manifold](/nodes/dg%3Amanifold)) a tangent vector can likewise be defined by a curve, with $\\gamma'(0)$ taking values in a Banach space.
- **From tangent vectors to higher-order contact**: considering second (or higher) derivatives of a curve gives the notions of higher-order tangent vectors and jet spaces; this is the starting point of jet theory in differential geometry.
- **The Frobenius theorem**: extending the dual viewpoint to distributions (subbundles), the Frobenius theorem gives the integrability condition for “the tangent vectors of a curve to lie in a distribution”.

---

## Common misconceptions

**Misconception 1: “a tangent vector is just the array formed by the derivatives of the coordinates”**

Correction: in a local coordinate system the components of a tangent vector are $(\\xi^1,\\dots,\\xi^n)$, but the tangent vector itself is a geometric object that does not depend on coordinates. Under a change of coordinates the components transform by the [tensor](/nodes/dg%3Atensor) rule, rather than simply copying the transformation of the coordinates. Identifying a tangent vector with a family of coordinate components easily confuses a geometric object with its coordinate representation.

**Misconception 2: “a curve has only one tangent vector at a point”**

Correction: as a parametrised map $\\gamma(t)$, a curve indeed has only one tangent vector $\\gamma'(t_0)$ at a point $\\gamma(t_0)$. But if the curve is regarded as an image set (that is, disregarding the parametrisation), then a point of one and the same geometric curve can have several tangent vectors of different magnitudes and directions — different parametrisations give different velocity vectors. This is why the curve definition explicitly requires the curve to be a “parametrised map”.

**Misconception 3: “the curve definition and the algebraic definition are different notions”**

Correction: the two are completely equivalent. The curve definition emphasises geometric intuition, the algebraic definition emphasises algebraic operations. In the theoretical system of differential geometry both are unified under the abstract notion of the tangent space $T_pM$. Beginners often master only one of them, whereas one should understand both viewpoints and switch between them freely.

**Misconception 4: “a tangent vector must act on functions”**

Correction: although $\\gamma'(0)$ is defined as a map from $C_p^\\infty$ to $\\mathbb{R}$, once it is expanded in a local coordinate system as $\\gamma'(0)=\\sum\\xi^i\\partial/\\partial x^i|_p$, it is completely determined by its components $(\\xi^1,\\dots,\\xi^n)$. “Acting on functions” is a means of defining a tangent vector, not the whole of its content.

---

## Insights

- **“Define direction by motion”**: the essence of the curve definition of a tangent vector is that one does not define “direction” itself directly, but derives direction from “motion along a curve” (that is, velocity). This device recurs throughout mathematics: defining the derivative by a rate of change, defining the tangent space by local linearisation.
- **The idea of equivalence classes**: declaring curves through $p$ with “first-order contact” to be equivalent makes a tangent vector an equivalence class. This way of thinking — “extracting invariant information through an equivalence relation” — is everywhere in mathematics (tensor products, quotient spaces, homology groups and so on).
- **From the concrete to the abstract**: from the derivative of a curve in $\\mathbb{R}^n$, to the tangent vector of a curve on a surface, to tangent vectors defined by local coordinates on an abstract [manifold](/nodes/dg%3Amanifold), and finally to the coordinate-free equivalence-class definition — this exhibits the typical process by which mathematical notions are abstracted layer by layer, continually discarding redundant information.

---

## Summary

### Idea

**A tangent vector is the instantaneous direction of motion of a curve on a [manifold](/nodes/dg%3Amanifold); through the operation of “taking the directional derivative along the curve” it turns geometric intuition into algebraic computation.**

### Methods

| Method | Where it appears in the note |
|------|----------------|
| Defining geometric objects by curves | The canonical general form, motivation |
| Extracting invariant information by equivalence classes | Form two (the equivalence-class definition) |
| Expanding in a local coordinate system into components | Lower-dimensional formulation, equivalent expressions |
| Verifying algebraic properties (linearity, Leibniz) | The proof section |
| Generalising from the special to the general | From $\\mathbb{R}^n$ to a [manifold](/nodes/dg%3Amanifold) |

---

## Review questions

- The curve definition and the algebraic definition of a tangent vector are equivalent; does this equivalence mean that we can **always** “realise” an abstract tangent vector by a curve? In what circumstances might such a realisation run into difficulties?
- On an infinite-dimensional case such as a Banach [manifold](/nodes/dg%3Amanifold) the curve definition still works, but the basis $\\partial/\\partial x^i$ in the algebraic definition no longer exists. Does this mean that **the curve definition is more fundamental than the algebraic definition**?
- If the condition of “first-order contact” is replaced by “second-order contact” (that is, requiring the first and second derivatives of the curves at $p$ to agree), what object do we obtain? How is this related to jet theory?

---

### References

1. \`贝尔热（Berger）, 戈斯丢（Gostiaux）. 微分几何——流形、曲线和曲面（第二版修订本）（Differential Geometry: [Manifolds](/nodes/dg%3Amanifold), Curves and Surfaces, 2nd revised ed.）. 法兰西数学精品译丛（French Mathematics Masterpieces Translation Series）. 王耀东（Wang Yaodong）, 译（trans.）. 第2.5节 “切空间”（§2.5 “Tangent space”）.\`
2. \`陈维桓（Chen Weihuan）. 微分几何引论（Introduction to Differential Geometry）. 2013年12月（December 2013）. 第3章 §3.1 “切空间”（Chapter 3, §3.1 “Tangent space”）.\`
3. \`А. С. 米先柯（A. S. Mishchenko）, А. Т. 福明柯（A. T. Fomenko）. 微分几何与拓扑学简明教程（A Concise Course in Differential Geometry and Topology）. 第3章 §3.3 “切向量 切空间”（Chapter 3, §3.3 “Tangent vectors, tangent spaces”）.\`
4. \`陈维桓（Chen Weihuan）. 微分几何（Differential Geometry）. 2017年8月（August 2017）. 第3章 §3.2 “切平面和法线”（Chapter 3, §3.2 “Tangent planes and normals”）.\`
5. \`梅加强（Mei Jiaqiang）. 流形与几何初步（[Manifolds](/nodes/dg%3Amanifold) and Introductory Geometry）. 第1章 §1.4 “切空间和切映射”（Chapter 1, §1.4 “Tangent spaces and tangent maps”）.\`
6. \`梁灿彬（Liang Canbin）, 周彬（Zhou Bin）. 微分几何入门与广义相对论（3册合集）（An Introduction to Differential Geometry and General Relativity, 3-volume set）. 第2章 §2.2 “切矢和切矢场”（Chapter 2, §2.2 “Tangent vectors and tangent vector fields”）.\``,

  'dg:tangent-vector-derivation': `## The derivation definition of a tangent vector

> This note focuses on an **algebraic definition** of tangent vectors on a [smooth manifold](/nodes/dg%3Asmooth-manifold) — regarding a tangent vector as a “derivation” acting on smooth functions. Unlike the classical definition via coordinate transformations or the geometric definition via curves, the derivation definition characterises a tangent vector as a linear functional satisfying the **Leibniz rule**, so that the theory of tangent spaces can be built entirely without reference to a particular coordinate system. This viewpoint not only reveals the algebraic nature of differentiation, but also lays the foundation for regarding tangent vector fields as a structure of derivations on the ring of smooth functions.

**Source tags.** #differential-geometry

**Source.** The read-only snapshot \`G:/DifferentialGeometry/object/def/切向量的导子定义.md\` (see \`data/dg/\`).

---

### Introduction

This note focuses on an **algebraic definition** of tangent vectors on a [smooth manifold](/nodes/dg%3Asmooth-manifold) — regarding a tangent vector as a “derivation” acting on smooth functions. Unlike the classical definition via coordinate transformations or the geometric definition via curves, the derivation definition characterises a tangent vector as a linear functional satisfying the **Leibniz rule**, so that the theory of tangent spaces can be built entirely without reference to a particular coordinate system. This viewpoint not only reveals the algebraic nature of differentiation, but also lays the foundation for regarding tangent vector fields as a structure of derivations on the ring of smooth functions.

---

## Prerequisites

### Essential

- **The definition of a [smooth manifold](/nodes/dg%3Asmooth-manifold)**: understanding such basic notions as [topological manifolds](/nodes/dg%3Atopological-manifold), coordinate charts, compatibility and [smooth structure](/nodes/dg%3Asmooth-structure).
- **Linear algebra**: the basic notions of [vector spaces](/nodes/bg%3Alinear%3Avector), linear maps, bases and dual spaces.
- **Multivariable calculus**: directional derivatives, partial derivatives, the chain rule.

### Supporting

- **Smooth functions**: the ring of smooth functions $C^\\infty(M)$ on a manifold and its localisation $C^\\infty_p$ (the germs of smooth functions defined at the point $p$).
- **Curves and derivatives**: differentiation of functions of one variable satisfies linearity and the Leibniz rule.

### Further

- **Derivations in commutative algebra**: over a general commutative algebra $A$, a derivation is a $k$-linear map $d: A \\to A$ satisfying the Leibniz rule. Tangent vectors on a [manifold](/nodes/dg%3Amanifold) are exactly the **point derivations** of the ring of smooth functions with values in $\\mathbb{R}$.
- **Derivations in algebraic geometry**: in algebraic geometry the Zariski tangent space is likewise defined by derivations, which shows the deep unity of differential geometry and algebraic geometry on this basic notion.

---

## Motivation

### Motivation for introducing it

In $\\mathbb{R}^n$, a vector $v$ naturally induces a directional derivative operator:

$$ D_v f = \\lim_{t \\to 0} \\frac{f(p+tv) - f(p)}{t} = \\sum_{i=1}^n v^i \\left.\\frac{\\partial f}{\\partial x^i}\\right|_p, $$

and this operator satisfies linearity and the Leibniz rule. On a general abstract [smooth manifold](/nodes/dg%3Asmooth-manifold), however, the notion of a free vector in $\\mathbb{R}^n$ that relies on line segments and parallelism loses its meaning — because there is no global parallelism on a [manifold](/nodes/dg%3Amanifold). But we still have the notion of a “smooth function”, and the algebraic properties of differentiation (linearity + the Leibniz rule) can be carried over to a [manifold](/nodes/dg%3Amanifold). So we turn the matter around and **define a tangent vector to be an operator satisfying these algebraic properties**, thereby bypassing the difficulty that a [manifold](/nodes/dg%3Amanifold) cannot be translated as a whole.

> A thread internal to the discipline: once the theory of [differentiable manifolds](/nodes/manifold%3Ack-atlas) develops to the point of needing a global treatment of tangent spaces ([tangent bundles](/nodes/dg%3Atangent-bundle), vector fields), coordinate-dependent definitions become clumsy; the derivation definition provides a clean coordinate-free formulation.
>
> A thread from outside: in general relativity a tangent vector is intuitively understood as “an operator giving the rate of change in some direction”, rather than as a “directed line segment”.

### Motivation for the construction

Starting from the directional derivative in $\\mathbb{R}^n$, we observe two essential properties:

1. **Linearity**: $D_v(f + \\lambda g) = D_v f + \\lambda D_v g$;
2. **The Leibniz rule**: $D_v(fg) = D_v f \\cdot g(p) + f(p) \\cdot D_v g$.

These two properties characterise the directional derivative operator completely, and they do not involve the choice of a coordinate system. Hence on an abstract [manifold](/nodes/dg%3Amanifold) we simply define a tangent vector to be a map satisfying these two properties — this is “**the tangent vector as a derivation**”.

---

## Form

### Canonical general form

Let $M$ be an $n$-dimensional [smooth manifold](/nodes/dg%3Asmooth-manifold) and $p \\in M$. Write $C^\\infty_p$ for the set of germs of smooth functions at $p$ (or $C^\\infty(M)$ for the set of all smooth functions on $M$).

**Definition (tangent vector — the derivation definition)** A map $X_p: C^\\infty(M) \\to \\mathbb{R}$ (or $X_p: C^\\infty_p \\to \\mathbb{R}$) is called a **tangent vector** to $M$ at $p$ if it satisfies:

1. **Linearity**: $\\forall f,g \\in C^\\infty(M),\\; \\lambda \\in \\mathbb{R}$,
   $$ X_p(f + \\lambda g) = X_p f + \\lambda X_p g; $$

2. **The Leibniz rule**: $\\forall f,g \\in C^\\infty(M)$,
   $$ X_p(fg) = (X_p f) \\cdot g(p) + f(p) \\cdot (X_p g). $$

**Definition (tangent space)** The set of all tangent vectors at the point $p$ forms an $\\mathbb{R}$-[vector space](/nodes/bg%3Alinear%3Avector), called the **tangent space** to $M$ at $p$ and written $T_p M$.

> One deduces directly from the definition that $X_p(c) = 0$ for every constant function $c$, and that $X_p f$ depends only on the values of $f$ near $p$ (locality).

### Equivalent expressions

A tangent vector can be defined in the following equivalent ways:

| Definition | Core idea | Main advantage |
|---------|---------|---------|
| **The derivation definition** | a linear functional satisfying the Leibniz rule | algebraic, coordinate-free |
| **The equivalence-class-of-curves definition** | the equivalence class of a smooth curve through $p$ under the relation $\\sigma_1 \\sim \\sigma_2 \\iff \\frac{d}{dt}(x^i \\circ \\sigma_1)\\big|_0 = \\frac{d}{dt}(x^i \\circ \\sigma_2)\\big|_0$ | geometric intuition |
| **The coordinate-transformation definition** | to each coordinate system a family of numbers $(\\xi^1_\\alpha,\\dots,\\xi^n_\\alpha)$ is attached, subject to $\\xi^k_\\alpha = \\sum_i \\frac{\\partial x^k_\\alpha}{\\partial x^i_\\beta}(p) \\xi^i_\\beta$ under a change of coordinates | convenient for computation |

The proof that the three definitions agree: an equivalence class of curves becomes a derivation through $\\sigma'(0)(f) = \\frac{d}{dt}(f\\circ\\sigma)(0)$; a derivation $X_p$ corresponds in local coordinates to the components $X_p(x^i)$, and satisfies the coordinate-transformation [tensor](/nodes/dg%3Atensor) rule.

### Expression in a local coordinate system

Let $(U; x^1,\\dots,x^n)$ be a local coordinate system near $p$. Define $n$ special tangent vectors:

$$ \\left.\\frac{\\partial}{\\partial x^i}\\right|_p f = \\frac{\\partial (f \\circ \\varphi^{-1})}{\\partial x^i}(\\varphi(p)), \\qquad \\forall f \\in C^\\infty_p, $$

where $\\varphi: U \\to \\mathbb{R}^n$ is the coordinate map. These $\\left\\{\\left.\\frac{\\partial}{\\partial x^i}\\right|_p\\right\\}_{i=1}^n$ form a **natural basis** of $T_p M$, so that $\\dim T_p M = n$. Every tangent vector $X_p \\in T_p M$ can be written uniquely as:

$$ X_p = \\sum_{i=1}^n X_p(x^i) \\left.\\frac{\\partial}{\\partial x^i}\\right|_p. $$

### Reduction

From the point of view of category theory, the tangent space $T_p M$ is the **space of derivations** $\\operatorname{Der}_p(C^\\infty(M), \\mathbb{R})$ of the $\\mathbb{R}$-algebra $C^\\infty(M)$ at the point $p$. It consists of all $\\mathbb{R}$-linear maps satisfying the Leibniz rule. More generally, for any commutative $\\mathbb{R}$-algebra $A$ we can define its module of derivations $\\operatorname{Der}(A, \\mathbb{R})$.

### Lifting

- A tangent vector field $X: M \\to TM$ (satisfying $\\pi \\circ X = \\operatorname{id}_M$) can further be regarded as a **derivation operator** on the ring of smooth functions: $X: C^\\infty(M) \\to C^\\infty(M)$, defined by $(Xf)(p) = X_p f$. This viewpoint identifies tangent vector fields with first-order differential operators on the ring of functions.
- The **[tangent bundle](/nodes/dg%3Atangent-bundle)** $TM = \\bigcup_{p\\in M} T_p M$ can itself be given the structure of a [smooth manifold](/nodes/dg%3Asmooth-manifold), and is a vector bundle.
- The notion of a derivation generalises to **higher order** (the order of a differential operator) and to **sections of vector bundles** (connections).

---

## Proof

### The natural basis is a basis of the tangent space

**Theorem (basis theorem)** Let $(U; x^1,\\dots,x^n)$ be a local coordinate system near $p$; then $\\left\\{\\left.\\frac{\\partial}{\\partial x^i}\\right|_p\\right\\}_{i=1}^n$ is a basis of $T_p M$.

**Sketch of the proof and the key steps:**

1. **Spanning**: for any $X_p \\in T_p M$ and any $f \\in C^\\infty_p$, use the lemma to expand $f$ near $p$ as:
   $$ f = f(p) + \\sum_{i=1}^n (x^i - x^i(p)) g_i, \\quad g_i(p) = \\left.\\frac{\\partial}{\\partial x^i}\\right|_p f. $$
   The Leibniz rule and linearity give:
   $$ X_p f = \\sum_{i=1}^n X_p(x^i) \\cdot g_i(p) = \\sum_{i=1}^n X_p(x^i) \\left.\\frac{\\partial}{\\partial x^i}\\right|_p f. $$
   Hence $X_p = \\sum_i X_p(x^i) \\left.\\frac{\\partial}{\\partial x^i}\\right|_p$.

2. **Linear independence**: suppose $\\sum_i c_i \\left.\\frac{\\partial}{\\partial x^i}\\right|_p = 0$. Applying both sides to the coordinate function $x^j$ gives:
   $$ 0 = \\sum_i c_i \\left.\\frac{\\partial}{\\partial x^i}\\right|_p (x^j) = \\sum_i c_i \\delta^j_i = c_j, \\quad j=1,\\dots,n. $$
   So all the coefficients vanish. $\\square$

---

## Applications

### Direct applications

**Example 1: the tangent vector of a smooth curve**
Let $\\gamma: (-\\varepsilon,\\varepsilon) \\to M$ be a smooth curve and $p = \\gamma(0)$. Define:
$$ \\gamma'(0)(f) = \\frac{d}{dt}\\Big|_{t=0} f(\\gamma(t)), \\quad \\forall f \\in C^\\infty_p. $$
A direct verification shows that $\\gamma'(0)$ satisfies linearity and the Leibniz rule, so $\\gamma'(0) \\in T_p M$.

**Example 2: the natural basis induced by the coordinate curves**
In a local coordinate system $(U; x^1,\\dots,x^n)$, fix all coordinates except $x^j$; this gives the $x^j$-coordinate curve $\\gamma_j(t) = \\varphi^{-1}(x^1(p),\\dots,x^j(p)+t,\\dots,x^n(p))$, and then:
$$ \\gamma_j'(0) = \\left.\\frac{\\partial}{\\partial x^j}\\right|_p. $$

### Indirect applications

- **The tangent map** (differential): the tangent map $f_{*p}: T_pM \\to T_{f(p)}N$ of a smooth map $f: M \\to N$ at $p$ is defined by $(f_{*p}X_p)g = X_p(g \\circ f)$. This formulation is in essence the “pushforward” of derivations.
- **The Lie bracket**: the Lie bracket $[X,Y]$ of smooth tangent vector fields $X,Y$ is defined by $[X,Y]_p f = X_p(Yf) - Y_p(Xf)$; one verifies that it is a tangent vector and satisfies the Jacobi identity.
- **Exterior derivative and interior product**: in the theory of [differential forms](/nodes/dg%3Adifferential-form), both the interior product $i_X$ and the Lie derivative $L_X$ rest on the derivation property of tangent vectors.
- **General relativity**: physically, a tangent vector is regarded as “an operator giving the rate of change in some direction”, and the derivation definition adapts naturally to the geometric description of curved spacetime.

---

## Generalizations

- **Tangent vectors on a complex [manifold](/nodes/dg%3Amanifold)**: holomorphic tangent vectors can be defined similarly on the ring of holomorphic functions, forming the holomorphic [tangent bundle](/nodes/dg%3Atangent-bundle).
- **The Zariski tangent space in algebraic geometry**: for an affine algebraic variety, the Zariski tangent space is defined as the space of derivations $\\operatorname{Der}_k(\\mathcal{O}_{X,p}, k)$ over the local ring $\\mathcal{O}_{X,p}$, where $k$ is the base field.
- **Higher-order derivations and jets**: a differential operator of order $k$ can be regarded as a map on the ring of functions satisfying a higher-order Leibniz rule, and jet theory systematises this.
- **Connections on vector bundles**: a connection $\\nabla$ is an operation extending the directional derivative to sections of a vector bundle and satisfying $\\nabla_X(f\\sigma) = (Xf)\\sigma + f\\nabla_X\\sigma$; here too the Leibniz rule is the core.

---

## Common misconceptions

1. **“A tangent vector must be thought of as an arrow”**
   Beginners often find it hard to accept the view that “a tangent vector is an operator”. In fact, for an abstract [manifold](/nodes/dg%3Amanifold) an “arrow” (directed line segment) is not defined; the derivation definition is the portable, algebraically clean one. In $\\mathbb{R}^n$ the two agree naturally through the directional derivative.

2. **“The Leibniz rule is just the product rule for derivatives”**
   Here the Leibniz rule plays the role of an **axiom**, not of a conclusion deduced from some formula. It is exactly what captures the algebraic core of the intuition of a “directional derivative”.

3. **“The definition by derivations is independent of local coordinates, so coordinates are never needed”**
   Although the definition does not depend on coordinates, concrete computations (verifying that a map is a derivation, finding the components of a tangent vector in the natural basis) usually still call for a local coordinate system.

---

## Insights

- The shift from “a vector is an arrow” to “a vector is an operator” embodies the central way of thinking of modern differential geometry: **define a geometric object by its measurable algebraic properties**.
- The Leibniz rule plays the role of an **essential axiom** here — it is precisely what distinguishes a “tangent vector” from an ordinary linear functional, capturing the essence of the operation “take the directional derivative”.
- This device of “replacing an object by its action” recurs throughout mathematics (distributions, generalised functions, dual spaces); it is an extremely powerful tool of thought.

---

## Summary

### Idea

**“Think of a tangent vector as an operator taking directional derivatives”** — by giving up the “arrow” of geometric intuition, one gains algebraic universality and a clean coordinate-free formulation.

### Methods

| Method | Where it is used in this note |
|------|----------------|
| Replacing a geometric construction by algebraic axioms | the derivation definition of a tangent vector |
| The local expansion technique (expanding a smooth function using the coordinate functions) | the proof of the basis theorem |
| Converting between equivalent definitions | the discussion of the equivalence of the three definitions |
| Making a local construction global | vector fields as derivation fields |

---

## Looking back and asking

- If $C^\\infty(M)$ is replaced by $C^k(M)$ ($k < \\infty$), does the derivation definition still give a finite-dimensional tangent space?
- At which step does the equivalence between the derivation definition and the equivalence-class-of-curves definition depend on smoothness ($C^\\infty$) rather than merely $C^1$?
- On a real analytic [manifold](/nodes/dg%3Amanifold) or a complex [manifold](/nodes/dg%3Amanifold), does a similar derivation definition still hold?

---

## References

[1] \`陈维桓（Chen Weihuan）. 微分几何引论（Introduction to Differential Geometry）[M]. 北京（Beijing）: 北京大学出版社（Peking University Press）, 2013.\` **§3.1 Tangent space** gives the derivation definition of a tangent vector, the Leibniz rule, the natural basis and a complete proof of the basis theorem.

[2] \`梅加强（Mei Jiaqiang）. 流形与几何初步（Manifolds and Introductory Geometry）[M].\` **§1.4 Tangent spaces and tangent maps** defines the tangent vector as a derivation and discusses its relation to the tangent vector of a curve; **§2.1 Tangent bundles and vector fields** further discusses the characterisation of vector fields by derivations.

[3] \`А. С. 米先柯（A. S. Mishchenko）, А. Т. 福明柯（A. T. Fomenko）. 微分几何与拓扑学简明教程（A Concise Course in Differential Geometry and Topology）[M].\` **§3.3.2–§3.3.4** give the coordinate-transformation definition of a tangent vector, the directional derivative of a function along a tangent vector, and the theorem that “every derivation corresponds to a tangent vector”.

[4] \`贝尔热（Berger）, 戈斯丢（Gostiaux）. 微分几何：流形、曲线和曲面（第二版修订本）（Differential Geometry: Manifolds, Curves and Surfaces, 2nd revised ed.）[M]. 王耀东（Wang Yaodong）, 译（trans.）.\` **§2.5 Tangent space** starts from the tangent vectors of a sub[manifold](/nodes/dg%3Amanifold) of $\\mathbb{R}^n$ and gives the [curve definition of a tangent vector](/nodes/dg%3Atangent-vector-curve).`,

  'dg:tangent-vector-equivalence': `## The equivalence of the two definitions of a tangent vector

> A tangent vector is one of the most basic notions on a [manifold](/nodes/dg%3Amanifold); it is the rigorous form, on a [smooth manifold](/nodes/dg%3Asmooth-manifold), of the intuition of a “directional derivative” in Euclidean space. In differential geometry a tangent vector has two forms that look different but are completely equivalent: the **geometric definition** (an equivalence class of curves) and the **algebraic definition** (a derivation). This note sets out both definitions systematically, proves their equivalence, and shows how they join up naturally in mathematics.

**Source.** The read-only snapshot \`G:/DifferentialGeometry/object/def/切向量两种定义的等价性.md\` (see \`data/dg/\`).

---

### Introduction

A tangent vector is one of the most basic notions on a [manifold](/nodes/dg%3Amanifold); it is the rigorous form, on a [smooth manifold](/nodes/dg%3Asmooth-manifold), of the intuition of a “directional derivative” in Euclidean space. In differential geometry a tangent vector has two forms that look different but are completely equivalent: the **geometric definition** (an equivalence class of curves) and the **algebraic definition** (a derivation). This note sets out both definitions systematically, proves their equivalence, and shows how they join up naturally in mathematics.

---

## Prerequisites

### Essential

- **The basic notions of a [smooth manifold](/nodes/dg%3Asmooth-manifold)**: knowing what a [topological manifold](/nodes/dg%3Atopological-manifold), a [coordinate chart](/nodes/dg%3Acoordinate-chart) atlas and a [smooth structure](/nodes/dg%3Asmooth-structure) are, and understanding the dimension of a [manifold](/nodes/dg%3Amanifold).
- **Calculus in Euclidean space**: partial derivatives of functions of several variables, the chain rule, directional derivatives.
- **Basic linear algebra**: [vector spaces](/nodes/bg%3Alinear%3Avector), linear maps, bases and coordinates, the Jacobian matrix of a linear transformation.
- **Smooth functions and smooth maps**: $C^\\infty(M)$ denotes the set of all smooth functions on a [manifold](/nodes/dg%3Amanifold) $M$; the expression of a smooth map in a chart is a smooth map.

The material above is just enough: if you understand the meaning of the directional derivative $D_v f = \\sum v^i \\frac{\\partial f}{\\partial x^i}$ in $\\mathbb{R}^n$, and you know that on a [manifold](/nodes/dg%3Amanifold) a chart can pull a local problem back into $\\mathbb{R}^n$, you can start reading this note.

### Supporting

- **Basics of point-set topology**: open sets, continuous maps, [homeomorphisms](/nodes/dg%3Ahomeomorphism) — these help in understanding the topological structure of a [manifold](/nodes/dg%3Amanifold).
- **Basic notions of abstract algebra**: linear maps, quotient spaces, equivalence relations — these help in understanding the construction of the tangent space as a quotient space or as a linear space.

### Further

- **[Tangent bundles](/nodes/dg%3Atangent-bundle) and vector bundles**: as $p$ varies, the tangent spaces $T_p M$ assemble into the [tangent bundle](/nodes/dg%3Atangent-bundle) $TM$, the prototype of a vector bundle. Understanding the two definitions of a tangent vector helps in understanding cotangent vectors, [differential forms](/nodes/dg%3Adifferential-form) and [tensor](/nodes/dg%3Atensor) fields later on.
- **A categorical viewpoint**: the tangent space is a functor from [manifolds](/nodes/dg%3Amanifold) to [vector spaces](/nodes/bg%3Alinear%3Avector) (the tangent functor); the two definitions correspond to two ways of constructing this functor, and their equivalence corresponds to a natural isomorphism.
- **The analogue in algebraic geometry**: in algebraic geometry the Zariski tangent space likewise has a “derivation” definition, except that the sheaf of smooth functions is replaced by a local ring.

---

## Motivation

### Motivation for introducing it

The tangent vector did not appear out of nowhere; it arose from needs in several directions.

#### A thread internal to the discipline

**The analytic thread**: in Euclidean space $\\mathbb{R}^n$, given a point $p$ and a vector $v$, one can define the directional derivative of a function $f$ at $p$ along $v$:
$$
D_v f = \\lim_{t\\to 0}\\frac{f(p+tv)-f(p)}{t} = \\sum_{i=1}^n v^i \\left.\\frac{\\partial f}{\\partial x^i}\\right|_p.
$$
This expression depends on the linear structure of $\\mathbb{R}^n$ (so that $p+tv$ is defined). But on a [smooth manifold](/nodes/dg%3Asmooth-manifold) there is no global linear structure, and an addition such as $p+tv$ cannot be performed directly. A way of describing the “directional derivative” that does not depend on a global linear structure is therefore needed, and this is the origin of the notion of a tangent vector.

**The geometric thread**: in surface theory, a tangent vector at a point $p$ of a surface $S$ is intuitively “a vector lying in the tangent plane”. Every smooth curve on $S$ through $p$ has a tangent vector at that point, and all these tangent vectors span the tangent plane. Defining a tangent vector starting from equivalence classes of curves is precisely the generalisation of this intuition to an abstract [manifold](/nodes/dg%3Amanifold).

**The topological thread**: when studying a map $f: M \\to N$ of [manifolds](/nodes/dg%3Amanifold), one needs to linearise it at the level of tangent spaces to obtain the tangent map $f_{*p}: T_p M \\to T_{f(p)} N$. This requires $T_p M$ to carry a linear space structure and $f_{*p}$ to be a linear map. Both definitions induce a linear space structure and a tangent map naturally.

#### A thread from outside

**Physics (general relativity)**: in general relativity spacetime is a four-dimensional pseudo-Riemannian [manifold](/nodes/dg%3Amanifold). The trajectory of a particle is a curve on the [manifold](/nodes/dg%3Amanifold), and its four-velocity is a tangent vector. Physicists need both viewpoints: the tangent vector of a curve (intuitively corresponding to velocity) and the derivation (corresponding to the directional-derivative operator, used to define the [covariant derivative](/nodes/tensor%3Afield)). Liang Canbin and Zhou Bin state explicitly in *An Introduction to Differential Geometry and General Relativity* that any element of $V_p$ can be regarded as the tangent vector of some curve through $p$, and hence call it a tangent vector.

**Computer graphics and robotics**: in handling motion on a surface one needs to compute directional derivatives on the surface, which is crucial in mesh deformation and path planning. The two definitions give a twofold understanding for algorithm design — one can approximate tangent directions by discrete curves, or do analytic computations in the derivation form.

#### An aesthetic/structural thread

From the point of view of mathematical structure, the definition of a tangent vector as a notion should satisfy “naturalness”: it must not depend on the choice of chart. The geometric definition removes the dependence on coordinates by an equivalence relation; the algebraic definition characterises a tangent vector as “a linear operator satisfying the Leibniz rule”, which is in essence more algebraic and more intrinsic. The equivalence of the two definitions reveals a deep mathematical phenomenon — one and the same geometric object can have different “incarnations”, expressing the same idea in different mathematical languages, and in the end all roads lead to the same place.

### Motivation for the construction

The notion of a tangent vector went through a process of evolution from the concrete to the abstract.

| Stage | Concrete object/form | Problem solved | Remaining defect / question driving the next step |
|:---:|:---|:---|:---|
| **Seed** | the free vector $\\vec{pq}$ in $\\mathbb{R}^n$ | represents a directed segment in Euclidean space, has intuitive geometric meaning, and defines the directional derivative $D_v f$ | the linear structure depends on the global parallelism of $\\mathbb{R}^n$ and cannot be carried over to a [manifold](/nodes/dg%3Amanifold) directly |
| **Intermediate form 1** | the tangent vector $\\alpha'(0)$ of a curve through $p$ on a surface $S \\subset \\mathbb{R}^3$ | in the sub[manifold](/nodes/dg%3Amanifold) situation a tangent vector can be defined by curves along the surface, and the tangent space is a subspace of $\\mathbb{R}^3$ | depends on the embedding in $\\mathbb{R}^3$, and does not apply to an abstract [manifold](/nodes/dg%3Amanifold) |
| **Intermediate form 2** | equivalence classes of curves (the geometric definition) | independent of any embedding; equivalence classes are defined by comparing curve derivatives in charts, giving $T_p M = \\{\\text{curves}\\}/\\sim$ | each class needs a representative, so the construction of operations is slightly less direct |
| **Intermediate form 3** | the directional-derivative operator / derivation (the algebraic definition) | defines a tangent vector directly as a linear operator $X: C_p^\\infty \\to \\mathbb{R}$ satisfying the Leibniz rule | the notion is abstract, and its connection with the intuition of “velocity” is weaker |
| **Canonical form** | the two definitions are equivalent, and $T_p M$ is used uniformly | combines geometric intuition with algebraic rigour into a unified theory of the tangent space | —— |

---

## Form

### Canonical general form

A tangent vector has two general forms of expression, each with its own advantages.

**The geometric definition (equivalence classes of curves)**:
$$
T_p M = \\{\\text{curves through } p \\text{ that are smooth}\\}/\\sim,
$$
where two curves $c_1, c_2$ are equivalent if and only if, in some (and hence every) chart $\\varphi$,
$$
\\frac{d}{dt}\\Big|_{t=0}(\\varphi \\circ c_1(t)) = \\frac{d}{dt}\\Big|_{t=0}(\\varphi \\circ c_2(t)).
$$

**The algebraic definition (a derivation)**:
$$
X: C_p^\\infty(M) \\to \\mathbb{R},
$$
satisfying $\\mathbb{R}$-linearity $X(\\alpha f + \\beta g) = \\alpha X(f) + \\beta X(g)$ and the Leibniz rule $X(fg) = X(f)g(p) + f(p)X(g)$.

**Comparison**: the geometric definition is intuitive — it tells you that a tangent vector is “the velocity of a curve”; the algebraic definition is convenient for computation — addition, scalar multiplication and the tangent map $f_{*p}$ are all defined directly. Each has its advantages, and the equivalence ensures that we may switch freely according to the situation.

### Equivalent expressions

A third equivalent expression for a tangent vector is the **coordinate-transformation definition** (the “[tensor](/nodes/dg%3Atensor) rule” definition commonly used by physicists): in a local coordinate system $(x^1,\\dots,x^n)$ a tangent vector is represented by an $n$-tuple $(\\xi^1,\\dots,\\xi^n)$ which, under a change of coordinates $x \\to \\tilde{x}$, transforms by
$$
\\tilde{\\xi}^i = \\sum_{j=1}^n \\frac{\\partial \\tilde{x}^i}{\\partial x^j}(p) \\,\\xi^j
$$
This formulation corresponds exactly to the coordinates of the tangent vector in the natural basis $\\{\\partial/\\partial x^i|_p\\}$ in the first two definitions.

### Kinds of statement

The topic “tangent vector” can be understood through the following categories:

- **As a definition**: a tangent vector is a basic definitional notion in the theory of [differentiable manifolds](/nodes/manifold%3Ack-atlas), comparable to “open set” in topology or “group” in algebra.
- **As a specific notion**: a tangent vector is not a “vector” in the general sense (such as a free vector in $\\mathbb{R}^n$), but an element of the **linearised space** of a [manifold](/nodes/dg%3Amanifold) at a point; it must satisfy a certain “intrinsicality” — independence of the choice of coordinates.
- **In the classification of objects**: a tangent vector belongs to the “differential-geometric objects” among “geometric objects”, and forms a hierarchy together with cotangent vectors, [tensors](/nodes/dg%3Atensor) and so on.

### How are the relevant statements expressed in natural language?

- The geometric definition: “a tangent vector is the velocity of a smooth curve through the point”.
- The algebraic definition: “a tangent vector is a directional-derivative operator acting on smooth functions”.
- The equivalence: “give me a curve and I get a derivation; give me a derivation and I can construct a curve whose tangent vector is exactly that derivation. The two ways are completely compatible.”

### Reduction

Describing the essence of the two definitions in the language of set theory:

- **The geometric definition**: $T_p M = \\{c: (-\\varepsilon,\\varepsilon) \\to M \\mid c(0)=p,\\ c\\text{ smooth}\\} / \\sim$, that is, a certain quotient set of functions.
- **The algebraic definition**: $T_p M = \\operatorname{Der}_\\mathbb{R}(C_p^\\infty(M), \\mathbb{R})$, that is, the set of derivations from the algebra of function germs to $\\mathbb{R}$.
- **The equivalence**: there is a natural $\\mathbb{R}$-[vector space](/nodes/bg%3Alinear%3Avector) isomorphism $\\Phi: \\{\\text{equivalence classes of curves}\\} \\to \\operatorname{Der}_\\mathbb{R}(C_p^\\infty(M), \\mathbb{R})$, given by $\\Phi([c])(f) = \\frac{d}{dt}|_{t=0} f\\circ c(t)$.

From the **categorical** point of view: the tangent space is a functor $T: \\mathbf{Man}^\\infty \\to \\mathbf{Vec}_\\mathbb{R}$ taking a [manifold](/nodes/dg%3Amanifold) $M$ to $T M$ (the [tangent bundle](/nodes/dg%3Atangent-bundle)) and a smooth map $f: M \\to N$ to $f_*: TM \\to TN$. The two definitions give two ways of constructing this functor, and their equivalence shows that the functor is “well defined”.

### Lifting

In **Riemannian geometry** a tangent vector is the basis for defining the metric, the connection ([covariant derivative](/nodes/tensor%3Afield)), curvature and every higher structure. For instance, a [Riemannian metric](/nodes/manifold%3Achart-atlas) $g$ assigns an inner product $g_p: T_p M \\times T_p M \\to \\mathbb{R}$ on the tangent space at each point. Without tangent spaces there would be no Riemannian geometry.

In **global differential geometry** the [tangent bundle](/nodes/dg%3Atangent-bundle) $TM$ is itself a $2n$-dimensional [manifold](/nodes/dg%3Amanifold), and structures on it (such as almost complex structures and symplectic structures) are important tools for studying the topological properties of a [manifold](/nodes/dg%3Amanifold).

In **algebraic geometry** the notion of the “Zariski tangent space” is the analogue of the tangent space of a [manifold](/nodes/dg%3Amanifold): for the local ring of an algebraic variety at a point, the dual of $\\mathfrak{m}/\\mathfrak{m}^2$ of its maximal ideal is the Zariski tangent space at that point, and the derivation definition is also the basic way of defining it there.

### Understanding through links with similar objects, if the topic has any

- **Cotangent vectors and the cotangent space** $T_p^*M$: the dual space of the tangent space, formed by cotangent vectors (the fibres of [differential forms](/nodes/dg%3Adifferential-form)). The equivalence of the two definitions has a counterpart at the cotangent level.
- **Tangent vector fields**: assigning a tangent vector to each point gives a section of the [tangent bundle](/nodes/dg%3Atangent-bundle). In the geometric definition a vector field can be seen as the generator of the “local flow of a curve”; in the algebraic definition it is a sheaf of derivations of function germs.
- **The tangent map**: $f_{*p}: T_p M \\to T_{f(p)} N$, defined in the geometric definition by the image of a curve, $(f\\circ c)'(0)$, and in the algebraic definition by $(f_{*p}X)(g) = X(g\\circ f)$.

---

## Proof

Here we prove the equivalence of the geometric and the algebraic definition — that is, the existence of an $\\mathbb{R}$-[vector space](/nodes/bg%3Alinear%3Avector) isomorphism $\\Phi$.

### Proof sketch

In one sentence: **each curve $c$ through $p$ gives a derivation by “differentiating along the curve”, $X_c(f)=\\frac{d}{dt}|_{t=0}f\\circ c(t)$; conversely, each derivation $X$ is written in coordinates as $\\sum a^i\\partial/\\partial x^i|_p$, and the curve $\\sigma(t)=\\varphi^{-1}(a^1t,\\dots,a^nt)$ that one constructs induces exactly the derivation $X$. The two maps are mutually inverse.**

---

**Theorem** Let $M$ be a [smooth manifold](/nodes/dg%3Asmooth-manifold) and $p\\in M$. Write $T_p^{\\text{geo}}M = \\{\\text{curves through }p\\text{ that are smooth}\\}/\\sim$ for the geometric tangent space and $T_p^{\\text{alg}}M = \\operatorname{Der}_\\mathbb{R}(C_p^\\infty(M),\\mathbb{R})$ for the algebraic tangent space. Then there is an $\\mathbb{R}$-[vector space](/nodes/bg%3Alinear%3Avector) isomorphism
$$
\\Phi: T_p^{\\text{geo}}M \\xrightarrow{\\cong} T_p^{\\text{alg}}M.
$$

**Proof**:

#### Step 1: defining the map $\\Phi$

For any equivalence class of curves $[c] \\in T_p^{\\text{geo}}M$, define $X_c = \\Phi([c]): C_p^\\infty(M) \\to \\mathbb{R}$ by
$$
X_c(f) = \\frac{d}{dt}\\Big|_{t=0} (f\\circ c(t)).
$$

We have to verify that $X_c$ really is a derivation (an algebraic tangent vector), and that $\\Phi$ is well defined (that is, independent of the choice of representative curve).

#### Step 2: $X_c$ satisfies linearity

For any $\\alpha,\\beta \\in \\mathbb{R}$ and $f,g\\in C_p^\\infty(M)$,
$$
\\begin{aligned}
X_c(\\alpha f + \\beta g) &= \\frac{d}{dt}\\Big|_{t=0} \\big((\\alpha f + \\beta g)\\circ c(t)\\big) \\\\
&= \\alpha \\frac{d}{dt}\\Big|_{t=0} f\\circ c(t) + \\beta \\frac{d}{dt}\\Big|_{t=0} g\\circ c(t) \\\\
&= \\alpha X_c(f) + \\beta X_c(g).
\\end{aligned}
$$
where the second step is guaranteed by the linearity of differentiation.

#### Step 3: $X_c$ satisfies the Leibniz rule

$$
\\begin{aligned}
X_c(f\\cdot g) &= \\frac{d}{dt}\\Big|_{t=0} (f\\cdot g)\\circ c(t) = \\frac{d}{dt}\\Big|_{t=0} \\big( f(c(t))\\cdot g(c(t)) \\big) \\\\
&= \\left(\\frac{d}{dt}\\Big|_{t=0} f(c(t))\\right) \\cdot g(c(0)) + f(c(0))\\cdot \\left(\\frac{d}{dt}\\Big|_{t=0} g(c(t))\\right) \\\\
&= X_c(f) \\cdot g(p) + f(p) \\cdot X_c(g).
\\end{aligned}
$$

#### Step 4: $\\Phi$ is well defined

Let $c_1 \\sim c_2$, that is, for some (and hence every) chart $\\varphi$, $(\\varphi\\circ c_1)'(0) = (\\varphi\\circ c_2)'(0)$. Take a chart $(U,\\varphi)$ centred at $p$ with coordinate functions $x^1,\\dots,x^n$. By the chain rule, for every $f\\in C_p^\\infty(M)$,
$$
\\frac{d}{dt}\\Big|_{t=0} f\\circ c_i(t) = \\sum_{j=1}^n \\frac{\\partial (f\\circ \\varphi^{-1})}{\\partial u^j}(\\varphi(p)) \\cdot \\frac{d}{dt}\\Big|_{t=0} (x^j\\circ c_i)(t).
$$
Since $(\\varphi\\circ c_1)'(0) = (\\varphi\\circ c_2)'(0)$, the right-hand side is the same for $i=1,2$, so $X_{c_1}=X_{c_2}$. Hence $\\Phi$ is well defined.

#### Step 5: constructing the inverse of $\\Phi$

Take a chart $(U,\\varphi)$ with coordinate functions $x^1,\\dots,x^n$, and let $X$ be a derivation. By the standard expansion theorem for tangent vectors, the expression of $X$ in the natural basis is
$$
X = \\sum_{i=1}^n X(x^i) \\left.\\frac{\\partial}{\\partial x^i}\\right|_p.
$$
Write $a^i = X(x^i)$. Construct the curve (after choosing the chart so that $\\varphi(p)=0$)
$$
\\sigma(t) = \\varphi^{-1}(a^1 t, a^2 t,\\dots, a^n t),\\quad t\\in(-\\varepsilon,\\varepsilon),
$$
so that clearly $\\sigma(0)=p$.

Verification: for every $f\\in C_p^\\infty(M)$,
$$
\\begin{aligned}
X_\\sigma(f) &= \\frac{d}{dt}\\Big|_{t=0} f\\circ\\sigma(t) \\\\
&= \\frac{d}{dt}\\Big|_{t=0} f\\circ\\varphi^{-1}(a^1 t,\\dots,a^n t) \\\\
&= \\sum_{i=1}^n a^i \\frac{\\partial (f\\circ\\varphi^{-1})}{\\partial u^i}(0) \\\\
&= \\sum_{i=1}^n X(x^i) \\left.\\frac{\\partial}{\\partial x^i}\\right|_p\\!(f) = X(f).
\\end{aligned}
$$
Hence $\\Phi([\\sigma]) = X$, that is, $\\Phi$ is surjective.

#### Step 6: injectivity

If $\\Phi([c_1]) = \\Phi([c_2])$, then in coordinates $(\\varphi\\circ c_1)'(0) = (\\varphi\\circ c_2)'(0)$, so $c_1\\sim c_2$, that is, $[c_1]=[c_2]$. Hence $\\Phi$ is injective.

#### Step 7: preservation of the linear structure

The linear structure on the geometric tangent space is induced by coordinates: $[c_1]+[c_2]$ corresponds to the equivalence class determined by $(\\varphi\\circ c_1)'(0) + (\\varphi\\circ c_2)'(0)$. One checks easily that $\\Phi$ preserves addition and scalar multiplication, and is therefore an $\\mathbb{R}$-[vector space](/nodes/bg%3Alinear%3Avector) isomorphism.

**The theorem is proved**.

---

## Applications

### Direct applications

**Example 1: computing the tangent map**

Let $f: M \\to N$ be a smooth map. The definition of the tangent map $f_{*p}: T_p M \\to T_{f(p)} N$ is very concise in both definitions:
- The geometric definition: $f_{*p}([c]) = [f\\circ c]$ (the equivalence class of the image of the curve).
- The algebraic definition: $(f_{*p}(X))(g) = X(g\\circ f)$, where $g\\in C_{f(p)}^\\infty(N)$.

The two definitions give the same result at once, and the equivalence guarantees the consistency of the two ways of computing.

**Example 2: the case of $\\mathbb{R}^n$**

In $\\mathbb{R}^n$ a tangent vector $v$ at $p$ corresponds in the geometric definition to the curve $c(t)=p+tv$, and in the algebraic definition to the derivation $D_v = \\sum v^i \\partial/\\partial x^i|_p$. Here the equivalence of the two definitions degenerates into “the chain rule for directional derivatives” — a fact of calculus with which we are already familiar.

### Indirect applications

#### Indirect applications in mathematics

- **Riemannian geometry**: the metric $g_p$ is defined on the tangent space $T_p M$; the Riemannian connection $\\nabla$ is the tool for comparing tangent vectors in the tangent spaces at different points, and the [covariant derivative](/nodes/tensor%3Afield) $\\nabla_X Y$ depends on the derivation viewpoint on tangent vector fields.
- **Differential topology**: the transversality theorem, Sard’s theorem and others involve properties of the tangent map, and their proofs cannot do without a flexible use of the two definitions.
- **Lie groups and Lie algebras**: the Lie algebra is defined as $T_e G$ (the tangent space at the identity), and the two views of the Lie bracket (the commutator of left-invariant vector fields, and the differential of the adjoint representation) are precisely manifestations of the two definitions of a tangent vector.

#### The role in physics and computer science

- **General relativity**: the four-velocity of a particle is the tangent vector of a curve; the [covariant derivative](/nodes/tensor%3Afield) is defined by derivations, $\\nabla_{\\partial_\\mu}\\partial_\\nu = \\Gamma^\\lambda_{\\mu\\nu}\\partial_\\lambda$. Neither viewpoint can be dispensed with.
- **Computer graphics**: tangent vectors on a surface are used in normal mapping and in computing differential operators on a [manifold](/nodes/dg%3Amanifold) mesh. The geometric viewpoint suits discrete approximation, the algebraic viewpoint suits continuous computation.

---

## Generalizations

- **The hypotheses can be relaxed to $C^k$ [manifolds](/nodes/dg%3Amanifold)** ($k\\ge 1$): the definition of a tangent vector requires only that curves and functions be $C^1$, and the chain rule in the proof above needs only first-order differentiability.
- **For complex [manifolds](/nodes/dg%3Amanifold)**: the complex tangent space $T_p^{\\mathbb{C}}M$ can be defined similarly, and the equivalence of the two definitions still holds.
- **For infinite-dimensional [manifolds](/nodes/dg%3Amanifold)** (such as Banach [manifolds](/nodes/dg%3Amanifold)): the algebraic definition of a tangent vector (a derivation) and the geometric definition (an equivalence class of curves) remain equivalent under suitable differentiability conditions, but the structure of the function space becomes more complicated.
- **In algebraic geometry**: the Zariski tangent space of an algebraic variety at a point is defined mainly through derivations (that is, the dual of $\\mathfrak{m}_p/\\mathfrak{m}_p^2$), but there is also an interpretation in terms of “formal paths” analogous to equivalence classes of curves.

#### Open problems strongly related to this topic

- Is there a theory of “$C^0$ tangent spaces”? If curves are only continuously differentiable, are the two definitions still equivalent? This involves the construction of counterexamples and a precise description of the differentiability threshold.
- In the definition by derivations, can $C_p^\\infty(M)$ be replaced by a smaller space of functions (for instance, requiring only $C^k$ — how large must $k$ be)? It is known that $k=\\infty$ suffices, but what is the optimal smoothness condition?

---

## Common misconceptions

**Misconception 1: “A tangent vector is just the derivative of a curve at a point.”**

Correction: in $\\mathbb{R}^n$ this is indeed so, but on a [manifold](/nodes/dg%3Amanifold) the derivative $c'(0)$ of a curve $c(t)$ can be written as a tuple of numbers only in a chart, and these tuples differ from chart to chart; so a tangent vector cannot simply be identified with some fixed $n$-tuple. The correct understanding is: a tangent vector is an “equivalence class of curves”, and all curves whose derivatives agree in coordinates are gathered into one class.

**Misconception 2: “In the algebraic definition, the derivation $X$ can act on an arbitrary function, not only near $p$.”**

Correction: a tangent vector $X$ acts only on the germ $C_p^\\infty(M)$ of functions at $p$, that is, it cares only about the behaviour of a function in an arbitrarily small neighbourhood of $p$. In fact one can prove that if $f$ vanishes on some neighbourhood of $p$, then $X(f)=0$. Hence a tangent vector does not care about the global behaviour of a function.

**Misconception 3: “In constructing the curve $\\sigma(t)=\\varphi^{-1}(a^1t,\\dots,a^nt)$ from the algebraic definition, the construction depends on the chart, so the two definitions are not intrinsically equivalent.”**

Correction: although the construction uses a chart, the tangent vector $[\\sigma]$ obtained in the end is independent of coordinates — curves constructed in different charts are different, but belong to the same equivalence class. This is precisely the expression of coordinate invariance.

**Misconception 4: “The geometric definition and the algebraic definition give two different tangent spaces that happen to be isomorphic.”**

Correction: since the isomorphism is natural and canonical, in mathematical practice we may regard them directly as “the same” tangent space. Indeed most textbooks mix the two viewpoints freely after defining the tangent space.

---

## Insights

- From this material, what habit of thought do you find “not obvious but important”?

  The way of thinking that replaces an “object” by a “map”: the geometric definition regards a tangent vector as an “equivalence class of curves”, the algebraic definition regards it as an “operator acting on functions”. The former is object-like, the latter operation-like. This dual understanding of “object ↔ operation” recurs throughout mathematics (vectors ↔ linear functionals, group elements ↔ permutation operations).

- Is there a moment that makes you feel “mathematics can be seen this way”?

  When constructing the inverse of $\\Phi$: starting from an abstract derivation $X$, one uses its coefficients $a^i=X(x^i)$ to construct the curve $\\sigma(t)=\\varphi^{-1}(a^1t,\\dots,a^nt)$. This construction is concise and elegant — it translates an algebraic object (a derivation) into a geometric object (a curve), revealing the deep correspondence between them: the values $X(x^i)$ of the derivation on the coordinate functions are exactly the velocity components of the curve in those coordinates.

- What in your previous understanding does this topic resonate or conflict with?

  The two definitions of a tangent vector resemble the separation and unification of “data” and “operations” in computer science. The geometric definition is like “data” (the velocity of a curve), the algebraic definition like “operations” (differentiating functions). In a good theoretical framework the two should switch seamlessly, an idea akin to the programming principle of separating interface from implementation.

---

## Summary

### Idea

**“A tangent vector is the internalisation of the directional derivative on a [manifold](/nodes/dg%3Amanifold)”** — whether through the velocity of a curve or through a derivation, we are capturing the same essence: at a point of a [manifold](/nodes/dg%3Amanifold), how to speak of a “direction” and of “the rate of change along that direction” without relying on an external embedding.

### Methods

- **Construction by equivalence classes**: in the geometric definition, the equivalence relation on curves removes the dependence on coordinates (§ Form → Canonical general form).
- **Axiomatising derivations**: characterising the essential property of the directional derivative by linearity and the Leibniz rule (§ Form → Canonical general form).
- **The bijection method**: establishing a one-to-one correspondence between the two sets by “differentiation” and “integration (solving for a curve)”, and then verifying that the linear structure is preserved (§ Proof).
- **Localisation in coordinates**: every construction relies on a chart, but the final result does not depend on the choice of chart (§ Proof, steps 5–7).

---

## Looking back and asking

After reading this note, try to answer the following questions to test your understanding:

1. For a $C^1$ [differentiable manifold](/nodes/manifold%3Ack-atlas), how should tangent vectors and the tangent space be defined? Does the equivalence above still hold?
2. Does a reparametrisation of a curve change the tangent vector it represents? Why?
3. How is addition on the tangent space defined in the geometric definition? (Hint: add the components in coordinates.)
4. Let $f: M \\to N$ be a smooth map. Give the definition of the tangent map $f_{*p}$ in each of the two definitions, and verify that the two agree.
5. If a [manifold](/nodes/dg%3Amanifold) $M$ can be embedded in $\\mathbb{R}^N$, can one bypass these abstract definitions and define $T_p M$ directly by tangent vectors in $\\mathbb{R}^N$? What problems would that cause?

---

### References

1. Wolfgang Kühnel. *Differential Geometry: Curves - Surfaces - Manifolds*, Third Edition. §5.5 “Definition of Tangent Vector, Tangent Space” (the geometric and algebraic definitions), §5.6 (the basis theorem for the algebraic tangent space).

2. \`梅加强（Mei Jiaqiang）. 流形与几何初步（Manifolds and Introductory Geometry）. 第1.4节 切空间和切映射（Tangent spaces and tangent maps）\` (the [derivation definition of a tangent vector](/nodes/dg%3Atangent-vector-derivation), the equivalence-class-of-curves definition, with the explicit statement that “these several equivalent descriptions of the tangent space are all equivalent”).

3. \`陈维桓（Chen Weihuan）. 微分几何引论（Introduction to Differential Geometry）. 第3.1.1节 切向量（Tangent vectors）\` (the algebraic definition by derivations), \`第3.1.2节 切空间（The tangent space）\` (linear operations on the tangent space and coordinate curves).

4. \`陈维桓（Chen Weihuan）. 微分几何（Differential Geometry）. 第3.2节\` (tangent vectors and the tangent plane of a surface), \`第6.5节\` (parallel transport of a tangent vector along a curve).

5. \`梁灿彬（Liang Canbin），周彬（Zhou Bin）. 微分几何入门与广义相对论（An Introduction to Differential Geometry and General Relativity）（3册合集 / three-volume set）. 第2.2节 切矢和切矢场（Tangent vectors and tangent vector fields）\` (the action definition of the tangent vector of a curve, $T(f) := d(f\\circ C)/dt|_{t_0}$, and the fact that any element of $V_p$ can be regarded as the tangent vector of some curve through $p$).

6. \`А. С. 米先柯（A. S. Mishchenko）, А. Т. 福明柯（A. T. Fomenko）. 微分几何与拓扑学简明教程（A Concise Course in Differential Geometry and Topology）. 第3.3节 切向量 切空间（Tangent vectors, tangent space）\` (the [tensor](/nodes/dg%3Atensor) rule for a tangent vector under a change of coordinates, and the coordinate transformation formula for the tangent vector of a curve).

7. \`贝尔热（Berger），戈斯丢（Gostiaux）. 微分几何：流形、曲线和曲面（Differential Geometry: Manifolds, Curves and Surfaces）（第二版修订本 / 2nd revised ed.）. 第2.5节 切空间（Tangent space）\` (the [curve definition of a tangent vector](/nodes/dg%3Atangent-vector-curve) in the case of a sub[manifold](/nodes/dg%3Amanifold) of $\\mathbb{R}^n$).

8. Manfredo P. do Carmo. *Differential Geometry of Curves and Surfaces*. §2–4 “The Tangent Plane; The Differential of a Map” (a tangent vector as a directional derivative, $\\alpha'(0)(f)=d(f\\circ\\alpha)/dt|_{t=0}$).

9. John M. Lee. *Introduction to Riemannian Manifolds*, Second Edition. Appendix A “Tangent Vectors” (the derivation definition and the product rule $v(fg)=f(p)vg+g(p)vf$).

10. \`陈维桓（Chen Weihuan）. 微分几何（Differential Geometry）. 第6.6节 抽象曲面（Abstract surfaces）\` (the expression of a tangent vector under a change of coordinates and its relation to the first fundamental form).`,

  'dg:tangent-coordinate-basis': `## The coordinate basis of the tangent space

> **Euclidean space** (starting point) → **the tangent plane of a surface** (intermediate stop) → **the tangent space of a [manifold](/nodes/dg%3Amanifold)** (the modern form)

**Source tags.** #differential-geometry #tangent-space #coordinate-basis #definition #theorem

**Source.** The read-only snapshot \`G:/DifferentialGeometry/object/def/切空间的坐标基.md\` (see \`data/dg/\`).

---

The coordinate basis of the tangent space (also called the natural basis) is the basis for the coordinate representation of tangent vectors on a [differentiable manifold](/nodes/manifold%3Ack-atlas). At any point of an $n$-dimensional [smooth manifold](/nodes/dg%3Asmooth-manifold), a local coordinate system $(U;u^1,\\dots,u^n)$ naturally induces a set of partial derivative operators $\\{\\partial/\\partial u^i|_p\\}$, which form a basis of the tangent space at that point. The heart of this structure is that it algebraises the notion of a “direction” on a [manifold](/nodes/dg%3Amanifold) into a derivation operator, so that tangent vectors can be computed componentwise just as in Euclidean space, while the transformation laws of bases and components under a change of coordinates reveal the intrinsic [tensor](/nodes/dg%3Atensor) nature of geometric objects.

---

## Prerequisites

### Essential knowledge

- **The definition of a [smooth manifold](/nodes/dg%3Asmooth-manifold)**: an $n$-dimensional [smooth manifold](/nodes/dg%3Asmooth-manifold) $M$ is a Hausdorff [topological space](/nodes/dg%3Atopological-space) with a $C^\\infty$ differentiable structure, on which there are admissible coordinate charts $(U,\\varphi)$ with $\\varphi(U)\\subset\\mathbb{R}^n$ open and coordinate functions written $u^i$ ($i=1,\\dots,n$). The transition maps between coordinate charts are smooth.
- **[Vector spaces](/nodes/bg%3Alinear%3Avector) and bases**: a basis $\\{e_i\\}$ of an $n$-dimensional [vector space](/nodes/bg%3Alinear%3Avector) $V$, with every $v\\in V$ uniquely expressible as $v=v^i e_i$; the dual space $V^*$ and its dual basis $\\{e^i\\}$, satisfying $e^i(e_j)=\\delta^i_j$.
- **The Jacobi matrix**: the matrix representation of the differential of a smooth map; a non-zero determinant guarantees that the change of coordinates is invertible.

### Supporting knowledge

- **Directional derivatives**: the directional derivative operator in $\\mathbb{R}^n$ along a given direction, $D_v|_p f = \\frac{d}{dt}|_{t=0}f(p+tv)$, is the prototype of a tangent vector on a [manifold](/nodes/dg%3Amanifold).
- **The velocity vector of a curve**: the velocity $\\dot\\gamma(0)=(\\dot x^1(0),\\dots,\\dot x^n(0))$ of a curve $\\gamma(t)$ in $\\mathbb{R}^n$ at $p=\\gamma(0)$.
- **The Einstein summation convention**: repeated indices, one upper and one lower, in the same term are summed automatically, which simplifies the writing of [tensor](/nodes/dg%3Atensor) formulae.

### Further knowledge

- **The [tangent bundle](/nodes/dg%3Atangent-bundle)** $TM=\\bigcup_{p\\in M}T_pM$ is a $2n$-dimensional [smooth manifold](/nodes/dg%3Asmooth-manifold), which studies the tangent spaces at all points globally. Taking local coordinates $(U;u^i)$, a vector $X=X^i\\partial/\\partial u^i|_q$ corresponds to the $2n$-tuple $(u^1(q),\\dots,u^n(q),X^1,\\dots,X^n)$.
- **[Tensor](/nodes/dg%3Atensor) fields**: an $(r,s)$-type [tensor](/nodes/dg%3Atensor) field is a smooth assignment to each point $p$ of a [tensor](/nodes/dg%3Atensor) with $r$ contravariant and $s$ covariant indices. The coordinate basis is the foundation for $(1,0)$-type [tensor](/nodes/dg%3Atensor) (tangent vector) fields.
- **The Lie bracket**: $[\\partial/\\partial x^i,\\partial/\\partial x^j]=0$, that is, the coordinate vector fields commute. Conversely, this property is also a sign of the existence of local coordinates (the Frobenius theorem).

---

## Motivation

### Motivation for introducing it

Human understanding of “direction” and “rate of change” begins in Euclidean space. In $\\mathbb{R}^n$ the directional derivative $D_v|_p f = \\sum v^i(\\partial f/\\partial x^i)|_p$ is determined entirely by the components $v^i$ and the partial derivative operators $\\partial/\\partial x^i|_p$, where $(\\partial/\\partial x^1|_p,\\dots,\\partial/\\partial x^n|_p)$ forms the natural basis.

A [manifold](/nodes/dg%3Amanifold), however, is not $\\mathbb{R}^n$—it is locally [homeomorphic](/nodes/dg%3Ahomeomorphism) to $\\mathbb{R}^n$, but globally it may be curved. When we try to do calculus on a [manifold](/nodes/dg%3Amanifold), two problems arise at once:

- **A line of thought internal to the discipline**: near each point $p$ of a [manifold](/nodes/dg%3Amanifold) there is a coordinate chart $(U,\\varphi)$, and the coordinates of $p$ are $n$ real numbers $(u^1(p),\\dots,u^n(p))$. To define a “rate of change along some direction” we need an object that does not depend on a particular coordinate embedding. In Euclidean space a “direction” corresponds to a vector, but on a [manifold](/nodes/dg%3Amanifold) a “direction” has to be defined intrinsically.

- **A line of thought from external applications**: in physics, general relativity regards spacetime as a 4-dimensional [manifold](/nodes/dg%3Amanifold); the trajectory of a particle is a curve, and the velocity of the curve (a tangent vector) is the basis for defining gravity, acceleration and geodesics. Without tangent spaces one could not describe “motion” in a curved spacetime.

- **An aesthetic and structural line of thought**: in geometry we want the notion of a “direction” to have a consistent transformation law under a change of coordinates. If the components of some object transform by $(\\partial v^j/\\partial u^i)$ under a change of coordinates $u\\to v$, it is called a **contravariant vector**; and it is precisely an element of the tangent space. This classification keeps geometric quantities formally invariant under a change of coordinates.

### Motivation for the construction

The modern form of a tangent vector (as a linear combination of the $\\partial/\\partial u^i|_p$) did not appear out of thin air. Its “seed” can be traced along the following path:

**Starting from $\\mathbb{R}^n$**: in an open subset $U$ of $\\mathbb{R}^n$, a tangent vector at a point $p$ should be understood as an “arrow with a base point”: $T_pU\\cong\\{p\\}\\times\\mathbb{R}^n$, with standard basis $(p,e_1),\\dots,(p,e_n)$; the vector $e_i$ corresponds to the curve $c_i(t)=p+t\\cdot e_i$ and also to the partial derivative operator $f\\mapsto \\partial f/\\partial u^i|_p$.

**Then to surfaces**: for a regular parametrised surface $S:\\mathbf{r}=\\mathbf{r}(u,v)$ in $\\mathbb{R}^3$, the tangent plane at $p=\\mathbf{r}(u_0,v_0)$ is spanned by $\\mathbf{r}_u(u_0,v_0)$ and $\\mathbf{r}_v(u_0,v_0)$. Any tangent vector can be written as $\\xi=\\mathbf{r}_u\\Delta u+\\mathbf{r}_v\\Delta v$, with $(\\Delta u,\\Delta v)$ its components. Here the basis $\\{\\mathbf{r}_u,\\mathbf{r}_v\\}$ is the concrete realisation in $\\mathbb{R}^3$ of the natural basis $\\{\\partial/\\partial u,\\partial/\\partial v\\}$—the former is the “coordinate implementation” of the latter.

**Finally to a general [manifold](/nodes/dg%3Amanifold)**: on an abstract [manifold](/nodes/dg%3Amanifold) $M$ there is no $\\mathbb{R}^3$ to embed into. But the local coordinates $(U;u^i)$ still provide $n$ “direction operators” $\\partial/\\partial u^i|_p$, which are algebraically linearly independent and generating, and are precisely the most natural basis of the tangent space. This transplants the notion of a “direction” from Euclidean space and from surfaces, in algebraic form, to an arbitrary [smooth manifold](/nodes/dg%3Asmooth-manifold).

---

## Form

### The canonical general form

Let $(U,\\varphi)$ be an admissible coordinate chart of an $n$-dimensional [smooth manifold](/nodes/dg%3Asmooth-manifold) $M$ at the point $p$, and let $(U;u^i)$ be the local coordinate system. Define the operators:

$$\\left.\\frac{\\partial}{\\partial u^i}\\right|_p f = \\left.\\frac{\\partial}{\\partial u^i}\\right|_{\\varphi(p)} (f\\circ\\varphi^{-1}),\\quad \\forall f\\in C^\\infty(M),\\; i=1,\\dots,n.$$

This is the general form of the **coordinate basis (natural basis)** on a [manifold](/nodes/dg%3Amanifold). In different branches of differential geometry it has different concrete expressions:

| Setting | Local coordinates | Natural basis |
|------|----------|----------|
| A general [manifold](/nodes/dg%3Amanifold) $M$ | $(U;u^1,\\dots,u^n)$ | $\\{\\partial/\\partial u^1|_p,\\dots,\\partial/\\partial u^n|_p\\}$ |
| A surface $S\\subset\\mathbb{R}^3$ | $(u,v)$ | $\\{\\mathbf{r}_u,\\mathbf{r}_v\\}$ (or $\\{r_u,r_v\\}$) |
| An open region in $\\mathbb{R}^n$ | $(x^1,\\dots,x^n)$ | $\\{\\partial/\\partial x^1|_p,\\dots,\\partial/\\partial x^n|_p\\}$ |

On a general [manifold](/nodes/dg%3Amanifold), $\\partial/\\partial u^i|_p$ is an abstract operator, whereas $\\mathbf{r}_u$ on a surface is its realisation in $\\mathbb{R}^3$. The two express the same algebraic structure.

### Analysis of the necessary conditions

The core object of the notes is the statement that **the natural basis $\\{\\partial/\\partial u^i|_p\\}$ forms a basis of the tangent space $T_pM$** (Theorem 3.1.1). This conclusion depends on several conditions:

**Condition 1: $M$ is a [smooth manifold](/nodes/dg%3Asmooth-manifold) (a $C^\\infty$ structure)**
- Deleting this condition: if the [manifold](/nodes/dg%3Amanifold) is only $C^k$ ($k<\\infty$), the expansion $f=f(p)+\\sum(u^i-u_0^i)g_i$ of the function $f$ in the lemma still holds, but the smoothness of the $g_i$ may be lost; the derivation still goes through. If there is not even a differentiable structure, then $\\partial/\\partial u^i|_p$ cannot be defined and the whole notion of a tangent space collapses.
- Counterexample: on a [topological manifold](/nodes/dg%3Atopological-manifold) (with no differentiable structure) there is no natural definition of the tangent space.

**Condition 2: $(U,\\varphi)$ is an admissible coordinate chart and $p\\in U$**
- Deleting this condition: if $p$ does not lie in the domain of that coordinate chart, the coordinate functions $u^i$ are not defined at $p$, and the operator $\\partial/\\partial u^i|_p$ cannot be constructed.
- Counterexample: the stereographic coordinate chart on $S^2$ cannot cover the south pole, so that chart cannot be used to express the basis of the tangent space at the south pole.

**Condition 3: the Leibniz rule for tangent vectors**
- Deleting this condition: if a map $X_p:C^\\infty(M)\\to\\mathbb{R}$ is only linear and does not satisfy the Leibniz rule, it is merely a linear functional and cannot necessarily be written as a linear combination of the $\\partial/\\partial u^i|_p$. For example $X_p(f)=f(p)$ is linear but does not satisfy the Leibniz rule, and it is not a tangent vector.

**Condition 4: dimension $n$ (finite dimension)**
- Deleting this condition: if the [manifold](/nodes/dg%3Amanifold) is infinite-dimensional (such as certain function spaces), the tangent space is infinite-dimensional as well, and the finite linear-combination basis theory above has to be replaced by the framework of functional analysis.

### Equivalent formulations

The tangent space $T_pM$ and its natural basis admit the following mutually equivalent descriptions:

1. **The algebraic definition (derivations)**: $T_pM$ is the set of all linear maps $X_p:C^\\infty(M)\\to\\mathbb{R}$ satisfying the Leibniz rule, with basis $\\{\\partial/\\partial u^i|_p\\}$.

2. **The geometric definition (equivalence classes of curves)**: $T_pM$ is the quotient of the set of all smooth curves $\\sigma(t)$ through $p$ (with $\\sigma(0)=p$) by the equivalence relation $\\sigma_1\\sim\\sigma_2\\iff\\frac{d}{dt}|_{t=0}(x^i\\circ\\sigma_1-x^i\\circ\\sigma_2)=0$. The coordinate basis expansion of $\\sigma'(0)$ is $\\sigma'(0)=\\sum \\frac{d}{dt}|_{t=0}(x^i\\circ\\sigma(t))\\cdot\\partial/\\partial x^i|_p$.

3. **The “coordinate component” definition**: $T_pM$ is the set of all ordered $n$-tuples $(a^1,\\dots,a^n)$ satisfying the coordinate transformation rule $(b^1,\\dots,b^n)^T=J(\\psi\\circ\\varphi^{-1})(\\varphi(p))(a^1,\\dots,a^n)^T$. This definition characterises a tangent vector directly by the behaviour of its components under a change of coordinates.

These three definitions are equivalent. The first emphasises algebraic operations, the second geometric intuition, and the third coordinate computation. Their equivalence comes from the fact that, for any given tangent vector $X_p$, its components $X_p^i=X_p(u^i)$ transform by $(\\partial v^j/\\partial u^i)$ under a change of coordinates $u\\to v$; and conversely, any set of components transforming by this rule corresponds to a unique tangent vector.

### Classes of forms

The notion of a “coordinate basis” has the following classes at different levels of geometry:

- **Natural basis (holonomic basis)**: the partial derivative operators $\\partial/\\partial u^i|_p$ coming from local coordinates, with vanishing commutators $[\\partial/\\partial u^i,\\partial/\\partial u^j]=0$.
- **Non-coordinate basis (non-holonomic basis)**: a basis formed by general smooth tangent vector fields, not necessarily coming from coordinates, whose commutators may be non-zero. For example, the orthonormal frame field in spherical coordinates.
- **Moving frame**: a basis chosen point by point on a [manifold](/nodes/dg%3Amanifold) (possibly a non-coordinate one), used in the method of moving frames to compute curvature and other geometric quantities.

This article concentrates on the first—the natural basis (coordinate basis).

### How are the relevant statements expressed in natural language?

- “The components of a tangent vector $v$ in the coordinate basis are the values of $v$ acting on the coordinate functions”: $v^i=v(u^i)$.
- “The natural basis transforms by the Jacobi matrix under a change of coordinates”: $\\partial/\\partial u^i|_p = (\\partial v^j/\\partial u^i)|_p\\cdot\\partial/\\partial v^j|_p$.
- “The components of a tangent vector are contravariant with respect to the basis under a change of coordinates”: $\\tilde{X}^j = X^i\\cdot(\\partial v^j/\\partial u^i)|_p$.

### A lower-dimensional formulation

Restating the coordinate basis in more basic language:

- **The language of set theory / function theory**: $\\partial/\\partial u^i|_p$ is a linear functional on the function space $C^\\infty(M)$; it maps $f$ to the $i$-th partial derivative at $\\varphi(p)$ of the composite function $f\\circ\\varphi^{-1}$ in $\\mathbb{R}^n$.
- **The language of linear algebra**: choosing local coordinates amounts to choosing an ordered basis $\\{e_i\\}$ in $T_pM$, each tangent vector $v$ corresponding to a coordinate column vector $(v^1,\\dots,v^n)^T$. A change of coordinates corresponds to a basis transformation matrix $A=(a_j^i)$, where $a_j^i=(\\partial v^i/\\partial u^j)|_p$.
- **The language of category theory**: the tangent space functor $T$ maps a [manifold](/nodes/dg%3Amanifold) object $M$ to a [vector space](/nodes/bg%3Alinear%3Avector) object $T_pM$, and a smooth map $f:M\\to N$ to a linear map $df_p:T_pM\\to T_{f(p)}N$ (the tangent map). The natural basis is the image of the local coordinate chart under this functor.

### A higher-dimensional viewpoint

- **The tangent space is a fibre of the [tangent bundle](/nodes/dg%3Atangent-bundle)**: the [tangent bundle](/nodes/dg%3Atangent-bundle) $TM=\\bigcup_{p\\in M}T_pM$ is itself a $2n$-dimensional [smooth manifold](/nodes/dg%3Asmooth-manifold). Local coordinates $(U;u^i)$ give coordinates $(u^1,\\dots,u^n,X^1,\\dots,X^n)$ on $TM$, where the $X^i$ are the components of a tangent vector in the natural basis. The coordinate basis $\\partial/\\partial u^i|_p$ is precisely the reference for the “vertical direction” in the local trivialisation of the [tangent bundle](/nodes/dg%3Atangent-bundle).
- **The cotangent space is the dual viewpoint**: the dual space $T_p^*M$ of $T_pM$ has the natural dual basis $\\{du^i|_p\\}$, satisfying $du^i|_p(\\partial/\\partial u^j|_p)=\\delta^i_j$. This leads to the theory of [differential forms](/nodes/dg%3Adifferential-form) and unifies notions such as the gradient as covectors.
- **The tangent map $df_p$ is the Jacobi matrix in the natural bases**: $df_p(\\partial/\\partial u^i|_p)=\\sum(\\partial f^\\alpha/\\partial u^i)|_p\\cdot\\partial/\\partial v^\\alpha|_{f(p)}$.

### Objects similar to this topic, to be understood in connection with it

- **Coordinate basis vs. general basis**: a coordinate basis commutes (its Lie brackets vanish), whereas the basis of a general tangent vector field need not commute. The bases that can be turned into a coordinate basis by a change of coordinates are exactly the mutually commuting ones (the Frobenius integrability condition).
- **Coordinate basis vs. frame field**: the natural frame $\\{\\partial/\\partial r,\\partial/\\partial\\theta,\\partial/\\partial\\phi\\}$ of spherical coordinates in $\\mathbb{R}^3$ is not orthonormal, and its metric coefficients have to be computed separately; this contrasts with the natural basis $\\{\\partial/\\partial x,\\partial/\\partial y,\\partial/\\partial z\\}$ in Cartesian coordinates (which is orthonormal). The two are the same in essence (both are coordinate bases), but their computational properties (such as the metric $g_{ij}$) differ.
- **$\\partial/\\partial u^i|_p$ vs. $du^i|_p$**: the former is a basis of the tangent space $T_pM$, the latter the dual basis of the cotangent space $T_p^*M$. Under a change of coordinates the two transform by the contravariant and the covariant law respectively.

---

## Proof

### Proof sketch

**Theorem 3.1.1**: on an $n$-dimensional [smooth manifold](/nodes/dg%3Asmooth-manifold) $M$, take a local coordinate system $(U;u^i)$ at a point $p$; then $\\{\\partial/\\partial u^i|_p\\}_{i=1}^n$ forms a basis of the tangent space $T_pM$, so that $T_pM$ is an $n$-dimensional [vector space](/nodes/bg%3Alinear%3Avector).

**Summary**: by acting an arbitrary tangent vector on a smooth function and using the expansion of that function in local coordinates, the result of the action can be decomposed into its action on the coordinate functions multiplied by partial derivative operators, which proves that the $\\partial/\\partial u^i|_p$ generate the whole tangent space; then, by acting with them on the coordinate functions $u^j$ one obtains the Kronecker symbol, which proves linear independence.

**Detailed proof**:

**(i) Generation**: take any $v\\in T_pM$. Using the lemma (based on the Taylor expansion form of $C^\\infty$ functions), every $f\\in C_p^\\infty$ can be written as

$$f = f(p) + \\sum_{i=1}^n (u^i-u_0^i)g_i,\\quad g_i(p)=\\left.\\frac{\\partial}{\\partial u^i}\\right|_p(f).$$

From the Leibniz rule for $v$ and from $v(1)=0$ (because $v(1)=v(1\\cdot1)=2v(1)$) we get $v(f(p))=0$ and $v(u_0^i)=0$, hence

$$v(f)=\\sum_{i=1}^n v(u^i)\\cdot g_i(p)=\\sum_{i=1}^n v(u^i)\\cdot\\left.\\frac{\\partial}{\\partial u^i}\\right|_p(f),\\quad\\forall f\\in C_p^\\infty.$$

Therefore $v=\\sum_{i=1}^n v(u^i)\\cdot\\partial/\\partial u^i|_p$, that is, every tangent vector can be written as a linear combination of the $\\partial/\\partial u^i|_p$.

**(ii) Linear independence**: suppose that $\\sum_{i=1}^n c_i\\cdot\\partial/\\partial u^i|_p=0$ (the zero map). Acting on the coordinate function $u^j$:

$$0=\\sum_{i=1}^n c_i\\cdot\\left.\\frac{\\partial}{\\partial u^i}\\right|_p(u^j)=\\sum_{i=1}^n c_i\\delta_i^j=c_j,\\quad 1\\le j\\le n.$$

All the coefficients $c_j=0$, so the vectors are linearly independent.

---

## Applications

### Direct applications

**Example 1**: let $\\gamma(t)$ be a smooth curve on $M$ whose parametric equations in local coordinates $(U;u^i)$ are $u^i=u^i(t)$. Then the velocity vector of the curve at $p=\\gamma(0)$ is

$$\\dot\\gamma(0)=\\sum_{i=1}^n\\frac{du^i}{dt}(0)\\cdot\\left.\\frac{\\partial}{\\partial u^i}\\right|_p.$$

This is entirely analogous to the formula for the velocity of a curve in $\\mathbb{R}^n$, and the components are precisely the rates of change of the coordinates with respect to the parameter.

**Example 2**: given a tangent vector $X\\in T_pM$, its components are $X^i=X(u^i)$. For a smooth function $f$,

$$X(f)=X^i\\left.\\frac{\\partial f}{\\partial u^i}\\right|_p.$$

This unifies the notion of a directional derivative: $X$ is simply the derivative operator along the “direction $X$”.

**Example 3**: the tangent space at $p$ of a surface $S:\\mathbf{r}=\\mathbf{r}(u,v)$ has the natural basis $\\{\\mathbf{r}_u,\\mathbf{r}_v\\}$. The components $(du,dv)$ of a tangent vector $\\xi=\\mathbf{r}_u du+\\mathbf{r}_v dv$ satisfy $du(\\xi)=du$, $dv(\\xi)=dv$, that is, $du$ and $dv$ are the dual basis. The first fundamental form of the surface, $I=d\\mathbf{r}\\cdot d\\mathbf{r}=Edu^2+2Fdudv+Gdv^2$, reflects the metric coefficients of the natural basis $\\{\\mathbf{r}_u,\\mathbf{r}_v\\}$.

**Example 4**: in an open subset $U$ of $\\mathbb{R}^n$ we have $T_pU\\cong\\{p\\}\\times\\mathbb{R}^n$, and the standard basis $(p,e_1),\\dots,(p,e_n)$ corresponds exactly to $\\{\\partial/\\partial x^1|_p,\\dots,\\partial/\\partial x^n|_p\\}$. In this sense the usual tangent vectors and coordinate basis are the special case of the tangent space of a [manifold](/nodes/dg%3Amanifold) in $\\mathbb{R}^n$.

### Indirect applications

- **In differential geometry**: the natural basis is the foundation for defining the [Riemannian metric](/nodes/manifold%3Achart-atlas) $g=g_{ij}du^i\\otimes du^j$, the connection $\\nabla_{\\partial_i}\\partial_j=\\Gamma_{ij}^k\\partial_k$ and the curvature [tensor](/nodes/dg%3Atensor). Without the coordinate basis these [tensors](/nodes/dg%3Atensor) would lose their local component expressions.
- **In general relativity**: tangent vectors of the spacetime [manifold](/nodes/dg%3Amanifold) give the 4-velocity of a particle, and the coordinate basis $\\partial/\\partial x^\\mu$ corresponds to the directions of the coordinate axes. The components of the metric [tensor](/nodes/dg%3Atensor) $g_{\\mu\\nu}$ in the coordinate basis determine the geometry of spacetime. A change of coordinates (such as from Schwarzschild coordinates to Eddington–Finkelstein coordinates) relates the two natural bases through a Jacobi matrix.
- **In physics**: the tangent space is the foundation of the [covariant derivative](/nodes/tensor%3Afield) in gauge field theory; the expression $\\Gamma_{ij}^k$ for the connection coefficients (Christoffel symbols) in the natural basis enters directly into the computation of the field equations.
- **In computer graphics**: the natural basis $\\{r_u,r_v\\}$ of a surface is used to compute the normal vector $r_u\\times r_v$, and hence to implement lighting and rendering.

---

## Generalisations

- **Relaxing the conditions**: a $C^\\infty$ [manifold](/nodes/dg%3Amanifold) can be relaxed to a $C^k$ [manifold](/nodes/dg%3Amanifold) ($k\\ge1$); the definition of the natural basis and the theorem still hold in the $C^k$ framework, only the order of the function space has to be adjusted accordingly.
- **Generalising the conclusion**: from a basis of the tangent space $T_pM$ one can generalise to a local frame field on the [tangent bundle](/nodes/dg%3Atangent-bundle) $TM$. Furthermore, local sections of a vector bundle also admit a similar “coordinate basis” representation under a local trivialisation (local basis sections).
- **Open problems / frontiers**: in the exotic differentiable structures on $\\mathbb{R}^4$ (exotic $\\mathbb{R}^4$), does the choice of a different [smooth structure](/nodes/dg%3Asmooth-structure) affect the integrability of a basis of the tangent space? This involves deep questions of differential topology. In addition, on a homogeneous [manifold](/nodes/dg%3Amanifold) the natural basis can be described globally by means of the Lie algebra structure (the Maurer–Cartan form).

---

## Common misconceptions

1. **Misconception: $\\partial/\\partial u^i|_p$ is just a partial derivative in $\\mathbb{R}^n$**  
   In fact, the definition of $\\partial/\\partial u^i|_p$ on a [manifold](/nodes/dg%3Amanifold) involves the composition $f\\circ\\varphi^{-1}$ with the coordinate chart map $\\varphi$; it is not a partial derivative of $f$ directly. The two agree only when $M=\\mathbb{R}^n$ and the identity coordinates are taken.

2. **Misconception: the coordinate components $X^i$ of a tangent vector are “the length of the vector”**  
   $X^i$ are algebraic components in the natural basis, and the inner product of two tangent vectors cannot simply be given by the sum of the products of their components. Only after a Riemannian metric $g_{ij}$ is fixed does $X\\cdot Y=g_{ij}X^iY^j$ acquire geometric meaning. When the natural basis is not orthogonal, the components do not correspond directly to geometric lengths.

3. **Misconception: the natural basis corresponds one-to-one with the coordinate system and has nothing to do with the point**  
   In fact, $\\partial/\\partial u^i|_p$ varies with the point $p$. At different points, even using the same coordinate chart, $\\partial/\\partial u^i|_q$ is defined in a different [vector space](/nodes/bg%3Alinear%3Avector) $T_qM$. Beginners easily overlook the fact that it is “attached to $p$”.

4. **Misconception: the components of the basis under a change of coordinates are just “the partial derivatives of the new coordinates with respect to the old ones”**  
   In $\\partial/\\partial u^i|_p = (\\partial v^j/\\partial u^i)|_p\\cdot\\partial/\\partial v^j|_p$, the quantity $(\\partial v^j/\\partial u^i)$ is the Jacobi matrix computed at the point $p$. Beginners easily forget that these partial derivatives are evaluated at the specific point $p$, and so mistakenly believe that the basis transformation has globally uniform coefficients.

5. **Misconception: there is no difference between a tangent vector $\\sum X^i\\partial_i$ and a vector field $\\sum X^i\\partial_i$**  
   A tangent vector is an algebraic object “at a single point $p$”, whereas a vector field is a smooth section assigning a tangent vector to each point. The former lives in a single tangent space, the latter corresponds to a smooth section of the [tangent bundle](/nodes/dg%3Atangent-bundle) $TM$.

---

## Insights

- **A “direction” is essentially a derivation**: from arrows in $\\mathbb{R}^n$ to partial derivative operators on a [manifold](/nodes/dg%3Amanifold), the coordinate basis $\\partial/\\partial u^i|_p$ tells us that in mathematics the structure of an object is often defined by how it interacts with other objects (here, by the way it acts on smooth functions) rather than by its geometric appearance.

- **The transformation law under a change of coordinates defines the type of a geometric object**: the contravariance of the components of a tangent vector (transforming by $(\\partial v^j/\\partial u^i)$) and the covariance of the dual basis (transforming by $(\\partial u^i/\\partial v^j)$) are two sides of one thing. In differential geometry, “what an object is” matters less than “how the object transforms under a change of coordinates”—and this classifies the different species of [tensors](/nodes/dg%3Atensor).

- **Local coordinates are a double-edged sword**: the coordinate basis makes computation vastly easier, but it depends on the choice of coordinate system. A good geometric theory should not depend on coordinates (coordinate independence), yet good computation cannot do without them. The tension of differential geometry is displayed precisely in the balance between coordinate methods and coordinate-free methods.

---

## Summary

### The idea

**“Use local coordinates to algebraise a tangent direction into a derivation operator, making calculus on a [manifold](/nodes/dg%3Amanifold) possible.”**  
The coordinate basis $\\partial/\\partial u^i|_p$ identifies the “space of directions” at each point of a [manifold](/nodes/dg%3Amanifold) $M$ with $\\mathbb{R}^n$, and thereby transplants all the tools of linear algebra from Euclidean space to [manifolds](/nodes/dg%3Amanifold)—at the price of depending on the choice of coordinates and of having to track the transformation laws.

### Methods

| Concrete technique | Where it is used in the notes |
|----------|-------------------|
| Taylor expansion of a function in local coordinates | the lemma (3.1.1) in the proof of Theorem 3.1.1 |
| Partial derivative operators as tangent vectors | §2 the definition of the coordinate basis |
| The Kronecker symbol to test linear independence | the proof of linear independence in Theorem 3.1.1 |
| The Jacobi matrix as the basis transformation matrix | §4 the transformation law of the natural basis |
| Contravariant/covariant transformation laws | §4.2 the transformation of components & §5 the dual basis of the cotangent space |
| Constructing the dual basis | §5 the natural basis of the cotangent space $\\{du^i\\|_p\\}$ |
| The matrix representation of the tangent map (differential) | §6 |

---

## Looking back and asking

1. In the proof of Theorem 3.1.1, why does the lemma $f=f(p)+\\sum(u^i-u_0^i)g_i$ hold? Why is $g_i(p)$ exactly $\\partial f/\\partial u^i|_p$?
2. Why is $v(1)=0$? If $v$ did not satisfy the Leibniz rule, would this conclusion still hold?
3. What is the Lie bracket between the coordinate basis vectors $\\partial/\\partial u^i|_p$? What geometric meaning does it reflect?
4. What is the relation between the natural basis $\\{\\mathbf{r}_u,\\mathbf{r}_v\\}$ of a surface and $\\{\\partial/\\partial u,\\partial/\\partial v\\}$ on a general [manifold](/nodes/dg%3Amanifold)? Is the latter the “abstract version” of the former?
5. The components of a tangent vector transform by $(\\partial v^j/\\partial u^i)$ under a change of coordinates, while the components of a cotangent vector transform by $(\\partial u^i/\\partial v^j)$. Why are the two inverse to each other? Derive and verify this.
6. Given two different local coordinate systems, the transition coefficients between their natural bases are the Jacobi matrix of the change of coordinates. If the change of coordinates is linear (for example an affine transformation), this Jacobi matrix is constant. Are the natural bases then also related by a “constant” linear combination?

---

### References

1. \`陈维桓. 微分几何引论. 北京大学出版社, 2013.\` (Chen Weihuan, *An Introduction to Differential Geometry*, Peking University Press, 2013.) (Chapter 3 §3.1 The tangent space; the definition and proof of the natural basis in Theorem 3.1.1, the transformation law of the natural basis, the cotangent space and the dual basis.)

2. Wolfgang Kühnel. *Differential Geometry: Curves - Surfaces - Manifolds*, Third Edition. American Mathematical Society. (Section 5B The Tangent Space, Theorem 5.6: the tangent space is spanned by the $\\partial/\\partial x^i|_p$, the standard basis of the tangent space in $\\mathbb{R}^n$.)

3. John M. Lee. *Introduction to Riemannian Manifolds*, Second Edition. Springer. (Appendix A: the definition of the coordinate vectors $\\partial/\\partial x^i|_p$, the tangent map $dF_p$, the components $v^i=v(x^i)$.)

4. B. A. Dubrovin, S. P. Novikov, A. T. Fomenko. *Modern Geometry — Methods and Applications, Part II: The Geometry and Topology of Manifolds*. Springer-Verlag, 1985. (The basis of the tangent space $e_\\alpha=\\partial/\\partial x^\\alpha$, the component transformation formula $\\xi_p^\\alpha = (\\partial x_p^\\alpha/\\partial x_q^\\beta)_x\\xi_q^\\beta$.)

5. \`梅加强. 流形与几何初步.\` (Mei Jiaqiang, *Manifolds and Introductory Geometry*.) (Section 1.4 The tangent space and the tangent map, the algebraic definition of a tangent vector (a linear map satisfying the Leibniz rule), the curve equivalence-class definition of the tangent space, the dual basis $dx_\\alpha^i(p)$.)

6. Manfredo P. do Carmo. *Differential Geometry of Curves and Surfaces*. (The tangent plane of a surface, the natural basis $\\{x_u,x_v\\}$ and its dual forms $du,dv$.)

7. \`陈维桓. 微分几何. 北京大学出版社, 2017.\` (Chen Weihuan, *Differential Geometry*, Peking University Press, 2017.) (The tangent space of a surface and the natural basis $\\{r_u,r_v\\}$, the basis of the cotangent space $\\{du,dv\\}$, the first fundamental form $Edu^2+2Fdudv+Gdv^2$.)

8. \`А. С. 米先柯, А. Т. 福明柯. 微分几何与拓扑学简明教程.\` (A. S. Mishchenko, A. T. Fomenko, *A Concise Course in Differential Geometry and Topology*.) (The definitions of a tangent vector and of the tangent space, the [tensor](/nodes/dg%3Atensor) rules for a change of coordinates.)`,

  'dg:tangent-bundle': `## The tangent bundle

**Source tags.** #differential-geometry #manifold #tangent-bundle #definition #vector-bundle

**Source.** The read-only snapshot \`G:/DifferentialGeometry/object/def/切丛.md\` (see \`data/dg/\`).

---

The tangent bundle is the “globalisation” of all the tangent spaces of a [differentiable manifold](/nodes/manifold%3Ack-atlas): it gathers the tangent vectors at each point of the [manifold](/nodes/dg%3Amanifold) into a new [smooth manifold](/nodes/dg%3Asmooth-manifold), providing a natural framework for studying vector fields, differential equations and geometric structures on the [manifold](/nodes/dg%3Amanifold).

---

## Prerequisites

### Essential

- **The definition of a [differentiable manifold](/nodes/manifold%3Ack-atlas)**: understanding the definition of a [smooth manifold](/nodes/dg%3Asmooth-manifold), coordinate charts and coordinate transformations.
- **Tangent spaces and tangent vectors**: the tangent space $T_pM$ of a [manifold](/nodes/dg%3Amanifold) at a point is a [vector space](/nodes/bg%3Alinear%3Avector) of the same dimension as the [manifold](/nodes/dg%3Amanifold); a tangent vector can be regarded as a derivation satisfying the Leibniz rule, or as an equivalence class of smooth curves.
- **Smooth maps and the differential**: the tangent map $f_{*p}:T_pM\\to T_{f(p)}N$ of a smooth map $f:M\\to N$ at $p$ is a linear map satisfying the chain rule.

### Supporting

- **The basic notion of a vector bundle**: a vector bundle is a [manifold](/nodes/dg%3Amanifold) that is locally of the form $U\\times\\mathbb{R}^k$, whose coordinate transformations preserve the linear structure of the fibres. The tangent bundle is one of the most important vector bundles.
- **Basic topology**: quotient topology, second countability, the Hausdorff property.

### Further

- **The Frobenius integrability theorem**: it studies when a subbundle (a distribution) of the tangent bundle is integrable, and is an important extension of the theory of the tangent bundle.
- **[Riemannian metrics](/nodes/manifold%3Achart-atlas)**: endowing the tangent bundle with an inner product allows one to define the unit tangent bundle, the geodesic flow and similar notions.
- **Stokes’ theorem**: a global integral formula built on the foundations of a [manifold](/nodes/dg%3Amanifold) and its tangent bundle.

---

## Motivation

### Motivation for introducing it

In differential calculus the basic way to study a general map is “linearisation” — that is the method of the differential. On a [differentiable manifold](/nodes/manifold%3Ack-atlas), before this method can be applied the space itself has to be linearised: at each point the [manifold](/nodes/dg%3Amanifold) can be approximated locally by its tangent space, turning a non-linear problem into a problem of linear algebra.

However, the tangent space $T_pM$ sits in isolation at each point $p$ of the [manifold](/nodes/dg%3Amanifold) $M$. When we want to study the tangent vectors at all points at once — for instance to study a vector field, to set up the geodesic equation, or to define a connection — we need an object that can “integrate” all the tangent spaces together. The **tangent bundle** exists precisely for this purpose: it takes the disjoint union of the tangent spaces at all points and gives it a [smooth manifold](/nodes/dg%3Asmooth-manifold) structure, so that the operation “change the tangent vector while changing the point” can be carried out smoothly.

A thread internal to the discipline: the core difficulty in defining a vector field is that a [manifold](/nodes/dg%3Amanifold) has no global coordinate system in which vectors could be described directly. The tangent bundle supplies the geometric framework that globalises tangent vectors, so that a vector field can be defined as a smooth section of the tangent bundle.

A thread from outside: in classical mechanics the configuration space of a mechanical system is a [manifold](/nodes/dg%3Amanifold) $M$, while the state of the system is described by position and velocity together — these are points of the tangent bundle $TM$ of $M$. Lagrangian mechanics is built precisely on the tangent bundle.

### Motivation for the construction

The idea of the construction is very natural: given an $n$-dimensional [smooth manifold](/nodes/dg%3Asmooth-manifold) $M$, at each point $p\\in M$ we already have the tangent space $T_pM$ (an $n$-dimensional [vector space](/nodes/bg%3Alinear%3Avector)). Now put all the tangent spaces together and formally take their union

$$TM = \\bigcup_{p\\in M} T_p M.$$

Since the tangent spaces at different points are disjoint (a tangent vector at one point acts on the ring of functions at that point, not at another), this union can naturally be regarded as a disjoint union.

The next question is how to give $TM$ the structure of a [smooth manifold](/nodes/dg%3Asmooth-manifold). Look at a local chart: let $(U,\\varphi)$ be a chart of $M$ with coordinate functions $x^1,\\dots,x^n$. For a point $q$ in $U$, $T_qM$ has the natural basis $\\{\\partial/\\partial x^i|_q\\}$, so that every tangent vector $X_q = \\sum_i a^i \\partial/\\partial x^i|_q$ is uniquely determined by $2n$ pieces of data: the $n$ coordinates of the point and the $n$ component coordinates. This gives a bijection from $\\pi^{-1}(U)$ to $U\\times\\mathbb{R}^n$, so that the topology of $\\mathbb{R}^{2n}$ can be pulled back to $\\pi^{-1}(U)$, and the pieces can then be glued along a coordinate cover into the global topology and [smooth structure](/nodes/dg%3Asmooth-structure) of $TM$.

This idea of “local trivialisation” leads directly to the general definition of a vector bundle.

---

## Form

### Canonical general form

**Definition (tangent bundle)** Let $M$ be an $n$-dimensional [smooth manifold](/nodes/dg%3Asmooth-manifold) and $T_pM$ the tangent space of $M$ at $p$. The set

$$TM = \\bigcup_{p\\in M} T_p M$$

(written also $T(M)$) is called the **tangent bundle** of $M$. Define the projection map $\\pi: TM \\to M$ by

$$\\pi(X_p) = p,\\quad \\forall\\, X_p \\in T_p M.$$

Once $TM$ is given a suitable [smooth structure](/nodes/dg%3Asmooth-structure), it becomes a $2n$-dimensional [smooth manifold](/nodes/dg%3Asmooth-manifold), and $\\pi$ is a smooth surjection.

**Local coordinates** Let $(U,\\varphi)$ be a local chart of $M$ with coordinate functions $x^1,\\dots,x^n$. Define

$$\\begin{aligned}
\\theta: \\pi^{-1}(U) &= \\bigcup_{p\\in U} T_p M \\to U \\times \\mathbb{R}^n,\\\\
&\\qquad X_p \\mapsto (p, X_p(x^1), X_p(x^2), \\dots, X_p(x^n)).
\\end{aligned}$$

$\\theta$ is a bijection; through it the topology and [smooth structure](/nodes/dg%3Asmooth-structure) of $U\\times\\mathbb{R}^n$ can be pulled back to $\\pi^{-1}(U)$. Given a coordinate cover $\\{(U_\\alpha,\\varphi_\\alpha)\\}$ of $M$, the topology on $TM$ is defined by: $V\\subset TM$ is open if and only if every $\\theta_\\alpha(V\\cap\\pi^{-1}(U_\\alpha))$ is open. In this topology $\\pi$ is an open map, $TM$ is a second countable, Hausdorff [topological space](/nodes/dg%3Atopological-space), and it carries a natural [smooth structure](/nodes/dg%3Asmooth-structure), becoming a $2n$-dimensional [smooth manifold](/nodes/dg%3Asmooth-manifold).

**The tangent bundle as a vector bundle** In the local coordinates above, $\\pi^{-1}(U)\\cong U\\times\\mathbb{R}^n$, and the coordinate transformation

$$(p, (X^1,\\dots,X^n)) \\mapsto (p, (\\tilde X^1,\\dots,\\tilde X^n))$$

satisfies $\\tilde X^j = \\sum_i X^i \\frac{\\partial \\tilde x^j}{\\partial x^i}$; that is, the transformation matrix is the Jacobian matrix, which depends smoothly on $p$ and is non-singular everywhere. Hence the tangent bundle is a smooth vector bundle of rank $\\dim M$.

### Equivalent expressions

- **The tangent bundle of a sub[manifold](/nodes/dg%3Amanifold)**: if $M\\subset\\mathbb{R}^N$ is a $k$-dimensional sub[manifold](/nodes/dg%3Amanifold) of $\\mathbb{R}^N$, then its tangent bundle can be realised concretely as
  $$TM = \\{(x,v)\\in M\\times\\mathbb{R}^N \\mid v\\in T_xM\\}.$$
- **The tangent bundle of a sphere**: the tangent bundle of the $n$-dimensional sphere $S^n$ is
  $$TS^n = \\{(x,v)\\in S^n\\times\\mathbb{R}^{n+1} \\mid x\\perp v\\}.$$
- **Defined by transition functions**: take a locally finite coordinate cover $\\{(U_\\alpha,\\varphi_\\alpha)\\}$ of $M$; the tangent bundle is glued from the transition functions $g_{\\beta\\alpha}(p) = J(\\varphi_\\beta\\circ\\varphi_\\alpha^{-1})|_{\\varphi_\\alpha(p)}$, where $J$ denotes the Jacobian matrix.

### Kinds of objects

- The **tangent bundle** is the basic prototype of a vector bundle, “the most natural vector bundle”.
- The tangent bundle is a **$2n$-dimensional [smooth manifold](/nodes/dg%3Asmooth-manifold)**, and can itself serve as an object of study in differential geometry.
- If $M$ carries a [Riemannian metric](/nodes/manifold%3Achart-atlas), one can define the **unit tangent bundle**
  $$T_1M = \\{(p,v)\\in TM \\mid \\|v\\| = 1\\},$$
  which is a $2n-1$-dimensional [smooth manifold](/nodes/dg%3Asmooth-manifold).

### Reduction

In the language of set theory and topology: the tangent bundle is the disjoint union of all the tangent spaces over $M$, endowed with a topology and a [smooth structure](/nodes/dg%3Asmooth-structure) that make the projection locally trivial. From the categorical point of view, $T$ is a functor from the category of [manifolds](/nodes/dg%3Amanifold) to the category of vector bundles: to each smooth map $f:M\\to N$ it assigns a bundle map $f_*: TM\\to TN$, functorially.

### Lifting

The tangent bundle is the prototype of the notion of a **vector bundle**. In general, a vector bundle of rank $k$ is a [manifold](/nodes/dg%3Amanifold) that is locally trivialised as $U\\times\\mathbb{R}^k$, with coordinate transformations taking values in $\\mathrm{GL}(k,\\mathbb{R})$. The tangent bundle is exactly the vector bundle whose rank equals the dimension of the [manifold](/nodes/dg%3Amanifold). Furthermore, the dual of the tangent bundle is the cotangent bundle $T^*M$, which is the domain of definition of [differential forms](/nodes/dg%3Adifferential-form).

If $M$ is a Lie group, then $TM$ is isomorphic to the trivial bundle $M\\times\\mathfrak{g}$, where $\\mathfrak{g}$ is the Lie algebra.

### Understanding through links with similar objects

- **The cotangent bundle $T^*M$**: the dual vector bundle of the tangent bundle; its sections are $1$-forms.
- **The normal bundle**: for an embedding $M\\hookrightarrow\\mathbb{R}^N$, the normal bundle consists of the vectors at each point that are orthogonal to $T_xM$.
- **The [tensor](/nodes/dg%3Atensor) bundle**: the tensor product of the tangent bundle with the cotangent bundle gives the bundle of $(r,s)$-type [tensors](/nodes/dg%3Atensor).

---

## Proof

### Proof sketch

**Claim: the tangent bundle $TM$ is a $2n$-dimensional [smooth manifold](/nodes/dg%3Asmooth-manifold).**

*Idea of the proof*: construct charts for $TM$ and verify that the coordinate transformations are smooth and that the result is Hausdorff and second countable.

Take a smooth coordinate cover $\\{(U_\\alpha,\\varphi_\\alpha)\\}$ of $M$ and for each $\\alpha$ define

$$\\Phi_\\alpha: \\pi^{-1}(U_\\alpha) \\to \\varphi_\\alpha(U_\\alpha)\\times\\mathbb{R}^n \\subset \\mathbb{R}^{2n},$$
$$\\Phi_\\alpha(X_p) = (x^1(p),\\dots,x^n(p), X_p(x^1),\\dots,X_p(x^n)).$$

$\\Phi_\\alpha$ is a bijection. For two charts $(U_\\alpha,\\varphi_\\alpha)$ and $(U_\\beta,\\varphi_\\beta)$ the coordinate transformation

$$\\Phi_\\beta\\circ\\Phi_\\alpha^{-1}(x^1,\\dots,x^n,\\xi^1,\\dots,\\xi^n) = (\\tilde x^1,\\dots,\\tilde x^n,\\eta^1,\\dots,\\eta^n)$$

satisfies $\\tilde x = \\varphi_\\beta\\circ\\varphi_\\alpha^{-1}(x)$ and $\\eta^j = \\sum_i \\xi^i \\frac{\\partial \\tilde x^j}{\\partial x^i}$. Since $\\varphi_\\beta\\circ\\varphi_\\alpha^{-1}$ is smooth, its Jacobian matrix depends smoothly on $x$, so the coordinate transformation is smooth. The Hausdorff and second countability properties are inherited from $M$. Hence $TM$ is a $2n$-dimensional [smooth manifold](/nodes/dg%3Asmooth-manifold).

---

## Applications

### Direct applications

**Example 1: vector fields** A smooth section of the tangent bundle is called a **smooth tangent vector field** on $M$ (a vector field for short). Locally a vector field can be written as

$$X = \\sum_{i=1}^n \\xi^i(x) \\frac{\\partial}{\\partial x^i},$$

where the $\\xi^i$ are smooth functions. A vector field can be regarded as a derivation on $C^\\infty(M)$: for a smooth function $f$, $X(f) = \\sum_i \\xi^i \\frac{\\partial f}{\\partial x^i}$.

**Example 2: vector fields on $S^n$** The tangent bundle of $S^n$ is $TS^n = \\{(x,v)\\in S^n\\times\\mathbb{R}^{n+1}\\mid x\\perp v\\}$. A nowhere vanishing vector field on $S^n$ exists if and only if $n$ is odd (the hairy ball theorem).

**Example 3: the tangent bundle of the circle** For $S^1\\subset\\mathbb{R}^2$, making the tangent lines at different points disjoint requires embedding $T(S^1)$ into $\\mathbb{R}^3$: rotate the tangent line of the circle by an angle relative to the $(x,y)$-plane. Then $T(S^1)$ becomes a one-sheeted hyperboloid (a geometric cylinder). Globally, $TS^1$ is isomorphic to $S^1\\times\\mathbb{R}$, that is, the tangent bundle of $S^1$ is trivial.

### Indirect applications

- **Mechanical systems**: the configuration space of classical mechanics is a [manifold](/nodes/dg%3Amanifold) $M$, the state of the system is described by $(q,\\dot q)\\in TM$, and the Lagrange equations are defined on the tangent bundle.
- **The geodesic flow**: the geodesic equation on a Riemannian [manifold](/nodes/dg%3Amanifold) can be regarded as a vector field on $TM$ (the geodesic flow), whose orbits project to $M$ as geodesics.
- **The Poincaré–Hopf theorem**: the sum of the indices of the zeros of a vector field equals the Euler characteristic of the [manifold](/nodes/dg%3Amanifold); modern proofs of this theorem use the tangent bundle and the interpretation of its sections in intersection theory.

---

## Generalizations

- **Parallelisable [manifolds](/nodes/dg%3Amanifold)**: if $TM$ is isomorphic to the trivial bundle $M\\times\\mathbb{R}^n$, then $M$ is called parallelisable. For example, all Lie groups, $S^1$, $S^3$ and $S^7$ are parallelisable.
- **Contact [manifolds](/nodes/dg%3Amanifold)**: the unit cotangent bundle $T_1^*M$ carries a natural contact structure and is an important object of study in contact geometry.
- **Higher tangent bundles**: one can define the $k$-th order tangent bundle $T^kM$, whose points correspond to jets of order $k$.

---

## Common misconceptions

1. **“The tangent bundle is just $M\\times\\mathbb{R}^n$”**
   This holds only when $M$ is parallelisable. In general the tangent bundle has a product structure only locally; globally it may be “twisted”, as with $TS^2$, which is not a trivial bundle (because there is no nowhere vanishing vector field).

2. **“A tangent vector is an arrow”**
   For a sub[manifold](/nodes/dg%3Amanifold) embedded in Euclidean space, a tangent vector can be seen as a geometric arrow; but for an abstract [manifold](/nodes/dg%3Amanifold), a tangent vector should be understood as a derivation satisfying the Leibniz rule, or as an equivalence class of smooth curves, rather than as a directed line segment in Euclidean space.

3. **“The tangent bundle has the same dimension as the [manifold](/nodes/dg%3Amanifold)”**
   The tangent bundle $TM$ has dimension $2n$, twice the dimension of $M$. Only each fibre $T_pM$ has dimension $n$.

---

## Insights

- The construction of the tangent bundle embodies an extremely important idea in differential geometry: **making local structure global**. At each point we have a linear space (the tangent space), and the tangent bundle glues these linear spaces together smoothly, so that “pointwise linear algebra” can be lifted into global geometric analysis.
- The idea of local trivialisation — “although globally it may be twisted, locally it can always be seen as a product space” — runs through the whole theory of fibre bundles.
- The tangent bundle is itself a [manifold](/nodes/dg%3Amanifold), which means that we can take its tangent bundle again; this “iterated” construction produces higher structures such as the double tangent bundle $TTM$, which appears naturally in the theory of variations and of Jacobi fields.

---

## Summary

### Idea

**“Take the disjoint union of the tangent spaces at all points of a [manifold](/nodes/dg%3Amanifold), give it a [smooth structure](/nodes/dg%3Asmooth-structure), and make it into a new [manifold](/nodes/dg%3Amanifold).”** The tangent bundle is the globalised product of all the linear approximations on a [differentiable manifold](/nodes/manifold%3Ack-atlas), and is the central example of fibre bundle theory.

### Methods

| Method | Where it is used |
|------|----------|
| Local trivialisation | endowing $TM$ with its topology and [smooth structure](/nodes/dg%3Asmooth-structure) |
| Coordinate transformations | verifying the smoothness of $TM$ |
| Disjoint union | gathering the tangent spaces at all points into a whole |
| Sections | defining vector fields as smooth sections of the tangent bundle |

---

## Looking back and asking

- For a $C^k$ ($k\\ge1$) [manifold](/nodes/dg%3Amanifold), how should the tangent bundle be defined? How smooth is the tangent bundle?
- Why is the tangent bundle of the sphere $S^2$ not a trivial bundle? How can this be proved?
- The tangent bundle $TM$ is itself a $2n$-dimensional [manifold](/nodes/dg%3Amanifold); what structure does $T(TM)$ (the double tangent bundle) carry?
- In classical mechanics, why does Lagrangian mechanics need to be defined on the tangent bundle?

---

## References

1. \`梅加强（Mei Jiaqiang）. 流形与几何初步（Manifolds and Introductory Geometry）.\` (source: knowledge base document \`pdf_4\`)
2. \`А. С. 米先柯（A. S. Mishchenko）, А. Т. 福明柯（A. T. Fomenko）. 微分几何与拓扑学简明教程（A Concise Course in Differential Geometry and Topology）.\` (source: knowledge base document \`pdf_2\`)
3. Wolfgang Kühnel. *Differential Geometry: Curves – Surfaces – Manifolds*, Third Edition. (source: knowledge base document \`pdf_6\`)
4. \`陈维桓（Chen Weihuan）. 微分几何引论（Introduction to Differential Geometry）, 2013.\` (source: knowledge base document \`pdf_3\`)
5. Manfredo P. do Carmo. *Differential Geometry of Curves and Surfaces*. (source: knowledge base document \`pdf_8\`)
6. Tammo tom Dieck. *Algebraic Topology*. (source: knowledge base document \`pdf_5\`)
7. Victor W. Guillemin, Alan Pollack. *Differential Topology*, 2014. (source: knowledge base document \`pdf_10\`)
8. \`贝尔热（Berger）, 戈斯丢（Gostiaux）. 微分几何：流形、曲线和曲面（Differential Geometry: Manifolds, Curves and Surfaces）, 第二版修订本（2nd revised ed.）.\` (source: knowledge base document \`pdf_9\`)
9. John M. Lee. *Introduction to Riemannian Manifolds*, Second Edition. (source: knowledge base document \`pdf_7\`)
10. B. A. Dubrovin, S. P. Novikov, A. T. Fomenko. *Modern Geometry — Methods and Applications, Part II*, 1985. (source: knowledge base document \`pdf_11\`)
11. Clifford Henry Taubes. *Differential Geometry: Bundles, Connections, Metrics and…*, 2011. (source: knowledge base document \`pdf_12\`)`,

  'dg:smooth-vector-field': `## Smooth vector fields

**Source tags.** #differential-geometry #vector-field #tangent-bundle #manifold #definition #theorem

**Source.** The read-only snapshot \`G:/DifferentialGeometry/object/def/光滑向量场.md\` (see \`data/dg/\`).

---

A smooth vector field is one of the most basic and most central objects of study in differential geometry and topology. It is not only the intuitive realisation of the notion of a section of the [tangent bundle](/nodes/dg%3Atangent-bundle); it is also the bridge joining local analysis and global geometry on a [manifold](/nodes/dg%3Amanifold). From the integral curves of ordinary differential equations to left-invariant vector fields on Lie groups, from electromagnetic fields in physics to Killing fields in general relativity, smooth vector fields run through every level of modern geometry. This note sets out systematically the definition of a smooth vector field, its basic properties, the relevant theorems and its applications in geometry and physics.

---

## Prerequisites

### Essential

**[Smooth manifolds](/nodes/dg%3Asmooth-manifold)**: an $n$-dimensional [smooth manifold](/nodes/dg%3Asmooth-manifold) $M$ is a Hausdorff, paracompact [topological space](/nodes/dg%3Atopological-space) with a [smooth structure](/nodes/dg%3Asmooth-structure) (a $C^\\infty$ atlas); the set of all smooth functions on it is written $C^\\infty(M)$.

**Tangent spaces and tangent vectors**: let $M$ be a [smooth manifold](/nodes/dg%3Asmooth-manifold) and $p \\in M$. The tangent space $T_pM$ at $p$ is the $n$-dimensional real [vector space](/nodes/bg%3Alinear%3Avector) consisting of all tangent vectors at $p$. A tangent vector can be defined as a linear map from the germs of smooth functions to $\\mathbb{R}$ satisfying the Leibniz rule.

**Smooth maps and tangent maps**: let $f: M \\to N$ be a smooth map; the tangent map of $f$ at $p$, $f_{*p}: T_pM \\to T_{f(p)}N$, takes tangent vectors at $p$ to tangent vectors at $f(p)$.

**The theory of ordinary differential equations**: the existence and uniqueness theory for the initial-value problem of a system of ordinary differential equations, together with the smooth dependence of solutions on the initial values.

### Supporting

**[Tensor](/nodes/dg%3Atensor) fields**: a [tensor](/nodes/dg%3Atensor) field of type $(k,l)$ is a map assigning a [tensor](/nodes/dg%3Atensor) of type $(k,l)$ to each point. A [smooth tensor field](/nodes/dg%3Atensor) is required to give a smooth function when applied to smooth vector fields and dual vector fields.

**[Differential forms](/nodes/dg%3Adifferential-form)**: an antisymmetric covariant [tensor](/nodes/dg%3Atensor) field of order $s$ is called a [differential form](/nodes/dg%3Adifferential-form) of degree $s$. The exterior derivative $d$, the interior product $i_X$ and the Lie derivative $L_X$ are the three basic operations on [differential forms](/nodes/dg%3Adifferential-form), satisfying the Cartan formula $L_X = i_X \\circ d + d \\circ i_X$.

**[Riemannian metrics](/nodes/manifold%3Achart-atlas)**: the metric [tensor](/nodes/dg%3Atensor) field $g$ on a Riemannian [manifold](/nodes/dg%3Amanifold) $(M,g)$ gives an inner product structure on the tangent space at each point, from which the gradient field, the divergence and the Laplace operator can be defined.

**Vector bundles and sections**: the [tangent bundle](/nodes/dg%3Atangent-bundle) $TM$ is the most typical vector bundle over $M$, and a vector field is precisely a section of this bundle. The notion of a section of a general vector bundle generalises that of a vector field.

### Further

**The Frobenius theorem**: the existence theorem for integral [manifolds](/nodes/dg%3Amanifold) of an involutive distribution. The distribution generated by a smooth vector field (of rank 1) is automatically involutive, and its integral curves are exactly its integral [manifolds](/nodes/dg%3Amanifold). In the general case the Frobenius theorem reads: let $\\mathcal{D}$ be an involutive distribution of rank $k$ on $M$; then near any point there is a local coordinate system in which $\\mathcal{D}$ is spanned by the coordinate slices.

**Lie groups and Lie algebras**: the set of all left-invariant vector fields on a Lie group $G$ forms a Lie algebra $\\mathfrak{g}$; it is the algebra obtained by endowing the tangent space of $G$ at the identity, $T_eG$, with the Lie bracket.

**Connections and [covariant derivatives](/nodes/tensor%3Afield)**: a connection $\\nabla$ gives a rule for differentiating a vector field in the direction of another vector field, from which the divergence and curl of a vector field, and the notion of a geodesic, can be defined.

---

## Motivation

### Motivation for introducing it

The introduction of smooth vector fields can be traced along several threads:

**A thread internal to the discipline**: at every point $p$ of a [differentiable manifold](/nodes/manifold%3Ack-atlas) $M$ there is a tangent space $T_pM$, and these tangent spaces are mutually separate [vector spaces](/nodes/bg%3Alinear%3Avector). To study how tangent vectors change from point to point one needs a mechanism that makes the tangent vectors at the various points “cohere” — and this naturally leads to the notion of a section, that is, a map from $M$ to the [tangent bundle](/nodes/dg%3Atangent-bundle) $TM$. When this map is smooth and satisfies $\\pi \\circ X = \\mathrm{id}_M$, $X$ is a smooth vector field. (\`梅加强《\`[\`流形\`](/nodes/dg%3Amanifold)\`与几何初步》第 2 章导言\`) Going further, from the point of view of calculus on a [differentiable manifold](/nodes/manifold%3Ack-atlas), establishing a theory of differential equations on a [manifold](/nodes/dg%3Amanifold) and studying dynamical systems on a [manifold](/nodes/dg%3Amanifold) make the introduction of vector fields indispensable.

**A thread from outside**: in physics the “fields” of electromagnetism, gravitation and velocity are in essence all vector fields. For example, the electrostatic field strength $\\vec{E}$ of a point charge at $q$ in $\\mathbb{R}^3$ is a smooth vector field on the [manifold](/nodes/dg%3Amanifold) $M = \\mathbb{R}^3 - \\{q\\}$. In general relativity a Killing vector field on the spacetime [manifold](/nodes/dg%3Amanifold) corresponds to a symmetry of spacetime. In classical mechanics a Hamiltonian vector field describes the dynamical evolution on phase space.

**An aesthetic/structural thread**: on a [smooth manifold](/nodes/dg%3Asmooth-manifold) one needs a notion of “infinitesimal transformation” to describe the infinitesimal symmetries of the [manifold](/nodes/dg%3Amanifold). The local one-parameter transformation group generated by a smooth vector field provides exactly such a description: every smooth vector field $X$ generates a local one-parameter transformation group $\\{\\phi_t\\}$, where $\\phi_t$ is a diffeo[homeomorphism](/nodes/dg%3Ahomeomorphism) (locally), and $X$ is precisely the “infinitesimal generator” of this transformation group. (\`梁灿彬、周彬《微分几何入门与广义相对论》§2.2.2 选读 2-2-4\`)

### Motivation for the construction

The canonical form of a smooth vector field was not like this from the beginning; it went through an evolution from the concrete to the abstract.

**The seed stage**: in Euclidean space $\\mathbb{R}^n$ a vector field is just a map $\\mathbb{R}^n \\to \\mathbb{R}^n$. For example, the gradient field $\\nabla f(x) = (\\partial f/\\partial x^1, \\dots, \\partial f/\\partial x^n)$ defines a vector field on $\\mathbb{R}^n$. (\`梅加强《\`[\`流形\`](/nodes/dg%3Amanifold)\`与几何初步》§2.1\`) At this stage the notion of a vector field is tightly bound to the directional derivative of a function of several variables.

**The development**: in generalising vector fields from Euclidean space to a [smooth manifold](/nodes/dg%3Asmooth-manifold), the key difficulty is that the tangent spaces at different points have no natural identification. A vector field therefore cannot simply be regarded as “a map from the [manifold](/nodes/dg%3Amanifold) to the family of tangent spaces”; the notion of a [tangent bundle](/nodes/dg%3Atangent-bundle) has to be introduced. The Belgian mathematician Ehresmann systematically put forward the notion of a fibre bundle in the 1940s, and the [tangent bundle](/nodes/dg%3Atangent-bundle) was established as one of the most natural vector bundles. A vector field was redefined as a section of the [tangent bundle](/nodes/dg%3Atangent-bundle): $X: M \\to TM$ with $\\pi \\circ X = \\mathrm{id}_M$.

**The modern canonical form**: after the development above, the standard definition of a smooth vector field settled into the following form: $X$ is a smooth map from $M$ to $TM$ such that $X(p) \\in T_pM$ for every $p \\in M$. In a local coordinate system $\\{x^i\\}$, $X$ is written $X(p) = \\sum a^i(p) \\partial/\\partial x^i|_p$, where the $a^i$ are smooth functions. This expression preserves the intuition of a vector field in Euclidean space while achieving a rigorous formulation on a general [manifold](/nodes/dg%3Amanifold) through the framework of the [tangent bundle](/nodes/dg%3Atangent-bundle). (\`梅加强《\`[\`流形\`](/nodes/dg%3Amanifold)\`与几何初步》定义 2.1.2\`; \`梁灿彬、周彬《微分几何入门与广义相对论》§2.2.2 定义 8-9\`; \`陈维桓《微分几何引论》§3.2.1\`)

---

## Form

### Canonical general form

The definition of a smooth vector field has several equivalent formulations, each with its own advantages:

**Definition A (the section form)**: $X: M \\to TM$ is a smooth map with $\\pi \\circ X = \\mathrm{id}_M$. This is the most geometric definition; it brings out directly the essence of a vector field as a section of the [tangent bundle](/nodes/dg%3Atangent-bundle), and is suited to building the global theory.

**Definition B (the operator form)**: $X$ is a derivation of $C^\\infty(M)$, that is, $X: C^\\infty(M) \\to C^\\infty(M)$ is an $\\mathbb{R}$-linear map satisfying the Leibniz rule $X(fg) = fX(g) + gX(f)$. This definition is algebraically the most concise, and is convenient for handling the algebraic properties of the Lie bracket and the Lie derivative.

**Definition C (the component form)**: in a local coordinate system $\\{x^i\\}$, $X(p) = \\sum a^i(p) \\partial/\\partial x^i|_p$, and $X$ is smooth if and only if all the coefficients $a^i$ are smooth functions. (\`梁灿彬、周彬《微分几何入门与广义相对论》定理 2-2-6\`; \`梅加强《\`[\`流形\`](/nodes/dg%3Amanifold)\`与几何初步》引理 2.1.1\`) This definition is the most convenient for computation.

Definitions A and B are global and do not depend on coordinates; definition C is local and convenient for concrete computation. Each has its advantages, and different formulations are used in different contexts.

### Analysis of the necessary conditions (taking the existence and uniqueness theorem for integral curves as the example)

**Theorem**: let $X$ be a smooth vector field. Then for every $p \\in M$ and $c \\in \\mathbb{R}$ there exist $\\epsilon > 0$ and a unique integral curve $\\sigma: (c-\\epsilon, c+\\epsilon) \\to M$ with $\\sigma(c) = p$. (\`梅加强《\`[\`流形\`](/nodes/dg%3Amanifold)\`与几何初步》定理 2.1.4\`)

The theorem rests on several key conditions:

1. **The smoothness of $X$ ($C^\\infty$)**: counterexample — if $X$ is only continuous ($C^0$) and not smooth, then in a local coordinate system the coefficient functions are only continuous, the initial-value problem for the ordinary differential equation may fail the Lipschitz condition, and uniqueness of the solution may be lost (for instance $dx/dt = x^{2/3}$, $x(0)=0$ has several solutions). In fact $C^1$ already suffices to guarantee uniqueness, but smoothness provides higher regularity.

2. **The [smooth structure](/nodes/dg%3Asmooth-structure) of the [manifold](/nodes/dg%3Amanifold)**: counterexample — if $M$ is only a [topological manifold](/nodes/dg%3Atopological-manifold) ($C^0$) and not a [smooth manifold](/nodes/dg%3Asmooth-manifold), then no system of first-order ordinary differential equations can be written down in a local coordinate system, so the notion of an integral curve does not exist.

3. **$X$ is defined at every point of its domain**: counterexample — if $X$ is defined only on an open subset $U \\subset M$, then an integral curve passing through a boundary point of $U$ cannot be continued once it reaches the boundary; local existence and uniqueness still hold, but global continuation may be obstructed.

### Equivalent expressions

Several equivalent characterisations of a smooth vector field:

1. $X: M \\to TM$ is a smooth section $\\iff$ in local coordinates $X = \\sum a^i \\partial/\\partial x^i$ with the $a^i$ smooth $\\iff$ $\\forall f \\in C^\\infty(M)$, $Xf \\in C^\\infty(M)$. (\`梅加强《\`[\`流形\`](/nodes/dg%3Amanifold)\`与几何初步》引理 2.1.1\`; \`梁灿彬、周彬《微分几何入门与广义相对论》定理 2-2-6\`)

2. The fact that a vector field is a derivation of $C^\\infty(M)$ can be stated equivalently as: there is a natural one-to-one correspondence between $C^\\infty(M; TM)$ and $\\operatorname{Der}(C^\\infty(M))$.

3. A smooth vector field $X$ is equivalent to the infinitesimal generator of a local one-parameter transformation group $\\{\\phi_t\\}$ on $M$ (locally, $\\phi_t$ satisfies $\\frac{d}{dt}\\phi_t(p) = X_{\\phi_t(p)}$). (\`梅加强《\`[\`流形\`](/nodes/dg%3Amanifold)\`与几何初步》定理 2.1.5\`; \`梁灿彬、周彬《微分几何入门与广义相对论》§2.2.2\`)

### Kinds of statement

A “smooth vector field” is a concrete notion, but there are several layers of classification around it:

- **By smoothness**: $C^k$ vector fields ($k$ times continuously differentiable), $C^\\infty$ vector fields (smooth), $C^\\omega$ vector fields (analytic). By default “smooth” means $C^\\infty$.

- **By support**: vector fields with compact support ($\\operatorname{supp} X$ compact) and general vector fields. A vector field with compact support is necessarily complete. (\`梅加强《\`[\`流形\`](/nodes/dg%3Amanifold)\`与几何初步》定理 2.1.6\`)

- **By zeros**: vector fields with zeros (singularities of the vector field) and nowhere vanishing vector fields. Near a non-zero point a vector field can be put into the normal form $X = \\partial/\\partial y^1$. (\`梅加强《\`[\`流形\`](/nodes/dg%3Amanifold)\`与几何初步》引理 2.2.1\`)

- **By involutivity**: a single vector field automatically generates an involutive distribution; whether several vector fields are involutive determines whether they can be made into coordinate vector fields simultaneously. (\`梅加强《\`[\`流形\`](/nodes/dg%3Amanifold)\`与几何初步》引理 2.2.2\`)

- **By algebraic structure**: left-invariant vector fields on a Lie group and general vector fields. The left-invariant vector fields form a Lie algebra, and all of them are complete. (\`梅加强《\`[\`流形\`](/nodes/dg%3Amanifold)\`与几何初步》命题 2.1.12\`)

### How are the relevant statements expressed in natural language?

- **Testing the smoothness of a vector field**: a vector field is smooth if and only if the result of applying it to any smooth function is again a smooth function. (\`梅加强《\`[\`流形\`](/nodes/dg%3Amanifold)\`与几何初步》引理 2.1.1\`)

- **The meaning of an integral curve**: the integral curves of a vector field are those smooth curves whose tangent direction at every point agrees with the value of the vector field at that point. (\`梅加强《\`[\`流形\`](/nodes/dg%3Amanifold)\`与几何初步》定义 2.1.5\`)

- **The normal form of a flow**: near a non-zero point of a vector field one can always find local coordinates in which the vector field is simply the derivative in the first coordinate direction. (\`梅加强《\`[\`流形\`](/nodes/dg%3Amanifold)\`与几何初步》引理 2.2.1\`)

- **The geometric meaning of the Lie bracket**: the Lie bracket of two vector fields measures the difference between flowing along one of them and then along the other, and flowing in the opposite order — an infinitesimal quantity.

### Reduction

Restating the notion of a smooth vector field in more basic language:

**Set-theoretic language**: a smooth vector field is a map from a set $M$ to a set $TM$ satisfying $\\pi \\circ X = \\mathrm{id}_M$, such that $X$ is smooth as a map between [manifolds](/nodes/dg%3Amanifold).

**Algebraic language**: a smooth vector field is an element of the $C^\\infty(M)$-module $C^\\infty(M;TM)$, and also an element of the set of derivations $\\operatorname{Der}(C^\\infty(M))$ of $C^\\infty(M)$.

**Categorical language**: the [tangent bundle](/nodes/dg%3Atangent-bundle) $TM$ is a vector bundle over $M$, and a vector field is a lift of the identity section $\\operatorname{id}_M: M \\to M$ along the tangent functor $T$; it is a section of the object part of the functor $T$.

### Lifting

In higher-level theories, a smooth vector field is an instance of more general notions:

- A vector field is a **section of the [tangent bundle](/nodes/dg%3Atangent-bundle)**, and the [tangent bundle](/nodes/dg%3Atangent-bundle) is a special case of a vector bundle. In the general theory of vector bundles ([tensor](/nodes/dg%3Atensor) bundles, cotangent bundles, frame bundles and so on) the notion of a section generalises that of a vector field.

- In **connection theory** the [covariant derivative](/nodes/tensor%3Afield) of vector fields $\\nabla_X Y$ generalises the directional derivative in Euclidean space. The divergence of a vector field ($\\operatorname{div} X$) can be defined through a connection or a Lie derivative, and is a basic operator of global analysis on a [manifold](/nodes/dg%3Amanifold). (\`梅加强《\`[\`流形\`](/nodes/dg%3Amanifold)\`与几何初步》§3.2\`)

- In **Lie theory** the Lie algebra $C^\\infty(M;TM)$ formed by smooth vector fields is an infinite-dimensional Lie algebra; the left-invariant vector fields on a Lie group form a finite-dimensional Lie subalgebra, the foundation of the Lie algebra of a Lie group. (\`梅加强《\`[\`流形\`](/nodes/dg%3Amanifold)\`与几何初步》命题 2.1.12\`)

- In **global analysis** the flow of a smooth vector field (a one-parameter transformation group) is a dynamical system on $M$. A smooth vector field on a compact [manifold](/nodes/dg%3Amanifold) is necessarily complete (Corollary 2.1.7), which means that its flow is globally defined. (\`梅加强《\`[\`流形\`](/nodes/dg%3Amanifold)\`与几何初步》推论 2.1.7\`; \`梁灿彬、周彬《微分几何入门与广义相对论》§2.2.2 选读 2-2-4\`)

### Understanding through links with similar objects, if the topic has any

- **Vector fields vs dual vector fields (1-forms)**: a vector field is the dual object of a dual vector field. Given a [Riemannian metric](/nodes/manifold%3Achart-atlas) $g$, a natural dual isomorphism can be set up between the two: a tangent vector field $X$ corresponds to the 1-form $\\omega = g(X, \\cdot)$. The gradient field is precisely the dual vector field of the exterior derivative $df$. (\`梅加强《\`[\`流形\`](/nodes/dg%3Amanifold)\`与几何初步》例 2.4.4\`)

- **Vector fields vs [tensor](/nodes/dg%3Atensor) fields**: a vector field is a [tensor](/nodes/dg%3Atensor) field of type $(1,0)$. A general [tensor](/nodes/dg%3Atensor) field is the multilinear generalisation of a vector field.

- **Vector fields vs distributions**: a smooth distribution assigns a tangent subspace at each point, and vector fields (several of them, in particular) can generate a distribution. The Frobenius theorem characterises when an involutive distribution is integrable (that is, when integral [manifolds](/nodes/dg%3Amanifold) exist). (\`梅加强《\`[\`流形\`](/nodes/dg%3Amanifold)\`与几何初步》定理 2.2.3\`)

- **Vector fields vs flows**: every smooth vector field generates a local one-parameter transformation group (a flow). Conversely, the “tangent vector” at the identity of every one-parameter group of diffeo[homeomorphisms](/nodes/dg%3Ahomeomorphism) defines a smooth vector field. (\`梅加强《\`[\`流形\`](/nodes/dg%3Amanifold)\`与几何初步》定理 2.1.5\`; \`梁灿彬、周彬《微分几何入门与广义相对论》§2.2.2\`)

---

## Proof

### Proof sketch

**Existence and uniqueness of integral curves**: the problem is reduced in a local coordinate system to the initial-value problem for a system of first-order ordinary differential equations, and existence and uniqueness follow from the theory of ordinary differential equations. (\`梅加强《\`[\`流形\`](/nodes/dg%3Amanifold)\`与几何初步》定理 2.1.4\`)

**The normal form of a flow**: near a non-zero point one chooses local coordinates and uses the flow of the vector field itself (a local one-parameter transformation group) to construct new coordinate functions, so that in the new coordinates the vector field is exactly $\\partial/\\partial y^1$. (\`梅加强《\`[\`流形\`](/nodes/dg%3Amanifold)\`与几何初步》引理 2.2.1\`)

**Completeness of vector fields with compact support**: let $K = \\operatorname{supp} X$ be compact. By the smooth dependence of integral curves there are $\\epsilon > 0$ and an open neighbourhood $V$ of $K$ such that $X$ generates a local one-parameter transformation group $\\{\\phi_t\\}_{|t|<\\epsilon}$ with $\\phi_t: V \\to \\phi_t(V)$ a diffeo[homeomorphism](/nodes/dg%3Ahomeomorphism). Extending the definition of $\\phi_t$ outside $K$ — by setting $\\phi_t(p) = p$ for $p \\notin K$ — extends the domain of $\\phi_t$ to the whole of $M$. Applying this extension repeatedly gives the completeness of $X$. (\`梅加强《\`[\`流形\`](/nodes/dg%3Amanifold)\`与几何初步》定理 2.1.6\`)

**The Jacobi identity for the Lie bracket**: compute $[X,[Y,Z]]f + [Y,[Z,X]]f + [Z,[X,Y]]f$ directly and expand it into the cyclic sum of six types of terms such as $X(Y(Zf)) - X(Z(Yf)) - Y(Z(Xf)) + Z(Y(Xf))$; the terms cancel in pairs and the total is zero. (\`梅加强《\`[\`流形\`](/nodes/dg%3Amanifold)\`与几何初步》§2.1\`; \`梁灿彬、周彬《微分几何入门与广义相对论》§2.2.2 习题 8\`)

---

## Applications

### Direct applications

**Example 1: applications of the gradient field**: on a Riemannian [manifold](/nodes/dg%3Amanifold) $(M,g)$ the gradient field $\\nabla f$ of a smooth function $f$ satisfies $\\langle \\nabla f, X \\rangle = Xf$, $\\forall X$. The integral curves of the gradient field are the curves of “steepest ascent” of $f$. The zeros of the gradient field are exactly the critical points of $f$. (\`梅加强《\`[\`流形\`](/nodes/dg%3Amanifold)\`与几何初步》例 2.4.4\`)

**Example 2: the divergence theorem for vector fields**: let $M$ be an oriented [manifold](/nodes/dg%3Amanifold) with boundary, $\\Omega$ a volume form and $X$ a smooth vector field on $M$ with compact support; then
$$
\\int_M (\\operatorname{div} X)\\, \\Omega = \\int_{\\partial M} i_X\\Omega.
$$
When the volume form $\\Omega$ is the volume form of a [Riemannian metric](/nodes/manifold%3Achart-atlas), we have
$$
\\int_M (\\operatorname{div} X)\\, \\Omega = \\int_{\\partial M} \\langle X, n \\rangle\\, \\Omega|_{\\partial M},
$$
where $n$ is the unit outward normal vector of $\\partial M$. (\`梅加强《\`[\`流形\`](/nodes/dg%3Amanifold)\`与几何初步》推论 2.7.4、2.7.5\`)

**Example 3: completeness of smooth vector fields on a compact [manifold](/nodes/dg%3Amanifold)**: let $M$ be a compact [differentiable manifold](/nodes/manifold%3Ack-atlas); then every smooth vector field $X$ on $M$ is complete, that is, its integral curves can be extended to the whole real line $\\mathbb{R}$. This means that the one-parameter transformation group $\\{\\phi_t\\}_{t \\in \\mathbb{R}}$ generated by $X$ is globally defined. (\`梅加强《\`[\`流形\`](/nodes/dg%3Amanifold)\`与几何初步》推论 2.1.7\`; \`梁灿彬、周彬《微分几何入门与广义相对论》§2.2.2 选读 2-2-4\`)

**Example 4: the Lie algebra structure of left-invariant vector fields**: let $G$ be a Lie group. The left-invariant vector fields on $G$ are all smooth and complete, and the Lie bracket preserves left invariance, so the left-invariant vector fields form a finite-dimensional Lie algebra $\\mathfrak{g} \\cong T_eG$. (\`梅加强《\`[\`流形\`](/nodes/dg%3Amanifold)\`与几何初步》命题 2.1.12\`)

### Indirect applications

**Applications in mathematics**:
- The Lie bracket of vector fields plays the key role in the Frobenius theorem in deciding whether a distribution is integrable — a distribution $\\mathcal{D}$ is involutive ($[X,Y] \\in \\mathcal{D}$ for all $X,Y \\in \\mathcal{D}$) if and only if it is integrable. (\`梅加强《\`[\`流形\`](/nodes/dg%3Amanifold)\`与几何初步》定理 2.2.3\`)
- The Lie derivative of vector fields is the basic tool for studying the rate of change of a [tensor](/nodes/dg%3Atensor) field along a flow. The Cartan formula $L_X = i_X \\circ d + d \\circ i_X$ links the Lie derivative with the exterior derivative and the interior product, and is one of the core formulae of the theory of [differential forms](/nodes/dg%3Adifferential-form). (\`梅加强《\`[\`流形\`](/nodes/dg%3Amanifold)\`与几何初步》定义 2.5.6\`)
- In differential topology the sum of the indices of the zeros (singularities) of a vector field is related to the Euler characteristic of the [manifold](/nodes/dg%3Amanifold) (the Poincaré–Hopf theorem), an important result of global differential geometry.

**Applications in physics and engineering**:
- In electromagnetism the electric field strength $\\vec{E}$ and the magnetic flux density $\\vec{B}$ are both smooth vector fields on $\\mathbb{R}^3$. The equations $\\operatorname{div} \\vec{E} = \\rho$ (Gauss’s law) and $\\operatorname{curl} \\vec{E} = -\\partial \\vec{B}/\\partial t$ (Faraday’s law) are differential equations for vector fields. (\`梁灿彬、周彬《微分几何入门与广义相对论》§2.2.2 例 4\`)
- In general relativity a Killing vector field of the metric [tensor](/nodes/dg%3Atensor) field corresponds to a symmetry of spacetime, and provides a key tool for solving the Einstein field equations. The divergence formula for a vector field on a spacetime [manifold](/nodes/dg%3Amanifold), $\\nabla_a v^a = \\frac{1}{\\sqrt{|g|}} \\frac{\\partial}{\\partial x^\\sigma}(\\sqrt{|g|}\\, v^\\sigma)$, is a commonly used tool in curvature computations. (\`梁灿彬、周彬《微分几何入门与广义相对论》§3.4\`)
- In fluid mechanics the velocity field is a vector field on a [manifold](/nodes/dg%3Amanifold), and its streamlines (integral curves) describe the trajectories of fluid particles; the divergence describes the rate of expansion of the fluid and the curl its rate of rotation.

---

## Generalizations

- **The conditions can be relaxed**: generalising a smooth vector field to a $C^k$ vector field ($k \\ge 1$), existence and uniqueness of integral curves still hold (only $C^1$ is needed to guarantee uniqueness), but the normal form of the flow requires higher regularity. Can the “compact support” condition in Theorem 2.1.6 be relaxed? A vector field on a non-compact [manifold](/nodes/dg%3Amanifold) is still complete if its flow is defined at every point for a uniform time $\\epsilon$ (that is, $\\forall p \\in M$ the integral curve is defined on $(-\\epsilon, \\epsilon)$).

- **The conclusions can be generalised**: a vector field is a [tensor](/nodes/dg%3Atensor) field of type $(1,0)$. Many of the discussions generalise to general [tensor](/nodes/dg%3Atensor) fields: the Lie derivative of a [tensor](/nodes/dg%3Atensor) field, the [covariant derivative](/nodes/tensor%3Afield) of a [tensor](/nodes/dg%3Atensor) field along a vector field, and so on. The notion of a vector field as a section of the [tangent bundle](/nodes/dg%3Atangent-bundle) generalises to sections of an arbitrary vector bundle — for instance [differential forms](/nodes/dg%3Adifferential-form) (sections of the cotangent bundle) and [tensor](/nodes/dg%3Atensor) fields (sections of [tensor](/nodes/dg%3Atensor) bundles).

- **Open problems**: the dynamical behaviour of the singularities (zeros) of vector fields is still an active area of research, especially on high-dimensional [manifolds](/nodes/dg%3Amanifold). The structural stability of smooth vector fields on a compact [manifold](/nodes/dg%3Amanifold) (Smale’s conjecture, Markov partitions and so on) is a central topic of dynamical systems. In particular, the classification of Morse–Smale vector fields and their applications in low-dimensional topology remain an important direction of research.

---

## Common misconceptions

1. **“Every vector field has globally defined integral curves”**: beginners easily assume that the integral curves of any vector field can be extended indefinitely. In fact only a complete vector field (such as a smooth vector field on a compact [manifold](/nodes/dg%3Amanifold)) has globally defined integral curves. A smooth vector field on a general [manifold](/nodes/dg%3Amanifold) guarantees only the existence of local integral curves (Theorem 2.1.4); they may have to be extended step by step, and the extension may meet a boundary. (\`梅加强《\`[\`流形\`](/nodes/dg%3Amanifold)\`与几何初步》定理 2.1.4\`; \`梁灿彬、周彬《微分几何入门与广义相对论》§2.2.2 选读 2-2-3、2-2-4\`)

2. **“The coefficients of a smooth vector field must be smooth functions”**: this proposition is correct in a certain sense (Lemma 2.1.1), but beginners may conversely think that “the coefficients are smooth” is only a sufficient condition for the vector field to be smooth, overlooking its necessity. In fact, in a local coordinate system $X$ is smooth if and only if the coefficients $a^i = X(x^i)$ are smooth; the two are equivalent. (\`梅加强《\`[\`流形\`](/nodes/dg%3Amanifold)\`与几何初步》引理 2.1.1\`; \`梁灿彬、周彬《微分几何入门与广义相对论》定理 2-2-6\`)

3. **“Coordinate basis vector fields always commute with each other”**: it is true that the coordinate basis fields satisfy $[\\partial/\\partial x^i, \\partial/\\partial x^j] = 0$, but beginners may mistakenly think that the Lie bracket of any two vector fields vanishes. In fact the Lie bracket measures the non-commutativity of vector fields, and $[X,Y] = 0$ is a very strong condition — it means that the local flows generated by $X$ and $Y$ commute. (\`梅加强《\`[\`流形\`](/nodes/dg%3Amanifold)\`与几何初步》引理 2.2.2\`)

4. **“At a zero of a vector field the flow behaves like anywhere else”**: at a zero of a vector field the integral curve degenerates to a constant curve ($\\sigma(t) \\equiv p$), and the normal form of the flow fails at the zero (because the normal form requires $X(p) \\neq 0$). The local behaviour near a zero requires a finer analysis (linearisation, the Poincaré normal form theory). (\`梅加强《\`[\`流形\`](/nodes/dg%3Amanifold)\`与几何初步》引理 2.2.1\`)

---

## Insights

- **“Localisation + ODE” is an extremely important habit of thought in differential geometry**: from the existence and uniqueness of integral curves of a smooth vector field to the normal form of a flow, the core strategy is always first to reduce the problem to an ordinary differential equation in a local coordinate system and then to return to the [manifold](/nodes/dg%3Amanifold) by a change of coordinates. This strategy of “first make the problem simple locally with coordinates, then assemble globally” runs through the whole of differential geometry.

- **A vector field is at the same time a geometric and an algebraic object**: it is both a section of the [tangent bundle](/nodes/dg%3Atangent-bundle) (geometry) and a derivation of $C^\\infty(M)$ (algebra). This double identity allows us to understand vector fields through geometric intuition (streamlines, one-parameter transformation groups) and to compute with algebraic tools (the Lie bracket, the Lie derivative). This “geometry–algebra” correspondence is a theme that recurs throughout Riemannian geometry and Lie theory.

- **The viewpoint of the “infinitesimal generator” unifies analysis and geometry**: a smooth vector field can be “integrated” to give a local one-parameter transformation group (a flow), and the “differential” of that flow returns to the original vector field. This correspondence between differentiation and integration is the essence of dynamical systems on a [manifold](/nodes/dg%3Amanifold), and the cornerstone of the theory of symmetry from classical mechanics to quantum field theory.

---

## Summary

### Idea

The core idea of a smooth vector field is: **“assign an infinitesimal direction at each point of a [manifold](/nodes/dg%3Amanifold), and let these directions vary continuously (smoothly)”**. This notion generalises the intuition of the directional derivative in $\\mathbb{R}^n$ to an arbitrary [smooth manifold](/nodes/dg%3Asmooth-manifold), and thereby builds a bridge between the local and the global — locally, a vector field becomes an ordinary differential equation; globally, the flow of a vector field gives a dynamical system on the [manifold](/nodes/dg%3Amanifold).

### Methods

- **The local-coordinate method**: turning a problem on a [manifold](/nodes/dg%3Amanifold) into a problem on $\\mathbb{R}^n$ by means of local coordinate systems (as in the test of smoothness in Lemma 2.1.1, and the existence and uniqueness of integral curves in Theorem 2.1.4).
- **Generating a flow and changing coordinates**: using the integral curves of the vector field itself to construct new coordinates and put the vector field into normal form (Lemmas 2.2.1 and 2.2.2).
- **[Compactness](/nodes/dg%3Acompactness)/compact-support extension technique**: extending a local one-parameter transformation group to a globally defined group by the identity extension (setting $\\phi_t(p)=p$ outside the support), thereby proving completeness (Theorem 2.1.6, Corollary 2.1.7).
- **The algebraic calculus of Lie brackets**: using the Jacobi identity and the Leibniz rule to handle higher-order properties of composites of vector fields, turning geometric problems into algebraic computations.

---

## Looking back and asking

- Why does $[X,Y]$, as a tangent vector field, have to be verified to satisfy the Leibniz rule? Where is the key step in that verification?
- If $M$ is not compact and the support of $X$ is not compact, can one construct an incomplete smooth vector field? How?
- In the normal form of a flow (Lemma 2.2.1), if $X(p) = 0$, can the vector field still have some kind of normal form near $p$?
- In the normal form for commuting vector fields (Lemma 2.2.2), can the condition $[X_i, X_j] = 0$ be weakened? For example, can it be replaced by $[X_i, X_j] \\in \\operatorname{span}\\{X_1,\\dots,X_k\\}$?
- Can the Jacobi identity for the Lie bracket be seen from the expansion of the commutator of one-parameter transformation groups (such as $\\exp(-tY)\\exp(-tX)\\exp(tY)\\exp(tX)$)?
- Why are the left-invariant vector fields on a Lie group necessarily complete? On a general [manifold](/nodes/dg%3Amanifold), which vector fields are complete?

---

### References

1. \`梅加强（Mei Jiaqiang）. 流形与几何初步（Manifolds and Introductory Geometry）.\`
2. \`梁灿彬，周彬（Liang Canbin, Zhou Bin）. 微分几何入门与广义相对论（An Introduction to Differential Geometry and General Relativity）（3 册合集 / three-volume set）.\`
3. \`特里斯坦·尼达姆（Tristan Needham）. 可视化微分几何和形式：一部五幕数学正剧（Visual Differential Geometry and Forms: A Mathematical Drama in Five Acts）.\`
4. \`贝尔热（Berger），戈斯丢（Gostiaux）. 微分几何：流形、曲线和曲面（Differential Geometry: Manifolds, Curves and Surfaces）（第二版修订本 / 2nd revised ed.）. 王耀东（Wang Yaodong）译.\`
5. \`陈维桓（Chen Weihuan）. 微分几何引论（Introduction to Differential Geometry）.\`
6. \`А. С. 米先柯（A. S. Mishchenko），А. Т. 福明柯（A. T. Fomenko）. 微分几何与拓扑学简明教程（A Concise Course in Differential Geometry and Topology）.\``,

  'dg:tensor': `## Tensors

> Let $(r, s)$ be a pair of non-negative integers. If the function

**Source tags.** #differential-geometry #tensor #multilinear-algebra #definition #general-technique #introductory

**Source.** The read-only snapshot \`G:/DifferentialGeometry/object/def/张量.md\` (see \`data/dg/\`).

---

A tensor is the natural generalisation of a vector: it is a real-valued multilinear function whose inputs are several vectors and dual vectors on a [vector space](/nodes/bg%3Alinear%3Avector) (or on the tangent space at each point of a [manifold](/nodes/dg%3Amanifold)). The notion of a tensor grew out of the need to “find mathematical formulae for physical laws that are independent of the choice of coordinate system”, and the term “tensor” may come from its earliest use in studying the stress system at a point of an elastic body. Today tensors play a foundational role in differential geometry, general relativity and many branches of mathematics.

## Prerequisites

### Essential

- **[Vector spaces](/nodes/bg%3Alinear%3Avector) and bases**: knowing an $n$-dimensional [vector space](/nodes/bg%3Alinear%3Avector) $V$, a basis $\\{e_i\\}$, and the component expansion of an element $u = u^i e_i$.
- **Linear functions (dual vectors)**: knowing the notion of a linear map $f: V \\to \\mathbb{R}$; all such linear functions form the dual space $V^*$, whose dual basis $\\{e^j\\}$ satisfies $e^j(e_i) = \\delta^j_i$.
- **Multilinearity**: a function is multilinear if it is linear in each input slot separately (a multilinear map can be pictured as a machine: feed in inputs and it produces a real number, and that number depends linearly on every input).

### Auxiliary

- **Change of basis and the covariant/contravariant rules**: if $\\tilde{e}_i = a_i^k e_k$, the dual basis satisfies $e^i = a_j^i \\tilde{e}^j$. The components of a vector $u \\in V$ follow the “contravariant” rule, while the components of $f \\in V^*$ follow $\\tilde{f}_j = a_j^i f_i$, which agrees with the transformation rule of the basis itself and is therefore called “covariant”. Contravariant and covariant vectors emphasise how their components differ under a change of basis: the former are elements of $V$ itself, the latter are elements of $V^*$.
- **Einstein summation convention**: a repeated index is to be summed over.
- **Similarity of matrices**: a tensor of type (1, 1) corresponds to similar matrices in different bases, which helps in understanding contraction and the trace.

### Further background

- **[Differentiable manifolds](/nodes/manifold%3Ack-atlas) and tangent spaces**: at each point $p$ of a [manifold](/nodes/dg%3Amanifold) there is a tangent space $T_p M$ and a cotangent space $T_p^* M$; the definition of a tensor can be carried over point by point to a [manifold](/nodes/dg%3Amanifold) to give a tensor field.
- **Tensor products in category theory**: the tensor product of homomorphisms $f \\otimes g$ satisfies the unit law $\\mathrm{id}_A \\otimes \\mathrm{id}_B = \\mathrm{id}_{A \\otimes B}$, and the tensor product can be seen as a bifunctor.
- **[Covariant derivatives](/nodes/tensor%3Afield) and connections**: a connection on the [tangent bundle](/nodes/dg%3Atangent-bundle) can be extended to tensor fields of arbitrary type by requiring it to commute with the tensor product, the exterior product and contraction.

## Motivation

### Introducing motivation

- **Internal line of thought**: in a [vector space](/nodes/bg%3Alinear%3Avector) there are two kinds of “vector” — elements of $V$ (contravariant vectors) and elements of $V^*$ (covariant vectors) — whose components follow different rules under a change of basis. To handle both kinds, together with their multilinear combinations (bilinear forms, quadratic forms, linear operators), in one unified framework, one needs a structure that can hold several upper and lower indices at once.
- **External application**: tensor calculus was originally aimed at finding mathematical formulae for physical laws that are independent of the choice of coordinate system; such formulae are called tensor equations. If both sides of a formula are tensors of the same type, then whenever it holds in one coordinate system it holds in every coordinate system. The stress system at a point of an elastic body was the earliest physical prototype.
- **Aesthetic/structural line of thought**: mathematically, the notion of a tensor has been explained as a multilinear function on a [vector space](/nodes/bg%3Alinear%3Avector) $V$ or $V^*$, a concise, unified and coordinate-free definition that “makes the existence of an object be taken for granted”.

### Motivation for the construction

The “embryo” of the concept is component-based: in the past, a tensor of type $(r, s)$ on $V$ was defined by its components — if for every basis of $V$ one assigns $n^{r+s}$ numbers $\\tau^{i_1 \\cdots i_r}_{j_1 \\cdots j_s}$ such that, when the basis changes, this family of numbers transforms according to the multiple contravariant and covariant linear rules, then such a structure is called a tensor. Classical textbooks (such as Dubrovin–Fomenko–Novikov) also take this route: a tensor (or tensor field) is a family of numbers relative to a coordinate system, one set of components for each point, transforming by a fixed multiple chain rule under a change of coordinates.

The “development” of this embryo is: use this family of numbers to build the multilinear function $\\tau^{i_1 \\cdots i_r}_{j_1 \\cdots j_s} e_{i_1} \\otimes \\cdots \\otimes e_{i_r} \\otimes e^{j_1} \\otimes \\cdots \\otimes e^{j_s}$, which is independent of the choice of basis and is therefore a completely determined element of the tensor space. Nowadays we define a tensor directly as a multilinear function, which is more convenient and clearer in meaning. This is exactly the process by which the modern canonical form replaced the component-based definition.

## Form

### The canonical general form

The modern canonical form (the multilinear-function definition):

> $$\\theta : \\underbrace{T_p^* M \\times \\cdots \\times T_p^* M}_{r} \\times \\underbrace{T_p M \\times \\cdots \\times T_p M}_{s} \\to \\mathbb{R}$$
> and linear in every slot; then $\\theta$ is called a tensor of type $(r, s)$ at $p$; $r$ is called the contravariant index and $s$ the covariant index. The set of all tensors of type $(r, s)$ is written $\\otimes^{r,s} T_p M$ (or $V_s^r = \\mathcal{L}(V^*, \\dots, V^*; V, \\dots, V; \\mathbb{R})$), and under the natural addition and scalar multiplication it becomes a [vector space](/nodes/bg%3Alinear%3Avector).

Comparison with the component-based definition: the component-based definition treats a tensor as “the totality of all its component representations in all coordinate systems”, which is intuitive and close to computation (the Ricci calculus is based on it); the multilinear-function definition is coordinate-free, “more convenient and clearer in meaning”, and suits the language of modern geometry. The two definitions are equivalent (see the “Proof” section). Needham’s presentation splits the input slots into two groups separated by a bar: $H(\\varphi_1, \\cdots, \\varphi_f \\| v_1, \\cdots, v_v)$, and the order of the inputs generally matters.

The rank of a tensor is the total number $r + s$ of its inputs (vectors and/or dual vectors); by convention a tensor of rank 0 is a real number. We stipulate that a tensor of type $(r, 0)$ is called a contravariant tensor of rank $r$, and a tensor of type $(0, s)$ a covariant tensor of rank $s$.

### Analysis of the necessary conditions

The object of this note is a definition rather than a theorem, but each of the two conditions in the definition is indispensable:

- **Multilinearity**: if linearity in one slot is dropped, the components no longer follow a purely linear transformation rule under a change of basis, and the property of tensor equations — “holding in one coordinate system means holding in all of them” — collapses with it.
- **The value depends only on the inputs at the point of evaluation**: Needham stresses that the second defining property of a tensor is that “the output depends only on the input vectors at the point of evaluation”. For instance, although the defining formula of the Riemann curvature $R$ is built from derivatives, it depends only on the values of three vectors at a particular point and not on how those vectors vary near that point — if this condition fails (say for an expression involving second derivatives), the object is not a tensor. For a position function $J$ (satisfying $J(o)=1$), replace $W_{\\mathrm{OLD}}$ by $W_{\\mathrm{NEW}} = J W_{\\mathrm{OLD}}$; a direct computation shows that $R(U, V; W_{\\mathrm{NEW}}) = R(U, V; W_{\\mathrm{OLD}})$ holds at $o$, the four terms containing derivatives of $J$ cancelling “miraculously”.

### Equivalent expressions

Let $\\{e_i\\}$ be a basis of $V$ and $\\{e^j\\}$ the dual basis; then a basis of the tensor space $V_s^r$ of type $(r, s)$ is

$$\\{e_{i_1} \\otimes \\cdots \\otimes e_{i_r} \\otimes e^{j_1} \\otimes \\cdots \\otimes e^{j_s}\\},$$

and any $\\tau \\in V_s^r$ can be written as

$$\\tau = \\tau^{i_1 \\cdots i_r}_{j_1 \\cdots j_s} e_{i_1} \\otimes \\cdots \\otimes e_{i_r} \\otimes e^{j_1} \\otimes \\cdots \\otimes e^{j_s},$$

with components $\\tau^{i_1 \\cdots i_r}_{j_1 \\cdots j_s} = \\tau(e^{i_1}, \\cdots, e^{i_r}, e_{j_1}, \\cdots, e_{j_s})$. On a [manifold](/nodes/dg%3Amanifold), a tensor of type $(0, s)$ (a covariant tensor) has the basis $dx^{j_1}|_p \\otimes \\cdots \\otimes dx^{j_s}|_p$ and the components $A_{j_1 \\cdots j_s} = A_p(\\partial/\\partial x^{j_1}, \\cdots, \\partial/\\partial x^{j_s})$.

**Transformation law**: let $\\tilde{e}_i = a_i^k e_k$ and let the dual basis be $\\tilde{e}^j = b_l^j e^l$ (where $(b_l^j)$ is the inverse matrix of $(a_l^j)$); then

$$\\tilde{\\tau}^{i_1 \\cdots i_r}_{j_1 \\cdots j_s} = b_{k_1}^{i_1} \\cdots b_{k_r}^{i_r} a_{j_1}^{l_1} \\cdots a_{j_s}^{l_s} \\tau^{k_1 \\cdots k_r}_{l_1 \\cdots l_s}.$$

On a [manifold](/nodes/dg%3Amanifold), the relation between the components of a tensor of type $(k, l)$ in two coordinate systems (the tensor transformation law) is

$$T'^{\\mu_1 \\cdots \\mu_k}{}_{\\nu_1 \\cdots \\nu_l} = \\frac{\\partial x'^{\\mu_1}}{\\partial x^{\\rho_1}} \\cdots \\frac{\\partial x^{\\sigma_l}}{\\partial x'^{\\nu_l}} T^{\\rho_1 \\cdots \\rho_k}{}_{s_1 \\cdots s_l}.$$

Many textbooks take the formula above as the definition of a tensor; it is equivalent to the multilinear-function definition.

### Kinds of form

A tensor is “a collective name for a great many things”, classified by $(r, s)$; classical examples include:

- a velocity vector is a tensor of type $(1, 0)$;
- a covector (dual vector) is a tensor of type $(0, 1)$;
- a quadratic form on vectors is a tensor of type $(0, 2)$; a quadratic form on covectors is a tensor of type $(2, 0)$;
- a linear operator on vectors or covectors is a tensor of type $(1, 1)$;
- the metric $g$ is a symmetric, non-degenerate tensor of type $(0, 2)$ (symmetric means $g(v, u) = g(u, v)$, non-degenerate means $g(v, u) = 0, \\forall u \\Rightarrow v = 0$);
- the Riemann curvature tensor $R$ is a multilinear map taking three vectors as input and returning a vector; after contracting with a 1-form it becomes a tensor of type $(1,3)$ (one upper, three lower indices): $R(\\varphi \\| u, v, w) := \\varphi(\\delta w)$.

By input structure there are also: tensors of type $(1, s)$ are multilinear maps with values in the tangent space, $A_p: (T_pM)^s \\to T_pM$.

### How are the relevant claims expressed in natural language?

“A tensor is a machine with $k$ upper slots and $l$ lower slots; feed $k$ dual vectors and $l$ vectors into the upper and lower slots respectively, and it produces a real number, and that number depends linearly on each input.” (Liang Canbin) “A tensor is a real-valued multilinear function of several 1-forms and several vectors, and its value at a point depends only on the values of those 1-forms and vectors at that point.” (Needham) “A tensor is a quantity similar to a vector whose components transform, under a change of basis, according to the multiple contravariant or covariant linear transformation rules.” (Chen Weihuan)

### Lower-dimensional formulation

In a more basic language (set theory, category theory): a tensor is the object with the “universal property” of a multilinear map. The tensor product of two [vector spaces](/nodes/bg%3Alinear%3Avector) $V, W$ can be defined as

$$V \\otimes W = \\{f: V^* \\times W^* \\to \\mathbb{R} \\mid f \\text{ is linear in both arguments}\\},$$

where $v \\otimes w(\\varphi, \\psi) = \\varphi(v) \\cdot \\psi(w)$; this one-to-one correspondence between bilinear and linear functions is the characteristic property of the tensor product. The tensor product of homomorphisms $(f \\otimes g)(a \\otimes b) = f(a) \\otimes g(b)$ is constructed by guaranteeing that “$(a,b) \\mapsto f(a) \\otimes g(b)$ is bilinear”; it satisfies the unit law $\\mathrm{id}_A \\otimes \\mathrm{id}_B = \\mathrm{id}_{A \\otimes B}$. Obtaining $A \\otimes B$ from $A, B$ and $f \\otimes g$ from $f, g$ can be seen either as a binary operation or as a bifunctor (Jiang Boju, \`《同调论》\` (Homology Theory)).

### Higher-dimensional viewpoint

- **Tensor fields**: assigning a tensor of type $(k, l)$ to each point of a [manifold](/nodes/dg%3Amanifold) $M$ gives a tensor field of type $(k, l)$; if the output is a smooth function for every smooth dual vector field and smooth vector field fed in, it is called a [smooth tensor field](/nodes/dg%3Atensor).
- **The tensor algebra**: $\\otimes T_p M = \\sum_{r,s} \\otimes^{r,s} T_p M$ (a finite sum), together with addition, scalar multiplication and the tensor product, forms an algebra over $\\mathbb{R}$ called the tensor algebra.
- **Connections on tensor bundles**: requiring $\\nabla$ to commute with the tensor product, the exterior product and contraction extends a connection on the [tangent bundle](/nodes/dg%3Atangent-bundle) to tensor bundles of arbitrary type; a tensor field with vanishing covariant derivative is called a parallel tensor field, and under the Levi-Civita connection a [Riemannian metric](/nodes/manifold%3Achart-atlas) is always parallel.

### Understanding through similar objects

- **Symmetric and antisymmetric tensors**: a tensor of type $(0, 2)$ can be written as the sum of its symmetric and antisymmetric parts $T_{ab} = T_{(ab)} + T_{[ab]}$, where $T_{(ab)} := \\frac{1}{2}(T_{ab} + T_{ba})$ and $T_{[ab]} := \\frac{1}{2}(T_{ab} - T_{ba})$; but for a tensor of type $(0, l)$ with $l > 2$ this decomposition fails, for example $T_{abc} \\neq T_{(abc)} + T_{[abc]}$, although $T_{abc} = T_{(abc)} \\Rightarrow T_{[abc]} = 0$.
- **Exterior forms**: the space of covariant tensors of rank $r$, $V_r^0 = \\mathcal{L}(V, \\cdots, V; \\mathbb{R})$, is an $n^r$-dimensional [vector space](/nodes/bg%3Alinear%3Avector), and an antisymmetric covariant tensor is an exterior form — the viewpoint that the exterior algebra is a quotient structure of the tensor algebra connects with this.

## Proof

### Proof sketch

The proof of the core claim, “the component-based definition and the multilinear-function definition are equivalent”, can be summed up in one sentence: **the multilinear function built from components is independent of the basis, and taking components of a multilinear function automatically satisfies the transformation law.**

### Details

**Claim 1 (the two definitions are equivalent)**: given, for every basis, a family of numbers satisfying the transformation law (1.2.14), build $\\tau^{i_1 \\cdots i_r}_{j_1 \\cdots j_s} e_{i_1} \\otimes \\cdots \\otimes e^{j_s}$; then it is independent of the choice of basis and is a completely determined element of $V_s^r$. Conversely, the components $\\tau(e^{i_1}, \\cdots, e_{j_s})$ of any multilinear function $\\tau$ satisfy, under $\\tilde{e}_i = a_i^k e_k$,

$$\\tilde{\\tau}^{i_1 \\cdots i_r}_{j_1 \\cdots j_s} = \\tau(\\tilde{e}^{i_1}, \\cdots, \\tilde{e}^{i_r}, \\tilde{e}_{j_1}, \\cdots, \\tilde{e}_{j_s}) = b_{k_1}^{i_1} \\cdots b_{k_r}^{i_r} a_{j_1}^{l_1} \\cdots a_{j_s}^{l_s} \\tau^{k_1 \\cdots k_r}_{l_1 \\cdots l_s},$$

that is, the transformation law holds, so the two definitions give the same class of objects.

**Claim 2 (tensors of the same type form a linear space)**: at the same point, the set of tensors of one type forms a linear space. If $T = (T^{i_1 \\cdots i_p}_{j_1 \\cdots j_q})$ and $S = (S^{i_1 \\cdots i_p}_{j_1 \\cdots j_q})$ are both tensors of type $(p, q)$, then any linear combination $\\lambda T + \\mu S = U$ is again a tensor of type $(p, q)$, with components $U^{i_1 \\cdots i_p}_{j_1 \\cdots j_q} = \\lambda T^{i_1 \\cdots i_p}_{j_1 \\cdots j_q} + \\mu S^{i_1 \\cdots i_p}_{j_1 \\cdots j_q}$. The point is that a linear combination must be formed from the corresponding components **at the same point** — if tensors are regarded as families of functions defined at the various points of the space, tensors at different points cannot be added directly. $\\otimes^{0,1} T_p M = T_p^* M$, $\\otimes^{1,0} T_p M = T_p^{**} M = T_p M$ (no distinction is made between $T_p M$ and its second dual); for $(r, s) = (0, 0)$ the space is defined to be $\\mathbb{R}$.

**Claim 3 (contraction is well defined)**: a tensor $T$ of type (1, 1) can be regarded as a linear transformation from $V$ to $V$; the component matrices of the same $T$ in any two bases are similar matrices: $T'^\\mu_{\\nu} = (A^{-1})^\\mu_{\\rho} T^\\rho_{\\sigma} A^{\\sigma}_{\\nu}$, hence

$$T'^\\mu_{\\mu} = (A^{-1})^\\mu_{\\rho} T^\\rho_{\\sigma} A^{\\sigma}_{\\mu} = \\delta^{\\sigma}_{\\rho} T^\\rho_{\\sigma} = T^\\rho_{\\rho},$$

that is, the matrices in different bases have the same trace. The trace $T^\\mu_{\\mu}$ is a basis-independent property, called the contraction of $T$. In general, the contraction of a tensor of type $(r, s)$ over the first contravariant index and the first covariant index means setting these two indices equal and summing over the range of values, giving a tensor of type $(r-1, s-1)$ with components $(C(\\tau))^{i_1 \\cdots i_{r-1}}_{j_1 \\cdots j_{s-1}} = \\tau^{k i_1 \\cdots i_{r-1}}_{k j_1 \\cdots j_{s-1}}$.

**Claim 4 (properties of the tensor product and the tensor algebra)**: the tensor product

$$\\otimes : \\otimes^{r,s} T_p M \\times \\otimes^{t,h} T_p M \\to \\otimes^{r+t, s+h} T_p M, \\quad (\\theta, \\eta) \\mapsto \\theta \\otimes \\eta$$

is defined by $(\\theta \\otimes \\eta)(W_1, \\cdots, W_{r+t}; X_1, \\cdots, X_{s+h}) = \\theta(W_1, \\cdots, W_r; X_1, \\cdots, X_s) \\cdot \\eta(W_{r+1}, \\cdots; X_{s+1}, \\cdots)$, and satisfies: distributivity over addition, compatibility with scalar multiplication $(\\lambda\\theta) \\otimes \\eta = \\theta \\otimes (\\lambda\\eta) = \\lambda(\\theta \\otimes \\eta)$, associativity $(\\theta \\otimes \\xi) \\otimes \\eta = \\theta \\otimes (\\xi \\otimes \\eta)$, and $(\\otimes^{r,s} T_p M) \\otimes (\\otimes^{t,h} T_p M)$ is isomorphic to $\\otimes^{r+t, s+h} T_p M$. Note (as Needham stresses): in the tensor product of two 1-forms $(\\varphi \\otimes \\psi)(v, w) = \\varphi(v)\\psi(w)$ the order matters, $\\varphi \\otimes \\psi \\neq \\psi \\otimes \\varphi$; in tensor multiplication the ranks add, so a scalar can be regarded as a tensor of rank 0.

**Claim 5 (symmetric/antisymmetric decomposition, the case $l = 2$)**: let $T(u, v) = T_{ab} u^a v^b$ and $T(v, u) = T_{ab} v^a u^b = T_{ba} u^a v^b$; hence $T$ is symmetric if and only if $T_{ab} = T_{ba}$. If $T_{abc} = T_{(abc)}$, then every term in the expansion (there are $l!$ of them) equals $T_{abc}$; if $T_{abc} = T_{[abc]}$, then the even permutations give $T_{abc}$ and the odd permutations give $-T_{abc}$.

## Applications

### Direct applications

- **The metric tensor and Euclidean geometry**: in an $n$-dimensional Euclidean [vector space](/nodes/bg%3Alinear%3Avector) $(V, g)$, the same vector has both contravariant components $(u^1, \\cdots, u^n)$ (from $u = u^i e_i$) and covariant components $u_i = u \\cdot e_i$; the latter transform by the covariant rule of rank 1. From the discriminant of the quadratic polynomial in $\\lambda$ one gets $g^2(u, v) - g(u,u)g(v,v) \\le 0$, so one can define the length $|u| = \\sqrt{u \\cdot u}$ and the cosine of the angle $\\cos\\angle(u, v) = g(u,v)/(|u||v|)$. The metric is also the bridge for raising and lowering indices: lowering an index with the metric gives $g_{ca} T^a_{\\ b} = T_{cb}$.
- **The Riemann curvature tensor**: $R$ tells us the curvature of space itself. Contracting the original definition, “output vector $\\delta w$”, with a 1-form $\\varphi$ turns it into the standard tensor form $R(\\varphi \\| u, v, w) = \\varphi(\\delta w)$; its linearity in $w$ follows directly from $\\delta(k_1 w_1 + k_2 w_2) = k_1 \\delta w_1 + k_2 \\delta w_2$ and the linearity of the intrinsic derivative.

### Indirect applications

- **Coordinate invariance of tensor equations**: as long as both sides of a formula are tensors of the same type, holding in one coordinate system means holding in every coordinate system — this is the core of why tensors are “genuinely useful” in expressing physical laws.
- **Physics (general relativity)**: the energy–momentum tensor $\\mathbf{T}$, the Einstein tensor $\\mathbf{G}$ and the metric tensor $\\mathbf{g}$ are typical higher-rank tensors written in bold Roman letters; the Minkowski metric $\\eta_{ab}$ maps basis vectors to dual basis vectors: $\\eta_{ab}(\\partial/\\partial x^0)^b = -(dx^0)_a$, $\\eta_{ab}(\\partial/\\partial x^i)^b = (dx^i)_a$.
- **Symmetry and isotropy**: invariance under reflections and under swapping coordinates yields restrictions on isotropic tensors: the only isotropic second-rank tensor is a scalar matrix $(\\lambda \\delta^i_j)$; the only isotropic third-rank tensor is the zero tensor (Dubrovin–Fomenko–Novikov). The notion of isotropy involves the isometry group and therefore presupposes the existence of a (Riemannian) metric, but the notion of a tensor itself does not depend on a metric.
- **Homological algebra**: in the theory of homology groups with coefficients, the functorial properties of the tensor product (unit law, additivity) are basic tools.

## Generalisations

- **From a point to a field**: from a tensor at a point one generalises to a (smooth) tensor field on a [manifold](/nodes/dg%3Amanifold), and then to connections and covariant differentiation $\\nabla T$ on tensor bundles (a field tensor of type $(r, s+1)$), where $\\nabla$ commutes with $\\otimes$, $\\wedge$ and contraction.
- **From [vector spaces](/nodes/bg%3Alinear%3Avector) to general modules**: in homology theory the tensor product is defined for arbitrary Abelian groups (modules), and the tensor product of homomorphisms together with its functorial properties comes into play in homology groups with coefficients.
- **Generalisation of the notation**: abstract index notation treats upper and lower indices as markers of “slot type” rather than as component values; formally it looks very much like concrete index notation, which is a simple intuitive embodiment of “tensors from every angle”. Note that conventions for the notation of covariant/contravariant tensor spaces are not uniform across the literature (Lee reminds the reader to watch each author’s conventions).

## Common misconceptions

- **Misconception 1: a tensor is a family of numbers (a matrix/array)**. Cause: the component-based definition comes first in one’s mind. Beginners overlook the condition that “this family of numbers must transform according to a specific rule” — the same numbers giving different families in different bases do not constitute a tensor. The correct view is: a tensor is the coordinate-free multilinear function itself, and its components are only its “photograph” in some coordinate system.
- **Misconception 2: upper and lower indices differ only in notation, so $T^a_b$ is the same as $T_{ba}$**. Cause: overlooking that upper and lower indices hold two different kinds of input, dual vectors and vectors respectively. When no metric is used to raise or lower indices, upper and lower indices each keep their own order, but as soon as indices are raised or lowered one must be careful; only a symmetric tensor allows one to write $T_{ab} = T_{ba}$ (Liang Canbin stresses: writing equalities in abstract index notation requires more care than using it to represent a single tensor).
- **Misconception 3: any multilinear expression is a tensor**. This overlooks the condition that “the value depends only on the input values at the point of evaluation”: expressions involving derivatives (such as connection coefficients) are generally not tensors; the reason the Riemann curvature is a tensor is the “non-trivial” mechanism by which the four terms containing derivatives of $J$ cancel exactly.
- **Misconception 4: any tensor can be decomposed into a symmetric plus an antisymmetric part**. This holds only in the rank-2 case; for $l > 2$, $T_{abc} \\neq T_{(abc)} + T_{[abc]}$.
- **Misconception 5: the notion of a tensor depends on a metric**. The notion of isotropy needs a metric, but the notion of a tensor itself does not depend on a metric (Dubrovin–Fomenko–Novikov note this explicitly).

## Insights

- A physical requirement — “must hold in every coordinate system” — was eventually distilled into a purely algebraic, coordinate-free object. **First the transformation law, then the invariant object**: this order is worth remembering — invariance can “grow” out of cumbersome rules.
- The “machine with slots” metaphor makes one realise that mathematics can be viewed this way: the essence of an object lies in **what inputs it accepts and by what rule it outputs**, not in what it looks like in some coordinate system.
- The phenomenon that “an expression built from derivatives is nevertheless a tensor” in the Riemann curvature resonates with the reminder about “false miracles”: an apparently accidental cancellation usually has a structural reason behind it, and it deserves to be questioned rather than celebrated.

## Summary

### Idea

Unify “quantities independent of coordinates” as “multilinear functions”: the components change, the object does not; the transformation law is not a shackle imposed by the definition but the expression of invariance.

### Methods

- **Dual transformation**: unify contravariant and covariant through the dual viewpoint $V \\leftrightarrow V^*$ (used in the definition and in the lower-dimensional formulation).
- **Comparison**: translate the two definitions (component-based vs multilinear) into each other to prove equivalence (used in “Equivalent expressions”).
- **Basis-independence test**: verify the basis-independence of the trace through similar matrices (used for the well-definedness of contraction).
- **Counterexample construction**: for each condition, construct a counterexample that “collapses as soon as it is deleted” (used in the analysis of necessary conditions and in the common misconceptions).

## Review questions

- In the equivalence between the component transformation law and the multilinear-function definition, what role does the “inverse-matrix relation, $(b_l^j)$ is the inverse of $(a_l^j)$” play? If this relation did not hold, where would the equivalence break?
- Contraction is defined only for a pair of indices, one upper and one lower; why can one not contract two upper indices?
- How does the classification of isotropic tensors (scalar matrices, the zero tensor) generalise to arbitrary rank? Why does its proof depend on a metric in an essential way?
- In the language of category theory, what structure corresponds to “the tensor spaces form the tensor algebra”? And what kind of naturality condition is “a connection commuting with contraction”?

## References

1. \`陈维桓（Chen Weihuan）. 微分几何引论（Introduction to Differential Geometry）\`.
2. \`梅加强（Mei Jiaqiang）. 流形与几何初步（Manifolds and Introductory Geometry）\`.
3. \`梁灿彬、周彬（Liang Canbin, Zhou Bin）. 微分几何入门与广义相对论（An Introduction to Differential Geometry and General Relativity）\`.
4. B. A. Dubrovin, A. T. Fomenko, S. P. Novikov, *Modern Geometry — Methods and Applications, Part I: The Geometry of Surfaces, Transformation Groups, and Fields* (GTM 093).
5. \`特里斯坦·尼达姆（Tristan Needham）《可视化微分几何和形式：一部五幕数学正剧》（Visual Differential Geometry and Forms: A Mathematical Drama in Five Acts）\`.
6. Wolfgang Kühnel, *Differential Geometry: Curves — Surfaces — Manifolds* (Third Edition).
7. John M. Lee, *Introduction to Riemannian Manifolds* (Second Edition).
8. \`姜伯驹（Jiang Boju）. 同调论（Homology Theory）\`.`,

  'dg:tensor-product-dg': `## The tensor product (differential geometry)

> **(Universal property)** There exists a bilinear map $\\otimes: V \\times W \\to V \\otimes W$ such that for every bilinear map $\\phi: V \\times W \\to U$ there is a unique linear map $\\tilde{\\phi}: V \\otimes W \\to U$ satisfying $\\tilde{\\phi} \\circ \\otimes = \\phi$.

**Source tags.** #algebra #multilinear-algebra #tensor #definition

**Source.** The read-only snapshot \`G:/DifferentialGeometry/object/def/张量积.md\` (see \`data/dg/\`).

---

The tensor product is one of the most central constructions of multilinear algebra. It provides a systematic way of “multiplying” lower-rank [tensors](/nodes/dg%3Atensor) to obtain higher-rank [tensors](/nodes/dg%3Atensor), and it is at the same time a “universal converter” from bilinear maps to linear maps. The tensor product is not only the foundation of the theory of [tensor](/nodes/dg%3Atensor) fields in differential geometry; it also has fundamental applications in homological algebra, representation theory, quantum mechanics and general relativity.

---

### Prerequisites

#### Essential

- **[Vector spaces](/nodes/bg%3Alinear%3Avector) and dual spaces**: understanding the notion of a finite-dimensional [vector space](/nodes/bg%3Alinear%3Avector) $V$ and its dual space $V^*$, and the relation between a basis and the dual basis.
- **Multilinear maps**: an $r$-linear function $f: V \\times \\cdots \\times V \\to \\mathbb{R}$ is a function that is linear in each of its arguments.
- **Linear functionals and bilinear forms**: linear functions (1-forms) on $V$ and bilinear forms on $V \\times V$.

#### Auxiliary

- **Free Abelian groups and quotient constructions**: the tensor product can be constructed rigorously as a free Abelian group modulo the bilinear relations, which helps in understanding its universal property.
- **The Einstein summation convention**: in [tensor](/nodes/dg%3Atensor) computations a repeated index is summed over automatically, which greatly simplifies expressions.
- **Basic notions of category theory**: the tensor product can be seen as a bifunctor; understanding functoriality helps to grasp its cross-domain unity.

#### Further background

- **The [tensor](/nodes/dg%3Atensor) algebra**: the direct sum of all spaces of [tensors](/nodes/dg%3Atensor) of type $(r,s)$, $\\bigoplus_{r,s\\ge0} V_s^r$, together with the tensor product operation, forms a graded algebra called the [tensor](/nodes/dg%3Atensor) algebra.
- **The exterior algebra**: antisymmetrising covariant [tensors](/nodes/dg%3Atensor) and deriving the exterior product $\\wedge$ from the tensor product yields the exterior algebra (Grassmann algebra).
- **The Künneth formula**: in homological algebra, the homology groups of the tensor product of chain complexes are determined by the homology groups of the factors.

---

### Motivation

#### Introducing motivation

**The general need to pass from bilinear maps to linear maps.** In every branch of mathematics we frequently meet bilinear maps $\\phi: V \\times W \\to U$ — inner products, matrix multiplication, Lie brackets and so on. If one can find a “most general” [vector space](/nodes/bg%3Alinear%3Avector) $V \\otimes W$ such that every bilinear map $\\phi$ corresponds **uniquely** to a linear map $\\tilde{\\phi}: V \\otimes W \\to U$, then every question about bilinear maps can be turned into a question about linear maps. This need to “turn bilinearity into linearity” is the original driving force behind the notion of a tensor product.

**Internal line of thought**: in differential geometry we need to combine lower-rank [tensors](/nodes/dg%3Atensor) into higher-rank [tensors](/nodes/dg%3Atensor) in order to describe more complicated geometric structures (such as the curvature [tensor](/nodes/dg%3Atensor)). Without the tensor product there would be no systematic way of building spaces of [tensors](/nodes/dg%3Atensor) of type $(r,s)$.

**External application**: in general relativity the energy–momentum [tensor](/nodes/dg%3Atensor) $T$ is a [tensor](/nodes/dg%3Atensor) of type $(0,2)$ describing the distribution and motion of matter, and the Riemann curvature [tensor](/nodes/dg%3Atensor) $R$ is a [tensor](/nodes/dg%3Atensor) of type $(1,3)$ describing the curvature of spacetime. The construction of these [tensor](/nodes/dg%3Atensor) fields relies on the tensor product operation.

#### Motivation for the construction

Take [vector spaces](/nodes/bg%3Alinear%3Avector) $V$ and $W$ and consider the set of all bilinear functions from $V^* \\times W^*$ to $\\mathbb{R}$. If we write
$$
V \\otimes W = \\{ f: V^* \\times W^* \\to \\mathbb{R} \\mid f \\text{ is linear in both arguments} \\},
$$
and define the natural addition and scalar multiplication on it, then $V \\otimes W$ becomes a [vector space](/nodes/bg%3Alinear%3Avector), called the tensor product of $V$ and $W$. For $v \\in V$, $w \\in W$ we define the pure [tensor](/nodes/dg%3Atensor) (also called a decomposable [tensor](/nodes/dg%3Atensor)) $v \\otimes w$ by
$$
v \\otimes w(\\varphi, \\psi) = \\varphi(v) \\cdot \\psi(w), \\quad \\forall \\varphi \\in V^*, \\psi \\in W^*.
$$

Another equivalent construction (valid for Abelian groups) is: let $F(A \\times B)$ be the free Abelian group on the basis $A \\times B$ and let $R(A \\times B)$ be the subgroup generated by the bilinear relations
$$
(a_1 + a_2, b) - (a_1, b) - (a_2, b), \\quad (a, b_1 + b_2) - (a, b_1) - (a, b_2)
$$
then the tensor product is defined as the quotient group $A \\otimes B = F(A \\times B) / R(A \\times B)$, and the coset $(a,b)$ is written $a \\otimes b$.

Although the two constructions differ in form, the core idea is the same: **the tensor product is the universal object for bilinear maps**.

---

### Form

#### The canonical general form

There are several general ways of defining the tensor product, each with its own merits:

**Approach one: definition by multilinear functions (geometric style)**
Let $V$ be an $n$-dimensional [vector space](/nodes/bg%3Alinear%3Avector), let $f$ be an $r$-linear function and $g$ an $s$-linear function; then the tensor product $f \\otimes g$ of $f$ and $g$ is defined as the $r+s$-linear function
$$
(f \\otimes g)(u_1, \\dots, u_{r+s}) = f(u_1, \\dots, u_r) \\cdot g(u_{r+1}, \\dots, u_{r+s}).
$$

**Approach two: construction via dual spaces (algebraic style)**
$$
V \\otimes W = \\{ f: V^* \\times W^* \\to \\mathbb{R} \\mid f \\text{ bilinear} \\},
$$
where $v \\otimes w$ is defined by $v \\otimes w(\\varphi, \\psi) = \\varphi(v) \\psi(w)$.

**Approach three: free [vector space](/nodes/bg%3Alinear%3Avector) modulo relations (universal-property style)**
$$
V \\otimes W = F(V \\times W) / \\text{span}\\{ (v_1+v_2,w) - (v_1,w) - (v_2,w), (v,w_1+w_2) - (v,w_1) - (v,w_2) \\}
$$
This approach emphasises the universal property of the tensor product: for any bilinear map $\\phi: V \\times W \\to U$ there is a unique linear map $\\tilde{\\phi}: V \\otimes W \\to U$ such that $\\tilde{\\phi}(v \\otimes w) = \\phi(v,w)$.

**Approach four: the tensor product on [tensor](/nodes/dg%3Atensor) fields (differential-geometric style)**
On the tangent space $T_pM$ of a [manifold](/nodes/dg%3Amanifold) $M$, define the tensor product operation by
$$
\\otimes: \\otimes^{r,s} T_p M \\times \\otimes^{t,h} T_p M \\to \\otimes^{r+t,s+h} T_p M,
$$
so that for $\\theta \\in \\otimes^{r,s} T_p M$, $\\eta \\in \\otimes^{t,h} T_p M$ we have
$$
\\theta \\otimes \\eta(W_1,\\dots,W_{r+t}; X_1,\\dots,X_{s+h}) = \\theta(W_1,\\dots,W_r; X_1,\\dots,X_s) \\cdot \\eta(W_{r+1},\\dots,W_{r+t}; X_{s+1},\\dots,X_{s+h}).
$$

These four approaches have different viewpoints, but they are equivalent up to isomorphism.

#### Analysis of the necessary conditions

The central feature of the tensor product is captured by its **universal property**:


- If the requirement of “bilinearity” is dropped, the tensor product degenerates into the free [vector space](/nodes/bg%3Alinear%3Avector) on the ordinary Cartesian product, losing the key function of turning bilinearity into linearity.
- If the requirement of “uniqueness” is dropped, there may be several non-isomorphic candidates for the tensor product, and it loses its canonicity.

#### Equivalent expressions

1. **Component form**: let $\\{e_i\\}$ be a basis of $V$ and $\\{e^j\\}$ the dual basis; then a [tensor](/nodes/dg%3Atensor) $\\theta$ of type $(r,s)$ can be written as
   $$
   \\theta = \\theta_{j_1 \\dots j_s}^{i_1 \\dots i_r} \\, e_{i_1} \\otimes \\dots \\otimes e_{i_r} \\otimes e^{j_1} \\otimes \\dots \\otimes e^{j_s},
   $$
   with components $\\theta_{j_1 \\dots j_s}^{i_1 \\dots i_r} = \\theta(e^{i_1}, \\dots, e^{i_r}; e_{j_1}, \\dots, e_{j_s})$.

2. **Transformation rule**: under a change of basis the [tensor](/nodes/dg%3Atensor) components transform separately in their contravariant and covariant indices,
   $$
   \\tilde{\\theta}_{j_1 \\dots j_s}^{i_1 \\dots i_r} = d_{k_1}^{i_1} \\dots d_{k_r}^{i_r} \\cdot c_{j_1}^{l_1} \\dots c_{j_s}^{l_s} \\cdot \\theta_{l_1 \\dots l_s}^{k_1 \\dots k_r}.
   $$

3. **Universal-property diagram**: there is a commutative diagram
   \`\`\`
             V × W ──⊗──→ V ⊗ W
               \\         ╲
              ϕ \\         ╲ ∃!φ̃
                  \\         ↘
                    U
   \`\`\`

#### Kinds of form

The notion of a tensor product appears in parallel in different mathematical structures:

- **Tensor product of [vector spaces](/nodes/bg%3Alinear%3Avector)** $V \\otimes_{\\mathbb{R}} W$: the most common type; the subscript $\\otimes_{\\mathbb{R}}$ may be omitted.
- **Tensor product of Abelian groups** $A \\otimes_{\\mathbb{Z}} B$: with the ring of integers $\\mathbb{Z}$ as base ring.
- **Tensor product of modules** $M \\otimes_R N$: the tensor product of modules over a ring $R$.
- **Tensor product of chain complexes** $(C \\otimes D)_n = \\bigoplus_{p+q=n} C_p \\otimes D_q$, with differential $\\partial(c_p \\otimes d_q) = (\\partial_p c_p) \\otimes d_q + (-1)^p c_p \\otimes (\\partial_q d_q)$.
- **Tensor product of vector bundles** $E \\otimes F = \\bigcup_{p \\in M} E_p \\otimes F_p$, a vector bundle over a [manifold](/nodes/dg%3Amanifold) of rank $\\text{rank}(E) \\cdot \\text{rank}(F)$.
- **Tensor product of functors**: in topos theory there is also the notion of an internal tensor product.

#### Lower-dimensional formulation

At the level of set theory and category theory the tensor product can be understood as follows: it is the “correction” of the Cartesian product of sets in the bilinear category — the natural map on the Cartesian product $V \\times W$ is bilinear, and the tensor product “forces” the bilinear relations so that bilinear maps on $V \\times W$ correspond to linear maps on $V \\otimes W$. This is essentially a process of taking a **free construction** (a free [vector space](/nodes/bg%3Alinear%3Avector)) modulo **relations** (the bilinearity conditions).

In the language of category theory, fixing one argument, $- \\otimes G$ is a covariant functor: it sends an Abelian group $A$ to $A \\otimes G$ and a homomorphism $f: A \\to A'$ to $f \\otimes \\text{id}_G: A \\otimes G \\to A' \\otimes G$.

#### Higher-dimensional viewpoint

At higher levels of theory the tensor product is a special case of the tensor product operation in a **monoidal category**. The category of [vector spaces](/nodes/bg%3Alinear%3Avector) $(\\text{Vect}_\\mathbb{R}, \\otimes, \\mathbb{R})$ forms a symmetric monoidal category in which $\\otimes$ is the tensor product, the unit object is $\\mathbb{R}$, and there are associativity and commutativity constraints. The exterior product $\\wedge$ can be regarded as the structure derived from the tensor product after antisymmetrisation.

In homological algebra the tensor product functor $-\\otimes G$ is right exact, and its left derived functor $\\text{Tor}$ measures the extent to which the tensor product fails to preserve exactness.

---

### Properties and operational rules

The tensor product operation satisfies the following basic properties:

**Distributivity**
$$
(\\theta + \\xi) \\otimes \\eta = \\theta \\otimes \\eta + \\xi \\otimes \\eta, \\quad
\\theta \\otimes (\\xi + \\eta) = \\theta \\otimes \\xi + \\theta \\otimes \\eta.
$$

**Compatibility with scalar multiplication**
$$
(\\lambda \\theta) \\otimes \\eta = \\theta \\otimes (\\lambda \\eta) = \\lambda (\\theta \\otimes \\eta), \\quad \\forall \\lambda \\in \\mathbb{R}.
$$

**Associativity**
$$
(\\theta \\otimes \\xi) \\otimes \\eta = \\theta \\otimes (\\xi \\otimes \\eta).
$$

**Bases and dimension**: if $\\{v^i\\}$, $\\{w^j\\}$ are bases of $V$, $W$ respectively, then $\\{v^i \\otimes w^j\\}$ is a basis of $V \\otimes W$, and
$$
\\dim(V \\otimes W) = \\dim V \\cdot \\dim W.
$$

**Unit element (Abelian groups)**: there is a natural isomorphism $\\mathbb{Z} \\otimes A \\cong A \\cong A \\otimes \\mathbb{Z}$ such that $1 \\otimes a \\leftrightarrow a \\leftrightarrow a \\otimes 1$.

**Commutativity**:
- For [vector spaces](/nodes/bg%3Alinear%3Avector), $V \\otimes W \\cong W \\otimes V$ (a canonical isomorphism).
- For Abelian groups likewise $A \\otimes B \\cong B \\otimes A$, with $a \\otimes b \\leftrightarrow b \\otimes a$.
- But as concrete elements of a [tensor](/nodes/dg%3Atensor), **swapping the order of a tensor product generally changes the [tensor](/nodes/dg%3Atensor) itself**: swapping the order in the tensor product of two vectors (or of two dual vectors) generally gives another [tensor](/nodes/dg%3Atensor), that is, $v \\otimes u \\neq u \\otimes v$, $\\omega \\otimes \\mu \\neq \\mu \\otimes \\omega$. The dyadic $\\bar{v}\\bar{u}$ of Euclidean space is an example.
- In a special case, the tensor product of a vector and a dual vector satisfies $v \\otimes \\omega = \\omega \\otimes v$ (under the canonical identification $V \\cong V^{**}$).

**Direct-sum property**: there are natural isomorphisms
$$
\\left( \\bigoplus_i A_i \\right) \\otimes B \\cong \\bigoplus_i (A_i \\otimes B), \\quad
A \\otimes \\left( \\bigoplus_j B_j \\right) \\cong \\bigoplus_j (A \\otimes B_j).
$$

**Functoriality**: $\\text{id}_A \\otimes \\text{id}_B = \\text{id}_{A \\otimes B}$, and $(f \\otimes g) \\circ (f' \\otimes g') = (f \\circ f') \\otimes (g \\circ g')$.

---

### The tensor product and contraction

The role of the tensor product is to multiply lower-rank [tensors](/nodes/dg%3Atensor) into higher-rank [tensors](/nodes/dg%3Atensor); contraction, by contrast, turns a [tensor](/nodes/dg%3Atensor) of type $(r,s)$ into a [tensor](/nodes/dg%3Atensor) of type $(r-1,s-1)$.

Let $\\tau \\in V_s^r$ ($r,s \\ge 1$), take a basis $\\{e_i\\}$ and the dual basis $\\{e^j\\}$, and define the contraction
$$
\\sigma(\\alpha^1,\\dots,\\alpha^{r-1}, v_1,\\dots,v_{s-1}) = \\tau(e^i, \\alpha^1,\\dots,\\alpha^{r-1}, e_i, v_1,\\dots,v_{s-1}),
$$
the resulting $\\sigma$ is a [tensor](/nodes/dg%3Atensor) of type $(r-1,s-1)$ and is independent of the choice of basis.

Using the tensor product and contraction together, one can obtain new [tensors](/nodes/dg%3Atensor) of various types from given [tensors](/nodes/dg%3Atensor). For example, if $\\nu \\in V$ and $\\omega \\in V^*$, then $\\nu \\otimes \\omega$ is a [tensor](/nodes/dg%3Atensor) of type $(1,1)$ whose contraction $C(\\nu \\otimes \\omega)$ is a scalar:
$$
C(\\nu \\otimes \\omega) = \\omega_\\mu \\nu^\\mu = \\omega(\\nu) = \\nu(\\omega).
$$

---

### Applications

#### Direct applications

**Example 1: the expression for the metric [tensor](/nodes/dg%3Atensor)**
In general relativity the metric [tensor](/nodes/dg%3Atensor) $g$ can be written as
$$
g = g_{\\mu\\nu} \\, dx^\\mu \\otimes dx^\\nu,
$$
where $dx^\\mu$ is the coordinate dual basis and $g_{\\mu\\nu}$ are the metric components. This shows that the line element $ds^2$ is in fact shorthand for the metric [tensor](/nodes/dg%3Atensor) $g$ written in tensor-product notation.

**Example 2: dyadics**
The dyadic $\\bar{v}\\bar{u}$ of Euclidean vector field theory is in fact just the tensor product of the vectors $\\bar{v}$ and $\\bar{u}$, with the sign $\\otimes$ omitted.

**Example 3: the trace of a linear map**
Regard a linear map $\\tau: V \\to V$ as a [tensor](/nodes/dg%3Atensor) of type $(1,1)$; then
$$
\\tau = \\tau_i^j \\, e_j \\otimes e^i,
$$
whose components $\\tau_i^j$ are exactly the entries of the matrix of the map, and the contraction $\\tau_i^i$ is the trace of the matrix, independent of the choice of basis.

#### Indirect applications

- **The Künneth formula in homological algebra**: the homology groups $H_*(C \\otimes D)$ of the tensor product of free chain complexes are completely determined by $H_*(C)$ and $H_*(D)$; this is a basic tool for computing the homology of product spaces.
- **The energy–momentum [tensor](/nodes/dg%3Atensor) in general relativity**: the symmetric [tensor](/nodes/dg%3Atensor) $T$ of type $(0,2)$ describing the distribution of energy and matter is related to the Ricci [tensor](/nodes/dg%3Atensor) through the Einstein field equation $R_{\\mu\\nu} - \\frac{1}{2}R g_{\\mu\\nu} = 8\\pi T_{\\mu\\nu}$.
- **The Riemann curvature [tensor](/nodes/dg%3Atensor)**: as a [tensor](/nodes/dg%3Atensor) of type $(1,3)$, the Riemann curvature [tensor](/nodes/dg%3Atensor) $R$ depends at every turn on the tensor product structure for its definition and its operations.
- **The tensor product in quantum mechanics**: the state space of a many-particle system is the tensor product of the state spaces of the individual particles, and an entangled state is a non-decomposable [tensor](/nodes/dg%3Atensor) (that is, one that cannot be written in the form $v \\otimes w$ for a single pair).

---

### Generalisations

- **Tensor product of modules**: generalising the base field from the field $\\mathbb{R}$ to a ring $R$, one can define the tensor product of modules over a ring, $M \\otimes_R N$. When the ring is non-commutative the definition becomes more delicate, as one has to take left and right module structures into account.
- **Derived tensor product**: since the tensor product functor $-\\otimes G$ is right exact but not exact, its left derived functor $\\text{Tor}$ measures how it fails to preserve exactness, and it has a central place in homological algebra.
- **Internal tensor product**: in topos theory one can define an internal tensor product on a ringed topos, generalising the notion of a tensor product further.
- **Tensor product of chain complexes**: the tensor product of two chain complexes defines the boundary operator through the alternating sign $(-1)^p$, $\\partial(c_p \\otimes d_q) = (\\partial_p c_p) \\otimes d_q + (-1)^p c_p \\otimes (\\partial_q d_q)$, which guarantees that $\\partial^2 = 0$.
- **Tensor product of vector bundles**: gluing together the tensor products of the individual fibres gives a new vector bundle over the [manifold](/nodes/dg%3Amanifold).

---

### Common misconceptions

**Misconception 1: the tensor product is the Cartesian product.**
The dimension of the tensor product $V \\otimes W$ is $\\dim V \\cdot \\dim W$, whereas the dimension of the Cartesian product $V \\times W$ is $\\dim V + \\dim W$. The two are completely different constructions. The tensor product essentially linearises bilinear maps, whereas the Cartesian product merely places two spaces “side by side”.

**Misconception 2: $v \\otimes w = w \\otimes v$.**
In general this does not hold. For two vectors $v,u \\in V$, $v \\otimes u \\neq u \\otimes v$. Dyadics in Euclidean space do not satisfy commutativity either. But the tensor product of a vector and a dual vector $v \\otimes \\omega = \\omega \\otimes v$ (under the natural isomorphism $V \\cong V^{**}$) is a special case and should not be over-generalised.

**Misconception 3: every element of a tensor product has the form $v \\otimes w$.**
In fact a general element of $V \\otimes W$ is a finite sum of the form $\\sum a_i \\otimes b_i$, and its expression is usually not unique. Not every element can be written as a single pure [tensor](/nodes/dg%3Atensor) $v \\otimes w$ — this corresponds precisely to the distinction between separable and entangled states in quantum mechanics.

**Misconception 4: the tensor product is meaningful only for [vector spaces](/nodes/bg%3Alinear%3Avector).**
The notion of a tensor product has a counterpart for Abelian groups, modules, chain complexes, vector bundles, algebras and even categories; it is a universal mathematical construction.

**Misconception 5: in abstract index notation, $\\omega_a \\mu_b$ and $\\mu_b \\omega_a$ represent different [tensors](/nodes/dg%3Atensor).**
In abstract index notation $\\omega_a \\mu_b$ and $\\mu_b \\omega_a$ act on the same objects and are in fact the same [tensor](/nodes/dg%3Atensor). The non-commutativity of the order of a tensor product shows up in the positions of the indices: $\\omega_a \\mu_b \\neq \\omega_b \\mu_a$.

---

### Insights

- **“Turning multilinearity into linearity”** is an extremely powerful paradigm of thought in mathematics. The universal property of the tensor product tells us that **all questions about bilinear maps are essentially questions of linear algebra**, one just has to “tensor” the ground field first. A similar idea recurs in universal algebra: a free construction modulo relations.

- **The importance of notation**: the many ways of expressing the tensor product in different contexts (component notation, abstract index notation, index-free notation) each have their advantages and disadvantages. Studying the tensor product makes one appreciate deeply how much the choice of a good notation affects mathematical understanding.

- **There is more than one kind of “product”**: Cartesian product, tensor product, exterior product, symmetric product… all are called “products”, yet their structures are utterly different. When one meets a new “product”, the first question to ask is: what universal property does it satisfy? What kind of problem can it “linearise”?

---

### Summary

#### Idea

**“The tensor product is the linearisation of bilinear maps”** — through the tensor product, all bilinear problems can be turned into linear problems. More broadly, the tensor product provides a systematic algebraic framework for building higher-order objects out of lower-order ones.

#### Methods

| Technique | Where it appears in the note |
|------|----------------|
| Definition by multilinear functions | The canonical general form |
| Free construction modulo relations | Motivation for the construction / lower-dimensional formulation |
| Universal property | Equivalent formulations |
| Basis expansion and component computation | Equivalent expressions |
| Contraction | The tensor product and contraction |
| The Einstein summation convention | Used throughout the equivalent expressions |

---

### Review questions

- Why is the tensor product of a vector and a dual vector, $v \\otimes \\omega$, commutative, whereas the tensor product of two vectors is not? What is the essential reason behind this?
- What is the connection, and what is the difference, between the universal property of the tensor product and that of the Cartesian product (the product in the category of products)?
- What is the relation between the exterior product $\\wedge$ and the tensor product $\\otimes$? Why does the definition of the exterior product need the coefficient $\\frac{(r+s)!}{r!s!}$?
- In the tensor product of chain complexes, what is the geometric intuition behind the alternating sign $(-1)^p$?
- In quantum information theory, a non-decomposable [tensor](/nodes/dg%3Atensor) $\\sum_i \\alpha_i v_i \\otimes w_i$ (one that cannot be written as a single $v \\otimes w$) corresponds to an entangled state — what is the intrinsic connection between this and the mathematical structure of the tensor product?

---

### References

1. \`梅加强（Mei Jiaqiang）. 流形与几何初步（[Manifolds](/nodes/dg%3Amanifold) and Introductory Geometry）. （知识库来源 id: pdf_2）\`. (knowledge base source id: pdf_2)
2. \`陈维桓（Chen Weihuan）. 微分几何引论（Introduction to Differential Geometry）. 2013. （知识库来源 id: pdf_3）\`. (knowledge base source id: pdf_3)
3. \`姜伯驹（Jiang Boju）. 同调论（Homology Theory）. 2006. （知识库来源 id: pdf_4）\`. (knowledge base source id: pdf_4)
4. \`梁灿彬（Liang Canbin）, 周彬（Zhou Bin）. 微分几何入门与广义相对论（An Introduction to Differential Geometry and General Relativity）（全三册）（three volumes）. （知识库来源 id: pdf_5）\`. (knowledge base source id: pdf_5)
5. \`特里斯坦·尼达姆（Tristan Needham）. 可视化微分几何和形式：一部五幕数学正剧（Visual Differential Geometry and Forms: A Mathematical Drama in Five Acts）. 2024. （知识库来源 id: pdf_6）\`. (knowledge base source id: pdf_6)
6. \`陈维桓（Chen Weihuan）. 微分几何（Differential Geometry）. 2017. （知识库来源 id: pdf_7）\`. (knowledge base source id: pdf_7)
7. \`黎景辉（Li Jinghui）. Topos 理论（Topos Theory）（现代数学基础 97）（Modern Mathematics Foundations 97）. （知识库来源 id: pdf_8）\`. (knowledge base source id: pdf_8)`,

  'dg:differential-form': `## Differential forms

**Source tags.** #differential-geometry #differential-forms #exterior-algebra #definition

**Source.** The read-only snapshot \`G:/DifferentialGeometry/object/def/微分形式.md\` (see \`data/dg/\`).

---

Differential forms are a foundational and powerful tool in modern mathematics, created by Élie Cartan around 1900. They unify the gradient, the curl and the divergence of vector calculus into a single concise algebraic language, and they are an indispensable tool in differential geometry, algebraic topology and theoretical physics.

---

## Prerequisites

### Essential knowledge

- **Linear algebra**: dual spaces, [tensors](/nodes/dg%3Atensor), antisymmetric multilinear maps
- **Calculus**: differentiation of functions of several variables, multiple integrals, line and surface integrals
- **[Differentiable manifolds](/nodes/manifold%3Ack-atlas)**: [smooth manifolds](/nodes/dg%3Asmooth-manifold), tangent spaces, cotangent spaces, smooth maps

### Supporting knowledge

- **Exterior algebra** (Grassmann algebra): the basic operations of the antisymmetric tensor product
- **Vector bundles**: the cotangent bundle $T^*M$ and its exterior powers $\\bigwedge^p T^*M$

### Further knowledge

- **Homology and cohomology**: de Rham cohomology links differential forms to the topological structure of a [manifold](/nodes/dg%3Amanifold)
- **Lie groups and Lie algebras**: left-invariant differential forms and the Maurer–Cartan form
- **Theoretical physics**: connection forms and curvature forms in gauge field theory

---

## Motivation

### Motivation for introducing them

In classical vector calculus we have three different differential operators—the gradient (grad), the curl and the divergence (div)—and three integral theorems: Green's theorem, Stokes' theorem and Gauss' theorem. These theorems look different from one another, but essentially they are the same idea manifesting itself in different dimensions. Differential forms were introduced precisely in order to unify the three operators into one—the **exterior derivative** $d$—and to unify the three integral theorems into one—**Stokes' theorem**:

$$\\int_{\\partial \\Omega} \\omega = \\int_{\\Omega} d\\omega.$$

Seen from a higher vantage point, a differential form is the natural object on a [manifold](/nodes/dg%3Amanifold) **that can be integrated**: it depends neither on a metric, nor on a coordinate system, nor on a connection, but only on the differentiable structure of the [manifold](/nodes/dg%3Amanifold) itself.

### Motivation for the construction

Multiplication of exterior differential forms is not ordinary commutative multiplication but **anti-commutative**. Consider the differentials $du$ and $dv$ on the $(u,v)$-plane; their products satisfy

$$du \\wedge du = 0, \\quad dv \\wedge dv = 0, \\quad du \\wedge dv = -dv \\wedge du.$$

Here $\\wedge$ is called **exterior multiplication**. This rule comes from the properties of the determinant: swapping two coordinate differentials changes the sign.

Take a function of two variables as an example. For a smooth function $f(u,v)$ its total differential is

$$df = \\frac{\\partial f}{\\partial u} du + \\frac{\\partial f}{\\partial v} dv.$$

When we consider $d(df)$, the equality of the mixed partial derivatives together with the anti-commutation law gives $d^2=0$ naturally. This property—**the nilpotency of the exterior derivative**—is the cornerstone of the whole theory.

---

## Form

### The canonical general form

#### Definition of a differential form

Let $M$ be an $n$-dimensional [smooth manifold](/nodes/dg%3Asmooth-manifold). A **differential form of degree $p$** (a $p$-form for short) is a smooth section of the $p$-th exterior power $\\bigwedge^p T^*M$ of the cotangent bundle $T^*M$. The set of all $p$-forms is denoted $\\Omega^p(M)$.

In local coordinates $(x^1,\\dots,x^n)$, a $p$-form can be written as

$$\\omega = \\sum_{i_1 < \\cdots < i_p} \\omega_{i_1\\cdots i_p}(x)\\, dx^{i_1} \\wedge \\cdots \\wedge dx^{i_p},$$

where the coefficients $\\omega_{i_1\\cdots i_p}$ are smooth functions.

Concretely:

- A **0-form** is just a smooth function $f(x)$.
- A **1-form** is an expression of the form $\\omega = f_i(x)\\,dx^i$; it is a linear function of tangent vectors, that is, for every tangent vector $X$ we have $\\omega(X) \\in \\mathbb{R}$.
- A **2-form** is an expression of the form $\\omega = \\frac{1}{2}\\omega_{ij}\\,dx^i\\wedge dx^j$ (or equivalently $\\sum_{i<j}\\omega_{ij}\\,dx^i\\wedge dx^j$).

A $p$-form $\\omega$ is called an **antisymmetric covariant [tensor](/nodes/dg%3Atensor)**: for any tangent vectors $X_1,\\dots,X_p$ and any permutation $\\pi$,

$$\\omega(X_{\\pi(1)},\\dots,X_{\\pi(p)}) = (-1)^\\pi\\,\\omega(X_1,\\dots,X_p).$$

#### The exterior algebra structure

The direct sum of all differential forms

$$\\Omega^*(M) = \\bigoplus_{p=0}^n \\Omega^p(M)$$

forms a **graded anti-commutative algebra**: if $\\alpha \\in \\Omega^p(M)$ and $\\beta \\in \\Omega^q(M)$, then

$$\\alpha \\wedge \\beta = (-1)^{pq}\\,\\beta \\wedge \\alpha.$$

#### The exterior derivative operator

The exterior derivative $d$ is the linear operator $d: \\Omega^p(M) \\to \\Omega^{p+1}(M)$ defined by the following rules:

1. **On 0-forms (functions)**: $df = \\frac{\\partial f}{\\partial x^i}\\,dx^i$.
2. **On a general $p$-form**: if $\\omega = \\sum_{i_1<\\cdots<i_p} \\omega_{i_1\\cdots i_p}\\,dx^{i_1}\\wedge\\cdots\\wedge dx^{i_p}$, then

$$d\\omega = \\sum_{i_1<\\cdots<i_p} d\\omega_{i_1\\cdots i_p} \\wedge dx^{i_1}\\wedge\\cdots\\wedge dx^{i_p}.$$

The abstract definition of the exterior derivative (not depending on a coordinate system) is: for any [smooth vector fields](/nodes/dg%3Asmooth-vector-field) $X_1,\\dots,X_{p+1}$,

$$
\\begin{aligned}
d\\omega(X_1,\\dots,X_{p+1}) = &\\sum_{i=1}^{p+1} (-1)^{i-1}X_i\\,\\omega(X_1,\\dots,\\widehat{X_i},\\dots,X_{p+1}) \\\\
&+ \\sum_{i<j} (-1)^{i+j}\\,\\omega([X_i,X_j],X_1,\\dots,\\widehat{X_i},\\dots,\\widehat{X_j},\\dots,X_{p+1}).
\\end{aligned}
$$

#### Properties of the exterior derivative

The exterior derivative operator $d$ satisfies:

1. **Linearity**: $d(\\lambda\\omega + \\mu\\eta) = \\lambda d\\omega + \\mu d\\eta$, $\\forall \\lambda,\\mu\\in\\mathbb{R}$.
2. **The Leibniz rule**: $d(\\omega\\wedge\\eta) = d\\omega\\wedge\\eta + (-1)^p\\,\\omega\\wedge d\\eta$, where $\\omega$ is a $p$-form.
3. **Nilpotency**: $d^2 = 0$, that is, $d(d\\omega)=0$ holds for every $\\omega$.
4. **Commutation with the pullback**: let $f: M\\to N$ be a smooth map; then $d(f^*\\omega) = f^*(d\\omega)$.

#### The pullback map

Let $f: M\\to N$ be a smooth map. Then $f$ induces a map of differential forms in the reverse direction, $f^*: \\Omega^p(N) \\to \\Omega^p(M)$, defined by

$$(f^*\\omega)_p(X_1,\\dots,X_p) = \\omega_{f(p)}(f_*X_1,\\dots,f_*X_p).$$

#### Interior product and Lie derivative

**Interior product**: for a vector field $X$ and a $p$-form $\\omega$, define the $(p-1)$-form $i_X\\omega$ by

$$i_X\\omega(Y_1,\\dots,Y_{p-1}) = \\omega(X,Y_1,\\dots,Y_{p-1}).$$

The interior product satisfies $i_X\\circ i_X = 0$ and the anti-derivation property $i_X(\\omega\\wedge\\eta) = i_X\\omega\\wedge\\eta + (-1)^p\\,\\omega\\wedge i_X\\eta$.

**Lie derivative**: for a vector field $X$ and a $p$-form $\\omega$, the Lie derivative $L_X\\omega$ is defined by

$$L_X\\omega = \\frac{d}{dt}\\Big|_{t=0} (\\phi_t)^*\\omega,$$

where $\\{\\phi_t\\}$ is the one-parameter group of transformations generated by $X$. The Lie derivative, the interior product and the exterior derivative satisfy the celebrated **Cartan formula**:

$$L_X = i_X\\circ d + d\\circ i_X.$$

#### Closed forms and exact forms

- If $d\\omega = 0$, then $\\omega$ is called a **closed form**.
- If there exists $\\eta$ such that $\\omega = d\\eta$, then $\\omega$ is called an **exact form**.

From $d^2=0$ it follows that every exact form is closed. The converse does not necessarily hold, and this discrepancy is captured by the [de Rham cohomology](/nodes/dg%3Apoincare-lemma) groups.

#### [de Rham cohomology](/nodes/dg%3Apoincare-lemma)

Define the $p$-th [de Rham cohomology](/nodes/dg%3Apoincare-lemma) group of $M$ as

$$H_{dR}^p(M;\\mathbb{R}) = \\frac{\\{\\text{closed $p$-forms}\\}}{\\{\\text{exact $p$-forms}\\}} = \\frac{Z^p(M)}{B^p(M)}.$$

A smooth map $f: M\\to N$ induces, through the pullback, a homomorphism between the cohomology groups:

$$f^*: H_{dR}^p(N;\\mathbb{R}) \\to H_{dR}^p(M;\\mathbb{R}), \\quad f^*[\\omega] = [f^*\\omega].$$

If two smooth maps $f,g: M\\to N$ are homotopic, then they induce the same cohomology homomorphism.

#### The Poincaré lemma

**Poincaré lemma**: locally (that is, on $\\mathbb{R}^n$ or on a contractible [manifold](/nodes/dg%3Amanifold)), every closed form of degree $>0$ is exact. Concretely:

$$H_{dR}^p(\\mathbb{R}^n) = \\begin{cases} \\mathbb{R}, & p = 0,\\\\ 0, & p > 0. \\end{cases}$$

This conclusion shows that [de Rham cohomology](/nodes/dg%3Apoincare-lemma) reflects the **global topological properties** of a [manifold](/nodes/dg%3Amanifold), not its local properties.

#### Stokes' theorem

**Stokes' theorem** (Stokes' integral formula) is the generalisation of the fundamental theorem of calculus to [manifolds](/nodes/dg%3Amanifold). Let $M$ be an $n$-dimensional oriented [manifold](/nodes/dg%3Amanifold) with boundary, and let $\\omega$ be an $(n-1)$-form on $M$ with compact support. Then

$$\\int_M d\\omega = \\int_{\\partial M} \\omega,$$

where $\\partial M$ carries the induced orientation.

In particular, the classical Green formula, Stokes formula and Gauss formula are all special cases of this single unified formula.

### Classes of forms

Differential forms are classified by **degree**:

- **0-forms**: smooth functions. The exterior derivative gives the gradient.
- **1-forms**: cotangent vector fields, dual to tangent vectors. Locally written as $f_i\\,dx^i$.
- **2-forms**: can be viewed as antisymmetric $(0,2)$-[tensor](/nodes/dg%3Atensor) fields. Locally written as $\\sum_{i<j} f_{ij}\\,dx^i\\wedge dx^j$.
- **$k$-forms**: antisymmetric covariant [tensor](/nodes/dg%3Atensor) fields of degree $k$, identically zero when $k > n$.

On an $n$-dimensional [manifold](/nodes/dg%3Amanifold), the highest non-trivial form is the $n$-form.

### A lower-dimensional formulation

In more basic language, a differential form is a **smooth section of an exterior power of the cotangent bundle**. From the categorical point of view, $\\Omega^p(M)$ is a $C^\\infty(M)$-module over the sheaf of smooth functions on $M$.

The exterior derivative operator $d$ can be regarded as a **graded derivation** on $\\Omega^*(M)$ whose square is zero, which makes $(\\Omega^*(M), d)$ a **differential graded algebra** (differential graded algebra, DGA).

### A higher-dimensional viewpoint

- The fundamental theorem of calculus, Green's formula, Stokes' formula and Gauss' formula are all special cases of the **general Stokes' theorem** in dimensions 1, 2 and 3.
- In algebraic topology, [de Rham cohomology](/nodes/dg%3Apoincare-lemma) is isomorphic to singular cohomology with real coefficients through **de Rham's theorem**, building a bridge between the language of analysis and the language of topology.
- In gauge field theory, the **connection 1-form** and the **curvature 2-form** are the core applications of differential forms.

---

## Proof

### Nilpotency of the exterior derivative: $d^2=0$

Start from the local coordinate expression. Let $\\omega$ be an arbitrary $p$-form and first consider $\\omega = f\\,dx^{i_1}\\wedge\\cdots\\wedge dx^{i_p}$:

$$
\\begin{aligned}
d(d\\omega) &= d\\big(df\\wedge dx^{i_1}\\wedge\\cdots\\wedge dx^{i_p}\\big) \\\\
&= d\\left(\\frac{\\partial f}{\\partial x^i}dx^i\\right)\\wedge dx^{i_1}\\wedge\\cdots\\wedge dx^{i_p} \\\\
&= \\frac{\\partial^2 f}{\\partial x^i\\partial x^j}dx^j\\wedge dx^i\\wedge dx^{i_1}\\wedge\\cdots\\wedge dx^{i_p}.
\\end{aligned}
$$

Because $\\frac{\\partial^2 f}{\\partial x^i\\partial x^j}$ is symmetric in $i,j$ while $dx^j\\wedge dx^i$ is antisymmetric in $i,j$, the result of the sum is zero. By linearity, $d^2\\omega=0$ holds for every differential form.

### The relation between closed forms and exact forms

**Claim**: every exact form is closed, that is, $d(d\\eta)=0$.

**Claim** (Poincaré lemma): on a contractible [manifold](/nodes/dg%3Amanifold) (such as $\\mathbb{R}^n$), every closed form is exact.

The proof uses induction: for a closed $p$-form $\\omega$ on $\\mathbb{R}^n$, split it into a part containing $dx^n$ and a part not containing $dx^n$, and construct $\\eta$ by integration so that $d\\eta=\\omega$.

---

## Applications

### Direct applications

**Example 1** (gradient fields are conservative fields). In $\\mathbb{R}^3$, let $f$ be a smooth function. Then $df = \\frac{\\partial f}{\\partial x}dx + \\frac{\\partial f}{\\partial y}dy + \\frac{\\partial f}{\\partial z}dz$. The integral along a curve is independent of the path and depends only on the endpoints:

$$\\int_\\gamma df = f(\\gamma(b)) - f(\\gamma(a)).$$

This is a direct corollary of the fundamental theorem of calculus.

**Example 2** (Green's formula). In a plane region, for the 1-form $\\omega = Pdx + Qdy$,

$$d\\omega = \\left(\\frac{\\partial Q}{\\partial x} - \\frac{\\partial P}{\\partial y}\\right)dx\\wedge dy,$$

Stokes' theorem gives:

$$\\int_{\\partial D} Pdx + Qdy = \\iint_D \\left(\\frac{\\partial Q}{\\partial x} - \\frac{\\partial P}{\\partial y}\\right)dx\\,dy.$$

**Example 3** (orientability of the sphere). Consider $S^n\\subset\\mathbb{R}^{n+1}$ and the $n$-form on $\\mathbb{R}^{n+1}$

$$\\omega = \\sum_{i=1}^{n+1} (-1)^{i-1} x_i\\, dx^1\\wedge\\cdots\\wedge\\widehat{dx^i}\\wedge\\cdots\\wedge dx^{n+1},$$

whose pullback $i^*\\omega$ is an $n$-form on $S^n$ that is nowhere zero, so $S^n$ is orientable.

### Indirect applications

- **In differential geometry**: the curvature 2-form is used to compute the Riemann curvature [tensor](/nodes/dg%3Atensor), which gives a concise proof of the Gauss–Bonnet theorem.
- **In algebraic topology**: [de Rham cohomology](/nodes/dg%3Apoincare-lemma) is a powerful tool for studying the topological invariants of a [manifold](/nodes/dg%3Amanifold).
- **In theoretical physics**: Maxwell's equations can be written with differential forms in the concise form $dF=0$ and $d\\star F = J$; Einstein's equations in general relativity also make extensive use of differential forms.
- **In partial differential equations**: the Poincaré lemma for closed forms provides a theoretical guarantee for the existence of potential functions.

---

## Generalisations

- **Complex differential forms**: on a complex [manifold](/nodes/dg%3Amanifold), the exterior derivative can be decomposed into $(p,q)$-types, which leads to the theory of Dolbeault cohomology.
- **Vector-valued differential forms**: differential forms taking values in a vector bundle, which are crucial in gauge field theory.
- **Transgression**: after pulling a closed form back to a larger space it may become an exact form; this is the basis of Chern–Simons theory.
- **Stokes' theorem for [manifolds](/nodes/dg%3Amanifold) with boundary**: it can be generalised to integrals over singular chains, providing the foundation for de Rham's theorem.

---

## Common misconceptions

1. **Misconception**: a differential form is a product of “infinitesimals”.
   **Correction**: a differential form is an antisymmetric multilinear function of cotangent vectors; its rules of operation are defined rigorously by the exterior algebra, and it is not the naive product of infinitesimals.

2. **Misconception**: $dx^i$ is “an infinitesimal change of $x^i$”.
   **Correction**: $dx^i$ is a dual basis vector in the cotangent space; it maps the tangent vector $\\partial/\\partial x^j$ to $\\delta^i_j$.

3. **Misconception**: all closed forms are exact.
   **Correction**: this holds only locally (or on a contractible [manifold](/nodes/dg%3Amanifold)). Globally, $H_{dR}^p(M)$ may be non-trivial, which reflects the topological “holes” of the [manifold](/nodes/dg%3Amanifold). For example, the 1-form $\\frac{-y\\,dx + x\\,dy}{x^2+y^2}$ on $\\mathbb{R}^2\\setminus\\{0\\}$ is closed but not exact.

4. **Misconception**: $d^2=0$ is trivial.
   **Correction**: $d^2=0$ is the key property of the theory of the exterior derivative; it defines a cochain complex, and this is what makes it possible to define [de Rham cohomology](/nodes/dg%3Apoincare-lemma).

---

## Insights

- The anti-commutation law of the exterior derivative, $dx\\wedge dy = -dy\\wedge dx$, comes essentially from the concept of orientation: swapping two coordinates amounts to reversing the orientation.
- The idea of unification: one and the same operator $d$ unifies grad, curl and div, and one and the same integral theorem unifies the theorems of Green, Stokes and Gauss—an excellent example of the search for unity in mathematics.
- $d^2=0$ is dual to $\\partial^2=0$ for the boundary operator, a pattern that runs through the whole of algebraic topology.

---

## Summary

### The idea

Differential forms achieve “embedding analytic objects into an algebraic structure”, so that both integration and differentiation can be handled in a purely algebraic way; this strips away the interference of the metric and exposes the topological essence of the problem.

### Methods

| Method | Explanation |
|------|------|
| **Exterior algebra operations** | use the antisymmetry of $\\wedge$ to simplify computations |
| **The exterior derivative $d$** | a unified differential operator; $d^2=0$ provides a cochain complex |
| **The pullback $f^*$** | transport differential forms between different spaces |
| **Closed forms / exact forms** | describe the topology of a [manifold](/nodes/dg%3Amanifold) through [de Rham cohomology](/nodes/dg%3Apoincare-lemma) |
| **Stokes' theorem** | the duality between integration and differentiation |

---

## Looking back and asking

- Why is it that the difference between closed and exact forms captures precisely the topological structure of a [manifold](/nodes/dg%3Amanifold)? Is there a deeper category-theoretic explanation behind it?
- On a complex [manifold](/nodes/dg%3Amanifold), the exterior derivative decomposes into $\\partial$ and $\\bar\\partial$; how is the corresponding Dolbeault cohomology related to [de Rham cohomology](/nodes/dg%3Apoincare-lemma)?
- Can differential forms be generalised to the framework of non-commutative geometry?

---

## References

1. \`梅加强. 流形与几何初步\` (Mei Jiaqiang, *Manifolds and Introductory Geometry*). 2.5 Differential forms; 2.7 Stokes' integral formula; 4.1 The Poincaré lemma; 4.2 Computation of de Rham cohomology groups.
2. Shoshichi Kobayashi. *Differential Geometry of Curves and Surfaces*. 2.5 Exterior Differential Forms in Two Variables; 4.1 Integration of Exterior Differential Forms.
3. Wolfgang Kühnel. *Differential Geometry: Curves – Surfaces – Manifolds* (Third Edition). 4.33 Definition of Differential Forms; 4.36 Theorem of Stokes.
4. \`贝尔热, 戈斯丢. 微分几何：流形、曲线和曲面（第二版修订本）\` (Berger, Gostiaux, *Differential Geometry: Manifolds, Curves and Surfaces*, second revised edition). 0.3 Differential forms on open sets of a vector space.
5. \`特里斯坦·尼达姆. 可视化微分几何和形式：一部五幕数学正剧\` (Tristan Needham, *Visual Differential Geometry and Forms: A Mathematical Drama in Five Acts*). Chapter 32 The definition of 1-forms; Chapter 36 Differential calculus (the exterior derivative, closed forms and exact forms); Chapter 37 Integral calculus (Stokes' theorem).
6. William Fulton. *Algebraic Topology: A First Course* (GTM 153). Differential forms and path integrals.
7. \`陈维桓. 微分几何\` (Chen Weihuan, *Differential Geometry*). Chapter 7 Moving frames and the method of exterior differentiation (§7.1 Exterior forms, §7.2 Exterior differential forms and exterior differentiation).
8. \`梁灿彬, 周彬. 微分几何入门与广义相对论\` (Liang Canbin, Zhou Bin, *An Introduction to Differential Geometry and General Relativity*). Sections 2–3 Differential forms; Chapter 5 Differential forms and their integrals.
9. B. A. Dubrovin, A. T. Fomenko, S. P. Novikov. *Modern Geometry — Methods and Applications* (Part I, GTM 93). The definition of the exterior derivative.
10. B. A. Dubrovin, A. T. Fomenko, S. P. Novikov. *Modern Geometry — Methods and Applications* (Part III, GTM 124). The Poincaré lemma; de Rham cohomology.
11. Clifford Henry Taubes. *Differential Geometry: Bundles, Connections, Metrics and* (Oxford Graduate Texts). The Poincaré lemma; de Rham cohomology.
12. Victor W. Guillemin, Alan Pollack. *Differential Topology*. Stokes' theorem; the Poincaré lemma.
13. \`姜伯驹. 同调论\` (Jiang Boju, *Homology Theory*). de Rham's theorem.
14. \`陈维桓. 微分几何引论\` (Chen Weihuan, *An Introduction to Differential Geometry*). §4.2 Exterior differentiation of exterior differential forms; §4.4 Stokes' theorem.
15. \`Jean-Pierre Françoise, Gregory L. Naber 等. 数学物理学百科全书 11：代数拓扑；辛几何与拓扑\` (Jean-Pierre Françoise, Gregory L. Naber et al., *Encyclopedia of Mathematical Physics 11*: Algebraic Topology; Symplectic Geometry and Topology). The definition of differential forms on $\\mathbb{R}^n$.`,

  'dg:form-wedge-product': `## The exterior product of differential forms

**Source tags.** #differential-geometry #manifold #differential-form #exterior-product #exterior-algebra

**Source.** The read-only snapshot \`G:/DifferentialGeometry/object/def/微分形式的外积.md\` (see \`data/dg/\`).

---

The exterior product (or wedge product) is one of the most important algebraic operations between [differential forms](/nodes/dg%3Adifferential-form). It combines a [differential form](/nodes/dg%3Adifferential-form) of degree $p$ with a [differential form](/nodes/dg%3Adifferential-form) of degree $q$ into a [differential form](/nodes/dg%3Adifferential-form) of degree $p+q$, so that all [differential forms](/nodes/dg%3Adifferential-form) together form a graded algebra — the exterior algebra (Grassmann algebra). Together with the exterior derivative and the pullback map, the exterior product forms the core tool of calculus on [manifolds](/nodes/dg%3Amanifold) (also called “the exterior differential calculus”).

---

## Prerequisites

### Essential

- **Linear algebra**: dual spaces, tensor products, antisymmetrisation, determinants.
- **[Differentiable manifolds](/nodes/manifold%3Ack-atlas)**: tangent space, cotangent space, [smooth vector fields](/nodes/dg%3Asmooth-vector-field).
- **Covariant [tensor](/nodes/dg%3Atensor) fields**: the definition of a $(0,s)$-type [tensor](/nodes/dg%3Atensor) field and its expression in local coordinates.

### Supporting

- **Antisymmetric covariant [tensors](/nodes/dg%3Atensor)** (exterior forms): at each point $p\\in M$, an antisymmetric covariant [tensor](/nodes/dg%3Atensor) $\\omega$ of order $s$ satisfies, for every permutation $\\pi$,
  $$
  \\omega(X_{\\pi(1)},\\dots,X_{\\pi(s)}) = (-1)^\\pi\\,\\omega(X_1,\\dots,X_s).
  $$
  The set of all antisymmetric covariant [tensors](/nodes/dg%3Atensor) of order $s$ is written $\\bigwedge^s T_p^*M$.

- **The bundle of exterior forms**: $\\bigwedge^s T^*M = \\bigcup_{p\\in M}\\bigwedge^s T_p^*M$ is a vector bundle over $M$ (the bundle of exterior $s$-forms), and its smooth sections are called [differential forms](/nodes/dg%3Adifferential-form) of degree $s$, written $\\Omega^s(M)$.

### Further

- **The exterior algebra**: let $\\bigwedge T_p^*M = \\bigoplus_{k=0}^{n}\\bigwedge^k T_p^*M$ (where $n=\\dim M$); then $\\{1,\\, e^i,\\, e^i\\land e^j,\\, \\dots,\\, e^1\\land\\dots\\land e^n\\}$ is a basis of it, and $\\dim\\bigwedge T_p^*M = 2^n$. The exterior product $\\land$ makes $\\bigwedge T_p^*M$ into an algebra, called the **exterior algebra**.
- **[de Rham cohomology](/nodes/dg%3Apoincare-lemma)**: the exterior product induces a multiplication between [de Rham cohomology](/nodes/dg%3Apoincare-lemma) classes, making $H^*_{\\mathrm{dR}}(M)$ into a graded ring.

---

## Motivation

### Motivation for introducing it

In multivariable calculus we want a natural multiplication that handles the differentials $dx^i$, in such a way that:
- the “oriented” character of area is captured automatically — that is, swapping two differentials changes the sign;
- the change-of-variables formula for multiple integrals (the Jacobian determinant) appears naturally;
- higher-dimensional integral formulas such as Stokes’ theorem can be stated uniformly.

From the algebraic point of view, the $(0,s)$-type [tensor](/nodes/dg%3Atensor) space given by the tensor product $\\otimes$ is far too large, whereas what we really care about is the **antisymmetric** part — because only the antisymmetric part can be integrated over oriented regions. The exterior product is precisely the outcome of combining the tensor product with antisymmetrisation.

### Motivation for the construction

The idea behind the construction is very natural: first take the tensor product, then antisymmetrise the result, and finally rescale it suitably so that good properties such as associativity are preserved.

Historically, the two-dimensional case is the most intuitive. On the $(u,v)$-plane, the wedge product of the 1-[differential forms](/nodes/dg%3Adifferential-form) $\\alpha = a_1du + a_2dv$ and $\\beta = b_1du + b_2dv$ is
$$
\\alpha\\land\\beta = (a_1b_2 - a_2b_1)\\,du\\land dv,
$$
whose coefficient is exactly the determinant of the coefficient matrix. This corresponds precisely to computing the oriented area of a parallelogram. The higher-dimensional case is the natural generalisation of this idea.

---

## Form

### Canonical general form

#### Algebraic definition (pointwise)

Let $f\\in\\bigwedge^r V^*$ and $g\\in\\bigwedge^s V^*$ be exterior forms on the [vector space](/nodes/bg%3Alinear%3Avector) $V$. The **exterior product** of $f$ and $g$ is defined by
$$
f\\land g = \\frac{(r+s)!}{r!\\,s!}\\,A_{r+s}(f\\otimes g),
$$
where $A_{r+s}$ is the antisymmetrisation operator on $(r+s)$-linear functions:
$$
A_{r+s}(h)(u_1,\\dots,u_{r+s}) = \\frac{1}{(r+s)!}\\sum_{\\pi\\in S_{r+s}}(-1)^\\pi\\,h(u_{\\pi(1)},\\dots,u_{\\pi(r+s)}).
$$

$f\\land g$ is an exterior form of degree $r+s$, so $\\land$ is a map
$$
\\land:\\;\\bigwedge^r V^* \\times \\bigwedge^s V^* \\longrightarrow \\bigwedge^{r+s} V^*.
$$

#### Global definition for [differential forms](/nodes/dg%3Adifferential-form)

For [differential forms](/nodes/dg%3Adifferential-form) $\\alpha\\in\\Omega^r(M)$ and $\\beta\\in\\Omega^s(M)$ on a [manifold](/nodes/dg%3Amanifold) $M$, their **exterior product** $\\alpha\\land\\beta\\in\\Omega^{r+s}(M)$ is defined pointwise by
$$
(\\alpha\\land\\beta)|_p = \\alpha|_p \\land \\beta|_p,\\quad \\forall p\\in M.
$$

In the form that evaluates on tangent vectors, for any [smooth vector fields](/nodes/dg%3Asmooth-vector-field) $X_1,\\dots,X_{r+s}$ we have
$$
\\alpha\\land\\beta\\,(X_1,\\dots,X_{r+s}) = \\frac{1}{r!\\,s!}\\sum_{\\pi\\in S_{r+s}}(-1)^\\pi\\,\\alpha(X_{\\pi(1)},\\dots,X_{\\pi(r)})\\,\\beta(X_{\\pi(r+1)},\\dots,X_{\\pi(r+s)}).
$$

In particular, when $r=s=1$,
$$
\\alpha\\land\\beta\\,(X,Y) = \\alpha(X)\\beta(Y) - \\alpha(Y)\\beta(X),\\quad \\forall X,Y\\in T_pM.
$$

#### Expression in local coordinates

In a local coordinate system $(U,\\{x^i\\})$, a [differential form](/nodes/dg%3Adifferential-form) $\\omega$ of degree $p$ can be written uniquely as
$$
\\omega = \\sum_{i_1<\\dots<i_p} \\omega_{i_1\\dots i_p}\\, dx^{i_1}\\land\\dots\\land dx^{i_p},
$$
where the coefficient functions
$$
\\omega_{i_1\\dots i_p} = \\omega\\!\\left(\\frac{\\partial}{\\partial x^{i_1}},\\dots,\\frac{\\partial}{\\partial x^{i_p}}\\right)
$$
are antisymmetric in the indices.

In local coordinates the exterior product of two [differential forms](/nodes/dg%3Adifferential-form) $\\omega\\in\\Omega^r(M)$ and $\\eta\\in\\Omega^s(M)$ is computed directly from the distributive law and the basic relation $dx^i\\land dx^j = -dx^j\\land dx^i$.

#### A note on the two conventions

As for the constant factor in the definition of the exterior product, two conventions are in common use:
- the **determinant convention**: $f\\land g = \\frac{(r+s)!}{r!s!}A_{r+s}(f\\otimes g)$, as adopted in this note, which is the one used in most differential geometry textbooks.
- the **Alt convention**: $f\\land g = A_{r+s}(f\\otimes g)$, without the binomial factor.

Under both conventions the algebraic properties of the exterior product (distributivity, associativity, anticommutativity) agree, but the coefficient factors in the local coordinate expressions differ.

### Equivalent expressions

#### Via the generalized Kronecker symbol
$$
f\\land g\\,(u_1,\\dots,u_{r+s}) = \\frac{1}{r!\\,s!}\\,\\delta^{i_1\\dots i_{r+s}}_{1\\dots r+s}\\,
f(u_{i_1},\\dots,u_{i_r})\\,g(u_{i_{r+1}},\\dots,u_{i_{r+s}}).
$$

#### The exterior product of 1-forms is a determinant
Given $r$ 1-forms $\\xi^1,\\dots,\\xi^r\\in V^*$, for any $v_1,\\dots,v_r\\in V$,
$$
\\xi^1\\land\\dots\\land\\xi^r\\,(v_1,\\dots,v_r) = \\det\\bigl(\\xi^i(v_j)\\bigr).
$$
This is the most direct link between the exterior product and determinants.

### Kinds of forms

The exterior product of differential forms can be classified by the degrees of the forms involved:
- **The exterior product of a 0-form and a $p$-form**: $f\\land\\omega = f\\omega$ (that is, multiplication of functions), where $f$ is a 0-form.
- **The exterior product of two 1-forms**: gives a 2-form whose coefficient is a determinant.
- **The exterior product of a $p$-form and a $q$-form**: gives a $(p+q)$-form.

When $p+q > \\dim M$, we have $\\alpha\\land\\beta = 0$ (because there is no antisymmetric form of degree higher than $n$).

### Reduction

The exterior product is in essence an algebraisation of the “oriented volume element”. Consider an $n$-dimensional [vector space](/nodes/bg%3Alinear%3Avector) $V$: $\\xi^1\\land\\dots\\land\\xi^n(v_1,\\dots,v_n)$ is precisely the oriented volume of the parallel $n$-hedron. From this point of view, the exterior product is the operation that “generates” higher-dimensional oriented volume out of lower-dimensional oriented volume.

### Lifting

The exterior product makes $\\bigwedge T_p^*M = \\bigoplus_{k=0}^n\\bigwedge^k T_p^*M$ into a **graded algebra** (a $\\mathbb{Z}_2$-graded commutative algebra), whose graded commutativity is expressed by
$$
\\alpha\\land\\beta = (-1)^{\\deg\\alpha\\,\\deg\\beta}\\,\\beta\\land\\alpha.
$$

In [de Rham cohomology](/nodes/dg%3Apoincare-lemma), the exterior product induces a multiplication between cohomology classes, making $H^*_{\\mathrm{dR}}(M)$ into a graded ring — an important bridge between algebraic topology and differential geometry.

---

## Proof

### The algebraic laws of the exterior product

Throughout, let $f\\in\\bigwedge^r V^*$, $g\\in\\bigwedge^s V^*$ and $h\\in\\bigwedge^t V^*$.

#### 1. Distributivity
$$
(f_1+f_2)\\land g = f_1\\land g + f_2\\land g,\\qquad
f\\land(g_1+g_2) = f\\land g_1 + f\\land g_2.
$$
This is an immediate consequence of the distributivity of the tensor product and the linearity of antisymmetrisation.

#### 2. Associativity
$$
(f\\land g)\\land h = f\\land(g\\land h).
$$
Proof: by the definition,
$$
\\begin{aligned}
(f\\land g)\\land h &= \\frac{(r+s+t)!}{(r+s)!\\,t!}\\,A_{r+s+t}\\bigl((f\\land g)\\otimes h\\bigr)\\\\
&= \\frac{(r+s+t)!}{(r+s)!\\,t!}\\,\\frac{(r+s)!}{r!\\,s!}\\,A_{r+s+t}\\bigl(A_{r+s}(f\\otimes g)\\otimes h\\bigr)\\\\
&= \\frac{(r+s+t)!}{r!\\,s!\\,t!}\\,A_{r+s+t}\\bigl(A_{r+s}(f\\otimes g)\\otimes h\\bigr).
\\end{aligned}
$$
Similarly,
$$
f\\land(g\\land h) = \\frac{(r+s+t)!}{r!\\,s!\\,t!}\\,A_{r+s+t}\\bigl(f\\otimes A_{s+t}(g\\otimes h)\\bigr).
$$
One verifies that both expressions equal $\\frac{(r+s+t)!}{r!\\,s!\\,t!}\\,A_{r+s+t}(f\\otimes g\\otimes h)$, so associativity holds.

#### 3. Anticommutativity (graded commutativity)
$$
f\\land g = (-1)^{rs}\\,g\\land f.
$$
Sketch of proof:
$$
\\begin{aligned}
f\\land g\\,(x_1,\\dots,x_{r+s})
&= \\frac{1}{r!\\,s!}\\sum_{\\pi\\in S_{r+s}}(-1)^\\pi\\,f(x_{\\pi(1)},\\dots,x_{\\pi(r)})\\,g(x_{\\pi(r+1)},\\dots,x_{\\pi(r+s)})\\\\
&= (-1)^{rs}\\,\\frac{1}{s!\\,r!}\\sum_{\\pi\\in S_{r+s}}(-1)^\\pi\\,g(x_{\\pi(1)},\\dots,x_{\\pi(s)})\\,f(x_{\\pi(s+1)},\\dots,x_{\\pi(s+r)})\\\\
&= (-1)^{rs}\\,g\\land f\\,(x_1,\\dots,x_{r+s}).
\\end{aligned}
$$

**Corollary**: for 1-forms $\\xi,\\eta$ we have $\\xi\\land\\eta = -\\eta\\land\\xi$, and in particular $\\xi\\land\\xi = 0$. For even-degree forms ($r$ even), anticommutativity degenerates into commutativity.

### Compatibility of the exterior product with pullback

Let $F:M\\to N$ be a smooth map, $\\omega\\in\\Omega^r(N)$ and $\\eta\\in\\Omega^s(N)$; then
$$
F^*(\\omega\\land\\eta) = F^*\\omega\\land F^*\\eta.
$$
Proof: take any $u_1,\\dots,u_{r+s}\\in T_pM$; then
$$
\\begin{aligned}
(F^*(\\omega\\land\\eta))(u_1,\\dots,u_{r+s})
&= (\\omega\\land\\eta)(F_*u_1,\\dots,F_*u_{r+s})\\\\
&= \\frac{1}{r!\\,s!}\\sum_{\\pi}(-1)^\\pi\\,\\omega(F_*u_{\\pi(1)},\\dots,F_*u_{\\pi(r)})\\,\\eta(F_*u_{\\pi(r+1)},\\dots,F_*u_{\\pi(r+s)})\\\\
&= \\frac{1}{r!\\,s!}\\sum_{\\pi}(-1)^\\pi\\,(F^*\\omega)(u_{\\pi(1)},\\dots,u_{\\pi(r)})\\,(F^*\\eta)(u_{\\pi(r+1)},\\dots,u_{\\pi(r+s)})\\\\
&= (F^*\\omega\\land F^*\\eta)(u_1,\\dots,u_{r+s}).
\\end{aligned}
$$

### The Leibniz rule for the exterior product and the exterior derivative

If $\\omega$ is a [differential form](/nodes/dg%3Adifferential-form) of degree $r$, then
$$
d(\\omega\\land\\eta) = d\\omega\\land\\eta + (-1)^r\\,\\omega\\land d\\eta.
$$
Idea of the proof: using the definition of the exterior derivative and the local expression of [differential forms](/nodes/dg%3Adifferential-form), one may write $\\omega = f\\omega_0$ and $\\eta = g\\eta_0$ with $d\\omega_0=0$ and $d\\eta_0=0$, and then compute directly.

---

## Applications

### Direct applications

#### Example 1: the exterior product of two 1-forms
On the $(u,v)$-plane, let
$$
\\alpha = a_1\\,du + a_2\\,dv,\\quad \\beta = b_1\\,du + b_2\\,dv,
$$
then
$$
\\alpha\\land\\beta = (a_1b_2 - a_2b_1)\\,du\\land dv.
$$
The coefficient is exactly the determinant of $\\begin{pmatrix}a_1&a_2\\\\ b_1&b_2\\end{pmatrix}$.

#### Example 2: simplifying an exterior product
Simplify $(3x+4y-5z)\\land(2x-3y+z)$ (where $x,y,z$ are 1-forms):
$$
\\begin{aligned}
&= -9\\,x\\land y + 3\\,x\\land z + 8\\,y\\land x + 4\\,y\\land z - 10\\,z\\land x + 15\\,z\\land y\\\\
&= -17\\,x\\land y - 11\\,y\\land z - 13\\,z\\land x.
\\end{aligned}
$$

#### Example 3: deciding linear independence
$\\xi^1,\\dots,\\xi^r\\in V^*$ are linearly dependent if and only if $\\xi^1\\land\\dots\\land\\xi^r = 0$.
- If they are linearly dependent, we may assume $\\xi^1 = \\sum_{i=2}^r a_i\\xi^i$; after substitution every term of the expansion contains the same factor, so the result is 0.
- If they are linearly independent, they can be extended to a basis of $V^*$, and evaluation on the dual basis gives a non-zero determinant.

### Indirect applications

#### A uniform statement of Stokes’ theorem
The cooperation of the exterior product with the exterior derivative allows the higher-dimensional Stokes theorem to be stated uniformly as
$$
\\int_M d\\omega = \\int_{\\partial M}\\omega,
$$
where $M$ is an oriented [manifold](/nodes/dg%3Amanifold) with boundary and $\\omega$ is a [differential form](/nodes/dg%3Adifferential-form).

#### The [de Rham cohomology](/nodes/dg%3Apoincare-lemma) ring
Since $d(\\omega\\land\\eta) = d\\omega\\land\\eta + (-1)^{\\deg\\omega}\\omega\\land d\\eta$, the exterior product of two closed forms is again closed; and if one of them is exact, the exterior product is again exact. Hence the exterior product induces a well-defined multiplication on [de Rham cohomology](/nodes/dg%3Apoincare-lemma) classes, making
$$
H^*_{\\mathrm{dR}}(M) = \\bigoplus_{k=0}^n H^k_{\\mathrm{dR}}(M)
$$
into a graded ring (the cohomology ring). The de Rham theorem further shows that this ring is isomorphic to the topological cohomology ring $H^*(M;\\mathbb{R})$ — this is the main bridge between algebraic topology and differential geometry.

#### Vector analysis in $\\mathbb{R}^3$
In three-dimensional Euclidean space, via the dictionary of [differential forms](/nodes/dg%3Adifferential-form):
- 1-forms $\\leftrightarrow$ vector fields
- 2-forms $\\leftrightarrow$ vector fields
- the exterior derivative $d$ corresponds to $\\mathrm{grad},\\,\\mathrm{curl},\\,\\mathrm{div}$
- the exterior product $\\land$ corresponds to the cross product (the wedge product of two 1-forms corresponds to the “dual” of the cross product)

Maxwell’s equations can be written extremely concisely using [differential forms](/nodes/dg%3Adifferential-form) as
$$
dF = 0,\\quad d*F = J,
$$
where $F$ is the electromagnetic field strength 2-form.

#### The first fundamental form
In surface theory, the first fundamental form $I = dr\\cdot dr$ can be regarded as the inner product of the 1-[differential form](/nodes/dg%3Adifferential-form) $dr$ with itself, and it is invariant in form under a change of parameters.

---

## Generalizations

- **Vector-valued [differential forms](/nodes/dg%3Adifferential-form)**: the exterior product generalises to [differential forms](/nodes/dg%3Adifferential-form) taking values in a vector bundle, used together with the corresponding connection form.
- **Super[manifolds](/nodes/dg%3Amanifold) and graded geometry**: the exterior algebra is the prototype of a $\\mathbb{Z}_2$-graded commutative algebra and has important applications in supersymmetric physics.
- **Clifford algebras**: in a Clifford algebra the exterior product combines with the inner product into the Clifford product, the algebraic basis of the Dirac operator.
- **Kähler [manifolds](/nodes/dg%3Amanifold)**: on a complex [manifold](/nodes/dg%3Amanifold), the exterior product between [differential forms](/nodes/dg%3Adifferential-form) of $(p,q)$-type is compatible with the complex structure and leads to Dolbeault cohomology.

---

## Common misconceptions

- **“The exterior product is just a generalisation of the cross product”**: in $\\mathbb{R}^3$ the wedge product of two 1-forms is indeed closely related to the cross product, but the exterior product is the more general notion, applying to forms of any degree and [manifolds](/nodes/dg%3Amanifold) of any dimension, whereas the cross product exists only in $\\mathbb{R}^3$.
- **“The exterior product is commutative”**: beginners easily forget anticommutativity. The exterior product is **graded commutative**, that is, swapping two forms brings in a sign factor $(-1)^{(\\deg\\alpha)(\\deg\\beta)}$. Only when at least one of the two has even degree does the swap produce no minus sign.
- **“The definition of the exterior product is unique”**: in fact there are two definitions, the determinant convention and the Alt convention, differing by a binomial factor; but they give the same algebraic structure.

---

## Insights

- The construction of the exterior product is a typical representative of the general pattern “take the tensor product first, then antisymmetrise”. This idea of “enlarge first, then project” recurs throughout mathematics (symmetrisation, homogenisation and so on).
- The anticommutativity $du\\land dv = -dv\\land du$ captures the orientation of “oriented area” intrinsically — this is more intrinsic and more algebraic than prescribing the direction of the cross product by a “right-hand rule” in vector analysis.
- The exterior product makes the calculus of [differential forms](/nodes/dg%3Adifferential-form) completely algebraic, reducing the complicated coordinate transformations of multivariable calculus to concise algebraic rules.

---

## Summary

### Idea

**“Capture oriented volume algebraically”** — through antisymmetrisation the exterior product embeds determinant structure into the multiplication of [differential forms](/nodes/dg%3Adifferential-form), so that orientation and change of coordinates in integration theory are handled automatically.

### Methods

| Method | Use | Where it appears in the note |
|------|------|----------------|
| Antisymmetrisation | Constructing the exterior product from the tensor product | Form – definition |
| Expansion in local coordinates | Concrete computation of exterior products | Form – expression in local coordinates |
| The Leibniz rule | How the exterior product and the exterior derivative cooperate | Proof – exterior derivative and exterior product |
| Pullback preserves the exterior product | Transporting structure along maps | Proof – pullback and exterior product |

---

## Looking back and asking

- Why is the constant factor $\\frac{(r+s)!}{r!s!}$ in the definition of the exterior product necessary? What happens if it is dropped?
- To what further situations can the deep link between the exterior product and determinants be generalised?
- In [de Rham cohomology](/nodes/dg%3Apoincare-lemma), what is the relation between the ring structure induced by the exterior product and the cup product on the cohomology of a [topological space](/nodes/dg%3Atopological-space)?
- If the [manifold](/nodes/dg%3Amanifold) $M$ is oriented, how is the volume form related to the exterior product of top degree?

---

## References

1. \`梅加强（Mei Jiaqiang）. 流形与几何初步（Manifolds and Introductory Geometry）\`. (knowledge base doc_id: pdf_2)
2. \`陈维桓（Chen Weihuan）. 微分几何引论（Introduction to Differential Geometry）\`. (knowledge base doc_id: pdf_4)
3. \`陈维桓（Chen Weihuan）. 微分几何（Differential Geometry）\`. (knowledge base doc_id: pdf_10)
4. Kobayashi S. *Differential Geometry of Curves and Surfaces*. (knowledge base doc_id: pdf_5)
5. Dubrovin B. A., Fomenko A. T., Novikov S. P. *Modern Geometry — Methods and Applications, Part I: The Geometry of Surfaces, Transformation Groups, and Fields*. GTM 93, Springer. (knowledge base doc_id: pdf_3)
6. Lee J. M. *Introduction to Riemannian Manifolds*. 2nd ed. (knowledge base doc_id: pdf_6)
7. \`姜伯驹（Jiang Boju）. 同调论（Homology Theory）\`. (knowledge base doc_id: pdf_12)
8. Guillemin V., Pollack A. *Differential Topology*. AMS, 2014. (knowledge base doc_id: pdf_11)`,

  'dg:d-squared-zero': `## The square of the exterior derivative is zero

> **The square of the exterior derivative is zero**: for every [differential form](/nodes/dg%3Adifferential-form) $\\omega$ we have

**Source.** The read-only snapshot \`G:/DifferentialGeometry/object/def/外微分平方为零.md\` (see \`data/dg/\`).

---

## Introduction

That the square of the exterior derivative is zero, written $d^2 = 0$, is the deepest algebraic property of the exterior derivative $d$. It asserts that **for every [differential form](/nodes/dg%3Adifferential-form) $\\omega$, taking the exterior derivative twice in succession gives zero identically**:

$$
d(d\\omega) = 0.
$$

This property is the logical starting point of the theory of **[de Rham cohomology](/nodes/dg%3Apoincare-lemma)**, and it is the algebraic counterpart of Stokes’ theorem and of the geometric intuition that “the boundary of a boundary is zero”. In three-dimensional Euclidean space, $d^2 = 0$ expresses in one stroke two identities of vector calculus that look independent — $\\nabla \\times (\\nabla f) = 0$ (the curl of a gradient is zero) and $\\nabla \\cdot (\\nabla \\times \\mathbf{v}) = 0$ (the divergence of a curl is zero). Starting from the definitions, this note sets out a systematic account of the proof of $d^2 = 0$, its equivalent formulations, its geometric interpretation and its pivotal place in mathematics as a whole.

---

## Prerequisites

### Essential

The following is the “just enough” minimum for understanding this note.

- **[Smooth manifolds](/nodes/dg%3Asmooth-manifold)**: the notion of an $n$-dimensional [smooth manifold](/nodes/dg%3Asmooth-manifold) $M$, local coordinates $(x^1, \\dots, x^n)$, smooth functions $C^\\infty(M)$.
- **Tangent and cotangent spaces**: the tangent space $T_pM$ and cotangent space $T_p^*M$ at a point $p \\in M$, and $dx^i$ as the dual basis.
- **[Differential forms](/nodes/dg%3Adifferential-form)**: the expression of a [differential form](/nodes/dg%3Adifferential-form) $\\omega$ of degree $s$ in local coordinates
  $$
  \\omega = \\sum_{i_1 < \\cdots < i_s} \\omega_{i_1 \\cdots i_s}(x) \\, dx^{i_1} \\wedge \\cdots \\wedge dx^{i_s},
  $$
  where the $\\omega_{i_1 \\cdots i_s}$ are smooth functions.
- **The wedge product**: the antisymmetry of $\\wedge$: $dx^i \\wedge dx^j = -dx^j \\wedge dx^i$.

### Supporting

The following helps in understanding this note more thoroughly.

- **[Tensor](/nodes/dg%3Atensor) algebra**: covariant [tensors](/nodes/dg%3Atensor) and the operation of alternation; the viewpoint of [differential forms](/nodes/dg%3Adifferential-form) as antisymmetric covariant [tensor](/nodes/dg%3Atensor) fields.
- **The Lie bracket of vector fields**: $[X, Y] = XY - YX$, and its relation to the coordinate basis, $[\\partial_i, \\partial_j] = 0$.
- **Vector calculus**: the gradient, curl and divergence operations in three-dimensional Euclidean space and their mutual relations.
- **Stokes’ theorem** (a first acquaintance suffices): $\\int_D d\\omega = \\int_{\\partial D} \\omega$.

### Further

The following connects this note with the wider mathematical landscape.

- **Chain complexes and homological algebra**: $d^2 = 0$ makes $(\\Omega^*(M), d)$ into a **chain complex** (in fact a cochain complex), which is the general framework of cohomology theory.
- **Sheaves and cohomology**: the sheaf of [differential forms](/nodes/dg%3Adifferential-form), the de Rham complex, and resolutions by sheaves.
- **Hodge theory**: on a Riemannian [manifold](/nodes/dg%3Amanifold), the Hodge $\\star$ operator refines $d^2 = 0$ into properties of the Laplace operator $\\Delta = d\\delta + \\delta d$.
- **Supersymmetric quantum mechanics**: in physics, $d^2 = 0$ is the mathematical prototype of the fundamental relation $Q^2 = 0$ of a supersymmetry algebra.

---

## Motivation

This part aims to establish the “complete naturalness” of $d^2 = 0$ — to make the reader feel that its existence is not merely reasonable but inevitable.

### Motivation for introducing it

Where does $d^2 = 0$ actually come from? Why must there be an operator with this property? The following traces three separate routes.

#### A thread internal to the discipline

Once the theory of [differential forms](/nodes/dg%3Adifferential-form) has defined the wedge product, it naturally calls for a **differential operator** $d$ taking forms of degree $s$ to forms of degree $s+1$ and satisfying some Leibniz rule. But defining $d$ alone is not enough — if $d$ is not nilpotent ($d^2 = 0$), one cannot distinguish “closed” from “exact”, and hence cannot define cohomology. In other words, **when the theory developed to the point of needing $d^2 = 0$ in order to build the framework of cohomology, the property was already crying out to be stated**.

Concretely, in $\\mathbb{R}^n$ the classical Poincaré lemma says: if a [differential form](/nodes/dg%3Adifferential-form) is closed ($d\\omega = 0$), then it is locally exact ($\\omega = d\\eta$). The Poincaré lemma and $d^2 = 0$ are complementary: the former says that a closed form is always locally exact, the latter that an exact form is always closed. Only the two together make cohomology theory possible.

#### A thread from outside

In classical vector calculus there are two well-known identities:

$$
\\nabla \\times (\\nabla f) = 0, \\qquad \\nabla \\cdot (\\nabla \\times \\mathbf{v}) = 0.
$$

For a long time they were proved and used independently. The theory of the exterior derivative supplies a unified algebraic explanation: in three-dimensional Euclidean space, regard $f$ as a 0-form and $\\mathbf{v}$ as a 1-form; then $df$ corresponds to $\\nabla f$, taking $d$ of a 1-form corresponds to the curl, and taking $d$ of a 2-form corresponds to the divergence — so the two identities above are nothing but $d^2 = 0$ on forms of different degrees.

**The needs of physics** strengthened the status of this property further: the formulation of Maxwell’s equations in the language of [differential forms](/nodes/dg%3Adifferential-form), $\\,dF = 0$ (where $F$ is the electromagnetic field strength 2-form), can be set up consistently only on the premise of $d^2 = 0$.

#### An aesthetic and structural thread

From the purely aesthetic point of view, $d^2 = 0$ endows the exterior differential algebra with a kind of **perfect symmetry**. It forms a threefold echo with the antisymmetry of the wedge product and with “the boundary of a boundary is zero” in Stokes’ theorem:

$$
d^2 = 0 \\quad \\Longleftrightarrow \\quad \\partial^2 = 0 \\quad (\\text{Stokes' theorem}),
$$

and the two build a bridge between algebra and geometry. This symmetry convinced mathematicians that **the exterior derivative, defined in this way, was not “invented” but “discovered”** — it is the natural product of the inner logic of the theory of [differential forms](/nodes/dg%3Adifferential-form).

### Motivation for the construction

The form of $d^2 = 0$ did not appear out of nowhere; it has a natural “seed” and a process of evolution.

#### The seed: the exterior derivative of a function

The simplest [differential form](/nodes/dg%3Adifferential-form) is a 0-form — a smooth function $f$. In $\\mathbb{R}^n$ the exterior derivative of $f$ is

$$
df = \\frac{\\partial f}{\\partial x^i} dx^i.
$$

Taking the exterior derivative of $df$ again (formally) gives

$$
d(df) = \\frac{\\partial^2 f}{\\partial x^i \\partial x^j} dx^i \\wedge dx^j.
$$

In calculus, if $f$ is $C^2$ smooth then the second mixed partial derivatives do not depend on the order: $\\partial^2 f / \\partial x^i \\partial x^j = \\partial^2 f / \\partial x^j \\partial x^i$; while the wedge product $dx^i \\wedge dx^j$ is antisymmetric: $dx^i \\wedge dx^j = -dx^j \\wedge dx^i$. The complete contraction of a symmetric [tensor](/nodes/dg%3Atensor) with an antisymmetric [tensor](/nodes/dg%3Atensor) is necessarily zero, so $d(df) = 0$.

This is the original “seed” of $d^2 = 0$. Simple as the computation is, it points to the **essential mechanism** of $d^2 = 0$: the conflict between the symmetry of second derivatives and the antisymmetry of the wedge product.

#### From functions to general forms

Once $d^2 = 0$ is established for functions (0-forms), the Leibniz rule of the exterior derivative with respect to the wedge product ($d(\\omega \\wedge \\eta) = d\\omega \\wedge \\eta + (-1)^r \\omega \\wedge d\\eta$) extends the property naturally to [differential forms](/nodes/dg%3Adifferential-form) of arbitrary degree. This extension is not imposed by hand; it is determined by the definition of $d$ and by the algebraic structure.

---

## Form

### Canonical general form

The standard statement of $d^2 = 0$ is:

> $$
> d(d\\omega) = 0.
> $$

In the three common systems of formulation, $d^2 = 0$ takes different forms with the same core:

| System of formulation | The form of $d^2 = 0$ | Features |
|---------|----------------|------|
| Local coordinates | $d(d\\omega) = \\displaystyle\\sum_{i_1 < \\cdots < i_s} \\frac{\\partial^2 \\omega_{i_1 \\cdots i_s}}{\\partial x^i \\partial x^j} dx^i \\wedge dx^j \\wedge dx^{i_1} \\wedge \\cdots \\wedge dx^{i_s} = 0$ | depends explicitly on the symmetry of second partial derivatives |
| Invariant (global) | $d(d\\omega)(X_1, \\dots, X_{s+2}) = 0$ | independent of coordinates, revealing the geometric essence |
| Chain complex | $\\cdots \\xrightarrow{d} \\Omega^s(M) \\xrightarrow{d} \\Omega^{s+1}(M) \\xrightarrow{d} \\cdots$ with $d \\circ d = 0$ | highlights the algebraic structure; the starting point of cohomology theory |

### Analysis of the necessary conditions

The proof of $d^2 = 0$ rests on two key conditions. Deliberately remove either one and the conclusion collapses.

#### Condition 1: the $C^2$ smoothness of $\\omega_{i_1 \\cdots i_s}$ (second partial derivatives commute)

In the local-coordinate proof of $d(d\\omega) = 0$, the key point is
$$
\\frac{\\partial^2 \\omega_{i_1 \\cdots i_s}}{\\partial x^i \\partial x^j} = \\frac{\\partial^2 \\omega_{i_1 \\cdots i_s}}{\\partial x^j \\partial x^i},
$$
which requires the coefficient functions to be at least $C^2$ smooth.

**Counterexample**: if $f \\in C^1 \\setminus C^2$, it may happen that $\\frac{\\partial^2 f}{\\partial x \\partial y} \\neq \\frac{\\partial^2 f}{\\partial y \\partial x}$. For instance, on $\\mathbb{R}^2$ define
$$
f(x,y) = \\begin{cases}
\\frac{xy(x^2 - y^2)}{x^2 + y^2}, & (x,y) \\neq (0,0), \\\\
0, & (x,y) = (0,0).
\\end{cases}
$$
One checks easily that the first partial derivatives of $f$ exist and are continuous at $(0,0)$, but the mixed partial derivatives are not equal:
$$
\\frac{\\partial^2 f}{\\partial x \\partial y}(0,0) = 1, \\quad \\frac{\\partial^2 f}{\\partial y \\partial x}(0,0) = -1.
$$
Hence $d(df)$ is no longer zero at $(0,0)$, and $d^2 = 0$ fails.

#### Condition 2: the antisymmetry of the wedge product ($dx^i \\wedge dx^j = - dx^j \\wedge dx^i$)

In $d(df) = \\frac{\\partial^2 f}{\\partial x^i \\partial x^j} dx^i \\wedge dx^j$, the summation runs between **symmetric coefficients** and an **antisymmetric basis**. If the wedge product is replaced by the symmetric product $dx^i \\vee dx^j = dx^j \\vee dx^i$, then
$$
d(df) = \\frac{\\partial^2 f}{\\partial x^i \\partial x^j} dx^i \\vee dx^j \\neq 0 \\quad (\\text{ in general}),
$$
because the contraction of symmetric coefficients with a symmetric basis does not vanish automatically. For instance, take $f(x,y) = xy$ and use the symmetric product; then
$$
d(df) = \\frac{\\partial^2 (xy)}{\\partial x \\partial y} dx \\vee dy + \\frac{\\partial^2 (xy)}{\\partial y \\partial x} dy \\vee dx = 1 \\cdot dx \\vee dy + 1 \\cdot dy \\vee dx = 2 \\, dx \\vee dy \\neq 0.
$$

**Conclusion**: $d^2 = 0$ is not trivial; it depends fundamentally on two conditions holding at once — **the commutativity of second mixed partial derivatives of a smooth function** (an analytic condition) and **the antisymmetry of the wedge product** (an algebraic condition). Neither can be dispensed with.

### Equivalent expressions

$d^2 = 0$ has the following important equivalent formulations.

| Equivalent formulation | Concrete form | Comment |
|---------|---------|------|
| Stokes’ theorem form | $\\displaystyle \\int_D d(d\\omega) = \\int_{\\partial D} d\\omega = \\int_{\\partial(\\partial D)} \\omega = 0$ | obtained by applying Stokes’ theorem twice; equivalent to $\\partial^2 = 0$ |
| Vector calculus form | $\\nabla \\times (\\nabla f) = 0$, $\\nabla \\cdot (\\nabla \\times \\mathbf{v}) = 0$ | in $\\mathbb{R}^3$, via Hodge duality |
| Chain-complex condition | $\\text{im}(d: \\Omega^s \\to \\Omega^{s+1}) \\subseteq \\ker(d: \\Omega^{s+1} \\to \\Omega^{s+2})$ | that is, the composite of consecutive maps is zero |
| Definition of cohomology | $H^s_{\\text{dR}}(M) = \\ker(d|_{\\Omega^s}) / \\text{im}(d|_{\\Omega^{s-1}})$ | the quotient makes sense only on the premise $d^2 = 0$ |

### Kinds of property

In the classification of mathematics, $d^2 = 0$ belongs to:

- **A nilpotent property**: together with $d$ it forms a nilpotent operator, that is, $d$ has nilpotency index 2;
- **A consequence of the derivation property**: $d^2 = 0$ combined with the Leibniz rule for $d$ ($d(\\omega \\wedge \\eta) = d\\omega \\wedge \\eta + (-1)^r \\omega \\wedge d\\eta$) determines the entire structure of the exterior differential algebra;
- **The cocycle condition**: in the sense of homological algebra, $d^2 = 0$ is exactly the cocycle condition that a cochain map must satisfy.

### How are the relevant statements expressed in natural language?

Describing $d^2 = 0$ and its consequences in natural language:

- **The square of the exterior derivative is zero**: “taking the exterior derivative of a [differential form](/nodes/dg%3Adifferential-form) twice in succession always gives zero.”
- **The relation between closed and exact forms**: “an exact form is certainly closed, but a closed form need not be exact.”
- **The geometric version**: “the boundary of a boundary is zero.” — if you take the boundary of a region and then the boundary of that boundary, you get the empty set.
- **The vector-calculus version**: “the curl of a gradient is zero, and the divergence of a curl is zero.”
- **An everyday analogy**: “reading contour lines off a map (the gradient) and then tracing the circulation along those contours (the curl) produces no net circulation.”

### Reduction

Restating $d^2 = 0$ in more basic language.

#### Coordinate language (the language of calculus)

The essence of $d^2 = 0$ is:
$$
\\sum_{i,j} \\frac{\\partial^2 f}{\\partial x^i \\partial x^j} \\, dx^i \\wedge dx^j = 0,
$$
that is, the complete contraction of a **symmetric second-order [tensor](/nodes/dg%3Atensor)** (the matrix of mixed partial derivatives) with an **antisymmetric second-order [tensor](/nodes/dg%3Atensor)** (the wedge basis) is zero. This is a basic fact of linear algebra: the contraction of a symmetric bilinear form with an antisymmetric bilinear form is identically zero.

#### Set-theoretic language

Let $\\Omega^s(M)$ be the set of all [differential forms](/nodes/dg%3Adifferential-form) of degree $s$ on $M$. Then $d^2 = 0$ is equivalent to:
$$
\\forall \\omega \\in \\Omega^s(M),\\; d(d\\omega) = 0,
$$
or in other words, the sequence of maps $\\Omega^s(M) \\xrightarrow{d} \\Omega^{s+1}(M) \\xrightarrow{d} \\Omega^{s+2}(M)$ satisfies $\\text{im}(d|_{\\Omega^s}) \\subseteq \\ker(d|_{\\Omega^{s+1}})$.

#### Categorical language

On the category of [smooth manifolds](/nodes/dg%3Asmooth-manifold) $\\mathbf{Man}$, the exterior derivative $d$ is a natural transformation from the [differential form](/nodes/dg%3Adifferential-form) functor $\\Omega^s$ to $\\Omega^{s+1}$, satisfying $d \\circ d = 0$. Hence $(\\Omega^\\bullet, d)$ is a **cochain complex**:
$$
0 \\to \\Omega^0(M) \\xrightarrow{d} \\Omega^1(M) \\xrightarrow{d} \\Omega^2(M) \\xrightarrow{d} \\cdots \\xrightarrow{d} \\Omega^n(M) \\to 0.
$$

### Lifting

In higher-level theories, $d^2 = 0$ is a special case of the following more general structures:

- **Cohomology theory**: every cohomology theory is built on a differential (or coboundary) operator $d$ satisfying $d^2 = 0$. [De Rham cohomology](/nodes/dg%3Apoincare-lemma) is only one example; the analogous case is the boundary operator $\\partial$ of singular cohomology, which satisfies $\\partial^2 = 0$.
- **$A_\\infty$ algebras**: in the more general framework of homological algebra, $d^2 = 0$ is the most basic relation $m_1 \\circ m_1 = 0$ of an $A_\\infty$-algebra structure.
- **Supersymmetry algebras**: in supersymmetric quantum mechanics the supercharge operator $Q$ satisfies $Q^2 = 0$, which is precisely the physical counterpart of $d^2 = 0$.
- **Derived categories**: in the theory of derived categories, $d^2 = 0$ guarantees that one can take the “cohomology” of a differential object.

### Understanding through links

#### The link with $\\partial^2 = 0$

$d^2 = 0$ is inseparable from Stokes’ theorem. Stokes’ theorem says
$$
\\int_D d\\omega = \\int_{\\partial D} \\omega.
$$
Apply it twice:
$$
\\int_D d(d\\omega) = \\int_{\\partial D} d\\omega = \\int_{\\partial(\\partial D)} \\omega.
$$
Since $d(d\\omega) = 0$, we have $\\int_{\\partial(\\partial D)} \\omega = 0$ for every $\\omega$, hence $\\partial(\\partial D) = 0$. Conversely, if $\\partial^2 = 0$, then Stokes’ theorem gives $\\int_D d(d\\omega) = 0$ for every region $D$, hence $d(d\\omega) = 0$.

Thus $d^2 = 0$ and $\\partial^2 = 0$ are equivalent under the tie of Stokes’ theorem. This is a **deep duality between algebra and geometry**.

#### The link with vector calculus

Set up coordinates in $\\mathbb{R}^3$, let $f$ be a smooth function and $\\mathbf{v} = (P, Q, R)$ a vector field; then:

| [Differential form](/nodes/dg%3Adifferential-form) | Vector-calculus counterpart | Consequence of $d^2 = 0$ |
|---------|---------------|-----------------|
| 0-form $f$ | scalar field | $\\nabla \\times (\\nabla f) = 0$ |
| 1-form $\\omega = Pdx + Qdy + Rdz$ | vector field $\\mathbf{v}$ | $\\nabla \\cdot (\\nabla \\times \\mathbf{v}) = 0$ |

These two identities have to be proved separately in vector analysis, whereas in the framework of the exterior derivative they are simply two applications of the same $d^2 = 0$.

---

## Proof

### Proof sketch

From the global point of view, the proof of $d^2 = 0$ can be summed up in one sentence:

> **Because second mixed partial derivatives are symmetric while the wedge product is antisymmetric, the complete contraction of a symmetric object with an antisymmetric one must vanish, hence $d^2 = 0$.**

### Detailed proof

Two rigorous proofs in different styles are given below.

#### Proof 1: local coordinates

Let $\\omega$ be a [differential form](/nodes/dg%3Adifferential-form) of degree $s$, written in local coordinates $(U, x^1, \\dots, x^n)$ as
$$
\\omega = \\sum_{i_1 < \\cdots < i_s} \\omega_{i_1 \\cdots i_s} \\, dx^{i_1} \\wedge \\cdots \\wedge dx^{i_s}.
$$

Step one, take the exterior derivative:
$$
d\\omega = \\sum_{i_1 < \\cdots < i_s} \\sum_{i=1}^n \\frac{\\partial \\omega_{i_1 \\cdots i_s}}{\\partial x^i} \\, dx^i \\wedge dx^{i_1} \\wedge \\cdots \\wedge dx^{i_s}.
$$

Step two, take the exterior derivative again:
$$
\\begin{aligned}
d(d\\omega) &= \\sum_{i_1 < \\cdots < i_s} \\sum_{i=1}^n \\sum_{j=1}^n
\\frac{\\partial^2 \\omega_{i_1 \\cdots i_s}}{\\partial x^j \\partial x^i} \\,
dx^j \\wedge dx^i \\wedge dx^{i_1} \\wedge \\cdots \\wedge dx^{i_s} \\\\
&= \\sum_{i_1 < \\cdots < i_s} \\sum_{i,j}
\\frac{\\partial^2 \\omega_{i_1 \\cdots i_s}}{\\partial x^j \\partial x^i} \\,
dx^j \\wedge dx^i \\wedge dx^{i_1} \\wedge \\cdots \\wedge dx^{i_s}.
\\end{aligned}
$$

Since $dx^j \\wedge dx^i = - dx^i \\wedge dx^j$, interchanging $i, j$ gives
$$
d(d\\omega) = - \\sum_{i_1 < \\cdots < i_s} \\sum_{i,j}
\\frac{\\partial^2 \\omega_{i_1 \\cdots i_s}}{\\partial x^i \\partial x^j} \\,
dx^i \\wedge dx^j \\wedge dx^{i_1} \\wedge \\cdots \\wedge dx^{i_s}.
$$

On the other hand, if the labels $i, j$ are interchanged in step one first, the original expression is recovered. Hence the expression equals its own negative, and is therefore zero. More directly: the coefficients $\\frac{\\partial^2 \\omega_{i_1 \\cdots i_s}}{\\partial x^i \\partial x^j}$ are symmetric in $i, j$ (because $\\omega_{i_1 \\cdots i_s}$ is a smooth function), while $dx^i \\wedge dx^j$ is antisymmetric in $i, j$; the contraction of a symmetric with an antisymmetric object must vanish.

#### Proof 2: using the Leibniz rule and the case of functions

**Step 1**: prove that $d(df) = 0$ for every smooth function $f$ (as above: the contraction of symmetric coefficients with an antisymmetric basis).

**Step 2**: let $\\omega = f \\, dx^{i_1} \\wedge \\cdots \\wedge dx^{i_s}$. By the Leibniz rule:
$$
d\\omega = df \\wedge dx^{i_1} \\wedge \\cdots \\wedge dx^{i_s},
$$
because $d(dx^{i_k}) = 0$ (the derivative of a form with constant coefficients is zero). Hence
$$
\\begin{aligned}
d(d\\omega) &= d(df) \\wedge dx^{i_1} \\wedge \\cdots \\wedge dx^{i_s} - df \\wedge d(dx^{i_1} \\wedge \\cdots \\wedge dx^{i_s}) \\\\
&= 0 - 0 = 0.
\\end{aligned}
$$
Here $d(df) = 0$ (step 1), and $d(dx^{i_1} \\wedge \\cdots \\wedge dx^{i_s}) = 0$ because the coefficients of the $dx^{i_k}$ are constant.

**Step 3**: by linearity, an arbitrary [differential form](/nodes/dg%3Adifferential-form) $\\omega$ is a linear combination of the simple forms above, so $d(d\\omega) = 0$ for every $\\omega$.

---

## Applications

### Direct applications

#### Application 1: deciding whether a form is exact

From $d^2 = 0$ one immediately concludes: if $\\omega$ is exact (that is, $\\omega = d\\eta$), then it is certainly closed ($d\\omega = 0$). This gives a **necessary condition for testing whether a form is exact**.

**Worked example**: on $\\mathbb{R}^2 \\setminus \\{0\\}$, consider $\\omega = \\frac{-y}{x^2 + y^2} dx + \\frac{x}{x^2 + y^2} dy$. A direct computation gives $d\\omega = 0$, so $\\omega$ is closed. But is $\\omega$ exact? Since $\\int_{S^1} \\omega = 2\\pi \\neq 0$, Stokes’ theorem (if $\\omega = d\\eta$ then the integral around a closed loop is zero) shows that $\\omega$ is not exact. This shows that a closed form need not be exact, and is precisely the manifestation of the [de Rham cohomology](/nodes/dg%3Apoincare-lemma) $H^1_{\\text{dR}}(\\mathbb{R}^2 \\setminus \\{0\\}) \\neq 0$.

#### Application 2: defining [de Rham cohomology](/nodes/dg%3Apoincare-lemma)

$d^2 = 0$ makes the quotient
$$
H^s_{\\text{dR}}(M) = \\frac{\\ker(d: \\Omega^s(M) \\to \\Omega^{s+1}(M))}{\\text{im}(d: \\Omega^{s-1}(M) \\to \\Omega^s(M))}
$$
well defined. Without $d^2 = 0$, the inclusion $\\text{im}(d|_{\\Omega^{s-1}}) \\subseteq \\ker(d|_{\\Omega^s})$ would fail, the denominator would not be a subspace of the numerator, and cohomology could not be defined at all.

### Indirect applications

#### Applications in mathematics

- **Topology**: [de Rham cohomology](/nodes/dg%3Apoincare-lemma) is an important invariant of the topology of a [manifold](/nodes/dg%3Amanifold), and $d^2 = 0$ is the cornerstone of the whole theory. For example, [de Rham cohomology](/nodes/dg%3Apoincare-lemma) can distinguish spheres of different dimensions, or prove that $\\mathbb{R}^n$ and $\\mathbb{R}^m$ are not [homeomorphic](/nodes/dg%3Ahomeomorphism) when $n \\neq m$.
- **Differential geometry**: in the method of moving frames, the derivation of the structure equations relies on $d^2 = 0$. For instance, obtaining the second structure equation $\\Omega = d\\omega + \\omega \\wedge \\omega$ requires $d(d\\omega^i) = 0$.
- **Algebraic geometry**: on a complex [manifold](/nodes/dg%3Amanifold), Dolbeault cohomology is built on $\\bar\\partial^2 = 0$, the complex version of $d^2 = 0$.

#### Applications in physics

- **Electromagnetism**: in the language of [differential forms](/nodes/dg%3Adifferential-form), Maxwell’s equations simplify to $dF = 0$ (where $F$ is the electromagnetic field strength 2-form) and $d \\star F = J$. Here $dF = 0$ is an identity that holds automatically, because it is equivalent to $d(dA) = 0$, where $A$ is the electromagnetic potential 1-form. This shows the central role of $d^2 = 0$ in the geometric formulation of physical laws.
- **Gauge field theory**: in Yang–Mills theory the field strength $F = dA + A \\wedge A$ satisfies the Bianchi identity $d_AF = 0$, whose prototype is $d^2 = 0$.

---

## Generalizations

#### Relaxing the conditions

- **Weakening smoothness**: the rigorous proof of $d^2 = 0$ requires the coefficients to be at least $C^2$. Under $C^1$ or lower regularity the property may fail. In the framework of distribution theory (currents), however, $d^2 = 0$ still holds in a weak sense.
- **[Manifolds](/nodes/dg%3Amanifold) with boundary**: on a [manifold](/nodes/dg%3Amanifold) with boundary the definition of the exterior derivative is exactly the same as in the boundaryless case and $d^2 = 0$ still holds, but the form of Stokes’ theorem has to be adjusted.

#### Generalizing the conclusion

- **Other cohomology theories**: $d^2 = 0$ is the axiom of a general cochain complex. Besides [de Rham cohomology](/nodes/dg%3Apoincare-lemma), the boundary operator $\\partial$ of singular cohomology satisfies $\\partial^2 = 0$, and the coboundary operator $\\delta$ of Čech cohomology satisfies $\\delta^2 = 0$. These are generalisations of $d^2 = 0$ in different contexts.
- **The $\\bar\\partial$ operator**: on a complex [manifold](/nodes/dg%3Amanifold), the Dolbeault operator $\\bar\\partial$ satisfies $\\bar\\partial^2 = 0$, which defines Dolbeault cohomology.
- **Supersymmetric quantum mechanics**: in a supersymmetry algebra the supercharge operator $Q$ satisfies $Q^2 = 0$, a direct analogue in physics of $d^2 = 0$.

#### Related open problems

- **The Hodge conjecture**: on a compact Kähler [manifold](/nodes/dg%3Amanifold), which cohomology classes can be represented by the Poincaré duals of algebraic cycles? This is a celebrated open problem (one of the Millennium Problems), and its foundation is precisely the [de Rham cohomology](/nodes/dg%3Apoincare-lemma) defined by $d^2 = 0$.

---

## Common misconceptions

#### Misconception 1: “$d^2 = 0$ is trivial, because $d$ is a linear operator”

**Analysis**: $d^2 = 0$ is not determined by linearity. Linearity yields only $d(0) = 0$, not $d(d\\omega) = 0$. $d^2 = 0$ is a deep consequence of the definition of $d$ together with the symmetry of the mixed partial derivatives of a smooth function. Beginners often confuse “the square of a linear operator is zero” with the linear operator itself.

#### Misconception 2: “$d^2 = 0$ holds for every differential operator”

**Analysis**: $d^2 = 0$ is a distinctive property of the exterior derivative, not shared by all differential operators. For example, the usual vector differential operator $\\nabla$ (the gradient) satisfies $\\nabla \\times (\\nabla f) = 0$, but that is a special case of $d^2 = 0$ in $\\mathbb{R}^3$. If other differential operators are defined (such as the [covariant derivative](/nodes/tensor%3Afield) $\\nabla_X$), then $(\\nabla_X \\nabla_Y - \\nabla_Y \\nabla_X - \\nabla_{[X,Y]}) \\omega \\neq 0$ (this is exactly the definition of the curvature [tensor](/nodes/dg%3Atensor)).

#### Misconception 3: “$d^2 = 0$ means that the exterior derivative is invertible”

**Analysis**: $d^2 = 0$ shows on the contrary that $d$ is **not invertible** — if $d$ were invertible, $d^2 = 0$ would force $d = 0$. In fact $d$ has a non-trivial kernel (the closed forms) and image (the exact forms), and this is exactly what cohomology theory studies.

#### Misconception 4: “As soon as $d^2 = 0$, every closed form is exact”

**Analysis**: $d^2 = 0$ tells us only that **an exact form is certainly closed** ($\\text{im}\\,d \\subseteq \\ker d$); the converse fails. The quotient $\\ker d / \\text{im}\\,d$ is the [de Rham cohomology](/nodes/dg%3Apoincare-lemma) group, which is in general non-zero. Beginners often invert necessary and sufficient conditions.

#### Misconception 5: “In the local-coordinate proof, $d^2 = 0$ is just an index game”

**Analysis**: although the local-coordinate proof looks like a mere analysis of symmetry in the indices, its geometric content is deep. Through the link with Stokes’ theorem and $\\partial^2 = 0$, $d^2 = 0$ actually describes a topological property of geometric boundaries.

---

## Insights

#### A habit of thought: “symmetry meets antisymmetry and must vanish”

The proof of $d^2 = 0$ reveals a widely applicable methodology: **when a symmetric object is completely contracted with an antisymmetric object, the result must be zero**. This pattern of thought recurs throughout mathematics:
- the inner product of a symmetric matrix with an antisymmetric matrix is zero (in the sense of the Frobenius inner product);
- the contraction of a symmetric bilinear form with an antisymmetric bilinear form is zero;
- the antisymmetry of the Lie bracket $[X, Y] = -[Y, X]$ together with the symmetry of second [covariant derivatives](/nodes/tensor%3Afield) yields the Bianchi identity when the torsion vanishes.

#### The moment when “mathematics can be seen this way”

When one realises that $\\nabla \\times (\\nabla f) = 0$ and $\\nabla \\cdot (\\nabla \\times \\mathbf{v}) = 0$ — two formulae that have to be proved and memorised separately in vector calculus — are only two special cases in the framework of $d^2 = 0$, there is a shock of recognition: **behind phenomena that look different, one and the same mathematical structure is at work**. This experience of “reducing the complex to the simple” is exactly where the beauty of mathematics lies.

#### Resonance and conflict

**Resonance**: the duality between $d^2 = 0$ and $\\partial^2 = 0$ brings to mind Poincaré duality in algebraic topology — the boundary operator and the exterior derivative appear in pairs through Stokes’ theorem, like a “mirror symmetry” in the mathematical world.

**Conflict**: at first one easily doubts the importance of $d^2 = 0$ — how can an equation that merely says “equals zero” be the cornerstone of the whole theory of [de Rham cohomology](/nodes/dg%3Apoincare-lemma)? This tension between “simple” and “deep” is precisely what makes $d^2 = 0$ worth pondering.

---

## Summary

### Idea

> **The exterior derivative taken twice gives zero, and this stems from the fundamental conflict between the symmetry of second partial derivatives and the antisymmetry of the wedge product.**

The idea can be condensed into a single sentence: **the contraction of the symmetric with the antisymmetric must vanish.**

### Methods

| Method | Where it is used in this note |
|------|--------------|
| **Symmetry–antisymmetry analysis** | the core of the local-coordinate proof: symmetry of the coefficients × antisymmetry of the basis → zero |
| **The localisation method** | compute in local coordinates and then extend to the whole by linearity |
| **Deriving an invariant formula** | use the invariant definition of the exterior derivative (via vector fields) for a coordinate-free proof |
| **Reduction by the Leibniz rule** | reduce the proof of the general case to the case of functions |
| **Duality with Stokes’ theorem** | use Stokes’ theorem to match the algebraic conclusion $d^2 = 0$ with the geometric fact $\\partial^2 = 0$ |
| **Reduction/lifting viewpoints** | re-examine the same conclusion in coordinate language, categorical language and cohomological language |

---

## Looking back and asking

1. Why is $d^2 = 0$ necessary for defining [de Rham cohomology](/nodes/dg%3Apoincare-lemma)? If $d^2 \\neq 0$, what difficulties arise in the definition of the cohomology groups?
2. In $\\mathbb{R}^3$, $\\nabla \\times (\\nabla f) = 0$ and $\\nabla \\cdot (\\nabla \\times \\mathbf{v}) = 0$ are two independent identities. In the framework of the exterior derivative they are special cases of the same $d^2 = 0$. Can you write down the corresponding [differential forms](/nodes/dg%3Adifferential-form) and verify the correspondence?
3. Why is “the boundary of a boundary is zero” ($\\partial^2 = 0$) intuitively true? Try verifying it on a triangle and a tetrahedron.
4. If a new operator $D = d + \\delta$ is defined (where $\\delta$ is the codifferential), what is $D^2$? Is it still zero?
5. What is the relation between the contractibility of the [manifold](/nodes/dg%3Amanifold) (the hypothesis of the Poincaré lemma, for instance) and $d^2 = 0$? Does $d^2 = 0$ depend on the topology of the [manifold](/nodes/dg%3Amanifold)?
6. On a complex [manifold](/nodes/dg%3Amanifold), the operator $\\bar\\partial$ also satisfies $\\bar\\partial^2 = 0$. Can you explain, by analogy with the proof of $d^2 = 0$, the algebraic and analytic reasons why $\\bar\\partial^2 = 0$ holds?

---

## References

[1] \`梅加强（Mei Jiaqiang）. 流形与几何初步（Manifolds and Introductory Geometry）. 北京（Beijing）: 科学出版社（Science Press）, 2013. ISBN: 978-7-03-036031-1.\`

[2] \`特里斯坦·尼达姆 (Tristan Needham). 可视化微分几何和形式：一部五幕数学正剧（Visual Differential Geometry and Forms: A Mathematical Drama in Five Acts）. 刘伟安（Liu Weian）译. 北京（Beijing）: 人民邮电出版社（Posts & Telecom Press）, 2024. ISBN: 978-7-115-61107-9.\`

[3] \`陈维桓（Chen Weihuan）. 微分几何（Differential Geometry）(第 2 版 / 2nd ed.). 北京（Beijing）: 北京大学出版社（Peking University Press）, 2017. ISBN: 978-7-301-28654-8.\`

[4] Victor Guillemin, Alan Pollack. *Differential Topology*. Providence: AMS Chelsea Publishing / American Mathematical Society, 2014. ISBN: 978-0-8218-5193-7.

[5] Wolfgang Kühnel. *Differential Geometry: Curves - Surfaces - Manifolds* (3rd ed.). 2013.

[6] John M. Lee. *Introduction to Riemannian Manifolds* (2nd ed.). Graduate Texts in Mathematics 176. Cham: Springer, 2018. ISBN: 978-3-319-91754-2.`,

  'dg:form-pullback': `## The pullback of differential forms

**Source tags.** #differential-geometry #differential-forms #pullback #manifold #exterior-algebra

**Source.** The read-only snapshot \`G:/DifferentialGeometry/object/def/微分形式的拉回.md\` (see \`data/dg/\`).

---

In the study of [differentiable manifolds](/nodes/manifold%3Ack-atlas), the pullback map (pull-back) is the basic operation that “pulls back” a [differential form](/nodes/dg%3Adifferential-form) on the target [manifold](/nodes/dg%3Amanifold) to the source [manifold](/nodes/dg%3Amanifold). It sets up the covariant correspondence between a smooth map $f: M \\to N$ and the [differential forms](/nodes/dg%3Adifferential-form) on $N$; it is the elegant expression of the chain rule at the level of [differential forms](/nodes/dg%3Adifferential-form), and it is one of the cornerstones of every covariant construction in differential geometry.

---

### Prerequisites

#### Essential knowledge

- **[Differential forms](/nodes/dg%3Adifferential-form)**: a [differential form](/nodes/dg%3Adifferential-form) of degree $s$ on a [manifold](/nodes/dg%3Amanifold) $M$ is a smooth section of the cotangent bundle $\\bigwedge^s T^*M$, denoted $\\Omega^s(M)$.
- **The tangent map** (push-forward): the tangent map $f_{*p}: T_pM \\to T_{f(p)}N$ of a smooth map $f: M \\to N$ at a point $p$ pushes tangent vectors forward.
- **Exterior algebra**: $\\Lambda^r E^*$ is the space of antisymmetric covariant [tensors](/nodes/dg%3Atensor) of degree $r$ on a [vector space](/nodes/bg%3Alinear%3Avector) $E$, and the exterior product $\\wedge$ makes it into a graded algebra.

#### Supporting knowledge

- **Cotangent vector fields**: a [differential form](/nodes/dg%3Adifferential-form) of degree one, that is, a smooth section of the cotangent bundle $T^*M$.
- **The pullback of [tensor](/nodes/dg%3Atensor) fields**: the pullback map extends to covariant [tensor](/nodes/dg%3Atensor) fields of arbitrary order.
- **The exterior derivative operator $d$**: $\\Omega^r(M) \\to \\Omega^{r+1}(M)$, satisfying $d^2 = 0$.

#### Further knowledge

- **[de Rham cohomology](/nodes/dg%3Apoincare-lemma)**: the cohomology groups of closed forms modulo exact forms.
- **The Lie derivative**: a differential operator defined by differentiating the pullback map.
- **The pullback of vector bundles**: the pullback bundle $f^*E$ is the vector bundle whose fibre at $p$ equals $E_{f(p)}$.

---

### Motivation

#### Motivation for introducing it

**A line of thought internal to the discipline**: in calculus, the change-of-variables formula and the chain rule that we know well describe, in essence, the behaviour of functions and differentials under a change of variables. When we pass from Euclidean space to a [manifold](/nodes/dg%3Amanifold), we need a systematic way of describing “how objects are transferred between different spaces”. A smooth map $f: M \\to N$ sends points of $M$ into $N$, but cotangent vectors and [differential forms](/nodes/dg%3Adifferential-form) on $M$ “swim upstream” and are pulled back from $N$ to $M$—this is the pullback map.

**A line of thought from external applications**: in physics, the behaviour of the electromagnetic field [tensor](/nodes/dg%3Atensor) (a [differential form](/nodes/dg%3Adifferential-form) of degree 2) under a change of coordinates is described precisely by the pullback. In general relativity, the pullback of the metric [tensor](/nodes/dg%3Atensor) under a diffeo[homeomorphism](/nodes/dg%3Ahomeomorphism) is a basic tool for studying symmetries and conservation laws.

**An aesthetic and structural line of thought**: from the point of view of category theory, the pullback map $f^*$ is the action of the contravariant functor $\\Omega^s(\\cdot)$ on smooth maps, which makes $\\Omega^s$ a contravariant functor from the category of [manifolds](/nodes/dg%3Amanifold) to the category of [vector spaces](/nodes/bg%3Alinear%3Avector). This duality—the direction of a map between [manifolds](/nodes/dg%3Amanifold) is opposite to the direction in which [differential forms](/nodes/dg%3Adifferential-form) are pulled back—is a beautiful pattern that recurs throughout differential geometry.

#### Motivation for the construction

The natural way in which the pullback map arises can be understood along the following lines.

Step one (the linear algebra level): let $f: E \\to F$ be a linear map between [vector spaces](/nodes/bg%3Alinear%3Avector). For a dual vector $\\beta \\in F^*$ on $F$, “substitution” naturally produces a dual vector on $E$:
$$ f^*\\beta (u) = \\beta(f(u)), \\quad \\forall u \\in E. $$
This can be generalised to exterior forms of degree $r$: for $\\beta \\in \\Lambda^r F^*$, define
$$ f^*\\beta (u_1, \\dots, u_r) = \\beta(f(u_1), \\dots, f(u_r)). $$

Step two (the differential level): when $f: U \\subset E \\to V \\subset F$ is a differentiable map, at each point $x$ the derivative of $f$, namely $f'(x): E \\to F$, is a linear map. The linear construction above can therefore be carried out point by point:
$$ (f^*\\beta)(x) = (f'(x))^* (\\beta(f(x))). $$
This is the pullback of differential forms.

**The classical example** (from seed idea to canonical form): consider the [differential form](/nodes/dg%3Adifferential-form) of degree 1 on $\\mathbb{R}^2$ given by $\\omega = A(u,v)du + B(u,v)dv$ and the map $\\sigma: D \\to \\mathbb{R}^2$,
$$ u = \\varphi(s,t), \\quad v = \\psi(s,t). $$
Then $\\sigma^*\\omega$ is obtained by substituting $\\varphi,\\psi$ into the expression for $\\omega$:
$$ \\sigma^*\\omega = A(\\varphi(s,t),\\psi(s,t))\\left(\\frac{\\partial\\varphi}{\\partial s}ds + \\frac{\\partial\\varphi}{\\partial t}dt\\right) + B(\\varphi(s,t),\\psi(s,t))\\left(\\frac{\\partial\\psi}{\\partial s}ds + \\frac{\\partial\\psi}{\\partial t}dt\\right). $$
This is precisely the chain rule in its natural form.

---

### Form

#### The canonical general form

**Definition 1 (the algebraic pullback)**: let $f \\in L(E;F)$ be a linear map between [vector spaces](/nodes/bg%3Alinear%3Avector). Define $f^* \\in L(\\Lambda^r F^*, \\Lambda^r E^*)$ by
$$ f^*(\\beta)(u_1, \\dots, u_r) = \\beta(f(u_1), \\dots, f(u_r)), \\quad \\beta \\in \\Lambda^r F^*, \\; \\forall u_1, \\dots, u_r \\in E. $$

**Definition 2 (the pullback of differential forms)**: let $U$ and $V$ be open sets in the [vector spaces](/nodes/bg%3Alinear%3Avector) $E$ and $F$ respectively, let $f \\in C^p(U;V)$ (with $p \\ge 1$) and let $\\beta \\in \\underline{\\Omega}_{p-1}^r(V)$. Define $f^*\\beta$ by
$$ (f^*\\beta)(x) = (f'(x))^*(\\beta(f(x))), \\quad x \\in U. $$
Then $f^*\\beta$ is a [differential form](/nodes/dg%3Adifferential-form) of order $r$ and class $p-1$, and $f^*$ is a linear map from $\\underline{\\Omega}_{p-1}^r(V)$ to $\\underline{\\Omega}_{p-1}^r(U)$.

**Definition 3 (the pullback on a [manifold](/nodes/dg%3Amanifold))**: let $f: M \\to N$ be a smooth map and let $\\omega$ be a [differential form](/nodes/dg%3Adifferential-form) of degree $s$ on $N$. Define the [differential form](/nodes/dg%3Adifferential-form) $f^*\\omega$ of degree $s$ on $M$ by
$$ (f^*\\omega)(p)(X_1, \\dots, X_s) = \\omega(f(p))(f_{*p}X_1, \\dots, f_{*p}X_s), \\quad \\forall X_i \\in T_pM. $$

#### Analysis of the necessary conditions

The definition of the pullback map requires:

- **A smoothness condition**: the map $f$ must be at least of class $C^1$ (in practice $C^\\infty$ is usually required), otherwise $f'(x)$ is not defined.
- **Smoothness of the form**: $\\beta$ must be at least of class $C^{p-1}$, because the smoothness of $f^*\\beta$ comes from the smoothness of a composite function.
- **Independence of dimension**: the dimensions of $M$ and $N$ may be arbitrary—the pullback map is well defined both when $m \\ge n$ and when $m < n$.

#### Equivalent formulations

1. **Pointwise definition**: $(f^*\\omega)(p) = (f_{*p})^*(\\omega(f(p)))$, that is, at the point $p$ it is the $r$-th exterior power of the dual of the tangent map.
2. **Local coordinate form**: let $f: \\mathbb{R}^m \\to \\mathbb{R}^n$ with coordinates $(x_1,\\dots,x_m)$ and $(y_1,\\dots,y_n)$, and write $f = (f_1,\\dots,f_n)$; then
   $$ f^*(dy_k) = \\sum_{i=1}^m \\frac{\\partial f_k}{\\partial x_i} dx_i. $$
   For a general form of degree $r$, $\\omega = \\sum_{|I|=r} \\omega_I dy^{i_1} \\wedge \\dots \\wedge dy^{i_r}$,
   $$ f^*\\omega = \\sum_{|I|=r} (\\omega_I \\circ f) \\; df_{i_1} \\wedge \\dots \\wedge df_{i_r}. $$

#### Classes of forms

The pullback is not some special kind of [differential form](/nodes/dg%3Adifferential-form); it is an **operator** acting on [differential forms](/nodes/dg%3Adifferential-form). According to what is being pulled back, one can distinguish:

- **The pullback of a function** ($s=0$): $f^*g = g \\circ f$.
- **The pullback of a form of degree 1**: $f^*\\omega$ turns a cotangent vector field on $N$ into a cotangent vector field on $M$.
- **The pullback of higher-degree forms**: extended by means of the exterior product and linearity.

#### How are the relevant statements expressed in natural language?

- “A map sends points to the target, while the pullback sends the [differential forms](/nodes/dg%3Adifferential-form) on the target back to the source.”
- “The pullback is the ‘advanced version’ of the chain rule.”

#### A lower-dimensional formulation

At the level of set theory and linear algebra, the essence of the pullback map is “substitution”: given a map $f: A \\to B$, a function $\\varphi: B \\to \\mathbb{R}$ on $B$ becomes a function on $A$ through $\\varphi \\circ f$. For [differential forms](/nodes/dg%3Adifferential-form) (“fields” of antisymmetric multilinear maps), what is substituted is precisely the image of the tangent map.

From the point of view of category theory: $\\Omega^s$ is a contravariant functor from the category of [manifolds](/nodes/dg%3Amanifold) to the category of $\\mathbb{R}$-[vector spaces](/nodes/bg%3Alinear%3Avector), and a smooth map $f: M \\to N$ corresponds to $f^*: \\Omega^s(N) \\to \\Omega^s(M)$.

#### A higher-dimensional viewpoint

The pullback map is a basic building block of the **[de Rham cohomology](/nodes/dg%3Apoincare-lemma) theory**. Since the pullback commutes with the exterior derivative, it pulls closed forms back to closed forms and exact forms back to exact forms, and therefore induces a homomorphism between cohomology groups:
$$ f^*: H_{dR}^s(N; \\mathbb{R}) \\to H_{dR}^s(M; \\mathbb{R}). $$
This makes [de Rham cohomology](/nodes/dg%3Apoincare-lemma) a contravariant functor on the category of [manifolds](/nodes/dg%3Amanifold), and a powerful tool in algebraic topology for studying the homotopy classes of maps.

#### Related notions to be understood together

The pullback map is closely related to the following notions:

- **The Lie derivative**: $L_X(\\omega) = \\left.\\frac{d}{dt}\\right|_{t=0} (\\phi_t)^* \\omega$, where $\\phi_t$ is the flow generated by $X$. Differentiating the pullback gives the Lie derivative.
- **The push-forward**: for vector fields, the tangent map pushes a vector field on $M$ forward to a vector field on $N$; the pullback is its dual operation.
- **The interior product**: $i_X(\\omega)$, together with the pullback, yields Cartan's magic formula $L_X = d \\circ i_X + i_X \\circ d$.

---

### Proof

#### Proof sketch

The core of the proofs of the definition and the properties of the pullback is: combine the pointwise linear-algebra construction with the chain rule for the composition of smooth functions.

**Proposition 0.3.7 (existence)**: let $U \\subset E$, $V \\subset F$, $f \\in C^p(U;V)$ and $\\beta \\in \\underline{\\Omega}_{p-1}^r(V)$. Then $(f^*\\beta)(x) = (f'(x))^*(\\beta(f(x)))$ defines a [differential form](/nodes/dg%3Adifferential-form) of order $r$ and class $p-1$.

**Proof**: express $f^*\\beta$ as a composite map. The map
$$ L(E;F) \\ni f \\mapsto f^* \\in L(\\Lambda^r F^*; \\Lambda^r E^*) $$
is of class $C^\\infty$, because it is a polynomial map. Combining this with the smoothness of $\\beta \\circ f$ gives the conclusion.

**Another proof (the coordinate method)**: take a basis $\\{f_1,\\dots,f_m\\}$ of $F$; then on $V$,
$$ \\beta(y) = \\sum_{I} \\beta_I(y) f_I^*, \\quad \\beta_I \\in C^{p-1}(V). $$
Hence
$$ (f'(x))^*\\beta(f(x)) = \\sum_I (\\beta_I \\circ f)(x) (f'(x))^* f_I^*. $$
where $f_I^* = f_{i_1}^* \\wedge \\dots \\wedge f_{i_r}^*$. This gives the expression for $f^*\\beta$ explicitly.

**Proposition 2.5.8(4)—the pullback commutes with the exterior derivative**: let $f: M \\to N$ be smooth and let $\\omega$ be a [differential form](/nodes/dg%3Adifferential-form) on $N$; then
$$ d(f^*\\omega) = f^*(d\\omega). $$

**Proof**: first prove the case $\\omega = dg$ (with $g$ a smooth function on $N$). For a tangent vector $X$ on $M$,
$$ f^*(dg)(X) = dg(f_*X) = f_*X(g) = X(g \\circ f) = d(g \\circ f)(X). $$
Therefore $f^*(dg) = d(g \\circ f) = d(f^*g)$. For a general [differential form](/nodes/dg%3Adifferential-form), use the local representation of [differential forms](/nodes/dg%3Adifferential-form) together with linearity.

**Corollary 2.5.9—the induced cohomology homomorphism**: let $f: M \\to N$ be smooth; then the pullback map of $f$ induces a homomorphism between the [de Rham cohomology](/nodes/dg%3Apoincare-lemma) groups
$$ f^*: H_{dR}^s(N; \\mathbb{R}) \\to H_{dR}^s(M; \\mathbb{R}). $$

**Proof**: from $d(f^*\\omega) = f^*(d\\omega)$ it follows that $f$ pulls closed forms back to closed forms and exact forms back to exact forms. Defining $f^*[\\omega] = [f^*\\omega]$, the map $f^*$ is a well-defined group homomorphism.

---

### Applications

#### Direct applications

**Example 1 (the pullback of a metric)**: let $i: S^n \\hookrightarrow \\mathbb{R}^{n+1}$ be the inclusion map and let $g_0 = \\sum_{i=0}^n dx^i \\otimes dx^i$ be the standard metric on $\\mathbb{R}^{n+1}$. Then in suitable local coordinates, $i^*g_0$ is the standard [Riemannian metric](/nodes/manifold%3Achart-atlas) on the sphere.

**Example 2 (the third fundamental form)**: let $g: S \\to \\mathbb{S}^2$ be the Gauss map from a surface $S$ to the unit sphere and let $I_0$ be the first fundamental form on the unit sphere. Then the third fundamental form of $S$ is defined by
$$ III = g^* I_0. $$
This allows us to relate the curvature properties of the surface to the metric of the sphere through the Gauss map. Concretely, in a parametrisation along the principal directions of the surface, the three fundamental forms satisfy
$$ III - 2H\\;II + K\\;I = 0, $$
where $H$ and $K$ are the mean curvature and the Gauss curvature respectively.

**Example 3 (orientability of projective space)**: let $\\pi: S^n \\to \\mathbb{R}P^n$ be the quotient projection and let $\\rho: S^n \\to S^n$, $\\rho(x) = -x$, be the antipodal map; then $\\pi \\circ \\rho = \\pi$. Let $\\omega$ be the standard volume form of degree $n$ on $S^n$; then $\\rho^*\\omega = (-1)^{n+1}\\omega$. When $n$ is odd, $\\rho^*\\omega = \\omega$, so there exists $\\eta \\in \\Omega^n(\\mathbb{R}P^n)$ with $\\omega = \\pi^*\\eta$, and hence $\\mathbb{R}P^n$ is orientable. When $n$ is even, $\\mathbb{R}P^n$ is not orientable.

#### Indirect applications

**In mathematics**:
- **[de Rham cohomology](/nodes/dg%3Apoincare-lemma)**: the cohomology homomorphism induced by the pullback map is the basis for studying homotopy invariants of maps between [manifolds](/nodes/dg%3Amanifold). Homotopic maps induce the same cohomology homomorphism, which allows us to distinguish maps that are not homotopic by means of cohomology.
- **The transgression phenomenon**: a closed form becomes exact after being pulled back to the unit sphere bundle; this phenomenon plays a central role in the proof of the Gauss–Bonnet–Chern theorem.

**In physics**:
- The pullback of the electromagnetic field [tensor](/nodes/dg%3Atensor) $F = dA$ under a change of coordinates guarantees the covariance of Maxwell's equations.
- In general relativity, the pullback of the metric [tensor](/nodes/dg%3Atensor) under a diffeo[homeomorphism](/nodes/dg%3Ahomeomorphism) is used to express isometries and Killing vector fields.

---

### Generalisations

- **Relaxing the conditions**: the pullback does not require $f$ to be a submersion or an immersion; it can be defined as long as $f$ is smooth.
- **Generalising the conclusion**: the pullback can be defined on sections of a vector bundle (the pullback bundle) and on more general [tensor](/nodes/dg%3Atensor) fields.
- **A categorical generalisation**: in algebraic geometry the notion of a pullback generalises to morphisms between schemes and to inverse images of sheaves.

---

### Common misconceptions

1. **“The pullback and the push-forward go in the same direction”**: in fact the directions are opposite—$f: M \\to N$ pushes tangent vectors from $M$ to $N$ (push-forward) and pulls [differential forms](/nodes/dg%3Adifferential-form) back from $N$ to $M$ (pullback). This is precisely the manifestation of contravariance.
2. **“The pullback is just substitution”**: although from the pointwise point of view it really is “substitution”, the pullback also has to take into account the smoothness and the derivative of the map; it is not a simple composition.
3. **“It is obvious that the pullback commutes with the exterior derivative”**: this does not hold automatically and has to be verified. In fact it depends on the intrinsic definition of the exterior derivative operator and on the chain rule.

---

### Insights

- The core idea of the pullback map is “duality”: the behaviour of a map $f$ at the level of spaces (sending points from $M$ to $N$) and at the dual level (sending functions/forms back from $N$ to $M$) go in opposite directions. This dual point of view is ubiquitous in mathematics, from linear algebra all the way to category theory.
- The key property of the pullback—that it commutes with the exterior derivative—shows that the exterior derivative is a “natural operator”: it does not depend on the choice of coordinates and behaves well under maps. This “naturality” is a core aesthetic criterion of modern differential geometry.
- One habit of thought: once a structure has been defined on a space, ask how it behaves under maps (covariantly or contravariantly); this often reveals the deeper essence of the structure.

---

### Summary

#### The idea

**Pull a [differential form](/nodes/dg%3Adifferential-form) on the target space back along a map to the source space—the pullback of differential forms is the geometric incarnation of the chain rule and the concentrated expression of “duality” in differential geometry.**

#### Methods

| Technique | Where it is used |
|------|----------|
| Pointwise linearisation (the derivative $f'(x)$) | the passage from [vector spaces](/nodes/bg%3Alinear%3Avector) to [manifolds](/nodes/dg%3Amanifold) in the definition |
| Coordinate substitution (the chain rule) | the local coordinate expression and concrete computations |
| Explicit computation using a basis expansion | proving that $f^*\\beta$ is still a [differential form](/nodes/dg%3Adifferential-form) |
| Reducing to the case $dg$ and then generalising | proving that the pullback commutes with the exterior derivative |
| Using the pullback to lift closedness/exactness to cohomology | the construction of the [de Rham cohomology](/nodes/dg%3Apoincare-lemma) homomorphism |

---

### Looking back and asking

- Why is it so important that the pullback commutes with the exterior derivative? If $d(f^*\\omega) \\neq f^*(d\\omega)$, could [de Rham cohomology](/nodes/dg%3Apoincare-lemma) still be defined?
- Under what conditions is the pullback map surjective? Injective?
- For a homotopy equivalence between [manifolds](/nodes/dg%3Amanifold), the pullback induces an isomorphism at the level of cohomology—how can one construct a proof of this concretely using [differential forms](/nodes/dg%3Adifferential-form)?
- What exactly is the relation between the pullback bundle $f^*E$ and the pullback of differential forms $f^*\\omega$?

---

### References

1. \`贝尔热, 戈斯丢. 微分几何：\` [manifolds](/nodes/dg%3Amanifold)\`, 曲线和曲面（第二版修订本）[M]. 王耀东, 译. 法兰西数学精品译丛.\` (Berger, Gostiaux, *Differential Geometry: Manifolds, Curves and Surfaces*, second revised edition, translated by Wang Yaodong, French Mathematics Translation Series).
2. \`梅加强.\` [manifolds](/nodes/dg%3Amanifold)\`, 与几何初步 [M].\` (Mei Jiaqiang, *Manifolds and Introductory Geometry*).
3. Clifford Henry Taubes. Differential Geometry: Bundles, Connections, Metrics and Curvature[M]. Oxford Graduate Texts in Mathematics, 2011.
4. \`陈维桓. 微分几何 [M]. 2017.\` (Chen Weihuan, *Differential Geometry*, 2017).`,

  'dg:implicit-function-theorem': `## The implicit function theorem

> The implicit function theorem is the central theorem of mathematical analysis for the **existence, uniqueness and differentiability of an implicit function defined by one equation (or a system of equations)**. It answers a basic question: given an equation $F(x,y)=0$, under what conditions can $y$ be written locally as a function of $x$ (that is, $y=g(x)$), and is this $g$ smooth?

**Source.** The read-only snapshot \`G:/DifferentialGeometry/object/thm/隐函数定理.md\` (see \`data/dg/\`).

---

> **Tags**: #mathematical-analysis #differential-topology #implicit-function-theorem #inverse-function-theorem #regular-value

---

### Introduction

The implicit function theorem is the central theorem of mathematical analysis for the **existence, uniqueness and differentiability of an implicit function defined by one equation (or a system of equations)**. It answers a basic question: given an equation $F(x,y)=0$, under what conditions can $y$ be written locally as a function of $x$ (that is, $y=g(x)$), and is this $g$ smooth?

The theorem is the bridge by which differential calculus passes from explicit to implicit dependence, and it is the analytic foundation of such notions in differential geometry as **the theory of sub[manifolds](/nodes/dg%3Amanifold)**, **immersions and submersions**, and **regular values**; it also has wide applications in differential equations, optimisation theory, numerical analysis and even economics.

---

### Motivation

#### Motivation for introducing it

In coming to know nature, the functional relations we meet are often not given in the simple explicit form $y=f(x)$. For example:

- the circle defined by the plane curve $x^2+y^2=1$ cannot be written as a single explicit function $y$ of $x$ on the whole circle (one $x$ corresponds to two values of $y$);
- the implicit surface in three-dimensional space defined by $F(x,y,z)=0$;
- the equilibrium condition $f(p,q)=0$ in economics, from which $q$ cannot be solved explicitly;

In these situations **we still want to know whether, near some point, one variable can be regarded as a function of the others**, and whether that function is continuously differentiable. This is the question that the implicit function theorem answers.

Before the implicit function theorem appeared, implicit relations could only be handled case by case, with no unified criterion for local solvability. The implicit function theorem reduces the answer to a **linearisation condition** — the rank condition on the Jacobian matrix — thereby reducing a non-linear problem locally to a problem of linear algebra.

#### Motivation for the construction

The construction of the implicit function theorem is closely tied to the **[inverse function theorem](/nodes/dg%3Ainverse-function-theorem)** (Inverse Function Theorem); indeed the two are equivalent.

**From linear to non-linear**: consider a linear map $A: \\mathbb{R}^n \\to \\mathbb{R}^n$; the equation $Ax = y$ is solvable if and only if $A$ is invertible. For a non-linear map $f: \\mathbb{R}^n \\to \\mathbb{R}^n$, the [inverse function theorem](/nodes/dg%3Ainverse-function-theorem) tells us: if the Jacobian matrix of $f$ at $p$ is invertible, then $f$ is locally invertible near $p$.

The implicit function theorem can be seen as a generalisation of the [inverse function theorem](/nodes/dg%3Ainverse-function-theorem): consider $F: \\mathbb{R}^{m+n} \\to \\mathbb{R}^n$ and regard $F(x,y)=0$ as an equation in the variables $(x,y)$. If the matrix of partial derivatives of $F$ with respect to $y$ is invertible, we can define a new map — sending $(x,y)$ to $(x,F(x,y))$ — and then apply the [inverse function theorem](/nodes/dg%3Ainverse-function-theorem), thereby solving for $y$ as a function of $x$.

The cleverness of this construction lies in **turning an implicit problem into the invertibility problem of an explicit map**, for which a complete set of theoretical tools already exists.

---

### Form

#### Canonical general form

**Theorem (the implicit function theorem, classical version)**:

Let $F: \\mathbb{R}^{m+n} \\supset U \\to \\mathbb{R}^n$ be a $C^1$ map ($U$ an open set), and write a point of $\\mathbb{R}^{m+n}$ as $(x,y)$ with $x \\in \\mathbb{R}^m$ and $y \\in \\mathbb{R}^n$. Let $(x_0,y_0) \\in U$ satisfy $F(x_0,y_0)=0$, and suppose that the Jacobian matrix in the $y$ direction

$$
\\frac{\\partial F}{\\partial y}(x_0,y_0) \\in \\operatorname{GL}(n;\\mathbb{R})
$$

(that is, the $n \\times n$ matrix $\\left(\\frac{\\partial F_i}{\\partial y_j}\\right)$ is invertible).

Then there exist an open neighbourhood $V \\subset \\mathbb{R}^m$ of $x_0$, an open neighbourhood $W \\subset \\mathbb{R}^n$ of $y_0$, and a unique $C^1$ map $g: V \\to W$ such that

$$
F(x,g(x)) = 0, \\quad \\forall x \\in V,
$$

and $g(x_0) = y_0$. Moreover the derivative of $g$ is obtained from the chain rule:

$$
g'(x) = -\\left[\\frac{\\partial F}{\\partial y}(x,g(x))\\right]^{-1} \\frac{\\partial F}{\\partial x}(x,g(x)).
$$

---

**Theorem (the version of the implicit function theorem in differential geometry)**:

Let $m \\ge n$, let $U \\subset \\mathbb{R}^m$ be an open set, let $\\psi: U \\to \\mathbb{R}^{m-n}$ be a smooth map, and let $a \\in \\mathbb{R}^{m-n}$ be a regular value of $\\psi$ (that is, $\\psi_*$ is surjective at every point of $\\psi^{-1}(a)$). Then $\\psi^{-1}(a) \\subset U$ carries the structure of a smooth $n$-dimensional [manifold](/nodes/dg%3Amanifold), whose [smooth structure](/nodes/dg%3Asmooth-structure) is defined by the following charts: fix $p \\in \\psi^{-1}(a)$; there is a ball $B \\subset \\mathbb{R}^m$ centred at $p$ such that the orthogonal projection from $B$ onto $\\ker(\\psi_{*|p})$, restricted to $\\psi^{-1}(a) \\cap B$, is a chart [pdf_14].

---

#### Equivalent expressions

**Equivalent to the [inverse function theorem](/nodes/dg%3Ainverse-function-theorem)**: in the framework of $C^1$ maps the implicit function theorem and the [inverse function theorem](/nodes/dg%3Ainverse-function-theorem) are equivalent. The [inverse function theorem](/nodes/dg%3Ainverse-function-theorem) is a special case of the implicit function theorem (take $F(x,y)=f(x)-y$), while the implicit function theorem can be proved by applying the [inverse function theorem](/nodes/dg%3Ainverse-function-theorem) to $G(x,y)=(x,F(x,y))$ [pdf_8].

**Characterisation as a sub[manifold](/nodes/dg%3Amanifold)**: in differential geometry the implicit function theorem is often stated as follows: if $f: \\mathbb{R}^m \\to \\mathbb{R}^k$ is a smooth map and $a$ is a regular value, then $f^{-1}(a)$ is a smooth sub[manifold](/nodes/dg%3Amanifold) of $\\mathbb{R}^m$ of dimension $m-k$ [pdf_14][pdf_13].

**The complex form of the implicit function theorem**: for a complex analytic function $f(w,z)$, if $\\partial f/\\partial w \\neq 0$, then there is a unique complex analytic function $w=w(z)$ satisfying $f(w(z),z)=0$, and $\\partial \\bar{w}/\\partial \\bar{z}=0$ [pdf_13].

---

#### Thinking about deleting conditions

**If the $C^1$ condition (differentiability) is deleted**:
- Requiring only that $F$ be continuous is not enough — even if $F$ is continuous, the existence of $g$ cannot be guaranteed, let alone its differentiability. Counterexample: $F(x,y)=x-y^3$ at $(0,0)$; $F$ is continuous, but $\\partial F/\\partial y(0,0)=0$, so the existence of a locally unique solution cannot be guaranteed.
- Slightly weaker conditions such as a Lipschitz condition also work in some versions, but $C^1$ is the most natural and most commonly used condition.

**If the invertibility of $\\partial F/\\partial y$ is deleted**:
- This is fatal. If $\\partial F/\\partial y$ is singular (not invertible) at $(x_0,y_0)$, then the implicit function may fail to exist, or may exist but not be unique, or may lose smoothness.
- Classical counterexample: for $F(x,y)=x^2 - y^2 = 0$ at $(0,0)$, $\\partial F/\\partial y = -2y$ vanishes at $(0,0)$. The solution set of $x^2-y^2=0$ is the union of the two lines $y=\\pm x$, and near the origin there is no unique function $y=g(x)$.
- If $\\partial F/\\partial y$ is invertible but $\\partial F/\\partial x$ vanishes, the conclusion is unaffected (only $g'(x)=0$). The key condition is the invertibility of $\\partial F/\\partial y$.

**If the condition $F(x_0,y_0)=0$ is deleted**:
- This obviously fails — without it we do not even have a point to solve at.

**If a global solution is required instead of a local one**:
- The implicit function theorem is essentially a local theorem. The existence of a global solution requires extra topological conditions (single-valuedness, simple connectedness and so on); in complex analysis, for instance, the implicit function $w(z)$ may have branch points, and a Riemann surface is needed to obtain a global single-valued function.

---

### Applications

**1. Constructing regular sub[manifolds](/nodes/dg%3Amanifold)**: in differential geometry the implicit function theorem is the basic tool for defining sub[manifolds](/nodes/dg%3Amanifold). If $f: \\mathbb{R}^m \\to \\mathbb{R}^k$ is a smooth map and $a$ is a regular value, then $f^{-1}(a)$ is a smooth sub[manifold](/nodes/dg%3Amanifold). For example:
- the sphere $S^{n-1} = \\{x \\in \\mathbb{R}^n \\mid |x|^2 = 1\\}$ is a sub[manifold](/nodes/dg%3Amanifold) of $\\mathbb{R}^n$ (take $f(x)=|x|^2$; $1$ is a regular value) [pdf_14].
- the orthogonal group $O(n) = \\{M \\in \\operatorname{Mat}(n;\\mathbb{R}) \\mid M^T M = I\\}$ is a Lie subgroup of $\\operatorname{GL}(n;\\mathbb{R})$ (take $\\psi(M)=M^T M$; $I$ is a regular value) [pdf_14].

**2. Local parametrisation of surfaces**: for the implicit surface $F(x,y,z)=0$, if $\\partial F/\\partial z \\neq 0$, then the surface can be written locally as $z=f(x,y)$, giving a local parametrisation [pdf_13][pdf_3].

**3. Normal curvature and sectional curvature**: in differential geometry the implicit function theorem is used to prove that a normal section is a regular curve, which is what allows normal curvature to be defined [pdf_3].

**4. The method of Lagrange multipliers**: the theoretical basis of the constrained optimisation problem $\\min f(x)$ subject to $g(x)=0$ rests on the implicit function theorem — on the [manifold](/nodes/dg%3Amanifold) defined by the constraint, the gradients must be parallel.

**5. Dependence of solutions of differential equations on parameters**: the implicit function theorem guarantees the continuous or differentiable dependence of the solutions of a parameter-dependent differential equation on the parameter.

---

### Generalizations

**1. The implicit function theorem in Banach spaces**: replace $\\mathbb{R}^m$ and $\\mathbb{R}^n$ by Banach spaces, let $F$ be a Fréchet differentiable map, and suppose the partial-derivative operator is invertible. This is one of the most important tools of functional analysis and non-linear analysis.

**2. The Nash–Moser implicit function theorem**: when the invertibility condition fails (for instance in the loss-of-derivatives situation), the Nash–Moser theorem still guarantees the existence of the implicit function by an iteration technique; it is a key tool for the isometric embedding problem in differential geometry.

**3. The complex implicit function theorem**: in complex analysis, if $f(w,z)$ is complex analytic and $\\partial f/\\partial w \\neq 0$, then the implicit function $w(z)$ is also complex analytic [pdf_13].

**4. The constant-rank version of the implicit function theorem**: when $\\partial F/\\partial y$ is not invertible but has constant rank, one still obtains a certain fibration structure — the solution set is a sub[manifold](/nodes/dg%3Amanifold), but $y$ can no longer be written uniquely as a function of $x$ (more parameters may be needed).

**5. The analogue in algebraic geometry**: in algebraic geometry the Jacobian condition corresponds to the notion of a non-singular point, and the analogue of the implicit function theorem is the **algebraic version of the implicit function theorem** — namely the Weierstrass preparation theorem in a ring of formal power series.

---

### Insights

- **Local linearisation is a core idea of analysis**: the implicit function theorem is a perfect illustration of the core idea that “a non-linear problem can be made linear locally”. The behaviour of a non-linear map $F$ near $(x_0,y_0)$ is governed by its linearisation $\\partial F/\\partial y$.
- **The dialectic of the implicit and the explicit**: relations defined implicitly are often more natural and more general than explicit expressions (algebraic varieties, solutions of differential equations), yet the implicit function theorem tells us that under a non-degeneracy condition an implicit relation is locally equivalent to an explicit function. This reveals a deep link between “implicit” and “explicit”.
- **The condition of invertibility is everywhere**: from linear algebra to differential topology and on to functional analysis, **invertibility (or surjectivity plus injectivity)** is always the key to solvability. The implicit function theorem is the expression of this idea in the non-linear differential framework.
- **The tension between the local and the global**: the implicit function theorem is local, yet its applications (sub[manifold](/nodes/dg%3Amanifold) structure, local trivialisation of fibre bundles) often carry global significance. This reminds us that local structure is the starting point for understanding global structure.

---

### Summary

#### Idea

The core idea of the implicit function theorem is **to localise an implicit relation into an explicit function by linearisation**. It tells us that, under a non-degeneracy condition, a non-linear system $F(x,y)=0$ is locally equivalent to an explicit function $y=g(x)$ — and the derivative of $g$ is completely determined by the partial derivatives of $F$.

#### Methods

- **The construction method**: build the auxiliary map $G(x,y)=(x,F(x,y))$, apply the [inverse function theorem](/nodes/dg%3Ainverse-function-theorem) to it, and then read off $y$ as a function of $x$ from the invertibility of $G$.
- **The chain rule**: differentiate the identity $F(x,g(x))\\equiv0$ to obtain the expression for $g'(x)$ directly.
- **Fixed-point iteration** (the standard method in the analytic proof): construct $g$ by the contraction mapping principle (the Banach fixed-point theorem); this is also the standard route of proof for the Banach-space version of the implicit function theorem.

---

### Looking back and asking

1. Is the invertibility of $\\partial F/\\partial y$ in the implicit function theorem necessary? Can it be replaced by a weaker condition (such as surjectivity)?
2. Can the $C^1$ regularity of the implicit function $g$ be improved? If $F$ is $C^k$, is $g$ also $C^k$?
3. Under what conditions can the implicit function theorem be extended from a local to a global implicit function? Which topological conditions are needed?
4. For $F(x,y)=0$ with $\\partial F/\\partial y$ singular (a branch point), what is the structure of the solution set? How does this connect with the theory of branch points of Riemann surfaces?
5. What is the intrinsic link between the implicit function theorem, Morse’s lemma and Sard’s theorem?
6. In infinite-dimensional spaces, which additional compactness conditions are needed for the implicit function theorem to hold?`,

  'dg:inverse-function-theorem': `## The inverse function theorem

> The inverse function theorem is one of the most central theorems of multivariable calculus and differential geometry. It establishes a deep connection between the invertibility of the differential of a map (its linear approximation) and the local invertibility of the map itself—a seemingly trivial condition that a determinant be non-zero already suffices to guarantee that the map is locally a diffeo[homeomorphism](/nodes/dg%3Ahomeomorphism).

**Source tags.** #analysis #geometry #differentiable-manifolds #theorem

**Source.** The read-only snapshot \`G:/DifferentialGeometry/object/thm/反函数定理.md\` (see \`data/dg/\`).

---

### Prerequisites

#### Essential knowledge

- **Multivariable calculus**: familiarity with partial derivatives, directional derivatives, the Jacobi matrix and determinant, and the chain rule. An understanding that the differential $df_p$ of a differentiable map is a linear map whose matrix representation is the Jacobi matrix.
- **Linear algebra**: an understanding of the invertibility of a linear map, of the [rank](/nodes/bg%3Alinear%3Avector) and determinant of a matrix, and of the notion of a linear isomorphism. In particular, one needs to know that an $n \\times n$ matrix is invertible if and only if its determinant is non-zero.

#### Supporting knowledge

- **The contraction mapping principle**: a contraction mapping on a complete [metric space](/nodes/dg%3Ametric-space) has a unique fixed point. This is the core tool in the classical proof of the inverse function theorem.
- **Foundations of topology**: the notions of an open set, a neighbourhood, a continuous map and a [homeomorphism](/nodes/dg%3Ahomeomorphism). Understanding the distinction between “local” and “global” is essential for grasping the local nature of the theorem. topological space

#### Further knowledge

- **[Differentiable manifolds](/nodes/manifold%3Ack-atlas)**: when the inverse function theorem in Euclidean space is translated to a [manifold](/nodes/dg%3Amanifold), one obtains the inverse mapping theorem between [manifolds](/nodes/dg%3Amanifold): if the rank of $f: M^n \\to N^n$ at $p$ equals $n$ (that is, $df_p$ is an isomorphism), then $f$ is a local diffeo[homeomorphism](/nodes/dg%3Ahomeomorphism) near $p$.
- **[The implicit function theorem](/nodes/dg%3Aimplicit-function-theorem)**: the inverse function theorem and the [implicit function theorem](/nodes/dg%3Aimplicit-function-theorem) are essentially equivalent, and each can be derived from the other. The [implicit function theorem](/nodes/dg%3Aimplicit-function-theorem) asserts that, under suitable regularity conditions, the equation $F(x, y) = 0$ can be solved locally for $y = g(x)$.
- **Sard's theorem**: as a further deepening of the inverse function theorem, Sard's theorem states that the set of critical values has measure zero, and it is the foundation of transversality theory in differential topology.

### Motivation

#### Motivation for introducing it

In single-variable calculus, for $f: \\mathbb{R} \\to \\mathbb{R}$, if $f'(a) \\neq 0$ then $f$ is locally invertible near $a$, and the derivative of its inverse satisfies $(f^{-1})'(f(a)) = 1/f'(a)$. This is an extremely concise and powerful conclusion: the non-vanishing of the derivative directly implies the local invertibility of the function.

When we enter the multivariable world, the problem becomes far more complicated. The local behaviour of a map $F: \\mathbb{R}^n \\to \\mathbb{R}^n$ near a point is described by its differential $dF_p$ (a linear map). A natural question then arises: **is the invertibility of the differential $dF_p$ enough to guarantee the local invertibility of $F$ itself near $p$?**

The inverse function theorem answers this question in the affirmative. The key point is that **information about a linear map (that is, a matrix of numbers) turns out to suffice to control the local behaviour of a non-linear map**. The inverse function theorem tells us that a question of local invertibility that seems to require a great deal of computation reduces to checking whether a single number—the determinant—is zero. As Guillemin and Pollack emphasise: “The derivative $df_x$ is simply a single linear map, which we may represent by a matrix of numbers. This linear map is nonsingular precisely when the determinant of its matrix is nonzero. Thus the Inverse Function Theorem tells us that the seemingly quite subtle question of whether $f$ maps a neighborhood of $x$ diffeomorphically onto a neighborhood of $y$ reduces to a trivial matter of checking if a single number—the determinant of $df_x$—is nonzero!”

From the point of view of a line of thought internal to the discipline, the inverse function theorem is a bridge taking calculus from the local to the global. It is not only the foundation of the theory of regular parametrisations of surfaces in differential geometry, but also a core tool of the theory of immersions and submersions in differential topology. From the point of view of external applications, the inverse function theorem (and its equivalent form, the [implicit function theorem](/nodes/dg%3Aimplicit-function-theorem)) is widely used in general equilibrium theory in economics, in control theory, and in implicit neural representations in machine learning.

#### Motivation for the construction

The canonical form of the inverse function theorem has developed from the single-variable to the multivariable case, and from Euclidean space to [manifolds](/nodes/dg%3Amanifold).

**The seed in the single-variable period**: in single-variable calculus, $f'(a) \\neq 0$ means that there is a neighbourhood $U$ of $a$ and a neighbourhood $V$ of $f(a)$ such that $f: U \\to V$ is a bijection with a differentiable inverse. This conclusion can be derived directly from the definition of the derivative and from continuity.

**The canonical form in the multivariable period**: in $\\mathbb{R}^n$ the situation becomes complicated, because the “derivative” in an $n$-dimensional space is a linear map (the Jacobi matrix) rather than a number. But the core idea is inherited from the single-variable case: if $dF_p$ is invertible, then $F$ is a local diffeo[homeomorphism](/nodes/dg%3Ahomeomorphism) near $p$. The key to the proof is to regard $F$ as “the identity map plus a small perturbation”—by a change of coordinates one assumes $dF_p = I$, so that $F(x) = x + g(x)$ with $g$ having a small derivative near $p$; thus $F$ is a perturbation of a contraction mapping, and invertibility can be proved by the contraction mapping principle.

**The generalisation to [manifolds](/nodes/dg%3Amanifold)**: between [differentiable manifolds](/nodes/manifold%3Ack-atlas) $M^n$ and $N^n$, the inverse function theorem is stated as: if the rank of $f: M \\to N$ at the point $p$ equals $n$, then there is an open neighbourhood $U$ of $p$ and an open neighbourhood $V$ of $f(p)$ such that $f|_U: U \\to V$ is a $C^k$ diffeo[homeomorphism](/nodes/dg%3Ahomeomorphism). This [manifold](/nodes/dg%3Amanifold) version reduces the problem to the inverse function theorem in Euclidean space by means of local coordinate charts.

### Form

#### The canonical general form

**The Euclidean version** (the most classical form):

Let $U \\subset \\mathbb{R}^n$ be an open set and let $F: U \\to \\mathbb{R}^n$ be a $C^k$ map ($k \\geq 1$). If the differential $dF_p: \\mathbb{R}^n \\to \\mathbb{R}^n$ at $p \\in U$ is a linear isomorphism (that is, the Jacobi matrix satisfies $\\det JF(p) \\neq 0$), then there is an open neighbourhood $V \\subset U$ of $p$ and an open neighbourhood $W \\subset \\mathbb{R}^n$ of $F(p)$ such that $F: V \\to W$ is a $C^k$ diffeo[homeomorphism](/nodes/dg%3Ahomeomorphism).

**The [differentiable manifold](/nodes/manifold%3Ack-atlas) version**:

Let $f: M^n \\to N^n$ be a $C^k$ map between two $n$-dimensional [differentiable manifolds](/nodes/manifold%3Ack-atlas) ($k \\geq 1$). If $\\operatorname{rank}_p f = n$ at $p \\in M$ (that is, the tangent map $T_p f: T_p M \\to T_{f(p)} N$ is a linear isomorphism), then there is an open neighbourhood $U$ of $p$ and an open neighbourhood $V$ of $f(p)$ such that $f|_U: U \\to V$ is a $C^k$ diffeo[homeomorphism](/nodes/dg%3Ahomeomorphism).

#### Analysis of the necessary conditions

The inverse function theorem contains two key conditions.

**Condition 1: the domain and the codomain of the map have the same dimension ($F: \\mathbb{R}^n \\to \\mathbb{R}^n$)**

If the dimensions differ, then even when the differential is “invertible” in some sense, the map cannot be one-to-one locally. For example, for $F: \\mathbb{R} \\to \\mathbb{R}^2$, $t \\mapsto (\\cos t, \\sin t)$, the differential is nowhere zero (its rank is 1), yet the image is a circle and the map is injective in no neighbourhood at all—because points of $\\mathbb{R}$ that differ by $2\\pi$ are mapped to the same point. Here the conclusion of the theorem no longer holds, because the dimensions do not match and the differential cannot be an isomorphism in the usual sense.

**Condition 2: the differential $dF_p$ is an isomorphism (that is, $\\det JF(p) \\neq 0$)**

This condition cannot be dropped. If $\\det JF(p) = 0$, then $F$ may be completely non-invertible near $p$. For example, for $F: \\mathbb{R} \\to \\mathbb{R}$, $F(x) = x^3$, at $p = 0$ we have $F'(0) = 0$. Although $F$ is a bijection and continuous as a whole, its inverse $F^{-1}(y) = \\sqrt[3]{y}$ is not differentiable at $0$—the inverse function exists but is not differentiable. A worse example is $F(x) = x^2$: at $p=0$ we have $F'(0)=0$, and here $F$ is not even injective. The converse of the inverse function theorem also holds: if $dF_p$ is not invertible, then no such neighbourhood $V$ and smooth map $\\sigma$ exist for which $\\psi \\circ \\sigma$ is the identity map.

#### Equivalent formulations

**In local coordinates**: if $dF_p$ is an isomorphism, one can choose local coordinate systems near $p$ and near $F(p)$ in which $F$ is represented by the identity map, that is, $F(x_1, \\dots, x_n) = (x_1, \\dots, x_n)$.

**In terms of the tangent map**: let $f: X \\to Y$ be a morphism of class $C^p$ with $T_x f \\in \\operatorname{Isom}(T_x X; T_{f(x)} Y)$. Then there is an open set $U$ of $X$ containing $x$ such that $f(U)$ is an open set of $Y$ and $f$ is a diffeo[homeomorphism](/nodes/dg%3Ahomeomorphism) from $U$ onto $f(U)$.

**Equivalence with the [implicit function theorem](/nodes/dg%3Aimplicit-function-theorem)**: the inverse function theorem and the [implicit function theorem](/nodes/dg%3Aimplicit-function-theorem) are essentially equivalent, and each can be derived from the other. The [implicit function theorem](/nodes/dg%3Aimplicit-function-theorem) is a direct corollary of the inverse function theorem when solving the equation $F(x, y) = 0$.

#### How are the relevant statements expressed in natural language?

The essence of the inverse function theorem is: **“the local invertibility of a differentiable map near a point is determined entirely by the invertibility of its linear approximation (its differential) at that point.”**

In other words: if at a point the “best linear approximation” of the map is invertible, then the map itself is invertible near that point—and the inverse is equally smooth.

#### A lower-dimensional formulation

From the point of view of set theory and point-set topology, the inverse function theorem asserts: if the differential of $F$ at $p$ is invertible, then there is a neighbourhood $U$ of $p$ and a neighbourhood $V$ of $F(p)$ such that $F: U \\to V$ is a **[homeomorphism](/nodes/dg%3Ahomeomorphism)** (in fact a diffeo[homeomorphism](/nodes/dg%3Ahomeomorphism)). That is to say, locally $F$ is an open map and is injective.

From the point of view of category theory, the inverse function theorem guarantees a kind of “transitivity” of a local property: invertibility in the differentiable category (a linear isomorphism) can be lifted to local invertibility in the category of smooth maps (a local diffeo[homeomorphism](/nodes/dg%3Ahomeomorphism)).

#### A higher-dimensional viewpoint

The inverse function theorem is a cornerstone of the **local normal-form theorems of differential topology**. In more advanced theories it can be seen as a special case of the following, more general conclusions:

- **The rank theorem**: if $F: \\mathbb{R}^m \\to \\mathbb{R}^n$ has constant rank $r$ near $p$, then there are local coordinate systems in which $F$ is represented by $(x_1, \\dots, x_m) \\mapsto (x_1, \\dots, x_r, 0, \\dots, 0)$. When $m = n = r$, the rank theorem degenerates to the inverse function theorem.
- **The immersion theorem**: if $df_p$ is injective (that is, $F$ is an immersion), then $F$ is locally equivalent to the standard embedding $\\mathbb{R}^m \\hookrightarrow \\mathbb{R}^n$.
- **The submersion theorem**: if $df_p$ is surjective (that is, $F$ is a submersion), then $F$ is locally equivalent to the standard projection $\\mathbb{R}^n \\to \\mathbb{R}^m$.

### Proof

#### Proof sketch

The core idea of the proof of the inverse function theorem is **to construct the inverse function by means of the contraction mapping principle**. Concretely: by a suitable change of coordinates (composing with an invertible linear map) the problem is reduced to the case $F(0) = 0$ and $dF_0 = I$, where $F(x) = x + g(x)$ with $g(x)$ a “small perturbation” ($g(0) = 0$ and $\\|dg(x)\\| \\leq 1/2$). Then for each fixed $y$ one defines the map $\\Phi_y(x) = y - g(x)$, whose fixed points are exactly the solutions of $F(x) = y$. The contraction mapping principle shows that $\\Phi_y$ has a unique fixed point, and hence gives a local inverse of $F$.

#### Detailed proof

**Step one: reduce to the standard case.**

Without loss of generality, assume $p = 0$ and $F(p) = 0$ (otherwise translate). Let $A = dF_0$; by hypothesis $A$ is invertible. Consider $\\tilde{F} = A^{-1} \\circ F$; then $\\tilde{F}(0) = 0$ and $d\\tilde{F}_0 = I$. If we can prove that $\\tilde{F}$ has a $C^k$ inverse near $0$, then $F = A \\circ \\tilde{F}$ evidently has a $C^k$ inverse as well. Hence we may assume that $F(0) = 0$ and $dF_0 = I_n$.

**Step two: construct the perturbation term.**

Let $g(x) = F(x) - x$; then $g(0) = 0$ and $dg(0) = 0$. By continuity of $dg$ there is an $\\varepsilon > 0$ such that
$$
\\|dg(x)\\| \\leq \\frac{1}{2}, \\quad \\forall x \\in \\overline{B_\\varepsilon(0)}.
$$

**Step three: construct the inverse function by means of the contraction mapping principle.**

For each fixed $y \\in \\mathbb{R}^n$ define the map
$$
\\Phi_y(x) = y - g(x).
$$
If $x \\in \\overline{B_\\varepsilon(0)}$ and $\\|y\\| \\leq \\varepsilon/2$, then
$$
\\|\\Phi_y(x)\\| \\leq \\|y\\| + \\|g(x)\\| \\leq \\frac{\\varepsilon}{2} + \\frac{\\varepsilon}{2} = \\varepsilon,
$$
where we used $\\|g(x)\\| = \\|g(x) - g(0)\\| \\leq \\sup_{z \\in \\overline{B_\\varepsilon(0)}} \\|dg(z)\\| \\cdot \\|x\\| \\leq \\frac{1}{2}\\varepsilon$. Hence $\\Phi_y$ maps $\\overline{B_\\varepsilon(0)}$ into itself.

Moreover, since
$$
\\|\\Phi_y(x_1) - \\Phi_y(x_2)\\| = \\|g(x_1) - g(x_2)\\| \\leq \\frac{1}{2}\\|x_1 - x_2\\|,
$$
the map $\\Phi_y$ is a contraction mapping on $\\overline{B_\\varepsilon(0)}$. By the contraction mapping principle there is a unique fixed point $x = \\Phi_y(x)$, that is, $x = y - g(x)$, which is to say $F(x) = y$.

**Step four: define the inverse function and verify smoothness.**

Let $W = B_{\\varepsilon/2}(0)$; for each $y \\in W$ let $\\sigma(y)$ be the unique $x \\in \\overline{B_\\varepsilon(0)}$ with $F(\\sigma(y)) = y$. Then $\\sigma: W \\to \\overline{B_\\varepsilon(0)}$ is the inverse map of $F$. One can show that $\\sigma$ is $C^k$ (by the standard argument via the [implicit function theorem](/nodes/dg%3Aimplicit-function-theorem), or directly using the differentiability of $F$ and the continuity of the inverse).

**Step five: the proof of the [manifold](/nodes/dg%3Amanifold) version.**

For a map between [manifolds](/nodes/dg%3Amanifold) $f: M^n \\to N^n$, use a local coordinate chart $\\varphi: U \\to \\mathbb{R}^n$ near $p$ and a local coordinate chart $\\psi: V \\to \\mathbb{R}^n$ near $f(p)$ to reduce the problem to the map $\\psi \\circ f \\circ \\varphi^{-1}$ in Euclidean space, and then apply the Euclidean inverse function theorem.

### Applications

#### Direct applications

**Example 1 (invertibility of the polar coordinate transformation)**: consider the map $F: \\mathbb{R}^2 \\to \\mathbb{R}^2$, $F(x, y) = (e^x \\cos y, e^x \\sin y)$. Compute the Jacobi determinant:
$$
\\det JF(x, y) = \\det \\begin{pmatrix} e^x \\cos y & -e^x \\sin y \\\\ e^x \\sin y & e^x \\cos y \\end{pmatrix} = e^{2x} \\neq 0.
$$
By the inverse function theorem, $F$ is a local diffeo[homeomorphism](/nodes/dg%3Ahomeomorphism) near every point. In fact $F$ is a covering map from $\\mathbb{R}^2$ onto $\\mathbb{R}^2\\setminus\\{0\\}$.

**Example 2 (parametrisation of a regular surface)**: in the theory of surfaces, if $F: U \\subset \\mathbb{R}^2 \\to \\mathbb{R}^3$ is a regular parametrised surface, then the Jacobi matrix of $F$ at any point has rank 2, but $F$ is not a map from $\\mathbb{R}^2$ to $\\mathbb{R}^3$ (the dimensions differ). Combining with the inverse function theorem, however, one can show that after adding a suitable third coordinate one can construct a local diffeo[homeomorphism](/nodes/dg%3Ahomeomorphism) in $\\mathbb{R}^3$ and thereby obtain a local explicit representation $z = h(x, y)$ of the surface.

**Example 3 (introducing curvilinear coordinates)**: in differential geometry, if the Jacobi determinant of the system of functions $x^1 = f^1(u^1, \\dots, u^n), \\dots, x^n = f^n(u^1, \\dots, u^n)$ is nowhere zero, then the inverse function theorem guarantees the existence of an inverse function $u^\\alpha = g^\\alpha(x^1, \\dots, x^n)$, so that $(u^1, \\dots, u^n)$ can serve as curvilinear coordinates on the region.

#### Indirect applications

**Applications in mathematics:**

- **[The implicit function theorem](/nodes/dg%3Aimplicit-function-theorem)**: a direct corollary of the inverse function theorem, used to solve for the implicit function $y = g(x)$ in the equation $F(x, y) = 0$. This is the foundation of the theory of regular level sets and of the definition of surfaces in differential geometry.
- **Local normal forms of immersions and submersions**: in differential topology, the inverse function theorem is the basis for proving the immersion theorem and the submersion theorem, which reduce an arbitrary constant-rank map to a standard form locally.
- **The inverse mapping theorem on [differentiable manifolds](/nodes/manifold%3Ack-atlas)**: generalising the inverse function theorem in Euclidean space to [manifolds](/nodes/dg%3Amanifold) by means of local coordinate charts yields a criterion for a local diffeo[homeomorphism](/nodes/dg%3Ahomeomorphism) between [manifolds](/nodes/dg%3Amanifold).
- **The local diffeo[homeomorphism](/nodes/dg%3Ahomeomorphism) property of the exponential map**: in Riemannian geometry, the inverse function theorem can be used to prove that the exponential map $\\exp_p: T_p M \\to M$ is a local diffeo[homeomorphism](/nodes/dg%3Ahomeomorphism) near the origin.

**Applications in related disciplines:**

- In **economics**, the [implicit function theorem](/nodes/dg%3Aimplicit-function-theorem) (an equivalent form of the inverse function theorem) is used in general equilibrium theory to analyse how equilibrium prices depend on parameters.
- In **control theory**, the inverse function theorem is used to analyse the controllability and observability of non-linear systems.
- In **numerical analysis**, the proof of convergence of Newton's iteration is essentially a discrete version of the inverse function theorem.
- In **machine learning**, the core idea of flow-based generative models (such as normalising flows) is precisely to use the inverse function theorem to construct invertible neural network layers.

### Generalisations

- **Relaxing the conditions**: the $C^k$ smoothness condition in the theorem can be relaxed; it suffices that $F$ be continuously differentiable with $dF_p$ invertible. The $C^1$ version still holds, and the inverse is $C^1$ as well.
- **Generalisation to Banach spaces**: the inverse function theorem generalises to infinite-dimensional Banach spaces, which is crucial in non-linear functional analysis. Let $F: X \\to Y$ be a $C^1$ map between Banach spaces; if $dF_p$ is a linear [homeomorphism](/nodes/dg%3Ahomeomorphism), then $F$ is a local $C^1$ diffeo[homeomorphism](/nodes/dg%3Ahomeomorphism) near $p$.
- **Generalisation to [manifolds](/nodes/dg%3Amanifold)**: as described above, the inverse function theorem generalises naturally to [differentiable manifolds](/nodes/manifold%3Ack-atlas), where locally it reduces to the Euclidean case by means of coordinate charts.
- **A non-compact generalisation**: in differential topology there is a non-compact generalisation of the inverse function theorem: if the differential of $f: X \\to Y$ is an isomorphism at every point of a compact sub[manifold](/nodes/dg%3Amanifold) $Z \\subset X$, and $f$ maps $Z$ diffeo[homeomorphism](/nodes/dg%3Ahomeomorphism)ally onto $f(Z)$, then $f$ maps a neighbourhood of $Z$ diffeo[homeomorphism](/nodes/dg%3Ahomeomorphism)ally onto a neighbourhood of $f(Z)$.

### Common misconceptions

**Misconception 1: “the inverse function theorem guarantees that the map is invertible globally.”**

This is the most common misunderstanding. The inverse function theorem is a **purely local** conclusion—it only tells us that $F$ is invertible in some neighbourhood of $p$, not on its whole domain. A classical example is $F: \\mathbb{R} \\to S^1$, $F(t) = (\\cos t, \\sin t)$. Although $dF_t$ is non-singular everywhere, $F$ is not a global bijection (it is a covering map of period $2\\pi$). Such a map is called a **local diffeo[homeomorphism](/nodes/dg%3Ahomeomorphism)**, but it need not be a global diffeo[homeomorphism](/nodes/dg%3Ahomeomorphism).

**Misconception 2: “if the differential is invertible, then the inverse function can be written down explicitly.”**

The inverse function theorem guarantees only the existence and the smoothness of the inverse; it does not give an explicit expression for it. In applications, the mere existence of the inverse is often enough to push a theoretical analysis forward, without writing the expression down.

**Misconception 3: “the hypothesis that $dF_p$ is non-degenerate is a very strong condition.”**

Quite the contrary: this is precisely the beauty of the inverse function theorem—a question of local invertibility that seems to require a great deal of computation reduces to computing a single number (whether the determinant is zero). It is in fact a very easy condition to verify.

**Misconception 4: “the inverse function theorem and the [implicit function theorem](/nodes/dg%3Aimplicit-function-theorem) are two unrelated theorems.”**

In fact the inverse function theorem and the [implicit function theorem](/nodes/dg%3Aimplicit-function-theorem) are equivalent, and each can be derived from the other. In most textbooks on differential geometry the [implicit function theorem](/nodes/dg%3Aimplicit-function-theorem) appears as a corollary of the inverse function theorem.

### Insights

- **The “localisation” style of thought, from the linear to the non-linear**: the inverse function theorem is the peak expression of the idea of “linearisation”—a non-linear map can be completely described locally by its linear approximation. This idea of turning a non-linear problem into a linear one runs through the whole of mathematical analysis and is one of the most powerful weapons for understanding complex systems.
- **The deep gulf between “local” and “global”**: the inverse function theorem displays clearly the difference between a local property and a global property. The invertibility of the differential everywhere is only a sufficient condition for being a local diffeo[homeomorphism](/nodes/dg%3Ahomeomorphism), and far from a sufficient condition for being a global diffeo[homeomorphism](/nodes/dg%3Ahomeomorphism). This reminds us that in mathematics the step from the local to the global usually needs extra hypotheses (such as simple connectedness or properness).
- **One number decides everything**: a determinant is only a number, yet whether that number is zero decides the local invertibility of a non-linear map. This style of thought—controlling a complicated problem of analysis by a simple numerical condition—recurs throughout mathematics (discriminants, Wronskians, curvature and so on).

### Summary

#### The idea

**“Local linearisation controls global non-linearity”**—the core idea of the inverse function theorem is: the invertibility of the differential (the linear approximation) of a non-linear map at a point suffices to guarantee the local invertibility of the map near that point. Non-linearity is controlled locally by linearisation.

#### Methods

- **The change-of-coordinates method**: by composing with an invertible linear map, reduce the problem to the standard case $dF_0 = I$. This is the first step of the proof and a typical application of the idea of “normalisation” in mathematics.
- **The contraction mapping principle**: turn the construction of the inverse function into a fixed-point problem for a contraction mapping, and use the Banach fixed-point theorem to guarantee a unique solution. This is one of the most basic tools of non-linear analysis.
- **Local coordinate charts**: pull a problem on a [manifold](/nodes/dg%3Amanifold) back to Euclidean space by means of coordinate charts, so that the Euclidean inverse function theorem can be applied directly. This is the standard way of handling every local problem on a [manifold](/nodes/dg%3Amanifold).

### Looking back and asking

- In the inverse function theorem, why must the domain and the codomain have the same dimension? If the dimensions differ, is there a similar notion of a “local inverse”?
- The inverse function theorem is local; under what conditions can local diffeo[homeomorphism](/nodes/dg%3Ahomeomorphism)s be “glued” into a global diffeo[homeomorphism](/nodes/dg%3Ahomeomorphism)?
- What is the counterpart of the inverse function theorem in complex analysis? In the theory of functions of a complex variable, does $f'(z_0) \\neq 0$ also guarantee that $f$ is locally invertible near $z_0$?
- In an infinite-dimensional Banach space, how does the proof of the inverse function theorem differ from the finite-dimensional case? Does the contraction mapping principle still work in infinite dimensions?
- Sard's theorem (the set of critical values has measure zero) can be seen as a kind of “globalised” version of the inverse function theorem; what exactly is the connection between the two?`,

  'dg:generalized-stokes-theorem': `## The generalized Stokes theorem

**Source tags.** #differential-geometry #topology #analysis #theorem #integration-on-manifolds #exterior-differential-forms

**Source.** The read-only snapshot \`G:/DifferentialGeometry/object/thm/广义 Stokes 定理.md\` (see \`data/dg/\`).

---

The generalized Stokes theorem is the fundamental theorem of calculus on a [manifold](/nodes/dg%3Amanifold): it relates the integral of the exterior derivative of a differential form to the integral of the form over the boundary, and it unifies Green's formula, the Gauss–Ostrogradskii divergence formula and the classical Stokes formula of vector analysis. The theorem reveals a deep duality between analytic operations (exterior differentiation and integration) and geometric–topological operations (taking the boundary), and it is a central bridge connecting differential geometry, algebraic topology and mathematical physics.

---

## Prerequisites

### Essential knowledge

- **[Differentiable manifolds](/nodes/manifold%3Ack-atlas)**: a command of the definition of a [smooth manifold](/nodes/dg%3Asmooth-manifold), of tangent spaces and of smooth maps.
- **[Differential forms](/nodes/dg%3Adifferential-form)**: an understanding of the exterior algebra, the wedge product, the [pullback of differential forms](/nodes/dg%3Aform-pullback), and the definition and properties of the exterior derivative operator $d$ (in particular $d^2 = 0$).
- **Integration on a [manifold](/nodes/dg%3Amanifold)**: knowing about orientable [manifolds](/nodes/dg%3Amanifold), [partitions of unity](/nodes/dg%3Apartition-of-unity), and the definition of the integral of a [differential form](/nodes/dg%3Adifferential-form) with compact support over a [manifold](/nodes/dg%3Amanifold).
- **[Manifolds](/nodes/dg%3Amanifold) with boundary**: knowing the upper half-space $\\mathbb{H}_+^n = \\{x \\in \\mathbb{R}^n \\mid x^n \\geqslant 0\\}$ and the definition of a [manifold](/nodes/dg%3Amanifold) with boundary, and the distinction between boundary points and interior points.

### Supporting knowledge

- **Vector analysis**: familiarity with the gradient, divergence and curl in $\\mathbb{R}^3$, and with the classical Green formula, divergence theorem and Stokes theorem.
- **Point-set topology**: basic topological notions such as [compactness](/nodes/dg%3Acompactness) and connectedness.

### Further knowledge

- **[de Rham cohomology](/nodes/dg%3Apoincare-lemma)**: use $d^2 = 0$ to define closed and exact forms; the quotient space $H_{dR}^p(M) = Z^p(M)/B^p(M)$ is called the [de Rham cohomology](/nodes/dg%3Apoincare-lemma) group. Stokes' theorem provides a key tool for establishing the isomorphism between [de Rham cohomology](/nodes/dg%3Apoincare-lemma) and singular cohomology (de Rham's theorem).
- **Homology theory**: the exterior derivative operator $d$ and the boundary operator $\\partial$ are dual to each other in the sense of integration, and this duality is one of the core ideas of cohomology theory.

---

## Motivation

### Motivation for introducing it

#### A line of thought internal to the discipline

In classical vector analysis there are three integral formulae in $\\mathbb{R}^3$ that look independent but are essentially one:

1. **Green's formula** (a plane region): $\\iint_D \\left(\\frac{\\partial Q}{\\partial x} - \\frac{\\partial P}{\\partial y}\\right) dxdy = \\oint_{\\partial D} Pdx + Qdy$
2. **The Gauss–Ostrogradskii divergence formula** (a solid region): $\\iiint_V \\operatorname{div}\\mathbf{F}\\, dV = \\iint_{\\partial V} \\langle \\mathbf{F}, \\mathbf{n}\\rangle \\, dA$
3. **The classical Stokes formula** (a surface): $\\iint_S \\langle \\nabla \\times \\mathbf{F}, \\mathbf{n}\\rangle \\, dA = \\oint_{\\partial S} \\mathbf{F}\\cdot d\\mathbf{s}$

All of them have the form “some integral over a region equals another integral over its boundary”. The language of [differential forms](/nodes/dg%3Adifferential-form) reveals this common structure: these formulae are in fact the same theorem in different dimensions. The generalized Stokes theorem is the final form of that unified statement.

#### A line of thought from external applications

In electrodynamics, fluid mechanics and continuum mechanics, conservation laws in integral form (such as Maxwell's equations and the Navier–Stokes equations) all rely on formulae that convert a volume integral into a surface integral and back. The generalized Stokes theorem provides the rigorous mathematical framework for these conversions.

#### An aesthetic and structural line of thought

From the point of view of category theory, Stokes' theorem asserts that the exterior derivative operator $d$ and the boundary operator $\\partial$ are “adjoint” to each other under the bilinear pairing given by integration. This discovery led to the creation of [de Rham cohomology](/nodes/dg%3Apoincare-lemma) theory and ultimately to de Rham's theorem—the [de Rham cohomology](/nodes/dg%3Apoincare-lemma) of a [smooth manifold](/nodes/dg%3Asmooth-manifold) is isomorphic to its singular cohomology with real coefficients.

### Motivation for the construction

Start from the Newton–Leibniz formula on $\\mathbb{R}^1$:
$$\\int_a^b f'(x)dx = f(b) - f(a)$$

Regard the interval $[a,b]$ as a one-dimensional [manifold](/nodes/dg%3Amanifold) with boundary whose boundary is the two points $\\{a,b\\}$ (with a suitable orientation), and let the exterior derivative of the differential $0$-form $f$ be $df = f'(x)dx$. The formula then becomes $\\int_{[a,b]} df = \\int_{\\partial[a,b]} f$.

Generalising to higher dimensions: the integral over a $k$-dimensional [manifold](/nodes/dg%3Amanifold) with boundary of the exterior derivative $d\\omega$ of a $(k-1)$-form $\\omega$ equals the integral of $\\omega$ itself over the boundary. This is precisely the content of the generalized Stokes theorem.

---

## Form

### The canonical general form

The generalized Stokes theorem has several equivalent formulations; the two most commonly used are the following.

**Version one (compact [manifolds](/nodes/dg%3Amanifold) with boundary)**: let $M$ be an $n$-dimensional orientable [smooth manifold](/nodes/dg%3Asmooth-manifold) with boundary and let $\\omega$ be a $C^\\infty$ smooth $(n-1)$-[differential form](/nodes/dg%3Adifferential-form) on $M$ with compact support. Then
$$\\int_M d\\omega = \\int_{\\partial M} \\omega$$
where $\\partial M$ carries the boundary orientation induced by $M$ (the Stokes orientation), and the right-hand side is understood as the integral over $\\partial M$ of the pullback $i^*\\omega$ of $\\omega$ under the inclusion map $i: \\partial M \\hookrightarrow M$.

**Version two (the chain form)**: let $\\sigma$ be a smooth singular $(q+1)$-chain on a [smooth manifold](/nodes/dg%3Asmooth-manifold) $M$ and let $\\omega \\in \\Omega^q(M)$. Then
$$\\int_{\\partial \\sigma} \\omega = \\int_{\\sigma} d\\omega$$

**Version three (compact sets with smooth boundary in Euclidean space)**: let $B \\subset \\mathbb{R}^k$ be a compact set with smooth boundary and let $\\omega$ be a differentiable $(k-1)$-form defined on a neighbourhood of $B$. Then
$$\\int_B d\\omega = \\int_{\\partial B} \\omega$$

Of the three versions, version one is the one most often used in textbooks on [differentiable manifolds](/nodes/manifold%3Ack-atlas); version two places Stokes' theorem in the dual framework of chains and cochains, which makes it easy to connect with algebraic topology; version three is closest to the formulations of classical vector analysis.

### Analysis of the necessary conditions

#### Condition 1: orientability

If the [manifold](/nodes/dg%3Amanifold) $M$ is not orientable, the global integral cannot be defined well (its value depends on the choice of coordinate charts, and the sign is ambiguous). For example $\\mathbb{RP}^2$ (the real projective plane) is a non-orientable two-dimensional [manifold](/nodes/dg%3Amanifold), and one cannot define an integral with a consistent sign for all $2$-forms on it, so Stokes' theorem fails.

#### Condition 2: the boundary $\\partial M$ carries the induced orientation

The choice of boundary orientation affects the sign of the identity directly. The induced orientation on the boundary $\\partial M$ is determined as follows: if $x^1,\\dots,x^n$ are oriented coordinates for $M$ near a boundary point and $x^n \\geqslant 0$ is the inward direction, then $(-1)^{n-1}dx^1 \\wedge \\cdots \\wedge dx^{n-1}$ gives the induced orientation on $\\partial M$. If the opposite orientation is taken, the right-hand side of the identity changes sign.

#### Condition 3: $\\omega$ has compact support

If the support of $\\omega$ is not compact, the integrals on the two sides may diverge (fail to converge). For a compact [manifold](/nodes/dg%3Amanifold) $M$, every smooth form automatically has compact support, so the condition is satisfied automatically.

#### Condition 4: $\\omega$ is $C^\\infty$ (or at least $C^1$) smooth

If $\\omega$ is not smooth enough, the exterior derivative $d\\omega$ may fail to exist or to be integrable. For example, on $\\mathbb{R}^1$ take $\\omega$ to be an absolutely continuous function that is not $C^1$; then $d\\omega$ need not be a [differential form](/nodes/dg%3Adifferential-form) in the usual sense.

### Equivalent formulations

- **The integral of a closed form**: if $M$ is a compact orientable [manifold](/nodes/dg%3Amanifold) without boundary, then for every exact $n$-form $\\omega = d\\eta$ we have $\\int_M \\omega = 0$. Equivalently, for every closed $k$-form $\\omega$ and every $k$-dimensional [manifold](/nodes/dg%3Amanifold) $M$ without boundary, $\\int_M \\omega$ depends only on the cohomology class of $\\omega$.
- **The degree formula**: let $f: X \\to Y$ be a smooth map between compact oriented [manifolds](/nodes/dg%3Amanifold) without boundary. Then for every closed $k$-form $\\omega$ (with $k = \\dim X = \\dim Y$) we have $\\int_X f^*\\omega = (\\deg f)\\int_Y \\omega$.
- **The dual formulation**: writing $\\langle \\omega, c \\rangle = \\int_c \\omega$, Stokes' theorem becomes $\\langle d\\omega, c \\rangle = \\langle \\omega, \\partial c \\rangle$, that is, $d$ and $\\partial$ are dual operators.

### Classes of forms

The generalized Stokes theorem is itself a **theorem**, but it goes by different names and takes different forms in different contexts:
- when $n=1$ it is called the **Newton–Leibniz formula** (the fundamental theorem of calculus)
- when $n=2$ it is called **Green's formula**
- when $n=3$ and the region of integration is a solid, it is called the **Gauss–Ostrogradskii divergence theorem**
- when $n=3$ and the region of integration is a surface, it is called the **classical Stokes theorem**
- in algebraic topology it is called the **Stokes formula** or the generalized Stokes theorem

All of these can be regarded as special cases of the generalized Stokes theorem in various dimensions and in $n$-dimensional Euclidean space.

### How are the relevant statements expressed in natural language?

“The integral of the exterior derivative over a region equals the integral of the original form over its boundary.”

Or: “the integral over the boundary equals the integral of the exterior derivative over the interior.”

More vividly: “the whole equals the accumulation over its boundary.”

### A lower-dimensional formulation

In the most basic mathematical language, Stokes' theorem can be seen as the result of applying Fubini's theorem and the fundamental theorem of calculus to the coordinates repeatedly. For a rectangular region in $\\mathbb{R}^k$, write the $(k-1)$-form as
$$\\nu = \\sum_{i=1}^k (-1)^{i-1} f_i \\, dx^1 \\wedge \\cdots \\wedge \\widehat{dx^i} \\wedge \\cdots \\wedge dx^k$$
compute $d\\nu = \\sum_i \\frac{\\partial f_i}{\\partial x^i} dx^1 \\wedge \\cdots \\wedge dx^k$, and then integrate successively using Fubini's theorem; the integral in each direction reduces to the Newton–Leibniz formula.

From the point of view of categorical duality, Stokes' theorem asserts that $(d, \\partial)$ form a pair of adjoint operators, analogous to the relation between a linear map and its transpose in linear algebra.

### A higher-dimensional viewpoint

The generalized Stokes theorem is itself the generalisation of the **Newton–Leibniz formula** to arbitrary dimensions and arbitrary [smooth manifolds](/nodes/dg%3Asmooth-manifold). In other words, the fundamental theorem of calculus is the special case of Stokes' theorem on a $1$-dimensional [manifold](/nodes/dg%3Amanifold).

From a higher vantage point, Stokes' theorem is a prototype and a special case of the **Atiyah–Singer index theorem** (the deep theorem relating the analytic index to the topological index). It is also an indispensable tool in **Hodge theory**—Stokes' theorem can be used to prove the isomorphism between the space of harmonic forms and the [de Rham cohomology](/nodes/dg%3Apoincare-lemma) groups.

### Similar objects to be understood together

Comparison with the **divergence theorem** (Gauss' formula): the divergence theorem is the special case of the generalized Stokes theorem in which $n=3$ and the integrand is a $2$-form. Substituting the $2$-form $\\omega = F^1 dy\\wedge dz + F^2 dz\\wedge dx + F^3 dx\\wedge dy$ into the generalized Stokes theorem gives $\\iiint_V \\operatorname{div} \\mathbf{F}\\, dV = \\iint_{\\partial V} \\langle \\mathbf{F}, \\mathbf{n}\\rangle\\, dA$.

Comparison with the **residue theorem** (complex analysis): in the complex plane, Green's formula can be used to derive the Cauchy integral formula and the residue theorem from the general Stokes formula, which shows the deep connection between the theory of analytic functions and calculus on a [manifold](/nodes/dg%3Amanifold).

---

## Proof

### Proof sketch

Use a [partition of unity](/nodes/dg%3Apartition-of-unity) to localise the problem: since both sides of the identity are linear in $\\omega$, one may assume that the support of $\\omega$ is contained in some local coordinate neighbourhood $U$. Local coordinates turn the integrals into integrals over $\\mathbb{R}^k$ or over the upper half-space $\\mathbb{H}_+^k$, and one then computes and compares the two sides directly using Fubini's theorem and the fundamental theorem of calculus.

#### Detailed proof (the Mei Jiaqiang version)

Let $M$ be an $n$-dimensional orientable [manifold](/nodes/dg%3Amanifold) with boundary and let $\\omega$ be an $(n-1)$-[differential form](/nodes/dg%3Adifferential-form) on $M$ with compact support. By a [partition of unity](/nodes/dg%3Apartition-of-unity) we may assume that $\\omega$ is contained in some coordinate neighbourhood $U$, carrying coordinate functions $(x^1,\\dots,x^n)$ with $x^n \\geqslant 0$ (corresponding to a boundary point) or with $x^n$ unrestricted (corresponding to an interior point). In $U$ the form $\\omega$ can be written as
$$\\omega = \\sum_{i=1}^n (-1)^{i-1} f_i \\, dx^1 \\wedge \\cdots \\wedge \\widehat{dx^i} \\wedge \\cdots \\wedge dx^n$$

Then
$$d\\omega = \\sum_{i=1}^n \\frac{\\partial f_i}{\\partial x^i} \\, dx^1 \\wedge \\cdots \\wedge dx^n$$

There are two cases to consider.

**(1) $U \\cap \\partial M = \\varnothing$ (the support of $\\omega$ does not touch the boundary)**

In this case $\\int_{\\partial M} \\omega = 0$. On the other hand,
$$\\int_M d\\omega = \\int_U d\\omega = \\sum_{i=1}^n \\int_{\\mathbb{R}^n} \\frac{\\partial f_i}{\\partial x^i} \\, dx^1\\cdots dx^n$$

For the $i$-th term, integrate with respect to $x^i$ first:
$$\\int_{-\\infty}^{+\\infty} \\frac{\\partial f_i}{\\partial x^i} dx^i = \\lim_{R\\to\\infty} [f_i(\\dots,R,\\dots) - f_i(\\dots,-R,\\dots)] = 0$$
(because $f_i$ has compact support), so $\\int_M d\\omega = 0$. Both sides are $0$, and the identity holds.

**(2) $U \\cap \\partial M \\neq \\varnothing$**

In this case $U$ corresponds to an open set in $\\mathbb{H}_+^n$. Let the local coordinate expression of $\\omega$ be
$$\\omega = (-1)^{n-1} f_n \\, dx^1 \\wedge \\cdots \\wedge dx^{n-1} \\quad (\\text{only the } dx^{n-1} \\text{ term})$$
(the more general case reduces to this form by linearity). Then
$$d\\omega = \\frac{\\partial f_n}{\\partial x^n} dx^1 \\wedge \\cdots \\wedge dx^n$$

Hence
$$\\int_M d\\omega = \\int_{\\mathbb{H}_+^n} \\frac{\\partial f_n}{\\partial x^n} dx^1\\cdots dx^n = \\int_{\\mathbb{R}^{n-1}} \\left(\\int_0^{+\\infty} \\frac{\\partial f_n}{\\partial x^n} dx^n\\right) dx^1\\cdots dx^{n-1}$$

By the fundamental theorem of calculus and the compact-support property,
$$\\int_0^{+\\infty} \\frac{\\partial f_n}{\\partial x^n} dx^n = -f_n(x^1,\\dots,x^{n-1},0)$$

while the pullback of $\\omega$ to the boundary is
$$i^*\\omega = f_n(x^1,\\dots,x^{n-1},0) dx^1 \\wedge \\cdots \\wedge dx^{n-1}$$
(the signs match after taking the suitable induced orientation). Therefore
$$\\int_M d\\omega = -\\int_{\\mathbb{R}^{n-1}} f_n(x^1,\\dots,x^{n-1},0) dx^1\\cdots dx^{n-1} = \\int_{\\partial M} \\omega$$

Combining the two cases, the generalized Stokes theorem holds.

#### Another line of proof (the Guillemin & Pollack version)

Use a local parametrisation $h: U \\to X$ (with $U \\subset \\mathbb{R}^k$ or $\\mathbb{H}^k$) to pull the integrals back to Euclidean space. Let $\\nu = h^*\\omega$ be the $(k-1)$-form on $U$; then
$$\\int_X d\\omega = \\int_U h^*(d\\omega) = \\int_U d(h^*\\omega) = \\int_U d\\nu$$
$$\\int_{\\partial X} \\omega = \\int_{\\partial U} h^*\\omega = \\int_{\\partial U} \\nu$$

The problem reduces to the standard situation in $\\mathbb{R}^k$ (or $\\mathbb{H}^k$): expand $\\nu$ and integrate successively using Fubini's theorem, applying the fundamental theorem of calculus each time. When $U \\subset \\mathbb{R}^k$ (that is, the parametrised region does not touch the boundary), $\\int_{\\partial U} \\nu = 0$ and $\\int_U d\\nu = 0$; when $U \\subset \\mathbb{H}^k$ and touches the boundary, a direct computation verifies that $\\int_U d\\nu = \\int_{\\partial U} \\nu$.

---

## Applications

### Direct applications

**Example 1: the divergence theorem.** Let $M$ be an oriented [manifold](/nodes/dg%3Amanifold) with boundary and with smooth boundary in $\\mathbb{R}^3$, and let $\\mathbf{F}$ be a [smooth vector field](/nodes/dg%3Asmooth-vector-field). Take the $2$-form
$$\\omega = F^1 dy\\wedge dz + F^2 dz\\wedge dx + F^3 dx\\wedge dy$$
Then $d\\omega = (\\operatorname{div} \\mathbf{F}) dx\\wedge dy\\wedge dz$, and substituting into the generalized Stokes theorem gives
$$\\iiint_M \\operatorname{div} \\mathbf{F}\\, dV = \\iint_{\\partial M} \\langle \\mathbf{F}, \\mathbf{n}\\rangle \\, dA$$

**Example 2: the classical Stokes theorem.** Let $S$ be an oriented surface in $\\mathbb{R}^3$ and let $\\mathbf{F}$ be a [smooth vector field](/nodes/dg%3Asmooth-vector-field). Take the $1$-form
$$\\omega = F^1 dx + F^2 dy + F^3 dz$$
Then $d\\omega = (\\nabla\\times\\mathbf{F})_1 dy\\wedge dz + (\\nabla\\times\\mathbf{F})_2 dz\\wedge dx + (\\nabla\\times\\mathbf{F})_3 dx\\wedge dy$, and substituting gives
$$\\iint_S \\langle \\nabla\\times\\mathbf{F}, \\mathbf{n}\\rangle\\, dA = \\oint_{\\partial S} \\mathbf{F} \\cdot d\\mathbf{s}$$

**Example 3: Green's formula.** Take a bounded region $D$ in $\\mathbb{R}^2$ and apply Stokes' theorem to the $1$-form $\\omega = Pdx + Qdy$:
$$\\iint_D \\left(\\frac{\\partial Q}{\\partial x} - \\frac{\\partial P}{\\partial y}\\right) dxdy = \\oint_{\\partial D} Pdx + Qdy$$

**Example 4: the fundamental theorem of calculus.** Take the $1$-dimensional [manifold](/nodes/dg%3Amanifold) with boundary $M = [a,b]$ (oriented in the direction of increasing $x$) and the $0$-form $\\omega = f$ (a smooth function). Then $d\\omega = f'(x)dx$, and Stokes' theorem gives
$$\\int_a^b f'(x)dx = f(b) - f(a)$$

**Example 5: the integral of an exact form on a closed [manifold](/nodes/dg%3Amanifold) is zero.** If $M$ is a compact orientable [manifold](/nodes/dg%3Amanifold) without boundary and $\\omega = d\\eta$, then $\\int_M \\omega = \\int_{\\partial M} \\eta = 0$, because $\\partial M = \\varnothing$. This conclusion is a basic tool of [de Rham cohomology](/nodes/dg%3Apoincare-lemma) theory.

### Indirect applications

#### Applications in mathematics

- **Degree of a map (Brouwer degree)**: the generalized Stokes theorem is the core tool for proving the degree formula $\\int_X f^*\\omega = (\\deg f)\\int_Y \\omega$, from which one can derive the **Gauss–Bonnet theorem** (the total curvature of a surface equals $2\\pi$ times the Euler characteristic), **Brouwer's fixed-point theorem** and the **fundamental theorem of algebra**.
- **[de Rham cohomology](/nodes/dg%3Apoincare-lemma)**: Stokes' theorem can be used to prove that the integral is well defined on the cohomology class of a closed form, and hence to establish the isomorphism between [de Rham cohomology](/nodes/dg%3Apoincare-lemma) and singular cohomology (de Rham's theorem).
- **Hodge theory**: on a compact Riemannian [manifold](/nodes/dg%3Amanifold), Stokes' theorem is used to prove the self-adjointness of the Laplace operator and the isomorphism between the space of harmonic forms and the [de Rham cohomology](/nodes/dg%3Apoincare-lemma) groups (Hodge's theorem).
- **Lefschetz duality**: in the homology theory of [manifolds](/nodes/dg%3Amanifold) with boundary, the duality between $d$ and $\\partial$ revealed by the Stokes formula is the basis of the Lefschetz duality theorem.

#### Applications in physics

- **Electromagnetism**: the integral form of Maxwell's equations (such as Faraday's law $\\oint_{\\partial S} \\mathbf{E}\\cdot d\\mathbf{l} = -\\frac{d}{dt}\\iint_S \\mathbf{B}\\cdot d\\mathbf{A}$) is in essence a direct application of Stokes' theorem in physics.
- **Fluid mechanics**: the divergence theorem relates a volume integral to a surface integral, and it is the mathematical basis of the integral form of the laws of conservation of mass and momentum.
- **Heat conduction**: the heat flowing through the boundary equals the heat produced (or absorbed) by sources in the interior; the mathematical expression of this physical conservation law is precisely the divergence theorem.

---

## Generalisations

- **Generalising the [manifold](/nodes/dg%3Amanifold)**: Stokes' theorem generalises to **[manifolds](/nodes/dg%3Amanifold) with corners**, whose boundary is assembled from faces of different dimensions; the idea of the proof is similar to the standard case.
- **Generalising the forms**: it generalises to **currents**—de Rham unified [differential forms](/nodes/dg%3Adifferential-form) and chains in the notion of a current, and Stokes' theorem still holds for them.
- **The non-smooth case**: for regions with Lipschitz boundary or piecewise smooth boundary, Stokes' theorem still holds in a suitable Sobolev-space framework; this is an important generalisation in the theory of partial differential equations.
- **From real to complex coefficients**: it generalises to Dolbeault cohomology on a **complex [manifold](/nodes/dg%3Amanifold)**, with a corresponding Dolbeault lemma and a generalised Stokes-type formula.
- **A non-commutative generalisation**: in non-commutative geometry the form of Stokes' theorem is given by a non-commutative integral together with an operator in cyclic (co)homology.

#### Open problems

Stokes' theorem is itself a mature classical result, but its generalisations to various kinds of generalised spaces (such as fractals, metric measure spaces and Wiener space) are still an active direction of research. For example, the infinite-dimensional Stokes theorem on **path space** involves stochastic analysis and Malliavin calculus.

---

## Common misconceptions

**Misconception 1: Stokes' theorem is just a surface-integral formula.**
The truth: the classical Stokes theorem (for surfaces in $\\mathbb{R}^3$) is only a special case. The generalized Stokes theorem holds on [manifolds](/nodes/dg%3Amanifold) of arbitrary dimension and unifies Green's formula, the divergence theorem, the classical Stokes theorem and even the fundamental theorem of calculus into one and the same formula.

**Misconception 2: the boundary orientation is irrelevant.**
The truth: the boundary orientation is crucial. If the boundary is given the opposite orientation, the right-hand side of the identity acquires an extra minus sign. The definition of the induced orientation (using the outward normal vector or a restriction of coordinates) has to be handled carefully. For instance, in the one-dimensional case $\\int_a^b f'(x)dx = f(b) - f(a)$, the order of the signs on the right-hand side depends on the positive orientation of the interval $[a,b]$ (from $a$ to $b$).

**Misconception 3: the two integrals in $\\int_M d\\omega = \\int_{\\partial M} \\omega$ are the same kind of integral.**
The truth: the left-hand side is the integral of an $n$-form over an $n$-dimensional [manifold](/nodes/dg%3Amanifold), while the right-hand side is the integral of an $(n-1)$-form over an $n-1$-dimensional [manifold](/nodes/dg%3Amanifold); the two are defined differently (the dimensions of the regions of integration differ). The miracle of the identity is that they are made equal through the exterior derivative $d$ and the boundary operator $\\partial$.

**Misconception 4: as long as $M$ is a [smooth manifold](/nodes/dg%3Asmooth-manifold), Stokes' theorem holds for every $\\omega$.**
The truth: $\\omega$ must have compact support, or $M$ itself must be compact (in which case $\\omega$ automatically has compact support). Otherwise the integrals on the two sides may diverge or fail to be defined.

**Misconception 5: $d^2 = 0$ and $\\partial^2 = 0$ are independent facts.**
The truth: the two facts are closely related through duality. Stokes' theorem shows that $d$ and $\\partial$ are dual under integration, so that $d^2 = 0$ and $\\partial^2 = 0$ are dual statements: $\\langle d^2\\omega, c \\rangle = \\langle \\omega, \\partial^2 c \\rangle$.

---

## Insights

- **The power of unification**: in mathematics, a concise statement that unifies many classical results that look unrelated is an important driving force in the development of a theory. The generalized Stokes theorem is a perfect example—it unifies several independent formulae of calculus into one highly concise identity.
- **Dualistic thinking**: every “structure” has its dual structure. In the generalized Stokes theorem, the pairing between $d$ (an analytic operator) and $\\partial$ (a geometric operator) reminds us that seeking the natural dualities between mathematical objects often brings deep insight.
- **From the local to the global**: the proof of the generalized Stokes theorem (reducing to a local computation by a [partition of unity](/nodes/dg%3Apartition-of-unity)) embodies a core style of thought in differential geometry—studying global properties by means of local tools.

---

## Summary

### The idea

**“The integral of the exterior derivative over a region equals the integral of the original form over its boundary.”** Or: **“the differential operator $d$ and the boundary operator $\\partial$ are dual under integration.”**

At a deeper level: the generalized Stokes theorem reveals an inner unity between analysis (integration, differentiation) and geometric topology (boundaries, [manifolds](/nodes/dg%3Amanifold)), and it is a model example of the unity of mathematics.

### Methods

| Method | Where it is used in the notes |
|------|-------------------|
| **[Partitions of unity](/nodes/dg%3Apartition-of-unity)** | decomposing a global integration problem into integrals over local coordinate neighbourhoods |
| **Local coordinates** | turning an integral on a [manifold](/nodes/dg%3Amanifold) into a Riemann integral in Euclidean space |
| **Fubini's theorem + the fundamental theorem of calculus** | the core computational tools, turning a $k$-fold integral into iterated single integrals |
| **Linearity + compact support** | reducing the cases to be handled by linear decomposition, and using compact support to make the boundary terms vanish |

---

## Looking back and asking

- Why does the generalized Stokes theorem require the [manifold](/nodes/dg%3Amanifold) to be orientable? If the [manifold](/nodes/dg%3Amanifold) is not orientable, where exactly does the problem lie?
- Can homotopy invariance (that is, homotopic maps inducing the same pullback integral) be derived from the generalized Stokes theorem?
- How should the generalized Stokes theorem be understood in the case $n=0$? (Hint: what is the boundary of a $0$-dimensional [manifold](/nodes/dg%3Amanifold)?)
- Can $d^2 = 0$ and $\\partial^2 = 0$ be derived from each other by means of Stokes' theorem?
- If $M$ is an infinite-dimensional [manifold](/nodes/dg%3Amanifold), does Stokes' theorem still make sense? (Hint: integration on Wiener space.)

---

### References

1. Victor W. Guillemin, Alan Pollack. *Differential Topology*. American Mathematical Society, 2011. ISBN 9780821851937.
2. Wolfgang Kühnel. *Differential Geometry: Curves — Surfaces — Manifolds*, Third Edition.
3. Shoshichi Kobayashi. *Differential Geometry of Curves and Surfaces*. Springer, 1995.
4. John M. Lee. *Introduction to Riemannian Manifolds*, Second Edition. Springer. ISBN 978-1-4612-4180-5.
5. B. A. Dubrovin, A. T. Fomenko, S. P. Novikov. *Modern Geometry — Methods and Applications, Part I: The Geometry of Surfaces, Transformation Groups, and Fields*. Springer. ISBN 978-1-4684-9946-9.
6. B. A. Dubrovin, S. P. Novikov, A. T. Fomenko. *Modern Geometry — Methods and Applications, Part II: The Geometry and Topology of Manifolds*. Springer, 1985. ISBN 978-1-4612-1100-6.
7. B. A. Dubrovin, A. T. Fomenko, S. P. Novikov. *Modern Geometry — Methods and Applications, Part III: Introduction to Homology Theory*. Springer. ISBN 978-0-387-97271-8.
8. William Fulton. *Algebraic Topology: A First Course*. Graduate Texts in Mathematics 153, Springer, 1995.
9. \`陈维桓. 微分几何引论. 高等教育出版社, 2013.\` (Chen Weihuan, *An Introduction to Differential Geometry*, Higher Education Press, 2013).
10. \`梅加强. 流形与几何初步. 2012.\` (Mei Jiaqiang, *Manifolds and Introductory Geometry*, 2012).
11. \`姜伯驹. 同调论. 北京大学出版社, 2006.\` (Jiang Boju, *Homology Theory*, Peking University Press, 2006).
12. \`А. С. 米先柯, А. Т. 福明柯. 微分几何与拓扑学简明教程.\` (A. S. Mishchenko, A. T. Fomenko, *A Concise Course in Differential Geometry and Topology*).
13. \`Jean-Pierre Françoise, Gregory L. Naber, 等. 数学物理学百科全书 11：代数拓扑；辛几何与拓扑；常微分和偏微分方程. 2008.\` (Jean-Pierre Françoise, Gregory L. Naber et al., *Encyclopedia of Mathematical Physics 11: Algebraic Topology; Symplectic Geometry and Topology; Ordinary and Partial Differential Equations*, 2008).
14. Christian Bär. *Elementary Differential Geometry*. Cambridge University Press, 2010.
15. \`伍鸿熙, 陈维桓. 黎曼几何选讲. 北京大学出版社, 2020.\` (Wu Hongxi, Chen Weihuan, *Selected Topics in Riemannian Geometry*, Peking University Press, 2020).`,

  'dg:poincare-lemma': `## The Poincaré lemma

> The Poincaré lemma is a basic result of differential geometry and topology. It asserts that on a contractible [manifold](/nodes/dg%3Amanifold) (such as $\\mathbb{R}^n$ or a disc) every closed form is exact. This conclusion reveals deeply the fact that “a closed form is always locally exact”, and hence that the [de Rham cohomology](/nodes/dg%3Apoincare-lemma) groups reflect the global topological properties of a [manifold](/nodes/dg%3Amanifold) rather than its local properties.

**Source tags.** #differential-geometry #deRham-cohomology #theorem

**Source.** The read-only snapshot \`G:/DifferentialGeometry/object/thm/Poincare 引理.md\` (see \`data/dg/\`).

---

---

## Prerequisites

### Essential

- **[Differentiable manifolds](/nodes/manifold%3Ack-atlas)**: the basic notions of a [smooth manifold](/nodes/dg%3Asmooth-manifold), tangent and cotangent spaces, and the definitions of vector fields and [tensor](/nodes/dg%3Atensor) fields.
- **[Differential forms](/nodes/dg%3Adifferential-form)**: $\\Omega^k(M)$ (the [vector space](/nodes/bg%3Alinear%3Avector) of smooth [differential forms](/nodes/dg%3Adifferential-form) of degree $k$ on $M$), the exterior product $\\wedge$, and the properties of the wedge product.
- **The exterior derivative**: the operator $d: \\Omega^k(M) \\to \\Omega^{k+1}(M)$, satisfying $d^2 = 0$ and the Leibniz rule $d(\\alpha \\wedge \\beta) = d\\alpha \\wedge \\beta + (-1)^{\\deg\\alpha} \\alpha \\wedge d\\beta$.
- **Pullback by smooth maps**: if $f: M \\to N$ is a smooth map, then the pullback $f^*: \\Omega^k(N) \\to \\Omega^k(M)$ commutes with the exterior derivative: $f^* \\circ d = d \\circ f^*$.

The material above may be consulted in the standard textbooks on [manifolds](/nodes/dg%3Amanifold) and [differential forms](/nodes/dg%3Adifferential-form).

### Supporting

- **Vector calculus**: the gradient, curl and divergence; Green’s theorem, the Gauss divergence theorem and Stokes’ theorem. These supply intuitive physical pictures of the Poincaré lemma for $k = 1,2,3$.
- **Homotopy and homotopy equivalence**: two maps $f,g: X \\to Y$ are called homotopic if there is a continuous map $H: [0,1] \\times X \\to Y$ with $H(0,\\cdot)=f$ and $H(1,\\cdot)=g$. The notion of homotopy equivalence helps in understanding what “contractible” means.
- **The fundamental group and simple connectedness**: a simply connected space (with trivial fundamental group) is the important intuitive background for the notions of a “star-shaped region” and of “contractibility” in the Poincaré lemma.

### Further

- **The de Rham theorem**: there is a canonical isomorphism between the [de Rham cohomology](/nodes/dg%3Apoincare-lemma) groups $H_{dR}^*(M;\\mathbb{R})$ and the singular cohomology groups $H^*(M;\\mathbb{R})$ of the [manifold](/nodes/dg%3Amanifold), which bridges the two great domains of analysis ([differential forms](/nodes/dg%3Adifferential-form)) and topology (singular cohomology).
- **Hodge theory**: on a compact oriented Riemannian [manifold](/nodes/dg%3Amanifold) every [de Rham cohomology](/nodes/dg%3Apoincare-lemma) class has a unique harmonic representative; its central tool, the Laplacian $\\Delta = d\\delta + \\delta d$, works together with the Poincaré lemma to compute cohomology groups.
- **The Mayer–Vietoris exact sequence**: splitting a [manifold](/nodes/dg%3Amanifold) into an open cover gives a long exact sequence for computing [de Rham cohomology](/nodes/dg%3Apoincare-lemma) groups; combined with the Poincaré lemma it allows one to compute the cohomology of such [manifolds](/nodes/dg%3Amanifold) as the spheres $S^n$.
- **Sheaf cohomology and transgression**: in the more general framework of sheaf theory, the Poincaré lemma corresponds to the exactness of the sheaf $\\mathbb{R}$; in fibre bundle theory, the phenomenon that a closed form becomes exact after pullback is called transgression.

---

## Motivation

### Motivation for introducing it

#### A thread internal to the discipline

In the theory of [differentiable manifolds](/nodes/manifold%3Ack-atlas) the exterior derivative $d$ satisfies $d^2 = 0$, so every exact form ($\\omega = d\\eta$) must be closed ($d\\omega = 0$). A very natural inverse question then arises:

> **Is every closed form exact?**

If the answer were always yes, then the [de Rham cohomology](/nodes/dg%3Apoincare-lemma) groups $H_{dR}^k(M) = Z^k/B^k$ would always vanish and the theory would lose its value. It was therefore urgent to determine under what conditions a closed form is exact and under what conditions it is not. The Poincaré lemma answers the local case in the affirmative — **in some neighbourhood of every point a closed form is always exact** — thereby pinning the question down to the global topology of the [manifold](/nodes/dg%3Amanifold).

#### A thread from outside

In physics a conservative force field $\\mathbf{F}$ satisfies $\\nabla \\times \\mathbf{F} = 0$ (that is, the corresponding 1-form is closed), and one always hopes to find a potential function $V$ with $\\mathbf{F} = -\\nabla V$ (that is, the 1-form is exact). The vector potential in electromagnetism is a similar question: the Faraday 2-form $F$ satisfies $dF = 0$, so is there a 1-form $A$ (the electromagnetic potential) with $F = dA$? The Poincaré lemma supplies the mathematical basis for these questions: a potential always exists locally, while its global existence depends on the topology of the space.

#### An aesthetic/structural thread

Stokes’ theorem $\\int_M d\\omega = \\int_{\\partial M} \\omega$ puts integration and the exterior derivative in duality. If $\\omega$ is closed ($d\\omega = 0$), its integral behaviour depends only on the topological boundary properties of the region. The Poincaré lemma guarantees the local integrability of such forms, and lays the cornerstone for the duality between [de Rham cohomology](/nodes/dg%3Apoincare-lemma) and singular homology (the de Rham theorem), making possible a unification of analytic and topological structure.

### Motivation for the construction

Why is the Poincaré lemma ultimately stated as “on a star-shaped region (or a contractible [manifold](/nodes/dg%3Amanifold)) every closed form is exact”?

At first it was observed in $\\mathbb{R}^n$ that if the coefficients of a $1$-form $\\omega = f_i dx^i$ satisfy $\\partial_i f_j = \\partial_j f_i$ (that is, $d\\omega = 0$), then a function $F$ can be constructed by the line integral $\\int_Q^P f_i dx^i$ such that $\\omega = dF$. This construction works on any bounded convex region of $\\mathbb{R}^n$, because the condition for the integral to be independent of the path requires exactly that the region be simply connected. It was thus realised that the key point is that the region “has no holes”.

Mathematicians then generalised the construction from convex regions to the more general “star-shaped regions”: there is a point $x_0$ such that the segment joining any point of the region to $x_0$ is entirely contained in the region. For $k$-forms, introducing the parametrisation $t \\mapsto tx$ (with $0$ as the centre of the star) allows one to construct an integral operator $K$ (called the homotopy operator or potential operator) which explicitly gives $\\omega = d(K\\omega)$.

Going further, through the notion of homotopy equivalence it was found that “contractible” is the most essential condition: a contractible [manifold](/nodes/dg%3Amanifold) can be contracted continuously to a point, and its topology is no different from that of a convex neighbourhood of $\\mathbb{R}^n$. The Poincaré lemma thus acquired its most general formulation: **on a contractible [manifold](/nodes/dg%3Amanifold), a closed form must be exact**.

---

## Form

### Canonical general form

The Poincaré lemma has several equivalent formulations, each suited to a different situation:

| Formulation | Where it applies | Features |
|---------|---------|------|
| If $U \\subset \\mathbb{R}^n$ is a star-shaped open set, then for $k \\ge 1$ every closed $k$-form on $U$ is exact. | computation in local coordinates, explicit construction of the homotopy operator | concrete hypotheses, convenient for a constructive proof |
| $H_{dR}^k(\\mathbb{R}^n) \\cong \\begin{cases} \\mathbb{R}, & k = 0,\\\\ \\{0\\}, & k > 0. \\end{cases}$ | the starting point for computing [de Rham cohomology](/nodes/dg%3Apoincare-lemma) | stated in the language of cohomology, concise and elegant |
| If $M$ is a contractible [manifold](/nodes/dg%3Amanifold), then for $k \\ge 1$ every closed $k$-form on $M$ is exact. | applications on general [manifolds](/nodes/dg%3Amanifold) | the most essential formulation, with the weakest hypotheses |
| The homomorphism $p^*: H^k(X) \\to H^k(X \\times \\mathbb{R})$ induced by the projection $p: X \\times \\mathbb{R} \\to X$ is an isomorphism. | proofs of homotopy invariance, including the compactly supported case | a functorial formulation, convenient for use with the Mayer–Vietoris sequence |

Among these forms, the **star-shaped-region version** is the most direct and the easiest to prove constructively; the **contractible-[manifold](/nodes/dg%3Amanifold) version** is the most abstract and the widest in scope; and the **projection-isomorphism version** is the most convenient for working in the framework of homological algebra.

### Analysis of the necessary conditions

The Poincaré lemma (let $U$ be a star-shaped region, $k \\ge 1$; every closed $k$-form on $U$ is exact) has two central hypotheses: **$U$ is star-shaped (contractible)** and **$k \\ge 1$**. Each is examined below for its necessity.

#### Condition 1: $U$ must be star-shaped (or at least contractible)

If the star-shaped hypothesis is dropped the conclusion fails. The classical counterexample considers, on $\\mathbb{R}^2 \\setminus \\{0\\}$ (the punctured plane, which is not simply connected and certainly not contractible), the 1-form

$$
\\omega = \\frac{-y\\,dx + x\\,dy}{x^2 + y^2}.
$$

One checks easily that $d\\omega = 0$, that is, $\\omega$ is closed. But  $\\omega$ is not exact; otherwise, by Stokes’ theorem, the integral of $\\omega$ once around the origin would be zero, whereas a direct computation gives

$$
\\int_{S^1} \\omega = 2\\pi \\neq 0,
$$

so $\\omega$ is not an exact form. This example shows that **a non-trivial topology of the region (the presence of a “hole”) obstructs a closed form from being exact**.

More generally, for $\\mathbb{R}^n \\setminus \\{0\\}$ ($n \\ge 2$) one can construct the $(n-1)$-form

$$
\\omega_{n-1} = \\sum_{i=1}^{n} (-1)^{i-1} \\frac{x_i}{(x_1^2 + \\cdots + x_n^2)^{n/2}} \\, dx_1 \\wedge \\cdots \\wedge \\widehat{dx_i} \\wedge \\cdots \\wedge dx_n,
$$

which is closed but not exact, and satisfies $\\int_{S^{n-1}} \\omega_{n-1} \\neq 0$.

#### Condition 2: $k \\ge 1$

When $k = 0$, a $0$-form is just a smooth function $f$, and $f$ is closed if and only if $df = 0$, that is, $f$ is locally constant. On a connected $\\mathbb{R}^n$ (or any connected [manifold](/nodes/dg%3Amanifold)) a locally constant function is globally constant, so $H_{dR}^0(\\mathbb{R}^n) \\cong \\mathbb{R}$ is non-trivial. The Poincaré lemma does not assert anything for $k=0$ — indeed, for $k=0$ the cohomology group measures the number of connected components of the [manifold](/nodes/dg%3Amanifold).

### Equivalent expressions

1. **The language of cohomology**: for a contractible [manifold](/nodes/dg%3Amanifold) $M$,
   $$
   H_{dR}^k(M;\\mathbb{R}) \\cong \\begin{cases}
   \\mathbb{R}, & k = 0,\\\\
   0, & k > 0.
   \\end{cases}
   $$

2. **The language of the homotopy operator**: there is a linear operator $K: \\Omega^k(U) \\to \\Omega^{k-1}(U)$ such that for every $\\omega$,
   $$
   \\omega = d(K\\omega) + K(d\\omega).
   $$
   When $d\\omega = 0$ this gives $\\omega = d(K\\omega)$.

3. **The language of the projection isomorphism**: if $p: X \\times \\mathbb{R} \\to X$ is the projection, then $p^*: H^k(X) \\to H^k(X \\times \\mathbb{R})$ is an isomorphism (Poincaré Lemma 22.20, Fulton). Similarly, in compactly supported cohomology, $p_*: H_c^k(X \\times \\mathbb{R}) \\to H_c^{k-1}(X)$ is an isomorphism (Poincaré Lemma 22.26, Fulton).

4. **The language of sheaves**: on a [smooth manifold](/nodes/dg%3Asmooth-manifold) $M$, the de Rham complex $\\Omega^*_M$ formed by the sheaves of [differential forms](/nodes/dg%3Adifferential-form) is a resolution of $\\mathbb{R}_M$ (the constant sheaf), that is, the sequence
   $$
   0 \\to \\mathbb{R} \\to \\Omega^0_M \\xrightarrow{d} \\Omega^1_M \\xrightarrow{d} \\Omega^2_M \\xrightarrow{d} \\cdots
   $$
   is exact. This is precisely the formulation of the Poincaré lemma in the framework of sheaf theory.

### Kinds of statement

The theoretical framework in which the Poincaré lemma sits contains the following layers:

- **Differential topology / differential geometry**: the study of global properties of [differential forms](/nodes/dg%3Adifferential-form) on a [manifold](/nodes/dg%3Amanifold).
  - **[De Rham cohomology](/nodes/dg%3Apoincare-lemma) theory**: the study of the topology of a [manifold](/nodes/dg%3Amanifold) through closed forms modulo exact forms.
    - **The Poincaré lemma**: the core lemma of de Rham cohomology, saying that a closed form is locally exact.
    - **The Mayer–Vietoris exact sequence**: a generalisation of the Poincaré lemma into a computational tool.
    - **Poincaré duality**: the duality between cohomology and homology, given in its de Rham version by Poincaré duality (Taubes, Corollary 19.2).

At the level of applications, the Poincaré lemma can be further divided into:
- the **standard Poincaré lemma** (ordinary form, compactly supported form);
- the **relative Poincaré lemma** (for [manifolds](/nodes/dg%3Amanifold) with boundary, and for relative cohomology).

### How are the relevant statements expressed in natural language?

- “Locally, a closed form is always exact.”
- “If the derivative of a [differential form](/nodes/dg%3Adifferential-form) is zero, then on a small enough region it can be written as the derivative of another form.”
- “A conservative force field always has a potential function locally, but globally there may be an obstruction.”
- “If the space is ‘contractible’ (has no holes), then every closed form is exact.”

### Reduction

Restating the Poincaré lemma in more basic language:

- **Logical language**: let $U \\subset \\mathbb{R}^n$ be a convex open set and $\\omega \\in \\Omega^k(U)$. If $d\\omega = 0$, then $\\exists \\eta \\in \\Omega^{k-1}(U)$ with $\\omega = d\\eta$.
- **Categorical language**: for a contractible [manifold](/nodes/dg%3Amanifold) $M$, the de Rham complex $\\Omega^*(M)$ is a chain complex over $\\mathbb{R}$ with $H^k(\\Omega^*(M)) = 0$ for $k > 0$. This means that $\\Omega^*(M)$ is a resolution of $\\mathbb{R}$.
- **The language of vector calculus** (the special case $n=3$):
  - $k=1$: if $\\nabla \\times \\mathbf{F} = 0$, then there is an $f$ with $\\mathbf{F} = \\nabla f$.
  - $k=2$: if $\\nabla \\cdot \\mathbf{B} = 0$, then there is an $\\mathbf{A}$ with $\\mathbf{B} = \\nabla \\times \\mathbf{A}$.

### Lifting

In higher theoretical frameworks, the Poincaré lemma is a special case of the following more general results:

- **The de Rham theorem**: $H_{dR}^k(M) \\cong H^k(M;\\mathbb{R})$ (singular cohomology). The Poincaré lemma corresponds to the fact that the singular cohomology of $\\mathbb{R}^n$ is trivial.
- **Sheaf cohomology**: the Poincaré lemma is equivalent to saying that the sheaf resolution $\\Omega^*_M$ of $\\mathbb{R}_M$ is exact.
- **Derived categories**: the Poincaré lemma guarantees that $\\mathbb{R}_M \\to \\Omega^*_M$ is a quasi-isomorphism in the derived category; this is the foundation of Grothendieck’s theory of relative [de Rham cohomology](/nodes/dg%3Apoincare-lemma) (see the Poincaré lemma in topos theory: $(\\Omega^\\bullet_{X/S})_{\\mathrm{str}} \\to \\check{C}(\\Omega^\\bullet_{X/S})_{\\mathrm{str}}$ is a quasi-isomorphism).

### Understanding through links with similar objects, if the topic has any

- **The Dolbeault lemma**: the analogous conclusion in complex geometry — on a complex [manifold](/nodes/dg%3Amanifold), a $\\bar\\partial$-closed $(p,q)$-form is locally $\\bar\\partial$-exact.
- **[De Rham cohomology](/nodes/dg%3Apoincare-lemma) vs. Dolbeault cohomology**: the two are structurally similar; the Poincaré lemma corresponds to the Dolbeault lemma, and the de Rham complex to the Dolbeault complex.
- **The Poincaré lemma and Stokes’ theorem**: Stokes’ theorem is the integral version of the Poincaré lemma — the integral of a closed form over a boundary is zero, and (by Stokes’ theorem) the integral of an exact form over a closed chain is also zero. Together they constitute the duality between [de Rham cohomology](/nodes/dg%3Apoincare-lemma) and (singular) homology.

---

## Proof

### Proof sketch

The core idea of the Poincaré lemma is: **construct a homotopy operator (potential operator) $K$ which turns a $k$-form into a $(k-1)$-form by integrating along the radius, so that for every form $\\omega$ one has $\\omega = d(K\\omega) + K(d\\omega)$; when $\\omega$ is closed, $d\\omega = 0$, hence $\\omega = d(K\\omega)$ is an exact form.**

Alternatively, from the point of view of homotopy invariance: the projection $p: X \\times \\mathbb{R} \\to X$ and the embedding $s: X \\to X \\times \\mathbb{R}$ are homotopy inverses of each other, so they induce mutually inverse isomorphisms on [de Rham cohomology](/nodes/dg%3Apoincare-lemma); hence $H^*(X \\times \\mathbb{R}) \\cong H^*(X)$, and applying this repeatedly gives $H^*(\\mathbb{R}^n) \\cong H^*(\\text{a point})$.

### Detailed proof

#### Proof 1: an explicit construction on a star-shaped region (the homotopy-operator method)

Let $U \\subset \\mathbb{R}^n$ be a star-shaped open set with respect to the origin $0$. For a $k$-form on $U$,

$$
\\omega = \\sum_{1\\le i_1 < \\cdots < i_k \\le n} \\omega_{i_1\\cdots i_k}(x) \\, dx^{i_1} \\wedge \\cdots \\wedge dx^{i_k},
$$

define $K\\omega \\in \\Omega^{k-1}(U)$ as follows:

$$
(K\\omega)(x) = \\sum_{1\\le i_1 < \\cdots < i_k \\le n} \\sum_{\\alpha=1}^k (-1)^{\\alpha-1} \\left(\\int_0^1 t^{k-1}\\,\\omega_{i_1\\cdots i_k}(tx)\\,dt\\right) x^{i_\\alpha} \\, dx^{i_1} \\wedge \\cdots \\wedge \\widehat{dx^{i_\\alpha}} \\wedge \\cdots \\wedge dx^{i_k},
$$

where $\\widehat{dx^{i_\\alpha}}$ means that this term is omitted. A direct computation gives the key identity

$$
\\omega = d(K\\omega) + K(d\\omega).
$$

If $d\\omega = 0$, then $\\omega = d(K\\omega)$, so $\\omega$ is an exact form. This operator $K$ is the required potential operator. $\\square$

#### Proof 2: induction on the dimension, for $\\mathbb{R}^n$

**Step one**: $k = 0$. $H_{dR}^0(\\mathbb{R}^n) \\cong \\mathbb{R}$. A closed $0$-form $f$ satisfies $df = 0$, that is, $f$ is locally constant. Since $\\mathbb{R}^n$ is connected, $f$ is constant.

**Step two**: $k = n$. Let $\\omega = f\\,dx^1 \\wedge \\cdots \\wedge dx^n$, and put

$$
\\eta = \\left(\\int_0^{x^n} f(x^1,\\dots,x^{n-1},t)\\,dt\\right) dx^1 \\wedge \\cdots \\wedge dx^{n-1},
$$

so that $d\\eta = \\omega$, and hence $\\omega$ is exact.

**Step three**: $0 < k < n$. Let $\\omega$ be a closed $k$-form on $\\mathbb{R}^n$. Write $\\omega$ as

$$
\\omega = \\alpha_1 + \\alpha_2 \\wedge dx^n,
$$

where $\\alpha_1$ contains no $dx^n$ and $\\alpha_2$ is a $(k-1)$-form containing no $dx^n$. From $d\\omega = 0$ one deduces a relation satisfied by $\\alpha_2$, and then constructs $K\\omega$ so as to remove the terms containing $dx^n$, reducing the problem to a closed form on $\\mathbb{R}^{n-1}$. By the induction hypothesis a closed $k$-form on $\\mathbb{R}^{n-1}$ is exact, and hence the original form is exact as well. $\\square$

#### Proof 3: the homotopy operator and the projection isomorphism (Fulton)

Let $p: X \\times \\mathbb{R} \\to X$ be the projection and $s: X \\to X \\times \\mathbb{R}$ the map $x \\mapsto (x, 0)$. Construct a linear map

$$
H: \\Omega^k(X \\times \\mathbb{R}) \\to \\Omega^{k-1}(X \\times \\mathbb{R})
$$

as follows: in local coordinates, set $H$ equal to zero on forms containing no $dt$; on forms of the shape $dt \\wedge \\mu$ (where $\\mu$ contains no $dt$), set

$$
H(dt \\wedge \\mu)(x,t) = \\int_0^t \\mu(x,s)\\,ds,
$$

and then extend to all of $X \\times \\mathbb{R}$ by linearity and a [partition of unity](/nodes/dg%3Apartition-of-unity). A direct verification gives, for every form $\\omega$,

$$
\\omega - p^* s^*(\\omega) = d(H(\\omega)) + H(d(\\omega)).
$$

When $\\omega$ is closed, $\\omega - p^* s^*(\\omega) = d(H(\\omega))$ is an exact form, so $\\omega$ and $p^* s^*(\\omega)$ represent the same class in [de Rham cohomology](/nodes/dg%3Apoincare-lemma). Since $p^* s^* = (s \\circ p)^*$ and $s \\circ p \\simeq \\mathrm{id}_{X \\times \\mathbb{R}}$, one shows that $p^*$ and $s^*$ are mutually inverse on [de Rham cohomology](/nodes/dg%3Apoincare-lemma). $\\square$

#### Proof 4: a direct integral construction in case 1

In the special case $k=1$ the Poincaré lemma degenerates into a classical conclusion of vector analysis. Let $\\omega = f_k dx^k$ be a $1$-form with $d\\omega \\equiv 0$ (that is, $\\partial f_k / \\partial x^i \\equiv \\partial f_i / \\partial x^k$); then on the star-shaped region $U$ define

$$
F(P) = \\int_0^1 f_i(tx) x^i \\, dt,
$$

or, more generally, fix $Q \\in U$ and define

$$
F(P) = \\int_Q^P f_k dx^k,
$$

where the integral runs along any smooth path from $Q$ to $P$ (on a star-shaped region the integral is independent of the path); then $\\omega = dF$. $\\square$

---

## Applications

### Direct applications

**Example 1**: computing the [de Rham cohomology](/nodes/dg%3Apoincare-lemma) of $\\mathbb{R}^n$. The Poincaré lemma gives at once

$$
H_{dR}^k(\\mathbb{R}^n) \\cong 
\\begin{cases}
\\mathbb{R}, & k = 0,\\\\
0, & k > 0.
\\end{cases}
$$

**Example 2**: computing the [de Rham cohomology](/nodes/dg%3Apoincare-lemma) of the sphere $S^n$. Using the Poincaré lemma (the cohomology of $\\mathbb{R}^n$ is trivial) together with the Mayer–Vietoris exact sequence, one obtains recursively

$$
H_{dR}^k(S^n) \\cong 
\\begin{cases}
\\mathbb{R}, & k = 0 \\text{ or } k = n,\\\\
0, & \\text{otherwise}.
\\end{cases}
$$

**Example 3**: computing the [de Rham cohomology](/nodes/dg%3Apoincare-lemma) of $\\mathbb{R}^n \\setminus \\{0\\}$. From the Poincaré lemma (local version) together with the Mayer–Vietoris sequence one obtains

$$
H_{dR}^k(\\mathbb{R}^n \\setminus \\{0\\}) \\cong 
\\begin{cases}
\\mathbb{R}, & k = 0 \\text{ or } k = n-1,\\\\
0, & \\text{otherwise}.
\\end{cases}
$$

(All three examples are Problem 22.23, Fulton.)

### Indirect applications

#### Indirect applications in mathematics

- **Definition and computation of the degree of a map**: on $S^n$, from $H_{dR}^n(S^n) \\cong \\mathbb{R}$ one can define the degree of a smooth map $f: S^n \\to S^n$ as $\\int_{S^n} f^* \\omega_n / \\int_{S^n} \\omega_n$. The Poincaré lemma guarantees the exactness of $n$-forms on $\\mathbb{R}^n$, and this is the basis for proving that the $n$-th cohomology of $S^n$ is non-trivial.
- **Homotopy invariance**: if $f,g: X \\to Y$ are homotopic smooth maps, then $f^* = g^*: H^*(Y) \\to H^*(X)$. The proof of this conclusion relies on the Poincaré lemma (Guillemin & Pollack, Exercise 7).
- **The de Rham theorem**: the Poincaré lemma is a key step in the proof of the de Rham theorem.
- **Poincaré duality**: the Poincaré duality of [de Rham cohomology](/nodes/dg%3Apoincare-lemma) on a compact oriented [manifold](/nodes/dg%3Amanifold) ($H_{dR}^p(M) \\cong H_{dR}^{n-p}(M)$) also relies on the Poincaré lemma.
- **The Frobenius theorem and the classification of flat connections** (Taubes, Theorem 13.1, 13.2).
- **Thom classes and intersection numbers of sub[manifolds](/nodes/dg%3Amanifold)** (\`梅加强\`（Mei Jiaqiang）, §4.3).

#### The role in physics and computer science

- **Conservative force fields and potential energy**: in a gravitational field the closed $1$-form $\\varphi = g\\,dh$ corresponds to the potential energy $gh$ per unit mass; the Poincaré lemma says that this exact form corresponds to a potential function, and that locally a potential always exists. More generally, if the 1-form $\\varphi$ is closed (has zero curl), the work done along a closed path is zero and the motion of a particle obeys conservation of energy.
- **The vector potential in electromagnetism**: in four-dimensional spacetime the electromagnetic field [tensor](/nodes/dg%3Atensor) is $F = dA$ (with $A$ the electromagnetic potential). The source-free Maxwell equation $dF = 0$ is exactly the closedness condition; by the Poincaré lemma there always exists $A$ locally with $F = dA$, a fact that runs through electrodynamics.
- **Fluid mechanics**: the vorticity (curl) of a velocity field corresponds to the closedness of a $1$-form; on an irrotational region a velocity potential exists.
- **Computational conformal geometry**: in computer graphics, surface parametrisation and mesh processing are carried out with the help of [de Rham cohomology](/nodes/dg%3Apoincare-lemma) and a discrete version of the Poincaré lemma.

---

## Generalizations

### Relaxing the hypotheses

- **From star-shaped regions to contractible [manifolds](/nodes/dg%3Amanifold)**: the Poincaré lemma holds for any contractible [manifold](/nodes/dg%3Amanifold), not only for star-shaped subsets of $\\mathbb{R}^n$. For example, it applies to any open set [homeomorphic](/nodes/dg%3Ahomeomorphism) to $\\mathbb{R}^n$ (such as the disc $D^n$).
- **From smooth to continuous/differentiable**: in the $C^1$ or Lipschitz category there are corresponding versions of the Poincaré lemma, but they require finer tools of analysis.

### Generalizing the conclusion

- **The compactly supported Poincaré lemma** (Fulton, Poincaré Lemma 22.26): for forms with compact support, the projection $p: X \\times \\mathbb{R} \\to X$ induces an isomorphism $p_*: H_c^k(X \\times \\mathbb{R}) \\to H_c^{k-1}(X)$.
- **The relative Poincaré lemma**: there are corresponding generalisations on [manifolds](/nodes/dg%3Amanifold) with boundary, and in settings involving relative cohomology.
- **The sheaf-theoretic version**: in topos theory, for a smooth scheme $X/S$, the de Rham complex gives a quasi-isomorphism $(\\Omega^\\bullet_{X/S})_{\\mathrm{str}} \\to \\check{C}(\\Omega^\\bullet_{X/S})_{\\mathrm{str}}$ (\`黎景辉\`（Li Jinghui）, Lemma 8.66).

### Related open problems

- **The Novikov conjecture**: it concerns the homotopy invariance of higher $\\Gamma$-invariants; generalisations of the Poincaré lemma play a role in higher index theory.
- **The Hodge conjecture**: on a complex projective [manifold](/nodes/dg%3Amanifold), when is a closed $(p,p)$-form the Chern class of an algebraic cycle? This is an extremely deep global question, and may be regarded as the unsolved global version of the Poincaré lemma in complex geometry.

---

## Common misconceptions

**Misconception 1: a closed form is an exact form.**

This is the most common misconception, arising because the property $d^2 = 0$ easily suggests the mistaken association “closed ⇒ exact”. In fact $d^2 = 0$ guarantees only the direction “exact ⇒ closed”; the converse requires extra topological conditions (star-shaped, contractible). As the counterexample on the punctured plane, $\\omega = \\frac{-y\\,dx + x\\,dy}{x^2 + y^2}$, shows, a form that is closed but not exact carries topological information about the space — and this is precisely what [de Rham cohomology](/nodes/dg%3Apoincare-lemma) studies.

**Misconception 2: as long as the region is simply connected, a closed $k$-form is exact (for every $k$).**

Simple connectedness (trivial fundamental group) guarantees this only for $k=1$ — because the closedness of a $1$-form corresponds to a conservative force field, and the path-independence of its integral requires every closed path to be contractible. But for $k > 1$, a trivial fundamental group is not enough; higher homotopy groups (or, more precisely, contractibility of the space) are needed. For example, $S^2$ is simply connected, yet $H_{dR}^2(S^2) \\cong \\mathbb{R} \\neq 0$, which shows that there exist closed $2$-forms that are not exact. The “contractibility” required by the Poincaré lemma is far stronger than “simple connectedness”.

**Misconception 3: on a star-shaped region the construction of the potential is unique.**

In the construction of the homotopy operator $K\\omega$, the form $K\\omega$ is not unique, because one may add to $K\\omega$ itself any closed $(k-2)$-form without changing $\\omega = d(K\\omega)$. In physics this non-uniqueness is called **gauge invariance**. For example, the electromagnetic potential $A$ may be modified by adding an exact $1$-form $df$ without changing $F = dA$.

**Misconception 4: the Poincaré lemma holds only in $\\mathbb{R}^n$.**

Although the most classical version is indeed about star-shaped subsets of $\\mathbb{R}^n$, the more general formulation applies to any contractible [manifold](/nodes/dg%3Amanifold). The key point is the property of being “contractible” — a contractible [manifold](/nodes/dg%3Amanifold) can be contracted to a point by a homotopy equivalence, so its [de Rham cohomology](/nodes/dg%3Apoincare-lemma) is the same as that of a point. Hence the Poincaré lemma holds in a wide range of settings: contractible Riemannian [manifolds](/nodes/dg%3Amanifold), contractible [topological spaces](/nodes/dg%3Atopological-space), and so on.

---

## Insights

- **If all [differential forms](/nodes/dg%3Adifferential-form) were closed and all closed forms were exact, nobody would need [de Rham cohomology](/nodes/dg%3Apoincare-lemma).** It is precisely the difference between closed and exact forms that makes [de Rham cohomology](/nodes/dg%3Apoincare-lemma) a rich theory. The Poincaré lemma draws a clear boundary — **locally everything is trivial, and all non-triviality comes from the global topology**. This pattern of thought, “local analysis + global topology”, recurs throughout mathematics (from Riemann surfaces to fibre bundles).

- **The step from $d^2=0$ to “a closed form need not be exact” is in essence a step from algebra to topology.** $d^2=0$ is purely algebraic (it follows from the definition of the exterior derivative), whereas whether a closed form is exact is a topological question. One can write down a closed form near a point, but one cannot decide whether it has a global potential — that requires knowing the global shape of the [manifold](/nodes/dg%3Amanifold).

- **Physical intuition precedes mathematical form.** Long before the Poincaré lemma was stated rigorously, physicists were already using the fact that “a conservative force has a potential function”. The role of mathematics is to make precise the conditions under which this holds (star-shaped regions, contractibility) and to reveal the deep insight that “when a potential does not exist, that fact is telling us about the topology of the space”.

- **The homotopy operator $K$ is an inverse of $d$ in a directed sense.** On a star-shaped region, $d$ and $K$ satisfy $\\omega = d(K\\omega) + K(d\\omega)$, which is reminiscent of the formula for a chain homotopy in algebraic topology: $f - g = \\partial H + H\\partial$. The recurrence of this duality suggests a deep unity between analysis ([differential forms](/nodes/dg%3Adifferential-form)) and topology (chain complexes).

---

## Summary

### Idea

> **The exactness of a closed form is local; its obstruction is global.**

The essence of the Poincaré lemma is that it splits one analytic question (is a closed form exact?) into two levels: locally it always holds (this is the Poincaré lemma itself), while the global obstruction is encoded in the topological structure of the [manifold](/nodes/dg%3Amanifold) — and that is precisely what the [de Rham cohomology](/nodes/dg%3Apoincare-lemma) groups measure.

### Methods

| Method | Where it appears in this note |
|------|--------------|
| **Explicit construction of the homotopy (potential) operator $K$** | the proof on a star-shaped region; the projection-isomorphism method |
| **Induction (on the dimension $n$)** | the inductive proof for $\\mathbb{R}^n$ |
| **Construction by flux/line integrals** | the direct construction in the case $k=1$ |
| **Homotopy invariance + the projection isomorphism** | the homotopy-operator method (Fulton) |
| **Constructing counterexamples (to test the necessity of the hypotheses)** | analysis of the necessary conditions: a closed but non-exact form on $\\mathbb{R}^2 \\setminus \\{0\\}$ |

---

## Looking back and asking

- For the closed $1$-form $\\omega = d\\theta$ on $S^1$: it is exact on $\\mathbb{R}^1$ (after pullback via a local coordinate), but not exact on $S^1$ as a whole, because $\\theta$ is not a globally defined smooth function on $S^1$. What does this reveal? What is the essential connection with $\\frac{-y\\,dx + x\\,dy}{x^2 + y^2}$ on $\\mathbb{R}^2 \\setminus \\{0\\}$?
- The converse of the Poincaré lemma — an exact form must be closed — is guaranteed by $d^2 = 0$. If there were an operator $\\delta$ with $\\delta^2 = 0$ and $\\delta d \\neq d\\delta$, what would become of [de Rham cohomology](/nodes/dg%3Apoincare-lemma)? This leads to the codifferential operator $\\delta$ in Hodge theory.
- If $M$ is not contractible, can we rewrite a closed form on $M$ locally as an exact form via an open cover, and then glue the global cohomology classes together by the Mayer–Vietoris sequence? This is precisely the general strategy for computing [de Rham cohomology](/nodes/dg%3Apoincare-lemma).
- In quantum field theory the Poincaré lemma corresponds to the assumption that “a local potential always exists”, while the topological obstructions appearing in gauge field theory (instantons, for instance) are closely tied to the classification of closed forms on $\\mathbb{R}^4$ that are not exact — this points to the relation between the second Chern class on $\\mathbb{R}^4$ and closed $3$-forms on $\\mathbb{R}^4 \\setminus \\{0\\}$.

---

## References

1. \`梅加强（Mei Jiaqiang）. 流形与几何初步（Manifolds and Introductory Geometry）. 第 4 章第 1 节 Poincaré 引理（The Poincaré lemma）.\` (pdf_5)
2. B.A. Dubrovin, A.T. Fomenko, S.P. Novikov. *Modern Geometry — Methods and Applications, Part III: Introduction to Homology Theory*. GTM 124, Springer. (pdf_2)
3. William Fulton. *Algebraic Topology — A First Course*. GTM 153, Springer, 1995. (pdf_1)
4. Victor W. Guillemin, Alan Pollack. *Differential Topology*. American Mathematical Society, 2014. (pdf_3)
5. Clifford Henry Taubes. *Differential Geometry: Bundles, Connections, Metrics and*. Oxford Graduate Texts in Mathematics, 2011. (pdf_7)
6. John M. Lee. *Introduction to Riemannian Manifolds, Second Edition*. (pdf_4)
7. \`特里斯坦·尼达姆（Tristan Needham）. 可视化微分几何和形式：一部五幕数学正剧（Visual Differential Geometry and Forms: A Mathematical Drama in Five Acts）. 2024.\` (pdf_6)`,

};
