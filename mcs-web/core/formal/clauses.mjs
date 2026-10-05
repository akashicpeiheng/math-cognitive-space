/**
 * core/formal/clauses.mjs —— 定子句化：把认证公式翻译成 Horn 形状（§2.7）。
 *
 * 这一层是「把 ND 翻译成定子句」的**翻译函数**，不是证明器：它只回答
 * 「这个公式在 goal 侧要求证哪些原子、在 fact 侧给出哪些子句」。
 *
 * 原子形状照 §2.7 的 `{ kind:'pred', pred, args }`：恒为「谓词应用」。
 * 表里的两种原子在这里落成两个**内部谓词符号**（它们只活在子句层，不进入 kernel 公式）：
 *
 *   holds(t)   ←→  认证公式 `B(t)`，即 `['eq', t, ['logic','true']]`
 *   eq(t₁,t₂)  ←→  认证公式 `['eq', t₁, t₂]`
 *
 * `atomToFormula` 负责还原回认证公式，供 `certificate.mjs` 装步骤时对齐。
 *
 * 编码约定（逐行对应 §2.7 的表）：
 *   B(t)     goal: 原子 holds(t)              fact: 原子 holds(t)
 *   a ∧ b    goal: 两个子目标（都要证）        fact: 两条子句
 *   a ⇒ b    goal: 以 a 为假设证 b             fact: 子句 b :- a
 *   a ⇔ b    goal: 两个蕴含分别证              fact: 两条子句（Iff 就是 And(Imp,Imp)）
 *   ∀x.φ     goal: 本征变量，证 φ[c/x]         fact: 自由元变量，子句 φ[?x/x]
 *   ∃x.φ     goal: 自由元变量，证 φ[?x/x]      fact: 本征变量（认证语言没有本征常量，
 *                                                   故用避开常量名的自由变量；使用时必须
 *                                                   配 `ex_e` 把本征变量泄漏检查做实）
 *   t₁ = t₂  goal: 原子 eq(t₁,t₂)             fact: 原子 eq(t₁,t₂)
 *   false    goal: 不可证 → unsupported        fact: 不接受
 *
 * ## 子句的 body 是「待证目标」，量词必须留在原子上
 *
 * `A ⇒ B` 在 fact 侧落成子句 `B :- A`，此时 **`A` 是一个待证目标**（不是既成事实），
 * 所以 `A` 按**目标侧**口径翻译：`∀x.φ` 取本征变量、`∃x.φ` 取元变量。
 * 但只有一层原子是不够的——`∀x.φ` 的目标原子必须把量词一起带上，否则
 * `atomToFormula` 还原出来的是「某个自由变量处的 φ」，前提被悄悄弱化成
 * 「随便挑一个元素成立就行」。所以原子多了一个可选的**量词前缀**（§2.7 的
 * `{kind,pred,args}` 仍是它的骨干，`quant` 只是外层的绑定层）：
 *
 *   { kind:'pred', pred, args, quant: [ { role:'eigen', var } | { role:'meta', meta } ] }
 *
 * `quant` 从外到内排列，`atomToFormula` 逆序包回 `∀` / `∃`（元变量在还原时才落成绑定名，
 * 同一个元变量在多个原子里共用同一个绑定名，见证保持共享）。
 * `clauseToFormula` 再把**子句层**的元变量（§2.7：fact 侧 `∀` = 自由元变量）用 `∀` 收起来。
 *
 * 落在定子句片段之外的形状一律 `unsupported`，并指明是哪种形状——**绝不静默丢掉那个 body 原子**：
 * 丢掉/弱化一个前提，会让「公理少了前提」，从而把错误的关系判成成立。
 * 已显式拒绝的形状：析取、`false`、待证子目标前件里的蕴含（`(a⇒b) ⇒ c`）、
 * 待证子目标前件里存在量词体是合取（`∃x.(P∧Q)` 会被迫分配到 `∧` 上，得到更弱的前提）。
 *
 * 复合公式（∧ / ⇔）的 goal 侧会给出**多棵任务树**：每棵树的叶子是「要在同一组子句下
 * 一起证掉的原子」，`formula` 是该（子）目标，`parts` 是它的 ND 结构（∧ 对应 and_i、
 * ⇒ 对应 imp_i、∀ 对应 all_i、∃ 对应 ex_i）。调用方负责按 parts 把叶子重新拼回 ND。
 */

