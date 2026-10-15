import test from 'node:test';
import assert from 'node:assert/strict';
import { loadOntology } from '../core/ontology.mjs';
import { MERGE_GROUPS, KEPT_SEPARATE, mergeAliasMap, mergeSummary } from '../data/merges.mjs';

/**
 * 同一对象的多处登记：合并的验收（2026-10）。
 *
 * 用户的要求是「有很多重复名字或话题高度重合的节点，合并它们」。合并的做法见
 * `data/merges.mjs`：装配期把同一对象的多处登记收成一个**规范节点**，其余登记逐字挂在
 * `node.registrations` 上。这一套测试钉住四件事：
 *
 * 1. **身份唯一**：被合并的 id 不再是节点，但别名解析得到规范节点（旧链接不 404）；
 * 2. **内容不丢**：每一处登记的标题、案例、形式负载与**正文块**都还在，正文长度不为零；
 * 3. **差别不抹平**：每一组都写着各处登记的差别；「明确不合并」的清单也逐条写着理由；
 * 4. **改写到底**：本体里再也找不到被合并 id 作为引用（关系端点、行动输入输出、证据、
 *    支持集、断言、误区锚点、聚合成员、节点内部锚点），一个漏网的都没有。
 *
 * 反面也钉住：`KEPT_SEPARATE` 里列的对**没有**被合并——它们是同一对象的不同构造、
 * 不同层或不同角色，合并会丢掉那一层的意思。
 */

const ontology = await loadOntology();
const raw = ontology.raw;
const merges = raw.merges;
const groupById = new Map(MERGE_GROUPS.map((group) => [group.id, group]));
const aliasOf = mergeAliasMap();

test('合并表本身自洽：规范节点存在、被合并的 id 不再出现、别名唯一', () => {
  assert.ok(merges, '本体里没有合并表');
  assert.equal(merges.version, '1');
  assert.equal(merges.groups.length, MERGE_GROUPS.length);
  assert.equal(Object.keys(merges.aliases).length, aliasOf.size);
  assert.ok(MERGE_GROUPS.length >= 20, `合并组偏少（${MERGE_GROUPS.length}）——重复登记不只这些`);

  const ids = new Set(raw.nodes.map((node) => node.id));
  for (const group of MERGE_GROUPS) {
    assert.ok(ids.has(group.canonical), `${group.id} 的规范节点不存在：${group.canonical}`);
    assert.ok(group.rationale.length >= 20, `${group.id} 没写清为什么是同一个对象`);
    assert.ok((group.differences ?? []).length > 0, `${group.id} 没有逐条写出各处登记的差别`);
    for (const line of group.differences) assert.ok(line.length >= 10, `${group.id} 的差别写得过短：${line}`);
    for (const id of group.absorbed) {
      assert.equal(ids.has(id), false, `${group.id} 的 ${id} 仍然是顶层节点（没有真的收口）`);
      assert.equal(merges.aliases[id], group.canonical, `${id} 的别名不指向 ${group.canonical}`);
      assert.equal(ontology.canonicalId(id), group.canonical, `别名解析不一致：${id}`);
      assert.equal(ontology.node(id).id, group.canonical, `旧 id 解析不到规范节点：${id}`);
      assert.equal(ontology.maybeNode(id)?.id, group.canonical);
    }
  }
  // 一个 id 只能被吸收一次（两份登记收口到一处，不能收口到两处）。
  assert.equal(aliasOf.size, new Set(MERGE_GROUPS.flatMap((group) => group.absorbed)).size);
  assert.equal(merges.groups.length, 31, `合并组数变了（${merges.groups.length}），请同步这条断言与 README 的口径`);
  assert.equal(aliasOf.size, 40, `被收口的登记数变了（${aliasOf.size}），请同步这条断言与 README 的口径`);
  assert.equal(mergeSummary(), '31 组、吸收 40 处登记');
});

test('内容不丢：每一处登记都逐字留着，连正文块一起', () => {
  let registrations = 0;
  let withBody = 0;
  for (const node of raw.nodes) {
    const absorbed = node.registrations ?? [];
    if (absorbed.length === 0) {
      assert.equal(node.mergeGroup, undefined, `${node.id} 标了合并组却没有登记`);
      continue;
    }
    assert.equal(node.mergeGroup, groupById.get(node.mergeGroup)?.id, `${node.id} 的合并组 id 无效`);
    const seen = new Set();
    for (const record of absorbed) {
      registrations += 1;
      assert.equal(seen.has(record.id), false, `${node.id} 的登记重复：${record.id}`);
      seen.add(record.id);
      assert.equal(record.mergedInto, node.id);
      assert.ok(record.title && record.title.length > 0, `${record.id} 没有标题`);
      assert.ok(record.discipline, `${record.id} 没有学科`);
      assert.ok(record.case, `${record.id} 没有案例`);
      assert.ok((node.cases ?? []).includes(record.case), `${node.id} 的 cases 缺少 ${record.case}`);
      assert.ok(record.summary !== undefined, `${record.id} 没有摘要字段`);
      assert.ok(record.formal && typeof record.formal === 'object', `${record.id} 的形式负载丢了`);
      assert.ok(record.provenance, `${record.id} 的来源登记丢了`);
      /*
       * 正文块：登记当时有正文的，合并后必须仍然读得到。
       * `contentRef === false` 是「显式声明没有内容块」（背景接口、只挂名字的骨架条目），
       * 那一类允许为空；其余一律不许空——空了就是合并把正文丢了。
       */
      if (record.contentRef === false) continue;
      assert.ok((record.contentMarkdown ?? '').length > 0,
        `${record.id} 的正文块丢了（contentRef=${record.contentRef ?? record.id}）——合并不能丢正文`);
      withBody += 1;
    }
  }
  assert.equal(registrations, aliasOf.size, '本体里的登记数与别名表不一致');
  assert.ok(withBody >= 20, `带正文的登记只有 ${withBody} 处，正文块多半没接上`);
});

