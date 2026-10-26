/**
 * 缩到「圆点档」时，挂在圆点**正下方**的节点名称。
 *
 * ## 为什么需要一个取舍规则
 *
 * 圆点在屏幕上是半径 8px 的实心点，而节点的**屏幕间距**实测很小：
 * 24 节点视图缩到 52% 时中位 57px、最小 35px；缩到 25% 时中位 27px、最小 17px；
 * 120 / 405 节点视图在 25% 下中位 27px、最小 17px。
 * 中文标题 8 个字就是 80px 宽——每个圆点都挂全名，得到的是一片互相压叠的文字，
 * 比不挂更难读：那正是「缩下去什么都认不出」的另一种版本。
 *
 * 因此按优先级**贪心放**，放不下的不硬塞：
 *
 * 1. 选中的节点（详情面板正对着它）永远有；
 * 2. 悬停中的节点（指针就在那儿）其次；
 * 3. 起始节点（`starting-nodes.ts` 判定的入口）再次——它们是「可以从这里开始」的锚点；
 * 4. 其余按连接数从多到少（连接多的更可能是结构里的枢纽），同分按 id 保证确定性。
 *
 * 两条回避规则：标签之间不许重叠；标签也不许压到**别的**圆点上
 * （圆点是这张图的主记号，被文字盖住就等于丢了一个节点）。
 *
 * ## 屏幕坐标，不是世界坐标
 *
 * 标签是**屏幕上恒定大小**的（10.5px），与圆点同一套约定：缩小时不会细成看不见，
 * 放大时也不会变成一块牌子。因此这个模块只吃屏幕坐标，相机比例不进来——
 * 输入是「每个圆点此刻画在屏幕的哪里」，输出是「哪几个圆点下面写什么」。
 * 这样它可以在 node 里直接单测，不必开浏览器。
 */

/** 标签字号（屏幕像素）。 */
export const DOT_LABEL_FONT_PX = 10.5;
/** 标签与圆点之间的缝（屏幕像素）。 */
export const DOT_LABEL_GAP_PX = 3;
/** 最多写几个字（超出用省略号）。7 个汉字约 74px，再长就必然和邻居压上。 */
export const DOT_LABEL_MAX_CHARS = 7;
/**
 * 按相机比例取「最多写几个字」。
 *
 * 7 个字那条上限是为**挤在一起**的视图定的（圆点间距在 25% 档只有 27px 中位）。
 * 但圆点档现在是绝大多数视图的常态（方块只在 120% 以上才出现，见 `network-workspace.ts`），
 * 放大的时候圆点在屏幕上被拉开（间距 = 世界间距 × 比例），再按 7 个字截断就成了无谓的信息损失：
 * 实测 100% 下最近邻中位间距约 190px，14 个汉字（147px）仍放得下。
 * 卡片自己也是 15 个字截断（`NetworkPage` 的 `network-node-label`），因此这里到 14 为止，
 * 圆点档与卡片档给出的名字长度在同一量级，切档时不会突然多出/少掉半句话。
 */
export function dotLabelMaxChars(scale: number): number {
  if (scale >= 0.9) return 14;
  if (scale >= 0.6) return 10;
  return DOT_LABEL_MAX_CHARS;
}
/**
 * 第二遍用的短名长度。
 *
 * 第一遍按 7 个字放，放不下的**再试一次 4 个字**（宽约 42px）——挤的地方因此不是「没有名字」，
 * 而是「名字短一点」。实测（24 节点视图，最近邻中位 45px）覆盖率从 33% 提到 58%，
 * 而宽松的视图（最近邻 40px 上下的 48/120 节点视图）第一遍就已经 90–100%，
 * 短名用不上：同一个规则在两种密度下都给出合理结果，不必再猜一个「密度阈值」。
 */
export const DOT_LABEL_SHORT_CHARS = 4;
/** 两个标签之间至少留的缝（屏幕像素）。 */
const DOT_LABEL_PADDING_PX = 2;

export interface DotLabelNode {
  id: string;
  /** 节点标题（主题内容文字）。空标题的节点不挂标签。 */
  title: string;
  /** 圆点中心此刻的**屏幕坐标**（px）。 */
  x: number;
  y: number;
  /** 圆点的**屏幕**半径（px）。 */
  radius: number;
  /** 优先级：数字越小越先占位（见文件头）。 */
  priority: number;
  /** 同优先级下的次序：连接数大的先占位。 */
  weight: number;
}

export interface DotLabel {
  id: string;
  /** 实际要写的文字（可能带省略号）。 */
  text: string;
  /** 文字框（屏幕 px）：左上角与宽高，供回避规则与验收核对。 */
  x: number;
  y: number;
  width: number;
  height: number;
  /** 文字基线相对圆点中心的距离（屏幕 px）——`text` 的 `y` 属性直接用它。 */
  baselineY: number;
}

