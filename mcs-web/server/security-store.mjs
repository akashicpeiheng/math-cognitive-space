import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { McsError } from '../shared/errors.mjs';

// Authentication state is separate from learner exports and the public ontology.
// PostgreSQL and SQLite implement the same small asynchronous interface.
export class SecurityStore {
  constructor({ file, pool = null }) {
    this.pool = pool;
    if (!pool) {
      mkdirSync(dirname(file), { recursive: true });
      this.sqlite = new DatabaseSync(file);
      this.sqlite.exec('PRAGMA journal_mode=WAL');
    }
  }
  async query(sql, values = []) {
    if (this.pool) return (await this.pool.query(sql, values)).rows;
    const binds = [];
    const translated = sql.replace(/\$(\d+)/g, (_, n) => { binds.push(values[Number(n) - 1]); return '?'; });
    return this.sqlite.prepare(translated).all(...binds);
  }
  async init() {
    await this.query('CREATE TABLE IF NOT EXISTS mcs_security (kind TEXT NOT NULL, id TEXT NOT NULL, payload TEXT NOT NULL, expires BIGINT NOT NULL, PRIMARY KEY(kind,id))');
    await this.query('CREATE TABLE IF NOT EXISTS mcs_owners (kind TEXT NOT NULL, id TEXT NOT NULL, owner_id TEXT NOT NULL, PRIMARY KEY(kind,id))');
    await this.query('CREATE INDEX IF NOT EXISTS mcs_owners_user ON mcs_owners(owner_id,kind)');
    await this.query('DELETE FROM mcs_security WHERE expires < $1', [Date.now()]);
    return this;
  }
  async get(kind, id) {
    const [row] = await this.query('SELECT payload FROM mcs_security WHERE kind=$1 AND id=$2 AND expires>$3', [kind, id, Date.now()]);
    return row ? JSON.parse(row.payload) : null;
  }
  async put(kind, id, payload, expires) {
    await this.query('INSERT INTO mcs_security(kind,id,payload,expires) VALUES($1,$2,$3,$4) ON CONFLICT(kind,id) DO UPDATE SET payload=excluded.payload,expires=excluded.expires', [kind, id, JSON.stringify(payload), expires]);
  }
  async remove(kind, id) { await this.query('DELETE FROM mcs_security WHERE kind=$1 AND id=$2', [kind, id]); }
  async consume(kind, id) {
    const [row] = await this.query('DELETE FROM mcs_security WHERE kind=$1 AND id=$2 RETURNING payload,expires', [kind, id]);
    return row && Number(row.expires) > Date.now() ? JSON.parse(row.payload) : null;
  }
  async claim(kind, id, owner) {
    await this.query('INSERT INTO mcs_owners(kind,id,owner_id) VALUES($1,$2,$3) ON CONFLICT(kind,id) DO NOTHING', [kind, id, owner]);
    await this.requireOwner(kind, id, owner);
  }
  async requireOwner(kind, id, owner) {
    const [row] = await this.query('SELECT owner_id FROM mcs_owners WHERE kind=$1 AND id=$2', [kind, id]);
    if (!row || row.owner_id !== owner) throw new McsError('NOT_FOUND', '该条目不存在或不属于当前账号。', 404);
  }
  async ownedIds(kind, owner) {
    return new Set((await this.query('SELECT id FROM mcs_owners WHERE kind=$1 AND owner_id=$2', [kind, owner])).map(row => row.id));
  }
  async close() { this.sqlite?.close(); }
}
