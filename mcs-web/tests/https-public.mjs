/**
 * 公网模式的 **HTTPS 端到端验收**（2026-10-05 加）。
 *
 * ## 为什么必须单独有这一条
 *
 * 公网模式的会话 Cookie 是 `__Host-mcs_session`（`Secure` + `HttpOnly` + `SameSite=Lax`），
 * 而浏览器**拒收** http 页面下发的 `Secure` Cookie。也就是说：
 *
 * > 公网模式跑在 http 上不是"不够安全"，而是**登录根本走不通**。
 *
 * 这条结论不能只写在文档里——`tests/auth.test.mjs` 是用 fetch + 手工 Cookie 头验的，
 * 它证明不了浏览器会接受这些 Cookie。这里用真浏览器、真 TLS、真 Cookie 罐走一遍：
 * 打开 `/login` → 填邮箱密码 → 登录 → 页头显示邮箱 → 用界面新建一个档案（写请求）→ 退出。
 *
 * 写请求那一步是关键：它同时经过「会话 Cookie 被接受」+「CSRF 令牌」+「Origin 与站点一致」
 * 三道关，任何一道在 https 下不成立都会在这一步暴露。
 *
 * 证书按「有就真生成、没有就明确跳过」处理（`tests/tls-runtime.mjs`）：
 * 本机既没有 openssl 也没有 Windows 证书工具时，脚本**跳过并打印原因**，退出码 0；
 * CI 里设 `MCS_WEB_REQUIRE_TLS=1` 之后跳过变成失败。
 */
import { readFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createServer as createHttpsServer } from 'node:https';
import { request as httpRequest } from 'node:http';
import { createServer as createTcpServer } from 'node:net';
import { randomBytes } from 'node:crypto';
import { PGlite } from '@electric-sql/pglite';
import { startServer } from '../server/index.mjs';
import { REPO_ROOT } from '../core/ontology.mjs';
import { McsError } from '../shared/errors.mjs';
import { ensureCertificate, credentialsFor } from './tls-runtime.mjs';
import { PLAYWRIGHT_SPECIFIER as PLAYWRIGHT, CHROME_PATH as CHROME } from './browser-runtime.mjs';

const failures = [];
function check(name, condition, detail = '') {
  if (condition) console.log('  ✓ ' + name);
  else { failures.push(name + (detail ? ' :: ' + detail : '')); console.log('  ✗ ' + name + (detail ? ' :: ' + detail : '')); }
}

/** 让内核分一个空闲端口出来（公网模式的 peer 地址要与站点地址一致，必须事先知道端口）。 */
function freePort() {
  return new Promise((resolvePromise, rejectPromise) => {
    const probe = createTcpServer();
    probe.on('error', rejectPromise);
    probe.listen(0, '127.0.0.1', () => {
      const { port } = probe.address();
      probe.close(() => resolvePromise(port));
    });
  });
}

/** 身份服务桩：本测试要验的是本站的会话与 https 行为，不是 Supabase 的可用性。 */
class StubProvider {
  constructor() { this.accounts = new Map(); this.tokens = new Map(); }
  add(id, email) { this.accounts.set(email, { id, email, email_confirmed_at: '2026-10-05T00:00:00.000Z' }); }
  issue(user) {
    const session = { access_token: `access-${randomBytes(8).toString('hex')}`, refresh_token: `refresh-${randomBytes(8).toString('hex')}`, expires_at: Math.floor(Date.now() / 1000) + 3600, user };
    this.tokens.set(session.access_token, user);
    return { session, user };
  }
  async login(email) {
    const user = this.accounts.get(email);
    if (!user) throw new McsError('AUTH_REJECTED', '验证未通过。', 401);
    return this.issue(user);
  }
  async user(access) {
    const user = this.tokens.get(access);
    if (!user) throw new McsError('AUTH_REJECTED', '登录状态已失效。', 401);
    return user;
  }
  async refresh() { throw new McsError('AUTH_UNAVAILABLE', '本测试没有刷新这一步。', 503); }
  async signup() { return {}; }
  async recover() { return {}; }
  async confirm() { throw new McsError('AUTH_REJECTED', '本测试没有验证链接这一步。', 401); }
  async oauthStart() { throw new McsError('AUTH_UNAVAILABLE', '本测试没有 OAuth 这一步。', 503); }
  async oauthFinish() { throw new McsError('AUTH_UNAVAILABLE', '本测试没有 OAuth 这一步。', 503); }
  async password() { return {}; }
  async logout() { return {}; }
}

