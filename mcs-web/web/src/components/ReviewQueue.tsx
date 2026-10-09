import { useState } from 'react';
import { Link } from 'react-router-dom';
import { formatError } from '../api';
import { useI18n } from '../i18n';
import { recordReview } from '../review-actions';
import { StatusBadge } from './StatusBadge';
import type { ReviewItem } from '../learning';

/**
 * 待复习队列。
 *
 * 这里没有间隔重复算法：「M」与「E」都没有间隔/到期模型，所以本组件只做
 * 「曾确认过或读过没懂 → 建议再看一眼」＋「复习次数计数」，不承诺记忆效果。
 *
 * 双语（2026-10）：文案成对写在下面；时间走 `fmtDate()`。
 * 中文一侧逐字不变——`tests/browser.mjs` 按「开始回看」「完成本次回看」点按钮，
 * 并断言列表里出现「已回看 1 次」。
 */

const COPY = {
  zh: {
    noProfile: '请先选择档案。',
    empty: '还没有可复习的内容。复习队列来自「你确认过」或「你标记为还没懂」的节点；先去读一个节点并标记「标记已读」或「我还不懂」，它就会出现在这里。',
    readNotUnderstood: '读过但没懂',
    readNotUnderstoodTitle: '你标记为尚未理解',
    confirmed: '曾确认可用',
    confirmedTitle: '你确认过它可用；复习用来回看',
    lastViewed: (time: string) => `上次阅读 ${time}`,
    noLastViewed: '没有阅读时间记录（旧记录可能只有确认）',
    reviewCount: (count: number) => ` · 已回看 ${count} 次`,
    notReviewed: ' · 尚未回看',
    start: '开始回看',
    recording: '记录中…',
    finish: '完成本次回看',
  },
  en: {
    noProfile: 'Choose a profile first.',
    empty: 'Nothing to review yet. The review queue holds nodes you confirmed or marked as not yet understood; read a node and mark it “Mark as read” or “I don’t get it yet”, and it will appear here.',
    readNotUnderstood: 'Read but not understood',
    readNotUnderstoodTitle: 'You marked it as not yet understood',
    confirmed: 'Confirmed usable earlier',
    confirmedTitle: 'You confirmed it as usable; review is for looking back',
    lastViewed: (time: string) => `Last read ${time}`,
    noLastViewed: 'No reading time on record (an older record may only have the confirmation)',
    reviewCount: (count: number) => ` · reviewed ${count} time${count === 1 ? '' : 's'}`,
    notReviewed: ' · not reviewed yet',
    start: 'Start reviewing',
    recording: 'Recording…',
    /** 与 `messages.ts` 的 `action.reviewed`（en: Record a review）保持同一句话；实际渲染走那个键。 */
    finish: 'Record a review',
  },
} as const;

export function ReviewQueue({ items, profileId, onChanged }: { items: ReviewItem[]; profileId: string | null; onChanged: () => Promise<void> | void }) {
  const { t, locale, fmtDate, hrefFor } = useI18n();
  const text = COPY[locale];
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState('');

  async function markReviewed(item: ReviewItem) {
    if (!profileId) { setError(text.noProfile); return; }
    setBusy(item.node);
    setError('');
    try {
      /* 注解随界面语种写进 E；事件标识与时刻与语言无关（见 `review-actions.ts` 的文件头）。 */
      await recordReview(profileId, item.node, 'review-queue', locale);
      await onChanged();
    } catch (reason) {
      setError(formatError(reason));
    } finally {
      setBusy(null);
    }
  }

  if (items.length === 0) {
    return (
      <p className="muted">{text.empty}</p>
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
                ? <StatusBadge status="unknown" label={text.readNotUnderstood} title={text.readNotUnderstoodTitle} />
                : <StatusBadge status="known" label={text.confirmed} title={text.confirmedTitle} />}
              <Link to={hrefFor(`/nodes/${encodeURIComponent(item.node)}`)}>{item.title}</Link>
            </div>
            <p className="muted">
              {item.lastViewedAt ? text.lastViewed(fmtDate(item.lastViewedAt)) : text.noLastViewed}
              {item.reviewCount > 0 ? text.reviewCount(item.reviewCount) : text.notReviewed}
            </p>
            <div className="card-actions">
              {/* 主操作是去看；「完成本次回看」用于已经看完、回列表登记的情形。 */}
              <Link className="button small primary" to={hrefFor(`/nodes/${encodeURIComponent(item.node)}?from=review`)}>{text.start}</Link>
              <button className="button small" disabled={busy !== null} onClick={() => markReviewed(item)}>
                {/* 中文逐字保留；英文取 `messages.ts` 已登记的 `action.reviewed`。 */}
                {busy === item.node ? text.recording : locale === 'en' ? t('action.reviewed') : text.finish}
              </button>
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}
