import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * 可拖动悬浮框的位置状态。
 *
 * 设计取舍：
 * - 位置存在 localStorage，**不进 URL**。URL 已经被节点集合占用（`?nodes=`），
 *   面板位置属于个人界面偏好，混进可分享链接只会让它变长且互相干扰。
 * - 用「视口比例」而不是像素保存：窗口尺寸变化或换显示器后，面板仍在可视区域内。
 * - 拖动结束时才写 localStorage，不在拖动过程中写（避免每帧一次磁盘写入）。
 * - 指针事件（pointerdown/move/up）而非鼠标事件：同时支持触摸与触控笔。
 */

export interface PanelPosition {
  /** 视口宽度比例，0–1。 */
  x: number;
  /** 视口高度比例，0–1。 */
  y: number;
}

const STORAGE_KEY = 'mcs-network-panels-v1';
function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function readStore(): Record<string, PanelPosition> {
  if (typeof localStorage === 'undefined') return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return {};
    const output: Record<string, PanelPosition> = {};
    for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
      const position = value as Partial<PanelPosition> | null;
      if (position && typeof position.x === 'number' && typeof position.y === 'number') {
        output[key] = { x: clamp(position.x, 0, 1), y: clamp(position.y, 0, 1) };
      }
    }
    return output;
  } catch {
    return {};
  }
}

function writeStore(store: Record<string, PanelPosition>): void {
  if (typeof localStorage === 'undefined') return;
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(store)); } catch { /* 隐私模式或配额满：位置丢失不致命 */ }
}

export interface DraggablePanel {
  position: PanelPosition | null;
  dragging: boolean;
  /** 绑到面板根元素上。 */
  handleRef: (element: HTMLElement | null) => void;
  /** 绑到拖动把手上（通常是面板标题栏）。 */
  onPointerDown: (event: React.PointerEvent) => void;
  /** 恢复默认位置。 */
  reset: () => void;
  /**
   * 把面板夹回可见区域。
   *
   * 为什么需要：位置按视口比例保存，换窗口大小或换显示器后，右侧面板的
   * 关闭按钮会被推到画布外（实测 1280 宽时右面板 x=1013、右边到 1353，超出视口）。
   * 打开面板与窗口尺寸变化时都要调用一次，保证标题栏里的按钮始终可点。
   */
  clampIntoView: () => void;
}

export interface DraggablePanelOptions {
  /**
   * 顶部要避开的浮层高度（像素）——HUD 压在画布上，标题栏若躲到它底下就点不到了。
   *
   * 为什么要这个参数（2026-10-11 用户报「节点详情的关闭键点不到」）：夹取原本只保证
   * 「面板落在画布内」（top ≥ 0），而 HUD 是**浮在画布上**的（`z-index` 更高）。
   * HUD 只有两行时 0 也够用；本轮往 HUD 里加了排法/锚点/保留手动摆放之后它变成三行
   * （实测 1500px 下 174px 高），面板被拖到最上面时标题栏正好压在 HUD 底下——
   * 关闭按钮看得见、点下去却被 HUD 接走。
   */
  topInset?: number;
}

