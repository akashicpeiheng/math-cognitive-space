import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, sep } from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import { createLearnerStore } from '../server/db.mjs';
import { CODES } from '../shared/errors.mjs';
import { loadOntology } from '../core/ontology.mjs';
import { relationConnectionKey, contractConnectionKey, familyConnectionKey, connectionExists } from '../shared/connection-keys.mjs';
import { buildEdges } from '../web/src/network.ts';
import { connectionKeyOf, scalingSummary } from '../web/src/connection-display.ts';
import { relatedCandidates } from '../web/src/node-related.ts';
import { buildContinueNetwork } from '../web/src/continue-network.ts';
import { startTestServer, jsonCall } from './helpers.mjs';

const clean = dir => { if (resolve(dir).startsWith(resolve(tmpdir()) + sep)) rmSync(dir, { recursive: true, force: true }); };

test('connection identity: inverse readings share evidence, distinct conditions stay separate', () => {
  const relation = { id: 'forward', kind: 'scaling', from: 'general', to: 'special', direction: { general: 'general', special: 'special', reading: 'contract' }, scalingMode: 'same-carrier', witness: { ref: 'proof', status: 'PROOF' }, conditions: [{ a: 'x', b: 'y' }] };
  const reverse = { ...relation, id: 'reverse', from: 'special', to: 'general', direction: { ...relation.direction, reading: 'expand' }, conditions: [{ b: 'y', a: 'x' }] };
  assert.equal(relationConnectionKey(relation), relationConnectionKey(reverse));
  for (const difference of [{ conditions: ['different'] }, { witness: { ref: 'other' } }, { goal: { hash: 'other' } }, { scalingMode: 'instance' }]) {
    assert.notEqual(relationConnectionKey(relation), relationConnectionKey({ ...reverse, ...difference }));
  }
  assert.notEqual(relationConnectionKey({ ...relation, direction: null }), relationConnectionKey({ ...reverse, direction: null }));
  assert.notEqual(contractConnectionKey('action', 'a', 'b'), contractConnectionKey('action', 'b', 'a'));
  assert.equal(familyConnectionKey('topic', 'a', 'b'), familyConnectionKey('topic', 'b', 'a'));
  assert.notEqual(familyConnectionKey('topic', 'a', 'b'), familyConnectionKey('evidence', 'a', 'b'));
});

test('all seven connection families resolve against actual ontology, with bilingual explanations', async () => {
  const zh = await loadOntology(); const en = await loadOntology({ locale: 'en' });
  assert.equal(zh.version, en.version);
  const graph = { ...zh.raw, relations: zh.raw.relationDescriptions.map(relation => ({ ...relation, connectionKey: relationConnectionKey(relation) })) };
  const edges = buildEdges(graph, new Set(graph.nodes.map(node => node.id)));
  assert.equal(new Set(edges.map(edge => edge.source)).size, 7);
  for (const edge of edges) assert.ok(connectionExists(zh.raw, connectionKeyOf(edge)), edge.id);
  assert.equal(connectionExists(zh.raw, familyConnectionKey('topic', 'does-not-exist', 'limit:bridge')), false);
  assert.equal(connectionExists(zh.raw, contractConnectionKey('bogus', 'limit:limit-ed', 'limit:continuous')), false);
  assert.equal(connectionExists(zh.raw, 'not-json'), false);
  const scaling = zh.raw.relationDescriptions.filter(r => r.kind === 'scaling');
  assert.equal(scaling.filter(r => r.scalingExplanation).length, 14);
  assert.equal(scaling.filter(r => !r.direction).length, 11);
  for (const relation of scaling) {
    const translated = en.raw.relationDescriptions.find(r => r.id === relation.id);
    assert.equal(translated.witness.status, relation.witness.status);
    assert.equal(relationConnectionKey(translated), relationConnectionKey(relation));
    if (relation.direction) {
      assert.ok(relation.scalingExplanation.summary);
      assert.notEqual(translated.scalingExplanation.summary, relation.scalingExplanation.summary);
      assert.equal(translated.scalingExplanation.changes.length, relation.scalingExplanation.changes.length);
    } else assert.equal(scalingSummary(relation, 'zh'), '放缩条件待核验');
  }
  assert.deepEqual(scaling.find(r => r.id === 'rel-tensor-generalization').scalingExplanation.changes, []);
  assert.equal(scalingSummary({ kind: 'scaling', direction: {} }, 'zh'), '条件说明未登记');
  const pair = { ...graph, nodes: graph.nodes.filter(node => ['manifold:ck-atlas', 'dg:smooth-atlas'].includes(node.id)) };
  const candidate = relatedCandidates(pair, 'dg:smooth-atlas')[0];
  const preview = buildContinueNetwork('dg:smooth-atlas', pair).nodes[0];
  for (const item of [candidate, preview]) {
    const relationIds = item.connections.filter(edge => edge.source === 'relation').map(edge => edge.id);
    assert.ok(relationIds.includes('rel-manifold-generalization'));
    assert.ok(relationIds.includes('rel-manifold-specialization'));
    assert.ok(relationIds.includes('rel-manifold-forget'), 'choosing one reason must not erase another specific connection');
  }
});

