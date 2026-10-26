/**
 * 圆点档下挂在**关系线**上的关系名。
 *
 * ## 为什么需要
 *
 * 用户要求：「节点是圆点的时候，要显示关系的文字。」
 *
 * 卡片档（120% 以上）一直有边上的关系名，但那一条被 `showEdgeLabels = nodeShape === 'card'` 挡着，
 * 而圆点档现在是绝大多数视图 —— 于是最常见的样子反而**不带关系名**：
 * 看得见「谁和谁连着」，看不出「连的是哪一种关系」。
 *
 * ## 为什么不能直接把卡片档那套搬过来
 *
 * 卡片档的标签是**跟着相机缩放**的（`fontSize={12}` 在世界坐标里）。圆点档要「缩小也读得出」，
 * 字号必须是**屏幕恒定**的（与圆点、圆点下方的名字同一套约定）；而屏幕恒定的文字在密网里
 * 一定会互相压住，所以必须像 `dot-labels.ts` 那样**贪心放置 + 两条回避规则**：
 *
 * 1. 关系文字之间不许重叠（留 2px 缝）；
 * 2. 关系文字不许压住**圆点**（圆点是这张图的主记号），也不许压住圆点下方已经放好的名字。
 *
 * 放不下的**不硬塞**——密网里每根线都标名字，得到的是一片糊在一起的字，比不标更难读。
 * 谁先占位按「与焦点相连的先 → 视觉权重高的先（强关系比弱关系的名字更值得读）→ 位置靠上的先」，
 * 同分按 id 保证确定性。
 *
 * ## 输入输出都是屏幕坐标
 *
 * 与 `dot-labels.ts` 一样：这个模块不碰相机，只吃「这根线此刻的中点在屏幕哪儿」。
 * 渲染处负责把结果放回世界坐标（反缩放），因此这个模块可以在 node 里直接单测。
 */
import { boxHitsCircle, textWidthPx } from './dot-labels.ts';

/** 关系文字的字号（屏幕 px）。与圆点下方的名字同一档。 */
export const EDGE_LABEL_FONT_PX = 10.5;
/** 文字与关系线之间的缝（屏幕 px）：字压在线上会两头都读不清。 */
export const EDGE_LABEL_LIFT_PX = 4;
/** 两个关系文字之间至少留的缝（屏幕 px）。 */
export const EDGE_LABEL_GAP_PX = 2;
/** 一次最多放几个：再多画面上也读不过来，还会拖慢缩放（密网里几千条边都有）。 */
export const EDGE_LABEL_MAX = 80;
/**
 * 参与竞争的上限：先按优先序截断，再做回避。
 *
 * 为什么需要：整库视图（400+ 节点、600+ 条边）每一帧渲染都要跑一遍放置，而**最终只放得下几十条**。
 * 把几百个候选全部拿去做「对 400 个圆点 + 已接受标签」的回避是白算的——实测加一个节点那一帧
 * 的长任务从 804ms 涨到 925–1037ms（A/B 对照：同一页面加 `nolabels=1` 关掉这套逻辑）。
 * 截断之后每个候选只和「排在前面的」比较，最坏代价被钉在 `max × cap` 上。
 * 截断的顺序与最终优先序一致（优先级 → 权重 → 位置 → id），因此**留下的是该留的那几十条**。
 */
export const EDGE_LABEL_CANDIDATES = 160;

export interface EdgeLabelInput {
  /** 边的 id（渲染处按它取回结果）。 */
  id: string;
  /** 关系线中点（屏幕坐标）。没给两端时只在这里试。 */
  x: number;
  y: number;
  /**
   * 关系线两端的屏幕坐标（可选）。给了就沿线的几个点各试一次——
   * 中点常常被圆点或圆点下方的名字占掉，只试中点会让密网里几乎剩不下名字。
   */
  ax?: number;
  ay?: number;
  bx?: number;
  by?: number;
  /** 要写的字（关系名；合并的同对边已把「+N」合在一起）。 */
  text: string;
  /** 视觉权重：越大越先占位（强关系的名字更值得读）。 */
  weight: number;
  /** 0 = 与选中的/悬停的节点相连（优先），1 = 其余。 */
  priority: number;
}

export interface EdgeLabelAvoid {
  /** 圆点（屏幕坐标 + 半径）：关系文字不许压住它们。 */
  dots?: Array<{ x: number; y: number; r: number }>;
  /** 已经在场的文字框（圆点下方的节点名）：不跟它们抢地方。 */
  boxes?: Array<{ x: number; y: number; width: number; height: number }>;
}

export interface EdgeLabelOptions extends EdgeLabelAvoid {
  font?: number;
  lift?: number;
  gap?: number;
  max?: number;
  /** 参与竞争的上限（见 `EDGE_LABEL_CANDIDATES`）。 */
  candidates?: number;
}

export interface EdgeLabel {
  id: string;
  text: string;
  /** 文字框（左上角、宽高，屏幕坐标）。放置判据与渲染都以它为准。 */
  x: number;
  y: number;
  width: number;
  height: number;
  /** 渲染锚点：文字基线的中点（屏幕坐标）。 */
  anchorX: number;
  anchorY: number;
  /** 文字放在线的下方（上面被占掉时才这样）。渲染不需要区别处理，验收读它。 */
  below: boolean;
}

