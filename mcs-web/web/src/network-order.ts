/**
 * 网络视图的「重排模式」：**学习顺序**与**逻辑核心**两种摆位规则（2026-10-11 加）。
 *
 * ## 用户的要求（原话）
 *
 * 「在网络视图中，为重排节点位置的按钮添加模式切换功能，区分倾向于学习顺序的节点位置和
 * 倾向于拟合节点天然的逻辑关系的节点位置：前者按照节点与起始节点的距离（隔了几个硬前置）
 * 给节点分配上下的位置关系，起始节点在最上面，高阶的节点在下面；后者按照节点在视图中的
 * 节点群里面的核心程度去决定节点在中心还是周围。起始节点和核心节点的选择交给用户，
 * 在网络视图页面里添加这个可选项。」
 *
 * ## 两种规则各是什么（先给自然语言，再给判据）
 *
 * 1. **学习顺序**（`learningOrderArrangement`）：以用户选定的**起始节点**为第 0 层，
 *    沿 `hardPrereq` 关系**只走正向**（前置 → 依赖它的对象）数「隔了几个硬前置」，
 *    同层的节点排成一行，层号越大越靠下。于是「从上往下读」就是一条由浅入深的学习次序。
 *    - 只走正向是有意的：反向（起始节点自己的前置）与完全无关的节点**不在这条顺序上**，
 *      它们单独放在最下一层，界面会如实说明「不在这条学习顺序上」，不假装它们是后续内容。
 *    - 同层里按**重心法**排（Sugiyama 的 barycenter）：谁的前置在上一层靠左，它就靠左。
 *      这样每一层的左右次序与上一层的连边大致对齐，读图时不必来回找线。
 *    - 层内列数有上限（`maxColumns`），超了就折行——否则一整层能铺出两万像素宽，
 *      在 `ZOOM_MIN`（0.25）下无论怎么适配都看不全。
 *
 * 2. **逻辑核心**（`coreRingArrangement`）：以用户选定的**核心节点**为圆心，
 *    其余节点按「在**当前视图**这张图里的核心程度」由内到外分圈。
 *    - 用户选定的核心**无条件落在圆心**——哪怕它自己的核心程度不是最高的那个：
 *      「选择交给用户」这句话要有实际后果，界面同时给出「谁的核心程度最高」供对照。
 *    - 核心程度 = **加权 PageRank**（权重直接取 `visualWeightOf`，与线宽、吸力同一张表）。
 *      取 PageRank 而不是单纯度数，是因为它回答的正是「谁被重要的东西连着」——
 *      度数与它一起用（同分时度数高的在前），但排序的主判据是前者。
 *    - 圈半径按「同一圈上相邻卡片的**最小弦长**」定容量（`minChord`），
 *      因此同圈与相邻圈都不会压卡片——这是构造上的保证，不靠事后松弛。
 *    - 圈内角度按**内侧邻居的角度重心**排：与内圈谁相连，就转到谁那一侧。
 *      于是「天然的逻辑关系」在图上表现为相邻的角扇区，而不是随机散布。
 *
 * ## 三条纪律（与 `network.ts` 的 `layout()` 相同）
 *
 * 1. **确定性**：没有 `Math.random`、没有时间、没有 DOM 测量；同一输入逐位得到同一坐标
 *    （node 侧有单测钉住）。这是「同一 URL 得到同一张图」这条承诺的一部分。
 * 2. **不重叠是构造保证**：列距 / 行距 / 圈距与最小弦长都大于卡片对角线的需要，
 *    因此不需要再跑一次 `relaxToSpacing`。
 * 3. **只读**：不改边、不改度数、不写 M / E。摆位纯属视图层。
 *
 * 这个模块是**叶子模块**（只 import 类型与两个纯函数），node 可以直接 import 做单元测试
 * （`tests/network-order.test.mjs`）。
 */

import { HARD_PREREQ_KIND } from './hard-prereq-closure.ts';
import { NODE_H, NODE_W, avoidOverlaps, visualWeightOf } from './network.ts';
import type { NetworkEdge, NetworkLayout, PlacedNode } from './network.ts';

/**
 * 摆位模式。
 *
 * - `free`：力导向（`network.ts` 的 `layout()`）。这是历史行为，也是默认档——
 *   它没有「谁该在上、谁该在中间」的主张，只按关系强弱把相关的拉到一起；
 * - `learning`：学习顺序，按与起始节点隔了几个硬前置分层；
 * - `logic`：逻辑核心，按在视图里的核心程度分圈。
 *
 * 保留 `free` 而不把它换成两种新模式之一：既有行为（含全部网络验收的坐标断言）
 * 是默认档，新模式是**加法**，不改默认。
 */
