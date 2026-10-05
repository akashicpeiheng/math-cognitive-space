/**
 * core/formal/search.mjs —— 有界证明搜索（§2.8）。
 *
 * 输入：一个认证公式目标 + 一个程序（局部假设 + 带理由的子句条目）。
 * 输出：一棵 **QueryProof**（§2.8.1）——不直接生成 ND 步骤，装配交给 `certificate.mjs`。
 *
 * 目标可以是**已解析的认证公式**、**对象项**（自动包成 `B(t)`），也可以是**源码字符串**
 * （用 `options.language ?? 懒装载 './language.mjs'` 的 `parseFormula` 解析）；
 * `options.variables`（`{ 名: 类型 }`）声明目标源码里的自由参数，字符串类型走 `parseType` 归一。
 * 解析失败一律 `status:'error'`（不是 unsupported），并把语言层报的**行列位置**写进 `reason`。
 * 程序里的 `formula` / `conclusion` 同样允许给源码字符串——判定器（`judges/*.mjs`）
 * 传的就是源码，这一层不替它们保留第二套口径。
 *
 * 算法（两段，每一步都能在 kernel 规则里找到理由）：
 *
 * 1. **结构化后向规则**（ND 的形状）：目标是合取 → `and_i`；是蕴含 → 临时假设 `assume`
 *    + `imp_i`；是全称 → 本征变量 + `all_i`；是存在 → 试实例项 + `ex_i`；存在式前件
 *    另加一条 case 假设 + `ex_e` 收口（本征变量泄漏检查留给 kernel）。
 * 2. **前向饱和**（定子句层）：把作用域里的事实按有理由的派生规则闭包——
 *    合取消去、蕴含消去、全称消去（在项池上实例化）、
 *    背景公理模式的桥（`logic:and/imp`、`equality`、`quantifier`）、
 *    等式的定向重写（`eq_e`，含对称化）、定义展开（`definition`）、
 *    λ 应用化简（一条 `abstraction` 公理实例 + `all_e`）。
 *
 * 原子目标先查饱和后的闭包；查不到再用合一去匹配全称事实（`all_e` 的实例项由合一给出）。
 *
 * 状态口径（§2.8）：`proved | undecided | unsupported | timeout | error`。
 * **`refuted` 不由搜索产生**——反证只来自 §2.12 的有限语义。
 * 预算耗尽（深度/状态/步数/时间）一律 `timeout`；空间在预算内穷尽 → `undecided`。
 *
 * 诚实边界（写进代码，不许含糊）：
 * - 不做一般高阶合一、不做 η、不做任意 β；`['lift',λ,参数]` 是刚体符号，
 *   化简只能靠 `abstraction` 公理实例；
 * - `term_sub` 不进 `lift` 内部，所以**参数必须在生成时就填好**，搜索阶段不"事后填参数"；
 * - 析取与 `false` 直接 `unsupported`；找不到证明只报 `undecided`，绝不报"假"。
 */

import { createRequire } from 'node:module';

import { MAX_STEPS } from './codec.mjs';
import {
  App, B, C, Eq, FormalError, L, V, allNames, deepEqual, ensureSig, formulaKey,
  formulaOk, fsub, isCertFormula, lift, need, sameFormula, subterms, termType,
} from './terms.mjs';
import { applyEnv, deref, freshMeta, isGround, isMeta, unify } from './unify.mjs';
import { atomsOf, clauseToFormula, clausifyFormula } from './clauses.mjs';
import {
  abstractionInstance, allElim, allIntro, andElimLeft, andElimRight, andIntro, axiomNode,
  definitionNode, eqRewrite, exElim, exIntro, hypothesisNode, impElim, impIntro, lemmaNode,
  reflNode, theoryNode,
} from './certificate.mjs';

export const SEARCH_STATUSES = ['proved', 'undecided', 'unsupported', 'timeout', 'error'];

const require = createRequire(import.meta.url);

// ---------------------------------------------------------------- 源码目标入口

let languageModule;

/**
 * 语言层（`language.mjs`）的懒装载：`options.language` 优先，其次 `require('./language.mjs')`。
 *
 * 为什么懒：搜索器本身不依赖语言层（拿到的可以已经是解析好的公式树），
 * 而 `discovery.mjs` 那一层也是这么装载引擎的——两处口径一致，缺语言层时
 * 只有「源码目标」这一条路走不通，其余路径照常。
 */
function languageLayer(options) {
  if (options?.language) return options.language;
  if (languageModule === undefined) {
    try {
      languageModule = require('./language.mjs');
    } catch {
      languageModule = null;
    }
  }
  return languageModule;
}

/**
 * `options.variables` 归一成 `{ 名: 规范类型节点 }`。
 * 字符串类型一律走语言层的 `parseType`（别名、右结合、括号都按 §1.1 处理），
 * 这样 `'ℕ'`、`'G -> G -> G'` 与已解析的类型节点等价。
 */
function normalizeVariables(raw, language) {
  const out = {};
  if (raw === undefined || raw === null) return out;
  const entries = raw instanceof Map ? [...raw.entries()] : Object.entries(raw);
  for (const [name, type] of entries) {
    need(typeof name === 'string' && name.length > 0, 'options.variables 的名字必须是非空字符串', 'error');
    if (typeof type === 'string') {
      need(language && typeof language.parseType === 'function',
        'options.variables 的类型是源码字符串，需要 core/formal/language.mjs 的 parseType（或 options.language）', 'error');
      try {
        out[name] = language.parseType(type);
      } catch (error) {
        throw new FormalError(`options.variables[${name}] 的类型源码解析失败：${error?.message ?? error}`, 'error');
      }
    } else {
      need(Array.isArray(type), `options.variables[${name}] 的类型必须是类型节点或源码字符串`, 'error');
      out[name] = type;
    }
  }
  return out;
}

/** `['c',名]` → `['v',名,类型]`（只动 names 里点名的自由变量，绑定变量早已是别的形状）。 */
function freeUpTerm(node, names) {
  if (!Array.isArray(node)) return node;
  switch (node[0]) {
    case 'c': return names.has(node[1]) ? V(node[1], names.get(node[1])) : node;
    case 'app': return App(freeUpTerm(node[1], names), freeUpTerm(node[2], names));
    case 'lam': return ['lam', node[1], freeUpTerm(node[2], names)];
    // lift 的抽象体里可以有自由变量（group 证书的 `lift(λx. mul g x, [g])` 就是这样），参数表也要换。
    case 'lift': return ['lift', freeUpTerm(node[1], names), node[2].map((arg) => freeUpTerm(arg, names))];
    default: return node;
  }
}

function freeUpFormula(node, names) {
  if (!Array.isArray(node) || node.length === 0) return node;
  switch (node[0]) {
    case 'eq': return Eq(freeUpTerm(node[1], names), freeUpTerm(node[2], names));
    case 'and': case 'or': case 'imp': return [node[0], freeUpFormula(node[1], names), freeUpFormula(node[2], names)];
    case 'all': case 'ex': return [node[0], node[1], freeUpFormula(node[2], names)]; // 绑定名不动
    default: return node;
  }
}

/**
 * 把**源码字符串**解析成认证公式。
 *
 * 自由参数怎么进类型环境：语言层按 `constants` 认符号，所以先把 `options.variables`
 * 并进解析用的常量表（这样 `mul(g, x)` 才推得出类型），解析完再把**这些名字的自由出现**
 * 由 `['c',名]` 改写成 `['v',名,类型]`。绑定出现不受影响——量词/λ 绑的名字在
 * `resolveIdentifier` 里先于常量解析，从来不会变成 `['c',…]`。
 * 与理论常量同名的自由变量直接拒绝：那是「同名不同物」，不能靠改写蒙过去（§1.6 同一条纪律）。
 */
export function parseSourceFormula(source, options, sig) {
  const language = languageLayer(options);
  need(language && typeof language.parseFormula === 'function',
    '字符串目标需要 core/formal/language.mjs 的 parseFormula（或 options.language）', 'error');
  const variables = normalizeVariables(options.variables, language);
  for (const name of Object.keys(variables)) {
    need(!(name in (sig?.constants ?? {})), `自由变量 ${name} 与理论常量同名：同名不同物，拒绝解析`, 'error');
  }
  const names = new Map(Object.entries(variables));
  const ctx = {
    bases: sig?.bases ?? ['o'],
    constants: { ...variables, ...(sig?.constants ?? {}) },
    definitions: sig?.definitions ?? [],
    variables,
    strict: options.strict,
    backgrounds: options.backgrounds,
    background: options.background,
  };
  let formula;
  try {
    formula = language.parseFormula(source, ctx);
  } catch (error) {
    const details = error?.details ?? {};
    const where = details.line === undefined || details.line === null
      ? ''
      : `（第 ${details.line} 行第 ${details.column ?? '?'} 列${details.token === undefined || details.token === null ? '' : `，记号 ${JSON.stringify(details.token)}`}）`;
    // 语言层明确标了 unsupported（例如析取）就照实透传，其余一律是输入错误。
    const status = details.reason === 'unsupported' ? 'unsupported' : 'error';
    throw new FormalError(`目标源码解析失败${where}：${error?.message ?? error}`, status);
  }
  const formula2 = names.size ? freeUpFormula(formula, names) : formula;
  formulaOk(formula2, sig);
  return formula2;
}

