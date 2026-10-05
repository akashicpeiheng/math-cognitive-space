/**
 * core/formal/terms.mjs —— 对象项与认证公式的项操作层。
 *
 * **唯一权威是 `mcs-foundations/validation/certification/kernel.py`**：这里的每个函数
 * 都与它的同名函数逐条对应（`source` / `infer` / `object_fv` / `object_substitute` /
 * `parameters` / `lift` / `open_body` / `term_type` / `term_fv` / `formula_ok` /
 * `formula_fv` / `term_sub` / `fsub` / `fcode` / `same`）。行为对不上时**改本文件**，
 * 不动 kernel.py；对拍由 `tests/formal-language.test.mjs` 与
 * `tests/relation-engine.test.mjs` 里的 python 子进程核对承担。
 *
 * 与 kernel 的命名差异只有「加前缀避免歧义」这一条：
 *   `source` → `sourceTerm`，`infer` → `inferTerm`，`object_fv` → `objectFv`，
 *   `same` → `sameFormula`。其余同名同义。
 *
 * 数据形状（与 kernel 的 JSON 线格式一致）：
 *   类型  := 'o' | 'N' | … | ['->', 类型, 类型]
 *   对象项 := ['v',名,类型] | ['b',序号,类型] | ['c',名] | ['logic',名] | ['logic',名,类型]
 *          | ['app',项,项] | ['lam',类型,体] | ['lift',规范λ项,[参数项…]]
 *   公式   := ['eq',项,项] | ['false'] | [('and'|'or'|'imp'),公式,公式]
 *          | [('all'|'ex'),['v',名,类型],公式]
 *
 * `sig` = `{ bases: string[], constants: { 名: 类型 }, definitions?: [{kind:'term',name,term}] }`。
 * kernel 的 `environment()` 把 definitions 单独放在一个映射里；这里把**定义项**一并挂在
 * `sig.definitions` 上，供 `normalizeTerm` / whnf 展开用（展开出来的等式仍由
 * `core/formal/certificate.mjs` 按 kernel 的 `definition` 规则原样重建）。
 */

/** kernel 的 CheckError：带 `status`，供 search/judgment 映射成运行状态。 */
export class FormalError extends Error {
  constructor(message, status = 'failed') {
    super(message);
    this.name = 'FormalError';
    this.status = status;
  }
}

export function need(condition, message, status = 'failed') {
  if (!condition) throw new FormalError(message, status);
  return true;
}

// ---------------------------------------------------------------- 构造器

export const arr = (a, b) => ['->', a, b];
export const V = (name, type) => ['v', name, type];
export const C = (name) => ['c', name];
export const L = (name, type) => (type === undefined ? ['logic', name] : ['logic', name, type]);
export const App = (f, x) => ['app', f, x];
export const Eq = (t, u) => ['eq', t, u];
export const Imp = (a, b) => ['imp', a, b];
export const And = (a, b) => ['and', a, b];
export const Or = (a, b) => ['or', a, b];
export const All = (v, p) => ['all', v, p];
export const Ex = (v, p) => ['ex', v, p];
export const Falsity = () => ['false'];
/** B(t) := (t = true)：把类型为 o 的对象项译成认证公式。 */
export const B = (t) => Eq(t, L('true'));
/** Iff(a,b) := (a⇒b) ∧ (b⇒a)：与 kernel 的 Iff 同形，不引入新连接词。 */
export const Iff = (a, b) => And(Imp(a, b), Imp(b, a));

const CONNECTIVES = new Set(['imp', 'and', 'or']);
const QUANTIFIERS = new Set(['all', 'ex']);
const FORMULA_HEADS = new Set(['eq', 'false', 'imp', 'and', 'or', 'all', 'ex']);

/** 区分认证公式与对象项（§0.3：两者不能混用）。 */
export function isCertFormula(node) {
  return Array.isArray(node) && typeof node[0] === 'string' && FORMULA_HEADS.has(node[0]);
}

const isStr = (x) => typeof x === 'string';
const isArr = (x) => Array.isArray(x);

