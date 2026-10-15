import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useI18n } from '../i18n';
import type { Locale } from '../i18n/locales';
import type { StartEntry, StartGoal, StartMood, StartPace, StartPreferences } from '../start-preferences';

/**
 * 「开始学习」页开头的**偏好引导**：三问，然后给出一份属于你的起点。
 *
 * 用户的要求是「不要让用户一开始就学，让用户先去从大的视角选择学习的偏好，
 * 设置几个引导性的问题，优化交互逻辑，让用户真实地感到自己在主导自己的学习」。
 *
 * 这里的设计取舍：
 *
 * 1. **问题在前，内容在后**。进入页面先看到三问，而不是一屏案例与入口——先定方向，再看材料。
 * 2. **一次只问一个**（渐进披露）。答完第 1 问才出现第 2 问，答完第 2 问才出现第 3 问；
 *    每一问下方写明「为什么问这个」，让选择有依据，而不是被问卷牵着走。
 * 3. **答案立刻变成可点的入口**。每一问都能看到自己选了什么，最后收成一张「你的起点」卡：
 *    2–3 个真实链接 + 依据说明。选了就有后果，这才叫主导。
 * 4. **随时能退**。每一问都能改、能跳；「全部用默认」一键给出一份保守起点；
 *    页面下方原有的按角度入口**一条都没有删**——引导是排序，不是门禁。
 * 5. **只写本机**。偏好存在 `localStorage`，只影响这一页给你排的顺序；
 *    **不写学习者档案 E**，也不改变本体 M。这一点在界面上写明。
 *
 * 双语（2026-10）：
 * - 组件内文案走 `useI18n().locale` 取本文件的成对表；
 * - `buildStartPlan()` 与三个选项表是**纯数据**，因此多收一个 `locale: Locale = 'zh'` 参数，
 *   默认中文——既有调用与中文站逐字不变；
 * - 中文一侧逐字保留：`tests/start-chooser.mjs` 直接比对「先定方向」「为什么问这个」「你的起点」
 *   「默认起点（首访）」「默认起点（回访）」「改一改」「先收起引导」「重新显示引导」「全部用默认」
 *   「直接给我默认起点」，以及依据句里的「缺口」「回访者」「第一次来」与 `.start-plan-note` 的
 *   「不写学习者档案」「不设门禁」措辞。
 */

/*
 * 偏好类型与常量**只有一处定义**（`web/src/start-preferences.ts`）：`/plan` 也读同一份偏好
 * （TODO A4-23），定义留在组件里会让规划页反向依赖一个组件模块。这里重新导出，
 * 既有的 `from '../components/StartChooser'` 引用不必改。
 */
export type { StartEntry, StartGoal, StartMood, StartPace, StartPreferences } from '../start-preferences';
export { EMPTY_PREFERENCES, PREF_KEY } from '../start-preferences';

interface Pair { zh: string; en: string }

export interface StartOption<T extends string> { id: T; label: string; hint: string }

interface OptionSpec<T extends string> { id: T; label: Pair; hint: Pair }

/** 三问的定义：选项、以及「为什么问这个」。中文为源，英文成对写在旁边。 */
const GOAL_SPEC: Array<OptionSpec<StartGoal>> = [
  { id: 'gap', label: { zh: '我知道自己卡在哪', en: 'I know where I am stuck' }, hint: { zh: '先补那个具体缺口', en: 'Fill that specific gap first' } },
  { id: 'route', label: { zh: '我想按顺序推进', en: 'I want to move forward in order' }, hint: { zh: '给我一条路线', en: 'Give me a route' } },
  { id: 'overview', label: { zh: '我先想看全局', en: 'I want the overview first' }, hint: { zh: '让我自己挑', en: 'Let me pick for myself' } },
  { id: 'concept', label: { zh: '我只想弄懂一个概念', en: 'I want to understand one concept' }, hint: { zh: '直奔对象页', en: 'Go straight to the object page' } },
];

const ENTRY_SPEC: Array<OptionSpec<StartEntry>> = [
  { id: 'case', label: { zh: '按案例', en: 'By case' }, hint: { zh: '从一个原型问题进', en: 'Enter from a prototype problem' } },
  { id: 'discipline', label: { zh: '按学科', en: 'By discipline' }, hint: { zh: '按领域筛对象', en: 'Filter objects by field' } },
  { id: 'construct', label: { zh: '按对象类型', en: 'By object type' }, hint: { zh: '定义 / 定理 / 反例…', en: 'Definition / theorem / counterexample…' } },
  { id: 'method', label: { zh: '按方法', en: 'By method' }, hint: { zh: '先要讲法', en: 'I want the method first' } },
  { id: 'practice', label: { zh: '按练习', en: 'By practice' }, hint: { zh: '先做题', en: 'Start with the problems' } },
];

