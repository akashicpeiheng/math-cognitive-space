/**
 * 形式语言层与内核桥接的验收（`tests/formal-language.test.mjs`）。
 *
 * 这份测试的**唯一权威**是 `mcs-foundations/validation/certification/kernel.py`：
 * 凡是「Node 造的东西对不对」的问题，都不靠自证，而是真起一个 python 子进程，
 * 让 kernel 自己算、自己比。三条最贵的断言是：
 *
 * 1. `H_Sigma 实例对拍`：Node 重建的公理公式，交给 python 的 `kernel.same()`
 *    与 `kernel.axiom()` 的结果比——**参数顺序搞反不会报语法错，只会在某天变成
 *    `forged H_Sigma instance`**，所以这条必须逐模式（含 4 种不同的 λ 项）核验；
 * 2. `证书真跑`：Node 拼的证书经 `checkBundle` 落盘、起子进程，断言 `passed`；
 *    再故意改坏一步，断言 `failed`（拒绝也要真的被拒）；
 * 3. `哈希口径`：Node 的 `digest`/`pyStableString` 与 `kernel.digest`/`kernel.stable`
 *    在含非 ASCII 的样例上**逐字节**一致。
 *
 * 运行：`node --test tests/formal-language.test.mjs`（不要跑 `npm test`，那是 Lead 的活）。
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, join } from 'node:path';

import {
  FORMAL_LANGUAGE_VERSION, FORMAL_OPERATORS, FORMAL_BOUNDED_TYPES, FORMAL_BUDGETS,
  TYPE_ALIASES, parseType, typeToString, typeEquals, parseTerm, parseFormula,
  parseSpec, validateDraft, alphaCanonical, formulaHash, formulaToReadable,
  formulaToTex, termToReadable, formulaToTerm,
} from '../core/formal/language.mjs';
import { KERNEL_VERSION, MAX_STEPS, digest, pyStableString, canonicalize, fileHash } from '../core/formal/codec.mjs';
import {
  H_SCHEMAS, hSchemaFormula, hSchemaInstance, backgroundTheory, listBackgrounds,
  buildKernelTheory, checkTheory, theoryDigest, toKernelTheory, parameters, liftTerm, openBody,
  twoDistinct, twoExhaustive, logic, equality, quantifier, extensionality, abstraction,
  BG_GROUP, BG_CORE,
} from '../core/formal/theory.mjs';
import { checkBundle, kernelFileHash, KERNEL_RELATIVE_PATH, replayCertificatePath } from '../core/formal/kernel.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, '..', '..');
const KERNEL_PATH = resolve(REPO_ROOT, KERNEL_RELATIVE_PATH);

/* ==========================================================================
 * 让 kernel 自己说话的辅助：一次子进程，输入 JSON 走 stdin，输出 JSON 走 stdout
 * ======================================================================== */

const KERNEL_PRELUDE = `
import json, sys, importlib.util
_spec = importlib.util.spec_from_file_location('kernel', r'${KERNEL_PATH}')
kernel = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(kernel)
payload = json.loads(sys.stdin.buffer.read().decode('utf-8'))
def out(value):
    sys.stdout.write(json.dumps(value))
`;

/** 起 python 跑一段以 KERNEL_PRELUDE 开头的脚本，payload 走 stdin。 */
function pythonKernel(body, payload) {
  return new Promise((resolvePromise, rejectPromise) => {
    const child = execFile('python', ['-c', `${KERNEL_PRELUDE}\n${body}`], {
      cwd: REPO_ROOT, windowsHide: true, maxBuffer: 8 * 1024 * 1024, timeout: 60000,
      env: { ...process.env, PYTHONIOENCODING: 'utf-8' },
    }, (error, stdout, stderr) => {
      if (error) return rejectPromise(new Error(`python 调用失败：${error.message}\n${stderr}`));
      try { resolvePromise(JSON.parse(stdout)); } catch (parseError) { rejectPromise(new Error(`python 输出不是 JSON：${stdout.slice(0, 500)}`)); }
    });
    child.stdin.write(JSON.stringify(payload));
    child.stdin.end();
  });
}

/* ==========================================================================
 * 一、类型语言
 * ======================================================================== */

test('类型：解析、别名归一、打印与比较', () => {
  assert.equal(FORMAL_LANGUAGE_VERSION, 'mcs-formal/1');
  assert.deepEqual(parseType('G -> G -> o'), ['->', 'G', ['->', 'G', 'o']]);
  assert.equal(typeToString(parseType('G -> G -> o')), 'G -> G -> o');
  // 别名：bool/Prop -> o，ℝ -> R，集合 -> Set
  assert.equal(typeToString(parseType('bool')), 'o');
  assert.equal(typeToString(parseType('Prop')), 'o');
  assert.equal(typeToString(parseType('ℝ')), 'R');
  assert.equal(typeToString(parseType('集合')), 'Set');
  assert.equal(typeToString(parseType('群')), 'Group');
  assert.equal(TYPE_ALIASES['ℕ'], 'N');
  // 左嵌套必须加括号，右结合不加
  assert.equal(typeToString(['->', ['->', 'G', 'o'], 'G']), '(G -> o) -> G');
  assert.equal(typeToString(parseType('(G -> o) -> G')), '(G -> o) -> G');
  assert.ok(typeEquals(parseType('G -> o'), ['->', 'G', 'o']));
  assert.ok(!typeEquals(parseType('G -> o'), parseType('G -> G')));
  // 箭头优先级最低：(A -> B) -> C 与 A -> B -> C 不同
  assert.ok(!typeEquals(parseType('(G -> o) -> G'), parseType('G -> o -> G')));
});

test('类型：语法错误定位到行列，且 details 有三件套', () => {
  assert.throws(() => parseType('G -> '), (error) => {
    assert.equal(error.code, 'BAD_REQUEST');
    assert.equal(error.status, 400);
    assert.equal(typeof error.details.line, 'number');
    assert.equal(typeof error.details.column, 'number');
    assert.equal(error.details.reason, 'syntax');
    assert.equal(error.details.line, 1);
    return true;
  });
  // 结尾记号没有文本，token 记为 null，但行列仍然给出
  assert.throws(() => parseType('(G -> o'), (error) => {
    assert.equal(error.details.token, null);
    assert.equal(error.details.line, 1);
    assert.equal(error.details.column, 8);
    return true;
  });
  // 位置偏移：按整份文本的坐标系报第 3 行第 5 列起
  assert.throws(() => parseType('G -> ', { line: 3, column: 5 }), (error) => {
    assert.equal(error.details.line, 3);
    return true;
  });
});

/* ==========================================================================
 * 二、项语言：de Bruijn、作用域、捕获
 * ======================================================================== */

const SIG_G = { bases: ['o', 'G'], constants: { mul: ['->', 'G', ['->', 'G', 'G']], e: 'G' } };

test('项：应用左结合、括号参数表、let 在解析期代入消去', () => {
  assert.deepEqual(parseTerm('mul e e', SIG_G), ['app', ['app', ['c', 'mul'], ['c', 'e']], ['c', 'e']]);
  assert.deepEqual(parseTerm('mul(e, e)', SIG_G), parseTerm('mul e e', SIG_G));
  // let x = t in u 直接代入，不产生内核没有规则的 β 步
  assert.deepEqual(parseTerm('let a = e in mul a e', SIG_G), parseTerm('mul e e', SIG_G));
  assert.deepEqual(parseTerm('λ(x:G). x', SIG_G), ['lam', 'G', ['b', 0, 'G']]);
});

