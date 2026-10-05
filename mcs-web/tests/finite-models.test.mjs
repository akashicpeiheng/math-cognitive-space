/**
 * tests/finite-models.test.mjs —— 独立有限语义求值器的验收（规格《自动关系发现-接口与语言规格》§2.12）
 *
 * 这一套断言要钉死五件事（对应共享任务 task-3 的验收清单）：
 *
 * 1. 模 5 单位群满足群公理与交换律；
 * 2. S₃ 满足群公理但不满足交换律，且给出明确见证（两个具体元素的换位对，与案例 04 的计算一致）；
 * 3. 有限枚举通过**不会**升级为无限结构上的普遍定理（返回值里带 scope 字段并写明）；
 * 4. 不满足背景的对象（例如一张错的运算表）不能用于反驳；
 * 5. 求值器与被检查的内核**完全独立**：源码里没有内核的 import、没有子进程调用（源码扫描断言）。
 *
 * 另有几条自查：写死的运算表用**第二套算法**（元素的像表 / 模乘规则）重算并逐格比对；
 * 量词完整枚举；lift 的实参顺序与 de Bruijn 绑定；形状校验与拒绝；反例搜索的三道门
 * （结构合法 / 已登记 / 背景与前提成立）。
 *
 * 本文件**不 import** 任何形式语言模块：求值器只吃「已解析的规范公式树」，解析由调用方负责，
 * 这样求值器不会因为解析层的开发进度而被阻塞（语言层与它的接口由 docs §2.12 固定）。
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { CODES } from '../shared/errors.mjs';
import {
  REGISTERED_MODELS, MAX_WITNESSES, FINITE_SEMANTICS_VERSION,
  FINITE_SEMANTICS_SCOPE, FINITE_RESULT_SCOPE, UNDECIDED_SCOPE, FINITE_COUNTEREXAMPLE_SCOPE,
  INFINITE_STRUCTURE_BOUNDARY,
  GROUP_AXIOMS, COMMUTATIVE_LAW,
  evaluateFormula, evaluateFormulaWithWitness, checkStructure, findCounterexample,
  modelSummary, validateModel, signatureOf, summarizeWitness, instanceToModel,
  getModel, isRegisteredModel,
} from '../core/formal/finite.mjs';

const MCS_WEB_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const FINITE_PATH = resolve(MCS_WEB_ROOT, 'core/formal/finite.mjs');

// 公式构造小helper（测试里手写结点太啰嗦；求值器只认结点，认不出这些 helper）
const eqNode = (left, right) => ['eq', left, right];
const cNode = (name) => ['c', name];
const mulNode = (a, b) => ['app', ['app', ['c', 'mul'], a], b];
const invNode = (a) => ['app', ['c', 'inv'], a];
const impNode = (a, b) => ['imp', a, b];
const andNode = (a, b) => ['and', a, b];

/** 把元素名也声明成载体常元（有限语义里「元素即其名」，见 finite.mjs 的 constantValue）。 */
function withElements(model, names) {
  const sig = signatureOf(model);
  const constants = { ...sig.constants };
  for (const name of names) constants[name] = sig.bases[0];
  return { ...sig, constants };
}

const commutativeGoal = COMMUTATIVE_LAW.axioms[0].formula;

// ---------------------------------------------------------------------------
// 1. 预置对象与写死的表
// ---------------------------------------------------------------------------

test('预置有限对象：登记齐全、结构自检通过、摘要字段齐备', () => {
  assert.deepEqual([...REGISTERED_MODELS], ['finite:z5-units', 'finite:s3']);
  assert.equal(FINITE_SEMANTICS_VERSION, 'mcs-finite/1');

  for (const id of REGISTERED_MODELS) {
    const model = getModel(id);
    assert.equal(model.id, id);
    assert.equal(isRegisteredModel(id), true);
    assert.deepEqual(validateModel(model), [], `${id} 的结构自检应通过`);
    assert.equal(Object.isFrozen(model), true, '预置模型必须冻结，外部改不坏表');

    const summary = modelSummary(model);
    assert.equal(summary.id, id);
    assert.equal(summary.order, model.elements.length);
    assert.ok(summary.carrier.length > 0);
    assert.ok(summary.ops.length >= 2, '至少要有乘法与逆元两个运算');
    assert.ok(summary.ops.some((op) => op.name === 'mul' && op.arity === 2));
    assert.ok(summary.ops.some((op) => op.name === 'inv' && op.arity === 1));
    for (const op of summary.ops) {
      if (op.arity === 1) assert.equal(op.commutative, null, '一元运算不谈交换性，不假装知道');
      else assert.equal(typeof op.commutative, 'boolean');
    }
    assert.ok(summary.note.length > 0, '模型要有注记（约定与边界）');
    assert.ok(summary.scope.includes('有限'));
    assert.ok(summary.scope.includes('无限'), 'scope 必须写明无限结构的边界');
  }

  // 未知对象一律拒绝：本模块不搜索任意模型
  assert.equal(isRegisteredModel('finite:z5-units-copy'), false);
  assert.throws(() => getModel('finite:nope'), (error) => error.code === CODES.EVIDENCE_UNSUPPORTED);
});

