import { useMasterMode } from '../master-mode';
import { MasterContent } from './MasterView';
import { useId, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useI18n } from '../i18n';
import { useLabels } from '../i18n/useLabels';
import { directionPresets } from '../direction-presets';
import { buildGoalCards } from '../start-direction';
import { FieldGuideExplorer } from './FieldGuide';
import { moveLearningStep, LEARNING_PREVIEW_STEPS } from '../../../shared/learning-plan.mjs';
import { useLearningPlan, type LearningPlanController } from '../useLearningPlan';
import type { LearningData } from '../useLearningData';
import { Markdown } from './Markdown';
import { saveReadingRoute } from '../route-reading';
import type { LearningPlanPreview } from '../../../shared/learning-plan.mjs';

/** The ontology deliberately retains untranslated originals; the guide marks that fallback too. */
function usePendingText() {
  const { locale, t } = useI18n();
  return (text: string) => locale === 'en' && /[\u3400-\u9fff]/u.test(text)
    ? { className: 'i18n-pending', title: t('i18n.pendingTitle') } : {};
}

const COPY = {
  heading: { zh: '找到你接下来想学的方向', en: 'Find what you want to learn next' },
  lead: { zh: '从兴趣或已有目标出发，先看清要解决的问题，再确定第一步。', en: 'Start with an interest or a goal, see the question it answers, then choose your first step.' },
  fields: { zh: '从感兴趣的次级学科探索', en: 'Explore fields that interest me' },
  goals: { zh: '我已有学习目标', en: 'I already have a learning goal' },
  chooseFields: { zh: '哪些学科让你想继续追问？', en: 'Which fields make you want to ask more?' },
  fieldsHint: { zh: '可以多选；先选的兴趣优先。同一目标中的并行步骤也会参考这个顺序。', en: 'Choose several if you like. Earlier choices have priority, including among parallel steps within a goal.' },
  search: { zh: '搜索想弄懂的对象或问题', en: 'Search for an object or question to understand' },
  suggested: { zh: '已有的学习目标', en: 'Existing learning goals' },
  previous: { zh: '你已声明的其他方向', en: 'Other directions you have already declared' },
  question: { zh: '想解决的问题', en: 'The question to answer' },
  outcome: { zh: '学后能做什么', en: 'What you can do afterwards' },
  choose: { zh: '把它设为近期主目标', en: 'Choose as my primary goal' },
  active: { zh: '当前主目标', en: 'Current primary goal' },
  noMatch: { zh: '当前没有匹配的目标。可以换一个关键词，或从已有目标继续探索。', en: 'No matching goals yet. Try another term or explore the existing goals.' },
  moreMatches: { zh: '这里只显示前 8 个匹配目标；可缩小关键词范围，或查看全部搜索结果。', en: 'Only the first 8 matches are shown. Refine the term or view all search results.' },
  allMatches: { zh: '查看全部结果', en: 'View all results' },
  noCoverage: { zh: '这一兴趣暂未覆盖在已有目标中。可查看该学科的节点，再选择具体对象。', en: 'Existing goals do not cover this interest yet. Browse its nodes and choose a specific object.' },
  plan: { zh: '你的学习方案', en: 'Your learning plan' },
  first: { zh: '当前第一步', en: 'Your first step now' },
  milestone: { zh: '近期里程碑', en: 'Near-term milestone' },
  roadmap: { zh: '全局方向与依赖骨架', en: 'Overall direction and dependencies' },
  outlineHint: { zh: '连线表示这份建议骨架中的前置关系；近期里程碑会随已确认知识继续推进。点击节点可查看内容。', en: 'Arrows show prerequisites in this suggested outline. The milestone advances as you confirm knowledge. Open any node to inspect its content.' },
  pending: { zh: '建议骨架中的待学节点', en: 'Pending nodes in the suggested outline' },
  upcoming: { zh: '接下来的步骤', en: 'Upcoming steps' },
  conditional: { zh: '后续步骤以完成前面的学习并确认知识可用为条件。', en: 'Later steps assume you complete the earlier work and confirm the knowledge is usable.' },
  background: { zh: '先核对背景知识', en: 'Check your background first' },
  backgroundHint: { zh: '先判断这些知识是否已经可用；尚未学过的先补上，再进入内容节点。', en: 'Check whether you can already use this knowledge. Fill any gaps before entering the content steps.' },
  read: { zh: '进入这一步', en: 'Open this step' },
  ready: { zh: '现在可开始', en: 'Ready now' },
  later: { zh: '完成前置后可开始', en: 'After prerequisites' },
  main: { zh: '主线', en: 'Primary path' },
  branch: { zh: '兴趣支线', en: 'Interest branch' },
  earlier: { zh: '提前', en: 'Earlier' },
  laterMove: { zh: '延后', en: 'Later' },
  next: { zh: '选为下一步', en: 'Choose next' },
  reset: { zh: '恢复推荐顺序', en: 'Restore recommended order' },
  dependency: { zh: '这个调整需要先完成：', en: 'This move first requires: ' },
  stale: { zh: '之前调整的顺序已与当前方案不匹配，现展示重新计算的推荐顺序。', en: 'Your previous order no longer matches this plan. The recalculated recommendation is shown.' },
  why: { zh: '为什么这样排', en: 'Why this order' },
  basis: { zh: '先满足依赖；可并行时按手动安排、主线、兴趣顺序、学科连续性、学习方式与主线解锁数选择。', en: 'Dependencies come first. Parallel steps follow your valid edits, primary path, interests, field continuity, study style and primary-path unlocks.' },
  branchHint: { zh: '支线由你主动加入，默认接在近期里程碑之后。共享前置只学一次；可并行的步骤可以提前。', en: 'Add branches yourself. They follow the near-term milestone by default, share prerequisites, and can move earlier when dependencies allow.' },
  addBranch: { zh: '加入支线', en: 'Add branch' },
  removeBranch: { zh: '移出支线', en: 'Remove branch' },
  shared: { zh: '共享前置', en: 'Shared prerequisites' },
  extra: { zh: '骨架中的额外节点', en: 'Additional outline nodes' },
  branchDeferred: { zh: '已保存的支线将在主线近期阶段之后继续展开。', en: 'Saved branches will unfold after the current primary segment.' },
  options: { zh: '可选：学习方式与节奏', en: 'Optional: style and pace' },
  style: { zh: '更想怎样理解', en: 'How would you like to understand it?' },
  pace: { zh: '一次想走多远', en: 'How far in one sitting?' },
  exploreAgain: { zh: '重新探索方向', en: 'Explore directions again' },
  computing: { zh: '正在核对依赖并安排近期步骤…', en: 'Checking dependencies and arranging your next steps…' },
  saved: { zh: '方案随当前学习档案保存，可导出并在其他设备继续。', en: 'Your plan is saved with this profile for export and continuation on other devices.' },
  unsaved: { zh: '更改尚未保存。重新载入档案后可查看服务端方案并重试。', en: 'Changes have not been saved. Reload the profile to see the server plan and try again.' },
  guest: { zh: '方案暂存在当前浏览器；选择学习档案后可保存并继续。', en: 'This draft stays in this browser. Select a learning profile to save and continue.' },
  saveGuest: { zh: '采用浏览器中的方案', en: 'Use the browser draft' },
  complete: { zh: '这个目标已确认可用，可以选择新的目标或回看。', en: 'This goal is already confirmed usable. Choose another goal or review it.' },
  blocked: { zh: '当前登记下还没有贯通的近期方案。先处理下列背景或依赖，再重新规划。', en: 'The registered data does not yet yield a connected near-term plan. Resolve the background or dependencies below, then replan.' },
  unknown: { zh: '有界搜索尚未确定可行方案；可以先处理背景，或选择更近的目标。', en: 'Bounded search has not settled a feasible plan. Check the background or choose a nearer goal.' },
  unresolved: { zh: '仍待核对的依赖', en: 'Dependencies still to resolve' },
  searchLimit: { zh: '当前为有界规划结果，后续阶段将继续展开。', en: 'This is a bounded plan. Later stages will unfold as you continue.' },
  reload: { zh: '重新载入档案', en: 'Reload profile' },
};

