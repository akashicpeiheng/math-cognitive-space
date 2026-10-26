import { normalizePrivateRelation, checkRelationStructure, nodeRefKey, relationSignature } from '../shared/network-workspace.mjs';
import { sha256 } from './hash.mjs';
import { discoverRelations } from './formal/discovery.mjs';
import { parseSpec, parseFormula } from './formal/language.mjs';
import * as finite from './formal/finite.mjs';
import { REGISTERED_INSTANCES } from '../data/formal/instances.mjs';
import { makeJudge as instanceJudge } from './formal/judges/instance.mjs';
import { makeJudge as counterexampleJudge } from './formal/judges/counterexample.mjs';
import * as backgrounds from './formal/backgrounds.mjs';
import * as registry from '../data/formal/registry.mjs';
export function relationInputHash(relation, ontologyVersion) { return sha256({ relation: normalizePrivateRelation(relation), ontologyVersion }); }
export async function checkPrivateRelation(raw, ontology, repoRoot) {
  const relation = normalizePrivateRelation(raw), structure = checkRelationStructure(relation);
  const result = { inputHash: relationInputHash(relation, ontology.version), relationSignature: relationSignature(relation), ontologyVersion: ontology.version, structure, math: { status: 'undecided', reason: '', scope: '仅检查所绑定的精确形式表达；原文对应须人工确认' }, run: { status: 'unsupported' }, correspondence: Object.fromEntries(['from', 'to'].map(side => [side, relation.bindings[side]?.correspondenceConfirmed === true])) };
  const undecided = reason => { result.math.reason = reason; return result; };
  if (structure.status !== 'valid') return undecided(structure.problems.join('；'));
  if (relation.kind === 'related') return undecided('参考关联是导航声明，不提出待证明的数学命题。');
  if([relation.from,relation.to].some(r=>['math-object','learning-node'].includes(r.source)))return undecided('公共 M/L 的私人候选不自动继承登记关系或 Lean 证据；请查看公共关系的精确条件与审阅状态。');
  const specs = [];
  for (const side of ['from', 'to']) {
    const ref = relation[side];
    let spec;
    if (ref.source === 'ontology') {
      const node = ontology.node(ref.id);
      if (ref.version && ref.version !== String(node.version)) return undecided('公共节点版本已变化，请更新端点引用。');
      spec = ontology.raw.formalSpecs?.[ref.id] ?? [...(registry.specs ?? []), ...(registry.CONCEPT_SPECS ?? [])].find(s => s.node === ref.id);
      // Public statements are always resolved from the current registered snapshot.
    } else {
      const binding = relation.bindings[side];
      if (!binding) return undecided('笔记端尚未绑定形式表达与原文摘录。');
      spec = { ...binding.spec, specVersion: 'mcs-formal/1', node: nodeRefKey(ref), nodeVersion: String(ref.revision), theoryVersion: String(binding.spec.theoryVersion ?? '1'), declarations: binding.spec.declarations ?? [], definitions: binding.spec.definitions ?? [], assumptions: binding.spec.assumptions ?? [], claims: binding.spec.claims ?? [], references: binding.spec.references ?? [], boundary: binding.spec.boundary ?? [], case: String(binding.spec.background ?? '').split(':')[1]?.split('/')[0], source: binding.spec.source ?? '私人笔记选定摘录' };
    }
    if (!spec) return undecided('公共节点尚未登记机器可读形式表达。');
    try { parseSpec(spec, { backgrounds, strict: false }); } catch (error) { return undecided(`形式表达不支持或不合法：${error.message}`); }
    specs.push(spec);
  }
  if (specs[0].background !== specs[1].background) return undecided('两端需要声明相同的背景理论。');
  if (['instanceOf', 'counterexampleTo'].includes(relation.kind)) {
    const model = relation.from.source === 'ontology' && REGISTERED_INSTANCES.find(m => m.nodes?.includes(relation.from.id));
    if (!model || specs[1].background !== 'bg:group/1') return undecided('有限判定目前只接受已登记有限群对象和明确的群背景；不将任意笔记解释为有限模型。');
    try {
      const signature = finite.signatureOf(model.id), target = specs[1];
      if (target.definitions?.length || target.references?.length) return undecided('有限语义首版需要直接展开的公式；透明缩写或引用请先展开。');
      const background = finite.checkStructure(model.id, finite.GROUP_AXIOMS, signature);
      if (!background.holds) return undecided('有限对象不满足所声明的群背景，不能用于验证或反驳。');
      for (const hypothesis of target.assumptions ?? []) if (!finite.evaluateFormula(parseFormula(hypothesis.source, signature), model.id, signature)) return undecided('有限对象不满足显式前提，不能用于验证或反驳。');
      const judge = relation.kind === 'instanceOf' ? instanceJudge() : counterexampleJudge();
      const ctx = { models: [model], specs: [target], parseCtx: signature, sig: signature, backgroundFormulas: { 'bg:group/1': finite.GROUP_AXIOMS.axioms.map(a => a.formula) }, deps: { finite, language: { parseFormula } } };
      const candidate = judge.candidates(target, ctx)[0];
      if (!candidate) return undecided('没有与方向对应的有限候选。');
      const confirmation = await judge.confirm(candidate, ctx), verdict = confirmation.status === 'refuted' ? 'refuted' : confirmation.finiteResult?.holds === true ? 'verified' : 'undecided';
      const scope = `只检查预置有限群 ${model.id} 的完整运算表、群公理、显式前提和选定公式；不构成无限结构或一般命题的证明。`;
      return { ...result, math: { status: verdict, reason: confirmation.reason, scope }, run: { status: confirmation.status === 'unsupported' ? 'unsupported' : 'completed' }, label: verdict === 'undecided' ? 'NOT-CLAIMED' : 'FINITE', evidence: verdict === 'undecided' ? null : { kind: verdict === 'refuted' ? 'counterexample' : 'finite-check', status: 'FINITE', scope, model: model.id, background: background.axioms, table: confirmation.table ?? confirmation.finiteResult?.table, counterexample: confirmation.counterexample }, candidate, conditions: target.assumptions ?? [] };
    } catch (error) { return undecided(`有限表达式不支持：${error.message}`); }
  }
  const outcome = await discoverRelations({ ontology, specs, registry: null, background: specs[0].background, kinds: [relation.kind], repoRoot, budget: { maxCandidates: 12, totalMs: 45000, perCandidateMs: 10000 }, nodeRef: { node: specs[0].node } });
  const candidate = outcome.candidates.find(c => c.from.node === specs[0].node && c.to.node === specs[1].node && c.kind === relation.kind);
  if (!candidate) return undecided('现有判定器未生成符合所选方向的候选；这不构成反驳。');
  return { ...result, math: candidate.math, run: candidate.run, label: candidate.label, evidence: candidate.evidence, candidate, conditions: candidate.conditions, warnings: outcome.stats?.warnings ?? [], descriptionNote: '数学结果适用于下列精确目标与机器条件；自然语言理由、条件及原文对应仍须人工审阅。' };
}
