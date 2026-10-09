import { useState } from 'react';
import { api, formatError } from '../api';
import { useI18n } from '../i18n';
import { StatusBadge } from './StatusBadge';

/**
 * 学习者操作区：把「读到哪了」变成 E 里可追溯的事件。
 *
 * 语义纪律：
 * - 「标记已读」写 kind=view，明确不表示理解或掌握（沿用旧版站点的既有语义）。
 * - 「我还不懂」写 confirmation + confirmed:false，并顺带写一条已读，使「已读·未懂」可表达。
 * - 「确认已掌握」写 confirmation + confirmed:true，这是唯一能把节点放进 θ.known 的路径。
 * 三个按钮都不会写公共本体 M。
 *
 * 双语（2026-10）：
 * - 界面文案成对写在下面；三个动作按钮直接取 `messages.ts` 已登记的键
 *   （`action.markRead` / `action.notUnderstood` / `action.confirmUsable`），中文逐字不变
 *   （`tests/browser.mjs` 按「标记已读」「已标记已读」「我还不懂」逐字点按钮）。
 * - **写进 E 的 `payload.note` / `reason` 也随语种**：它们会被「我的学习」的事件清单原样读出来
 *   （`ProfilePage` 的 `describeEvent`），英文站上留一句中文注解等于给读者留半截记录。
 *   事件的结构字段（kind / confirmed / context / evidence_status）与中文站逐字相同，只有这句人读的注解不同。
 */

const COPY = {
  zh: {
    noProfile: '请先在顶部选择或新建档案，学习记录只写入你的档案。',
    recorded: {
      view: '已标记为已读：这不表示理解或掌握，只记录你确实读到了这里。',
      review: '已记录一次复习。复习次数会累加，但不会因此把节点标成已掌握。',
      notUnderstood: '已记录为尚未理解。它会进入待复习队列，不会被当作已掌握。',
      confirm: '已确认可用。这个节点会作为背景进入后续路线规划。',
    },
    done: { markRead: '已标记已读', confirm: '已确认掌握' },
    recording: '记录中…',
    noteCanWrite: '这些记录只写入你的档案 E；已读不等于已掌握，确认才进入背景。',
    noteCannotWrite: '当前没有选择档案，因此无法记录学习状态。',
    badge: {
      read: '已读',
      readTitle: '已读：不表示理解或掌握',
      unknown: '尚未理解',
      unknownTitle: '已在 E 中标记为尚未理解',
      confirmed: '已确认可用',
      confirmedTitle: '已确认：可作为背景进入路线',
    },
    payload: {
      readNote: '学习者明确记为已读；不表示理解或掌握。',
      readOnConfirmNote: '在确认可用时一并记录为已读；不表示理解或掌握。',
      unknownReason: '学习者标记为尚未理解',
    },
  },
  en: {
    noProfile: 'Choose or create a profile at the top first; learning records are written only to your profile.',
    recorded: {
      view: 'Marked as read: this does not mean you understood or mastered it, only that you did read this far.',
      review: 'Recorded one review. The count grows, but this does not mark the node as mastered.',
      notUnderstood: 'Recorded as not yet understood. It goes into the review queue and is not treated as mastered.',
      confirm: 'Confirmed usable. This node now counts as background for later route planning.',
    },
    done: { markRead: 'Marked as read', confirm: 'Confirmed usable' },
    recording: 'Recording…',
    noteCanWrite: 'These records are written only to your profile (E); read is not mastery — only a confirmation enters the background.',
    noteCannotWrite: 'No profile is selected, so learning state cannot be recorded.',
    badge: {
      read: 'Read',
      readTitle: 'Read: this does not mean understanding or mastery',
      unknown: 'Not yet understood',
      unknownTitle: 'Marked as not yet understood in E',
      confirmed: 'Confirmed usable',
      confirmedTitle: 'Confirmed: usable as background for routes',
    },
    payload: {
      readNote: 'The learner explicitly marked this as read; it does not mean understanding or mastery.',
      readOnConfirmNote: 'Recorded as read together with the confirmation; it does not mean understanding or mastery.',
      unknownReason: 'The learner marked this as not yet understood',
    },
  },
} as const;

export type LearnerAction = 'view' | 'not-understood' | 'confirm' | 'review';