/** 结构化深比较（Python 的 `==`）。term 里只有字符串/数字/数组，够用。 */
export function deepEqual(a, b) {
  if (a === b) return true;
  if (isStr(a) || isStr(b) || typeof a === 'number' || typeof b === 'number') return false;
  if (!isArr(a) || !isArr(b) || a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) if (!deepEqual(a[i], b[i])) return false;
  return true;
}

// ---------------------------------------------------------------- 签名归一

const TEXT_TYPE = /\s|->|→|⇒/;

/**
 * 把各种来源的「签名」归一成 kernel 口径的 `sig`。
 *
 * 为什么需要它：站内至少有两种「签名」，长得像但不是一回事——
 * - **解析层签名**（`backgrounds.backgroundSignature(id)`）：`constants` 的值是**源码文本**
 *   （`'(G -> G -> G) -> o'`），给 `parseFormula` 用的；
 * - **kernel 口径签名**：`constants` 的值必须是**已解析的类型节点**
 *   （`['->', 'G', ['->','G','o']]`），给 `formula_ok` / `term_type` 用的。
 *
 * 把解析层签名喂进来时，kernel 的 `infer` 对常量**不做类型检查**（只查名字），
 * 于是错误会在很远的 `application type mismatch` 处以看不懂的形式爆出来。
 * 这里提前给出指名道姓的错误，并指向唯一正确的入口：
 * `kernelInputForBackground()` → `theory.buildKernelTheory()` → `signatureOfTheory()`。
 *
 * **形状已经对了就原样返回同一个对象**（不复制）。这条很要紧：装配器是
 * 「边推断、边往 `sig.constants` / `sig.definitions` 里登记」的，一旦这里返回副本，
 * 后面的登记就写在了副本之外，缓存/比较会看到两个不一致的 sig。
 */
export function normalizeSig(sig) {
  need(sig && typeof sig === 'object' && !isArr(sig), 'sig 必须是对象', 'error');
  requireNoSpecShape(sig);
  let constants = sig.constants ?? sig.signature ?? null;
  let coerced = false;
  if (constants instanceof Map) {
    constants = Object.fromEntries(constants);
    coerced = true;
  } else if (isArr(constants)) {
    constants = Object.fromEntries(constants.map((c) => [c?.name ?? c?.[0], c?.type ?? c?.[1]]));
    coerced = true;
  }
  if (constants === null || constants === undefined) {
    constants = {};
    coerced = true;
  }
  need(typeof constants === 'object' && !isArr(constants), 'sig.constants 必须是「名字 → 类型节点」对象', 'error');
  for (const [name, type] of Object.entries(constants)) {
    if (isStr(type) && TEXT_TYPE.test(type)) {
      throw new FormalError(
        `sig.constants.${name} 的类型是源码文本「${type}」，这是**解析层签名**（backgroundSignature 的形状）。`
        + 'kernel 口径的 sig 需要已解析的类型节点；请走 kernelInputForBackground() → buildKernelTheory() → signatureOfTheory()',
        'error',
      );
    }
  }
  const basesGiven = isArr(sig.bases) && sig.bases.length > 0;
  const definitionsGiven = isArr(sig.definitions);
  if (!coerced && basesGiven && definitionsGiven) return sig;
  return {
    ...sig,
    bases: basesGiven ? sig.bases : ['o'],
    constants,
    definitions: definitionsGiven ? sig.definitions : [],
  };
}

function requireNoSpecShape(sig) {
  const specish = ['declarations', 'statement', 'assumptions', 'claims', 'specVersion'];
  if (sig.constants !== undefined || sig.signature !== undefined) return;
  const hit = specish.find((key) => sig[key] !== undefined);
  if (hit) {
    throw new FormalError(
      `这看起来是 formalSpec（含 ${hit}），不是 kernel 口径的 sig。`
      + '请先用 buildKernelTheory(specs, { axioms }) 装配理论，再用 signatureOfTheory(theory) 取 sig',
      'error',
    );
  }
}

