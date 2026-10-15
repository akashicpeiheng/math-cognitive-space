/**
 * 学习路线回放的「细箭头」：一步一支，全部留在画布上。
 *
 * ## 为什么要从丝带改成细线
 *
 * 上一版是五股渐细的丝带（`ribbonPath`）+ 凹边大箭镞：中段最宽 30 世界单位、箭镞长 26–62，
 * 在 54% 的回放比例下实测展开成 100–225 × 98–273 屏幕像素的一大团——
 * 它盖住的正是它本该指出的结构。学习路线要看的不是「有一束光」，
 * 而是**这一步从哪儿来、到哪儿去**，那是一条线就能说清的事：
 * 主干 1.6px 宽（屏幕上恒定），箭镞 12px 长，比它旁边最细的关系边还细。
 *
 * ## 为什么端点按「可见外形」裁剪
 *
 * 卡片半宽是 86，而缩到 55% 以下时节点画成半径 8px 的小圆点（圆心仍在卡片中心）。
 * 旧几何一律按卡片矩形裁剪：圆点档下尾巴停在离圆心 86 世界单位的位置，
 * 也就是悬在离那个小圆点四十多像素的空地上——看的人认不出它从哪个节点出发。
 * 现在两端的外形显式传进来：卡片按矩形、圆点按半径，各裁到自己的边界。
 * 「预告卡」（下一步才出现的那个节点）仍按卡片矩形裁：它确实被画成一张卡片。
 *
 * ## 为什么箭头要保留
 *
 * 旧实现只画「刚立住的节点 → 下一步的目标」那一支，走一步换一支，走过的全丢掉；
 * 回放完一遍，画布上只剩最后一支，看不出这条路线**按什么顺序**长出来。
 * 现在每一步各留一支、按步号编号、越新越亮，整条路线因此是一条能回头考察的路径。
 *
 * ## 为什么要绕开关系边、而且要往外绕
 *
 * 用户截图里的问题：路径箭头与逻辑关系挤在同一条走廊里——同一对卡片之间既有「硬前置」边、
 * 又有这一步的箭头，两条线并排贴着，读起来混成一片。现在：
 *
 * 1. **关系边也是障碍**：可见的边（已按两端外形裁过）交给几何，与卡片一起参与评分；
 * 2. **往外绕**：候选按「由小到大、每档先外侧后内侧」排列，评分封顶（够空即满分）
 *    且用严格大于比较，于是同分时外侧那一条胜出；`awayFrom`（节点群质心）定义「外」是哪边；
 * 3. **够得着**：卡片之间的可见走廊实测可以短到 17–20 世界单位（约 27px），
 *    只按弦长的比例绕根本出不了缝，因此弧高候选里另有一族**绝对屏幕像素**档（20–92px）。
 *
 * 实测（中段 25%–75% 落在某条边 3px 以内的采样点占比）：12 步路线 0.21 → 0.03，
 * 20 步路线 0.39 → 0.03，用户那条 4 节点路线 0.30 → 0.18。
 *
 * ## 纯函数
 *
 * 不碰 DOM、不读测量值：所有输入都是坐标与尺寸，输出是 SVG 属性字符串，
 * 因此可以在 node 里直接单测（两端锚点、细、端点裁剪、保留规则、步号不重叠、避边与往外扩散）。
 */
export interface Point {
  x: number;
  y: number;
}

/**
 * 一端的**可见外形**（世界单位）。
 *
 * 卡片与圆点分开表示，是因为两者裁剪方式不同：卡片要沿方向求矩形边界的距离，
 * 圆点则处处都是半径。把「屏幕上恒定」的尺寸（圆点半径）交给调用方换算，
 * 几何这边只管世界单位——相机比例不进来，单测也就不需要浏览器。
 */
export type StageArrowEnd =
  | { kind: 'card'; width: number; height: number }
  | { kind: 'dot'; radius: number };

/**
 * 一条要避开的关系边（世界坐标的线段）。
 *
 * 传**可见的那一段**（已经按两端的卡片/圆点裁过）而不是圆心到圆心：
 * 箭头本来就只在卡片外面走，藏在卡片里的那截不构成冲突。
 */
