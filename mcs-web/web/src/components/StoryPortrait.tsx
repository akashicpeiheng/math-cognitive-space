import { useEffect, useId, useState } from 'react';

/** 首页末幕收束处的人像序列。50fps 人像、wink 与指尖丝绸共用帧时钟。
 * HomeNarrative 负责挂载时机（走到末幕才加载雪碧图）、触发计数与减少动效／窄屏降级。
 * 雪碧图单独裁切；光效只在正文左侧的留白内延伸。
 * 播完最后一帧**立刻收**（不停留），退场只走 CSS 的 200ms 淡出。
 */
const ATLAS_SRC = '/portrait/atlas.webp';
const COLS = 16;
const ROWS = 8;
const CELL_W = 200;
const CELL_H = 163;
const GUTTER = 8;
const FRAMES = COLS * ROWS;
const ATLAS_W = COLS * CELL_W + (COLS + 1) * GUTTER;
const ATLAS_H = ROWS * CELL_H + (ROWS + 1) * GUTTER;
const FRAME_MS = 1000 / 50;
const WINK_FRAME = 70;

type Point = { x: number; y: number };

/** 手工对照雪碧图抽帧定位：人物左手是画面右侧举起的手。
 * 插值跟随指尖，避免人物歪头时光源留在半空。这是视觉锚点，不是姿态识别结果。
 */
const FINGERTIP = [
  { frame: 70, x: 115, y: 51 },
  { frame: 78, x: 110, y: 51 },
  { frame: 86, x: 85, y: 48 },
  { frame: 100, x: 86, y: 50 },
  { frame: 115, x: 131, y: 44 },
  { frame: 127, x: 138, y: 43 },
];

function fingertipAt(frame: number): Point {
  const index = FINGERTIP.findIndex((point) => point.frame >= frame);
  if (index <= 0) return FINGERTIP[index === 0 ? 0 : FINGERTIP.length - 1];
  const a = FINGERTIP[index - 1];
  const b = FINGERTIP[index];
  const t = (frame - a.frame) / (b.frame - a.frame);
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}

/** 不等角的扇形：长而淡的后层、饱满的主带、细亮的近层。
 * 起点相同，展开长度、弯曲方向和到达时刻不同；不用随机数，重播完全可复现。
 */
const RIBBONS = [
  { angle: -168, length: 142, bend: 17, wave: 10, width: 4.0, delay: 0, duration: 50, depth: 'back', tint: 'violet', opacity: 0.47 },
  { angle: -126, length: 201, bend: -23, wave: 13, width: 6.0, delay: 1, duration: 52, depth: 'back', tint: 'pink', opacity: 0.65 },
  { angle: -91, length: 214, bend: 27, wave: 16, width: 10, delay: 0, duration: 54, depth: 'front', tint: 'violet', opacity: 0.92 },
  { angle: -59, length: 155, bend: -20, wave: 11, width: 5.8, delay: 3, duration: 52, depth: 'front', tint: 'pink', opacity: 0.80 },
  { angle: -21, length: 101, bend: 17, wave: 10, width: 3.6, delay: 5, duration: 49, depth: 'front', tint: 'cyan', opacity: 0.72 },
  { angle: 38, length: 113, bend: 22, wave: 13, width: 5.0, delay: 2, duration: 54, depth: 'back', tint: 'violet', opacity: 0.53 },
] as const;
const RIBBON_FRAMES = Math.max(...RIBBONS.map(({ delay, duration }) => delay + duration));

const clamp = (value: number) => Math.max(0, Math.min(1, value));
const smooth = (value: number) => { const t = clamp(value); return t * t * (3 - 2 * t); };
const coord = (point: Point) => `${point.x.toFixed(2)} ${point.y.toFixed(2)}`;
const polyline = (points: Point[]) => `M ${points.map(coord).join(' L ')}`;
const strip = (a: Point[], b: Point[]) => `${polyline(a)} L ${[...b].reverse().map(coord).join(' L ')} Z`;

/** 按真实增长区间采样带面，而非给固定闭合形状做 dash/clip。
 * 带头先向外伸展，约后半段尾端才离开指尖；行波相位从根传向梢，宽度随翻面变化。
 * SVG clipPath 不按 stroke/dash 的可见区域裁切，上一版用它揭带身并不能产生真实生长。
 */
