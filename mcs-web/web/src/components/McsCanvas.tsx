import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { Dispatch, SetStateAction, PointerEvent as ReactPointerEvent } from 'react';
import type { McsViewData, McsViewState } from '../../../shared/mcs-view.mjs';
import type { McsBox, McsLayout } from '../../../shared/mcs-space.mjs';
import { mcsRelationLanes, mcsRelationTopics, placeMcsRelationLabels } from '../mcs-relation-display';
import { useConnectionNotes } from '../connection-notes';
import { useI18n } from '../i18n';
import { MCS_SCALES, MCS_RELATIONS } from '../mcs-ui';
import { projectMcsRelations, displayedMcsRelations } from '../../../shared/mcs-space.mjs';

type Point = { x: number; y: number };
interface Props {
  data: McsViewData; layout: McsLayout; state: McsViewState; boxes: McsBox[]; matched: Set<string>;
  counts: Record<string, { matched: number; total: number }>;
  setState: Dispatch<SetStateAction<McsViewState>>;
  onZoom: (factor: number, point: Point) => void; onSelect: (id: string, immediate?: boolean) => void;
  onGestureStart: () => void;
  onFocus: (id: string) => void; onRelations: (ids: string[]) => void;
  onOpenNote: (id: string) => void;
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
      // RAF timestamps mark the beginning of a frame and can precede this effect.
      const progress = reduced ? 1 : Math.max(0, Math.min(1, (now - started) / 220)), t = 1 - (1 - progress) ** 3;
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

export function McsCanvas({ data, layout, state, boxes, matched, counts, setState, onZoom, onSelect, onGestureStart, onFocus, onOpenNote, onRelations, onResize }: Props) {
  const { pick, locale } = useI18n(), svg = useRef<SVGSVGElement>(null), marker = useId().replace(/:/g, '');
  const { notes } = useConnectionNotes();
  const relationTopics = useMemo(() => mcsRelationTopics(data), [data]);
  const [dragging, setDragging] = useState<string | null>(null);
  const callbacks = useRef({ onZoom, onResize });
  useLayoutEffect(() => { callbacks.current = { onZoom, onResize }; }, [onZoom, onResize]);
  const frames = useFrames(boxes, layout, state.expanded, Boolean(dragging));
  const byFrame = useMemo(() => new Map(frames.map(b => [b.id, b])), [frames]);
  const objects = useMemo(() => new Map(data.objects.map(o => [o.id, o])), [data]);
  const allProjected = useMemo(() => projectMcsRelations(data, layout, state, boxes, matched), [data, layout, state.expanded, state.manual, state.filters, boxes, matched]);
  const projected = useMemo(() => displayedMcsRelations(data, layout, state, allProjected), [data, layout, state, allProjected]);
  const emphasized = useMemo(() => new Set(projected.emphasizedRelationIds), [projected]);
  const active = useMemo(() => new Set(boxes.map(b => b.id)), [boxes]);
  const organizational = (b: McsBox) => b.kind === 'object' && ['topic', 'subdiscipline'].includes(objects.get(b.objectId)!.scale);
  // A one-declaration unit has one visible dot, carrying the declaration's
  // exact identity. Whole-object endpoints attach to that same dot.
  const soleDeclaration = (id: string) => {
    const children = layout.children[id] ?? [];
    return children.length === 1 && layout.boxes[children[0]]?.kind === 'declaration' && active.has(children[0]) ? children[0] : null;
  };
  const nodeFrames = frames.filter(b => !(b.kind === 'object' && b.open && (organizational(b) || soleDeclaration(b.id))));
  const nodePoint = (b: Frame) => b.kind === 'object' && b.open ? { x: b.x + b.w / 2, y: b.y + 30 } : center(b);
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
    onGestureStart();
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
    const selectedBox = id ? layout.boxes[id] : undefined;
    // Dragging a unit's single declaration moves the unit as a whole, so its
    // position also survives collapsing and reopening the topic.
    const movable = selectedBox?.kind === 'declaration' && soleDeclaration(selectedBox.objectId) === id
      ? selectedBox.objectId : id && selectedBox?.kind !== 'reference' ? id : null;
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
  const focusTarget = (id: string) => {
    const box = layout.boxes[id];
    return box?.kind === 'reference' ? `${box.target}${box.anchor && box.anchor !== '$' ? `#${box.anchor}` : ''}` : id;
  };
  const select = (id: string, keyboard = false) => {
    if (!keyboard && suppressClick.current) return;
    onSelect(id, keyboard);
  };
  const labelIds = useMemo(() => {
    const used: Array<{ x: number; y: number; w: number; h: number }> = [], show = new Set<string>();
    const selected = (b: Frame) => b.id === state.selected || b.kind === 'declaration' && b.objectId === state.selected;
    for (const b of [...nodeFrames].sort((a, b) => Number(selected(b)) - Number(selected(a)) || b.depth - a.depth || a.id.localeCompare(b.id))) {
      if (organizational(b) || b.opacity < .5) continue;
      const c = nodePoint(b), x = c.x * state.camera.scale + state.camera.x, y = c.y * state.camera.scale + state.camera.y + 15;
      const title = objects.get(b.objectId)!.title.slice(0, 25);
      const width = Math.min(240, Math.max(60, [...title].reduce((sum, c) => sum + (/[^\x00-\xff]/.test(c) ? 11 : 6), 20)));
      const label = { x: x - width / 2, y, w: width, h: 30 };
      if (selected(b) || !used.some(a => a.x < label.x + label.w && a.x + a.w > label.x && a.y < label.y + label.h && a.y + a.h > label.y)) { show.add(b.id); used.push(label); }
    }
    return show;
  }, [frames, layout, state.expanded, state.camera, state.selected]);
  const scale = state.camera.scale;
  const pointOf = (id: string | null) => {
    let b = id ? byFrame.get(id) : null;
    if (b?.kind === 'object' && b.open && !organizational(b)) b = byFrame.get(soleDeclaration(b.id) ?? '') ?? b;
    return b ? nodePoint(b) : null;
  };
  const inset = (point: Point, toward: Point) => {
    const length = Math.hypot(toward.x - point.x, toward.y - point.y) || 1, radius = Math.min(11 / scale, length / 3);
    return { x: point.x + (toward.x - point.x) / length * radius, y: point.y + (toward.y - point.y) / length * radius };
  };
  const relationLanes = useMemo(() => mcsRelationLanes(projected.edges), [projected.edges]);
  const cardWidth = Math.min(178, Math.max(52, ((svg.current?.clientWidth ?? 1200) - 100) / (state.level === 0 ? 2 : 6)));
  const compactCard = cardWidth < 120, cardHeight = compactCard ? 64 : 98;
  const relationLabel = (kind: string) => MCS_RELATIONS[kind] ? pick(MCS_RELATIONS[kind]) : kind;
  const inViewport = (p: Point) => {
    const x = p.x * scale + state.camera.x, y = p.y * scale + state.camera.y;
    return x >= -30 && x <= (svg.current?.clientWidth ?? 1200) + 30 && y >= -30 && y <= (svg.current?.clientHeight ?? 900) + 30;
  };
  const screen = (p: Point) => ({ x: p.x * scale + state.camera.x, y: p.y * scale + state.camera.y });
  const displayedTopic = (id: string | null) => {
    let box = id ? layout.boxes[id] : undefined;
    while (box) {
      if (box.kind === 'object' && objects.get(box.objectId)?.scale === 'topic') return box.objectId;
      box = box.parent ? layout.boxes[box.parent] : undefined;
    }
    return null;
  };
  const clip = (p: Point, toward: Point) => {
    const length = Math.hypot(toward.x - p.x, toward.y - p.y) || 1, radius = Math.min(16, length / 3);
    return { x: p.x + (toward.x - p.x) / length * radius, y: p.y + (toward.y - p.y) / length * radius };
  };
  const relationFrames = projected.edges.flatMap(edge => {
    const target = pointOf(edge.to); if (!target) return [];
    const source = pointOf(edge.from) ?? target;
    const isSelected = edge.relationIds.some(id => emphasized.has(id));
    const premisePoints = edge.premises.map(id => pointOf(id)).filter((p): p is Point => Boolean(p));
    if (state.level >= 2 && !isSelected && ![source, target, ...premisePoints].some(inViewport)) return [];
    const a = screen(source), b = screen(target), lane = relationLanes.get(edge.id) ?? { index: 0, count: 1 };
    const length = Math.hypot(b.x - a.x, b.y - a.y) || 1;
    // Canonical orientation keeps reverse readings on distinct sides.
    const direction = (edge.from ?? '') < edge.to ? 1 : -1;
    const shift = (lane.index - (lane.count - 1) / 2) * 72 * direction;
    const junction = !edge.from ? { x: b.x + 56, y: b.y - 56 - lane.index * 38 }
      : { x: (a.x + b.x) / 2 - (b.y - a.y) / length * shift,
        y: (a.y + b.y) / 2 + (b.x - a.x) / length * shift - (edge.kind === 'deduction' ? 40 : 0) };
    const start = clip(a, junction), end = clip(b, junction);
    const premises = [...new Map([...(edge.from ? [a] : []), ...premisePoints.map(screen)].map(p => [`${p.x},${p.y}`, p])).values()];
    const branches = edge.kind === 'deduction' ? premises.map(p => {
      const s = clip(p, junction); return `M${s.x},${s.y} L${junction.x},${junction.y}`;
    }) : [];
    const path = edge.kind === 'deduction' ? `M${junction.x},${junction.y} L${end.x},${end.y}`
      : `M${start.x},${start.y} Q${junction.x},${junction.y} ${end.x},${end.y}`;
    const topic = displayedTopic(edge.from);
    const sameTopic = Boolean(topic && [edge.to, ...edge.premises].every(id => displayedTopic(id) === topic)
      && edge.relationIds.every(id => relationTopics.get(id)?.includes(topic)));
    const noted = edge.relationIds.some(id => notes.has(JSON.stringify(['relation', id])));
    const label = `${relationLabel(edge.kind)}${edge.kind === 'deduction' ? ' · AND' : ''}${edge.aggregate ? ` · R∃ ${edge.relationIds.length}` : ''}${edge.missingPremises ? ` · ${pick({ zh: '隐藏前提', en: 'Hidden premises' })} ${edge.missingPremises}` : ''}${noted ? ' · ✎' : ''}`;
    const width = [...label].reduce((sum, char) => sum + (/[^\x00-\xff]/.test(char) ? 11 : 6.4), 22);
    const showLabel = sameTopic || isSelected || state.level < 2 || edge.missingPremises > 0;
    return [{ edge, isSelected, sameTopic, noted, lane, start, end, junction, branches, path, label, width, showLabel }];
  });
  const labelObstacles = nodeFrames.flatMap(b => {
    const p = screen(nodePoint(b));
    return [{ x: p.x - 16, y: p.y - 16, w: 32, h: 32 },
      ...(labelIds.has(b.id) ? [{ x: p.x - 100, y: p.y + 14, w: 200, h: 32 }] : [])];
  });
  const labelPositions = placeMcsRelationLabels(relationFrames.filter(r => r.showLabel).map(r => ({
    id: r.edge.id, width: r.width, priority: Number(r.isSelected) * 10 + Number(r.sameTopic),
    start: r.start, control: r.junction, end: r.end,
    ...(r.edge.kind === 'deduction' ? { junction: r.junction } : {}),
  })), labelObstacles, { width: svg.current?.clientWidth ?? 1200, height: svg.current?.clientHeight ?? 900 });
  return <svg ref={svg} className={`mcs-canvas${dragging ? ' is-dragging' : ''}`} tabIndex={0}
    role="group" aria-label={pick({ zh: 'MCS 数学对象画布', en: 'MCS mathematical object canvas' })}
    data-mcs-canvas="" data-level={state.level} data-edge-mode={state.edgeMode} data-zoom={scale.toFixed(4)} data-camera-x={state.camera.x.toFixed(3)} data-camera-y={state.camera.y.toFixed(3)} data-visible={boxes.filter(b => b.kind === 'object').length}
    onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} onLostPointerCapture={up}
    onKeyDown={event => {
      if ((event.target as Element).closest('[data-mcs-box], .mcs-edge-label')) return;
      const step = 50;
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) {
        event.preventDefault(); setState(s => ({ ...s, camera: { ...s.camera, x: s.camera.x + (event.key === 'ArrowLeft' ? step : event.key === 'ArrowRight' ? -step : 0), y: s.camera.y + (event.key === 'ArrowUp' ? step : event.key === 'ArrowDown' ? -step : 0) } }));
      }
    }}>
    <defs><pattern id={`${marker}-grid`} width="28" height="28" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r=".75" className="mcs-grid-dot" /></pattern>{Object.keys(MCS_RELATIONS).map(kind => <marker key={kind} id={`${marker}-arrow-${kind}`} className={`mcs-relation is-${kind}`} viewBox="0 0 16 16" refX="16" refY="8" markerWidth="16" markerHeight="16" markerUnits="userSpaceOnUse" orient="auto"><path d="M0,1 L16,8 L0,15 L3,8 Z" className="mcs-arrow" /></marker>)}</defs>
    <rect width="100%" height="100%" fill={`url(#${marker}-grid)`} />
    <g transform={`translate(${state.camera.x} ${state.camera.y}) scale(${scale})`}>
      {frames.filter(b => b.open && organizational(b)).sort((a, b) => a.depth - b.depth).map(b => {
        const o = objects.get(b.objectId)!, count = counts[b.objectId];
        return <g key={`region:${b.id}`} className={`mcs-region mcs-scale-${o.scale}${matched.has(o.id) ? '' : ' is-context'}${state.selected === b.id ? ' is-selected' : ''}`} style={{ opacity: b.opacity }} data-mcs-region={b.id}>
          <rect x={b.x} y={b.y} width={Math.max(0, b.w)} height={Math.max(0, b.h)} rx={24} vectorEffect="non-scaling-stroke" />
          <g data-mcs-box={b.id} role="button" tabIndex={active.has(b.id) ? 0 : -1} aria-label={o.title} aria-expanded={true} onClick={() => select(b.id)} onDoubleClick={() => onFocus(b.id)} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); select(b.id, true); } if (e.key === 'f') onFocus(b.id); }}>
            <rect className="mcs-region-grip" x={b.x} y={b.y} width={b.w} height={Math.min(70 / scale, b.h / 3)} rx="20" />
            <text x={b.x + 16 / scale} y={b.y - 10 / scale} fontSize={12 / scale} className={`mcs-region-title${locale === 'en' ? ' i18n-pending' : ''}`}>{data.presentation?.titles[o.id] ? pick(data.presentation.titles[o.id]) : o.title.slice(0, 28)}</text>
            <text visibility={state.level === 1 ? 'hidden' : 'visible'} x={b.x + 16 / scale} y={b.y + 42 / scale} fontSize={10 / scale} className="mcs-region-meta">{pick(MCS_SCALES[o.scale])} · {count?.matched ?? 0}/{count?.total ?? o.members.length} {compactCard ? '' : pick({ zh: '匹配', en: 'matched' })}</text>
          </g>
        </g>;
      })}
      <g className={`mcs-connections${state.selected || state.relationIds?.length ? ' has-selection' : ''}`}>{projected.structure.map(edge => {
        const a = pointOf(edge.from), b = pointOf(edge.to); if (!a || !b) return null;
        if (state.level >= 2 && !inViewport(a) && !inViewport(b)) return null;
        const start = inset(a, b), end = inset(b, a);
        return <line key={edge.id} x1={start.x} y1={start.y} x2={end.x} y2={end.y} className={`mcs-structure-edge is-${edge.kind}`} vectorEffect="non-scaling-stroke"><title>{pick({ zh: edge.kind === 'import' ? '导入' : '引用', en: edge.kind === 'import' ? 'Import' : 'Reference' })}</title></line>;
      })}</g>
      <g transform={`translate(${-state.camera.x / scale} ${-state.camera.y / scale}) scale(${1 / scale})`} className={`mcs-connections${state.selected || state.relationIds?.length ? ' has-selection' : ''}`}>
        {relationFrames.map(({ edge, isSelected, sameTopic, lane, branches, path, junction }) => <g key={edge.id}
          className={`mcs-relation is-${edge.kind}${sameTopic ? ' is-same-topic' : ' is-cross-topic'}${isSelected ? ' is-emphasized' : ''}`}
          data-mcs-relation={edge.id} data-mcs-same-topic={sameTopic} data-mcs-relation-lane={`${lane.index + 1}/${lane.count}`} data-mcs-relation-endpoints={`${edge.from}->${edge.to}`}>
          {branches.map((d, i) => <path key={i} d={d} className="mcs-premise-branch" />)}
          <path d={path} className="mcs-relation-shaft" markerEnd={`url(#${marker}-arrow-${edge.kind})`} />
          {edge.kind === 'deduction' ? <rect x={junction.x - 4} y={junction.y - 4} width={8} height={8} transform={`rotate(45 ${junction.x} ${junction.y})`} className="mcs-and-junction" /> : null}
          {[...branches, path].map((d, i) => <path key={`hit:${i}`} className="mcs-edge-hit" d={d} onClick={() => { if (!suppressClick.current) onRelations(edge.relationIds); }}><title>{`${relationLabel(edge.kind)} · ${pick({ zh: '查看关系与备注', en: 'Inspect relation and notes' })}`}</title></path>)}
        </g>)}
        {relationFrames.filter(r => r.showLabel).map(({ edge, isSelected, noted, label, width }) => {
          const position = labelPositions.get(edge.id)!;
          return <g key={`label:${edge.id}`} transform={`translate(${position.x} ${position.y})`}
            className={`mcs-edge-label is-${edge.kind}${isSelected ? ' is-emphasized' : ''}${noted ? ' has-note' : ''}`}
            data-mcs-relation-label={edge.id} role="button" tabIndex={0}
            aria-label={`${label}${edge.missingPremises ? ` · ${pick({ zh: '有前提未显示', en: 'Some premises are hidden' })}` : ''} · ${pick({ zh: '查看关系与备注', en: 'Inspect relation and notes' })}`}
            onClick={() => { if (!suppressClick.current) onRelations(edge.relationIds); }}
            onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onRelations(edge.relationIds); } }}>
            <rect x={-width / 2} y={-12} width={width} height={24} rx={8} />
            <text y={4} textAnchor="middle">{label}</text>
            <title>{pick({ zh: '查看完整关系、全部前提、来源；可添加个人备注', en: 'Inspect full relations, all premises and sources; optionally add personal notes' })}</title>
          </g>;
        })}
      </g>
      {nodeFrames.map(b => {
        const object = objects.get(b.objectId)!, c = nodePoint(b), selected = state.selected === b.id || b.kind === 'declaration' && state.selected === b.objectId;
        const isOrganization = organizational(b);
        const title = data.presentation?.titles[object.id] ? pick(data.presentation.titles[object.id]) : object.title;
        const nodeTitle = b.kind === 'reference' ? `↗ ${title}` : b.kind === 'declaration' && soleDeclaration(b.objectId) !== b.id ? `${title} · #${b.anchor}` : title;
        const summary = data.presentation?.summaries[object.id] ? pick(data.presentation.summaries[object.id]) : pick({ zh: '当前已登记的有限内容', en: 'Currently registered finite content' });
        const internal = projected.internal.filter(edge => edge.to === b.id).flatMap(edge => edge.relationIds);
        return <g key={b.id} data-mcs-box={b.id} data-mcs-kind={b.kind} data-mcs-dot={isOrganization ? undefined : ''} className={`mcs-object mcs-scale-${object.scale}${b.kind === 'reference' ? ' is-reference' : ''}${selected ? ' is-selected' : ''}${dragging === b.id || dragging === b.objectId ? ' is-lifted' : ''}${matched.has(b.objectId) ? '' : ' is-context'}`} style={{ opacity: b.opacity }} role="button" tabIndex={active.has(b.id) ? 0 : -1}
          aria-label={b.kind === 'declaration' ? `${pick({ zh: '内部声明', en: 'Internal declaration' })}: ${object.title} #${b.anchor}` : object.title}
          aria-expanded={layout.children[b.id]?.length ? b.open : undefined}
          onClick={() => select(b.id)} onDoubleClick={() => isOrganization ? onFocus(focusTarget(b.id)) : onOpenNote(b.id)}
          onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); select(b.id, true); } if (e.key === 'f') onFocus(focusTarget(b.id)); if (e.key === 'n' && !isOrganization) { e.preventDefault(); onOpenNote(b.id); } }}>
          <title>{object.title}{b.anchor ? ` #${b.anchor}` : ''}{locale === 'en' ? ' · Chinese content / not yet translated' : ''}{b.kind === 'reference' ? ` ↗ ${b.target}` : ''}{isOrganization ? pick({ zh: ' · 双击展开', en: ' · Double-click to expand' }) : pick({ zh: ' · 双击或 N 打开笔记', en: ' · Double-click or N to open notes' })}</title>
          {isOrganization ? <g transform={`translate(${c.x} ${c.y}) scale(${1 / scale})`} className="mcs-topic-card">
            <rect className="mcs-node-shape" x={-cardWidth / 2} y={-cardHeight / 2} width={cardWidth} height={cardHeight} rx={14} />
            <foreignObject x={-cardWidth / 2 + 10} y={-cardHeight / 2 + 10} width={cardWidth - 20} height={compactCard ? 30 : 20}><div className={`mcs-topic-heading${compactCard ? ' is-compact' : ''}`}>{title}</div></foreignObject>
            {!compactCard ? <foreignObject x={-cardWidth / 2 + 10} y={-13} width={cardWidth - 20} height={34}><div className="mcs-topic-summary">{summary}</div></foreignObject> : null}
            <text x={-cardWidth / 2 + 10} y={cardHeight / 2 - 10} className="mcs-topic-count">{counts[object.id]?.matched ?? 0} / {counts[object.id]?.total ?? object.members.length} {compactCard ? '' : pick({ zh: '匹配', en: 'matched' })}</text>
            {internal.length && !compactCard ? <g role="button" tabIndex={0} aria-label={pick({ zh: '查看内部关系', en: 'Inspect internal links' })} onClick={e => { e.stopPropagation(); onRelations(internal); }} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.stopPropagation(); e.preventDefault(); onRelations(internal); } }}><rect className="mcs-internal-count" x={cardWidth / 2 - 54} y={22} width={46} height={20} rx={7} /><text x={cardWidth / 2 - 47} y={36} className="mcs-topic-count">↔ {internal.length}</text></g> : null}
          </g> : <>
            <circle className="mcs-node-hit" cx={c.x} cy={c.y} r={20 / scale} />
            <circle className="mcs-node-shape" cx={c.x} cy={c.y} r={9 / scale} vectorEffect="non-scaling-stroke" />
            <circle cx={c.x} cy={c.y} r={3 / scale} className="mcs-node-core" />
            {labelIds.has(b.id) ? <g transform={`translate(${c.x} ${c.y}) scale(${1 / scale})`} className="mcs-node-label"><text y={26} textAnchor="middle" className={locale === 'en' ? 'i18n-pending' : ''}>{nodeTitle.length > 25 ? `${nodeTitle.slice(0, 24)}…` : nodeTitle}</text><text y={41} textAnchor="middle" className="mcs-node-meta">{selected ? b.kind === 'reference' ? pick({ zh: '引用入口', en: 'Reference' }) : pick(MCS_SCALES[object.scale]) : ''}</text></g> : null}
          </>}
        </g>;
      })}
    </g>
  </svg>;
}
