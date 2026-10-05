/**
 * `conditionalDerivation`：引理结论匹配 + 前提共同子集 → 联合输入的证书。
 *
 * ## 第二条第禁令（规格 §2.11，写进代码）
 *
 * 推导证明用了某个前提，**只登记这份证明的依赖**，不宣称所有证明、所有路线都依赖它。
 * 落到实现上有两条硬约束：
 *
 * 1. 候选里保存**全部**前提（`conditions`），不是「最少前提」；
 * 2. 证书的开放假设里必须能看到这些前提的名字——证明里没用上的前提不算前提，
 *    而证明里用上的前提一个都不能少记。
 *
 * ## 为什么不产生「单前提也能推出来」的关系
 *
 * 确认时把前提**一起**喂给搜索器（`hypotheses` 是整份共同子集），
 * 并且要求证书的 `openHypotheses` 与这批前提一致：若某个前提根本没被用到，
 * 说明真正起作用的是更小的子集，那应当由更小的那份证明去登记关系——
 * 判定器不替它「看起来像」。
 */

import {
  listSpecs, specVersion, specParams, paramSignature, statementSource, conditionsOf,
  undecided, unsupported, proved, requireDeps, scopeNote, specForId, parseGoal, programFor,
  certificateContext, bundleFor, hypothesesFromProof,
} from './shared.mjs';

export const KIND = 'conditionalDerivation';

/** 结论匹配：源码字符串规范化后相等（空白与全角符号归一）。 */
function normalizeSource(source) {
  return String(source ?? '').replace(/\s+/g, ' ').replace(/[（]/g, '(').replace(/[）]/g, ')').trim();
}

