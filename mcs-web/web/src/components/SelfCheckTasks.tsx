import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api, formatError } from '../api';
import { clearAnswerDraft, readAnswerDrafts, writeAnswerDrafts } from '../drafts';
import type { EventView, SelfCheckView } from '../types';

/**
 * 自检任务：作答写入外部模型 E，不会自动判对，也不会自动确认掌握。
 *
 * 与笔记相同，本组件由父级按「档案 + 节点」重挂载，输入草稿按该键隔离并自动暂存；
 * 提交时携带的 checkId 与文本来自本实例的 props 与 state，切换节点后不会串写。
 */
export function SelfCheckTasks({
  profileId,
  nodeId,
  items,
  history,
  onChanged,
  onNotice,
}: {
  profileId: string;
  nodeId: string;
  items: SelfCheckView[];
  history: EventView[];
  onChanged: () => Promise<void> | void;
  onNotice: (message: string) => void;
}) {
  const [answers, setAnswers] = useState<Record<string, string>>(() => readAnswerDrafts(profileId, nodeId));
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState('');

  function update(checkId: string, text: string) {
    const next = { ...answers, [checkId]: text };
    setAnswers(next);
    writeAnswerDrafts(profileId, nodeId, next);
  }

  async function submit(checkId: string, anchor: string) {
    const text = (answers[checkId] ?? '').trim();
    if (!text || busy) return;
    setBusy(checkId);
    setError('');
    try {
      await api(`/profiles/${profileId}/events`, {
        method: 'POST',
        body: {
          event: {
            eventId: `mcs:answer:${checkId}:${new Date().toISOString()}`,
            kind: 'answer',
            nodeId: anchor,
            payload: { text, check_id: checkId },
            source: { kind: 'browser', ref: 'node-page-selfcheck' },
          },
        },
      });
      clearAnswerDraft(profileId, nodeId, checkId);
      setAnswers((current) => {
        const next = { ...current, [checkId]: '' };
        writeAnswerDrafts(profileId, nodeId, next);
        return next;
      });
      onNotice('作答已记录为 E 事件。它不会被自动判定为对，也不会自动确认掌握。');
      await onChanged();
    } catch (reason) {
      setError(formatError(reason));
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      <h3>自检任务</h3>
      <p className="hint">写下你的作答并记录：它作为 E 事件保存，不会自动判对，也不会自动确认掌握。草稿自动暂存在本机。</p>
      {error && <p className="error">{error}</p>}
      <ul className="self-check">
        {items.map((item) => {
          const anchor = item.anchor ?? nodeId;
          const past = history.filter((event) => event.payload?.check_id === item.id);
          return (
            <li key={item.id}>
              <strong>{item.competence}</strong>：{item.prompt}
              <span className="self-check-anchor">
                锚点节点：{anchor === nodeId
                  ? <code>{anchor}</code>
                  : <Link to={`/nodes/${encodeURIComponent(anchor)}`}>{anchor}</Link>}
              </span>
              <em>评分依据：{item.criterion}</em>
              <div className="self-check-answer">
                <textarea
                  rows={3}
                  value={answers[item.id] ?? ''}
                  onChange={(event) => update(item.id, event.target.value)}
                  placeholder="用自己的话写出作答；不确定的部分照实写。"
                />
                <button
                  className="button small"
                  disabled={busy !== null || !(answers[item.id] ?? '').trim()}
                  onClick={() => submit(item.id, anchor)}
                >
                  {busy === item.id ? '记录中…' : '记录我的作答'}
                </button>
              </div>
              {past.length > 0 && (
                <details className="self-check-history">
                  <summary>已有 {past.length} 次作答记录</summary>
                  <ul>
                    {past.map((event) => (
                      <li key={event.eventId}>
                        <time dateTime={event.occurredAt}>{new Date(event.occurredAt).toLocaleString('zh-CN')}</time>
                        <span>{String(event.payload?.text ?? '')}</span>
                      </li>
                    ))}
                  </ul>
                </details>
              )}
            </li>
          );
        })}
      </ul>
    </>
  );
}
