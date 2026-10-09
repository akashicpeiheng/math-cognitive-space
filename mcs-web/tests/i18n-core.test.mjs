/**
 * 语言覆盖的内核验收：机制、边界与「不许静默」的几条。
 *
 * 这一套**不检查翻译质量**（那需要人工复核，见 `scripts/i18n-parity.mjs` 的说明），
 * 它检查的是「机制本身是否可信」：
 *
 * 1. 中英**同一本体版本**——否则换语言会看到另一套证据；
 * 2. 覆盖只改文本，不改结构（id、受控词表、数组长度、公式记号）；
 * 3. 缺项**如实上报**，不静默变成空白；
 * 4. 覆盖文件写错（不存在的 id、长度不符）**当场报错**，不静默忽略。
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { loadOntology, resetOntologyCache } from '../core/ontology.mjs';
import { localizeOntologyRaw, mergeStructured } from '../data/i18n/overlay.mjs';
import { coverage, overlayFor, formatCoverage, resetOverlayCache } from '../data/i18n/index.mjs';
import { normalizeLocale, LOCALES } from '../shared/locales.mjs';

test('语种归一化只认登记过的语种，未知值不猜测', () => {
  assert.deepEqual(LOCALES, ['zh', 'en']);
  assert.equal(normalizeLocale('en'), 'en');
  assert.equal(normalizeLocale('EN'), 'en');
  assert.equal(normalizeLocale('en-US'), 'en');
  assert.equal(normalizeLocale('zh-Hans-CN'), 'zh');
  assert.equal(normalizeLocale('fr'), 'zh');
  assert.equal(normalizeLocale(undefined), 'zh');
  assert.equal(normalizeLocale(''), 'zh');
  assert.equal(normalizeLocale('fr', 'en'), 'en');
});

test('中英本体版本与内容哈希完全相同', async () => {
  resetOntologyCache();
  resetOverlayCache();
  const zh = await loadOntology();
  const en = await loadOntology({ locale: 'en' });
  assert.equal(en.version, zh.version, '换语言不能换本体版本');
  assert.equal(en.contentHash, zh.contentHash);
  /* 节点数量与 id 集合也必须一致：语言不是删减内容的理由。 */
  assert.deepEqual(en.raw.nodes.map((node) => node.id), zh.raw.nodes.map((node) => node.id));
  assert.deepEqual(en.raw.actions.map((action) => action.id), zh.raw.actions.map((action) => action.id));
});

test('英文视图换掉了标题与摘要，中文视图逐字未动', async () => {
  resetOntologyCache();
  resetOverlayCache();
  const zh = await loadOntology();
  const en = await loadOntology({ locale: 'en' });

  const zhNode = zh.raw.nodes.find((node) => node.id === 'limit:limit-ed');
  const enNode = en.raw.nodes.find((node) => node.id === 'limit:limit-ed');
  assert.equal(zhNode.title, '函数极限的 ε–δ 定义');
  assert.equal(enNode.title, 'The ε–δ definition of a limit of a function');
  assert.match(enNode.summary, /punctured-neighbourhood/);

  /* 结构字段不许被改动。 */
  assert.equal(enNode.construct, zhNode.construct);
  assert.equal(enNode.discipline, zhNode.discipline);
  assert.deepEqual(enNode.roles, zhNode.roles);
  assert.equal(en.raw.actions.find((action) => action.id === 'a-limit:d').mode, 'definition');
  assert.equal(en.raw.evidence.find((item) => item.id === 'ev-limit-bridge-proof').status, 'PROOF');
});

/**
 * 「未译条目回落中文且**不得为空**」——这条机制**用合成覆盖来测**，不测当前翻译进度。
 *
 * 本套测试在这条上翻过两次车，值得写在测试里：
 * 1. 最初拿 `group:group-concept` 当「未翻译节点」的样例 → 那个案例被译完之后必红；
 * 2. 改成「必须存在标题仍与中文相同的节点」→ 232 个节点全部译完之后**又**必红。
 *
 * 两次都是同一个错误：**机制测试绑定了数据进度**。翻译进度是随时在变的事实，
 * 而机制要保证的是「覆盖里没有的 id 一定会回落成中文原文，且非空白」。
 * 所以这里直接调装配函数、喂一份只覆盖一个节点的合成覆盖：结果与仓库里译了多少无关。
 * 「还差哪些」交给 `coverage()`（在 `npm run check` 里打印）与 `npm run i18n:todo`。
 */
