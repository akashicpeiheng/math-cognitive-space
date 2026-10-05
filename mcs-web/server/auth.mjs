import { randomBytes, createHash, createHmac, timingSafeEqual, createCipheriv, createDecipheriv } from 'node:crypto';
import { join, dirname } from 'node:path';
import { SecurityStore } from './security-store.mjs';
import { SupabaseProvider } from './auth-provider.mjs';
import { checkWriteOrigin } from './deployment.mjs';
import { McsError } from '../shared/errors.mjs';

const random = () => randomBytes(32).toString('base64url');
const digest = value => createHash('sha256').update(value).digest('hex');
const same = (a, b) => typeof a === 'string' && typeof b === 'string' && a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));
const WRITE = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const fail = (code, message, status) => { throw new McsError(code, message, status); };

export function validateAuthConfig(config) {
  if (config.auth?.mode !== 'supabase') return;
  const a = config.auth;
  let url;
  try { url = new URL(a.url); } catch { fail('BAD_REQUEST', '必须配置 Supabase URL。', 500); }
  if (url.protocol !== 'https:' || url.username || url.password || url.pathname !== '/') fail('BAD_REQUEST', 'Supabase URL 必须是无凭据的 HTTPS 根地址。', 500);
  if (!a.publishableKey || typeof a.publishableKey !== 'string') fail('BAD_REQUEST', '必须配置 Supabase publishable key。', 500);
  if (typeof a.sessionKey !== 'string' || !/^[A-Za-z0-9+/]{43}=$/.test(a.sessionKey) || Buffer.from(a.sessionKey, 'base64').length !== 32) fail('BAD_REQUEST', '会话加密密钥必须是 32 个随机字节的标准 base64 编码。', 500);
  if (!config.publicOrigin || new URL(config.publicOrigin).pathname !== '/') fail('BAD_REQUEST', '认证需要配置站点根地址 publicOrigin。', 500);
  /*
   * 管理员必须**显式给出至少一个 id**。
   *
   * 空数组也算"没配"：`some()` 在空数组上是 false，从前会静默通过，
   * 于是一个「谁都进不了管理入口」的部署被判为配置合格。宁可启动失败。
   */
  if (!Array.isArray(a.adminUserIds) || a.adminUserIds.length === 0 || a.adminUserIds.some(id => typeof id !== 'string' || !id)) {
    fail('BAD_REQUEST', '管理员必须按认证服务的用户 ID 显式配置（至少一个）。', 500);
  }
}

