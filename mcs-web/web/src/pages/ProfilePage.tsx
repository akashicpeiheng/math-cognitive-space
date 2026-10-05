import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api, formatError, useApi } from '../api';
import { useProfileContext } from '../state';
import { useLearningData } from '../useLearningData';
import { StatusBadge } from '../components/StatusBadge';
import { ProgressBar } from '../components/ProgressBar';
import { ReviewQueue } from '../components/ReviewQueue';
import { ReviewPanel } from './ReviewPage';
import { eventKindLabel } from '../labels';
import type { EventView, NodeSummary, NoteView, ProfileView } from '../types';

/**
 * 事件类型选项。
 *
 * `unknown` 不是合法事件类型（EVENT_KINDS 里没有它），服务端会返回
 * BAD_REQUEST「未知事件类型 unknown」；「标为尚未确认」的正确写法是
 * kind=confirmation 且 payload.confirmed=false。
 */
const KINDS: Array<[string, string]> = [
  ['confirmation', '确认可用'],
  ['not-confirmed', '标为尚未确认'],
  ['answer', '记录一次作答'],
  ['misconception', '登记误区实例'],
  ['mastery_estimate', '登记能力估计'],
];

const TABS: Array<[string, string]> = [
  ['overview', '学习概览'],
  ['review', '待回看'],
  ['notes', '我的笔记'],
  ['advanced', '高级设置'],
];

/**
 * 我的学习。
 *
 * 默认只给学习相关的内容（进度、可以学什么、待回看、笔记）；
 * 档案管理、事件追加、导入导出与备份这些维护动作收进「高级设置」，
 * 本体哈希与运行时版本也从侧栏搬到这里，避免占着主导航的注意力。
 */
