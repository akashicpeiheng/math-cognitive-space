import type { EventView, NodeSummary, ProfileTheta } from './types';

/**
 * 学习进度的派生层。
 *
 * 纪律（与本站 M/E/D 边界一致）：
 * 1. 只读输入：本体图（公共 M 的投影）、θ（外部模型 E 的派生）、事件（E 的事实）——本模块不改任何东西。
 * 2. 不产出百分比或「掌握度」：M 与 E 里没有校准过的认知模型，伪造一个数字会误导学习者。
 *    计数与节点名单都是可追溯的事实，因此只提供这两者。
 * 3. 「已读」永不参与「已知」。已知只来自 confirmation，与 Adapt 的口径一致。
 */

export interface GraphAction {
  id: string;
  title: string;
  mode: string;
  inputs: Array<{ node: string; accepts: string[] }>;
  outputs: Array<{ node: string; provides: string[] }>;
}

export interface GraphRelation {
  id: string;
  kind: string;
  from: string;
  to: string;
  witness: { status: string };
  scope?: string | null;
}

export interface LearningInput {
  nodes: NodeSummary[];
  actions: GraphAction[];
  relations: GraphRelation[];
  theta: ProfileTheta | null;
  events: EventView[];
}

export interface LearningCounts {
  total: number;
  /** 显式确认可用的节点数。 */
  confirmed: number;
  /** 明确标为尚未理解/尚未确认的节点数。 */
  unknown: number;
  /** 记录过「已读」的节点数（已读不等于已确认）。 */
  read: number;
  /** 既已读又被标为尚未确认的节点数。 */
  readNotUnderstood: number;
  /** 从未确认、未标记、未读的节点数。 */
  untouched: number;
}

export interface ReadinessEntry {
  node: string;
  /** 该节点可由哪个行动引入。 */
  actionId: string;
  actionTitle: string;
  /** 引入它所需的输入节点。 */
  requires: string[];
  /** 是否所有输入都已确认可用。 */
  satisfied: boolean;
  /** 未满足的输入节点。 */
  missing: string[];
  /** 是否已经确认过（不需要再规划）。 */
  alreadyConfirmed: boolean;
  /** 是否已经读过（可复习而非初学）。 */
  read: boolean;
}

export interface ReviewItem {
  node: string;
  title: string;
  /** 'read-not-understood' 优先于 'confirmed'。 */
  reason: 'read-not-understood' | 'confirmed';
  lastViewedAt: string | null;
  reviewCount: number;
}

export interface LearningProgress {
  counts: LearningCounts;
  readonlyNodes: Set<string>;
  readNodes: Set<string>;
  unknownNodes: Set<string>;
  confirmedNodes: Set<string>;
  knowledge: Map<string, ReadinessEntry>;
  /** 立即可学：引入行动的全部输入都已确认可用，且该节点尚未确认。 */
  ready: ReadinessEntry[];
  /** 只差未满足输入一步的节点，用于说明「还缺什么」。 */
  blocked: ReadinessEntry[];
  reviewQueue: ReviewItem[];
}

function lastViewedAt(events: EventView[], nodeId: string): string | null {
  let latest: string | null = null;
  for (const event of events) {
    if (event.kind !== 'view' || event.nodeId !== nodeId) continue;
    if (!latest || event.occurredAt > latest) latest = event.occurredAt;
  }
  return latest;
}

function reviewCountOf(events: EventView[], nodeId: string): number {
  let count = 0;
  for (const event of events) {
    if (event.kind === 'view' && event.nodeId === nodeId && event.payload?.context === 'review') count += 1;
  }
  return count;
}

