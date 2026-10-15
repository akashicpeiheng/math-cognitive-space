import { useEffect, useMemo, useRef, useState } from 'react';
import type { PlacedNode } from './network';
const EMPTY: PlacedNode[] = [];
// Coordinates are shared by nodes and edges; a finite transition has no idle loop.
export function useNetworkMotion(target: PlacedNode[] | undefined, immediate: boolean) {
  const nodes = target ?? EMPTY;
  const shown = useRef(nodes), [frame, setFrame] = useState(nodes);
  useEffect(() => {
    const before = new Map(shown.current.map(n => [n.id, n]));
    const changed = nodes.some(n => { const old = before.get(n.id); return old && (Math.abs(n.x - old.x) > .1 || Math.abs(n.y - old.y) > .1); });
    if (immediate || !changed) { shown.current = nodes; setFrame(nodes); return; }
    let raf = 0; const started = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - started) / 220), ease = 1 - (1 - t) ** 3;
      const next = nodes.map(n => { const old = before.get(n.id); return old ? { ...n, x: old.x + (n.x - old.x) * ease, y: old.y + (n.y - old.y) * ease } : n; });
      shown.current = next; setFrame(next);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick); return () => cancelAnimationFrame(raf);
  }, [nodes, immediate]);
  // New nodes are visible on their first render, before the transition effect.
  return useMemo(() => { const byId = new Map(frame.map(n => [n.id, n])); return nodes.map(n => byId.get(n.id) ?? n); }, [nodes, frame]);
}
