import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useApi, formatError } from '../api';
import { useI18n } from '../i18n';
import { objectMasterView } from '../../../shared/master-view.mjs';
import type { McsViewData, McsViewObject } from '../../../shared/mcs-view.mjs';
import type { LearningNodeDocument } from '../../../shared/content-documents.mjs';
import { ContentRelationDetails } from './ContentCaseControls';
import { MasterContent } from './MasterView';
import { MCS_SCALES, MCS_RELATIONS } from '../mcs-ui';
import { ConnectionNote } from '../connection-notes';

interface Props {
  data: McsViewData; object: McsViewObject | undefined; anchor?: string; relationIds: string[];
  expanded: boolean; canExpand: boolean; onToggle: () => void; onFocus: (id: string) => void;
  onClose: () => void;
}

export function McsInspector({ data, object, anchor, relationIds, expanded, canExpand, onToggle, onFocus, onClose }: Props) {
  const { pick, locale, hrefFor } = useI18n();
  const detail = useApi<{ readings: LearningNodeDocument[] }>(object ? `/ontology/objects/${encodeURIComponent(object.id)}` : null);
  const master = useMemo(() => object ? objectMasterView(object, { objects: data.objects, sourceVersion: data.objectVersion, locale, anchor: anchor ?? '$' }) : null, [object, data, locale, anchor]);
  const relations = relationIds.length ? data.relations.filter(r => relationIds.includes(r.id)) : data.relations.filter(r => object && (r.from.id === object.id || r.to.id === object.id || r.premises.some(p => p.id === object.id)));
  const notes = object ? data.notes?.byObject[object.id] ?? [] : [];
  const primary = notes.find(n => n.coverage !== 'related');
  return <aside className="mcs-inspector" aria-label={pick({ zh: '数学对象详情', en: 'Mathematical object details' })}>
    <div className="mcs-panel-heading"><span className="mcs-eyebrow">{pick({ zh: relationIds.length ? '关系与依据' : '对象与依据', en: relationIds.length ? 'RELATIONS & EVIDENCE' : 'OBJECT & EVIDENCE' })}</span><button type="button" className="mcs-icon-button" onClick={onClose} aria-label={pick({ zh: '关闭详情', en: 'Close details' })}>×</button></div>
    {object ? <>
      <h2 lang="zh" className={locale === 'en' ? 'i18n-pending' : ''}>{object.title}</h2>
      <p className="mcs-meta">{pick(MCS_SCALES[object.scale])} · {object.version}{anchor ? ` · #${anchor}` : ''}</p>
      {locale === 'en' ? <p className="mcs-meta">{pick({ zh: '正文：中文', en: 'Object content: Chinese · not yet translated' })}</p> : null}
      <div className="mcs-detail-actions">
        {primary ? <Link className="button primary" data-mcs-open-note to={hrefFor(primary.href)}>{pick(primary.kind === 'node' ? primary.coverage === 'chapter' ? { zh: '阅读笔记章节 ↗', en: 'Read note chapter ↗' } : { zh: '打开节点笔记 ↗', en: 'Open node notes ↗' } : { zh: '阅读公共讲解 ↗', en: 'Read public explanation ↗' })}</Link> : null}
        <button type="button" onClick={() => onFocus(object.id)}>{pick({ zh: '聚焦对象', en: 'Focus object' })}</button>
        {canExpand ? <button type="button" onClick={onToggle}>{pick({ zh: '展开下一层', en: 'Expand next level' })}</button> : null}
        <Link to={hrefFor(`/objects/${encodeURIComponent(object.id)}?from=mcs${anchor ? `#${encodeURIComponent(anchor)}` : ''}`)}>{pick({ zh: '完整对象与证据 ↗', en: 'Full object & evidence ↗' })}</Link>
      </div>
      {notes.some(n => n.kind === 'node') ? <section><h3>{pick({ zh: '节点笔记', en: 'Node notes' })}</h3><ul>{notes.filter(n => n.kind === 'node').map(n => <li key={n.id}><Link to={hrefFor(n.href)}>{n.title}</Link>{n.coverage !== 'object' ? <small> · {pick(n.coverage === 'chapter' ? { zh: '含本对象的章节', en: 'Chapter covering this object' } : { zh: '相关内容，范围以笔记为准', en: 'Related content; scope follows the note' })}</small> : null}</li>)}</ul></section> : null}
      {master ? <MasterContent view={master} compact /> : null}
      <p className="mcs-evidence-note">{pick({ zh: '证据标签按声明登记。结构检查、数学论证和机器重放分别查看。', en: 'Evidence labels are registered claims. Structural checks, mathematical arguments and kernel replay are reported separately.' })}</p>
      {object.members.length ? <section><h3>{pick({ zh: '已登记成员', en: 'Registered members' })}</h3><ul className="mcs-member-list">{object.members.map(ref => <li key={ref.id}><button type="button" onClick={() => onFocus(ref.id)}>{data.objects.find(o => o.id === ref.id)?.title ?? ref.id}</button></li>)}</ul></section> : object.scale === 'unit' ? <p className="mcs-meta">{pick({ zh: '此单元使用内部声明，尚未登记下层成员。', en: 'This unit has internal declarations and no registered child members.' })}</p> : null}
      {object.assumptions.length ? <section><h3>{pick({ zh: '假设', en: 'Assumptions' })}</h3><ul>{object.assumptions.map((a, i) => <li key={i}><code>{a}</code></li>)}</ul></section> : null}
      <section><h3>{pick({ zh: '相关讲解', en: 'Related readings' })}</h3>
        {detail.loading ? <p role="status">{pick({ zh: '正在读取讲解…', en: 'Loading readings…' })}</p> : null}
        {detail.error ? <p role="alert">{formatError(detail.error)}</p> : null}
        {detail.data?.readings.length ? <ul>{detail.data.readings.map(n => <li key={n.id}><Link to={hrefFor(`/learning-nodes/${encodeURIComponent(n.id)}?from=mcs`)}>{n.title}</Link></li>)}</ul> : !detail.loading && !detail.error ? <p className="mcs-meta">{pick({ zh: '尚未登记讲解。', en: 'No readings registered yet.' })}</p> : null}
      </section>
    </> : <h2>{pick({ zh: '成员间的数学联系', en: 'Mathematical links between members' })}</h2>}
    {relations.length ? <section><h3>{pick({ zh: '关系、条件与来源', en: 'Relations, conditions and sources' })} · {relations.length}</h3>{relations.map(r => {
      const label = MCS_RELATIONS[r.kind] ? pick(MCS_RELATIONS[r.kind]) : r.kind;
      const source = data.objects.find(o => o.id === r.from.id)?.title ?? r.from.id;
      const target = data.objects.find(o => o.id === r.to.id)?.title ?? r.to.id;
      return <article key={r.id} className="mcs-relation-card" data-mcs-relation-detail={r.id}>
        <header><span className={`mcs-relation-badge is-${r.kind}`}>{label}{r.kind === 'deduction' ? ' · AND' : ''}</span><small>{r.evidence.status}</small></header>
        <p className="mcs-relation-endpoints"><button type="button" onClick={() => onFocus(r.from.id)}>{source}</button><span aria-hidden="true">→</span><button type="button" onClick={() => onFocus(r.to.id)}>{target}</button></p>
        {r.kind === 'scaling' ? <p className="mcs-meta">{pick({ zh: '硬放缩：特殊端 → 一般端；适用条件见下方依据。', en: 'Strict scaling: special → general; see conditions below.' })}</p> : null}
        {r.kind === 'duality' ? <p className="mcs-meta">{pick({ zh: '箭头按登记的线性对偶构造方向绘制。', en: 'The arrow follows the registered linear dual construction.' })}</p> : null}
        <ContentRelationDetails relation={r} from="mcs" />
        <ConnectionNote actions target={{ key: JSON.stringify(['relation', r.id]), label, detail: `${source} → ${target} · ${r.id}` }} />
      </article>;
    })}<p className="mcs-meta">{pick({ zh: '个人备注随账号保存；本机模式保存在本机。分享视图只包含公共视图信息。', en: 'Personal notes are saved to your account, or locally in local mode. Shared view links contain public view information only.' })}</p></section> : null}
  </aside>;
}