test('写死的运算表：用第二套算法重算，逐格一致（防手抄错格）', () => {
  const s3 = getModel('finite:s3');
  const s3Index = new Map(s3.elements.map((name, i) => [name, i]));
  const maps = s3.elementMaps;
  assert.deepEqual(Object.keys(maps), s3.elements, '每个元素都要有像表');

  // S₃：由像表按 (a·b)(i) = a(b(i)) 重新算出整张乘法表（先作用 b，再作用 a）
  const recomputed = s3.elements.map((a) => s3.elements.map((b) => {
    const image = [1, 2, 3].map((i) => maps[a][maps[b][i - 1] - 1]);
    const name = s3.elements.find((candidate) => JSON.stringify(maps[candidate]) === JSON.stringify(image));
    assert.ok(name, `复合结果 ${JSON.stringify(image)} 不在载体里`);
    return name;
  }));
  assert.deepEqual(recomputed, s3.ops.mul.table, 'S₃ 乘法表与像表重算结果不一致');

  // S₃ 逆元表：逐元素核对 mul(a, inv(a)) = mul(inv(a), a) = e
  s3.elements.forEach((element, i) => {
    const inverse = s3.ops.inv.table[i];
    assert.equal(s3.ops.mul.table[i][s3Index.get(inverse)], 'e', `${element} 的右逆不对`);
    assert.equal(s3.ops.mul.table[s3Index.get(inverse)][i], 'e', `${element} 的左逆不对`);
  });

  // Z/5Z：由模乘规则重算
  const z5 = getModel('finite:z5-units');
  const z5Index = new Map(z5.elements.map((name, i) => [name, i]));
  const z5Table = z5.elements.map((a) => z5.elements.map((b) => String((Number(a) * Number(b)) % 5)));
  assert.deepEqual(z5Table, z5.ops.mul.table, 'Z/5Z 乘法表与模乘规则重算结果不一致');
  z5.elements.forEach((element, i) => {
    const inverse = z5.ops.inv.table[i];
    assert.equal((Number(element) * Number(inverse)) % 5, 1, `${element} 的逆不对`);
    assert.equal(z5.ops.mul.table[i][z5Index.get(inverse)], '1');
  });
});

// ---------------------------------------------------------------------------
// 2. 验收 1：模 5 单位群满足群公理与交换律
// ---------------------------------------------------------------------------

test('模 5 单位群满足群公理与交换律（并给出完整运算表）', () => {
  const units5 = getModel('finite:z5-units');
  const group = checkStructure(units5, GROUP_AXIOMS);

  assert.equal(group.holds, true, 'Units5 应当满足群公理');
  assert.deepEqual(group.violations, []);
  assert.deepEqual(group.axioms.map((axiom) => axiom.id), ['associative', 'identity', 'inverse']);
  for (const axiom of group.axioms) {
    assert.equal(axiom.holds, true, `${axiom.id} 应当成立`);
    assert.equal(axiom.witness, null);
    assert.deepEqual(axiom.witnesses, []);
  }

  // 完整运算表（界面直接画表用的形状）
  const table = group.table;
  assert.equal(table.carrier, 'G');
  assert.deepEqual(table.elements, ['1', '2', '3', '4']);
  assert.deepEqual(table.opOrder, ['mul', 'inv']);
  assert.equal(table.ops.mul.arity, 2);
  assert.equal(table.ops.mul.rows.length, 4);
  assert.deepEqual(table.ops.mul.rows[0].args, ['1']);
  assert.deepEqual(table.ops.mul.rows[0].values, ['1', '2', '3', '4']);
  assert.deepEqual(table.ops.mul.rows[1].values, ['2', '4', '1', '3']);
  assert.deepEqual(table.ops.inv.rows.map((row) => row.values[0]), ['1', '3', '2', '4']);
  assert.equal(table.isCommutative, true);

  // 交换律是**另一个**概念，不属于群公理
  assert.equal(checkStructure(units5, COMMUTATIVE_LAW).holds, true);
  assert.equal(modelSummary(units5).isCommutative, true);
  assert.ok(!GROUP_AXIOMS.axioms.some((axiom) => axiom.id.includes('commut')), '交换律不能被写进群公理');

  // 案例口径：2 的幂依次是 1,2,4,3；3 的逆是 2（练习 sc-group-problem-1 的 3·2≡1）
  const sig = withElements(units5, ['1', '2', '3', '4']);
  assert.equal(evaluateFormula(eqNode(mulNode(cNode('2'), cNode('2')), cNode('4')), units5, sig), true);
  assert.equal(evaluateFormula(eqNode(mulNode(mulNode(cNode('2'), cNode('2')), cNode('2')), cNode('3')), units5, sig), true);
  assert.equal(evaluateFormula(eqNode(mulNode(cNode('3'), cNode('2')), cNode('1')), units5, sig), true);
  assert.equal(evaluateFormula(eqNode(invNode(cNode('3')), cNode('2')), units5, sig), true);
  assert.equal(evaluateFormula(eqNode(mulNode(cNode('3'), invNode(cNode('3'))), cNode('e')), units5, sig), true);
  assert.equal(evaluateFormula(eqNode(invNode(cNode('3')), cNode('4')), units5, sig), false);
});

// ---------------------------------------------------------------------------
// 3. 验收 2：S₃ 满足群公理但不交换，且有明确见证
// ---------------------------------------------------------------------------

