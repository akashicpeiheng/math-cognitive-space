import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { authErrorMessage, passwordProblem, useAuth } from '../auth';
import { useI18n } from '../i18n';

/**
 * 登录页（`/login`）。
 *
 * ## 它要同时照顾两种模式
 *
 * 同一个路由在两种模式下都在注册表里，但**画出来的东西不同**：
 *
 * - **本机模式**（`mode === 'local'`）：这里没有账号，页面只说明这件事并给回首页的链接，
 *   一个输入框都不画——本机工作台不该出现登录墙，连"样子"也不该出现；
 * - **公网模式**：GitHub、邮箱密码登录、注册、忘记密码四件事在同一页里，用三个标签切换。
 *
 * ## 两条产品判断
 *
 * 1. **密码长度在前端先说**：服务端的契约是 12–128 个字符（`server/auth.mjs` 的
 *    `password()`）。等用户按了提交才被 400 弹回来，是把服务的规则藏起来；
 *    这里用同一组常量（`PASSWORD_MIN` / `PASSWORD_MAX`）在输入时就提示。
 * 2. **邮箱功能没开通时先说明**：`emailEnabled === false` 时注册与找回密码
 *    一定 503，不能在用户填完表单后才报错——那时他已经在等邮件了。
 *
 * 可访问性：标签与输入框用 `htmlFor`/`id` 配对；状态区是 `aria-live="polite"`，
 * 出错时 `role="alert"`；整页只用一个 `<form>` 提交，回车与空格都能走完流程。
 *
 * 中英双语（2026-10）：本页文案走下面这张成对表。**认证层下发的句子仍是中文**
 * （`authErrorMessage`、服务端返回的提示），英文语境用 `isPending()` 标注「尚未翻译」，
 * 不自己编英文假装已翻译。
 */
type Tab = 'login' | 'signup' | 'recover';

interface AuthText {
  eyebrow: string;
  pageTitle: string;
  localTitle: string;
  localBodyPrefix: string;
  localBodyStrong: string;
  localBodySuffix: string;
  localHint: string;
  home: string;
  myLearning: string;
  modeLead: string;
  modeUnknownLead: string;
  confirming: string;
  authErrorPrefix: string;
  busy: string;
  githubTitle: string;
  githubHint: string;
  githubButton: string;
  tabsAria: string;
  tabs: Record<Tab, string>;
  headings: Record<Tab, string>;
  emailHintDisabled: string;
  emailHint: string;
  signupDisabledPrefix: string;
  signupDisabledSuffix: string;
  recoverDisabledPrefix: string;
  recoverDisabledSuffix: string;
  email: string;
  password: string;
  passwordHintSignup: string;
  passwordHintLogin: string;
  passwordHintTail: string;
  emailMissing: string;
  emailMalformed: string;
  processing: string;
  forgot: string;
  signupHint: string;
  recoverHint: string;
  aboutTitle: string;
  noteIssued: string;
  noteSignout: string;
  noteLoggedIn: (who: string) => string;
  noteAnonymous: string;
  browse: string;
}

