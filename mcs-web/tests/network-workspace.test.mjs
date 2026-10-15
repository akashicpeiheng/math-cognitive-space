import { test } from 'node:test';
import assert from 'node:assert/strict';
import { nextNodeShape, circleAnchor, indexNote, projectMixedGraph } from '../web/src/network-workspace.ts';
import { normalizePrivateRelation, normalizeNetworkExtras, normalizeSubmission, nodeRefKey, decodeNoteKey, checkRelationStructure } from '../shared/network-workspace.mjs';
import { normalizeNetworkView } from '../shared/contracts.mjs';
import { buildEdges } from '../web/src/network.ts';
import { networkNodeIds, networkUrlParts } from '../web/src/network-url.ts';
const hash = 'a'.repeat(64), ref = { source: 'vault', storage: 'browser', vaultId: 'lib:测试', fileId: 'a', revision: 1, sha256: hash };
const relation = { from: { source: 'ontology', id: 'math:a', version: '1' }, to: ref, kind: 'conditionalDerivation', conditions: '共同假设', reason: '由命题导出', source: '已选摘录', bindings: {} };
test('large mixed views refresh through fragments without oversized HTTP request headers', () => {
  const ids = Array.from({ length: 2000 }, (_, i) => `note:browser:library-${i % 3}:file-${i}`).join(',');
  const params = new URLSearchParams({ nodes: ids, play: '1', entry: 'math:a' }), parts = networkUrlParts(params);
  assert.ok(parts.search.length < 7000); assert.match(parts.hash, /^#nodes=/);
  assert.equal(networkNodeIds(new URLSearchParams(parts.search), parts.hash), ids);
  assert.equal(new URLSearchParams(parts.search).get('play'), '1');
  assert.throws(() => normalizeNetworkView({ name: '超限', payload: { added: Array.from({ length: 2001 }, (_, i) => `n${i}`) } }), /2,000/);
});
test('semantic zoom has hysteresis and circle anchors preserve card centres', () => {
  assert.equal(nextNodeShape('card', .54), 'dot'); assert.equal(nextNodeShape('dot', .60), 'dot'); assert.equal(nextNodeShape('card', .60), 'card'); assert.equal(nextNodeShape('dot', .66), 'card');
  assert.deepEqual(circleAnchor({ x: 0, y: 0 }, { x: 200, y: 0 }, 10), { x1: 96, y1: 29, x2: 276, y2: 29 });
});
test('note identity includes storage and library, never title; v2 views retain refs and filters', () => {
  const key = nodeRefKey(ref); assert.equal(decodeNoteKey(key).vaultId, ref.vaultId);
  assert.notEqual(key, nodeRefKey({ ...ref, storage: 'account' }));
  const payload = { schema: 'mcs-network/2', refs: [ref], sources: [{ kind: 'vault', vaultId: ref.vaultId, storage: 'browser' }], filters: { noteReference: false }, added: [key], camera: { x: 2, y: 3, scale: .5 }, placements: { [key]: { x: 400, y: 50 } }, layout: { mode: 'logic', anchors: { learning: null, logic: key } } };
  const view = normalizeNetworkView({ name: '混合网络', payload }); assert.deepEqual(view.payload.refs, [ref]); assert.equal(view.payload.filters.noteReference, false);
  assert.deepEqual(view.payload.placements, payload.placements); assert.deepEqual(view.payload.layout, payload.layout);
  assert.equal(normalizeNetworkView({ name: '旧视图', payload: { added: ['math:a'] } }).payload.schema, undefined);
  assert.throws(() => normalizeNetworkExtras({ schema: 'mcs-network/2', refs: [{ ...ref, sha256: 'bad' }] }));
});
test('note parsing resolves links uniquely, preserves source significance, and never creates prerequisites', () => {
  const files = [{ id: 'a', path: 'a.md', kind: 'note', nodeIds: ['math:a'], sha256: hash }, { id: 'b', path: 'one/b.md', kind: 'note', nodeIds: [], sha256: hash }, { id: 'c', path: 'other/b.md', kind: 'note', nodeIds: [], sha256: hash }];
  const indexed = indexNote(files, files[0], '# A\n\n简介。\n\n## 引入动机\n\n解决旧问题。\n\n## 形式\n\n[[b]] [[other/b]] [[不存在]]');
  assert.equal(indexed.significance, '解决旧问题。'); assert.equal(indexed.ambiguous, 1); assert.equal(indexed.missing, 1); assert.deepEqual(indexed.outgoing, ['c']);
  const base = { nodes: [{ id: 'math:a', title: 'A', version: '1' }], relations: [], actions: [] }, vault = { id: ref.vaultId, name: '笔记库', revision: 1, storage: 'browser', files };
  const indexes = new Map([[nodeRefKey(ref), indexed]]), result = projectMixedGraph(base, [vault], indexes, [relation], { noteReference: true, privateReference: true, privateRelation: true });
  assert.equal(result.graph.relations.length, 0); assert.equal(result.graph.actions.length, 0);
  const edges = buildEdges(result.graph, new Set(result.graph.nodes.map(n => n.id))); assert.ok(edges.some(e => e.origin === 'noteReference')); assert.ok(edges.some(e => e.origin === 'privateReference')); assert.ok(!edges.some(e => e.kind === 'hardPrereq'));
});
test('client proof fields are discarded; contributions exclude private locators and unselected data', () => {
  const normalized = normalizePrivateRelation({ ...relation, checks: [{ math: { status: 'verified' } }], secret: '私人全文' }); assert.equal(normalized.checks, undefined); assert.equal(normalized.secret, undefined);
  assert.equal(checkRelationStructure({ ...relation, conditions: '' }).status, 'invalid');
  const submission = normalizeSubmission({ relation, endpoints: { from: { title: 'A', publicNodeId: 'math:a' }, to: { title: '公开命题', excerpt: '最小摘录', privatePath: 'E:/私人.md', entireBody: '秘密' } } });
  const text = JSON.stringify(submission); assert.ok(!text.includes('lib:测试')); assert.ok(!text.includes('privatePath')); assert.ok(!text.includes('秘密')); assert.ok(text.includes('最小摘录'));
});
