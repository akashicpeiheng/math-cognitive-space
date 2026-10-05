import test from 'node:test';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { MCS_WEB_ROOT } from '../core/ontology.mjs';

const { RELATION_COLOR, CONTRACT_MODE_COLOR, CONTRACT_UNKNOWN_COLOR } = await import(
  pathToFileURL(resolve(MCS_WEB_ROOT, 'web/src/labels.ts')).href
);
const { THEME } = await import(pathToFileURL(resolve(MCS_WEB_ROOT, 'web/src/theme.ts')).href);
const { TIER_STYLE, RELATION_WEIGHT, CONTRACT_MODE_WEIGHT, SEMANTIC_CONTRACT_MODES, edgeKindLabel, tierOf } = await import(
  pathToFileURL(resolve(MCS_WEB_ROOT, 'web/src/relation-visual.ts')).href
);

/**
 * 对比度与色觉的**机器校验**（2026-10 加，TODO A3-21）。
 *
 * 第三十八、四十三轮留下的话是：「边的 15 色与拾取高亮的四层强调都没有做 WCAG 比值与色盲模拟。」
 * 这一套把那句话变成两条可以反复跑的断言：
 *
 * 1. **对比度**：文字令牌对底色 ≥ 4.5:1（WCAG AA 正文），图形/边色对画布底 ≥ 3:1
 *    （WCAG 1.4.11 非文字对比度）；
 * 2. **色觉**：关系色与契约色在 deuteranopia / protanopia 模拟下两两可分——
 *    判据不是「都不同」（红绿色盲下不可能），而是**要么色差够大，要么另有冗余通道**
 *    （线宽/虚线节奏不同，或两者在画布上都会写出自己的名字）。
 *
 * 模拟用 Machado et al. 2009 的 severity 1.0 矩阵（在**线性 RGB** 上做矩阵乘，
 * 这是该矩阵的适用空间），色差用 CIE76 ΔE（Lab 空间欧氏距离）。
 * 「够大」的阈值取 12：经验上 ΔE ≈ 2.3 是刚可察觉、10 左右是「一眼能分开」。
 */

/* ---------- 颜色工具 ---------- */
const hexToRgb = (hex) => {
  const value = hex.replace('#', '');
  return [0, 2, 4].map((index) => Number.parseInt(value.slice(index, index + 2), 16));
};
const srgbToLinear = (channel) => (channel / 255 <= 0.04045 ? channel / 255 / 12.92 : ((channel / 255 + 0.055) / 1.055) ** 2.4);
const linearToSrgb = (value) => {
  const clamped = Math.min(1, Math.max(0, value));
  return Math.round(255 * (clamped <= 0.0031308 ? clamped * 12.92 : 1.055 * clamped ** (1 / 2.4) - 0.055));
};
const relativeLuminance = (rgb) => 0.2126 * srgbToLinear(rgb[0]) + 0.7152 * srgbToLinear(rgb[1]) + 0.0722 * srgbToLinear(rgb[2]);
const contrastRatio = (a, b) => {
  const la = relativeLuminance(hexToRgb(a));
  const lb = relativeLuminance(hexToRgb(b));
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
};

const SIMULATION_MATRICES = {
  normal: [[1, 0, 0], [0, 1, 0], [0, 0, 1]],
  deuteranopia: [
    [0.367322, 0.860646, -0.227968],
    [0.280085, 0.672501, 0.047413],
    [-0.011820, 0.042940, 0.968881],
  ],
  protanopia: [
    [0.152286, 1.052583, -0.204868],
    [0.114503, 0.786281, 0.099216],
    [-0.003882, -0.048116, 1.051998],
  ],
};
function simulateColor(hex, kind) {
  const linear = hexToRgb(hex).map(srgbToLinear);
  const matrix = SIMULATION_MATRICES[kind];
  return matrix.map((row) => linearToSrgb(row[0] * linear[0] + row[1] * linear[1] + row[2] * linear[2]));
}
function toLab(rgb) {
  const [r, g, b] = rgb.map(srgbToLinear);
  const x = (0.4124 * r + 0.3576 * g + 0.1805 * b) / 0.95047;
  const y = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  const z = (0.0193 * r + 0.1192 * g + 0.9505 * b) / 1.08883;
  const f = (t) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  return [116 * f(y) - 16, 500 * (f(x) - f(y)), 200 * (f(y) - f(z))];
}
const deltaE = (a, b) => {
  const la = toLab(a); const lb = toLab(b);
  return Math.hypot(la[0] - lb[0], la[1] - lb[1], la[2] - lb[2]);
};

