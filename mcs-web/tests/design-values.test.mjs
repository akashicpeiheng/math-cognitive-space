import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { MCS_WEB_ROOT } from '../core/ontology.mjs';
import { DESIGN_CHECK_TYPES, DESIGN_VALUES, designValueStats } from '../data/design-values.mjs';

/**
 * 设计取值的核对（2026-10 加，TODO B）。
 *
 * `TODO.md` 的 B 节写着「有意选定的取值，不是待办」——它不是待办，但它会**腐烂**：
 * 手写的散文表格不会跟着代码改。本轮核对时抓到 5 处漂移：
 * 触屏阈值（A2-11 加了一档，表没改）、白雾半径（58%×52% vs 实际 60%×56%）、
 * 文字让位（±4% vs A3-17 后的 ±2%）、领域词表支数（9 → 12）、色相间隔（声称 ≥8° 实测 6°）。
 *
 * 这一套把那张表变成**可执行的**：逐条执行 `data/design-values.mjs` 里登记的检查，
 * 并核对 `TODO.md` 的 B 节确实写着同一批取值（关键词在、被更正的旧值不在）。
 *
 * 检查强度是分层的（`DESIGN_CHECK_TYPES`）：
 * `module`（import 真常量）> `computed`（按名字算观测量）> `css`（样式表取值）> `source`（源码匹配）。
 * 能导出的一律导出成常量——本轮为此把 4 组数从组件里提了出来
 * （`ROUTE_DEFAULTS`、`PLACEMENT_SCORE`、`CAMERA_*`、`pointer.ts`），
 * 因为 `source` 检查是最弱的一层：它只证明「这行字还在」，证明不了「运行期用的是它」。
 */
const ROOT = MCS_WEB_ROOT;
const moduleCache = new Map();
async function loadModule(relativePath) {
  if (!moduleCache.has(relativePath)) {
    moduleCache.set(relativePath, await import(pathToFileURL(resolve(ROOT, relativePath)).href));
  }
  return moduleCache.get(relativePath);
}
/** 按路径取值；`path` 省略时直接返回这个导出本身（标量常量就是这种情形）。 */
const readAt = (value, path) => (Array.isArray(path) ? path.reduce((acc, key) => (acc === undefined ? acc : acc[key]), value) : value);
const fileText = (relativePath) => readFileSync(resolve(ROOT, relativePath), 'utf8');

/** 色相（HSL 的 H，0–360）。 */
function hueOf(hex) {
  const [r, g, b] = [0, 2, 4].map((index) => Number.parseInt(hex.slice(1 + index, 3 + index), 16) / 255);
  const max = Math.max(r, g, b); const min = Math.min(r, g, b); const delta = max - min;
  if (delta === 0) return 0;
  const raw = max === r ? ((g - b) / delta) % 6 : max === g ? (b - r) / delta + 2 : (r - g) / delta + 4;
  const hue = raw * 60;
  return hue < 0 ? hue + 360 : hue;
}

/** `computed` 的三种计算：色相最小间隔、派生长度、数组长度。 */
async function computeCheck(check) {
  if (check.name === 'hueGap') {
    const labels = await loadModule('web/src/labels.ts');
    const table = labels[check.table];
    assert.ok(table, `没有这张色表：${check.table}`);
    const hues = Object.entries(table).map(([key, hex]) => [key, hueOf(hex)]).sort((left, right) => left[1] - right[1]);
    let min = { pair: null, gap: Number.POSITIVE_INFINITY };
    for (let index = 1; index < hues.length; index += 1) {
      const gap = hues[index][1] - hues[index - 1][1];
      if (gap < min.gap) min = { pair: `${hues[index - 1][0]}→${hues[index][0]}`, gap };
    }
    return { value: Math.round(min.gap), detail: min.pair };
  }
  if (check.name === 'product') {
    const leftModule = await loadModule(check.left.file);
    const rightModule = await loadModule(check.right.file);
    const left = readAt(leftModule[check.left.export], check.left.path);
    const right = readAt(rightModule[check.right.export], check.right.path);
    assert.equal(typeof left, 'number', 'product 的左值不是数字');
    assert.equal(typeof right, 'number', 'product 的右值不是数字');
    return { value: Number((left * right).toFixed(4)) };
  }
  if (check.name === 'arrayLength') {
    const module = await loadModule(check.module);
    return { value: module[check.export].length };
  }
  throw new Error(`没有实现的计算：${check.name}`);
}

async function runCheck(check) {
  if (check.type === 'module') {
    const module = await loadModule(check.file);
    assert.ok(module[check.export] !== undefined, `${check.file} 没有导出 ${check.export}`);
    const value = readAt(module[check.export], check.path);
    return { value, ok: Object.is(value, check.equals) || value === check.equals };
  }
  if (check.type === 'computed') {
    const { value, detail } = await computeCheck(check);
    return { value, detail, ok: value === check.equals };
  }
  if (check.type === 'css') {
    const text = fileText(check.file);
    const match = new RegExp(check.pattern).exec(text);
    if (!match) return { value: null, ok: false, reason: '样式里没匹配到' };
    const captured = match.slice(1).filter((part) => part !== undefined).join('x');
    return { value: captured, ok: captured === check.equals };
  }
  if (check.type === 'source') {
    const text = fileText(check.file);
    return { value: new RegExp(check.pattern).test(text) ? '匹配' : null, ok: new RegExp(check.pattern).test(text) };
  }
  throw new Error(`未知的检查类型：${check.type}`);
}