test('S₃ 满足群公理（结合、单位、逆逐条成立）', () => {
  const s3 = getModel('finite:s3');
  const group = checkStructure(s3, GROUP_AXIOMS);
  assert.equal(group.holds, true, 'S₃ 是群，必须满足群公理');
  assert.deepEqual(group.violations, []);
  assert.deepEqual(group.axioms.map((axiom) => `${axiom.id}:${axiom.holds}`), [
    'associative:true', 'identity:true', 'inverse:true',
  ]);
  assert.equal(group.table.isCommutative, false);
  assert.equal(group.table.ops.mul.rows.length, 6);
  assert.equal(group.table.ops.inv.rows.length, 6);
});

test('S₃ 不满足交换律：见证是具体的换位对 (12)、(23)，与案例 04 的计算一致', () => {
  const s3 = getModel('finite:s3');
  const commut = checkStructure(s3, COMMUTATIVE_LAW);

  assert.equal(commut.holds, false);
  assert.equal(commut.violations.length, 1);
  const violation = commut.violations[0];
  assert.equal(violation.id, 'commutative');
  assert.ok(violation.witness, '必须给出违反见证');
  assert.deepEqual(Object.keys(violation.assignment).sort(), ['a', 'b'], '违反见证要落到两个具体元素上');

  // 见证是具体元素（不是「存在某对元素」），并把两个复合的取值都写出来
  const pairs = violation.witnesses.map((witness) => summarizeWitness(witness).assignment);
  const hasPair = (a, b) => pairs.some((entry) => entry.a === a && entry.b === b);
  assert.ok(hasPair('(12)', '(23)'), '见证里要有 (12) 与 (23) 这一对换位');
  assert.ok(hasPair('(23)', '(12)'), '反序也算同一对换位对');
  assert.ok(violation.witnesses.length >= 2);
  assert.ok(violation.witnesses.length <= MAX_WITNESSES, '见证数量受上限约束');

  const ordered = violation.witnesses.find((witness) => {
    const { assignment } = summarizeWitness(witness);
    return assignment.a === '(12)' && assignment.b === '(23)';
  });
  const summary = summarizeWitness(ordered);
  assert.deepEqual(summary.assignment, { a: '(12)', b: '(23)' });
  assert.equal(summary.equation.left, '(123)', '(12)(23) 应当是 (123)');
  assert.equal(summary.equation.right, '(132)', '(23)(12) 应当是 (132)');
  assert.notEqual(summary.equation.left, summary.equation.right);
  assert.ok(summary.equation.text.includes('两者不等'));

  // 案例文字：两个复合对 1 的像分别为 2 与 3
  assert.equal(s3.elementMaps['(123)'][0], 2, '(123) 把 1 送到 2');
  assert.equal(s3.elementMaps['(132)'][0], 3, '(132) 把 1 送到 3');

  // 端到端：直接对两个具体元素求值（不再走全称量词）
  const sig = withElements(s3, ['e', '(12)', '(13)', '(23)', '(123)', '(132)']);
  assert.equal(evaluateFormula(eqNode(mulNode(cNode('(12)'), cNode('(23)')), cNode('(123)')), s3, sig), true);
  assert.equal(evaluateFormula(eqNode(mulNode(cNode('(12)'), cNode('(23)')), cNode('(132)')), s3, sig), false);
  assert.equal(
    evaluateFormula(eqNode(mulNode(cNode('(12)'), cNode('(23)')), mulNode(cNode('(23)'), cNode('(12)'))), s3, sig),
    false,
    '(12)(23) = (23)(12) 在 S₃ 上为假',
  );
  // 换一对也会不交换，但上面这一对是案例登记的那一对
  assert.equal(
    evaluateFormula(eqNode(mulNode(cNode('(12)'), cNode('(13)')), mulNode(cNode('(13)'), cNode('(12)'))), s3, sig),
    false,
  );
});

// ---------------------------------------------------------------------------
// 4. 量词、iff、lift 与形状校验
// ---------------------------------------------------------------------------

test('量词在有限载体上完整枚举：∃ 为假时逐个试过整个载体，∀ 为假时给出反例元素', () => {
  const units5 = getModel('finite:z5-units');
  const unitsSig = withElements(units5, ['1', '2', '3', '4']);
  const square = ['app', ['app', ['c', 'mul'], ['v', 'a', 'G']], ['v', 'a', 'G']];

  const missing = evaluateFormulaWithWitness(['ex', ['v', 'a', 'G'], eqNode(square, cNode('2'))], units5, unitsSig);
  assert.equal(missing.value, false);
  assert.equal(missing.witness.kind, 'ex');
  assert.equal(missing.witness.count, 4, '载体 4 个元素必须全部试过');
  assert.deepEqual(missing.witness.tried, ['1', '2', '3', '4']);
  assert.equal(missing.witnessSummary.assignment.a, undefined);

  assert.equal(evaluateFormula(['ex', ['v', 'a', 'G'], eqNode(square, cNode('4'))], units5, unitsSig), true);
  assert.equal(evaluateFormula(['ex', ['v', 'a', 'G'], eqNode(square, cNode('1'))], units5, unitsSig), true);

  const s3 = getModel('finite:s3');
  const detail = evaluateFormulaWithWitness(commutativeGoal, s3);
  assert.equal(detail.value, false);
  assert.equal(detail.witness.kind, 'all');
  assert.ok(s3.elements.includes(detail.witness.value), '全称的反例必须是载体里的具体元素');
  assert.deepEqual(Object.keys(detail.witnessSummary.assignment), ['a', 'b']);
});