export interface DotLabelOptions {
  font?: number;
  maxChars?: number;
  gap?: number;
  /** 第二遍的短名长度；传 0 关掉第二遍。 */
  shortChars?: number;
}

/** 标题截断：短标题原样返回，长标题切到上限、去掉切口处的空白再加省略号。 */
export function truncateTitle(title: string, maxChars = DOT_LABEL_MAX_CHARS): string {
  const trimmed = title.trim();
  if (trimmed.length <= maxChars) return trimmed;
  /*
   * 切口处的空白要去掉：`ε–δ 定义` 截到 4 个字会切在空格上，
   * 不去掉就是「ε–δ …」——一个挂着空格的省略号，比「ε–δ…」难读。
   */
  return `${trimmed.slice(0, maxChars).trimEnd()}…`;
}

/**
 * 文字宽度的估算（屏幕 px）。
 *
 * 不量 DOM：这个模块要在 node 里可单测，而且渲染处每帧都在算，
 * 真去 `getBBox()` 会把布局抖动带进渲染循环。中日韩字符按一个字宽算，
 * 拉丁字母与数字约 0.55 个字宽，空格 0.3——估算偏大一点比偏小安全（宁可少挂一个，不要压字）。
 */
export function textWidthPx(text: string, font = DOT_LABEL_FONT_PX): number {
  let width = 0;
  for (const char of text) {
    if (/[\u2e80-\u9fff\uf900-\ufaff\uff00-\uffef\u3000-\u303f]/.test(char)) width += font;
    else if (char === ' ') width += font * 0.3;
    else width += font * 0.55;
  }
  return width;
}

/** 文字基线相对圆点中心的距离（屏幕 px）。渲染与布局共用这一个公式。 */
export function dotLabelBaselinePx(font = DOT_LABEL_FONT_PX, gap = DOT_LABEL_GAP_PX, radius: number): number {
  return radius + gap + font * 0.8;
}

/** 点到矩形（左上角 x,y、宽高 w,h）的距离；点在矩形内为 0。 */
function distanceToBox(px: number, py: number, x: number, y: number, w: number, h: number): number {
  const dx = Math.max(x - px, 0, px - (x + w));
  const dy = Math.max(y - py, 0, py - (y + h));
  return Math.hypot(dx, dy);
}

/**
 * 矩形有没有**碰到**一个圆（矩形左上角 x,y、宽高 w,h；圆心 cx,cy、半径 r）。
 *
 * 导出是给 `edge-labels.ts` 用的同一套判据：圆点档下关系文字也不许压住圆点。
 * 不用圆心距近似——那会把「圆周离矩形还有 1px」算成碰撞，整排标签因此被白白丢掉
 * （圆点档的标签在这个项目里就是靠这条判据决定留不留，见文件头的实测）。
 */
export function boxHitsCircle(x: number, y: number, w: number, h: number, cx: number, cy: number, r: number): boolean {
  return distanceToBox(cx, cy, x, y, w, h) < r;
}

/**
 * 均匀网格：把「拿一个标签去和所有圆点/所有已放标签比一遍」降成只看附近几格。
 *
 * 为什么需要：405 个节点全部在视口里时，朴素的两两比较是 405×405（每次重渲染都要跑一遍），
 * 实测 **一次 8.5–11.5ms**——画布在拖动/缩放时每帧都可能重算，这个量级会直接掉帧。
 * 分格之后每次只比较落进标签矩形那几格的对象，结果逐字不变（纯空间剪枝）。
 */
const CELL_PX = 24;

function buildGrid<T>(items: T[], centreOf: (item: T) => { x: number; y: number }, radiusOf: (item: T) => number): Map<string, T[]> {
  const grid = new Map<string, T[]>();
  for (const item of items) {
    const centre = centreOf(item);
    const radius = radiusOf(item);
    for (const key of cellsOf(centre.x, centre.y, 0, 0, radius)) {
      const bucket = grid.get(key);
      if (bucket) bucket.push(item); else grid.set(key, [item]);
    }
  }
  return grid;
}

function nearby<T>(grid: Map<string, T[]>, cells: string[]): T[] {
  /*
   * 不做去重：同一个小对象可能同时落进相邻两格（半径 8 的圆点、宽 42–90 的标签都会），
   * 但两条回避规则都是幂等的判定，重复看一眼不影响结果——
   * 而每次调用都建一个 Set 是这条路径上最贵的一次分配（405 个节点要调用上千次）。
   */
  const out: T[] = [];
  for (const key of cells) {
    const bucket = grid.get(key);
    if (bucket) for (const item of bucket) out.push(item);
  }
  return out;
}

