import test from 'node:test';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { MCS_WEB_ROOT } from '../core/ontology.mjs';
import { loadOntology } from '../core/ontology.mjs';
import {
  PROFILE_TEMPLATES, PROFILE_TEMPLATE_IDS, DEFAULT_PROFILE_TEMPLATE_ID,
  profileTemplate, templateDeclarations, validateProfileTemplates,
} from '../data/profile-templates.mjs';

/**
 * 起始节点与默认档案模板（2026-10 加）。
 *
 * 用户的要求：「在节点网络里建立『起始节点』——这是保证学习者已经学过其前置知识的节点，
 * 是一份视图里最先出现的几个节点，要对这些起始节点做出强调标记；同时建立一份默认的
 * 学习者档案模版，包括『大一新生』和『高一』。」
 *
 * 「保证已经学过其前置」这句话在这里被机器化：**起始节点的每一条登记前置都必须在
 * 档案的已确认清单里**。这条断言对每个模板都跑一遍——模板写错一条声明，它就会红。
 *
 * 本套只做数据层与派生层的检查（node 直接 import TS 叶子模块，不需要浏览器）；
 * 画布上的强调标记、图例与推荐徽标由 `tests/browser.mjs` / `tests/network-*.mjs` 之外的
 * 手工核对与 `tests/starting-nodes.test.mjs` 的文案断言共同覆盖。
 */
const { deriveStartingNodes, startingNodeIds, startingNodeBasis, HARD_PREREQ_KIND } = await import(
  pathToFileURL(resolve(MCS_WEB_ROOT, 'web/src/starting-nodes.ts')).href
);

const ontology = await loadOntology();

/** 把本体投影成前端图接口的形状（与 `GET /ontology/graph` 下发的字段一致）。 */
const graphNodes = ontology.raw.nodes.map((node) => ({
  id: node.id, title: node.title, granularity: node.granularity ?? 'unit', case: node.case,
}));
const graphActions = ontology.raw.actions.map((action) => ({
  id: action.id, title: action.title, mode: action.mode, inputs: action.inputs, outputs: action.outputs,
}));
const graphRelations = ontology.raw.relationDescriptions.map((relation) => ({
  id: relation.id, kind: relation.kind, from: relation.from, to: relation.to, witness: relation.witness,
}));

const titleOf = (id) => graphNodes.find((node) => node.id === id)?.title ?? id;
const knownSet = (ids) => new Set(ids);
const known = (ids) => ({ known: ids.map((node) => ({ node })) });

function startingFor(nodeIds) {
  return deriveStartingNodes({
    nodes: graphNodes, actions: graphActions, relations: graphRelations, theta: known(nodeIds),
  });
}

/** 一个节点的**全部登记前置**：所有产出行动里最好那条的输入 + 指向它的硬前置来源。 */
function registeredPrerequisites(nodeId) {
  const hard = graphRelations.filter((r) => r.kind === HARD_PREREQ_KIND && r.to === nodeId).map((r) => r.from);
  const producers = graphActions.filter((a) => a.outputs.some((o) => o.node === nodeId));
  if (producers.length === 0) return { hard, inputs: null };
  let best = null;
  for (const action of producers) {
    const inputs = action.inputs.map((input) => input.node);
    if (!best || inputs.length < best.length) best = inputs;
  }
  return { hard, inputs: best };
}

test('模板登记表自洽：id 唯一、中英成对、必须有一个空模板', () => {
  assert.deepEqual(validateProfileTemplates(), [], '模板自洽性检查未通过');
  assert.ok(PROFILE_TEMPLATE_IDS.includes('blank'));
  assert.equal(DEFAULT_PROFILE_TEMPLATE_ID, 'blank');
  assert.equal(profileTemplate('blank').declares.length, 0);
  assert.equal(profileTemplate('不存在的模板'), null);
  assert.equal(templateDeclarations('不存在的模板'), null);
  assert.ok(PROFILE_TEMPLATES.length >= 3, '至少要有空白 / 高一 / 大一新生三个模板');
});

