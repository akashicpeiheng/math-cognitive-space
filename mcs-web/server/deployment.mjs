/*
 * 部署边界：把「本机工作台」与「公网服务」这两种运行形态分开，并且**失败时朝安全一侧倒**。
 *
 * ## 为什么需要这一层
 *
 * 2026-10 发布前审查的结论：这个服务从设计上就是**本机**的——
 *
 * - `server/index.mjs` 在非 dev 模式只接受回环 Host，于是公网域名下整站 403；
 * - 自动关联 / 入库 / 发布 / 备份恢复这些写入口靠 `assertLocalOrigin` 保护，
 *   而它检查的也是「请求是不是从回环发起的」；
 * - 个人档案（E 层）没有任何账号概念，`/api/v2/profiles` 是**列出全部档案**的。
 *
 * 也就是说：把这套代码直接放到公网，要么处处 403（不工作），要么一旦有人
 * 放宽 Host 检查就变成「任何人都能读改所有人学习记录、发布公共内容、覆盖数据库」。
 * 两种结果都不能接受。
 *
 * 因此这里先立一条**不会说错话**的规则：
 *
 * > 公网模式（`publicMode`）在账号体系接入之前**拒绝启动**。
 *
 * 这不是「暂时不能用」，而是「宁可不启动，也不把没有身份边界的写入口暴露出去」。
 * 等账号与权限落地后，这个函数里 `auth` 那一项从「必须为真」变成实际检查即可，
 * 其余检查（HTTPS origin、允许的 Host、写请求来源）已经在位。
 */
import { McsError, CODES } from '../shared/errors.mjs';

const LOOPBACK_HOSTS = new Set(['127.0.0.1', 'localhost', '::1', '[::1]']);

/** 去掉端口、统一小写；`[::1]:3784` → `::1`。 */
export function normalizeHost(value) {
  const raw = String(value ?? '').trim().toLowerCase();
  if (!raw) return '';
  if (raw.startsWith('[')) {
    const end = raw.indexOf(']');
    return end === -1 ? raw : raw.slice(1, end);
  }
  const colon = raw.lastIndexOf(':');
  // 只有一个冒号且后面全是数字才是端口；`::1` 这种裸 IPv6 不动。
  if (colon !== -1 && raw.indexOf(':') === colon && /^\d+$/.test(raw.slice(colon + 1))) return raw.slice(0, colon);
  return raw;
}

export function isLoopbackHost(value) {
  const host = normalizeHost(value);
  return LOOPBACK_HOSTS.has(host) || LOOPBACK_HOSTS.has(`[${host}]`);
}

function hostMatches(host, pattern) {
  const normalized = String(pattern ?? '').trim().toLowerCase();
  if (!normalized) return false;
  if (normalized.startsWith('*.')) {
    const suffix = normalized.slice(1); // '.example.com'
    return host.endsWith(suffix) && host.length > suffix.length;
  }
  return host === normalized;
}

/**
 * Host 头是否属于被允许的服务地址。
 *
 * 本机模式：只认回环（保持既有行为）。
 * 公网模式：只认 `allowedHosts` 列表（显式配置，支持 `*.example.com`）。
 * 两者都不接受「没配置就全放行」。
 */
export function isAllowedHost(hostHeader, config) {
  const host = normalizeHost(hostHeader);
  if (!host) return false;
  if (!config?.publicMode) return isLoopbackHost(host);
  const allowed = Array.isArray(config.allowedHosts) ? config.allowedHosts : [];
  return allowed.some((pattern) => hostMatches(host, pattern));
}

/**
 * 公网部署的自检。**必须在监听端口之前调用**：宁可启动失败，
 * 也不要启动成一个「看起来在跑、实际谁都能写」的服务。
 *
 * @throws {McsError} 配置不满足公网部署条件时
 */
