import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { localeOfPath } from '../i18n/paths';
import type { Locale } from '../i18n/locales';

/**
 * 页面级错误边界（2026-10 发布前加）。
 *
 * ## 为什么必须有
 *
 * 从前全站没有错误边界：任何一处渲染期异常（例如深链里的裸 `%` 让
 * `decodeURIComponent` 抛 `URIError`）都会让 React 卸载整棵树，用户看到的是
 * **纯白页**——没有提示、没有返回入口，看起来就是「网站挂了」。
 *
 * 这里做三件事：接住异常、把可读的原因显示出来、给出两条明确的退路
 * （回首页 / 重新加载）。它不是"兜住就完事"：错误照旧打到控制台，
 * 页面也如实说明这是渲染失败，不假装内容不存在。
 *
 * ## 语种（2026-10 中英双语）
 *
 * 这一层**挂在 `I18nProvider` 之外**（见 `App.tsx`：边界要能接住 Provider 自己的异常，
 * 所以只能在它外面），因此拿不到 `useI18n()` 的上下文——那不是遗漏，是刻意：
 * 若把边界挪进 Provider，"Provider 抛错"就没人接。
 *
 * 兜底文案于是按手册 §1 的同一份规则处理：成对写、按**当前 URL 前缀**取语种
 * （语种的唯一真相是 URL，`localeOfPath` 与 Provider 用的是同一个函数），
 * 中文那份逐字不变。
 */
interface BoundaryText {
  title: string;
  hint: string;
  home: string;
  reload: string;
}

const BOUNDARY_TEXT: Record<Locale, BoundaryText> = {
  zh: {
    title: '这一页没能渲染出来',
    hint: '地址栏里的链接可能含无法解析的字符。可以回到首页，或重新加载这一页；如果反复出现，请把上面这条信息一并反馈。',
    home: '回到首页',
    reload: '重新加载',
  },
  en: {
    title: 'This page failed to render',
    hint: 'The link in the address bar may contain characters that cannot be parsed. You can go back to the home page, or reload this page; if it keeps happening, please report the message above along with it.',
    home: 'Back to home',
    reload: 'Reload',
  },
};

/**
 * 兜底界面（函数组件，只为用上路由与语种判断）。
 *
 * 语种从 `window.location.pathname` 读：这一层在 Provider 之外，只能读 URL，
 * 而那正是全站语种的唯一真相（见 `i18n/index.tsx` 的文件头说明）。
 */
function ErrorFallback({ error }: { error: Error }) {
  const locale = localeOfPath(window.location.pathname);
  const text = BOUNDARY_TEXT[locale];
  return (
    <main className="page page-error" role="alert">
      <h1>{text.title}</h1>
      <p className="error">{error.message || String(error)}</p>
      <p>{text.hint}</p>
      <p className="page-error-actions">
        {/* 回首页也要落在**当前语种**下：英文站在 `/en`，中文站在根路径（`hrefFor` 属 Provider，
            这一层在 Provider 之外，所以用同一个 `withLocale` 规则手工套前缀）。 */}
        <Link className="button primary" to={locale === 'en' ? '/en' : '/'}>{text.home}</Link>
        <button className="button" onClick={() => window.location.reload()}>{text.reload}</button>
      </p>
    </main>
  );
}

export class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state: { error: Error | null } = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // 保留原始堆栈：这一层只负责别让用户面对白屏，不负责掩盖问题。
    console.error('[mcs-web] 页面渲染失败', error, info?.componentStack ?? '');
  }

  render() {
    if (!this.state.error) return this.props.children;
    return <ErrorFallback error={this.state.error} />;
  }
}