function ribbonAt(spec: typeof RIBBONS[number], index: number, age: number, origin: Point) {
  const t = (age - spec.delay) / spec.duration;
  if (t < 0 || t >= 1) return null;
  const head = 1 - (1 - clamp(t / 0.76)) ** 1.65;
  const tail = smooth((t - 0.48) / 0.52) * 0.96;
  const angle = spec.angle * Math.PI / 180;
  const direction = { x: Math.cos(angle), y: Math.sin(angle) };
  const normal = { x: -direction.y, y: direction.x };
  const center = (s: number): Point => {
    const sway = spec.bend * Math.sin(Math.PI * s)
      + spec.wave * s ** 0.7 * Math.sin(s * Math.PI * 3.2 - t * 6.8 + index * 0.65);
    return {
      x: origin.x + direction.x * spec.length * s + normal.x * sway,
      y: origin.y + direction.y * spec.length * s + normal.y * sway,
    };
  };
  const left: Point[] = [], right: Point[] = [], ridge: Point[] = [], ridgeEdge: Point[] = [], line: Point[] = [];
  for (let sample = 0; sample <= 44; sample += 1) {
    const u = sample / 44;
    const s = tail + (head - tail) * u;
    const point = center(s);
    const before = center(Math.max(0, s - 0.002));
    const after = center(Math.min(1, s + 0.002));
    const dx = after.x - before.x, dy = after.y - before.y;
    const length = Math.hypot(dx, dy) || 1;
    const nx = -dy / length, ny = dx / length;
    const twist = 0.25 + 0.75 * Math.abs(Math.cos(s * 6.5 - t * 4 + index * 0.7));
    const width = spec.width * Math.sin(Math.PI * u) ** 0.7 * twist * smooth(t / 0.12);
    const offset = (amount: number) => ({ x: point.x + nx * width * amount, y: point.y + ny * width * amount });
    left.push(offset(-0.5)); right.push(offset(0.5));
    const ridgePosition = Math.sin(s * 6.5 - t * 4 + index * 0.7) * 0.23;
    ridge.push(offset(ridgePosition - 0.08)); ridgeEdge.push(offset(ridgePosition + 0.06));
    line.push(point);
  }
  return {
    ...spec, index, body: strip(left, right), fold: strip(ridge, ridgeEdge), edge: polyline(left),
    filament: polyline(line), tip: line[line.length - 1], head, tail,
    opacity: spec.opacity * smooth(t / 0.08) * (1 - smooth((t - 0.56) / 0.44)),
  };
}

interface StoryPortraitProps { armed: boolean; pulse: number }

