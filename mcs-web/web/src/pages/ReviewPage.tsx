import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api, formatError } from '../api';
import { useI18n, useLabels } from '../i18n';
import { useProfileContext } from '../state';
import { useLearningData } from '../useLearningData';
import { ReviewQueue } from '../components/ReviewQueue';
import { ProgressBar } from '../components/ProgressBar';
import { StatusBadge } from '../components/StatusBadge';
import type { PlanResultView } from '../types';

/**
 * 回看面板：既作为「我的学习」的一个标签，也作为 /review 的独立页面内容。
 *
 * 两条路径，都在既有能力内：
 * 1. 队列回看：对「曾确认过」或「读过没懂」的节点记一次回看（写 view + context=review）。
 * 2. 按计划回看：复用规划器的 withReview，把回看事件插进路线里展示。
 * 没有间隔重复、没有到期日——M 与 E 里都没有这种模型，因此文案只说「待回看」。
 *
 * 中英双语（2026-10）：本页文案走下面这张成对表；受控词表（资源种类等）走 `useLabels()`，
 * 中文那份逐字不变。
 */
interface ReviewText {
  noProfilePrefix: string;
  externalModel: string;
  noProfileMid: string;
  myLearning: string;
  noProfileSuffix: string;
  currentProgress: string;
  loading: string;
  waitingTitle: string;
  waitingHint: string;
  readyTitle: string;
  readyHint: string;
  introducedBy: (title: string) => string;
  planReview: string;
  blockedTitle: string;
  blockedHint: string;
  missing: (titles: string) => string;
  /** 并列节点的分隔符：中文用顿号，英文用逗号。 */
  listSeparator: string;
  goConfirm: (title: string) => string;
  planTitle: (title: string) => string;
  planning: string;
  planNoticePrefix: string;
  planNoticeStrong: string;
  planNoticeSuffix: string;
  routesCount: (count: number) => string;
  noRoutes: string;
  eventsCount: (count: number) => string;
  costLabel: string;
  unknown: string;
  reviewEvent: string;
  pageTitle: string;
  pageLead: string;
}

