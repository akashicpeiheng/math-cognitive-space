import { useState } from 'react';
import { Link } from 'react-router-dom';
import { formatError } from '../api';
import { recordReview } from '../review-actions';
import { StatusBadge } from './StatusBadge';
import type { ReviewItem } from '../learning';

/**
 * 待复习队列。
 *
 * 这里没有间隔重复算法：「M」与「E」都没有间隔/到期模型，所以本组件只做
 * 「曾确认过或读过没懂 → 建议再看一眼」＋「复习次数计数」，不承诺记忆效果。
 */
export function ReviewQueue({ items, profileId, onChanged }: { items: ReviewItem[]; profileId: string | null; onChanged: () => Promise<void> | void }) {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState('');

  async function markReviewed(item: ReviewItem) {
    if (!profileId) { setError('请先选择档案。'); return; }
    setBusy(item.node);
    setError('');
    try {
      await recordReview(profileId, item.node, 'review-queue');
      await onChanged();
    } catch (reason) {
      setError(formatError(reason));
    } finally {
      setBusy(null);
    }
  }

  if (items.length === 0) {
    return (
      <p className="muted">
        还没有可复习的内容。复习队列来自「你确认过」或「你标记为还没懂」的节点；
        先去读一个节点并标记「标记已读」或「我还不懂」，它就会出现在这里。
      </p>
    );
  }

  return (
    <>
      {error && <p className="error">{error}</p>}
      <ul className="review-list">
        {items.map((item) => (
          <li key={item.node} className={item.reason === 'read-not-understood' ? 'needs-work' : ''}>
            <div className="review-head">
              {item.reason === 'read-not-understood'
                ? <StatusBadge status="unknown" label="读过但没懂" title="你标记为尚未理解" />
                : <StatusBadge status="known" label="曾确认可用" title="你确认过它可用；复习用来回看" />}
              <Link to={`/nodes/${encodeURIComponent(item.node)}`}>{item.title}</Link>
            </div>
            <p className="muted">
              {item.lastViewedAt ? `上次阅读 ${new Date(item.lastViewedAt).toLocaleString('zh-CN')}` : '没有阅读时间记录（旧记录可能只有确认）'}
              {item.reviewCount > 0 ? ` · 已回看 ${item.reviewCount} 次` : ' · 尚未回看'}
            </p>
            <div className="card-actions">
              {/* 主操作是去看；「完成本次回看」用于已经看完、回列表登记的情形。 */}
              <Link className="button small primary" to={`/nodes/${encodeURIComponent(item.node)}?from=review`}>开始回看</Link>
              <button className="button small" disabled={busy !== null} onClick={() => markReviewed(item)}>
                {busy === item.node ? '记录中…' : '完成本次回看'}
              </button>
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}