/** 程序条目里的源码字符串同样先解析（判定器传的就是源码）。 */
function resolveProgram(program, options, sig) {
  if (!program || typeof program !== 'object') return { hypotheses: [], clauses: [] };
  const parseIfSource = (value) => (typeof value === 'string' ? parseSourceFormula(value, options, sig) : value);
  const hypotheses = (program.hypotheses ?? []).map((hyp) => (
    hyp && typeof hyp.formula === 'string' ? { ...hyp, formula: parseIfSource(hyp.formula) } : hyp
  ));
  const clauses = (program.clauses ?? []).map((entry) => {
    if (!entry || typeof entry !== 'object') return entry;
    const out = { ...entry };
    if (typeof out.formula === 'string') out.formula = parseIfSource(out.formula);
    if (typeof out.conclusion === 'string') out.conclusion = parseIfSource(out.conclusion);
    return out;
  });
  return { ...program, hypotheses, clauses };
}

/** 可用作「桥」的背景公理模式里，认证侧连接词只有 and/imp 走得动（or/not 没有规则）。 */
const BRIDGE_OPS = ['and', 'imp'];

const DEFAULT_OPTIONS = { maxDepth: 8, maxStates: 10000, maxMs: 2000, maxSteps: MAX_STEPS, trace: false };

const TRUTH = L('true');
const isTruthEq = (f) => Array.isArray(f) && f[0] === 'eq' && deepEqual(f[2], TRUTH);

function trace(state, message) {
  if (!state.trace) return;
  state.traceLines.push(message);
  // eslint-disable-next-line no-console
  console.error(`[search] ${message}`);
}

function budget(state, kind) {
  throw new FormalError(`搜索预算耗尽（${kind}）`, 'timeout');
}

// ---------------------------------------------------------------- 作用域

class Scope {
  constructor(parent, sig) {
    this.parent = parent;
    this.sig = sig;
    this.map = new Map(); // formulaKey -> QueryProof 节点
    this.pending = parent ? [...parent.pending] : []; // 快照父作用域尚未处理的事实（不动父的队列）
    this.queued = parent ? new Set(parent.queued) : new Set();
    this.saturated = false;
    this.pushed = 0; // 本作用域已推出的公式数（饱和预算，见 SATURATION_CAP）
    this.capped = false;
    // 项池从父作用域继承（单调增长），否则子作用域里的 all_e 找不到实例项。
    this.terms = parent ? [...parent.terms] : [];
    this.termKeys = parent ? new Set(parent.termKeys) : new Set();
  }

  lookup(key) {
    for (let s = this; s; s = s.parent) if (s.map.has(key)) return s.map.get(key);
    return null;
  }

  entries() {
    const out = [];
    for (let s = this; s; s = s.parent) for (const e of s.map.entries()) out.push(e);
    return out;
  }

  nodeEntries() {
    const out = [];
    for (let s = this; s; s = s.parent) for (const node of s.map.values()) out.push(node);
    return out;
  }
}

function addTerm(state, scope, term) {
  let key;
  try {
    key = formulaKey(term);
  } catch {
    return;
  }
  if (scope.termKeys.has(key) || scope.terms.length >= 400) return;
  scope.termKeys.add(key);
  scope.terms.push(term);
  state.states += 1;
}

function addTermsOf(state, scope, node) {
  for (const t of subterms(node)) addTerm(state, scope, t);
}

function register(state, scope, formula, node) {
  const key = formulaKey(formula);
  if (scope.queued.has(key)) return scope.map.get(key) ?? node;
  scope.queued.add(key);
  scope.map.set(key, node);
  scope.pending.push(node);
  scope.saturated = false; // 新事实要重新参与饱和
  addTermsOf(state, scope, formula);
  addTermsOf(state, scope, node.goal);
  return node;
}

// ---------------------------------------------------------------- 小工具

function typeOfTerm(term, sig) {
  try {
    return termType(term, sig);
  } catch {
    return null;
  }
}

function sameType(term, type, sig) {
  const t = typeOfTerm(term, sig);
  return t !== null && deepEqual(t, type);
}

function candidatesOfType(state, scope, type, limit = 32) {
  const out = [];
  const seen = new Set();
  for (const t of scope.terms) {
    if (out.length >= limit) break;
    const key = formulaKey(t);
    if (seen.has(key)) continue;
    seen.add(key);
    if (sameType(t, type, scope.sig)) out.push(t);
  }
  return out;
}

let eigenCounter = 0;
let rewriteVarCounter = 0;

function eigenVariable(state, scope, type) {
  const used = new Set(Object.keys(scope.sig.constants));
  for (const node of scope.nodeEntries()) for (const n of allNames(node.goal)) used.add(n);
  for (;;) {
    const name = `e${eigenCounter}`;
    eigenCounter += 1;
    if (!used.has(name)) return V(name, type);
  }
}

function freshRewriteVariable(forbidden) {
  for (;;) {
    const name = `r${rewriteVarCounter}`;
    rewriteVarCounter += 1;
    if (!forbidden.has(name)) return name;
  }
}

// ---------------------------------------------------------------- 定向重写（fsub 可达位置）

/** termSub 可达的替换点：app 两侧（**不进 `lift` 的参数表**，理由见下）。 */
function termVariants(term, lhs, variable, limit) {
  if (deepEqual(term, lhs)) return [variable];
  if (!Array.isArray(term)) return [];
  if (term[0] === 'app') {
    const out = [];
    for (const v of termVariants(term[1], lhs, variable, limit)) out.push(App(v, term[2]));
    for (const v of termVariants(term[2], lhs, variable, limit)) out.push(App(term[1], v));
    return out.slice(0, limit);
  }
  /*
   * `lift(λ, 参数表)` 是**一个整体**：参数表记的是 λ 的自由变量，恒等抽象本身不变。
   * kernel 的 `term_sub` 只换参数表、不动恒等抽象，于是"只改参数"会造出
   * `lift(λn.z0, [aa])` 这种参数与恒等抽象对不上的符号——`term_type` 只比参数**类型**，
   * 抓不住它，但它往下做 β 会生成越滚越大的垃圾项（实测把深度顶到 23 层）。
   * 所以重写**不进参数表**：要么整块用等式换掉，要么不动。
   */
  return [];
}

/** fsub 可达的替换点：等式两侧 + 连接词两侧 + 量词体（绑定变量不动）。 */
function formulaVariants(formula, lhs, variable, limit) {
  if (!Array.isArray(formula) || formula.length === 0) return [];
  switch (formula[0]) {
    case 'eq': {
      const out = [];
      for (const v of termVariants(formula[1], lhs, variable, limit)) out.push(Eq(v, formula[2]));
      for (const v of termVariants(formula[2], lhs, variable, limit)) out.push(Eq(formula[1], v));
      return out.slice(0, limit);
    }
    case 'imp': case 'and': case 'or':
      return [
        ...formulaVariants(formula[1], lhs, variable, limit),
        ...formulaVariants(formula[2], lhs, variable, limit),
      ].slice(0, limit);
    case 'all': case 'ex':
      return formulaVariants(formula[2], lhs, variable, limit);
    default:
      return [];
  }
}

/**
 * 用一条等式 `Eq(l,r)` 重写作用域里的公式（`eq_e`，`ctx[l/v] ⊢ ctx[r/v]`）。
 * 每个替换点造一个 ctx：把那一处换成**新变量**，于是 `ctx[l/v]` 恰好是原公式。
 */
