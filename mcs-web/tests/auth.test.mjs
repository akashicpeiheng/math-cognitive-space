/**
 * 公网模式：账号、权限与数据隔离的验收（2026-10 发布前加）。
 *
 * ## 这一组测的是「别人能不能看到我的东西」，不是「登录页能不能打开」
 *
 * 本机工作台只有一个使用者，`/api/v2/profiles` 列出全部档案是对的。公网模式下同一个
 * 调用就是「列出所有人的学习记录」。所以这里逐条验收：
 *
 * 1. 未登录只能读公共本体，个人数据一律 401；
 * 2. 两个账号互相看不到、改不了、导不出、删不掉对方的档案（**报 404，不是 403**——
 *    403 等于承认「这个 id 存在」）；
 * 3. 公共内容的入库 / 发布 / 备份恢复只有管理员能做（普通用户 403）；
 * 4. 写请求缺 CSRF 令牌一律 403；
 * 5. 会话 Cookie 是 `__Host-` 前缀 + HttpOnly + Secure；
 * 6. 邮箱未验证的账号不许建立会话；
 * 7. 任务队列有界：并发 1、全站队列 20、每账号 1 运行 + 1 排队，超出当场报 429。
 *
 * 身份服务用**桩**（`StubProvider`）：这里要验的是本站的会话与权限逻辑，
 * 不是 Supabase 的可用性；涉及真实凭据的部分（发信、OAuth 跳转）在部署时另行验收。
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, sep } from 'node:path';
import { randomBytes } from 'node:crypto';
import { startServer } from '../server/index.mjs';
import { JobManager } from '../server/jobs.mjs';
import { REPO_ROOT } from '../core/ontology.mjs';
import { McsError } from '../shared/errors.mjs';
import { PGlite } from '@electric-sql/pglite';

const PUBLIC_ORIGIN = 'https://mcs.test';

/** 身份服务桩：只实现本站真正会用到的那几个动作，其余显式报「本测试没有这一步」。 */
class StubProvider {
  constructor() {
    this.accounts = new Map();
    this.tokens = new Map();
    this.calls = [];
  }
  add(id, email, { confirmed = true } = {}) {
    this.accounts.set(email, { id, email, email_confirmed_at: confirmed ? '2026-10-05T00:00:00.000Z' : null });
    return this.accounts.get(email);
  }
  issue(user) {
    /*
     * `expires_at` 必须给：真实的 Supabase 会话带这个字段，而本站靠它判断
     * 「快过期了就刷新」。桩里漏掉它，`undefined` 会被当成 0 → 每个请求都去刷新，
     * 于是测出来的是桩的缺陷，不是本站的行为。
     */
    const session = {
      access_token: `access-${randomBytes(8).toString('hex')}`,
      refresh_token: `refresh-${randomBytes(8).toString('hex')}`,
      expires_at: Math.floor(Date.now() / 1000) + 3600,
      user,
    };
    this.tokens.set(session.access_token, user);
    return { session, user };
  }
  async login(email) {
    const user = this.accounts.get(email);
    if (!user) throw new McsError('AUTH_REJECTED', '验证未通过，请核对登录信息。', 401);
    return this.issue(user);
  }
  async user(access) {
    const user = this.tokens.get(access);
    if (!user) throw new McsError('AUTH_REJECTED', '登录状态已失效。', 401);
    return user;
  }
  async refresh() { throw new McsError('AUTH_UNAVAILABLE', '本测试没有刷新这一步。', 503); }
  async signup() { this.calls.push('signup'); return {}; }
  async recover() { this.calls.push('recover'); return {}; }
  async confirm() { throw new McsError('AUTH_REJECTED', '本测试没有验证链接这一步。', 401); }
  async oauthStart() { throw new McsError('AUTH_UNAVAILABLE', '本测试没有 OAuth 这一步。', 503); }
  async oauthFinish() { throw new McsError('AUTH_UNAVAILABLE', '本测试没有 OAuth 这一步。', 503); }
  async password() { this.calls.push('password'); return {}; }
  async logout() { this.calls.push('logout'); return {}; }
}

