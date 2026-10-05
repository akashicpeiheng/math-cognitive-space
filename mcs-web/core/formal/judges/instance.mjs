/**
 * `instanceOf`：已登记有限对象 × 概念 → 有限求值器**全表**检查。
 *
 * ## 为什么这是独立的一类
 *
 * 有限检查给的是 `FINITE`，不是 `PROOF`：它证明的是「这个预置对象满足这条概念陈述」，
 * 不是「所有对象都满足」。返回的作用域里必须写明这一点（规格 §2.12 的边界）。
 *
 * ## 全表是什么意思
 *
 * `evaluateFormula` 在有限载体上**枚举全部**量词取值；判定器要求
 * `checkStructure` 返回逐条公理的成立情况与违反见证。只要有一条不成立，
 * 这条关系就不成立——有限模型里没有「大体上满足」。
 */

import {
  listSpecs, specVersion, statementSource, conditionsOf, parseGoal,
  undecided, unsupported, proved, requireDeps,
} from './shared.mjs';

export const KIND = 'instanceOf';

/** 已登记有限对象清单：`ctx.models` 优先，其次登记表的 `models` / `instances`。 */
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
     * 候选：每个已登记有限对象 × 当前 spec 的概念陈述。
     * `concept` 侧是本 spec 声明的那个概念谓词（`spec.concept` 或第一条 definition）。
     */
    candidates(spec, ctx = {}) {
      const out = [];
      const statement = statementSource(spec);
      if (!statement) return out;
      const concept = ctx.concept ?? spec.concept ?? spec.definitions?.[0]?.source ?? statement;
      for (const model of listModels(ctx, deps)) {
        /*
         * 只把**同一个案例**的有限对象配给这个 spec。
         *
         * 跨案例配对（拿 Z/5Z 的单位群去"实例化"流形的图册概念）连目标都写不出来——
         * 那种候选不是"没找到证明"，而是根本不该生成。
         * spec 的案例取 `case` 字段，缺省用节点 id 的前缀（`group:…` → `group`）。
         */
        const specCase = spec.case ?? String(spec.node).split(':')[0];
        if (model.case && model.case !== specCase) continue;
        out.push({
          kind,
          /*
           * 端点用**有限对象对应的本体节点**（`model.nodes[0]`，如 `group:units5`），
           * 而不是加前缀的模型 id——登记表里的 instanceOf 就是这么写的；
           * 没有对应节点时才退回模型 id。
           */
          from: { node: model.nodes?.[0] ?? model.id, version: String(model.version ?? '1') },
          to: { node: spec.node, version: specVersion(spec) },
          direction: null,
          conditions: conditionsOf(spec),
          goal: { source: `${concept} 在 ${model.id} 上成立`, canonical: null, hash: null },
          reason: `在预置有限对象 ${model.id}（载体 ${model.carrier ?? '未标注'}）上逐表检查概念「${concept}」。`,
          model: model.id,
          concept,
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
      if (!spec) return undecided(`概念 ${candidate.to?.node} 不在当前登记表里。`);

      /*
       * 求值器**只认模型 id**（它自带 `finite:z5-units` / `finite:s3` 两张表的内容，
       * 不反向依赖登记层）。所以这里传 id，不传登记记录——传记录会被它判成「结构非法」。
       */
      const modelId = model.id ?? model;
      const modelSig = typeof engine.finite.signatureOf === 'function'
        ? engine.finite.signatureOf(modelId)
        : { bases: [], constants: {} };
      // 概念公式里出现的是**这个模型自己的**常量（`mul5`/`one5`/`inv5`），要把它们并进解析上下文。
      const localCtx = {
        ...ctx,
        parseCtx: {
          ...(ctx.parseCtx ?? {}),
          bases: [...new Set([...(ctx.parseCtx?.bases ?? []), ...(modelSig.bases ?? [])])],
          constants: { ...(ctx.parseCtx?.constants ?? {}), ...(modelSig.constants ?? {}) },
        },
      };
      const source = candidate.goal?.source ?? `${statementSource(spec)} 在 ${modelId} 上成立`;
      let formula;
      try {
        formula = parseGoal(source, localCtx);
      } catch (error) {
        return unsupported(`概念公式解析失败（${source}）：${error.message}`);
      }
      const verdict = await engine.finite.checkStructure(
        modelId,
        { id: spec.node, label: source, axioms: [{ id: 'S1', label: source, formula }] },
        { bases: [...new Set([...(modelSig.bases ?? []), ...(ctx.sig?.bases ?? [])])], constants: { ...(modelSig.constants ?? {}) } },
      );
      /*
       * 三态：`holds === false` 才是**反驳**；`holds` 缺席（求值器没给出判定、
       * 形状变了、返回 null）既不是成立也不是违反。
       *
       * 从前这里写 `if (!verdict?.holds)`，于是「没跑出结论」被记成 `refuted` 并带上
       * 一个空见证——`instanceOf` / `counterexampleTo` 是发布时会以 `FINITE` 进公共网络的
       * 正面结果，这一条会把「不知道」说成「找到反例」。同目录 `counterexample.mjs`
       * 对同一种情况返回 undecided，两处口径现已一致。
       */
      if (!verdict || typeof verdict.holds !== 'boolean') {
        return undecided(`有限求值没有给出判定（模型 ${modelId}）：既不能说成立，也不能说被违反。`);
      }
      if (verdict.holds === false) {
        return {
          status: 'refuted',
          reason: `有限检查不成立：${(verdict.violations ?? []).map((item) => item.note ?? JSON.stringify(item)).join('；') || '存在违反条目'}`,
          counterexample: { model: modelId, assignment: verdict.violations?.[0]?.assignment ?? {}, note: '有限表上的违反见证。' },
          table: verdict.table ?? null,
        };
      }
      return proved(`在 ${modelId} 上逐表检查通过（${(verdict.table ?? []).length} 条）。`, {
        mode: 'finite',
        evidenceKind: 'finite-check',
        table: verdict.table ?? null,
        scope: {
          theoryId: 'finite-semantics',
          theoryVersion: '1',
          openHypotheses: [],
          nodeVersions: { [spec.node]: specVersion(spec), [modelId]: String(model.version ?? '1') },
          // 界面上必须显示这句：有限枚举不是无限结构上的普遍定理。
          certificateScope: `只检查预置有限对象 ${modelId}；有限枚举不升级为无限结构上的普遍定理。`,
        },
      });
    },
  };
}