/**
 * 归一结果的记忆表（同一个 sig 对象只体检一次）。
 *
 * 为什么要缓存：`ensureSig` 挂在 `inferTerm` 上，是热路径；而**完整**体检要遍历
 * `constants` 判断「类型是不是源码文本」。不缓存就得在「快但查不出问题」与
 * 「查得出问题但每次都要 O(常量数)」之间二选一——两个都不能要。
 *
 * 契约：本层的模块**不修改**传进来的 sig；若调用方在归一之后又往 `sig.constants`
 * 里塞了新常量，请换一个新对象（否则缓存会认为它已经体检过）。
 */
const normalizedSigs = new WeakMap();

/**
 * 已经是归一形状就直接用，否则走 `normalizeSig`；同一个对象只体检一次。
 * 返回的可能是**新的** sig 对象（原对象只读，不会被改）。
 */
export function ensureSig(sig) {
  if (!sig || typeof sig !== 'object' || isArr(sig)) return normalizeSig(sig);
  const cached = normalizedSigs.get(sig);
  if (cached) return cached;
  const normalized = normalizeSig(sig);
  normalizedSigs.set(sig, normalized);
  normalizedSigs.set(normalized, normalized);
  return normalized;
}

/**
 * kernel theory 对象 → 本层要的 `sig`。
 *
 * `theory.constants` **不含**定义名（kernel 要求 `nonfresh definition` 检查通过），
 * 但定义名在推断/检查时必须能当常量用；kernel 自己是在 `environment()` 里逐个加进去的，
 * 这里复刻同一顺序：先 `source`（此时名字还没登记），再 `infer`，然后登记类型。
 */
export function signatureOfTheory(theory) {
  need(theory && typeof theory === 'object', 'signatureOfTheory 需要 kernel theory 对象', 'error');
  const bases = isArr(theory.bases) && theory.bases.length ? [...theory.bases] : ['o'];
  const constants = { ...(theory.constants ?? {}) };
  const definitions = [];
  const sig = { bases, constants, definitions };
  for (const entry of theory.definitions ?? []) {
    need(entry && entry.name && entry.term, 'theory.definitions 里每条都需要 name 与已解析的 term', 'error');
    need(entry.kind === undefined || entry.kind === 'term', '首版只支持 term 定义', 'unsupported');
    const term = sourceTerm(entry.term, sig);
    constants[entry.name] = inferTerm(term, sig);
    definitions.push({ kind: 'term', name: entry.name, term });
  }
  return sig;
}

// ---------------------------------------------------------------- 类型

export function typeOk(t, bases) {
  if (isStr(t)) {
    need(bases.includes(t), `undeclared base type: ${t}`); // undeclared base type
  } else {
    need(isArr(t) && t.length === 3 && t[0] === '->', 'invalid type');
    typeOk(t[1], bases);
    typeOk(t[2], bases);
  }
  return t;
}

export function logicalType(t, bases) {
  const op = t[1];
  if (['true', 'false', 'not', 'and', 'or', 'imp'].includes(op)) {
    need(t.length === 2, 'unexpected logical parameter');
    return {
      true: 'o', false: 'o', not: arr('o', 'o'),
      and: arr('o', arr('o', 'o')), or: arr('o', arr('o', 'o')), imp: arr('o', arr('o', 'o')),
    }[op];
  }
  need(['eq', 'all', 'ex'].includes(op) && t.length === 3, 'unknown logical constant');
  const a = typeOk(t[2], bases);
  return op === 'eq' ? arr(a, arr(a, 'o')) : arr(arr(a, 'o'), 'o');
}

// ---------------------------------------------------------------- 变量表

export function mergeVars(...maps) {
  const result = {};
  for (const m of maps) {
    for (const [n, t] of Object.entries(m)) {
      need(!(n in result) || deepEqual(result[n], t), `inconsistent free variable type: ${n}`);
      result[n] = t;
    }
  }
  return result;
}

export function objectFv(t) {
  if (t[0] === 'v') return { [t[1]]: t[2] };
  if (t[0] === 'app') return mergeVars(objectFv(t[1]), objectFv(t[2]));
  if (t[0] === 'lam') return objectFv(t[2]);
  return {};
}

