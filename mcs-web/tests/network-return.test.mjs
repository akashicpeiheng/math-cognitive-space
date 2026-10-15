import test from 'node:test';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { MCS_WEB_ROOT } from '../core/ontology.mjs';

/**
 * 「回到网络视图」的来路上下文（2026-10 加，`web/src/network-return.ts`）。
 *
 * 用户的要求：「在网络中打开具体节点之后增加返回网络视图的选项」。
 *
 * 这一套只查**派生与边界**（纯函数 + 一个 sessionStorage 替身，不需要浏览器）：
 *
 * 1. 该存的存：`nodes` 与结构回放五件套进快照；`from` / `locale` 这类与图无关的不进。
 * 2. 该退的退：URL 上只有 `?from=network`、会话里没有快照时，**不编一个假地址**
 *    （返回 null，界面退成「在网络视图里打开这个节点」）。
 * 3. 语种跟着当前页面走：中文存的图在英文站上返回链接是 `/en/network…`，
 *    不会把英文读者送回中文页。
 * 4. 会话存储坏掉（隐私模式、坏 JSON）时一律退成「没有来路」，不抛错、不白屏。
 */
const {
  networkSearchOf, rememberNetworkReturn, readNetworkReturn, networkNodeHref,
  networkReturnHref, openInNetworkHref, localeOfNetworkHref,
  FROM_PARAM, FROM_NETWORK, NETWORK_PARAM_KEYS,
} = await import(pathToFileURL(resolve(MCS_WEB_ROOT, 'web/src/network-return.ts')).href);

/** 最小的 sessionStorage 替身：够这一套用，且能注入坏数据。 */
function fakeSession() {
  const map = new Map();
  return {
    getItem: (key) => (map.has(key) ? map.get(key) : null),
    setItem: (key, value) => { map.set(key, String(value)); },
    removeItem: (key) => { map.delete(key); },
    key: (index) => [...map.keys()][index] ?? null,
    get length() { return map.size; },
    __raw: map,
  };
}

/** 每个用例装一次干净的 sessionStorage 与 window。 */
function withStorage(initial = {}) {
  const store = fakeSession();
  for (const [key, value] of Object.entries(initial)) store.setItem(key, value);
  globalThis.window = { sessionStorage: store };
  return store;
}

const paramsOf = (search) => new URLSearchParams(search);

test('快照只收与图有关的参数：nodes 与回放六件套（含多程合一图的 stages）', () => {
  const search = networkSearchOf(paramsOf('nodes=a,b&play=1&entry=x&path=p&goal=g&route=r&stages=0:3&from=network&locale=en&foo=bar'));
  const kept = new URLSearchParams(search);
  for (const key of NETWORK_PARAM_KEYS) {
    assert.equal(kept.get(key), { nodes: 'a,b', play: '1', entry: 'x', path: 'p', goal: 'g', route: 'r', stages: '0:3' }[key],
      `${key} 应当进快照`);
  }
  for (const key of ['from', 'locale', 'foo']) {
    assert.equal(kept.has(key), false, `${key} 与图无关，不该进快照`);
  }
});

test('空参数与 null 都给出空快照（不抛错）', () => {
  assert.equal(networkSearchOf(null), '');
  assert.equal(networkSearchOf(paramsOf('')), '');
  // 空值的参数不写进快照：`?nodes=` 与「没有 nodes」是同一件事。
  assert.equal(networkSearchOf(paramsOf('nodes=&play=')), '');
});

test('记住来路 → 读回来；URL 上只带一个短标记', () => {
  withStorage();
  rememberNetworkReturn('dg:manifold', paramsOf('nodes=top:space,dg:manifold'), 'zh');
  const context = readNetworkReturn('dg:manifold');
  assert.ok(context, '记住了就该读得回来');
  assert.equal(context.href, '/network?nodes=top%3Aspace%2Cdg%3Amanifold');
  assert.equal(context.locale, 'zh');
  assert.ok(context.at.length > 0, '要留时间戳（调试与 FIFO 都要用）');

  // 节点页的地址只带 from，不带图的快照（快照在会话里）。
  const href = networkNodeHref('dg:manifold');
  assert.equal(href, '/nodes/dg%3Amanifold?from=network');
  assert.equal(href.includes('nodes='), false, '节点链接里不该出现图的快照');

  // 节点页自己的查询参数（路线阅读的 route/step）要保留，`from` 只保留一个。
  const kept = networkNodeHref('dg:manifold', '?route=r1&step=2&from=network');
  assert.equal(kept, '/nodes/dg%3Amanifold?route=r1&step=2&from=network');
  assert.equal(kept.split('from=').length - 1, 1, 'from 只能出现一次');
});

