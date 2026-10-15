/**
 * 偏好引导的读写与「偏好 → 参数」的映射（2026-10 加，TODO A4-23）。
 *
 * 第四十六轮的边界：「三问的答案只影响开始页的入口排序，`/plan`、`/nodes` 不套用。」
 * 这一条选择的是**让偏好参与规划的默认值**，而不是把「偏好不影响规划」写进界面：
 * 三问里「一次一小步 / 一次走一段 / 先做检查点 / 先不设节奏」本来就是在说节奏，
 * 而 `/plan` 的事件界（horizon）正是节奏旋钮——不接上等于问了白问。
 *
 * 第二处接入是**第四问**（2026-10 加）：它决定「学习方向」选项表里的学法偏好
 * （同档内先给哪一类对象），见 `moodPreference`。
 *
 * 三条纪律：
 * 1. **只改默认值与顺序**：规划算法、本体、可达性判定一律不变；用户改过之后不再覆盖他的输入。
 * 2. **改了什么要写出来**：页面上说明「因为你选过 X，所以默认给 Y」，并给回去改的入口。
 * 3. **只在本机**：偏好存在 `localStorage`，不写学习者档案（E）。
 *    （注意与「学习方向」的区别：方向是 E 层的声明，偏好只是本机排序口味。）
 *
 * 中英双语（2026-10）：本模块**不引入 React**；需要语种的函数多收一个
 * `locale: Locale = 'zh'` 参数（默认中文，因此既有调用点与中文渲染逐字不变），
 * 由调用方（组件）传当前语种。
 */

import type { Locale } from './i18n/locales';

export type StartGoal = 'gap' | 'route' | 'overview' | 'concept';
export type StartEntry = 'case' | 'discipline' | 'construct' | 'method' | 'practice';
export type StartPace = 'small' | 'block' | 'checkpoint' | 'free';
/**
 * 第四问：想以什么方式学（2026-10 加）。
 *
 * 它和前三问一样是**排序偏好**，只不过作用在「学习方向」的选项表上
 * （`web/src/direction.ts` 的 `MOOD_CONSTRUCTS`）：同在方向上、解锁数一样时，
 * 先给你偏好的那一类；**压不过方向，也压不过「有没有东西可解锁」**。
 */
export type StartMood = 'base' | 'example' | 'apply' | 'any';

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

export const MOOD_LABELS: Record<StartMood, Pair> = {
  base: { zh: '先把定义与条件理清', en: 'Get the definitions and conditions straight first' },
  example: { zh: '先看具体例子与反例', en: 'See concrete examples and counterexamples first' },
  apply: { zh: '先把它用起来', en: 'Put it to use first' },
  any: { zh: '没什么偏好', en: 'No particular preference' },
};

export interface StartPreferences {
  goal: StartGoal | null;
  entry: StartEntry | null;
  pace: StartPace | null;
  /** 第四问（2026-10 加）。旧的存储里没有这个键 → `null`，与「没答过」同形。 */
  mood: StartMood | null;
  /**
   * 选中的**次级学科**（本体 `discipline` 受控词表的值，见 `data/fields.mjs`）。
   *
   * 2026-10-11 加（引导重设计）：用户要求「主要从次级学科、已有的目标入手，
   * 结合学习者的兴趣引导式地为学习者清晰展示学习方向」。
   *
   * 三条纪律：
   * 1. **只改排序与呈现**：不隐藏任何方向入口、不改本体、不改规划算法，
   *    也压不过「在不在方向上」与「确认它能多开始几个」这两条事实判据；
   * 2. **空数组与没答过同义**（都表示「还没选」）——存数组是为了多选；
   * 3. 与 `mood` 的区别：`mood` 管「先给哪一类**对象**」，本项管
   *    「先给哪一条**方向**」。两者都只是口味，事实判据在它们之上。
   */
  interests: string[];
  /**
   * 选中的**已有的目标**（方向入口 id，与 `direction-presets.ts` 同源）。
   *
   * `null` = 还没选。**这不是方向声明**：真正的声明写 E
   * （`useDirection().declare`，`learning_directions` 表 + 一条 `kind: 'goal'` 事件）。
   * 这里只记「这一页先替你看哪一条的骨架」，因此仍属只写本机的偏好。
   */
  aim: string | null;
}

export const EMPTY_PREFERENCES: StartPreferences = {
  goal: null, entry: null, pace: null, mood: null, interests: [], aim: null,
};

/**
 * 偏好存储键。改名字等于丢弃所有人的偏好，因此不动。
 *
 * 2026-10-11 加了两个字段（`interests` / `aim`）但**没有换键**：
 * 旧值缺这两个字段时按「还没选」解析，用户已经答过的四问一条都不丢。
 */
export const PREF_KEY = 'mcs-start-preferences-v1';
/**
 * 「引导已收起」标记（TODO A4-24）：与偏好**分开存**。
 * 收起只是收起——想重看时点「重新显示引导」就回来，偏好一个都不动。
 */