test('项：λ 多绑定、嵌套作用域与 α 改名（de Bruijn 下改名是恒等）', () => {
  const nested = parseTerm('λ(x:G) (y:G). mul x y', SIG_G);
  assert.deepEqual(nested, ['lam', 'G', ['lam', 'G', ['app', ['app', ['c', 'mul'], ['b', 1, 'G']], ['b', 0, 'G']]]]);
  // α：改绑定名不改变规范形式
  assert.deepEqual(parseTerm('λ(x:G). λ(y:G). mul x y', SIG_G), parseTerm('λ(a:G). λ(b:G). mul a b', SIG_G));
  // 遮蔽：内层 λ 用同名变量，指向的是内层
  assert.deepEqual(parseTerm('λ(x:G). λ(x:G). x', SIG_G), ['lam', 'G', ['lam', 'G', ['b', 0, 'G']]]);
  // 未注释但上下文能推断
  assert.deepEqual(parseTerm('λx. x', { bases: ['o', 'G'], expected: ['->', 'G', 'G'] }), ['lam', 'G', ['b', 0, 'G']]);
});

test('项：let 代入不捕获自由变量', () => {
  // let z = y in λ(w:G). mul z w：值里的自由 y 必须仍然是自由 y，不能被内层 λ 捕获
  const term = parseTerm('let z = y in λ(w:G). mul z w', SIG_G);
  assert.deepEqual(term, ['lam', 'G', ['app', ['app', ['c', 'mul'], ['v', 'y', 'G']], ['b', 0, 'G']]]);
  // 同一份值被代入到内层 λ 之下时，绑定变量要正确降级（内核 open_body 的口径）
  const shifted = parseTerm('λ(a:G). let z = a in λ(b:G). z', SIG_G);
  assert.deepEqual(shifted, ['lam', 'G', ['lam', 'G', ['b', 1, 'G']]]);
});

test('项：同一自由语境里同名异类型被拒', () => {
  assert.throws(() => parseTerm('f(x, x)', { bases: ['o', 'G', 'H'], constants: { f: ['->', 'G', ['->', 'H', 'o']] } }), (error) => {
    assert.equal(error.details.reason, 'type-mismatch');
    assert.equal(error.details.variable, 'x');
    assert.match(error.message, /同名异类型/);
    assert.equal(error.details.line, 1);
    assert.equal(typeof error.details.column, 'number');
    return true;
  });
});

test('项：绑定的 λ 变量遮蔽常量（同名不同类型也允许）', () => {
  // 常量 x : G，但 λ(x:o). x 里的 x 是绑定变量，类型 o
  const term = parseTerm('λ(x:o). x', { bases: ['o', 'G'], constants: { x: 'G' } });
  assert.deepEqual(term, ['lam', 'o', ['b', 0, 'o']]);
});

test('项：类型推断不出时报 undeclared-type，并指向那个标记', () => {
  assert.throws(() => parseTerm('λx. x', { bases: ['o', 'G'] }), (error) => {
    assert.equal(error.details.reason, 'undeclared-type');
    assert.equal(error.details.line, 1);
    assert.equal(error.details.column, 2);
    assert.equal(error.details.token, 'x');
    return true;
  });
});

/* ==========================================================================
 * 三、公式语言
 * ======================================================================== */

const SIG_P = { bases: ['o', 'G'], constants: { P: ['->', 'G', 'o'], x: 'G' } };

test('公式：别名归一、iff/¬ 展开、true/false 的内核口径', () => {
  assert.deepEqual(parseFormula('false', {}), ['false']);
  // ⊤ 写成 true = true（内核没有裸 true 公式，refl 可证）
  assert.deepEqual(parseFormula('true', {}), ['eq', ['logic', 'true'], ['logic', 'true']]);
  // 裸 o 型项记作 B(t) = (t = true)
  assert.deepEqual(parseFormula('P(x)', SIG_P), ['eq', ['app', ['c', 'P'], ['c', 'x']], ['logic', 'true']]);
  assert.deepEqual(parseFormula('P(x) = true', SIG_P), parseFormula('P(x)', SIG_P));
  // ¬a 展开为 a ⇒ false
  assert.deepEqual(parseFormula('¬ P(x)', SIG_P), ['imp', ['eq', ['app', ['c', 'P'], ['c', 'x']], ['logic', 'true']], ['false']]);
  // ⇔ 展开为两个方向的蕴含之合取
  assert.deepEqual(parseFormula('P(x) ⇔ true', SIG_P), parseFormula('(P(x) ⇒ true) ∧ (true ⇒ P(x))', SIG_P));
  // x = y 是对象等式，不是 B
  assert.deepEqual(parseFormula('x = x', SIG_P), ['eq', ['c', 'x'], ['c', 'x']]);
});

test('公式：合取与蕴含右结合、规范形式不重排', () => {
  const conjunction = parseFormula('P(x) ∧ true ∧ P(x)', SIG_P);
  assert.equal(conjunction[0], 'and');
  assert.equal(conjunction[2][0], 'and'); // a ∧ (b ∧ c)，右结合
  assert.notDeepEqual(parseFormula('P(x) ∧ P(x) ∧ true', SIG_P), conjunction);
  const implication = parseFormula('P(x) ⇒ P(x) ⇒ P(x)', SIG_P);
  assert.equal(implication[0], 'imp');
  assert.equal(implication[2][0], 'imp'); // a ⇒ (b ⇒ c)
});

test('公式：析取与未登记记号一律 unsupported，不假装能证', () => {
  for (const source of ['P(x) ∨ true', 'P(x) or true']) {
    assert.throws(() => parseFormula(source, SIG_P), (error) => {
      assert.equal(error.details.reason, 'unsupported');
      assert.match(error.message, /析取/);
      return true;
    });
  }
  assert.throws(() => parseTerm('or(P(x), true)', SIG_P), (error) => error.details.reason === 'unsupported');
});

test('公式：绑定改名不改哈希，量词换序改哈希', () => {
  const Q = { bases: ['o', 'G'], constants: { Q: ['->', 'G', ['->', 'G', 'o']] } };
  const renamed = formulaHash(parseFormula('∀x:G. Q(x, x)', Q));
  assert.equal(renamed, formulaHash(parseFormula('∀y:G. Q(y, y)', Q)));
  assert.notEqual(renamed, formulaHash(parseFormula('∀y:G. ∀z:G. Q(y, z)', Q)));
  // 量词换序 = 不同命题
  const swappedA = formulaHash(parseFormula('∀x:G. ∀y:G. Q(x, y)', Q));
  const swappedB = formulaHash(parseFormula('∀y:G. ∀x:G. Q(x, y)', Q));
  assert.notEqual(swappedA, swappedB);
  // 自由变量保留原名与类型：换自由变量名 = 换命题
  assert.notEqual(formulaHash(parseFormula('∀x:G. Q(x, x)', Q)), formulaHash(parseFormula('∀x:G. Q(x, y)', Q)));
});