/** 最简 Cookie 客户端：fetch 不管 Cookie，权限验收必须自己带上它。 */
class Client {
  constructor(base) {
    this.base = base;
    this.cookies = new Map();
    this.csrf = null;
  }
  header() {
    return [...this.cookies].map(([name, value]) => `${name}=${value}`).join('; ');
  }
  absorb(response) {
    for (const raw of response.headers.getSetCookie()) {
      const pair = raw.split(';')[0];
      const at = pair.indexOf('=');
      const name = pair.slice(0, at).trim();
      const value = pair.slice(at + 1).trim();
      if (value === '') this.cookies.delete(name); else this.cookies.set(name, value);
    }
  }
  async request(path, { method = 'GET', body, csrf = true, origin = PUBLIC_ORIGIN } = {}) {
    const headers = { 'Content-Type': 'application/json' };
    if (origin) headers.Origin = origin;
    if (this.cookies.size) headers.Cookie = this.header();
    if (csrf && this.csrf && method !== 'GET') headers['x-mcs-csrf'] = this.csrf;
    const response = await fetch(this.base + path, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      redirect: 'manual',
    });
    this.absorb(response);
    const text = await response.text();
    let payload = null;
    try { payload = JSON.parse(text); } catch { /* 非 JSON 响应（静态页）留给调用方看 text */ }
    return { status: response.status, payload, text, headers: response.headers };
  }
  async openSession() {
    const { payload } = await this.request('/api/v2/auth/session');
    this.csrf = payload?.data?.csrfToken ?? null;
    return payload?.data ?? null;
  }
  async login(email, password = 'a-long-enough-password') {
    await this.openSession();
    return this.request('/api/v2/auth/login', { method: 'POST', body: { email, password } });
  }
}

async function startPublicServer(provider) {
  const dir = mkdtempSync(join(tmpdir(), 'mcs-auth-test-'));
  /*
   * 公网模式跑在**真实 PostgreSQL** 上（PGlite：内嵌 WASM 版，不用起服务）。
   * 这一条很关键：会话表、归属表与学习者数据在公网模式下都在 PostgreSQL 里，
   * 用 SQLite 测出来的"通过"证明不了线上那条路。
   */
  const pg = new PGlite();
  const config = {
    host: '127.0.0.1',
    port: 0,
    dataDir: join(REPO_ROOT, 'mcs-web', 'data'),
    dbFile: join(dir, 'mcs-web.sqlite3'),
    dbUrl: 'postgres://pglite/test',
    authoringDbFile: join(dir, 'authoring.sqlite3'),
    extensionsDir: join(dir, 'extensions'),
    staticDir: join(dir, 'static'),
    backupDir: join(dir, 'backups'),
    authFile: join(dir, 'auth.sqlite3'),
    repoRoot: REPO_ROOT,
    dev: false,
    publicMode: true,
    publicOrigin: PUBLIC_ORIGIN,
    /* 测试从 127.0.0.1 发请求，Host 头就是它；站点域名也要在白名单里。 */
    allowedHosts: ['mcs.test', '127.0.0.1'],
    auth: {
      mode: 'supabase',
      provider: 'supabase',
      url: 'https://project.supabase.co',
      publishableKey: 'sb_publishable_test',
      sessionKey: randomBytes(32).toString('base64'),
      adminUserIds: ['user-admin'],
      emailEnabled: false,
    },
    tutor: {
      enabled: false,
      adapter: 'deeptutor-1.5',
      baseUrl: 'http://127.0.0.1:1',
      frontendUrl: 'http://127.0.0.1:1',
      authTokenEnv: 'MCS_WEB_TEST_MISSING_TOKEN',
      timeoutMs: 500,
      healthTimeoutMs: 200,
      liveVerified: false,
    },
  };
  const handle = await startServer({ config, authProvider: provider, learnerPool: pg });
  return {
    ...handle,
    dir,
    async cleanup() {
      try { handle.jobs.close(); } catch { /* 已关闭 */ }
      try { await handle.db.close(); } catch { /* 已关闭 */ }
      try { await handle.auth.close(); } catch { /* 已关闭 */ }
      try { await pg.close(); } catch { /* 已关闭 */ }
      await new Promise((resolvePromise) => handle.server.close(resolvePromise));
      const parent = resolve(tmpdir()) + sep;
      if (resolve(dir).startsWith(parent)) rmSync(dir, { recursive: true, force: true });
    },
  };
}

test('公网模式：未登录只能读公共本体，个人数据一律 401', async () => {
  const provider = new StubProvider();
  const server = await startPublicServer(provider);
  try {
    const guest = new Client(server.origin);
    const health = await guest.request('/api/v2/health');
    assert.equal(health.status, 200, '健康检查对公网开放');
    const ontology = await guest.request('/api/v2/ontology');
    assert.equal(ontology.status, 200, '公共本体对公网开放');

    for (const [method, path] of [['GET', '/api/v2/profiles'], ['POST', '/api/v2/plans'], ['POST', '/api/v2/backup']]) {
      const response = await guest.request(path, { method });
      assert.equal(response.status, 401, `${method} ${path} 未登录必须是 401`);
      assert.equal(response.payload.error.code, 'AUTH_REQUIRED');
    }
  } finally {
    await server.cleanup();
  }
});

