/** 旧键只在输入边界兼容；公共关系类型统一为 scaling。 */
export function normalizeRelationKind(kind) {
  return kind === 'hardGeneralization' || kind === 'specialization' ? 'scaling' : kind;
}

/** 不改端点、不倒转证据，不从旧类型名称猜测一般/特殊端。 */
export function normalizeScalingRecord(record) {
  if (!record || normalizeRelationKind(record.kind) !== 'scaling') return record;
  return { ...record, kind: 'scaling' };
}

/** 已登记的一般/特殊端；未核验的旧关系不进入放缩锥。 */
export function scalingEndpoints(relation) {
  if (relation.kind !== 'scaling' || relation.scalingMode === 'unresolved') return null;
  const direction = relation.direction;
  if (!direction?.general || !direction?.special) return null;
  const from = typeof relation.from === 'string' ? relation.from : relation.from?.node;
  const to = typeof relation.to === 'string' ? relation.to : relation.to?.node;
  const reading = direction.reading ?? 'contract';
  if (reading === 'contract' && from === direction.general && to === direction.special) return direction;
  if (reading === 'expand' && from === direction.special && to === direction.general) return direction;
  return null;
}

/** 同一蕴含的两种读法可共享证据；逆命题与不同条件必须保持独立。 */
export function scalingEvidenceKey(candidate) {
  return JSON.stringify([
    candidate.direction?.general ?? candidate.from?.node,
    candidate.direction?.special ?? candidate.to?.node,
    candidate.goal?.hash ?? candidate.goal?.source ?? null,
    candidate.conditions ?? [],
  ]);
}