export function StoryPortrait({ armed, pulse }: StoryPortraitProps) {
  const [frame, setFrame] = useState(0);
  const [visible, setVisible] = useState(false);
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '');

  useEffect(() => {
    if (!armed || pulse === 0) return undefined;
    setFrame(0);
    setVisible(true);
    let raf = 0, started = 0;
    const tick = (now: number) => {
      if (!started) started = now;
      const next = Math.min(FRAMES - 1, Math.floor((now - started) / FRAME_MS));
      setFrame(next);
      if (next < FRAMES - 1) { raf = requestAnimationFrame(tick); return; }
      /*
       * 播完最后一帧就收，**不停留**（2026-10-04）。
       * 这里原来是 `setTimeout(..., HOLD_MS)` 停 2.6 秒——留那一拍是为了让人看清最后那个手势，
       * 但它也让画面在末幕正中间多挂了两秒多。退场本身仍走 CSS 的 200ms 淡出，
       * 那只是过渡、不是停留。
       */
      setVisible(false);
    };
    raf = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(raf); };
  }, [armed, pulse]);

  useEffect(() => {
    if (!visible) return undefined;
    const hide = () => setVisible(false);
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') hide(); };
    const onWheel = (event: WheelEvent) => { if (event.deltaY < 0) hide(); };
    window.addEventListener('keydown', onKey);
    window.addEventListener('wheel', onWheel, { passive: true });
    window.addEventListener('pointerdown', hide, { passive: true });
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('wheel', onWheel);
      window.removeEventListener('pointerdown', hide);
    };
  }, [visible]);

  if (!armed) return null;
  const x = GUTTER + (frame % COLS) * (CELL_W + GUTTER);
  const y = GUTTER + Math.floor(frame / COLS) * (CELL_H + GUTTER);
  const age = frame - WINK_FRAME;
  const progress = age < 0 || age >= RIBBON_FRAMES ? -1 : age / RIBBON_FRAMES;
  const origin = fingertipAt(frame);
  const ribbons = RIBBONS.map((spec, index) => ribbonAt(spec, index, age, origin)).filter((ribbon) => ribbon !== null);
  const flash = age >= 0 ? Math.exp(-age / 18) * smooth(age / 2) : 0;
  const renderRibbons = (depth: 'back' | 'front') => (
    <g className={`story-portrait-ribbons story-portrait-ribbons-${depth}`} mask={`url(#silk-bounds-${uid})`}>
      {ribbons.filter((ribbon) => ribbon.depth === depth).map((ribbon) => (
        <g key={ribbon.index} opacity={ribbon.opacity}>
          <path className="story-portrait-ribbon" data-head={ribbon.head.toFixed(3)} data-tail={ribbon.tail.toFixed(3)}
            d={ribbon.body} fill={`url(#silk-${ribbon.tint}-${uid})`} />
          <path d={ribbon.fold} fill="var(--on-accent)" opacity={0.7} />
          <path d={ribbon.edge} fill="none" stroke={`url(#silk-${ribbon.tint}-${uid})`} strokeWidth={0.6} opacity={0.8} />
          <path d={ribbon.filament} fill="none" stroke="var(--accent-line)" strokeWidth={0.5} opacity={0.48} />
        </g>
      ))}
    </g>
  );

  return (
    <svg className={`story-portrait${visible ? ' is-visible' : ''}`} viewBox={`0 0 ${CELL_W} ${CELL_H}`}
      data-frame={frame} data-visible={visible ? 'true' : 'false'}
      data-burst={age >= 0 && age < 24 ? (age / 24).toFixed(2) : 'no'}
      data-ribbon-progress={progress < 0 ? 'no' : progress.toFixed(2)} data-ribbon-count={RIBBONS.length}
      data-origin-x={origin.x.toFixed(2)} data-origin-y={origin.y.toFixed(2)} aria-hidden="true" focusable="false">
      <defs>
        <clipPath id={`portrait-frame-${uid}`} clipPathUnits="userSpaceOnUse">
          <rect x={0} y={0} width={CELL_W} height={CELL_H} />
        </clipPath>
        <radialGradient id={`glow-${uid}`}>
          <stop offset="0" stopColor="var(--accent)" stopOpacity={0.42} />
          <stop offset="1" stopColor="var(--accent)" stopOpacity={0} />
        </radialGradient>
        <radialGradient id={`spark-${uid}`}>
          <stop offset="0" stopColor="var(--on-accent)" />
          <stop offset="0.15" stopColor="var(--accent-soft)" stopOpacity={0.95} />
          <stop offset="0.4" stopColor="var(--magenta)" stopOpacity={0.45} />
          <stop offset="1" stopColor="var(--accent)" stopOpacity={0} />
        </radialGradient>
        {(['violet', 'pink', 'cyan'] as const).map((tint) => (
          <linearGradient key={tint} id={`silk-${tint}-${uid}`} gradientUnits="userSpaceOnUse"
            x1={origin.x - 60} y1={origin.y - 170} x2={origin.x + 35} y2={origin.y + 75}>
            <stop offset="0" stopColor="var(--accent)" stopOpacity={0.18} />
            <stop offset="0.22" stopColor="var(--accent-strong)" />
            <stop offset="0.43" stopColor={tint === 'cyan' ? 'var(--cyan)' : 'var(--magenta)'} />
            <stop offset="0.55" stopColor="var(--accent-line)" />
            <stop offset="0.62" stopColor="var(--on-accent)" />
            <stop offset="0.72" stopColor={tint === 'pink' ? 'var(--magenta)' : 'var(--accent)'} />
            <stop offset="1" stopColor="var(--accent-deep)" stopOpacity={0.35} />
          </linearGradient>
        ))}
        {/* 左右留白内软消隐，保证任何帧都不碰正文；不裁人像。 */}
        <linearGradient id={`silk-edge-${uid}`} gradientUnits="userSpaceOnUse" x1={-24} y1={0} x2={216} y2={0}>
          <stop offset="0" stopColor="white" stopOpacity={0} />
          <stop offset="0.08" stopColor="white" />
          <stop offset="0.90" stopColor="white" />
          <stop offset="1" stopColor="white" stopOpacity={0} />
        </linearGradient>
        <mask id={`silk-bounds-${uid}`} maskUnits="userSpaceOnUse" x={-24} y={-175} width={240} height={350}>
          <rect x={-24} y={-175} width={240} height={350} fill={`url(#silk-edge-${uid})`} />
        </mask>
      </defs>

      <ellipse cx={80} cy={78} rx={65} ry={64} fill={`url(#glow-${uid})`} opacity={0.24 + flash * 0.3} />
      {renderRibbons('back')}
      <image href={ATLAS_SRC} x={-x} y={-y} width={ATLAS_W} height={ATLAS_H} clipPath={`url(#portrait-frame-${uid})`} />
      {renderRibbons('front')}
      {progress >= 0 && (
        <g className="story-portrait-emitter" mask={`url(#silk-bounds-${uid})`}>
          {/* 指尖上的共同光源，让六条路径的来处清楚可见。 */}
          <circle cx={origin.x} cy={origin.y} r={14 + flash * 8} fill={`url(#spark-${uid})`} opacity={flash * 0.85} />
          <circle cx={origin.x} cy={origin.y} r={1.2 + flash} fill="var(--on-accent)" opacity={flash} />
          {[0, 7].map((lag) => {
            const p = (age - lag) / 24;
            return p >= 0 && p < 1 ? <ellipse key={lag} cx={origin.x} cy={origin.y}
              rx={4 + p * 34} ry={3 + p * 23} fill="none" stroke="var(--accent-line)"
              strokeWidth={0.65} opacity={(1 - p) * 0.5} /> : null;
          })}
          {ribbons.map((ribbon) => <circle key={ribbon.index} cx={ribbon.tip.x} cy={ribbon.tip.y}
            r={0.8} fill={ribbon.tint === 'cyan' ? 'var(--cyan)' : 'var(--magenta)'} opacity={ribbon.opacity * 0.6} />)}
        </g>
      )}
    </svg>
  );
}
