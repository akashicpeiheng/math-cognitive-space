/**
 * core/formal/judgment.mjs —— 三维状态（数学判断 / 运行状态 / 复核状态）与证据记录（§2.9）。
 *
 * **硬规则（写死在代码里）**：
 * 1. `check.status === 'passed'` 只是 `verified` 的**必要**条件：还要 §2.10 的目标核对也过；
 * 2. `check.status === 'failed'` → `run.status = 'check_failed'`、`math.status = 'undecided'`，
 *    **绝不写成 `refuted`**——证书不合格只说明这份证书不合格，命题本身仍未判定；
 * 3. `timeout / unsupported / error / cancelled` → `math.status = 'undecided'`；
 * 4. `refuted` 只能来自独立有限语义的反模型（§2.12），且只反驳"该背景下的蕴含"。
 */

import { CHECK_STATUS, EVIDENCE_STATUS } from '../../shared/contracts.mjs';
import { sameFormula } from './terms.mjs';
import { normalizeCheck } from './verify.mjs';

export const MATH_JUDGMENTS = ['verified', 'refuted', 'undecided'];
export const RUN_STATUSES = ['completed', 'timeout', 'unsupported', 'check_failed', 'error', 'cancelled'];
export const REVIEW_STATUSES = ['pending', 'accepted', 'dismissed', 'published', 'stale'];

const CHECK_TO_RUN = {
  failed: 'check_failed',
  unsupported: 'unsupported',
  resource_exhausted: 'timeout',
  corrupt: 'error',
};

function normalizeRunStatus(run, check) {
  let status = RUN_STATUSES.includes(run?.status) ? run.status : 'completed';
  if (check && CHECK_TO_RUN[check.status]) status = CHECK_TO_RUN[check.status];
  else if (check?.status === 'passed' && status !== 'cancelled') status = 'completed';
  return status;
}

/**
 * 数学判断。
 * @param {{goal?:unknown, proof?:object|null, check?:object|null, counterexample?:object|null,
 *          run?:object|null, verification?:{ok:boolean, problems?:string[]}|null}} input
 */
export function judgeCandidate({ goal = null, proof = null, check = null, counterexample = null, run = null, verification = null } = {}) {
  const notes = [];
  // 内核原始输出是 snake_case，§2.5 的 kernel.mjs 归一成 camelCase；这里两种都收。
  check = normalizeCheck(check);
  const checkStatus = check?.status ?? 'not_run';
  const runStatus = normalizeRunStatus(run, check);
  const openHypotheses = check?.openHypotheses ?? null;
  const scopeInfo = {
    theory: check ? { id: check.theoryId, version: check.theoryVersion, sha256: check.theorySha256 } : null,
    nodeVersions: run?.nodeVersions ?? null,
    openHypotheses,
    certificateScope: run?.certificateScope ?? null,
  };

  let status = 'undecided';
  let reason = '';
  if (checkStatus === 'passed') {
    if (verification && verification.ok === true) {
      status = 'verified';
      reason = '证书被内核接受，且服务端目标核对通过（精确命题/理论版本/开放假设/未偷加公理）。';
    } else if (verification && verification.ok === false) {
      reason = `内核接受但目标核对未过：${(verification.problems ?? []).join('；') || '未给出原因'}`;
      notes.push('内核 passed 不等于本命题已认证：目标核对未过时一律 undecided。');
    } else {
      reason = '内核接受，但缺少 §2.10 目标核对，不能标 verified。';
      notes.push('check.status === "passed" 是 verified 的必要条件而不是充分条件。');
    }
  } else if (checkStatus === 'failed') {
    reason = '证书未被内核接受（check failed）：这份证书不合格，命题本身仍未判定。';
    notes.push('检查失败不等于命题为假——「没证出来」与「被证伪」是两件事。');
  } else if (checkStatus === 'unsupported') {
    reason = check?.message ? `超出内核能力范围：${check.message}` : '超出内核能力范围。';
  } else if (checkStatus === 'resource_exhausted') {
    reason = check?.message ? `资源耗尽：${check.message}` : '资源耗尽。';
  } else if (checkStatus === 'corrupt') {
    reason = check?.message ? `证书损坏：${check.message}` : '证书损坏。';
  } else if (counterexample?.found === true) {
    status = 'refuted';
    reason = `独立有限语义找到反模型（${counterexample.model ?? '未命名模型'}）。`;
  } else if (runStatus === 'timeout') {
    reason = run?.reason ?? '搜索预算耗尽。';
  } else if (runStatus === 'unsupported') {
    reason = run?.reason ?? '首版语言/规则不支持该形状。';
  } else if (runStatus === 'error') {
    reason = run?.reason ?? '执行错误。';
  } else if (runStatus === 'cancelled') {
    reason = run?.reason ?? '已取消。';
  } else {
    reason = run?.reason ?? '未给出判定依据（既没有通过的证书，也没有反模型）。';
  }

  if (status === 'refuted') {
    notes.push('有限反模型只反驳"该背景下的蕴含"，不宣称推翻实数、流形等无限结构中的数学结论。');
  }
  notes.push('kernel.formally_verified = false：内核自身没有被形式化验证过。');

  const definitional = (run?.certificateScope ?? null) === 'definition';
  const label = status === 'verified' ? 'PROOF'
    : status === 'refuted' ? 'FINITE'
      : definitional ? 'DEF' : 'NOT-CLAIMED';

  return {
    math: {
      status,
      reason,
      /*
       * 三态，不两态（2026-10 修）。
       *
       * `openHypotheses` 为 `null` 表示**根本没有检查结果**，`{}` 表示"检查过、没有开放假设"。
       * 从前两者都落成 `'unconditional'`，于是「没跑过检查」被说成「无条件成立」——
       * 那正是这一层最不该说的话。
       */
      scope: scopeInfo.certificateScope
        ?? (openHypotheses === null || openHypotheses === undefined
          ? 'unknown'
          : (Object.keys(openHypotheses).length ? 'conditional' : 'unconditional')),
    },
    run: { status: runStatus, reason: run?.reason ?? reason, stats: run?.stats ?? {} },
    scope: scopeInfo,
    label,
    notes,
  };
}

