import { useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { api, formatError, useLocaleKey } from '../api';
import { useProfileContext } from '../state';
import { useAuth } from '../auth';
import { readGuestPlan, saveGuestPlan } from '../guest-plan';
import { StatusBadge } from '../components/StatusBadge';
import { ExamplePaths } from '../components/ExamplePaths';
import { EXAMPLE_SETS_BY_LOCALE, type ExampleSet } from '../example-paths';
import { deriveDirection, optionBasis } from '../direction';
import type { GraphRelation } from '../learning';
import { useMediaQuery } from '../useMediaQuery';
import { useI18n } from '../i18n';
// `useLabels` 住在 `i18n/useLabels.tsx`：`labels.ts` 是纯数据表，不准 import React。
import { useLabels } from '../i18n/useLabels';
import { paceHorizon, preferenceSummary, readPreferences } from '../start-preferences';
import { planRoute, serializeRouteSearch } from '../route-replay';
import { buildReadingSteps, saveReadingRoute, readingOrder } from '../route-reading';
import { useLearningData } from '../useLearningData';
import { LearningGuide } from '../components/LearningGuide';
import type { ExamplePath } from '../example-paths';
import type { NodeSummary, PlanPackageView, PlanResultView } from '../types';

/** 事件界的上限与 shared/contracts.mjs 的 normalizePlanRequest 保持一致（0–32）。 */
const MAX_HORIZON = 32;

interface GraphData {
  nodes: NodeSummary[];
  actions: Array<{ id: string; title: string; mode: string; inputs: Array<{ node: string; accepts: string[] }>; outputs: Array<{ node: string; provides: string[] }> }>;
  /**
   * 关系边：规划表单不用它，但**无目标模式**（可学前沿）要——
   * `deriveDirection` 的硬前置要读关系。接口本来就下发这一份（与网络页同一份图）。
   */
  relations: GraphRelation[];
}

/** 成对文案：中文是源语言（**逐字不变**），英文是译文。取用走 `useI18n().pick`。 */
interface Pair<T = string> { zh: T; en: T }

/**
 * 页面文案（手册 §1：页面自己的长文案放页面文件里，成对写）。
 *
 * 需要插值的写成成对函数（两边同签名）；`{zh, en}` 缺一边就编译不过，
 * 因此不会出现「英文页面里漏了一句话」。中文值与改造前逐字相同。
 */
const TEXT = {
  title: { zh: '学习路线', en: 'Learning route' },
  intro: {
    zh: '先选 AND/OR 方案与逐项来源，再合并策略次序并检查无环。结构可行不表示真实学习有效；没有成本模型时保持未知。',
    en: 'Choose the AND/OR plan and the source of each item first, then merge strategy order and check for cycles. Structurally feasible does not mean it works in real learning; without a cost model it stays unknown.',
  },
  stepGoal: { zh: '确定目标（可选）', en: 'Set the goal (optional)' },
  stepBackground: { zh: '核对背景', en: 'Check the background' },
  stepRoutes: { zh: '比较路线', en: 'Compare routes' },
  headingGoal: { zh: '① 确定目标', en: '① Set the goal' },
  headingBackground: { zh: '② 核对背景（外部模型 E 的显式声明）', en: '② Check the background (explicit declarations of the external model E)' },
  headingRoutes: { zh: '③ 比较路线', en: '③ Compare routes' },
  chosenGoalLead: { zh: '已选目标：', en: 'Selected goal: ' },
  goalNodeLabel: { zh: '目标节点', en: 'Goal node' },
  /* —— 目标可选（2026-10-13）：留空时不比较路线，改列「现在能学什么」 —— */
  goalOptionalOption: { zh: '（不选目标：只看现在能学什么）', en: '(no goal: just show what can start now)' },
  goalOptionalHint: {
    zh: '目标可以留空。不选目标时不会比较路线，而是列出从你声明的背景出发、本体里现在就能开始的节点'
      + '（可学前沿，与「我的学习」里那张下一步表同源）；挑一个当目标，就回到正常的路线比较。',
    en: 'The goal is optional. With no goal the page does not compare routes; it lists the nodes that can start right now '
      + 'given the background you declared (the learning frontier, the same derivation as the next-step table under “My learning”). '
      + 'Pick one as the goal and you are back to route comparison.',
  },
  frontierTitle: { zh: '现在能学什么（可学前沿）', en: 'What can start now (learning frontier)' },
  frontierLead: {
    zh: '没有选目标，所以这里不比较路线，只回答一个问题：按上面声明的背景，本体里哪些节点现在就能开始。',
    en: 'No goal was chosen, so no routes are compared here; this answers one question: given the background declared above, which nodes can start right now.',
  },
  frontierStartable: { zh: '现在就能开始', en: 'Can start now' },
  frontierReachable: { zh: '背景够得着', en: 'Within reach' },
  frontierReachableValue: {
    zh: (reachable: number, units: number) => `${reachable} / ${units} 个单元级节点`,
    en: (reachable: number, units: number) => `${reachable} / ${units} unit-level nodes`,
  },
  frontierBackground: { zh: '这份背景声明', en: 'Background declared here' },
  frontierBackgroundValue: { zh: (count: number) => `${count} 项`, en: (count: number) => `${count} item(s)` },
  frontierThreadNote: {
    zh: (count: number) => `另有 ${count} 个话题级条目被排除在可学集合外：它们是线索的名字，不是可学的单元。`,
    en: (count: number) => `A further ${count} thread-level entries are excluded from the startable set: they name a line of study, they are not learnable units.`,
  },
  frontierPickLead: { zh: '挑一个当目标，就直接进入路线比较。', en: 'Pick one as the goal to go straight to route comparison.' },
  frontierRecommended: { zh: '推荐先走这条', en: 'Recommended first' },
  frontierUnlocks: { zh: (count: number) => `确认后解锁 ${count} 个`, en: (count: number) => `unlocks ${count} after confirmation` },
  frontierUseAsGoal: { zh: '用它当目标', en: 'Use as the goal' },
  frontierDeclare: { zh: '标记为已有', en: 'Mark as already had' },
  frontierDeclareHint: {
    zh: '没有行动能产出它，所以它当不了目标：把它标记为已有，立刻计入上面的背景声明，可学前沿会跟着重算。',
    en: 'No action produces it, so it cannot be a goal: mark it as already had and it counts towards the background declared above at once, and the frontier is recomputed.',
  },
  frontierOpenNode: { zh: '看节点', en: 'Open node' },
  frontierMore: { zh: (count: number) => `还有 ${count} 个可开始的节点未列出。`, en: (count: number) => `${count} more startable nodes are not listed.` },
  frontierUseAsGoalHint: {
    zh: '点「用它当目标」会把目标写进上面的下拉框并立刻规划一次。',
    en: '“Use as the goal” writes it into the goal dropdown above and plans once right away.',
  },
  frontierEmpty: {
    zh: '按这份背景，现在没有可开始的节点：所有单元都还缺前置。可以先到「从感兴趣的次级学科探索」声明方向，或回到背景里确认一些更基础的条目。',
    en: 'With this background nothing can start yet: every unit is still missing a prerequisite. Declare a direction under “explore fields that interest me”, or confirm some more basic entries in the background.',
  },
  /** 下拉里的线索标记：选项里带尾随空格，句子里的不带。 */
  topicMarkOption: { zh: '【线索】', en: '[thread] ' },
  idSuffix: { zh: (id: string) => `（${id}）`, en: (id: string) => ` (${id})` },
  resourceSuffix: { zh: (label: string) => `（${label}）`, en: (label: string) => ` (${label})` },
  goalsCount: {
    zh: (list: string, count: number) => `${list}（${count} 个）`,
    en: (list: string, count: number) => `${list} (${count} goal${count === 1 ? '' : 's'})`,
  },
  keepDropdownGoal: { zh: '只保留下拉框里的目标', en: 'Keep only the dropdown goal' },
  startPlanning: { zh: '开始规划', en: 'Start planning' },
  /*
   * 主按钮的两态（2026-10-14 用户要求「点完要有明确反馈」）：
   * 任务在跑时显示「规划中…」，跑完（含跑失败）显示「重新规划」——点了之后按钮一定换字，
   * 不必先scroll到下面才知道这一下点上了。
   */
  planning: { zh: '规划中…', en: 'Planning…' },
  replan: { zh: '重新规划', en: 'Plan again' },
  cancelJob: { zh: '取消任务', en: 'Cancel job' },
  planWithReview: { zh: '规划并加入复习事件', en: 'Plan with a review event' },
  planWithReviewDisabled: {
    zh: '复习事件只针对单个节点，多目标规划下不可用',
    en: 'A review event targets a single node, so it is unavailable for multi-goal planning',
  },
  advancedSummary: { zh: '高级参数（默认即可，通常不需要改）', en: 'Advanced parameters (defaults are fine; you rarely need to change them)' },
  horizonLabel: { zh: '事件界 h（最多多少个学习事件）', en: 'Event horizon h (maximum number of study events)' },
  maxCandidatesLabel: { zh: '候选上限（搜索空间上限）', en: 'Candidate cap (search-space limit)' },
  budgetLabel: { zh: '预算上限（可选）', en: 'Budget cap (optional)' },
  budgetPlaceholder: { zh: '留空表示不比较成本', en: 'Leave empty to compare no costs' },
  strategyLabel: { zh: '策略 JSON（可选成本与次序实例）', en: 'Strategy JSON (optional cost and order instance)' },
  strategyPlaceholder: {
    zh: '例如 {"costs":{"a-limit:d":2},"enumerateAllDepths":false}',
    en: 'e.g. {"costs":{"a-limit:d":2},"enumerateAllDepths":false}',
  },
  noCostNote: {
    zh: () => `没有声明成本模型时，规划器不会静默假设一个成本；结构可行也不表示真实学习有效。事件界的上限 ${MAX_HORIZON} 与服务端契约一致。`,
    en: () => `Without a declared cost model the planner does not silently assume one; structural feasibility does not mean real learning works. The event-horizon cap of ${MAX_HORIZON} matches the server contract.`,
  },
  backgroundHintWithProfile: {
    zh: '已自动列出你确认过的背景。未选择的内容保持未指定；未指定不等于已经掌握，也不等于没有。选择“未知”会作为显式入口条件进入路线。',
    en: 'The background you confirmed is listed automatically. Anything unselected stays unspecified; unspecified is neither “mastered” nor “absent”. Choosing “unknown” enters the route as an explicit entry condition.',
  },
  backgroundHintWithoutProfile: {
    zh: '当前没有选择档案，因此这里只使用手动声明。未指定不等于已经掌握，也不等于没有。',
    en: 'No profile is selected, so only manual declarations are used here. Unspecified is neither “mastered” nor “absent”.',
  },
  profileKnownLead: { zh: '来自当前档案的确认：', en: 'Confirmed by the current profile: ' },
  clearExample: { zh: '清除范例入口', en: 'Clear the example entries' },
  viewExampleEntries: {
    zh: (count: number) => `查看这 ${count} 项起点`,
    en: (count: number) => `Show these ${count} starting points`,
  },
  topicThreadOmitted: { zh: '（话题级线索：不能作为背景声明）', en: '(topic-level thread: cannot be declared as background)' },
  previousLegResult: { zh: '（前几程的成果）', en: '(result of an earlier leg)' },
  entryConfirmed: { zh: '已确认可用', en: 'Confirmed usable' },
  entryAssumption: { zh: '声明假设（条件性）', en: 'Declared assumption (conditional)' },
  entryUnknown: { zh: '未知入口', en: 'Unknown entry' },
  omittedThreads: {
    zh: (count: number, list: string) => `另有 ${count} 条话题级线索没有列进网格（${list}）：它们是学习线索的名字，不能被声明成「已经会的背景」。它们仍然可以当目标。`,
    en: (count: number, list: string) => `${count} topic-level threads are not listed in the grid (${list}): they are the names of study threads and cannot be declared as “background you already know”. They can still serve as goals.`,
  },
  jobRunning: {
    zh: (jobId: string, status: string) => `规划任务 ${jobId} 运行中（${status}）… 耗时搜索在工作线程执行。`,
    en: (jobId: string, status: string) => `Planning job ${jobId} is running (${status})… the expensive search runs on a worker thread.`,
  },
  candidatesShown: {
    zh: (total: number, shown: number) => `${total} 条候选 · 展示 ${shown} 条`,
    en: (total: number, shown: number) => `${total} candidate(s) · showing ${shown}`,
  },
  showAllRoutes: { zh: '显示全部候选（含未进入前三条的）', en: 'Show all candidates (including those outside the top three)' },
  factsGoal: { zh: '目标', en: 'Goals' },
  factsCompleteness: { zh: '搜索完整性', en: 'Search completeness' },
  factsMinEvents: { zh: '最少事件数', en: 'Fewest events' },
  searchComplete: { zh: '声明域内完整', en: 'Complete within the declared domain' },
  searchIncomplete: {
    zh: (reasons: string) => `未完成：${reasons}`,
    en: (reasons: string) => `Incomplete: ${reasons}`,
  },
  searchDetails: { zh: '搜索细节（诊断用）', en: 'Search details (for diagnosis)' },
  boundsVisited: { zh: '访问状态数', en: 'States visited' },
  boundsHorizon: { zh: '事件界 h', en: 'Event horizon h' },
  boundsMaxCandidates: { zh: '候选上限', en: 'Candidate cap' },
  boundsDomain: { zh: '搜索域', en: 'Search domain' },
  entryConditions: { zh: '入口条件（条件性）', en: 'Entry conditions (conditional)' },
  unknownEntries: { zh: '未决入口', en: 'Undecided entries' },
  familyRequired: { zh: '路线族共同前提', en: 'Shared premises of the route family' },
  familyComplete: { zh: '声明域内路线已完整枚举。', en: 'Routes are fully enumerated within the declared domain.' },
  familyIncomplete: { zh: '未证明路线族完整枚举；这是可修订的搜索结论。', en: 'The route family is not proven to be fully enumerated; this is a revisable search conclusion.' },
  noRoutes: { zh: '当前条件下没有可行路线', en: 'No feasible route under the current conditions' },
  noRoutesLead: { zh: '三种原因要分开看，处理方式不同：', en: 'Three causes must be told apart — they are handled differently:' },
  routeEvents: { zh: (count: number) => `${count} 个事件`, en: (count: number) => `${count} event(s)` },
  routeCost: { zh: (value: string) => `成本：${value}`, en: (value: string) => `Cost: ${value}` },
  costUnknown: { zh: '未知', en: 'unknown' },
  routeEvidence: {
    zh: (proofs: number, certificates: number) => `证据：${proofs} 证明 / ${certificates} 证书`,
    en: (proofs: number, certificates: number) => `Evidence: ${proofs} proof(s) / ${certificates} certificate(s)`,
  },
  readAlongRoute: { zh: '沿此路线阅读', en: 'Read along this route' },
  viewReplay: { zh: '看结构回放', en: 'View the structure replay' },
  replaySummary: {
    zh: (entries: number, steps: number) => `从 ${entries} 个起点出发，共 ${steps} 步可调；每步都能暂停、单步与回退。`,
    en: (entries: number, steps: number) => `Starts from ${entries} entry point(s), ${steps} adjustable step(s); every step can be paused, stepped and rewound.`,
  },
  reviewEvent: { zh: '复习事件', en: 'Review event' },
  focusOn: { zh: '关注：', en: 'Focus: ' },
  /*
   * 路线来源的三个标签：字段在协议里是**可选**的（`types.ts` 的 `sources`），
   * 参数类型跟着放宽——照旧原样插入，缺字段时渲染成 `undefined` 与改造前一致。
   */
  sourceFromEvent: { zh: (id: string | undefined) => ` ← 事件 ${id}`, en: (id: string | undefined) => ` ← event ${id}` },
  sourceFromBackground: {
    zh: (id: string | undefined, confirmed: boolean | undefined) => ` ← 背景 ${id}（${confirmed ? '已确认' : '未确认'}）`,
    en: (id: string | undefined, confirmed: boolean | undefined) => ` ← background ${id} (${confirmed ? 'confirmed' : 'not confirmed'})`,
  },
  sourceFromUnknown: { zh: (question: string | undefined) => ` ← 未决入口：${question}`, en: (question: string | undefined) => ` ← undecided entry: ${question}` },
  rawPackage: { zh: '结果包附加数据', en: 'Additional result-package data' },
  reviewLimitation: {
    zh: '复习结果只包含被追加复习事件的第一条路线；pareto 与入口条件未重算，因此这里不展示它们。',
    en: 'The review result contains only the first route with the review event appended; pareto and entry conditions are not recomputed and are therefore not shown here.',
  },
  onlyTopThree: { zh: '只比较前三条候选。', en: 'Only the top three candidates are compared.' },
  showRest: { zh: (count: number) => `展开其余 ${count} 条`, en: (count: number) => `Show the other ${count}` },
  strategyParseError: {
    zh: '策略 JSON 无法解析；未声明成本与次序时保持未知。',
    en: 'The strategy JSON cannot be parsed; without declared costs and order it stays unknown.',
  },
  /* —— 「整条路径」进度轨（2026-10-13 加）：一键导入之后挂在表单下面 —— */
  walkTitle: { zh: (book: string) => `整条路径：${book}`, en: (book: string) => `Whole path: ${book}` },
  walkLead: {
    zh: (count: number) => `按 ${count} 程依次走：每一程的起点 = 基础背景 + 前面各程的里程碑。载入写的是示范假设，不写进档案；`
      + '进度轨只记「本次会话载入过哪几程」，不是学习进度。',
    en: (count: number) => `Walk the ${count} routes in order: each route starts from the shared background plus the milestones of the previous ones. `
      + 'Loading writes demonstration assumptions only, never your profile; the rail records which routes you loaded in this session — it is not learning progress.',
  },
  walkStageMeta: {
    zh: (goals: number, entries: number, events: number) => `${goals} 个里程碑 · 起点 ${entries} 项 · 实测 ${events} 个事件`,
    en: (goals: number, entries: number, events: number) => `${goals} milestones · ${entries} entries · ${events} events measured`,
  },
  walkCurrent: { zh: '当前', en: 'Current' },
  walkVisited: { zh: '本次已载入', en: 'Loaded this session' },
  walkTodo: { zh: '未开始', en: 'Not started' },
  walkNext: {
    zh: (ordinal: string, title: string) => `下一程：${ordinal}　${title}`,
    en: (ordinal: string, title: string) => `Next route: ${ordinal} — ${title}`,
  },
  walkDone: {
    zh: (count: number) => `全部 ${count} 程都在本次会话里载入过了。`,
    en: (count: number) => `All ${count} routes have been loaded in this session.`,
  },
  walkExit: { zh: '结束整条路径', en: 'Leave the whole-path walk' },
  /* —— 与学习方向的联动（2026-10 加）：只带一句上下文与一个「填进来」的按钮 —— */
  directionLead: { zh: '当前学习方向：', en: 'Current learning direction: ' },
  directionNone: { zh: '还没有声明学习方向。', en: 'No learning direction is declared yet.' },
  directionUse: { zh: '把方向的目标填进目标组', en: 'Fill the direction goal into the goal list' },
  directionFrom: { zh: '主目标、兴趣和有效的顺序调整与「开始学习」「我的学习」共用；下方可进一步比较具体行动方案。', en: 'The primary goal, interests and valid order edits are shared with Start learning and My learning. Compare detailed action plans below.' },
  directionOpen: { zh: '去声明方向', en: 'Declare a direction' },
};

/**
 * 带标记（`<strong>` / `<Link>` / 按钮）的段落：成对写成返回 JSX 的函数。
 *
 * 中文分支是**逐字照抄**改造前的排版（含换行与缩进），因此 JSX 的空白折叠结果不变。
 */
const RICH = {
  threadGoalNote: {
    /*
     * `topicsHref` 由组件传进来：这个对象在**模块作用域**，拿不到 `useI18n()` 的 `hrefFor`，
     * 而站内链接必须带上当前语种前缀（英文站上写死 `/nodes` 会点回中文页）。
     */
    zh: (count: number, topicsHref: string) => (
      <>
        目标下拉里有 {count} 条标着【线索】的话题级条目：它们是学习线索的名字（一节或一章的范围），
        可以当路线的里程碑，但<strong>不能</strong>被声明为已经会的背景——背景网格只列可独立认知的单元。
        这些条目在<Link to={topicsHref}>数学对象的「话题」一档</Link>里能看全。
      </>
    ),
    en: (count: number, topicsHref: string) => (
      <>
        The goal dropdown lists {count} topic-level entries marked [thread]: they are the names of study threads
        (the scope of a section or chapter) and can serve as milestones of a route, but they <strong>cannot</strong> be
        declared as background you already know — the background grid lists only independently knowable units.
        All of them are visible under <Link to={topicsHref}>the “topics” granularity of Mathematical objects</Link>.
      </>
    ),
  },
  multiGoal: {
    zh: (goalTitle: string, others: string, count: number, onClear: () => void) => (
      <>
        当前是范例的多目标规划：除下拉框里的「{goalTitle}」之外，还要同时拿下
        {others}，共 {count} 个目标。
        <button className="link-button" onClick={onClear}>{TEXT.keepDropdownGoal.zh}</button>
      </>
    ),
    en: (goalTitle: string, others: string, count: number, onClear: () => void) => (
      <>
        This is a multi-goal example plan: besides “{goalTitle}” in the dropdown it must also reach
        {others} — {count} goals in total.
        <button className="link-button" onClick={onClear}>{TEXT.keepDropdownGoal.en}</button>
      </>
    ),
  },
  paceNote: {
    zh: (why: ReactNode, summary: ReactNode, href: string) => (
      <>
        {why}
        依据是你在<a href={href}>开始学习页</a>选过的节奏
        {summary ? <>（{summary}）</> : ''}。
        它<strong>只改这个默认值</strong>：规划算法、本体与可达性判定都不变；改上面的输入即覆盖它。
      </>
    ),
    en: (why: ReactNode, summary: ReactNode, href: string) => (
      <>
        {why}
        This default follows the pace you chose on the <a href={href}>Start learning page</a>
        {summary ? <> ({summary})</> : ''}. It <strong>only changes this default</strong>: the planning algorithm,
        the ontology and the reachability check are unchanged; editing the input above overrides it.
      </>
    ),
  },
  loadedExample: {
    zh: (ordinal: number | string, title: string, entries: number, outsideGrid: number, onClear: () => void) => (
      <>
        已载入范例「{ordinal} · {title}」，它的 {entries} 项起点按<strong>示范假设</strong>（条件性）进入本次规划——
        它们不代表你已掌握，也不会写进你的档案；规划结果只是「如果这些已经会了，这条路会怎么走」。
        其中 {outsideGrid} 项由前几程的行动产出，因此<strong>不</strong>出现在下面的网格里（网格只列没有任何行动能产出的背景节点）——
        它们在这里列全，避免出现「背景是空的却规划出了路线」这种误导。
        <button className="link-button" onClick={onClear}>{TEXT.clearExample.zh}</button>
      </>
    ),
    en: (ordinal: number | string, title: string, entries: number, outsideGrid: number, onClear: () => void) => (
      <>
        Example “{ordinal} · {title}” is loaded; its {entries} starting points enter this plan as <strong>demonstration assumptions</strong> (conditional) —
        they do not mean you have mastered them and are not written to your profile; the result only says “if these were already known, this is how the route would go”.
        {outsideGrid} of them are produced by earlier legs and therefore do <strong>not</strong> appear in the grid below (the grid lists only background nodes that no action can produce) —
        they are listed here so that “the background is empty yet a route was planned” cannot mislead you.
        <button className="link-button" onClick={onClear}>{TEXT.clearExample.en}</button>
      </>
    ),
  },
  noRoutesReasons: {
    zh: (horizon: number, maxCandidates: number, status: string) => (
      <ul>
        <li>
          <strong>条件不足</strong>：下面「入口条件／未决入口」列出的节点还没确认，或声明成了未知。
          先补背景，或把它们标为条件性假设再看。
        </li>
        <li>
          <strong>搜索范围不足</strong>：当前事件界 h = {horizon}、候选上限 {maxCandidates}。
          目标较远时可以调大事件界后重试。
        </li>
        <li>
          <strong>执行失败</strong>：任务状态 {status}；若为错误，页面顶部会给出服务端返回的原因。
        </li>
      </ul>
    ),
    en: (horizon: number, maxCandidates: number, status: string) => (
      <ul>
        <li>
          <strong>Conditions missing</strong>: nodes listed under “entry conditions / undecided entries” below are not
          confirmed yet, or were declared unknown. Add background first, or mark them as conditional assumptions and look again.
        </li>
        <li>
          <strong>Search range too small</strong>: the current event horizon is h = {horizon} and the candidate cap is {maxCandidates}.
          If the goal is far away, raise the horizon and retry.
        </li>
        <li>
          <strong>Execution failed</strong>: job status {status}; if it is an error, the reason returned by the server appears at the top of the page.
        </li>
      </ul>
    ),
  },
  /*
   * 范例路径的两条旧文案（`exampleSummary` / `examplePickerNote`）随第八十五轮的改版删掉了：
   * 这一栏现在是「压缩态 → 悬浮简介 → 点击展开」，标题与那句「载入不写进档案」的说明
   * 都由 `ExamplePaths` 自己成对给出，避免同一条说明在两个组件里各写一份。
   */
};

/* ---------------------------------------------------------------------------
 * 「整条路径」的会话状态（2026-10-13 加）
 *
 * 一键导入范例的**整条路径**之后，表单下面挂一条各程进度轨。它记的是
 * 「**本次会话**载入过哪几程」，不是学习进度——载入范例写的是示范假设
 * （`kind: 'assumption'`），既不改公共本体，也不产生任何 E 层事件。
 *
 * 因此存在 `sessionStorage` 而不是 `localStorage`：关掉标签页就该消失，
 * 留在本地会让人误以为那是学习记录。读失败（隐私模式）只是「刷新后不记得走到哪」。
 * ------------------------------------------------------------------------- */
const EXAMPLE_WALK_KEY = 'mcs-example-walk-v1';

/** 可学前沿里最多列多少条（其余如实报数，不静默丢弃）。 */
const FRONTIER_LIMIT = 12;

/**
 * 下拉框里作为**常规目标**的构造类型。
 *
 * 符号（`Symbol`）这类节点不在这里：规划器只能靠**行动**产出节点，而符号类节点没有任何
 * 产出行动，选它当目标必然「界内不可行」。但下拉框仍要为「当前目标」补一条——
 * `?goal=` 深链或可学前沿都可能把这类节点带进来，那时**显示空值会让人以为没选上**
 * （2026-10-13 实测踩到过）。
 */
const GOAL_CONSTRUCTS = ['Claim', 'Concept', 'Construction', 'Method', 'Problem', 'Example'];

interface ExampleWalkState {
  setId: string;
  /** 本次会话载入过的程（`ExamplePath.id`）。 */
  visited: string[];
}

function readExampleWalk(): ExampleWalkState | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.sessionStorage.getItem(EXAMPLE_WALK_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    const value = parsed as { setId?: unknown; visited?: unknown };
    if (typeof value.setId !== 'string' || !Array.isArray(value.visited)) return null;
    return { setId: value.setId, visited: value.visited.filter((id): id is string => typeof id === 'string') };
  } catch { return null; }
}

