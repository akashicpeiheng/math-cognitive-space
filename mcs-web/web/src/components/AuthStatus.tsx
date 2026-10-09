import { useState } from 'react';
import { Link } from 'react-router-dom';
import { authErrorMessage, useAuth } from '../auth';
import { useI18n } from '../i18n';
import { useProfileContext } from '../state';

/**
 * 页头的账号状态（2026-10 加）。
 *
 * **本机模式一个字符都不画**：`mode !== 'supabase'` 时直接返回 `null`，
 * 连一个空 `<span>` 都不留（见 `Layout.tsx` 的挂载点与验收说明）。
 * `mode` 在首次 session 请求回来前是 `null`，因此本地模式下页头永远保持原样。
 *
 * 公网模式下这里只有两种样子：未登录时给一个「登录」链接，
 * 已登录时给邮箱与「退出」。不做下拉菜单——两个动作不值得一层菜单，
 * 而多一层菜单就多一次「点开了但不知道点哪」。
 *
 * 双语（2026-10）：文案成对写在本文件；邮箱上的 `title` 也随语种。
 */

const COPY = {
  zh: {
    adminSuffix: '（管理员）',
    adminBadge: '管理员',
    signingOut: '退出中…',
    signOut: '退出',
    signIn: '登录',
  },
  en: {
    adminSuffix: ' (admin)',
    adminBadge: 'Admin',
    signingOut: 'Signing out…',
    signOut: 'Sign out',
    signIn: 'Sign in',
  },
} as const;

export function AuthStatus() {
  const auth = useAuth();
  const { refreshProfiles } = useProfileContext();
  const { locale, hrefFor } = useI18n();
  const text = COPY[locale];
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  // 本机模式与「模式未知」都在这里止步：不渲染任何东西。
  if (auth.mode !== 'supabase') return null;

  async function signOut() {
    setBusy(true);
    setProblem(null);
    try {
      await auth.logout();
      try { await refreshProfiles(); } catch { /* 退出后档案拉不到是预期内的：401 由守卫处理。 */ }
    } catch (error) {
      setProblem(authErrorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  const email = auth.user && typeof auth.user.email === 'string' && auth.user.email ? auth.user.email : null;

  return (
    <div className="auth-status-bar">
      {email ? (
        <>
          {/*
            邮箱可能很长：`title` 给出全文，鼠标悬停能看到；可见部分由 CSS 截断，
            避免它把页头挤成两行。
          */}
          <span className="auth-email" title={`${email}${auth.user?.role === 'admin' ? text.adminSuffix : ''}`}>
            {email}
          </span>
          {auth.user?.role === 'admin' && <span className="badge badge-neutral">{text.adminBadge}</span>}
          <button type="button" className="button small" onClick={signOut} disabled={busy}>
            {busy ? text.signingOut : text.signOut}
          </button>
        </>
      ) : (
        <Link className="button small" to={hrefFor('/login')}>{text.signIn}</Link>
      )}
      {/*
        失败原样说出来，不静默：退出失败意味着会话仍然有效，
        此时把按钮恢复原样、给一句原因，比假装已退出安全得多。
      */}
      {problem && <span className="error auth-status-error" role="alert">{problem}</span>}
    </div>
  );
}
