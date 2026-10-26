import test from 'node:test';
import assert from 'node:assert/strict';
import { edgeLabels } from '../web/src/edge-labels.ts';
import { textWidthPx, DOT_LABEL_FONT_PX } from '../web/src/dot-labels.ts';

/**
 * 圆点档的关系文字（`web/src/edge-labels.ts`）。
 *
 * 用户要求：「节点是圆点的时候，要显示关系的文字。」
 *
 * 它是纯几何 + 纯排序：输入是「每根线此刻的中点在屏幕哪儿」，输出是「哪几条线的名字放得下」。
 * 这里核对五件事——谁先占位、两条回避规则（不压圆点、不压圆点下的名字）、
 * 自己的重叠规则、上限、确定性。浏览器那一层只核「真的画出来了、字号屏幕恒定」，
 * 见 `tests/network-edges.mjs`。
 */

const at = (id, x, y, extra = {}) => ({ id, x, y, text: '强关联', weight: 0.5, priority: 1, ...extra });

/** 两个文字框是否重叠（按 `edge-labels.ts` 的判据：留 gap 的缝）。 */
const overlaps = (a, b, gap = 2) => a.x < b.x + b.width + gap && b.x < a.x + a.width + gap
  && a.y < b.y + b.height + gap && b.y < a.y + a.height + gap;

test('关系文字：放得下就放，文字框贴在线的上方', () => {
  const labels = edgeLabels([at('e1', 200, 200)]);
  const label = labels.get('e1');
  assert.ok(label, '应当放下');
  assert.equal(label.text, '强关联');
  /*
   * 碰撞框比字宽估算宽 8% 再 +2px：实测浏览器里中文的字形盒比估算宽（估 31.5、量到 34）。
   * 这里钉住这条余量的存在，而不是钉一个像素值——改余量不该让测试红，丢掉余量应该。
   */
  const estimate = textWidthPx('强关联');
  assert.ok(label.width > estimate, `碰撞框应当比估算宽：${label.width} vs ${estimate}`);
  assert.ok(label.width < estimate * 1.2, `但也不能宽到离谱：${label.width} vs ${estimate}`);
  // 文字不压在线上：框整体落在线的上方（框里含一点下伸部余量，因此允许到线为止）。
  assert.ok(label.y + label.height <= 200 + 0.01, `文字框应整体在线的上方：底边 ${label.y + label.height}`);
  assert.equal(label.below, false);
  assert.equal(label.anchorX, 200);
  assert.equal(label.anchorY, 196);
});

test('关系文字：挨得近的两条会一上一下分开（同一侧才挤）', () => {
  const labels = edgeLabels([at('weak', 200, 200, { weight: 0.2 }), at('strong', 206, 200, { weight: 0.95 })]);
  assert.equal(labels.size, 2, `一上一下都能放：${[...labels.keys()]}`);
  const weak = labels.get('weak');
  const strong = labels.get('strong');
  assert.notEqual(weak.below, strong.below, '两条应当分居线的两侧');
});

test('关系文字：与焦点相连的先占位（同一点上争同一侧时）', () => {
  // 线下方被一个圆点堵住，于是只剩上面的位置——谁拿到它由优先级决定。
  const dots = [{ x: 200, y: 212, r: 8 }];
  const labels = edgeLabels([
    at('far', 200, 200, { weight: 0.95, priority: 1 }),
    at('focused', 202, 200, { weight: 0.2, priority: 0 }),
  ], { dots });
  assert.ok(labels.has('focused'), `焦点相连的应当先占位：${[...labels.keys()]}`);
  assert.equal(labels.size, 1);
  assert.equal(labels.get('focused').below, false, '上面那个位置');
});

test('关系文字：不许压住圆点（两侧都堵住时就不画）', () => {
  const above = { x: 200, y: 190, r: 8 };
  const below = { x: 200, y: 210, r: 8 };
  // 单个圆点只挡住一侧，文字应当换到另一侧。
  const oneSide = edgeLabels([at('e1', 200, 200)], { dots: [above] });
  assert.ok(oneSide.has('e1'), '只挡住上面时应当放到下面');
  assert.equal(oneSide.get('e1').below, true);
  // 两侧都挡住就不画。
  const bothSides = edgeLabels([at('e1', 200, 200)], { dots: [above, below] });
  assert.equal(bothSides.size, 0, '两侧都被圆点占住时不画');
});

test('关系文字：不许压住圆点下方已经放好的名字', () => {
  const nameAbove = { x: 170, y: 184, width: 60, height: 14 };
  const nameBelow = { x: 170, y: 202, width: 60, height: 14 };
  const oneSide = edgeLabels([at('e1', 200, 200)], { boxes: [nameAbove] });
  assert.ok(oneSide.has('e1'), '上面被名字占住时应当放到下面');
  assert.equal(edgeLabels([at('e1', 200, 200)], { boxes: [nameAbove, nameBelow] }).size, 0, '两侧都被名字占住时不画');
  const away = edgeLabels([at('e1', 400, 200)], { boxes: [nameAbove, nameBelow] });
  assert.ok(away.has('e1'), '远处的节点名不影响');
});

test('关系文字：自己的重叠规则也生效（一个点最多一上一下两条）', () => {
  const labels = edgeLabels([at('a', 200, 200, { weight: 0.9 }), at('b', 203, 200, { weight: 0.8 }), at('c', 206, 200, { weight: 0.7 })]);
  assert.equal(labels.size, 2, `一上一下之后没有第三处可放：${[...labels.keys()]}`);
  assert.deepEqual([...labels.keys()].sort(), ['a', 'b']);
});

test('关系文字：有上限，且空文字/空输入不报错', () => {
  const many = Array.from({ length: 200 }, (_unused, index) => at(`e${index}`, 20 + index * 40, 200));
  const labels = edgeLabels(many, { max: 12 });
  assert.equal(labels.size, 12);
  assert.equal(edgeLabels([]).size, 0);
  assert.equal(edgeLabels([at('empty', 100, 100, { text: '' })]).size, 0, '没有文字就不占位');
});

test('关系文字：确定性——同一输入两次结果完全相同', () => {
  const inputs = [at('a', 100, 100, { weight: 0.4 }), at('b', 101, 103, { weight: 0.4 }), at('c', 102, 106, { weight: 0.4 })];
  const first = [...edgeLabels(inputs).entries()].map(([id, label]) => `${id}:${label.x.toFixed(2)},${label.y.toFixed(2)}`);
  const second = [...edgeLabels(inputs).entries()].map(([id, label]) => `${id}:${label.x.toFixed(2)},${label.y.toFixed(2)}`);
  assert.deepEqual(second, first);
});

test('关系文字：字号可调，宽度估算跟着字号走', () => {
  const small = edgeLabels([at('e1', 200, 200)], { font: 14 });
  const label = small.get('e1');
  assert.ok(label.width > textWidthPx('强关联', 14), '碰撞框同样带余量');
  assert.ok(label.height > 14 * 1.2 - 0.01);
  assert.ok(label.width > textWidthPx('强关联', DOT_LABEL_FONT_PX) - 0.01, '字号大了框也大');
});
