import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import type { CSSProperties, PointerEvent as ReactPointerEvent } from 'react';
import type { McsViewData } from '../../../shared/mcs-view.mjs';
import { createMcsAtlas, atlasFitCamera, atlasZoomCamera, atlasRegionPath, atlasCrossingPoint } from '../../../shared/mcs-atlas.mjs';
import type { AtlasNode } from '../../../shared/mcs-atlas.mjs';
import { MCS_CROSS_FIELDS } from '../../../shared/mcs-crossfields.mjs';
import { atlasFieldAffinity } from '../../../shared/mcs-atlas-affinity.mjs';
import type { AtlasAffinityLevel } from '../../../shared/mcs-atlas-affinity.mjs';
import { useI18n } from '../i18n';
import { useAtlasCameraMotion, useAtlasLayout, useAtlasReducedMotion } from '../useAtlasMotion';
import '../mcs-atlas.css';

type Point = { x: number; y: number };
type Camera = Point & { scale: number };
type Size = { width: number; height: number };
const STORAGE = 'mcs-math-atlas-v1';
const clamp = (value: number, low: number, high: number) => Math.max(low, Math.min(high, value));
const CORE_IDS = ['analysis', 'algebra', 'geometry', 'topology', 'number-theory', 'discrete', 'probability-statistics', 'foundations-computation'].map(id => `atlas:${id}`);
const AFFINITY_LABELS: Record<AtlasAffinityLevel, { zh: string; en: string }> = {
  strong: { zh: '关联较强', en: 'Closer connection' }, related: { zh: '有关联', en: 'Connected' },
  weak: { zh: '关联较弱', en: 'Lighter connection' }, unrated: { zh: '关联尚未标定', en: 'Connection not yet rated' },
};
const LABEL_OFFSETS = [0, 14, -14, 28, -28, 42, -42, 56, -56, 70, -70, 84, -84, 98, -98]
  .flatMap(dx => [0, 14, -14, 28, -28, 42, -42, 56, -56, 70, -70, 84, -84, 98, -98].map(dy => ({ dx, dy })))
  .sort((a, b) => a.dx ** 2 + a.dy ** 2 - b.dx ** 2 - b.dy ** 2);
