/**
 * MCS 的只读空间投影。无 DOM、I/O、随机数或个人数据依赖；坐标均为世界坐标。
 * 布局始终包含完整成员树及自声明，筛选和 LOD 不重新布局。
 */
export const MCS_STORAGE_KEY = 'mcs-view-state-v1';
export const MCS_LOD = Object.freeze({ expand: 240, collapse: 180 });

const SCALES = ['atom', 'molecule', 'unit', 'topic', 'subdiscipline'];
const EVIDENCE = ['DEF', 'PROOF', 'REF', 'FINITE', 'ILLUSTRATION', 'NOT-CLAIMED'];
const RELATIONS = ['deduction', 'hardPrereq', 'scaling', 'softPrereq', 'application', 'analogy', 'duality'];
const PAD = 28, HEADER = 84, GAP = 24, ROOT_GAP = 96;
const cmp = (a, b) => a < b ? -1 : a > b ? 1 : 0;
const sorted = values => [...new Set(values)].sort(cmp);
const record = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const finite = value => typeof value === 'number' && Number.isFinite(value);
const point = value => record(value) && finite(value.x) && finite(value.y);
const own = (value, key) => Object.hasOwn(value, key);
// defineProperty also treats an ID such as "__proto__" as an ordinary own key.
const put = (out, key, value) => {
  Object.defineProperty(out, key, { value, enumerable: true, writable: true, configurable: true });
  return value;
};
const refKey = ref => ref.anchor === '$' ? ref.id : `${ref.id}#${ref.anchor}`;
const entryKey = (parent, ref) => `@reference:${JSON.stringify([parent, ref.id, ref.anchor])}`;
const expandedIn = state => id => state.manual?.[id] === 'open' ||
  (state.manual?.[id] !== 'closed' && state.expanded.includes(id));

function translatedBoxes(layout, positions) {
  const boxes = {}, deltas = new Map();
  const ordered = Object.values(layout.boxes).sort((a, b) => a.depth - b.depth || cmp(a.id, b.id));
  for (const box of ordered) {
    const parent = deltas.get(box.parent) ?? { x: 0, y: 0 };
    const delta = own(positions, box.id) && point(positions[box.id]) ? positions[box.id] : { x: 0, y: 0 };
    const shift = { x: parent.x + delta.x, y: parent.y + delta.y };
    deltas.set(box.id, shift);
    put(boxes, box.id, { ...box, x: box.x + shift.x, y: box.y + shift.y });
  }
  return boxes;
}

function hierarchy(data) {
  const objects = new Map(data.objects.map(object => [object.id, object]));
  const ids = sorted(objects.keys()), allParents = new Map(ids.map(id => [id, []]));
  for (const id of ids) for (const ref of objects.get(id).members) {
    if (objects.has(ref.id) && ref.id !== id) allParents.get(ref.id).push(id);
  }
  const parents = new Map();
  for (const id of ids) {
    const candidates = sorted(allParents.get(id));
    allParents.set(id, candidates);
    if (candidates.length) parents.set(id, candidates[0]);
  }
  return { objects, ids, parents, allParents };
}

function knownRef(objects, ref) {
  if (!record(ref)) return false;
  const object = objects.get(ref.id);
  if (!object || ref.version !== object.version) return false;
  const target = ref.anchor === '$' ? object : object.declarations.find(d => d.id === ref.anchor);
  return !!target && target.formalHash === ref.formalHash;
}

/** Empty filter dimensions mean all; a fresh value is returned on every call. */
export function defaultMcsState(data) {
  return {
    schema: 'mcs-view-state/1', objectVersion: data.objectVersion,
    filters: { groups: [], scales: [], relations: [], evidence: [], query: '' },
    camera: { x: 0, y: 0, scale: 1 }, expanded: [], manual: {}, selected: null, positions: {},
  };
}

/**
 * Primary ownership is the lexically first parent ID. Every other membership is
 * a reference entrance, never a second object identity. Ordinary references and
 * imports are lines only; they never consume member/declaration grid slots.
 * rootCenters are centres; returned boxes use top-left coordinates.
 */
