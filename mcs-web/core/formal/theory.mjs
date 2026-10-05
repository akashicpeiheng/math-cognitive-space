/**
 * 背景理论、H_Schema 白名单与证书装配（`core/formal/theory.mjs`）。
 *
 * **两条必须分清的东西**（混成一个开关是后期最容易炸的地方）：
 *
 * 1. **`h_axiom` 是现场重建**。kernel 收到 `h_axiom` 步骤时执行
 *    `need(same(f, axiom(s['instance'], sig)))`——结论不是被信任的输入，而是与
 *    「按 instance 现场重建出来的公理」逐字比对的结果。所以任何 H_Schema 实例
 *    **不需要**预先写进 `theory.axioms`，也不会因为「内核认识这个模式」而获得
 *    免费公理：**用得到它，就必须自己造出那条公式**。
 * 2. **`theory.axioms` 是公开承诺清单**。它进 `theory_sha256`，回答的是「这份理论
 *    假定了什么」。因此本模块**不把 H_Schema 实例自动塞进 `theory.axioms`**；
 *    `backgroundTheory()` 的 `axioms` 一律为空，白名单放在 `schemas` 里，
 *    实例由 `hSchemaInstance()` 现场生成。真要 commit 的公理（例如
 *    `right_identity`）由调用方显式传进 `buildKernelTheory(…, { axioms })`。
 *
 * **`abstraction` 模式的坑**（规格 §4）：kernel 里是这样重建的
 *
 * ```python
 * ps = parameters(a)                                            # sorted(..., key=stable)
 * x  = V(fresh(set(object_fv(a)) | set(sig['constants'])), a[1])  # fresh 只取 z0, z1, …
 * ```
 *
 * 提升参数表的**排序口径**（整段规范变量代码的字典序，不是名字序）与新变量名的
 * 选取必须逐字复刻：搞反了不会报语法错，只会在某天变成
 * `forged H_Sigma instance`。这里直接用 `codec.pyStableString` 当排序键，
 * 与 `kernel.stable` 同一口径。
 */
import { McsError, CODES } from '../../shared/errors.mjs';
import { digest, pyStableString } from './codec.mjs';
import {
  typeAtomsOf, typeToString, typeEquals, normalizeBackground, coerceTypeNode, parseFormula, parseTerm,
} from './language.mjs';

/* -------------------------------------------------------------------------
 * 一、内核构造子：与 kernel.py 同名同形，跨语言对拍靠的就是这份一致
 * ----------------------------------------------------------------------- */

const arr = (a, b) => ['->', a, b];
const V = (n, t) => ['v', n, t];
const C = (n) => ['c', n];
const Lg = (n, t) => (t === undefined ? ['logic', n] : ['logic', n, t]);
const App = (f, x) => ['app', f, x];
const Eq = (t, u) => ['eq', t, u];
const Imp = (a, b) => ['imp', a, b];
const And = (a, b) => ['and', a, b];
const All = (v, p) => ['all', v, p];
const Ex = (v, p) => ['ex', v, p];
const B = (t) => Eq(t, Lg('true'));
const Iff = (a, b) => And(Imp(a, b), Imp(b, a));
const isArrow = (t) => Array.isArray(t) && t[0] === '->';

function need(condition, message, reason) {
  if (!condition) throw new McsError(CODES.BAD_REQUEST, message, 400, { line: null, column: null, token: null, ...(reason ? { reason } : {}) });
}

function typeOkLocal(t, bases) {
  if (typeof t === 'string') { need(bases.includes(t), `未登记的类型原子：${t}`, 'undeclared-type'); return t; }
  need(isArrow(t), '类型形状错误', 'type-mismatch');
  typeOkLocal(t[1], bases);
  typeOkLocal(t[2], bases);
  return t;
}

function logicalTypeLocal(t, bases) {
  const op = t[1];
  if (['true', 'false', 'not', 'and', 'or', 'imp'].includes(op)) {
    need(t.length === 2, '逻辑常元参数个数错误', 'type-mismatch');
    return {
      true: 'o', false: 'o', not: arr('o', 'o'),
      and: arr('o', arr('o', 'o')), or: arr('o', arr('o', 'o')), imp: arr('o', arr('o', 'o')),
    }[op];
  }
  need(['eq', 'all', 'ex'].includes(op) && t.length === 3, '未知的逻辑常元', 'type-mismatch');
  const a = typeOkLocal(t[2], bases);
  return op === 'eq' ? arr(a, arr(a, 'o')) : arr(arr(a, 'o'), 'o');
}

/** kernel.infer 的 Node 版（仅在 sig 全为具体类型时使用）。 */
function inferLocal(t, sig, bound = []) {
  need(Array.isArray(t) && t.length > 0, '不是合法的项', 'type-mismatch');
  switch (t[0]) {
    case 'v':
      need(typeof t[1] === 'string' && t[1] !== '' && !Object.prototype.hasOwnProperty.call(sig.constants, t[1]), `非法/与常量重名的变量：${t[1]}`, 'type-mismatch');
      return typeOkLocal(t[2], sig.bases);
    case 'b':
      need(Number.isInteger(t[1]) && t[1] >= 0 && t[1] < bound.length, '悬空的绑定变量', 'type-mismatch');
      need(typeEquals(t[2], bound[t[1]]), '绑定变量类型不一致', 'type-mismatch');
      return t[2];
    case 'c':
      need(Object.prototype.hasOwnProperty.call(sig.constants, t[1]), `未声明的常量：${t[1]}`, 'unknown-symbol');
      return sig.constants[t[1]];
    case 'logic': return logicalTypeLocal(t, sig.bases);
    case 'app': {
      const f = inferLocal(t[1], sig, bound);
      const x = inferLocal(t[2], sig, bound);
      need(isArrow(f) && typeEquals(f[1], x), '应用的类型不匹配', 'type-mismatch');
      return f[2];
    }
    case 'lam': {
      const a = typeOkLocal(t[1], sig.bases);
      return arr(a, inferLocal(t[2], sig, [a, ...bound]));
    }
    default:
      need(false, `不支持的项构造子：${String(t[0])}`, 'unsupported');
      return null;
  }
}

