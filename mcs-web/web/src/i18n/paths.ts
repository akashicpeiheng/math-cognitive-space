/**
 * 路径与语种的关系：`/en/...` 是英文，其余是中文。
 *
 * ## 一处规则，其余全部走函数
 *
 * 「加前缀」这件事看起来简单，但站内跳转有四种写法（`NavLink to=`、`Link to=`、
 * `navigate()`、拼在字符串里的 `href`），漏掉任何一处，英文页面里就会出现一个
 * 跳回中文页面的链接。因此所有跳转都经过 `withLocale()`，不在组件里手写 `/en`。
 *
 * 前缀只加**一次**：`withLocale('/en/nodes', 'en')` 不会再变成 `/en/en/nodes`。
 */

import { DEFAULT_LOCALE, LOCALE_PREFIX, type Locale } from './locales';

/** 从路径里读语种。`/en`、`/en/…` 是英文，其余（含 `/`）是中文。 */
export function localeOfPath(pathname: string): Locale {
  return pathname === '/en' || pathname.startsWith('/en/') ? 'en' : DEFAULT_LOCALE;
}

/** 去掉语种前缀，得到「站内路径」。 */
export function stripLocale(pathname: string): string {
  if (pathname === '/en') return '/';
  if (pathname.startsWith('/en/')) return pathname.slice(LOCALE_PREFIX.en.length);
  return pathname || '/';
}

/**
 * 给站内路径套上目标语种的前缀。
 *
 * 外部链接（`http…`、`mailto:`、`#锚点`）与空值原样返回：给它们拼前缀会造出
 * `https://…` → `/enhttps://…` 这种坏链接。
 */
export function withLocale(to: string, locale: Locale): string {
  if (!to) return locale === 'en' ? '/en' : '/';
  if (/^([a-z][a-z0-9+.-]*:|\/\/|#)/i.test(to)) return to;
  const index = to.search(/[?#]/);
  const path = index === -1 ? to : to.slice(0, index);
  const tail = index === -1 ? '' : to.slice(index);
  const bare = stripLocale(path.startsWith('/') ? path : `/${path}`);
  const normalized = bare === '/' ? '' : bare;
  return `${LOCALE_PREFIX[locale]}${normalized}${tail}` || '/';
}

/** 当前路径换成另一种语种：保留查询串与锚点（分享出去的筛选条件不该在换语言时丢）。 */
export function switchLocalePath(location: { pathname: string; search?: string; hash?: string }, next: Locale): string {
  return withLocale(`${stripLocale(location.pathname)}${location.search ?? ''}${location.hash ?? ''}`, next);
}

/** 站内语言切换的目标语种。 */
export function otherLocale(locale: Locale): Locale {
  return locale === 'en' ? 'zh' : 'en';
}
