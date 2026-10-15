import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { AuthService, validateAuthConfig } from '../server/auth.mjs';

const official = 'https://mcs.test', sites = 'https://mcs-workbench.test';
const secret = randomBytes(32).toString('base64url');
const config = { publicMode: true, publicOrigin: official,
  auth: { mode: 'supabase', url: 'https://project.supabase.co', publishableKey: 'test',
    sessionKey: randomBytes(32).toString('base64'), adminUserIds: ['owner'] }, sitesBridge: { origin: sites, secret } };

class Store {
  values = new Map();
  async put(kind, id, value, expires) { this.values.set(kind + ':' + id, { value, expires }); }
  async get(kind, id) { const row = this.values.get(kind + ':' + id); return row && row.expires > Date.now() ? row.value : null; }
  async remove(kind, id) { this.values.delete(kind + ':' + id); }
  async consume(kind, id) { const value = await this.get(kind, id); await this.remove(kind, id); return value; }
}
function fixture() {
  const provider = { async oauthStart(callback) { this.callback = callback; return { url: 'https://project.supabase.co/authorize?provider=github', storage: { pkce: 'original-verifier' } }; },
    async oauthFinish(code, storage) { assert.equal(code, 'verified-code'); assert.deepEqual(storage, { pkce: 'original-verifier' }); return { session: { access_token: 'access', refresh_token: 'refresh', expires_at: Date.now() / 1000 + 3600 } }; },
    async user(access) { assert.equal(access, 'access'); return { id: 'owner', email: 'owner@example.test', email_confirmed_at: 'confirmed' }; } };
  return { auth: new AuthService({ config, store: new Store(), provider }), provider };
}
async function call(auth, path, { method = 'GET', cookies = new Map(), proxy = false, csrf = null, origin = official } = {}) {
  const req = { url: path, method, headers: { cookie: [...cookies].map(([k,v]) => k + '=' + v).join('; '), origin, 'content-type': 'application/json', ...(csrf ? { 'x-mcs-csrf': csrf } : {}),
    ...(proxy ? { 'x-mcs-sites-origin': sites, 'x-mcs-sites-secret': secret } : {}) }, socket: { remoteAddress: 'browser' }, async *[Symbol.asyncIterator]() { yield Buffer.from('{}'); } };
  const headers = new Map();
  const res = { status: null, body: '', getHeader: key => headers.get(key), setHeader: (key, value) => headers.set(key, value),
    writeHead(status, extra) { this.status = status; for (const [key,value] of Object.entries(extra)) headers.set(key, value); }, end(body = '') { this.body = body; } };
  assert.equal(await auth.handle(req, res), true);
  for (const raw of headers.get('Set-Cookie') ?? []) { const [name,value] = raw.split(';')[0].split('='); if (value) cookies.set(name,value); else cookies.delete(name); }
  let payload; try { payload = JSON.parse(res.body); } catch { /* Redirect. */ }
  return { status: res.status, headers, payload };
}

async function throughOAuth() {
  const { auth, provider } = fixture(), siteCookies = new Map(), officialCookies = new Map();
  const session = await call(auth, '/api/v2/auth/session', { cookies: siteCookies, proxy: true });
  const start = await call(auth, '/api/v2/auth/github', { method: 'POST', cookies: siteCookies, proxy: true, csrf: session.payload.data.csrfToken });
  assert.equal(start.status, 200);
  const launch = new URL(start.payload.data.url);
  assert.equal(launch.origin, official);
  assert.equal(launch.pathname, '/api/v2/auth/sites-start');
  const forwarded = await call(auth, launch.pathname + launch.search, { cookies: officialCookies });
  assert.equal(forwarded.status, 303);
  assert.equal(new URL(forwarded.headers.get('Location')).origin, 'https://project.supabase.co');
  assert.notEqual(siteCookies.get('__Host-mcs_oauth'), officialCookies.get('__Host-mcs_oauth'));
  const callback = new URL(provider.callback);
  callback.searchParams.set('code', 'verified-code');
  const finished = await call(auth, callback.pathname + callback.search, { cookies: officialCookies });
  assert.equal(finished.status, 303);
  assert.equal(officialCookies.has('__Host-mcs_session'), false);
  const landing = new URL(finished.headers.get('Location'));
  assert.equal(landing.origin, sites);
  assert.equal(landing.pathname, '/api/v2/auth/sites-callback');
  return { auth, siteCookies, landing, callback, officialCookies };
}

test('GitHub login returns to the same Sites browser and establishes its existing MCS account', async () => {
  validateAuthConfig(config);
  const { auth, siteCookies, landing } = await throughOAuth();
  const res = await call(auth, landing.pathname + landing.search, { cookies: siteCookies, proxy: true });
  assert.equal(res.status, 303);
  assert.equal(res.headers.get('Location'), '/profile');
  assert.equal(siteCookies.has('__Host-mcs_session'), true);
  assert.equal(siteCookies.has('__Host-mcs_oauth'), false);
  assert.ok(res.headers.get('Set-Cookie').some(cookie => cookie.includes('HttpOnly') && cookie.includes('Secure') && cookie.includes('SameSite=Lax')));
  const session = await call(auth, '/api/v2/auth/session', { cookies: siteCookies, proxy: true });
  assert.equal(session.payload.data.user.id, 'owner');
  assert.equal(session.payload.data.user.role, 'admin');
  assert.equal((await call(auth, landing.pathname + landing.search, { cookies: siteCookies, proxy: true })).status, 401);
});

test('relay rejects other browsers and untrusted proxies without consuming the rightful browser ticket', async () => {
  const { auth, siteCookies, landing, callback, officialCookies } = await throughOAuth();
  assert.equal((await call(auth, landing.pathname + landing.search, { cookies: new Map(), proxy: true })).status, 401);
  assert.equal((await call(auth, landing.pathname + landing.search, { cookies: siteCookies })).status, 401);
  assert.equal((await call(auth, callback.pathname + callback.search, { cookies: officialCookies })).status, 401);
  assert.equal((await call(auth, landing.pathname + landing.search, { cookies: siteCookies, proxy: true })).status, 303);
});

test('ordinary GitHub flow and CSRF verification stay active', async () => {
  const { auth, provider } = fixture(), cookies = new Map();
  assert.equal((await call(auth, '/api/v2/auth/github', { method: 'POST', cookies, proxy: true })).status, 403);
  const session = await call(auth, '/api/v2/auth/session', { cookies });
  const start = await call(auth, '/api/v2/auth/github', { method: 'POST', cookies, csrf: session.payload.data.csrfToken });
  assert.equal(new URL(start.payload.data.url).origin, 'https://project.supabase.co');
  const callback = new URL(provider.callback); callback.searchParams.set('code', 'verified-code');
  assert.equal((await call(auth, callback.pathname + callback.search, { cookies })).status, 303);
  assert.equal(cookies.has('__Host-mcs_session'), true);
});

test('invalid and partially configured bridges are rejected before server launch', () => {
  for (const sitesBridge of [{ origin: sites, secret: 'short' }, { origin: sites + '/wrong', secret }, { origin: 'http://mcs.test', secret }, { origin: sites }]) {
    assert.throws(() => validateAuthConfig({ ...config, sitesBridge }));
  }
  validateAuthConfig({ ...config, sitesBridge: { origin: null, secret: null } });
});
