/**
 * tests/relation-engine.test.mjs —— 发现引擎（证明生成 + 独立检查 + 判断 + 目标核对）验收。
 *
 * 关键点：这里的每一份证书都由 `search` 自动生成，**真的用子进程调 python kernel**
 * 判定（`mcs-foundations/validation/certification/kernel.py`），不是本地模拟。
 * 内核结果写盘读取（`--output`），避免依赖管道捕获。
 *
 * 覆盖（对应 task-2 的验收 1–5）：
 * 1. 合取交换 / 定义展开 / 假设蕴含（全称消去+蕴含消去）/ λ 应用化简（abstraction）；
 * 2. 删掉条件后不再认证原来那个无条件结论；
 * 3. 两个前提共同推出结论时，单个前提都推不出（verify 用 openHypotheses 核对）；
 * 4. 伪造 passed、目标错配、隐藏开放假设、错误理论、证书被改一个字 —— 全被拒；
 * 5. 预算耗尽 / 不支持 / 执行错误 → timeout / unsupported / error，math.status 保持 undecided。
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { digest, fileHash, KERNEL_VERSION } from '../core/formal/codec.mjs';
import { CHECK_STATUS, EVIDENCE_STATUS } from '../shared/contracts.mjs';
import { All, And, App, B, C, Eq, Ex, Iff, Imp, L, Or, V, close, ensureSig, formulaFv, formulaOk, fsub, sameFormula, signatureOfTheory } from '../core/formal/terms.mjs';
import {
  allElim, assembleBundle, assembleProof, axiomInstance, hypothesisNode, impElim, kernelTheory, lemmaNode,
} from '../core/formal/certificate.mjs';
import { collectHypotheses, search } from '../core/formal/search.mjs';
import { closeCertificate, lemmaEntry, openHypothesesOf } from '../core/formal/lemmas.mjs';
import { evidenceRecord, judgeCandidate } from '../core/formal/judgment.mjs';
import { atomToFormula, clauseToFormula, clausifyFormula, holdsAtom, toProgram } from '../core/formal/clauses.mjs';
import { conditionsFromHypotheses, normalizeCheck, verifyCandidate } from '../core/formal/verify.mjs';
import { parseFormula } from '../core/formal/language.mjs';
import { buildKernelTheory } from '../core/formal/theory.mjs';
import { kernelInputForBackground } from '../data/formal/registry.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PKG = path.resolve(HERE, '..');
const REPO = path.resolve(PKG, '..');
const KERNEL = path.join(REPO, 'mcs-foundations', 'validation', 'certification', 'kernel.py');
const TMP = path.join(PKG, 'tmp', 'team', 'B');
const PYTHON = process.env.MCS_PYTHON ?? 'python';

// ---------------------------------------------------------------- 小工具

const ap = (f, ...args) => args.reduce((acc, arg) => App(acc, arg), f);
const andT = (p, q) => App(App(L('and'), p), q);
const objEq = (type, l, r) => App(App(L('eq', type), l), r);

let kernelRuns = 0;

/** 把 bundle 写盘，交给真 kernel 判定，再把结果 JSON 读回来。 */
function runKernel(bundle, label) {
  mkdirSync(TMP, { recursive: true });
  kernelRuns += 1;
  const certPath = path.join(TMP, `${label}.json`);
  const outPath = path.join(TMP, `${label}.result.json`);
  writeFileSync(certPath, JSON.stringify(bundle), 'utf8');
  const finished = spawnSync(PYTHON, [KERNEL, certPath, '--output', outPath], { stdio: 'ignore' });
  if (finished.error) throw new Error(`无法启动 python 检查器（${PYTHON}）：${finished.error.message}`);
  let result;
  try {
    result = JSON.parse(readFileSync(outPath, 'utf8'));
  } catch {
    result = { status: 'corrupt', message: `kernel 没有写出结果（exit ${finished.status}）` };
  }
  return { ...result, exitCode: finished.status, certificatePath: certPath };
}

/** search → assembleProof → assembleBundle → python kernel，一条龙。 */
function proveAndCheck({ label, goal, program = { hypotheses: [], clauses: [] }, bundleParts, options = {} }) {
  const { theory, sig, definitions, theoryAxioms } = bundleParts;
  const result = search(goal, program, { sig, ...options });
  if (result.status !== 'proved') return { result, proof: null, bundle: null, check: null, hypotheses: null };
  const hypotheses = collectHypotheses(result.proof);
  const ctx = {
    sig,
    hypotheses,
    theoryAxioms,
    definitions,
    lemmas: [],
    // 目标是源码字符串时，rootConclusion 必须用**解析后**的公式（`result.goal`），
    // 不能把源码串直接交给装配器——那样 sameFormula 根本没得比。
    rootConclusion: result.goal,
    objectConclusion: result.objectConclusion,
  };
  const proof = assembleProof(result.proof, ctx);
  const bundle = assembleBundle({ theory, proof });
  const check = runKernel(bundle, label);
  return { result, proof, bundle, check, hypotheses };
}

/** 组装成候选形状，供 verifyCandidate 核对。 */
function candidateFrom({ id, from, to, proof, bundle, check, conditions = [] }) {
  const normalized = normalizeCheck(check);
  return {
    id,
    kind: 'conditionalDerivation',
    from,
    to,
    conditions,
    goal: { canonical: proof.conclusion, source: '测试目标', hash: `sha256:${digest(proof.conclusion)}` },
    theory: { id: normalized?.theoryId, version: normalized?.theoryVersion, sha256: normalized?.theorySha256 },
    certificate: bundle,
    certificateSha256: bundle ? digest(bundle) : null,
    check,
    openHypotheses: normalized?.openHypotheses ?? {},
  };
}

function assertPassed(check, goal) {
  assert.equal(check.status, 'passed', `kernel 拒绝：${JSON.stringify(check).slice(0, 400)}`);
  assert.equal(check.checker, KERNEL_VERSION);
  assert.equal(check.kernel_formally_verified, false, '内核自己没有被形式化验证过，必须如实为 false');
  assert.ok(check.checker_sha256, '内核结果里必须带检查器文件哈希（只有真检查器会写这个字段）');
  assert.ok(check.proof_sha256, '内核结果里必须带证明摘要');
  assert.ok(sameFormula(check.conclusion, goal), '证书证明的精确命题与目标不 α 相等');
}

const CERT_DIR = path.join(REPO, 'mcs-foundations', 'validation', 'certification', 'certificates');

/** 读一份既有证书（**只读**，绝不改写 `mcs-foundations/` 下的任何文件）。 */
function loadCertificate(name) {
  return JSON.parse(readFileSync(path.join(CERT_DIR, `${name}.json`), 'utf8'));
}

/** 既有证书的签名：bundle.theory 就是 kernel 口径的 theory，直接摊开成 sig。 */
function certificateSig(bundle) {
  return {
    bases: bundle.theory.bases,
    constants: bundle.theory.constants,
    definitions: bundle.theory.definitions ?? [],
  };
}

// ---------------------------------------------------------------- 1. 三个代表目标

test('① 合取交换：A∧B ⇒ B∧A 自动生成证书并被 kernel 判 passed', () => {
  const parts = kernelTheory({ id: 'T-and-comm', version: '1', bases: ['o'], constants: {} });
  const hA = V('hA', 'o');
  const hB = V('hB', 'o');
  const goal = Imp(And(B(hA), B(hB)), And(B(hB), B(hA)));
  const { result, proof, check } = proveAndCheck({ label: 'case1-and-comm', goal, bundleParts: parts });
  assert.equal(result.status, 'proved', result.reason);
  assertPassed(check, goal);
  assert.deepEqual(check.open_hypotheses, {}, '蕴含引入后不应留下开放假设');
  assert.ok(proof.steps.some((s) => s.rule === 'and_i'), '应当出现合取引入');
  assert.ok(proof.steps.some((s) => s.rule === 'imp_i'), '应当出现蕴含引入');
});

test('② 定义展开（concept_unfold 型）：both ≜ λx. R x ∧ S x ⊢ ∀x. both x ⇒ R x', () => {
  const x = V('x', 'E');
  const parts = kernelTheory({
    id: 'T-concept-unfold',
    version: '1',
    bases: ['o', 'E'],
    constants: { R: ['->', 'E', 'o'], S: ['->', 'E', 'o'] },
    definitions: [{ name: 'both', term: ['lambda', 'x', 'E', andT(App(C('R'), x), App(C('S'), x))] }],
  });
  const goal = All(x, Imp(B(App(C('both'), x)), B(App(C('R'), x))));
  const program = { hypotheses: [], clauses: [{ id: 'both', kind: 'definition', definitionName: 'both' }] };
  const { result, proof, check } = proveAndCheck({ label: 'case2-unfold', goal, program, bundleParts: parts });
  assert.equal(result.status, 'proved', result.reason);
  assertPassed(check, goal);
  assert.ok(proof.steps.some((s) => s.rule === 'definition'), '定义展开必须走 definition 规则');
  assert.ok(proof.steps.some((s) => s.rule === 'h_axiom' && s.instance?.schema === 'abstraction'), 'β 只能走 abstraction 公理实例');
  assert.ok(proof.steps.some((s) => s.rule === 'h_axiom' && s.instance?.schema === 'logic' && s.instance.op === 'and'), '对象层合取要经 logic:and 桥');
  assert.ok(proof.steps.some((s) => s.rule === 'all_i'), '全称目标要走全称引入');
});

test('③ 从 ∀x. P x ⇒ Q x 与 P a 推出 Q a（全称消去 + 蕴含消去）', () => {
  const x = V('x', 'E');
  const parts = kernelTheory({
    id: 'T-horn',
    version: '1',
    bases: ['o', 'E'],
    constants: { P: ['->', 'E', 'o'], Q: ['->', 'E', 'o'], a: 'E' },
  });
  const goal = B(App(C('Q'), C('a')));
  const forallImp = All(x, Imp(B(App(C('P'), x)), B(App(C('Q'), x))));
  const program = {
    hypotheses: [
      { id: 'forall-imp', formula: forallImp },
      { id: 'p-a', formula: B(App(C('P'), C('a'))) },
    ],
    clauses: [],
  };
  const { result, proof, check } = proveAndCheck({ label: 'case3-horn', goal, program, bundleParts: parts });
  assert.equal(result.status, 'proved', result.reason);
  assertPassed(check, goal);
  assert.ok(proof.steps.some((s) => s.rule === 'all_e'), '必须出现全称消去');
  assert.ok(proof.steps.some((s) => s.rule === 'imp_e'), '必须出现蕴含消去');
  assert.deepEqual(Object.keys(check.open_hypotheses).sort(), ['forall-imp', 'p-a']);
});

test('③′ 从 A 与 A⇒B 推出 B（纯蕴含消去，两条前提都保留在开放假设里）', () => {
  const hA = V('hA', 'o');
  const hB = V('hB', 'o');
  const parts = kernelTheory({ id: 'T-imp', version: '1', bases: ['o'], constants: {} });
  const goal = B(hB);
  const program = {
    hypotheses: [
      { id: 'A', formula: B(hA) },
      { id: 'A-imp-B', formula: Imp(B(hA), B(hB)) },
    ],
    clauses: [],
  };
  const { result, proof, check } = proveAndCheck({ label: 'case3b-imp', goal, program, bundleParts: parts });
  assert.equal(result.status, 'proved', result.reason);
  assertPassed(check, goal);
  assert.deepEqual(Object.keys(check.open_hypotheses).sort(), ['A', 'A-imp-B']);
  assert.ok(proof.steps.some((s) => s.rule === 'imp_e'));
});

test('④ λ 应用化简走 abstraction 公理实例：(λx.x) a = a 与 (λx.f x) a = f a', () => {
  const parts = kernelTheory({
    id: 'T-beta',
    version: '1',
    bases: ['o', 'E'],
    constants: { a: 'E', f: ['->', 'E', 'E'] },
  });
  const idLam = ['lam', 'E', ['b', 0, 'E']];
  const goalId = Eq(App(['lift', idLam, []], C('a')), C('a'));
  const first = proveAndCheck({ label: 'case4-abstraction-id', goal: goalId, bundleParts: parts });
  assert.equal(first.result.status, 'proved', first.result.reason);
  assertPassed(first.check, goalId);
  assert.ok(first.proof.steps.some((s) => s.rule === 'h_axiom' && s.instance?.schema === 'abstraction'));
  assert.ok(first.proof.steps.some((s) => s.rule === 'all_e'));

  const fLam = ['lam', 'E', App(C('f'), ['b', 0, 'E'])];
  const goalF = Eq(App(['lift', fLam, []], C('a')), App(C('f'), C('a')));
  const second = proveAndCheck({ label: 'case4b-abstraction-f', goal: goalF, bundleParts: parts });
  assert.equal(second.result.status, 'proved', second.result.reason);
  assertPassed(second.check, goalF);
});

