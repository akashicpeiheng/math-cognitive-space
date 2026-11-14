import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mcsPresentation, MCS_TOPICS } from '../shared/mcs-presentation.mjs';
import { loadContentLibrary } from '../core/content-library.mjs';
import {
  MCS_STORAGE_KEY, MCS_LOD, mcsOverviewCamera, setMcsLevel, displayedMcsRelations, defaultMcsState, createMcsLayout, positionedMcsLayout,
  filterMcsObjects, visibleMcsBoxes, updateMcsLod, normalizeMcsState,
  encodeMcsState, decodeMcsState, projectMcsRelations, assignMcsRelationLanes, resizeMcsCamera,
} from '../shared/mcs-space.mjs';

const scales = ['atom', 'molecule', 'unit', 'topic', 'subdiscipline'];
const declaration = (id, status = 'DEF', source = id) => ({
  id, status, source, kind: 'formula', type: 'o', constructionCount: 1, formalHash: `hash:${id}`,
});
const object = (id, scale, declarations = [], members = []) => ({
  id, version: '1', title: `标题 ${id}`, scale, formalHash: `object:${id}`,
  declarations, members: members.map(id => ({ id })), references: [], imports: [],
});
const dataFor = objects => ({
  schema: 'mcs-view/1', objectVersion: 'version:1', contentLocale: 'zh',
  levels: scales.map(id => ({ id })), objects, relations: [],
  groups: [{ id: 'all', title: { zh: '全部', en: 'All' }, objectIds: objects.map(o => o.id) }],
});
function ref(data, id, anchor = '$') {
  const owner = data.objects.find(o => o.id === id);
  const target = anchor === '$' ? owner : owner.declarations.find(d => d.id === anchor);
  return { id, version: owner.version, anchor, formalHash: target.formalHash };
}
function fixture() {
  const data = dataFor([
    object('a', 'atom', [declaration('p', 'PROOF', 'P a')]),
    object('b', 'molecule', [declaration('q', 'DEF', 'Q b')]),
    object('c', 'molecule', [declaration('r', 'REF', 'R c')]),
    object('u-a', 'unit', [declaration('self-def'), declaration('self-proof', 'PROOF')], ['a', 'b']),
    object('u-b', 'unit', [declaration('other', 'REF')], ['a']),
    object('t-a', 'topic', [], ['u-a']), object('t-b', 'topic', [], ['u-b']),
    object('s', 'subdiscipline', [], ['t-a']),
    // A deliberately cross-level secondary membership in this synthetic view.
    object('z-cross', 'topic', [], ['a']),
  ]);
  for (const owner of data.objects) owner.members = owner.members.map(r => ref(data, r.id));
  data.objects.find(o => o.id === 'u-a').references = [ref(data, 'c', 'r')];
  data.objects.find(o => o.id === 'u-b').imports = [ref(data, 'u-a')];
  data.groups.push({ id: 'pair', title: { zh: '两端', en: 'Endpoints' }, objectIds: ['a', 'c'] });
  const relation = (id, kind, from, to, premises = [], status = 'PROOF') => ({
    id, kind, from, to, premises, layer: 'M', evidence: { status, source: 'synthetic test' },
  });
  const a = ref(data, 'a', 'p'), b = ref(data, 'b', 'q'), c = ref(data, 'c', 'r');
  data.relations = [
    relation('r1', 'deduction', a, c, [a, b]),
    relation('r2', 'deduction', a, c, [b, a]),
    relation('r3', 'deduction', a, c, [a]),
    relation('r4', 'application', b, c, [], 'DEF'),
    relation('r5', 'scaling', ref(data, 'u-a'), ref(data, 'c'), [], 'REF'),
    { ...relation('L', 'analogy', a, c), layer: 'L' },
  ];
  return data;
}
function freeze(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
}
const center = box => ({ x: box.x + box.w / 2, y: box.y + box.h / 2 });
const ids = boxes => boxes.map(box => box.id);
function openAll(data) {
  const state = defaultMcsState(data);
  state.expanded = data.objects.map(o => o.id).sort();
  return state;
}
function rootBounds(layout) {
  const roots = layout.roots.map(id => layout.boxes[id]);
  return {
    x: Math.min(...roots.map(b => b.x)), y: Math.min(...roots.map(b => b.y)),
    w: Math.max(...roots.map(b => b.x + b.w)) - Math.min(...roots.map(b => b.x)),
    h: Math.max(...roots.map(b => b.y + b.h)) - Math.min(...roots.map(b => b.y)),
  };
}
function checkEnclosure(layout) {
  for (const box of Object.values(layout.boxes)) {
    assert([box.x, box.y, box.w, box.h].every(Number.isFinite), box.id);
    assert(box.w >= (box.kind === 'object' ? 320 : 300));
    assert(box.h >= (box.kind === 'object' ? 180 : 130));
    if (box.parent) {
      const parent = layout.boxes[box.parent];
      assert(box.x >= parent.x + 28 && box.x + box.w <= parent.x + parent.w - 28, box.id);
      assert(box.y >= parent.y + 84 && box.y + box.h <= parent.y + parent.h - 28, box.id);
      assert.equal(box.depth, parent.depth + 1);
    }
  }
  const roots = layout.roots.map(id => layout.boxes[id]);
  for (let i = 0; i < roots.length; i++) for (let j = i + 1; j < roots.length; j++) {
    const a = roots[i], b = roots[j];
    assert(a.x + a.w + 96 <= b.x || b.x + b.w + 96 <= a.x ||
      a.y + a.h + 96 <= b.y || b.y + b.h + 96 <= a.y, `${a.id} overlaps ${b.id}`);
  }
}
function realData() {
  const library = loadContentLibrary();
  const objects = structuredClone(library.objects);
  return {
    ...dataFor(objects), objectVersion: library.objectVersion, levels: library.scale.levels,
    relations: structuredClone(library.relations.filter(r => r.layer === 'M')),
    groups: [
      { id: 'all', title: { zh: '全部', en: 'All' }, objectIds: objects.map(o => o.id) },
      { id: 'group', title: { zh: '群论', en: 'Group' }, objectIds: objects.filter(o => o.id.startsWith('obj:group:')).map(o => o.id) },
    ],
  };
}

