import { useEffect } from 'react';

/**
 * 主要按键的「按下」反馈：把点击落点写进两个 CSS 变量（2026-10-04 加）。
 *
 * 高光是一张画在按键**内部**的径向渐变
 * （`background: radial-gradient(circle 5rem at var(--press-x) var(--press-y), …)`，见 styles.css），
 * 圆心必须知道指针落在按键的哪个位置——这件事 CSS 自己拿不到，所以要在这里写一次。
 *
 * 三条边界：
 *
 * 1. **只写 CSS 变量，不写 React 状态**。按下不该让整页重算：知识网络那一页每帧都在渲染，
 *    给按键加一次状态更新没有任何收益。变量写在元素的行内样式上，浏览器自己重画。
 * 2. **反馈是可丢的**。没有这段 JS 时 `--press-x/--press-y` 用缺省值 50% / 50%（高光落在正中），
 *    键盘激活（Enter / 空格）走的也正是这条路径——`:active` 与指针无关，本组件只负责「落点更准」。
 * 3. **监听只挂一次**，挂在 `document` 的捕获阶段（按键里的图标、文字被点到时也要能追到按键本身）。
 *    本组件在 `Layout` 里挂载一次，覆盖全部页面。
 *
 * 选择器与 styles.css 里那一组**必须一致**（这边决定「落点写给谁」，那边决定「谁有按下反馈」）。
 * 样式表里多一个、这里少一个的后果是「那个按键会从中心亮起来」而不是「不亮」——所以
 * `tests/browser.mjs` 按类各按一次（`button.button.primary`、`.nav-item`、`.brand`、`.angle-chip`），
 * 核对落点真的跟着指针走；`.chip-clear` 本身是 `<button>`，由 `button` 那一类覆盖。
 */
export const PRESSABLE_SELECTOR = 'button, .button, .nav-item, .brand, .angle-chip, .chip-clear';

export function PressFeedback() {
  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      // 只认主键：中键/右键不该出现「按下」的样子（触摸与触控笔的 button 也是 0）。
      if (event.button !== 0) return;
      const start = event.target;
      if (!(start instanceof Element)) return;
      const target = start.closest<HTMLElement>(PRESSABLE_SELECTOR);
      if (!target) return;
      // 禁用态是「点不动」，不是「按下去了」。
      if (target instanceof HTMLButtonElement && target.disabled) return;
      if (target.getAttribute('aria-disabled') === 'true') return;
      const rect = target.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;
      const percent = (value: number) => Math.min(100, Math.max(0, value)).toFixed(2);
      target.style.setProperty('--press-x', `${percent(((event.clientX - rect.left) / rect.width) * 100)}%`);
      target.style.setProperty('--press-y', `${percent(((event.clientY - rect.top) / rect.height) * 100)}%`);
    };
    document.addEventListener('pointerdown', onPointerDown, { capture: true, passive: true });
    return () => document.removeEventListener('pointerdown', onPointerDown, { capture: true });
  }, []);
  return null;
}