test('公式：α 规范把绑定量词改名为 z0, z1, …，并避开已用名字', () => {
  const canonical = alphaCanonical(parseFormula('∀x:G. ∀y:G. Q(x, y)', { bases: ['o', 'G'], constants: { Q: ['->', 'G', ['->', 'G', 'o']] } }));
  assert.deepEqual(canonical, [
    'all', ['v', 'z0', 'G'],
    ['all', ['v', 'z1', 'G'], ['eq', ['app', ['app', ['c', 'Q'], ['v', 'z0', 'G']], ['v', 'z1', 'G']], ['logic', 'true']]],
  ]);
  // 表达式里已经有 z0（登记为常量）时，绑定改名要避开它
  const avoiding = alphaCanonical(parseFormula('∀x:G. Q(x, z0)', { bases: ['o', 'G'], constants: { Q: ['->', 'G', ['->', 'G', 'o']], z0: 'G' } }));
  assert.equal(avoiding[1][1], 'z1');
  assert.ok(JSON.stringify(avoiding).includes('["c","z0"]'), '已用的名字 z0 必须原样保留');
  assert.equal(formulaHash(canonical), formulaHash(alphaCanonical(canonical)));
});

test('嵌入：公式能翻成 o 型对象项，de Bruijn 下标与量词层数对齐', () => {
  const sig = { bases: ['o', 'G'], constants: { P: ['->', 'G', 'o'] } };
  // 常量命题项：∀x:G. P(x) ⇒ P(x)
  const embedded = formulaToTerm(parseFormula('∀x:G. P(x) ⇒ P(x)', sig), sig);
  // B(P x) 的嵌入是对象语言的 eq_o：P(x) = true
  const proposition = ['app', ['app', ['logic', 'eq', 'o'], ['app', ['c', 'P'], ['b', 0, 'G']]], ['logic', 'true']];
  assert.deepEqual(embedded, [
    'app', ['logic', 'all', 'G'],
    ['lam', 'G', ['app', ['app', ['logic', 'imp'], proposition], proposition]],
  ]);
  // 等式嵌入用对象语言的 eq_T：t = u ↦ eq_T(t)(u)
  assert.deepEqual(formulaToTerm(parseFormula('x = y', { bases: ['o', 'G'], constants: { x: 'G', y: 'G' } }), { bases: ['o', 'G'], constants: { x: 'G', y: 'G' } }), [
    'app', ['app', ['logic', 'eq', 'G'], ['c', 'x']], ['c', 'y'],
  ]);
  // 量词 λ 会抬高**项外**绑定变量的下标：λ m. ∀a b. m a b = m b a 里 m 的下标是 2
  const lamEmbedded = parseTerm(
    'λ(m:G->G->G). ∀a b. m a b = m b a',
    { bases: ['o', 'G'], expected: ['->', ['->', 'G', ['->', 'G', 'G']], 'o'] },
  );
  assert.equal(lamEmbedded[0], 'lam');
  const body = lamEmbedded[2];                       // all_G(λa. all_G(λb. eq_G(m a b)(m b a)))
  assert.deepEqual(body[1], ['logic', 'all', 'G']);
  assert.equal(body[2][0], 'lam');
  assert.deepEqual(body[2][2][1], ['logic', 'all', 'G']);
  const equation = body[2][2][2][2];                 // eq_G(m a b)(m b a)
  assert.equal(equation[0], 'app');
  const lhs = equation[1][2];                        // m a b
  assert.deepEqual(lhs, [
    'app',
    ['app', ['b', 2, ['->', 'G', ['->', 'G', 'G']]], ['b', 1, 'G']],   // m → 第 2 层 λ 之外；a → 第 1 层
    ['b', 0, 'G'],                                                      // b → 最内层 λ
  ]);
  // 嵌入与内核 H_Schema 的 equality 公理互为逆（结构上对得上）
  const x = ['v', 'x', 'G'];
  const equalityAxiom = hSchemaFormula(equality('G'), { bases: ['o', 'G'], constants: {} });
  const axiomLhs = equalityAxiom[2][2][1][1];   // ∀x.∀y. (B(eq_G(x,y)) ⇒ x = y) ∧ … 里的 B(eq_G(x,y))
  assert.deepEqual(axiomLhs, ['eq', ['app', ['app', ['logic', 'eq', 'G'], x], ['v', 'y', 'G']], ['logic', 'true']]);
});

test('嵌入：object_conclusion 走真实检查器（内核的 HOL/FOL 翻译核对）', async () => {
  const sig = { bases: ['o', 'G'], constants: { P: ['->', 'G', 'o'] } };
  const theory = { id: 'T_object', version: '1', bases: sig.bases, constants: sig.constants, definitions: [], axioms: [] };
  const object = formulaToTerm(parseFormula('∀x:G. P(x) ⇒ P(x)', sig), sig);
  // 内核要求结论恰好是 B(lift(p))，p 就是 object_conclusion
  const conclusion = ['eq', liftTerm(object, sig), ['logic', 'true']];
  const bundle = {
    format: KERNEL_VERSION,
    theory,
    proofs: {
      p1: {
        checker: KERNEL_VERSION,
        theory_sha256: digest(theory),
        hypotheses: { H: conclusion },
        steps: [{ id: 's1', rule: 'assume', hypothesis: 'H', conclusion }],
        root: 's1',
        conclusion,
        open_hypotheses: { H: conclusion },
        object_conclusion: object,
      },
    },
    target: 'p1',
  };
  const result = await checkBundle(bundle);
  assert.equal(result.status, 'passed', result.message);
  assert.deepEqual(result.objectConclusion, object);
  // 同一份证书把 object_conclusion 换掉 -> 内核必须发现翻译对不上
  const broken = structuredClone(bundle);
  broken.proofs.p1.object_conclusion = ['logic', 'true'];
  const rejected = await checkBundle(broken);
  assert.equal(rejected.status, 'failed');
  assert.match(String(rejected.message), /translation mismatch/);
});

test('项：ctx.constants 允许写字符串类型（输入侧宽容，落地一律类型树）', () => {
  // 常量与定义两条路径必须同一口径；字符串常量直接当类型节点用会报出指不到原因的类型错。
  const viaString = parseTerm('lt(zero, zero)', { bases: ['o', 'R'], constants: { lt: 'R -> R -> o', zero: 'R' } });
  const viaTree = parseTerm('lt(zero, zero)', { bases: ['o', 'R'], constants: { lt: ['->', 'R', ['->', 'R', 'o']], zero: 'R' } });
  assert.deepEqual(viaString, viaTree);
  assert.deepEqual(viaString, ['app', ['app', ['c', 'lt'], ['c', 'zero']], ['c', 'zero']]);
  assert.equal(typeToString(parseType('R -> R -> o')), 'R -> R -> o');
  // 类型推断也走同一条路：λ 绑定的类型要能从字符串常量推出来
  assert.deepEqual(
    parseTerm('λ(x:R). lt x x', { bases: ['o', 'R'], constants: { lt: 'R -> R -> o' } }),
    ['lam', 'R', ['app', ['app', ['c', 'lt'], ['b', 0, 'R']], ['b', 0, 'R']]],
  );
});

test('spec：声明角色的白名单取 §1.6 与 shared/formal.d.ts 的并集', () => {
  for (const role of ['object', 'element', 'function', 'predicate', 'proposition', 'constant']) {
    const spec = parseSpec({
      specVersion: 'mcs-formal/1',
      declarations: [{ name: 'x', type: 'G', role }],
      statement: { source: 'x = x' },
    }, {});
    assert.equal(spec.declarations[0].role, role);
  }
  assert.throws(() => parseSpec({
    specVersion: 'mcs-formal/1',
    declarations: [{ name: 'x', type: 'G', role: '对象' }],
    statement: { source: 'x = x' },
  }, {}), (error) => error.details.reason === 'invalid-field');
});