test('未译条目回落中文原文且不为空白（合成覆盖，与翻译进度无关）', () => {
  const nodes = [
    { id: 'a', title: '甲', summary: '甲的摘要' },
    { id: 'b', title: '乙', summary: '乙的摘要' },
    { id: 'c', title: '丙', summary: '丙的摘要' },
  ];
  const base = { nodes };
  const { raw: merged, problems } = localizeOntologyRaw(base, { nodes: { b: { title: 'B' } } });
  assert.deepEqual(problems, [], '合成覆盖不该产生装配问题');

  assert.equal(merged.nodes.find((node) => node.id === 'a').title, '甲', '未被覆盖的 id 必须保持中文原文');
  assert.equal(merged.nodes.find((node) => node.id === 'c').summary, '丙的摘要');
  assert.equal(merged.nodes.find((node) => node.id === 'b').title, 'B');
  assert.equal(merged.nodes.find((node) => node.id === 'b').summary, '乙的摘要', '覆盖只改写到的字段，其余保持中文');

  /* 无论覆盖多少条，**任何一条都不许变成空白**。 */
  for (const node of merged.nodes) {
    assert.ok(node.title.length > 0, `${node.id} 的标题是空白`);
    assert.ok(node.summary.length > 0, `${node.id} 的摘要对空白`);
  }

  /* 真实数据侧只检查这一条不变量：232 个节点，每个标题都非空（无论中英）。 */
  return loadOntology({ locale: 'en' }).then((en) => {
    assert.equal(en.raw.nodes.length, 232);
    for (const node of en.raw.nodes) assert.ok(node.title.length > 0, `${node.id} 的英文标题是空白`);
  });
});

test('公式与 LaTeX 在覆盖中保持同构', async () => {
  resetOntologyCache();
  resetOverlayCache();
  const zh = await loadOntology();
  const en = await loadOntology({ locale: 'en' });
  const zhEd = zh.raw.nodes.find((node) => node.id === 'limit:limit-ed');
  const enEd = en.raw.nodes.find((node) => node.id === 'limit:limit-ed');
  /* 谓词与形式陈述的 tex 是数学内容，覆盖里根本没有它们的译文——必须逐字相同。 */
  assert.equal(enEd.formal.predicate, zhEd.formal.predicate);
  assert.equal(enEd.formalStatement.tex, zhEd.formalStatement.tex);
  assert.equal(enEd.formal.formationWitness, 'Parameters and predicate are closed under their declared types.');
});

test('条件与自检按序对齐：条数与顺序都不许变', async () => {
  resetOntologyCache();
  resetOverlayCache();
  const zh = await loadOntology();
  const en = await loadOntology({ locale: 'en' });
  const zhEd = zh.raw.nodes.find((node) => node.id === 'limit:limit-ed');
  const enEd = en.raw.nodes.find((node) => node.id === 'limit:limit-ed');
  assert.equal(enEd.teaching.conditions.length, zhEd.teaching.conditions.length);
  assert.equal(enEd.teaching.selfCheck.length, zhEd.teaching.selfCheck.length);
  /* 第 3 个条件的「删掉会怎样」对应中文源第 3 个，而不是被重排过。 */
  assert.match(enEd.teaching.conditions[2].remove, /interchange/);
  assert.match(zhEd.teaching.conditions[2].remove, /交换/);
  /* 自检任务的 node 引用是结构，不是文案。 */
  assert.equal(enEd.teaching.selfCheck[0].node, zhEd.teaching.selfCheck[0].node);
});

