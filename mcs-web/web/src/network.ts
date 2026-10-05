import { relationLabel } from './labels.ts';
import { edgeVisual } from './relation-visual.ts';
import type { NodeSummary } from './types';

/**
 * 「节点网络」的派生层：加法式组网、推荐理由与确定性布局。
 *
 * 设计约束（都来自对实际数据的核实，不是偏好）：
 *
 * 1. **主干是行动契约，不是语义关系。** data 里只有 15 条 `relations`，只覆盖 17 / 66 个节点；
 *    9 个背景节点的关系度全是 0。若只用关系建网，48 个节点会是孤岛。
 *    而 `actions` 的输入→输出契约有 109 条，覆盖 65 / 66 个节点，且直接回答「要学它先要什么」。
 *    两者叠加：契约给结构与可达性，关系给种类、见证强度与 `scope` 条件文本。
 *
 * 2. **只输出有登记依据的理由。** 不给不存在的 `hardPrereq` 编实例，不预测认知成本、难度或时长
 *    ——全仓没有这类字段。
 *
 * 3. **确定性。** 同一 `addedIds` 必须得到同一条边集合、同一份推荐顺序、同一套坐标。
 *    没有任何随机、时间或 DOM 依赖，因此同一 URL 反复打开结果一致。
 *
 * 4. **只读。** 不写 M、不写 E，不需要学习者档案。
 */

export interface NetworkAction {
  id: string;
  title: string;
  mode: string;
  inputs: Array<{ node: string; accepts: string[] }>;
  outputs: Array<{ node: string; provides: string[] }>;
}

export interface NetworkRelation {
  id: string;
  kind: string;
  from: string;
  to: string;
  witness: { status: string };
  scope?: string | null;
}

export interface NetworkGraph {
  nodes: NodeSummary[];
  relations: NetworkRelation[];
  actions: NetworkAction[];
  aggregates?: Array<{ id: string; kind: string; title: string; blocks: string[][] }>;
  patterns?: Array<{ id: string; node: string; title: string; anchors?: string[] }>;
  /**
   * 支持族：每个节点的「表达 / 证明 / 路线」三类支持集合。
   * 图接口为了保持轻量默认不发它；缺失时相关边源自动为空，不报错。
   */
  support?: Array<{ id: string; node: string; use: string; status: string; set?: string[] }>;
  /**
   * 证据记录（含 kind 与引用模式）。缺失时「证据并联」边源为空。
   */
  evidence?: Array<{ id: string; kind: string; status: string; nodes: string[]; patterns?: string[] }>;
}

/**
 * 边源家族。每一条都能追到已登记的数据，没有一类是编出来的
 * （括号内是 102 节点全库下的去重无向边数）：
 * - contract    行动契约：产出该节点需要哪些输入（166）
 * - relation    已登记语义关系：种类 + 见证状态 + scope（26）
 * - topic       同属一个聚合话题块（193）
 * - pattern     误区模式的节点与锚点（22）
 * - sharedInput 同一行动的两个输入（59，即推荐理由里「共用前提」的依据）
 * - evidence    同一份证据记录同时引用的节点（14）
 * - support     节点在支持族里依赖的节点（63，含 6 条契约边之外的传递依赖）
 */
export type EdgeFamily = 'contract' | 'relation' | 'topic' | 'pattern' | 'sharedInput' | 'evidence' | 'support';

/**
 * 「族结构边」只覆盖 contract 与 relation 之外的五类。
 * 单独命名是为了让 TypeScript 能按 `source` 判别联合类型——
 * 若这里写 `EdgeFamily`（含全部七个字面量），判别就会失效。
 */
export type FamilySource = 'topic' | 'pattern' | 'sharedInput' | 'evidence' | 'support';

export const EDGE_FAMILY_LABELS: Record<EdgeFamily, string> = {
  contract: '行动契约',
  relation: '登记关系',
  topic: '同一话题',
  pattern: '误区锚点',
  sharedInput: '共用前提',
  evidence: '同一份证据',
  support: '支持族依赖',
};

export const EDGE_FAMILY_NOTES: Record<EdgeFamily, string> = {
  contract: '产出该节点需要哪些输入（前提 → 产出）。按 mode 分档：definition 是定义性前置、deduction 是推导前置，其余（构造 / 方法 / 任务 / 证据 / 表征）是结构骨架。',
  relation: '已登记的语义关系，带种类、见证状态与适用范围。',
  topic: '同属一个聚合话题块。话题允许重叠，不构成必修关系。',
  pattern: '误区模式的节点与它的锚点节点。',
  sharedInput: '同一个行动的两个输入互为共用前提。',
  evidence: '同一份证据记录同时引用的节点。这是「一起被论证」，不是因果。',
  support: '支持族里列出的依赖节点。它比行动契约更宽：除了直接输入，还包含传递依赖。',
};

/**
 * 默认全开。全库 102 节点的实测：五类给 320 条边、平均度 6.27；
 * 七类给 331 条边、平均度 6.49，并把 5 个节点的度数从 1–2 抬到 3 以上。
 * 边源越少网络越稀，稀疏的网络读起来没有信息——所以默认不关。
 */
export const DEFAULT_FAMILIES: EdgeFamily[] = ['contract', 'relation', 'topic', 'pattern', 'sharedInput', 'evidence', 'support'];

export interface ContractEdge {
  source: 'contract';
  id: string;
  from: string;
  to: string;
  actionId: string;
  actionTitle: string;
  mode: string;
}

export interface RelationEdge {
  source: 'relation';
  id: string;
  from: string;
  to: string;
  kind: string;
  witnessStatus: string;
  scope: string | null;
}

/** 其余边源共用一个结构：都属于「同一登记的弱结构边」，用 source 区分。 */
export interface FamilyEdge {
  source: FamilySource;
  id: string;
  from: string;
  to: string;
  /** 依据的可读说明（话题标题 / 模式标题 / 行动标题 / 证据标题 / 用途）。 */
  note: string;
}

export type NetworkEdge = ContractEdge | RelationEdge | FamilyEdge;

export type ReasonKind = 'ready' | 'relation' | 'shares-input' | 'thread' | 'same-topic' | 'pattern' | 'background';

export interface Recommendation {
  node: string;
  title: string;
  kind: ReasonKind;
  /** 结构化依据；用于渲染，也便于测试断言理由不是自由编造的。 */
  evidence: {
    actionId?: string;
    actionTitle?: string;
    relationId?: string;
    relationKind?: string;
    witnessStatus?: string;
    /** 已经加入网络、并且与候选节点有登记连接的节点。 */
    via: string[];
    /** 尚未满足的输入节点（仅 `ready` 以外的契约类理由可能出现）。 */
    missing?: string[];
    scope?: string | null;
    aggregateTitle?: string;
    patternTitle?: string;
    inputs?: string[];
  };
}

export interface PlacedNode {
  id: string;
  title: string;
  /** 布局层（列）。未连接的节点为 null。 */
  column: number | null;
  row: number;
  x: number;
  y: number;
  connected: boolean;
}

export interface NetworkLayout {
  placed: PlacedNode[];
  width: number;
  height: number;
  /** 无法与当前网络建立任何登记连接的节点。 */
  isolated: string[];
  maxColumn: number;
  maxRow: number;
}

export const NODE_W = 172;
export const NODE_H = 58;
/**
 * 相机补间时长（毫秒）与顶部 HUD 预留高度（像素）。
 *
 * 2026-10 提出常量（TODO B 的登记表要核对）：补间 460ms + ease-out cubic，
 * 居中时顶部留出 HUD 的高度（64px），免得卡片压在 HUD 底下。
 * 提出来的原因与其它设计取值一样：留在 `.tsx` 里 node 侧没法核对。
 */
