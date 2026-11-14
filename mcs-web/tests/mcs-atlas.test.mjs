import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadContentLibrary } from '../core/content-library.mjs';
import { mcsPresentation } from '../shared/mcs-presentation.mjs';
import { createMcsAtlas, atlasFitCamera, atlasZoomCamera, atlasRegionPath, atlasCrossingPoint } from '../shared/mcs-atlas.mjs';
import { atlasSpring, atlasCoast } from '../shared/mcs-atlas-motion.mjs';
import { MCS_CROSS_FIELDS } from '../shared/mcs-crossfields.mjs';
import { atlasFieldAffinity, MCS_ATLAS_AFFINITIES } from '../shared/mcs-atlas-affinity.mjs';

function dataFor(objects) { return { objects, presentation: mcsPresentation(objects) }; }
test('crossing navigation has unique field pairs, real entrances and primary-source links', () => {
  const atlas = createMcsAtlas(dataFor(loadContentLibrary().objects));
  const roots = new Set(atlas.root.children.map(n => n.id)), pairs = new Set(), ids = new Set();
  for (const crossing of MCS_CROSS_FIELDS) {
    assert(!ids.has(crossing.id)); ids.add(crossing.id);
    assert.equal(new Set(crossing.domains).size, 2);
    assert(crossing.domains.every(id => roots.has(id)));
    const key = [...crossing.domains].sort().join('|'); assert(!pairs.has(key)); pairs.add(key);
    assert(crossing.title.zh && crossing.title.en && crossing.description.zh && crossing.description.en);
    assert(crossing.sources.length && crossing.sources.every(url => new URL(url).protocol === 'https:'));
    assert(crossing.targetIds.every(id => atlas.byId[id] && !atlas.byId[id].objectId));
  }
});
function verifyLayout(atlas) {
  for (const node of atlas.nodes) {
    assert([node.x, node.y, node.w, node.h].every(Number.isFinite));
    assert(node.w > 0 && node.h > 0, node.id);
    if (node.parentId) {
      const parent = atlas.byId[node.parentId];
      assert(node.x >= parent.x && node.y >= parent.y);
      assert(node.x + node.w <= parent.x + parent.w + 1e-8);
      assert(node.y + node.h <= parent.y + parent.h + 1e-8);
      assert.equal(node.depth, parent.depth + 1);
    }
    if (node.depth > 0 && node.children.length) {
      assert(node.children.reduce((area, n) => area + n.w * n.h, 0) < node.w * node.h * .49,
        `${node.id}: sparse children must not claim the entire field`);
      for (const child of node.children) assert(child.w < node.w * .4 && child.h < node.h * .4, `${child.id}: a child stays a local landmark`);
    }
  }
}

test('real atlas covers every formal object once without mutating public content', () => {
  const data = dataFor(loadContentLibrary().objects), before = JSON.stringify(data);
  const atlas = createMcsAtlas(data);
  assert.equal(atlas.root.children.length, 8);
  assert.deepEqual(atlas.nodes.filter(node => node.objectId).map(node => node.objectId).sort(), data.objects.map(o => o.id).sort());
  assert.equal(JSON.stringify(data), before);
  verifyLayout(atlas);
  for (const node of atlas.nodes) {
    assert(atlasRegionPath(node).includes(' C '), 'fields have smooth contours');
    assert(!/NaN|Infinity/.test(atlasRegionPath(node)));
  }
  const jacobian = atlas.nodes.find(n => n.objectId === 'obj:tdg:jacobian') ?? atlas.nodes.find(n => n.objectId === 'obj:tdg:derivative');
  if (data.objects.some(o => o.id === 'obj:tdg:topic-local-change')) {
    assert.equal(atlas.byId[jacobian.parentId].objectId, 'obj:tdg:topic-local-change');
  } else {
    assert.equal(jacobian.parentId, 'atlas:legacy-local-change');
  }
  const reversed = structuredClone(data); reversed.objects.reverse();
  reversed.objects.forEach(o => o.members.reverse());
  assert.deepEqual(createMcsAtlas(reversed), atlas);
});

