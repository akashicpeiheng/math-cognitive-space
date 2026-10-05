/*
 * 部署边界验收（2026-10 发布前加）。
 *
 * 这一组盯的是「把本机工作台放到公网上」这件事的**失败方向**：
 * 配置不满足时必须在监听端口之前拒绝启动，而不是启动成一个
 * 「谁都能读改所有学习记录、发布公共内容」的服务。
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { assertDeploymentSafety, isAllowedHost, checkWriteOrigin, securityHeaders, normalizeHost } from '../server/deployment.mjs';
import { startServer } from '../server/index.mjs';
import { loadConfig } from '../server/config.mjs';

/*
 * 本机模式用 `dev: false`：dev 会跳过来源校验（开发机上的 Vite 跨端口调试需要），
 * 而这里要验的正是**非 dev** 时那条「只认回环」的规则。
 */
const localConfig = () => ({ ...loadConfig(), dev: false, host: '127.0.0.1', publicMode: false });

function publicConfig(overrides = {}) {
  return {
    ...loadConfig(),
    dev: false,
    host: '0.0.0.0',
    publicMode: true,
    publicOrigin: 'https://mcs.example.com',
    allowedHosts: ['mcs.example.com'],
    auth: { mode: 'supabase', provider: 'supabase' },
    // 公网模式要求 PostgreSQL（本地 SQLite 会在重启 / 换实例时丢掉全部学习记录）。
    dbUrl: 'postgres://mcs.example.com/mcs',
    ...overrides,
  };
}

test('本机模式：允许回环监听，拒绝把监听地址开成 0.0.0.0', () => {
  assert.equal(assertDeploymentSafety(localConfig()).mode, 'local');
  assert.throws(
    () => assertDeploymentSafety({ ...localConfig(), host: '0.0.0.0' }),
    (error) => error.status === 500 && /本机模式的监听地址只能是回环/.test(error.message),
  );
});

test('公网模式：缺 origin / 非 https / 空 Host 白名单都要拒绝', () => {
  assert.throws(() => assertDeploymentSafety(publicConfig({ publicOrigin: null })), /必须配置 publicOrigin/);
  assert.throws(() => assertDeploymentSafety(publicConfig({ publicOrigin: 'http://mcs.example.com' })), /必须是 https/);
  assert.throws(() => assertDeploymentSafety(publicConfig({ allowedHosts: [] })), /必须显式配置 allowedHosts/);
  assert.throws(
    () => assertDeploymentSafety(publicConfig({ allowedHosts: ['other.example.com'] })),
    /不在 allowedHosts 里/,
  );
});

/*
 * 发布审查的核心结论：没有账号体系时，公网模式必须**拒绝启动**。
 * 因为 `/api/v2/profiles` 会列出全部档案，而写入口没有身份边界。
 * （消息里的"必须"与"要求"是 2026-10-05 改过的措辞，断言跟着改。）
 */
test('公网模式：账号体系未接入时拒绝启动（失败朝安全一侧倒）', () => {
  assert.throws(
    () => assertDeploymentSafety(publicConfig({ auth: { mode: 'none', provider: null } })),
    (error) => error.status === 500 && /公网模式必须接入账号体系/.test(error.message),
  );
  assert.equal(assertDeploymentSafety(publicConfig()).mode, 'public');
});

/*
 * 公网模式不许用容器本地 SQLite（2026-10-05 加）。
 * 学习记录不是缓存：重启、重新部署、换实例都会让它整个消失，
 * 所以这条同样是"宁可不启动"。
 *
 * 同日补的例外：**自托管**（服务跑在自己的机器上，磁盘本来就是持久的）
 * 可以显式开 `allowLocalDb`；关键在于它是**显式**的——默认仍然拒绝。
 */
test('公网模式：没有 PostgreSQL 连接串时拒绝启动（自托管需显式开例外）', () => {
  assert.throws(
    () => assertDeploymentSafety(publicConfig({ dbUrl: null })),
    (error) => error.status === 500 && /必须配置 PostgreSQL 连接串/.test(error.message),
  );
  assert.throws(
    () => assertDeploymentSafety(publicConfig({ dbUrl: null, allowLocalDb: false })),
    /必须配置 PostgreSQL 连接串/,
  );
  assert.equal(assertDeploymentSafety(publicConfig({ dbUrl: 'postgres://db/mcs' })).mode, 'public');
  const selfHosted = assertDeploymentSafety(publicConfig({ dbUrl: null, allowLocalDb: true }));
  assert.equal(selfHosted.mode, 'public');
  assert.equal(selfHosted.storage, 'sqlite-local', '自托管时要如实标出存储是本地 SQLite');
  assert.equal(assertDeploymentSafety(publicConfig({ dbUrl: 'postgres://db/mcs' })).storage, 'postgres');
});

