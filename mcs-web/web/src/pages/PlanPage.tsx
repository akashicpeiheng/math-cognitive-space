import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { api, formatError } from '../api';
import { useProfileContext } from '../state';
import { StatusBadge } from '../components/StatusBadge';
import { ExamplePaths } from '../components/ExamplePaths';
import { actionModeLabel, resourceLabel } from '../labels';
import { paceHorizon, preferenceSummary, readPreferences } from '../start-preferences';
import { planRoute, serializeRouteSearch } from '../route-replay';
import { buildReadingSteps, saveReadingRoute } from '../route-reading';
import type { ExamplePath } from '../example-paths';
import type { NodeSummary, PlanPackageView, PlanResultView } from '../types';

/** 复习路径下 withReview 会把 routes 折成单条、pareto 与入口条件不重算，UI 必须如实说明。 */
const REVIEW_LIMITATION = '复习结果只包含被追加复习事件的第一条路线；pareto 与入口条件未重算，因此这里不展示它们。';

/** 事件界的上限与 shared/contracts.mjs 的 normalizePlanRequest 保持一致（0–32）。 */
const MAX_HORIZON = 32;

interface GraphData {
  nodes: NodeSummary[];
  actions: Array<{ id: string; title: string; mode: string; inputs: Array<{ node: string; accepts: string[] }>; outputs: Array<{ node: string; provides: string[] }> }>;
}

