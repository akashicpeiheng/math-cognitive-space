/**
 * 学习路线动画里的「丝质箭头」：从刚立住的节点，绵延到下一阶段的目标节点。
 *
 * ## 为什么是「丝」而不是一个多边形
 *
 * 回放动画按步推进，每一步只是让一张卡片淡入。看的人能看到「又多了一个节点」，
 * 却看不出这一步是**朝哪儿去**的。最早的做法是一块半透明的四边形 + 一个三角箭头，
 * 但那条光束两端都说不清是谁：尾巴悬在一堆卡片中间的空地上，尖端戳着一张看不清的小卡片。
 *
 * 现在的形状是**一组渐细的丝带**：从源卡片底下吐出来，带弧度地分流（分叉），
 * 在中段互相交叠出丝一样的光泽，再收束成箭镞钉在目标卡片上。这样做同时解决三件事：
 *
 * 1. **两端可辨认**：丝带的根部压在源卡片底下（卡片不透明，看起来就是从那张卡片流出来的），
 *    尖端停在目标卡片边缘外 7px。两端都贴着真实卡片。
 * 2. **绵延**：力导向布局把相邻两步的卡片拉到几乎贴在一起（实测边到边只有 16–110px），
 *    所以根部取源卡片的**背面**而不是正面——丝带整个从卡片底下穿过，可见部分至少有一张卡片长。
 * 3. **分叉是几何事实**：多股丝带各有各的横向偏移与弧度，起于源卡片不同位置、
 *    终于同一个箭镞底部，于是「从一个点散开、再收成一支箭」不必靠加装饰。
 *
 * ## 纯函数
 *
 * 不碰 DOM、不读测量值，所有输出都是 SVG 属性字符串，因此可以在 node 里直接单测：
 * 「每股丝带两端收细、中段最宽」「分叉确实分开了」「箭镞停在卡片外」都可核对。
 */

export interface Point {
  x: number;
  y: number;
}

export interface StageArrowInput {
  /** 源节点**中心**（世界坐标）。空数组时返回 null。 */
  from: Point[];
  /** 目标节点**中心**。 */
  to: Point;
  sourceW: number;
  sourceH: number;
  targetW: number;
  targetH: number;
  /**
   * 需要避开的**其它卡片中心**。
   *
   * 为什么需要：力导向布局把相邻两步的卡片拉到几乎贴在一起（实测边到边只有 16–110），
   * 而卡片是不透明的、画在丝带之上。于是「从源卡片直着连到目标卡片」的丝带
   * 有九成压在源卡片自己底下——实测第 5 步里 182 长的丝带只有 44 露在外面。
   * 两侧的空白才是丝该走的地方，所以要先把卡片位置告诉几何。
   * 两端自己的卡片由函数内部排除（丝带本来就要从它们底下穿过）。
   */
  avoid?: Point[];
}

/** 一股丝带。 */
export interface StageStrand {
  /** 闭合轮廓路径（`d` 属性直接可用）。 */
  body: string;
  /** 中段峰值宽度（世界单位）。 */
  peakWidth: number;
  /** 根部的横向偏移：正负两侧就是「分叉」。 */
  offset: number;
}

export interface StageArrowGeometry {
  /** 分叉的丝带，从外向里排列。 */
  strands: StageStrand[];
  /** 箭镞（凹边，细长，和丝带同族）。 */
  head: string;
  /** 中央丝线：画成流动虚线，让「往那边去」这件事自己动起来。 */
  flow: string;
  /** 丝带根部所在的那张源卡片在 `from` 里的下标。 */
  sourceIndex: number;
  /** 根部（源卡片背面）与尖端，供测试与调试核对。 */
  origin: Point;
  tip: Point;
  /** 箭镞底边中点。 */
  headBase: Point;
  /** 根部到尖端的距离。 */
  length: number;
  /** 根部横向分叉的总宽度。 */
  forkWidth: number;
}

