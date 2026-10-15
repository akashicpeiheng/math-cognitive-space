import { entryEnglish } from '../../field-entry.mjs';

// Translate the selected canonical nodes' labels and summaries while preserving
// their long imported notes and the explicit untranslated-body fallback.
const selectedCanonical = {
  'gt:sigma-algebra': {
    title:'σ-algebra',
    summary:'A family closed under countable operations inside P(X): let X be a set and A ⊆ P(X) a family of subsets. If ∅ ∈ A, A is closed under complements (A ∈ A ⇒ A^c ∈ A), and A is closed under countable unions (A_1, A_2, … ∈ A ⇒ ⋃_{i≥1} A_i ∈ A), then A is a sigma-algebra on X. Replacing countable unions by finite unions defines an algebra of sets.',
  },
  'gt:separation-axioms': {
    title:'Separation axioms',
    summary:'Open-set separation conditions: T₀: ∀x≠y an open set contains exactly one of the two points; T₁: ∀x≠y each has an open neighbourhood excluding the other, equivalently all singletons are closed; T₂: ∀x≠y the points have disjoint open neighbourhoods; T₃: T₁ holds and every closed F and x∉F can be separated by disjoint open neighbourhoods; T₄: T₁ holds and disjoint closed sets A,B have disjoint open neighbourhoods containing them.',
  },
  'gt:countability-axioms': {
    title:'Countability axioms',
    summary:'First countability requires a countable neighbourhood basis at each point. Second countability requires one countable basis of open sets for the whole topology: every open set is a union of basis members.',
  },
  'gt:tangent-vector': {
    title:'Tangent vector',
    summary:'A derivation at a point of a smooth manifold, equivalently a class of curves through that point: let M be an n-dimensional smooth manifold, p ∈ M, and C^∞_p(M) the algebra of smooth-function germs near p. A tangent vector is an R-linear map v: C^∞_p(M) → R satisfying v(fg) = v(f)·g(p) + f(p)·v(g). The curve definition identifies curves whose d(x^i∘C)/dt|_{t=0} agree in every local coordinate system. The component definition assigns (ξ^1,…,ξ^n) in each chart, transforming by ξ\'^μ = Σ_ν (∂x\'^μ/∂x^ν)(p) ξ^ν. These descriptions are equivalent; the note primarily uses derivations. The vectors form the n-dimensional T_pM, with basis {∂/∂x^i|_p}, and v = Σ v^i ∂/∂x^i|_p, where v^i = v(x^i).',
  },
  'gt:riemannian-metric': {
    title:'Riemannian metric',
    summary:'A smooth covariant tensor field of type (0,2): at every p, g_p is a symmetric positive-definite bilinear form g_p: T_pM × T_pM → R, varying smoothly with p.',
  },
  'gt:geodesic': {
    title:'Geodesic',
    summary:'A curve whose tangent is parallel along itself: a curve γ(t) on (M, ∇_a) is a geodesic ⇔ its tangent T^a satisfies T^b∇_bT^a = 0, equivalently the tangent is parallel along the curve itself.',
  },
  'gt:inner-product': {
    title:'Inner product',
    summary:'A symmetric positive-definite bilinear form on a real vector space: an inner product is a map ⟨·,·⟩: V × V → R satisfying symmetry, bilinearity and positive definiteness, with V a vector space over R.',
  },
};
export default {...entryEnglish,nodes:{...entryEnglish.nodes,...selectedCanonical}};