function rewriteWithEquation(state, scope, eqNode, push) {
  const eq = eqNode.goal;
  if (eq[0] !== 'eq' || deepEqual(eq[1], eq[2])) return;
  const [l, r] = [eq[1], eq[2]];
  const lType = typeOfTerm(l, scope.sig);
  if (lType === null) return;
  for (const [, node] of scope.entries()) {
    const phi = node.goal;
    if (deepEqual(phi, eq)) continue;
    const forbidden = new Set([...allNames(phi), ...allNames(l), ...allNames(r)]);
    const variable = V(freshRewriteVariable(forbidden), lType);
    for (const context of formulaVariants(phi, l, variable, 8)) {
      if (deepEqual(context, phi)) continue;
      state.states += 1;
      let applied;
      let rewritten;
      try {
        applied = fsub(context, variable, l);
        rewritten = fsub(context, variable, r);
      } catch {
        continue;
      }
      if (!deepEqual(applied, phi) || deepEqual(rewritten, phi)) continue;
      let node2;
      try {
        node2 = eqRewrite(eqNode, node, variable, context);
      } catch {
        continue;
      }
      if (push(rewritten, node2)) return;
    }
  }
}

// ---------------------------------------------------------------- 背景公理桥

/** `B(op(p,q))` ↔ `op(B p, B q)`（`logic` 模式的 `and`/`imp` 两个方向）。 */
function bridgeLogic(scope, formula, node, push) {
  if (isTruthEq(formula)) {
    const app = formula[1];
    if (Array.isArray(app) && app[0] === 'app' && Array.isArray(app[1]) && app[1][0] === 'app') {
      const op = app[1][1]?.[1];
      if (Array.isArray(app[1][1]) && app[1][1][0] === 'logic' && BRIDGE_OPS.includes(op)) {
        const p = app[1][2];
        const q = app[2];
        const ax = axiomNode({ schema: 'logic', op }, scope.sig);
        const inst = allElim(allElim(ax, p), q);
        push([op, B(p), B(q)], impElim(andElimLeft(inst), node));
        return;
      }
    }
  }
  if (formula[0] === 'and' && isTruthEq(formula[1]) && isTruthEq(formula[2])) {
    const p = formula[1][1];
    const q = formula[2][1];
    const ax = axiomNode({ schema: 'logic', op: 'and' }, scope.sig);
    const inst = allElim(allElim(ax, p), q);
    push(B(App(App(L('and'), p), q)), impElim(andElimRight(inst), node));
    return;
  }
  if (formula[0] === 'imp' && isTruthEq(formula[1]) && isTruthEq(formula[2])) {
    const p = formula[1][1];
    const q = formula[2][1];
    const ax = axiomNode({ schema: 'logic', op: 'imp' }, scope.sig);
    const inst = allElim(allElim(ax, p), q);
    push(B(App(App(L('imp'), p), q)), impElim(andElimRight(inst), node));
  }
}

/** 等式桥：`B(obj_eq(l,r))` ↔ `Eq(l,r)`（`equality` 模式）。 */
function bridgeEquality(state, scope, formula, node, push) {
  // 只在语言里**真的出现**对象层 eq 常量时才启用：否则桥会把任意等式都包成 `obj_eq(…)`，
  // 再被反向桥拆开，制造与目标无关的项增长（实测会让饱和爆炸）。
  if (state.vocab.objEq.size === 0) return;
  if (isTruthEq(formula)) {
    const app = formula[1];
    if (Array.isArray(app) && app[0] === 'app' && Array.isArray(app[1]) && app[1][0] === 'app'
      && Array.isArray(app[1][1]) && app[1][1][0] === 'logic' && app[1][1][1] === 'eq') {
      const type = app[1][1][2];
      if (!state.vocab.objEq.has(JSON.stringify(type))) return;
      const l = app[1][2];
      const r = app[2];
      const ax = axiomNode({ schema: 'equality', type }, scope.sig);
      const inst = allElim(allElim(ax, l), r);
      push(Eq(l, r), impElim(andElimLeft(inst), node));
    }
    return;
  }
  if (formula[0] === 'eq') {
    const [l, r] = [formula[1], formula[2]];
    const type = typeOfTerm(l, scope.sig);
    if (type === null || !state.vocab.objEq.has(JSON.stringify(type))) return;
    const ax = axiomNode({ schema: 'equality', type }, scope.sig);
    const inst = allElim(allElim(ax, l), r);
    push(B(App(App(L('eq', type), l), r)), impElim(andElimRight(inst), node));
  }
}

/** 量词桥：`B(all P)` → `∀x. B(P x)`（`quantifier` 模式；同样只在出现对象层量词时启用）。 */
function bridgeQuantifier(state, scope, formula, node, push) {
  if (state.vocab.quant.size === 0) return;
  if (!isTruthEq(formula)) return;
  const app = formula[1];
  if (!Array.isArray(app) || app[0] !== 'app' || !Array.isArray(app[1])) return;
  const head = app[1];
  if (head[0] !== 'logic' || !['all', 'ex'].includes(head[1]) || !state.vocab.quant.has(head[1])) return;
  const type = head[2];
  const pred = app[2];
  const ax = axiomNode({ schema: 'quantifier', op: head[1], type }, scope.sig);
  const inst = allElim(ax, pred);
  const x = V('x', type);
  push([head[1], x, B(App(pred, x))], impElim(andElimLeft(inst), node));
}

/** λ 应用化简：为公式里出现的 `App(lift(λ), 实参)` 造一条 abstraction 公理实例并代入。 */
function bridgeAbstraction(scope, formula, push) {
  const redexes = [];
  const seen = new Set();
  const walk = (n) => {
    if (!Array.isArray(n)) return;
    if (n[0] === 'app' && Array.isArray(n[1]) && n[1][0] === 'lift') {
      const key = formulaKey(n);
      if (!seen.has(key)) {
        seen.add(key);
        redexes.push(n);
      }
    }
    for (const a of n) if (Array.isArray(a)) walk(a);
  };
  walk(formula);
  for (const redex of redexes) {
    const liftSymbol = redex[1];
    const arg = redex[2];
    if (!sameType(arg, liftSymbol[1][1], scope.sig)) continue;
    let inst;
    try {
      inst = axiomNode(abstractionInstance(liftSymbol[1], scope.sig), scope.sig);
      for (const param of liftSymbol[2]) inst = allElim(inst, param);
      inst = allElim(inst, arg);
    } catch {
      continue;
    }
    push(inst.goal, inst);
  }
}

// ---------------------------------------------------------------- 饱和

/**
 * 前向饱和（有界、可续跑）。
 * `targetKey` 非空时，一旦闭包（含祖先作用域）里出现该公式就立刻停下——
 * 搜索是**目标导向**的，不能让与目标无关的等式重写把预算烧光。
 */
const SATURATION_CAP = 2500;

