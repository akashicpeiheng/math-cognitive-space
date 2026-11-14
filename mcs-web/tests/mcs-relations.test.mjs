import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mcsRelationTopics, mcsRelationLanes, placeMcsRelationLabels } from '../web/src/mcs-relation-display.ts';
import { startTestServer, jsonCall } from './helpers.mjs';

test('topic context respects cross-membership and every AND premise without inventing links', () => {
  const object = (id, scale = 'unit', members = []) => ({ id, scale, members: members.map(id => ({ id })) });
  const relation = (id, from, to, premises = []) => ({ id, from: { id: from }, to: { id: to }, premises: premises.map(id => ({ id })) });
  const data = { objects: [object('t', 'topic', ['a', 'c']), object('s', 'topic', ['a', 'b']), object('a'), object('b'), object('c'), object('orphan')],
    relations: [relation('ab', 'a', 'b'), relation('ac', 'a', 'c'), relation('and', 'a', 'b', ['c']), relation('external', 'a', 'orphan')] };
  const before = JSON.stringify(data), topics = mcsRelationTopics(data);
  assert.deepEqual([...topics], [['ab', ['s']], ['ac', ['t']], ['and', []], ['external', []]]);
  assert.equal(JSON.stringify(data), before);
});

test('different types and reversed relations occupy deterministic separate lanes', () => {
  const edges = [{ id: 'a', kind: 'scaling', from: 'a', to: 'b' }, { id: 'b', kind: 'application', from: 'a', to: 'b' }, { id: 'c', kind: 'duality', from: 'b', to: 'a' }];
  const lanes = mcsRelationLanes(edges);
  assert.deepEqual([...lanes], [...mcsRelationLanes([...edges].reverse())]);
  assert.deepEqual([...lanes.values()], [{ index: 0, count: 3 }, { index: 1, count: 3 }, { index: 2, count: 3 }]);
});

test('floating type labels avoid nodes and each other above their arrows', () => {
  const label = { width: 80, priority: 1, start: { x: 100, y: 250 }, control: { x: 300, y: 250 }, end: { x: 500, y: 250 } };
  const positions = placeMcsRelationLabels([{ ...label, id: 'a' }, { ...label, id: 'b' }], [{ x: 250, y: 210, w: 100, h: 30 }], { width: 800, height: 600 });
  const values = [...positions.values()];
  for (const point of values) {
    assert(point.y + 12 < 250);
    assert(!(point.x + 40 > 250 && point.x - 40 < 350 && point.y + 12 > 210 && point.y - 12 < 240));
  }
  assert(Math.abs(values[0].x - values[1].x) >= 80 || Math.abs(values[0].y - values[1].y) >= 24);
});

test('formal relation notes persist in E, reject fabricated connections and leave M unchanged', async () => {
  const server = await startTestServer({ lean: { enabled: false } });
  try {
    const call = (path, options) => jsonCall(server.origin, '/api/v2' + path, options);
    const before = (await call('/ontology/mcs-view')).payload.data;
    for (const relation of [before.relations.find(r => r.kind === 'scaling'), before.relations.find(r => r.kind === 'deduction')]) {
      assert(relation);
      const key = JSON.stringify(['relation', relation.id]), path = '/me/connection-notes/' + encodeURIComponent(key);
      const saved = await call(path, { method: 'PUT', body: { body: 'Personal explanation, not a proof.', baseRevision: 0 } });
      assert.equal(saved.status, 200, JSON.stringify(saved.payload));
      assert((await call('/me/connection-notes')).payload.data.notes.some(note => note.key === key));
      assert.equal((await call(path, { method: 'PUT', body: { body: 'stale', baseRevision: 0 } })).status, 409);
      assert.equal((await call(path, { method: 'DELETE', body: { baseRevision: saved.payload.data.note.revision } })).status, 200);
    }
    for (const key of [JSON.stringify(['relation', 'not-registered']), JSON.stringify(['topic', 'bogus', 'other']), '["relation", "not-canonical"]']) {
      assert.equal((await call('/me/connection-notes/' + encodeURIComponent(key), { method: 'PUT', body: { body: 'test', baseRevision: 0 } })).status, 404);
    }
    assert.deepEqual((await call('/ontology/mcs-view')).payload.data, before);
  } finally { await server.cleanup(); }
});