const tlsDir = mkdtempSync(join(tmpdir(), 'mcs-tls-'));
const material = ensureCertificate(tlsDir);
if (!material) {
  const why = '这台机器上既没有 openssl，也没有可用的 Windows 证书工具，无法生成本机 TLS 证书。';
  if (process.env.MCS_WEB_REQUIRE_TLS === '1') {
    console.error(`HTTPS 验收失败：${why}（MCS_WEB_REQUIRE_TLS=1，跳过视为失败）`);
    process.exit(1);
  }
  console.log(`\n跳过 HTTPS 验收：${why}\n装一个 openssl（或改用带有证书工具的机器）即可真跑。`);
  rmSync(tlsDir, { recursive: true, force: true });
  process.exit(0);
}

const appPort = await freePort();
const tlsPort = await freePort();
const origin = `https://127.0.0.1:${tlsPort}`;

const provider = new StubProvider();
provider.add('user-tls', 'tls@example.com');
const pg = new PGlite();
const dataDir = mkdtempSync(join(tmpdir(), 'mcs-tls-run-'));

const config = {
  host: '127.0.0.1',
  port: appPort,
  dataDir: join(REPO_ROOT, 'mcs-web', 'data'),
  dbFile: join(dataDir, 'unused.sqlite3'),
  dbUrl: 'postgres://pglite/test',
  authoringDbFile: join(dataDir, 'authoring.sqlite3'),
  extensionsDir: join(dataDir, 'extensions'),
  staticDir: process.env.MCS_WEB_TEST_STATIC_DIR || join(REPO_ROOT, 'mcs-web', 'web', 'dist'),
  backupDir: join(dataDir, 'backups'),
  authFile: join(dataDir, 'auth.sqlite3'),
  repoRoot: REPO_ROOT,
  dev: false,
  publicMode: true,
  publicOrigin: origin,
  allowedHosts: ['127.0.0.1'],
  auth: {
    mode: 'supabase',
    provider: 'supabase',
    url: 'https://project.supabase.co',
    publishableKey: 'sb_publishable_test',
    sessionKey: randomBytes(32).toString('base64'),
    adminUserIds: ['user-admin'],
    // 「先不做邮箱发信」这条路：邮箱注册与找回如实回 503，GitHub 登录不受影响。
    emailEnabled: false,
  },
  tutor: {
    enabled: false, adapter: 'deeptutor-1.5', baseUrl: 'http://127.0.0.1:1', frontendUrl: 'http://127.0.0.1:1',
    authTokenEnv: 'MCS_WEB_TEST_MISSING_TOKEN', timeoutMs: 500, healthTimeoutMs: 200, liveVerified: false,
  },
};

const handle = await startServer({ config, authProvider: provider, learnerPool: pg });

/* TLS 终结在测试这一侧：托管平台（Render 等）也是这么做的——容器里跑 http，对外是 https。 */
const terminator = createHttpsServer(credentialsFor(material, readFileSync), (req, res) => {
  const upstream = httpRequest({ host: '127.0.0.1', port: appPort, path: req.url, method: req.method, headers: req.headers }, (back) => {
    res.writeHead(back.statusCode, back.headers);
    back.pipe(res);
  });
  upstream.on('error', () => { res.writeHead(502, { 'Content-Type': 'text/plain; charset=utf-8' }); res.end('上游不可用'); });
  req.pipe(upstream);
});
await new Promise((resolvePromise) => terminator.listen(tlsPort, '127.0.0.1', resolvePromise));

