import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useApi, formatError } from '../api';
import { useI18n } from '../i18n';
import type { McsViewData, McsViewState } from '../../../shared/mcs-view.mjs';
import {
  MCS_STORAGE_KEY, MCS_LEGACY_STORAGE_KEY, mcsOverviewCamera, setMcsLevel, defaultMcsState, createMcsLayout, positionedMcsLayout, filterMcsObjects,
  visibleMcsBoxes, updateMcsLod, normalizeMcsState, encodeMcsState, decodeMcsState, resizeMcsCamera,
} from '../../../shared/mcs-space.mjs';
import type { McsBox } from '../../../shared/mcs-space.mjs';
import { McsCanvas } from '../components/McsCanvas';
import { McsInspector } from '../components/McsInspector';
import { McsAtlas } from '../components/McsAtlas';
import { McsApplied } from '../components/McsApplied';
import { MCS_SCALES, MCS_RELATIONS } from '../mcs-ui';
import { rememberMcsReturn } from '../mcs-return';
import '../mcs-space.css';

type Size = { width: number; height: number };
function initialView(data: McsViewData) {
  // A browser Back/Forward entry is the view the learner just left. A newly
  // opened share link has no entry snapshot and still takes priority over local storage.
  const returned = window.history.state?.usr?.mcsReturn;
  const entry = window.history.state?.mcsView ?? (returned ? { hash: window.location.hash, state: returned } : null);
  if (entry?.hash === window.location.hash) {
    const restored = normalizeMcsState(entry.state, data);
    return { ...restored, restored: true };
  }
  const shared = decodeMcsState(window.location.hash, data);
  if (shared) return { ...shared, restored: true };
  const issues = window.location.hash.startsWith('#mcs=') ? ['share: the view link could not be read; using the local view or default overview'] : [];
  try {
    const raw = localStorage.getItem(MCS_STORAGE_KEY) ?? localStorage.getItem(MCS_LEGACY_STORAGE_KEY);
    if (raw) { const restored = normalizeMcsState(JSON.parse(raw), data); return { ...restored, issues: [...issues, ...restored.issues], restored: true }; }
  } catch { issues.push('local: the saved view could not be read; starting from the default overview'); }
  return { state: defaultMcsState(data), issues, restored: false };
}
function fitBoxes(boxes: McsBox[], size: Size) {
  if (!boxes.length) return { x: size.width / 2, y: size.height / 2, scale: 1 };
  const minX = Math.min(...boxes.map(b => b.x)), minY = Math.min(...boxes.map(b => b.y));
  const maxX = Math.max(...boxes.map(b => b.x + b.w)), maxY = Math.max(...boxes.map(b => b.y + b.h));
  const scale = Math.max(.015, Math.min(6, (size.width - 96) / (maxX - minX + 1), (size.height - 120) / (maxY - minY + 1)));
  return { x: size.width / 2 - (minX + maxX) / 2 * scale, y: size.height / 2 - (minY + maxY) / 2 * scale, scale };
}
function toggleValue(values: string[], value: string) { return values.includes(value) ? values.filter(v => v !== value) : [...values, value]; }

export function McsPage() {
  const location = useLocation(), navigate = useNavigate();
  const { pick } = useI18n();
  const params = new URLSearchParams(location.search);
  // app 模式不请求 mcs-view：索引是静态书目录，接口不可用时仍可读。
  const applied = params.get('view') === 'applied';
  const result = useApi<McsViewData>(applied ? null : '/ontology/mcs-view');
  if (applied) return <McsApplied />;
  if (result.error) return <section className="page"><h1>MCS</h1><p role="alert">{formatError(result.error)}</p><button type="button" className="button" onClick={result.reload}>{pick({ zh: '重试', en: 'Retry' })}</button></section>;
  if (!result.data) return <section className="page" role="status">{pick({ zh: '正在读取数学对象空间…', en: 'Loading the mathematical object space…' })}</section>;
  const objects = params.get('view') === 'objects' || location.hash.startsWith('#mcs=') || Boolean(location.state?.mcsReturn);
  const openApplied = (target: { entry?: string; branch?: string; msc?: string }) => {
    const search = new URLSearchParams({ view: 'applied' });
    if (target.entry) search.set('entry', target.entry);
    if (target.branch) search.set('branch', target.branch);
    if (target.msc) search.set('msc', target.msc);
    navigate(`${location.pathname}?${search.toString()}`);
  };
  return objects ? <McsWorkspace key={result.data.objectVersion} data={result.data} initialObject={params.get('object')} />
    : <McsAtlas key={location.key} data={result.data} initialBranch={params.get('branch')} onOpenApplied={openApplied} onOpenObject={id => navigate(`${location.pathname}?view=objects${id ? `&object=${encodeURIComponent(id)}` : ''}`)} />;
}

