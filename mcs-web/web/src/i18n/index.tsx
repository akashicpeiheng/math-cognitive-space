/**
 * 语种的 React 层：一个 Provider + 一个钩子。
 *
 * ## 语种的**唯一真相**是 URL
 *
 * 前缀（`/en`）说了算，localStorage 只是「下次访问根路径时用哪个」的偏好，
 * 不能反过来覆盖显式 URL——否则别人分享的 `/en/nodes/limit:limit-ed` 在中文浏览器里
 * 打开会变成中文页，而链接本身写着英文。因此：
 *
 *   URL（`/en/...`） ＞ 偏好（localStorage） ＞ 默认（中文）
 *
 * 切换语言 = `navigate(withLocale(当前路径, 目标语种))`，不重载页面、不刷新状态。
 *
 * ## 这个 Provider 还负责三件「挂在语种上」的副作用
 *
 * 1. `<html lang>` 与 `<title>`：屏幕阅读器与搜索引擎据此判断语言；
 * 2. `localStorage` 偏好落盘；
 * 3. 通知 `api.ts` 之后的请求带哪个语种（模块级设置，见 `api.ts` 的 `setLocale`）。
 */

import { createContext, useCallback, useContext, useEffect, useMemo } from 'react';
import type { ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { DEFAULT_LOCALE, LOCALE_STORAGE_KEY, LOCALE_TAGS, isLocale, type Locale } from './locales';
import { localeOfPath, switchLocalePath } from './paths';
import { translate, type MessageKey } from './messages';
import { setApiLocale } from '../api';

export interface I18nValue {
  locale: Locale;
  /** 取界面文案；键未登记时返回键名本身，不返回空白。 */
  t: (key: MessageKey) => string;
  /** 从 `{ zh, en }` 这种成对对象里取当前语种那一份（术语表、案例名等）。 */
  pick: <T>(pair: { zh: T; en: T }) => T;
  /** 按语种格式化时间：中文 `2026/10/5 20:11`，英文 `Oct 5, 2026, 8:11 PM`。 */
  fmtDate: (value: string | number | Date | null | undefined, options?: Intl.DateTimeFormatOptions) => string;
  fmtNumber: (value: number) => string;
  /** 切换到目标语种（保留当前路径、查询串与锚点）。 */
  switchTo: (next: Locale) => void;
  /** 站内路径套上当前语种前缀后的地址。 */
  hrefFor: (to: string) => string;
  /** 该文本是否尚未翻译（英文语境下「里面还有中文」= 回落到中文原文）。 */
  isPending: (text: string | null | undefined) => boolean;
}

const I18nContext = createContext<I18nValue | null>(null);

/** 判断一段文本是不是「只有中文」——用于标注尚未翻译的条目。 */
const CJK = /[\u3400-\u4dbf\u4e00-\u9fff]/;

/** 中文兜底：没有 Provider 时（单组件测试）用它。 */
function zhOnly<T>(pair: { zh: T; en: T }): T {
  return pair.zh;
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const locale = localeOfPath(location.pathname);

  useEffect(() => {
    setApiLocale(locale);
    try { window.localStorage.setItem(LOCALE_STORAGE_KEY, locale); } catch { /* 隐私模式下不落盘，本次会话内仍生效 */ }
    if (typeof document !== 'undefined') {
      document.documentElement.lang = LOCALE_TAGS[locale];
      /*
       * 标题与描述按语种改。`web/index.html` 里那份是**静态的默认值**（中文），
       * 英文页面靠这里改写——静态 HTML 没有语种信息（服务端只做 SPA 兜底，
       * 不按路径渲染），所以这只能在客户端做。
       *
       * `document.title` 一起改：分享英文链接时，浏览器标签与历史记录里显示的是英文标题，
       * 而不是「数学认知空间 MCS · 学习与研究一体工作台」。
       */
      document.title = locale === 'en'
        ? 'Mathematical Cognitive Space · a workbench for learning and research'
        : '数学认知空间 MCS · 学习与研究一体工作台';
      const description = document.querySelector('meta[name="description"]');
      if (description) {
        description.setAttribute('content', locale === 'en'
          ? 'MCS: public ontology M, external learner model E and derived results D kept separate; four cross-cutting cases, 36 localization operators and event-order planning.'
          : 'MCS 本机工作台：公共本体 M、外部学习者模型 E 与派生结果 D 分离；四组贯通案例、36 种局部化与事件偏序规划。');
      }
    }
  }, [locale]);

  const switchTo = useCallback((next: Locale) => {
    if (next === locale) return;
    navigate(switchLocalePath(location, next));
  }, [locale, location, navigate]);

  const value = useMemo<I18nValue>(() => {
    const t = (key: MessageKey) => translate(locale, key);
    const fmtDate: I18nValue['fmtDate'] = (input, options) => {
      if (input === null || input === undefined || input === '') return '';
      const date = input instanceof Date ? input : new Date(input);
      if (Number.isNaN(date.getTime())) return String(input);
      return date.toLocaleString(LOCALE_TAGS[locale], options ?? { dateStyle: 'medium', timeStyle: 'short' });
    };
    return {
      locale,
      t,
      pick: (pair) => (pair ? pair[locale] : (undefined as never)),
      fmtDate,
      fmtNumber: (input: number) => new Intl.NumberFormat(LOCALE_TAGS[locale]).format(input),
      switchTo,
      hrefFor: (to: string) => switchLocalePath({ pathname: to }, locale),
      isPending: (text) => locale === 'en' && typeof text === 'string' && text.length > 0 && CJK.test(text),
    };
  }, [locale, switchTo]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

/**
 * 取语种上下文。
 *
 * **不在 Provider 之外抛错**：站点里有一批小的展示组件（`StatusBadge`、
 * `ProgressBar`）在测试里被单独渲染，硬性抛错会让它们全部需要包一层 Provider。
 * 兜底返回中文设置——这正好是「没有 Provider 时」唯一安全的默认值。
 */
export function useI18n(): I18nValue {
  const value = useContext(I18nContext);
  if (value) return value;
  return FALLBACK;
}

const FALLBACK: I18nValue = {
  locale: DEFAULT_LOCALE,
  t: (key) => translate(DEFAULT_LOCALE, key),
  pick: zhOnly,
  fmtDate: (input) => (input === null || input === undefined ? '' : new Date(input).toLocaleString(LOCALE_TAGS.zh)),
  fmtNumber: (input) => new Intl.NumberFormat(LOCALE_TAGS.zh).format(input),
  switchTo: () => {},
  hrefFor: (to: string) => to,
  isPending: () => false,
};

/** 首页等「按当前语种拼链接」的地方用它，避免各处 import `withLocale`。 */
export { localeOfPath, switchLocalePath };

/**
 * 标签工具集的钩子在这里**转发**一次，让 `import { useLabels } from '../i18n'` 这样的写法成立。
 *
 * 实现本体在 `./useLabels`（单独一个文件），原因见那个文件的说明：`web/src/labels.ts`
 * 被纯 Node 测试直接 import，一旦它依赖 React/i18n 目录，那些测试会以
 * `ERR_UNSUPPORTED_DIR_IMPORT` 整体失败。转发不产生第二份实现。
 */
export { useLabels, type Labels } from './useLabels';
