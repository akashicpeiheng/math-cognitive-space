import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { stageArrowGeometry, stageArrowTrail, STAGE_ARROW_LINE_PX, STAGE_ARROW_HEAD_PX } from '../web/src/stage-arrow.ts';

/**
 * 细箭头的不变量（2026-10-15 改版）。
 *
 * 它是**画在真实坐标上**的：起点必须落在源端边界之外一点、箭尖必须停在目标端之外一点，
 * 两端都得贴着真实图形（这是上一版最大的问题：端点按卡片矩形裁剪，
 * 而缩到 55% 以下时节点画成半径 8px 的圆点，尾巴于是悬在离圆点四十多像素的空地上）。
 *
 * 三件事在 node 里核对，不必开浏览器：
 * 1. **细**：线宽与箭镞按屏幕像素给定，除以相机比例才是世界单位——缩放到哪儿都一样细；
 * 2. **贴**：卡片档按矩形边界、圆点档按半径，两端都裁在自己的外形上；
 * 3. **留**：回放到第 k 步时画布上留着 k 支（走过的）+ 1 支（预告），步号就是学习顺序。
 *
 * 节点尺寸取自 `web/src/network.ts` 的**源码文本**而不是 import：
 * 那个模块 import 时省略了扩展名（Vite 能解析，node 的 ESM 解析器不能）。
 */
const here = dirname(fileURLToPath(import.meta.url));
const networkSource = readFileSync(resolve(here, '../web/src/network.ts'), 'utf8');
const numberFrom = (name) => Number((networkSource.match(new RegExp(`export const ${name} = (\\d+);`)) ?? [])[1] ?? NaN);
const NODE_W = numberFrom('NODE_W');
const NODE_H = numberFrom('NODE_H');

const card = (width = NODE_W, height = NODE_H) => ({ kind: 'card', width, height });
const dot = (radius) => ({ kind: 'dot', radius });
/** 圆点的世界半径：8px 屏幕半径在 54% 比例下的样子（回放实测就是这个比例）。 */
const DOT_WORLD = 8 / 0.54;

test('细箭头：节点尺寸取自 network.ts（改了一处就两边对不上）', () => {
  assert.equal(NODE_W, 172, `NODE_W 变了：${NODE_W}。几何断言要跟着复核`);
  assert.equal(NODE_H, 58, `NODE_H 变了：${NODE_H}。几何断言要跟着复核`);
});

const geometryFor = (from, to, extra = {}) => stageArrowGeometry({
  from, to, source: card(), target: card(), scale: 1, ...extra,
});

/** 二次贝塞尔上的点（`M x0,y0 Q cx,cy x1,y1`）。 */
function quadPointAt(path, t) {
  const numbers = [...path.matchAll(/(-?[\d.]+),(-?[\d.]+)/g)].map((match) => [Number(match[1]), Number(match[2])]);
  const [p0, control, p1] = numbers;
  const s = 1 - t;
  return {
    x: s * s * p0[0] + 2 * s * t * control[0] + t * t * p1[0],
    y: s * s * p0[1] + 2 * s * t * control[1] + t * t * p1[1],
  };
}

test('细箭头：主干是二次贝塞尔，起点在源端之外、箭尖停在目标端之外', () => {
  const source = { x: 0, y: 0 };
  const target = { x: 700, y: 0 };
  const arrow = geometryFor([source], target);
  assert.ok(arrow, '这不是退化情形，应该画得出来');
  assert.match(arrow.path, /^M -?[\d.]+,-?[\d.]+ Q -?[\d.]+,-?[\d.]+ -?[\d.]+,-?[\d.]+$/, arrow.path);

  // 卡片档：起点在源卡片右边界之外一点（半宽 86 + 1.5 的缝）。
  assert.ok(arrow.origin.x > source.x + NODE_W / 2, `起点必须在源卡片之外：${arrow.origin.x}`);
  assert.ok(arrow.origin.x < source.x + NODE_W / 2 + 4, `起点贴太远了：${arrow.origin.x}`);
  assert.ok(Math.abs(arrow.origin.y - source.y) < 0.2, `起点应落在卡片高度的中线上：${arrow.origin.y}`);

  // 箭尖在目标卡片之前，且贴得不远。
  assert.ok(arrow.tip.x < target.x, '箭尖必须在目标中心之前');
  const gap = target.x - arrow.tip.x - NODE_W / 2;
  assert.ok(gap >= 3 && gap <= 6, `箭尖与卡片之间应当只留几个像素的缝，实际 ${gap}`);
});