function saturate(state, scope, targetKey = null) {
  if (scope.saturated) return targetKey ? scope.lookup(targetKey) !== null : true;
  const push = (formula, node) => {
    const key = formulaKey(formula);
    if (scope.queued.has(key)) return false;
    if (scope.pushed >= SATURATION_CAP) {
      // 饱和预算到顶：**不再展开**，但已经推出的事实照常可用。
      // 这是工程限额，不是数学结论——目标导向的规则（`proveAtomicGuided`）继续负责收口。
      scope.capped = true;
      /*
       * 同时记到 `state` 上（2026-10 修）：`scope.capped` 从前全仓库无人读取，
       * 于是「被工程限额截断」与「搜索空间在预算内穷尽」在下游长得一模一样，
       * 都落成 `undecided` +「在给定预算内没有找到证明」。搜索结束时按这个标志
       * 把状态翻成 `timeout`（预算耗尽），不再冒充"找过了、没有"。
       */
      state.capped = true;
      return false;
    }
    state.states += 1;
    if (state.states > state.maxStates) budget(state, '状态数');
    scope.pushed += 1;
    scope.queued.add(key);
    scope.map.set(key, node);
    /*
     * 推出来的公式的子项也进项池（`addTerm` 自己有 400 项上限）。
     *
     * 这一条早先被我拿掉过，理由是"实例化会喂大池子 → 正反馈爆炸"。但池子上限本来
     * 就是 400，而**群案例的关键实例项（`lift(λx. mul g x)` 之类）只在推出来的公式里出现**
     * ——不喂池子就等于把那条路封死（实测：四案例的「阿贝尔群 ⇒ 群」从 proved 变 undecided）。
     * 真正止血的是下面那条 `SATURATION_CAP` 与"只按目标方向实例化"，不是掐掉池子。
     */
    addTermsOf(state, scope, formula);
    addTermsOf(state, scope, node.goal);
    scope.pending.push(node);
    if (state.onPush) state.onPush(formula, scope);
    return true;
  };
  while (scope.pending.length) {
    if (targetKey && scope.lookup(targetKey)) return true;
    if (Date.now() - state.started > state.maxMs) budget(state, '时间');
    if (state.steps > state.maxSteps) budget(state, '步数');
    /*
     * **广度优先**（队首）+ **有限实例化**。
     *
     * 背景公理是"∀ 全展开"式的：`∀x.∀y. …` 一次就推 N 个 x 实例，每个 x 再推 N 个 y 实例。
     * N=32 时这一层约 1000 条，会把饱和预算全吃掉——预算还没走到"对的那一对实例"就用光了
     * （实测：只给距离公理时目标 10 步证完；给全部公理时连 `d(aa)(aa) = zero` 都推不出来）。
     * 取 N=10：项池里**目标自身的子项排在最前**，所以目标真正需要的那几个实例都在前 10 个里，
     * 而整层只有约 100 条，留得下后续的合取分解与重写。
     */
    const node = scope.pending.shift();
    const f = node.goal;
    if (!Array.isArray(f)) continue;
    try {
      if (f[0] === 'and') {
        push(f[1], andElimLeft(node));
        push(f[2], andElimRight(node));
      } else if (f[0] === 'imp') {
        const ante = scope.lookup(formulaKey(f[1]));
        if (ante) push(f[2], impElim(node, ante));
        else if (f[1][0] === 'eq' && deepEqual(f[1][1], f[1][2])) {
          /*
           * 前件是 `t = t`：反射就能成立，直接续上后件。
           * 少了这条，`⇔` 公理里「用另一半换这一半」的方向永远差一个"显然"的起点
           * （例：`d(aa)(aa) = zero ⇔ aa = aa` 取 `⇐` 支需要先有 `aa = aa`）。
           */
          push(f[2], impElim(node, reflNode(f[1][1])));
        }
      } else if (f[0] === 'all') {
        /*
         * `all_e` 的实例项：**优先取目标里出现过的项**，不足时再补几个池子里的。
         *
         * 为什么必须这样：背景公理是"∀ 全展开"式的，四条公理各推 N 个实例，广度优先下
         * 光是这一层就把饱和预算吃光（实测：`Imp(aa = aa, d(aa)(aa) = zero)` 这条被推到
         * 第 289 条，还没轮到处理，1500 条的预算就没了，于是"距离为零"这条等式始终没推出来）。
         * 而证明真正要用的实例项几乎总是**目标自己的项**（`aa` / `e0` / `const_seq(aa)(n)`…）
         * ——把它们排在前面，几十条之内就能走到。
         */
        const pool = candidatesOfType(state, scope, f[1][2], 24);
        const preferred = pool.filter((term) => state.goalTermKeys.has(safeFormulaKey(term)));
        const rest = pool.filter((term) => !preferred.includes(term));
        const terms = preferred.length
          ? [...preferred.slice(0, 8), ...rest.slice(0, 2)]
          : pool.slice(0, 6);
        for (const term of terms) {
          try {
            push(fsub(f[2], f[1], term), allElim(node, term));
          } catch { /* 类型不合的实例项跳过 */ }
        }
      } else if (f[0] === 'eq') {
        bridgeEquality(state, scope, f, node, push);
        bridgeQuantifier(state, scope, f, node, push);
        rewriteWithEquation(state, scope, node, push);
      }
      if (isTruthEq(f) || f[0] === 'and' || f[0] === 'imp') bridgeLogic(scope, f, node, push);
      bridgeAbstraction(scope, f, push);
    } catch (error) {
      if (error instanceof FormalError && error.status === 'timeout') throw error;
      state.skipped += 1;
      if (state.notes.length < 20) state.notes.push(`饱和跳过：${error.message}`);
      trace(state, `跳过一步：${error.message}`);
    }
  }
  scope.saturated = true;
  return targetKey ? scope.lookup(targetKey) !== null : true;
}

/**
 * 语言里是否真的用到「对象层」的 eq / 量词常量。
 * 桥只在用到时才启用——否则 `Eq(l,r)` 会被包成 `obj_eq(…)` 再被拆开，制造无穷项增长。
 */
function scanBridgeVocabulary(formulas) {
  const objEq = new Set();
  const quant = new Set();
  const walk = (n) => {
    if (!Array.isArray(n)) return;
    if (n[0] === 'logic') {
      if (n[1] === 'eq' && n.length === 3) objEq.add(JSON.stringify(n[2]));
      if ((n[1] === 'all' || n[1] === 'ex') && n.length === 3) quant.add(n[1]);
    }
    for (const a of n) if (Array.isArray(a)) walk(a);
  };
  for (const f of formulas) if (f !== undefined && f !== null) walk(f);
  return { objEq, quant };
}

// ---------------------------------------------------------------- 目标求解

/** 公式键的安全版（键算不出来时返回 null，调用方按"不是目标项"处理）。 */
function safeFormulaKey(node) {
  try {
    return formulaKey(node);
  } catch {
    return null;
  }
}

/** 把当前目标的子项登记为"目标项"——饱和里 `all_e` 优先在这些项上实例化。 */
function noteGoalTerms(state, formula) {
  try {
    for (const term of subterms(formula)) {
      const key = safeFormulaKey(term);
      if (key !== null) state.goalTermKeys.add(key);
    }
  } catch { /* 项池登记失败不影响正确性 */ }
}

function proveFormula(state, scope, formula, depth) {
  state.depth = Math.max(state.depth, depth);
  noteGoalTerms(state, formula);
  if (state.trace && state.traceCalls < 240) {
    state.traceCalls += 1;
    trace(state, `prove(d=${depth}) ${JSON.stringify(formula).slice(0, Number(process.env.TRACE_WIDTH ?? 120))}`);
  }
  if (depth > state.maxDepth) budget(state, '深度');
  if (Date.now() - state.started > state.maxMs) budget(state, '时间');
  if (state.steps > state.maxSteps) budget(state, '步数');

  const key = formulaKey(formula);
  const direct = scope.lookup(key);
  if (direct) return direct;

  const k = formula[0];
  if (k === 'and') {
    const left = proveFormula(state, scope, formula[1], depth + 1);
    if (left) {
      const right = proveFormula(state, scope, formula[2], depth + 1);
      if (right) return andIntro(left, right);
    }
    return saturateAndLookup(state, scope, formula, key) ? scope.lookup(key) : null;
  }
  if (k === 'imp') {
    const inner = new Scope(scope, scope.sig);
    state.hypothesisSeq += 1;
    const label = `h${state.hypothesisSeq}`;
    const antecedent = formula[1];
    try {
      const hypNode = hypothesisNode(label, antecedent);
      register(state, inner, antecedent, hypNode);
      if (antecedent[0] === 'ex') {
        const eigen = eigenVariable(state, inner, antecedent[1][2]);
        const caseLabel = `${label}_case`;
        const caseFormula = fsub(antecedent[2], antecedent[1], eigen);
        const caseNode = hypothesisNode(caseLabel, caseFormula);
        register(state, inner, caseFormula, caseNode);
        const body = proveFormula(state, inner, formula[2], depth + 1);
        if (body) return impIntro(exElim(hypNode, body, caseLabel, eigen), label, antecedent);
      } else {
        const body = proveFormula(state, inner, formula[2], depth + 1);
        if (body) return impIntro(body, label, antecedent);
      }
    } catch (error) {
      if (error instanceof FormalError && error.status === 'timeout') throw error;
      trace(state, `蕴含目标失败：${error.message}`);
    }
    return saturateAndLookup(state, scope, formula, key) ? scope.lookup(key) : null;
  }
  if (k === 'all') {
    const inner = new Scope(scope, scope.sig);
    const eigen = eigenVariable(state, inner, formula[1][2]);
    const instance = fsub(formula[2], formula[1], eigen);
    const body = proveFormula(state, inner, instance, depth + 1);
    if (body) return allIntro(body, eigen);
    return saturateAndLookup(state, scope, formula, key) ? scope.lookup(key) : null;
  }
  if (k === 'ex') {
    for (const term of candidatesOfType(state, scope, formula[1][2], 32)) {
      let instance;
      try {
        instance = fsub(formula[2], formula[1], term);
      } catch {
        continue;
      }
      const body = proveFormula(state, scope, instance, depth + 1);
      if (body) return exIntro(formula, term, body);
    }
    return saturateAndLookup(state, scope, formula, key) ? scope.lookup(key) : null;
  }
  if (k === 'false') throw new FormalError('false 在首版不可证（没有 false_e 规则）', 'unsupported');
  if (k === 'or') throw new FormalError('认证语言不接受析取（内核没有 or 规则）', 'unsupported');

  /*
   * 原子目标。**顺序是有讲究的**：
   *
   * 1. 生成式（便宜）：目标里出现 `App(lift(λ), 实参)` 时补一条 abstraction 实例；
   * 2. **目标导向规则**：反射 / 后向桥 / 带方向的公理实例 / 后向重写——它们只沿
   *    「与目标合一的那一支」走，成本与目标大小成正比；
   * 3. **兜底**：前向饱和闭包。它会把背景公理整片展开（`⇔` 形状尤其贵），
   *    所以放在最后，并且带目标早退。
   *
   * 早先这里是「先饱和、后规则」，于是 `bg:limit/1` 这类含多条 `⇔` 公理的背景
   * 会把预算全部烧在展开上，目标本身反而一步没走（实测 84k 状态、深度 0）。
   *
   * **环检测**：后向重写是"换成另一个形状再证"，两个方向互推就会无限套娃
   * （实测 `lt(…) = true` ↔ `lt(…) = le(nn)(e1)` 来回跳）。同一个目标键只要已经在
   * 当前这条证明链上，就直接放弃——重复证同一个目标不是进展。
   */
  if (state.atomicStack.has(key)) return null;
  state.atomicStack.add(key);
  try {
    if (generateAbstractionFor(state, scope, formula)) {
      saturate(state, scope, key);
      const direct = scope.lookup(key);
      if (direct) return direct;
    }
    /*
     * **先跑一遍便宜的规则**（反射 / 后向桥 / 全称事实的合一实例）——它们不展开背景，
     * 命中了就省下整次饱和。注意这里**不用**「公理实例」与「后向重写」两条：
     * 它们会递归去证新的子目标，放在饱和之前会把搜索引到另一条路上，
     * 而饱和（下面那步）本来就能从已知事实倒着凑出目标——两条路的证明形状不一样，
     * 四案例的「阿贝尔群 ⇒ 群」正是靠饱和那条路 12 步证出来的。
     */
    const quick = proveAtomicGuided(state, scope, formula, depth, { rewrite: false, axiomInstance: false });
    if (quick) return quick;
    /*
     * 然后是**饱和闭包**：它是唯一能"从已知事实倒着凑出目标"的通道
     * （`⇔` 公理 + 反射推出的等式、定义展开、合取分解都在这里产生），
     * 所以不能省；但它是宽度优先的，代价与背景大小同阶。
     */
    if (saturateAndLookup(state, scope, formula, key)) return scope.lookup(key);
    /*
     * 饱和之后**再跑一遍完整规则**：它可能刚推出了新的等式
     * （例如从 `⇔` 公理 + 反射推出的 `d(aa)(aa) = zero`），
     * 这些等式只有回到目标导向的重写里才有用。
     */
    const guided = proveAtomicGuided(state, scope, formula, depth);
    if (guided) return guided;
    return null;
  } finally {
    state.atomicStack.delete(key);
  }
}

