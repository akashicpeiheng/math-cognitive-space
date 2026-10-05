/**
 * 学习路线 → 节点网络视图的**回放**。
 *
 * 一个暂定的学习路线规划好之后，学习者往往只看到一条事件时间线（「第 3 步：引入流形」），
 * 看不到这些步骤在结构上是怎么长出来的——哪几个节点先立住、新箭头接到谁身上、
 * 第几步之后网络才连成一片。这个模块把一条路线翻成「逐步向外扩张」的序列，
 * 交给组建网络页做动画。
 *
 * 设计上的两个要点：
 *
 * 1. **动画的每一步都对应路线里的一个真实事件**，不是按节点数平均切分。
 *    因此「第 k 步」可以直接说出是哪条行动、产出了什么，而不是一个抽象进度条。
 * 2. **布局只算一次**。所有步骤共用同一份坐标，只有可见集合在变——
 *    否则节点会在动画中途跳位置，学习者没法把注意力放在「谁先出现」上。
 */

import type { PlanEventView, PlanPackageView } from './types';

/** 路线里的一个事件，翻成动画的一步。 */
export interface RouteStep {
  /** 从 1 开始，0 号留给「起点」，便于界面直接显示序号。 */
  index: number;
  eventId: string;
  actionId: string;
  actionTitle: string;
  /** 这一步的主产出节点（事件的 focus）。 */
  focus: string;
  /** 这一步之后**新进入视图**的节点，去重且按稳定顺序。 */
  added: string[];
  /** 这一步用到了哪些已经在视图里的节点。 */
  uses: string[];
  /** 是否为复习事件（复习不是新动作，界面上要区分）。 */
  review: boolean;
}

export interface RoutePlan {
  /** 路线 id，用于标题与 URL。 */
  routeId: string;
  /** 目标节点。 */
  goal: string;
  /** 起点：路线登记的背景入口，动画开始时就已经在场。 */
  entry: string[];
  /** 逐步扩张的步骤。 */
  steps: RouteStep[];
  /** 走到最后一步时视图里的全部节点（按首次出现的顺序）。 */
  all: string[];
  /** 事件 id → 步骤下标（从 0 起），供界面反查。 */
  stepOfEvent: Map<string, number>;
}

/**
 * 把一条路线翻成动画计划。
 *
 * @param route 规划器返回的路线包。
 * @param order 事件的执行顺序（`linearExtensions[0]`）。路线包里的 `events` 不保证
 *   与执行顺序一致，必须显式传入——否则动画会按错误的先后展开。
 * @param actionTitles 行动 id → 标题。路线包只带 `actionId`，标题要去本体图里查；
 *   显式传入而不是在这里再取一次图，是为了让这个模块保持纯函数、可单测。
 */
export function planRoute(
  route: PlanPackageView,
  order: string[],
  actionTitles: Map<string, string> = new Map(),
): RoutePlan {
  const eventById = new Map(route.events.map((event) => [event.id, event]));
  const titleOfAction = (actionId: string) => actionTitles.get(actionId) ?? actionId;

  /*
   * 起点：优先用路线登记的背景入口；**没有背景入口时退化成第一个被产出的节点**。
   *
   * 为什么需要这个退化：规划器给出的大多数路线 `entry` 是空的（背景节点由调用方
   * 临时声明，规划器只记事件）。若起点为空，动画的第 0 帧就什么都没有，
   * 第 1 步却一次性冒出全部节点——那不是「向外扩张」，而是「一次全给」。
   * 退化成「第一个产出的节点当种子」之后，每一步才真的在往外长一层。
   * 这不是编造：那个节点确实是这条路线里最先立住的东西。
   */
  const entry = (route.entry ?? []).length > 0 ? [...route.entry] : [];
  const seen = new Set<string>(entry);
  const all: string[] = [...entry];

  const steps: RouteStep[] = [];
  const stepOfEvent = new Map<string, number>();

  order.forEach((eventId, position) => {
    const event = eventById.get(eventId);
    if (!event) return;
    // 这一步之前已经能用的节点：起点 + 前面所有步骤的产出。
    const before = new Set(seen);

    /*
     * 新进入视图的节点：主产出 + 该事件声明的其它产出。
     *
     * `provides` 里可能重复出现主产出，也可能包含已经在场的节点（例如某个事件
     * 同时「提供」它自己去消费过的东西），因此要按 seen 去重。
     */
    const candidates = [event.focus?.node, ...(event.provides ?? []).map((item) => item.node)]
      .filter((id): id is string => Boolean(id));
    const added: string[] = [];
    for (const id of candidates) {
      if (seen.has(id)) continue;
      // 起点为空时，第一个节点当种子留在第 0 帧，其余照常逐步加入。
      if (all.length === 0) {
        seen.add(id);
        all.push(id);
        continue;
      }
      seen.add(id);
      added.push(id);
      all.push(id);
    }
    if (added.length === 0 && event.kind !== 'review') {
      // 没有任何新节点的事件（例如只消费不产出）不进动画——它不会改变网络形状。
      return;
    }

    steps.push({
      index: steps.length + 1,
      eventId: event.id,
      actionId: event.actionId,
      actionTitle: titleOfAction(event.actionId),
      focus: event.focus?.node ?? '',
      added,
      uses: [...before].sort((a, b) => a.localeCompare(b, 'en')),
      review: event.kind === 'review',
    });
    stepOfEvent.set(event.id, steps.length - 1);
    void position;
  });

  return { routeId: route.id, goal: route.goals?.[0] ?? '', entry: [...(route.entry ?? [])].length > 0 ? [...route.entry] : all.slice(0, 1), steps, all, stepOfEvent };
}