import {
  All, App, B, Eq, Ex, FormalError, Imp, L, V, allNames, deepEqual, formulaOk, fresh, fsub, need,
  normalizeSig,
} from './terms.mjs';
import { freshMeta, isMeta } from './unify.mjs';

/** 内部谓词：B(t)。 */
export const HOLDS_PRED = ['logic', 'holds'];
/** 内部谓词：认证等式 Eq(t1,t2)。 */
export const EQ_PRED = ['logic', 'eq'];

export function isHoldsAtom(atom) {
  return Array.isArray(atom?.pred) && deepEqual(atom.pred, HOLDS_PRED);
}

export function isEqAtom(atom) {
  return Array.isArray(atom?.pred) && deepEqual(atom.pred, EQ_PRED);
}

export function holdsAtom(t) {
  return { kind: 'pred', pred: HOLDS_PRED, args: [t] };
}

export function eqAtom(l, r) {
  return { kind: 'pred', pred: EQ_PRED, args: [l, r] };
}

/**
 * 原子 → 认证公式（holds 还原成 B(t)，eq 还原成 Eq(t1,t2)，最后按 `quant` 补回量词）。
 *
 * 为什么要补量词：body 原子是**待证目标**，`∀x.φ` 的目标侧是「取本征变量证 φ[c/x]」。
 * 只还原 `φ[c/x]` 会把它变成一条**自由变量**公式：`(∀a b. ab=ba) ⇒ C` 被读成
 * `(e0·e1 = e1·e0) ⇒ C`——前提弱了，公理就"进了程序但少了条件"。
 */
export function atomToFormula(atom) {
  need(atom?.kind === 'pred' && Array.isArray(atom.args), 'invalid clause atom');
  let out;
  if (isHoldsAtom(atom)) {
    need(atom.args.length === 1, 'holds arity');
    out = B(atom.args[0]);
  } else if (isEqAtom(atom)) {
    need(atom.args.length === 2, 'eq arity');
    out = ['eq', atom.args[0], atom.args[1]];
  } else {
    throw new FormalError('unknown clause predicate', 'unsupported');
  }
  const quant = atom.quant ?? [];
  for (let i = quant.length - 1; i >= 0; i -= 1) out = underBinder(quant[i], out);
  return out;
}

/**
 * 给原子加一层量词前缀（从内向外调用，`quant` 保持「外 → 内」）。
 * 非破坏性：共享同一原子对象时不会改到别人。
 */
export function withQuant(atom, binder) {
  return { ...atom, quant: [binder, ...(atom.quant ?? [])] };
}

/** 量词前缀的一项 → 把它套回公式（`eigen` 是本征变量，`meta` 是待定见证）。 */
function underBinder(binder, body) {
  need(binder && typeof binder === 'object', 'invalid clause atom binder');
  if (binder.role === 'eigen') {
    need(Array.isArray(binder.var) && binder.var[0] === 'v', 'eigen 量词前缀需要本征变量');
    return All(binder.var, body);
  }
  if (binder.role === 'meta') {
    const meta = binder.meta;
    need(isMeta(meta), 'meta 量词前缀需要元变量');
    // 绑定名可能与本征变量/自由变量重名（那会变成抓取），重名时换一个全新的名字。
    const forbidden = new Set(allNames(body));
    const name = typeof binder.name === 'string' && binder.name && !forbidden.has(binder.name)
      ? binder.name
      : fresh(forbidden);
    const v = V(name, meta[2]);
    return Ex(v, replaceMeta(body, meta, v));
  }
  throw new FormalError(`未知的量词前缀角色：${binder.role}`, 'unsupported');
}

/** 元变量在还原成公式时的稳定绑定名：同一个元变量处处同名（存在见证必须共享）。 */
function metaBinderName(meta) {
  return `w${String(meta[1] ?? 'x').replace(/[^0-9A-Za-z]+/g, '_')}`;
}

/** 把认证项里的元变量换成绑定变量（元变量只会出现在原子的参数里）。 */
function replaceMetaTerm(t, meta, v) {
  if (deepEqual(t, meta)) return v;
  if (!Array.isArray(t)) return t;
  if (t[0] === 'app') return App(replaceMetaTerm(t[1], meta, v), replaceMetaTerm(t[2], meta, v));
  if (t[0] === 'lift') return ['lift', t[1], t[2].map((a) => replaceMetaTerm(a, meta, v))];
  return t;
}