const PACE_SPEC: Array<OptionSpec<StartPace>> = [
  { id: 'small', label: { zh: '一次一小步', en: 'One small step at a time' }, hint: { zh: '给 15 分钟能走完的入口', en: 'Entries you can finish in 15 minutes' } },
  { id: 'block', label: { zh: '一次走一段', en: 'One stretch at a time' }, hint: { zh: '给完整的一条路线', en: 'A complete route' } },
  { id: 'checkpoint', label: { zh: '先做检查点', en: 'Checkpoints first' }, hint: { zh: '先看我会不会', en: 'See whether I can already do it' } },
  { id: 'free', label: { zh: '先不设节奏', en: 'No fixed pace' }, hint: { zh: '我自己看着办', en: 'I will decide as I go' } },
];

/**
 * 第四问（2026-10 加）：想以什么方式学。
 *
 * 它是**排序偏好**，作用在「学习方向」的选项表上：同在方向上、解锁数一样时，
 * 先给你偏好的那一类对象。它压不过方向，也压不过「有没有东西可解锁」——
 * 偏好是口味，那两条是事实。
 */
const MOOD_SPEC: Array<OptionSpec<StartMood>> = [
  { id: 'base', label: { zh: '先把定义与条件理清', en: 'Get definitions and conditions straight first' }, hint: { zh: '先给概念、定义、理论', en: 'Concepts, definitions, theory first' } },
  { id: 'example', label: { zh: '先看具体例子与反例', en: 'Concrete examples and counterexamples first' }, hint: { zh: '先给例子、反例、误区', en: 'Examples, counterexamples, misconceptions first' } },
  { id: 'apply', label: { zh: '先把它用起来', en: 'Put it to use first' }, hint: { zh: '先给方法、问题、构造', en: 'Methods, problems, constructions first' } },
  { id: 'any', label: { zh: '没什么偏好', en: 'No particular preference' }, hint: { zh: '不改动任何顺序', en: 'Changes no ordering' } },
];

function optionsFor<T extends string>(spec: Array<OptionSpec<T>>, locale: Locale): Array<StartOption<T>> {
  return spec.map((item) => ({ id: item.id, label: item.label[locale], hint: item.hint[locale] }));
}

/**
 * 次级学科兴趣的选项（2026-10-11 加）。
 *
 * 与上面四问的**结构差别**（不是排版差别）：这四个选项表的取值是固定的枚举，
 * 而次级学科来自本体（`data/fields.mjs` 的受控词表）。因此这里**没有** `INTEREST_SPEC`：
 * 选项由调用方按本体实际存在的学科传入（`startDirection.ts` 的 `disciplineTotals`），
 * 一处也不写死。理由与 `facets.ts` 的文件头同源——
 * **一个筛选选项只要可能给出空结果，就已经在骗人了**。
 */
export interface InterestOption {
  /** 次级学科 id（受控词表的值，不翻译）。 */
  id: string;
  /** 显示名（由 `labels.ts` / `case-catalog.ts` 的成对表给）。 */
  label: string;
  /** 本体里属于这一支的单元数。 */
  count: number;
}

/** 当前语种下的四问选项。 */
export function startOptions(locale: Locale): {
  goal: Array<StartOption<StartGoal>>;
  entry: Array<StartOption<StartEntry>>;
  pace: Array<StartOption<StartPace>>;
  mood: Array<StartOption<StartMood>>;
} {
  return {
    goal: optionsFor(GOAL_SPEC, locale),
    entry: optionsFor(ENTRY_SPEC, locale),
    pace: optionsFor(PACE_SPEC, locale),
    mood: optionsFor(MOOD_SPEC, locale),
  };
}

/* 既有导出保持原样（中文），供还不知道语种的调用方使用；组件一律走 `startOptions(locale)`。 */
export const GOAL_OPTIONS: Array<StartOption<StartGoal>> = optionsFor(GOAL_SPEC, 'zh');
export const ENTRY_OPTIONS: Array<StartOption<StartEntry>> = optionsFor(ENTRY_SPEC, 'zh');
export const PACE_OPTIONS: Array<StartOption<StartPace>> = optionsFor(PACE_SPEC, 'zh');
export const MOOD_OPTIONS: Array<StartOption<StartMood>> = optionsFor(MOOD_SPEC, 'zh');

export interface StartPlanItem {
  label: string;
  to: string;
  why: string;
  primary?: boolean;
}