function mergeVars(...maps) {
  const result = new Map();
  for (const map of maps) {
    for (const [name, type] of map) {
      const previous = result.get(name);
      need(previous === undefined || typeEquals(previous, type), `自由变量同名不同类：${name}`, 'type-mismatch');
      result.set(name, type);
    }
  }
  return result;
}

function objectFv(t, into = new Map()) {
  if (!Array.isArray(t)) return into;
  if (t[0] === 'v') {
    const previous = into.get(t[1]);
    need(previous === undefined || typeEquals(previous, t[2]), `自由变量同名不同类：${t[1]}`, 'type-mismatch');
    into.set(t[1], t[2]);
    return into;
  }
  if (t[0] === 'app') { objectFv(t[1], into); objectFv(t[2], into); return into; }
  if (t[0] === 'lam') { objectFv(t[2], into); return into; }
  return into;
}

function termFv(t, into = new Map()) {
  if (!Array.isArray(t)) return into;
  if (t[0] === 'v') {
    const previous = into.get(t[1]);
    need(previous === undefined || typeEquals(previous, t[2]), `自由变量同名不同类：${t[1]}`, 'type-mismatch');
    into.set(t[1], t[2]);
    return into;
  }
  if (t[0] === 'app') { termFv(t[1], into); termFv(t[2], into); return into; }
  if (t[0] === 'lift') { for (const param of t[2]) termFv(param, into); return into; }
  return into;
}

function formulaFv(f, into = new Map()) {
  if (!Array.isArray(f)) return into;
  switch (f[0]) {
    case 'eq': return mergeVars(into, termFv(f[1], new Map()), termFv(f[2], new Map()));
    case 'imp': case 'and': case 'or':
      return mergeVars(into, formulaFv(f[1], new Map()), formulaFv(f[2], new Map()));
    case 'all': case 'ex': {
      const inner = formulaFv(f[2], new Map());
      inner.delete(f[1][1]);
      return mergeVars(into, inner);
    }
    default: return into;
  }
}

/** kernel.term_type 的 Node 版（含 lift 参数与顺序核对）。 */
function termTypeLocal(t, sig) {
  need(Array.isArray(t) && t.length > 0, '不是合法的认证项', 'type-mismatch');
  if (t[0] === 'lift') {
    need(t.length === 3 && Array.isArray(t[2]), 'lift 形状错误', 'type-mismatch');
    const a = t[1];
    need(Array.isArray(a) && a[0] === 'lam', 'lift 的第一个分量必须是规范 λ 抽象', 'type-mismatch');
    const ps = parameters(a);
    need(ps.length === t[2].length, 'lift 参数个数与自由变量表不符', 'type-mismatch');
    ps.forEach((param, index) => {
      need(typeEquals(param[2], termTypeLocal(t[2][index], sig)), 'lift 参数的类型/顺序不匹配', 'type-mismatch');
    });
    return inferLocal(a, sig);
  }
  if (t[0] === 'app') {
    const f = termTypeLocal(t[1], sig);
    const u = termTypeLocal(t[2], sig);
    need(isArrow(f) && typeEquals(f[1], u), '认证项应用的类型不匹配', 'type-mismatch');
    return f[2];
  }
  need(['v', 'c', 'logic'].includes(t[0]), '对象项/认证项混淆', 'type-mismatch');
  return inferLocal(t, sig);
}

/**
 * **认证化**：把「λ 项出现在项位置」这一形状换成 kernel 认识的 `lift(λ, 自由变量表)`。
 *
 * 为什么必须有这一步（而不是"让 formulaOk 放过它"）：
 * kernel 的 `term_type` 对 `['lam',…]` 只有一条路——`need(t[0] in ['v','c','logic'])`
 * → 报 `object/certification language confusion`。**检查器自己不接受裸 λ 当项**，
 * 所以本地放过它只会把失败推迟到 `checkBundle`，证书一条都过不去。
 * 首版唯一被 kernel 承认的 β 通道就是 `lift`：`lift(a) x = lift(a 体[x])`（abstraction 公理）。
 * 于是「`seq_conv((λ(n:N). ff(xx(n))))(LL)`」在认证语言里的正确写法是
 * `seq_conv(lift(λ(n:N). ff(xx(n)), [xx]))(LL)`——两者含义相同，但后者能进证书。
 *
 * 纪律：只在**项位置**提升；`['lift', λ, 参数表]` 里的那个 λ 是恒等抽象，**不动**它
 * （`term_sub` 也不进它内部，两处口径一致）。已是 `lift` 的照原样递归参数表。
 */
export function certifyTerm(t, sig) {
  if (!Array.isArray(t) || t.length === 0) return t;
  if (t[0] === 'lift') {
    need(t.length === 3 && Array.isArray(t[2]), 'lift 形状错误', 'type-mismatch');
    return ['lift', t[1], t[2].map((item) => certifyTerm(item, sig))];
  }
  if (t[0] === 'lam') return liftTerm(t, sig);
  if (t[0] === 'app') {
    need(t.length === 3, '应用形状错误', 'type-mismatch');
    return App(certifyTerm(t[1], sig), certifyTerm(t[2], sig));
  }
  return t;
}