function replaceMeta(f, meta, v) {
  if (!Array.isArray(f) || f.length === 0) return f;
  if (f[0] === 'eq') return Eq(replaceMetaTerm(f[1], meta, v), replaceMetaTerm(f[2], meta, v));
  if (f[0] === 'and' || f[0] === 'or' || f[0] === 'imp') {
    return [f[0], replaceMeta(f[1], meta, v), replaceMeta(f[2], meta, v)];
  }
  if (f[0] === 'all' || f[0] === 'ex') return [f[0], f[1], replaceMeta(f[2], meta, v)];
  return f;
}

/** 原子的结构键（索引/去重用）。 */
export function atomKey(atom) {
  return JSON.stringify([atom.pred, atom.args]);
}

export function atomEquals(a, b) {
  return atomKey(a) === atomKey(b);
}

/** 把一个认证公式拆成「原子形状」的片断（诊断用，不做语义翻译，不检查可证性）。 */
export function atomsOf(f) {
  const out = [];
  const walk = (node) => {
    if (!Array.isArray(node) || node.length === 0) return;
    switch (node[0]) {
      case 'eq':
        out.push(deepEqual(node[2], L('true')) ? holdsAtom(node[1]) : eqAtom(node[1], node[2]));
        return;
      case 'and':
      case 'or':
      case 'imp':
        walk(node[1]);
        walk(node[2]);
        return;
      case 'all':
      case 'ex':
        walk(node[2]);
        return;
      default:
    }
  };
  walk(f);
  return out;
}

// ---------------------------------------------------------------- 翻译

function clauseCtx(sig, prefix) {
  // 入口处做**完整**归一（含「类型是不是源码文本」的体检）；热路径内部的 ensureSig 只管形状。
  return { sig: normalizeSig(sig), prefix, seq: 0, eigenSeq: 0 };
}

function nextClauseId(ctx) {
  ctx.seq += 1;
  return `${ctx.prefix}${ctx.seq}`;
}

/** 取一个避开常量名与已用变量的自由变量名（认证语言没有本征常量，只能用自由变量）。 */
function eigenVariable(ctx, type, used) {
  let i = ctx.eigenSeq;
  for (;;) {
    const name = `e${i}`;
    i += 1;
    if (name in ctx.sig.constants) continue;
    if (used.has(name)) continue;
    ctx.eigenSeq = i;
    return V(name, type);
  }
}

/**
 * fact 侧：公式 → Horn 子句。
 * 返回 `[{ id, head, body, vars, source }]`。
 */
export function factClauses(f, sig, { prefix = 'c', ctx = null } = {}) {
  const c = ctx ?? clauseCtx(sig, prefix);
  return factOf(f, c);
}

