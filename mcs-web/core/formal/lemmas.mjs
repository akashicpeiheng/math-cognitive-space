/**
 * core/formal/lemmas.mjs —— 把「自由变量 + 开放假设」的局部证书闭成可复用的**参数化引理**。
 *
 * ## 为什么需要这一层
 *
 * 局部证书（`certificates/{limit,manifold,tensor,group}.json`）的结论里有自由变量
 * （group 的 `g h`、tensor 的 `alpha v x y`…），有的还带开放假设（group 的
 * `equal_left_translations`）。这种证书**内核是收的**（根结论允许自由变量），
 * 但它没法当一条公共命题复用：
 *
 * - `theorem` 规则明确拒绝引用开放假设非空的引理（kernel：`external theorem has open assumptions`）；
 * - 关系目标要求结论是**闭公式**，否则「这条命题」取决于 g、h 取什么，不能入库。
 *
 * 这里做的就是把「局部、带前提」的证书抬成「闭的、参数化的」引理：
 * `∀v1…vn. h1 ⇒ … ⇒ hm ⇒ 原结论`。
 *
 * ## 构造顺序（这一点错了内核直接拒）
 *
 * **先把每条开放假设用 `imp_i` 蕴含化，再把自由变量用 `all_i` 逐个闭合。**
 *
 * kernel 的 `all_i` 有一条本征变量条件：
 * 「本征变量不得出现在该步骤的开放假设里」。若先 `all_i`（此时假设还开着），
 * g、h 会落在开放假设里，内核判 failed（实测信息：
 * `universal eigenvariable leaks into open assumptions`）。先蕴含化，
 * `all_i` 步骤上的开放假设集合就空了，条件自然满足 —— 这也正是参数化引理的语义：
 * `∀params. 前提(params) ⇒ 结论(params)`。
 *
 * 反过来，如果某条开放假设**消不掉**（`ctx.hypotheses` 里没有它的公式，
 * `imp_i` 就造不出来），本征变量会**真的**留在开放假设里。这时如实报
 * `eigenvariable-conflict` / `open-hypothesis-remains`，**不改名绕过、不硬造证书**：
 * 硬造出来的那份内核一定会拒（同一条 `all_i` 条件）。
 *
 * ## 与 kernel 的对应关系（逐条）
 *
 * | 本层做的事 | kernel 规则 | 依据 |
 * |---|---|---|
 * | 消掉一条开放假设 | `imp_i` | `hypotheses[h]` 必须在证明的 `hypotheses` 里声明 |
 * | 闭合一个自由变量 | `all_i` | `need(v[1] not in formula_fv(hypotheses[h]) for h in hs)` |
 * | 结论形态 | — | `∀v1…vn. h1 ⇒ … ⇒ hm ⇒ 原结论` |
 *
 * 步骤内容是**原样搬运**的（一个字都不改），只追加 `imp_i` / `all_i` 两类新步骤；
 * 因此不需要重跑搜索，也不会悄悄换掉原来的证明。
 *
 * 唯一必须动的一处：**去掉 `object_conclusion`**。kernel 见到这个字段会核对
 * `same(f, B(lift(p)))`，而闭合后的结论是量词/蕴含式，原来的对象层结论不再与它对应
 * （实测：留着它就是 `final HOL/FOL translation mismatch`）。去掉是**删掉一项声明**，
 * 不是把结论改弱。
 */

import { digest, KERNEL_VERSION } from './codec.mjs';
import { checkProofGraph } from './certificate.mjs';
import {
  All, FormalError, Imp, V, formulaFv, formulaOk, need, sameFormula, stableVarKey,
} from './terms.mjs';

