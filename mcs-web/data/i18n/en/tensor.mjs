/**
 * 英文覆盖：案例 03「张量与张量场」（`tensor`）的**节点元数据与表征**。
 *
 * 张量这一案例的英文术语最容易被写歪，固定口径如下（与 `glossary.mjs` 一致）：
 * 对偶空间 dual space、张量积 tensor product、多重线性 multilinear、
 * 换基 change of basis、指标 index（上指标 upper index、下指标 lower index）、
 * 丛 bundle、纤维 fibre、截面 section、局部平凡化 local trivialisation、
 * 粘合 gluing、通用性质 universal property、秩一 rank one。
 *
 * 数学记号（`V*`、`T^r_s`、`A⁻¹`、`⇒`、`≠`）逐字保留；`provenance.sources` 不翻译。
 */

export default {
  nodes: {
    'tensor:dual': {
      title: 'Dual space',
      summary: 'V*=Hom(V,F), the space of linear functionals.',
      formal: {
        objectType: 'space of linear functionals',
        formationWitness: 'Parameters and predicate are closed under their declared types.',
        boundary: ['Without a metric or an inner product there is no natural isomorphism V≅V*.'],
      },
      representations: [
        { title: 'Space of linear functionals', medium: 'formula', note: 'Elements of V* act on V and return scalars.' },
      ],
      motivation: {
        internal: ['Tensors have to eat vectors and covectors at the same time.'],
        external: ['Linear functionals and measurement.'],
        aesthetic: ['Duality turns “acting on” into an object.'],
        growthChain: ['linear map → evaluation functional → dual space'],
      },
      teaching: {
        conditions: [
          { condition: 'finite dimension', remove: 'generalise the natural isomorphism to infinite dimension directly', counterexample: 'for infinite-dimensional V the natural embedding into V** need not be surjective', effect: 'The isomorphism conclusion fails.' },
        ],
        commonMisconceptions: ['Assuming by default that V and V* are naturally isomorphic.'],
        reviewQuestions: ['On what choice does the dual basis depend?'],
      },
      provenance: { note: 'The finite-dimensional condition and the infinite-dimensional counterexample are kept apart.' },
    },

    'tensor:tensor-product': {
      title: 'Tensor product',
      summary: 'The universal object for bilinear maps.',
      formal: {
        objectType: 'universal bilinear object',
        formationWitness: 'Parameters and predicate are closed under their declared types.',
        boundary: ['Existence and uniqueness of the universal property come from the shared background in linear algebra.'],
      },
      representations: [
        { title: 'Universal property', medium: 'formula and commutative diagram', note: 'Every bilinear map factors uniquely through the tensor product.' },
      ],
      motivation: {
        internal: ['It turns a bilinear problem into a linear one.'],
        external: ['Multilinear measurement and physical quantities.'],
        aesthetic: ['The universal property eliminates coordinates.'],
        growthChain: ['bilinear map → component intuition → universal object'],
      },
      teaching: {
        conditions: [
          { condition: 'bilinear', remove: 'allow arbitrary functions', counterexample: 'an arbitrary function cannot factor through a linear map', effect: 'The universal property fails.' },
        ],
        commonMisconceptions: ['Taking the tensor product for a componentwise product.'],
        reviewQuestions: ['What does “unique” constrain in the universal property?'],
      },
      provenance: { note: 'The finite-dimensional condition and the infinite-dimensional counterexample are kept apart.' },
    },

    'tensor:tensor-rs': {
      title: 'The tensor space of type (r,s)',
      formal: {
        objectType: 'tensor space',
        assumptions: ['r and s are finite'],
        formationWitness: 'Parameters and predicate are closed under their declared types.',
        boundary: ['The tensor product of zero factors is by convention F.'],
      },
      formalStatement: {
        reading: 'The tensor space of type (r, s) is the tensor product of r copies of V and s copies of V*; its dimension is (dim V)^{r+s}.',
        notation: [
          { means: 'the dual space Hom(V, F)' },
          { means: 'the orders of contravariance and covariance; an index upstairs is contravariant, one downstairs is covariant' },
          { means: 'the tensor product; the universal object for bilinear maps' },
        ],
        note: 'The order of the indices is written differently in different texts (some put the covariant ones first); this site registers “first the r copies of V, then the s copies of V*”, consistent with the notation of `tensor:tensor-rs`.',
      },
      representations: [
        { title: 'Tensor-space formula', medium: 'formula', note: 'Upper and lower indices correspond to the contravariant and covariant directions.' },
      ],
      motivation: {
        internal: ['It handles multilinear objects uniformly.'],
        external: ['Stress, curvature and the electromagnetic tensor.'],
        aesthetic: ['The symmetric structure of upper and lower indices.'],
        growthChain: ['vectors and duality → multiple tensor products → T^r_s'],
      },
      teaching: {
        conditions: [
          { condition: 'r and s are finite', remove: 'use infinite tensor products directly', counterexample: 'an algebraic tensor contains finite sums only', effect: 'The natural-isomorphism argument fails.' },
        ],
        commonMisconceptions: ['Treating the order of upper and lower indices as irrelevant.'],
        reviewQuestions: ['Why can a tensor of type (1,1) correspond to a linear map?'],
      },
      provenance: { note: 'The finite-dimensional condition and the infinite-dimensional counterexample are kept apart.' },
    },

    'tensor:multilinear': {
      title: 'Multilinear maps',
      summary: 'Multilinear maps (V*)^r×V^s→F.',
      formal: {
        objectType: 'multilinear map',
        formationWitness: 'Parameters and predicate are closed under their declared types.',
        boundary: ['Multilinearity and linearity are not the same condition.'],
      },
      representations: [
        { title: 'Linearity in each variable', medium: 'formula', note: 'Linear in each variable once the others are fixed.' },
      ],
      motivation: {
        internal: ['The operational definition of tensors and their computation in coordinates.'],
        external: ['Multilinear response functions.'],
        aesthetic: ['A product structure that is linear in each variable.'],
        growthChain: ['linear map → bilinear → multilinear'],
      },
      teaching: {
        conditions: [
          { condition: 'linear in every variable', remove: 'require linearity only in the first variable', counterexample: 'mixed partial derivatives, or a doubly linear counterexample', effect: 'Tensoriality fails.' },
        ],
        commonMisconceptions: ['Calling every multilinear function a tensor.'],
        reviewQuestions: ['How is the space of multilinear maps related to T^r_s?'],
      },
      provenance: { note: 'The finite-dimensional condition and the infinite-dimensional counterexample are kept apart.' },
    },

    'tensor:basis-law': {
      title: 'Change-of-basis law',
      summary: 'Under a change of basis the components of one and the same tensor transform according to their upper and lower indices.',
      formal: {
        formula: 'each upper index is multiplied by A⁻¹ and each lower index by A; general components satisfy [T]′ = A^{…}T A^{…}',
        boundary: ['The law is the expression of the same object in two bases; it does not create a new object.'],
      },
      motivation: {
        internal: ['It separates the object from its coordinate representation.'],
        external: ['Physical quantities under coordinate changes.'],
        aesthetic: ['The natural pairing of index counting with the transformation law.'],
        growthChain: ['matrix of a linear map → change of basis → general index law'],
      },
      teaching: {
        proofOverview: 'First substitute the old coordinates Av′ into the linear map, then express the output in the new coordinates as A⁻¹LAv′; since this holds for every v′ one obtains the matrix identity, and general tensors follow by linear extension in each factor.',
        conditions: [
          { condition: 'the same linear map', remove: 'treat the change of basis as changing the map', counterexample: 'the matrices of one map before and after a change of basis are similar but not equal', effect: 'A change of expression is mistaken for a change of object.' },
        ],
        commonMisconceptions: ['Taking every array of indices for a tensor.'],
        reviewQuestions: ['Why are the Christoffel symbols not a tensor?'],
      },
      provenance: { note: 'The finite-dimensional condition and the infinite-dimensional counterexample are kept apart.' },
    },

    'tensor:end-iso': {
      title: 'Isomorphism between tensors and linear operators',
      summary: 'In finite dimension Φ:V⊗V*→End(V) is a natural isomorphism.',
      formal: {
        assumptions: ['dim V is finite'],
        formula: 'Φ(v⊗α)(w)=α(w)v; dim V<∞ ⇒ Φ is an isomorphism',
        boundary: ['The definition of Φ chooses no basis; a basis is used only to prove bijectivity.'],
      },
      motivation: {
        internal: ['Tensors of type (1,1) and linear maps should translate into each other.'],
        external: ['The interface between the algebra of linear operators and the tensor algebra.'],
        aesthetic: ['A coordinate-free definition with a basis proof.'],
        growthChain: ['rank-one map → bilinear → universal property → isomorphism'],
      },
      teaching: {
        proofOverview: '(v,α)↦(w↦α(w)v) is bilinear and induces Φ; choosing a basis and its dual basis, Φ(e_i⊗ε^j) is the matrix unit E_ij, the two sides have the same dimension and the bases correspond, so Φ is an isomorphism.',
        conditions: [
          { condition: 'finite dimension', remove: 'generalise to infinite dimension', counterexample: 'the identity operator has infinite rank and is not in the image of the algebraic tensor product', effect: 'Surjectivity fails.' },
        ],
        commonMisconceptions: ['Taking the basis proof for a definition of Φ that depends on a basis.'],
        reviewQuestions: ['Which direction exactly does the infinite-dimensional counterexample rule out?'],
      },
      provenance: { note: 'The finite-dimensional condition and the infinite-dimensional counterexample are kept apart.' },
    },

    'tensor:rank1-additive': {
      title: 'A rank-one map preserves addition',
      summary: 'Machine-certified fragment: R(x)=α(x)v preserves addition.',
      formal: {
        assumptions: ['α preserves addition', 'scalars distribute over addition'],
        formula: 'R(x+y)=R(x)+R(y), where R(x)=α(x)v',
        boundary: ['It contains no scalar linearity, no universal property of the tensor product, no basis, no finite-dimensional bijection and no bundle or section.'],
      },
      motivation: {
        internal: ['The algebraic step most often reused inside tensor proofs.'],
        external: ['It shows how conditions are carried along with the certificate.'],
        aesthetic: ['Term-by-term substitution.'],
        growthChain: ['definition of Φ → the rank-one case → the addition-preservation certificate'],
      },
      teaching: {
        proofOverview: 'Expand R(x+y)=α(x+y)v=(α(x)+α(y))v=α(x)v+α(y)v.',
        conditions: [
          { condition: 'α is additive', remove: 'delete additivity', counterexample: 'on the one-dimensional space over F₂ take α constantly 1 and v=1', effect: 'R(x+y)≠R(x)+R(y).' },
          { condition: 'the scalar distributive law', remove: 'keep α additive but define the scalar action to be constantly 1', counterexample: 'over F₂, R(x+y)=1 while R(x)+R(y)=0', effect: 'The conclusion fails.' },
        ],
        commonMisconceptions: ['Taking this step to mean that the full isomorphism has been certified.'],
        reviewQuestions: ['What still has to be proved in the next step?'],
      },
      provenance: { note: 'The finite-dimensional condition and the infinite-dimensional counterexample are kept apart.' },
    },

    'tensor:proof-rank1-additive': {
      title: 'Rank-one addition certificate',
      summary: 'A local certificate accepted by the existing ND-subset checker, carrying one open assumption.',
      formal: {
        openAssumptions: ['α preserves addition'],
        boundary: ['The scalar distributive law is a closed theory axiom; the remaining vector-space axioms are not encoded.'],
      },
      teaching: {
        reviewQuestions: ['Which open assumption does this certificate depend on? Which obligations are still missing for the full isomorphism?'],
      },
      provenance: { note: 'The finite-dimensional condition and the infinite-dimensional counterexample are kept apart.' },
    },

    'tensor:bundle': {
      title: 'Tensor bundle',
      summary: 'The smooth bundle whose fibre over each point is T^r_s(T_xX).',
      formal: {
        steps: [{ note: 'Finite steps to be expanded.' }],
        verificationTarget: 'The local trivialisations and transition functions satisfy the gluing conditions of a bundle.',
        boundary: ['Smoothness and the transition law come from the definition of a bundle; they are not encoded as a machine certificate.'],
      },
      representations: [
        { title: 'Pointwise gluing of fibres', medium: 'finite steps', note: 'The transition functions are the tensor change-of-basis law.' },
      ],
      motivation: {
        internal: ['It organises pointwise tensors into a global structure.'],
        external: ['Curvature and stress fields.'],
        aesthetic: ['Local linear data are glued into a global object.'],
        growthChain: ['pointwise tensors → coordinate charts → transition functions → bundle'],
      },
      teaching: {
        proofOverview: 'The fibres are assembled by local trivialisations; between neighbouring charts the components transform by the change-of-basis law for upper and lower indices, which makes the gluing well defined.',
        conditions: [
          { condition: 'the atlas covers X', remove: 'delete the cover', counterexample: 'an uncovered point has no local fibre coordinates', effect: 'The global construction has a gap.' },
        ],
        commonMisconceptions: ['Any pointwise assignment can be assembled into a bundle.'],
        reviewQuestions: ['What role do the transition functions play here?'],
      },
      provenance: { note: 'The finite-dimensional condition and the infinite-dimensional counterexample are kept apart.' },
    },

    'tensor:field': {
      title: 'Tensor field',
      summary: 'A smooth section of the tensor bundle.',
      formal: {
        objectType: 'space of sections',
        formationWitness: 'Parameters and predicate are closed under their declared types.',
        boundary: ['The equivalence between smooth sections and local components needs the correct transition functions.'],
      },
      representations: [
        { title: 'Smooth section', medium: 'formula', note: 'The value at each point lies in the corresponding fibre and varies smoothly with the point.' },
      ],
      motivation: {
        internal: ['Geometry and physics care about tensors that vary from point to point.'],
        external: ['The electromagnetic field and curvature.'],
        aesthetic: ['A section lifts the pointwise structure of a bundle to a global object.'],
        growthChain: ['tensor → tensor bundle → section'],
      },
      teaching: {
        conditions: [
          { condition: 'smooth', remove: 'require only a pointwise value', counterexample: 'assigning values pointwise after choosing a basis arbitrarily does not guarantee smoothness', effect: 'The definition of a section fails.' },
        ],
        commonMisconceptions: ['Taking every array of indices for a tensor field.'],
        reviewQuestions: ['When do local components and sections correspond one to one?'],
      },
      provenance: { note: 'The finite-dimensional condition and the infinite-dimensional counterexample are kept apart.' },
    },

    'tensor:non-tensor-gamma': {
      title: 'The Christoffel symbols are not a tensor',
      summary: 'Under a change of basis the connection coefficients acquire an inhomogeneous term.',
      formal: {
        target: 'every array with indices is a tensor',
        failureWitness: 'The coefficients of one and the same connection in two coordinates do not transform by the tensor change-of-basis law.',
        boundary: ['The counterexample rules out only the over-generalisation “every array of indices is a tensor”.'],
      },
      representations: [
        { title: 'Christoffel counterexample', medium: 'computation', note: 'The inhomogeneous term breaks the tensor transformation law.' },
      ],
      motivation: {
        internal: ['Looking like an indexed array is not the same as being tensorial.'],
        external: ['The difference between a connection and a curvature.'],
        aesthetic: ['The transformation law is the minimal criterion.'],
        growthChain: ['array of indices → transformation-law check → non-tensor counterexample'],
      },
      teaching: {
        proofOverview: 'Computing with the change-of-coordinates formula for a connection, the inhomogeneous term cannot be removed, so the tensor transformation law does not hold.',
        conditions: [
          { condition: 'use the change-of-coordinates formula for the connection', remove: 'compare only the shape of the array', counterexample: 'any array can be written with upper and lower indices', effect: 'The criterion “it looks like a tensor” fails.' },
        ],
        commonMisconceptions: ['Taking upper and lower indices for the definition of a tensor.'],
        reviewQuestions: ['How can the transformation law rule out a candidate?'],
        selfCheck: [
          { prompt: 'Write out the difference between the transformation law of a tensor and that of the connection coefficients.', competence: 'structural analysis', criterion: 'Point out the inhomogeneous term.' },
        ],
      },
      provenance: { note: 'The finite-dimensional condition and the infinite-dimensional counterexample are kept apart.' },
    },

    'tensor:infinite-rank': {
      title: 'The infinite-dimensional identity operator is not in the image of Φ',
      summary: 'The image of the algebraic tensor product contains finite-rank operators only.',
      formal: {
        target: 'in infinite dimension Φ:V⊗V*→End(V) is surjective',
        objectSpec: { V: 'an infinite-dimensional vector space' },
        failureWitness: 'The identity operator is not of finite rank, whereas the image of v⊗α is one-dimensional and a finite sum still has finite rank.',
        boundary: ['It refutes only surjectivity in infinite dimension; it does not refute injectivity or the finite-dimensional isomorphism.'],
      },
      representations: [
        { title: 'Infinite-dimensional rank counterexample', medium: 'proof', note: 'Finite sums keep finite rank.' },
      ],
      motivation: {
        internal: ['The finite-dimensional condition is used substantially at the point where surjectivity is proved.'],
        external: ['The difference between infinite-dimensional operator algebras and the algebraic tensor product.'],
        aesthetic: ['Rank is the minimal obstruction.'],
        growthChain: ['finite-dimensional proof → inspect surjectivity → infinite-dimensional counterexample'],
      },
      teaching: {
        proofOverview: 'The image of each v⊗α is at most one-dimensional; a finite sum is at most finite-dimensional; the identity operator has the whole infinite-dimensional space as its image.',
        conditions: [
          { remove: 'delete the finite-dimensional condition', counterexample: 'the identity operator when V is infinite-dimensional', effect: 'Surjectivity fails.' },
        ],
        commonMisconceptions: ['Generalising the finite-dimensional isomorphism without conditions.'],
        reviewQuestions: ['Does injectivity still hold in infinite dimension?'],
      },
      provenance: { note: 'The finite-dimensional condition and the infinite-dimensional counterexample are kept apart.' },
    },

    'tensor:method-invariant': {
      title: 'Finding invariants',
      summary: 'Distinguish objects from representations by quantities that are preserved under a change of basis.',
      formal: {
        name: 'Finding invariants',
        scope: 'global method',
        In: 'a geometric or algebraic problem that involves a choice of representation',
        Out: 'candidate invariants together with a proof that they are preserved',
        Pre: 'the family of transformations and its effective domain have been declared',
        Post: 'the invariant, its range of preservation and the boundary where it fails',
        Fail: 'A quantity whose preservation has not been proved is only a candidate; several examples leaving it unchanged do not make it an invariant.',
        fail: 'A quantity whose preservation has not been proved is only a candidate; several examples leaving it unchanged do not make it an invariant.',
        body: 'List the family of transformations, find a quantity preserved by every allowed transformation, then check whether it distinguishes the target objects.',
        boundary: ['The method does not replace a proof of preservation.'],
      },
      motivation: {
        internal: ['The object does not change with the coordinates; the representation does.'],
        external: ['Conserved quantities and gauge invariance.'],
        aesthetic: ['Invariants remove coordinate noise.'],
        growthChain: ['change of basis → preserved quantity → invariant'],
      },
      teaching: {
        selfCheck: [
          { prompt: 'Find a criterion for the isomorphism Φ that is preserved under a change of basis.', competence: 'using a method', criterion: 'For instance rank or dimension; a proof is required.' },
        ],
        reviewQuestions: ['Under which family of transformations is the candidate invariant preserved?'],
      },
      provenance: { note: 'The finite-dimensional condition and the infinite-dimensional counterexample are kept apart.' },
    },

    'tensor:pattern-index-array': {
      title: 'Misconception: every array of indices is a tensor',
      summary: 'Taking the shape of upper and lower indices for a criterion of tensoriality.',
      formal: {
        wrongRule: 'any array with upper and lower indices transforms as a tensor',
        task: 'check the change-of-basis law of a candidate array',
        counterexample: 'the Christoffel symbols carry an inhomogeneous term',
        scope: 'It refutes only the rule “the shape alone decides whether something is a tensor”; it does not deny that some particular array does satisfy the transformation law.',
        boundary: ['Whether an individual holds this misconception belongs to the external model E.'],
      },
      motivation: {
        internal: ['Index notation easily hides the transformation law.'],
        external: ['Notational confusion in physics textbooks.'],
        aesthetic: ['Use the transformation law as the discriminant.'],
        growthChain: ['index shape → transformation law → counterexample'],
      },
      teaching: {
        selfCheck: [
          { prompt: 'Write the transformation factors for upper and for lower indices.', competence: 'stating a definition', criterion: 'A⁻¹ for an upper index, A for a lower index.' },
        ],
        reviewQuestions: ['Why is “it looks like one” not a definition?'],
      },
      provenance: { note: 'The finite-dimensional condition and the infinite-dimensional counterexample are kept apart.' },
    },

    'tensor:problem-transform-law': {
      title: 'Check the transformation law of a candidate array',
      summary: 'Given a coordinate change and candidate components, decide whether they form a tensor.',
      formal: {
        goal: 'Apply the transformation factors to upper and lower indices separately and decide whether the candidate array satisfies the tensor transformation law.',
        boundary: ['An open computational problem does not pretend to have a general decision procedure.'],
      },
      motivation: {
        internal: ['It turns the definition into an executable check.'],
        external: ['Checking dimensions and conservation under coordinate changes.'],
        aesthetic: ['A single substitution can refute it.'],
        growthChain: ['transformation law → substitution → identification of the inhomogeneous term'],
      },
      teaching: {
        selfCheck: [
          { prompt: 'Compute the transformed Γ^y_yy under y=x².', competence: 'computation', criterion: 'An inhomogeneous term appears.' },
        ],
        reviewQuestions: ['What extra structure would turn the connection coefficients into a tensor?'],
      },
      provenance: { note: 'The finite-dimensional condition and the infinite-dimensional counterexample are kept apart.' },
    },

    'tensor:method-basis-check': {
      title: 'Substitute upper and lower indices one by one to verify the transformation law',
      summary: 'Given a candidate array of components, attach the transformation factor to each upper and lower index, sum, and substitute directly to check whether the result equals the target value.',
      formal: {
        name: 'Substitute upper and lower indices one by one to verify the transformation law',
        scope: 'local method',
        In: 'a coordinate change and a candidate array of components',
        Out: 'the conclusion that the transformation law holds or is violated, together with the inhomogeneous term',
        Pre: 'the transformation matrix and its inverse have been written down',
        Post: 'a term-by-term check; in the violated case the position of the inhomogeneous term is pointed out',
        Fail: 'It substitutes only the given transformation; one example cannot establish that the law holds for all transformations. The refuting direction is reliable, the universal direction still needs a proof.',
        fail: 'It substitutes only the given transformation; one example cannot establish that the law holds for all transformations. The refuting direction is reliable, the universal direction still needs a proof.',
        body: 'Write the transformation matrix A and its inverse A⁻¹; attach A⁻¹ to upper indices and A to lower indices; sum term by term and compare with the value of the candidate array in the same coordinates; when they differ, write the difference as the inhomogeneous term.',
        boundary: ['A single substitution can only refute, never confirm; confirmation needs a general proof.'],
      },
      motivation: {
        internal: ['The transformation law is an equality that can be checked term by term, so substitution decides it.'],
        external: ['Checking dimensions and conservation under coordinate changes.'],
        aesthetic: ['It reduces a structural question to one algebraic substitution.'],
        growthChain: ['confusion about index shape → write the transformation factors → substitute term by term → the inhomogeneous term'],
      },
      teaching: {
        selfCheck: [
          { prompt: 'Write the transformation factors for upper and for lower indices separately.', competence: 'computation', criterion: 'A⁻¹ for an upper index, A for a lower index.' },
        ],
        reviewQuestions: ['Why does one refuting substitution suffice, while a hundred confirming examples still do not?'],
      },
      provenance: { note: 'The finite-dimensional condition and the infinite-dimensional counterexample are kept apart.' },
    },

    'tensor:method-dimension-count': {
      title: 'Use a dimension count to separate an isomorphism from its concrete realisation',
      summary: 'To see whether two tensor spaces can be isomorphic, count dimensions first: unequal dimensions rule it out at once, equal dimensions mean looking for an explicit map.',
      formal: {
        name: 'Use a dimension count to separate an isomorphism from its concrete realisation',
        scope: 'local method',
        In: 'descriptions of two tensor spaces',
        Out: 'a conclusion from comparing dimensions, or an explicit isomorphism still to be constructed',
        Pre: 'both spaces are finite-dimensional and their dimensions can be computed',
        Post: 'when the dimensions differ, a ruling-out; when they agree, the type of map that has to be constructed',
        Fail: 'Equal dimensions are only a necessary condition for an isomorphism; the method does not produce the isomorphism itself and does not apply to infinite-dimensional spaces.',
        fail: 'Equal dimensions are only a necessary condition for an isomorphism; the method does not produce the isomorphism itself and does not apply to infinite-dimensional spaces.',
        body: 'Count the free indices of the two spaces to obtain their dimensions; if they differ, rule the isomorphism out; if they agree, write down a candidate map and verify linearity and bijectivity.',
        boundary: ['The finite-dimensional hypothesis cannot be deleted; in infinite dimension the dimension argument fails.'],
      },
      motivation: {
        internal: ['The first step in deciding isomorphism for finite-dimensional spaces is the dimension.'],
        external: ['Before implementing index arithmetic, check that the degrees of freedom match.'],
        aesthetic: ['It rules out the largest class of errors with the least information.'],
        growthChain: ['a guess at an isomorphism → count dimensions → rule out, or turn into a construction task'],
      },
      teaching: {
        selfCheck: [
          { prompt: 'Count the dimensions of the tensor space of type (r,s) and of the End space and compare them.', competence: 'computation', criterion: 'When the two dimensions agree, an explicit map still has to be constructed.' },
        ],
        reviewQuestions: ['Where does the dimension argument depend on the finite-dimensional hypothesis?'],
      },
      provenance: { note: 'The finite-dimensional condition and the infinite-dimensional counterexample are kept apart.' },
    },
  },

  representations: {
    'rep-tensor-dual': { title: 'Space of linear functionals', medium: 'formula', note: 'Elements of V* act on V and return scalars.' },
    'rep-tensor-product': { title: 'Universal property', medium: 'formula and commutative diagram', note: 'Every bilinear map factors uniquely through the tensor product.' },
    'rep-tensor-rs': { title: 'Tensor-space formula', medium: 'formula', note: 'Upper and lower indices correspond to the covariant and contravariant directions.' },
    'rep-tensor-multilinear': { title: 'Linearity in each variable', medium: 'formula', note: 'Linear in each variable once the others are fixed.' },
    'rep-tensor-bundle': { title: 'Pointwise gluing of fibres', medium: 'finite steps', note: 'The transition functions are the tensor change-of-basis law.' },
    'rep-tensor-field': { title: 'Smooth section', medium: 'formula', note: 'The value at each point lies in the corresponding fibre and varies smoothly with the point.' },
    'rep-tensor-gamma': { title: 'Christoffel counterexample', medium: 'computation', note: 'The inhomogeneous term breaks the tensor transformation law.' },
    'rep-tensor-infinite': { title: 'Infinite-dimensional rank counterexample', medium: 'proof', note: 'Finite sums keep finite rank.' },
  },
};
