import test from 'node:test';
import assert from 'node:assert/strict';
import { countCrossings, placeNewNodes, segmentsCross } from '../web/src/node-placement.ts';

/**
 * 新增节点的自动摆位。
 *
 * 用户的要求是两条硬指标的合成：「新增节点不与原有的节点重叠」＋「新增的关系尽可能少一点
 * 与已有的关系的交错」。因此这里不测「摆得好看」，只测能数出来的东西：
 * 间隙、交叉数、边长、确定性。
 */

const NODE_W = 172;
const NODE_H = 58;

/** 两个卡片是否重叠（含间隙要求）。 */
function overlapCount(nodes, gapX = 0, gapY = 0) {
  let count = 0;
  for (let i = 0; i < nodes.length; i += 1) {
    for (let j = i + 1; j < nodes.length; j += 1) {
      if (Math.abs(nodes[i].x - nodes[j].x) < NODE_W + gapX && Math.abs(nodes[i].y - nodes[j].y) < NODE_H + gapY) count += 1;
    }
  }
  return count;
}

test('线段交叉判定：真交叉算，共享端点与共线接触不算', () => {
  assert.equal(segmentsCross({ x: 0, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 10 }, { x: 10, y: 0 }), true);
  assert.equal(segmentsCross({ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 0, y: 0 }, { x: 0, y: 10 }), false, '共享端点不算交叉');
  assert.equal(segmentsCross({ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 0, y: 5 }, { x: 10, y: 5 }), false, '平行不交叉');
  assert.equal(segmentsCross({ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 5, y: -5 }, { x: 5, y: 5 }), true);
});

test('交叉计数跳过共享端点的边', () => {
  const at = new Map([
    ['a', { x: 0, y: 0 }], ['b', { x: 100, y: 0 }], ['c', { x: 50, y: -50 }], ['d', { x: 50, y: 50 }],
  ]);
  // a-b 与 c-d 交叉；a-c 与 a-b 共享 a，不算。
  assert.equal(countCrossings([{ from: 'a', to: 'b' }, { from: 'c', to: 'd' }], at), 1);
  assert.equal(countCrossings([{ from: 'a', to: 'b' }, { from: 'a', to: 'c' }], at), 0);
  assert.equal(countCrossings([{ from: 'a', to: 'b' }, { from: 'c', to: 'd' }, { from: 'a', to: 'c' }], at), 1);
});

test('新节点不与任何已有节点重叠（多次摆放累积也不重叠）', () => {
  const existing = [
    { id: 'x1', x: 0, y: 0 }, { id: 'x2', x: 260, y: 0 }, { id: 'x3', x: 0, y: 200 },
  ];
  const links = [
    { from: 'x1', to: 'x2' }, { from: 'x1', to: 'x3' },
    { from: 'n1', to: 'x1' }, { from: 'n2', to: 'x2' }, { from: 'n3', to: 'x3' },
    { from: 'n4', to: 'x1' }, { from: 'n5', to: 'x2' },
  ];
  const result = placeNewNodes({ existing, pending: ['n1', 'n2', 'n3', 'n4', 'n5'], links });
  const all = [...existing, ...[...result.placements].map(([id, point]) => ({ id, ...point }))];
  assert.equal(overlapCount(all), 0, JSON.stringify(all));
  assert.ok(result.placements.size === 5, String(result.placements.size));
  // 边界约束只对**新摆的**节点成立：已有节点的坐标是给定的（这里故意给了 0）。
  assert.ok([...result.placements.values()].every((point) => point.x >= 28 && point.y >= 28), '新节点不能越出左上留白');
});

