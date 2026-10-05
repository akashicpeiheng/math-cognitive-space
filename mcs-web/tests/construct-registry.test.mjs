import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { MCS_WEB_ROOT, loadOntology } from '../core/ontology.mjs';
import { FORMATION_CHECKS } from '../core/formation.mjs';
import { CONSTRUCTS, ROLES } from '../shared/contracts.mjs';

/**
 * 构造类型的登记约定（2026-10 加，第二十八轮留下的欠账）。
 *
 * 那一轮的报错是「选中『定义』类别怎么能显示 0 个节点」。当轮的修法是让界面**如实说明**：
 * 「本体里还没有登记这几种构造：项、定义、表征」。这句话把两件事混成一件——
 * 界面上没有这一类**节点**，不等于本站没有登记这类**内容**。
 *
 * 这一轮把约定写清楚（README 的「构造类型的登记约定」）：
 *
 * - `Definition`：定义写在概念节点的负载与正文里（`formal.predicate` 就是定义式）；
 *   定义性依赖由 `hardPrereq` 的 `definitional-dependency` 见证显式指出「依据在定义的哪一处」；
 * - `Term`：项写在 `signature.constants` 与各节点的 `formal.typeEnv` 里，由类型检查器核验；
 * - `Representation`：表征写成节点内的 `representations` 子记录（不是独立节点）。
 *
 * 也就是说：**这三类内容都有登记，但不作为独立节点**——这是本站的选择，界面必须照着说，
 * 不能再说「还没有登记」（那是失实的）。
 */
const ontology = await loadOntology();
const nodes = ontology.raw.nodes;

test('三种构造确实没有独立节点（约定的事实部分）', () => {
  for (const construct of ['Definition', 'Term', 'Representation']) {
    const count = nodes.filter((node) => node.construct === construct).length;
    assert.equal(count, 0, `${construct} 已经有独立节点了；请更新 README 的登记约定与界面文案`);
  }
  const definitionRoles = nodes.filter((node) => (node.roles ?? []).includes('Definition')).length;
  assert.equal(definitionRoles, 0, 'role=Definition 也该是 0（定义写在概念节点的负载里）');
});

test('三类内容各自的去处都能在数据里核对到', () => {
  // Definition：定义性依赖必须指名「依据在定义的哪一处」。
  const definitional = ontology.raw.relationDescriptions.filter(
    (relation) => relation.witness?.type === 'definitional-dependency',
  );
  assert.ok(definitional.length >= 50, `definitional-dependency 太少：${definitional.length}`);
  for (const relation of definitional) {
    assert.ok((relation.witness.scope ?? '').length >= 10, `${relation.id} 没写清依据在定义的哪一处`);
  }
  // Term：签名常元与节点类型环境。
  assert.ok(ontology.raw.signature.constants.length >= 5, '签名常元太少');
  const withTypeEnv = nodes.filter((node) => Object.keys(node.formal?.typeEnv ?? {}).length > 0);
  assert.ok(withTypeEnv.length >= 10, `带类型环境的节点太少：${withTypeEnv.length}`);
  // Representation：节点内的表征子记录。
  const representations = ontology.raw.representations ?? [];
  assert.ok(representations.length >= 20, `表征子记录太少：${representations.length}`);
  for (const record of representations) {
    assert.ok(record.id && record.node, '表征子记录必须带 id 与所属节点');
  }
});

test('形成检查仍然支持这三类：将来要登记成节点时不必改检查器', () => {
  for (const construct of ['Definition', 'Term', 'Representation']) {
    assert.ok(CONSTRUCTS.includes(construct), `${construct} 不在构造表里`);
    assert.ok(Array.isArray(FORMATION_CHECKS[construct]) && FORMATION_CHECKS[construct].length >= 3,
      `${construct} 的形成检查字段不足`);
  }
  assert.ok(ROLES.includes('Definition'), 'Definition 角色应当保留在角色表里');
});

test('README 写明了约定与去处，且界面文案不再说「还没有登记」', () => {
  const readme = readFileSync(resolve(MCS_WEB_ROOT, 'README.md'), 'utf8');
  assert.match(readme, /构造类型的登记约定/, 'README 缺少「构造类型的登记约定」一节');
  assert.match(readme, /signature\.constants/, 'README 没有写清「项」登记在哪里');
  assert.match(readme, /representations` 子记录/, 'README 没有写清「表征」登记在哪里');
  assert.match(readme, /写在\*\*概念节点的负载与正文\*\*里/, 'README 没有写清「定义」登记在哪里');

  /*
   * 界面文案：两处 `facet-absent` 说明都必须改口径。
   * 这里扫源码而不是扫页面（页面要走浏览器），所以断言的是**措辞**：
   * 旧文案「本体里还没有登记这几种构造」不许再出现。
   */
  for (const file of ['web/src/pages/NodeListPage.tsx', 'web/src/pages/NetworkPage.tsx']) {
    const source = readFileSync(resolve(MCS_WEB_ROOT, file), 'utf8');
    assert.ok(!source.includes('本体里还没有登记这几种构造'),
      `${file} 仍在说「本体里还没有登记这几种构造」——那是失实的（内容登记了，只是不作为独立节点）`);
    assert.ok(source.includes('登记约定') || source.includes('没有把这三种内容登记成'),
      `${file} 没有说明这三类内容的去处`);
  }
});
