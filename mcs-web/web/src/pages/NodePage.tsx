import { useEffect, useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { api, formatError, useApi } from '../api';
import { useProfileContext } from '../state';
import { Markdown } from '../components/Markdown';
import { FormalLoad } from '../components/FormalLoad';
import { StatusBadge } from '../components/StatusBadge';
import { LearnerActions } from '../components/LearnerActions';
import { NoteEditor } from '../components/NoteEditor';
import { SelfCheckTasks } from '../components/SelfCheckTasks';
import { recordReview } from '../review-actions';
import { readReadingProgress, readReadingRoute, readingNodeAt, saveReadingProgress } from '../route-reading';
import { useLearningData } from '../useLearningData';
import { useI18n } from '../i18n';
import { useLabels } from '../i18n/useLabels';
import { plainMathText } from '../labels';
import type { EvidenceRecord, LocalizationResultView, NodeDetailResponse, NoteView, ProfileDetailResponse } from '../types';

/** 成对文案：漏写一边编译不过，取用时走 `useI18n().pick`。 */
interface Pair { zh: string; en: string }

/**
 * 本页自己的界面文案（中英成对）。
 *
 * 与对象列表页同一条纪律（手册 §1）：通用壳层文案进 `i18n/messages.ts`，
 * 页面自己的长文案留在页面模块里成对写出，漏一边就编译不过。
 * `{name}` 占位符由 `fill()` 按当前语种填数——中英语序不同，不靠拼字符串硬凑。
 *
 * 注意**不翻译**的东西：`node.title`、正文、证据说明这类**本体文本**由服务端按
 * `?locale=en` 下发；`formalSpec`、`I_a`、`O_a`、`∂V` 是记号与字段名，原样保留。
 */
const TEXT = {
  loadingNode: { zh: '加载节点…', en: 'Loading the object…' },
  /* —— 路线阅读条 —— */
  routeStripAria: { zh: '路线阅读进度', en: 'Route reading progress' },
  reviewBadge: { zh: '回看', en: 'Review' },
  learningEventBadge: { zh: '学习事件', en: 'Learning event' },
  stepOf: { zh: '第 {index} / {total} 步', en: 'Step {index} / {total}' },
  notThisStep: {
    zh: '当前打开的不是这条路线的第 {index} 步（那一步是 {title}）。',
    en: 'What is open is not step {index} of this route (that step is {title}).',
  },
  prevStep: { zh: '← 上一步', en: '← Previous step' },
  firstStep: { zh: '已是第一步', en: 'This is the first step' },
  nextStep: { zh: '下一步：{title} →', en: 'Next: {title} →' },
  routeEnd: { zh: '这一步是终点 · 回到路线', en: 'This is the final step · back to the route' },
  exitRoute: { zh: '退出路线阅读', en: 'Leave route reading' },
  /* —— 回看提示条 —— */
  reviewStripAria: { zh: '回看提示', en: 'Review note' },
  reviewBody: {
    zh: '本次是回看：读完以后可以登记一次回看。它只增加回看次数，不表示理解或掌握，也不改写公共本体。',
    en: 'This is a review pass: once you have read it you can record one review. It only increases the review count; it does not mean understanding or mastery, and it does not rewrite the public ontology.',
  },
  reviewRecorded: { zh: '已记录本次回看。', en: 'This review has been recorded.' },
  reviewDone: { zh: '完成本次回看', en: 'Finish this review' },
  reviewDoneMessage: { zh: '已记录一次回看；它不表示理解或掌握。', en: 'One review recorded; it does not mean understanding or mastery.' },
  backToReview: { zh: '回到待回看列表', en: 'Back to the review list' },
  /* —— 页头 —— */
  evidenceLevel: { zh: '证据等级：{status}', en: 'Evidence level: {status}' },
  evidenceStatus: { zh: '证据状态：{status}', en: 'Evidence status: {status}' },
  certificateCheck: { zh: '证书检查：{status}', en: 'Certificate check: {status}' },
  formationStatusTitle: { zh: '形成检查状态', en: 'Formation check status' },
  version: { zh: '版本 {n}', en: 'Version {n}' },
  nodeId: { zh: '节点 ID', en: 'Node ID' },
  planWithThis: { zh: '以此为目标规划', en: 'Plan with this as the goal' },
  learnWithTutor: { zh: '用 DeepTutor 学习', en: 'Study with DeepTutor' },
  createFromThis: { zh: '以此为基础创建', en: 'Create from this' },
  checkFormal: { zh: '检查已有形式表达', en: 'Check the existing formal statement' },
  /* —— 本页目录 —— */
  tocAria: { zh: '本页内容', en: 'On this page' },
  tocTitle: { zh: '本页内容', en: 'On this page' },
  tocMotivation: { zh: '动机与生长链', en: 'Motivation and growth chain' },
  tocReading: { zh: '正文', en: 'Body' },
  tocConditions: { zh: '条件即反例', en: 'Conditions as counterexamples' },
  tocProof: { zh: '概括证明', en: 'Proof overview' },
  /* 「形式负载 / 形式表达 / 支持族」是中英共用的概念术语，取 `messages.ts` 的
     `concept.formalPayload` / `concept.formalStatement` / `concept.supportFamily`（单一来源），
     不在本页重复一份。 */
  tocRepresentations: { zh: '表征', en: 'Representations' },
  tocSelfCheck: { zh: '自检任务', en: 'Self-check tasks' },
  tocNotes: { zh: '个人笔记', en: 'Personal notes' },
  /* —— 形式表达 —— */
  /* 标题取 `t('concept.formalStatement')`（见上）。 */
  /* —— 正文各节 —— */
  motivationHeading: { zh: '动机与生长链', en: 'Motivation and growth chain' },
  motivationInternal: { zh: '学科内部', en: 'Within the discipline' },
  motivationExternal: { zh: '外部应用', en: 'External applications' },
  motivationAesthetic: { zh: '结构审美', en: 'Structural aesthetics' },
  conditionsHeading: { zh: '条件即反例：删掉会怎样', en: 'Conditions as counterexamples: what happens if you drop one' },
  thCondition: { zh: '条件', en: 'Condition' },
  thRemove: { zh: '删去或削弱', en: 'Removed or weakened' },
  thCounterexample: { zh: '反例', en: 'Counterexample' },
  thEffect: { zh: '结论如何崩溃', en: 'How the conclusion breaks' },
  proofHeading: { zh: '概括证明先行', en: 'Proof overview first' },
  formalHint: {
    zh: '核心定义与公式在此按数学排版显示；未登记中文名的字段保留原始键名。',
    en: 'Core definitions and formulas are typeset here as mathematics; fields with no registered display name keep their raw key.',
  },
  machineSpec: { zh: '机器表达（`formalSpec`）：', en: 'Machine expression (`formalSpec`): ' },
  machineRegistered: { zh: '已登记', en: 'Registered' },
  machineVersion: { zh: '（版本 {n}）', en: ' (version {n})' },
  machineRegisteredTail: {
    zh: '——它是自动关系发现的输入，与上面的形式负载分开保存。',
    en: ' — it is the input to automatic relation discovery and is stored separately from the formal payload above.',
  },
  machineAbsent: {
    zh: '未登记。没有登记不等于对象不能形式化，只表示本站还没写。',
    en: 'Not registered. Not registered does not mean the object cannot be formalised; it only means this site has not written it yet.',
  },
  formationCheck: { zh: '形成检查：', en: 'Formation check: ' },
  formationDetails: { zh: '展开逐项形成检查（{n} 项）', en: 'Show the item-by-item formation checks ({n})' },
  representationsHeading: { zh: '表征', en: 'Representations' },
  representationsHint: {
    zh: '同一对象的不同呈现方式；每条表征各自带登记状态，不互相代替。',
    en: 'Different ways of presenting the same object; each representation carries its own registration status and none replaces another.',
  },
  selfCheckHeading: { zh: '误区、自检与回看', en: 'Misconceptions, self-checks and review' },
  misconceptions: { zh: '常见误解', en: 'Common misconceptions' },
  selfCheckTasks: { zh: '自检任务', en: 'Self-check tasks' },
  selfCheckNoProfile: {
    zh: '选择或新建档案后可以写下作答；作答只写入你的档案 E，不会自动确认掌握。',
    en: 'Choose or create a profile and you can write your answers; answers are written only to your profile E and never confirm mastery automatically.',
  },
  criterion: { zh: '评分依据：', en: 'Graded by: ' },
  colon: { zh: '：', en: ': ' },
  reviewQuestions: { zh: '保留的回看问题', en: 'Review questions kept' },
  notesHeading: { zh: '个人笔记（写入 E）', en: 'Personal notes (written to E)' },
  notesNoProfile: {
    zh: '先在顶部选择或新建档案。学习记录不会写入公共本体。',
    en: 'Choose or create a profile at the top first. Learning records are never written to the public ontology.',
  },
  finishedHeading: { zh: '读完了', en: 'Finished reading' },
  routeProgressHeading: { zh: '路线进度：第 {index} / {total} 步', en: 'Route progress: step {index} / {total}' },
  routeLastDone: { zh: '已完成最后一步 · 回到路线', en: 'Final step done · back to the route' },
  nextOptionsHeading: { zh: '可选下一步', en: 'Possible next steps' },
  nextOptionsHint: {
    zh: '这些节点由「以本节点为输入」的登记行动产出；先学哪一个由你决定，不是站点指定的顺序。',
    en: 'These objects are produced by registered actions that take this node as input; which one to learn first is your decision, not an order set by the site.',
  },
  relatedHeading: { zh: '相关概念', en: 'Related concepts' },
  footerHintLead: { zh: '想看完整的结构关系，可以打开', en: 'To see the full set of structural relations, open the ' },
  footerHintMid: { zh: '，或为这个节点', en: ', or ' },
  footerHintTail: { zh: '。', en: ' for this node.' },
  planRoute: { zh: '规划一条路线', en: 'plan a route' },
  /* —— 侧栏 —— */
  evidenceHeading: { zh: '证据与检查', en: 'Evidence and checks' },
  noEvidence: { zh: '没有登记证据。未登记不等于命题为假。', en: 'No evidence registered. Not registered does not mean the claim is false.' },
  openAssumptions: { zh: '开放假设：', en: 'Open assumptions: ' },
  stillMissing: { zh: '仍缺：', en: 'Still missing: ' },
  replayCertificate: { zh: '重放证书', en: 'Replay the certificate' },
  replayResult: { zh: '重放：{status}', en: 'Replay: {status}' },
  provenanceHeading: { zh: '来源', en: 'Provenance' },
  supportDetails: { zh: '展开支持族（{n} 项）', en: 'Show the support family ({n})' },
  emptySupport: { zh: '∅（已查明空支持）', en: '∅ (verified empty support)' },
  minimalSupport: { zh: '（极小）', en: ' (minimal)' },
  actionsHeading: { zh: '公开行动', en: 'Public actions' },
  noActions: { zh: '没有产出该节点的登记行动。', en: 'No registered action produces this node.' },
  inputsLabel: { zh: 'I_a（AND）', en: 'I_a (AND)' },
  outputsLabel: { zh: 'O_a（OR 候选）', en: 'O_a (OR candidates)' },
  relationsHeading: { zh: '关系', en: 'Relations' },
  noRelations: { zh: '没有登记关系。', en: 'No registered relations.' },
  claimsHeading: { zh: '关联断言', en: 'Related claims' },
  claimItem: { zh: '{title}（{status}）', en: '{title} ({status})' },
  patternsHeading: { zh: '相关误区模式', en: 'Related misconception patterns' },
  boundaryHeading: { zh: '节点边界', en: 'Node boundary' },
  boundaryHintLead: { zh: '该节点自身的适用边界（', en: 'The boundary within which this node itself applies (' },
  boundaryHintTail: { zh: '），与局部化算子输出的边界 ∂V 不同。', en: '), which is not the boundary ∂V produced by a localisation operator.' },
  notesOnNode: { zh: '该节点的笔记', en: 'Notes on this object' },
  replayRunning: { zh: '正在重放 {id}…', en: 'Replaying {id}…' },
  replayFinished: { zh: '重放结束：{status}', en: 'Replay finished: {status}' },
} satisfies Record<string, Pair>;

/** 把 `{name}` 占位符换成实际数字或文字；未登记的键原样保留，不静默变成空白。 */
function fill(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) => (key in values ? String(values[key]) : match));
}

