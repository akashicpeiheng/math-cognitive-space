import type { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../auth';

/**
 * 个人页面的轻量守卫（2026-10 加）。
 *
 * ## 它守什么、不守什么
 *
 * 只包住「纯个人」的两页：`/profile`（我的学习）与 `/plan`（学习路线）——
 * 它们的内容全部来自账号下的学习档案，没登录时页面上一个真数据都没有，
 * 与其让每个请求各自 401、把失败画成空列表，不如在入口说清楚。
 *
 * **不包**公共页面：本体、知识网络、对象列表、方法论、介绍都不需要登录；
 * 公网模式下服务端对它们的策略本来就是 `public`。
 *
 * ## 本机模式直接放行
 *
 * `mode === 'local'` 时 `user` 恒为 `null`，但本机模式**没有登录这回事**，
 * 所以这里必须放行原页面，而不是显示「请先登录」——那正是这一层最容易犯的错。
 *
 * ## 加载中不闪门禁
 *
 * 会话还没回来时不画「请先登录」，也不画原页面：画后者会让未登录者的页面
 * 先请求一轮个人数据（必然 401），画前者会让已登录的人看到一闪而过的登录提示。
 */
export function AuthGuard({ children }: { children: ReactNode }) {
  const auth = useAuth();
  const location = useLocation();

  if (auth.mode === 'local') return <>{children}</>;

  if (auth.mode === null) {
    return (
      <div className="page">
        <section className="card">
          <p role="status">正在确认登录状态…</p>
          {auth.error && <p className="error" role="alert">登录状态未知：{auth.error}</p>}
        </section>
      </div>
    );
  }

  if (!auth.user) {
    // 带着当前路径去登录页：验证完把人送回他本来要看的那一页。
    const next = encodeURIComponent(`${location.pathname}${location.search}`);
    return (
      <div className="page">
        <section className="card auth-gate">
          <h1>请先登录</h1>
          <p>
            这一页的内容属于你自己的学习档案（事件、笔记与进度），公网模式下需要登录才能读取，
            也必须登录才能确认是谁在读。公共本体与知识网络不需要登录。
          </p>
          {auth.error && <p className="error" role="alert">{auth.error}</p>}
          <p className="card-actions">
            <Link className="button primary" to={`/login?next=${next}`}>去登录</Link>
            <Link className="button" to="/login?tab=signup">注册账号</Link>
            <Link className="button ghost" to="/nodes">先看公共内容</Link>
          </p>
        </section>
      </div>
    );
  }

  return <>{children}</>;
}
