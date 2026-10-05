export const TEST_PROFILE = {
  id: 'profile-test',
  revision: 3,
  modelVersion: 'mcs-manual-model/1',
  events: [
    { eventId: 'e1', kind: 'confirmation', nodeId: 'bg:real:metric', payload: { confirmed: true } },
    { eventId: 'e2', kind: 'mastery_estimate', nodeId: 'limit:bridge', payload: { dimension: '定义陈述', value: 0.6 } },
    { eventId: 'e3', kind: 'misconception', nodeId: 'limit:seq-conv', payload: { patternId: 'limit:pattern-never-equal' } },
  ],
};

export const TEST_BACKGROUND = [
  { entryId: 'bg-metric', node: 'bg:real:metric', provides: ['statement', 'definition'], kind: 'confirmed' },
  { entryId: 'bg-quant', node: 'bg:logic:quantifier', provides: ['statement'], kind: 'confirmed' },
  { entryId: 'bg-fn', node: 'bg:set:function', provides: ['statement', 'definition'], kind: 'confirmed' },
  { entryId: 'bg-eq', node: 'bg:logic:equality', provides: ['statement'], kind: 'confirmed' },
  { entryId: 'bg-vec', node: 'bg:linear:vector', provides: ['statement', 'definition'], kind: 'confirmed' },
  { entryId: 'bg-top', node: 'bg:top:space', provides: ['statement', 'definition'], kind: 'confirmed' },
  { entryId: 'bg-calc', node: 'bg:manifold:calc', provides: ['statement', 'definition'], kind: 'confirmed' },
  { entryId: 'bg-grp', node: 'bg:group:binary', provides: ['statement', 'definition'], kind: 'confirmed' },
];

export const LOCALIZATION_CASES = {
  LC01: { symbols: ['d', '|·|', 'LimitED', 'SeqConv', 'LimitSeq'] },
  LC02: { axioms: ['ax-eq-refl', 'ax-eq-subst', 'ax-imp-elim', 'ax-imp-intro', 'ax-and-intro', 'ax-and-elim', 'ax-forall-intro', 'ax-forall-elim', 'ax-exists-intro', 'ax-exists-elim'] },
  LC03: { axioms: [{ id: 'ax-eq-refl', weight: 1 }, { id: 'ax-eq-subst', weight: 2 }, { id: 'ax-imp-elim', weight: 2 }, { id: 'ax-and-intro', weight: 3 }], budget: 5 },
  LC04: { evidenceId: 'ev-limit-bridge-proof' },
  LC05: { seedNodes: ['limit:bridge'], use: 'proof' },
  LC06: { claimNode: 'limit:bridge' },
  LC07: { seedNodes: ['limit:limit-ed'], radius: 2 },
  LC08: { left: 'limit:limit-ed', right: 'limit:limit-seq', use: 'expression' },
  LC09: { left: 'limit:limit-ed', right: 'limit:seq-conv', use: 'expression' },
  LC10: { nodeId: 'manifold:smooth-atlas' },
  LC11: { nodeId: 'manifold:ck-atlas' },
  LC12: { nodeId: 'limit:bridge' },
  LC13: { goalId: 'limit:bridge' },
  LC14: { nodeId: 'tensor:basis-law' },
  LC15: { nodeId: 'manifold:ck-atlas' },
  LC16: {},
  LC17: { nodeId: 'manifold:max-k' },
  LC18: { nodeId: 'tensor:tensor-rs' },
  LC19: {},
  LC20: {},
  LC21: { patternIds: ['limit:pattern-never-equal'] },
  LC22: { nodeId: 'limit:limit-ed', allowed: ['formula', 'intuition'] },
  LC23: { stage: 'entering' },
  LC24: { goalId: 'limit:bridge', competences: ['定义陈述', '证明'] },
  LC25: { goalId: 'limit:bridge', background: TEST_BACKGROUND, horizon: 6, maxCandidates: 20000 },
  LC26: { routeA: { goalId: 'limit:bridge', background: TEST_BACKGROUND, horizon: 6 }, routeB: { goalId: 'limit:continuous', background: TEST_BACKGROUND, horizon: 6 } },
  LC27: { goalId: 'limit:bridge', routes: [] },
  LC28: { goalId: 'limit:bridge', background: TEST_BACKGROUND, horizon: 6, disabled: ['bg:real:metric'] },
  LC29: { nodeId: 'limit:limit-ed' },
  LC30: { goalId: 'limit:bridge', background: TEST_BACKGROUND, horizon: 6, disabled: ['bg:logic:quantifier'] },
  LC31: { kind: 'topic' },
  LC32: {},
  LC33: { mode: 'level' },
  LC34: { goalId: 'limit:bridge', background: TEST_BACKGROUND, horizon: 6, budget: { maxCost: 12 }, strategy: { costs: { 'a-limit:distance': 1, 'a-limit:d': 2, 'a-limit:s': 2, 'a-limit:bridge': 3 } } },
  LC35: { categories: ['prose-proof', 'machine-certificate'] },
  LC36: {},
};

export function runAllLocalizations(localizer) {
  return Object.entries(LOCALIZATION_CASES).map(([id, params]) => ({ id, result: localizer.compute(id, { params, profile: TEST_PROFILE }) }));
}
