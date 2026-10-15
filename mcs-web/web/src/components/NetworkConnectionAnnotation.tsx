import { useLayoutEffect, useRef, useState } from 'react';
import { useI18n } from '../i18n';
import { plainMathText } from '../labels';
import { connectionTargets, scalingSummary } from '../connection-display';
import { useConnectionNotes } from '../connection-notes';
import type { NetworkEdge } from '../network';
import { NODE_H, NODE_W } from '../network';

/** An independent, constant-screen-size label layer: annotations survive zoom and dimming. */
export function NetworkConnectionAnnotation({ edges, x, y, scale, nodes, dx, dy, camera, screen }: {
  edges: NetworkEdge[]; x: number; y: number; scale: number;
  nodes: Array<{ x: number; y: number }>; dx: number; dy: number;
  camera: { x: number; y: number }; screen: { width: number; height: number; top: number };
}) {
  const { locale } = useI18n();
  const { notes, inspect } = useConnectionNotes();
  const summaries = [...new Set(edges.flatMap(edge => edge.source === 'relation' ? [scalingSummary(edge, locale)].filter((s): s is string => Boolean(s)) : []))];
  const noted = connectionTargets(edges, locale).flatMap(target => { const note = notes.get(target.key); return note ? [{ target, note }] : []; });
  const box = useRef<HTMLDivElement>(null);
  const [measuredHeight, setMeasuredHeight] = useState(0);
  const content = JSON.stringify([summaries, noted.map(({ target, note }) => [target.label, note.body])]);
  useLayoutEffect(() => {
    if (!box.current) return;
    const element = box.current;
    const measure = () => setMeasuredHeight(element.offsetHeight);
    // offsetHeight stays in screen-sized CSS pixels, including during camera tweens.
    const resize = new ResizeObserver(() => setMeasuredHeight(element.offsetHeight));
    measure(); resize.observe(element);
    return () => resize.disconnect();
  }, [content]);
  if (!summaries.length && !noted.length) return null;
  const width = 236;
  const height = measuredHeight || summaries.length * 56 + noted.length * 80 + 12;
  const length = Math.max(Math.hypot(dx, dy), 1);
  const nx = -dy / length; const ny = dx / length;
  const halfWidth = width / (2 * scale); const halfHeight = height / (2 * scale);
  const sx = camera.x + x * scale; const sy = camera.y + y * scale;
  const inView = sx + Math.abs(dx * scale) / 2 >= 0 && sx - Math.abs(dx * scale) / 2 <= screen.width
    && sy + Math.abs(dy * scale) / 2 >= 0 && sy - Math.abs(dy * scale) / 2 <= screen.height;
  const far = NODE_W * scale + width + height;
  const offsets = inView ? [24, -24, 64, -64, 112, -112, 176, -176, 240, -240, 320, -320, 440, -440, 600, -600, far, -far] : [24];
  const candidates = offsets.map(offset => {
    let px = x + nx * offset / scale; let py = y + ny * offset / scale;
    if (inView) {
      px = (Math.max(width / 2 + 8, Math.min(camera.x + px * scale, screen.width - width / 2 - 8)) - camera.x) / scale;
      py = (Math.max(screen.top + height / 2 + 8, Math.min(camera.y + py * scale, screen.height - height / 2 - 8)) - camera.y) / scale;
    }
    const collisions = nodes.reduce((area, node) => area
      + Math.max(0, Math.min(px + halfWidth, node.x + NODE_W + 6) - Math.max(px - halfWidth, node.x - 6))
      * Math.max(0, Math.min(py + halfHeight, node.y + NODE_H + 6) - Math.max(py - halfHeight, node.y - 6)), 0);
    return { px, py, collisions };
  });
  const chosen = candidates.reduce((best, next) => next.collisions < best.collisions ? next : best);
  return <g className="network-connection-annotation" transform={`translate(${chosen.px} ${chosen.py})`}>
    <line className="network-annotation-leader" x1={x - chosen.px} y1={y - chosen.py} x2={0} y2={0} vectorEffect="non-scaling-stroke" />
    <g className="network-annotation-size" transform={`scale(${1 / scale})`}>
      <foreignObject x={-width / 2} y={-height / 2} width={width} height={height}>
        <div ref={box} className="network-annotation-box" onPointerDown={event => event.stopPropagation()}>
          {summaries.map(summary => <p key={summary} className="network-scaling-summary">{plainMathText(summary)}</p>)}
          {noted.map(({ target, note }) => <button type="button" key={target.key} className="network-note-summary" data-connection-key={target.key} onClick={() => inspect(target)}>
            <strong>{locale === 'en' ? 'My note' : '我的备注'} · {target.label}</strong><span>{note.body}</span>
          </button>)}
        </div>
      </foreignObject>
    </g>
  </g>;
}
