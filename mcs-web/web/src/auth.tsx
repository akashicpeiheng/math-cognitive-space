import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { ApiError, api, formatError, setCsrfToken } from './api';

/**
 * 账号层（2026-10 加，配合 `server/auth.mjs`）。
 *
 * ## 这个模块回答什么
 *
 * 服务有两种模式，前端必须**先问清楚是哪一种**再决定画什么：
 *
 * - **本机模式**（`mode === 'local'`，缺省）：没有账号概念，身份恒为本机管理员，
 *   `user` 恒为 `null`、`csrfToken` 恒为 `null`。界面上不许出现登录入口或门禁；
 * - **公网模式**（`mode === 'supabase'`）：一切个人数据都要登录，写请求还要 CSRF 令牌。
 *
 * 因此这里只做三件事：把 `GET /api/v2/auth/session` 的结果变成 React 状态、
 * 把 `csrfToken` 交给 `api.ts`（写请求自动带 `x-mcs-csrf`）、
 * 暴露登录/注册/找回/确认/退出/改密这几个动作用户能点。
 *
 * ## 三条边界
 *
 * 1. **不猜模式**：模式只来自服务端那一个字段。前端不在客户端猜「是不是公网」——
 *    猜错的后果是给本机工作台加一道登录墙，那是这一层明令禁止的。
 * 2. **失败不等于未登录**：`session` 拿不到时 `error` 有值、`user` 仍未知，
 *    页面要如实说「登录状态未知」，不能把网络失败画成「你没有登录」。
 * 3. **本机模式不发任何认证写请求**：所有动作在 `mode === 'local'` 时直接回一句
 *    「本机模式没有在线账号」，不去打必然 404 的接口。
 */

export type AuthMode = 'local' | 'supabase';

export interface AuthUser {
  id: string;
  email: string | null;
  role: string;
}

/** `GET /api/v2/auth/session` 的 `data`；`emailEnabled` 在本机模式不下发，故可选。 */
export interface AuthSession {
  mode: AuthMode;
  user: AuthUser | null;
  csrfToken: string | null;
  emailEnabled?: boolean;
}

export interface AuthValue {
  /** 服务端说的模式；首帧（bootstrap 未回来前）为 `null`——此时**什么都不画**。 */
  mode: AuthMode | null;
  user: AuthUser | null;
  csrfToken: string | null;
  emailEnabled: boolean;
  /** 首次 session 请求还没回来。 */
  loading: boolean;
  /** 首次 session 请求失败（登录状态未知）；登录动作自身的失败在各页面里显示。 */
  error: string | null;
  /**
   * 「身份已经问过一次了」。
   *
   * `ProfileProvider` 用它决定什么时候才去拉 `/profiles`：在它变 true 之前发请求，
   * 公网模式下必然 401——那个 401 会被显示成「没有档案 + 一句报错」，
   * 而真实原因是「还没问清楚身份」。这次 bootstrap 只做一次请求，
   * 不因此多打任何一个接口（本机模式也照旧只多这一个 GET）。
   */
  ready: boolean;
  /**
   * 身份变了（bootstrap 完成 / 登录 / 退出 / 验证链接）就会 +1。
   *
   * 个人数据（`/profiles`、`/health`）要跟着重拉：退出后不能留着上一个人的档案列表，
   * 登录后也不能继续显示「没有档案」。`ProfileProvider` 把这个数当 effect 的依赖。
   */
  identityKey: number;
  refresh: () => Promise<AuthSession | null>;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string) => Promise<string>;
  recover: (email: string) => Promise<string>;
  confirm: (tokenHash: string, type: 'email' | 'signup' | 'recovery') => Promise<void>;
  /** 退出后返回是否真的退了（`signedOut:true`）。 */
  logout: () => Promise<boolean>;
  /** 改密（服务端要求 10 分钟内登录过）；成功后本地会话会被清掉。 */
  changePassword: (password: string) => Promise<void>;
  /** GitHub 登录：拿到授权地址后由调用方整页跳转。 */
  startGithub: () => Promise<void>;
}

const AuthContext = createContext<AuthValue | null>(null);

/** 密码长度契约：与 `server/auth.mjs` 的 `password()` 一致（12–128）。 */
export const PASSWORD_MIN = 12;
export const PASSWORD_MAX = 128;

/**
 * 密码的人话校验，前端先判一次。
 *
 * 数字与 `server/auth.mjs` 的 `password()` 逐字对齐：这里放行的，服务端一定放行；
 * 这里拦下的，服务端也会拦（提示更早、更好读）。**不重复实现**任何别的规则
 * （强度、字符类别）——服务端没有的规则前端不许自己发明。
 */
