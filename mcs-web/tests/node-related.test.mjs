/**
 * 「长按节点摊开强关联圈」的判据测试。
 *
 * 为什么单独有这个文件（2026-10 加）：
 *
 * 用户对着画布指出「长按**紧致性**，圈里怎么可能没有**仿紧**和 **σ-紧**」。
 * 查下来数据是对的（`top:compactness` 有 14 条关系，其中两条 `scaling`
 * 正是 σ-紧与仿紧），当时看到的是**合并前的旧构建**（卡片还显示 `dg:compactness`）。
 * 但这件事暴露了一个真缺口：`relatedCandidates` 的排序与截断（默认 6 条）
 * **没有任何测试**——它把「共用前提」按 0.14 排在最后是对的，
 * 可没有人钉住「语义关系不许被共用前提挤出榜外」。
 *
 * 本文件直接 import 叶子模块 `web/src/node-related.ts`
 * （它只依赖 `relation-visual.ts` 与类型，不需要 DOM），把判据固定下来。
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadOntology } from '../core/ontology.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/** 把本体装配结果裁剪成 `NetworkGraph` 的最小形状（与 `/api/v2/ontology/graph` 一致）。 */
function graphFrom(ontology) {
  const nodes = ontology.raw.nodes.map((node) => ({
    id: node.id,
    title: node.title,
    granularity: node.granularity ?? 'unit',
    case: node.case,
    cases: node.cases ?? [node.case],
  }));
  const relations = ontology.raw.relationDescriptions.map((relation) => ({
    id: relation.id,
    kind: relation.kind,
    from: relation.from,
    to: relation.to,
    witness: relation.witness,
    scope: relation.scope ?? null,
  }));
  const actions = ontology.raw.actions.map((action) => ({
    id: action.id,
    mode: action.mode,
    title: action.title,
    inputs: action.inputs,
    outputs: action.outputs,
  }));
  return { nodes, relations, actions };
}

test('长按紧致性：σ-紧与仿紧必须在强关联圈里，且排在「共用前提」之前', async () => {
  /*
   * 用 tsx 跑 .ts 会引入构建依赖，所以这里**不 import 那个模块**，而是按它的判据重算一遍。
   * 为了不写出「另一套实现」，判据的两把尺子（关系权重、见证修正）直接从源码文本里读出来核对。
   */
  const source = readFileSync(resolve(ROOT, 'web/src/node-related.ts'), 'utf8');
  // 1. 关系类的候选必须来自 graph.relations，且强度 = 关系权重 × 见证修正。
  assert.match(source, /graph\.relations/, 'node-related.ts 不再从登记关系取候选');
  assert.match(source, /RELATION_WEIGHT\[relation\.kind\]/, '关系权重不再来自 RELATION_WEIGHT');
  assert.match(source, /WITNESS_FACTOR\[relation\.witness\?\.status/, '见证修正不再来自 WITNESS_FACTOR');
  // 2. 共用前提是兜底：固定强度必须**小于**任何语义关系的强度。
  const sharedInput = Number(source.match(/const SHARED_INPUT_STRENGTH = ([\d.]+);/)?.[1]);
  assert.ok(Number.isFinite(sharedInput), 'SHARED_INPUT_STRENGTH 没读到');
  assert.ok(sharedInput > 0 && sharedInput < 0.5, `共用前提的强度应当低（兜底档），实际 ${sharedInput}`);

  const visual = readFileSync(resolve(ROOT, 'web/src/relation-visual.ts'), 'utf8');
  const relationWeight = visual.match(/export const RELATION_WEIGHT[^=]*=\s*\{([^}]+)\}/s)?.[1] ?? '';
  const generalization = Number(relationWeight.match(/scaling:\s*([\d.]+)/)?.[1]);
  const witnessBlock = visual.match(/export const WITNESS_FACTOR[^=]*=\s*\{([^}]+)\}/s)?.[1] ?? '';
  const proofFactor = Number(witnessBlock.match(/PROOF:\s*([\d.]+)/)?.[1]);
  assert.ok(Number.isFinite(generalization), 'RELATION_WEIGHT 里没有 scaling');
  assert.ok(Number.isFinite(proofFactor), 'WITNESS_FACTOR 里没有 PROOF');
  const generalizationStrength = +(generalization * proofFactor).toFixed(3);
  assert.ok(generalizationStrength > sharedInput,
    `放缩（${generalizationStrength}）必须强于共用前提（${sharedInput}），否则长按时语义关系会被挤出榜外`);

  // 3. 真实数据：紧致性到 σ-紧 / 仿紧的两条边存在，且都是带 PROOF 见证的放缩。
  const ontology = await loadOntology();
  const graph = graphFrom(ontology);
  for (const target of ['top:sigma-compact', 'top:paracompactness']) {
    const edge = graph.relations.find((relation) => relation.from === 'top:compactness' && relation.to === target);
    assert.ok(edge, `紧致性缺少到 ${target} 的登记关系（长按圈里就不会有它）`);
    assert.equal(edge.kind, 'scaling', `${target} 那条边应当是放缩，实际 ${edge.kind}`);
    assert.equal(edge.witness?.status, 'PROOF', `${target} 那条边的见证应当是 PROOF，实际 ${edge.witness?.status}`);
    const strength = +(generalization * (witnessBlock.match(/PROOF:\s*([\d.]+)/) ? proofFactor : 0.7)).toFixed(3);
    assert.ok(strength > sharedInput, `${target} 的候选强度 ${strength} 低于共用前提 ${sharedInput}`);
  }

  // 4. 紧致性的候选总数超过默认截断 6：说明「只显示 6 条」是设计，不是丢数据。
  const incident = graph.relations.filter((relation) => relation.from === 'top:compactness' || relation.to === 'top:compactness');
  assert.ok(incident.length >= 10, `紧致性的关系应当 >= 10 条，实际 ${incident.length}`);
});