export const CAMERA_TWEEN_MS = 460;
/** 居中 / 适配视图时，顶部为 HUD 预留的高度。 */
export const CAMERA_HUD_SPACE = 64;
const GAP_X = 96;
const GAP_Y = 34;
const MARGIN = 28;

function actionById(actions: NetworkAction[]): Map<string, NetworkAction> {
  return new Map(actions.map((action) => [action.id, action]));
}

function titlesOf(nodes: NodeSummary[]): Map<string, string> {
  return new Map(nodes.map((node) => [node.id, node.title]));
}

/**
 * 契约边：对每个行动取 输入 × 输出 的笛卡尔积，只保留两端都已加入的。
 * 与 /graph 的「显示行动端点」保持同一套语义，避免两个页面对同一份数据给出不同读法。
 */
export function contractEdges(actions: NetworkAction[], added: Set<string>): ContractEdge[] {
  const edges: ContractEdge[] = [];
  for (const action of actions) {
    for (const input of action.inputs) {
      if (!added.has(input.node)) continue;
      for (const output of action.outputs) {
        if (!added.has(output.node)) continue;
        edges.push({
          source: 'contract',
          id: `ct-${action.id}-${input.node}-${output.node}`,
          from: input.node,
          to: output.node,
          actionId: action.id,
          actionTitle: action.title,
          mode: action.mode,
        });
      }
    }
  }
  return edges.sort((a, b) => a.id.localeCompare(b.id, 'en'));
}

export function relationEdges(relations: NetworkRelation[], added: Set<string>): RelationEdge[] {
  return relations
    .filter((relation) => added.has(relation.from) && added.has(relation.to))
    .map((relation) => ({
      source: 'relation' as const,
      id: relation.id,
      from: relation.from,
      to: relation.to,
      kind: relation.kind,
      witnessStatus: relation.witness.status,
      scope: relation.scope ?? null,
    }))
    .sort((a, b) => a.id.localeCompare(b.id, 'en'));
}

/** 把无序对折成稳定的 id，避免同一对节点因方向不同画两条线。 */
function pairId(family: EdgeFamily, a: string, b: string): string {
  const [x, y] = a < b ? [a, b] : [b, a];
  return `${family}:${x}~${y}`;
}

function dedupePairs(pairs: Array<{ from: string; to: string; note: string; family: FamilySource }>): FamilyEdge[] {
  const seen = new Map<string, FamilyEdge>();
  for (const pair of pairs) {
    if (pair.from === pair.to) continue;
    const id = pairId(pair.family, pair.from, pair.to);
    if (seen.has(id)) continue;
    seen.set(id, { source: pair.family, id, from: pair.from, to: pair.to, note: pair.note });
  }
  return [...seen.values()].sort((a, b) => a.id.localeCompare(b.id, 'en'));
}

/** 话题聚合：同一块内的成员两两相连。 */
function topicEdges(graph: NetworkGraph, added: Set<string>): FamilyEdge[] {
  const pairs: Array<{ from: string; to: string; note: string; family: FamilySource }> = [];
  for (const aggregate of graph.aggregates ?? []) {
    for (const block of aggregate.blocks) {
      const members = block.filter((id) => added.has(id));
      for (const from of members) for (const to of members) {
        pairs.push({ from, to, note: aggregate.title, family: 'topic' });
      }
    }
  }
  return dedupePairs(pairs);
}

/** 误区模式：模式节点与它的锚点两两相连。 */
function patternEdges(graph: NetworkGraph, added: Set<string>): FamilyEdge[] {
  const pairs: Array<{ from: string; to: string; note: string; family: FamilySource }> = [];
  for (const pattern of graph.patterns ?? []) {
    const members = [pattern.node, ...(pattern.anchors ?? [])].filter((id) => added.has(id));
    for (const from of members) for (const to of members) {
      pairs.push({ from, to, note: pattern.title, family: 'pattern' });
    }
  }
  return dedupePairs(pairs);
}

/** 共用前提：同一行动的两个输入互为共用前提。 */
function sharedInputEdges(graph: NetworkGraph, added: Set<string>): FamilyEdge[] {
  const pairs: Array<{ from: string; to: string; note: string; family: FamilySource }> = [];
  for (const action of graph.actions) {
    const inputs = [...new Set(action.inputs.map((input) => input.node))].filter((id) => added.has(id));
    for (const from of inputs) for (const to of inputs) {
      pairs.push({ from, to, note: action.title, family: 'sharedInput' });
    }
  }
  return dedupePairs(pairs);
}

/** 同一份证据：证据记录同时引用的节点两两相连。 */
function evidenceEdges(graph: NetworkGraph, added: Set<string>): FamilyEdge[] {
  const pairs: Array<{ from: string; to: string; note: string; family: FamilySource }> = [];
  for (const record of graph.evidence ?? []) {
    const members = [...new Set(record.nodes ?? [])].filter((id) => added.has(id));
    for (const from of members) for (const to of members) {
      pairs.push({ from, to, note: record.id, family: 'evidence' });
    }
  }
  return dedupePairs(pairs);
}

/**
 * 支持族依赖：节点 ↔ 它在支持集合里列出的依赖节点。
 *
 * 与「共用前提」不同：共用前提只连同一个行动的两个输入，这里连的是支持族登记的全部依赖，
 * 因此包含传递依赖（例如 bg:real:metric → limit:bridge 不经过直接行动输入）。
 * 只连已加入的节点，避免把还没进入网络的节点画出来。
 */
function supportEdges(graph: NetworkGraph, added: Set<string>): FamilyEdge[] {
  const pairs: Array<{ from: string; to: string; note: string; family: FamilySource }> = [];
  for (const record of graph.support ?? []) {
    if (!added.has(record.node)) continue;
    if (!Array.isArray(record.set)) continue;
    for (const dependency of record.set) {
      if (!added.has(dependency)) continue;
      pairs.push({ from: record.node, to: dependency, note: record.use, family: 'support' });
    }
  }
  return dedupePairs(pairs);
}

const FAMILY_BUILDERS: Record<FamilySource, (graph: NetworkGraph, added: Set<string>) => FamilyEdge[]> = {
  topic: topicEdges,
  pattern: patternEdges,
  sharedInput: sharedInputEdges,
  evidence: evidenceEdges,
  support: supportEdges,
};

export function buildEdges(graph: NetworkGraph, added: Set<string>, families: EdgeFamily[] = DEFAULT_FAMILIES): NetworkEdge[] {
  const enabled = new Set(families);
  const edges: NetworkEdge[] = [];
  if (enabled.has('contract')) edges.push(...contractEdges(graph.actions, added));
  if (enabled.has('relation')) edges.push(...relationEdges(graph.relations, added));
  for (const [family, build] of Object.entries(FAMILY_BUILDERS)) {
    if (!enabled.has(family as EdgeFamily)) continue;
    edges.push(...build(graph, added));
  }
  return edges;
}

/** 每个节点的连接数：用于在网络里如实标注「这个点连了几条边」。 */
export function degreeMap(edges: NetworkEdge[]): Map<string, number> {
  const degree = new Map<string, number>();
  for (const edge of edges) {
    if (edge.from !== edge.to) {
      degree.set(edge.from, (degree.get(edge.from) ?? 0) + 1);
      degree.set(edge.to, (degree.get(edge.to) ?? 0) + 1);
    }
  }
  return degree;
}

/**
 * 一条边的**视觉权重**（与画布上的线宽、颜色、吸力同一把尺子）。
 *
 * 契约边必须把 `mode` 传进去：`definition`（0.9）与 `task`（0.17）差五倍，
 * 漏掉 mode 会把所有契约压成同一个数——`attractionOf` 早先就是这样，
 * 于是「按逻辑强弱分配吸力」对契约一侧是假的（线画得很粗、吸力却和任务输入一样）。
 * 现在两处都走这个函数，就不会再各算一套。
 */