export function ProfilePage() {
  const { profiles, profileId, setProfileId, refreshProfiles, health } = useProfileContext();
  const { progress, graph, reload: reloadLearning } = useLearningData();
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') ?? 'overview';
  const events = useApi<{ events: EventView[] }>(profileId ? `/profiles/${profileId}/events?limit=200` : null, [profileId]);
  const nodes = useApi<{ nodes: NodeSummary[] }>('/ontology/nodes?limit=500');
  const [name, setName] = useState('');
  const [eventType, setEventType] = useState('confirmation');
  const [eventNode, setEventNode] = useState('bg:real:metric');
  const [eventText, setEventText] = useState('');
  const [dimension, setDimension] = useState('定义陈述');
  const [patternId, setPatternId] = useState('limit:pattern-never-equal');
  const [message, setMessage] = useState('');
  const importRef = useRef<HTMLInputElement>(null);
  const [restorePath, setRestorePath] = useState('');

  useEffect(() => { if (!eventNode && nodes.data?.nodes.length) setEventNode(nodes.data.nodes[0].id); }, [nodes.data, eventNode]);

  function selectTab(next: string) {
    const params = new URLSearchParams(window.location.search);
    if (next === 'overview') params.delete('tab'); else params.set('tab', next);
    setParams(params);
  }

  async function createProfile() {
    if (!name.trim()) return;
    try {
      const result = await api<{ profile: ProfileView }>('/profiles', { method: 'POST', body: { name } });
      setName('');
      await refreshProfiles();
      setProfileId(result.profile.id);
      setMessage(`已创建档案 ${result.profile.name}（从未指定开始）。`);
    } catch (error) { setMessage(formatError(error)); }
  }

  async function addEvent() {
    if (!profileId) return;
    const payload: Record<string, unknown> = {};
    // 「标为尚未确认」= confirmation + confirmed:false（adaptation 据此进入 θ.unknown）。
    const kind = eventType === 'not-confirmed' ? 'confirmation' : eventType;
    if (eventType === 'confirmation') payload.confirmed = true;
    if (eventType === 'not-confirmed') { payload.confirmed = false; payload.reason = eventText || '外部记录标为尚未确认'; }
    if (kind === 'answer') payload.text = eventText;
    if (kind === 'misconception') { payload.patternId = patternId; payload.uncertainty = 'unknown'; }
    if (kind === 'mastery_estimate') { payload.dimension = dimension; payload.value = Number(eventText || 0.5); }
    try {
      await api(`/profiles/${profileId}/events`, { method: 'POST', body: { event: { eventId: `ui-${Date.now()}`, kind, nodeId: eventNode, payload } } });
      setEventText('');
      events.reload();
      await refreshProfiles();
      setMessage('事件已追加到 E。浏览与作答不会自动改写 M。');
    } catch (error) { setMessage(formatError(error)); }
  }

  async function deleteProfile() {
    if (!profileId || !window.confirm('删除该档案及其事件与笔记？此操作不可撤销。')) return;
    try {
      await api('/profiles/' + profileId, { method: 'DELETE' });
      setMessage('档案已删除；公共本体 M 未改变。');
      setProfileId(null);
      await refreshProfiles();
    } catch (error) { setMessage(formatError(error)); }
  }

  async function exportProfile() {
    if (!profileId) return;
    try {
      const bundle = await api<Record<string, unknown>>(`/profiles/${profileId}/export`);
      const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `mcs-profile-${profileId}.json`;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (error) { setMessage(formatError(error)); }
  }

  async function importProfile(file: File) {
    try {
      const bundle = JSON.parse(await file.text());
      const result = await api<{ profile: ProfileView; skipped: unknown[] }>('/import', { method: 'POST', body: { bundle } });
      await refreshProfiles();
      setProfileId(result.profile.id);
      setMessage(`导入完成；跳过 ${result.skipped.length} 项。`);
    } catch (error) { setMessage(formatError(error)); }
  }

  async function backup() {
    try {
      const result = await api<{ backup: string }>('/backup', { method: 'POST', body: {} });
      setRestorePath(result.backup);
      setMessage(`备份已写入：${result.backup}`);
    } catch (error) { setMessage(formatError(error)); }
  }

  async function restore() {
    try {
      await api('/restore', { method: 'POST', body: { backup: restorePath } });
      await refreshProfiles();
      setMessage('恢复完成；页面需重新加载当前档案数据。');
    } catch (error) { setMessage(formatError(error)); }
  }

  const titleOf = (nodeId: string) => graph?.nodes.find((node) => node.id === nodeId)?.title ?? nodes.data?.nodes.find((node) => node.id === nodeId)?.title ?? nodeId;

  return (
    <div className="page profile-page">
      <div className="section-heading">
        <h1>我的学习</h1>
        <p>
          档案、事件与笔记保存在本机数据库；公共本体 M 的哈希不因任何学习、遗忘、答错或切换档案而改变。
        </p>
      </div>
      {message && <p className="notice" role="status">{message}</p>}

      {!profileId && (
        <p className="notice">
          还没有选择档案。<Link to="/nodes">先直接阅读</Link>也可以；需要保存进度、笔记或作答时，在下方新建一个档案。
        </p>
      )}

      <div className="tab-bar" role="tablist" aria-label="我的学习分区">
        {TABS.map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            className={tab === id ? 'tab active' : 'tab'}
            onClick={() => selectTab(id)}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <>
          <section className="card">
            <h2>学习进度</h2>
            {progress ? <ProgressBar counts={progress.counts} /> : <p>加载中…</p>}
            <p className="hint">已读不等于已掌握；确认可用才进入背景下拉。这里不给百分比——掌握程度没有被校准过。</p>
          </section>

          <section className="card">
            <h2>待回看</h2>
            {progress && progress.reviewQueue.length > 0 ? (
              <>
                <ReviewQueue items={progress.reviewQueue.slice(0, 3)} profileId={profileId} onChanged={reloadLearning} />
                {progress.reviewQueue.length > 3 && (
                  <button className="link-button" onClick={() => selectTab('review')}>还有 {progress.reviewQueue.length - 3} 条，去待回看全部</button>
                )}
              </>
            ) : <p className="muted">还没有待回看的内容。读过或确认过的节点会出现在这里。</p>}
          </section>

          {progress && progress.ready.length > 0 && (
            <section className="card">
              <h2>现在可以新学</h2>
              <p className="hint">引入条件已全部确认可用；列表由已登记的行动契约派生，不预测学习效果。</p>
              <ul className="ready-list">
                {progress.ready.slice(0, 5).map((entry) => (
                  <li key={entry.node}>
                    <Link to={`/nodes/${encodeURIComponent(entry.node)}`}>{titleOf(entry.node)}</Link>
                    <span className="muted">由「{entry.actionTitle}」引入</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="card">
            <h2>最近笔记</h2>
            {profileId ? <ProfileNotes profileId={profileId} limit={3} titleOf={titleOf} /> : <p className="muted">选择或新建档案后，这里显示你的笔记。</p>}
          </section>
        </>
      )}

      {tab === 'review' && <ReviewPanel />}

      {tab === 'notes' && (
        <section className="card">
          <h2>全部笔记</h2>
          {profileId ? <ProfileNotes profileId={profileId} titleOf={titleOf} /> : <p className="muted">选择或新建档案后，这里显示你的笔记。</p>}
        </section>
      )}

      {tab === 'advanced' && (
        <>
          <div className="two-column">
            <section className="card">
              <h2>档案（E）</h2>
              <ul className="profile-list">
                {profiles.map((profile) => (
                  <li key={profile.id} className={profile.id === profileId ? 'selected' : ''}>
                    <button className="link-button" onClick={() => setProfileId(profile.id)}>{profile.name}</button>
                    <span>rev {profile.revision} · {profile.kind}</span>
                  </li>
                ))}
              </ul>
              <div className="inline-form">
                <input value={name} onChange={(event) => setName(event.target.value)} placeholder="新档案名称" />
                <button className="button primary" onClick={createProfile}>新建档案</button>
              </div>
              {profileId && <div className="card-actions"><button className="button" onClick={deleteProfile}>删除当前档案</button></div>}
              <p className="muted">新档案从未指定开始：没有自动的“已掌握”或“不会”。演示学习者会单独标记为 demo。</p>
            </section>

            <section className="card">
              <h2>数据与备份</h2>
              <p className="hint">这些是维护动作，不是学习动作。学习记录只写在本机数据库里。</p>
              <dl className="facts compact">
                <div><dt>数据库</dt><dd>{health?.db.file ?? '—'}</dd></div>
                <div><dt>档案 / 事件 / 笔记</dt><dd>{health?.db.profiles ?? 0} / {health?.db.events ?? 0} / {health?.db.notes ?? 0}</dd></div>
                <div><dt>M 哈希（只读）</dt><dd><code>{health?.ontology.contentHash ?? '—'}</code></dd></div>
                <div><dt>本体版本 / 运行时</dt><dd>{health ? `${health.ontology.version} · Node ${health.runtime.node}` : '—'}</dd></div>
              </dl>
              <p className="muted">学习、作答、笔记与辅导反馈只写入外部模型 E，不改变公共本体。</p>
              <details className="plan-advanced">
                <summary>导入、导出与恢复（高级）</summary>
                <div className="card-actions advanced-actions">
                  <button className="button" disabled={!profileId} onClick={exportProfile}>导出当前档案 JSON</button>
                  <button className="button" onClick={() => importRef.current?.click()}>导入档案 JSON</button>
                  <button className="button" onClick={backup}>备份整个数据库</button>
                  <input ref={importRef} type="file" accept="application/json" hidden onChange={(event) => { const file = event.target.files?.[0]; if (file) importProfile(file); }} />
                </div>
                <label className="params">备份文件路径（仅允许本机备份目录）<input value={restorePath} onChange={(event) => setRestorePath(event.target.value)} /></label>
                <button className="button" disabled={!restorePath} onClick={restore}>从该备份恢复</button>
              </details>
            </section>
          </div>

          {profileId && (
            <>
              <section className="card">
                <h2>追加外部事件</h2>
                <p className="muted">事件是外部模型的观察或声明；确认、作答与掌握估计分开记录，答对不会自动确认整个节点。</p>
                <div className="inline-form">
                  <select value={eventType} onChange={(event) => setEventType(event.target.value)}>
                    {KINDS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                  </select>
                  <select value={eventNode} onChange={(event) => setEventNode(event.target.value)}>
                    {(nodes.data?.nodes ?? []).map((node) => <option key={node.id} value={node.id}>{node.title}</option>)}
                  </select>
                  {eventType === 'misconception' && (
                    <select value={patternId} onChange={(event) => setPatternId(event.target.value)}>
                      <option value="limit:pattern-never-equal">收敛序列各项都不等于极限</option>
                      <option value="tensor:pattern-index-array">所有指标数组都是张量</option>
                      <option value="group:pattern-all-commutative">所有群都交换</option>
                    </select>
                  )}
                  {eventType === 'mastery_estimate' && <input value={dimension} onChange={(event) => setDimension(event.target.value)} placeholder="能力维度" />}
                  {eventType !== 'misconception' && <input value={eventText} onChange={(event) => setEventText(event.target.value)} placeholder={eventType === 'answer' ? '作答内容' : eventType === 'mastery_estimate' ? '数值（0–1）' : '说明（可选）'} />}
                  <button className="button primary" onClick={addEvent}>追加事件</button>
                </div>
              </section>

              <section className="card">
                <h2>事件时间线</h2>
                {events.loading && <p>加载中…</p>}
                {events.error && <p className="error">{formatError(events.error)}</p>}
                <table className="data-table">
                  <thead><tr><th>时间</th><th>类型</th><th>节点</th><th>来源</th><th>内容</th></tr></thead>
                  <tbody>
                    {[...(events.data?.events ?? [])].reverse().map((event) => (
                      <tr key={event.eventId}>
                        <td>{new Date(event.occurredAt).toLocaleString('zh-CN')}</td>
                        <td><StatusBadge status={event.kind} label={eventKindLabel(event.kind)} title={event.kind} /></td>
                        <td>
                          <Link to={`/nodes/${encodeURIComponent(event.nodeId)}`} title={event.nodeId}>
                            {titleOf(event.nodeId)}
                          </Link>
                        </td>
                        <td>{event.source.kind}</td>
                        <td><EventPayload event={event} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>
            </>
          )}
        </>
      )}
    </div>
  );
}

/** 事件内容：先给可读摘要，原始 JSON 折叠保留，便于核查而不淹没学习者。 */
function EventPayload({ event }: { event: EventView }) {
  const payload = event.payload ?? {};
  const parts: string[] = [];
  if (typeof payload.confirmed === 'boolean') parts.push(payload.confirmed ? '确认可用' : '尚未确认');
  if (typeof payload.text === 'string' && payload.text.trim()) parts.push(payload.text.trim());
  if (typeof payload.reason === 'string' && payload.reason.trim()) parts.push(`原因：${payload.reason.trim()}`);
  if (typeof payload.dimension === 'string') parts.push(`维度：${payload.dimension}`);
  if (typeof payload.value === 'number' || typeof payload.value === 'string') parts.push(`取值：${payload.value}`);
  if (typeof payload.patternId === 'string') parts.push(`误区模式：${payload.patternId}`);
  if (typeof payload.context === 'string') parts.push(payload.context === 'review' ? '回看记录' : '阅读记录');
  if (typeof payload.evidence_status === 'string') parts.push(`证据状态：${payload.evidence_status}`);
  const summary = parts.join(' · ') || '（无文本字段）';
  return (
    <div className="event-payload">
      <span>{summary.length > 140 ? `${summary.slice(0, 140)}…` : summary}</span>
      <details><summary>原始记录</summary><pre>{JSON.stringify(payload, null, 2)}</pre></details>
    </div>
  );
}

function ProfileNotes({ profileId, limit, titleOf }: { profileId: string; limit?: number; titleOf?: (id: string) => string }) {
  const notes = useApi<{ notes: NoteView[] }>(`/profiles/${profileId}/notes`, [profileId]);
  if (notes.loading) return <p>加载中…</p>;
  if (notes.error) return <p className="error">{formatError(notes.error)}</p>;
  if (!notes.data?.notes.length) return <p>还没有笔记。读完一个节点后，在节点页写下自己的话。</p>;
  const list = limit ? notes.data.notes.slice(0, limit) : notes.data.notes;
  return (
    <div className="notes-list">
      {list.map((note) => (
        <article key={note.noteId}>
          <header>
            <strong>{note.title}</strong>
            <span>{note.nodeId ? (titleOf ? titleOf(note.nodeId) : note.nodeId) : '未关联节点'}</span>
            <time>{new Date(note.updatedAt).toLocaleString('zh-CN')}</time>
          </header>
          <p>{note.body}</p>
        </article>
      ))}
      {limit && notes.data.notes.length > limit && <p className="muted">还有 {notes.data.notes.length - limit} 条笔记，见「我的笔记」标签。</p>}
    </div>
  );
}
