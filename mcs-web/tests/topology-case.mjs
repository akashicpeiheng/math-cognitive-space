import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { MCS_WEB_ROOT, loadOntology } from '../core/ontology.mjs';
import { relationCoverage } from '../data/relation-coverage.mjs';
import { checkFormation } from '../core/formation.mjs';

/**
 * 点集拓扑案例（第八个案例 `top`）的验收。
 *
 * 这个案例的需求是用户点名的 **12 项**（拓扑空间、可数公理、分离公理、同胚、紧、仿紧、
 * σ-紧、连通性、拓扑流形、微分流形、坐标卡、图册）。测试把「12 项 → 节点」的映射
 * 写成断言，免得以后某次重构把其中一项悄悄并掉或改名：
 *
 * 1. 12 项各有一个 Concept 节点，id 前缀是 `top:`，且 id 只含 `core/ontology.mjs`
 *    的 `NODE_BLOCK` 允许的字符（`[A-Za-z0-9:._-]+`）；
 * 2. 除用户点名的 12 项之外，本案例另有**辅助前置**（连续映射、度量空间）与
 *    断言 / 反例 / 例子 / 误区 / 方法 / 理论节点——它们的差别显式列出，不混进 12 项；
 * 3. 每个 Concept / Claim 至少是一条语义关系的端点（不许出现「尚待登记」的新欠账）；
 * 4. 每个节点都有产出它的行动契约（否则网络视图里引入不了）；
 * 5. 反例节点必须带失败见证与「否定范围」，且范围里写明它**没有**否定什么；
 * 6. 正文块与节点一一对应，站内链接都能解析；
 * 7. 证据一律 `prose-proof` / `not_run`，`obligations` 写明未编码为 ND 证书。
 */

const ontology = await loadOntology();
const nodes = ontology.raw.nodes.filter((node) => node.case === 'top');
const byId = new Map(nodes.map((node) => [node.id, node]));
const allIds = new Set(ontology.raw.nodes.map((node) => node.id));
const actions = ontology.raw.actions.filter((action) => action.id.startsWith('a-top:'));
const relations = ontology.raw.relationDescriptions.filter((relation) => {
  const own = (id) => id.startsWith('bg:') || id.startsWith('top:');
  return own(relation.from) || own(relation.to);
});
const evidence = ontology.raw.evidence.filter((record) => record.id.startsWith('ev-top-'));

/** 用户点名的 12 项：id 与它对应的中文名（名只用于失败信息，不参与判定）。 */
const REQUIRED_TWELVE = [
  ['top:space', '拓扑空间'],
  ['top:countability-axioms', '可数公理'],
  ['top:separation-axioms', '分离公理'],
  ['top:homeomorphism', '同胚'],
  ['top:compactness', '紧'],
  ['top:paracompactness', '仿紧'],
  ['top:sigma-compact', 'σ-紧'],
  ['top:connectedness', '连通性'],
  ['top:topological-manifold', '拓扑流形'],
  ['top:differentiable-manifold', '微分流形'],
  ['top:coordinate-chart', '坐标卡'],
  ['top:atlas', '图册'],
];

/**
 * 辅助前置：不在用户点名的 12 项之内，但本案例自足所需（跨案例的登记不在硬前置里，见 README）。
 *
 * 2026-10 加了后两个：**序列紧**与**局部紧**原来只出现在正文里，而关系却拿它们当理由
 * （「局部紧 Hausdorff ⇒ T3」「紧 ⇔ 序列紧（度量）」），锚点不是节点的话那些边在图上是悬空的。
 * 判据因此是「被关系引用 ⇒ 必须是节点」，不是「重要 ⇒ 必须是节点」。
 */
const AUXILIARY_PREREQUISITES = ['top:continuous-map', 'top:metric-space', 'top:sequentially-compact', 'top:locally-compact'];

test('用户点名的 12 项各有一个 Concept 节点，且 id 合法', () => {
  const allowed = /^[A-Za-z0-9:._-]+$/;
  for (const [id, label] of REQUIRED_TWELVE) {
    const node = byId.get(id);
    assert.ok(node, `12 项里的「${label}」没有对应节点：${id}`);
    assert.equal(node.construct, 'Concept', `12 项里的「${label}」应当是 Concept，实际 ${node.construct}`);
    assert.equal(node.discipline, '拓扑', `${id} 的学科应为受控词表里的「拓扑」`);
    assert.match(id, allowed, `${id} 含 NODE_BLOCK 不允许的字符`);
    assert.ok(node.title.length > 0, `${id} 没有标题`);
    assert.ok(node.teaching?.evidenceStatus, `${id} 没有证据等级`);
  }
  assert.equal(REQUIRED_TWELVE.length, 12, '12 项清单本身被改动');
});