/** 丝带股数：奇数，正中一股走主轴。 */
const STRAND_COUNT = 5;
/** 尾部飘出的长度（相对可画长度的比例与上下限）：这是「绵延」的来源。 */
const TRAIL_RATIO = 0.2;
const TRAIL_MIN = 18;
const TRAIL_MAX = 64;
/** 整束丝的侧向弧高候选（相对可画长度）：丝绕开卡片走空白处，靠的就是这个。 */
const ARC_OPTIONS = [0.45, 0.78, 1.15];
/** 外侧丝带比内侧多绕多少（相对弧高）。 */
const ARC_FAN = 0.3;
/** 根部偏移对弧线的横向贡献：让分叉在整条丝上保持分离。 */
const ARC_SPREAD = 0.55;
/** S 形的后半段反向幅度：同向鼓到底会变成弓，反向才像丝在飘。 */
const STRAND_S = 0.32;
/** 交错幅度：相邻丝带一左一右地绕，交叠处才出丝的光泽。 */
const STRAND_BRAID = 0.08;
/** 弧线「够空」的阈值：超过它就不再为了更空而绕更远，免得丝飞出画面。 */
const ENOUGH_CLEARANCE = 96;
/** 根部横向分叉的半宽范围。 */
const FORK_HALF_MIN = 30;
const FORK_HALF_MAX = 84;
/** 丝带峰值宽度（相对可画长度）与上下限。 */
const STRAND_WIDTH_RATIO = 0.088;
const STRAND_WIDTH_MIN = 11;
const STRAND_WIDTH_MAX = 30;
/** 箭镞：长度与底边半宽。 */
const HEAD_LEN_RATIO = 0.3;
const HEAD_LEN_MIN = 26;
const HEAD_LEN_MAX = 62;
const HEAD_HALF_RATIO = 0.44;
const HEAD_HALF_MIN = 11;
const HEAD_HALF_MAX = 25;
/** 凹边箭镞的控制点比例：越小越「掠」。 */
const HEAD_CONCAVE = 0.34;
/** 尖端与目标卡片之间留的空隙，别把卡片戳穿。 */
const TIP_GAP = 7;
/**
 * 箭头至少要有多长才值得画。
 *
 * 这里量的是「源卡片背面 → 目标卡片前面」，因此正常情况下远超它——
 * 真正的相邻两张卡片（中心距 ≈ 卡片尺寸）正面边到边只有十几像素，算上背面就有一张卡片那么长。
 */
const MIN_LENGTH = 52;

const clamp = (value: number, low: number, high: number) => Math.min(Math.max(value, low), high);
const round = (value: number) => Math.round(value * 10) / 10;

function centroid(points: Point[]): Point {
  const sum = points.reduce((acc, point) => ({ x: acc.x + point.x, y: acc.y + point.y }), { x: 0, y: 0 });
  return { x: sum.x / points.length, y: sum.y / points.length };
}

/**
 * 从节点中心沿 `u` 方向退到矩形边界上所需的距离。
 *
 * 用矩形而不是圆：卡片是圆角矩形，按圆算会让箭头在水平/垂直方向上离得太远、
 * 在斜角方向上又戳进卡片里。
 */
function rectExitDistance(u: Point, halfW: number, halfH: number): number {
  const ax = Math.abs(u.x);
  const ay = Math.abs(u.y);
  const tx = ax > 1e-6 ? halfW / ax : Number.POSITIVE_INFINITY;
  const ty = ay > 1e-6 ? halfH / ay : Number.POSITIVE_INFINITY;
  return Math.min(tx, ty);
}

/** 三次贝塞尔取点。 */
function cubicPoint(p0: Point, c1: Point, c2: Point, p3: Point, t: number): Point {
  const s = 1 - t;
  const a = s * s * s;
  const b = 3 * s * s * t;
  const c = 3 * s * t * t;
  const d = t * t * t;
  return {
    x: a * p0.x + b * c1.x + c * c2.x + d * p3.x,
    y: a * p0.y + b * c1.y + c * c2.y + d * p3.y,
  };
}

/** 三次贝塞尔的切向（未单位化）。 */
function cubicTangent(p0: Point, c1: Point, c2: Point, p3: Point, t: number): Point {
  const s = 1 - t;
  return {
    x: 3 * s * s * (c1.x - p0.x) + 6 * s * t * (c2.x - c1.x) + 3 * t * t * (p3.x - c2.x),
    y: 3 * s * s * (c1.y - p0.y) + 6 * s * t * (c2.y - c1.y) + 3 * t * t * (p3.y - c2.y),
  };
}

/**
 * 丝带的粗细包络：两端收细、中段饱满。
 *
 * 两端各留 26% 而不是收到 0：根部压在卡片底下，收成针尖会在卡片边缘露出一个尖角；
 * 末端收成 0 又会让几股丝带在箭镞前「断掉」。留一点宽度，视觉上是连续的丝。
 */