test('legacy library without formal topic containers uses curated navigation without changing membership', () => {
  const objects = loadContentLibrary().objects.filter(object =>
    !object.id.startsWith('obj:tdg:topic-') && !object.id.startsWith('obj:tdg:subdiscipline-'));
  const data = dataFor(objects), before = JSON.stringify(data), atlas = createMcsAtlas(data);
  assert.equal(atlas.root.children.length, 8);
  assert.deepEqual(atlas.nodes.filter(node => node.objectId).map(node => node.objectId).sort(), objects.map(o => o.id).sort());
  const jacobian = atlas.nodes.find(node => node.objectId === 'obj:tdg:derivative');
  assert.equal(jacobian.parentId, 'atlas:legacy-local-change');
  assert.equal(atlas.byId[jacobian.parentId].parentId, 'atlas:calculus');
  assert.equal(JSON.stringify(data), before);
  verifyLayout(atlas);
});

test('empty areas are navigation, while unknown formal identities remain reachable', () => {
  const empty = createMcsAtlas(dataFor([]));
  assert.equal(empty.root.children.length, 8);
  assert.equal(empty.nodes.filter(n => n.objectId).length, 0);
  verifyLayout(empty);
  const a = { id: 'unknown:a', title: '微分几何', version: '1', formalHash: 'a', members: [] };
  const atlas = createMcsAtlas(dataFor([a]));
  const formal = atlas.nodes.find(n => n.objectId === a.id);
  assert.equal(formal.parentId, 'atlas:collected', 'title similarity does not assign a mathematical identity');
  verifyLayout(atlas);
});

test('stale member pins cannot silently establish atlas ownership', () => {
  const child = { id: 'child', title: 'child', version: '2', formalHash: 'new', members: [] };
  const parent = { id: 'parent', title: 'parent', version: '1', formalHash: 'p', members: [{ id: 'child', version: '1', formalHash: 'old', anchor: '$' }] };
  const atlas = createMcsAtlas(dataFor([parent, child]));
  assert.equal(atlas.nodes.find(n => n.objectId === child.id).parentId, 'atlas:collected');
  assert.equal(atlas.nodes.find(n => n.objectId === parent.id).children.length, 0);
});

test('fitting any branch and anchored zoom preserve the intended map location', () => {
  const atlas = createMcsAtlas(dataFor(loadContentLibrary().objects));
  for (const size of [{ width: 1440, height: 840 }, { width: 390, height: 560 }]) {
    for (const node of atlas.nodes) {
      const camera = atlasFitCamera(node, size);
      assert(Math.abs((node.x + node.w / 2) * camera.scale + camera.x - size.width / 2) < 1e-7);
      assert(Math.abs((node.y + node.h / 2) * camera.scale + camera.y - size.height / 2) < 1e-7);
      assert(node.w * camera.scale <= size.width && node.h * camera.scale <= size.height);
    }
    const camera = atlasFitCamera(atlas.root, size), point = { x: size.width * .3, y: size.height * .7 };
    const zoom = atlasZoomCamera(camera, 3, point, size);
    assert(Math.abs((point.x - zoom.x) / zoom.scale - (point.x - camera.x) / camera.scale) < 1e-7);
    assert(Math.abs((point.y - zoom.y) / zoom.scale - (point.y - camera.y) / camera.scale) < 1e-7);
  }
});

