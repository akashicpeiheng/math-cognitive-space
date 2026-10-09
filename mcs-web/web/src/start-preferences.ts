/**
 * 偏好引导的读写与「偏好 → 参数」的映射（2026-10 加，TODO A4-23）。
 *
 * 第四十六轮的边界：「三问的答案只影响开始页的入口排序，`/plan`、`/nodes` 不套用。」
 * 这一条选择的是**让偏好参与规划的默认值**，而不是把「偏好不影响规划」写进界面：
 * 三问里「一次一小步 / 一次走一段 / 先做检查点 / 先不设节奏」本来就是在说节奏，
 * 而 `/plan` 的事件界（horizon）正是节奏旋钮——不接上等于问了白问。
 *
 * 三条纪律：
 * 1. **只改默认值**：规划算法、本体、可达性判定一律不变；用户改过之后不再覆盖他的输入。
 * 2. **改了什么要写出来**：页面上说明「因为你选过 X，所以默认给 Y」，并给回去改的入口。
 * 3. **只在本机**：偏好存在 `localStorage`，不写学习者档案（E）。
 *
 * 中英双语（2026-10）：本模块**不引入 React**；需要语种的函数多收一个
 * `locale: Locale = 'zh'` 参数（默认中文，因此既有调用点与中文渲染逐字不变），
 * 由调用方（组件）传当前语种。
 */

import type { Locale } from './i18n/locales';

export type StartGoal = 'gap' | 'route' | 'overview' | 'concept';
export type StartEntry = 'case' | 'discipline' | 'construct' | 'method' | 'practice';
export type StartPace = 'small' | 'block' | 'checkpoint' | 'free';

/** 成对的显示名（2026-10 中英双语）：中文那份逐字与从前相同。 */
interface Pair { zh: string; en: string }

/**
 * 三问的答案在界面上的显示名。
 *
 * 与 `labels.ts` 的分工：那些表是**本体受控词表**的显示名，这三张是**本页偏好**的文案，
 * 属于这一页自己的长文案，因此跟着这个模块走（手册 §1「页面自己的长文案放该页模块」）。
 */
export const GOAL_LABELS: Record<StartGoal, Pair> = {
  gap: { zh: '我知道自己卡在哪', en: 'I know where I am stuck' },
  route: { zh: '我想按顺序推进', en: 'I want to advance in order' },
  overview: { zh: '我先想看全局', en: 'I want the big picture first' },
  concept: { zh: '我只想弄懂一个概念', en: 'I want to understand one concept' },
};

export const ENTRY_LABELS: Record<StartEntry, Pair> = {
  case: { zh: '按案例', en: 'By case' },
  discipline: { zh: '按学科', en: 'By discipline' },
  construct: { zh: '按对象类型', en: 'By object type' },
  method: { zh: '按方法', en: 'By method' },
  practice: { zh: '按练习', en: 'By practice' },
};

export const PACE_LABELS: Record<StartPace, Pair> = {
  small: { zh: '一次一小步', en: 'One small step at a time' },
  block: { zh: '一次走一段', en: 'A whole stretch at a time' },
  checkpoint: { zh: '先做检查点', en: 'A checkpoint first' },
  free: { zh: '先不设节奏', en: 'No fixed pace for now' },
};

export interface StartPreferences {
  goal: StartGoal | null;
  entry: StartEntry | null;
  pace: StartPace | null;
}

export const EMPTY_PREFERENCES: StartPreferences = { goal: null, entry: null, pace: null };

/** 偏好存储键。改名字等于丢弃所有人的偏好，因此不动。 */
export const PREF_KEY = 'mcs-start-preferences-v1';
/**
 * 「引导已收起」标记（TODO A4-24）：与偏好**分开存**。
 * 收起只是收起——想重看时点「重新显示引导」就回来，偏好一个都不动。
 */
export const GUIDE_COLLAPSED_KEY = 'mcs-start-guide-collapsed-v1';
/** 「来过」标记（TODO A4-25）：用来区分首访与回访的默认起点。 */
export const VISITED_KEY = 'mcs-start-visited-v1';

const hasStorage = () => typeof localStorage !== 'undefined';