function LearningRoadmap({ preview, title }: { preview: LearningPlanPreview; title: (id: string) => string }) {
  const { pick, hrefFor } = useI18n();
  const pendingText = usePendingText();
  const marker = useId();
  const levels = [...new Set(preview.roadmap.map(item => item.level))].sort((a, b) => a - b);
  const columns = Math.max(1, ...levels.map(level => preview.roadmap.filter(item => item.level === level).length));
  const positions = new Map(preview.roadmap.map(item => {
    const peers = preview.roadmap.filter(other => other.level === item.level);
    return [item.node, { x: 20 + (peers.findIndex(other => other.node === item.node) + (columns - peers.length) / 2) * 250, y: 20 + levels.indexOf(item.level) * 114 }];
  }));
  const lines = (value: string) => {
    const chunks: string[] = []; let current = ''; let size = 0;
    for (const char of value) {
      const weight = /[\u2e80-\u9fff]/u.test(char) ? 2 : 1;
      if (size + weight > 29) { chunks.push(current); current = ''; size = 0; }
      current += char; size += weight;
    }
    if (current) chunks.push(current);
    return chunks.slice(0, 2).map((chunk, index) => chunks.length > 2 && index === 1 ? chunk.slice(0, -1) + '…' : chunk);
  };
  return <>
    <p className="muted">{pick(COPY.outlineHint)}</p>
    <div className="learning-roadmap-canvas">
      <svg width={Math.max(280, columns * 250 + 20)} height={Math.max(114, levels.length * 114 + 20)} role="group" aria-label={pick(COPY.roadmap)}>
        <defs><marker id={marker} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M 0 0 L 10 5 L 0 10 z" fill="currentColor" /></marker></defs>
        {preview.roadmap.flatMap(item => item.requires.map(required => {
          const from = positions.get(required); const to = positions.get(item.node);
          return from && to ? <path className="learning-roadmap-edge" key={`${required}:${item.node}`} d={`M ${from.x + 110} ${from.y + 80} C ${from.x + 110} ${from.y + 99}, ${to.x + 110} ${to.y - 15}, ${to.x + 110} ${to.y}`} fill="none" markerEnd={`url(#${marker})`} /> : null;
        }))}
        {preview.roadmap.map(item => {
          const position = positions.get(item.node)!;
          const highlighted = item.node === preview.milestone || item.node === preview.primaryGoal;
          const pending = pendingText(title(item.node) + item.requires.map(title).join(' '));
          return <g key={item.node} transform={`translate(${position.x} ${position.y})`}><Link to={hrefFor(`/nodes/${encodeURIComponent(item.node)}`)} title={pending.title} className={`learning-roadmap-node${highlighted ? ' highlighted' : ''} ${pending.className ?? ''}`}>
            <title>{title(item.node)}{item.requires.length ? ` ← ${item.requires.map(title).join(', ')}` : ''}</title>
            <rect width="220" height="80" rx="10" />
            {lines(title(item.node)).map((line, index) => <text x="12" y={24 + index * 19} key={index}>{line}</text>)}
            {highlighted && <text className="learning-roadmap-tag" x="12" y="68">{pick(item.node === preview.milestone ? COPY.milestone : COPY.active)}</text>}
          </Link></g>;
        })}
      </svg>
    </div>
  </>;
}