/** 公式的认证化：只动项位置（等式两侧、量词体、连接词两侧）。 */
export function certifyFormula(f, sig) {
  if (!Array.isArray(f) || f.length === 0) return f;
  const k = f[0];
  if (k === 'eq') {
    need(f.length === 3, '等式形状错误', 'type-mismatch');
    return Eq(certifyTerm(f[1], sig), certifyTerm(f[2], sig));
  }
  if (['imp', 'and', 'or'].includes(k)) {
    need(f.length === 3, '连接词形状错误', 'type-mismatch');
    return [k, certifyFormula(f[1], sig), certifyFormula(f[2], sig)];
  }
  if (['all', 'ex'].includes(k)) {
    need(f.length === 3, '量词形状错误', 'type-mismatch');
    return [k, f[1], certifyFormula(f[2], sig)];
  }
  return f;
}

/** 公式里是否真的出现了「裸 λ 在项位置」（认证化会改变它，调用方可以据此提示）。 */
export function hasRawLambda(f) {
  const walkTerm = (t) => {
    if (!Array.isArray(t) || t.length === 0) return false;
    if (t[0] === 'lam') return true;
    if (t[0] === 'lift') return t[2].some(walkTerm);
    return t.some((item) => (Array.isArray(item) ? walkTerm(item) : false));
  };
  const walkFormula = (node) => {
    if (!Array.isArray(node) || node.length === 0) return false;
    const k = node[0];
    if (k === 'eq') return walkTerm(node[1]) || walkTerm(node[2]);
    if (['imp', 'and', 'or'].includes(k)) return walkFormula(node[1]) || walkFormula(node[2]);
    if (['all', 'ex'].includes(k)) return walkFormula(node[2]);
    return false;
  };
  return walkFormula(f);
}

/** kernel.formula_ok 的 Node 版（本地检查，不代替 kernel）。 */
function formulaOkLocal(f, sig) {
  need(Array.isArray(f) && f.length > 0, '不是合法的认证公式', 'type-mismatch');
  const k = f[0];
  if (k === 'false') need(f.length === 1, 'false 形状错误', 'type-mismatch');
  else if (k === 'eq') {
    need(f.length === 3, '等式形状错误', 'type-mismatch');
    need(typeEquals(termTypeLocal(f[1], sig), termTypeLocal(f[2], sig)), '等式两边类型不同', 'type-mismatch');
    mergeVars(termFv(f[1], new Map()), termFv(f[2], new Map()));
  } else if (['imp', 'and', 'or'].includes(k)) {
    need(f.length === 3, '连接词形状错误', 'type-mismatch');
    formulaOkLocal(f[1], sig);
    formulaOkLocal(f[2], sig);
  } else if (['all', 'ex'].includes(k)) {
    need(f.length === 3 && Array.isArray(f[1]) && f[1][0] === 'v', '量词绑定形状错误', 'type-mismatch');
    inferLocal(f[1], sig);
    formulaOkLocal(f[2], sig);
    const fv = formulaFv(f[2], new Map());
    need(!fv.has(f[1][1]) || typeEquals(fv.get(f[1][1]), f[1][2]), '量词绑定与自由变量类型冲突', 'type-mismatch');
  } else {
    need(false, `不支持的认证公式构造子：${String(k)}`, 'unsupported');
  }
  formulaFv(f, new Map());
  return f;
}

/** kernel.parameters：自由变量表按**整段规范代码**的字典序排序。 */
export function parameters(a) {
  return [...objectFv(a, new Map()).entries()]
    .map(([name, type]) => V(name, type))
    .sort((left, right) => {
      const a_ = pyStableString(left);
      const b_ = pyStableString(right);
      return a_ < b_ ? -1 : a_ > b_ ? 1 : 0;
    });
}

/** kernel.fresh：只取 z0, z1, …，避开给定名字集合。 */
export function freshName(names) {
  let i = 0;
  while (names.has(`z${i}`)) i += 1;
  return `z${i}`;
}

/** kernel.lift 的 Node 版。 */
export function liftTerm(t, sig) {
  if (t[0] === 'lam') return ['lift', t, parameters(t)];
  if (t[0] === 'app') return App(liftTerm(t[1], sig), liftTerm(t[2], sig));
  return t;
}

/** kernel.open_body 的 Node 版（**不进入 lift 内部的抽象**，逐分支照抄）。 */
export function openBody(body, value, depth = 0) {
  if (!Array.isArray(body)) return body;
  if (body[0] === 'b') {
    if (body[1] === depth) return shift(value, depth);
    return ['b', body[1] > depth ? body[1] - 1 : body[1], body[2]];
  }
  if (body[0] === 'app') return App(openBody(body[1], value, depth), openBody(body[2], value, depth));
  if (body[0] === 'lam') return ['lam', body[1], openBody(body[2], value, depth + 1)];
  return body;
}

function shift(t, amount, cutoff = 0) {
  if (!Array.isArray(t)) return t;
  if (t[0] === 'b') return ['b', t[1] >= cutoff ? t[1] + amount : t[1], t[2]];
  if (t[0] === 'app') return App(shift(t[1], amount, cutoff), shift(t[2], amount, cutoff));
  if (t[0] === 'lam') return ['lam', t[1], shift(t[2], amount, cutoff + 1)];
  return t;
}

function close(vs, f) {
  let out = f;
  for (let i = vs.length - 1; i >= 0; i -= 1) out = All(vs[i], out);
  return out;
}

/* -------------------------------------------------------------------------
 * 二、H_Schemas：白名单 + 现场重建
 * ----------------------------------------------------------------------- */

