import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, formatError } from '../api';
import { useAuth } from '../auth';
import { useI18n } from '../i18n';
import type { NodeSummary } from '../types';
interface Submission { id: string; revision: number; status: string; snapshot: { endpoints: Record<string, { title: string; excerpt: string; publicNodeId: string }>; relation: { kind: string; reason: string; source: string; conditions: string }; evidence?: unknown }; submittedEvidence?: unknown; reviews: Array<{ status: string; note: string }>; drafts?: Record<string, string>; mapping?: Record<string, string> }
export function NetworkSubmissions({ nodes }: { nodes: NodeSummary[] }) {
  const auth = useAuth(), { pick, hrefFor } = useI18n(), [entries, setEntries] = useState<Submission[]>([]), [error, setError] = useState(''), [opened, setOpened] = useState(false), [reload, setReload] = useState(0), [reviewAll, setReviewAll] = useState(false), [mapping, setMapping] = useState<Record<string, string>>({}), [notes, setNotes] = useState<Record<string, string>>({});
  const admin = auth.mode === 'local' || auth.user?.role === 'admin', allowed = auth.mode === 'local' || Boolean(auth.user);
  useEffect(() => {
    setEntries([]); if (!opened || !allowed) return;
    const controller = new AbortController();
    void api<{ submissions: Submission[] }>(reviewAll && admin ? '/authoring/relation-submissions' : '/me/relation-submissions', { signal: controller.signal }).then(data => { setEntries(data.submissions); setError(''); }).catch(e => { if (!controller.signal.aborted) setError(formatError(e)); });
    return () => controller.abort();
  }, [opened, reload, reviewAll, admin, allowed, auth.identityKey]);
  const act = async (entry: Submission, status: string) => {
    try {
      await api(`${status === 'withdrawn' ? '/me' : '/authoring'}/relation-submissions/${encodeURIComponent(entry.id)}`, { method: status === 'withdrawn' ? 'DELETE' : 'PATCH', body: { baseRevision: entry.revision, status, note: notes[entry.id] ?? '', publicRelationId: status === 'published' ? window.prompt(pick({ zh: '填入编写台发布后生成的公共关系 ID', en: 'Enter the public relation ID from authoring publication' })) || '' : '', correspondenceConfirmed: status === 'published' ? window.confirm(pick({ zh: '已单独核对形式表达、适用条件与公开摘录的对应？此确认不会替代机器证据。', en: 'Have you independently checked the formal expressions, conditions and public excerpts? This does not replace machine evidence.' })) : false, mapping: { from: mapping[entry.id + ':from'] ?? entry.mapping?.from ?? entry.snapshot.endpoints.from.publicNodeId ?? '', to: mapping[entry.id + ':to'] ?? entry.mapping?.to ?? entry.snapshot.endpoints.to.publicNodeId ?? '' } } });
      setReload(v => v + 1);
    } catch (e) { setError(formatError(e)); }
  };
  return <details className="network-submissions" onToggle={event => setOpened(event.currentTarget.open)}><summary>{pick({ zh: '关系投稿与审阅', en: 'Relation contributions and review' })}</summary>
    {admin && <label><input type="checkbox" checked={reviewAll} onChange={e => setReviewAll(e.target.checked)} />{pick({ zh: '管理员：审阅全部投稿', en: 'Administrator: review all contributions' })}</label>}
    {entries.map(entry => <article className="network-submission-preview" key={entry.id}><strong>{entry.snapshot.endpoints.from.title} → {entry.snapshot.endpoints.to.title}</strong><p>{entry.status} · r{entry.revision}</p><p>{entry.snapshot.relation.reason} · {entry.snapshot.relation.conditions}</p>
      <details><summary>{pick({ zh: '固定公开材料', en: 'Frozen public materials' })}</summary>{Object.entries(entry.snapshot.endpoints).map(([side, endpoint]) => <div key={side}><strong>{endpoint.title}</strong><p>{endpoint.excerpt}</p></div>)}<p>{entry.snapshot.relation.source}</p></details>
      {entry.reviews?.map((review, i) => <p key={i}>{review.status} · {review.note}</p>)}
      {entry.snapshot.evidence != null && <details><summary>{pick({ zh: '投稿时固定的证据摘要', en: 'Evidence frozen at submission' })}</summary><pre>{JSON.stringify(entry.snapshot.evidence, null, 2)}</pre></details>}
      {admin && reviewAll && entry.submittedEvidence != null && <details><summary>{pick({ zh: '审阅所选证据；公共候选仍需独立重放', en: 'Review selected evidence; public candidates still require replay' })}</summary><pre>{JSON.stringify(entry.submittedEvidence, null, 2)}</pre></details>}
      {Object.keys(entry.drafts ?? {}).length > 1 && <p>{pick({ zh: '两端均为候选时，先分别完成节点审阅与发布，再发现、重放并发布两端关系。', en: 'When both endpoints are candidates, review and publish the nodes first, then discover, replay and publish their relation.' })}</p>}{Object.entries(entry.drafts ?? {}).map(([side, id]) => <Link className="button small" key={id} to={hrefFor('/authoring?draft=' + encodeURIComponent(id))}>{pick({ zh: '打开候选编写与验证', en: 'Open candidate authoring and checks' })} · {side}</Link>)}
      {!reviewAll && !['withdrawn', 'published'].includes(entry.status) && <button className="button small" onClick={() => void act(entry, 'withdrawn')}>{pick({ zh: '撤回投稿', en: 'Withdraw' })}</button>}
      {admin && reviewAll && !['withdrawn', 'published'].includes(entry.status) && <div>{(['from', 'to'] as const).map(side => <label key={side}>{side}<select value={mapping[entry.id + ':' + side] ?? entry.mapping?.[side] ?? entry.snapshot.endpoints[side].publicNodeId ?? ''} onChange={e => setMapping(v => ({ ...v, [entry.id + ':' + side]: e.target.value }))}><option value="">{pick({ zh: '建立独立候选节点', en: 'Create a separate candidate' })}</option>{nodes.filter(n => !n.id.startsWith('note:')).map(n => <option key={n.id} value={n.id}>{n.title}</option>)}</select></label>)}
        <label>{pick({ zh: '审阅意见', en: 'Review notes' })}<textarea value={notes[entry.id] ?? ''} onChange={e => setNotes(v => ({ ...v, [entry.id]: e.target.value }))} /></label><div className="card-actions"><button className="button small" onClick={() => void act(entry, 'needs_changes')}>{pick({ zh: '需补充', en: 'Request changes' })}</button><button className="button small" onClick={() => void act(entry, 'rejected')}>{pick({ zh: '驳回', en: 'Reject' })}</button><button className="button small" onClick={() => void act(entry, 'staged')}>{pick({ zh: '接入候选编写流程', en: 'Stage for authoring' })}</button><button className="button small" onClick={() => void act(entry, 'published')}>{pick({ zh: '核对已发布关系', en: 'Check published relation' })}</button></div></div>}
    </article>)}
    {opened && !entries.length && <p>{pick({ zh: '暂无投稿', en: 'No contributions' })}</p>}{error && <p role="status">{error}</p>}
  </details>;
}
