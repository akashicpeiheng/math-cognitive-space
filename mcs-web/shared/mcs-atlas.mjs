/**
 * A navigational atlas (D), not an exhaustive taxonomy or a formal membership
 * assertion. Only explicit, exact object IDs connect navigation to public M.
 * Layout is deterministic and independent of viewport, filters and personal E.
 */
import { MCS_CROSS_FIELDS } from './mcs-crossfields.mjs';
import { MCS_TOPICS } from './mcs-presentation.mjs';
import { atlasFieldAffinity } from './mcs-atlas-affinity.mjs';
import { arrangeConstellation } from './mcs-atlas-relations.mjs';
const branch = (id, zh, en, children = [], objectId) => ({
  id: `atlas:${id}`, title: { zh, en }, children, ...(objectId ? { objectId } : {}),
});

function navigation() {
  return [
    { ...branch('analysis', '分析', 'Analysis', [
      branch('calculus', '微积分', 'Calculus', [], 'obj:tdg:subdiscipline-calculus'),
      branch('real-analysis', '实分析', 'Real analysis'),
      branch('complex-analysis', '复分析', 'Complex analysis'),
      branch('functional-analysis', '泛函分析', 'Functional analysis'),
      branch('differential-equations', '微分方程', 'Differential equations'),
    ]), description: { zh: '研究变化、逼近与连续性，用极限、导数、积分和方程描述它们。', en: 'Studies change and continuity through limits, derivatives and integrals.' }, color: '#54877d' },
    { ...branch('algebra', '代数', 'Algebra', [
      branch('linear-algebra', '线性代数', 'Linear algebra'),
      branch('group-theory', '群论', 'Group theory', [], 'obj:group:subdiscipline'),
      branch('rings-fields', '环与域', 'Rings and fields'),
      branch('representation-theory', '表示论', 'Representation theory'),
    ]), description: { zh: '研究运算与结构，以及保持运算的映射；从方程规律走向群、环、域与表示。', en: 'Studies operations, structures and maps that preserve them.' }, color: '#b17e58' },
    { ...branch('geometry', '几何', 'Geometry', [
      branch('euclidean-geometry', '欧氏几何', 'Euclidean geometry'),
      branch('differential-geometry', '微分几何', 'Differential geometry', [], 'obj:tdg:subdiscipline-geometry'),
      branch('algebraic-geometry', '代数几何', 'Algebraic geometry'),
      branch('convex-geometry', '凸几何', 'Convex geometry'),
    ]), description: { zh: '研究空间、形状与变换；用坐标、曲率和不变量连接局部图形与整体结构。', en: 'Studies space and shape, from local features to global structure.' }, color: '#7786b5' },
    { ...branch('topology', '拓扑', 'Topology', [
      branch('point-set-topology', '点集拓扑', 'Point-set topology', [], 'obj:tdg:subdiscipline-topology'),
      branch('algebraic-topology', '代数拓扑', 'Algebraic topology'),
      branch('geometric-topology', '几何拓扑', 'Geometric topology'),
    ]), description: { zh: '研究空间的连续结构与同胚下保持的性质，如连通性和紧性。', en: 'Studies spaces, continuity and properties preserved by homeomorphisms.' }, color: '#a178a2' },
    { ...branch('number-theory', '数论', 'Number theory', [
      branch('elementary-number-theory', '初等数论', 'Elementary number theory'),
      branch('analytic-number-theory', '解析数论', 'Analytic number theory'),
      branch('algebraic-number-theory', '代数数论', 'Algebraic number theory'),
      branch('arithmetic-geometry', '算术几何', 'Arithmetic geometry'),
    ]), description: { zh: '研究整数及其推广的结构与规律，连接整除、素数、同余、方程与算术几何。', en: 'Studies integers, primes, divisibility and equations.' }, color: '#b39a51' },
    { ...branch('discrete', '离散数学', 'Discrete mathematics', [
      branch('combinatorics', '组合数学', 'Combinatorics'),
      branch('graph-theory', '图论', 'Graph theory'),
      branch('discrete-optimization', '离散优化', 'Discrete optimization'),
    ]), description: { zh: '研究离散结构及其组合关系，用计数、图、算法与优化处理问题。', en: 'Studies discrete structures through counting, graphs and algorithms.' }, color: '#6e9aa4' },
    { ...branch('probability-statistics', '概率与统计', 'Probability and statistics', [
      branch('probability', '概率论', 'Probability theory'),
      branch('statistics', '数理统计', 'Mathematical statistics'),
      branch('stochastic-processes', '随机过程', 'Stochastic processes'),
    ]), description: { zh: '研究随机现象中的规律与不确定性，连接概率模型、统计推断与随机过程。', en: 'Studies randomness, probability models and statistical inference.' }, color: '#ad7b80' },
    { ...branch('foundations-computation', '基础与计算', 'Foundations and computation', [
      branch('logic', '数理逻辑', 'Mathematical logic'),
      branch('set-theory', '集合论', 'Set theory'),
      branch('category-theory', '范畴论', 'Category theory'),
      branch('computability', '可计算性与复杂性', 'Computability and complexity'),
      branch('numerical-analysis', '数值分析', 'Numerical analysis'),
    ]), description: { zh: '研究数学的形式描述、证明和计算，连接逻辑、集合、算法与复杂性。', en: 'Studies logic, sets and the methods and limits of computation.' }, color: '#85897b' },
  ];
}