/**
 * 允许使用的内核公理模式（§2.4 的 `H_SCHEMAS`）。
 *
 * 生成器只能从这里取；取不到就报 `unsupported`，**不能自己造一条"看起来像公理"的公式**。
 * `params` 列出该模式必须给的参数名，`note` 说明它到底断言了什么。
 */
export const H_SCHEMAS = Object.freeze({
  two_distinct: Object.freeze({ schema: 'two_distinct', params: [], note: 'true = false ⇒ false：真假不同一。' }),
  two_exhaustive: Object.freeze({ schema: 'two_exhaustive', params: [], note: '∀p:o. p = true ∨ p = false；用了 or，内核无 or 规则，只能作为封闭公式存在。' }),
  logic: Object.freeze({ schema: 'logic', params: ['op'], ops: ['not', 'and', 'or', 'imp'], note: '连接词与真值常元的关系（把对象语言的 ∧/⇒/¬ 与元语言连接词对上）。' }),
  equality: Object.freeze({ schema: 'equality', params: ['type'], note: 'B(eq_a(x,y)) ⇔ x = y：反射等式与对象等式的对应。' }),
  quantifier: Object.freeze({ schema: 'quantifier', params: ['op', 'type'], ops: ['all', 'ex'], note: 'B(∀_a P) ⇔ ∀x. B(P x)（存在量词同理）。' }),
  extensionality: Object.freeze({ schema: 'extensionality', params: ['domain', 'codomain'], note: '(∀x. f x = g x) ⇒ f = g：函数外延性。' }),
  abstraction: Object.freeze({ schema: 'abstraction', params: ['term'], note: 'lift(a) x = lift(a 体[x])：首版唯一允许的 β 通道。' }),
});

function normalizeTypeInput(type, sig) {
  if (typeof type === 'string') return typeOkLocal(type, sig.bases);
  need(isArrow(type), '类型参数形状错误', 'type-mismatch');
  return typeOkLocal(type, sig.bases);
}

/**
 * `kernel.axiom(spec, sig)` 的 Node 版：**不信任任何外部结论**，只按 instance 重建。
 *
 * 与 kernel 逐分支对应；Node 侧构造出来的公式必须与 python 端 `same()`——
 * 由 `tests/formal-language.test.mjs` 的「H_Sigma 实例构造对拍」逐条核验。
 */
export function hSchemaFormula(spec, sig) {
  need(spec && typeof spec === 'object', 'H_Schema 实例必须是对象', 'unsupported');
  const schema = spec.schema;
  need(Object.prototype.hasOwnProperty.call(H_SCHEMAS, schema), `未登记的公理模式：${String(schema)}`, 'unsupported');
  const p = V('p', 'o');
  const q = V('q', 'o');
  let f;
  if (schema === 'two_distinct') f = Imp(Eq(Lg('true'), Lg('false')), ['false']);
  else if (schema === 'two_exhaustive') f = All(p, ['or', B(p), Eq(p, Lg('false'))]);
  else if (schema === 'logic') {
    const op = spec.op;
    need(['not', 'and', 'or', 'imp'].includes(op), `未知的逻辑模式：${String(op)}`, 'unsupported');
    if (op === 'not') f = All(p, Iff(B(App(Lg(op), p)), Imp(B(p), ['false'])));
    else f = close([p, q], Iff(B(App(App(Lg(op), p), q)), [op, B(p), B(q)]));
  } else if (schema === 'equality') {
    const a = normalizeTypeInput(spec.type, sig);
    const x = V('x', a);
    const y = V('y', a);
    f = close([x, y], Iff(B(App(App(Lg('eq', a), x), y)), Eq(x, y)));
  } else if (schema === 'quantifier') {
    const a = normalizeTypeInput(spec.type, sig);
    const op = spec.op;
    need(['all', 'ex'].includes(op), `未知的量词模式：${String(op)}`, 'unsupported');
    const pred = V('P', arr(a, 'o'));
    const x = V('x', a);
    f = All(pred, Iff(B(App(Lg(op, a), pred)), [op, x, B(App(pred, x))]));
  } else if (schema === 'extensionality') {
    const a = normalizeTypeInput(spec.domain, sig);
    const b = normalizeTypeInput(spec.codomain, sig);
    const ff = V('f', arr(a, b));
    const g = V('g', arr(a, b));
    const x = V('x', a);
    f = close([ff, g], Imp(All(x, Eq(App(ff, x), App(g, x))), Eq(ff, g)));
  } else {
    // abstraction：§4 的两处硬约束——参数表排序 + fresh 取名，必须逐字复刻。
    const a = spec.term;
    need(Array.isArray(a) && a[0] === 'lam', 'abstraction 模式需要一个规范 λ 项', 'type-mismatch');
    const ps = parameters(a);
    const taken = new Set([...objectFv(a, new Map()).keys(), ...Object.keys(sig.constants)]);
    const x = V(freshName(taken), a[1]);
    f = close([...ps, x], Eq(App(liftTerm(a, sig), x), liftTerm(openBody(a[2], x), sig)));
  }
  formulaOkLocal(f, sig);
  need(formulaFv(f, new Map()).size === 0, '重建出的公理不是闭公式（内部错误）', 'type-mismatch');
  return f;
}

/* -------------------------------------------------------------------------
 * 三、便捷构造器：只造 instance，不造公理承诺
 * ----------------------------------------------------------------------- */