test('iff 按 (a⇒b)∧(b⇒a) 展开求值，见证写明是哪个方向失败', () => {
  const units5 = getModel('finite:z5-units');
  const sig = withElements(units5, ['1', '2', '3', '4']);
  const truth = eqNode(mulNode(cNode('2'), cNode('3')), cNode('1'));
  const alsoTruth = eqNode(mulNode(cNode('2'), cNode('2')), cNode('4'));
  const lie = eqNode(mulNode(cNode('2'), cNode('2')), cNode('1'));
  const expand = (a, b) => andNode(impNode(a, b), impNode(b, a));

  for (const [a, b] of [[truth, alsoTruth], [truth, lie], [lie, truth], [lie, lie]]) {
    assert.equal(
      evaluateFormula(['iff', a, b], units5, sig),
      evaluateFormula(expand(a, b), units5, sig),
      'iff 必须与 (a⇒b)∧(b⇒a) 同值',
    );
  }
  assert.equal(evaluateFormula(['iff', truth, alsoTruth], units5, sig), true);
  assert.equal(evaluateFormula(['iff', truth, lie], units5, sig), false);
  assert.equal(evaluateFormulaWithWitness(['iff', truth, lie], units5, sig).witness.side, 'forward');
  assert.equal(evaluateFormulaWithWitness(['iff', lie, truth], units5, sig).witness.side, 'backward');
});

test('lift 抽象通道：实参按 parameters() 的规范序代入，绑定变量走 de Bruijn 序号', () => {
  const s3 = getModel('finite:s3');
  const sig = withElements(s3, ['e', '(12)', '(13)', '(23)', '(123)', '(132)']);

  // λ#0. p·q：自由变量按规范序列化字典序是 p、q
  const lamPQ = ['lam', 'G', ['app', ['app', ['c', 'mul'], ['v', 'p', 'G']], ['v', 'q', 'G']]];
  const applied = (a, b) => ['app', ['lift', lamPQ, [cNode(a), cNode(b)]], cNode('e')];
  assert.equal(evaluateFormula(eqNode(applied('(12)', '(23)'), cNode('(123)')), s3, sig), true);
  assert.equal(evaluateFormula(eqNode(applied('(23)', '(12)'), cNode('(132)')), s3, sig), true);
  assert.equal(
    evaluateFormula(eqNode(applied('(23)', '(12)'), cNode('(123)')), s3, sig),
    false,
    '实参顺序换了结论就该变 —— 说明顺序确实按 p、q 代入',
  );

  // 零自由参数 + de Bruijn：#0·#0 是「平方」
  const lamSquare = ['lam', 'G', ['app', ['app', ['c', 'mul'], ['b', 0, 'G']], ['b', 0, 'G']]];
  assert.equal(evaluateFormula(eqNode(['app', ['lift', lamSquare, []], cNode('(12)')], cNode('e')), s3, sig), true);
  assert.equal(evaluateFormula(eqNode(['app', ['lift', lamSquare, []], cNode('(123)')], cNode('(132)')), s3, sig), true);

  // 实参个数与抽象的自由变量个数必须一致
  assert.throws(
    () => evaluateFormula(eqNode(['app', ['lift', lamPQ, [cNode('e')]], cNode('e')], cNode('e')), s3, sig),
    (error) => error.code === CODES.BAD_REQUEST && /实参个数/.test(error.message),
  );
});

test('形状校验：只接受规范公式树；析取/否定/旧语言与类型错误当场报错', () => {
  const units5 = getModel('finite:z5-units');
  const sig = withElements(units5, ['1', '2', '3', '4']);
  const truth = eqNode(cNode('1'), cNode('1'));

  // 首版语言明确不接受的连接词（规格 §1.3：析取无内核规则，否定在解析期展开）
  assert.throws(() => evaluateFormula(['or', truth, truth], units5, sig),
    (error) => error.code === CODES.EVIDENCE_UNSUPPORTED && /析取/.test(error.message));
  assert.throws(() => evaluateFormula(['not', truth], units5, sig),
    (error) => error.code === CODES.EVIDENCE_UNSUPPORTED && /否定/.test(error.message));
  assert.throws(() => evaluateFormula(['logic', 'true'], units5, sig),
    (error) => error.code === CODES.EVIDENCE_UNSUPPORTED);

  // 形状错误
  assert.throws(() => evaluateFormula(['all', 'a', truth], units5, sig), (error) => error.code === CODES.BAD_REQUEST);
  assert.throws(() => evaluateFormula(['eq', cNode('1')], units5, sig), (error) => error.code === CODES.BAD_REQUEST);
  assert.throws(() => evaluateFormula(['nope', truth], units5, sig), (error) => error.code === CODES.BAD_REQUEST);

  // 类型、常量与自由变量
  assert.throws(() => evaluateFormula(eqNode(['app', cNode('1'), cNode('2')], cNode('1')), units5, sig),
    (error) => /不是函数/.test(error.message));
  assert.throws(() => evaluateFormula(eqNode(cNode('9'), cNode('1')), units5, sig),
    (error) => /未声明的常量/.test(error.message));
  assert.throws(() => evaluateFormula(eqNode(['v', 'x', 'G'], cNode('1')), units5, sig),
    (error) => /自由变量/.test(error.message));
  assert.throws(() => evaluateFormula(eqNode(cNode('mul'), cNode('1')), units5, sig),
    (error) => /类型不一致/.test(error.message));
  // 函数类型上的量化超出有限语义边界（不偷偷跳过）
  assert.throws(() => evaluateFormula(['all', ['v', 'f', ['->', 'G', 'G']], truth], units5, sig),
    (error) => error.code === CODES.EVIDENCE_UNSUPPORTED);
});

