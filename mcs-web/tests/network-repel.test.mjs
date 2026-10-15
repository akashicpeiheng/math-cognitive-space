import test from 'node:test';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { MCS_WEB_ROOT } from '../core/ontology.mjs';

/**
 * 拖动时的斥力（`web/src/network.ts` 的 `repelFromDrag`）。
 *
 * 用户的抱怨是「把节点拖到另一个节点旁边会闪」，根因是避让只发生在**放手**那一下：
 * 落点被螺线搜索挪到最近的空位，一放手就跳。现在改成拖动中每帧做斥力——
 * 被拖动的那一张留在指针下，被它压住的让开一点点。
 *
 * 这一套只测能数出来的性质：
 * 1. 拖动者**一步都不动**（它是指针拿着的那一张）；
 * 2. 让开的位移**刚好够**（不小于最小间距、也不夸张）；
 * 3. 位移与压入深度**成比例**（连续性的机械保证：手指走 1px，邻座也让 1px 量级）；
 * 4. 连锁：被挤开的压到第三张时，第三张也跟着让；
 * 5. 确定性（同一输入两次调用逐字相同）。
 */
const network = await import(pathToFileURL(resolve(MCS_WEB_ROOT, 'web/src/network.ts')).href);
const { repelFromDrag, NODE_W, NODE_H } = network;

const GAP_X = 20;
const GAP_Y = 12;
const node = (id, x, y) => ({ id, x, y });

/** 两张卡片是否重叠（含最小间距）。 */
const clashes = (a, b, gapX = GAP_X, gapY = GAP_Y) => Math.abs(a.x - b.x) < NODE_W + gapX && Math.abs(a.y - b.y) < NODE_H + gapY;

/** 把斥力结果并回坐标表。 */
function applied(placed, draggedId, draggedPosition, options) {
  const pushed = repelFromDrag(placed, draggedId, draggedPosition, options);
  return {
    pushed,
    positions: Object.fromEntries(placed.map((item) => [item.id, item.id === draggedId ? { ...draggedPosition } : pushed[item.id] ?? { x: item.x, y: item.y }])),
  };
}

test('斥力：拖动者一步都不动（指针在它身上）', () => {
  const placed = [node('drag', 0, 0), node('b', 40, 10)];
  const { pushed, positions } = applied(placed, 'drag', { x: 30, y: 5 });
  assert.equal(pushed.drag, undefined, '被拖动的那一张不出现在结果里');
  assert.deepEqual(positions.drag, { x: 30, y: 5 }, '它就停在指针给的位置');
  assert.ok(pushed.b, '被压住的邻座让开了');
});

test('斥力：让开的位移刚好够——不重叠，也不夸张', () => {
  const placed = [node('drag', 0, 0), node('b', 40, 10)];
  const { pushed, positions } = applied(placed, 'drag', { x: 30, y: 5 });
  assert.ok(pushed.b, '被压住的邻座让开了');
  assert.equal(clashes(positions.drag, positions.b), false, '让开之后不再重叠');
  const distance = Math.hypot(positions.b.x - placed[1].x, positions.b.y - placed[1].y);
  assert.ok(distance > 0 && distance < NODE_H + GAP_Y + 4, `让开的距离应当在一个卡片高度之内：${distance}`);
});

test('斥力：位移与压入深度成比例（连续性的机械保证）', () => {
  /*
   * 「闪」的反面是连续：手指多压进 1 个单位，邻座就多让约 1 个单位。
   * 这里沿一条直线逐步压入（起点就已经贴上），检查每步的位移增量等于压入增量。
   */
  const steps = [0, 2, 4, 6, 8, 10];
  const pushedY = steps.map((step) => applied([node('drag', 0, 0), node('b', 0, 60)], 'drag', { x: 0, y: step }).positions.b.y);
  assert.ok(pushedY[0] >= NODE_H + GAP_Y, `第一帧就该让到最小间距：${pushedY[0]}`);
  for (let index = 1; index < pushedY.length; index += 1) {
    const delta = pushedY[index] - pushedY[index - 1];
    const pressed = steps[index] - steps[index - 1];
    assert.ok(Math.abs(delta - pressed) <= 0.6, `第 ${index} 步：压入 ${pressed} 却让开 ${delta}`);
  }
});

test('斥力：连锁——被挤开的那张再压到第三张时，第三张也跟着让', () => {
  // b 与 c 本来就贴着；把 drag 压到 b 上，b 让开时会顶到 c。
  const placed = [node('drag', 0, 0), node('b', 0, 80), node('c', 0, 160)];
  const { positions } = applied(placed, 'drag', { x: 0, y: 20 });
  expectNoClashes([positions.drag, positions.b, positions.c]);
  assert.ok(positions.c.y > 160, `c 应当被顶开一点：${positions.c.y}`);
  function expectNoClashes(list) {
    for (let i = 0; i < list.length; i += 1) {
      for (let j = i + 1; j < list.length; j += 1) {
        assert.equal(clashes(list[i], list[j]), false, `第 ${i} 与第 ${j} 张仍然重叠：${JSON.stringify(list)}`);
      }
    }
  }
});

test('斥力：拖远之后不再有位移（松手时没有可解的重叠）', () => {
  const placed = [node('drag', 0, 0), node('b', 400, 400)];
  const { pushed } = applied(placed, 'drag', { x: 20, y: 20 });
  assert.deepEqual(pushed, {}, '离得远就不该动任何东西');
});

test('斥力：默认只看附近一圈，放手那一次可以要求全量', () => {
  /*
   * 拖动中每帧都跑，因此只看被拖动者附近；放手那一次 `full` 才处理全部——
   * 那时只跑一遍，代价可以付，换来的是「谁被压住都解得开」，兜底挪动因此几乎用不上。
   */
  const placed = [node('drag', 0, 0), node('near', 30, 0), node('far', 2000, 0)];
  const near = repelFromDrag(placed, 'drag', { x: 20, y: 0 });
  assert.ok(near.near, '附近那张让开了');
  assert.equal(near.far, undefined, '远处那张不动');
  const full = repelFromDrag(placed, 'drag', { x: 20, y: 0 }, { full: true });
  assert.deepEqual(Object.keys(full).sort(), ['near'], '全量也不会去动够不着的卡片');
});

test('斥力：确定性——同一输入两次调用逐字相同，且与调用顺序无关', () => {
  const placed = [node('drag', 0, 0), node('b', 30, 10), node('c', 60, 20), node('d', -20, 15)];
  const first = repelFromDrag(placed, 'drag', { x: 25, y: 8 }, { full: true });
  const second = repelFromDrag(placed, 'drag', { x: 25, y: 8 }, { full: true });
  assert.deepEqual(first, second);
  assert.ok(Object.keys(first).length >= 2, `这一坨应当有多张被推开：${JSON.stringify(first)}`);
  // 结果必须仍然互不重叠（收尾那一步保证拖动者与谁都不压）。
  const positions = placed.map((item) => (item.id === 'drag' ? { x: 25, y: 8 } : first[item.id] ?? { x: item.x, y: item.y }));
  for (let i = 0; i < positions.length; i += 1) {
    for (let j = i + 1; j < positions.length; j += 1) {
      assert.equal(clashes(positions[i], positions[j]), false, `残留重叠：${JSON.stringify(positions)}`);
    }
  }
});

test('斥力：拖动者不在集合里时什么都不做（不抛错）', () => {
  assert.deepEqual(repelFromDrag([node('a', 0, 0)], 'missing', { x: 0, y: 0 }), {});
  assert.deepEqual(repelFromDrag([], 'missing', { x: 0, y: 0 }), {});
});