// ---------------------------------------------------------------- 2. 删掉条件

test('⑤ 条件（右单位 / 右逆 / 可加性）删掉后不再认证原来那个无条件结论', () => {
  const a = V('a', 'G');
  const b = V('b', 'G');
  const parts = kernelTheory({
    id: 'T-magma',
    version: '1',
    bases: ['o', 'G'],
    constants: {
      mul: ['->', 'G', ['->', 'G', 'G']],
      add: ['->', 'G', ['->', 'G', 'G']],
      inv: ['->', 'G', 'G'],
      f: ['->', 'G', 'G'],
      unit: 'G',
      ga: 'G',
      gb: 'G',
    },
  });
  const cases = [
    {
      name: 'right-identity',
      condition: { id: 'right_identity', formula: All(a, Eq(ap(C('mul'), a, C('unit')), a)) },
      goal: Eq(ap(C('mul'), C('unit'), C('unit')), C('unit')),
    },
    {
      name: 'right-inverse',
      condition: { id: 'right_inverse', formula: All(a, Eq(ap(C('mul'), a, App(C('inv'), a)), C('unit'))) },
      goal: Eq(ap(C('mul'), C('unit'), App(C('inv'), C('unit'))), C('unit')),
    },
    {
      name: 'additivity',
      condition: {
        id: 'additivity',
        formula: All(a, All(b, Eq(App(C('f'), ap(C('add'), a, b)), ap(C('add'), App(C('f'), a), App(C('f'), b))))),
      },
      goal: Eq(App(C('f'), ap(C('add'), C('ga'), C('gb'))), ap(C('add'), App(C('f'), C('ga')), App(C('f'), C('gb')))),
    },
  ];
  for (const item of cases) {
    const withCondition = proveAndCheck({
      label: `case5-${item.name}-with`,
      goal: item.goal,
      program: { hypotheses: [item.condition], clauses: [] },
      bundleParts: parts,
    });
    assert.equal(withCondition.result.status, 'proved', `${item.name}：有条件下应当证出（${withCondition.result.reason}）`);
    assertPassed(withCondition.check, item.goal);
    assert.deepEqual(
      Object.keys(withCondition.check.open_hypotheses),
      [item.condition.id],
      `${item.name}：整个证明就依赖这一条条件`,
    );

    const without = search(item.goal, { hypotheses: [], clauses: [] }, { sig: parts.sig });
    assert.notEqual(without.status, 'proved', `${item.name}：删掉条件后不得再认证无条件结论`);
    assert.equal(without.status, 'undecided');
    assert.equal(without.proof, null, `${item.name}：没证出来就不能有证书`);
  }
});

// ---------------------------------------------------------------- 3. 两个前提共同推出

test('⑥ 两个前提共同推出结论：单个前提都推不出，且开放假设必须两条都对上', () => {
  const hA = V('hA', 'o');
  const hB = V('hB', 'o');
  const parts = kernelTheory({ id: 'T-joint', version: '1', bases: ['o'], constants: {} });
  const goal = B(hB);
  const premiseA = { id: 'premA', formula: B(hA) };
  const premiseImp = { id: 'premImp', formula: Imp(B(hA), B(hB)) };
  const joint = proveAndCheck({
    label: 'case6-joint',
    goal,
    program: { hypotheses: [premiseA, premiseImp], clauses: [] },
    bundleParts: parts,
  });
  assert.equal(joint.result.status, 'proved', joint.result.reason);
  assertPassed(joint.check, goal);
  assert.deepEqual(Object.keys(joint.check.open_hypotheses).sort(), ['premA', 'premImp']);

  // 单独任一前提都不足以推出结论——不产生「单独前提 ⇒ 结论」的关系。
  const onlyA = search(goal, { hypotheses: [premiseA], clauses: [] }, { sig: parts.sig });
  const onlyImp = search(goal, { hypotheses: [premiseImp], clauses: [] }, { sig: parts.sig });
  assert.equal(onlyA.status, 'undecided');
  assert.equal(onlyImp.status, 'undecided');

  // verify：条件写全 → 通过；只写一条 → 立刻暴露「隐藏的开放假设」。
  const from = { node: 'node:prem-a', version: '3' };
  const to = { node: 'node:concl-b', version: '2' };
  const nodeVersions = { 'node:prem-a': '3', 'node:concl-b': '2' };
  const full = candidateFrom({
    id: 'cand:joint', from, to, proof: joint.proof, bundle: joint.bundle, check: joint.check,
    conditions: conditionsFromHypotheses(joint.check.open_hypotheses),
  });
  const fullVerify = verifyCandidate(full, { expectedConclusion: goal, nodeVersions, theoryAxioms: [] });
  assert.equal(fullVerify.ok, true, JSON.stringify(fullVerify.problems));

  const partial = candidateFrom({
    id: 'cand:partial', from, to, proof: joint.proof, bundle: joint.bundle, check: joint.check,
    conditions: conditionsFromHypotheses({ premA: B(hA) }),
  });
  const partialVerify = verifyCandidate(partial, { expectedConclusion: goal, nodeVersions, theoryAxioms: [] });
  assert.equal(partialVerify.ok, false);
  assert.ok(partialVerify.problems.some((p) => p.includes('隐藏的开放假设')), JSON.stringify(partialVerify.problems));

  // 声明了但没用到的条件同样是失真（多报条件也要被拒）。
  const overDeclared = candidateFrom({
    id: 'cand:over', from, to, proof: joint.proof, bundle: joint.bundle, check: joint.check,
    conditions: [...conditionsFromHypotheses(joint.check.open_hypotheses), { id: 'cond:unused', source: '未用到', canonical: B(V('hZ', 'o')) }],
  });
  const overVerify = verifyCandidate(overDeclared, { expectedConclusion: goal, nodeVersions, theoryAxioms: [] });
  assert.equal(overVerify.ok, false);
  assert.ok(overVerify.problems.some((p) => p.includes('声明了但没有用到的条件')), JSON.stringify(overVerify.problems));
});

// ---------------------------------------------------------------- 4. 伪造一律被拒

test('⑦ 伪造 passed / 目标错配 / 隐藏开放假设 / 错误理论 / 证书被改一个字 —— 全被拒', () => {
  const hA = V('hA', 'o');
  const hB = V('hB', 'o');
  const parts = kernelTheory({ id: 'T-forge', version: '1', bases: ['o'], constants: {} });
  const goal = Imp(And(B(hA), B(hB)), And(B(hB), B(hA)));
  const honest = proveAndCheck({ label: 'case7-base', goal, bundleParts: parts });
  assertPassed(honest.check, goal);

  const from = { node: 'node:and-a', version: '1' };
  const to = { node: 'node:and-b', version: '1' };
  const nodeVersions = { 'node:and-a': '1', 'node:and-b': '1' };
  const base = candidateFrom({ id: 'cand:honest', from, to, proof: honest.proof, bundle: honest.bundle, check: honest.check });
  const baseVerify = verifyCandidate(base, { expectedConclusion: goal, nodeVersions, theoryAxioms: [] });
  assert.equal(baseVerify.ok, true, JSON.stringify(baseVerify.problems));

  // (a) 目标错配：证书证的是 A∧B ⇒ B∧A，却声称证了 B∧A ⇒ B∧A。
  const wrongGoal = Imp(And(B(hB), B(hA)), And(B(hB), B(hA)));
  const mismatched = verifyCandidate(base, { expectedConclusion: wrongGoal, nodeVersions, theoryAxioms: [] });
  assert.equal(mismatched.ok, false);
  assert.ok(mismatched.problems.some((p) => p.includes('目标错配')), JSON.stringify(mismatched.problems));

  // (b) 伪造 passed：check 自报 passed 但结论对不上（没有真的内核结果撑着）。
  const forged = { ...base, check: { ...honest.check, conclusion: wrongGoal } };
  const forgedVerify = verifyCandidate(forged, { expectedConclusion: goal, nodeVersions, theoryAxioms: [] });
  assert.equal(forgedVerify.ok, false);
  assert.ok(forgedVerify.problems.some((p) => p.includes('目标错配')), JSON.stringify(forgedVerify.problems));
  const forgedJudgment = judgeCandidate({
    goal, proof: honest.proof, check: forged.check, run: { status: 'completed' }, verification: forgedVerify,
  });
  assert.equal(forgedJudgment.math.status, 'undecided', '伪造的 passed 不得变成 verified');

  // (c) 内核 passed 但没做目标核对 → 也只能是 undecided。
  const noVerifyJudgment = judgeCandidate({ goal, proof: honest.proof, check: honest.check, run: { status: 'completed' } });
  assert.equal(noVerifyJudgment.math.status, 'undecided');
  assert.equal(noVerifyJudgment.label, 'NOT-CLAIMED');

  // (d) 错误理论：候选自报的理论 id/版本与内核结论不一致。
  const wrongTheory = { ...base, theory: { id: 'T-somewhere-else', version: '9', sha256: base.theory.sha256 } };
  const wrongTheoryVerify = verifyCandidate(wrongTheory, { expectedConclusion: goal, nodeVersions, theoryAxioms: [] });
  assert.equal(wrongTheoryVerify.ok, false);
  assert.ok(wrongTheoryVerify.problems.some((p) => p.includes('理论 id 不一致')), JSON.stringify(wrongTheoryVerify.problems));

  // (e) 节点版本过期。
  const staleVersion = verifyCandidate(base, {
    expectedConclusion: goal, nodeVersions: { 'node:and-a': '2', 'node:and-b': '1' }, theoryAxioms: [],
  });
  assert.equal(staleVersion.ok, false);
  assert.ok(staleVersion.problems.some((p) => p.includes('版本过期')), JSON.stringify(staleVersion.problems));

  // (f) 证书被改一个字：字面替换一个规则名，内核直接拒；verify 靠摘要也能发现。
  const serialized = JSON.stringify(honest.bundle);
  const mutatedText = serialized.replace('"and_i"', '"and_l"');
  assert.notEqual(mutatedText, serialized, '这条证书里应当有 and_i 步骤可改');
  assert.equal(mutatedText.length, serialized.length, '只改一个字，长度不变');
  const mutatedBundle = JSON.parse(mutatedText);
  const mutatedCheck = runKernel(mutatedBundle, 'case7-mutated');
  assert.equal(mutatedCheck.status, 'failed', `改过的证书必须被拒：${JSON.stringify(mutatedCheck)}`);
  assert.equal(mutatedCheck.exitCode, 1);

  const tampered = { ...base, certificate: mutatedBundle };
  const tamperedVerify = verifyCandidate(tampered, { expectedConclusion: goal, nodeVersions, theoryAxioms: [] });
  assert.equal(tamperedVerify.ok, false);
  assert.ok(
    tamperedVerify.problems.some((p) => p.includes('证书被改动过') || p.includes('proof 现算摘要')),
    JSON.stringify(tamperedVerify.problems),
  );

  // (g) 偷加公理：证书的 theory.axioms 里塞一条背景白名单之外的条目。
  const smuggled = JSON.parse(JSON.stringify(honest.bundle));
  smuggled.theory.axioms = [{ id: 'sneaky', formula: B(V('sneaky', 'o')) }];
  const smuggledCheck = runKernel(smuggled, 'case7-smuggled');
  assert.notEqual(smuggledCheck.status, 'passed', '理论哈希变了，原证明必须失效');
  const smuggledVerify = verifyCandidate(
    { ...base, certificate: smuggled },
    { expectedConclusion: goal, nodeVersions, theoryAxioms: [] },
  );
  assert.equal(smuggledVerify.ok, false);
  assert.ok(smuggledVerify.problems.some((p) => p.includes('偷偷加进 theory.axioms')), JSON.stringify(smuggledVerify.problems));
});

// ---------------------------------------------------------------- 5. 预算 / 不支持 / 错误