let browser;
try {
  const { chromium } = await import(PLAYWRIGHT);
  browser = await chromium.launch({ executablePath: CHROME ?? undefined, headless: true });
  // 自签证书：浏览器必须忽略证书错误才能连上本机 https（托管平台上是真证书，不需要这一步）。
  const context = await browser.newContext({ ignoreHTTPSErrors: true, viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();
  const consoleErrors = [];
  page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text()); });
  page.on('pageerror', (error) => consoleErrors.push(error.message));

  const cookies = () => context.cookies();

  // ---- 1) https 下打开登录页，来源与站点一致 ---------------------------------
  await page.goto(`${origin}/login`, { waitUntil: 'networkidle' });
  const loginText = await page.locator('main').innerText();
  check('https 下 /login 是公网模式的登录界面（不是本机模式说明）',
    !/本机模式没有在线账号/.test(loginText), loginText.slice(0, 120));
  check('邮箱服务未开通时，注册入口先说明原因',
    /尚未开通|未配置|邮箱服务/.test(loginText));
  check('GitHub 登录按钮在（不做邮箱发信时的主入口）',
    await page.getByRole('button', { name: /GitHub/i }).count() > 0);

  const session = await page.evaluate(async () => (await (await fetch('/api/v2/auth/session')).json()).data);
  check('会话接口在 https 下如实报告公网模式', session.mode === 'supabase', JSON.stringify(session).slice(0, 120));
  check('拿到了 CSRF 令牌（写请求要用）', typeof session.csrfToken === 'string' && session.csrfToken.length > 20);

  // ---- 2) 真登录：这一步要通过浏览器对 Secure Cookie 的接受 -------------------
  await page.locator('#auth-email').fill('tls@example.com');
  await page.locator('#auth-password').fill('a-long-enough-password');
  await page.locator('#auth-panel button[type="submit"]').click();
  await page.waitForTimeout(1200);

  const jarAfterLogin = await cookies();
  const sessionCookie = jarAfterLogin.find((item) => item.name === '__Host-mcs_session');
  check('浏览器接受了 __Host- 会话 Cookie（http 下会被拒收）', Boolean(sessionCookie), JSON.stringify(jarAfterLogin.map((c) => c.name)));
  check('会话 Cookie 带 Secure / HttpOnly / SameSite=Lax',
    Boolean(sessionCookie) && sessionCookie.secure === true && sessionCookie.httpOnly === true && sessionCookie.sameSite === 'Lax',
    JSON.stringify(sessionCookie ?? {}));

  const signedIn = await page.evaluate(async () => (await (await fetch('/api/v2/auth/session')).json()).data);
  check('登录后会话接口给出邮箱与身份', signedIn.user?.email === 'tls@example.com', JSON.stringify(signedIn.user));

  // ---- 3) 写请求：Cookie + CSRF + Origin 三道关一起过 ------------------------
  /*
   * 用界面本人操作：在「我的学习」页新建一个档案。它走的是 `api.ts` 的统一封装
   * （自动带 `x-mcs-csrf`、同源 Origin），因此这一步失败就意味着上面三道关里有一道不成立。
   */
  await page.goto(`${origin}/profile`, { waitUntil: 'networkidle' });
  const profileText = await page.locator('main').innerText();
  check('https 下已登录时 /profile 不被"请先登录"拦住', !/请先登录/.test(profileText), profileText.slice(0, 160));

  const created = await page.evaluate(async () => {
    const token = (await (await fetch('/api/v2/auth/session')).json()).data.csrfToken;
    const response = await fetch('/api/v2/profiles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-mcs-csrf': token },
      body: JSON.stringify({ name: 'https 验收档案' }),
    });
    return { status: response.status, body: await response.json() };
  });
  check('https 下写请求成功（会话 Cookie 被接受 + CSRF 令牌 + 来源校验都成立）',
    created.status === 200 && created.body?.data?.profile?.name === 'https 验收档案',
    JSON.stringify(created).slice(0, 200));

  // The network view UI must use the authenticated API client for every write.
  const profileId = created.body.data.profile.id;
  await page.evaluate((id) => {
    localStorage.setItem('mcs-web-selected-profile', id);
    localStorage.setItem('mcs-network-views-local-v1', JSON.stringify([{
      viewId: 'local-https', name: 'HTTPS 本机视图', local: true, updatedAt: new Date().toISOString(),
      payload: { added: ['dg:manifold'], families: ['relation'], positions: {}, camera: null },
    }]));
  }, profileId);
  await page.goto(`${origin}/network?nodes=dg%3Amanifold`, { waitUntil: 'networkidle' });
  await page.getByLabel('显示保存的视图面板').check();
  const networkPanel = page.locator('.floating-panel[aria-label="保存的视图"]');
  const waitForWrite = (method) => page.waitForResponse((response) =>
    response.url().includes('/network-views') && response.request().method() === method);
  let write = waitForWrite('POST');
  page.once('dialog', (dialog) => dialog.accept('HTTPS 保存'));
  await networkPanel.getByRole('button', { name: '保存当前视图', exact: true }).click();
  check('公网浏览器保存视图通过 CSRF 校验', (await write).status() === 200);
  const savedRow = networkPanel.locator('li', { hasText: 'HTTPS 保存' });
  await savedRow.waitFor();
  page.once('dialog', (dialog) => dialog.accept('HTTPS 改名'));
  const [renameResponse] = await Promise.all([
    waitForWrite('PATCH'),
    savedRow.getByRole('button', { name: '重命名', exact: true }).click(),
  ]);
  check('公网浏览器重命名视图通过 CSRF 校验', renameResponse.status() === 200);
  write = waitForWrite('DELETE');
  page.once('dialog', (dialog) => dialog.accept());
  await networkPanel.locator('li', { hasText: 'HTTPS 改名' }).getByRole('button', { name: '删除', exact: true }).click();
  check('公网浏览器删除视图通过 CSRF 校验', (await write).status() === 200);
  write = waitForWrite('POST');
  await networkPanel.locator('.saved-view-migration button').click();
  check('公网浏览器迁移本机视图通过 CSRF 校验', (await write).status() === 200);
  await page.waitForFunction(() => document.querySelector('.saved-view-migration-status')?.textContent.includes('可以随档案导出'));
  check('公网迁移已回读并移除本机副本',
    await page.evaluate(() => JSON.parse(localStorage.getItem('mcs-network-views-local-v1')).length) === 0);

  // 不带令牌必须被拒：证明这道关不是摆设
  const noToken = await page.evaluate(async () => {
    const response = await fetch('/api/v2/profiles', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: '没有令牌' }),
    });
    return { status: response.status, body: await response.json() };
  });
  check('https 下缺 CSRF 令牌的写请求被拒（403 CSRF_REJECTED）',
    noToken.status === 403 && noToken.body?.error?.code === 'CSRF_REJECTED', JSON.stringify(noToken).slice(0, 160));

  // ---- 4) 退出：Cookie 真的被清掉 -------------------------------------------
  const signedOut = await page.evaluate(async () => {
    const token = (await (await fetch('/api/v2/auth/session')).json()).data.csrfToken;
    const response = await fetch('/api/v2/auth/logout', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-mcs-csrf': token }, body: '{}' });
    return { status: response.status, body: await response.json() };
  });
  check('退出接口成功', signedOut.status === 200 && signedOut.body?.data?.signedOut === true, JSON.stringify(signedOut).slice(0, 160));
  const afterLogout = await page.evaluate(async () => (await (await fetch('/api/v2/auth/session')).json()).data);
  check('退出后会话清空', afterLogout.user === null);

  // ---- 5) 明文 http 下同一套必须走不通（这条是给部署看的） -------------------
  const plain = await fetch(`http://127.0.0.1:${appPort}/api/v2/auth/session`, { headers: { Origin: origin } });
  const plainSession = (await plain.json()).data;
  check('明文 http 上拿不到可用会话（站点要求 https）',
    plainSession?.user === null, JSON.stringify(plainSession ?? {}).slice(0, 120));

  /*
   * 控制台错误分两类看：
   * - `Failed to load resource: ... 401/403` 是**这一轮故意打出去的**否定用例
   *   （缺令牌的写请求必须 403、未登录的访客不该拿到 401 数据）。浏览器把非 2xx
   *   响应当控制台错误是它的规矩，那不是页面出问题；
   * - 其余（`pageerror` 抛出的异常、脚本自身的 console.error）才是真失败。
   * 所以这里过滤网络噪声，同时把过滤掉的条数打出来，避免"过滤"变成"看不见"。
   */
  const noise = consoleErrors.filter((text) => /Failed to load resource/.test(text));
  const real = consoleErrors.filter((text) => !/Failed to load resource/.test(text));
  check('HTTPS 验收没有页面级错误（网络层 401/403 噪声已单列）', real.length === 0,
    `real=${real.slice(0, 3).join(' | ')} noise=${noise.length}`);
} catch (error) {
  failures.push('EXCEPTION ' + (error?.message ?? String(error)));
  console.error(error);
} finally {
  if (browser) await browser.close();
  await new Promise((resolvePromise) => terminator.close(resolvePromise));
  try { handle.jobs.close(); } catch { /* 已关闭 */ }
  try { await handle.db.close(); } catch { /* 已关闭 */ }
  try { await handle.auth.close(); } catch { /* 已关闭 */ }
  try { await pg.close(); } catch { /* 已关闭 */ }
  await new Promise((resolvePromise) => handle.server.close(resolvePromise));
  rmSync(dataDir, { recursive: true, force: true });
  rmSync(tlsDir, { recursive: true, force: true });
}

if (failures.length > 0) {
  console.error('\nHTTPS 公网模式验收失败：\n - ' + failures.join('\n - '));
  process.exit(1);
}
console.log('\nHTTPS 公网模式验收通过。');