test('12 项之外新增的节点是辅助前置、断言、反例、例子、误区、方法或理论，有明确分类', () => {
  const allowedConstructs = new Set(['Concept', 'Claim', 'Counterexample', 'Example', 'MisconceptionPattern', 'Method', 'Theory']);
  const requiredIds = new Set(REQUIRED_TWELVE.map(([id]) => id));
  for (const node of nodes) {
    assert.ok(allowedConstructs.has(node.construct), `${node.id} 的构造类型不在本案例允许的清单里：${node.construct}`);
    if (node.construct !== 'Concept') continue;
    if (requiredIds.has(node.id)) continue;
    assert.ok(AUXILIARY_PREREQUISITES.includes(node.id),
      `${node.id} 是一个未登记的 Concept：新概念要么进 12 项，要么显式登记为辅助前置`);
  }
  for (const id of AUXILIARY_PREREQUISITES) {
    /*
     * `top:metric-space` 这一条在装配后被合并表收口到 `dg:metric-space`：
     * 它不再是独立节点，而是那个规范节点上的一条 `registrations`。两种形态都要能核验。
     */
    const own = byId.get(id);
    const absorbed = ontology.raw.nodes.find((node) => (node.registrations ?? []).some((item) => item.id === id));
    assert.ok(own || absorbed, `辅助前置 ${id} 既不是节点，也不是任何规范节点的登记项`);
    const node = own ?? absorbed;
    const registration = own ? own : (node.registrations ?? []).find((item) => item.id === id);
    const marked = (registration.title ?? '').includes('辅助')
      || JSON.stringify(registration.formal?.boundary ?? []).includes('辅助前置')
      || JSON.stringify(node.formal?.boundary ?? []).includes('辅助前置');
    assert.ok(marked, `辅助前置 ${id} 没有在标题或 boundary 里写清它不在 12 项之内`);
  }
});

test('每个节点都通过形成检查，且都有产出它的行动契约', () => {
  const produced = new Map();
  for (const action of actions) {
    for (const output of action.outputs) {
      produced.set(output.node, (produced.get(output.node) ?? 0) + 1);
    }
  }
  for (const node of nodes) {
    const formation = checkFormation(node);
    assert.equal(formation.status, 'well-formed',
      `${node.id}: ${formation.checks.filter((check) => check.status !== 'passed').map((check) => check.key).join('、')}`);
    assert.ok((produced.get(node.id) ?? 0) >= 1,
      `${node.id} 没有产出它的行动契约：它在网络视图里无法被引入（relation-coverage 的 isolated 缺陷类）`);
  }
});

test('每个概念与断言都至少是一条语义关系的端点，本案例没有新的「尚待登记」欠账', () => {
  const endpoints = new Set();
  for (const relation of relations) { endpoints.add(relation.from); endpoints.add(relation.to); }
  for (const node of nodes) {
    if (!['Concept', 'Claim', 'Theory'].includes(node.construct)) continue;
    assert.ok(endpoints.has(node.id), `${node.id} 不是任何语义关系的端点（会落进「尚待登记」类）`);
  }
  const report = relationCoverage(ontology.raw.nodes, ontology.raw.relationDescriptions, ontology.raw.actions);
  const pending = report.items.filter((item) => item.cls === 'pending' && item.id.startsWith('top:'));
  assert.deepEqual(pending.map((item) => item.case), [], '本案例出现了「尚待登记」的节点');
  const isolated = report.items.filter((item) => item.cls === 'isolated');
  assert.deepEqual(isolated.map((item) => item.id), [], '存在完全孤立的节点');
});