/* ---------- 1. 对比度 ---------- */
const TEXT_SURFACES = {
  白底: THEME.surface,
  浅紫底: THEME.surface2,
  画布底: THEME.canvas,
  暖底: '#fdf3ea',
};
const TEXT_TOKENS = { ink: THEME.ink, inkSoft: THEME.inkSoft, inkFaint: THEME.inkFaint };

test('文字令牌在每个底色上都达到 WCAG AA（≥ 4.5:1）', () => {
  const failures = [];
  for (const [token, color] of Object.entries(TEXT_TOKENS)) {
    for (const [surfaceName, surface] of Object.entries(TEXT_SURFACES)) {
      const ratio = contrastRatio(color, surface);
      if (ratio < 4.5) failures.push(`${token}(${color}) on ${surfaceName}: ${ratio.toFixed(2)}`);
    }
  }
  assert.deepEqual(failures, [], '文字对比度不足 4.5:1：' + failures.join('；'));
  // 弱化色不能靠「几乎和白底一样」来达标——它仍要明显弱于正文色。
  assert.ok(contrastRatio(TEXT_TOKENS.ink, THEME.surface) > contrastRatio(TEXT_TOKENS.inkFaint, THEME.surface) * 1.8,
    'inkFaint 与 ink 的对比度差距太小，弱化的层级看不出来了');
});

test('每条关系色/契约色对画布底都有 ≥ 3:1（WCAG 1.4.11 非文字对比度）', () => {
  const all = { ...RELATION_COLOR, ...CONTRACT_MODE_COLOR, '<未知 mode>': CONTRACT_UNKNOWN_COLOR };
  const failures = [];
  for (const [name, color] of Object.entries(all)) {
    const ratio = contrastRatio(color, THEME.canvas);
    if (ratio < 3) failures.push(`${name}(${color}): ${ratio.toFixed(2)}`);
  }
  assert.deepEqual(failures, [], '边色在画布上对比度不足 3:1：' + failures.join('；'));
});

/* ---------- 2. 色觉 ---------- */
/**
 * 冗余通道：两条边在**颜色之外**是否还有可区分的线索。
 *
 * 判据只用已经登记在表里的东西，不靠印象：
 * - 线型：`TIER_STYLE` 的线宽差 ≥ 1px 或虚线节奏不同；
 * - 名字：两者在画布上都会写出自己的名字（`edgeKindLabel` 给得出标签，
 *   且该档位 `label: true`）——语义关系写关系名，definition / deduction 写 mode 名。
 *
 * 用**未经见证修正**的权重算档位（`RELATION_WEIGHT` / `CONTRACT_MODE_WEIGHT`）：
 * 见证修正只会让边更细，不会改变「谁比谁细」的相对关系，作为判据足够稳。
 */
function hasRedundantChannel(tableName, leftKey, rightKey) {
  const weightOf = (key) => (tableName === 'contract' ? CONTRACT_MODE_WEIGHT[key] : RELATION_WEIGHT[key]) ?? 0.18;
  const leftTier = tierOf(weightOf(leftKey));
  const rightTier = tierOf(weightOf(rightKey));
  const left = TIER_STYLE[leftTier]; const right = TIER_STYLE[rightTier];
  const widthDiffers = Math.abs(left.width - right.width) >= 1;
  const dashDiffers = (left.dash ?? '') !== (right.dash ?? '');
  if (widthDiffers || dashDiffers) return '线型';
  // 注意传的是**样式对象**，不是档位名：`label` 挂在 TIER_STYLE 上（第一版传错，判据静默失效）。
  const labelled = (key, family, style) => style.label && edgeKindLabel(family, key, key) !== null;
  if (labelled(leftKey, tableName === 'contract' ? 'contract' : 'relation', left)
    && labelled(rightKey, tableName === 'contract' ? 'contract' : 'relation', right)) return '名字';
  return null;
}

