// 第 12 章有界参考算法的实现。
// 先选 AND/OR 方案与逐项来源，再合并策略次序并检查无环；
// 只有声明域内完整枚举且无待决项时才报告 InfeasibleWithinBound。
import { McsError, CODES } from '../shared/errors.mjs';
import {
  PROTOCOL, PLANNER_VERSION, canonicalString, normalizePlanRequest, assert,
} from '../shared/contracts.mjs';
import { routeFamilyRequirement } from './support.mjs';

const MAX_LINEAR_EXTENSIONS = 6;
const GOAL_ACCEPTS = ['statement', 'definition', 'proof', 'certificate', 'construction', 'task', 'method', 'representation'];

function compatible(provides, accepts) {
  return provides.some((resource) => accepts.includes(resource));
}

function sortEvents(events) {
  return [...events].sort((a, b) => a.id.localeCompare(b.id, 'en'));
}

function detectCycle(nodes, edges) {
  const adjacency = new Map(nodes.map((id) => [id, []]));
  for (const [from, to] of edges) {
    if (!adjacency.has(from) || !adjacency.has(to)) continue;
    adjacency.get(from).push(to);
  }
  const visiting = new Set();
  const done = new Set();
  const stack = [];
  let cycle = null;
  function visit(node) {
    if (done.has(node)) return false;
    if (visiting.has(node)) {
      const start = stack.indexOf(node);
      cycle = [...stack.slice(start), node];
      return true;
    }
    visiting.add(node);
    stack.push(node);
    for (const next of adjacency.get(node) ?? []) if (visit(next)) return true;
    stack.pop();
    visiting.delete(node);
    done.add(node);
    return false;
  }
  for (const node of nodes) if (visit(node)) return cycle;
  return null;
}

function transitiveClosure(nodes, edges) {
  const adjacency = new Map(nodes.map((id) => [id, new Set()]));
  for (const [from, to] of edges) if (adjacency.has(from) && adjacency.has(to) && from !== to) adjacency.get(from).add(to);
  const closure = [];
  for (const start of nodes) {
    const seen = new Set();
    const queue = [...adjacency.get(start)];
    while (queue.length) {
      const next = queue.shift();
      if (seen.has(next)) continue;
      seen.add(next);
      for (const further of adjacency.get(next) ?? []) queue.push(further);
    }
    for (const target of seen) closure.push([start, target]);
  }
  return closure.sort((a, b) => `${a[0]}>${a[1]}`.localeCompare(`${b[0]}>${b[1]}`, 'en'));
}

function topologicalOrders(nodes, edges, limit = MAX_LINEAR_EXTENSIONS) {
  const incoming = new Map(nodes.map((id) => [id, new Set()]));
  for (const [from, to] of edges) if (incoming.has(to) && from !== to) incoming.get(to).add(from);
  const results = [];
  const placed = [];
  function walk() {
    if (results.length >= limit) return;
    if (placed.length === nodes.length) { results.push([...placed]); return; }
    const ready = nodes.filter((id) => !placed.includes(id) && [...incoming.get(id)].every((dependency) => placed.includes(dependency))).sort();
    if (ready.length === 0) return;
    for (const next of ready) {
      placed.push(next);
      walk();
      placed.pop();
      if (results.length >= limit) return;
    }
  }
  walk();
  return results;
}