export function NodePage() {
  const { nodeId = '' } = useParams();
  /*
   * 深链里的节点 id 要做百分号解码，但它**不保证合法**：`/nodes/100%` 这种地址会让
   * `decodeURIComponent` 抛 `URIError`，而这里在渲染期，全站从前没有错误边界——
   * 结果是纯白页。现在解不开就按原文处理，让接口去回答「这个节点不存在」（404），
   * 用户看到的是正常页面 + 一句人话。
   */
  const decoded = useMemo(() => {
    try { return decodeURIComponent(nodeId); } catch { return nodeId; }
  }, [nodeId]);
  const detail = useApi<NodeDetailResponse>(`/ontology/nodes/${encodeURIComponent(decoded)}`, [decoded]);
  const { profileId, profile, refreshProfiles } = useProfileContext();
  const { graph, events, progress: learning, reload: reloadLearning } = useLearningData();
  const [replay, setReplay] = useState<Record<string, LocalizationResultView | { status: string; note?: string; obligations?: string[] }>>({});
  const [message, setMessage] = useState('');
  const [searchParams] = useSearchParams();
  const routeId = searchParams.get('route');
  /**
   * 界面文案与语种相关的几件事：取词、时间格式化、标注未译条目、拼带语种前缀的站内链接。
   * 站内跳转一律过 `hrefFor()`：`Link` 自己不会加 `/en` 前缀，漏一处就跳回中文站。
   */
  const { t, pick, fmtDate, isPending, hrefFor } = useI18n();
  /** 受控词表的显示名（构造、角色、关系、资源…）：跟着语种走，必须用 useLabels 才会重渲染。 */
  const labels = useLabels();
  /** 列表与从句的分隔符：中文用顿号/分号，英文用逗号/分号加空格。 */
  const listSep = pick({ zh: '、', en: ', ' });
  const clauseSep = pick({ zh: '；', en: '; ' });
  /** 路线阅读上下文（若有）：来自学习路线的「沿此路线阅读」。 */
  const readingRoute = useMemo(() => readReadingRoute(routeId), [routeId]);
  const stepParam = Number(searchParams.get('step') ?? '');
  const currentStep = readingRoute ? readingNodeAt(readingRoute, Number.isFinite(stepParam) && stepParam > 0 ? stepParam : readReadingProgress(routeId)) : null;
  const [reviewDone, setReviewDone] = useState(false);

  /**
   * 英文站上**回落到中文原文**的条目要如实标出来（手册 §1「未译标注」）。
   * 中文站上 `isPending()` 恒为 false，因此这里不产生任何输出差异。
   */
  const pendingClass = (text: string | null | undefined, base = ''): string | undefined => {
    if (!isPending(text)) return base || undefined;
    return base ? `${base} i18n-pending` : 'i18n-pending';
  };
  const pendingTitle = (text: string | null | undefined): string | undefined => (isPending(text) ? t('i18n.pendingTitle') : undefined);

  // 走到哪一步就记到哪一步：刷新后继续，而不是回到第一步。
  useEffect(() => {
    if (routeId && currentStep) saveReadingProgress(routeId, currentStep.index);
  }, [routeId, currentStep]);

  /**
   * 自由浏览时的「相关概念」与「可选下一步」。
   *
   * 上一版按节点 id 排序给「上一节点／下一节点」——那个顺序既不是先修关系也不是路线顺序，
   * 容易让人以为站点在暗示学习次序。这里改成两条有依据的线索：
   * 已登记的语义关系（相关概念），以及「以本节点为输入」的行动产出（可选下一步）。
   *
   * 注意：必须放在下面的提前返回之前——hook 数量在加载态与就绪态必须一致，
   * 否则 React 会抛 #310 把整页打白。
   */
  const related = useMemo(() => {
    if (!graph) return [] as Array<{ id: string; label: string }>;
    const seen = new Set<string>();
    const out: Array<{ id: string; label: string }> = [];
    for (const relation of graph.relations) {
      const other = relation.from === decoded ? relation.to : relation.to === decoded ? relation.from : null;
      if (!other || seen.has(other)) continue;
      seen.add(other);
      out.push({ id: other, label: labels.relationLabel(relation.kind) });
    }
    return out.slice(0, 6);
  }, [graph, decoded, labels]);

  const nextOptions = useMemo(() => {
    if (!graph) return [] as string[];
    const seen = new Set<string>();
    const out: string[] = [];
    for (const action of graph.actions) {
      if (!action.inputs.some((input) => input.node === decoded)) continue;
      for (const output of action.outputs) {
        if (output.node === decoded || seen.has(output.node)) continue;
        seen.add(output.node);
        out.push(output.node);
      }
    }
    return out.slice(0, 6);
  }, [graph, decoded]);

  useEffect(() => { setMessage(''); }, [decoded]);
  useEffect(() => { setReviewDone(false); }, [decoded]);

  if (detail.loading) return <div className="page"><p>{pick(TEXT.loadingNode)}</p></div>;
  if (detail.error) return <div className="page"><p className="error">{formatError(detail.error)}</p></div>;
  if (!detail.data) return null;
  const { node, formation, roles, actions, relations, evidence, support, claims, patterns, boundary } = detail.data;
  const teaching = node.teaching ?? {};
  const conditions = teaching.conditions ?? [];
  const selfCheck = teaching.selfCheck ?? [];
  const reviewQuestions = teaching.reviewQuestions ?? [];
  const misconceptions = teaching.commonMisconceptions ?? [];
  const representations = node.representations ?? [];

  /*
   * 机器表达层（`formalSpec`）与给人读的「形式表达」（`formalStatement`）是两件事：
   * 前者是自动关系发现的输入，后者是正文里的数学陈述。§7 的兼容约定是节点摘要**新增**
   * `hasFormalSpec` / `formalSpecVersion` 两个可选字段，旧客户端忽略即可——所以这里按
   * 可选字段读取，缺失时如实显示「未登记」，不假装已登记。
   */
  const machineSpec = node as NodeDetailResponse['node'] & { formalSpec?: unknown; hasFormalSpec?: boolean; formalSpecVersion?: string | null };
  const hasMachineSpec = Boolean(machineSpec.formalSpec) || machineSpec.hasFormalSpec === true;
  const machineSpecVersion = typeof machineSpec.formalSpecVersion === 'string' ? machineSpec.formalSpecVersion : null;

  // 分组依据只来自已登记数据；未登记 kind 归入「其他表征」，不丢弃任何条目。分组名按当前语种取。
  const representationGroups = representations.reduce<Record<string, typeof representations>>((groups, item) => {
    const key = labels.representationKindLabel(item.kind);
    (groups[key] ??= []).push(item);
    return groups;
  }, {});

  const titleOf = (id: string) => graph?.nodes.find((node) => node.id === id)?.title ?? id;

  function routeHref(step: number): string {
    const target = readingRoute ? readingNodeAt(readingRoute, step) : null;
    if (!readingRoute || !target) return hrefFor(`/nodes/${encodeURIComponent(decoded)}`);
    return hrefFor(`/nodes/${encodeURIComponent(target.node)}?route=${readingRoute.id}&step=${target.index}`);
  }

  const isConfirmed = Boolean(learning?.knowledge.get(decoded)?.alreadyConfirmed);
  const isUnknown = Boolean(learning?.unknownNodes.has(decoded));
  const isRead = Boolean(learning?.readNodes.has(decoded));

  // 已登记的自检作答（按事件 id 去重后按时间排序）。
  const answerHistory = events
    .filter((event) => event.kind === 'answer' && typeof event.payload?.check_id === 'string' && String(event.payload.check_id).startsWith(`sc-${decoded.split(':')[1] ?? ''}`))
    .concat(events.filter((event) => event.kind === 'answer' && event.nodeId === decoded && typeof event.payload?.check_id === 'string'))
    .filter((event, position, list) => list.findIndex((item) => item.eventId === event.eventId) === position)
    .sort((a, b) => a.occurredAt.localeCompare(b.occurredAt));

  const learnerActions = (
    <LearnerActions
      nodeId={decoded}
      profileId={profileId}
      flags={{ isRead, isConfirmed, isUnknown, canWrite: Boolean(profileId) }}
      onChanged={async () => { await reloadLearning(); }}
    />
  );

  async function runReplay(record: EvidenceRecord) {
    setMessage(fill(pick(TEXT.replayRunning), { id: record.id }));
    try {
      const result = await api<{ status: string; note: string; obligations: string[] }>('/evidence/replay', { method: 'POST', body: { evidenceId: record.id } });
      setReplay((current) => ({ ...current, [record.id]: result }));
      setMessage(fill(pick(TEXT.replayFinished), { status: result.status }));
    } catch (error) {
      setMessage(formatError(error));
    }
  }

  return (
    <div className="page node-page">
      <nav className="breadcrumb"><Link to={hrefFor('/nodes')}>{t('nav.nodes')}</Link><span>/</span><span>{node.id}</span></nav>

      {/* 路线阅读条：按规划器给出的事件顺序走，重复的回看事件也保留在序列里。 */}
      {readingRoute && currentStep && (
        <section className="card route-strip" aria-label={pick(TEXT.routeStripAria)}>
          <div className="route-strip-head">
            <StatusBadge status={currentStep.review ? 'review' : 'known'} label={pick(currentStep.review ? TEXT.reviewBadge : TEXT.learningEventBadge)} />
            <strong>{fill(pick(TEXT.stepOf), { index: currentStep.index, total: readingRoute.steps.length })}</strong>
            <span className="muted">{currentStep.actionTitle}</span>
          </div>
          {currentStep.node !== decoded && (
            <p className="notice">{fill(pick(TEXT.notThisStep), { index: currentStep.index, title: titleOf(currentStep.node) })}</p>
          )}
          <div className="route-strip-actions">
            {currentStep.index > 1
              ? <Link className="button small" to={routeHref(currentStep.index - 1)}>{pick(TEXT.prevStep)}</Link>
              : <span className="button small" aria-disabled="true">{pick(TEXT.firstStep)}</span>}
            {currentStep.index < readingRoute.steps.length
              ? <Link className="button small primary" to={routeHref(currentStep.index + 1)}>{fill(pick(TEXT.nextStep), { title: titleOf(readingRoute.steps[currentStep.index].node) })}</Link>
              : <Link className="button small primary" to={hrefFor(`/plan?goal=${encodeURIComponent(readingRoute.goal)}`)}>{pick(TEXT.routeEnd)}</Link>}
            <Link className="link-button" to={hrefFor(`/nodes/${encodeURIComponent(decoded)}`)}>{pick(TEXT.exitRoute)}</Link>
          </div>
        </section>
      )}

      {/* 从「开始回看」进来时的提示：完成动作写的是回看事件，不自动确认掌握。 */}
      {searchParams.get('from') === 'review' && (
        <section className="card review-strip" aria-label={pick(TEXT.reviewStripAria)}>
          <p>{pick(TEXT.reviewBody)}</p>
          <div className="card-actions">
            {reviewDone ? <span className="muted">{pick(TEXT.reviewRecorded)}</span> : (
              <button
                className="button small primary"
                disabled={!profileId}
                onClick={async () => {
                  if (!profileId) return;
                  try { await recordReview(profileId, decoded, 'node-review-strip'); setReviewDone(true); setMessage(pick(TEXT.reviewDoneMessage)); await reloadLearning(); }
                  catch (error) { setMessage(formatError(error)); }
                }}
              >{pick(TEXT.reviewDone)}</button>
            )}
            <Link className="button small" to={hrefFor('/profile?tab=review')}>{pick(TEXT.backToReview)}</Link>
          </div>
        </section>
      )}
      <header className="node-header card">
        <div className="node-header-top">
          <span className="construct" title={node.construct}>{labels.constructLabel(node.construct)}</span>
          {roles.roles.map((role) => <span className="role" key={role} title={role}>{labels.roleLabel(role)}</span>)}
          {teaching.evidenceStatus && <StatusBadge status={teaching.evidenceStatus} title={fill(pick(TEXT.evidenceLevel), { status: teaching.evidenceStatus })} />}
          <StatusBadge status={formation.status} title={pick(TEXT.formationStatusTitle)} />
        </div>
        {/* 标题与摘要按服务端下发的原文渲染（这里是 Markdown 之外的纯文本上下文，与列表卡的 plainMathText 处理不同）。 */}
        <h1 className={pendingClass(node.title)} title={pendingTitle(node.title)}>{node.title}</h1>
        <p className={pendingClass(node.summary, 'lede')} title={pendingTitle(node.summary)}>{node.summary}</p>
        <div className="node-meta">
          {/* 学科显示名走词表（键不翻译，`discipline` 本身仍是 `分析`）。 */}
          <span>{labels.tables.disciplines[node.discipline] ?? node.discipline}</span>
          <span>{fill(pick(TEXT.version), { n: node.version })}</span>
          <span>{pick(TEXT.nodeId)} <code>{node.id}</code></span>
        </div>
        <div className="card-actions">
          <Link className="button" to={hrefFor(`/plan?goal=${encodeURIComponent(node.id)}`)}>{pick(TEXT.planWithThis)}</Link>
          <Link className="button ghost" to={hrefFor(`/tutor?node=${encodeURIComponent(node.id)}`)}>{pick(TEXT.learnWithTutor)}</Link>
          {/*
            自动关联的两个入口。它们进的是**维护动作**：写在草稿里、不由这一页改动公共本体。
            「检查已有形式表达」对没有登记机器表达的节点同样可用——那一步会如实说明没有可检查的对象。
          */}
          <Link className="button ghost" to={hrefFor(`/authoring?node=${encodeURIComponent(node.id)}&mode=new`)}>{pick(TEXT.createFromThis)}</Link>
          <Link className="button ghost" to={hrefFor(`/authoring?node=${encodeURIComponent(node.id)}&mode=check`)}>{pick(TEXT.checkFormal)}</Link>
        </div>
        {learnerActions}
      </header>

      {message && <p className="notice">{message}</p>}

      <div className="node-layout">
        <article className="node-main">
          {/* 本页内容：长文页的轻量目录。锚点必须真的落到元素上，测试会核对。 */}
          <nav className="node-toc card" aria-label={pick(TEXT.tocAria)}>
            <span className="node-toc-title">{pick(TEXT.tocTitle)}</span>
            <ul>
              {node.motivation && <li><a href="#node-motivation">{pick(TEXT.tocMotivation)}</a></li>}
              {node.contentMarkdown && <li><a href="#node-reading">{pick(TEXT.tocReading)}</a></li>}
              {conditions.length > 0 && <li><a href="#node-conditions">{pick(TEXT.tocConditions)}</a></li>}
              {teaching.proofOverview && <li><a href="#node-proof">{pick(TEXT.tocProof)}</a></li>}
              <li><a href="#node-formal">{t('concept.formalPayload')}</a></li>
              {representations.length > 0 && <li><a href="#node-representations">{pick(TEXT.tocRepresentations)}</a></li>}
              {selfCheck.length > 0 && <li><a href="#node-selfcheck">{pick(TEXT.tocSelfCheck)}</a></li>}
              <li><a href="#node-notes">{pick(TEXT.tocNotes)}</a></li>
            </ul>
          </nav>
          {/*
            形式表达：把对象用形式语言写出来，放在正文之前。
            为什么排这么前：读一个数学对象，最先要知道的是「它到底是什么」——
            而定义的形式陈述比一段自然语言更不容易走样。只有挑出来的重要节点登记了这一项
            （见 data/formal-statements.mjs），其余节点不出这一块，不用一句「暂无」占位。
          */}
          {node.formalStatement && (
            <section className="card formal-statement" id="node-formal-statement">
              <div className="formal-statement-head">
                <h2>{t('concept.formalStatement')}</h2>
                <span className="formal-statement-label" title={fill(pick(TEXT.evidenceStatus), { status: node.formalStatement.label })}>
                  {node.formalStatement.label}
                </span>
              </div>
              {/*
                `tex` 里不含 $ 定界符（登记时就校验过）：这里补成**独占一行**的行间公式。
                必须带换行与空行——`$$x$$` 夹在文本里会被 micromark 当成行内公式，
                渲染出来是挤在一行的小字号，而不是行间大公式（实测过）。
              */}
              <div className="formal-statement-math">
                <Markdown>{`\n$$\n${node.formalStatement.tex}\n$$\n`}</Markdown>
              </div>
              {node.formalStatement.reading && (
                // 中文读法是纯文本上下文：R^n 这类记号走 plainMathText 换成上标，不留脱字符。
                <p className={pendingClass(node.formalStatement.reading, 'formal-statement-reading')} title={pendingTitle(node.formalStatement.reading)}>{plainMathText(node.formalStatement.reading)}</p>
              )}
              {(node.formalStatement.notation ?? []).length > 0 && (
                <dl className="formal-statement-notation">
                  {(node.formalStatement.notation ?? []).map((row) => (
                    <div key={row.symbol}>
                      <dt><code>{row.symbol}</code></dt>
                      <dd>{plainMathText(row.means)}</dd>
                    </div>
                  ))}
                </dl>
              )}
              {node.formalStatement.note && (
                // 补充说明是 Markdown 上下文：里面会有 **强调**、`代码` 与 $公式$。
                <div className={pendingClass(node.formalStatement.note, 'formal-statement-note')} title={pendingTitle(node.formalStatement.note)}>
                  <Markdown>{node.formalStatement.note}</Markdown>
                </div>
              )}
            </section>
          )}

          {node.motivation && (
            <section className="card" id="node-motivation">
              <h2>{pick(TEXT.motivationHeading)}</h2>
              <div className="motivation-grid">
                <div><h3>{pick(TEXT.motivationInternal)}</h3><ul>{(node.motivation.internal ?? []).map((item) => <li key={item}>{item}</li>)}</ul></div>
                <div><h3>{pick(TEXT.motivationExternal)}</h3><ul>{(node.motivation.external ?? []).map((item) => <li key={item}>{item}</li>)}</ul></div>
                <div><h3>{pick(TEXT.motivationAesthetic)}</h3><ul>{(node.motivation.aesthetic ?? []).map((item) => <li key={item}>{item}</li>)}</ul></div>
              </div>
              {(node.motivation.growthChain ?? []).length > 0 && (
                <ol className="growth-chain">{(node.motivation.growthChain ?? []).map((item) => <li key={item}>{item}</li>)}</ol>
              )}
            </section>
          )}

          {node.contentMarkdown && (
            <section className="card reading" id="node-reading">
              {/* 英文站上正文还没译时，这里如实说明读者看到的是中文原文（中文站不出现这行）。 */}
              {isPending(node.contentMarkdown) && <p className="i18n-pending-note">{t('i18n.pendingItem')}</p>}
              <Markdown>{node.contentMarkdown}</Markdown>
            </section>
          )}

          {conditions.length > 0 && (
            <section className="card" id="node-conditions">
              <h2>{pick(TEXT.conditionsHeading)}</h2>
              <table className="data-table">
                <thead><tr><th>{pick(TEXT.thCondition)}</th><th>{pick(TEXT.thRemove)}</th><th>{pick(TEXT.thCounterexample)}</th><th>{pick(TEXT.thEffect)}</th></tr></thead>
                <tbody>
                  {conditions.map((item) => (
                    <tr key={item.condition}><td>{item.condition}</td><td>{item.remove}</td><td>{item.counterexample}</td><td>{item.effect}</td></tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}

          {teaching.proofOverview && (
            <section className="card" id="node-proof">
              <h2>{pick(TEXT.proofHeading)}</h2>
              <p>{teaching.proofOverview}</p>
            </section>
          )}

          <section className="card" id="node-formal">
            <h2>{t('concept.formalPayload')}</h2>
            <p className="hint">{pick(TEXT.formalHint)}</p>
            <FormalLoad formal={node.formal} />
            {/* 机器表达层的入口：写的是草稿，落库要另走「自动关联」的最后一步。 */}
            <div className="node-machine-spec">
              <p className="muted">
                {pick(TEXT.machineSpec)}
                {hasMachineSpec
                  ? <>{pick(TEXT.machineRegistered)}{machineSpecVersion ? fill(pick(TEXT.machineVersion), { n: machineSpecVersion }) : ''}{pick(TEXT.machineRegisteredTail)}</>
                  : <>{pick(TEXT.machineAbsent)}</>}
              </p>
              <div className="card-actions">
                <Link className="button small ghost" to={hrefFor(`/authoring?node=${encodeURIComponent(node.id)}&mode=new`)}>{pick(TEXT.createFromThis)}</Link>
                <Link className="button small ghost" to={hrefFor(`/authoring?node=${encodeURIComponent(node.id)}&mode=check`)}>{pick(TEXT.checkFormal)}</Link>
              </div>
            </div>
            <p className="boundary-note">{pick(TEXT.formationCheck)}<StatusBadge status={formation.status} /> {formation.note}</p>
            {formation.checks.length > 0 && (
              <details className="formation-details">
                <summary>{fill(pick(TEXT.formationDetails), { n: formation.checks.length })}</summary>
                <ul className="formation-checks">
                  {formation.checks.map((check) => (
                    <li key={check.name}>
                      <StatusBadge status={check.status} />
                      <strong>{check.name}</strong>
                      <span className="muted">{check.detail}</span>
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </section>

          {representations.length > 0 && (
            <section className="card" id="node-representations">
              <h2>{pick(TEXT.representationsHeading)}</h2>
              <p className="hint">{pick(TEXT.representationsHint)}</p>
              {Object.entries(representationGroups).map(([group, items]) => (
                <div className="representation-group" key={group}>
                  <h3>{group}</h3>
                  <ul className="representation-list">
                    {items.map((item) => (
                      <li key={item.id}>
                        <div className="representation-head">
                          <strong className={pendingClass(item.title)} title={pendingTitle(item.title)}>{item.title}</strong>
                          <StatusBadge status={item.status} />
                          {item.medium && <span className="muted">{item.medium}</span>}
                        </div>
                        {item.note && <Markdown>{item.note}</Markdown>}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </section>
          )}

          {(misconceptions.length > 0 || reviewQuestions.length > 0 || selfCheck.length > 0) && (
            <section className="card" id="node-selfcheck">
              <h2>{pick(TEXT.selfCheckHeading)}</h2>
              {misconceptions.length > 0 && <><h3>{pick(TEXT.misconceptions)}</h3><ul>{misconceptions.map((item) => <li key={item}>{item}</li>)}</ul></>}
              {selfCheck.length > 0 && (
                profileId ? (
                  /* key 绑定「档案 + 节点」：切换任一项都会重挂载，草稿与提交上下文不会串到别的节点。 */
                  <SelfCheckTasks
                    key={`${profileId}:${decoded}`}
                    profileId={profileId}
                    nodeId={decoded}
                    items={selfCheck}
                    history={answerHistory}
                    onChanged={reloadLearning}
                    onNotice={setMessage}
                  />
                ) : (
                  <>
                    <h3>{pick(TEXT.selfCheckTasks)}</h3>
                    <p className="hint">{pick(TEXT.selfCheckNoProfile)}</p>
                    <ul className="self-check">
                      {selfCheck.map((item) => (
                        <li key={item.id}>
                          <strong>{item.competence}</strong>{pick(TEXT.colon)}{item.prompt}
                          <em>{pick(TEXT.criterion)}{item.criterion}</em>
                        </li>
                      ))}
                    </ul>
                  </>
                )
              )}
              {reviewQuestions.length > 0 && <><h3>{pick(TEXT.reviewQuestions)}</h3><ul>{reviewQuestions.map((item) => <li key={item}>{item}</li>)}</ul></>}
            </section>
          )}

          <section className="card" id="node-notes">
            <h2>{pick(TEXT.notesHeading)}</h2>
            {profileId ? (
              /* key 绑定「档案 + 节点」：未保存的草稿不会跟着切到下一个节点，也不会写到下一个节点名下。 */
              <NoteEditor
                key={`${profileId}:${decoded}`}
                profileId={profileId}
                nodeId={decoded}
                baseRevision={profile?.revision ?? null}
                onSaved={refreshProfiles}
                onNotice={setMessage}
              />
            ) : <p>{pick(TEXT.notesNoProfile)}</p>}
            <NodeNotes nodeId={decoded} />
          </section>

          <section className="card node-footer-actions">
            <h2>{pick(TEXT.finishedHeading)}</h2>
            {learnerActions}
            {/*
              这里不再按节点 id 给「上一节点／下一节点」：那个顺序既不是先修关系也不是路线顺序。
              沿路线阅读时给出路线的下一步；自由浏览时给出有依据的两条线索。
            */}
            {readingRoute && currentStep ? (
              <nav className="node-next" aria-label={pick(TEXT.nextOptionsHeading)}>
                <h3>{fill(pick(TEXT.routeProgressHeading), { index: currentStep.index, total: readingRoute.steps.length })}</h3>
                <div className="card-actions">
                  {currentStep.index > 1 && <Link className="button" to={routeHref(currentStep.index - 1)}>{pick(TEXT.prevStep)}</Link>}
                  {currentStep.index < readingRoute.steps.length
                    ? <Link className="button primary" to={routeHref(currentStep.index + 1)}>{fill(pick(TEXT.nextStep), { title: titleOf(readingRoute.steps[currentStep.index].node) })}</Link>
                    : <Link className="button primary" to={hrefFor(`/plan?goal=${encodeURIComponent(readingRoute.goal)}`)}>{pick(TEXT.routeLastDone)}</Link>}
                </div>
              </nav>
            ) : (
              <>
                {nextOptions.length > 0 && (
                  <nav className="node-next" aria-label={pick(TEXT.nextOptionsHeading)}>
                    <h3>{pick(TEXT.nextOptionsHeading)}</h3>
                    <p className="hint">{pick(TEXT.nextOptionsHint)}</p>
                    <ul className="link-list">
                      {nextOptions.map((id) => (
                        <li key={id}><Link className={pendingClass(titleOf(id))} title={pendingTitle(titleOf(id))} to={hrefFor(`/nodes/${encodeURIComponent(id)}`)}>{titleOf(id)}</Link></li>
                      ))}
                    </ul>
                  </nav>
                )}
                {related.length > 0 && (
                  <nav className="node-next" aria-label={pick(TEXT.relatedHeading)}>
                    <h3>{pick(TEXT.relatedHeading)}</h3>
                    <ul className="link-list">
                      {related.map((item) => (
                        <li key={item.id}>
                          <Link className={pendingClass(titleOf(item.id))} title={pendingTitle(titleOf(item.id))} to={hrefFor(`/nodes/${encodeURIComponent(item.id)}`)}>{titleOf(item.id)}</Link>
                          <span className="muted">{item.label}</span>
                        </li>
                      ))}
                    </ul>
                  </nav>
                )}
                <p className="hint">
                  {pick(TEXT.footerHintLead)}<Link to={hrefFor('/network')}>{t('nav.network')}</Link>{pick(TEXT.footerHintMid)}<Link to={hrefFor(`/plan?goal=${encodeURIComponent(node.id)}`)}>{pick(TEXT.planRoute)}</Link>{pick(TEXT.footerHintTail)}
                </p>
              </>
            )}
          </section>
        </article>

        <aside className="node-aside">
          <section className="card">
            <h2>{pick(TEXT.evidenceHeading)}</h2>
            {evidence.length === 0 && <p>{pick(TEXT.noEvidence)}</p>}
            <ul className="evidence-list">
              {evidence.map((record) => (
                <li key={record.id}>
                  <div className="evidence-head">
                    <strong className={pendingClass(record.title)} title={pendingTitle(record.title)}>{record.title}</strong>
                    <StatusBadge status={record.status} title={fill(pick(TEXT.evidenceLevel), { status: record.status })} />
                    {/* checkStatus 只描述「这一份有限证书」的检查结果；没有证书时显示它会把
                        REF/正文证明误标成红色「未运行」。 */}
                    {record.certificate && <StatusBadge status={record.checkStatus} title={fill(pick(TEXT.certificateCheck), { status: record.checkStatus })} />}
                  </div>
                  <p>{record.scope}</p>
                  {record.openAssumptions.length > 0 && <p className="assumptions">{pick(TEXT.openAssumptions)}{record.openAssumptions.join(clauseSep)}</p>}
                  {record.obligations.length > 0 && <p className="obligations">{pick(TEXT.stillMissing)}{record.obligations.join(clauseSep)}</p>}
                  {record.certificate && (
                    <button className="button small" onClick={() => runReplay(record)}>{pick(TEXT.replayCertificate)}</button>
                  )}
                  {replay[record.id] && <p className="replay-result">{fill(pick(TEXT.replayResult), { status: replay[record.id].status })}</p>}
                </li>
              ))}
            </ul>
          </section>

          {node.provenance?.sources?.length ? (
            <section className="card">
              <h2>{pick(TEXT.provenanceHeading)}</h2>
              <ul className="provenance-list">
                {node.provenance.sources.map((source) => <li key={source}>{source}</li>)}
              </ul>
              {node.provenance.note && <p className="muted">{node.provenance.note}</p>}
            </section>
          ) : null}

          <section className="card">
            <h2>{t('concept.supportFamily')}</h2>
            {/* 支持族是复核用的细节，默认折叠；证据状态与检查仍在上面直接可见。 */}
            <details className="support-details">
              <summary>{fill(pick(TEXT.supportDetails), { n: support.length })}</summary>
              {support.map((item) => (
                <div className="support-row" key={item.use}>
                  <StatusBadge status={item.status} />
                  <span className="support-use" title={item.use}>{labels.supportUseLabel(item.use)}</span>
                  {item.status === 'Known'
                    ? <span>{item.set?.join(listSep) || pick(TEXT.emptySupport)}{item.minimal ? pick(TEXT.minimalSupport) : ''}</span>
                    : <span>{item.reason}</span>}
                </div>
              ))}
            </details>
          </section>

          <section className="card">
            <h2>{pick(TEXT.actionsHeading)}</h2>
            {actions.length === 0 && <p>{pick(TEXT.noActions)}</p>}
            {actions.map((action) => (
              <div className="action-card" key={action.id}>
                <div><strong className={pendingClass(action.title)} title={pendingTitle(action.title)}>{action.title}</strong><StatusBadge status={action.witness.status} /></div>
                <p><span className="label">{pick(TEXT.inputsLabel)}</span> {action.inputs.map((input) => `${input.node} [${input.accepts.map(labels.resourceLabel).join('/')}]`).join(' + ')}</p>
                <p><span className="label">{pick(TEXT.outputsLabel)}</span> {action.outputs.map((output) => `${output.node} [${output.provides.map(labels.resourceLabel).join('/')}]`).join(' + ')}</p>
                {action.openAssumptions.length > 0 && <p className="assumptions">{pick(TEXT.openAssumptions)}{action.openAssumptions.join(clauseSep)}</p>}
              </div>
            ))}
          </section>

          <section className="card">
            <h2>{pick(TEXT.relationsHeading)}</h2>
            {relations.length === 0 && <p>{pick(TEXT.noRelations)}</p>}
            <ul className="relation-list">
              {relations.map((relation) => (
                <li key={relation.id}>
                  <StatusBadge status={relation.witness.status} />
                  <span title={relation.kind}>{labels.relationLabel(relation.kind)}</span>
                  <code>{relation.from} → {relation.to}</code>
                  {relation.scope && <p>{relation.scope}</p>}
                </li>
              ))}
            </ul>
          </section>

          {claims.length > 0 && (
            <section className="card">
              <h2>{pick(TEXT.claimsHeading)}</h2>
              {claims.map((claim) => (
                <div key={claim.id}>
                  <strong className={pendingClass(claim.statement)} title={pendingTitle(claim.statement)}>{claim.statement}</strong>
                  <p>{claim.evidence.map((item) => fill(pick(TEXT.claimItem), { title: item.title, status: item.status })).join(clauseSep)}</p>
                </div>
              ))}
            </section>
          )}

          {patterns.length > 0 && (
            <section className="card">
              <h2>{pick(TEXT.patternsHeading)}</h2>
              {patterns.map((pattern) => <Link key={pattern.id} className={pendingClass(pattern.title)} title={pendingTitle(pattern.title)} to={hrefFor(`/nodes/${encodeURIComponent(pattern.node)}`)}>{pattern.title}</Link>)}
            </section>
          )}

          {boundary.length > 0 && (
            <section className="card boundary">
              <h2>{pick(TEXT.boundaryHeading)}</h2>
              <p className="hint">{pick(TEXT.boundaryHintLead)}<code>formal.boundary</code>{pick(TEXT.boundaryHintTail)}</p>
              <ul>{boundary.map((item) => <li key={item}>{item}</li>)}</ul>
            </section>
          )}
        </aside>
      </div>
    </div>
  );
}

function NodeNotes({ nodeId }: { nodeId: string }) {
  const { profileId } = useProfileContext();
  const { pick, fmtDate } = useI18n();
  const notes = useApi<{ notes: NoteView[] }>(profileId ? `/profiles/${profileId}/notes?nodeId=${encodeURIComponent(nodeId)}` : null, [profileId, nodeId]);
  if (!profileId || !notes.data?.notes.length) return null;
  return (
    <div className="existing-notes">
      <h3>{pick(TEXT.notesOnNode)}</h3>
      {notes.data.notes.map((note) => (
        <article key={note.noteId}>
          {/* 时间按语种格式化（中文 `2026/10/5 20:11`，英文 `Oct 5, 2026, 8:11 PM`）。 */}
          <header><strong>{note.title}</strong><time>{fmtDate(note.updatedAt)}</time></header>
          <p>{note.body}</p>
        </article>
      ))}
    </div>
  );
}