/** 拒绝闭合的原因（都如实返回，不抛异常——调用方要能把原因写进判定与界面）。 */
export const CLOSE_REASONS = Object.freeze([
  'eigenvariable-conflict',   // 本征变量落在消不掉的开放假设里
  'open-hypothesis-remains',  // 有开放假设消不掉，闭不了
  'variable-order-mismatch',  // variableOrder 不是结论自由变量的排列
  'unknown-variable',         // boundPrefix 里的变量不在结论的自由变量里
  'invalid-certificate',      // 输入自相矛盾（假设声明与证明自带的声明对不上）
]);

const refuse = (reason, message, offender = null, notes = []) => ({ ok: false, reason, message, offender, notes });

// ---------------------------------------------------------------- 输入归一

function asHypothesisMap(input) {
  if (input instanceof Map) return new Map(input);
  if (input && typeof input === 'object') return new Map(Object.entries(input));
  return new Map();
}

function sameLabelSet(a, b) {
  if (a.size !== b.size) return false;
  for (const item of a) if (!b.has(item)) return false;
  return true;
}

/**
 * 从输入里取出**证明对象**与配套的理论。
 * 认三种形状：kernel bundle、裸 proof 对象、`{ proof, theory }` 包装。
 */
export function certificateProof(cert) {
  need(cert && typeof cert === 'object', 'closeCertificate 需要一份证书或证明对象', 'error');
  if (Array.isArray(cert.steps)) {
    return { proof: cert, theory: cert.theory ?? null, targetId: null };
  }
  if (cert.proofs && typeof cert.proofs === 'object') {
    const targetId = typeof cert.target === 'string' ? cert.target : Object.keys(cert.proofs)[0];
    const proof = cert.proofs?.[targetId];
    need(proof && Array.isArray(proof.steps), `bundle 里找不到目标证明：${String(targetId)}`, 'error');
    return { proof, theory: cert.theory ?? null, targetId };
  }
  if (cert.proof && Array.isArray(cert.proof.steps)) {
    return { proof: cert.proof, theory: cert.theory ?? null, targetId: typeof cert.target === 'string' ? cert.target : null };
  }
  throw new FormalError('closeCertificate 认不出输入形状（既不是 bundle，也不是证明对象）', 'error');
}

/**
 * 按 kernel 的口径重算「根上还开着哪些假设」（`replay` 里的 `hs` 传递）。
 * 不轻信证书自报的 `open_hypotheses`：自报字段只是被核对的对象，不是依据。
 */
export function openHypothesesOf(proof) {
  const steps = new Map();
  for (const step of proof?.steps ?? []) steps.set(step.id, step);
  const memo = new Map();
  const visiting = new Set();
  const openOf = (id) => {
    if (memo.has(id)) return memo.get(id);
    need(steps.has(id), `证明引用了不存在的步骤：${String(id)}`, 'error');
    need(!visiting.has(id), `证明的步骤依赖成环：${String(id)}`, 'error');
    visiting.add(id);
    const step = steps.get(id);
    const premiseSets = (step.premises ?? []).map(openOf);
    let out;
    switch (step.rule) {
      case 'assume': out = new Set([step.hypothesis]); break;
      case 'h_axiom': case 'theory': case 'definition': case 'theorem': out = new Set(); break;
      case 'imp_i': out = new Set([...premiseSets[0]].filter((h) => h !== step.discharge)); break;
      // ex_e 只释放 case 推导，不释放存在前提（与 kernel 一字不差）。
      case 'ex_e': out = new Set([...premiseSets[0], ...[...premiseSets[1]].filter((h) => h !== step.discharge)]); break;
      default: out = new Set(premiseSets.flatMap((set) => [...set]));
    }
    visiting.delete(id);
    memo.set(id, out);
    return out;
  };
  for (const step of proof?.steps ?? []) openOf(step.id);
  return openOf(proof?.root);
}

/** 结论的自由变量，按 kernel `parameters()` 同口径排序（稳定序列化的字典序）。 */
export function sortFreeVariables(fv) {
  return Object.entries(fv)
    .map(([name, type]) => V(name, type))
    .sort((a, b) => (stableVarKey(a) < stableVarKey(b) ? -1 : stableVarKey(a) > stableVarKey(b) ? 1 : 0));
}