export type LayoutMode = 'free' | 'learning' | 'logic';

export const LAYOUT_MODES: readonly LayoutMode[] = ['free', 'learning', 'logic'];

/** 解析外部输入（localStorage）用：不认识的值一律回落到默认档，不抛错。 */
export function isLayoutMode(value: unknown): value is LayoutMode {
  return typeof value === 'string' && (LAYOUT_MODES as readonly string[]).includes(value);
}

/**
 * 模式与锚点的存放位置（localStorage）。
 *
 * 为什么不进 URL：`?nodes=` 与回放参数是「这一张图是什么」，
 * 而模式与锚点是**看图的偏好**（与「连接类型」的开关同一层）——它们不进 URL、
 * 不进保存的视图快照，也不写本体与档案。放在这里导出是为了让浏览器验收能定向清理它。
 */
export const LAYOUT_MODE_KEY = 'mcs-network-layout-mode-v1';
export const LAYOUT_ANCHOR_KEY = 'mcs-network-layout-anchor-v1';

/**
 * 两种规则共用的设计取值（2026-10-11 定，登记在 `data/design-values.mjs`）。
 *
 * - `margin`：左上留白（与 `network.ts` 的 `MARGIN` 同值，保证两种模式的图都从同一处起画）；
 * - `columnGap` / `rowGap`：卡片之外的**额外**间隔（列距 = 172 + 36 = 208，行距 = 58 + 46 = 104）；
 * - `maxColumns`：一层最多几列，超了折行（见文件顶部的理由）；
 * - `ringStep`：相邻两圈的半径差；`minChord`：同一圈上相邻卡片的最小弦长。
 *   `minChord` 取 200 而不是「刚好不压」的 182（= √(172² + 58²)）：留 10% 余量，
 *   因为弦长与半径的关系在小圈上是非线性的（容量公式用的是反正弦，见 `ringCapacity`）。
 * - `pagerankDamping` / `pagerankIterations`：加权 PageRank 的标准取值与固定轮数。
 *   固定轮数（而不是「收敛就停」）是为了确定性：同一输入必定走同一串浮点运算。
 */
export const ORDER_LAYOUT = {
  margin: 28,
  columnGap: 36,
  rowGap: 46,
  maxColumns: 10,
  /** 学习顺序里，「不在这条顺序上」的那一层前面空一行，视觉上与下游分开。 */
  offPathGapRows: 1,
  ringStep: 210,
  minChord: 200,
  pagerankDamping: 0.85,
  pagerankIterations: 40,
} as const;

/** 只用到方向与种类的硬前置关系（与 `hard-prereq-closure.ts` 同一形状）。 */
export interface HardPrereqEdge {
  kind: string;
  from: string;
  to: string;
}

/**
 * 有序摆位之后的**让位**：`fixed` 里的卡片一个都不动，其余卡片绕开它们。
 *
 * 为什么需要（2026-10-11 实测踩到）：两种规则都是**整张图重算**——换模式、换锚点、
 * 加一个节点，位置全部重排。而手动拖过的节点按承诺留在原处，于是规则很可能把一张卡片
 * 正好摆在它身上（实测出现过一次重叠，验收直接报出来）。让位的方向只有一个：
 * **规则让使用者**——反过来等于把使用者的摆放抹掉，那正是「手动优先」这条承诺的反面。
 *
 * `fixed` = 手动摆过的节点 **+ 锚点**：锚点（逻辑核心）是整张图的几何原点，
 * 把它推开等于把规则本身毁掉。实测：用户把一张卡片拖到核心旁边时，
 * 唯一「挡路」的正是核心，一推就出现「核心跑到了图的下边缘」（圆心到质心 457px）。
 * 核心因此算作不可动；它与手动卡片重叠时**如实重叠**——那是使用者自己放的位置。
 *
 * ## 让位怎么走：分圈模式沿半径向外，网格模式走通用让位
 *
 * `options.center`（逻辑核心的圆心）给定时，被挡住的卡片**沿自己那条半径向外退**：
 * 分圈模式的读法是「核心 → 周围」，卡片退到更外一圈仍然读得通。
 * 一开始用的是通用的 `avoidOverlaps`（先垂直、再水平），实测在圆环布局里会把一整串卡片
 * 挤成一条竖线——圆心到其余节点质心的距离从 60px 涨到 457px，「核心在中心」直接读不出来了。
 *
 * 学习顺序（网格）不给 `center`：那里卡片本来就排成行，通用让位沿行/列分开是合适的。
 *
 * 逐个按**已就位集合**结算，因此不会把一张卡片从 A 身上推到 B 身上；顺序取
 * `layout.placed` 的既有顺序（层序 / 圈序），所以结果仍然确定。
 */