export function createMcsLayout(data, rootCenters = {}) {
  const { objects, ids, parents } = hierarchy(data);
  const boxes = {}, children = {}, boxParents = {}, specs = new Map();
  for (const id of ids) {
    specs.set(id, { id, objectId: id, kind: 'object' });
    put(children, id, []);
  }
  const add = (parent, spec) => {
    if (specs.has(spec.id)) return;
    specs.set(spec.id, spec);
    children[parent].push(spec.id);
    put(children, spec.id, []);
    put(boxParents, spec.id, parent);
  };
  for (const id of ids) {
    const object = objects.get(id);
    if (parents.has(id)) {
      const parent = parents.get(id);
      children[parent].push(id);
      put(boxParents, id, parent);
    }
    for (const declaration of [...object.declarations].sort((a, b) => cmp(a.id, b.id))) {
      add(id, { id: `${id}#${declaration.id}`, objectId: id, kind: 'declaration', anchor: declaration.id });
    }
    const entrances = object.members.filter(ref => parents.get(ref.id) !== id);
    for (const ref of entrances) if (knownRef(objects, ref)) {
      add(id, { id: entryKey(id, ref), objectId: ref.id, kind: 'reference', target: ref.id, anchor: ref.anchor });
    }
  }
  for (const list of Object.values(children)) list.sort(cmp);
  const roots = ids.filter(id => !parents.has(id));
  const sizes = new Map(), offsets = new Map();
  function measure(id) {
    if (sizes.has(id)) return sizes.get(id);
    const spec = specs.get(id), list = children[id];
    if (!list.length) {
      const size = spec.kind === 'object' ? { w: 320, h: 180 } : { w: 300, h: 130 };
      sizes.set(id, size);
      return size;
    }
    const columns = Math.min(3, list.length), rows = Math.ceil(list.length / columns);
    const widths = Array(columns).fill(0), heights = Array(rows).fill(0);
    list.forEach((child, index) => {
      const size = measure(child), col = index % columns, row = Math.floor(index / columns);
      widths[col] = Math.max(widths[col], size.w);
      heights[row] = Math.max(heights[row], size.h);
    });
    const xs = [], ys = [];
    let x = PAD, y = HEADER;
    for (const width of widths) { xs.push(x); x += width + GAP; }
    for (const height of heights) { ys.push(y); y += height + GAP; }
    list.forEach((child, index) => offsets.set(child, { x: xs[index % columns], y: ys[Math.floor(index / columns)] }));
    const size = { w: Math.max(320, x - GAP + PAD), h: Math.max(180, y - GAP + PAD) };
    sizes.set(id, size);
    return size;
  }
  roots.forEach(measure);
  function place(id, x, y, depth, parent) {
    put(boxes, id, { ...specs.get(id), x, y, ...sizes.get(id), depth, parent });
    for (const child of children[id]) {
      const offset = offsets.get(child);
      place(child, x + offset.x, y + offset.y, depth + 1, id);
    }
  }
  const areas = roots.map(id => sizes.get(id).w * sizes.get(id).h).sort((a, b) => a - b);
  const median = areas[Math.floor(areas.length / 2)] ?? 1;
  const large = roots.filter(id => sizes.get(id).w * sizes.get(id).h > 4 * median);
  const regular = roots.filter(id => !large.includes(id));
  const columns = Math.max(1, Math.ceil(Math.sqrt(regular.length)));
  const widths = Array(columns).fill(0), heights = Array(Math.ceil(regular.length / columns)).fill(0);
  regular.forEach((id, index) => {
    const size = sizes.get(id);
    widths[index % columns] = Math.max(widths[index % columns], size.w);
    heights[Math.floor(index / columns)] = Math.max(heights[Math.floor(index / columns)], size.h);
  });
  const prefix = values => {
    let n = 0;
    return values.map(value => { const start = n; n += value + ROOT_GAP; return start; });
  };
  const xs = prefix(widths), ys = prefix(heights), placed = [];
  const overlaps = (a, b) => a.x < b.x + b.w + ROOT_GAP && a.x + a.w + ROOT_GAP > b.x &&
    a.y < b.y + b.h + ROOT_GAP && a.y + a.h + ROOT_GAP > b.y;
  const bounds = () => ({
    left: Math.min(...placed.map(b => b.x)), top: Math.min(...placed.map(b => b.y)),
    right: Math.max(...placed.map(b => b.x + b.w)), bottom: Math.max(...placed.map(b => b.y + b.h)),
  });
  for (const [index, id] of [...regular, ...large].entries()) {
    const size = sizes.get(id), center = own(rootCenters, id) && point(rootCenters[id]) ? rootCenters[id] : null;
    const envelope = placed.length ? bounds() : null;
    const isLarge = index >= regular.length;
    const desired = center ? { x: center.x - size.w / 2, y: center.y - size.h / 2 } : isLarge && envelope ? {
      x: (envelope.left + envelope.right - size.w) / 2,
      y: (envelope.top + envelope.bottom - size.h) / 2,
    } : { x: xs[index % columns] ?? 0, y: ys[Math.floor(index / columns)] ?? 0 };
    let candidates;
    if (isLarge && envelope) {
      // Large organizational roots (notably the group hierarchy) sit outside the
      // compact cluster, rather than forcing a hole through its small units.
      candidates = [
        { x: envelope.left - ROOT_GAP - size.w, y: desired.y },
        { x: envelope.right + ROOT_GAP, y: desired.y },
        { x: desired.x, y: envelope.top - ROOT_GAP - size.h },
        { x: desired.x, y: envelope.bottom + ROOT_GAP },
      ];
      if (desired.x + size.w + ROOT_GAP <= envelope.left || desired.x >= envelope.right + ROOT_GAP ||
          desired.y + size.h + ROOT_GAP <= envelope.top || desired.y >= envelope.bottom + ROOT_GAP) candidates.push(desired);
    } else if (!placed.some(b => overlaps({ ...desired, ...size }, b))) {
      candidates = [desired];
    } else {
      // A finite two-axis slot search. Every rectangle contributes its four
      // separating boundaries; the nearest valid cross-product slot wins.
      // At most (2 * roots.length + 1)^2 candidates, no relaxation loop.
      const xSlots = sorted([desired.x, ...placed.flatMap(b => [b.x - ROOT_GAP - size.w, b.x + b.w + ROOT_GAP])]);
      const ySlots = sorted([desired.y, ...placed.flatMap(b => [b.y - ROOT_GAP - size.h, b.y + b.h + ROOT_GAP])]);
      candidates = xSlots.flatMap(x => ySlots.map(y => ({ x, y })));
    }
    const distance = p => (p.x - desired.x) ** 2 + (p.y - desired.y) ** 2;
    const area = p => !envelope ? size.w * size.h :
      (Math.max(envelope.right, p.x + size.w) - Math.min(envelope.left, p.x)) *
      (Math.max(envelope.bottom, p.y + size.h) - Math.min(envelope.top, p.y));
    candidates.sort((a, b) => distance(a) - distance(b) || area(a) - area(b) || a.y - b.y || a.x - b.x);
    const position = candidates.find(p => !placed.some(b => overlaps({ ...p, ...size }, b)));
    placed.push({ ...position, ...size });
    place(id, position.x, position.y, 0, null);
  }
  return { boxes, children, parents: boxParents, roots };
}

