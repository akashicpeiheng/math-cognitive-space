import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadContentLibrary } from '../core/content-library.mjs';
import { mcsPresentation } from '../shared/mcs-presentation.mjs';
import { createMcsAtlas } from '../shared/mcs-atlas.mjs';
import {
  MSC_2020, ARXIV_MATH, MSC_2020_SOURCE, ARXIV_MATH_SOURCE,
  MCS_FIELD_FRAMEWORK, MCS_BRANCH_FRAMEWORK, MSC_PRIMARY_FIELD, UNMAPPED_MSC,
  frameworkFor, frameworkRows, frameworkSearch, frameworkObjectIds, frameworkCode,
  frameworkFilterIds, objectStructure, validateFrameworkRegistry, classificationSummary,
} from '../shared/mcs-framework.mjs';

function libraryData() {
  const library = loadContentLibrary();
  return {
    objects: library.objects,
    relations: library.relations,
    presentation: mcsPresentation(library.objects),
    levels: library.scale.levels,
  };
}
function dataFor(objects) {
  const data = libraryData();
  return { ...data, objects };
}
function atlasFor() {
  const library = loadContentLibrary();
  return createMcsAtlas(dataFor(library.objects));
}
function subtreeObjectCount(node) {
  return (node.objectId ? 1 : 0) + node.children.reduce((sum, child) => sum + subtreeObjectCount(child), 0);
}

