/**
 * 中英双语 API 验收：语种视图在真实服务进程里的行为。
 *
 * 用真服务（`startTestServer`）而不是直接调路由处理体：语种是在**请求处理链**上换的，
 * 直接调处理体就绕开了这一层——而这一层正是以后最容易被某次重构悄悄破坏的地方
 * （再加一条早退分支、某处又取一次 `requestOntology()`，语种就没了）。
 */

import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { startTestServer, jsonCall } from './helpers.mjs';

let server;
before(async () => { server = await startTestServer(); });
after(async () => { await server?.cleanup(); });

const origin = () => server.origin;

/** 与 `jsonCall` 同义，但把响应头也带回来（语种回报在头上）。 */
async function callWithHeaders(path, options = {}) {
  const response = await fetch(origin() + path, {
    method: options.method ?? 'GET',
    headers: { 'Content-Type': 'application/json', ...(options.headers ?? {}) },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
  const payload = await response.json();
  return { status: response.status, payload, headers: response.headers };
}

const CJK = /[\u3400-\u4dbf\u4e00-\u9fff]/;

test('语种视图：同一路径 ?locale=en 返回英文，缺省返回中文', async () => {
  const zh = await callWithHeaders('/api/v2/ontology/nodes/limit:limit-ed');
  const en = await callWithHeaders('/api/v2/ontology/nodes/limit:limit-ed?locale=en');
  assert.equal(zh.status, 200);
  assert.equal(en.status, 200);
  /*
   * 断言「语种真的换了」，而不是「某个具体节点还没被翻译」。
   *
   * 最初这里写的是「中文标题等于『函数极限的 ε–δ 定义』、英文标题等于那句英文」——
   * 那等于把验收钉死在某一批译文上：译者改一次措辞、或某个案例还没翻，测试就红，
   * 而它红的原因与「语种机制坏了」完全无关。现在改成两条**稳定**的性质：
   * 中文视图必须含中文；英文视图必须与中文不同且**不含中文**（散文层面）。
   */
  assert.match(zh.payload.data.node.title, CJK, `中文视图的标题应是中文：${zh.payload.data.node.title}`);
  assert.notEqual(en.payload.data.node.title, zh.payload.data.node.title);
  assert.doesNotMatch(en.payload.data.node.title, CJK, `英文视图的标题不该还是中文：${en.payload.data.node.title}`);
  /*
   * 摘要同理：检「摘要真的被译过」，而不是「摘要里必须有 punctured-neighbourhood 这个词」。
   * 原先写的是 `assert.match(en…summary, /punctured-neighbourhood/)`——那同样把验收钉在
   * 一句具体译文上（译者换一种说法就红）。现在检三条性质：非空、与中文摘要不同、不含中文。
   */
  assert.ok(en.payload.data.node.summary.length > 0, '英文视图的摘要不该为空');
  assert.notEqual(en.payload.data.node.summary, zh.payload.data.node.summary, '英文摘要应确实被译过');
  assert.doesNotMatch(en.payload.data.node.summary, CJK, `英文摘要不该还是中文：${en.payload.data.node.summary}`);
  /* 信封版本必须相同：这正是「换语言不换本体版本」的可核对形式。 */
  assert.equal(en.payload.ontologyVersion, zh.payload.ontologyVersion);
  /* 响应头如实回报实际使用的语种。 */
  assert.equal(en.headers.get('x-mcs-locale'), 'en');
  assert.equal(zh.headers.get('x-mcs-locale'), 'zh');

  /* 数学结构与受控值不受语言影响。 */
  assert.equal(en.payload.data.node.formal.predicate, zh.payload.data.node.formal.predicate);
  assert.equal(en.payload.data.node.construct, zh.payload.data.node.construct);
  assert.deepEqual(en.payload.data.node.roles, zh.payload.data.node.roles);
  assert.equal(en.payload.data.node.id, zh.payload.data.node.id);
});

test('语种视图：未知语种回落中文，不猜测也不报错', async () => {
  const fr = await callWithHeaders('/api/v2/ontology/nodes/limit:limit-ed?locale=fr');
  assert.equal(fr.status, 200);
  assert.match(fr.payload.data.node.title, CJK, `未知语种应回落中文：${fr.payload.data.node.title}`);
  assert.equal(fr.headers.get('x-mcs-locale'), 'zh');

  /* 请求头通道：与查询参数同义；两个都给了，**查询参数优先**。 */
  const viaHeader = await callWithHeaders('/api/v2/ontology/nodes/limit:limit-ed', { headers: { 'x-mcs-locale': 'en' } });
  assert.doesNotMatch(viaHeader.payload.data.node.title, CJK);
  const headerBeaten = await callWithHeaders('/api/v2/ontology/nodes/limit:limit-ed?locale=zh', { headers: { 'x-mcs-locale': 'en' } });
  assert.match(headerBeaten.payload.data.node.title, CJK);
});

test('语种视图：节点列表与图数据也随语种切换，条数不变', async () => {
  const zh = await jsonCall(origin(), '/api/v2/ontology/nodes?limit=500&granularity=all');
  const en = await jsonCall(origin(), '/api/v2/ontology/nodes?limit=500&granularity=all&locale=en');
  assert.equal(en.payload.data.total, zh.payload.data.total);
  assert.equal(en.payload.data.nodes.length, zh.payload.data.nodes.length);
  const zhTitles = new Map(zh.payload.data.nodes.map((node) => [node.id, node.title]));
  const enTitles = new Map(en.payload.data.nodes.map((node) => [node.id, node.title]));

  /*
   * 每一个节点都要么换成英文、要么回落成**中文原文**，绝不允许第三种状态（空串、undefined、
   * `[object Object]`）。中文侧不受影响。这条性质不随翻译进度变化。
   */
  let translated = 0;
  for (const [id, zhTitle] of zhTitles) {
    const enTitle = enTitles.get(id);
    assert.equal(typeof enTitle, 'string', `${id} 的英文标题不是字符串`);
    assert.ok(enTitle.length > 0, `${id} 的英文标题是空白`);
    if (enTitle === zhTitle) continue;
    translated += 1;
    assert.doesNotMatch(enTitle, CJK, `${id} 换了语言却仍含中文：${enTitle}`);
  }
  assert.ok(translated > 0, '英文视图应当已经翻译了一部分节点');

  const enGraph = await jsonCall(origin(), '/api/v2/ontology/graph?locale=en');
  assert.equal(enGraph.status, 200);
  assert.equal(enGraph.payload.data.nodes.length, zh.payload.data.nodes.length);
});

test('英文视图中写学习事件仍落在同一本体版本上', async () => {
  const profileResponse = await jsonCall(origin(), '/api/v2/profiles', { method: 'POST', body: { name: 'en-probe' } });
  const profileId = profileResponse.payload.data.profile.id;
  const health = await jsonCall(origin(), '/api/v2/health?locale=en');
  const version = health.payload.data.ontology.version;
  const written = await jsonCall(origin(), `/api/v2/profiles/${profileId}/events?locale=en`, {
    method: 'POST',
    body: {
      event: {
        eventId: 'i18n-en-1',
        ontologyVersion: version,
        kind: 'view',
        nodeId: 'limit:limit-ed',
        payload: { context: 'read' },
      },
    },
  });
  assert.equal(written.status, 200);
  /* 中文请求读同一个档案：事件按 id 引用节点，语言不影响它与 θ 的对应。 */
  const read = await jsonCall(origin(), `/api/v2/profiles/${profileId}/events?limit=50&locale=zh`);
  assert.equal(read.status, 200);
  assert.ok(read.payload.data.events.some((event) => event.eventId === 'i18n-en-1'), JSON.stringify(read.payload.data).slice(0, 300));
  /* 英文请求读到的 θ 指向同一个节点 id（不是「英文的另一个节点」）。 */
  const enRead = await jsonCall(origin(), `/api/v2/profiles/${profileId}?locale=en`);
  const viewed = enRead.payload.data.theta.viewed;
  assert.ok(Array.isArray(viewed) && viewed.length > 0, JSON.stringify(enRead.payload.data.theta).slice(0, 300));
  assert.ok(viewed.some((item) => (typeof item === 'string' ? item : item.node) === 'limit:limit-ed'));
});

test('英文视图中请求一个未译节点：返回中文原文与可核对的版本，不报错', async () => {
  const { status, payload } = await jsonCall(origin(), '/api/v2/ontology/nodes/group:group-concept?locale=en');
  assert.equal(status, 200);
  assert.equal(payload.data.node.id, 'group:group-concept');
  assert.ok(payload.data.node.title.length > 0);
  assert.ok(payload.data.node.contentMarkdown.length > 0);
});
