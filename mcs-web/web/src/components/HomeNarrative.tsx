import {
  memo,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
  type RefObject,
} from 'react';
import { Link } from 'react-router-dom';
import {
  HOME_NARRATIVE_ACTS,
  HOME_NARRATIVE_BY_LOCALE,
  HOME_NARRATIVE_CHROME,
  HOME_NARRATIVE_FINAL_ACTIONS_BY_LOCALE,
  HOME_NARRATIVE_SCENE_TEXT,
  homeNarrativeActAriaLabel,
  homeNarrativeFootText,
  type HomeNarrativeAct,
  type HomeNarrativeScene,
  type HomeNarrativeSceneText,
} from '../home-narrative';
import { useI18n } from '../i18n';
import { SITE } from '../site';
import { useMediaQuery } from '../useMediaQuery';
import { StoryPortrait } from './StoryPortrait';

const ACT_COUNT = HOME_NARRATIVE_ACTS.length;

/**
 * 背景化之后的图形层不透明度。
 *
 * **2026-10 重新定过**：原来是 0.5，再叠场景文字自己的 0.5，有效不透明度只有 0.25；
 * 描边本身又是淡紫（实测 `#e5dff6`），中心还压着一层 96% 白的柔光罩——
 * 三层一起把动画洗成了「几乎看不见的浅色」。用户的原话是「颜色浅到看不清」。
 *
 * 现在的分工不是「整体压淡」，而是**按区域分工**（见 styles.css 的柔光罩注释）：
 * 图形层按 0.92 画足，只有正文列那一条带宽的柔光罩负责可读性，四周保持原色。
 */
const SCENE_BACKDROP_OPACITY = 0.92;

/**
 * 每一幕的图形往哪一侧让位：**中心留给阅读，四周留给动画**。
 *
 * 幕的正文是居中一列，因此图形必须整体偏出去，否则两者必然同心重叠
 * （旧版实测：15 条动画文字里有 5 条压在正文卡上，场景中心偏移恰好是 0）。
 * 左右交替，相邻两幕的构图也不会看起来是同一张。
 */
const SCENE_SIDES = ['left', 'right'] as const;

/**
 * 滚轮走多少像素算「把本幕动画播完一遍」。
 *
 * 一个鼠标滚轮格约 100px，因此约 6 格播完一幕；触控板连续小增量也能平滑推进。
 */
const PLAY_DISTANCE = 560;

/** 跳段后的锁：一次滚轮手势不该既走完动画又连跳两段。 */
const JUMP_LOCK_MS = 620;

/**
 * 末幕人像序列的冷却时间（毫秒）。
 *
 * 略长于「播一遍」（128 帧 ÷ 50fps = 2.56s）：它还在演的时候再触发一次，
 * 不该把它从头重启一遍——那会打断序列本身。演完了（3 秒后）再触发，可以再看一次。
 *
 * 注意这里**不能**再按原来那样算进"停一拍"：序列已经改成播完立刻收
 * （见 StoryPortrait.tsx 的播放循环），冷却也就跟着从 6s 缩回 3s。
 */
const PORTRAIT_COOLDOWN_MS = 3000;

/** 环境层里的星点数量固定，位置由 CSS 的 nth-child 决定；不引入随机数，截图可复现。 */
const AMBIENT_SIGNALS = Array.from({ length: 9 }, (_, index) => index);

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function smoothstep(value: number): number {
  const t = clamp(value, 0, 1);
  return t * t * (3 - 2 * t);
}

function lerp(from: number, to: number, amount: number): number {
  return from + (to - from) * amount;
}

/** 进入视口观察：窄屏下每幕的局部图形用它做一次淡入。 */
function useInView<T extends HTMLElement>(): { ref: RefObject<T | null>; inView: boolean } {
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return undefined;
    if (typeof IntersectionObserver === 'undefined') {
      setInView(true);
      return undefined;
    }
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => setInView(entry.isIntersecting));
    }, { threshold: 0.22 });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return { ref, inView };
}

interface ActVisualState {
  opacity: number;
  transform: string;
}

interface HomeNarrativeProps {
  /** 跳过动画后落脚的地方：默认为「开始学习」页。 */
  startHref?: string;
}

/**
 * 首页六幕叙事（主题 → 现状 → 路径 → 方法 → 体验 → 愿景）。
 *
 * **滚动机制（2026-10 重做）**：六幕各自占页面上的**自己那一段**，不再叠在同一个位置。
 * 滚轮在两种职责之间交替：
 *
 * 1. **播放动画**：当前幕的进度还没走完时，滚轮被吃掉（`preventDefault`），
 *    只推进这一幕的图形进度——页面不动，动画在文字背后演；
 * 2. **滚到下一幕**：本幕进度到端点之后，下一次滚轮才把页面平移到下一段。
 *
 * 反向同理：先倒放本幕动画，倒到头再回到上一幕。这样「前一幕必须消失才能看到下一幕」
 * 的问题不存在了——每一幕有自己的位置，滚过去就是滚过去。
 *
 * 窄屏与「减少动态效果」下不做这些：六段自然滚动，滚轮不拦截，图形直接给完成态。
 *
 * 末幕的入口指向「开始学习」页——首页只负责讲为什么，入口在那一页。
 */