test('模板声明的节点都真在本体里，而且只能是背景接口节点', () => {
  assert.deepEqual(validateProfileTemplates(ontology.nodesById), [], '模板与本体的一致性检查未通过');
  const declared = PROFILE_TEMPLATES.flatMap((template) => template.declares.map((entry) => entry.node));
  assert.ok(declared.length >= 4, `模板一共只声明了 ${declared.length} 条`);
  for (const id of declared) {
    const node = ontology.maybeNode(id);
    assert.ok(node, `模板声明了不存在的节点 ${id}`);
    assert.equal(node.case, 'background', `${id} 不是背景接口节点，模板不许声明它`);
  }
  // 反向的边界：模板**不许**把本站要教的内容声明成「已经学过」。
  assert.equal(declared.some((id) => id.startsWith('limit:') || id.startsWith('dg:') || id.startsWith('group:')), false);
});

test('模板只能声明「空白档案下本来就是起始节点」的背景接口', () => {
  const blank = startingFor([]);
  for (const template of PROFILE_TEMPLATES) {
    for (const entry of template.declares) {
      const found = blank.byId.get(entry.node);
      assert.ok(found, `模板 ${template.id} 声明的 ${entry.node} 在空白档案下不是起始节点`);
      assert.equal(found.kind, 'root', `${entry.node} 有产出行动，模板不该用它当初始声明`);
    }
  }
});

test('起始节点的三条判据：未确认 / 前置已确认 / 不是话题级条目', () => {
  for (const template of PROFILE_TEMPLATES) {
    const ids = template.declares.map((entry) => entry.node);
    const report = startingFor(ids);
    const knownIds = knownSet(ids);
    assert.ok(report.entries.length > 0, `模板 ${template.id} 下一个起始节点都没有`);
    for (const entry of report.entries) {
      assert.equal(knownIds.has(entry.node), false, `${entry.node} 已确认，不该再算起始节点`);
      const node = graphNodes.find((item) => item.id === entry.node);
      assert.notEqual(node.granularity, 'topic', `${entry.node} 是话题级条目，不参与前置计算`);
      // 关键的一条：**所有**登记前置都在已确认清单里。
      const { hard, inputs } = registeredPrerequisites(entry.node);
      for (const source of hard) {
        assert.ok(knownIds.has(source), `${entry.node} 的硬前置 ${source} 没有确认，仍然被算成起始节点`);
      }
      if (inputs === null) {
        assert.equal(entry.kind, 'root', `${entry.node} 没有产出行动，应当标成 root`);
        continue;
      }
      // 有产出行动：走通的那条路径的输入必须全部已确认。
      for (const id of entry.requires) {
        assert.ok(knownIds.has(id), `${entry.node} 的输入 ${id} 没有确认，仍然被算成起始节点`);
      }
    }
  }
});

test('模板真的扩大了起始集合，而且是靠「声明背景」扩大的', () => {
  const blank = startingFor([]);
  const high = startingFor(templateDeclarations('high-school-1').map((entry) => entry.node));
  const freshman = startingFor(templateDeclarations('university-freshman').map((entry) => entry.node));

  const blankIds = startingNodeIds(blank);
  const highIds = startingNodeIds(high);
  const freshmanIds = startingNodeIds(freshman);

  const unlockedByHigh = [...highIds].filter((id) => !blankIds.has(id));
  const unlockedByFreshman = [...freshmanIds].filter((id) => !highIds.has(id));
  assert.ok(unlockedByHigh.length > 0, '「高一」模板没有解锁任何新节点');
  assert.ok(unlockedByFreshman.length > 0, '「大一新生」比「高一」没有多解锁任何节点');

  /*
   * 被解锁的节点必须**真的**因为声明而可开始：它的每条前置都落在模板声明的清单里。
   * 这条断言是「起始节点保证前置已学过」这句话的直接检验——把模板里任意一条声明删掉，
   * 依赖它的那几个节点就会掉出起始集合，这里立刻红。
   */
  const highDeclared = knownSet(templateDeclarations('high-school-1').map((entry) => entry.node));
  for (const id of unlockedByHigh) {
    const { hard, inputs } = registeredPrerequisites(id);
    for (const source of [...hard, ...(inputs ?? [])]) {
      assert.ok(highDeclared.has(source), `${id} 因「高一」模板被解锁，但它的前置 ${source} 不在模板声明里`);
    }
  }
  // 声明过的背景节点自己不再是起始节点（已经确认）。
  for (const entry of templateDeclarations('high-school-1')) {
    assert.equal(highIds.has(entry.node), false, `${entry.node} 已由模板声明，不该再出现在起始节点里`);
  }
});