export function assertDeploymentSafety(config) {
  if (!config?.publicMode) {
    // 本机模式：不允许把监听地址开成 0.0.0.0 —— 那等于把本机工具挂到局域网/公网，
    // 而全套写入口只按「来源是不是回环」判定。要对外服务就走公网模式（含它的检查）。
    if (!isLoopbackHost(config?.host)) {
      throw new McsError(
        CODES.BAD_REQUEST,
        `本机模式的监听地址只能是回环（当前 ${config?.host}）。要对外提供服务，请显式设置 publicMode 并配置公网域名与账号体系。`,
        500,
        { host: config?.host },
      );
    }
    return { mode: 'local' };
  }

  const origin = String(config.publicOrigin ?? '').trim();
  if (!origin) {
    throw new McsError(CODES.BAD_REQUEST, '公网模式必须配置 publicOrigin（例如 https://mcs.example.com）。', 500);
  }
  let parsed;
  try { parsed = new URL(origin); } catch { throw new McsError(CODES.BAD_REQUEST, `publicOrigin 不是合法 URL：${origin}`, 500); }
  if (parsed.protocol !== 'https:' && !config.dev) {
    throw new McsError(CODES.BAD_REQUEST, `公网模式的 publicOrigin 必须是 https（当前 ${parsed.protocol}）。`, 500);
  }

  const allowedHosts = Array.isArray(config.allowedHosts) ? config.allowedHosts.filter(Boolean) : [];
  if (allowedHosts.length === 0) {
    throw new McsError(CODES.BAD_REQUEST, '公网模式必须显式配置 allowedHosts（服务域名白名单）。', 500);
  }
  const originHost = normalizeHost(parsed.host);
  if (!allowedHosts.some((pattern) => hostMatches(originHost, pattern))) {
    throw new McsError(CODES.BAD_REQUEST, `publicOrigin 的域名 ${originHost} 不在 allowedHosts 里，配置自相矛盾。`, 500, { originHost, allowedHosts });
  }

  /*
   * 账号体系：**没有身份边界就不许以公网模式启动**（2026-10 发布审查的结论）。
   *
   * 这条检查看的是「配没配账号体系」，配置本身是否完整由 `server/auth.mjs` 的
   * `validateAuthConfig` 逐项校验（URL 必须是无凭据的 https 根地址、会话密钥必须是
   * 32 个随机字节、管理员必须显式指定）。两处都在 `startServer` 里、都在监听端口之前，
   * 所以任何一项不合格的结果都是**进程起不来**，而不是「起来了但谁都能写」。
   */
  if (config.auth?.mode !== 'supabase') {
    throw new McsError(
      CODES.BAD_REQUEST,
      '公网模式必须接入账号体系（auth.mode = "supabase"）。没有身份边界时，'
      + '/api/v2/profiles 会列出所有人的档案，入库 / 发布 / 备份恢复也没有权限概念——'
      + '与其对外开一个谁都能写的服务，不如拒绝启动。本机使用请保持 publicMode = false。',
      500,
    );
  }
  /*
   * 公网模式默认必须用 PostgreSQL（2026-10-05 加）。
   *
   * 容器本地 SQLite 在重启、重新部署或换实例时**整个消失**——学习记录不是缓存，
   * 丢一次就是数据事故。所以默认是硬拒绝：要么给出连接串，要么留在本机模式。
   *
   * ## 例外：自托管（`MCS_WEB_ALLOW_LOCAL_DB=1`）
   *
   * 把服务跑在**自己的机器**上时，本地磁盘就是那台"持久磁盘"，
   * SQLite 不再有"随实例消失"的问题。这条例外必须**显式打开**：
   * 默认关闭意味着误配到容器平台上的部署仍然起不来，而不是悄悄跑起来再丢数据。
   */
  if (!config.dbUrl) {
    if (config.allowLocalDb !== true) {
      throw new McsError(
        CODES.BAD_REQUEST,
        '公网模式必须配置 PostgreSQL 连接串（环境变量 MCS_WEB_DB_URL 或 DATABASE_URL）。'
        + '容器本地 SQLite 会在重启 / 换实例时丢失全部学习记录，因此默认拒绝启动；'
        + '若你是把服务跑在**自己的机器**上（磁盘持久），可以显式设置 MCS_WEB_ALLOW_LOCAL_DB=1 走本地 SQLite。',
        500,
      );
    }
    return { mode: 'public', origin: parsed.origin, storage: 'sqlite-local' };
  }
  return { mode: 'public', origin: parsed.origin, storage: 'postgres' };
}

/**
 * 写请求（POST/PATCH/PUT/DELETE）的来源校验。
 *
 * 浏览器发起的跨站写请求一定带 `Origin`，因此：
 * - 本机模式：Origin 只允许回环；没有 Origin 的本机命令行调用放行（本来就在本机）。
 * - 公网模式：**必须**带 Origin，且必须等于 `publicOrigin`（或同站）。缺失即拒绝，
 *   免得把「没带 Origin 的脚本请求」当成可信来源。
 */
export function checkWriteOrigin(req, config) {
  if (config?.dev) return true;
  const origin = req?.headers?.origin;
  if (!origin) {
    if (!config?.publicMode) return true; // 本机 curl / 测试
    throw new McsError(CODES.FORBIDDEN, '公网模式下写请求必须带 Origin。', 403, { origin: null });
  }
  let parsed;
  try { parsed = new URL(origin); } catch { throw new McsError(CODES.FORBIDDEN, `请求来源无法解析：${origin}`, 403, { origin }); }
  if (!config?.publicMode) {
    if (!isLoopbackHost(parsed.host)) throw new McsError(CODES.FORBIDDEN, '本机模式的写入口只对回环来源开放。', 403, { origin });
    return true;
  }
  const expected = String(config.publicOrigin ?? '').trim();
  if (!expected || parsed.origin !== expected) {
    throw new McsError(CODES.FORBIDDEN, '写请求来源与站点地址不一致。', 403, { origin, expected: expected || null });
  }
  return true;
}

/**
 * 安全响应头。
 *
 * 只挂**与功能无冲突**的几项；CSP 在开发模式下放宽（Vite 的 HMR 需要内联脚本与额外连接），
 * 生产构建是纯静态资源 + 同源 fetch，因此可以收紧到 `script-src 'self'`。
 */
export function securityHeaders(config) {
  const dev = Boolean(config?.dev);
  const csp = dev
    ? "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self' ws: http: https:; object-src 'none'; base-uri 'self'; frame-ancestors 'none'"
    : "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'";
  return {
    'Content-Security-Policy': csp,
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer',
    'X-Frame-Options': 'DENY',
    'Cross-Origin-Opener-Policy': 'same-origin',
    'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
  };
}
