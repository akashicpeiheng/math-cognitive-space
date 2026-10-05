/**
 * 路线阅读上下文：把「沿这条路线读」变成可以在节点页逐步走完的状态。
 *
 * 为什么不用 URL 存整条路线：规划器结果不入库，事件 id 与路线 id 都只在本次规划里有效；
 * 把路线正文塞进 URL 会让链接长得无法分享，还会与回放参数打架。
 * 因此这里把路线存进本机会话（sessionStorage），URL 只带一个短 id 与当前步号：
 * 刷新可以继续，关掉标签页就结束——它是一次阅读会话，不是学习记录。
 *
 * 边界：本模块只读写浏览器会话存储，不产生 E 事件，也不碰公共本体 M。
 */

import type { PlanPackageView } from './types';

export interface ReadingStep {
  /** 从 1 开始。 */
  index: number;
  eventId: string;
  actionId: string;
  actionTitle: string;
  /** 这一步关注的节点。 */
  node: string;
  /** 回看事件：不产出新节点，但顺序里保留它。 */
  review: boolean;
}

export interface ReadingRoute {
  id: string;
  routeId: string;
  goal: string;
  createdAt: string;
  steps: ReadingStep[];
}

const KEY = 'mcs-reading-route-v1';
const PROGRESS_KEY = 'mcs-reading-progress-v1';
const KEEP = 5;

function session(): Storage | null {
  if (typeof window === 'undefined') return null;
  try { return window.sessionStorage; } catch { return null; }
}

function readAll(): Record<string, ReadingRoute> {
  const store = session();
  if (!store) return {};
  try {
    const raw = store.getItem(KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    return parsed as Record<string, ReadingRoute>;
  } catch { return {}; }
}

/**
 * 按路线的**事件顺序**生成阅读步骤。
 *
 * 与网络回放不同：回放会跳过「不产出新节点」的事件（它们不改变图形），
 * 阅读顺序必须保留每一次事件，包括重复的回看事件——那正是路线承诺的顺序。
 */
export function buildReadingSteps(
  route: PlanPackageView,
  order: string[],
  actionTitles: Map<string, string> = new Map(),
): ReadingStep[] {
  const eventById = new Map(route.events.map((event) => [event.id, event]));
  const steps: ReadingStep[] = [];
  for (const eventId of order) {
    const event = eventById.get(eventId);
    if (!event) continue;
    steps.push({
      index: steps.length + 1,
      eventId,
      actionId: event.actionId,
      actionTitle: actionTitles.get(event.actionId) ?? event.actionId,
      node: event.focus?.node ?? '',
      review: event.kind === 'review',
    });
  }
  return steps;
}

export function saveReadingRoute(route: Omit<ReadingRoute, 'id' | 'createdAt'>): ReadingRoute {
  const id = `r${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  const saved: ReadingRoute = { ...route, id, createdAt: new Date().toISOString() };
  const store = session();
  if (store) {
    try {
      const all = readAll();
      all[id] = saved;
      const ids = Object.keys(all);
      while (ids.length > KEEP) {
        const oldest = ids.shift();
        if (oldest) delete all[oldest];
      }
      store.setItem(KEY, JSON.stringify(all));
    } catch { /* 隐私模式：路线只在当前页面状态里可用 */ }
  }
  return saved;
}

export function readReadingRoute(id: string | null): ReadingRoute | null {
  if (!id) return null;
  return readAll()[id] ?? null;
}

export function saveReadingProgress(id: string, step: number): void {
  const store = session();
  if (!store) return;
  try {
    const raw = store.getItem(PROGRESS_KEY);
    const all: Record<string, number> = raw ? JSON.parse(raw) as Record<string, number> : {};
    all[id] = step;
    store.setItem(PROGRESS_KEY, JSON.stringify(all));
  } catch { /* 忽略 */ }
}

export function readReadingProgress(id: string | null): number {
  const store = session();
  if (!store || !id) return 1;
  try {
    const raw = store.getItem(PROGRESS_KEY);
    if (!raw) return 1;
    const all = JSON.parse(raw) as Record<string, number>;
    const value = all[id];
    return Number.isFinite(value) && value >= 1 ? value : 1;
  } catch { return 1; }
}

/** 当前步对应的节点；越界时夹到两端。 */
export function readingNodeAt(route: ReadingRoute, step: number): ReadingStep | null {
  if (route.steps.length === 0) return null;
  const index = Math.max(1, Math.min(Math.round(step), route.steps.length));
  return route.steps[index - 1];
}
