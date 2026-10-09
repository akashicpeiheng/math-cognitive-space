/**
 * 行动（行动契约）标题的英文覆盖：id → 译文。
 *
 * 行动标题出现在规划结果的每一步、网络页的边标签、节点页的「可以怎么进入」里，
 * 所以它是**高频**文案，与节点标题同级重要。
 *
 * 装配方式：先合并各案例模块自带的 `actions`（`limit` / `rudin` 已完成），
 * 再合并本文件末尾的 `remaining`（其余案例：background / manifold / tensor /
 * group / dg / liang / rudin 的未完成部分）。两处出现同一个 id 会当场抛错——
 * 重复登记意味着同一个行动有两份说法，宁可启动失败也不要让其中一份静默生效。
 */

import limit from './limit.mjs';
import rudin from './rudin.mjs';

const MODULES = { limit, rudin };

/**
 * 其余案例的行动标题。键是中文源的行动 id；只写含中文的 `title`。
 * 专名（Cayley、Christoffel、Killing、Schwarzschild、Newman–Penrose、Units5…）
 * 保留原写法，不做音译。
 */
const remaining = {
  'a-bg:counterexample-method': { title: 'Propose the method of constructing counterexamples' },

  /* —— 案例 02：C^k 流形与光滑流形 —— */
  'm-chart': { title: 'Introduce charts and atlases' },
  'm-trans': { title: 'Construct transition maps' },
  'm-reg': { title: 'Introduce the C^k atlas condition' },
  'm-smooth': { title: 'Introduce smooth atlases' },
  'm-forget': { title: 'Forget from smooth down to C^k' },
  'm-max': { title: 'Prove the maximal compatible extension' },
  'm-example': { title: 'Construct the C¹ but not C² atlas for h' },
  'm-transition-eval': { title: 'Replay the same-chart transition certificate' },
  'm-method': { title: 'Propose the pairwise regularity check' },
  'm-pattern': { title: 'Register the one-direction check misconception' },
  'm-problem': { title: 'Pose the transition-domain exercise' },
  'm-compatible': { title: 'Introduce the compatibility relation on atlases' },
  'm-method-cover': { title: 'Propose the finite-cover method' },
  'm-method-extension': { title: 'Propose the extension test' },

  /* —— 案例 03：张量与张量场 —— */
  't-dual': { title: 'Introduce the dual space' },
  't-univ': { title: 'Introduce the tensor product and its universal property' },
  't-multilinear': { title: 'Introduce multilinear maps' },
  't-matrix': { title: 'Prove the change-of-basis law' },
  't-bridge': { title: 'Prove that tensors are isomorphic to linear operators' },
  't-bundle': { title: 'Construct the tensor bundle' },
  't-field': { title: 'Introduce tensor fields' },
  't-guard': { title: 'Give the counterexample: Christoffel symbols are not tensors' },
  't-infinite': { title: 'Give the infinite-dimensional rank counterexample' },
  't-rank1': { title: 'Replay the rank-one addition certificate' },
  't-method': { title: 'Propose the method of finding invariants' },
  't-pattern': { title: 'Register the index-array misconception' },
  't-problem': { title: 'Pose the transformation-law exercise' },
  't-method-basis': { title: 'Propose the term-by-term substitution check' },
  't-method-dimension': { title: 'Propose the dimension count' },

  /* —— 案例 04：群 —— */
  'g-perm': { title: 'Construct the permutation group example' },
  'g-geom': { title: 'Construct the triangle-symmetry example' },
  'g-mod': { title: 'Construct the Units5 example' },
  'g-abs-p': { title: 'Abstract the group from the permutation example' },
  'g-abs-g': { title: 'Abstract the group from the geometric example' },
  'g-abs-m': { title: 'Abstract the group from the modular-multiplication example' },
  'g-leftmul': { title: 'Construct the left-multiplication map' },
  'g-cayley': { title: 'Prove Cayley’s theorem' },
  'g-noncomm': { title: 'Give the non-commutativity counterexample S₃' },
  'g-injective': { title: 'Replay the injectivity fragment certificate for Cayley' },
  'g-method-abstract': { title: 'Propose the abstraction-from-special-cases method' },
  'g-method-counter': { title: 'Propose the S₃ counterexample method' },
  'g-pattern': { title: 'Register the commutativity misconception' },
  'g-problem': { title: 'Pose the Units5 inversion exercise' },
  'g-method-cayley': { title: 'Propose the multiplication-table check' },
  'g-method-order': { title: 'Propose the element-order comparison' },

  /* —— 案例 05：微分几何 —— */
  'a-dg:topological-space': { title: 'Introduce topological spaces' },
  'a-dg:metric-space': { title: 'Introduce metric spaces' },
  'a-dg:homeomorphism': { title: 'Introduce homeomorphisms' },
  'a-dg:compactness': { title: 'Introduce compactness' },
  'a-dg:metric-completeness': { title: 'Introduce metric completeness' },
  'a-dg:manifold': { title: 'Introduce manifolds' },
  'a-dg:coordinate-chart': { title: 'Introduce coordinate charts' },
  'a-dg:smooth-atlas': { title: 'Introduce smooth atlases' },
  'a-dg:smooth-structure': { title: 'Introduce smooth structures' },
  'a-dg:smooth-manifold': { title: 'Introduce smooth manifolds' },
  'a-dg:partition-of-unity': { title: 'Construct a partition of unity' },
  'a-dg:smooth-embedding': { title: 'Introduce smooth embeddings' },
  'a-dg:tangent-bundle': { title: 'Construct the tangent bundle' },
  'a-dg:tangent-curve': { title: 'Define tangent vectors via curves' },
  'a-dg:tangent-derivation': { title: 'Define tangent vectors via derivations' },
  'a-dg:tangent-equivalence': { title: 'Prove the two definitions of a tangent vector equivalent' },
  'a-dg:tangent-basis': { title: 'Give the coordinate basis of the tangent space' },
  'a-dg:vector-field': { title: 'Introduce smooth vector fields' },
  'a-dg:distribution': { title: 'Introduce smooth tangent distributions' },
  'a-dg:tensor': { title: 'Introduce tensors' },
  'a-dg:differential-form': { title: 'Introduce differential forms' },
  'a-dg:form-wedge': { title: 'Introduce the wedge product' },
  'a-dg:form-d-squared-zero': { title: 'Prove that the exterior derivative squares to zero' },
  'a-dg:form-pullback': { title: 'Introduce the pullback of differential forms' },
  'a-dg:implicit': { title: 'State the implicit function theorem' },
  'a-dg:inverse': { title: 'State the inverse function theorem' },
  'a-dg:stokes': { title: 'State the generalized Stokes theorem' },
  'a-dg:poincare-lemma': { title: 'State the Poincaré lemma' },
  'a-dg:claim-tangent-equivalence': { title: 'Prove the equivalence of the two definitions of a tangent vector' },
  'a-dg:claim-d-squared-zero': { title: 'Prove that the exterior derivative squares to zero' },
  'a-dg:pattern-manifold-is-surface': { title: 'Register the misconception “a manifold is an embedded surface”' },
  'a-dg:pattern-global-coordinates': { title: 'Register the misconception “global coordinates exist”' },
  'a-dg:pattern-derivation-ignores-leibniz': { title: 'Register the misconception “linearity is enough”' },
  'a-dg:pattern-closed-implies-exact': { title: 'Register the misconception “closed implies exact”' },
  'a-dg:method-inverse-check': { title: 'Propose the inverse-function-theorem check' },
  'a-dg:method-closed-form-test': { title: 'Propose the test for exactness of closed forms' },

  /* —— 案例 06：梁灿彬《微分几何与广义相对论》第一册 —— */
  'a-liang:topological-space': { title: 'Introduce topological spaces' },
  'a-liang:continuous-map': { title: 'Introduce continuous maps and homeomorphisms' },
  'a-liang:compactness': { title: 'Introduce compactness' },
  'a-liang:manifold': { title: 'Introduce differentiable manifolds' },
  'a-liang:tangent-vector': { title: 'Introduce tangent vectors' },
  'a-liang:vector-field': { title: 'Introduce vector fields' },
  'a-liang:dual-vector-field': { title: 'Introduce dual vector fields' },
  'a-liang:tensor-field': { title: 'Introduce tensor fields and contraction' },
  'a-liang:metric-tensor': { title: 'Introduce the metric tensor field' },
  'a-liang:abstract-index': { title: 'Introduce abstract index notation' },
  'a-liang:derivative-operator': { title: 'Introduce derivative operators' },
  'a-liang:christoffel': { title: 'Construct the derivative operator compatible with the metric' },
  'a-liang:parallel-transport': { title: 'Introduce parallel transport along a curve' },
  'a-liang:geodesic': { title: 'Introduce geodesics' },
  'a-liang:riemann-tensor': { title: 'Introduce the Riemann curvature tensor' },
  'a-liang:ricci-einstein': { title: 'Contract to the Ricci and Einstein tensors' },
  'a-liang:intrinsic-extrinsic-curvature': { title: 'Distinguish intrinsic from extrinsic curvature' },
  'a-liang:pushforward-pullback': { title: 'Introduce pushforwards and pullbacks' },
  'a-liang:lie-derivative': { title: 'Introduce the Lie derivative' },
  'a-liang:killing-field': { title: 'Introduce Killing vector fields' },
  'a-liang:hypersurface': { title: 'Introduce hypersurfaces and normal vectors' },
  'a-liang:differential-form': { title: 'Introduce differential forms and the wedge product' },
  'a-liang:exterior-derivative': { title: 'Introduce the exterior derivative' },
  'a-liang:volume-element': { title: 'Construct the volume element' },
  'a-liang:stokes-theorem': { title: 'State Stokes’ theorem' },
  'a-liang:gauss-theorem': { title: 'State Gauss’ theorem and its dual form' },
  'a-liang:minkowski-spacetime': { title: 'Introduce Minkowski spacetime' },
  'a-liang:inertial-observer': { title: 'Introduce inertial observers and inertial frames' },
  'a-liang:proper-time': { title: 'Introduce proper time and coordinate time' },
  'a-liang:kinematic-effects': { title: 'Analyse length contraction, time dilation and the twin effect' },
  'a-liang:four-momentum': { title: 'Introduce the 4-velocity and the 4-momentum' },
  'a-liang:energy-momentum-tensor': { title: 'Introduce the energy-momentum tensor and perfect fluids' },
  'a-liang:electromagnetic-tensor': { title: 'Introduce the electromagnetic field tensor and Maxwell’s equations' },
  'a-liang:four-potential': { title: 'Introduce the electromagnetic 4-potential and the light-wave Doppler effect' },
  'a-liang:gravity-as-geometry': { title: 'Geometrise gravity' },
  'a-liang:equivalence-principle': { title: 'State the equivalence principle and local inertial frames' },
  'a-liang:fermi-transport': { title: 'Introduce Fermi transport and non-rotating observers' },
  'a-liang:tidal-deviation': { title: 'Derive tidal forces and the geodesic deviation equation' },
  'a-liang:einstein-equation': { title: 'State the Einstein field equations' },
  'a-liang:linearized-gravity': { title: 'Take the linear approximation and the Newtonian limit' },
  'a-liang:static-stationary': { title: 'Introduce stationary, static and spherically symmetric spacetimes' },
  'a-liang:schwarzschild-solution': { title: 'Solve for the Schwarzschild vacuum solution' },
  'a-liang:birkhoff-theorem': { title: 'State Birkhoff’s theorem' },
  'a-liang:reissner-nordstrom': { title: 'Solve for the Reissner–Nordström solution' },
  'a-liang:np-formalism': { title: 'Rewrite in Newman–Penrose form' },
  'a-liang:schwarzschild-geodesics': { title: 'Solve the geodesics of Schwarzschild spacetime' },
  'a-liang:classical-tests': { title: 'Derive the predictions of the three classical tests' },
  'a-liang:stellar-interior': { title: 'Derive stellar interior solutions and the mass limit' },
  'a-liang:kruskal-extension': { title: 'Construct the Kruskal extension' },
  'a-liang:schwarzschild-black-hole': { title: 'Argue for gravitational collapse and the Schwarzschild black hole' },
  'a-liang:cosmological-principle': { title: 'Introduce the cosmological principle' },
  'a-liang:rw-metric': { title: 'Derive the Robertson–Walker metric' },
  'a-liang:hubble-redshift': { title: 'Derive Hubble’s law and cosmological redshift' },
  'a-liang:scale-factor': { title: 'Derive the evolution equation of the scale factor' },
  'a-liang:thermal-history': { title: 'Organise the thermal history of the universe and the particle horizon' },
  'a-liang:inflation': { title: 'State the inflationary model and the problems it solves' },
  'a-liang:new-standard-cosmology': { title: 'Organise dark energy and the new standard cosmological model' },
  'a-liang:method-index-balance': { title: 'Propose a method: abstract index balancing and raising and lowering indices' },
  'a-liang:method-metric-curvature': { title: 'Propose a method: a fixed computation from metric to curvature' },
  'a-liang:method-symmetry-conservation': { title: 'Propose a method: turn Killing fields into conserved quantities' },
  'a-liang:pattern-curvature-needs-embedding': { title: 'Register the misconception: curvature is visible only through an external embedding' },
  'a-liang:pattern-christoffel-is-tensor': { title: 'Register the misconception: treating Christoffel symbols as a tensor' },
  'a-liang:pattern-redshift-is-doppler': { title: 'Register the misconception: reading cosmological redshift directly as a Doppler effect' },

  /* —— 案例 07：Rudin《数学分析原理》 —— */
  'a-rudin:ordered-field': { title: 'Introduce ordered fields' },
  'a-rudin:least-upper-bound': { title: 'State the least-upper-bound property of the real field' },
  'a-rudin:extended-real': { title: 'Introduce the extended real number system' },
  'a-rudin:complex-field': { title: 'Construct the complex field' },
  'a-rudin:euclidean-space': { title: 'Introduce Euclidean space R^k' },
  'a-rudin:countable-set': { title: 'Introduce countable and uncountable sets' },
  'a-rudin:metric-space': { title: 'Introduce metric spaces' },
  'a-rudin:compact-set': { title: 'State compactness and the Heine–Borel theorem' },
  'a-rudin:perfect-set': { title: 'Introduce perfect sets and the Cantor set' },
  'a-rudin:connected-set': { title: 'Introduce connected sets' },
  'a-rudin:convergent-sequence': { title: 'Introduce convergent sequences and subsequences' },
  'a-rudin:bolzano-weierstrass': { title: 'State the Bolzano–Weierstrass theorem' },
  'a-rudin:cauchy-sequence': { title: 'Introduce Cauchy sequences and completeness' },
  'a-rudin:series-convergence': { title: 'Give convergence criteria for series' },
  'a-rudin:power-series': { title: 'Give the radius of convergence of a power series' },
  'a-rudin:absolute-convergence': { title: 'Discuss absolute convergence and rearrangement' },
  'a-rudin:continuous-function': { title: 'Introduce continuous functions' },
  'a-rudin:continuity-compactness': { title: 'Prove the properties of continuous functions on compact sets' },
  'a-rudin:continuity-connectedness': { title: 'Prove the intermediate value theorem' },
  'a-rudin:derivative': { title: 'Introduce the derivative' },
  'a-rudin:mean-value-theorem': { title: 'Prove the mean value theorem' },
  'a-rudin:lhospital-rule': { title: 'State L’Hospital’s rule' },
  'a-rudin:taylor-theorem': { title: 'State Taylor’s theorem' },
  'a-rudin:vector-derivative': { title: 'Introduce differentiation of vector-valued functions' },
  'a-rudin:riemann-stieltjes': { title: 'Construct the Riemann–Stieltjes integral' },
  'a-rudin:integral-properties': { title: 'Give the properties of the integral' },
  'a-rudin:fundamental-theorem': { title: 'Prove the fundamental theorem of calculus' },
  'a-rudin:rectifiable-curve': { title: 'Introduce rectifiable curves' },
  'a-rudin:uniform-convergence': { title: 'Introduce uniform convergence' },
  'a-rudin:uniform-convergence-properties': { title: 'Discuss the properties preserved by uniform convergence' },
  'a-rudin:equicontinuous': { title: 'Introduce equicontinuous families' },
  'a-rudin:stone-weierstrass': { title: 'State the Stone–Weierstrass theorem' },
  'a-rudin:exponential-logarithm': { title: 'Construct the exponential and logarithmic functions' },
  'a-rudin:trigonometric-functions': { title: 'Construct the trigonometric functions' },
  'a-rudin:algebraic-completeness': { title: 'Prove the fundamental theorem of algebra' },
  'a-rudin:fourier-series': { title: 'Expand Fourier series' },
  'a-rudin:gamma-function': { title: 'Construct the Γ function' },
  'a-rudin:linear-transformation': { title: 'Introduce linear transformations and the operator norm' },
  'a-rudin:several-variable-derivative': { title: 'Introduce the derivative of functions of several variables' },
  'a-rudin:contraction-principle': { title: 'Prove the contraction mapping principle' },
  'a-rudin:inverse-function-theorem': { title: 'Prove the inverse function theorem' },
  'a-rudin:implicit-function-theorem': { title: 'Prove the implicit function theorem' },
  'a-rudin:rank-theorem': { title: 'Prove the rank theorem' },
  'a-rudin:primitive-mapping': { title: 'Introduce primitive mappings and partitions of unity' },
  'a-rudin:differential-form': { title: 'Introduce differential forms' },
  'a-rudin:simplex-chain': { title: 'Introduce simplices and chains' },
  'a-rudin:stokes-theorem': { title: 'Prove Stokes’ theorem' },
  'a-rudin:closed-exact-form': { title: 'Discuss closed and exact forms' },
  'a-rudin:set-function': { title: 'Introduce set functions' },
  'a-rudin:lebesgue-measure': { title: 'Construct the Lebesgue measure' },
  'a-rudin:measurable-function': { title: 'Introduce measurable functions' },
  'a-rudin:lebesgue-integral': { title: 'Construct the Lebesgue integral' },
  'a-rudin:l2-space': { title: 'Construct the L² space' },
  'a-rudin:method-epsilon-estimate': { title: 'Propose a method: ε–N and ε–δ estimates' },
  'a-rudin:method-compactness-transfer': { title: 'Propose a method: use compactness to globalise local conclusions' },
};

const actions = {};
const register = (id, entry, source) => {
  if (actions[id]) throw new Error(`行动译文重复登记：${id}（来源 ${source}）`);
  actions[id] = entry;
};

for (const [caseId, module] of Object.entries(MODULES)) {
  const overlay = module?.default ?? module;
  for (const [id, entry] of Object.entries(overlay.actions ?? {})) register(id, entry, caseId);
}
for (const [id, entry] of Object.entries(remaining)) register(id, entry, 'actions.mjs/remaining');

export default actions;