// 对事件图做迭代标签规范化，用于删除同构重复的完整结果包。
function canonicalizeEventGraph(events) {
  const initial = new Map(events.map((event) => [event.id, `${event.actionId}|${event.focus.node}|${event.focus.resource}`]));
  let labels = initial;
  for (let round = 0; round < events.length + 1; round += 1) {
    const next = new Map();
    for (const event of events) {
      const parts = Object.entries(event.sources).sort(([a], [b]) => a.localeCompare(b, 'en')).map(([key, source]) => {
        if (source.kind === 'event') return `${key}=>${labels.get(source.eventId) ?? source.eventId}`;
        return `${key}=>${source.kind}:${source.node}:${source.resource}`;
      });
      next.set(event.id, `${event.actionId}|${event.focus.node}|${event.focus.resource}|${parts.join(',')}`);
    }
    if (canonicalString([...next.entries()]) === canonicalString([...labels.entries()])) break;
    labels = next;
  }
  const rankByLabel = new Map();
  const canonicalById = new Map();
  for (const event of [...events].sort((a, b) => a.id.localeCompare(b.id, 'en'))) {
    const label = labels.get(event.id);
    const rank = rankByLabel.get(label) ?? 0;
    rankByLabel.set(label, rank + 1);
    canonicalById.set(event.id, `${label}#${rank}`);
  }
  const rows = events.map((event) => ({
    id: canonicalById.get(event.id),
    actionId: event.actionId,
    focus: event.focus,
    kind: event.kind,
    provides: event.provides,
    sources: Object.fromEntries(Object.entries(event.sources).sort(([a], [b]) => a.localeCompare(b, 'en')).map(([key, source]) => [
      key,
      source.kind === 'event'
        ? { kind: 'event', ref: canonicalById.get(source.eventId), node: source.node, resource: source.resource }
        : source,
    ])),
  })).sort((a, b) => a.id.localeCompare(b.id, 'en'));
  return { key: canonicalString(rows), canonicalById };
}

function summarizeEffects(events) {
  const effects = { statements: 0, proofs: 0, certificates: 0, goals: 0 };
  for (const event of events) {
    for (const output of event.provides) {
      if (output.provides.includes('statement') || output.provides.includes('definition')) effects.statements += 1;
      if (output.provides.includes('proof')) effects.proofs += 1;
      if (output.provides.includes('certificate')) effects.certificates += 1;
    }
  }
  return effects;
}

function dominant(a, b) {
  if (a.cost.status !== 'known' || b.cost.status !== 'known') return false;
  const costs = a.cost.vector.every((value, index) => value <= b.cost.vector[index]);
  const costStrict = a.cost.vector.some((value, index) => value < b.cost.vector[index]);
  const effects = Object.keys(a.effects).every((key) => a.effects[key] >= b.effects[key]);
  const effectStrict = Object.keys(a.effects).some((key) => a.effects[key] > b.effects[key]);
  return costs && costStrict && effects && effectStrict;
}