// ---------------------------------------------------------------------------
// 5. 验收 3：有限枚举通过 ≠ 无限结构上的普遍定理
// ---------------------------------------------------------------------------

test('有限枚举通过不会升级为无限结构上的普遍定理（scope 写明，绝不是「已证明」）', () => {
  const units5 = getModel('finite:z5-units');
  const group = checkStructure(units5, GROUP_AXIOMS);

  assert.ok(group.scope.includes('有限'));
  assert.ok(group.scope.includes('无限'), 'scope 必须写明无限结构的边界');
  assert.ok(group.scope.includes('不推广'));
  assert.ok(group.boundary.some((line) => line.includes('不能用有限样本冒充')));
  assert.ok(FINITE_SEMANTICS_SCOPE.includes('不搜索任意模型'));
  assert.ok(FINITE_RESULT_SCOPE.includes('不推广'));
  assert.ok(INFINITE_STRUCTURE_BOUNDARY.includes('无限结构'));
  assert.ok(FINITE_COUNTEREXAMPLE_SCOPE.includes('只反驳'));

  // 只在交换的 Units5 上检查 → 找不到反例，只能记 undecided
  const result = findCounterexample({ background: GROUP_AXIOMS, goal: commutativeGoal }, [units5]);
  assert.equal(result.found, false);
  assert.equal(result.status, 'undecided');
  assert.equal(result.model, null);
  assert.equal(result.assignment, null);
  assert.equal(result.equation, null);
  assert.deepEqual(result.refutations, []);
  assert.ok(result.scope.includes('undecided'));
  assert.ok(UNDECIDED_SCOPE.includes('不构成证明'));
  assert.ok(result.reason.includes('不构成证明'), result.reason);
  assert.ok(result.boundary.some((line) => line.includes('不能用有限样本冒充')));
  // 返回值里不许出现任何「已证明」形状的字段
  for (const key of ['proved', 'verified', 'theorem', 'proven']) {
    assert.equal(Object.hasOwn(result, key), false, `findCounterexample 不该返回 ${key}`);
  }
  assert.equal(result.checked[0].usable, true, '模型本身可用，只是目标在这张表上成立');
});

// ---------------------------------------------------------------------------
// 6. 验收 4：反例搜索的门（结构 / 登记 / 背景与前提）
// ---------------------------------------------------------------------------

test('findCounterexample：背景（群公理）与前提成立、目标（交换律）不成立 → 反例落在 S₃', () => {
  const result = findCounterexample({ background: GROUP_AXIOMS, goal: commutativeGoal });

  assert.equal(result.found, true);
  assert.equal(result.status, 'refuted');
  assert.equal(result.model, 'finite:s3');
  assert.ok(result.assignment.a && result.assignment.b, '见证要给出两个具体元素');
  assert.notEqual(result.equation.left, result.equation.right);
  assert.ok(result.reason.includes('只反驳'), '反例理由必须带范围限定');

  const s3Entry = result.checked.find((entry) => entry.model === 'finite:s3');
  assert.equal(s3Entry.registered, true);
  assert.equal(s3Entry.usable, true);
  assert.equal(s3Entry.background.holds, true);
  assert.equal(s3Entry.background.outcomes.length, 3, '三条群公理逐条核对');
  assert.ok(s3Entry.background.outcomes.every((outcome) => outcome.value === true));
  assert.equal(s3Entry.goal.holds, false);

  const unitsEntry = result.checked.find((entry) => entry.model === 'finite:z5-units');
  assert.equal(unitsEntry.usable, true);
  assert.equal(unitsEntry.goal.holds, true, 'Units5 上目标成立，它不是反例');
  assert.ok(unitsEntry.reason.includes('不构成反例'));

  // 只有 S₃ 一个模型时也能找到
  const onlyS3 = findCounterexample({ background: GROUP_AXIOMS, goal: commutativeGoal }, ['finite:s3']);
  assert.equal(onlyS3.found, true);
  assert.equal(onlyS3.model, 'finite:s3');
});

