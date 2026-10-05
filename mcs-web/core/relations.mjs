import { assert } from '../shared/contracts.mjs';
import { CODES } from '../shared/errors.mjs';

export function inverseRelation(relation) {
  return { ...relation, id: `${relation.id}:inverse`, from: relation.to, to: relation.from, kind: `inverse:${relation.kind}` };
}

export function restrictRelation(relation, fromSet, toSet) {
  if (!fromSet.has(relation.from) || !toSet.has(relation.to)) return null;
  return { ...relation, id: `${relation.id}:restricted` };
}

export function composeRelations(left, right) {
  const output = [];
  for (const first of left) {
    for (const second of right) {
      if (first.to !== second.from) continue;
      output.push({
        id: `${first.id}∘${second.id}`,
        kind: 'composed',
        from: first.from,
        to: second.to,
        witness: { type: 'composition', status: 'DEF', scope: '复合仅保留可达性；复合导航不自动仍是直接类比或因果关系' },
        factors: [first.id, second.id],
      });
    }
  }
  return output;
}

export function relationNeighborhood(ontology, seeds, { kinds = null, direction = 'both', radius = 1 } = {}) {
  assert(Number.isInteger(radius) && radius >= 0, CODES.BAD_REQUEST, '半径必须是非负整数');
  const nodes = new Set(seeds);
  const used = [];
  let frontier = new Set(seeds);
  for (let step = 0; step < radius; step += 1) {
    const next = new Set();
    for (const relation of ontology.raw.relationDescriptions) {
      if (kinds && !kinds.includes(relation.kind)) continue;
      const forward = direction !== 'incoming' && frontier.has(relation.from);
      const backward = direction !== 'outgoing' && frontier.has(relation.to);
      if (!forward && !backward) continue;
      const other = forward ? relation.to : relation.from;
      used.push(relation.id);
      if (!nodes.has(other)) { nodes.add(other); next.add(other); }
    }
    frontier = next;
    if (frontier.size === 0) break;
  }
  return { nodes: [...nodes], relations: [...new Set(used)], steps: radius };
}

export function subrelationCheck(left, right) {
  const witness = left.witness;
  const ok = witness && witness.type === 'inclusion' && witness.status === 'PROOF';
  return {
    status: ok ? 'certified' : 'unverified',
    note: ok ? '引用了关系包含的认证见证。' : '未登记关系包含见证；数据中暂时未见反例不构成包含证明。',
    witness: ok ? witness : null,
  };
}

// 有界 Horn 可达：输入满足即可触发行动。它是必要条件检查，不替代事件规划。
export function reachableNodes(ontology, backgroundEntries, { disabledNodes = [], disabledActions = [], maxRounds = 64 } = {}) {
  const disabledNodeSet = new Set(disabledNodes);
  const disabledActionSet = new Set(disabledActions);
  const available = new Set();
  for (const entry of backgroundEntries) {
    if (!disabledNodeSet.has(entry.node)) available.add(entry.node);
  }
  let changed = true;
  let rounds = 0;
  while (changed && rounds < maxRounds) {
    changed = false;
    rounds += 1;
    for (const action of ontology.raw.actions) {
      if (disabledActionSet.has(action.id)) continue;
      const touchesDisabled = action.inputs.some((input) => disabledNodeSet.has(input.node)) || action.outputs.some((output) => disabledNodeSet.has(output.node));
      if (touchesDisabled) continue;
      if (action.inputs.every((input) => available.has(input.node))) {
        for (const output of action.outputs) {
          if (!available.has(output.node)) { available.add(output.node); changed = true; }
        }
      }
    }
  }
  return { available: [...available].sort(), rounds, truncated: rounds >= maxRounds };
}

export function relationSummary(ontology) {
  const counts = {};
  for (const relation of ontology.raw.relationDescriptions) counts[relation.kind] = (counts[relation.kind] ?? 0) + 1;
  return { total: ontology.raw.relationDescriptions.length, byKind: counts };
}

export function relationAlgebraDemo(ontology) {
  const relations = ontology.raw.relationDescriptions;
  const composed = composeRelations(relations.slice(0, 2), relations.slice(2, 4));
  return { composed: composed.length, note: '关系代数示例只在显式选定的有限记录上计算。' };
}