/** kernel.term_fv：认证项的自由变量（`lift` 只算它的参数）。 */
export function termFvCert(t) {
  if (t[0] === 'v') return { [t[1]]: t[2] };
  if (t[0] === 'app') return mergeVars(termFvCert(t[1]), termFvCert(t[2]));
  if (t[0] === 'lift') return mergeVars(...t[2].map((u) => termFvCert(u)));
  return {};
}

/** §2.3 的 `termFv` 别名：= kernel.term_fv。 */
export const termFv = termFvCert;

export function allNames(x) {
  if (!isArr(x)) return new Set();
  if (x.length && x[0] === 'v') return new Set([x[1]]);
  const out = new Set();
  for (const a of x) for (const n of allNames(a)) out.add(n);
  return out;
}

/** kernel.fresh：按 z0, z1, … 取名，避开 `names`（只比名字，不比类型）。 */
export function fresh(names) {
  let i = 0;
  const has = (n) => (names instanceof Set ? names.has(n) : names.includes(n));
  while (has(`z${i}`)) i += 1;
  return `z${i}`;
}

// ---------------------------------------------------------------- 规范化

/** kernel.canonical：具名源项 → 规范项（de Bruijn 绑定）。 */
export function canonical(t, env = []) {
  need(isArr(t) && t.length > 0 && isStr(t[0]), 'invalid object term');
  const k = t[0];
  if (k === 'lambda') {
    need(t.length === 4 && isStr(t[1]), 'invalid named abstraction');
    return ['lam', t[2], canonical(t[3], [[t[1], t[2]], ...env])];
  }
  if (k === 'v') {
    need(t.length === 3 && isStr(t[1]), 'invalid variable');
    for (let i = 0; i < env.length; i += 1) {
      const [name, ty] = env[i];
      if (name === t[1]) {
        need(deepEqual(ty, t[2]), 'bound variable type mismatch');
        return ['b', i, t[2]];
      }
    }
    return t;
  }
  if (k === 'lam') {
    need(t.length === 3, 'invalid canonical abstraction');
    return ['lam', t[1], canonical(t[2], [[null, t[1]], ...env])];
  }
  if (k === 'app') {
    need(t.length === 3, 'invalid application');
    return App(canonical(t[1], env), canonical(t[2], env));
  }
  need(['b', 'c', 'logic'].includes(k), 'unsupported object syntax');
  return t;
}

// ---------------------------------------------------------------- 推断

export function inferTerm(t, sig, bound = []) {
  sig = ensureSig(sig); // 解析层签名/缺字段的签名在这里就被拦下并给出可读错误
  need(isArr(t) && t.length > 0, 'invalid term');
  const k = t[0];
  if (k === 'v') {
    need(t.length === 3 && isStr(t[1]) && t[1] && !(t[1] in sig.constants), 'invalid/overlapping variable');
    return typeOk(t[2], sig.bases);
  }
  if (k === 'b') {
    need(t.length === 3 && Number.isInteger(t[1]) && t[1] >= 0 && t[1] < bound.length, 'dangling bound variable');
    need(deepEqual(t[2], bound[t[1]]), 'bound sort mismatch');
    return t[2];
  }
  if (k === 'c') {
    need(t.length === 2 && t[1] in sig.constants, 'undeclared constant');
    return sig.constants[t[1]];
  }
  if (k === 'logic') return logicalType(t, sig.bases);
  if (k === 'app') {
    need(t.length === 3, 'application arity');
    const f = inferTerm(t[1], sig, bound);
    const x = inferTerm(t[2], sig, bound);
    need(isArr(f) && f[0] === '->' && deepEqual(f[1], x), 'application type mismatch');
    return f[2];
  }
  if (k === 'lam') {
    need(t.length === 3, 'abstraction arity');
    const a = typeOk(t[1], sig.bases);
    return arr(a, inferTerm(t[2], sig, [a, ...bound]));
  }
  throw new FormalError(`object term constructor not supported: ${k}`, 'unsupported');
}

/** kernel.source：规范 + 类型检查 + 自由变量一致性检查。 */
export function sourceTerm(t, sig) {
  const c = canonical(t);
  inferTerm(c, sig);
  objectFv(c);
  return c;
}