export function separateFromManual(
  layout: NetworkLayout,
  fixed: ReadonlySet<string>,
  options: { center?: { x: number; y: number } | null; step?: number } = {},
): NetworkLayout {
  if (fixed.size === 0) return layout;
  const placed = [...layout.placed];
  /** 与 `avoidOverlaps` 的默认间隙一致：让位之后至少留出同样的呼吸空间。 */
  const minDx = NODE_W + 20;
  const minDy = NODE_H + 12;
  const free = (candidate: { x: number; y: number }, index: number) =>
    !placed.some((other, at) => at !== index
      && Math.abs(candidate.x - other.x) < minDx && Math.abs(candidate.y - other.y) < minDy);

  let touched = false;
  for (let index = 0; index < placed.length; index += 1) {
    const node = placed[index];
    if (fixed.has(node.id)) continue;
    if (free(node, index)) continue;
    let spot: { x: number; y: number } | null = null;
    const center = options.center;
    if (center) {
      const cx = center.x + NODE_W / 2;
      const cy = center.y + NODE_H / 2;
      const dx = node.x + NODE_W / 2 - cx;
      const dy = node.y + NODE_H / 2 - cy;
      const base = Math.hypot(dx, dy);
      if (base > 1) {
        const step = options.step ?? ORDER_LAYOUT.ringStep / 8;
        // 上限六圈：再退不出去说明这张图确实挤，交给通用让位兜底（它保证有解或如实返回 null）。
        for (let radius = base + step; radius <= base + ORDER_LAYOUT.ringStep * 6; radius += step) {
          const candidate = { x: cx + (dx / base) * radius - NODE_W / 2, y: cy + (dy / base) * radius - NODE_H / 2 };
          if (free(candidate, index)) { spot = candidate; break; }
        }
      }
    }
    if (!spot) spot = avoidOverlaps(placed, node.id);
    if (!spot) continue;
    placed[index] = { ...node, x: spot.x, y: spot.y };
    touched = true;
  }
  if (!touched) return layout;
  // 让位会改包围盒：宽度高度要跟着重算，否则 fitView 按旧盒子适配会把让出来的卡片切掉。
  const maxX = Math.max(...placed.map((node) => node.x));
  const maxY = Math.max(...placed.map((node) => node.y));
  return {
    ...layout,
    placed,
    width: maxX + NODE_W + ORDER_LAYOUT.margin,
    height: maxY + NODE_H + ORDER_LAYOUT.margin,
  };
}

const cmpId = (a: string, b: string) => a.localeCompare(b, 'en');

/** 「指向某节点的硬前置来源」，按登记顺序（AND；同一节点可能有多条来源）。 */
function hardPrereqParents(relations: readonly HardPrereqEdge[]): Map<string, string[]> {
  const parents = new Map<string, string[]>();
  for (const relation of relations) {
    if (relation.kind !== HARD_PREREQ_KIND) continue;
    if (!relation.from || !relation.to || relation.from === relation.to) continue;
    const list = parents.get(relation.to);
    if (list) list.push(relation.from);
    else parents.set(relation.to, [relation.from]);
  }
  return parents;
}

/**
 * 从 `start` 出发沿硬前置的**正向**（前置 → 依赖它的对象）数层号。
 *
 * 返回值包含 `start` 自己（层号 0）。**不包含**它的前置、以及任何与它没有正向硬前置路径的节点
 * ——那些节点不在这条学习顺序上，调用方负责如实安放（见 `learningOrderArrangement`）。
 *
 * 用的是**全部已登记关系**（不是视图里那几条）：距离是本体里的性质，
 * 不该随着「视图里恰好没放中间那个节点」而变短。
 */