test('方法节点至少两个，且方法/误区/例子节点不冒充概念', () => {
  const methods = nodes.filter((node) => node.construct === 'Method');
  assert.ok(methods.length >= 2, `方法节点应 >= 2，实际 ${methods.length}`);
  for (const node of methods) {
    const roles = node.roles ?? [];
    const isLocal = roles.includes('LocalMethod');
    const isGlobal = roles.includes('GlobalMethod');
    assert.ok(isLocal !== isGlobal, `${node.id} 必须恰好是 LocalMethod 或 GlobalMethod 之一`);
    assert.ok(node.formal.In && node.formal.Out && node.formal.Fail, `${node.id} 缺少方法的接口字段或失效范围`);
  }
  for (const node of nodes.filter((item) => item.construct === 'MisconceptionPattern')) {
    assert.ok(node.formal.wrongRule && node.formal.counterexample && node.formal.scope,
      `${node.id} 缺少错误规则、反例或否定范围`);
    assert.ok((node.formal.anchors ?? []).length > 0, `${node.id} 没有锚点`);
  }
});

test('反例节点带失败见证与否定范围，且范围里写明它没有否定什么', () => {
  const counterexamples = nodes.filter((node) => node.construct === 'Counterexample');
  assert.ok(counterexamples.length >= 4,
    `本案例的四条主线（可数性、分离性、仿紧、σ-紧）各应有一个反例，实际 ${counterexamples.length}`);
  for (const node of counterexamples) {
    assert.ok(node.formal.failureWitness && node.formal.failureWitness.length > 10, `${node.id} 缺少失败见证`);
    assert.ok(node.formal.target, `${node.id} 没有写明被反驳的目标命题`);
    /*
     * 否定范围必须**逐条**写明它没有否定什么。按行检查，而不是把整段拼成
     * 一个字符串再匹配：`**不**否定` 这样的强调写法会把「不否定」拆开，
     * 拼起来匹配会假失败（第一版就是这样）。
     */
    /*
     * 否定范围必须写明它**没有**否定什么，但一条边界不一定都是「不否定…」：
     * 有的条目是「这一条必须核验」这类提醒。因此要求的是**至少一条**写了否定范围，
     * 且每条都要去掉 Markdown 强调符后再匹配（`**不**否定` 里夹了星号，直接匹配会假失败）。
     */
    const lines = node.formal.boundary ?? [];
    assert.ok(lines.length > 0, `${node.id} 的否定范围是空的`);
    const stated = lines.some((line) => /不否定|不能|不声称|不作|不等同/.test(line.replace(/\*\*/g, '')));
    assert.ok(stated, `${node.id} 的否定范围没有写明它没有否定什么：${lines.join(' / ')}`);
    for (const anchor of node.formal.anchors ?? []) {
      assert.ok(allIds.has(anchor), `${node.id} 的锚点不存在：${anchor}`);
    }
  }
});

test('正文块与节点一一对应，站内链接都能解析', () => {
  const markdown = readFileSync(resolve(MCS_WEB_ROOT, 'data/cases/08-topology.md'), 'utf8');
  const blocks = [...markdown.matchAll(/<!--\s*node:([A-Za-z0-9:._-]+)\s*-->/g)].map((match) => match[1]);
  const closers = (markdown.match(/<!--\s*\/node\s*-->/g) ?? []).length;
  assert.equal(blocks.length, closers, '节点块的开关标记数量不一致');
  assert.equal(new Set(blocks).size, blocks.length, '正文里有重复的节点块');
  /*
   * 正文块的 id 可能是**登记项**的 id 而不是规范节点 id：合并表会把同一对象的多处登记
   * 收口到一个规范节点（例如本案例的 `top:metric-space` → `dg:metric-space`），
   * 而正文块仍按登记项写。因此这里接受「是本体节点」或「是某个规范节点的 registrations 成员」。
   */
  const registrations = new Set();
  for (const node of ontology.raw.nodes) for (const item of node.registrations ?? []) registrations.add(item.id);
  for (const id of blocks) {
    assert.ok(byId.has(id) || registrations.has(id) || allIds.has(id), `正文块 ${id} 没有对应节点（也不是任何节点的登记项）`);
  }
  for (const node of nodes) {
    const own = [...(node.registrations ?? []).map((item) => item.id), node.id];
    const hasBlock = own.some((id) => blocks.includes(id));
    assert.ok(hasBlock, `节点 ${node.id} 没有任何正文块（contentRef 默认等于 id，合并后的节点可挂多条登记）`);
    // 取第一条能对上正文块的登记来核对长度与链接。
    const sourceId = own.find((id) => blocks.includes(id));
    const source = node.id === sourceId ? node : (node.registrations ?? []).find((item) => item.id === sourceId);
    assert.ok((source?.contentMarkdown ?? node.contentMarkdown ?? '').length > 200, `节点 ${node.id}（登记 ${sourceId}）的正文过短`);
  }
  let links = 0;
  for (const node of nodes) {
    const sources = [node, ...(node.registrations ?? [])];
    for (const source of sources) {
      const body = source.contentMarkdown ?? '';
      if (!body) continue;
      assert.ok(!body.includes('[['), `${source.id} 的正文仍含未转换的 [[wiki 链接]]`);
      for (const match of body.matchAll(/\]\((\/nodes\/[^)]+)\)/g)) {
        const target = decodeURIComponent(match[1].replace('/nodes/', ''));
        assert.ok(allIds.has(target) || registrations.has(target), `${source.id} 的正文链接指向未知节点：${target}`);
        links += 1;
      }
    }
  }
  assert.ok(links >= 20, `正文里的站内链接过少，实际 ${links}`);
});

