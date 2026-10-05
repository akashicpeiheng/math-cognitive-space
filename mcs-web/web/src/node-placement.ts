/**
 * 新增节点的自动摆位。
 *
 * 用户的要求（原话）：「往知识网络里面添加节点的时候，自动做视觉优化，选择合适的位置把
 * 新增的节点放进去，使得新增节点不与原有的节点重叠，新增的关系尽可能少一点与已有的关系的交错。」
 *
 * 这件事**不能交给全局力导向重算**：`network.ts` 的 `layout()` 每次都会把所有节点重排一遍，
 * 加一个节点会让整个网络跳一下，而且它只按弹簧力近似避让，既不保证与手动摆放的节点不重叠，
 * 也不显式地数「新边与旧边交叉了几次」。这里改成增量摆位：
 *
 * 1. **已有的节点一个都不动**（这是「放进去」而不是「重排」的前提）；
 * 2. 新节点的候选位置由「邻居质心」周围的极坐标网格给出（确定性，不用随机数）；
 * 3. 硬约束：与任何已摆好的卡片不得重叠（含间隙），且不越出边界；
 * 4. 软目标按权重排序：**新边与已有边的交叉数** ≫ 边长 ≫ 离邻居质心的距离；
 * 5. 度数高的新节点先放（枢纽先落位，后来的邻居才能贴着它放）。
 *
 * 这个模块是叶子模块（只 import 类型），node 可以直接 import 做单元测试。
 */

/**
 * 软目标的权重（2026-10 提出常量，TODO B 的登记表要用它核对）。
 *
 * 交叉 ≫ 边长 ≫ 位移：宁可连边略长，也不要与已有关系缠在一起。
 * 这三个数是**设计取值**，不是实验结论（第三十七轮定的），
 * 提出常量是为了让「设计取值」那一节能核对到代码，而不是各写一份。
 */
export const PLACEMENT_SCORE = {
  crossing: 4000,
  length: 1,
  pull: 0.6,
} as const;

export interface PlacementPoint {
  x: number;
  y: number;
}

export interface PlacementCard extends PlacementPoint {
  id: string;
}

export interface PlacementLink {
  from: string;
  to: string;
}

export interface PlacementInput {
  /** 已经在图上的节点（顺序即优先级，位置一律不动）。 */
  existing: PlacementCard[];
  /** 需要在本次摆位的节点 id（函数会按度数重新排序）。 */
  pending: string[];
  /** 图上所有的边（含新边；两端不在图上的会被忽略）。 */
  links: PlacementLink[];
  /** 卡片尺寸。 */
  nodeWidth?: number;
  nodeHeight?: number;
  /** 卡片之间要求的最小间隙。 */
  gapX?: number;
  gapY?: number;
  /** 允许的坐标下界（左上留白）。 */
  margin?: number;
  /** 候选环的基准半径，默认取卡片宽度的 1.6 倍。 */
  baseRadius?: number;
}

export interface PlacementResult {
  placements: Map<string, PlacementPoint>;
  /** 统计信息：测试与界面都用它核对「确实做了优化」。 */
  stats: {
    /** 新边与已有边的交叉数（摆位后）。 */
    crossings: number;
    /** 新边的总长。 */
    edgeLength: number;
    /** 与最近卡片的最小间隙（像素，负数表示重叠）。 */
    minGap: number;
    /** 被拒绝的候选位置数（因为重叠或越界）。 */
    rejected: number;
  };
}

const DEFAULT_NODE_W = 172;
const DEFAULT_NODE_H = 58;

/**
 * 两线段是否**真交叉**。
 *
 * 三种情形要分清，混在一起会让「交错数」这个指标失真：
 * - 真交叉（两条线段的端点严格分居对方两侧）→ 算；
 * - 共线重叠（同一条直线上的两段有长度大于 0 的公共部分）→ 算，视觉上就是缠在一起；
 * - 只是端点相碰（T 形相接、共享端点）→ **不算**，那是「接上」而不是「交错」。
 */