test('硬前置是 AND：缺一条就不是起始节点，且如实说明缺哪一条', () => {
  /*
   * 构造场面：`u:base` --hardPrereq--> `u:top`，而 `u:top` 的契约输入是空的。
   * 于是「契约齐了」但硬前置没齐 —— 起始节点必须**排除**它，并写清缺谁。
   * 这一条正是本期把口径从「只看契约」改成「契约 + 硬前置」的原因。
   */
  const nodes = [
    { id: 'u:base', title: '基础', granularity: 'unit', case: 'test' },
    { id: 'u:top', title: '上层', granularity: 'unit', case: 'test' },
    { id: 'u:thread', title: '线索', granularity: 'topic', case: 'test' },
  ];
  const actions = [
    { id: 'a-top', title: '引入上层', mode: 'definition', inputs: [], outputs: [{ node: 'u:top', provides: ['statement'] }] },
  ];
  const relations = [
    { id: 'r-1', kind: 'hardPrereq', from: 'u:base', to: 'u:top', witness: { status: 'DEF' } },
  ];
  const empty = deriveStartingNodes({ nodes, actions, relations, theta: null });
  assert.equal(empty.byId.has('u:top'), false, '硬前置未确认时不该算起始节点');
  const blocked = empty.blocked.find((item) => item.node === 'u:top');
  assert.ok(blocked, '被挡住的节点应当出现在 blocked 里');
  assert.deepEqual(blocked.missingHardPrereqs, ['u:base']);

  const afterBase = deriveStartingNodes({ nodes, actions, relations, theta: known(['u:base']) });
  assert.equal(afterBase.byId.get('u:top')?.kind, 'satisfied');
  assert.deepEqual(afterBase.byId.get('u:top')?.hardPrereqs, ['u:base']);
  // 话题级条目在任何情况下都不进来，但会被计数（界面要如实说明「没显示什么」）。
  assert.equal(afterBase.byId.has('u:thread'), false);
  assert.equal(afterBase.threadExcluded, 1);
});