/**
 * 贪心放置。返回值只含**放得下**的那些；调用方按 id 查，查不到就不画。
 *
 * 确定性来自两件事：排序键完整（优先级 → 权重降序 → 屏幕 y → 屏幕 x → id），
 * 以及比较顺序固定（已接受的标签按数组顺序比）。
 */
/** 关系文字可选的落点：先中点，再往两端挪一点（避开圆点与圆点下方的名字）。 */
const SPOTS = [0.5, 0.36, 0.64] as const;

export function edgeLabels(inputs: EdgeLabelInput[], options: EdgeLabelOptions = {}): Map<string, EdgeLabel> {
  const font = options.font ?? EDGE_LABEL_FONT_PX;
  const lift = options.lift ?? EDGE_LABEL_LIFT_PX;
  const gap = options.gap ?? EDGE_LABEL_GAP_PX;
  const max = options.max ?? EDGE_LABEL_MAX;
  const dots = options.dots ?? [];
  const boxes = options.boxes ?? [];
  const height = font * 1.25;
  /*
   * 字形盒的**下缘**在基线下约 0.3em（字母的下伸部）：只按行高算，线**下方**那一侧的文字
   * 会以「底边正好贴住圆点」收尾，实测就在 31% 那一档擦住了一个圆点（压进去 < 1px）。
   * 因此碰撞框统一按「基线以上 height、基线以下 descent」取，上下两侧用同一个框。
   */
  const descent = font * 0.3;
  const boxHeight = height + descent;
  const result = new Map<string, EdgeLabel>();
  const accepted: EdgeLabel[] = [];

  const ordered = [...inputs]
    .filter((item) => item.text.length > 0)
    .sort((left, right) => left.priority - right.priority
      || right.weight - left.weight
      || left.y - right.y
      || left.x - right.x
      || left.id.localeCompare(right.id, 'en'))
    .slice(0, options.candidates ?? EDGE_LABEL_CANDIDATES);

  for (const item of ordered) {
    if (result.size >= max) break;
    /*
     * 碰撞框比字宽估算**宽 8% 再 +2px**：实测浏览器里中文的字形盒比 `textWidthPx` 的估算宽
     * （「硬前置」估 31.5px、量到 34px，约每字多 0.8px），描边还各外扩 1.5px。
     * 估算偏小会让「不许压圆点」变成 0.3px 量级的假通过——肉眼看不出、验收也吵不清。
     * 估大一点只会少放一两个名字，代价小得多（`dot-labels.ts` 文件头是同一套取舍）。
     */
    const textWidth = textWidthPx(item.text, font);
    const width = textWidth * 1.08 + 2;
    const spots = item.ax === undefined || item.ay === undefined || item.bx === undefined || item.by === undefined
      ? [{ x: item.x, y: item.y }]
      : SPOTS.map((t) => ({ x: item.ax! + (item.bx! - item.ax!) * t, y: item.ay! + (item.by! - item.ay!) * t }));
    let placed: EdgeLabel | null = null;
    // 每个落点先试线的**上方**，再试下方：上面被圆点/名字占掉时，下面常常还是空的。
    for (const spot of spots) {
      for (const side of [-1, 1] as const) {
        /*
         * 文字不压在线上：上方的框底边留 lift 的缝，下方反过来。
         * 文字基线 = 框的底边，因此 anchor 直接取框的底边即可（`<text>` 不带 y 偏移）。
         */
        const baseline = side < 0 ? spot.y - lift : spot.y + lift + height;
        const boxX = spot.x - width / 2;
        const boxY = baseline - height;
        /*
         * 判据再各留 1px 余量：浏览器量到的字形盒比这里估的高约 0.9px（字的下缘 + 3px 描边的一半），
         * 不留就会「擦住」圆点——实测压进去 0.25–0.3px。这种量级的重叠肉眼几乎看不出，
         * 但它会让验收里的「不许压圆点」变成一条假的通过线：要么放过真重叠，要么被 0.3px 判红。
         */
        if (dots.some((dot) => boxHitsCircle(boxX, boxY, width, boxHeight + 1, dot.x, dot.y, dot.r + 1))) continue;
        // 不许压住圆点下方已经放好的名字。
        if (boxes.some((box) => boxX < box.x + box.width + gap && box.x < boxX + width + gap
          && boxY < box.y + box.height + gap && box.y < boxY + boxHeight + gap)) continue;
        // 关系文字之间不许重叠。
        if (accepted.some((label) => boxX < label.x + label.width + gap && label.x < boxX + width + gap
          && boxY < label.y + label.height + gap && label.y < boxY + boxHeight + gap)) continue;
        placed = {
          id: item.id,
          text: item.text,
          x: boxX,
          y: boxY,
          width,
          height: boxHeight,
          anchorX: spot.x,
          anchorY: baseline,
          below: side > 0,
        };
        break;
      }
      if (placed) break;
    }
    if (!placed) continue;
    accepted.push(placed);
    result.set(item.id, placed);
  }
  return result;
}