function factOf(f, ctx) {
  const k = f[0];
  if (k === 'false') throw new FormalError('fact 侧不接受 false（内核没有 false_e）', 'unsupported');
  if (k === 'or') throw new FormalError('认证语言不接受析取（内核没有 or 规则）', 'unsupported');
  if (k === 'eq') {
    const atom = deepEqual(f[2], L('true')) ? holdsAtom(f[1]) : eqAtom(f[1], f[2]);
    return [{ id: nextClauseId(ctx), head: atom, body: [], vars: [], source: { kind: 'formula', formula: f } }];
  }
  if (k === 'and') return [...factOf(f[1], ctx), ...factOf(f[2], ctx)];
  if (k === 'imp') {
    /*
     * `A ⇒ B` 在 fact 侧是子句 `B :- A`：`B` 按 fact 侧展开成若干条子句（合取后件拆多条），
     * `A` 是**待证子目标**，按目标侧口径翻译（`∀` → 本征变量 + 量词前缀、`∃` → 元变量）。
     *
     * 这里必须复用**同一个** ctx。曾经的写法是 `goalAtoms(f[1], ctx)`——把子句上下文
     * 当成 `sig` 传进去，于是 `goalOf` 的 all/ex 分支读 `ctx.sig.constants` 时拿到
     * undefined（TypeError: Cannot convert undefined or null to object）。后来
     * `terms.mjs#ensureSig` 会把这个错误 sig 归一成「空签名」，崩溃于是**变成静默错语义**：
     * 量词前件被翻成一个丢掉量词、带自由本征变量的原子，
     * `bg-abelian-group-expansion` 那一支合取还原出来就是
     * `group_concept(mm)(ee)(ii) ⇒ (mm(e0)(e1) = mm(e1)(e0) ⇒ abelian_group(…))`
     * ——前提被弱化，公理"进了程序却少了条件"。共用 ctx 同时保证本征变量编号在
     * 一条公式的各条子句之间不重复。
     */
    const body = goalOf(f[1], ctx, 'body');
    return factOf(f[2], ctx).map((clause) => ({ ...clause, body: [...body, ...clause.body], source: { kind: 'implication', formula: f, antecedent: f[1] } }));
  }
  if (k === 'all') {
    const meta = freshMeta('x', f[1][2]);
    const bodyClauses = factOf(fsub(f[2], f[1], meta), ctx);
    return bodyClauses.map((clause) => ({ ...clause, vars: [meta, ...clause.vars], source: { kind: 'all', formula: f, binder: f[1] } }));
  }
  if (k === 'ex') {
    // 本征变量：不用 ['c',名]（认证语言里未声明的常量会被 kernel 拒），用自由变量。
    const used = new Set([...allNames(f), ...Object.keys(ctx.sig.constants)]);
    const eigen = eigenVariable(ctx, f[1][2], used);
    const bodyClauses = factOf(fsub(f[2], f[1], eigen), ctx);
    return bodyClauses.map((clause) => ({ ...clause, vars: [eigen, ...clause.vars], source: { kind: 'ex', formula: f, binder: f[1], eigen } }));
  }
  throw new FormalError(`不支持把公式翻译成子句：${k}`, 'unsupported');
}

/**
 * goal 侧：公式 → 原子清单（用于「同一个假设域下一起证」）。
 *
 * `body:true` 表示这些原子是**子句体**（fact 侧蕴含的前件）：比 goal 侧多两条纪律——
 * 不许把蕴含的假设丢掉、不许把 `∃` 分配到 `∧` 上（见 `goalOf`）。
 */
export function goalAtoms(f, sig, { prefix = 'c', ctx = null, body = false } = {}) {
  const c = ctx ?? clauseCtx(sig, prefix);
  return goalOf(f, c, body ? 'body' : 'goal');
}

/**
 * 公式 → 待证原子。`mode='body'` 时对超出定子句片段的形状报 `unsupported`。
 *
 * 为什么 mode 要分：`a ⇒ b` 与 `∃x.(P∧Q)` 在**目标**位置是合法的（假设/见证由证明树承载），
 * 但落在**子句体**里就没有承载它们的地方——丢掉假设、或把 `∃` 分配到 `∧` 上，
 * 都会得到一条**前提被弱化**的子句。此时宁可 unsupported。
 */
function goalOf(f, ctx, mode = 'goal') {
  const k = f[0];
  if (k === 'false') throw new FormalError('false 在首版不可证（没有 false_e 规则）', 'unsupported');
  if (k === 'or') throw new FormalError('认证语言不接受析取（内核没有 or 规则）', 'unsupported');
  if (k === 'eq') return [deepEqual(f[2], L('true')) ? holdsAtom(f[1]) : eqAtom(f[1], f[2])];
  if (k === 'and') return [...goalOf(f[1], ctx, mode), ...goalOf(f[2], ctx, mode)];
  if (k === 'imp') {
    if (mode === 'body') {
      throw new FormalError(
        '待证子目标的前件里出现蕴含（(a ⇒ b) ⇒ c）：子句体里没有承载假设 a 的位置，'
        + '丢掉它就等于给公理少写一个前提——超出定子句片段',
        'unsupported',
      );
    }
    // 目标侧：以 a 为假设证 b。假设由任务树 / 调用方的作用域承载，这里只回 b 的原子（§2.7）。
    return goalOf(f[2], ctx, mode);
  }
  if (k === 'all') {
    const used = new Set([...allNames(f), ...Object.keys(ctx.sig.constants)]);
    const eigen = eigenVariable(ctx, f[1][2], used);
    // 量词不能丢：`∀` 分配到 `∧` 上是等价的（∀x.(P∧Q) ⟺ ∀x.P ∧ ∀x.Q），
    // 所以每个原子各自带一层同名本征变量的量词前缀即可。
    return goalOf(fsub(f[2], f[1], eigen), ctx, mode).map((atom) => withQuant(atom, { role: 'eigen', var: eigen }));
  }
  if (k === 'ex') {
    const meta = freshMeta('x', f[1][2]);
    const inner = goalOf(fsub(f[2], f[1], meta), ctx, mode);
    if (mode === 'body' && inner.length !== 1) {
      throw new FormalError(
        '待证子目标的前件里，存在量词体是一个合取（∃x.(P∧Q)）：拆成多个原子等于把 ∃ 分配到 ∧ 上，'
        + '(∃x.P) ∧ (∃x.Q) 比 ∃x.(P∧Q) 弱——前提被弱化，超出定子句片段',
        'unsupported',
      );
    }
    // 元变量在还原成公式时才落成绑定名：同一个元变量处处同名，多个原子里共享同一个见证。
    const binder = { role: 'meta', meta, name: metaBinderName(meta) };
    return inner.map((atom) => withQuant(atom, binder));
  }
  throw new FormalError(`不支持把公式翻译成目标原子：${k}`, 'unsupported');
}