export const twoDistinct = () => ({ schema: 'two_distinct' });
export const twoExhaustive = () => ({ schema: 'two_exhaustive' });
export function logic(op) {
  need(H_SCHEMAS.logic.ops.includes(op), `未知的逻辑模式：${String(op)}`, 'unsupported');
  return { schema: 'logic', op };
}
export function equality(type) {
  return { schema: 'equality', type: typeToString(type) === String(type) ? String(type) : type };
}
export function quantifier(op, type) {
  need(H_SCHEMAS.quantifier.ops.includes(op), `未知的量词模式：${String(op)}`, 'unsupported');
  return { schema: 'quantifier', op, type: typeof type === 'string' ? type : type };
}
export function extensionality(domain, codomain) {
  return { schema: 'extensionality', domain, codomain };
}
export function abstraction(lamTerm, sig) {
  need(Array.isArray(lamTerm) && lamTerm[0] === 'lam', 'abstraction 需要一个规范 λ 项', 'type-mismatch');
  if (sig) objectFv(lamTerm, new Map());
  return { schema: 'abstraction', term: lamTerm };
}

/**
 * 现场生成一个 H_Schema 实例：`hSchemaInstance('logic', {op:'and'}, sig)`。
 *
 * 返回 `{ instance, formula, digest }`——`instance` 直接填进 `h_axiom` 步骤的
 * `instance` 字段，`formula` 是重建出的闭公式（用于核对与展示），
 * `digest` 是它的 kernel 口径哈希。
 */
export function hSchemaInstance(schema, params = {}, sig = { bases: ['o'], constants: {} }) {
  const entry = H_SCHEMAS[schema];
  need(entry, `未登记的公理模式：${String(schema)}`, 'unsupported');
  const instance = { schema };
  for (const key of entry.params) {
    need(params && params[key] !== undefined, `公理模式 ${schema} 缺少参数 ${key}`, 'unsupported');
    instance[key] = params[key];
  }
  const formula = hSchemaFormula(instance, sig);
  return { instance, formula, digest: digest(formula) };
}

/* -------------------------------------------------------------------------
 * 四、背景理论
 * ----------------------------------------------------------------------- */

export const BG_CORE = 'bg:core/1';
export const BG_ALGEBRA = 'bg:algebra/1';
export const BG_GROUP = 'bg:group/1';
export const BG_LIMIT = 'bg:limit/1';
export const BG_MANIFOLD = 'bg:manifold/1';
export const BG_TENSOR = 'bg:tensor/1';

/**
 * 内置背景登记表。
 *
 * 每一条只说三件事：**有哪些类型原子**、**允许取用哪些 H_Schema 模式**、
 * **边界在哪**。`axioms` 一律为空——理由见文件头：模式可以现场重建，
 * 承诺清单必须显式给出。
 */
const BACKGROUND_DEFS = Object.freeze({
  [BG_CORE]: {
    bases: ['o', 'I'],
    constants: {},
    schemas: ['two_distinct', 'logic', 'equality', 'quantifier', 'extensionality'],
    logicOps: ['not', 'and', 'imp'],
    note: '最小核心背景：命题逻辑（¬/∧/⇒）、等词与量词、谓词外延性。',
    boundary: ['不含析取：内核没有 or 的引入/消去规则。', '不提供新增基本公理的入口。'],
  },
  [BG_GROUP]: {
    bases: ['o', 'I', 'G'],
    constants: {},
    schemas: ['two_distinct', 'logic', 'equality', 'quantifier', 'extensionality', 'abstraction'],
    logicOps: ['not', 'and', 'imp'],
    note: '群论背景：在核心之上加一个载体类型 G 与 λ 抽象通道（definition 展开 + abstraction β）。',
    boundary: ['群公理本身是案例侧的 commit 公理，不由背景自动假定。'],
  },
  [BG_LIMIT]: {
    bases: ['o', 'I', 'R', 'N'],
    constants: {},
    schemas: ['two_distinct', 'logic', 'equality', 'quantifier', 'extensionality'],
    logicOps: ['not', 'and', 'imp'],
    note: '极限背景：实数 R 与自然数 N 作为类型原子；不做自动模型搜索。',
    boundary: ['不以有限样本冒充 R/N 上的完整结论。', '序关系与算术运算须由案例声明登记，背景不预先假定。'],
  },
  [BG_MANIFOLD]: {
    bases: ['o', 'I', 'R', 'M'],
    constants: {},
    schemas: ['two_distinct', 'logic', 'equality', 'quantifier', 'extensionality'],
    logicOps: ['not', 'and', 'imp'],
    note: '流形背景：在极限背景上加流形载体 M。',
    boundary: ['图册/切空间等结构须逐项声明，背景不假装已经形式化。'],
  },
  [BG_TENSOR]: {
    bases: ['o', 'I', 'R', 'V', 'V*'],
    constants: {},
    schemas: ['two_distinct', 'logic', 'equality', 'quantifier', 'extensionality'],
    logicOps: ['not', 'and', 'imp'],
    note: '张量背景：向量空间载体 V 与对偶 V*。',
    boundary: ['张量积的存在性与泛性质须由案例声明。'],
  },
});

/** `bg:core/1` 是 `bg:algebra/1` 的书写别名（§1.6 的示例用的是前者）。 */
const BACKGROUND_ALIASES = Object.freeze({ [BG_ALGEBRA]: BG_CORE });

/** 背景 id 的登记清单（含别名），供目录接口与校验使用。 */
export function listBackgroundIds() {
  return [...new Set([...Object.keys(BACKGROUND_DEFS), ...Object.keys(BACKGROUND_ALIASES)])].sort();
}

/**
 * 取一份背景理论（§2.4）。
 *
 * 返回 `{ id, version, bases, constants, axioms, definitions, schemas, note, boundary }`：
 * `axioms` 恒为空数组（见文件头第 2 条），`schemas` 是**允许使用的模式白名单**，
 * 每一项 `{ schema, params, ops?, note }`，生成器据此决定能不能发 `h_axiom` 步骤。
 */