test('⑧ 预算耗尽 / 不支持 / 执行错误分别报 timeout / unsupported / error，math 保持 undecided', () => {
  const hA = V('hA', 'o');
  const hB = V('hB', 'o');
  const parts = kernelTheory({ id: 'T-budget', version: '1', bases: ['o'], constants: {} });

  // timeout：深度预算给 0，连一层蕴含都展不开。
  const budgetGoal = Imp(And(B(hA), B(hB)), And(B(hB), B(hA)));
  const timedOut = search(budgetGoal, { hypotheses: [], clauses: [] }, { sig: parts.sig, maxDepth: 0 });
  assert.equal(timedOut.status, 'timeout', timedOut.reason);
  assert.equal(timedOut.proof, null);
  const timeoutJudgment = judgeCandidate({ goal: budgetGoal, check: null, run: { status: 'timeout', reason: timedOut.reason } });
  assert.equal(timeoutJudgment.math.status, 'undecided');
  assert.equal(timeoutJudgment.run.status, 'timeout');

  // 步数预算给 0：即便找到了证明，超出证书步数上限也一律 timeout。
  const noSteps = search(budgetGoal, { hypotheses: [], clauses: [] }, { sig: parts.sig, maxSteps: 0 });
  assert.equal(noSteps.status, 'timeout', noSteps.reason);
  assert.equal(noSteps.proof, null);

  // unsupported：析取与 false 在首版没有规则。
  const disjunction = search(Or(B(hA), B(hB)), { hypotheses: [], clauses: [] }, { sig: parts.sig });
  assert.equal(disjunction.status, 'unsupported', disjunction.reason);
  assert.match(disjunction.reason, /析取/);
  const falsity = search(['false'], { hypotheses: [], clauses: [] }, { sig: parts.sig });
  assert.equal(falsity.status, 'unsupported', falsity.reason);
  const unsupportedJudgment = judgeCandidate({ check: null, run: { status: 'unsupported', reason: disjunction.reason } });
  assert.equal(unsupportedJudgment.math.status, 'undecided');

  // error：目标里有未声明的常量，属于输入错误而不是"能力之外"。
  const undeclared = search(Eq(C('nope'), C('nope')), { hypotheses: [], clauses: [] }, { sig: parts.sig });
  assert.equal(undeclared.status, 'error', undeclared.reason);
  assert.equal(undeclared.proof, null);
  const errorJudgment = judgeCandidate({ check: null, run: { status: 'error', reason: undeclared.reason } });
  assert.equal(errorJudgment.math.status, 'undecided');

  // 在给定预算内穷尽但没找到 → undecided（不是 refuted）。
  const undecided = search(B(hB), { hypotheses: [{ id: 'A', formula: B(hA) }], clauses: [] }, { sig: parts.sig });
  assert.equal(undecided.status, 'undecided');
  const undecidedJudgment = judgeCandidate({ check: null, run: { status: 'completed', reason: undecided.reason } });
  assert.equal(undecidedJudgment.math.status, 'undecided');
  assert.equal(undecidedJudgment.label, 'NOT-CLAIMED');
});

test('⑨ check failed 绝不写成 refuted；refuted 只能来自独立有限语义', () => {
  const hA = V('hA', 'o');
  const hB = V('hB', 'o');
  const goal = Imp(And(B(hA), B(hB)), And(B(hB), B(hA)));
  const parts = kernelTheory({ id: 'T-judge', version: '1', bases: ['o'], constants: {} });
  const honest = proveAndCheck({ label: 'case9-judge', goal, bundleParts: parts });
  assertPassed(honest.check, goal);

  const failed = judgeCandidate({
    goal, proof: honest.proof, check: { status: 'failed', message: 'invalid assumption', step: 'main:s0' }, run: { status: 'completed' },
  });
  assert.equal(failed.run.status, 'check_failed');
  assert.equal(failed.math.status, 'undecided');
  assert.equal(failed.label, 'NOT-CLAIMED');
  assert.ok(failed.notes.some((n) => n.includes('检查失败不等于命题为假')), JSON.stringify(failed.notes));

  // 真的内核拒绝（改字）也要走同一条判断路径。
  const mutated = JSON.parse(JSON.stringify(honest.bundle).replace('"and_i"', '"and_l"'));
  const mutatedCheck = runKernel(mutated, 'case9-mutated');
  assert.equal(mutatedCheck.status, 'failed');
  const mutatedJudgment = judgeCandidate({ goal, proof: honest.proof, check: mutatedCheck, run: { status: 'completed' } });
  assert.equal(mutatedJudgment.run.status, 'check_failed');
  assert.equal(mutatedJudgment.math.status, 'undecided');

  // 有限反模型 → refuted，但标签是 FINITE，且带"只反驳该背景下的蕴含"的边界说明。
  const refuted = judgeCandidate({
    goal,
    check: null,
    counterexample: { found: true, model: 'finite:s3', assignment: {}, reason: 'a=1,b=2 处前提真、结论假' },
    run: { status: 'completed' },
  });
  assert.equal(refuted.math.status, 'refuted');
  assert.equal(refuted.label, 'FINITE');
  assert.ok(refuted.notes.some((n) => n.includes('不宣称推翻')), JSON.stringify(refuted.notes));

  // 独立有限语义的反模型也不能把"内核拒绝"改写成 refuted。
  const both = judgeCandidate({
    goal,
    check: { status: 'failed', message: 'x' },
    counterexample: { found: true, model: 'finite:s3', assignment: {} },
    run: { status: 'completed' },
  });
  assert.equal(both.math.status, 'undecided');
});

test('⑩ 每个引用的假设都写进了 certificates 的 hypotheses 且 kernel 与自报一致', () => {
  const hA = V('hA', 'o');
  const hB = V('hB', 'o');
  const parts = kernelTheory({ id: 'T-hyp-decl', version: '1', bases: ['o'], constants: {} });
  const goal = B(hB);
  const program = {
    hypotheses: [
      { id: 'A', formula: B(hA) },
      { id: 'A-imp-B', formula: Imp(B(hA), B(hB)) },
    ],
    clauses: [],
  };
  const { proof, check, bundle } = proveAndCheck({ label: 'case10-decl', goal, program, bundleParts: parts });
  assertPassed(check, goal);
  // 声明里只应有真正用到的假设，且与内核重算的开放假设逐条一致（同一个公式）。
  const declared = Object.keys(bundle.proofs[bundle.target].hypotheses).sort();
  assert.deepEqual(declared, Object.keys(check.open_hypotheses).sort());
  for (const [label, formula] of Object.entries(check.open_hypotheses)) {
    assert.ok(sameFormula(bundle.proofs[bundle.target].hypotheses[label], formula));
  }
  assert.ok(proof.steps.length >= 3);
});

test('⑯ program.clauses 的 atoms 形状（§2.7 的 {kind,pred,args}）也能当理由用', () => {
  const hA = V('hA', 'o');
  const hB = V('hB', 'o');
  const parts = kernelTheory({ id: 'T-atoms', version: '1', bases: ['o'], constants: {} });
  const goal = Imp(B(hA), B(hB));
  const program = {
    hypotheses: [],
    clauses: [{
      id: 'clause-imp',
      kind: 'hypothesis',
      source: '把 B(hA) ⇒ B(hB) 当一条局部假设',
      // atoms 的项是**对象项**：holdsAtom(t) 表示认证公式 B(t)，即 t = true。
      atoms: [holdsAtom(hB), holdsAtom(hA)], // [头, …体]
    }],
  };
  const { result, proof, check, hypotheses } = proveAndCheck({ label: 'case16-atoms', goal, program, bundleParts: parts });
  assert.equal(result.status, 'proved', result.reason);
  assertPassed(check, goal);
  assert.ok(hypotheses.has('clause-imp'), 'atoms 应当被还原成以 id 为标签的假设');
  assert.ok(proof.steps.some((s) => s.rule === 'assume' && s.hypothesis === 'clause-imp'));
  assert.deepEqual(Object.keys(check.open_hypotheses), ['clause-imp']);
});

test('⑪ 复核汇总：判定确实来自真的 python 子进程（独立哈希交叉核对）', () => {
  const hA = V('hA', 'o');
  const hB = V('hB', 'o');
  const parts = kernelTheory({ id: 'T-kernel-proof', version: '1', bases: ['o'], constants: {} });
  const goal = Imp(And(B(hA), B(hB)), And(B(hB), B(hA)));
  const recheck = proveAndCheck({ label: 'case11-recheck', goal, bundleParts: parts });
  assertPassed(recheck.check, goal);
  assert.ok(kernelRuns >= 1, '本次运行至少要真的拉起一次内核');
  // 内核自报它读的就是这个检查器文件：Node 独立算一遍文件字节摘要来核对。
  assert.equal(recheck.check.checker_sha256, fileHash(KERNEL), '内核跑的不是这个检查器文件');
  // 内核自报它读的就是 Node 写下的那份证书字节：同样独立核对。
  assert.equal(recheck.check.input_sha256, fileHash(recheck.check.certificatePath), '内核读到的证书字节与写盘的不一致');
  assert.equal(digest(recheck.bundle), digest(JSON.parse(readFileSync(recheck.check.certificatePath, 'utf8'))));
});

test('⑫ 引用已重放通过的局部引理：theorem 规则（要求引理开放假设为空）', () => {
  const parts = kernelTheory({
    id: 'T-lemma',
    version: '1',
    bases: ['o'],
    constants: { A: 'o', C: 'o' },
    axioms: [{ id: 'T1', formula: Imp(B(C('A')), B(C('C'))) }],
  });
  const lemmaFormula = Imp(B(C('A')), B(C('C')));
  const lemma = proveAndCheck({
    label: 'case12-lemma-proof',
    goal: lemmaFormula,
    program: { hypotheses: [], clauses: [{ id: 'T1', kind: 'axiom', theoryAxiomId: 'T1', formula: lemmaFormula }] },
    bundleParts: parts,
  });
  assert.equal(lemma.result.status, 'proved', lemma.result.reason);
  assertPassed(lemma.check, lemmaFormula);
  assert.deepEqual(lemma.check.open_hypotheses, {}, '引理必须是闭的，否则不能被 theorem 规则引用');

  // 主证明把引理当一条「带理由的子句」用；理论公理 T1 不在主程序的条目里。
  const goal = B(C('C'));
  const program = {
    hypotheses: [{ id: 'a-holds', formula: B(C('A')) }],
    clauses: [{ id: 'lemma1', kind: 'lemma', lemmaId: 'lemma1', formula: lemmaFormula, proofId: 'lemma1' }],
  };
  const main = search(goal, program, { sig: parts.sig });
  assert.equal(main.status, 'proved', main.reason);
  const hypotheses = collectHypotheses(main.proof);
  const proof = assembleProof(main.proof, {
    sig: parts.sig,
    hypotheses,
    theoryAxioms: parts.theoryAxioms,
    definitions: parts.definitions,
    lemmas: [{ id: 'lemma1', conclusion: lemmaFormula, proofId: 'lemma1' }],
    theorySha256: digest(parts.theory),
    proofDigests: new Map([['lemma1', digest(lemma.bundle.proofs.main)]]),
    rootConclusion: goal,
  });
  const bundle = assembleBundle({ theory: parts.theory, proof, targetId: 'main' });
  bundle.proofs.lemma1 = lemma.bundle.proofs.main;
  const check = runKernel(bundle, 'case12-lemma-main');
  assertPassed(check, goal);
  assert.ok(proof.steps.some((s) => s.rule === 'theorem'), '必须出现 theorem 规则');
  assert.ok(check.dependencies.includes('T:T1'), '依赖应当透传引理用到的理论公理');
  assert.deepEqual(Object.keys(check.open_hypotheses), ['a-holds']);
});

test('⑬ 存在引入 / 存在消去 / 全称消去：∃x.P x ⇒ ∃x.P x 与 ∀x.P x ⇒ ∃x.P x', () => {
  const x = V('x', 'E');
  const parts = kernelTheory({
    id: 'T-ex',
    version: '1',
    bases: ['o', 'E'],
    constants: { P: ['->', 'E', 'o'] },
  });
  const exFormula = Ex(x, B(App(C('P'), x)));

  const reflexive = proveAndCheck({ label: 'case13-ex-reflexive', goal: Imp(exFormula, exFormula), bundleParts: parts });
  assert.equal(reflexive.result.status, 'proved', reflexive.result.reason);
  assertPassed(reflexive.check, Imp(exFormula, exFormula));
  assert.ok(reflexive.proof.steps.some((s) => s.rule === 'ex_e'), '存在式前件必须用 ex_e 收口');

  const fromForall = proveAndCheck({
    label: 'case13-ex-from-forall',
    goal: Imp(All(x, B(App(C('P'), x))), exFormula),
    bundleParts: parts,
  });
  assert.equal(fromForall.result.status, 'proved', fromForall.result.reason);
  assertPassed(fromForall.check, Imp(All(x, B(App(C('P'), x))), exFormula));
  assert.ok(fromForall.proof.steps.some((s) => s.rule === 'ex_i'), '必须出现存在引入');
  assert.ok(fromForall.proof.steps.some((s) => s.rule === 'all_e'), '必须出现全称消去');
});

test('⑭ kernel 口径对拍：既有证书的理论哈希与 H_Sigma 实例能被本层逐字重建', () => {
  const certDir = path.join(REPO, 'mcs-foundations', 'validation', 'certification', 'certificates');
  const definition = JSON.parse(readFileSync(path.join(certDir, 'definition.json'), 'utf8'));
  assert.equal(digest(definition.theory), definition.proofs['identity-definition'].theory_sha256, 'theory 摘要口径必须与 kernel 逐字节一致');

  const group = JSON.parse(readFileSync(path.join(certDir, 'group.json'), 'utf8'));
  const main = group.proofs[group.target];
  assert.equal(digest(group.theory), main.theory_sha256, 'group 理论摘要对不上');
  const sig = { bases: group.theory.bases, constants: group.theory.constants, definitions: [] };
  for (const id of ['s8', 's11', 's26']) {
    const step = main.steps.find((s) => s.id === id);
    assert.ok(step, `group.json 里应当有步骤 ${id}`);
    assert.ok(sameFormula(axiomInstance(step.instance, sig), step.conclusion), `${id} 的 H_Sigma 实例重建不一致`);
  }
  const theoryStep = main.steps.find((s) => s.id === 's18');
  const axiom = group.theory.axioms.find((a) => a.id === 'right_identity');
  assert.equal(digest(axiom.formula), theoryStep.witness, 'theory 步骤的 witness 口径必须一致');
});