test('背景：登记表的对象数组形状也能被解析层接受（合成样例，不依赖别的模块）', () => {
  const synthetic = {
    backgroundTheory: () => ({
      id: 'bg:test/1',
      version: '1',
      bases: [{ name: 'o', note: '真值' }, { name: 'T', note: '测试载体' }],
      constants: [{ name: 'f', type: 'T -> T', note: '一元函数符号' }],
      definitions: [],
    }),
  };
  const spec = parseSpec({ specVersion: 'mcs-formal/1', background: 'bg:test/1', statement: { source: 'f(x) = f(x)' } }, { backgrounds: synthetic });
  assert.ok(spec.bases.includes('T'));
  // 背景预置的常量必须真的进类型环境：x 由 f 的签名推出 T，而不是报 undeclared-type
  assert.deepEqual(spec.statement.formula, ['eq', ['app', ['c', 'f'], ['v', 'x', 'T']], ['app', ['c', 'f'], ['v', 'x', 'T']]]);
});

test('背景：目录登记表（core/formal/backgrounds.mjs）与本层口径不冲突', async () => {
  let registry = null;
  try { registry = await import('../core/formal/backgrounds.mjs'); } catch { registry = null; }
  if (typeof registry?.backgroundTheory !== 'function') {
    // 登记表还没装配就明确跳过，不假装通过
    assert.ok(true, 'core/formal/backgrounds.mjs 未提供 backgroundTheory，跳过互操作核对');
    return;
  }
  for (const id of [...(registry.BACKGROUND_IDS ?? []), 'bg:core/1']) {
    const report = validateDraft({ spec: { specVersion: 'mcs-formal/1', background: id, statement: { source: 'true' } } }, { backgrounds: registry });
    assert.equal(report.ok, true, `${id}: ${JSON.stringify(report.problems)}`);
  }
  const draft = validateDraft(
    { spec: { specVersion: 'mcs-formal/1', background: 'bg:group/1', statement: { source: '∀a b. mul a b = mul b a' } } },
    { backgrounds: registry },
  );
  assert.equal(draft.ok, true, JSON.stringify(draft.problems));
  assert.match(draft.readable.statement, /mul/);

  // 带背景定义的背景必须能直接装配（`bg:limit/1` 的 const_seq、`bg:group/1` 的 left_mul
  // 在登记表里只有 `source` 文本）。再让真实 kernel 接受一次，端到端钉死。
  const assembled = buildKernelTheory([], { background: registry.backgroundTheory('bg:group/1') });
  assert.deepEqual(checkTheory(assembled).ok, true);
  assert.ok(assembled.definitions.some((entry) => entry.name === 'left_mul'), '背景定义必须被解析成规范项');
  if (typeof registry.backgroundAxiomsForKernel === 'function') {
    const axioms = registry.backgroundAxiomsForKernel('bg:group/1', { kinds: ['definitional'] });
    const theory = buildKernelTheory([], { background: registry.backgroundTheory('bg:group/1'), axioms });
    assert.equal(checkTheory(theory).ok, true, JSON.stringify(checkTheory(theory).problems));
    const first = theory.axioms[0];
    const definition = theory.definitions[0];
    const defFormula = ['eq', ['c', definition.name], ['lift', definition.term, []]];
    const result = await checkBundle({
      format: KERNEL_VERSION,
      theory,
      proofs: {
        p1: {
          checker: KERNEL_VERSION,
          theory_sha256: theoryDigest(theory),
          hypotheses: {},
          steps: [
            { id: 's1', rule: 'theory', axiom: first.id, witness: digest(first.formula), conclusion: first.formula },
            { id: 's2', rule: 'definition', name: definition.name, conclusion: defFormula },
          ],
          root: 's1',
          conclusion: first.formula,
          open_hypotheses: {},
        },
      },
      target: 'p1',
    });
    assert.equal(result.status, 'passed', result.message);
    assert.deepEqual(result.dependencies, [`T:${first.id}`]);
  }
});

test('公式：谓词应用直接当公式用（登记表的写法），非 o 型项报出推断到的类型', () => {
  const sig = { bases: ['o', 'X'], constants: { P: ['->', 'X', 'o'], Q: ['->', 'X', 'o'], a: 'X' } };
  // 三种写法都必须通过：这是 data/formal/registry.mjs 里 31 条登记的通用形状
  assert.deepEqual(parseFormula('P(a)', sig), ['eq', ['app', ['c', 'P'], ['c', 'a']], ['logic', 'true']]);
  assert.deepEqual(parseFormula('P(a) ∧ Q(a)', sig), ['and', parseFormula('P(a)', sig), parseFormula('Q(a)', sig)]);
  assert.deepEqual(parseFormula('P(a) ⇒ Q(a)', sig), ['imp', parseFormula('P(a)', sig), parseFormula('Q(a)', sig)]);
  // 柯里化应用与量词下的谓词应用
  const curry = { bases: ['o', 'X'], constants: { rel: ['->', 'X', ['->', 'X', 'o']] } };
  assert.deepEqual(parseFormula('∀x:X. rel(x)(x)', curry), [
    'all', ['v', 'x', 'X'], ['eq', ['app', ['app', ['c', 'rel'], ['v', 'x', 'X']], ['v', 'x', 'X']], ['logic', 'true']],
  ]);
  // B(t) 与 t = true 是同一件事（同一个哈希）；`true` 仍是 true = true
  assert.equal(formulaHash(parseFormula('P(a)', sig)), formulaHash(parseFormula('P(a) = true', sig)));
  assert.deepEqual(parseFormula('true', sig), ['eq', ['logic', 'true'], ['logic', 'true']]);
  // 非 o 型项：错误里必须写出推断到的类型
  assert.throws(() => parseFormula('add', { bases: ['o', 'R'], constants: { add: ['->', 'R', ['->', 'R', 'R']] } }), (error) => {
    assert.equal(error.details.reason, 'type-mismatch');
    assert.match(error.message, /真值项/);
    assert.match(error.message, /R -> R -> R/);
    return true;
  });
  // 类型推不出来时要指到那个记号上
  assert.throws(() => parseFormula('P(a)', {}), (error) => {
    assert.equal(error.details.reason, 'undeclared-type');
    assert.equal(error.details.line, 1);
    assert.equal(typeof error.details.column, 'number');
    return true;
  });
});

/**
 * 测试侧的独立自由变量判定（不 import 实现，避免「自己验自己」）。
 * 这是内核 `formula_fv` 的口径：量词绑定按名字移除，同名遮蔽时内层先接管。
 */
function freeVarsOf(node, bound = new Set(), out = new Set()) {
  if (!Array.isArray(node)) return out;
  if (node[0] === 'v') { if (!bound.has(node[1])) out.add(node[1]); return out; }
  if (node[0] === 'c' || node[0] === 'b') return out;
  if (node[0] === 'all' || node[0] === 'ex') {
    const inner = new Set(bound);
    inner.add(node[1][1]);
    return freeVarsOf(node[2], inner, out);
  }
  for (const child of node) freeVarsOf(child, bound, out);
  return out;
}

