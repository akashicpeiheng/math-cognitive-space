import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { stageArrowGeometry } from '../web/src/stage-arrow.ts';

/**
 * 丝质箭头的不变量。
 *
 * 它是**画在真实坐标上**的：根部必须压在源卡片底下、尖端必须停在目标卡片之外，
 * 两端都必须落在真实卡片上（这是上一版最大的问题：尾巴悬在卡片中间的空地上，
 * 看的人认不出箭头从哪个节点出发）。分叉、渐细、退化情形都能在 node 里核对，
 * 不必开浏览器——浏览器那层只负责「它确实渲染出来了」，见 tests/browser.mjs。
 *
 * 节点尺寸取自 `web/src/network.ts` 的**源码文本**而不是 import：
 * 那个模块 import 时省略了扩展名（Vite 能解析，node 的 ESM 解析器不能）。
 */
const here = dirname(fileURLToPath(import.meta.url));
const networkSource = readFileSync(resolve(here, '../web/src/network.ts'), 'utf8');
const numberFrom = (name) => Number((networkSource.match(new RegExp(`export const ${name} = (\\d+);`)) ?? [])[1] ?? NaN);
const NODE_W = numberFrom('NODE_W');
const NODE_H = numberFrom('NODE_H');

test('丝质箭头：节点尺寸取自 network.ts（改了一处就两边对不上）', () => {
  assert.equal(NODE_W, 172, `NODE_W 变了：${NODE_W}。几何断言要跟着复核`);
  assert.equal(NODE_H, 58, `NODE_H 变了：${NODE_H}。几何断言要跟着复核`);
});

const geometryFor = (from, to) => stageArrowGeometry({
  from, to, sourceW: NODE_W, sourceH: NODE_H, targetW: NODE_W, targetH: NODE_H,
});

/** 从闭合路径里取出所有顶点（`M x,y L x,y … Z`）。 */
const vertices = (path) => [...path.matchAll(/(-?[\d.]+),(-?[\d.]+)/g)].map((m) => [Number(m[1]), Number(m[2])]);

/** 路径上最宽处的宽度：把前半段与后半段按采样序号配对求距离。 */
function midWidth(path) {
  const points = vertices(path);
  const half = points.length / 2;
  let best = 0;
  for (let index = 0; index < half; index += 1) {
    const a = points[index];
    const b = points[points.length - 1 - index];
    best = Math.max(best, Math.hypot(a[0] - b[0], a[1] - b[1]));
  }
  return best;
}

test('丝质箭头：根部压在源卡片底下，尖端停在目标卡片之外', () => {
  const source = { x: 0, y: 0 };
  const target = { x: 700, y: 0 };
  const arrow = geometryFor([source], target);
  assert.ok(arrow, '这不是退化情形，应该画得出来');

  // 根部在源卡片沿 −u 方向的边界上：x 应当落在卡片背面（−NODE_W/2）。
  assert.ok(Math.abs(arrow.origin.x - (source.x - NODE_W / 2)) < 0.2, `根部应在卡片背面：${arrow.origin.x}`);
  assert.ok(Math.abs(arrow.origin.y - source.y) < 0.2, `根部应在卡片高度的中线上：${arrow.origin.y}`);

  // 尖端在目标卡片之外，且贴得不远。
  const gap = Math.hypot(target.x - arrow.tip.x, target.y - arrow.tip.y);
  assert.ok(arrow.tip.x < target.x, '尖端必须在目标中心之前');
  assert.ok(gap >= NODE_W / 2, `尖端至少要在卡片左边界之外，实际 ${gap}`);
  assert.ok(gap <= NODE_W / 2 + 12, `尖端离卡片太远（${gap}），丝会显得没指到目标`);

  // 两端之间的长度 = 距离 − 目标侧半宽 − 空隙 + 源侧半宽（因为根部退到了背面）。
  const expected = Math.hypot(target.x - source.x, target.y - source.y) - NODE_W / 2 - 7 + NODE_W / 2;
  assert.ok(Math.abs(arrow.length - expected) < 0.5, `长度应约等于中心距 − 空隙：${arrow.length} vs ${expected}`);
});