/** 目标导向的原子规则（都不做整片闭包）。 */
function proveAtomicGuided(state, scope, goal, depth, { rewrite = true, axiomInstance = true } = {}) {
  // 反射：t = t。
  if (goal[0] === 'eq' && deepEqual(goal[1], goal[2])) return reflNode(goal[1]);
  // 后向桥：对象层连接词/等式/量词 ↔ 认证层形状。
  const bridged = proveByBackwardBridge(state, scope, goal, depth);
  if (bridged) return bridged;
  // 公理实例：把 ∀-事实按**目标这一支**实例化（`⇔` 只取需要的那一边）。
  if (axiomInstance) {
    const viaAxiom = proveViaAxiomInstance(state, scope, goal, depth);
    if (viaAxiom) return viaAxiom;
  }
  // 全称事实的合一实例（all_e 的实例项由合一给出）。
  const viaMeta = proveAtomicViaMeta(state, scope, goal);
  if (viaMeta) return viaMeta;
  // 后向重写：把目标里某处换成等式另一侧去证，再用 eq_e 得回目标（两个方向都试）。
  return rewrite ? proveByRewrite(state, scope, goal, depth) : null;
}

/**
 * **刚性匹配**：把「公理形状」对到目标上，只允许**元变量**在形状一侧被绑定。
 *
 * 为什么不用 `unify`：`unify` 两边都会 `whnf`，而 `whnf` 会展开定义、化简 `lift` 应用。
 * 于是 `seq_conv(const_seq(aa))(aa)` 会在合一过程中变成
 * `seq_conv(lift(λa.λn.a)(aa))(aa)`（再一步变成 `lift(λn.z0, [aa])`），实例化出来的
 * 节点结论**不是目标**——搜索会交出"证了另一个命题"的树。
 * 这里只做结构匹配：形状里的元变量可以绑到目标的任意子项，其余位置必须逐层同名同形。
 * 展开/折叠留给 `proveByRewrite` + `eq_e`（内核认的那条通道）。
 */
function matchInstance(pattern, target, env, fuel = { left: 4096 }) {
  if (fuel.left <= 0) return false;
  fuel.left -= 1;
  const p = deref(pattern, env);
  if (isMeta(p)) {
    const bound = env.get(p[1]);
    if (bound === undefined) {
      env.set(p[1], target);
      return true;
    }
    return deepEqual(deref(bound, env), target);
  }
  if (!Array.isArray(p) || !Array.isArray(target)) return deepEqual(p, target);
  if (p.length !== target.length) return false;
  if (p[0] === '?' || p[0] !== target[0]) return false;
  for (let index = 1; index < p.length; index += 1) {
    if (!matchInstance(p[index], target[index], env, fuel)) return false;
  }
  return true;
}

/**
 * 用「∀-事实 + 合一」直接命中目标，**按方向剪枝**。
 *
 * 这是 `⇔` 形状公理的解药：`∀params. P(params) ⇔ (A ∧ B ∧ C)` 整条丢给前向饱和，
 * 会同时展开两个方向与合取的每一支；而目标要的往往只是其中一支。这里改成：
 *
 * - 把事实的**外层 ∀** 换成元变量，得到形状；
 * - 形状是 `Imp(L,R)`：把 `R` 与目标合一，证 `L`，再 `imp_e`；
 * - 形状是 `Iff`（即 `And(Imp(L,R), Imp(R2,L2))`）：分别试两个方向，
 *   命中哪一个就用 `and_l`/`and_r` 取那一支，证另一半，再 `imp_e`。
 *
 * 合一给出的实例项必须是**闭项**（没有残留元变量）——半实例化的东西没有内核理由。
 */
function proveViaAxiomInstance(state, scope, goal, depth) {
  let tried = 0;
  for (const node of scope.nodeEntries()) {
    if (tried >= 24) break;
    const fact = node.goal;
    if (!Array.isArray(fact) || fact[0] !== 'all') continue;
    tried += 1;
    const binders = [];
    let body = fact;
    while (Array.isArray(body) && body[0] === 'all') {
      binders.push(body[1]);
      body = body[2];
    }
    const metas = binders.map((binder) => freshMeta('q', binder[2]));
    let pattern;
    try {
      pattern = body;
      for (let i = binders.length - 1; i >= 0; i -= 1) pattern = fsub(pattern, binders[i], metas[i]);
    } catch {
      continue;
    }
    for (const side of axiomSides(pattern)) {
      const env = new Map();
      if (!matchInstance(side.conclusion, goal, env)) continue;
      if (state.trace) trace(state, `  [axiom-instance] 形状命中：${JSON.stringify(fact).slice(0, 70)}`);
      const terms = metas.map((meta) => applyEnv(meta, env));
      if (terms.some((term) => !isGround(term, env))) continue;
      /*
       * 实例项必须**类型正确**：合一只管形状，不管排序，而 `allElim` 只做替换。
       * 少了这一步，`∀(x:R)(y:R). d(x)(y) = zero ⇔ x = y` 会拿 `lt(...)`（类型 o）
       * 去实例化 `x`，推出 `d(lt…)(true) = zero` 这种无意义的子目标——实测那正是
       * 深度无限增长的来源（同一个目标被反复"证明"）。
       */
      if (terms.some((term, index) => !sameType(term, binders[index][2], scope.sig))) {
        if (state.trace) trace(state, '  [axiom-instance] 实例项类型不合，跳过');
        continue;
      }
      const premise = applyEnv(side.premise, env);
      if (!isGround(premise)) {
        if (state.trace) trace(state, '  [axiom-instance] 前件仍有未定元变量，跳过');
        continue;
      }
      let inst = node;
      try {
        for (const term of terms) inst = allElim(inst, term);
      } catch {
        continue;
      }
      // inst.goal 现在是 pattern 的闭实例；按 side 取出需要的那个方向。
      const direction = side.pick(inst);
      if (!direction) continue;
      /*
       * **实例的结论必须真的就是目标**（`pick` 取的是蕴含式，结论在它的第二分量上）。
       *
       * 这条核对挡住的是"证了另一个命题却返回成功"：早先 `unify` 会 `whnf`，而 `whnf` 会
       * 展开定义（`const_seq(aa)` → `lift(λa.λn.a)(aa)`）甚至化简 lift 应用，于是实例的结论
       * 可能是展开后的形状——`assembleProof` 会当场报「rootConclusion 与根节点结论不一致」。
       * 展开/折叠只能走 `proveByRewrite` + `eq_e`，那才是内核认的通道。
       */
      const conclusion = Array.isArray(direction.goal) && direction.goal[0] === 'imp'
        ? direction.goal[2]
        : direction.goal;
      if (!sameFormula(conclusion, goal)) {
        if (state.trace) trace(state, `  [axiom-instance] 结论不是目标：${JSON.stringify(conclusion).slice(0, 90)}`);
        continue;
      }
      if (state.trace) trace(state, `  [axiom-instance] 采用；前件=${JSON.stringify(premise).slice(0, 90)}`);
      const other = proveFormula(state, scope, premise, depth + 1);
      if (!other) continue;
      try {
        return impElim(direction, other);
      } catch {
        continue;
      }
    }
  }
  return null;
}

