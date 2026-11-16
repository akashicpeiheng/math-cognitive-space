import test from 'node:test';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { MCS_WEB_ROOT, loadOntology } from '../core/ontology.mjs';

/**
 * 按关系种类收集直接相连的对象（2026-10-23 加，`web/src/relation-objects.ts`）。
 *
 * 这条功能回答的是「跟它登记了某一类关系的都有谁」：对偶、放缩、应用、跨域……
 * 与硬前置闭包的分工是**双向、只走一跳**。这一套把判据单独钉住：
 *
 * 1. **双向**：从关系的任一端看，另一端都是相关对象；
 * 2. **只走一跳**：不做传递——放缩对象的放缩对象不进来；
 * 3. **同一种关系去重**：同一节点经两个方向或多条同类关系连进来，只出现一次；
 * 4. **确定性**：组与组内顺序按登记顺序，两次调用逐字相同；
 * 5. **不特判种类**：hardPrereq、noteReference、未知 kind 都照常返回，由界面决定怎么用。
 */
const { relationObjectsByKind } = await import(
  pathToFileURL(resolve(MCS_WEB_ROOT, 'web/src/relation-objects.ts')).href
);

const ontology = await loadOntology();
const relations = ontology.raw.relationDescriptions;

/** 把分组结果折成 kind -> nodes，方便断言。 */
function asMap(groups) {
  return Object.fromEntries(groups.map((group) => [group.kind, group.nodes]));
}

test('真实本体：对偶关系从两端都能收到对方', () => {
  const fromProduct = asMap(relationObjectsByKind(relations, 'tensor:tensor-product'));
  const fromDual = asMap(relationObjectsByKind(relations, 'tensor:dual'));
  assert.deepEqual(fromProduct.duality, ['tensor:dual']);
  assert.deepEqual(fromDual.duality, ['tensor:tensor-product']);
});

test('真实本体：放缩、应用、跨域都按种类分组，且只收直接相连的对象', () => {
  const groups = asMap(relationObjectsByKind(relations, 'top:topological-manifold'));
  // 这条关系是 top:topological-manifold → top:differentiable-manifold（特化方向）。
  assert.deepEqual(groups.scaling, ['top:differentiable-manifold']);
  assert.deepEqual(groups.application, ['top:pattern-local-euclidean']);
  assert.deepEqual(groups.crossDomain, ['tensor:bundle']);
  // 硬前置也照常出现在分组里；界面另外用「一阶 / 全部」两项，不把它丢掉。
  assert.ok((groups.hardPrereq ?? []).includes('top:space'));

  // 紧凑性：从紧致性沿放缩关系直接相连的对象有很多，但它们都是**一跳**；
  // 这些对象的对象不应被这条请求带进来。
  const compact = asMap(relationObjectsByKind(relations, 'top:compactness'));
  assert.ok((compact.scaling ?? []).length >= 5, `紧致性的放缩对象只有 ${(compact.scaling ?? []).length} 个`);
  assert.ok(compact.scaling.includes('top:sequentially-compact'));
  assert.ok(compact.scaling.includes('top:locally-compact'));
  // 隔一跳的对象不在这一组里（例如从局部紧再往下的对象）。
  const localCompact = asMap(relationObjectsByKind(relations, 'top:locally-compact'));
  const beyond = (localCompact.scaling ?? []).filter((id) => compact.scaling.includes(id));
  assert.deepEqual(beyond, [], `出现了传递对象：${beyond.join(', ')}`);
});

test('合成夹具：双向、去重、只走一跳、自环与空字段跳过', () => {
  const fixture = [
    { kind: 'scaling', from: 'b', to: 'a' },
    { kind: 'scaling', from: 'c', to: 'a' },
    { kind: 'scaling', from: 'a', to: 'b' }, // 同一节点、反方向：去重
    { kind: 'scaling', from: 'b', to: 'c' }, // 放缩对象的对象：不进来
    { kind: 'application', from: 'a', to: 'd' },
    { kind: 'mystery', from: 'e', to: 'a' },
    { kind: 'scaling', from: 'a', to: 'a' }, // 自环
    { kind: '', from: 'f', to: 'a' },
    { kind: 'scaling', from: '', to: 'a' },
  ];
  const groups = relationObjectsByKind(fixture, 'a');
  assert.deepEqual(asMap(groups), {
    scaling: ['b', 'c'],
    application: ['d'],
    mystery: ['e'],
  });
  // 反向看也一样：c ↔ a 的两条同类关系只算一次。
  assert.deepEqual(asMap(relationObjectsByKind(fixture, 'b')).scaling, ['a', 'c']);
  // 组顺序按首次出现的登记顺序。
  assert.deepEqual(groups.map((group) => group.kind), ['scaling', 'application', 'mystery']);
});

test('同一份数据两次调用逐字相同；没有关系时是空数组', () => {
  const first = relationObjectsByKind(relations, 'top:compactness');
  const second = relationObjectsByKind(relations, 'top:compactness');
  assert.deepEqual(first, second);
  assert.deepEqual(relationObjectsByKind(relations, 'no:such:node'), []);
  assert.deepEqual(relationObjectsByKind([], 'a'), []);
});