/**
 * positions are local deltas relative to the original layout, NOT absolute world
 * positions. Apply them to that baseline on each render. Enclosure expansion
 * happens after inheritance so extending a region never moves its children.
 * Pass the original layout (not this result) to updateMcsLod.
 */
export function positionedMcsLayout(layout, positions) {
  const boxes = translatedBoxes(layout, positions);
  const ordered = Object.values(layout.boxes).sort((a, b) => b.depth - a.depth || cmp(a.id, b.id));
  for (const original of ordered) {
    const box = boxes[original.id], list = layout.children[box.id] ?? [];
    if (box.kind !== 'object' || !list.length) continue;
    const nested = list.map(id => boxes[id]);
    const x = Math.min(box.x, ...nested.map(b => b.x - PAD));
    const y = Math.min(box.y, ...nested.map(b => b.y - HEADER));
    const right = Math.max(box.x + box.w, ...nested.map(b => b.x + b.w + PAD));
    const bottom = Math.max(box.y + box.h, ...nested.map(b => b.y + b.h + PAD));
    Object.assign(box, { x, y, w: right - x, h: bottom - y });
  }
  return { boxes, children: layout.children, parents: layout.parents, roots: layout.roots };
}

function contextFor(tree, matched) {
  const context = new Set();
  const addChain = id => {
    const visited = new Set();
    while (id && !visited.has(id)) {
      visited.add(id);
      if (!matched.has(id)) context.add(id);
      id = tree.parents.get(id);
    }
  };
  for (const id of matched) {
    addChain(tree.parents.get(id));
    // Secondary parents enter only for a directly matched member; their primary
    // ancestors keep the entrance reachable even through another root.
    for (const parent of tree.allParents.get(id) ?? []) addChain(parent);
  }
  return context;
}

