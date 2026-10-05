/**
 * core/formal/certificate.mjs —— 把 QueryProof 查询树装配成 kernel 认的证书。
 *
 * 职责边界（§2.8.1/§2.8.2）：
 * - `search.mjs` 只产出 **QueryProof**（`rule` 取值与 kernel 规则一一对应），不碰步骤序号；
 * - 本模块把树重建成 kernel 步骤序列，并做**证明图检查**：步骤 id 唯一、依赖无环、
 *   所有提交的步骤（含没有被根用到的）都必须是良构闭公式——kernel 会遍历全部步骤。
 *
 * 一切「理由」都只能来自 kernel 的 16 条规则；这里不做任何化简、不接受任何"显然"。
 * `witness` / `theory_sha256` / `proof_sha256` 一律用 `codec.mjs` 的 kernel 口径摘要。
 */

import { digest, KERNEL_VERSION, MAX_STEPS } from './codec.mjs';
import {
  All, And, App, B, C, Eq, FormalError, Iff, Imp, L, V, arr, close, deepEqual, ensureSig,
  formulaFv, formulaOk, fresh, fsub, inferTerm, lift, need, objectFv, openBody, parameters,
  sameFormula, sourceTerm, typeOk,
} from './terms.mjs';

export { MAX_STEPS, KERNEL_VERSION };

/** QueryProof 的 rule 取值（与 kernel 规则同名，只有 5 条零前提的理由节点用别名）。 */
export const QUERY_RULES = [
  'hypothesis', 'axiom', 'theory', 'definition', 'lemma',
  'imp_i', 'imp_e', 'and_i', 'and_l', 'and_r', 'refl', 'eq_e',
  'all_i', 'all_e', 'ex_i', 'ex_e',
];

const KERNEL_RULE_OF = {
  hypothesis: 'assume', axiom: 'h_axiom', theory: 'theory', definition: 'definition', lemma: 'theorem',
  imp_i: 'imp_i', imp_e: 'imp_e', and_i: 'and_i', and_l: 'and_l', and_r: 'and_r',
  refl: 'refl', eq_e: 'eq_e', all_i: 'all_i', all_e: 'all_e', ex_i: 'ex_i', ex_e: 'ex_e',
};

// ---------------------------------------------------------------- 背景公理模式

/**
 * 重建 kernel.axiom 的 **闭** H_Sigma 模式。`spec` 的字段与 kernel 一致：
 * `{schema:'two_distinct'|'two_exhaustive'|'logic'|'equality'|'quantifier'|'extensionality'|'abstraction', …}`。
 * 这一段必须与 kernel.axiom 逐字对应，否则 `h_axiom` 会被判 `forged H_Sigma instance`。
 */
export function axiomInstance(spec, sig) {
  sig = ensureSig(sig);
  const k = spec.schema;
  const p = V('p', 'o');
  const q = V('q', 'o');
  let f;
  if (k === 'two_distinct') f = Imp(Eq(L('true'), L('false')), ['false']);
  else if (k === 'two_exhaustive') f = All(p, ['or', B(p), Eq(p, L('false'))]);
  else if (k === 'logic') {
    const op = spec.op;
    need(['not', 'and', 'or', 'imp'].includes(op), 'unknown logical schema', 'unsupported');
    if (op === 'not') f = All(p, Iff(B(App(L(op), p)), Imp(B(p), ['false'])));
    else f = close([p, q], Iff(B(App(App(L(op), p), q)), [op, B(p), B(q)]));
  } else if (k === 'equality') {
    const a = typeOk(spec.type, sig.bases);
    const x = V('x', a);
    const y = V('y', a);
    f = close([x, y], Iff(B(App(App(L('eq', a), x), y)), Eq(x, y)));
  } else if (k === 'quantifier') {
    const a = typeOk(spec.type, sig.bases);
    const op = spec.op;
    need(['all', 'ex'].includes(op), 'quantifier schema', 'unsupported');
    const pred = V('P', arr(a, 'o'));
    const x = V('x', a);
    f = All(pred, Iff(B(App(L(op, a), pred)), [op, x, B(App(pred, x))]));
  } else if (k === 'extensionality') {
    const a = typeOk(spec.domain, sig.bases);
    const b = typeOk(spec.codomain, sig.bases);
    const ff = V('f', arr(a, b));
    const g = V('g', arr(a, b));
    const x = V('x', a);
    f = close([ff, g], Imp(All(x, Eq(App(ff, x), App(g, x))), Eq(ff, g)));
  } else if (k === 'abstraction') {
    const a = sourceTerm(spec.term, sig);
    need(a[0] === 'lam', 'abstraction schema requires lambda');
    const ps = parameters(a);
    const x = V(fresh(new Set([...Object.keys(objectFv(a)), ...Object.keys(sig.constants)])), a[1]);
    // 参数表在**生成时**就填好（term_sub 不进入 lift 内部，事后填参数做不到）。
    f = close([...ps, x], Eq(App(lift(a, sig), x), lift(openBody(a[2], x), sig)));
  } else throw new FormalError(`unsupported axiom schema: ${spec}`, 'unsupported');
  formulaOk(f, sig);
  need(Object.keys(formulaFv(f)).length === 0, 'internal unclosed background axiom');
  return f;
}