test('「没有产出行动」与「产出行动没有输入」是两件事', () => {
  const report = startingFor([]);
  // 本体里真实存在「没有产出行动」这一类：8 个背景接口只能由学习者自己声明。
  const roots = report.entries.filter((entry) => entry.kind === 'root');
  const satisfied = report.entries.filter((entry) => entry.kind === 'satisfied');
  assert.ok(roots.length >= 8, `只因「没有产出行动」而成为起始节点的只有 ${roots.length} 个`);
  for (const entry of roots) {
    assert.equal(graphActions.some((a) => a.outputs.some((o) => o.node === entry.node)), false, `${entry.node} 其实有产出行动`);
  }
  /*
   * 第二类（**有**产出行动、但那条行动没有登记输入）现在要用夹具来钉。
   *
   * 原因记在这里，免得以后有人以为这条断言被删了：2026-10 的节点合并把两个这样的 dg 节点
   * （`dg:topological-space`、`dg:metric-space`）与 top 案例里的同一对象收口成了规范节点，
   * 硬前置因此取**并集**（见 `data/merges.mjs`）。本轮新增的命题公式又提供了无输入实例，
   * 同时保留最小夹具来独立核对判据。
   */
  const fixture = {
    nodes: [{ id: 'u:free', title: '自由节点', granularity: 'unit', case: 'u' }],
    actions: [{
      id: 'a:free', title: '引入自由节点', mode: 'definition',
      inputs: [], outputs: [{ node: 'u:free', provides: ['definition'] }],
    }],
    relations: [],
  };
  const derived = deriveStartingNodes({ ...fixture, theta: known([]) });
  const free = derived.byId.get('u:free');
  assert.equal(free?.kind, 'satisfied', '契约齐全而输入为空时，它应当是 satisfied 而不是 root');
  assert.deepEqual(free?.requires, [], '输入为空时「已学过的前置」也该是空');
  assert.deepEqual(free?.hardPrereqs, []);
  /*
   * 空白档案下一个已确认节点都没有，因此 `satisfied` 只可能是「输入为空」那种。
   * 「输入非空但已全部确认」要等模板声明之后才出现——那是起始节点真正的用法。
   */
  assert.equal(report.entries.every((entry) => entry.kind === 'root' || entry.requires.length === 0), true);
  assert.deepEqual(satisfied.map(entry => entry.node).sort(), ['logic:propositional-formula'],
    '命题公式是本轮新增的无输入引入契约；不得误归为背景声明');
  const withBackground = startingFor(['bg:logic:equality', 'bg:real:metric']);
  assert.ok(withBackground.entries.some((entry) => entry.kind === 'satisfied' && entry.requires.length > 0),
    '声明背景之后应当出现「输入已全部确认」的起始节点');
});

test('派生是确定性的：同一输入两次结果逐字相同', () => {
  const first = startingFor(['bg:logic:equality', 'bg:real:metric']);
  const second = startingFor(['bg:logic:equality', 'bg:real:metric']);
  assert.deepEqual(first.entries, second.entries);
  assert.deepEqual(first.entries.map((entry) => entry.node), second.entries.map((entry) => entry.node));
});

test('依据文案：中文逐字固定，且不出现「掌握」二字', () => {
  const report = startingFor(['bg:real:metric', 'bg:logic:equality']);
  const sample = report.entries.find((entry) => entry.node === 'limit:distance');
  assert.ok(sample, '声明实数度量背景之后，「实数距离」应当成为起始节点');
  const text = startingNodeBasis(sample, titleOf);
  assert.match(text, /^起始节点：/);
  assert.match(text, /实数度量背景/);
  assert.equal(text.includes('掌握'), false, '判据是「已确认可用」，不许写成「已掌握」');
  const rootText = startingNodeBasis(report.byId.get('bg:top:space'), titleOf);
  assert.equal(rootText, '起始节点：没有任何行动能产出它，只能由你直接声明；没有需要等待的登记前置。');
  assert.match(startingNodeBasis(sample, titleOf, 'en'), /^Starting node:/);
  /*
   * `lead: false`（详情面板用）：徽标已经写了「起始节点」，句子不该再念一遍前缀。
   * 除了前缀，其余逐字相同——两处说的是同一件事，不许悄悄换个说法。
   */
  const noLead = startingNodeBasis(sample, titleOf, 'zh', { lead: false });
  assert.equal(noLead, text.replace(/^起始节点：/, ''));
  assert.equal(noLead.startsWith('起始节点'), false);
  assert.equal(
    startingNodeBasis(report.byId.get('bg:top:space'), titleOf, 'zh', { lead: false }),
    rootText.replace(/^起始节点：/, ''),
  );
  assert.match(startingNodeBasis(sample, titleOf, 'en', { lead: false }), /^every input of the action/);
});

test('本体侧的口径核对：起始节点覆盖多个案例，且没有把已确认的节点再列一遍', () => {
  const ids = templateDeclarations('university-freshman').map((entry) => entry.node);
  const report = startingFor(ids);
  const cases = new Set(report.entries.map((entry) => graphNodes.find((node) => node.id === entry.node)?.case));
  assert.ok(cases.size >= 4, `起始节点只覆盖了 ${[...cases].join('、')} 这些案例`);
  for (const entry of report.entries) assert.equal(ids.includes(entry.node), false);
  assert.equal(report.knownCount, ids.length);
  assert.equal(report.total, graphNodes.length);
});