/** Relations do not constrain object matching. Declaration evidence is owner-local. */
export function filterMcsObjects(data, filters) {
  const tree = hierarchy(data), matched = new Set(), counts = {};
  const groups = filters.groups ?? [], scales = filters.scales ?? [], evidence = filters.evidence ?? [];
  const allGroups = !groups.length || groups.includes('all');
  const groupObjects = new Set(data.groups.filter(g => groups.includes(g.id)).flatMap(g => g.objectIds));
  const query = (filters.query ?? '').trim().toLowerCase();
  for (const id of tree.ids) {
    const object = tree.objects.get(id);
    const text = [id, object.title, ...object.declarations.map(d => d.source)].join('\n').toLowerCase();
    if ((allGroups || groupObjects.has(id)) && (!scales.length || scales.includes(object.scale)) &&
        (!evidence.length || object.declarations.some(d => evidence.includes(d.status))) &&
        (!query || text.includes(query))) matched.add(id);
  }
  const context = contextFor(tree, matched);
  for (const id of tree.ids) {
    const object = tree.objects.get(id), members = sorted(object.members.map(r => r.id).filter(child => tree.objects.has(child)));
    put(counts, id, {
      matched: members.filter(child => matched.has(child)).length + (matched.has(id) ? object.declarations.length : 0),
      total: members.length + object.declarations.length,
    });
  }
  return { matched, context, counts };
}

/** Parents remain visible regions when expanded; a closed ancestor hides the full subtree. */
export function visibleMcsBoxes(data, layout, state, filterResult = filterMcsObjects(data, state.filters)) {
  const visible = [], expanded = expandedIn(state);
  const allowed = id => filterResult.matched.has(id) || filterResult.context.has(id);
  function visit(id) {
    const box = layout.boxes[id];
    if (!box) return;
    if (box.kind === 'object') {
      if (!allowed(box.objectId)) return;
      visible.push(box);
      if (expanded(box.objectId)) for (const child of layout.children[id] ?? []) visit(child);
    } else if (box.kind === 'declaration') {
      if (filterResult.matched.has(box.objectId)) visible.push(box);
    } else if (allowed(box.target)) visible.push(box);
  }
  for (const id of layout.roots) visit(id);
  return visible;
}

/**
 * focus is a world point. Only currently visible objects auto-open (one frontier
 * per call), within a 48 screen-pixel margin. All small regions auto-close,
 * including hidden descendants; manual choices always win. Camera is untouched.
 */
export function updateMcsLod(data, layout, state, focus) {
  const visible = new Set(visibleMcsBoxes(data, layout, state).map(box => box.id));
  const next = new Set(state.expanded), scale = state.camera.scale;
  const shifted = translatedBoxes(layout, state.positions);
  for (const box of Object.values(layout.boxes)) {
    if (box.kind !== 'object' || !layout.children[box.id]?.length) continue;
    const manual = state.manual[box.id];
    if (manual === 'closed') { next.delete(box.id); continue; }
    if (manual === 'open') { next.add(box.id); continue; }
    const projection = Math.max(box.w, box.h) * scale;
    if (projection <= MCS_LOD.collapse) { next.delete(box.id); continue; }
    const margin = 48 / scale;
    const positioned = shifted[box.id];
    if (projection >= MCS_LOD.expand && visible.has(box.id) && point(focus) &&
        focus.x >= positioned.x - margin && focus.x <= positioned.x + box.w + margin &&
        focus.y >= positioned.y - margin && focus.y <= positioned.y + box.h + margin) next.add(box.id);
  }
  const expanded = sorted(next);
  return expanded.length === state.expanded.length && expanded.every((id, i) => id === state.expanded[i])
    ? state : { ...state, expanded };
}