export function HomeNarrative({ startHref = '/start' }: HomeNarrativeProps) {
  const rootRef = useRef<HTMLElement | null>(null);
  const sectionsRef = useRef<HTMLDivElement | null>(null);
  /*
   * 六幕的文案按语种取（2026-10 中英双语）。
   *
   * 两份数组都是模块级常量，引用稳定：切语种时取到的是另一个常量，
   * 因此不会每次渲染都换引用、也不会把上面那些量尺寸的 effect 重新跑一遍。
   * 中文那份是源语言，逐字未动——`tests/home-narrative.mjs` 与 `tests/browser.mjs`
   * 直接比对它的文字。
   */
  const { locale, pick } = useI18n();
  const acts = pick(HOME_NARRATIVE_BY_LOCALE);
  const chrome = pick(HOME_NARRATIVE_CHROME);
  const reduceMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
  /**
   * 不做「滚轮交替」的三种情形：
   * - **不够宽（≤1200px）**：单栏自然滚动反而能把 16px 正文铺满；
   * - **不够高（≤700px）**：矮窗口里任何一幕都会挤到裁切，宁可不做固定舞台；
   * - **触屏（`hover: none`，2026-10-05 加）**：这是被真机逼出来的第三条。
   *
   *   小米平板（宽屏，横屏时 CSS 宽度 ≥1200px）走的一直是固定舞台那条路，而它比自然滚动重
   *   **3–4 倍**（同机实测 p50 帧间隔 18–24ms vs 6.1ms；滚一趟首页 DOM 变更 402 vs 11 次）。
   *   安卓上表现就是「整页发白、顶部那条框反复消失出现」——合成器来不及画、掉图块，
   *   浅色的吸顶栏跟着一起没了。而固定舞台的核心交互（滚轮先播动画、再滚到下一幕）
   *   在触屏上本来就不成立：没有滚轮，用户只是往下滑。
   *
   *   触屏一律走自然滚动，等价于把手机那一套（已验证 p50 6.1ms、0 掉帧）给到平板。
   *   接鼠标/触控板的设备 `hover: hover`，仍然保留固定舞台。
   */
  const narrow = useMediaQuery('(max-width: 1200px), (max-height: 700px), (hover: none)');
  const flowMode = reduceMotion || narrow;
  /**
   * 触屏（`hover: none`）。宽屏安卓平板走的仍是固定舞台那条路（≥1200px 宽），
   * 所以这个判据用得上两处：
   * - **指针视差在触屏上没有意义**（没有悬停），可它每次 `pointermove` 要写 9 个 CSS 变量，
   *   而这些变量被六幕的环境层消费——一次改动就是几百个元素重算样式；
   * - `will-change` 那六个大合成层在平板上是栅格内存的大头（见 styles.css 同名注释）。
   */
  const coarsePointer = useMediaQuery('(hover: none)');

  /**
   * 四周带的宽度（2026-10 加，TODO A3-16 / A3-17 / A3-19）。
   *
   * 「文字只在四周、正文列永远干净」这句话以前是用**固定百分比**凑出来的：
   * 遮罩写死 17%–83% 透明、大字词写死 4vw 的偏移。那套数字是在 1440 下选的，
   * 换到 1280 / 1240 就失效——实测「体验」幕有 3 条标签压正文、3 条被屏幕切掉，
   * 每幕的清晰可见标签也从 3 掉到 1–2。
   *
   * 现在把它算出来：带宽 =（舞台宽 − 正文列宽）/ 2，正文列宽取真实测量值
   * （`.home-story-copy-stage` 的 46rem 上限）。带宽同时交给遮罩、大字词与四周带标签，
   * 三者于是共用同一条边界，任何宽度下都不会把文字送进正文列。
   */
  const [band, setBand] = useState({ pct: 17, px: 200, copyHalf: 368 });
  const measureBand = useCallback(() => {
    const root = rootRef.current;
    if (!root) return;
    const stageWidth = root.clientWidth;
    if (stageWidth <= 0) return;
    const copy = root.querySelector<HTMLElement>('.home-story-copy-stage');
    const copyWidth = Math.min(copy?.clientWidth || 736, stageWidth);
    const bandPx = Math.max(0, (stageWidth - copyWidth) / 2);
    setBand({
      // 留 1% 余量：边界上不放字，避免「刚好贴着正文列」这种读起来最难受的情形。
      pct: Math.max(4, Math.min(30, (bandPx / stageWidth) * 100 - 1)),
      px: Math.round(bandPx),
      copyHalf: Math.round(copyWidth / 2),
    });
  }, []);
  useEffect(() => {
    measureBand();
    const root = rootRef.current;
    if (!root || typeof ResizeObserver === 'undefined') return undefined;
    const observer = new ResizeObserver(() => measureBand());
    observer.observe(root);
    return () => observer.disconnect();
  }, [measureBand]);
  /** 三档带宽变量：遮罩、大字词、四周带标签都从这里取，边界因此只有一处定义。 */
  const bandVars = {
    '--hs-band': `${band.pct.toFixed(2)}%`,
    '--hs-band-px': `${band.px}px`,
    '--hs-copy-half': `${band.copyHalf}px`,
  } as CSSProperties;
  /**
   * 带宽够不够放场景自带的 SVG 文字。阈值 200px 是量出来的（1440 下 223px 放得下，
   * 1280 下 143px 放不下：文字块 80–120px 宽，塞不进「屏幕边到正文列」这段）。
   * 不够时那一层整层不显示，动画文字改由四周带标签承担——见 styles.css 的同一处说明。
   */
  const bandIsNarrow = band.px < 200;

  /** 每一幕自己的播放进度：滚轮推进，滚过去自动记成已完成。 */
  const [played, setPlayed] = useState<number[]>(() => acts.map(() => 0));
  const [active, setActive] = useState(0);
  const playedRef = useRef(played);
  playedRef.current = played;
  const activeRef = useRef(active);
  activeRef.current = active;
  /** 段落顶端的文档坐标与段高（滚到某一段用它）。 */
  const sectionTopsRef = useRef<number[]>([]);
  const sectionHeightsRef = useRef<number[]>([]);
  /** 跳段之后的短暂锁：一次滚轮手势不该既走完动画又跳两段。 */
  const jumpLockRef = useRef(0);

  /*
   * 末幕人像什么时候开始加载雪碧图。
   *
   * 近 1 MB，不该占首页首屏的请求——**等真的走到末幕**（它成了当前幕，或它已经有进度）再挂上去。
   * 组件在 !armed 时直接不渲染，因此图也不会被请求。
   * 窄屏（自然滚动）没有「当前幕」这个概念，改用「末幕接近视口」这一条等价判据，
   * 见下面的 observer：末幕还在五幕之外时同样一个字节都不取。
   */
  const portraitAct = ACT_COUNT - 1;

  /*
   * 人像在窄屏也看得到（2026-10-05）。
   *
   * 原来这里写的是 `!flowMode && …`：窄屏与「减少动态效果」被同一个开关一起挡掉，
   * 于是**手机端署名里的作者名是个点了没反应的按钮**——入口在、序列永远不挂载。
   * 现在两条路分开：
   * - `reduceMotion`：仍然不挂、不动（不想看动效的人不该被塞一段 2.56 秒的序列）；
   *   入口同时退回普通文字，不再留一个按下去没有反应的按钮（见 HomeNarrativeActCard）。
   * - `narrow`：只是版面换成自然滚动，与「该不该有这个动作」无关，因此照常可以触发。
   */
  const portraitEnabled = !reduceMotion;
  /** 窄屏专用：末幕进入「视口 + 400px」之后才置真；置真后不再回退（避免重复取图）。 */
  const [portraitNear, setPortraitNear] = useState(false);
  useEffect(() => {
    if (!portraitEnabled || !flowMode) return undefined;
    const target = sectionsRef.current?.children[portraitAct];
    // 观察不了（老浏览器 / 结构没就位）时按「已接近」处理：宁可早取一次图，也不要入口失灵。
    if (!target || typeof IntersectionObserver === 'undefined') { setPortraitNear(true); return undefined; }
    const observer = new IntersectionObserver((entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      setPortraitNear(true);
      observer.disconnect();
    }, { rootMargin: '400px 0px' });
    observer.observe(target);
    return () => observer.disconnect();
  }, [flowMode, portraitEnabled, portraitAct]);

  const portraitArmed = portraitEnabled
    && (flowMode ? portraitNear : (active === portraitAct || (played[portraitAct] ?? 0) > 0));
  /** 末幕人像序列的触发计数：署名里的作者名每被点一次加一（见 StoryPortrait.tsx）。 */
  const [portraitPulse, setPortraitPulse] = useState(0);
  /** 上一次触发的时刻，用来做冷却：演着的时候再触发不重启（见 PORTRAIT_COOLDOWN_MS 的说明）。 */
  const portraitAtRef = useRef(0);

  /*
   * 末幕人像序列的入口：署名里的作者名（`HomeNarrativeActCard` 的 `onAuthorClick`）。
   *
   * 它被做成**真的 `<button>`**：键盘能 Tab 到、读屏会念出「按钮」，这是可访问性；
   * 外观则由 `.byline-author` 逐项抹平到与原来的 `<strong>` 一致，署名那一行的排版不变。
   *
   * 此前几版把入口挂在滚动上，都因"门槛要么太轻易、要么与花的力气不成比例"而撤掉；
   * 现在滚动这条路上不再有任何与人像相关的分支。
   */
  const firePortrait = useCallback(() => {
    const now = Date.now();
    if (now - portraitAtRef.current <= PORTRAIT_COOLDOWN_MS) return;  // 还在演：这一下不算数
    portraitAtRef.current = now;
    setPortraitPulse((count) => count + 1);
  }, []);

  const topbarHeight = useCallback(() => (
    Number.parseFloat(getComputedStyle(rootRef.current ?? document.documentElement).getPropertyValue('--home-story-top')) || 64
  ), []);

  const measureSections = useCallback(() => {
    const wrap = sectionsRef.current;
    if (!wrap) return;
    sectionTopsRef.current = [...wrap.children].map((child) => (
      child.getBoundingClientRect().top + window.scrollY
    ));
    sectionHeightsRef.current = [...wrap.children].map((child) => (
      (child as HTMLElement).getBoundingClientRect().height
    ));
  }, []);

  /**
   * 滚到某一段：对齐的是**段落内容中心与可见区中心**，不是段落顶端。
   *
   * 段高比可见区高一点（+6svh，为了让下一幕不探进视口），所以按顶端对齐会把文字推到
   * 视口偏下——用户要的是「文字居于视觉中心」，对齐方式必须跟着这个目标走。
   * 可见区是「顶栏之下、报头之下」那一段，因此目标是让内容中心落在
   * `(视口高 + 顶栏高 + 报头高) / 2` 处。
   */
  const centerOffsetFor = useCallback((index: number): number | null => {
    const top = sectionTopsRef.current[index];
    const height = sectionHeightsRef.current[index];
    if (top === undefined || height === undefined) return null;
    const masthead = document.querySelector('.home-story-masthead')?.getBoundingClientRect().height ?? 0;
    const visibleCenter = (window.innerHeight + topbarHeight() + masthead) / 2;
    return Math.max(0, top + height / 2 - visibleCenter);
  }, [topbarHeight]);

  const scrollToSection = useCallback((index: number) => {
    const target = centerOffsetFor(index);
    if (target === null) return;
    window.scrollTo({ top: target, behavior: 'smooth' });
  }, [centerOffsetFor]);

  /**
   * 首屏就把第一幕摆正。
   *
   * 页面顶端是报头，第一段自然落在它下面；不补这一下，首屏文字会比可见区中心低约 70px。
   * 两道保险：只在「页面本来就在顶端」（没有深链、没有浏览器恢复的滚动位置）时补，
   * 且用瞬时定位而不是动画——用户没有做任何操作，不该看到页面自己滑一下。
   */
  useEffect(() => {
    if (flowMode) return undefined;
    // 必须**先量再算**：挂载顺序上测量 effect 可能还没跑，位置表是空的。
    measureSections();
    if (window.scrollY > 8) return undefined;
    const frame = window.requestAnimationFrame(() => {
      const target = centerOffsetFor(0);
      if (target !== null) window.scrollTo({ top: target, behavior: 'auto' });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [flowMode, centerOffsetFor, measureSections]);

  /**
   * 固定舞台要用的两个真实高度都由这里量：**顶栏**与**报头**（都会因为宽度换行而变高）。
   *
   * - `--home-story-top`：顶栏高，报头吸顶的 `top` 用它；
   * - `--home-story-masthead`：报头高，**左上角角标的下限**用它。为什么需要它：
   *   首屏自动居中之后，段落顶端其实落在吸顶报头**下面**——报头底边离段落顶端
   *   `报头高 / 2 + 3svh`（1440×1000 实测 63px，1280×720 实测 55px）。
   *   角标若从段落顶端起算，就会有一段压在报头底下（用户报的「不要被挡住」就是这个）。
   */
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return undefined;
    const topbar = document.querySelector<HTMLElement>('.topbar');
    const masthead = document.querySelector<HTMLElement>('.home-story-masthead');
    const syncChromeHeights = () => {
      const topHeight = Math.round(topbar?.getBoundingClientRect().height ?? 64);
      const mastheadHeight = Math.round(masthead?.getBoundingClientRect().height ?? 66);
      root.style.setProperty('--home-story-top', `${topHeight}px`);
      root.style.setProperty('--home-story-masthead', `${mastheadHeight}px`);
    };
    syncChromeHeights();
    let observer: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(syncChromeHeights);
      if (topbar) observer.observe(topbar);
      if (masthead) observer.observe(masthead);
    }
    window.addEventListener('resize', syncChromeHeights);
    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', syncChromeHeights);
    };
  }, []);

  /**
   * 桌面端的环境光跟随指针做很轻的视差；只写 CSS 变量，不触发 React 重渲染。
   * 窄屏、减少动态效果与**触屏**都不注册监听：触屏没有悬停，视差无从谈起，
   * 而它每次 pointermove 要写 9 个 CSS 变量、牵动六幕环境层的样式重算（见 coarsePointer）。
   */
  useEffect(() => {
    const root = rootRef.current;
    if (!root || flowMode || coarsePointer) return undefined;
    let frame = 0;
    let pointerX = 50;
    let pointerY = 50;
    const paint = () => {
      frame = 0;
      const shiftX = (pointerX - 50) * 0.16;
      const shiftY = (pointerY - 50) * 0.12;
      root.style.setProperty('--home-pointer-x', `${pointerX}%`);
      root.style.setProperty('--home-pointer-y', `${pointerY}%`);
      root.style.setProperty('--home-parallax-x', `${shiftX}px`);
      root.style.setProperty('--home-parallax-y', `${shiftY}px`);
      root.style.setProperty('--home-parallax-soft-x', `${shiftX * 0.7}px`);
      root.style.setProperty('--home-parallax-soft-y', `${shiftY * 0.7}px`);
      root.style.setProperty('--home-parallax-inverse-x', `${shiftX * -0.55}px`);
      root.style.setProperty('--home-parallax-inverse-y', `${shiftY * -0.55}px`);
    };
    const queuePaint = (event: PointerEvent) => {
      pointerX = clamp((event.clientX / window.innerWidth) * 100, 0, 100);
      pointerY = clamp((event.clientY / window.innerHeight) * 100, 0, 100);
      if (!frame) frame = window.requestAnimationFrame(paint);
    };
    const reset = () => {
      pointerX = 50;
      pointerY = 50;
      if (!frame) frame = window.requestAnimationFrame(paint);
    };
    root.addEventListener('pointermove', queuePaint, { passive: true });
    root.addEventListener('pointerleave', reset);
    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      root.removeEventListener('pointermove', queuePaint);
      root.removeEventListener('pointerleave', reset);
    };
  }, [coarsePointer, flowMode]);

  /**
   * 滚轮：先播放本幕动画，播放完了才滚到下一幕（反向先倒放）。
   *
   * 必须 `passive: false`——要 `preventDefault` 才能把滚动让给动画。
   * 触控板捏合（`ctrlKey`）不拦，那是缩放手势。
   */
  useEffect(() => {
    if (flowMode) {
      setPlayed(acts.map(() => 1));
      return undefined;
    }
    measureSections();
    const onWheel = (event: WheelEvent) => {
      if (event.ctrlKey || event.deltaY === 0) return;
      const index = activeRef.current;
      const value = playedRef.current[index] ?? 0;
      const forward = event.deltaY > 0;
      if (Date.now() < jumpLockRef.current) { event.preventDefault(); return; }
      // ① 本幕还没播完：吃掉滚动，只推进（或倒放）这一幕的进度。
      if (forward ? value < 1 : value > 0) {
        event.preventDefault();
        const step = event.deltaY / PLAY_DISTANCE;
        setPlayed((current) => current.map((item, i) => (i === index ? clamp(item + step, 0, 1) : item)));
        return;
      }
      // ② 已经到端点：这一次滚轮负责「滚到下一幕」。
      const next = clamp(index + (forward ? 1 : -1), 0, ACT_COUNT - 1);
      /* 首幕往上、末幕往下：交回浏览器。
       * 末幕人像**不挂在滚动上**（2026-10-04 第四次改口径）：入口是署名里的作者名按钮，
       * 见下面的 firePortrait。滚动在这条路上不再有任何特殊分支。 */
      if (next === index) return;
      event.preventDefault();
      jumpLockRef.current = Date.now() + JUMP_LOCK_MS;
      // 往前走时下一幕从 0 开始播；往回走时上一幕直接给完成态（再往上滚才倒放它）。
      setPlayed((current) => current.map((item, i) => (i === next ? (forward ? 0 : 1) : item)));
      setActive(next);
      scrollToSection(next);
    };
    window.addEventListener('wheel', onWheel, { passive: false });
    window.addEventListener('resize', measureSections);
    return () => {
      window.removeEventListener('wheel', onWheel);
      window.removeEventListener('resize', measureSections);
    };
  }, [flowMode, measureSections, scrollToSection]);

  /** 滚动（滚动条、键盘、触屏）也要让状态跟上：滚过去的幕记为已完成，还没到的回到起点。 */
  useEffect(() => {
    if (flowMode) return undefined;
    let frame = 0;
    const measure = () => {
      frame = 0;
      measureSections();
      const tops = sectionTopsRef.current;
      if (tops.length === 0) return;
      const anchor = window.scrollY + topbarHeight() + 12;
      let index = 0;
      for (let i = 0; i < tops.length; i += 1) if (anchor >= tops[i] - 6) index = i;
      setActive((current) => (current === index ? current : index));
      /*
       * 值没变就返回**同一个数组**（2026-10-05，安卓流畅度）。
       *
       * `current.map(...)` 每次都会造一个新数组，于是**每一次 scroll 事件都换掉引用**、
       * 把六幕整棵树重渲染一遍（12 个 SVG 场景、600+ 个节点）。实测宽屏安卓平板上
       * 滚一趟首页：**402 次 DOM 变更、script 133ms、style 363ms、task 995ms**；
       * 同一条路径在 flow 形态（手机）只有 11 次变更 / task 273ms——同一个页面差 4 倍。
       * 逐项比较的代价是 6 次数字比较，远小于一次重渲染。
       */
      setPlayed((current) => {
        const next = current.map((item, i) => (i < index ? 1 : i === index ? item : 0));
        return next.some((value, i) => value !== current[i]) ? next : current;
      });
    };
    const requestMeasure = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(measure);
    };
    measure();
    window.addEventListener('scroll', requestMeasure, { passive: true });
    window.addEventListener('resize', requestMeasure);
    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      window.removeEventListener('scroll', requestMeasure);
      window.removeEventListener('resize', requestMeasure);
    };
  }, [flowMode, measureSections, topbarHeight]);

  const activeIndex = flowMode ? -1 : active;
  const overall = flowMode ? 1 : clamp((active + (played[active] ?? 0)) / ACT_COUNT, 0, 1);

  const actState = (index: number): ActVisualState => {
    if (flowMode) return { opacity: 1, transform: 'none' };
    // 文字随段落进入视口淡入（CSS 用 .in-view 接管），这里只留一点与进度的联动。
    const local = played[index] ?? 0;
    return { opacity: 1, transform: `translate3d(0, ${(1 - Math.min(1, local * 4)) * 6}px, 0)` };
  };

  /** 顶部幕导航：允许直接抵达某一幕，同时把此前的幕记为已播放。 */
  const jumpToAct = useCallback((index: number) => {
    setPlayed((current) => current.map((item, itemIndex) => {
      if (itemIndex < index) return 1;
      if (itemIndex > index) return 0;
      return item;
    }));
    setActive(index);
    jumpLockRef.current = Date.now() + JUMP_LOCK_MS;
    measureSections();
    scrollToSection(index);
  }, [measureSections, scrollToSection]);

  return (
    <section
      ref={rootRef}
      className={`home-story${flowMode ? ' is-flow' : ''}`}
      data-active-act={flowMode ? ACT_COUNT - 1 : activeIndex}
      data-story-progress={overall.toFixed(4)}
      data-band={bandIsNarrow ? 'narrow' : 'wide'}
      /*
       * 根元素上只留**很少变**的那些变量（`--home-story-acts` 与带宽三兄弟：它们只在换窗口尺寸时变）。
       *
       * `--home-story-progress` 搬到了报头（见下）：它随每一格滚轮/每一次幕切换都在变，
       * 而写在根上改一次就要重算**整棵子树**——实测一次 53ms（连写一个没人用的变量都要 30ms），
       * 滚轮播一幕是 6 次这样的写入。它只有两个消费者，都在报头里，所以下沉到报头即可。
       */
      style={{ '--home-story-acts': ACT_COUNT, ...bandVars } as CSSProperties}
      aria-labelledby="home-story-title"
    >
      {/* `--home-story-progress` 挂在报头上：它的两个消费者（报头那道渐变的落点、
          报头里进度条的 scaleX）都在这一块里，写在这里只作废这一小块子树。 */}
      <div className="home-story-masthead" style={{ '--home-story-progress': overall } as CSSProperties}>
        <div className="home-story-brand">
          <h1 id="home-story-title">{chrome.brandName} <span>MCS</span></h1>
          <p>{chrome.tagline}</p>
        </div>
        <div className="home-story-masthead-actions">
          {/* 跳过动画：直接落到「开始学习」页，不在本页内滚动。 */}
          <Link className="home-story-skip" to={startHref}>
            {chrome.skip}
          </Link>
          <ol className="home-story-progress" aria-label={chrome.progressAria}>
            {acts.map((act, index) => (
              <li
                key={act.id}
                className={flowMode || index === activeIndex ? 'is-active' : ''}
                aria-current={!flowMode && index === activeIndex ? 'step' : undefined}
              >
                <button
                  type="button"
                  onClick={() => jumpToAct(index)}
                  aria-label={homeNarrativeActAriaLabel(locale, index, act.kicker)}
                >
                  <span>{act.number}</span>
                  <small>{act.kicker}</small>
                </button>
              </li>
            ))}
          </ol>
        </div>
        {/* 本幕动画的播放进度：滚轮正在播哪一幕、播到哪儿了。 */}
        {!flowMode && (
          <div className="home-story-playbar" aria-hidden="true">
            <span style={{ width: `${Math.round((played[active] ?? 0) * 100)}%` }} />
          </div>
        )}
      </div>

      {/*
        六段：每一幕占页面上的自己那一段（不是叠在同一处交叉淡入）。
        段内层序与上一轮一致——图形层（铺满、退到背后）→ 柔光罩 → 文字（居中）。
      */}
      <div className="home-story-sections" ref={sectionsRef}>
        {acts.map((act, index) => (
          <section
            key={act.id}
            className="home-story-section"
            data-act={act.id}
            data-index={index}
            data-played={(played[index] ?? 0).toFixed(3)}
            data-active={!flowMode && index === activeIndex ? 'true' : undefined}
            /*
             * 「这一幕画的是什么」写进可访问描述（2026-10 加，TODO A3-20）。
             *
             * 背景模式（fixed 舞台）下，场景自带的 kicker/title 与四周的图形**对读屏是不可见的**
             * （整个视觉舞台是 aria-hidden），于是一个只有图形的幕在读屏里等于一片空白。
             * 这里把每幕的 `sceneLabel`（数据里本来就有，用于说明场景画的是什么）接到 section 上：
             * 读屏会先读出幕标题，再读出画面说明；视觉上不占位、也不重复正文。
             */
            aria-labelledby={`home-story-act-${act.id}-title`}
            aria-describedby={`home-story-act-${act.id}-scene`}
            /*
             * 这一段只留**静态**的自定义属性（2026-10-05，安卓流畅度）。
             *
             * 原来这里每帧还在写 `--act-progress` / `--act-progress-position` /
             * `--act-glow-scale` / `--act-core-scale`。写在 section 上，改一次就要把
             * **整段子树（600+ 元素）**的样式重新匹配一遍——逐项实测（1280×800 触屏）：
             * 写 `--act-progress` 35ms/次（它**根本没有消费者**，纯浪费）、
             * 写 `--act-glow-scale` 24ms/次、写内联 opacity/transform 8.5ms/次、切类 6.3ms/次。
             * 现在：死变量删掉，另外两个下沉到真正消费它们的那两个元素上（下面 glow / core，
             * 以及 ActCard 的 h2）——失效范围从「整段」变成「两个元素」。
             */
            style={{ '--act-index-rotation': `${index * 8}deg` } as CSSProperties}
          >
            <div className="home-story-atmosphere" aria-hidden="true">
              <span
                className="home-story-atmosphere-glow"
                style={{ '--act-glow-scale': 0.98 + (played[index] ?? 0) * 0.04 } as CSSProperties}
              />
              <span className="home-story-orbit home-story-orbit-a" />
              <span className="home-story-orbit home-story-orbit-b" />
              <span
                className="home-story-orbit-core"
                style={{ '--act-core-scale': 0.82 + (played[index] ?? 0) * 0.24 } as CSSProperties}
              />
              <span className="home-story-coordinate">MCS · {act.number} / {String(ACT_COUNT).padStart(2, '0')}</span>
              <span className="home-story-signal-field">
                {AMBIENT_SIGNALS.map((signal) => <i key={signal} />)}
              </span>
            </div>
            {!flowMode && (
              <>
                <div className="home-story-visual-stage" aria-hidden="true">
                  {/*
                    图形与文字**分两层**画（2026-10 重做）。
                    同一张场景画两遍：一层只画形状（可以穿过正文列，被柔光罩洗淡——这是有意的遮挡），
                    一层只画文字（用与舞台对齐的遮罩挡掉正文列那一条带）。
                    于是「动画里的文字」永远只出现在四周，不可能被正文压住；
                    而形状仍然在中间与四周之间往返，两层共用同一套位移与漂移，标签始终跟着自己的图形。
                  */}
                  <div
                    className="home-story-visual-layer"
                    data-scene-side={SCENE_SIDES[index % SCENE_SIDES.length]}
                    style={{ opacity: SCENE_BACKDROP_OPACITY }}
                  >
                    <HomeStoryScene scene={act.scene} local={played[index] ?? 0} />
                  </div>
                  <div
                    className="home-story-label-layer"
                    data-scene-side={SCENE_SIDES[index % SCENE_SIDES.length]}
                  >
                    <HomeStoryScene scene={act.scene} local={played[index] ?? 0} />
                  </div>
                  {/*
                    舞台**左上角**的角标（「主题」幕：紫色徽记）。
                    放在图形层之上、与带内那一格分开：左上角是留白最多的地方，徽记在那里
                    不挤正文，也不与四周带里的关键词抢位置。整块视觉舞台是 aria-hidden 的，
                    因此 `alt` 为空。
                  */}
                  {act.cornerMark && (
                    <img
                      className="home-story-corner-mark"
                      src={act.cornerMark.src}
                      alt=""
                      width={act.cornerMark.width}
                      height={act.cornerMark.height}
                    />
                  )}
                  {/*
                    每幕的「大字词」：刻意放在与图形**相对**的那一侧带上，随本幕进度淡入并轻微移入。
                    它与场景自带的标签一起构成「动画里的文字」，两者都只在四周出现——
                    与正文列之间是有意的分区，不是靠遮挡硬凑出来的层次。

                    「主题」幕这一格是**站点字标做的水印**（`act.bandMark`，2026-10-04 加，
                    同日按用户圈的位置挪到中右）：整块视觉舞台是 `aria-hidden` 的装饰，
                    图记因此 `alt=""`；幕名与编号在报头幕导航与正文 kicker 上都还在，没有丢信息。
                    定位与进度动画与文字版**完全共用**，位置与渐隐由 styles.css 的 `.is-mark` 给。
                    水印的底色是 0.9（文字版是 0.72）：它大半压在柔光罩（白 0.9）之下，
                    按文字版那一档会淡到认不出——这是量出来的，不是随手加的。
                  */}
                  <span
                    className={`home-story-ghost-word${act.bandMark ? ' is-mark' : ''}`}
                    data-side={SCENE_SIDES[index % SCENE_SIDES.length] === 'left' ? 'right' : 'left'}
                    style={{
                      opacity: (act.bandMark ? 0.9 : 0.72) + 0.23 * clamp((played[index] ?? 0) * 1.6, 0, 1),
                      transform: `translateY(-50%) translateX(${(1 - clamp((played[index] ?? 0) * 1.6, 0, 1)) * (SCENE_SIDES[index % SCENE_SIDES.length] === 'left' ? 22 : -22)}px)`,
                    }}
                  >
                    {act.bandMark
                      ? (
                        <img
                          className="home-story-ghost-mark"
                          src={act.bandMark.src}
                          alt=""
                          width={act.bandMark.width}
                          height={act.bandMark.height}
                        />
                      )
                      : (
                        <>
                          <span className="home-story-ghost-number">{act.number}</span>
                          {act.kicker}
                        </>
                      )}
                  </span>
                  {/*
                    四周带标签（2026-10 加，TODO A3-19）：每幕 3–5 条关键词，**由带宽定位**。
                    位置不走百分比而是走 `--hs-band`（=「舞台宽 − 正文列宽」的一半），
                    因此换宽度不会跑进正文列，也不会被屏幕切掉；场景自带的 SVG 文字仍是纹理，
                    接近正文列时由遮罩渐隐（它与这里的分工写在 README）。
                    它们是动画文字的一部分：随本幕进度逐条浮现（只浮现一次，见文件底部说明）。
                  */}
                  <ul
                    className="home-story-band-labels"
                    data-side={SCENE_SIDES[index % SCENE_SIDES.length]}
                  >
                    {act.sceneLabels.map((label, labelIndex) => (
                      <li
                        key={label}
                        className="home-story-band-label"
                        style={{
                          /*
                           * 逐条错开浮现：第 i 条在本幕进度 i*0.12 处开始，0.32 内走完。
                           * 但**留一个下限 0.62**——与大字词同一个道理：四周带上的关键词
                           * 是这一屏构图的一部分，不该在没滚之前整片看不见（滚轮只负责让它们
                           * 更亮、更就位）。这与「只浮现一次」的设计一致：见文件底部说明。
                           */
                          opacity: 0.62 + 0.38 * clamp(((played[index] ?? 0) - labelIndex * 0.12) / 0.32, 0, 1),
                          transform: `translateX(${(1 - clamp(((played[index] ?? 0) - labelIndex * 0.12) / 0.32, 0, 1))
                            * (SCENE_SIDES[index % SCENE_SIDES.length] === 'left' ? -14 : 14)}px)`,
                        }}
                      >
                        {label}
                      </li>
                    ))}
                  </ul>
                  <p className="home-story-visual-note">{chrome.visualNote}</p>
                </div>
                <div className="home-story-scrim" aria-hidden="true" />
                {/*
                  末幕收束处的人像：左带下角，右缘钉在正文列左侧，**不压正文**；
                  序列由 `pulse` 触发后自播，不靠滚动擦洗（做法与理由见 StoryPortrait.tsx）。
                  只挂在末幕——它是叙事的收束动作，不是每一幕都有的装饰。
                */}
                {index === portraitAct && (
                  <StoryPortrait armed={portraitArmed} pulse={portraitPulse} />
                )}
              </>
            )}

            <HomeNarrativeActCard
              act={act}
              index={index}
              last={index === ACT_COUNT - 1}
              state={actState(index)}
              sceneLocal={played[index] ?? 0}
              flowMode={flowMode}
              portraitEnabled={portraitEnabled}
              onAuthorClick={firePortrait}
              /* 标题下柔光的缩放：只喂给 ActCard 的 h2，不再写在 section 上。 */
              glowScale={0.98 + (played[index] ?? 0) * 0.04}
              /* 窄屏时人像改挂在署名下方（ActCard 里的 .home-story-portrait-slot）。 */
              portrait={index === portraitAct ? <StoryPortrait armed={portraitArmed} pulse={portraitPulse} /> : null}
            />

            {/*
              每幕的**可访问描述**（TODO A3-20）：视觉上不可见，但读屏与验收都读得到。
              内容就是数据里的 `sceneLabel`——「这一幕画的是什么」，不额外编解释。
            */}
            <p className="visually-hidden" id={`home-story-act-${act.id}-scene`}>
              {`${chrome.scenePrefix}${act.sceneLabel}`}
            </p>

            {!flowMode && (
              <div className="home-story-stage-cue" aria-hidden="true">
                <span className="home-story-cue-wheel"><i /></span>
                <span>
                  {(played[index] ?? 0) < 0.98
                    ? chrome.cuePlay
                    : index < ACT_COUNT - 1 ? chrome.cueNext : chrome.cueEnd}
                </span>
              </div>
            )}
          </section>
        ))}
      </div>

      <div className="home-story-foot" aria-hidden="true">
        <span className="home-story-foot-line" />
        <span>{homeNarrativeFootText(locale, flowMode, ACT_COUNT)}</span>
        {/*
          「浮现只发生一次」写成明说的设计（2026-10，TODO A3-18）。
          以前它是实现细节：文案浮现用的是 CSS 动画（`home-copy-emerge`，`both`），
          只在元素挂载时跑一次，往回滚不会重播——但页面上没写，读者会以为是坏了。
          现在的选择是**保留「只浮现一次」并写明**，而不是让它跟随进度可重播：
          重播会把「已读过的内容」反复推回起点，六幕连读时是干扰；理由与取舍见 README。
        */}
        <span className="home-story-foot-note">{chrome.footNote}</span>
        <span>{chrome.footMotto}</span>
      </div>
    </section>
  );
}