const AUTH_TEXT: { zh: AuthText; en: AuthText } = {
  zh: {
    eyebrow: '账号',
    pageTitle: '登录',
    localTitle: '本机模式没有在线账号',
    localBodyPrefix: '这个站点以',
    localBodyStrong: '本机模式',
    localBodySuffix: '运行：身份固定为本机管理员，学习档案只存在这台机器的数据库里，没有注册、登录与找回密码可做。要启用账号，需要在服务端以公网模式启动并配置认证服务。',
    localHint: '因此这里不需要你登录，也不会拦住任何页面。',
    home: '回首页',
    myLearning: '我的学习',
    modeLead: '登录后，学习档案、事件与笔记会归到你的账号名下；公共本体 M 对所有人是同一份，登录不改变它的内容与哈希。',
    modeUnknownLead: '正在确认这个站点的运行模式：本机模式没有账号，公网模式需要登录。',
    confirming: '正在确认登录状态…',
    authErrorPrefix: '登录状态未知：',
    busy: '正在处理…',
    githubTitle: '用 GitHub 登录',
    githubHint: '点击后整页跳到 GitHub 的授权页；授权完成会回到本站，并落到你的个人页。',
    githubButton: '使用 GitHub 登录',
    tabsAria: '邮箱账号操作',
    tabs: { login: '登录', signup: '注册', recover: '忘记密码' },
    headings: { login: '登录', signup: '注册账号', recover: '找回密码' },
    emailHintDisabled: '本站未开通邮箱服务：注册与找回密码暂时不可用，请用 GitHub 登录。',
    emailHint: '邮箱用于接收验证与重置邮件。',
    signupDisabledPrefix: '本站的邮箱服务尚未开通（',
    signupDisabledSuffix: '），注册无法完成——这里先说清楚，免得你填完表单等一封不会来的邮件。请改用上面的 GitHub 登录。',
    recoverDisabledPrefix: '本站的邮箱服务尚未开通（',
    recoverDisabledSuffix: '），找回密码无法完成。若是密码忘了，请用 GitHub 登录，或联系站点作者。',
    email: '邮箱',
    password: '密码',
    passwordHintSignup: '密码 12–128 个字符；建议用一串只有你自己知道的短语，不必凑符号。',
    passwordHintLogin: '密码 12–128 个字符。',
    passwordHintTail: ' 本站不保存明文密码，也不做「强度评分」——只有长度这一条硬规则。',
    emailMissing: '请先填写邮箱。',
    emailMalformed: '邮箱格式看起来不对，请检查后重填。',
    processing: '处理中…',
    forgot: '忘记密码？',
    signupHint: '注册后会收到一封验证邮件，点邮件里的链接即可完成验证。',
    recoverHint: '邮件里的链接会回到本站并自动完成验证。',
    aboutTitle: '关于账号',
    noteIssued: '账号由站点的认证服务签发；本站不在浏览器里保存密码，只保存一枚会话 Cookie。',
    noteSignout: '退出登录后，这枚 Cookie 与它在服务端对应的会话记录都会被删除。',
    noteLoggedIn: (who) => `当前已登录：${who}。`,
    noteAnonymous: '还没有登录。',
    browse: '先随便看看（公共本体不需要登录）',
  },
  en: {
    eyebrow: 'Account',
    pageTitle: 'Sign in',
    localTitle: 'Local mode has no online account',
    localBodyPrefix: 'This site runs in ',
    localBodyStrong: 'local mode',
    localBodySuffix: ': the identity is fixed to the local administrator, learning profiles live only in this machine’s database, and there is no sign-up, sign-in or password recovery to do. To enable accounts, the server has to be started in public mode with an authentication service configured.',
    localHint: 'So there is nothing to sign in for here, and no page is gated.',
    home: 'Back to home',
    myLearning: 'My learning',
    modeLead: 'Once signed in, learning profiles, events and notes belong to your account; the public ontology M is the same one for everyone, and signing in changes neither its content nor its hash.',
    modeUnknownLead: 'Checking how this site is running: local mode has no account, public mode requires signing in.',
    confirming: 'Confirming the sign-in state…',
    authErrorPrefix: 'Sign-in state unknown: ',
    busy: 'Working…',
    githubTitle: 'Sign in with GitHub',
    githubHint: 'Clicking takes the whole page to GitHub’s authorisation page; when it completes you come back to this site and land on your profile page.',
    githubButton: 'Sign in with GitHub',
    tabsAria: 'Email account actions',
    tabs: { login: 'Sign in', signup: 'Sign up', recover: 'Forgot password' },
    headings: { login: 'Sign in', signup: 'Create an account', recover: 'Recover the password' },
    emailHintDisabled: 'Email is not enabled on this site: sign-up and password recovery are unavailable for now — please sign in with GitHub.',
    emailHint: 'The address is used for verification and password-reset mail.',
    signupDisabledPrefix: 'Email is not enabled on this site (',
    signupDisabledSuffix: '), so sign-up cannot complete — saying so here beats letting you fill in the form and wait for a message that will never arrive. Please use GitHub above.',
    recoverDisabledPrefix: 'Email is not enabled on this site (',
    recoverDisabledSuffix: '), so password recovery cannot complete. If you have forgotten the password, sign in with GitHub or contact the site author.',
    email: 'Email',
    password: 'Password',
    passwordHintSignup: 'The password is 12–128 characters; a passphrase only you know is a good choice — no need to force symbols in.',
    passwordHintLogin: 'The password is 12–128 characters.',
    passwordHintTail: ' This site stores no plaintext password and gives no “strength score” — length is the only hard rule.',
    emailMissing: 'Please fill in the email address first.',
    emailMalformed: 'That does not look like a valid email address; please check and re-enter it.',
    processing: 'Working…',
    forgot: 'Forgot the password?',
    signupHint: 'After signing up you receive a verification email; open the link in it to finish verifying.',
    recoverHint: 'The link in the email comes back to this site and verifies automatically.',
    aboutTitle: 'About accounts',
    noteIssued: 'The account is issued by the site’s authentication service; this site keeps no password in the browser, only one session cookie.',
    noteSignout: 'After signing out, that cookie and the matching session record on the server are both deleted.',
    noteLoggedIn: (who) => `Currently signed in: ${who}.`,
    noteAnonymous: 'Not signed in yet.',
    browse: 'Just look around first (the public ontology needs no sign-in)',
  },
};

