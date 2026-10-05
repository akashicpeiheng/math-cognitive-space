import { useState } from 'react';
import { api, formatError } from '../api';
import { StatusBadge } from './StatusBadge';

/**
 * 学习者操作区：把「读到哪了」变成 E 里可追溯的事件。
 *
 * 语义纪律：
 * - 「标记已读」写 kind=view，明确不表示理解或掌握（沿用旧版站点的既有语义）。
 * - 「我还不懂」写 confirmation + confirmed:false，并顺带写一条已读，使「已读·未懂」可表达。
 * - 「确认已掌握」写 confirmation + confirmed:true，这是唯一能把节点放进 θ.known 的路径。
 * 三个按钮都不会写公共本体 M。
 */

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
  const [busy, setBusy] = useState<LearnerAction | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function send(action: LearnerAction, events: Array<Record<string, unknown>>) {
    if (!profileId) { setError('请先在顶部选择或新建档案，学习记录只写入你的档案。'); return; }
    setBusy(action);
    setError('');
    setMessage('');
    try {
      for (const event of events) {
        await api(`/profiles/${profileId}/events`, { method: 'POST', body: { event: { ...event, nodeId } } });
      }
      setMessage(action === 'view'
        ? '已标记为已读：这不表示理解或掌握，只记录你确实读到了这里。'
        : action === 'review'
          ? '已记录一次复习。复习次数会累加，但不会因此把节点标成已掌握。'
          : action === 'not-understood'
            ? '已记录为尚未理解。它会进入待复习队列，不会被当作已掌握。'
            : '已确认可用。这个节点会作为背景进入后续路线规划。');
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
    payload: { context: 'read', note: note ?? '学习者明确记为已读；不表示理解或掌握。', evidence_status: 'ILLUSTRATION' },
    source: { kind: 'browser', ref: 'node-page' },
  });

  /** 确认掌握时同时记录一次阅读：确认意味着确实读过，否则复习队列会缺「上次浏览」。 */
  const confirmEvents = () => [
    { eventId: nowId('confirm', nodeId), kind: 'confirmation', payload: { confirmed: true }, source: { kind: 'browser', ref: 'node-page' } },
    ...(flags.isRead ? [] : [viewEvent('在确认可用时一并记录为已读；不表示理解或掌握。')]),
  ];
  return (
    <div className={`learner-actions${compact ? ' compact' : ''}`}>
      <div className="learner-action-row">
        <button
          className={`button${flags.isRead ? '' : ' primary'}`}
          disabled={!flags.canWrite || busy !== null || flags.isRead}
          onClick={() => send('view', [viewEvent()])}
        >
          {flags.isRead ? '已标记已读' : busy === 'view' ? '记录中…' : '标记已读'}
        </button>
        <button
          className="button"
          disabled={!flags.canWrite || busy !== null}
          onClick={() => send('not-understood', [
            viewEvent(),
            { eventId: nowId('unknown', nodeId), kind: 'confirmation', payload: { confirmed: false, reason: '学习者标记为尚未理解' }, source: { kind: 'browser', ref: 'node-page' } },
          ])}
        >
          {busy === 'not-understood' ? '记录中…' : '我还不懂'}
        </button>
        <button
          className="button"
          disabled={!flags.canWrite || busy !== null || flags.isConfirmed}
          onClick={() => send('confirm', confirmEvents())}
        >
          {flags.isConfirmed ? '已确认掌握' : busy === 'confirm' ? '记录中…' : '确认已掌握'}
        </button>
      </div>
      {!compact && (
        <p className="learner-action-note">
          {flags.canWrite
            ? '这些记录只写入你的档案 E；已读不等于已掌握，确认才进入背景。'
            : '当前没有选择档案，因此无法记录学习状态。'}
        </p>
      )}
      <div className="learner-action-state">
        {flags.isRead && <StatusBadge status="ILLUSTRATION" label="已读" title="已读：不表示理解或掌握" />}
        {flags.isUnknown && <StatusBadge status="unknown" label="尚未理解" title="已在 E 中标记为尚未理解" />}
        {flags.isConfirmed && <StatusBadge status="known" label="已确认可用" title="已确认：可作为背景进入路线" />}
      </div>
      {message && <p className="notice">{message}</p>}
      {error && <p className="error">{error}</p>}
    </div>
  );
}