test('公网模式：两个账号的数据互不可见、互不可改（越权一律 404）', async () => {
  const provider = new StubProvider();
  provider.add('user-a', 'a@example.com');
  provider.add('user-b', 'b@example.com');
  const server = await startPublicServer(provider);
  try {
    const a = new Client(server.origin);
    const loginA = await a.login('a@example.com');
    assert.equal(loginA.status, 200, JSON.stringify(loginA.payload));
    assert.equal(loginA.payload.data.signedIn, true);

    const created = await a.request('/api/v2/profiles', { method: 'POST', body: { name: 'A 的档案' } });
    assert.equal(created.status, 200, JSON.stringify(created.payload));
    const profileId = created.payload.data.profile.id;

    const mine = await a.request('/api/v2/profiles');
    assert.deepEqual(mine.payload.data.profiles.map((profile) => profile.id), [profileId], 'A 看到自己的档案');

    const b = new Client(server.origin);
    assert.equal((await b.login('b@example.com')).status, 200);
    const theirs = await b.request('/api/v2/profiles');
    assert.deepEqual(theirs.payload.data.profiles, [], 'B 的档案清单里不出现 A 的档案');

    /* 逐条走一遍「拿到 id 就能碰」的路子：读取、改写、导出、删掉、写事件、写笔记。 */
    const attempts = [
      ['GET', `/api/v2/profiles/${profileId}`],
      ['PATCH', `/api/v2/profiles/${profileId}`, { name: '改名' }],
      ['DELETE', `/api/v2/profiles/${profileId}`],
      ['GET', `/api/v2/profiles/${profileId}/export`],
      ['GET', `/api/v2/profiles/${profileId}/events`],
      ['POST', `/api/v2/profiles/${profileId}/events`, { eventId: 'e1', ontologyVersion: 'x', kind: 'view', nodeId: 'bg:real:metric', occurredAt: '2026-10-05T00:00:00.000Z', baseRevision: null, source: { kind: 'system', ref: 'test' }, evidenceRefs: [], payload: { context: 'read' } }],
      ['POST', `/api/v2/profiles/${profileId}/notes`, { title: '偷偷写', body: 'x' }],
    ];
    for (const [method, path, body] of attempts) {
      const response = await b.request(path, { method, body });
      assert.equal(response.status, 404, `${method} ${path} 越权必须 404（不能是 403 或 200）`);
      assert.equal(response.payload.error.code, 'NOT_FOUND');
    }

    /* A 自己仍然读得到——上面的 404 是归属判定，不是把接口整体关掉。 */
    const stillMine = await a.request(`/api/v2/profiles/${profileId}`);
    assert.equal(stillMine.status, 200);

    /* 带 profileId 的公共纯计算接口同样要判归属：只看路径会漏掉这条路。 */
    const computed = await b.request('/api/v2/localizations/LC01/compute', { method: 'POST', body: { profileId } });
    assert.equal(computed.status, 404, 'body 里的 profileId 也要判归属');
  } finally {
    await server.cleanup();
  }
});

test('公网模式：入库、发布、备份恢复只有管理员能做', async () => {
  const provider = new StubProvider();
  provider.add('user-a', 'a@example.com');
  provider.add('user-admin', 'admin@example.com');
  const server = await startPublicServer(provider);
  try {
    const user = new Client(server.origin);
    assert.equal((await user.login('a@example.com')).status, 200);
    const denied = [
      ['POST', '/api/v2/backup'],
      ['POST', '/api/v2/restore', { backup: 'x' }],
      ['GET', '/api/v2/authoring/drafts'],
      ['GET', '/api/v2/authoring/revisions'],
      ['GET', '/api/v2/maintenance/sources'],
      ['POST', '/api/v2/relation-discovery/jobs', {}],
    ];
    for (const [method, path, body] of denied) {
      const response = await user.request(path, { method, body });
      assert.equal(response.status, 403, `${method} ${path} 普通用户必须 403`);
      assert.equal(response.payload.error.code, 'FORBIDDEN');
    }

    const admin = new Client(server.origin);
    assert.equal((await admin.login('admin@example.com')).status, 200);
    const maintenance = await admin.request('/api/v2/maintenance/sources');
    assert.equal(maintenance.status, 200, '管理员能读维护视图');
    const backup = await admin.request('/api/v2/backup', { method: 'POST' });
    assert.equal(backup.status, 200, '管理员能全站备份');
  } finally {
    await server.cleanup();
  }
});

