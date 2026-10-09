/**
 * 前端的语种常量：与 `shared/locales.mjs` **同名同义**。
 *
 * 为什么不直接 import 后端那份 `.mjs`：前端 tsconfig 只 include 了 `src` 与
 * `../shared/types.d.ts`，`web/src` 里引 `.mjs` 会同时绕开类型检查与打包器的
 * 依赖图约定（`vite` 能处理，但 `tsc --noEmit` 会把 `.mjs` 当成无类型模块）。
 * 因此这里保留一份**只有常量**的副本，并且由 `tests/i18n-core.test.mjs` 的
 * 「语种清单两处一致」断言钉住——手工同步必须有东西看着，否则一定会漂。
 */

export type Locale = 'zh' | 'en';

export const LOCALES: readonly Locale[] = ['zh', 'en'];
export const DEFAULT_LOCALE: Locale = 'zh';

/** 切换按键上的文字。中文用「中文」，英文用 `EN`（两三个字符，窄屏也放得下）。 */
export const LOCALE_LABELS: Record<Locale, string> = { zh: '中文', en: 'EN' };

/** 切换按键的完整说法（屏幕阅读器与 title 用）。 */
export const LOCALE_TITLES: Record<Locale, string> = {
  zh: '切换到中文（Switch to Chinese）',
  en: 'Switch to English（切换到英文）',
};

/** BCP-47 标签：写进 `<html lang>` 与 `Intl`/`toLocaleString`。 */
export const LOCALE_TAGS: Record<Locale, string> = { zh: 'zh-CN', en: 'en' };

/** URL 前缀：中文在根路径，英文在 `/en`。 */
export const LOCALE_PREFIX: Record<Locale, string> = { zh: '', en: '/en' };

export const LOCALE_STORAGE_KEY = 'mcs-locale-v1';

export function isLocale(value: unknown): value is Locale {
  return value === 'zh' || value === 'en';
}

export function normalizeLocale(value: unknown, fallback: Locale = DEFAULT_LOCALE): Locale {
  if (typeof value !== 'string') return fallback;
  const trimmed = value.trim().toLowerCase();
  if (!trimmed) return fallback;
  if (isLocale(trimmed)) return trimmed;
  const base = trimmed.split(/[-_]/)[0];
  return isLocale(base) ? base : fallback;
}
