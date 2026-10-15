import { createHash, timingSafeEqual } from 'node:crypto';
import { McsError } from '../shared/errors.mjs';

const digest = (value) => createHash('sha256').update(value).digest('hex');
const equal = (a, b) => typeof a === 'string' && typeof b === 'string'
  && Buffer.byteLength(a) === Buffer.byteLength(b) && timingSafeEqual(Buffer.from(a), Buffer.from(b));
const rejected = () => { throw new McsError('AUTH_REJECTED', 'Sites 登录请求已失效，请重新登录。', 401); };

/** Sites 只托管界面；OAuth 仍经过正式域名，回到原浏览器后才建立 Sites 会话。 */
export function validateSitesBridge(config) {
  const bridge = config.sitesBridge;
  if (!bridge?.origin && !bridge?.secret) return;
  let origin;
  try { origin = new URL(bridge.origin); } catch { /* 下面统一报配置错误。 */ }
  if (!config.publicMode || config.auth?.mode !== 'supabase' || !origin
    || origin.protocol !== 'https:' || origin.origin !== bridge.origin || origin.username || origin.password
    || typeof bridge.secret !== 'string' || !/^[\w-]{43}$/.test(bridge.secret)) {
    throw new McsError('BAD_REQUEST', 'Sites 接入需要公网认证、精确 HTTPS origin 和 32 字节随机接入密钥。', 500);
  }
}

export function isSitesProxy(req, config) {
  const bridge = config.sitesBridge;
  return Boolean(bridge?.origin && bridge?.secret
    && req.headers['x-mcs-sites-origin'] === bridge.origin
    && equal(req.headers['x-mcs-sites-secret'], bridge.secret));
}

export async function startSitesLogin(auth, req, res, random) {
  const nonce = random(), ticket = random();
  await auth.store.put('sites-start', digest(ticket), { nonce, origin: auth.config.sitesBridge.origin }, Date.now() + 120000);
  auth.cookie(res, 'oauth', nonce, 600);
  return { url: `${auth.config.publicOrigin}/api/v2/auth/sites-start?ticket=${ticket}` };
}

export async function handleSitesLogin(auth, req, res, url, random) {
  const action = url.pathname.slice('/api/v2/auth/'.length);
  if (!['sites-start', 'sites-callback'].includes(action)) return false;
  if (!auth.config.sitesBridge?.origin || req.method !== 'GET') rejected();
  const ticket = url.searchParams.get('ticket');
  if (!ticket || !/^[\w-]{43}$/.test(ticket)) rejected();
  auth.rate(req, 'sites-oauth', 20);
  if (action === 'sites-start') {
    const start = await auth.store.consume('sites-start', digest(ticket));
    if (!start || start.origin !== auth.config.sitesBridge.origin) rejected();
    const state = random();
    const flow = await auth.provider.oauthStart(`${auth.config.publicOrigin}/api/v2/auth/callback?state=${state}`);
    if (new URL(flow.url).origin !== new URL(auth.config.auth.url).origin) {
      throw new McsError('AUTH_UNAVAILABLE', '登录服务返回了非预期地址。', 503);
    }
    await auth.store.put('oauth', digest(state), { storage: auth.seal(flow.storage), sites: start }, Date.now() + 600000);
    auth.cookie(res, 'oauth', state, 600);
    res.writeHead(303, { Location: flow.url, 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' });
    res.end();
    return true;
  }
  if (!isSitesProxy(req, auth.config)) rejected();
  const nonce = auth.cookies(req)[auth.prefix + 'oauth'];
  const pending = await auth.store.get('sites-result', digest(ticket));
  if (!pending || pending.origin !== auth.config.sitesBridge.origin || !equal(nonce, pending.nonce)) rejected();
  const result = await auth.store.consume('sites-result', digest(ticket));
  if (!result) rejected();
  await auth.establish(req, res, auth.unseal(result.data));
  auth.cookie(res, 'oauth', '', 0);
  res.writeHead(303, { Location: '/profile', 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' });
  res.end();
  return true;
}

export async function finishSitesLogin(auth, res, flow, data, random) {
  if (!flow.sites) return false;
  if (flow.sites.origin !== auth.config.sitesBridge?.origin) rejected();
  const ticket = random();
  await auth.store.put('sites-result', digest(ticket), { ...flow.sites, data: auth.seal(data) }, Date.now() + 120000);
  res.writeHead(303, { Location: `${flow.sites.origin}/api/v2/auth/sites-callback?ticket=${ticket}`, 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' });
  res.end();
  return true;
}
