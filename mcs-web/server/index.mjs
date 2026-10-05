import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { existsSync, statSync } from 'node:fs';
import { resolve, extname, join, normalize } from 'node:path';
import { loadConfig } from './config.mjs';
import { loadOntology } from '../core/ontology.mjs';
import { createOntologySource } from './snapshot.mjs';
import { McsDatabase } from './db.mjs';
import { createDriverFromConfig } from './sql-driver.mjs';
import { JobManager } from './jobs.mjs';
import { TutorAdapter } from './tutor.mjs';
import { createApi } from './api.mjs';
import { createAuth, validateAuthConfig } from './auth.mjs';
import { assertDeploymentSafety, isAllowedHost, securityHeaders } from './deployment.mjs';

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  /*
   * `.webp` 必须在这里显式登记：末幕人像用的是带 alpha 的 WebP，
   * 漏了它就会落到下面的 `?? 'application/octet-stream'`，浏览器只能靠魔数嗅探，
   * 能不能显示全看运气（本机 2026-10 实测：缺失时确实返回 octet-stream）。
   */
  '.webp': 'image/webp',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ttf': 'font/ttf',
  '.map': 'application/json; charset=utf-8',
};

/**
 * 启动服务。
 *
 * ## 本体从哪来（P1-7 的修复点，2026-10 改）
 *
 * `ontologySource` **缺省就创建**（`server/snapshot.mjs` 的快照源：基础数据 + 当前激活的扩展包）。
 * 从前它是可选参数、默认 `null`，而没有任何调用方创建它 —— 于是「入库后新请求读新版本」这条
 * 承诺在默认启动下根本不存在：`getOntology()` 永远返回启动时那一份，发布成功了网站也读不到新节点。
 * 现在默认接上，不传参也能切版本；传了自定义源（测试夹具）就用传进来的那一份。
 *
 * `ontologySource.reload()` 之后，后续 `getOntology()` **立刻**返回新版本，
 * 发布事务成功后的那一次 reload（`server/publication.mjs` 第 6 步 / `api.mjs` 的回滚路径）因此生效。
 *
 * 每个请求在**进入时**取一次 `getOntology()` 并全程用同一个实例——
 * 这正是「入库后新请求读新版本，运行中的任务继续用原版本」在实现上的落点：
 * 快照一旦取到就不会在请求中途被换掉。
 *
 * 没传 `ontologySource` 时**不会**改变既有行为：`data/extensions/` 不存在（测试环境与首次启动）
 * 就等价于「只有基础数据」，`counts.nodes` 与从前一样。
 */