for (const dialect of ['sqlite', 'postgres']) test(`${dialect}: owner isolation, atomic revision checks, deletion and safe undo`, async () => {
  const dir = mkdtempSync(join(tmpdir(), 'mcs-connection-notes-'));
  const pg = dialect === 'postgres' ? new PGlite() : null;
  const config = pg ? { dbUrl: 'postgres://pglite/test' } : { dbFile: join(dir, 'test.sqlite3') };
  const db = await createLearnerStore({ config, ...(pg ? { pool: pg } : {}) });
  const key = 'connection';
  try {
    const first = await db.putConnectionNote('alice', key, { body: '自己的理解', baseRevision: 0 });
    assert.equal(first.revision, 1);
    assert.deepEqual(await db.listConnectionNotes('bob'), []);
    const original = '    缩进的 Markdown 代码\n另一份备注  \n';
    const bob = await db.putConnectionNote('bob', key, { body: original, baseRevision: 0 });
    assert.equal(bob.revision, 1);
    assert.equal(bob.body, original, 'personal Markdown retains indentation, hard breaks and original text');
    await assert.rejects(db.putConnectionNote('alice', key, { body: '重复创建', baseRevision: 0 }), error => error.code === CODES.CONFLICT);
    const competing = await Promise.allSettled([
      db.putConnectionNote('alice', key, { body: '更新 A', baseRevision: 1 }),
      db.putConnectionNote('alice', key, { body: '更新 B', baseRevision: 1 }),
    ]);
    assert.equal(competing.filter(result => result.status === 'fulfilled').length, 1);
    assert.equal(competing.filter(result => result.status === 'rejected' && result.reason.code === CODES.CONFLICT).length, 1);
    const current = (await db.listConnectionNotes('alice'))[0];
    const deleted = await db.deleteConnectionNote('alice', key, current.revision);
    assert.deepEqual(await db.listConnectionNotes('alice'), []);
    assert.equal((await db.driver.get('SELECT body FROM connection_notes WHERE owner_id = ? AND connection_key = ?', ['alice', key])).body, '', 'deleted content is erased');
    const undone = await db.putConnectionNote('alice', key, { body: current.body, baseRevision: deleted.revision });
    assert.equal(undone.revision, deleted.revision + 1);
    const secondDelete = await db.deleteConnectionNote('alice', key, undone.revision);
    const recreated = await db.putConnectionNote('alice', key, { body: '另一页面的新内容', baseRevision: 0 });
    await assert.rejects(db.putConnectionNote('alice', key, { body: '旧撤销', baseRevision: secondDelete.revision }), error => error.code === CODES.CONFLICT);
    await assert.rejects(db.putConnectionNote('alice', key, { body: '过期编辑', baseRevision: 1 }), error => error.code === CODES.CONFLICT);
    assert.equal((await db.listConnectionNotes('alice'))[0].body, recreated.body);
    assert.equal((await db.listConnectionNotes('bob'))[0].body, bob.body);
    await assert.rejects(db.putConnectionNote('alice', key, { body: ' ', baseRevision: recreated.revision }), error => error.code === 'BAD_REQUEST');
    await assert.rejects(db.putConnectionNote('alice', key, { body: 'x'.repeat(4001), baseRevision: recreated.revision }), error => error.code === 'BAD_REQUEST');
    const snapshot = await db.dumpAll();
    assert.equal(snapshot.connectionNotes.length, 2);
    if (pg) {
      const file = join(dir, 'backup.json'); writeFileSync(file, JSON.stringify(snapshot));
      await db.deleteConnectionNote('alice', key, recreated.revision);
      await db.restoreFrom(file);
      assert.equal((await db.listConnectionNotes('alice'))[0].body, recreated.body);
      delete snapshot.connectionNotes; writeFileSync(file, JSON.stringify(snapshot));
      await db.restoreFrom(file);
      assert.deepEqual(await db.listConnectionNotes('alice'), [], 'old backups have no connection notes');
    }
  } finally { await db.close(); if (pg) await pg.close(); clean(dir); }
});

