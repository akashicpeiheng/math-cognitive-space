/**
 * 编写数据库（`runtime/authoring.sqlite3`）：草稿、发现任务、候选结果、审阅选择、发布记录。
 *
 * ## 为什么另开一份库，而不是塞进 `mcs-web.sqlite3`
 *
 * 这些数据既不属于某个学习者，也不该跟着个人档案导出：
 * 「公共内容成为公共内容之前」的中间状态一旦混进 E 库，早晚会被
 * `exportProfile` 或备份带走。库文件物理分开之后，这条边界不靠自觉——
 * 导出路径根本读不到它。
 *
 * ## 三条写法上的约定（与 `server/db.mjs` 一致）
 *
 * 1. 所有多步写操作走 `BEGIN IMMEDIATE` + 失败 `ROLLBACK`；
 * 2. 行 → 对象的转换集中在 `*View` 方法里，SQL 里不拼业务判断；
 * 3. 修订号是**乐观锁**：`updateDraft` 必须带 `expectedRevision`，对不上就 409，
 *    绝不「最后写入者赢」——丢的可能是用户刚写的一段公式。
 */

import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname, resolve, basename } from 'node:path';
import { randomUUID } from 'node:crypto';
import { McsError, CODES } from '../shared/errors.mjs';
import { assert } from '../shared/contracts.mjs';

export const AUTHORING_SCHEMA_VERSION = 'mcs-authoring-db/1';

/** 运行状态（DiscoveryRun.status，§5）。 */
export const RUN_LIFECYCLE = Object.freeze(['queued', 'running', 'completed', 'interrupted', 'cancelled', 'error']);
/** 候选级运行状态（§2.9 的 RUN_STATUSES）。 */
export const CANDIDATE_RUN_STATUSES = Object.freeze(['completed', 'timeout', 'unsupported', 'check_failed', 'error', 'cancelled']);
export const MATH_JUDGMENTS = Object.freeze(['verified', 'refuted', 'undecided']);
export const REVIEW_STATUSES = Object.freeze(['pending', 'accepted', 'dismissed', 'published', 'stale']);

const FORBIDDEN_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

function nowIso() { return new Date().toISOString(); }

function parseJson(value, fallback = null) {
  if (value === null || value === undefined) return fallback;
  try { return JSON.parse(value); } catch { return fallback; }
}

/**
 * 只接受声明式数据。
 *
 * 这一层是**写入口的最后一道闸**：草稿与候选内容全部来自 HTTP 请求体，
 * 函数、Symbol、BigInt、循环引用，以及 `__proto__` 这类会污染原型的键，
 * 一律在下库之前拒绝——不执行、不持久化、不「先存着以后再说」。
 */
export function assertDeclarativeData(value, path = 'input') {
  if (value === null) return value;
  const type = typeof value;
  if (type === 'string' || type === 'boolean') return value;
  if (type === 'number') {
    assert(Number.isFinite(value), CODES.BAD_REQUEST, `${path} 含非有限数字`);
    return value;
  }
  if (type === 'undefined') return value;               // 缺省字段交给 normalize 处理
  if (type !== 'object') throw new McsError(CODES.BAD_REQUEST, `${path} 含不可序列化的值：${type}`, 400);
  if (Array.isArray(value)) {
    value.forEach((item, index) => assertDeclarativeData(item, `${path}[${index}]`));
    return value;
  }
  for (const [key, item] of Object.entries(value)) {
    if (FORBIDDEN_KEYS.has(key)) throw new McsError(CODES.BAD_REQUEST, `${path} 含禁用键：${key}`, 400);
    assertDeclarativeData(item, `${path}.${key}`);
  }
  return value;
}

function optionalText(value, max = 20000) {
  if (value === undefined || value === null) return null;
  assert(typeof value === 'string', CODES.BAD_REQUEST, '字段必须是字符串');
  return value.slice(0, max);
}

function requireText(value, code, message, max = 200) {
  assert(typeof value === 'string' && value.trim().length > 0, code, message);
  return value.trim().slice(0, max);
}

export class AuthoringDatabase {
  constructor({ file } = {}) {
    // 默认落在 runtime/ 下：草稿与运行记录属于运行状态，不进版本库（.gitignore 已排除 runtime/）。
    this.file = resolve(file ?? resolve(process.cwd(), 'runtime', 'authoring.sqlite3'));
    mkdirSync(dirname(this.file), { recursive: true });
    this.db = new DatabaseSync(this.file);
    this.db.exec('PRAGMA journal_mode = WAL;');
    this.db.exec('PRAGMA foreign_keys = ON;');
    this.migrate();
  }

