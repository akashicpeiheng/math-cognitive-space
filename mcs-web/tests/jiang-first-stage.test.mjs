import test from 'node:test';
import assert from 'node:assert/strict';
import katex from 'katex';
import { testOntology } from './helpers.mjs';
import { makePlanner } from '../core/planner.mjs';
import { EXAMPLE_SETS, JIANG_BASE_ENTRIES } from '../web/src/example-paths.ts';

const slugs = ['field-axioms', 'elementary-row-operations', 'linear-substitution', 'solution-cases'];
const mod = (a, p) => ((a % p) + p) % p;
function tuples(p, n) {
  if (n === 0) return [[]];
  return tuples(p, n - 1).flatMap((prefix) => Array.from({ length: p }, (_, x) => [...prefix, x]));
}

// 独立语义：直接把全部候选坐标代回原方程，不借用回代或消元求解。
function directSolutions(rows, p, n) {
  return tuples(p, n).filter((x) => rows.every((row) =>
    mod(x.reduce((sum, value, j) => sum + value * row[j], 0) - row[n], p) === 0));
}

// 可执行实例仅用于检查教学步骤；比较对象是上面的独立穷举语义。
function eliminate(rows, p, n) {
  const a = rows.map((row) => [...row]);
  const pivots = [];
  let k = 0;
  for (let j = 0; j < n && k < a.length; j++) {
    const i = a.findIndex((row, index) => index >= k && row[j] !== 0);
    if (i < 0) continue;
    [a[k], a[i]] = [a[i], a[k]];
    const inverse = Array.from({ length: p - 1 }, (_, index) => index + 1)
      .find((value) => mod(value * a[k][j], p) === 1);
    assert.ok(inverse);
    a[k] = a[k].map((value) => mod(value * inverse, p));
    for (let row = k + 1; row < a.length; row++) {
      const factor = a[row][j];
      a[row] = a[row].map((value, col) => mod(value - factor * a[k][col], p));
    }
    pivots.push(j);
    k++;
  }
  const inconsistent = a.some((row) => row.slice(0, n).every((value) => value === 0) && row[n] !== 0);
  if (inconsistent) {
    const first = a.findIndex((row) => row.slice(0, n).every((value) => value === 0) && row[n] !== 0);
    [a[k], a[first]] = [a[first], a[k]];
    const inverse = Array.from({ length: p - 1 }, (_, index) => index + 1)
      .find((value) => mod(value * a[k][n], p) === 1);
    for (let row = k + 1; row < a.length; row++) {
      const factor = mod(a[row][n] * inverse, p);
      a[row] = a[row].map((value, col) => mod(value - factor * a[k][col], p));
    }
    return { a, pivots, solutions: [] };
  }
  const free = Array.from({ length: n }, (_, j) => j).filter((j) => !pivots.includes(j));
  const solutions = tuples(p, free.length).map((parameters) => {
    const x = Array(n).fill(0);
    free.forEach((j, index) => { x[j] = parameters[index]; });
    for (let i = pivots.length - 1; i >= 0; i--) {
      const j = pivots[i];
      x[j] = mod(a[i][n] - x.reduce((sum, value, col) => sum + (col > j ? a[i][col] * value : 0), 0), p);
    }
    return x;
  });
  assert.equal(solutions.length, p ** (n - pivots.length));
  assert.equal(new Set(solutions.map((x) => JSON.stringify(x))).size, solutions.length, '参数不能重复命名同一解');
  return { a, pivots, solutions };
}
const canonical = (values) => values.map((x) => JSON.stringify(x)).sort();

test('第一程：正文、形式陈述、证据与站内链接同时可读且一致', async () => {
  const ontology = await testOntology();
  for (const slug of [...slugs, 'method-elimination']) {
    const node = ontology.node(`jiang:${slug}`);
    assert.ok(node.contentMarkdown.length > 1000);
    assert.doesNotMatch(node.contentMarkdown, /独立性.*每条都是|至今未解决/);
    assert.ok(node.teaching.selfCheck.length > 0, `${slug} 缺少可操作自检`);
    assert.equal(node.teaching.readingFirst, true);
    const record = ontology.evidence(`ev-jiang-${slug}`);
    assert.equal(record.checkStatus, 'not_run');
    assert.equal(record.checkerVerified, false);
    assert.doesNotMatch(record.scope, /正文尚未撰写/);
    assert.match(record.reference, /11-jiang-first-stage\.md/);
    for (const match of node.contentMarkdown.matchAll(/\]\(\/nodes\/([^\s)]+)\)/g)) {
      assert.ok(ontology.maybeNode(decodeURIComponent(match[1])), `${slug} 存在悬空链接 ${match[1]}`);
    }
    if (slug !== 'method-elimination') {
      assert.ok(node.formal.assumptions.length > 0);
      assert.doesNotThrow(() => katex.renderToString(node.formalStatement.tex, { throwOnError: true, displayMode: true }));
    }
  }
  assert.match(ontology.node('jiang:solution-cases').formal.formula, /有限|q\^/);
  assert.match(ontology.node('jiang:solution-cases').formal.formula, /F 无限/);
  assert.equal(ontology.evidence('ev-jiang-method-elimination').status, 'DEF');
  assert.equal(ontology.evidence('ev-jiang-elimination-correctness').status, 'PROOF');
});