export function hardPrereqDepths(relations: readonly HardPrereqEdge[], start: string): Map<string, number> {
  const children = new Map<string, string[]>();
  for (const relation of relations) {
    if (relation.kind !== HARD_PREREQ_KIND) continue;
    if (!relation.from || !relation.to || relation.from === relation.to) continue;
    const list = children.get(relation.from);
    if (list) list.push(relation.to);
    else children.set(relation.from, [relation.to]);
  }
  const depth = new Map<string, number>([[start, 0]]);
  let frontier = [start];
  let level = 0;
  while (frontier.length) {
    level += 1;
    const next: string[] = [];
    for (const node of frontier) {
      for (const child of children.get(node) ?? []) {
        if (depth.has(child)) continue;
        depth.set(child, level);
        next.push(child);
      }
    }
    frontier = next;
  }
  return depth;
}

/**
 * 一个节点的**全部（传递）硬前置条数**：沿硬前置**反向**（依赖 → 它的前置）收集到的节点数。
 *
 * 用来回答「在视图这一群里，谁最像起点」——需要先会的东西越少越靠前。
 *
 * 注意方向与 `hardPrereqDepths` **正好相反**：那个数「从它出发能走到多远」（下游），
 * 这个数「走到它之前要经过多少东西」（上游）。两个数都有人问，
 * 混用会让「起点」选到一个前置最多的节点上（本模块第一版就写错过一次，单测钉住了）。
 */
export function hardPrereqAncestorCount(relations: readonly HardPrereqEdge[], id: string): number {
  const parents = hardPrereqParents(relations);
  const seen = new Set<string>([id]);
  let frontier = [id];
  let count = 0;
  while (frontier.length) {
    const next: string[] = [];
    for (const node of frontier) {
      for (const parent of parents.get(node) ?? []) {
        if (seen.has(parent)) continue;
        seen.add(parent);
        count += 1;
        next.push(parent);
      }
    }
    frontier = next;
  }
  return count;
}

/**
 * 起始节点的候选次序：**先把档案里现在就能开始的那些放前面**（按 `startingOrder`，
 * 那就是本体里的登记顺序），其余按「登记前置由少到多」排。
 *
 * 为什么不是字典序：视图里往往同时有背景接口与三四层之后的定理，
 * 字典序会把这个区别抹掉，而「谁的硬前置最少」正是这个模式要用的判据。
 */
export function startCandidateOrder(
  ids: readonly string[],
  startingOrder: readonly string[],
  relations: readonly HardPrereqEdge[],
): string[] {
  const present = new Set(ids);
  const first: string[] = [];
  const taken = new Set<string>();
  for (const id of startingOrder) {
    if (!present.has(id) || taken.has(id)) continue;
    taken.add(id);
    first.push(id);
  }
  const rest = ids.filter((id) => !taken.has(id));
  const counts = new Map(rest.map((id) => [id, hardPrereqAncestorCount(relations, id)]));
  rest.sort((a, b) => ((counts.get(a) ?? 0) - (counts.get(b) ?? 0)) || cmpId(a, b));
  return [...first, ...rest];
}

/** 默认的起始节点：视图里第一个「现在就能开始」的节点；没有就退到前置最少的那个。 */
export function suggestStartNode(
  ids: readonly string[],
  startingOrder: readonly string[],
  relations: readonly HardPrereqEdge[],
): string | null {
  return startCandidateOrder(ids, startingOrder, relations)[0] ?? null;
}

/**
 * 每个节点的**核心程度**：在当前视图这张图上跑加权 PageRank，再归一到 0–1。
 *
 * 边权直接取 `visualWeightOf`（与线宽、颜色、力导向的吸力**出自同一个数**）：
 * 硬关系把两端拉得更「核心」，话题与共用前提几乎不参与。
 * 无边的节点（孤立节点）按 PageRank 的悬挂节点处理：它的分数只剩基础份额，
 * 归一化之后是**全图最低**那一档，因此排在最后一圈——与「它在视图里没有连接」这件事一致。
 */
