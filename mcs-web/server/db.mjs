import { randomUUID } from 'node:crypto';
import { VaultStore } from './vault-store.mjs';
import { NetworkStore } from './network-store.mjs';
import { mkdirSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve, basename } from 'node:path';
import { McsError, CODES } from '../shared/errors.mjs';
import { canonicalString, normalizeEvent, normalizeNetworkView, normalizeNote, normalizeProfileDraft, normalizeDirection, assert } from '../shared/contracts.mjs';
import { createDriverFromConfig } from './sql-driver.mjs';
import { normalizeLearningPlan, EMPTY_LEARNING_PLAN } from '../shared/learning-plan.mjs';

const SCHEMA_VERSION = 'mcs-web-db/1';

function nowIso() { return new Date().toISOString(); }

function parseJson(value, fallback = null) {
  if (value === null || value === undefined) return fallback;
  if (typeof value === 'object') return value; // PostgreSQL 的 jsonb 会直接给对象
  try { return JSON.parse(value); } catch { return fallback; }
}

/**
 * 学习数据（E 层）：档案、事件、笔记、网络视图。
 *
 * ## 2026-10-05：从「只有 SQLite」改成「统一异步接口 + 可换驱动」
 *
 * 语义**一条都没改**，改的是三件事：
 *
 * 1. 所有方法变成 `async`，SQL 由 `sql-driver.mjs` 的驱动执行
 *    （本机 = SQLite，公网 = PostgreSQL）。调用方一律 `await`，
 *    对同步值 `await` 是恒等操作，所以本机行为不变。
 * 2. 自增主键的写法由驱动给出（SQLite `INTEGER PRIMARY KEY AUTOINCREMENT`
 *    与 PostgreSQL `SERIAL` 不能共用一份 DDL）。
 * 3. 备份 / 恢复分方言：SQLite 是**物理备份**（复制文件），
 *    PostgreSQL 是**逻辑备份**（导出为 JSON，恢复时整库回填）。
 *    两者都在同一层提供，不把「怎么备份」推给调用方。
 *
 * 事件去重、revision 冲突、导入「全有或全无」这些判据只写在下面这一处——
 * 两份实现漂移会让「同一份导出，本机与公网结果不同」，那是数据事故。
 */
export class McsDatabase {
  constructor({ driver }) {
    if (!driver) throw new McsError(CODES.INTERNAL, 'McsDatabase 需要 driver（见 server/sql-driver.mjs）。', 500);
    this.driver = driver;
    this.vaults = new VaultStore(driver);
    this.networks = new NetworkStore(driver);
    this.file = driver.file ?? null;
  }

  static async open({ config }) {
    const db = new McsDatabase({ driver: await createDriverFromConfig(config) });
    await db.migrate();
    return db;
  }

  describe() { return this.driver.describe(); }

  /** DDL：`__SEQ__` 由驱动替换成方言写法（SQLite 的 AUTOINCREMENT / PostgreSQL 的 SERIAL）。 */
  async migrate() {
    const ddl = [
      'CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT NOT NULL)',
      'CREATE TABLE IF NOT EXISTS verification_runs (run_id TEXT PRIMARY KEY, owner_id TEXT NOT NULL, status TEXT NOT NULL, record_json TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL)',
      'CREATE TABLE IF NOT EXISTS profiles (' +
      '  id TEXT PRIMARY KEY, name TEXT NOT NULL, model_version TEXT NOT NULL,' +
      '  revision INTEGER NOT NULL DEFAULT 1, kind TEXT NOT NULL DEFAULT \'personal\',' +
      '  archived INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL, updated_at TEXT NOT NULL' +
      ')',
      'CREATE TABLE IF NOT EXISTS events (' +
      '  seq __SEQ__, profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,' +
      '  event_id TEXT NOT NULL, ontology_version TEXT NOT NULL, kind TEXT NOT NULL, node_id TEXT NOT NULL,' +
      '  occurred_at TEXT NOT NULL, base_revision INTEGER, source_json TEXT NOT NULL,' +
      '  evidence_refs_json TEXT NOT NULL, payload_json TEXT NOT NULL, stored_at TEXT NOT NULL,' +
      '  UNIQUE(profile_id, event_id)' +
      ')',
      'CREATE INDEX IF NOT EXISTS idx_events_profile ON events(profile_id, seq)',
      'CREATE INDEX IF NOT EXISTS idx_events_node ON events(profile_id, node_id)',
      'CREATE TABLE IF NOT EXISTS notes (' +
      '  note_id TEXT PRIMARY KEY, profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,' +
      '  node_id TEXT, title TEXT NOT NULL, body TEXT NOT NULL, tags_json TEXT NOT NULL,' +
      '  created_at TEXT NOT NULL, updated_at TEXT NOT NULL, revision INTEGER NOT NULL' +
      ')',
      'CREATE INDEX IF NOT EXISTS idx_notes_profile ON notes(profile_id, updated_at)',
      // User-wide E data. Tombstones erase the text but keep monotone revisions,
      // so an old edit / undo cannot overwrite a deleted-and-recreated note.
      'CREATE TABLE IF NOT EXISTS connection_notes (' +
      '  owner_id TEXT NOT NULL, connection_key TEXT NOT NULL, body TEXT NOT NULL,' +
      '  revision INTEGER NOT NULL, deleted INTEGER NOT NULL DEFAULT 0,' +
      '  created_at TEXT NOT NULL, updated_at TEXT NOT NULL,' +
      '  PRIMARY KEY(owner_id, connection_key)' +
      ')',
      /*
       * 保存的知识网络视图（E 层）。**附加式** DDL：`SCHEMA_VERSION` 不跟着升——
       * 版本号是被严格比对的，升它会把已有数据库整个判成「不兼容」，新增一张表不需要。
       */
      'CREATE TABLE IF NOT EXISTS network_views (' +
      '  view_id TEXT PRIMARY KEY, profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,' +
      '  name TEXT NOT NULL, payload_json TEXT NOT NULL,' +
      '  created_at TEXT NOT NULL, updated_at TEXT NOT NULL, revision INTEGER NOT NULL' +
      ')',
      'CREATE INDEX IF NOT EXISTS idx_network_views_profile ON network_views(profile_id, updated_at)',
      /*
       * 学习者声明的**学习方向**（E 层，2026-10 加）。同样是附加式 DDL，`SCHEMA_VERSION` 不升。
       *
       * 为什么要有这张表而不是只存事件：方向是界面**每次渲染都要读**的东西
       * （「下一步该学什么」由它排序）。只靠事件回放要先把整个事件流拉下来再扫一遍，
       * 而这里的每一行都是同一条 `kind: 'goal'` 事件加 `payload.intent = 'direction'` 的镜像
       * ——事件仍然是导出与审计的事实来源，这张表只是快查用的索引。
       */
      'CREATE TABLE IF NOT EXISTS learning_directions (' +
      '  direction_id TEXT PRIMARY KEY, profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,' +
      '  node_id TEXT NOT NULL, note TEXT, source_ref TEXT NOT NULL,' +
      '  created_at TEXT NOT NULL, updated_at TEXT NOT NULL' +
      ')',
      'CREATE INDEX IF NOT EXISTS idx_learning_directions_profile ON learning_directions(profile_id, created_at)',
      'CREATE TABLE IF NOT EXISTS learning_plans (' +
      ' profile_id TEXT PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,' +
      ' payload_json TEXT NOT NULL, revision INTEGER NOT NULL, updated_at TEXT NOT NULL' +
      ')',
    ].join(';\n');
    await this.driver.exec(ddl.replaceAll('__SEQ__', this.driver.seqColumnDdl));
    const current = await this.driver.get('SELECT value FROM meta WHERE key = ?', ['schema_version']);
    if (!current) await this.driver.run('INSERT INTO meta(key, value) VALUES (?, ?)', ['schema_version', SCHEMA_VERSION]);
    else if (current.value !== SCHEMA_VERSION) throw new McsError(CODES.INTERNAL, `数据库版本不兼容：${current.value}，期望 ${SCHEMA_VERSION}`, 500);
    await this.vaults.migrate();
    await this.networks.migrate();
  }