test('exports and defaults are independent, deterministic values', () => {
  assert.equal(MCS_STORAGE_KEY, 'mcs-view-state-v2');
  assert.deepEqual(MCS_LOD, { enter: [.8, 1.8, 3.6], leave: [.6, 1.4, 2.8] });
  const data = fixture(), first = defaultMcsState(data), second = defaultMcsState(data);
  assert.deepEqual(first, second);
  first.expanded.push('a'); first.filters.groups.push('pair'); first.positions.a = { x: 2, y: 3 };
  assert.deepEqual(second.expanded, ['s']); assert.deepEqual(second.filters.groups, []);
  assert.deepEqual(second.positions, {});
});

test('primary ownership is stable, cross-level secondary entrances do not duplicate objects', () => {
  const data = freeze(fixture()), layout = createMcsLayout(data);
  assert.equal(layout.parents.a, 'u-a');
  assert.equal(layout.boxes.a.depth, 3);
  assert.equal(Object.values(layout.boxes).filter(b => b.kind === 'object' && b.objectId === 'a').length, 1);
  for (const id of ['u-b', 'z-cross']) {
    const entry = layout.children[id].map(key => layout.boxes[key]).find(b => b.kind === 'reference');
    assert.equal(entry.target, 'a'); assert.equal(entry.parent, id);
  }
  assert(layout.children['u-a'].includes('u-a#self-def'));
  assert(layout.children['u-a'].includes('u-a#self-proof'));
  assert(layout.children['u-a'].includes('a')); assert(layout.children['u-a'].includes('b'));
  assert(!layout.children['u-a'].some(id => layout.boxes[id].kind === 'reference'));
  checkEnclosure(layout);
  const reordered = structuredClone(data);
  reordered.objects.reverse();
  for (const o of reordered.objects) { o.members.reverse(); o.declarations.reverse(); }
  assert.deepEqual(createMcsLayout(reordered), layout);
});

test('ordinary references/imports never consume member slots or enlarge a single-declaration unit', () => {
  const data = fixture();
  const unit = object('single', 'unit', [declaration('definition')]);
  data.objects.push(unit);
  const baseline = createMcsLayout(data).boxes.single;
  unit.references = data.objects.filter(o => o !== unit).flatMap(o => [ref(data, o.id), ...o.declarations.map(d => ref(data, o.id, d.id))]);
  unit.imports = [ref(data, 'u-a'), ref(data, 'u-b')];
  const layout = createMcsLayout(data);
  assert.equal(layout.boxes.single.w, 356); assert.equal(layout.boxes.single.h, 242);
  assert.equal(layout.boxes.single.w, baseline.w); assert.equal(layout.boxes.single.h, baseline.h);
  assert.deepEqual(layout.children.single, ['single#definition']);
});

