import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api, formatError } from '../api';
import { useProfileContext } from '../state';
import { useLearningData } from '../useLearningData';
import { ReviewQueue } from '../components/ReviewQueue';
import { ProgressBar } from '../components/ProgressBar';
import { StatusBadge } from '../components/StatusBadge';
import { resourceLabel } from '../labels';
import type { PlanResultView } from '../types';

/**
 * 回看面板：既作为「我的学习」的一个标签，也作为 /review 的独立页面内容。
 *
 * 两条路径，都在既有能力内：
 * 1. 队列回看：对「曾确认过」或「读过没懂」的节点记一次回看（写 view + context=review）。
 * 2. 按计划回看：复用规划器的 withReview，把回看事件插进路线里展示。
 * 没有间隔重复、没有到期日——M 与 E 里都没有这种模型，因此文案只说「待回看」。
 */
export function ReviewPanel() {
  const { profileId, profile } = useProfileContext();
  const { progress, graph, loading, error, reload } = useLearningData();
  const [planNode, setPlanNode] = useState<string | null>(null);
  const [plan, setPlan] = useState<PlanResultView | null>(null);
  const [planBusy, setPlanBusy] = useState(false);
  const [planError, setPlanError] = useState('');

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
          还没有选择档案。回看记录写入 <strong>外部模型 E</strong>；先到<Link to="/profile">我的学习</Link>新建或选择一个档案。
        </p>
      )}

      {profile && (
        <section className="card">
          <h2>当前进度</h2>
          {progress ? <ProgressBar counts={progress.counts} /> : <p>加载中…</p>}
        </section>
      )}

      <section className="card">
        <h2>待回看</h2>
        <p className="hint">
          队列来自你自己的记录：确认过可用的节点，以及标记为「还不懂」的节点。
          这里没有到期日与间隔算法，所以只列「可以再看一眼」，不排先后。
        </p>
        {loading && <p>加载中…</p>}
        {!loading && progress && (
          <ReviewQueue items={progress.reviewQueue} profileId={profileId} onChanged={reload} />
        )}
      </section>

      {progress && progress.ready.length > 0 && (
        <section className="card">
          <h2>现在可以新学的</h2>
          <p className="hint">这些节点的引入条件已全部确认可用。列表由已登记的行动契约派生，不预测学习效果。</p>
          <ul className="ready-list">
            {progress.ready.slice(0, 8).map((entry) => (
              <li key={entry.node}>
                <Link to={`/nodes/${encodeURIComponent(entry.node)}`}>{titleOf(entry.node)}</Link>
                <span className="muted">由「{entry.actionTitle}」引入</span>
                <button className="button small" disabled={planBusy} onClick={() => planReview(entry.node)}>按计划回看这条</button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {progress && progress.ready.length === 0 && progress.blocked.length > 0 && (
        <section className="card">
          <h2>还差什么</h2>
          <p className="hint">这些节点的引入条件尚未全部满足。先确认缺失的背景，它们就会变成可学。</p>
          <ul className="ready-list">
            {progress.blocked.slice(0, 8).map((entry) => (
              <li key={entry.node}>
                <Link to={`/nodes/${encodeURIComponent(entry.node)}`}>{titleOf(entry.node)}</Link>
                <span className="muted">还缺：{entry.missing.map(titleOf).join('、')}</span>
                <Link className="button small" to={`/nodes/${encodeURIComponent(entry.missing[0])}`}>去确认 {titleOf(entry.missing[0])}</Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {(planBusy || plan || planError) && planNode && (
        <section className="card">
          <h2>按计划回看：{titleOf(planNode)}</h2>
          {planBusy && <p>正在规划…</p>}
          {planError && <p className="error">{planError}</p>}
          {plan && (
            <>
              <p className="notice">
                规划器把回看事件作为同一行动的<strong>新事件实例</strong>插入路线：它不表示你已经回看过，
                也不改写公共本体。回看只含被追加事件的第一条路线，pareto 与入口条件未重算，因此不展示。
              </p>
              <div className="plan-status">
                <StatusBadge status={plan.status} />
                <span>{plan.routes.length} 条路线（含回看事件）</span>
              </div>
              {plan.routes.length === 0 && <p className="muted">当前声明背景下没有可行路线；先确认背景，或到学习路线里放宽事件界。</p>}
              {plan.routes.map((route) => (
                <article className="route-card" key={route.id}>
                  <header>
                    <h3>{route.id}</h3>
                    <span>{route.events.length} 个事件</span>
                    <span>成本：{route.cost.status === 'known' ? route.cost.vector?.reduce((sum, value) => sum + value, 0) : '未知'}</span>
                  </header>
                  <ol className="event-timeline">
                    {(route.linearExtensions[0] ?? route.events.map((event) => event.id)).map((eventId) => {
                      const event = route.events.find((item) => item.id === eventId);
                      if (!event) return null;
                      return (
                        <li key={event.id} className={event.kind === 'review' ? 'review' : ''}>
                          <div className="event-head">
                            {event.kind === 'review'
                              ? <StatusBadge status="review" label="回看事件" />
                              : <StatusBadge status={event.actionId} label={event.actionId} />}
                            <Link to={`/nodes/${encodeURIComponent(event.focus.node)}`}>{titleOf(event.focus.node)}</Link>
                            <span className="muted">{resourceLabel(event.focus.resource)}</span>
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
  return (
    <div className="page">
      <div className="section-heading">
        <h1>回看</h1>
        <p>
          回看队列来自你自己的记录：确认过可用的节点，以及你标记为「还不懂」的节点。
          这里没有到期日与间隔算法——本站的记录模型里没有这一项，所以只叫「待回看」。
        </p>
      </div>
      <ReviewPanel />
    </div>
  );
}