export function visualWeightOf(edge: NetworkEdge): number {
  if (edge.source === 'relation') {
    return edgeVisual('relation', edge.kind, edge.witnessStatus ?? null, '#000000').weight;
  }
  if (edge.source === 'contract') {
    return edgeVisual('contract', null, null, '#000000', edge.mode).weight;
  }
  return edgeVisual(edge.source, null, null, '#000000').weight;
}

/** 边源家族的优先级：同权重时语义断言优先于结构骨架（用于合并时的稳定排序）。 */
const SOURCE_RANK: Record<NetworkEdge['source'], number> = {
  relation: 0, contract: 1, sharedInput: 2, support: 3, evidence: 4, pattern: 5, topic: 6,
};

/** 合并后的边：留下的那条 + 被它代表的弱边。 */
export interface MergedEdge {
  edge: NetworkEdge;
  /** 同一对节点之间被合并掉的边（越弱的越靠后）。空数组表示这条边上没有别的同对边。 */
  merged: NetworkEdge[];
}

/**
 * 同一对节点之间**只画最强的一条**（2026-10 加，TODO A2-14）。
 *
 * 背景（第二十九轮报的问题）：本体里同一对节点常同时有「行动契约」与「登记关系」，
 * 画出来就是两条线叠在一起（例如 `拓扑空间 → 流形` 既有 definition 契约又有 hardPrereq），
 * 读者看不出那是两种关系还是画重了。第四十二轮补了 103 条硬前置之后，同对边只会更多。
 *
 * 规则（可核对、可复现）：
 * 1. 按**无序对**分组（A→B 与 B→A 算同一对）；
 * 2. 组内保留**视觉权重最大**的那条——越硬的关系越该被看见；
 * 3. 权重相同看边源：`relation` > `contract` > 族边（语义断言优先于结构骨架）；
 * 4. 再相同按 `id` 字典序（结果确定，不依赖输入顺序）；
 * 5. 其余边不丢，进 `merged`，由界面在标签与提示里如实标注条数与内容。
 *
 * 注意这里只管**画**：布局的吸力、度数统计与推荐理由仍读完整边集，
 * 否则「合并显示」会悄悄改变图的形状与推荐顺序。
 */
export function mergeParallelEdges(edges: NetworkEdge[]): MergedEdge[] {
  const groups = new Map<string, NetworkEdge[]>();
  for (const edge of edges) {
    const key = [edge.from, edge.to].sort().join('~');
    groups.set(key, [...(groups.get(key) ?? []), edge]);
  }
  const rank = (edge: NetworkEdge) => visualWeightOf(edge);
  const result: MergedEdge[] = [];
  for (const group of groups.values()) {
    const sorted = [...group].sort((left, right) => (
      rank(right) - rank(left)
      || SOURCE_RANK[left.source] - SOURCE_RANK[right.source]
      || left.id.localeCompare(right.id, 'en')
    ));
    result.push({ edge: sorted[0], merged: sorted.slice(1) });
  }
  // 画序交给调用方（它还要考虑选中态），这里只保证合并结果的顺序确定。
  return result.sort((left, right) => left.edge.id.localeCompare(right.edge.id, 'en'));
}

/** 产出一个节点的全部行动。一个节点可能有多个 OR 候选，这里全部保留。 */
function producersOf(actions: NetworkAction[]): Map<string, NetworkAction[]> {
  const map = new Map<string, NetworkAction[]>();
  for (const action of actions) {
    for (const output of action.outputs) {
      const list = map.get(output.node) ?? [];
      list.push(action);
      map.set(output.node, list);
    }
  }
  return map;
}

/**
 * 一个候选节点相对当前网络的「最强的契约理由」。
 *
 * 只返回能被行动契约解释的候选：要么某个产出行动的全部输入都已加入（ready），
 * 要么与已加入节点共享输入（shares-input）。返回 null 表示契约层面没有话说。
 */
interface ContractReason {
  kind: 'ready' | 'shares-input';
  action: NetworkAction;
  via: string[];
  missing: string[];
}

function contractReasonFor(nodeId: string, added: Set<string>, producers: Map<string, NetworkAction[]>): ContractReason | null {
  const candidates = producers.get(nodeId);
  if (!candidates?.length) return null;
  // 优先挑「缺失输入最少」的行动；并列时按 action.id 稳定排序。
  const ranked = [...candidates].sort((a, b) => {
    const missA = a.inputs.filter((input) => !added.has(input.node)).length;
    const missB = b.inputs.filter((input) => !added.has(input.node)).length;
    return missA - missB || a.id.localeCompare(b.id, 'en');
  });
  const best = ranked[0];
  const missing = best.inputs.map((input) => input.node).filter((id) => !added.has(id));
  const via = best.inputs.map((input) => input.node).filter((id) => added.has(id));
  if (missing.length === 0) {
    return { kind: 'ready', action: best, via, missing };
  }
  if (via.length > 0) {
    return { kind: 'shares-input', action: best, via, missing };
  }
  return null;
}

/** 与已加入节点之间的已登记关系。 */
function relationReasonsFor(nodeId: string, added: Set<string>, relations: NetworkRelation[]): Array<{ relation: NetworkRelation; via: string }> {
  const found: Array<{ relation: NetworkRelation; via: string }> = [];
  for (const relation of relations) {
    if (relation.to === nodeId && added.has(relation.from)) found.push({ relation, via: relation.from });
    else if (relation.from === nodeId && added.has(relation.to)) found.push({ relation, via: relation.to });
  }
  // PROOF 见证优先，其余按 id 稳定排序。
  return found.sort((a, b) => {
    const proofA = a.relation.witness.status === 'PROOF' ? 0 : 1;
    const proofB = b.relation.witness.status === 'PROOF' ? 0 : 1;
    return proofA - proofB || a.relation.id.localeCompare(b.relation.id, 'en');
  });
}

const REASON_ORDER: Record<ReasonKind, number> = {
  ready: 0,
  relation: 1,
  'shares-input': 2,
  thread: 3,
  background: 4,
  'same-topic': 5,
  pattern: 6,
};

/**
 * 线索层（2026-10 加）：`granularity === 'topic'` 的条目是**一条学习线索的名字**
 * （一节或一章的范围），不是可独立认知的单元。
 *
 * 它在网络里的身份与单元不同——**不参与前置计算**：
 * - 「推荐加入」不把话题当作「图中前提已加入」的可学单元（那是单元之间的话）；
 * - 长按取强关联时，话题候选以「线索」列出，而不是以「引入它的前提」列出（见 node-related.ts）。
 *
 * 它仍然是网络里的一个节点：有关系、有契约、也会被布局与配色处理——这里改的是**读法**，
 * 不是把话题藏起来（藏起来就变成「看不见的欠账」）。
 */
export const THREAD_LAYER = {
  id: 'thread',
  label: '线索层',
  note: '话题级条目（一节或一章的范围）：它们是学习线索的名字，不是可独立认知的单元，因此不参与前置计算。',
} as const;

export function isThreadNode(node: { granularity?: string } | null | undefined): boolean {
  return node?.granularity === 'topic';
}

/**
 * 推荐加入的节点。
 *
 * 空网络时给出「起点」推荐：背景节点没有任何行动能产出它们（实测 0 / 9 个可被产出），
 * 只能由学习者先确认，因此它们是真正的最小起点。
 */
