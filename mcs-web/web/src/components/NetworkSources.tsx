import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useI18n } from '../i18n';
import { api, formatError } from '../api';
import type { useNetworkWorkspace } from '../useNetworkWorkspace';
import type { PrivateRelation } from '../../../shared/network-workspace.mjs';
export function NetworkSources({ workspace, filter, onFilter, onEdit }: { workspace: ReturnType<typeof useNetworkWorkspace>; filter: string; onFilter: (value: string) => void; onEdit: (relation: PrivateRelation) => void }) {
  const { pick, hrefFor } = useI18n(), [message, setMessage] = useState('');
  const download = async () => {
    try {
      const cloud = workspace.cloudAllowed ? await api('/me/network-relations/export') : null;
      const blob = new Blob([JSON.stringify({ schema: 'mcs-private-network/1', browserRelations: workspace.relations.filter(r => r.local), account: cloud }, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob), anchor = document.createElement('a'); anchor.href = url; anchor.download = 'mcs-private-network.json'; anchor.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) { setMessage(formatError(error)); }
  };
  return <details className="network-sources"><summary>{pick({ zh: '节点来源与私人关系', en: 'Node sources and private relations' })}</summary>
    <label>{pick({ zh: '列表显示来源', en: 'Sources shown in the list' })}<select aria-label={pick({ zh: '节点来源筛选', en: 'Node source filter' })} value={filter} onChange={e => onFilter(e.target.value)}><option value="all">{pick({ zh: '全部来源', en: 'All sources' })}</option><option value="ontology">{pick({ zh: '网站数学节点', en: 'Website mathematics' })}</option><option value="notes">{pick({ zh: '导入笔记', en: 'Imported notes' })}</option></select></label>
    <p className="muted">{pick({ zh: '选择笔记库后，可勾选笔记与网站节点混合展示。', en: 'Choose libraries, then select notes and website nodes for a mixed graph.' })}</p>
    {workspace.available.map(vault => { const key = `${vault.storage}:${vault.id}`; return <label className="network-source-choice" key={key}><input type="checkbox" checked={workspace.selected.some(v => v.id === vault.id && v.storage === vault.storage)} onChange={e => workspace.setSources(e.target.checked ? [...new Set([...workspace.sources, key])] : workspace.sources.filter(v => v !== key))} />{vault.name} · {vault.storage === 'browser' ? pick({ zh: '本机', en: 'Browser' }) : pick({ zh: '账号', en: 'Account' })} · r{vault.revision}</label>; })}
    <Link to={hrefFor('/library')}>{pick({ zh: '导入或更新笔记库', en: 'Import or update libraries' })}</Link>
    {workspace.indexing && <p role="status">{pick({ zh: '正在建立笔记链接索引…', en: 'Indexing note links…' })}</p>}
    {(['noteReference', 'privateReference', 'privateRelation'] as const).map((key, index) => <label className="network-source-choice" key={key}><input type="checkbox" checked={workspace.filters[key]} onChange={e => workspace.setFilters(v => ({ ...v, [key]: e.target.checked }))} />{pick([{ zh: '笔记引用', en: 'Note links' }, { zh: '私人参考关联', en: 'Private references' }, { zh: '私人声明的关系', en: 'Private declared relations' }][index])}</label>)}
    <p className="muted">{pick({ zh: '这些连接同时受“登记关系”边源开关控制。', en: 'These connections also follow the registered-relations switch.' })}</p>
    {workspace.relations.length > 0 && <><h4>{pick({ zh: '我的关系', en: 'My relations' })}</h4><ul>{workspace.relations.map(relation => <li key={relation.id}><button className="link-button" onClick={() => onEdit(relation)}>{relation.reason.slice(0, 70)}</button><small> · r{relation.revision} · {relation.checks?.at(-1)?.stale ? pick({ zh: '旧结果已过期', en: 'Previous check is stale' }) : ''} {relation.checks?.at(-1)?.math.status ?? pick({ zh: '未验证', en: 'Unchecked' })}</small></li>)}</ul></>}
    <button className="button small" onClick={() => void download()}>{pick({ zh: '导出私人网络', en: 'Export private network' })}</button>
    <label>{pick({ zh: '导入私人关系（旧验证只供参考，需重新验证）', en: 'Import private relations (checks must be rerun)' })}<input type="file" accept="application/json,.json" onChange={event => { const file = event.target.files?.[0]; if (file) void file.text().then(text => workspace.importRelations(JSON.parse(text))).then(() => setMessage(pick({ zh: '关系已导入本机，未接受外部验证声明', en: 'Relations imported locally; external check claims discarded' }))).catch(e => setMessage(formatError(e))); event.target.value = ''; }} /></label>
    {workspace.error && <p role="status">{workspace.error}</p>}{message && <p role="status">{message}</p>}
  </details>;
}
