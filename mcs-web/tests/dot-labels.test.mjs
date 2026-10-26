import test from 'node:test';
import assert from 'node:assert/strict';
import {
  dotLabels, truncateTitle, textWidthPx, dotLabelBaselinePx, dotLabelMaxChars,
  DOT_LABEL_FONT_PX, DOT_LABEL_GAP_PX, DOT_LABEL_MAX_CHARS,
} from '../web/src/dot-labels.ts';

/**
 * 圆点档名称标签的取舍规则。
 *
 * 它是**纯几何 + 纯排序**：输入是「每个圆点此刻画在屏幕的哪里」，输出是「哪几个下面写什么」，
 * 因此不必开浏览器就能核对四件事——截断、优先级、两条回避规则、确定性。
 * 浏览器那一层只负责「它确实渲染出来、确实贴在圆点正下方、缩放后字号不变」，
 * 见 `tests/network-workspace-page.mjs`。
 */

const RADIUS = 8;
const node = (id, x, y, extra = {}) => ({
  id, title: extra.title ?? `节点 ${id}`, x, y, radius: RADIUS,
  priority: extra.priority ?? 3, weight: extra.weight ?? 0,
});

test('名称标签：标题截断到上限，超出加省略号', () => {
  assert.equal(truncateTitle('极限', 7), '极限');
  assert.equal(truncateTitle('  连续性  ', 7), '连续性', '两端空白不算字数');
  assert.equal(truncateTitle('一元函数在一点的连续性', 7), '一元函数在一点…');
  assert.equal(truncateTitle('averylonglatin title', 7), 'averylo…');
  assert.equal(truncateTitle('刚好七个汉字的标题名', DOT_LABEL_MAX_CHARS).length, DOT_LABEL_MAX_CHARS + 1);
  // 切口正好落在空格上：省略号前不留空格（「ε–δ…」而不是「ε–δ …」）。
  assert.equal(truncateTitle('ε–δ 定义', 4), 'ε–δ…');
});

test('名称标签：宽度按字宽估算——中日韩一个字宽，拉丁约半个', () => {
  const han = textWidthPx('四个汉字', 10);
  const latin = textWidthPx('abcdef', 10);
  assert.equal(han, 40);
  assert.ok(Math.abs(latin - 33) < 0.01, `拉丁字母应约 0.55 个字宽：${latin}`);
  assert.ok(textWidthPx('极限 limit', 10) > textWidthPx('极限', 10), '混排要按各自宽度累加');
});

test('名称标签：基线落在文字框内（布局与渲染共用同一条公式）', () => {
  const labels = dotLabels([node('a', 100, 100)], {});
  const label = labels.get('a');
  assert.ok(label);
  const top = label.y;
  const bottom = label.y + label.height;
  const baseline = 100 + label.baselineY;
  assert.ok(baseline > top + label.height * 0.5, `基线应当在文字框下半部：${baseline} vs [${top}, ${bottom}]`);
  assert.ok(baseline < bottom, `基线不能掉出文字框：${baseline} vs ${bottom}`);
  assert.equal(label.y, 100 + RADIUS + DOT_LABEL_GAP_PX, '文字框紧贴在圆点下面');
  assert.ok(Math.abs(label.baselineY - dotLabelBaselinePx(DOT_LABEL_FONT_PX, DOT_LABEL_GAP_PX, RADIUS)) < 1e-9);
});

test('名称标签：隔得开时每个圆点都有名字', () => {
  const nodes = [node('a', 100, 100), node('b', 400, 100), node('c', 700, 100)];
  const labels = dotLabels(nodes);
  assert.equal(labels.size, 3);
  for (const id of ['a', 'b', 'c']) {
    assert.ok(labels.get(id).text.length > 0);
    // 标签水平居中在圆点正下方。
    assert.ok(Math.abs((labels.get(id).x + labels.get(id).width / 2) - nodes.find((n) => n.id === id).x) < 0.01);
  }
});

test('名称标签：挤在一起时按优先级让位，选中的那个永远有', () => {
  /*
   * 20px 间距下一行放不下两个：标签宽约 21–42px，两个之间至少要 44px 才不重叠。
   * 因此每一条断言都只问「谁先占位」，不问「能放几个」。
   */
  const crowded = (first, second) => dotLabels([first, second]);
  const selected = crowded(node('选中的', 100, 300, { priority: 0 }), node('普通的', 120, 300));
  assert.ok(selected.has('选中的'), '选中的节点必须有自己的名字');
  assert.ok(!selected.has('普通的'), '位置只有一个时，让给优先级更高的');

  const byWeight = crowded(node('冷门', 100, 300, { weight: 0 }), node('枢纽', 120, 300, { weight: 40 }));
  assert.ok(byWeight.has('枢纽'), '同优先级里连接数多的先占位');
  assert.ok(!byWeight.has('冷门'));

  const starting = crowded(node('起始', 100, 300, { priority: 2 }), node('寻常', 120, 300, { priority: 3, weight: 99 }));
  assert.ok(starting.has('起始'), '起始节点排在「连接数多」之前（它是「可以从这里开始」的锚点）');

  // 一排五个：放得下的数量严格小于总数，且确定性（每次都是同样那几个）。
  const row = [0, 1, 2, 3, 4].map((index) => node(`第${index}个`, 100 + index * 20, 300, { priority: index === 0 ? 0 : 3 }));
  const labels = dotLabels(row);
  assert.ok(labels.size < row.length, `这么挤不可能全挂：${labels.size}/${row.length}`);
  assert.ok(labels.size >= 1 && labels.has('第0个'));
  assert.deepEqual([...dotLabels(row).keys()], [...labels.keys()]);
});