export function coreScores(ids: readonly string[], edges: readonly NetworkEdge[]): Map<string, number> {
  const present = new Set(ids);
  const adjacency = new Map<string, Map<string, number>>();
  for (const id of ids) adjacency.set(id, new Map());
  for (const edge of edges) {
    if (edge.from === edge.to) continue;
    if (!present.has(edge.from) || !present.has(edge.to)) continue;
    const weight = Math.max(visualWeightOf(edge), 0.01);
    const forward = adjacency.get(edge.from)!;
    const backward = adjacency.get(edge.to)!;
    forward.set(edge.to, (forward.get(edge.to) ?? 0) + weight);
    backward.set(edge.from, (backward.get(edge.from) ?? 0) + weight);
  }
  const strength = new Map<string, number>(
    ids.map((id) => [id, [...adjacency.get(id)!.values()].reduce((sum, value) => sum + value, 0)]),
  );

  const count = ids.length;
  const damping = ORDER_LAYOUT.pagerankDamping;
  let rank = new Map<string, number>(ids.map((id) => [id, 1 / count]));
  for (let step = 0; step < ORDER_LAYOUT.pagerankIterations; step += 1) {
    const next = new Map<string, number>(ids.map((id) => [id, (1 - damping) / count]));
    let dangling = 0;
    for (const id of ids) {
      const total = strength.get(id) ?? 0;
      const share = rank.get(id) ?? 0;
      if (total <= 0) { dangling += share; continue; }
      for (const [target, weight] of adjacency.get(id)!) {
        next.set(target, (next.get(target) ?? 0) + damping * share * (weight / total));
      }
    }
    // 悬挂节点的份额均分给所有节点：否则整张图的分数会逐轮漏掉。
    const spread = (damping * dangling) / count;
    if (spread > 0) for (const id of ids) next.set(id, (next.get(id) ?? 0) + spread);
    rank = next;
  }

  const max = Math.max(0, ...rank.values());
  const scores = new Map<string, number>();
  for (const id of ids) scores.set(id, max > 0 ? (rank.get(id) ?? 0) / max : 0);
  return scores;
}

/** 核心节点的候选次序：核心程度由高到低（同分时字典序，保证确定）。 */
export function coreCandidateOrder(ids: readonly string[], edges: readonly NetworkEdge[]): string[] {
  const scores = coreScores(ids, edges);
  return [...ids].sort((a, b) => ((scores.get(b) ?? 0) - (scores.get(a) ?? 0)) || cmpId(a, b));
}

/** 默认的核心节点：核心程度最高的那一个。视图为空时给 null。 */
export function suggestCoreNode(ids: readonly string[], edges: readonly NetworkEdge[]): string | null {
  return coreCandidateOrder(ids, edges)[0] ?? null;
}

/** 一档（学习顺序的一层 / 逻辑核心的一圈）。 */
export interface OrderBand {
  /** 这一档的判据数字：学习顺序是层号（0 = 起始节点），逻辑核心是圈号（0 = 中心）。 */
  value: number;
  nodes: string[];
  /**
   * 只可能出现在学习顺序的最后档：这一档是「不在这条学习顺序上」的节点
   * （起始节点自己的前置、以及与本条顺序无关的节点）。它不是层号的一层，
   * 界面据此把话说清楚，而不是把它们当成「最后一层要学的东西」。
   */
  offPath?: boolean;
}

/** 两种规则共同的产出。 */
export interface OrderArrangement {
  mode: 'learning' | 'logic';
  /** 用户选定的锚点：学习顺序是起始节点，逻辑核心是核心节点。 */
  anchor: string;
  layout: NetworkLayout;
  /** 从上到下（学习顺序）/ 由内到外（逻辑核心）的每一档。 */
  bands: OrderBand[];
  /** 学习顺序：**不在**起始节点下游、单独放在最下一层的节点。逻辑核心：空数组。 */
  offPath: string[];
  /** 学习顺序：在起始节点下游（含自己）的节点数。逻辑核心：全部在视图里的节点数。 */
  ranked: number;
  /** 逻辑核心：每个节点的核心程度（0–1）。学习顺序：空表。 */
  scores: Map<string, number>;
}

interface OrderInput {
  /** 视图里要摆的节点 id（顺序不限；函数内部先按 id 排序，保证确定性）。 */
  ids: readonly string[];
  /** 节点标题（画在卡片上）；缺省用 id。 */
  titles: ReadonlyMap<string, string>;
  /** 视图里画出来的边（已经过边源开关过滤）。用来判「有没有连接」与算核心程度。 */
  edges: readonly NetworkEdge[];
}

export interface LearningOrderInput extends OrderInput {
  relations: readonly HardPrereqEdge[];
  /** 起始节点（必须在这个视图里；不在时全部节点按「不在下游」处理，函数不会抛错）。 */
  start: string;
}

export interface CoreRingInput extends OrderInput {
  /** 核心节点（必须在这个视图里；不在时退到核心程度最高的那个）。 */
  core: string;
}