// ---------------------------------------------------------------- 移位 / 开体

export function shift(t, amount, cutoff = 0) {
  if (t[0] === 'b') return ['b', t[1] >= cutoff ? t[1] + amount : t[1], t[2]];
  if (t[0] === 'app') return App(shift(t[1], amount, cutoff), shift(t[2], amount, cutoff));
  if (t[0] === 'lam') return ['lam', t[1], shift(t[2], amount, cutoff + 1)];
  return t;
}

/** kernel.open_body：把 λ 体里第 depth 层的绑定换成 value（这是唯一被 kernel 允许的 β）。 */
export function openBody(body, value, depth = 0) {
  if (body[0] === 'b') {
    if (body[1] === depth) return shift(value, depth);
    return ['b', body[1] > depth ? body[1] - 1 : body[1], body[2]];
  }
  if (body[0] === 'app') return App(openBody(body[1], value, depth), openBody(body[2], value, depth));
  if (body[0] === 'lam') return ['lam', body[1], openBody(body[2], value, depth + 1)];
  return body;
}

// ---------------------------------------------------------------- 替换

/** kernel.object_substitute：自由变量 v 上代 u（捕获避免，走 shift）。 */
export function substituteObject(t, v, u, sig) {
  const tt = sourceTerm(t, sig);
  const uu = sourceTerm(u, sig);
  need(deepEqual(inferTerm(v, sig), inferTerm(uu, sig)), 'substitution type mismatch');
  need(v[0] === 'v', 'substitution variable required');
  const sub = (a, depth = 0) => {
    if (deepEqual(a, v)) return shift(uu, depth);
    if (a[0] === 'app') return App(sub(a[1], depth), sub(a[2], depth));
    if (a[0] === 'lam') return ['lam', a[1], sub(a[2], depth + 1)];
    return a;
  };
  return sourceTerm(sub(tt), sig);
}

/** kernel.parameters：规范序（`sorted(..., key=stable)`）的自由变量表。 */
export function parameters(a) {
  const entries = Object.entries(objectFv(a));
  const nodes = entries.map(([n, t]) => V(n, t));
  // kernel 用 pyStableString 作排序键；`['v',名,类型]` 的稳定串只由这三段组成，
  // 这里直接按同一口径生成键，避免为一个纯排序去依赖 codec 的序列化实现。
  return nodes.sort((x, y) => (stableVarKey(x) < stableVarKey(y) ? -1 : stableVarKey(x) > stableVarKey(y) ? 1 : 0));
}

/** `['v',名,类型]` 的 python `json.dumps(sort_keys=True, separators=(',',':'))` 文本（转义口径同 ensure_ascii）。 */
export function stableVarKey(node) {
  return `[${jsonText(node[0])},${jsonText(node[1])},${jsonText(node[2])}]`;
}

function jsonText(value) {
  if (isStr(value)) {
    let out = '"';
    for (const ch of value) {
      const code = ch.codePointAt(0);
      if (ch === '"') out += '\\"';
      else if (ch === '\\') out += '\\\\';
      else if (code > 0xffff) {
        const h = Math.floor((code - 0x10000) / 0x400) + 0xd800;
        const l = ((code - 0x10000) % 0x400) + 0xdc00;
        out += `\\u${h.toString(16)}\\u${l.toString(16)}`;
      } else if (code > 0x7f) out += `\\u${code.toString(16).padStart(4, '0')}`;
      else if (code < 0x20) out += `\\u${code.toString(16).padStart(4, '0')}`;
      else out += ch;
    }
    return `${out}"`;
  }
  if (isArr(value)) return `[${value.map(jsonText).join(',')}]`;
  return String(value);
}

/** kernel.lift：λ 变成 `['lift',λ,参数表]`，其余结构下钻（参数必须生成时就填好）。 */
export function lift(t, sig) {
  const tt = sourceTerm(t, sig);
  if (tt[0] === 'lam') return ['lift', tt, parameters(tt)];
  if (tt[0] === 'app') return App(lift(tt[1], sig), lift(tt[2], sig));
  return tt;
}