/**
 * 把三问的答案翻译成具体入口。
 *
 * 只做「排序与取舍」，不做内容推荐：每一项都是站内已有的页面或入口，
 * 依据写得出来才列；答案不全时给保守的默认（看全局 + 按案例）。
 *
 * 2026-10（TODO A4-25）：**默认起点分首访与回访**。三问一个都没答时，
 * 首访者看到的是「先看全局」（他不知道这里有什么，先给结构），
 * 回访者看到的是「接着上次」（他已经有进度，先给继续与复习的入口）。
 * 判据由调用方给（`returning`），因为这个区别与有没有学习记录无关——
 * 只与「这个人以前打开过这一页吗」有关。
 *
 * 双语：`locale` 默认 `'zh'`；中文串是源，逐字不得改动（`tests/start-chooser.mjs` 比对）。
 */
export function buildStartPlan(
  preferences: StartPreferences,
  { returning = false, locale = 'zh' }: { returning?: boolean; locale?: Locale } = {},
): { items: StartPlanItem[]; basis: string[]; isDefault: boolean } {
  const en = locale === 'en';
  const goal = preferences.goal ?? 'overview';
  const entry = preferences.entry ?? 'case';
  const pace = preferences.pace ?? 'free';
  const isDefault = preferences.goal === null && preferences.entry === null && preferences.pace === null;
  const basis: string[] = [];
  const items: StartPlanItem[] = [];

  if (isDefault) {
    /*
     * 一个都没答：这是「默认起点」，不是「你选了看全局」。
     * 因此依据里要写清这是默认，并说明首访与回访拿到的东西不一样。
     */
    if (returning) {
      basis.push(en
        ? 'You have been here before: with no preferences the default start picks up where you left off (first-time visitors default to the overview).'
        : '你是回访者：没有偏好时默认起点先接上次的进度（首访者的默认是先看全局）。');
      items.push(en
        ? { label: 'Pick up where you left off: learning record and review queue', to: '/profile', why: 'Returning learners mostly continue and review; this page puts both at the top.', primary: true }
        : { label: '接着上次：看学习记录与复习队列', to: '/profile', why: '回访者最常用的是继续与复习；这一页把两者放在最上面。', primary: true });
      items.push(en
        ? { label: 'Back to the cases', to: '/start#cases', why: 'Re-enter along another thread; existing records are untouched.' }
        : { label: '回到案例', to: '/start#cases', why: '换一条线索重新进，不会改动已有记录。' });
      items.push(en
        ? { label: 'Just browse around (changes no records)', to: '/nodes', why: 'Browsing never marks a node as mastered.' }
        : { label: '先随便逛逛（不改任何记录）', to: '/nodes', why: '浏览不会把节点标记为已掌握。' });
      return { items, basis, isDefault };
    }
    basis.push(en
      ? 'First visit: with no preferences the default start gives the overview first, then you decide where to drill down.'
      : '第一次来：没有偏好时默认起点先看全局，再决定从哪里下钻。');
    items.push(en
      ? { label: 'Open the knowledge network', to: '/network', why: 'Coloured by relation strength; hard prerequisites and registered relations are shown separately.', primary: true }
      : { label: '打开知识网络', to: '/network', why: '按关系强弱上色，硬前置与登记关联分开显示。', primary: true });
    items.push(en
      ? { label: 'See which cases exist', to: '/start#cases', why: 'Each case matches one kind of confusion; pick the one closest to yours.' }
      : { label: '看看有哪些案例', to: '/start#cases', why: '每个案例都对应一类困惑，选最像你的那条。' });
    items.push(en
      ? { label: 'Set a direction first (answer the three questions above)', to: '/start#prefs', why: 'Once answered, this page reorders its entries according to your answers.' }
      : { label: '先定方向（回答上面三个问题）', to: '/start#prefs', why: '答完这三问，这一页会按你的答案重排入口。' });
    return { items, basis, isDefault };
  }

  if (goal === 'gap') {
    basis.push(en
      ? 'You say you are stuck on one specific gap: fill the prerequisite first, then return to where you were.'
      : '你说自己卡在某个具体缺口上：先补前置，再回到原来的地方。');
    items.push(en
      ? { label: 'See which prerequisites this object is missing', to: '/network', why: 'In the knowledge network, press and hold the right mouse button on a node to pull out its strong prerequisites.', primary: true }
      : { label: '看这个对象缺哪些前置', to: '/network', why: '知识网络里右键按住一个节点，能取出它的强关联前置。', primary: true });
    items.push(en
      ? { label: 'Find that object by discipline', to: '/nodes', why: 'Filter by field and object type; the node page states its conditions and counterexamples.' }
      : { label: '按学科找到那个对象', to: '/nodes', why: '按领域与对象类型筛到它，节点页写明条件与反例。' });
  } else if (goal === 'route') {
    basis.push(en
      ? 'You want an order: this page gives you a route rather than a pile of scattered entries.'
      : '你要顺序：这一页给你路线，而不是一堆散入口。');
    items.push(en
      ? { label: 'Plan a learning route', to: '/plan', why: 'Pick a goal node; the planner orders events by the relations in the ontology.', primary: true }
      : { label: '规划一条学习路线', to: '/plan', why: '选目标节点，规划器按本体里的关系算顺序。', primary: true });
    items.push(en
      ? { label: 'Look at one example path first', to: '/plan', why: 'Example paths come with milestones and measured event horizons; see the pace first.' }
      : { label: '先看一条范例路径', to: '/plan', why: '范例路径带里程碑与实测事件界，先看看节奏。' });
  } else if (goal === 'concept') {
    basis.push(en
      ? 'You want to understand one concept: go straight to the object page; it puts motivation, conditions and counterexamples together.'
      : '你只想弄懂一个概念：直接进对象页，节点页把动机、条件与反例放在一起。');
    items.push(en
      ? { label: 'Find a mathematical object', to: '/nodes', why: 'Search by title, ID or summary, or filter by field.', primary: true }
      : { label: '找一个数学对象', to: '/nodes', why: '按标题、ID 或摘要搜索，或按领域筛。', primary: true });
    items.push(en
      ? { label: 'See which relations it has', to: '/network', why: 'In the network view, see what it connects to and which edge is harder.' }
      : { label: '看看它有哪些关系', to: '/network', why: '在网络视图里看它连着谁、哪条更硬。' });
  } else {
    basis.push(en
      ? 'You want the overview first: look at the structure, then decide where to drill down.'
      : '你先想看全局：先看结构，再决定从哪里下钻。');
    items.push(en
      ? { label: 'Open the knowledge network', to: '/network', why: 'Coloured by relation strength; hard prerequisites and registered relations are shown separately.', primary: true }
      : { label: '打开知识网络', to: '/network', why: '按关系强弱上色，硬前置与登记关联分开显示。', primary: true });
    items.push(en
      ? { label: 'See which cases exist', to: '/start#cases', why: 'Each case grows from one concrete puzzle into its canonical form.' }
      : { label: '看看有哪些案例', to: '/start#cases', why: '每个案例都从一个具体的困惑长到规范形式。' });
  }

  if (entry === 'method') {
    items.push(en
      ? { label: 'Go to the method library', to: '/method', why: 'You chose to enter by method: it ranks ten methodologies by importance.' }
      : { label: '先去方法库', to: '/method', why: '你选了按方法进入：那里按重要性排了十条方法论。' });
  } else if (entry === 'practice') {
    items.push(en
      ? { label: 'Go to self-checks and practice', to: '/profile', why: 'You chose to enter by practice: self-check tasks and the review queue both live in “My learning”.' }
      : { label: '去自检与练习', to: '/profile', why: '你选了按练习进入：自检任务与复习队列都在「我的学习」。' });
  } else if (entry === 'discipline' || entry === 'construct') {
    items.push(en
      ? {
        label: entry === 'discipline' ? 'Filter objects by discipline' : 'Filter objects by type',
        to: '/nodes',
        why: 'The filter appears at the top of the list page and can be changed at any time.',
      }
      : { label: entry === 'discipline' ? '按学科筛对象' : '按对象类型筛对象', to: '/nodes', why: '筛选条件会写在列表页顶部，随时能改。' });
  } else {
    items.push(en
      ? { label: 'Enter from a prototype problem', to: '/start#cases', why: 'Five cases, each matching one kind of confusion; pick the one closest to yours.' }
      : { label: '从原型问题进入', to: '/start#cases', why: '五个案例各自对应一类困惑，选最像你的那条。' });
  }

  if (pace === 'small') {
    items.push(en
      ? { label: 'Cold start: begin with background you must confirm yourself', to: '/start#angles', why: 'You chose one small step: the lowest background nodes have no prerequisites at all — a true minimal start.' }
      : { label: '冷启动：从必须自己确认的背景开始', to: '/start#angles', why: '你选了一小步：最底层那几个背景节点没有任何前置，是真正的最小起点。' });
  } else if (pace === 'block') {
    items.push(en
      ? { label: 'Full route (with milestones)', to: '/plan', why: 'You chose a longer stretch: the route page gives milestones together with the event horizon.' }
      : { label: '完整路线（含里程碑）', to: '/plan', why: '你选了一段一走走：路线页把里程碑与事件界一起给出。' });
  } else if (pace === 'checkpoint') {
    items.push(en
      ? { label: 'Do one self-check first', to: '/profile', why: 'You chose to check first: self-check tasks are registered per competence and never decide mastery for you.' }
      : { label: '先做一次自检', to: '/profile', why: '你选了先看会不会：自检任务按能力维度登记，不自动判定掌握。' });
  } else {
    items.push(en
      ? { label: 'Just browse around (changes no records)', to: '/nodes', why: 'You chose no fixed pace: browsing never marks a node as mastered.' }
      : { label: '先随便逛逛（不改任何记录）', to: '/nodes', why: '你选了不设节奏：浏览不会把节点标记为已掌握。' });
  }

  return { items, basis, isDefault };
}