/** 每个节点在当前视图这张图上的邻居（`isolated` 与角度次序都用它）。 */
function neighborMap(ids: readonly string[], edges: readonly NetworkEdge[]): Map<string, Set<string>> {
  const neighbors = new Map<string, Set<string>>();
  for (const id of ids) neighbors.set(id, new Set());
  for (const edge of edges) {
    if (edge.from === edge.to) continue;
    if (!neighbors.has(edge.from) || !neighbors.has(edge.to)) continue;
    neighbors.get(edge.from)!.add(edge.to);
    neighbors.get(edge.to)!.add(edge.from);
  }
  return neighbors;
}

/** 空视图的布局：与 `network.ts` 的 `layout()` 对空输入给的是同一形状。 */
function emptyLayout(): NetworkLayout {
  return { placed: [], width: 0, height: 0, isolated: [], maxColumn: -1, maxRow: -1 };
}

/**
 * 把算好的坐标收成 `NetworkLayout`：宽度高度按**节点真实包围盒**加留白算，
 * `isolated` 与 `connected` 与力导向那一套同一口径（同一份边集）。
 *
 * 有序模式里的 `column` / `row` 就是网格坐标本身（第几列、第几行 / 第几圈的第几个），
 * 不是力导向那种「按像素折算的稀疏坐标」——这里的格子是构造出来的，直接写出来更好核对。
 */
function frame(placed: PlacedNode[], edges: readonly NetworkEdge[]): NetworkLayout {
  if (placed.length === 0) return emptyLayout();
  const neighbors = neighborMap(placed.map((node) => node.id), edges);
  const isolatedSet = new Set(placed.filter((node) => (neighbors.get(node.id)?.size ?? 0) === 0).map((node) => node.id));
  const maxX = Math.max(...placed.map((node) => node.x));
  const maxY = Math.max(...placed.map((node) => node.y));
  const columns = placed.map((node) => node.column).filter((value): value is number => value !== null);
  const rows = placed.map((node) => node.row);
  return {
    placed: placed.map((node) => ({ ...node, connected: !isolatedSet.has(node.id) })),
    width: maxX + NODE_W + ORDER_LAYOUT.margin,
    height: maxY + NODE_H + ORDER_LAYOUT.margin,
    isolated: [...isolatedSet],
    maxColumn: columns.length ? Math.max(...columns) : -1,
    maxRow: rows.length ? Math.max(...rows) : -1,
  };
}

function placedNode(id: string, titles: ReadonlyMap<string, string>, x: number, y: number, column: number, row: number): PlacedNode {
  return { id, title: titles.get(id) ?? id, column, row, x, y, connected: true };
}

/**
 * 学习顺序的摆位（见文件顶部第 1 条）。
 *
 * @param input.ids       视图里的节点
 * @param input.relations 全部已登记的硬前置关系（M 的投影；距离按本体算，不按视图算）
 * @param input.start     起始节点
 */