const compare = (a, b) => a < b ? -1 : a > b ? 1 : 0;

const center = node => ({ x: node.x + node.w / 2, y: node.y + node.h / 2 });
const bounds = (node, cx, cy, w, h) => Object.assign(node, { x: cx - w / 2, y: cy - h / 2, w, h });
const seed = id => [...id].reduce((n, c) => (n * 31 + c.charCodeAt(0)) >>> 0, 7);

// Reuse exact navigation identities where the named crossing already exists.
// Other sides get local entrances into the same D crossing, never duplicate M.
const crossingBranches = Object.freeze({
  'cross:algebraic-geometry': 'atlas:algebraic-geometry',
  'cross:algebraic-topology': 'atlas:algebraic-topology',
  'cross:analytic-number-theory': 'atlas:analytic-number-theory',
  'cross:arithmetic-geometry': 'atlas:arithmetic-geometry',
});
function addCrossingEntrances(root) {
  for (const domain of root.children) for (const crossing of MCS_CROSS_FIELDS) {
    if (!crossing.domains.includes(domain.id)) continue;
    let entry = domain.children.find(child => child.id === crossingBranches[crossing.id]);
    if (!entry) {
      entry = branch(`crossing:${domain.id.slice(6)}:${crossing.id.slice(6)}`, crossing.title.zh, crossing.title.en);
      domain.children.push(entry);
    }
    entry.crossingId = crossing.id;
    entry.neighbourId = crossing.domains.find(id => id !== domain.id);
    entry.description = { ...crossing.description };
  }
}

/** View envelopes, not partitions. Overlapping tails deliberately have no owner. */
function arrangeFields(root, coreId) {
  const core = root.children.find(child => child.id === coreId) ?? root.children[0];
  bounds(core, 800, 500, 1080, 740);
  // Preserve a stable cyclic order when the focus changes. Nearby disciplines
  // are a navigation choice, not measured mathematical distances.
  const cycle = ['analysis', 'geometry', 'topology', 'algebra', 'number-theory', 'discrete', 'foundations-computation', 'probability-statistics', 'collected'];
  const others = root.children.filter(child => child !== core).sort((a, b) => cycle.indexOf(a.id.slice(6)) - cycle.indexOf(b.id.slice(6)));
  const affinities = others.map(child => atlasFieldAffinity(core.id, child.id));
  const averageWeight = affinities.reduce((sum, affinity) => sum + affinity.weight, 0) / others.length;
  others.forEach((child, i) => {
    const angle = -Math.PI / 2 + i * Math.PI * 2 / others.length;
    // Fixed total peripheral area: stronger bridges grow relative to weaker
    // ones. Scale both dimensions by sqrt(weight) so AREA follows affinity.
    const affinity = affinities[i], scale = Math.sqrt(affinity.weight / averageWeight);
    const w = 400 * scale, h = 300 * scale;
    child.affinity = affinity;
    // Large fields lean inward and keep their navigation envelope on the map.
    const rx = Math.min(620, 800 - w / 2 - 12), ry = Math.min(365, 500 - h / 2 - 12);
    bounds(child, 800 + Math.cos(angle) * rx, 500 + Math.sin(angle) * ry, w, h);
  });
}

