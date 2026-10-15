import test from 'node:test';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { MCS_WEB_ROOT, loadOntology } from '../core/ontology.mjs';

/**
 * 节点检索的相关性排序（2026-10-12 加）。
 *
 * 用户报的：在知识网络的「全部节点」面板里搜「紧」，前几条是「广义 Stokes 定理」「单位分解」，
 * 真正相关的「连续性与紧致性」排到后面。原因是**命中之后按 id 字典序排**——
 * 摘要里出现过「紧」字的节点因此抢在标题就叫「紧致性」的节点前面。
 *
 * 本套钉四件事：
 *
 * 1. **判据可复述**：五条（命中字段 → 完整度 → 位置 → 连续性 → id 定序），
 *    每条用最小夹具各验一次；
 * 2. **两处等价**：服务端 `shared/search-rank.mjs` 与前端 `web/src/search-rank.ts`
 *    对同一批节点、同一批检索词给出的次序**逐字相同**（前端不能引 `shared/*.mjs`，
 *    因此必须有一份等价实现，而等价性只能靠断言守）；
 * 3. **真实本体上的那一例**：搜「紧」时标题命中排在摘要命中之前（这就是用户报的那条）；
 * 4. **集合不变**：排序只改次序，命中集合仍由四字段子串匹配决定（含别名）。
 */
const serverRank = await import(pathToFileURL(resolve(MCS_WEB_ROOT, 'shared/search-rank.mjs')).href);
const webRank = await import(pathToFileURL(resolve(MCS_WEB_ROOT, 'web/src/search-rank.ts')).href);

const ontology = await loadOntology();
/** 接口下发的字段（`compactNode` 的形状）：排序只读这些。 */
const nodes = ontology.raw.nodes.map((node) => ({
  id: node.id,
  title: node.title,
  summary: node.summary ?? '',
  alsoKnownAs: node.alsoKnownAs ?? [],
}));

const ids = (list) => list.map((node) => node.id);

/* ───────────────────────── 夹具：五条判据各一条 ───────────────────────── */

const FIXTURE = [
  { id: 'x:summary', title: '无关标题', summary: '这段解释里提到紧致性', alsoKnownAs: [] },
  { id: 'x:exact', title: '紧致', summary: '', alsoKnownAs: [] },
  { id: 'x:prefix', title: '紧致性', summary: '', alsoKnownAs: [] },
  { id: 'x:substring', title: '仿紧致', summary: '', alsoKnownAs: [] },
  { id: 'x:alias', title: '完全无关', summary: '', alsoKnownAs: ['紧致旧名'] },
  { id: 'x:id', title: '也无关', summary: '', alsoKnownAs: [] },
  { id: 'x:scattered', title: '紧而致之', summary: '', alsoKnownAs: [] },
  { id: 'x:late', title: '某某某某某某紧', summary: '', alsoKnownAs: [] },
];

test('判据①命中字段：标题 > 别名 > id > 只有摘要命中', () => {
  const ranked = ids(serverRank.rankNodes(FIXTURE, '紧致'));
  const position = (id) => ranked.indexOf(id);
  assert.ok(position('x:summary') > position('x:prefix'), '摘要命中必须排在标题命中之后');
  assert.ok(position('x:summary') > position('x:alias'), '摘要命中必须排在别名命中之后');
  assert.ok(position('x:summary') > position('x:id'), '摘要命中必须排在 id 命中之后');
  assert.ok(position('x:alias') > position('x:prefix'), '别名命中排在标题命中之后');
  // id 命中：夹具里 `x:id` 的 id 含 `x:id`，检索词「紧致」不在 id 里 → 它其实只有摘要命中，
  // 因此这里单独构造一条真 id 命中。
  const withIdHit = [...FIXTURE, { id: 'x:紧致-named', title: '标题不含', summary: '', alsoKnownAs: [] }];
  const rankedId = ids(serverRank.rankNodes(withIdHit, '紧致'));
  assert.ok(rankedId.indexOf('x:紧致-named') < rankedId.indexOf('x:summary'), 'id 命中要排在只有摘要命中之前');
  assert.ok(rankedId.indexOf('x:紧致-named') > rankedId.indexOf('x:alias'), 'id 命中要排在别名命中之后');
});

test('判据②完整度：整串相等 > 从头匹配 > 子串', () => {
  const ranked = ids(serverRank.rankNodes(FIXTURE, '紧致'));
  assert.ok(ranked.indexOf('x:exact') < ranked.indexOf('x:prefix'), '整串相等要赢过前缀匹配');
  assert.ok(ranked.indexOf('x:prefix') < ranked.indexOf('x:substring'), '前缀匹配要赢过中间的子串');
});