/** `?tab=` 只接受这三个值；写别的就落回登录（免得一个错参数把页面变成空白）。 */
function readTab(value: string | null): Tab {
  return value === 'signup' || value === 'recover' ? value : 'login';
}

/** 邮箱的基本形状检查；真正的判据在服务端（`server/auth.mjs` 的 `email()`）。 */
const EMAIL_SHAPE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * 登录成功后的去处：只接受站内路径。
 *
 * `?next=` 会被贴在 `window.location` 上，因此必须挡住 `//evil.example`（协议相对地址）
 * 与带冒号的伪协议——这类跳转是开放重定向，钓鱼链接正需要它。
 */
export function safeNext(value: string | null): string {
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.includes(':')) return '/profile';
  return value;
}

/** 本机模式的说明卡：登录页与验证页共用同一段话，避免两处措辞漂移。 */
export function LocalModeNotice() {
  const { pick } = useI18n();
  const text = pick(AUTH_TEXT);
  return (
    <section className="card" aria-labelledby="local-mode-title">
      <h2 id="local-mode-title">{text.localTitle}</h2>
      <p>
        {text.localBodyPrefix}<strong>{text.localBodyStrong}</strong>{text.localBodySuffix}
      </p>
      <p className="hint">{text.localHint}</p>
      <p className="card-actions">
        <Link className="button" to="/">{text.home}</Link>
        <Link className="button ghost" to="/profile">{text.myLearning}</Link>
      </p>
    </section>
  );
}