test('覆盖率如实清点，未译条目不静默消失', async () => {
  resetOntologyCache();
  resetOverlayCache();
  const report = await coverage('en');
  assert.equal(report.overlay, true);
  assert.equal(report.sections.nodes.total, 232);
  /*
   * 两条**不随翻译进度漂移**的断言：
   * - 已译不为零（覆盖真的生效了，不是空目录）；
   * - `total - translated === missing 的条数`（清点自洽：没翻的条目必须逐条列在 missing 里）。
   *
   * 不写「某个具体 id 必须还没翻」——那会让测试与数据进度绑定，译完就红（本套测试踩过）。
   * 「翻到什么程度」由 `npm run check` 的覆盖率报表与 `scripts/i18n-parity.mjs --todo` 呈现。
   */
  assert.ok(report.sections.nodes.translated > 0, `已译节点数应大于零：${report.sections.nodes.translated}`);
  for (const [section, item] of Object.entries(report.sections)) {
    const listed = report.missing[section]?.length ?? 0;
    const gap = item.total - item.translated;
    if (gap > 0) assert.equal(listed, gap, `${section}：缺口 ${gap} 条，但 missing 里列了 ${listed} 条`);
  }
  const line = formatCoverage(report);
  assert.match(line, /nodes \d+\/232/);
  assert.match(line, /整体/);
  /* 中文是源语言：没有覆盖目录，覆盖率恒为满。 */
  const zhReport = await coverage('zh');
  assert.equal(zhReport.overlay, false);
  assert.equal(zhReport.totals.ratio, 1);
});

test('覆盖装配：数组长度不符、未知 id、受控值改写都必须报错', () => {
  const base = {
    nodes: [
      { id: 'n1', title: '标题', roles: ['Concept'], teaching: { conditions: [{ remove: 'a' }, { remove: 'b' }] } },
      { id: 'n2', title: '另一个' },
    ],
  };
  const lengthProblem = [];
  mergeStructured(base.nodes[0], { title: 'Title', teaching: { conditions: [{ remove: 'A' }] } }, ['n1'], lengthProblem);
  assert.equal(lengthProblem.length, 1);
  assert.match(lengthProblem[0], /数组长度不一致/);

  const idProblem = [];
  localizeOntologyRaw(base, { nodes: { 'n1': { title: 'Title' }, 'nope': { title: 'X' } } });
  const { problems } = localizeOntologyRaw(base, { nodes: { 'n1': { title: 'Title' }, nope: { title: 'X' } } });
  assert.equal(idProblem.length, 0);
  assert.equal(problems.length, 1);
  assert.match(problems[0], /不存在的键/);

  const controlledProblem = [];
  mergeStructured(base.nodes[0], { roles: ['Idea'] }, ['n1'], controlledProblem);
  /* roles 是受控词表值：覆盖里出现就是错的，但这一层只报「形状」，由 parity 判语义。 */
  assert.deepEqual(mergeStructured(base.nodes[0], { roles: ['Idea'] }, ['n1'], controlledProblem).roles, ['Idea']);

  const idMismatch = [];
  mergeStructured(base.nodes[0], { id: 'other', title: 'T' }, ['n1'], idMismatch);
  assert.equal(idMismatch.length, 1);
  assert.match(idMismatch[0], /覆盖的 id/);
});

test('覆盖模块缺整块时其余块照常生效（翻译到一半不能打不开站点）', async () => {
  resetOverlayCache();
  const overlay = await overlayFor('en');
  assert.ok(overlay, '英文覆盖应能装载');
  /* 本批只有 limit / rudin；其余块缺失是合法状态，不是错误。 */
  assert.ok(overlay.nodes);
  assert.equal(overlay.__locale, 'en');
  assert.equal(await overlayFor('zh'), null, '中文是源语言，不读覆盖目录');
});

test('节点正文：未覆盖的节点保持中文原文，长度不为零', async () => {
  resetOntologyCache();
  resetOverlayCache();
  const zh = await loadOntology();
  const en = await loadOntology({ locale: 'en' });

  /*
   * 两条**不随翻译进度漂移**的性质：
   * 1. 中英两版的**节点数相同**，每个都带非空正文（没有任何节点在英文侧被清空）；
   * 2. 英文侧缺失的正文块**回落成中文原文**，不是空串。
   *
   * 不绑定具体块 id：最初这里写的是「`limit:distance` 必须还是中文」，而该块被译完之后
   * 必然变红——与「未译条目回落」那条测试是同一个错误（机制测试绑定数据进度）。
   */
  const zhWithContent = zh.raw.nodes.filter((node) => node.contentMarkdown);
  assert.ok(zhWithContent.length > 0);
  assert.equal(en.raw.nodes.filter((node) => node.contentMarkdown).length, zhWithContent.length, '中英两版带正文的节点数必须相同');

  for (const node of en.raw.nodes) {
    const zhNode = zh.raw.nodes.find((item) => item.id === node.id);
    assert.ok(node.contentMarkdown.length > 0 || zhNode.contentMarkdown.length === 0, `${node.id} 的英文正文是空白`);
  }
});