test('判据③位置：命中越靠前越好（上限 60 之后不再更差）', () => {
  const ranked = ids(serverRank.rankNodes(FIXTURE, '紧'));
  assert.ok(ranked.indexOf('x:prefix') < ranked.indexOf('x:late'), '词首命中要赢过靠后的命中');
  // 上限：把命中推到第 60 位之后，分数不再下降（同一档内并列，按 id 定序）。
  const far = serverRank.scoreNode({ id: 'a', title: `${'某'.repeat(80)}紧`, summary: '', alsoKnownAs: [] }, '紧');
  const cap = serverRank.scoreNode({ id: 'a', title: `${'某'.repeat(60)}紧`, summary: '', alsoKnownAs: [] }, '紧');
  assert.equal(far.score, cap.score, `位置扣分应当在 ${serverRank.HIT_POSITION_CAP} 处封顶`);
});

test('判据④连续性：逐字相邻命中赢过散开命中', () => {
  const ranked = ids(serverRank.rankNodes(FIXTURE, '紧致'));
  assert.ok(ranked.indexOf('x:substring') < ranked.indexOf('x:scattered'),
    '「仿紧致」这种连续命中要赢过「紧而致之」这种散开命中');
  const compact = serverRank.scoreNode({ id: 'a', title: '紧致性', summary: '', alsoKnownAs: [] }, '紧致');
  const scattered = serverRank.scoreNode({ id: 'a', title: '紧而致之', summary: '', alsoKnownAs: [] }, '紧致');
  assert.ok(compact.score > scattered.score, `连续命中（${compact.score}）应当高于散开命中（${scattered.score}）`);
});

test('判据⑤并列时按 id 字典序：同一输入两次逐字相同', () => {
  const tied = [
    { id: 'b:x', title: '紧致', summary: '', alsoKnownAs: [] },
    { id: 'a:x', title: '紧致', summary: '', alsoKnownAs: [] },
    { id: 'c:x', title: '紧致', summary: '', alsoKnownAs: [] },
  ];
  assert.deepEqual(ids(serverRank.rankNodes(tied, '紧致')), ['a:x', 'b:x', 'c:x'], '并列按 id 定序');
  assert.equal(JSON.stringify(serverRank.rankNodes(tied, '紧致')), JSON.stringify(serverRank.rankNodes(tied, '紧致')),
    '同一输入两次调用应当逐字相同');
  // 输入顺序不影响结果（确定性）。
  assert.deepEqual(ids(serverRank.rankNodes([...tied].reverse(), '紧致')), ['a:x', 'b:x', 'c:x']);
});

/* ───────────────────────── 两处等价（反漂移） ───────────────────────── */

test('服务端与前端两份实现：同一批节点 + 同一批检索词，次序逐字相同', () => {
  const queries = ['紧', '紧致', '光滑', '坐标', 'stokes', 'Stokes', '群', '极限', '  ', '不存在的词', 'C^k', '流形'];
  for (const query of queries) {
    const server = ids(serverRank.rankNodes(nodes, query));
    const web = ids(webRank.rankNodes(nodes, query));
    assert.equal(web.length, server.length, `「${query}」：两处条数不同`);
    assert.deepEqual(web, server, `「${query}」：两处次序不同`);
    // 逐条分数也一致（不只是次序碰巧一样）。
    for (const node of nodes.slice(0, 40)) {
      assert.equal(
        webRank.scoreNode(node, query).score,
        serverRank.scoreNode(node, query).score,
        `「${query}」：${node.id} 的分数两处不同`,
      );
    }
  }
});

test('命中集合的判据两处一致：四字段子串（含别名），排序不改集合', () => {
  for (const node of nodes) {
    for (const query of ['紧', '光滑流形', '坐标图', '不存在的词']) {
      assert.equal(webRank.matchesQuery(node, query), serverRank.matchesQuery(node, query),
        `${node.id} + 「${query}」：两处的命中判定不同`);
    }
  }
  // 排序只改次序：条数与 id 集合必须与输入完全一致。
  const ranked = serverRank.rankNodes(nodes, '紧');
  assert.equal(ranked.length, nodes.length);
  assert.deepEqual([...ids(ranked)].sort(), [...ids(nodes)].sort());
});

/* ───────────────────────── 真实本体上用户报的那一例 ───────────────────────── */