test('real M data: all objects, declarations, nesting, compact root aspect and colliding network centres', t => {
  const data = freeze(realData());
  assert.equal(data.objects.length, loadContentLibrary().objects.length);
  assert.equal(data.groups.find(g => g.id === 'group').objectIds.length, 8);
  const centers = Object.fromEntries(data.objects.map(o => [o.id, { x: 0, y: 0 }]));
  for (const [name, layout] of [['default', createMcsLayout(data)], ['coincident network centres', createMcsLayout(data, centers)]]) {
    checkEnclosure(layout);
    assert.equal(Object.values(layout.boxes).filter(b => b.kind === 'object').length, data.objects.length);
    assert.equal(Object.values(layout.boxes).filter(b => b.kind === 'declaration').length,
      data.objects.reduce((n, o) => n + o.declarations.length, 0));
    const bounds = rootBounds(layout), aspect = Math.max(bounds.w / bounds.h, bounds.h / bounds.w);
    t.diagnostic(`${name}: ${bounds.w} x ${bounds.h}; aspect=${aspect.toFixed(3)}`);
    assert(aspect < 3, `${name} degenerates into a strip: ${aspect}`);
    assert.deepEqual(createMcsLayout(data, name === 'default' ? undefined : centers), layout);
  }
  const layout = createMcsLayout(data);
  const state = openAll(data);
  const filtered = filterMcsObjects(data, state.filters);
  assert.equal(filtered.matched.size, data.objects.length);
  const visible = visibleMcsBoxes(data, layout, state, filtered);
  assert.equal(visible.length, Object.keys(layout.boxes).length);
  const projected = projectMcsRelations(data, layout, state, visible, filtered.matched);
  assert(projected.edges.length > 0);
  const visibleIds = new Set(ids(visible));
  for (const edge of projected.edges) {
    assert(visibleIds.has(edge.from) && visibleIds.has(edge.to));
    assert(edge.premises.every(id => visibleIds.has(id)));
    assert.equal(edge.missingPremises, 0);
    assert(edge.relationIds.every(id => data.relations.some(r => r.id === id)));
  }
});

test('group atoms, molecules and declarations remain reachable at the global expression level', () => {
  const data = realData(), layout = createMcsLayout(data);
  const state = setMcsLevel(data, defaultMcsState(data), 3);
  state.filters.groups = ['group'];
  const visible = ids(visibleMcsBoxes(data, layout, state));
  for (const id of ['obj:group:mul','obj:group:left-mul','obj:group:injective#claim']) assert(visible.includes(id));
});

test('filters AND dimensions, OR values, title/id/source queries and registered evidence', () => {
  const data = fixture(), defaults = defaultMcsState(data).filters;
  const evidence = filterMcsObjects(data, { ...defaults, evidence: ['PROOF'] });
  assert.deepEqual([...evidence.matched], ['a', 'b', 'c', 'u-a']);
  assert(!evidence.matched.has('u-b')); assert(evidence.context.has('u-b'));
  assert(evidence.context.has('t-b')); assert(evidence.context.has('z-cross'));
  assert(evidence.context.has('s')); assert(!evidence.context.has('a'));
  const intersection = filterMcsObjects(data, { ...defaults, groups: ['pair'], scales: ['atom', 'unit'], evidence: ['PROOF', 'DEF'] });
  assert.deepEqual([...intersection.matched], ['a']);
  assert.deepEqual([...filterMcsObjects(data, { ...defaults, groups: ['all', 'missing'] }).matched],
    [...filterMcsObjects(data, defaults).matched]);
  assert.deepEqual([...filterMcsObjects(data, { ...defaults, query: 'p A' }).matched], ['a']);
  assert.deepEqual([...filterMcsObjects(data, { ...defaults, query: 'u-b' }).matched], ['u-b']);
  assert.deepEqual([...filterMcsObjects(data, { ...defaults, query: '标题 c' }).matched], ['c']);
  assert.equal(filterMcsObjects(data, { ...defaults, groups: ['missing'] }).matched.size, 0);
  assert.deepEqual(filterMcsObjects(data, { ...defaults, relations: ['deduction'] }), filterMcsObjects(data, defaults));
});

test('counts propagate unique descendant matches through closed parents', () => {
  const data = fixture(), filters = defaultMcsState(data).filters;
  const all = filterMcsObjects(data, filters);
  assert.deepEqual(all.counts['u-a'], { matched: 4, total: 4 });
  assert.deepEqual(all.counts['u-b'], { matched: 2, total: 2 });
  assert.deepEqual(all.counts.s, { matched: 4, total: 4 });
  const result = filterMcsObjects(data, { ...filters, evidence: ['DEF'] });
  assert.deepEqual([...result.matched], ['b', 'c', 'u-a']);
  assert.deepEqual(result.counts['u-a'], { matched: 3, total: 4 });
  assert.deepEqual(result.counts['u-b'], { matched: 0, total: 2 });
  assert.deepEqual(result.counts.a, { matched: 0, total: 1 });
  assert.deepEqual(result.counts.b, { matched: 1, total: 1 });
  assert.deepEqual(result.counts.s, { matched: 2, total: 4 });
});