test('⑮ evidenceRecord：证据标签与检查状态都用站内词表，且不夸大', () => {
  const hA = V('hA', 'o');
  const hB = V('hB', 'o');
  const parts = kernelTheory({ id: 'T-evidence', version: '1', bases: ['o'], constants: {} });
  const goal = B(hB);
  const program = {
    hypotheses: [
      { id: 'A', formula: B(hA) },
      { id: 'A-imp-B', formula: Imp(B(hA), B(hB)) },
    ],
    clauses: [],
  };
  const { proof, bundle, check } = proveAndCheck({ label: 'case15-evidence', goal, program, bundleParts: parts });
  assertPassed(check, goal);
  const candidate = candidateFrom({
    id: 'cand:evidence', from: { node: 'node:a', version: '1' }, to: { node: 'node:b', version: '1' },
    proof, bundle, check, conditions: conditionsFromHypotheses(check.open_hypotheses),
  });
  const verification = verifyCandidate(candidate, {
    expectedConclusion: goal, nodeVersions: { 'node:a': '1', 'node:b': '1' }, theoryAxioms: [],
  });
  assert.equal(verification.ok, true, JSON.stringify(verification.problems));

  const judgment = judgeCandidate({ goal, proof, check, run: { status: 'completed' }, verification });
  assert.equal(judgment.math.status, 'verified');
  assert.equal(judgment.label, 'PROOF');
  assert.equal(judgment.scope.openHypotheses && Object.keys(judgment.scope.openHypotheses).length, 2);

  const record = evidenceRecord({ ...candidate, judgment }, {});
  assert.ok(EVIDENCE_STATUS.includes(record.status), `证据标签必须在站内词表内：${record.status}`);
  assert.ok(CHECK_STATUS.includes(record.checkStatus), `检查状态必须在站内词表内：${record.checkStatus}`);
  assert.equal(record.kind, 'machine-certificate');
  assert.equal(record.checkerVerified, false, 'kernel 自己没被形式化验证过，不许写成 true');
  assert.equal(record.openAssumptions.length, 2, '开放假设要如实记录在这份证明上');
});

/* ==========================================================================
 * 6. 源码目标入口（task-7 §1）
 *
 * 规格 §4 说的是「goal 或 term 或源码」；判定器（`judges/*.mjs`）传的全是源码字符串，
 * 所以这一层必须自己把源码解析成认证公式，而不是把字符串当对象项去 `B(...)`。
 * ======================================================================== */

/** 源码入口的公共夹具：一个右侧单位元理论（mul / unit + 公理 right_identity）。 */
function sourceEntryFixture() {
  const x = V('x', 'G');
  const parts = kernelTheory({
    id: 'T-source-entry',
    version: '1',
    bases: ['o', 'G'],
    constants: { mul: ['->', 'G', ['->', 'G', 'G']], unit: 'G' },
    axioms: [{ id: 'right_identity', formula: All(x, Eq(ap(C('mul'), x, C('unit')), x)) }],
  });
  return {
    parts,
    axiomSource: '∀(x:G). mul(x, unit) = x',
    goalSource: 'mul(g, unit) = g',
    goalFormula: Eq(ap(C('mul'), V('g', 'G'), C('unit')), V('g', 'G')),
  };
}

test('⑰ 同一目标以「源码字符串」与「已解析公式」两种形态传入，得到同一份证明且都被 kernel 判 passed', () => {
  const { parts, axiomSource, goalSource, goalFormula } = sourceEntryFixture();

  // (a) 源码形态：目标与程序假设都是字符串；自由参数 g 由 options.variables 声明。
  const fromSource = proveAndCheck({
    label: 'case17-source',
    goal: goalSource,
    program: { hypotheses: [{ id: 'right_identity', formula: axiomSource }], clauses: [] },
    bundleParts: parts,
    options: { variables: { g: 'G' } },
  });
  assert.equal(fromSource.result.status, 'proved', fromSource.result.reason);
  assert.equal(fromSource.result.goalSource, goalSource, '源码目标要原样记在结果里，便于回溯');
  assertPassed(fromSource.check, fromSource.result.goal);
  assert.ok(sameFormula(fromSource.result.goal, goalFormula), '解析结果必须与已解析形态逐字一致');
  assert.ok(!JSON.stringify(fromSource.result.goal).includes('"c","g"'), 'options.variables 声明的参数必须是自由变量，不能落成常量');
  assert.deepEqual(Object.keys(fromSource.check.open_hypotheses), ['right_identity']);

  // (b) 已解析形态：同一目标、同一条假设，只是公式树自己给。
  const fromFormula = proveAndCheck({
    label: 'case17-formula',
    goal: goalFormula,
    program: {
      hypotheses: [{ id: 'right_identity', formula: All(V('x', 'G'), Eq(ap(C('mul'), V('x', 'G'), C('unit')), V('x', 'G'))) }],
      clauses: [],
    },
    bundleParts: parts,
  });
  assert.equal(fromFormula.result.status, 'proved', fromFormula.result.reason);
  assertPassed(fromFormula.check, goalFormula);

  // (c) 「同一份证明」：装配出来的证书逐字节相同（步骤数、结论、开放假设自然全同）。
  assert.equal(fromSource.proof.steps.length, fromFormula.proof.steps.length, '两种形态的步骤数必须相同');
  assert.equal(digest(fromSource.proof), digest(fromFormula.proof), '两种形态必须得到同一份证明（内核口径摘要相同）');
  assert.deepEqual(
    Object.keys(fromSource.proof.open_hypotheses),
    Object.keys(fromFormula.proof.open_hypotheses),
    '两种形态的开放假设必须一致',
  );
  assert.equal(digest(fromSource.bundle), digest(fromFormula.bundle), '整份 bundle 也必须相同（含理论哈希与证明摘要）');
  assert.ok(fromSource.proof.steps.some((s) => s.rule === 'all_e'), '这条证明应当走全称消去');
});

test('⑱ 源码入口的口径：类型别名归一、类型环境缺声明报错、解析失败带行列、析取仍报 unsupported', () => {
  const { parts, goalSource } = sourceEntryFixture();

  // (a) 字符串类型走 parseType：ℕ 归一成 N。
  const natParts = kernelTheory({ id: 'T-source-alias', version: '1', bases: ['o', 'N'], constants: {} });
  const alias = proveAndCheck({
    label: 'case18-alias',
    goal: 'n = n',
    bundleParts: natParts,
    options: { variables: { n: 'ℕ' } },
  });
  assert.equal(alias.result.status, 'proved', alias.result.reason);
  assertPassed(alias.check, alias.result.goal);
  assert.ok(sameFormula(alias.result.goal, Eq(V('n', 'N'), V('n', 'N'))), 'ℕ 必须归一成 N');
  assert.ok(alias.proof.steps.some((s) => s.rule === 'refl'));

  // (b) 类型环境：`g = h` 两边都推不出类型 → 必须报错；声明了类型就能解析。
  const undeclared = search('g = h', { hypotheses: [], clauses: [] }, { sig: parts.sig });
  assert.equal(undeclared.status, 'error', undeclared.reason);
  assert.equal(undeclared.proof, null);
  const declared = search('g = h', { hypotheses: [], clauses: [] }, { sig: parts.sig, variables: { g: 'G', h: 'G' } });
  assert.equal(declared.status, 'undecided', `声明了类型就不该再是输入错误：${declared.reason}`);
  assert.ok(sameFormula(declared.goal, Eq(V('g', 'G'), V('h', 'G'))));

  // (c) 解析失败：状态是 error（不是 unsupported），且 reason 里带语言层报的行列位置。
  const broken = search('mul(g, unit) = ', { hypotheses: [], clauses: [] }, { sig: parts.sig, variables: { g: 'G' } });
  assert.equal(broken.status, 'error', broken.reason);
  assert.equal(broken.proof, null);
  assert.match(broken.reason, /第 1 行第 \d+ 列/, `解析失败必须带行列位置：${broken.reason}`);

  // (d) 能力边界照旧：析取没有内核规则，语言层标了 unsupported 就照实透传。
  const disjSig = {
    bases: ['o', 'E'],
    constants: { P: ['->', 'E', 'o'], Q: ['->', 'E', 'o'], a: 'E' },
    definitions: [],
  };
  const disjunction = search('P(a) ∨ Q(a)', { hypotheses: [], clauses: [] }, { sig: disjSig });
  assert.equal(disjunction.status, 'unsupported', disjunction.reason);
  assert.match(disjunction.reason, /析取/);

  // (e) 自由变量与理论常量同名 = 同名不同物，拒绝解析。
  const clash = search(goalSource, { hypotheses: [], clauses: [] }, { sig: parts.sig, variables: { mul: 'G' } });
  assert.equal(clash.status, 'error', clash.reason);
  assert.match(clash.reason, /同名/);

  // (f) 程序条目里的源码写错 → 「程序不合法」，不冒充目标错误。
  const badProgram = search(goalSource, {
    hypotheses: [{ id: 'h', formula: '∀(x:G). mul(x, unit) =' }],
    clauses: [],
  }, { sig: parts.sig, variables: { g: 'G' } });
  assert.equal(badProgram.status, 'error', badProgram.reason);
  assert.match(badProgram.reason, /程序不合法/);
});

/* ==========================================================================
 * 7. 参数化引理闭合（task-7 §2）：让既有四份证书变成可复用的闭引理
 * ======================================================================== */

test('⑲ group.json 的 cayley-evaluation-injective 闭成 ∀g h. equal_left_translations(g,h) ⇒ B(g=h)：kernel passed 且开放假设为空', () => {
  const bundle = loadCertificate('group');
  const sig = certificateSig(bundle);
  const source = bundle.proofs[bundle.target];
  assert.deepEqual(Object.keys(source.open_hypotheses), ['equal_left_translations'], '这份证书带一条开放假设');
  assert.deepEqual(Object.keys(formulaFv(source.conclusion)).sort(), ['g', 'h'], '结论里有两个自由变量');

  const closed = closeCertificate(bundle, { sig, theory: bundle.theory, id: 'group:cayley-evaluation-closed' });
  assert.equal(closed.ok, true, `${closed.reason}：${closed.message}`);
  assert.deepEqual(closed.theorem.openHypotheses, [], '引理必须自报「开放假设为空」');
  assert.deepEqual(closed.proof.open_hypotheses, {}, '证明对象的 open_hypotheses 必须是 {}');
  assert.equal(openHypothesesOf(closed.proof).size, 0, '按 kernel 口径重算，根上不能有开放假设');

  // 结论形态：∀g. ∀h. equal_left_translations(g,h) ⇒ B(g=h)
  const vg = V('g', 'G');
  const vh = V('h', 'G');
  const inner = B(App(App(L('eq', 'G'), vg), vh));
  const expected = All(vg, All(vh, Imp(source.hypotheses.equal_left_translations, inner)));
  assert.ok(sameFormula(closed.conclusion, expected), `闭合后的结论形态不对：${JSON.stringify(closed.conclusion).slice(0, 200)}`);
  assert.equal(closed.conclusion[1][1], 'g', '最外层是全称 g');
  assert.equal(closed.conclusion[2][1][1], 'h', '内层是全称 h');

  // 原有步骤一字不改，只在后面追加：先 imp_i（消开放假设），再 all_i（闭合自由变量）。
  assert.deepEqual(closed.proof.steps.slice(0, source.steps.length), source.steps, '原有步骤必须原样搬运');
  const added = closed.proof.steps.slice(source.steps.length);
  assert.deepEqual(added.map((s) => s.rule), ['imp_i', 'all_i', 'all_i'], '闭合顺序必须是先蕴含化、后量词闭合');
  assert.deepEqual(added[0].premises, [source.root], 'imp_i 接在原证明的根上');
  assert.equal(added[0].discharge, 'equal_left_translations');
  assert.equal(added[2].variable[1], 'g', '最后追加的最外层是 g');
  assert.equal(closed.proof.root, added[2].id, '新的根就是最后追加的那一步');
  assert.equal(source.object_conclusion !== undefined, true, '源证书里有 object_conclusion');
  assert.equal('object_conclusion' in closed.proof, false, '闭合后必须去掉 object_conclusion（否则内核判 final HOL/FOL translation mismatch）');

  // 真 kernel：passed，且重算的开放假设为空。
  const check = runKernel(
    assembleBundle({ theory: bundle.theory, proof: closed.proof }),
    'case19-group-closed',
  );
  assertPassed(check, closed.conclusion);
  assert.deepEqual(check.open_hypotheses, {}, 'kernel 重算的开放假设必须为空（theorem 规则才肯引用它）');
  assert.ok(check.dependencies.includes('T:right_identity'), '依赖要如实透传');

  // 幂等：对已经闭的引理再调一次 → 原样返回。
  const again = closeCertificate({ proof: closed.proof, theory: bundle.theory }, { sig, theory: bundle.theory, id: closed.theorem.id });
  assert.equal(again.ok, true);
  assert.deepEqual(again.notes, ['已是闭引理']);
  assert.equal(again.proof, closed.proof, '原样返回：同一个证明对象，不做多余包装');

  // 变量序：必须是结论自由变量的排列；给了就按它定「谁在最外层」。
  const badOrder = closeCertificate(bundle, { sig, variableOrder: ['g'] });
  assert.equal(badOrder.ok, false);
  assert.equal(badOrder.reason, 'variable-order-mismatch');
  assert.equal('proof' in badOrder, false);
  const badPrefix = closeCertificate(bundle, { sig, boundPrefix: ['zz'] });
  assert.equal(badPrefix.ok, false);
  assert.equal(badPrefix.reason, 'unknown-variable', badPrefix.message);
  const reordered = closeCertificate(bundle, { sig, theory: bundle.theory, variableOrder: ['h', 'g'], id: 'group:cayley-reordered' });
  assert.equal(reordered.ok, true, `${reordered.reason}：${reordered.message}`);
  assert.equal(reordered.conclusion[1][1], 'h', 'variableOrder 的第一个是最外层的量词');
  assertPassed(
    runKernel(assembleBundle({ theory: bundle.theory, proof: reordered.proof }), 'case19-group-reordered'),
    reordered.conclusion,
  );
});