export function PlanPage() {
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
  const paceDefault = paceHorizon(savedPreferences.pace);
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

  useEffect(() => {
    api<GraphData>('/ontology/graph').then(setGraph).catch((reason) => setError(formatError(reason)));
  }, []);

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
  }, [profileId]);

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
      catch { setError('策略 JSON 无法解析；未声明成本与次序时保持未知。'); return; }
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
    navigate(`/nodes/${encodeURIComponent(firstNode)}?route=${saved.id}&step=1`);
  }

  return (
    <div className="page">
      <div className="section-heading">
        <h1>学习路线</h1>
        <p>先选 AND/OR 方案与逐项来源，再合并策略次序并检查无环。结构可行不表示真实学习有效；没有成本模型时保持未知。</p>
      </div>

      {/* 三步主线：先确定目标，再核对背景，最后才比较路线；范例移到最后作为可选的起步方式。 */}
      <ol className="step-rail">
        <li className="active"><span>1</span>确定目标</li>
        <li><span>2</span>核对背景</li>
        <li><span>3</span>比较路线</li>
      </ol>

      <div className="card plan-form" ref={formRef}>
        <h2>① 确定目标</h2>
        {hasGoalParam && (
          <p className="chosen-goal">
            已选目标：<strong>{nodeById.get(goal)?.title ?? goal}</strong>
            <code>{goal}</code>
          </p>
        )}
        <label>目标节点
          <select value={goal} onChange={(event) => { setGoals([event.target.value]); setLoadedExample(null); }}>
            {(graph?.nodes ?? []).filter((node) => ['Claim', 'Concept', 'Construction', 'Method', 'Problem', 'Example'].includes(node.construct)).map((node) => (
              <option key={node.id} value={node.id}>
                {node.granularity === 'topic' ? '【线索】' : ''}{node.title}（{node.id}）
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
            目标下拉里有 {threadGoalCount} 条标着【线索】的话题级条目：它们是学习线索的名字（一节或一章的范围），
            可以当路线的里程碑，但<strong>不能</strong>被声明为已经会的背景——背景网格只列可独立认知的单元。
            这些条目在<Link to="/nodes?show=topics">数学对象的「话题」一档</Link>里能看全。
          </p>
        )}
        {goals.length > 1 && (
          <p className="notice">
            当前是范例的多目标规划：除下拉框里的「{nodeById.get(goal)?.title ?? goal}」之外，还要同时拿下
            {goals.slice(1).map((id) => nodeById.get(id)?.title ?? id).join('、')}，共 {goals.length} 个目标。
            <button className="link-button" onClick={clearExample}>只保留下拉框里的目标</button>
          </p>
        )}
        <div className="plan-actions">
          <button className="button primary" disabled={Boolean(jobId)} onClick={() => runPlan(false)}>开始规划</button>
          {jobId && <button className="button" onClick={cancel}>取消任务</button>}
          {/* withReview 会把路线折成单条并只针对一个节点；多目标时这条路径不适用，直接禁用并说明。 */}
          <button className="button ghost" disabled={Boolean(jobId) || goals.length > 1} title={goals.length > 1 ? '复习事件只针对单个节点，多目标规划下不可用' : undefined} onClick={() => runPlan(true)}>规划并加入复习事件</button>
        </div>
        <details className="plan-advanced">
          <summary>高级参数（默认即可，通常不需要改）</summary>
          <div className="plan-advanced-grid">
            <label>事件界 h（最多多少个学习事件）
              <input
                type="number"
                min={1}
                max={MAX_HORIZON}
                value={horizon}
                onChange={(event) => { setHorizon(Number(event.target.value)); setPaceApplied(false); }}
              />
            </label>
            <label>候选上限（搜索空间上限）
              <input type="number" min={100} max={1000000} value={maxCandidates} onChange={(event) => setMaxCandidates(Number(event.target.value))} />
            </label>
            <label>预算上限（可选）
              <input type="number" min={0} value={budgetMax} onChange={(event) => setBudgetMax(event.target.value)} placeholder="留空表示不比较成本" />
            </label>
            <label className="strategy-input">策略 JSON（可选成本与次序实例）
              <textarea rows={3} value={strategyText} onChange={(event) => setStrategyText(event.target.value)} placeholder="例如 {&quot;costs&quot;:{&quot;a-limit:d&quot;:2},&quot;enumerateAllDepths&quot;:false}" />
            </label>
          </div>
          <p className="muted">没有声明成本模型时，规划器不会静默假设一个成本；结构可行也不表示真实学习有效。事件界的上限 {MAX_HORIZON} 与服务端契约一致。</p>
          {/*
            偏好参与默认值这件事必须**写出来**（TODO A4-23）：
            不然「为什么这里是 3 而不是 8」无从判断。同时说明它只改默认值、不改算法，
            并给回去改偏好的入口。
          */}
          {paceApplied && paceDefault && (
            <p className="muted plan-pace-note" data-pace-source={savedPreferences.pace ?? undefined}>
              {paceDefault.why}
              依据是你在<a href="/start#prefs">开始学习页</a>选过的节奏
              {preferenceSummary(savedPreferences) ? `（${preferenceSummary(savedPreferences)}）` : ''}。
              它<strong>只改这个默认值</strong>：规划算法、本体与可达性判定都不变；改上面的输入即覆盖它。
            </p>
          )}
        </details>
      </div>

      <section className="card">
        <h2>② 核对背景（外部模型 E 的显式声明）</h2>
        <p className="hint">
          {profileId
            ? '已自动列出你确认过的背景。未选择的内容保持未指定；未指定不等于已经掌握，也不等于没有。选择“未知”会作为显式入口条件进入路线。'
            : '当前没有选择档案，因此这里只使用手动声明。未指定不等于已经掌握，也不等于没有。'}
        </p>
        {profileKnown.size > 0 && (
          <p className="notice">来自当前档案的确认：{[...profileKnown].map((id) => nodeById.get(id)?.title ?? id).join('、')}</p>
        )}
        {loadedExample && (
          <div className="example-loaded-entries">
            <p className="notice">
              已载入范例「{loadedExample.ordinal} · {loadedExample.title}」，它的 {loadedExample.entries.length} 项起点按<strong>示范假设</strong>（条件性）进入本次规划——
              它们不代表你已掌握，也不会写进你的档案；规划结果只是「如果这些已经会了，这条路会怎么走」。
              其中 {declaredNotInGrid.length} 项由前几程的行动产出，因此<strong>不</strong>出现在下面的网格里（网格只列没有任何行动能产出的背景节点）——
              它们在这里列全，避免出现「背景是空的却规划出了路线」这种误导。
              <button className="link-button" onClick={clearExample}>清除范例入口</button>
            </p>
            <details className="example-entry-list">
              <summary>查看这 {loadedExample.entries.length} 项起点</summary>
              <ul>
                {loadedExample.entries.map((id) => (
                  <li key={id}>
                    <Link to={`/nodes/${encodeURIComponent(id)}`}>{nodeById.get(id)?.title ?? id}</Link>
                    {threadBackgroundOmitted.includes(id)
                      ? <span className="muted">（话题级线索：不能作为背景声明）</span>
                      : !backgroundNodes.some((item) => item.id === id) && <span className="muted">（前几程的成果）</span>}
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
              })} /> {node?.title ?? id}<code>{id}</code></label>
              {entries[id] && (
                <select value={entries[id].kind} onChange={(event) => setEntries((current) => ({ ...current, [id]: { kind: event.target.value as 'confirmed' | 'assumption' | 'unknown' } }))}>
                  <option value="confirmed">已确认可用</option>
                  <option value="assumption">声明假设（条件性）</option>
                  <option value="unknown">未知入口</option>
                </select>
              )}
            </div>
          ))}
        </div>
        {/* 被过滤掉的话题级条目如实说明，不静默丢弃（「不参与前置计算」不等于「看不见」）。 */}
        {threadBackgroundOmitted.length > 0 && (
          <p className="muted">
            另有 {threadBackgroundOmitted.length} 条话题级线索没有列进网格（
            {threadBackgroundOmitted.map((id) => nodeById.get(id)?.title ?? id).join('、')}）：
            它们是学习线索的名字，不能被声明成「已经会的背景」。它们仍然可以当目标。
          </p>
        )}
      </section>

      {jobId && <p className="notice">规划任务 {jobId} 运行中（{jobStatus}）… 耗时搜索在工作线程执行。</p>}
      {error && <p className="error">{error}</p>}

      {result && (
        <>
          <section className="card plan-summary" ref={resultRef}>
            <h2>③ 比较路线</h2>
            <div className="plan-status">
              <StatusBadge status={result.status} />
              <span>{result.routes.length} 条候选 · 展示 {routes.length} 条</span>
              {!lastWasReview && <label className="checkbox"><input type="checkbox" checked={showAllRoutes} onChange={(event) => setShowAllRoutes(event.target.checked)} /> 显示全部候选（含未进入前三条的）</label>}
            </div>
            {lastWasReview && <p className="notice">{REVIEW_LIMITATION}</p>}
            <dl className="facts">
              <div><dt>目标</dt><dd>{result.goals.map((id) => nodeById.get(id)?.title ?? id).join('、')}（{result.goals.length} 个）</dd></div>
              <div><dt>搜索完整性</dt><dd>{result.search.complete ? '声明域内完整' : `未完成：${result.search.reasons.join('、')}`}</dd></div>
              <div><dt>最少事件数</dt><dd>{result.search.bounds.firstSolutionDepth ?? '—'}</dd></div>
            </dl>
            <details className="plan-advanced">
              <summary>搜索细节（诊断用）</summary>
              <dl className="facts compact">
                <div><dt>访问状态数</dt><dd>{result.search.bounds.visited}</dd></div>
                <div><dt>事件界 h</dt><dd>{result.search.bounds.horizon}</dd></div>
                <div><dt>候选上限</dt><dd>{result.search.bounds.maxCandidates}</dd></div>
                <div><dt>搜索域</dt><dd>{result.search.domain}</dd></div>
              </dl>
            </details>
            {result.entryConditions.length > 0 && (
              <div className="entry-conditions"><h3>入口条件（条件性）</h3><ul>{result.entryConditions.map((item) => <li key={item}>{nodeById.get(item)?.title ?? item} <code>{item}</code></li>)}</ul></div>
            )}
            {result.unknownEntries.length > 0 && (
              <div className="entry-conditions"><h3>未决入口</h3><ul>{result.unknownEntries.map((item) => <li key={item.node}>{item.question}</li>)}</ul></div>
            )}
            {result.familyRequired.length > 0 && (
              <div className="entry-conditions"><h3>路线族共同前提</h3><p>{result.familyScope.complete ? '声明域内路线已完整枚举。' : '未证明路线族完整枚举；这是可修订的搜索结论。'}</p><ul>{result.familyRequired.map((item) => <li key={item}>{nodeById.get(item)?.title ?? item}</li>)}</ul></div>
            )}
          </section>

          {result.routes.length === 0 && (
            <section className="card empty-state">
              <h2>当前条件下没有可行路线</h2>
              <p className="muted">三种原因要分开看，处理方式不同：</p>
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
                  <strong>执行失败</strong>：任务状态 {result.status}；若为错误，页面顶部会给出服务端返回的原因。
                </li>
              </ul>
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
                    <span>{route.events.length} 个事件</span>
                    <span>成本：{route.cost.status === 'known' ? route.cost.vector?.reduce((sum, value) => sum + value, 0) : '未知'}</span>
                    <span>证据：{route.effects.proofs} 证明 / {route.effects.certificates} 证书</span>
                  </header>
                  {/*
                    回放入口：把这条路线交给组建网络页，按事件顺序逐步扩张。
                    按钮放在头部而不是底部——它是这条路线的主要「看结构」动作，
                    埋在时间线下面会让人以为路线只能按列表读。
                  */}
                  <p className="route-replay-row">
                    {/* 主操作是开始读；回放是理解结构的次操作。 */}
                    <button className="button small primary" onClick={() => startReading(route)}>沿此路线阅读</button>
                    <Link className="button small" to={`/network?${serializeRouteSearch(replay)}`}>
                      看结构回放
                    </Link>
                    <span className="muted">
                      从 {replay.entry.length} 个起点出发，共 {replay.steps.length} 步可调；每步都能暂停、单步与回退。
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
                              ? <StatusBadge status="review" label="复习事件" />
                              : action
                                ? <StatusBadge status={action.mode} label={actionModeLabel(action.mode)} title={action.mode} />
                                : <StatusBadge status={event.actionId} />}
                            <strong>{action?.title ?? event.actionId}</strong>
                            <code>{event.id}</code>
                          </div>
                          <p>关注：<Link to={`/nodes/${encodeURIComponent(event.focus.node)}`}>{nodeById.get(event.focus.node)?.title ?? event.focus.node}</Link>（{resourceLabel(event.focus.resource)}）</p>
                          <ul className="sources">
                            {Object.entries(event.sources).map(([input, source]) => (
                              <li key={input}>
                                <code>{input}</code>
                                {source.kind === 'event' ? ` ← 事件 ${source.eventId}` : source.kind === 'background' ? ` ← 背景 ${source.entryId}（${source.confirmed ? '已确认' : '未确认'}）` : ` ← 未决入口：${source.question}`}
                              </li>
                            ))}
                          </ul>
                        </li>
                      );
                    })}
                  </ol>
                  <details><summary>结果包附加数据</summary><pre>{JSON.stringify({ goalSources: route.goalSources, order: route.order, witness: route.witness, cost: route.cost }, null, 2)}</pre></details>
                </article>
              );
            })}
            {!showAllRoutes && routes.length > 3 && (
              <p className="muted">
                只比较前三条候选。
                <button className="link-button" onClick={() => setShowAllRoutes(true)}>展开其余 {routes.length - 3} 条</button>
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
        <summary>没有头绪？用现成范例试试</summary>
        <p className="muted">
          范例会写入一组目标、事件界与<strong>示范假设</strong>，然后立刻规划一次。
          示范假设不写进你的档案，规划结果只说明「如果这些已经会了，这条路会怎么走」。
        </p>
        <ExamplePaths nodes={graph?.nodes ?? []} loadedId={loadedExample?.id ?? null} onLoad={loadExample} />
      </details>
    </div>
  );
}