/** Sparse content remains sparse: even a single child is a local landmark. */
function scatter(node, root) {
  const count = node.children.length;
  if (!count) return;
  const c = center(node), phase = (seed(node.id) % 100) / 100 * .65 - Math.PI / 2;
  const extent = Math.min(.36, .68 / Math.sqrt(count));
  const ordinary = node.children.filter(child => !child.neighbourId);
  node.children.forEach((child, i) => {
    const angle = phase + i * Math.PI * 2 / Math.max(3, count);
    const radius = count === 1 ? 0 : count <= 7 ? .26 : .28 * Math.sqrt((i + .5) / count);
    const theta = count > 7 ? phase + i * 2.399963229728653 : angle;
    let dx = Math.cos(theta) * radius, dy = Math.sin(theta) * radius;
    if (node.depth === 1 && node.id !== 'atlas:collected') {
      const neighbour = root.children.find(field => field.id === child.neighbourId);
      if (neighbour) {
        // A named crossing belongs on the ray to its other field. Its centre
        // approaches the inner edge, while the whole envelope stays in parent.
        const p = center(neighbour), length = Math.hypot(p.x - c.x, p.y - c.y) || 1;
        const ux = (p.x - c.x) / length, uy = (p.y - c.y) / length;
        const availableX = node.w * ((1 - extent) / 2 - .035);
        const availableY = node.h * ((1 - extent) / 2 - .035);
        const travel = Math.min(Math.abs(ux) > 1e-9 ? availableX / Math.abs(ux) : Infinity,
          Math.abs(uy) > 1e-9 ? availableY / Math.abs(uy) : Infinity) * .91;
        bounds(child, c.x + ux * travel, c.y + uy * travel, node.w * extent, node.h * extent);
        return;
      }
      // Non-crossing branches stay in the interior. Registered related routes
      // determine their direction when available; an empty average stays local.
      const index = ordinary.indexOf(child), angle = phase + index * Math.PI * 2 / Math.max(3, ordinary.length);
      dx = Math.cos(angle) * .17; dy = Math.sin(angle) * .17;
      const related = MCS_CROSS_FIELDS.filter(cross => cross.domains.includes(node.id) && cross.targetIds.includes(child.id));
      const targets = related.map(cross => root.children.find(field => cross.domains.includes(field.id) && field.id !== node.id)).filter(Boolean);
      if (targets.length) {
        const direction = targets.reduce((sum, field) => {
          const p = center(field), length = Math.hypot(p.x - c.x, p.y - c.y) || 1;
          const weight = atlasFieldAffinity(node.id, field.id).weight;
          return { x: sum.x + (p.x - c.x) / length * weight, y: sum.y + (p.y - c.y) / length * weight };
        }, { x: 0, y: 0 });
        const length = Math.hypot(direction.x, direction.y);
        if (length > .1) { dx = direction.x / length * .18; dy = direction.y / length * .18; }
      }
    }
    bounds(child, c.x + dx * node.w, c.y + dy * node.h, node.w * extent, node.h * extent);
  });
  if (node.depth === 1 && ordinary.length > 1 && ordinary.length <= 6) {
    // Assign separate interior slots to ordinary branches, preferring their
    // related directions. This prevents several related tools sharing one dot.
    const slots = ordinary.map((_, i) => ({ x: Math.cos(phase + i * Math.PI * 2 / ordinary.length) * .22,
      y: Math.sin(phase + i * Math.PI * 2 / ordinary.length) * .22 }));
    const desired = ordinary.map(child => ({ x: (center(child).x - c.x) / node.w, y: (center(child).y - c.y) / node.h }));
    let best = [], bestCost = Infinity;
    function assign(i, remaining, chosen, cost) {
      if (cost >= bestCost) return;
      if (i === ordinary.length) { best = chosen; bestCost = cost; return; }
      for (const index of remaining) {
        const p = slots[index], q = desired[i];
        assign(i + 1, remaining.filter(n => n !== index), [...chosen, index], cost + (p.x - q.x) ** 2 + (p.y - q.y) ** 2);
      }
    }
    assign(0, slots.map((_, i) => i), [], 0);
    ordinary.forEach((child, i) => bounds(child, c.x + slots[best[i]].x * node.w, c.y + slots[best[i]].y * node.h, child.w, child.h));
  }
}

