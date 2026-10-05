import test from 'node:test';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { MCS_WEB_ROOT, loadOntology } from '../core/ontology.mjs';

const { mergeParallelEdges, visualWeightOf, buildEdges } = await import(
  pathToFileURL(resolve(MCS_WEB_ROOT, 'web/src/network.ts')).href
);

/**
 * 同一对节点只画最强的一条（2026-10 加，TODO A2-14）。
 *
 * 第二十九轮报的问题：同一对节点常同时有「行动契约」与「登记关系」，画出来两条线叠在一起。
 * 规则写在 `network.ts` 的 `mergeParallelEdges` 里（**最强的一条留下**，同权重按
 * relation > contract > 族边、再按 id 稳定排序；被并掉的进 `merged`，由界面如实标注）。
 * 这一套把规则本身钉住——页面只看得到结果，规则错了很难从画布上看出来。
 */
const relation = (id, from, to, kind, status = 'DEF') => ({
  source: 'relation', id, from, to, kind, witnessStatus: status, scope: null,
});
const contract = (id, from, to, mode, actionTitle = '引入') => ({
  source: 'contract', id, from, to, actionId: `a-${id}`, actionTitle, mode,
});
const family = (id, source, from, to) => ({ source, id, from, to, note: '族边' });

test('规则一：同一对节点只留一条，最强的那条留下', () => {
  // hardPrereq（权重 1.0）应当压过 definition 契约（0.9）与族边（≤0.13）。
  const edges = [
    relation('r-hard', 'a', 'b', 'hardPrereq', 'PROOF'),
    contract('c-def', 'a', 'b', 'definition'),
    family('f-topic', 'topic', 'a', 'b'),
  ];
  const merged = mergeParallelEdges(edges);
  assert.equal(merged.length, 1, '同一对节点只该剩一条：' + JSON.stringify(merged.map((item) => item.edge.id)));
  assert.equal(merged[0].edge.id, 'r-hard');
  assert.equal(merged[0].merged.length, 2, '被并掉的两条要留着（界面还要标注它们）');
  assert.deepEqual(merged[0].merged.map((edge) => edge.id).sort(), ['c-def', 'f-topic']);
  // 权重确实是最高的那条：用同一把尺子复核。
  for (const item of merged[0].merged) {
    assert.ok(visualWeightOf(merged[0].edge) >= visualWeightOf(item),
      `${item.id} 比留下的 ${merged[0].edge.id} 更重，规则错了`);
  }
});

test('规则二：无序对——A→B 与 B→A 算同一对', () => {
  const merged = mergeParallelEdges([
    relation('r-forward', 'a', 'b', 'hardPrereq'),
    relation('r-backward', 'b', 'a', 'specialization'),
  ]);
  assert.equal(merged.length, 1, '方向相反的两条也是同一对：' + JSON.stringify(merged.map((item) => item.edge.id)));
  assert.equal(merged[0].edge.id, 'r-forward', 'hardPrereq 权重更高，应当留下');
  assert.deepEqual(merged[0].merged.map((edge) => edge.id), ['r-backward']);
});

test('规则三：权重相同时语义关系优先于契约，再按 id 稳定排序', () => {
  const ties = mergeParallelEdges([
    contract('c-1', 'a', 'b', 'task'),
    family('f-1', 'support', 'a', 'b'),
  ]);
  assert.equal(ties[0].edge.id, 'c-1', '契约优先于族边');
  const sameWeight = mergeParallelEdges([
    family('f-z', 'topic', 'a', 'b'),
    family('f-a', 'topic', 'a', 'b'),
  ]);
  assert.equal(sameWeight[0].edge.id, 'f-a', '同源同权重按 id 字典序，结果确定');
});

test('规则四：一条都不丢——画出的条数 + 被并的条数 = 输入条数', () => {
  const edges = [
    relation('r1', 'a', 'b', 'hardPrereq'),
    contract('c1', 'a', 'b', 'definition'),
    relation('r2', 'b', 'c', 'application'),
    contract('c2', 'b', 'c', 'deduction'),
    family('f1', 'evidence', 'c', 'a'),
  ];
  const merged = mergeParallelEdges(edges);
  const kept = merged.length;
  const hidden = merged.reduce((sum, item) => sum + item.merged.length, 0);
  assert.equal(kept + hidden, edges.length);
  assert.equal(new Set(merged.map((item) => [item.edge.from, item.edge.to].sort().join('~'))).size, merged.length, '每对只出现一次');
});

test('规则五：结果与输入顺序无关（确定性）', () => {
  const edges = [
    relation('r1', 'a', 'b', 'hardPrereq'),
    contract('c1', 'a', 'b', 'definition'),
    relation('r2', 'b', 'c', 'application'),
    contract('c2', 'b', 'c', 'deduction'),
  ];
  const forward = mergeParallelEdges(edges);
  const backward = mergeParallelEdges([...edges].reverse());
  const shape = (list) => list.map((item) => `${item.edge.id}<-${item.merged.map((edge) => edge.id).join(',')}`);
  assert.deepEqual(shape(forward), shape(backward));
});

test('真实数据：每个案例视图里同对边都被并成一条，且一条都没丢', async () => {
  const ontology = await loadOntology();
  const nodes = ontology.raw.nodes;
  const graph = {
    nodes: nodes.map((node) => ({ id: node.id, title: node.title, case: node.case, construct: node.construct, discipline: node.discipline, roles: node.roles ?? [], summary: node.summary ?? '', evidenceStatus: 'DEF', hasContent: false, actionCount: 0, relationCount: 0, evidenceCount: 0, granularity: node.granularity })),
    relations: ontology.raw.relationDescriptions,
    actions: ontology.raw.actions,
    aggregates: ontology.raw.aggregates,
    patterns: ontology.raw.patterns,
    support: ontology.raw.support,
    evidence: [],
  };
  let mergedPairs = 0;
  for (const caseId of ['limit', 'manifold', 'tensor', 'group', 'dg', 'liang', 'rudin']) {
    const added = new Set(nodes.filter((node) => node.case === caseId).map((node) => node.id));
    const edges = buildEdges(graph, added, ['contract', 'relation']);
    const merged = mergeParallelEdges(edges);
    const hidden = merged.reduce((sum, item) => sum + item.merged.length, 0);
    assert.equal(merged.length + hidden, edges.length, `${caseId} 合并时丢了边`);
    const pairs = merged.map((item) => [item.edge.from, item.edge.to].sort().join('~'));
    assert.equal(new Set(pairs).size, pairs.length, `${caseId} 仍有同一对节点的多条边`);
    mergedPairs += merged.filter((item) => item.merged.length > 0).length;
    // 每条被并掉的边都不比留下的重。
    for (const item of merged) {
      for (const edge of item.merged) {
        assert.ok(visualWeightOf(item.edge) >= visualWeightOf(edge),
          `${caseId}: ${edge.id} 比 ${item.edge.id} 更重却先画它`);
      }
    }
  }
  // 真实数据里确实存在「同对多条边」的情形——否则这条规则没有意义（本体一变就要回来看）。
  assert.ok(mergedPairs > 0, '真实数据里一对节点都没有多条边，合并规则没有被检验到');
});