test('坏运算表不能用于反驳：它连声明的背景（群公理）都不满足', () => {
  const units5 = getModel('finite:z5-units');
  // 把 2·4 从 3 改成 2：结合律与交换律同时失败 —— 正是那种「不加背景核对就会拿来反驳」的坏表
  const corrupt = {
    ...units5,
    ops: {
      ...units5.ops,
      mul: {
        type: 'G -> G -> G',
        table: [['1', '2', '3', '4'], ['2', '4', '1', '2'], ['3', '1', '4', '2'], ['4', '3', '2', '1']],
      },
    },
  };

  // 表结构本身合法（格子都在载体里），坏的只是数学
  assert.deepEqual(validateModel(corrupt), []);
  const group = checkStructure(corrupt, GROUP_AXIOMS);
  assert.equal(group.holds, false);
  assert.ok(group.violations.some((violation) => violation.id === 'associative'));
  const witness = summarizeWitness(group.violations[0].witness);
  assert.deepEqual(Object.keys(witness.assignment).sort(), ['a', 'b', 'c']);
  assert.notEqual(witness.equation.left, witness.equation.right);
  // 它也「不满足目标」—— 但这不是可用的反驳
  assert.equal(checkStructure(corrupt, COMMUTATIVE_LAW).holds, false);

  const result = findCounterexample({ background: GROUP_AXIOMS, goal: commutativeGoal }, [corrupt]);
  assert.equal(result.found, false);
  assert.equal(result.status, 'undecided');
  assert.equal(result.checked[0].usable, false);
  assert.ok(result.checked[0].reason.includes('背景不成立'), result.checked[0].reason);
  assert.deepEqual(result.refutations, []);
});

test('结构非法或未登记的模型不能用于反驳', () => {
  const units5 = getModel('finite:z5-units');
  // (a) 表里出现载体外的取值 → 结构非法
  const ragged = {
    ...units5,
    id: 'finite:broken',
    ops: {
      ...units5.ops,
      mul: {
        type: 'G -> G -> G',
        table: [['1', '2', '3', '4'], ['2', '4', '1', '9'], ['3', '1', '4', '2'], ['4', '3', '2', '1']],
      },
    },
  };
  assert.ok(validateModel(ragged).some((problem) => problem.includes('不在载体中')));
  const broken = findCounterexample({ background: GROUP_AXIOMS, goal: commutativeGoal }, [ragged]);
  assert.equal(broken.found, false);
  assert.ok(broken.checked[0].reason.includes('结构非法'), broken.checked[0].reason);
  assert.throws(() => checkStructure(ragged, GROUP_AXIOMS),
    (error) => error.code === CODES.BAD_REQUEST && /结构非法/.test(error.message));

  // (b) 结构合法、满足背景、目标也成立，但没登记 → 默认不能当反例
  const copy = { ...units5, id: 'finite:z5-units-copy' };
  const refused = findCounterexample({ background: GROUP_AXIOMS, goal: commutativeGoal }, [copy]);
  assert.equal(refused.found, false);
  assert.equal(refused.checked[0].registered, false);
  assert.ok(refused.checked[0].reason.includes('未登记'), refused.checked[0].reason);
  // 调用方明确放行时才会用它（仍然不搜索任何模型）—— 说明这道门是真的在起作用
  const allowed = findCounterexample({ background: GROUP_AXIOMS, goal: commutativeGoal }, [copy], { allowUnregistered: true });
  assert.equal(allowed.checked[0].usable, true);
  assert.equal(allowed.found, false, '这个模型上目标成立，不是反例');

  // 未知 id 直接拒绝
  const unknown = findCounterexample({ background: GROUP_AXIOMS, goal: commutativeGoal }, ['finite:nope']);
  assert.equal(unknown.found, false);
  assert.ok(unknown.checked[0].reason.includes('未登记'));
});

test('前提与背景的核对：前提不成立的对象不能反驳；背景只给标识符时无法核对', () => {
  const s3 = getModel('finite:s3');
  const sig = withElements(s3, ['(12)', '(23)', 'e']);
  const goal = eqNode(mulNode(cNode('(12)'), cNode('(23)')), mulNode(cNode('(23)'), cNode('(12)')));

  // 前提 (12)=(23) 在 S₃ 上为假 → 不能用作反驳
  const falseAssumption = {
    background: GROUP_AXIOMS,
    assumptions: [{ id: 'A1', source: '(12) = (23)', formula: eqNode(cNode('(12)'), cNode('(23)')) }],
    goal,
  };
  const refused = findCounterexample(falseAssumption, [s3], sig);
  assert.equal(refused.found, false);
  assert.equal(refused.checked[0].assumptions.A1.holds, false);
  assert.ok(refused.checked[0].reason.includes('前提 A1 不成立'), refused.checked[0].reason);

  // 换成一条成立的前提，反例就成立（说明挡的是前提，不是别的）
  const trueAssumption = {
    background: GROUP_AXIOMS,
    assumptions: [{ id: 'A1', source: 'e = e', formula: eqNode(cNode('e'), cNode('e')) }],
    goal,
  };
  const found = findCounterexample(trueAssumption, [s3], sig);
  assert.equal(found.found, true);
  assert.equal(found.checked[0].assumptions.A1.holds, true);
  assert.deepEqual(found.assignment, { } , '具体等式目标没有自由变量，见证赋值应当是空的');
  assert.equal(found.equation.left, '(123)');
  assert.equal(found.equation.right, '(132)');

  // 背景只给标识符：本模块不读理论注册表 → 核对不了背景，不能当反例
  const byId = findCounterexample({ background: 'bg:group/1', goal }, [s3], sig);
  assert.equal(byId.found, false);
  assert.ok(byId.checked[0].reason.includes('无法核对'), byId.checked[0].reason);

  // 调用方补上背景的公式表后就能核对
  const resolvedBackground = findCounterexample(
    { background: 'bg:group/1', goal },
    [s3],
    { ...sig, backgroundFormulas: { 'bg:group/1': GROUP_AXIOMS.axioms.map((axiom) => axiom.formula) } },
  );
  assert.equal(resolvedBackground.found, true);
  assert.equal(resolvedBackground.checked[0].background.id, 'bg:group/1');

  // 背景也可以是公式数组
  const asArray = findCounterexample(
    { background: GROUP_AXIOMS.axioms.map((axiom) => axiom.formula), goal },
    [s3],
    sig,
  );
  assert.equal(asArray.found, true);
});