test('portrait reorientation preserves the complete tree and fills a tall phone viewport', () => {
  const data = dataFor(loadContentLibrary().objects);
  const landscape = createMcsAtlas(data), portrait = createMcsAtlas(data, true);
  assert.deepEqual(portrait.nodes.map(n => n.id), landscape.nodes.map(n => n.id));
  assert.equal(portrait.root.w, 1000); assert.equal(portrait.root.h, 1600);
  for (const node of portrait.nodes) {
    const original = landscape.byId[node.id];
    assert.deepEqual({ ...node, children: node.children.map(c => c.id) }, {
      ...original, children: original.children.map(c => c.id),
      x: original.y, y: original.x, w: original.h, h: original.w,
    });
  }
  verifyLayout(portrait);
  const size = { width: 390, height: 624 }, padding = 12;
  const camera = atlasFitCamera(portrait.root, size, padding);
  const landscapeCamera = atlasFitCamera(landscape.root, size, padding);
  const fraction = atlas => {
    const fit = atlasFitCamera(atlas.root, size, padding);
    return atlas.root.children.reduce((sum, n) => sum + n.w * n.h, 0) * fit.scale ** 2 / (size.width * size.height);
  };
  assert(fraction(portrait) > .84, 'portrait territories occupy most of the phone viewport');
  assert(fraction(portrait) > fraction(landscape) * 2, 'portrait map uses tall screen space');
  assert(camera.scale > landscapeCamera.scale);
  const point = { x: 130, y: 410 }, worldSize = { width: portrait.root.w, height: portrait.root.h };
  const zoom = atlasZoomCamera(camera, .0001, point, size, worldSize);
  assert.equal(zoom.scale, Math.min(size.width / 1000, size.height / 1600) * .65);
  assert(Math.abs((point.x - zoom.x) / zoom.scale - (point.x - camera.x) / camera.scale) < 1e-7);
  assert(Math.abs((point.y - zoom.y) / zoom.scale - (point.y - camera.y) / camera.scale) < 1e-7);
});

test('every core has overlapping peripheral influence, without changing formal membership', () => {
  const data = dataFor(loadContentLibrary().objects), before = JSON.stringify(data);
  const baseline = createMcsAtlas(data);
  const expectedIds = data.objects.map(object => object.id).sort();
  const topology = atlas => atlas.nodes.map(node => ({
    id: node.id, objectId: node.objectId, parentId: node.parentId,
    children: node.children.map(child => child.id),
  }));
  const expectedTopology = topology(baseline);
  const overlaps = (a, lengthA, b, lengthB) => Math.min(a + lengthA, b + lengthB) - Math.max(a, b);
  const nearly = (a, b) => Math.abs(a - b) < 1e-8;

  assert.equal(baseline.root.children.length, 8);
  for (const { id: coreId } of baseline.root.children) {
    const landscape = createMcsAtlas(data, false, coreId);
    const portrait = createMcsAtlas(data, true, coreId);
    for (const atlas of [landscape, portrait]) {
      const core = atlas.byId[coreId], { root } = atlas;
      assert(nearly(core.x + core.w / 2, root.x + root.w / 2), `${coreId}: horizontal centre`);
      assert(nearly(core.y + core.h / 2, root.y + root.h / 2), `${coreId}: vertical centre`);
      assert(core.w * core.h > root.w * root.h * .45, `${coreId}: the core is prominent`);
      const neighbours = root.children.filter(node => node.id !== coreId);
      assert.equal(neighbours.length, 7);
      for (const neighbour of neighbours) {
        assert(core.w * core.h > neighbour.w * neighbour.h, `${coreId}: smaller surrounding ${neighbour.id}`);
        assert(overlaps(core.x, core.w, neighbour.x, neighbour.w) > 0 && overlaps(core.y, core.h, neighbour.y, neighbour.h) > 0,
          `${coreId}: ${neighbour.id} shares a transition area, not a rigid edge`);
        const crossing = atlasCrossingPoint(core, neighbour);
        assert(crossing.x >= Math.max(core.x, neighbour.x) && crossing.x <= Math.min(core.x + core.w, neighbour.x + neighbour.w));
        assert(crossing.y >= Math.max(core.y, neighbour.y) && crossing.y <= Math.min(core.y + core.h, neighbour.y + neighbour.h));
      }
      verifyLayout(atlas);
      assert.deepEqual(atlas.nodes.filter(node => node.objectId).map(node => node.objectId).sort(), expectedIds,
        `${coreId}: recentering keeps all registered object identities exactly once`);
      assert.deepEqual(topology(atlas), expectedTopology, `${coreId}: recentering changes geometry, not the member tree`);
    }
    for (const node of portrait.nodes) {
      const original = landscape.byId[node.id];
      assert.deepEqual({ x: node.x, y: node.y, w: node.w, h: node.h },
        { x: original.y, y: original.x, w: original.h, h: original.w }, `${coreId}: ${node.id} transposes consistently`);
    }
  }
  assert.equal(JSON.stringify(data), before, 'all centre choices leave public content unchanged');
});

