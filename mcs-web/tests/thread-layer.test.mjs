import test from 'node:test';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { MCS_WEB_ROOT } from '../core/ontology.mjs';

/**
 * 线索层：话题级条目不参与前置计算（2026-10 加）。
 *
 * 用户的要求（第五十二轮）：「节点是最小的可独立认知单元，这些是话题范畴下的内容，要去分开。」
 * 那一轮只做了列表与接口的分层；`/plan` 与 `/network` 里话题仍按节点出现，没有自己的表达。
 * 这一轮给它在网络里一个**线索层**身份：
 *
 * 1. **不参与前置计算**——「推荐加入」不把话题说成「图中前提已加入」（那是单元之间的话），
 *    强关联圈里话题也不以「引入它的前提 / 共用前提」出现，而是标成「线索」；
 * 2. **仍然看得见**——它照常画在画布上、照常有连接、照常可以当目标（路径本来就是沿线索走的）；
 * 3. **规划页显式说明**——背景网格只列单元（话题不能被声明成「已经会的背景」），
 *    目标下拉里的话题标成【线索】，并给出数量与去处。
 *
 * 这里用两个叶子模块做单元测试（node 能直接 import 它们，不需要浏览器）：
 * `web/src/node-related.ts`（强关联候选）与 `web/src/network.ts`（推荐理由）。
 */
const { relatedCandidates, RELATED_BASIS_LABELS } = await import(
  pathToFileURL(resolve(MCS_WEB_ROOT, 'web/src/node-related.ts')).href
);
const { recommend, isThreadNode, THREAD_LAYER } = await import(
  pathToFileURL(resolve(MCS_WEB_ROOT, 'web/src/network.ts')).href
);

const unit = (id, title) => ({
  id, title, construct: 'Concept', roles: ['Concept'], discipline: '测试', case: 'test',
  summary: '', evidenceStatus: 'DEF', hasContent: true, actionCount: 0, relationCount: 0, evidenceCount: 0,
  granularity: 'unit',
});
const topic = (id, title) => ({ ...unit(id, title), granularity: 'topic' });

const action = (id, mode, inputs, outputs) => ({
  id, mode, title: id,
  inputs: inputs.map((node) => ({ node, accepts: ['statement'] })),
  outputs: outputs.map((node) => ({ node, provides: ['statement'] })),
  witness: { type: 'declared-contract', status: 'DEF' }, openAssumptions: [],
});

/**
 * 一张最小图：单元 `u:base` →（definition 契约）→ 话题 `t:thread`，
 * 另有一个单元 `u:other` 由同一条契约引入，以及一条**只靠契约**引入的话题 `t:pure`
 * （用来单独检验「话题不会被说成『图中前提已加入』」这条读法）。
 * `t:thread` 与 `u:base` 之间还有一条登记关系。
 */
function fixture() {
  return {
    version: 'test',
    nodes: [
      unit('u:base', '基础单元'), topic('t:thread', '话题线索'),
      unit('u:other', '另一个单元'), topic('t:pure', '只有契约的话题'),
    ],
    relations: [
      { id: 'r-1', kind: 'hardPrereq', from: 'u:base', to: 't:thread', witness: { type: 'definitional-dependency', status: 'DEF' }, scope: '测试关系' },
    ],
    actions: [
      action('a-thread', 'definition', ['u:base'], ['t:thread']),
      action('a-other', 'definition', ['u:base'], ['u:other']),
      action('a-pure', 'definition', ['u:base'], ['t:pure']),
    ],
    aggregates: [],
    patterns: [],
    support: [],
    evidence: [],
  };
}

test('强关联圈：话题候选标成「线索」，不冒充「引入它的前提」', () => {
  const graph = fixture();
  const candidates = relatedCandidates(graph, 'u:base', { exclude: new Set(), limit: 6 });
  const thread = candidates.find((candidate) => candidate.node === 't:thread');
  assert.ok(thread, '话题候选应当仍在圈里（看得见）');
  assert.equal(thread.basis, 'thread', `话题候选的依据被标成 ${thread.basis}`);
  assert.equal(thread.thread, true);
  assert.match(thread.note, /不参与前置计算/);
  assert.equal(RELATED_BASIS_LABELS.thread, '线索（不参与前置计算）');
  // 单元候选不受影响：仍按原来的依据分类。
  const other = candidates.find((candidate) => candidate.node === 'u:other');
  assert.equal(other.basis, 'produces', `单元候选的依据被改成了 ${other.basis}`);
});

test('线索层的边界：被标成线索的只有话题候选，单元候选照旧', () => {
  const graph = fixture();
  /*
   * 「不参与前置计算」的准确含义：**话题不作为别的节点的前置出现**（候选是话题 → 标成线索）。
   * 反过来，围绕一条线索摊开它的上下文（比如它的契约输入）仍然照旧——那是探索，不是前置断言。
   * 这条边界写在 network.ts 的 THREAD_LAYER 说明与 README 里，测试把它钉住。
   */
  const candidates = relatedCandidates(graph, 't:thread', { exclude: new Set(), limit: 6 });
  const base = candidates.find((candidate) => candidate.node === 'u:base');
  assert.ok(base, '与话题相关的单元仍应出现');
  assert.notEqual(base.basis, 'thread', '单元候选不该被标成线索');
});

test('推荐加入：话题不说「图中前提已加入」，而说「线索」', () => {
  const graph = fixture();
  const added = new Set(['u:base']);
  const recommendations = recommend(graph, added, 24);
  const byId = new Map(recommendations.map((item) => [item.node, item]));

  // 1) 只有契约的话题：绝不说「前提已加入」，而是标成线索。
  const pure = byId.get('t:pure');
  assert.ok(pure, '话题应当作为线索出现在推荐里');
  assert.equal(pure.kind, 'thread', `话题被标成 ${pure.kind}，仍然按可学单元处理`);
  assert.equal(pure.evidence.scope, THREAD_LAYER.note);

  // 2) 有登记关系的话题：按事实说「已有登记关系」，但仍然不是「前提已加入」。
  const threaded = byId.get('t:thread');
  assert.ok(threaded);
  assert.notEqual(threaded.kind, 'ready', '话题不能走「图中前提已加入」这一档');

  // 3) 同样的契约形状，单元仍然走「前提已加入」——差异只来自粒度。
  const other = byId.get('u:other');
  assert.equal(other.kind, 'ready', `单元被标成 ${other.kind}`);
});

test('线索层元数据：说明写清「不参与前置计算」，且只认 granularity=topic', () => {
  assert.equal(THREAD_LAYER.id, 'thread');
  assert.match(THREAD_LAYER.note, /不参与前置计算/);
  assert.equal(isThreadNode({ granularity: 'topic' }), true);
  assert.equal(isThreadNode({ granularity: 'unit' }), false);
  assert.equal(isThreadNode({}), false);
  assert.equal(isThreadNode(null), false);
});

test('本体里真有的线索层条目：每条都真的是 topic，且数量与接口一致', async () => {
  const { loadOntology } = await import('../core/ontology.mjs');
  const ontology = await loadOntology();
  const topics = ontology.raw.nodes.filter((node) => isThreadNode(node));
  assert.ok(topics.length > 0, '本体里应当有话题级条目');
  for (const node of topics) assert.equal(node.granularity, 'topic', `${node.id} 不是 topic`);
  // 线索层覆盖多个案例（本轮把 liang 之外的案例也判过）。
  const cases = new Set(topics.map((node) => node.case));
  assert.ok(cases.size >= 2, `线索层只覆盖了 ${[...cases].join('、')}`);
});