export function recommend(graph: NetworkGraph, added: Set<string>, limit = 24, families: EdgeFamily[] = DEFAULT_FAMILIES): Recommendation[] {
  const nodes = graph.nodes.filter((node) => !added.has(node.id));
  const producers = producersOf(graph.actions);
  const recommendations: Recommendation[] = [];

  for (const node of nodes) {
    const relationHits = relationReasonsFor(node.id, added, graph.relations);
    const contract = added.size > 0 ? contractReasonFor(node.id, added, producers) : null;

    // 空网络（冷启动）：只推荐背景节点。
    if (added.size === 0) {
      if (node.case !== 'background') continue;
      recommendations.push({
        node: node.id,
        title: node.title,
        kind: 'background',
        evidence: {
          via: [],
          scope: null,
          actionId: undefined,
        },
      });
      continue;
    }

    // 1) 图中前提已加入 —— 最强理由，且直接可操作。措辞刻意不含「掌握」：
    //    「都在网络里」说的是这张图，不是学习者已经会了。
    //    话题级条目不走这一档：它不是可独立认知的单元，谈不上「前提已加入」（见 THREAD_LAYER）。
    if (!isThreadNode(node) && contract?.kind === 'ready') {
      recommendations.push({
        node: node.id,
        title: node.title,
        kind: 'ready',
        evidence: {
          actionId: contract.action.id,
          actionTitle: contract.action.title,
          via: contract.via,
          inputs: contract.action.inputs.map((input) => input.node),
        },
      });
      continue;
    }

    // 2) 已登记关系 —— 带种类、见证强度与 scope 原文。
    if (relationHits.length > 0) {
      const best = relationHits[0];
      recommendations.push({
        node: node.id,
        title: node.title,
        kind: 'relation',
        evidence: {
          relationId: best.relation.id,
          relationKind: best.relation.kind,
          witnessStatus: best.relation.witness.status,
          via: [...new Set(relationHits.map((hit) => hit.via))].sort(),
          scope: best.relation.scope ?? null,
        },
      });
      continue;
    }

    // 3) 与已加入节点共用输入。同样只对单元说：话题没有「共用前提」这回事。
    if (!isThreadNode(node) && contract?.kind === 'shares-input') {
      recommendations.push({
        node: node.id,
        title: node.title,
        kind: 'shares-input',
        evidence: {
          actionId: contract.action.id,
          actionTitle: contract.action.title,
          via: contract.via,
          missing: contract.missing,
          inputs: contract.action.inputs.map((input) => input.node),
        },
      });
      continue;
    }

    // 话题级条目不在这里下结论：先看它有没有聚合块或误区锚点这类**已登记的结构联系**
    // （那些比「它是一条线索」更有信息量），都没有时再由末尾的线索分支兜底。
    // 不变的一条：话题**不走**上面两档「前提」的理由。

    // 4) 同属一个话题聚合块。
    const topic = (graph.aggregates ?? []).find((aggregate) =>
      aggregate.blocks.some((block) => block.includes(node.id) && block.some((id) => added.has(id))));
    if (topic) {
      const via = topic.blocks.flat().filter((id) => added.has(id)).sort();
      recommendations.push({
        node: node.id,
        title: node.title,
        kind: 'same-topic',
        evidence: { via: [...new Set(via)], aggregateTitle: topic.title, scope: null },
      });
      continue;
    }

    // 5) 误区模式的锚点，且该模式的其它锚点已加入。
    const pattern = (graph.patterns ?? []).find((item) =>
      (item.node === node.id || (item.anchors ?? []).includes(node.id))
      && [...(item.anchors ?? []), item.node].some((id) => id !== node.id && added.has(id)));
    if (pattern) {
      const via = [...new Set([...(pattern.anchors ?? []), pattern.node].filter((id) => id !== node.id && added.has(id)))].sort();
      recommendations.push({
        node: node.id,
        title: node.title,
        kind: 'pattern',
        evidence: { via, patternTitle: pattern.title, scope: null },
      });
      continue;
    }

    /*
     * 6) 线索兜底：话题级条目在没有别的依据时，作为**线索**列出，并说明它不参与前置计算。
     *
     * 放在最后是刻意的：聚合块、误区锚点、登记关系都是**已登记的结构联系**，
     * 比「它是一条线索」更有信息量，能说就说。唯一被挡在前面的是上面两档「前提」的理由——
     * 一条线索谈不上「图中前提已加入」或「共用前提」（见 THREAD_LAYER）。
     */
    if (isThreadNode(node)) {
      recommendations.push({
        node: node.id,
        title: node.title,
        kind: 'thread',
        evidence: { via: [], scope: THREAD_LAYER.note },
      });
      continue;
    }
  }

  // 排序：理由优先级 → 关联数降序 → 节点 id 升序。完全确定，无随机。
  const links = new Map<string, number>();
  for (const edge of buildEdges(graph, added, families)) {
    for (const id of [edge.from, edge.to]) {
      if (added.has(id)) continue;
      links.set(id, (links.get(id) ?? 0) + 1);
    }
  }
  recommendations.sort((a, b) =>
    REASON_ORDER[a.kind] - REASON_ORDER[b.kind]
    || (links.get(b.node) ?? 0) - (links.get(a.node) ?? 0)
    || a.node.localeCompare(b.node, 'en'));

  return recommendations.slice(0, limit);
}

/*
 * 节点类别的划分搬到了 `node-groups.ts`：那是只依赖类型的叶子模块。
 * 本文件现在（2026-10）也带 `.ts` 扩展名 import 依赖，因此 **node 可以直接 import 做单元测试**
 * ——线索层那套读法（推荐理由里的话题处理）就是这样被 `tests/thread-layer.test.mjs` 钉住的。
 * 这里既本地使用（自动加入判据），也转出给调用方。
 */
import { groupOfNode } from './node-groups.ts';
export { NODE_GROUP_LABELS, NODE_GROUP_NOTES, NODE_GROUP_ORDER, groupOfNode } from './node-groups.ts';
export type { NodeGroup } from './node-groups.ts';

/** 自动加入的判定结果：某个局部技巧为什么被自动加进视图。 */
export interface AutoAddedNode {
  node: string;
  title: string;
  /** 依据：命中了哪一条判据。 */
  rule: 'total-links' | 'view-links';
  /** 该判据对应的连接数。 */
  links: number;
  /** 在本体内与它相连的节点总数。 */
  totalLinks: number;
  /** 其中已经在视图里的那些（即「视图内连接」）。 */
  inView: number;
  /** 视图内连接的对方节点 id，按升序。 */
  via: string[];
}

/**
 * 一个节点的「直接邻域」：在当前启用的边源下与它相连的节点集合。
 *
 * 用全库作为 `added` 来算，因此它衡量的是「这个节点在本体里能接到谁」，
 * 与当前视图无关。用于自动加入规则与提示文案。
 */
export function neighbourhoodOf(graph: NetworkGraph, families: EdgeFamily[] = DEFAULT_FAMILIES): Map<string, Set<string>> {
  const all = new Set(graph.nodes.map((node) => node.id));
  const neighbours = new Map<string, Set<string>>();
  for (const id of all) neighbours.set(id, new Set());
  for (const edge of buildEdges(graph, all, families)) {
    if (edge.from === edge.to) continue;
    neighbours.get(edge.from)?.add(edge.to);
    neighbours.get(edge.to)?.add(edge.from);
  }
  return neighbours;
}