test('⑳ 四份既有证书逐一闭合（真 kernel 判定）+ limit 的幂等分支', () => {
  // 实测形状：每份证书的开放假设数与结论自由变量数（这些数字由证书本身决定，不是约定）。
  const shapes = {
    group: { open: 1, free: 2 },
    manifold: { open: 1, free: 1 },
    tensor: { open: 1, free: 4 },
    limit: { open: 0, free: 2 },
  };
  for (const [name, want] of Object.entries(shapes)) {
    const bundle = loadCertificate(name);
    const sig = certificateSig(bundle);
    const source = bundle.proofs[bundle.target];
    assert.equal(Object.keys(source.open_hypotheses).length, want.open, `${name} 的开放假设数`);
    assert.equal(Object.keys(formulaFv(source.conclusion)).length, want.free, `${name} 的结论自由变量数`);

    const closed = closeCertificate(bundle, { sig, theory: bundle.theory, id: `${name}:closed` });
    assert.equal(closed.ok, true, `${name} 未闭成：${closed.reason}｜${closed.message}`);
    assert.deepEqual(closed.proof.open_hypotheses, {}, `${name} 闭合后开放假设必须为空`);
    assert.equal(openHypothesesOf(closed.proof).size, 0, `${name} 按 kernel 口径重算也不能有开放假设`);

    const check = runKernel(assembleBundle({ theory: bundle.theory, proof: closed.proof }), `case20-${name}-closed`);
    assertPassed(check, closed.conclusion);
    assert.deepEqual(check.open_hypotheses, {}, `${name}：kernel 重算的开放假设必须为空`);
  }

  /*
   * limit 的 `constant-sequence-value`：**开放假设为空，但结论里有自由变量 a、n**。
   * 所以它走的不是「已是闭引理」这条分支，而是量词闭合（`∀a. ∀n. …`）；
   * 幂等分支要用**闭合后的结果**再调一次来验——这里如实照做，不为了让某条断言变绿
   * 就把「有自由变量」当成「已经闭」。
   */
  const limitBundle = loadCertificate('limit');
  const limitSig = certificateSig(limitBundle);
  const limitSource = limitBundle.proofs[limitBundle.target];
  assert.deepEqual(Object.keys(limitSource.open_hypotheses), [], 'limit 这份证书本来就没有开放假设');
  assert.deepEqual(Object.keys(formulaFv(limitSource.conclusion)).sort(), ['a', 'n'], '但它有自由变量 a、n');

  const limitClosed = closeCertificate(limitBundle, { sig: limitSig, theory: limitBundle.theory, id: 'limit:constant-sequence-value-closed' });
  assert.equal(limitClosed.ok, true, `${limitClosed.reason}：${limitClosed.message}`);
  assert.equal(limitClosed.proof.steps.length, limitSource.steps.length + 2, '自由变量 a、n 各加一步 all_i');
  assert.deepEqual(limitClosed.proof.steps.slice(-2).map((s) => s.rule), ['all_i', 'all_i']);
  assert.equal(limitClosed.conclusion[0], 'all', '闭合后的结论必须是全称公式');
  assert.ok(limitClosed.notes.some((note) => note.includes('all_i')), 'notes 里要写清做了什么');
  assertPassed(
    runKernel(assembleBundle({ theory: limitBundle.theory, proof: limitClosed.proof }), 'case20-limit-closed'),
    limitClosed.conclusion,
  );

  // 幂等分支：已经闭了（无自由变量、无开放假设）→ 原样返回 + 固定的一句 notes。
  const idempotent = closeCertificate(
    { proof: limitClosed.proof, theory: limitBundle.theory },
    { sig: limitSig, theory: limitBundle.theory, id: 'limit:constant-sequence-value-closed' },
  );
  assert.equal(idempotent.ok, true);
  assert.deepEqual(idempotent.notes, ['已是闭引理']);
  assert.equal(idempotent.proof, limitClosed.proof, '原样返回：同一个证明对象');
  assert.equal(idempotent.theorem.openHypotheses.length, 0);
  assert.ok(sameFormula(idempotent.theorem.conclusion, limitClosed.conclusion));
});

test('㉑ 本征变量落进消不掉的开放假设 → 如实报 eigenvariable-conflict；硬造的那份内核确实会拒', () => {
  const x = V('x', 'E');
  const parts = kernelTheory({ id: 'T-eigen', version: '1', bases: ['o', 'E'], constants: { P: ['->', 'E', 'o'] } });
  const holdsX = B(App(C('P'), x));
  const built = proveAndCheck({
    label: 'case21-open-hyp',
    goal: holdsX, // 目标就是这条假设本身：assume 叶子直接成立
    program: { hypotheses: [{ id: 'holds-x', formula: holdsX }], clauses: [] },
    bundleParts: parts,
  });
  assert.equal(built.result.status, 'proved', built.result.reason);
  assertPassed(built.check, holdsX);
  assert.deepEqual(Object.keys(built.check.open_hypotheses), ['holds-x']);
  assert.deepEqual(Object.keys(formulaFv(built.proof.conclusion)), ['x'], '结论里有自由变量 x');

  // (a) ctx.hypotheses 是权威表：表里没有这条假设的公式 → imp_i 造不出来 → 它只能保持开放。
  //     此时要量化的 x 正好落在它里面 —— 内核的 all_i 条件必然不成立，如实拒绝。
  const refused = closeCertificate(built.bundle, {
    sig: parts.sig, theory: parts.theory, hypotheses: new Map(), id: 'eigen:closed',
  });
  assert.equal(refused.ok, false);
  assert.equal(refused.reason, 'eigenvariable-conflict');
  assert.equal(refused.offender.variable, 'x');
  assert.equal(refused.offender.hypothesis, 'holds-x');
  assert.equal('proof' in refused, false, '拒绝时不得给出任何证书');
  assert.match(refused.message, /eigenvariable/, refused.message);

  // (b) 「先 all_i 后 imp_i」硬造出来的那份，真 kernel 直接拒 —— 这就是不硬造的理由。
  const badProof = {
    checker: KERNEL_VERSION,
    theory_sha256: digest(parts.theory),
    hypotheses: { 'holds-x': holdsX },
    steps: [
      { id: 's0', rule: 'assume', conclusion: holdsX, premises: [], hypothesis: 'holds-x' },
      { id: 's1', rule: 'all_i', conclusion: All(x, holdsX), premises: ['s0'], variable: x },
    ],
    root: 's1',
    conclusion: All(x, holdsX),
    open_hypotheses: { 'holds-x': holdsX },
  };
  const badCheck = runKernel({ format: KERNEL_VERSION, theory: parts.theory, proofs: { main: badProof }, target: 'main' }, 'case21-bad-order');
  assert.equal(badCheck.status, 'failed', JSON.stringify(badCheck).slice(0, 300));
  assert.match(String(badCheck.message), /eigenvariable leaks into open assumptions/);

  // (c) 把公式交出来 → 同一份证书闭成 ∀x. P(x) ⇒ P(x)，kernel passed、开放假设为空。
  const closed = closeCertificate(built.bundle, {
    sig: parts.sig, theory: parts.theory, hypotheses: new Map([['holds-x', holdsX]]), id: 'eigen:closed',
  });
  assert.equal(closed.ok, true, `${closed.reason}：${closed.message}`);
  assert.ok(sameFormula(closed.conclusion, All(x, Imp(holdsX, holdsX))), JSON.stringify(closed.conclusion));
  const check = runKernel(assembleBundle({ theory: parts.theory, proof: closed.proof }), 'case21-good-order');
  assertPassed(check, closed.conclusion);
  assert.deepEqual(check.open_hypotheses, {});
});

test('㉒ 闭合后的引理能被 theorem 规则引用 + all_e 实例化；未闭合的那份内核拒收', () => {
  const groupBundle = loadCertificate('group');
  const theory = groupBundle.theory;
  const sig = certificateSig(groupBundle);
  const source = groupBundle.proofs[groupBundle.target];
  const closed = closeCertificate(groupBundle, { sig, theory, id: 'group:cayley-evaluation-closed' });
  assert.equal(closed.ok, true, `${closed.reason}：${closed.message}`);

  // (a) 未闭合的源证书：theorem 规则拒收（开放假设非空）——这正是要闭合的理由。
  const rawRef = assembleProof(lemmaNode('raw-cayley', source.conclusion), {
    sig,
    hypotheses: new Map(),
    theoryAxioms: [],
    definitions: new Map(),
    lemmas: [{ id: 'raw-cayley', conclusion: source.conclusion, proofId: 'raw-cayley' }],
    theorySha256: digest(theory),
    proofDigests: new Map([['raw-cayley', digest(source)]]),
    rootConclusion: source.conclusion,
  });
  const rawBundle = assembleBundle({ theory, proof: rawRef, targetId: 'main' });
  rawBundle.proofs['raw-cayley'] = source;
  const rawCheck = runKernel(rawBundle, 'case22-raw-reference');
  assert.equal(rawCheck.status, 'failed', JSON.stringify(rawCheck).slice(0, 300));
  assert.match(String(rawCheck.message), /open assumptions/);

  // (b) 闭合后的引理：theorem 引用 + all_e 两次（g、h 都取 unit）+ imp_e 用掉假设。
  const unit = C('unit');
  const installed = fsub(fsub(source.hypotheses.equal_left_translations, V('g', 'G'), unit), V('h', 'G'), unit);
  const root = impElim(
    allElim(allElim(lemmaNode(closed.theorem.proofId, closed.theorem.conclusion), unit), unit),
    hypothesisNode('translations-at-unit', installed),
  );
  const mainProof = assembleProof(root, {
    sig,
    hypotheses: new Map([['translations-at-unit', installed]]),
    theoryAxioms: [],
    definitions: new Map(),
    lemmas: [lemmaEntry(closed)],
    theorySha256: digest(theory),
    proofDigests: new Map([[closed.theorem.proofId, digest(closed.proof)]]),
    rootConclusion: root.goal,
  });
  assert.ok(mainProof.steps.some((s) => s.rule === 'theorem'), '必须走 theorem 规则引用引理');
  assert.ok(mainProof.steps.some((s) => s.rule === 'all_e'), '必须走全称消去实例化');
  assert.equal(mainProof.steps.filter((s) => s.rule === 'theorem').length, 1);

  const bundle = assembleBundle({ theory, proof: mainProof, targetId: 'main' });
  bundle.proofs[closed.theorem.proofId] = closed.proof;
  const check = runKernel(bundle, 'case22-lemma-reference');
  assertPassed(check, root.goal);
  assert.deepEqual(Object.keys(check.open_hypotheses), ['translations-at-unit']);
  assert.ok(
    check.dependencies.includes('T:right_identity'),
    `引理用到的理论成员要透传成主证明的依赖：${JSON.stringify(check.dependencies)}`,
  );

  // 引理与主证明必须挂在同一个理论上：`theorem` 步骤会核对 theory_sha256。
  assert.equal(bundle.proofs[closed.theorem.proofId].theory_sha256, digest(theory));
  assert.equal(bundle.proofs[bundle.target].theory_sha256, digest(theory));
  // kernel 在判 target 之前会遍历并重放 bundle 里的每一份证明，所以这次 passed
  // 同时说明闭合引理自己那份也能在同一个 bundle 里被重放。
});