export function passwordProblem(password: string): string | null {
  if (password.length < PASSWORD_MIN) return `密码至少 ${PASSWORD_MIN} 个字符（当前 ${password.length} 个）。`;
  if (password.length > PASSWORD_MAX) return `密码最多 ${PASSWORD_MAX} 个字符（当前 ${password.length} 个）。`;
  return null;
}

/**
 * 常见错误码的中文可操作提示（TODO 要求的那张表）。
 *
 * 服务端已经给了中文 `message`，这里的价值在于**加一句「接下来做什么」**：
 * `CSRF_REJECTED` 要刷新页面，`RATE_LIMITED` 要等一会儿，`AUTH_UNAVAILABLE` 要看配置。
 * 不认识的码退回服务端原话 + 错误码，不编造原因。
 */
const CODE_ADVICE: Record<string, string> = {
  AUTH_REQUIRED: '请先登录。',
  AUTH_REJECTED: '邮箱或密码不对；若这是验证链接，它可能已失效或已被用过。',
  FORBIDDEN: '当前账号没有权限做这件事（登录也没用，需要管理员）。',
  CSRF_REJECTED: '页面状态已过期，请刷新页面后重试。',
  RATE_LIMITED: '操作过于频繁，请稍等一分钟再试。',
  RESOURCE_EXHAUSTED: '服务繁忙，请稍后重试。',
  AUTH_UNAVAILABLE: '登录服务暂时不可用；若站点未配置邮箱服务，注册与找回密码也用不了。',
  BAD_REQUEST: '填写的内容不符合要求，请检查邮箱格式与密码长度。',
  NOT_FOUND: '这个接口在本机上不存在；本机模式没有在线账号。',
};

/** 把任意异常变成一句中文提示：错误码的建议在前，服务端原话在后。 */
export function authErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    const advice = CODE_ADVICE[error.code];
    const raw = error.message && error.message !== advice ? `（服务端：${error.message}）` : '';
    if (advice) return advice + raw;
    return `${error.message}${error.code ? `（${error.code}）` : ''}`;
  }
  if (error instanceof TypeError) return '请求没有到达服务器：请检查网络连接后重试。';
  return formatError(error);
}

interface AuthProviderProps {
  children: ReactNode;
  /**
   * 登录/退出后要刷新的「档案上下文」（`useProfileContext().refreshProfiles`）。
   *
   * 用参数传而不是在 Provider 内部 `useProfileContext()`：档案上下文是**子**组件，
   * 从里面读方向是反的。这样 `AuthProvider` 与 `ProfileProvider` 的嵌套顺序
   * 也不必被这个调用绑死。失败必须吞掉并如实记在 `error` 里——登录成功了
   * 但档案没拉到，不等于登录失败。
   */
  onIdentityChanged?: () => Promise<void>;
}