test('空网络的推荐：给出的正好是起始节点，且「背景起点」必须真的没有产出行动', async () => {
  /*
   * 「一份视图里最先出现的几个节点」在界面上就是这一处：网络还空着时，
   * 「推荐加入」面板列出的那几条。它必须与派生结果**一致**——
   * 要么多（推荐了不是起始节点的东西）、要么少（起始节点没出现）都是读法上的错。
   *
   * 这一条同时钉住一个修好的老缺陷：`bg:misc:counterexample-method` 是 `case: 'background'`
   * 但有一条引入契约，从前它照样被推成「背景起点：没有任何行动能产出它」——那句话对它是假的。
   */
  const { recommend } = await import(pathToFileURL(resolve(MCS_WEB_ROOT, 'web/src/network.ts')).href);
  const graph = { nodes: graphNodes, actions: graphActions, relations: graphRelations };
  const ids = startingNodeIds(startingFor([]));
  const recommendations = recommend(graph, new Set(), 200, undefined, ids);
  const recommended = new Set(recommendations.map((rec) => rec.node));

  for (const rec of recommendations) {
    assert.ok(ids.has(rec.node), `${rec.node} 不是起始节点，却出现在空网络的推荐里`);
    if (rec.kind !== 'background') continue;
    const produced = graphActions.some((action) => action.outputs.some((output) => output.node === rec.node));
    assert.equal(produced, false, `${rec.node} 有产出行动，却被说成「没有任何行动能产出它」的背景起点`);
  }
  for (const entry of ids) {
    assert.ok(recommended.has(entry), `起始节点 ${entry} 没出现在空网络的推荐里`);
  }
});

test('空网络推荐在**没有 θ** 时也要如实：面板文案说的「共 N 个」就是派生的 N', () => {
  const report = startingFor([]);
  const cases = new Set(report.entries.map((entry) => graphNodes.find((node) => node.id === entry.node)?.case));
  assert.ok(cases.has('background'), '空白档案下应当有背景接口当起始节点');
  /*
   * 独立重算：没有硬前置，且没有产出行动或存在无输入契约的单元级节点。
   *
   * 2026-10 的节点合并让这条口径有了可观察的后果：两个「有行动、但没登记输入」的 dg 节点
   * 与 top 案例的同一对象收口成规范节点后，硬前置取并集（见 `data/merges.mjs`），
   * 合并后的背景节点与本轮无输入的命题公式都按相同判据计算；不将旧节点计数当成规则。
   */
  const independent = graphNodes
    .filter((node) => node.granularity !== 'topic')
    .filter((node) => {
      const producers = graphActions.filter(action => action.outputs.some(output => output.node === node.id));
      return producers.length === 0 || producers.some(action => action.inputs.length === 0);
    })
    .filter((node) => !graphRelations.some((relation) => relation.kind === HARD_PREREQ_KIND && relation.to === node.id))
    .map((node) => node.id)
    .sort();
  assert.deepEqual(report.entries.map((entry) => entry.node).sort(), independent,
    '空白档案下起点须没有硬前置，且无产出行动或有无输入契约');
});

/**
 * 默认**档案**（不只是模板）：`node scripts/seed-default-profiles.mjs` 建出来的那两份。
 *
 * 2026-10-11 用户反馈「没看见学习者档案」——模板只存在于「建档案时选什么」，
 * 下拉「学习者档案（E）」里一个默认档案都没有。这一条钉住的是**用户看得见的结果**：
 * 跑一次脚本（或点一次「学习概览」上的按钮），下拉里就多了「高一」与「大一新生」，
 * 而且它们的前置确认真的让起始节点变多。
 */