export function backgroundTheory(id, version = '1') {
  const canonicalId = BACKGROUND_ALIASES[id] ?? id;
  const def = BACKGROUND_DEFS[canonicalId];
  if (!def) {
    throw new McsError(CODES.BAD_REQUEST, `未登记的背景理论：${String(id)}`, 400, { line: null, column: null, token: 'background', reason: 'unknown-background' });
  }
  return {
    id,
    version: String(version ?? '1'),
    bases: [...def.bases],
    constants: { ...def.constants },
    axioms: [],
    definitions: [],
    schemas: def.schemas.map((schema) => {
      const entry = H_SCHEMAS[schema];
      return { schema, params: [...entry.params], ...(entry.ops ? { ops: [...entry.ops] } : {}), note: entry.note };
    }),
    logicOps: [...def.logicOps],
    note: def.note,
    boundary: [...def.boundary],
  };
}

/** 目录接口用的背景清单。 */
export function listBackgrounds() {
  return listBackgroundIds().map((id) => {
    const theory = backgroundTheory(id);
    return { id, version: theory.version, bases: theory.bases, schemas: theory.schemas.map((entry) => entry.schema), note: theory.note, boundary: theory.boundary };
  });
}

/* -------------------------------------------------------------------------
 * 五、装配：多个 spec 的声明/定义 + 背景 -> kernel theory
 * ----------------------------------------------------------------------- */

/** 内核投影：只有这五个字段进 `theory_sha256`。 */
export function toKernelTheory(theory) {
  return {
    id: theory.id,
    version: String(theory.version ?? '1'),
    bases: [...(theory.bases ?? [])],
    constants: { ...(theory.constants ?? {}) },
    definitions: (theory.definitions ?? []).map((entry) => ({ name: entry.name, kind: 'term', term: entry.term })),
    axioms: (theory.axioms ?? []).map((entry) => (entry.formula !== undefined
      ? { id: entry.id, formula: entry.formula }
      : { id: entry.id, formula: entry })),
  };
}

/** `theory_sha256`：与 `kernel.digest(bundle['theory'])` 同口径。 */
export function theoryDigest(theory) {
  return digest(toKernelTheory(theory));
}

/** 项内部出现的类型原子（λ 绑定、变量、逻辑常元的类型参数）——登记 `bases` 时用。 */
function termTypeAtoms(t, into = new Set()) {
  if (!Array.isArray(t)) return into;
  switch (t[0]) {
    case 'v': case 'b': case 'lam': typeAtomsOf(t[0] === 'lam' ? t[1] : t[2], into); break;
    case 'logic': if (t.length > 2) typeAtomsOf(t[2], into); break;
    default: break;
  }
  for (const child of t) if (Array.isArray(child)) termTypeAtoms(child, into);
  return into;
}

function collectSignature(specs) {
  const bases = new Set();
  const constants = new Map();
  const declarations = [];
  for (const spec of specs) {
    for (const declaration of spec.declarations ?? []) {
      const type = declaration.typeNode ?? declaration.type;
      for (const atom of typeAtomsOf(type, new Set())) bases.add(atom);
      const previous = constants.get(declaration.name);
      if (previous !== undefined && !typeEquals(previous, type)) {
        throw new McsError(CODES.BAD_REQUEST, `声明 ${declaration.name} 在不同 spec 里同名不同类：${typeToString(previous)} ≠ ${typeToString(type)}`, 400, {
          line: null, column: null, token: declaration.name, reason: 'type-mismatch',
        });
      }
      if (previous === undefined) {
        constants.set(declaration.name, type);
        declarations.push({ name: declaration.name, type });
      }
    }
  }
  return { bases, constants };
}

/**
 * 把多份归一 spec 的声明/定义与背景并成一份 **kernel theory**。
 *
 * 形状严格是 `{id, version, bases, constants, definitions, axioms}`：
 * `constants` 的类型一律是 kernel 的嵌套数组口径（`['->',a,b]`），字符串只出现在
 * `parse*` 的输入侧。`axioms` **只收调用方显式传进来的承诺公理**（`opts.axioms`），
 * 不自动物化 H_Schema 实例。
 *
 * 参数：
 * - `specs`：`parseSpec` 的产物（单个或数组）；
 * - `opts.background`：背景 id 或 `backgroundTheory()` 的产物；
 * - `opts.axioms`：要 commit 的闭公式清单，`[{id, formula, source?}]`；
 * - `opts.id` / `opts.version`：理论标识覆盖（默认取背景）。
 */
