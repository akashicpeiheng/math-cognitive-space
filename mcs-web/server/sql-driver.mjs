import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { AsyncLocalStorage } from 'node:async_hooks';
import { McsError, CODES } from '../shared/errors.mjs';

/**
 * 存储驱动：把「SQL 怎么执行」与「业务语义是什么」分开。
 *
 * ## 为什么要有这一层（2026-10-05 加）
 *
 * 学习数据（档案 / 事件 / 笔记 / 视图）原来只有 SQLite 一份实现，方法都是**同步**的。
 * 公网部署要换成 PostgreSQL，而 `pg` 只有异步 API。有两条路可以走：
 *
 * 1. 另写一份 `PostgresDatabase`，把版本冲突、事件去重、导入全有或全无这些语义**再实现一遍**；
 * 2. 语义只留一份，把「取行 / 写行 / 事务」抽成驱动，SQLite 与 PostgreSQL 各实现一次驱动。
 *
 * 选 2。理由不是好看，而是**分歧的代价**：上面那些语义（尤其事件去重与 revision 冲突）
 * 一旦两份实现漂移，本机与公网就会出现「同一份导出，两边结果不同」——
 * 那是数据问题，不是风格问题。抽取之后，`db.mjs` 里只有一份逻辑与一套 SQL。
 *
 * ## 统一接口（全部异步）
 *
 * - `all(sql, params)` / `get(sql, params)` / `run(sql, params)` / `exec(sql)`
 * - `transaction(fn)`：在同一个连接上跑 `fn`，抛错即回滚
 * - `dialect`：`'sqlite'` | `'postgres'`；`seqColumnDdl`：自增主键的方言写法
 * - `describe()`：如实说明数据落在哪里（健康检查与日志用）
 *
 * 本机模式仍走 SQLite（同步 API 包成异步），公网走 PostgreSQL。
 * 调用方一律 `await`——对同步值 `await` 是恒等操作，所以本机路径不为此付出行为代价。
 */

/** 把带 `?` 占位符的 SQL 翻成 PostgreSQL 的 `$1..$n`；跳过单引号字符串里的问号。 */
export function toNumberedPlaceholders(sql) {
  let out = '';
  let index = 0;
  let inString = false;
  for (let i = 0; i < sql.length; i += 1) {
    const ch = sql[i];
    if (ch === "'") {
      // SQL 里的 '' 是转义的单引号，不改变字符串状态。
      if (inString && sql[i + 1] === "'") { out += "''"; i += 1; continue; }
      inString = !inString;
      out += ch;
      continue;
    }
    if (ch === '?' && !inString) { index += 1; out += `$${index}`; continue; }
    out += ch;
  }
  return out;
}

/* ------------------------------------------------------------------ SQLite */

export function createSqliteDriver({ file }) {
  const target = resolve(file);
  mkdirSync(dirname(target), { recursive: true });
  let db = new DatabaseSync(target);
  db.exec('PRAGMA journal_mode = WAL;');
  db.exec('PRAGMA foreign_keys = ON;');
  /*
   * 事务用**连接级**语句。SQLite 只有一条连接，所以不需要 AsyncLocalStorage 那套；
   * `depth` 只用来拦住误嵌套（`BEGIN` 里再 `BEGIN` 会报错，而不是默默变成子事务）。
   */
  let depth = 0;
  return {
    dialect: 'sqlite',
    seqColumnDdl: 'INTEGER PRIMARY KEY AUTOINCREMENT',
    file: target,
    describe() { return { dialect: 'sqlite', file: target }; },
    async all(sql, params = []) { return db.prepare(sql).all(...params); },
    async get(sql, params = []) { return db.prepare(sql).get(...params); },
    async run(sql, params = []) {
      const result = db.prepare(sql).run(...params);
      return { changes: Number(result.changes ?? 0) };
    },
    async exec(sql) { db.exec(sql); },
    async transaction(fn) {
      if (depth > 0) return fn();
      depth += 1;
      db.exec('BEGIN IMMEDIATE');
      try {
        const out = await fn();
        db.exec('COMMIT');
        return out;
      } catch (error) {
        try { db.exec('ROLLBACK'); } catch { /* 回滚失败不掩盖原始错误 */ }
        throw error;
      } finally {
        depth -= 1;
      }
    },
    async checkpoint() { db.exec('PRAGMA wal_checkpoint(TRUNCATE);'); },
    /** 备份 = 复制数据库文件（SQLite 的物理备份，含全部表）。 */
    async backupToFile(targetPath) {
      const { copyFileSync } = await import('node:fs');
      db.exec('PRAGMA wal_checkpoint(TRUNCATE);');
      copyFileSync(target, targetPath);
    },
    /** 恢复 = 关闭 → 覆盖文件 → 重开（沿用原来的三步，语义不变）。 */
    async restoreFromFile(sourcePath) {
      const { copyFileSync } = await import('node:fs');
      db.exec('PRAGMA wal_checkpoint(TRUNCATE);');
      db.close();
      copyFileSync(sourcePath, target);
      db = new DatabaseSync(target);
      db.exec('PRAGMA journal_mode = WAL;');
      db.exec('PRAGMA foreign_keys = ON;');
    },
    async close() { try { db.close(); } catch { /* 已关闭 */ } },
  };
}

/* -------------------------------------------------------------- PostgreSQL */