const STYLE_OPTIONS = [
  { id: 'any', zh: '不限方式', en: 'No preference' }, { id: 'base', zh: '先理清定义与条件', en: 'Definitions and conditions' },
  { id: 'example', zh: '先看例子与反例', en: 'Examples and counterexamples' }, { id: 'apply', zh: '先用起来', en: 'Apply it first' },
] as const;
const PACE_OPTIONS = [
  { id: 'free', zh: '先不设节奏', en: 'No fixed pace' }, { id: 'small', zh: '一次一小步', en: 'One step at a time' },
  { id: 'block', zh: '一次走一段', en: 'A whole segment' }, { id: 'checkpoint', zh: '先做检查点', en: 'A checkpoint first' },
] as const;

const GOAL_COPY: Record<string, { question: { zh: string; en: string }; outcome: { zh: string; en: string } }> = {
  'limit:bridge': {
    question: { zh: '无限接近可以用距离描述，也可以用序列描述；为什么两条思路会汇合？', en: 'Closeness can be described with distances or sequences. Why do the two approaches meet?' },
    outcome: { zh: '在聚点条件下，把 ε–δ 定义与序列定义互相转换，并理解各自适合解决的问题。', en: 'Translate between epsilon–delta and sequential definitions under the accumulation-point condition, and see when each is useful.' },
  },
  'manifold:claim-max': {
    question: { zh: '局部坐标怎样拼成同一个结构？换一张相容的坐标卡，为什么仍在研究同一个对象？', en: 'How do local coordinates form one structure? Why does a compatible chart still describe the same object?' },
    outcome: { zh: '检查 Cᵏ 图册的相容性，并说明最大兼容扩张如何固定结构。', en: 'Check compatibility of Cᵏ atlases and explain how the maximal compatible extension fixes the structure.' },
  },
  'tensor:end-iso': {
    question: { zh: '张量为什么能表示线性算子？坐标计算背后有什么与基无关的结构？', en: 'Why can tensors represent linear operators? What basis-independent structure sits behind the coordinates?' },
    outcome: { zh: '在有限维条件下理解 V⊗V* 与 End(V) 的对应，并检查换基时保持的结构。', en: 'Understand the finite-dimensional correspondence between V⊗V* and End(V), and check what a change of basis preserves.' },
  },
  'group:cayley': {
    question: { zh: '怎样把抽象运算变成看得见的对称操作，让群既能计算也能比较？', en: 'How can an abstract operation become a concrete symmetry that you can compute and compare?' },
    outcome: { zh: '从群的运算构造置换表示，理解 Cayley 定理如何把抽象群连接到具体模型。', en: 'Construct a permutation representation from the group operation and use Cayley’s theorem to connect an abstract group to a concrete model.' },
  },
  'dg:generalized-stokes-theorem': {
    question: { zh: '区域内部的变化为什么能通过边界积分表达？怎样把熟悉的积分公式放到流形上？', en: 'Why can change inside a region be expressed by a boundary integral? How do familiar integral formulas extend to manifolds?' },
    outcome: { zh: '串起微分形式、定向与边界，并在给定条件下理解广义 Stokes 公式。', en: 'Connect differential forms, orientation and boundaries, and understand Stokes’ formula under its stated conditions.' },
  },
  'top:atlas': {
    question: { zh: '不用全局坐标，如何用局部坐标覆盖一个空间，并检查重叠处是否相容？', en: 'Without global coordinates, how can local charts cover a space and agree on their overlaps?' },
    outcome: { zh: '从拓扑空间和坐标卡出发，逐对检查过渡映射，理解图册的构造。', en: 'Start with topological spaces and charts, check transition maps pairwise, and understand the construction of an atlas.' },
  },
};

