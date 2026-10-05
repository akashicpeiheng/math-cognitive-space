import { existsSync, readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

export const SERVER_ROOT = dirname(fileURLToPath(import.meta.url));
export const MCS_WEB_ROOT = resolve(SERVER_ROOT, '..');
export const REPO_ROOT = resolve(MCS_WEB_ROOT, '..');

function deepMerge(base, extra) {
  if (!extra || typeof extra !== 'object' || Array.isArray(extra)) return extra ?? base;
  const output = { ...base };
  for (const [key, value] of Object.entries(extra)) {
    output[key] = value && typeof value === 'object' && !Array.isArray(value) && base?.[key]
      ? deepMerge(base[key], value)
      : value;
  }
  return output;
}

export function loadConfig() {
  const localPath = resolve(MCS_WEB_ROOT, 'config.local.json');
  const local = existsSync(localPath) ? JSON.parse(readFileSync(localPath, 'utf8')) : {};
  const base = {
    host: '127.0.0.1',
    port: 3784,
    dataDir: resolve(MCS_WEB_ROOT, 'data'),
    dbFile: resolve(MCS_WEB_ROOT, 'runtime', 'mcs-web.sqlite3'),
    /*
     * 学习数据落在哪（2026-10-05 加）。
     *
     * `dbUrl` 为空 = 本机 SQLite 文件（默认）；给了连接串 = PostgreSQL。
     * 环境变量 `MCS_WEB_DB_URL` 优先，其次平台常注入的 `DATABASE_URL`。
     * `dbSsl`：`disable` / `require`；不设时交给驱动按连接串判断。
     */
    dbUrl: null,
    /*
     * 自托管例外：公网模式 + 本地 SQLite（默认关闭，必须显式开）。
     *
     * 容器平台上本地文件会随实例消失，所以公网模式默认要求 PostgreSQL；
     * 但把服务跑在**自己的机器**上时，这块磁盘本来就是持久的，
     * 这时本地 SQLite 反而最省事（不必依赖任何外部数据库）。
     * 判断与拒绝逻辑在 `server/deployment.mjs`，这里只存这个开关。
     */
    allowLocalDb: false,
    dbSsl: null,
    dbPoolMax: 10,
    /*
     * 编写库与学习者 E 库**物理分开**（2026-10 加）。
     *
     * 草稿、发现任务、候选结果与审阅选择是「公共内容在成为公共内容之前」的中间状态，
     * 既不属于某个学习者，也不该随个人档案导出。混在一张库里迟早会被导出或备份带走。
     */
    authoringDbFile: resolve(MCS_WEB_ROOT, 'runtime', 'authoring.sqlite3'),
    // 已发布的内容包（不可变，进版本库）；与 runtime 下的运行记录分开。
    extensionsDir: resolve(MCS_WEB_ROOT, 'data', 'extensions'),
    staticDir: resolve(MCS_WEB_ROOT, 'web', 'dist'),
    backupDir: resolve(MCS_WEB_ROOT, 'runtime', 'backups'),
    repoRoot: REPO_ROOT,
    dev: false,
    /*
     * 部署形态（2026-10 发布前加）。
     *
     * `publicMode = false` 是**本机工作台**：监听回环、写入口只对回环来源开放、
     * 个人档案没有账号概念。要对外服务必须显式打开公网模式，而公网模式在
     * 账号体系落地之前会拒绝启动（见 `server/deployment.mjs` 的说明）。
     */
    publicMode: false,
    publicOrigin: null,
    allowedHosts: [],
    /*
     * 账号体系（2026-10 公网发布前加）。
     *
     * 默认 `mode: 'none'`：本机工作台没有账号，行为与从前完全一致。
     * 公网模式必须显式配成 `supabase`，且下面几项都要给全——缺一项就在启动时
     * 抛错（见 `server/auth.mjs` 的 `validateAuthConfig`），而不是启动之后才发现。
     *
     * 凭据只从环境变量 / `config.local.json`（已被版本控制排除）读取，
     * 绝不写进 `config.example.json` 或前端构建产物。
     */
    auth: {
      mode: 'none',
      provider: null,
      url: null,
      publishableKey: null,
      // 32 字节随机数的标准 base64；会话 Cookie 用它做 AES-256-GCM 封装。
      sessionKey: null,
      // 管理员按认证服务的用户 id 显式指定，不采用「首位注册者即管理员」。
      adminUserIds: [],
      // 邮箱验证 / 找回密码需要真实发信服务；没配置时相关接口如实回 503。
      emailEnabled: true,
    },
    // 会话、OAuth 中间态与对象归属表；与学习者 E 库分开存。
    authFile: resolve(MCS_WEB_ROOT, 'runtime', 'auth.sqlite3'),
    tutor: {
      enabled: true,
      adapter: 'deeptutor-1.5',
      baseUrl: 'http://127.0.0.1:8001',
      frontendUrl: 'http://localhost:3782',
      authTokenEnv: 'DEEPTUTOR_AUTH_TOKEN',
      timeoutMs: 180000,
      healthTimeoutMs: 2500,
      liveVerified: false,
    },
  };
  const merged = deepMerge(base, local);
  if (process.env.MCS_WEB_HOST) merged.host = process.env.MCS_WEB_HOST;
  /*
   * 端口：托管平台（Render / Railway / Fly…）注入的是 `PORT`，我们自己的变量是
   * `MCS_WEB_PORT`，后者优先。容器里还要把监听地址设成 0.0.0.0（`MCS_WEB_HOST`），
   * 否则外面的路由进不来——本机模式的回环限制只在 publicMode 为假时生效。
   */
  if (process.env.MCS_WEB_PORT) merged.port = Number(process.env.MCS_WEB_PORT);
  else if (process.env.PORT) merged.port = Number(process.env.PORT);
  if (process.env.MCS_WEB_DB) merged.dbFile = resolve(process.env.MCS_WEB_DB);
  merged.dbUrl = process.env.MCS_WEB_DB_URL || process.env.DATABASE_URL || merged.dbUrl || null;
  if (process.env.MCS_WEB_ALLOW_LOCAL_DB === '1') merged.allowLocalDb = true;
  if (process.env.MCS_WEB_DB_SSL) merged.dbSsl = process.env.MCS_WEB_DB_SSL;
  if (process.env.MCS_WEB_DB_POOL_MAX) merged.dbPoolMax = Number(process.env.MCS_WEB_DB_POOL_MAX);
  if (process.env.MCS_WEB_AUTHORING_DB) merged.authoringDbFile = resolve(process.env.MCS_WEB_AUTHORING_DB);
  if (process.env.MCS_WEB_DEV === '1') merged.dev = true;
  if (process.env.MCS_WEB_PUBLIC_MODE === '1') merged.publicMode = true;
  if (process.env.MCS_WEB_PUBLIC_ORIGIN) merged.publicOrigin = process.env.MCS_WEB_PUBLIC_ORIGIN;
  if (process.env.MCS_WEB_ALLOWED_HOSTS) {
    merged.allowedHosts = process.env.MCS_WEB_ALLOWED_HOSTS.split(',').map((item) => item.trim()).filter(Boolean);
  }
  if (process.env.MCS_WEB_AUTH_MODE) merged.auth = { ...merged.auth, mode: process.env.MCS_WEB_AUTH_MODE };
  if (process.env.MCS_WEB_AUTH_URL) merged.auth = { ...merged.auth, url: process.env.MCS_WEB_AUTH_URL };
  if (process.env.MCS_WEB_AUTH_PUBLISHABLE_KEY) merged.auth = { ...merged.auth, publishableKey: process.env.MCS_WEB_AUTH_PUBLISHABLE_KEY };
  if (process.env.MCS_WEB_AUTH_SESSION_KEY) merged.auth = { ...merged.auth, sessionKey: process.env.MCS_WEB_AUTH_SESSION_KEY };
  if (process.env.MCS_WEB_AUTH_ADMIN_IDS) {
    merged.auth = { ...merged.auth, adminUserIds: process.env.MCS_WEB_AUTH_ADMIN_IDS.split(',').map((item) => item.trim()).filter(Boolean) };
  }
  if (process.env.MCS_WEB_AUTH_EMAIL_ENABLED === '0') merged.auth = { ...merged.auth, emailEnabled: false };
  if (process.env.MCS_WEB_AUTH_FILE) merged.authFile = resolve(process.env.MCS_WEB_AUTH_FILE);
  if (process.env.MCS_WEB_TUTOR_LIVE_VERIFIED === '1') merged.tutor.liveVerified = true;
  if (process.env.MCS_WEB_TUTOR_ENABLED === '0') merged.tutor.enabled = false;
  if (process.env.MCS_WEB_TUTOR_ENABLED === '1') merged.tutor.enabled = true;
  if (process.env.MCS_WEB_TUTOR_BASE_URL) merged.tutor.baseUrl = process.env.MCS_WEB_TUTOR_BASE_URL;
  for (const key of ['dataDir', 'dbFile', 'authoringDbFile', 'extensionsDir', 'staticDir', 'backupDir', 'repoRoot', 'authFile']) {
    if (merged[key] && !/^[A-Za-z]:[\\/]|^\//.test(merged[key])) merged[key] = resolve(MCS_WEB_ROOT, merged[key]);
  }
  return merged;
}
