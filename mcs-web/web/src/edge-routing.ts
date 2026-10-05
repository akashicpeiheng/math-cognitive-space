/**
 * 边的弧线策略：**实在绕不开的关系才弯**。
 *
 * 用户的要求：「给那些实在绕不开的关系设置弧线策略，减少遮挡的影响。」
 *
 * 「绕不开」在本模块里是三种可判定的情形，不做感觉上的判断：
 *
 * 1. **平行边**（同一对节点之间有多条关系）：直线必然完全重合，谁也看不出有几条——
 *    给它们一组对称的弓形偏移；
 * 2. **穿卡**：直线段从第三张卡片（不是它的两端）身上压过去，把节点标题遮住。
 *    弯到一侧让开这张卡，需要多少位移是算得出来的（见 `clearanceForRect`）；
 * 3. **共线重叠**：两条边夹角很小又几乎贴在一起，画出来是一条粗线。
 *    把其中一条挪开一个间距。
 *
 * 除此之外一律**保持直线**——见 `routeEdges` 末尾：没有冲突的边 bow 恒为 0。
 * 弧线是补救手段，不是风格：整张图都弯起来只会更难读。
 *
 * 这个模块是叶子模块（只 import 类型），node 可以直接 import 做单元测试。
 */
export interface RouteNode {
  id: string;
  /** 卡片左上角坐标（与渲染一致）。 */
  x: number;
  y: number;
}