/** 一个矩形覆盖的所有格子键。 */
function cellsOf(x: number, y: number, w: number, h: number, pad: number): string[] {
  const out: string[] = [];
  const fromX = Math.floor((x - pad) / CELL_PX);
  const toX = Math.floor((x + w + pad) / CELL_PX);
  const fromY = Math.floor((y - pad) / CELL_PX);
  const toY = Math.floor((y + h + pad) / CELL_PX);
  for (let cx = fromX; cx <= toX; cx += 1) for (let cy = fromY; cy <= toY; cy += 1) out.push(`${cx}:${cy}`);
  return out;
}

/**
 * 选出这一帧要挂哪些标签。
 *
 * 两遍放：先按上限放全一点的名字，放不下的**再试一遍短名**（见 `DOT_LABEL_SHORT_CHARS`）。
 * 两遍都受同样的两条回避规则约束，因此结果与「谁先占位」无关地稳定：
 * 同一帧、同一输入，永远得到同一批标签。
 *
 * 返回 `Map<节点 id, 标签>`：调用方按 id 取，没取到就是不挂（悬停仍能看到完整信息卡）。
 */
export function dotLabels(nodes: DotLabelNode[], options: DotLabelOptions = {}): Map<string, DotLabel> {
  const font = options.font ?? DOT_LABEL_FONT_PX;
  const maxChars = options.maxChars ?? DOT_LABEL_MAX_CHARS;
  const shortChars = options.shortChars ?? DOT_LABEL_SHORT_CHARS;
  const gap = options.gap ?? DOT_LABEL_GAP_PX;
  const height = font * 1.2;
  const placed = new Map<string, DotLabel>();

  const ordered = [...nodes]
    .filter((node) => node.title.trim().length > 0)
    .sort((left, right) => left.priority - right.priority
      || right.weight - left.weight
      || left.id.localeCompare(right.id, 'en'));

  // 圆点按自己的半径入格：查「这个标签压到了谁」时按标签矩形外扩一圈去找。
  const dotGrid = buildGrid(nodes, (node) => ({ x: node.x, y: node.y }), (node) => node.radius);
  const maxRadius = nodes.reduce((max, node) => Math.max(max, node.radius), 0);
  const placedGrid = new Map<string, DotLabel[]>();

  const overlaps = (a: DotLabel, b: DotLabel) => Math.abs((a.x + a.width / 2) - (b.x + b.width / 2)) < (a.width + b.width) / 2 + DOT_LABEL_PADDING_PX
    && Math.abs((a.y + a.height / 2) - (b.y + b.height / 2)) < (a.height + b.height) / 2 + DOT_LABEL_PADDING_PX;

  const place = (node: DotLabelNode, chars: number) => {
    const text = truncateTitle(node.title, chars);
    const width = textWidthPx(text, font);
    const label: DotLabel = {
      id: node.id,
      text,
      x: node.x - width / 2,
      y: node.y + node.radius + gap,
      width,
      height,
      baselineY: dotLabelBaselinePx(font, gap, node.radius),
    };
    // 这个标签覆盖的格子只算一次，三条查询共用（量最大的一处开销就是它）。
    const cells = cellsOf(label.x, label.y, width, height, 0);
    /*
     * 不压别的圆点：圆点是这张图的主记号，被文字盖住就等于丢了一个节点。
     *
     * 判据是**矩形到圆的距离**，不是「圆心距」：标签宽 42–90px 而高只有 12.6px，
     * 按圆心距算会让「横向偏出去 40px、纵向正好压在下面」的那一排圆点全部漏判
     * （实测 24 节点视图里有 5 个标签压住了别的圆点）。多留 1px：文字框按 1.2 倍字号估，
     * 而真实渲染的字框约 1.33 倍，留一点余量比压上去好。
     */
    for (const other of nearby(dotGrid, cellsOf(label.x, label.y, width, height, maxRadius + 1))) {
      if (other.id === node.id) continue;
      if (distanceToBox(other.x, other.y, label.x, label.y, width, height) < other.radius + 1) return false;
    }
    for (const other of nearby(placedGrid, cellsOf(label.x, label.y, width, height, DOT_LABEL_PADDING_PX))) {
      if (overlaps(other, label)) return false;
    }
    placed.set(node.id, label);
    for (const key of cells) {
      const bucket = placedGrid.get(key);
      if (bucket) bucket.push(label); else placedGrid.set(key, [label]);
    }
    return true;
  };

  for (const node of ordered) place(node, maxChars);
  if (shortChars > 0 && shortChars < maxChars) for (const node of ordered) if (!placed.has(node.id)) place(node, shortChars);
  return placed;
}
