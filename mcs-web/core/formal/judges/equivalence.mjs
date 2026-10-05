/**
 * `equivalentTo`：同背景、参数**逐位类型相同**的概念对 → 双向蕴含证书或定义展开。
 *
 * ## 两条禁令（规格 §2.11，写进代码）
 *
 * 1. **不对任意两个已证明的封闭定理自动生成等价**。候选生成只承认「概念—
 *    概念」且参数类型逐位相同的情形：两条闭定理碰巧都成立，只能说明它们都真，
 *    说明不了它们等价。
 * 2. 参数类型必须**逐位相同**，不是「长度相同」。`G → G → o` 与 `G → o` 长度不同
 *    会被挡掉，`(G→G)→o` 与 `G→(G→o)` 这种同长度不同结构的也必须挡掉——
 *    所以比较的是规范类型串，不是参数个数。
 *
 * 确认走两条通道，先便宜后昂贵：
 * - **定义展开**：一端是另一端的定义缩写（definitional unfolding）；
 * - **双向蕴含证书**：两个方向各出一份证书，两份都过检查器才算等价。
 */

import {
  listSpecs, specVersion, specParams, paramSignature, statementSource, conditionsOf,
  undecided, unsupported, proved, requireDeps, scopeNote, specForId, parseGoal, programFor,
  hypothesesFor, certificateContext, bundleFor, openGoalSource, hypothesesFromProof,
} from './shared.mjs';

export const KIND = 'equivalentTo';

/**
 * 取一份检查结果里的**开放假设标签**。
 *
 * kernel 的 `open_hypotheses` 是**映射**（label → 公式），不是数组；
 * 早先这里写 `new Set(check.openHypotheses ?? [])` 会直接抛 `object is not iterable`。
 * 数组形态也接受（重放路径可能给数组）。
 */
function labelsOf(check) {
  if (!check) return [];
  return Array.isArray(check.openHypotheses) ? [...check.openHypotheses] : Object.keys(check.openHypotheses ?? {});
}

export function makeJudge(kind = KIND, deps = {}) {
  return {
    kind,
    candidates(spec, ctx = {}) {
      const out = [];
      const background = spec.background ?? null;
      const signature = paramSignature(spec);
      if (!signature) return out;
      for (const other of listSpecs({ ...ctx, registry: ctx.registry ?? deps.registry })) {
        // 只比 node 的字典序，保证同一对只生成一次（等价是对称关系）。
        if (String(other.node) <= String(spec.node)) continue;
        if ((other.background ?? null) !== background) continue;
        if (paramSignature(other) !== signature) continue;
        if (!statementSource(other) || !statementSource(spec)) continue;
        out.push({
          kind,
          from: { node: spec.node, version: specVersion(spec) },
          to: { node: other.node, version: specVersion(other) },
          direction: null,                       // 等价没有方向
          conditions: conditionsOf(spec),
          goal: { source: `${statementSource(spec)} ⇔ ${statementSource(other)}`, canonical: null, hash: null },
          reason: `${spec.node} 与 ${other.node} 同背景 ${background ?? '未标注'}、参数类型逐位相同（${signature}）；候选比较双向蕴含。`,
        });
      }
      return out;
    },

    async confirm(candidate, ctx = {}) {
      const engine = { ...deps, ...(ctx.deps ?? {}) };
      const specs = listSpecs({ ...ctx, registry: ctx.registry ?? deps.registry });
      const left = specs.find((spec) => spec.node === candidate.from?.node);
      const right = specs.find((spec) => spec.node === candidate.to?.node);
      if (!left || !right) return undecided('参与等价比较的节点不在当前登记表里。');

      /*
       * 通道一：定义展开。
       *
       * 判定依据是**登记数据**而不是引擎：一端的定义体若在展开后与另一端同形，
       * 这条等价就是定义层面的，不需要证书（也不需要引擎）。
       */
      const unfolding = engine.language?.unfoldDefinition ?? ctx.unfold ?? null;
      if (typeof unfolding === 'function') {
        const verdict = unfolding({ left, right });
        if (verdict?.equivalent) {
          return proved(`定义展开后两端同形：${verdict.note ?? '无需证书'}。`, { mode: 'definition', evidenceKind: 'reference' });
        }
      }

      const missing = requireDeps(engine, ['search', 'certificate', 'kernel', 'language']);
      if (missing) return unsupported(missing);
      /*
       * 两个方向各证一次。已登记的形状若带了目标（`goal.source` 是完整蕴含式），用它；
       * 否则按「左 ⇒ 右」「右 ⇒ 左」拼——拼出来的源码同样要**先解析成认证公式**。
       */
      const registeredGoal = candidate.goal?.source ?? null;
      const heuristicForward = openGoalSource(left, right, ctx);
      if (!registeredGoal && !heuristicForward) {
        return unsupported('两端参数类型取不到，无法拼出带类型注释的目标（不生成无注释的量词目标）。');
      }
      const directions = [
        { from: left, to: right, source: registeredGoal ? registeredGoal.replace(/⇔/g, '⇒') : heuristicForward },
        { from: right, to: left, source: openGoalSource(right, left, ctx) ?? `${statementSource(right)} ⇒ ${statementSource(left)}` },
      ];
      const checks = [];
      for (const direction of directions) {
        let goal;
        try {
          goal = parseGoal(direction.source, ctx);
        } catch (error) {
          return unsupported(`目标解析失败（${direction.source}）：${error.message}`);
        }
        const program = programFor(ctx, hypothesesFor(direction.from, ctx));
        const search = await engine.search(goal, program, {
          maxDepth: ctx.budget?.depth ?? 8,
          maxStates: ctx.budget?.maxStates ?? 10000,
          maxMs: ctx.budget?.perCandidateMs ?? 2000,
          sig: ctx.sig ?? null,
        });
        if (search.status !== 'proved') {
          return search.status === 'unsupported'
            ? unsupported(`方向 ${direction.from.node} ⇒ ${direction.to.node} 不支持：${search.reason ?? ''}`, { stats: search.stats })
            : undecided(`方向 ${direction.from.node} ⇒ ${direction.to.node} 未给出证明（${search.status}）。`, { stats: search.stats });
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
        checks.push({ direction, assembled, check, bundle, goal });
      }
      return proved(`两个方向各出一份证书并通过检查器：${left.node} ⇔ ${right.node}。`, {
        mode: 'certificate',
        evidenceKind: 'machine-certificate',
        proofs: checks.map((item) => item.assembled),
        // 目标核对需要一个精确命题：用第一个方向的蕴含（等价由两份证书分别覆盖）。
        goalFormula: checks[0].goal,
        bundle: checks[0].bundle,
        check: checks[0].check,
        // 两份证书的开放假设都要记下来：只记一份会把另一方向的条件藏起来。
        // `check.openHypotheses` 是对象（label → 公式），所以要取键；数组形态也接受。
        openHypotheses: [...new Set(checks.flatMap((item) => labelsOf(item.check)))],
        scope: scopeNote({
          theoryId: checks[0].check.theoryId, theoryVersion: checks[0].check.theoryVersion,
          openHypotheses: [...new Set(checks.flatMap((item) => labelsOf(item.check)))],
          nodeVersions: { [left.node]: specVersion(left), [right.node]: specVersion(right) },
        }),
      });
    },
  };
}

export { specParams };