const REVIEW_TEXT: { zh: ReviewText; en: ReviewText } = {
  zh: {
    noProfilePrefix: '还没有选择档案。回看记录写入 ',
    externalModel: '外部模型 E',
    noProfileMid: '；先到',
    myLearning: '我的学习',
    noProfileSuffix: '新建或选择一个档案。',
    currentProgress: '当前进度',
    loading: '加载中…',
    waitingTitle: '待回看',
    waitingHint: '队列来自你自己的记录：确认过可用的节点，以及标记为「还不懂」的节点。这里没有到期日与间隔算法，所以只列「可以再看一眼」，不排先后。',
    readyTitle: '现在可以新学的',
    readyHint: '这些节点的引入条件已全部确认可用。列表由已登记的行动契约派生，不预测学习效果。',
    introducedBy: (title) => `由「${title}」引入`,
    planReview: '按计划回看这条',
    blockedTitle: '还差什么',
    blockedHint: '这些节点的引入条件尚未全部满足。先确认缺失的背景，它们就会变成可学。',
    missing: (titles) => `还缺：${titles}`,
    listSeparator: '、',
    goConfirm: (title) => `去确认 ${title}`,
    planTitle: (title) => `按计划回看：${title}`,
    planning: '正在规划…',
    planNoticePrefix: '规划器把回看事件作为同一行动的',
    planNoticeStrong: '新事件实例',
    planNoticeSuffix: '插入路线：它不表示你已经回看过，也不改写公共本体。回看只含被追加事件的第一条路线，pareto 与入口条件未重算，因此不展示。',
    routesCount: (count) => `${count} 条路线（含回看事件）`,
    noRoutes: '当前声明背景下没有可行路线；先确认背景，或到学习路线里放宽事件界。',
    eventsCount: (count) => `${count} 个事件`,
    costLabel: '成本：',
    unknown: '未知',
    reviewEvent: '回看事件',
    pageTitle: '回看',
    pageLead: '回看队列来自你自己的记录：确认过可用的节点，以及你标记为「还不懂」的节点。这里没有到期日与间隔算法——本站的记录模型里没有这一项，所以只叫「待回看」。',
  },
  en: {
    noProfilePrefix: 'No profile is selected yet. Review records are written to ',
    externalModel: 'the external model E',
    noProfileMid: '; go to ',
    myLearning: 'My learning',
    noProfileSuffix: ' to create or choose a profile.',
    currentProgress: 'Current progress',
    loading: 'Loading…',
    waitingTitle: 'Waiting for review',
    waitingHint: 'The queue comes from your own records: nodes you have confirmed usable, and nodes you marked as “not understood yet”. There is no due date and no spacing algorithm here, so the list only says “worth another look” and does not order them.',
    readyTitle: 'Ready to learn now',
    readyHint: 'Every introduction condition for these nodes has been confirmed usable. The list is derived from the registered action contracts; it does not predict learning outcomes.',
    introducedBy: (title) => `Introduced by “${title}”`,
    planReview: 'Review this one by plan',
    blockedTitle: 'What is still missing',
    blockedHint: 'The introduction conditions for these nodes are not all satisfied yet. Confirm the missing background first and they become learnable.',
    missing: (titles) => `Missing: ${titles}`,
    listSeparator: ', ',
    goConfirm: (title) => `Confirm ${title}`,
    planTitle: (title) => `Review by plan: ${title}`,
    planning: 'Planning…',
    planNoticePrefix: 'The planner inserts the review event into the route as a ',
    planNoticeStrong: 'new event instance',
    planNoticeSuffix: ' of the same action: it does not mean you have reviewed it, and it does not rewrite the public ontology. The review covers only the first route containing the appended event; pareto and entry conditions are not recomputed, so they are not shown.',
    routesCount: (count) => `${count} route(s), including the review event`,
    noRoutes: 'No feasible route under the declared background; confirm the background first, or relax the event horizon on the learning route page.',
    eventsCount: (count) => `${count} events`,
    costLabel: 'Cost: ',
    unknown: 'unknown',
    reviewEvent: 'Review event',
    pageTitle: 'Review',
    pageLead: 'The review queue comes from your own records: nodes you have confirmed usable, and nodes you marked as “not understood yet”. There is no due date and no spacing algorithm — this site’s record model has no such thing, which is why it is only called “waiting for review”.',
  },
};