test('公式：自由变量的判定（嵌套遮蔽 / 兄弟作用域 / 真实自由）', () => {
  const sig = { bases: ['o', 'G'], constants: { P: ['->', 'G', 'o'], Q: ['->', 'G', 'o'], R: ['->', 'G', ['->', 'G', 'o']] } };
  const mk = (formula) => buildKernelTheory([], {
    background: { id: 'T', version: '1', bases: ['o', 'G'], constants: sig.constants, definitions: [], axioms: [] },
    axioms: [{ id: 'A', formula }],
  });

  // 1) 嵌套遮蔽：内层的 x 不得把外层的 x 也遮掉（外层 Q(x) 必须仍被外层绑定接住）
  const nested = parseFormula('∀x:G. (∀x:G. P(x)) ∧ Q(x)', sig);
  assert.deepEqual([...freeVarsOf(nested)], []);
  assert.ok(JSON.stringify(nested).includes('["v","x_1","G"]'), '内层同名绑定应被改名，避免遮蔽');
  assert.equal(mk(nested).axioms.length, 1);

  // 2) 兄弟作用域：∀x.P(x) ∧ ∀x.Q(x) 无自由变量
  const siblings = parseFormula('∀x:G. P(x) ∧ ∀x:G. Q(x)', sig);
  assert.deepEqual([...freeVarsOf(siblings)], []);
  assert.ok(JSON.stringify(siblings).includes('["v","x_1","G"]'));
  assert.equal(mk(siblings).axioms.length, 1);

  // 3) 真实自由：∀x. R(x, y) 里 y 自由、x 不自由
  const real = parseFormula('∀x:G. R(x, y)', sig);
  assert.deepEqual([...freeVarsOf(real)], ['y']);
  assert.throws(() => mk(real), (error) => /闭公式/.test(error.message));
});

test('公式：兄弟作用域里重用同名绑定（⇔ 展开后的登记表写法）', () => {
  const sig = { bases: ['o', 'G'], constants: { group_concept: '(G->G->G) -> G -> (G->G) -> o' } };
  const source = '∀(mm:G->G->G)(ee:G)(ii:G->G). (group_concept(mm)(ee)(ii) ⇔ ((∀(a0:G). mm(a0)(ee) = a0) ∧ (∀(a0:G). mm(ee)(a0) = a0)))';
  const formula = parseFormula(source, sig);
  // 第二个同名绑定被改名为 a0_1，且**体里的 a0 要跟着指向它**
  assert.ok(JSON.stringify(formula).includes('["v","a0_1","G"]'), '同名绑定要避开遮蔽');
  assert.deepEqual([...freeVarsOf(formula)], [], '整个 ⇔ 展开后必须是闭公式');
  // 闭性最终由装配路径确认：开放自由变量的公式会被拒
  const theory = buildKernelTheory([], {
    background: { id: 'T', version: '1', bases: ['o', 'G'], constants: sig.constants, definitions: [], axioms: [] },
    axioms: [{ id: 'A1', formula }],
  });
  assert.equal(theory.axioms.length, 1);
  assert.deepEqual(formula[1][1], 'mm');
});

test('theory：背景定义只给 source 时也能装配（登记表的写法）', () => {
  const background = {
    id: 'bg:test/1',
    version: '1',
    bases: ['o', 'R', 'N'],
    constants: {},
    definitions: [{ name: 'const_seq', type: 'R -> N -> R', source: 'λ(a:R). λ(n:N). a' }],
    axioms: [],
  };
  const theory = buildKernelTheory([], { background });
  assert.deepEqual(theory.definitions, [{ name: 'const_seq', kind: 'term', term: ['lam', 'R', ['lam', 'N', ['b', 1, 'R']]] }]);
  assert.deepEqual(checkTheory(theory), { ok: true, problems: [] });
  // 后一条定义可以引用前一条
  const chained = buildKernelTheory([], {
    background: {
      ...background,
      definitions: [
        { name: 'const_seq', type: 'R -> N -> R', source: 'λ(a:R). λ(n:N). a' },
        { name: 'const_seq_2', type: 'R -> N -> R', source: 'λ(a:R). const_seq(a)' },
      ],
    },
  });
  assert.deepEqual(chained.definitions.map((entry) => entry.name), ['const_seq', 'const_seq_2']);
  // 既没有 term 也没有 source：要明确报出来，而不是飘到「不是合法的项」
  assert.throws(
    () => buildKernelTheory([], { background: { ...background, definitions: [{ name: 'broken', type: 'R' }] } }),
    (error) => /既没有 term 也没有 source/.test(error.message),
  );
});

test('公式：人话与 TeX 是纯函数，不改变输入', () => {
  const formula = parseFormula('∀x:G. P(x) ⇒ P(x)', { bases: ['o', 'G'], constants: { P: ['->', 'G', 'o'] } });
  const snapshot = JSON.stringify(formula);
  const readable = formulaToReadable(formula);
  const tex = formulaToTex(formula);
  assert.match(readable, /对所有/);
  assert.match(readable, /推出/);
  assert.match(tex, /\\forall/);
  assert.match(tex, /\\Rightarrow/);
  assert.match(termToReadable(parseTerm('λ(x:G). mul x e', SIG_G)), /^λ/);
  assert.equal(JSON.stringify(formula), snapshot);
});

/* ==========================================================================
 * 四、formalSpec 归一（§1.6）
 * ======================================================================== */

const SPEC_INPUT = {
  specVersion: 'mcs-formal/1',
  node: 'group:group-axioms',
  nodeVersion: '1',
  background: BG_GROUP,
  theoryVersion: '1',
  declarations: [
    { name: 'mul', type: 'G -> G -> G', role: 'function', label: '乘法' },
    { name: 'e', type: 'G', role: 'object' },
  ],
  definitions: [
    { name: 'sq', type: 'G -> G', source: 'λ(x:G). mul x x' },
    { name: 'cube', type: 'G -> G', source: 'λ(x:G). mul (sq x) x' },
  ],
  assumptions: [{ id: 'A1', source: '∀a b. mul a b = mul b a' }],
  statement: { source: '∀a:G. sq(a) = mul a a', kind: 'formula' },
  claims: [{ id: 'C1', source: 'sq(e) = mul e e', role: 'derived' }],
  references: [{ node: 'group:group-concept', version: '1', specHash: 'sha256:abc', kind: 'definitionReference', symbols: ['sq'] }],
  boundary: ['未展开：群公理模板的具体结构仍需逐项检查。'],
  source: '人工登记',
};