/**
 * goal 侧：公式 → 任务树。
 * 节点：`{ formula, kind, clauses, goals, parts, eigen?, meta?, hypothesis? }`。
 * 叶子（kind='leaf'）带 `clauses`（该作用域下可用的子句）与 `goals`（要证的原子）。
 */
export function goalTaskTree(f, sig, { prefix = 'c' } = {}) {
  const ctx = clauseCtx(sig, prefix);
  return goalTask(f, [], ctx);
}

function goalTask(f, clauses, ctx) {
  const k = f[0];
  if (k === 'and') {
    return {
      formula: f, kind: 'and', clauses: [], goals: [],
      parts: [goalTask(f[1], clauses, ctx), goalTask(f[2], clauses, ctx)],
    };
  }
  if (k === 'imp') {
    const ante = factOf(f[1], ctx);
    const inner = goalTask(f[2], [...clauses, ...ante], ctx);
    return { formula: f, kind: 'imp', clauses: [], goals: [], hypothesis: f[1], antecedentClauses: ante, parts: [inner] };
  }
  if (k === 'all') {
    const used = new Set([...allNames(f), ...Object.keys(ctx.sig.constants)]);
    const eigen = eigenVariable(ctx, f[1][2], used);
    const inner = goalTask(fsub(f[2], f[1], eigen), clauses, ctx);
    return { formula: f, kind: 'all', clauses: [], goals: [], eigen, parts: [inner] };
  }
  if (k === 'ex') {
    const meta = freshMeta('x', f[1][2]);
    const inner = goalTask(fsub(f[2], f[1], meta), clauses, ctx);
    return { formula: f, kind: 'ex', clauses: [], goals: [], meta, parts: [inner] };
  }
  if (k === 'false') throw new FormalError('false 在首版不可证（没有 false_e 规则）', 'unsupported');
  if (k === 'or') throw new FormalError('认证语言不接受析取（内核没有 or 规则）', 'unsupported');
  if (k === 'eq') {
    const atom = deepEqual(f[2], L('true')) ? holdsAtom(f[1]) : eqAtom(f[1], f[2]);
    return { formula: f, kind: 'leaf', clauses, goals: [atom], parts: null };
  }
  throw new FormalError(`不支持的目标公式：${k}`, 'unsupported');
}

/** 任务树的叶子。 */
export function leafTasks(task, out = []) {
  if (!task) return out;
  if (task.kind === 'leaf') { out.push(task); return out; }
  for (const part of task.parts ?? []) leafTasks(part, out);
  return out;
}

/**
 * §2.7 的入口。
 * 返回 `{ clauses, goals, tasks, taskTree, unsupported }`：
 * - role 'fact'：`clauses` 是 Horn 子句，`goals` 为空；
 * - role 'goal'：`taskTree` 是 ND 结构、`tasks` 是它的叶子；只有**单叶**时
 *   `clauses` / `goals` 才等于那片的视图（多叶时给空数组，避免把不同假设域的子句混在一起）。
 */