/** `Imp(L,R)` / `Iff` 两种形状的「用哪一支」描述。 */
function axiomSides(pattern) {
  if (!Array.isArray(pattern)) return [];
  if (pattern[0] === 'imp') return [{ conclusion: pattern[2], premise: pattern[1], pick: (inst) => inst }];
  if (pattern[0] === 'and' && pattern[1]?.[0] === 'imp' && pattern[2]?.[0] === 'imp') {
    const forward = pattern[1];   // L ⇒ R
    const backward = pattern[2];  // R ⇒ L
    return [
      { conclusion: forward[2], premise: forward[1], pick: (inst) => andElimLeft(inst) },
      { conclusion: backward[2], premise: backward[1], pick: (inst) => andElimRight(inst) },
    ].filter((side) => !isVacuousConclusion(side.conclusion));
  }
  return [];
}

/**
 * 「这个方向的结论是不是什么都匹配」。
 *
 * `∀(x:R)(y:R). d(x)(y) = zero ⇔ x = y` 的 `⇒` 支结论是 `Eq(?x,?y)`——**两边都是元变量**，
 * 于是它能"匹配"任何一个等式目标，并回推一个更大的前件（`d(d(aa)(aa))(zero) = zero`），
 * 再匹配、再变大……实测 15ms 内把深度顶到 13 层。这种方向不能当目标形状用：
 * 它说的是"任何等式都能由某个等式换出来"，是空话。
 */
function isVacuousConclusion(conclusion) {
  if (!Array.isArray(conclusion)) return true;
  if (isMeta(conclusion)) return true;
  if (conclusion[0] === 'eq') {
    return isMeta(conclusion[1]) && isMeta(conclusion[2]);
  }
  return false;
}

/** 目标导向饱和：只看「闭包里有没有这个目标」。 */
function saturateAndLookup(state, scope, formula, key) {
  saturate(state, scope, key);
  return scope.lookup(key) !== null;
}

function proveAtomic(state, scope, goal, depth) {
  // (a) 目标里出现的 `App(lift(λ), 实参)`：造一条 abstraction 公理实例。
  //     正好等于目标就直接返回；否则登记为已证事实并再饱和一次（首版唯一的 β 通道）。
  if (generateAbstractionFor(state, scope, goal)) {
    saturate(state, scope, formulaKey(goal)); // 目标导向：见到目标就停，不做无谓的闭包
    const direct = scope.lookup(formulaKey(goal));
    if (direct) return direct;
  }
  // (b) 反射：t = t。
  if (goal[0] === 'eq' && deepEqual(goal[1], goal[2])) return reflNode(goal[1]);
  // (c) 后向桥：把对象层的连接词/等式/量词化成认证层的形状，证完再用对应的公理模式桥回。
  const bridged = proveByBackwardBridge(state, scope, goal, depth);
  if (bridged) return bridged;
  // (d) 全称事实的合一实例（all_e 的实例项由合一给出）。
  const viaMeta = proveAtomicViaMeta(state, scope, goal);
  if (viaMeta) return viaMeta;
  // (e) 后向重写：证「目标里某处被反向替换」后的变体，再用 eq_e 得到目标。
  return proveByRewrite(state, scope, goal, depth);
}

/** 为公式里出现的 lift 应用补一条 abstraction 公理实例；补了东西返回 true。 */
function generateAbstractionFor(state, scope, formula) {
  const redexes = [];
  const seen = new Set();
  const walk = (n) => {
    if (!Array.isArray(n)) return;
    if (n[0] === 'app' && Array.isArray(n[1]) && n[1][0] === 'lift') {
      const key = formulaKey(n);
      if (!seen.has(key)) {
        seen.add(key);
        redexes.push(n);
      }
    }
    for (const a of n) if (Array.isArray(a)) walk(a);
  };
  walk(formula);
  let added = false;
  for (const redex of redexes) {
    const liftSymbol = redex[1];
    const arg = redex[2];
    if (!sameType(arg, liftSymbol[1][1], scope.sig)) continue;
    let inst;
    try {
      inst = axiomNode(abstractionInstance(liftSymbol[1], scope.sig), scope.sig);
      for (const param of liftSymbol[2]) inst = allElim(inst, param);
      inst = allElim(inst, arg);
    } catch {
      continue;
    }
    const key = formulaKey(inst.goal);
    if (!scope.map.has(key)) {
      register(state, scope, inst.goal, inst); // 登记 + 排队，让它参与后续饱和
      added = true;
    }
  }
  return added;
}

/** 后向桥：`B(p∧q) ← Bp∧Bq`、`B(p⇒q) ← Bp⇒Bq`、`B(eq(l,r)) ← Eq(l,r)`、`B(all P) ← ∀x.B(P x)`。 */
function proveByBackwardBridge(state, scope, goal, depth) {
  if (isTruthEq(goal)) {
    const app = goal[1];
    if (Array.isArray(app) && app[0] === 'app' && Array.isArray(app[1])) {
      // logic:and / logic:imp
      if (app[1][0] === 'app' && Array.isArray(app[1][1]) && app[1][1][0] === 'logic'
        && BRIDGE_OPS.includes(app[1][1][1])) {
        const op = app[1][1][1];
        const p = app[1][2];
        const q = app[2];
        const sub = [op, B(p), B(q)];
        const node = proveFormula(state, scope, sub, depth + 1);
        if (node) {
          const inst = allElim(allElim(axiomNode({ schema: 'logic', op }, scope.sig), p), q);
          return impElim(andElimRight(inst), node);
        }
      }
      // equality：`B(obj_eq(l,r)) ← Eq(l,r)`（只在语言里用对象层 eq 常量时才启用）
      if (state.vocab.objEq.size > 0
        && Array.isArray(app[1]) && app[1][0] === 'app'
        && Array.isArray(app[1][1]) && app[1][1][0] === 'logic' && app[1][1][1] === 'eq'
        && state.vocab.objEq.has(JSON.stringify(app[1][1][2]))) {
        const type = app[1][1][2];
        const l = app[1][2];
        const r = app[2];
        const node = proveFormula(state, scope, Eq(l, r), depth + 1);
        if (node) {
          const inst = allElim(allElim(axiomNode({ schema: 'equality', type }, scope.sig), l), r);
          return impElim(andElimRight(inst), node);
        }
      }
      // quantifier
      if (state.vocab.quant.size > 0 && app[1][0] === 'logic'
        && ['all', 'ex'].includes(app[1][1]) && state.vocab.quant.has(app[1][1])) {
        const type = app[1][2];
        const pred = app[2];
        const x = V('x', type);
        const sub = [app[1][1], x, B(App(pred, x))];
        const node = proveFormula(state, scope, sub, depth + 1);
        if (node) {
          const inst = allElim(axiomNode({ schema: 'quantifier', op: app[1][1], type }, scope.sig), pred);
          return impElim(andElimRight(inst), node);
        }
      }
    }
    return null;
  }
  return null;
}

/**
 * 后向重写（有界）：目标里若出现某条等式右侧，就把那处换成左侧去证，再用 `eq_e` 得回目标。
 * 这就是「不用显式对称步骤也能反向使用等式」的地方——对称化只在这里按需发生。
 */