// ---------------------------------------------------------------- 认证项 / 公式

/** kernel.term_type：认证项的类型（含 `lift` 的参数核对）。 */
export function termType(t, sig) {
  need(isArr(t) && t.length > 0, 'invalid certification term');
  if (t[0] === 'lift') {
    need(t.length === 3 && isArr(t[2]), 'lift arity');
    const a = sourceTerm(t[1], sig);
    need(deepEqual(a, t[1]) && a[0] === 'lam', 'lift identity must be canonical abstraction structure');
    const ps = parameters(a);
    need(ps.length === t[2].length, 'lift parameter arity');
    for (let i = 0; i < ps.length; i += 1) {
      need(deepEqual(ps[i][2], termType(t[2][i], sig)), 'lift parameter sort/order mismatch');
    }
    return inferTerm(a, sig);
  }
  if (t[0] === 'app') {
    need(t.length === 3, 'app arity');
    const f = termType(t[1], sig);
    const u = termType(t[2], sig);
    need(isArr(f) && f[0] === '->' && deepEqual(f[1], u), 'sorted app mismatch');
    return f[2];
  }
  need(['v', 'c', 'logic'].includes(t[0]), 'object/certification language confusion');
  return inferTerm(t, sig);
}

export function formulaOk(f, sig) {
  sig = ensureSig(sig);
  need(isArr(f) && f.length > 0, 'invalid certification formula');
  const k = f[0];
  if (k === 'false') need(f.length === 1, 'false arity');
  else if (k === 'eq') {
    need(f.length === 3, 'equality arity');
    need(deepEqual(termType(f[1], sig), termType(f[2], sig)), 'equality sort mismatch');
    mergeVars(termFvCert(f[1]), termFvCert(f[2]));
  } else if (CONNECTIVES.has(k)) {
    need(f.length === 3, 'connective arity');
    formulaOk(f[1], sig);
    formulaOk(f[2], sig);
  } else if (QUANTIFIERS.has(k)) {
    need(f.length === 3 && isArr(f[1]) && f[1][0] === 'v', 'quantifier binder');
    inferTerm(f[1], sig);
    formulaOk(f[2], sig);
    const fv = formulaFv(f[2]);
    need(!(f[1][1] in fv) || deepEqual(fv[f[1][1]], f[1][2]), 'binder sort clash');
  } else throw new FormalError(`unsupported certification formula: ${k}`, 'unsupported');
  formulaFv(f);
  return f;
}

export function formulaFv(f) {
  const k = f[0];
  if (k === 'eq') return mergeVars(termFvCert(f[1]), termFvCert(f[2]));
  if (CONNECTIVES.has(k)) return mergeVars(formulaFv(f[1]), formulaFv(f[2]));
  if (QUANTIFIERS.has(k)) {
    const body = formulaFv(f[2]);
    const out = {};
    for (const [n, t] of Object.entries(body)) if (n !== f[1][1]) out[n] = t;
    return out;
  }
  return {};
}

/** kernel.term_sub：替换认证项里的自由变量；**不进入 `lift` 内部的抽象**（§4 的坑）。 */
export function termSub(t, v, u) {
  if (deepEqual(t, v)) return u;
  if (t[0] === 'app') return App(termSub(t[1], v, u), termSub(t[2], v, u));
  // lift 符号里存的恒等抽象不是项参数，只替换参数表。
  if (t[0] === 'lift') return ['lift', t[1], t[2].map((a) => termSub(a, v, u))];
  return t;
}

/** kernel.fsub：公式替换（量词捕获避免，重命名规则与 kernel 一字不差）。 */
export function fsub(f, v, u) {
  const k = f[0];
  if (k === 'eq') return Eq(termSub(f[1], v, u), termSub(f[2], v, u));
  if (CONNECTIVES.has(k)) return [k, fsub(f[1], v, u), fsub(f[2], v, u)];
  if (QUANTIFIERS.has(k)) {
    if (deepEqual(f[1], v)) return f;
    let binder = f[1];
    let body = f[2];
    if (binder[1] in termFvCert(u)) {
      const renamed = V(fresh(new Set([...allNames(f), ...allNames(u), v[1]])), binder[2]);
      body = fsub(body, binder, renamed);
      binder = renamed;
    }
    return [k, binder, fsub(body, v, u)];
  }
  return f;
}