test('㉓ 签名口径：解析层签名 / formalSpec 形状被拦下并给出可读错误（不是 sorted app mismatch）', () => {
  // 解析层签名：类型是源码文本（`backgrounds.backgroundSignature` 的形状）。
  const parsedSig = { bases: ['o', 'G'], constants: { mul: 'G -> G -> G', unit: 'G' } };
  assert.throws(
    () => formulaOk(Eq(C('unit'), C('unit')), parsedSig),
    (error) => {
      assert.equal(error.name, 'FormalError');
      assert.match(error.message, /源码文本/);
      assert.match(error.message, /signatureOfTheory/);
      return true;
    },
  );

  // formalSpec（归一后的 spec）不是 sig：也要指名道姓，而不是 TypeError。
  assert.throws(
    () => formulaOk(Eq(C('unit'), C('unit')), { specVersion: 'mcs-formal/1', declarations: [], statement: {} }),
    (error) => {
      assert.match(error.message, /formalSpec/);
      return true;
    },
  );

  // 形状已经对了的 sig 原样返回同一个对象：装配器「边推断边登记定义」靠这条。
  const good = { bases: ['o', 'G'], constants: { unit: 'G' }, definitions: [] };
  assert.equal(ensureSig(good), good);
  const built = kernelTheory({
    id: 'T-sig-shape', version: '1', bases: ['o', 'G'], constants: { unit: 'G' },
    definitions: [{ name: 'same', term: ['lam', 'G', ['b', 0, 'G']] }],
  });
  const sig = signatureOfTheory(built.theory);
  assert.ok(sig.constants.same, '定义名必须能当常量用（kernel 是在 environment() 里逐个加进去的）');
  assert.equal(sig.definitions.length, 1);
  formulaOk(Eq(C('same'), C('same')), sig);
});

test('㉔ 概念细化目标：abelian_group(mm)(ee) ⇒ group_concept(mm)(ee) 一次定义展开 + 合取消去', () => {
  const funcType = ['->', 'G', ['->', 'G', 'G']];
  const predType = ['->', funcType, ['->', 'G', 'o']];
  const m = V('m', funcType);
  const e = V('e', 'G');
  const a = V('a', 'G');
  const abelianOf = (mm, ee) => B(App(App(C('abelian_group'), mm), ee));
  const conceptOf = (mm, ee) => B(App(App(C('group_concept'), mm), ee));
  // 定义性公理：abelian_group ≜ group_concept ∧ （右单位这一条就够了）
  const expansion = All(m, All(e, Iff(
    abelianOf(m, e),
    And(conceptOf(m, e), All(a, Eq(App(App(m, a), C('unit')), a))),
  )));
  const parts = kernelTheory({
    id: 'T-concept-refine',
    version: '1',
    bases: ['o', 'G'],
    constants: { mul: funcType, unit: 'G', group_concept: predType, abelian_group: predType },
    axioms: [{ id: 'abelian-expansion', formula: expansion }],
  });
  const goal = All(m, All(e, Imp(abelianOf(m, e), conceptOf(m, e))));
  const program = {
    hypotheses: [],
    clauses: [{ id: 'abelian-expansion', kind: 'axiom', theoryAxiomId: 'abelian-expansion', formula: expansion }],
  };
  const { result, proof, check } = proveAndCheck({ label: 'case23-concept-refine', goal, program, bundleParts: parts });
  assert.equal(result.status, 'proved', result.reason);
  assertPassed(check, goal);
  assert.deepEqual(check.open_hypotheses, {});
  assert.ok(proof.steps.some((s) => s.rule === 'theory' && s.axiom === 'abelian-expansion'), '定义性公理要走 theory 规则');
  assert.ok(check.dependencies.includes('T:abelian-expansion'), '依赖要如实记录用到的有限理论成员');
  assert.ok(proof.steps.some((s) => s.rule === 'and_l'), '合取消去拿到 group_concept');
  assert.ok(proof.steps.filter((s) => s.rule === 'all_i').length === 2, '两重量化目标各要一次全称引入');
});

/* ==========================================================================
 * 9. 定子句化：蕴含前件里的量词（task-8）
 *
 * 为什么单开一节：定义性公理（`data/formal/backgrounds.mjs`）都是
 * `∀params. 谓词 ⇔ 展开` 形状，而 §1.3 把 `⇔` 展开成两个蕴含——**必有一条蕴含的
 * 前件是量词公式**。这一节盯的就是那个位置：不许崩、不许丢量词、不许静默弱化。
 * ======================================================================== */

/** task-8 最小复现的两条源码（只在「量词在前件还是后件」上不同）。 */
const CLAUSE_OK_SOURCE = '∀(mm)(ee)(ii). (abelian_group(mm)(ee)(ii) ⇒ ∀(a0)(b0). mm(a0)(b0) = mm(b0)(a0))';
const CLAUSE_FAIL_SOURCE = '∀(mm)(ee)(ii). ((∀(a0)(b0). mm(a0)(b0) = mm(b0)(a0)) ⇒ abelian_group(mm)(ee)(ii))';

const CLAUSE_FUNC_TYPE = ['->', 'G', ['->', 'G', 'G']];
const CLAUSE_INV_TYPE = ['->', 'G', 'G'];
const CLAUSE_PRED_TYPE = ['->', CLAUSE_FUNC_TYPE, ['->', 'G', ['->', CLAUSE_INV_TYPE, 'o']]];

/** 最小复现的夹具：只声明两个谓词，绑定的 mm/ee/ii 由语言层按用法推类型。 */
function clauseQuantifierFixture() {
  const constants = { abelian_group: CLAUSE_PRED_TYPE, group_concept: CLAUSE_PRED_TYPE };
  const sig = { bases: ['o', 'G'], constants, definitions: [] };
  const parse = (source) => parseFormula(source, { bases: sig.bases, constants, definitions: [] });
  return { constants, sig, parse };
}

test('㉕ 定子句化：蕴含前件含全称量词不再崩、量词留在原子上（task-8 最小复现 FAIL 那条）', () => {
  const { sig, parse } = clauseQuantifierFixture();
  const failFormula = parse(CLAUSE_FAIL_SOURCE);

  // 修前这里抛 TypeError「Cannot convert undefined or null to object」：
  // `factOf` 的 imp 分支把**子句上下文**当 sig 传给了 `goalAtoms`，
  // 于是 `goalOf` 的 all/ex 分支去读 `ctx.sig.constants` 时拿到 undefined。
  const out = clausifyFormula(failFormula, sig, { role: 'fact' });
  assert.equal(out.clauses.length, 1, '一条蕴含 ⇒ 一条子句');
  assert.equal(out.clauses[0].head.pred[1], 'holds', 'head 是 B(abelian_group(…))');
  const clause = out.clauses[0];
  assert.equal(clause.body.length, 1, '前件是一个量词公式：body 里必须正好有一条待证原子');
  const atom = clause.body[0];
  assert.equal(atom.kind, 'pred', '§2.7 的原子骨干仍是「谓词应用」');
  assert.deepEqual(
    (atom.quant ?? []).map((binder) => binder.role),
    ['eigen', 'eigen'],
    '`∀a0 ∀b0` 两层都要记进量词前缀（外 → 内），走的正是 all_i 那条路',
  );

  const mm = V('mm', CLAUSE_FUNC_TYPE);
  const a0 = V('a0', 'G');
  const b0 = V('b0', 'G');
  // 外层的 `∀mm` 在子句层是**元变量**（§2.7：fact 侧 ∀ = 自由元变量），所以原子里的
  // 谓词位置就是那个元变量；`clauseToFormula` 之后它才落成全称绑定变量。
  const meta = clause.vars.find((variable) => JSON.stringify(variable[2]) === JSON.stringify(CLAUSE_FUNC_TYPE));
  assert.ok(meta, '子句变量里必须有 mm 的元变量');
  const quantified = atomToFormula(atom);
  const expectedAtom = All(a0, All(b0, Eq(ap(meta, a0, b0), ap(meta, b0, a0))));
  assert.ok(
    sameFormula(quantified, expectedAtom),
    `前件原子必须还原成「∀a0 ∀b0. mm(a0)(b0) = mm(b0)(a0)」：${JSON.stringify(quantified).slice(0, 220)}`,
  );

  // 整条子句还原回公式：与原文 α 等价，且**闭**——这就是「没被静默弱化」的判据。
  const rebuilt = clauseToFormula(clause);
  assert.equal(rebuilt[0], 'all', '还原结果仍是全称公式');
  assert.ok(sameFormula(rebuilt, failFormula), `还原必须与原文 α 等价：${JSON.stringify(rebuilt).slice(0, 240)}`);
  assert.deepEqual(Object.keys(formulaFv(rebuilt)), [], '还原出来有自由变量 = 公理少了前提');

  // 「前提被弱化」的版本（交换律只在一个自由变量对上要求成立）必须被排除。
  const weakened = close([mm, V('ee', 'G'), V('ii', CLAUSE_INV_TYPE)], Imp(
    Eq(ap(mm, V('e0', 'G'), V('e1', 'G')), ap(mm, V('e1', 'G'), V('e0', 'G'))),
    B(ap(C('abelian_group'), mm, V('ee', 'G'), V('ii', CLAUSE_INV_TYPE))),
  ));
  assert.ok(!sameFormula(rebuilt, weakened), '自由变量版本 = 前提被弱化，绝不能是还原结果');

  // 子句化必须用**真正的** sig：本征变量要避开已声明常量名。
  // 修前常量表是空的（错误 sig 被 ensureSig 归一成空签名），第一个本征变量恒为 e0。
  const shadowSig = { bases: ['o', 'G'], constants: { ...clauseQuantifierFixture().constants, e0: 'G', e1: 'G', e2: 'G' }, definitions: [] };
  const shadowAtom = clausifyFormula(parse(CLAUSE_FAIL_SOURCE), shadowSig, { role: 'fact' }).clauses[0].body[0];
  const eigenNames = (shadowAtom.quant ?? []).map((binder) => binder.var[1]);
  assert.deepEqual(eigenNames, ['e3', 'e4'], `本征变量不能撞上常量名 e0/e1/e2：${eigenNames.join(',')}`);

  // 后件含量词的那条（OK）照旧：一条子句、head 拿子句变量、body 只有 holds。
  const okFormula = parse(CLAUSE_OK_SOURCE);
  const okOut = clausifyFormula(okFormula, sig, { role: 'fact' });
  assert.equal(okOut.clauses.length, 1);
  assert.equal(okOut.clauses[0].body.length, 1);
  assert.equal(okOut.clauses[0].vars.length, 5, 'mm/ee/ii 与后件的 a0/b0 都是子句变量（fact 侧 ∀ = 自由元变量）');
  const ee = V('ee', 'G');
  const ii = V('ii', CLAUSE_INV_TYPE);
  const pulled = close(
    [mm, ee, ii, a0, b0],
    Imp(B(ap(C('abelian_group'), mm, ee, ii)), Eq(ap(mm, a0, b0), ap(mm, b0, a0))),
  );
  assert.ok(
    sameFormula(clauseToFormula(okOut.clauses[0]), pulled),
    `后件含量词那条的还原应当等价于把后件量词提到最外层：${JSON.stringify(clauseToFormula(okOut.clauses[0])).slice(0, 240)}`,
  );
});

