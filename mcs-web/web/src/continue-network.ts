/**
 * 首页「继续学习」的局部网络：以**上次学习的节点**为中心，按话题方向铺开强关联节点。
 *
 * 空间约定（这是本模块唯一需要记住的规则）：
 *
 * - 中心 = 上次学习的节点。
 * - **上 / 右 / 下 / 左 各对应一个话题**。中心节点所属话题放在「上」，其余话题按
 *   「与本中心的强关联条数」降序排进 右 → 下 → 左；超过四个话题时环形复用方向，
 *   并加大半径，避免与第一轮重叠。
 * - 每个话题的节点从中心沿该方向向外排开：**离中心越近，关联越强**。
 *
 * 关联强度只取本体里已登记的依据，按强弱排序：
 * 登记关系（语义）> 行动契约 > 共用前提 > 同一话题。
 * 前两类是「硬依据」；后两类只是登记上的同组关系，因此排在后面且画得更淡。
 *
 * 本模块是纯函数：不读时间、不读随机数、不写任何状态。同一输入必得同一布局。
 */

import type { EdgeFamily, NetworkGraph } from './network';
import type { Locale } from './i18n/locales.ts';

export type ContinueDirection = 'up' | 'right' | 'down' | 'left';

/** 四个方向各自对应的角度（屏幕坐标系：y 向下）。 */
export const DIRECTION_ANGLE: Record<ContinueDirection, number> = {
  up: -Math.PI / 2,
  right: 0,
  down: Math.PI / 2,
  left: Math.PI,
};

/** 话题填进方向的顺序。第一个话题（中心所属）固定放「上」。 */
export const DIRECTION_ORDER: ContinueDirection[] = ['up', 'right', 'down', 'left'];

export const DIRECTION_LABELS: Record<ContinueDirection, string> = {
  up: '上', right: '右', down: '下', left: '左',
};

/** 一条关联的依据类型。 */
export type LinkBasis = 'relation' | 'contract' | 'sharedInput' | 'sameTopic';

/** 依据强度：数值越小越硬。用于排序与「向中心靠近」的次序。 */
export const BASIS_RANK: Record<LinkBasis, number> = {
  relation: 0,
  contract: 1,
  sharedInput: 2,
  sameTopic: 3,
};

export const BASIS_LABELS: Record<LinkBasis, string> = {
  relation: '已登记关系',
  contract: '行动契约',
  sharedInput: '共用前提',
  sameTopic: '同一话题',
};

/**
 * 上面两张表的英文版（2026-10 双语化，键与中文逐字对应）。
 *
 * 中文表形状保持 `Record<..., string>` 不变：它们直接进 SVG `<text>` 与 `<option>`，
 * 且 `tests/browser.mjs`、`tests/network-edges.mjs` 会按中文逐字核对。
 * 调用方（`components/ContinueNetwork.tsx`）按当前语种取，缺英文时回落中文。
 */
export const DIRECTION_LABELS_EN: Record<ContinueDirection, string> = {
  up: 'Top', right: 'Right', down: 'Bottom', left: 'Left',
};

export const BASIS_LABELS_EN: Record<LinkBasis, string> = {
  relation: 'Registered relation',
  contract: 'Action contract',
  sharedInput: 'Shared prerequisite',
  sameTopic: 'Same topic',
};

/** 取方位名；未登记的方位回退原值。 */
export function directionLabel(direction: ContinueDirection, locale: Locale = 'zh'): string {
  const table = locale === 'en' ? DIRECTION_LABELS_EN : DIRECTION_LABELS;
  return table[direction] ?? direction;
}

/** 取依据名；未登记的依据回退原值。 */
export function basisLabel(basis: LinkBasis, locale: Locale = 'zh'): string {
  const table = locale === 'en' ? BASIS_LABELS_EN : BASIS_LABELS;
  return table[basis] ?? basis;
}

/** 「其他关联」这一兜底话题的显示名（英语境下不能再写中文）。 */
const FALLBACK_TOPIC_TITLE = { zh: '其他关联', en: 'Other associations' } as const;