/**
 * 幕内条目的图标：一组 24×24 的线描图，一个条目一张。
 * 图标用的是同一套描边参数（细线、圆头），颜色继承卡片的 tone，
 * 因此换配色时不用改 `d`。图形语义与 `home-narrative.ts` 的 `icon` 字段一一对应：
 *
 * - 「主题」幕的三条主线：一个带连线的节点（知识节点化）、三点两线的网络（关系网络化）、
 *   一页带折角的纸加一支笔（笔记人性化）；
 * - 「现状」幕的六条痛点：重叠的三张卡（重合）、等距顺序里被强调的末点（既定）、
 *   错开的两枚标签（未对齐）、散落的点（分散）、两份相同文档加回环箭头（重复）、
 *   放大镜里一只表（搜寻耗时）。
 */
function PointIcon({ name }: { name: string }) {
  const stroke = {
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.7,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };
  const shapes: Record<string, ReactNode> = {
    // 知识节点化：一个节点带着三条出边，右边各接一个更小的节点。
    node: (
      <>
        <circle cx="7.4" cy="12" r="3.9" {...stroke} />
        <circle cx="7.4" cy="12" r="1" fill="currentColor" stroke="none" />
        <path d="M11.1 10.2 17.4 6.4M11.3 12h6.4M11.1 13.8l6.3 3.8" {...stroke} />
        <circle cx="19.2" cy="6" r="1.8" {...stroke} />
        <circle cx="19.6" cy="12" r="1.8" {...stroke} />
        <circle cx="19.2" cy="18" r="1.8" {...stroke} />
      </>
    ),
    // 关系网络化：四个节点由实线（硬前置）与虚线（软关系）分开连。
    network: (
      <>
        <path d="M6.8 8.4 12 5.6l5.2 2.8v6.4L12 17.6l-5.2-2.8z" {...stroke} />
        <path d="M12 5.6v12M6.8 8.4l10.4 6.4" strokeDasharray="2.6 2.8" {...stroke} />
        <circle cx="6.8" cy="8.4" r="2" {...stroke} />
        <circle cx="12" cy="5.6" r="2" {...stroke} />
        <circle cx="17.2" cy="8.4" r="2" {...stroke} />
        <circle cx="12" cy="17.6" r="2" {...stroke} />
      </>
    ),
    // 笔记人性化：一页纸（右上折角）+ 三行字 + 右下角一支笔。
    notebook: (
      <>
        <path d="M4.6 3.8h9.2l5.6 5.4v11H4.6z" {...stroke} />
        <path d="M13.8 3.8v5.4h5.6" {...stroke} />
        <path d="M7.6 12.6h6.4M7.6 15.6h4.6" {...stroke} />
        <path d="M14.2 20.4l4.4-4.4 1.8 1.8-4.4 4.4-2.4.6z" {...stroke} />
      </>
    ),
    stack: (
      <>
        <rect x="2.8" y="2.8" width="11" height="11" rx="2.6" {...stroke} />
        <rect x="6.6" y="6.6" width="11" height="11" rx="2.6" {...stroke} />
        <rect x="10.4" y="10.4" width="10.8" height="10.8" rx="2.6" {...stroke} />
      </>
    ),
    sequence: (
      <>
        <path d="M2.6 12h18.8" {...stroke} />
        <circle cx="6" cy="12" r="1.7" {...stroke} />
        <circle cx="10.4" cy="12" r="1.7" {...stroke} />
        <circle cx="14.8" cy="12" r="1.7" {...stroke} />
        <circle cx="19.6" cy="12" r="2.9" {...stroke} />
        <circle cx="19.6" cy="12" r="0.9" fill="currentColor" stroke="none" />
      </>
    ),
    mismatch: (
      <>
        <rect x="2.6" y="4.6" width="9" height="5.6" rx="2.8" {...stroke} />
        <rect x="12.4" y="13.8" width="9" height="5.6" rx="2.8" {...stroke} />
        <path d="M11.6 7.4h2.2a2.2 2.2 0 0 1 2.2 2.2v1.4" strokeDasharray="2.6 2.6" {...stroke} />
      </>
    ),
    scatter: (
      <>
        <circle cx="4.6" cy="6.2" r="1.7" {...stroke} />
        <circle cx="12" cy="4.2" r="1.7" {...stroke} />
        <circle cx="19.2" cy="7.2" r="1.7" {...stroke} />
        <circle cx="7.2" cy="13.6" r="1.7" {...stroke} />
        <circle cx="16.2" cy="15" r="1.7" {...stroke} />
        <circle cx="11" cy="19.6" r="1.7" {...stroke} />
        <path d="M3.4 19.4 5 21M21 3l1.4 1.6" {...stroke} />
      </>
    ),
    duplicate: (
      <>
        <rect x="2.8" y="5.2" width="9.4" height="12.2" rx="2.4" {...stroke} />
        <rect x="7.6" y="7.8" width="9.4" height="12.2" rx="2.4" {...stroke} />
        <path d="M17 5.6a3.6 3.6 0 1 0 2.8 3.5" {...stroke} />
        <path d="M19.9 4.9v2.7h-2.7" {...stroke} />
      </>
    ),
    search: (
      <>
        <circle cx="10.4" cy="10.4" r="6.2" {...stroke} />
        <path d="M14.9 14.9 20.8 20.8" {...stroke} />
        <path d="M10.4 7.2v3.4l2.4 1.5" {...stroke} />
      </>
    ),
  };
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" role="presentation" focusable="false">
      {shapes[name] ?? shapes.stack}
    </svg>
  );
}