test('第一程：数学硬前置与推荐阅读顺序分开，分类可独立于换元规划', async () => {
  const ontology = await testOntology();
  const hard = ontology.raw.relationDescriptions.filter((r) => r.kind === 'hardPrereq');
  assert.ok(hard.some((r) => r.from === 'jiang:field-axioms' && r.to === 'jiang:linear-substitution'));
  assert.ok(!hard.some((r) => r.from === 'jiang:linear-substitution' && r.to === 'jiang:solution-cases'));
  assert.ok(!hard.some((r) => r.from === 'jiang:elementary-row-operations' && r.to === 'jiang:linear-substitution'));
  const edge = hard.find((r) => r.id === 'rel-jiang-pre-rowops-cases');
  assert.equal(edge.witness.type, 'proof-dependency');
  const evidence = ontology.evidence(edge.witness.ref);
  assert.equal(edge.witness.status, evidence.status);
  assert.ok(evidence.nodes.includes(edge.from) && evidence.nodes.includes(edge.to));
  const result = makePlanner(ontology).plan({
    goalId: 'jiang:solution-cases', horizon: 3,
    background: JIANG_BASE_ENTRIES.map((node) => ({ entryId: node, node, provides: ['statement', 'definition'], kind: 'confirmed' })),
  });
  assert.equal(result.status, 'Found');
  const produced = result.routes[0].events.flatMap((event) => event.provides.map((out) => out.node));
  assert.equal(produced.length, 3);
  assert.ok(!produced.includes('jiang:linear-substitution'));
  const set = EXAMPLE_SETS.find((item) => item.id === 'jiang-jdga');
  assert.equal(set.paths[0].goal, 'jiang:solution-cases');
  assert.equal(set.paths[0].events, 4);
  assert.doesNotMatch(set.note, /正文是空的|节点只挂了名字|全部.*contentRef: false/);
});

test('FINITE：F₂、F₃ 上全部 1—2 行、1—3 个未知量系统，与原式穷举语义一致', () => {
  let checked = 0;
  for (const p of [2, 3]) for (const n of [1, 2, 3]) for (const m of [1, 2]) {
    for (const flat of tuples(p, m * (n + 1))) {
      const rows = Array.from({ length: m }, (_, i) => flat.slice(i * (n + 1), (i + 1) * (n + 1)));
      const expected = directSolutions(rows, p, n);
      const actual = eliminate(rows, p, n);
      assert.deepEqual(canonical(actual.solutions), canonical(expected), JSON.stringify({ p, rows }));
      assert.deepEqual(canonical(directSolutions(actual.a, p, n)), canonical(expected), '消元后仍应与原式同解');
      const leading = actual.a.map((row) => row.findIndex((value) => value !== 0));
      for (let i = 1; i < leading.length; i++) {
        assert.ok(leading[i] === -1 || (leading[i - 1] !== -1 && leading[i] > leading[i - 1]), '含矛盾行时，常数列也必须整理成增广阶梯形');
      }
      checked++;
    }
  }
  assert.equal(checked, 7852);
});

test('FINITE：贯穿换元在 F₂、F₃ 中可还原，旧解、新解和参数一一对应', () => {
  for (const p of [2, 3]) {
    const toOld = ([u, v, w]) => [mod(u - v - 2 * w, p), mod(v + w, p), w];
    const toNew = ([x, y, z]) => [mod(x + y + z, p), mod(y - z, p), z];
    for (const tuple of tuples(p, 3)) {
      assert.deepEqual(toNew(toOld(tuple)), tuple);
      assert.deepEqual(toOld(toNew(tuple)), tuple);
    }
    const rows = [[1, 1, 1, 2], [2, 3, 1, 5]].map((row) => row.map((v) => mod(v, p)));
    const expected = directSolutions(rows, p, 3);
    const parameterized = tuples(p, 1).map(([t]) => toOld([mod(2, p), 1, t]));
    assert.deepEqual(canonical(parameterized), canonical(expected));
    assert.equal(expected.length, p);
  }
});
