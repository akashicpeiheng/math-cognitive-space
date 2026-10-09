/**
 * 英文覆盖：**共享背景**（`bg:*`）的 9 个节点元数据。
 *
 * 这几个节点不是某个案例里的数学对象，而是「四个案例共同声明的背景」：
 * 量词、等式、函数接口、实数度量、线性代数、点集拓扑、多元微分、群公理模板、
 * 以及构造反例的方法。它们的 `formal` 形状与案例节点不同（`declaration` / `language` /
 * `calculus` / `modules`），因为背景层只声明「用到哪一片」，不展开理论。
 *
 * 不翻译的字段：`formal.symbols`、`formal.type`、`formal.signatureVersion`、
 * `formal.modules[].id` / `.status`、`teaching.evidenceStatus`（受控词表与标签）、
 * `provenance.sources[]`（修订源的真实文件名）。九个节点的 `representations` 都是空数组，
 * 因此本文件没有 `representations` 一节。
 *
 * 登记状态提醒：本文件需要在 `data/i18n/en/nodes.mjs` 的 MODULES 里登记才会生效（归 Lead）。
 */

export default {
  nodes: {
    'bg:logic:quantifier': {
      title: 'Quantifiers and universal and existential statements',
      summary: 'Universal and existential quantification in finite formulas, and the order of quantifiers.',
      formal: {
        declaration: 'The universal quantifier ∀ and the existential quantifier ∃ are used as logical constants',
        boundary: ['The full syntax and semantics of the object language are in Chapters 02–03 of the monograph; this site encodes only the fragment it uses.'],
      },
      provenance: { note: 'The shared background is used only within its declared scope; the parts that are not encoded are kept as a boundary.' },
    },

    'bg:logic:equality': {
      title: 'Equality and substitution',
      summary: 'Reflexivity, symmetry and transitivity of equality, and substitution in a specified context.',
      formal: {
        declaration: 'Reflexivity and substitution rules for typed equality',
        boundary: ['The variable condition for substitution and the avoidance of capture are verified by the checker.'],
      },
      provenance: { note: 'The shared background is used only within its declared scope; the parts that are not encoded are kept as a boundary.' },
    },

    'bg:set:function': {
      title: 'Functions, composition and inverses',
      summary: 'The minimal interface for functions, composition, injectivity, surjectivity and inverse maps.',
      formal: {
        declaration: 'Functions as typed maps; composition and inverses are defined as set-theoretic composition',
        boundary: ['The concrete domain and codomain are declared together with each case.'],
      },
      provenance: { note: 'The shared background is used only within its declared scope; the parts that are not encoded are kept as a boundary.' },
    },

    'bg:real:metric': {
      title: 'Metric background on the reals',
      summary: 'The shared background of the real numbers, the absolute value, the order and the distance d(x,y)=|x−y|.',
      formal: {
        language: 'the ordering of the reals, order relations and a binary distance function',
        calculus: 'the classical fragment of first-order logic',
        modules: [{ note: 'On this site it is used as a declared background in the four cases; the completeness theorems for the reals are not encoded.' }],
        boundary: ['Completeness of the reals, the supremum theorem and the general theory of metric spaces are not formalised on this site.'],
      },
      provenance: { note: 'The shared background is used only within its declared scope; the parts that are not encoded are kept as a boundary.' },
    },

    'bg:linear:vector': {
      title: 'Vector spaces and linear maps',
      summary: 'Fields, vector spaces, linear maps, duality, tensor products and finite-dimensional bases.',
      formal: {
        language: 'a many-sorted language for vector spaces and linear maps',
        calculus: 'a fragment of classical simple type theory',
        modules: [{ note: 'Finite dimension and the existence of bases are declared as conditions of each case.' }],
        boundary: ['General module theory and infinite-dimensional linear algebra are not formalised on this site.'],
      },
      formalStatement: {
        reading: 'A vector space = an additive abelian group together with a field action; the action distributes over both vector addition and field addition, is compatible with field multiplication, and the unit acts as the identity.',
        notation: [
          { means: 'the base field (R or C; replacing it by a ring yields a module)' },
          { symbol: 'abelian group', means: 'addition has an identity 0, every element has an additive inverse, and addition is commutative' },
          { means: 'this clause is often omitted, but without it the scalar action could be arbitrary' },
        ],
        note: 'This is a background-theory node (the background layer); no item-by-item source is registered for it on this site, and the statement is written according to the standard definition.',
      },
      provenance: { note: 'The shared background is used only within its declared scope; the parts that are not encoded are kept as a boundary.' },
    },

    'bg:top:space': {
      title: 'Topological spaces and local Euclideanity',
      summary: 'Topological spaces, open sets, continuous maps, homeomorphisms, covers and second-countability.',
      formal: {
        language: 'the language of topological spaces and continuous maps',
        calculus: 'the classical fragment of first-order logic',
        modules: [{ note: 'Hausdorff and second-countability are declared explicitly in case 02.' }],
        boundary: ['The separation axioms and the compactness theory of general topology are not developed on this site.'],
      },
      provenance: { note: 'The shared background is used only within its declared scope; the parts that are not encoded are kept as a boundary.' },
    },

    'bg:manifold:calc': {
      title: 'Multivariable differentiation and C^k regularity',
      summary: 'C^k maps on R^n, composition, locality and the chain rule.',
      formal: {
        language: 'the language of differentiable maps on finite-dimensional real vector spaces',
        calculus: 'the classical fragment of analysis',
        modules: [{ note: 'The chain rule and the closure of C^k under composition are taken as declared background.' }],
        boundary: ['The inverse function theorem, the implicit function theorem and the smoothing theorem are not formalised on this site.'],
      },
      provenance: { note: 'The shared background is used only within its declared scope; the parts that are not encoded are kept as a boundary.' },
    },

    'bg:group:binary': {
      title: 'Binary operations and the group-axiom template',
      summary: 'Binary operations, associativity, identity, inverses and the subgroup interface.',
      formal: {
        language: 'a many-sorted language with a binary operation and constants',
        calculus: 'the classical fragment of first-order logic',
        modules: [{ note: 'The group axioms serve as a template; each concrete structure still has to be checked item by item.' }],
        boundary: ['The fundamental theorem on homomorphisms and free group theory are not developed on this site.'],
      },
      provenance: { note: 'The shared background is used only within its declared scope; the parts that are not encoded are kept as a boundary.' },
    },

    'bg:misc:counterexample-method': {
      title: 'The method of constructing counterexamples',
      summary: 'Weaken a target proposition condition by condition, and construct an instance that satisfies the remaining conditions while the conclusion fails.',
      formal: {
        name: 'The method of constructing counterexamples',
        scope: 'global method',
        In: 'a candidate proposition containing a universal quantifier or conditions',
        Out: 'candidate counterexamples, a failure witness and the scope of the refutation',
        Pre: 'the quantifiers, the direction and the conditions of the proposition have been written out clearly',
        Post: 'a counterexample instance, a failure witness, and a scope of refutation that is not over-extended',
        Use: ['the counterexample collection in Chapter 14 of the monograph', 'the counterexamples per condition in the individual cases'],
        Fail: 'When a condition is in fact redundant, or the counterexample refutes only an over-generalisation, this has to be recorded honestly: a sufficient condition must not be dressed up as a necessary one.',
        fail: 'When a condition is in fact redundant, or the counterexample refutes only an over-generalisation, this has to be recorded honestly: a sufficient condition must not be dressed up as a necessary one.',
        body: 'First write the universal form of the target, then delete or weaken one condition while fixing the others, and search for the smallest instance that makes the conclusion fail.',
        boundary: ['The method produces candidates and failure witnesses only; whether a counterexample really holds still has to be verified item by item.'],
      },
      provenance: { note: 'The shared background is used only within its declared scope; the parts that are not encoded are kept as a boundary.' },
    },
  },
};
