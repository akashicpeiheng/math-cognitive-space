/**
 * `counterexampleTo`：候选蕴含 × 有限对象 → 满足背景与前提、但不满足目标。
 *
 * ## 反例的三条纪律
 *
 * 1. **必须核对背景与前提**：一个不满足群公理的运算表，用来反驳「群的可加性」
 *    什么也说明不了。`findCounterexample` 返回的模型必须先在背景与前提上通过，
 *    判定器再核一遍并把它写进 `conditions`。
 * 2. **找不到反例不等于命题为真**：返回 `undecided`，绝不返回「已证明」。
 * 3. **有限反模型只反驳该背景下的蕴含**：`scope` 里必须写明它不推翻实数或流形中的结论。
 *
 * 这一类是唯一「refuted 就是正面结果」的关系：发布时它会以 `FINITE` 的
 * 反例证据进公共网络（见 `server/publication.mjs` 的 `classifyCandidate`）。
 */

import {
  listSpecs, specVersion, statementSource, conditionsOf, parseGoal,
  undecided, unsupported, refuted, requireDeps,
} from './shared.mjs';

export const KIND = 'counterexampleTo';

function listModels(ctx = {}, deps = {}) {
  const registry = ctx.registry ?? deps.registry ?? null;
  const raw = ctx.models ?? registry?.models ?? registry?.instances ?? [];
  const models = Array.isArray(raw) ? raw : Object.values(raw ?? {});
  return models.filter((model) => model && typeof model === 'object' && model.id);
}

export function makeJudge(kind = KIND, deps = {}) {
  return {
    kind,
    /**
     * 候选：把一个节点的结论当作「候选蕴含」，在已登记有限对象上找反例。
     * `from` 放**有限对象**、`to` 放被反驳的那条陈述：关系读作
     * 「这个对象是那条陈述的反例」。
     */
    candidates(spec, ctx = {}) {
      const out = [];
      const statement = statementSource(spec);
      if (!statement) return out;
      for (const model of listModels(ctx, deps)) {
        // 同案例才配对：跨案例的有限对象与这条陈述之间没有可写出的反驳目标。
        const specCase = spec.case ?? String(spec.node).split(':')[0];
        if (model.case && model.case !== specCase) continue;
        out.push({
          kind,
          /*
           * 端点用有限对象对应的本体节点（`model.nodes[0]`，如 `group:noncomm`），
           * 与登记表里的 counterexampleTo 端点写法一致。
           */
          from: { node: model.nodes?.[0] ?? model.id, version: String(model.version ?? '1') },
          to: { node: spec.node, version: specVersion(spec) },
          direction: null,
          // 反例必须连同「它满足哪些前提」一起登记，否则读不出反驳的边界。
          conditions: conditionsOf(spec),
          goal: { source: statement, canonical: null, hash: null },
          reason: `在预置有限对象 ${model.id} 上检查「${statement}」是否被满足；满足背景与前提而不满足目标者即为反例。`,
          model: model.id,
        });
      }
      return out;
    },

    async confirm(candidate, ctx = {}) {
      const engine = { ...deps, ...(ctx.deps ?? {}) };
      const missing = requireDeps(engine, ['finite']);
      if (missing) return unsupported(missing);
      const model = listModels(ctx, deps).find((item) => item.id === candidate.model);
      if (!model) return undecided(`有限对象 ${candidate.model} 不在登记表里。`);
      const specs = listSpecs({ ...ctx, registry: ctx.registry ?? deps.registry });
      const spec = specs.find((item) => item.node === candidate.to?.node);
      if (!spec) return undecided(`被反驳的节点 ${candidate.to?.node} 不在当前登记表里。`);

      const modelId = model.id ?? model;
      const modelSig = typeof engine.finite.signatureOf === 'function'
        ? engine.finite.signatureOf(modelId)
        : { bases: [], constants: {} };
      const localCtx = {
        ...ctx,
        parseCtx: {
          ...(ctx.parseCtx ?? {}),
          bases: [...new Set([...(ctx.parseCtx?.bases ?? []), ...(modelSig.bases ?? [])])],
          constants: { ...(ctx.parseCtx?.constants ?? {}), ...(modelSig.constants ?? {}) },
        },
      };
      let goal;
      let assumptions;
      try {
        goal = parseGoal(candidate.goal?.source ?? statementSource(spec), localCtx);
        assumptions = (candidate.conditions ?? [])
          .filter((item) => typeof item?.source === 'string')
          .map((item) => ({ id: String(item.id ?? 'A'), source: item.source, formula: parseGoal(item.source, localCtx) }));
      } catch (error) {
        return unsupported(`反例的目标/前提解析失败：${error.message}`);
      }

      /*
       * 求值器要的是**规范公式树**，不是源码字符串；模型也可以直接给 id。
       * 背景公式表来自 ctx（背景没有公理时为空表）——空表时求值器会把背景判成
       * `unresolved`，那就**不能用它来反驳**，如实退回未决。
       */
      const verdict = engine.finite.findCounterexample(
        { goal, assumptions, background: spec.background ?? null },
        [modelId],
        { backgroundFormulas: ctx.backgroundFormulas ?? {} },
      );
      if (!verdict?.found) {
        /*
         * 没找到反例 → undecided。
         * 「没找到」与「不存在」是两件事，这里必须停在前者。
         */
        return undecided(verdict?.reason ?? `在 ${modelId} 上没有找到反例；找不到不等于命题为真。`, {
          scope: `只检查预置有限对象 ${modelId}。`,
        });
      }
      // 背景不成立的模型不能拿来反驳：宁可退回未决，也不用错的见证。
      if (verdict.background && verdict.background.status !== 'ok' && verdict.background.status !== 'none') {
        return undecided(`背景未核（${verdict.background.status}）：${verdict.background.reason ?? ''}`.trim());
      }
      if (verdict.usable === false) {
        return undecided(verdict.reason ?? `对象 ${modelId} 不满足前提或背景；不满足背景的模型不能用于反驳。`);
      }
      return refuted(`在 ${modelId} 上满足背景与前提，但不满足目标；反例成立。`, {
        model: verdict.model ?? modelId,
        assignment: verdict.assignment ?? {},
        note: verdict.note ?? `有限反模型；只反驳该背景下的蕴含，不宣称推翻实数或流形中的结论。`,
      });
    },
  };
}