function McsWorkspace({ data, initialObject }: { data: McsViewData; initialObject: string | null }) {
  const { pick, hrefFor } = useI18n(), location = useLocation(), navigate = useNavigate();
  const [initial] = useState(() => initialView(data));
  const [issues, setIssues] = useState(initial.issues);
  const [state, setState] = useState<McsViewState>(initial.state);
  const [size, setSize] = useState<Size>({ width: 0, height: 0 });
  const [filtersOpen, setFiltersOpen] = useState(false);
  const relationIds = state.relationIds ?? [];
  const setRelationIds = useCallback((ids: string[]) => setState(s => ({ ...s, relationIds: ids })), []);
  const [message, setMessage] = useState('');
  const [storageError, setStorageError] = useState(false);
  const [shareText, setShareText] = useState('');
  const initialFit = useRef(initial.restored);
  const measuredSize = useRef<Size | null>(null);
  const pendingSelection = useRef<number | undefined>(undefined);
  const workspace = useRef<HTMLElement>(null);
  const base = useMemo(() => createMcsLayout(data), [data]);
  const positioned = useMemo(() => positionedMcsLayout(base, state.positions), [base, state.positions]);
  const filtered = useMemo(() => filterMcsObjects(data, state.filters), [data, state.filters]);
  const displayExpanded = state.expanded;
  const displayState = useMemo(() => ({ ...state, expanded: displayExpanded }), [state, displayExpanded]);
  const boxes = useMemo(() => visibleMcsBoxes(data, positioned, displayState, filtered), [data, positioned, displayExpanded, state.manual, filtered]);
  const selectedBox = state.selected ? positioned.boxes[state.selected] : undefined;
  const selectedObject = data.objects.find(o => o.id === selectedBox?.objectId);
  const kinds = useMemo(() => [...new Set(data.relations.map(r => r.kind))].sort(), [data]);
  const evidence = useMemo(() => [...new Set([...data.objects.flatMap(o => o.declarations.map(d => d.status)), ...data.relations.map(r => r.evidence.status)])].sort(), [data]);
  const onResize = useCallback((next: Size) => {
    if (next.width < 1 || next.height < 1) return;
    const before = measuredSize.current;
    if (before?.width === next.width && before.height === next.height) return;
    measuredSize.current = next; setSize(next);
    setState(s => {
      const previous = before ?? s.viewport;
      if (!previous) return { ...s, viewport: next };
      const factor = mcsOverviewCamera(data, base, next).scale / mcsOverviewCamera(data, base, previous).scale;
      const scale = Math.max(.015, Math.min(24, s.camera.scale * factor));
      return { ...s, viewport: next, camera: { scale,
        x: next.width / 2 - (previous.width / 2 - s.camera.x) / s.camera.scale * scale,
        y: next.height / 2 - (previous.height / 2 - s.camera.y) / s.camera.scale * scale } };
    });
  }, [data, base]);
  useEffect(() => {
    if (initialFit.current || size.width < 20) return;
    initialFit.current = true;
    setState(s => ({ ...s, camera: mcsOverviewCamera(data, base, size) }));
  }, [base, positioned, size]);
  const saveHistory = useCallback((view: McsViewState) => {
    try {
      window.history.replaceState({ ...window.history.state, mcsView: { hash: window.location.hash, state: view } }, '');
    } catch { /* Local storage and the explicit share action remain available. */ }
  }, []);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      saveHistory(state);
      try { localStorage.setItem(MCS_STORAGE_KEY, JSON.stringify(state)); setStorageError(false); }
      catch { setStorageError(true); }
    }, 180);
    return () => clearTimeout(timer);
  }, [state, saveHistory]);
  // Persist the last pointer frame as well when navigating away before the debounce.
  const latest = useRef(state);
  useEffect(() => { latest.current = state; }, [state]);
  useEffect(() => {
    // Do not write history during unmount: the router has already changed entries.
    const save = () => { try { localStorage.setItem(MCS_STORAGE_KEY, JSON.stringify(latest.current)); } catch { /* Already reported in the visible page. */ } };
    window.addEventListener('pagehide', save); return () => { save(); window.removeEventListener('pagehide', save); };
  }, []);
  // Flush this entry before a detail link changes the history index.
  const rememberEntry = (view = latest.current) => { saveHistory(view); rememberMcsReturn(view); };
  const restoredHash = useRef(location.hash);
  useEffect(() => {
    if (restoredHash.current === location.hash) return;
    restoredHash.current = location.hash;
    const shared = decodeMcsState(location.hash, data);
    if (shared) {
      const currentSize = measuredSize.current;
      setState(currentSize && shared.state.viewport ? { ...shared.state, viewport: currentSize, camera: resizeMcsCamera(shared.state.camera, shared.state.viewport, currentSize, true) } : shared.state);
      setIssues(shared.issues); initialFit.current = true;
    } else if (location.hash.startsWith('#mcs=')) setIssues(['share: the view link could not be read; retained the current view']);
  }, [location.hash, data]);
  useEffect(() => () => window.clearTimeout(pendingSelection.current), []);
  const cancelSelection = useCallback(() => { window.clearTimeout(pendingSelection.current); }, []);
  const select = useCallback((id: string, immediate = false) => {
    cancelSelection();
    if (immediate) { setRelationIds([]); setState(s => ({ ...s, selected: id })); return; }
    // Give the native double-click sequence time to complete before the detail
    // panel resizes the canvas beneath its second click.
    pendingSelection.current = window.setTimeout(() => {
      setRelationIds([]); setState(s => ({ ...s, selected: id }));
    }, 320);
  }, [cancelSelection]);
  const zoom = useCallback((factor: number, point: { x: number; y: number }) => {
    setState(old => {
      const camera = old.camera, scale = Math.max(.015, Math.min(24, camera.scale * factor));
      const focus = { x: (point.x - camera.x) / camera.scale, y: (point.y - camera.y) / camera.scale };
      const next = { ...old, camera: { scale, x: point.x - focus.x * scale, y: point.y - focus.y * scale } };
      return updateMcsLod(data, base, next, focus);
    });
  }, [data, base]);
  const locate = useCallback((id: string, requested?: number) => {
    cancelSelection();
    const entry = positioned.boxes[id]; if (!entry) return;
    const objectId = entry.kind === 'reference' ? entry.target! : entry.objectId;
    const target = positioned.boxes[objectId]; if (!target) return;
    const object = data.objects.find(o => o.id === objectId)!;
    const level = requested ?? (object.scale === 'subdiscipline' ? 1 : object.scale === 'topic' ? 2 : 3);
    setRelationIds([]);
    setState(old => {
      const filters = filtered.matched.has(objectId) ? { ...old.filters, query: '' } : { ...defaultMcsState(data).filters, relations: old.filters.relations };
      const nextLevel = requested === undefined ? Math.max(old.level, level) : level;
      const scale = mcsOverviewCamera(data, base, size).scale * [0.5, 1, 2.1, 4.2][nextLevel];
      return setMcsLevel(data, { ...old, selected: objectId, filters,
        camera: { scale, x: size.width / 2 - (target.x + target.w / 2) * scale, y: size.height / 2 - (target.y + target.h / 2) * scale } }, nextLevel, 'auto');
    });
  }, [data, base, positioned, size, cancelSelection, filtered, setRelationIds]);
  const focus = useCallback((id: string) => locate(id), [locate]);
  const entryLocated = useRef(false);
  useEffect(() => {
    if (entryLocated.current || size.width < 20 || !initialObject) return;
    entryLocated.current = true;
    if (!window.history.state?.mcsView && !location.state?.mcsReturn) locate(initialObject);
  }, [initialObject, size.width, locate, location.state]);
  const openNote = (id: string) => {
    cancelSelection();
    const box = positioned.boxes[id]; if (!box) return;
    const note = data.notes?.byObject[box.objectId]?.find(n => n.coverage !== 'related');
    if (!note) { focus(id); return; }
    const view = { ...latest.current, selected: id, relationIds: [] };
    rememberEntry(view);
    // Flush before navigation; double-click can finish before the save debounce.
    try { localStorage.setItem(MCS_STORAGE_KEY, JSON.stringify(view)); } catch { /* History retains the view. */ }
    latest.current = view;
    navigate(hrefFor(note.href));
  };
  const toggle = useCallback((_id: string) => setState(old => setMcsLevel(data, old, Math.min(3, old.level + 1))), [data]);
  const overview = () => { cancelSelection(); setRelationIds([]); setState(s => setMcsLevel(data, { ...s, selected: null, filters: defaultMcsState(data).filters, camera: mcsOverviewCamera(data, base, size) }, 1, 'auto')); };
  const changeFilter = <K extends keyof McsViewState['filters']>(key: K, value: McsViewState['filters'][K]) => setState(s => ({ ...s, filters: { ...s.filters, [key]: value } }));
  const share = async () => {
    const url = new URL(window.location.href); url.hash = encodeMcsState(state);
    setShareText(url.href);
    try { await navigator.clipboard.writeText(url.href); setMessage(pick({ zh: '公共视图链接已复制。', en: 'Public view link copied.' })); }
    catch { setMessage(pick({ zh: '请复制下方视图链接。', en: 'Copy the view link below.' })); }
  };
  const canExpand = Boolean(state.level < 3 && state.selected && base.children[state.selected]?.length);
  const inspector = Boolean(selectedObject || relationIds.length);
  useEffect(() => {
    const escape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || event.defaultPrevented) return;
      if (document.querySelector('.connection-note-dialog[open]')) return;
      cancelSelection();
      if (issues.length || message || shareText) { setIssues([]); setMessage(''); setShareText(''); }
      else if (filtersOpen) setFiltersOpen(false);
      else { setRelationIds([]); setState(s => ({ ...s, selected: null })); }
      workspace.current?.querySelector<SVGSVGElement>('[data-mcs-canvas]')?.focus();
      event.preventDefault();
    };
    window.addEventListener('keydown', escape);
    return () => window.removeEventListener('keydown', escape);
  }, [cancelSelection, issues.length, message, shareText, filtersOpen, setRelationIds]);
  return <section ref={workspace} className={`mcs-workspace${filtersOpen ? ' has-filters' : ''}${inspector ? ' has-inspector' : ''}`} onClickCapture={event => { if ((event.target as Element).closest('a[href]')) rememberEntry(); }} aria-label={pick({ zh: 'MCS 多尺度数学对象空间', en: 'MCS multiscale mathematical object space' })}>
    <header className="mcs-toolbar">
      <div className="mcs-title"><h1>MCS</h1></div>
      <button type="button" className="mcs-text-button" onClick={() => navigate(location.pathname)}>{pick({ zh: '数学地图', en: 'Math map' })}</button>
      <label className="mcs-search mcs-toolbar-search"><span className="sr-only">{pick({ zh: '搜索对象与公式', en: 'Search objects and formulas' })}</span><input type="search" aria-label={pick({ zh: '搜索对象与公式', en: 'Search objects and formulas' })} value={state.filters.query} placeholder={pick({ zh: '搜索专题、对象与公式…', en: 'Search topics, objects and formulas…' })} onChange={e => changeFilter('query', e.target.value)} /></label>
      <div className="mcs-toolbar-actions">
        <label>{pick({ zh: '层级', en: 'Level' })}<select aria-label={pick({ zh: '显示层级', en: 'Display level' })} value={state.lodMode === 'auto' ? 'auto' : state.level} onChange={e => { const choice = e.target.value; setState(s => choice === 'auto' ? updateMcsLod(data, base, { ...s, lodMode: 'auto' }, { x: 0, y: 0 }) : setMcsLevel(data, s, Number(choice))); }}>
          <option value="auto">{pick({ zh: '自动', en: 'Auto' })}</option>{[{ zh: '子学科', en: 'Subdisciplines' }, { zh: '专题', en: 'Topics' }, { zh: '对象', en: 'Objects' }, { zh: '内部表达', en: 'Expressions' }].map((t,i) => <option key={i} value={i}>{pick(t)}</option>)}
        </select></label>
        <label>{pick({ zh: '连线', en: 'Links' })}<select aria-label={pick({ zh: '连线显示', en: 'Link visibility' })} value={state.edgeMode} onChange={e => { const edgeMode = e.target.value as McsViewState['edgeMode']; setState(s => ({ ...s, edgeMode })); }}><option value="selected">{pick({ zh: '关联优先', en: 'Related first' })}</option><option value="all">{pick({ zh: '全部', en: 'All' })}</option><option value="none">{pick({ zh: '隐藏', en: 'Hidden' })}</option></select></label>
        <button type="button" aria-expanded={filtersOpen} onClick={() => setFiltersOpen(v => !v)}>{pick({ zh: '滤镜', en: 'Filters' })}</button>
        <button type="button" onClick={overview}>{pick({ zh: '回到概览', en: 'Overview' })}</button>
        <button type="button" onClick={share}>{pick({ zh: '分享视图', en: 'Share view' })}</button>
      </div>
    </header>
    <div className="mcs-stage">
      {filtersOpen ? <aside className="mcs-filters" aria-label={pick({ zh: '视图滤镜', en: 'View filters' })}>
        <div className="mcs-panel-heading"><h2>{pick({ zh: '选择观察角度', en: 'Choose a perspective' })}</h2><button type="button" className="mcs-icon-button" onClick={() => setFiltersOpen(false)} aria-label={pick({ zh: '关闭滤镜', en: 'Close filters' })}>×</button></div>
        <fieldset><legend>{pick({ zh: '内容分组', en: 'Content groups' })}</legend>{data.groups.map(group => <label key={group.id}><input type="checkbox" checked={group.id === 'all' ? !state.filters.groups.length || state.filters.groups.includes('all') : state.filters.groups.includes(group.id)} onChange={() => changeFilter('groups', group.id === 'all' ? [] : toggleValue(state.filters.groups.filter(g => g !== 'all'), group.id))} />{pick(group.title)}<small>{group.objectIds.length}</small></label>)}</fieldset>
        <fieldset><legend>{pick({ zh: '对象尺度', en: 'Object scale' })}</legend>{data.levels.map(level => <label key={level.id}><input type="checkbox" checked={state.filters.scales.includes(level.id)} onChange={() => changeFilter('scales', toggleValue(state.filters.scales, level.id) as McsViewState['filters']['scales'])} /><span className={`mcs-scale-swatch mcs-scale-${level.id}`} />{pick(MCS_SCALES[level.id])}<small>{data.objects.filter(o => o.scale === level.id).length}</small></label>)}</fieldset>
        <fieldset><legend>{pick({ zh: '数学关系', en: 'Mathematical relations' })}</legend>{kinds.map(kind => <label key={kind}><input type="checkbox" checked={state.filters.relations.includes(kind)} onChange={() => changeFilter('relations', toggleValue(state.filters.relations, kind))} />{MCS_RELATIONS[kind] ? pick(MCS_RELATIONS[kind]) : kind}</label>)}</fieldset>
        <fieldset><legend>{pick({ zh: '证据标签', en: 'Evidence labels' })}</legend>{evidence.map(status => <label key={status}><input type="checkbox" checked={state.filters.evidence.includes(status)} onChange={() => changeFilter('evidence', toggleValue(state.filters.evidence, status))} />{status}</label>)}<p className="mcs-meta">{pick({ zh: '匹配对象声明或关联数学关系的登记标签；PROOF 不表示本次机器验证通过。', en: 'Matches labels on declarations or related mathematical relations. PROOF does not mean a successful machine check in this session.' })}</p></fieldset>
        <p className="mcs-meta">{pick({ zh: '未勾选表示全部。同类取并集，不同滤镜取交集。归属轮廓随匹配结果保留。', en: 'An empty selection means all. Choices within one filter are OR; different filters are AND. Parent outlines preserve context.' })}</p>
        <button type="button" className="mcs-text-button" onClick={() => setState(s => ({ ...s, filters: defaultMcsState(data).filters }))}>{pick({ zh: '清除所有滤镜', en: 'Clear all filters' })}</button>
      </aside> : null}
      <div className="mcs-viewport">
        <McsCanvas data={data} layout={positioned} state={displayState} boxes={boxes} matched={filtered.matched} counts={filtered.counts} setState={setState} onZoom={zoom} onSelect={select} onGestureStart={cancelSelection} onFocus={focus} onOpenNote={openNote} onRelations={ids => { cancelSelection(); setRelationIds(ids); setState(s => ({ ...s, selected: null })); }} onResize={onResize} />
        {state.filters.query.trim() && filtered.matched.size ? <div className="mcs-search-results" aria-label={pick({ zh: '搜索结果', en: 'Search results' })}>{data.objects.filter(o => filtered.matched.has(o.id)).slice(0, 20).map(o => <button type="button" key={o.id} onClick={() => locate(o.id, o.scale === 'subdiscipline' ? 0 : o.scale === 'topic' ? 1 : 2)}>{o.title}</button>)}</div> : null}
        {state.level <= 1 ? <nav className="mcs-mobile-topics" aria-label={pick({ zh: '专题概览', en: 'Topic overview' })}>{boxes.filter(b => b.kind === 'object' && !displayExpanded.includes(b.id)).map(b => {
          const object = data.objects.find(o => o.id === b.objectId)!;
          const title = data.presentation?.titles[object.id];
          const summary = data.presentation?.summaries[object.id];
          return <button type="button" key={b.id} onClick={() => select(b.id)} onDoubleClick={() => focus(b.id)}><strong>{title ? pick(title) : object.title}</strong>{summary ? <span>{pick(summary)}</span> : null}<small>{filtered.counts[object.id]?.matched ?? 0} / {filtered.counts[object.id]?.total ?? 0}</small></button>;
        })}</nav> : null}
        <div className="mcs-viewport-caption"><span className="mcs-live-dot" />{filtered.matched.size} / {data.objects.length} {pick({ zh: '数学对象', en: 'objects' })}<span>·</span>{data.relations.length} {pick({ zh: '已登记关系', en: 'registered relations' })}</div>
        {state.level >= 2 ? <div className="mcs-network-legend" aria-label={pick({ zh: '关系图例', en: 'Relation legend' })}>
          <strong>{pick({ zh: '同话题关系', en: 'Within a topic' })}</strong>
          {kinds.map(kind => <span key={kind} className={`mcs-legend-kind is-${kind}`}><i aria-hidden="true" />{MCS_RELATIONS[kind] ? pick(MCS_RELATIONS[kind]) : kind}</span>)}
          <small>{pick({ zh: '点线：引用／导入 · 点击箭头查看依据、添加备注', en: 'Dotted: references/imports · Select an arrow for evidence and notes' })}</small>
        </div> : null}
        {!filtered.matched.size ? <div className="mcs-empty" role="status"><strong>{pick({ zh: '没有匹配的数学对象', en: 'No mathematical objects match' })}</strong><p>{pick({ zh: '放宽滤镜，或清除关键词后再试。', en: 'Broaden the filters or clear your search.' })}</p></div> : null}
        <div className="mcs-camera-tools" aria-label={pick({ zh: '视角控制', en: 'Camera controls' })}>
          <button type="button" onClick={() => { const b = selectedBox; zoom(1 / 1.3, b ? { x: (b.x + b.w / 2) * state.camera.scale + state.camera.x, y: (b.y + b.h / 2) * state.camera.scale + state.camera.y } : { x: size.width / 2, y: size.height / 2 }); }} aria-label={pick({ zh: '缩小', en: 'Zoom out' })}>−</button><output>{Math.round(state.camera.scale / mcsOverviewCamera(data, base, size).scale * 100)}%</output>
          <button type="button" onClick={() => { const b = selectedBox; zoom(1.3, b ? { x: (b.x + b.w / 2) * state.camera.scale + state.camera.x, y: (b.y + b.h / 2) * state.camera.scale + state.camera.y } : { x: size.width / 2, y: size.height / 2 }); }} aria-label={pick({ zh: '放大', en: 'Zoom in' })}>＋</button>
          <button type="button" onClick={() => setState(s => updateMcsLod(data, base, { ...s, camera: fitBoxes(boxes.filter(b => b.kind === 'object' && !s.expanded.includes(b.id)), size) }, { x: 0, y: 0 }))}>{pick({ zh: '适配视野', en: 'Fit view' })}</button>
          <button type="button" onClick={() => setState(s => ({ ...s, positions: {} }))}>{pick({ zh: '重置布局', en: 'Reset layout' })}</button>
          <button type="button" onClick={() => setState(s => updateMcsLod(data, base, { ...s, lodMode: 'auto' }, { x: 0, y: 0 }))}>{pick({ zh: '自动尺度', en: 'Auto scale' })}</button>
        </div>
        {selectedObject && canExpand ? <div className="mcs-selection-action"><button type="button" className="button primary" onClick={() => toggle(selectedBox!.objectId)}>{pick({ zh: '展开下一层', en: 'Expand next level' })}</button></div> : null}
      </div>
      {inspector ? <McsInspector data={data} object={selectedObject} anchor={selectedBox?.anchor} relationIds={relationIds} expanded={Boolean(selectedObject && displayState.expanded.includes(selectedObject.id))} canExpand={canExpand} onToggle={() => selectedObject && toggle(selectedObject.id)} onFocus={focus} onClose={() => { cancelSelection(); setRelationIds([]); setState(s => ({ ...s, selected: null })); }} /> : null}
    </div>
    <footer className="mcs-statusbar"><span>{pick({ zh: '单击看关系 · 双击圆点读笔记 · 双击专题展开 · N 读笔记 · F 聚焦', en: 'Click for links · Double-click dots / N to read notes · Double-click topics to expand · F to focus' })}</span><span>{storageError ? pick({ zh: '浏览器存储不可用，可分享链接保留视图', en: 'Browser storage unavailable; use a share link to retain this view' }) : pick({ zh: '视图自动保存在本机', en: 'View saved in this browser' })}</span></footer>
    {issues.length || message || shareText ? <div className="mcs-notice" role="status">{issues.length ? <div><p>{pick({ zh: '内容版本或引用已变化，已保留仍有效的视图设置。', en: 'Content or references changed. Valid view settings were retained.' })}</p><details><summary>{pick({ zh: '查看恢复记录', en: 'Recovery details' })}</summary>{issues.map((issue, i) => <p key={i}>{issue}</p>)}</details></div> : null}{message ? <p>{message}</p> : null}{shareText ? <label>{pick({ zh: '公共视图链接', en: 'Public view link' })}<input readOnly value={shareText} onFocus={e => e.currentTarget.select()} /></label> : null}<button type="button" className="mcs-icon-button" aria-label={pick({ zh: '关闭提示', en: 'Dismiss notice' })} onClick={() => { setIssues([]); setMessage(''); setShareText(''); }}>×</button></div> : null}
  </section>;
}
