// 外部模型 E 的默认解释器：人工确认与显式观察驱动；不从浏览或答对自动推出全面掌握。
import { assert } from '../shared/contracts.mjs';
import { CODES } from '../shared/errors.mjs';

const RESOURCE_BY_CONSTRUCT = {
  Symbol: ['statement'],
  Term: ['statement'],
  Concept: ['statement', 'definition'],
  Definition: ['definition', 'statement'],
  Claim: ['statement'],
  Proof: ['proof'],
  Example: ['statement'],
  Counterexample: ['statement'],
  Problem: ['task'],
  Theory: ['statement'],
  Construction: ['construction'],
  Method: ['method'],
  Representation: ['representation'],
  MisconceptionPattern: ['statement'],
};

export function deriveExternalState(events = []) {
  const confirmed = new Map();
  const unknown = new Map();
  const misconceptions = new Map();
  const estimates = [];
  const coverage = new Map();
  // 「已读」与「已确认」必须分开：读到不等于理解，更不等于掌握。
  const viewed = new Map();
  const reviewed = new Map();
  for (const event of events) {
    const nodeId = event.nodeId;
    if (event.kind === 'confirmation') {
      if (event.payload?.confirmed === false) unknown.set(nodeId, event);
      else confirmed.set(nodeId, event);
    }
    if (event.kind === 'view') {
      viewed.set(nodeId, event);
      if (event.payload?.context === 'review') reviewed.set(nodeId, (reviewed.get(nodeId) ?? 0) + 1);
    }
    if (event.kind === 'mastery_estimate' && event.payload?.dimension) {
      estimates.push({ node: nodeId, dimension: event.payload.dimension, value: event.payload.value ?? null, uncertainty: event.payload.uncertainty ?? null, eventId: event.eventId, source: event.source });
      const key = `${nodeId}:${event.payload.dimension}`;
      coverage.set(key, (coverage.get(key) ?? 0) + 1);
    }
    if (event.kind === 'misconception' && event.payload?.patternId) {
      misconceptions.set(event.payload.patternId, event);
    }
    if (event.kind === 'evaluation' && event.payload?.demonstrated === false) unknown.set(nodeId, event);
  }
  return {
    confirmed: [...confirmed.values()],
    unknown: [...unknown.values()],
    viewed: [...viewed.values()],
    reviewed: Object.fromEntries(reviewed),
    misconceptions: [...misconceptions.values()],
    estimates,
    coverage: Object.fromEntries(coverage),
  };
}

export function adapt(ontology, profile, { goalId = null, budget = null, strategy = {} } = {}) {
  const state = deriveExternalState(profile.events ?? []);
  const known = [];
  const unknown = [];
  const boundary = [];
  for (const event of state.confirmed) {
    const node = ontology.maybeNode(event.nodeId);
    if (!node) { boundary.push({ ref: event.nodeId, kind: 'unresolved-confirmation', note: '确认记录引用了当前版本无法解析的节点；不能当作空依赖。' }); continue; }
    known.push({
      node: node.id,
      resources: RESOURCE_BY_CONSTRUCT[node.construct] ?? ['statement'],
      evidence: [`event:${event.eventId}`],
      competences: state.estimates.filter((estimate) => estimate.node === node.id).map((estimate) => ({ dimension: estimate.dimension, value: estimate.value, uncertainty: estimate.uncertainty })),
    });
  }
  for (const event of state.unknown) {
    const node = ontology.maybeNode(event.nodeId);
    if (node) unknown.push({ node: node.id, reason: event.payload?.reason ?? '外部记录标为尚未确认' });
    else boundary.push({ ref: event.nodeId, kind: 'unresolved-unknown', note: '未知记录引用了当前版本无法解析的节点。' });
  }
  const allNodes = ontology.raw.nodes.map((node) => node.id);
  const classified = new Set([...known.map((item) => item.node), ...unknown.map((item) => item.node)]);
  const unspecified = allNodes.filter((id) => !classified.has(id));
  // 已读节点必须存在于当前版本本体；悬空引用与确认一样进 boundary，不静默丢弃。
  const viewed = state.viewed.map((event) => {
    const node = ontology.maybeNode(event.nodeId);
    if (!node) return { node: event.nodeId, unresolved: true, lastViewedAt: event.occurredAt, reviewCount: state.reviewed[event.nodeId] ?? 0 };
    return { node: node.id, unresolved: false, lastViewedAt: event.occurredAt, reviewCount: state.reviewed[event.nodeId] ?? 0 };
  });
  return {
    modelVersion: profile.modelVersion ?? 'mcs-manual-model/1',
    profileId: profile.id,
    revision: profile.revision,
    goalId,
    budget,
    strategy,
    known,
    unknown,
    unspecified,
    viewed,
    misconceptions: state.misconceptions.map((event) => ({ patternId: event.payload.patternId, evidence: `event:${event.eventId}`, uncertainty: event.payload.uncertainty ?? null })),
    estimates: state.estimates,
    coverage: state.coverage,
    boundary,
    note: 'Adapt 只产生显式参数包；未知、未指定与确认分开，未作答不等于答错；已读不等于已掌握。',
  };
}

// Adapt_M 直接读取公共结构，用于把 θ 转成规划背景；调用点必须显式声明本体版本。
export function adaptWithOntology(ontology, profile, options = {}) {
  const theta = adapt(ontology, profile, options);
  const background = theta.known.map((entry) => ({
    entryId: `profile:${profile.id}:${entry.node}`,
    node: entry.node,
    provides: entry.resources,
    kind: 'confirmed',
    confirmed: true,
    note: `来自外部确认 ${entry.evidence.join('、')}`,
    source: 'profile-confirmation',
  }));
  return { theta, background };
}

export function assertAdaptSignature(params) {
  assert(!Object.prototype.hasOwnProperty.call(params, 'M') && !Object.prototype.hasOwnProperty.call(params, 'ontology'), CODES.BAD_REQUEST, 'Adapt(E,s,g,b) 不得接收公共本体 M；需要 M 的调用必须使用 Adapt_M。');
}

export function stageOf(theta) {
  if (theta.known.length === 0) return 'cold-start';
  if (theta.known.length <= 3) return 'entering';
  return 'developing';
}