/** kernel.fcode：把绑定量词变量换成 de Bruijn 式的 `['bound',序号,类型]`。 */
export function fcode(f, env = []) {
  const tc = (t) => {
    if (t[0] === 'v') {
      for (let i = 0; i < env.length; i += 1) if (deepEqual(t, env[i])) return ['bound', i, t[2]];
    }
    if (t[0] === 'app') return ['app', tc(t[1]), tc(t[2])];
    if (t[0] === 'lift') return ['lift', t[1], t[2].map((a) => tc(a))];
    return t;
  };
  if (f[0] === 'eq') return Eq(tc(f[1]), tc(f[2]));
  if (CONNECTIVES.has(f[0])) return [f[0], fcode(f[1], env), fcode(f[2], env)];
  if (QUANTIFIERS.has(f[0])) return [f[0], f[1][2], fcode(f[2], [f[1], ...env])];
  return f;
}

/** kernel.same：α 规范比较。 */
export function sameFormula(a, b) {
  return deepEqual(fcode(a), fcode(b));
}

/** kernel.close：`∀v1. ∀v2. … f`。 */
export function close(vs, f) {
  let out = f;
  for (let i = vs.length - 1; i >= 0; i -= 1) out = All(vs[i], out);
  return out;
}

/** 公式的规范键（去重/记忆化用；与 kernel.same 同口径）。 */
export function formulaKey(f) {
  return JSON.stringify(fcode(f));
}

// ---------------------------------------------------------------- 弱规范化

/**
 * 弱 head-normal 化简：只做 kernel 允许的两件事——
 * 定义展开（`definition` 步骤）与 λ 应用化简（必须能配一条 `abstraction` 公理实例）。
 * 不做任意 β、不做 η，也不在无法给出理由时"顺手"化简。
 */
export function normalizeTerm(t, sig, fuel = 64) {
  if (fuel <= 0) return t;
  need(isArr(t) && t.length > 0, 'invalid term');
  if (t[0] === 'app') {
    const f = normalizeTerm(t[1], sig, fuel - 1);
    if (isArr(f) && f[0] === 'lam') return normalizeTerm(openBody(f[2], t[2]), sig, fuel - 1);
    if (isArr(f) && f[0] === 'c') {
      const entry = (sig.definitions ?? []).find((d) => d.name === f[1]);
      if (entry) return normalizeTerm(lift(entry.term, sig), sig, fuel - 1);
    }
    return App(f, t[2]);
  }
  if (t[0] === 'c') {
    const entry = (sig.definitions ?? []).find((d) => d.name === t[1]);
    if (entry) return normalizeTerm(lift(entry.term, sig), sig, fuel - 1);
  }
  return t;
}

// ---------------------------------------------------------------- 项池辅助

/** 收集一个项/公式里出现的所有子项（供 all_e / ex_i 选实例项）。 */
export function subterms(node, out = []) {
  if (!isArr(node)) return out;
  out.push(node);
  if (node[0] === 'lift') {
    out.push(node[1]);
    for (const a of node[2]) subterms(a, out);
    return out;
  }
  for (const a of node) if (isArr(a)) subterms(a, out);
  return out;
}

/** 在公式/项里找 `lhs` 的出现位置数（eq_e 的替换点；口径与 kernel.term_sub 相同）。 */
export function countOccurrences(node, lhs, limit = Infinity) {
  let count = 0;
  const walk = (n) => {
    if (count >= limit) return;
    if (deepEqual(n, lhs)) { count += 1; return; }
    if (!isArr(n)) return;
    if (n[0] === 'app') { walk(n[1]); walk(n[2]); return; }
    if (n[0] === 'lift') { for (const a of n[2]) walk(a); return; }
    for (const a of n) if (isArr(a)) walk(a);
  };
  walk(node);
  return count;
}