test('evidence includes exact registered M relation participants without rewriting declaration labels', () => {
  const data = fixture(), filters = { ...defaultMcsState(data).filters, evidence: ['PROOF'] };
  const before = JSON.stringify(data);
  const matched = filterMcsObjects(data, filters).matched;
  assert(matched.has('b'), 'an AND premise with a DEF declaration belongs to a PROOF relation');
  assert(matched.has('c'), 'a REF declaration may be the conclusion of a PROOF relation');
  assert(!matched.has('u-b'), 'unrelated REF object is not promoted to PROOF');
  assert.deepEqual(filterMcsObjects(data, { ...filters, relations: ['duality'] }).matched, matched, 'relation kind never hides objects');
  data.relations.push({ ...data.relations[0], id: 'invalid-pin', to: { ...ref(data, 'u-b'), formalHash: 'wrong' } });
  assert(!filterMcsObjects(data, filters).matched.has('u-b'));
  data.relations.pop();
  assert.equal(JSON.stringify(data), before, 'registered evidence is not mutated');
});

test('shared camera adapts to another canvas size while keeping its world centre', () => {
  const camera = { x: -230, y: 46, scale: .8 }, before = { width: 1200, height: 700 }, after = { width: 390, height: 320 };
  const resized = resizeMcsCamera(camera, before, after, true);
  assert.equal(resized.scale, .26);
  assert(Math.abs((after.width / 2 - resized.x) / resized.scale - (before.width / 2 - camera.x) / camera.scale) < 1e-8);
  assert(Math.abs((after.height / 2 - resized.y) / resized.scale - (before.height / 2 - camera.y) / camera.scale) < 1e-8);
  assert.equal(resizeMcsCamera(camera, before, after).scale, camera.scale, 'ordinary sidebar resizing keeps the current zoom');
  const data = fixture(), state = { ...defaultMcsState(data), camera, viewport: before };
  assert.deepEqual(decodeMcsState(encodeMcsState(state), data).state, state);
});

test('extreme shared coordinates are bounded and unsupported schemas do not restore', () => {
  const data = fixture(), base = defaultMcsState(data);
  const restored = normalizeMcsState({ ...base, camera: { x: 1e308, y: -1e308, scale: 1e-300 }, positions: { a: { x: 1e308, y: -1e308 } }, viewport: { width: -1, height: 4 } }, data);
  assert.deepEqual(restored.state.camera, { x: 1e8, y: -1e8, scale: .015 });
  assert.deepEqual(restored.state.positions.a, { x: 1e6, y: -1e6 });
  assert.equal(restored.state.viewport, undefined);
  assert(restored.issues.length >= 6);
  assert.deepEqual(normalizeMcsState({ ...base, schema: 'future', selected: 'a' }, data).state, base);
});

test('relation inspection survives sharing and drops only stale relation IDs', () => {
  const data = fixture(), state = { ...defaultMcsState(data), relationIds: ['r1', 'r2'] };
  assert.deepEqual(decodeMcsState(encodeMcsState(state), data), { state, issues: [] });
  const next = { ...data, objectVersion: 'next', relations: data.relations.filter(r => r.id !== 'r2') };
  const restored = normalizeMcsState(state, next);
  assert.deepEqual(restored.state.relationIds, ['r1']);
  assert(restored.issues.some(issue => issue.startsWith('relationIds')));
  assert.deepEqual(normalizeMcsState({ ...state, selected: 'a' }, data).state.relationIds, []);
});

test('visibility keeps expanded regions, hides closed descendants, and opens atom/molecule declarations', () => {
  const data = fixture(), layout = createMcsLayout(data), state = openAll(data);
  const all = ids(visibleMcsBoxes(data, layout, state));
  for (const id of ['s', 't-a', 'u-a', 'a', 'a#p', 'b#q', 'u-a#self-def']) assert(all.includes(id));
  state.manual['t-a'] = 'closed';
  const closed = ids(visibleMcsBoxes(data, layout, state));
  assert(closed.includes('t-a')); assert(!closed.includes('u-a')); assert(!closed.includes('a#p'));
  state.manual['t-a'] = 'open'; state.filters.groups = ['pair'];
  const pair = visibleMcsBoxes(data, layout, state);
  assert(ids(pair).includes('a#p')); assert(!ids(pair).includes('b')); assert(!ids(pair).includes('u-a#self-def'));
  assert(pair.some(b => b.kind === 'reference' && b.parent === 'u-b' && b.target === 'a'));
  state.filters.query = 'R c';
  assert(visibleMcsBoxes(data, layout, state).every(b => b.objectId === 'c'));
});