export interface RouteEdge {
  id: string;
  from: string;
  to: string;
  /** 直线段的两个端点（卡片边缘上的锚点，由 `edgeAnchor` 给出）。 */
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface RouteOptions {
  nodeWidth?: number;
  nodeHeight?: number;
  /** 卡片外再留多少才算「让开」。 */
  padding?: number;
  /** 最大弓高（像素）：弯过头会把图搅乱。 */
  maxBow?: number;
  /** 平行边之间的间距。 */
  parallelSpacing?: number;
  /** 共线重叠判定：横向距离小于它才算贴在一起。 */
  overlapTolerance?: number;
}

/**
 * 默认取值（2026-10 提出常量，TODO B 的登记表要用它核对）。
 *
 * 这些数原先散在 `routeEdges` 里当 `?? 96` 这样的兜底字面量，两处麻烦：
 * 一是界面上要引用弓高上限时只能再写一遍数字（条款面板里就写过 `96px`，改常量就会说谎），
 * 二是「设计取值」那节表格无法核对。提到这里之后，代码与文档读的是同一个数。
 *
 * 取值来源与理由：
 * - `padding 10`：卡片外 10px 才算让开（第三十九轮）；
 * - `maxBow 96`：约半个卡片宽（172/2=86）；再弯就把图搅乱（第三十九轮的设计取值）；
 * - `parallelSpacing 18`：三条平行边 → −18 / 0 / +18（第三十九轮）；
 * - `anchorSpreadFactor 0.8`：锚点沿卡片边缘散开 = 间距 × 0.8 = 14.4px（第三十九轮）；
 * - `overlapTolerance 10`：两条边中点横向距离 < 10px 才算贴在一起（第三十九轮）。
 */
export const ROUTE_DEFAULTS = {
  padding: 10,
  maxBow: 96,
  parallelSpacing: 18,
  anchorSpreadFactor: 0.8,
  overlapTolerance: 10,
} as const;

export interface RouteResult {
  /** 每条边的弓高（正负表示弯向哪一侧），0 表示保持直线。 */
  bows: Map<string, number>;
  /** 控制点：二次贝塞尔的 C，弓高 = 控制点偏移的一半。 */
  controls: Map<string, { cx: number; cy: number }>;
  /**
   * 平行边沿卡片边缘的锚点位移。
   *
   * 为什么要动端点：同组边共用卡片中点作为锚点，几条弧线会在卡片边缘**挤成一个点**，
   * 箭头叠在一起反而更乱。按序号沿边缘散开（水平进出就挪 y，竖直进出就挪 x），
   * 弧线就从卡片的不同位置进出，一眼能数清有几条关系。
   */
  anchorShifts: Map<string, { dx1: number; dy1: number; dx2: number; dy2: number }>;
  /**
   * 统计。`throughCard` 是「因为压卡而被弯」的条数；
   * `throughCardResidual` 是**弯完仍然压着至少一张卡**的条数（详见下面的穿卡一节）。
   */
  stats: { parallel: number; throughCard: number; throughCardResidual: number; overlapping: number; straight: number };
}

const DEFAULT_NODE_W = 172;
const DEFAULT_NODE_H = 58;

/** 点 p 到线段 ab 的有符号横向距离（正负即哪一侧）。 */
function lateral(p: { x: number; y: number }, a: { x: number; y: number }, b: { x: number; y: number }): number {
  const dx = b.x - a.x; const dy = b.y - a.y;
  const length = Math.hypot(dx, dy) || 1;
  return ((p.x - a.x) * dy - (p.y - a.y) * dx) / length;
}

/** 二次贝塞尔上 t 处的点（弓形偏移 = 控制点偏移的一半）。 */
export function quadPoint(
  x1: number, y1: number, cx: number, cy: number, x2: number, y2: number, t: number,
): { x: number; y: number } {
  const u = 1 - t;
  return {
    x: u * u * x1 + 2 * u * t * cx + t * t * x2,
    y: u * u * y1 + 2 * u * t * cy + t * t * y2,
  };
}

/** 把控制点放在中点法线方向偏移 `bow * 2` 处（于是曲线顶点正好偏 `bow`）。 */
export function controlFor(edge: RouteEdge, bow: number): { cx: number; cy: number } {
  const dx = edge.x2 - edge.x1; const dy = edge.y2 - edge.y1;
  const length = Math.hypot(dx, dy) || 1;
  const nx = -dy / length; const ny = dx / length;
  const mx = (edge.x1 + edge.x2) / 2; const my = (edge.y1 + edge.y2) / 2;
  return { cx: mx + nx * bow * 2, cy: my + ny * bow * 2 };
}

/** 沿曲线采样的点（验收与穿卡判定共用同一套几何）。 */
export function sampleCurve(edge: RouteEdge, bow: number, steps = 12): Array<{ x: number; y: number }> {
  const { cx, cy } = controlFor(edge, bow);
  const points: Array<{ x: number; y: number }> = [];
  for (let index = 0; index <= steps; index += 1) {
    points.push(quadPoint(edge.x1, edge.y1, cx, cy, edge.x2, edge.y2, index / steps));
  }
  return points;
}

/**
 * 一条线段要绕开某个矩形，至少需要多大的弓高。
 *
 * 判据是「曲线顶点是否离开了矩形」：顶点在 t = 0.5 处，横向位移正好等于 bow。
 * 因此需要的 bow ≈ 矩形中心到直线的横向距离 + 矩形在该方向上的半宽 + 留白。
 * 方向取当前距离的符号——**就近绕开**，不强行统一到某一侧。
 */
function clearanceForRect(
  edge: RouteEdge, rect: { cx: number; cy: number; hx: number; hy: number }, padding: number,
): { side: number; needed: number } | null {
  const a = { x: edge.x1, y: edge.y1 }; const b = { x: edge.x2, y: edge.y2 };
  const length = Math.hypot(b.x - a.x, b.y - a.y);
  if (length < 1) return null;
  // 只在矩形落在**线段中部**时才算遮挡：端点附近本来就是贴着卡片进出的。
  const t = ((rect.cx - a.x) * (b.x - a.x) + (rect.cy - a.y) * (b.y - a.y)) / (length * length);
  if (t < 0.15 || t > 0.85) return null;
  const offset = lateral({ x: rect.cx, y: rect.cy }, a, b);
  const halfSpan = Math.abs((rect.hx * (b.y - a.y) + rect.hy * (b.x - a.x)) / length);
  const needed = Math.abs(offset) + halfSpan + padding;
  // 直线已经让开了这张卡（顶点离得够远），不需要弯。
  if (Math.abs(offset) > halfSpan + padding) return null;
  return { side: offset >= 0 ? 1 : -1, needed };
}

/**
 * 一条曲线压住了几张卡片（用同一条采样几何判定，**含 padding**）。
 *
 * 只在曲线中段判定（t ∈ [0.08, 0.92]）：端点附近贴着端点卡片进出是设计如此，
 * 那里的小重叠不算遮挡（`clearanceForRect` 也是同口径，只是范围更窄）。
 * 判据与界面验收用的那一套一致（逐点采样），因此「页面说没有压卡」与
 * 「读者看着没有压卡」不会各说各话。
 */
function cardsPressed(
  edge: RouteEdge, bow: number, cards: Array<{ id: string; cx: number; cy: number; hx: number; hy: number }>, padding: number,
): number {
  const points = sampleCurve(edge, bow, 32);
  let pressed = 0;
  for (const card of cards) {
    if (card.id === edge.from || card.id === edge.to) continue;
    const hit = points.some((point, index) => {
      const t = index / (points.length - 1);
      if (t < 0.08 || t > 0.92) return false;
      return Math.abs(point.x - card.cx) < card.hx + padding && Math.abs(point.y - card.cy) < card.hy + padding;
    });
    if (hit) pressed += 1;
  }
  return pressed;
}

/**
 * 候选弓高：由每一张挡路的卡片反解出来的「刚好绕开」量，正负两侧各取几档。
 *
 * 为什么不是「取最苛刻的那张卡、按它算一个弓高」：那是第一版的做法，实测**弯了还是压卡**——
 * 同一张图上可能同时有左右两侧的挡路卡，按最苛刻的一张弯过去，正好撞进另一张；
 * 而且 `min(maxBow, needed)` 一旦被上限截断，就再也没有第二次机会。
 * 现在把候选摊开，由 `cardsPressed` 逐个验，选**真的压得最少**的那个。
 */
function candidateBows(
  edge: RouteEdge,
  cards: Array<{ id: string; cx: number; cy: number; hx: number; hy: number }>,
  options: { padding: number; maxBow: number; spacing: number },
): number[] {
  const values = new Set<number>();
  for (const card of cards) {
    if (card.id === edge.from || card.id === edge.to) continue;
    const need = clearanceForRect(edge, card, options.padding);
    if (!need) continue;
    for (const sign of [need.side, -need.side]) {
      for (const extra of [0, options.spacing, options.spacing * 2]) {
        values.add(sign * Math.min(options.maxBow, need.needed + extra));
      }
    }
  }
  // 再补几档「绕得更远」的量：挡路卡可能需要绕过的不止一张。
  for (const step of [0.4, 0.6, 0.8, 1]) {
    values.add(options.maxBow * step);
    values.add(-options.maxBow * step);
  }
  values.delete(0);
  // 从小到大试：能清空就选最不弯的那个；都清不空时也偏好小幅修正。
  return [...values].sort((left, right) => Math.abs(left) - Math.abs(right) || left - right);
}

export function routeEdges(nodes: RouteNode[], edges: RouteEdge[], options: RouteOptions = {}): RouteResult {
  const nodeW = options.nodeWidth ?? DEFAULT_NODE_W;
  const nodeH = options.nodeHeight ?? DEFAULT_NODE_H;
  // 默认值统一从 ROUTE_DEFAULTS 取（界面与文档核对的是同一处，见那里的说明）。
  const padding = options.padding ?? ROUTE_DEFAULTS.padding;
  const maxBow = options.maxBow ?? ROUTE_DEFAULTS.maxBow;
  const parallelSpacing = options.parallelSpacing ?? ROUTE_DEFAULTS.parallelSpacing;
  const overlapTolerance = options.overlapTolerance ?? ROUTE_DEFAULTS.overlapTolerance;

  const bows = new Map<string, number>();
  const controls = new Map<string, { cx: number; cy: number }>();
  const anchorShifts = new Map<string, { dx1: number; dy1: number; dx2: number; dy2: number }>();
  const stats = { parallel: 0, throughCard: 0, throughCardResidual: 0, overlapping: 0, straight: 0 };
  const rects = nodes.map((node) => ({ id: node.id, cx: node.x + nodeW / 2, cy: node.y + nodeH / 2, hx: nodeW / 2, hy: nodeH / 2 }));

  /*
   * ① 平行边：同一对节点（无序）之间的边共用一个对称的偏移序列。
   *
   * 关键细节（第一版在这里错了）：弓高是沿**这条边自己的法线**量的，
   * 而同一对节点的边可能一条写成 A→B、另一条写成 B→A，法线方向相反；
   * 若各按自己的方向翻符号，两个**不同的**对称值会落到**同一侧**上
   * （实测三条边得到 [18, 0, 18]，两条仍然重合）。
   * 因此先取组内参考方向，再把每条的弓高统一折算到同一个世界侧。
   */
  const perpendicular = (edge: RouteEdge) => {
    const dx = edge.x2 - edge.x1; const dy = edge.y2 - edge.y1;
    const length = Math.hypot(dx, dy) || 1;
    return { nx: -dy / length, ny: dx / length };
  };
  const groups = new Map<string, string[]>();
  for (const edge of edges) {
    const key = [edge.from, edge.to].sort().join('~');
    const list = groups.get(key) ?? [];
    list.push(edge.id);
    groups.set(key, list);
  }
  for (const ids of groups.values()) {
    if (ids.length < 2) continue;
    ids.sort((a, b) => a.localeCompare(b, 'en'));
    const reference = perpendicular(edges.find((item) => item.id === ids[0])!);
    ids.forEach((id, index) => {
      // 对称分布：n=2 → ±0.5；n=3 → -1,0,+1（中间的保持直线，是最自然的那条）。
      const centered = index - (ids.length - 1) / 2;
      const edge = edges.find((item) => item.id === id)!;
      const normal = perpendicular(edge);
      // 与参考法线同向取 +1、反向取 -1：折算后的世界侧只由 centered 决定。
      const align = normal.nx * reference.nx + normal.ny * reference.ny >= 0 ? 1 : -1;
      bows.set(id, centered * parallelSpacing * align);
      /*
       * 锚点散开：水平进出的边挪 y、竖直进出的边挪 x（与 `edgeAnchor` 的判定同口径）。
       * 位移沿用 `centered`，因此与弓高的顺序一致：弯得最远的那条从边缘最外侧进出。
       */
      const horizontal = Math.abs(edge.x2 - edge.x1) >= Math.abs(edge.y2 - edge.y1);
      const shift = centered * parallelSpacing * ROUTE_DEFAULTS.anchorSpreadFactor;
      anchorShifts.set(id, horizontal
        ? { dx1: 0, dy1: shift, dx2: 0, dy2: shift }
        : { dx1: shift, dy1: 0, dx2: shift, dy2: 0 });
      stats.parallel += 1;
    });
  }

  /*
   * ② 穿卡：直线压住第三张卡片时弯出去。
   *
   * **第二版（2026-10）**：不再「取最苛刻的一张卡、算一个弓高就完事」——实测那样弯了还是压卡：
   * 同一张图上可能左右两侧都有挡路卡，按一侧弯过去正好撞进另一侧；而且弓高一旦被上限截断，
   * 就再没有第二次机会。现在的做法是**在候选弓高里挑真的压得最少的那个**：
   *
   * 1. 先量直线压了几张卡：0 张就不弯（弧线是补救，不是风格）；
   * 2. 由每张挡路卡反解出「刚好绕开」的弓高（正负两侧、再加几档余量），连同几档大弓高一起当候选；
   * 3. 逐个候选量「这条曲线还压着几张卡」，取**压卡数严格更少**的那个；一样多就保持直线。
   *
   * 这样保证：弯过的边一定比直线压得少。**但不保证清空**——密排视图里可能任何弓高都绕不过去
   * （弓高上限见 options.maxBow）。清不空的条数如实记在 `stats.throughCardResidual` 里，
   * 界面上也照实说，不假装「弧线一定解决遮挡」。
   */
  for (const edge of edges) {
    if (bows.has(edge.id)) continue;
    const straightPressed = cardsPressed(edge, 0, rects, padding);
    if (straightPressed === 0) continue;
    let best: { bow: number; pressed: number } = { bow: 0, pressed: straightPressed };
    for (const bow of candidateBows(edge, rects, { padding, maxBow, spacing: parallelSpacing })) {
      const pressed = cardsPressed(edge, bow, rects, padding);
      if (pressed < best.pressed) best = { bow, pressed };
      if (best.pressed === 0) break;
    }
    if (best.bow !== 0) {
      bows.set(edge.id, best.bow);
      stats.throughCard += 1;
    }
  }

  /*
   * ③ 共线重叠：两条边几乎平行又贴在一起时，画出来是一条粗线，看不出是两条关系。
   *
   * 做法是与**已经定型的边**（前面的边）逐个比对：夹角很小（|cos| 接近 1）
   * 且中点横向距离小于容差，就把当前这条往一侧挪一个间距，挪完再验一次，最多挪到弓高上限。
   * 顺序固定（按 edges 的输入顺序），因此结果确定，也不会有「互相追着挪」的发散。
   */
  const direction = (edge: RouteEdge) => {
    const dx = edge.x2 - edge.x1; const dy = edge.y2 - edge.y1;
    const length = Math.hypot(dx, dy) || 1;
    return { dx: dx / length, dy: dy / length };
  };
  const midpointOf = (edge: RouteEdge) => {
    const bow = bows.get(edge.id) ?? 0;
    const control = controlFor(edge, bow);
    return quadPoint(edge.x1, edge.y1, control.cx, control.cy, edge.x2, edge.y2, 0.5);
  };
  for (let i = 0; i < edges.length; i += 1) {
    const edge = edges[i];
    const dir = direction(edge);
    const a = { x: edge.x1, y: edge.y1 };
    const b = { x: edge.x2, y: edge.y2 };
    for (let j = 0; j < i; j += 1) {
      const other = edges[j];
      const otherDir = direction(other);
      const cos = Math.abs(dir.dx * otherDir.dx + dir.dy * otherDir.dy);
      if (cos < 0.97) continue; // 不平行，谈不上重叠
      const otherMid = midpointOf(other);
      let gap = Math.abs(lateral(otherMid, a, b));
      if (gap >= overlapTolerance) continue;
      // 往「离对方更远」的一侧挪；正好压在上面时按 id 定一个稳定的方向。
      const side = gap > 0.5
        ? Math.sign(lateral(otherMid, a, b)) * -1
        : (edge.id < other.id ? 1 : -1);
      let bow = bows.get(edge.id) ?? 0;
      for (let attempt = 0; attempt < 8; attempt += 1) {
        bow += parallelSpacing * side;
        if (Math.abs(bow) > maxBow) { bow = maxBow * side; break; }
        const control = controlFor(edge, bow);
        const mid = quadPoint(edge.x1, edge.y1, control.cx, control.cy, edge.x2, edge.y2, 0.5);
        gap = Math.abs(lateral(mid, { x: other.x1, y: other.y1 }, { x: other.x2, y: other.y2 }));
        if (gap >= overlapTolerance) break;
      }
      const before = bows.get(edge.id) ?? 0;
      if (Math.abs(bow) > Math.abs(before)) { bows.set(edge.id, bow); stats.overlapping += 1; }
      break; // 一条边只处理一次，避免与多条边互相推挤后失控
    }
  }

  for (const edge of edges) {
    const bow = bows.get(edge.id) ?? 0;
    if (Math.abs(bow) < 0.5) { bows.set(edge.id, 0); stats.straight += 1; continue; }
    controls.set(edge.id, controlFor(edge, bow));
  }
  // 残余压卡：弯完之后仍然压着卡片的条数（如实回报，见上面穿卡一节）。
  for (const edge of edges) {
    if (cardsPressed(edge, bows.get(edge.id) ?? 0, rects, padding) > 0) stats.throughCardResidual += 1;
  }
  return { bows, controls, anchorShifts, stats };
}


