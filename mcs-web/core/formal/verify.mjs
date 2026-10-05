/**
 * core/formal/verify.mjs —— 服务端目标核对（§2.10）。
 *
 * 内核回答的是「这份证书自洽吗」，回答不了「它证的是不是我们要的那句话」。
 * 这里逐条核对（任一条不过就 `ok:false`，并把原因写进 `problems`）：
 *
 * 1. **精确命题**：`check.conclusion` 与目标命题 α 相等（不是"跑通了"）；
 * 2. **理论身份**：id / version / 哈希，三者都要对得上，且与证书里的 theory 现算哈希一致；
 * 3. **节点版本**：候选两端绑定的版本必须与当前节点版本一致；
 * 4. **实际开放假设**：自报（candidate.conditions / candidate.openHypotheses）与
 *    内核重算的 `check.openHypotheses` 必须**相等**——多报、少报都算问题；
 * 5. **没有偷加公理**：证书 `theory.axioms` 的每一条都要在背景白名单里（比对 id + 摘要）；
 * 6. **证书完好**：现算摘要与登记摘要一致（改一个字就过不去）。
 *
 * 纯函数：不读盘、不调用检查器；`check` 必须是真的内核结果（由调用方跑 `kernel.mjs`）。
 */

import { digest, KERNEL_VERSION } from './codec.mjs';
import { sameFormula } from './terms.mjs';

const ok = (problems) => problems.length === 0;

function hashOf(value) {
  try {
    return digest(value);
  } catch {
    return null;
  }
}

/**
 * 兼容两种拼写：`kernel.py --output` 的原始 JSON 用 snake_case
 * （`theory_sha256` / `open_hypotheses` / `kernel_formally_verified`），
 * §2.5 的 `kernel.mjs` 归一成 camelCase。核对层两种都收。
 */
export function normalizeCheck(check) {
  if (!check) return null;
  return {
    status: check.status,
    message: check.message,
    step: check.step,
    checker: check.checker,
    checkerSha256: check.checkerSha256 ?? check.checker_sha256,
    theoryId: check.theoryId ?? check.theory_id,
    theoryVersion: check.theoryVersion ?? check.theory_version,
    theorySha256: check.theorySha256 ?? check.theory_sha256,
    proofId: check.proofId ?? check.proof_id,
    proofSha256: check.proofSha256 ?? check.proof_sha256,
    conclusion: check.conclusion,
    openHypotheses: check.openHypotheses ?? check.open_hypotheses,
    dependencies: check.dependencies,
    kernelFormallyVerified: check.kernelFormallyVerified ?? check.kernel_formally_verified,
    inputSha256: check.inputSha256 ?? check.input_sha256,
    exitCode: check.exitCode,
  };
}

/**
 * @param {object} candidate 关系候选（至少含 `goal`、`conditions`、`check`）
 * @param {{spec?:object, ontology?:object, background?:object, expectedConclusion?:unknown,
 *          nodeVersions?:Record<string,string>, theoryAxioms?:Array}} context
 * @returns {{ok:boolean, problems:string[], scope:object}}
 */