test('㉖ 六条定义性公理逐条定子句化：每条子句还原成闭公式；阿贝尔那一支与显式期望 α 等价', async () => {
  const input = await kernelInputForBackground('bg:group/1');
  assert.ok(input, '需要语言层可用：kernelInputForBackground 才能给出 bg:group/1 的输入');
  assert.equal(input.axioms.length, 6, 'bg:group/1 是「三载体 × (概念/阿贝尔)」六条定义性公理');
  const built = kernelTheory(buildKernelTheory(input.specs, { background: input.background, axioms: input.axioms }));
  const { sig } = built;

  let clauseCount = 0;
  for (const axiom of built.theoryAxioms) {
    const result = clausifyFormula(axiom.formula, sig, { role: 'fact' });
    assert.ok(result.clauses.length > 0, `${axiom.id} 应当能进子句程序`);
    for (const clause of result.clauses) {
      clauseCount += 1;
      const restored = clauseToFormula(clause);
      assert.deepEqual(
        Object.keys(formulaFv(restored)),
        [],
        `${axiom.id} 有一条子句还原出自由变量（前提被弱化）：${JSON.stringify(restored).slice(0, 200)}`,
      );
    }
  }
  // 概念展开：⇔ 的两支各自把三个合取支拆开 → 3 + 3；阿贝尔展开：2 + 1。三载体共 27。
  assert.equal(clauseCount, 3 * (6 + 3), '六条公理拆出来的子句总数');

  const abelian = built.theoryAxioms.find((axiom) => axiom.id === 'bg-abelian-group-expansion');
  const key = clausifyFormula(abelian.formula, sig, { role: 'fact' }).clauses
    .find((clause) => clause.body.length === 2 && clause.body.some((atom) => (atom.quant ?? []).length === 2));
  assert.ok(key, '阿贝尔公理里必有一条「两个前提、其中一个带两层量词」的子句');

  const mm = V('mm', CLAUSE_FUNC_TYPE);
  const ee = V('ee', 'G');
  const ii = V('ii', CLAUSE_INV_TYPE);
  const a0 = V('a0', 'G');
  const b0 = V('b0', 'G');
  // `clauseToFormula` 把 body 折成**右嵌套蕴含**（`a ⇒ (b ⇒ 头)`，与 `a ∧ b ⇒ 头` 等价），
  // 所以期望式按同一形状写：量词原子在里层，`∀a b` 原样保留。
  const expected = close([mm, ee, ii], Imp(
    B(ap(C('group_concept'), mm, ee, ii)),
    Imp(All(a0, All(b0, Eq(ap(mm, a0, b0), ap(mm, b0, a0)))), B(ap(C('abelian_group'), mm, ee, ii))),
  ));
  const restoredKey = clauseToFormula(key);
  assert.ok(sameFormula(restoredKey, expected), `关键子句还原错了：${JSON.stringify(restoredKey).slice(0, 300)}`);
  // 弱化版（把 ∀a b 换成两个自由变量）与它不是同一条子句：形状相同，只差量词。
  const weakenedKey = close([mm, ee, ii], Imp(
    B(ap(C('group_concept'), mm, ee, ii)),
    Imp(
      Eq(ap(mm, V('e0', 'G'), V('e1', 'G')), ap(mm, V('e1', 'G'), V('e0', 'G'))),
      B(ap(C('abelian_group'), mm, ee, ii)),
    ),
  ));
  assert.ok(!sameFormula(restoredKey, weakenedKey), '弱化版不是同一条子句');
});

test('㉗ 超出定子句片段的形状如实 unsupported 并写明形状（绝不静默丢掉 body 原子）', () => {
  const { sig, parse } = clauseQuantifierFixture();
  const mm = V('mm', CLAUSE_FUNC_TYPE);
  const ee = V('ee', 'G');
  const ii = V('ii', CLAUSE_INV_TYPE);
  const abelianOf = (m, e, i) => B(ap(C('abelian_group'), m, e, i));

  /*
   * 析取这条用 **AST 直接构造**：语言层在解析期就拒收 `∨`（§0：内核没有 or_i / or_e，
   * 见 ⑱(d) 的 `P(a) ∨ Q(a)`），所以源码写法根本到不了这一层；
   * 但「子句化遇到 or 该怎么办」仍要有明确口径，这里就按 AST 口径验。
   */
  const disjunction = All(mm, All(ee, All(ii, Imp(
    Or(abelianOf(mm, ee, ii), B(ap(C('group_concept'), mm, ee, ii))),
    abelianOf(mm, ee, ii),
  ))));

  const cases = [
    { name: '前件是析取', formula: disjunction, pattern: /析取/ },
    {
      name: '待证子目标的前件里出现蕴含',
      formula: parse('∀(mm:G -> G -> G)(ee:G)(ii:G -> G). (∀(a0:G). (mm(a0)(ee) = a0 ⇒ mm(ee)(a0) = a0)) ⇒ abelian_group(mm)(ee)(ii)'),
      pattern: /蕴含/,
    },
    {
      name: '存在量词体是合取',
      formula: parse('∀(mm:G -> G -> G)(ee:G)(ii:G -> G). (∃(z0:G). (mm(z0)(ee) = ee ∧ mm(ee)(z0) = ee)) ⇒ abelian_group(mm)(ee)(ii)'),
      pattern: /存在量词/,
    },
  ];
  for (const item of cases) {
    let thrown = null;
    try {
      clausifyFormula(item.formula, sig, { role: 'fact' });
    } catch (error) {
      thrown = error;
    }
    assert.ok(thrown, `${item.name}：必须报错，不能静默通过（静默 = 公理少了前提）`);
    assert.equal(thrown.status, 'unsupported', `${item.name}：这是能力之外（unsupported），不是输入错误`);
    assert.match(thrown.message, item.pattern, `${item.name}：错误信息要写清是哪种形状`);
  }

  // 合法的 ∃ 前件照常带 ∃ 前缀（§2.7：goal 侧 ∃ 用元变量，见证在还原时才落成绑定名）。
  const exOut = clausifyFormula(
    parse('∀(mm:G -> G -> G)(ee:G)(ii:G -> G). (∃(z0:G). mm(z0)(ee) = ee) ⇒ abelian_group(mm)(ee)(ii)'),
    sig,
    { role: 'fact' },
  );
  const exAtom = exOut.clauses[0].body[0];
  assert.deepEqual((exAtom.quant ?? []).map((binder) => binder.role), ['meta']);
  assert.equal(atomToFormula(exAtom)[0], 'ex', '∃ 前件必须还原成存在量词，而不是自由元变量');
  assert.deepEqual(Object.keys(formulaFv(clauseToFormula(exOut.clauses[0]))), [], '带 ∃ 前件的子句同样是闭公式');

  // 集成口径：把这种公理当程序假设喂给 search → unsupported（不是 error，更不是 proved）。
  const goalSource = '∀(mm:G -> G -> G)(ee:G)(ii:G -> G). abelian_group(mm)(ee)(ii) ⇒ group_concept(mm)(ee)(ii)';
  const result = search(goalSource, { hypotheses: [{ id: 'bad-axiom', formula: disjunction }], clauses: [] }, { sig });
  assert.equal(result.status, 'unsupported', result.reason);
  assert.equal(result.proof, null, '不支持就不许给出证书');
  assert.match(result.reason, /析取/);
});

test('㉘ toProgram 往返：子句层元变量被 ∀ 收口，atoms-only 条目真能推出证书（kernel passed）', () => {
  const x = V('x', 'E');
  const parts = kernelTheory({
    id: 'T-atoms-quant',
    version: '1',
    bases: ['o', 'E'],
    constants: { P: ['->', 'E', 'o'], Q: ['->', 'E', 'o'], a: 'E' },
  });
  const axiom = All(x, Imp(B(App(C('P'), x)), B(App(C('Q'), x))));
  const clauses = clausifyFormula(axiom, parts.sig, { role: 'fact' }).clauses;
  assert.equal(clauses.length, 1);
  assert.equal(clauses[0].vars.length, 1, '同一条子句变量同时出现在 head 与 body（Horn 形状）');

  // 子句层元变量直接拼成公式会被 formulaOk 拒（`['?',…]` 不是认证项）：
  // 所以「子句 → 程序条目」必须由 clauses.mjs 的显式转换负责把元变量收口（§8.5.1 第 2 条）。
  const naive = Imp(atomToFormula(clauses[0].body[0]), atomToFormula(clauses[0].head));
  assert.throws(() => formulaOk(naive, parts.sig), /confusion|not supported|unsupported/);

  const program = toProgram(clauses, { defaultKind: 'hypothesis' });
  assert.equal(program.clauses.length, 1);
  assert.equal(program.clauses[0].kind, 'hypothesis');
  assert.equal(program.clauses[0].formula, undefined, 'atoms-only 条目：还原交给 search#formulaFromAtoms');
  assert.equal(program.clauses[0].atoms.length, 2, '§2.8 的 atoms = [头, …体]');

  const goal = B(App(C('Q'), C('a')));
  const { result, proof, check } = proveAndCheck({
    label: 'case28-atoms-quant',
    goal,
    program: { hypotheses: [{ id: 'p-a', formula: B(App(C('P'), C('a'))) }], clauses: program.clauses },
    bundleParts: parts,
  });
  assert.equal(result.status, 'proved', `atoms-only 条目没被用起来：${result.reason}`);
  assertPassed(check, goal);
  assert.ok(proof.steps.some((s) => s.rule === 'assume' && s.hypothesis === 'c1'), 'atoms 条目应当成为一条假设');
  assert.ok(proof.steps.some((s) => s.rule === 'all_e'), '全称假设要靠全称消去实例化到 a');
  assert.deepEqual(Object.keys(check.open_hypotheses).sort(), ['c1', 'p-a']);
});

/*
 * ==== 事故恢复标记（2026-10-04）====
 * 本文件尾部曾被误截断（回滚时把 `Measure-Object -Line` 的计数当成 `Get-Content` 的行号）：
 * ㉗ 的后半段、㉘、以及原编号 ㉚ 一度丢失。
 * - ㉗ 的收尾与 ㉘：由原作者 clause-fix 按 task-8 交付原文**逐字贴回**，未改写；
 * - ㉙：由 proof-engine 逐字贴回（已在本文件中）；
 * - 下面这条在原交付里编号 **㉚**，因 task-12 的 ㉚/㉛ 已占用该编号，这里改记为 **㉘′**
 *   （沿用本文件 `③′` 的记号），**正文逐字未改**，位置仍是原位置（㉘ 之后、㉙ 之前）。
 */

test('㉘′ atoms-only 条目 + 带量词的 body 原子：从 ∀a b 交换律推出 abelian_group（真 kernel passed）', () => {
  const { sig: fixtureSig, parse } = clauseQuantifierFixture();
  const parts = kernelTheory({
    id: 'T-quant-body',
    version: '1',
    bases: [...fixtureSig.bases],
    constants: { ...fixtureSig.constants },
  });
  const clauses = clausifyFormula(parse(CLAUSE_FAIL_SOURCE), parts.sig, { role: 'fact' }).clauses;
  assert.equal(clauses.length, 1);
  // 程序条目**只带 atoms**（不写 formula）：还原全靠 clauses.mjs 的显式转换，
  // body 里那条 `∀a b. …` 的量词必须一路活到 search 登记的那条假设里。
  const program = toProgram(clauses, { defaultKind: 'hypothesis' });
  assert.equal(program.clauses[0].formula, undefined);

  const mm = V('mm', CLAUSE_FUNC_TYPE);
  const ee = V('ee', 'G');
  const ii = V('ii', CLAUSE_INV_TYPE);
  const a0 = V('a0', 'G');
  const b0 = V('b0', 'G');
  const goal = B(ap(C('abelian_group'), mm, ee, ii));
  const commutativity = All(a0, All(b0, Eq(ap(mm, a0, b0), ap(mm, b0, a0))));
  const { result, proof, check } = proveAndCheck({
    label: 'case30-quant-body-atoms',
    goal,
    program: { hypotheses: [{ id: 'comm', formula: commutativity }], clauses: program.clauses },
    bundleParts: parts,
  });
  assert.equal(result.status, 'proved', `带量词 body 的 atoms 条目没被用起来：${result.reason}`);
  assertPassed(check, goal);
  assert.ok(proof.steps.some((s) => s.rule === 'assume' && s.hypothesis === 'c1'), 'atoms 条目应当成为一条假设');
  assert.ok(proof.steps.filter((s) => s.rule === 'all_e').length >= 3, '三个子句变量都要实例化到 mm/ee/ii');
  assert.deepEqual(Object.keys(check.open_hypotheses).sort(), ['c1', 'comm']);
});