/**
 * 「局部技巧」的自动加入规则。
 *
 * 规则（用户指定）：**一个局部技巧类方法节点能与视图建立超过三条链接时，自动加入视图。**
 *
 * 「能与视图建立链接」= 它的直接邻域 ∩ （视图 ∪ 视图的直接邻域）的元素个数 > `threshold`。
 *
 * 为什么是「视图 ∪ 视图的邻域」而不是「只有视图」：方法节点在设计上**不直接连到它要用的
 * 概念上**，它连的是引入它的那个行动契约（以及它的演示与适用对象）。因此只数视图内的
 * 直接连接，任何方法都几乎触发不了——实测一个 5 节点视图、一个 4 节点视图、
 * 一个单节点视图，三种情况方法都是 0 个。把视图的一跳邻域算进去，
 * 「视图里已经攒够了这个方法要用的东西」这句话才落到实处。
 *
 * 为什么不是「全库邻域 > 3」：那样等于无条件加入——先按这版实现时，
 * 往空视图里放**一个**无关背景节点就自动拉进了 **11 个**方法。
 *
 * 只作用于 LocalMethod：全局方法是跨场景策略，与具体节点之间天然缺少可枚举的连接。
 * 结果确定：按链接数降序、节点 id 升序。
 */
export function autoAddCandidates(
  graph: NetworkGraph,
  added: Set<string>,
  families: EdgeFamily[] = DEFAULT_FAMILIES,
  threshold = 3,
): AutoAddedNode[] {
  if (added.size === 0) return [];
  const neighbours = neighbourhoodOf(graph, families);
  // 可达集合 = 视图本身 ∪ 视图的一跳邻域。
  const reachable = new Set<string>(added);
  for (const id of added) for (const other of neighbours.get(id) ?? []) reachable.add(other);

  const result: AutoAddedNode[] = [];
  for (const node of graph.nodes) {
    if (added.has(node.id)) continue;
    if (groupOfNode(node) !== 'method-local') continue;
    const direct = neighbours.get(node.id) ?? new Set<string>();
    const via = [...direct].filter((id) => reachable.has(id)).sort((a, b) => a.localeCompare(b, 'en'));
    const inView = [...direct].filter((id) => added.has(id)).length;
    if (via.length <= threshold) continue;
    result.push({
      node: node.id,
      title: node.title,
      rule: 'view-links',
      links: via.length,
      totalLinks: direct.size,
      inView,
      via,
    });
  }
  return result.sort((a, b) => b.links - a.links || a.node.localeCompare(b.node, 'en'));
}

/** 把推荐理由渲染成一句中文；每个分支都指向具体依据，不写空话。 */
export function reasonText(rec: Recommendation, titleOf: (id: string) => string): string {
  const viaTitles = rec.evidence.via.map(titleOf);
  switch (rec.kind) {
    case 'background':
      return '背景节点：没有任何行动能产出它，需要先由你确认。';
    case 'ready':
      return `图中前提已加入：行动「${rec.evidence.actionTitle}」的全部输入${viaTitles.length ? `（${viaTitles.join('、')}）` : ''}都在网络里。这只说明当前视图已经具备条件，不代表你已经掌握它们。`;
    case 'relation': {
      const kind = relationLabel(rec.evidence.relationKind ?? '');
      const witness = rec.evidence.witnessStatus ? `，见证状态 ${rec.evidence.witnessStatus}` : '';
      const scope = rec.evidence.scope ? `。适用范围：${rec.evidence.scope}` : '';
      return `${viaTitles.join('、')} 与它登记了「${kind}」关系${witness}${scope}`;
    }
    case 'shares-input':
      return `与 ${viaTitles.join('、')} 共用前提；行动「${rec.evidence.actionTitle}」还缺 ${(rec.evidence.missing ?? []).map(titleOf).join('、')}。`;
    case 'same-topic':
      return `与 ${viaTitles.join('、')} 同属话题「${rec.evidence.aggregateTitle}」。话题块允许重叠，不构成必修关系。`;
    case 'pattern':
      return `误区模式「${rec.evidence.patternTitle}」的锚点之一；相关锚点 ${viaTitles.join('、')} 已在网络里。`;
    default:
      return '';
  }
}

/**
 * 确定性力导向布局。
 *
 * 为什么不是分层（BFS 列）布局：实测数据里网络是**星形主导**的——例如「同胚」的 38 条连接里
 * 大半直接连到「拓扑空间」这个枢纽。分层布局在这种结构下会把每个节点各推进一列：
 * 枢纽在第 1 列、其余 10 个邻居挤在第 2 列堆成一条竖直长条，看起来就是「一条链」。
 * 分层适合树，不适合枢纽图。
 *
 * 因此改用弹簧模型，并且完全去掉随机性：
 * 1. **初值确定**：节点按 id 排序后沿阿基米德螺线放置，同样的集合必得同样的初值。
 * 2. **迭代确定**：固定轮数、固定参数、没有 Math.random。
 * 3. **包含边属性的弹簧强度**：契约边最硬，PROOF 关系次之，族结构边最软——
 *    与推荐理由、边源优先级一致，因此「为什么推荐它」和「它画在谁旁边」不矛盾。
 *
 * 结果对同一 `addedIds + families` 完全可复现。
 */