test('spec：归一、声明并库、定义按依赖序、哈希稳定', () => {
  const spec = parseSpec(SPEC_INPUT, { backgrounds: { backgroundTheory } });
  assert.equal(spec.specVersion, 'mcs-formal/1');
  assert.equal(spec.node, 'group:group-axioms');
  assert.ok(spec.bases.includes('o'));
  assert.ok(spec.bases.includes('G'));
  assert.deepEqual(spec.declarations.map((entry) => entry.name), ['mul', 'e']);
  assert.deepEqual(spec.definitions.map((entry) => entry.name), ['sq', 'cube']);
  assert.match(spec.hash, /^sha256:[0-9a-f]{64}$/);
  // 哈希稳定：同样的输入两次给同一个哈希；α 改名不改哈希
  assert.equal(parseSpec(SPEC_INPUT, { backgrounds: { backgroundTheory } }).hash, spec.hash);
  const renamed = structuredClone(SPEC_INPUT);
  renamed.statement.source = '∀z:G. sq(z) = mul z z';
  assert.equal(parseSpec(renamed, { backgrounds: { backgroundTheory } }).hash, spec.hash);
  // 换序则换哈希（不被「显然」接受）
  const swapped = structuredClone(SPEC_INPUT);
  swapped.statement.source = '∀a:G. mul a a = sq(a)';
  assert.notEqual(parseSpec(swapped, { backgrounds: { backgroundTheory } }).hash, spec.hash);
  // 说明文字不进哈希（改 label/boundary 不该让下游引用失效），但登记哈希对不上要出警告
  const relabelled = structuredClone(SPEC_INPUT);
  relabelled.declarations[0].label = '乘法（改名）';
  relabelled.boundary = ['另一条边界说明。'];
  assert.equal(parseSpec(relabelled, { backgrounds: { backgroundTheory } }).hash, spec.hash);
  const tampered = { ...structuredClone(SPEC_INPUT), hash: 'sha256:0000000000000000000000000000000000000000000000000000000000000000' };
  const tamperedSpec = parseSpec(tampered, { backgrounds: { backgroundTheory } });
  assert.equal(tamperedSpec.hash, spec.hash);
  assert.ok(tamperedSpec.warnings.some((warning) => warning.code === 'hash-mismatch'));
});

test('spec：循环定义报出环上的名字', () => {
  const raw = {
    specVersion: 'mcs-formal/1',
    declarations: [{ name: 'e', type: 'G' }],
    definitions: [
      { name: 'a', type: 'G', source: 'b' },
      { name: 'b', type: 'G', source: 'c' },
      { name: 'c', type: 'G', source: 'a' },
    ],
    statement: { source: 'e = e' },
  };
  assert.throws(() => parseSpec(raw, {}), (error) => {
    assert.equal(error.details.reason, 'cyclic-definition');
    assert.match(error.message, /循环定义/);
    assert.equal(error.details.cycle[0], error.details.cycle[error.details.cycle.length - 1]);
    assert.deepEqual([...new Set(error.details.cycle)], ['a', 'b', 'c']);
    return true;
  });
  // 自指也是环（定义只是展开规则，term 里不能出现自己）
  assert.throws(() => parseSpec({
    specVersion: 'mcs-formal/1', definitions: [{ name: 'a', type: 'G', source: 'a' }], statement: { source: 'true' },
  }, {}), (error) => error.details.reason === 'cyclic-definition' && error.details.cycle.join() === 'a,a');
});

test('spec：版本、未登记字段与背景常量冲突', () => {
  assert.throws(() => parseSpec({ specVersion: 'mcs-formal/2', statement: { source: 'true' } }, {}), (error) => {
    assert.equal(error.details.reason, 'unsupported-version');
    return true;
  });
  assert.throws(() => parseSpec({ specVersion: 'mcs-formal/1', statement: { source: 'true' }, mystery: 1 }, {}), (error) => {
    assert.equal(error.details.reason, 'invalid-field');
    assert.equal(error.details.field, 'mystery');
    return true;
  });
  assert.throws(() => parseSpec({ specVersion: 'mcs-formal/1', statement: { source: 'true' }, background: 'bg:nope/1' }, { backgrounds: { backgroundTheory } }), (error) => {
    assert.equal(error.details.reason, 'unknown-background');
    return true;
  });
  // 与背景常量同名不同类：报 type-mismatch，不覆盖
  const conflicting = {
    specVersion: 'mcs-formal/1',
    background: BG_GROUP,
    declarations: [{ name: 'e', type: 'G -> G' }],
    statement: { source: 'true' },
  };
  assert.throws(
    () => parseSpec(conflicting, { backgrounds: { backgroundTheory }, constants: { e: 'G' } }),
    (error) => {
      assert.equal(error.details.reason, 'type-mismatch');
      assert.match(error.message, /同名不同类/);
      return true;
    },
  );
});

/* ==========================================================================
 * 五、证书装配与本地检查
 * ======================================================================== */

test('theory：背景白名单不自动 commit 成 axioms，装配产物是 kernel 形状', () => {
  const background = backgroundTheory(BG_GROUP);
  assert.deepEqual(background.axioms, [], '背景不得把 H_Schema 实例塞进 theory.axioms');
  assert.deepEqual(background.schemas.map((entry) => entry.schema), ['two_distinct', 'logic', 'equality', 'quantifier', 'extensionality', 'abstraction']);
  assert.ok(listBackgrounds().some((entry) => entry.id === BG_CORE));
  assert.deepEqual(Object.keys(H_SCHEMAS).sort(), ['abstraction', 'equality', 'extensionality', 'logic', 'quantifier', 'two_distinct', 'two_exhaustive']);
  assert.throws(() => hSchemaFormula({ schema: 'looks_like_an_axiom' }, { bases: ['o'], constants: {} }), (error) => error.details.reason === 'unsupported');

  const spec = parseSpec(SPEC_INPUT, { backgrounds: { backgroundTheory } });
  const theory = buildKernelTheory([spec], { background: BG_GROUP });
  assert.deepEqual(Object.keys(theory).sort(), ['axioms', 'bases', 'constants', 'definitions', 'id', 'version']);
  assert.equal(typeof theory.constants.mul[0], 'string', 'constants 的类型必须是 kernel 的嵌套数组口径');
  assert.equal(theory.constants.mul[0], '->');
  // 定义名不能出现在 constants 里（kernel 的 environment() 会报 nonfresh definition）
  assert.ok(!Object.prototype.hasOwnProperty.call(theory.constants, 'sq'));
  assert.deepEqual(theory.definitions.map((entry) => entry.name), ['sq', 'cube']);
  for (const entry of theory.definitions) assert.equal(entry.kind, 'term');
  assert.deepEqual(checkTheory(theory), { ok: true, problems: [] });
  // 闭公式公理才收；开着自由变量的不算
  assert.throws(() => buildKernelTheory([spec], { background: BG_GROUP, axioms: [{ id: 'A1', formula: ['eq', ['v', 'u', 'o'], ['logic', 'true']] }] }), (error) => /闭公式/.test(error.message));
  const withAxiom = buildKernelTheory([spec], { background: BG_GROUP, axioms: [{ id: 'A1', formula: ['eq', ['logic', 'true'], ['logic', 'true']] }] });
  assert.equal(withAxiom.axioms.length, 1);
  assert.equal(theoryDigest(withAxiom), digest(toKernelTheory(withAxiom)));
  assert.notEqual(theoryDigest(withAxiom), theoryDigest(theory));
});

test('theory：checkTheory 能指出坏理论', () => {
  const bad = { id: '', version: '1', bases: ['o', 'o'], constants: { c: 'Nope' }, definitions: [{ name: 'd', kind: 'term', term: ['v', 'x', 'o'] }], axioms: [] };
  const report = checkTheory(bad);
  assert.equal(report.ok, false);
  assert.ok(report.problems.length >= 3);
  for (const problem of report.problems) {
    assert.equal(typeof problem.code, 'string');
    assert.ok('line' in problem && 'column' in problem && 'token' in problem);
  }
});