test('用户报的那一例：搜「紧」时标题命中排在摘要命中之前', () => {
  const matched = nodes.filter((node) => serverRank.matchesQuery(node, '紧'));
  assert.ok(matched.length >= 10, `搜「紧」应当命中十几个节点，实际 ${matched.length}`);
  const ranked = serverRank.rankNodes(matched, '紧');
  const first = ranked[0];
  const firstScore = serverRank.scoreNode(first, '紧');
  assert.equal(firstScore.hit, 'title', `第一名应当是标题命中，实际是 ${firstScore.hit}（${first.title}）`);
  assert.ok(first.title.includes('紧'), `第一名的标题里应当有「紧」：${first.title}`);

  /*
   * 旧实现的问题：`scoreNode` 里只有摘要命中（`hit === 'summary'`）的条目会拿到负分，
   * 因此它们一定排在**任何**标题命中的后面。
   */
  const summaryOnly = ranked.filter((node) => serverRank.scoreNode(node, '紧').hit === 'summary');
  const titleHit = ranked.filter((node) => serverRank.scoreNode(node, '紧').hit === 'title');
  assert.ok(summaryOnly.length > 0, '搜「紧」应当有「只有摘要命中」的条目（例如广义 Stokes 定理）');
  const lastTitle = Math.max(...titleHit.map((node) => ranked.indexOf(node)));
  const firstSummary = Math.min(...summaryOnly.map((node) => ranked.indexOf(node)));
  assert.ok(lastTitle < firstSummary,
    `标题命中必须整体排在摘要命中之前（最后一个标题命中 ${lastTitle} vs 第一个摘要命中 ${firstSummary}）`);

  // 具体那一条：广义 Stokes 定理（摘要讲紧支撑）不再排在「紧致性」前面。
  const compactness = ranked.findIndex((node) => node.id === 'top:compactness');
  const stokes = ranked.findIndex((node) => node.id === 'dg:generalized-stokes-theorem');
  if (stokes !== -1) {
    assert.ok(compactness < stokes, `「紧致性」应当排在「广义 Stokes 定理」之前（${compactness} vs ${stokes}）`);
  }
  // 而那条节点确实还在结果里（排序不改集合，不是把它藏掉）。
  assert.ok(stokes !== -1, '「广义 Stokes 定理」命中摘要，仍然应当在结果里（只是排在后面）');
});

test('真实本体：常见词的结果里，标题命中整体排在其余命中之前', () => {
  /*
   * 这一条锚的是**分档**，不是「前三名都必须含词」——后者对「光滑图册」这类由两个词拼起来的
   * 检索不成立：标题含「光滑图册」的只有 2 个，第 3 名自然落到「只有摘要命中」的「光滑结构」。
   * 用户真正关心的是「相关的不被无关的挤下去」，因此判据写成：
   * **所有标题命中都排在第一条非标题命中之前**（夹具那一套已经逐条验过字段优先级）。
   */
  for (const query of ['紧', '紧致', '光滑', '光滑图册', '坐标', '图册', '群', '极限']) {
    const matched = nodes.filter((node) => serverRank.matchesQuery(node, query));
    const ranked = serverRank.rankNodes(matched, query);
    const firstNonTitle = ranked.findIndex((node) => serverRank.scoreNode(node, query).hit !== 'title');
    const titleHitCount = ranked.filter((node) => serverRank.scoreNode(node, query).hit === 'title').length;
    assert.ok(titleHitCount > 0, `搜「${query}」应当有标题命中的节点`);
    if (firstNonTitle !== -1) {
      assert.ok(titleHitCount === firstNonTitle,
        `搜「${query}」：${titleHitCount} 个标题命中之后才是别的命中，实际第一个非标题命中在第 ${firstNonTitle} 位`);
    }
  }
});

test('空检索词：原样返回（不排序、不丢条），大小写与首尾空格都归一', () => {
  assert.deepEqual(ids(serverRank.rankNodes(nodes, '')), ids(nodes), '空词应当原样返回');
  assert.deepEqual(ids(serverRank.rankNodes(nodes, '   ')), ids(nodes), '只有空格也算空词');
  assert.deepEqual(ids(serverRank.rankNodes(nodes, ' stokes ')), ids(serverRank.rankNodes(nodes, 'Stokes')),
    '大小写与首尾空格应当归一');
});

test('命中理由：四种字段都有显示名，且界面与规则读同一处', () => {
  for (const hit of ['title', 'alias', 'id', 'summary']) {
    assert.ok(webRank.hitLabel(hit, 'zh').length > 0, `${hit} 缺少中文显示名`);
    assert.ok(webRank.hitLabel(hit, 'en').length > 0, `${hit} 缺少英文显示名`);
  }
  assert.equal(webRank.hitLabel(null), '', '没有命中时不该给理由');
  assert.match(webRank.hitLabel('summary', 'zh'), /摘要/, '摘要命中的理由要写明它不是名字');
});