export function learningOrderArrangement(input: LearningOrderInput): OrderArrangement {
  const ids = [...input.ids].sort(cmpId);
  if (ids.length === 0) {
    return { mode: 'learning', anchor: '', layout: emptyLayout(), bands: [], offPath: [], ranked: 0, scores: new Map() };
  }
  const depthOf = input.start && ids.includes(input.start)
    ? hardPrereqDepths(input.relations, input.start)
    : new Map<string, number>();
  const parentsOf = hardPrereqParents(input.relations);
  const inView = new Set(ids);

  const onPath = ids.filter((id) => depthOf.has(id));
  const offPathSet = new Set(ids.filter((id) => !depthOf.has(id)));

  /** 已经在网格上就位的节点的列号（重心法要读上一层已经排好的列）。 */
  const columnOf = new Map<string, number>();
  /** 某节点「已就位的前置」的列重心；一个都没有时给 +∞，排在同层最后。 */
  const barycenter = (id: string): number => {
    let sum = 0;
    let count = 0;
    for (const parent of parentsOf.get(id) ?? []) {
      if (!inView.has(parent)) continue;
      const column = columnOf.get(parent);
      if (column === undefined) continue;
      sum += column;
      count += 1;
    }
    return count > 0 ? sum / count : Number.POSITIVE_INFINITY;
  };

  const byDepth = new Map<number, string[]>();
  for (const id of onPath) {
    const depth = depthOf.get(id)!;
    const list = byDepth.get(depth);
    if (list) list.push(id);
    else byDepth.set(depth, [id]);
  }

  const bands: OrderBand[] = [];
  const ordered: Array<{ nodes: string[]; offPath: boolean }> = [];
  for (const depth of [...byDepth.keys()].sort((a, b) => a - b)) {
    const layer = byDepth.get(depth)!;
    layer.sort((a, b) => (barycenter(a) - barycenter(b)) || cmpId(a, b));
    layer.forEach((id, column) => columnOf.set(id, column));
    bands.push({ value: depth, nodes: layer });
    ordered.push({ nodes: layer, offPath: false });
  }

  /*
   * 不在下游的那些：按「已就位的前置所在的平均层」排——它们多半是起始节点的前置
   * （层号更小）或完全无关的节点。这样同一片前置会挨在一起，而不是散成一片。
   */
  const offPath = [...offPathSet].sort((a, b) => (offPathBarycenter(a) - offPathBarycenter(b)) || cmpId(a, b));
  function offPathBarycenter(id: string): number {
    let sum = 0;
    let count = 0;
    for (const parent of parentsOf.get(id) ?? []) {
      if (!inView.has(parent)) continue;
      const depth = depthOf.get(parent);
      if (depth === undefined) continue;
      sum += depth;
      count += 1;
    }
    return count > 0 ? sum / count : Number.POSITIVE_INFINITY;
  }
  if (offPath.length > 0) {
    bands.push({ value: -1, nodes: offPath, offPath: true });
    ordered.push({ nodes: offPath, offPath: true });
  }

  const stepX = NODE_W + ORDER_LAYOUT.columnGap;
  const stepY = NODE_H + ORDER_LAYOUT.rowGap;
  const placed: PlacedNode[] = [];
  let row = 0;
  ordered.forEach((layer, index) => {
    // 「不在下游」的那一档前面空一行：它是**另一类**节点，不该与下游层黏在一起。
    if (layer.offPath && index > 0) row += ORDER_LAYOUT.offPathGapRows;
    const columns = Math.min(Math.max(layer.nodes.length, 1), ORDER_LAYOUT.maxColumns);
    // 每层在自己的行盒里居中：于是整张图是从起始节点向下张开的扇形，而不是左对齐的一片。
    const inset = ((ORDER_LAYOUT.maxColumns - columns) / 2) * stepX;
    layer.nodes.forEach((id, at) => {
      const column = at % ORDER_LAYOUT.maxColumns;
      const line = Math.floor(at / ORDER_LAYOUT.maxColumns);
      placed.push(placedNode(
        id,
        input.titles,
        ORDER_LAYOUT.margin + inset + column * stepX,
        ORDER_LAYOUT.margin + (row + line) * stepY,
        column,
        row + line,
      ));
    });
    row += Math.ceil(layer.nodes.length / ORDER_LAYOUT.maxColumns);
  });

  return {
    mode: 'learning',
    anchor: depthOf.has(input.start) ? input.start : '',
    layout: frame(placed, input.edges),
    bands,
    offPath,
    ranked: onPath.length,
    scores: new Map<string, number>(),
  };
}

/**
 * 一圈上最多放几张卡：由**弦长**下限反推容量。
 *
 * 为什么不用「弧长 ≥ minChord」这种更简单的写法：弧长与弦长在小圈上差得多
 * （3 张卡时弦长只有弧长的 0.83 倍），而「压不压卡片」只取决于弦长。
 * 反推：弦长 = 2r·sin(π/n) ≥ minChord ⟺ n ≤ π / asin(minChord / 2r)。
 */
function ringCapacity(radius: number): number {
  const ratio = Math.min(1, ORDER_LAYOUT.minChord / (2 * Math.max(radius, 1)));
  return Math.max(1, Math.floor(Math.PI / Math.asin(ratio)));
}

/** 角度重心：把内侧邻居的角度按单位向量求和再取角，跨 ±π 也不会算错。 */
function meanAngle(angles: readonly number[]): number {
  let sumX = 0;
  let sumY = 0;
  for (const angle of angles) {
    sumX += Math.cos(angle);
    sumY += Math.sin(angle);
  }
  return Math.atan2(sumY, sumX);
}

/**
 * 逻辑核心的摆位（见文件顶部第 2 条）。
 *
 * @param input.ids   视图里的节点
 * @param input.edges 视图里画出来的边（核心程度与角度次序都只看这张图）
 * @param input.core  核心节点（不在视图里时退到核心程度最高的那个）
 */