test('细箭头：圆点档下两端贴着圆点（旧版在圆点档会把尾巴留在四十多像素外）', () => {
  const source = { x: 0, y: 0 };
  const target = { x: 400, y: 0 };
  const scale = 0.54;
  const arrow = stageArrowGeometry({
    from: [source], to: target, source: dot(DOT_WORLD), target: dot(DOT_WORLD), scale,
  });
  assert.ok(arrow);
  // 世界单位换算回屏幕像素：起点 1.5px、箭尖 4px，都是「贴着图形」的量级。
  const sourceGap = (Math.hypot(arrow.origin.x - source.x, arrow.origin.y - source.y) - DOT_WORLD) * scale;
  const targetGap = (Math.hypot(arrow.tip.x - target.x, arrow.tip.y - target.y) - DOT_WORLD) * scale;
  assert.ok(sourceGap >= 1 && sourceGap <= 3, `起点应当就在圆点边上：${sourceGap}`);
  assert.ok(targetGap >= 3 && targetGap <= 5, `箭尖应当就在圆点边上：${targetGap}`);
  // 圆弧是各向同性的：斜着连也一样贴。
  const diagonal = stageArrowGeometry({
    from: [{ x: 0, y: 0 }], to: { x: 300, y: 300 }, source: dot(DOT_WORLD), target: dot(DOT_WORLD), scale,
  });
  const diagonalGap = (Math.hypot(diagonal.origin.x, diagonal.origin.y) - DOT_WORLD) * scale;
  assert.ok(diagonalGap >= 1 && diagonalGap <= 3, `斜向也要贴：${diagonalGap}`);
});

test('细箭头：很细——线宽与箭镞按屏幕像素给，缩放到哪儿都一样', () => {
  for (const scale of [0.25, 0.54, 1, 1.8]) {
    const arrow = geometryFor([{ x: 0, y: 0 }], { x: 800, y: 240 }, { scale });
    assert.ok(arrow);
    assert.ok(Math.abs(arrow.lineWidth * scale - STAGE_ARROW_LINE_PX) < 0.05,
      `主干在世界里是 ${arrow.lineWidth}，画到屏幕上应当是 ${STAGE_ARROW_LINE_PX}px`);
    const headPx = Math.hypot(arrow.tip.x - arrow.headBase.x, arrow.tip.y - arrow.headBase.y) * scale;
    assert.ok(Math.abs(headPx - STAGE_ARROW_HEAD_PX) < 0.4, `箭镞屏幕上应当是 ${STAGE_ARROW_HEAD_PX}px，实际 ${headPx}`);
    // 比卡片细两个数量级：这就是「很细的外形」，与旧版 11–30 世界单位的丝带刚好相反。
    assert.ok(arrow.lineWidth < NODE_H / 8, `线宽比卡片高度还大就不叫细线了：${arrow.lineWidth}`);
  }
});

test('细箭头：避障——挡在直线上的卡片会把线推开', () => {
  const source = { x: 0, y: 0 };
  const target = { x: 900, y: 0 };
  const straight = geometryFor([source], target);
  const blocked = geometryFor([source], target, { avoid: [{ x: 450, y: 0 }], avoidEnd: card() });
  assert.ok(straight && blocked);
  // 直线走法在中点不偏；被挡住时中点应当明显离开中线。
  assert.ok(Math.abs(quadPointAt(straight.path, 0.5).y) < 1, '没有障碍时不该无故绕远');
  assert.ok(Math.abs(quadPointAt(blocked.path, 0.5).y) > NODE_H / 2, `有障碍时应当绕开：${quadPointAt(blocked.path, 0.5).y}`);
});