test('公网模式：写请求缺 CSRF 令牌一律 403，会话 Cookie 带 __Host- 前缀', async () => {
  const provider = new StubProvider();
  provider.add('user-a', 'a@example.com');
  const server = await startPublicServer(provider);
  try {
    const client = new Client(server.origin);
    const session = await client.openSession();
    assert.equal(session.mode, 'supabase');
    assert.ok(session.csrfToken, '未登录也会拿到 CSRF 令牌（登录本身要它）');

    const signedIn = await client.login('a@example.com');
    assert.equal(signedIn.status, 200);
    const raw = [...client.cookies.keys()].sort();
    assert.ok(raw.includes('__Host-mcs_session'), `会话 Cookie 必须是 __Host- 前缀：${raw.join(',')}`);
    assert.ok(raw.includes('__Host-mcs_csrf'));

    /*
     * 属性要看**发下来的那一条** `Set-Cookie`（登录响应里的会话 Cookie），
     * 不是再看一次 `/auth/session`——那一次没有新 Cookie 要发，断言会读到空串。
     */
    const issued = signedIn.headers.getSetCookie().join(' | ');
    const sessionCookie = signedIn.headers.getSetCookie().find((line) => line.startsWith('__Host-mcs_session=')) ?? '';
    assert.ok(sessionCookie, `登录响应必须下发会话 Cookie：${issued}`);
    assert.match(sessionCookie, /HttpOnly/, '会话 Cookie 必须 HttpOnly');
    assert.match(sessionCookie, /Secure/, '公网模式会话 Cookie 必须 Secure');
    assert.match(sessionCookie, /SameSite=Lax/, '会话 Cookie 必须是 SameSite=Lax');
    assert.doesNotMatch(sessionCookie, /Domain=/i, '__Host- 前缀禁止 Domain 属性');

    /* 带上 Cookie 但不带 CSRF 头：这正是跨站表单能伪造出来的请求形态。 */
    const noCsrf = await client.request('/api/v2/profiles', { method: 'POST', body: { name: '无令牌' }, csrf: false });
    assert.equal(noCsrf.status, 403);
    assert.equal(noCsrf.payload.error.code, 'CSRF_REJECTED');

    /* 来源不是本站：写请求必须拒绝（与令牌是两种独立的失效方式）。 */
    const foreign = await client.request('/api/v2/profiles', { method: 'POST', body: { name: '外站' }, origin: 'https://evil.example' });
    assert.equal(foreign.status, 403, '写请求来源与站点地址不一致时必须 403');
    assert.equal(foreign.payload.error.code, 'FORBIDDEN');

    /* 令牌 + 来源都对，同一个请求就应当成功——否则上面的 403 可能只是「接口坏了」。 */
    const ok = await client.request('/api/v2/profiles', { method: 'POST', body: { name: '正常写入' } });
    assert.equal(ok.status, 200);
  } finally {
    await server.cleanup();
  }
});

test('公网模式：邮箱未验证的账号不许建立会话', async () => {
  const provider = new StubProvider();
  provider.add('user-u', 'unverified@example.com', { confirmed: false });
  const server = await startPublicServer(provider);
  try {
    const client = new Client(server.origin);
    const response = await client.login('unverified@example.com');
    assert.equal(response.status, 401);
    assert.equal(response.payload.error.code, 'AUTH_REQUIRED');
    assert.equal(client.cookies.has('__Host-mcs_session'), false, '被拒绝时不能留下会话 Cookie');
  } finally {
    await server.cleanup();
  }
});

