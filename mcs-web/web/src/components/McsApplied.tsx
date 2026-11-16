import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useI18n } from '../i18n';
import { useMediaQuery } from '../useMediaQuery';
import { McsModeSwitch } from './McsModeSwitch';
import {
  APPLIED_BOOK,
  APPLIED_BRANCHES,
  APPLIED_PARTS,
  APPLIED_WORKFLOW,
  APPLIED_WORKFLOW_SOURCE,
  appliedCitation,
  appliedCounts,
  appliedEntry,
  appliedPart,
  appliedRelated,
  filterApplied,
} from '../../../shared/mcs-applied.mjs';
import type { AppliedEntry } from '../../../shared/mcs-applied.mjs';
import { MSC_2020 } from '../../../shared/mcs-framework.mjs';
import '../mcs-applied.css';

const PART_IDS = new Set(APPLIED_PARTS.map(part => part.id));
const MSC_CODES = new Set(MSC_2020.map(entry => entry.code));
const BRANCH_IDS = new Set(Object.keys(APPLIED_BRANCHES));
const MSC_TITLE = new Map(MSC_2020.map(entry => [entry.code, entry.title]));
const WORKFLOW_STORAGE = 'mcs-applied-workflow-v1';

type Filter = {
  part: string | null;
  msc: string | null;
  branch: string | null;
  query: string;
  mappedOnly: boolean;
  entryId: string | null;
};

function readFilter(params: URLSearchParams): Filter {
  const part = params.get('part');
  const msc = params.get('msc');
  const branch = params.get('branch');
  const entry = params.get('entry');
  return {
    part: part && PART_IDS.has(part) ? part : null,
    msc: msc && MSC_CODES.has(msc) ? msc : null,
    branch: branch && BRANCH_IDS.has(branch) ? branch : null,
    query: params.get('q') ?? '',
    mappedOnly: params.get('mapped') === '1',
    entryId: entry && appliedEntry(entry) ? entry : null,
  };
}

/** 一句导读在卡片与详情里共用；详情里展开为完整句子。 */
function noteOf(entry: AppliedEntry, locale: string) {
  return locale === 'en' ? entry.note.en : entry.note.zh;
}

