import { McsError, CODES } from './errors.mjs';

export const EMPTY_LEARNING_PLAN = Object.freeze({
  primaryGoal: null, interests: [], branches: [], pace: null, mood: null, manualOrder: null,
});
export const LEARNING_PREVIEW_STEPS = 5;

/** E only: preferences are intentions, never confirmations. */
export function normalizeLearningPlan(raw = {}) {
  const fail = (message) => { throw new McsError(CODES.BAD_REQUEST, message, 422); };
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) fail('学习方案必须是对象');
  const ids = (value, limit) => {
    if (value === undefined) return [];
    if (!Array.isArray(value) || value.length > limit || value.some(id => typeof id !== 'string' || !id.trim() || id.length > 200)) fail('学习方案引用无效');
    return [...new Set(value)];
  };
  const primaryGoal = raw.primaryGoal ?? null;
  if (primaryGoal !== null && (typeof primaryGoal !== 'string' || !primaryGoal.trim() || primaryGoal.length > 200)) fail('学习主目标无效');
  const pace = raw.pace ?? null;
  const mood = raw.mood ?? null;
  if (pace !== null && !['small', 'block', 'checkpoint', 'free'].includes(pace)) fail('学习节奏无效');
  if (mood !== null && !['base', 'example', 'apply', 'any'].includes(mood)) fail('学习方式无效');
  let manualOrder = null;
  if (raw.manualOrder != null) {
    const value = raw.manualOrder;
    if (typeof value.ontologyVersion !== 'string' || typeof value.graphHash !== 'string'
      || value.ontologyVersion.length > 100 || value.graphHash.length > 100
      || !Array.isArray(value.steps) || value.steps.length > 100
      || value.steps.some(id => typeof id !== 'string' || !id || id.length > 256)
      || new Set(value.steps).size !== value.steps.length) fail('手动顺序无效');
    manualOrder = { ontologyVersion: value.ontologyVersion, graphHash: value.graphHash, steps: [...value.steps] };
  }
  return { primaryGoal, interests: ids(raw.interests, 32), branches: ids(raw.branches, 3).filter(id => id !== primaryGoal), pace, mood, manualOrder };
}

const MOOD_TYPES = {
  base: ['Concept', 'Definition', 'Theory', 'Claim'],
  example: ['Example', 'Counterexample', 'MisconceptionPattern'],
  apply: ['Method', 'Problem', 'Construction', 'Representation'],
};

/** A full permutation is required: deleting a prerequisite is not a reorder. */
export function validateLearningOrder(steps, edges, order) {
  const keys = new Set(steps.map(step => step.key));
  if (order.length !== keys.size || new Set(order).size !== keys.size || order.some(key => !keys.has(key))) {
    return { valid: false, reason: 'steps-changed', blockers: [] };
  }
  if (edges.some(([from, to]) => !keys.has(from) || !keys.has(to))) {
    return { valid: false, reason: 'steps-changed', blockers: [] };
  }
  const position = new Map(order.map((key, index) => [key, index]));
  const blockers = edges.filter(([from, to]) => position.get(from) >= position.get(to));
  return { valid: blockers.length === 0, reason: blockers.length ? 'dependency' : null, blockers };
}

/** Stable topological selection; no node, source or certificate is rewritten. */
export function scheduleLearningSteps(steps, edges, preferences = {}, context = {}) {
  const incoming = new Map(steps.map(step => [step.key, new Set()]));
  for (const [from, to] of edges) {
    if (!incoming.has(from) || !incoming.has(to)) return { order: [], unresolved: steps.map(s => s.key), staleManual: true };
    incoming.get(to).add(from);
  }
  const manual = preferences.manualOrder;
  const manualMatches = manual && manual.ontologyVersion === context.ontologyVersion && manual.graphHash === context.graphHash;
  const checked = manualMatches ? validateLearningOrder(steps, edges, manual.steps) : null;
  const manualRank = new Map(checked?.valid ? manual.steps.map((key, index) => [key, index]) : []);
  const interests = preferences.interests ?? [];
  const interestRank = (step) => { const index = interests.indexOf(step.discipline); return index < 0 ? interests.length : index; };
  const moodRank = (step) => MOOD_TYPES[preferences.mood]?.includes(step.construct) ? 0 : 1;
  const placed = new Set();
  const order = [];
  let previousDiscipline = null;
  while (order.length < steps.length) {
    const ready = steps.filter(step => !placed.has(step.key) && [...incoming.get(step.key)].every(key => placed.has(key)));
    if (!ready.length) break;
    ready.sort((a, b) => (manualRank.get(a.key) ?? Infinity) - (manualRank.get(b.key) ?? Infinity)
      || Number(b.lane === 'main') - Number(a.lane === 'main')
      || interestRank(a) - interestRank(b)
      || Number(b.discipline === previousDiscipline) - Number(a.discipline === previousDiscipline)
      || moodRank(a) - moodRank(b)
      || (b.unlocks ?? 0) - (a.unlocks ?? 0)
      || a.key.localeCompare(b.key, 'en'));
    const next = ready[0];
    placed.add(next.key); order.push(next.key); previousDiscipline = next.discipline;
  }
  return { order, unresolved: steps.filter(step => !placed.has(step.key)).map(step => step.key), staleManual: Boolean(manual && !checked?.valid) };
}

export function moveLearningStep(steps, edges, order, key, targetIndex) {
  const from = order.indexOf(key);
  if (from < 0) return { valid: false, reason: 'steps-changed', blockers: [], order };
  const next = order.filter(item => item !== key);
  next.splice(Math.max(0, Math.min(targetIndex, next.length)), 0, key);
  const result = validateLearningOrder(steps, edges, next);
  return { ...result, order: result.valid ? next : order };
}