/** Tolerant JSON-state reader: discard stale references, never invent replacements. */
export function normalizeMcsState(raw, data) {
  const state = defaultMcsState(data), issues = [];
  if (!record(raw)) return { state, issues: ['state: expected an object'] };
  if (raw.schema !== state.schema) issues.push('schema: unsupported or missing state schema');
  if (raw.objectVersion !== data.objectVersion) issues.push('objectVersion: changed or missing; retained valid state');
  const readList = (value, valid, path) => {
    if (!Array.isArray(value)) { issues.push(`${path}: expected an array`); return []; }
    const result = [];
    for (const id of value) {
      if (typeof id === 'string' && valid(id)) {
        if (!result.includes(id)) result.push(id);
      } else issues.push(`${path}: discarded invalid value`);
    }
    return result;
  };
  const filters = record(raw.filters) ? raw.filters : {};
  if (!record(raw.filters)) issues.push('filters: expected an object');
  const groups = new Set(['all', ...data.groups.map(g => g.id)]);
  state.filters.groups = readList(filters.groups, id => groups.has(id), 'filters.groups');
  state.filters.scales = readList(filters.scales, id => SCALES.includes(id), 'filters.scales');
  state.filters.relations = readList(filters.relations, id => RELATIONS.includes(id), 'filters.relations');
  state.filters.evidence = readList(filters.evidence, id => EVIDENCE.includes(id), 'filters.evidence');
  if (typeof filters.query === 'string') state.filters.query = filters.query;
  else issues.push('filters.query: expected a string');
  if (record(raw.camera)) {
    for (const key of ['x', 'y', 'scale']) {
      if (finite(raw.camera[key]) && (key !== 'scale' || raw.camera[key] > 0)) state.camera[key] = raw.camera[key];
      else issues.push(`camera.${key}: invalid finite coordinate or scale`);
    }
  } else issues.push('camera: expected an object');
  const layout = createMcsLayout(data);
  const known = id => own(layout.boxes, id);
  const expandable = id => known(id) && layout.boxes[id].kind === 'object' && layout.children[id].length > 0;
  state.expanded = readList(raw.expanded, expandable, 'expanded');
  if (record(raw.manual)) {
    for (const [id, value] of Object.entries(raw.manual)) {
      if (expandable(id) && (value === 'open' || value === 'closed')) {
        put(state.manual, id, value);
        // manual is the durable choice; expanded is its display projection.
        // Repair older or hand-edited snapshots that contain the two conflicting.
        const expected = value === 'open';
        const actual = state.expanded.includes(id);
        if (expected !== actual) {
          issues.push(`manual.${id}: reconciled conflicting expanded state`);
          state.expanded = value === 'open' ? sorted([...state.expanded, id]) : state.expanded.filter(item => item !== id);
        }
      }
      else issues.push('manual: discarded invalid reference or mode');
    }
  } else issues.push('manual: expected an object');
  if (raw.selected === null || typeof raw.selected === 'string' && known(raw.selected)) state.selected = raw.selected;
  else issues.push('selected: discarded invalid reference');
  if (record(raw.positions)) {
    for (const [id, value] of Object.entries(raw.positions)) {
      if (known(id) && point(value)) put(state.positions, id, { x: value.x, y: value.y });
      else issues.push('positions: discarded invalid reference or coordinates');
    }
  } else issues.push('positions: expected an object');
  return { state, issues };
}

export function encodeMcsState(state) {
  return '#mcs=' + encodeURIComponent(JSON.stringify(state));
}