/** A smooth, deterministic contour; the gradient disappears before its edge. */
export function atlasRegionPath(node, inset = 1) {
  const phase = seed(node.id) % 628 / 100;
  const points = Array.from({ length: 12 }, (_, i) => {
    const angle = i * Math.PI / 6;
    const radius = (.9 + .055 * Math.sin(angle * 3 + phase) + .035 * Math.cos(angle * 5 - phase)) * inset;
    return { x: node.x + node.w / 2 + Math.cos(angle) * node.w / 2 * radius,
      y: node.y + node.h / 2 + Math.sin(angle) * node.h / 2 * radius };
  });
  const p = index => points[(index + points.length) % points.length];
  let path = `M ${p(0).x} ${p(0).y}`;
  for (let i = 0; i < points.length; i++) {
    const a = p(i - 1), b = p(i), c = p(i + 1), d = p(i + 2);
    path += ` C ${b.x + (c.x - a.x) / 6} ${b.y + (c.y - a.y) / 6} ${c.x - (d.x - b.x) / 6} ${c.y - (d.y - b.y) / 6} ${c.x} ${c.y}`;
  }
  return path + ' Z';
}

/** Position an entrance within the two fields' shared, diffuse influence. */
export function atlasCrossingPoint(a, b) {
  const ca = center(a), cb = center(b);
  const ra = Math.sqrt(a.w * a.h), rb = Math.sqrt(b.w * b.h);
  const t = ra / (ra + rb);
  return { x: ca.x + (cb.x - ca.x) * t, y: ca.y + (cb.y - ca.y) * t };
}

/**
 * Every available object appears once. Secondary memberships remain in M and
 * the object network; atlas ownership chooses one existing primary membership.
 * Unmapped identities are retained in a separate collected-content entrance.
 */