export function McsApplied() {
  const { pick, locale } = useI18n();
  const location = useLocation();
  const navigate = useNavigate();
  const narrow = useMediaQuery('(max-width: 860px)');
  const params = new URLSearchParams(location.search);
  const filter = readFilter(params);
  const counts = useMemo(() => appliedCounts(), []);
  const entries = useMemo(
    () => filterApplied({
      part: filter.part,
      msc: filter.msc,
      branch: filter.branch,
      query: filter.query,
      mappedOnly: filter.mappedOnly,
    }),
    [filter.part, filter.msc, filter.branch, filter.query, filter.mappedOnly],
  );
  const selected = filter.entryId ? appliedEntry(filter.entryId) : null;
  const related = useMemo(() => appliedRelated(selected), [selected]);
  const [draft, setDraft] = useState(filter.query);
  const [workflowOpen, setWorkflowOpen] = useState(() => {
    try {
      const saved = window.localStorage.getItem(WORKFLOW_STORAGE);
      if (saved === '1' || saved === '0') return saved === '1';
    } catch { /* Storage unavailable: fall back to the viewport default. */ }
    return !narrow;
  });
  const [shareUrl, setShareUrl] = useState('');
  const [notice, setNotice] = useState('');
  const [copied, setCopied] = useState<string | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const detailRef = useRef<HTMLElement>(null);

  /*
   * 搜索框用本地 draft，URL 是筛选的单一事实来源。浏览器 Back/Forward
   * 会发 popstate，这时才从 URL 回填；站内 navigate 用 pushState 不发
   * popstate，因此快速输入不会被异步 URL 更新覆盖而丢字。
   */
  useEffect(() => {
    const sync = () => setDraft(new URLSearchParams(window.location.search).get('q') ?? '');
    window.addEventListener('popstate', sync);
    return () => window.removeEventListener('popstate', sync);
  }, []);

  const update = useCallback((
    patch: Partial<Record<'part' | 'msc' | 'branch' | 'q' | 'mapped' | 'entry', string | null>>,
    { replace = true }: { replace?: boolean } = {},
  ) => {
    const merged: Record<string, string | null> = {
      part: filter.part,
      msc: filter.msc,
      branch: filter.branch,
      q: draft || null,
      mapped: filter.mappedOnly ? '1' : null,
      entry: filter.entryId,
      ...patch,
    };
    const next = new URLSearchParams();
    next.set('view', 'applied');
    for (const [key, value] of Object.entries(merged)) if (value) next.set(key, value);
    navigate({ pathname: location.pathname, search: `?${next.toString()}` }, { replace });
  }, [draft, filter.part, filter.msc, filter.branch, filter.mappedOnly, filter.entryId, location.pathname, navigate]);

  useEffect(() => {
    if (filter.entryId && !entries.some(entry => entry.id === filter.entryId)) update({ entry: null });
  }, [entries, filter.entryId, update]);

  useEffect(() => {
    if (filter.entryId) detailRef.current?.focus({ preventScroll: true });
  }, [filter.entryId]);

  // 换编/换码/改搜索时回到结果顶部；选中条目时保持列表位置。
  useEffect(() => {
    listRef.current?.scrollTo({ top: 0 });
  }, [filter.part, filter.msc, filter.branch, filter.query, filter.mappedOnly]);

  // 从地图/深链进入某条时，把列表里的同一张卡滚到可见处。放在重置之后，
  // 这样首次挂载时不会被“回到顶部”覆盖。
  useEffect(() => {
    if (!filter.entryId || !listRef.current) return;
    listRef.current
      .querySelector(`[data-applied-entry="${filter.entryId}"]`)
      ?.scrollIntoView({ block: 'nearest' });
  }, [filter.entryId]);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const typing = Boolean(target?.closest('input, textarea, select, [contenteditable="true"]'));
      if (event.key === '/' && !typing) {
        event.preventDefault();
        searchRef.current?.focus();
        searchRef.current?.select();
        return;
      }
      if (event.key !== 'Escape' || event.defaultPrevented) return;
      if (filter.entryId) { event.preventDefault(); update({ entry: null }); return; }
      if (draft) { event.preventDefault(); setDraft(''); update({ q: null }); return; }
      if (filter.part || filter.msc || filter.branch || filter.mappedOnly) {
        event.preventDefault();
        update({ part: null, msc: null, branch: null, q: null, mapped: null, entry: null });
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [draft, filter.entryId, filter.part, filter.msc, filter.branch, filter.mappedOnly, update]);

  const mscCodes = useMemo(() => Object.keys(counts.msc).sort((a, b) => Number(a) - Number(b)), [counts]);
  const groups = useMemo(
    () => APPLIED_PARTS
      .map(part => ({ part, entries: entries.filter(entry => entry.part === part.id) }))
      .filter(group => group.entries.length > 0),
    [entries],
  );
  const activePart = filter.part ? appliedPart(filter.part) : null;
  const activeBranch = filter.branch ? APPLIED_BRANCHES[filter.branch] : null;
  const activeMsc = filter.msc ? MSC_TITLE.get(filter.msc) : null;
  const sourceText = locale === 'en'
    ? `Based on the contents of ${APPLIED_BOOK.title} (ed. ${APPLIED_BOOK.editor}; ${APPLIED_BOOK.publisher}, ${APPLIED_BOOK.year}; ISBN ${APPLIED_BOOK.isbn}). English titles follow the book’s contents; Chinese titles and one-line notes are original site writing, not quotations; pages are printed pages. MSC codes are site retrieval tags, not the book’s classification. No full text, figures or exercises are reproduced.`
    : `据 ${APPLIED_BOOK.title}（${APPLIED_BOOK.editor} 编，${APPLIED_BOOK.publisher}，${APPLIED_BOOK.year}；ISBN ${APPLIED_BOOK.isbn}）目录编成。英文标题照录目录，中文标题与一句导读为本站译写，不是原文摘录；页码为原书页码。MSC 码是站内检索标签，不是原书分类。本站不收录原文、图表或习题。`;

  const share = async () => {
    const url = new URL(window.location.href);
    const next = new URLSearchParams(location.search);
    next.set('view', 'applied');
    if (draft) next.set('q', draft); else next.delete('q');
    url.search = next.toString();
    setShareUrl(url.href);
    try {
      await navigator.clipboard.writeText(url.href);
      setNotice(pick({ zh: '索引链接已复制。', en: 'Index link copied.' }));
    } catch {
      setNotice(pick({ zh: '请复制下方索引链接。', en: 'Copy the index link below.' }));
    }
  };

  const copyCitation = async (entry: AppliedEntry) => {
    const text = appliedCitation(entry, locale);
    try {
      await navigator.clipboard.writeText(text);
      setCopied(entry.id);
      setNotice(pick({ zh: '引用已复制。', en: 'Citation copied.' }));
      window.setTimeout(() => setCopied(null), 1800);
    } catch {
      setNotice(pick({ zh: '请手动选择下方引用文本。', en: 'Select the citation text below.' }));
    }
  };

  const openBranch = (id: string) => navigate(`${location.pathname}?branch=${encodeURIComponent(id)}`);
  const select = (entry: AppliedEntry) => update({ entry: entry.id }, { replace: false });
  const closeDetail = () => update({ entry: null });
  const clearAll = () => {
    setDraft('');
    update({ part: null, msc: null, branch: null, q: null, mapped: null, entry: null });
  };
  const togglePart = (id: string) => update({ part: filter.part === id ? null : id, entry: null });
  const toggleMsc = (code: string) => update({ msc: filter.msc === code ? null : code, entry: null });
  const toggleWorkflow = () => setWorkflowOpen(value => {
    const next = !value;
    try { window.localStorage.setItem(WORKFLOW_STORAGE, next ? '1' : '0'); } catch { /* Ignore storage failures. */ }
    return next;
  });
  const filterActive = Boolean(filter.part || filter.msc || filter.branch || filter.query || filter.mappedOnly);
  const detailVisible = narrow && selected !== null;

  return <section className="mcs-workspace mcs-applied-workspace" data-mcs-applied aria-label={pick({ zh: 'MCS 应用数学索引', en: 'MCS applied mathematics index' })}>
    <header className="mcs-toolbar">
      <div className="mcs-title"><h1>MCS <span>{pick({ zh: '应用数学索引', en: 'Applied mathematics index' })}</span></h1></div>
      <label className="mcs-search mcs-toolbar-search">
        <span className="sr-only">{pick({ zh: '搜索 186 节', en: 'Search 186 sections' })}</span>
        <input
          ref={searchRef}
          data-applied-search
          type="search"
          value={draft}
          onChange={event => {
            const value = event.target.value;
            setDraft(value);
            update({ q: value || null });
          }}
          onKeyDown={event => {
            if (event.key === 'Enter') {
              event.preventDefault();
              update({ q: draft || null });
            }
          }}
          placeholder={pick({ zh: '搜索节号、标题、导读或 MSC…', en: 'Find a section, title, note or MSC…' })}
          aria-label={pick({ zh: '搜索 186 节', en: 'Search 186 sections' })}
        />
      </label>
      <div className="mcs-toolbar-actions">
        <McsModeSwitch mode="applied" />
        <button type="button" onClick={share}>{pick({ zh: '分享视图', en: 'Share view' })}</button>
      </div>
    </header>

    <div className={`mcs-applied-stage${detailVisible ? ' is-detail' : ''}`}>
      {!detailVisible && <aside className="mcs-applied-rail" aria-label={pick({ zh: '按编与主题码筛选', en: 'Filter by part and subject code' })}>
        <p className="mcs-applied-rail-title">{pick({ zh: '八编', en: 'Eight parts' })}</p>
        <button
          type="button"
          className={`mcs-applied-part${!filter.part ? ' is-active' : ''}`}
          aria-pressed={!filter.part}
          onClick={() => update({ part: null, entry: null })}
        >
          <span>{pick({ zh: '全部', en: 'All' })}</span><small>{counts.total}</small>
        </button>
        {APPLIED_PARTS.map(part => <button
          key={part.id}
          type="button"
          data-applied-part={part.id}
          className={`mcs-applied-part${filter.part === part.id ? ' is-active' : ''}`}
          aria-pressed={filter.part === part.id}
          onClick={() => togglePart(part.id)}
        >
          <span><b>{part.id}</b>{pick(part.title)}</span><small>{counts.parts[part.id]}</small>
        </button>)}

        <details className="mcs-applied-msc" open={Boolean(filter.msc)}>
          <summary>{pick({ zh: '主题码', en: 'Subject codes' })} <small>{mscCodes.length}</small></summary>
          <div className="mcs-applied-msc-list">
            {mscCodes.map(code => {
              const title = MSC_TITLE.get(code);
              return <button
                key={code}
                type="button"
                data-applied-msc={code}
                aria-pressed={filter.msc === code}
                className={filter.msc === code ? 'is-active' : undefined}
                title={title ? `MSC ${code} · ${pick(title)}` : `MSC ${code}`}
                onClick={() => toggleMsc(code)}
              >{code}</button>;
            })}
          </div>
        </details>

        <label className="mcs-applied-check">
          <input
            data-applied-mapped
            type="checkbox"
            checked={filter.mappedOnly}
            onChange={event => update({ mapped: event.target.checked ? '1' : null, entry: null })}
          />
          {pick({ zh: '只看有地图入口', en: 'Mapped only' })}
        </label>

        {filterActive ? <button type="button" className="mcs-text-button" data-applied-clear onClick={clearAll}>
          {pick({ zh: '清除筛选', en: 'Clear filters' })}
        </button> : null}

        <p className="mcs-meta mcs-applied-rail-note">
          {pick({ zh: '书目索引只做阅读导航：不新增形式对象、数学关系或阅读节点。', en: 'A reading index only: it adds no formal objects, mathematical relations or reading nodes.' })}
        </p>
      </aside>}

      {!detailVisible && <div className="mcs-applied-list" data-applied-list ref={listRef}>
        <div className="mcs-applied-list-head">
          <p>
            {activePart ? `${activePart.id} · ${pick(activePart.title)}` : filterActive ? pick({ zh: '筛选结果', en: 'Filtered results' }) : pick({ zh: '全部 186 节', en: 'All 186 sections' })}
            {activeMsc ? ` · MSC ${filter.msc}${activeMsc ? ` ${pick(activeMsc)}` : ''}` : ''}
            {activeBranch ? ` · ${pick(activeBranch)}` : ''}
          </p>
          <span aria-live="polite" data-applied-count>{entries.length} / {counts.total}</span>
        </div>

        <button
          type="button"
          className="mcs-applied-workflow-toggle"
          data-applied-workflow-toggle
          aria-expanded={workflowOpen}
          onClick={toggleWorkflow}
        >
          <span>{pick({ zh: '应用数学工作流', en: 'Applied mathematics workflow' })}</span>
          <small>{pick(APPLIED_WORKFLOW_SOURCE.title)}</small>
          <b aria-hidden="true">{workflowOpen ? '−' : '+'}</b>
        </button>
        {workflowOpen ? <ol className="mcs-applied-workflow" data-applied-workflow>
          {APPLIED_WORKFLOW.map((step, index) => <li key={step.id}>
            <span aria-hidden="true">{index + 1}</span>
            <strong>{pick(step.title)}</strong>
            <p>{pick(step.note)}</p>
          </li>)}
        </ol> : null}

        {groups.map(group => <section key={group.part.id} className="mcs-applied-group" data-applied-group={group.part.id}>
          {!filter.part ? <h2><span>{group.part.id}</span>{pick(group.part.title)}<small>{group.entries.length}</small></h2> : null}
          <ul>{group.entries.map(entry => <li key={entry.id}>
            <button
              type="button"
              data-applied-entry={entry.id}
              className={`mcs-applied-card${filter.entryId === entry.id ? ' is-selected' : ''}`}
              aria-current={filter.entryId === entry.id ? 'true' : undefined}
              onClick={() => select(entry)}
            >
              <span className="mcs-applied-card-top"><b>{entry.id}</b><span>p. {entry.page}</span></span>
              <strong>{pick(entry.title)}</strong>
              {locale === 'zh' ? <small lang="en">{entry.title.en}</small> : null}
              <span className="mcs-applied-card-note">{noteOf(entry, locale)}</span>
              <span className="mcs-applied-card-foot">
                {entry.msc.map(code => <i key={code}>{code}</i>)}
                {entry.branches.length ? <em>{pick({ zh: `地图 ${entry.branches.length}`, en: `Map ${entry.branches.length}` })}</em> : null}
              </span>
            </button>
          </li>)}</ul>
        </section>)}

        {!entries.length ? <p className="mcs-applied-empty" role="status">
          {pick({ zh: '没有匹配的条目。', en: 'No matching sections.' })}
          {' '}<button type="button" className="mcs-text-button" onClick={clearAll}>{pick({ zh: '清除筛选', en: 'Clear filters' })}</button>
        </p> : null}

        <details className="mcs-applied-source" data-applied-source>
          <summary>{pick({ zh: '来源与使用边界', en: 'Source and boundaries' })}</summary>
          <p>{sourceText}</p>
          <a href={APPLIED_BOOK.url} target="_blank" rel="noreferrer">{pick({ zh: '出版社页面', en: 'Publisher page' })} ↗</a>
        </details>
      </div>}

      {selected && <aside
        ref={detailRef}
        className="mcs-applied-detail"
        data-applied-detail
        tabIndex={-1}
        aria-label={pick({ zh: '条目详情', en: 'Section details' })}
      >
        <header className="mcs-applied-detail-head">
          <span className="mcs-eyebrow">{activePart ? `${activePart.id} · ${pick(activePart.title)}` : `${selected.part} · ${pick(appliedPart(selected.part)!.title)}`}</span>
          <h2>{pick(selected.title)}</h2>
          {locale === 'zh' ? <p lang="en">{selected.title.en}</p> : null}
          {narrow
            ? <button type="button" className="mcs-text-button" onClick={closeDetail}>{pick({ zh: '返回列表', en: 'Back to list' })}</button>
            : <button type="button" className="mcs-icon-button" onClick={closeDetail} aria-label={pick({ zh: '关闭详情', en: 'Close details' })}>×</button>}
        </header>

        <p className="mcs-applied-detail-note">{noteOf(selected, locale)}</p>

        <dl className="mcs-applied-facts">
          <div><dt>{pick({ zh: '原书位置', en: 'In the book' })}</dt><dd>{selected.part}.{selected.number} · p. {selected.page}</dd></div>
          {selected.msc.length ? <div><dt>{pick({ zh: '主题码', en: 'Subject codes' })}</dt><dd className="mcs-applied-codes">
            {selected.msc.map(code => <button
              key={code}
              type="button"
              aria-pressed={filter.msc === code}
              className={filter.msc === code ? 'is-active' : undefined}
              onClick={() => toggleMsc(code)}
            >{code}</button>)}
          </dd></div> : null}
        </dl>

        {selected.branches.length ? <section className="mcs-applied-detail-section">
          <h3>{pick({ zh: '数学地图入口', en: 'Map entrances' })}</h3>
          <div className="mcs-applied-branches">
            {selected.branches.map(id => <button key={id} type="button" data-applied-branch={id} onClick={() => openBranch(id)}>
              {pick(APPLIED_BRANCHES[id])} →
            </button>)}
          </div>
        </section> : null}

        <div className="mcs-applied-actions">
          <button type="button" className="button" onClick={() => copyCitation(selected)}>
            {copied === selected.id ? pick({ zh: '已复制', en: 'Copied' }) : pick({ zh: '复制引用', en: 'Copy citation' })}
          </button>
          {related.prev ? <button type="button" onClick={() => select(related.prev!)}>← {related.prev.id}</button> : null}
          {related.next ? <button type="button" onClick={() => select(related.next!)}>{related.next.id} →</button> : null}
        </div>
        <p className="mcs-applied-citation">{appliedCitation(selected, locale)}</p>

        {related.sameMsc.length ? <section className="mcs-applied-detail-section">
          <h3>{pick({ zh: '同主题码', en: 'Same subject codes' })}</h3>
          <div className="mcs-applied-related">{related.sameMsc.map(entry => <button key={entry.id} type="button" onClick={() => select(entry)}>
            <b>{entry.id}</b>{pick(entry.title)}
          </button>)}</div>
        </section> : null}

        {related.sameBranch.length ? <section className="mcs-applied-detail-section">
          <h3>{pick({ zh: '同地图分支', en: 'Same map branch' })}</h3>
          <div className="mcs-applied-related">{related.sameBranch.map(entry => <button key={entry.id} type="button" onClick={() => select(entry)}>
            <b>{entry.id}</b>{pick(entry.title)}
          </button>)}</div>
        </section> : null}
      </aside>}
    </div>

    <footer className="mcs-statusbar">
      <span>{pick({ zh: `${counts.total} 节 · 8 编 · 原书页码`, en: `${counts.total} sections · 8 parts · printed pages` })}</span>
      <span>{pick({ zh: '导读为本站译写；条目不是形式对象', en: 'Notes are site-written; entries are not formal objects' })}</span>
    </footer>

    {notice || shareUrl ? <div className="mcs-notice" role="status">
      <button type="button" className="mcs-icon-button" aria-label={pick({ zh: '关闭提示', en: 'Dismiss' })} onClick={() => { setNotice(''); setShareUrl(''); }}>×</button>
      {notice ? <p>{notice}</p> : null}
      {shareUrl ? <input readOnly value={shareUrl} onFocus={event => event.currentTarget.select()} aria-label={pick({ zh: '索引分享链接', en: 'Index share link' })} /> : null}
    </div> : null}
  </section>;
}