export function verifyCandidate(candidate, context = {}) {
  const { spec = null, background = null, expectedConclusion = null, nodeVersions = null } = context;
  const problems = [];
  const check = normalizeCheck(candidate?.check ?? null);
  const certificate = candidate?.certificate ?? null;

  // --- 0. 必须有真的内核结论 -------------------------------------------------
  if (!check) problems.push('缺少内核检查结果：没有 check 就没有目标核对可言');
  else {
    if (check.status !== 'passed') problems.push(`内核状态不是 passed：${check.status}${check.message ? `（${check.message}）` : ''}`);
    if (check.checker !== KERNEL_VERSION) problems.push(`检查器版本不一致：${check.checker} ≠ ${KERNEL_VERSION}`);
    if (check.kernelFormallyVerified !== false) problems.push('内核自报 formally_verified 必须为 false（它没有被形式化验证过）');
  }

  // --- 1. 精确命题 -----------------------------------------------------------
  const expected = expectedConclusion ?? spec?.statement?.canonical ?? spec?.statement ?? null;
  const claimedGoal = candidate?.goal?.canonical ?? null;
  if (check?.status === 'passed') {
    if (!expected) problems.push('缺少可核对的目标命题（expectedConclusion 或 spec.statement.canonical）');
    else if (!sameFormula(check.conclusion, expected)) problems.push('目标错配：证书证明的精确命题与期望命题不 α 相等');
    if (claimedGoal && !sameFormula(check.conclusion, claimedGoal)) problems.push('目标错配：候选自报的 goal 与证书结论不 α 相等');
    if (claimedGoal && candidate?.goal?.hash) {
      const recomputed = hashOf(claimedGoal);
      if (recomputed && candidate.goal.hash !== recomputed && candidate.goal.hash !== `sha256:${recomputed}`) {
        problems.push('候选自报的 goal.hash 与 goal.canonical 不一致');
      }
    }
  }

  // --- 2. 理论身份 -----------------------------------------------------------
  const expectedTheoryId = candidate?.theory?.id ?? background?.id ?? spec?.theoryId ?? null;
  const expectedTheoryVersion = candidate?.theory?.version ?? background?.version ?? spec?.theoryVersion ?? null;
  if (expectedTheoryId && check?.theoryId && check.theoryId !== expectedTheoryId) {
    problems.push(`理论 id 不一致：证书 ${check.theoryId} ≠ 期望 ${expectedTheoryId}`);
  }
  if (expectedTheoryVersion && check?.theoryVersion && String(check.theoryVersion) !== String(expectedTheoryVersion)) {
    problems.push(`理论版本不一致：证书 ${check.theoryVersion} ≠ 期望 ${expectedTheoryVersion}`);
  }
  const backgroundHash = background ? hashOf(background) : null;
  const expectedTheoryHash = candidate?.theory?.sha256 ?? backgroundHash ?? null;
  /*
   * 两条都真才比对，等于「证书没给理论哈希就整段跳过」——那正是**最需要核对**的情形
   * （说不出这份证书是哪份理论给的）。所以缺一边就记一条问题，不静默放行。
   */
  if (expectedTheoryHash) {
    if (!check?.theorySha256) problems.push('证书未给出理论哈希，无法核对它绑定的是哪一份理论');
    else if (check.theorySha256 !== expectedTheoryHash) problems.push('理论哈希不一致：证书绑定的理论版本与期望的不是同一份');
  }
  if (certificate?.theory) {
    const actual = hashOf(certificate.theory);
    if (actual && check?.theorySha256 && actual !== check.theorySha256) problems.push('证书里的 theory 现算哈希与 check.theorySha256 不一致');
  }

  // --- 3. 节点版本 -----------------------------------------------------------
  if (nodeVersions && candidate) {
    for (const side of ['from', 'to']) {
      const ref = candidate[side];
      if (!ref?.node) continue;
      const current = nodeVersions[ref.node];
      if (current === undefined) problems.push(`${side} 引用了未知节点：${ref.node}`);
      else if (String(current) !== String(ref.version)) problems.push(`${side} 节点 ${ref.node} 版本过期：候选 ${ref.version} ≠ 当前 ${current}`);
    }
  }

  // --- 4. 实际开放假设 -------------------------------------------------------
  const actual = check?.openHypotheses ?? null;
  if (actual) {
    const actualEntries = Object.entries(actual);
    const declared = Array.isArray(candidate?.conditions) ? candidate.conditions : [];
    const declaredFormulas = declared.map((c) => c.canonical).filter(Boolean);
    // 4a. 证书里每一个开放假设都要有对应的**已声明条件**。
    //     注意：`candidate.openHypotheses`（自报）不能当声明用——它正是要被核对的对象。
    for (const [label, formula] of actualEntries) {
      const matched = declaredFormulas.some((f) => sameFormula(f, formula));
      if (!matched) problems.push(`隐藏的开放假设：证书里 ${label} 未被候选声明`);
    }
    // 4b. 已声明的条件都必须是**真的用到了**的（多报条件同样是失真）
    for (const condition of declared) {
      if (!condition.canonical) continue;
      const used = actualEntries.some(([, formula]) => sameFormula(formula, condition.canonical));
      if (!used) problems.push(`声明了但没有用到的条件：${condition.id ?? JSON.stringify(condition.canonical)}`);
    }
    // 4c. 自报的开放假设必须与重算一致
    if (candidate?.openHypotheses) {
      const selfReported = Object.values(candidate.openHypotheses);
      if (selfReported.length !== actualEntries.length) problems.push('自报开放假设数量与内核重算不一致');
      for (const formula of selfReported) {
        if (!actualEntries.some(([, f]) => sameFormula(f, formula))) problems.push('自报开放假设里有内核未重算出来的条目');
      }
    }
  }

  // --- 5. 没有偷加公理 -------------------------------------------------------
  const whitelist = context.theoryAxioms ?? background?.axioms ?? spec?.axioms ?? null;
  const certificateAxioms = certificate?.theory?.axioms ?? null;
  if (certificateAxioms) {
    if (!whitelist) {
      if (certificateAxioms.length > 0) problems.push('无法核对理论公理：没有给出背景白名单，而证书里带了公理条目');
    } else {
      const allowed = new Map();
      for (const axiom of whitelist) {
        if (!axiom?.id) continue;
        allowed.set(axiom.id, axiom.formula !== undefined ? hashOf(axiom.formula) : axiom.digest ?? null);
      }
      for (const axiom of certificateAxioms) {
        if (!axiom?.id) { problems.push('证书里有无 id 的公理条目'); continue; }
        if (!allowed.has(axiom.id)) { problems.push(`偷偷加进 theory.axioms 的条目：${axiom.id}`); continue; }
        const expectedDigest = allowed.get(axiom.id);
        const actualDigest = hashOf(axiom.formula);
        if (expectedDigest && actualDigest && expectedDigest !== actualDigest) problems.push(`公理 ${axiom.id} 的内容与背景白名单不一致`);
      }
    }
  }
  if (Array.isArray(check?.dependencies)) {
    const whitelistIds = new Set((whitelist ?? []).map((a) => a?.id).filter(Boolean));
    for (const dep of check.dependencies) {
      if (typeof dep !== 'string' || !dep.startsWith('T:')) continue;
      /*
       * 没有白名单时不能"跳过核对"：`whitelist` 为 null 意味着调用方没给背景公理表，
       * 而证明引用了理论公理——这时**无法核对**，必须如实记一条问题。
       */
      if (!whitelist) problems.push(`无法核对理论依赖：没有给出背景白名单，而证明引用了理论公理 ${dep.slice(2)}`);
      else if (!whitelistIds.has(dep.slice(2))) problems.push(`证明用到了背景白名单外的理论公理：${dep.slice(2)}`);
    }
  }

  // --- 6. 证书完好 -----------------------------------------------------------
  if (certificate) {
    const actualCertHash = hashOf(certificate);
    if (candidate?.certificateSha256 && actualCertHash !== candidate.certificateSha256) {
      problems.push('证书被改动过：现算摘要与登记的 certificateSha256 不一致');
    }
    const target = certificate.target;
    const proof = certificate.proofs?.[target];
    if (!proof) problems.push(`证书里找不到 target=${target} 的证明`);
    else {
      if (check?.proofSha256 && hashOf(proof) !== check.proofSha256) problems.push('证书被改动过：proof 现算摘要与 check.proofSha256 不一致');
      if (proof.checker !== KERNEL_VERSION) problems.push(`证明的 checker 字段不是 ${KERNEL_VERSION}`);
      if (check?.theorySha256 && proof.theory_sha256 !== check.theorySha256) problems.push('证书被改动过：proof.theory_sha256 与 check.theorySha256 不一致');
    }
    if (certificate.format !== KERNEL_VERSION) problems.push(`证书 format 不是 ${KERNEL_VERSION}`);
  }

  return {
    ok: ok(problems),
    problems,
    scope: {
      theoryId: check?.theoryId ?? null,
      theoryVersion: check?.theoryVersion ?? null,
      theorySha256: check?.theorySha256 ?? null,
      openHypotheses: check?.openHypotheses ?? null,
      nodeVersions: nodeVersions ?? null,
    },
  };
}

/** 便利函数：把「声明条件」生成 verify 需要的形状（canonical 相同即视为同一条件）。 */
export function conditionsFromHypotheses(openHypotheses, idPrefix = 'cond') {
  return Object.entries(openHypotheses ?? {}).map(([label, canonical], index) => ({
    id: `${idPrefix}:${label ?? index}`,
    label,
    source: JSON.stringify(canonical),
    canonical,
  }));
}