export const GUIDE_COLLAPSED_KEY = 'mcs-start-guide-collapsed-v1';
/** 「来过」标记（TODO A4-25）：用来区分首访与回访的默认起点。 */
export const VISITED_KEY = 'mcs-start-visited-v1';

const hasStorage = () => typeof localStorage !== 'undefined';

/**
 * 读偏好：坏数据一律退回空偏好，不抛错、不让页面白屏。
 *
 * 每个字段都做一次形状校验，**不直接信任 `localStorage` 里的 JSON**：
 * 这里过去是 `parsed.x ?? null`，对 `null` 正确，但手工改过的存储或别的站点写下的
 * 同名字符串会原样进入渲染（例如 `interests: "分析"` 会以字符串身分参与
 * `new Set(interests)`，`aim: 123` 会当成节点 id 去查）。校验失败只回退该字段。
 */
export function readPreferences(): StartPreferences {
  if (!hasStorage()) return EMPTY_PREFERENCES;
  try {
    const raw = localStorage.getItem(PREF_KEY);
    if (!raw) return EMPTY_PREFERENCES;
    const parsed = JSON.parse(raw) as Partial<StartPreferences>;
    return {
      goal: typeof parsed.goal === 'string' ? parsed.goal : null,
      entry: typeof parsed.entry === 'string' ? parsed.entry : null,
      pace: typeof parsed.pace === 'string' ? parsed.pace : null,
      // 第四问是 2026-10 加的：旧数据里没有这个键，读成 null 与「没答过」同形。
      mood: typeof parsed.mood === 'string' ? parsed.mood : null,
      // 2026-10-11 加的两项同上：旧数据没有它们，读成空与「还没选」同形。
      interests: Array.isArray(parsed.interests)
        ? parsed.interests.filter((item): item is string => typeof item === 'string' && item !== '')
        : [],
      aim: typeof parsed.aim === 'string' && parsed.aim !== '' ? parsed.aim : null,
    };
  } catch { return EMPTY_PREFERENCES; }
}

/** 四个旧字段是否全空（决定 `writePreferences` 走「清键」还是「落盘」）。 */
function legacyEmpty(next: StartPreferences): boolean {
  return next.goal === null && next.entry === null && next.pace === null && next.mood === null;
}

/** 两个新字段是否全空（同上：把「彻底清空」与「只选了兴趣」区分开）。 */
function extendedEmpty(next: StartPreferences): boolean {
  return (!Array.isArray(next.interests) || next.interests.length === 0) && next.aim === null;
}

/**
 * 写偏好。
 *
 * 清键的判据是**两族字段都空**：`interests` 单独有值（用户只挑了兴趣还没答完四问）时
 * 必须落盘，否则「全部用默认」之外的路径会把兴趣静默丢掉。
 */
export function writePreferences(next: StartPreferences): void {
  if (!hasStorage()) return;
  if (legacyEmpty(next) && extendedEmpty(next)) localStorage.removeItem(PREF_KEY);
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

/**
 * 偏好 → 一句话依据（规划页顶部展示用；没有偏好时返回 null）。
 *
 * 2026-10-11 把两个新字段也算进去（它们同样是「你选过的东西」，不显示就成了暗箱）。
 * 显示名要在哪查由调用方给：`interests` 是本体受控词表的值、`aim` 是本体节点 id，
 * 两者的显示名分别住在 `labels.ts` 与本体里——本模块**不自己造第二份译名**
 * （不传就用原值，宁可显示 `微分几何` / `dg:generalized-stokes-theorem` 也不编一个名字）。
 */
export function preferenceSummary(
  preferences: StartPreferences,
  locale: Locale = 'zh',
  names: { interest?: (id: string) => string; aim?: (id: string) => string } = {},
): string | null {
  const parts: string[] = [];
  if (preferences.goal) parts.push(GOAL_LABELS[preferences.goal][locale]);
  if (preferences.entry) parts.push(ENTRY_LABELS[preferences.entry][locale]);
  if (preferences.pace) parts.push(PACE_LABELS[preferences.pace][locale]);
  if (preferences.mood) parts.push(MOOD_LABELS[preferences.mood][locale]);
  if (preferences.interests.length > 0) {
    parts.push(preferences.interests.map((id) => names.interest?.(id) ?? id).join(locale === 'en' ? ', ' : '、'));
  }
  if (preferences.aim) parts.push(names.aim?.(preferences.aim) ?? preferences.aim);
  if (parts.length === 0) return null;
  return parts.join(' · ');
}

/**
 * 第四问「想以什么方式学」→ 方向选项表的排序偏好。
 *
 * 返回 `null` 表示「不动排序」（没答过、或选了「没什么偏好」）：
 * 与 `paceHorizon` 同一条纪律——**偏好只改默认值/顺序，不改算法、不改本体**。
 */
export function moodPreference(mood: StartMood | null): StartMood | null {
  if (!mood || mood === 'any') return null;
  return mood;
}
