/**
 * 数学地图深缩放的概念星座与主要关系（D 层导航，2026-11-16）。
 *
 * 这一层只决定「放大到一个专题时，对象怎么摆、哪些已登记关系值得画」：
 * - 不新增对象、成员关系或数学关系；
 * - 不改变对象身份、正式摘要或对象网络；
 * - 精选分组是阅读导航，不是数学分类。
 *
 * 关系记录来自 `McsViewData.relations`（M 层，`from.id`/`to.id` 为对象 ID）。
 * 主图只画 deduction / application / scaling / duality 四类；其余关系保留在
 * 右侧详情与对象网络。
 */
export const MAIN_RELATION_KINDS = Object.freeze(['deduction', 'application', 'scaling', 'duality']);

/** 布局用的关系权重：只影响「谁是核心、谁靠近核心」，不是数学强度排序。 */
const MAIN_WEIGHT = Object.freeze({
  deduction: 5,
  application: 4,
  scaling: 3,
  duality: 2,
});

const KIND_ORDER = Object.freeze({
  deduction: 0,
  application: 1,
  scaling: 2,
  duality: 3,
  hardPrereq: 4,
  softPrereq: 5,
  analogy: 6,
});

const GROUP_TITLES = Object.freeze({
  deduction: Object.freeze({ zh: '推导', en: 'Deduction' }),
  application: Object.freeze({ zh: '应用', en: 'Application' }),
  scaling: Object.freeze({ zh: '放缩', en: 'Scaling' }),
  duality: Object.freeze({ zh: '对偶', en: 'Duality' }),
  other: Object.freeze({ zh: '相关概念', en: 'Related concepts' }),
});

const group = (id, zh, en, members, anchor, slots) => Object.freeze({
  id,
  title: Object.freeze({ zh, en }),
  members: Object.freeze([...members]),
  anchor: Object.freeze({ ...anchor }),
  slots: Object.freeze(slots.map(slot => Object.freeze({ ...slot }))),
});

/**
 * 精选星座。只覆盖已有充分关系、且分组稳定的专题；其他专题走通用布局。
 * 这里的 `d² = 0 家族` 说明三条结论共享 d²=0 的来源，不是新的数学分类。
 */
export const MCS_ATLAS_CONSTELLATIONS = Object.freeze({
  'obj:tdg:topic-exterior-calculus': Object.freeze({
    core: 'obj:tdg:exterior',
    coreSlot: Object.freeze({ x: .5, y: .46 }),
    groups: Object.freeze([
      group('d2-zero', 'd² = 0 家族', 'd² = 0 family',
        ['obj:tdg:d-squared', 'obj:tdg:curl-grad', 'obj:tdg:div-curl'],
        { x: .5, y: .66 },
        [{ x: .26, y: .78 }, { x: .5, y: .86 }, { x: .74, y: .78 }]),
      group('form-ops', '形式运算', 'Form operations',
        ['obj:tdg:forms', 'obj:tdg:hodge', 'obj:tdg:insertion'],
        { x: .24, y: .08 },
        [{ x: .18, y: .28 }, { x: .34, y: .18 }, { x: .14, y: .46 }]),
      group('vector-analysis', '向量分析', 'Vector analysis',
        ['obj:tdg:vector-realization', 'obj:tdg:formal-adjoint'],
        { x: .82, y: .08 },
        [{ x: .78, y: .22 }, { x: .86, y: .44 }]),
    ]),
  }),
});

export const constellationFor = objectId => MCS_ATLAS_CONSTELLATIONS[objectId] ?? null;

const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
const isMain = kind => MAIN_RELATION_KINDS.includes(kind);
const visibleObjectId = entry => entry?.objectId ?? null;
const relationEndpoints = relation => [relation?.from?.id, relation?.to?.id];

/** 以「可见对象之间的主要关系」计算核心：加权度最高者；平票按子节点顺序。 */
export function chooseConstellationCore(children, relations) {
  const visible = children.map(visibleObjectId).filter(Boolean);
  if (visible.length < 2) return null;
  const score = new Map(visible.map(id => [id, 0]));
  for (const relation of relations) {
    if (!relation || !isMain(relation.kind)) continue;
    const [from, to] = relationEndpoints(relation);
    if (!from || !to || from === to || !score.has(from) || !score.has(to)) continue;
    const weight = MAIN_WEIGHT[relation.kind] ?? 1;
    score.set(from, score.get(from) + weight);
    score.set(to, score.get(to) + weight);
  }
  let best = null;
  for (const id of visible) {
    if (!best || score.get(id) > score.get(best)) best = id;
  }
  return best && score.get(best) > 0 ? best : null;
}

function strongestKindBetween(relations, a, b) {
  let best = null;
  for (const relation of relations) {
    if (!relation || !isMain(relation.kind)) continue;
    const [from, to] = relationEndpoints(relation);
    if (!((from === a && to === b) || (from === b && to === a))) continue;
    if (best === null || KIND_ORDER[relation.kind] < KIND_ORDER[best]) best = relation.kind;
  }
  return best;
}