/** 组件壳层文案：中文为源（逐字保留），英文成对。 */
const COPY = {
  zh: {
    heading: '先定方向，再看材料',
    lead: '四个问题，决定这一页按什么顺序把入口排给你。答完就能看到属于你的起点；随时能改，也随时能跳过——下面所有入口一直都在。',
    collapse: '先收起引导',
    collapseTitle: '只收起这一块，不会清掉你已经选的答案',
    reset: '全部用默认',
    edit: '改一改',
    expand: '重新显示引导',
    expandTitle: '把五问重新摊开；你已经选过的答案还在',
    questions: [
      { title: '你现在想解决什么？', why: '为什么问这个：目标不同，入口的顺序就该不同——补缺口和看全局不该拿到同一张清单。' },
      { title: '你更想从哪儿进？', why: '为什么问这个：同一个内容，从案例进、从方法进、从练习进，是三种不同的学法。' },
      { title: '你希望它怎么陪你？', why: '为什么问这个：节奏决定给你的入口是「十五分钟能走完的一步」还是「一整段路线」。' },
      { title: '你想先以什么方式学？', why: '为什么问这个：学习方向里「现在能开始」的节点常常有好几条，顺序按你偏好的方式排——先看定义、先看例子、还是先用起来。它压不过目标，也压不过「学它之后能多开始几个」。' },
      {
        title: '你想在哪些次级学科上投入？',
        why: '为什么问这个：数字是本体里属于这一支的单元数，选中的学科会把下面「六条已有方向」按与你的兴趣的重合度重排——你选「群论」，群这条方向就会排到前面。它只改顺序：六条方向一条都不会消失，站内入口也照旧。',
      },
    ],
    planTitles: { complete: '你的起点', returning: '默认起点（回访）', firstVisit: '默认起点（首访）', plain: '默认起点' },
    whySeparator: '：',
    note: (
      <>
        这些偏好只影响<strong>这一页给你排的顺序</strong>，存在这台设备的浏览器里：
        不写学习者档案（E），也不改本体（M）。想清空就点上面的「全部用默认」，或重新选一次。
        站内任何入口在任何时候都能直接进——引导只负责排序，不设门禁。
      </>
    ),
    skipLead: '不想答也可以：',
    skip: '直接给我默认起点',
    skipTitle: '收起引导、按默认起点走；不会清掉已经选过的答案（要清空请用「全部用默认」）',
  },
  en: {
    heading: 'Set a direction first, then look at the material',
    lead: 'Four questions decide the order in which this page arranges its entries for you. Answer them and you get a starting point of your own; you can change it or skip it at any time — every entry below stays where it is.',
    collapse: 'Collapse the guide for now',
    collapseTitle: 'Collapses only this block; the answers you already chose stay',
    reset: 'Use all defaults',
    edit: 'Change my answers',
    expand: 'Show the guide again',
    expandTitle: 'Reopens the five questions; the answers you already chose are still there',
    questions: [
      { title: 'What do you want to solve right now?', why: 'Why we ask: different goals call for different orderings — filling a gap and getting the overview should not produce the same list.' },
      { title: 'Where would you rather enter from?', why: 'Why we ask: entering the same content through cases, methods or practice are three different ways of learning.' },
      { title: 'How should it accompany you?', why: 'Why we ask: pace decides whether you get “a step you can finish in fifteen minutes” or “a whole stretch of route”.' },
      { title: 'How would you like to learn it first?', why: 'Why we ask: a direction often has several nodes you can start now; the order follows the way you prefer — definitions first, examples first, or put it to use first. This cannot override your goal, nor “how many new nodes it opens”.' },
      {
        title: 'Which secondary fields do you want to put work into?',
        why: 'Why we ask: each number is the count of units in the ontology that belong to that field. The fields you pick re-rank the six existing directions below by how much they overlap with your interest — pick group theory and the group direction moves up. It only changes the order: none of the six disappears, and every entry on the site stays where it is.',
      },
    ],
    planTitles: { complete: 'Your starting point', returning: 'Default start (returning)', firstVisit: 'Default start (first visit)', plain: 'Default start' },
    whySeparator: ': ',
    note: (
      <>
        These preferences only affect <strong>the order this page arranges entries in</strong> and live in this
        device’s browser: they are not written to the learner record (E) and do not change the ontology (M).
        To clear them, press “Use all defaults” above or choose again. Every entry on the site stays directly
        reachable at any time — the guide only orders things, it never gates them.
      </>
    ),
    skipLead: 'You can skip this: ',
    skip: 'just give me the default start',
    skipTitle: 'Collapses the guide and uses the default start; answers already chosen are kept (use “Use all defaults” to clear them)',
  },
} as const;