export function ReviewPanel() {
  const { profileId, profile } = useProfileContext();
  const { progress, graph, loading, error, reload } = useLearningData();
  const [planNode, setPlanNode] = useState<string | null>(null);
  const [plan, setPlan] = useState<PlanResultView | null>(null);
  const [planBusy, setPlanBusy] = useState(false);
  const [planError, setPlanError] = useState('');
  const { pick } = useI18n();
  const labels = useLabels();
  const text = pick(REVIEW_TEXT);

  async function planReview(node: string) {
    setPlanBusy(true);
    setPlanError('');
    setPlan(null);
    setPlanNode(node);
    try {
      const result = await api<PlanResultView>('/plans?sync=1', {
        method: 'POST',
        body: { goalId: node, profileId: profileId ?? undefined, horizon: 8, strategy: {}, review: { node } },
      });
      setPlan(result);
    } catch (reason) {
      setPlanError(formatError(reason));
    } finally {
      setPlanBusy(false);
    }
  }

  const titleOf = (nodeId: string) => graph?.nodes.find((node) => node.id === nodeId)?.title ?? nodeId;

  return (
    <>
      {error && <p className="error">{error}</p>}

      {!profileId && (
        <p className="notice">
          {text.noProfilePrefix}<strong>{text.externalModel}</strong>{text.noProfileMid}<Link to="/profile">{text.myLearning}</Link>{text.noProfileSuffix}
        </p>
      )}

      {profile && (
        <section className="card">
          <h2>{text.currentProgress}</h2>
          {progress ? <ProgressBar counts={progress.counts} /> : <p>{text.loading}</p>}
        </section>
      )}

      <section className="card">
        <h2>{text.waitingTitle}</h2>
        <p className="hint">
          {text.waitingHint}
        </p>
        {loading && <p>{text.loading}</p>}
        {!loading && progress && (
          <ReviewQueue items={progress.reviewQueue} profileId={profileId} onChanged={reload} />
        )}
      </section>

      {progress && progress.ready.length > 0 && (
        <section className="card">
          <h2>{text.readyTitle}</h2>
          <p className="hint">{text.readyHint}</p>
          <ul className="ready-list">
            {progress.ready.slice(0, 8).map((entry) => (
              <li key={entry.node}>
                <Link to={`/nodes/${encodeURIComponent(entry.node)}`}>{titleOf(entry.node)}</Link>
                <span className="muted">{text.introducedBy(entry.actionTitle)}</span>
                <button className="button small" disabled={planBusy} onClick={() => planReview(entry.node)}>{text.planReview}</button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {progress && progress.ready.length === 0 && progress.blocked.length > 0 && (
        <section className="card">
          <h2>{text.blockedTitle}</h2>
          <p className="hint">{text.blockedHint}</p>
          <ul className="ready-list">
            {progress.blocked.slice(0, 8).map((entry) => (
              <li key={entry.node}>
                <Link to={`/nodes/${encodeURIComponent(entry.node)}`}>{titleOf(entry.node)}</Link>
                <span className="muted">{text.missing(entry.missing.map(titleOf).join(text.listSeparator))}</span>
                <Link className="button small" to={`/nodes/${encodeURIComponent(entry.missing[0])}`}>{text.goConfirm(titleOf(entry.missing[0]))}</Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {(planBusy || plan || planError) && planNode && (
        <section className="card">
          <h2>{text.planTitle(titleOf(planNode))}</h2>
          {planBusy && <p>{text.planning}</p>}
          {planError && <p className="error">{planError}</p>}
          {plan && (
            <>
              <p className="notice">
                {text.planNoticePrefix}<strong>{text.planNoticeStrong}</strong>{text.planNoticeSuffix}
              </p>
              <div className="plan-status">
                <StatusBadge status={plan.status} />
                <span>{text.routesCount(plan.routes.length)}</span>
              </div>
              {plan.routes.length === 0 && <p className="muted">{text.noRoutes}</p>}
              {plan.routes.map((route) => (
                <article className="route-card" key={route.id}>
                  <header>
                    <h3>{route.id}</h3>
                    <span>{text.eventsCount(route.events.length)}</span>
                    <span>{text.costLabel}{route.cost.status === 'known' ? route.cost.vector?.reduce((sum, value) => sum + value, 0) : text.unknown}</span>
                  </header>
                  <ol className="event-timeline">
                    {(route.linearExtensions[0] ?? route.events.map((event) => event.id)).map((eventId) => {
                      const event = route.events.find((item) => item.id === eventId);
                      if (!event) return null;
                      return (
                        <li key={event.id} className={event.kind === 'review' ? 'review' : ''}>
                          <div className="event-head">
                            {event.kind === 'review'
                              ? <StatusBadge status="review" label={text.reviewEvent} />
                              : <StatusBadge status={event.actionId} label={event.actionId} />}
                            <Link to={`/nodes/${encodeURIComponent(event.focus.node)}`}>{titleOf(event.focus.node)}</Link>
                            <span className="muted">{labels.resourceLabel(event.focus.resource)}</span>
                          </div>
                        </li>
                      );
                    })}
                  </ol>
                </article>
              ))}
            </>
          )}
        </section>
      )}
    </>
  );
}

export function ReviewPage() {
  const { pick } = useI18n();
  const text = pick(REVIEW_TEXT);
  return (
    <div className="page">
      <div className="section-heading">
        <h1>{text.pageTitle}</h1>
        <p>
          {text.pageLead}
        </p>
      </div>
      <ReviewPanel />
    </div>
  );
}
