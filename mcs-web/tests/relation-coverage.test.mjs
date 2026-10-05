import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { MCS_WEB_ROOT, loadOntology } from '../core/ontology.mjs';
import { CONSTRUCTS } from '../shared/contracts.mjs';
import {
  RELATIONLESS_CLASSES, PENDING_RELATION_REGISTRATION,
  relationCoverage, relationCoverageProblems, classifyRelationless,
} from '../data/relation-coverage.mjs';

/**
 * 无关系节点的清单与原因分类（2026-10 加）。
 *
 * 「一百多个节点没有任何关系」这句话本身没有信息量：要能分清
 * **设计如此**（背景接口 / 线索层 / 由契约引入）与**欠账**（尚待登记），
 * 而**完全孤立**（既无关系也无契约）是缺陷，必须为 0。
 *
 * 这一套断言四件事：
 * 1. 每个无关系节点都有分类与说明；
 * 2. 没有完全孤立的节点；
 * 3. 「尚待登记」清单与数据一致（已经补上关系的条目必须从清单里删掉，清单不能指向不存在的节点）；
 * 4. 分类只读数据（关系端点、契约端点、粒度、构造），不写死节点名单。
 */
const ontology = await loadOntology();
const nodes = ontology.raw.nodes;
const relations = ontology.raw.relationDescriptions;
const actions = ontology.raw.actions;

test('无关系节点全部有分类与说明', () => {
  const report = relationCoverage(nodes, relations, actions);
  assert.ok(report.relationless > 0, '本体里应当还有无关系节点（背景接口与线索层）');
  assert.equal(report.relationless + report.withRelations, report.totalNodes);
  for (const item of report.items) {
    assert.ok(item.cls, `${item.id} 没有分类`);
    assert.ok(RELATIONLESS_CLASSES.some((entry) => entry.id === item.cls), `${item.id} 的分类未知：${item.cls}`);
    assert.ok((item.why ?? '').length >= 8, `${item.id} 没有说明`);
  }
});

test('没有完全孤立的节点（既无关系也无契约）', () => {
  const report = relationCoverage(nodes, relations, actions);
  const isolated = report.items.filter((item) => item.cls === 'isolated');
  assert.deepEqual(isolated.map((item) => item.id), [], '存在完全孤立的节点：' + isolated.map((item) => item.id).join('、'));
});

test('背景接口、线索层、契约引入三类都由规则判定，不是写死的名单', () => {
  const report = relationCoverage(nodes, relations, actions);
  for (const item of report.items) {
    if (item.cls === 'background') assert.ok(item.id.startsWith('bg:'), `${item.id} 不是背景节点却归到背景类`);
    if (item.cls === 'thread') assert.equal(item.granularity, 'topic', `${item.id} 不是话题级条目却归到线索层`);
    if (item.cls === 'contract-only') assert.equal(item.hasContract, true, `${item.id} 没有契约却归到「由契约引入」`);
  }
  // 分类函数本身：没有契约又没有登记的节点是缺陷类。
  assert.equal(classifyRelationless({ id: 'x:y', granularity: 'unit', construct: 'Concept' }, { hasContract: false }), 'isolated');
  assert.equal(classifyRelationless({ id: 'x:y', granularity: 'unit', construct: 'Concept' }, { hasContract: true }), 'pending');
  assert.equal(classifyRelationless({ id: 'x:y', granularity: 'unit', construct: 'Method' }, { hasContract: true }), 'contract-only');
  assert.equal(classifyRelationless({ id: 'bg:x', granularity: 'unit', construct: 'Theory' }, { hasContract: false }), 'background');
});

test('「尚待登记」清单与数据一致：已补上关系的必须删掉，清单不得指向不存在的节点', () => {
  const problems = relationCoverageProblems(nodes, relations);
  assert.deepEqual(problems, [], problems.join('；'));
  assert.ok(Object.keys(PENDING_RELATION_REGISTRATION).length > 0, '待办清单不该是空的（否则这个类名就没有意义）');
  const report = relationCoverage(nodes, relations, actions);
  const pendingIds = report.items.filter((item) => item.cls === 'pending').map((item) => item.id).sort();
  for (const id of pendingIds) {
    // 「尚待登记」必须逐条写明欠什么，不能借分类说明糊过去——
    // 这一类的清单就是待办，条目越具体越有用。
    assert.ok(PENDING_RELATION_REGISTRATION[id], `${id} 被判成「尚待登记」却没有写明欠什么`);
  }
});

test('「尚待登记」这一类在缩小：本轮为五个案例补登记了硬前置', () => {
  const report = relationCoverage(nodes, relations, actions);
  // 无关系节点的总数在补登记后应当明显少于 136（更早记录里的数字，当时还没有这些关系）。
  assert.ok(report.relationless < 136, `无关系节点仍有 ${report.relationless} 个，硬前置的补登记没有生效`);
  // 且每个案例的「尚待登记」都不该超过它的单元数。
  for (const [caseId, counts] of Object.entries(report.byCase)) {
    const units = nodes.filter((node) => node.case === caseId && node.granularity !== 'topic').length;
    assert.ok((counts.pending ?? 0) <= units, `${caseId} 的待登记数 ${counts.pending} 超过单元数 ${units}`);
  }
});

test('三类「与数据无关」的说明都写清了理由（不是一句「设计如此」）', () => {
  const byId = new Map(RELATIONLESS_CLASSES.map((entry) => [entry.id, entry]));
  for (const id of ['background', 'thread', 'contract-only', 'pending', 'isolated']) {
    const entry = byId.get(id);
    assert.ok(entry, `缺少分类说明：${id}`);
    assert.ok(entry.title.length >= 2 && entry.note.length >= 20, `分类 ${id} 的说明太短`);
  }
  // README 里也要有这一节（否则界面上看不到分类的口径）。
  const readme = readFileSync(resolve(MCS_WEB_ROOT, 'README.md'), 'utf8');
  assert.match(readme, /无关系节点的分类/, 'README 缺少「无关系节点的分类」一节');
});

test('三处分类与构造类型一致：Method / Problem / MisconceptionPattern / Proof 不可能是 pending', () => {
  const report = relationCoverage(nodes, relations, actions);
  for (const item of report.items.filter((entry) => entry.cls === 'pending')) {
    assert.ok(['Concept', 'Claim', 'Construction', 'Theory', 'Symbol'].includes(item.construct),
      `${item.id}（${item.construct}）不该落在「尚待登记」`);
  }
  // 构造类型必须在受控表里（防止分类规则读到拼错的构造名）。
  for (const item of report.items) assert.ok(CONSTRUCTS.includes(item.construct), `${item.id} 的构造无效：${item.construct}`);
});