/** `abstraction` 实例的存储形状：规范化后的 λ 项（kernel 会自己 source 一遍）。 */
export function abstractionInstance(lamTerm, sig) {
  const a = sourceTerm(lamTerm, sig);
  need(a[0] === 'lam', 'abstraction instance requires lambda');
  return { schema: 'abstraction', term: a };
}

// ---------------------------------------------------------------- QueryProof 构造器

const node = (rule, goal, extra = {}) => {
  need(QUERY_RULES.includes(rule), `unknown query rule: ${rule}`, 'error');
  return { rule, goal, premises: extra.premises ?? [], ...extra };
};

export function hypothesisNode(label, formula) {
  return node('hypothesis', formula, { hypothesis: { name: label, id: label } });
}

export function axiomNode(spec, sig) {
  return node('axiom', axiomInstance(spec, sig), { instance: spec });
}

export function theoryNode(axiomId, formula) {
  return node('theory', formula, { theoryAxiomId: axiomId });
}

export function definitionNode(name, formula) {
  return node('definition', formula, { definitionName: name });
}

export function lemmaNode(lemmaId, formula) {
  return node('lemma', formula, { lemmaId });
}

export function reflNode(t) {
  return node('refl', Eq(t, t));
}

export function impIntro(premise, label, hypothesisFormula) {
  return node('imp_i', Imp(hypothesisFormula, premise.goal), { discharge: label, premises: [premise] });
}

export function impElim(imp, antecedent) {
  need(imp.goal[0] === 'imp', 'imp_e 需要一条蕴含前提', 'error');
  need(sameFormula(imp.goal[1], antecedent.goal), 'imp_e 前件与蕴含不匹配', 'error');
  return node('imp_e', imp.goal[2], { premises: [imp, antecedent] });
}

export function andIntro(left, right) {
  return node('and_i', And(left.goal, right.goal), { premises: [left, right] });
}

export function andElimLeft(premise) {
  need(premise.goal[0] === 'and', 'and_l 需要合取前提', 'error');
  return node('and_l', premise.goal[1], { premises: [premise] });
}

export function andElimRight(premise) {
  need(premise.goal[0] === 'and', 'and_r 需要合取前提', 'error');
  return node('and_r', premise.goal[2], { premises: [premise] });
}

export function allIntro(premise, eigen) {
  need(Array.isArray(eigen) && eigen[0] === 'v', 'all_i 需要本征变量', 'error');
  // kernel 核对 premise ≡ fsub(结论体, 结论绑定, 本征)；取结论 = ∀eigen. premise 即满足。
  return node('all_i', All(eigen, premise.goal), { eigen, premises: [premise] });
}

export function allElim(premise, term) {
  need(premise.goal[0] === 'all', 'all_e 需要全称前提', 'error');
  return node('all_e', fsub(premise.goal[2], premise.goal[1], term), { term, premises: [premise] });
}

export function exIntro(formula, term, premise) {
  need(formula[0] === 'ex', 'ex_i 的结论必须是存在公式', 'error');
  need(sameFormula(premise.goal, fsub(formula[2], formula[1], term)), 'ex_i 实例项与存在公式不匹配', 'error');
  return node('ex_i', formula, { term, premises: [premise] });
}