export function clausifyFormula(f, sig, { role = 'goal', prefix = 'c' } = {}) {
  sig = normalizeSig(sig); // 解析层签名 / 缺 constants 的签名在这里就给出可读错误
  formulaOk(f, sig);
  if (role === 'fact') {
    const clauses = factClauses(f, sig, { prefix });
    return { clauses, goals: [], tasks: [{ formula: f, kind: 'leaf', clauses, goals: [] }], taskTree: null, unsupported: null };
  }
  if (role !== 'goal') throw new FormalError(`unknown clausify role: ${role}`, 'error');
  const taskTree = goalTaskTree(f, sig, { prefix });
  const tasks = leafTasks(taskTree);
  const single = tasks.length === 1 && deepEqual(tasks[0].formula, f);
  return {
    clauses: single ? tasks[0].clauses : [],
    goals: single ? tasks[0].goals : [],
    tasks,
    taskTree,
    unsupported: null,
  };
}

/**
 * 把子句还原成「隐含式公式」：body 为空时就是 head 的公式。
 *
 * 两处必须还原到位，否则还原出来的公式**不是原文**：
 * 1. 原子里带 `quant` 的（body 里 `∀x.φ` / `∃x.φ` 的待证目标）由 `atomToFormula` 包回量词；
 * 2. **子句层的元变量**（§2.7：fact 侧 `∀` = 自由元变量）在这里换成被 `∀` 绑定的变量。
 *    元变量只是子句变量，直接塞进认证公式会留下 `['?',…]`，`formulaOk` 当场拒收——
 *    `search#formulaFromAtoms` 走的正是这条路。
 *
 * 不过子句变量表可以缺（程序条目 `{id,kind,source,atoms}` 就只带 `atoms`），
 * 所以元变量以**原子里真实出现的**为准，`clause.vars` 只用来定序。
 *
 * 自由**本征变量**（fact 侧 `∃` 的痕迹）不在全称绑定之列：它只能由 `ex_e` 收口，
 * 不是全称变量。还原出来若仍有自由本征变量，调用方要自己保证收口（否则就是开放公式）。
 */
export function clauseToFormula(clause) {
  const parts = [clause.head, ...(clause.body ?? [])];
  const metas = orderedMetas(parts, clause.vars);
  const forbidden = new Set();
  for (const part of parts) for (const name of allNames(part.args ?? [])) forbidden.add(name);
  const names = new Map();
  for (const meta of metas) {
    const name = fresh(forbidden);
    forbidden.add(name);
    names.set(meta[1], V(name, meta[2]));
  }
  const used = new Set();
  const put = (f) => replaceClauseMetas(f, names, used);
  let out = put(atomToFormula(clause.head));
  for (let i = (clause.body ?? []).length - 1; i >= 0; i -= 1) out = Imp(put(atomToFormula(clause.body[i])), out);
  for (let i = metas.length - 1; i >= 0; i -= 1) {
    if (used.has(metas[i][1])) out = All(names.get(metas[i][1]), out);
  }
  return out;
}

/** 子句里出现的元变量（先按 `vars` 的登记序，再补上只出现在原子里的），去重保序。 */
function orderedMetas(parts, vars) {
  const out = [];
  const seen = new Set();
  const add = (meta) => {
    if (!isMeta(meta) || seen.has(meta[1])) return;
    seen.add(meta[1]);
    out.push(meta);
  };
  for (const variable of vars ?? []) add(variable);
  const walk = (node) => {
    if (Array.isArray(node) && isMeta(node)) { add(node); return; }
    if (!Array.isArray(node)) return;
    for (const item of node) walk(item);
  };
  for (const part of parts) walk(part?.args ?? part);
  return out;
}

/** 把公式里的子句层元变量换成绑定变量（`used` 记录真正用到的，供外包 `∀` 定序）。 */
function replaceClauseMetas(f, names, used) {
  const term = (t) => {
    if (!Array.isArray(t)) return t;
    if (isMeta(t) && names.has(t[1])) {
      used.add(t[1]);
      return names.get(t[1]);
    }
    if (t[0] === 'app') return App(term(t[1]), term(t[2]));
    if (t[0] === 'lift') return ['lift', t[1], t[2].map(term)];
    return t;
  };
  if (!Array.isArray(f) || f.length === 0) return f;
  if (f[0] === 'eq') return Eq(term(f[1]), term(f[2]));
  if (f[0] === 'and' || f[0] === 'or' || f[0] === 'imp') {
    return [f[0], replaceClauseMetas(f[1], names, used), replaceClauseMetas(f[2], names, used)];
  }
  if (f[0] === 'all' || f[0] === 'ex') return [f[0], f[1], replaceClauseMetas(f[2], names, used)];
  return f;
}

