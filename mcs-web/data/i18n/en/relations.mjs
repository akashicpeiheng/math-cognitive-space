/**
 * 关系的英文覆盖：id → 译文（`scope` / `task` / `candidateNote` / `witness.scope`）。
 *
 * 关系种类（`hardPrereq`、`bridge`…）是受控词表键，不在这里翻译——
 * 它们的英文写法在 `data/i18n/glossary.mjs` 的 `RELATIONS_EN`，由界面层取用。
 *
 * `witness.ref` 是修订源的文件路径，**不翻译**；只译 `witness.scope`（那句说明）。
 * 关系文字里夹着公式（`LimitED ⇔ LimitSeq`、`0 < |x − a| < δ`、`t^a∇_a v^b = 0`），
 * 公式逐字保留，只译它周围的话。
 */

import limit from './limit.mjs';

const MODULES = { limit };

/**
 * 其余关系（156 条全部；`limit` 模块里没有登记 relations）。
 * 键是中文源的关系 id。
 */
const remaining = {
  'rel-limit-bridge': { scope: 'a is an accumulation point and f is defined on D.' },
  'rel-limit-generalization': { scope: 'Continuity implies that the limit exists and equals the value of the function; the converse needs a to be an accumulation point and f(a)=L.' },
  'rel-limit-analogy': { candidateNote: 'ε and a final condition appear in both places; the precise correspondence is given by the Bridge certificate, and similarity is not taken for isomorphism.' },
  'rel-limit-application': { task: 'Turn a continuity problem into a limit computation.' },
  'rel-limit-pre-distance-seq': {
    witness: { scope: 'The ε–N definition of convergence of a sequence contains |x_n − a|, that is, d(x_n, a).' },
    scope: 'The ε–N definition of x_n→a: ∀ε>0 ∃N ∀n≥N, |x_n − a| < ε.',
  },
  'rel-limit-pre-real-metric-distance': {
    witness: { scope: 'In the definition of the distance d(x,y) = |x − y|, the real numbers, the order and the absolute value are all declared by the metric background on the reals.' },
    scope: 'Delete the background and |x − y| is only a symbol without a type; completeness of the reals is not used here, but the number system itself comes from the background.',
  },
  'rel-limit-pre-distance-ed': {
    witness: { scope: 'The ε–δ definition contains two distances at once, |x − a| and |f(x) − L|.' },
    scope: 'The ε–δ definition of a limit of a function: 0 < |x − a| < δ ⇒ |f(x) − L| < ε. Without distance there is no “close to” to speak of.',
  },
  'rel-limit-pre-seq-neighborhood': {
    witness: { scope: 'Heine’s condition says “the images of all punctured sequences tending to a tend to L”, which uses convergence of sequences word for word.' },
    scope: 'The sequential definition of a limit is built on convergence of sequences; without it the “tending” in the condition has no content.',
  },
  'rel-limit-pre-ed-bridge': {
    witness: { scope: 'One side of the equivalence assertion is LimitED itself, and the proof starts from it.' },
    scope: 'LimitED ⇔ LimitSeq. The assertion is about these two definitions; remove either side and there is no proposition to prove.',
  },
  'rel-limit-pre-seq-bridge': {
    witness: { scope: 'The other side, LimitSeq, cites convergence of sequences word for word; the “⇒” direction of the proof has to construct a sequence tending to a.' },
    scope: 'For the same object LimitSeq, convergence of sequences is part of its constitutive material.',
  },
  'rel-limit-pre-ed-continuous': {
    witness: { scope: 'The definition of continuity and the ε–δ definition of a limit share the same quantifier structure; only 0 < |x − a| is relaxed to |x − a| < δ so as to admit x = a.' },
    scope: 'To write “f is continuous at a” one first needs the ε–δ language of limits; this is not an implication but a dependency on definitional material.',
  },
  'rel-limit-pre-continuous-bridge-cont': {
    witness: { scope: 'The subject of the assertion is “continuity” itself.' },
    scope: '“When a is an accumulation point, continuity is equivalent to the limit being f(a)” — both concepts occur in the sentence and neither can be dropped.',
  },
  'rel-limit-pre-ed-bridge-cont': {
    witness: { scope: 'The right-hand side of the equation, “the limit value”, is supplied by LimitED.' },
    scope: 'As in the previous entry: this assertion compares the objects of two definitions, so both of them are its material.',
  },
  'rel-limit-pre-seq-constant': {
    witness: { scope: 'The sentence “the limit of a constant sequence is a” itself only holds by virtue of the definition of convergence.' },
    scope: 'A constant sequence is an example; for that example to be an instance of “convergent” it still depends on the definition of convergence.',
  },
  'rel-limit-pre-constant-never-equal': {
    witness: { scope: 'The concrete construction of the counterexample is the constant sequence: one term (in fact every term) equals the limit.' },
    scope: 'The assertion is “there is a convergent sequence some term of which equals the limit”; without the constant sequence as an instance the proposition would be empty talk.',
  },
  'rel-limit-proof-claim-constant': {
    witness: { scope: 'The proof goal of the certificate is exactly this assertion: without writing (λn.a)(n)=a first there is no certificate to replay.' },
    scope: 'The certificate fragment depends on its target assertion; this is a “what the proof uses” relation, not definitional material.',
  },

  /* —— 案例 02：C^k 与光滑流形 —— */
  'rel-manifold-generalization': { scope: 'P_∞ ⇒ P_k under the same atlas encoding.' },
  'rel-manifold-forget': { scope: 'The cross-carrier forgetting map; it does not claim that the maximal atlases are literally equal.' },
  'rel-manifold-compat': { scope: 'Compatibility depends on the definition of C^k.' },
  'rel-manifold-specialization': { scope: 'C^∞ is a specialization of C^k (k finite); the converse fails, see the scope note of the hard-generalization relation.' },
  'rel-manifold-application': { task: 'The atlas gives the domain and the image of a transition map (φ(U∩V) and ψ(U∩V)).' },
  'rel-manifold-crossdomain': {
    scope: 'The image of a chart φ:U→R^n lies in R^n; the linear structure is declared background, not a conclusion derived inside this case.',
    task: 'The cross-domain interface from manifolds to linear structure.',
  },
  'rel-manifold-pre-top-manifold': {
    witness: { scope: 'The first sentence of the definition is “a Hausdorff, second-countable, locally Euclidean topological space”: Hausdorff, open sets and neighbourhoods all come from topology.' },
    scope: 'M is a topological space plus the two separation and countability conditions plus “every point has an open neighbourhood homeomorphic to an open subset of R^n”.',
  },
  'rel-manifold-pre-manifold-atlas': {
    witness: { scope: 'In the coordinate chart (U,φ), U is an open set of the underlying space and φ is a homeomorphism; an atlas is a cover by such charts — the three words open, cover and homeomorphism are all supplied by the topological manifold.' },
    scope: 'The members of an atlas are coordinate charts, and the domain of a coordinate chart must be an open set of X.',
  },
  'rel-manifold-pre-atlas-ck': {
    witness: { scope: 'The definition reads “an **atlas** all of whose transition maps are C^k”: the atlas is the subject of this definition.' },
    scope: 'Remove the atlas and A in (A,k) has no object; C^k is a condition imposed on an atlas.',
  },
  'rel-manifold-pre-transition-ck': {
    witness: { scope: '“All transition maps are C^k” uses the transition map ψ∘φ⁻¹ word for word, and its domain φ(U∩V) is also the range over which the C^k condition is checked.' },
    scope: 'C^k is a requirement imposed on transition maps; without the object “transition map” the condition cannot even be written down.',
  },
  'rel-manifold-pre-atlas-smooth': {
    witness: { scope: 'A smooth atlas is defined as “an atlas all of whose transition maps are C^∞”, again with the atlas as subject.' },
    scope: 'A smooth atlas is first of all an atlas; C^∞ only pushes the k of C^k to all orders.',
  },
  'rel-manifold-pre-ck-compatible': {
    witness: { scope: 'The definition is “the union of two atlases is a C^k atlas”: the C^k atlas is the predicate of this definition.' },
    scope: 'What compatibility judges is the union of two C^k atlases; without C^k atlases there is nothing to judge.',
  },
  'rel-manifold-pre-compatible-max': {
    witness: { scope: 'The maximal extension is defined as the C^k atlas “consisting of all charts compatible with A” — compatibility is exactly the filter in this construction.' },
    scope: 'Remove compatibility and A_max degenerates into the set of all charts, no longer an atlas.',
  },
  'rel-manifold-pre-ck-max': {
    witness: { scope: 'The output of the construction is required to be a C^k atlas, and maximality says that “no further C^k-compatible chart can be added”.' },
    scope: 'A_max is itself a C^k atlas; its correctness goal is written in terms of the C^k condition.',
  },
  'rel-manifold-proof-claim-transition': {
    witness: { scope: 'The proof goal of the certificate is “the value of a same-chart transition at a given point”; without writing this assertion down there is no certificate to replay.' },
    scope: 'The certificate fragment depends on its target assertion; this is “what the proof uses”, not definitional material.',
  },

  /* —— 案例 03：张量与张量场 —— */
  'rel-tensor-generalization': { scope: 'The space of multilinear maps and the tensor space correspond by the universal property.' },
  'rel-tensor-specialization': { scope: 'The reverse direction belongs to the same universal property; the two relations come in pairs and do not mean that the two directions each hold independently.' },
  'rel-tensor-bridge': { scope: 'Finite dimension; the basis is used in the proof only.' },
  'rel-tensor-application': { task: 'From pointwise tensors to a global tensor field.' },
  'rel-tensor-duality': { scope: 'V⊗V* and End(V) are isomorphic in finite dimension, and the duality comes from this pairing; it fails in infinite dimension.' },
  'rel-tensor-crossdomain': {
    scope: 'Constructing the tensor bundle needs the base manifold and the pointwise linear structure; the two threads meet at the construction.',
    task: 'The cross-domain interface from manifolds and linear structure to the tensor bundle.',
  },
  'rel-tensor-pre-linear-dual': {
    witness: { scope: 'The definition reads V* = Hom(V,F): Hom(V,F) is a space of linear maps, and both V and F come from the background in linear algebra.' },
    scope: 'The elements of the dual space are linear functionals; both “linear” and “field” are supplied by the background.',
  },
  'rel-tensor-pre-dual-multilinear': {
    witness: { scope: 'The domain is written (V*)^r × V^s: every variable slot of a multilinear map has the dual space or the original space as its type.' },
    scope: 'The definition of a multilinear map uses V and V* word for word; without the dual space the covariant slots cannot be written.',
  },
  'rel-tensor-pre-linear-product': {
    witness: { scope: 'The tensor product is “the universal object for bilinear maps”: bilinear, linear map and vector space all come from the background in linear algebra.' },
    scope: 'Without linear structure there is no bilinear map, and hence no object whose factorisation is required.',
  },
  'rel-tensor-pre-multilinear-product': {
    witness: { scope: 'The universal property says that “every (multi)linear map factors uniquely through V⊗W”: the maps being factored are exactly the multilinear maps.' },
    scope: 'The definition of the tensor product quantifies over multilinear maps; delete them and the universal property has no content.',
  },
  'rel-tensor-pre-product-rs': {
    witness: { scope: 'The definition T^r_s(V) = V^{⊗r} ⊗ (V*)^{⊗s} is literally a repetition of tensor products followed by one more product.' },
    scope: 'Remove the tensor product and the right-hand side of the equation defining T^r_s cannot be written.',
  },
  'rel-tensor-pre-dual-rs': {
    witness: { scope: 'The (V*)^{⊗s} in the same definition uses the dual space.' },
    scope: 'The carrier of the covariant part is the dual space; it degenerates only when s = 0.',
  },
  'rel-tensor-pre-rs-basis': {
    witness: { scope: 'The change-of-basis law is the transformation formula for the components of a tensor of type (r,s) under a change of basis: the components and the upper and lower indices all come from T^r_s.' },
    scope: 'Every index in the transformation law corresponds to one tensor slot; without the definition of a tensor of type (r,s) there is no object for this law.',
  },
  'rel-tensor-pre-rs-bundle': {
    witness: { scope: 'The construction reads “take the fibre T^r_s(T_xX) at each point”: the fibre is precisely the tensor space of type (r,s).' },
    scope: 'The fibre type of the tensor bundle is specified by T^r_s; a different tensor space gives a different bundle.',
  },
  'rel-tensor-pre-bundle-field': {
    witness: { scope: 'A tensor field is defined as **a smooth section of the tensor bundle**: the bundle is the subject of this definition.' },
    scope: 'Without a tensor bundle there is nothing for “section” to be a section of.',
  },
  'rel-tensor-proof-claim-rank1': {
    witness: { scope: 'The proof goal of the certificate is the assertion “a rank-one map preserves addition”; if the assertion is not written down the certificate has nothing to prove.' },
    scope: 'The certificate fragment depends on its target assertion; this is “what the proof uses”, not definitional material.',
  },

  /* —— 案例 04：群 —— */
  'rel-group-generalization': { scope: 'A permutation group is an instance of a group; the converse fails.' },
  'rel-group-generalization-geom': { scope: 'A geometric symmetry group is an instance of a group.' },
  'rel-group-generalization-mod': { scope: 'Units5 is a finite instance of a group.' },
  'rel-group-specialization': { scope: 'The direction of finite instances; this verification does not generalise to other moduli.' },
  'rel-group-bridge': { scope: 'Every group embeds into the permutation group of its underlying set.' },
  'rel-group-application': { task: 'Unify geometric symmetry through group theory.' },
  'rel-group-pre-binary-concept': {
    witness: { scope: 'The definition “(G,·,e,inv) satisfies the axioms of associativity, identity and inverses”: the operation, the constant and the three axioms of the triple are all supplied by the background template.' },
    scope: 'Remove the background template and the definition of a group is left with a bare set G, with no way to state the axioms.',
  },
  'rel-group-pre-concept-leftmul': {
    witness: { scope: 'The definition L_g(x) = gx uses the multiplication of the group and an element g∈G word for word.' },
    scope: 'Without the group operation the map “left multiplication” cannot be written.',
  },
  'rel-group-pre-leftmul-injective': {
    witness: { scope: 'The subject of the proposition “if L_g = L_h then g = h” is the family of left-multiplication maps.' },
    scope: 'The proposition uses equality of left-multiplication maps to conclude equality of elements; without L_g there is no such proposition.',
  },
  'rel-group-pre-perm-cayley': {
    witness: { scope: 'Cayley’s theorem states that “G is isomorphic to a subgroup of Perm(G)”: the permutation group Perm(G) occurs in the conclusion.' },
    scope: 'The conclusion lands in a permutation group; without that object the theorem has no image to state.',
  },
  'rel-group-proof-claim-injective': {
    witness: { scope: 'The proof goal of the certificate is “equality of left-multiplication maps implies equality of the elements”; this assertion is the interface of the injectivity step of Cayley.' },
    scope: 'The certificate fragment depends on its target assertion; this is “what the proof uses”, not definitional material.',
  },

  /* —— 案例 05：微分几何（源笔记语料） —— */
  'rel-dg-manifold-specialization': { scope: 'The definition of a manifold is exactly “Hausdorff + locally Euclidean”, which coincides with the topological manifold under that formulation.' },
  'rel-dg-smooth-manifold-generalization': { scope: 'A smooth manifold is a topological manifold together with a smooth atlas; the converse fails (the same topological manifold may carry incompatible smooth structures).' },
  'rel-dg-chart-application': { task: 'An atlas consists of coordinate charts; a coordinate chart is the unit of membership of an atlas.' },
  'rel-dg-tangent-basis-application': { task: 'The local trivialisation of the tangent bundle uses the coordinate basis to give linear coordinates on the fibre.' },
  'rel-dg-form-application': { task: 'The wedge product is the basic operation on the algebra of differential forms.' },
  'rel-dg-stokes-application': { task: 'The proof of Stokes’ theorem proceeds after pulling back to R^n.' },
  'rel-dg-crossdomain-smooth': {
    scope: 'The C^k/C^∞ atlases of the manifold case on this site and the smooth manifolds of the differential-geometry notes cover the same layer of concepts; both registrations are kept and not merged.',
    task: 'The interface between the two cases’ formulations of “smooth structure”.',
  },
  'rel-dg-crossdomain-tensor': {
    scope: 'The tensor case on this site registers tensors by type (r,s); the differential-geometry notes use the same layering, so the two connect without overriding each other.',
    task: 'The interface of the concept of a tensor between the two cases.',
  },
  'rel-dg-crossdomain-manifold': {
    scope: 'Both register the same layer of concepts (locally Euclidean + Hausdorff); this case additionally registers the quantified local homeomorphism condition.',
    task: 'The cross-case interface of the formulation of a topological manifold.',
  },
  'rel-dg-crossdomain-background-topology': {
    scope: 'The background node bg:top:space on this site and the topological spaces of the differential-geometry notes are the same layer; this case gives the full version of the open-set axioms.',
    task: 'The cross-case interface of the point-set-topology background.',
  },
  'rel-dg-pre-top-homeo': {
    witness: { scope: 'The definition of a homeomorphism says that f: X → Y is a bijection and that both f and f⁻¹ are continuous — continuity and topological spaces both come from here.' },
    scope: 'X and Y must be topological spaces; “f is continuous” also needs a topology before it means anything.',
  },
  'rel-dg-pre-top-manifold': {
    witness: { scope: 'The definition of a locally Euclidean space starts from a Hausdorff space (that is, a topological space).' },
    scope: 'M is a Hausdorff space such that every point has an open neighbourhood homeomorphic to an open subset of R^n: the three words open, neighbourhood and homeomorphism all presuppose a topology.',
  },
  'rel-dg-pre-top-manifold-entry': {
    witness: { scope: 'The definition of this case’s entry node “manifold” likewise begins with a topological space.' },
    scope: 'M is a Hausdorff space in which every point has a neighbourhood homeomorphic to an open subset of R^n — the same layer of formulation as the topological manifold.',
  },
  'rel-dg-pre-homeo-manifold': {
    witness: { scope: 'The clause “a neighbourhood homeomorphic to an open subset of R^n” uses homeomorphism word for word.' },
    scope: 'The user’s example “homeomorphism → manifold”: without homeomorphism the phrase “locally Euclidean” cannot be written.',
  },
  'rel-dg-pre-homeo-manifold-t': {
    witness: { scope: 'The local coordinate map φ: U → R^n is required to be a homeomorphism.' },
    scope: 'φ(U) is an open set in R^n and φ is a homeomorphism — one of the defining clauses of a topological manifold.',
  },
  'rel-dg-pre-homeo-chart': {
    witness: { scope: 'A coordinate chart is exactly a pair (U, φ) in which φ: U → φ(U) ⊆ R^n is a homeomorphism.' },
    scope: 'Remove “homeomorphism” from the definition of a coordinate chart and (U, φ) is left with a set and a map, no longer a coordinate chart.',
  },
  'rel-dg-pre-top-compactness': {
    witness: { scope: 'Compactness is defined by open covers, and an open cover is a concept of topological spaces.' },
    scope: 'Every open cover of A has a finite subcover — “open” is supplied by the topology.',
  },
  'rel-dg-pre-metric-completeness': {
    witness: { scope: 'Completeness says that every Cauchy sequence converges to a point of X — both convergence and Cauchy are defined in terms of the metric d.' },
    scope: 'Without a metric there is no “distance less than ε”, and hence no Cauchy sequence.',
  },
  'rel-dg-pre-chart-atlas': {
    witness: { scope: 'An atlas A = {(U_α, φ_α)} is a collection of coordinate charts, with the extra requirements of covering and of C^∞ coordinate changes.' },
    scope: 'The user’s example “coordinate chart → smooth atlas”: every member of an atlas is a coordinate chart.',
  },
  'rel-dg-pre-manifold-atlas': {
    witness: { scope: 'The U_α of an atlas are open sets of M, and “covers M” likewise presupposes the topology of M.' },
    scope: 'An atlas lives on a topological manifold; the same collection of coordinate charts placed on another base is not an atlas.',
  },
  'rel-dg-pre-atlas-structure': {
    witness: { scope: 'A smooth structure σ is defined as a maximal smooth atlas on M (equivalently, an equivalence class of compatible smooth atlases).' },
    scope: 'What the maximality step acts on is the atlas.',
  },
  'rel-dg-pre-atlas-smooth-manifold': {
    witness: { scope: 'A smooth manifold is defined as one for which “there exists an atlas making every coordinate change φ_β∘φ_α⁻¹ a C^∞ map”.' },
    scope: 'Note that this says there **exists** an atlas, rather than singling one out — so what it depends on is the concept of an atlas.',
  },
  'rel-dg-pre-manifold-smooth-manifold': {
    witness: { scope: 'A smooth manifold is defined as “a topological manifold with a smooth structure”, and is required to be Hausdorff and second-countable.' },
    scope: '`rel-dg-smooth-manifold-generalization` registers “which one is more general”; what is registered here is “definitional material”.',
  },
  'rel-dg-pre-smooth-tangent-curve': {
    witness: { scope: 'The curve definition uses “a smooth curve γ through p” and local coordinates (φ∘γ)′(0).' },
    scope: 'Smooth curves and local coordinates both require M to be a smooth manifold.',
  },
  'rel-dg-pre-smooth-tangent-derivation': {
    witness: { scope: 'A derivation is defined on C^∞(M) (germs of smooth functions), and the smooth structure determines which functions are smooth.' },
    scope: 'Replace M by a topological manifold and C^∞(M) cannot even be discussed, so the Leibniz-rule framework collapses too.',
  },
  'rel-dg-pre-curve-equivalence': {
    witness: { scope: 'One side of the equivalence assertion is the curve equivalence class.' },
    scope: 'The correspondence between the two definitions: remove either side and the proposition has no subject.',
  },
  'rel-dg-pre-derivation-equivalence': {
    witness: { scope: 'The other side consists of the derivations satisfying the Leibniz rule.' },
    scope: 'The other half of the material of the same assertion.',
  },
  'rel-dg-pre-derivation-basis': {
    witness: { scope: 'The coordinate basis is defined by (∂/∂u^i)(f) = ∂(f∘φ⁻¹)/∂x^i — and ∂/∂u^i is precisely a derivation.' },
    scope: 'The basis vectors are defined by how derivations act on functions; without the language of derivations this basis cannot be written.',
  },
  'rel-dg-pre-basis-bundle': {
    witness: { scope: 'TM = ⊔_{p∈M} T_pM, and the coordinate description of T_pM is given by this basis.' },
    scope: 'The 2n-dimensional smooth structure of the tangent bundle and its local trivialisations are both formulated in terms of the coordinate basis.',
  },
  'rel-dg-pre-bundle-vector-field': {
    witness: { scope: 'A smooth vector field is defined as a smooth section X: M → TM of the tangent bundle with π∘X = id_M.' },
    scope: 'Both the projection π and the total space TM come from the tangent bundle.',
  },
  'rel-dg-pre-bundle-distribution': {
    witness: { scope: 'A smooth tangent distribution is defined as a subbundle of the tangent bundle: it maps each point p to a k-dimensional subspace of T_pM.' },
    scope: 'Both “subbundle” and “T_pM” require the tangent bundle first.',
  },
  'rel-dg-pre-bundle-form': {
    witness: { scope: 'A p-form is a smooth section of ⋀^p T*M; T*M is the dual bundle of the tangent bundle.' },
    scope: 'The cotangent bundle depends on the tangent bundle, so the carrier of a form comes from the tangent bundle.',
  },
};

