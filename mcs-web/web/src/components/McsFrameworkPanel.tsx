import { useEffect, useMemo, useRef, useState } from 'react';
import type { McsAtlas } from '../../../shared/mcs-atlas.mjs';
import type { McsViewData } from '../../../shared/mcs-view.mjs';
import {
  MSC_2020, ARXIV_MATH, MSC_2020_SOURCE, ARXIV_MATH_SOURCE,
  frameworkRows, frameworkSearch, classificationSummary,
} from '../../../shared/mcs-framework.mjs';
import type { FrameworkGroup, FrameworkRow } from '../../../shared/mcs-framework.mjs';
import { useI18n } from '../i18n';
import { MCS_RELATIONS, MCS_SCALES } from '../mcs-ui';
import { appliedForMsc } from '../../../shared/mcs-applied.mjs';

export interface FrameworkPanelProps {
  open: boolean;
  atlas: McsAtlas;
  data: McsViewData;
  tab: 'classification' | 'formal';
  onTab: (tab: 'classification' | 'formal') => void;
  showCodes: boolean;
  onToggleCodes: (value: boolean) => void;
  activeCode: string | null;
  onFilter: (code: string) => void;
  onFly: (id: string) => void;
  onOpenApplied?: (code: string) => void;
  onClose: () => void;
}

const RELATION_ORDER = ['deduction', 'scaling', 'application', 'duality', 'hardPrereq', 'softPrereq', 'analogy'];

function codeScope(row: FrameworkRow) {
  return row.scope === 'branch' ? 'branch' : row.scope === 'field' ? 'field' : 'unmapped';
}

