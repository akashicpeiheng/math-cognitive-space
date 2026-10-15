import { randomUUID, createHash } from 'node:crypto';
import { createReadStream, createWriteStream, existsSync } from 'node:fs';
import { once } from 'node:events';
import { createInterface } from 'node:readline';
import { McsError, CODES } from '../shared/errors.mjs';
import { normalizeLimits, validateVaultManifest, compareVaultFiles, parseVaultNote, fileMime } from '../shared/vault.mjs';

const fail = (message, status = 400, code = CODES.BAD_REQUEST) => { throw new McsError(code, message, status); };
const notFound = () => fail('笔记库或文件不存在。', 404, CODES.NOT_FOUND);
const importedFiles = value => { const data = JSON.parse(value); return Array.isArray(data) ? data : data.files; };
const tables = ['vault_libraries', 'vault_revisions', 'vault_imports', 'vault_blobs', 'vault_chunks', 'vault_owners'];
export class VaultStore {
  constructor(driver, limits) { this.driver = driver; this.limits = normalizeLimits(limits); this.writes = Promise.resolve(); }
  async migrate() {
    const sql = [
      'CREATE TABLE IF NOT EXISTS vault_owners (owner_id TEXT PRIMARY KEY, revision INTEGER NOT NULL)',
      'CREATE TABLE IF NOT EXISTS vault_libraries (id TEXT PRIMARY KEY, owner_id TEXT NOT NULL, name TEXT NOT NULL, revision INTEGER NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL)',
      'CREATE INDEX IF NOT EXISTS vault_owner_idx ON vault_libraries(owner_id)',
      'CREATE TABLE IF NOT EXISTS vault_revisions (vault_id TEXT NOT NULL, revision INTEGER NOT NULL, manifest_json TEXT NOT NULL, created_at TEXT NOT NULL, PRIMARY KEY(vault_id, revision))',
      'CREATE TABLE IF NOT EXISTS vault_imports (id TEXT PRIMARY KEY, vault_id TEXT NOT NULL, owner_id TEXT NOT NULL, base_revision INTEGER NOT NULL, manifest_json TEXT NOT NULL, status TEXT NOT NULL, result_json TEXT, created_at TEXT NOT NULL)',
      'CREATE TABLE IF NOT EXISTS vault_blobs (owner_id TEXT NOT NULL, sha256 TEXT NOT NULL, size INTEGER NOT NULL, verified INTEGER NOT NULL, PRIMARY KEY(owner_id, sha256))',
      'CREATE TABLE IF NOT EXISTS vault_chunks (owner_id TEXT NOT NULL, sha256 TEXT NOT NULL, chunk_index INTEGER NOT NULL, size INTEGER NOT NULL, data TEXT NOT NULL, PRIMARY KEY(owner_id, sha256, chunk_index))',
    ];
    for (const statement of sql) await this.driver.exec(statement);
  }
  write(fn) {
    const task = this.writes.then(() => this.driver.transaction(fn));
    this.writes = task.catch(() => {}); return task;
  }
  async lockOwner(owner) {
    await this.driver.run('INSERT INTO vault_owners(owner_id, revision) VALUES (?, 0) ON CONFLICT(owner_id) DO NOTHING', [owner]);
    await this.driver.run('UPDATE vault_owners SET revision = revision + 1 WHERE owner_id = ?', [owner]);
  }
  view(row) { return { id: row.id, name: row.name, revision: Number(row.revision), storage: 'account', createdAt: row.created_at, updatedAt: row.updated_at }; }
  async library(owner, id) {
    const row = await this.driver.get('SELECT * FROM vault_libraries WHERE id = ? AND owner_id = ?', [id, owner]);
    if (!row) notFound(); return row;
  }
  async list(owner) { return (await this.driver.all('SELECT * FROM vault_libraries WHERE owner_id = ? ORDER BY updated_at DESC', [owner])).map(r => this.view(r)); }
  async create(owner, name) {
    if (typeof name !== 'string' || !name.trim() || name.length > 200) fail('请填写笔记库名称（最多 200 字）。');
    const now = new Date().toISOString(), id = `vault-${randomUUID()}`;
    await this.write(async () => {
      await this.lockOwner(owner);
      const count = await this.driver.get('SELECT COUNT(*) AS n FROM vault_libraries WHERE owner_id = ?', [owner]);
      if (Number(count.n) >= 100) fail('每个账号最多保存 100 个笔记库。', 413);
      await this.driver.run('INSERT INTO vault_libraries(id, owner_id, name, revision, created_at, updated_at) VALUES (?, ?, ?, 0, ?, ?)', [id, owner, name.trim(), now, now]);
    });
    return this.get(owner, id);
  }
  async get(owner, id, revision) {
    const lib = await this.library(owner, id);
    const rev = revision === undefined ? Number(lib.revision) : Number(revision);
    const record = rev ? await this.driver.get('SELECT * FROM vault_revisions WHERE vault_id = ? AND revision = ?', [id, rev]) : null;
    if (rev && !record) notFound();
    const files = record ? JSON.parse(record.manifest_json) : [];
    return { ...this.view(lib), revision: rev, files };
  }
  async history(owner, id) {
    await this.library(owner, id);
    return this.driver.all('SELECT revision, created_at FROM vault_revisions WHERE vault_id = ? ORDER BY revision DESC', [id]);
  }
  async begin(owner, id, body) {
    let manifest; try { manifest = validateVaultManifest(body.files, this.limits); } catch (e) { fail(e.message); }
    if (!Number.isSafeInteger(body.baseRevision) || body.baseRevision < 0) fail('必须提供当前修订号。');
    const expectedCount = body.fileCount ?? manifest.length;
    if (!Number.isSafeInteger(expectedCount) || expectedCount < manifest.length || expectedCount > this.limits.notes * 10) fail('导入文件数量无效。');
    return this.write(async () => {
      await this.lockOwner(owner);
      const lib = await this.library(owner, id);
      if (Number(lib.revision) !== body.baseRevision) fail('笔记库已由其他页面更新，请重新读取后导入。', 409, CODES.CONFLICT);
      const pending = await this.driver.get("SELECT COUNT(*) AS n FROM vault_imports WHERE owner_id = ? AND status = 'pending'", [owner]);
      if (Number(pending.n) >= 10) fail('请先完成或取消已有的导入批次。', 429);
      const importId = `import-${randomUUID()}`;
      await this.driver.run('INSERT INTO vault_imports(id, vault_id, owner_id, base_revision, manifest_json, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)', [importId, id, owner, body.baseRevision, JSON.stringify({ files: manifest, expectedCount }), 'pending', new Date().toISOString()]);
      return this.batch(owner, id, importId);
    });
  }
  async batch(owner, id, importId) {
    await this.library(owner, id);
    const row = await this.driver.get('SELECT * FROM vault_imports WHERE id = ? AND vault_id = ? AND owner_id = ?', [importId, id, owner]);
    if (!row) notFound();
    const files = importedFiles(row.manifest_json), uploaded = {}, parsed = JSON.parse(row.manifest_json);
    const blobs = new Map((await this.driver.all('SELECT sha256, verified FROM vault_blobs WHERE owner_id = ?', [owner])).map(b => [b.sha256, b]));
    const indices = new Map();
    for (const c of await this.driver.all('SELECT sha256, chunk_index FROM vault_chunks WHERE owner_id = ? ORDER BY chunk_index', [owner])) { const items = indices.get(c.sha256) ?? []; items.push(Number(c.chunk_index)); indices.set(c.sha256, items); }
    for (const file of files) {
      const blob = blobs.get(file.sha256);
      uploaded[file.sha256] = { complete: Boolean(blob?.verified), chunks: blob?.verified ? [] : indices.get(file.sha256) ?? [] };
    }
    return { id: row.id, status: row.status, baseRevision: Number(row.base_revision), files, expectedCount: parsed.expectedCount ?? files.length, uploaded, result: row.result_json ? JSON.parse(row.result_json) : null };
  }
  async manifestChunk(owner, id, importId, offset, incoming) {
    let checked; try { checked = validateVaultManifest(incoming, this.limits); } catch (e) { fail(e.message); }
    return this.write(async () => {
      await this.lockOwner(owner); await this.library(owner, id);
      const row = await this.driver.get('SELECT * FROM vault_imports WHERE id = ? AND vault_id = ? AND owner_id = ?', [importId, id, owner]);
      if (!row) notFound(); if (row.status !== 'pending') fail('导入批次已结束。', 409);
      const data = JSON.parse(row.manifest_json), old = importedFiles(row.manifest_json), expectedCount = data.expectedCount ?? old.length;
      if (!Number.isSafeInteger(offset) || offset < 0 || offset > old.length || offset + checked.length > expectedCount) fail('导入清单位置无效。');
      if (offset < old.length) {
        if (JSON.stringify(old.slice(offset, offset + checked.length)) !== JSON.stringify(checked)) fail('同一清单位置有不同内容。', 409);
        return { count: old.length };
      }
      const files = [...old, ...checked]; try { validateVaultManifest(files, this.limits); } catch (e) { fail(e.message); }
      await this.driver.run('UPDATE vault_imports SET manifest_json = ? WHERE id = ?', [JSON.stringify({ files, expectedCount }), importId]);
      return { count: files.length };
    });
  }
  async chunk(owner, id, importId, sha, index, data) {
    return this.write(async () => {
      await this.lockOwner(owner);
      await this.library(owner, id);
      const batch = await this.driver.get('SELECT status, manifest_json FROM vault_imports WHERE id = ? AND vault_id = ? AND owner_id = ?', [importId, id, owner]);
      if (!batch) notFound();
      if (batch.status !== 'pending') fail('该导入批次已结束。', 409);
      const file = importedFiles(batch.manifest_json).find(f => f.sha256 === sha);
      if (!file) notFound();
      if (!Number.isSafeInteger(index) || index < 0 || index >= Math.ceil(file.size / this.limits.chunkBytes)) fail('附件分块位置无效。');
      if (typeof data !== 'string' || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(data)) fail('附件分块格式无效。');
      const bytes = Buffer.from(data, 'base64');
      const expected = Math.min(this.limits.chunkBytes, file.size - index * this.limits.chunkBytes);
      if (bytes.length !== expected) fail('附件分块大小不匹配。');
      const old = await this.driver.get('SELECT * FROM vault_chunks WHERE owner_id = ? AND sha256 = ? AND chunk_index = ?', [owner, sha, index]);
      if (old) { if (old.data !== data) fail('同一分块存在不同内容，已保留原内容。', 409); return { stored: true }; }
      const used = await this.driver.get('SELECT COALESCE(SUM(size), 0) AS n FROM vault_chunks WHERE owner_id = ?', [owner]);
      if (Number(used.n) + bytes.length > this.limits.ownerBytes) fail('账号笔记库空间不足（历史版本也计入额度）。', 413);
      await this.driver.run('INSERT INTO vault_blobs(owner_id, sha256, size, verified) VALUES (?, ?, ?, 0) ON CONFLICT(owner_id, sha256) DO NOTHING', [owner, sha, file.size]);
      await this.driver.run('INSERT INTO vault_chunks(owner_id, sha256, chunk_index, size, data) VALUES (?, ?, ?, ?, ?)', [owner, sha, index, bytes.length, data]);
      return { stored: true };
    });
  }
  async verify(owner, file) {
    const blob = await this.driver.get('SELECT * FROM vault_blobs WHERE owner_id = ? AND sha256 = ?', [owner, file.sha256]);
    if (blob?.verified && Number(blob.size) === file.size) return;
    const hash = createHash('sha256'); let size = 0;
    for (let index = 0; index < Math.ceil(file.size / this.limits.chunkBytes); index++) {
      const row = await this.driver.get('SELECT * FROM vault_chunks WHERE owner_id = ? AND sha256 = ? AND chunk_index = ?', [owner, file.sha256, index]);
      if (!row) fail('文件尚未上传完整，请重试。', 409);
      const bytes = Buffer.from(row.data, 'base64'); size += bytes.length; hash.update(bytes);
    }
    if (size !== file.size || hash.digest('hex') !== file.sha256) fail('文件 SHA-256 核对失败，旧版本保持可用。', 422);
    await this.driver.run('INSERT INTO vault_blobs(owner_id, sha256, size, verified) VALUES (?, ?, ?, 1) ON CONFLICT(owner_id, sha256) DO UPDATE SET verified = 1', [owner, file.sha256, file.size]);
  }
  async commit(owner, id, importId) {
    return this.write(async () => {
      await this.lockOwner(owner);
      const batch = await this.batch(owner, id, importId);
      if (batch.status === 'done') return batch.result;
      if (batch.status !== 'pending') fail('导入已取消。', 409);
      if (batch.files.length !== batch.expectedCount) fail('导入清单尚未上传完整，旧版本保持可用。', 409);
      const lib = await this.library(owner, id);
      if (Number(lib.revision) !== batch.baseRevision) fail('笔记库修订冲突，旧版本保持可用。', 409, CODES.CONFLICT);
      for (const f of batch.files) await this.verify(owner, f);
      const prior = lib.revision ? JSON.parse((await this.driver.get('SELECT manifest_json FROM vault_revisions WHERE vault_id = ? AND revision = ?', [id, lib.revision])).manifest_json) : [];
      const diff = compareVaultFiles(prior, batch.files, false), files = diff.files;
      try { validateVaultManifest(files, this.limits); } catch (e) { fail(e.message, 413); }
      // Derive metadata from verified source rather than trusting client-supplied titles/aliases.
      for (const f of files) if (f.kind === 'note') {
        const parsed = parseVaultNote((await this.bytes(owner, f.sha256)).toString('utf8'), f.path);
        Object.assign(f, { title: parsed.title, aliases: parsed.aliases, tags: parsed.tags });
      }
      const unique = await this.driver.all('SELECT manifest_json FROM vault_revisions WHERE vault_id = ?', [id]);
      const hashes = new Map(files.map(f => [f.sha256, f.size]));
      for (const r of unique) for (const f of JSON.parse(r.manifest_json)) hashes.set(f.sha256, f.size);
      if ([...hashes.values()].reduce((a, b) => a + b, 0) > this.limits.vaultBytes) fail('笔记库空间不足（历史版本也计入额度）。', 413);
      const revision = Number(lib.revision) + 1, now = new Date().toISOString();
      for (const f of files) { const old = prior.find(p => p.id === f.id); f.sourceRevision = old?.sha256 === f.sha256 ? old.sourceRevision ?? Number(lib.revision) : revision; }
      const updated = await this.driver.run('UPDATE vault_libraries SET revision = ?, updated_at = ? WHERE id = ? AND owner_id = ? AND revision = ?', [revision, now, id, owner, batch.baseRevision]);
      if (!updated.changes) fail('笔记库修订冲突。', 409, CODES.CONFLICT);
      await this.driver.run('INSERT INTO vault_revisions(vault_id, revision, manifest_json, created_at) VALUES (?, ?, ?, ?)', [id, revision, JSON.stringify(files), now]);
      const result = { revision, files, added: diff.added, changed: diff.changed, missing: diff.missing, renamed: diff.renamed };
      await this.driver.run("UPDATE vault_imports SET status = 'done', result_json = ? WHERE id = ?", [JSON.stringify(result), importId]);
      return result;
    });
  }
  async cleanup(owner) {
    const keep = new Set();
    const libs = await this.list(owner);
    for (const l of libs) for (const r of await this.driver.all('SELECT manifest_json FROM vault_revisions WHERE vault_id = ?', [l.id])) for (const f of JSON.parse(r.manifest_json)) keep.add(f.sha256);
    for (const r of await this.driver.all("SELECT manifest_json FROM vault_imports WHERE owner_id = ? AND status = 'pending'", [owner])) for (const f of importedFiles(r.manifest_json)) keep.add(f.sha256);
    for (const b of await this.driver.all('SELECT sha256 FROM vault_blobs WHERE owner_id = ?', [owner])) if (!keep.has(b.sha256)) {
      await this.driver.run('DELETE FROM vault_chunks WHERE owner_id = ? AND sha256 = ?', [owner, b.sha256]);
      await this.driver.run('DELETE FROM vault_blobs WHERE owner_id = ? AND sha256 = ?', [owner, b.sha256]);
    }
  }
  async cancel(owner, id, importId) { return this.write(async () => { await this.batch(owner, id, importId); await this.lockOwner(owner); await this.driver.run("UPDATE vault_imports SET status = 'cancelled' WHERE id = ? AND status = 'pending'", [importId]); await this.cleanup(owner); return { cancelled: true }; }); }
  async remove(owner, id) { return this.write(async () => { await this.library(owner, id); await this.lockOwner(owner); for (const t of ['vault_revisions', 'vault_imports']) await this.driver.run(`DELETE FROM ${t} WHERE vault_id = ?`, [id]); await this.driver.run('DELETE FROM vault_libraries WHERE id = ?', [id]); await this.cleanup(owner); return { deleted: true }; }); }
  async link(owner, id, fileId, body) {
    return this.write(async () => {
      await this.lockOwner(owner); const lib = await this.get(owner, id);
      if (body.baseRevision !== lib.revision) fail('笔记库修订冲突。', 409, CODES.CONFLICT);
      const file = lib.files.find(f => f.id === fileId && f.kind === 'note'); if (!file) notFound();
      if (!Array.isArray(body.nodeIds) || body.nodeIds.length > 100) fail('节点关联格式无效。');
      file.nodeIds = [...new Set(body.nodeIds)];
      const now = new Date().toISOString(), revision = lib.revision + 1;
      await this.driver.run('INSERT INTO vault_revisions(vault_id, revision, manifest_json, created_at) VALUES (?, ?, ?, ?)', [id, revision, JSON.stringify(lib.files), now]);
      await this.driver.run('UPDATE vault_libraries SET revision = ?, updated_at = ? WHERE id = ?', [revision, now, id]);
      return { revision, files: lib.files };
    });
  }
  async file(owner, id, fileId, revision) { const lib = await this.get(owner, id, revision); const f = lib.files.find(f => f.id === fileId); if (!f) notFound(); return { ...f, mime: fileMime(f.path) }; }
  async bytes(owner, sha, start = 0, end = Infinity) {
    const blob = await this.driver.get('SELECT * FROM vault_blobs WHERE owner_id = ? AND sha256 = ? AND verified = 1', [owner, sha]); if (!blob) notFound();
    end = Math.min(end, Number(blob.size) - 1); const chunks = [];
    for (let i = Math.floor(start / this.limits.chunkBytes); i <= Math.floor(end / this.limits.chunkBytes); i++) {
      const row = await this.driver.get('SELECT data FROM vault_chunks WHERE owner_id = ? AND sha256 = ? AND chunk_index = ?', [owner, sha, i]); if (!row) fail('附件数据不完整。', 500);
      const bytes = Buffer.from(row.data, 'base64'), offset = i * this.limits.chunkBytes;
      chunks.push(bytes.subarray(Math.max(0, start - offset), Math.min(bytes.length, end - offset + 1)));
    }
    return Buffer.concat(chunks);
  }
  async dump(includeChunks = true) { const out = {}; for (const table of tables) out[table] = table === 'vault_chunks' && !includeChunks ? [] : await this.driver.all(`SELECT * FROM ${table}`); return out; }
  async restore(dump = {}) {
    for (const table of [...tables].reverse()) await this.driver.run(`DELETE FROM ${table}`);
    for (const table of tables) for (const row of dump[table] ?? []) await this.insertBackupRow(table, row);
  }
  async insertBackupRow(table, row) {
    const columns = { vault_libraries: ['id', 'owner_id', 'name', 'revision', 'created_at', 'updated_at'], vault_revisions: ['vault_id', 'revision', 'manifest_json', 'created_at'], vault_imports: ['id', 'vault_id', 'owner_id', 'base_revision', 'manifest_json', 'status', 'result_json', 'created_at'], vault_blobs: ['owner_id', 'sha256', 'size', 'verified'], vault_chunks: ['owner_id', 'sha256', 'chunk_index', 'size', 'data'], vault_owners: ['owner_id', 'revision'] }[table];
    if (!columns) fail('笔记库备份表无效。', 422);
    await this.driver.run(`INSERT INTO ${table} (${columns.join(', ')}) VALUES (${columns.map(() => '?').join(', ')})`, columns.map(c => row[c] ?? null));
  }
  async exportChunks(path, owner = null, hashes = null) {
    const stream = createWriteStream(path, { flags: 'wx' }); const done = once(stream, 'finish');
    let cursorOwner = '', cursorSha = '', cursorIndex = -1;
    try {
      while (true) {
        const rows = await this.driver.all('SELECT * FROM vault_chunks WHERE (owner_id > ? OR (owner_id = ? AND (sha256 > ? OR (sha256 = ? AND chunk_index > ?)))) ORDER BY owner_id, sha256, chunk_index LIMIT 8', [cursorOwner, cursorOwner, cursorSha, cursorSha, cursorIndex]);
        if (!rows.length) break;
        for (const row of rows) {
          if ((!owner || row.owner_id === owner) && (!hashes || hashes.has(row.sha256))) if (!stream.write(JSON.stringify(row) + '\n')) await once(stream, 'drain');
          cursorOwner = row.owner_id; cursorSha = row.sha256; cursorIndex = Number(row.chunk_index);
        }
      }
      stream.end(); await done;
    } catch (e) { stream.destroy(); done.catch(() => {}); throw e; }
  }
  async restoreChunks(path) {
    if (!existsSync(path)) fail('笔记库附件备份缺失，恢复未执行。', 422);
    const lines = createInterface({ input: createReadStream(path), crlfDelay: Infinity });
    for await (const line of lines) if (line.trim()) await this.insertBackupRow('vault_chunks', JSON.parse(line));
  }
}