test('细箭头：两端外形重叠时改走绕行弧——那一步的箭头不许缺号', () => {
  /*
   * 力导向布局把同一话题的节点放得很近：实测一条 12 步的路线里有 3 步的两端中心距
   * 只有 68–85 世界单位，而卡片宽 172——中间根本没有走廊。旧写法在这里返回 null，
   * 于是「每一步都留一支箭头」出现缺号（7 → 10），缺的正好是最密的那几步。
   */
  const source = { x: 0, y: 0 };
  const target = { x: 82, y: 0 };  // 比卡片还窄：两张卡片直接叠在一起
  const arrow = geometryFor([source], target);
  assert.ok(arrow, '两端重叠也要画出这一步的箭头（走绕行弧）');
  assert.ok(arrow.pathLength >= 26, `绕行弧要够长：${arrow.pathLength}`);

  // 鼓包必须在两张卡片之外：卡片半高 29，中点应当明显离开中线。
  const midOffset = Math.abs(arrow.mid.y);
  assert.ok(midOffset > NODE_H / 2, `绕行弧要绕到卡片外面去：${midOffset}`);

  // 箭镞朝着目标：到达方向的切向必须指向目标中心。
  const arrival = { x: arrow.tip.x - arrow.headBase.x, y: arrow.tip.y - arrow.headBase.y };
  const toTarget = { x: target.x - arrow.tip.x, y: target.y - arrow.tip.y };
  const cos = (arrival.x * toTarget.x + arrival.y * toTarget.y) / (Math.hypot(arrival.x, arrival.y) * Math.hypot(toTarget.x, toTarget.y));
  assert.ok(cos > 0.5, `箭镞要从外侧切进目标，实际余弦 ${cos}`);

  // 完全重合（源就是目标）仍然不画：那种情形没有任何方向可言。
  assert.equal(geometryFor([{ x: 10, y: 10 }], { x: 10, y: 10 }), null);
  // 没有源。
  assert.equal(geometryFor([], { x: 900, y: 0 }), null);
});

test('细箭头：源集合里取离目标最近的那一个出发', () => {
  const arrow = geometryFor([{ x: -400, y: 0 }, { x: 0, y: 0 }, { x: -800, y: 0 }], { x: 600, y: 0 });
  assert.ok(arrow);
  assert.equal(arrow.sourceIndex, 1, '应当从最靠近目标的那张卡片出发');
  assert.ok(Math.abs(arrow.origin.x - (NODE_W / 2 + 1.5)) < 0.5, `起点应当贴在那张卡片上：${arrow.origin.x}`);
});

test('细箭头：远处的卡片不影响结果（走廊外的障碍先被筛掉，等价性）', () => {
  /*
   * 取舍本身不影响结果：评分被 80 个「上限」封顶，比上限还远的卡片无论如何都改不了它。
   * 但回放里这一层会按步数重复（走到第 40 步就有 40 支箭头、每支一次搜索），
   * 不筛掉那几百个远处节点就是纯浪费。这条断言把「筛了 = 没筛」钉死。
   */
  const far = Array.from({ length: 300 }, (_, index) => ({ x: 4000 + index * 137, y: 3000 - index * 91 }));
  const withoutFar = geometryFor([{ x: 0, y: 0 }], { x: 800, y: 240 }, { avoid: far, avoidEnd: card() });
  const bare = geometryFor([{ x: 0, y: 0 }], { x: 800, y: 240 });
  assert.deepEqual(withoutFar, bare, '远处的卡片不该改变这一支箭头的几何');

  // 挡住路的那一张仍然要生效（筛子不能把该管的也筛掉）。
  const blocked = geometryFor([{ x: 0, y: 0 }], { x: 800, y: 240 }, { avoid: [{ x: 400, y: 120 }], avoidEnd: card() });
  assert.notDeepEqual(blocked.path, bare.path, '挡在走廊上的卡片必须仍然把线推开');
});

