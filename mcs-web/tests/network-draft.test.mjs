import test from 'node:test';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { MCS_WEB_ROOT } from '../core/ontology.mjs';

/**
 * 网络视图的「本次学习」暂存（2026-10-13 加，`web/src/network-draft.ts`）。
 *
 * 用户的要求：「一次学习中搭建的网络视图要暂时的保存下来，不能有切到另外一个页面之后
 * 就需要重新搭建的情况」。
 *
 * 这一套只查**存储边界**（纯函数 + 一个 sessionStorage 替身，不需要浏览器）：
 *
 * 1. 该存的存、该还的还：节点集合、可见边源、相机逐字读回；
 * 2. 该退的退：没有暂存 / 读不出来 / 形状不对 / 空集合，一律当「没有暂存」，**且不删原记录**；
 * 3. 未知边源丢掉（渲染期取不到文案），相机形状不合法退成 `null`；
 * 4. 存储不可用（隐私模式、服务端渲染）时不抛错，读写降级。
 *
 * 真浏览器那一侧（切页 / 刷新 / 显式链接优先 / 丢弃）在 `tests/network-draft-page.mjs`。
 */
const {
  NETWORK_DRAFT_KEY, EDGE_FAMILY_KEYS, normalizeDraftFamilies, normalizeDraftCamera,
  readNetworkDraft, writeNetworkDraft, clearNetworkDraft,
} = await import(pathToFileURL(resolve(MCS_WEB_ROOT, 'web/src/network-draft.ts')).href);

/** 最小的 sessionStorage 替身：够这一套用，且能注入坏数据、能核对条目数。 */
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

const CAMERA = { x: -120.5, y: 64, scale: 1.75 };
const draftOf = (store) => JSON.parse(store.getItem(NETWORK_DRAFT_KEY));

/*
 * 用例共享 `globalThis.window`（每个用例装一次替身），因此**必须串行**：
 * 并发跑时一个用例的 `withStorage` 会盖掉另一个用例正在读的存储，红的是测试自己。
 * 与 `tests/network-return.test.mjs` 同一条纪律。
 */
const serial = { concurrency: false };

test('写进去读回来：节点、边源与相机逐字一致，并留时间戳', serial, () => {
  const store = withStorage();
  writeNetworkDraft({ added: ['top:space', 'dg:manifold'], families: ['contract', 'relation'], camera: CAMERA });
  const saved = draftOf(store);
  assert.deepEqual(saved.added, ['top:space', 'dg:manifold'], '节点集合按写入次序原样保存');
  assert.deepEqual(saved.families, ['contract', 'relation']);
  assert.deepEqual(saved.camera, CAMERA);

  const read = readNetworkDraft();
  assert.ok(read, '写过就该读得回来');
  assert.deepEqual(read.added, ['top:space', 'dg:manifold']);
  assert.deepEqual(read.families, ['contract', 'relation']);
  assert.deepEqual(read.camera, CAMERA);
  assert.ok(read.at.length > 0, '要留时间戳（调试与界面说明都要用）');
});

test('没有相机时不编一个：读写都是 null', serial, () => {
  withStorage();
  writeNetworkDraft({ added: ['top:space'], families: [] });
  assert.equal(draftOf(globalThis.window.sessionStorage).camera, null);
  assert.equal(readNetworkDraft().camera, null);
  writeNetworkDraft({ added: ['top:space'], families: [], camera: null });
  assert.equal(readNetworkDraft().camera, null);
});

test('没有暂存时读成 null（不是空对象）', serial, () => {
  withStorage();
  assert.equal(readNetworkDraft(), null);
});

test('存储不可用（隐私模式 / 服务端渲染）时不抛错，读写降级', serial, () => {
  // 完全没有 window
  delete globalThis.window;
  assert.equal(readNetworkDraft(), null);
  writeNetworkDraft({ added: ['a'], families: ['contract'], camera: CAMERA });
  clearNetworkDraft();

  // 有 window 但取 sessionStorage 就抛（隐私模式的一种表现）
  globalThis.window = { get sessionStorage() { throw new Error('denied'); } };
  assert.equal(readNetworkDraft(), null);
  writeNetworkDraft({ added: ['a'], families: ['contract'] });
  clearNetworkDraft();
});

test('setItem 抛错（配额满）时静默放弃，不影响调用方', serial, () => {
  globalThis.window = {
    sessionStorage: {
      getItem: () => null,
      setItem: () => { throw new Error('quota'); },
      removeItem: () => {},
    },
  };
  assert.doesNotThrow(() => writeNetworkDraft({ added: ['a'], families: ['contract'] }));
});

test('坏数据一律当「没有暂存」，且不删原记录', serial, () => {
  const cases = {
    '坏 JSON': '{不是 JSON',
    '数组': JSON.stringify(['a']),
    '字符串': JSON.stringify('a'),
    'null': 'null',
    '缺 added': JSON.stringify({ families: ['contract'] }),
    'added 不是数组': JSON.stringify({ added: 'top:space' }),
    'added 里全不是字符串': JSON.stringify({ added: [1, null, {}] }),
    'added 为空数组': JSON.stringify({ added: [] }),
  };
  for (const [label, raw] of Object.entries(cases)) {
    const store = withStorage({ [NETWORK_DRAFT_KEY]: raw });
    assert.equal(readNetworkDraft(), null, `${label} 应当读成「没有暂存」`);
    assert.equal(store.getItem(NETWORK_DRAFT_KEY), raw, `${label}：读不出来不等于可以删掉原记录`);
  }
});

