/**
 * core/formal/unify.mjs —— 一阶合一 + occurs check + 弱头规范化（§2.6）。
 *
 * 三条纪律（照规格 §2.6/§4）：
 * 1. `whnf` 只做 kernel 允许的两件事：**定义展开**（将来配一条 `definition` 步骤）与
 *    **λ 应用化简**（将来配一条 `abstraction` 公理实例）。不做任意 β、不做 η。
 * 2. `['lift', λ, 参数]` 是**刚体符号**：合一只比结构，绝不"算掉"它。把实参代进抽象体
 *    只能由 `certificate.mjs` 出一枚 `axiom`（abstraction）节点来完成。
 * 3. 合一失败必须把已写进 env 的绑定**撤回**（trail），否则一次失败会污染后续尝试。
 */

import { FormalError, V, deepEqual, isCertFormula, lift, need, openBody, typeOk } from './terms.mjs';

let metaCounter = 0;

/** 新增一个存在/全称元变量。`prefix` 只用于可读性，id 才是身份。 */
export function freshMeta(prefix = 'm', type = 'o') {
  metaCounter += 1;
  return ['?', `${prefix}#${metaCounter}`, type];
}

/** 测试用：让元变量编号可复现。 */
export function resetMetaCounter(value = 0) {
  metaCounter = value;
}

export function isMeta(t) {
  return Array.isArray(t) && t.length === 3 && t[0] === '?';
}

export function metaType(t) {
  need(isMeta(t), 'not a meta term');
  return t[2];
}

const metaId = (t) => t[1];

/** 顺着 env 走到不再是被绑定的元变量为止。 */
export function deref(t, env) {
  let current = t;
  const seen = new Set();
  while (isMeta(current) && env && env.has(metaId(current))) {
    if (seen.has(metaId(current))) break; // 环（理论上 occurs check 挡住了）；保底不空转
    seen.add(metaId(current));
    current = env.get(metaId(current));
  }
  return current;
}

/** 是否已经不含元变量。 */
export function isGround(t, env = null) {
  const node = env ? deref(t, env) : t;
  if (isMeta(node)) return false;
  if (!Array.isArray(node)) return true;
  return node.every((a) => (Array.isArray(a) ? isGround(a, env) : true));
}

/** 把所有已绑定的元变量展开（未绑定的保持原样，由调用方决定是否报错）。 */
export function applyEnv(t, env) {
  const node = deref(t, env);
  if (isMeta(node)) return node;
  if (!Array.isArray(node)) return node;
  if (node[0] === 'lift') return ['lift', node[1], node[2].map((a) => applyEnv(a, env))];
  return node.map((a) => (Array.isArray(a) ? applyEnv(a, env) : a));
}

/** 未绑定元变量的清单（诊断/统计用）。 */
export function freeMetas(t, env = new Map(), out = []) {
  const node = deref(t, env);
  if (isMeta(node)) { out.push(node); return out; }
  if (!Array.isArray(node)) return out;
  for (const a of node) if (Array.isArray(a)) freeMetas(a, env, out);
  return out;
}

/**
 * 弱头规范化。
 * - `['c',名字]` 有 term 定义 → 展开成 `['lift', λ, 参数]`；
 * - `['app', ['lam',…], x]` → `openBody(体, x)`（这一步的正当理由是一条 abstraction 公理实例）；
 * - `['app', ['lift',…], x]` **停下来**：它就是要交给 abstraction 公理的形状。
 */
export function whnf(t, sig, env = new Map(), fuel = 128) {
  let node = deref(t, env);
  if (fuel <= 0 || !Array.isArray(node)) return node;
  if (node[0] === 'c') {
    const entry = definitionFor(sig, node[1]);
    if (!entry) return node;
    return whnf(lift(entry.term, sig), sig, env, fuel - 1);
  }
  if (node[0] === 'app') {
    if (node.length !== 3) throw new FormalError('application arity', 'error');
    const f = whnf(node[1], sig, env, fuel - 1);
    if (Array.isArray(f) && f[0] === 'lam') return whnf(openBody(f[2], node[2]), sig, env, fuel - 1);
    if (Array.isArray(f) && f[0] === 'c') {
      const entry = definitionFor(sig, f[1]);
      if (entry) {
        const lifted = lift(entry.term, sig);
        if (Array.isArray(lifted) && lifted[0] === 'lift') {
          // lift 符号不能在这里化简：原样交回，由 abstraction 公理实例接手。
          return ['app', lifted, node[2]];
        }
        return whnf(['app', lifted, node[2]], sig, env, fuel - 1);
      }
    }
    return ['app', f, node[2]];
  }
  return node;
}

function definitionFor(sig, name) {
  const list = sig?.definitions ?? [];
  return list.find((d) => d.name === name && (d.kind ?? 'term') === 'term') ?? null;
}

/** 与 kernel.infer 口径一致的类型推断（元变量按自带类型处理，不参与推断）。 */
export function metaTypeCheck(t, sig) {
  if (isMeta(t)) return typeOk(t[2], sig.bases);
  return null;
}

// ---------------------------------------------------------------- 合一

function bind(env, trail, meta, value) {
  env.set(metaId(meta), value);
  trail.push(metaId(meta));
}