export function segmentsCross(a1: PlacementPoint, a2: PlacementPoint, b1: PlacementPoint, b2: PlacementPoint): boolean {
  const d = (p: PlacementPoint, q: PlacementPoint, r: PlacementPoint) =>
    (q.x - p.x) * (r.y - p.y) - (q.y - p.y) * (r.x - p.x);
  const d1 = d(b1, b2, a1); const d2 = d(b1, b2, a2);
  const d3 = d(a1, a2, b1); const d4 = d(a1, a2, b2);

  // ① 真交叉：两侧符号严格相反。
  if (((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))) return true;

  // ② 共线重叠：四个叉积都为 0，且投影有长度大于 0 的公共部分。
  const collinear = [d1, d2, d3, d4].every((value) => Math.abs(value) < 1e-9);
  if (collinear) {
    const overlapX = Math.min(Math.max(a1.x, a2.x), Math.max(b1.x, b2.x)) - Math.max(Math.min(a1.x, a2.x), Math.min(b1.x, b2.x));
    const overlapY = Math.min(Math.max(a1.y, a2.y), Math.max(b1.y, b2.y)) - Math.max(Math.min(a1.y, a2.y), Math.min(b1.y, b2.y));
    return overlapX > 1e-6 || overlapY > 1e-6;
  }
  return false;
}

/** 一组边之间的交叉数；共享端点的两条边不算交叉（那是「相接」）。 */
export function countCrossings(links: PlacementLink[], at: Map<string, PlacementPoint>): number {
  const segments = links
    .filter((link) => at.has(link.from) && at.has(link.to) && link.from !== link.to)
    .map((link) => ({ from: link.from, to: link.to }));
  let crossings = 0;
  for (let i = 0; i < segments.length; i += 1) {
    for (let j = i + 1; j < segments.length; j += 1) {
      const first = segments[i]; const second = segments[j];
      if (first.from === second.from || first.from === second.to || first.to === second.from || first.to === second.to) continue;
      const a1 = at.get(first.from)!; const a2 = at.get(first.to)!;
      const b1 = at.get(second.from)!; const b2 = at.get(second.to)!;
      if (segmentsCross(a1, a2, b1, b2)) crossings += 1;
    }
  }
  return crossings;
}

/** 确定性候选方位：黄金角 + 由 id 派生的固定相位，避免同一批节点落在同一条射线上。 */
function phaseOf(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i += 1) hash = (hash * 31 + id.charCodeAt(i)) % 100000;
  return (hash / 100000) * Math.PI * 2;
}

function centroid(points: PlacementPoint[]): PlacementPoint | null {
  if (points.length === 0) return null;
  const sum = points.reduce((acc, point) => ({ x: acc.x + point.x, y: acc.y + point.y }), { x: 0, y: 0 });
  return { x: sum.x / points.length, y: sum.y / points.length };
}