/**
 * EvidenceRecord 形状（`shared/types.d.ts`）。
 * 只记录**这份证明**用到的东西：不宣称所有路线都依赖同样的假设。
 */
export function evidenceRecord(candidate, runRecord = {}) {
  const judgment = candidate?.judgment ?? judgeCandidate({
    goal: candidate?.goal?.canonical ?? null,
    proof: candidate?.proof ?? null,
    check: candidate?.check ?? null,
    counterexample: candidate?.counterexample ?? null,
    run: candidate?.run ?? null,
    verification: candidate?.verification ?? null,
  });
  const check = normalizeCheck(candidate?.check ?? null);
  const status = EVIDENCE_STATUS.includes(judgment.label) ? judgment.label : 'NOT-CLAIMED';
  const checkStatus = CHECK_STATUS.includes(check?.status) ? check.status : 'not_run';
  const kind = judgment.math.status === 'verified' ? 'machine-certificate'
    : judgment.math.status === 'refuted' ? 'finite-check'
      : status === 'DEF' ? 'reference' : 'not-claimed';
  const openAssumptions = Object.values(check?.openHypotheses ?? {}).map((f) => JSON.stringify(f));
  const usedAxioms = (check?.dependencies ?? []).filter((d) => typeof d === 'string' && d.startsWith('T:')).map((d) => d.slice(2));
  return {
    id: candidate?.evidenceId ?? `ev:${candidate?.id ?? 'unknown'}`,
    kind,
    status,
    checkStatus,
    title: candidate?.title ?? `${candidate?.kind ?? 'relation'}：${candidate?.id ?? '未命名候选'}`,
    scope: judgment.math.scope,
    nodes: [candidate?.from?.node, candidate?.to?.node].filter(Boolean),
    certificate: candidate?.certificateSha256 ?? runRecord?.certificatePath ?? undefined,
    checker: check?.checker,
    checkerVerified: false, // kernel 自己没被形式化验证过（照抄 kernel 的字段）
    usedAxioms,
    openAssumptions,
    dependsOn: Array.isArray(check?.dependencies) ? [...check.dependencies] : [],
    obligations: (candidate?.obligations ?? []).filter((s) => typeof s === 'string'),
  };
}

/** 判断一份证书与一个目标是否指向同一命题（verify.mjs 与 judge 共用）。 */
export function conclusionMatches(conclusion, goal) {
  if (!conclusion || !goal) return false;
  try {
    return sameFormula(conclusion, goal);
  } catch {
    return false;
  }
}
