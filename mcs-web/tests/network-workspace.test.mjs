import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { nextNodeShape, circleAnchor, indexNote, projectMixedGraph } from '../web/src/network-workspace.ts';
import { normalizePrivateRelation, normalizeNetworkExtras, normalizeSubmission, nodeRefKey, decodeNoteKey, checkRelationStructure } from '../shared/network-workspace.mjs';
import { normalizeNetworkView } from '../shared/contracts.mjs';
import { buildEdges } from '../web/src/network.ts';
import { networkNodeIds, networkUrlParts } from '../web/src/network-url.ts';
const hash = 'a'.repeat(64), ref = { source: 'vault', storage: 'browser', vaultId: 'lib:测试', fileId: 'a', revision: 1, sha256: hash };
/** 本文件所在目录：样式表契约那一条要按真实路径读两个 CSS 文件。 */
const here = dirname(fileURLToPath(import.meta.url));
const relation = { from: { source: 'ontology', id: 'math:a', version: '1' }, to: ref, kind: 'conditionalDerivation', conditions: '共同假设', reason: '由命题导出', source: '已选摘录', bindings: {} };
test('large mixed views refresh through fragments without oversized HTTP request headers', () => {
  const ids = Array.from({ length: 2000 }, (_, i) => `note:browser:library-${i % 3}:file-${i}`).join(',');
  const params = new URLSearchParams({ nodes: ids, play: '1', entry: 'math:a' }), parts = networkUrlParts(params);
  assert.ok(parts.search.length < 7000); assert.match(parts.hash, /^#nodes=/);
  assert.equal(networkNodeIds(new URLSearchParams(parts.search), parts.hash), ids);
  assert.equal(new URLSearchParams(parts.search).get('play'), '1');
  assert.throws(() => normalizeNetworkView({ name: '超限', payload: { added: Array.from({ length: 2001 }, (_, i) => `n${i}`) } }), /2,000/);
});
test('语义缩放：只有放得很大才是方块（圆点档有滞后带），圆点锚点仍保留卡片中心', () => {
  /*
   * 阈值 2026-10-16 由用户要求改成「只有视图很大时用方块」：圆点 < 100%，方块 > 120%。
   * 45%/60% 这两档过去是卡片，现在是圆点——这是这次改动的**全部意义**，所以在这里钉住。
   */
  assert.equal(nextNodeShape('card', 0.45), 'dot', '旧的卡片区间现在必须是圆点');
  assert.equal(nextNodeShape('card', 0.6), 'dot');
  assert.equal(nextNodeShape('card', 0.99), 'dot');
  assert.equal(nextNodeShape('dot', 1.1), 'dot', '滞后带内保持上一次的形状');
  assert.equal(nextNodeShape('card', 1.1), 'card', '滞后带内不翻形状（捏合时不会一格一格地跳）');
  assert.equal(nextNodeShape('dot', 1.21), 'card');
  assert.equal(nextNodeShape('card', 1.21), 'card');
  assert.equal(nextNodeShape('card', 2), 'card');
  assert.equal(nextNodeShape('dot', 0.3), 'dot');
  assert.deepEqual(circleAnchor({ x: 0, y: 0 }, { x: 200, y: 0 }, 10), { x1: 96, y1: 29, x2: 276, y2: 29 });
});
test('点击不画方框，键盘聚焦仍然画（两条规则各管一半）', () => {
  /*
   * 用户要求：「点击的时候还是会有方框，把框去掉」。
   *
   * 那个方框是浏览器给聚焦元素加的 UA 轮廓，形状取节点组的包围盒（卡片矩形）；
   * 圆点档下卡片透明，于是画面上只剩一个「没有卡片、只有框」的大圆角矩形。
   * 修法是**只关掉指针聚焦**（`:focus:not(:focus-visible)`），键盘 Tab 的全站描边保留。
   * 这里按样式表文本钉住两半：改回 `outline: auto` 或者把 `:not(:focus-visible)` 删掉，这一条会红。
   */
  const workspaceCss = readFileSync(resolve(here, '../web/src/network-workspace.css'), 'utf8');
  const nodeFocusRule = /\.network-node:focus:not\(:focus-visible\)\s*\{[^}]*outline:\s*none/.exec(workspaceCss);
  assert.ok(nodeFocusRule, '指针聚焦的轮廓必须显式关掉');
  const baseCss = readFileSync(resolve(here, '../web/src/styles.css'), 'utf8');
  assert.match(baseCss, /:focus-visible\s*\{[^}]*outline:\s*2px solid/, '键盘聚焦的全站描边不能被顺手删掉');
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

test('saved views keep optional scale state; old snapshots stay unchanged', () => {
  const old = normalizeNetworkView({ name: '旧视图', payload: { added: ['math:a'] } });
  assert.equal('scale' in old.payload, false, '旧快照不应凭空多出一个 scale 字段');
  const view = normalizeNetworkView({
    name: '尺度视图',
    payload: {
      added: ['math:a'],
      scale: {
        levels: ['topic', 'unit', 'topic', 'unknown'],
        added: ['topic:t', 'topic:t', ''],
        split: ['unit:u', 3],
        autoMerge: false,
        positions: { 'topic:t': { x: 1.234, y: -5.678 }, 'unit:u': { x: 'bad', y: 2 } },
        version: 'scale:abc',
      },
    },
  });
  assert.deepEqual(view.payload.scale, {
    levels: ['topic', 'unit'],
    added: ['topic:t'],
    split: ['unit:u'],
    autoMerge: false,
    positions: { 'topic:t': { x: 1.23, y: -5.68 } },
    version: 'scale:abc',
  });
  assert.equal(normalizeNetworkView({ name: '空尺度', payload: { scale: { levels: [] } } }).payload.scale, undefined);
});

test('scale ids move into the fragment together with nodes when the URL grows', () => {
  const nodes = Array.from({ length: 400 }, (_, i) => `note:browser:library:file-${i}`).join(',');
  const scaleNodes = Array.from({ length: 120 }, (_, i) => `unit:test:${i}`).join(',');
  const parts = networkUrlParts(new URLSearchParams({ nodes, scaleNodes, split: scaleNodes, play: '1' }));
  assert.ok(parts.search.length < 7000);
  assert.match(parts.hash, /nodes=/);
  assert.match(parts.hash, /scaleNodes=/);
  assert.match(parts.hash, /split=/);
  assert.equal(networkNodeIds(new URLSearchParams(parts.search), parts.hash), nodes);
});