/** 子句/原子的可读形状（错误信息与统计里用）。 */
export function describeClause(clause) {
  const head = atomToFormula(clause.head);
  if (!clause.body.length) return JSON.stringify(head);
  return `${clause.body.map((a) => JSON.stringify(atomToFormula(a))).join(' ∧ ')} ⇒ ${JSON.stringify(head)}`;
}

// ---------------------------------------------------------------- 子句 → search 程序

/**
 * 一条子句 → 一条 `search` 程序条目（§2.8 的 `{id, kind, source, atoms}`）。
 *
 * `clausifyFormula` 产出的是**子句**（`{head, body, vars}`），`search` 要的是**程序条目**；
 * 两者之间只有这一种官方转换，不要在调用方各写一份。
 * `atoms` 用 §2.7 的原子形状，顺序是 `[头, …体]`。
 *
 * `kind` 决定这条子句在证书里的**理由**（不能凭空造理由）：
 * `hypothesis`（局部假设）/ `axiom`（有限理论成员，要配 `theoryAxiomId`）/
 * `definition`（定义展开等式）/ `lemma`（已重放通过的引理）。
 */
export function clauseToProgramEntry(clause, { id, kind = 'hypothesis', source = null } = {}) {
  need(clause && clause.head, 'clauseToProgramEntry 需要一条带 head 的子句', 'error');
  need(['hypothesis', 'axiom', 'definition', 'lemma'].includes(kind), `程序条目 kind 未知：${kind}`, 'error');
  return {
    id: id ?? clause.id,
    kind,
    source: source ?? clause.source ?? null,
    atoms: [clause.head, ...(clause.body ?? [])],
  };
}

/** 一批子句 → `search` 的 `program`（全部当局部假设，或指定统一 kind）。 */
export function programFromClauses(clauses, options = {}) {
  const list = clauses ?? [];
  return {
    hypotheses: [],
    clauses: list.map((clause, index) => clauseToProgramEntry(clause, {
      ...options,
      id: options.idPrefix ? `${options.idPrefix}${index}` : (clause.id ?? `${options.kind ?? 'hypothesis'}${index}`),
    })),
  };
}

/**
 * 混合条目的统一入口：`{id, formula}` / 子句 `{head, body}` / 已是程序条目 → `program`。
 * 已经是 `{kind, atoms|formula}` 形状的条目原样透传（后补 `id`）。
 */
export function toProgram(entries, { defaultKind = 'hypothesis' } = {}) {
  const program = { hypotheses: [], clauses: [] };
  const list = Array.isArray(entries) ? entries : Object.values(entries ?? {});
  list.forEach((entry, index) => {
    need(entry && typeof entry === 'object', `toProgram 的第 ${index} 项不是对象`, 'error');
    if (entry.head) {
      program.clauses.push(clauseToProgramEntry(entry, { kind: entry.kind ?? defaultKind }));
      return;
    }
    if (entry.formula || entry.atoms || entry.conclusion
      || entry.definitionName || entry.theoryAxiomId || entry.lemmaId) {
      program.clauses.push({
        id: entry.id ?? `${defaultKind}${index}`,
        kind: entry.kind ?? defaultKind,
        source: entry.source ?? null,
        ...(entry.atoms ? { atoms: entry.atoms } : {}),
        ...(entry.formula ? { formula: entry.formula } : {}),
        ...(entry.conclusion ? { conclusion: entry.conclusion } : {}),
        ...(entry.theoryAxiomId ? { theoryAxiomId: entry.theoryAxiomId } : {}),
        ...(entry.definitionName ? { definitionName: entry.definitionName } : {}),
        ...(entry.lemmaId ? { lemmaId: entry.lemmaId } : {}),
        ...(entry.proofId ? { proofId: entry.proofId } : {}),
      });
      return;
    }
    throw new FormalError(`toProgram 的第 ${index} 项既不是子句也不是程序条目`, 'error');
  });
  return program;
}