function strandEnvelope(t: number): number {
  return Math.pow(Math.sin(Math.PI * (0.06 + 0.88 * t)), 0.8);
}

/** 把一条三次贝塞尔按粗细包络铺成闭合的丝带轮廓。 */
function ribbonPath(p0: Point, c1: Point, c2: Point, p3: Point, peakWidth: number, samples = 18): string {
  const left: string[] = [];
  const right: string[] = [];
  for (let index = 0; index <= samples; index += 1) {
    const t = index / samples;
    const point = cubicPoint(p0, c1, c2, p3, t);
    const tangent = cubicTangent(p0, c1, c2, p3, t);
    const norm = Math.hypot(tangent.x, tangent.y) || 1;
    const nx = -tangent.y / norm;
    const ny = tangent.x / norm;
    const half = (peakWidth * strandEnvelope(t)) / 2;
    left.push(`${round(point.x + nx * half)},${round(point.y + ny * half)}`);
    right.push(`${round(point.x - nx * half)},${round(point.y - ny * half)}`);
  }
  return `M ${left.join(' L ')} L ${right.reverse().join(' L ')} Z`;
}

/** 点到矩形（中心 cx,cy，半宽 halfW、半高 halfH）的距离；点在矩形内为 0。 */
function pointRectDistance(point: Point, rect: { cx: number; cy: number; halfW: number; halfH: number }): number {
  const dx = Math.max(Math.abs(point.x - rect.cx) - rect.halfW, 0);
  const dy = Math.max(Math.abs(point.y - rect.cy) - rect.halfH, 0);
  return Math.hypot(dx, dy);
}

/**
 * 一条候选弧线「有多空」：沿中线采样，取到所有障碍卡片的最小距离。
 *
 * 只用来在两侧之间挑一边，不追求精确的避障；两侧都挤时也能给出一个「比较不挤」的答案。
 *
 * 采样只取**后半段**（`FROM`–`TO`）。
 *
 * 为什么不是整条：丝带的设计就是从源卡片背面起笔、从卡片底下穿出来，
 * 因此前四成路径本来就压在卡片底下——把它算进来，任何一条弧线都会「撞」到源卡片，
 * 六个候选的得分全是 0，搜索就白做了（这正是上一版第 2 步选错边的原因）。
 * 后半段才是丝真正露在外面的部分，只有它该被推离卡片。
 */
const CLEARANCE_FROM = 0.5;
const CLEARANCE_TO = 0.95;
function clearanceOf(
  start: Point, control1: Point, control2: Point, end: Point,
  rects: Array<{ cx: number; cy: number; halfW: number; halfH: number }>,
): number {
  if (rects.length === 0) return Number.POSITIVE_INFINITY;
  let worst = Number.POSITIVE_INFINITY;
  const samples = 12;
  for (let index = 0; index <= samples; index += 1) {
    const t = CLEARANCE_FROM + (CLEARANCE_TO - CLEARANCE_FROM) * (index / samples);
    const point = cubicPoint(start, control1, control2, end, t);
    let nearest = Number.POSITIVE_INFINITY;
    for (const rect of rects) nearest = Math.min(nearest, pointRectDistance(point, rect));
    worst = Math.min(worst, nearest);
  }
  return worst;
}

