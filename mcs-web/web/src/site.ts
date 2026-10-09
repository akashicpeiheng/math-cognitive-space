/**
 * 站点署名信息。
 *
 * 作者与联系邮箱在首屏、侧栏、页脚三处出现，只在这里写一份，
 * 避免改邮箱时漏掉某一处。`web/index.html` 的 <meta name="author"> 与之对应，
 * 那处是静态 HTML，改这里时也要一起改。
 *
 * 中英双语（2026-10）：`SITE` **保持中文那份、逐字不动**——它是既有调用点与测试
 * 比对的那一份；英文站取 `SITE_EN`（或 `siteFor(locale)`）。邮箱与人名是事实，
 * 邮箱两侧完全相同，人名保留「沛恒 / Peiheng」两种写法（英文站上写得出、
 * 也仍然认得是谁）。站点名与标语在英文站上走 `messages.ts` 的
 * `site.name` / `site.tagline`，这里给英文版是为了给不经过文案表的调用点兜底。
 */

import type { Locale } from './i18n/locales';

export const SITE = {
  name: '数学认知空间 MCS',
  author: '沛恒',
  email: 'peihengmath@gmail.com',
  mailto: 'mailto:peihengmath@gmail.com',
} as const;

/** 英文站的署名：邮箱与 `SITE` 相同（不翻译），人名给出两种写法。 */
export const SITE_EN = {
  name: 'Mathematical Cognitive Space (MCS)',
  author: '沛恒 / Peiheng',
  email: 'peihengmath@gmail.com',
  mailto: 'mailto:peihengmath@gmail.com',
} as const;

/** 成对的两份署名：组件里 `useI18n().pick(SITE_BY_LOCALE)`。 */
export const SITE_BY_LOCALE: { zh: typeof SITE; en: typeof SITE_EN } = { zh: SITE, en: SITE_EN };

/** 取当前语种的署名；未知语种回落中文那份。 */
export function siteFor(locale: Locale): typeof SITE | typeof SITE_EN {
  return locale === 'en' ? SITE_EN : SITE;
}