Object.assign(remaining, {
  'rel-dg-pre-tensor-product-tensor': {
    witness: { scope: 'In T ∈ T^r_s(V) the symbol T^r_s is built from the tensor product of V and V*.' },
    scope: 'The domain and codomain of a multilinear map are organised by tensor products; without ⊗ there is no such system of (r,s) indices.',
  },
  'rel-dg-pre-tensor-form': {
    witness: { scope: 'A p-form is an **antisymmetric** multilinear form — the multilinear layer comes from tensors.' },
    scope: 'The evaluation rule for a form (it eats p vectors and is linear in each variable) is exactly the definition of a tensor, with an antisymmetry condition added.',
  },
  'rel-dg-pre-wedge-form': {
    witness: { scope: 'The algebraic structure of Ω^•(M) is given by the wedge product (f∧g = (−1)^{rs} g∧f).' },
    scope: 'A form is not just a section: it is an element of an algebra, and the multiplication in that algebra comes from the wedge product.',
  },
  'rel-dg-pre-form-pullback': {
    witness: { scope: 'f*ω is defined by (f*ω)_p(v_1,…) = ω_{f(p)}(f_{*p}v_1,…), and both sides are differential forms.' },
    scope: 'The pullback is an operation on forms; without forms there is nothing to pull back.',
  },
  'rel-dg-pre-form-d2': {
    witness: { scope: 'The identity d(dω) = 0 is stated for an arbitrary differential form ω.' },
    scope: 'The exterior derivative d acts on forms — without forms this identity has no domain.',
  },
  'rel-dg-pre-wedge-d2': {
    witness: { scope: 'The characterisation of d contains the Leibniz-type rule d(ω∧η) = dω∧η + (−1)^p ω∧dη.' },
    scope: 'The exterior derivative is an antiderivation of the exterior algebra; the proof of this identity uses the wedge product and its degree.',
  },
  'rel-dg-pre-form-poincare': {
    witness: { scope: '“If dω = 0 then there is η with ω = dη” — both ω and η are differential forms.' },
    scope: 'Closed and exact forms are both defined with forms as their carrier.',
  },
  'rel-dg-pre-d2-poincare': {
    witness: { scope: '“Closed” is written dω = 0 and “exact” as ω = dη; both words use d, and d²=0 says that exact implies closed.' },
    scope: 'This lemma compares exactly these two conditions, and the conditions are defined by d.',
  },
  'rel-dg-pre-form-stokes': {
    witness: { scope: 'In ∫_M dω = ∫_{∂M} ω the form ω is a compactly supported (n−1)-form.' },
    scope: 'The object being integrated is a form; orientation and the structure of a manifold with boundary are likewise defined through integration of forms.',
  },
  'rel-dg-pre-manifold-stokes': {
    witness: { scope: 'The statement of the theorem requires M to be an oriented smooth manifold with boundary.' },
    scope: 'The boundary ∂M of a manifold with boundary, its orientation and integration are all built on smooth manifolds.',
  },
  'rel-dg-pre-smooth-partition': {
    witness: { scope: 'A partition of unity is a family of smooth functions on M such that every supp g_i is contained in some coordinate domain U_α.' },
    scope: 'The three phrases “smooth function”, “coordinate domain” and “compact support” all require a smooth manifold first.',
  },
  'rel-dg-pre-compact-partition': {
    witness: { scope: 'The definition requires the supports to be compact and the family to be locally finite — “compact” and “locally finite” are both phrased in the language of covers.' },
    scope: 'The existence proof uses exactly the step “a compact open cover has a finite subcover”.',
  },
  'rel-dg-pre-manifold-embedding': {
    witness: { scope: 'A smooth embedding is defined as an injective immersion f: M → N between smooth manifolds such that f is a homeomorphism onto its image.' },
    scope: 'Both source and target are smooth manifolds; “immersion” is defined through the tangent map.',
  },
  'rel-dg-pre-inverse-implicit': {
    witness: { scope: 'The standard derivation of the implicit function theorem turns the equation F(x,y)=0 into (x,y) ↦ (x, F(x,y)) and then applies the inverse function theorem.' },
    scope: 'The derivation depends on it: the statement of the implicit function theorem does not contain the inverse function theorem, but its proof uses it; see the evidence ev-dg-inverse-implicit (not yet encoded as a certificate).',
  },

  /* —— 案例 06：梁灿彬《微分几何与广义相对论》第一册 —— */
  'rel-liang-metric-specialization': { scope: 'A metric is a tensor field of type (0,2) with symmetry and non-degeneracy added; the converse fails.' },
  'rel-liang-killing-specialization': { scope: 'A Killing field is the special case of vanishing Lie derivative; the Lie derivative itself is defined for an arbitrary vector field.' },
  'rel-liang-schwarzschild-specialization': { scope: 'The Schwarzschild metric is the solution of the field equations under the vacuum, static and spherically symmetric conditions; it does not cover general solutions.' },
  'rel-liang-rw-specialization': { scope: 'The RW metric is the family of solutions of the field equations under the homogeneous and isotropic conditions, with a(t) determined by the matter content.' },
  'rel-liang-tangent-application': { task: 'The “non-tensoriality” of the Christoffel symbols is visible only when written in abstract index notation: the extra inhomogeneous term in the transformation law is exactly where index balancing fails.' },
  'rel-liang-geodesic-application': { task: 'The geodesics of Schwarzschild are the standard demonstration of “turning Killing fields into conserved quantities”.' },
  'rel-liang-crossdomain-topology': {
    scope: 'The background node bg:top:space on this site and the topological spaces of §1.2 of the textbook are the same layer; this case gives the full version of the open-set axioms.',
    task: 'The interface of the point-set-topology background inside the textbook path.',
  },
  'rel-liang-crossdomain-dg-manifold': {
    scope: 'The dg case on this site (the notes corpus) and the textbook case cover the same layer of concepts in their formulations of “smooth manifold”; both registrations are kept and do not override each other.',
    task: 'The interface of smooth manifolds between the two cases.',
  },
  'rel-liang-crossdomain-dg-tangent': {
    scope: 'The dg case registers tangent vectors as three nodes (“curve definition / derivation definition / the two are equivalent”); the textbook case treats it as one milestone and gives the comparison of the two definitions in its body.',
    task: 'The cross-case interface of the formulation of tangent vectors.',
  },
  'rel-liang-crossdomain-dg-stokes': {
    scope: 'Both register the same theorem; the textbook case additionally gives the order in which the volume element and Hodge duality are handled.',
    task: 'The cross-case interface of Stokes’ theorem.',
  },
  'rel-liang-crossdomain-tensor': {
    scope: 'The tensor case on this site registers tensors of type (r,s) over finite-dimensional vector spaces; the textbook case generalises this to tensor fields on manifolds.',
    task: 'The cross-case interface of the concept of a tensor.',
  },
  'rel-liang-pre-top-continuous': {
    witness: { scope: 'The predicate reads “f: X → Y is continuous if and only if the preimage of every open set in Y is open in X”: the open sets are supplied by the topologies of X and Y.' },
    scope: 'Without a topology, neither “continuous” nor “homeomorphism” can be defined.',
  },
  'rel-liang-pre-continuous-manifold': {
    witness: { scope: 'In the predicate, “a homeomorphism φ_α: U_α → an open subset of R^n” is a homeomorphism, that is, a continuous bijection with continuous inverse; Hausdorff and second-countability are likewise phrased topologically.' },
    scope: 'The locally Euclidean condition for a differentiable manifold uses homeomorphism word for word; delete it and only a topological space is left.',
  },
  'rel-liang-pre-manifold-tangent': {
    witness: { scope: 'The predicate says “smooth curves through p are equivalent when (φ∘γ)′(0) agrees in some coordinate chart”, which uses coordinate charts and smooth curves on the manifold.' },
    scope: 'A tangent vector is an object on the manifold: without M and its coordinate charts the equivalence relation has no domain.',
  },
  'rel-liang-pre-tangent-vectorfield': {
    witness: { scope: 'The predicate says “v is a map M → TM with π∘v = id_M whose components v^μ(x) are C^∞ in every coordinate chart”: each point of the fibre TM is a tangent vector.' },
    scope: 'The value of a vector field at a point is a tangent vector; the components are the coordinate components of that tangent vector.',
  },
  'rel-liang-pre-tensor-metric': {
    witness: { scope: 'The predicate says “g is a symmetric, non-degenerate smooth tensor field of type (0,2) on M”: both the (0,2)-tensor and “tensor field” come from the target node.' },
    scope: 'A metric is a tensor field of type (0,2) with two conditions added (symmetry, non-degeneracy); apart from those conditions it is a tensor field.',
  },
  'rel-liang-pre-tensor-abstractindex': {
    witness: { scope: 'The predicate says “abstract indices only mark the type of a tensor and the pairs to be contracted”: the objects being marked are tensors and tensor fields.' },
    scope: 'Abstract index notation is a notation for writing tensor identities; without tensors there is nothing to balance.',
  },
  'rel-liang-pre-tensor-derivative': {
    witness: { scope: 'The predicate says “∇ satisfies linearity, the Leibniz rule and commutation with contraction”: contraction is an operation on tensor fields, and the Leibniz rule acts on products of tensor fields.' },
    scope: 'The objects to which a derivative operator applies are tensor fields; delete them and the three requirements have no subject.',
  },
  'rel-liang-pre-metric-christoffel': {
    witness: { scope: 'The component formula in the predicate, Γ^μ{}_{νσ} = ½ g^{μρ}(∂_ν g_{ρσ} + ∂_σ g_{ρν} − ∂_ρ g_{νσ}), is given entirely by the metric g and its inverse.' },
    scope: 'The derivative operator compatible with the metric is the unique one satisfying ∇g = 0 and torsion-freeness; its components are determined by the metric.',
  },
  'rel-liang-pre-derivative-parallel': {
    witness: { scope: 'The predicate says “a vector parallel-transported along a curve γ satisfies t^a∇_a v^b = 0”: the ∇ in the equation is the derivative operator.' },
    scope: 'Parallel transport is “the derivative along the tangent direction is zero”; without ∇ there is no such equation.',
  },
  'rel-liang-pre-parallel-geodesic': {
    witness: { scope: 'The predicate “a geodesic satisfies t^a∇_a t^b = 0” is the direct way of writing “the tangent vector is parallel-transported along itself”, and the coordinate form contains the same equation.' },
    scope: 'A geodesic is the special case of parallel transport in which the transported vector is taken to be the tangent vector itself.',
  },
  'rel-liang-pre-derivative-riemann': {
    witness: { scope: 'The predicate says “R^a{}_{bcd} is defined by the commutator of two derivative operators: (∇_a∇_b − ∇_b∇_a)ω_c = R^d{}_{cab}ω_d”.' },
    scope: 'The curvature tensor is by definition the commutator of ∇; without ∇ there is no such object.',
  },
  'rel-liang-pre-riemann-ricci': {
    witness: { scope: 'The predicate says “R_{ac} = R^b{}_{abc}, R = g^{ab}R_{ab}, G_{ab} = R_{ab} − ½ R g_{ab}”: the Ricci tensor is a contraction of the Riemann tensor.' },
    scope: 'All three objects in this chain arise by contracting the Riemann tensor.',
  },
  'rel-liang-pre-manifold-form': {
    witness: { scope: 'The predicate says “a p-form is at each point a totally antisymmetric multilinear map, and the whole is denoted Ω^p(M)”: a form is an object on a manifold.' },
    scope: 'The M in Ω^p(M) is a manifold; without a manifold there is only pointwise multilinear algebra.',
  },
  'rel-liang-pre-form-exterior': {
    witness: { scope: 'The predicate says “d is uniquely determined by df(v) = v(f) and d(ω∧η) = dω∧η + (−1)^p ω∧dη”: the wedge product and the degree of a form are the components of this definition.' },
    scope: 'The exterior derivative acts on forms; without forms and the wedge product neither defining equation can be written.',
  },
  'rel-liang-pre-exterior-stokes': {
    witness: { scope: 'Stokes’ theorem is stated as ∫_∂R ω = ∫_R dω: both sides of the equality use the exterior derivative d and the form ω.' },
    scope: 'This theorem has no other objects: one side is the integral of a form and the other the integral of its exterior derivative.',
  },
  'rel-liang-pre-vectorfield-lie': {
    witness: { scope: 'The predicate says “L_v T = lim (φ_{-t}^* T − T)/t, where φ_t is the one-parameter group of diffeomorphisms generated by v; for vector fields L_v w = [v, w]”.' },
    scope: 'The Lie derivative is taken along a vector field; without a vector field there is no v.',
  },
  'rel-liang-pre-einstein-schwarzschild': {
    witness: { scope: 'The word “solution” in “the Schwarzschild vacuum solution” refers to the field equations: the statement is that G_{ab} = 0 is solved under the static and spherically symmetric conditions.' },
    scope: 'The word “solution” needs an equation as its object; delete the field equations and the Schwarzschild metric is just a metric.',
  },
  'rel-liang-pre-einstein-rw': {
    witness: { scope: 'The range of validity of the RW metric is given by the field equations together with the homogeneity and isotropy conditions; a(t) is determined by the field equations and the equation of state.' },
    scope: 'As above: the meaning of “solution” comes from the field equations, not from the metric itself.',
  },

  /* —— 案例 07：Rudin《数学分析原理》 —— */
  'rel-rudin-lub-specialization': { scope: 'The real field is obtained from an ordered field by adding the least-upper-bound property; the converse fails (the rationals form an ordered field that lacks the least-upper-bound property).' },
  'rel-rudin-complete-specialization': { scope: 'In R^k a Cauchy sequence is exactly a convergent sequence; in a general metric space only one direction holds.' },
  'rel-rudin-crossdomain-metric': {
    scope: 'The dg case on this site (the differential-geometry notes corpus) and the Rudin case register the same layer of the concept of a metric space; both registrations are kept and do not override each other.',
    task: 'The interface of metric spaces between the two cases.',
  },
  'rel-rudin-crossdomain-compact': {
    scope: 'The dg case registers compactness by “every open cover has a finite subcover”; the Rudin case additionally writes the bounded-and-closed criterion in R^k (Heine–Borel) into the same node.',
    task: 'The cross-case interface of compactness.',
  },
  'rel-rudin-crossdomain-inverse': {
    scope: 'Both register the same theorem; the formulation in the dg case requires dF_p to be a linear isomorphism, the one in the Rudin case requires f′(a) to be invertible, and the two are equivalent.',
    task: 'The cross-case interface of the inverse function theorem.',
  },
  'rel-rudin-crossdomain-implicit': {
    scope: 'Two registrations of the same theorem; the Rudin case adds the half that gives g′(a) in terms of the partial derivatives of F.',
    task: 'The cross-case interface of the implicit function theorem.',
  },
  'rel-rudin-crossdomain-stokes': {
    scope: 'The dg case formulates it with manifolds with boundary and compactly supported forms; the Rudin case formulates it with simplices and chains, and the two are two languages for the same identity.',
    task: 'The cross-case interface of Stokes’ theorem.',
  },
  'rel-rudin-crossdomain-form': {
    scope: 'Both register the same concept of a differential form; the coefficients in the Rudin case are written in the coordinates of R^n, those in the dg case on a manifold.',
    task: 'The cross-case interface of differential forms.',
  },
  'rel-rudin-crossdomain-real': {
    scope: 'The shared background bg:real:metric on this site takes completeness of the reals as a **declared background**; the Rudin case is precisely where this property itself is established as the first milestone.',
    task: 'The two uses of completeness of the reals, as background and as conclusion.',
  },
  'rel-rudin-crossdomain-case': {
    scope: 'The ε–δ definition of the limit case on this site and the limit of a function in Rudin are the same layer of concepts; the limit case sets up a separate sequential definition and the two meet in the Bridge theorem.',
    task: 'The cross-case interface of the limit of a function.',
  },
  'rel-rudin-pre-metric-convergent': {
    witness: { scope: 'The predicate says “p_n → p means that for every ε > 0 there is N such that d(p_n,p) < ε whenever n ≥ N”: the distance d and the neighbourhood language of convergence both come from the metric space.' },
    scope: 'Convergence of sequences is defined in a metric space; delete the metric and neither ε nor d has an object.',
  },
  'rel-rudin-pre-metric-cauchy': {
    witness: { scope: 'The predicate says “for every ε > 0 there is N such that d(p_m,p_n) < ε whenever m,n ≥ N”: the Cauchy condition is expressed entirely by the metric d.' },
    scope: 'A Cauchy sequence is a sequence of points that become close to one another, and closeness is supplied by d.',
  },
  'rel-rudin-pre-metric-compact': {
    witness: { scope: 'The predicate says “K ⊂ X is compact if and only if every open cover of K has a finite subcover”, and gives the bounded-and-closed criterion in R^k: open set, subset and bounded are all defined in a metric space.' },
    scope: 'Compactness is a property of subsets of a metric (topological) space.',
  },
  'rel-rudin-pre-metric-connected': {
    witness: { scope: 'The predicate defines connectedness by “there are no open sets A, B with E∩A and E∩B non-empty, E ⊂ A∪B and E∩A∩B = ∅”: the open sets come from the metric space.' },
    scope: 'Connectedness is phrased through separation by open sets; without a topology there is no such definition.',
  },
  'rel-rudin-pre-convergent-series': {
    witness: { scope: 'The predicate says “Σ a_n converges means that the sequence of partial sums converges”: convergence of a series is defined directly as convergence of a sequence.' },
    scope: 'A series is shorthand for the sequence of its partial sums; delete convergence of sequences and convergence of a series cannot be defined.',
  },
  'rel-rudin-pre-power-exponential': {
    witness: { scope: 'The predicate says “E(z) = Σ z^n/n! converges on C”: E is itself a power series, and the language of radius of convergence comes from power series.' },
    scope: 'The exponential function is the first use of power series; without power series there is no such definition.',
  },
  'rel-rudin-pre-compact-continuity': {
    witness: { scope: 'The predicate says “the image of a compact set under a continuous map is compact; consequently a continuous real function on a compact set is bounded, attains its extrema and is uniformly continuous”: the subject is a compact set.' },
    scope: 'This group of conclusions all takes a compact set as hypothesis; delete it and there is no theorem to state.',
  },
  'rel-rudin-pre-connected-continuity': {
    witness: { scope: 'The predicate says “the image of a connected set under a continuous map is connected; consequently a continuous real function on an interval takes every intermediate value”: the subject is a connected set.' },
    scope: 'The intermediate value theorem is a corollary of connectedness under a continuous map; the hypothesis is exactly a connected set.',
  },
  'rel-rudin-pre-derivative-mvt': {
    witness: { scope: 'The statement of the mean value theorem contains f′(x): the derivative node supplies this notation and its definition.' },
    scope: 'Without the derivative, the identity of the mean value theorem, f(b) − f(a) = f′(x)(b − a), cannot be written.',
  },
  'rel-rudin-pre-linear-several': {
    witness: { scope: 'The derivative of a function on R^n is defined as a linear map A plus a remainder o(h); “linear map” and the operator norm are supplied by the node on linear transformations.' },
    scope: 'The derivative in several variables is a linear map; its estimate is written with the operator norm.',
  },
  'rel-rudin-pre-simplex-stokes': {
    witness: { scope: 'Stokes’ theorem is formulated with “simplices and chains”: the domain of integration is a k-chain and the boundary operator ∂ appears on the left-hand side of the theorem.' },
    scope: 'The subject of the theorem is a chain and its boundary; without chains there is no statement of this theorem.',
  },
  'rel-rudin-proof-contraction-inverse': {
    witness: { scope: 'The textbook proves the inverse function theorem after the contraction mapping principle: it turns local invertibility into a fixed-point problem for a contraction.' },
    scope: 'This is a **derivation** dependency (not definitional material): the statement of the inverse function theorem does not contain contraction mappings, but its proof uses them.',
  },
  'rel-rudin-proof-inverse-implicit': {
    witness: { scope: 'The textbook proves the theorems in the order “inverse function theorem → implicit function theorem”: it turns F(x,y)=0 into the inverse-function problem for (x,y) ↦ (x, F(x,y)).' },
    scope: 'Again a **derivation** dependency: the statement of the implicit function theorem does not contain the inverse function theorem, but its proof uses it.',
  },
});

const relations = {};
const register = (id, entry, source) => {
  if (relations[id]) throw new Error(`关系译文重复登记：${id}（来源 ${source}）`);
  relations[id] = entry;
};

for (const [caseId, module] of Object.entries(MODULES)) {
  const overlay = module?.default ?? module;
  for (const [id, entry] of Object.entries(overlay.relations ?? {})) register(id, entry, caseId);
}
for (const [id, entry] of Object.entries(remaining)) register(id, entry, 'relations.mjs/remaining');

export default relations;