export function McsFrameworkPanel({
  open, atlas, data, tab, onTab, showCodes, onToggleCodes, activeCode, onFilter, onFly, onOpenApplied, onClose,
}: FrameworkPanelProps) {
  const { pick, locale } = useI18n();
  const [query, setQuery] = useState('');
  const [onlyCollected, setOnlyCollected] = useState(false);
  const close = useRef<HTMLButtonElement>(null);
  const firstResult = useRef<HTMLLIElement>(null);
  const index = useMemo(() => frameworkRows(atlas, { onlyCollected }), [atlas, onlyCollected]);
  const hits = useMemo(() => query.trim() ? frameworkSearch(index.rows, query) : [], [index, query]);
  const groups = useMemo(() => {
    if (!query.trim()) return index.groups;
    const codes = new Set(hits.map(row => row.code));
    return index.groups
      .map(group => ({ ...group, rows: group.rows.filter(row => codes.has(row.code)) }))
      .filter(group => group.rows.length > 0);
  }, [index, hits, query]);
  const summary = useMemo(() => classificationSummary(data), [data]);
  const appliedCount = useMemo(
    () => new Map(MSC_2020.map(entry => [entry.code, appliedForMsc(entry.code).length])),
    [],
  );

  useEffect(() => {
    if (!open) return;
    close.current?.focus({ preventScroll: true });
  }, [open]);

  useEffect(() => {
    if (!query.trim()) return;
    const timer = window.setTimeout(() => firstResult.current?.scrollIntoView({ block: 'nearest' }), 0);
    return () => window.clearTimeout(timer);
  }, [query, hits]);

  if (!open) return null;

  const activate = (row: FrameworkRow) => {
    if (row.scope === 'unmapped' || !row.targetId) return;
    if (row.objectCount > 0) onFilter(row.code);
    else onFly(row.targetId);
  };

  const groupTitle = (group: FrameworkGroup) => group.id === 'unmapped'
    ? pick({ zh: '未映射到本图', en: 'Not mapped to this map' })
    : pick(group.title);

  const maxScale = Math.max(...summary.scales.map(scale => scale.count), 1);

  return <aside
    id="mcs-framework-panel"
    className={`mcs-atlas-frameworks${tab === 'formal' ? ' is-formal' : ''}`}
    role="dialog"
    aria-modal="false"
    aria-label={pick({ zh: '数学框架', en: 'Mathematical frameworks' })}
    data-framework-panel
  >
    <div className="mcs-framework-top">
      <header className="mcs-framework-head">
        <div>
          <small>{pick({ zh: '检索对照', en: 'Reference lens' })}</small>
          <h2>{pick({ zh: '数学框架', en: 'Mathematical frameworks' })}</h2>
        </div>
        <button ref={close} type="button" className="mcs-icon-button" onClick={onClose} aria-label={pick({ zh: '关闭框架面板', en: 'Close frameworks' })}>×</button>
      </header>

      <div className="mcs-framework-tabs" role="tablist" aria-label={pick({ zh: '框架视图', en: 'Framework view' })}>
        <button type="button" role="tab" aria-selected={tab === 'classification'} className={tab === 'classification' ? 'is-active' : ''} onClick={() => onTab('classification')}>{pick({ zh: '学科分类', en: 'Subject classification' })}</button>
        <button type="button" role="tab" aria-selected={tab === 'formal'} className={tab === 'formal' ? 'is-active' : ''} onClick={() => onTab('formal')}>{pick({ zh: '形式结构', en: 'Formal structure' })}</button>
      </div>
    </div>

    {tab === 'classification' ? <>
      <div className="mcs-framework-sources">
        <a href={MSC_2020_SOURCE.url} target="_blank" rel="noreferrer">{pick(MSC_2020_SOURCE.title)} ↗</a>
        <a href={ARXIV_MATH_SOURCE.url} target="_blank" rel="noreferrer">{pick(ARXIV_MATH_SOURCE.title)} ↗</a>
        <small>{pick({ zh: '核验于 2026-11-15；中文名为显示译名，官方标题为英文。', en: 'Checked 2026-11-15; English titles are official, Chinese names are display translations.' })}</small>
      </div>

      <label className="mcs-framework-search">
        <span className="sr-only">{pick({ zh: '搜索分类号或名称', en: 'Search classification codes or names' })}</span>
        <input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder={pick({ zh: '搜索 46、Functional analysis、math.FA…', en: 'Find 46, Functional analysis, math.FA…' })} aria-label={pick({ zh: '搜索分类号或名称', en: 'Search classification codes or names' })} />
      </label>

      <div className="mcs-framework-switches">
        <label><input type="checkbox" checked={onlyCollected} onChange={event => setOnlyCollected(event.target.checked)} />{pick({ zh: '只看已收录', en: 'Collected only' })}</label>
        <label><input type="checkbox" checked={showCodes} onChange={event => onToggleCodes(event.target.checked)} />{pick({ zh: '在图上显示分类号', en: 'Show codes on the map' })}</label>
      </div>

      <div className="mcs-framework-counts">
        <span>{index.counts.collected} {pick({ zh: '个分类有已收录对象', en: 'codes with collected objects' })}</span>
        <span>{MSC_2020.length} MSC · {ARXIV_MATH.length} arXiv</span>
      </div>

      <div className="mcs-framework-groups">
        {groups.length ? groups.map(group => <section key={group.id} className="mcs-framework-group" data-framework-group={group.id}>
          <h3>{groupTitle(group)} <small>{group.rows.length}</small></h3>
          <ul>{group.rows.map(row => <li key={row.code} ref={row.code === hits[0]?.code ? firstResult : undefined} className={`mcs-framework-row${activeCode === row.code ? ' is-active' : ''}`} data-framework-code={row.code} data-framework-scope={codeScope(row)}>
            <button
              type="button"
              className="mcs-framework-row-main"
              onClick={() => activate(row)}
              aria-pressed={row.objectCount > 0 ? activeCode === row.code : undefined}
              disabled={row.scope === 'unmapped' || !row.targetId}
              title={row.scope === 'unmapped'
                ? pick({ zh: '应用与交叉领域，本图暂不设分支', en: 'Applied/cross-disciplinary; no map branch yet' })
                : row.objectCount > 0
                  ? pick({ zh: '点击筛选地图；分支按钮单独定位', en: 'Click to filter the map; branch buttons navigate' })
                  : pick({ zh: '当前分类没有已收录对象；点击定位到关联分支或领域', en: 'No collected objects in this code; click to locate its branch or field' })}
            >
              <span className="mcs-framework-code">{row.code}</span>
              <span className="mcs-framework-title">
                <strong>{pick(row.title)}</strong>
                {locale === 'zh' ? <small>{row.title.en}</small> : null}
              </span>
              <span className="mcs-framework-count">{row.objectCount}</span>
            </button>
            <div className="mcs-framework-row-meta">
              {row.branchTitles.length ? row.branchTitles.map(branch => <button type="button" key={branch.id} onClick={() => onFly(branch.id)}>{pick(branch.title)}</button>) : row.scope === 'unmapped'
                ? <button
                    type="button"
                    className="mcs-framework-applied"
                    data-applied-link={row.code}
                    title={pick({ zh: '本图暂不设分支；应用数学索引中有对应书目条目', en: 'No map branch yet; the applied index has matching book sections' })}
                    onClick={() => onOpenApplied?.(row.code)}
                  >{pick({ zh: `应用数学索引 · ${appliedCount.get(row.code) ?? 0} 节`, en: `Applied index · ${appliedCount.get(row.code) ?? 0} sections` })}</button>
                : <span>{pick({ zh: '领域级对照', en: 'Field-level reference' })}</span>}
              {row.arxiv.map(entry => <span key={entry.code} className="mcs-framework-arxiv" title={pick(entry.title)}>{entry.code}</span>)}
            </div>
          </li>)}</ul>
        </section>) : <p className="mcs-framework-empty">{pick({ zh: '没有匹配的分类号或名称。', en: 'No matching classification code or name.' })}</p>}
      </div>

      <p className="mcs-framework-note">{pick({ zh: '分类号只作检索对照：不生成对象、成员关系或数学关系，不改变地图布局与对象身份。一个对象可关联多个分类号，计数不是互斥分区。', en: 'Classification codes are a retrieval reference only: they create no objects, membership or mathematical relations, and do not change the map or object identities. One object may relate to several codes; counts are not a partition.' })}</p>
    </> : <>
      {activeCode ? <p className="mcs-framework-note">{pick({ zh: `地图当前按 ${activeCode} 筛选；下方统计仍为全库。`, en: `The map is filtered by ${activeCode}; the counts below remain global.` })}</p> : null}
      <section className="mcs-framework-section">
        <h3>{pick({ zh: '五级尺度', en: 'Five formal scales' })} <small>{summary.objects}</small></h3>
        <ul className="mcs-framework-scale">{[...summary.scales].reverse().map(scale => <li key={scale.id}>
          <span>{pick(MCS_SCALES[scale.id as keyof typeof MCS_SCALES])}</span>
          <span className="mcs-framework-bar" aria-hidden="true"><i style={{ width: `${Math.max(2, scale.count / maxScale * 100)}%` }} /></span>
          <b>{scale.count}</b>
        </li>)}</ul>
        <p className="mcs-framework-note">{pick({ zh: '尺度是形式组织类型，不是难度、篇幅或数学上的唯一分类；成员关系无环，标签严格递增。', en: 'Scale is a formal organisation type, not difficulty, length or a unique mathematical classification. Membership is acyclic and the label strictly increases.' })}</p>
      </section>

      <section className="mcs-framework-section">
        <h3>{pick({ zh: 'M 层关系', en: 'M-layer relations' })} <small>{summary.relations}</small></h3>
        <ul className="mcs-framework-relations">{RELATION_ORDER.filter(kind => summary.relationKinds[kind]).map(kind => <li key={kind} className={`is-${kind}`}>
          <i aria-hidden="true" />
          <span>{MCS_RELATIONS[kind] ? pick(MCS_RELATIONS[kind]) : kind}</span>
          <b>{summary.relationKinds[kind]}</b>
        </li>)}</ul>
        <p className="mcs-framework-note">{pick({ zh: '只统计公开 M 层关系；L 层阅读先修与类比不在本图，也不计算传递闭包。', en: 'Counts public M-layer relations only. L-layer reading prerequisites and analogies are not in this map, and no transitive closure is inferred.' })}</p>
      </section>

      <section className="mcs-framework-section">
        <h3>{pick({ zh: '证据状态', en: 'Evidence status' })}</h3>
        <div className="mcs-framework-evidence">
          <div><strong>{pick({ zh: '对象声明', en: 'Object declarations' })}</strong>{Object.entries(summary.declarationStatus).sort().map(([status, count]) => <span key={status}><code>{status}</code>{count}</span>)}</div>
          <div><strong>{pick({ zh: '关系证据', en: 'Relation evidence' })}</strong>{Object.entries(summary.relationEvidence).sort().map(([status, count]) => <span key={status}><code>{status}</code>{count}</span>)}</div>
        </div>
        <p className="mcs-framework-note">{pick({ zh: 'PROOF 是登记标签，不等于本次机器重放通过；结构检查、数学论证与内核重放分别查看。', en: 'PROOF is a registered label, not a successful machine replay in this session. Structural checks, mathematical arguments and kernel replay are reported separately.' })}</p>
      </section>

      <section className="mcs-framework-section">
        <h3>{pick({ zh: '总量', en: 'Totals' })}</h3>
        <p className="mcs-framework-totals">{summary.objects} {pick({ zh: '个对象', en: 'objects' })} · {summary.relations} {pick({ zh: '条 M 关系', en: 'M relations' })} · {atlas.nodes.filter(node => node.objectId).length} {pick({ zh: '个地图实体', en: 'map entities' })}</p>
      </section>
    </>}
  </aside>;
}