function writeExampleWalk(state: ExampleWalkState | null): void {
  if (typeof window === 'undefined') return;
  try {
    if (state) window.sessionStorage.setItem(EXAMPLE_WALK_KEY, JSON.stringify(state));
    else window.sessionStorage.removeItem(EXAMPLE_WALK_KEY);
  } catch { /* 隐私模式：只影响「刷新后还记不记得走到哪一程」 */ }
}

export function PlanPage() {
  const { locale, pick, isPending, hrefFor, t } = useI18n();
  const labels = useLabels();
  const localeKey = useLocaleKey();
  /**
   * 取带标记的段落：**按 `locale` 取，不按 `localeKey`**。
   *
   * `localeKey` 是 `api.ts` 的模块级请求语种，由 Provider 的 effect 写入——
   * 拿它选界面文案会比 URL 慢一拍（切语言后第一次渲染仍是旧语种）。
   * 它只用于 `api()` 依赖；界面文字一律看 `locale`。
   *
   * 断言只收窄「索引访问丢掉了每个键的具体签名」这件事：每个键的 `zh` / `en`
   * 签名本来就相同，所以取哪一边都不改变可调用性。
   */
  const rich = <K extends keyof typeof RICH>(key: K) => (
    (RICH[key] as { zh: (typeof RICH)[K]['zh']; en: (typeof RICH)[K]['en'] })[locale === 'en' ? 'en' : 'zh']
  );
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { profileId: currentProfileId } = useProfileContext();
  const auth = useAuth();
  const guest = auth.ready && auth.mode === 'supabase' && !auth.user;
  const profileId = auth.ready && (auth.mode === 'local' || auth.user) ? currentProfileId : null;
  const draftLoaded = useRef(false);
  const requestGeneration = useRef(0);
  const identityRef = useRef(auth.identityKey);
  identityRef.current = auth.identityKey;
  const learningData = useLearningData();
  const [graph, setGraph] = useState<GraphData | null>(null);
  /**
   * 目标是**一组**而不是一个：范例路径一程要拿下好几个里程碑，只给一个目标会得到
   * 一条只服务那一个节点的短路线，覆盖不到整程。手工用下拉框选择时仍然只有一个目标。
   */
  const [goals, setGoals] = useState<string[]>(() => {
    const initial = params.get('goal');
    return initial ? [initial] : ['limit:bridge'];
  });
  const goal = goals[0];
  const initialGoal = useRef(goal);
  /**
   * 无目标模式（2026-10-13 用户要求「确定目标设置为可选项」）。
   *
   * 规划器本身**必须有目标**（`normalizePlanRequest` 里那条断言不是摆设：没有目标就没有
   * 「要走到哪」）。所以「可选」不是把空目标塞给规划器，而是换一条**已有的**派生：
   * 目标留空时列出**可学前沿**——按声明的背景，本体里现在就能开始的节点
   * （与「我的学习」/开始页同一份 `deriveDirection`），再由用户一键把某个候选变成目标。
   */
  const [frontierOn, setFrontierOn] = useState(false);
  /**
   * 事件界默认值：先看开始页的节奏偏好（TODO A4-23）。
   *
   * 第四十六轮的边界：「三问的答案只影响开始页的入口排序，`/plan` 不套用。」
   * 这一条选择把**节奏**这一问接上：它本来就是在说「一次走多远」，
   * 而事件界 h 正是这个旋钮。映射表与理由写在 `web/src/start-preferences.ts` 的 `paceHorizon`。
   *
   * 三条纪律（写在页面上，也写在模块里）：只改**默认值**、算法与本体一律不变、
   * 用户一改就不再覆盖（`paceApplied` 只在首次挂载时按偏好设一次）。
   */
  const savedPreferences = readPreferences();
  // 第二参数是语种：`start-preferences.ts`（task-8）已给出成对文案，中文默认值逐字不变。
  const paceDefault = paceHorizon(savedPreferences.pace, locale);
  const [horizon, setHorizon] = useState<number>(() => paceDefault?.horizon ?? 8);
  /** 偏好是否真的改过默认值（页面据此显示说明；用户手改后置 false）。 */
  const [paceApplied, setPaceApplied] = useState<boolean>(() => paceDefault !== null);
  const [maxCandidates, setMaxCandidates] = useState(100000);
  const [entries, setEntries] = useState<Record<string, { kind: 'confirmed' | 'assumption' | 'unknown' }>>({});
  const [strategyText, setStrategyText] = useState('{}');
  const [budgetMax, setBudgetMax] = useState('');
  const [result, setResult] = useState<PlanResultView | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [jobStatus, setJobStatus] = useState<string | null>(null);
  /**
   * 这次进页面之后**是否已经点过规划**（含不选目标的可学前沿那条路）。
   *
   * 它只决定主按钮叫什么：没点过是「开始规划」，点过就是「重新规划」。
   * 判断依据是「点过」而不是「有结果」——请求失败时也要如实告诉用户这一下点上了、可以再点。
   */
  const [hasPlanned, setHasPlanned] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAllRoutes, setShowAllRoutes] = useState(false);
  const [profileKnown, setProfileKnown] = useState<Set<string>>(new Set());
  /** 主目标来自档案方案；显式 URL 目标和手动选择保留优先权。 */
  const [directionNode, setDirectionNode] = useState<string | null>(null);
  const previousPrimary = useRef<string | null>(null);
  const paceProfile = useRef<string | null>(null);
  /** 上次规划是否走了 withReview 路径：决定要不要如实说明该路径的字段限制。 */
  const [lastWasReview, setLastWasReview] = useState(false);
  /** 当前载入的范例（若有）：用来显示入口清单与「清除范例入口」。 */
  const [loadedExample, setLoadedExample] = useState<ExamplePath | null>(null);
  /**
   * 「整条路径」的走法（2026-10-13 加）。
   *
   * 一键导入之后，表单下面挂一条各程进度轨：当前程 = 表单里载入的那一程，
   * `visited` 记**本次会话**里载入过的程。它记的是「这次走过哪些程」，
   * **不是学习进度**——载入写的是示范假设，不产生任何 E 层事件。
   */
  const [walk, setWalk] = useState<{ setId: string; visited: string[] } | null>(() => readExampleWalk());
  const exampleSets = pick(EXAMPLE_SETS_BY_LOCALE);
  /** 正在走的那一本（会话里记着 setId；本语种的样本数据可能换了，因此每次由 id 查回来）。 */
  const walkSet = walk ? exampleSets.find((set) => set.id === walk.setId) ?? null : null;
  /** 进度轨上的「当前」= 表单里载入的那一程；载入了别的书的某一程时是 -1。 */
  const walkStageIndex = walkSet ? walkSet.paths.findIndex((path) => path.id === loadedExample?.id) : -1;
  /** 「下一程」的落点：正常是当前程的下一程；当前不在这条路上时，落在第一个没走过的程。 */
  const walkNextIndex = walkSet
    ? (walkStageIndex >= 0
      ? walkStageIndex + 1
      : walkSet.paths.findIndex((path) => !(walk?.visited ?? []).includes(path.id)))
    : -1;
  /*
   * 可学前沿（无目标模式的结果）。
   *
   * θ 取**本次表单里的背景声明**的键集，与交给服务端的 `background` 逐项同源——
   * 「不选目标」时看到的可学集合，必须与「选了目标」时规划器认为可用的前置一致，
   * 否则同一页面上会出现两套「什么算已会」。
   *
   * `steps: 0`：只要选项表与位置，不要那串预览路径（这里本来就不比较路线）。
   */
  const frontierReport = useMemo(() => {
    if (!frontierOn || !graph) return null;
    const known = Object.keys(entries).map((node) => ({ node }));
    return deriveDirection({ nodes: graph.nodes, actions: graph.actions, relations: graph.relations, theta: { known }, steps: 0 });
  }, [frontierOn, graph, entries]);
  /** 目标一出现就离开无目标模式：两种结果是互斥的，不能让它们同时挂在页面上。 */
  useEffect(() => { if (goals.length > 0) setFrontierOn(false); }, [goals]);
  useEffect(() => {
    requestGeneration.current++;
    setJobId(null); setJobStatus(null); setResult(null); setError(null);
    setEntries({}); setProfileKnown(new Set());
    autoFilledRef.current = new Set();
    draftLoaded.current = false;
  }, [auth.identityKey]);
  useEffect(() => {
    if (!guest || draftLoaded.current) return;
    const saved = readGuestPlan();
    if (!params.get('goal') && saved.goals?.length) setGoals(saved.goals);
    setEntries(saved.entries ?? {});
    if (saved.horizon !== undefined) setHorizon(saved.horizon);
    if (saved.maxCandidates !== undefined) setMaxCandidates(saved.maxCandidates);
    if (saved.strategyText !== undefined) setStrategyText(saved.strategyText);
    if (saved.budgetMax !== undefined) setBudgetMax(saved.budgetMax);
    draftLoaded.current = true;
  }, [guest, auth.identityKey, params]);
  useEffect(() => {
    if (guest && draftLoaded.current) saveGuestPlan({ goals, entries, horizon, maxCandidates, strategyText, budgetMax });
  }, [guest, goals, entries, horizon, maxCandidates, strategyText, budgetMax]);
  const formRef = useRef<HTMLDivElement | null>(null);
  const resultRef = useRef<HTMLElement | null>(null);
  /**
   * 「规划任务 … 运行中」那条提示的锚点。
   *
   * 结果要几秒才回来，这段时间页面下方什么都还没有；把提示本身当锚点，
   * 「点了按钮 → 视线立刻落到正在发生的事上 → 结果一落地就地展开」才是连贯的一次反馈。
   */
  const pendingRef = useRef<HTMLParagraphElement | null>(null);
  /**
   * 载入范例或点「开始规划」之后，把**已经在的那一份**带进视野。
   *
   * 两个标记缺一不可（2026-10-14 修）：「进行中的提示」与「规划出来的结果」是**两次**滚动，
   * 而它们发生在同一个意图里。先前只用一个标记，第一次滚动（跳到「规划任务 … 运行中」）
   * 就把它消费掉了，结果落地时反而不再跳——用户看到的正是「点了没跳」。
   * 现在 `resultScrollPending` 是**意图**，只在结果（或可学前沿）真的出现时才消费；
   * `pendingNoticeScrolled` 只保证那条提示最多带一次视野。
   */
  const resultScrollPending = useRef(false);
  const pendingNoticeScrolled = useRef(false);
  /** 平滑滚动到锚点：effect 与「重复点击」那条路共用一份，避免两处写法漂开。 */
  const scrollToElement = (target: Element | null) => {
    if (target && typeof target.scrollIntoView === 'function') target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  useEffect(() => {
    if (result || frontierReport) {
      if (!resultScrollPending.current) return;
      resultScrollPending.current = false;
      pendingNoticeScrolled.current = false;
      scrollToElement(resultRef.current);
      return;
    }
    if (jobId && resultScrollPending.current && !pendingNoticeScrolled.current) {
      pendingNoticeScrolled.current = true;
      scrollToElement(pendingRef.current);
    }
  }, [result, frontierReport, jobId]);

  // 语种变化要重新取数：本体里的标题与说明由服务端按 `?locale=` 下发（`useApi` 已内置，这里直接调 `api()`，要自己带上）。
  useEffect(() => {
    api<GraphData>('/ontology/graph').then(setGraph).catch((reason) => setError(formatError(reason)));
  }, [localeKey]);

  useEffect(() => {
    if (!profileId) { setDirectionNode(null); return; }
    if (learningData.loading || !learningData.learningPlan) return;
    const primary = learningData.learningPlan.primaryGoal;
    const previous = previousPrimary.current;
    setDirectionNode(primary);
    if (!params.get('goal') && primary) setGoals(current =>
      current.length === 1 && (current[0] === previous || (previous === null && current[0] === initialGoal.current)) ? [primary] : current);
    previousPrimary.current = primary;
    if (paceProfile.current !== profileId) {
      const setting = paceHorizon(learningData.learningPlan.pace, locale);
      if (setting) { setHorizon(setting.horizon); setPaceApplied(true); }
      paceProfile.current = profileId;
    }
  }, [profileId, learningData.learningPlan, learningData.loading, params, locale]);

  /** 上一次自动带入的节点集合：切换档案时要先撤掉旧档案带进来的项，再换成新档案的。 */
  const autoFilledRef = useRef<Set<string>>(new Set());

  // 学习者已经在「我的学习」里确认过背景，不该被要求在这里再手工勾一遍。
  // 仅把已知项**补进**背景声明；规划请求照旧显式发送，服务端行为不变。
  useEffect(() => {
    if (!profileId) {
      setProfileKnown(new Set());
      // 取消选择档案时只撤掉自动带入的项，学习者手动勾的背景继续保留。
      setEntries((current) => {
        const next = { ...current };
        for (const node of autoFilledRef.current) delete next[node];
        autoFilledRef.current = new Set();
        return next;
      });
      return;
    }
    let active = true;
    api<{ theta: { known: Array<{ node: string }> } }>(`/profiles/${profileId}`)
      .then((result) => {
        if (!active) return;
        const known = new Set(result.theta.known.map((entry) => entry.node));
        setProfileKnown(known);
        /*
         * 这里必须是「合并」而不是「替换」。
         *
         * 早先的实现直接把整个表单重置成档案里的已知项：学习者在档案回填到达之前勾好的背景
         * 会被无声抹掉（实测在规划页快速勾选两个背景节点后点击规划，得到的是「没有可行路线」）。
         * 现在只补进「本次表单还没有声明」的节点，学习者的手动选择优先。
         */
        setEntries((current) => {
          const next = { ...current };
          for (const node of autoFilledRef.current) {
            if (!known.has(node) && next[node]?.kind === 'confirmed') delete next[node];
          }
          for (const node of known) if (!(node in next)) next[node] = { kind: 'confirmed' };
          autoFilledRef.current = new Set(known);
          return next;
        });
      })
      .catch(() => { if (active) setProfileKnown(new Set()); });
    return () => { active = false; };
  }, [profileId, localeKey, auth.identityKey]);

  useEffect(() => {
    if (!jobId) return;
    let active = true;
    const controller = new AbortController();
    const identity = auth.identityKey;
    const timer = setInterval(async () => {
      try {
        const poll = await api<{ job: { status: string }; result: PlanResultView | null; error: { message: string } | null }>(`/plans/${jobId}`, { signal: controller.signal });
        if (!active || identityRef.current !== identity) return;
        setJobStatus(poll.job.status);
        if (poll.job.status === 'done') { setResult(poll.result); setJobId(null); }
        else if (poll.job.status === 'error' || poll.job.status === 'cancelled') { setError(poll.error?.message ?? poll.job.status); setJobId(null); }
      } catch (reason) { if (active) { setError(formatError(reason)); setJobId(null); } }
    }, 600);
    return () => { active = false; controller.abort(); clearInterval(timer); };
  }, [jobId, auth.identityKey]);

  /**
   * 「可用背景」网格：只列**没有任何行动能产出**的单元节点。
   *
   * 2026-10 起多一条过滤：话题级条目（`granularity === 'topic'`）不进背景网格——
   * 它是一条学习线索的名字，不是可独立认知的单元，因此不能被「声明为已经会了」。
   * 它可以当**目标**（路线本来就是沿线索走的，见下面的目标下拉框），但不能当前提。
   * 过滤掉的数量在下面如实说明，不静默丢弃。
   */
  const { backgroundNodes, threadBackgroundOmitted } = useMemo(() => {
    if (!graph) return { backgroundNodes: [], threadBackgroundOmitted: [] as string[] };
    const produced = new Set(graph.actions.flatMap((action) => action.outputs.map((output) => output.node)));
    const used = new Set(graph.actions.flatMap((action) => action.inputs.map((input) => input.node)));
    const candidates = [...used].filter((id) => !produced.has(id)).sort()
      .map((id) => ({ id, node: graph.nodes.find((item) => item.id === id) }))
      .filter((item) => item.node);
    const units = candidates.filter((item) => item.node?.granularity !== 'topic');
    const omitted = candidates.filter((item) => item.node?.granularity === 'topic').map((item) => item.id);
    return { backgroundNodes: units, threadBackgroundOmitted: omitted };
  }, [graph]);

  /**
   * 目标下拉里有多少条话题级线索。用来把那句分工说明只在真有线索时说一次，
   * 而不是每页都挂一段没人看的免责声明。
   */
  const threadGoalCount = useMemo(
    () => (graph?.nodes ?? []).filter((node) => node.granularity === 'topic'
      && ['Claim', 'Concept', 'Construction', 'Method', 'Problem', 'Example'].includes(node.construct)).length,
    [graph],
  );

  /**
   * 声明集合里那些**不在「可用背景」网格里**的节点。
   *
   * 网格只列「没有任何行动能产出」的背景节点；范例的起点大多是前几程的成果，
   * 它们有产出行动，因此不会出现在网格里。如果不在这里如实列出来，学习者会看到
   * 一个「背景是空的、却规划出了路线」的页面——那正是最该避免的误导。
   */
  const declaredNotInGrid = useMemo(() => {
    const listed = new Set(backgroundNodes.map((item) => item.id));
    return Object.keys(entries).filter((id) => !listed.has(id)).sort();
  }, [backgroundNodes, entries]);

  async function runPlan(review = false, override?: { goals?: string[]; horizon?: number; entries?: Record<string, { kind: 'confirmed' | 'assumption' | 'unknown' }> }) {
    if (!auth.ready) return;
    const activeGoals = override?.goals ?? goals;
    /*
     * 没有目标：**不往规划器发请求**（契约里目标必填，硬塞一个空目标只会得到 400）。
     * 改为当场算可学前沿——这一步是纯派生，不走网络、也不产生任何 E 层事件。
     */
    if (activeGoals.length === 0) {
      setError(null); setResult(null); setJobId(null); setJobStatus(null);
      setFrontierOn(true);
      setHasPlanned(true);
      resultScrollPending.current = true;
      pendingNoticeScrolled.current = false;
      /*
       * 已经在无目标模式时再点一次：`frontierOn` 与 `hasPlanned` 都没有变化，
       * React 不重渲染、上面那条 effect 也就不会重跑——这里直接把视线带回去，
       * 否则「点了没反应」会在这个角落里原样复现。
       */
      if (resultRef.current) scrollToElement(resultRef.current);
      return;
    }
    const generation = ++requestGeneration.current, identity = auth.identityKey;
    setError(null);
    setResult(null);
    setLastWasReview(review);
    /* 按钮当场换字：这一下点上没有，不必等结果回来才知道。 */
    setHasPlanned(true);
    /* 结果还没到，先把视线交给「规划任务 … 运行中」那条提示；结果落地后**再**交给路线栏目。 */
    resultScrollPending.current = true;
    pendingNoticeScrolled.current = false;
    const activeEntries = override?.entries ?? entries;
    const activeHorizon = override?.horizon ?? horizon;
    const background = Object.entries(activeEntries).map(([node, value]) => ({ entryId: 'ui:' + node, node, provides: ['statement', 'definition'], kind: value.kind }));
    let strategy: Record<string, unknown> = {};
    if (strategyText.trim()) {
      try { strategy = JSON.parse(strategyText); }
      catch { setError(pick(TEXT.strategyParseError)); return; }
    }
    const budget = budgetMax.trim() === '' ? null : { maxCost: Number(budgetMax), currency: 'declared-cost' };
    const body: Record<string, unknown> = { goalId: activeGoals[0], background, horizon: activeHorizon, maxCandidates, strategy, budget, profileId: profileId ?? undefined };
    // 多目标照旧走服务端已有的 goalIds 通道；单目标时请求体与改动前逐字一致。
    if (activeGoals.length > 1) body.goalIds = activeGoals.slice(1);
    if (review) body.review = { node: activeGoals[0] };
    try {
      const started = await api<{ job: { id: string; status: string } }>('/plans', { method: 'POST', body });
      if (generation !== requestGeneration.current || identity !== identityRef.current) return;
      setJobId(started.job.id);
      setJobStatus(started.job.status);
    } catch (reason) { if (generation === requestGeneration.current && identity === identityRef.current) setError(formatError(reason)); }
  }

  /** 载入范例：写入目标组、事件界与起点声明，然后立刻规划一次。 */
  function loadExample(path: ExamplePath) {
    /*
     * 示范起点声明为**假设**而不是「已确认可用」：
     * 那是「如果这些已经会了，这条路会这么走」，不是学习者对自己的判断。
     * 写成 confirmed 会把示范的乐观前提悄悄记进规划请求，对第一次来的人尤其误导。
     */
    const nextEntries = Object.fromEntries(path.entries.map((node) => [node, { kind: 'assumption' as const }]));
    setGoals(path.goals);
    setHorizon(path.horizon);
    setEntries(nextEntries);
    setLoadedExample(path);
    setError(null);
    resultScrollPending.current = true;
    void runPlan(false, { goals: path.goals, horizon: path.horizon, entries: nextEntries });
    // 走完规划请求后把视线带到表单：用户能在原地看到范例写进去了什么、并继续改参数。
    if (typeof formRef.current?.scrollIntoView === 'function') formRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  /** 清除范例入口：只保留学习者自己勾选的背景，目标回到当前主目标。 */
  function clearExample() {
    setLoadedExample(null);
    setGoals([goal]);
    const listed = new Set(backgroundNodes.map((item) => item.id));
    setEntries((current) => Object.fromEntries(Object.entries(current).filter(([id]) => listed.has(id))));
  }

  /* —— 整条路径：一键导入、逐程走、结束（2026-10-13 加） —— */

  /** 一键导入整条路径：载入第一程，并把「正在走这一本」记进本次会话。 */
  function importWholePath(set: ExampleSet) {
    const next = { setId: set.id, visited: [set.paths[0].id] };
    setWalk(next);
    writeExampleWalk(next);
    loadExample(set.paths[0]);
  }

  /** 走进第 index 程：进度轨上点一程，或点「下一程」。 */
  function loadWalkStage(index: number) {
    const path = walkSet?.paths[index];
    if (!walkSet || !path) return;
    const next = { setId: walkSet.id, visited: [...new Set([...(walk?.visited ?? []), path.id])] };
    setWalk(next);
    writeExampleWalk(next);
    loadExample(path);
  }

  function exitWalk() {
    setWalk(null);
    writeExampleWalk(null);
  }

  async function cancel() {
    if (!jobId) return;
    try { await api(`/plans/${jobId}`, { method: 'DELETE' }); } catch { /* job may already be done */ }
    setJobId(null);
    setJobStatus('cancelled');
  }

  const actionById = useMemo(() => new Map((graph?.actions ?? []).map((action) => [action.id, action])), [graph]);
  const actionTitleById = useMemo(() => new Map((graph?.actions ?? []).map((action) => [action.id, action.title])), [graph]);
  const nodeById = useMemo(() => new Map((graph?.nodes ?? []).map((node) => [node.id, node])), [graph]);
  /** 节点标题按 id 取：方向行、参与项与结果列表共用同一份映射。 */
  const titleOf = (id: string) => nodeById.get(id)?.title ?? id;
  // withReview 会把 routes 折成单条；此时按 pareto 展示会拿到未含复习事件的陈旧结果包。
  const routes = result ? (lastWasReview || showAllRoutes ? result.routes : result.pareto.length ? result.pareto : result.routes) : [];
  /** 默认只比较前三条候选：其余折叠，避免第一屏变成一张功能清单。 */
  const visibleRoutes = showAllRoutes ? routes : routes.slice(0, 3);
  const hasGoalParam = Boolean(params.get('goal'));

  /*
   * 窄屏（≤860px，与 `styles.css` 的 `.example-pages` 断点同一档）把范例入口条排到表单之后：
   * 手机上入口条排在最前会把规划表单推到 1500px 之下（实测），那是把主页功能埋掉。
   */
  const narrowPlanPage = useMediaQuery('(max-width: 860px)');

  /**
   * 沿路线阅读：把这条路线的事件顺序存进本次会话，然后从第一步的节点开始读。
   *
   * 不写成 <Link>：路线 id 由保存动作生成，若在渲染期生成，每次重渲染都会得到新 id
   * 并反复写会话存储。点击时再存，语义也更清楚——只有真的要走这条路线才建立上下文。
   */
  function startReading(route: PlanPackageView) {
    const order = readingOrder(route);
    const steps = buildReadingSteps(route, order, actionTitleById);
    const firstNode = steps[0]?.node || result?.goals[0];
    if (!firstNode) return;
    const saved = saveReadingRoute({ routeId: route.id, goal: result?.goals[0] ?? '', steps });
    navigate(hrefFor(`/nodes/${encodeURIComponent(firstNode)}?route=${saved.id}&step=1`));
  }

  return (
    <div className="page">
      <div className="section-heading">
        <h1>{pick(TEXT.title)}</h1>
        <p>{pick(TEXT.intro)}</p>
        {guest && <p className="muted" data-testid="guest-plan-note">{pick({ zh: '游客也可规划：背景声明仅用于这次规划。目标与参数暂存在当前浏览器，登录后不会自动写入学习档案。', en: 'Guests can plan too. Background declarations apply only to this plan. Goals and settings stay in this browser and are not automatically saved to a profile after sign-in.' })}</p>}
      </div>

      {/*
        范例路径（2026-10-13 第二版：压缩态 → 悬浮简介 → 点击展开）。

        默认只占几行：三个学科各一行书名按钮；鼠标悬浮（或键盘聚焦）书名才出现这套路径的
        简介；点一下在同一栏里展开它的各程卡片。因此不再需要「入口条 + 页面底部详情」两处渲染，
        也不会把规划表单压到十几屏之下。
      */}
      {!narrowPlanPage && <ExamplePaths nodes={graph?.nodes ?? []} loadedId={loadedExample?.id ?? null} onLoad={loadExample} onLoadPath={importWholePath} />}
      <LearningGuide learning={learningData} compact />

      {/* 三步主线：先确定目标，再核对背景，最后才比较路线；范例移到最后作为可选的起步方式。 */}
      {/* a11y 文案走 `messages.ts` 的 `a11y.*` 段（全站统一入口）；中文「规划步骤」逐字不变。 */}
      <ol className="step-rail" aria-label={t('a11y.planSteps')}>
        <li className="active optional"><span>1</span>{pick(TEXT.stepGoal)}</li>
        <li><span>2</span>{pick(TEXT.stepBackground)}</li>
        <li><span>3</span>{pick(TEXT.stepRoutes)}</li>
      </ol>

      <div className="card plan-form" id="plan-form" ref={formRef}>
        <h2>{pick(TEXT.headingGoal)}</h2>
        {/*
          方向只作为**默认目标的来源**出现在这里：规划器仍然只吃「目标 + 背景 + 事件界」，
          一行算法都没改。学习者改下拉框即覆盖它。
        */}
        <p className="plan-direction muted">
          {pick(TEXT.directionLead)}
          {directionNode ? (
            <>
              <strong className={isPending(titleOf(directionNode)) ? 'i18n-pending' : undefined} title={isPending(titleOf(directionNode)) ? t('i18n.pendingTitle') : undefined}>{titleOf(directionNode)}</strong>
              <button className="link-button" onClick={() => { setGoals([directionNode]); setLoadedExample(null); }}>{pick(TEXT.directionUse)}</button>
              <span className="muted"> · {pick(TEXT.directionFrom)}</span>
            </>
          ) : (
            <>
              {pick(TEXT.directionNone)}
              <Link className="link-button" to={hrefFor('/start#direction')}>{pick(TEXT.directionOpen)}</Link>
            </>
          )}
        </p>
        {hasGoalParam && (
          <p className="chosen-goal">
            {pick(TEXT.chosenGoalLead)}<strong>{nodeById.get(goal)?.title ?? goal}</strong>
            <code>{goal}</code>
          </p>
        )}
        <label>{pick(TEXT.goalNodeLabel)}
          <select value={goal ?? ''} onChange={(event) => { setGoals(event.target.value ? [event.target.value] : []); setLoadedExample(null); }}>
            {/* 空选项：目标可选（2026-10-13）。选它会走可学前沿，而不是给规划器一个空目标。 */}
            <option value="">{pick(TEXT.goalOptionalOption)}</option>
            {(graph?.nodes ?? []).filter((node) => GOAL_CONSTRUCTS.includes(node.construct)).map((node) => (
              <option
                key={node.id}
                value={node.id}
                /* 英文站上本体标题还没译时回落中文：如实标注（与全站 `i18n-pending` 口径一致）。 */
                className={isPending(node.title) ? 'i18n-pending' : undefined}
                title={isPending(node.title) ? t('i18n.pendingTitle') : undefined}
              >
                {node.granularity === 'topic' ? pick(TEXT.topicMarkOption) : ''}{node.title}{pick(TEXT.idSuffix)(node.id)}
              </option>
            ))}
            {/*
              当前目标不在常规列表里（符号类节点、或 `?goal=` 带来的别的构造类型）时补一条，
              否则 `value={goal}` 落不到任何选项上，浏览器会把下拉框显示成空——看起来像没选目标。
            */}
            {goal && !(graph?.nodes ?? []).some((node) => node.id === goal && GOAL_CONSTRUCTS.includes(node.construct)) && (
              <option value={goal}>{titleOf(goal)}{pick(TEXT.idSuffix)(goal)}</option>
            )}
          </select>
        </label>
        {/* 目标可选这件事要写在表单上：否则「不选目标」看起来像还没填完。 */}
        <p className="muted plan-goal-optional">
          {pick(TEXT.goalOptionalHint)}
        </p>
        {/*
         * 话题与单元在规划页的分工，写成一句能核的话：目标可以是线索，背景只能是单元。
         * 依据见 data/granularity.mjs（判据与登记表）与网络页的「线索层」。
         */}
        {threadGoalCount > 0 && (
          <p className="muted">
            {rich('threadGoalNote')(threadGoalCount, hrefFor('/nodes?show=topics'))}
          </p>
        )}
        {goals.length > 1 && (
          <p className="notice">
            {rich('multiGoal')(
              nodeById.get(goal)?.title ?? goal,
              goals.slice(1).map((id) => nodeById.get(id)?.title ?? id).join('、'),
              goals.length,
              clearExample,
            )}
          </p>
        )}
        <div className="plan-actions">
          {/*
           * 主按钮的三态：没点过「开始规划」→ 任务在跑「规划中…」→ 跑完「重新规划」。
           * `data-testid` 是给测试的稳定把手：按钮文案会变，按文案找第二次点击就会失手。
           */}
          <button
            className="button primary"
            data-testid="plan-submit"
            aria-busy={Boolean(jobId)}
            disabled={Boolean(jobId)}
            onClick={() => runPlan(false)}
          >
            {pick(jobId ? TEXT.planning : hasPlanned ? TEXT.replan : TEXT.startPlanning)}
          </button>
          {jobId && <button className="button" onClick={cancel}>{pick(TEXT.cancelJob)}</button>}
          {/* withReview 会把路线折成单条并只针对一个节点；多目标时这条路径不适用，直接禁用并说明。 */}
          <button className="button ghost" disabled={Boolean(jobId) || goals.length !== 1} title={goals.length !== 1 ? pick(TEXT.planWithReviewDisabled) : undefined} onClick={() => runPlan(true)}>{pick(TEXT.planWithReview)}</button>
        </div>
        <details className="plan-advanced">
          <summary>{pick(TEXT.advancedSummary)}</summary>
          <div className="plan-advanced-grid">
            <label>{pick(TEXT.horizonLabel)}
              <input
                type="number"
                min={1}
                max={MAX_HORIZON}
                value={horizon}
                onChange={(event) => { setHorizon(Number(event.target.value)); setPaceApplied(false); }}
              />
            </label>
            <label>{pick(TEXT.maxCandidatesLabel)}
              <input type="number" min={100} max={1000000} value={maxCandidates} onChange={(event) => setMaxCandidates(Number(event.target.value))} />
            </label>
            <label>{pick(TEXT.budgetLabel)}
              <input type="number" min={0} value={budgetMax} onChange={(event) => setBudgetMax(event.target.value)} placeholder={pick(TEXT.budgetPlaceholder)} />
            </label>
            <label className="strategy-input">{pick(TEXT.strategyLabel)}
              <textarea rows={3} value={strategyText} onChange={(event) => setStrategyText(event.target.value)} placeholder={pick(TEXT.strategyPlaceholder)} />
            </label>
          </div>
          <p className="muted">{pick(TEXT.noCostNote)()}</p>
          {/*
            偏好参与默认值这件事必须**写出来**（TODO A4-23）：
            不然「为什么这里是 3 而不是 8」无从判断。同时说明它只改默认值、不改算法，
            并给回去改偏好的入口。
          */}
          {paceApplied && paceDefault && (
            <p className="muted plan-pace-note" data-pace-source={savedPreferences.pace ?? undefined}>
              {rich('paceNote')(
                /*
                 * 理由文本来自 `start-preferences.ts`（归 task-8），英文站上可能仍是中文：
                 * 回落中文时如实标注，不假装已翻译。
                 */
                <span
                  className={isPending(paceDefault.why) ? 'i18n-pending' : undefined}
                  title={isPending(paceDefault.why) ? t('i18n.pendingTitle') : undefined}
                >
                  {paceDefault.why}
                </span>,
                (() => {
                  const summary = preferenceSummary(savedPreferences, locale);
                  if (!summary) return null;
                  return (
                    <span
                      className={isPending(summary) ? 'i18n-pending' : undefined}
                      title={isPending(summary) ? t('i18n.pendingTitle') : undefined}
                    >
                      {summary}
                    </span>
                  );
                })(),
                hrefFor('/start#prefs'),
              )}
            </p>
          )}
        </details>
      </div>

      {/*
        「整条路径」进度轨（2026-10-13 加）：一键导入范例的整条路径之后挂在这里。
        它只记**本次会话**载入过哪几程（示范假设，不写档案），所以措辞一律是「载入」而不是「学会」。
        当前程 = 表单里载入的那一程；点任意一程都能直接跳过去，「下一程」走正序。
      */}
      {walkSet && (
        <section className="card example-walk" aria-label={pick(TEXT.walkTitle)(walkSet.shortTitle)}>
          <div className="example-walk-head">
            <h2>{pick(TEXT.walkTitle)(walkSet.shortTitle)}</h2>
            <button type="button" className="link-button" onClick={exitWalk}>{pick(TEXT.walkExit)}</button>
          </div>
          <p className="muted">{pick(TEXT.walkLead)(walkSet.paths.length)}</p>
          <ol className="example-walk-stages">
            {walkSet.paths.map((path, index) => {
              const state = index === walkStageIndex ? 'current' : (walk?.visited ?? []).includes(path.id) ? 'visited' : 'todo';
              const label = state === 'current'
                ? pick(TEXT.walkCurrent)
                : state === 'visited' ? pick(TEXT.walkVisited) : pick(TEXT.walkTodo);
              return (
                <li key={path.id} className={`example-walk-stage ${state}`}>
                  <button type="button" className="link-button" onClick={() => loadWalkStage(index)}>
                    <span className="example-walk-ordinal">{path.ordinal}</span>
                    <span className="example-walk-title">{path.title}</span>
                  </button>
                  <span className="example-walk-meta">{pick(TEXT.walkStageMeta)(path.goals.length, path.entries.length, path.events)}</span>
                  <span className={`example-walk-state ${state}`}>{label}</span>
                </li>
              );
            })}
          </ol>
          <div className="card-actions">
            {walkNextIndex >= 0 && walkNextIndex < walkSet.paths.length ? (
              <button type="button" className="button primary" onClick={() => loadWalkStage(walkNextIndex)}>
                {pick(TEXT.walkNext)(walkSet.paths[walkNextIndex].ordinal, walkSet.paths[walkNextIndex].title)}
              </button>
            ) : (
              <span className="example-walk-done">{pick(TEXT.walkDone)(walkSet.paths.length)}</span>
            )}
          </div>
        </section>
      )}

      {/*
        窄屏把范例路径放在表单之后（2026-10-13）：手机上的第一动作是填目标，
        这一栏排在最前会把表单推到 1500px（实测），`tests/browser.mjs` 的
        「窄屏规划页目标在首屏附近」守的正是这件事。桌面端仍在最前（见上面那一处）。
        压缩态只有三行书名，所以窄屏这里也不占地方。
      */}
      {narrowPlanPage && <ExamplePaths nodes={graph?.nodes ?? []} loadedId={loadedExample?.id ?? null} onLoad={loadExample} onLoadPath={importWholePath} />}

      <section className="card">
        <h2>{pick(TEXT.headingBackground)}</h2>
        <p className="hint">
          {profileId ? pick(TEXT.backgroundHintWithProfile) : pick(TEXT.backgroundHintWithoutProfile)}
        </p>
        {profileKnown.size > 0 && (
          <p className="notice">{pick(TEXT.profileKnownLead)}{[...profileKnown].map((id) => nodeById.get(id)?.title ?? id).join('、')}</p>
        )}
        {loadedExample && (
          <div className="example-loaded-entries">
            <p className="notice">
              {rich('loadedExample')(
                loadedExample.ordinal,
                loadedExample.title,
                loadedExample.entries.length,
                declaredNotInGrid.length,
                clearExample,
              )}
            </p>
            <details className="example-entry-list">
              <summary>{pick(TEXT.viewExampleEntries)(loadedExample.entries.length)}</summary>
              <ul>
                {loadedExample.entries.map((id) => (
                  <li key={id}>
                    <Link
                      to={hrefFor(`/nodes/${encodeURIComponent(id)}`)}
                      className={isPending(nodeById.get(id)?.title ?? id) ? 'i18n-pending' : undefined}
                      title={isPending(nodeById.get(id)?.title ?? id) ? t('i18n.pendingTitle') : undefined}
                    >
                      {nodeById.get(id)?.title ?? id}
                    </Link>
                    {threadBackgroundOmitted.includes(id)
                      ? <span className="muted">{pick(TEXT.topicThreadOmitted)}</span>
                      : !backgroundNodes.some((item) => item.id === id) && <span className="muted">{pick(TEXT.previousLegResult)}</span>}
                  </li>
                ))}
              </ul>
            </details>
          </div>
        )}
        <div className="background-grid">
          {backgroundNodes.map(({ id, node }) => (
            <div className="background-item" key={id}>
              <label><input type="checkbox" checked={Boolean(entries[id])} onChange={(event) => setEntries((current) => {
                const next = { ...current };
                if (event.target.checked) next[id] = { kind: 'confirmed' };
                else delete next[id];
                return next;
              })} /> <span
                className={isPending(node?.title ?? id) ? 'i18n-pending' : undefined}
                title={isPending(node?.title ?? id) ? t('i18n.pendingTitle') : undefined}
              >{node?.title ?? id}</span><code>{id}</code></label>
              {entries[id] && (
                <select value={entries[id].kind} onChange={(event) => setEntries((current) => ({ ...current, [id]: { kind: event.target.value as 'confirmed' | 'assumption' | 'unknown' } }))}>
                  <option value="confirmed">{pick(TEXT.entryConfirmed)}</option>
                  <option value="assumption">{pick(TEXT.entryAssumption)}</option>
                  <option value="unknown">{pick(TEXT.entryUnknown)}</option>
                </select>
              )}
            </div>
          ))}
        </div>
        {/* 被过滤掉的话题级条目如实说明，不静默丢弃（「不参与前置计算」不等于「看不见」）。 */}
        {threadBackgroundOmitted.length > 0 && (
          <p className="muted">
            {pick(TEXT.omittedThreads)(threadBackgroundOmitted.length, threadBackgroundOmitted.map((id) => nodeById.get(id)?.title ?? id).join('、'))}
          </p>
        )}
      </section>

      {/* 进行中的提示既是滚动锚点，也是读屏软件的播报点（`role="status"` 即 aria-live=polite）。 */}
      {jobId && <p className="notice" ref={pendingRef} role="status">{pick(TEXT.jobRunning)(jobId, jobStatus ?? '')}</p>}
      {error && <p className="error">{error}</p>}

      {/*
        无目标的结果（2026-10-13）：可学前沿。
        它与路线比较**互斥**（目标一出现就自动退出这个模式），因此共用同一个滚动锚点。
      */}
      {frontierReport && (
        <section className="card plan-frontier" ref={resultRef} aria-label={pick(TEXT.frontierTitle)}>
          <h2>{pick(TEXT.frontierTitle)}</h2>
          <p className="hint">{pick(TEXT.frontierLead)}</p>
          <dl className="facts">
            <div><dt>{pick(TEXT.frontierStartable)}</dt><dd>{frontierReport.options.length}</dd></div>
            <div>
              <dt>{pick(TEXT.frontierReachable)}</dt>
              <dd>{pick(TEXT.frontierReachableValue)(frontierReport.position.reachable, frontierReport.position.units)}</dd>
            </div>
            <div><dt>{pick(TEXT.frontierBackground)}</dt><dd>{pick(TEXT.frontierBackgroundValue)(Object.keys(entries).length)}</dd></div>
          </dl>
          {frontierReport.threadExcluded > 0 && <p className="muted">{pick(TEXT.frontierThreadNote)(frontierReport.threadExcluded)}</p>}
          {frontierReport.options.length === 0 ? (
            <p className="notice">{pick(TEXT.frontierEmpty)}</p>
          ) : (
            <>
              <p className="muted">{pick(TEXT.frontierPickLead)}</p>
              <ul className="frontier-options">
                {frontierReport.options.slice(0, FRONTIER_LIMIT).map((option) => (
                  <li
                    key={option.node}
                    className={option.recommended ? 'frontier-option recommended' : 'frontier-option'}
                    data-node={option.node}
                  >
                    <div className="frontier-option-head">
                      <Link
                        to={hrefFor(`/nodes/${encodeURIComponent(option.node)}`)}
                        className={isPending(option.title) ? 'i18n-pending' : undefined}
                        title={isPending(option.title) ? t('i18n.pendingTitle') : undefined}
                      >
                        {option.title}
                      </Link>
                      <code>{option.node}</code>
                      {option.recommended && <span className="badge badge-recommended">{pick(TEXT.frontierRecommended)}</span>}
                      {option.newlyUnlocked > 0 && <span className="badge badge-unlock">{pick(TEXT.frontierUnlocks)(option.newlyUnlocked)}</span>}
                    </div>
                    {/* 依据句直接来自 `direction.ts` 的 `optionBasis`：界面不自己写第二句（与方向面板同源）。 */}
                    <p className="frontier-basis">{optionBasis(option, titleOf, locale)}</p>
                    <div className="card-actions">
                      {option.actionId ? (
                        <button
                          className="button small primary"
                          onClick={() => {
                            /*
                             * 一键把候选变成目标：写进下拉框（表单上看得见）**并立刻规划一次**。
                             * `goals` 一变成非空，无目标模式自己就退出了（见上面那条 effect）。
                             */
                            setGoals([option.node]);
                            setLoadedExample(null);
                            void runPlan(false, { goals: [option.node] });
                          }}
                        >
                          {pick(TEXT.frontierUseAsGoal)}
                        </button>
                      ) : (
                        /*
                         * 没有产出行动的节点（本体的 `Symbol` 这类）**当不了目标**：
                         * 规划器只能靠事件产出节点，没有行动的节点永远「界内不可行」。
                         * 它唯一能做的事是「直接声明」——那就让它做这件事（并说明为什么不给目标按钮）。
                         */
                        <button
                          className="button small primary"
                          title={pick(TEXT.frontierDeclareHint)}
                          onClick={() => {
                            setEntries((current) => ({ ...current, [option.node]: { kind: 'confirmed' } }));
                            setLoadedExample(null);
                          }}
                        >
                          {pick(TEXT.frontierDeclare)}
                        </button>
                      )}
                      <Link className="button small" to={hrefFor(`/nodes/${encodeURIComponent(option.node)}`)}>{pick(TEXT.frontierOpenNode)}</Link>
                    </div>
                  </li>
                ))}
              </ul>
              {frontierReport.options.length > FRONTIER_LIMIT && (
                <p className="muted">{pick(TEXT.frontierMore)(frontierReport.options.length - FRONTIER_LIMIT)}</p>
              )}
              <p className="muted">{pick(TEXT.frontierUseAsGoalHint)}</p>
            </>
          )}
        </section>
      )}

      {result && (
        <>
          <section className="card plan-summary" ref={resultRef}>
            <h2>{pick(TEXT.headingRoutes)}</h2>
            <div className="plan-status">
              <StatusBadge status={result.status} />
              <span>{pick(TEXT.candidatesShown)(result.routes.length, routes.length)}</span>
              {!lastWasReview && <label className="checkbox"><input type="checkbox" checked={showAllRoutes} onChange={(event) => setShowAllRoutes(event.target.checked)} /> {pick(TEXT.showAllRoutes)}</label>}
            </div>
            {lastWasReview && <p className="notice">{pick(TEXT.reviewLimitation)}</p>}
            <dl className="facts">
              <div><dt>{pick(TEXT.factsGoal)}</dt><dd>{pick(TEXT.goalsCount)(result.goals.map((id) => nodeById.get(id)?.title ?? id).join('、'), result.goals.length)}</dd></div>
              <div><dt>{pick(TEXT.factsCompleteness)}</dt><dd>{result.search.complete ? pick(TEXT.searchComplete) : pick(TEXT.searchIncomplete)(result.search.reasons.join('、'))}</dd></div>
              <div><dt>{pick(TEXT.factsMinEvents)}</dt><dd>{result.search.bounds.firstSolutionDepth ?? '—'}</dd></div>
            </dl>
            <details className="plan-advanced">
              <summary>{pick(TEXT.searchDetails)}</summary>
              <dl className="facts compact">
                <div><dt>{pick(TEXT.boundsVisited)}</dt><dd>{result.search.bounds.visited}</dd></div>
                <div><dt>{pick(TEXT.boundsHorizon)}</dt><dd>{result.search.bounds.horizon}</dd></div>
                <div><dt>{pick(TEXT.boundsMaxCandidates)}</dt><dd>{result.search.bounds.maxCandidates}</dd></div>
                <div><dt>{pick(TEXT.boundsDomain)}</dt><dd>{result.search.domain}</dd></div>
              </dl>
            </details>
            {result.entryConditions.length > 0 && (
              <div className="entry-conditions"><h3>{pick(TEXT.entryConditions)}</h3><ul>{result.entryConditions.map((item) => <li key={item}><span className={isPending(nodeById.get(item)?.title ?? item) ? 'i18n-pending' : undefined} title={isPending(nodeById.get(item)?.title ?? item) ? t('i18n.pendingTitle') : undefined}>{nodeById.get(item)?.title ?? item}</span> <code>{item}</code></li>)}</ul></div>
            )}
            {result.unknownEntries.length > 0 && (
              <div className="entry-conditions"><h3>{pick(TEXT.unknownEntries)}</h3><ul>{result.unknownEntries.map((item) => <li key={item.node}>{item.question}</li>)}</ul></div>
            )}
            {result.familyRequired.length > 0 && (
              <div className="entry-conditions"><h3>{pick(TEXT.familyRequired)}</h3><p>{result.familyScope.complete ? pick(TEXT.familyComplete) : pick(TEXT.familyIncomplete)}</p><ul>{result.familyRequired.map((item) => <li key={item}><span className={isPending(nodeById.get(item)?.title ?? item) ? 'i18n-pending' : undefined} title={isPending(nodeById.get(item)?.title ?? item) ? t('i18n.pendingTitle') : undefined}>{nodeById.get(item)?.title ?? item}</span></li>)}</ul></div>
            )}
          </section>

          {result.routes.length === 0 && (
            <section className="card empty-state">
              <h2>{pick(TEXT.noRoutes)}</h2>
              <p className="muted">{pick(TEXT.noRoutesLead)}</p>
              {rich('noRoutesReasons')(horizon, maxCandidates, result.status)}
            </section>
          )}

          <section className="route-list">
            {visibleRoutes.map((route) => {
              const order = readingOrder(route);
              const eventById = new Map(route.events.map((event) => [event.id, event]));
              /*
               * 回放计划算一次给按钮与说明共用。
               *
               * 早先写成在 JSX 里调两次 `replayPlanOf(...)`，那会**每次渲染重算两遍整个路线**，
               * 而且两次拿到的是不同对象——虽然这里只读不写不会出错，但代价白白翻倍。
               */
              const replay = planRoute(
                route,
                order,
                new Map((graph?.actions ?? []).map((action) => [action.id, action.title])),
              );
              return (
                <article className="card route-card" key={route.id}>
                  <header>
                    <h2>{route.id}</h2>
                    <span>{pick(TEXT.routeEvents)(route.events.length)}</span>
                    <span>{pick(TEXT.routeCost)(route.cost.status === 'known' ? String(route.cost.vector?.reduce((sum, value) => sum + value, 0)) : pick(TEXT.costUnknown))}</span>
                    <span>{pick(TEXT.routeEvidence)(route.effects.proofs, route.effects.certificates)}</span>
                  </header>
                  {/*
                    回放入口：把这条路线交给组建网络页，按事件顺序逐步扩张。
                    按钮放在头部而不是底部——它是这条路线的主要「看结构」动作，
                    埋在时间线下面会让人以为路线只能按列表读。
                  */}
                  <p className="route-replay-row">
                    {/* 主操作是开始读；回放是理解结构的次操作。 */}
                    <button className="button small primary" onClick={() => startReading(route)}>{pick(TEXT.readAlongRoute)}</button>
                    <Link className="button small" to={hrefFor(`/network?${serializeRouteSearch(replay)}`)}>
                      {pick(TEXT.viewReplay)}
                    </Link>
                    <span className="muted">
                      {pick(TEXT.replaySummary)(replay.entry.length, replay.steps.length)}
                    </span>
                  </p>
                  <ol className="event-timeline">
                    {order.map((eventId) => {
                      const event = eventById.get(eventId);
                      if (!event) return null;
                      const action = actionById.get(event.actionId);
                      return (
                        <li key={event.id} className={event.kind === 'review' ? 'review' : ''}>
                          <div className="event-head">
                            {event.kind === 'review'
                              ? <StatusBadge status="review" label={pick(TEXT.reviewEvent)} />
                              : action
                                ? <StatusBadge status={action.mode} label={labels.actionModeLabel(action.mode)} title={action.mode} />
                                : <StatusBadge status={event.actionId} />}
                            <strong className={isPending(action?.title ?? event.actionId) ? 'i18n-pending' : undefined} title={isPending(action?.title ?? event.actionId) ? t('i18n.pendingTitle') : undefined}>{action?.title ?? event.actionId}</strong>
                            <code>{event.id}</code>
                          </div>
                          <p>{pick(TEXT.focusOn)}<Link
                            to={hrefFor(`/nodes/${encodeURIComponent(event.focus.node)}`)}
                            className={isPending(nodeById.get(event.focus.node)?.title ?? event.focus.node) ? 'i18n-pending' : undefined}
                            title={isPending(nodeById.get(event.focus.node)?.title ?? event.focus.node) ? t('i18n.pendingTitle') : undefined}
                          >{nodeById.get(event.focus.node)?.title ?? event.focus.node}</Link>{pick(TEXT.resourceSuffix)(labels.resourceLabel(event.focus.resource))}</p>
                          <ul className="sources">
                            {Object.entries(event.sources).map(([input, source]) => (
                              <li key={input}>
                                <code>{input}</code>
                                {source.kind === 'event' ? pick(TEXT.sourceFromEvent)(source.eventId) : source.kind === 'background' ? pick(TEXT.sourceFromBackground)(source.entryId, source.confirmed) : pick(TEXT.sourceFromUnknown)(source.question)}
                              </li>
                            ))}
                          </ul>
                        </li>
                      );
                    })}
                  </ol>
                  <details><summary>{pick(TEXT.rawPackage)}</summary><pre>{JSON.stringify({ goalSources: route.goalSources, order: route.order, witness: route.witness, cost: route.cost }, null, 2)}</pre></details>
                </article>
              );
            })}
            {!showAllRoutes && routes.length > 3 && (
              <p className="muted">
                {pick(TEXT.onlyTopThree)}
                <button className="link-button" onClick={() => setShowAllRoutes(true)}>{pick(TEXT.showRest)(routes.length - 3)}</button>
              </p>
            )}
          </section>
        </>
      )}

    </div>
  );
}