export interface ContinueLink {
  node: string;
  title: string;
  /** 最强的那条依据。 */
  basis: LinkBasis;
  /** 依据的可读说明（关系种类 / 行动标题 / 话题标题）。 */
  note: string;
  /** 该依据对应的边源家族，供渲染取颜色与线宽。 */
  family: EdgeFamily;
  /** 关系边才有种类与见证状态。 */
  kind: string | null;
  witnessStatus: string | null;
}

export interface PlacedContinueNode {
  node: string;
  title: string;
  basis: LinkBasis;
  family: EdgeFamily;
  kind: string | null;
  witnessStatus: string | null;
  direction: ContinueDirection;
  topicTitle: string;
  /** 从中心起的序号：0 表示离中心最近（关联最强）。 */
  order: number;
  x: number;
  y: number;
}

export interface ContinueGroup {
  direction: ContinueDirection;
  topicId: string;
  topicTitle: string;
  /** 该话题下**全部**强关联节点数（可能多于实际画出的）。 */
  total: number;
  /** 实际画出的节点。 */
  shown: number;
  /** 因为位置不够而没有画出的节点，用「还有 N 个」注明，不假装画全了。 */
  omitted: number;
}

export interface ContinueNetwork {
  center: { node: string; title: string };
  nodes: PlacedContinueNode[];
  groups: ContinueGroup[];
  /** 关系图例：实际出现的依据类型。 */
  bases: LinkBasis[];
  width: number;
  height: number;
  /** 中心卡片在画布坐标里的位置（由实际落点包围盒定出，可能不是几何中心）。 */
  cx: number;
  cy: number;
}

export interface TopicInfo {
  id: string;
  title: string;
  /** 话题 → 它包含的节点。 */
  members: Set<string>;
}

/** 卡片尺寸：比网络页的节点卡片小，因为它是首页里的一个局部视图。 */
export const CONTINUE_NODE_W = 150;
export const CONTINUE_NODE_H = 44;
const CENTER_W = 170;
const CENTER_H = 52;
/** 每根射线最多画几个节点；再多就用「还有 N 个」注明。 */
const MAX_PER_DIRECTION = 3;
const PADDING = 16;
/** 第一圈半径与话题增加时的半径增量。 */
const BASE_RADIUS_X = 196;
const BASE_RADIUS_Y = 118;
const RING_STEP_X = 128;
const RING_STEP_Y = 76;

/**
 * 从聚合块得到「话题」列表。
 *
 * 只取 `topic` 类型的聚合：`discipline` 是学科分类，粒度过粗
 * （「分析」会把极限、微分几何的节点混在一起），不适合当作方位话题。
 */
export function topicsOf(graph: NetworkGraph): TopicInfo[] {
  const topics: TopicInfo[] = [];
  for (const aggregate of graph.aggregates ?? []) {
    if (aggregate.kind !== 'topic') continue;
    const members = new Set<string>();
    for (const block of aggregate.blocks) for (const id of block) members.add(id);
    if (members.size > 0) topics.push({ id: aggregate.id, title: aggregate.title, members });
  }
  // 稳定排序：同一输入必得同一话题顺序。
  return topics.sort((a, b) => a.id.localeCompare(b.id, 'en'));
}

/** 中心节点所属的话题（可能属于多个；取第一个命中的即可，顺序稳定）。 */
export function topicOfNode(topics: TopicInfo[], nodeId: string): TopicInfo | null {
  for (const topic of topics) if (topic.members.has(nodeId)) return topic;
  return null;
}

/**
 * 取与中心节点「强关联」的节点。
 *
 * 只收有**已登记依据**的节点：
 * - 语义关系（最强，带种类与见证状态）
 * - 行动契约（中心是某行动的输入或输出）
 * - 共用前提（与中心同为一个行动的输入）
 * - 同一话题（最弱，仅登记上的同组）
 *
 * 没有这四类依据的节点不进这个视图——它不是「全体近邻」，是「有据可依的下一步」。
 * 已经确认掌握的节点不重复推荐（`confirmed`）；正在复习的节点保留，便于回看。
 */
