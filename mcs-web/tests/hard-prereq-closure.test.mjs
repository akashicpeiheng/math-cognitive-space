import test from 'node:test';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { MCS_WEB_ROOT, loadOntology } from '../core/ontology.mjs';

/**
 * 硬前置闭包（2026-10 加，`web/src/hard-prereq-closure.ts`）。
 *
 * 网络视图的右键菜单里有一项「加入全部硬前置」——它不是「把所有硬前置边画出来」，
 * 而是「把这个节点需要先会的对象**一次**放进视图」。这一套把那条算法单独钉住：
 *
 * 1. **方向**：只沿 `to → from` 走；反向的一般化 / 应用 / 跨域边不算前置；
 * 2. **传递**：前置的前置也要（这是「全部」的含义），同一节点只出现一次；
 * 3. **确定性**：同一份数据两次调用逐字相同（视图不会因为重算而抖）；
 * 4. **成环也不死**：数据里不该有环，但真出现时按「已访问」停下，不无限展开；
 * 5. **撞上限要如实说**：`truncated` 为 true，界面据此说明「只加了前 N 个」。
 */
const { hardPrereqClosure, missingFromClosure, HARD_PREREQ_KIND } = await import(
  pathToFileURL(resolve(MCS_WEB_ROOT, 'web/src/hard-prereq-closure.ts')).href
);

const ontology = await loadOntology();
const relations = ontology.raw.relationDescriptions;

test('真实本体：闭包 = 全部传递硬前置，方向只沿 to → from', () => {
  const closure = hardPrereqClosure(relations, 'top:topological-manifold');
  const nodes = new Set(closure.entries.map((entry) => entry.node));

  // 与「反复取直接前置直到不动点」的朴素写法对照：两者必须一致。
  const expected = new Set();
  let frontier = ['top:topological-manifold'];
  while (frontier.length) {
    const next = [];
    for (const node of frontier) {
      for (const relation of relations) {
        if (relation.kind !== HARD_PREREQ_KIND || relation.to !== node) continue;
        if (expected.has(relation.from) || relation.from === 'top:topological-manifold') continue;
        expected.add(relation.from);
        next.push(relation.from);
      }
    }
    frontier = next;
  }
  assert.deepEqual([...nodes].sort(), [...expected].sort());

  // 直接前置（拓扑空间指着拓扑流形）与间接前置（集合语言是拓扑空间的前置）都要在。
  assert.equal(nodes.has('top:space'), true, '直接前置没有收进来');
  assert.equal(closure.entries.find((entry) => entry.node === 'top:space').depth, 1);
  assert.equal(nodes.has('bg:set:function'), true, '间接前置没有收进来');
  assert.ok(closure.entries.find((entry) => entry.node === 'bg:set:function').depth >= 2);
  // 起点自己不是自己的前置。
  assert.equal(nodes.has('top:topological-manifold'), false);
  // 反向边不算前置：`top:differentiable-manifold` 是它的一般化目标，不是前置。
  assert.equal(nodes.has('top:differentiable-manifold'), false);
  // 一般化 / 应用 / 跨域这些边一条都不该被当成前置。
  const kinds = new Set(relations.filter((relation) => relation.kind === HARD_PREREQ_KIND).map((relation) => relation.kind));
  assert.deepEqual([...kinds], [HARD_PREREQ_KIND]);
});

test('真实本体：每个登记了硬前置的节点都能算出闭包，且深度分层正确', () => {
  const targets = [...new Set(relations.filter((relation) => relation.kind === HARD_PREREQ_KIND).map((relation) => relation.to))];
  assert.ok(targets.length >= 50, `登记了硬前置的节点只有 ${targets.length} 个`);
  for (const root of targets) {
    const closure = hardPrereqClosure(relations, root);
    assert.ok(closure.entries.length >= 1, `${root} 的闭包是空的`);
    assert.equal(closure.truncated, false, `${root} 的闭包被上限截断了`);
    // 每个节点的深度 = 它到起点的最短硬前置距离：逐条核对，不靠算法自证。
    const distance = new Map([[root, 0]]);
    let frontier = [root];
    while (frontier.length) {
      const next = [];
      for (const node of frontier) {
        for (const relation of relations) {
          if (relation.kind !== HARD_PREREQ_KIND || relation.to !== node) continue;
          if (distance.has(relation.from)) continue;
          distance.set(relation.from, distance.get(node) + 1);
          next.push(relation.from);
        }
      }
      frontier = next;
    }
    for (const entry of closure.entries) {
      assert.equal(entry.depth, distance.get(entry.node), `${root} → ${entry.node} 的深度不对`);
      assert.ok(entry.via.length >= 1, `${root} → ${entry.node} 没有写明来源`);
      for (const via of entry.via) assert.equal(distance.get(via), entry.depth - 1);
    }
  }
});

test('同一份数据两次调用逐字相同（视图不会因为重算而抖）', () => {
  const first = hardPrereqClosure(relations, 'top:compactness');
  const second = hardPrereqClosure(relations, 'top:compactness');
  assert.deepEqual(first, second);
  assert.deepEqual(first.entries.map((entry) => entry.node), second.entries.map((entry) => entry.node));
});

test('合成夹具：成环不死、自环不算前置、上限如实标记', () => {
  const cyclic = [
    { kind: 'hardPrereq', from: 'b', to: 'a' },
    { kind: 'hardPrereq', from: 'c', to: 'b' },
    { kind: 'hardPrereq', from: 'a', to: 'c' },
    { kind: 'hardPrereq', from: 'a', to: 'a' },
  ];
  const closure = hardPrereqClosure(cyclic, 'a');
  assert.deepEqual(closure.entries.map((entry) => entry.node), ['b', 'c']);
  assert.equal(closure.maxDepth, 2);
  assert.equal(closure.truncated, false);

  const limited = hardPrereqClosure(cyclic, 'a', { limit: 1 });
  assert.equal(limited.entries.length, 1);
  assert.equal(limited.truncated, true);

  // 别的种类不进来。
  const mixed = [
    { kind: 'scaling', from: 'x', to: 'a' },
    { kind: 'application', from: 'y', to: 'a' },
    { kind: 'hardPrereq', from: 'z', to: 'a' },
  ];
  assert.deepEqual(hardPrereqClosure(mixed, 'a').entries.map((entry) => entry.node), ['z']);
  // 没有硬前置时是空闭包，而不是报错。
  assert.deepEqual(hardPrereqClosure(mixed, 'z').entries, []);
});

test('缺的那些：闭包减去视图里已有的，顺序保持闭包的顺序', () => {
  const closure = hardPrereqClosure(relations, 'top:topological-manifold');
  const all = closure.entries.map((entry) => entry.node);
  assert.deepEqual(missingFromClosure(closure, new Set()), all);
  const present = new Set(all.slice(0, 2));
  assert.deepEqual(missingFromClosure(closure, present), all.slice(2));
  assert.deepEqual(missingFromClosure(closure, new Set(all)), []);
});
