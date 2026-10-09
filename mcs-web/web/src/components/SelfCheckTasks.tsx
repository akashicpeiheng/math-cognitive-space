import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api, formatError } from '../api';
import { useI18n } from '../i18n';
import { clearAnswerDraft, readAnswerDrafts, writeAnswerDrafts } from '../drafts';
import type { EventView, SelfCheckView } from '../types';

/**
 * 自检任务：作答写入外部模型 E，不会自动判对，也不会自动确认掌握。
 *
 * 与笔记相同，本组件由父级按「档案 + 节点」重挂载，输入草稿按该键隔离并自动暂存；
 * 提交时携带的 checkId 与文本来自本实例的 props 与 state，切换节点后不会串写。
 *
 * 双语（2026-10）：文案成对写在下面；时间走 `fmtDate()`（不再写死 `toLocaleString('zh-CN')`）。
 * 作答正文是学习者自己写的，永远原样显示，不做任何翻译。
 */

const COPY = {
  zh: {
    heading: '自检任务',
    hint: '写下你的作答并记录：它作为 E 事件保存，不会自动判对，也不会自动确认掌握。草稿自动暂存在本机。',
    anchor: '锚点节点：',
    criterion: '评分依据：',
    separator: '：',
    placeholder: '用自己的话写出作答；不确定的部分照实写。',
    recording: '记录中…',
    submit: '记录我的作答',
    recorded: '作答已记录为 E 事件。它不会被自动判定为对，也不会自动确认掌握。',
    history: (count: number) => `已有 ${count} 次作答记录`,
  },
  en: {
    heading: 'Self-check tasks',
    hint: 'Write your answer and record it: it is stored as an E event, is not judged right or wrong automatically, and does not by itself confirm mastery. Drafts are kept on this device.',
    anchor: 'Anchor node: ',
    criterion: 'Grading basis: ',
    separator: ': ',
    placeholder: 'Write your answer in your own words; state honestly the parts you are unsure about.',
    recording: 'Recording…',
    submit: 'Record my answer',
    recorded: 'The answer was recorded as an E event. It is not judged correct automatically, and it does not confirm mastery automatically.',
    history: (count: number) => `${count} recorded answer${count === 1 ? '' : 's'}`,
  },
} as const;

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
  const { locale, fmtDate, hrefFor } = useI18n();
  const text = COPY[locale];
  const [answers, setAnswers] = useState<Record<string, string>>(() => readAnswerDrafts(profileId, nodeId));
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState('');

  function update(checkId: string, text_: string) {
    const next = { ...answers, [checkId]: text_ };
    setAnswers(next);
    writeAnswerDrafts(profileId, nodeId, next);
  }

  async function submit(checkId: string, anchor: string) {
    const answer = (answers[checkId] ?? '').trim();
    if (!answer || busy) return;
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
            payload: { text: answer, check_id: checkId },
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
      onNotice(text.recorded);
      await onChanged();
    } catch (reason) {
      setError(formatError(reason));
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      <h3>{text.heading}</h3>
      <p className="hint">{text.hint}</p>
      {error && <p className="error">{error}</p>}
      <ul className="self-check">
        {items.map((item) => {
          const anchor = item.anchor ?? nodeId;
          const past = history.filter((event) => event.payload?.check_id === item.id);
          return (
            <li key={item.id}>
              <strong>{item.competence}</strong>{text.separator}{item.prompt}
              <span className="self-check-anchor">
                {text.anchor}{anchor === nodeId
                  ? <code>{anchor}</code>
                  : <Link to={hrefFor(`/nodes/${encodeURIComponent(anchor)}`)}>{anchor}</Link>}
              </span>
              <em>{text.criterion}{item.criterion}</em>
              <div className="self-check-answer">
                <textarea
                  rows={3}
                  value={answers[item.id] ?? ''}
                  onChange={(event) => update(item.id, event.target.value)}
                  placeholder={text.placeholder}
                />
                <button
                  className="button small"
                  disabled={busy !== null || !(answers[item.id] ?? '').trim()}
                  onClick={() => submit(item.id, anchor)}
                >
                  {busy === item.id ? text.recording : text.submit}
                </button>
              </div>
              {past.length > 0 && (
                <details className="self-check-history">
                  <summary>{text.history(past.length)}</summary>
                  <ul>
                    {past.map((event) => (
                      <li key={event.eventId}>
                        <time dateTime={event.occurredAt}>{fmtDate(event.occurredAt)}</time>
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