test('MSC2020 and arXiv registries are complete, unique and sourced', () => {
  assert.equal(MSC_2020.length, 63);
  assert.equal(new Set(MSC_2020.map(entry => entry.code)).size, 63);
  assert.equal(ARXIV_MATH.length, 32);
  assert.equal(new Set(ARXIV_MATH.map(entry => entry.code)).size, 32);
  for (const entry of MSC_2020) {
    assert.match(entry.code, /^\d{2}$/);
    assert(entry.title.en && entry.title.zh, `${entry.code} needs paired titles`);
    assert(['atlas:analysis', 'atlas:algebra', 'atlas:geometry', 'atlas:topology', 'atlas:number-theory', 'atlas:discrete', 'atlas:probability-statistics', 'atlas:foundations-computation', 'unmapped'].includes(entry.primaryField));
  }
  for (const entry of ARXIV_MATH) {
    assert.match(entry.code, /^math\.[A-Z]{2}$/);
    assert(entry.title.en && entry.title.zh, `${entry.code} needs paired titles`);
  }
  assert.match(MSC_2020_SOURCE.url, /^https:\/\//);
  assert.match(ARXIV_MATH_SOURCE.url, /^https:\/\//);
  assert.equal(MSC_2020_SOURCE.checked, '2026-11-15');
  assert.deepEqual([...new Set(MSC_2020.map(entry => entry.primaryField))].filter(field => field === 'unmapped'), ['unmapped']);
  assert.equal(Object.keys(MSC_PRIMARY_FIELD).length, 63);
  assert.equal(UNMAPPED_MSC.length, 12);
});

test('the registry passes static consistency checks against the current atlas', () => {
  const problems = validateFrameworkRegistry(atlasFor());
  assert.deepEqual(problems, []);
  assert.deepEqual(Object.keys(MCS_FIELD_FRAMEWORK).sort(), [
    'atlas:algebra', 'atlas:analysis', 'atlas:discrete', 'atlas:foundations-computation',
    'atlas:geometry', 'atlas:number-theory', 'atlas:probability-statistics', 'atlas:topology',
  ]);
  assert(Object.keys(MCS_BRANCH_FRAMEWORK).length >= 29);
});

test('frameworkFor resolves fields, branches, crossings, object nodes and unknown ids', () => {
  const atlas = atlasFor();
  const field = frameworkFor(atlas.byId['atlas:analysis'], atlas);
  assert.equal(field.source, 'field');
  assert(field.msc.some(entry => entry.code === '46'));
  assert(field.arxiv.some(entry => entry.code === 'math.FA'));

  const branch = frameworkFor(atlas.byId['atlas:functional-analysis'], atlas);
  assert.equal(branch.source, 'branch');
  assert.deepEqual(branch.msc.map(entry => entry.code), ['46', '47']);

  const crossing = atlas.nodes.find(node => node.crossingId === 'cross:harmonic-representations');
  assert(crossing, 'a crossing entrance exists');
  const crossingFramework = frameworkFor(crossing, atlas);
  assert.equal(crossingFramework.source, 'crossing');
  assert(crossingFramework.msc.some(entry => entry.code === '46'));
  assert(crossingFramework.msc.some(entry => entry.code === '20'));

  const parent = atlas.byId[atlas.nodes.find(node => node.objectId === 'obj:tdg:jacobian').parentId];
  const object = frameworkFor(atlas.nodes.find(node => node.objectId === 'obj:tdg:jacobian'), atlas);
  const parentFramework = frameworkFor(parent, atlas);
  assert.equal(object.source, 'inherited');
  assert.deepEqual(object.msc.map(entry => entry.code), parentFramework.msc.map(entry => entry.code));

  const root = frameworkFor(atlas.root, atlas);
  assert.equal(root.source, 'none');
  assert.deepEqual(root.msc, []);
  const unknown = frameworkFor({ id: 'atlas:missing', children: [] }, atlas);
  assert.equal(unknown.source, 'none');
  assert.deepEqual(unknown.msc, []);
});

test('frameworkRows covers every MSC code once, groups by primary field and counts unique objects', () => {
  const atlas = atlasFor();
  const index = frameworkRows(atlas);
  assert.equal(index.rows.length, 63);
  assert.equal(index.counts.total, 63);
  assert.equal(index.counts.unmapped, 12);
  assert.equal(new Set(index.rows.map(row => row.code)).size, 63);
  assert.equal(index.groups.length, 9);
  assert.equal(index.groups.filter(group => group.id === 'unmapped').length, 1);

  const differential = frameworkCode(index, '53');
  assert.equal(differential.objectCount, subtreeObjectCount(atlas.byId['atlas:differential-geometry']));
  assert(differential.objectCount > 0);
  assert.equal(differential.scope, 'branch');
  assert(differential.branchIds.includes('atlas:differential-geometry'));

  const functional = frameworkCode(index, '46');
  assert.equal(functional.objectCount, subtreeObjectCount(atlas.byId['atlas:functional-analysis']));

  const group = frameworkCode(index, '20');
  assert.equal(group.objectCount, subtreeObjectCount(atlas.byId['atlas:group-theory']));
  assert(group.branchIds.includes('atlas:group-theory'));

  const unmapped = frameworkCode(index, '70');
  assert.equal(unmapped.scope, 'unmapped');
  assert.equal(unmapped.objectCount, 0);
  assert.deepEqual(unmapped.branchIds, []);
  assert.equal(unmapped.targetId, null);

  const fieldLevel = frameworkCode(index, '22');
  assert.equal(fieldLevel.scope, 'field');
  assert.equal(fieldLevel.objectCount, 0, 'a field-level code does not inherit the whole field inventory');
  assert.equal(fieldLevel.targetId, 'atlas:topology');
  assert.equal(index.counts.collected, index.rows.filter(row => row.objectCount > 0).length);

  const collected = frameworkRows(atlas, { onlyCollected: true });
  assert(collected.rows.every(row => row.objectCount > 0));
  assert(collected.rows.length < index.rows.length);
  assert.deepEqual(frameworkObjectIds(index, '20').sort(), [...group.objectIds].sort());
  assert.deepEqual(frameworkObjectIds(index, 'missing'), []);
});

test('framework search matches codes, official English, Chinese display and arXiv categories', () => {
  const rows = frameworkRows(atlasFor()).rows;
  for (const query of ['46', 'Functional analysis', '泛函分析', 'math.FA']) {
    const hits = frameworkSearch(rows, query);
    assert(hits.some(row => row.code === '46'), `${query} should find MSC 46`);
  }
  assert.equal(frameworkSearch(rows, 'zzzz-no-such-classification').length, 0);
  assert.equal(frameworkSearch(rows, '46')[0].code, '46');
  assert.equal(frameworkSearch(rows, '46', 1).length, 1);
  assert.equal(new Set(frameworkSearch(rows, 'analysis').map(row => row.code)).size, frameworkSearch(rows, 'analysis').length);
});

test('a code filter keeps the matched subtree and its ancestors, and nothing else', () => {
  const atlas = atlasFor();
  const active = frameworkFilterIds(atlas, '53');
  assert(active.has('atlas:geometry'));
  assert(active.has('atlas:differential-geometry'));
  assert(!active.has('atlas:euclidean-geometry'));
  assert(!active.has('atlas:analysis'));
  const differential = atlas.byId['atlas:differential-geometry'];
  for (const objectId of frameworkObjectIds(frameworkRows(atlas), '53')) {
    const node = atlas.nodes.find(item => item.objectId === objectId);
    assert(active.has(node.id), `${objectId} should stay visible`);
  }
  const empty = frameworkFilterIds(atlas, '46');
  assert(empty.has('atlas:analysis'));
  assert(empty.has('atlas:functional-analysis'));
  assert(!empty.has('atlas:calculus'));
  assert.deepEqual([...frameworkFilterIds(atlas, '70')], []);});

test('objectStructure summarizes scale, parents, declarations, M relations and evidence', () => {
  const library = loadContentLibrary();
  const data = dataFor(library.objects);
  const before = JSON.stringify(data);
  const structure = objectStructure(data, 'obj:tdg:gradient', { primaryParentId: 'obj:tdg:topic-exterior-calculus' });
  assert(structure);
  assert.equal(structure.scale, 'unit');
  assert.equal(structure.scaleIndex, 2);
  assert.equal(structure.parents.length, 2);
  assert.equal(structure.parents[0].id, 'obj:tdg:topic-exterior-calculus');
  assert(structure.parents[0].primary);
  assert.equal(structure.declarations.total, 1);
  assert.equal(structure.declarations.kinds.formula, 1);
  assert.equal(structure.declarations.status.DEF, 1);
  assert(structure.relations.total > 0);
  assert.equal(structure.relations.ids.length, structure.relations.total);
  assert.equal(Object.values(structure.relations.byKind).reduce((sum, count) => sum + count, 0), structure.relations.total);
  assert(structure.relations.from > 0);
  assert(structure.relations.to > 0);
  assert(structure.relations.premise > 0);
  assert.equal(Object.values(structure.evidence).reduce((sum, count) => sum + count, 0), structure.relations.total);
  assert.equal(JSON.stringify(data), before, 'objectStructure must not mutate public data');
  assert.equal(objectStructure(data, 'obj:missing'), null);
});

test('classificationSummary counts scales, M relation kinds, declarations and evidence', () => {
  const data = dataFor(loadContentLibrary().objects);
  const summary = classificationSummary(data);
  assert.equal(summary.objects, data.objects.length);
  assert.equal(summary.relations, data.relations.length);
  assert.equal(summary.scales.reduce((sum, scale) => sum + scale.count, 0), data.objects.length);
  assert.equal(Object.values(summary.relationKinds).reduce((sum, count) => sum + count, 0), data.relations.length);
  assert.equal(Object.values(summary.declarationKinds).reduce((sum, count) => sum + count, 0), data.objects.flatMap(object => object.declarations).length);
  assert.equal(Object.values(summary.declarationStatus).reduce((sum, count) => sum + count, 0), data.objects.flatMap(object => object.declarations).length);
  assert.equal(Object.values(summary.relationEvidence).reduce((sum, count) => sum + count, 0), data.relations.length);
  assert.equal(summary.scales.find(scale => scale.id === 'subdiscipline').count, 4);
});