export function exElim(exPremise, casePremise, label, eigen) {
  need(exPremise.goal[0] === 'ex', 'ex_e 需要存在前提', 'error');
  return node('ex_e', casePremise.goal, { eigen, discharge: label, premises: [exPremise, casePremise] });
}

/** 等式替换：`Eq(l,r)` + `ctx[l/v]` ⊢ `ctx[r/v]`（§2.8.1 的 `variable`/`context`）。 */
export function eqRewrite(eqPremise, ctxApplied, variable, context) {
  need(eqPremise.goal[0] === 'eq', 'eq_e 需要等式前提', 'error');
  const expected = fsub(context, variable, eqPremise.goal[2]);
  return node('eq_e', expected, { variable, context, premises: [eqPremise, ctxApplied] });
}

// ---------------------------------------------------------------- 理论装配

/**
 * 把「声明 + 定义 + 公理」装配成 kernel theory，并给出配套 sig。
 * `definitions` 逐条登记：`name ≜ lift(source(term))`，登记出来的等式供 `definition` 步骤使用。
 * （完整的背景理论库在 `core/formal/theory.mjs`；这里只做装配与重建，不预置任何背景。）
 */
export function kernelTheory({ id, version = '1', bases = ['o'], constants = {}, definitions = [], axioms = [] }) {
  need(typeof id === 'string' && id.length > 0, 'theory id required');
  const sig = { bases: [...bases], constants: { ...constants }, definitions: [] };
  const registered = new Map();
  for (const d of definitions) {
    need(d.kind === undefined || d.kind === 'term', 'only term definitions are supported', 'unsupported');
    need(!(d.name in sig.constants), `nonfresh definition: ${d.name}`);
    const term = sourceTerm(d.term, sig);
    need(Object.keys(objectFv(term)).length === 0, 'term definition must be old-language closed');
    sig.constants[d.name] = typeOk(inferTerm(term, sig), sig.bases);
    // 与 kernel.environment 同序：先登记名字，再算登记等式。
    registered.set(d.name, Eq(C(d.name), lift(term, sig)));
    sig.definitions.push({ kind: 'term', name: d.name, term });
  }
  const axiomList = axioms.map((a) => {
    const f = a.formula ?? axiomInstance(a.spec, sig);
    formulaOk(f, sig);
    need(Object.keys(formulaFv(f)).length === 0, 'theory axioms must be closed');
    return { id: a.id, formula: f };
  });
  const theory = {
    id,
    version,
    bases: [...bases],
    constants: { ...constants },
    definitions: sig.definitions.map((d) => ({ kind: 'term', name: d.name, term: d.term })),
    axioms: axiomList,
  };
  return { theory, sig, definitions: registered, theoryAxioms: axiomList };
}

// ---------------------------------------------------------------- 证明图检查

/** §2.8.1 的证明图检查：id 唯一、依赖无环、全部步骤的结论都是良构认证公式。 */
export function checkProofGraph(proof, sig) {
  sig = ensureSig(sig);
  const problems = [];
  if (!Array.isArray(proof.steps) || proof.steps.length === 0) problems.push('证明没有任何步骤');
  const seen = new Set();
  for (const step of proof.steps ?? []) {
    if (typeof step.id !== 'string' || !step.id) problems.push('步骤缺少 id');
    else if (seen.has(step.id)) problems.push(`步骤 id 重复：${step.id}`);
    else seen.add(step.id);
  }
  for (const step of proof.steps ?? []) {
    for (const p of step.premises ?? []) if (!seen.has(p)) problems.push(`步骤 ${step.id} 引用了不存在的步骤 ${p}`);
    try {
      formulaOk(step.conclusion, sig);
    } catch (error) {
      problems.push(`步骤 ${step.id} 的结论不是良构认证公式：${error.message}`);
    }
  }
  // 环检测（对步骤依赖做 DFS 染色）。
  const byId = new Map((proof.steps ?? []).map((s) => [s.id, s]));
  const state = new Map();
  const visit = (id, stack) => {
    if (state.get(id) === 'done') return;
    if (state.get(id) === 'visiting') { problems.push(`步骤依赖成环：${[...stack, id].join(' → ')}`); return; }
    state.set(id, 'visiting');
    for (const p of byId.get(id)?.premises ?? []) if (byId.has(p)) visit(p, [...stack, id]);
    state.set(id, 'done');
  };
  for (const id of byId.keys()) visit(id, []);
  if (typeof proof.root !== 'string' || !byId.has(proof.root)) problems.push('root 不是已提交的步骤');
  if (problems.length) throw new FormalError(`证明图检查未过：${problems.join('；')}`, 'failed');
  return true;
}