test('没有来路时返回 null —— 不编一个假地址', () => {
  withStorage();
  assert.equal(readNetworkReturn('dg:manifold'), null);
  assert.equal(networkReturnHref('dg:manifold', 'zh'), null, '没有快照时不该给出「回到网络视图」');
  // 降级入口是「在网络视图里打开这个节点」，只带这一个节点。
  assert.equal(openInNetworkHref('dg:manifold'), '/network?nodes=dg%3Amanifold');
});

test('语种：中文存的图在英文站上返回英文地址，不把读者送回中文页', () => {
  withStorage();
  rememberNetworkReturn('limit:bridge', paramsOf('nodes=limit:distance'), 'zh');
  assert.equal(networkReturnHref('limit:bridge', 'zh'), '/network?nodes=limit%3Adistance');
  assert.equal(networkReturnHref('limit:bridge', 'en'), '/en/network?nodes=limit%3Adistance');

  // 英文存的图，在中文站上返回中文地址（对称的一条）。
  withStorage();
  rememberNetworkReturn('limit:bridge', paramsOf('nodes=limit:distance'), 'en');
  assert.equal(networkReturnHref('limit:bridge', 'en'), '/en/network?nodes=limit%3Adistance');
  assert.equal(networkReturnHref('limit:bridge', 'zh'), '/network?nodes=limit%3Adistance');

  // 语种判定只认 `/en` 前缀（`/en` 本身也算）。
  assert.equal(localeOfNetworkHref('/en/network'), 'en');
  assert.equal(localeOfNetworkHref('/en/network?nodes=a'), 'en');
  assert.equal(localeOfNetworkHref('/network?nodes=a'), 'zh');
  assert.equal(localeOfNetworkHref('/english/network'), 'zh', '只认 /en 前缀，不靠字符串包含');
});

test('回放参数原样保留：回来的是同一张图，不是空网络', () => {
  withStorage();
  rememberNetworkReturn('dg:manifold', paramsOf('nodes=a,b,c&play=1&goal=dg:manifold&route=r9'), 'zh');
  const href = networkReturnHref('dg:manifold', 'zh');
  const query = new URLSearchParams(href.split('?')[1]);
  assert.equal(query.get('nodes'), 'a,b,c');
  assert.equal(query.get('play'), '1');
  assert.equal(query.get('goal'), 'dg:manifold');
  assert.equal(query.get('route'), 'r9');
});

test('坏数据与不可用的会话存储一律退成「没有来路」', () => {
  // 坏 JSON
  withStorage({ 'mcs-network-return-v1': '{不是 JSON' });
  assert.equal(readNetworkReturn('a'), null);
  assert.equal(networkReturnHref('a', 'zh'), null);

  // 形状不对（数组 / 缺 href）也当没有
  withStorage({ 'mcs-network-return-v1': JSON.stringify({ a: { href: '' }, b: ['x'], c: { href: 3 } }) });
  assert.equal(readNetworkReturn('a'), null);
  assert.equal(readNetworkReturn('b'), null);
  assert.equal(readNetworkReturn('c'), null);

  // 完全没有 sessionStorage（隐私模式 / 服务端渲染）
  delete globalThis.window;
  assert.equal(readNetworkReturn('a'), null);
  rememberNetworkReturn('a', paramsOf('nodes=x'), 'zh');
  assert.equal(networkReturnHref('a', 'zh'), null);
});

test('最多留 10 条：先进先出，且不影响最近那一条', () => {
  const store = withStorage();
  for (let index = 1; index <= 12; index += 1) {
    rememberNetworkReturn(`node-${index}`, paramsOf(`nodes=n${index}`));
  }
  const saved = JSON.parse(store.getItem('mcs-network-return-v1'));
  const keys = Object.keys(saved);
  assert.equal(keys.length, 10, `应当只留 10 条，实际 ${keys.length}`);
  assert.equal(keys.includes('node-1'), false, '最早的两条应当被挤掉');
  assert.equal(keys.includes('node-12'), true, '最近一条必须在');
  assert.equal(readNetworkReturn('node-12').href, '/network?nodes=n12');
});

test('FROM 常量与 URL 约定一致（界面与测试读同一处）', () => {
  assert.equal(FROM_PARAM, 'from');
  assert.equal(FROM_NETWORK, 'network');
  assert.ok(NETWORK_PARAM_KEYS.includes('nodes'));
});