test('㉙ 四案例关键目标「阿贝尔群 ⇒ 群」由 6 条定义性公理真证出来（真 kernel passed）', async () => {
  const input = await kernelInputForBackground('bg:group/1');
  assert.ok(input, '需要语言层可用');
  const built = kernelTheory(buildKernelTheory(input.specs, { background: input.background, axioms: input.axioms }));
  assert.equal(built.theoryAxioms.length, 6);

  // 两条 spec（group:group-concept / concept:group:abelian）的声明一致性由
  // `kernelInputForBackground` 的归一 spec + 本文件的 options.variables 之外的目标源码承担：
  // 目标里的 mul0/e0/inv0 都是**绑定量词变量**（带类型标注），不需要额外声明。
  const goalSource = '∀(mul0:G -> G -> G)(e0:G)(inv0:G -> G). abelian_group(mul0)(e0)(inv0) ⇒ group_concept(mul0)(e0)(inv0)';
  const program = {
    hypotheses: [],
    clauses: built.theoryAxioms.map((axiom) => ({
      id: `axiom:${axiom.id}`, kind: 'axiom', formula: axiom.formula, theoryAxiomId: axiom.id,
    })),
  };

  /*
   * 预算说明（如实记录，不放宽断言）：这条目标实测要 ~1.8×10⁴ 状态、约 9–11 秒，
   * 而 §3 的默认单候选预算是 2000 ms / 10000 状态 —— 用默认预算会得到 `timeout`。
   * 这里给足预算来判「命题到底能不能证」，并把实测数字打出来；
   * 默认预算下发现运行会报 timeout 这件事另行上报，不用放宽断言来掩盖。
   */
  const started = Date.now();
  const { result, proof, check } = proveAndCheck({
    label: 'case29-group-abelian',
    goal: goalSource,
    program,
    bundleParts: built,
    options: { maxDepth: 12, maxStates: 60000, maxMs: 120000 },
  });
  const elapsed = Date.now() - started;

  assert.equal(result.status, 'proved', `四案例关键目标没证出来：${result.status}｜${result.reason}`);
  assertPassed(check, result.goal);
  assert.deepEqual(check.open_hypotheses, {}, '这条蕴含必须是闭着证出来的：不留开放假设');
  assert.ok(
    sameFormula(check.conclusion, result.goal),
    `证书证明的精确命题必须就是目标：${JSON.stringify(check.conclusion).slice(0, 200)}`,
  );
  assert.ok(
    proof.steps.some((s) => s.rule === 'theory' && s.axiom === 'bg-abelian-group-expansion'),
    '阿贝尔群的定义性公理要以 theory 成员进证书',
  );
  assert.ok(proof.steps.some((s) => s.rule === 'and_l'), '合取消去拿到 group_concept 那一支');
  assert.ok(proof.steps.some((s) => s.rule === 'imp_e') && proof.steps.some((s) => s.rule === 'imp_i'));
  assert.ok(proof.steps.some((s) => s.rule === 'all_i'), '全称目标要三次全称引入');
  // 观测值：不写成断言（机器快慢不该让测试变红），但要留在输出里，便于与预算对照。
  console.log(
    `[task-8] 关键目标已证出：${proof.steps.length} 步，${result.stats.states} 状态，`
    + `搜索 ${result.stats.durationMs} ms，含装配/内核共 ${elapsed} ms`,
  );
});

/* ==========================================================================
 * ㉚ / ㉛（task-12）：极限案例的证书型关系
 *
 * 背景：验收指出「极限案例 0 条证书型关系」。两个卡点分别是
 *  ⓐ `limit_seq` 的展开式里有「λ 项当函数参数」的形状（`seq_conv((λ(n:N). ff(xx(n))))(LL)`），
 *     装配侧原来直接拒收；
 *  ⓑ 结构性内容公理 `bg-distance-zero` 原来被 `backgroundAxiomsForKernel` 的缺省排除，
 *     而「常值序列收敛」的 ε–N 证明必须用 `d(a,a) = zero`。
 *
 * 下面两条断言钉住修好的形状与结论：**都用真 kernel 判**，不放宽任何门槛。
 * ========================================================================== */

test('㉚ bg:limit/1 装配：λ 项作函数参数被认证化成 lift，距离公理可用（真 kernel）', async () => {
  const { hasRawLambda } = await import('../core/formal/theory.mjs');
  const input = await kernelInputForBackground('bg:limit/1');
  assert.ok(input, '需要语言层可用');
  assert.equal(
    input.axioms.length, 4,
    `极限背景应有 4 条公理（bg-distance-zero + 三条定义性展开），实际 ${input.axioms.map((a) => a.id).join(', ')}`,
  );
  assert.ok(
    input.axioms.some((a) => a.id === 'bg-distance-zero'),
    '结构性内容公理 bg-distance-zero 必须随背景进理论（否则 d(a,a)=zero 这类步骤无据可依）',
  );

  const theory = buildKernelTheory(input.specs, { background: input.background, axioms: input.axioms });
  const seqAxiom = theory.axioms.find((a) => a.id === 'bg-limit-seq-expansion');
  assert.ok(seqAxiom, 'bg-limit-seq-expansion 必须在理论里');
  /*
   * 钉住认证化的形状：语言层把 `(λ(n:N). ff(xx(n)))` 解析成**裸 λ 应用**，
   * 而 kernel 的 `term_type` 不接受裸 λ 当项（会报 object/certification language confusion），
   * 所以装配时必须提升成 `lift(λ, 自由变量表)`——那是 kernel 唯一承认的 β 通道。
   */
  const serialized = JSON.stringify(seqAxiom.formula);
  assert.ok(serialized.includes('"lift"'), '展开式里的 λ 项必须被认证化成 lift(λ, 参数表)');
  assert.equal(hasRawLambda(seqAxiom.formula), false, '认证化之后不允许还有裸 λ 落在项位置');

  const built = kernelTheory(theory);
  // 真 kernel：`environment()` 会逐条 formula_ok 校验理论公理，所以随便证一条小命题就能把它们都过一遍。
  const { result, check } = proveAndCheck({
    label: 'case30-limit-assembly',
    goal: 'd(aa)(aa) = zero',
    program: {
      hypotheses: [],
      clauses: built.theoryAxioms.map((axiom) => ({
        id: `axiom:${axiom.id}`, kind: 'axiom', formula: axiom.formula, theoryAxiomId: axiom.id,
      })),
    },
    bundleParts: { ...built, sig: signatureOfTheory(built.theory) },
    options: { maxDepth: 10, maxStates: 20000, maxMs: 20000 },
  });
  assert.equal(result.status, 'proved', `距离公理那一步没证出来：${result.status}｜${result.reason}`);
  assertPassed(check, result.goal);
  console.log(`[task-12] bg:limit/1 装配 + d(aa)(aa)=zero 已证出：kernel=${check.status}`);
});

test('㉛ 极限关键目标「常值序列收敛」由定义展开 + ε–N 公理真证出来（真 kernel passed）', async () => {
  const input = await kernelInputForBackground('bg:limit/1');
  const built = kernelTheory(buildKernelTheory(input.specs, { background: input.background, axioms: input.axioms }));
  const sig = signatureOfTheory(built.theory);

  /*
   * 程序形状与发现阶段一致（`discovery.assembleEngineContext`）：
   * 定义等式（`def:const_seq`，搜索内部展开成 `const_seq = lift(λa.λn.a)`）+
   * 背景公理 + 登记表里那条条件当假设。
   */
  const definitions = (built.theory?.definitions ?? []).map((def) => ({
    id: `def:${def.name}`, kind: 'definition', definitionName: def.name,
  }));
  const program = {
    hypotheses: [{
      id: 'A1',
      formula: parseFormula('∀(bb:R)(nn:N). const_seq(bb)(nn) = bb', { bases: sig.bases, constants: sig.constants }),
    }],
    clauses: [
      ...definitions,
      ...built.theoryAxioms.map((axiom) => ({
        id: `axiom:${axiom.id}`, kind: 'axiom', formula: axiom.formula, theoryAxiomId: axiom.id,
      })),
    ],
  };

  const { result, proof, check } = proveAndCheck({
    label: 'case31-limit-constant-seq',
    goal: 'seq_conv(const_seq(aa))(aa)',
    program,
    bundleParts: { ...built, sig },
    options: { maxDepth: 22, maxStates: 200000, maxMs: 60000 },
  });
  assert.equal(result.status, 'proved', `常值序列收敛没证出来：${result.status}｜${result.reason}`);
  assertPassed(check, result.goal);
  /*
   * 证书证明的必须**就是**目标本身。这一条挡的是"证了展开后的另一个命题却返回成功"：
   * 合一里若做定义展开（`const_seq(aa)` → `lift(λa.λn.a)(aa)`），装配器会报
   * 「rootConclusion 与根节点结论不一致」——那正是搜索里那条刚性匹配与结论核对的由来。
   */
  assert.ok(
    sameFormula(check.conclusion, result.goal),
    `证书结论必须精确等于目标：${JSON.stringify(check.conclusion).slice(0, 200)}`,
  );
  assert.ok(
    proof.steps.some((step) => step.rule === 'definition'),
    '「常值序列」要用到背景项定义的 definition 步骤（`const_seq ≜ λa.λn.a`）',
  );
  assert.ok(
    proof.steps.some((step) => step.rule === 'h_axiom'),
    'β 化简只能走 abstraction 公理（kernel 唯一承认的通道）',
  );
  console.log(
    `[task-12] 常值序列收敛已证出：${proof.steps.length} 步，${result.stats.states} 状态，`
    + `搜索 ${result.stats.durationMs} ms，kernel=${check.status}`,
  );
});

/*
 * ㉜：把「四案例关键目标在**发现运行的默认预算**下就能证出来」钉成断言。
 *
 * 为什么单列一条：task-8 交付时实测这条目标要 ~1.8×10⁴ 状态 / ~8 秒，超过 §3 的默认
 * 单候选预算（2000 ms / 10000 状态），当时只好在 ㉙ 里放大预算并另行上报。此后引擎侧
 * 有改动（`search.mjs` / `backgrounds.mjs`），现在同一条目标在**默认预算**下 1181 状态、
 * 亚秒级就证出来了。这个差别对四案例的验收是实质的：§3 的默认预算就是发现运行真正用的
 * 那一档，只要它还够用，「阿贝尔群 ⇒ 群」这类关系才可能在一次普通发现运行里被判 verified。
 * 所以这里用默认那一档显式复核，防止将来背景公理或搜索改动把它悄悄推回去。
 *
 * 不用 ㉙ 的宽松预算：㉙ 判的是「命题能不能证」，本条判的是「在发现运行的真实预算下能不能证」。
 */
test('㉜ 同一条关键目标在**发现运行的现行预算**下证得出来（默认档即引擎真正用的那一档）', async () => {
  const input = await kernelInputForBackground('bg:group/1');
  assert.ok(input, '需要语言层可用');
  const built = kernelTheory(buildKernelTheory(input.specs, { background: input.background, axioms: input.axioms }));
  const goalSource = '∀(mul0:G -> G -> G)(e0:G)(inv0:G -> G). abelian_group(mul0)(e0)(inv0) ⇒ group_concept(mul0)(e0)(inv0)';
  const program = {
    hypotheses: [],
    clauses: built.theoryAxioms.map((axiom) => ({
      id: `axiom:${axiom.id}`, kind: 'axiom', formula: axiom.formula, theoryAxiomId: axiom.id,
    })),
  };

  /*
   * 预算从**引擎自己的常量**取，不再在测试里另写一份。
   *
   * 早先这条断言钉的是 `2000ms / 10000 状态 / depth 8`——那是**旧的**默认档，§3 的度量表里
   * 它已经标了"旧默认"，而 `DISCOVERY_BUDGET` 现在是 `perCandidateMs: 8000 / depth: 12 /
   * maxStates: 200000`。后果是：这条断言在**整套测试连着跑**时偶发 `timeout`
   * （实测一次 1179 状态 / 2004 ms），而它拦住的并不是真回归，只是"测试自己写错了一个数字"。
   *
   * 现在分两层：
   * - **硬断言**：现行默认预算下必须 `proved`——这是发现运行真正会用的那一档，
   *   它挡住了才是真问题（四案例的证书型关系会被判成 timeout）；
   * - **诊断**：顺带在**旧默认档**下再试一次，把实测时间打出来。它是**时钟测量**，
   *   不当作通过条件（机器负载会让同一份代码差出几百毫秒），但时间明显变长时看得见。
   */
  const { DISCOVERY_BUDGET } = await import('../core/formal/discovery.mjs');
  const liveBudget = {
    maxDepth: DISCOVERY_BUDGET.depth,
    maxStates: DISCOVERY_BUDGET.maxStates,
    maxMs: DISCOVERY_BUDGET.perCandidateMs,
  };

  const { result, proof, check } = proveAndCheck({
    label: 'case32-group-abelian-live-budget',
    goal: goalSource,
    program,
    bundleParts: built,
    options: liveBudget,
  });
  assert.equal(
    result.status, 'proved',
    `现行默认预算（${liveBudget.maxMs}ms / ${liveBudget.maxStates} 状态 / depth ${liveBudget.maxDepth}）下没证出来`
    + `（${result.status}｜${result.stats.states} 状态｜${result.stats.durationMs} ms）：`
    + `发现运行会把它判成 ${result.status}，四案例的证书型关系会被挡住。${result.reason}`,
  );
  assert.ok(result.stats.states <= liveBudget.maxStates, `状态数 ${result.stats.states} 超过现行默认上限`);
  assertPassed(check, result.goal);
  assert.deepEqual(check.open_hypotheses, {}, '不留开放假设');

  // 诊断（不设通过条件）：同一目标在旧默认档下还要多久。§3 的度量表记的就是这一档。
  const legacy = search(goalSource, program, { sig: built.sig, maxDepth: 8, maxStates: 10000, maxMs: 2000 });
  console.log(
    `[task-8] 现行默认预算下已证出：${proof.steps.length} 步，${result.stats.states} 状态，${result.stats.durationMs} ms，kernel=${check.status}`
    + `｜旧默认档（2000ms/10000 状态/depth 8）：${legacy.status}，${legacy.stats?.states ?? '?'} 状态，${legacy.stats?.durationMs ?? '?'} ms`,
  );
});