export function strongLinks(
  center: string,
  graph: NetworkGraph,
  topics: TopicInfo[],
  options: { confirmed?: Set<string>; limit?: number } = {},
): ContinueLink[] {
  const limit = options.limit ?? 14;
  const confirmed = options.confirmed ?? new Set<string>();
  const nodeById = new Map(graph.nodes.map((node) => [node.id, node]));
  const best = new Map<string, ContinueLink>();

  const consider = (id: string, basis: LinkBasis, note: string, family: EdgeFamily, kind: string | null = null, witnessStatus: string | null = null) => {
    if (id === center) return;
    const node = nodeById.get(id);
    if (!node) return;
    if (confirmed.has(id)) return;
    const existing = best.get(id);
    // 只保留最强的那条依据：同一个节点可能既有关系又有契约，
    // 学习者需要看到的是「最硬的那个理由」。
    if (existing && BASIS_RANK[existing.basis] <= BASIS_RANK[basis]) return;
    best.set(id, { node: id, title: node.title, basis, note, family, kind, witnessStatus });
  };

  for (const relation of graph.relations) {
    const other = relation.from === center ? relation.to : relation.to === center ? relation.from : null;
    if (!other) continue;
    consider(other, 'relation', relation.kind, 'relation', relation.kind, relation.witness?.status ?? null);
  }

  for (const action of graph.actions) {
    const inputs = new Set(action.inputs.map((item) => item.node));
    const outputs = new Set(action.outputs.map((item) => item.node));
    if (outputs.has(center)) {
      // 中心是产出：它的前提是什么（进得来的路）。
      for (const id of inputs) consider(id, 'contract', action.title, 'contract');
    }
    if (inputs.has(center)) {
      // 中心是前提：它能推出什么（走得出去的路）。
      for (const id of outputs) consider(id, 'contract', action.title, 'contract');
    }
    if (inputs.has(center)) {
      for (const id of inputs) consider(id, 'sharedInput', action.title, 'sharedInput');
    }
  }

  const centerTopic = topicOfNode(topics, center);
  if (centerTopic) {
    for (const id of centerTopic.members) consider(id, 'sameTopic', centerTopic.title, 'topic');
  }

  return [...best.values()]
    .sort((a, b) => BASIS_RANK[a.basis] - BASIS_RANK[b.basis]
      || a.node.localeCompare(b.node, 'en'))
    .slice(0, limit);
}

/**
 * 决定每条强关联属于哪个话题。
 *
 * 优先用「与中心共同所属、且不含中心的那个话题」——把邻居按它们各自的谈话圈子归类，
 * 比按中心的圈子归类更能说明「它从哪个方向来」。找不到时退回中心所属话题；
 * 再找不到就归到「其他」（会被排到最后一个方向）。
 */
function topicFor(link: string, center: string, topics: TopicInfo[], fallback: TopicInfo | null): TopicInfo | null {
  let shared: TopicInfo | null = null;
  for (const topic of topics) {
    if (!topic.members.has(link)) continue;
    if (topic.members.has(center)) {
      // 与中心同属一个话题，但没有共同话题之外的归属时用它兜底。
      shared = shared ?? topic;
      continue;
    }
    return topic;
  }
  return shared ?? fallback;
}

/** 容器尺寸：由话题数与每方向最多节点数决定，保证射线不被裁掉。 */
function containerSize(rings: number): { width: number; height: number; cx: number; cy: number } {
  const radiusX = BASE_RADIUS_X + (rings - 1) * RING_STEP_X;
  const radiusY = BASE_RADIUS_Y + (rings - 1) * RING_STEP_Y;
  // 扇形会向两侧各偏出约 74px（同方向最多 3 个），加上它避免最外侧卡片被裁。
  return {
    width: PADDING * 2 + radiusX * 2 + CONTINUE_NODE_W + 140,
    height: PADDING * 2 + radiusY * 2 + CONTINUE_NODE_H + 90,
    cx: PADDING + 70 + radiusX + CONTINUE_NODE_W / 2,
    cy: PADDING + 45 + radiusY + CONTINUE_NODE_H / 2,
  };
}