export function makeJudge(kind = KIND, deps = {}) {
  return {
    kind,
    /**
     * 候选：`spec` 的结论能匹配另一条 spec 的某条 claim，且两者的假设有共同子集。
     * 方向上存「前提节点 → 结论节点」：`from` 是提供前提的引理，`to` 是用到它的那条。
     */
    candidates(spec, ctx = {}) {
      const out = [];
      const target = normalizeSource(statementSource(spec));
      if (!target) return out;
      for (const other of listSpecs({ ...ctx, registry: ctx.registry ?? deps.registry })) {
        if (other.node === spec.node) continue;
        const claims = (other.claims ?? []).map((item) => ({ id: item?.id, source: normalizeSource(item?.source) }));
        const hit = claims.find((item) => item.source && item.source === target);
        if (!hit) continue;
        const left = new Set((spec.assumptions ?? []).map((item) => normalizeSource(item.source)));
        const shared = (other.assumptions ?? []).filter((item) => left.has(normalizeSource(item.source)));
        /*
         * 只认**共同**前提（2026-10 修）。
         *
         * 从前没有共同前提时退回 `conditionsOf(other)`——那是**目标节点自己的假设**，
         * 等于用结论自己的前提去"证明"结论：候选照样生成、看起来成立，实际什么都没验。
         * 现在留空：`confirm` 会据此如实返回 undecided（"没有可用的共同前提"），
         * 而不是造出一条名不副实的条件推导。
         */
        const conditions = shared.length
          ? shared.map((item) => ({ id: String(item.id ?? 'A'), source: item.source, readable: `共同前提：${item.source}` }))
          : [];
        if (conditions.length === 0) {
          out.push({
            kind,
            from: { node: spec.node, version: specVersion(spec) },
            to: { node: other.node, version: specVersion(other) },
            direction: null,
            conditions,
            goal: { source: `（无共同前提） ⇏ ${hit.source}`, canonical: null, hash: null },
            reason: `${spec.node} 的结论与 ${other.node} 的 claim ${hit.id ?? ''} 文本相同，但两条陈述没有共同前提：无条件推导需要另证，不能默认成立。`,
            parameterMismatch: paramSignature(spec) !== paramSignature(other),
            matchedClaimId: hit.id ?? null,
          });
          continue;
        }
        out.push({
          kind,
          from: { node: spec.node, version: specVersion(spec) },
          to: { node: other.node, version: specVersion(other) },
          direction: null,
          conditions,
          goal: { source: `${conditions.map((item) => item.source).join(' ∧ ') || '（无前提）'} ⇒ ${hit.source}`, canonical: null, hash: null },
          reason: `${spec.node} 的结论与 ${other.node} 的 claim ${hit.id ?? ''} 匹配；共同前提 ${conditions.map((item) => item.id).join('、') || '（无）'}。`,
          // 参数类型不同的两条陈述之间也可能匹配，但那是「同名不同物」，明确标出来。
          parameterMismatch: paramSignature(spec) !== paramSignature(other),
          matchedClaimId: hit.id ?? null,
        });
      }
      return out;
    },

    async confirm(candidate, ctx = {}) {
      const engine = { ...deps, ...(ctx.deps ?? {}) };
      const missing = requireDeps(engine, ['search', 'certificate', 'kernel']);
      if (missing) return unsupported(missing);
      const specs = listSpecs({ ...ctx, registry: ctx.registry ?? deps.registry });
      const source = specs.find((spec) => spec.node === candidate.from?.node);
      const target = specs.find((spec) => spec.node === candidate.to?.node);
      if (!source || !target) return undecided('推导的任一端不在当前登记表里。');
      if (candidate.parameterMismatch) {
        return undecided('两端参数类型不同：结论字符串相同不代表同一条命题，需要先统一参数。');
      }
      const goal = normalizeSource(candidate.goal?.source ?? statementSource(target));
      const premises = (candidate.conditions ?? []).filter((item) => typeof item?.source === 'string');
      if (premises.length === 0) return undecided('没有可用的共同前提：无条件推导需要另证，不能默认成立。');
      /*
       * 前提要**解析成公式**再进程序：`search` 只认认证公式。
       * 解析不了的前提如实报出来，不静默丢掉——丢一条前提就可能把「联合推出」变成「单独推出」。
       */
      const hypotheses = [];
      for (const item of premises) {
        try {
          hypotheses.push({ id: item.id, formula: parseGoal(item.source, ctx) });
        } catch (error) {
          return unsupported(`前提 ${item.id} 解析失败（${item.source}）：${error.message}`);
        }
      }
      const program = programFor(ctx, hypotheses);
      let goalFormula;
      try {
        goalFormula = parseGoal(goal, ctx);
      } catch (error) {
        return unsupported(`推导目标解析失败（${goal}）：${error.message}`);
      }
      const search = await engine.search(goalFormula, program, {
        maxDepth: ctx.budget?.depth ?? 8,
        maxStates: ctx.budget?.maxStates ?? 10000,
        maxMs: ctx.budget?.perCandidateMs ?? 2000,
        sig: ctx.sig ?? null,
      });
      if (search.status !== 'proved') {
        /*
         * 保留搜索的三态（2026-10 修）：从前把 `timeout` 与 `undecided` 一起折成 undecided，
         * 于是「预算不够，还没搜完」和「搜完了没找到」在候选上长得一模一样。
         * 判定本身仍是 undecided（预算耗尽不是数学结论），但状态与原因如实带出来。
         */
        return search.status === 'unsupported'
          ? unsupported(search.reason ?? '搜索器不支持该目标形状。', { stats: search.stats, searchStatus: search.status })
          : undecided(search.reason ?? `搜索未给出证明（${search.status}）。`, { stats: search.stats, searchStatus: search.status });
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
      if (check.status !== 'passed') return undecided(`检查器未通过（${check.status}）：${check.message ?? ''}`, { check });

      /*
       * 开放假设核对：证书实际用掉的假设应当**正好**是这批前提。
       * 少了 → 真正起作用的是更小的子集，这条关系名不副实；多了 → 有前提没进程序。
       *
       * **`check.openHypotheses` 是对象（label → 公式），不是数组**——kernel 的
       * `open_hypotheses` 就是映射。早先这里写 `new Set(check.openHypotheses ?? [])`，
       * 对对象直接抛 `object is not iterable`，于是**所有条件推导候选都在确认阶段失败**。
       * 现在统一从 `Object.keys(...)` 取标签；数组形态也一并接受（重放路径可能给数组）。
       */
      const openLabels = Array.isArray(check.openHypotheses)
        ? [...check.openHypotheses]
        : Object.keys(check.openHypotheses ?? {});
      const open = new Set(openLabels);
      const declared = new Set(premises.map((item) => item.id));
      const extra = [...open].filter((id) => !declared.has(id));
      if (extra.length) return undecided(`证书用到了未登记的前提：${extra.join('、')}`, { check });
      /*
       * 另一个方向也要查（2026-10 补）：**声明了但没被用到的前提**。
       *
       * 只查 `extra` 时，证书实际只用到前提的一个子集，关系仍会被记成
       * 「这批前提 ⊢ 结论」的联合输入并进 `proofs/premises/scope`——那是另一种失真：
       * 页面上显示三条前提共同推出，实际只有一条在起作用。
       *
       * 处置办法是**收窄**而不是判不合格：证书本身没有问题，
       * 「用到的那批前提 ⊢ 结论」正是它真正证明的东西（未用到的假设根本没有进证明）。
       * 收窄后把被去掉的条目标在 `unusedPremises` 与 reason 里，让人看得见发生了什么。
       */
      const usedPremises = premises.filter((item) => open.has(item.id));
      const unusedPremises = premises.filter((item) => !open.has(item.id));
      if (usedPremises.length === 0) {
        return undecided('证书没有用上任何声明的前提：这不是一条条件推导，不能按「这批前提 ⊢ 结论」登记。', { check, unusedPremises: unusedPremises.map((item) => item.id) });
      }
      let claimedGoal = goalFormula;
      if (unusedPremises.length) {
        try {
          claimedGoal = parseGoal(`${usedPremises.map((item) => item.source).join(' ∧ ')} ⇒ ${goal}`, ctx);
        } catch (error) {
          return unsupported(`收窄前提后目标解析失败：${error.message}`, { check });
        }
      }
      const dropped = unusedPremises.length ? `（声明了但未被证明用到、已从关系里剔除：${unusedPremises.map((item) => item.id).join('、')}）` : '';
      return proved(`证书证明「${usedPremises.map((item) => item.id).join('、')} ⊢ ${target.node} 的结论」并通过检查器。${dropped}`, {
        mode: 'certificate',
        evidenceKind: 'machine-certificate',
        proof: assembled,
        goalFormula: claimedGoal,
        bundle,
        check,
        openHypotheses: [...open],
        // 只登记**实际用到**的那批前提；界面要显示「联合输入」，不能只画一条线。
        premises: usedPremises.map((item) => ({ id: item.id, source: item.source })),
        unusedPremises: unusedPremises.map((item) => item.id),
        scope: scopeNote({
          theoryId: check.theoryId, theoryVersion: check.theoryVersion,
          openHypotheses: [...open],
          nodeVersions: { [source.node]: specVersion(source), [target.node]: specVersion(target) },
        }),
      });
    },
  };
}

export { specParams };