test('global LOD crosses levels synchronously, ignores focus, respects hysteresis and fixed levels', () => {
  const data = fixture(), layout = createMcsLayout(data), state = defaultMcsState(data);
  const baseline = mcsOverviewCamera(data, layout).scale;
  const at = (ratio, previous = state) => ({ ...previous, camera: { ...previous.camera, scale: baseline * ratio } });
  const first = updateMcsLod(data, layout, at(1.81), { x: 0, y: 0 });
  assert.equal(first.level, 2); assert(first.expanded.includes('t-a')); assert(first.expanded.includes('t-b'));
  assert.deepEqual(first, updateMcsLod(data, layout, at(1.81), { x: 1e8, y: -1e8 }));
  assert.equal(updateMcsLod(data, layout, at(1.5, first)).level, 2);
  assert.equal(updateMcsLod(data, layout, at(1.39, first)).level, 1);
  assert.equal(updateMcsLod(data, layout, at(4)).level, 3);
  assert.equal(updateMcsLod(data, layout, at(.4, first)).level, 0);
  const fixed = setMcsLevel(data, state, 2);
  assert.equal(updateMcsLod(data, layout, at(.1, fixed)).level, 2);
});

test('local drag offsets inherit recursively; expanded enclosures never feed back into the baseline', () => {
  const data = fixture(), layout = freeze(createMcsLayout(data)), before = JSON.stringify(layout);
  const positions = freeze({ s: { x: 100, y: -50 }, 'u-a': { x: -900, y: -500 }, a: { x: 30, y: 40 }, 'a#p': { x: -1500, y: -900 } });
  const moved = positionedMcsLayout(layout, positions);
  assert.equal(moved.boxes['a#p'].x, layout.boxes['a#p'].x + 100 - 900 + 30 - 1500);
  assert.equal(moved.boxes['a#p'].y, layout.boxes['a#p'].y - 50 - 500 + 40 - 900);
  assert.equal(moved.boxes.b.x, layout.boxes.b.x + 100 - 900);
  assert.equal(moved.boxes.c.x, layout.boxes.c.x);
  assert(moved.boxes.s.w > layout.boxes.s.w);
  // Dynamic enclosure is allowed to overlap other roots after a user drag.
  for (const box of Object.values(moved.boxes)) if (box.parent) {
    const parent = moved.boxes[box.parent];
    assert(box.x >= parent.x + 28 && box.y >= parent.y + 84);
    assert(box.x + box.w <= parent.x + parent.w - 28);
    assert(box.y + box.h <= parent.y + parent.h - 28);
  }
  assert.equal(JSON.stringify(layout), before);
  assert.deepEqual(positionedMcsLayout(layout, positions), moved);
});

test('dragging cannot change the global zoom baseline or open objects under a pointer', () => {
  const data = fixture(), layout = createMcsLayout(data), state = defaultMcsState(data);
  state.camera.scale = mcsOverviewCamera(data, layout).scale * 2;
  const moved = { ...state, positions: { s: { x: 1e5, y: 1e5 } } };
  assert.equal(updateMcsLod(data, layout, state).level, updateMcsLod(data, layout, moved).level);
});

