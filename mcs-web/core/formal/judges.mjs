/**
 * 六类关系判定器的入口与索引（规格 §2.11）。
 *
 * 统一形状：
 * ```js
 * makeJudge(kind, deps) -> { kind, candidates(spec, ctx), confirm(candidate, ctx) }
 * ```
 *
 * ## 为什么是「判定器 + 索引」而不是一个大 if
 *
 * 六类关系的**候选生成**判据完全不同（符号出现 / 参数类型 / 结论匹配 / 有限对象），
 * 而**确认**用的引擎也不同（定义引用不要引擎、等价要两份证书、反例要有限求值器）。
 * 拆开之后，加一类关系不用改发现编排；某一类引擎没装配，也只影响那一类。
 *
 * `deps` 是引擎袋（`search` / `certificate` / `kernel` / `finite` / `language`），
 * 一个都没有时判定器仍然能生成候选，只是把确认如实报成 `unsupported`。
 */

import { makeJudge as definitionReference } from './judges/definition-reference.mjs';
import { makeJudge as generalization } from './judges/generalization.mjs';
import { makeJudge as equivalence } from './judges/equivalence.mjs';
import { makeJudge as derivation } from './judges/derivation.mjs';
import { makeJudge as instance } from './judges/instance.mjs';
import { makeJudge as counterexample } from './judges/counterexample.mjs';
import { listSpecs, pairKey, registeredShapes } from './judges/shared.mjs';

/** 六类关系（与 `shared/formal.mjs` 的 RELATION_KINDS 同名同序）。 */
export const RELATION_KINDS = Object.freeze([
  'definitionReference', 'hardGeneralization', 'equivalentTo',
  'conditionalDerivation', 'instanceOf', 'counterexampleTo',
]);

const FACTORIES = Object.freeze({
  definitionReference,
  hardGeneralization: generalization,
  equivalentTo: equivalence,
  conditionalDerivation: derivation,
  instanceOf: instance,
  counterexampleTo: counterexample,
});

/** 单个判定器。未知 kind 直接报错——不静默返回一个「什么都不生成」的空壳。 */
export function makeJudge(kind, deps = {}) {
  const factory = FACTORIES[kind];
  if (!factory) throw new Error(`未知的关系类型：${kind}`);
  return factory(kind, deps);
}

/** kind → 判定器 的索引。 */
export function judgeIndex(deps = {}, kinds = RELATION_KINDS) {
  const index = new Map();
  for (const kind of kinds) index.set(kind, makeJudge(kind, deps));
  return index;
}

/** 判定器自述（接口层用它说明「哪几类现在能生成候选」）。 */
export function listJudges(deps = {}) {
  return RELATION_KINDS.map((kind) => {
    const judge = makeJudge(kind, deps);
    return {
      kind,
      hasCandidates: typeof judge.candidates === 'function',
      hasConfirm: typeof judge.confirm === 'function',
      confirmMode: kind === 'definitionReference' ? 'definition'
        : kind === 'instanceOf' || kind === 'counterexampleTo' ? 'finite'
          : 'certificate',
    };
  });
}

/**
 * 跑一遍全部判定器，收集候选。
 *
 * 两条来源，**登记表优先**：
 * 1. `registry.RELATIONS` / `registry.CONCEPT_RELATIONS` —— 人逐条对照原稿登记的权威形状
 *    （端点、方向、条件、目标都在里面）；判定器只负责**确认**；
 * 2. 判定器启发式（同背景 + 参数类型逐位相同……）—— 只用于登记表还没覆盖的端点对。
 *
 * 同一个 `kind + 端点对` 只留一条：两条来源都生成的话，会出现「同一条关系两份候选」，
 * 而两份候选迟早对不上账（一份有登记理由，一份没有）。
 *
 * 返回值是 `{ candidates, warnings }`：跳过、出错、同名冲突这类事都要能说出来，
 * 不能因为「候选池里没有」就当成「本来就没有」。
 */
export function collectCandidates(ctx = {}, { kinds = RELATION_KINDS, specs = null } = {}) {
  const deps = ctx.deps ?? {};
  const index = judgeIndex(deps, kinds);
  const warnings = [];
  const out = [];
  const covered = new Set();

  // 1) 已登记的关系：权威形状
  for (const shape of registeredShapes(ctx, kinds, warnings)) {
    const key = pairKey(shape.kind, shape.from, shape.to);
    if (covered.has(key)) continue;
    covered.add(key);
    out.push(shape);
  }

  // 2) 启发式兜底：登记表没覆盖的端点对
  const source = specs ?? listSpecs(ctx);
  for (const spec of Array.isArray(source) ? source : []) {
    if (!spec || typeof spec !== 'object' || !spec.node) continue;
    for (const kind of kinds) {
      const judge = index.get(kind);
      let generated = [];
      try {
        generated = judge.candidates(spec, ctx) ?? [];
      } catch (error) {
        // 某一类判定器出错不能拖垮整轮发现：记一条警告，继续跑其它类。
        warnings.push(`判定器 ${kind} 在 ${spec.node} 上生成候选时出错：${error.message}`);
        continue;
      }
      for (const candidate of generated) {
        if (!candidate?.from?.node || !candidate?.to?.node) continue;
        const key = pairKey(candidate.kind ?? kind, candidate.from, candidate.to);
        if (covered.has(key)) continue;
        covered.add(key);
        out.push({ ...candidate, kind: candidate.kind ?? kind, specNode: spec.node });
      }
    }
  }
  return { candidates: out, warnings };
}