export class AuthService {
  constructor({ config, store, provider }) {
    this.config = config;
    this.enabled = config.auth?.mode === 'supabase';
    this.store = store;
    this.provider = provider;
    this.key = this.enabled ? Buffer.from(config.auth.sessionKey, 'base64') : null;
    this.prefix = config.publicMode ? '__Host-mcs_' : 'mcs_';
    this.refreshes = new Map();
    this.limits = new Map();
  }
  cookies(req) {
    const values = Object.create(null);
    for (const part of String(req.headers.cookie ?? '').split(';')) {
      const at = part.indexOf('=');
      if (at < 0) continue;
      const name = part.slice(0, at).trim();
      if (values[name] !== undefined) fail('AUTH_REQUIRED', 'Cookie 重复，请清理本站登录状态。', 401);
      values[name] = part.slice(at + 1).trim();
    }
    return values;
  }
  cookie(res, name, value, seconds = 604800) {
    const previous = res.getHeader('Set-Cookie') ?? [];
    res.setHeader('Set-Cookie', [...(Array.isArray(previous) ? previous : [previous]), `${this.prefix}${name}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${seconds}${this.config.publicMode ? '; Secure' : ''}`]);
  }
  seal(value) {
    const iv = randomBytes(12), cipher = createCipheriv('aes-256-gcm', this.key, iv);
    const bytes = Buffer.concat([cipher.update(JSON.stringify(value), 'utf8'), cipher.final()]);
    return Buffer.concat([iv, cipher.getAuthTag(), bytes]).toString('base64');
  }
  unseal(value) {
    try {
      const bytes = Buffer.from(value, 'base64'), decipher = createDecipheriv('aes-256-gcm', this.key, bytes.subarray(0, 12));
      decipher.setAuthTag(bytes.subarray(12, 28));
      return JSON.parse(Buffer.concat([decipher.update(bytes.subarray(28)), decipher.final()]).toString());
    } catch { fail('AUTH_REQUIRED', '登录状态已失效，请重新登录。', 401); }
  }
  csrf(req, res) {
    let nonce = this.cookies(req)[this.prefix + 'csrf'];
    if (!nonce || !/^[\w-]{43}$/.test(nonce)) { nonce = random(); this.cookie(res, 'csrf', nonce); }
    return createHmac('sha256', this.key).update('csrf:' + nonce).digest('base64url');
  }
  checkCsrf(req) {
    const nonce = this.cookies(req)[this.prefix + 'csrf'];
    const expected = nonce ? createHmac('sha256', this.key).update('csrf:' + nonce).digest('base64url') : '';
    if (!expected || !same(req.headers['x-mcs-csrf'], expected)) fail('CSRF_REJECTED', '页面验证已失效，请刷新后重试。', 403);
    checkWriteOrigin(req, this.config);
  }
  rate(req, group, limit = 10) {
    const now = Date.now();
    if (this.limits.size > 10000) for (const [key, value] of this.limits) if (value.until < now) this.limits.delete(key);
    if (this.limits.size > 10000) fail('RATE_LIMITED', '服务繁忙，请稍后重试。', 429);
    const key = `${req.socket?.remoteAddress ?? 'unknown'}:${group}`;
    const value = this.limits.get(key);
    const next = !value || value.until < now ? { count: 1, until: now + 60000 } : { ...value, count: value.count + 1 };
    this.limits.set(key, next);
    if (next.count > limit) fail('RATE_LIMITED', '尝试过于频繁，请稍后重试。', 429);
  }
  async identify(req) {
    if (!this.enabled) return { user: { id: 'local', role: 'admin', email: null }, local: true };
    const token = this.cookies(req)[this.prefix + 'session'];
    if (!token || !/^[\w-]{43}$/.test(token)) return { user: null };
    const id = digest(token);
    let row = await this.store.get('session', id);
    if (!row) return { user: null };
    let session = this.unseal(row.secret);
    if ((session.expires_at ?? 0) * 1000 < Date.now() + 30000) {
      if (!this.refreshes.has(id)) {
        this.refreshes.set(id, (async () => {
          // Re-read after waiting: another request may already have rotated the token.
          const latest = await this.store.get('session', id);
          if (!latest) fail('AUTH_REQUIRED', '登录已过期。', 401);
          const old = this.unseal(latest.secret);
          if ((old.expires_at ?? 0) * 1000 >= Date.now() + 30000) return latest;
          const fresh = await this.provider.refresh(old.refresh_token);
          if (!fresh.session || fresh.session.user?.id && fresh.session.user.id !== latest.userId) fail('AUTH_REQUIRED', '刷新后的账号与原会话不一致。', 401);
          const updated = { ...latest, secret: this.seal(fresh.session) };
          // A concurrent logout wins; never resurrect a removed session.
          if (!await this.store.get('session', id)) fail('AUTH_REQUIRED', '登录已退出。', 401);
          await this.store.put('session', id, updated, latest.expires);
          return updated;
        })().finally(() => this.refreshes.delete(id)));
      }
      row = await this.refreshes.get(id);
      session = this.unseal(row.secret);
    }
    const user = await this.provider.user(session.access_token);
    if (!user?.id || user.id !== row.userId || !user.email_confirmed_at) fail('AUTH_REQUIRED', '账号尚未验证或登录已失效。', 401);
    return { user: { id: user.id, email: user.email ?? null, role: this.config.auth.adminUserIds.includes(user.id) ? 'admin' : 'user' }, sessionId: id, session, authenticatedAt: row.authenticatedAt };
  }
  requireUser(identity) { if (!identity?.user) fail('AUTH_REQUIRED', '请先登录再使用此功能。', 401); }
  async establish(req, res, data) {
    const session = data?.session;
    if (!session?.access_token || !session.refresh_token) fail('AUTH_REQUIRED', '尚未获得登录会话，请先完成邮箱验证。', 401);
    const user = await this.provider.user(session.access_token);
    if (!user?.id || !user.email_confirmed_at) fail('AUTH_REQUIRED', '请先完成邮箱验证。', 401);
    const previous = this.cookies(req)[this.prefix + 'session'];
    if (previous) await this.store.remove('session', digest(previous));
    const token = random(), expires = Date.now() + 7 * 86400000;
    await this.store.put('session', digest(token), { secret: this.seal(session), userId: user.id, authenticatedAt: Date.now(), expires }, expires);
    this.cookie(res, 'session', token);
    return { signedIn: true };
  }
  async body(req) {
    if (!String(req.headers['content-type'] ?? '').toLowerCase().startsWith('application/json')) fail('BAD_REQUEST', '认证请求需要 JSON。', 415);
    let size = 0; const chunks = [];
    for await (const chunk of req) { size += chunk.length; if (size > 16384) fail('BAD_REQUEST', '认证请求过大。', 413); chunks.push(chunk); }
    try { const body = JSON.parse(Buffer.concat(chunks).toString() || '{}'); if (!body || typeof body !== 'object' || Array.isArray(body)) throw Error(); return body; }
    catch { fail('BAD_REQUEST', '认证请求格式错误。', 400); }
  }
  email(value) { if (typeof value !== 'string' || value.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) fail('BAD_REQUEST', '请填写有效邮箱。', 400); return value.trim(); }
  password(value) { if (typeof value !== 'string' || value.length < 12 || value.length > 128) fail('BAD_REQUEST', '密码须为 12–128 个字符。', 400); return value; }
  async handle(req, res) {
    const url = new URL(req.url, 'http://localhost');
    if (!url.pathname.startsWith('/api/v2/auth/')) return false;
    const action = url.pathname.slice('/api/v2/auth/'.length);
    const send = data => { res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }); res.end(JSON.stringify({ ok: true, data })); };
    try {
      if (!this.enabled) {
        if (action !== 'session' || req.method !== 'GET') fail('NOT_FOUND', '本机模式没有在线账号入口。', 404);
        send({ mode: 'local', user: null, csrfToken: null }); return true;
      }
      if (action === 'session' && req.method === 'GET') {
        let identity;
        try { identity = await this.identify(req); } catch (error) { if (error.status !== 401) throw error; this.cookie(res, 'session', '', 0); identity = { user: null }; }
        send({ mode: 'supabase', user: identity.user, csrfToken: this.csrf(req, res), emailEnabled: this.config.auth.emailEnabled !== false }); return true;
      }
      if (action === 'callback' && req.method === 'GET') {
        const state = url.searchParams.get('state'), nonce = this.cookies(req)[this.prefix + 'oauth'];
        if (!state || !same(state, nonce) || !url.searchParams.get('code')) fail('AUTH_REJECTED', '登录回调无效，请重新登录。', 401);
        const flow = await this.store.consume('oauth', digest(state));
        this.cookie(res, 'oauth', '', 0);
        if (!flow) fail('AUTH_REJECTED', '登录请求已过期或已使用。', 401);
        await this.establish(req, res, await this.provider.oauthFinish(url.searchParams.get('code'), this.unseal(flow.storage)));
        res.writeHead(303, { Location: '/profile', 'Cache-Control': 'no-store' }); res.end(); return true;
      }
      if (!WRITE.has(req.method) || req.method !== 'POST') fail('NOT_FOUND', '认证接口不存在。', 404);
      this.checkCsrf(req);
      this.rate(req, 'auth', 20);
      const body = await this.body(req);
      let result;
      if (action === 'github') {
        const state = random();
        const flow = await this.provider.oauthStart(`${this.config.publicOrigin}/api/v2/auth/callback?state=${state}`);
        const dest = new URL(flow.url);
        if (dest.origin !== new URL(this.config.auth.url).origin) fail('AUTH_UNAVAILABLE', '登录服务返回了非预期地址。', 503);
        await this.store.put('oauth', digest(state), { storage: this.seal(flow.storage) }, Date.now() + 600000);
        this.cookie(res, 'oauth', state, 600); result = { url: flow.url };
      } else if (action === 'login') {
        result = await this.establish(req, res, await this.provider.login(this.email(body.email), this.password(body.password)));
      } else if (action === 'signup' || action === 'recover') {
        if (this.config.auth.emailEnabled === false) fail('AUTH_UNAVAILABLE', '邮箱服务尚未配置。', 503);
        this.rate(req, 'mail', 3);
        const email = this.email(body.email);
        if (action === 'signup') await this.provider.signup(email, this.password(body.password), `${this.config.publicOrigin}/auth/confirm`);
        else await this.provider.recover(email, `${this.config.publicOrigin}/auth/confirm`);
        result = { message: '如该邮箱可用于此操作，验证邮件将发送到邮箱，请检查收件箱。' };
      } else if (action === 'confirm') {
        if (typeof body.tokenHash !== 'string' || !/^[a-zA-Z0-9_-]{20,256}$/.test(body.tokenHash) || !['email', 'signup', 'recovery'].includes(body.type)) fail('BAD_REQUEST', '验证链接无效。', 400);
        result = await this.establish(req, res, await this.provider.confirm(body.tokenHash, body.type));
      } else if (action === 'logout' || action === 'password') {
        const identity = await this.identify(req); this.requireUser(identity);
        if (action === 'password') {
          if (Date.now() - identity.authenticatedAt > 600000) fail('AUTH_REQUIRED', '请重新登录或重新验证邮箱后修改密码。', 401);
          await this.provider.password(identity.session, this.password(body.password));
        }
        await this.store.remove('session', identity.sessionId);
        this.cookie(res, 'session', '', 0);
        try { await this.provider.logout(identity.session); } catch { /* Local revocation is already durable. */ }
        result = { signedOut: true };
      } else fail('NOT_FOUND', '认证接口不存在。', 404);
      send(result);
    } catch (error) {
      const known = error instanceof McsError;
      res.writeHead(known ? error.status : 503, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
      res.end(JSON.stringify({ ok: false, error: { code: known ? error.code : 'AUTH_UNAVAILABLE', message: known ? error.message : '登录服务暂时不可用。' } }));
    }
    return true;
  }
  async close() { await this.store?.close(); }
}

export async function createAuth({ config, provider = null, pool = null }) {
  validateAuthConfig(config);
  const enabled = config.auth?.mode === 'supabase';
  const store = enabled ? await new SecurityStore({ file: config.authFile ?? join(dirname(config.dbFile), 'auth.sqlite3'), pool }).init() : null;
  return new AuthService({ config, store, provider: enabled ? provider ?? new SupabaseProvider(config.auth) : null });
}