test('行动契约的输出可解析、输入是背景或本案例节点（含被合并的规范节点），且模式合法', () => {
  const own = new Set([...allIds].filter((id) => id.startsWith('top:')));
  /*
   * 输入还允许「本案例其它登记已合并进去的规范节点」：最典型的是度量空间——
   * 本案例登记的是 `top:metric-space`，合并表把它收口到 `dg:metric-space`，
   * 于是契约输入写规范 id 才是**当下装配后**真实存在的节点。两处都接受，但必须二者之一真实存在。
   */
  const canonical = new Set(allIds);
  const modes = new Set(['definition', 'deduction', 'representation', 'task', 'method', 'construction', 'evidence']);
  assert.ok(actions.length >= 30, `行动契约应 >= 30，实际 ${actions.length}`);
  for (const action of actions) {
    assert.ok(modes.has(action.mode), `${action.id} 的模式非法：${action.mode}`);
    for (const item of action.inputs) {
      assert.ok(own.has(item.node) || item.node.startsWith('bg:') || canonical.has(item.node) || item.node === 'top:metric-space',
        `${action.id} 的输入既不是背景、也不是本案例节点或已合并的规范节点：${item.node}`);
      assert.ok(item.accepts.length > 0, `${action.id} 的输入 ${item.node} 没有声明资源`);
    }
    for (const item of action.outputs) {
      // 输出同样接受「已合并的规范节点」：合并表会把本案例登记的节点收口到规范 id。
      assert.ok(own.has(item.node) || canonical.has(item.node) || item.node === 'top:metric-space',
        `${action.id} 的输出既不是本案例节点也不是已合并的规范节点：${item.node}`);
    }
  }
});

test('关系见证两类分得开：定义性依赖用 DEF，证明依赖指向同时列出两端的证据', () => {
  assert.ok(relations.length >= 40, `本案例的关系应 >= 40，实际 ${relations.length}`);
  const seen = new Set();
  for (const relation of relations) {
    const key = `${relation.from}→${relation.to}→${relation.kind}`;
    assert.ok(!seen.has(key), `重复的关系：${key}`);
    seen.add(key);
    assert.ok(relation.from !== relation.to, `${relation.id} 自环`);
    assert.notEqual(relation.to.split(':')[0], 'bg', `${relation.id} 把背景节点当成目标`);
    const witness = relation.witness ?? {};
    /*
     * 依据写在哪一处取决于关系种类（与既有案例一致）：
     * `hardPrereq` 两类写 `witness.scope`；其余种类写 `scope`；`application` 写 `task`。
     * 这里只要求"写清了一处"，不强行统一字段名——那会与既有数据打架。
     */
    const justification = `${witness.scope ?? ''} ${relation.scope ?? ''} ${relation.task ?? ''}`.trim();
    assert.ok(justification.length >= 10, `${relation.id} 没写清依据`);
    if (witness.status === 'DEF' && witness.type === 'definitional-dependency') continue;
    if (witness.type !== 'proof-dependency') continue;
    const record = evidence.find((item) => item.id === witness.ref);
    assert.ok(record, `${relation.id} 的 ref 指向未知证据：${witness.ref}`);
    assert.equal(witness.status, record.status, `${relation.id} 的见证状态与证据不一致`);
    for (const end of [relation.from, relation.to]) {
      assert.ok((record.nodes ?? []).includes(end), `证据 ${record.id} 没有列出 ${relation.id} 的端点 ${end}`);
    }
  }
});