/**
 * 第五问的句式文案（2026-10-11 加）。
 *
 * 为什么单独放而不进 `COPY`：`useI18n().pick()` 只认**纯字符串**的成对值
 * （`{ zh: string, en: string }`），而这里三句都要带参数（计数与学科名）。
 * 强行塞进 `COPY` 会让 `COPY[locale]` 的类型变成「字符串或函数」，
 * 于是上面那些 `text.heading` 之类的取值全都要加断言——那是为了让一处好写而把十处弄坏。
 * 因此按语种收成一组**带参数的函数**，用法是 `INTEREST_TEXT[locale].chosen(n)`。
 * 与 `StartPage.tsx` 的 `TEXT.readyWhy` 是同一个做法。
 */
const INTEREST_TEXT = {
  zh: {
    /** 单个学科按钮的 title：计数来自本体，可核对。 */
    count: (label: string, count: number) => `${label}：本体里 ${count} 个单元`,
    /** 选完之后的一句话：写清它只改顺序。 */
    chosen: (count: number) => `已选 ${count} 支：下面「六条已有方向」的顺序按与它们的重合度重排。它只改顺序——选或不选，六条方向一条都不会消失。`,
    none: '不选也行：六条已有方向按「还有多少节点要学」从多到少排给你。',
    clear: '清空兴趣',
  },
  en: {
    count: (label: string, count: number) => `${label}: ${count} units in the ontology`,
    chosen: (count: number) => `${count} field(s) chosen: the six directions below are re-ordered by how much they overlap with them. This only changes the order — none of the six disappears either way.`,
    none: 'You can skip this: the six directions are ordered by how many nodes each one still needs, most first.',
    clear: 'Clear the fields',
  },
} as const;