export function LoginPage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = safeNext(params.get('next'));
  const [tab, setTab] = useState<Tab>(() => readTab(params.get('tab')));
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const { pick, isPending, t } = useI18n();
  const text = pick(AUTH_TEXT);
  /** 认证层与后端下发的中文：英文语境下标注「尚未翻译」（见文件头说明）。 */
  const pendingProps = (value: string | null | undefined) => (
    isPending(value) ? { className: 'i18n-pending', title: t('i18n.pendingTitle') } : {}
  );

  // 已登录的人点进 /login 不该看到登录表单：直接送到个人页（`replace` 免得回退又回来）。
  useEffect(() => {
    if (auth.mode === 'supabase' && auth.user) navigate(next, { replace: true });
  }, [auth.mode, auth.user, navigate, next]);

  function switchTab(id: Tab) {
    setTab(id);
    // 换动作就清干净：注册页不该残留刚才登录时输入的密码。
    setPassword('');
    setMessage(null);
    setProblem(null);
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    const address = email.trim();
    if (!address) { setProblem(text.emailMissing); return; }
    if (!EMAIL_SHAPE.test(address)) { setProblem(text.emailMalformed); return; }
    if (tab !== 'recover') {
      const length = passwordProblem(password);
      if (length) { setProblem(length); return; }
    }
    setProblem(null);
    setMessage(null);
    setBusy(true);
    try {
      if (tab === 'login') {
        await auth.login(address, password);
        navigate(next, { replace: true });
        return;
      }
      if (tab === 'signup') {
        setMessage(await auth.signup(address, password));
      } else {
        setMessage(await auth.recover(address));
      }
      setPassword('');
    } catch (error) {
      /*
       * 密码那次请求失败后立刻重填：服务端只会说「密码不对」，
       * 留着刚敲进去的字符串在框里，除了再被看见一次没有别的作用。
       */
      if (tab === 'login') setPassword('');
      setProblem(authErrorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  async function github() {
    setProblem(null);
    setMessage(null);
    setBusy(true);
    try {
      await auth.startGithub();
      // 成功时整页正在跳走，这里不会再有下文。
    } catch (error) {
      setProblem(authErrorMessage(error));
      setBusy(false);
    }
  }

  const heading = text.headings[tab];
  const emailHint = auth.mode === 'supabase' && !auth.emailEnabled
    ? text.emailHintDisabled
    : text.emailHint;

  return (
    <div className="page auth-page">
      <div className="section-heading">
        <p className="eyebrow">{text.eyebrow}</p>
        <h1>{text.pageTitle}</h1>
        {/*
          这段话只在公网模式有意义；本机模式下面是「这里没有账号」那张卡，
          两段话叠在一起会让人以为「登录」这件事在本机也适用。
        */}
        {auth.mode === 'supabase' && (
          <p className="lede">
            {text.modeLead}
          </p>
        )}
        {auth.mode === null && (
          <p className="lede">{text.modeUnknownLead}</p>
        )}
      </div>

      {/* 首次 session 请求还在路上时不画表单：`mode` 未知，画什么都是在猜。 */}
      {auth.mode === null && <p className="hint" role="status">{text.confirming}</p>}

      {/* 拿不到会话时如实说「未知」，而不是说「你没登录」——那会把网络故障说成身份结论。 */}
      {auth.error && (
        <p className="error" role="alert">
          {text.authErrorPrefix}<span {...pendingProps(auth.error)}>{auth.error}</span>
        </p>
      )}

      {auth.mode === 'local' && <LocalModeNotice />}

      {auth.mode === 'supabase' && (
        <>
          {busy && <p className="muted" role="status">{text.busy}</p>}

          <section className="card auth-card">
            <h2>{text.githubTitle}</h2>
            <p className="hint">
              {text.githubHint}
            </p>
            <div className="auth-actions">
              <button type="button" className="button primary" onClick={github} disabled={busy}>
                {text.githubButton}
              </button>
            </div>
          </section>

          <section className="card auth-card">
            <div className="auth-tabs" role="tablist" aria-label={text.tabsAria}>
              {(['login', 'signup', 'recover'] as Tab[]).map((id) => (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  id={`auth-tab-${id}`}
                  aria-selected={tab === id}
                  aria-controls="auth-panel"
                  className={tab === id ? 'tab active' : 'tab'}
                  onClick={() => switchTab(id)}
                >
                  {text.tabs[id]}
                </button>
              ))}
            </div>

            {/*
              成功与失败放在**同一个** live 区的两个分支里：这样「注册成功」不会与
              上一条错误同时挂在屏幕上（那是两个 live 区各自讲话必然的结局）。
            */}
            <div className="auth-status" aria-live="polite">
              {problem
                ? <p className="error" role="alert"><span {...pendingProps(problem)}>{problem}</span></p>
                : message ? <p className="notice" role="status"><span {...pendingProps(message)}>{message}</span></p> : null}
            </div>

            <form
              id="auth-panel"
              className="auth-form"
              role="tabpanel"
              aria-labelledby={`auth-tab-${tab}`}
              onSubmit={submit}
              noValidate
            >
              <h2 className="auth-form-title">{heading}</h2>

              {tab === 'signup' && !auth.emailEnabled ? (
                <p className="notice">
                  {text.signupDisabledPrefix}<code>emailEnabled: false</code>{text.signupDisabledSuffix}
                </p>
              ) : tab === 'recover' && !auth.emailEnabled ? (
                <p className="notice">
                  {text.recoverDisabledPrefix}<code>emailEnabled: false</code>{text.recoverDisabledSuffix}
                </p>
              ) : (
                <>
                  <label htmlFor="auth-email">
                    {text.email}
                    <input
                      id="auth-email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      inputMode="email"
                      required
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      aria-describedby="auth-email-hint"
                    />
                  </label>
                  <p className="hint" id="auth-email-hint">{emailHint}</p>

                  {tab !== 'recover' && (
                    <>
                      <label htmlFor="auth-password">
                        {text.password}
                        <input
                          id="auth-password"
                          name="password"
                          type="password"
                          // 注册时让浏览器提议一个强密码；登录时读已保存的那个。
                          autoComplete={tab === 'signup' ? 'new-password' : 'current-password'}
                          required
                          value={password}
                          onChange={(event) => setPassword(event.target.value)}
                          aria-describedby="auth-password-hint"
                        />
                      </label>
                      <p className="hint" id="auth-password-hint">
                        {tab === 'signup' ? text.passwordHintSignup : text.passwordHintLogin}
                        {text.passwordHintTail}
                      </p>
                    </>
                  )}

                  <div className="auth-actions">
                    <button type="submit" className="button primary" disabled={busy}>
                      {busy ? text.processing : heading}
                    </button>
                    {tab === 'login' && (
                      <button type="button" className="link-button" onClick={() => switchTab('recover')}>
                        {text.forgot}
                      </button>
                    )}
                    {tab === 'signup' && (
                      <span className="hint">{text.signupHint}</span>
                    )}
                    {tab === 'recover' && (
                      <span className="hint">{text.recoverHint}</span>
                    )}
                  </div>
                </>
              )}
            </form>
          </section>

          <section className="card">
            <h2>{text.aboutTitle}</h2>
            <ul className="auth-notes">
              <li>{text.noteIssued}</li>
              <li>{text.noteSignout}</li>
              <li>
                {auth.user
                  ? text.noteLoggedIn(`${auth.user.email ?? auth.user.id}（${auth.user.role}）`)
                  : text.noteAnonymous}
              </li>
            </ul>
            <p className="card-actions">
              <Link className="button ghost" to="/">{text.browse}</Link>
            </p>
          </section>
        </>
      )}
    </div>
  );
}
