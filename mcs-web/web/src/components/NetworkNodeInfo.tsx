import { useEffect, useState } from 'react';
import { api } from '../api';
import { useI18n } from '../i18n';
import { getLocalValue, putLocalValue } from '../vault-local';
import type { NodeDetailResponse, NodeSummary } from '../types';
import type { NetworkEdge } from '../network';
import { extractSignificance, type NoteMeta } from '../network-workspace';
const details = new Map<string, NodeDetailResponse>();
export function NetworkNodeInfo({ node, edges, titleOf, note, version }: { node: NodeSummary; edges: NetworkEdge[]; titleOf: (id: string) => string; note?: NoteMeta; version?: string }) {
  const { locale, pick } = useI18n(), [detail, setDetail] = useState<NodeDetailResponse | null>(null), [meaning, setMeaning] = useState(''), [edit, setEdit] = useState(false), [message, setMessage] = useState('');
  useEffect(() => {
    setDetail(null); setEdit(false); setMeaning(''); setMessage('');
    const controller = new AbortController(), cacheKey = `${version}:${node.id}:${locale}`;
    void getLocalValue<string>('network-meanings', node.id).then(value => { if (!controller.signal.aborted) setMeaning(value ?? ''); }).catch(() => {});
    if (!note && !node.id.startsWith('note:')) {
      const found = details.get(cacheKey);
      if (found) setDetail(found);
      else void api<NodeDetailResponse>(`/ontology/nodes/${encodeURIComponent(node.id)}`, { signal: controller.signal }).then(value => { details.set(cacheKey, value); if (details.size > 150) details.delete(details.keys().next().value!); if (!controller.signal.aborted) setDetail(value); }).catch(() => {});
    }
    return () => controller.abort();
  }, [node.id, version, locale, note?.file.sha256]);
  const incident = edges.filter(e => e.from === node.id || e.to === node.id), prereqs = new Set<string>(), subsequent = new Set<string>(), related = new Set<string>(), incoming = new Set<string>(), outgoing = new Set<string>();
  for (const edge of incident) {
    const other = edge.from === node.id ? edge.to : edge.from;
    if (edge.source === 'relation' && edge.origin === 'noteReference') { (edge.to === node.id ? incoming : outgoing).add(other); continue; }
    if (edge.source === 'relation' && !edge.origin && edge.kind === 'hardPrereq') { (edge.to === node.id ? prereqs : subsequent).add(other); continue; }
    related.add(other);
  }
  const motivation = detail?.node.motivation;
  const registeredMeaning = [...(motivation?.internal ?? []), ...(motivation?.external ?? []), ...(motivation?.aesthetic ?? [])].slice(0, 2).join('\n');
  const contentMeaning = detail?.node.contentMarkdown ? extractSignificance(detail.node.contentMarkdown) : null;
  const publishedMeaning = note?.indexed?.significance || registeredMeaning || contentMeaning?.significance;
  const lines = (label: string, values: Set<string>) => <p><strong>{label} {values.size}</strong>{values.size > 0 && <> · {[...values].sort().slice(0, 3).map(titleOf).join('、')}{values.size > 3 ? '…' : ''}</>}</p>;
  return <div className="network-node-info" data-node-info={node.id}>
    <strong className="detail-title">{node.title}</strong>
    <p>{note?.indexed?.summary || node.summary || pick({ zh: '简介尚未整理', en: 'Introduction not yet prepared' })}</p>
    <h4>{pick({ zh: '在数学理论中的意义', en: 'Meaning in mathematical theory' })}</h4>
    <p className="network-meaning">{publishedMeaning || pick({ zh: '尚未整理', en: 'Not yet prepared' })}</p>
    {publishedMeaning && <small>{note ? `${note.file.path} · ${note.indexed?.section ?? ''} · r${note.vault.revision}` : `${registeredMeaning ? pick({ zh: '来源：节点登记的动机', en: 'Source: registered node motivations' }) : `${pick({ zh: '来源：节点正文', en: 'Source: node content' })} · ${contentMeaning?.section}`} · ${detail?.node.evidenceStatus ?? 'NOT-CLAIMED'}`}</small>}
    {meaning && <p><strong>{pick({ zh: '我的补充', en: 'My explanation' })}</strong> · {meaning}</p>}
    <button className="link-button" onClick={() => setEdit(v => !v)}>{pick({ zh: '补充私人说明', en: 'Add a private explanation' })}</button>
    {edit && <form onSubmit={event => { event.preventDefault(); void putLocalValue('network-meanings', node.id, meaning).then(() => { setEdit(false); setMessage(pick({ zh: '已保存在当前浏览器', en: 'Saved in this browser' })); }).catch(() => setMessage(pick({ zh: '本机存储不可用', en: 'Browser storage unavailable' }))); }}><textarea aria-label={pick({ zh: '私人数学意义说明', en: 'Private mathematical explanation' })} value={meaning} maxLength={8000} onChange={event => setMeaning(event.target.value)} /><button className="button small" type="submit">{pick({ zh: '保存', en: 'Save' })}</button></form>}
    {message && <p role="status">{message}</p>}
    <h4>{pick({ zh: '在当前视图中的联系', en: 'Connections in this view' })}</h4>
    {!note && <>{lines(pick({ zh: '已登记硬前置', en: 'Registered hard prerequisites' }), prereqs)}{lines(pick({ zh: '后续节点', en: 'Subsequent nodes' }), subsequent)}</>}
    {lines(pick({ zh: '关联节点', en: 'Related nodes' }), related)}
    {incident.filter(edge => edge.source === 'relation' && edge.kind === 'conditionalDerivation').slice(0, 3).map(edge => <p key={edge.id}><strong>{pick({ zh: '条件性数学关系', en: 'Conditional mathematical relation' })}</strong> · {titleOf(edge.from === node.id ? edge.to : edge.from)} · {edge.source === 'relation' ? edge.scope : ''}</p>)}
    {note && <>{lines(pick({ zh: '引用', en: 'Links to' }), outgoing)}{lines(pick({ zh: '被引用', en: 'Linked from' }), incoming)}{(note.indexed?.ambiguous || note.indexed?.missing) ? <p className="muted">{pick({ zh: '未形成连线：', en: 'Links not drawn: ' })}{note.indexed.ambiguous} {pick({ zh: '歧义', en: 'ambiguous' })} · {note.indexed.missing} {pick({ zh: '未解析', en: 'unresolved' })}</p> : null}</>}
  </div>;
}
