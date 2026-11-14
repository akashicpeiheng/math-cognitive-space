import { useCallback, useEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';
import { atlasZoomCamera } from '../../shared/mcs-atlas.mjs';
import type { AtlasCamera, AtlasNode, AtlasSize, McsAtlas } from '../../shared/mcs-atlas.mjs';
import { atlasCoast, atlasSpring } from '../../shared/mcs-atlas-motion.mjs';

type Point = { x: number; y: number };
type Motion =
  | { kind: 'flight'; value: number[]; velocity: number[]; target: number[]; size: AtlasSize; camera: AtlasCamera }
  | { kind: 'zoom'; value: number; velocity: number; target: number; point: Point; world: Point }
  | { kind: 'coast'; velocity: Point };

export function useAtlasReducedMotion() {
  const [reduced, setReduced] = useState(() => matchMedia('(prefers-reduced-motion: reduce)').matches);
  useEffect(() => {
    const media = matchMedia('(prefers-reduced-motion: reduce)');
    const change = () => setReduced(media.matches);
    media.addEventListener('change', change);
    return () => media.removeEventListener('change', change);
  }, []);
  return reduced;
}

/** Input can interrupt every frame. Only direct manipulation bypasses the spring. */
export function useAtlasCameraMotion(live: RefObject<{ camera: AtlasCamera; size: AtlasSize }>, update: (camera: AtlasCamera) => void, reduced: boolean) {
  const frame = useRef(0), motion = useRef<Motion | null>(null);
  const [moving, setMoving] = useState(false);
  const stop = useCallback(() => {
    cancelAnimationFrame(frame.current); motion.current = null; setMoving(false);
  }, []);
  const begin = useCallback((next: Motion) => {
    cancelAnimationFrame(frame.current); motion.current = next; setMoving(true);
    let previous = performance.now();
    const tick = (now: number) => {
      const state = motion.current;
      if (!state) return;
      const dt = Math.min(.05, Math.max(0, (now - previous) / 1000)); previous = now;
      let settled = false;
      if (state.kind === 'zoom') {
        const next = atlasSpring(state.value, state.velocity, state.target, dt, 18);
        state.value = next.value; state.velocity = next.velocity;
        settled = Math.abs(state.value - state.target) < .00004 && Math.abs(state.velocity) < .0004;
        const scale = Math.exp(settled ? state.target : state.value);
        update({ scale, x: state.point.x - state.world.x * scale, y: state.point.y - state.world.y * scale });
      } else if (state.kind === 'flight') {
        state.value.forEach((value, i) => {
          const next = atlasSpring(value, state.velocity[i], state.target[i], dt, 12);
          state.value[i] = next.value; state.velocity[i] = next.velocity;
        });
        const scale = Math.exp(state.value[2]);
        settled = Math.hypot((state.value[0] - state.target[0]) * scale, (state.value[1] - state.target[1]) * scale) < .04
          && Math.abs(state.value[2] - state.target[2]) < .00004 && Math.abs(state.velocity[2]) < .0004;
        update(settled ? state.camera : { scale, x: state.size.width / 2 - state.value[0] * scale, y: state.size.height / 2 - state.value[1] * scale });
      } else {
        const x = atlasCoast(state.velocity.x, dt), y = atlasCoast(state.velocity.y, dt);
        state.velocity = { x: x.velocity, y: y.velocity };
        update({ ...live.current.camera, x: live.current.camera.x + x.distance, y: live.current.camera.y + y.distance });
        settled = Math.hypot(x.velocity, y.velocity) < 8;
      }
      if (settled) stop(); else frame.current = requestAnimationFrame(tick);
    };
    frame.current = requestAnimationFrame(tick);
  }, [live, stop, update]);
  const flyTo = useCallback((target: AtlasCamera) => {
    if (reduced) { stop(); update(target); return; }
    const { camera, size } = live.current;
    const coordinates = (c: AtlasCamera) => [(size.width / 2 - c.x) / c.scale, (size.height / 2 - c.y) / c.scale, Math.log(c.scale)];
    const velocity = motion.current?.kind === 'flight' ? motion.current.velocity : [0, 0, motion.current?.kind === 'zoom' ? motion.current.velocity : 0];
    begin({ kind: 'flight', value: coordinates(camera), target: coordinates(target), velocity, size, camera: target });
  }, [begin, live, reduced, stop, update]);
  const zoomBy = useCallback((factor: number, point: Point, worldSize: AtlasSize) => {
    const { camera, size } = live.current;
    if (reduced) { stop(); update(atlasZoomCamera(camera, factor, point, size, worldSize)); return; }
    const current = motion.current;
    const previousScale = current?.kind === 'zoom' ? Math.exp(current.target) : camera.scale;
    const target = atlasZoomCamera({ ...camera, scale: previousScale }, factor, point, size, worldSize);
    begin({ kind: 'zoom', value: Math.log(camera.scale), velocity: current?.kind === 'zoom' ? current.velocity : current?.kind === 'flight' ? current.velocity[2] : 0,
      target: Math.log(target.scale), point, world: { x: (point.x - camera.x) / camera.scale, y: (point.y - camera.y) / camera.scale } });
  }, [begin, live, reduced, stop, update]);
  const coast = useCallback((velocity: Point) => {
    if (!reduced && Math.hypot(velocity.x, velocity.y) > 60) begin({ kind: 'coast', velocity });
  }, [begin, reduced]);
  useEffect(() => {
    if (!reduced || !motion.current) return;
    const current = motion.current;
    if (current.kind === 'flight') update(current.camera);
    if (current.kind === 'zoom') {
      const scale = Math.exp(current.target);
      update({ scale, x: current.point.x - current.world.x * scale, y: current.point.y - current.world.y * scale });
    }
    stop();
  }, [reduced, stop, update]);
  useEffect(() => () => { cancelAnimationFrame(frame.current); motion.current = null; }, []);
  return { stop, flyTo, zoomBy, coast, moving };
}

type Envelope = Pick<AtlasNode, 'x' | 'y' | 'w' | 'h'>;
const envelopes = (atlas: McsAtlas) => Object.fromEntries(atlas.nodes.map(n => [n.id, { x: n.x, y: n.y, w: n.w, h: n.h }]));
const dimensions = ['x', 'y', 'w', 'h'] as const;

/** Keep identity and current velocity when a new centre interrupts rearrangement. */
export function useAtlasLayout(atlas: McsAtlas, reduced: boolean) {
  const [boxes, setBoxes] = useState(() => envelopes(atlas));
  const current = useRef(boxes), velocities = useRef<Record<string, Envelope>>({});
  const [moving, setMoving] = useState(false);
  useEffect(() => {
    const target = envelopes(atlas);
    if (reduced) { current.current = target; velocities.current = {}; setBoxes(target); setMoving(false); return; }
    let frame = 0, previous = performance.now();
    setMoving(true);
    const tick = (now: number) => {
      const dt = Math.min(.05, (now - previous) / 1000); previous = now;
      let settled = true;
      const next: Record<string, Envelope> = {};
      for (const [id, box] of Object.entries(target)) {
        const from = current.current[id] ?? box;
        const velocity = velocities.current[id] ?? { x: 0, y: 0, w: 0, h: 0 };
        next[id] = { ...from };
        for (const key of dimensions) {
          const spring = atlasSpring(from[key], velocity[key], box[key], dt, 10);
          next[id][key] = spring.value; velocity[key] = spring.velocity;
          if (Math.abs(spring.value - box[key]) > .025 || Math.abs(spring.velocity) > .15) settled = false;
        }
        velocities.current[id] = velocity;
      }
      current.current = settled ? target : next; setBoxes(current.current);
      if (settled) { velocities.current = {}; setMoving(false); } else frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [atlas, reduced]);
  return { boxes, moving };
}