test('local notes survive database restart and physical backup', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'mcs-connection-restart-'));
  const config = { dbFile: join(dir, 'notes.sqlite3') };
  let db = await createLearnerStore({ config });
  try {
    const note = await db.putConnectionNote('local', 'key', { body: '持久备注', baseRevision: 0 });
    const backup = await db.backupTo(dir);
    await db.close(); db = await createLearnerStore({ config });
    assert.deepEqual((await db.listConnectionNotes('local'))[0], note);
    await db.deleteConnectionNote('local', 'key', note.revision);
    await db.restoreFrom(backup.backup);
    assert.deepEqual((await db.listConnectionNotes('local'))[0], note);
  } finally { await db.close(); clean(dir); }
});

test('API: specific connection metadata, validation and user-wide notes leave M unchanged', async () => {
  const server = await startTestServer();
  try {
    const call = (path, options) => jsonCall(server.origin, '/api/v2' + path, options);
    const graph = (await call('/ontology/graph')).payload.data;
    const first = graph.relations.find(r => r.id === 'rel-manifold-generalization');
    const reverse = graph.relations.find(r => r.id === 'rel-manifold-specialization');
    assert.equal(first.connectionKey, reverse.connectionKey);
    assert.match(first.scalingExplanation.summary, /所有阶/);
    const path = '/me/connection-notes/' + encodeURIComponent(first.connectionKey);
    const saved = await call(path, { method: 'PUT', body: { body: '同一图册的正则性条件', baseRevision: 0, ownerId: 'spoofed' } });
    assert.equal(saved.status, 200, JSON.stringify(saved.payload));
    await call('/profiles', { method: 'POST', body: { name: '另一学习者档案' } });
    const listed = (await call('/me/connection-notes')).payload.data;
    assert.equal(listed.ownerId, 'local');
    assert.equal(listed.notes[0].body, '同一图册的正则性条件');
    assert.equal((await server.db.listConnectionNotes('spoofed')).length, 0);
    assert.equal((await call('/ontology/graph')).payload.data.version, graph.version);
    const node = (await call('/ontology/nodes/' + encodeURIComponent('manifold:ck-atlas'))).payload.data;
    assert.equal(node.relations.find(r => r.id === first.id).connectionKey, first.connectionKey);
    assert.equal((await call(path, { method: 'PUT', body: { body: '过期更新', baseRevision: 0 } })).status, 409);
    const bogus = '/me/connection-notes/' + encodeURIComponent(JSON.stringify(['topic', 'nonexistent', 'limit:bridge']));
    assert.equal((await call(bogus, { method: 'PUT', body: { body: '假连接', baseRevision: 0 } })).status, 404);
    assert.equal((await call(path, { method: 'DELETE', body: { baseRevision: saved.payload.data.note.revision } })).status, 200);
    assert.deepEqual((await call('/me/connection-notes')).payload.data.notes, []);
  } finally { await server.cleanup(); }
});