function proveByRewrite(state, scope, goal, depth) {
  let considered = 0;
  const goalSize = nodeCount(goal);
  const equations = [];
  for (const node of scope.nodeEntries()) {
    if (Array.isArray(node.goal) && node.goal[0] === 'eq' && !deepEqual(node.goal[1], node.goal[2])) {
      equations.push(node);
      if (equations.length >= 40) break;
    }
  }
  /*
   * 先把候选换法**都枚举出来**，再按「化简幅度」排序试。
   *
   * 为什么不能按作用域里的等式顺序边走边试：等式多起来之后（`⇔` 公理实例化会产出成批的
   * 等式），真正能化简的那条常常排在 12 条之外；而按顺序试的那些多半在做无用功。
   * 排序之后，`const_seq(aa)(n) → aa` 这类大步化简先走，β 链也先走。
   */
  const candidates = [];
  for (const eqNode of equations) {
    const eq = eqNode.goal;
    const lType = typeOfTerm(eq[1], scope.sig);
    if (lType === null) continue;
    const forbidden = new Set([...allNames(goal), ...allNames(eq)]);
    const variable = V(freshRewriteVariable(forbidden), lType);
    /*
     * 方向一：目标里出现等式的**右侧** → 换成左侧去证，再用 `eq_e` 得回目标。
     * 方向二（正向重写）：目标里出现等式的**左侧** → 换成右侧去证；这一步要**反向的等式**，
     * 所以按需对称化（`Eq(r,l)`，两步：refl + eq_e），而不是把它塞进前向饱和——
     * 那正是早先版本把预算烧光的原因（`true → hA` 之类的破坏性改写规则）。
     */
    const attempts = [
      { lhs: eq[2], rhs: eq[1], node: eqNode, definitional: false },
      /*
       * 方向二（正向重写）：目标里出现等式的**左侧** → 换成右侧去证；这一步要**反向的等式**，
       * 所以按需对称化（`Eq(r,l)`，两步：refl + eq_e），而不是把它塞进前向饱和——
       * 那正是早先版本把预算烧光的原因（`true → hA` 之类的破坏性改写规则）。
       *
       * `definitional`：等式左边是**一个背景定义名**（`const_seq`、`left_mul`…）时，
       * 展开/折叠是有限且必需的一步，允许目标变大（`const_seq(aa)` → `lift(λa.λn.a)(aa)`）。
       * 其它等式仍只许化简——那是发散（越换越大）的唯一来源。
       */
      {
        lhs: eq[1],
        rhs: eq[2],
        node: symmetryOf(scope, eqNode),
        definitional: Array.isArray(eq[1]) && eq[1][0] === 'c',
      },
    ];
    for (const attempt of attempts) {
      if (!attempt.node) continue;
      for (const context of formulaVariants(goal, attempt.lhs, variable, 4)) {
        if (deepEqual(context, goal)) continue;
        let psi;
        try {
          psi = fsub(context, variable, attempt.rhs);
        } catch {
          continue;
        }
        if (deepEqual(psi, goal)) continue;
        /*
         * **不做"越换越大"的重写**。
         *
         * 后向重写是"换成另一个形状再证"，如果换完比原来还大，就会沿
         * 「`aa` → `const_seq(aa)(nn)` → 更大」一直长下去（实测把深度顶到 23 层、
         * 项里套了四层 `const_seq`）。反过来，真正有用的方向几乎都是**化简**：
         * `const_seq(aa)(n)` → `aa`、`d(aa)(aa)` → `zero`。所以只接受不变大或变小的换法。
         */
        const size = nodeCount(psi);
        if (size > goalSize && !attempt.definitional) continue;
        candidates.push({ psi, size, node: attempt.node, variable, context });
        if (candidates.length >= 80) break;
      }
      if (candidates.length >= 80) break;
    }
    if (candidates.length >= 80) break;
  }
  candidates.sort((left, right) => left.size - right.size);
  for (const candidate of candidates) {
    const sub = proveFormula(state, scope, candidate.psi, depth + 1);
    if (!sub) continue;
    try {
      return eqRewrite(candidate.node, sub, candidate.variable, candidate.context);
    } catch {
      continue;
    }
  }
  return null;
}

/**
 * `Eq(l,r)` 的对称化 → `Eq(r,l)`。
 *
 * `eq_e` 只朝一个方向替换（`ctx[l/v] ⊢ ctx[r/v]`），所以「正向重写」需要反过来写的那条等式。
 * 两步就够（与 group 证书里的 `s21` 同法）：
 * 取 `ctx = Eq(v, l)`，`refl(l)` 给出 `ctx[l/v] = Eq(l,l)`，于是 `ctx[r/v] = Eq(r,l)`。
 */
function symmetryOf(scope, eqNode) {
  const eq = eqNode?.goal;
  if (!Array.isArray(eq) || eq[0] !== 'eq' || deepEqual(eq[1], eq[2])) return null;
  const lType = typeOfTerm(eq[1], scope.sig);
  if (lType === null) return null;
  const variable = V(freshRewriteVariable(new Set(allNames(eq))), lType);
  try {
    return eqRewrite(eqNode, reflNode(eq[1]), variable, Eq(variable, eq[1]));
  } catch {
    return null;
  }
}

function proveAtomicViaMeta(state, scope, goal) {
  for (const node of scope.nodeEntries()) {
    const f = node.goal;
    if (!Array.isArray(f) || f[0] !== 'all') continue;
    const meta = freshMeta('x', f[1][2]);
    let pattern;
    try {
      pattern = fsub(f[2], f[1], meta);
    } catch {
      continue;
    }
    const env = new Map();
    if (!unify(pattern, goal, env, scope.sig)) continue;
    const witness = applyEnv(meta, env);
    if (!isGround(witness, env)) continue;
    // 同理：实例项必须与绑定变量的排序一致（合一只管形状，不管排序）。
    if (!sameType(witness, f[1][2], scope.sig)) continue;
    try {
      const inst = allElim(node, witness);
      if (formulaKey(inst.goal) === formulaKey(goal)) return inst;
    } catch {
      continue;
    }
  }
  return null;
}

// ---------------------------------------------------------------- 程序登记

function formulaFromAtoms(atoms) {
  need(Array.isArray(atoms) && atoms.length > 0, 'atoms 必须是非空数组', 'error');
  const [head, ...body] = atoms;
  return clauseToFormula({ head, body });
}

function registerProgram(state, scope, program, sig) {
  const nodes = [];
  for (const hyp of program.hypotheses ?? []) {
    need(hyp && typeof hyp.id === 'string', '程序假设缺少 id', 'error');
    formulaOk(hyp.formula, sig);
    const node = hypothesisNode(hyp.id, hyp.formula);
    register(state, scope, hyp.formula, node);
    nodes.push(node);
  }
  for (const entry of program.clauses ?? []) {
    need(entry && typeof entry.id === 'string', '程序子句缺少 id', 'error');
    const kind = entry.kind ?? 'hypothesis';
    if (kind === 'hypothesis') {
      const formula = entry.formula ?? (entry.atoms ? formulaFromAtoms(entry.atoms) : null);
      need(formula, `程序条目 ${entry.id} 缺少 formula/atoms`, 'error');
      formulaOk(formula, sig);
      const node = hypothesisNode(entry.id, formula);
      register(state, scope, formula, node);
      nodes.push(node);
    } else if (kind === 'axiom') {
      const formula = entry.formula ?? entry.conclusion ?? (entry.atoms ? formulaFromAtoms(entry.atoms) : null);
      need(formula, `公理条目 ${entry.id} 缺少 formula`, 'error');
      formulaOk(formula, sig);
      const node = theoryNode(entry.theoryAxiomId ?? entry.id, formula);
      register(state, scope, formula, node);
      nodes.push(node);
    } else if (kind === 'definition') {
      const name = entry.definitionName ?? entry.id;
      const def = (sig.definitions ?? []).find((d) => d.name === name);
      const formula = entry.formula ?? (def ? Eq(C(name), lift(def.term, sig)) : null);
      need(formula, `定义条目 ${entry.id} 既没有 formula，也不是 sig 里已登记的定义`, 'error');
      const node = definitionNode(name, formula);
      register(state, scope, formula, node);
      nodes.push(node);
    } else if (kind === 'lemma') {
      const formula = entry.formula ?? entry.conclusion;
      need(formula, `引理条目 ${entry.id} 缺少 conclusion/formula`, 'error');
      formulaOk(formula, sig);
      const node = lemmaNode(entry.lemmaId ?? entry.id, formula);
      register(state, scope, formula, node);
      nodes.push(node);
    } else {
      throw new FormalError(`程序条目 ${entry.id} 的 kind 未知：${kind}`, 'error');
    }
  }
  return nodes;
}