export function placeNewNodes(input: PlacementInput): PlacementResult {
  const nodeW = input.nodeWidth ?? DEFAULT_NODE_W;
  const nodeH = input.nodeHeight ?? DEFAULT_NODE_H;
  const gapX = input.gapX ?? 24;
  const gapY = input.gapY ?? 16;
  const margin = input.margin ?? 28;
  const baseRadius = input.baseRadius ?? Math.round(nodeW * 1.6);

  const placed = new Map<string, PlacementPoint>(input.existing.map((node) => [node.id, { x: node.x, y: node.y }]));
  const boxes = input.existing.map((node) => ({ x: node.x, y: node.y }));
  const pending = new Set(input.pending.filter((id) => !placed.has(id)));

  const neighboursOf = (id: string): string[] => {
    const result: string[] = [];
    for (const link of input.links) {
      if (link.from === id && placed.has(link.to)) result.push(link.to);
      else if (link.to === id && placed.has(link.from)) result.push(link.from);
    }
    return result;
  };
  const degreeOf = (id: string): number => input.links.filter((link) => link.from === id || link.to === id).length;

  // 度数高的先放：枢纽先落位，其邻居随后能贴着它摆，而不是各自为政。
  const order = [...pending].sort((a, b) => degreeOf(b) - degreeOf(a) || a.localeCompare(b, 'en'));

  let rejected = 0;
  for (const id of order) {
    const existingPositions = [...placed.values()];
    const anchors = neighboursOf(id).map((other) => placed.get(other)!).filter(Boolean);
    const bboxCenter = existingPositions.length > 0 ? centroid(existingPositions)! : { x: 0, y: 0 };
    const anchor = centroid(anchors) ?? bboxCenter;

    const clashes = (point: PlacementPoint): boolean => boxes.some((box) => (
      Math.abs(point.x - box.x) < nodeW + gapX && Math.abs(point.y - box.y) < nodeH + gapY
    ));

    /*
     * 候选环：从**质心本身**开始（半径 0），再一圈圈往外。
     * 必须包含质心——邻居不多时，「就放在两个邻居中间」往往正是交叉最少的位置；
     * 第一版从 1.6 倍卡宽起步，等于把这个自然位置排除在外（实测因此比朴素摆放还多一次交叉）。
     */
    const radii = [0, baseRadius * 0.45, baseRadius, baseRadius * 1.5, baseRadius * 2.1, baseRadius * 2.8, baseRadius * 3.6];
    const ANGLE_STEPS = 24;
    const phase = phaseOf(id);
    let best: PlacementPoint | null = null;
    let bestScore = Infinity;

    for (const radius of radii) {
      const steps = radius === 0 ? 1 : ANGLE_STEPS;
      for (let step = 0; step < steps; step += 1) {
        const angle = phase + (step * 2 * Math.PI) / ANGLE_STEPS;
        const candidate = { x: anchor.x + radius * Math.cos(angle), y: anchor.y + radius * Math.sin(angle) };
        if (candidate.x < margin || candidate.y < margin) { rejected += 1; continue; }
        if (clashes(candidate)) { rejected += 1; continue; }

        // 只数这个节点自己的新边：先试放，再评交叉、边长与位移。
        const trial = new Map(placed);
        trial.set(id, candidate);
        const crossings = countCrossings(input.links, trial);
        const length = neighboursOf(id).reduce((acc, other) => {
          const point = trial.get(other)!;
          return acc + Math.hypot(candidate.x - point.x, candidate.y - point.y);
        }, 0);
        const pull = Math.hypot(candidate.x - anchor.x, candidate.y - anchor.y);
        // 交叉的权重远大于边长与位移：宁可连边略长，也不要与已有关系缠在一起。
        const score = crossings * PLACEMENT_SCORE.crossing + length * PLACEMENT_SCORE.length + pull * PLACEMENT_SCORE.pull;
        if (score < bestScore - 1e-9) { bestScore = score; best = candidate; }
      }
    }

    // 全被拒绝（图很密）时退一步：沿螺线找一个只保证不重叠的位置。
    if (!best) {
      for (let step = 0; step < 400 && !best; step += 1) {
        const radius = baseRadius * (1 + step / 40);
        const angle = phase + step * Math.PI * (3 - Math.sqrt(5));
        const candidate = { x: anchor.x + radius * Math.cos(angle), y: anchor.y + radius * Math.sin(angle) };
        if (candidate.x < margin || candidate.y < margin) continue;
        if (clashes(candidate)) continue;
        best = candidate;
      }
    }
    // 连螺线也放不下（极端情况）：放到已有卡片右侧扩展出去，保证不重叠。
    if (!best) {
      const rightMost = boxes.reduce((acc, box) => Math.max(acc, box.x), margin);
      best = { x: rightMost + nodeW + gapX, y: margin };
    }

    placed.set(id, best);
    boxes.push(best);
  }

  const crossings = countCrossings(input.links, placed);
  const newLinks = input.links.filter((link) => placed.has(link.from) && placed.has(link.to) && (pending.has(link.from) || pending.has(link.to)));
  const edgeLength = newLinks.reduce((acc, link) => {
    const a = placed.get(link.from)!; const b = placed.get(link.to)!;
    return acc + Math.hypot(a.x - b.x, a.y - b.y);
  }, 0);
  const minGap = boxes.reduce((acc, box, index) => {
    let nearest = acc;
    for (let other = index + 1; other < boxes.length; other += 1) {
      const candidate = boxes[other];
      const slackX = Math.abs(box.x - candidate.x) - nodeW;
      const slackY = Math.abs(box.y - candidate.y) - nodeH;
      const gap = Math.max(slackX, slackY);
      nearest = Math.min(nearest, gap);
    }
    return nearest;
  }, Infinity);

  return {
    placements: new Map([...placed].filter(([id]) => pending.has(id))),
    stats: { crossings, edgeLength: Math.round(edgeLength), minGap: Number.isFinite(minGap) ? Math.round(minGap) : Infinity, rejected },
  };
}