export function coreRingArrangement(input: CoreRingInput): OrderArrangement {
  const ids = [...input.ids].sort(cmpId);
  if (ids.length === 0) {
    return { mode: 'logic', anchor: '', layout: emptyLayout(), bands: [], offPath: [], ranked: 0, scores: new Map() };
  }
  const scores = coreScores(ids, input.edges);
  const core = ids.includes(input.core)
    ? input.core
    : ([...ids].sort((a, b) => ((scores.get(b) ?? 0) - (scores.get(a) ?? 0)) || cmpId(a, b))[0] ?? '');

  const neighbors = neighborMap(ids, input.edges);
  const rank = [...ids]
    .filter((id) => id !== core)
    .sort((a, b) => ((scores.get(b) ?? 0) - (scores.get(a) ?? 0))
      || ((neighbors.get(b)?.size ?? 0) - (neighbors.get(a)?.size ?? 0))
      || cmpId(a, b));

  const rings: string[][] = [[core]];
  let radius = ORDER_LAYOUT.ringStep;
  let at = 0;
  while (at < rank.length) {
    const capacity = ringCapacity(radius);
    const ring = rank.slice(at, at + capacity);
    at += ring.length;
    rings.push(ring);
    radius += ORDER_LAYOUT.ringStep;
  }

  /** 与核心直接相连的边权（第一圈的角度次序用；核心自己没有角度可参考）。 */
  const weightToCore = new Map<string, number>();
  for (const edge of input.edges) {
    if (edge.from === edge.to) continue;
    const other = edge.from === core ? edge.to : edge.to === core ? edge.from : null;
    if (other === null || !neighbors.has(other)) continue;
    weightToCore.set(other, (weightToCore.get(other) ?? 0) + Math.max(visualWeightOf(edge), 0.01));
  }

  const angleOf = new Map<string, number>();
  const ringOf = new Map<string, number>([[core, 0]]);
  const placeInRing = new Map<string, number>();
  for (let index = 1; index < rings.length; index += 1) {
    const ring = rings[index];
    /*
     * 第一圈用「与核心的连边强度」，再往外的圈用「内侧邻居的角度重心」：
     * 前者在核心周围没有角度可参考，只能按关系强弱排；后者才是「与内圈谁相连就转到谁那一侧」。
     */
    const keyed = ring.map((id) => {
      let key: number;
      if (index === 1) {
        const weight = weightToCore.get(id) ?? 0;
        key = weight > 0 ? -weight : Number.POSITIVE_INFINITY;
      } else {
        const inner: number[] = [];
        for (const other of neighbors.get(id) ?? []) {
          const angle = angleOf.get(other);
          if (angle !== undefined) inner.push(angle);
        }
        key = inner.length > 0 ? meanAngle(inner) : Number.POSITIVE_INFINITY;
      }
      return { id, key };
    });
    keyed.sort((a, b) => (a.key === b.key ? cmpId(a.id, b.id) : a.key - b.key));
    const total = keyed.length;
    keyed.forEach((entry, position) => {
      // 从正上方开始顺时针铺开：与「中心 → 周围」的读图方向一致。
      const angle = -Math.PI / 2 + (2 * Math.PI * position) / total;
      angleOf.set(entry.id, angle);
      ringOf.set(entry.id, index);
      placeInRing.set(entry.id, position);
    });
  }

  const placed = ids.map((id) => {
    const ring = ringOf.get(id) ?? 0;
    const angle = angleOf.get(id) ?? 0;
    const radius = ring * ORDER_LAYOUT.ringStep;
    return placedNode(
      id,
      input.titles,
      radius * Math.cos(angle),
      radius * Math.sin(angle),
      placeInRing.get(id) ?? 0,
      ring,
    );
  });
  // 归一化：把包围盒左上角挪到留白处（核心仍在图的中心，因为每一圈都是整圈）。
  const minX = Math.min(...placed.map((node) => node.x));
  const minY = Math.min(...placed.map((node) => node.y));
  for (const node of placed) {
    node.x += ORDER_LAYOUT.margin - minX;
    node.y += ORDER_LAYOUT.margin - minY;
  }

  return {
    mode: 'logic',
    anchor: core,
    layout: frame(placed, input.edges),
    bands: rings.map((nodes, value) => ({ value, nodes })),
    offPath: [],
    ranked: ids.length,
    scores,
  };
}