test('normalization validates finite coordinates/controlled filters and retains valid state after a version change', () => {
  const data = fixture(), state = defaultMcsState(data);
  const raw = {
    ...state, objectVersion: 'old',
    filters: { groups: ['pair', 'missing', 'pair'], scales: ['atom', 'node', 7], relations: ['deduction', 'unknown'], evidence: ['PROOF', 'FAKE'], query: '中文 P' },
    camera: { x: Infinity, y: -12, scale: 0 },
    expanded: ['a', 'a#p', 'gone', 'a'], manual: { a: 'open', b: 'bad', gone: 'closed', 'a#p': 'open' },
    selected: 'a#removed', positions: { a: { x: 5, y: -8 }, 'a#p': { x: 0, y: 20 }, b: { x: NaN, y: 2 }, gone: { x: 1, y: 1 } },
  };
  const normalized = normalizeMcsState(freeze(raw), data);
  assert(normalized.issues.some(issue => issue.includes('objectVersion')));
  assert.equal(normalized.state.objectVersion, data.objectVersion);
  assert.deepEqual(normalized.state.filters, { groups: ['pair'], scales: ['atom'], relations: ['deduction'], evidence: ['PROOF'], query: '中文 P' });
  assert.deepEqual(normalized.state.camera, { x: 0, y: -12, scale: 1 });
  assert.deepEqual(normalized.state.expanded, ['s']); assert.deepEqual(normalized.state.manual, {});
  assert.equal(normalized.state.selected, null);
  assert.deepEqual(normalized.state.positions, { a: { x: 5, y: -8 }, 'a#p': { x: 0, y: 20 } });
  assert.deepEqual(normalizeMcsState(normalized.state, data), { state: normalized.state, issues: [] });
  for (const malformed of [undefined, null, false, 0, 'state', [], {}, { camera: [], positions: [], expanded: {} }]) {
    assert.doesNotThrow(() => normalizeMcsState(malformed, data));
    assert(normalizeMcsState(malformed, data).issues.length > 0);
  }
});

test('legacy expansion choices migrate into one global level and reset old placement', () => {
 const data=fixture(), base=defaultMcsState(data);
 const migrated=normalizeMcsState({...base,schema:'mcs-view-state/1',expanded:['s','t-a'],manual:{'u-a':'open'},selected:'a',positions:{a:{x:40,y:30}}},data);
 assert.equal(migrated.state.level,3); assert.equal(migrated.state.selected,'a');
 assert.deepEqual(migrated.state.positions,{}); assert.deepEqual(migrated.state.manual,{});
 assert(migrated.issues.some(i=>i.startsWith('migration:')));
});

test('share roundtrip supports declaration/reference keys, unicode, old versions and rejects malformed hashes', () => {
  const data = fixture(), layout = createMcsLayout(data), state = defaultMcsState(data);
  const entrance = Object.values(layout.boxes).find(b => b.kind === 'reference').id;
  state.filters.query = '中文 ∀ x #mcs=% &'; state.filters.groups = ['pair']; state.camera = { x: -23, y: 456, scale: 0.37 };
  state.selected = 'a#p';
  state.positions = { 'a#p': { x: 3, y: -8 }, [entrance]: { x: 7, y: 1 } };
  const hash = encodeMcsState(freeze(state));
  assert(hash.startsWith('#mcs=%7B'));
  assert.deepEqual(decodeMcsState(hash, data), { state, issues: [] });
  const updated = { ...data, objectVersion: 'version:2' };
  const restored = decodeMcsState(hash, updated);
  assert(restored.issues.some(issue => issue.includes('objectVersion')));
  assert.equal(restored.state.selected, 'a#p'); assert.equal(restored.state.objectVersion, 'version:2');
  for (const bad of ['', '#other=', '#mcs=', '#mcs=%', '#mcs=%E0%A4%A', '#mcs=null', '#mcs=[]', '#mcs=%7B', '#mcs=%7B%22schema%22%3A%22other%22%7D']) {
    assert.equal(decodeMcsState(bad, data), null, bad);
  }
});

test('relations project exact visible objects/declarations, aggregate IDs, and preserve distinct AND groups', () => {
  const data = freeze(fixture()), layout = freeze(createMcsLayout(data)), state = freeze(openAll(data));
  const filter = filterMcsObjects(data, state.filters), visible = visibleMcsBoxes(data, layout, state);
  const result = projectMcsRelations(data, layout, state, visible, filter.matched);
  const pair = result.edges.find(edge => edge.relationIds.includes('r1'));
  assert.deepEqual(pair.relationIds, ['r1', 'r2']); assert.equal(pair.aggregate, true);
  assert.equal(pair.from, 'a#p'); assert.equal(pair.to, 'c#r');
  assert.deepEqual(pair.premises, ['a#p', 'b#q']); assert.equal(pair.missingPremises, 0);
  const alternative = result.edges.find(edge => edge.relationIds.includes('r3'));
  assert.notEqual(alternative.id, pair.id); assert.deepEqual(alternative.premises, ['a#p']);
  assert.equal(result.edges.find(edge => edge.relationIds.includes('r5')).from, 'u-a');
  assert(!result.edges.some(edge => edge.relationIds.includes('L')));
  assert(result.structure.some(edge => edge.kind === 'import' && edge.from === 'u-b' && edge.to === 'u-a'));
  // Explicit references are structure lines only, from the actual owner.
  assert(result.structure.some(edge => edge.kind === 'reference' && edge.from === 'u-a' && edge.to === 'c#r'));
  assert(result.structure.some(edge => layout.boxes[edge.from]?.kind === 'reference' && edge.to === 'a'));
  assert.equal(JSON.stringify(data), JSON.stringify(fixture()));
});