// ---------------------------------------------------------------- 入口

/**
 * 有界搜索。
 * @param {unknown} goal 认证公式 / 对象项（自动包成 `B(t)`）/ **源码字符串**（需 language.mjs）
 * @param {{hypotheses?: Array, clauses?: Array}} program 条目的 `formula`/`conclusion` 也可以是源码字符串
 * @param {{maxDepth?:number,maxStates?:number,maxMs?:number,maxSteps?:number,trace?:boolean,sig?:object,
 *          language?:object, variables?:object|Map, strict?:boolean, backgrounds?:unknown, background?:string,
 *          onPush?:(formula:unknown, scope:object)=>void}} options
 *        `language`：语言层覆盖（缺省懒装载 `./language.mjs`）；
 *        `variables`：目标源码里的自由参数 `{ 名: 类型节点|源码 }`，字符串类型走 `parseType` 归一；
 *        `onPush` 只用于调试/诊断（看饱和在推什么），不参与判定。
 * @returns {{status:string, proof:object|null, reason:string, stats:object, goal?:unknown,
 *           goalSource?:string, objectConclusion?:unknown}}
 */
export function search(goal, program = {}, options = {}) {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const rawSig = opts.sig ?? { bases: ['o'], constants: {}, definitions: [] };
  const state = {
    sig: rawSig,
    trace: Boolean(opts.trace),
    traceLines: [],
    maxDepth: opts.maxDepth,
    maxStates: opts.maxStates,
    maxMs: opts.maxMs,
    maxSteps: opts.maxSteps,
    started: Date.now(),
    states: 0,
    steps: 0,
    depth: 0,
    skipped: 0,
    notes: [],
    hypothesisSeq: 0,
    traceCalls: 0,
    atomicStack: new Set(),
    goalTermKeys: new Set(),
    onPush: typeof opts.onPush === 'function' ? opts.onPush : null,
  };
  const stats = () => ({
    depth: state.depth,
    states: state.states,
    steps: state.steps,
    durationMs: Date.now() - state.started,
    reasonDetail: state.notes.slice(-5).join(' | ') || null,
  });
  // 签名先归一：解析层签名（类型是源码文本）或 formalSpec 形状在这里就报可读错误，
  // 而不是在很远的地方爆成 `sorted app mismatch` / TypeError。
  let sig;
  try {
    sig = ensureSig(rawSig);
  } catch (error) {
    const status = error instanceof FormalError && error.status === 'unsupported' ? 'unsupported' : 'error';
    return { status, proof: null, reason: `sig 不合法：${error.message}`, stats: stats() };
  }
  state.sig = sig;
  let formula;
  let objectConclusion;
  let goalSource = null;
  try {
    if (typeof goal === 'string') {
      goalSource = goal;
      formula = parseSourceFormula(goal, opts, sig);
    } else if (isCertFormula(goal)) {
      formula = goal;
    } else {
      objectConclusion = goal;
      formula = B(goal);
    }
    formulaOk(formula, sig);
  } catch (error) {
    const status = error instanceof FormalError && error.status === 'unsupported' ? 'unsupported' : 'error';
    return {
      status, proof: null, reason: `目标不合法：${error.message}`, stats: stats(),
      ...(goalSource === null ? {} : { goalSource }),
    };
  }

  let prog = program;
  try {
    prog = resolveProgram(program, opts, sig);
  } catch (error) {
    const status = error instanceof FormalError && error.status === 'unsupported' ? 'unsupported' : 'error';
    return {
      status, proof: null, reason: `程序不合法：${error.message}`, stats: stats(), goal: formula,
      ...(goalSource === null ? {} : { goalSource }),
    };
  }

  try {
    const scope = new Scope(null, sig);
    const vocabFormulas = [formula];
    for (const hyp of prog.hypotheses ?? []) if (hyp?.formula) vocabFormulas.push(hyp.formula);
    for (const entry of prog.clauses ?? []) {
      if (entry?.formula) vocabFormulas.push(entry.formula);
      if (entry?.conclusion) vocabFormulas.push(entry.conclusion);
    }
    state.vocab = scanBridgeVocabulary(vocabFormulas);
    addTermsOf(state, scope, formula); // 目标自身的子项也进项池（all_e / ex_i 的实例项从这里挑）
    registerProgram(state, scope, prog, sig);
    // 目标与假设先各做一次子句化：形状不支持（析取 / false）时在这里就报 unsupported。
    clausifyFormula(formula, sig, { role: 'goal' });
    for (const hyp of prog.hypotheses ?? []) clausifyFormula(hyp.formula, sig, { role: 'fact' });
    for (const entry of prog.clauses ?? []) {
      if ((entry.kind ?? 'hypothesis') === 'hypothesis' && entry.formula) {
        clausifyFormula(entry.formula, sig, { role: 'fact' });
      }
    }
    const proof = proveFormula(state, scope, formula, 0);
    state.steps = countNodes(proof);
    if (state.steps > state.maxSteps) budget(state, '步数');
    if (!proof) {
      /*
       * 饱和被工程上限截断时**不能报 undecided**：那样「没搜完」与「搜完了没找到」
       * 无法区分（2026-10 修）。这里如实报 timeout——预算耗尽，不是否证，也不是"该空间已穷尽"。
       */
      if (state.capped) {
        return {
          status: 'timeout',
          proof: null,
          reason: `前向饱和达到工程上限（${SATURATION_CAP} 条），搜索空间没有穷尽：这不等于否证，也不等于"在预算内没找到"。`,
          stats: stats(),
          goal: formula,
          ...(goalSource === null ? {} : { goalSource }),
        };
      }
      return {
        status: 'undecided',
        proof: null,
        reason: '在给定预算内没有找到证明（这既不是证明，也不是反证）',
        stats: stats(),
        goal: formula,
        ...(goalSource === null ? {} : { goalSource }),
      };
    }
    return {
      status: 'proved', proof, reason: '找到一棵可装配成 kernel 证书的查证树', stats: stats(),
      goal: formula, objectConclusion, ...(goalSource === null ? {} : { goalSource }),
    };
  } catch (error) {
    if (error instanceof FormalError) {
      const status = error.status === 'timeout' ? 'timeout' : error.status === 'unsupported' ? 'unsupported' : 'error';
      return {
        status, proof: null, reason: error.message, stats: stats(), goal: formula,
        ...(goalSource === null ? {} : { goalSource }),
      };
    }
    return {
      status: 'error', proof: null, reason: `搜索执行错误：${error.message}`, stats: stats(), goal: formula,
      ...(goalSource === null ? {} : { goalSource }),
    };
  }
}

function countNodes(node, seen = new Set()) {
  if (!node || typeof node !== 'object' || seen.has(node)) return 0;
  seen.add(node);
  let total = 1;
  for (const p of node.premises ?? []) total += countNodes(p, seen);
  return total;
}

/** 公式/项的节点数（「重写有没有把目标变大」的判据）。 */
function nodeCount(node) {
  if (!Array.isArray(node)) return 1;
  let total = 1;
  for (const item of node) total += nodeCount(item);
  return total;
}

/**
 * 从查证树里收集它引用到的全部假设标签（调用方据此填 `ctx.hypotheses`）。
 *
 * `imp_i` 释放的假设取自结论 `Imp(a,b)` 的前件；`ex_e` 释放的 case 假设由
 * `fsub(存在体, 绑定, 本征变量)` 现算——和 kernel 对 ex_e 的核对口径一致。
 */
export function collectHypotheses(node, seed = new Map(), seen = new Set()) {
  if (!node || typeof node !== 'object' || seen.has(node)) return seed;
  seen.add(node);
  if (node.rule === 'hypothesis') {
    const label = node.hypothesis?.id ?? node.hypothesis?.name;
    if (label) seed.set(label, node.goal);
  } else if (node.rule === 'imp_i') {
    const label = node.discharge;
    if (label && !seed.has(label) && Array.isArray(node.goal) && node.goal[0] === 'imp') seed.set(label, node.goal[1]);
  } else if (node.rule === 'ex_e') {
    const label = node.discharge;
    const exPremise = node.premises?.[0];
    if (label && !seed.has(label) && Array.isArray(exPremise?.goal) && exPremise.goal[0] === 'ex') {
      seed.set(label, fsub(exPremise.goal[2], exPremise.goal[1], node.eigen));
    }
  }
  for (const p of node.premises ?? []) collectHypotheses(p, seed, seen);
  return seed;
}

export { atomsOf, clausifyFormula };
