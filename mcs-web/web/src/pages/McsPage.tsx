import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useApi, formatError } from '../api';
import { useI18n } from '../i18n';
import { layout as networkLayout } from '../network';
import type { NetworkGraph } from '../network';
import type { McsViewData, McsViewState } from '../../../shared/mcs-view.mjs';
import {
  MCS_STORAGE_KEY, defaultMcsState, createMcsLayout, positionedMcsLayout, filterMcsObjects,
  visibleMcsBoxes, updateMcsLod, normalizeMcsState, encodeMcsState, decodeMcsState,
} from '../../../shared/mcs-space.mjs';
import type { McsBox } from '../../../shared/mcs-space.mjs';
import { McsCanvas } from '../components/McsCanvas';
import { McsInspector } from '../components/McsInspector';
import { MCS_SCALES, MCS_RELATIONS } from '../mcs-ui';
import '../mcs-space.css';

type Size = { width: number; height: number };
function initialView(data: McsViewData) {
  const shared = decodeMcsState(window.location.hash, data);
  if (shared) return { ...shared, restored: true };
  const issues = window.location.hash.startsWith('#mcs=') ? ['share: the view link could not be read; using the local view or default overview'] : [];
  try {
    const raw = localStorage.getItem(MCS_STORAGE_KEY);
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
function rootCenters(data: McsViewData) {
  const memberIds = new Set(data.objects.flatMap(o => o.members.map(r => r.id)));
  const roots = new Set(data.objects.filter(o => !memberIds.has(o.id)).map(o => o.id));
  const graph: NetworkGraph = {
    version: data.objectVersion, actions: [],
    nodes: data.objects.map(o => ({ id: o.id, version: o.version, title: o.title, construct: 'Concept', roles: [], discipline: '', case: '', summary: '', evidenceStatus: o.declarations[0]?.status ?? 'NOT-CLAIMED', hasContent: true, actionCount: 0, relationCount: 0, evidenceCount: 0 })),
    relations: data.relations.map(r => ({ id: r.id, kind: r.kind, from: r.from.id, to: r.to.id, witness: { status: r.evidence.status }, scope: r.context })),
  };
  return Object.fromEntries(networkLayout(graph, roots, ['relation']).placed.map(p => [p.id, { x: p.x * 2.2, y: p.y * 2.2 }]));
}
function toggleValue(values: string[], value: string) { return values.includes(value) ? values.filter(v => v !== value) : [...values, value]; }

export function McsPage() {
  const result = useApi<McsViewData>('/ontology/mcs-view'), { pick } = useI18n();
  if (result.error) return <section className="page"><h1>MCS</h1><p role="alert">{formatError(result.error)}</p><button type="button" className="button" onClick={result.reload}>{pick({ zh: '重试', en: 'Retry' })}</button></section>;
  if (!result.data) return <section className="page" role="status">{pick({ zh: '正在读取数学对象空间…', en: 'Loading the mathematical object space…' })}</section>;
  return <McsWorkspace key={result.data.objectVersion} data={result.data} />;
}

function McsWorkspace({ data }: { data: McsViewData }) {
  const { pick } = useI18n(), location = useLocation();
  const [initial] = useState(() => initialView(data));
  const [issues, setIssues] = useState(initial.issues);
  const [state, setState] = useState<McsViewState>(initial.state);
  const [size, setSize] = useState<Size>({ width: 0, height: 0 });
  const [filtersOpen, setFiltersOpen] = useState(() => window.innerWidth > 900);
  const [relationIds, setRelationIds] = useState<string[]>([]);
  const [message, setMessage] = useState('');
  const [storageError, setStorageError] = useState(false);
  const [shareText, setShareText] = useState('');
  const initialFit = useRef(initial.restored);
  const measuredSize = useRef<Size | null>(null);
  const pendingSelection = useRef<number | undefined>(undefined);
  const base = useMemo(() => createMcsLayout(data, rootCenters(data)), [data]);
  const positioned = useMemo(() => positionedMcsLayout(base, state.positions), [base, state.positions]);
  const filtered = useMemo(() => filterMcsObjects(data, state.filters), [data, state.filters]);
  const displayState = useMemo(() => {
    const f = state.filters, active = f.query.trim() || f.scales.length || f.evidence.length || f.groups.length && !f.groups.includes('all');
    const expanded = new Set(state.expanded);
    if (active) {
      // A matching parent may still contain matching descendants. Keep their
      // paths open as OR choices grow, including secondary membership entrances.
      for (const id of filtered.context) expanded.add(id);
      for (const object of data.objects) if (object.members.some(ref => filtered.matched.has(ref.id) || filtered.context.has(ref.id))) expanded.add(object.id);
    }
    for (const [id, mode] of Object.entries(state.manual)) {
      if (mode === 'closed') expanded.delete(id); else expanded.add(id);
    }
    return { ...state, expanded: [...expanded] };
  }, [state, filtered, data]);
  const boxes = useMemo(() => visibleMcsBoxes(data, positioned, displayState, filtered), [data, positioned, displayState, filtered]);
  const selectedBox = state.selected ? positioned.boxes[state.selected] : undefined;
  const selectedObject = data.objects.find(o => o.id === selectedBox?.objectId);
  const kinds = useMemo(() => [...new Set(data.relations.map(r => r.kind))].sort(), [data]);
  const evidence = useMemo(() => [...new Set([...data.objects.flatMap(o => o.declarations.map(d => d.status)), ...data.relations.map(r => r.evidence.status)])].sort(), [data]);
  const onResize = useCallback((next: Size) => {
    const before = measuredSize.current;
    if (before?.width === next.width && before.height === next.height) return;
    measuredSize.current = next; setSize(next);
    if (before) setState(s => ({ ...s, camera: { ...s.camera, x: s.camera.x + (next.width - before.width) / 2, y: s.camera.y + (next.height - before.height) / 2 } }));
  }, []);
  useEffect(() => {
    if (initialFit.current || size.width < 20) return;
    initialFit.current = true;
    setState(s => ({ ...s, camera: fitBoxes(base.roots.map(id => positioned.boxes[id]), size) }));
  }, [base, positioned, size]);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      try { localStorage.setItem(MCS_STORAGE_KEY, JSON.stringify(state)); setStorageError(false); }
      catch { setStorageError(true); }
    }, 180);
    return () => clearTimeout(timer);
  }, [state]);
  // Persist the last pointer frame as well when navigating away before the debounce.
  const latest = useRef(state);
  useEffect(() => { latest.current = state; }, [state]);
  useEffect(() => {
    const save = () => { try { localStorage.setItem(MCS_STORAGE_KEY, JSON.stringify(latest.current)); } catch { /* Already reported in the visible page. */ } };
    window.addEventListener('pagehide', save); return () => { save(); window.removeEventListener('pagehide', save); };
  }, []);
  useEffect(() => {
    const shared = decodeMcsState(location.hash, data);
    if (shared) { setState(shared.state); setIssues(shared.issues); initialFit.current = true; }
  }, [location.hash, data]);
  useEffect(() => () => window.clearTimeout(pendingSelection.current), []);
  const cancelSelection = useCallback(() => { window.clearTimeout(pendingSelection.current); }, []);
  const select = useCallback((id: string) => {
    cancelSelection();
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
  const focus = useCallback((id: string) => {
    cancelSelection();
    const target = positioned.boxes[id]; if (!target) return;
    setRelationIds([]);
    setState(old => {
      const expanded = new Set(old.expanded), manual = { ...old.manual }; let parent = target.parent;
      while (parent) { expanded.add(parent); manual[parent] = 'open'; parent = positioned.boxes[parent]?.parent ?? null; }
      const next = { ...old, selected: id, expanded: [...expanded], manual, camera: fitBoxes([target], size) };
      return updateMcsLod(data, base, next, { x: target.x + target.w / 2, y: target.y + target.h / 2 });
    });
  }, [data, base, positioned, size, cancelSelection]);
  const toggle = useCallback((id: string) => {
    setState(old => { const opened = displayState.expanded.includes(id); return { ...old, expanded: opened ? old.expanded.filter(k => k !== id) : [...new Set([...old.expanded, id])], manual: { ...old.manual, [id]: opened ? 'closed' : 'open' } }; });
  }, [displayState.expanded]);
  const changeFilter = <K extends keyof McsViewState['filters']>(key: K, value: McsViewState['filters'][K]) => setState(s => ({ ...s, filters: { ...s.filters, [key]: value } }));
  const share = async () => {
    const url = new URL(window.location.href); url.hash = encodeMcsState(state);
    setShareText(url.href);
    try { await navigator.clipboard.writeText(url.href); setMessage(pick({ zh: '公共视图链接已复制。', en: 'Public view link copied.' })); }
    catch { setMessage(pick({ zh: '请复制下方视图链接。', en: 'Copy the view link below.' })); }
  };
  const canExpand = Boolean(state.selected && base.children[state.selected]?.length);
  const inspector = Boolean(selectedObject || relationIds.length);
  return <section className={`mcs-workspace${filtersOpen ? ' has-filters' : ''}${inspector ? ' has-inspector' : ''}`} aria-label={pick({ zh: 'MCS 多尺度数学对象空间', en: 'MCS multiscale mathematical object space' })}>
    <header className="mcs-toolbar">
      <div className="mcs-title"><span className="mcs-eyebrow">{pick({ zh: '数学认知空间', en: 'MATHEMATICAL COGNITIVE SPACE' })}</span><h1>MCS <span>{pick({ zh: '从整体，走向内部', en: 'From the whole, into its structure' })}</span></h1></div>
      <div className="mcs-toolbar-actions">
        <button type="button" aria-expanded={filtersOpen} onClick={() => setFiltersOpen(v => !v)}>{pick({ zh: '滤镜', en: 'Filters' })}{state.filters.query || Object.values(state.filters).some(v => Array.isArray(v) && v.length) ? ' •' : ''}</button>
        <button type="button" onClick={() => { setFiltersOpen(false); setState(s => ({ ...s, expanded: [], manual: {}, filters: defaultMcsState(data).filters })); focus('obj:group:subdiscipline'); }}>{pick({ zh: '群论尺度链', en: 'Group scale chain' })} ↗</button>
        <button type="button" onClick={share}>{pick({ zh: '分享视图', en: 'Share view' })}</button>
      </div>
    </header>
    <div className="mcs-stage">
      {filtersOpen ? <aside className="mcs-filters" aria-label={pick({ zh: '视图滤镜', en: 'View filters' })}>
        <div className="mcs-panel-heading"><h2>{pick({ zh: '选择观察角度', en: 'Choose a perspective' })}</h2><button type="button" className="mcs-icon-button" onClick={() => setFiltersOpen(false)} aria-label={pick({ zh: '关闭滤镜', en: 'Close filters' })}>×</button></div>
        <label className="mcs-search">{pick({ zh: '搜索对象与公式', en: 'Search objects and formulas' })}<input type="search" value={state.filters.query} placeholder={pick({ zh: '名称、ID、形式表达…', en: 'Name, ID, formal expression…' })} onChange={e => changeFilter('query', e.target.value)} /></label>
        <fieldset><legend>{pick({ zh: '内容分组', en: 'Content groups' })}</legend>{data.groups.map(group => <label key={group.id}><input type="checkbox" checked={group.id === 'all' ? !state.filters.groups.length || state.filters.groups.includes('all') : state.filters.groups.includes(group.id)} onChange={() => changeFilter('groups', group.id === 'all' ? [] : toggleValue(state.filters.groups.filter(g => g !== 'all'), group.id))} />{pick(group.title)}<small>{group.objectIds.length}</small></label>)}</fieldset>
        <fieldset><legend>{pick({ zh: '对象尺度', en: 'Object scale' })}</legend>{data.levels.map(level => <label key={level.id}><input type="checkbox" checked={state.filters.scales.includes(level.id)} onChange={() => changeFilter('scales', toggleValue(state.filters.scales, level.id) as McsViewState['filters']['scales'])} /><span className={`mcs-scale-swatch mcs-scale-${level.id}`} />{pick(MCS_SCALES[level.id])}<small>{data.objects.filter(o => o.scale === level.id).length}</small></label>)}</fieldset>
        <fieldset><legend>{pick({ zh: '数学关系', en: 'Mathematical relations' })}</legend>{kinds.map(kind => <label key={kind}><input type="checkbox" checked={state.filters.relations.includes(kind)} onChange={() => changeFilter('relations', toggleValue(state.filters.relations, kind))} />{MCS_RELATIONS[kind] ? pick(MCS_RELATIONS[kind]) : kind}</label>)}</fieldset>
        <fieldset><legend>{pick({ zh: '证据标签', en: 'Evidence labels' })}</legend>{evidence.map(status => <label key={status}><input type="checkbox" checked={state.filters.evidence.includes(status)} onChange={() => changeFilter('evidence', toggleValue(state.filters.evidence, status))} />{status}</label>)}</fieldset>
        <p className="mcs-meta">{pick({ zh: '未勾选表示全部。同类取并集，不同滤镜取交集。归属轮廓随匹配结果保留。', en: 'An empty selection means all. Choices within one filter are OR; different filters are AND. Parent outlines preserve context.' })}</p>
        <button type="button" className="mcs-text-button" onClick={() => setState(s => ({ ...s, filters: defaultMcsState(data).filters }))}>{pick({ zh: '清除所有滤镜', en: 'Clear all filters' })}</button>
      </aside> : null}
      <div className="mcs-viewport">
        <McsCanvas data={data} layout={positioned} state={displayState} boxes={boxes} matched={filtered.matched} counts={filtered.counts} setState={setState} onZoom={zoom} onSelect={select} onFocus={focus} onRelations={ids => { cancelSelection(); setRelationIds(ids); setState(s => ({ ...s, selected: null })); }} onResize={onResize} />
        <div className="mcs-viewport-caption"><span className="mcs-live-dot" />{filtered.matched.size} / {data.objects.length} {pick({ zh: '数学对象', en: 'objects' })}<span>·</span>{data.relations.length} {pick({ zh: '已登记关系', en: 'registered relations' })}</div>
        {!filtered.matched.size ? <div className="mcs-empty" role="status"><strong>{pick({ zh: '没有匹配的数学对象', en: 'No mathematical objects match' })}</strong><p>{pick({ zh: '放宽滤镜，或清除关键词后再试。', en: 'Broaden the filters or clear your search.' })}</p></div> : null}
        <div className="mcs-camera-tools" aria-label={pick({ zh: '视角控制', en: 'Camera controls' })}>
          <button type="button" onClick={() => { const b = selectedBox; zoom(1 / 1.3, b ? { x: (b.x + b.w / 2) * state.camera.scale + state.camera.x, y: (b.y + b.h / 2) * state.camera.scale + state.camera.y } : { x: size.width / 2, y: size.height / 2 }); }} aria-label={pick({ zh: '缩小', en: 'Zoom out' })}>−</button><output>{Math.round(state.camera.scale * 100)}%</output>
          <button type="button" onClick={() => { const b = selectedBox; zoom(1.3, b ? { x: (b.x + b.w / 2) * state.camera.scale + state.camera.x, y: (b.y + b.h / 2) * state.camera.scale + state.camera.y } : { x: size.width / 2, y: size.height / 2 }); }} aria-label={pick({ zh: '放大', en: 'Zoom in' })}>＋</button>
          <button type="button" onClick={() => setState(s => ({ ...s, camera: fitBoxes(boxes.filter(b => b.kind === 'object'), size) }))}>{pick({ zh: '适配视野', en: 'Fit view' })}</button>
          <button type="button" onClick={() => setState(s => ({ ...s, positions: {} }))}>{pick({ zh: '重置布局', en: 'Reset layout' })}</button>
          <button type="button" onClick={() => setState(s => ({ ...s, manual: {}, expanded: updateMcsLod(data, base, { ...s, manual: {} }, { x: (size.width / 2 - s.camera.x) / s.camera.scale, y: (size.height / 2 - s.camera.y) / s.camera.scale }).expanded }))}>{pick({ zh: '自动尺度', en: 'Auto scale' })}</button>
        </div>
        {selectedObject && canExpand ? <div className="mcs-selection-action"><button type="button" className="button primary" onClick={() => toggle(selectedBox!.objectId)}>{pick({ zh: displayState.expanded.includes(selectedObject.id) ? '合拢当前对象' : '展开当前对象', en: displayState.expanded.includes(selectedObject.id) ? 'Collapse selected object' : 'Expand selected object' })}</button></div> : null}
      </div>
      {inspector ? <McsInspector data={data} object={selectedObject} anchor={selectedBox?.anchor} relationIds={relationIds} expanded={Boolean(selectedObject && displayState.expanded.includes(selectedObject.id))} canExpand={canExpand} onToggle={() => selectedObject && toggle(selectedObject.id)} onFocus={focus} onClose={() => { cancelSelection(); setRelationIds([]); setState(s => ({ ...s, selected: null })); }} /> : null}
    </div>
    <footer className="mcs-statusbar"><span>{pick({ zh: '拖动平移或摆放 · 滚轮 / 双指放缩 · 双击聚焦 · Enter 查看', en: 'Drag to pan or place · Wheel / pinch to zoom · Double-click to focus · Enter to inspect' })}</span><span>{storageError ? pick({ zh: '浏览器存储不可用，可分享链接保留视图', en: 'Browser storage unavailable; use a share link to retain this view' }) : pick({ zh: '视图自动保存在本机', en: 'View saved in this browser' })}</span></footer>
    {issues.length || message || shareText ? <div className="mcs-notice" role="status">{issues.length ? <div><p>{pick({ zh: '内容版本或引用已变化，已保留仍有效的视图设置。', en: 'Content or references changed. Valid view settings were retained.' })}</p><details><summary>{pick({ zh: '查看恢复记录', en: 'Recovery details' })}</summary>{issues.map((issue, i) => <p key={i}>{issue}</p>)}</details></div> : null}{message ? <p>{message}</p> : null}{shareText ? <label>{pick({ zh: '公共视图链接', en: 'Public view link' })}<input readOnly value={shareText} onFocus={e => e.currentTarget.select()} /></label> : null}<button type="button" className="mcs-icon-button" aria-label={pick({ zh: '关闭提示', en: 'Dismiss notice' })} onClick={() => { setIssues([]); setMessage(''); setShareText(''); }}>×</button></div> : null}
  </section>;
}