export function AuthProvider({ children, onIdentityChanged }: AuthProviderProps) {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  /**
   * 身份版本号：bootstrap 落地、登录、退出、验证、改密各 +1。
   *
   * 为什么不直接用 `session` 对象当依赖：`refresh()` 每次返回的都是**新对象**，
   * 以它为依赖会让「重拉档案」在每次刷新会话时都触发一轮，而退出登录这类
   * 必然伴随会话变化的情形也说不清到底该不该重拉。一个只增的整数把「身份变了」
   * 这一件事说清楚，也顺便让 ProfileProvider 不必理解账号层的内部结构。
   */
  const [identityKey, setIdentityKey] = useState(0);

  /*
   * 回调放进 ref：登录/退出用到的永远是最新那一版，而 `login` 之类的函数
   * 可以在不重建的情况下保持稳定（重建会让依赖它们的页面 effect 反复触发）。
   */
  const identityChanged = useRef(onIdentityChanged);
  identityChanged.current = onIdentityChanged;

  const apply = useCallback((next: AuthSession) => {
    setCsrfToken(next.csrfToken ?? null);
    setSession({ mode: next.mode, user: next.user ?? null, csrfToken: next.csrfToken ?? null, emailEnabled: next.emailEnabled !== false });
    setIdentityKey((value) => value + 1);
    return next;
  }, []);

  const refresh = useCallback(async () => {
    try {
      const next = apply(await api<AuthSession>('/auth/session'));
      setError(null);
      return next;
    } catch (reason) {
      /*
       * 拿不到就如实说「登录状态未知」：`setCsrfToken(null)` 让写请求退回
       * 「不带令牌」的旧行为，而不是带着一个可能已过期的令牌去撞 403。
       */
      setCsrfToken(null);
      setError(authErrorMessage(reason));
      return null;
    } finally {
      setLoading(false);
    }
  }, [apply]);

  useEffect(() => { refresh().catch(() => {}); }, [refresh]);

  /** 认证成功后统一收尾：重新取会话、刷新档案、把失败记成一句话。 */
  const afterAuthChange = useCallback(async () => {
    await refresh();
    if (!identityChanged.current) return;
    try {
      await identityChanged.current();
    } catch (reason) {
      setError(`账号已变更，但学习者档案没能重新加载：${authErrorMessage(reason)}`);
    }
  }, [refresh]);

  const login = useCallback(async (email: string, password: string) => {
    if (session?.mode === 'local') throw new Error('本机模式没有在线账号。');
    await api<{ signedIn: boolean }>('/auth/login', { method: 'POST', body: { email, password } });
    await afterAuthChange();
  }, [session?.mode, afterAuthChange]);

  const signup = useCallback(async (email: string, password: string) => {
    if (session?.mode === 'local') throw new Error('本机模式没有在线账号。');
    const result = await api<{ message: string }>('/auth/signup', { method: 'POST', body: { email, password } });
    return result?.message ?? '注册信息已提交，请查收验证邮件。';
  }, [session?.mode]);

  const recover = useCallback(async (email: string) => {
    if (session?.mode === 'local') throw new Error('本机模式没有在线账号。');
    const result = await api<{ message: string }>('/auth/recover', { method: 'POST', body: { email } });
    return result?.message ?? '若该邮箱可用，重置邮件已发出。';
  }, [session?.mode]);

  const confirm = useCallback(async (tokenHash: string, type: 'email' | 'signup' | 'recovery') => {
    if (session?.mode === 'local') throw new Error('本机模式没有在线账号。');
    await api<{ signedIn: boolean }>('/auth/confirm', { method: 'POST', body: { tokenHash, type } });
    await afterAuthChange();
  }, [session?.mode, afterAuthChange]);

  const logout = useCallback(async () => {
    if (session?.mode === 'local') return false;
    const result = await api<{ signedOut: boolean }>('/auth/logout', { method: 'POST', body: {} });
    await afterAuthChange();
    return result?.signedOut === true;
  }, [session?.mode, afterAuthChange]);

  const changePassword = useCallback(async (password: string) => {
    if (session?.mode === 'local') throw new Error('本机模式没有在线账号。');
    /*
     * 服务端在改密后会删掉本地会话并清 Cookie（`server/auth.mjs` 的 `logout || password`
     * 分支），所以这里必须把本地状态一起降下来，否则界面会显示「已登录」而每个请求都 401。
     */
    await api<{ signedOut: boolean }>('/auth/password', { method: 'POST', body: { password } });
    await afterAuthChange();
  }, [session?.mode, afterAuthChange]);

  const startGithub = useCallback(async () => {
    if (session?.mode === 'local') throw new Error('本机模式没有在线账号。');
    const result = await api<{ url: string }>('/auth/github', { method: 'POST', body: {} });
    if (!result?.url) throw new Error('登录服务没有返回授权地址。');
    // 整页跳转：OAuth 授权页在别的源上，不能在 iframe 或 fetch 里完成。
    window.location.assign(result.url);
  }, [session?.mode]);

  const value = useMemo<AuthValue>(() => ({
    mode: session?.mode ?? null,
    user: session?.user ?? null,
    csrfToken: session?.csrfToken ?? null,
    // 本机模式不下发这个字段：默认 true 只是占位，本机模式下没有任何邮箱入口会用到它。
    emailEnabled: session?.emailEnabled !== false,
    loading,
    error,
    ready: !loading,
    identityKey,
    refresh,
    login,
    signup,
    recover,
    confirm,
    logout,
    changePassword,
    startGithub,
  }), [session, loading, error, identityKey, refresh, login, signup, recover, confirm, logout, changePassword, startGithub]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * 读账号状态。
 *
 * 没有 Provider 时返回一份**本机模式的空实现**而不是抛错：这一层的调用点
 * （页头、守卫、登录页）分散在整棵树上，一个漏挂 Provider 的渲染路径
 * 不该把整页炸掉——那会让「本机模式一切照旧」这条约束失效。此时 `mode` 是 `null`
 * 而不是 `'local'`：真正决定画不画登录入口的仍是服务端那一次回答。
 */
export function useAuth(): AuthValue {
  const value = useContext(AuthContext);
  return value ?? FALLBACK;
}

const noop = async () => {};
const FALLBACK: AuthValue = {
  mode: null,
  user: null,
  csrfToken: null,
  emailEnabled: true,
  loading: false,
  error: null,
  ready: false,
  identityKey: 0,
  refresh: async () => null,
  login: noop,
  signup: async () => '',
  recover: async () => '',
  confirm: noop,
  logout: async () => false,
  changePassword: noop,
  startGithub: noop,
};