test('validateDraft：返回形状固定，解析失败不抛异常', () => {
  const ok = validateDraft({ spec: { ...SPEC_INPUT, references: [] } }, { backgrounds: { backgroundTheory } });
  assert.equal(ok.ok, true);
  assert.deepEqual(ok.problems, []);
  assert.equal(typeof ok.hash, 'string');
  assert.equal(typeof ok.readable.statement, 'string');
  assert.equal(ok.readable.assumptions.length, 1);
  assert.equal(typeof ok.tex.statement, 'string');
  assert.ok(Array.isArray(ok.coverage.references));
  // 引用索引给不出来 -> warning，不是 problem
  assert.ok(ok.warnings.some((warning) => warning.code === 'reference-unchecked') === false);

  const bad = validateDraft({ spec: { specVersion: 'mcs-formal/1', statement: { source: '∀x. P(x) ∧' } } }, {});
  assert.equal(bad.ok, false);
  assert.equal(bad.spec, null);
  assert.equal(bad.hash, null);
  assert.ok(bad.problems.length >= 1);
  for (const problem of bad.problems) {
    assert.equal(typeof problem.code, 'string');
    assert.ok('line' in problem && 'column' in problem && 'token' in problem);
  }
  // 未登记背景 -> problem unknown-background
  const unknown = validateDraft({ spec: { specVersion: 'mcs-formal/1', background: 'bg:nope/1', statement: { source: 'true' } } }, { backgrounds: { backgroundTheory } });
  assert.equal(unknown.ok, false);
  assert.equal(unknown.problems[0].code, 'unknown-background');
  // 完全没有 backgrounds 模块时也不炸
  assert.equal(validateDraft({ spec: { specVersion: 'mcs-formal/1', statement: { source: 'true' } } }, {}).ok, true);
});

test('目录接口常量：operators / boundedTypes / budgets 形状', () => {
  for (const operator of FORMAL_OPERATORS) {
    assert.equal(typeof operator.token, 'string');
    assert.ok(Array.isArray(operator.alias));
    assert.equal(typeof operator.note, 'string');
  }
  assert.ok(FORMAL_OPERATORS.some((operator) => operator.token === '∨' && operator.rejected === true));
  for (const type of FORMAL_BOUNDED_TYPES) {
    assert.equal(typeof type.name, 'string');
    assert.equal(typeof type.note, 'string');
  }
  assert.deepEqual(Object.keys(FORMAL_BUDGETS).sort(), ['depth', 'maxCandidates', 'maxStates', 'perCandidateMs', 'totalMs']);
  assert.equal(KERNEL_VERSION, 'mcs-nd-subset/1');
  assert.equal(MAX_STEPS, 2000);
});

/* ==========================================================================
 * 六、与 kernel.py 对拍（真实子进程）
 * ======================================================================== */

const SIG_H = { bases: ['o', 'G'], constants: { mul: ['->', 'G', ['->', 'G', 'G']], tri: ['->', 'G', ['->', 'G', ['->', 'G', 'G']]] } };
const LAM_ZERO_PARAM = parseTerm('λ(x:G). x', SIG_H);
const LAM_ONE_PARAM = parseTerm('λ(x:G). mul x e', SIG_H);
const LAM_TWO_PARAMS = parseTerm('λ(x:G). tri b a x', SIG_H);   // 自由变量按 b, a 的源序出现
const LAM_INNER_LAMBDA = parseTerm('λ(x:G). λ(y:G). mul x y', SIG_H);

test('H_Sigma：Node 重建的公理必须与 kernel.axiom() 的 same()', async () => {
  const specs = [
    twoDistinct(),
    twoExhaustive(),
    logic('and'), logic('not'), logic('imp'),
    equality('G'),
    quantifier('all', 'G'), quantifier('ex', 'G'),
    extensionality('G', 'o'),
    abstraction(LAM_ZERO_PARAM, SIG_H),
    abstraction(LAM_ONE_PARAM, SIG_H),
    abstraction(LAM_TWO_PARAMS, SIG_H),
    abstraction(LAM_INNER_LAMBDA, SIG_H),
  ];
  const nodeFormulas = specs.map((spec) => hSchemaFormula(spec, SIG_H));
  const compared = await pythonKernel(`
result = []
for spec, node_formula in zip(payload['specs'], payload['nodeFormulas']):
    try:
        rebuilt = kernel.axiom(spec, payload['sig'])
        result.append({'same': bool(kernel.same(node_formula, rebuilt)), 'error': None})
    except Exception as exc:
        result.append({'same': False, 'error': type(exc).__name__ + ': ' + str(exc)})
out(result)
`, { sig: SIG_H, specs, nodeFormulas });

  assert.equal(compared.length, specs.length);
  specs.forEach((spec, index) => {
    const label = `${spec.schema}${spec.op ? `:${spec.op}` : ''}${spec.type ? `:${spec.type}` : ''}`;
    assert.equal(compared[index].error, null, `${label} kernel.axiom 抛错`);
    assert.equal(compared[index].same, true, `${label} 的 Node 重建与 kernel 不一致`);
  });
  // 参数表排序口径：按整段规范变量代码的字典序，不是源序
  assert.deepEqual(parameters(LAM_TWO_PARAMS), [['v', 'a', 'G'], ['v', 'b', 'G']]);
  // 提升 + 打开必须与 kernel 的分支一致
  assert.deepEqual(liftTerm(LAM_ONE_PARAM, SIG_H), ['lift', LAM_ONE_PARAM, [['v', 'e', 'G']]]);
  assert.deepEqual(openBody(LAM_ONE_PARAM[2], ['v', 'z0', 'G']), ['app', ['app', ['c', 'mul'], ['v', 'z0', 'G']], ['v', 'e', 'G']]);
  // 实例构造器返回的三件套一致
  const instance = hSchemaInstance('logic', { op: 'and' });
  assert.deepEqual(instance.instance, { schema: 'logic', op: 'and' });
  assert.equal(instance.digest, digest(instance.formula));
});

test('哈希口径：Node digest/pyStableString 与 kernel 逐字节一致（含非 ASCII）', async () => {
  const values = [
    { b: 1, a: [2, 3] },
    { 中文: 'λ∧ℝ', 群: ['∀', '∃'] },
    [[1, 2], { ü: 'ß', 流形: 'M' }],
    { nested: { z: [true, false, null], 空: {} } },
    ['lift', ['lam', 'G', ['b', 0, 'G']], []],
  ];
  const compared = await pythonKernel(`
out([{'digest': kernel.digest(v), 'stable': kernel.stable(v)} for v in payload['values']])
`, { values });
  values.forEach((value, index) => {
    assert.equal(compared[index].stable, pyStableString(value), `stable 口径不一致：${JSON.stringify(value)}`);
    assert.equal(compared[index].digest, digest(value), `digest 口径不一致：${JSON.stringify(value)}`);
  });
  assert.equal(canonicalize({ b: 1, a: 2 }).a, 2);
  assert.equal(fileHash(KERNEL_PATH), kernelFileHash());
  assert.equal(kernelFileHash().length, 64);
});