/** `boundPrefix` 的条目：`['v',名,类型]`、`{name,type}` 或光名字（类型取结论里的自由变量类型）。 */
function normalizePrefixEntry(raw, fv) {
  if (Array.isArray(raw) && raw[0] === 'v') return { name: raw[1], type: raw[2] };
  if (typeof raw === 'string') return { name: raw, type: fv[raw] ?? null };
  if (raw && typeof raw === 'object' && typeof raw.name === 'string') return { name: raw.name, type: raw.type ?? fv[raw.name] ?? null };
  return null;
}

// ---------------------------------------------------------------- 入口

/**
 * 把一份「自由变量 + 开放假设」的证书闭成参数化引理证书。
 *
 * @param {object} cert kernel bundle / 证明对象 / `{ proof, theory }` 包装
 * @param {{sig?:object, hypotheses?:Map<string,unknown>|object, variableOrder?:string[],
 *          boundPrefix?:Array, theory?:object, id?:string, theoremId?:string}} ctx
 *        - `hypotheses`：假设声明表（label → 认证公式）。**给了就以它为准**：
 *          某条开放假设不在表里，它的 `imp_i` 就造不出来，只能保持开放（随后如实报冲突）；
 *        - `variableOrder`：量词顺序（**最外层在前**），缺省 = 结论自由变量的规范字典序；
 *        - `boundPrefix`：附加在最外层的本征变量（先于 `variableOrder` 出现），
 *          元素可以是 `['v',名,类型]`、`{name,type}` 或光名字；
 *        - `theory`：给了就按它重算 `theory_sha256`（bundle 里所有证明共用同一理论）。
 * @returns {{ok:true, proof:object, conclusion:unknown, theorem:object, notes:string[]}
 *          | {ok:false, reason:string, message:string, offender:object|null, notes:string[]}}
 */