export function buildKernelTheory(specs, opts = {}) {
  const list = Array.isArray(specs) ? specs : [specs];
  for (const spec of list) need(spec && typeof spec === 'object', 'buildKernelTheory 需要归一后的 spec', 'invalid-field');
  // 背景可以给 id，也可以直接给对象。直接给对象时按解析层的宽容口径归一：
  // 目录登记表（`backgrounds.mjs`）用对象数组写 bases/constants，这里一并接受。
  const background = typeof opts.background === 'string' || opts.background === undefined
    ? normalizeBackground(backgroundTheory(opts.background ?? BG_CORE))
    : (normalizeBackground(opts.background) ?? opts.background);
  const bases = new Set(background.bases ?? []);
  bases.add('o');
  const constants = new Map(Object.entries(background.constants ?? {}));
  for (const [name, type] of Object.entries(background.constants ?? {})) {
    for (const atom of typeAtomsOf(type, new Set())) bases.add(atom);
  }

  const { bases: specBases, constants: specConstants } = collectSignature(list);
  for (const atom of specBases) bases.add(atom);
  for (const [name, type] of specConstants) {
    const previous = constants.get(name);
    if (previous !== undefined && !typeEquals(previous, type)) {
      throw new McsError(CODES.BAD_REQUEST, `常量 ${name} 与背景 ${background.id} 同名不同类：${typeToString(previous)} ≠ ${typeToString(type)}`, 400, {
        line: null, column: null, token: name, reason: 'type-mismatch',
      });
    }
    constants.set(name, type);
  }

  // 定义：先并、后判环、再按依赖序排（kernel 按数组顺序逐个登记，前向引用会变成「未声明常量」）。
  //
  // 背景登记表里的一条定义通常**只有 `source` 文本**（例：`bg:limit/1` 的
  // `const_seq = λ(a:R). λ(n:N). a`），`term` 是解析产物。这里就地按登记顺序解析，
  // 并允许后一条引用前一条——直接拿 `def.term` 会得到 undefined，
  // 一路飘到 `inferLocal` 才炸成「不是合法的项」，指不到真正的原因。
  const sig = { bases: [...bases], constants: Object.fromEntries(constants) };
  const definitions = [];
  const backgroundConstants = { ...sig.constants };
  for (const def of background.definitions ?? []) {
    need(def && typeof def.name === 'string' && def.name, '背景定义缺少 name', 'invalid-field');
    const declaredType = coerceTypeNode(def.type);
    let term = Array.isArray(def.term) ? def.term : null;
    if (!term) {
      need(typeof def.source === 'string' && def.source.trim(), `背景定义 ${def.name} 既没有 term 也没有 source`, 'invalid-field');
      term = parseTerm(def.source, { bases: [...bases], constants: backgroundConstants, expected: declaredType ?? null });
    }
    for (const atom of typeAtomsOf(declaredType, new Set())) bases.add(atom);
    for (const atom of termTypeAtoms(term, new Set())) bases.add(atom);
    const type = declaredType ?? null;
    backgroundConstants[def.name] = type ?? inferLocal(term, { bases: [...bases], constants: backgroundConstants });
    definitions.push({ name: def.name, term, type });
  }
  for (const spec of list) {
    for (const def of spec.definitions ?? []) {
      const term = def.term;
      need(Array.isArray(term) && term[0], `定义 ${def.name} 缺少规范项`, 'invalid-field');
      definitions.push({ name: def.name, term, type: def.typeNode ?? def.type ?? null });
    }
  }
  const byName = new Map();
  for (const def of definitions) {
    if (byName.has(def.name)) {
      const previous = byName.get(def.name);
      if (pyStableString(previous.term) !== pyStableString(def.term)) {
        throw new McsError(CODES.BAD_REQUEST, `定义 ${def.name} 重复且内容不同`, 400, { line: null, column: null, token: def.name, reason: 'duplicate-definition' });
      }
      continue;
    }
    byName.set(def.name, def);
  }

  const ordered = [];
  const state = new Map();
  const stack = [];
  const visit = (name) => {
    const mark = state.get(name);
    if (mark === 'done') return;
    if (mark === 'visiting') {
      const cycle = [...stack.slice(stack.indexOf(name)), name];
      throw new McsError(CODES.BAD_REQUEST, `循环定义：${cycle.join(' → ')}`, 400, { line: null, column: null, token: name, reason: 'cyclic-definition', cycle });
    }
    state.set(name, 'visiting');
    stack.push(name);
    const def = byName.get(name);
    for (const [other, otherDef] of byName) {
      if (other === name) continue;
      if (mentionsConstant(def.term, other)) visit(other);
    }
    stack.pop();
    state.set(name, 'done');
    ordered.push(def);
  };
  for (const name of byName.keys()) visit(name);

  const kernelDefinitions = [];
  const known = new Set([...constants.keys()]);
  for (const def of ordered) {
    // 逐个登记：此刻 sig 里只能有「已登记的常量 + 更早的定义」。
    for (const [other, otherDef] of byName) {
      if (other !== def.name && mentionsConstant(def.term, other) && !known.has(other)) {
        throw new McsError(CODES.BAD_REQUEST, `定义 ${def.name} 前向引用了 ${other}（kernel 按数组顺序登记定义）`, 400, {
          line: null, column: null, token: def.name, reason: 'cyclic-definition',
        });
      }
    }
    const inferred = inferLocal(def.term, { bases: sig.bases, constants: sig.constants });
    need(!objectFv(def.term, new Map()).size, `定义 ${def.name} 的项必须是旧语言闭项（无自由变量）`, 'invalid-field');
    if (def.type) {
      need(typeEquals(inferred, typeof def.type === 'string' ? def.type : def.type), `定义 ${def.name} 的推断类型与声明类型不一致`, 'type-mismatch');
    }
    kernelDefinitions.push({ name: def.name, kind: 'term', term: def.term });
    sig.constants[def.name] = inferred;
    known.add(def.name);
  }

  const axioms = [];
  const axiomIds = new Set();
  const axiomInputs = opts.axioms ?? background.axioms ?? [];
  for (const entry of axiomInputs) {
    const id = entry.id ?? `A${axioms.length + 1}`;
    need(!axiomIds.has(id), `公理 id 重复：${id}`, 'invalid-field');
    axiomIds.add(id);
    // 承诺公理可以给已解析的 formula，也可以给 `source` 文本；登记表里连 `formula`
    // 字段本身都可能是文本（`backgrounds.mjs` 就是这么存的），两种都认。
    let formula = entry.formula ?? entry.source ?? entry;
    if (typeof formula === 'string') {
      formula = parseFormula(formula, { bases: [...bases], constants: sig.constants, strict: false });
    }
    /*
     * 认证化：`language.parseFormula` 会把 `(λ(n:N). ff(xx(n)))` 直接解析成裸 λ 应用，
     * 而 kernel 的 `term_type` 不接受裸 λ 当项。这里把它提升成 `lift(λ, 参数表)`——
     * 与 abstraction 公理是同一条通道，含义不变、形状可检。
     */
    if (hasRawLambda(formula)) formula = certifyFormula(formula, sig);
    formulaOkLocal(formula, sig);
    need(formulaFv(formula, new Map()).size === 0, `theory.axioms 的每条必须是闭公式：${id}`, 'invalid-field');
    axioms.push({ id, formula });
  }

  const id = opts.id ?? `T:${background.id}`;
  const version = String(opts.version ?? background.version ?? '1');
  // 注意：返回的 constants **不能**含定义名——kernel 的 environment() 要求
  // `d['name'] not in sig['constants']`（否则报 nonfresh definition）。定义靠
  // `theory.definitions` 登记，登记后 kernel 自己会把它加进 sig。
  return { id, version, bases: [...bases], constants: Object.fromEntries(constants), definitions: kernelDefinitions, axioms };
}

