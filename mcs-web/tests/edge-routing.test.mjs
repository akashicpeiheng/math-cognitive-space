import test from 'node:test';
import assert from 'node:assert/strict';
import { controlFor, quadPoint, routeEdges, sampleCurve } from '../web/src/edge-routing.ts';

/**
 * 边在「实在绕不开」时才弯。
 *
 * 用户的要求：「给那些实在绕不开的关系设置弧线策略，减少遮挡的影响。」
 * 这里逐条钉住三种绕不开的情形（平行边、穿卡、共线重叠），以及**同样重要的一半**：
 * 没有冲突的边必须保持直线——弧线是补救手段，不是风格。
 */

const NODE_W = 172;
const NODE_H = 58;

/** 由卡片左上角生成两端锚点（与 edgeAnchor 同口径：横向或纵向贴边）。 */
function anchor(from, to) {
  const fromCx = from.x + NODE_W / 2; const fromCy = from.y + NODE_H / 2;
  const toCx = to.x + NODE_W / 2; const toCy = to.y + NODE_H / 2;
  const horizontal = Math.abs(toCx - fromCx) >= Math.abs(toCy - fromCy);
  if (horizontal) {
    const leftToRight = toCx >= fromCx;
    return {
      x1: leftToRight ? from.x + NODE_W : from.x, y1: fromCy,
      x2: leftToRight ? to.x : to.x + NODE_W, y2: toCy,
    };
  }
  const topToBottom = toCy >= fromCy;
  return {
    x1: fromCx, y1: topToBottom ? from.y + NODE_H : from.y,
    x2: toCx, y2: topToBottom ? to.y : to.y + NODE_H,
  };
}

function edgeBetween(id, from, to) {
  return { id, from: from.id, to: to.id, ...anchor(from, to) };
}

/** 曲线是否压在某张卡上（含 padding）。 */
function pressesCard(points, node, padding = 0) {
  return points.some((point) => (
    Math.abs(point.x - (node.x + NODE_W / 2)) < NODE_W / 2 + padding
    && Math.abs(point.y - (node.y + NODE_H / 2)) < NODE_H / 2 + padding
  ));
}

test('平行边：同一对节点之间的多条关系得到对称偏移，不再完全重合', () => {
  const a = { id: 'a', x: 0, y: 0 };
  const b = { id: 'b', x: 420, y: 0 };
  const edges = [
    edgeBetween('e1', a, b),
    edgeBetween('e2', a, b),
    edgeBetween('e3', a, b),
  ];
  const { bows, stats } = routeEdges([a, b], edges);
  const values = edges.map((edge) => bows.get(edge.id));
  assert.equal(new Set(values).size, 3, '三条平行边必须有三个不同的弓高：' + JSON.stringify(values));
  // 对称：正负各一，中间那条保持直线。
  assert.equal(values.filter((value) => value > 0).length, 1);
  assert.equal(values.filter((value) => value < 0).length, 1);
  assert.equal(values.filter((value) => value === 0).length, 1);
  assert.equal(stats.parallel, 3);
  // 中点确实分开了：两两之间至少隔开 10px。
  const mids = edges.map((edge) => {
    const control = controlFor(edge, bows.get(edge.id));
    return quadPoint(edge.x1, edge.y1, control.cx, control.cy, edge.x2, edge.y2, 0.5);
  });
  for (let i = 0; i < mids.length; i += 1) {
    for (let j = i + 1; j < mids.length; j += 1) {
      assert.ok(Math.abs(mids[i].y - mids[j].y) >= 10, `第 ${i}、${j} 条的中点仍然贴在一起：${JSON.stringify(mids)}`);
    }
  }
});

test('穿卡：直线压住第三张卡片时弯出去，且弯后的曲线不再压卡', () => {
  const a = { id: 'a', x: 0, y: 0 };
  const b = { id: 'b', x: 600, y: 0 };
  const middle = { id: 'm', x: 240, y: -28 }; // 正压在 a-b 的连线上
  const edge = edgeBetween('e1', a, b);
  assert.equal(pressesCard(sampleCurve(edge, 0), middle), true, '前提：直线确实压住了中间那张卡');

  const { bows, stats } = routeEdges([a, b, middle], [edge]);
  const bow = bows.get('e1');
  assert.ok(Math.abs(bow) > 1, '必须弯出去：' + bow);
  assert.equal(stats.throughCard, 1);
  assert.equal(pressesCard(sampleCurve(edge, bow), middle), false, '弯之后不能还压着那张卡');
  assert.equal(stats.throughCardResidual, 0, '这张图上没有绕不开的边');
});