export function makePlanner(ontology) {
  const boundary = ontology.boundaryRefs;
  const actions = [...ontology.raw.actions].sort((a, b) => a.id.localeCompare(b.id, 'en'));
  const producers = new Map();
  for (const action of actions) {
    for (const output of action.outputs) {
      if (!producers.has(output.node)) producers.set(output.node, []);
      producers.get(output.node).push({ action, output });
    }
  }

  function plan(rawRequest) {
    const request = normalizePlanRequest(rawRequest);
    for (const goal of request.goals) ontology.node(goal);
    const backgroundByNode = new Map();
    for (const entry of request.background) {
      if (!ontology.maybeNode(entry.node) && !boundary.has(entry.node)) {
        throw new McsError(CODES.UNKNOWN_NODE, `背景项引用了未知节点：${entry.node}`, 404, { node: entry.node });
      }
      if (!backgroundByNode.has(entry.node)) backgroundByNode.set(entry.node, []);
      backgroundByNode.get(entry.node).push(entry);
    }
    const strategyUnknown = new Set(request.strategy.unknownEntries ?? []);
    const isBoundary = (nodeId) => boundary.has(nodeId) || strategyUnknown.has(nodeId) || (backgroundByNode.get(nodeId) ?? []).some((entry) => entry.kind === 'unknown');
    const state = {
      visited: 0,
      truncated: false,
      reasons: new Set(),
      packages: [],
      keys: new Set(),
      sourceAssignments: 0,
      goalSourceCombinations: 0,
      maxEvents: 0,
    };

    const truncate = (reason) => { state.truncated = true; state.reasons.add(reason); };

    function producerOptions(nodeId) {
      const list = producers.get(nodeId) ?? [];
      return [...list].sort((a, b) => a.action.id.localeCompare(b.action.id, 'en'));
    }

    function boundaryEntry(nodeId) {
      const existing = (backgroundByNode.get(nodeId) ?? []).find((entry) => entry.kind === 'unknown');
      if (existing) return existing;
      return { entryId: `boundary:${nodeId}`, node: nodeId, provides: ['statement', 'definition', 'construction', 'method', 'task', 'proof'], kind: 'boundary', confirmed: false, question: `开始这条路线前，需要确认「${ontology.maybeNode(nodeId)?.title ?? nodeId}」是否可用。` };
    }

    function backgroundOptions(nodeId, accepts) {
      return (backgroundByNode.get(nodeId) ?? []).filter((entry) => compatible(entry.provides, accepts));
    }

    function search(pending, events, eventCounter, seen) {
      state.visited += 1;
      if (state.visited > request.maxCandidates) { truncate('CANDIDATE_LIMIT'); return; }
      if (pending.length === 0) { finalize(events); return; }
      pending = [...pending].sort((a, b) => `${a.node}|${a.accepts.join(',')}`.localeCompare(`${b.node}|${b.accepts.join(',')}`, 'en'));
      const need = pending[0];
      const rest = pending.slice(1);
      const signature = canonicalString({ pending: pending.map((item) => `${item.node}:${item.accepts.join(',')}`), events: events.map((event) => `${event.actionId}:${event.focus.node}`) });
      if (seen.has(signature)) return;
      seen.add(signature);

      const backgroundAvailable = backgroundOptions(need.node, need.accepts).length > 0;
      if (backgroundAvailable) search(rest, events, eventCounter, new Set(seen));

      const shared = events.find((event) => event.provides.some((output) => output.node === need.node && compatible(output.provides, need.accepts)));
      if (shared) search(rest, events, eventCounter, new Set(seen));

      if (request.useUnknownEntries && isBoundary(need.node) && !backgroundAvailable && !shared) search(rest, events, eventCounter, new Set(seen));

      if (events.length >= state.maxEvents) return;
      for (const option of producerOptions(need.node)) {
        if (state.visited > request.maxCandidates) { truncate('CANDIDATE_LIMIT'); return; }
        if (request.strategy.allowRepeats !== true && events.some((event) => event.actionId === option.action.id)) continue;
        const id = `ev${eventCounter + 1}`;
        const event = {
          id,
          actionId: option.action.id,
          focus: { node: need.node, resource: need.accepts[0] },
          provides: option.action.outputs,
          inputNeeds: option.action.inputs.map((input) => ({ node: input.node, accepts: input.accepts, key: input.node })),
          sources: {},
          kind: 'learning',
        };
        const nextPending = [...rest, ...event.inputNeeds.map((input) => ({ ...input, consumerEventId: id }))];
        search(nextPending, [...events, event], eventCounter + 1, new Set(seen));
      }
    }

    function finalize(events) {
      const ordered = sortEvents(events);
      if (ordered.length === 0) {
        const goalSources = {};
        let ok = true;
        for (const goal of request.goals) {
          const options = backgroundOptions(goal, GOAL_ACCEPTS);
          if (options.length === 0 && request.useUnknownEntries && isBoundary(goal)) {
            goalSources[goal] = boundarySource(boundaryEntry(goal));
          } else if (options.length) goalSources[goal] = backgroundSource(options[0]);
          else ok = false;
        }
        if (ok) addPackage({ events: [], sources: goalSources });
        return;
      }

      const sourceOptionsByEvent = new Map();
      for (const event of ordered) {
        const action = ontology.action(event.actionId);
        const options = {};
        for (const input of action.inputs) {
          const key = input.node;
          const candidates = [];
          for (const entry of backgroundOptions(input.node, input.accepts)) candidates.push(backgroundSource(entry));
          for (const other of ordered) {
            if (other.id === event.id) continue;
            if (other.provides.some((output) => output.node === input.node && compatible(output.provides, input.accepts))) {
              const resource = other.provides.find((output) => output.node === input.node).provides.find((item) => input.accepts.includes(item));
              candidates.push({ kind: 'event', eventId: other.id, node: input.node, resource });
            }
          }
          if (candidates.length === 0 && request.useUnknownEntries && isBoundary(input.node)) candidates.push(boundarySource(boundaryEntry(input.node)));
          options[key] = candidates;
          if (candidates.length === 0) return;
        }
        sourceOptionsByEvent.set(event.id, options);
      }

      const eventIds = ordered.map((event) => event.id);
      const assignment = {};
      function assignSource(index) {
        if (state.sourceAssignments > request.maxCandidates) { truncate('SOURCE_LIMIT'); return; }
        if (index === ordered.length) {
          state.sourceAssignments += 1;
          completeAssignment(ordered, assignment, eventIds);
          return;
        }
        const event = ordered[index];
        const options = sourceOptionsByEvent.get(event.id);
        const keys = Object.keys(options).sort();
        const chosen = {};
        function assignInput(inputIndex) {
          if (state.sourceAssignments > request.maxCandidates) { truncate('SOURCE_LIMIT'); return; }
          if (inputIndex === keys.length) {
            assignment[event.id] = chosen;
            assignSource(index + 1);
            return;
          }
          const key = keys[inputIndex];
          for (const candidate of options[key]) {
            if (candidate.kind === 'event' && candidate.eventId === event.id) continue;
            chosen[key] = candidate;
            assignInput(inputIndex + 1);
          }
          delete chosen[key];
        }
        assignInput(0);
      }
      assignSource(0);
    }

    function backgroundSource(entry) {
      return { kind: 'background', entryId: entry.entryId, node: entry.node, resource: entry.provides[0], confirmed: entry.confirmed === true };
    }

    function boundarySource(entry) {
      return { kind: 'boundary', node: entry.node, resource: entry.provides[0], question: entry.question ?? `需要确认「${ontology.maybeNode(entry.node)?.title ?? entry.node}」是否可用。` };
    }

    function completeAssignment(ordered, assignment, eventIds) {
      const events = ordered.map((event) => ({ ...event, sources: { ...(assignment[event.id] ?? {}) } }));
      const sourceEdges = new Set();
      for (const event of events) {
        for (const source of Object.values(event.sources)) {
          if (source.kind === 'event') sourceEdges.add(`${source.eventId}>${event.id}`);
        }
      }
      const cycle = detectCycle(eventIds, [...sourceEdges].map((edge) => edge.split('>')));
      if (cycle) { state.reasons.add('SOURCE_CYCLE'); return; }

      const goalSourceOptions = {};
      for (const goal of request.goals) {
        const candidates = [];
        for (const entry of backgroundOptions(goal, GOAL_ACCEPTS)) candidates.push(backgroundSource(entry));
        for (const event of events) {
          if (event.provides.some((output) => output.node === goal && compatible(output.provides, GOAL_ACCEPTS))) {
            const output = event.provides.find((item) => item.node === goal);
            const resource = output.provides.find((item) => GOAL_ACCEPTS.includes(item));
            candidates.push({ kind: 'event', eventId: event.id, node: goal, resource });
          }
        }
        if (candidates.length === 0 && request.useUnknownEntries && isBoundary(goal)) candidates.push(boundarySource(boundaryEntry(goal)));
        if (candidates.length === 0) return;
        goalSourceOptions[goal] = candidates;
      }
      const goals = request.goals;
      const chosenGoals = {};
      function chooseGoal(index) {
        if (state.sourceAssignments > request.maxCandidates) { truncate('SOURCE_LIMIT'); return; }
        if (index === goals.length) {
          state.sourceAssignments += 1;
          buildPackage(events, sourceEdges, chosenGoals);
          return;
        }
        const goal = goals[index];
        for (const candidate of goalSourceOptions[goal]) {
          chosenGoals[goal] = candidate;
          chooseGoal(index + 1);
        }
      }
      chooseGoal(0);
    }

    function strategyEdgeSets(events) {
      const sets = request.strategy.orderSets?.length ? request.strategy.orderSets : [[]];
      return sets.map((orderSet) => {
        const edges = [];
        for (const edge of orderSet) {
          const resolve = (endpoint) => events.filter((event) => event.actionId === endpoint.action)[endpoint.index];
          const from = resolve(edge.from);
          const to = resolve(edge.to);
          if (from && to) edges.push([from.id, to.id]);
        }
        return edges;
      });
    }

    function buildPackage(events, sourceSet, goalSources) {
      const sourceEdges = [...sourceSet].map((edge) => edge.split('>'));
      const ids = events.map((event) => event.id);
      for (const edgeSet of strategyEdgeSets(events)) {
        const edges = [...sourceEdges, ...edgeSet];
        const cycle = detectCycle(ids, edges);
        if (cycle) { state.reasons.add('JOINT_CYCLE'); continue; }
        const order = transitiveClosure(ids, edges);
        const linearExtensions = topologicalOrders(ids, edges);
        if (linearExtensions.length === 0) { state.reasons.add('NO_LINEAR_EXTENSION'); continue; }

        const costs = request.strategy.costs ?? null;
        let costStatus = 'unknown';
        let costVector = null;
        if (costs && events.every((event) => typeof costs[event.actionId] === 'number')) {
          costStatus = 'known';
          costVector = events.map((event) => costs[event.actionId]);
          if (request.budget?.maxCost !== null && request.budget?.maxCost !== undefined) {
            const total = costVector.reduce((sum, value) => sum + value, 0);
            if (total > request.budget.maxCost) continue;
          }
        }
        const effects = summarizeEffects(events);
        effects.goals = request.goals.filter((goal) => goalSources[goal]?.kind === 'event').length;
        const usedBackground = [...new Set(Object.values(goalSources).filter((source) => source.kind === 'background').map((source) => source.entryId)
          .concat(events.flatMap((event) => Object.values(event.sources).filter((source) => source.kind === 'background').map((source) => source.entryId))))];
        const entry = [...new Set(Object.values(goalSources).filter((source) => source.kind === 'boundary').map((source) => source.node)
          .concat(events.flatMap((event) => Object.values(event.sources).filter((source) => source.kind === 'boundary').map((source) => source.node))))].sort();
        const witness = events.map((event) => {
          const action = ontology.action(event.actionId);
          return { eventId: event.id, actionId: event.actionId, ref: action.witness.ref, status: action.witness.status };
        });
        const canonicalGraph = canonicalizeEventGraph(events);
        const canonicalGoalSources = Object.fromEntries(Object.entries(goalSources).map(([goal, source]) => [
          goal,
          source.kind === 'event' ? { ...source, eventId: canonicalGraph.canonicalById.get(source.eventId) } : source,
        ]));
        const canonicalOrder = order
          .map(([from, to]) => [canonicalGraph.canonicalById.get(from), canonicalGraph.canonicalById.get(to)])
          .sort((a, b) => `${a[0]}>${a[1]}`.localeCompare(`${b[0]}>${b[1]}`, 'en'));
        const dedupKey = canonicalString({ graph: canonicalGraph.key, goals: canonicalGoalSources, order: canonicalOrder });
        if (state.keys.has(dedupKey)) continue;
        state.keys.add(dedupKey);
        state.packages.push({
          id: `route-${state.packages.length + 1}`,
          goals: [...request.goals],
          events: events.map((event) => ({
            id: event.id,
            actionId: event.actionId,
            focus: event.focus,
            sources: event.sources,
            provides: event.provides,
            kind: event.kind,
          })),
          sourceEdges,
          strategyEdges: edgeSet,
          order,
          linearExtensions,
          goalSources: { ...goalSources },
          entry,
          usedBackground,
          cost: costStatus === 'known' ? { status: 'known', vector: costVector } : { status: 'unknown', vector: null, note: costs ? '部分行动未声明成本；预算未被静默比较。' : '未声明成本模型；不预测学习成功率。' },
          effects,
          witness,
          meta: { ontologyVersion: ontology.version, plannerVersion: PLANNER_VERSION, algorithm: 'bounded-reference/1' },
        });
      }
    }

    function addPackage({ events, sources }) {
      state.packages.push({
        id: `route-${state.packages.length + 1}`,
        goals: [...request.goals],
        events: [],
        sourceEdges: [],
        strategyEdges: [],
        order: [],
        linearExtensions: [[]],
        goalSources: sources,
        entry: [...new Set(Object.values(sources).filter((source) => source.kind === 'boundary').map((source) => source.node))].sort(),
        usedBackground: [...new Set(Object.values(sources).filter((source) => source.kind === 'background').map((source) => source.entryId))],
        cost: { status: 'known', vector: [], note: '空事件路线；成本向量为空。' },
        effects: { statements: 0, proofs: 0, certificates: 0, goals: 0 },
        witness: [],
        meta: { ontologyVersion: ontology.version, plannerVersion: PLANNER_VERSION, algorithm: 'bounded-reference/1' },
      });
    }

    const goalNeeds = request.goals.map((goal) => ({ node: goal, accepts: GOAL_ACCEPTS }));
    const enumerateAllDepths = request.strategy.enumerateAllDepths === true;
    let foundDepth = null;
    const searchedDepths = [];
    for (let depth = 0; depth <= request.horizon; depth += 1) {
      state.maxEvents = depth;
      state.packages = [];
      state.keys = new Set();
      state.sourceAssignments = 0;
      search(goalNeeds, [], 0, new Set());
      searchedDepths.push(depth);
      if (state.packages.length > 0) {
        foundDepth = depth;
        if (!enumerateAllDepths) break;
      }
      if (state.truncated) break;
    }

    const routes = state.packages.sort((a, b) => {
      if (a.events.length !== b.events.length) return a.events.length - b.events.length;
      const costA = a.cost.status === 'known' ? a.cost.vector.reduce((sum, value) => sum + value, 0) : Number.POSITIVE_INFINITY;
      const costB = b.cost.status === 'known' ? b.cost.vector.reduce((sum, value) => sum + value, 0) : Number.POSITIVE_INFINITY;
      if (costA !== costB) return costA - costB;
      return a.id.localeCompare(b.id, 'en');
    });
    const pareto = routes.filter((candidate) => !routes.some((other) => other !== candidate && dominant(other, candidate)));
    const budgetSet = request.budget !== null && request.budget?.maxCost !== null && request.budget?.maxCost !== undefined;
    const hasConfirmedRoute = routes.some((route) => route.entry.length === 0 && route.usedBackground.every((entryId) => {
      const entry = request.background.find((item) => item.entryId === entryId);
      return !entry || entry.confirmed;
    }) && (route.cost.status === 'known' || !budgetSet));
    let status;
    if (state.truncated) status = 'Unknown';
    else if (routes.length === 0) status = 'InfeasibleWithinBound';
    else status = hasConfirmedRoute ? 'Found' : 'Conditional';
    const entryConditions = [...new Set(routes.flatMap((route) => route.entry))].sort();
    const unknownEntries = [...new Set(routes.flatMap((route) => Object.values(route.goalSources).filter((source) => source.kind === 'boundary')
      .concat(route.events.flatMap((event) => Object.values(event.sources).filter((source) => source.kind === 'boundary')))
      .map((source) => `${source.node}|${source.question}`)))].map((row) => {
      const [node, question] = row.split('|');
      return { node, question };
    });
    const family = routeFamilyRequirement(routes, request.goals, {
      complete: !state.truncated && routes.length > 0,
      note: state.truncated ? '搜索被候选上限截断，路线族未完整枚举。' : '有限事件界与登记行动库内的搜索。',
    });
    return {
      status,
      goals: [...request.goals],
      routes,
      pareto,
      search: {
        complete: !state.truncated,
        reasons: [...state.reasons].sort(),
        bounds: { horizon: request.horizon, maxCandidates: request.maxCandidates, visited: state.visited, firstSolutionDepth: foundDepth, searchedDepths },
        domain: '登记行动库 Λ′、声明背景与未知入口、有限事件界 h、策略给出的有限次序实例；默认先找到最少事件数的可行深度并停在该深度，可用 strategy.enumerateAllDepths 请求枚举到 h。未枚举任意约束公式。',
      },
      familyRequired: family.set,
      familyScope: family.scope ?? { complete: false, note: family.reason ?? '未完成路线族枚举。' },
      entryConditions,
      unknownEntries,
      meta: {
        ontologyVersion: ontology.version,
        plannerVersion: PLANNER_VERSION,
        request: {
          goals: request.goals,
          horizon: request.horizon,
          maxCandidates: request.maxCandidates,
          background: request.background.map((entry) => ({ entryId: entry.entryId, node: entry.node, provides: entry.provides, kind: entry.kind, confirmed: entry.confirmed })),
        },
      },
    };
  }

  function withReview(result, { node, actionId }) {
    const route = result.routes[0];
    if (!route) return { ...result, review: null, note: '没有可加复习事件的路线。' };
    const action = actionId ? ontology.action(actionId) : ontology.actionsFor(node)[0];
    if (!action) throw new McsError(CODES.UNKNOWN_ACTION, `节点 ${node} 没有可用于复习的行动`, 404);
    const output = action.outputs.find((item) => item.node === node);
    if (!output) throw new McsError(CODES.BAD_REQUEST, `行动 ${action.id} 不产出节点 ${node}；复习事件必须聚焦该行动的真实输出。`);
    const nextId = `review${route.events.length + 1}`;
    const sources = {};
    const dependencyEdges = [];
    for (const input of action.inputs) {
      const fromEvent = [...route.events].reverse().find((event) => event.provides.some((output) => output.node === input.node && compatible(output.provides, input.accepts)));
      if (fromEvent) { sources[input.node] = { kind: 'event', eventId: fromEvent.id, node: input.node, resource: input.accepts[0] }; dependencyEdges.push([fromEvent.id, nextId]); continue; }
      const entry = (result.meta.request.background ?? []).find((item) => item.node === input.node);
      if (entry) { sources[input.node] = { kind: 'background', entryId: entry.entryId, node: input.node, resource: input.accepts[0], confirmed: entry.confirmed === true }; continue; }
      sources[input.node] = { kind: 'boundary', node: input.node, resource: input.accepts[0], question: `复习前需要确认「${input.node}」是否可用。` };
    }
    const reviewEvent = { id: nextId, actionId: action.id, focus: { node, resource: output.provides[0] ?? 'statement' }, sources, provides: action.outputs, kind: 'review' };
    const events = [...route.events, reviewEvent];
    const edges = [...route.order, ...dependencyEdges];
    const order = transitiveClosure(events.map((event) => event.id), edges);
    return {
      ...result,
      routes: [{ ...route, events, order, linearExtensions: topologicalOrders(events.map((event) => event.id), edges) }],
      review: { eventId: nextId, actionId: action.id, node, note: '复习使用同一行动的另一个事件实例；事件身份独立。' },
    };
  }

  return { plan, withReview, version: PLANNER_VERSION, ontologyVersion: ontology.version, protocol: PROTOCOL };
}

