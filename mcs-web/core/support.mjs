import { SUPPORT_USES, assert } from '../shared/contracts.mjs';
import { CODES } from '../shared/errors.mjs';

// 精确支持接口：Unknown 与 Known(A) 分开；部分界只能经 partial 字段读取。
export function querySupport(ontology, nodeId, use = 'expression') {
  assert(SUPPORT_USES.includes(use), CODES.BAD_REQUEST, `未知支持用途：${use}`);
  const records = ontology.raw.support.filter((record) => record.node === nodeId && record.use === use);
  if (records.length === 0) {
    return { node: nodeId, use, status: 'Unknown', reason: '该节点在此用途下没有登记支持记录；无记录不等于空支持。', records: [] };
  }
  const known = records.filter((record) => record.status === 'known');
  if (known.length === 0) {
    const reason = records.map((record) => record.reason).filter(Boolean).join('；') || '已登记记录均为 Unknown。';
    return { node: nodeId, use, status: 'Unknown', reason, records };
  }
  const set = [...new Set(known.flatMap((record) => record.set ?? []))].sort();
  const partial = records.filter((record) => record.partial).map((record) => ({ id: record.id, ...record.partial }));
  return {
    node: nodeId,
    use,
    status: 'Known',
    set,
    minimal: known.some((record) => record.minimal === true),
    alternatives: known.map((record) => ({ id: record.id, set: record.set ?? [], minimal: record.minimal === true, evidence: record.evidence ?? [] })),
    partial: partial.length ? partial : undefined,
    records,
    note: known.length > 1 ? '多个精确支持记录取并集只作导航；极小性与必要性必须回看各自证据。' : undefined,
  };
}

export function supportIntersection(ontology, left, right, use = 'expression') {
  const a = querySupport(ontology, left, use);
  const b = querySupport(ontology, right, use);
  if (a.status === 'Unknown' || b.status === 'Unknown') {
    return { status: 'Unknown', reason: `支持未决：${[a, b].filter((item) => item.status === 'Unknown').map((item) => item.reason).join('；')}`, a, b };
  }
  return { status: 'Known', set: a.set.filter((item) => b.set.includes(item)), a, b, note: '这是两份已登记支持的交，不声称是全部路线的共同必需。' };
}

export function supportDifference(ontology, left, right, use = 'expression') {
  const a = querySupport(ontology, left, use);
  const b = querySupport(ontology, right, use);
  if (a.status === 'Unknown' || b.status === 'Unknown') {
    return { status: 'Unknown', reason: `支持未决：${[a, b].filter((item) => item.status === 'Unknown').map((item) => item.reason).join('；')}`, a, b };
  }
  const set = [...new Set([...a.set.filter((item) => !b.set.includes(item)), ...b.set.filter((item) => !a.set.includes(item))])].sort();
  const minimal = a.minimal === true && b.minimal === true;
  return { status: 'Known', set, minimal, note: minimal ? '两侧支持均登记了极小性证据。' : '至少一侧没有极小性证据，结果按普通支持显示。', a, b };
}

// 路线族共同前提：只在声明的路线族内取交集，并携带枚举完整性。
export function routeFamilyRequirement(routes, goals, { complete, note } = {}) {
  if (!Array.isArray(routes) || routes.length === 0) {
    return { status: 'Unknown', set: [], reason: '路线族为空；空族不产生共同先修。', scope: { complete: Boolean(complete), note: note ?? '未声明范围' } };
  }
  const perRoute = routes.map((route) => {
    const required = new Set([...(route.entry ?? [])]);
    for (const goal of goals) {
      const source = route.goalSources?.[goal];
      if (source?.kind === 'background') required.add(source.node);
      if (source?.kind === 'boundary') required.add(source.node);
    }
    return required;
  });
  const common = [...perRoute[0]].filter((item) => perRoute.every((set) => set.has(item))).sort();
  return {
    status: 'Known',
    set: common,
    scope: { complete: Boolean(complete), note: note ?? (complete ? '声明域内路线已完整枚举。' : '未证明路线族已完整枚举，这是可修订的搜索结论。') },
    note: complete ? '这是声明范围内的共同输入义务。' : '新增合法绕行路线可能使该项不再必经；对外引用必须保留范围限定。',
  };
}

export function supportSummary(ontology) {
  const records = ontology.raw.support;
  return {
    total: records.length,
    known: records.filter((record) => record.status === 'known').length,
    unknown: records.filter((record) => record.status === 'unknown').length,
    partial: records.filter((record) => record.partial).length,
    byUse: Object.fromEntries(SUPPORT_USES.map((use) => [use, records.filter((record) => record.use === use).length])),
  };
}