export function layout(graph: NetworkGraph, added: Set<string>, families: EdgeFamily[] = DEFAULT_FAMILIES): NetworkLayout {
  const ids = [...added].filter((id) => graph.nodes.some((node) => node.id === id)).sort((a, b) => a.localeCompare(b, 'en'));
  if (ids.length === 0) return { placed: [], width: 0, height: 0, isolated: [], maxColumn: -1, maxRow: -1 };

  const titles = titlesOf(graph.nodes);
  const edges = buildEdges(graph, added, families);

  // 度数用于判定「真正零连接」与力参数。
  const neighbors = new Map<string, Set<string>>();
  for (const id of ids) neighbors.set(id, new Set());
  for (const edge of edges) {
    if (edge.from === edge.to) continue;
    neighbors.get(edge.from)?.add(edge.to);
    neighbors.get(edge.to)?.add(edge.from);
  }
  const trulyIsolated = ids.filter((id) => (neighbors.get(id)?.size ?? 0) === 0);

  // 1) 确定性初值：阿基米德螺线，先放度数高的，让枢纽落在中心附近。
  const center = 0;
  const positions = new Map<string, { x: number; y: number }>();
  const ordered = [...ids].sort((a, b) =>
    (neighbors.get(b)?.size ?? 0) - (neighbors.get(a)?.size ?? 0) || a.localeCompare(b, 'en'));
  const golden = Math.PI * (3 - Math.sqrt(5)); // 黄金角，避免初值共线
  ordered.forEach((id, index) => {
    const radius = 46 * Math.sqrt(index + 1);
    const angle = index * golden;
    positions.set(id, { x: center + radius * Math.cos(angle), y: center + radius * Math.sin(angle) });
  });

  // 2) 弹簧迭代。斥力把节点推开，吸力按**关系强弱**把相关的节点拉近。
  //
  //    常数按「让边长稳定在两三百像素」定标：太小会把节点挤成一团
  //    （实测过 12 个节点全落在 190×100 的方块里），太大则连边被拉成蛛网。
  const K = 260;              // 理想边长
  const ITERATIONS = 600;
  const REPULSION = K * K * 4.2;
  const temperatureAt = (step: number) => Math.max(2, 70 * (1 - step / ITERATIONS));

  /*
   * 热循环用**类型化数组**（2026-10 优化，TODO A5-37）。
   *
   * 实测：232 个节点 × 600 次迭代 × 每次两两斥力 ≈ 1600 万次内层计算。
   * 原来每次都要 `Map.get(id)` 取位置与位移（字符串哈希 + 每步新建对象），
   * 单次 `layout()` 要 1.47 秒——在浏览器里表现为一个 **1.1 秒的长任务**（数字见 VALIDATION 第五十七轮）。
   *
   * 改法**不动数学**：迭代顺序、位移公式、温度衰减全部保持原样，只做两件等价的事：
   * 1. 用按序号索引的 `Float64Array` 取代 `Map`（取数从哈希表换成数组下标，且不再每步分配对象）；
   * 2. 把每条边的吸力**预先算一次**——`attractionOf(edge)` 只依赖边的权重，与迭代无关，
   *    原先却在每个 step 里对 545 条边重算（约 32 万次调用）。
   * 浮点运算的顺序一字未改，因此结果与优化前相同（回归用的交叉数/边长照旧）。
   */
  const count = ids.length;
  const indexOfNode = new Map<string, number>();
  const posX = new Float64Array(count);
  const posY = new Float64Array(count);
  const moveX = new Float64Array(count);
  const moveY = new Float64Array(count);
  const hubWeight = new Float64Array(count);
  ids.forEach((id, at) => {
    const position = positions.get(id)!;
    posX[at] = position.x;
    posY[at] = position.y;
    hubWeight[at] = 1 + Math.min(neighbors.get(id)?.size ?? 0, 12) * 0.12;
    indexOfNode.set(id, at);
  });
  // 吸力与迭代无关：每条边只算一次（原来每个 step 都算）。
  const springs: Array<{ a: number; b: number; pull: number }> = [];
  for (const edge of edges) {
    if (edge.from === edge.to) continue;
    const a = indexOfNode.get(edge.from);
    const b = indexOfNode.get(edge.to);
    if (a === undefined || b === undefined) continue;
    springs.push({ a, b, pull: attractionOf(edge) });
  }

  for (let step = 0; step < ITERATIONS; step += 1) {
    moveX.fill(0);
    moveY.fill(0);

    // 斥力：所有节点两两相斥。节点规模在百级，O(n²) 足够快。
    //
    // 除了点数，还按**度数**加权：枢纽节点（连接多的）斥得更远，
    // 否则它们会把一圈邻居压在身边，局部密集到读不出来。
    //
    // 距离用 `Math.sqrt(dx*dx + dy*dy)` 而不是 `Math.hypot(dx, dy)`（2026-10，TODO A5-37）：
    // hypot 为了防溢出要做缩放与分支，在这个热循环里慢 3 倍多（实测 531ms → 162ms）。
    // 本处的坐标量级是 1e2–1e4，平方不会溢出，因此 sqrt 等价且更快。
    // 注意：这不是「逐位相同」的替换——力导向是混沌系统，最后一位的差别会被放大成
    // 另一个同样合法的局部最优，所以留档的交叉数/边长跟着更新了（见 VALIDATION 第五十七轮）。
    for (let i = 0; i < count; i += 1) {
      const xi = posX[i];
      const yi = posY[i];
      const weightA = hubWeight[i];
      for (let j = i + 1; j < count; j += 1) {
        const dx = xi - posX[j];
        const dy = yi - posY[j];
        // 距离下限防止两点重合时斥力发散，也让结果稳定。
        const distance = Math.max(Math.sqrt(dx * dx + dy * dy), NODE_W * 0.35);
        const force = (REPULSION / (distance * distance)) * Math.max(weightA, hubWeight[j]);
        const fx = (dx / distance) * force;
        const fy = (dy / distance) * force;
        moveX[i] += fx;
        moveY[i] += fy;
        moveX[j] -= fx;
        moveY[j] -= fy;
      }
    }

    // 引力：每条边把两端拉近，强度取自 `edgeVisual` 的权重。
    //
    // 这就是「按逻辑强弱分配吸力」：硬关系（hardPrereq/PROOF）吸得最紧，
    // 结构与话题类边几乎不吸。用同一张权重表，因此画布上的粗细、颜色、
    // 推荐理由的强弱顺序和这里的吸引强度**出自同一个数**，不会互相矛盾。
    for (const spring of springs) {
      const dx = posX[spring.b] - posX[spring.a];
      const dy = posY[spring.b] - posY[spring.a];
      const distance = Math.max(Math.sqrt(dx * dx + dy * dy), 0.01);
      const force = (distance * distance) / K * spring.pull;
      const fx = (dx / distance) * force;
      const fy = (dy / distance) * force;
      moveX[spring.a] += fx;
      moveY[spring.a] += fy;
      moveX[spring.b] -= fx;
      moveY[spring.b] -= fy;
    }

    const temperature = temperatureAt(step);
    for (let i = 0; i < count; i += 1) {
      const mx = moveX[i];
      const my = moveY[i];
      const length = Math.max(Math.sqrt(mx * mx + my * my), 0.001);
      const limited = Math.min(length, temperature) / length;
      posX[i] += mx * limited;
      posY[i] += my * limited;
    }
  }
  // 写回 Map：后面的归一化、消解重叠与调用方都按 `positions` 取。
  ids.forEach((id, at) => {
    const position = positions.get(id)!;
    position.x = posX[at];
    position.y = posY[at];
  });


  // 3) 归一化到与节点数相称的尺寸，然后**消解重叠**。
  //
  // 为什么需要归一化：力导向的绝对尺度由斥力常数决定，与节点数无关。实测两个节点
  // 会被拉开到 914×427（四个方向全是空白），而 112 个节点又摊到 5147×6281。
  // 按节点数算一个目标面积、整体等比缩放，尺度就稳定了。
  //
  // `relaxToSpacing` 是这一步的唯一权威：力导向只管「谁靠近谁」，
  // 「卡片不许压在一起」由它保证。两件事分开，避免一处各修一半、互相破坏。
  const xs = ids.map((id) => positions.get(id)!.x);
  const ys = ids.map((id) => positions.get(id)!.y);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  const spanX = Math.max(Math.max(...xs) - minX, 1);
  const spanY = Math.max(Math.max(...ys) - minY, 1);

  // 目标面积：每个节点占一个「卡片 + 间距」的格子，再乘留白系数。
  const cellArea = (NODE_W + 40) * (NODE_H + 34) * 1.35;
  const targetArea = cellArea * ids.length;
  const currentArea = spanX * spanY;
  // 限幅：缩得太狠会把图压成一团（再被 relax 撑开，等于白算），放得太开则小图铺满视口。
  const scale = Math.min(Math.max(Math.sqrt(targetArea / currentArea), 0.05), 1.6);

  const relaxed = relaxToSpacing(
    ids.map((id) => {
      const position = positions.get(id)!;
      return {
        id,
        x: MARGIN + (position.x - minX) * scale,
        y: MARGIN + (position.y - minY) * scale,
      };
    }),
  );
  const relaxedById = new Map(relaxed.map((point) => [point.id, point]));

  const isolatedSet = new Set(trulyIsolated);
  const placed: PlacedNode[] = ids.map((id) => {
    const point = relaxedById.get(id)!;
    return {
      id,
      title: titles.get(id) ?? id,
      // 分层语义已不适用；保留 column/row 供调试与可访问性，取整后的稀疏网格坐标。
      column: Math.round(point.x / (NODE_W + GAP_X)),
      row: Math.round(point.y / (NODE_H + GAP_Y)),
      x: point.x,
      y: point.y,
      connected: !isolatedSet.has(id),
    };
  });

  const maxX = Math.max(...placed.map((node) => node.x));
  const maxY = Math.max(...placed.map((node) => node.y));
  const columns = placed.map((node) => node.column).filter((value): value is number => typeof value === 'number');
  const rows = placed.map((node) => node.row).filter((value): value is number => typeof value === 'number');
  return {
    placed,
    width: maxX + NODE_W + MARGIN,
    height: maxY + NODE_H + MARGIN,
    isolated: trulyIsolated,
    maxColumn: columns.length ? Math.max(...columns) : -1,
    maxRow: rows.length ? Math.max(...rows) : -1,
  };
}