export function decodeMcsState(hash, data) {
  if (typeof hash !== 'string' || !hash.startsWith('#mcs=')) return null;
  try {
    const raw = JSON.parse(decodeURIComponent(hash.slice(5)));
    if (!record(raw) || raw.schema !== 'mcs-view-state/1') return null;
    return normalizeMcsState(raw, data);
  } catch { return null; }
}

/**
 * Premises project to visible box IDs for junction rendering. Distinct original
 * AND sets remain separate edges, even when collapsed to identical box IDs.
 * relationIds retain every source relation and its complete original premises.
 */
export function assignMcsRelationLanes(edges) {
  const groups = new Map();
  for (const edge of edges) {
    const key = JSON.stringify([edge.kind, edge.from, edge.to]);
    const group = groups.get(key) ?? [];
    group.push(edge);
    groups.set(key, group);
  }
  return new Map([...groups.values()].flatMap(group => group
    .sort((a, b) => cmp(a.id, b.id))
    .map((edge, index) => [edge.id, { index, count: group.length }])));
}

export function projectMcsRelations(data, layout, state, visibleBoxes, matched) {
  const tree = hierarchy(data), visible = new Map(visibleBoxes.map(box => [box.id, box]));
  const expanded = expandedIn(state), edges = new Map(), structure = new Map();
  const context = contextFor(tree, matched), allowed = id => matched.has(id) || context.has(id);
  const project = ref => {
    if (!knownRef(tree.objects, ref)) return null;
    const key = refKey(ref);
    if (visible.get(key)?.kind === 'declaration') return key;
    // An actual visible object wins before looking at its visible ancestors.
    if (visible.get(ref.id)?.kind === 'object') return ref.id;
    let parent = layout.parents[ref.id];
    while (parent) {
      if (visible.get(parent)?.kind === 'object' && !expanded(parent)) return parent;
      parent = layout.parents[parent];
    }
    return null;
  };
  const kinds = state.filters.relations, evidence = state.filters.evidence;
  for (const relation of [...data.relations].sort((a, b) => cmp(a.id, b.id))) {
    if (relation.layer !== 'M' || kinds.length && !kinds.includes(relation.kind) ||
        evidence.length && !evidence.includes(relation.evidence.status) ||
        !matched.has(relation.from.id) || !matched.has(relation.to.id)) continue;
    const from = project(relation.from), to = project(relation.to);
    if (!from || !to || from === to) continue;
    const originalPremises = sorted(relation.premises.map(refKey));
    const projected = relation.premises.map(ref => matched.has(ref.id) ? project(ref) : null);
    const premises = sorted(projected.filter(Boolean));
    const id = `@relation:${JSON.stringify([relation.kind, from, to, originalPremises])}`;
    let edge = edges.get(id);
    if (!edge) {
      edge = { id, kind: relation.kind, from, to, relationIds: [],
        missingPremises: projected.filter(id => id === null).length,
        premises, aggregate: false };
      edges.set(id, edge);
    }
    edge.relationIds.push(relation.id);
    edge.aggregate ||= refKey(relation.from) !== from || refKey(relation.to) !== to || edge.relationIds.length > 1;
  }
  const addStructure = (owner, ref, kind, entrance = null) => {
    if (!allowed(owner.id) || !allowed(ref.id)) return;
    const from = entrance && visible.has(entrance) ? entrance : project({ id: owner.id, version: owner.version, anchor: '$', formalHash: owner.formalHash });
    const to = project(ref);
    if (!from || !to || from === to) return;
    const id = `@structure:${JSON.stringify([kind, owner.id, refKey(ref)])}`;
    structure.set(id, { id, kind, from, to });
  };
  for (const id of tree.ids) {
    const object = tree.objects.get(id);
    for (const ref of object.members) if (tree.parents.get(ref.id) !== id) addStructure(object, ref, 'reference', entryKey(id, ref));
    for (const ref of object.references) addStructure(object, ref, 'reference', entryKey(id, ref));
    for (const ref of object.imports) addStructure(object, ref, 'import');
  }
  return { edges: [...edges.values()], structure: [...structure.values()].sort((a, b) => cmp(a.id, b.id)) };
}
