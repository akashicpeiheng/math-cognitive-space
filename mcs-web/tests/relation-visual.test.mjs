import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { CONTRACT_MODE_COLOR, RELATION_COLOR } from '../web/src/labels.ts';

/**
 * 关系可视化条款的不变量测试。
 *
 * `web/src/relation-visual.ts` 是 TypeScript，这里不引入编译步骤，
 * 而是直接读取源文件求值（该模块只依赖类型导入，运行时无副作用）。
 * 这样「关系越硬越明显」这条规则在 `npm test` 里是可核对的事实，
 * 而不是只写在文档里的一句话。
 */
const here = dirname(fileURLToPath(import.meta.url));
const source = readFileSync(resolve(here, '../web/src/relation-visual.ts'), 'utf8');
// 去掉类型导入与类型标注，留下可求值的 JS。
const js = source
  .replace(/^import type .*$/gm, '')
  .replace(/: Record<[^>]*>/g, '')
  .replace(/: RelationTier/g, '')
  .replace(/: EdgeFamily/g, '')
  .replace(/: string\[\]/g, '')
  .replace(/: string \| null/g, '')
  .replace(/: number/g, '')
  .replace(/: boolean/g, '')
  .replace(/: string/g, '')
  .replace(/: EdgeVisual/g, '')
  /* 放缩关系的粗细变化（2026-10-11）：只用到 `as const` 与一个内联的返回类型。 */
  .replace(/ as const/g, '')
  .replace(/: \{ startWidth; endWidth \}/g, '')
  .replace(/\bexport interface EdgeVisual \{[\s\S]*?\n\}/, '')
  .replace(/\bexport type RelationTier =[^;]+;/g, '')
  .replace(/\bexport type EdgeFamily =[^;]+;/g, '')
  .replace(/\bexport interface TierStyle \{[\s\S]*?\n\}/g, '')
  .replace(/\bexport function (\w+)\(/g, 'export function $1(');
const moduleUrl = `data:text/javascript;base64,${Buffer.from(js).toString('base64')}`;
const spec = await import(moduleUrl);

test('关系可视化条款：权重表完整且取值合法', () => {
  const kinds = Object.keys(spec.RELATION_WEIGHT);
  assert.equal(kinds.length, 7, `合并放缩后应覆盖本体里的 7 种关系，实际 ${kinds.length}`);
  for (const [kind, weight] of Object.entries(spec.RELATION_WEIGHT)) {
    assert.ok(weight > 0 && weight <= 1, `${kind} 的权重 ${weight} 必须落在 (0, 1]`);
  }
  for (const [status, factor] of Object.entries(spec.WITNESS_FACTOR)) {
    assert.ok(factor > 0 && factor <= 1, `见证 ${status} 的修正 ${factor} 必须落在 (0, 1]`);
  }
});

test('关系可视化条款：硬关系权重排序符合数学强度', () => {
  const { RELATION_WEIGHT: W } = spec;
  assert.ok(W.hardPrereq > W.scaling, '硬前置应重于放缩');
  assert.ok(W.scaling > W.application, '放缩应重于应用，两个方向使用同一权重');
  assert.ok(W.application > W.bridge, '应用应重于桥接');
  assert.ok(W.bridge > W.analogy, '桥接应重于类比（类比在 ILLUSTRATION 下登记，明确不构成同构）');
});

test('放缩关系的粗细变化：一般端更粗、特殊端更细，且倍数不改变档位强弱', () => {
  const { SCALING_TAPER, scalingTaperWidths, scalingTaperArrowWidth, edgeVisual } = spec;
  assert.ok(SCALING_TAPER.general > 1, '一般端要比本档线宽更粗');
  assert.ok(SCALING_TAPER.special < 1, '特殊端要比本档线宽更细');
  assert.ok(SCALING_TAPER.general / SCALING_TAPER.special >= 4, '两端线宽比至少要 4:1，否则看不出「一头粗一头细」');

  // 方向不按 from/to 猜：两种朝向都要画对（本体里 contract / expand 各占一半）。
  const fromGeneral = scalingTaperWidths(5, true);
  const toGeneral = scalingTaperWidths(5, false);
  assert.ok(fromGeneral.startWidth > fromGeneral.endWidth, '一般端在 from 时：起点粗、终点细');
  assert.ok(toGeneral.endWidth > toGeneral.startWidth, '一般端在 to 时：终点粗、起点细');
  assert.equal(fromGeneral.startWidth, toGeneral.endWidth, '两种朝向只是把两端调个个儿');
  assert.equal(fromGeneral.endWidth, toGeneral.startWidth);
  assert.ok(fromGeneral.startWidth < 5 * 2.4, '一般端的加粗不超过本档线宽的 2.4 倍（不抢最硬层级的注意力）');

  /*
   * 箭头尺寸（2026-10-11 修，用户报「还是两头一样粗」）：细端必须换一个**更细长**的小箭头。
   * 判据是**两端的可见宽度**：粗端 = 一般端线宽；细端 = max(细端线宽, 箭头横向宽度)。
   * 第一版沿用档位箭头（横向 10.1px），细端的可见宽度反而超过粗端（8.0px），因此看不出变化。
   */
  const crossOf = (path, size) => {
    const ys = [...path.matchAll(/[ML]\s*([\d.]+)\s+([\d.]+)/g)].map((match) => Number(match[2]));
    return ((Math.max(...ys) - Math.min(...ys)) / 10) * size; // viewBox 是 0 0 10 10
  };
  assert.ok(crossOf(spec.TAPER_ARROW_PATH, 6) < crossOf(spec.ARROW_PATH, 6) * 0.6,
    '细端箭头要比档位箭头细得多（否则它会把细端重新撑粗）');
  const core = edgeVisual('relation', 'scaling', 'PROOF', '#8b5cf6');
  const strong = edgeVisual('relation', 'scaling', 'DEF', '#8b5cf6');
  for (const [name, visual] of [['core', core], ['strong', strong]]) {
    const widths = scalingTaperWidths(visual.width, true);
    const thin = Math.min(widths.startWidth, widths.endWidth);
    const thick = Math.max(widths.startWidth, widths.endWidth);
    const arrow = crossOf(spec.TAPER_ARROW_PATH, scalingTaperArrowWidth(thin));
    assert.ok(scalingTaperArrowWidth(thin) <= 9, `${name} 档的细端箭头应当是小号的（≤9px）`);
    assert.ok(thick / Math.max(thin, arrow) >= 2,
      `${name} 档两端**看得见的**宽度至少差两倍（粗 ${thick.toFixed(2)} vs 细 ${Math.max(thin, arrow).toFixed(2)}）`);
  }
  assert.ok(scalingTaperArrowWidth(0.2) >= 6, '箭头下有下界：再细的线也要配一个认得出的箭头');
  assert.ok(scalingTaperArrowWidth(20) <= 9, '箭头上有上界：不能超过 strong 档的一般端太多');

  /*
   * 倍数作用在**本档线宽**上，因此「越硬越重」这条第一层信息不被粗细变化覆盖：
   * core 档（有 PROOF 见证的放缩）两端都仍然粗于 strong 档（只有定义/引用见证）。
   */
  const coreThin = scalingTaperWidths(core.width, true).endWidth;
  const strongThick = scalingTaperWidths(strong.width, true).startWidth;
  assert.ok(core.width > strong.width, '前提：core 档的线宽本来就大于 strong 档');
  assert.ok(strongThick > coreThin, 'strong 档的一般端仍应粗于 core 档的特殊端（档位差没被吃掉）');
});

test('关系可视化条款：任何语义关系都强于任何结构关联', () => {
  const problems = spec.assertHierarchyHolds();
  assert.deepEqual(problems, [], problems.join('；'));
  // 再逐条显式核对一遍最坏情形，避免断言函数本身写错。
  const familyMax = Math.max(...Object.entries(spec.FAMILY_WEIGHT)
    .filter(([key]) => key !== 'relation')
    .map(([, value]) => value));
  const worstWitness = Math.min(...Object.values(spec.WITNESS_FACTOR));
  for (const [kind, base] of Object.entries(spec.RELATION_WEIGHT)) {
    assert.ok(base * worstWitness > familyMax,
      `${kind} 在最弱见证下 ${(base * worstWitness).toFixed(3)} 未超过结构关联上界 ${familyMax}`);
  }
});

test('关系可视化条款：视觉参数随权重单调', () => {
  const order = ['core', 'strong', 'medium', 'structural', 'ambient'];
  for (let i = 1; i < order.length; i += 1) {
    const harder = spec.TIER_STYLE[order[i - 1]];
    const softer = spec.TIER_STYLE[order[i]];
    assert.ok(harder.width > softer.width, `${order[i - 1]} 的线宽应大于 ${order[i]}`);
    assert.ok(harder.opacity >= softer.opacity, `${order[i - 1]} 的不透明度应不低于 ${order[i]}`);
  }
  // 只有硬关系标注文字：密网里给细线加标注会糊成一片。
  assert.equal(spec.TIER_STYLE.ambient.label, false, '登记关联不应标注文字');
  assert.equal(spec.TIER_STYLE.structural.label, false, '行动骨架不应标注文字');
  assert.equal(spec.TIER_STYLE.core.label, true, '核心断言必须标注文字');
});

test('关系可视化条款：edgeVisual 对每条关系都给出可渲染参数', () => {
  for (const kind of Object.keys(spec.RELATION_WEIGHT)) {
    const visual = spec.edgeVisual('relation', kind, 'PROOF', '#2563eb');
    assert.ok(visual.width > 2, `${kind} 在 PROOF 下应画得足够粗，实际 ${visual.width}`);
    assert.ok(visual.opacity > 0.8, `${kind} 在 PROOF 下应足够实，实际 ${visual.opacity}`);
    assert.match(visual.color, /^#[0-9a-f]{6}$/i, `${kind} 的颜色应是合法十六进制`);
    // 提饱和度不能改变色相：同一关系的颜色必须仍然认得出来。
    assert.notEqual(visual.color.toLowerCase(), '#2563eb', '饱和度应被提高');
  }
  // 结构边一律不标注。
  for (const family of ['contract', 'topic', 'sharedInput', 'evidence', 'support', 'pattern']) {
    const visual = spec.edgeVisual(family, null, null, '#8d85ae');
    assert.equal(visual.label, false, `${family} 不应标注文字`);
    assert.ok(visual.weight <= 0.18, `${family} 的权重应明显低于语义关系，实际 ${visual.weight}`);
  }
  // 未知关系种类要退化为最弱档，不能抛错、也不能假装很强。
  const unknown = spec.edgeVisual('relation', 'no-such-kind', null, '#8d85ae');
  assert.ok(unknown.weight <= 0.3, `未登记的关系种类应退化为弱边，实际 ${unknown.weight}`);
});

/**
 * 行动契约按 mode 分档。
 *
 * 用户的原话：「知识网络里流形和同胚的关联怎么可能这么差！好好想想他们的关系！」
 * 数据侧的真相：`a-top:topological-manifold` 的 inputs 里有 `top:homeomorphism`、mode 是 **definition**
 * ——不用同胚就定义不出流形；而旧规则把**所有**契约压到 0.18（1.1px、0.34 不透明、细虚线、不标名称），
 * 比 `crossDomain`（接口关系，0.68）还轻。这几条断言把新读法钉住。
 */
test('关系可视化条款：行动契约按 mode 分档', () => {
  const definitionEdge = spec.edgeVisual('contract', null, null, '#8d85ae', 'definition');
  const deductionEdge = spec.edgeVisual('contract', null, null, '#8d85ae', 'deduction');
  const taskEdge = spec.edgeVisual('contract', null, null, '#8d85ae', 'task');
  const unknownMode = spec.edgeVisual('contract', null, null, '#8d85ae', 'no-such-mode');

  // 定义性前置：最硬的一档，实线、够粗、标名称。
  assert.equal(definitionEdge.tier, 'core', `定义性前置应落在核心档，实际 ${definitionEdge.tier}`);
  assert.equal(definitionEdge.dash, undefined, '定义性前置应是实线');
  assert.equal(definitionEdge.label, true, '定义性前置必须标出名称');
  assert.ok(definitionEdge.width >= 4.5, `定义性前置应画得足够粗，实际 ${definitionEdge.width}`);
  // 它必须比任何「接口关系」都重——这正是用户不满的地方。
  for (const kind of ['crossDomain', 'application', 'duality', 'bridge', 'analogy']) {
    const relation = spec.edgeVisual('relation', kind, 'PROOF', '#2563eb');
    assert.ok(definitionEdge.weight > relation.weight,
      `定义性前置 ${definitionEdge.weight} 应重于 ${kind} ${relation.weight}`);
  }
  // 但不能超过最硬的语义关系（硬前置），否则档位会被契约反超。
  assert.ok(definitionEdge.weight <= Math.max(...Object.values(spec.RELATION_WEIGHT)), '定义性前置不应超过硬前置');

  // 推导前置：语义依赖，实线标注，强于任何结构关联，弱于定义性前置。
  assert.equal(deductionEdge.tier, 'medium', `推导前置应落在结构性关系档，实际 ${deductionEdge.tier}`);
  assert.equal(deductionEdge.label, true, '推导前置要标出名称');
  assert.ok(deductionEdge.weight > Math.max(spec.FAMILY_WEIGHT.sharedInput, spec.FAMILY_WEIGHT.contract));
  assert.ok(deductionEdge.weight < definitionEdge.weight, '推导前置应弱于定义性前置');
  assert.ok(spec.SEMANTIC_CONTRACT_MODES.includes('definition') && spec.SEMANTIC_CONTRACT_MODES.includes('deduction'));

  // 非语义 mode 与未登记的 mode 仍然是结构骨架：不标名称，且弱于最弱的语义关系。
  const nonSemantic = Object.entries(spec.CONTRACT_MODE_WEIGHT)
    .filter(([mode]) => !spec.SEMANTIC_CONTRACT_MODES.includes(mode));
  const weakestRelation = Math.min(...Object.values(spec.RELATION_WEIGHT)) * Math.min(...Object.values(spec.WITNESS_FACTOR));
  for (const [mode, weight] of nonSemantic) {
    const visual = spec.edgeVisual('contract', null, null, '#8d85ae', mode);
    assert.equal(visual.label, false, `${mode} 属于结构骨架，不标名称`);
    assert.ok(weight < weakestRelation, `${mode} 的权重 ${weight} 必须弱于最弱语义关系 ${weakestRelation}`);
  }
  for (const visual of [unknownMode, spec.edgeVisual('contract', null, null, '#8d85ae')]) {
    assert.equal(visual.label, false, '结构骨架不标名称');
    assert.ok(visual.weight < weakestRelation, `未知 mode 的权重应弱于语义关系，实际 ${visual.weight}`);
  }

  // 名称要有中文标签，画布上直接给人看。
  assert.equal(spec.edgeKindLabel('contract', null, 'definition'), '定义性前置');
  assert.equal(spec.edgeKindLabel('contract', null, 'task'), null, '结构骨架不标名称');
  assert.equal(spec.edgeKindLabel('relation', 'analogy', null), 'analogy', '关系仍返回原始种类名');
});

test('关系可视化条款：saturate 只改饱和度，色相基本不变', () => {
  const base = '#2563eb';
  const more = spec.saturate(base, 1.55);
  const channel = (hex, index) => parseInt(hex.slice(1 + index * 2, 3 + index * 2), 16);
  const baseMax = Math.max(channel(base, 0), channel(base, 1), channel(base, 2));
  const moreMax = Math.max(channel(more, 0), channel(more, 1), channel(more, 2));
  // 蓝色通道在两种颜色里都应是最大值，说明色相没跑。
  assert.equal(channel(base, 2), baseMax, '原色蓝通道应为最大');
  assert.equal(channel(more, 2), moreMax, '提饱和后蓝通道仍应为最大（色相未变）');
  // 非法输入原样返回，不产生坏颜色。
  assert.equal(spec.saturate('not-a-color', 1.5), 'not-a-color');
});

/**
 * 颜色设计：色相承载「哪一种关系」，明度与饱和度承载「有多硬」。
 *
 * 用户的原话是「全都是大黑箭头丑死了，根据关系类型设计颜色，考虑到颜色饱和度等做视觉优化」。
 * 黑箭头是**渲染缺陷**（三个共享 marker 里的 path 没写 fill，于是继承默认填充 = 黑），
 * 已在 NetworkPage 修掉；这一组断言管的是**调色板本身**：种类齐全、互不撞色、明度落在读得出来的区间。
 */
function hexToHsl(hex) {
  const value = hex.trim().replace('#', '');
  const channels = [0, 2, 4].map((index) => parseInt(value.slice(index, index + 2), 16) / 255);
  const max = Math.max(...channels); const min = Math.min(...channels);
  const lightness = (max + min) / 2;
  let hue = 0; let saturation = 0;
  if (max !== min) {
    const delta = max - min;
    saturation = lightness > 0.5 ? delta / (2 - max - min) : delta / (max + min);
    if (max === channels[0]) hue = ((channels[1] - channels[2]) / delta + (channels[1] < channels[2] ? 6 : 0)) / 6;
    else if (max === channels[1]) hue = ((channels[2] - channels[0]) / delta + 2) / 6;
    else hue = ((channels[0] - channels[1]) / delta + 4) / 6;
  }
  return { h: Math.round(hue * 360), s: +saturation.toFixed(2), l: +lightness.toFixed(2) };
}

test('关系与契约的颜色：种类齐全、互不撞色（含色相）', () => {
  for (const kind of Object.keys(spec.RELATION_WEIGHT)) {
    assert.ok(RELATION_COLOR[kind], '关系缺颜色：' + kind);
  }
  for (const mode of Object.keys(spec.CONTRACT_MODE_WEIGHT)) {
    assert.ok(CONTRACT_MODE_COLOR[mode], '契约 mode 缺颜色：' + mode);
  }
  const all = [...Object.values(RELATION_COLOR), ...Object.values(CONTRACT_MODE_COLOR)];
  assert.equal(new Set(all).size, all.length, '颜色有重复：不同关系种类必须一眼可分');

  /*
   * 色相间距规则，分两个层次：
   * - **同族内**（关系 vs 关系、契约 vs 契约）必须隔开 ≥8°；同族内撞色是真正的可用性缺陷——
   *   它们同时出现在画布上、线型也一样，只能靠颜色分辨。
   * - **跨族**允许靠得近甚至相同：关系与契约已经由线型（虚线）、线宽、标签与面板分开，
   *   强行把所有 15 种颜色塞进 360° 只会让每个色相都失去名字。
   * - `analogy`（类比）是**故意的中性灰**：它是最弱的一类，颜色上就该退后；因此单独豁免。
   */
  const NEUTRAL = new Set([RELATION_COLOR.analogy]);
  const gapOf = (a, b) => {
    const diff = Math.abs(hexToHsl(a).h - hexToHsl(b).h);
    return Math.min(diff, 360 - diff);
  };
  for (const [family, colors] of [['关系', Object.values(RELATION_COLOR)], ['契约', Object.values(CONTRACT_MODE_COLOR)]]) {
    for (let i = 0; i < colors.length; i += 1) {
      for (let j = i + 1; j < colors.length; j += 1) {
        if (NEUTRAL.has(colors[i]) || NEUTRAL.has(colors[j])) continue;
        const gap = gapOf(colors[i], colors[j]);
        assert.ok(gap >= 8, family + '族色相太近：' + colors[i] + ' 与 ' + colors[j] + '（相差 ' + gap + '°）');
      }
    }
  }
});

test('颜色明度落在浅底画布上读得出来的区间', () => {
  const NEUTRAL = new Set([RELATION_COLOR.analogy]);
  const all = [...Object.values(RELATION_COLOR), ...Object.values(CONTRACT_MODE_COLOR)];
  for (const hex of all) {
    const { l, s } = hexToHsl(hex);
    assert.ok(l >= 0.2 && l <= 0.6, hex + ' 的明度 ' + l + ' 不在 0.2–0.6：太浅在浅紫底上读不出，太深会糊成黑');
    // 类比是故意的中性灰（最弱的一类），不适用饱和度下限。
    if (!NEUTRAL.has(hex)) assert.ok(s >= 0.25, hex + ' 的饱和度 ' + s + ' 过低：会被画布上的中性灰盖住');
    assert.match(hex, /^#[0-9a-f]{6}$/i, hex + ' 不是合法十六进制');
  }
});

test('饱和度分层：语义关系 ≥ 语义契约 ≥ 结构骨架', () => {
  const base = '#7c3aed';
  const relation = hexToHsl(spec.edgeVisual('relation', 'scaling', 'PROOF', base).color).s;
  const contract = hexToHsl(spec.edgeVisual('contract', null, null, base, 'definition').color).s;
  const structural = hexToHsl(spec.edgeVisual('contract', null, null, base, 'task').color).s;
  assert.ok(relation >= contract, '语义关系饱和度 ' + relation + ' 应不低于语义契约 ' + contract);
  assert.ok(contract >= structural, '语义契约饱和度 ' + contract + ' 应不低于结构骨架 ' + structural);
});