/**
 * 一条边的**吸引强度**——「按逻辑强弱分配吸力」的落点。
 *
 * 直接取自 `edgeVisual` 的视觉权重：硬关系吸得最紧，结构与话题类边几乎不吸。
 * 用同一张权重表意味着**线宽、颜色、推荐理由的强弱顺序、吸引强度出自同一个数**，
 * 不会出现「画得很粗却几乎不吸」这类自相矛盾。
 *
 * 关系边额外乘一个系数：语义关系是数学断言，比「行动契约」更该把两端拉到一起。
 */
function attractionOf(edge: NetworkEdge): number {
  // 视觉权重（含契约的 mode）→ 吸力系数。加 0.08 的底：最弱的边也不是完全无吸力，
  // 否则同一话题的节点会随机漂开，话题聚类就散了。
  const base = 0.08 + visualWeightOf(edge) * 1.35;
  return edge.source === 'relation' ? base * 1.6 : base;
}

/**
 * 消解重叠：把互相压住的卡片推开到最小间距。
 *
 * 与 `avoidOverlaps`（只移动被拖动的那一个节点）不同，这里**所有节点都可动**——
 * 它是布局的一部分，没有「谁的位置更该被保留」的问题。
 *
 * 为什么不用「沿重叠较小的轴推开」逐对处理：卡片横向 172、纵向 58，
 * 两个轴的代价差三倍，贪心会在两轴之间来回（垂直分开一张就压到第二张）。
 * 这里改成对每次重叠**两轴都动**：各让一半，且沿 |dx|/minDx 与 |dy|/minDy
 * 中**更大**的那个方向让开——位移小、且不会与刚让开的方向打架。
 *
 * 若迭代结束仍有重叠（局部过密），逐轮放大间距重试，保证一定收敛：
 * 间距足够大时任何有限点集都能排开。
 */
function relaxToSpacing(points: Array<{ id: string; x: number; y: number }>): Array<{ id: string; x: number; y: number }> {
  const work = points.map((point) => ({ ...point }));
  if (work.length < 2) return work;

  for (let attempt = 0; attempt < 6; attempt += 1) {
    // 每轮放宽间距：先按刚好不压住试，不行就再放宽。
    const padX = 16 + attempt * 24;
    const padY = 10 + attempt * 18;
    const minDx = NODE_W + padX;
    const minDy = NODE_H + padY;
    let moved = true;
    for (let pass = 0; pass < 60 && moved; pass += 1) {
      moved = false;
      for (let i = 0; i < work.length; i += 1) {
        for (let j = i + 1; j < work.length; j += 1) {
          const a = work[i];
          const b = work[j];
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const gapX = minDx - Math.abs(dx);
          const gapY = minDy - Math.abs(dy);
          if (gapX <= 0 || gapY <= 0) continue;
          moved = true;
          // 沿「相对重叠更小」的轴让开：位移更小。
          const degenerate = Math.abs(dx) < 1 && Math.abs(dy) < 1;
          if (degenerate || gapY / minDy <= gapX / minDx) {
            const shift = (gapY / 2 + 0.25) * (dy >= 0 ? 1 : -1);
            a.y -= shift;
            b.y += shift;
          } else {
            const shift = (gapX / 2 + 0.25) * (dx >= 0 ? 1 : -1);
            a.x -= shift;
            b.x += shift;
          }
        }
      }
    }
    if (!hasOverlap(work, minDx, minDy)) break;
  }

  // 平移到正坐标。
  const minX = Math.min(...work.map((point) => point.x));
  const minY = Math.min(...work.map((point) => point.y));
  return work.map((point) => ({ id: point.id, x: point.x - minX + MARGIN, y: point.y - minY + MARGIN }));
}

function hasOverlap(points: Array<{ x: number; y: number }>, minDx: number, minDy: number): boolean {
  for (let i = 0; i < points.length; i += 1) {
    for (let j = i + 1; j < points.length; j += 1) {
      if (Math.abs(points[i].x - points[j].x) < minDx && Math.abs(points[i].y - points[j].y) < minDy) return true;
    }
  }
  return false;
}

/**
 * 话题配色：按**节点所属话题**自动分组上色。
 *
 * 用色相环上等距取色，且明度压低（做成浅底），这样卡片上的深色文字仍然清楚。
 * 具体话题 → 颜色的映射是「按话题 id 排序后依次取色」，因此：
 * - 同一话题的节点必得同色；
 * - 同一份数据每次得到同样的分配（不依赖遍历顺序）；
 * - 新增话题时会整体重排一次配色——这是可接受的代价，换来的是不需要人工维护调色表。
 */
export const TOPIC_PALETTE = [
  '#e8ecfd', '#e6f4f1', '#fbeee0', '#f0e9fd', '#fdeaf1', '#e9f3e6',
  '#eaeef4', '#f7f0dc', '#e6f0fb', '#f2eaf6',
] as const;

/** 未归入任何话题的节点底色：与「未连接」的暖色区分开，这里用中性浅灰紫。 */
export const TOPIC_NONE_COLOR = '#f2f0f8';

export interface TopicAssignment {
  /** 节点 id → 话题下标（TOPIC_PALETTE 的索引）。 */
  index: Map<string, number>;
  /** 节点 id → 话题标题。 */
  title: Map<string, string>;
  /** 话题标题，按分配顺序。 */
  topics: string[];
}

/**
 * 给每个节点分配一个话题分组。
 *
 * 规则：按话题的 **`blocks` 块**分组而不是整条聚合——dg 的 `agg-dg` 有五个块
 * （机制与切空间 / 紧致与度量 / 切向量 / 微分形式 / 隐函数），把整条聚合当一个话题
 * 会让 30 个节点同色，等于没分组。
 *
 * 一个节点可能同时属于多个块（块之间允许重叠），取**第一个命中的块**；
 * 顺序按「聚合 id → 块序」固定，因此分配是确定的。
 * 只取 `topic` 类型的聚合：`discipline` 粒度过粗（「分析」会把极限与微分几何混在一起）。
 */
export function topicAssignment(graph: NetworkGraph): TopicAssignment {
  const index = new Map<string, number>();
  const title = new Map<string, string>();
  const topics: string[] = [];
  const aggregates = [...(graph.aggregates ?? [])]
    .filter((aggregate) => aggregate.kind === 'topic')
    .sort((a, b) => a.id.localeCompare(b.id, 'en'));

  for (const aggregate of aggregates) {
    aggregate.blocks.forEach((block, blockIndex) => {
      // 块标题：多块聚合用「聚合标题 · 组号」。**不在这里截断**——
      // 截断由界面层做，且界面必须优先保留组号（见 NetworkPage 的 visibleTopics）。
      const label = aggregate.blocks.length > 1 ? `${aggregate.title} · 组${blockIndex + 1}` : aggregate.title;
      const colorIndex = topics.length % TOPIC_PALETTE.length;
      topics.push(label);
      for (const id of block) {
        if (index.has(id)) continue; // 先到先得：块序固定，因此结果确定。
        index.set(id, colorIndex);
        title.set(id, label);
      }
    });
  }
  return { index, title, topics };
}

/** 手动位置覆盖：节点 id → 用户摆放的坐标。拖动节点时写入。 */
export type PositionOverrides = Record<string, { x: number; y: number }>;

/**
 * 把用户手动摆放的位置套用到布局结果上。
 *
 * 为什么需要它：网格布局是**算出来的**，每次重算都会把节点放回算法选定的格子。
 * 想做到 Obsidian 那样「拖到哪就是哪」，就必须把「人放的位置」当成输入，
 * 而不是每次都被算法覆盖。
 *
 * 只覆盖坐标，不改边、不改度数、不改连通性——拖动纯属视图层，
 * 不写公共本体（M），也不写学习者档案（E）。
 */