// ---------------------------------------------------------------- 装配

const hsOf = (step, premiseHs) => {
  switch (step.rule) {
    case 'assume': return new Set([step.hypothesis]);
    case 'h_axiom': case 'theory': case 'definition': case 'theorem': return new Set();
    case 'imp_i': return new Set([...premiseHs[0]].filter((h) => h !== step.discharge));
    case 'ex_e': return new Set([...premiseHs[0], ...[...premiseHs[1]].filter((h) => h !== step.discharge)]);
    default: return new Set(premiseHs.flatMap((s) => [...s]));
  }
};

/**
 * QueryProof → kernel 步骤序列。
 * `ctx`：`{ sig, hypotheses: Map<label,formula>, theoryAxioms: [{id,formula}], definitions: Map<name,formula>,
 *           lemmas: [{id, conclusion, proofId}], theorySha256?, proofDigests?: Map<proofId,sha256>,
 *           rootConclusion?, objectConclusion? }`
 * 返回 `{ steps, hypotheses, root, conclusion, open_hypotheses, object_conclusion? }`。
 */
export function assembleProof(queryProof, ctx) {
  need(queryProof && typeof queryProof === 'object', 'assembleProof 需要一棵 QueryProof', 'error');
  need(ctx?.sig, 'assembleProof 需要 ctx.sig', 'error');
  const sig = ensureSig(ctx.sig);
  const hypotheses = ctx.hypotheses ?? new Map();
  const theoryAxioms = new Map((ctx.theoryAxioms ?? []).map((a) => [a.id, a.formula]));
  const definitions = ctx.definitions ?? new Map();
  const lemmas = new Map((ctx.lemmas ?? []).map((l) => [l.id, l]));

  const steps = [];
  const assigned = new Map(); // QueryProof 节点对象 → 步骤 id（共享子树只出一份步骤）
  const visiting = new Set();
  const openHs = new Map(); // 步骤 id → 开放假设集合

  const emit = (queryNode) => {
    if (assigned.has(queryNode)) return assigned.get(queryNode);
    need(!visiting.has(queryNode), 'QueryProof 里出现环（同一节点是自己的祖先）', 'error');
    visiting.add(queryNode);
    const premises = (queryNode.premises ?? []).map(emit);
    const rule = KERNEL_RULE_OF[queryNode.rule];
    need(rule, `未知查证规则：${queryNode.rule}`, 'error');
    const id = `s${steps.length}`;
    const step = { id, rule, conclusion: queryNode.goal, premises };
    switch (queryNode.rule) {
      case 'hypothesis': {
        const label = queryNode.hypothesis?.id ?? queryNode.hypothesis?.name;
        need(hypotheses.has(label), `assume 引用了未声明的假设标签：${label}`);
        need(sameFormula(hypotheses.get(label), queryNode.goal), `assume 的结论与假设 ${label} 不一致`);
        step.hypothesis = label;
        break;
      }
      case 'axiom': {
        const expected = axiomInstance(queryNode.instance, sig);
        need(sameFormula(expected, queryNode.goal), 'h_axiom 的 instance 重建不出该结论');
        step.instance = queryNode.instance;
        break;
      }
      case 'theory': {
        const aid = queryNode.theoryAxiomId;
        need(theoryAxioms.has(aid), `theory 步骤引用了未登记的有限理论成员：${aid}`);
        need(sameFormula(theoryAxioms.get(aid), queryNode.goal), `theory 成员 ${aid} 的结论不一致`);
        step.axiom = aid;
        step.witness = digest(theoryAxioms.get(aid));
        break;
      }
      case 'definition': {
        const name = queryNode.definitionName;
        need(definitions.has(name), `definition 步骤引用了未登记的定义：${name}`);
        need(sameFormula(definitions.get(name), queryNode.goal), `定义 ${name} 的等式不一致`);
        step.name = name;
        break;
      }
      case 'lemma': {
        const lemmaId = queryNode.lemmaId;
        need(lemmas.has(lemmaId), `theorem 步骤引用了未知引理：${lemmaId}`);
        const lemma = lemmas.get(lemmaId);
        need(sameFormula(lemma.conclusion, queryNode.goal), `引理 ${lemmaId} 的结论不一致`);
        need(ctx.theorySha256, 'theorem 步骤需要 ctx.theorySha256');
        const proofSha = ctx.proofDigests?.get(lemma.proofId);
        need(proofSha, `theorem 步骤缺少引理 ${lemma.proofId} 的证明摘要`);
        step.reference = { id: lemma.proofId, checker: KERNEL_VERSION, theory_sha256: ctx.theorySha256, proof_sha256: proofSha };
        break;
      }
      case 'imp_i': {
        need(hypotheses.has(queryNode.discharge), `imp_i 释放了未声明的假设：${queryNode.discharge}`);
        need(sameFormula(queryNode.goal, Imp(hypotheses.get(queryNode.discharge), queryNode.premises[0].goal)), 'imp_i 的结论与释放的假设不匹配');
        step.discharge = queryNode.discharge;
        break;
      }
      case 'imp_e': {
        const [imp, ante] = queryNode.premises;
        need(imp.goal[0] === 'imp' && sameFormula(imp.goal[1], ante.goal) && sameFormula(queryNode.goal, imp.goal[2]), 'imp_e 形状不匹配');
        break;
      }
      case 'and_i':
        need(sameFormula(queryNode.goal, And(queryNode.premises[0].goal, queryNode.premises[1].goal)), 'and_i 形状不匹配');
        break;
      case 'and_l':
        need(queryNode.premises[0].goal[0] === 'and' && sameFormula(queryNode.goal, queryNode.premises[0].goal[1]), 'and_l 形状不匹配');
        break;
      case 'and_r':
        need(queryNode.premises[0].goal[0] === 'and' && sameFormula(queryNode.goal, queryNode.premises[0].goal[2]), 'and_r 形状不匹配');
        break;
      case 'refl':
        need(queryNode.goal[0] === 'eq' && deepEqual(queryNode.goal[1], queryNode.goal[2]), 'refl 只能是 t = t');
        break;
      case 'eq_e': {
        const [eqPremise, ctxApplied] = queryNode.premises;
        need(eqPremise.goal[0] === 'eq', 'eq_e 的第一前提必须是等式');
        need(sameFormula(ctxApplied.goal, fsub(queryNode.context, queryNode.variable, eqPremise.goal[1])), 'eq_e 的 ctx[l/v] 与第二前提不一致');
        need(sameFormula(queryNode.goal, fsub(queryNode.context, queryNode.variable, eqPremise.goal[2])), 'eq_e 的 ctx[r/v] 与结论不一致');
        step.variable = queryNode.variable;
        step.context = queryNode.context;
        break;
      }
      case 'all_i': {
        need(queryNode.goal[0] === 'all', 'all_i 的结论必须是全称公式');
        need(sameFormula(queryNode.premises[0].goal, fsub(queryNode.goal[2], queryNode.goal[1], queryNode.eigen)), 'all_i 的实例与本征变量不匹配');
        step.variable = queryNode.eigen;
        break;
      }
      case 'all_e': {
        const premise = queryNode.premises[0];
        need(premise.goal[0] === 'all', 'all_e 的前提必须是全称公式');
        need(sameFormula(queryNode.goal, fsub(premise.goal[2], premise.goal[1], queryNode.term)), 'all_e 的实例项不匹配');
        step.term = queryNode.term;
        break;
      }
      case 'ex_i': {
        need(queryNode.goal[0] === 'ex', 'ex_i 的结论必须是存在公式');
        need(sameFormula(queryNode.premises[0].goal, fsub(queryNode.goal[2], queryNode.goal[1], queryNode.term)), 'ex_i 的实例项不匹配');
        step.term = queryNode.term;
        break;
      }
      case 'ex_e': {
        const [exPremise, casePremise] = queryNode.premises;
        need(exPremise.goal[0] === 'ex', 'ex_e 的第一前提必须是存在公式');
        const label = queryNode.discharge;
        need(hypotheses.has(label), `ex_e 释放了未声明的假设：${label}`);
        need(sameFormula(hypotheses.get(label), fsub(exPremise.goal[2], exPremise.goal[1], queryNode.eigen)), 'ex_e 的 case 假设与本征实例不一致');
        need(sameFormula(queryNode.goal, casePremise.goal), 'ex_e 的结论必须等于 case 推导的结论');
        step.variable = queryNode.eigen;
        step.discharge = label;
        break;
      }
      default:
        throw new FormalError(`未实现的规则：${queryNode.rule}`, 'error');
    }
    formulaOk(step.conclusion, sig);
    const premiseHs = premises.map((pid) => openHs.get(pid) ?? new Set());
    openHs.set(id, hsOf(step, premiseHs));
    steps.push(step);
    visiting.delete(queryNode);
    assigned.set(queryNode, id);
    return id;
  };

  const root = emit(queryProof);
  if (steps.length > MAX_STEPS) throw new FormalError(`证书步数超过内核上限 ${MAX_STEPS}`, 'resource_exhausted');

  const conclusion = ctx.rootConclusion ? ctx.rootConclusion : queryProof.goal;
  need(sameFormula(conclusion, queryProof.goal), 'rootConclusion 与根节点结论不一致');
  const open = openHs.get(root) ?? new Set();
  const openHypotheses = {};
  for (const label of [...open].sort()) openHypotheses[label] = hypotheses.get(label);

  // 只声明这份证明真正用到的假设标签（kernel 会校验全部声明项，声明多余项没有意义）。
  const usedLabels = new Set();
  for (const step of steps) {
    if (step.hypothesis) usedLabels.add(step.hypothesis);
    if (step.discharge) usedLabels.add(step.discharge);
  }
  const declared = {};
  for (const label of [...usedLabels].sort()) {
    need(hypotheses.has(label), `步骤引用了未声明的假设标签：${label}`);
    declared[label] = hypotheses.get(label);
  }

  const proof = { steps, hypotheses: declared, root, conclusion, open_hypotheses: openHypotheses };
  checkProofGraph(proof, sig);
  if (ctx.objectConclusion !== undefined && ctx.objectConclusion !== null) proof.object_conclusion = ctx.objectConclusion;
  return proof;
}

