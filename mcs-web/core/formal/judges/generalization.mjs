/**
 * `hardGeneralization`：同背景、同参数类型的概念对 → 全称蕴含证书。
 *
 * ## 方向约定（规格 §2.11，写死在数据里）
 *
 * 存的是「**一般概念 → 特殊概念**」，证书证明的是 `特殊 ⇒ 一般`。
 * 反向只是读法，不重复产生第二份证据——所以这里对每一对概念生成**两个有序候选**
 * （两个方向各自可能成立、也可能只有一边成立），由 `core/formal/discovery.mjs`
 * 在确认之后保证「同一对概念最多留下一份证据」。
 *
 * ## 确认链
 *
 * `search`（有界证明搜索）→ `certificate.assembleProof`（装配内核证书）
 * → `kernel.checkBundle`（真跑检查器）。三者缺一，就如实返回 unsupported：
 * 「没搜到证明」与「没有搜索器」是两件事，前者是 undecided，后者是 unsupported。
 */

import {
  listSpecs, specVersion, specParams, paramSignature, statementSource, conditionsOf,
  undecided, unsupported, proved, requireDeps, scopeNote, specForId, parseGoal, programFor,
  hypothesesFor, certificateContext, bundleFor, openGoalSource, hypothesesFromProof,
} from './shared.mjs';

export const KIND = 'hardGeneralization';

function conceptSpecs(ctx) {
  return listSpecs(ctx).filter((spec) => statementSource(spec) && specParams(spec).length > 0);
}

export function makeJudge(kind = KIND, deps = {}) {
  return {
    kind,
    /**
     * 候选：同背景 + 参数类型逐位相同的概念对，两个方向都生成。
     *
     * 「同参数类型」这条限制不能省：参数类型不同的两条陈述之间谈不上一般/特殊，
     * 强行配对只会产出无法证明也无人能读的目标。
     */
    candidates(spec, ctx = {}) {
      const out = [];
      const background = spec.background ?? null;
      const signature = paramSignature(spec);
      for (const other of conceptSpecs({ ...ctx, registry: ctx.registry ?? deps.registry })) {
        if (other.node === spec.node) continue;
        if ((other.background ?? null) !== background) continue;
        if (paramSignature(other) !== signature) continue;
        const parameters = specParams(spec);
        const conditions = conditionsOf(spec);
        // 方向 A：other（一般）← spec（特殊），证书证 spec ⇒ other。
        const goalSource = openGoalSource(spec, other, ctx);
        if (!goalSource) continue;                 // 参数类型取不到就不生成（见 openGoalSource 的注释）
        out.push({
          kind,
          from: { node: other.node, version: specVersion(other) },
          to: { node: spec.node, version: specVersion(spec) },
          direction: { general: other.node, special: spec.node },
          conditions,
          goal: { source: goalSource, canonical: null, hash: null },
          reason: `${spec.node} 的参数类型与 ${other.node} 逐位相同，且同属背景 ${background ?? '未标注'}；候选方向为「${other.node} 一般、${spec.node} 特殊」。`,
          parameters,
        });
      }
      return out;
    },

    /**
     * 确认：证 `特殊 ⇒ 一般`。
     *
     * 目标**当场重算**：
     * - 已登记的形状（`registry.RELATIONS` / `CONCEPT_RELATIONS`）带着写好的目标与条件，
     *   那是人对照原稿登记的，直接用它——这里仍然是从登记表现取的，不是候选里存下来的旧字符串；
     * - 启发式形状没有现成目标，就按「∀参数. 特殊 ⇒ 一般」拼一条。
     *
     * 拼出来的源码必须**先解析成认证公式**再交给搜索：`search` 收到字符串会把它当对象项，
     * 报 `invalid certification term`——那种「跑了但什么都没证」最难发现。
     */
    async confirm(candidate, ctx = {}) {
      const engine = { ...deps, ...(ctx.deps ?? {}) };
      const missing = requireDeps(engine, ['search', 'certificate', 'kernel', 'language']);
      if (missing) return unsupported(missing);
      const general = specForId(ctx, candidate.direction?.general ?? candidate.from?.node);
      const special = specForId(ctx, candidate.direction?.special ?? candidate.to?.node);
      if (!general || !special) return undecided('方向上的两个概念至少有一个不在当前登记表里。');
      const goalSource = candidate.goal?.source
        ?? openGoalSource(special, general, ctx)
        ?? `∀${specParams(special).map((item) => item.name).join(' ')}. ${statementSource(special)} ⇒ ${statementSource(general)}`;
      let goal;
      try {
        goal = parseGoal(goalSource, ctx);
      } catch (error) {
        return unsupported(`目标解析失败（${goalSource}）：${error.message}`);
      }
      // 局部假设只带**特殊那一端**的：把别的 spec 的假设也塞进程序，
      // 会让「特殊 ⇒ 一般」在无关条件下被"证"出来。
      const program = programFor(ctx, hypothesesFor(special, ctx));
      const search = await engine.search(goal, program, {
        maxDepth: ctx.budget?.depth ?? 8,
        maxStates: ctx.budget?.maxStates ?? 10000,
        maxMs: ctx.budget?.perCandidateMs ?? 2000,
        sig: ctx.sig,
      });
      if (search.status !== 'proved') {
        return search.status === 'unsupported'
          ? unsupported(search.reason ?? '搜索器不支持该目标形状。', { stats: search.stats })
          : undecided(search.reason ?? `搜索未给出证明（${search.status}）。`, { stats: search.stats });
      }
      const assembled = await engine.certificate.assembleProof(
        search.proof,
        certificateContext(ctx, hypothesesFromProof(ctx, search.proof, new Map(program.hypotheses.map((item) => [item.id, item.formula])))),
      );
      const bundle = bundleFor(ctx, assembled);
      const check = await engine.kernel.checkBundle(
        bundle,
        { cwd: ctx.repoRoot ?? undefined },
      );
      if (check.status !== 'passed') {
        // 检查没过**不等于**命题为假（规格 §2.9 硬规则）。
        return undecided(`检查器未通过（${check.status}）：${check.message ?? '无更多信息'}`, { check, stats: search.stats });
      }
      /*
       * `check.openHypotheses` 是对象（label → 公式），不是数组。
       * 这里早先原样透传对象，界面拿到之后按数组用（`.length` / `[...]`）就会出错，
       * 而且与 `derivation.mjs` / `equivalence.mjs` 的口径不一致。统一在源头转成标签数组。
       */
      const openLabels = Array.isArray(check.openHypotheses)
        ? [...check.openHypotheses]
        : Object.keys(check.openHypotheses ?? {});
      return proved(`证书证明「${special.node} ⇒ ${general.node}」通过检查器（${check.checker}）。`, {
        mode: 'certificate',
        evidenceKind: 'machine-certificate',
        proof: assembled,
        // 判定器**实际搜索**的目标公式：§2.10 的目标核对拿它当期望命题（不让候选自报）。
        goalFormula: goal,
        bundle,
        check,
        openHypotheses: openLabels,
        scope: scopeNote({
          theoryId: check.theoryId, theoryVersion: check.theoryVersion,
          openHypotheses: openLabels,
          nodeVersions: { [general.node]: specVersion(general), [special.node]: specVersion(special) },
        }),
      });
    },
  };
}
