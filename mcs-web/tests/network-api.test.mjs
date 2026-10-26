import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { startTestServer } from './helpers.mjs';
import { checkNetworkRefs } from '../server/network-api.mjs';
test('unavailable account notes cannot supply current relation endpoints', async () => {
  const ref = { source: 'vault', storage: 'account', vaultId: 'library', fileId: 'note', revision: 1, sha256: 'a'.repeat(64) };
  const db = { vaults: { get: async () => ({ revision: 1, files: [{ id: 'note', kind: 'note', missing: true, sha256: ref.sha256 }] }) } };
  await assert.rejects(checkNetworkRefs([ref], 'owner', {}, db), error => error.status === 404);
});
test('HTTP verification runs the real proof worker and freezes only selected evidence', async () => {
  const server = await startTestServer();
  const call = async (path, method = 'GET', body) => {
    const response = await fetch(server.origin + '/api/v2' + path, { method, headers: { 'content-type': 'application/json' }, body: body && JSON.stringify(body) });
    assert.equal(response.status, 200); return (await response.json()).data;
  };
  try {
    const spec = { background: 'bg:core/1', declarations: [{ name: 'P', type: 'o', role: 'proposition' }], definitions: [], assumptions: [], statement: { source: 'P', kind: 'formula' }, claims: [], references: [], boundary: [] };
    const ref = fileId => ({ source: 'vault', storage: 'browser', vaultId: 'private-library', fileId, revision: 1, sha256: 'a'.repeat(64) });
    const binding = { spec, excerpt: 'P', correspondenceConfirmed: false };
    const relation = { from: ref('a'), to: ref('b'), kind: 'equivalentTo', conditions: '', reason: '同一命题', source: '公开摘录', bindings: { from: binding, to: binding } };
    const created = await call('/network-relation-checks', 'POST', { relation });
    let check;
    for (let i = 0; i < 150; i++) {
      check = (await call('/network-relation-checks/' + created.check.id)).check;
      if (!['queued', 'running'].includes(check.status)) break;
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    assert.equal(check.result?.math.status, 'verified', JSON.stringify(check));
    assert.equal(check.result.label, 'PROOF'); assert.equal(check.result.run.status, 'completed');
    assert.deepEqual(check.result.correspondence, { from: false, to: false });
    const posted = await call('/me/relation-submissions', 'POST', { relation, endpoints: { from: { title: '命题甲', excerpt: 'P' }, to: { title: '命题乙', excerpt: 'P' } }, checkId: check.id });
    assert.equal(posted.submission.snapshot.evidence.label, 'PROOF');
    assert.equal(posted.submission.snapshot.evidence.inputHash, check.result.inputHash);
    assert.ok(!JSON.stringify(posted.submission.snapshot).includes('private-library'));
    assert.equal(posted.submission.status, 'pending');
  } finally { await server.cleanup(); }
});
test('scale plan endpoint is read-only, reference-complete and deterministic', async () => {
  const server = await startTestServer();
  const call = async (path) => {
    const response = await fetch(server.origin + '/api/v2' + path);
    return { status: response.status, payload: await response.json() };
  };
  try {
    const first = await call('/ontology/scale');
    assert.equal(first.status, 200);
    const data = first.payload.data;
    assert.match(data.ontologyVersion, /^sha256:[0-9a-f]{64}$/);
    assert.match(data.version, /^scale:[0-9a-f]{64}$/);
    assert.equal(data.scale.schema, 'mcs-scale-plan/1');
    assert.equal(data.scale.status, 'provisional-migration');
    assert.deepEqual(data.scale.levels.map((level) => level.id), ['molecule', 'node', 'unit', 'topic']);
    assert.equal(data.scale.counts.units, 55);
    assert.equal(data.scale.counts.topics, 2);
    assert.equal(data.scale.counts.molecules, 9);
    assert.equal(data.scale.counts.paths, 4);
    assert.equal(data.scale.counts.nodesCovered, 328);
    const graph = (await call('/ontology/graph')).payload.data;
    const nodeIds = new Set(graph.nodes.map((node) => node.id));
    for (const unit of data.scale.units) assert.ok(unit.members.every((id) => nodeIds.has(id)), unit.id);
    for (const molecule of data.scale.molecules) assert.ok(nodeIds.has(molecule.node), molecule.id);
    const second = await call('/ontology/scale');
    assert.equal(second.payload.data.version, data.version);
    assert.equal((await call('/ontology/scale-missing')).status, 404);
  } finally { await server.cleanup(); }
});

test('private relation endpoints, persistent checks and minimal submission snapshots', async () => {
  const server = await startTestServer();
  async function call(path, method = 'GET', body) { const response = await fetch(server.origin + '/api/v2' + path, { method, headers: { 'content-type': 'application/json' }, body: body && JSON.stringify(body) }); return { status: response.status, ...(await response.json()) }; }
  try {
    const graph = (await call('/ontology/graph')).data, ids = graph.nodes.slice(0, 2).map(n => n.id);
    const relation = { from: { source: 'ontology', id: ids[0], version: '1' }, to: { source: 'ontology', id: ids[1], version: '1' }, kind: 'related', conditions: '', reason: '私人导航', source: '', bindings: {}, checks: [{ math: { status: 'verified' } }] };
    const saved = await call('/me/network-relations', 'POST', relation); assert.equal(saved.status, 200); assert.deepEqual(saved.data.relation.checks, []);
    const created = await call('/network-relation-checks', 'POST', { relation }); assert.equal(created.status, 200);
    let checked;
    for (let i = 0; i < 100; i++) { checked = await call('/network-relation-checks/' + created.data.check.id); if (!['queued', 'running'].includes(checked.data.check.status)) break; await new Promise(r => setTimeout(r, 100)); }
    assert.equal(checked.data.check.result.math.status, 'undecided'); assert.equal(checked.data.check.result.run.status, 'unsupported'); assert.ok(checked.data.check.result.inputHash);
    const endpoints = { from: { title: '公开A', publicNodeId: ids[0], privatePath: 'secret' }, to: { title: '公开B', publicNodeId: ids[1] } };
    const posted = await call('/me/relation-submissions', 'POST', { relation, endpoints, checkId: checked.data.check.id }); assert.equal(posted.status, 200); assert.ok(!JSON.stringify(posted.data.submission.snapshot).includes('secret')); assert.equal(posted.data.submission.snapshot.evidence.inputHash, checked.data.check.result.inputHash);
    assert.equal((await call('/me/relation-submissions', 'POST', { relation: { ...relation, reason: '已改变命题材料' }, endpoints, checkId: checked.data.check.id })).status, 409);
    const id = posted.data.submission.id;
    const corrupted = await call('/me/network-relations/' + id, 'PUT', { ...relation, baseRevision: 1 }); assert.equal(corrupted.status, 404);
    const conflict = await call('/authoring/relation-submissions/' + id, 'PATCH', { baseRevision: 0, status: 'staged' }); assert.equal(conflict.status, 409);
    const staged = await call('/authoring/relation-submissions/' + id, 'PATCH', { baseRevision: 1, status: 'staged' }); assert.equal(staged.status, 200, JSON.stringify(staged)); assert.ok(staged.data.submission.drafts.from);
    const fakePublish = await call('/authoring/relation-submissions/' + id, 'PATCH', { baseRevision: 2, status: 'published', publicRelationId: 'forged' }); assert.equal(fakePublish.status, 409);
    assert.equal((await call('/ontology/graph')).data.version, graph.version);
    const withdrawal = await call('/me/relation-submissions/' + posted.data.submission.id, 'DELETE', { baseRevision: staged.data.submission.revision }); assert.equal(withdrawal.data.submission.status, 'withdrawn');
    const impossible = await call('/me/network-relations', 'POST', { ...relation, to: { source: 'ontology', id: 'missing', version: '1' } }); assert.equal(impossible.status, 404);
    const edited = await call('/me/network-relations/' + saved.data.relation.id, 'PUT', { ...relation, reason: '修订后的声明', baseRevision: 1 }); assert.equal(edited.status, 200);
    const stale = (await call('/me/network-relations')).data.relations.find(r => r.id === saved.data.relation.id); assert.equal(stale.checks.at(-1).stale, true);
    server.jobs.spawnWorker = () => { const worker = new EventEmitter(); worker.terminate = async () => 0; return worker; };
    const canceled = await call('/network-relation-checks', 'POST', { relation });
    const stopped = await call('/network-relation-checks/' + canceled.data.check.id, 'DELETE'); assert.equal(stopped.data.check.result.run.status, 'cancelled'); assert.equal(stopped.data.check.result.math.status, 'undecided');
    server.jobs.maxDurationMs = 50;
    const timeout = await call('/network-relation-checks', 'POST', { relation }); await new Promise(resolve => setTimeout(resolve, 150));
    const timed = await call('/network-relation-checks/' + timeout.data.check.id); assert.equal(timed.data.check.result.run.status, 'timeout'); assert.equal(timed.data.check.result.math.status, 'undecided');
  } finally { await server.cleanup(); }
});
