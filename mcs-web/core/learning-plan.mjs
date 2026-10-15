import { makePlanner, canonicalizeEventGraph } from './planner.mjs';
import { sha256 } from './hash.mjs';
import { normalizeLearningPlan, scheduleLearningSteps } from '../shared/learning-plan.mjs';

const MAX_EVENTS = 8;
const MAX_CANDIDATES = 5000;

/** A reachable teaching skeleton, not the intersection of all possible proofs. */
function skeleton(ontology, known) {
  const nodes = ontology.raw.nodes.filter(node => (node.granularity ?? 'unit') === 'unit');
  const producers = new Map(nodes.map(node => [node.id, []]));
  for (const action of ontology.raw.actions) for (const output of action.outputs) producers.get(output.node)?.push(action);
  const hard = new Map(nodes.map(node => [node.id, []]));
  for (const relation of ontology.raw.relationDescriptions ?? ontology.raw.relations ?? []) if (relation.kind === 'hardPrereq') hard.get(relation.to)?.push(relation.from);
  const depth = new Map([...known].map(id => [id, 0]));
  const dependencies = new Map();
  const roots = new Set();
  for (const node of nodes) if (!producers.get(node.id).length && !hard.get(node.id).length) {
    roots.add(node.id); depth.set(node.id, 0); dependencies.set(node.id, []);
  }
  let changed = true;
  while (changed) {
    changed = false;
    for (const node of nodes) {
      if (depth.has(node.id)) continue;
      const options = producers.get(node.id).map(action => ({
        action, inputs: [...new Set([...action.inputs.map(input => input.node), ...hard.get(node.id)])],
      })).filter(option => option.inputs.every(id => depth.has(id)))
        .sort((a, b) => a.inputs.length - b.inputs.length || a.action.id.localeCompare(b.action.id, 'en'));
      if (!options.length) continue;
      const inputs = options[0].inputs;
      depth.set(node.id, 1 + Math.max(0, ...inputs.map(id => depth.get(id))));
      dependencies.set(node.id, inputs); changed = true;
    }
  }
  const collect = (goal, allAlternatives = false) => {
    const result = new Set(); const todo = [goal];
    while (todo.length && result.size < 400) {
      const id = todo.pop(); if (result.has(id) || known.has(id)) continue;
      result.add(id);
      const inputs = dependencies.get(id) ?? (allAlternatives
        ? [...(hard.get(id) ?? []), ...(producers.get(id) ?? []).flatMap(action => action.inputs.map(input => input.node))] : []);
      for (const input of inputs) if (!result.has(input)) todo.push(input);
    }
    return result;
  };
  return { nodes, roots, depth, dependencies, hard, collect };
}

function routeSchedule(ontology, route, milestone, preferences, known, mainNodes, hard) {
  const canonical = canonicalizeEventGraph(route.events);
  const keyById = new Map(route.events.map(event => [event.id, sha256(canonical.canonicalById.get(event.id))]));
  const edges = [...route.order];
  const background = new Set(route.entry);
  for (const source of [...Object.values(route.goalSources), ...route.events.flatMap(event => Object.values(event.sources))]) {
    if (source.kind !== 'event' && !known.has(source.node)) background.add(source.node);
  }
  let invalid = false;
  for (const event of route.events) {
    for (const output of event.provides) for (const prerequisite of hard.get(output.node) ?? []) {
      if (known.has(prerequisite)) continue;
      const source = route.goalSources[prerequisite] ?? event.sources[prerequisite]
        ?? (route.events.find(other => other.id !== event.id && other.provides.some(item => item.node === prerequisite))
          ? { kind: 'event', eventId: route.events.find(other => other.id !== event.id && other.provides.some(item => item.node === prerequisite)).id }
          : null);
      if (source?.kind === 'event') {
        if (source.eventId === event.id) invalid = true;
        else edges.push([source.eventId, event.id]);
      } else background.add(prerequisite);
    }
  }
  if (invalid) return null;
  const mappedEdges = [...new Map(edges.map(([from, to]) => {
    const pair = [keyById.get(from), keyById.get(to)]; return [pair.join('>'), pair];
  })).values()];
  // Classify the actual chosen events, rather than an outline for a different OR alternative.
  const mainKeys = new Set();
  const targetSource = route.goalSources[milestone];
  if (targetSource?.kind === 'event') {
    const pending = [keyById.get(targetSource.eventId)];
    while (pending.length) {
      const key = pending.pop(); if (mainKeys.has(key)) continue;
      mainKeys.add(key);
      pending.push(...mappedEdges.filter(([, to]) => to === key).map(([from]) => from));
    }
  }
  const steps = route.events.map(event => {
    const node = ontology.node(event.focus.node);
    const requires = ontology.action(event.actionId).inputs.map(input => input.node);
    const hardPrereqs = [...new Set(event.provides.flatMap(output => hard.get(output.node) ?? []))];
    const conditions = [...new Set([...requires, ...hardPrereqs])];
    return {
      key: keyById.get(event.id), eventId: event.id, actionId: event.actionId, node: node.id,
      discipline: node.discipline, construct: node.construct,
      lane: mainKeys.size ? (mainKeys.has(keyById.get(event.id)) ? 'main' : 'branch')
        : (mainNodes.has(node.id) || node.id === milestone ? 'main' : 'branch'),
      requires, hardPrereqs, ready: conditions.every(id => known.has(id)),
      unlocks: mappedEdges.filter(([from, to]) => from === keyById.get(event.id) && mainKeys.has(to)).length,
    };
  });
  const graphHash = sha256({
    events: canonical.key, edges: [...mappedEdges].sort(), milestone,
    lanes: steps.map(step => [step.key, step.lane]).sort(),
  });
  const scheduled = scheduleLearningSteps(steps, mappedEdges, preferences, { ontologyVersion: ontology.version, graphHash });
  if (scheduled.unresolved.length) return null;
  return { steps, edges: mappedEdges, graphHash, background: [...background].filter(id => !known.has(id)).sort(), ...scheduled };
}

