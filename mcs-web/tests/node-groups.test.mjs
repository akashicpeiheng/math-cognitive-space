import test from 'node:test';
import assert from 'node:assert/strict';
import {
  NODE_GROUP_LABELS, NODE_GROUP_NOTES, NODE_GROUP_ORDER, groupOfNode,
} from '../web/src/node-groups.ts';

/**
 * 节点类别的划分。
 *
 * 这一套直接对应用户的报错：「选中『定义』类别怎么会是 0 个节点」。
 * 类别名必须与本体里真有的构造对得上，不能凭模板想象：
 *
 * - `data/authoring.mjs` 里 `definition()` / `term()` / `representationNode()` 模板都存在，
 *   但当前 232 个节点里这三类**一个都没有**（定义写在概念节点的正文里）；
 * - `MisconceptionPattern`（11 个节点）原先被塞进「例子与反例」，既不是例子也不是反例，
 *   本站把常见误解当一等对象，因此单独成组；
 * - 分组是**穷尽**的：`groupOfNode` 对任何构造都要给出一个组，不能掉进 `other` 里蒙混。
 */

/** 本体模板声明的构造类型（`labels.ts` 的 CONSTRUCT_LABELS 与 data/authoring.mjs 一致）。 */
const CONSTRUCTS = [
  'Symbol', 'Term', 'Concept', 'Definition', 'Claim', 'Proof', 'Example', 'Counterexample',
  'Problem', 'Theory', 'Construction', 'Method', 'Representation', 'MisconceptionPattern',
];

const node = (construct, roles = []) => ({
  id: `test:${construct}`, version: '1', title: construct, construct, roles,
  discipline: '测试', case: 'test', summary: '', evidenceStatus: null, hasContent: false,
  actionCount: 0, relationCount: 0, evidenceCount: 0,
});

test('每个构造类型都有确定的分组，没有落进 other 的漏网', () => {
  const groups = CONSTRUCTS.filter((construct) => construct !== 'MisconceptionPattern')
    .map((construct) => groupOfNode(node(construct)));
  assert.ok(groups.every((group) => group !== 'other'), `有构造落到 other：${JSON.stringify(CONSTRUCTS.map((c) => [c, groupOfNode(node(c))]))}`);
});

test('误区模式单独成组，不再混进「例子与反例」', () => {
  assert.equal(groupOfNode(node('MisconceptionPattern')), 'misconception');
  assert.equal(groupOfNode(node('Example')), 'example');
  assert.equal(groupOfNode(node('Counterexample')), 'example');
  assert.ok(NODE_GROUP_ORDER.includes('misconception'));
  assert.equal(NODE_GROUP_LABELS.misconception, '误区模式');
});

test('方法按角色分局部技巧与全局方法', () => {
  assert.equal(groupOfNode(node('Method', ['LocalMethod'])), 'method-local');
  assert.equal(groupOfNode(node('Method', ['GlobalMethod'])), 'method-global');
  // 没有任何方法角色时归到局部技巧，不凭空给它一个「全局」身份。
  assert.equal(groupOfNode(node('Method', [])), 'method-local');
});

test('概念组不谎称自己是「概念与定义」', () => {
  assert.equal(NODE_GROUP_LABELS.concept, '概念');
  // 说明里要交代清楚：本体没有单独的「定义」类别，筛选里也不会有这一项。
  assert.match(NODE_GROUP_NOTES.concept, /定义/);
  assert.match(NODE_GROUP_NOTES.concept, /0 个节点/);
});

test('每个分组都有标签与说明，顺序与标签一一对应', () => {
  for (const group of NODE_GROUP_ORDER) {
    assert.ok(NODE_GROUP_LABELS[group]?.length > 0, `${group} 缺标签`);
    assert.ok(NODE_GROUP_NOTES[group]?.length > 0, `${group} 缺说明`);
  }
  assert.equal(new Set(Object.values(NODE_GROUP_LABELS)).size, Object.keys(NODE_GROUP_LABELS).length, '标签有重复');
});

test('分类只读 construct 与 roles，不看别的字段', () => {
  // 同一构造、不同标题/摘要/洞见字段，分组必须一致——分类不猜。
  const base = node('Claim');
  const renamed = { ...base, title: '完全不同的标题', summary: '完全不同的摘要', discipline: '别的学科' };
  assert.equal(groupOfNode(base), groupOfNode(renamed));
});