interface ActCardProps {
  act: HomeNarrativeAct;
  index: number;
  last: boolean;
  state: ActVisualState;
  sceneLocal: number;
  flowMode: boolean;
  /** 人像这条路通不通（`!reduceMotion`）。不通时署名里的作者名退回普通文字，不留死按钮。 */
  portraitEnabled: boolean;
  /** 署名里的作者名被点击时调用——末幕人像序列的唯一入口。 */
  onAuthorClick: () => void;
  /** 窄屏用的人像节点（桌面端由视觉舞台挂着，这里为 null）。 */
  portrait: ReactNode;
  /**
   * 标题下那圈柔光的缩放（0.98 → 1.02，随本幕进度）。
   * 它只被 `h2::before` 消费，所以**写在 h2 上而不是 section 上**：
   * 写在 section 上，每帧一次就会让整段子树重新匹配样式（实测 24ms/次）。
   */
  glowScale: number;
}

function HomeNarrativeActCard({
  act, index, last, state, sceneLocal, flowMode, portraitEnabled, onAuthorClick, portrait, glowScale,
}: ActCardProps) {
  const { ref, inView } = useInView<HTMLElement>();
  /*
   * 末幕入口与署名文案按语种取。
   *
   * `to` 一律是**站内相对路径**（`/start`、`/plan`、`/method`、`/intro`），
   * 由 `Link` 按当前语种前缀解析；这里不拼 `/en`，否则中文站会跟着坏掉。
   */
  const { pick } = useI18n();
  const finalActions = pick(HOME_NARRATIVE_FINAL_ACTIONS_BY_LOCALE);
  const chrome = pick(HOME_NARRATIVE_CHROME);

  return (
    <article
      ref={ref}
      /*
       * `.in-view` 只在**固定舞台**（桌面）这一形态里挂：那边它负责整幕的淡入。
       * 自然滚动形态（手机/平板）不需要它——那里的进入动画挂在图形自己身上（`is-shown`），
       * 因为在这个 612 个元素的子树上切一次类要 8.75ms 样式重算，切在图形上只要 0.25ms
       * （2026-10-05，安卓流畅度：一次全程滚动有十来次切换，省下的是每幕一次的可感卡顿）。
       */
      className={`home-story-act${!flowMode && inView ? ' in-view' : ''}${last ? ' is-final' : ''}`}
      data-act={act.id}
      data-act-index={index}
      style={flowMode ? undefined : { opacity: state.opacity, transform: state.transform }}
    >
      <div className="home-story-act-copy">
        <p className="home-story-kicker"><span>{act.number}</span>{act.kicker}</p>
        {/* id 供 `aria-labelledby` 指向（见 section 上的可访问描述，TODO A3-20）。
            柔光缩放挂在这里：`h2::before` 是它唯一的消费者。 */}
        <h2 id={`home-story-act-${act.id}-title`} style={{ '--act-glow-scale': glowScale } as CSSProperties}>{act.title}</h2>
        <div className="home-story-body">
          {act.paragraphs.map((paragraph) => <p key={paragraph.slice(0, 22)}>{paragraph}</p>)}
        </div>

        {/* 条目清单与证据边界都是可选字段：「主题」幕的三条主线与「现状」幕的六条现状使用。
            条目是「图标 + 短名 + 一句说明」的卡片，不是加粗文字列表——
            「现状」幕的图形就是这六张卡，右侧场景图是它的补充。
            固定舞台的高度是硬约束，见 tests/home-narrative.mjs 的溢出断言。 */}
        {act.points && act.points.length > 0 && (
          <ul className="home-story-points">
            {act.points.map((point) => (
              <li className="home-story-point" key={point.id} data-point={point.id} data-tone={point.tone}>
                <span className="home-story-point-icon" aria-hidden="true">
                  <PointIcon name={point.icon} />
                </span>
                <span className="home-story-point-text">
                  <span className="home-story-point-label">{point.label}</span>
                  <span className="home-story-point-detail">{point.detail}</span>
                </span>
              </li>
            ))}
          </ul>
        )}
        {act.boundary && <p className="home-story-boundary">{act.boundary}</p>}

        {last && (
          <>
            <div className="hero-actions home-story-actions">
              {finalActions.map((action) => (
                action.to.startsWith('#')
                  ? (
                    <a
                      key={action.label}
                      className={`button${action.primary ? ' primary' : ''}${action.ghost ? ' ghost' : ''}${action.primary ? ' hero-cta' : ''}`}
                      href={action.to}
                    >
                      {action.label}
                    </a>
                  )
                  : (
                    <Link
                      key={action.label}
                      className={`button${action.primary ? ' primary' : ''}${action.ghost ? ' ghost' : ''}${action.primary ? ' hero-cta' : ''}`}
                      to={action.to}
                    >
                      {action.label}
                    </Link>
                  )
              ))}
            </div>
            <div className="hero-mark home-story-mark" aria-hidden="true">
              <img src="/logo.png" alt="" width={330} height={330} />
            </div>
            <p className="byline">
              {/*
                署名里的作者名是末幕人像序列的入口（2026-10-04 第四次改口径）。
                它必须是**真的按钮**：键盘能聚焦、读屏会念出「按钮」，这是可访问性；
                但外观要与原来的 <strong> 一模一样——样式全在 `.byline-author` 里抹平，
                `cursor` 也保持继承，不额外改成 pointer。

                「减少动态效果」下这条路本来就不通（见 HomeNarrative 的 portraitEnabled），
                那就退回普通 <strong>：**入口在不在，要看得出来**——留着按钮而点不动，
                正是 2026-10-05 手机上暴露的那个问题。
              */}
              {chrome.bylineAuthor} {portraitEnabled
                ? <button type="button" className="byline-author" onClick={onAuthorClick}>{SITE.author}</button>
                : <strong>{SITE.author}</strong>} · {chrome.bylineContact} <a href={SITE.mailto}>{SITE.email}</a>
            </p>
          </>
        )}
      </div>

      {/*
        窄屏（自然滚动）下的人像挂点：桌面端由视觉舞台挂着，这里只服务 `.is-flow`。
        这一格**高 0**，人像在里面绝对定位——因此它既不占版面、也不推挤正文与插图；
        位置与尺寸见 styles.css 的 `.home-story-portrait-slot`。
      */}
      {last && flowMode && <div className="home-story-portrait-slot">{portrait}</div>}

      {/*
        手机/平板那一块紧凑图形：桌面形态下它本来就被 `display: none` 藏着，
        但 React 照样会重渲染它、把 SVG 的几十个属性重写一遍（2026-10-05，安卓流畅度）。
        **不渲染**比「渲染了再藏起来」便宜：桌面一次进度更新要画的场景从 12 个降到 6 个。
      */}
      {flowMode && (
        <div className="home-story-act-mobile-visual" aria-hidden="true">
          <HomeStoryScene scene={act.scene} local={sceneLocal} compact shown={inView} />
        </div>
      )}
    </article>
  );
}