test('默认档案：建出来的两份档案可复现、幂等，且真的让起始节点变多', async () => {
  const { mkdtempSync, rmSync } = await import('node:fs');
  const { tmpdir } = await import('node:os');
  const { join } = await import('node:path');
  const { createLearnerStore } = await import('../server/db.mjs');
  const { seedDefaultProfiles, DEFAULT_TEMPLATE_SEEDS } = await import('../server/profile-templates.mjs');

  const dir = mkdtempSync(join(tmpdir(), 'mcs-seed-profiles-'));
  const db = await createLearnerStore({ config: { dbFile: join(dir, 'seed.sqlite3') } });
  try {
    const first = await seedDefaultProfiles({ db, ontology });
    assert.deepEqual(first.map((seed) => seed.name), ['高一', '大一新生'], '默认档案的名字与顺序按模板登记表来');
    assert.deepEqual(first.map((seed) => seed.created), [true, true]);
    assert.deepEqual(DEFAULT_TEMPLATE_SEEDS, ['high-school-1', 'university-freshman']);

    const profiles = await db.listProfiles();
    assert.deepEqual(profiles.map((profile) => profile.name).sort(), ['大一新生', '高一'].sort());
    for (const profile of profiles) assert.notEqual(profile.kind, 'demo', '默认档案是给真实学习者用的，不是演示档案');

    // 事件写法：来源可追、代写可辨、依据原文在 payload 里。
    for (const seed of first) {
      const events = await db.listAllEvents(seed.profileId);
      assert.equal(events.length, seed.declared.length);
      assert.ok(events.length > 0, `${seed.name} 应当写入模板声明`);
      for (const event of events) {
        assert.equal(event.kind, 'confirmation');
        assert.equal(event.payload.confirmed, true);
        assert.equal(event.payload.declared, true);
        assert.equal(event.payload.template, seed.templateId);
        assert.equal(event.source.ref, `profile-template:${seed.templateId}`);
        assert.ok(String(event.payload.basis ?? '').length > 0, '声明事件必须留下依据原文');
      }
    }

    // 幂等：同名档案已存在就跳过，不覆盖、不追加（用户自己改过的东西不能被脚本盖回去）。
    const second = await seedDefaultProfiles({ db, ontology });
    assert.deepEqual(second.map((seed) => seed.created), [false, false]);
    assert.equal((await db.listProfiles()).length, 2);
    for (const seed of first) assert.equal((await db.listAllEvents(seed.profileId)).length, seed.declared.length);

    /*
     * 用户看得见的效果：大一新生那份的起始节点比高一多（多声明了量词与函数）。
     * 两份都**不包含**已声明（已确认）的背景节点——已确认的节点不需要「开始」。
     */
    const knownOf = async (profileId) => (await db.listAllEvents(profileId)).map((event) => ({ node: event.nodeId }));
    const [highSchool, freshman] = first;
    const highSchoolKnown = await knownOf(highSchool.profileId);
    const freshmanKnown = await knownOf(freshman.profileId);
    const highSchoolStarting = deriveStartingNodes({
      nodes: graphNodes, actions: graphActions, relations: graphRelations, theta: { known: highSchoolKnown },
    });
    const freshmanStarting = deriveStartingNodes({
      nodes: graphNodes, actions: graphActions, relations: graphRelations, theta: { known: freshmanKnown },
    });
    assert.ok(freshmanStarting.entries.length > highSchoolStarting.entries.length,
      `大一新生的起始节点（${freshmanStarting.entries.length}）应当多于高一（${highSchoolStarting.entries.length}）`);
    for (const [report, known] of [[highSchoolStarting, highSchoolKnown], [freshmanStarting, freshmanKnown]]) {
      const declared = new Set(known.map((entry) => entry.node));
      for (const entry of report.entries) {
        assert.equal(declared.has(entry.node), false, `${entry.node} 已由模板声明，不该再算起始节点`);
      }
    }
  } finally {
    await db.close();
    rmSync(dir, { recursive: true, force: true });
  }
});