  migrate() {
    this.db.exec(
      'CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);' +
      'CREATE TABLE IF NOT EXISTS drafts (' +
      '  id TEXT PRIMARY KEY, revision INTEGER NOT NULL, name TEXT NOT NULL, construct TEXT,' +
      '  case_id TEXT, summary TEXT, reading TEXT, background TEXT, ontology_version TEXT,' +
      '  spec_json TEXT, spec_source_json TEXT, validation_json TEXT, contracts_json TEXT,' +
      '  node_json TEXT,' +
      '  published_revision_id TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL' +
      ');' +
      'CREATE INDEX IF NOT EXISTS idx_drafts_updated ON drafts(updated_at DESC);' +
      'CREATE TABLE IF NOT EXISTS runs (' +
      '  id TEXT PRIMARY KEY, draft_id TEXT, node_json TEXT, ontology_version TEXT NOT NULL,' +
      '  background TEXT, status TEXT NOT NULL, started_at TEXT NOT NULL, finished_at TEXT,' +
      '  budget_json TEXT NOT NULL, stats_json TEXT, interrupted INTEGER NOT NULL DEFAULT 0,' +
      '  error_json TEXT, generator_version TEXT' +
      ');' +
      'CREATE INDEX IF NOT EXISTS idx_runs_started ON runs(started_at DESC);' +
      /*
       * 候选表的主键是 (run_id, candidate_id)：同一个候选经历多次重放只留一行，
       * 覆盖的是「上次的结论」，不是历史结论——发布记录里另存了当时的快照。
       */
      'CREATE TABLE IF NOT EXISTS candidates (' +
      '  run_id TEXT NOT NULL, candidate_id TEXT NOT NULL, seq INTEGER NOT NULL,' +
      '  kind TEXT NOT NULL, math_status TEXT NOT NULL, review TEXT NOT NULL,' +
      '  payload_json TEXT NOT NULL, updated_at TEXT NOT NULL, PRIMARY KEY(run_id, candidate_id)' +
      ');' +
      'CREATE INDEX IF NOT EXISTS idx_candidates_run ON candidates(run_id, seq);' +
      'CREATE TABLE IF NOT EXISTS publications (' +
      '  id TEXT PRIMARY KEY, idempotency_key TEXT, draft_id TEXT, kind TEXT NOT NULL,' +
      '  revision_json TEXT NOT NULL, result_json TEXT, request_digest TEXT,' +
      '  created_at TEXT NOT NULL' +
      ');' +
      /*
       * 幂等键唯一索引：**允许 NULL**（不传键的发布不受约束，SQLite 的 UNIQUE 对 NULL 不生效），
       * 但只要传了键，同一个键就只可能对应一条记录。
       */
      'CREATE UNIQUE INDEX IF NOT EXISTS idx_publications_idem ON publications(idempotency_key);'
    );
    const current = this.db.prepare('SELECT value FROM meta WHERE key = ?').get('schema_version');
    if (!current) this.db.prepare('INSERT INTO meta(key, value) VALUES (?, ?)').run('schema_version', AUTHORING_SCHEMA_VERSION);
    else if (current.value !== AUTHORING_SCHEMA_VERSION) {
      throw new McsError(CODES.INTERNAL, `编写数据库版本不兼容：${current.value}，期望 ${AUTHORING_SCHEMA_VERSION}`, 500);
    }
    /*
     * 附加式补列：`CREATE TABLE IF NOT EXISTS` 不会给已存在的表加字段。
     * 新库一次建全，老库在这里补齐——补列不动任何既有数据，比升 SCHEMA_VERSION 温和
     * （升版本号会把已有数据库整个判成不兼容）。
     */
    this.ensureColumn('drafts', 'node_json', 'TEXT');
  }