export function closeCertificate(cert, ctx = {}) {
  const notes = [];
  const { proof: source, theory: certTheory, targetId } = certificateProof(cert);
  const theory = ctx.theory ?? certTheory ?? null;
  const sig = ctx.sig ?? null;

  // ---- 1. 开放假设：从步骤重算（不轻信自报字段） ----
  const open = openHypothesesOf(source);
  const declaredOpen = new Set(Object.keys(source.open_hypotheses ?? {}));
  if (!sameLabelSet(open, declaredOpen)) {
    notes.push(`原证书自报的 open_hypotheses（${[...declaredOpen].sort().join('、') || '空'}）与按步骤重算的结果（${[...open].sort().join('、') || '空'}）不一致，以重算为准。`);
  }

  // ---- 2. 假设声明表 ----
  // `ctx.hypotheses` 给了就是**权威**声明表：表里没有这条假设的公式，它的 imp_i 就造不出来
  // （不从证明的自报字段里替调用方补声明）；没给表才退回证明自带的 `hypotheses`。
  const tableGiven = ctx.hypotheses !== undefined && ctx.hypotheses !== null;
  const table = tableGiven ? asHypothesisMap(ctx.hypotheses) : asHypothesisMap(source.hypotheses);
  const own = asHypothesisMap(source.hypotheses);
  /** 消解用的公式：权威表里没有 → 消不掉。 */
  const dischargeFormula = (label) => {
    const mine = own.get(label);
    const given = table.get(label);
    if (Array.isArray(mine) && Array.isArray(given) && !sameFormula(mine, given)) return { conflict: true };
    if (Array.isArray(given)) return { formula: given };
    if (!tableGiven && Array.isArray(mine)) return { formula: mine };
    return { formula: null };
  };
  /** 本征变量检查用的公式：两条来源都看——只要知道形状，就能判本征变量在不在里面。 */
  const knownFormula = (label) => {
    const mine = own.get(label);
    if (Array.isArray(mine)) return mine;
    const given = table.get(label);
    return Array.isArray(given) ? given : null;
  };

  // ---- 3. 变量序：缺省 = 结论自由变量的规范字典序 ----
  const fv = formulaFv(source.conclusion);
  const canonical = sortFreeVariables(fv);
  let ordered;
  if (ctx.variableOrder === undefined || ctx.variableOrder === null) {
    ordered = canonical;
  } else {
    const requested = [...ctx.variableOrder].map((name) => String(name));
    const canonicalNames = canonical.map((variable) => variable[1]);
    const missing = canonicalNames.filter((name) => !requested.includes(name));
    const extra = requested.filter((name) => !canonicalNames.includes(name));
    if (missing.length || extra.length) {
      return refuse(
        'variable-order-mismatch',
        `variableOrder 必须是结论自由变量的一个排列：缺 ${missing.join('、') || '（无）'}，多 ${extra.join('、') || '（无）'}。`,
        { missing, extra, freeVariables: canonicalNames },
        notes,
      );
    }
    ordered = requested.map((name) => canonical.find((variable) => variable[1] === name));
  }

  // ---- 4. 附加在最外层的本征变量 ----
  const prefixVars = [];
  for (const raw of ctx.boundPrefix ?? []) {
    const entry = normalizePrefixEntry(raw, fv);
    if (!entry || !entry.type || !Object.prototype.hasOwnProperty.call(fv, entry.name)) {
      return refuse(
        'unknown-variable',
        `boundPrefix 里的变量 ${entry?.name ?? String(raw)} 不在结论的自由变量里：没有东西可闭合，套上去只是空量词。`,
        { variable: entry?.name ?? null },
        notes,
      );
    }
    if ([...prefixVars, ...ordered].some((variable) => variable[1] === entry.name)) {
      return refuse('variable-order-mismatch', `变量 ${entry.name} 在量词顺序里出现了两次。`, { variable: entry.name }, notes);
    }
    prefixVars.push(V(entry.name, entry.type));
  }
  const variables = [...prefixVars, ...ordered];

  const theoremId = ctx.id ?? ctx.theoremId ?? cert.id ?? targetId ?? 'lemma';
  const entryOf = (conclusion) => ({
    id: theoremId, conclusion, openHypotheses: [], proofId: theoremId,
  });

  // ---- 5. 幂等：没有开放假设、也没有要闭合的自由变量 —— 原样返回 ----
  if (open.size === 0 && variables.length === 0) {
    return {
      ok: true,
      proof: source,
      conclusion: source.conclusion,
      theorem: entryOf(source.conclusion),
      notes: ['已是闭引理'],
    };
  }

  // ---- 6. 释放计划：能造 imp_i 的（权威表里有公式）才消得掉 ----
  const dischargeLabels = [];
  const stuck = [];
  for (const label of [...open].sort()) {
    const found = dischargeFormula(label);
    if (found.conflict) {
      return refuse(
        'invalid-certificate',
        `假设 ${label} 在 ctx.hypotheses 与证明自带的声明里不是同一条公式：imp_i 的结论会与 assume 叶子对不上。`,
        { hypothesis: label },
        notes,
      );
    }
    if (found.formula) dischargeLabels.push({ label, formula: found.formula });
    else stuck.push(label);
  }

  // ---- 7. 本征变量条件：在 all_i 步骤上，开放假设只剩 stuck ----
  //        先把 stuck 消掉是不可能的（造不出 imp_i），所以要么没有变量落在它们里面，
  //        要么如实拒绝——绝不改名绕过，也绝不硬造一份内核会拒的证书。
  for (const variable of variables) {
    for (const label of stuck) {
      const formula = knownFormula(label);
      if (!Array.isArray(formula)) continue;
      if (Object.prototype.hasOwnProperty.call(formulaFv(formula), variable[1])) {
        return refuse(
          'eigenvariable-conflict',
          `本征变量 ${variable[1]} 落在消不掉的开放假设 ${label} 里：${label} 的公式不在 ctx.hypotheses 里，imp_i 造不出来，`
          + '量词闭合后内核会以 universal eigenvariable leaks into open assumptions 拒绝。',
          { variable: variable[1], type: variable[2], hypothesis: label },
          notes,
        );
      }
    }
  }
  if (stuck.length) {
    const unknown = stuck.filter((label) => !Array.isArray(knownFormula(label)));
    return refuse(
      'open-hypothesis-remains',
      `还有 ${stuck.length} 条开放假设消不掉（${stuck.join('、')}）`
      + `${unknown.length ? `，其中 ${unknown.join('、')} 的公式完全未知` : ''}：本函数只产出**闭**引理，闭不了就如实报，不硬造证书。`,
      { hypotheses: stuck },
      notes,
    );
  }

  // ---- 8. 装配：先蕴含化（内层 hm、最外层 h1），再量词闭合（内层 vn、最外层 v1） ----
  const steps = source.steps.map((step) => ({ ...step }));
  const goals = new Map();
  const ids = new Set();
  for (const step of steps) {
    ids.add(step.id);
    goals.set(step.id, step.conclusion);
  }
  need(typeof source.root === 'string' && goals.has(source.root), `原证明的 root（${String(source.root)}）不是一份步骤`, 'error');
  let counter = 0;
  const freshId = () => {
    let id = `c${counter}`;
    while (ids.has(id)) { counter += 1; id = `c${counter}`; }
    ids.add(id);
    return id;
  };
  let root = source.root;
  for (let i = dischargeLabels.length - 1; i >= 0; i -= 1) {
    const { label, formula } = dischargeLabels[i];
    const id = freshId();
    const conclusion = Imp(formula, goals.get(root));
    steps.push({ id, rule: 'imp_i', conclusion, premises: [root], discharge: label });
    goals.set(id, conclusion);
    root = id;
  }
  for (let i = variables.length - 1; i >= 0; i -= 1) {
    const variable = variables[i];
    const id = freshId();
    const conclusion = All(variable, goals.get(root));
    steps.push({ id, rule: 'all_i', conclusion, premises: [root], variable });
    goals.set(id, conclusion);
    root = id;
  }
  const conclusion = goals.get(root);

  const closed = { ...source, steps, root, conclusion, open_hypotheses: {} };
  if (source.object_conclusion !== undefined) {
    delete closed.object_conclusion;
    notes.push('已去掉 object_conclusion：闭合后的结论是量词/蕴含式，原来的对象层结论不再与它对应（留着会被内核判 final HOL/FOL translation mismatch）。');
  }
  if (theory) {
    closed.checker = KERNEL_VERSION;
    closed.theory_sha256 = digest(theory);
  }
  if (sig) {
    formulaOk(conclusion, sig);
    checkProofGraph(closed, sig);
  }
  if (dischargeLabels.length) {
    notes.push(`已把 ${dischargeLabels.length} 条开放假设蕴含化（按 label 排序，最外层是 ${dischargeLabels[0].label}）。`);
  }
  if (variables.length) {
    notes.push(`已用 all_i 闭合 ${variables.length} 个自由变量（最外层是 ${variables[0][1]}）。`);
  }
  notes.push('闭合顺序：先蕴含化、后量词闭合——反过来本征变量会逃进开放假设，内核会拒。');

  return { ok: true, proof: closed, conclusion, theorem: entryOf(conclusion), notes };
}

/** 供 `assembleProof` 的 `ctx.lemmas` 直接使用的条目（`{id, conclusion, proofId}`）。 */
export function lemmaEntry(closed) {
  need(closed?.ok === true, 'lemmaEntry 需要一次成功的 closeCertificate 结果', 'error');
  return { id: closed.theorem.proofId, conclusion: closed.theorem.conclusion, proofId: closed.theorem.proofId };
}
