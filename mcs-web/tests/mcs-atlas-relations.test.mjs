import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadContentLibrary } from '../core/content-library.mjs';
import { mcsPresentation } from '../shared/mcs-presentation.mjs';
import { createMcsAtlas } from '../shared/mcs-atlas.mjs';
import {
  MAIN_RELATION_KINDS,
  arrangeConstellation,
  constellationFor,
  relationEdgesForObjects,
  relationsForObject,
} from '../shared/mcs-atlas-relations.mjs';

const library = loadContentLibrary();
const data = { objects: library.objects, relations: library.relations, presentation: mcsPresentation(library.objects) };
const atlas = createMcsAtlas(data);
const topic = atlas.byId['atlas:object:obj:tdg:topic-exterior-calculus'];
const visible = new Set(topic.children.map(child => child.objectId));
const child = id => topic.children.find(entry => entry.objectId === id);
const center = (node) => ({ x: node.x + node.w / 2, y: node.y + node.h / 2 });

test('the curated constellation names the core and the three reading groups', () => {
  const constellation = constellationFor('obj:tdg:topic-exterior-calculus');
  assert.equal(constellation.core, 'obj:tdg:exterior');
  assert.deepEqual(constellation.groups.map(group => group.id), ['d2-zero', 'form-ops', 'vector-analysis']);
  assert.deepEqual([...constellation.groups[0].members], ['obj:tdg:d-squared', 'obj:tdg:curl-grad', 'obj:tdg:div-curl']);
  assert.deepEqual([...constellation.groups[1].members], ['obj:tdg:forms', 'obj:tdg:hodge', 'obj:tdg:insertion']);
  assert.deepEqual([...constellation.groups[2].members], ['obj:tdg:vector-realization', 'obj:tdg:formal-adjoint']);
  assert.deepEqual([...MAIN_RELATION_KINDS], ['deduction', 'application', 'scaling', 'duality']);
});

test('the atlas centers 外微分 d and keeps the d² family together inside the topic box', () => {
  assert(topic.constellation, 'topic carries a constellation');
  assert.equal(topic.constellation.core, 'obj:tdg:exterior');
  const core = child('obj:tdg:exterior');
  const coreCenter = center(core);
  assert(Math.abs(coreCenter.x - (topic.x + topic.w * .5)) < topic.w * .02);
  assert(Math.abs(coreCenter.y - (topic.y + topic.h * .46)) < topic.h * .02);
  const family = ['obj:tdg:d-squared', 'obj:tdg:curl-grad', 'obj:tdg:div-curl'].map(child);
  for (const node of family) {
    assert(node, 'family member exists');
    assert(center(node).y > coreCenter.y, 'd² family sits below the core');
  }
  // 三条结论在同一扇区：y 接近，x 按左—中—右排开。
  const [left, middle, right] = family.map(node => center(node));
  assert(Math.abs(left.y - middle.y) < topic.h * .14 && Math.abs(middle.y - right.y) < topic.h * .14);
  assert(left.x < middle.x && middle.x < right.x);
  for (const node of topic.children) {
    assert(node.x >= topic.x - 1e-8 && node.y >= topic.y - 1e-8);
    assert(node.x + node.w <= topic.x + topic.w + 1e-8);
    assert(node.y + node.h <= topic.y + topic.h + 1e-8);
  }
});

test('the constellation layout is deterministic when objects and members are reversed', () => {
  const reversed = structuredClone(data);
  reversed.objects.reverse();
  reversed.objects.forEach(object => object.members.reverse());
  assert.deepEqual(createMcsAtlas(reversed), atlas);
});

test('the five visible main relations are drawn with the expected direction and kind', () => {
  const edges = relationEdgesForObjects(library.relations, visible);
  assert.equal(edges.length, 5);
  assert.deepEqual(edges.map(edge => [edge.from, edge.to, edge.kind]), [
    ['obj:tdg:exterior', 'obj:tdg:d-squared', 'deduction'],
    ['obj:tdg:exterior', 'obj:tdg:vector-realization', 'deduction'],
    ['obj:tdg:hodge', 'obj:tdg:vector-realization', 'deduction'],
    ['obj:tdg:exterior', 'obj:tdg:curl-grad', 'application'],
    ['obj:tdg:exterior', 'obj:tdg:div-curl', 'application'],
  ]);
  assert.ok(edges.every(edge => visible.has(edge.from) && visible.has(edge.to)));
  assert.ok(edges.every(edge => edge.from !== edge.to));
  assert.equal(new Set(edges.map(edge => `${edge.from}|${edge.to}`)).size, edges.length);
});

test('the map excludes non-main relations while the detail keeps cross-topic relations', () => {
  assert.ok(!relationEdgesForObjects(library.relations, visible).some(edge => edge.kind === 'hardPrereq' || edge.kind === 'analogy'));
  const rows = relationsForObject(library.relations, 'obj:tdg:curl-grad');
  const others = rows.map(relation => relation.from.id === 'obj:tdg:curl-grad' ? relation.to.id : relation.from.id);
  assert.ok(others.includes('obj:tdg:exterior'));
  assert.ok(others.includes('obj:tdg:curl'));
  assert.ok(others.includes('obj:tdg:gradient'));
  assert.equal(rows.filter(relation => relation.kind === 'deduction').length, 2);
  assert.equal(rows.filter(relation => relation.kind === 'application').length, 1);
});

test('a relation-light parent falls back to no constellation, and a generic component gets a core', () => {
  const empty = arrangeConstellation(
    { objectId: 'test:parent', x: 0, y: 0, w: 100, h: 100 },
    [
      { objectId: 'a', x: 0, y: 0, w: 10, h: 10 },
      { objectId: 'b', x: 0, y: 0, w: 10, h: 10 },
    ],
    [],
  );
  assert.equal(empty, null);
  const relations = [{
    id: 'r:test',
    kind: 'application',
    from: { id: 'a' },
    to: { id: 'b' },
    layer: 'M',
  }];
  const arrangement = arrangeConstellation(
    { objectId: 'test:parent', x: 0, y: 0, w: 100, h: 100 },
    [
      { objectId: 'a', x: 0, y: 0, w: 10, h: 10 },
      { objectId: 'b', x: 0, y: 0, w: 10, h: 10 },
    ],
    relations,
  );
  assert(arrangement);
  assert.ok(arrangement.positions.has('a') && arrangement.positions.has('b'));
  const a = arrangement.positions.get('a'), b = arrangement.positions.get('b');
  assert(a.x >= 0 && a.x + 10 <= 100 && a.y >= 0 && a.y + 10 <= 100);
  assert(b.x >= 0 && b.x + 10 <= 100 && b.y >= 0 && b.y + 10 <= 100);
});