/**
 * PostgreSQL 驱动。
 *
 * 接受任何提供 `query(sql, params) → { rows, rowCount }` 的对象：
 * 生产的 `pg.Pool`，以及测试用的 PGlite（内嵌 WASM 版 PostgreSQL，不需要起服务）。
 *
 * 事务用 `AsyncLocalStorage` 把「当前事务的连接」绑在**异步调用链**上，而不是绑在驱动对象上。
 * 这不是洁癖：驱动是全局单例，如果用实例字段记当前连接，A 请求的事务会把并发的 B 请求
 * 也拉进同一个连接，两边互相看见对方未提交的数据——那种 bug 在低并发下几乎测不出来。
 */
export function createPostgresDriver({ pool, label = 'postgres' }) {
  if (!pool || typeof pool.query !== 'function') {
    throw new McsError(CODES.INTERNAL, 'PostgreSQL 驱动需要一个提供 query() 的连接池。', 500);
  }
  const scope = new AsyncLocalStorage();
  const runner = () => scope.getStore() ?? pool;
  const execRaw = async (sql, params) => {
    const target = runner();
    if (params === undefined && typeof target.exec === 'function') return target.exec(sql);
    return target.query(sql, params ?? []);
  };
  return {
    dialect: 'postgres',
    seqColumnDdl: 'SERIAL PRIMARY KEY',
    label,
    /*
     * 把连接池交出去：认证库（会话 / OAuth 中间态 / 对象归属）在公网模式下必须落在
     * **同一个** PostgreSQL 里。各用各的 SQLite 文件时，一次重启会把所有登录状态清空——
     * 用户看到的是「刚登录就被登出」，而排查的人会以为是 Cookie 的问题。
     */
    pool,
    describe() { return { dialect: 'postgres', label }; },
    async all(sql, params = []) { return (await execRaw(toNumberedPlaceholders(sql), params)).rows ?? []; },
    async get(sql, params = []) { return ((await execRaw(toNumberedPlaceholders(sql), params)).rows ?? [])[0]; },
    async run(sql, params = []) {
      const result = await execRaw(toNumberedPlaceholders(sql), params);
      return { changes: Number(result.rowCount ?? result.affectedRows ?? 0) };
    },
    async exec(sql) { await execRaw(sql); },
    async transaction(fn) {
      // 已经在事务里：直接复用（不嵌套 BEGIN——PostgreSQL 不支持嵌套事务，只有保存点）。
      if (scope.getStore()) return fn();
      const client = typeof pool.connect === 'function' ? await pool.connect() : pool;
      try {
        await client.query('BEGIN');
        let out;
        try {
          out = await scope.run(client, fn);
        } catch (error) {
          try { await client.query('ROLLBACK'); } catch { /* 回滚失败不掩盖原始错误 */ }
          throw error;
        }
        await client.query('COMMIT');
        return out;
      } finally {
        if (typeof client.release === 'function') client.release();
      }
    },
    async checkpoint() { /* PostgreSQL 没有 WAL checkpoint 这一步（备份走逻辑导出） */ },
    async close() { if (typeof pool.end === 'function') await pool.end(); },
  };
}

/* ------------------------------------------------------------------ 工厂 */

/**
 * 按配置建驱动。
 *
 * - `db.url` 存在 → PostgreSQL（`MCS_WEB_DB_URL` / `DATABASE_URL`）；
 * - 否则 → SQLite 文件（`db.file`）。
 *
 * `pg` 是依赖项，但**只在真的要用时**才 import：本机模式不因为多一个驱动就付加载代价，
 * 也不因为 `pg` 没装而启动不了。
 */
export async function createDriverFromConfig(config, { pool: injectedPool = null } = {}) {
  const url = config?.dbUrl ?? null;
  if (!url) {
    if (injectedPool) return createPostgresDriver({ pool: injectedPool, label: 'postgres(test)' });
    return createSqliteDriver({ file: config.dbFile });
  }
  let Pool;
  try {
    ({ Pool } = await import('pg'));
  } catch (error) {
    throw new McsError(CODES.INTERNAL, `配置了数据库连接串，但加载 pg 失败：${error.message}`, 500, { reason: error.message });
  }
  const sslMode = String(config?.dbSsl ?? '').toLowerCase();
  /*
   * TLS 三档（托管数据库默认要求加密连接）：
   * - `disable`：不加密（只在自建实例、且确实走内网时用）；
   * - `require`（部署清单推荐）：加密，但**不校验证书链**——Supavisor / 各类连接池
   *   的证书链在 Node 默认 CA 里偶尔对不上，硬校验会让部署卡在一个与业务无关的错误上；
   * - `verify`：加密并校验证书链。等你确认过环境没问题，可以收紧到这一档。
   */
  const ssl = sslMode === 'disable' ? false
    : sslMode === 'verify' ? { rejectUnauthorized: true }
      : (sslMode === 'require' ? { rejectUnauthorized: false } : undefined);
  const pool = injectedPool ?? new Pool({
    connectionString: url,
    max: Number(config?.dbPoolMax ?? 10) || 10,
    ssl,
  });
  // 连接池的错误事件必须有监听者，否则一个空闲连接被服务端掐断会让进程直接退出。
  pool.on?.('error', (error) => console.error('[mcs-web] PostgreSQL 连接池错误：', error.message));
  const label = (() => { try { const u = new URL(url); return `${u.hostname}${u.pathname}`; } catch { return 'postgres'; } })();
  return createPostgresDriver({ pool, label });
}