export function LearningPlanCard({ controller, learning }: { controller: LearningPlanController; learning: LearningData }) {
  const { pick, hrefFor, locale } = useI18n();
  const navigate = useNavigate();
  const pendingText = usePendingText();
  const { state, preview, loading, saving, error, update } = controller;
  const [moveError, setMoveError] = useState<string | null>(null);
  const title = (id: string) => learning.graph?.nodes.find(node => node.id === id)?.title ?? id;
  const ordered = preview?.order.map(key => preview.steps.find(step => step.key === key)!).filter(Boolean) ?? [];
  const first = ordered.find(step => step.ready);
  const startReading = () => {
    if (!preview || !first) return;
    const route = saveReadingRoute({
      routeId: `learning-${preview.graphHash}`, goal: state.primaryGoal ?? '',
      steps: ordered.map((step, index) => ({ index: index + 1, eventId: step.eventId, actionId: step.actionId,
        actionTitle: learning.graph?.actions.find(action => action.id === step.actionId)?.title ?? step.actionId,
        node: step.node, review: false })),
    });
    const index = ordered.findIndex(step => step.key === first.key) + 1;
    navigate(hrefFor(`/nodes/${encodeURIComponent(first.node)}?route=${route.id}&step=${index}`));
  };
  const move = (key: string, index: number) => {
    if (!preview) return;
    const result = moveLearningStep(preview.steps, preview.edges, preview.order, key, index);
    if (!result.valid) {
      setMoveError(pick(COPY.dependency) + result.blockers.map(([from]) => title(preview.steps.find(step => step.key === from)?.node ?? from)).join(locale === 'en' ? ', ' : '、'));
      return;
    }
    setMoveError(null);
    void update({ manualOrder: { ontologyVersion: preview.ontologyVersion, graphHash: preview.graphHash, steps: result.order } });
  };
  if (!state.primaryGoal) return null;
  return <section className="card learning-plan-card" id="learning-plan" data-goal={state.primaryGoal}>
    <div className="learning-plan-heading"><h2>{pick(COPY.plan)}</h2><span className="badge">{pick(COPY.active)}</span></div>
    <div {...pendingText(title(state.primaryGoal))}><Markdown>{`### ${title(state.primaryGoal)}`}</Markdown></div>
    {error && <p className={`error ${pendingText(error).className ?? ''}`} title={pendingText(error).title} role="alert">{error} <button className="link-button" onClick={() => void controller.reload()}>{pick(COPY.reload)}</button></p>}
    {loading && <p role="status">{pick(COPY.computing)}</p>}
    {preview?.primaryComplete && <p>{pick(COPY.complete)}</p>}
    {preview && <>
      <div className="learning-plan-summary">
        <div><span className="eyebrow">{pick(COPY.milestone)}</span><p {...pendingText(preview.milestone ? title(preview.milestone) : '')}>{preview.milestone ? title(preview.milestone) : '—'}</p></div>
        <div><span className="eyebrow">{pick(COPY.first)}</span><p {...pendingText(first ? title(first.node) : preview.background[0] ? title(preview.background[0]) : '')}>{first ? title(first.node) : preview.background[0] ? title(preview.background[0]) : '—'}</p>
          {first ? <button className="button primary" onClick={startReading}>{pick(COPY.read)}</button>
            : preview.background[0] && <Link className="button primary" to={hrefFor(`/nodes/${encodeURIComponent(preview.background[0])}`)}>{pick(COPY.read)}</Link>}
        </div>
      </div>
      {preview.background.length > 0 && <div className="learning-background"><h3>{pick(COPY.background)}</h3><p>{pick(COPY.backgroundHint)}</p>
        <ul>{preview.background.map(id => <li key={id}><Link {...pendingText(title(id))} to={hrefFor(`/nodes/${encodeURIComponent(id)}`)}>{title(id)}</Link></li>)}</ul>
      </div>}
      {['Blocked', 'Unknown'].includes(preview.status) && <p role="status">{pick(preview.status === 'Unknown' ? COPY.unknown : COPY.blocked)}</p>}
      {ordered.length > 0 && <>
        <div className="section-heading"><h3>{pick(COPY.upcoming)}</h3><button className="link-button" disabled={saving || !state.manualOrder} onClick={() => { setMoveError(null); void update({ manualOrder: null }); }}>{pick(COPY.reset)}</button></div>
        <p className="muted">{pick(COPY.conditional)}</p>
        <ol className="learning-step-list">{ordered.slice(0, state.pace === 'small' ? 3 : LEARNING_PREVIEW_STEPS).map((step, index) => <li key={step.key} data-step={step.node}>
          <div className="learning-step-content"><Link {...pendingText(title(step.node))} to={hrefFor(`/nodes/${encodeURIComponent(step.node)}`)}>{title(step.node)}</Link>
            <span className="badge">{pick(step.lane === 'main' ? COPY.main : COPY.branch)}</span><span className={`learning-readiness ${step.ready ? 'ready' : ''}`}>{pick(step.ready ? COPY.ready : COPY.later)}</span>
            <p><span {...pendingText([...step.requires, ...step.hardPrereqs].map(title).join(' '))} className={`muted ${pendingText([...step.requires, ...step.hardPrereqs].map(title).join(' ')).className ?? ''}`}>{[...new Set([...step.requires, ...step.hardPrereqs])].map(title).join(locale === 'en' ? ', ' : '、')}</span></p>
          </div>
          <div className="learning-step-actions"><button className="button small" disabled={saving || index === 0} onClick={() => move(step.key, index - 1)}>{pick(COPY.earlier)}</button>
            <button className="button small" disabled={saving || index === ordered.length - 1} onClick={() => move(step.key, index + 1)}>{pick(COPY.laterMove)}</button>
            <button className="link-button" disabled={saving || index === 0} onClick={() => move(step.key, 0)}>{pick(COPY.next)}</button></div>
        </li>)}</ol>
      </>}
      {moveError && <p className={`error ${pendingText(moveError).className ?? ''}`} title={pendingText(moveError).title} role="alert">{moveError}</p>}
      {preview.staleManual && <p role="status">{pick(COPY.stale)}</p>}
      {preview.deferredBranches.length > 0 && <p className="muted">{pick(COPY.branchDeferred)}</p>}
      {preview.truncated && <p className="muted">{pick(COPY.searchLimit)}</p>}
      <details className="learning-roadmap"><summary>{pick(COPY.roadmap)} · {preview.pending.length} {pick(COPY.pending)}</summary>
        <LearningRoadmap preview={preview} title={title} />
        {preview.unresolved.length > 0 && <p>{pick(COPY.unresolved)}: <span {...pendingText(preview.unresolved.map(title).join(' '))}>{preview.unresolved.map(title).join(locale === 'en' ? ', ' : '、')}</span></p>}
      </details>
      <details><summary>{pick(COPY.why)}</summary><p>{pick(COPY.basis)}</p></details>
    </>}
    <p className="muted learning-plan-storage">{pick(controller.profileId ? (controller.pendingChanges ? COPY.unsaved : COPY.saved) : COPY.guest)}</p>
  </section>;
}