export function stageArrowGeometry({
  from, to, sourceW, sourceH, targetW, targetH, avoid = [],
}: StageArrowInput): StageArrowGeometry | null {
  if (from.length === 0) return null;
  const centre = centroid(from);

  const dx = to.x - centre.x;
  const dy = to.y - centre.y;
  const distance = Math.hypot(dx, dy);
  // 源与目标重合：没有方向可言。
  if (distance < 1) return null;
  const ux = dx / distance;
  const uy = dy / distance;
  const u = { x: ux, y: uy };
  // 垂直于前进方向。
  const p = { x: -uy, y: ux };

  /*
   * 根部取「沿前进方向最靠前的那张源卡片」。
   *
   * 单源时它就是那张卡片；多源（回放第 0 帧的起点集合可能有十几个）时，
   * 丝带从最靠近目标的那张卡片底下吐出来，读起来是「从这一片的前沿出发」。
   */
  let sourceIndex = 0;
  let bestProjection = Number.NEGATIVE_INFINITY;
  from.forEach((point, index) => {
    const projection = (point.x - centre.x) * ux + (point.y - centre.y) * uy;
    if (projection > bestProjection) { bestProjection = projection; sourceIndex = index; }
  });
  const sourceCentre = from[sourceIndex];

  const sourceExit = rectExitDistance(u, sourceW / 2, sourceH / 2);
  const targetExit = rectExitDistance(u, targetW / 2, targetH / 2);

  // 根部在源卡片的**背面**：丝带整个从卡片底下穿过，可见部分至少有一张卡片那么长。
  const origin = { x: sourceCentre.x - ux * sourceExit, y: sourceCentre.y - uy * sourceExit };
  const tip = { x: to.x - ux * (targetExit + TIP_GAP), y: to.y - uy * (targetExit + TIP_GAP) };

  const length = Math.hypot(tip.x - origin.x, tip.y - origin.y);
  if (!Number.isFinite(length) || length < MIN_LENGTH) return null;

  // 箭镞占最后一小段，丝带全部收在它后面。
  const headLen = clamp(length * HEAD_LEN_RATIO, HEAD_LEN_MIN, HEAD_LEN_MAX);
  const headHalf = clamp(headLen * HEAD_HALF_RATIO, HEAD_HALF_MIN, HEAD_HALF_MAX);
  const headBase = { x: tip.x - ux * headLen, y: tip.y - uy * headLen };
  // 丝带终点：从箭镞底边再往回收 3，免得几股丝在箭镞边上堆出毛刺。
  const strandEnd = { x: headBase.x - ux * 3, y: headBase.y - uy * 3 };
  /*
   * 分叉半宽：源集合越分散，根部张得越开；单点出发时也留一个基础宽度，
   * 否则五股丝带会叠成一条线，「分叉」就读不出来了。
   */
  const spread = Math.max(...from.map((point) => Math.hypot(point.x - centre.x, point.y - centre.y)));
  const forkHalf = clamp(Math.max(spread * 0.5, FORK_HALF_MIN), FORK_HALF_MIN, FORK_HALF_MAX);
  const baseWidth = clamp(length * STRAND_WIDTH_RATIO, STRAND_WIDTH_MIN, STRAND_WIDTH_MAX);

  /*
   * 尾丝：丝带不从根部起步，而是从根部**再往后**飘一段才起笔。
   *
   * 为什么需要它：相邻两步的卡片本来就贴得近，只连两张卡片的话丝带只有一张卡片长，
   * 「绵延」根本无从谈起。向后拖一段尾丝之后，整条丝从源卡片背后飘出来、
   * 绕过卡片、再收束到箭镞——这才是丝绸的连续性。
   */
  const trail = clamp(length * TRAIL_RATIO, TRAIL_MIN, Math.min(TRAIL_MAX, length * 0.35));
  const tail = { x: origin.x - ux * trail, y: origin.y - uy * trail };

  /*
   * 挑一条最空的走法：在「两侧 × 三档弧高」六个候选里，选中段离所有卡片最远的那个。
   *
   * 为什么非要搜而不是定一个弧高：卡片是 172×58 的大块，而相邻两步的中心距只有 97–190，
   * 空白的位置每帧都不一样——实测第 5 步的空白在上方、第 2 步的空白在左下，
   * 同一个弧高不可能两头都合适。判据本身很便宜（十几个采样点乘卡片数），
   * 却决定了这一帧的丝是「飘在空处」还是「整束盖在卡片底下」。
   *
   * 障碍包含**所有**卡片，源卡片与目标卡片也不例外：中段采样本来就不含两端附近，
   * 它们因此只会把中段推开，不会因为「丝带本来就贴着它们」而被误判。
   *
   * 评分先封顶再比：一旦已经足够空，就选弧高最小的那个——
   * 否则任何一帧都会去选最夸张的弧线，丝会飞出画面。
   */
  const probeEnd = strandEnd;
  const obstacleRects = avoid.map((point) => ({
    cx: point.x, cy: point.y, halfW: targetW / 2, halfH: targetH / 2,
  }));
  const controlsFor = (probeSide: number, probeArc: number) => ({
    control1: {
      x: tail.x + ux * (length * 0.36) + p.x * probeSide * probeArc,
      y: tail.y + uy * (length * 0.36) + p.y * probeSide * probeArc,
    },
    control2: {
      x: probeEnd.x - ux * (length * 0.3) + p.x * probeSide * probeArc * 0.5,
      y: probeEnd.y - uy * (length * 0.3) + p.y * probeSide * probeArc * 0.5,
    },
  });
  let best = { side: 1, arcHeight: length * ARC_OPTIONS[0], score: -1 };
  for (const probeSide of [1, -1]) {
    for (const ratio of ARC_OPTIONS) {
      const probeArc = length * ratio;
      const { control1, control2 } = controlsFor(probeSide, probeArc);
      const clearance = clearanceOf(tail, control1, control2, probeEnd, obstacleRects);
      const score = Math.min(clearance, ENOUGH_CLEARANCE);
      // 同分时取弧高更小的：够用就好，不为了好看多绕一圈。
      if (score > best.score + 1e-9) best = { side: probeSide, arcHeight: probeArc, score };
    }
  }
  const { side, arcHeight } = best;

  const strands: StageStrand[] = [];
  const middle = (STRAND_COUNT - 1) / 2;
  for (let index = 0; index < STRAND_COUNT; index += 1) {
    // −1 … +1：根部从一侧排到另一侧。
    const slot = (index - middle) / middle;
    const offset = slot * forkHalf;
    const start = {
      x: tail.x + p.x * offset,
      y: tail.y + p.y * offset,
    };
    /*
     * 弧度：整束先甩向较空的一侧（外侧的丝甩得更远，于是束是«散»的），
     * 相邻两股再各偏一点相反方向，中段互相穿插、交叠处叠出更深的一层——
     * 那就是「丝」的光泽来源。两个控制点方向相反，弧线因此是一个 S 而不是一段弓：
     * 丝是飘的，弓是绷的。
     */
    const bow = side * arcHeight * (1 + ARC_FAN * Math.abs(slot))
      + offset * ARC_SPREAD
      + (index % 2 === 0 ? 1 : -1) * forkHalf * STRAND_BRAID;
    const control1 = {
      x: start.x + ux * (length * 0.36) + p.x * bow,
      y: start.y + uy * (length * 0.36) + p.y * bow,
    };
    const control2 = {
      x: probeEnd.x - ux * (length * 0.3) - p.x * bow * STRAND_S,
      y: probeEnd.y - uy * (length * 0.3) - p.y * bow * STRAND_S,
    };
    // 外侧的丝带更细：中段最粗的那股是主轴。
    const peakWidth = baseWidth * (1 - 0.5 * Math.abs(slot));
    strands.push({
      body: ribbonPath(start, control1, control2, probeEnd, peakWidth),
      peakWidth: round(peakWidth),
      offset: round(offset),
    });
  }

  // 箭镞：凹边细长的「掠」形，比实心三角轻，和丝带同族。
  const barbRight = { x: headBase.x + p.x * headHalf, y: headBase.y + p.y * headHalf };
  const barbLeft = { x: headBase.x - p.x * headHalf, y: headBase.y - p.y * headHalf };
  const concave = headLen * HEAD_CONCAVE;
  const inset = headHalf * HEAD_CONCAVE;
  const controlRight = { x: tip.x - ux * concave + p.x * inset, y: tip.y - uy * concave + p.y * inset };
  const controlLeft = { x: tip.x - ux * concave - p.x * inset, y: tip.y - uy * concave - p.y * inset };
  const head = [
    `M ${round(tip.x)},${round(tip.y)}`,
    `Q ${round(controlRight.x)},${round(controlRight.y)} ${round(barbRight.x)},${round(barbRight.y)}`,
    `L ${round(barbLeft.x)},${round(barbLeft.y)}`,
    `Q ${round(controlLeft.x)},${round(controlLeft.y)} ${round(tip.x)},${round(tip.y)}`,
    'Z',
  ].join(' ');

  // 中央丝线：沿主轴一条，画成流动虚线。
  const flowStart = { x: origin.x + ux * length * 0.12, y: origin.y + uy * length * 0.12 };
  const flowEnd = { x: headBase.x - ux * 4, y: headBase.y - uy * 4 };

  return {
    strands,
    head,
    flow: `M ${round(flowStart.x)},${round(flowStart.y)} L ${round(flowEnd.x)},${round(flowEnd.y)}`,
    sourceIndex,
    origin: { x: round(origin.x), y: round(origin.y) },
    tip: { x: round(tip.x), y: round(tip.y) },
    headBase: { x: round(headBase.x), y: round(headBase.y) },
    length: round(length),
    forkWidth: round(forkHalf * 2),
  };
}
