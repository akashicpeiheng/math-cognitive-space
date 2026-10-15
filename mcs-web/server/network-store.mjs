import { randomUUID } from 'node:crypto';
import { McsError, CODES } from '../shared/errors.mjs';
import { normalizePrivateRelation, normalizeSubmission } from '../shared/network-workspace.mjs';
const parse = row => ({ ...JSON.parse(row.payload_json), id: row.id, revision: Number(row.revision), status: row.status, createdAt: row.created_at, updatedAt: row.updated_at });
export class NetworkStore {
  constructor(driver) { this.driver = driver; }
  async migrate() {
    await this.driver.exec('CREATE TABLE IF NOT EXISTS private_network_records (id TEXT PRIMARY KEY, owner_id TEXT NOT NULL, kind TEXT NOT NULL, status TEXT NOT NULL, revision INTEGER NOT NULL, payload_json TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL); CREATE INDEX IF NOT EXISTS private_network_owner ON private_network_records(owner_id, kind)');
  }
  async get(owner, id, admin = false) {
    const row = await this.driver.get(`SELECT * FROM private_network_records WHERE id = ?${admin ? '' : ' AND owner_id = ?'}`, admin ? [id] : [id, owner]);
    if (!row) throw new McsError(CODES.NOT_FOUND, '无法解析私人网络记录', 404);
    return parse(row);
  }
  async list(owner, kind, admin = false) {
    return (await this.driver.all(`SELECT * FROM private_network_records WHERE kind = ?${admin ? '' : ' AND owner_id = ?'} ORDER BY updated_at DESC`, admin ? [kind] : [kind, owner])).map(parse);
  }
  async create(owner, kind, payload, status = 'active') {
    const id = `${kind}-${randomUUID()}`, at = new Date().toISOString();
    await this.driver.run('INSERT INTO private_network_records(id, owner_id, kind, status, revision, payload_json, created_at, updated_at) VALUES (?, ?, ?, ?, 1, ?, ?, ?)', [id, owner, kind, status, JSON.stringify(payload), at, at]);
    return this.get(owner, id);
  }
  async update(owner, id, baseRevision, payload, status, admin = false) {
    const old = await this.get(owner, id, admin), at = new Date().toISOString();
    if (old.revision !== baseRevision) throw new McsError(CODES.CONFLICT, '记录已变化，请重新载入', 409);
    const result = await this.driver.get(`UPDATE private_network_records SET payload_json = ?, status = ?, revision = revision + 1, updated_at = ? WHERE id = ? AND revision = ?${admin ? '' : ' AND owner_id = ?'} RETURNING id`, [JSON.stringify(payload), status ?? old.status, at, id, baseRevision, ...(admin ? [] : [owner])]);
    if (!result) throw new McsError(CODES.CONFLICT, '记录已变化，请重新载入', 409);
    return this.get(owner, id, admin);
  }
  async putRelation(owner, id, raw) {
    const relation = normalizePrivateRelation(raw);
    if (!id) return this.create(owner, 'relation', { ...relation, history: [], checks: [] });
    const old = await this.get(owner, id);
    if (!id.startsWith('relation-')) throw new McsError(CODES.NOT_FOUND, '无法解析私人关系', 404);
    return this.update(owner, id, raw.baseRevision, { ...relation, checks: old.checks ?? [], history: [...(old.history ?? []), { revision: old.revision, at: old.updatedAt, relation: normalizePrivateRelation(old) }] }, 'active');
  }
  async submit(owner, raw, evidence = null) {
    const snapshot = normalizeSubmission(raw);
    if (evidence) {
      const publicText = value => String(value ?? '').replace(/note:(?:browser|account):[^\s"'<>]+/g, '所选私人端点');
      snapshot.evidence = { inputHash: evidence.result.inputHash, ontologyVersion: evidence.result.ontologyVersion, math: { ...evidence.result.math, reason: publicText(evidence.result.math.reason), scope: publicText(evidence.result.math.scope) }, run: { status: evidence.result.run.status }, label: evidence.result.label ?? 'NOT-CLAIMED', correspondence: evidence.result.correspondence };
    }
    return this.create(owner, 'submission', { snapshot, ...(evidence ? { submittedEvidence: evidence } : {}), reviews: [] }, 'pending');
  }
  async dump() { return this.driver.all('SELECT * FROM private_network_records ORDER BY created_at'); }
  async restore(rows = []) {
    await this.driver.run('DELETE FROM private_network_records');
    for (const row of rows) await this.driver.run('INSERT INTO private_network_records(id, owner_id, kind, status, revision, payload_json, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', [row.id, row.owner_id, row.kind, row.status, row.revision, row.payload_json, row.created_at, row.updated_at]);
  }
}
