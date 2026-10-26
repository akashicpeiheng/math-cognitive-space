/**
 * 外观状态：浅色 / 深色 / 跟随系统（2026-10-16 加，第一百零九轮）。
 *
 * ## 三态而不是两态
 *
 * 「跟随系统」是一个**与浅色、深色并列的选项**，不是「没有选择」。两者混为一谈会有一个
 * 具体的坏处：用户在深色系统上手动选了浅色之后，只要不再碰开关，系统变深也不会影响他
 * ——这正是他选浅色的意思；而如果他选的是「跟随系统」，系统变深时站点必须跟着变。
 * 因此存的是**偏好**，不是**结果**。
 *
 * ## 结果写在 `<html>` 上，CSS 只认 `[data-theme]`
 *
 * 解析出的结果同时写进两个属性：
 * - `data-theme="light|dark"`：CSS 唯一认的东西（`styles.css` 的暗色覆盖全部挂在它下面）；
 * - `data-theme-preference="light|dark|system"`：给调试与断言用，CSS 不读它。
 *
 * 为什么不在 CSS 里写 `@media (prefers-color-scheme: dark)`：那样会有两套真相
 * （系统一套、用户选择一套），用户显式选浅色时还得靠 `:not([data-theme])` 之类的
 * 选择器去压媒体查询，一处写漏就出现「选了浅色还是深色」。现在解析只发生在这里。
 *
 * ## 首帧不闪白
 *
 * 本模块在 React 挂载后才生效，而第一帧渲染比它早，所以还有一份**同规则的**引导脚本
 * `web/public/theme-boot.js` 在 `<head>` 里同步跑（生产环境 CSP 是 `script-src 'self'`，
 * 不能写内联脚本）。两处的存储键与媒体查询必须一致，由 `tests/theme-tokens.test.mjs` 断言。
 *
 * ## 它不碰学习者数据
 *
 * 外观是**本机口味**，不是 E 层事实：只写 `localStorage`，不进档案、不进 URL、
 * 不参与导出（与 `start-preferences.ts` 的偏好同一类）。
 */

export type ThemePreference = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

/** 本机存储键：`mcs-<用途>-v1` 是本站既有约定（见 Layout.tsx 的侧栏折叠）。 */
export const THEME_PREFERENCE_KEY = 'mcs-theme-v1';
/** 解析结果写在根元素上的属性名。 */
export const THEME_ATTRIBUTE = 'data-theme';
/** 偏好（含 `system`）写在根元素上的属性名，供调试与断言使用。 */
export const THEME_PREFERENCE_ATTRIBUTE = 'data-theme-preference';
/** 跟随系统时用的媒体查询：与 `theme-boot.js` 逐字一致。 */
export const DARK_QUERY = '(prefers-color-scheme: dark)';

/** 浅色下的浏览器界面色（品牌紫）与深色下的（纸面深靛）。 */
export const THEME_COLOR_LIGHT = '#6d28d9';
export const THEME_COLOR_DARK = '#14101f';

const PREFERENCES: readonly ThemePreference[] = ['light', 'dark', 'system'];

export function isThemePreference(value: unknown): value is ThemePreference {
  return typeof value === 'string' && (PREFERENCES as readonly string[]).includes(value);
}

/**
 * 读本机偏好。
 *
 * 三种情况都退到 `system`：存储被禁用（隐私模式）、键不存在、值是本站不认识的东西
 * （例如以后改过键名而旧值还在）。**不认识的值不猜**：猜错会让用户看到自己没选过的外观。
 */
export function readThemePreference(storage?: Pick<Storage, 'getItem'> | null): ThemePreference {
  try {
    const store = storage ?? (typeof window !== 'undefined' ? window.localStorage : null);
    const raw = store?.getItem(THEME_PREFERENCE_KEY) ?? null;
    return isThemePreference(raw) ? raw : 'system';
  } catch {
    return 'system';
  }
}

/** 写本机偏好；存储不可用时静默失败（本次会话仍然按新偏好显示）。 */
export function writeThemePreference(
  preference: ThemePreference,
  storage?: Pick<Storage, 'setItem'> | null,
): void {
  try {
    const store = storage ?? (typeof window !== 'undefined' ? window.localStorage : null);
    store?.setItem(THEME_PREFERENCE_KEY, preference);
  } catch {
    /* 浏览器禁用存储：偏好只在本次会话有效，不报错。 */
  }
}

/** 系统是否偏好深色；拿不到 `matchMedia`（老浏览器）时按浅色处理。 */
export function systemPrefersDark(matchMedia?: ((query: string) => MediaQueryList) | null): boolean {
  try {
    const impl = matchMedia ?? (typeof window !== 'undefined' ? window.matchMedia.bind(window) : null);
    return Boolean(impl?.(DARK_QUERY).matches);
  } catch {
    return false;
  }
}

/** 由「偏好 + 系统当前状态」解析出实际外观。纯函数，测试直接喂参数。 */
export function resolveTheme(preference: ThemePreference, prefersDark: boolean): ResolvedTheme {
  if (preference === 'system') return prefersDark ? 'dark' : 'light';
  return preference;
}

/** 与解析结果配套的浏览器界面色。 */
export function themeColorOf(resolved: ResolvedTheme): string {
  return resolved === 'dark' ? THEME_COLOR_DARK : THEME_COLOR_LIGHT;
}

/**
 * 把解析结果写到根元素与 `theme-color`。
 *
 * `theme-color` 只在浅色下用品牌紫、深色下用纸面深靛：它染的是移动端地址栏那一圈，
 * 深色下用紫色会与页面之间割出一条亮线。写不进去（没有这个 meta）就跳过。
 */
export function applyTheme(resolved: ResolvedTheme, preference: ThemePreference, root?: HTMLElement | null): void {
  const element = root ?? (typeof document !== 'undefined' ? document.documentElement : null);
  if (!element) return;
  element.setAttribute(THEME_ATTRIBUTE, resolved);
  element.setAttribute(THEME_PREFERENCE_ATTRIBUTE, preference);
  if (typeof document === 'undefined') return;
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', themeColorOf(resolved));
}
