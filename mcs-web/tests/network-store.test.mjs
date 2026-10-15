import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, sep } from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import { createLearnerStore } from '../server/db.mjs';
const raw = { from: { source: 'ontology', id: 'a', version: '1' }, to: { source: 'ontology', id: 'b', version: '1' }, kind: 'related', conditions: '', reason: '私人参考', source: '', bindings: {} };
for (const dialect of ['sqlite', 'postgres']) test(`${dialect}: account isolation, concurrent revisions, history and logical backup`, async () => {
  const pg = dialect === 'postgres' ? new PGlite() : null;
  const dir = mkdtempSync(join(tmpdir(), 'mcs-network-'));
  const db = await createLearnerStore({ config: { dbFile: join(dir, 'test.db'), dbUrl: pg ? 'postgres://pglite/test' : null }, pool: pg });
  try {
    const first = await db.networks.putRelation('alice', null, { ...raw, checks: [{ math: { status: 'verified' } }] }); assert.deepEqual(first.checks, []);
    await assert.rejects(db.networks.get('bob', first.id), e => e.status === 404);
    const writes = await Promise.allSettled([db.networks.putRelation('alice', first.id, { ...raw, reason: '编辑一', baseRevision: 1 }), db.networks.putRelation('alice', first.id, { ...raw, reason: '编辑二', baseRevision: 1 })]);
    assert.equal(writes.filter(x => x.status === 'fulfilled').length, 1); assert.equal(writes.find(x => x.status === 'rejected').reason.status, 409);
    const second = await db.networks.get('alice', first.id); assert.equal(second.revision, 2); assert.equal(second.history[0].relation.reason, raw.reason);
    const submission = await db.networks.submit('alice', { relation: raw, endpoints: { from: { title: 'A', publicNodeId: 'a' }, to: { title: 'B', publicNodeId: 'b' } } });
    await assert.rejects(db.networks.get('bob', submission.id), e => e.status === 404);
    const backup = await db.dumpAll(); assert.equal(backup.privateNetworkRecords.length, 2);
    await db.networks.restore([]); assert.equal((await db.networks.list('alice', 'relation')).length, 0); await db.networks.restore(backup.privateNetworkRecords);
    assert.equal((await db.networks.get('alice', first.id)).revision, 2); assert.equal((await db.networks.get('alice', submission.id)).status, 'pending');
    const fileBackup = await db.backupTo(dir); await db.networks.restore([]); await db.restoreFrom(fileBackup.backup);
    assert.equal((await db.networks.get('alice', first.id)).revision, 2); assert.equal((await db.networks.get('alice', submission.id)).status, 'pending');
  } finally { await db.close(); if (pg) await pg.close(); const target = resolve(dir); assert.ok(target.startsWith(resolve(tmpdir()) + sep)); rmSync(target, { recursive: true, force: true }); }
});