test('本机配置默认不允许自托管例外（不能靠环境变量漏进来）', () => {
  assert.equal(loadConfig().allowLocalDb, false);
});

test('Host 白名单：本机只认回环，公网只认显式清单（含子域通配）', () => {
  assert.equal(normalizeHost('[::1]:3784'), '::1');
  assert.equal(normalizeHost('example.com:443'), 'example.com');

  assert.equal(isAllowedHost('127.0.0.1:3784', localConfig()), true);
  assert.equal(isAllowedHost('localhost', localConfig()), true);
  assert.equal(isAllowedHost('evil.example.com', localConfig()), false);

  assert.equal(isAllowedHost('mcs.example.com', publicConfig()), true);
  assert.equal(isAllowedHost('mcs.example.com:443', publicConfig()), true);
  assert.equal(isAllowedHost('evil.example.com', publicConfig()), false);
  // 没配白名单时不能「全放行」。
  assert.equal(isAllowedHost('mcs.example.com', publicConfig({ allowedHosts: [] })), false);
  assert.equal(isAllowedHost('learn.mcs.example.com', publicConfig({ allowedHosts: ['*.mcs.example.com'] })), true);
  // 通配不能匹配裸域名本身。
  assert.equal(isAllowedHost('mcs.example.com', publicConfig({ allowedHosts: ['*.mcs.example.com'] })), false);
});

test('写请求来源：本机只认回环；公网必须带 Origin 且与站点地址一致', () => {
  assert.equal(checkWriteOrigin({ headers: { origin: 'http://127.0.0.1:3784' } }, localConfig()), true);
  assert.equal(checkWriteOrigin({ headers: {} }, localConfig()), true, '本机命令行（curl/测试）没有 Origin 时放行');
  assert.throws(() => checkWriteOrigin({ headers: { origin: 'https://evil.example.com' } }, localConfig()), (error) => error.status === 403);

  assert.equal(checkWriteOrigin({ headers: { origin: 'https://mcs.example.com' } }, publicConfig()), true);
  assert.throws(() => checkWriteOrigin({ headers: {} }, publicConfig()), (error) => error.status === 403, '公网缺 Origin 必须拒绝');
  assert.throws(() => checkWriteOrigin({ headers: { origin: 'https://evil.example.com' } }, publicConfig()), (error) => error.status === 403);
});

test('安全响应头：生产 CSP 不允许内联脚本，且禁止被 iframe 嵌套', () => {
  const headers = securityHeaders({ dev: false });
  assert.match(headers['Content-Security-Policy'], /script-src 'self';/);
  assert.ok(!/script-src[^;]*unsafe-inline/.test(headers['Content-Security-Policy']));
  assert.match(headers['Content-Security-Policy'], /frame-ancestors 'none'/);
  assert.equal(headers['X-Content-Type-Options'], 'nosniff');
  assert.equal(headers['Referrer-Policy'], 'no-referrer');
  assert.equal(headers['X-Frame-Options'], 'DENY');
});

/*
 * 端到端：`startServer` 在公网模式缺账号体系时必须**抛出**，不监听端口。
 * 只测「抛不抛」，不去碰本机 runtime 数据库。
 */
test('startServer：公网模式缺账号体系时拒绝监听', async () => {
  await assert.rejects(
    () => startServer({ config: publicConfig({ auth: { mode: 'none' } }) }),
    /公网模式必须接入账号体系/,
  );
});

/*
 * 账号体系「配了但不完整」同样不许启动：URL 不是 https、会话密钥长度不对、
 * 管理员没显式指定——这三种都是部署时最容易漏的，必须在监听端口之前报出来。
 */
test('startServer：公网模式账号配置不完整时拒绝监听', async () => {
  const base = { mode: 'supabase', url: 'https://project.supabase.co', publishableKey: 'pk', sessionKey: Buffer.alloc(32, 7).toString('base64'), adminUserIds: ['user-admin'] };
  await assert.rejects(
    () => startServer({ config: publicConfig({ auth: { ...base, url: 'http://project.supabase.co' } }) }),
    /Supabase URL 必须是无凭据的 HTTPS 根地址/,
  );
  await assert.rejects(
    () => startServer({ config: publicConfig({ auth: { ...base, sessionKey: 'short' } }) }),
    /会话加密密钥必须是 32 个随机字节/,
  );
  await assert.rejects(
    () => startServer({ config: publicConfig({ auth: { ...base, adminUserIds: [] } }) }),
    /管理员必须按认证服务的用户 ID 显式配置/,
  );
});

test('startServer：本机模式监听 0.0.0.0 时拒绝监听', async () => {
  await assert.rejects(
    () => startServer({ config: { ...localConfig(), host: '0.0.0.0' } }),
    /本机模式的监听地址只能是回环/,
  );
});