test('穿卡：两张挡路卡分居两侧、上限内绕不开时，仍取「压得最少」的弓高', () => {
  /*
   * 2026-10 修的正是这一档：第一版「取最苛刻的一张卡、按它弯过去」，
   * 实测会撞进另一侧的卡——弯了还是压卡，甚至压得更多。
   * 现在候选弓高里逐个验「这条曲线还压着几张卡」，只接受**严格更少**的那个，
   * 并且即使绕不干净也要如实计入 `throughCardResidual`。
   */
  const a = { id: 'a', x: 0, y: 0 };
  const b = { id: 'b', x: 900, y: 0 };
  // 两张卡都横跨连线（连线 y=29）而分居两侧：往上让开需要 ~108px、往下需要 ~114px，
  // 都超过默认 96px 的上限——因此这张图上没有「清空」的解。
  const upper = { id: 'up', x: 300, y: -26 };
  const lower = { id: 'down', x: 600, y: 24 };
  const edge = edgeBetween('e1', a, b);
  const countPressed = (bow) => [upper, lower].filter((node) => pressesCard(sampleCurve(edge, bow), node)).length;
  assert.equal(countPressed(0), 2, '前提：直线同时压住两张卡');

  const { bows, stats } = routeEdges([a, b, upper, lower], [edge]);
  const bow = bows.get('e1');
  assert.ok(countPressed(bow) < countPressed(0), `弯完必须比直线压得少：bow=${bow} 压 ${countPressed(bow)}`);
  assert.equal(stats.throughCard, 1);
  assert.equal(stats.throughCardResidual, countPressed(bow) > 0 ? 1 : 0, JSON.stringify(stats));
  assert.ok(Math.abs(bow) <= 96, '弓高不超过默认上限：' + bow);
});

test('穿卡：弓高上限内绕不开时保持直线（不为了弯而弯）', () => {
  const a = { id: 'a', x: 0, y: 0 };
  const b = { id: 'b', x: 600, y: 0 };
  const middle = { id: 'm', x: 240, y: -28 };
  const edge = edgeBetween('e1', a, b);
  // 上限只有 12px，而绕开这张卡需要 100px 以上——任何候选都清不掉它。
  const { bows, stats } = routeEdges([a, b, middle], [edge], { maxBow: 12 });
  assert.equal(bows.get('e1'), 0, '绕不开时不该留下一条没用的弧线：' + bows.get('e1'));
  assert.equal(stats.throughCard, 0);
  assert.equal(stats.throughCardResidual, 1, '绕不开的边要如实计进残余：' + JSON.stringify(stats));
  for (const bow of bows.values()) assert.ok(Math.abs(bow) <= 12, '任何情况下都不超过上限');
});

test('没有冲突的边保持直线（弧线是补救，不是风格）', () => {
  const a = { id: 'a', x: 0, y: 0 };
  const b = { id: 'b', x: 600, y: 0 };
  const far = { id: 'f', x: 300, y: 400 }; // 离得远，不构成遮挡
  const edges = [edgeBetween('e1', a, b), edgeBetween('e2', a, far)];
  const { bows, stats } = routeEdges([a, b, far], edges);
  assert.equal(bows.get('e1'), 0);
  assert.equal(bows.get('e2'), 0);
  assert.equal(stats.straight, 2);
  assert.equal(stats.parallel + stats.throughCard + stats.overlapping, 0);
});

test('共线重叠：两条几乎重合的边被分开', () => {
  /*
   * 直接给线段：两条从不同起点出发、几乎完全重合的边（间距 4px < 容差 10px）。
   * 不用卡片构造——卡片锚点天然会把两条线错开一个卡高，那样根本触发不了这条规则
   * （第一版就是这么写错的：前提不成立，断言当然不通过）。
   */
  const edges = [
    { id: 'e1', from: 'a', to: 'b', x1: 0, y1: 0, x2: 400, y2: 0 },
    { id: 'e2', from: 'c', to: 'd', x1: 0, y1: 4, x2: 400, y2: 4 },
  ];
  const { bows, stats } = routeEdges([], edges);
  const values = [bows.get('e1'), bows.get('e2')];
  assert.ok(values.some((value) => Math.abs(value) > 0.5), '至少一条要挪开：' + JSON.stringify(values));
  assert.equal(stats.overlapping, 1, JSON.stringify(stats));
  // 挪开之后两条的中点必须真的分开（不是挪了个没用的量）。
  const midOf = (edge) => {
    const control = controlFor(edge, bows.get(edge.id));
    return quadPoint(edge.x1, edge.y1, control.cx, control.cy, edge.x2, edge.y2, 0.5);
  };
  const [m1, m2] = edges.map(midOf);
  assert.ok(Math.abs(m1.y - m2.y) >= 10, '中点仍然贴在一起：' + JSON.stringify([m1, m2]));
});

test('弓高有上限，且决定性是稳定的（同输入同输出）', () => {
  const a = { id: 'a', x: 0, y: 0 };
  const b = { id: 'b', x: 900, y: 0 };
  const middle = { id: 'm', x: 200, y: -28 };
  const edges = [edgeBetween('e1', a, b), edgeBetween('e2', a, b)];
  const first = routeEdges([a, b, middle], edges, { maxBow: 40 });
  for (const bow of first.bows.values()) assert.ok(Math.abs(bow) <= 40, '弓高超过上限：' + bow);
  const second = routeEdges([a, b, middle], edges, { maxBow: 40 });
  assert.deepEqual([...first.bows], [...second.bows]);
});

test('直线段与曲线共用同一套几何：控制点偏移是弓高的两倍', () => {
  const edge = { id: 'e', from: 'a', to: 'b', x1: 0, y1: 0, x2: 100, y2: 0 };
  const bow = 30;
  const control = controlFor(edge, bow);
  assert.equal(control.cx, 50);
  assert.equal(control.cy, bow * 2, '二次贝塞尔的顶点偏移是控制点偏移的一半');
  const apex = quadPoint(edge.x1, edge.y1, control.cx, control.cy, edge.x2, edge.y2, 0.5);
  assert.equal(Math.round(apex.x), 50);
  assert.equal(Math.round(apex.y), bow, '曲线顶点应当正好偏一个弓高');
});
