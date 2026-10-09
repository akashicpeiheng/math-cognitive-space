import { useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { api, formatError, useLocaleKey } from '../api';
import { useProfileContext } from '../state';
import { StatusBadge } from '../components/StatusBadge';
import { ExamplePaths } from '../components/ExamplePaths';
import { useI18n } from '../i18n';
// `useLabels` 住在 `i18n/useLabels.tsx`：`labels.ts` 是纯数据表，不准 import React。
import { useLabels } from '../i18n/useLabels';
import { paceHorizon, preferenceSummary, readPreferences } from '../start-preferences';
import { planRoute, serializeRouteSearch } from '../route-replay';
import { buildReadingSteps, saveReadingRoute } from '../route-reading';
import type { ExamplePath } from '../example-paths';
import type { NodeSummary, PlanPackageView, PlanResultView } from '../types';

/** 事件界的上限与 shared/contracts.mjs 的 normalizePlanRequest 保持一致（0–32）。 */
const MAX_HORIZON = 32;

interface GraphData {
  nodes: NodeSummary[];
  actions: Array<{ id: string; title: string; mode: string; inputs: Array<{ node: string; accepts: string[] }>; outputs: Array<{ node: string; provides: string[] }> }>;
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
  stepGoal: { zh: '确定目标', en: 'Set the goal' },
  stepBackground: { zh: '核对背景', en: 'Check the background' },
  stepRoutes: { zh: '比较路线', en: 'Compare routes' },
  headingGoal: { zh: '① 确定目标', en: '① Set the goal' },
  headingBackground: { zh: '② 核对背景（外部模型 E 的显式声明）', en: '② Check the background (explicit declarations of the external model E)' },
  headingRoutes: { zh: '③ 比较路线', en: '③ Compare routes' },
  chosenGoalLead: { zh: '已选目标：', en: 'Selected goal: ' },
  goalNodeLabel: { zh: '目标节点', en: 'Goal node' },
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
  exampleSummary: { zh: '没有头绪？用现成范例试试', en: 'No idea where to start? Try a ready-made example' },
  strategyParseError: {
    zh: '策略 JSON 无法解析；未声明成本与次序时保持未知。',
    en: 'The strategy JSON cannot be parsed; without declared costs and order it stays unknown.',
  },
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
  examplePickerNote: {
    zh: () => (
      <>
        范例会写入一组目标、事件界与<strong>示范假设</strong>，然后立刻规划一次。
        示范假设不写进你的档案，规划结果只说明「如果这些已经会了，这条路会怎么走」。
      </>
    ),
    en: () => (
      <>
        An example writes a set of goals, an event horizon and <strong>demonstration assumptions</strong>, then plans
        immediately. Demonstration assumptions are not written to your profile; the result only says “if these were
        already known, this is how the route would go”.
      </>
    ),
  },
};

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
  const { profileId } = useProfileContext();
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
  const [error, setError] = useState<string | null>(null);
  const [showAllRoutes, setShowAllRoutes] = useState(false);
  const [profileKnown, setProfileKnown] = useState<Set<string>>(new Set());
  /** 上次规划是否走了 withReview 路径：决定要不要如实说明该路径的字段限制。 */
  const [lastWasReview, setLastWasReview] = useState(false);
  /** 当前载入的范例（若有）：用来显示入口清单与「清除范例入口」。 */
  const [loadedExample, setLoadedExample] = useState<ExamplePath | null>(null);
  const formRef = useRef<HTMLDivElement | null>(null);
  const resultRef = useRef<HTMLElement | null>(null);
  /** 载入范例后结果会渲染在表单下面；把它滚进视野，免得用户以为「点了没反应」。 */
  const resultScrollPending = useRef(false);
  useEffect(() => {
    if (!result || !resultScrollPending.current) return;
    resultScrollPending.current = false;
    if (typeof resultRef.current?.scrollIntoView === 'function') resultRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [result]);

  // 语种变化要重新取数：本体里的标题与说明由服务端按 `?locale=` 下发（`useApi` 已内置，这里直接调 `api()`，要自己带上）。
  useEffect(() => {
    api<GraphData>('/ontology/graph').then(setGraph).catch((reason) => setError(formatError(reason)));
  }, [localeKey]);

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
  }, [profileId, localeKey]);

  useEffect(() => {
    if (!jobId) return;
    let active = true;
    const timer = setInterval(async () => {
      try {
        const poll = await api<{ job: { status: string }; result: PlanResultView | null; error: { message: string } | null }>(`/plans/${jobId}`);
        if (!active) return;
        setJobStatus(poll.job.status);
        if (poll.job.status === 'done') { setResult(poll.result); setJobId(null); }
        else if (poll.job.status === 'error' || poll.job.status === 'cancelled') { setError(poll.error?.message ?? poll.job.status); setJobId(null); }
      } catch (reason) { if (active) { setError(formatError(reason)); setJobId(null); } }
    }, 600);
    return () => { active = false; clearInterval(timer); };
  }, [jobId]);

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
    setError(null);
    setResult(null);
    setLastWasReview(review);
    const activeGoals = override?.goals ?? goals;
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
      setJobId(started.job.id);
      setJobStatus(started.job.status);
    } catch (reason) { setError(formatError(reason)); }
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

  async function cancel() {
    if (!jobId) return;
    try { await api(`/plans/${jobId}`, { method: 'DELETE' }); } catch { /* job may already be done */ }
    setJobId(null);
    setJobStatus('cancelled');
  }

  const actionById = useMemo(() => new Map((graph?.actions ?? []).map((action) => [action.id, action])), [graph]);
  const actionTitleById = useMemo(() => new Map((graph?.actions ?? []).map((action) => [action.id, action.title])), [graph]);
  const nodeById = useMemo(() => new Map((graph?.nodes ?? []).map((node) => [node.id, node])), [graph]);
  // withReview 会把 routes 折成单条；此时按 pareto 展示会拿到未含复习事件的陈旧结果包。
  const routes = result ? (lastWasReview || showAllRoutes ? result.routes : result.pareto.length ? result.pareto : result.routes) : [];
  /** 默认只比较前三条候选：其余折叠，避免第一屏变成一张功能清单。 */
  const visibleRoutes = showAllRoutes ? routes : routes.slice(0, 3);
  const hasGoalParam = Boolean(params.get('goal'));

  /**
   * 沿路线阅读：把这条路线的事件顺序存进本次会话，然后从第一步的节点开始读。
   *
   * 不写成 <Link>：路线 id 由保存动作生成，若在渲染期生成，每次重渲染都会得到新 id
   * 并反复写会话存储。点击时再存，语义也更清楚——只有真的要走这条路线才建立上下文。
   */
  function startReading(route: PlanPackageView) {
    const order = route.linearExtensions[0] ?? route.events.map((event) => event.id);
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
      </div>

      {/* 三步主线：先确定目标，再核对背景，最后才比较路线；范例移到最后作为可选的起步方式。 */}
      {/* a11y 文案走 `messages.ts` 的 `a11y.*` 段（全站统一入口）；中文「规划步骤」逐字不变。 */}
      <ol className="step-rail" aria-label={t('a11y.planSteps')}>
        <li className="active"><span>1</span>{pick(TEXT.stepGoal)}</li>
        <li><span>2</span>{pick(TEXT.stepBackground)}</li>
        <li><span>3</span>{pick(TEXT.stepRoutes)}</li>
      </ol>

      <div className="card plan-form" ref={formRef}>
        <h2>{pick(TEXT.headingGoal)}</h2>
        {hasGoalParam && (
          <p className="chosen-goal">
            {pick(TEXT.chosenGoalLead)}<strong>{nodeById.get(goal)?.title ?? goal}</strong>
            <code>{goal}</code>
          </p>
        )}
        <label>{pick(TEXT.goalNodeLabel)}
          <select value={goal} onChange={(event) => { setGoals([event.target.value]); setLoadedExample(null); }}>
            {(graph?.nodes ?? []).filter((node) => ['Claim', 'Concept', 'Construction', 'Method', 'Problem', 'Example'].includes(node.construct)).map((node) => (
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
          </select>
        </label>
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
          <button className="button primary" disabled={Boolean(jobId)} onClick={() => runPlan(false)}>{pick(TEXT.startPlanning)}</button>
          {jobId && <button className="button" onClick={cancel}>{pick(TEXT.cancelJob)}</button>}
          {/* withReview 会把路线折成单条并只针对一个节点；多目标时这条路径不适用，直接禁用并说明。 */}
          <button className="button ghost" disabled={Boolean(jobId) || goals.length > 1} title={goals.length > 1 ? pick(TEXT.planWithReviewDisabled) : undefined} onClick={() => runPlan(true)}>{pick(TEXT.planWithReview)}</button>
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

      {jobId && <p className="notice">{pick(TEXT.jobRunning)(jobId, jobStatus ?? '')}</p>}
      {error && <p className="error">{error}</p>}

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
              const order = route.linearExtensions[0] ?? route.events.map((event) => event.id);
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

      {/*
        范例是「不知道怎么开始时」的出口，因此放在主线之后、默认折叠。
        从节点带着目标进来的人第一眼看到的是自己的目标与背景，不必先穿过一整套广义相对论范例。
      */}
      <details className="card example-picker" open={!hasGoalParam && !profileId && !result}>
        <summary>{pick(TEXT.exampleSummary)}</summary>
        <p className="muted">
          {rich('examplePickerNote')()}
        </p>
        <ExamplePaths nodes={graph?.nodes ?? []} loadedId={loadedExample?.id ?? null} onLoad={loadExample} />
      </details>
    </div>
  );
}