/** 便利包装：给一条推导套上 `imp_i`。 */
export function dischargeImplication(queryProof, hypothesisLabel, ctx) {
  const formula = ctx.hypotheses.get(hypothesisLabel);
  need(formula, `未声明的假设标签：${hypothesisLabel}`, 'error');
  return impIntro(queryProof, hypothesisLabel, formula);
}

/** 便利包装：给一条推导套上 `all_i`（结论 = ∀variable. 推导）。 */
export function dischargeUniversal(queryProof, variable, ctx) {
  need(ctx?.sig, 'dischargeUniversal 需要 ctx.sig', 'error');
  return allIntro(queryProof, variable);
}

/**
 * 组装完整的 kernel bundle：`{ format, theory, proofs, target }`。
 * 缺 `checker` / `theory_sha256` 时按 `theory` 现算补上（kernel 会核对这两项）。
 */
export function assembleBundle({ theory, proof, targetId = 'main' }) {
  need(theory && typeof theory === 'object', 'assembleBundle 需要 theory', 'error');
  need(proof && typeof proof === 'object', 'assembleBundle 需要 proof', 'error');
  const theorySha = digest(theory);
  const filled = { checker: KERNEL_VERSION, theory_sha256: theorySha, ...proof };
  need(Array.isArray(filled.steps) && filled.steps.length > 0, 'proof.steps 不能为空', 'error');
  need(typeof filled.root === 'string', 'proof.root 必须是步骤 id', 'error');
  need(filled.conclusion !== undefined, 'proof.conclusion 必填', 'error');
  need(filled.open_hypotheses !== undefined, 'proof.open_hypotheses 必填', 'error');
  filled.hypotheses = filled.hypotheses ?? {};
  return { format: KERNEL_VERSION, theory, proofs: { [targetId]: filled }, target: targetId };
}

/** 证明对象的 kernel 口径摘要（`theorem` 规则引用它）。 */
export function proofDigest(proof) {
  return digest(proof);
}