  ensureColumn(table, column, type) {
    const columns = this.db.prepare(`PRAGMA table_info(${table})`).all().map((row) => row.name);
    if (!columns.includes(column)) this.db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`);
  }

  transaction(fn) {
    this.db.exec('BEGIN IMMEDIATE');
    try {
      const result = fn();
      this.db.exec('COMMIT');
      return result;
    } catch (error) {
      this.db.exec('ROLLBACK');
      throw error;
    }
  }

  /* ------------------------------------------------------------------ meta */

  metaGet(key) {
    return this.db.prepare('SELECT value FROM meta WHERE key = ?').get(key)?.value ?? null;
  }

  metaSet(key, value) {
    if (value === null || value === undefined) this.db.prepare('DELETE FROM meta WHERE key = ?').run(key);
    else this.db.prepare('INSERT INTO meta(key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value').run(key, String(value));
    return value;
  }

  /* ---------------------------------------------------------------- drafts */

  draftView(row) {
    return {
      id: row.id,
      revision: row.revision,
      name: row.name,
      construct: row.construct ?? null,
      case: row.case_id ?? null,
      summary: row.summary ?? '',
      reading: row.reading ?? '',
      background: row.background ?? null,
      ontologyVersion: row.ontology_version ?? null,
      spec: parseJson(row.spec_json, null),
      specSource: parseJson(row.spec_source_json, { declarations: '', definitions: '', assumptions: '', statement: '', claims: '' }),
      validation: parseJson(row.validation_json, null),
      contracts: parseJson(row.contracts_json, []),
      /*
       * `node` 是**扩展字段**（`shared/formal.d.ts` 的 AuthoringDraft 里没有）：
       * 新节点入库需要学科、粒度、证据等级这些本体登记信息，而它们既不属于形式表达，
       * 也不属于草稿正文。放在这里由发布事务读取；旧客户端忽略它即可。
       */
      node: parseJson(row.node_json, null),
      publishedRevisionId: row.published_revision_id ?? null,
      status: row.published_revision_id ? 'published' : 'draft',
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  draftRow(id) {
    return this.db.prepare('SELECT * FROM drafts WHERE id = ?').get(id) ?? null;
  }

  listDrafts({ status = 'all', limit = 100 } = {}) {
    const capped = Math.min(Math.max(Number(limit) || 100, 1), 1000);
    const clause = status === 'published' ? 'WHERE published_revision_id IS NOT NULL'
      : status === 'draft' || status === 'unpublished' ? 'WHERE published_revision_id IS NULL'
        : '';
    return this.db.prepare(`SELECT * FROM drafts ${clause} ORDER BY updated_at DESC LIMIT ?`).all(capped).map((row) => this.draftView(row));
  }

  /** 找不到按规格报 UNKNOWN_NODE 404（草稿不是节点，但线上错误码沿用同族）。 */
  getDraft(id) {
    const row = this.draftRow(id);
    if (!row) throw new McsError(CODES.UNKNOWN_NODE, `无法解析草稿：${id}`, 404, { draft_id: id });
    return this.draftView(row);
  }

  normaliseDraftInput(raw = {}, { partial = false } = {}) {
    assertDeclarativeData(raw, 'draft');
    const output = {};
    if (!partial || raw.name !== undefined) output.name = requireText(raw.name, CODES.BAD_REQUEST, '草稿需要 name');
    for (const key of ['construct', 'case', 'background']) {
      if (raw[key] !== undefined) output[key] = optionalText(raw[key], 200);
    }
    for (const key of ['summary', 'reading']) {
      if (raw[key] !== undefined) output[key] = optionalText(raw[key], 20000) ?? '';
    }
    if (raw.spec !== undefined) {
      assert(raw.spec === null || (typeof raw.spec === 'object' && !Array.isArray(raw.spec)), CODES.BAD_REQUEST, 'spec 必须是对象或 null');
      output.spec = raw.spec;
    }
    if (raw.specSource !== undefined) {
      assert(raw.specSource === null || (typeof raw.specSource === 'object' && !Array.isArray(raw.specSource)), CODES.BAD_REQUEST, 'specSource 必须是对象');
      output.specSource = raw.specSource ?? {};
    }
    if (raw.validation !== undefined) {
      assert(raw.validation === null || (typeof raw.validation === 'object' && !Array.isArray(raw.validation)), CODES.BAD_REQUEST, 'validation 必须是对象或 null');
      output.validation = raw.validation;
    }
    if (raw.contracts !== undefined) {
      assert(Array.isArray(raw.contracts), CODES.BAD_REQUEST, 'contracts 必须是数组');
      output.contracts = raw.contracts;
    }
    /*
     * 节点登记信息：既可以整块放在 `node` 里，也可以把常用几项写在顶层
     * （前端表单是分散的，硬要求嵌套只会逼出一层包装）。两者合并，整块优先。
     */
    const nodeFields = {};
    for (const key of ['discipline', 'granularity', 'evidenceStatus', 'roles', 'title', 'version', 'contentMarkdown', 'provenance', 'formal']) {
      if (raw[key] !== undefined) nodeFields[key] = raw[key];
    }
    if (raw.node !== undefined) {
      assert(raw.node === null || (typeof raw.node === 'object' && !Array.isArray(raw.node)), CODES.BAD_REQUEST, 'node 必须是对象或 null');
      Object.assign(nodeFields, raw.node ?? {});
    }
    if (Object.keys(nodeFields).length) output.node = nodeFields;
    if (raw.ontologyVersion !== undefined) output.ontologyVersion = optionalText(raw.ontologyVersion, 200);
    else if (raw.ontology_version !== undefined) output.ontologyVersion = optionalText(raw.ontology_version, 200);
    return output;
  }

  createDraft(raw = {}) {
    const draft = this.normaliseDraftInput(raw);
    const id = typeof raw.id === 'string' && raw.id.trim() ? raw.id.trim().slice(0, 120) : `draft-${randomUUID()}`;
    if (this.draftRow(id)) throw new McsError(CODES.CONFLICT, `草稿 ID 已存在：${id}`, 409, { draft_id: id });
    const time = nowIso();
    this.db.prepare(
      'INSERT INTO drafts(id, revision, name, construct, case_id, summary, reading, background, ontology_version,' +
      ' spec_json, spec_source_json, validation_json, contracts_json, node_json, published_revision_id, created_at, updated_at)' +
      ' VALUES (?, 1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?)'
    ).run(
      id, draft.name, draft.construct ?? null, draft.case ?? null, draft.summary ?? '', draft.reading ?? '',
      draft.background ?? null, draft.ontologyVersion ?? null,
      JSON.stringify(draft.spec ?? null), JSON.stringify(draft.specSource ?? { declarations: '', definitions: '', assumptions: '', statement: '', claims: '' }),
      JSON.stringify(draft.validation ?? null), JSON.stringify(draft.contracts ?? []), JSON.stringify(draft.node ?? null), time, time,
    );
    return this.getDraft(id);
  }

  /**
   * 乐观锁更新。
   *
   * `expectedRevision` 不一致 → 409（有人先改了）。
   * 本体版本只在**本次要改形式表达**时强校验：纯文字编辑不该因为本体升了一版就被锁住，
   * 但「旧背景下的表达式悄悄搬到新背景」必须拒绝——那正是 `stale-reference` 的来源。
   */
  updateDraft(id, patch = {}, { expectedRevision, ontologyVersion = null } = {}) {
    const row = this.draftRow(id);
    if (!row) throw new McsError(CODES.UNKNOWN_NODE, `无法解析草稿：${id}`, 404, { draft_id: id });
    assert(Number.isInteger(expectedRevision), CODES.BAD_REQUEST, '更新草稿必须带 expectedRevision（整数修订号）');
    if (row.revision !== expectedRevision) {
      throw new McsError(CODES.CONFLICT, `草稿修订冲突：期望 ${expectedRevision}，当前 ${row.revision}`, 409, {
        expected: expectedRevision, current: row.revision, draft_id: id,
      });
    }
    const current = this.draftView(row);
    const incoming = this.normaliseDraftInput(patch, { partial: true });
    const touchesSpec = incoming.spec !== undefined || incoming.specSource !== undefined || incoming.validation !== undefined;
    if (touchesSpec && ontologyVersion && current.ontologyVersion && ontologyVersion !== current.ontologyVersion) {
      throw new McsError(CODES.VERSION_CONFLICT,
        `草稿绑定的本体版本已变化：草稿为 ${current.ontologyVersion}，当前为 ${ontologyVersion}；请重新检查形式表达后再保存。`,
        409, { expected: current.ontologyVersion, received: ontologyVersion, draft_id: id });
    }
    const next = {
      name: incoming.name ?? current.name,
      construct: incoming.construct !== undefined ? incoming.construct : current.construct,
      caseId: incoming.case !== undefined ? incoming.case : current.case,
      summary: incoming.summary !== undefined ? incoming.summary : current.summary,
      reading: incoming.reading !== undefined ? incoming.reading : current.reading,
      background: incoming.background !== undefined ? incoming.background : current.background,
      ontologyVersion: incoming.ontologyVersion !== undefined ? incoming.ontologyVersion
        : (touchesSpec && ontologyVersion ? ontologyVersion : current.ontologyVersion),
      spec: incoming.spec !== undefined ? incoming.spec : current.spec,
      specSource: incoming.specSource !== undefined ? incoming.specSource : current.specSource,
      validation: incoming.validation !== undefined ? incoming.validation : current.validation,
      contracts: incoming.contracts !== undefined ? incoming.contracts : current.contracts,
      node: incoming.node !== undefined ? incoming.node : current.node,
    };
    this.db.prepare(
      'UPDATE drafts SET revision = revision + 1, name = ?, construct = ?, case_id = ?, summary = ?, reading = ?,' +
      ' background = ?, ontology_version = ?, spec_json = ?, spec_source_json = ?, validation_json = ?, contracts_json = ?,' +
      ' node_json = ?, updated_at = ? WHERE id = ?'
    ).run(
      next.name, next.construct, next.caseId, next.summary, next.reading, next.background, next.ontologyVersion,
      JSON.stringify(next.spec ?? null), JSON.stringify(next.specSource ?? {}), JSON.stringify(next.validation ?? null),
      JSON.stringify(next.contracts ?? []), JSON.stringify(next.node ?? null), nowIso(), id,
    );
    return this.getDraft(id);
  }

  /** 记录「这份草稿已发布为哪个版本」。**不改草稿内容**：发布不是编辑。 */
  publishDraft(id, publication) {
    const row = this.draftRow(id);
    if (!row) throw new McsError(CODES.UNKNOWN_NODE, `无法解析草稿：${id}`, 404, { draft_id: id });
    const revisionId = typeof publication === 'string' ? publication : publication?.id ?? publication?.revisionId ?? null;
    assert(revisionId, CODES.BAD_REQUEST, 'publishDraft 需要版本标识');
    this.db.prepare('UPDATE drafts SET published_revision_id = ?, updated_at = ? WHERE id = ?').run(revisionId, nowIso(), id);
    return this.getDraft(id);
  }

  /* ------------------------------------------------------------------ runs */

  runView(row, { candidates = null } = {}) {
    const view = {
      id: row.id,
      draftId: row.draft_id ?? null,
      nodeRef: parseJson(row.node_json, null),
      ontologyVersion: row.ontology_version,
      background: row.background ?? null,
      status: row.status,
      startedAt: row.started_at,
      finishedAt: row.finished_at ?? null,
      budget: parseJson(row.budget_json, {}),
      stats: parseJson(row.stats_json, null),
      interrupted: Boolean(row.interrupted),
      error: parseJson(row.error_json, null),
      generatorVersion: row.generator_version ?? null,
    };
    if (candidates === null) {
      const count = this.db.prepare('SELECT COUNT(*) AS count FROM candidates WHERE run_id = ?').get(row.id).count;
      return { ...view, candidateCount: count };
    }
    return { ...view, candidates };
  }

  runRow(id) {
    return this.db.prepare('SELECT * FROM runs WHERE id = ?').get(id) ?? null;
  }

  createRun(record = {}) {
    assertDeclarativeData(record, 'run');
    const id = typeof record.id === 'string' && record.id.trim() ? record.id.trim().slice(0, 120) : `run-${randomUUID()}`;
    if (this.runRow(id)) throw new McsError(CODES.CONFLICT, `任务 ID 已存在：${id}`, 409, { run_id: id });
    assert(record.ontologyVersion, CODES.BAD_REQUEST, '任务必须固定一个本体版本（ontologyVersion）');
    const budget = record.budget ?? {};
    assertDeclarativeData(budget, 'run.budget');
    this.db.prepare(
      'INSERT INTO runs(id, draft_id, node_json, ontology_version, background, status, started_at, finished_at,' +
      ' budget_json, stats_json, interrupted, error_json, generator_version) VALUES (?, ?, ?, ?, ?, ?, ?, NULL, ?, NULL, 0, NULL, ?)'
    ).run(
      id, record.draftId ?? null, JSON.stringify(record.nodeRef ?? null), String(record.ontologyVersion),
      record.background ?? null, 'queued', nowIso(), JSON.stringify(budget), record.generatorVersion ?? null,
    );
    return this.getRun(id);
  }

  /**
   * 更新任务的**生命周期与统计**。
   *
   * `candidates` 是便利写法（api 在完成时一并回填），候选内容本身仍走 `saveCandidates`，
   * 这样「任务状态」与「候选结果」两份数据的写入路径只有一条。
   */
  updateRun(id, patch = {}) {
    const row = this.runRow(id);
    if (!row) throw new McsError(CODES.NOT_FOUND, `无法解析任务：${id}`, 404, { run_id: id });
    assertDeclarativeData(patch, 'run.patch');
    const status = patch.status ?? row.status;
    if (patch.status !== undefined && !RUN_LIFECYCLE.includes(patch.status)) {
      throw new McsError(CODES.BAD_REQUEST, `任务状态非法：${patch.status}`, 400, { allowed: RUN_LIFECYCLE });
    }
    const terminal = ['completed', 'interrupted', 'cancelled', 'error'].includes(status);
    const stats = patch.stats !== undefined ? patch.stats : parseJson(row.stats_json, null);
    const error = patch.error !== undefined ? patch.error : parseJson(row.error_json, null);
    const interrupted = patch.interrupted !== undefined ? (patch.interrupted ? 1 : 0) : row.interrupted;
    const finishedAt = patch.finishedAt !== undefined ? patch.finishedAt : (terminal ? (row.finished_at ?? nowIso()) : null);
    const budget = patch.budget !== undefined ? patch.budget : parseJson(row.budget_json, {});
    const background = patch.background !== undefined ? patch.background : row.background;
    const generatorVersion = patch.generatorVersion !== undefined ? patch.generatorVersion : row.generator_version;
    this.transaction(() => {
      this.db.prepare(
        'UPDATE runs SET status = ?, finished_at = ?, stats_json = ?, interrupted = ?, error_json = ?,' +
        ' budget_json = ?, background = ?, generator_version = ? WHERE id = ?'
      ).run(status, finishedAt, stats === null ? null : JSON.stringify(stats), interrupted,
        error === null ? null : JSON.stringify(error), JSON.stringify(budget ?? {}), background, generatorVersion, id);
      if (patch.candidates !== undefined) this.writeCandidates(id, patch.candidates);
    });
    return this.getRun(id);
  }

  getRun(id) {
    const row = this.runRow(id);
    if (!row) throw new McsError(CODES.NOT_FOUND, `无法解析任务：${id}`, 404, { run_id: id });
    return this.runView(row, { candidates: this.listCandidates(id) });
  }

  /**
   * 任务列表**不带全部候选**。
   *
   * 50 个任务 × 100 个候选会把这个本地接口的响应撑到几十兆，而列表页只需要
   * 「有多少条、验出几条」。想看候选就用 `GET /relation-discovery/jobs/:id`。
   */
  listRuns({ limit = 50 } = {}) {
    const capped = Math.min(Math.max(Number(limit) || 50, 1), 500);
    return this.db.prepare('SELECT * FROM runs ORDER BY started_at DESC LIMIT ?').all(capped).map((row) => this.runView(row));
  }

  /** 取消：**保留已完成候选**。中断不是数学反驳，已核验结果继续留在库里。 */
  async cancelRun(id) {
    const row = this.runRow(id);
    if (!row) throw new McsError(CODES.NOT_FOUND, `无法解析任务：${id}`, 404, { run_id: id });
    if (!['queued', 'running'].includes(row.status)) {
      return { ...this.getRun(id), cancelled: false, note: '任务已结束，取消不改变结果。' };
    }
    this.db.prepare('UPDATE runs SET status = ?, finished_at = ?, error_json = ? WHERE id = ?')
      .run('cancelled', nowIso(), JSON.stringify({ code: CODES.JOB_CANCELLED, message: '任务已取消；已完成的候选结果保留。' }), id);
    return { ...this.getRun(id), cancelled: true };
  }

  /**
   * 服务重启后的收尾（规格 §8.3）。
   *
   * 只把**还在跑**的任务标成 interrupted，并如实说明「中断不等于数学反驳」；
   * 候选的 math 状态一个都不动——已核验的仍是 verified，未决的仍是 undecided。
   * 这正是「保留已核验结果」的实现：中断只影响任务的运行状态，不碰数学判断。
   */
  markInterruptedRuns() {
    const rows = this.db.prepare("SELECT * FROM runs WHERE status IN ('running', 'queued')").all();
    if (rows.length === 0) return { count: 0, interrupted: [] };
    const time = nowIso();
    this.transaction(() => {
      const statement = this.db.prepare('UPDATE runs SET status = ?, finished_at = ?, interrupted = 1 WHERE id = ?');
      for (const row of rows) statement.run('interrupted', time, row.id);
    });
    return {
      count: rows.length,
      interrupted: rows.map((row) => ({
        id: row.id,
        previousStatus: row.status,
        status: 'interrupted',
        finishedAt: time,
        note: '服务重启导致中断；已核验结果保留，未完成部分不作数学结论。',
      })),
    };
  }

  /* ------------------------------------------------------------ candidates */

  candidateView(row) {
    const payload = parseJson(row.payload_json, {});
    return { ...payload, id: row.candidate_id, runId: row.run_id, kind: row.kind, review: row.review };
  }

  /**
   * 写入候选（覆盖式）。
   *
   * `updateRun` 也会调它，所以真正的写入体拆成 `writeCandidates`（**不开事务**）：
   * SQLite 不支持嵌套 `BEGIN`，在里面再开一个事务会直接报 "SQL logic error"
   * ——这正是联调时踩到的那个 500。
   */
  saveCandidates(runId, candidates = []) {
    const row = this.runRow(runId);
    if (!row) throw new McsError(CODES.NOT_FOUND, `无法解析任务：${runId}`, 404, { run_id: runId });
    assert(Array.isArray(candidates), CODES.BAD_REQUEST, 'saveCandidates 需要数组');
    assertDeclarativeData(candidates, 'candidates');
    return this.transaction(() => this.writeCandidates(runId, candidates));
  }

  writeCandidates(runId, candidates = []) {
    const base = this.db.prepare('SELECT COALESCE(MAX(seq), 0) AS max FROM candidates WHERE run_id = ?').get(runId).max;
    const insert = this.db.prepare(
      'INSERT INTO candidates(run_id, candidate_id, seq, kind, math_status, review, payload_json, updated_at)' +
      ' VALUES (?, ?, ?, ?, ?, ?, ?, ?)' +
      ' ON CONFLICT(run_id, candidate_id) DO UPDATE SET kind = excluded.kind,' +
      ' math_status = excluded.math_status, review = excluded.review, payload_json = excluded.payload_json, updated_at = excluded.updated_at'
    );
    const findOne = this.db.prepare('SELECT seq, review FROM candidates WHERE run_id = ? AND candidate_id = ?');
    const time = nowIso();
    let seq = base;
    const written = [];
    for (const candidate of candidates) {
      const id = requireText(candidate?.id, CODES.BAD_REQUEST, '候选缺少 id', 200);
      const existing = findOne.get(runId, id);
      /*
       * 审阅状态**不因重放而被冲掉**：重放刷新的是结论，不是人的选择。
       * 只有调用方显式给出非 pending 的审阅状态时才覆盖（那是 `setReview` 的职责）。
       */
      const incomingReview = REVIEW_STATUSES.includes(candidate.review) ? candidate.review : 'pending';
      const review = incomingReview !== 'pending' ? incomingReview : (existing?.review ?? 'pending');
      if (!existing) seq += 1;
      const math = MATH_JUDGMENTS.includes(candidate?.math?.status) ? candidate.math.status : 'undecided';
      const payload = { ...candidate };
      delete payload.review;
      // 已存在的候选保留原 seq：候选顺序描述的是「发现的次序」，不该被重放打乱。
      insert.run(runId, id, existing ? existing.seq : seq,
        String(candidate.kind ?? 'unknown'), math, review, JSON.stringify(payload), time);
      written.push(id);
    }
    return { runId, saved: written.length, candidateIds: written };
  }

  listCandidates(runId, { math = null, review = null } = {}) {
    const conditions = ['run_id = ?'];
    const params = [runId];
    if (math) { conditions.push('math_status = ?'); params.push(math); }
    if (review) { conditions.push('review = ?'); params.push(review); }
    return this.db.prepare(`SELECT * FROM candidates WHERE ${conditions.join(' AND ')} ORDER BY seq`).all(...params)
      .map((row) => this.candidateView(row));
  }

  setReview(runId, candidateIds, review) {
    const row = this.runRow(runId);
    if (!row) throw new McsError(CODES.NOT_FOUND, `无法解析任务：${runId}`, 404, { run_id: runId });
    assert(REVIEW_STATUSES.includes(review), CODES.BAD_REQUEST, `审阅状态非法：${review}`, { allowed: REVIEW_STATUSES });
    assert(Array.isArray(candidateIds) && candidateIds.length > 0, CODES.BAD_REQUEST, 'setReview 需要非空的 candidateIds');
    const update = this.db.prepare('UPDATE candidates SET review = ?, updated_at = ? WHERE run_id = ? AND candidate_id = ?');
    const time = nowIso();
    let updated = 0;
    this.transaction(() => {
      for (const id of candidateIds) {
        const result = update.run(review, time, runId, String(id));
        updated += Number(result.changes ?? 0);
      }
    });
    return { runId, review, updated, candidates: this.listCandidates(runId) };
  }

  /* ---------------------------------------------------------- publications */

  publicationView(row) {
    return {
      id: row.id,
      idempotencyKey: row.idempotency_key ?? null,
      draftId: row.draft_id ?? null,
      kind: row.kind,
      revision: parseJson(row.revision_json, null),
      result: parseJson(row.result_json, null),
      requestDigest: row.request_digest ?? null,
      createdAt: row.created_at,
    };
  }

  createPublication(record = {}) {
    assertDeclarativeData(record, 'publication');
    const id = requireText(record.id, CODES.BAD_REQUEST, '发布记录需要 id', 200);
    const existing = this.db.prepare('SELECT * FROM publications WHERE id = ?').get(id);
    if (existing) return this.publicationView(existing);
    const key = record.idempotencyKey ? String(record.idempotencyKey).slice(0, 200) : null;
    if (key) {
      const clash = this.findPublicationByIdempotency(key);
      if (clash) {
        // 同一个键落在两条不同内容上：这是调用方把键复用错了，必须报出来，不能覆盖。
        if (clash.requestDigest && record.requestDigest && clash.requestDigest !== record.requestDigest) {
          throw new McsError(CODES.CONFLICT, `幂等键已用于另一次发布请求：${key}`, 409, { idempotency_key: key, existing: clash.id });
        }
        return clash;
      }
    }
    this.db.prepare(
      'INSERT INTO publications(id, idempotency_key, draft_id, kind, revision_json, result_json, request_digest, created_at)' +
      ' VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    ).run(id, key, record.draftId ?? null, String(record.kind ?? 'publish'),
      JSON.stringify(record.revision ?? null), JSON.stringify(record.result ?? null),
      record.requestDigest ?? null, nowIso());
    return this.publicationView(this.db.prepare('SELECT * FROM publications WHERE id = ?').get(id));
  }

  getPublication(id) {
    const row = this.db.prepare('SELECT * FROM publications WHERE id = ?').get(id);
    if (!row) throw new McsError(CODES.NOT_FOUND, `无法解析发布记录：${id}`, 404, { publication_id: id });
    return this.publicationView(row);
  }

  listPublications({ limit = 100 } = {}) {
    const capped = Math.min(Math.max(Number(limit) || 100, 1), 1000);
    return this.db.prepare('SELECT * FROM publications ORDER BY created_at DESC LIMIT ?').all(capped).map((row) => this.publicationView(row));
  }

  findPublicationByIdempotency(key) {
    if (!key) return null;
    const row = this.db.prepare('SELECT * FROM publications WHERE idempotency_key = ?').get(String(key).slice(0, 200));
    return row ? this.publicationView(row) : null;
  }

  /** 幂等键的请求指纹由 `server/publication.mjs` 计算（那里才知道哪些字段算「同一次请求」）。 */
  getActiveRevision() {
    const id = this.metaGet('active_revision_id');
    if (!id) return null;
    return {
      revisionId: id,
      revision: Number(this.metaGet('active_revision') ?? 0),
      updatedAt: this.metaGet('active_revision_at'),
    };
  }

  setActiveRevision(id, revision = null) {
    const record = revision && typeof revision === 'object' ? revision : { revision };
    if (id === null || id === undefined) {
      this.metaSet('active_revision_id', null);
      this.metaSet('active_revision', null);
      this.metaSet('active_revision_at', null);
      return null;
    }
    const next = Number(record.revision ?? 0) || (this.getActiveRevision()?.revision ?? 0);
    this.transaction(() => {
      this.metaSet('active_revision_id', String(id));
      this.metaSet('active_revision', String(next));
      this.metaSet('active_revision_at', nowIso());
    });
    return this.getActiveRevision();
  }

  stats() {
    const count = (table) => this.db.prepare(`SELECT COUNT(*) AS count FROM ${table}`).get().count;
    return {
      schemaVersion: this.metaGet('schema_version'),
      drafts: count('drafts'),
      runs: count('runs'),
      candidates: count('candidates'),
      publications: count('publications'),
      activeRevision: this.getActiveRevision()?.revisionId ?? null,
      file: basename(this.file),
    };
  }

  close() { this.db.close(); }
}
