/**
 * 英文覆盖：36 个**局部化算子**（`data/localizations.mjs`）的名称 / 定义 / 保持 / 边界。
 *
 * 每个算子都是一次「只看这一部分」的合法选择：`definition` 说它选什么，
 * `preserves` 说它在什么意义上保守（选完还剩什么是真的），`boundary` 说它**不**声称什么。
 * 三层里任何一层被译软，读者都会把「局部可见」当成「全局成立」——`boundary` 尤其不能弱化。
 *
 * 不翻译的字段：`id`、`family`、`inputs`、`computable`（受控词表键与英文标识符）。
 * `unsupported` / `unknown` / `Unknown` 是算子返回值，与中文源逐字对应，不译。
 */

export default {
  LC01: {
    name: 'Signature reduction',
    definition: 'Select the nodes whose non-logical symbols and required types all lie inside a given sub-signature, and record the background reduction.',
    preserves: 'In a fixed model, forgetting only the interpretations of the other symbols leaves the satisfaction relation expressed by the sub-signature unchanged.',
    boundary: 'The boundary is kept when evidence or definition unfolding runs out of scope; this is not an elementary submodel.',
  },
  LC02: {
    name: 'Theory slicing',
    definition: 'Select the nodes that already have a proof and whose used axioms lie inside a given subset, keeping the open assumptions.',
    preserves: 'The original judgement and certificate are kept; it is an unconditional theorem only when the assumptions are empty.',
    boundary: 'Not being included does not mean unprovable; exhausting all consequences requires an effective presentation of the axioms.',
  },
  LC03: {
    name: 'Axiom budget',
    definition: 'Among the axiom selections whose total weight does not exceed a given budget, make a finite exact choice, then call theory slicing.',
    preserves: 'The budget choice is a finite optimisation given from outside; it does not smuggle in a preference through a canonical order.',
    boundary: 'With more than 24 candidates it returns unsupported instead of silently switching to a heuristic.',
  },
  LC04: {
    name: 'Proof tracing',
    definition: 'Take all ancestors of the conclusion in a given proof DAG, together with their statements and axiom references.',
    preserves: 'The certificate and the dependency structure of that proof are kept.',
    boundary: 'Only this one proof is kept, not all possible proofs; environmental lemmas are kept as a boundary with their version.',
  },
  LC05: {
    name: 'Dependency completion',
    definition: 'Take the backward closure from the seeds along the selected support relations.',
    preserves: 'The closure is taken on a fixed support relation and may contain cycles.',
    boundary: 'It does not decide whether a route is learnable; on an unbounded graph termination is not guaranteed.',
  },
  LC06: {
    name: 'Independence boundary',
    definition: 'Mark the claims that have model evidence for both A+φ and A+¬φ.',
    preserves: 'Independence is relative to the specified semantics and to the model evidence.',
    boundary: 'No evidence means Unknown; general independence is undecidable.',
  },
  LC07: {
    name: 'Seed neighbourhood',
    definition: 'Take the neighbourhood of the seeds within a specified relation, direction and radius.',
    preserves: 'The relation records and types inside the radius are kept.',
    boundary: 'It terminates only when the neighbourhood is locally enumerable; external dependencies enter the boundary.',
  },
  LC08: {
    name: 'Support intersection',
    definition: 'Take the intersection of the support already selected for two nodes under a specified use.',
    preserves: 'It reflects only what these two supports have in common.',
    boundary: 'Unknown support uses the undecided boundary; it does not claim that the whole route needs them jointly.',
  },
  LC09: {
    name: 'Support difference',
    definition: 'Take the symmetric difference of two proven-minimal supports or of two ordinary supports.',
    preserves: 'It carries the references to the original supports and their minimality status.',
    boundary: 'It does not assume that every support can be minimised; non-minimal results are marked separately.',
  },
  LC10: {
    name: 'Generalization cone',
    definition: 'Take all generalization ancestors of a given object under the hard-generalization relation.',
    preserves: 'It keeps the type-matching implication or mapping witness.',
    boundary: 'Same-carrier and cross-carrier modes are kept apart; an infinite cone need not be exhaustible.',
  },
  LC11: {
    name: 'Specialization cone',
    definition: 'Take all specialization descendants of a given object.',
    preserves: 'Specialization is the converse of the generalization relation; it is not taken as an inverse single-valued function.',
    boundary: 'Correspondences outside the cone enter the boundary; cognitive effects are not guaranteed here.',
  },
  LC12: {
    name: 'Duality correspondence',
    definition: 'Take the effective domain and the image of a declared duality operation, keeping the paired display.',
    preserves: 'Only the proven duality properties are kept.',
    boundary: 'Undefined parts enter the boundary; recovering the reverse direction needs an inverse or an equivalence proof.',
  },
  LC13: {
    name: 'Goal regression',
    definition: 'From a goal, work backwards and add every action that produces it together with that action’s inputs.',
    preserves: 'The output is a candidate expansion labelled with OR.',
    boundary: 'The branches do not form a route; a finite action library guarantees termination.',
  },
  LC14: {
    name: 'Counterexample diagnosis',
    definition: 'Take the wrong claim, the counterexample certificate and the anchors of the negated subformula.',
    preserves: 'The explicit scope of the negation is kept.',
    boundary: 'It does not infer that all similar propositions are false; the slice of finite certificates is computable.',
  },
  LC15: {
    name: 'Strategy applicability domain',
    definition: 'Select the method nodes that match the task domain and have evidence for their applicability conditions.',
    preserves: 'Matching evidence does not guarantee that learning succeeds.',
    boundary: 'The boundary is marked when an informal condition is undecided; undecidable matching returns unknown.',
  },
  LC16: {
    name: 'Invariant tracking',
    definition: 'Take the transformations, functions and reachable anchors that satisfy I(Fx)=I(x).',
    preserves: 'The invariant is kept under the transformations for which it has been proven.',
    boundary: 'It cannot be extended to arbitrary transformations; an explicit certificate is needed.',
  },
  LC17: {
    name: 'Construction entries',
    definition: 'Take the external input ports of a specified acyclic construction.',
    preserves: 'The entries of this construction and their AND/OR assignment are kept.',
    boundary: 'It does not claim that all constructions have minimal entries; a construction with no input is not presented as an external resource.',
  },
  LC18: {
    name: 'Application transfer',
    definition: 'Select the application descriptions and output candidates that match a partial interpretation of the inputs.',
    preserves: 'It carries only registered condition matches and structural relations.',
    boundary: 'A transfer whose condition matching is incomplete stays a candidate; external validity is assessed separately.',
  },
  LC19: {
    name: 'Folding of known content',
    definition: 'Fold the display according to the certified node blocks given by an external parameter packet; τ maps to the member set.',
    preserves: 'Public node identity, cross-block edges and provenance are kept.',
    boundary: 'The unknown is not folded; overlapping blocks may be displayed repeatedly and share a provenance.',
  },
  LC20: {
    name: 'Cognitive frontier',
    definition: 'Compute the confirmed frontier and the possible frontier of an action from the classifications confirmed, unusable and unknown.',
    preserves: 'The two frontiers are not merged into definite mastery.',
    boundary: 'Conflicting states must be reported first; on a finite action library it is computable.',
  },
  LC21: {
    name: 'Misconception focus',
    definition: 'Take the public misconception patterns, diagnostic questions and counterexample anchors linked to an individual.',
    preserves: 'Individual judgements serve only as display annotations; the public patterns are not rewritten.',
    boundary: 'An unknown pattern may be treated as to be diagnosed rather than as confirmed.',
  },
  LC22: {
    name: 'Representation selection',
    definition: 'Take the intersection of the target node with an allowed set of representations, together with their certified conversions.',
    preserves: 'The formal payload of the node is not changed.',
    boundary: 'When the intersection is empty it reports the lack of a matching representation instead of deleting the goal.',
  },
  LC23: {
    name: 'Stage adaptation',
    definition: 'Filter the public actions by an external stage constraint.',
    preserves: 'A stage is an interpretation of the external model, not a permanent label of the node.',
    boundary: 'Unknown feasibility is listed separately; with no registered stage constraint the result is unsupported.',
  },
  LC24: {
    name: 'Mastery-evidence gap',
    definition: 'Take the difference between the competence required by the goal and what the available observations cover.',
    preserves: 'External entries are not disguised as M nodes.',
    boundary: 'Missing evidence is not the same as not having mastered; anchoring does not guarantee measurement validity.',
  },
  LC25: {
    name: 'Common core',
    definition: 'Take the intersection of the inputs of the routes in a declared non-empty route family.',
    preserves: 'It displays shared resources, not a sufficient route.',
    boundary: 'An empty family produces no common prerequisite; the scope qualifier is kept unless enumeration completeness has been proven.',
  },
  LC26: {
    name: 'Route difference',
    definition: 'Take the symmetric difference of the active resources of two routes, keeping the correspondence of events.',
    preserves: 'Both the difference in event multiplicity and the provenance assignment are kept.',
    boundary: 'A difference of node sets cannot replace a difference of events; only the first result packet is compared.',
  },
  LC27: {
    name: 'Meeting points',
    definition: 'Select outputs that reference the same node, or pairs of outputs with a bridging certificate.',
    preserves: 'A formal meeting does not mean that the external cognitive states are the same.',
    boundary: 'Sharing a name or being logically close does not automatically make a meeting.',
  },
  LC28: {
    name: 'Bottlenecks',
    definition: 'Compare reachability before and after disabling resources, under the strict resource-disabling semantics.',
    preserves: 'It is relative to the specified route domain and keeps the records of both reachability checks.',
    boundary: 'A bottleneck obtained by filtering an individual must not be written back to the global level; Horn reachability is a necessary check.',
  },
  LC29: {
    name: 'Cross-route bridging',
    definition: 'Select the nodes and actions that correspond under a certified interface translation.',
    preserves: 'It carries only proven structural relations.',
    boundary: 'Not every bridge is an institution morphism; cost is not preserved along it.',
  },
  LC30: {
    name: 'Alternative routes after a premise fails',
    definition: 'Re-plan the remaining routes after disabling a resource.',
    preserves: 'Deleting a node from the graph is not enough to keep the old certificate.',
    boundary: 'Failure of an unbounded search means unknown; only a bounded exhaustive search may report unreachability within the bound.',
  },
  LC31: {
    name: 'Topic aggregation',
    definition: 'Display a legal finite family of topic blocks as an aggregate item, with τ as the member set.',
    preserves: 'Members and provenance are kept and can be expanded.',
    boundary: 'A connection is not interpreted as the whole topic being required; overlap is allowed.',
  },
  LC32: {
    name: 'Cross-domain interfaces',
    definition: 'Select the specified relations whose endpoints lie in different disciplines or domains.',
    preserves: 'Details internal to a domain are lost while the cross-domain evidence is kept.',
    boundary: 'The absence of a cross edge does not prove that the two domains have no mathematical connection.',
  },
  LC33: {
    name: 'Level projection',
    definition: 'Project by display level or by finite syntactic depth.',
    preserves: 'The two modes are annotated separately and not mixed.',
    boundary: 'Aggregate level and syntactic depth are not the same quantity; with no registered depth the result is unsupported.',
  },
  LC34: {
    name: 'Time budget',
    definition: 'Enumerate structural routes by declared cost, event bound and budget, and take the visible resources.',
    preserves: 'A budget does not delete dependencies; entries with unknown cost are listed separately.',
    boundary: 'It completes finitely only when costs and their comparison are decidable; no industrial-scale performance is promised.',
  },
  LC35: {
    name: 'Evidence categories',
    definition: 'Select the records whose evidence category and verification condition both lie inside a given set.',
    preserves: 'Evidence categories are not a single credibility ranking.',
    boundary: 'An empirical result does not become a mathematical proof by scoring high; decidable predicates are finitely computable.',
  },
  LC36: {
    name: 'Unknown boundary',
    definition: 'Mark out Unknown support, unfinished proofs, undecided matches and their public dependencies.',
    preserves: 'Undecided is not false, empty or non-existent; only the annotation changes.',
    boundary: 'Everything that is semantically unknown cannot be exhausted by a finite list.',
  },
};