test('登记表本身完整：每条都有出处、位置、性质与至少一条检查', () => {
  assert.ok(DESIGN_VALUES.length >= 12, `设计取值至少 12 条，只有 ${DESIGN_VALUES.length} 条`);
  const ids = new Set();
  for (const entry of DESIGN_VALUES) {
    assert.ok(!ids.has(entry.id), `id 重复：${entry.id}`);
    ids.add(entry.id);
    assert.ok(entry.label && entry.display, `${entry.id} 缺 label/display`);
    assert.ok(['design', 'measured', 'derived'].includes(entry.kind), `${entry.id} 的 kind 不合法：${entry.kind}`);
    assert.ok(entry.source && /第.+轮/.test(entry.source), `${entry.id} 缺出处（要写清哪一轮定的）`);
    assert.ok(entry.where && entry.where.length > 8, `${entry.id} 没写清住在代码哪里`);
    assert.ok(entry.note && entry.note.length > 8, `${entry.id} 缺说明`);
    assert.ok(entry.docKeyword, `${entry.id} 缺 docKeyword（文档同步断言要用）`);
    assert.ok(Array.isArray(entry.checks) && entry.checks.length > 0, `${entry.id} 没有任何检查`);
    for (const check of entry.checks) {
      assert.ok(DESIGN_CHECK_TYPES.includes(check.type), `${entry.id} 的检查类型不合法：${check.type}`);
    }
  }
  const stats = designValueStats();
  console.log(`  · 设计取值：${stats.entries} 条登记、${stats.checks} 条检查${JSON.stringify(stats.byType)}`
    + `，性质分布 ${JSON.stringify(stats.byKind)}`);
});

for (const entry of DESIGN_VALUES) {
  test(`设计取值「${entry.label}」与代码一致`, async () => {
    const results = [];
    for (const check of entry.checks) {
      const result = await runCheck(check);
      results.push({ check, result });
    }
    const failures = results.filter((item) => !item.result.ok)
      .map((item) => `${item.check.type}:${JSON.stringify(item.check)} → 实际 ${JSON.stringify(item.result.value)}`
        + `（期望 ${JSON.stringify(item.check.equals ?? '匹配')}）${item.result.reason ? ' ' + item.result.reason : ''}`);
    assert.deepEqual(failures, [], `「${entry.label}」与代码不一致：\n` + failures.join('\n'));
    const shown = results.map((item) => `${item.check.type}=${JSON.stringify(item.result.value)}${item.result.detail ? `(${item.result.detail})` : ''}`);
    console.log(`  · ${entry.id}：${shown.join('，')}`);
  });
}

test('TODO.md 的 B 节写着同一批取值（关键词在、被更正的旧值不在）', () => {
  const todo = readFileSync(resolve(ROOT, 'TODO.md'), 'utf8');
  const start = todo.indexOf('## B. 设计取值');
  assert.ok(start >= 0, 'TODO.md 里没有 B 节');
  const nextSection = todo.indexOf('\n## ', start + 1);
  const section = todo.slice(start, nextSection > 0 ? nextSection : todo.length);
  /*
   * 表格的**第一列**才是「取值」本身：说明列里可以（也应该）写「原写 X，实测是 Y」，
   * 因此「旧值不在」这条只查第一列——否则「如实写明改过什么」反而会让断言失败（第一版就是这样）。
   */
  const claimCells = section.split('\n')
    .filter((line) => line.trim().startsWith('|'))
    .map((line) => line.split('|')[1] ?? '')
    .join('\n');

  const missing = [];
  const stale = [];
  for (const entry of DESIGN_VALUES) {
    if (!section.includes(entry.docKeyword)) missing.push(`${entry.id} → 缺少关键词「${entry.docKeyword}」`);
    for (const forbidden of entry.docForbidden ?? []) {
      if (claimCells.includes(forbidden)) stale.push(`${entry.id} → 取值列里还写着旧值「${forbidden}」`);
    }
  }
  assert.deepEqual(missing, [], 'B 节没有跟着登记表更新：\n' + missing.join('\n'));
  assert.deepEqual(stale, [], 'B 节的取值列里还留着已被更正的旧值：\n' + stale.join('\n'));
  // B 节必须仍然声明「不是待办」——那正是这一节的性质，别被改成待办清单。
  assert.ok(section.includes('不是待办'), 'B 节必须继续写明「不是待办」');
  console.log(`  · B 节：${DESIGN_VALUES.length} 条取值的关键词全部在，取值列里没有旧值`);
});

test('能在代码里核对的取值，尽量不用「源码匹配」这一层', () => {
  const stats = designValueStats();
  // 这一条是**质量约束**而不是硬指标：源码匹配只能证明那行字还在，
  // 因此规定它不得超过全部检查的三分之一；超了说明又该把常量提出来导出了。
  const sourceChecks = stats.byType.source ?? 0;
  assert.ok(sourceChecks <= Math.floor(stats.checks / 3),
    `源码匹配占了 ${sourceChecks}/${stats.checks}，应当把常量提到能被 import 的模块里（见 web/src/pointer.ts 的做法）`);
  console.log(`  · 检查强度：module/computed ${stats.checks - sourceChecks} 条，源码匹配 ${sourceChecks} 条（≤ 1/3）`);
});