/**
 * 同一方向内的排布：求「离中心由近到远」的一串落点，且两两不重叠。
 *
 * 做法是把重叠条件写成不等式，再解出两个步长，而不是靠试参数：
 *
 * - 两张卡片**重叠**当且仅当 |Δx| < 卡片宽 且 |Δy| < 卡片高。
 *   所以只要满足「|Δx| ≥ 宽」或「|Δy| ≥ 高」其中之一就不重叠。
 * - 径向步长 `R` 把节点往外推，切向步长 `L` 把它往侧面推。对第 k 个节点：
 *   Δ径向 = k·R（方向轴上的差），Δ切向 = k·L（垂直于方向轴的差）。
 *   相邻两个在方向轴垂直方向上的差是 `L·|sin| + R·|cos|` 这一类的组合，
 *   直接取保守解即可：令 `R ≥ 卡片高 + 12`、`L ≥ 卡片宽 + 14`，
 *   于是相邻两卡在「切向」上至少差一个卡宽，或（正交方向）在径向差一个卡高。
 *
 * 为什么不用「按角度扇形展开」：角度展开的间距与卡片尺寸无关，
 * 实测 3 个同方向邻居会重叠 1 对、5 个时重叠 2 对。
 *
 * 返回的 order 保持 0 = 离中心最近 = 关联最硬。
 */
function layoutAlongDirection(
  count: number,
  cx: number,
  cy: number,
  angle: number,
  radiusX: number,
  radiusY: number,
): Array<{ order: number; x: number; y: number }> {
  const ux = Math.cos(angle);
  const uy = Math.sin(angle);
  // 切向单位向量（方向向量旋转 90°）。
  const tx = -uy;
  const ty = ux;
  const R = CONTINUE_NODE_H + 16;   // 径向步长：一个卡高再多一点
  const L = CONTINUE_NODE_W + 20;   // 切向步长：一个卡宽再多一点
  const mid = (count - 1) / 2;
  const spots: Array<{ order: number; x: number; y: number }> = [];
  for (let order = 0; order < count; order += 1) {
    // 沿方向轴：全部在半径之外，且越靠后越远。
    const radial = order * R;
    // 垂直方向：以方向轴为中心左右摊开，使整组看起来是一个扇形而不是一条线。
    // 竖直分量乘 0.55：切向步长是按「卡宽」定的（竖直方向需要这么多才不重叠），
    // 对上下方向来说那是横向错开，本可以更紧凑；乘 0.55 后既不重叠也不会把画布拉得很高。
    const lateral = (order - mid) * L;
    const px = cx + ux * (radiusX + radial) + tx * lateral;
    const py = cy + uy * (radiusY + radial) + ty * lateral * 0.55;
    spots.push({ order, x: px, y: py });
  }
  return spots;
}

/**
 * 组装完整布局。
 *
 * 方向分配规则（可核对）：
 * 1. 中心所属话题放「上」；
 * 2. 其余话题按「强关联节点数」降序排进 右、下、左；
 * 3. 超过四个话题时环形复用，半径加一圈。
 */
