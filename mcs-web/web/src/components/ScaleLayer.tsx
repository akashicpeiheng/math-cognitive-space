import { useRef, useState, type MouseEvent, type PointerEvent } from 'react';
import type { Point } from '../scale-network';
import {
  displayRect, rectAnchors, type ProjectedEdge, type ScaleCatalogue, type ScaleDisplay, type ScaleLevelId, type ScalePlacement,
} from '../scale-network';
import { NODE_W, NODE_H } from '../network';

/**
 * 尺度对象的 SVG 层（2026-10-17）。
 *
 * 三类东西，按顺序画：
 * 1. 尺度归属虚线（父卡片/标题 → 可见子对象）；
 * 2. 聚合边（节点边投影到合拢卡片后的一对一线，带「N 条联系」计数）；
 * 3. 尺度卡片 / 标题 / 分子。
 *
 * 卡片尺寸是**屏幕像素**：外层 `translate(anchor)` + `scale(1/zoom)`，所以 25% 下标题
 * 仍然可读，而卡片在画布里占的世界尺寸由 `widthWorld/heightWorld` 给出。
 * 这不是「把文字放大」：位置仍是世界坐标，只是尺寸不跟着相机缩。
 */
export interface ScaleLayerText {
  scaleLabels: Record<ScaleLevelId, string>;
  split: string;
  collapse: string;
  merged: string;
  members: string;
  membersTotal: string;
  aggregateEdge: string;
  menuHint: string;
  provisional: string;
}

export interface ScaleLayerProps {
  display: ScaleDisplay;
  catalogue: ScaleCatalogue;
  nodePositions: Map<string, Point>;
  zoom: number;
  selectedId: string | null;
  showMembershipEdges: boolean;
  text: ScaleLayerText;
  projectedEdges: ProjectedEdge[];
  onSelect: (id: string) => void;
  onMenu: (id: string, position: { x: number; y: number }) => void;
  onToggle: (id: string) => void;
  /** 拖动尺度卡片：起点、实时左上角、松手（moved=false 时只当作点击）。 */
  onDragStart: (id: string, anchor: Point) => void;
  onDrag: (id: string, anchor: Point) => void;
  onDragEnd: (id: string, anchor: Point | null, moved: boolean) => void;
}

function format(template: string, values: Record<string, string | number>) {
  return template.replace(/\{(\w+)\}/g, (match, key: string) => (key in values ? String(values[key]) : match));
}

function truncate(value: string, max: number) {
  return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}

function placementRect(placement: ScalePlacement) {
  return { x: placement.anchor.x, y: placement.anchor.y, w: placement.widthWorld, h: placement.heightWorld };
}