/** 读偏好：坏数据一律退回空偏好，不抛错、不让页面白屏。 */
export function readPreferences(): StartPreferences {
  if (!hasStorage()) return EMPTY_PREFERENCES;
  try {
    const raw = localStorage.getItem(PREF_KEY);
    if (!raw) return EMPTY_PREFERENCES;
    const parsed = JSON.parse(raw) as Partial<StartPreferences>;
    return {
      goal: parsed.goal ?? null,
      entry: parsed.entry ?? null,
      pace: parsed.pace ?? null,
    };
  } catch { return EMPTY_PREFERENCES; }
}

export function writePreferences(next: StartPreferences): void {
  if (!hasStorage()) return;
  if (next.goal === null && next.entry === null && next.pace === null) localStorage.removeItem(PREF_KEY);
  else localStorage.setItem(PREF_KEY, JSON.stringify(next));
}

export function isGuideCollapsed(): boolean {
  if (!hasStorage()) return false;
  return localStorage.getItem(GUIDE_COLLAPSED_KEY) === '1';
}

/**
 * 记下「引导已收起」。
 *
 * 名字与页面里的 state setter 区分开（`writeGuideCollapsed` vs `setGuideCollapsed`）：
 * 一个是落盘，一个是 React 状态，混在一起读代码时会以为写一处就够了。
 */
export function writeGuideCollapsed(collapsed: boolean): void {
  if (!hasStorage()) return;
  if (collapsed) localStorage.setItem(GUIDE_COLLAPSED_KEY, '1');
  else localStorage.removeItem(GUIDE_COLLAPSED_KEY);
}

/**
 * 是不是回访者。
 *
 * 判据是**本机的「来过」标记**，不是档案数据：首访与回访的区别是「这个人以前打开过这一页吗」，
 * 与有没有学习记录无关（一个新档案也可能是回访者）。第一次调用返回 `false` 并写下标记，
 * 之后都返回 `true`——`StartPage` 在挂载时调用一次。
 */
export function consumeFirstVisit(): boolean {
  if (!hasStorage()) return true;
  const seen = localStorage.getItem(VISITED_KEY) === '1';
  if (!seen) localStorage.setItem(VISITED_KEY, '1');
  return !seen;
}

/**
 * 节奏偏好 → `/plan` 的事件界默认值。
 *
 * 依据写在这里，免得以后变成魔法数字：
 * - `small`「一次一小步」= 给 15 分钟能走完的入口 → 事件界 3（3 个事件大约就是一小步）；
 * - `block`「一次走一段」= 完整的一条路线 → 事件界 8（规划页原本的默认值）；
 * - `checkpoint`「先做检查点」→ 事件界 4，并把用户引向自检，而不是硬塞一条长路线；
 * - `free`「先不设节奏」→ 不动默认（8）。
 * 返回 `null` 表示「这条偏好不改默认」。
 */
export function paceHorizon(pace: StartPace | null, locale: Locale = 'zh'): { horizon: number; why: string } | null {
  switch (pace) {
    case 'small':
      return { horizon: 3, why: { zh: '你选过「一次一小步」：事件界按 15 分钟档给到 3 个事件。', en: 'You chose “one small step at a time”: the event horizon is 3 events, the 15-minute band.' }[locale] };
    case 'checkpoint':
      return { horizon: 4, why: { zh: '你选过「先做检查点」：事件界给到 4，先走一小段再自检。', en: 'You chose “a checkpoint first”: the event horizon is 4 — walk a short stretch, then self-check.' }[locale] };
    case 'block':
      return { horizon: 8, why: { zh: '你选过「一次走一段」：事件界保持 8，正好是一条完整路线。', en: 'You chose “a whole stretch at a time”: the event horizon stays 8, exactly one complete route.' }[locale] };
    default:
      return null;
  }
}

/** 偏好 → 一句话依据（规划页顶部展示用；没有偏好时返回 null）。 */
export function preferenceSummary(preferences: StartPreferences, locale: Locale = 'zh'): string | null {
  const parts: string[] = [];
  if (preferences.goal) parts.push(GOAL_LABELS[preferences.goal][locale]);
  if (preferences.entry) parts.push(ENTRY_LABELS[preferences.entry][locale]);
  if (preferences.pace) parts.push(PACE_LABELS[preferences.pace][locale]);
  if (parts.length === 0) return null;
  return parts.join(' · ');
}