const COLOR_TABLES = [
  { name: '关系色', kind: 'relation', table: RELATION_COLOR },
  { name: '契约色', kind: 'contract', table: CONTRACT_MODE_COLOR },
];

for (const { name, kind, table } of COLOR_TABLES) {
  test(`${name}在 deuteranopia / protanopia 下两两可分（色差 ≥ 12 或另有冗余通道）`, () => {
    const keys = Object.keys(table);
    const unresolved = [];
    const viaRedundancy = [];
    for (const simulation of ['deuteranopia', 'protanopia']) {
      for (let i = 0; i < keys.length; i += 1) {
        for (let j = i + 1; j < keys.length; j += 1) {
          const distance = deltaE(simulateColor(table[keys[i]], simulation), simulateColor(table[keys[j]], simulation));
          if (distance >= 12) continue;
          const channel = hasRedundantChannel(kind, keys[i], keys[j]);
          if (channel) viaRedundancy.push(`${simulation}:${keys[i]}|${keys[j]}=${distance.toFixed(1)}(${channel})`);
          else unresolved.push(`${simulation}:${keys[i]}|${keys[j]} ΔE=${distance.toFixed(1)}`);
        }
      }
    }
    assert.deepEqual(unresolved, [],
      `${name}在色盲模拟下既分不开、又没有冗余通道：${unresolved.join('；')}`
      + `\n（只靠冗余通道的对子：${viaRedundancy.join('；') || '无'}）`);
    // 正常视觉下必须**明显**可分：色相是「是什么关系」的主要通道。
    for (let i = 0; i < keys.length; i += 1) {
      for (let j = i + 1; j < keys.length; j += 1) {
        const distance = deltaE(simulateColor(table[keys[i]], 'normal'), simulateColor(table[keys[j]], 'normal'));
        assert.ok(distance >= 15, `${keys[i]} 与 ${keys[j]} 在正常视觉下也只差 ΔE=${distance.toFixed(1)}`);
      }
    }
    console.log(`  · ${name}：仅靠冗余通道即可区分的对子 ${viaRedundancy.length} 组`
      + (viaRedundancy.length ? `（${viaRedundancy.slice(0, 4).join('，')}${viaRedundancy.length > 4 ? ' …' : ''}）` : ''));
  });
}

test('两种色盲模拟下，代表「硬关系」的紫与代表「登记关联」的灰仍可分（层级不塌）', () => {
  for (const simulation of ['deuteranopia', 'protanopia']) {
    const hard = simulateColor(RELATION_COLOR.hardPrereq, simulation);
    const soft = simulateColor(THEME.inkFaint, simulation);
    assert.ok(deltaE(hard, soft) >= 12, `${simulation} 下硬前置与弱化文字色挤在一起`);
  }
  // 定义性契约（语义依赖）在两种模拟下都要与最弱的族边灰分开。
  for (const simulation of ['deuteranopia', 'protanopia']) {
    const definition = simulateColor(CONTRACT_MODE_COLOR.definition, simulation);
    const neutral = simulateColor(CONTRACT_UNKNOWN_COLOR, simulation);
    assert.ok(deltaE(definition, neutral) >= 12, `${simulation} 下 definition 与中性灰挤在一起`);
  }
});

test('色觉断言的判据本身可用：模拟矩阵不改变灰度（白/黑/中灰保持中性）', () => {
  for (const simulation of ['deuteranopia', 'protanopia']) {
    for (const gray of ['#000000', '#808080', '#ffffff']) {
      const [r, g, b] = simulateColor(gray, simulation);
      assert.ok(Math.max(r, g, b) - Math.min(r, g, b) <= 2, `${simulation} 把中性灰 ${gray} 染上了颜色：${[r, g, b]}`);
    }
  }
  // 恒定色相检查：把 SEMANTIC_CONTRACT_MODES 用起来，避免表里出现未登记的 mode。
  for (const mode of SEMANTIC_CONTRACT_MODES) {
    assert.ok(CONTRACT_MODE_COLOR[mode], `语义 mode ${mode} 没有配色`);
  }
});