export function createMcsAtlas(data, portrait = false, coreId) {
  const objects = new Map(data.objects.map(object => [object.id, object]));
  const rank = new Map((data.presentation?.order ?? []).map((id, i) => [id, i]));
  const ordered = (a, b) => (rank.get(a) ?? 1e6) - (rank.get(b) ?? 1e6) || compare(a, b);
  const parents = new Map();
  for (const object of objects.values()) for (const ref of object.members) {
    // Ignore stale or declaration-level membership; never guess identity by title.
    const member = objects.get(ref.id);
    if (!member || member.id === object.id || ref.anchor !== '$' ||
        member.version !== ref.version || member.formalHash !== ref.formalHash) continue;
    const candidates = parents.get(member.id) ?? [];
    candidates.push(object.id); parents.set(member.id, candidates);
  }
  const children = new Map([...objects.keys()].map(id => [id, []]));
  const primary = new Map();
  for (const [id, candidates] of parents) {
    candidates.sort(ordered);
    const preferred = data.presentation?.primaryParents?.[id];
    const parent = candidates.includes(preferred) ? preferred : candidates[0];
    primary.set(id, parent); children.get(parent).push(id);
  }
  for (const list of children.values()) list.sort(ordered);
  const used = new Set();
  function formal(id) {
    if (used.has(id)) return null;
    used.add(id);
    const object = objects.get(id);
    return {
      id: `atlas:object:${id}`, objectId: id,
      title: data.presentation?.titles?.[id] ?? { zh: object.title, en: object.title },
      ...(data.presentation?.summaries?.[id] ? { description: data.presentation.summaries[id] } : {}),
      children: children.get(id).map(formal).filter(Boolean),
    };
  }
  const root = branch('mathematics', '数学', 'Mathematics', navigation());
  addCrossingEntrances(root);
  root.color = '#85897b';
  root.description = {
    zh: '学科导航；分区不表示唯一分类。已收录对象沿现有成员结构展开。',
    en: 'A navigational map, not a unique taxonomy. Collected objects follow their existing membership structure.',
  };
  for (const domain of root.children) for (const entry of domain.children) {
    if (!entry.objectId) continue;
    if (!objects.has(entry.objectId)) { delete entry.objectId; continue; }
    // Keep the formal object's own title visible: “calculus” navigation is not
    // an identity alias for the narrower differential-calculus formal object.
    const node = formal(entry.objectId);
    delete entry.objectId;
    if (node) entry.children.push(node);
  }
  // Older public libraries predate the formal topic/subdiscipline objects.
  // Their explicitly curated topic lists can still supply navigation entrances;
  // these display-only groupings do not create formal membership.
  const legacyDomains = {
    'obj:tdg:subdiscipline-calculus': 'atlas:calculus',
    'obj:tdg:subdiscipline-topology': 'atlas:point-set-topology',
    'obj:tdg:subdiscipline-geometry': 'atlas:differential-geometry',
  };
  for (const topic of MCS_TOPICS) {
    if (objects.has(topic.id)) continue;
    const entry = root.children.flatMap(domain => domain.children).find(node => node.id === legacyDomains[topic.domain]);
    if (!entry) continue;
    const ids = topic.primary.filter(id => objects.has(id) && !used.has(id) && (!primary.has(id) || used.has(primary.get(id))));
    if (!ids.length) continue;
    const group = branch(`legacy-${topic.key}`, topic.title.zh, topic.title.en);
    group.description = topic.summary;
    for (const id of ids) { const node = formal(id); if (node) group.children.push(node); }
    if (group.children.length) entry.children.push(group);
  }
  const remaining = [...objects.keys()].filter(id => !used.has(id)).sort(ordered);
  if (remaining.length) {
    const extra = branch('collected', '其他已收录对象', 'Other collected objects');
    extra.color = '#8c8a85';
    // Start with roots so IDs ordered before their parent cannot be flattened.
    for (const id of remaining.filter(id => !primary.has(id) || used.has(primary.get(id)))) {
      const node = formal(id); if (node) extra.children.push(node);
    }
    // Defensive fallback for malformed cycles: retain every identity once.
    for (const id of remaining) { const node = formal(id); if (node) extra.children.push(node); }
    root.children.push(extra);
  }
  Object.assign(root, { x: 0, y: 0, w: 1600, h: 1000 });
  const relations = data.relations ?? [];
  const nodes = [], byId = Object.create(null);
  function place(node, parent) {
    node.depth = parent ? parent.depth + 1 : 0;
    if (parent) { node.parentId = parent.id; node.color = node.color ?? parent.color; }
    nodes.push(node); byId[node.id] = node;
    if (!parent) arrangeFields(node, coreId);
    else {
      /*
       * 对象层的概念星座：只对「子节点全部是正式对象」的父节点计算，
       * 且必须有可见的主要关系；否则保持原来的留白散布。
       * 先用 scatter 同一套比例给子节点定尺寸，再让星座改中心位置。
       */
      const objectParent = node.children.length >= 2 && node.children.every(child => child.objectId);
      if (objectParent) {
        const extent = Math.min(.36, .68 / Math.sqrt(node.children.length));
        for (const child of node.children) { child.w = node.w * extent; child.h = node.h * extent; }
      }
      const constellation = objectParent ? arrangeConstellation(node, node.children, relations) : null;
      if (constellation) {
        for (const child of node.children) {
          const position = constellation.positions.get(child.objectId);
          if (position) { child.x = position.x; child.y = position.y; }
        }
        node.constellation = { core: constellation.core, groups: constellation.groups };
      } else {
        scatter(node, root);
      }
    }
    for (const child of node.children) place(child, node);
  }
  place(root);
  // Reorient the same deterministic map for tall screens, without changing
  // object ownership, IDs, sibling order or the persisted navigation path.
  if (portrait) for (const node of nodes) {
    const { x, y, w, h } = node;
    Object.assign(node, { x: y, y: x, w: h, h: w });
  }
  return { root, nodes, byId };
}

export function atlasFitCamera(node, size, padding = 28) {
  const inset = Math.max(0, Math.min(padding, Math.min(size.width, size.height) * .15));
  const scale = Math.max(.001, Math.min(2048, (size.width - inset * 2) / node.w, (size.height - inset * 2) / node.h));
  return { scale, x: size.width / 2 - (node.x + node.w / 2) * scale, y: size.height / 2 - (node.y + node.h / 2) * scale };
}

/** Pointer-anchored zoom; limits still leave all branch levels reachable. */
export function atlasZoomCamera(camera, factor, point, size, worldSize = { width: 1600, height: 1000 }) {
  const minimum = Math.max(.001, Math.min(size.width / worldSize.width, size.height / worldSize.height) * .65);
  const scale = Math.max(minimum, Math.min(2048, camera.scale * factor));
  return { scale,
    x: point.x - (point.x - camera.x) / camera.scale * scale,
    y: point.y - (point.y - camera.y) / camera.scale * scale,
  };
}