export function useDraggablePanel(id: string, defaultPosition: PanelPosition, options: DraggablePanelOptions = {}): DraggablePanel {
  const [position, setPosition] = useState<PanelPosition | null>(null);
  const [dragging, setDragging] = useState(false);
  const elementRef = useRef<HTMLElement | null>(null);
  const offsetRef = useRef({ x: 0, y: 0 });
  /*
   * 顶部留白放进 ref 而不是依赖：`clampToBounds` 的**身份必须稳定**——
   * 它被 handleRef 的补夹回调与两个 effect 引用，身份一变就会反复重建
   * （拖动过程中每次 setState 都会重建，等于把窗口监听器拆了又装）。
   */
  const topInsetRef = useRef(options.topInset ?? 0);
  topInsetRef.current = options.topInset ?? 0;

  /**
   * 把位置夹进父容器（画布）的可见区域。
   *
   * 用 offsetParent 的尺寸而不是窗口尺寸：浮窗挂在画布上，右侧面板在较窄的窗口里
   * 会被推出画布——关闭按钮正好落在屏幕外（实测 1280 宽时面板右边到 1353）。
   *
   * 上边界不是 0 而是 `topInset`：HUD 浮在画布顶部，标题栏躲到它底下就点不到了（见 options.topInset）。
   */
  const clampToBounds = useCallback((base: PanelPosition): PanelPosition => {
    const element = elementRef.current;
    const parent = element?.offsetParent as HTMLElement | null;
    const bounds = parent?.getBoundingClientRect();
    const width = bounds?.width ?? window.innerWidth;
    const height = bounds?.height ?? window.innerHeight;
    const panelWidth = element?.offsetWidth || 320;
    const panelHeight = element?.offsetHeight || 200;
    // 留白不能超过可用高度，否则会出现 min > max、夹取反而把面板推出画布。
    const inset = Math.min(Math.max(topInsetRef.current, 0), Math.max(height - 40, 0));
    const maxLeft = Math.max(0, width - panelWidth - 8);
    const maxTop = Math.max(inset, height - Math.min(panelHeight, height - inset) - 8);
    const left = clamp(base.x * width, 0, maxLeft);
    const top = clamp(base.y * height, inset, maxTop);
    return {
      x: clamp(left / Math.max(width, 1), 0, 1),
      y: clamp(top / Math.max(height, 1), 0, 1),
    };
  }, []);

  /**
   * 绑定面板元素，并在**第一次拿到元素时**补夹一次位置。
   *
   * 为什么不能只靠下面的挂载 effect：组建网络页在画布数据到达前会提前返回，
   * 那时面板还不在 DOM 里，effect 与它的下一帧都量不到尺寸（offsetParent 为 null），
   * 于是右侧面板会带着默认位置留在画布外。元素真正出现时再夹，才能拿到真实宽度。
   */
  const handleRef = useCallback((element: HTMLElement | null) => {
    const had = Boolean(elementRef.current);
    elementRef.current = element;
    if (element && !had) {
      requestAnimationFrame(() => {
        setPosition((current) => (current ? clampToBounds(current) : current));
      });
    }
  }, [clampToBounds]);

  // 首帧之后才读 localStorage：避免服务端/首屏渲染差异。
  // 恢复出来的位置立刻夹一次——元素此时已经完成布局，能拿到真实尺寸。
  useEffect(() => {
    const stored = readStore()[id];
    setPosition(clampToBounds(stored ?? defaultPosition));
    /*
     * 再夹一次：首次提交时画布可能还没有完成布局（offsetParent 仍为 null），
     * 那一轮会退化成按窗口宽度计算，等于没夹。下一帧量到的是真实尺寸，因此补一次。
     */
    const frame = requestAnimationFrame(() => {
      setPosition((current) => (current ? clampToBounds(current) : current));
    });
    return () => cancelAnimationFrame(frame);
    // defaultPosition 是常量对象，clampToBounds 稳定，都不需要进依赖数组。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const onPointerDown = useCallback((event: React.PointerEvent) => {
    const element = elementRef.current;
    if (!element) return;
    // 不劫持按钮、链接与输入控件上的拖动起点。
    const target = event.target as HTMLElement;
    if (target.closest('button, a, input, select, textarea, summary')) return;
    const rect = element.getBoundingClientRect();
    offsetRef.current = { x: event.clientX - rect.left, y: event.clientY - rect.top };
    setDragging(true);
    event.preventDefault();
  }, []);

  useEffect(() => {
    if (!dragging) return;
    const onMove = (event: PointerEvent) => {
      const element = elementRef.current;
      if (!element) return;
      /*
       * 拖动坐标必须和渲染坐标用同一个参照系。
       *
       * 渲染是 `left: x * 100%`，百分比相对浮窗的父容器（画布），而这里早先按 **窗口** 尺寸
       * 计算比例：两者在侧栏占宽、画布不满屏时会不一致——拖动 70px 会落到别处，刷新后
       * 位置也对不上。现在统一用 offsetParent 的矩形换算。
       */
      const parent = element.offsetParent as HTMLElement | null;
      const bounds = parent?.getBoundingClientRect();
      const width = bounds?.width ?? window.innerWidth;
      const height = bounds?.height ?? window.innerHeight;
      const left = event.clientX - (bounds?.left ?? 0) - offsetRef.current.x;
      const top = event.clientY - (bounds?.top ?? 0) - offsetRef.current.y;
      setPosition(clampToBounds({ x: left / Math.max(width, 1), y: top / Math.max(height, 1) }));
    };
    const onUp = () => {
      setDragging(false);
      setPosition((current) => {
        if (current) writeStore({ ...readStore(), [id]: current });
        return current;
      });
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };
  }, [dragging, id, clampToBounds]);

  const reset = useCallback(() => {
    setPosition(defaultPosition);
    const store = readStore();
    delete store[id];
    writeStore(store);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const clampIntoView = useCallback(() => {
    setPosition((current) => {
      if (!current) return current;
      const next = clampToBounds(current);
      if (Math.abs(next.x - current.x) < 0.0005 && Math.abs(next.y - current.y) < 0.0005) return current;
      return next;
    });
  }, [clampToBounds]);

  return { position, dragging, handleRef, onPointerDown, reset, clampIntoView };
}