test('边源字段坏掉只影响边源：节点照常读回，按默认边源处理', serial, () => {
  /*
   * 与「整条暂存读不出来」分开：`added` 是这张图的**身份**（没有它就不知道画了什么），
   * `families` 只是读法，缺了可以回退到默认边源。两者不该用同一条判据。
   */
  const cases = {
    'families 不是数组': JSON.stringify({ added: ['top:space'], families: 'contract' }),
    'families 缺失': JSON.stringify({ added: ['top:space'] }),
    'families 全非法': JSON.stringify({ added: ['top:space'], families: ['x', 3] }),
  };
  for (const [label, raw] of Object.entries(cases)) {
    const store = withStorage({ [NETWORK_DRAFT_KEY]: raw });
    const read = readNetworkDraft();
    assert.ok(read, `${label}：节点还在，就该读得出来`);
    assert.deepEqual(read.added, ['top:space'], label);
    assert.deepEqual(read.families, [], `${label}：没法识别的边源回退成空表（调用方用默认边源）`);
    assert.equal(store.getItem(NETWORK_DRAFT_KEY), raw, `${label}：原记录保留`);
  }
});

test('added 里的非字符串项被丢掉，字符串项照常保留', serial, () => {
  withStorage({ [NETWORK_DRAFT_KEY]: JSON.stringify({ added: ['top:space', 7, null, '', 'dg:manifold'], families: [] }) });
  assert.deepEqual(readNetworkDraft().added, ['top:space', 'dg:manifold']);
});

test('未知边源值丢掉、重复项合并：渲染期取不到文案的值不该留在暂存里', serial, () => {
  const store = withStorage();
  writeNetworkDraft({
    added: ['a'],
    families: ['contract', 'not-a-family', 'relation', 'contract', 'topic'],
  });
  assert.deepEqual(readNetworkDraft().families, ['contract', 'relation', 'topic']);
  // 写进去的原始串也已经是规范过的：读回来的东西不会比存的多
  assert.deepEqual(draftOf(store).families, ['contract', 'relation', 'topic']);

  // 全非法：返回空数组（调用方按默认边源处理），不返回非法值
  assert.deepEqual(normalizeDraftFamilies(['x', 'y', 3, null]), []);
  assert.deepEqual(normalizeDraftFamilies('contract'), [], '不是数组就当空');
});

test('相机形状不合法退成 null，其余字段照常读回', serial, () => {
  const bad = [
    { x: Number.NaN, y: 0, scale: 1 },
    { x: 0, y: Number.POSITIVE_INFINITY, scale: 1 },
    { x: 0, y: 0, scale: 0 },
    { x: 0, y: 0, scale: -2 },
    { x: '0', y: 0, scale: 1 },
    { x: 0, y: 0 },
    [1, 2, 3],
    'camera',
  ];
  for (const camera of bad) {
    withStorage({ [NETWORK_DRAFT_KEY]: JSON.stringify({ added: ['top:space'], families: ['contract'], camera }) });
    const read = readNetworkDraft();
    assert.ok(read, `相机 ${JSON.stringify(camera)} 合法与否都不该让整条暂存读不出来`);
    assert.equal(read.camera, null, `${JSON.stringify(camera)} 应当退成 null`);
    assert.deepEqual(read.added, ['top:space']);
  }
  // 单独核对纯函数那一侧
  assert.deepEqual(normalizeDraftCamera({ x: 0, y: 0, scale: 0.25 }), { x: 0, y: 0, scale: 0.25 });
  assert.equal(normalizeDraftCamera(null), null);
  assert.equal(normalizeDraftCamera(undefined), null);
});

test('清除暂存：删掉这一条，其余会话键不受影响', serial, () => {
  const store = withStorage({ 'mcs-network-return-v1': '{"x":{"href":"/network"}}' });
  writeNetworkDraft({ added: ['a'], families: ['contract'], camera: CAMERA });
  assert.ok(store.getItem(NETWORK_DRAFT_KEY));
  clearNetworkDraft();
  assert.equal(store.getItem(NETWORK_DRAFT_KEY), null);
  assert.equal(readNetworkDraft(), null);
  assert.ok(store.getItem('mcs-network-return-v1'), '别的会话键不许被顺手清掉');
});

test('边源键与 network.ts 的边源表逐字一致（漂移守卫）', async () => {
  const { EDGE_FAMILY_LABELS } = await import(pathToFileURL(resolve(MCS_WEB_ROOT, 'web/src/network.ts')).href);
  assert.deepEqual(
    [...EDGE_FAMILY_KEYS].sort(),
    Object.keys(EDGE_FAMILY_LABELS).sort(),
    'EDGE_FAMILY_KEYS 与 EDGE_FAMILY_LABELS 漂开后，恢复出来的边源会取不到文案',
  );
});

test('键名是本会话专用的独立键，不与保存的视图混用', () => {
  /*
   * 不 import `network-views.ts`：它 `import { api } from './api'`（无扩展名，走打包器），
   * node 的类型剥离不做扩展名补全，加载它会把这一套拖进模块解析错误里。
   * 键名是**字面量契约**（README 与两套验收都按它读），在这里逐字钉住就够。
   */
  const LOCAL_VIEWS_KEY = 'mcs-network-views-local-v1';
  assert.equal(NETWORK_DRAFT_KEY, 'mcs-network-draft-v1');
  assert.notEqual(NETWORK_DRAFT_KEY, LOCAL_VIEWS_KEY, '暂存与保存的视图是两套机制，不许共用一个键');
});
