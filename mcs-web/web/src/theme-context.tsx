/**
 * 外观上下文（2026-10-16 加，第一百零九轮）。
 *
 * 三件事都收在这一处：
 * 1. **状态**：偏好（`light | dark | system`）与解析结果（`light | dark`），读写规则在 `theme-mode.ts`；
 * 2. **跟随系统**：`matchMedia` 的 change 事件无论当前偏好是什么都监听，但只有偏好为
 *    `system` 时结果才会跟着变（`resolveTheme` 负责这件事，浏览器里不必分支）；
 * 3. **写入 `<html>`**：解析结果一变就重写 `data-theme` / `data-theme-preference` /
 *    `theme-color`，因此 CSS 与移动端地址栏都跟着走。
 *
 * `useThemePalette()`（在 `theme-palette.ts`）是给**画布**用的：SVG 的表现属性
 * （`stroke=` / `fill=`）不接受 `var()`，节点网络上的关系线、契约线、节点卡片底色
 * 只能在 JS 里给字面色值。因此那边把当前外观下的整套颜色一次取出——
 * 组件不再自己判断明暗（判断散在各处时，总有一处会漏，而漏掉的地方在浅色下看不出问题）。
 */

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  DARK_QUERY,
  applyTheme,
  readThemePreference,
  resolveTheme,
  systemPrefersDark,
  writeThemePreference,
  type ResolvedTheme,
  type ThemePreference,
} from './theme-mode';

export interface ThemeContextValue {
  /** 用户的选择；`system` 表示跟随系统。 */
  preference: ThemePreference;
  /** 当前实际外观（CSS 与画布都按它取色）。 */
  resolved: ResolvedTheme;
  setPreference: (preference: ThemePreference) => void;
}

/**
 * 默认值只在**没有 Provider** 时生效（例如单测里单独渲染某个组件）。
 * 取浅色而不是抛错：少一个 Provider 不该让整页白屏，而且浅色就是站点从前的样子。
 */
const ThemeContext = createContext<ThemeContextValue>({
  preference: 'system',
  resolved: 'light',
  setPreference: () => {},
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  // 初值直接读本机偏好与系统状态：引导脚本已经写过一次 `<html>`，这里只是让 React 的状态与它一致。
  const [preference, setPreferenceState] = useState<ThemePreference>(() => readThemePreference());
  const [prefersDark, setPrefersDark] = useState<boolean>(() => systemPrefersDark());
  const resolved = resolveTheme(preference, prefersDark);

  useEffect(() => {
    /*
     * 系统偏好变化时不重解析偏好，只更新「系统现在是深还是浅」；
     * 偏好的解析由 `resolveTheme` 在渲染时完成，因此「选了浅色就不跟随」是结构事实。
     */
    let media: MediaQueryList | null = null;
    try {
      media = window.matchMedia(DARK_QUERY);
    } catch {
      media = null;
    }
    if (!media) return;
    const sync = (event: MediaQueryListEvent) => setPrefersDark(event.matches);
    setPrefersDark(media.matches);
    media.addEventListener('change', sync);
    return () => media.removeEventListener('change', sync);
  }, []);

  useEffect(() => {
    applyTheme(resolved, preference);
  }, [resolved, preference]);

  const setPreference = useCallback((next: ThemePreference) => {
    // 先落盘再改状态：刷新后回来的仍是用户刚选的那一项。
    writeThemePreference(next);
    setPreferenceState(next);
  }, []);

  const value = useMemo(() => ({ preference, resolved, setPreference }), [preference, resolved, setPreference]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}