test('an unknown or nested core ID cannot create a root territory or move formal membership', () => {
  const data = dataFor(loadContentLibrary().objects), baseline = createMcsAtlas(data);
  for (const coreId of ['atlas:missing', 'atlas:calculus', 'atlas:object:obj:tdg:jacobian', '__proto__']) {
    assert.deepEqual(createMcsAtlas(data, false, coreId), baseline, `unavailable core ${coreId} uses the default core`);
  }
});

test('map affinity is symmetric, traceable to crossing entrances and leaves missing pairs unrated', () => {
  assert.equal(MCS_ATLAS_AFFINITIES.length, MCS_CROSS_FIELDS.length);
  for (const crossing of MCS_CROSS_FIELDS) {
    const [a, b] = crossing.domains, affinity = atlasFieldAffinity(a, b);
    assert.equal(affinity.crossingId, crossing.id);
    assert.deepEqual(affinity, atlasFieldAffinity(b, a));
    assert(['strong', 'related', 'weak'].includes(affinity.level));
    assert(Number.isFinite(affinity.weight) && affinity.weight > 0);
  }
  for (const pair of [['atlas:number-theory', 'atlas:probability-statistics'], ['atlas:collected', 'atlas:geometry'], ['__proto__', 'atlas:analysis']]) {
    const affinity = atlasFieldAffinity(...pair);
    assert.equal(affinity.level, 'unrated');
    assert.equal(affinity.crossingId, undefined);
    assert(affinity.weight > 0, 'not-yet-rated does not mean absent');
  }
});

test('each crossing has one local entrance on both sides without duplicating a mathematical object', () => {
  const data = dataFor(loadContentLibrary().objects), atlas = createMcsAtlas(data);
  for (const crossing of MCS_CROSS_FIELDS) for (const domainId of crossing.domains) {
    const entries = atlas.byId[domainId].children.filter(node => node.crossingId === crossing.id);
    assert.equal(entries.length, 1, `${domainId}: one entrance for ${crossing.id}`);
    assert.equal(entries[0].objectId, undefined, 'crossing entrances are navigation, not new M objects');
    assert.equal(entries[0].neighbourId, crossing.domains.find(id => id !== domainId));
  }
  assert.equal(atlas.byId['atlas:topology'].children.filter(node => node.title.zh === '代数拓扑').length, 1, 'reuse the existing named branch');
  assert.equal(atlas.byId['atlas:algebraic-topology'].parentId, 'atlas:topology', 'preserve the existing canonical navigation ID');
  assert.deepEqual(atlas.nodes.filter(n => n.objectId).map(n => n.objectId).sort(), data.objects.map(n => n.id).sort());
});