export function applyOverrides(fitted: NetworkLayout, overrides: PositionOverrides): NetworkLayout {
  const keys = Object.keys(overrides);
  if (keys.length === 0) return fitted;
  let touched = false;
  const placed = fitted.placed.map((node) => {
    const override = overrides[node.id];
    if (!override) return node;
    if (node.x === override.x && node.y === override.y) return node;
    touched = true;
    return { ...node, x: override.x, y: override.y };
  });
  if (!touched) return fitted;
  // 盒子要跟着变，否则拖动后 fitView 的可用区计算会基于过期的边界。
  const maxX = Math.max(...placed.map((node) => node.x));
  const maxY = Math.max(...placed.map((node) => node.y));
  return {
    ...fitted,
    placed,
    width: maxX + NODE_W + MARGIN,
    height: maxY + NODE_H + MARGIN,
  };
}

/**
 * 手动摆放之后消解重叠：只推开**被拖动的那个**节点，不动其他节点。
 *
 * 为什么需要：拖动是自由的，但把卡片停在另一张上面会直接遮住关系——这正是
 * 用户此前抱怨的「节点堆叠导致关系完全不可见」。网格布局构造上不会重叠，
 * 手动摆放会破坏这一点，所以在放手时补一次校正。
 *
 * 只移动被拖动者（而不是把两者都推开）是刻意的：其余节点的位置是算法或用户
 * 先前的决定，不该因为这一次拖动被改动。推开方向取重叠较少的那个轴，
 * 使节点沿最省力的方向让开，位置变化最小。
 */
/**
 * 手动摆放之后消解重叠：只推开**被拖动的那个**节点，不动其他节点。
 *
 * 为什么需要：拖动是自由的，但把卡片停在另一张上面会直接遮住关系——这正是
 * 用户此前抱怨的「节点堆叠导致关系完全不可见」。网格布局构造上不会重叠，
 * 手动摆放会破坏这一点，所以在放手时补一次校正。
 *
 * 只移动被拖动者（而不是把两者都推开）是刻意的：其余节点的位置是算法或用户
 * 先前的决定，不该因为这一次拖动被改动。
 *
 * **算法：以落点为中心的确定性螺线搜索。**
 *
 * 为什么不用「沿重叠较小的轴推开」那种贪心迭代：卡片是横向宽的（172×58），
 * 水平分开要 192、垂直只要 70，两个轴的代价差三倍，贪心会在两轴之间来回——
 * 垂直分开第一张卡就压到第二张，水平推开又回到第一张。实测 40 轮迭代后随机
 * 400 例里残留 506 对重叠。加「兜底再推一次」也不够：被推的节点可能压在第三张上。
 *
 * 螺线搜索有明确边界：从落点出发，按「位移由小到大」枚举候选位置，取第一个
 * 不与任何卡片重叠的。位移半径最多到 40 步 × 76 像素，一定能在有限步内
 * 找到一个空位（节点数有限、画布无界）；找不到就返回 null，让调用方保留落点。
 *
 * 结果确定：候选顺序固定，同输入必得同输出。
 */
export function avoidOverlaps(
  placed: PlacedNode[],
  movedId: string,
  gapX = 20,
  gapY = 12,
): { x: number; y: number } | null {
  const moved = placed.find((node) => node.id === movedId);
  if (!moved) return null;
  const others = placed.filter((node) => node.id !== movedId);
  const clashes = (x: number, y: number) =>
    others.some((other) => Math.abs(x - other.x) < NODE_W + gapX && Math.abs(y - other.y) < NODE_H + gapY);

  if (!clashes(moved.x, moved.y)) return null;

  const minDx = NODE_W + gapX;
  const minDy = NODE_H + gapY;
  // 与落点在水平上会打架的那些卡片（其余水平方向本来就分开了）。
  const horizontalBlockers = others.filter((other) => Math.abs(moved.x - other.x) < minDx);

  if (horizontalBlockers.length > 0) {
    /*
     * 先试**垂直让开**：上下各算一次，取位移小的那个。
     *
     * 为什么要「一次算到让开全部」而不是逐个推开：垂直方向只要离开所有水平相邻的卡片就行，
     * 而 y 坐标只有一个数，所以可以直接取「所有上方候选里最靠上的」或
     * 「所有下方候选里最靠下的」。逐个推会左右为难——推上去避开第一张就压到第二张。
     *
     * 注意：候选必须**已在正坐标区间内**才可用。若直接夹到 MARGIN，夹取后的位置
     * 可能又压回别人身上——验证过的坐标被事后夹取，等于验证白做（实测落点 (520,40)
     * 时上移候选是 -30，夹到 28 后正好与 y=40 的卡片重叠）。
     */
    const upTarget = Math.min(...horizontalBlockers.map((other) => other.y - minDy));
    const downTarget = Math.max(...horizontalBlockers.map((other) => other.y + minDy));
    const upCost = Math.abs(upTarget - moved.y);
    const downCost = Math.abs(downTarget - moved.y);
    const useUp = upCost <= downCost && upTarget >= MARGIN;
    const verticalY = useUp ? upTarget : downTarget;
    const verticalOk = (useUp || downTarget >= MARGIN) && !clashes(moved.x, verticalY);
    if (verticalOk) {
      return { x: moved.x, y: verticalY };
    }
  }

  /*
   * 垂直方向被两侧夹住（上面一张、下面一张，缝隙不够）时，改为**水平让开**：
   * 移到所有「与落点在垂直上冲突」的卡片右侧之外。
   *
   * 这一步保证有解：只要 x 超出所有相关卡片一个卡宽，就一定不重叠，而画布没有右边界。
   * 代价是位移可能较大，但比把卡片停在别人身上（遮住关系）好得多。
   */
  const verticalBlockers = others.filter((other) => Math.abs(moved.y - other.y) < minDy);
  const escapeX = verticalBlockers.length > 0
    ? Math.max(...verticalBlockers.map((other) => other.x + minDx))
    : moved.x;
  const escaped = Math.max(MARGIN, escapeX + gapX);
  if (!clashes(escaped, moved.y)) {
    return { x: escaped, y: moved.y };
  }

  // 理论上到不了这里（右移一定能让开）；真到了就保留落点，不假装解决。
  return null;
}

/** 从 SVG 节点矩形的边缘取连接点，避免连线穿过节点本身。 */
export function edgeAnchor(from: PlacedNode, to: PlacedNode): { x1: number; y1: number; x2: number; y2: number } {
  const fromCx = from.x + NODE_W / 2;
  const fromCy = from.y + NODE_H / 2;
  const toCx = to.x + NODE_W / 2;
  const toCy = to.y + NODE_H / 2;
  const horizontal = Math.abs(toCx - fromCx) >= Math.abs(toCy - fromCy);
  if (horizontal) {
    const leftToRight = toCx >= fromCx;
    return {
      x1: leftToRight ? from.x + NODE_W : from.x,
      y1: fromCy,
      x2: leftToRight ? to.x : to.x + NODE_W,
      y2: toCy,
    };
  }
  const topToBottom = toCy >= fromCy;
  return {
    x1: fromCx,
    y1: topToBottom ? from.y + NODE_H : from.y,
    x2: toCx,
    y2: topToBottom ? to.y : to.y + NODE_H,
  };
}

/** 画布上真实出现的关系种类（用于图例，只列有的，不列数据里根本不存在的）。 */
export function relationKindsPresent(edges: NetworkEdge[]): string[] {
  return [...new Set(edges.filter((edge): edge is RelationEdge => edge.source === 'relation').map((edge) => edge.kind))]
    .sort((a, b) => a.localeCompare(b, 'en'));
}
