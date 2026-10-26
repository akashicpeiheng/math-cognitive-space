import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { loadContentLibrary } from '../core/content-library.mjs';
import { buildMcsView } from '../core/mcs-view.mjs';
import { REPO_ROOT } from '../core/ontology.mjs';
import { createApi } from '../server/api.mjs';
import { GROUP_OBJECT_IDS, PRESETS } from '../shared/mcs-groups.mjs';
import { relationConnectionKey } from '../shared/connection-keys.mjs';
import { objectMasterView } from '../shared/master-view.mjs';
import { PRESETS as WEB_PRESETS } from '../web/src/content-case.ts';
import { startTestServer, jsonCall, testOntology } from './helpers.mjs';

const endpoint = '/api/v2/ontology/mcs-view';
const library = loadContentLibrary();
const topologyCase = JSON.parse(readFileSync(new URL('../../mcs-content/cases/topology-dg.json', import.meta.url), 'utf8'));
const sorted = values => [...values].sort();
const publicObjectFields = ['id','version','title','scale','formalHash','path','declarations','members','references','imports','exports','assumptions','normalizedContext'];

function checkView(view) {
  assert.deepEqual(sorted(Object.keys(view)), sorted(['schema','objectVersion','contentLocale','levels','objects','relations','groups']));
  assert.equal(view.schema, 'mcs-view/1');
  assert.equal(view.contentLocale, 'zh');
  assert.equal(view.objectVersion, library.objectVersion);
  assert.deepEqual(view.levels, library.scale.levels);
  assert.equal(view.objects.length, 65);
  assert.deepEqual(view.objects.map(object => object.id), library.objects.map(object => object.id));
  for (const object of view.objects) {
    const original = library.objects.find(record => record.id === object.id);
    assert.deepEqual(sorted(Object.keys(object)), sorted(publicObjectFields));
    for (const key of publicObjectFields.filter(key => key !== 'declarations')) assert.deepEqual(object[key], original[key], `${object.id}.${key}`);
    assert.deepEqual(object.declarations, original.declarations.map(({ canonical, ...declaration }) => declaration));
    assert.deepEqual(
      objectMasterView(object, { objects: view.objects, sourceVersion: view.objectVersion }),
      objectMasterView(original, { objects: library.objects, sourceVersion: library.objectVersion }),
    );
  }
  // Preserve complete records: premises, witnesses, conditions, directions and evidence.
  assert.deepEqual(view.relations, library.relations.filter(relation => relation.layer === 'M'));
  const byId = new Map(view.objects.map(object => [object.id, object]));
  const refs = view.objects.flatMap(object => [
    ...object.members, ...object.references, ...object.imports, ...object.exports.map(item => item.ref),
  ]).concat(view.relations.flatMap(relation => [relation.from, relation.to, ...relation.premises]));
  assert(refs.some(ref => ref.anchor === '$'));
  for (const anchor of ['definition','condition','claim']) assert(refs.some(ref => ref.anchor === anchor));
  for (const ref of refs) {
    assert.deepEqual(sorted(Object.keys(ref)), ['anchor','formalHash','id','version']);
    const object = byId.get(ref.id);
    assert(object, ref.id);
    assert.equal(ref.version, object.version);
    const target = ref.anchor === '$' ? object : object.declarations.find(declaration => declaration.id === ref.anchor);
    assert(target, `${ref.id}#${ref.anchor}`);
    assert.equal(ref.formalHash, target.formalHash, `${ref.id}#${ref.anchor}`);
  }
  const exportedClaim = byId.get('obj:group:unit').exports.find(item => item.name === 'injective').ref;
  assert.equal(exportedClaim.anchor, 'claim');
  assert.notEqual(exportedClaim.formalHash, byId.get(exportedClaim.id).formalHash);
  const groups = new Map(view.groups.map(group => [group.id, group]));
  assert.deepEqual([...groups.keys()], ['all','group','topology-dg','topology','manifolds','operators']);
  for (const group of groups.values()) {
    assert.deepEqual(sorted(Object.keys(group)), ['id','objectIds','title']);
    assert.deepEqual(sorted(Object.keys(group.title)), ['en','zh']);
    assert(group.title.zh && group.title.en);
    assert.equal(new Set(group.objectIds).size, group.objectIds.length);
    assert(group.objectIds.every(id => byId.has(id)));
  }
  assert.deepEqual(groups.get('all').objectIds, [...byId.keys()]);
  assert.equal(groups.get('group').objectIds.length, 8);
  assert.deepEqual(sorted(groups.get('group').objectIds), sorted(GROUP_OBJECT_IDS));
  assert.equal(groups.get('topology-dg').objectIds.length, 57);
  assert.deepEqual(sorted([...groups.get('group').objectIds, ...groups.get('topology-dg').objectIds]), sorted(byId.keys()));
  assert.deepEqual(PRESETS, WEB_PRESETS);
  for (const [id, keys] of Object.entries(WEB_PRESETS)) assert.deepEqual(groups.get(id).objectIds, keys.map(key => `obj:tdg:${key}`));
}

test('MCS view exposes every current object, exact declaration pins and every M relation without writing E', async () => {
  const app = await startTestServer({ lean: { enabled: false } });
  try {
    const before = await app.db.dumpAll();
    const response = await jsonCall(app.origin, endpoint);
    assert.equal(response.status, 200, JSON.stringify(response.payload));
    checkView(response.payload.data);
    const english = await jsonCall(app.origin, `${endpoint}?locale=en`);
    assert.equal(english.status, 200);
    assert.deepEqual(english.payload.data, response.payload.data);
    for (const method of ['POST','PUT','PATCH','DELETE']) {
      assert.equal((await jsonCall(app.origin, endpoint, { method, body: {} })).status, 404);
    }
    const after = await app.db.dumpAll();
    delete before.exportedAt;
    delete after.exportedAt;
    assert.deepEqual(after, before);
  } finally { await app.cleanup(); }
});