  async profileRow(id) {
    const row = await this.driver.get('SELECT * FROM profiles WHERE id = ?', [id]);
    if (!row) throw new McsError(CODES.UNKNOWN_PROFILE, `无法解析档案：${id}`, 404, { profile_id: id });
    return row;
  }

  profileView(row) {
    return {
      id: row.id,
      name: row.name,
      modelVersion: row.model_version,
      revision: Number(row.revision),
      kind: row.kind,
      archived: Boolean(row.archived),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  async createProfile(raw) {
    const draft = normalizeProfileDraft(raw);
    const id = `profile-${randomUUID()}`;
    const time = nowIso();
    await this.driver.run('INSERT INTO profiles(id, name, model_version, revision, kind, archived, created_at, updated_at) VALUES (?, ?, ?, 1, ?, 0, ?, ?)',
      [id, draft.name, draft.modelVersion, draft.kind, time, time]);
    return this.profileView(await this.profileRow(id));
  }

  async listProfiles({ includeArchived = false } = {}) {
    const rows = includeArchived
      ? await this.driver.all('SELECT * FROM profiles ORDER BY created_at')
      : await this.driver.all('SELECT * FROM profiles WHERE archived = 0 ORDER BY created_at');
    return rows.map((row) => this.profileView(row));
  }

  async getProfile(id) { return this.profileView(await this.profileRow(id)); }

  connectionNoteView(row) {
    return { key: row.connection_key, body: row.body, revision: Number(row.revision), createdAt: row.created_at, updatedAt: row.updated_at };
  }

  async listConnectionNotes(ownerId) {
    return (await this.driver.all('SELECT * FROM connection_notes WHERE owner_id = ? AND deleted = 0 ORDER BY connection_key', [ownerId]))
      .map(row => this.connectionNoteView(row));
  }

  async putConnectionNote(ownerId, key, raw) {
    assert(typeof key === 'string' && key.length <= 4096, CODES.BAD_REQUEST, '连接标识无效');
    assert(typeof raw.body === 'string' && raw.body.trim().length > 0 && raw.body.length <= 4000, CODES.BAD_REQUEST, '备注须为 1–4000 个字符');
    const revision = raw.baseRevision;
    assert(Number.isSafeInteger(revision) && revision >= 0, CODES.BAD_REQUEST, '需要有效的备注修订号');
    const time = nowIso();
    const row = revision === 0
      ? await this.driver.get('INSERT INTO connection_notes(owner_id, connection_key, body, revision, deleted, created_at, updated_at) VALUES (?, ?, ?, 1, 0, ?, ?) ' +
          'ON CONFLICT(owner_id, connection_key) DO UPDATE SET body = excluded.body, deleted = 0, revision = connection_notes.revision + 1, updated_at = excluded.updated_at ' +
          'WHERE connection_notes.deleted = 1 RETURNING *', [ownerId, key, raw.body, time, time])
      : await this.driver.get('UPDATE connection_notes SET body = ?, deleted = 0, revision = revision + 1, updated_at = ? ' +
          'WHERE owner_id = ? AND connection_key = ? AND revision = ? RETURNING *', [raw.body, time, ownerId, key, revision]);
    if (!row) throw new McsError(CODES.CONFLICT, '备注已在其他页面修改，请重新载入；当前输入仍可保留。', 409);
    return this.connectionNoteView(row);
  }

  async deleteConnectionNote(ownerId, key, baseRevision) {
    assert(Number.isSafeInteger(baseRevision) && baseRevision > 0, CODES.BAD_REQUEST, '需要有效的备注修订号');
    const row = await this.driver.get('UPDATE connection_notes SET body = ?, deleted = 1, revision = revision + 1, updated_at = ? ' +
      'WHERE owner_id = ? AND connection_key = ? AND revision = ? AND deleted = 0 RETURNING revision', ['', nowIso(), ownerId, key, baseRevision]);
    if (!row) throw new McsError(CODES.CONFLICT, '备注已在其他页面修改或取消，请重新载入。', 409);
    return { deleted: true, key, revision: Number(row.revision) };
  }

  async updateProfile(id, patch = {}) {
    const row = await this.profileRow(id);
    const name = patch.name === undefined ? row.name : String(patch.name).slice(0, 80);
    const archived = patch.archived === undefined ? row.archived : (patch.archived ? 1 : 0);
    await this.driver.run('UPDATE profiles SET name = ?, archived = ?, revision = revision + 1, updated_at = ? WHERE id = ?',
      [name, archived, nowIso(), id]);
    return this.getProfile(id);
  }

  async deleteProfile(id) {
    await this.profileRow(id);
    await this.driver.transaction(async () => {
      await this.driver.run('DELETE FROM profiles WHERE id = ?', [id]);
    });
    return { deleted: true, profileId: id };
  }

  eventView(row) {
    return {
      seq: Number(row.seq),
      eventId: row.event_id,
      profileId: row.profile_id,
      ontologyVersion: row.ontology_version,
      kind: row.kind,
      nodeId: row.node_id,
      occurredAt: row.occurred_at,
      baseRevision: row.base_revision === null || row.base_revision === undefined ? null : Number(row.base_revision),
      source: parseJson(row.source_json, {}),
      evidenceRefs: parseJson(row.evidence_refs_json, []),
      payload: parseJson(row.payload_json, {}),
      storedAt: row.stored_at,
    };
  }

  /*
   * 事件读取分两个用途，**不能共用同一个上限**（2026-10 修复）：
   *
   * 1. `listEvents`（列表/界面）：按需分页，`before` 是游标（上一页最小 seq），
   *    默认 200、单次最多 2000。这是给人翻的。
   * 2. `listAllEvents`（状态重建/导出/证据核对）：**必须拿全**。
   *    从前它们都用 `limit: 2000`，于是第 2001 条之后的确认事件被静默丢掉，
   *    导出缺记录、θ.known 缺确认，界面却显示成功。
   *
   * 分页用 keyset（`seq < before`）而不是 offset：事件是只追加的，
   * 翻页期间插入新事件不会让旧页错位或漏项。
   */
  async listEvents(profileId, { limit = 200, nodeId = null, kind = null, before = null } = {}) {
    await this.profileRow(profileId);
    const conditions = ['profile_id = ?'];
    const params = [profileId];
    if (nodeId) { conditions.push('node_id = ?'); params.push(nodeId); }
    if (kind) { conditions.push('kind = ?'); params.push(kind); }
    const cursor = Number(before);
    if (Number.isFinite(cursor) && cursor > 0) { conditions.push('seq < ?'); params.push(Math.floor(cursor)); }
    params.push(Math.min(Math.max(Number(limit) || 200, 1), 2000));
    const rows = await this.driver.all(`SELECT * FROM events WHERE ${conditions.join(' AND ')} ORDER BY seq DESC LIMIT ?`, params);
    return rows.map((row) => this.eventView(row)).reverse();
  }

  /** 事件的完整序列（升序，无上限）。状态重建、导出与证据核对走这里。 */
  async listAllEvents(profileId, { nodeId = null, kind = null } = {}) {
    await this.profileRow(profileId);
    const conditions = ['profile_id = ?'];
    const params = [profileId];
    if (nodeId) { conditions.push('node_id = ?'); params.push(nodeId); }
    if (kind) { conditions.push('kind = ?'); params.push(kind); }
    const rows = await this.driver.all(`SELECT * FROM events WHERE ${conditions.join(' AND ')} ORDER BY seq ASC`, params);
    return rows.map((row) => this.eventView(row));
  }

  /** 事件总数：导出与界面用它如实说明「一共有多少条」，不靠当前页长度猜。 */
  async countEvents(profileId, { nodeId = null, kind = null } = {}) {
    await this.profileRow(profileId);
    const conditions = ['profile_id = ?'];
    const params = [profileId];
    if (nodeId) { conditions.push('node_id = ?'); params.push(nodeId); }
    if (kind) { conditions.push('kind = ?'); params.push(kind); }
    // CAST：PostgreSQL 的 COUNT(*) 是 bigint，node-pg 会把它当字符串返回。
    const row = await this.driver.get(`SELECT CAST(COUNT(*) AS INTEGER) AS count FROM events WHERE ${conditions.join(' AND ')}`, params);
    return Number(row?.count ?? 0);
  }

  /** 按事件 ID 精确取一条；找不到返回 null（供引用核对，不再全表扫描）。 */
  async findEvent(profileId, eventId) {
    await this.profileRow(profileId);
    const row = await this.driver.get('SELECT * FROM events WHERE profile_id = ? AND event_id = ?', [profileId, eventId]);
    return row ? this.eventView(row) : null;
  }

  async appendEvent(profileId, event, { merge = false } = {}) {
    const profile = await this.profileRow(profileId);
    const existing = await this.driver.get('SELECT * FROM events WHERE profile_id = ? AND event_id = ?', [profileId, event.eventId]);
    if (existing) {
      const stored = this.eventView(existing);
      const same = canonicalString({ kind: stored.kind, nodeId: stored.nodeId, source: stored.source, payload: stored.payload, evidenceRefs: stored.evidenceRefs }) ===
        canonicalString({ kind: event.kind, nodeId: event.nodeId, source: event.source, payload: event.payload, evidenceRefs: event.evidenceRefs });
      if (!same) throw new McsError(CODES.EVENT_ID_CONFLICT, `事件 ID 已存在但内容不同：${event.eventId}`, 409, { event_id: event.eventId });
      return { duplicate: true, revision: Number(profile.revision), eventId: event.eventId };
    }
    if (event.baseRevision !== null && event.baseRevision !== undefined && event.baseRevision !== Number(profile.revision) && !merge) {
      throw new McsError(CODES.CONFLICT, `档案 revision 冲突：期望 ${event.baseRevision}，当前 ${profile.revision}`, 409, { expected: event.baseRevision, current: Number(profile.revision), merge_available: true });
    }
    await this.driver.transaction(async () => {
      await this.driver.run('INSERT INTO events(profile_id, event_id, ontology_version, kind, node_id, occurred_at, base_revision, source_json, evidence_refs_json, payload_json, stored_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [profileId, event.eventId, event.ontologyVersion ?? 'unknown', event.kind, event.nodeId, event.occurredAt, event.baseRevision ?? null,
          JSON.stringify(event.source), JSON.stringify(event.evidenceRefs), JSON.stringify(event.payload), nowIso()]);
      await this.driver.run('UPDATE profiles SET revision = revision + 1, updated_at = ? WHERE id = ?', [nowIso(), profileId]);
    });
    return { duplicate: false, revision: Number(profile.revision) + 1, eventId: event.eventId };
  }

  /** 视图行 → 对象：payload 是 JSON，读出来还原成结构化数据。 */
  networkViewView(row) {
    return {
      viewId: row.view_id,
      profileId: row.profile_id,
      name: row.name,
      payload: parseJson(row.payload_json, {}),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      revision: Number(row.revision),
    };
  }

  async listNetworkViews(profileId) {
    await this.profileRow(profileId);
    const rows = await this.driver.all('SELECT * FROM network_views WHERE profile_id = ? ORDER BY updated_at DESC', [profileId]);
    return rows.map((row) => this.networkViewView(row));
  }

  async createNetworkView(profileId, raw) {
    const profile = await this.profileRow(profileId);
    const draft = normalizeNetworkView(raw);
    if (draft.baseRevision !== null && draft.baseRevision !== Number(profile.revision)) {
      throw new McsError(CODES.CONFLICT, `档案 revision 冲突：期望 ${draft.baseRevision}，当前 ${profile.revision}`, 409, { expected: draft.baseRevision, current: Number(profile.revision) });
    }
    const viewId = `view-${randomUUID()}`;
    const time = nowIso();
    await this.driver.transaction(async () => {
      await this.driver.run('INSERT INTO network_views(view_id, profile_id, name, payload_json, created_at, updated_at, revision) VALUES (?, ?, ?, ?, ?, ?, 1)',
        [viewId, profileId, draft.name, JSON.stringify(draft.payload), time, time]);
      await this.driver.run('UPDATE profiles SET revision = revision + 1, updated_at = ? WHERE id = ?', [time, profileId]);
    });
    return this.networkViewView(await this.driver.get('SELECT * FROM network_views WHERE view_id = ?', [viewId]));
  }

  async updateNetworkView(profileId, viewId, raw) {
    const profile = await this.profileRow(profileId);
    const row = await this.driver.get('SELECT * FROM network_views WHERE view_id = ? AND profile_id = ?', [viewId, profileId]);
    if (!row) throw new McsError(CODES.NOT_FOUND, `无法解析视图：${viewId}`, 404);
    const draft = normalizeNetworkView({ ...this.networkViewView(row), ...raw });
    if (draft.baseRevision !== null && draft.baseRevision !== Number(profile.revision)) {
      throw new McsError(CODES.CONFLICT, `档案 revision 冲突：期望 ${draft.baseRevision}，当前 ${profile.revision}`, 409, { expected: draft.baseRevision, current: Number(profile.revision) });
    }
    const time = nowIso();
    await this.driver.transaction(async () => {
      await this.driver.run('UPDATE network_views SET name = ?, payload_json = ?, updated_at = ?, revision = revision + 1 WHERE view_id = ?',
        [draft.name, JSON.stringify(draft.payload), time, viewId]);
      await this.driver.run('UPDATE profiles SET revision = revision + 1, updated_at = ? WHERE id = ?', [time, profileId]);
    });
    return this.networkViewView(await this.driver.get('SELECT * FROM network_views WHERE view_id = ?', [viewId]));
  }

  async deleteNetworkView(profileId, viewId) {
    const profile = await this.profileRow(profileId);
    const row = await this.driver.get('SELECT * FROM network_views WHERE view_id = ? AND profile_id = ?', [viewId, profileId]);
    if (!row) throw new McsError(CODES.NOT_FOUND, `无法解析视图：${viewId}`, 404);
    await this.driver.transaction(async () => {
      await this.driver.run('DELETE FROM network_views WHERE view_id = ?', [viewId]);
      await this.driver.run('UPDATE profiles SET revision = revision + 1, updated_at = ? WHERE id = ?', [nowIso(), profileId]);
    });
    return { deleted: true, viewId, revision: Number(profile.revision) + 1 };
  }

  directionView(row) {
    return {
      directionId: row.direction_id,
      profileId: row.profile_id,
      /** 声明的方向目标（节点 id）。 */
      nodeId: row.node_id,
      /** 学习者自己写的一句话（可空）。 */
      note: row.note ?? null,
      /** 这条方向是**谁**写的：`ui` = 界面上声明的，`seed` = 脚本预置的。可核。 */
      sourceRef: row.source_ref,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  /** 某个档案声明的全部方向，按声明时间升序（第一个即当前方向）。 */
  async getLearningPlan(profileId) {
    await this.profileRow(profileId);
    const row = await this.driver.get('SELECT * FROM learning_plans WHERE profile_id = ?', [profileId]);
    if (!row) return { ...EMPTY_LEARNING_PLAN, revision: 0 };
    return { ...normalizeLearningPlan(parseJson(row.payload_json)), revision: Number(row.revision), updatedAt: row.updated_at };
  }

  async putLearningPlan(profileId, raw) {
    const draft = normalizeLearningPlan(raw);
    const revision = raw.baseRevision;
    assert(Number.isSafeInteger(revision) && revision >= 0, CODES.BAD_REQUEST, '需要学习方案的有效修订号');
    await this.profileRow(profileId);
    return this.driver.transaction(async () => {
      const time = nowIso();
      const row = revision === 0
        ? await this.driver.get('INSERT INTO learning_plans(profile_id, payload_json, revision, updated_at) VALUES (?, ?, 1, ?) ON CONFLICT(profile_id) DO NOTHING RETURNING *', [profileId, canonicalString(draft), time])
        : await this.driver.get('UPDATE learning_plans SET payload_json = ?, revision = revision + 1, updated_at = ? WHERE profile_id = ? AND revision = ? RETURNING *', [canonicalString(draft), time, profileId, revision]);
      if (!row) throw new McsError(CODES.CONFLICT, '学习方案已在其他页面修改，请重新载入；当前选择仍可保留。', 409);
      await this.driver.run('UPDATE profiles SET revision = revision + 1, updated_at = ? WHERE id = ?', [time, profileId]);
      return { ...draft, revision: Number(row.revision), updatedAt: row.updated_at };
    });
  }

  async listDirections(profileId) {
    await this.profileRow(profileId);
    const rows = await this.driver.all('SELECT * FROM learning_directions WHERE profile_id = ? ORDER BY created_at ASC', [profileId]);
    return rows.map((row) => this.directionView(row));
  }

  /**
   * 声明一个方向。
   *
   * **幂等**：同一个档案对同一个节点重复声明不会新增一行（返回已有的那条，`created: false`）
   * ——学习者在两个入口点同一个方向时，不该在列表里出现两条一样的。
   */
  async createDirection(profileId, raw) {
    const profile = await this.profileRow(profileId);
    const draft = normalizeDirection(raw);
    const existing = await this.driver.get(
      'SELECT * FROM learning_directions WHERE profile_id = ? AND node_id = ?',
      [profileId, draft.nodeId],
    );
    if (existing) return { direction: this.directionView(existing), created: false };
    const directionId = `direction-${randomUUID()}`;
    const time = nowIso();
    await this.driver.transaction(async () => {
      await this.driver.run(
        'INSERT INTO learning_directions(direction_id, profile_id, node_id, note, source_ref, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [directionId, profileId, draft.nodeId, draft.note, draft.sourceRef, time, time],
      );
      await this.driver.run('UPDATE profiles SET revision = revision + 1, updated_at = ? WHERE id = ?', [time, profileId]);
    });
    return {
      direction: this.directionView(await this.driver.get('SELECT * FROM learning_directions WHERE direction_id = ?', [directionId])),
      created: true,
      revision: Number(profile.revision) + 1,
    };
  }

  async deleteDirection(profileId, directionId) {
    const profile = await this.profileRow(profileId);
    const row = await this.driver.get('SELECT * FROM learning_directions WHERE direction_id = ? AND profile_id = ?', [directionId, profileId]);
    if (!row) throw new McsError(CODES.NOT_FOUND, `无法解析方向：${directionId}`, 404);
    await this.driver.transaction(async () => {
      await this.driver.run('DELETE FROM learning_directions WHERE direction_id = ?', [directionId]);
      await this.driver.run('UPDATE profiles SET revision = revision + 1, updated_at = ? WHERE id = ?', [nowIso(), profileId]);
    });
    return { deleted: true, directionId, revision: Number(profile.revision) + 1 };
  }

  noteView(row) {    return {
      noteId: row.note_id,
      profileId: row.profile_id,
      nodeId: row.node_id,
      title: row.title,
      body: row.body,
      tags: parseJson(row.tags_json, []),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      revision: Number(row.revision),
    };
  }

  async listNotes(profileId, { nodeId = null } = {}) {
    await this.profileRow(profileId);
    const rows = nodeId
      ? await this.driver.all('SELECT * FROM notes WHERE profile_id = ? AND node_id = ? ORDER BY updated_at DESC', [profileId, nodeId])
      : await this.driver.all('SELECT * FROM notes WHERE profile_id = ? ORDER BY updated_at DESC', [profileId]);
    return rows.map((row) => this.noteView(row));
  }

  async createNote(profileId, raw) {
    const profile = await this.profileRow(profileId);
    const draft = normalizeNote(raw);
    if (draft.baseRevision !== null && draft.baseRevision !== Number(profile.revision)) {
      throw new McsError(CODES.CONFLICT, `档案 revision 冲突：期望 ${draft.baseRevision}，当前 ${profile.revision}`, 409, { expected: draft.baseRevision, current: Number(profile.revision) });
    }
    const noteId = `note-${randomUUID()}`;
    const time = nowIso();
    await this.driver.transaction(async () => {
      await this.driver.run('INSERT INTO notes(note_id, profile_id, node_id, title, body, tags_json, created_at, updated_at, revision) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)',
        [noteId, profileId, draft.nodeId, draft.title, draft.body, JSON.stringify(draft.tags), time, time]);
      await this.driver.run('UPDATE profiles SET revision = revision + 1, updated_at = ? WHERE id = ?', [time, profileId]);
    });
    return this.noteView(await this.driver.get('SELECT * FROM notes WHERE note_id = ?', [noteId]));
  }

  async updateNote(profileId, noteId, raw) {
    const profile = await this.profileRow(profileId);
    const row = await this.driver.get('SELECT * FROM notes WHERE note_id = ? AND profile_id = ?', [noteId, profileId]);
    if (!row) throw new McsError(CODES.NOT_FOUND, `无法解析笔记：${noteId}`, 404);
    const draft = normalizeNote({ ...this.noteView(row), ...raw });
    if (draft.baseRevision !== null && draft.baseRevision !== Number(profile.revision)) {
      throw new McsError(CODES.CONFLICT, `档案 revision 冲突：期望 ${draft.baseRevision}，当前 ${profile.revision}`, 409, { expected: draft.baseRevision, current: Number(profile.revision) });
    }
    const time = nowIso();
    await this.driver.transaction(async () => {
      await this.driver.run('UPDATE notes SET node_id = ?, title = ?, body = ?, tags_json = ?, updated_at = ?, revision = revision + 1 WHERE note_id = ?',
        [draft.nodeId, draft.title, draft.body, JSON.stringify(draft.tags), time, noteId]);
      await this.driver.run('UPDATE profiles SET revision = revision + 1, updated_at = ? WHERE id = ?', [time, profileId]);
    });
    return this.noteView(await this.driver.get('SELECT * FROM notes WHERE note_id = ?', [noteId]));
  }

  async deleteNote(profileId, noteId) {
    const profile = await this.profileRow(profileId);
    const row = await this.driver.get('SELECT * FROM notes WHERE note_id = ? AND profile_id = ?', [noteId, profileId]);
    if (!row) throw new McsError(CODES.NOT_FOUND, `无法解析笔记：${noteId}`, 404);
    await this.driver.transaction(async () => {
      await this.driver.run('DELETE FROM notes WHERE note_id = ?', [noteId]);
      await this.driver.run('UPDATE profiles SET revision = revision + 1, updated_at = ? WHERE id = ?', [nowIso(), profileId]);
    });
    return { deleted: true, noteId, revision: Number(profile.revision) + 1 };
  }

  async exportProfile(profileId, { ontologyVersion } = {}) {
    const profile = await this.getProfile(profileId);
    return {
      schema: 'mcs-web-profile-export/1',
      exportedAt: nowIso(),
      ontologyVersion: ontologyVersion ?? null,
      profile,
      /*
       * 导出必须完整：这是「学习者带走自己的数据」的承诺。
       * 从前与界面共用 `limit: 2000`，第 2001 条起静默丢失（最早的事件先丢），
       * 而响应里没有任何截断提示——那是最坏的一种失败。现在取全量。
       */
      events: await this.listAllEvents(profileId),
      notes: await this.listNotes(profileId),
      networkViews: await this.listNetworkViews(profileId),
      /* 学习方向也是学习者的数据：导出必须完整（缺了它，别人拿到的档案会「没有方向」）。 */
      directions: await this.listDirections(profileId),
      learningPlan: await this.getLearningPlan(profileId),
    };
  }

  async importProfile(bundle, { name } = {}) {
    const profile = await this.createProfile({ name: name ?? bundle.profile?.name ?? '导入档案', modelVersion: bundle.profile?.modelVersion ?? 'mcs-import/1' });
    /*
     * 导入是**全有或全无**（2026-10 改）。
     *
     * 从前逐条 try/catch，失败的条目进 `skipped`，成功的照写——用户拿到一份
     * 「少了几条确认、少了几篇笔记」的档案，而它看起来是成功的。
     * 现在只要有任何一条写不进去，就删掉这个半成品档案并把原因报出来；
     * 要么完整搬过来，要么原样不动。
     */
    const skipped = [];
    try {
      for (const event of bundle.events ?? []) {
        try {
          /*
           * 导入走与在线写入**同一个** `normalizeEvent`，不直接信任外部 JSON：
           * 否则一份手改过的导出文件可以把任意字段塞进 E 层。
           */
          const normalized = normalizeEvent(event, { profileId: profile.id, ontologyVersion: event?.ontologyVersion ?? bundle.ontologyVersion ?? 'unknown' });
          await this.appendEvent(profile.id, { ...normalized, profileId: profile.id, baseRevision: null }, { merge: true });
        } catch (error) {
          skipped.push({ eventId: event.eventId, code: error.code ?? 'INTERNAL', message: error.message });
        }
      }
      for (const note of bundle.notes ?? []) {
        try {
          await this.createNote(profile.id, { noteId: undefined, nodeId: note.nodeId ?? null, title: note.title, body: note.body, tags: note.tags ?? [], baseRevision: null });
        } catch (error) {
          skipped.push({ noteId: note.noteId, code: error.code ?? 'INTERNAL', message: error.message });
        }
      }
      for (const view of bundle.networkViews ?? []) {
        try {
          await this.createNetworkView(profile.id, { ...view, baseRevision: null });
        } catch (error) {
          skipped.push({ viewId: view.viewId, code: error.code ?? 'INTERNAL', message: error.message });
        }
      }
      /*
       * 学习方向：`createDirection` 本身幂等，所以「旧导出文件里没有 directions」也安全
       * （`?? []` 跳过），而同一份 bundle 里重复声明同一个节点不会变成两条。
       */
      for (const direction of bundle.directions ?? []) {
        try {
          await this.createDirection(profile.id, {
            nodeId: direction.nodeId,
            note: direction.note ?? null,
            sourceRef: direction.sourceRef ?? 'import',
          });
        } catch (error) {
          skipped.push({ directionId: direction.directionId, code: error.code ?? 'INTERNAL', message: error.message });
        }
      }
      if (bundle.learningPlan && bundle.learningPlan.revision > 0) {
        try { await this.putLearningPlan(profile.id, { ...bundle.learningPlan, baseRevision: 0 }); }
        catch (error) { skipped.push({ learningPlan: true, code: error.code ?? 'INTERNAL', message: error.message }); }
      }
      if (skipped.length) {
        throw new McsError(CODES.BAD_REQUEST, `导入未完成：${skipped.length} 条记录无法写入，已回退，未留下部分档案。`, 422, { skipped });
      }
    } catch (error) {
      try { await this.deleteProfile(profile.id); } catch { /* 回退失败不掩盖原始错误 */ }
      throw error;
    }
    return {
      profile: await this.getProfile(profile.id),
      imported: {
        events: (bundle.events ?? []).length,
        notes: (bundle.notes ?? []).length,
        networkViews: (bundle.networkViews ?? []).length,
        directions: (bundle.directions ?? []).length,
      },
      skipped,
    };
  }

  async stats() {
    const one = async (sql) => Number((await this.driver.get(sql))?.count ?? 0);
    return {
      schemaVersion: (await this.driver.get('SELECT value FROM meta WHERE key = ?', ['schema_version']))?.value ?? null,
      dialect: this.driver.dialect,
      profiles: await one('SELECT CAST(COUNT(*) AS INTEGER) AS count FROM profiles'),
      events: await one('SELECT CAST(COUNT(*) AS INTEGER) AS count FROM events'),
      notes: await one('SELECT CAST(COUNT(*) AS INTEGER) AS count FROM notes'),
      file: this.file ? basename(this.file) : null,
    };
  }

  /**
   * 备份。两种方言都支持，但做法不同，**在返回值里如实说明用的是哪一种**：
   * - SQLite：物理备份（复制数据库文件，含全部表与索引）；
   * - PostgreSQL：逻辑备份（整库导出为 JSON，恢复时整库回填）。
   */
  async backupTo(directory) {
    mkdirSync(directory, { recursive: true });
    const stamp = new Date().toISOString().replaceAll(':', '-').replaceAll('.', '-');
    if (this.driver.dialect === 'sqlite') {
      const target = resolve(directory, `mcs-web-${stamp}.sqlite3`);
      await this.driver.backupToFile(target);
      return { backup: target, kind: 'physical', schemaVersion: SCHEMA_VERSION, createdAt: nowIso() };
    }
    const target = resolve(directory, `mcs-web-${stamp}.json`);
    const dump = await this.driver.transaction(async () => {
      // Metadata and streaming chunks must come from the same PostgreSQL snapshot.
      await this.driver.exec('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ');
      const snapshot = await this.dumpAll({ includeVaultChunks: false });
      if ((await this.driver.get('SELECT COUNT(*) AS n FROM vault_chunks')).n > 0) {
        snapshot.vaultChunksFile = basename(target) + '.vault-chunks.jsonl';
        await this.vaults.exportChunks(resolve(directory, snapshot.vaultChunksFile));
      }
      return snapshot;
    });
    writeFileSync(target, JSON.stringify(dump), 'utf8');
    return { backup: target, kind: 'logical', schemaVersion: SCHEMA_VERSION, createdAt: nowIso(), counts: dump.counts };
  }

  /** 整库逻辑导出（只有 PostgreSQL 的备份用它；SQLite 走物理备份）。 */
  async dumpAll({ includeVaultChunks = true } = {}) {
    const profiles = await this.driver.all('SELECT * FROM profiles ORDER BY created_at');
    const events = await this.driver.all('SELECT * FROM events ORDER BY seq ASC');
    const notes = await this.driver.all('SELECT * FROM notes ORDER BY created_at');
    const views = await this.driver.all('SELECT * FROM network_views ORDER BY created_at');
    const directions = await this.driver.all('SELECT * FROM learning_directions ORDER BY created_at');
    const learningPlans = await this.driver.all('SELECT * FROM learning_plans ORDER BY profile_id');
    const connectionNotes = await this.driver.all('SELECT * FROM connection_notes ORDER BY owner_id, connection_key');
    const verificationRuns = await this.driver.all('SELECT * FROM verification_runs ORDER BY created_at, run_id');
    return {
      schema: 'mcs-web-logical-backup/1',
      exportedAt: nowIso(),
      schemaVersion: SCHEMA_VERSION,
      counts: { profiles: profiles.length, events: events.length, notes: notes.length, networkViews: views.length, directions: directions.length, connectionNotes: connectionNotes.length, verificationRuns: verificationRuns.length },
      profiles, events, notes, networkViews: views, directions, connectionNotes, learningPlans, verificationRuns,
      vaults: await this.vaults.dump(includeVaultChunks),
      privateNetworkRecords: await this.networks.dump(),
    };
  }

  async restoreFrom(backupPath) {
    const source = resolve(backupPath);
    assert(existsSync(source), CODES.NOT_FOUND, `备份文件不存在：${source}`);
    if (this.driver.dialect === 'sqlite') {
      await this.driver.restoreFromFile(source);
      await this.migrate(); // 恢复的是**别人的**文件：版本核对照走一遍
      return { restored: true, from: source, kind: 'physical', at: nowIso() };
    }
    /*
     * 逻辑恢复：整库回填。先清空再写，全程一个事务——
     * 失败时回滚到「恢复前」，不会留下半新半旧的库。
     */
    let dump;
    try { dump = JSON.parse(readFileSync(source, 'utf8')); }
    catch (error) { throw new McsError(CODES.BAD_REQUEST, `备份文件不是合法的逻辑备份：${error.message}`, 422); }
    if (dump?.schema !== 'mcs-web-logical-backup/1') {
      throw new McsError(CODES.BAD_REQUEST, `备份文件格式不匹配：${dump?.schema ?? '未知'}`, 422, { expected: 'mcs-web-logical-backup/1' });
    }
    await this.driver.transaction(async () => {
      await this.vaults.restore(dump.vaults ?? {});
      await this.networks.restore(dump.privateNetworkRecords ?? []);
      if (dump.vaultChunksFile) {
        if (basename(dump.vaultChunksFile) !== dump.vaultChunksFile) throw new McsError(CODES.BAD_REQUEST, '附件备份路径无效。', 422);
        await this.vaults.restoreChunks(resolve(source, '..', dump.vaultChunksFile));
      }
      for (const b of await this.driver.all('SELECT * FROM vault_blobs WHERE verified = 1')) {
        await this.driver.run('UPDATE vault_blobs SET verified = 0 WHERE owner_id = ? AND sha256 = ?', [b.owner_id, b.sha256]);
        await this.vaults.verify(b.owner_id, { sha256: b.sha256, size: Number(b.size) });
      }
      await this.driver.run('DELETE FROM connection_notes');
      await this.driver.run('DELETE FROM verification_runs');
      await this.driver.run('DELETE FROM events');
      await this.driver.run('DELETE FROM notes');
      await this.driver.run('DELETE FROM network_views');
      await this.driver.run('DELETE FROM learning_directions');
      await this.driver.run('DELETE FROM learning_plans');
      await this.driver.run('DELETE FROM profiles');
      for (const row of dump.profiles ?? []) {
        await this.driver.run('INSERT INTO profiles(id, name, model_version, revision, kind, archived, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          [row.id, row.name, row.model_version, row.revision, row.kind, row.archived, row.created_at, row.updated_at]);
      }
      for (const row of dump.verificationRuns ?? []) {
        await this.driver.run('INSERT INTO verification_runs(run_id, owner_id, status, record_json, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)', [row.run_id, row.owner_id, row.status, row.record_json, row.created_at, row.updated_at]);
      }
      for (const row of dump.connectionNotes ?? []) {
        await this.driver.run('INSERT INTO connection_notes(owner_id, connection_key, body, revision, deleted, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [row.owner_id, row.connection_key, row.body, row.revision, row.deleted, row.created_at, row.updated_at]);
      }
      for (const row of dump.events ?? []) {
        await this.driver.run('INSERT INTO events(profile_id, event_id, ontology_version, kind, node_id, occurred_at, base_revision, source_json, evidence_refs_json, payload_json, stored_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [row.profile_id, row.event_id, row.ontology_version, row.kind, row.node_id, row.occurred_at, row.base_revision, row.source_json, row.evidence_refs_json, row.payload_json, row.stored_at]);
      }
      for (const row of dump.notes ?? []) {
        await this.driver.run('INSERT INTO notes(note_id, profile_id, node_id, title, body, tags_json, created_at, updated_at, revision) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [row.note_id, row.profile_id, row.node_id, row.title, row.body, row.tags_json, row.created_at, row.updated_at, row.revision]);
      }
      for (const row of dump.networkViews ?? []) {
        await this.driver.run('INSERT INTO network_views(view_id, profile_id, name, payload_json, created_at, updated_at, revision) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [row.view_id, row.profile_id, row.name, row.payload_json, row.created_at, row.updated_at, row.revision]);
      }
      for (const row of dump.directions ?? []) {
        await this.driver.run('INSERT INTO learning_directions(direction_id, profile_id, node_id, note, source_ref, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [row.direction_id, row.profile_id, row.node_id, row.note, row.source_ref, row.created_at, row.updated_at]);
      }
      for (const row of dump.learningPlans ?? []) {
        const payload = canonicalString(normalizeLearningPlan(parseJson(row.payload_json)));
        await this.driver.run('INSERT INTO learning_plans(profile_id, payload_json, revision, updated_at) VALUES (?, ?, ?, ?)', [row.profile_id, payload, row.revision, row.updated_at]);
      }
    });
    return { restored: true, from: source, kind: 'logical', at: nowIso(), counts: dump.counts ?? null };
  }

  async close() { await this.driver.close(); }
}

/** 按配置开库（本机 = SQLite 文件，公网 = PostgreSQL 连接串）。 */
export async function createLearnerStore({ config, pool = null }) {
  /*
   * `pool` 是给测试用的注入点：任何提供 `query(sql, params) → { rows }` 的对象都行
   * （测试用 PGlite——内嵌 WASM 版 PostgreSQL，不需要起服务，但跑的是真 SQL）。
   */
  const db = new McsDatabase({ driver: await createDriverFromConfig(config, { pool }) });
  await db.migrate();
  return db;
}

export { SCHEMA_VERSION };
