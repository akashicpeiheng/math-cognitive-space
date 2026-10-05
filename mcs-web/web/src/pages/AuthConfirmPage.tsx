import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { authErrorMessage, useAuth } from '../auth';
import { LocalModeNotice } from './LoginPage';

/**
 * 邮箱验证链接的落点（`/auth/confirm`）。
 *
 * ## 字段名在这里换了一次
 *
 * 邮件里的链接由认证服务生成，查询参数是 `token_hash` 与 `type`（下划线风格）；
 * 而 `POST /api/v2/auth/confirm` 的请求体字段是 `tokenHash`（驼峰）。
 * 这一处转换就在这个页面里，别处不再各自拼一遍。
 *
 * ## 只发一次请求
 *
 * 验证令牌是一次性的：同一个 token 提交两次，第二次必然失败。而 React 的
 * `StrictMode`（`main.tsx` 里开着）会在开发模式下把 effect 跑两遍，
 * 因此这里用一个 ref 把「已经发起过」记下来。
 *
 * ## 失败要给出路
 *
 * 链接过期、已被用过、邮箱服务不可用——这些都不是用户能重试掉的，
 * 因此失败时除了如实说明原因，还要给「重新登录」与「回首页」两个入口，
 * 而不是留一个只能刷新的死页面。
 */

type ConfirmType = 'email' | 'signup' | 'recovery';

const CONFIRM_TYPES: ConfirmType[] = ['email', 'signup', 'recovery'];
const TYPE_LABEL: Record<ConfirmType, string> = {
  signup: '注册验证',
  recovery: '重置密码',
  email: '邮箱变更验证',
};

function readType(value: string | null): ConfirmType | null {
  if (!value) return null;
  return (CONFIRM_TYPES as string[]).includes(value) ? (value as ConfirmType) : null;
}

/** `token_hash` 的形状：与 `server/auth.mjs` 的校验一致（20–256 位 URL 安全字符）。 */
const TOKEN_SHAPE = /^[a-zA-Z0-9_-]{20,256}$/;

export function AuthConfirmPage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const tokenHash = params.get('token_hash');
  const rawType = params.get('type');
  const type = readType(rawType);
  const [state, setState] = useState<'pending' | 'done' | 'failed'>('pending');
  const [reason, setReason] = useState<string | null>(null);
  const [missing, setMissing] = useState<string | null>(null);
  const fired = useRef(false);
  const alive = useRef(true);

  useEffect(() => () => { alive.current = false; }, []);

  /*
   * 等 `mode` 落地再动手：本机模式没有这个接口，提前发请求只会得到 404，
   * 而那会被显示成「验证失败」——把「这里不适用」说成「你的链接坏了」。
   */
  useEffect(() => {
    if (auth.mode === null) return;
    if (auth.mode === 'local') return;
    if (fired.current) return;
    if (!tokenHash) { setMissing('链接里没有 token_hash 参数。'); setState('failed'); return; }
    if (!TOKEN_SHAPE.test(tokenHash)) { setMissing('链接里的 token_hash 形状不对，可能是复制时被截断了。'); setState('failed'); return; }
    if (!type) {
      setMissing(rawType
        ? `链接里的 type 取值无法识别：${rawType}（应为 email / signup / recovery）。`
        : '链接里没有 type 参数。');
      setState('failed');
      return;
    }
    fired.current = true;
    setState('pending');
    auth.confirm(tokenHash, type).then(
      () => { if (alive.current) { setState('done'); navigate('/profile', { replace: true }); } },
      (error) => { if (alive.current) { setState('failed'); setReason(authErrorMessage(error)); } },
    );
    // confirm 的身份在 auth 里是稳定的 ref 语义；这里只按模式与参数触发一次。
  }, [auth.mode, auth.confirm, tokenHash, type, rawType, navigate]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="page auth-page">
      <div className="section-heading">
        <p className="eyebrow">账号</p>
        <h1>邮箱验证</h1>
        {type && auth.mode === 'supabase' && <p className="lede">验证用途：{TYPE_LABEL[type]}。</p>}
      </div>

      {auth.mode === 'local' && <LocalModeNotice />}

      {auth.mode === null && (
        <section className="card">
          <p className="hint" role="status">正在确认登录状态…</p>
          {auth.error && <p className="error" role="alert">登录状态未知：{auth.error}</p>}
        </section>
      )}

      {auth.mode === 'supabase' && state === 'pending' && (
        <section className="card">
          <p role="status" aria-live="polite">正在验证这个链接…</p>
          <p className="hint">验证链接是一次性的；请不要在这个页面刷新后重复提交同一个链接。</p>
        </section>
      )}

      {auth.mode === 'supabase' && state === 'done' && (
        <section className="card">
          <p className="notice" role="status" aria-live="polite">已验证并登录，正在前往「我的学习」。</p>
          <p className="card-actions"><Link className="button" to="/profile">现在就去</Link></p>
        </section>
      )}

      {auth.mode === 'supabase' && state === 'failed' && (
        <section className="card">
          <h2>这个链接没能用上</h2>
          <p className="error" role="alert" aria-live="assertive">{missing ?? reason ?? '验证失败。'}</p>
          <p className="hint">
            常见原因：链接已过期、已经被用过一次，或者页面状态（CSRF 令牌）已失效——
            最后一种刷新页面重试往往就好。若都不成立，请重新登录，或再发一次验证邮件。
          </p>
          <p className="card-actions">
            <Link className="button primary" to="/login">重新登录</Link>
            <Link className="button ghost" to="/">回首页</Link>
          </p>
        </section>
      )}
    </div>
  );
}