export function buildContinueNetwork(
  centerId: string,
  graph: NetworkGraph,
  options: { confirmed?: Set<string>; limit?: number; locale?: Locale } = {},
): ContinueNetwork | null {
  const centerNode = graph.nodes.find((node) => node.id === centerId);
  if (!centerNode) return null;
  const topics = topicsOf(graph);
  const links = strongLinks(centerId, graph, topics, options);
  const centerTopic = topicOfNode(topics, centerId);
  // 兜底话题名要跟着语种：它会显示在分组标题与卡片说明里（`options.locale` 默认中文）。
  const fallback: TopicInfo = {
    id: 'other',
    title: FALLBACK_TOPIC_TITLE[options.locale ?? 'zh'],
    members: new Set<string>(),
  };

  // 归类
  const buckets = new Map<string, { topic: TopicInfo; links: ContinueLink[] }>();
  for (const link of links) {
    const topic = topicFor(link.node, centerId, topics, centerTopic) ?? fallback;
    const bucket = buckets.get(topic.id) ?? { topic, links: [] };
    bucket.links.push(link);
    buckets.set(topic.id, bucket);
  }

  // 方向分配
  const ordered = [...buckets.values()].sort((a, b) => {
    // 中心所属话题永远第一；其余按关联数降序，再按 id 稳定排序。
    const aCenter = a.topic.id === centerTopic?.id ? 0 : 1;
    const bCenter = b.topic.id === centerTopic?.id ? 0 : 1;
    return aCenter - bCenter || b.links.length - a.links.length || a.topic.id.localeCompare(b.topic.id, 'en');
  });

  const ringCount = Math.max(1, Math.ceil(ordered.length / DIRECTION_ORDER.length));
  const { width, height, cx, cy } = containerSize(ringCount);

  const placed: PlacedContinueNode[] = [];
  const groups: ContinueGroup[] = [];
  ordered.forEach((bucket, index) => {
    const direction = DIRECTION_ORDER[index % DIRECTION_ORDER.length];
    const ring = Math.floor(index / DIRECTION_ORDER.length);
    const radiusX = BASE_RADIUS_X + ring * RING_STEP_X;
    const radiusY = BASE_RADIUS_Y + ring * RING_STEP_Y;
    const angle = DIRECTION_ANGLE[direction];
    const ux = Math.cos(angle);
    const uy = Math.sin(angle);
    // 同一方向上的节点按依据强弱排开：近的硬、远的软。
    const sorted = [...bucket.links].sort((a, b) => BASIS_RANK[a.basis] - BASIS_RANK[b.basis] || a.node.localeCompare(b.node, 'en'));
    const shown = sorted.slice(0, MAX_PER_DIRECTION);
    for (const spot of layoutAlongDirection(shown.length, cx, cy, angle, radiusX, radiusY)) {
      const link = shown[spot.order];
      placed.push({
        node: link.node,
        title: link.title,
        basis: link.basis,
        family: link.family,
        kind: link.kind,
        witnessStatus: link.witnessStatus,
        direction,
        topicTitle: bucket.topic.title,
        order: spot.order,
        // 让卡片朝向中心：沿方向轴反推半个卡片，避免压住中心。
        x: spot.x - Math.cos(angle) * (CONTINUE_NODE_W / 2),
        y: spot.y - Math.sin(angle) * (CONTINUE_NODE_H / 2),
      });
    }
    groups.push({
      direction,
      topicId: bucket.topic.id,
      topicTitle: bucket.topic.title,
      total: sorted.length,
      shown: shown.length,
      omitted: sorted.length - shown.length,
    });
  });

  /**
   * 容器尺寸由**实际落点**决定，而不是按话题数估算。
   *
   * 估算版本会裁掉最外侧的卡片（实测「序列收敛」的 y 坐标算成 -15，
   * 卡片直接被画到画布上方外面）。先按估算值摆好，再用真实包围盒定画布，
   * 并把中心平移到包围盒正中——这样任何方向组合都不会被裁。
   */
  const allX = placed.map((item) => item.x);
  const allY = placed.map((item) => item.y);
  const minX = Math.min(cx - CONTINUE_CENTER.w / 2, ...allX);
  const maxX = Math.max(cx + CONTINUE_CENTER.w / 2, ...allX.map((value) => value + CONTINUE_NODE_W));
  const minY = Math.min(cy - CONTINUE_CENTER.h / 2, ...allY);
  const maxY = Math.max(cy + CONTINUE_CENTER.h / 2, ...allY.map((value) => value + CONTINUE_NODE_H));
  const shiftX = PADDING - minX;
  const shiftY = PADDING - minY;
  const finalWidth = maxX - minX + PADDING * 2;
  const finalHeight = maxY - minY + PADDING * 2;
  const finalCx = cx + shiftX;
  const finalCy = cy + shiftY;
  const shifted = placed.map((item) => ({ ...item, x: item.x + shiftX, y: item.y + shiftY }));

  const bases = [...new Set(shifted.map((item) => item.basis))]
    .sort((a, b) => BASIS_RANK[a] - BASIS_RANK[b]);

  return {
    center: { node: centerNode.id, title: centerNode.title },
    nodes: shifted,
    groups,
    bases,
    width: finalWidth,
    height: finalHeight,
    cx: finalCx,
    cy: finalCy,
  };
}

/** 中心卡片尺寸，供渲染处使用。 */
export const CONTINUE_CENTER = { w: CENTER_W, h: CENTER_H };