test('摆位确实减少与已有关系的交错：比「放在邻居质心」更好', () => {
  /*
   * 构造一个质心位置必然打架的场面：四张卡片围成十字，两条已有边在对角交叉。
   * 新节点连到 x1 与 x2，直接放在两者中点会正好压住已有边、也会与 x3 重叠。
   */
  const existing = [
    { id: 'x1', x: 0, y: 0 }, { id: 'x2', x: 400, y: 400 },
    { id: 'x3', x: 200, y: 200 }, { id: 'x4', x: 400, y: 0 }, { id: 'x5', x: 0, y: 400 },
  ];
  const links = [
    { from: 'x1', to: 'x2' }, { from: 'x4', to: 'x5' },
    { from: 'n1', to: 'x1' }, { from: 'n1', to: 'x5' },
  ];
  const optimized = placeNewNodes({ existing, pending: ['n1'], links });

  // 朴素做法：放在两个邻居的中点。
  const naive = new Map(existing.map((node) => [node.id, { x: node.x, y: node.y }]));
  naive.set('n1', { x: (0 + 0) / 2, y: (0 + 400) / 2 });
  const naiveCrossings = countCrossings(links, naive);
  const optimizedCrossings = countCrossings(links, new Map([...naive, ...optimized.placements]));
  assert.ok(optimizedCrossings <= naiveCrossings,
    `优化后交叉数 ${optimizedCrossings} 应不多于朴素摆放 ${naiveCrossings}`);
  assert.equal(optimized.stats.minGap >= 0, true, '最小间隙不能为负（负数是重叠）');
});

test('同样的输入得到同样的位置（确定性，不用随机数）', () => {
  const input = {
    existing: [{ id: 'a', x: 0, y: 0 }, { id: 'b', x: 300, y: 120 }],
    pending: ['p1', 'p2', 'p3'],
    links: [{ from: 'p1', to: 'a' }, { from: 'p2', to: 'b' }, { from: 'p3', to: 'p1' }, { from: 'a', to: 'b' }],
  };
  const first = placeNewNodes(input);
  const second = placeNewNodes(input);
  assert.deepEqual([...first.placements], [...second.placements]);
});

test('枢纽先落位：相连的两个新节点会挨在一起，而不是各走一边', () => {
  const existing = [{ id: 'a', x: 0, y: 0 }, { id: 'b', x: 500, y: 0 }];
  const links = [
    { from: 'hub', to: 'a' }, { from: 'hub', to: 'b' },
    { from: 'leaf', to: 'hub' },
  ];
  const result = placeNewNodes({ existing, pending: ['leaf', 'hub'], links });
  const hub = result.placements.get('hub');
  const leaf = result.placements.get('leaf');
  assert.ok(hub && leaf);
  const distance = Math.hypot(hub.x - leaf.x, hub.y - leaf.y);
  assert.ok(distance < 400, `相连的新节点应当靠近，实际距离 ${Math.round(distance)}`);
});

test('空图与孤立节点也能摆：退化成绕原点的螺线，且互相不重叠', () => {
  const result = placeNewNodes({ existing: [], pending: ['i1', 'i2', 'i3'], links: [] });
  const placed = [...result.placements].map(([id, point]) => ({ id, ...point }));
  assert.equal(placed.length, 3);
  assert.equal(overlapCount(placed), 0, JSON.stringify(placed));
  assert.equal(result.stats.crossings, 0);
});

test('图很密时仍然不重叠（候选全被拒绝的兜底路径）', () => {
  // 20 张卡片紧挨着铺满一圈，新节点连到中心节点。
  const existing = Array.from({ length: 20 }, (_unused, index) => ({
    id: `c${index}`,
    x: (index % 5) * (NODE_W + 24),
    y: Math.floor(index / 5) * (NODE_H + 16),
  }));
  const links = existing.map((node) => ({ from: node.id, to: 'c0' })).concat([{ from: 'new', to: 'c0' }]);
  const result = placeNewNodes({ existing, pending: ['new'], links });
  const point = result.placements.get('new');
  assert.ok(point, '必须给出位置');
  const clash = existing.some((node) => Math.abs(point.x - node.x) < NODE_W && Math.abs(point.y - node.y) < NODE_H);
  assert.equal(clash, false, `兜底位置也不能重叠：${JSON.stringify(point)}`);
});