/** Apply the same scheduling policy to the detailed planner's existing result packages. */
export function personalizePlanResult(ontology, result, rawPreferences, background = []) {
  const preferences = normalizeLearningPlan(rawPreferences);
  const known = new Set(background.filter(entry => entry.confirmed === true || entry.kind === 'confirmed').map(entry => entry.node));
  const model = skeleton(ontology, known);
  const milestone = result.goals.includes(preferences.primaryGoal) ? preferences.primaryGoal : result.goals[0];
  const mainNodes = model.collect(milestone, true);
  const packages = new Map(result.routes.map(route => {
    const schedule = routeSchedule(ontology, route, milestone, preferences, known, mainNodes, model.hard);
    return [route.id, { ...route, learningSchedule: schedule ? { ...schedule, ontologyVersion: ontology.version } : null }];
  }));
  return { ...result, routes: result.routes.map(route => packages.get(route.id)), pareto: result.pareto.map(route => packages.get(route.id) ?? route) };
}

/** Bounded orchestration around the existing AND/OR planner. M is never edited. */
export function buildLearningPlan(ontology, rawPreferences, background = []) {
  const preferences = normalizeLearningPlan(rawPreferences);
  const known = new Set(background.filter(entry => entry.confirmed === true || entry.kind === 'confirmed').map(entry => entry.node));
  const model = skeleton(ontology, known);
  const goal = preferences.primaryGoal;
  const outstandingBranches = preferences.branches.filter(id => !known.has(id));
  const base = {
    primaryGoal: goal, primaryComplete: false, milestone: null, ontologyVersion: ontology.version, graphHash: '', status: 'NoGoal',
    steps: [], order: [], edges: [], background: [], currentReady: [], pending: [], unresolved: [],
    roadmap: [], truncated: false, staleManual: false, deferredBranches: [], search: { complete: true, reasons: [] },
  };
  if (!goal) return base;
  const goalNode = ontology.node(goal);
  if ((goalNode.granularity ?? 'unit') !== 'unit') return { ...base, status: 'Blocked', unresolved: [goal] };
  if (known.has(goal)) {
    const branches = outstandingBranches;
    if (!branches.length) return { ...base, status: 'Complete', primaryComplete: true };
    // Explicit branches continue when the primary goal is confirmed; completed work stays fixed.
    const branch = buildLearningPlan(ontology, { ...preferences, primaryGoal: branches[0], branches: branches.slice(1), manualOrder: null }, background);
    const steps = branch.steps.map(step => ({ ...step, lane: 'branch' }));
    const graphHash = sha256({ branch: branch.graphHash, primaryGoal: goal });
    return { ...branch, primaryGoal: goal, primaryComplete: true, steps, graphHash,
      ...scheduleLearningSteps(steps, branch.edges, preferences, { ontologyVersion: ontology.version, graphHash }) };
  }
  if (model.roots.has(goal)) return { ...base, status: 'Conditional', milestone: goal, pending: [goal],
    background: [goal], roadmap: [{ node: goal, level: 0, requires: [] }] };
  const mainNodes = model.collect(goal, true);
  base.pending = [...mainNodes].filter(id => !known.has(id));
  base.unresolved = [...mainNodes].filter(id => !model.depth.has(id));
  base.roadmap = [...mainNodes].filter(id => model.depth.has(id))
    .map(node => ({ node, level: model.depth.get(node), requires: model.dependencies.get(node) ?? [] }))
    .sort((a, b) => a.level - b.level || a.node.localeCompare(b.node, 'en'));
  const candidates = [...mainNodes].filter(id => !model.roots.has(id) && model.depth.has(id) && !known.has(id))
    .sort((a, b) => Math.min(model.depth.get(b), 5) - Math.min(model.depth.get(a), 5) || a.localeCompare(b, 'en'));
  if (model.depth.has(goal) && model.collect(goal).size <= MAX_EVENTS + model.roots.size) {
    candidates.splice(candidates.indexOf(goal), 1); candidates.unshift(goal);
  }
  const bounded = candidates.filter(id => model.depth.get(id) <= 5);
  // Try the primary goal first only if it fits the bounded teaching segment.
  if (candidates[0] === goal && model.depth.get(goal) <= 5 && !bounded.includes(goal)) bounded.unshift(goal);
  const planner = makePlanner(ontology);
  const planningBackground = [...background];
  const declaredNodes = new Set(background.map(entry => entry.node));
  for (const id of model.roots) if (!declaredNodes.has(id)) planningBackground.push({
    entryId: `learning-entry:${id}`, node: id, kind: 'unknown', confirmed: false,
    provides: ['statement', 'definition', 'construction', 'method', 'task', 'proof', 'representation'],
  });
  const searchReasons = new Set();
  let searchComplete = true;
  // At most six milestones and two passes: explicit branch work, then primary-only fallback.
  for (const milestone of bounded.slice(0, 6)) {
    const branchMilestones = outstandingBranches.filter(id => ontology.maybeNode(id)).map(id => {
      const ancestors = [...model.collect(id, true)].filter(node => model.depth.has(node) && !model.roots.has(node) && !known.has(node));
      return ancestors.sort((a, b) => model.depth.get(b) - model.depth.get(a) || a.localeCompare(b, 'en'))
        .find(node => model.depth.get(node) <= 3) ?? null;
    }).filter(Boolean);
    for (const withBranches of branchMilestones.length ? [true, false] : [false]) {
      const queue = [[...new Set([milestone, ...(withBranches ? branchMilestones : [])])]];
      const visited = new Set();
      for (let round = 0; queue.length && round < 6; round += 1) {
        const goals = queue.shift();
        visited.add([...goals].sort().join('|'));
        const result = planner.plan({ goalIds: goals, background: planningBackground, horizon: MAX_EVENTS, maxCandidates: MAX_CANDIDATES });
        searchComplete &&= result.search.complete;
        for (const reason of result.search.reasons) searchReasons.add(reason);
        if (!result.routes.length) continue;
        const preferred = result.pareto.length ? result.pareto : result.routes;
        const ordered = [...preferred].sort((a, b) => a.events.length - b.events.length || a.id.localeCompare(b.id, 'en'));
        for (const route of ordered) {
          // Replan each OR alternative separately: its hard prerequisites do not constrain the others.
          const added = new Set(goals);
          for (const event of route.events) for (const output of event.provides) {
            for (const prerequisite of model.hard.get(output.node) ?? []) if (!known.has(prerequisite)) added.add(prerequisite);
          }
          if (added.size !== goals.length) {
            const next = [...added]; const signature = [...next].sort().join('|');
            if (!visited.has(signature) && !queue.some(item => [...item].sort().join('|') === signature)) queue.push(next);
            continue;
          }
          const segmentMain = model.collect(milestone, true);
          const scheduled = routeSchedule(ontology, route, milestone, preferences, known, segmentMain, model.hard);
          if (!scheduled) continue;
          const deferredBranches = withBranches ? [] : [...outstandingBranches];
          return {
            ...base, ...scheduled, milestone, status: scheduled.background.length ? 'Conditional' : result.status,
            currentReady: scheduled.steps.filter(step => step.ready && !scheduled.edges.some(([, to]) => to === step.key)).map(step => step.node),
            truncated: milestone !== goal || scheduled.steps.length > 5 || !result.search.complete || deferredBranches.length > 0,
            deferredBranches, search: { complete: result.search.complete, reasons: result.search.reasons },
          };
        }
      }
      if (queue.length) { searchComplete = false; searchReasons.add('hard-prerequisite-replanning-bound'); }
    }
  }
  const missingRoots = [...mainNodes].filter(id => model.roots.has(id) && !known.has(id));
  // Failure of a bounded teaching search is not a proof that the long-term goal is impossible.
  if (bounded.length > 6) { searchComplete = false; searchReasons.add('milestone-candidate-bound'); }
  return { ...base, status: base.unresolved.length && searchComplete ? 'Blocked' : 'Unknown', background: missingRoots,
    search: { complete: searchComplete, reasons: [...searchReasons] }, truncated: true };
}