/** 动画状态：第 `step` 步（0 = 只有起点）。 */
export interface RouteFrame {
  step: number;
  /** 当前可见的节点集合。 */
  visible: Set<string>;
  /** 这一步新加入的节点。 */
  added: string[];
  /** 当前步骤对象；`step === 0` 时为 null。 */
  current: RouteStep | null;
  total: number;
}

/** 取动画的第 `step` 帧。`step` 会被夹到 [0, steps.length]。 */
export function routeFrame(plan: RoutePlan, step: number): RouteFrame {
  const total = plan.steps.length;
  const clamped = Math.max(0, Math.min(Math.round(step), total));
  const visible = new Set(plan.entry);
  for (let index = 0; index < clamped; index += 1) {
    for (const id of plan.steps[index].added) visible.add(id);
  }
  return {
    step: clamped,
    visible,
    added: clamped === 0 ? [] : plan.steps[clamped - 1].added,
    current: clamped === 0 ? null : plan.steps[clamped - 1],
    total,
  };
}

/**
 * 动画的 URL 参数。
 *
 * 用 `route` 传节点序列（而不是传路线 id）是刻意的：规划器结果不入库，
 * 路线 id 换个档案或换个预算就失效。把「按什么顺序展开」直接写进 URL，
 * 刷新、分享、回退都能复现同一段动画。
 */
export interface RouteSearchState {
  /** 动画开始时在场的节点，逗号分隔。 */
  entry: string[];
  /** 之后逐步加入的节点，逗号分隔，按展开顺序。 */
  path: string[];
  /** 目标节点，用于高亮终点。 */
  goal: string;
  /** 路线 id，仅用于显示。 */
  routeId: string;
}

export function serializeRouteSearch(plan: RoutePlan): string {
  const params = new URLSearchParams();
  params.set('play', '1');
  params.set('entry', plan.entry.join(','));
  params.set('path', plan.steps.flatMap((step) => step.added).join(','));
  if (plan.goal) params.set('goal', plan.goal);
  if (plan.routeId) params.set('route', plan.routeId);
  return params.toString();
}

export function parseRouteSearch(params: URLSearchParams): RouteSearchState | null {
  if (params.get('play') !== '1') return null;
  const split = (value: string | null) => (value ?? '').split(',').map((item) => item.trim()).filter(Boolean);
  const entry = split(params.get('entry'));
  const path = split(params.get('path'));
  if (entry.length === 0 && path.length === 0) return null;
  return { entry, path, goal: params.get('goal') ?? '', routeId: params.get('route') ?? '' };
}

/**
 * 把 URL 里的扁平 `path` 还原成逐步序列。
 *
 * URL 只记「节点按什么顺序出现」，没记每一步属于哪个事件——事件信息不入 URL，
 * 因为它是路线包的内部细节，分享出去的链接不该依赖某次规划的结果。
 * 因此这里退化成「每个节点一步」，同时保留 routeId 供界面提示这是回放。
 */
export function planFromSearch(state: RouteSearchState): RoutePlan {
  const steps: RouteStep[] = state.path.map((node, index) => ({
    index: index + 1,
    eventId: `replay:${index + 1}`,
    actionId: '',
    actionTitle: '',
    focus: node,
    added: [node],
    uses: [],
    review: false,
  }));
  return {
    routeId: state.routeId,
    goal: state.goal,
    entry: state.entry,
    steps,
    all: [...state.entry, ...state.path],
    stepOfEvent: new Map(),
  };
}

export type { PlanEventView };