interface HomeStorySceneProps {
  scene: HomeNarrativeScene;
  local: number;
  compact?: boolean;
  className?: string;
  /** 已进入视口：自然滚动形态下用它挂 `is-shown`（进入动画的标记，见 styles.css）。 */
  shown?: boolean;
}

function HomeStorySceneBase({ scene, local, compact = false, className = '', shown = false }: HomeStorySceneProps) {
  const uid = useId().replace(/:/g, '');
  const t = clamp(local, 0, 1);
  const content = scene === 'theme'
    ? <ThemeScene t={t} uid={uid} />
    : scene === 'pain'
      ? <PainScene t={t} uid={uid} />
      : scene === 'path'
        ? <PathScene t={t} uid={uid} />
        : scene === 'methods'
          ? <MethodsScene t={t} uid={uid} />
          : scene === 'human'
            ? <HumanScene t={t} uid={uid} />
            : <InfrastructureScene t={t} uid={uid} />;

  return (
    <figure className={`home-story-scene${compact ? ' is-compact' : ''}${shown ? ' is-shown' : ''}${className ? ` ${className}` : ''}`}>
      <svg viewBox="0 0 720 560" role="presentation" aria-hidden="true">
        <defs>
          <linearGradient id={`story-brand-${uid}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#4c1d95" />
            <stop offset="52%" stopColor="#7c3aed" />
            <stop offset="100%" stopColor="#c026d3" />
          </linearGradient>
          <linearGradient id={`story-cyan-${uid}`} x1="0" y1="1" x2="1" y2="0">
            <stop offset="0%" stopColor="#0284c7" />
            <stop offset="100%" stopColor="#67e8f9" />
          </linearGradient>
          <filter id={`story-glow-${uid}`} x="-45%" y="-45%" width="190%" height="190%">
            <feGaussianBlur stdDeviation="5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        {content}
      </svg>
    </figure>
  );
}

/**
 * 场景包一层 `memo`（2026-10-05，安卓流畅度）。
 *
 * 六幕各有 2–3 个场景，一次进度更新会让父组件重渲染——没有 memo 时**每个场景都要重算一遍**，
 * 并把几十个 SVG 属性（`opacity` / `transform` / `d` / `r` / `stroke-dashoffset`）重写一遍，
 * 而 SVG 的呈现属性也参与层叠：写一次就是一次样式失效。实测滚一趟首页有约 300 次这样的写入，
 * style 重算 374ms。加 memo 之后只有**本幕**的场景会重渲染（其余 props 没变，直接跳过）。
 * props 全是原始值，比较是廉价的。
 */
const HomeStoryScene = memo(HomeStorySceneBase);

interface SceneProps {
  t: number;
  uid: string;
}

function StoryBackdrop() {
  return <rect className="story-backdrop" x="22" y="22" width="676" height="516" rx="28" />;
}

function StoryText({ x, y, children, className = 'story-caption' }: { x: number; y: number; children: ReactNode; className?: string }) {
  return <text className={className} x={x} y={y}>{children}</text>;
}

/**
 * 第一幕「主题」：一张从单个数学对象长出来的知识网络，加一条从已理解处通向目标的路径。
 *
 * 这一幕是首页的开场点题，因此**首帧就要成立**：把 `amount` 全部取 0 时，
 * 网络与路径已经有四成左右画出来（不是一片空白的点），滚轮推进的是「边补齐、路径走完」。
 * 与「愿景」幕（基础设施）的分工：那一幕画的是公共知识空间与两条路线汇到同一目标，
 * 这一幕画的是**从一到网络**——三个节点先立住，其余节点与边按进度一条条织上去。
 *
 * 图形的重心在左（本幕的图形层让到左侧），路径横过正文列下方再收到右侧的目标；
 * 场景自带的文字只在窄屏那套自然滚动形态里完整可见，桌面背景形态下由遮罩决定去留，
 * 与其余各幕同一套规则（见 styles.css 的 .home-story-label-layer）。
 */
function ThemeScene({ t, uid }: SceneProps) {
  const sceneText: HomeNarrativeSceneText = useI18n().pick(HOME_NARRATIVE_SCENE_TEXT);
  const amount = smoothstep(t);
  /*
   * 顶点：第一个是「数学对象」原点，其余是后来连上的节点。
   *
   * 横向位置是量出来的：本幕的图形层让到左侧（`data-scene-side='left'`，-12% 的自身宽度），
   * 画布最左约 190 单位落在舞台之外（被裁掉），所以整张网从 x≈186 起——
   * 最左两个节点落在左带里看得见，其余节点向中心延伸、被柔光罩洗淡，
   * 这正是「图形从文字背后经过」的那套构图。
   */
  const nodes = [
    { x: 300, y: 286, r: 26, origin: true },
    { x: 232, y: 204, r: 13 },
    { x: 224, y: 372, r: 12 },
    { x: 372, y: 192, r: 14 },
    { x: 398, y: 300, r: 12 },
    { x: 352, y: 396, r: 13 },
    { x: 446, y: 352, r: 11 },
    { x: 332, y: 130, r: 10 },
    { x: 454, y: 224, r: 10 },
  ];
  /** 边：前五条从原点长出，后几条把新节点织进同一张网。 */
  const edges = [[0, 1], [0, 2], [0, 3], [0, 4], [0, 5], [3, 8], [4, 6], [2, 5], [1, 7], [7, 3], [6, 8]];
  /*
   * 逐条画出来：每条边在自己的那一档进度里补齐。
   * 下限 0.42 是**首帧**的下限——开场那一屏不该是一张只有点、没有连线的图。
   */
  const edgeProgress = (index: number) => 0.42 + 0.58 * smoothstep(clamp(amount * 1.9 - index * 0.11, 0, 1));
  const nodeProgress = (index: number) => 0.42 + 0.58 * smoothstep(clamp(amount * 1.7 - (index - 1) * 0.1, 0, 1));
  /*
   * 路径：从网里那个「已经理解」的节点出发，绕到右侧的目标。
   *
   * 用 `pathLength={1}` 把整条路径的长度归一化，虚线就不必手调常数——
   * 进度到哪儿，线就画到哪儿（其余各幕是按实测长度写死的，这里不必再引入一个魔数）。
   */
  const routeProgress = 0.4 + 0.6 * smoothstep(clamp(amount * 1.4 - 0.1, 0, 1));
  const goal = { x: 640, y: 168 };

  return (
    <g className="story-scene story-scene-theme">
      <StoryBackdrop />
      <StoryText x={54} y={74} className="story-kicker">{sceneText.themeKicker}</StoryText>
      <StoryText x={54} y={104} className="story-title">{sceneText.themeTitle}</StoryText>

      <g className="story-theme-net">
        {edges.map(([from, to], index) => {
          const a = nodes[from];
          const b = nodes[to];
          const length = Math.hypot(b.x - a.x, b.y - a.y);
          return (
            <line
              key={`${from}-${to}`}
              className="story-theme-edge"
              x1={a.x}
              y1={a.y}
              x2={b.x}
              y2={b.y}
              strokeDasharray={length}
              strokeDashoffset={length * (1 - edgeProgress(index))}
              opacity={0.3 + 0.7 * edgeProgress(index)}
            />
          );
        })}
        {nodes.map((node, index) => (
          <circle
            key={`${node.x}-${node.y}`}
            className={node.origin ? 'story-theme-origin' : 'story-theme-node'}
            cx={node.x}
            cy={node.y}
            r={node.r * (0.88 + 0.12 * amount)}
            opacity={node.origin ? 1 : nodeProgress(index)}
          />
        ))}
        {/* 原点外面的一圈柔光：它要一眼看出是这张网的中心。 */}
        <circle
          className="story-theme-origin-halo"
          cx={nodes[0].x}
          cy={nodes[0].y}
          r={lerp(38, 56, amount)}
          opacity={0.26 + amount * 0.3}
        />
        <circle className="story-theme-origin-core" cx={nodes[0].x} cy={nodes[0].y} r={9} />
        <text className="story-side-note" x={nodes[0].x} y={nodes[0].y + 54} textAnchor="middle">{sceneText.object}</text>
        <text className="story-route-label" x={nodes[5].x} y={nodes[5].y + 40} textAnchor="middle">{sceneText.understood}</text>
      </g>

      {/* 路径：起点就是网里那个已理解的节点，终点是本幕右侧的目标。 */}
      <path
        className="story-study-route is-brand"
        d={`M${nodes[5].x} ${nodes[5].y}C430 448 470 462 520 440C570 418 596 300 ${goal.x - 6} ${goal.y + 30}`}
        pathLength={1}
        strokeDasharray={1}
        strokeDashoffset={1 - routeProgress}
        style={{ stroke: `url(#story-brand-${uid})` }}
      />
      <circle className="story-route-start is-brand" cx={nodes[5].x} cy={nodes[5].y} r={9} />
      <circle className="story-theme-node" cx="516" cy="438" r="7" />
      <circle className="story-theme-node" cx="590" cy="316" r="7" />

      <g className="story-goal" transform={`translate(${goal.x} ${goal.y}) scale(${lerp(0.92, 1.06, amount)})`}>
        <circle className="story-goal-halo" r="74" />
        <circle className="story-goal-disc" r="46" style={{ stroke: `url(#story-brand-${uid})` }} />
        <path className="story-goal-spark" d="M0-24 6-6 24 0 6 6 0 24-6 6-24 0-6-6Z" />
        <text className="story-goal-title" y="-4" textAnchor="middle">{sceneText.goalTitle}</text>
        <text className="story-goal-note" y="20" textAnchor="middle">{sceneText.yourQuestion}</text>
      </g>
    </g>
  );
}

/**
 * 第二幕「现状」：教材内容重合、顺序既定、前置不问。
 *
 * 三本教材随进度从「错开」收敛到「几乎重合」——重合本身就是要看见的东西；
 * 下半部的既定章节顺序里，被排到最后的那一点才是学习者想先弄懂的，
 * 而「已经会了」与「教材假设的前置」两枚标签始终错开。
 */
function PainScene({ t }: SceneProps) {
  const sceneText: HomeNarrativeSceneText = useI18n().pick(HOME_NARRATIVE_SCENE_TEXT);
  const amount = smoothstep(t);
  // 三本从「错开 44」收敛到「错开 22」：始终留着一条缝，让每本书都露出同一行内容。
  const spread = lerp(44, 22, amount);
  const sharedOpacity = 0.15 + 0.85 * amount;
  const markerOpacity = 0.28 + 0.72 * amount;

  return (
    <g className="story-scene story-scene-pain">
      <StoryBackdrop />
      <StoryText x={54} y={74} className="story-kicker">{sceneText.painKicker}</StoryText>
      <StoryText x={54} y={104} className="story-title">{sceneText.painTitle}</StoryText>

      {[0, 1, 2].map((index) => (
        <g key={index} transform={`translate(${120 + index * spread} ${132 + index * 18})`}>
          <rect className="story-book-cover" width="212" height="122" rx="13" />
          <rect className="story-book-page" x="14" y="15" width="184" height="92" rx="8" />
          {[0, 1, 2, 3].map((line) => (
            <line
              key={line}
              className={`story-book-line${line === 1 ? ' is-shared' : ''}`}
              x1={line === 1 ? 20 : 30}
              y1={34 + line * 16}
              x2={line === 1 ? 196 : line % 3 === 0 ? 148 : 170 - line * 7}
              y2={34 + line * 16}
              opacity={line === 1 ? sharedOpacity : 0.85}
            />
          ))}
          <rect className="story-book-tab" x="152" y="20" width="48" height="20" rx="10" />
        </g>
      ))}

      <g opacity={0.3 + amount * 0.7}>
        <rect className="story-side-card" x="466" y="164" width="216" height="122" rx="18" />
        <text className="story-side-title" x="490" y="202">{sceneText.overlapCardTitle}</text>
        <text className="story-side-item" x="490" y="238">{sceneText.overlapCardLine}</text>
        <text className="story-side-note" x="490" y="268">{sceneText.overlapCardNote}</text>
      </g>

      <g opacity={markerOpacity}>
        <g className="story-personal-marker is-green">
          <rect x="60" y="344" width="112" height="40" rx="20" />
          <text x="116" y="371" textAnchor="middle">{sceneText.knownMarker}</text>
        </g>
        <g className="story-personal-marker is-brand">
          <rect x="466" y="344" width="176" height="40" rx="20" />
          <text x="554" y="371" textAnchor="middle">{sceneText.assumedMarker}</text>
        </g>
        <path className="story-marker-line" d="M176 364H462" />
        <StoryText x={319} y={358} className="story-small story-centered">{sceneText.noOverlap}</StoryText>
      </g>

      <path className="story-route story-route-fixed" d="M70 452H650" strokeDasharray="580" strokeDashoffset={580 * (1 - amount)} />
      {[0, 1, 2, 3, 4, 5].map((index) => (
        <g key={index} transform={`translate(${90 + index * 104} 452)`} opacity={0.45 + amount * 0.55}>
          <circle className={`story-route-node${index === 5 ? ' is-target' : ''}`} r="20" />
          <text className="story-route-number" y="6">{index + 1}</text>
        </g>
      ))}
      <StoryText x={610} y={412} className="story-small story-centered">{sceneText.wantedFirst}</StoryText>
      <StoryText x={70} y={494} className="story-small">{sceneText.presetOrder}</StoryText>
      <StoryText x={54} y={526} className="story-small">{sceneText.painBottomNote}</StoryText>
    </g>
  );
}

function PathScene({ t, uid }: SceneProps) {
  const sceneText: HomeNarrativeSceneText = useI18n().pick(HOME_NARRATIVE_SCENE_TEXT);
  const amount = smoothstep(t);
  const dash = 560 * (1 - amount);
  const markers = [
    { label: sceneText.pathMarkers[0], x: 106, y: 306, tx: 176, ty: 440, className: 'is-green' },
    { label: sceneText.pathMarkers[1], x: 300, y: 226, tx: 366, ty: 440, className: 'is-brand' },
    { label: sceneText.pathMarkers[2], x: 496, y: 344, tx: 556, ty: 440, className: 'is-cyan' },
  ];

  return (
    <g className="story-scene story-scene-path">
      <StoryBackdrop />
      <StoryText x={54} y={78} className="story-kicker">{sceneText.pathKicker}</StoryText>
      <StoryText x={54} y={110} className="story-title">{sceneText.pathTitle}</StoryText>

      <g transform={`translate(${lerp(-16, 0, amount)} ${lerp(18, 0, amount)})`}>
        {[0, 1, 2].map((index) => (
          <g key={index} transform={`translate(${64 + index * 22} ${146 + index * 62})`}>
            <rect className="story-book-cover" width="208" height="118" rx="13" />
            <rect className="story-book-page" x="14" y="15" width="180" height="88" rx="8" />
            {[0, 1, 2, 3].map((line) => (
              <line
                key={line}
                className="story-book-line"
                x1="30"
                y1={33 + line * 15}
                x2={line % 3 === 0 ? 142 : 166 - line * 7}
                y2={33 + line * 15}
              />
            ))}
            <rect className="story-book-tab" x="114" y="16" width="94" height="30" rx="15" />
            <text className="story-book-label" x="126" y="38">{sceneText.bookLabel.replace('{n}', String(index + 1))}</text>
          </g>
        ))}
      </g>

      <path className="story-route story-route-fixed" d="M70 440H650" strokeDasharray="580" strokeDashoffset={dash} style={{ stroke: `url(#story-brand-${uid})` }} />
      {[0, 1, 2, 3, 4, 5].map((index) => (
        <g key={index} transform={`translate(${90 + index * 104} 440)`} opacity={0.45 + amount * 0.55}>
          <circle className="story-route-node" r="20" />
          <text className="story-route-number" y="6">{index + 1}</text>
        </g>
      ))}
      <StoryText x={70} y={484} className="story-small">{sceneText.presetOrder}</StoryText>

      {markers.map((marker) => (
        <g key={marker.label} className={`story-personal-marker ${marker.className}`} opacity={0.28 + amount * 0.72}>
          <path className="story-marker-line" d={`M${marker.x + 60} ${marker.y + 20} Q${marker.x + 78} ${marker.ty - 26} ${marker.tx} ${marker.ty - 14}`} />
          <rect x={marker.x} y={marker.y} width="120" height="40" rx="20" />
          <text x={marker.x + 60} y={marker.y + 27} textAnchor="middle">{marker.label}</text>
        </g>
      ))}
      <StoryText x={54} y={524} className="story-small">{sceneText.pathBottomNote}</StoryText>
    </g>
  );
}

function MethodsScene({ t, uid }: SceneProps) {
  const sceneText: HomeNarrativeSceneText = useI18n().pick(HOME_NARRATIVE_SCENE_TEXT);
  const amount = smoothstep(t);
  const books = [
    { x: 34, label: sceneText.bookNames[0] },
    { x: 258, label: sceneText.bookNames[1] },
    { x: 482, label: sceneText.bookNames[2] },
  ];
  const highlights = [
    { label: sceneText.highlights[0], from: [78, 188], to: [286, 344], tone: 'brand' },
    { label: sceneText.highlights[1], from: [126, 250], to: [330, 386], tone: 'cyan' },
    { label: sceneText.highlights[2], from: [306, 206], to: [386, 386], tone: 'ember' },
    { label: sceneText.highlights[3], from: [522, 246], to: [432, 344], tone: 'brand' },
  ];

  return (
    <g className="story-scene story-scene-methods">
      <StoryBackdrop />
      <StoryText x={54} y={78} className="story-kicker">{sceneText.methodsKicker}</StoryText>
      <StoryText x={54} y={110} className="story-title">{sceneText.methodsTitle}</StoryText>

      {books.map((book) => (
        <g key={book.label} transform={`translate(${book.x} 148)`}>
          <rect className="story-book-cover" width="204" height="272" rx="14" />
          <rect className="story-book-page" x="14" y="16" width="176" height="238" rx="9" />
          <text className="story-book-name" x="24" y="46">{book.label}</text>
          {[0, 1, 2, 3, 4, 5, 6].map((line) => (
            <line key={line} className="story-book-line" x1="26" y1={70 + line * 23} x2={line % 3 === 1 ? 132 : 168 - (line % 3) * 8} y2={70 + line * 23} />
          ))}
          {[0, 1, 2].map((tab) => (
            <rect key={tab} className="story-book-tab" x="140" y={74 + tab * 38} width="46" height="24" rx="12" />
          ))}
        </g>
      ))}

      {highlights.map((highlight) => {
        const x = lerp(highlight.from[0], highlight.to[0], amount);
        const y = lerp(highlight.from[1], highlight.to[1], amount);
        return (
          <g key={highlight.label} className={`story-highlight is-${highlight.tone}`}>
            <path className="story-highlight-line" d={`M${highlight.from[0]} ${highlight.from[1] + 12} Q${(highlight.from[0] + x) / 2} ${Math.min(highlight.from[1], y) - 26} ${x} ${y}`} opacity={0.22 + amount * 0.62} />
            <g transform={`translate(${x - 58} ${y - 20})`} opacity={0.42 + amount * 0.58}>
              <rect width="116" height="40" rx="20" />
              <text x="58" y="26" textAnchor="middle">{highlight.label}</text>
            </g>
            <path className="story-converge-line" d={`M${x} ${y + 20} Q${(x + 360) / 2} ${y + 66} 360 396`} opacity={amount * 0.62} />
          </g>
        );
      })}

      <g className="story-center-node" transform={`translate(360 424) scale(${lerp(0.88, 1.06, amount)})`}>
        <circle className="story-center-halo" r="96" opacity={0.18 + amount * 0.28} />
        <circle className="story-center-disc" r="70" style={{ stroke: `url(#story-brand-${uid})` }} />
        <text className="story-center-title" y="-4" textAnchor="middle">{sceneText.object}</text>
        <text className="story-center-subtitle" y="24" textAnchor="middle">{sceneText.meetHere}</text>
      </g>
      <StoryText x={360} y={530} className="story-small story-centered">{sceneText.methodsBottomNote}</StoryText>
    </g>
  );
}

function HumanScene({ t }: SceneProps) {
  const sceneText: HomeNarrativeSceneText = useI18n().pick(HOME_NARRATIVE_SCENE_TEXT);
  const amount = smoothstep(t);
  const chain = [
    { label: sceneText.chain[0], y: 126 },
    { label: sceneText.chain[1], y: 228 },
    { label: sceneText.chain[2], y: 330 },
  ];
  const detailOpacity = smoothstep((t - 0.12) / 0.62);

  return (
    <g className="story-scene story-scene-human">
      <StoryBackdrop />
      <StoryText x={54} y={68} className="story-kicker">{sceneText.humanKicker}</StoryText>
      <StoryText x={54} y={100} className="story-title">{sceneText.humanTitle}</StoryText>

      {chain.map((item, index) => (
        <g key={item.label}>
          <rect className="story-chain-card" x="210" y={item.y} width="300" height="78" rx="20" />
          <text className="story-chain-index" x="234" y={item.y + 48}>{String(index + 1).padStart(2, '0')}</text>
          <text className="story-chain-label" x="286" y={item.y + 50}>{item.label}</text>
          {index < chain.length - 1 && (
            <path className="story-chain-arrow" d={`M360 ${item.y + 82}V${chain[index + 1].y - 10}`} strokeDasharray="36" strokeDashoffset={36 * (1 - smoothstep(clamp(amount * 1.7 - index * 0.35, 0, 1)))} />
          )}
        </g>
      ))}

      <g opacity={detailOpacity}>
        <rect className="story-side-card" x="30" y="170" width="172" height="168" rx="20" />
        <text className="story-side-title" x="52" y="208">{sceneText.proofCard}</text>
        <text className="story-side-item" x="52" y="248">{sceneText.overview}</text>
        <path className="story-side-arrow" d="M58 262H176M58 288H146" />
        <text className="story-side-item" x="52" y="322">{sceneText.details}</text>

        <rect className="story-side-card is-warm" x="520" y="170" width="172" height="168" rx="20" />
        <text className="story-side-title" x="542" y="208">{sceneText.conditionCard}</text>
        {/*
          右侧这张卡的标签**右对齐**（`textAnchor="end"`，锚在卡片右内边距上）。
          它们以前是左对齐的：文字层渲染字号约 33px（「字大一点」是设计要求），
          于是一条 7 字标签就有约 285px 宽，从卡片左边一路伸出场景右边界——
          实测「体验」幕有两条被屏幕切掉（TODO A3-17）。右对齐之后它们向**左**生长，
          场景怎么窄都不会出屏，字号也不必为了避让而缩小。
        */}
        <text className="story-side-item" x="678" y="248" textAnchor="end">{sceneText.deleteIt}</text>
        <text className="story-side-item is-warm" x="678" y="288" textAnchor="end">{sceneText.keyCounterexample}</text>
        <text className="story-side-note" x="678" y="318" textAnchor="end">{sceneText.collapseNote}</text>
      </g>

      <g opacity={detailOpacity}>
        <rect className="story-outer-card" x="210" y="424" width="300" height="74" rx="20" />
        <text className="story-outer-title" x="360" y="454" textAnchor="middle">{sceneText.supportCard}</text>
        <text className="story-outer-note" x="360" y="480" textAnchor="middle">{sceneText.supportNote}</text>
        <text className="story-bottom-note" x="360" y="530" textAnchor="middle">{sceneText.trialNote}</text>
      </g>
    </g>
  );
}

function InfrastructureScene({ t, uid }: SceneProps) {
  const sceneText: HomeNarrativeSceneText = useI18n().pick(HOME_NARRATIVE_SCENE_TEXT);
  const amount = smoothstep(t);
  const backgroundNodes = [
    [110, 120], [220, 92], [560, 112], [640, 210], [108, 330], [610, 386], [250, 484], [500, 492],
  ];
  const edges = [
    [0, 1], [1, 2], [2, 3], [0, 4], [3, 5], [4, 6], [5, 7], [6, 7], [1, 6], [2, 7],
  ];

  return (
    <g className="story-scene story-scene-infrastructure">
      <StoryBackdrop />
      <StoryText x={54} y={68} className="story-kicker">{sceneText.infraKicker}</StoryText>
      <StoryText x={54} y={100} className="story-title">{sceneText.infraTitle}</StoryText>

      <g className="story-space" opacity={0.3 + amount * 0.7}>
        {edges.map(([from, to]) => (
          <line
            key={`${from}-${to}`}
            className="story-space-edge"
            x1={backgroundNodes[from][0]}
            y1={backgroundNodes[from][1]}
            x2={backgroundNodes[to][0]}
            y2={backgroundNodes[to][1]}
          />
        ))}
        {backgroundNodes.map(([x, y], index) => (
          <circle key={`${x}-${y}`} className="story-space-node" cx={x} cy={y} r={index % 3 === 0 ? 15 : 11} />
        ))}
      </g>

      <path className="story-study-route is-brand" d="M106 438C170 410 218 354 360 310" strokeDasharray="420" strokeDashoffset={420 * (1 - amount)} style={{ stroke: `url(#story-brand-${uid})` }} />
      <path className="story-study-route is-cyan" d="M626 138C548 178 492 230 360 310" strokeDasharray="430" strokeDashoffset={430 * (1 - amount)} style={{ stroke: `url(#story-cyan-${uid})` }} />
      <circle className="story-route-start is-brand" cx="106" cy="438" r="14" />
      <circle className="story-route-start is-cyan" cx="626" cy="138" r="14" />
      <text className="story-route-label" x="74" y="484">{sceneText.yourQuestion}</text>
      <text className="story-route-label" x="560" y="116">{sceneText.anotherEntry}</text>

      <g className="story-goal" transform={`translate(360 310) scale(${lerp(0.9, 1.08, amount)})`}>
        <circle className="story-goal-halo" r="98" />
        <circle className="story-goal-disc" r="72" style={{ stroke: `url(#story-brand-${uid})` }} />
        <path className="story-goal-spark" d="M0-36 10-10 36 0 10 10 0 36-10 10-36 0-10-10Z" />
        <text className="story-goal-title" y="-6" textAnchor="middle">{sceneText.sharedGoal}</text>
        <text className="story-goal-note" y="24" textAnchor="middle">{sceneText.manyPaths}</text>
      </g>
      <StoryText x={360} y={530} className="story-small story-centered">{sceneText.infraBottomNote}</StoryText>
    </g>
  );
}
