import { scalingEndpoints } from './scaling.mjs';

const sortedValue = (value) => Array.isArray(value) ? value.map(sortedValue)
  : value && typeof value === 'object' ? Object.fromEntries(Object.keys(value).sort().map(key => [key, sortedValue(value[key])])) : value;

/** Identity is independent of locale, view, evidence grade and ontology version. */
export function relationConnectionKey(relation) {
  const direction = scalingEndpoints(relation);
  // No evidence reference means we cannot establish that two readings share a claim.
  if (!direction || !relation.witness?.ref) return JSON.stringify(['relation', relation.id]);
  return JSON.stringify(['scaling', relation.scalingMode, direction.general, direction.special,
    relation.witness.ref, sortedValue(relation.goal?.hash ?? relation.goal?.source ?? null), sortedValue(relation.conditions ?? [])]);
}

export function contractConnectionKey(actionId, from, to) {
  return JSON.stringify(['contract', actionId, from, to]);
}

export function familyConnectionKey(family, from, to) {
  return JSON.stringify([family, ...[from, to].sort()]);
}

/** Check the actual registered connection, not just whether both nodes exist. */
export function connectionExists(raw, key) {
  let parts;
  try { parts = JSON.parse(key); } catch { return false; }
  if (!Array.isArray(parts) || parts.length < 2 || JSON.stringify(parts) !== key) return false;
  const [family, a, b, c] = parts;
  if (family === 'relation' || family === 'scaling') {
    return (raw.relationDescriptions ?? raw.relations ?? []).some(r => relationConnectionKey(r) === key);
  }
  const ids = new Set(raw.nodes.map(node => node.id));
  if (family === 'contract') {
    return parts.length === 4 && ids.has(b) && ids.has(c) && raw.actions.some(action => action.id === a
      && action.inputs.some(input => input.node === b) && action.outputs.some(output => output.node === c));
  }
  if (parts.length !== 3 || a === b || !ids.has(a) || !ids.has(b) || familyConnectionKey(family, a, b) !== key) return false;
  const together = members => members.includes(a) && members.includes(b);
  switch (family) {
    case 'topic': return (raw.aggregates ?? []).some(group => group.blocks.some(together));
    case 'pattern': return (raw.patterns ?? []).some(pattern => together([pattern.node, ...(pattern.anchors ?? [])]));
    case 'sharedInput': return raw.actions.some(action => together(action.inputs.map(input => input.node)));
    case 'evidence': return (raw.evidence ?? []).some(record => together(record.nodes ?? []));
    case 'support': return (raw.support ?? []).some(record => (record.node === a && record.set?.includes(b)) || (record.node === b && record.set?.includes(a)));
    default: return false;
  }
}