test('丝质箭头：分叉是真的——多股丝带横向错开，两端收细、中段最宽', () => {
  const arrow = geometryFor([{ x: 0, y: 0 }], { x: 760, y: 0 });
  assert.ok(arrow);
  assert.ok(arrow.strands.length >= 3, `至少要三股才谈得上分叉：${arrow.strands.length}`);
  assert.equal(arrow.strands.length % 2, 1, '股数取奇数，正中一股走主轴');

  // 偏移一半在正侧、一半在负侧，且关于主轴对称。
  const offsets = arrow.strands.map((strand) => strand.offset);
  assert.equal(offsets[Math.floor(offsets.length / 2)], 0, '正中那股应当不偏');
  assert.ok(Math.min(...offsets) < 0 && Math.max(...offsets) > 0, `两侧都要有丝：${offsets.join(',')}`);
  for (let index = 0; index < offsets.length; index += 1) {
    assert.ok(Math.abs(offsets[index] + offsets[offsets.length - 1 - index]) < 0.2, '分叉应当关于主轴对称');
  }
  assert.ok(arrow.forkWidth > 40, `分叉总宽太小就读不出分叉：${arrow.forkWidth}`);

  // 每股丝带：两端收细、中段最宽（这就是「丝」的锥度）。
  for (const strand of arrow.strands) {
    const points = vertices(strand.body);
    assert.ok(points.length >= 20, `丝带是采样出来的多边形，点太少会看出折角：${points.length}`);
    const head = points.slice(0, points.length / 2);
    const tail = points.slice(points.length / 2).reverse();
    const widthAt = (index) => Math.hypot(head[index][0] - tail[index][0], head[index][1] - tail[index][1]);
    const middle = midWidth(strand.body);
    assert.ok(middle > widthAt(0) + 1, `根部应当比中段细：${widthAt(0)} vs ${middle}`);
    assert.ok(middle > widthAt(head.length - 1) + 1, `末端应当比中段细：${widthAt(head.length - 1)} vs ${middle}`);
    assert.ok(Math.abs(middle - strand.peakWidth) < 1.2, `中段宽度应接近声明的峰值：${middle} vs ${strand.peakWidth}`);
  }

  // 外侧的丝更细：中段最粗的那股是主轴。
  const widths = arrow.strands.map((strand) => strand.peakWidth);
  assert.ok(widths[Math.floor(widths.length / 2)] === Math.max(...widths), `主轴应当最粗：${widths.join(',')}`);
});

test('丝质箭头：箭镞收在尖端，且是一条闭合的凹边轮廓', () => {
  const arrow = geometryFor([{ x: 0, y: 0 }], { x: 500, y: 320 });
  assert.ok(arrow);
  assert.match(arrow.head, /^M .+ Z$/);
  const points = vertices(arrow.head);
  assert.ok(points.length >= 4, '箭镞至少要有尖、两翼与控制点');
  assert.ok(Math.abs(points[0][0] - arrow.tip.x) < 0.2 && Math.abs(points[0][1] - arrow.tip.y) < 0.2, '轮廓起点就是尖端');
  // 箭镞底边中点就是 headBase。
  assert.ok(Math.abs(arrow.headBase.x - (arrow.tip.x - (arrow.tip.x - arrow.headBase.x))) < 0.2);
  // 丝带全部收在箭镞底边之前（沿轴方向不越过）。
  const ux = (arrow.tip.x - arrow.origin.x) / arrow.length;
  const uy = (arrow.tip.y - arrow.origin.y) / arrow.length;
  const baseProjection = (arrow.headBase.x - arrow.origin.x) * ux + (arrow.headBase.y - arrow.origin.y) * uy;
  for (const strand of arrow.strands) {
    for (const [x, y] of vertices(strand.body)) {
      const projection = (x - arrow.origin.x) * ux + (y - arrow.origin.y) * uy;
      assert.ok(projection <= baseProjection + 4.5, `丝带越过了箭镞底边：${projection} > ${baseProjection}`);
    }
  }
});

test('丝质箭头：源集合越分散，根部张得越开', () => {
  const tight = geometryFor([{ x: 0, y: 0 }], { x: 800, y: 0 });
  const wide = geometryFor(
    [{ x: -150, y: -120 }, { x: 150, y: 120 }, { x: -150, y: 120 }, { x: 150, y: -120 }],
    { x: 800, y: 0 },
  );
  assert.ok(tight && wide);
  assert.ok(wide.forkWidth > tight.forkWidth, `源越分散分叉越宽：${wide.forkWidth} vs ${tight.forkWidth}`);
  assert.ok(tight.forkWidth > 40, `单点出发也要留出可见的分叉：${tight.forkWidth}`);
  assert.ok(wide.forkWidth <= 170, `分叉不能无限宽：${wide.forkWidth}`);
});

test('丝质箭头：两站贴得太近时不画，而不是塞一团色块', () => {
  // 上下相邻的两张卡片：扣掉两张卡片的半高就没什么可画了。
  assert.equal(geometryFor([{ x: 0, y: 0 }], { x: 0, y: NODE_H }), null);
  // 完全重合，没有方向。
  assert.equal(geometryFor([{ x: 10, y: 10 }], { x: 10, y: 10 }), null);
  // 没有源。
  assert.equal(geometryFor([], { x: 900, y: 0 }), null);
});

test('丝质箭头：坐标确定性（同一输入两次调用逐字相同）', () => {
  const from = [{ x: 12, y: -7 }, { x: 90, y: 40 }];
  const to = { x: 640, y: 120 };
  assert.deepEqual(geometryFor(from, to), geometryFor(from, to), '几何是纯函数，不能有随机或时间依赖');
});