export async function startServer({ config = loadConfig(), ontologySource = null, authProvider = null, learnerPool = null } = {}) {
  /*
   * 监听端口之前先做部署自检：公网模式缺账号体系时**拒绝启动**。
   * 放在这里而不是「启动后每个请求再判」是有意的——一个没有身份边界的服务
   * 哪怕只对外开一秒，也已经是数据事故。
   */
  const deployment = assertDeploymentSafety(config);
  /*
   * 账号配置**先于**数据库连接校验：配置写错时要报"Supabase URL 不是 https"，
   * 而不是让一个连不上的数据库把真正的原因盖住（顺序反了会浪费一整个下午）。
   */
  validateAuthConfig(config);
  /*
   * 先建**驱动**再建认证：公网模式下会话表与学习者数据必须在同一个 PostgreSQL 里
   * （各用各的 SQLite 文件时，一次重启就把所有登录状态清空）。
   */
  const driver = await createDriverFromConfig(config, { pool: learnerPool });
  const db = new McsDatabase({ driver });
  await db.migrate();
  /*
   * 账号体系在**起线程、监听端口之前**初始化：公网模式的配置错误
   * （URL 不是 https、会话密钥不是 32 字节、管理员没配）必须让进程起不来，
   * 而不是等第一个用户登录时才报错。
   */
  const auth = await createAuth({ config, provider: authProvider, pool: driver.pool ?? null });
  const source = ontologySource ?? await createOntologySource({
    dataDir: config.dataDir,
    extensionsDir: config.extensionsDir ?? null,
    repoRoot: config.repoRoot ?? null,
  });
  const fixedOntology = source ? null : await loadOntology({ dataDir: config.dataDir });
  const getOntology = () => (source ? source.current() : fixedOntology);
  const ontology = getOntology();
  /*
   * 规划工作线程拿到的是**发起任务时那一刻的本体版本**（不是「让它自己去读一份」）：
   * worker 用同一份快照的版本标识复核，对不上就如实报错，不拿另一份数据算出「看起来对」的规划。
   */
  const jobs = new JobManager({
    dataDir: config.dataDir,
    extensionsDir: config.extensionsDir ?? null,
    repoRoot: config.repoRoot ?? null,
    getOntology,
  });
  const tutor = new TutorAdapter({ config, ontology, db });
  const handleApi = createApi({ getOntology, db, jobs, tutor, config, ontologySource: source, auth });

  async function serveStatic(req, res) {
    const url = new URL(req.url, `http://${req.headers.host ?? '127.0.0.1'}`);
    if (!['GET', 'HEAD'].includes(req.method)) { res.writeHead(405); res.end('Method Not Allowed'); return; }
    let pathname;
    try { pathname = decodeURIComponent(url.pathname); } catch { res.writeHead(400); res.end('Bad Request'); return; }
    const staticDir = resolve(config.staticDir);
    let target = resolve(staticDir, `.${normalize(pathname)}`);
    if (!target.startsWith(staticDir)) { res.writeHead(403); res.end('Forbidden'); return; }
    if (!existsSync(config.staticDir)) {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end('<!doctype html><meta charset="utf-8"><title>MCS Web</title><body style="font-family:system-ui;max-width:44rem;margin:4rem auto;line-height:1.7"><h1>MCS Web 尚未构建前端</h1><p>先运行 <code>npm run build</code>，再访问本页。API 已在本机运行，健康检查见 <a href="/api/v2/health">/api/v2/health</a>。</p></body>');
      return;
    }
    if (!existsSync(target) || statSync(target).isDirectory()) {
      target = join(staticDir, 'index.html');
    }
    try {
      const data = await readFile(target);
      res.writeHead(200, { 'Content-Type': MIME[extname(target).toLowerCase()] ?? 'application/octet-stream', 'Cache-Control': extname(target) === '.html' ? 'no-store' : 'public, max-age=3600' });
      if (req.method === 'HEAD') res.end(); else res.end(data);
    } catch {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Not Found');
    }
  }

  const server = createServer(async (req, res) => {
    try {
      const host = req.headers.host ?? '';
      if (!config.dev && !isAllowedHost(host, config)) {
        res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('Forbidden host');
        return;
      }
      // 安全响应头统一在这里挂，静态与 API 一致；下面的 writeHead 会用同一份头。
      for (const [name, value] of Object.entries(securityHeaders(config))) res.setHeader(name, value);
      /*
       * 认证入口在业务 API 之前：`/api/v2/auth/*` 自己处理请求体与状态码，
       * 不经过 createApi 的路由与授权层（否则「登录」这个动作本身也要先登录）。
       */
      if (await auth.handle(req, res)) return;
      if (await handleApi(req, res)) return;
      await serveStatic(req, res);
    } catch (error) {
      console.error('[mcs-web] request failed', error);
      if (!res.headersSent) res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ ok: false, error: { code: 'INTERNAL', message: '服务器内部错误' } }));
    }
  });

  await new Promise((resolvePromise) => server.listen(config.port, config.host, resolvePromise));
  const address = server.address();
  const actualPort = typeof address === 'object' && address ? address.port : config.port;
  const origin = `http://${config.host}:${actualPort}`;
  const shutdown = async () => {
    jobs.close();
    await db.close();
    await auth.close();
    server.close();
  };
  process.on('SIGINT', () => { shutdown().finally(() => process.exit(0)); });
  process.on('SIGTERM', () => { shutdown().finally(() => process.exit(0)); });
  /*
   * `ontology` 是启动时的那一份（旧调用方仍在用）；需要最新版请用 `getOntology()`。
   * `ontologySource` 返回的是**实际生效的那个快照源**（缺省创建的那一份也算），
   * 调用方据此 `reload()` / 读 `integrity()` / 取 `suspect()` 审查被拒绝的内容。
   * 旧读路由（`api.mjs` 里捕获启动 `ontology` 的那批）尚未接当前快照 —— 见 task-10 汇报。
   */
  return { server, ontology, getOntology, ontologySource: source, db, jobs, tutor, config, origin, deployment, auth };
}

const isMain = process.argv[1] && resolve(process.argv[1]) === resolve(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
if (isMain) {
  const config = loadConfig();
  startServer({ config }).then(({ origin, ontology, db }) => {
    const info = db.describe();
    console.log(`MCS Web 已启动：${origin}`);
    console.log(`本体版本：${ontology.version}`);
    console.log(info.dialect === 'sqlite' ? `数据文件：${info.file}` : `数据库：PostgreSQL（${info.label}）`);
  }).catch((error) => {
    console.error('MCS Web 启动失败：', error);
    process.exit(1);
  });
}
