import { memo, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { Dispatch, SetStateAction, PointerEvent as ReactPointerEvent } from 'react';
import type { McsViewData, McsViewState } from '../../../shared/mcs-view.mjs';
import type { McsBox, McsLayout } from '../../../shared/mcs-space.mjs';
import { assignMcsRelationLanes } from '../../../shared/mcs-space.mjs';
import { useI18n } from '../i18n';
import { Markdown } from './Markdown';
import { objectMasterView } from '../../../shared/master-view.mjs';
import { MCS_SCALES, MCS_RELATIONS } from '../mcs-ui';
import { projectMcsRelations } from '../../../shared/mcs-space.mjs';

type Point = { x: number; y: number };
interface Props {
  data: McsViewData; layout: McsLayout; state: McsViewState; boxes: McsBox[]; matched: Set<string>;
  counts: Record<string, { matched: number; total: number }>;
  setState: Dispatch<SetStateAction<McsViewState>>;
  onZoom: (factor: number, point: Point) => void; onSelect: (id: string) => void;
  onFocus: (id: string) => void; onRelations: (ids: string[]) => void;
  onResize: (size: { width: number; height: number }) => void;
}
type Frame = McsBox & { opacity: number; open: boolean };
const center = (b: { x: number; y: number; w: number; h: number }) => ({ x: b.x + b.w / 2, y: b.y + b.h / 2 });
function targetFrame(b: McsBox, open: boolean): Frame {
  if (b.kind !== 'object' || open) return { ...b, opacity: 1, open };
  const c = center(b), d = Math.min(160, Math.max(92, Math.min(b.w, b.h) * .6));
  return { ...b, x: c.x - d / 2, y: c.y - d / 2, w: d, h: d, opacity: 1, open: false };
}

/** Only structure/placement changes animate. Camera motion stays under the pointer. */
function useFrames(boxes: McsBox[], layout: McsLayout, expanded: string[], moving: boolean) {
  const current = useRef<Record<string, Frame>>({});
  const [frames, setFrames] = useState<Frame[]>([]);
  useLayoutEffect(() => {
    const open = new Set(expanded), targets = Object.fromEntries(boxes.map(b => [b.id, targetFrame(b, open.has(b.id))]));
    const from: Record<string, Frame> = {};
    for (const [id, to] of Object.entries(targets)) {
      const parent = to.parent ? current.current[to.parent] ?? layout.boxes[to.parent] : null;
      const origin = parent ? center(parent) : center(to);
      from[id] = current.current[id] ?? { ...to, x: origin.x, y: origin.y, w: 0, h: 0, opacity: 0 };
    }
    for (const [id, old] of Object.entries(current.current)) if (!targets[id]) {
      const parent = old.parent ? targets[old.parent] ?? current.current[old.parent] : null;
      const end = parent ? center(parent) : center(old);
      from[id] = old;
      targets[id] = { ...old, x: end.x, y: end.y, w: 0, h: 0, opacity: 0 };
    }
    let request = 0;
    const reduced = moving || matchMedia('(prefers-reduced-motion: reduce)').matches;
    const started = performance.now();
    const tick = (now: number) => {
      const progress = reduced ? 1 : Math.min(1, (now - started) / 220), t = 1 - (1 - progress) ** 3;
      const result: Record<string, Frame> = {};
      for (const [id, b] of Object.entries(targets)) {
        if (progress === 1 && b.opacity === 0) continue;
        const a = from[id];
        result[id] = { ...b, x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, w: a.w + (b.w - a.w) * t, h: a.h + (b.h - a.h) * t, opacity: a.opacity + (b.opacity - a.opacity) * t };
      }
      current.current = result; setFrames(Object.values(result));
      if (progress < 1) request = requestAnimationFrame(tick);
    };
    request = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(request);
  }, [boxes, layout, expanded, moving]);
  return frames;
}

const FormulaCard = memo(function FormulaCard({ data, box, scale }: { data: McsViewData; box: McsBox; scale: number }) {
  const { locale, pick } = useI18n();
  const object = data.objects.find(o => o.id === box.objectId);
  const expressions = useMemo(() => object ? objectMasterView(object, { anchor: box.anchor, sourceVersion: data.objectVersion, locale }).expressions : [], [object, box.anchor, data.objectVersion, locale]);
  return <div className="mcs-formula-card" lang="zh" style={{ fontSize: Math.min(20, Math.max(12, 13 * scale)) / scale }}><span className="mcs-eyebrow">{pick({ zh: '内部声明', en: 'INTERNAL DECLARATION' })} · {box.anchor}</span>{expressions.map(e => <div key={e.id}><Markdown>{e.markdown}</Markdown><small>{e.status} · {object?.declarations.find(d => d.id === e.id)?.type}</small></div>)}</div>;
});

export function McsCanvas({ data, layout, state, boxes, matched, counts, setState, onZoom, onSelect, onFocus, onRelations, onResize }: Props) {
  const { pick, locale } = useI18n(), svg = useRef<SVGSVGElement>(null), marker = useId().replace(/:/g, '');
  const [dragging, setDragging] = useState<string | null>(null);
  const callbacks = useRef({ onZoom, onResize });
  useLayoutEffect(() => { callbacks.current = { onZoom, onResize }; }, [onZoom, onResize]);
  const frames = useFrames(boxes, layout, state.expanded, Boolean(dragging));
  const byFrame = useMemo(() => new Map(frames.map(b => [b.id, b])), [frames]);
  const objects = useMemo(() => new Map(data.objects.map(o => [o.id, o])), [data]);
  const projected = useMemo(() => projectMcsRelations(data, layout, state, boxes, matched), [data, layout, state, boxes, matched]);
  const active = useMemo(() => new Set(boxes.map(b => b.id)), [boxes]);
  const pointers = useRef(new Map<number, Point>());
  const drag = useRef<{ id: string | null; point: Point; offset: Point; moved: boolean; camera: McsViewState['camera'] } | null>(null);
  const pinch = useRef<{ distance: number; midpoint: Point } | null>(null);
  const suppressClick = useRef(false);
  const stateRef = useRef(state);
  useEffect(() => { stateRef.current = state; }, [state]);
  const clientPoint = (clientX: number, clientY: number) => { const b = svg.current!.getBoundingClientRect(); return { x: clientX - b.left, y: clientY - b.top }; };
  const endPointer = (pointerId: number) => {
    pointers.current.delete(pointerId);
    const element = svg.current;
    if (element?.hasPointerCapture(pointerId)) element.releasePointerCapture(pointerId);
    if (pointers.current.size === 1 && pinch.current) {
      // Keep the remaining finger useful: rebuild a one-pointer pan from its
      // current position instead of requiring the learner to lift and touch again.
      const point = [...pointers.current.values()][0];
      pinch.current = null;
      drag.current = { id: null, point, offset: { x: 0, y: 0 }, moved: true, camera: stateRef.current.camera };
      setDragging(null);
      return;
    }
    if (!pointers.current.size) { pinch.current = null; drag.current = null; setDragging(null); }
  };
  useEffect(() => {
    const element = svg.current;
    if (!element) return;
    const observer = new ResizeObserver(entries => { const b = entries[0].contentRect; callbacks.current.onResize({ width: b.width, height: b.height }); });
    observer.observe(element);
    const wheel = (event: WheelEvent) => {
      event.preventDefault();
      const b = element.getBoundingClientRect();
      callbacks.current.onZoom(Math.exp(-Math.max(-100, Math.min(100, event.deltaY)) * .003), { x: event.clientX - b.left, y: event.clientY - b.top });
    };
    element.addEventListener('wheel', wheel, { passive: false });
    const release = (event: PointerEvent) => { if (pointers.current.has(event.pointerId)) endPointer(event.pointerId); };
    const cancel = (event: PointerEvent) => { pointers.current.clear(); pinch.current = null; drag.current = null; setDragging(null); };
    const blur = () => cancel({ pointerId: -1 } as PointerEvent);
    // A release outside the SVG is still a release. This also recovers when the
    // browser drops a capture, so a later passive hover cannot continue a drag.
    window.addEventListener('pointerup', release, true);
    window.addEventListener('pointercancel', cancel, true);
    window.addEventListener('blur', blur);
    element.addEventListener('lostpointercapture', release as EventListener);
    return () => {
      observer.disconnect(); element.removeEventListener('wheel', wheel);
      window.removeEventListener('pointerup', release, true); window.removeEventListener('pointercancel', cancel, true);
      window.removeEventListener('blur', blur); element.removeEventListener('lostpointercapture', release as EventListener);
    };
  }, []);
  const down = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (event.button !== 0) return;
    const point = clientPoint(event.clientX, event.clientY);
    pointers.current.set(event.pointerId, point);
    if (pointers.current.size === 2) {
      event.currentTarget.setPointerCapture(event.pointerId);
      const [a, b] = [...pointers.current.values()];
      pinch.current = { distance: Math.hypot(a.x - b.x, a.y - b.y), midpoint: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 } };
      drag.current = null; suppressClick.current = true; setDragging(null); return;
    }
    const element = (event.target as Element).closest('[data-mcs-box]');
    const id = element?.getAttribute('data-mcs-box') ?? null;
    const movable = id && layout.boxes[id]?.kind !== 'reference' ? id : null;
    drag.current = { id: movable, point, offset: movable ? state.positions[movable] ?? { x: 0, y: 0 } : { x: 0, y: 0 }, moved: false, camera: state.camera };
    suppressClick.current = false;
  };
  const move = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (!pointers.current.has(event.pointerId)) return;
    if (event.pointerType === 'mouse' && event.buttons === 0) { endPointer(event.pointerId); return; }
    const point = clientPoint(event.clientX, event.clientY); pointers.current.set(event.pointerId, point);
    if (pointers.current.size >= 2) {
      const [a, b] = [...pointers.current.values()], distance = Math.hypot(a.x - b.x, a.y - b.y), midpoint = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }, before = pinch.current;
      if (before && before.distance > 0) {
        callbacks.current.onZoom(distance / before.distance, before.midpoint);
        setState(s => ({ ...s, camera: { ...s.camera, x: s.camera.x + midpoint.x - before.midpoint.x, y: s.camera.y + midpoint.y - before.midpoint.y } }));
      }
      pinch.current = { distance, midpoint }; return;
    }
    const start = drag.current;
    if (!start) return;
    const dx = point.x - start.point.x, dy = point.y - start.point.y;
    if (Math.hypot(dx, dy) < 4 && !start.moved) return;
    if (!event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.setPointerCapture(event.pointerId);
    start.moved = true; suppressClick.current = true; setDragging(start.id ?? 'camera');
    if (start.id) setState(s => ({ ...s, positions: { ...s.positions, [start.id!]: { x: start.offset.x + dx / start.camera.scale, y: start.offset.y + dy / start.camera.scale } } }));
    else setState(s => ({ ...s, camera: { ...start.camera, x: start.camera.x + dx, y: start.camera.y + dy } }));
  };
  const up = (event: ReactPointerEvent<SVGSVGElement>) => endPointer(event.pointerId);
  const select = (id: string) => {
    if (suppressClick.current) return;
    if (layout.boxes[id]?.kind === 'reference') onFocus(layout.boxes[id].target!);
    else onSelect(id);
  };
  const labelIds = useMemo(() => {
    const used: Array<{ x: number; y: number; w: number; h: number }> = [], show = new Set<string>();
    for (const b of [...frames].sort((a, b) => Number(b.id === state.selected) - Number(a.id === state.selected) || b.depth - a.depth || a.id.localeCompare(b.id))) {
      if (b.kind === 'declaration' || b.open || b.opacity < .5) continue;
      const c = center(b), x = c.x * state.camera.scale + state.camera.x, y = (c.y + b.h / 2) * state.camera.scale + state.camera.y + 7;
      const label = { x: x - 85, y, w: 170, h: 30 };
      if (b.id === state.selected || !used.some(a => a.x < label.x + label.w && a.x + a.w > label.x && a.y < label.y + label.h && a.y + a.h > label.y)) { show.add(b.id); used.push(label); }
    }
    return show;
  }, [frames, state.camera, state.selected]);
  const scale = state.camera.scale;
  const pointOf = (id: string) => { const b = byFrame.get(id); return b ? center(b) : null; };
  const relationLanes = useMemo(() => assignMcsRelationLanes(projected.edges), [projected.edges]);
  const relationLabel = (kind: string) => MCS_RELATIONS[kind] ? pick(MCS_RELATIONS[kind]) : kind;
  return <svg ref={svg} className={`mcs-canvas${dragging ? ' is-dragging' : ''}`} tabIndex={0}
    role="group" aria-label={pick({ zh: 'MCS 数学对象画布', en: 'MCS mathematical object canvas' })}
    data-mcs-canvas="" data-zoom={scale.toFixed(4)} data-camera-x={state.camera.x.toFixed(3)} data-camera-y={state.camera.y.toFixed(3)} data-visible={boxes.filter(b => b.kind === 'object').length}
    onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} onLostPointerCapture={up}
    onKeyDown={event => {
      if ((event.target as Element).closest('[data-mcs-box]')) return;
      const step = 50;
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) {
        event.preventDefault(); setState(s => ({ ...s, camera: { ...s.camera, x: s.camera.x + (event.key === 'ArrowLeft' ? step : event.key === 'ArrowRight' ? -step : 0), y: s.camera.y + (event.key === 'ArrowUp' ? step : event.key === 'ArrowDown' ? -step : 0) } }));
      }
    }}>
    <defs><pattern id={`${marker}-grid`} width="28" height="28" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r=".75" className="mcs-grid-dot" /></pattern><marker id={`${marker}-arrow`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" className="mcs-arrow" /></marker></defs>
    <rect width="100%" height="100%" fill={`url(#${marker}-grid)`} />
    <g transform={`translate(${state.camera.x} ${state.camera.y}) scale(${scale})`}>
      {frames.filter(b => b.kind === 'object' && b.open).sort((a, b) => a.depth - b.depth).map(b => {
        const o = objects.get(b.objectId)!, count = counts[b.objectId];
        return <g key={`region:${b.id}`} className={`mcs-region mcs-scale-${o.scale}${matched.has(o.id) ? '' : ' is-context'}${state.selected === b.id ? ' is-selected' : ''}`} style={{ opacity: b.opacity }} data-mcs-region={b.id}>
          <rect x={b.x} y={b.y} width={Math.max(0, b.w)} height={Math.max(0, b.h)} rx={24} vectorEffect="non-scaling-stroke" />
          <g data-mcs-box={b.id} role="button" tabIndex={active.has(b.id) ? 0 : -1} aria-label={o.title} onClick={() => select(b.id)} onDoubleClick={() => onFocus(b.id)} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); select(b.id); } }}>
            <rect className="mcs-region-grip" x={b.x} y={b.y} width={b.w} height={Math.min(70 / scale, b.h / 3)} rx="20" />
            <text x={b.x + 16 / scale} y={b.y + 23 / scale} fontSize={12 / scale} className={`mcs-region-title${locale === 'en' ? ' i18n-pending' : ''}`}>{o.title.slice(0, 28)}</text>
            <text x={b.x + 16 / scale} y={b.y + 42 / scale} fontSize={10 / scale} className="mcs-region-meta">{pick(MCS_SCALES[o.scale])} · {count?.matched ?? 0}/{count?.total ?? o.members.length} {pick({ zh: '匹配', en: 'matched' })}</text>
          </g>
        </g>;
      })}
      <g className={`mcs-connections${state.selected ? ' has-selection' : ''}`}>{projected.structure.map(edge => {
        const a = pointOf(edge.from), b = pointOf(edge.to); if (!a || !b) return null;
        return <line key={edge.id} x1={a.x} y1={a.y} x2={b.x} y2={b.y} className={`mcs-structure-edge is-${edge.kind}`} vectorEffect="non-scaling-stroke"><title>{pick({ zh: edge.kind === 'import' ? '导入' : '引用', en: edge.kind === 'import' ? 'Import' : 'Reference' })}</title></line>;
      })}{projected.edges.map(edge => {
        const a = pointOf(edge.from), b = pointOf(edge.to); if (!a || !b) return null;
        const isSelected = edge.from === state.selected || edge.to === state.selected;
        const detailed = isSelected || scale >= .8;
        const lane = relationLanes.get(edge.id) ?? { index: 0, count: 1 };
        const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }, length = Math.hypot(b.x - a.x, b.y - a.y) || 1;
        const laneShift = (lane.index - (lane.count - 1) / 2) * 18 / scale;
        const normal = { x: -(b.y - a.y) / length, y: (b.x - a.x) / length };
        const junction = { x: mid.x + normal.x * laneShift, y: mid.y + normal.y * laneShift - (edge.kind === 'deduction' ? 34 : 0) / scale };
        const premisePoints = edge.premises.map(id => pointOf(id)).filter((p): p is Point => Boolean(p));
        const lines = edge.kind === 'deduction' ? [...premisePoints.map(p => `M${p.x},${p.y} L${junction.x},${junction.y}`), `M${a.x},${a.y} L${junction.x},${junction.y} L${b.x},${b.y}`] : [`M${a.x},${a.y} Q${junction.x},${junction.y} ${b.x},${b.y}`];
        return <g key={edge.id} className={`mcs-relation is-${edge.kind}${isSelected ? ' is-emphasized' : ''}`} data-mcs-relation={edge.id} data-mcs-relation-lane={`${lane.index + 1}/${lane.count}`} data-mcs-relation-endpoints={`${edge.from}->${edge.to}`}>
          {lines.map((d, i) => <path key={i} d={d} vectorEffect="non-scaling-stroke" markerEnd={i === lines.length - 1 ? `url(#${marker}-arrow)` : undefined} />)}
          <path className="mcs-edge-hit" d={lines[lines.length - 1]} vectorEffect="non-scaling-stroke" onClick={() => { if (!suppressClick.current) onRelations(edge.relationIds); }}><title>{`${relationLabel(edge.kind)}${lane.count > 1 ? ` · AND ${lane.index + 1}/${lane.count}` : ''}${edge.aggregate ? ` · R∃ · ${edge.relationIds.length}` : ''}${edge.missingPremises ? ` · ${pick({ zh: '有前提未显示', en: 'Some premises are hidden' })}: ${edge.missingPremises}` : ''}`}</title></path>
          {(edge.kind === 'deduction' || isSelected || edge.aggregate || edge.missingPremises > 0) ? <g transform={`translate(${junction.x} ${junction.y}) scale(${1 / scale})`} role="button" tabIndex={0} aria-label={`${relationLabel(edge.kind)}${lane.count > 1 ? ` · AND ${lane.index + 1}/${lane.count}` : ''} · ${edge.relationIds.length}`} onClick={() => onRelations(edge.relationIds)} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onRelations(edge.relationIds); } }} className="mcs-edge-label">
            <rect x={detailed ? -8 : -3} y={detailed ? -10 : -3} width={detailed ? edge.missingPremises ? 110 : edge.aggregate ? 90 : 50 : 6} height={detailed ? 20 : 6} rx={detailed ? 8 : edge.kind === 'deduction' ? 1 : 3} />
            {detailed ? <text x={0} y={3}>{edge.kind === 'deduction' ? 'AND' : relationLabel(edge.kind)}{edge.aggregate ? ` · R∃ ${edge.relationIds.length}` : ''}{edge.missingPremises ? ` · +${edge.missingPremises} ?` : ''}</text> : null}
            <title>{pick({ zh: '点击查看完整关系、全部前提与来源', en: 'Open full relations, premises and sources' })}</title>
          </g> : null}
        </g>;
      })}</g>
      {frames.filter(b => !(b.kind === 'object' && b.open)).map(b => {
        const object = objects.get(b.objectId)!, c = center(b), selected = state.selected === b.id;
        return <g key={b.id} data-mcs-box={b.id} data-mcs-kind={b.kind} className={`mcs-object mcs-scale-${object.scale}${selected ? ' is-selected' : ''}${dragging === b.id ? ' is-lifted' : ''}${matched.has(b.objectId) ? '' : ' is-context'}`} style={{ opacity: b.opacity }} role="button" tabIndex={active.has(b.id) ? 0 : -1}
          aria-label={b.kind === 'declaration' ? `${pick({ zh: '内部声明', en: 'Internal declaration' })}: ${object.title} #${b.anchor}` : object.title}
          onClick={() => select(b.id)} onDoubleClick={() => onFocus(b.kind === 'reference' ? b.target! : b.id)}
          onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); select(b.id); } if (e.key === 'f') onFocus(b.id); }}>
          <title>{object.title}{locale === 'en' ? ' · Chinese content / not yet translated' : ''}{b.kind === 'reference' ? ` ↗ ${b.target}` : ''}</title>
          {b.kind === 'object' ? <>
            <rect className="mcs-node-shape" x={b.x} y={b.y} width={b.w} height={b.h} rx={Math.min(b.w, b.h) / 2} vectorEffect="non-scaling-stroke" />
            <circle cx={c.x} cy={c.y} r={Math.min(b.w, b.h) * .13} className="mcs-node-core" />
            {labelIds.has(b.id) ? <g transform={`translate(${c.x} ${b.y + b.h}) scale(${1 / scale})`} className="mcs-node-label"><text y={18} textAnchor="middle" className={locale === 'en' ? 'i18n-pending' : ''}>{object.title.length > 19 ? `${object.title.slice(0, 18)}…` : object.title}</text><text y={33} textAnchor="middle" className="mcs-node-meta">{pick(MCS_SCALES[object.scale])}{layout.children[b.id]?.length ? ` · ${layout.children[b.id].length}` : ''}</text></g> : null}
          </> : <>
            <rect className="mcs-declaration-shape" x={b.x} y={b.y} width={Math.max(0, b.w)} height={Math.max(0, b.h)} rx={14} vectorEffect="non-scaling-stroke" />
            <foreignObject x={b.x} y={b.y} width={Math.max(0, b.w)} height={Math.max(0, b.h)}>{b.kind === 'declaration' ? <FormulaCard data={data} box={b} scale={scale} /> : <div className="mcs-reference-card">↗ {objects.get(b.target!)?.title ?? b.target}<small>{pick({ zh: '同一对象的引用入口', en: 'Reference to the same object' })}</small></div>}</foreignObject>
          </>}
        </g>;
      })}
    </g>
  </svg>;
}