test('细箭头：压在同一条走廊里的关系边会把箭头推出去（2026-10-15 加）', () => {
  /*
   * 用户截图里的问题：同一对卡片之间既有「硬前置」关系边、又有这一步的路径箭头，
   * 两者挤在同一条走廊里，读起来混成一片。关系边现在也是障碍。
   */
  const source = { x: 0, y: 0 };
  const target = { x: 900, y: 0 };
  const straight = geometryFor([source], target);
  const withEdge = geometryFor([source], target, {
    avoidEdges: [{ x1: NODE_W / 2, y1: 0, x2: 900 - NODE_W / 2, y2: 0 }],
  });
  assert.ok(straight && withEdge);
  assert.ok(Math.abs(quadPointAt(straight.path, 0.5).y) < 1, '没有障碍时走直线');
  assert.ok(Math.abs(quadPointAt(withEdge.path, 0.5).y) > 40,
    `走廊里有一条边时该甩出去：${quadPointAt(withEdge.path, 0.5).y}`);

  // 远处的关系边不改变几何（与卡片那条等价性同理）。
  const farEdges = Array.from({ length: 40 }, (_, index) => ({ x1: 6000 + index * 90, y1: 4000, x2: 6200 + index * 90, y2: 4300 }));
  assert.deepEqual(geometryFor([source], target, { avoidEdges: farEdges }), straight);
});

test('细箭头：同分时朝「外面」鼓（远离参考点的那一侧）', () => {
  /*
   * 两侧一样空时选外侧：节点群内部的空白本来就少，关系边又都在里面，
   * 往外绕才是真的绕开了。这里在弦的上下各放一张等距卡片，判据对称，胜负由外侧偏好决定。
   */
  const source = { x: 0, y: 0 };
  const target = { x: 900, y: 0 };
  // 上下各一张等距卡片，且贴得够近（直线到它们的距离小于「够空」的阈值），直连拿不到满分。
  const blockers = [{ x: 450, y: 50 }, { x: 450, y: -50 }];
  const up = geometryFor([source], target, { avoid: blockers, awayFrom: { x: 450, y: 600 } });
  const down = geometryFor([source], target, { avoid: blockers, awayFrom: { x: 450, y: -600 } });
  assert.ok(up && down);
  assert.ok(quadPointAt(up.path, 0.5).y < 0, `参考点在下方时应当朝上鼓：${quadPointAt(up.path, 0.5).y}`);
  assert.ok(quadPointAt(down.path, 0.5).y > 0, `参考点在上方时应当朝下鼓：${quadPointAt(down.path, 0.5).y}`);
  // 两侧差不多空的时候不必绕太远：挑的是「够用就好」的那一档。
  assert.ok(Math.abs(quadPointAt(up.path, 0.5).y) < 260, `不该甩得没边：${quadPointAt(up.path, 0.5).y}`);
});

test('细箭头：坐标确定性（同一输入两次调用逐字相同）', () => {
  const from = [{ x: 12, y: -7 }, { x: 90, y: 40 }];
  const to = { x: 640, y: 120 };
  assert.deepEqual(geometryFor(from, to), geometryFor(from, to), '几何是纯函数，不能有随机或时间依赖');
});

/** 造一条 6 步的路线，每步一个新节点，排成一条横线。 */
function straightPlan(count = 6) {
  const entry = ['e0', 'e1'];
  const steps = Array.from({ length: count }, (_, index) => ({ added: [`n${index + 1}`], focus: `n${index + 1}` }));
  const positions = new Map([['e0', { x: 0, y: 0 }], ['e1', { x: 0, y: 220 }]]);
  steps.forEach((step, index) => positions.set(step.added[0], { x: 420 * (index + 1), y: 0 }));
  return { entry, steps, positions };
}

const trailFor = (plan, step, extra = {}) => stageArrowTrail({
  entry: plan.entry,
  steps: plan.steps,
  step,
  positionOf: (id) => plan.positions.get(id),
  titleOf: (id) => `标题 ${id}`,
  avoid: [...plan.positions.values()],
  nodeEnd: card(),
  previewEnd: card(),
  scale: 1,
  ...extra,
});