export function deriveLearning({ nodes, actions, relations, theta, events }: LearningInput): LearningProgress {
  const confirmed = new Set(theta?.known.map((entry) => entry.node) ?? []);
  const unknown = new Set(theta?.unknown.map((entry) => entry.node) ?? []);
  const read = new Set(theta?.viewed.filter((entry) => !entry.unresolved).map((entry) => entry.node) ?? []);
  const nodeIds = new Set(nodes.map((node) => node.id));
  const titles = new Map(nodes.map((node) => [node.id, node.title]));

  // 一个节点可能由多个行动引入（OR 候选）；只要其中一个可用即视为可学。
  const knowledge = new Map<string, ReadinessEntry>();
  for (const action of actions) {
    for (const output of action.outputs) {
      if (!nodeIds.has(output.node)) continue;
      const requires = action.inputs.map((input) => input.node).filter((id) => nodeIds.has(id));
      const missing = requires.filter((id) => !confirmed.has(id));
      const candidate: ReadinessEntry = {
        node: output.node,
        actionId: action.id,
        actionTitle: action.title,
        requires,
        satisfied: missing.length === 0,
        missing,
        alreadyConfirmed: confirmed.has(output.node),
        read: read.has(output.node),
      };
      const existing = knowledge.get(output.node);
      // 优先保留满足条件、且缺失更少的方案。
      if (!existing) { knowledge.set(output.node, candidate); continue; }
      const better = (candidate.satisfied && !existing.satisfied)
        || (candidate.satisfied === existing.satisfied && candidate.missing.length < existing.missing.length);
      if (better) knowledge.set(output.node, candidate);
    }
  }

  const entries = [...knowledge.values()];
  const ready = entries
    .filter((entry) => entry.satisfied && !entry.alreadyConfirmed)
    .sort((a, b) => a.node.localeCompare(b.node, 'en'));
  const blocked = entries
    .filter((entry) => !entry.satisfied)
    .sort((a, b) => a.missing.length - b.missing.length || a.node.localeCompare(b.node, 'en'));

  // 待复习：先列「已读但没懂」，再列「曾确认可用」；同类按最近浏览时间由旧到新，
  // 没有浏览记录（例如只点过确认）的排在后面。
  const readNotUnderstood: ReviewItem[] = [...read].filter((node) => unknown.has(node)).map((node) => ({
    node,
    title: titles.get(node) ?? node,
    reason: 'read-not-understood' as const,
    lastViewedAt: lastViewedAt(events, node),
    reviewCount: reviewCountOf(events, node),
  }));
  const confirmedItems: ReviewItem[] = [...confirmed].filter((node) => !unknown.has(node)).map((node) => ({
    node,
    title: titles.get(node) ?? node,
    reason: 'confirmed' as const,
    lastViewedAt: lastViewedAt(events, node),
    reviewCount: reviewCountOf(events, node),
  }));
  const byOldest = (a: ReviewItem, b: ReviewItem) => {
    if (a.lastViewedAt && b.lastViewedAt) return a.lastViewedAt.localeCompare(b.lastViewedAt);
    if (a.lastViewedAt) return -1;
    if (b.lastViewedAt) return 1;
    return a.node.localeCompare(b.node, 'en');
  };
  const reviewQueue = [...readNotUnderstood.sort(byOldest), ...confirmedItems.sort(byOldest)];

  const counts: LearningCounts = {
    total: nodes.length,
    confirmed: confirmed.size,
    unknown: unknown.size,
    read: read.size,
    readNotUnderstood: readNotUnderstood.length,
    untouched: nodes.filter((node) => !confirmed.has(node.id) && !unknown.has(node.id) && !read.has(node.id)).length,
  };

  return {
    counts,
    readonlyNodes: read,
    readNodes: read,
    unknownNodes: unknown,
    confirmedNodes: confirmed,
    knowledge,
    ready,
    blocked,
    reviewQueue,
  };
}

/** 关系邻接表：只保留两端都在当前节点集合内的边，避免悬空引用。 */
export function relationNeighbors(relations: GraphRelation[], nodeId: string): { outgoing: GraphRelation[]; incoming: GraphRelation[] } {
  return {
    outgoing: relations.filter((relation) => relation.from === nodeId),
    incoming: relations.filter((relation) => relation.to === nodeId),
  };
}

/**
 * 确定性的节点浏览顺序：先按节点 id 的稳定排序，保证「上一节点 / 下一节点」
 * 在两次访问之间不会改变（不依赖随机或时间）。
 */
export function orderedNodeIds(nodes: NodeSummary[]): string[] {
  return [...nodes.map((node) => node.id)].sort((a, b) => a.localeCompare(b, 'en'));
}

export interface SiblingNavigation {
  previous: string | null;
  next: string | null;
}

export function siblingsOf(nodes: NodeSummary[], current: string): SiblingNavigation {
  const order = orderedNodeIds(nodes);
  const index = order.indexOf(current);
  if (index < 0) return { previous: null, next: null };
  return {
    previous: index > 0 ? order[index - 1] : null,
    next: index < order.length - 1 ? order[index + 1] : null,
  };
}

/** 路线进度：某条路线上的事件已确认了几项。只统计，不折算成百分比。 */
export function routeProgress(actionIds: string[], ready: ReadinessEntry[], confirmed: Set<string>): { done: number; total: number } {
  const readyByNode = new Map(ready.map((entry) => [entry.node, entry]));
  let done = 0;
  for (const actionId of actionIds) {
    const entry = [...readyByNode.values()].find((item) => item.actionId === actionId);
    if (entry && confirmed.has(entry.node)) done += 1;
  }
  return { done, total: actionIds.length };
}