function genericGroups(children, relations, core) {
  const buckets = new Map();
  for (const child of children) {
    const id = visibleObjectId(child);
    if (!id || id === core) continue;
    const kind = strongestKindBetween(relations, core, id) ?? 'other';
    const bucket = buckets.get(kind) ?? [];
    bucket.push(id);
    buckets.set(kind, bucket);
  }
  const order = [...MAIN_RELATION_KINDS, 'other'];
  return [...buckets.entries()]
    .sort((a, b) => order.indexOf(a[0]) - order.indexOf(b[0]))
    .map(([kind, members], index, all) => {
      const angle = -Math.PI / 2 + index * Math.PI * 2 / Math.max(3, all.length);
      return {
        id: kind,
        title: GROUP_TITLES[kind] ?? GROUP_TITLES.other,
        members,
        anchor: { x: .5 + Math.cos(angle) * .24, y: .5 + Math.sin(angle) * .24 },
        slots: members.map((_, memberIndex) => {
          const spread = members.length === 1 ? 0 : .09;
          const x = .5 + Math.cos(angle) * .34 + Math.cos(angle + Math.PI / 2) * (memberIndex - (members.length - 1) / 2) * spread;
          const y = .5 + Math.sin(angle) * .34 + Math.sin(angle + Math.PI / 2) * (memberIndex - (members.length - 1) / 2) * spread;
          return { x, y };
        }),
      };
    });
}

/**
 * 为一个对象父节点计算星座位置。返回 `{ core, groups, positions }`；
 * 无主要内部关系、或子节点不是对象时返回 null，让调用方保留 `scatter`。
 *
 * `positions` 的键是对象 ID，值是子节点左上角的绝对世界坐标。
 */
export function arrangeConstellation(parent, children, relations, constellation = constellationFor(parent?.objectId)) {
  if (!parent || !children?.length) return null;
  const visibleChildren = children.filter(child => child.objectId);
  if (visibleChildren.length !== children.length) return null;
  const core = constellation?.core && visibleChildren.some(child => child.objectId === constellation.core)
    ? constellation.core
    : chooseConstellationCore(visibleChildren, relations);
  if (!core) return null;
  const hasInternalMain = relations.some(relation => {
    if (!relation || !isMain(relation.kind)) return false;
    const [from, to] = relationEndpoints(relation);
    return from && to && from !== to && visibleChildren.some(child => child.objectId === from) && visibleChildren.some(child => child.objectId === to);
  });
  if (!hasInternalMain) return null;

  const byId = new Map(visibleChildren.map(child => [child.objectId, child]));
  const positions = new Map();
  const place = (child, x, y) => {
    if (!child) return;
    const cx = clamp(parent.x + parent.w * x, parent.x + child.w / 2, parent.x + parent.w - child.w / 2);
    const cy = clamp(parent.y + parent.h * y, parent.y + child.h / 2, parent.y + parent.h - child.h / 2);
    positions.set(child.objectId, { x: cx - child.w / 2, y: cy - child.h / 2 });
  };

  place(byId.get(core), constellation?.coreSlot?.x ?? .5, constellation?.coreSlot?.y ?? .46);

  const groups = constellation?.groups?.length
    ? constellation.groups.map(entry => ({ ...entry, members: entry.members.filter(id => byId.has(id)) })).filter(entry => entry.members.length)
    : genericGroups(visibleChildren, relations, core);

  for (const entry of groups) {
    entry.members.forEach((id, index) => {
      const slot = entry.slots[index] ?? {
        x: entry.anchor.x + (index - (entry.members.length - 1) / 2) * .1,
        y: entry.anchor.y,
      };
      place(byId.get(id), slot.x, slot.y);
    });
  }

  // 精选表未覆盖的对象（数据版本变化时）放到外圈，避免丢对象。
  const placed = new Set([core, ...groups.flatMap(entry => entry.members)]);
  const leftovers = visibleChildren.filter(child => !placed.has(child.objectId));
  leftovers.forEach((child, index) => {
    const angle = -Math.PI / 2 + index * Math.PI * 2 / Math.max(3, leftovers.length);
    place(child, .5 + Math.cos(angle) * .36, .5 + Math.sin(angle) * .36);
  });

  return {
    core,
    groups: groups.map(entry => ({
      id: entry.id,
      title: entry.title,
      members: [...entry.members],
      anchor: { ...entry.anchor },
    })),
    positions,
  };
}

/**
 * 地图上要画的主要关系：端点都在可见对象集合内、无自环、同一有向对去重。
 * 返回按 kind 优先级与关系 ID 排序的前 `limit` 条。
 */
export function relationEdgesForObjects(relations, objectIds, { limit = 12 } = {}) {
  const visible = objectIds instanceof Set ? objectIds : new Set(objectIds ?? []);
  const byPair = new Map();
  for (const relation of relations ?? []) {
    if (!relation || !isMain(relation.kind)) continue;
    const [from, to] = relationEndpoints(relation);
    if (!from || !to || from === to || !visible.has(from) || !visible.has(to)) continue;
    const key = `${from}|${to}`;
    const existing = byPair.get(key);
    if (!existing) {
      byPair.set(key, { id: relation.id, from, to, kind: relation.kind, count: 1 });
    } else {
      existing.count += 1;
      if (KIND_ORDER[relation.kind] < KIND_ORDER[existing.kind]) {
        existing.id = relation.id;
        existing.kind = relation.kind;
      }
    }
  }
  return [...byPair.values()]
    .sort((a, b) => KIND_ORDER[a.kind] - KIND_ORDER[b.kind] || a.from.localeCompare(b.from, 'en') || a.to.localeCompare(b.to, 'en'))
    .slice(0, limit);
}

/** 供右侧详情使用：该对象的全部 M 关系（含跨专题），按类型与 ID 稳定排序。 */
export function relationsForObject(relations, objectId) {
  return (relations ?? [])
    .filter(relation => relation && (relation.layer === undefined || relation.layer === 'M')
      && (relation.from?.id === objectId || relation.to?.id === objectId))
    .sort((a, b) => (KIND_ORDER[a.kind] ?? 99) - (KIND_ORDER[b.kind] ?? 99) || a.id.localeCompare(b.id, 'en'));
}