test('保留：走到第 k 步时，走过的每一步各留一支，末尾再补一支预告', () => {
  const plan = straightPlan(5);
  const atStart = trailFor(plan, 0);
  assert.equal(atStart.length, 1, '第 0 帧只有一支预告');
  assert.equal(atStart[0].preview, true);
  assert.equal(atStart[0].step, 1);
  assert.equal(atStart[0].current, true);
  assert.equal(atStart[0].targetId, 'n1');
  assert.ok(plan.entry.includes(atStart[0].sourceId), `预告应当从起点集合出发：${atStart[0].sourceId}`);

  const atThird = trailFor(plan, 3);
  assert.equal(atThird.length, 4, '三步走过 = 三支留存 + 一支预告');
  assert.deepEqual(atThird.map((arrow) => arrow.step), [1, 2, 3, 4], '步号就是学习顺序');
  assert.deepEqual(atThird.map((arrow) => arrow.preview), [false, false, false, true]);
  assert.deepEqual(atThird.map((arrow) => arrow.current), [false, false, false, true]);
  // 第 s 步那一支：从上一步立住的节点指向这一步新加入的节点。
  assert.deepEqual(atThird.map((arrow) => arrow.targetId), ['n1', 'n2', 'n3', 'n4']);
  assert.deepEqual(atThird.map((arrow) => arrow.sourceId), ['e0', 'n1', 'n2', 'n3']);
  assert.deepEqual(atThird.map((arrow) => arrow.title), ['标题 n1', '标题 n2', '标题 n3', '标题 n4']);

  const atEnd = trailFor(plan, 5);
  assert.equal(atEnd.length, 5, '走到终点就没有预告了，但走过的五支全在');
  assert.equal(atEnd.at(-1).preview, false);
  assert.equal(atEnd.at(-1).current, true, '最后一支仍然是「正在长」的那一支');
  assert.equal(atEnd.at(-1).targetId, 'n5');
});

test('保留：位置查不到的步骤不画（宁缺勿错），其余照旧留住', () => {
  const plan = straightPlan(4);
  plan.positions.delete('n2');
  const trail = trailFor(plan, 3);
  // 第 2 步的目标查不到，第 3 步的**源头**也就跟着没了（它正是 n2）：
  // 宁可这两支都不画，也不从别的节点牵一条并不存在的连线过去。
  assert.deepEqual(trail.map((arrow) => arrow.step), [1, 4], '缺了第 2 步，步号照旧按真实步数标');
  assert.equal(trail.at(-1).preview, true);
  assert.equal(trail.at(-1).current, true);
});

test('保留：步号徽标不重叠——新的先占位，重叠的旧的让位', () => {
  /*
   * 「折回去」的路线：第 2 步把学习者送回第 1 步出发的地方，
   * 两支箭头因此几乎完全重合，两枚步号也会叠在一起——这时只留新的一枚。
   * 力导向布局里的交叉箭头就是这个场景（连着的两步反而不会挤，见 MIN_LENGTH 那一条）。
   */
  const plan = {
    entry: ['e0'],
    steps: [{ added: ['n1'], focus: 'n1' }, { added: ['n2'], focus: 'n2' }],
    positions: new Map([['e0', { x: 0, y: 0 }], ['n1', { x: 600, y: 0 }], ['n2', { x: 0, y: 0 }]]),
  };
  const trail = trailFor(plan, 2);
  assert.equal(trail.length, 2, `两支都要留住：${trail.length}`);
  const midGap = Math.hypot(trail[0].geometry.mid.x - trail[1].geometry.mid.x, trail[0].geometry.mid.y - trail[1].geometry.mid.y);
  assert.ok(midGap < 24, `这两支的中点本来就叠在一起：${midGap}`);
  assert.deepEqual(trail.map((arrow) => arrow.badge), [false, true], '旧的让位，新的保留');
});