test('改写到底：被合并的 id 不再作为任何引用出现在本体里', () => {
  const absorbedIds = new Set(Object.keys(merges.aliases));
  const hits = [];
  /*
   * `registrationOf` 是**归属记录**而不是引用：它写着「这条表征原本属于哪一处登记」，
   * 按定义就是被合并的 id（见 `core/ontology.mjs` 的 representations 一节）。除此之外，
   * 本体里不该再有任何一处提到被合并的 id。
   */
  const walk = (value, trail) => {
    if (typeof value === 'string') {
      if (absorbedIds.has(value)) hits.push(`${trail} = ${value}`);
      return;
    }
    if (Array.isArray(value)) {
      value.forEach((item, index) => walk(item, `${trail}[${index}]`));
      return;
    }
    if (value && typeof value === 'object') {
      for (const [key, item] of Object.entries(value)) {
        if (key === 'registrationOf') continue;
        walk(item, trail ? `${trail}.${key}` : key);
      }
    }
  };
  /*
   * 只扫**引用**，不扫 `registrations`：被合并的登记按定义就带着自己的原 id
   * （那是它的身份，不是悬空引用）。`merges` 报告同理——它记的就是这些 id。
   */
  const sections = {
    actions: raw.actions,
    relations: raw.relationDescriptions,
    evidence: raw.evidence,
    support: raw.support,
    claims: raw.claims,
    patterns: raw.patterns,
    aggregates: raw.aggregates,
    representations: raw.representations,
  };
  for (const [name, value] of Object.entries(sections)) walk(value, name);
  for (const node of raw.nodes) {
    const { registrations, ...rest } = node;
    walk(rest, `nodes.${node.id}`);
  }
  assert.deepEqual(hits.slice(0, 10), [], `本体里仍有被合并 id 的引用：\n${hits.slice(0, 10).join('\n')}`);

  // 关系三元组不因合并而重复，也不因合并而出现自环。
  const triples = new Set();
  for (const relation of raw.relationDescriptions) {
    assert.notEqual(relation.from, relation.to, `${relation.id} 因合并变成了自环`);
    const key = `${relation.from}|${relation.to}|${relation.kind}`;
    assert.equal(triples.has(key), false, `合并后出现重复三元组：${key}`);
    triples.add(key);
  }
  // 被收掉的关系在报告里有名有姓（自环 = 原本说明「两处登记关系」的边；重复 = 同一前置登记了两遍）。
  assert.ok(merges.sameObjectLinks.length > 0, '合并报告里没有记录被收掉的自环关系');
  assert.ok(merges.droppedDuplicates.length > 0, '合并报告里没有记录被去重的关系');
  for (const item of merges.sameObjectLinks) assert.ok(item.note.length > 0, `${item.id} 被收掉时没有留下依据`);
});

test('明确不合并的清单：每一对都还在，且写着理由', () => {
  const ids = new Set(raw.nodes.map((node) => node.id));
  assert.ok(KEPT_SEPARATE.length >= 6, `「不合并」清单偏短（${KEPT_SEPARATE.length}）`);
  for (const item of KEPT_SEPARATE) {
    assert.ok(item.reason.length >= 20, `${item.ids.join(' / ')} 没写清为什么不合并`);
    for (const id of item.ids) {
      const node = ontology.maybeNode(id);
      if (node) continue;
      // 允许写别名（例如历史名字），但必须在别名表里有解释。
      assert.ok(aliasOf.has(id), `${item.ids.join(' / ')} 里的 ${id} 既不是节点也不是别名`);
    }
  }
});

test('案例线不因合并而缺节点：登记归属与节点归属分开算', () => {
  const registrationById = new Map();
  for (const node of raw.nodes) {
    for (const record of node.registrations ?? []) registrationById.set(record.id, record);
  }
  for (const node of raw.nodes) {
    const cases = node.cases ?? [node.case];
    assert.ok(cases.includes(node.case), `${node.id} 的 cases 没有包含自己的案例`);
    assert.equal(new Set(cases).size, cases.length, `${node.id} 的 cases 有重复`);
  }
  /*
   * 精确口径：规范节点的 `cases` 恰好是「自身案例 ∪ 各处登记的案例」。
   * 不写成「节点数 + 登记数 = 案例条目总和」——同一个案例里的两处登记（例如 dg 的
   * `dg:manifold` 与 `dg:topological-manifold`）收口后只留一个案例名，那个和本来就会少。
   */
  for (const group of MERGE_GROUPS) {
    const node = ontology.node(group.canonical);
    const expected = new Set([node.case, ...group.absorbed.map((id) => registrationById.get(id)?.case)]);
    assert.deepEqual([...node.cases].sort(), [...expected].sort(),
      `${group.id} 的 cases 与登记的案例不一致`);
  }
  const registeredTotal = raw.nodes.reduce((sum, node) => sum + (node.cases ?? [node.case]).length, 0);
  assert.ok(registeredTotal >= raw.nodes.length, '登记总数不该小于节点数');
  assert.ok(registeredTotal <= raw.nodes.length + aliasOf.size, '登记总数不该超过「节点数 + 被收口的登记数」');
});