test('expanded crossing branches sit near the parent edge toward the correct neighbour for every core', () => {
  const data = dataFor(loadContentLibrary().objects), baseline = createMcsAtlas(data);
  const c = node => ({ x: node.x + node.w / 2, y: node.y + node.h / 2 });
  for (const { id } of baseline.root.children) for (const portrait of [false, true]) {
    const atlas = createMcsAtlas(data, portrait, id), parent = atlas.byId[id], origin = c(parent);
    for (const child of parent.children.filter(n => n.neighbourId)) {
      const point = c(child), target = c(atlas.byId[child.neighbourId]);
      const a = { x: point.x - origin.x, y: point.y - origin.y }, b = { x: target.x - origin.x, y: target.y - origin.y };
      assert((a.x * b.x + a.y * b.y) / Math.hypot(a.x, a.y) / Math.hypot(b.x, b.y) > .99999, `${id}: ${child.title.en} must point toward ${child.neighbourId}`);
      assert(Math.hypot(a.x, a.y) > Math.min(parent.w, parent.h) * .28, `${id}: named crossings belong near the transition`);
    }
    verifyLayout(atlas);
  }
});

test('peripheral area follows affinity for all cores with a fixed total budget and visible weak fields', () => {
  const data = dataFor(loadContentLibrary().objects), baseline = createMcsAtlas(data);
  for (const { id } of baseline.root.children) for (const portrait of [false, true]) {
    const atlas = createMcsAtlas(data, portrait, id), neighbours = atlas.root.children.filter(n => n.id !== id);
    const total = neighbours.reduce((sum, n) => sum + n.w * n.h, 0);
    assert(Math.abs(total - 7 * 400 * 300) < 1e-7, `${id}: conserve peripheral area`);
    for (const a of neighbours) {
      assert(a.w * a.h > 50000, `${id}: weak/unrated ${a.id} stays visible`);
      for (const b of neighbours) {
        if (a.affinity.weight > b.affinity.weight) assert(a.w * a.h > b.w * b.h, `${id}: ${a.id} must be larger than ${b.id}`);
        if (a.affinity.weight === b.affinity.weight) assert(Math.abs(a.w * a.h - b.w * b.h) < 1e-7);
      }
    }
  }
  const algebra = createMcsAtlas(data, false, 'atlas:algebra'), analysis = createMcsAtlas(data, false, 'atlas:analysis');
  const area = (atlas, id) => atlas.byId[id].w * atlas.byId[id].h;
  assert(area(algebra, 'atlas:number-theory') > area(algebra, 'atlas:probability-statistics') * 3, 'strong and weak links are visually distinct');
  assert(area(analysis, 'atlas:probability-statistics') > area(algebra, 'atlas:probability-statistics') * 2.5, 'the same peripheral field grows when its connection to the new core is stronger');
  const empty = createMcsAtlas(dataFor([]), false, 'atlas:algebra');
  for (const n of algebra.root.children) assert.deepEqual({ x: n.x, y: n.y, w: n.w, h: n.h },
    { x: empty.byId[n.id].x, y: empty.byId[n.id].y, w: empty.byId[n.id].w, h: empty.byId[n.id].h }, 'area is independent of how much content has been collected');
});

test('damped motion converges without overshoot and is independent of display frame rate', () => {
  const simulate = hz => {
    let value = -120, velocity = 0;
    for (let i = 0; i < hz; i++) {
      const next = atlasSpring(value, velocity, 800, 1 / hz);
      assert(next.value >= value && next.value <= 800, 'at rest, a new target approaches monotonically');
      value = next.value; velocity = next.velocity;
    }
    return { value, velocity };
  };
  const a = simulate(30), b = simulate(144);
  assert(Math.abs(a.value - b.value) < 1e-8);
  assert(Math.abs(a.velocity - b.velocity) < 1e-8);
  assert(Math.abs(a.value - 800) < .04);
  const reverse = atlasSpring(1, 6, -1, 1 / 120);
  assert(Math.abs(reverse.value - 1) < .06, 'retargeting carries velocity without a teleport');
  const oneStep = atlasCoast(1000, 1);
  let distance = 0, speed = 1000;
  for (let i = 0; i < 120; i++) { const next = atlasCoast(speed, 1 / 120); distance += next.distance; assert(next.velocity < speed); speed = next.velocity; }
  assert(Math.abs(distance - oneStep.distance) < 1e-8);
  assert(distance < 150 && speed < 1, 'coasting settles within a bounded distance');
});