test('本机模式：账号层不改变任何行为（身份是本机管理员）', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'mcs-local-auth-'));
  const config = {
    host: '127.0.0.1',
    port: 0,
    dataDir: join(REPO_ROOT, 'mcs-web', 'data'),
    dbFile: join(dir, 'mcs-web.sqlite3'),
    authoringDbFile: join(dir, 'authoring.sqlite3'),
    extensionsDir: join(dir, 'extensions'),
    staticDir: join(dir, 'static'),
    backupDir: join(dir, 'backups'),
    authFile: join(dir, 'auth.sqlite3'),
    repoRoot: REPO_ROOT,
    dev: true,
    publicMode: false,
    publicOrigin: null,
    allowedHosts: [],
    auth: { mode: 'none', provider: null, url: null, publishableKey: null, sessionKey: null, adminUserIds: [], emailEnabled: true },
    tutor: { enabled: false, adapter: 'deeptutor-1.5', baseUrl: 'http://127.0.0.1:1', frontendUrl: 'http://127.0.0.1:1', authTokenEnv: 'MCS_WEB_TEST_MISSING_TOKEN', timeoutMs: 500, healthTimeoutMs: 200, liveVerified: false },
  };
  const server = await startServer({ config });
  try {
    const client = new Client(server.origin);
    const session = await client.openSession();
    assert.equal(session.mode, 'local', '本机模式如实说明没有在线账号');

    const created = await client.request('/api/v2/profiles', { method: 'POST', body: { name: '本机档案' } });
    assert.equal(created.status, 200, '本机模式不需要登录');
    const profiles = await client.request('/api/v2/profiles');
    assert.equal(profiles.payload.data.profiles.length, 1);
    const maintenance = await client.request('/api/v2/maintenance/sources');
    assert.equal(maintenance.status, 200, '本机模式维护视图照常可用（本机身份即管理员）');
  } finally {
    try { server.jobs.close(); } catch { /* 已关闭 */ }
    try { await server.db.close(); } catch { /* 已关闭 */ }
    try { await server.auth.close(); } catch { /* 已关闭 */ }
    await new Promise((resolvePromise) => server.server.close(resolvePromise));
    rmSync(dir, { recursive: true, force: true });
  }
});

/** 可控的假工作线程：让「排队 / 并发 / 取消」的断言不依赖真实线程的完成时机。 */
class FakeWorker extends EventEmitter {
  constructor() { super(); this.terminated = false; }
  terminate() { this.terminated = true; return Promise.resolve(0); }
  finish(result) { this.emit('message', { ok: true, result }); }
}

test('任务队列：并发与队列有界，每账号配额当场报 429', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'mcs-jobs-test-'));
  const workers = [];
  const jobs = new JobManager({
    dataDir: join(REPO_ROOT, 'mcs-web', 'data'),
    extensionsDir: join(dir, 'extensions'),
    repoRoot: REPO_ROOT,
    maxConcurrent: 1,
    maxQueued: 2,
    perUserRunning: 1,
    perUserQueued: 1,
    maxDurationMs: 60000,
    spawnWorker: () => { const worker = new FakeWorker(); workers.push(worker); return worker; },
  });
  const request = { goalId: 'bg:real:metric' };
  try {
    const first = jobs.run(request, { owner: 'user-a' });
    assert.equal(jobs.get(first.id).status, 'running', '有空位立刻开跑');
    assert.equal(jobs.stats().running, 1);
    assert.equal(workers.length, 1);

    assert.throws(
      () => jobs.run(request, { owner: 'user-a' }),
      (error) => error.code === 'RESOURCE_EXHAUSTED' && error.status === 429,
      '同一个人不能同时占两个运行中的任务',
    );

    const second = jobs.run(request, { owner: 'user-b' });
    assert.equal(jobs.get(second.id).status, 'queued', '并发满员时进队列');
    assert.ok(jobs.get(second.id).queuePosition >= 1, '排队位置要如实给出');
    assert.equal(workers.length, 1, '排队中的任务不许先起线程');

    const third = jobs.run(request, { owner: 'user-c' });
    assert.equal(jobs.get(third.id).status, 'queued');

    assert.throws(() => jobs.run(request, { owner: 'user-d' }), (error) => error.code === 'RESOURCE_EXHAUSTED', '队列满了当场拒绝，不假装收下');

    const cancelled = jobs.cancel(second.id);
    assert.equal(cancelled.cancelled, true, '排队中的任务可以取消');
    assert.equal(jobs.get(second.id).status, 'cancelled');
    assert.equal(jobs.stats().queued, 1, '取消之后队列立刻少一项');

    /* 运行中的任务结束后，队列要**自动**推进——否则取消与完成都会让队列卡住。 */
    workers[0].finish({ plan: 'ok' });
    assert.equal(jobs.get(first.id).status, 'done');
    assert.equal(jobs.get(third.id).status, 'running', '前一个算完之后队首自动开始');
    assert.equal(workers.length, 2);

    assert.throws(() => jobs.get('job-不存在'), (error) => error.code === 'NOT_FOUND');

    const running = jobs.cancel(third.id);
    assert.equal(running.cancelled, true, '运行中的任务也能取消');
    assert.equal(workers[1].terminated, true, '取消运行中的任务要真的终止线程');
  } finally {
    jobs.close();
    rmSync(dir, { recursive: true, force: true });
  }
});