type AtlasView = { camera: Camera; size: Size; portrait: boolean; coreId: string; layout: 'field/4' };
function readView(value: unknown): AtlasView | null {
  const raw = value as (Partial<Omit<AtlasView, 'layout'>> & { layout?: string }) | null;
  if (!raw?.camera || !raw.size || !['focus/1', 'field/2', 'field/3', 'field/4'].includes(raw.layout ?? '') || !CORE_IDS.includes(raw.coreId ?? '')) return null;
  const { x, y, scale } = raw.camera, { width, height } = raw.size;
  if (![x, y, scale, width, height].every(Number.isFinite) || Math.abs(x) >= 1e8 || Math.abs(y) >= 1e8 || scale <= 0 || scale > 10000 || width <= 0 || height <= 0 || width >= 20000 || height >= 20000) return null;
  const camera = raw.layout !== 'field/4' ? atlasFitCamera({ x: 0, y: 0, w: raw.portrait ? 1000 : 1600, h: raw.portrait ? 1600 : 1000 } as AtlasNode, raw.size, 24) : { x, y, scale };
  return { camera, size: { width, height }, portrait: raw.portrait === true, coreId: raw.coreId!, layout: 'field/4' };
}
function initialAtlasView(): AtlasView | null {
  try {
    const historyView = window.history.state?.mcsAtlas, key = window.history.state?.key;
    const stored = (() => { try { return JSON.parse(localStorage.getItem(STORAGE) ?? 'null'); } catch { return null; } })();
    return readView(key && stored?.entryKey === key && stored?.hash === window.location.hash ? stored : null)
      ?? readView(historyView?.hash === window.location.hash ? historyView : null)
      ?? (window.location.hash.startsWith('#atlas=') ? readView(JSON.parse(decodeURIComponent(window.location.hash.slice(7)))) : null)
      ?? readView(stored);
  } catch { return null; }
}
/** A navigation projection only. Colour density and distance are not mathematical metrics. */
export function McsAtlas({ data, onOpenObject }: { data: McsViewData; onOpenObject: (id?: string) => void }) {
  const { pick } = useI18n();
  const [initial] = useState(initialAtlasView);
  const [coreId, setCoreId] = useState(initial?.coreId ?? 'atlas:analysis');
  const [portrait, setPortrait] = useState(() => window.innerWidth <= 640);
  const atlas = useMemo(() => createMcsAtlas(data, portrait, coreId), [data, portrait, coreId]);
  const reduced = useAtlasReducedMotion();
  const { boxes, moving: rearranging } = useAtlasLayout(atlas, reduced);
  const gradientPrefix = useId().replace(/:/g, '');
  const gradientIds = useMemo(() => new Map(atlas.nodes.map((n, i) => [n.id, `${gradientPrefix}-field-${i}`])), [atlas, gradientPrefix]);
  const svg = useRef<SVGSVGElement>(null);
  const [size, setSize] = useState<Size>({ width: 0, height: 0 });
  const [camera, setCamera] = useState<Camera>({ x: 0, y: 0, scale: 1 });
  const live = useRef<AtlasView>({ camera, size, portrait, coreId, layout: 'field/4' });
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<string | null>(null);
  const [crossingId, setCrossingId] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [shareUrl, setShareUrl] = useState('');
  const [notice, setNotice] = useState('');
  const pointers = useRef(new Map<number, Point>());
  const velocity = useRef({ x: 0, y: 0, time: 0 });
  const pinched = useRef(false);
  const moved = useRef(false);
  const start = useRef<Point | null>(null);
  const entryKey = useRef(window.history.state?.key);
  const update = useCallback((next: Camera) => {
    live.current.camera = next;
    setCamera(next);
  }, []);
  const { stop, flyTo, zoomBy, coast, moving } = useAtlasCameraMotion(live, update, reduced);
  const chooseCore = useCallback((id: string) => {
    if (!CORE_IDS.includes(id)) return;
    pointers.current.clear(); start.current = null; setDragging(false);
    setCoreId(id); live.current.coreId = id;
    setSelected(null); setCrossingId(null); setQuery('');
    flyTo(atlasFitCamera(atlas.root, live.current.size, 24));
    svg.current?.focus({ preventScroll: true });
  }, [atlas, flyTo]);
  const save = useCallback(() => {
    if (!live.current.size.width) return;
    const view = { ...live.current, hash: window.location.hash, entryKey: entryKey.current };
    try { window.history.replaceState({ ...window.history.state, mcsAtlas: view }, ''); } catch { /* Storage can still retain the camera. */ }
    try { localStorage.setItem(STORAGE, JSON.stringify(view)); } catch { /* Browsing works without persistence. */ }
  }, []);
  useEffect(() => {
    const timer = window.setTimeout(save, 180);
    return () => clearTimeout(timer);
  }, [camera, size, coreId, save]);
  useEffect(() => {
    const hash = window.location.hash;
    window.addEventListener('pagehide', save);
    return () => {
      stop(); window.removeEventListener('pagehide', save);
      // History already points at the next entry during unmount. Only flush
      // local state, scoped to the entry that owns this camera.
      if (live.current.size.width) try { localStorage.setItem(STORAGE, JSON.stringify({ ...live.current, hash, entryKey: entryKey.current })); } catch { /* Persistence is optional. */ }
    };
  }, [save, stop]);
  const zoom = useCallback((factor: number, point: Point) => {
    zoomBy(factor, point, { width: portrait ? 1000 : 1600, height: portrait ? 1600 : 1000 });
  }, [zoomBy, portrait]);
  const fly = useCallback((node: AtlasNode) => {
    setSelected(node.id); setCrossingId(node.crossingId ?? null); setQuery('');
    svg.current?.focus({ preventScroll: true });
    const target = atlasFitCamera(node, live.current.size, node === atlas.root ? 24 : 48);
    flyTo(target);
  }, [atlas, flyTo]);
  useEffect(() => {
    const element = svg.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => {
      const next = { width: entry.contentRect.width, height: entry.contentRect.height };
      if (next.width < 1 || next.height < 1) return;
      if ((next.width <= 640) !== portrait) { setPortrait(next.width <= 640); return; }
      if (next.width === live.current.size.width && next.height === live.current.size.height && live.current.portrait === portrait) return;
      const previous = live.current.size.width ? live.current : initial;
      const nextCamera = previous ? (() => {
        const previousBounds = { ...atlas.root, w: previous.portrait ? 1000 : 1600, h: previous.portrait ? 1600 : 1000 };
        const ratio = atlasFitCamera(atlas.root, next, 24).scale / atlasFitCamera(previousBounds, previous.size, 24).scale;
        const scale = previous.camera.scale * ratio;
        const cx = (previous.size.width / 2 - previous.camera.x) / previous.camera.scale, cy = (previous.size.height / 2 - previous.camera.y) / previous.camera.scale;
        const transpose = previous.portrait !== portrait;
        return { scale, x: next.width / 2 - (transpose ? cy : cx) * scale, y: next.height / 2 - (transpose ? cx : cy) * scale };
      })() : atlasFitCamera(atlas.root, next, 24);
      stop(); live.current.size = next; live.current.portrait = portrait; setSize(next); update(nextCamera);
    });
    observer.observe(element);
    const wheel = (event: WheelEvent) => {
      event.preventDefault();
      const rect = element.getBoundingClientRect();
      const delta = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? rect.height : 1);
      zoom(Math.exp(-clamp(delta, -120, 120) * .004), { x: event.clientX - rect.left, y: event.clientY - rect.top });
    };
    const reset = () => { stop(); pointers.current.clear(); start.current = null; setDragging(false); };
    const release = (event: PointerEvent) => {
      pointers.current.delete(event.pointerId);
      if (!pointers.current.size) { start.current = null; setDragging(false); }
    };
    element.addEventListener('wheel', wheel, { passive: false });
    window.addEventListener('blur', reset);
    window.addEventListener('pointerup', release);
    window.addEventListener('pointercancel', release);
    return () => { observer.disconnect(); element.removeEventListener('wheel', wheel); window.removeEventListener('blur', reset); window.removeEventListener('pointerup', release); window.removeEventListener('pointercancel', release); };
  }, [atlas, portrait, initial, stop, update, zoom]);
  const point = (event: ReactPointerEvent<SVGSVGElement>): Point => {
    const rect = event.currentTarget.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  };
  const down = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (event.button !== 0) return;
    stop(); const p = point(event);
    if (!pointers.current.size) { moved.current = false; pinched.current = false; start.current = p; velocity.current = { x: 0, y: 0, time: performance.now() }; }
    pointers.current.set(event.pointerId, p);
    if (pointers.current.size > 1) { moved.current = true; pinched.current = true; }
    // Capture after movement so a tap can still activate its landmark.
  };
  const move = (event: ReactPointerEvent<SVGSVGElement>) => {
    const before = pointers.current.get(event.pointerId);
    if (!before) return;
    const next = point(event), oldPoints = [...pointers.current.values()];
    pointers.current.set(event.pointerId, next);
    if (start.current && Math.hypot(next.x - start.current.x, next.y - start.current.y) > 5) moved.current = true;
    if (!moved.current) return;
    event.currentTarget.setPointerCapture(event.pointerId); setDragging(true);
    if (oldPoints.length === 2) {
      const [a, b] = oldPoints, [c, d] = [...pointers.current.values()];
      const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      const after = atlasZoomCamera(live.current.camera, Math.hypot(c.x - d.x, c.y - d.y) / Math.max(1, Math.hypot(a.x - b.x, a.y - b.y)), mid, live.current.size, { width: atlas.root.w, height: atlas.root.h });
      update({ ...after, x: after.x + (c.x + d.x) / 2 - mid.x, y: after.y + (c.y + d.y) / 2 - mid.y });
    } else {
      const now = performance.now(), dt = Math.max(8, now - velocity.current.time);
      velocity.current = { x: clamp((next.x - before.x) / dt * 1000, -1600, 1600) * .6 + velocity.current.x * .4,
        y: clamp((next.y - before.y) / dt * 1000, -1600, 1600) * .6 + velocity.current.y * .4, time: now };
      update({ ...live.current.camera, x: live.current.camera.x + next.x - before.x, y: live.current.camera.y + next.y - before.y });
    }
  };
  const up = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (!pointers.current.has(event.pointerId)) return;
    pointers.current.delete(event.pointerId);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    if (!pointers.current.size) {
      setDragging(false); start.current = null;
      if (moved.current && !pinched.current && event.type === 'pointerup' && performance.now() - velocity.current.time < 90) coast(velocity.current);
    }
  };
  const homeScale = size.width ? atlasFitCamera(atlas.root, size, 24).scale : 1;
  const isOverview = camera.scale / homeScale <= 1.15;
  const envelope = (node: AtlasNode) => ({ ...node, ...(boxes[node.id] ?? node) });
  const core = envelope(atlas.byId[coreId]);
  const crossing = MCS_CROSS_FIELDS.find(item => item.id === crossingId);
  const crossingAffinity = crossing ? atlasFieldAffinity(...crossing.domains) : null;
  const crossings = MCS_CROSS_FIELDS.filter(item => item.domains.includes(coreId));
  const worldCenter = { x: (size.width / 2 - camera.x) / camera.scale, y: (size.height / 2 - camera.y) / camera.scale };
  const focused = atlas.nodes.filter(n => n.x <= worldCenter.x && n.x + n.w >= worldCenter.x && n.y <= worldCenter.y && n.y + n.h >= worldCenter.y && (n.w * camera.scale >= size.width * .65 || n.h * camera.scale >= size.height * .65)).sort((a, b) => b.depth - a.depth)[0] ?? atlas.root;
  const path: AtlasNode[] = [];
  for (let node: AtlasNode | undefined = focused; node; node = node.parentId ? atlas.byId[node.parentId] : undefined) path.unshift(node);
  const search = query.trim().toLocaleLowerCase();
  const results = search ? atlas.nodes.filter(n => n !== atlas.root && `${n.title.zh} ${n.title.en} ${n.objectId ?? ''}`.toLocaleLowerCase().includes(search)).slice(0, 16) : [];
  const chosen = selected ? atlas.byId[selected] : null;
  const fieldLabelSize = (isCore: boolean) => ({
    width: isCore ? portrait ? 112 : 250 : portrait ? 92 : 190,
    height: isCore ? portrait ? 80 : 110 : portrait ? 58 : 74,
  });
  const revealOf = (node: AtlasNode, box: AtlasNode) => {
    const inset = Math.min(48, Math.min(size.width, size.height) * .15);
    const ratio = Math.max(box.w * camera.scale / Math.max(1, size.width - inset * 2), box.h * camera.scale / Math.max(1, size.height - inset * 2));
    const coarse = node.depth === 1 ? clamp((camera.scale / homeScale - 1.05) / .2, 0, 1) : 1;
    return node.children.length ? Math.min(coarse, clamp((ratio - .72) / .25, 0, 1)) : 0;
  };
  const rootLabels = new Map(atlas.root.children.map(node => {
    const box = envelope(node), peripheral = node.id !== coreId && !isOverview;
    const label = peripheral ? { width: portrait ? 78 : 140, height: portrait ? 42 : 50 } : fieldLabelSize(node.id === coreId);
    let cx = (box.x + box.w / 2) * camera.scale + camera.x, cy = (box.y + box.h / 2) * camera.scale + camera.y;
    if (peripheral) {
      const dx = cx - ((core.x + core.w / 2) * camera.scale + camera.x), dy = cy - ((core.y + core.h / 2) * camera.scale + camera.y), length = Math.hypot(dx, dy) || 1;
      cx = clamp(cx + dx / length * 24, label.width / 2 + 4, size.width - label.width / 2 - 4);
      cy = clamp(cy + dy / length * 24, label.height / 2 + 4, size.height - label.height / 2 - 4);
    }
    const clearOfPath = !peripheral || cy - label.height / 2 >= 54 || cx - label.width / 2 >= size.width * .55;
    return [node.id, { x: cx - label.width / 2, y: cy - label.height / 2, w: label.width, h: label.height, visible: revealOf(node, box) < .97 && clearOfPath }];
  }));
  const occupied = [...rootLabels.values()].filter(label => label.visible).map(({ x, y, w, h }) => ({ x, y, w, h }));
  const navLabels = occupied.map(label => ({ ...label }));
  navLabels.push({ x: 6, y: 6, w: portrait ? 190 : 300, h: portrait ? 48 : 44 });
  const crossingLabels = crossings.map(item => {
    const other = envelope(atlas.byId[item.domains.find(id => id !== coreId)!]);
    const anchor = atlasCrossingPoint(core, other);
    const x = anchor.x * camera.scale + camera.x, y = anchor.y * camera.scale + camera.y;
    const w = portrait ? 78 : 166, h = portrait ? 40 : 44;
    const angle = Math.atan2(other.y + other.h / 2 - core.y - core.h / 2, other.x + other.w / 2 - core.x - core.w / 2);
    const candidates = (portrait ? [0, 18, -18, 32, -32] : [0, 18, -18, 32, -32, 48, -48, 64, -64]).map(offset => ({ x: x - Math.sin(angle) * offset - w / 2, y: y + Math.cos(angle) * offset - h / 2, w, h }));
    const available = (a: { x: number; y: number; w: number; h: number }) => a.x >= 4 && a.y >= 4 && a.x + a.w <= size.width - 4 && a.y + a.h <= size.height - 4
      && occupied.every(b => a.x + a.w + 3 <= b.x || b.x + b.w + 3 <= a.x || a.y + a.h + 3 <= b.y || b.y + b.h + 3 <= a.y);
    const position = candidates.find(available);
    // A small weakly linked field puts its seam close to its name. Search in
    // both directions around that seam so the marker cannot sit behind a name.
    const offsets = [0, 18, -18, 32, -32, 48, -48, 64, -64];
    const marker = position ?? offsets.flatMap(radial => offsets.map(tangent => ({ radial, tangent })))
      .sort((a, b) => a.radial ** 2 + a.tangent ** 2 - b.radial ** 2 - b.tangent ** 2)
      .map(({ radial, tangent }) => ({ x: x + Math.cos(angle) * radial - Math.sin(angle) * tangent - 16,
        y: y + Math.sin(angle) * radial + Math.cos(angle) * tangent - 16, w: 32, h: 32 })).find(available)
      ?? { x: x - 16, y: y - 16, w: 32, h: 32 };
    occupied.push(position ?? marker);
    return { item, compact: !position, ...(position ?? marker) };
  });
  const draw = (node: AtlasNode, layer: 'terrain' | 'labels', inherited = 1, opening = 1): React.ReactNode => {
    const box = envelope(node);
    if (node.neighbourId && node.parentId) {
      const parent = envelope(atlas.byId[node.parentId]);
      const progress = clamp(opening, 0, 1), outward = .68 + .32 * progress * progress * (3 - 2 * progress);
      const cx = parent.x + parent.w / 2, cy = parent.y + parent.h / 2;
      box.x = cx + (box.x + box.w / 2 - cx) * outward - box.w / 2;
      box.y = cy + (box.y + box.h / 2 - cy) * outward - box.h / 2;
    }
    const x = box.x * camera.scale + camera.x, y = box.y * camera.scale + camera.y;
    const w = box.w * camera.scale, h = box.h * camera.scale;
    if (x + w < 0 || y + h < 0 || x > size.width || y > size.height || w < 2 || h < 2) return null;
    const reveal = revealOf(node, box);
    const alpha = inherited;
    const context = node.depth === 1 && node.id !== coreId && !isOverview;
    const titleOpacity = (1 - reveal) * (context ? .7 : 1) * (rootLabels.get(node.id)?.visible === false ? 0 : 1);
    const title = pick(node.title);
    const affinityTitle = node.affinity ? pick(AFFINITY_LABELS[node.affinity.level]) : '';
    const affinityCrossing = node.affinity?.crossingId ? MCS_CROSS_FIELDS.find(item => item.id === node.affinity!.crossingId) : null;
    const interactive = alpha > .5 && titleOpacity > .45;
    const broad = node.depth === 1 && isOverview;
    const isCore = node.id === coreId;
    const cx = x + w / 2, cy = y + h / 2;
    const rootLabel = rootLabels.get(node.id);
    // On a small field overview the crossings carry the orientation. Ordinary
    // branches keep touchable landmarks; their names unfold with further zoom.
    const branchLabelAlpha = portrait && node.depth === 2 && !node.neighbourId ? clamp((camera.scale / homeScale - 1.45) / .25, 0, 1) : 1;
    const fullWidth = rootLabel?.w ?? (portrait && node.depth === 2 ? clamp(w, 96, 140) : clamp(w * .76, 100, portrait ? 160 : 230));
    const fullHeight = rootLabel?.h ?? (portrait && node.depth === 2 ? node.neighbourId ? 68 : 60 : 88);
    const labelWidth = 32 + (fullWidth - 32) * branchLabelAlpha, labelHeight = 32 + (fullHeight - 32) * branchLabelAlpha;
    let labelX = rootLabel?.x ?? cx - labelWidth / 2, labelY = rootLabel?.y ?? cy - labelHeight / 2;
    if (layer === 'labels' && node.depth === 2 && titleOpacity > .1) {
      const parent = node.parentId ? envelope(atlas.byId[node.parentId]) : null;
      const neighbour = node.neighbourId ? envelope(atlas.byId[node.neighbourId]) : null;
      const keepsDirection = (a: { x: number; y: number; w: number; h: number }) => {
        if (!parent || !neighbour) return true;
        const px = (parent.x + parent.w / 2) * camera.scale + camera.x, py = (parent.y + parent.h / 2) * camera.scale + camera.y;
        const vx = (neighbour.x + neighbour.w / 2 - parent.x - parent.w / 2) * camera.scale;
        const vy = (neighbour.y + neighbour.h / 2 - parent.y - parent.h / 2) * camera.scale;
        const dx = a.x + a.w / 2 - px, dy = a.y + a.h / 2 - py, dot = dx * vx + dy * vy;
        return dot >= .9 * Math.hypot(dx, dy) * Math.hypot(vx, vy)
          && dot >= .68 * Math.hypot(cx - px, cy - py) * Math.hypot(vx, vy);
      };
      const label = LABEL_OFFSETS
        .map(({ dx, dy }) => ({ x: labelX + dx, y: labelY + dy, w: labelWidth, h: labelHeight }))
        .find(a => a.x >= 4 && a.y >= 4 && a.x + a.w <= size.width - 4 && a.y + a.h <= size.height - 4
          && keepsDirection(a)
          && navLabels.every(b => a.x + a.w + 3 <= b.x || b.x + b.w + 3 <= a.x || a.y + a.h + 3 <= b.y || b.y + b.h + 3 <= a.y));
      if (label) { labelX = label.x; labelY = label.y; }
      navLabels.push({ x: labelX, y: labelY, w: labelWidth, h: labelHeight });
    }
    // The envelope is for navigation; the influence continues beyond it and
    // fades into neighbouring colours, so no outline becomes a hard border.
    const prominence = clamp((Math.sqrt(box.w * box.h) - Math.sqrt(400 * 300)) / (Math.sqrt(1080 * 740) - Math.sqrt(400 * 300)), 0, 1);
    const spread = node.depth === 1 ? 1.8 - prominence * .5 : 1.15;
    const shape = { id: node.id, x: cx - w * spread / 2, y: cy - h * spread / 2, w: w * spread, h: h * spread };
    return <g key={node.id} data-atlas-node={layer === 'labels' ? node.id : undefined} data-atlas-terrain={layer === 'terrain' ? node.id : undefined} data-atlas-depth={layer === 'labels' ? node.depth : undefined} data-atlas-core={layer === 'labels' && isCore || undefined} data-atlas-affinity={node.affinity?.level} data-atlas-crossing-child={node.crossingId} data-atlas-neighbour={node.neighbourId} data-expanded={reveal > .5} data-world-x={box.x} data-world-y={box.y} data-world-w={box.w} data-world-h={box.h} opacity={alpha} style={{ '--atlas-color': node.color } as CSSProperties}>
      {layer === 'terrain' ? <>
        <path className="mcs-atlas-region" d={atlasRegionPath(shape)} fill={`url(#${gradientIds.get(node.id)})`} opacity={node.depth === 1 ? 1 - reveal * .48 : .8} />
        {node.depth > 1 && node.children.length > 0 ? <path className="mcs-atlas-contour" d={atlasRegionPath(shape, .68)} opacity={.1 + reveal * .08} /> : null}
      </> : <>
        {reveal > .01 && w > 140 ? <text className="mcs-atlas-region-name" textAnchor="middle" x={cx} y={y + h * .1} opacity={reveal}>{title}</text> : null}
        {titleOpacity > .01 && w > (broad ? 25 : 32) && h > 28 ? <g className="mcs-atlas-label-offset" style={{ transform: `translate(${labelX - (cx - labelWidth / 2)}px, ${labelY - (cy - labelHeight / 2)}px)` }}><foreignObject x={cx - labelWidth / 2} y={cy - labelHeight / 2} width={labelWidth} height={labelHeight} opacity={titleOpacity} pointerEvents="none">
          <button type="button" tabIndex={interactive ? 0 : -1} aria-label={title} title={broad && !isCore ? `${pick({ zh: `以${title}为核心`, en: `Center on ${title}` })} · ${affinityTitle}${affinityCrossing ? ` · ${pick(affinityCrossing.title)}` : ''}` : title} className={`mcs-atlas-place${broad ? isCore ? ' is-core' : ' is-peripheral' : ''}${node.depth === 2 ? ' is-branch' : ''}${node.objectId ? ' is-object' : ''}${chosen?.id === node.id ? ' is-selected' : ''}`} style={{ pointerEvents: interactive ? 'auto' : 'none', fontSize: context ? portrait ? 10 : 14 : broad ? isCore ? portrait ? 23 : 42 : portrait ? 12 : 20 : clamp(Math.min(w / 9, h / 6), 12, 24) }} onClick={event => { if (event.detail === 0 || !moved.current) { if (broad && !isCore && CORE_IDS.includes(node.id)) chooseCore(node.id); else fly(node); } }}>
            <span className="mcs-atlas-landmark" aria-hidden="true" />
            {branchLabelAlpha > .01 ? <strong style={{ opacity: branchLabelAlpha }}>{title}</strong> : null}
            {broad && isCore ? <span className="mcs-atlas-place-hint">{pick({ zh: '由此深入', en: 'Explore from here' })}</span> : !broad && node.objectId && branchLabelAlpha > .5 ? <span className="mcs-atlas-place-hint">{pick({ zh: '已收录对象', en: 'Library object' })}</span> : null}
            {node.neighbourId ? <span className="mcs-atlas-place-hint mcs-atlas-neighbour-hint">→ {pick(atlas.byId[node.neighbourId].title)}</span> : null}
          </button>
      </foreignObject></g> : null}
      </>}
      {reveal > .01 ? (layer === 'labels' ? [...node.children].sort((a, b) => Number(Boolean(b.neighbourId)) - Number(Boolean(a.neighbourId))) : node.children).map(child => draw(child, layer, inherited * reveal, reveal)) : null}
    </g>;
  };
  const share = async () => {
    save(); const url = new URL(window.location.href);
    url.hash = `atlas=${encodeURIComponent(JSON.stringify(live.current))}`;
    setShareUrl(url.href);
    try { await navigator.clipboard.writeText(url.href); setNotice(pick({ zh: '地图链接已复制', en: 'Map link copied' })); }
    catch { setNotice(pick({ zh: '复制下方地图链接', en: 'Copy the map link below' })); }
  };
  return <section className="mcs-workspace mcs-atlas-workspace" aria-label={pick({ zh: 'MCS 数学地图', en: 'MCS map of mathematics' })}>
    <header className="mcs-toolbar">
      <div className="mcs-title"><h1>MCS <span>{pick({ zh: '数学地图', en: 'Map of mathematics' })}</span></h1></div>
      <label className="mcs-atlas-core-picker">{pick({ zh: '核心子学科', en: 'Central field' })}<select aria-label={pick({ zh: '核心子学科', en: 'Central field' })} value={coreId} onChange={event => chooseCore(event.target.value)}>{atlas.root.children.filter(n => CORE_IDS.includes(n.id)).map(n => <option key={n.id} value={n.id}>{pick(n.title)}</option>)}</select></label>
      <label className="mcs-search mcs-toolbar-search"><input type="search" aria-label={pick({ zh: '搜索数学地图', en: 'Search the math map' })} placeholder={pick({ zh: '搜索领域、分支与对象…', en: 'Find a field, branch or object…' })} value={query} onChange={e => setQuery(e.target.value)} /></label>
      <div className="mcs-toolbar-actions"><button type="button" onClick={() => { save(); onOpenObject(); }}>{pick({ zh: '对象网络', en: 'Object network' })}</button><button type="button" onClick={share}>{pick({ zh: '分享地图', en: 'Share map' })}</button></div>
    </header>
    <div className="mcs-atlas-stage">
      <svg ref={svg} className={`mcs-atlas-canvas${dragging ? ' is-dragging' : ''}`} data-mcs-atlas data-motion={moving || rearranging ? 'moving' : 'idle'} data-zoom={camera.scale} data-camera-x={camera.x} data-camera-y={camera.y} tabIndex={0} role="group" aria-label={pick({ zh: '数学地图，方向键平移，加减键缩放，Home 返回全景', en: 'Math map: arrow keys pan, plus and minus zoom, Home resets' })} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={event => { moved.current = true; up(event); }} onLostPointerCapture={event => { if (event.target === event.currentTarget) up(event); }} onKeyDown={event => {
        if (event.target !== event.currentTarget) return;
        const center = { x: size.width / 2, y: size.height / 2 };
        if (['+', '=', '-', '_'].includes(event.key)) zoom(['+', '='].includes(event.key) ? 1.4 : 1 / 1.4, center);
        else if (event.key === 'Home') fly(atlas.root);
        else if (event.key.startsWith('Arrow')) { flyTo({ ...camera, x: camera.x + (event.key === 'ArrowLeft' ? 70 : event.key === 'ArrowRight' ? -70 : 0), y: camera.y + (event.key === 'ArrowUp' ? 70 : event.key === 'ArrowDown' ? -70 : 0) }); }
        else return;
        event.preventDefault();
      }}>
        <defs>{atlas.nodes.map(node => <radialGradient key={node.id} id={gradientIds.get(node.id)} cx="48%" cy="48%" r="54%">
          <stop offset="0%" stopColor={node.color} stopOpacity=".48" /><stop offset="35%" stopColor={node.neighbourId ? atlas.byId[node.neighbourId].color : node.color} stopOpacity=".3" />
          <stop offset="60%" stopColor={node.neighbourId ? atlas.byId[node.neighbourId].color : node.color} stopOpacity=".12" /><stop offset="82%" stopColor={node.color} stopOpacity="0" />
        </radialGradient>)}</defs>
        <g className="mcs-atlas-terrain" pointerEvents="none">{size.width > 0 ? atlas.root.children.map(n => draw(n, 'terrain')) : null}</g>
        {size.width > 0 && camera.scale / homeScale < 1.25 ? <g className="mcs-atlas-crossings" opacity={clamp((1.25 - camera.scale / homeScale) / .2, 0, 1)}>{crossingLabels.map(({ item, compact, x, y, w, h }) => {
          return <foreignObject key={item.id} x={x} y={y} width={w} height={h} data-atlas-crossing={item.id}>
            <button type="button" className={`mcs-atlas-crossing${compact ? ' is-compact' : ''}`} tabIndex={camera.scale / homeScale < 1.15 ? 0 : -1} aria-label={pick({ zh: `交叉学科：${item.title.zh}`, en: `Intersection: ${item.title.en}` })} title={pick(item.title)} onClick={event => { if (event.detail === 0 || !moved.current) { setCrossingId(item.id); setSelected(null); } }}><span aria-hidden="true">⋈</span><span className="mcs-atlas-crossing-title">{pick(item.title)}</span></button>
          </foreignObject>;
        })}</g> : null}
        {size.width > 0 ? atlas.root.children.map(n => draw(n, 'labels')) : null}
      </svg>
      <nav className="mcs-atlas-breadcrumbs" aria-label={pick({ zh: '当前位置', en: 'Current location' })}>{path.map((n, i) => <span key={n.id}>{i ? <span aria-hidden="true">/</span> : null}<button type="button" onClick={() => fly(n)}>{n === atlas.root ? pick({ zh: '数学全景', en: 'All mathematics' }) : pick(n.title)}</button></span>)}</nav>
      {search ? <div className="mcs-search-results mcs-atlas-results" aria-label={pick({ zh: '搜索结果', en: 'Search results' })}>{results.length ? results.map(n => <button type="button" key={n.id} onClick={() => fly(n)}>{pick(n.title)}<small>{n.parentId ? pick(atlas.byId[n.parentId].title) : ''}</small></button>) : <p>{pick({ zh: '未找到匹配的分支或对象', en: 'No matching branches or objects' })}</p>}</div> : null}
      {chosen && chosen !== atlas.root && !chosen.children.length && !chosen.crossingId ? <aside className="mcs-atlas-detail" aria-live="polite"><strong>{pick(chosen.title)}</strong>{chosen.objectId ? <button className="button" type="button" onClick={() => { save(); onOpenObject(chosen.objectId); }}>{pick({ zh: '打开对象与关系', en: 'Open object and relations' })}</button> : <span>{pick({ zh: '此分支尚无已收录对象。可返回上层继续探索。', en: 'No objects added to this branch yet. Return to the parent to keep exploring.' })}</span>}<button type="button" className="mcs-icon-button" aria-label={pick({ zh: '关闭详情', en: 'Close details' })} onClick={() => setSelected(null)}>×</button></aside> : null}
      {crossing ? <aside className="mcs-atlas-detail mcs-atlas-cross-detail" aria-label={pick({ zh: '交叉学科内容', en: 'Intersection details' })}>
        <small>{crossing.domains.map(id => pick(atlas.byId[id].title)).join(' ∩ ')}</small>
        {crossingAffinity ? <small>{pick(AFFINITY_LABELS[crossingAffinity.level])}</small> : null}
        <strong>{pick(crossing.title)}</strong><p>{pick(crossing.description)}</p>
        {crossing.targetIds.filter(id => atlas.byId[id]).length ? <div className="mcs-atlas-related"><span>{pick({ zh: '相关分支入口', en: 'Related branches' })}</span>{crossing.targetIds.filter(id => atlas.byId[id]).map(id => <button type="button" key={id} onClick={() => fly(atlas.byId[id])}>{pick(atlas.byId[id].title)} →</button>)}</div> : <span>{pick({ zh: '此交叉方向尚未关联库内专题。', en: 'No library topics are linked to this intersection yet.' })}</span>}
        <details><summary>{pick({ zh: '参考来源', en: 'Sources' })}</summary>{crossing.sources.map((url, i) => <a href={url} key={url} target="_blank" rel="noreferrer">{pick({ zh: '来源', en: 'Source' })} {i + 1} ↗</a>)}</details>
        <button type="button" className="mcs-icon-button" aria-label={pick({ zh: '关闭交叉内容', en: 'Close intersection' })} onClick={() => setCrossingId(null)}>×</button>
      </aside> : null}
      <div className="mcs-atlas-tools"><button type="button" onClick={() => fly(atlas.root)}>{pick({ zh: '数学全景', en: 'All mathematics' })}</button><button type="button" disabled={focused === atlas.root} onClick={() => fly(atlas.byId[focused.parentId!] ?? atlas.root)}>{pick({ zh: '返回上层', en: 'Parent' })}</button><span className="mcs-atlas-tool-divider" /><button type="button" aria-label={pick({ zh: '缩小', en: 'Zoom out' })} onClick={() => zoom(1 / 1.5, { x: size.width / 2, y: size.height / 2 })}>−</button><output>{Math.round(camera.scale / homeScale * 100)}%</output><button type="button" aria-label={pick({ zh: '放大', en: 'Zoom in' })} onClick={() => zoom(1.5, { x: size.width / 2, y: size.height / 2 })}>+</button></div>
      <p className="mcs-atlas-help">{isOverview ? pick({ zh: '关联越强，外围区域越大 · 点击学科切换核心 · 滚轮深入', en: 'Closer connections occupy more area · Tap a field to recenter · Scroll to zoom' }) : pick({ zh: '滚轮 / 双指缩放 · 拖动平移 · 点击分支深入', en: 'Scroll / pinch to zoom · Drag to pan · Tap to explore' })}</p>
    </div>
    <footer className="mcs-statusbar"><span>{pick({ zh: '领域 → 分支 → 专题 → 数学对象', en: 'Fields → branches → topics → mathematical objects' })}</span><span>{pick({ zh: '学科相互交融，留白容纳更多可能。', en: 'Fields blend into one another, with room for more.' })}</span></footer>
    {shareUrl ? <div className="mcs-notice" role="status"><button className="mcs-icon-button" type="button" aria-label={pick({ zh: '关闭提示', en: 'Dismiss' })} onClick={() => setShareUrl('')}>×</button><p>{notice}</p><input aria-label={pick({ zh: '地图分享链接', en: 'Map share link' })} readOnly value={shareUrl} onFocus={e => e.target.select()} /></div> : null}
  </section>;
}