test('名称标签：不许压到别的圆点上（圆点是这张图的主记号）', () => {
  const upper = node('上', 200, 100);
  // 下方 14px 处正好有另一个圆点：它的名字会把那个点盖住。
  const lower = node('下', 200, 114);
  const labels = dotLabels([upper, lower]);
  assert.ok(!labels.has('上'), `上方的标签会盖住下面那个圆点：${JSON.stringify([...labels.keys()])}`);
  assert.ok(labels.has('下'), '下面那个仍要能挂（它的标签朝下，不压别人）');
});

test('名称标签：空标题不挂（宁可空着，也不要一个没有内容的牌子）', () => {
  const labels = dotLabels([node('空', 100, 100, { title: '   ' }), node('有', 400, 100)]);
  assert.equal(labels.size, 1);
  assert.ok(labels.has('有'));
});

test('名称标签：确定性——同一输入两次调用逐字相同，且与传入顺序无关', () => {
  const nodes = [node('b', 100, 100), node('a', 130, 100), node('c', 160, 100)];
  const reversed = [...nodes].reverse();
  const first = dotLabels(nodes);
  const second = dotLabels(reversed);
  assert.deepEqual([...first.entries()], [...second.entries()], '排序必须稳定（优先级 → 连接数 → id）');
  assert.deepEqual([...dotLabels(nodes).entries()], [...first.entries()]);
});

test('名称标签：放不下全名时退一步写短名（挤的地方不是「没有名字」）', () => {
  /*
   * 两个圆点相距 70px：两个 7 字标签（各约 79px）放不下——那需要约 81px；
   * 但先放下的那个占住 79px 之后，第二个用 4 个字的短名（约 48px）仍放得下（需要约 66px）。
   */
  const long = node('一', 300, 400, { title: '一元函数在一点的连续性' });
  const alsoLong = node('二', 370, 400, { title: '连续与函数极限的关系' });
  const labels = dotLabels([long, alsoLong]);
  assert.equal(labels.size, 2, `两个都该有名字：${JSON.stringify([...labels.values()].map((l) => l.text))}`);
  assert.equal(labels.get('一').text, '一元函数在一点…');
  assert.equal(labels.get('二').text, '连续与函…', '第二个退到短名');
  assert.ok(labels.get('二').width < labels.get('一').width);

  // 关掉第二遍就只剩一个（这条开关是给调用方与验收用的）。
  const single = dotLabels([long, alsoLong], { shortChars: 0 });
  assert.equal(single.size, 1);
});

test('名称标签：第二遍也不许压圆点，且不会把已占位的挤掉', () => {
  const first = node('先', 100, 200, { title: '一元函数在一点的连续性', priority: 0 });
  const second = node('后', 160, 200, { title: '连续与函数极限的关系' });
  const third = node('更后', 220, 200, { title: '函数的复合与逆运算' });
  const labels = dotLabels([first, second, third]);
  assert.ok(labels.has('先'), '优先级最高的那一个不受第二遍影响');
  const widths = [...labels.values()].map((label) => label.width);
  assert.ok(Math.max(...widths) >= textWidthPx('一元函数在一点…'), '第一遍仍然用全名');
});

test('名称标签：字号与上限可调，调用方不必改公式', () => {
  const title = '一元函数在一点的连续性';
  const small = dotLabels([node('a', 100, 100, { title })], { font: 12, maxChars: 4 });
  assert.equal(small.get('a').text, '一元函数…');
  assert.equal(small.get('a').height, 12 * 1.2);
  assert.equal(small.get('a').width, textWidthPx('一元函数…', 12));
});

test('名称上限随比例放宽：放大的视图不必再按 7 个字截断', () => {
  /*
   * 方块只在 120% 以上出现（`network-workspace.ts`），圆点档因此是绝大多数视图的常态；
   * 但 7 个字那条上限是为 25% 档（圆点间距中位 27px）定的。放大的时候圆点在屏幕上被拉开
   * （100% 下最近邻中位约 190px），仍旧截到 7 个字就是白丢信息。
   */
  assert.equal(dotLabelMaxChars(0.25), DOT_LABEL_MAX_CHARS, '挤的时候保持原来的上限');
  assert.equal(dotLabelMaxChars(0.45), DOT_LABEL_MAX_CHARS);
  assert.ok(dotLabelMaxChars(0.7) > DOT_LABEL_MAX_CHARS);
  assert.ok(dotLabelMaxChars(1.1) > dotLabelMaxChars(0.7), '越放大给得越多');
  assert.equal(dotLabelMaxChars(1.1), dotLabelMaxChars(3), '到 14 个字为止（与卡片自己的 15 字截断同量级）');
  // 14 个汉字约 147px：100% 档最近邻中位 190px，放得下。
  assert.ok(dotLabelMaxChars(1.1) * DOT_LABEL_FONT_PX < 190, '上限不能超过实测的圆点间距');
  const wide = dotLabels([node('a', 100, 100, { title: '一元函数在一点的连续性与可导性' })], { maxChars: dotLabelMaxChars(1.1) });
  assert.ok(wide.get('a').text.length > DOT_LABEL_MAX_CHARS, `放大后给出的名字更长：${wide.get('a').text}`);
});