export function ScaleLayer({
  display, catalogue, nodePositions, zoom, selectedId, showMembershipEdges, text, projectedEdges,
  onSelect, onMenu, onToggle, onDragStart, onDrag, onDragEnd,
}: ScaleLayerProps) {
  const dragRef = useRef<{
    id: string; pointerId: number; startX: number; startY: number; origin: Point; last: Point | null; moved: boolean;
  } | null>(null);
  const suppressClickRef = useRef(false);
  const [draggingId, setDraggingId] = useState<string | null>(null);

  const beginDrag = (event: PointerEvent<SVGGElement>, placement: ScalePlacement) => {
    if (event.button !== 0) return;
    event.stopPropagation();
    suppressClickRef.current = false;
    dragRef.current = {
      id: placement.id,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      origin: placement.anchor,
      last: placement.anchor,
      moved: false,
    };
    setDraggingId(placement.id);
    onDragStart(placement.id, placement.anchor);
    try { event.currentTarget.setPointerCapture?.(event.pointerId); } catch { /* 指针已失效：仍按坐标拖 */ }
  };

  const moveDrag = (event: PointerEvent<SVGGElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    event.stopPropagation();
    const dx = event.clientX - drag.startX;
    const dy = event.clientY - drag.startY;
    if (!drag.moved && Math.hypot(dx, dy) < 3) return;
    if (!drag.moved) { drag.moved = true; suppressClickRef.current = true; }
    const scale = Math.max(zoom, 0.01);
    const point = { x: drag.origin.x + dx / scale, y: drag.origin.y + dy / scale };
    drag.last = point;
    onDrag(drag.id, point);
  };

  const finishDrag = (event: PointerEvent<SVGGElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    event.stopPropagation();
    try { event.currentTarget.releasePointerCapture?.(event.pointerId); } catch { /* 指针已失效 */ }
    dragRef.current = null;
    setDraggingId(null);
    onDragEnd(drag.id, drag.last, drag.moved);
    if (drag.moved) window.setTimeout(() => { suppressClickRef.current = false; }, 0);
  };
  const placements = [...display.visibleScale.values()].sort((left, right) => {
    const rank: Record<ScaleLevelId, number> = { molecule: 0, node: 1, unit: 2, topic: 3 };
    return rank[left.scale] - rank[right.scale] || left.id.localeCompare(right.id, 'en');
  });

  const projected = projectedEdges.filter((edge) => {
    const fromScale = !display.visibleNodes.has(edge.from);
    const toScale = !display.visibleNodes.has(edge.to);
    return fromScale || toScale;
  });

  const memberships: Array<{ key: string; parent: ScalePlacement; child: ScalePlacement }> = [];
  if (showMembershipEdges) {
    for (const child of placements) {
      const object = catalogue.byId.get(child.id);
      for (const parentId of object?.parentIds ?? []) {
        const parent = display.visibleScale.get(parentId);
        if (parent) memberships.push({ key: `${parentId}->${child.id}`, parent, child });
      }
    }
  }

  const rectOfDisplay = (id: string) => {
    if (display.visibleNodes.has(id)) {
      const point = nodePositions.get(id);
      return point ? { x: point.x, y: point.y, w: NODE_W, h: NODE_H } : null;
    }
    return display.visibleScale.get(id) ? placementRect(display.visibleScale.get(id)!) : null;
  };

  return (
    <g className="scale-layer" data-scale-layer="1">
      {memberships.length > 0 && (
        <g className="scale-membership-edges" aria-hidden="true">
          {memberships.map(({ key, parent, child }) => {
            const line = rectAnchors(placementRect(parent), placementRect(child));
            return <line key={key} className="scale-membership-edge" x1={line.x1} y1={line.y1} x2={line.x2} y2={line.y2} />;
          })}
        </g>
      )}

      {projected.length > 0 && (
        <g className="scale-projected-edges" aria-hidden="true">
          {projected.map((edge) => {
            const from = rectOfDisplay(edge.from);
            const to = rectOfDisplay(edge.to);
            if (!from || !to) return null;
            const line = rectAnchors(from, to);
            const midX = (line.x1 + line.x2) / 2;
            const midY = (line.y1 + line.y2) / 2;
            return (
              <g key={edge.id} data-projected-edge={edge.id} data-count={edge.count}>
                <line className="scale-projected-edge" x1={line.x1} y1={line.y1} x2={line.x2} y2={line.y2} />
                {edge.count > 1 && (
                  <g className="scale-edge-badge" transform={`translate(${midX} ${midY}) scale(${1 / Math.max(zoom, 0.01)})`}>
                    <rect x="-35" y="-9" width="70" height="18" rx="9" />
                    <text y="3.5" textAnchor="middle" fontSize="9.5">{format(text.aggregateEdge, { count: edge.count })}</text>
                  </g>
                )}
                <title>{format(text.aggregateEdge, { count: edge.count })}</title>
              </g>
            );
          })}
        </g>
      )}

      <g className="scale-objects">
        {placements.map((placement) => {
          const object = catalogue.byId.get(placement.id);
          const selected = selectedId === placement.id;
          const countText = placement.scale === 'unit' || placement.scale === 'topic'
            ? placement.form === 'card'
              ? format(text.membersTotal, { count: placement.merged?.count ?? placement.membersTotal })
              : format(text.members, { count: placement.merged?.count ?? placement.membersVisible, total: placement.membersTotal })
            : '';
          const mergedText = placement.merged ? format(text.merged, { count: placement.merged.count, total: placement.merged.total }) : '';
          const title = truncate(placement.title, placement.scale === 'molecule' ? 18 : 14);
          const toggleLabel = placement.form === 'header' ? text.collapse : text.split;
          const actionLabel = placement.form === 'header' ? '−' : '+';
          const openMenu = (event: MouseEvent) => {
            event.preventDefault();
            event.stopPropagation();
            const stage = (event.currentTarget as SVGGElement).ownerSVGElement?.parentElement?.getBoundingClientRect();
            onMenu(placement.id, {
              x: event.clientX - (stage?.left ?? 0),
              y: event.clientY - (stage?.top ?? 0),
            });
          };
          return (
            <g
              key={placement.id}
              className={`network-scale-object form-${placement.form}${selected ? ' selected' : ''}${placement.merged ? ' is-merged' : ''}${draggingId === placement.id ? ' is-dragging' : ''}`}
              data-scale-object={placement.id}
              data-scale={placement.scale}
              data-form={placement.form}
              data-merged={placement.merged ? placement.merged.count : undefined}
              data-provisional={placement.provisional ? '1' : undefined}
              transform={`translate(${placement.anchor.x} ${placement.anchor.y}) scale(${1 / Math.max(zoom, 0.01)})`}
              role="button"
              tabIndex={0}
              aria-label={`${text.scaleLabels[placement.scale]}：${placement.title}${mergedText ? `；${mergedText}` : ''}${countText ? `；${countText}` : ''}`}
              onClick={(event) => {
                event.stopPropagation();
                if (suppressClickRef.current) { suppressClickRef.current = false; return; }
                onSelect(placement.id);
              }}
              onDoubleClick={(event) => { event.stopPropagation(); if (placement.scale !== 'molecule') onToggle(placement.id); }}
              onContextMenu={openMenu}
              onPointerDown={(event) => beginDrag(event, placement)}
              onPointerMove={moveDrag}
              onPointerUp={finishDrag}
              onPointerCancel={finishDrag}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); event.stopPropagation(); onSelect(placement.id); }
                if (event.key === 'ContextMenu' || (event.shiftKey && event.key === 'F10')) {
                  event.preventDefault();
                  event.stopPropagation();
                  const bounds = event.currentTarget.getBoundingClientRect();
                  const stage = event.currentTarget.ownerSVGElement?.parentElement?.getBoundingClientRect();
                  onMenu(placement.id, { x: bounds.left + bounds.width / 2 - (stage?.left ?? 0), y: bounds.top + bounds.height / 2 - (stage?.top ?? 0) });
                }
              }}
            >
              <g className="scale-card-inner">
              <rect className="scale-card" width={placement.widthPx} height={placement.heightPx} rx="10" />
              <rect className="scale-card-accent" width="5" height={placement.heightPx} rx="2.5" />
              <text className="scale-badge" x="14" y="15" fontSize="9.5">{text.scaleLabels[placement.scale]}</text>
              {placement.provisional && <text className="scale-provisional" x={placement.widthPx - 10} y="15" fontSize="9" textAnchor="end">{text.provisional}</text>}
              <text className="scale-title" x="14" y={placement.form === 'header' ? 34 : 34} fontSize="12">{title}</text>
              {placement.form !== 'header' && (
                <text className="scale-meta" x="14" y={placement.heightPx - 12} fontSize="9.5">
                  {[countText, mergedText].filter(Boolean).join(' · ') || object?.organization?.slice(0, 16) || ''}
                </text>
              )}
              {object?.atoms && object.atoms.length > 0 && placement.form !== 'header' && (
                <text className="scale-atoms" x="14" y={placement.heightPx - 26} fontSize="9">
                  {object.atoms.slice(0, 3).map((atom) => atom.label).join(' · ')}
                </text>
              )}
              {placement.scale !== 'molecule' && (
                <g
                  className="scale-toggle"
                  data-action="toggle-scale"
                  transform={`translate(${placement.widthPx - 28} ${placement.heightPx - 20})`}
                  role="button"
                  tabIndex={-1}
                  aria-label={toggleLabel}
                  onClick={(event) => { event.stopPropagation(); onToggle(placement.id); }}
                  onPointerDown={(event) => event.stopPropagation()}
                >
                  <rect width="20" height="16" rx="5" />
                  <text x="10" y="12" textAnchor="middle" fontSize="11">{actionLabel}</text>
                </g>
              )}
              <title>{`${placement.title}${mergedText ? ` · ${mergedText}` : ''}${countText ? ` · ${countText}` : ''} · ${text.menuHint}`}</title>
              </g>
            </g>
          );
        })}
      </g>
    </g>
  );
}