/** 「项里是否出现了这个名字」——定义依赖排序用保守判断（宁可多算一条边）。 */
function mentionsConstant(term, name) {
  return pyStableString(term).includes(`"${name}"`);
}

/* -------------------------------------------------------------------------
 * 六、本地结构检查
 * ----------------------------------------------------------------------- */

/**
 * 本地结构检查（**不含 kernel**）。
 *
 * 不抛异常，返回 `{ ok, problems: [{code, message, line, column, token}] }`：
 * 「哪里不对」比「炸掉」有用。真正的接受与否仍由 `kernel.mjs` 说了算。
 */
export function checkTheory(theory) {
  const problems = [];
  const add = (code, message, token = null) => problems.push({ code, message, line: null, column: null, token });
  if (!theory || typeof theory !== 'object') return { ok: false, problems: [{ code: 'invalid-field', message: '理论必须是对象', line: null, column: null, token: null }] };
  if (typeof theory.id !== 'string' || theory.id === '') add('invalid-field', '理论缺少 id');
  if (theory.version === undefined || theory.version === null || String(theory.version) === '') add('invalid-field', '理论缺少 version');
  const bases = theory.bases;
  if (!Array.isArray(bases) || bases.length === 0) add('invalid-field', 'bases 必须是非空数组');
  else {
    if (!bases.includes('o')) add('invalid-field', 'bases 必须包含 o');
    if (new Set(bases).size !== bases.length) add('invalid-field', 'bases 有重复项');
    for (const base of bases) if (typeof base !== 'string' || base === '' || base.includes('->')) add('invalid-field', `非法类型原子：${String(base)}`, String(base));
  }
  const baseList = Array.isArray(bases) ? bases : ['o'];
  const constants = {};
  if (theory.constants !== undefined && (typeof theory.constants !== 'object' || theory.constants === null || Array.isArray(theory.constants))) {
    add('invalid-field', 'constants 必须是对象');
  } else {
    for (const [name, type] of Object.entries(theory.constants ?? {})) {
      if (typeof name !== 'string' || name === '') { add('invalid-field', '常量名非法', name); continue; }
      if (typeof type === 'string' && type.includes('->')) { add('type-mismatch', `常量 ${name} 的类型是字符串形式，kernel 口径要用嵌套数组`, name); continue; }
      try { typeOkLocal(type, baseList); } catch (error) { add('type-mismatch', `常量 ${name}：${error.message}`, name); continue; }
      constants[name] = type;
    }
  }
  const sig = { bases: baseList, constants: { ...constants } };
  const definitionNames = new Set();
  for (const [index, def] of (theory.definitions ?? []).entries()) {
    if (!def || typeof def !== 'object') { add('invalid-field', `definitions[${index}] 不是对象`); continue; }
    if (def.kind !== undefined && def.kind !== 'term') { add('unsupported', `定义 ${def.name} 的 kind 只能是 term`, def.name); continue; }
    if (definitionNames.has(def.name)) { add('duplicate-definition', `定义名重复：${def.name}`, def.name); continue; }
    if (Object.prototype.hasOwnProperty.call(constants, def.name)) { add('duplicate-definition', `定义 ${def.name} 与常量同名`, def.name); continue; }
    definitionNames.add(def.name);
    if (!Array.isArray(def.term)) { add('invalid-field', `定义 ${def.name} 缺少规范项`, def.name); continue; }
    try {
      const type = inferLocal(def.term, sig);
      if (objectFv(def.term, new Map()).size) add('invalid-field', `定义 ${def.name} 的项必须是旧语言闭项（无自由变量）`, def.name);
      else { sig.constants[def.name] = type; }
    } catch (error) {
      add(error.details?.reason ?? 'type-mismatch', `定义 ${def.name}：${error.message}`, def.name);
    }
  }
  const axiomIds = new Set();
  for (const [index, axiom] of (theory.axioms ?? []).entries()) {
    if (!axiom || typeof axiom !== 'object') { add('invalid-field', `axioms[${index}] 不是对象`); continue; }
    const id = axiom.id ?? `A${index + 1}`;
    if (axiomIds.has(id)) add('invalid-field', `公理 id 重复：${id}`, id);
    axiomIds.add(id);
    const formula = axiom.formula;
    if (!Array.isArray(formula)) { add('invalid-field', `公理 ${id} 缺少 formula`, id); continue; }
    try {
      formulaOkLocal(formula, sig);
      if (formulaFv(formula, new Map()).size) add('invalid-field', `theory.axioms 的每条必须是闭公式：${id}`, id);
    } catch (error) {
      add(error.details?.reason ?? 'type-mismatch', `公理 ${id}：${error.message}`, id);
    }
  }
  return { ok: problems.length === 0, problems };
}