test('overlapping relation paths receive distinct rendering lanes', () => {
  const edges = [
    { id: 'z', kind: 'deduction', from: 'a', to: 'b' },
    { id: 'a', kind: 'deduction', from: 'a', to: 'b' },
    { id: 'c', kind: 'deduction', from: 'b', to: 'a' },
  ];
  const lanes = assignMcsRelationLanes(edges);
  assert.deepEqual(lanes.get('a'), { index: 0, count: 2 });
  assert.deepEqual(lanes.get('z'), { index: 1, count: 2 });
  assert.deepEqual(lanes.get('c'), { index: 0, count: 1 });
});

test('collapsed projections use visible boxes for AND junctions and relation/evidence filters affect edges only', () => {
  const data = fixture(), layout = createMcsLayout(data), state = defaultMcsState(data);
  state.expanded = ['s', 't-a', 't-b'];
  const matched = filterMcsObjects(data, state.filters).matched;
  const visible = visibleMcsBoxes(data, layout, state);
  const projected = projectMcsRelations(data, layout, state, visible, matched);
  const edge = projected.edges.find(e => e.relationIds.includes('r1'));
  assert.equal(edge.from, 'u-a'); assert.equal(edge.to, 'c');
  assert.deepEqual(edge.premises, ['u-a']); assert.equal(edge.missingPremises, 0); assert.equal(edge.aggregate, true);
  const filtered = { ...state, filters: { ...state.filters, relations: ['deduction'], evidence: ['PROOF'] } };
  const result = projectMcsRelations(data, layout, filtered, visible, matched);
  assert(result.edges.every(e => e.kind === 'deduction'));
  assert.deepEqual(result.structure, projected.structure);
  const none = projectMcsRelations(data, layout, { ...filtered, filters: { ...filtered.filters, evidence: ['FINITE'] } }, visible, matched);
  assert.deepEqual(none.edges, []); assert.deepEqual(none.structure, projected.structure);
});

test('filtered/absent AND premises are counted, and an expanded visible parent cannot proxy a hidden object', () => {
  const data = fixture(), layout = createMcsLayout(data), state = openAll(data);
  state.filters.groups = ['pair'];
  const filter = filterMcsObjects(data, state.filters), visible = visibleMcsBoxes(data, layout, state, filter);
  const result = projectMcsRelations(data, layout, state, visible, filter.matched);
  const edge = result.edges.find(e => e.relationIds.includes('r1'));
  assert.deepEqual(edge.premises, ['a#p']); assert.equal(edge.missingPremises, 1);
  assert.deepEqual(data.relations.find(r => r.id === 'r1').premises.map(r => `${r.id}#${r.anchor}`), ['a#p', 'b#q']);
  const allState = openAll(data), all = visibleMcsBoxes(data, layout, allState);
  const hidden = all.filter(b => !['a', 'b'].includes(b.objectId));
  const output = projectMcsRelations(data, layout, allState, hidden, filterMcsObjects(data, allState.filters).matched);
  const missingSource = output.edges.find(e => e.relationIds.includes('r1'));
  assert.equal(missingSource.from, null, 'hidden source is never replaced by a context parent');
  assert.equal(missingSource.missingPremises, 2);
  assert(!output.edges.some(e => e.relationIds.includes('r4')), 'ordinary two-endpoint application is hidden');
  assert.equal(output.edges.find(e => e.relationIds.includes('r5')).from, 'u-a');
});

test('collapsed internal relations and a conclusion whose entire AND group is filtered remain traceable', () => {
  const data = fixture(), layout = createMcsLayout(data), state = setMcsLevel(data, defaultMcsState(data), 0);
  data.relations.push({ ...data.relations[0], id: 'internal', to: ref(data, 'b', 'q') });
  const closed = projectMcsRelations(data, layout, state, visibleMcsBoxes(data, layout, state), filterMcsObjects(data, state.filters).matched);
  const internal = closed.edges.find(e => e.relationIds.includes('internal'));
  assert.equal(internal.from, 's'); assert.equal(internal.to, 's');
  assert.equal(internal.internal, true); assert.equal(internal.aggregate, true);
  state.filters.query = '标题 c';
  const filtered = filterMcsObjects(data, state.filters);
  const visible = visibleMcsBoxes(data, layout, state, filtered);
  const result = projectMcsRelations(data, layout, state, visible, filtered.matched);
  const edge = result.edges.find(e => e.relationIds.includes('r1'));
  assert.equal(edge.from, null); assert.equal(edge.to, 'c');
  assert.equal(edge.missingPremises, 2); assert.deepEqual(edge.premises, []);
  assert.deepEqual(edge.relationIds, ['r1', 'r2']);
});