test('证据一律正文级：不签发机器证书，且写明未编码为 ND 证书', () => {
  assert.ok(evidence.length >= 30, `本案例的证据应 >= 30，实际 ${evidence.length}`);
  /*
   * 允许的 kind 与本库其余案例一致（`data/cases/*.mjs` 的既有取值）：
   * 正文级记录用 `prose-proof`；反例的记录用 `counterexample`（同样是正文级，
   * 不是机器核验）；不声称的范围用 `not-claimed`。**不允许**的是
   * `machine-certificate` 与 `finite-check`——本案例没有任何机器证书。
   */
  const proseKinds = new Set(['prose-proof', 'counterexample', 'reference']);
  for (const record of evidence) {
    if (record.kind === 'not-claimed') {
      assert.equal(record.status, 'NOT-CLAIMED', `${record.id} 的未声称记录状态应为 NOT-CLAIMED`);
      continue;
    }
    assert.ok(proseKinds.has(record.kind), `${record.id} 不应签发机器证书：kind=${record.kind}`);
    assert.equal(record.checkStatus, 'not_run', `${record.id} 不得声称已核验`);
    assert.equal(record.certificate, undefined, `${record.id} 不应有证书文件`);
    assert.ok((record.obligations ?? []).some((text) => text.includes('ND 证书')),
      `${record.id} 必须写明未编码为 ND 证书`);
    for (const id of record.nodes ?? []) {
      assert.ok(allIds.has(id), `${record.id} 引用未知节点 ${id}`);
    }
  }
  const methods = nodes.filter((node) => node.construct === 'Method');
  for (const node of methods) {
    assert.ok(ontology.raw.evidence.some((record) => (record.nodes ?? []).includes(node.id) && record.status === 'ILLUSTRATION'),
      `${node.id} 的方法证据只应声明步骤与正文一致（ILLUSTRATION）`);
  }
});

test('跨案例接口如实写明差别，不合并既有登记', () => {
  /*
   * 2026-10 重写：本案例原来有 5 条 `crossDomain`（分别指向 dg、manifold、rudin 的对应节点），
   * 但**合并表**已经把那些端点收口进了本案例的规范节点——「三处登记」不再各是一个点，
   * 而是同一个节点上的三条 `registrations`。因此接口的核验点从「有没有那条边」
   * 改成「合并有没有把差别抹平」：
   *
   * 1. 规范节点必须**仍挂着被合并的登记**（拓扑流形要能看到 dg / manifold 两处）；
   * 2. 那些登记的**公理表差异**必须逐字保留（第二可数这一条最容易在合并里被抹平）；
   * 3. 本案例仍要有一条真正跨案例的边（度量空间），且写清为什么不合并。
   */
  const crossDomain = relations.filter((relation) => relation.kind === 'crossDomain');
  assert.ok(crossDomain.length >= 1, `本案例应至少保留一条真正的跨案例边，实际 ${crossDomain.length}`);

  const manifold = byId.get('top:topological-manifold');
  const merged = (manifold?.registrations ?? []).map((item) => item.id);
  for (const expected of ['dg:topological-manifold', 'dg:manifold', 'manifold:top-manifold']) {
    assert.ok(merged.includes(expected), `拓扑流形的规范节点没有保留登记 ${expected}（合并把三处登记收口了，但差异必须逐条保留）`);
  }
  const dgRegistration = manifold.registrations.find((item) => item.id === 'dg:manifold');
  const boundary = JSON.stringify(dgRegistration.formal?.boundary ?? dgRegistration.summary ?? '');
  assert.ok(boundary.length > 0, 'dg:manifold 这一处登记的边界说明在合并中丢了');

  const space = byId.get('top:space');
  const spaceMerged = (space?.registrations ?? []).map((item) => item.id);
  for (const expected of ['dg:topological-space', 'liang:topological-space']) {
    assert.ok(spaceMerged.includes(expected), `拓扑空间的规范节点没有保留登记 ${expected}`);
  }

  const metrization = crossDomain.find((relation) => relation.id === 'rel-top-space-metrization-crossdomain');
  assert.ok(metrization, '缺少与度量空间（dg 案例）的可数性接口');
  assert.match(metrization.scope, /A2|A1/, '接口说明必须点出 A2 / A1 的分层');
  assert.match(metrization.scope, /保留|不互相覆盖|不覆盖/, '接口说明必须写明两处登记都保留');
});