test('anonymous cloud API uses the shared public registration and never accesses the learner DB', async () => {
  const forbidden = new Proxy({}, { get(_target, key) { assert.fail(`MCS view accessed personal DB: ${String(key)}`); } });
  const ontology = await testOntology();
  const handle = createApi({
    ontology, db: forbidden, jobs: {}, tutor: {}, config: { repoRoot: REPO_ROOT },
    auth: { enabled: true, identify: async () => ({ user: null }) }, cloud: {},
  });
  const server = createServer((req, res) => { void handle(req, res); });
  try {
    server.listen(0, '127.0.0.1');
    await once(server, 'listening');
    const origin = `http://127.0.0.1:${server.address().port}`;
    const response = await jsonCall(origin, endpoint);
    assert.equal(response.status, 200, JSON.stringify(response.payload));
    checkView(response.payload.data);
    // Establish that authentication is actually enforced for private routes.
    assert.equal((await jsonCall(origin, '/api/v2/profiles')).status, 401);
  } finally {
    handle.close();
    if (server.listening) await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  }
});

test('personal profile, mastery, saved camera/positions and notes cannot change MCS data or objectVersion', async () => {
  const app = await startTestServer({ lean: { enabled: false } });
  try {
    const before = (await jsonCall(app.origin, endpoint)).payload.data;
    const profile = await app.db.createProfile({ name: '合成 MCS 测试学习者', modelVersion: 'mcs-manual-model/1' });
    const event = await jsonCall(app.origin, `/api/v2/profiles/${profile.id}/events`, {
      method: 'POST', body: { event: {
        eventId: 'mcs-view-private-mastery', kind: 'confirmation', nodeId: 'group:claim-injective', payload: { confirmed: true },
      } },
    });
    assert.equal(event.status, 200, JSON.stringify(event.payload));
    const connectionKey = relationConnectionKey(app.getOntology().raw.relationDescriptions[0]);
    const note = await jsonCall(app.origin, `/api/v2/me/connection-notes/${encodeURIComponent(connectionKey)}`, {
      method: 'PUT', body: { body: '合成的个人连接备注，不属于 M', baseRevision: 0 },
    });
    assert.equal(note.status, 200, JSON.stringify(note.payload));
    const camera = { x: 120, y: -80, scale: 1.5 };
    const positions = { 'obj:group:injective': { x: 25, y: 45 } };
    const savedView = await app.db.createNetworkView(profile.id, {
      name: '合成个人视图', payload: {
        schema: 'mcs-network/3', camera, positions,
        refs: [{ source: 'math-object', id: 'obj:group:injective', version: '1', formalHash: library.objects.find(object => object.id === 'obj:group:injective').formalHash }],
      },
    });
    assert.deepEqual(savedView.payload.camera, camera);
    assert.deepEqual(savedView.payload.positions, positions);
    assert.equal(savedView.payload.refs[0].id, 'obj:group:injective');
    const beforeRead = await app.db.dumpAll();
    assert(beforeRead.events.length > 0);
    assert.equal(beforeRead.networkViews.length, 1);
    const after = await jsonCall(app.origin, endpoint);
    assert.equal(after.status, 200);
    assert.deepEqual(after.payload.data, before);
    const afterRead = await app.db.dumpAll();
    delete beforeRead.exportedAt;
    delete afterRead.exportedAt;
    assert.deepEqual(afterRead, beforeRead);
  } finally { await app.cleanup(); }
});

test('grouping follows registered IDs and M premises, excluding title guesses and L-only endpoints', () => {
  const input = structuredClone(library), manifest = structuredClone(topologyCase);
  const cloneObject = (id, title) => ({ ...structuredClone(input.objects[0]), id, title });
  input.objects.push(
    cloneObject('obj:group:unregistered', '群论 拓扑 流形 算子'),
    cloneObject('obj:outside:core', '无关标题'),
    cloneObject('obj:outside:premise', '无关标题'),
    cloneObject('obj:outside:reading-only', '拓扑性质'),
  );
  manifest.core.push({ object: 'obj:outside:core' });
  const pin = id => ({ id, version: '1', anchor: '$', formalHash: input.objects[0].formalHash });
  const relation = structuredClone(input.relations.find(record => record.layer === 'M'));
  input.relations.push({ ...relation, id: 'rel:explicit-premise', premises: [pin('obj:outside:premise')] });
  input.relations.push({ ...relation, id: 'rel:reading-only', layer: 'L', to: pin('obj:outside:reading-only') });
  manifest.relations.push({ id: 'rel:explicit-premise' }, { id: 'rel:reading-only' });
  input.objects.forEach(object => { object.title = '同一个标题'; });
  const before = JSON.stringify(input);
  const view = buildMcsView(input, manifest);
  assert.equal(JSON.stringify(input), before);
  const all = view.groups.find(group => group.id === 'all').objectIds;
  assert.equal(all.length, input.objects.length);
  const tdg = view.groups.find(group => group.id === 'topology-dg').objectIds;
  assert(tdg.includes('obj:outside:core'));
  assert(tdg.includes('obj:outside:premise'));
  assert(!tdg.includes('obj:outside:reading-only'));
  for (const group of view.groups.filter(group => group.id !== 'all')) assert(!group.objectIds.includes('obj:group:unregistered'));
  assert(view.relations.some(record => record.id === 'rel:explicit-premise'));
  assert(!view.relations.some(record => record.id === 'rel:reading-only'));
});