function occurs(id, t, env) {
  const node = deref(t, env);
  if (isMeta(node)) return metaId(node) === id;
  if (!Array.isArray(node)) return false;
  if (node[0] === 'lift') return node[2].some((a) => occurs(id, a, env));
  return node.some((a) => (Array.isArray(a) ? occurs(id, a, env) : false));
}

function unifyTerms(a0, b0, env, sig, trail, depth) {
  if (depth > 512) throw new FormalError('unification depth bound exceeded', 'resource_exhausted');
  const a = whnf(a0, sig, env);
  const b = whnf(b0, sig, env);
  if (isMeta(a)) {
    if (isMeta(b) && metaId(a) === metaId(b)) return true;
    if (occurs(metaId(a), b, env)) return false;
    bind(env, trail, a, b);
    return true;
  }
  if (isMeta(b)) {
    if (occurs(metaId(b), a, env)) return false;
    bind(env, trail, b, a);
    return true;
  }
  if (typeof a === 'string' || typeof b === 'string') return a === b;
  if (!Array.isArray(a) || !Array.isArray(b)) return a === b;
  if (a.length !== b.length) return false;
  if (a[0] !== b[0]) return false;
  switch (a[0]) {
    case 'v':
      return a[1] === b[1] && unifyTerms(a[2], b[2], env, sig, trail, depth + 1);
    case 'b':
      return a[1] === b[1] && unifyTerms(a[2], b[2], env, sig, trail, depth + 1);
    case 'c':
    case 'logic':
      return deepEqual(a, b);
    case 'lam':
      return unifyTerms(a[1], b[1], env, sig, trail, depth + 1) && unifyTerms(a[2], b[2], env, sig, trail, depth + 1);
    case 'app':
      return unifyTerms(a[1], b[1], env, sig, trail, depth + 1) && unifyTerms(a[2], b[2], env, sig, trail, depth + 1);
    case 'lift':
      // 恒等抽象不是项参数：只比结构，参数逐个合一（与 kernel.term_sub 的口径一致）。
      if (!deepEqual(a[1], b[1])) return false;
      return a[2].every((x, i) => unifyTerms(x, b[2][i], env, sig, trail, depth + 1));
    case 'all':
    case 'ex': {
      // 量词：绑定变量先重命名到同一个名字，再合一（避免捕获）。
      if (!unifyTerms(a[1][2], b[1][2], env, sig, trail, depth + 1)) return false;
      const x = V(a[1][1], a[1][2]);
      const left = substBinder(a, x);
      const right = substBinder(b, x);
      return unifyTerms(left, right, env, sig, trail, depth + 1);
    }
    case 'eq':
    case 'imp':
    case 'and':
    case 'or':
      return a.every((x, i) => (Array.isArray(x) ? unifyTerms(x, b[i], env, sig, trail, depth + 1) : x === b[i]));
    case 'false':
      return true;
    default:
      return deepEqual(a, b);
  }
}

function substBinder(f, v) {
  const binder = f[1];
  const body = f[2];
  if (binder[1] === v[1]) return body;
  const swapped = swapVar(body, binder, v);
  return swapped;
}

function swapVar(node, from, to) {
  if (deepEqual(node, from)) return to;
  if (!Array.isArray(node)) return node;
  if (node[0] === 'c' || node[0] === 'b' || (node[0] === 'v' && node[1] !== from[1])) return node;
  if (node[0] === 'lift') return ['lift', node[1], node[2].map((a) => swapVar(a, from, to))];
  return node.map((a) => (Array.isArray(a) ? swapVar(a, from, to) : a));
}

/**
 * 一阶合一。成功返回 true（env 里留下绑定），失败返回 false 并把本次新增的绑定撤回。
 * `env` 是 `Map<metaId, term>`。
 */
export function unify(a, b, env = new Map(), sig = { bases: ['o'], constants: {} }) {
  const trail = [];
  let ok = false;
  try {
    ok = unifyTerms(a, b, env, sig, trail, 0);
  } catch (error) {
    /*
     * 只吞「形状对不上、合并不成立」这一种（`unifyTerms` 本来就用返回值表达失败）。
     *
     * 预算类错误（`resource_exhausted`：合一深度上限）与超时必须**往上抛**：
     * 从前 `catch { ok = false }` 把它折成"这条事实不匹配"，唯一调用点
     * （`search.mjs` 的全称事实匹配）于是继续试下一条，最后以 `undecided` 收场——
     * 预算耗尽被静默吞掉，既没有 timeout 也没有留痕。这不是"合一失败"，是"没算完"。
     */
    if (error instanceof FormalError && (error.status === 'resource_exhausted' || error.status === 'timeout')) throw error;
    if (!(error instanceof FormalError)) throw error;
    ok = false;
  }
  if (!ok) for (const id of trail) env.delete(id);
  return ok;
}

/** 判断一个节点是「认证公式」还是「对象项」，供 search 决定要不要包 B(·)。 */
export function asGoalFormula(node, sig) {
  if (isCertFormula(node)) return { formula: node, objectConclusion: undefined };
  return { formula: ['eq', node, ['logic', 'true']], objectConclusion: node };
}