export function explainPlanner() {
  return {
    version: PLANNER_VERSION,
    steps: [
      '从目标反向选择产出行动，行动输入是 AND，同一目标的多条产出行动是 OR。',
      '默认按事件数迭代加深，在第一个有可行深度的层完整枚举；strategy.enumerateAllDepths 可请求枚举到事件界 h。',
      '为每个事件选择关注节点，并为每项输入选择背景或更早事件的具体来源。',
      '把来源边与策略次序边合并后检查无环，再取自反传递闭包形成偏序。',
      '枚举候选偏序的线性扩张，保存事件、来源、目标来源与见证。',
      '仅当声明域内没有截断且没有待决项时才报告界内无解；Pareto 只产生展示子族。',
    ],
    states: {
      Found: '至少一条路线满足全部已声明确认背景与预算。',
      Conditional: '存在路线，但依赖未确认入口、开放假设或无法比较的外部成本。',
      InfeasibleWithinBound: '声明行动库、事件界与入口范围内完整检查后没有路线。',
      Unknown: '搜索被上限截断、资料缺失或判据不可判。',
    },
    limits: [
      '不预测学习成功率；未声明的成本保持未知。',
      '结构可行不表示真实学习有效。',
      '共同先修只对声明路线族报告，未证明枚举完整性时保留范围限定。',
    ],
  };
}
