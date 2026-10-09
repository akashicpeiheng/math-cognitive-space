/**
 * 英文覆盖：案例 04「群概念的多来源」（`group`）的**节点元数据与表征**。
 *
 * 术语口径（`glossary.mjs`）：群 group、结合律 associativity、单位元 identity、
 * 逆元 inverse、交换 commutative、置换群 permutation group、左乘映射
 * left-multiplication map、左正则表示 left regular representation、
 * 群同态 group homomorphism、单射 injective、忠实 faithful。
 *
 * 固定记号：`S₃`、`Units5`、`L_g`、`(12)(23)`、`Z₆`、`≡`、`≠`、`∀`、`∃`、`→` 原样保留；
 * `provenance.sources` 不翻译（那是修订源的真实文件名）。
 */

export default {
  nodes: {
    'group:group-concept': {
      title: 'Group',
      summary: '(G,·,e,inv) satisfies the axioms of associativity, identity and inverses.',
      formal: {
        objectType: 'a set with an operation and a constant',
        assumptions: ['associativity', 'left and right identity', 'left and right inverses'],
        formationWitness: 'Parameters and predicate are closed under their declared types.',
        boundary: ['Commutativity is not part of the definition of a group.'],
      },
      formalStatement: {
        reading: 'A group is a set with a binary operation satisfying associativity, together with an identity and inverses: the operation is associative, e is a two-sided identity, and every element has a two-sided inverse.',
        notation: [
          { means: 'the identity; the axioms imply that it is unique' },
          { means: 'the inverse of a; the axioms imply that it is unique' },
          { symbol: '· closed', means: '“a binary operation on G” already includes closure, so it is not listed as a separate axiom' },
        ],
        note: 'Commutativity is **not** among the axioms: abelian groups are an extra class. When the operation symbol is omitted one writes ab, but in a non-abelian group ab ≠ ba.',
      },
      representations: [
        { title: 'Group-axiom template', medium: 'formula', note: 'Associativity, identity and inverses are listed separately.' },
      ],
      motivation: {
        internal: ['Symmetry needs one unified algebraic structure.'],
        external: ['Geometric symmetry, number theory and the theory of equations.'],
        aesthetic: ['It unifies structures from many sources with the fewest axioms.'],
        growthChain: ['symmetry operations → closure and associativity → identity and inverses → abstract group'],
      },
      teaching: {
        conditions: [
          { condition: 'associativity', remove: 'delete associativity', counterexample: 'a structure that is associative but has no inverses no longer supports the group arguments', effect: 'The composition identity for left-multiplication maps fails.' },
          { condition: 'left and right inverses and identity', remove: 'keep only a right identity', counterexample: 'one can construct a structure that is not a group but has a right identity', effect: 'The injectivity step of Cayley lacks a condition.' },
        ],
        commonMisconceptions: ['Taking commutativity to be a group axiom.'],
        reviewQuestions: ['How do the three entries converge on one and the same axiom template?'],
      },
      provenance: { note: 'The three entries share the abstract-group goal; the Cayley bridge is registered separately.' },
    },

    'group:perm': {
      title: 'Permutation group',
      summary: 'The bijections of X form a group under composition.',
      formal: {
        objectSpec: { op: 'composition', inv: 'the inverse map' },
        satisfaction: 'Composition is associative, the identity is the identity element, and the inverse of a bijection is again a bijection.',
        boundary: ['The convention for the action has to be declared first.'],
      },
      representations: [
        { title: 'Permutation group', medium: 'example', note: 'The group axioms are verified one by one.' },
      ],
      motivation: {
        internal: ['Permutations are the most general realisation of symmetry.'],
        external: ['Sorting, permutation tests and combinatorial counting.'],
        aesthetic: ['The other end of the Cayley bridge.'],
        growthChain: ['bijection → closure under composition → permutation group'],
      },
      teaching: {
        proofOverview: 'Check associativity of composition, the identity and inverses one by one.',
        commonMisconceptions: ['Taking a permutation group to be only a finite symmetry group.'],
        reviewQuestions: ['How does the convention for the order of composition affect the computation of a counterexample?'],
      },
      provenance: { note: 'The three entries share the abstract-group goal; the Cayley bridge is registered separately.' },
    },

    'group:triangle-sym': {
      title: 'Rigid symmetries of an equilateral triangle',
      summary: 'The rigid transformations preserving an equilateral triangle form a group.',
      formal: {
        objectSpec: { G: 'the rigid symmetries of an equilateral triangle', op: 'composition', e: 'the identity', inv: 'the inverse transformation' },
        satisfaction: 'Three rotations and three reflections; the composites and inverses still preserve the figure.',
        boundary: ['The geometric picture provides motivation; it does not replace the check of the group axioms.'],
      },
      representations: [
        { title: 'Triangle symmetries', medium: 'geometric diagram', note: 'The action on the vertices gives a faithful permutation representation.' },
      ],
      motivation: {
        internal: ['Geometric symmetry naturally produces a group structure.'],
        external: ['Symmetry of crystals and molecules.'],
        aesthetic: ['The geometric motivation and the algebraic structure illuminate each other.'],
        growthChain: ['symmetries of a figure → composition of operations → symmetry group'],
      },
      teaching: {
        proofOverview: 'List the six symmetries and check closure under composition and inverses.',
        commonMisconceptions: ['Taking “it looks symmetric” for having the same elements.'],
        reviewQuestions: ['Why is the action on the vertices faithful?'],
      },
      provenance: { note: 'The three entries share the abstract-group goal; the Cayley bridge is registered separately.' },
    },

    'group:units5': {
      title: 'The group of multiplicative units mod 5',
      summary: '{1,2,3,4} under multiplication mod 5 forms a cyclic group of order four.',
      formal: {
        objectSpec: { op: 'multiplication mod 5', inv: 'negating the exponent' },
        satisfaction: 'The powers of 2 are 1,2,4,3 in turn; closure, associativity, identity and inverses are verified item by item.',
        boundary: ['Commutativity in this example is an accidental feature, not a group axiom.'],
      },
      representations: [
        { title: 'Table of powers mod 5', medium: 'table', note: 'Verified by taking exponents mod 4.' },
      ],
      motivation: {
        internal: ['Number theory provides another source of groups.'],
        external: ['Modular arithmetic and cryptography.'],
        aesthetic: ['An explicit power table for a finite cyclic structure.'],
        growthChain: ['multiplication of residues → the set of units → power table → cyclic group'],
      },
      teaching: {
        proofOverview: 'Write the table of powers with 2 as generator and read off the identity and the inverses item by item.',
        commonMisconceptions: ['Generalising commutativity to all groups.'],
        reviewQuestions: ['What is the inverse of 3?'],
        selfCheck: [
          { prompt: 'Find the inverse of 3 in Units5.', competence: 'computation', criterion: '3·2≡1 mod 5, so the inverse is 2.' },
        ],
      },
      provenance: { note: 'The three entries share the abstract-group goal; the Cayley bridge is registered separately.' },
    },

    'group:cayley': {
      title: 'Cayley’s theorem',
      summary: 'Every group is isomorphic to a subgroup of the permutation group of its underlying set.',
      formal: {
        assumptions: ['the group axioms'],
        formula: '∀ group G ∃ an injective homomorphism G→Perm(G)',
        boundary: ['The conclusion does not say that every group is a finite symmetric group.'],
      },
      motivation: {
        internal: ['An abstract group can be realised concretely as a permutation group.'],
        external: ['Computing group actions through permutation representations.'],
        aesthetic: ['The universality of the left regular representation.'],
        growthChain: ['left-multiplication map → composite homomorphism → injectivity → permutation subgroup'],
      },
      teaching: {
        proofOverview: 'For g define L_g(x)=gx. Since L_{g⁻¹} is an inverse, L_g is a bijection; L_g∘L_h=L_{gh}, so g↦L_g is a homomorphism; evaluating at e gives injectivity; the image is a permutation subgroup.',
        conditions: [
          { condition: 'the group axioms', remove: 'delete associativity', counterexample: 'the composite identity L_g∘L_h=L_{gh} fails', effect: 'Homomorphicity cannot be proved.' },
          { condition: 'the identity element', remove: 'delete the identity element', counterexample: 'the step of evaluating at e has no object to evaluate at', effect: 'The injectivity proof lacks its evaluation point.' },
        ],
        commonMisconceptions: ['Reading the conclusion as “every group is S_n”.'],
        reviewQuestions: ['Why does the injectivity proof need the identity element?'],
        selfCheck: [
          { prompt: 'Write the inverse map of L_g.', competence: 'proof' },
          { prompt: 'Write the composite identity for L_g∘L_h.', competence: 'proof' },
        ],
      },
      provenance: { note: 'The three entries share the abstract-group goal; the Cayley bridge is registered separately.' },
    },

    'group:noncomm': {
      title: 'The non-abelian counterexample S₃',
      summary: 'Under the convention that the rightmost acts first, (12)(23)≠(23)(12).',
      formal: {
        target: 'every group is abelian',
        failureWitness: 'The images of 1 under the two composites are 2 and 3 respectively, so they are unequal.',
        boundary: ['It refutes only the over-generalisation “every group is abelian”.'],
      },
      representations: [
        { title: 'Composition computation in S₃', medium: 'computation', note: 'The two composites act differently.' },
      ],
      motivation: {
        internal: ['A finite example suffices to refute a universal commutativity law.'],
        external: ['Composition of permutations is order-sensitive.'],
        aesthetic: ['The smallest non-abelian example, built from two transpositions.'],
        growthChain: ['permutation group → order of composition → non-abelian counterexample'],
      },
      teaching: {
        proofOverview: 'Following the convention, compute the images of 1 under the two composites; they are 2 and 3 respectively.',
        conditions: [
          { condition: 'the convention for the order of composition', remove: 'compare without declaring the convention', counterexample: 'swapping left and right action changes the conclusion of the identity', effect: 'The convention has to be stored with the node.' },
        ],
        commonMisconceptions: ['Taking the commutativity of modular multiplication for a universal law.'],
        reviewQuestions: ['Why does this counterexample not refute Cayley’s theorem?'],
      },
      provenance: { note: 'The three entries share the abstract-group goal; the Cayley bridge is registered separately.' },
    },

    'group:claim-injective': {
      title: 'Equality of left-multiplication maps implies equality of the elements',
      summary: 'Machine-certified fragment: L_g=L_h ⇒ g=h, using only the right identity law.',
      formal: {
        assumptions: ['the right identity law ∀x. x·e=x', 'the open assumption L_g=L_h'],
        boundary: ['It contains no associativity, inverses, bijectivity of left multiplication, composite homomorphism or image subgroup.'],
      },
      motivation: {
        internal: ['The minimal dependency of the injectivity step of Cayley.'],
        external: ['It shows how an open assumption is carried along with the certificate.'],
        aesthetic: ['Evaluate at the identity element.'],
        growthChain: ['left-multiplication map → equality of functions → evaluation at the identity → cancel the right identity'],
      },
      teaching: {
        conditions: [
          { condition: 'right identity', remove: 'delete the right identity', counterexample: 'G={0,1} with all products equal to 0: all left-multiplication maps are equal while 0≠1', effect: 'The conclusion fails.' },
          { condition: 'L_g=L_h', remove: 'delete this assumption', counterexample: 'take g≠h in the two-element cyclic group', effect: 'The conclusion cannot be derived.' },
        ],
        commonMisconceptions: ['Taking this step to mean that the full Cayley theorem has been certified.'],
        reviewQuestions: ['Which proof obligations are still missing afterwards?'],
      },
      provenance: { note: 'The three entries share the abstract-group goal; the Cayley bridge is registered separately.' },
    },

    'group:proof-injective': {
      title: 'Certificate for the injectivity fragment of Cayley',
      summary: 'A local certificate accepted by the existing ND-subset checker, carrying one open assumption.',
      formal: {
        openAssumptions: ['the certified translation of the object equality L_g=L_h'],
        boundary: ['The theory contains only the right identity law; the full group axioms are not encoded.'],
      },
      teaching: {
        reviewQuestions: ['Why can this certificate not be taken directly to mean that Cayley’s theorem has been certified?'],
      },
      provenance: { note: 'The three entries share the abstract-group goal; the Cayley bridge is registered separately.' },
    },

    'group:left-mul': {
      title: 'Left-multiplication map',
      summary: 'For g∈G define L_g(x)=gx.',
      formal: {
        steps: [{ note: 'Finite steps to be expanded.' }],
        verificationTarget: 'L_g is a bijection and g↦L_g is a group homomorphism.',
        boundary: ['The inverse and bijectivity arguments depend on the full group axioms.'],
      },
      representations: [
        { title: 'Left regular representation', medium: 'definition', note: 'Composition corresponds to multiplication.' },
      ],
      motivation: {
        internal: ['It turns abstract elements into maps that can be composed.'],
        external: ['Group actions and permutation representations.'],
        aesthetic: ['The left regular representation.'],
        growthChain: ['multiplication → left multiplication → permutation representation'],
      },
      teaching: {
        proofOverview: 'L_{g⁻¹} provides an inverse, so L_g is a bijection; the composite computation shows that g↦L_g is a homomorphism.',
        conditions: [
          { condition: 'inverses', remove: 'delete inverses', counterexample: 'no inverse map of L_g can be given', effect: 'Bijectivity loses its grounds.' },
        ],
        commonMisconceptions: ['Taking L_g itself for a homomorphism.'],
        reviewQuestions: ['What is the composite of L_g and L_{g⁻¹}?'],
      },
      provenance: { note: 'The three entries share the abstract-group goal; the Cayley bridge is registered separately.' },
    },

    'group:method-abstract': {
      title: 'Abstract the common operation from special cases',
      summary: 'Compare the operations of several concrete structures and extract their common axiom template.',
      formal: {
        name: 'Abstract the common operation from special cases',
        scope: 'global method',
        In: 'several concrete algebraic or geometric structures',
        Out: 'a common operation template, with a list of the features kept and discarded',
        Pre: 'the operation and the identity of every structure are clear',
        Post: 'an axiom template together with the boundary where counterexamples lie',
        Fail: 'Accidental features must not be written into the axioms; at least one failure boundary (such as commutativity) has to be kept.',
        fail: 'Accidental features must not be written into the axioms; at least one failure boundary (such as commutativity) has to be kept.',
        body: 'List the operation, identity and inverses of each structure, compare which properties hold in every example, then use counterexamples to check whether the candidate axioms are too strong.',
        boundary: ['The method outputs a candidate axiom template; it does not replace verification item by item.'],
      },
      motivation: {
        internal: ['Abstraction should keep the common structure and discard the accidental part.'],
        external: ['Unification across fields.'],
        aesthetic: ['A minimal set of axioms.'],
        growthChain: ['three examples → common properties → axiom template → boundary of counterexamples'],
      },
      teaching: {
        selfCheck: [
          { prompt: 'List the properties common to the three entries and at least one property that differs.', competence: 'using a method', criterion: 'Common: closure, associativity, identity, inverses; different: commutativity.' },
        ],
        reviewQuestions: ['How does one decide whether a property is accidental or structural?'],
      },
      provenance: { note: 'The three entries share the abstract-group goal; the Cayley bridge is registered separately.' },
    },

    'group:method-counterexample': {
      title: 'Refute the generalisation of commutativity with S₃',
      summary: 'Use the smallest non-abelian group as a counterexample to correct the over-generalisation drawn from abelian examples.',
      formal: {
        name: 'Refute the generalisation of commutativity with S₃',
        scope: 'local method',
        In: 'a universal commutativity conjecture drawn from abelian examples',
        Out: 'a non-abelian counterexample together with the scope of the refutation',
        Pre: 'the convention for the order of composition of permutations has been declared',
        Post: 'a concrete counterexample and a scope that is not over-extended',
        Fail: 'The counterexample refutes universal commutativity only; it does not refute the subclass of abelian groups.',
        fail: 'The counterexample refutes universal commutativity only; it does not refute the subclass of abelian groups.',
        body: 'Choose the smallest non-abelian permutation group and compute the difference between the two orders of composition of two transpositions.',
        boundary: ['The method produces a counterexample only; it does not replace a classification theorem for groups.'],
      },
      motivation: {
        internal: ['A counterexample strips the accidental part out of the abstraction.'],
        external: ['The order-sensitivity of composition of permutations.'],
        aesthetic: ['S₃ is the smallest counterexample.'],
        growthChain: ['abelian examples → over-generalisation → the S₃ counterexample'],
      },
      teaching: {
        selfCheck: [
          { prompt: 'Compute the images of 1 under (12)(23) and (23)(12).', competence: 'constructing a counterexample', criterion: '2 and 3, hence the two are unequal.' },
        ],
        reviewQuestions: ['Why can the commutativity of Units5 not be written into the definition of a group?'],
      },
      provenance: { note: 'The three entries share the abstract-group goal; the Cayley bridge is registered separately.' },
    },

    'group:method-cayley-table': {
      title: 'Check the axioms and commutativity with a small multiplication table',
      summary: 'For a set of very small order whose elements can be listed one by one, write out the full multiplication table and read the identity, the inverses and commutativity off the table.',
      formal: {
        name: 'Check the axioms and commutativity with a small multiplication table',
        scope: 'local method',
        In: 'a set of very small order with enumerable elements, together with its operation',
        Out: 'whether each axiom holds or where it fails, and whether the operation is commutative',
        Pre: 'all elements of the set have been listed and the operation can be computed step by step',
        Post: 'a multiplication table, and answers to every axiom and to commutativity read off it',
        Fail: 'Once the order grows the table can no longer be written; the method gives a case-by-case conclusion and cannot be generalised into an assertion about all groups.',
        fail: 'Once the order grows the table can no longer be written; the method gives a case-by-case conclusion and cannot be generalised into an assertion about all groups.',
        body: 'List all elements; compute every product cell by cell to fill the table; inspect the table to see whether each row and each column contains exactly one identity element and whether it is symmetric (commutativity); when a failure appears, point out which cell it is.',
        boundary: ['It applies only to finite small orders; it is not a proof about general groups.'],
      },
      motivation: {
        internal: ['The axioms can be checked one by one, and for a small order one filled table answers all of them at once.'],
        external: ['Computer enumeration and small-scale verification of finite groups.'],
        aesthetic: ['It compresses the four axioms into one table.'],
        growthChain: ['abstract axioms → a concrete example of small order → multiplication table → item-by-item verification and counterexamples'],
      },
      teaching: {
        selfCheck: [
          { prompt: 'Write the multiplication table of Units5 and decide from it whether the group is commutative.', competence: 'computation', criterion: 'Every row and every column contains exactly one 1, and the table is symmetric.' },
        ],
        reviewQuestions: ['If the table is not symmetric, may one conclude that the group is non-abelian?'],
      },
      provenance: { note: 'The three entries share the abstract-group goal; the Cayley bridge is registered separately.' },
    },

    'group:method-order-count': {
      title: 'Compare two groups by the orders of their elements',
      summary: 'To decide whether two groups of small order are isomorphic, first count the distribution of element orders in each; if the distributions differ, rule the isomorphism out at once.',
      formal: {
        name: 'Compare two groups by the orders of their elements',
        scope: 'local method',
        In: 'two small groups of the same order',
        Out: 'a ruling-out, or a note that a candidate isomorphism still has to be found',
        Pre: 'the elements of both groups can be enumerated',
        Post: 'a comparison of the order distributions together with the ground for ruling out',
        Fail: 'Having the same order distribution is only a necessary condition for isomorphism and does not establish it; the method does not produce an isomorphism.',
        fail: 'Having the same order distribution is only a necessary condition for isomorphism and does not establish it; the method does not produce an isomorphism.',
        body: 'For every element compute its order; count how many elements have each order; if the two distributions differ, rule the isomorphism out; if they agree, an isomorphism still has to be constructed separately.',
        boundary: ['A necessary condition, not a sufficient one; it gives no isomorphism.'],
      },
      motivation: {
        internal: ['Isomorphisms preserve the order of elements, so the distribution is an isomorphism invariant.'],
        external: ['A quick attempt at classifying finite groups.'],
        aesthetic: ['One invariant rules out a whole class of possibilities.'],
        growthChain: ['the isomorphism problem → find an invariant → distribution of element orders → rule out, or switch to a construction'],
      },
      teaching: {
        selfCheck: [
          { prompt: 'Count the distributions of element orders of S₃ and Z₆ and compare them.', competence: 'computation', criterion: 'S₃ has no element of order 6, so the distributions differ.' },
        ],
        reviewQuestions: ['If the distributions agree, what is the next step?'],
      },
      provenance: { note: 'The three entries share the abstract-group goal; the Cayley bridge is registered separately.' },
    },

    'group:pattern-all-commutative': {
      title: 'Misconception: every group is abelian',
      summary: 'Generalising the commutativity of modular multiplication into a group axiom.',
      formal: {
        wrongRule: 'for every group G and a,b∈G, ab=ba',
        task: 'give a composition computation in a non-abelian group',
        counterexample: '(12)(23)≠(23)(12) in S₃',
        scope: 'It refutes universal commutativity only; abelian groups are still groups.',
        boundary: ['Whether an individual holds this misconception belongs to the external model E.'],
      },
      motivation: {
        internal: ['The accidental intuition carried by examples needs correcting by a counterexample.'],
        external: ['Composition is not commutative in many real systems.'],
        aesthetic: ['The smallest non-abelian group.'],
        growthChain: ['abelian examples → over-generalisation → correction by S₃'],
      },
      teaching: {
        selfCheck: [
          { prompt: 'Write two elements of S₃ that do not commute.', competence: 'constructing a counterexample', criterion: '(12) and (23).' },
        ],
        reviewQuestions: ['Which theorems of group theory hold only for abelian groups?'],
      },
      provenance: { note: 'The three entries share the abstract-group goal; the Cayley bridge is registered separately.' },
    },

    'group:problem-inverse': {
      title: 'Invert an element in Units5',
      summary: 'Compute the inverse of 3 under multiplication mod 5.',
      formal: {
        goal: 'Find 3⁻¹ and verify that the product is the identity element.',
        boundary: ['A finite computation problem; it does not pretend to give a general group algorithm.'],
      },
      motivation: {
        internal: ['The inverse is the explicit operation in the group axioms.'],
        external: ['Inversion in modular arithmetic.'],
        aesthetic: ['A single multiplication verifies it.'],
        growthChain: ['group axioms → identity element → inversion'],
      },
      teaching: {
        selfCheck: [
          { prompt: 'Verify that 3·2≡1 mod 5.', competence: 'computation', criterion: 'The inverse is 2.' },
        ],
        reviewQuestions: ['If the modulus were 6 instead, would 3 have an inverse?'],
      },
      provenance: { note: 'The three entries share the abstract-group goal; the Cayley bridge is registered separately.' },
    },
  },

  representations: {
    'rep-group-axioms': { title: 'Group-axiom template', medium: 'formula', note: 'Associativity, identity and inverses are listed separately.' },
    'rep-group-perm': { title: 'Permutation group', medium: 'example', note: 'The group axioms are verified one by one.' },
    'rep-group-triangle': { title: 'Triangle symmetries', medium: 'geometric diagram', note: 'The action on the vertices gives a faithful permutation representation.' },
    'rep-group-units5': { title: 'Table of powers mod 5', medium: 'table', note: 'Verified by taking exponents mod 4.' },
    'rep-group-s3': { title: 'Composition computation in S₃', medium: 'computation', note: 'The two composites act differently.' },
    'rep-group-leftmul': { title: 'Left regular representation', medium: 'definition', note: 'Composition corresponds to multiplication.' },
  },
};
