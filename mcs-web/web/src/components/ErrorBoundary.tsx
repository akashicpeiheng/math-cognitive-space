import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Link } from 'react-router-dom';

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
 */
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
    return (
      <main className="page page-error" role="alert">
        <h1>这一页没能渲染出来</h1>
        <p className="error">{this.state.error.message || String(this.state.error)}</p>
        <p>
          地址栏里的链接可能含无法解析的字符。可以回到首页，或重新加载这一页；
          如果反复出现，请把上面这条信息一并反馈。
        </p>
        <p className="page-error-actions">
          <Link className="button primary" to="/">回到首页</Link>
          <button className="button" onClick={() => window.location.reload()}>重新加载</button>
        </p>
      </main>
    );
  }
}