export function LearningGuide({ learning, compact = false }: { learning: LearningData; compact?: boolean }) {
  const { isMaster } = useMasterMode();
  const controller = useLearningPlan(learning);
  const { pick, locale, hrefFor } = useI18n();
  const navigate = useNavigate();
  const labels = useLabels();
  const pendingText = usePendingText();
  const [params] = useSearchParams();
  const [entry, setEntry] = useState<'fields' | 'goals' | null>(() => !compact && params.has('field') ? 'fields' : null);
  const [exploring, setExploring] = useState(false);
  const [query, setQuery] = useState('');
  const { state, update, saving } = controller;
  const graph = learning.graph;
  const discipline = (id: string) => labels.tables.disciplines[id] ?? id;
  const cards = useMemo(() => graph ? buildGoalCards(graph, directionPresets(locale), { theta: learning.theta, interests: state.interests }) : [], [graph, learning.theta, locale, state.interests]);
  const searchMatches = useMemo(() => query.trim() ? (graph?.nodes ?? []).filter(node => (node.granularity ?? 'unit') === 'unit'
    && `${node.title} ${node.summary} ${node.id}`.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())) : [], [graph, query]);
  const searchNodes = searchMatches.slice(0, 8);
  const previousGoals = learning.directions.filter(direction => !cards.some(card => card.node === direction.nodeId))
    .map(direction => graph?.nodes.find(node => node.id === direction.nodeId && node.granularity !== 'topic')).filter(node => Boolean(node));
  const mainCard = cards.find(card => card.node === state.primaryGoal);
  const mainSet = new Set(mainCard?.skeleton.all ?? controller.preview?.pending ?? []);
  const choose = (id: string) => { setExploring(false); setEntry(null); void update({ primaryGoal: id, manualOrder: null, branches: state.branches.filter(branch => branch !== id) }); };
  const showExplore = !state.primaryGoal || exploring || entry === 'fields';
  return <div className={`learning-guide${compact ? ' learning-guide-compact' : ''}`}>
    {state.primaryGoal && !exploring && <div className="learning-guide-return"><span>{pick(COPY.active)}</span><button className="link-button" onClick={() => setExploring(true)}>{pick(COPY.exploreAgain)}</button></div>}
    {controller.profileId && controller.guestDraft && state.primaryGoal !== controller.guestDraft.primaryGoal
      && <button className="button" disabled={saving} onClick={() => void update({ ...controller.guestDraft!, manualOrder: null })}>{pick(COPY.saveGuest)}</button>}
    {showExplore && <section className="card learning-explore" id="prefs">
      <h2>{pick(COPY.heading)}</h2><p>{pick(COPY.lead)}</p>
      <div className="learning-entry-grid">{(['fields', 'goals'] as const).map(value => <button key={value} className={`learning-entry ${entry === value ? 'selected' : ''}`} aria-pressed={entry === value} onClick={() => { if (compact && value === 'fields') navigate(hrefFor('/start?field=' + encodeURIComponent(state.interests[0] ?? '分析'))); else setEntry(value); }}>{pick(COPY[value])}</button>)}</div>
      {entry === 'fields' && !compact && <FieldGuideExplorer learning={learning} interests={state.interests} saving={saving || learning.loading} onGoal={choose} onInterest={id => { void update({ interests: state.interests.includes(id) ? state.interests.filter(field => field !== id) : [...state.interests, id], manualOrder: null }); }} />}
      {entry === 'goals' && <>
        {previousGoals.length > 0 && <div className="learning-existing-goals"><h3>{pick(COPY.previous)}</h3>
          <div className="learning-interest-list">{previousGoals.map(node => node && <button key={node.id} className={`button ${pendingText(node.title).className ?? ''}`} title={pendingText(node.title).title} disabled={saving} data-existing-goal={node.id} onClick={() => choose(node.id)}>{node.title}</button>)}</div>
        </div>}
        {entry === 'goals' && <label className="learning-search">{pick(COPY.search)}<input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder={pick(COPY.search)} /></label>}
        <div className="learning-goal-grid">{query.trim() ? searchNodes.map(node => <article className="learning-goal-card" key={node.id}>
          <h3 {...pendingText(node.title)}>{node.title}</h3>{isMaster&&node.master?<MasterContent view={node.master} compact/>:<div {...pendingText(node.summary)}><Markdown>{node.summary}</Markdown></div>}<span className={`badge ${pendingText(discipline(node.discipline)).className ?? ''}`}>{discipline(node.discipline)}</span><button className="button primary" disabled={saving} onClick={() => choose(node.id)}>{pick(COPY.choose)}</button>
        </article>) : cards.map(card => {
          const node = graph?.nodes.find(item => item.id === card.node);
          return <article className="learning-goal-card" key={card.node} data-goal={card.node}>
            <h3>{card.title}</h3>{isMaster&&node?.master?<MasterContent view={node.master} compact/>:<><span className="eyebrow">{pick(COPY.question)}</span><Markdown>{GOAL_COPY[card.node] ? pick(GOAL_COPY[card.node].question) : node?.summary ?? ''}</Markdown>
            <span className="eyebrow">{pick(COPY.outcome)}</span><Markdown>{GOAL_COPY[card.node] ? pick(GOAL_COPY[card.node].outcome) : node?.title ?? ''}</Markdown></>}
            <div className="learning-goal-fields">{card.skeleton.disciplines.map(field => <span className="badge" key={field.id}>{discipline(field.id)}</span>)}</div>
            <button className="button primary" disabled={saving} onClick={() => choose(card.node)}>{pick(COPY.choose)}</button>
          </article>;
        })}</div>
        {query.trim() && searchNodes.length === 0 && <p>{pick(COPY.noMatch)}</p>}
        {searchMatches.length > 8 && <p>{pick(COPY.moreMatches)} <Link to={hrefFor(`/nodes?q=${encodeURIComponent(query.trim())}`)}>{pick(COPY.allMatches)}</Link></p>}
        {state.interests.filter(id => !cards.some(card => card.discipline === id || card.skeleton.disciplines.some(field => field.id === id))).map(id => <p key={id}>{discipline(id)}: {pick(COPY.noCoverage)} <Link to={hrefFor(`/nodes?discipline=${encodeURIComponent(id)}`)}>{discipline(id)}</Link></p>)}
      </>}
    </section>}
    {compact && <Link className="button learning-guide-back" to={hrefFor('/start?field=' + encodeURIComponent(state.interests[0] ?? '分析'))}>{pick({ zh: '返回学科导读', en: 'Back to field guide' })}</Link>}
    <LearningPlanCard controller={controller} learning={learning} />
    {state.primaryGoal && <section className="card learning-personalize">
      <h3>{pick(COPY.branch)}</h3><p className="muted">{pick(COPY.branchHint)}</p>
      <div className="learning-branch-list">{cards.filter(card => card.node !== state.primaryGoal).map(card => {
        const shared = card.skeleton.pending.filter(id => mainSet.has(id)).length;
        const added = card.skeleton.pending.filter(id => !mainSet.has(id)).length;
        const selected = state.branches.includes(card.node);
        return <div className="learning-branch" key={card.node}><strong>{card.title}</strong><span className="muted">{pick(COPY.shared)} {shared} · {pick(COPY.extra)} {added}</span>
          <button className="button small" disabled={saving || (!selected && state.branches.length >= 3)} onClick={() => void update({ branches: selected ? state.branches.filter(id => id !== card.node) : [...state.branches, card.node], manualOrder: null })}>{pick(selected ? COPY.removeBranch : COPY.addBranch)}</button></div>;
      })}</div>
      <details><summary>{pick(COPY.options)}</summary><div className="learning-option-grid">
        <label>{pick(COPY.style)}<select value={state.mood ?? 'any'} disabled={saving} onChange={event => void update({ mood: event.target.value as typeof state.mood, manualOrder: null })}>{STYLE_OPTIONS.map(option => <option key={option.id} value={option.id}>{option[locale]}</option>)}</select></label>
        <label>{pick(COPY.pace)}<select value={state.pace ?? 'free'} disabled={saving} onChange={event => void update({ pace: event.target.value as typeof state.pace })}>{PACE_OPTIONS.map(option => <option key={option.id} value={option.id}>{option[locale]}</option>)}</select></label>
      </div></details>
    </section>}
  </div>;
}