export interface LearnerStateFlags {
  isRead: boolean;
  isConfirmed: boolean;
  isUnknown: boolean;
  canWrite: boolean;
}

interface Props {
  nodeId: string;
  profileId: string | null;
  flags: LearnerStateFlags;
  /** 写入成功后回调，让页面刷新 θ 与事件。 */
  onChanged: () => Promise<void> | void;
  /** compact 用于页面底部，只显示按钮不带说明。 */
  compact?: boolean;
}

function nowId(prefix: string, nodeId: string): string {
  return `mcs:${prefix}:${nodeId}:${new Date().toISOString()}`;
}

export function LearnerActions({ nodeId, profileId, flags, onChanged, compact = false }: Props) {
  const { t, locale } = useI18n();
  const text = COPY[locale];
  const [busy, setBusy] = useState<LearnerAction | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function send(action: LearnerAction, events: Array<Record<string, unknown>>) {
    if (!profileId) { setError(text.noProfile); return; }
    setBusy(action);
    setError('');
    setMessage('');
    try {
      for (const event of events) {
        await api(`/profiles/${profileId}/events`, { method: 'POST', body: { event: { ...event, nodeId } } });
      }
      setMessage(action === 'view'
        ? text.recorded.view
        : action === 'review'
          ? text.recorded.review
          : action === 'not-understood'
            ? text.recorded.notUnderstood
            : text.recorded.confirm);
      await onChanged();
    } catch (reason) {
      setError(formatError(reason));
    } finally {
      setBusy(null);
    }
  }

  const viewEvent = (note?: string) => ({
    eventId: nowId('view', nodeId),
    kind: 'view',
    payload: { context: 'read', note: note ?? text.payload.readNote, evidence_status: 'ILLUSTRATION' },
    source: { kind: 'browser', ref: 'node-page' },
  });

  /** 确认掌握时同时记录一次阅读：确认意味着确实读过，否则复习队列会缺「上次浏览」。 */
  const confirmEvents = () => [
    { eventId: nowId('confirm', nodeId), kind: 'confirmation', payload: { confirmed: true }, source: { kind: 'browser', ref: 'node-page' } },
    ...(flags.isRead ? [] : [viewEvent(text.payload.readOnConfirmNote)]),
  ];
  return (
    <div className={`learner-actions${compact ? ' compact' : ''}`}>
      <div className="learner-action-row">
        <button
          className={`button${flags.isRead ? '' : ' primary'}`}
          disabled={!flags.canWrite || busy !== null || flags.isRead}
          onClick={() => send('view', [viewEvent()])}
        >
          {flags.isRead ? text.done.markRead : busy === 'view' ? text.recording : t('action.markRead')}
        </button>
        <button
          className="button"
          disabled={!flags.canWrite || busy !== null}
          onClick={() => send('not-understood', [
            viewEvent(),
            { eventId: nowId('unknown', nodeId), kind: 'confirmation', payload: { confirmed: false, reason: text.payload.unknownReason }, source: { kind: 'browser', ref: 'node-page' } },
          ])}
        >
          {busy === 'not-understood' ? text.recording : t('action.notUnderstood')}
        </button>
        <button
          className="button"
          disabled={!flags.canWrite || busy !== null || flags.isConfirmed}
          onClick={() => send('confirm', confirmEvents())}
        >
          {flags.isConfirmed ? text.done.confirm : busy === 'confirm' ? text.recording : t('action.confirmUsable')}
        </button>
      </div>
      {!compact && (
        <p className="learner-action-note">
          {flags.canWrite ? text.noteCanWrite : text.noteCannotWrite}
        </p>
      )}
      <div className="learner-action-state">
        {flags.isRead && <StatusBadge status="ILLUSTRATION" label={t('status.read')} title={text.badge.readTitle} />}
        {flags.isUnknown && <StatusBadge status="unknown" label={text.badge.unknown} title={text.badge.unknownTitle} />}
        {flags.isConfirmed && <StatusBadge status="known" label={text.badge.confirmed} title={text.badge.confirmedTitle} />}
      </div>
      {message && <p className="notice">{message}</p>}
      {error && <p className="error">{error}</p>}
    </div>
  );
}