// ---------------------------------------------------------------------------
// 7. 纯函数与独立性（验收 5）
// ---------------------------------------------------------------------------

test('求值是纯函数：重复调用同值、模型不被改动、预置表冻结', () => {
  const before = JSON.stringify(getModel('finite:s3'));
  assert.equal(evaluateFormula(commutativeGoal, 'finite:s3'), false);
  assert.equal(evaluateFormula(commutativeGoal, 'finite:s3'), false);
  assert.equal(evaluateFormula(commutativeGoal, 'finite:s3'), evaluateFormula(commutativeGoal, getModel('finite:s3')));
  assert.equal(JSON.stringify(getModel('finite:s3')), before, '求值不得改动模型');

  const table = getModel('finite:s3').ops.mul.table;
  assert.equal(Object.isFrozen(table), true);
  assert.equal(Object.isFrozen(table[0]), true);
  assert.throws(() => { table[0][0] = '篡改'; }, TypeError);
  assert.equal(getModel('finite:s3').ops.mul.table[0][0], 'e', '冻结后表项不变');
});

test('独立性：源码里没有内核检查器的 import、没有子进程、没有理论库引用', () => {
  const source = readFileSync(FINITE_PATH, 'utf8');

  // (1) import 白名单：只允许错误类型（纯常量 + 一个 Error 子类）
  const specifiers = [...source.matchAll(/^\s*import\s+[^'"]*?from\s+['"]([^'"]+)['"]/gm)]
    .map((match) => match[1]);
  assert.deepEqual(specifiers, ['../../shared/errors.mjs'], '求值器只能依赖错误类型模块');
  assert.ok(!specifiers.some((entry) => entry.includes('language')), '不依赖解析层（它由调用方负责）');
  assert.doesNotMatch(source, /\bimport\s*\(/, '不允许动态 import');
  assert.doesNotMatch(source, /\brequire\s*\(/, '不允许 require');

  // (2) 禁词：内核检查器、外部解释器、子进程、理论库目录
  const forbidden = [
    ['内核检查器的引用', /kernel/i],
    ['理论库目录的引用', /mcs-foundations/i],
    ['外部解释器调用', /python/i],
    ['子进程模块', /child_process/i],
    ['进程启动', /\bspawn\b/i],
    ['命令执行', /\bexec\w*/i],
  ];
  for (const [what, pattern] of forbidden) {
    assert.doesNotMatch(source, pattern, `求值器源码里出现了${what}`);
  }

  // (3) 传递依赖也只有错误类型一个文件（零依赖，不引任何东西）
  const errorsSource = readFileSync(resolve(MCS_WEB_ROOT, 'shared/errors.mjs'), 'utf8');
  assert.doesNotMatch(errorsSource, /^\s*import\b/m, '错误类型模块必须是零依赖');
  assert.doesNotMatch(errorsSource, /child_process|spawn\s*\(/);
});

// ---------------------------------------------------------------------------
// 8. 与 data/formal/instances.mjs 的界面登记交叉核对
// ---------------------------------------------------------------------------

/**
 * `data/formal/instances.mjs` 是同一批有限对象的**界面登记**（记号、元素阶、未登记范围、
 * 逐格独立重算），元素名与本模块的记号不同（`u2` ↔ `2`、`g12` ↔ `(12)`）。
 *
 * 两份表只有互相核对才不会各自漂移，因此这里逐格比对；顺带检查「登记记录 → 求值器模型」
 * 的适配（`instanceToModel`）能复现同样的结论。登记文件若不存在（例如被合并掉了），
 * 本项交叉核对失去对象，记一条诊断跳过 —— 一致性的义务只在两份都在时成立。
 */
test('与 data/formal/instances.mjs 的登记交叉核对：两张表逐格一致，见证同源', async (t) => {
  const registryPath = resolve(MCS_WEB_ROOT, 'data/formal/instances.mjs');
  let registry;
  try {
    registry = await import(pathToFileURL(registryPath).href);
  } catch (error) {
    t.diagnostic(`data/formal/instances.mjs 当前不可读（${error?.code ?? error?.message}），交叉核对跳过。`);
    return;
  }
  const instances = registry.REGISTERED_INSTANCES ?? [];
  assert.ok(instances.length > 0, '界面登记要导出 REGISTERED_INSTANCES');
  assert.deepEqual(instances.map((instance) => instance.id), [...REGISTERED_MODELS], '两份登记的对象必须一致');

  // 元素名映射：S3 用轮换记号（恒等记作 '()'，本模块记作 'e'），Z5 用 u_k ↔ 剩余类 k
  const labelOf = (instance, name) => {
    const element = (instance.elements ?? []).find((item) => item.name === name);
    if (element?.cycle) return element.cycle === '()' ? 'e' : element.cycle;
    if (instance.values) return String(instance.values[name]);
    return name;
  };

  for (const instance of instances) {
    const builtin = getModel(instance.id);
    assert.deepEqual(
      instance.carrier.map((name) => labelOf(instance, name)),
      [...builtin.elements],
      `${instance.id} 的载体顺序或元素记号对不上`,
    );
    assert.deepEqual(
      instance.ops[0].table.map((row) => row.map((cell) => labelOf(instance, cell))),
      builtin.ops.mul.table.map((row) => [...row]),
      `${instance.id} 的乘法表与本模块预置表逐格对不上`,
    );
    assert.deepEqual(
      instance.carrier.map((name) => labelOf(instance, instance.inverses[name])),
      [...builtin.ops.inv.table],
      `${instance.id} 的逆元表与本模块预置表对不上`,
    );

    // 登记记录 → 求值器模型：同一批结论
    const adapted = instanceToModel(instance);
    assert.deepEqual(validateModel(adapted), []);
    assert.equal(checkStructure(adapted, GROUP_AXIOMS).holds, true, `${instance.id} 适配后应当满足群公理`);
    assert.equal(
      modelSummary(adapted).isCommutative,
      instance.isCommutative,
      `${instance.id} 的交换性标注与求值结果不一致`,
    );

    // 登记文件自带的那份独立重算（模运算 / 置换像）也要通过
    if (typeof registry.verifyInstance === 'function') {
      const report = registry.verifyInstance(instance);
      assert.equal(report.ok, true, `${instance.id} 的独立重算不通过：${report.problems.join('；')}`);
    }
  }

  // S₃ 的非交换见证：两套记号（g12/g23 与 (12)/(23)）说的是同一对元素
  const s3Instance = instances.find((instance) => instance.id === 'finite:s3');
  const adaptedS3 = instanceToModel(s3Instance);
  assert.equal(checkStructure(adaptedS3, COMMUTATIVE_LAW).holds, false);
  const pairs = checkStructure(adaptedS3, COMMUTATIVE_LAW).violations[0].witnesses
    .map((witness) => summarizeWitness(witness).assignment);
  assert.ok(pairs.some((pair) => pair.a === 'g12' && pair.b === 'g23'), '登记记号下的见证应当是 g12 与 g23');
  assert.ok(pairs.some((pair) => pair.a === 'g23' && pair.b === 'g12'));

  const cycleOf = (name) => s3Instance.elements.find((element) => element.name === name)?.cycle ?? name;
  assert.deepEqual([cycleOf('g12'), cycleOf('g23')], ['(12)', '(23)'], 'g12/g23 就是案例里的 (12)/(23)');
  const witness = s3Instance.nonCommutativeWitness;
  assert.equal(cycleOf(witness.product), '(123)', 'g12·g23 应当是 (123)');
  assert.equal(cycleOf(witness.reversed), '(132)', 'g23·g12 应当是 (132)');
  assert.deepEqual(witness.imageOfOne, { product: 2, reversed: 3 }, '对 1 的像分别是 2 与 3');
  // 在适配出来的模型上端到端算一遍同一件事
  const adaptedSig = withElements(adaptedS3, ['g12', 'g23', 'g123', 'g132']);
  assert.equal(evaluateFormula(eqNode(mulNode(cNode('g12'), cNode('g23')), cNode('g123')), adaptedS3, adaptedSig), true);
  assert.equal(
    evaluateFormula(eqNode(mulNode(cNode('g12'), cNode('g23')), mulNode(cNode('g23'), cNode('g12'))), adaptedS3, adaptedSig),
    false,
  );

  // 适配时保留登记层的运算名作为别名，并把恒等元自身的元素名登记成常元
  assert.deepEqual(Object.keys(adaptedS3.ops).sort(), ['comp3', 'inv', 'mul']);
  assert.equal(Object.hasOwn(adaptedS3.consts, 'e3'), true);
  assert.equal(evaluateFormula(eqNode(cNode('e3'), cNode('e')), adaptedS3, adaptedSig), true);

  // 若调用方的公式整套用登记层记号（comp3 / inv3 / e3），用 names 改名后同样可求值
  const renamed = instanceToModel(s3Instance, { names: { mul: 'comp3', inv: 'inv3', e: 'e3' } });
  assert.deepEqual(Object.keys(renamed.ops).sort(), ['comp3', 'inv3'], '改名后不该留下 mul / inv');
  const comp = (a, b) => ['app', ['app', ['c', 'comp3'], a], b];
  const renamedSig = withElements(renamed, ['g12', 'g23', 'g123']);
  assert.equal(evaluateFormula(eqNode(comp(cNode('g12'), cNode('g23')), cNode('g123')), renamed, renamedSig), true);
  assert.equal(evaluateFormula(eqNode(comp(cNode('g12'), cNode('g23')), comp(cNode('g23'), cNode('g12'))), renamed, renamedSig), false);
});