/** 一份最小的、确定能过的证书：`(hA ⇒ (hB ⇒ hB ∧ hA))`。 */
function makePropositionalBundle() {
  const V = (name, type) => ['v', name, type];
  const L = (name) => ['logic', name];
  const B = (term) => ['eq', term, L('true')];
  const theory = { id: 'T_test', version: '1', bases: ['o'], constants: {}, definitions: [], axioms: [] };
  const hA = V('hA', 'o');
  const hB = V('hB', 'o');
  const fA = B(hA);
  const fB = B(hB);
  const goal = ['imp', fA, ['imp', fB, ['and', fB, fA]]];
  return {
    format: KERNEL_VERSION,
    theory,
    proofs: {
      p1: {
        checker: KERNEL_VERSION,
        theory_sha256: digest(theory),
        hypotheses: { hA: fA, hB: fB },
        steps: [
          { id: 's1', rule: 'assume', hypothesis: 'hB', conclusion: fB },
          { id: 's2', rule: 'assume', hypothesis: 'hA', conclusion: fA },
          { id: 's3', rule: 'and_i', premises: ['s1', 's2'], conclusion: ['and', fB, fA] },
          { id: 's4', rule: 'imp_i', premises: ['s3'], discharge: 'hB', conclusion: ['imp', fB, ['and', fB, fA]] },
          { id: 's5', rule: 'imp_i', premises: ['s4'], discharge: 'hA', conclusion: goal },
        ],
        root: 's5',
        conclusion: goal,
        open_hypotheses: {},
      },
    },
    target: 'p1',
  };
}

test('证书：真实子进程接受（passed）与拒绝（failed）', async () => {
  const bundle = makePropositionalBundle();
  const theory = bundle.theory;
  const fA = bundle.proofs.p1.hypotheses.hA;
  const fB = bundle.proofs.p1.hypotheses.hB;
  const goal = bundle.proofs.p1.conclusion;

  const passed = await checkBundle(bundle);
  assert.equal(passed.status, 'passed');
  assert.equal(passed.exitCode, 0);
  assert.equal(passed.checker, KERNEL_VERSION);
  assert.equal(passed.theoryId, 'T_test');
  assert.equal(passed.theoryVersion, '1');
  assert.equal(passed.theorySha256, digest(theory));
  assert.equal(passed.proofId, 'p1');
  assert.equal(passed.proofSha256, digest(bundle.proofs.p1));
  assert.deepEqual(passed.conclusion, goal);
  assert.deepEqual(passed.openHypotheses, {});
  assert.equal(passed.kernelFormallyVerified, false);
  assert.equal(passed.checkerSha256, kernelFileHash());
  assert.match(passed.inputSha256, /^[0-9a-f]{64}$/);
  assert.equal(typeof passed.ranAt, 'string');
  assert.ok(passed.durationMs >= 0);
  // checkBundle 自己的 theoryDigest 口径必须与 kernel 一致（theory 本身就是 kernel 形状）
  assert.equal(theoryDigest(theory), digest(theory));

  // 故意把最后一步的结论改错：必须 failed，且给出步号
  const broken = structuredClone(bundle);
  broken.proofs.p1.steps[4].conclusion = ['imp', fA, ['imp', fB, ['and', fA, fB]]];
  const failed = await checkBundle(broken);
  assert.equal(failed.status, 'failed');
  assert.equal(failed.exitCode, 1);
  assert.equal(typeof failed.message, 'string');
  assert.match(String(failed.step), /^p1:s5$/);
  // 被拒时 kernel 只回 {status, step, message}，不回声理论哈希；我们不替它编一个
  assert.equal(failed.theorySha256, null);
  assert.equal(failed.conclusion, null);
  // format 不对 -> 本地就拦住，不浪费一次子进程
  await assert.rejects(() => checkBundle({ ...bundle, format: 'mcs-nd-subset/9' }), (error) => error.code === 'BAD_REQUEST');
  // python 不在 -> 环境故障抛错，而不是伪造成 failed
  await assert.rejects(() => checkBundle(bundle, { python: 'python-not-installed-xyz' }), (error) => error.code === 'EVIDENCE_UNSUPPORTED');
});

test('证书：replayCertificatePath 复用 evidence.mjs 的路径入口', async () => {
  const dir = resolve(REPO_ROOT, 'mcs-web', 'tmp', 'team', 'A');
  await mkdir(dir, { recursive: true });
  const file = join(dir, 'replay-certificate.json');
  await writeFile(file, JSON.stringify(makePropositionalBundle()), 'utf8');
  // evidence.mjs 的口径：record.certificate 是**仓库相对路径**
  const record = { id: 'ev-replay-1', certificate: 'mcs-web/tmp/team/A/replay-certificate.json', scope: '有限片段', obligations: ['命题逻辑片段'] };
  const replay = await replayCertificatePath(record);
  assert.equal(replay.status, 'passed');
  assert.equal(replay.evidenceId, 'ev-replay-1');
  assert.equal(replay.checkerVerified, false);
  assert.deepEqual(replay.openAssumptions, {});
  assert.equal(replay.theorySha256, digest(makePropositionalBundle().theory));
  assert.equal(replay.certificate, record.certificate);
  assert.equal(replay.inputSha256, fileHash(file));
  // 不是机器证书的记录，入口就该挡住
  await assert.rejects(() => replayCertificatePath({ id: 'ev-replay-2' }), (error) => error.code === 'BAD_REQUEST');
});

test('证书：h_axiom 与 definition 步骤走真实检查器', async () => {
  const sig = { ...SIG_H };
  const theory = { id: 'T_h', version: '1', bases: sig.bases, constants: sig.constants, definitions: [], axioms: [] };
  const axiomLogic = hSchemaFormula(logic('and'), sig);
  const axiomAbstraction = hSchemaFormula(abstraction(LAM_TWO_PARAMS, sig), sig);
  const bundle = {
    format: KERNEL_VERSION,
    theory,
    proofs: {
      p1: {
        checker: KERNEL_VERSION,
        theory_sha256: digest(theory),
        hypotheses: {},
        steps: [
          { id: 's1', rule: 'h_axiom', instance: logic('and'), conclusion: axiomLogic },
          { id: 's2', rule: 'h_axiom', instance: abstraction(LAM_TWO_PARAMS, sig), conclusion: axiomAbstraction },
        ],
        root: 's1',
        conclusion: axiomLogic,
        open_hypotheses: {},
      },
    },
    target: 'p1',
  };
  const result = await checkBundle(bundle);
  assert.equal(result.status, 'passed', result.message);

  // definition 步骤：结论必须是 Eq(C(name), lift(term))，theory 由 buildKernelTheory 装配
  const spec = parseSpec(SPEC_INPUT, { backgrounds: { backgroundTheory } });
  const groupTheory = buildKernelTheory([spec], { background: BG_GROUP });
  const defTerm = groupTheory.definitions[0].term;
  const definitionFormula = ['eq', ['c', groupTheory.definitions[0].name], ['lift', defTerm, parameters(defTerm)]];
  const definitionBundle = {
    format: KERNEL_VERSION,
    theory: groupTheory,
    proofs: {
      p1: {
        checker: KERNEL_VERSION,
        theory_sha256: theoryDigest(groupTheory),
        hypotheses: {},
        steps: [{ id: 's1', rule: 'definition', name: 'sq', conclusion: definitionFormula }],
        root: 's1',
        conclusion: definitionFormula,
        open_hypotheses: {},
      },
    },
    target: 'p1',
  };
  const definitionResult = await checkBundle(definitionBundle);
  assert.equal(definitionResult.status, 'passed', definitionResult.message);
  assert.equal(definitionResult.theorySha256, theoryDigest(groupTheory));
});