interface StartChooserProps {
  preferences: StartPreferences;
  onChange: (next: StartPreferences) => void;
  onReset: () => void;
  /** 已经决定过偏好（用于回访者：直接展示结论，仍可改）。 */
  decided: boolean;
  /** 回访者（本机「来过」标记）：默认起点因此不同（TODO A4-25）。 */
  returning?: boolean;
  /** 引导是否已收起（TODO A4-24）：收起只收起，**不动偏好**。 */
  collapsed?: boolean;
  onCollapse?: () => void;
  onExpand?: () => void;
  /**
   * 次级学科选项（2026-10-11 加）。
   *
   * **由调用方按本体传入**，本组件不写死任何学科：选项必须来自
   * `startDirection.ts` 的 `disciplineTotals(graph)`（只列本体里真有节点的学科），
   * 否则会出现「选了一支永远筛不出东西的学科」——与 `facets.ts` 同一条纪律。
   * 不传（或为空）时这一问**整块不渲染**，其余四问照旧。
   */
  interestOptions?: InterestOption[];
  /** 选了次级学科之后的说明（由调用方按本体现场算出的方向顺序给）。 */
}

export function StartChooser({
  preferences, onChange, onReset, decided, returning = false, collapsed = false, onCollapse, onExpand,
  interestOptions = [],
}: StartChooserProps) {
  const { locale, hrefFor } = useI18n();
  const text = COPY[locale];
  const interestText = INTEREST_TEXT[locale];
  const options = startOptions(locale);
  /**
   * 展开状态三处共同决定：
   * - 本机记着「已收起」→ 收起；
   * - 四问都答完了 → 直接看结论（回访者不必重答）；
   * - **回访者**（本机来过标记）→ 也直接看结论，起点卡里写着默认起点，想答再点「改一改」（TODO A4-25）；
   * - 其余（首访）→ 展开。
   * 「改一改」与「重新显示引导」都只是展开，不会清掉任何答案。
   */
  const [editing, setEditing] = useState(!decided && !collapsed && !returning);
  /**
   * 「刚答完前四问、正停在第五问」的状态（2026-10-11 加）。
   *
   * 为什么单独一个状态：四问答完就该收成结论（`complete`），但第五问（次级学科兴趣）
   * 恰好是在**看到结论之后**才有意义的一问——它给的是「那六条方向先给我看哪条」。
   * 若把第五问也算进 `complete`，就等于把一条可选的偏好变成必经的问卷；
   * 若答完第四问直接收掉，第五问就永远不会出现。因此：答完第四问时
   * 收起前四问（`editing = false`）但把第五问留在结论**上方**，选或不选都不影响结论。
   */
  const [refining, setRefining] = useState(false);
  const goal = preferences.goal;
  const entry = preferences.entry;
  const pace = preferences.pace;
  const mood = preferences.mood;
  const interests = preferences.interests;
  const hasInterestOptions = interestOptions.length > 0;
  // 渐进披露：答完前一问才出现下一问；「改一改」时全部展开。
  const showEntry = editing && goal !== null;
  const showPace = showEntry && entry !== null;
  const showMood = showPace && pace !== null;
  /*
   * 第五问（次级学科兴趣）排在最后：它**不参与**「答完」的判据。
   *
   * 为什么不算进去：四问决定的是入口顺序，这一问只决定「六条已有方向给你排哪条在前」。
   * 把它算进 `complete` 会让「答完了」这句话变成六问，而它本可以是空答案（不选也行）
   * ——那会把一条可选的偏好变成必经的问卷。跳过它不影响任何后果。
   */
  const showInterest = (showMood || refining) && mood !== null && hasInterestOptions;
  const complete = goal !== null && entry !== null && pace !== null && mood !== null;
  const { items, basis, isDefault } = buildStartPlan(preferences, { returning, locale });

  const answer = (patch: Partial<StartPreferences>) => onChange({ ...preferences, ...patch });

  /** 收起：只是收起（外层记下本机标记），偏好一个都不动。 */
  const collapse = () => { setEditing(false); onCollapse?.(); };

  return (
    <section
      className={`card start-chooser${editing ? '' : ' is-settled'}`}
      id="prefs"
      aria-labelledby="start-chooser-title"
      data-collapsed={collapsed ? 'true' : 'false'}
      data-default-plan={isDefault ? (returning ? 'returning' : 'first-visit') : 'answered'}
    >
      <div className="start-chooser-head">
        <div>
          <h2 id="start-chooser-title">{text.heading}</h2>
          <p className="muted">{text.lead}</p>
        </div>
        <div className="start-chooser-actions">
          {editing ? (
            <>
              {/*
                「先收起引导」（TODO A4-24）：只收起，**不重置偏好**。
                第四十五、四十六轮的边界是：跳过之后只能靠「全部用默认」回来，而那个动作会清掉答案。
                现在两者分开：收起 = 暂时不看；「重新显示引导」随时回来，答案原样还在。
              */}
              <button type="button" className="link-button" onClick={collapse} title={text.collapseTitle}>
                {text.collapse}
              </button>
              <button type="button" className="link-button" onClick={() => { onReset(); setEditing(false); }}>{text.reset}</button>
            </>
          ) : (
            <>
              <button type="button" className="button" onClick={() => { setEditing(true); setRefining(false); onExpand?.(); }}>{text.edit}</button>
              {collapsed && (
                <button
                  type="button"
                  className="link-button"
                  onClick={() => { setEditing(true); setRefining(false); onExpand?.(); }}
                  title={text.expandTitle}
                >
                  {text.expand}
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {editing && (
        <ol className="start-questions">
          {/* ① 目标 */}
          <li className="start-question" data-question="goal" data-answered={goal ? 'true' : 'false'} data-current={goal === null ? 'true' : undefined}>
            <div className="start-question-head">
              <span className="start-question-index">{goal ? '✓' : '1'}</span>
              <strong>{text.questions[0].title}</strong>
              <small>{text.questions[0].why}</small>
            </div>
            <div className="start-options">
              {options.goal.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  className={`start-option${goal === option.id ? ' is-chosen' : ''}`}
                  data-option={option.id}
                  aria-pressed={goal === option.id}
                  onClick={() => { answer({ goal: option.id }); setEditing(true); }}
                >
                  <span className="start-option-label">{option.label}</span>
                  <span className="start-option-hint">{option.hint}</span>
                </button>
              ))}
            </div>
          </li>

          {/* ② 入口（答完①才出现） */}
          {showEntry && (
            <li className="start-question" data-question="entry" data-answered={entry ? 'true' : 'false'} data-current={entry === null ? 'true' : undefined}>
              <div className="start-question-head">
                <span className="start-question-index">{entry ? '✓' : '2'}</span>
                <strong>{text.questions[1].title}</strong>
                <small>{text.questions[1].why}</small>
              </div>
              <div className="start-options">
                {options.entry.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    className={`start-option${entry === option.id ? ' is-chosen' : ''}`}
                    data-option={option.id}
                    aria-pressed={entry === option.id}
                    onClick={() => answer({ entry: option.id })}
                  >
                    <span className="start-option-label">{option.label}</span>
                    <span className="start-option-hint">{option.hint}</span>
                  </button>
                ))}
              </div>
            </li>
          )}

          {/* ③ 节奏（答完②才出现） */}
          {showPace && (
            <li className="start-question" data-question="pace" data-answered={pace ? 'true' : 'false'} data-current={pace === null ? 'true' : undefined}>
              <div className="start-question-head">
                <span className="start-question-index">{pace ? '✓' : '3'}</span>
                <strong>{text.questions[2].title}</strong>
                <small>{text.questions[2].why}</small>
              </div>
              <div className="start-options">
                {options.pace.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    className={`start-option${pace === option.id ? ' is-chosen' : ''}`}
                    data-option={option.id}
                    aria-pressed={pace === option.id}
                    onClick={() => { answer({ pace: option.id }); setEditing(true); }}
                  >
                    <span className="start-option-label">{option.label}</span>
                    <span className="start-option-hint">{option.hint}</span>
                  </button>
                ))}
              </div>
            </li>
          )}

          {/* ④ 学法偏好（答完③才出现，2026-10 加）：答完这一问才收成结论。 */}
          {showMood && (
            <li className="start-question" data-question="mood" data-answered={mood ? 'true' : 'false'} data-current={mood === null ? 'true' : undefined}>
              <div className="start-question-head">
                <span className="start-question-index">{mood ? '✓' : '4'}</span>
                <strong>{text.questions[3].title}</strong>
                <small>{text.questions[3].why}</small>
              </div>
              <div className="start-options">
                {options.mood.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    className={`start-option${mood === option.id ? ' is-chosen' : ''}`}
                    data-option={option.id}
                    aria-pressed={mood === option.id}
                    onClick={() => { answer({ mood: option.id }); setEditing(false); setRefining(true); }}
                  >
                    <span className="start-option-label">{option.label}</span>
                    <span className="start-option-hint">{option.hint}</span>
                  </button>
                ))}
              </div>
            </li>
          )}
        </ol>
      )}

      {/*
        第五问：次级学科兴趣（2026-10-11 加）。
        它排在结论**上方**并且独立于 `editing`：答完第四问就收起前四问，
        但这一问留着——选它就改「六条已有方向给你排哪条」，不选也不影响任何结论。
      */}
      {showInterest && (
        <div className="start-interest" data-question="interest">
          <div className="start-question-head">
            <span className="start-question-index">{interests.length > 0 ? '✓' : '5'}</span>
            <strong>{text.questions[4].title}</strong>
            <small>{text.questions[4].why}</small>
          </div>
          <div className="start-options">
            {interestOptions.map((option) => {
              const chosen = interests.includes(option.id);
              return (
                <button
                  key={option.id}
                  type="button"
                  className={`start-option${chosen ? ' is-chosen' : ''}`}
                  data-interest={option.id}
                  aria-pressed={chosen}
                  /* 多选：点一次加入，再点一次移除。计数由本体现场派生，写在 title 里可核对。 */
                  onClick={() => answer({
                    interests: chosen
                      ? interests.filter((id) => id !== option.id)
                      : [...interests, option.id],
                  })}
                  title={interestText.count(option.label, option.count)}
                >
                  <span className="start-option-label">{option.label}</span>
                  <span className="start-option-hint">{option.count}</span>
                </button>
              );
            })}
          </div>
          <p className="start-interest-note">
            {interests.length > 0 ? interestText.chosen(interests.length) : interestText.none}
            {interests.length > 0 && (
              <>
                {' '}
                <button type="button" className="link-button" onClick={() => answer({ interests: [] })}>
                  {interestText.clear}
                </button>
              </>
            )}
          </p>
        </div>
      )}

      {/* 结论：选了就有后果，且写明依据与可撤销。 */}
      {(complete || !editing) && (
        <div className="start-plan" data-complete={complete ? 'true' : 'false'}>
          <h3>
            {complete ? text.planTitles.complete
              : isDefault ? (returning ? text.planTitles.returning : text.planTitles.firstVisit)
                : text.planTitles.plain}
          </h3>
          <ul className="start-plan-basis">
            {basis.map((line) => <li key={line}>{line}</li>)}
          </ul>
          <div className="start-plan-actions">
            {items.map((item) => (
              <Link
                key={`${item.label}-${item.to}`}
                className={`button${item.primary ? ' primary' : ''}`}
                /* `to` 是纯函数算出的站内绝对路径（`/plan`、`/start#cases`…）：
                   英文树下必须套 `hrefFor`，否则会跳回中文页。中文下它是恒等变换。 */
                to={hrefFor(item.to)}
              >
                {item.label}
              </Link>
            ))}
          </div>
          <ul className="start-plan-why">
            {items.map((item) => (
              <li key={`why-${item.label}`}><strong>{item.label}</strong>{text.whySeparator}{item.why}</li>
            ))}
          </ul>
          <p className="start-plan-note">{text.note}</p>
        </div>
      )}

      {editing && !complete && (
        <p className="start-plan-skip">
          {/*
            「直接给我默认起点」= 收起 + 用默认（不动已有答案，因为本来就没答完）；
            想彻底清掉答案的是上面那个「全部用默认」。两个动作的区别写在按钮的 title 里，
            免得又回到「跳过就等于清空」那个老问题（TODO A4-24）。
          */}
          {text.skipLead}
          <button
            type="button"
            className="link-button"
            onClick={collapse}
            title={text.skipTitle}
          >
            {text.skip}
          </button>
        </p>
      )}
    </section>
  );
}