test('invalid declaration pins cannot be replaced by guessed owner or ancestor references', () => {
  const data = fixture(), layout = createMcsLayout(data), state = openAll(data);
  data.relations.push({ ...data.relations[0], id: 'bad', from: { ...ref(data, 'a', 'p'), anchor: 'removed' } });
  const projected = projectMcsRelations(data, layout, state, visibleMcsBoxes(data, layout, state), filterMcsObjects(data, state.filters).matched);
  assert(!projected.edges.some(e => e.relationIds.includes('bad')));
});


test('registered topics cover all units; primary presentation and secondary entrances use the same identities', () => {
 const data=realData(); data.presentation=mcsPresentation(data.objects);
 const layout=createMcsLayout(data);
 const initial=visibleMcsBoxes(data,layout,defaultMcsState(data));
 if (!data.objects.some(object => object.id === 'obj:tdg:topic-local-change')) {
   assert.equal(Object.values(layout.boxes).filter(box => box.kind === 'object').length, data.objects.length);
   assert(initial.some(box => box.objectId === 'obj:tdg:derivative'));
   assert(filterMcsObjects(data, {...defaultMcsState(data).filters, query:'图卡'}).matched.has('obj:tdg:chart'));
   return;
 }
 assert.equal(initial.filter(b=>b.kind==='object'&&!defaultMcsState(data).expanded.includes(b.id)).length,9);
 assert.equal(layout.roots.length,4);
 assert.equal(layout.parents['obj:tdg:jacobian'],'obj:tdg:topic-local-change');
 assert.equal(layout.parents['obj:tdg:homeomorphism'],'obj:tdg:topic-spaces-continuity');
 const all=setMcsLevel(data,defaultMcsState(data),2);
 const boxes=visibleMcsBoxes(data,layout,all);
 assert.equal(boxes.filter(b=>b.kind==='object'&&b.objectId==='obj:tdg:jacobian').length,1);
 assert(boxes.some(b=>b.kind==='reference'&&b.parent==='obj:tdg:topic-coordinates-manifolds'&&b.target==='obj:tdg:jacobian'));
 const covered=new Set(MCS_TOPICS.flatMap(t=>data.objects.find(o=>o.id===t.id).members.map(r=>r.id)));
 for(const object of data.objects.filter(o=>o.id.startsWith('obj:tdg:')&&o.scale==='unit'))assert(covered.has(object.id));
 const query=filterMcsObjects(data,{...all.filters,query:'图卡'});
 assert(query.matched.has('obj:tdg:chart'));
 const folded=visibleMcsBoxes(data,layout,defaultMcsState(data),query);
 assert(!folded.some(b=>b.id==='obj:tdg:chart'));
 assert(query.counts['obj:tdg:topic-coordinates-manifolds'].matched>0);
});

test('link visibility filters drawing only and retains internal relationships and independent AND groups', () => {
 const data=fixture(),layout=createMcsLayout(data),state=setMcsLevel(data,defaultMcsState(data),2);
 const boxes=visibleMcsBoxes(data,layout,state),matched=filterMcsObjects(data,state.filters).matched;
 const full=projectMcsRelations(data,layout,state,boxes,matched);
 assert.equal(displayedMcsRelations(data,layout,state,full).edges.length,full.edges.filter(e=>!e.internal).length);
 assert.deepEqual(displayedMcsRelations(data,layout,state,full).emphasizedRelationIds,[]);
 const selected={...state,selected:'u-a'};
 const visible=displayedMcsRelations(data,layout,selected,full);
 assert(visible.edges.length>0);
 assert(visible.edges.some(e=>e.relationIds.includes('r1'))&&visible.edges.some(e=>e.relationIds.includes('r3')));
 assert(visible.emphasizedRelationIds.includes('r1')&&visible.emphasizedRelationIds.includes('r3'));
 const folded=setMcsLevel(data,state,1);
 assert.equal(displayedMcsRelations(data,layout,folded,full).edges.length,0);
 assert.equal(displayedMcsRelations(data,layout,{...selected,edgeMode:'none'},full).edges.length,0);
 assert.equal(displayedMcsRelations(data,layout,{...state,edgeMode:'all'},full).edges.length,full.edges.filter(e=>!e.internal).length);
});