export interface StageArrowEdge {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface StageArrowInput {
  /** 源节点**中心**（世界坐标）。空数组时返回 null。 */
  from: Point[];
  /** 目标节点**中心**。 */
  to: Point;
  /** 源端的可见外形（决定起点裁在哪儿）。 */
  source: StageArrowEnd;
  /** 目标端的可见外形（决定箭尖停在哪儿）。 */
  target: StageArrowEnd;
  /**
   * 相机比例。
   *
   * 主干的线宽、箭镞长度、两端留的空隙都按**屏幕像素**给定，再除以它变成世界单位：
   * 于是缩放到任何比例，这支箭头看起来都一样粗、一样大——
   * 与圆点（半径 8/scale）同一套约定，缩小时不会细成一根看不见的头发丝。
   */
  scale: number;
  /** 需要避开的其它卡片中心（见 `avoidEnd`）。 */
  avoid?: Point[];
  /** 障碍的外形；缺省按卡片算（回放里卡片是常态，圆点是缩小时的呈现）。 */
  avoidEnd?: StageArrowEnd;
  /** 需要避开的关系边（见 `StageArrowEdge`）。 */
  avoidEdges?: StageArrowEdge[];
  /**
   * 「外面」的参考点——通常是这一片节点的质心。
   *
   * 同分时弧线朝**远离它**的一侧鼓（`ARC_OPTIONS` 按由小到大、每档先试外侧再试内侧，
   * 而比较用的是严格大于，因此平分时先到的那个胜出）。
   * 这一条不是为了好看：节点群内部的空白本来就少，关系边又都在里面，
   * 往外绕才是**真的**绕开了；往里绕往往只是从一个冲突换到另一个冲突。
   */
  awayFrom?: Point;
}

export interface StageArrowGeometry {
  /** 主干曲线：`stroke` 用，不是填充轮廓（细线的关键就在这）。 */
  path: string;
  /** 箭镞：小实心掠形，收在尖端。 */
  head: string;
  /** 主干的线宽（世界单位，换算自屏幕像素）。 */
  lineWidth: number;
  /** 主干长度（世界单位）：生长动画按它算 dash，速度与长度无关。 */
  pathLength: number;
  /** 根部：源端边界之外一点。 */
  origin: Point;
  /** 箭尖：目标端边界之外一点。 */
  tip: Point;
  /** 箭镞底边中点。 */
  headBase: Point;
  /** 曲线中点：步号挂在这里。 */
  mid: Point;
  /** 根部到尖端的直线距离。 */
  length: number;
  /** 根部所在的那张源端在 `from` 里的下标。 */
  sourceIndex: number;
}

/** 主干线宽（屏幕像素）：比最细的关系边（1.1–1.7 世界单位）还细一档。 */
export const STAGE_ARROW_LINE_PX = 1.6;
/** 箭镞长度（屏幕像素）与底边半宽比例：和关系边的小箭头（8.5–13）同一量级。 */
export const STAGE_ARROW_HEAD_PX = 12;
const HEAD_HALF_RATIO = 0.44;
/** 尖端与目标端之间留的空隙，别把箭尖戳进卡片（屏幕像素）。 */
const TIP_GAP_PX = 4;
/** 根部与源端之间留的空隙：贴太紧会在卡片描边上糊成一团。 */
const START_GAP_PX = 1.5;
/** 短于这个长度就不画（屏幕像素）：太短的箭头只剩一个箭镞，读不出方向。 */
const MIN_LENGTH_PX = 26;
/**
 * 整条线的侧向弧高候选；**直线那一档（0）由调用处另外前置**。
 *
 * 两族一起给，按大小排序后外侧先试：
 *
 * - `ARC_RATIOS` 是**相对弦长**的：长箭头（几百像素）按比例绕，够用就好；
 * - `ARC_PX` 是**绝对屏幕像素**的：卡片的半宽是 86、半高是 29，两张相邻卡片的中心距
 *   实测可以小到 135 世界单位——那时可见的那一段只有 **17–20 世界单位（约 27px）**，
 *   按 0.55 的比例绕也只有 15px，根本出不了两张卡片之间的缝。
 *   用户截图里的「路径箭头和逻辑关系重叠」正是这种缝里的短箭头：
 *   它和同一条关系边并排挤在 30px 宽的走廊里。绝对档让它能甩到卡片外面去。
 *
 * 绕行走法（两端外形重叠）不用这两族，它自己算鼓包大小。
 */
const ARC_RATIOS = [0.05, 0.13, 0.24, 0.38, 0.55];
const ARC_PX = [20, 36, 60, 92];
/** 弧线「够空」的阈值（屏幕像素）：超过了就不再为更空而绕更远。 */
const ENOUGH_CLEARANCE_PX = 60;
/** 避障只量中段：两端本来就贴着卡片，算进来会让所有候选同分。 */
const CLEARANCE_FROM = 0.28;
const CLEARANCE_TO = 0.92;
/** 步号徽标之间的最小屏幕距离：近到重叠就只留新的那一支。 */
const BADGE_MIN_PX = 24;

const clamp = (value: number, low: number, high: number) => Math.min(Math.max(value, low), high);
const round = (value: number) => Math.round(value * 10) / 10;

/** 从中心沿 `u` 方向退到该外形边界上所需的距离。 */
function exitDistance(end: StageArrowEnd, u: Point): number {
  if (end.kind === 'dot') return end.radius;
  const ax = Math.abs(u.x);
  const ay = Math.abs(u.y);
  const tx = ax > 1e-6 ? end.width / 2 / ax : Number.POSITIVE_INFINITY;
  const ty = ay > 1e-6 ? end.height / 2 / ay : Number.POSITIVE_INFINITY;
  return Math.min(tx, ty);
}

/** 点到某个外形中心的距离；点在内部为 0。 */
function distanceToEnd(point: Point, end: StageArrowEnd, centre: Point): number {
  const dx = point.x - centre.x;
  const dy = point.y - centre.y;
  if (end.kind === 'dot') return Math.max(Math.hypot(dx, dy) - end.radius, 0);
  return Math.hypot(Math.max(Math.abs(dx) - end.width / 2, 0), Math.max(Math.abs(dy) - end.height / 2, 0));
}

function quadPoint(p0: Point, c: Point, p1: Point, t: number): Point {
  const s = 1 - t;
  return {
    x: s * s * p0.x + 2 * s * t * c.x + t * t * p1.x,
    y: s * s * p0.y + 2 * s * t * c.y + t * t * p1.y,
  };
}

function quadTangent(p0: Point, c: Point, p1: Point, t: number): Point {
  const s = 1 - t;
  return { x: 2 * s * (c.x - p0.x) + 2 * t * (p1.x - c.x), y: 2 * s * (c.y - p0.y) + 2 * t * (p1.y - c.y) };
}

/** 采样求曲线长度（二次贝塞尔没有初等弧长公式，直接量比近似公式可靠）。 */
function quadLength(p0: Point, c: Point, p1: Point, samples = 24): number {
  let total = 0;
  let previous = p0;
  for (let index = 1; index <= samples; index += 1) {
    const point = quadPoint(p0, c, p1, index / samples);
    total += Math.hypot(point.x - previous.x, point.y - previous.y);
    previous = point;
  }
  return total;
}

/** 点到线段的距离（世界单位）。 */
function distanceToSegment(px: number, py: number, edge: StageArrowEdge): number {
  const dx = edge.x2 - edge.x1;
  const dy = edge.y2 - edge.y1;
  const lengthSquared = dx * dx + dy * dy;
  const t = lengthSquared > 1e-9
    ? clamp(((px - edge.x1) * dx + (py - edge.y1) * dy) / lengthSquared, 0, 1)
    : 0;
  return Math.hypot(px - (edge.x1 + t * dx), py - (edge.y1 + t * dy));
}

/**
 * 一条候选弧线「有多空」：沿中线采样，取到所有障碍（卡片 + 关系边）的最小距离。
 *
 * 只用来在两侧之间挑一边，不追求精确避障；两侧都挤时也给出「比较不挤」的答案。
 * 细线本来可以不管卡片（压过去也看得清），但一条斜穿过卡片正文的线看起来像划痕，值得绕。
 *
 * **关系边也算障碍**（2026-10-15 加）：路径箭头压在逻辑关系上时，
 * 「这一步从哪儿到哪儿」和「这两个节点本来是什么关系」两件事就混成一片了
 * （用户截图里正是这样：箭头与硬前置边挤在同一条走廊里）。
 * 与卡片同理，只量中段：两端本来就要贴着卡片，而边也从那些卡片上出发。
 */
/**
 * 一条候选弧线「有多空」：沿中线采样，取到所有障碍（卡片 + 关系边）的最小距离。
 *
 * 只用来在两侧之间挑一边，不追求精确避障；两侧都挤时也给出「比较不挤」的答案。
 * 细线本来可以不管卡片（压过去也看得清），但一条斜穿过卡片正文的线看起来像划痕，值得绕。
 *
 * **关系边也算障碍**（2026-10-15 加）：路径箭头压在逻辑关系上时，
 * 「这一步从哪儿到哪儿」和「这两个节点本来是什么关系」两件事就混成一片了
 * （用户截图里正是这样：箭头与硬前置边挤在同一条走廊里）。
 * 与卡片同理，只量中段：两端本来就要贴着卡片，而边也从那些卡片上出发。
 *
 * 三重剪枝（实测把最重的 40 步路线从 23.5ms 压到个位数）：
 * 1. **按这一支自己的采样盒筛**：比 `cap + slop` 还远的障碍影响不了封顶后的最小值，
 *    直接不看——弧高候选多了之后，这一层比「先按整族候选的并集盒筛一次」精确得多；
 * 2. **够空就返回**：一个障碍都没有 = 满分，连采样距离都不必算；
 * 3. **floor 早退**：已经量到不可能赢过当前最优，立刻返回（分支定界）。
 */
function clearanceOf(
  p0: Point, c: Point, p1: Point,
  obstacles: Array<{ centre: Point; end: StageArrowEnd }>,
  edges: StageArrowEdge[],
  cap: number,
  slop: number,
  floor: number,
): number {
  if (obstacles.length === 0 && edges.length === 0) return Number.POSITIVE_INFINITY;
  const samples = 10;
  const points: Point[] = [];
  for (let index = 0; index <= samples; index += 1) {
    points.push(quadPoint(p0, c, p1, CLEARANCE_FROM + (CLEARANCE_TO - CLEARANCE_FROM) * (index / samples)));
  }
  const limit = cap + slop;
  const minX = Math.min(...points.map((point) => point.x)) - limit;
  const maxX = Math.max(...points.map((point) => point.x)) + limit;
  const minY = Math.min(...points.map((point) => point.y)) - limit;
  const maxY = Math.max(...points.map((point) => point.y)) + limit;
  const nearObstacles = obstacles.filter((obstacle) => obstacle.centre.x >= minX && obstacle.centre.x <= maxX
    && obstacle.centre.y >= minY && obstacle.centre.y <= maxY);
  const nearEdges = edges.filter((edge) => Math.max(edge.x1, edge.x2) >= minX && Math.min(edge.x1, edge.x2) <= maxX
    && Math.max(edge.y1, edge.y2) >= minY && Math.min(edge.y1, edge.y2) <= maxY);
  if (nearObstacles.length === 0 && nearEdges.length === 0) return Number.POSITIVE_INFINITY;

  let worst = Number.POSITIVE_INFINITY;
  for (const point of points) {
    let nearest = Number.POSITIVE_INFINITY;
    for (const obstacle of nearObstacles) {
      nearest = Math.min(nearest, distanceToEnd(point, obstacle.end, obstacle.centre));
      // 已经不可能赢过当前最优：这一支不必量完（分支定界，见下面的搜索）。
      if (nearest <= floor) return nearest;
    }
    for (const edge of nearEdges) {
      nearest = Math.min(nearest, distanceToSegment(point.x, point.y, edge));
      if (nearest <= floor) return nearest;
    }
    worst = Math.min(worst, nearest);
  }
  return worst;
}

/**
 * 一支细箭头的几何。
 *
 * 两端都**贴着真实图形**：起点在源端边界外 1.5px，箭尖停在目标端边界外 4px。
 * 源集合（回放第 1 步的起点可能有好几个）里取**离目标最近**的那一张：
 * 细线只有一条，从最靠前的那张出发读起来才像「从这里出发」，而不是从一堆卡片中间的空地。
 */
export function stageArrowGeometry({
  from, to, source, target, scale, avoid = [], avoidEnd, avoidEdges = [], awayFrom,
}: StageArrowInput): StageArrowGeometry | null {
  if (from.length === 0) return null;
  const unit = 1 / Math.max(scale, 1e-6);
  const lineWidth = STAGE_ARROW_LINE_PX * unit;
  const headLen = STAGE_ARROW_HEAD_PX * unit;
  const tipGap = TIP_GAP_PX * unit;
  const startGap = START_GAP_PX * unit;
  const minLength = MIN_LENGTH_PX * unit;

  let sourceIndex = 0;
  let bestDistance = Number.POSITIVE_INFINITY;
  from.forEach((point, index) => {
    const distance = Math.hypot(point.x - to.x, point.y - to.y);
    if (distance < bestDistance) { bestDistance = distance; sourceIndex = index; }
  });
  const sourceCentre = from[sourceIndex];

  const dx = to.x - sourceCentre.x;
  const dy = to.y - sourceCentre.y;
  const distance = Math.hypot(dx, dy);
  // 源与目标重合：没有方向可言。
  if (distance < 1) return null;
  const u = { x: dx / distance, y: dy / distance };
  const p = { x: -u.y, y: u.x };

  const directOrigin = {
    x: sourceCentre.x + u.x * (exitDistance(source, u) + startGap),
    y: sourceCentre.y + u.y * (exitDistance(source, u) + startGap),
  };
  const directTipDistance = exitDistance(target, u) + tipGap;
  const directTip = { x: to.x - u.x * directTipDistance, y: to.y - u.y * directTipDistance };
  /*
   * 两支靠得太近时（两个外形已经挨上甚至重叠），直连的起点会跑到箭尖前面去——
   * 那时画出来的「箭头」指向反方向，比不画更糟。判据用沿轴投影而不是直线距离：
   * 只有箭尖确实在起点前方，直连才有方向可言。
   */
  const forward = (directTip.x - directOrigin.x) * u.x + (directTip.y - directOrigin.y) * u.y;
  const directChord = Math.hypot(directTip.x - directOrigin.x, directTip.y - directOrigin.y);

  /*
   * 外侧是哪一侧：从这条弦的中点望出去，远离参考点的那个法向。
   * 弧高候选按「由小到大、每档先外后内」排列，而挑最优用的是严格大于，
   * 于是平分（比如两侧一样空）时外侧先到先得——这就是「稍微往外扩散」那条规则的落点。
   */
  const chordMidDirect = { x: (directOrigin.x + directTip.x) / 2, y: (directOrigin.y + directTip.y) / 2 };
  const outward = awayFrom
    ? (p.x * (chordMidDirect.x - awayFrom.x) + p.y * (chordMidDirect.y - awayFrom.y) >= 0 ? 1 : -1)
    : 1;

  /** 一种走法：两端锚点，加上这条走法允许的带符号弧高（由小到大，外侧在前）。 */
  const plans: Array<{ origin: Point; tip: Point; bows: number[] }> = [];
  if (forward > 0 && directChord >= minLength) {
    /*
     * 弧高候选 = 直线 + 相对弦长的比例档 + 绝对屏幕像素档，按大小排序后**外侧优先**：
     * 评分封顶（够空即满分）＋严格大于比较，于是「够用就好」与「同分往外」同时成立。
     */
    const magnitudes = [...new Set([
      0,
      ...ARC_RATIOS.map((ratio) => ratio * directChord),
      ...ARC_PX.map((px) => px * unit),
    ])].sort((left, right) => left - right);
    plans.push({
      origin: directOrigin,
      tip: directTip,
      bows: magnitudes.flatMap((magnitude) => (magnitude === 0 ? [0] : [outward * magnitude, -outward * magnitude])),
    });
  } else {
    /*
     * 绕行走法（2026-10-15 加）。
     *
     * 力导向布局会把同一话题的节点放得很近：实测一条 12 步的路线里有 3 步的两端
     * 中心距只有 68–85 世界单位，而卡片宽 172——两张卡片直接叠在一起，中间没有走廊。
     * 旧写法在这里返回 null，于是「保留每一步的箭头」会出现缺号（7 → 10），
     * 而缺的正好是最密的那几步——正是最需要看清顺序的地方。
     *
     * 改法：从**侧向**出去、侧向回来，弧线再往外鼓一个包。卡片高只有 58，
     * 侧向让开半个卡片高度就已经在两张卡片之外了；鼓包则保证弧长够装下一支箭头，
     * 而且让箭镞从外侧切进目标（不然它会横着指）。外侧同样先试。
     *
     * 鼓包大小也用同一族候选（2026-10-15 补）：圆点档下这条走法很常见——
     * 两个圆点中心距 40 世界单位时，扣掉两个半径剩下的「直连走廊」只有 11 世界单位（约 6px），
     * 于是必然走绕行；而绕行的弧线同样会和关系边挤在一起，得让它也能甩到 20–92px 外。
     * 只有正方向（往外）有候选：两端的锚点本来就在那一侧，往里鼓会切进卡片。
     */
    const hopFloor = minLength * 0.8;
    for (const side of [outward, -outward]) {
      const out = { x: p.x * side, y: p.y * side };
      const origin = {
        x: sourceCentre.x + out.x * (exitDistance(source, out) + startGap),
        y: sourceCentre.y + out.y * (exitDistance(source, out) + startGap),
      };
      const tip = {
        x: to.x + out.x * (exitDistance(target, out) + tipGap),
        y: to.y + out.y * (exitDistance(target, out) + tipGap),
      };
      const span = Math.hypot(tip.x - origin.x, tip.y - origin.y);
      const spanBow = (minLength - span) * 0.5 + minLength * 0.45;
      /*
       * 鼓包不许小于 `hopFloor`：绕行弧的意义就是「从外侧切进目标」，
       * 弧太小就退化成两端的连线——箭镞会横着指（实测余弦掉到 0.17，正是这条测试抓到的）。
       */
      const magnitudes = [...new Set([
        Math.max(hopFloor, spanBow),
        ...ARC_RATIOS.map((ratio) => ratio * Math.max(span, minLength)),
        ...ARC_PX.map((px) => px * unit),
      ])].filter((magnitude) => magnitude >= hopFloor - 1e-9).sort((left, right) => left - right);
      plans.push({ origin, tip, bows: magnitudes.map((magnitude) => side * magnitude) });
    }
  }

  /*
   * 障碍里要**去掉两端自己**：箭尖本来就停在目标卡片外面一点、根部就在源卡片外面一点，
   * 把它们算进来，任何一条线在中段之外都会「贴着卡片」——直线因此永远拿不到最高分，
   * 每一条箭头都会无故鼓一个包（这正是第一版的实测结果：两支本该重合的箭头差出 202 单位）。
   *
   * 再**只留走廊附近的**：`clearanceOf` 是「到所有卡片的最小距离」，而评分又被
   * `ENOUGH_CLEARANCE_PX` 封顶——比上限还远的卡片无论如何都影响不了结果，
   * 却要参与每一次采样。回放里这一层会按步数重复（走到第 40 步就有 40 支箭头、每支一次搜索），
   * 于是「远处那几百个节点」变成纯粹的浪费（400 节点 × 40 支 × 7 档弧高 × 11 次采样）。
   * 先用包围盒把候选压到个位数，结果逐字不变（`tests/stage-arrow.test.mjs` 钉住了这条等价性）。
   */
  const clearanceCap = ENOUGH_CLEARANCE_PX * unit;
  const farEnd = avoidEnd ?? { kind: 'card' as const, width: 172, height: 58 };
  const farHalf = farEnd.kind === 'dot' ? farEnd.radius : Math.hypot(farEnd.width, farEnd.height) / 2;
  const wobble = Math.max(...plans.map((plan) => Math.max(...plan.bows.map((bow) => Math.abs(bow) * 2))), 0);
  const reach = clearanceCap + farHalf + wobble;
  const box = plans.reduce((area, plan) => ({
    minX: Math.min(area.minX, plan.origin.x, plan.tip.x),
    maxX: Math.max(area.maxX, plan.origin.x, plan.tip.x),
    minY: Math.min(area.minY, plan.origin.y, plan.tip.y),
    maxY: Math.max(area.maxY, plan.origin.y, plan.tip.y),
  }), { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity });
  const obstacles = avoid
    .filter((point) => Math.hypot(point.x - sourceCentre.x, point.y - sourceCentre.y) > 1
      && Math.hypot(point.x - to.x, point.y - to.y) > 1)
    .filter((point) => point.x >= box.minX - reach && point.x <= box.maxX + reach
      && point.y >= box.minY - reach && point.y <= box.maxY + reach)
    .map((point) => ({ centre: point, end: farEnd }));
  /*
   * 关系边同样只留走廊附近的：判据与卡片一致（比封顶还远的边影响不了评分）。
   * 一条边的包围盒与走廊相交就留下——线段比卡片细得多，这个粗筛足够准。
   */
  const nearbyEdges = (avoidEdges ?? []).filter((edge: StageArrowEdge) => Math.max(edge.x1, edge.x2) >= box.minX - reach
    && Math.min(edge.x1, edge.x2) <= box.maxX + reach
    && Math.max(edge.y1, edge.y2) >= box.minY - reach
    && Math.min(edge.y1, edge.y2) <= box.maxY + reach);

  /*
   * 挑一条最空的走法：把每种走法的每档弧高都沿中线量一遍，取离所有卡片与关系边最远的那条。
   * 评分先封顶再比：一旦够空就取更小的弧高，免得每一条线都夸张地绕一大圈。
   * 同分时外侧先到先得（见上面的 `outward`）。
   *
   * 两处剪枝让「候选变多 + 关系边也参与评分」不至于变慢（实测 40 步 × 405 节点 × 470 边：
   * 不做这两处是 23.5ms，做了之后见 VALIDATION 的记录）：
   * 1. **够空就停**：候选按弧高由小到大排，因此第一条达到封顶分的走法就是答案，更大的不必再试；
   * 2. **赢不了就停**：每个候选的采样一旦掉到当前最优之下就立刻返回（分支定界）。
   */
  let best: { origin: Point; tip: Point; control: Point; score: number } | null = null;
  for (const plan of plans) {
    const chordMid = { x: (plan.origin.x + plan.tip.x) / 2, y: (plan.origin.y + plan.tip.y) / 2 };
    for (const bow of plan.bows) {
      if (best && best.score >= clearanceCap - 1e-9) break;
      const control = { x: chordMid.x + p.x * bow * 2, y: chordMid.y + p.y * bow * 2 };
      const score = Math.min(
        clearanceOf(plan.origin, control, plan.tip, obstacles, nearbyEdges, clearanceCap, farHalf, best ? best.score : Number.NEGATIVE_INFINITY),
        clearanceCap,
      );
      if (!best || score > best.score + 1e-9) best = { origin: plan.origin, tip: plan.tip, control, score };
    }
  }
  if (!best) return null;

  const { origin, tip, control } = best;
  const pathLength = quadLength(origin, control, tip);
  if (pathLength < minLength) return null;

  /*
   * 箭镞的方向取**曲线到达尖端时的切向**，不是源→目标的直线方向：
   * 直连时两者几乎一致，绕行时只有切向才不会在箭尖处折出一个角。
   */
  const arrival = quadTangent(origin, control, tip, 1);
  const arrivalLength = Math.hypot(arrival.x, arrival.y) || 1;
  const h = { x: arrival.x / arrivalLength, y: arrival.y / arrivalLength };
  const n = { x: -h.y, y: h.x };
  const headBase = { x: tip.x - h.x * headLen, y: tip.y - h.y * headLen };
  const headHalf = headLen * HEAD_HALF_RATIO;
  const barbRight = { x: headBase.x + n.x * headHalf, y: headBase.y + n.y * headHalf };
  const barbLeft = { x: headBase.x - n.x * headHalf, y: headBase.y - n.y * headHalf };
  // 底边中点稍微回收：细长的掠形比实心三角轻，和 1.6px 的主干才配得上。
  const notch = { x: headBase.x + h.x * headLen * 0.22, y: headBase.y + h.y * headLen * 0.22 };
  const head = [
    `M ${round(tip.x)},${round(tip.y)}`,
    `L ${round(barbRight.x)},${round(barbRight.y)}`,
    `L ${round(notch.x)},${round(notch.y)}`,
    `L ${round(barbLeft.x)},${round(barbLeft.y)}`,
    'Z',
  ].join(' ');

  const mid = quadPoint(origin, control, tip, 0.5);

  return {
    path: `M ${round(origin.x)},${round(origin.y)} Q ${round(control.x)},${round(control.y)} ${round(tip.x)},${round(tip.y)}`,
    head,
    lineWidth: round(lineWidth),
    pathLength: round(pathLength),
    origin: { x: round(origin.x), y: round(origin.y) },
    tip: { x: round(tip.x), y: round(tip.y) },
    headBase: { x: round(headBase.x), y: round(headBase.y) },
    mid: { x: round(mid.x), y: round(mid.y) },
    length: round(Math.hypot(tip.x - origin.x, tip.y - origin.y)),
    sourceIndex,
  };
}

/** 回放计划里的一步（只取几何需要的两个字段）。 */
export interface StageArrowStep {
  /** 这一步新进入视图的节点。 */
  added: string[];
  /** 这一步的主产出；`added` 为空时（只消费的复习步）用它兜底。 */
  focus: string;
}

export interface StageArrowTrailInput {
  /** 第 0 帧就在场的起点节点。 */
  entry: string[];
  steps: StageArrowStep[];
  /** 已完成的步数（`routeFrame.step`）：0 = 只有起点。 */
  step: number;
  /** 节点 id → 中心（世界坐标）。查不到 = 这一步还不该画。 */
  positionOf: (id: string) => Point | undefined;
  titleOf: (id: string) => string;
  /** 画布上所有节点的中心：给避障用。 */
  avoid: Point[];
  /** 画布上**可见的关系边**（已按两端外形裁过的线段）：路径箭头要绕开它们。 */
  edges?: StageArrowEdge[];
  /** 已可见节点的外形（卡片或圆点）。 */
  nodeEnd: StageArrowEnd;
  /** 预告卡的外形（下一步那个节点还没画出来，用它的卡片矩形裁剪）。 */
  previewEnd: StageArrowEnd;
  scale: number;
}

export interface StageArrowTrailItem {
  /** 步号，从 1 起。 */
  step: number;
  /** 是否是「指向下一步」的预告（目标还没出现在画布上）。 */
  preview: boolean;
  /** 是否是最后一支（正在生长的那一支）。 */
  current: boolean;
  /** 步号徽标要不要画（与更新的徽标挤在一起时不画，见 stale 规则）。 */
  badge: boolean;
  sourceId: string | null;
  targetId: string;
  title: string;
  geometry: StageArrowGeometry;
}

/**
 * 把「回放到第几步」翻成画布上的一串箭头。
 *
 * 规则（与界面上的控制台一一对应）：
 *
 * - 已完成的前 `step` 步**各留一支**：第 s 步的那支从第 s−1 步立住的节点出发
 *   （第 1 步从起点集合出发），指向第 s 步新加入的节点；
 * - 再往后一支是**预告**：从第 `step` 步立住的节点指向第 `step + 1` 步的目标，
 *   目标节点此刻还没画出来，端点按预告卡裁剪；
 * - `current` 是最后那一支（预告存在时就是它）：只有它播放生长动画。
 *
 * 步号徽标按**从新到旧**贪心筛选：新的一支优先，与已选徽标在屏幕上近到重叠的就放弃。
 * 顺序本身由箭头串起来，徽标只负责在几条线交叉时把「谁先谁后」写死；挤在一起反而读不出。
 */
export function stageArrowTrail({
  entry, steps, step, positionOf, titleOf, avoid, edges = [], nodeEnd, previewEnd, scale,
}: StageArrowTrailInput): StageArrowTrailItem[] {
  const total = steps.length;
  const completed = clamp(Math.round(step), 0, total);
  const items: Array<Omit<StageArrowTrailItem, 'badge' | 'current'> & { badge: boolean }> = [];
  /** 「外面」的参考点：这一片节点的质心（同分时弧线朝远离它的一侧鼓）。 */
  const awayFrom = avoid.length > 0
    ? { x: avoid.reduce((sum, point) => sum + point.x, 0) / avoid.length, y: avoid.reduce((sum, point) => sum + point.y, 0) / avoid.length }
    : undefined;

  const build = (target: number, preview: boolean) => {
    const targetId = steps[target].added[0] ?? steps[target].focus;
    const targetCentre = targetId ? positionOf(targetId) : undefined;
    if (!targetCentre) return;
    const sourceIds = target === 0 ? entry : steps[target - 1].added;
    const from: Point[] = [];
    const kept: string[] = [];
    for (const id of sourceIds) {
      const point = positionOf(id);
      if (!point) continue;
      from.push(point);
      kept.push(id);
    }
    const geometry = stageArrowGeometry({
      from,
      to: targetCentre,
      source: nodeEnd,
      target: preview ? previewEnd : nodeEnd,
      scale,
      avoid,
      avoidEnd: nodeEnd,
      avoidEdges: edges,
      awayFrom,
    });
    if (!geometry) return;
    items.push({
      step: target + 1,
      preview,
      badge: true,
      sourceId: kept[geometry.sourceIndex] ?? null,
      targetId,
      title: titleOf(targetId),
      geometry,
    });
  };

  for (let index = 0; index < completed && index < total; index += 1) build(index, false);
  if (completed < total) build(completed, true);
  if (items.length === 0) return [];

  // 徽标贪心：新的先占位，旧的近到会重叠就让位。
  const keptBadges: Point[] = [];
  for (let index = items.length - 1; index >= 0; index -= 1) {
    const mid = items[index].geometry.mid;
    const crowded = keptBadges.some((point) => Math.hypot(point.x - mid.x, point.y - mid.y) * scale < BADGE_MIN_PX);
    items[index].badge = !crowded;
    if (!crowded) keptBadges.push(mid);
  }

  return items.map((item, index) => ({ ...item, current: index === items.length - 1 }));
}
