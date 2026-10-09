/**
 * 语种契约：**唯一**的语种清单与归一化入口。
 *
 * 为什么单独一个文件而不是散在各处：语种出现在四个地方——URL 前缀（`/en/…`）、
 * API 的 `locale` 参数、`data/i18n/<locale>/` 目录名、前端 localStorage。四处各写一遍
 * 字面量，改一处漏三处时**不会有任何报错**（`/en` 走了 `/zh` 的数据是静默的）。
 *
 * 中文是**源语言**：`zh` 直接读基础数据，不开覆盖目录，因此它的哈希与从前逐字相同。
 */

export const DEFAULT_LOCALE = 'zh';

/** 支持的语种。顺序即切换按键的显示顺序（中文在前）。 */
export const LOCALES = Object.freeze(['zh', 'en']);

export const LOCALE_LABELS = Object.freeze({
  zh: '中文',
  en: 'English',
});

/** 切换按键上的两三个字母（窄屏用）。 */
export const LOCALE_SHORT = Object.freeze({ zh: '中', en: 'EN' });

/** BCP-47 标签：写进 `<html lang>`、`Intl` 与 `toLocaleString`。 */
export const LOCALE_TAGS = Object.freeze({ zh: 'zh-CN', en: 'en' });

/**
 * 归一化：只认登记过的语种，其余一律回落到默认语种。
 *
 * 未知值不猜测、不静默改语义——`?locale=fr` 得到中文，并在响应里如实带回 `zh`
 * （与 README「未知取值不静默改语义」的既有约定一致：这里改的是**语言**，
 * 落回默认语言是唯一安全的选择，但不能假装它就是请求的那一个）。
 */
export function normalizeLocale(value, fallback = DEFAULT_LOCALE) {
  if (typeof value !== 'string') return fallback;
  const trimmed = value.trim().toLowerCase();
  if (!trimmed) return fallback;
  if (LOCALES.includes(trimmed)) return trimmed;
  /* `en-US`、`zh_Hans_CN` 这类带地区的写法按前缀识别。 */
  const base = trimmed.split(/[-_]/)[0];
  return LOCALES.includes(base) ? base : fallback;
}

export function isLocale(value) {
  return LOCALES.includes(value);
}

/** 该语种是否由覆盖目录提供译文（中文是源语言，没有覆盖目录）。 */
export function localeNeedsOverlay(locale) {
  return normalizeLocale(locale) !== DEFAULT_LOCALE;
}
