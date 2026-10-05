/**
 * 发现编排：候选生成 → 证明/反驳 → 独立检查 → 目标核对 → 解释（规格 §3、§8.5）。
 *
 * ## 为什么是同步函数
 *
 * `server/api.mjs` 的 `POST /relation-discovery/jobs` 直接 `discovery.discoverRelations({...})`
 * 取结果（没有 await）。所以这一层**必须**同步返回 `{ candidates, stats }`。
 * 需要检查器子进程的那一步因此不进这里：它在 `replayCandidate`（async）里做，
 * 或者由调用方注入同步的 `deps.check`。发现阶段的诚实产物是「候选 + 待核验」，
 * 不是「已经认证」——`math.status` 只会在真有 check 结果时才升级成 verified。
 *
 * ## 引擎全部懒加载
 *
 * `search` / `certificate` / `kernel` / `finite` / `language` 由别的模块实现，
 * 且可能比本模块晚出现。这里用 `createRequire` **在函数内部**按需装载：
 * 模块顶层不读盘、不开库、不 import 引擎；装载失败就退化成「候选照常生成、
 * 确认如实报 unsupported」，而不是让整个接口 500。
 */

import { createRequire } from 'node:module';
import { readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { sha256 } from '../hash.mjs';
import { RELATION_KINDS, collectCandidates, judgeIndex } from './judges.mjs';
import { listSpecs, specForId, withStableNodeId } from './judges/shared.mjs';

const require = createRequire(import.meta.url);

/** 默认预算（规格 §3）：可被请求覆盖，超出预算的部分保留已完成结果并列出来。 */
export const DISCOVERY_BUDGET = Object.freeze({
  maxCandidates: 100,
  /*
   * 单候选 8 秒 / 深度 12 / 状态数 200000：按实测定的**工程限制**，不是数学条件的放宽。
   *
   * case-registry 实测「三步量词链 + 定义展开」这类目标（如 `abelian ⇒ group`）需要
   * depth 12 / states 200000 / 约 5.5 秒；旧默认 8 / 10000 / 2000ms 会把它们全记成
   * timeout（undecided），四案例里的证书型关系因此挂零。8 秒是实测值留一点余量，
   * 整批上限仍是 30 秒（§3 的整批上限不变）。
   */
  perCandidateMs: 8000,
  totalMs: 30000,
  depth: 12,
  maxStates: 200000,
});

export const GENERATOR_VERSION = 'mcs-discovery/1';
export const RUN_VERSION = 'mcs-discovery-run/1';

/** 判定引擎的懒装载：只在第一次真正需要时 require，失败缓存成 null。 */
const moduleCache = new Map();
function lazyModule(relative) {
  if (moduleCache.has(relative)) return moduleCache.get(relative);
  let loaded = null;
  try {
    loaded = require(relative);
  } catch {
    loaded = null;
  }
  moduleCache.set(relative, loaded);
  return loaded;
}

/**
 * 装配默认引擎袋；缺哪个就是 null，判定器会如实报「依赖未装配」。
 *
 * `overrides` 里**显式出现的键优先**（包括显式给 `null`，表示「本轮禁用」）。
 * 这个区分很重要：上游模块一旦落地，懒装载就会自动接上真引擎；
 * 而测试要的是可复现的判定，不能随「谁先写完」而变化——`{ search: null }` 就是那个开关。
 */
export function resolveEngine(overrides = {}) {
  const pick = (key, loader) => (key in overrides ? overrides[key] : loader());
  const language = pick('language', () => lazyModule('./language.mjs'));
  const judgment = pick('judgment', () => lazyModule('./judgment.mjs'));
  const searchModule = pick('searchModule', () => lazyModule('./search.mjs'));
  const engine = {
    language,
    search: pick('search', () => searchModule?.search ?? null),
    // 搜索模块本身也带上：`collectHypotheses` 等辅助函数在装配证明时要用。
    searchModule,
    certificate: pick('certificate', () => lazyModule('./certificate.mjs')),
    kernel: pick('kernel', () => lazyModule('./kernel.mjs')),
    finite: pick('finite', () => lazyModule('./finite.mjs')),
    verify: pick('verify', () => lazyModule('./verify.mjs')?.verifyCandidate ?? null),
    judgeCandidate: pick('judgeCandidate', () => judgment?.judgeCandidate ?? null),
    evidenceRecord: pick('evidenceRecord', () => judgment?.evidenceRecord ?? null),
    theory: pick('theory', () => lazyModule('./theory.mjs')),
    registry: overrides.registry ?? null,
  };
  if (engine.certificate && typeof engine.certificate.assembleProof !== 'function') engine.certificate = null;
  if (engine.kernel && typeof engine.kernel.checkBundle !== 'function') engine.kernel = null;
  if (engine.finite && typeof engine.finite.checkStructure !== 'function') engine.finite = null;
  return engine;
}

/* --------------------------------------------------------------- 判定规则 */

/**
 * 数学判断的内部实现（与 `core/formal/judgment.mjs` 的 §2.9 硬规则逐条对齐）。
 *
 * 只在 `deps.judgeCandidate` 缺席时使用；一旦上游的 `judgment.mjs` 就位，
 * 懒装载会优先用它——两套判据不会同时生效，也就不存在「两套口径」。
 */
export function defaultJudgeCandidate({ proof = null, check = null, counterexample = null, run = {} } = {}) {
  const notes = [];
  let status = 'undecided';
  let label = 'NOT-CLAIMED';
  if (counterexample?.model) {
    /*
     * 反例来自独立的有限语义求值器（不 import kernel），它是**正面结果**：
     * 「这条蕴含在有限模型上被反驳」。但与机器证书不是一回事，标签是 FINITE。
     */
    status = 'refuted';
    label = 'FINITE';
    notes.push('反例只反驳该背景下的蕴含，不宣称推翻无限结构上的结论。');
  } else if (check?.status === 'passed') {
    status = 'verified';
    label = 'PROOF';
    notes.push('检查器本身未获形式验证；这里是「这份证书被这个检查器接受」。');
  } else if (check && check.status !== 'passed') {
    status = 'undecided';
    notes.push('检查未通过不等于命题为假：这只是「这份证书没被接受」。');
  } else if (proof) {
    status = 'undecided';
    notes.push('只找到证明对象、还没跑检查器：不算 verified。');
  }
  const runStatus = run.status ?? (check
    ? (check.status === 'passed' ? 'completed' : check.status === 'failed' ? 'check_failed' : 'unsupported')
    : 'completed');
  return {
    math: { status, reason: run.reason ?? '', scope: run.scope ?? '' },
    run: { status: runStatus, reason: run.reason ?? '', stats: run.stats ?? {} },
    scope: run.scopeDetail ?? { theory: null, nodeVersions: {}, openHypotheses: [], certificateScope: null },
    label,
    notes,
  };
}

function mathFromConfirmation(confirmation, engine, context) {
  if (confirmation?.status === 'pending') {
    // 还没等到判定：如实记未决，并留下「检查在跑」的标记（不冒充已验证，也不冒充没做）。
    return {
      math: { status: 'undecided', reason: confirmation.reason ?? '判定尚未返回。', scope: '' },
      run: { status: 'unsupported', reason: confirmation.reason ?? '', stats: {} },
      label: 'NOT-CLAIMED',
      notes: ['同步发现阶段不等待异步判定；结果会在结算后补上，或改走重放。'],
      counterexample: null,
      evidence: null,
    };
  }
  if (confirmation?.status === 'refuted') {
    return {
      math: { status: 'refuted', reason: confirmation.reason ?? '', scope: confirmation.scope?.certificateScope ?? '' },
      run: { status: 'completed', reason: confirmation.reason ?? '', stats: confirmation.stats ?? {} },
      label: 'FINITE',
      notes: ['有限反模型；只反驳该背景下的蕴含。'],
      counterexample: confirmation.counterexample ?? null,
      evidence: null,
    };
  }
  if (confirmation?.status === 'proved') {
    /*
     * 定义引用这一类的「确认」不是内核检查，而是**登记表核对**（版本 + 类型 + 符号归属）。
     * 为了不绕过 §2.9 的硬规则（verified 只能来自 check.status === 'passed'），
     * 这里给它造一份**名副其实的检查结果**：checker 写的是登记核对器，不是 kernel。
     * 证据种类仍是 `reference`、标签仍是 DEF——「用到」没有被说成「证明了」。
     */
    const syntheticCheck = confirmation.mode === 'definition'
      ? { status: 'passed', checker: confirmation.checker ?? 'definition-registry/1', checkerSha256: null, openHypotheses: [], dependencies: [] }
      : null;
    const check = confirmation.check ?? syntheticCheck;
    /*
     * §2.10 的服务端目标核对。
     *
     * 内核说 passed 只证明「这份证书被接受了」，不证明「它证的就是我们要的那条」。
     * `judgment.mjs` 因此要求 `verification.ok === true` 才给 verified——
     * 这里把**判定器实际搜索的目标公式**当成期望命题交上去核对，而不是让候选自报。
     */
    let verification = null;
    if (syntheticCheck) {
      verification = { ok: true, problems: [], scope: {} };
    } else if (typeof engine.verify === 'function' && confirmation.goalFormula) {
      try {
        verification = engine.verify(
          {
            check,
            certificate: confirmation.bundle ?? null,
            goal: { canonical: confirmation.goalFormula, hash: null },
            theory: { id: check?.theoryId ?? null, version: check?.theoryVersion ?? null, sha256: check?.theorySha256 ?? null },
          },
          {
            spec: context.spec ?? null,
            background: context.theory ?? null,
            expectedConclusion: confirmation.goalFormula,
            nodeVersions: context.nodeVersions ?? null,
          },
        );
      } catch (error) {
        verification = { ok: false, problems: [`目标核对执行出错：${error.message}`] };
      }
    }
    const judged = engine.judgeCandidate
      ? engine.judgeCandidate({ goal: context.goal, proof: confirmation.proof ?? null, check, counterexample: null, run: { reason: confirmation.reason }, verification })
      : defaultJudgeCandidate({ proof: confirmation.proof ?? null, check, run: { reason: confirmation.reason } });
    if (syntheticCheck && judged.math.status === 'verified') judged.label = 'DEF';
    if (confirmation.mode === 'definition') {
      (judged.notes ??= []).push('定义引用不需要证书：这条关系说的是「用到」，不是「证明了」。');
    }
    return {
      math: { status: judged.math.status, reason: confirmation.reason ?? judged.math.reason, scope: confirmation.scope?.certificateScope ?? judged.math.scope ?? '' },
      run: { status: judged.run.status, reason: confirmation.reason ?? judged.run.reason, stats: confirmation.stats ?? {} },
      label: judged.label,
      notes: judged.notes ?? [],
      counterexample: null,
      evidence: evidenceFromConfirmation(confirmation, judged),
      verification,
    };
  }
  const status = confirmation?.status ?? 'undecided';
  return {
    math: { status: 'undecided', reason: confirmation?.reason ?? '未给出判定。', scope: '' },
    run: {
      status: status === 'unsupported' ? 'unsupported' : status === 'timeout' ? 'timeout' : 'completed',
      reason: confirmation?.reason ?? '',
      stats: confirmation?.stats ?? {},
    },
    label: 'NOT-CLAIMED',
    notes: status === 'unsupported'
      ? ['本轮没有可用的判定引擎，未对命题作任何数学断言。']
      : ['搜索/检查未给出结论：未决，不是反驳。'],
    counterexample: null,
    evidence: null,
  };
}

/**
 * 证据记录（`shared/types.d.ts` 的 EvidenceRecord）。
 *
 * 证书正文（`certificateText`）随记录一起留在编写库里，发布时由
 * `server/publication.mjs` 搬进不可变内容包；这里不写盘——发现阶段一个字节都不落。
 *
 * **证书从哪儿来**：判定器把 kernel bundle 放在 **`confirmation.bundle`**
 * （`judges/*.mjs` 的 `proved(..., { bundle })`），而 `kernel.checkBundle` 的返回里
 * **没有** bundle 字段（它只回报检查结论）。早先这里读的是 `check.bundle`，
 * 于是「已验证但证书正文永远为空」——交接断在了字段名上。现在按
 * `confirmation.bundle → confirmation.certificate → check.bundle` 依次取，
 * 取不到就不再是静默空串，而是下方的**交接断言**。
 */
function evidenceFromConfirmation(confirmation, judged) {
  const scope = confirmation.scope ?? {};
  const kind = confirmation.evidenceKind ?? (judged.label === 'FINITE' ? 'finite-check' : 'machine-certificate');
  if (kind === 'reference') {
    return {
      id: null,                                   // 由编排补成 ev:<candidateId>
      kind: 'reference',
      status: 'DEF',
      checkStatus: 'not_run',
      title: confirmation.reason ?? '定义引用',
      scope: scope.certificateScope ?? '',
      nodes: [],
      checkerVerified: false,
    };
  }
  const check = confirmation.check ?? null;
  const record = {
    id: null,
    kind,
    status: judged.label === 'PROOF' ? 'PROOF' : 'FINITE',
    checkStatus: kind === 'finite-check' ? 'passed' : (check?.status ?? 'not_run'),
    title: confirmation.reason ?? '',
    scope: scope.certificateScope ?? '',
    nodes: [],
    checkerVerified: false,                        // 检查器未获形式验证，永远写 false
    usedAxioms: check?.dependencies ?? [],
    openAssumptions: check?.openHypotheses ?? [],
    dependsOn: check?.dependencies ?? [],
  };
  if (check?.checker) record.checker = check.checker;
  if (check?.checkerSha256) record.checkerSha256 = check.checkerSha256;
  if (check?.checker_sha256) record.checkerSha256 = check.checker_sha256;

  const bundle = confirmation.bundle ?? confirmation.certificate ?? check?.bundle ?? null;
  const inherited = typeof confirmation.bundleText === 'string'
    ? confirmation.bundleText
    : (typeof check?.bundleText === 'string' ? check.bundleText : null);
  const text = bundle ? `${JSON.stringify(bundle, null, 2)}\n` : inherited;
  if (typeof text === 'string' && text.length) {
    record.certificateText = text;
    // 保存的是**这段正文的字节摘要**（与 publication.stageCertificate 同口径），
    // 谁改了正文，发布时对不上就会当场被拒。
    record.certificateSha256 = `sha256:${sha256(text)}`;
  }
  const declaredPath = confirmation.certificatePath ?? check?.certificatePath ?? null;
  if (typeof declaredPath === 'string' && declaredPath.trim()) record.certificatePath = declaredPath.trim();
  if (Array.isArray(confirmation.table)) record.table = confirmation.table;
  assertCertificateHandoff(judged, record);
  return record;
}

/**
 * 交接断言：**已验证**的机器证书候选，其证据必须同时满足
 * 「有证书正文或证书路径」+「检查器状态是 passed」。
 *
 * 缺了说明交接断了——与其把一条「没有证书的 verified」写进库里（发布时才发现搬不动），
 * 不如在发现阶段当场停下来。定义引用（`kind === 'reference'`）不需要证书，不在此列。
 */
export function assertCertificateHandoff(judged, record) {
  if (!record || record.kind !== 'machine-certificate') return record;
  if (judged?.math?.status !== 'verified') return record;
  const problems = [];
  const hasText = typeof record.certificateText === 'string' && record.certificateText.trim().length > 0;
  const hasPath = typeof record.certificatePath === 'string' && record.certificatePath.trim().length > 0;
  if (!hasText && !hasPath) problems.push('verified 的候选没有证书正文，也没有证书路径');
  if (record.checkStatus !== 'passed') problems.push(`verified 的候选检查器状态是 ${record.checkStatus}，不是 passed`);
  if (problems.length) {
    const { McsError, CODES } = lazyModule('../errors.mjs') ?? {};
    const message = `证书交接不完整：${problems.join('；')}（判定器没有把 bundle 交给证据记录）。`;
    if (McsError && CODES) throw new McsError(CODES.EVIDENCE_FAILED, message, 500, { problems, checkStatus: record.checkStatus });
    throw new Error(message);
  }
  return record;
}

/**
 * 证书交接的**统一形状**：发现 → 重放 → 发布三处共用同一份读法。
 *
 * 为什么要有它：候选里证书的位置曾经有三种写法（`confirmation.bundle`、
 * `evidence.certificateText`、`evidence.certificate`），谁读谁的都对不上。
 * 这里只认一种形状，并如实报告**缺什么**（`problems`），而不是返回半份东西。
 *
 * @param {object} candidate 关系候选（`evidence` 里带 `certificateText` 或 `certificatePath`）
 * @param {{persist?:boolean, repoRoot?:string, runtimeDir?:string}} options
 *        `persist:true` 时把正文落盘到 `<runtimeDir>/certificates/<candidateId>.json` 并回读核对，
 *        返回里带 `certificatePath`（仓库内相对路径）与 `certificateSha256`。
 */
export function certificateArtifact(candidate, { persist = false, repoRoot = null, runtimeDir = null } = {}) {
  const evidence = candidate?.evidence ?? null;
  const problems = [];
  const text = typeof evidence?.certificateText === 'string' && evidence.certificateText.trim()
    ? evidence.certificateText : null;
  let path = typeof evidence?.certificatePath === 'string' && evidence.certificatePath.trim()
    ? evidence.certificatePath.trim() : null;
  if (!path && typeof evidence?.certificate === 'string' && evidence.certificate.trim()) path = evidence.certificate.trim();

  let bundle = null;
  if (text) {
    try {
      bundle = JSON.parse(text);
    } catch (error) {
      problems.push(`证书正文不是合法 JSON：${error.message}`);
    }
  }
  if (!bundle && !path) problems.push('候选既没有证书正文，也没有证书路径（交接缺失）');

  const codec = lazyModule('./codec.mjs');
  const kernelDigest = (value) => {
    try {
      if (typeof codec?.digest === 'function') return codec.digest(value);
    } catch { /* 摘要算不出来就留空，不猜 */ }
    return null;
  };
  const proof = bundle?.proofs?.[bundle?.target] ?? null;
  const artifact = {
    bundle,
    certificateText: text,
    certificatePath: path,
    certificateSha256: evidence?.certificateSha256 ?? (text ? `sha256:${sha256(text)}` : null),
    goal: candidate?.goal ?? null,
    background: candidate?.background ?? null,
    theory: bundle?.theory
      ? { id: bundle.theory.id ?? null, version: bundle.theory.version ?? null, sha256: kernelDigest(bundle.theory) }
      : null,
    proofSha256: proof ? kernelDigest(proof) : null,
    steps: Array.isArray(proof?.steps) ? proof.steps.length : 0,
    dependencies: evidence?.dependsOn ?? evidence?.usedAxioms ?? [],
    openHypotheses: evidence?.openAssumptions ?? [],
    checker: evidence?.checker ?? null,
    checkerSha256: evidence?.checkerSha256 ?? null,
    checkStatus: evidence?.checkStatus ?? 'not_run',
    problems,
  };

  if (persist) {
    const fs = require('node:fs');
    const pathMod = require('node:path');
    const root = repoRoot ?? null;
    const base = runtimeDir ?? (root ? pathMod.join(root, 'mcs-web', 'runtime') : null);
    const candidateId = String(candidate?.id ?? '').replace(/[^A-Za-z0-9._-]/g, '_');
    if (!base || !candidateId || !text) {
      artifact.problems.push(`无法落盘：${!base ? '缺少 repoRoot/runtimeDir' : (!text ? '没有证书正文' : '缺少 candidateId')}`);
    } else {
      try {
        const certificatesDir = pathMod.join(base, 'certificates');
        fs.mkdirSync(certificatesDir, { recursive: true });
        const absolute = pathMod.join(certificatesDir, `${candidateId}.json`);
        fs.writeFileSync(absolute, text, 'utf8');
        const readBack = fs.readFileSync(absolute, 'utf8');
        if (readBack !== text) {
          artifact.problems.push('证书落盘后回读不一致');
        } else if (root && absolute.startsWith(resolve(root) + pathMod.sep)) {
          artifact.certificatePath = absolute.slice(resolve(root).length + 1).split(pathMod.sep).join('/');
        } else {
          artifact.certificatePath = absolute;
        }
        artifact.absolutePath = absolute;
        artifact.certificateSha256 = `sha256:${sha256(readBack)}`;
      } catch (error) {
        artifact.problems.push(`证书落盘失败：${error.message}`);
      }
    }
  }
  artifact.complete = artifact.problems.length === 0 && Boolean(artifact.bundle || artifact.certificatePath);
  return artifact;
}

/* ------------------------------------------------------- 引擎上下文装配 */

/** §1.6 登记的字段表：`parseSpec` 在 strict 下只认这些，多余字段要在这里滤掉。 */
const SPEC_FIELDS = Object.freeze([
  'specVersion', 'node', 'nodeVersion', 'background', 'theoryVersion',
  'declarations', 'definitions', 'assumptions', 'statement', 'claims',
  'references', 'boundary', 'source', 'hash',
]);

/**
 * 背景的**核输入**：已归一的 spec + 背景公理 + 背景对象。
 *
 * 优先走登记表自己的入口 `registry.kernelInputForBackground`（case-registry 与
 * proof-engine 都实测过这条路，它带回的 `axioms` 就是那 6 条定义性公理——
 * 它们**不在** `backgrounds.mjs` 的 `axioms` 里）。但那个入口是 async 的，
 * 而本模块的编排必须同步返回，所以拿不到同步结果时用**同一批上游原料**做一次等价镜像：
 * `language.parseSpec`（登记 spec 是原始的，直接喂 `buildKernelTheory` 会在
 * `definitions[].term` 上报「缺少规范项」——那个报错与真正原因无关）+
 * `backgroundAxiomsForKernel` + `backgroundTheory`。这里没有第二份转换逻辑，
 * 只有「谁来调这三个函数」的差别。
 */
function backgroundKernelInput({ registry, backgroundsMod, language, backgroundId, allSpecs, warnings }) {
  const normalizeBg = (id) => (typeof backgroundsMod?.normalizeBackgroundId === 'function' ? backgroundsMod.normalizeBackgroundId(id) : id);
  if (typeof registry?.kernelInputForBackground === 'function') {
    try {
      const maybe = registry.kernelInputForBackground(backgroundId, { language });
      // 同步实现就直接用；返回 Promise 说明它要 await，同步编排等不了 → 走下面的镜像。
      if (maybe && typeof maybe.then !== 'function') return maybe;
    } catch (error) {
      warnings.push(`登记表的 kernelInputForBackground 失败（${backgroundId}）：${error.message}`);
    }
  }
  if (typeof language?.parseSpec !== 'function') {
    warnings.push('语言层未装配：无法把登记 spec 归一成核输入，本轮只能用原始 spec 装配理论。');
    return null;
  }
  const parsed = [];
  for (const spec of allSpecs) {
    if (normalizeBg(spec.background ?? null) !== backgroundId) continue;
    const parseable = {};
    for (const key of SPEC_FIELDS) if (spec[key] !== undefined) parseable[key] = spec[key];
    try {
      parsed.push(language.parseSpec(parseable, { backgrounds: { backgroundTheory: backgroundsMod?.backgroundTheory }, strict: true }));
    } catch (error) {
      warnings.push(`形式表达 ${spec.node} 归一失败（背景 ${backgroundId}）：${error.message}`);
    }
  }
  return {
    specs: parsed,
    axioms: typeof backgroundsMod?.backgroundAxiomsForKernel === 'function' ? backgroundsMod.backgroundAxiomsForKernel(backgroundId) : null,
    background: typeof backgroundsMod?.backgroundTheory === 'function' ? backgroundsMod.backgroundTheory(backgroundId) : backgroundId,
    notes: [],
  };
}

/**
 * 装配判定器要用的 `ctx`（规格 §8.5.1）。
 *
 * **少一个键，确认环节就会静默退化成 undecided——看起来"跑了"，其实什么都没证。**
 * 所以这里宁可多花几次装配，也不让判定器自己去猜：
 *
 * - 目标一律先解析成**认证公式**（字符串交给 `search` 会被当成对象项，报
 *   `invalid certification term`）；
 * - 签名/变量/理论/定义/程序子句/有限对象全部如实透传，缺哪个就报哪个；
 * - 背景公理集现在可能是空的（`bg:group/1` 的定义性公理尚未登记），
 *   那是**数据侧**的事：这里不替任何人造公理，只把现状透传出去。
 */
export function assembleEngineContext({
  registry = null, engine = {}, deps = {}, background = null, backgroundId = null,
  specs = null, focus = new Set(), repoRoot = null, budget = null, ontology = null, draft = null,
} = {}) {
  const warnings = [];
  const language = engine.language ?? deps.language ?? null;
  const backgroundsMod = deps.backgrounds ?? lazyModule('./backgrounds.mjs');
  const theoryMod = deps.theory ?? engine.theory ?? lazyModule('./theory.mjs');
  const termsMod = deps.terms ?? lazyModule('./terms.mjs');
  const instancesMod = deps.instances ?? lazyModule('../../data/formal/instances.mjs');
  const certificateMod = engine.certificate ?? null;

  const parseTypeSafe = (source, where) => {
    if (source === undefined || source === null) return null;
    if (typeof source === 'object') return source;                 // 已经是类型节点
    if (typeof language?.parseType !== 'function') {
      warnings.push(`类型 ${String(source)} 无法解析（语言层未装配）：${where}`);
      return null;
    }
    try {
      return language.parseType(String(source));
    } catch (error) {
      warnings.push(`类型 ${String(source)} 解析失败（${where}）：${error.message}`);
      return null;
    }
  };
  const typeText = (node) => {
    if (node === null || node === undefined) return '?';
    if (typeof node === 'string') return node;
    try { return typeof language?.typeToString === 'function' ? language.typeToString(node) : JSON.stringify(node); } catch { return JSON.stringify(node); }
  };
  const sameType = (a, b) => {
    if (a === b) return true;
    try { return typeof language?.typeEquals === 'function' ? language.typeEquals(a, b) : JSON.stringify(a) === JSON.stringify(b); } catch { return false; }
  };

  // ---- 形式表达清单：基础登记 + 已发布扩展 + 本次草稿（各自带来源标记） ----
  const inventory = collectSpecInventory({ registry, ontology, draft, specs, language, backgrounds: backgroundsMod, warnings });
  const allSpecs = inventory.allSpecs;
  const origins = inventory.origins;

  // ---- 背景：显式请求 > 草稿声明 > 焦点 spec > 默认（唯一入口 resolveBackground） ----
  const normalizeBg = (id) => (typeof backgroundsMod?.normalizeBackgroundId === 'function' ? backgroundsMod.normalizeBackgroundId(id) : id);
  const focusSpec = allSpecs.find((spec) => focus.has(spec.node)) ?? null;
  const resolved = resolveBackground({
    requested: backgroundId ?? background,
    draft,
    focusSpec,
    backgrounds: backgroundsMod,
  });
  const resolvedBackground = resolved.id;
  if (resolved.source === 'default' || resolved.source === 'none') {
    warnings.push(`没有指定背景（请求、草稿、焦点 spec 都没有声明），按默认背景 ${String(resolvedBackground)} 装配；跨背景的候选需要显式给出 background。`);
  } else if (resolved.source === 'draft') {
    warnings.push(`背景取自草稿声明：${String(resolvedBackground)}。`);
  }

  const sameBackground = (spec) => !resolvedBackground || !spec.background || normalizeBg(spec.background) === resolvedBackground;
  const backgroundSpecs = allSpecs.filter(sameBackground);

  /*
   * 自由变量表：**全部 spec（含概念 spec）的声明**。
   * 同名不同类是真冲突（§1.1 要求拒绝），这里**报出来并保留先到者**——
   * 静默后者赢会让「目标里的 xx 到底是哪一型」变成不可核的事。
   */
  const variables = {};
  const variableSource = new Map();
  for (const spec of allSpecs) {
    for (const declaration of spec.declarations ?? []) {
      if (!declaration?.name) continue;
      const parsed = parseTypeSafe(declaration.type, `${spec.node}.${declaration.name}`);
      if (!parsed) continue;
      const previous = variables[declaration.name];
      if (previous !== undefined && !sameType(previous, parsed)) {
        warnings.push(`同名不同类型：${declaration.name}（${variableSource.get(declaration.name)} 与 ${spec.node}）——`
          + `${typeText(previous)} vs ${typeText(parsed)}；按 §1.1 应当拒绝而不是覆盖，需要修订声明。`);
        continue;
      }
      variables[declaration.name] = parsed;
      if (!variableSource.has(declaration.name)) variableSource.set(declaration.name, spec.node);
    }
  }

  // ---- 背景签名（只做退路；正规路径由 certificate.kernelTheory 给出同一份 sig） ----
  const backgroundSignature = typeof backgroundsMod?.backgroundSignature === 'function'
    ? backgroundsMod.backgroundSignature(resolvedBackground)
    : { bases: [], constants: {} };
  const bases = new Set(['o', ...(backgroundSignature.bases ?? [])]);
  const constants = {};
  for (const [name, type] of Object.entries(backgroundSignature.constants ?? {})) {
    const parsed = parseTypeSafe(type, `背景 ${resolvedBackground} 的常量 ${name}`);
    if (parsed) constants[name] = parsed;
  }
  for (const spec of backgroundSpecs) {
    for (const declaration of spec.declarations ?? []) {
      const parsed = parseTypeSafe(declaration.type, `${spec.node}.${declaration.name}`);
      if (!parsed) continue;
      if (constants[declaration.name] !== undefined && !sameType(constants[declaration.name], parsed)) {
        warnings.push(`常量 ${declaration.name} 与背景 ${resolvedBackground} 同名不同类：`
          + `${typeText(constants[declaration.name])} vs ${typeText(parsed)}。`);
        continue;
      }
      constants[declaration.name] = parsed;
    }
  }

  // ---- 背景理论：走登记表的核输入（已归一 spec + 背景定义性公理） ----
  const kernelInput = backgroundKernelInput({
    registry, backgroundsMod, language, backgroundId: resolvedBackground, allSpecs, warnings,
  });
  let theory = null;
  if (typeof theoryMod?.buildKernelTheory === 'function') {
    try {
      theory = theoryMod.buildKernelTheory(
        kernelInput?.specs?.length ? kernelInput.specs : backgroundSpecs,
        {
          background: kernelInput?.background ?? resolvedBackground,
          // 背景公理：登记表给的那 6 条定义性公理；没给就让 buildKernelTheory 用背景自己的。
          ...(Array.isArray(kernelInput?.axioms) && kernelInput.axioms.length ? { axioms: kernelInput.axioms } : {}),
        },
      );
    } catch (error) {
      warnings.push(`背景理论装配失败（${resolvedBackground}）：${error.message}`);
    }
  } else {
    warnings.push('理论层未装配：ctx.theory / ctx.theoryAxioms 缺失。');
  }

  /*
   * 签名用 `terms.signatureOfTheory(theory)`。
   *
   * 它是 kernel 口径的签名（已解析的**类型节点**，定义名按 `environment()` 的顺序登记），
   * 而且带缓存：`clausifyFormula` / `search` 拿到的会是**同一个对象**。
   * `backgrounds.backgroundSignature()` 给的是解析层签名（常量值是源码文本），
   * 喂给搜索会在很远的 `sorted app mismatch` / TypeError 处才炸——那是症状不是原因。
   * `certificate.kernelTheory` 只用来取「定义等式表」与「公理表」，它的 sig 丢弃不用，
   * 免得同时存在两个活着的 sig。
   */
  let sig = null;
  let definitions = new Map();
  let theoryAxioms = [];
  let kernelTheory = theory;
  if (theory && typeof certificateMod?.kernelTheory === 'function') {
    try {
      const built = certificateMod.kernelTheory(theory);
      definitions = built.definitions ?? new Map();
      theoryAxioms = built.theoryAxioms ?? theory.axioms ?? [];
      // 用证书层归一后的理论：它与 `assembleProof` 认的是同一份（bases/constants/definitions 顺序都定死）。
      kernelTheory = built.theory ?? theory;
    } catch (error) {
      warnings.push(`理论→签名装配失败：${error.message}`);
    }
  }
  if (kernelTheory && typeof termsMod?.signatureOfTheory === 'function') {
    try {
      sig = termsMod.signatureOfTheory(kernelTheory);
    } catch (error) {
      warnings.push(`signatureOfTheory 失败：${error.message}`);
    }
  }
  if (!sig) {
    sig = { bases: [...bases], constants: { ...constants }, definitions: [] };
    theoryAxioms = theoryAxioms.length ? theoryAxioms : (Array.isArray(kernelTheory?.axioms) ? kernelTheory.axioms : []);
    if (theoryAxioms.length) warnings.push('证书层未装配：定义等式表为空，`definition` 步骤可能无法登记。');
  }
  // 定义名在 `signatureOfTheory` 里已登记进 sig.constants，解析上下文直接用同一份类型表。
  const parseConstants = { ...sig.constants };
  const parseDefinitions = [];
  for (const def of sig.definitions ?? []) {
    const type = parseConstants[def.name] ?? null;
    if (type) parseDefinitions.push({ name: def.name, type });
  }
  for (const [name, type] of Object.entries(backgroundSignature.constants ?? {})) {
    if (parseConstants[name] === undefined) {
      const parsed = parseTypeSafe(type, `背景定义 ${name}`);
      if (parsed) parseConstants[name] = parsed;
    }
  }
  const parseCtx = {
    bases: [...(sig.bases ?? [])],
    constants: parseConstants,
    definitions: parseDefinitions,
    strict: false,
  };

  /*
   * 程序子句：背景公理 + 定义 + 各 spec 的假设。
   *
   * 假设条目按 §8.5.1 如实放进来（供查看与判定器按需取用），但判定器构造程序时
   * 只取 axiom / definition 两类，局部假设由候选自己带（见 `judges/shared.mjs` 的 `programFor`）。
   */
  const clauses = [];
  for (const axiom of theoryAxioms) {
    clauses.push({ id: `axiom:${axiom.id}`, kind: 'axiom', formula: axiom.formula, theoryAxiomId: axiom.id });
  }
  for (const def of sig.definitions ?? []) {
    clauses.push({ id: `def:${def.name}`, kind: 'definition', definitionName: def.name });
  }
  for (const spec of backgroundSpecs) {
    for (const assumption of spec.assumptions ?? []) {
      if (typeof assumption?.source !== 'string') continue;
      try {
        const formula = language.parseFormula(assumption.source, parseCtx);
        clauses.push({ id: `hyp:${spec.node}:${assumption.id ?? clauses.length}`, kind: 'hypothesis', formula, specNode: spec.node });
      } catch (error) {
        warnings.push(`假设解析失败（${spec.node}.${assumption.id ?? '?'}）：${error.message}`);
      }
    }
  }

  const models = Array.isArray(deps.models) ? deps.models
    : (Array.isArray(registry?.models) ? registry.models
      : (Array.isArray(instancesMod?.REGISTERED_INSTANCES) ? instancesMod.REGISTERED_INSTANCES : []));

  /*
   * 既有证书 → 闭引理。
   *
   * 依赖证书层（sig/theory）先装配好：闭合要在同一套理论下做，
   * 否则引理的 theory_sha256 与 bundle 的对不上，`theorem` 步骤会被检查器拒。
   */
  const { lemmas, warnings: lemmaWarnings } = theory && sig
    ? assembleLemmas({ ontology, deps, sig, theory: kernelTheory, repoRoot, background: resolvedBackground })
    : { lemmas: [], warnings: [] };
  warnings.push(...lemmaWarnings);

  return {
    ctx: {
      registry,
      specs: allSpecs,
      conceptSpecs: allSpecs.filter((spec) => spec.concept || String(spec.node).startsWith('concept:')),
      specForId: (id) => specForId({ specs: allSpecs }, id),
      background: resolvedBackground,
      sig,
      parseCtx,
      variables,
      theory: kernelTheory,
      theoryAxioms,
      definitions,
      clauses,
      lemmas: Array.isArray(deps.lemmas) ? deps.lemmas : lemmas,
      models,
      /* 有限求值器要的「背景公式表」：它不读理论注册表，背景成立与否由调用方给公式。 */
      backgroundFormulas: theoryAxioms.length ? { [resolvedBackground]: theoryAxioms.map((axiom) => axiom.formula) } : {},
      deps: engine,
      repoRoot,
      budget,
    },
    warnings,
    background: resolvedBackground,
    backgroundSource: resolved.source,
    backgroundChain: resolved.candidates,
    allSpecs,
    origins,
    inventory,
  };
}

/** 证书文件的只读缓存：按「路径 + mtime + 大小」失效，改了文件就不会拿旧内容。 */
const certificateCache = new Map();

/**
 * 读一份已登记的机器证书。
 *
 * 路径来自本体数据（`evidence[].certificate`），所以只接受**仓库内相对路径**：
 * 绝对路径、`..`、盘符一律拒绝。读失败如实返回原因，不猜内容。
 */
function loadCertificateFile(relative, repoRoot) {
  if (typeof relative !== 'string' || !relative.trim()) return { ok: false, reason: '证书路径为空' };
  if (relative.includes('..') || /^[A-Za-z]:/.test(relative) || relative.startsWith('/') || relative.startsWith('\\')) {
    return { ok: false, reason: `证书路径非法（只接受仓库内相对路径）：${relative}` };
  }
  if (!repoRoot) return { ok: false, reason: 'ctx.repoRoot 缺失，无法定位证书文件' };
  const absolute = join(resolve(repoRoot), relative);
  try {
    const info = statSync(absolute);
    const cached = certificateCache.get(absolute);
    if (cached && cached.mtimeMs === info.mtimeMs && cached.size === info.size) return { ok: true, value: cached.value };
    const value = JSON.parse(readFileSync(absolute, 'utf8'));
    certificateCache.set(absolute, { mtimeMs: info.mtimeMs, size: info.size, value });
    return { ok: true, value };
  } catch (error) {
    return { ok: false, reason: `${error.code ?? error.message}` };
  }
}

/**
 * 把本体里已登记的机器证书**闭合**成可复用的引理（§8.5.2）。
 *
 * kernel 的 `theorem` 规则拒绝引用开放假设非空的引理，所以只有闭合成功的才进 `ctx.lemmas`。
 * 「闭不上」与「没有引理」是两件事：前者如实进 warnings，后者什么都不用说。
 */
function assembleLemmas({ ontology, deps, sig, theory, repoRoot, background }) {
  const warnings = [];
  const lemmas = [];
  const evidence = Array.isArray(ontology?.raw?.evidence) ? ontology.raw.evidence : [];
  const records = evidence.filter((record) => record?.kind === 'machine-certificate' && record.certificate);
  if (records.length === 0) return { lemmas, warnings };
  const lemmasMod = deps.lemmasModule ?? lazyModule('./lemmas.mjs');
  if (typeof lemmasMod?.closeCertificate !== 'function') {
    warnings.push(`${records.length} 份机器证书已登记，但 lemmas.mjs（closeCertificate）未装配：本轮没有可复用的闭引理。`);
    return { lemmas, warnings };
  }
  for (const record of records) {
    const loaded = loadCertificateFile(record.certificate, repoRoot);
    if (!loaded.ok) { warnings.push(`引理 ${record.id} 的证书读不到（${record.certificate}）：${loaded.reason}`); continue; }
    let closed;
    try {
      /*
       * **不传我们的 theory/sig**。
       *
       * 这些证书是自带理论的独立产物（`mcs-foundations/.../certificates/*.json`）：
       * 拿我们的背景去闭合，第一关就是 `undeclared base type: R / Y / Vec`——
       * 那是两套理论的口径差，不是证书的问题。闭合后的证明不带 `theory_sha256`，
       * 由 `assembleBundle` 按**当前 bundle 的理论**填写，于是三者天然一致。
       */
      closed = lemmasMod.closeCertificate(loaded.value, {});
    } catch (error) {
      warnings.push(`引理 ${record.id} 闭合时出错：${error.message}`);
      continue;
    }    if (closed?.ok !== true) {
      warnings.push(`引理 ${record.id} 未能闭合（${closed?.reason ?? '未知原因'}）：${closed?.message ?? ''}`.trim());
      continue;
    }
    /*
     * 另一套背景的证书不进本背景的引理表。
     *
     * bundle 只有一份理论：把「用到基类型 R」的限案例证书提供给 `bg:group/1` 下的搜索，
     * 引用它的步骤会被内核以 `undeclared base type: R` 拒掉——那不是证明错了，
     * 是材料不属于这套背景。这里按证书**自带理论**的基类型做一次包含判断，并如实说明。
     */
    const ownBases = new Set(loaded.value?.theory?.bases ?? []);
    const ourBases = new Set(sig?.bases ?? []);
    const foreign = [...ownBases].filter((base) => !ourBases.has(base));
    if (foreign.length) {
      warnings.push(`引理 ${record.id} 属于另一套背景（基类型 ${foreign.join('、')} 不在 ${background} 里）：本背景不提供它。`);
      continue;
    }
    /*
     * 去掉证书自带的 `theory_sha256` / `checker`。
     *
     * 它们是**那份证书原来的理论**的摘要；原样带进我们的 bundle 会覆盖
     * `assembleBundle` 填的当前理论摘要，检查器立刻以
     * `proof theory version/hash mismatch` 拒掉——而那不是证明错了，是元数据串了。
     * 去掉之后由 `assembleBundle` 按当前 bundle 的理论填，三者天然一致；
     * 步骤本身仍会被内核按当前理论**重新检查**（合不上就如实失败）。
     */
    const { theory_sha256: _ownTheory, checker: _ownChecker, ...proof } = closed.proof ?? {};
    lemmas.push({ id: record.id, conclusion: closed.conclusion, proofId: record.id, proof, certificate: record.certificate });
  }
  if (lemmas.length) warnings.push(`已闭合 ${lemmas.length} 份既有证书作为可复用引理（背景 ${background}）。`);
  return { lemmas, warnings };
}

function instanceVersion(ontology, nodeId) {
  const node = ontology?.maybeNode ? ontology.maybeNode(nodeId) : null;
  return node ? String(node.version ?? '1') : null;
}

function normalizeBudget(budget) {
  const merged = { ...DISCOVERY_BUDGET, ...(budget ?? {}) };
  const out = {};
  for (const key of Object.keys(DISCOVERY_BUDGET)) {
    const value = Number(merged[key]);
    out[key] = Number.isFinite(value) && value > 0 ? value : DISCOVERY_BUDGET[key];
  }
  return out;
}

/**
 * 背景的**唯一**解析入口（规格 §8.5.1 的背景口径）。
 *
 * 优先级：**显式请求 > 草稿声明的 `draft.spec.background` > 焦点 spec 的 background > 默认**。
 *
 * 为什么必须只有一个入口：`core/formal/discovery.mjs` 与 `server/api.mjs` 各写一套的话，
 * 迟早出现「api 认为用群背景、引擎按代数背景装配」这种两边都觉得自己对的分歧——
 * 结果就是候选全是 undecided，而错误现场在两边看都很正常。所以 api 也调这个函数。
 *
 * 返回 `{ id, source, raw, candidates }`：`source` 说清**是谁定的**（`request`/`draft`/
 * `focus`/`default`/`none`），界面与报告要能显示这一句，而不是只给一个背景 id。
 */
export function resolveBackground({ requested = null, draft = null, focusSpec = null, backgrounds = null } = {}) {
  const mod = backgrounds ?? lazyModule('./backgrounds.mjs');
  const normalize = (id) => (id && typeof mod?.normalizeBackgroundId === 'function' ? mod.normalizeBackgroundId(id) : id);
  const declared = draft?.spec?.background ?? draft?.background ?? null;
  const focus = focusSpec?.background ?? null;
  const fallback = mod?.DEFAULT_BACKGROUND ?? null;
  const usable = (id) => typeof id === 'string' && id.trim() !== '';
  const chain = [['request', requested], ['draft', declared], ['focus', focus], ['default', fallback]];
  const hit = chain.find(([, id]) => usable(id)) ?? null;
  return {
    id: hit ? normalize(hit[1]) : null,
    source: hit ? hit[0] : 'none',
    raw: hit ? hit[1] : null,
    candidates: { requested: requested ?? null, draft: declared, focus, default: fallback },
  };
}

/**
 * 装配「基础登记 + 当前扩展 + 本次草稿」的形式表达清单（任务 A）。
 *
 * 三种来源与**来源标记**：
 * - `base`：`registry.specs` + `registry.CONCEPT_SPECS`（人逐条登记并评审过的）；
 * - `extension`：当前本体快照里已发布扩展带进来的 `ontology.raw.formalSpecs`
 *   （`server/snapshot.mjs#composePackageOntology` 合成时就写在这个键上）；
 * - `draft`：**本次草稿的 spec**。
 *
 * 为什么草稿一定要进来：只把焦点节点 id 加进筛选、却不把草稿 spec 放进清单，
 * 「新节点」就没有可比的对手——候选生成阶段为零，任务照常报 completed。
 * 这条 bug 的表现是「完成、零候选」，看起来像「本来就没有关系」。
 *
 * 纪律：
 * - 草稿 spec 先过 `language.parseSpec` 归一；失败**如实进 warnings 并排除**，不静默丢；
 * - 草稿 node 用稳定 id（`spec.node ?? draft.node.id ?? draft.id`）；与已有节点撞名时
 *   **不覆盖**，只报 warnings —— 草稿不是「已经在公共网络里」的东西；
 * - 清单里每一条都带 `origin`，候选的端点会把它带出去（界面与发布靠它区分）。
 */
export function collectSpecInventory({
  registry = null, ontology = null, draft = null, specs = null,
  language = null, backgrounds = null, warnings = [],
} = {}) {
  const rows = [];
  const origins = new Map();
  const add = (spec, origin) => {
    const normalized = withStableNodeId(spec);
    if (!normalized || typeof normalized.node !== 'string' || !normalized.node) return false;
    const previous = origins.get(normalized.node);
    if (previous) {
      warnings.push(`形式表达 ${normalized.node} 重复（已有来源 ${previous}，本次来源 ${origin}）：保留先到的那一条，不覆盖。`);
      return false;
    }
    origins.set(normalized.node, origin);
    rows.push({ spec: normalized, origin, node: normalized.node });
    return true;
  };

  const explicit = Array.isArray(specs) && specs.length ? specs : null;
  if (explicit) {
    for (const spec of explicit) add(spec, 'base');
  } else {
    for (const spec of (Array.isArray(registry?.specs) ? registry.specs : [])) add(spec, 'base');
    for (const spec of (Array.isArray(registry?.CONCEPT_SPECS) ? registry.CONCEPT_SPECS : [])) add(spec, 'base');
  }

  const published = ontology?.raw?.formalSpecs ?? null;
  if (published && typeof published === 'object') {
    for (const [node, spec] of Object.entries(published)) {
      if (!spec || typeof spec !== 'object') continue;
      add({ ...spec, node: spec.node ?? node }, 'extension');
    }
  }

  let acceptedDraft = null;
  if (draft?.spec && typeof draft.spec === 'object') {
    const stableId = draft.spec.node ?? draft?.node?.id ?? draft?.id ?? null;
    if (typeof stableId !== 'string' || !stableId.trim()) {
      warnings.push('草稿带了形式表达，但既没有 spec.node 也没有 node.id / draft.id：无法给它一个稳定标识，本次不参与发现。');
    } else if (origins.has(stableId)) {
      warnings.push(`草稿节点 ${stableId} 与已登记节点（来源 ${origins.get(stableId)}）撞名：本次以已登记的为准，草稿不参与发现（草稿不等于已发布）。`);
    } else {
      const candidate = { ...draft.spec, node: stableId };
      const parse = typeof language?.parseSpec === 'function' ? language.parseSpec : null;
      if (!parse) {
        // 语言层没装配：仍然把草稿放进清单（判定器只读源码字符串），但把这件事说出来。
        warnings.push(`语言层未装配：草稿形式表达 ${stableId} 未做归一核对，本轮按原始登记参与发现。`);
        acceptedDraft = { spec: candidate, normalization: null };
      } else {
        try {
          /*
           * `strict: false`：草稿里允许带编辑器自己的展示字段；这里只关心
           * 「它能不能被归一成一份可用的形式表达」。真正的字段级严格检查在
           * `POST /formal/v1/…/validate`（`validateDraft`）那条路上。
           */
          const normalization = parse(candidate, {
            backgrounds: { backgroundTheory: backgrounds?.backgroundTheory },
            strict: false,
          });
          acceptedDraft = { spec: candidate, normalization };
        } catch (error) {
          // 归一失败：**排除，但留下痕迹**——静默丢掉会让「零候选」看起来像「本来就没有关系」。
          warnings.push(`草稿形式表达 ${stableId} 归一失败（本轮不参与发现）：${error.message}`);
        }
      }
    }
  }
  if (acceptedDraft) {
    origins.set(acceptedDraft.spec.node, 'draft');
    rows.push({ spec: acceptedDraft.spec, origin: 'draft', node: acceptedDraft.spec.node, normalization: acceptedDraft.normalization });
  }

  return {
    rows,
    allSpecs: rows.map((row) => row.spec),
    origins,
    draftSpec: acceptedDraft?.spec ?? null,
    draftNormalized: acceptedDraft?.normalization ?? null,
  };
}

/**
 * 发现编排（同步生成候选 + 可等待的异步结算）。
 *
 * 每一步都受预算约束：单候选超时 → 该候选 `timeout`；整批到点 → 立即返回
 * 已完成的部分 + `unprocessed` 计数。**超时不是数学结论**，候选的 math 保持 undecided。
 *
 * 返回值是**混合对象**：`{ candidates, stats }` 同步可用；`await` 它则等到
 * 机器检查（kernel 子进程）跑完，拿到就地补全的同一份结果。`signal`（AbortSignal）
 * 让调用方能在**候选边界**叫停——同步 JS 打断不了正在跑的那一段，但「不再往下跑」
 * 是可以做到的，取消时剩下的候选如实留在未处理/未决，不冒充已有结论。
 */
export function discoverRelations({
  ontology = null, registry = null, draft = null, nodeRef = null,
  budget = null, onCandidate = null, deps = null, kinds = RELATION_KINDS, specs = null,
  background = null, repoRoot = null, signal = null,
} = {}) {
  const startedAt = Date.now();
  const limits = normalizeBudget(budget);
  const engine = resolveEngine({ registry, ...(deps ?? {}) });
  const deadline = startedAt + limits.totalMs;
  const aborted = () => Boolean(signal?.aborted);
  // 证书与判定器都要仓库根：api 不传时按 core/ontology.mjs 的口径兜住。
  const resolvedRepoRoot = repoRoot ?? deps?.repoRoot ?? lazyModule('../ontology.mjs')?.REPO_ROOT ?? null;

  // 焦点：草稿节点或指定节点。没有焦点时退化成「全表扫描」（受 specs 数量上限约束）。
  const focus = new Set();
  if (nodeRef?.node) focus.add(String(nodeRef.node));
  // 草稿的稳定 id 与 `collectSpecInventory` 同一口径：spec.node 优先，其次 node.id / draft.id。
  const draftNodeId = draft?.spec?.node ?? draft?.node?.id ?? draft?.id ?? null;
  if (typeof draftNodeId === 'string' && draftNodeId) focus.add(draftNodeId);

  const warnings = [];
  const assembled = assembleEngineContext({
    registry, engine, deps: deps ?? {}, specs, focus, draft,
    background, backgroundId: deps?.background ?? null, repoRoot: resolvedRepoRoot, budget: limits, ontology,
  });
  warnings.push(...assembled.warnings);
  const ctx = { ...assembled.ctx, ontology };
  const allSpecs = assembled.allSpecs;
  const origins = assembled.origins ?? new Map();
  const focusSpecs = focus.size ? allSpecs.filter((spec) => focus.has(spec.node)) : [];
  const scanSpecs = focusSpecs.length ? focusSpecs : allSpecs.slice(0, 120);

  /*
   * 端点来源标记：`draft` / `extension` / `base`（外加 `unregistered`）。
   *
   * 界面与发布都要靠它区分「这条候选的另一端还只是草稿」——没有这个标记，
   * 一条指向未发布节点的候选看起来和已发布的关系一模一样。
   */
  const withOrigin = (end) => {
    if (!end || typeof end.node !== 'string') return end;
    const declared = origins.get(end.node);
    if (declared) return { ...end, origin: declared };
    const known = Boolean(ontology?.maybeNode?.(end.node));
    return { ...end, origin: known ? 'base' : 'unregistered' };
  };

  let shapes = [];
  try {
    // 有焦点时还要看「别的节点指向焦点」的候选：只跑焦点自己的 spec 会漏掉指向它的关系。
    const wide = focus.size && allSpecs.length !== scanSpecs.length ? allSpecs.slice(0, 120) : scanSpecs;
    const collected = collectCandidates(ctx, { kinds, specs: wide });
    shapes = collected.candidates;
    warnings.push(...collected.warnings);
  } catch (error) {
    warnings.push(`候选生成失败：${error.message}`);
  }
  shapes = shapes.map((shape) => ({ ...shape, from: withOrigin(shape.from), to: withOrigin(shape.to) }));
  if (focus.size) shapes = shapes.filter((item) => focus.has(item.from?.node) || focus.has(item.to?.node));

  // 去重：同一 kind + 同一对端点 + 同一目标只留一条。
  const seen = new Map();
  for (const shape of shapes) {
    const key = sha256({ kind: shape.kind, from: shape.from, to: shape.to, symbol: shape.symbol ?? null, model: shape.model ?? null, goal: shape.goal?.source ?? null });
    if (seen.has(key)) continue;
    seen.set(key, shape);
  }
  const unique = [...seen.values()];
  const capped = unique.slice(0, limits.maxCandidates);
  const unprocessed = Math.max(0, unique.length - capped.length);

  const judges = judgeIndex(engine, kinds);
  const candidates = [];
  const covered = new Set();
  let checkerSha256 = null;
  const generalizationPairs = new Map();
  /** 判定还在异步跑的候选：结算时按同一套规则就地补结论。 */
  const pending = [];
  let timedOut = 0;
  let cancelled = 0;

  for (const shape of capped) {
    const candidateId = `cand:${shape.kind}:${sha256({ kind: shape.kind, from: shape.from, to: shape.to, symbol: shape.symbol ?? null, model: shape.model ?? null, goal: shape.goal?.source ?? null }).slice(0, 12)}`;
    const budgetLeft = Math.min(limits.perCandidateMs, deadline - Date.now());
    const base = {
      id: candidateId,
      runId: null,                                    // 入库后由编写库按任务回填
      kind: shape.kind,
      from: shape.from,
      to: shape.to,
      direction: shape.direction ?? null,
      conditions: shape.conditions ?? [],
      goal: shape.goal ?? null,
      reason: shape.reason ?? '',
      review: 'pending',
      generatorVersion: GENERATOR_VERSION,
      inputHash: `sha256:${sha256({ ontology: ontology?.version ?? null, from: shape.from, to: shape.to, kind: shape.kind, goal: shape.goal?.source ?? null })}`,
      replay: null,
      counterexample: null,
      evidence: null,
      math: { status: 'undecided', reason: '', scope: '' },
      run: { status: 'completed', reason: '', stats: {} },
    };

    if (aborted()) {
      /*
       * 取消只在**候选边界**生效：正在跑的那一段同步 JS 打断不了，
       * 但「不再往下跑」必须做到。剩下的候选如实标未处理，不冒充已有结论。
       */
      candidates.push({
        ...base,
        pendingCheck: false,
        math: { status: 'undecided', reason: '任务已取消，本候选未处理。', scope: '' },
        run: { status: 'cancelled', reason: '任务已取消。', stats: { durationMs: 0 } },
      });
      covered.add(shape.from?.node); covered.add(shape.to?.node);
      cancelled += 1;
      continue;
    }

    if (budgetLeft <= 0) {
      // 整批到点：剩下的候选原样标 timeout，**不当作数学反驳**。
      candidates.push({
        ...base,
        math: { status: 'undecided', reason: '整批预算耗尽，本候选未处理。', scope: '' },
        run: { status: 'timeout', reason: '整批预算耗尽。', stats: { durationMs: 0 } },
      });
      covered.add(shape.from?.node); covered.add(shape.to?.node);
      timedOut += 1;
      continue;
    }

    const confirmation = confirmShape(judges.get(shape.kind), shape, { ...ctx, budget: { ...limits, perCandidateMs: budgetLeft } });
    /*
     * 确认环节说不清楚的事必须浮出来。
     *
     * 「暂时搜不到」（undecided）是允许的；「因为上下文没装配所以搜不到」不允许——
     * 两者在候选上长得一样（都是 undecided），区别只能靠这条警告带出来。
     */
    if (confirmation?.status === 'unsupported' && confirmation.reason) {
      warnings.push(`候选 ${candidateId}（${shape.kind}）：${confirmation.reason}`);
    }
    const candidate = { ...base };
    applyConfirmation(candidate, confirmation, engine, shape, ctx);
    if (confirmation?.status === 'pending') {
      // 判定还在跑：留个标记，异步结算时按同一套规则就地补上。
      candidate.pendingCheck = true;
      pending.push({ candidate, confirmation, shape, ctx });
    }
    if (candidate.evidence && confirmation?.check?.checkerSha256) checkerSha256 = confirmation.check.checkerSha256;
    /*
     * `hardGeneralization` 的方向约定：同一对概念的**反向读法**不产生第二份证据。
     * 第一个证出来的方向照常入库；之后出现的同对候选标记为「读法」并自动置为
     * dismissed（人还能在审阅里看到它，但它不会作为第二条关系被发布）。
     */
    if (candidate.kind === 'hardGeneralization' && candidate.math.status === 'verified') {
      const pair = [candidate.from?.node, candidate.to?.node].sort().join('|');
      const first = generalizationPairs.get(pair);
      if (first) {
        candidate.duplicateOf = first;
        candidate.review = 'dismissed';
        candidate.reason = `${candidate.reason}（反向读法：同一对概念只保留一份证据，见 ${first}）`;
      } else {
        generalizationPairs.set(pair, candidate.id);
      }
    }

    candidates.push(candidate);
    covered.add(candidate.from?.node);
    covered.add(candidate.to?.node);
    if (typeof onCandidate === 'function') {
      try { onCandidate(candidate); } catch (error) { warnings.push(`onCandidate 回调出错：${error.message}`); }
    }
  }

  const durationMs = Date.now() - startedAt;
  /*
   * 预算的诚实口径。
   *
   * 同步 JS **打断不了正在跑的一段代码**：`search` 的 `maxMs` 只在它自己的检查点生效，
   * 而整批时限只能在**候选之间**检查。所以「预算 30 秒、实际跑了 100 秒」是可能出现的，
   * 这时必须把话说出来——不能让「预算 30 秒」孤零零地挂在耗时 100 秒的结果旁边。
   */
  const overBudget = durationMs > limits.totalMs;
  if (overBudget || timedOut > 0) {
    warnings.push(`整批时限 ${limits.totalMs} ms 只在**候选之间**检查（同步路径无法中断单个候选），`
      + `实际耗时 ${durationMs} ms；超时未处理的候选 ${timedOut} 条已标 timeout（不是数学反驳）。`);
  }
  if (unprocessed > 0) {
    warnings.push(`候选上限 ${limits.maxCandidates} 条已截断：${unprocessed} 条未处理（保留已完成结果）。`);
  }
  const stats = {
    candidates: candidates.length,
    coveredNodes: [...covered].filter(Boolean).length,
    durationMs,
    verified: candidates.filter((item) => item.math.status === 'verified').length,
    refuted: candidates.filter((item) => item.math.status === 'refuted').length,
    undecided: candidates.filter((item) => item.math.status === 'undecided').length,
    unprocessed,
    timedOut,
    cancelled,
    aborted: aborted(),
    background: assembled.background,
    backgroundSource: assembled.backgroundSource,
    pendingChecks: pending.length,
    // 预算口径自述：单候选不可中断，只能在候选边界检查。
    budget: { ...limits, interruptible: false, overBudget },
    runVersion: RUN_VERSION,
    generatorVersion: GENERATOR_VERSION,
    checkerSha256: checkerSha256 ?? (typeof engine.kernel?.kernelFileHash === 'function' ? engine.kernel.kernelFileHash() : null),
    engineReady: {
      search: Boolean(engine.search), certificate: Boolean(engine.certificate),
      kernel: Boolean(engine.kernel), finite: Boolean(engine.finite),
    },
    warnings: [...new Set(warnings)],
  };
  const result = { candidates, stats };

  /*
   * 结算：把还在跑的异步判定收回来，**就地**更新候选与统计。
   *
   * 返回值因此是一个「混合对象」：同步字段（`candidates` / `stats`）立刻可用——
   * `server/api.mjs` 的 `POST /relation-discovery/jobs` 就是同步取这两个字段的；
   * 同时它是个 thenable，`await` 它就等到机器检查跑完，拿到补全后的同一份结果。
   * 这样「同步接口不阻塞」与「检查真的跑了」不用二选一。
   *
   * **整批上限对结算照样生效**：`api.mjs` 现在 `await` 这个 thenable，如果结算无上限，
   * 一个请求就可能挂过 Node 的 requestTimeout（默认 300 秒）。所以结算同样受
   * `totalMs` 约束：到点就把剩下的候选原样留在 `pendingCheck`，并如实写出还剩几条，
   * 让调用方稍后走重放——不假装它们已经有结论。
   */
  const settleDeadline = Date.now() + limits.totalMs;
  const settle = (async () => {
    for (const task of pending) {
      if (aborted()) {
        stats.settleCancelled = pending.filter((item) => item.candidate.pendingCheck).length;
        stats.warnings.push(`任务在结算途中被取消：还有 ${stats.settleCancelled} 条候选的机器检查没有回收（已完成的候选结果保留，未完成的不作数学结论）。`);
        break;
      }
      if (Date.now() > settleDeadline) {
        stats.settleTimedOut = pending.filter((item) => item.candidate.pendingCheck).length;
        stats.settleStatus = 'timedOut';
        stats.warnings.push(`结算超过整批上限 ${limits.totalMs} ms：还有 ${stats.settleTimedOut} 条候选的机器检查未完成（已标 pendingCheck，可稍后重放）。`);
        break;
      }
      let confirmation;
      try {
        confirmation = await task.confirmation.promise;
      } catch (error) {
        task.candidate.pendingCheck = false;
        task.candidate.math = { status: 'undecided', reason: `异步判定失败：${error.message}`, scope: '' };
        task.candidate.run = { status: 'error', reason: error.message, stats: {} };
        stats.warnings.push(`候选 ${task.candidate.id}（${task.shape.kind}）异步判定失败：${error.message}`);
        continue;
      }
      applyConfirmation(task.candidate, confirmation, engine, task.shape, task.ctx ?? {});
      task.candidate.pendingCheck = false;
      if (confirmation?.status === 'unsupported' && confirmation.reason) {
        stats.warnings.push(`候选 ${task.candidate.id}（${task.shape.kind}）：${confirmation.reason}`);
      }
      if (confirmation?.check?.checkerSha256) stats.checkerSha256 = confirmation.check.checkerSha256;
      if (typeof onCandidate === 'function') {
        try { onCandidate(task.candidate); } catch { /* 回调出错不影响结算 */ }
      }
    }
    stats.pendingChecks = candidates.filter((item) => item.pendingCheck).length;
    stats.durationMs = Date.now() - startedAt;
    stats.overBudget = stats.durationMs > limits.totalMs;
    stats.verified = candidates.filter((item) => item.math.status === 'verified').length;
    stats.refuted = candidates.filter((item) => item.math.status === 'refuted').length;
    stats.undecided = candidates.filter((item) => item.math.status === 'undecided').length;
    stats.cancelled = candidates.filter((item) => item.run?.status === 'cancelled').length;
    stats.aborted = aborted();
    stats.warnings = [...new Set(stats.warnings)];
    return result;
  })();

  return Object.assign(settle.catch(() => result), result);
}

/**
 * 把一个确认结果**就地**写回候选。
 *
 * 同步路径与异步结算走的是同一个函数：两条路各写一份赋值，
 * 迟早出现「同步跑出来是 A、结算跑出来是 B」的分歧。
 */
function applyConfirmation(candidate, confirmation, engine, shape, ctx = {}) {
  const verdict = mathFromConfirmation(confirmation, engine, {
    goal: candidate.goal,
    spec: specForId({ specs: ctx.specs ?? [] }, candidate.to?.node),
    theory: ctx.theory,
    nodeVersions: { [candidate.from?.node]: candidate.from?.version, [candidate.to?.node]: candidate.to?.version },
  });
  candidate.math = { ...verdict.math, reason: verdict.math.reason || confirmation?.reason || '' };
  candidate.run = { ...verdict.run };
  candidate.label = verdict.label;
  candidate.notes = verdict.notes;
  candidate.counterexample = verdict.counterexample
    ? {
      model: verdict.counterexample.model ?? shape?.model ?? null,
      assignment: verdict.counterexample.assignment ?? {},
      note: verdict.counterexample.note ?? '有限反模型。',
    }
    : null;
  candidate.evidence = verdict.evidence
    ? {
      ...verdict.evidence,
      id: `ev:${candidate.id}`,
      title: verdict.evidence.title || candidate.reason,
      nodes: [candidate.from?.node, candidate.to?.node].filter(Boolean),
    }
    : null;
  candidate.replay = confirmation?.check
    ? { status: confirmation.check.status, at: new Date().toISOString(), durationMs: confirmation.check.durationMs ?? 0 }
    : candidate.replay;
  return candidate;
}

/**
 * 调用判定器的 confirm。
 *
 * 判定器可能是异步的——真检查器要起子进程，那一步**本质上**不是同步能等的。
 * `server/api.mjs` 的 `POST /relation-discovery/jobs` 又是按同步调用写的，
 * 所以这里区分两种情形：
 * - 同步拿到结果：照常判定；
 * - 拿到 Promise：先如实标 `pending`（不猜结果），把它挂进结算队列，
 *   `discoverRelations` 返回的混合对象会在异步结算后**就地**补上真正的判定。
 *
 * 「先给未决、后补结论」与「假装跑过了」是两回事：前者在候选上留 `pendingCheck`，
 * 界面能显示「机器检查进行中」。
 */
function confirmShape(judge, shape, ctx) {
  if (!judge || typeof judge.confirm !== 'function') {
    return { status: 'unsupported', reason: `没有 ${shape.kind} 的判定器。` };
  }
  try {
    const result = judge.confirm(shape, ctx);
    if (result && typeof result.then === 'function') {
      return {
        status: 'pending',
        promise: result,
        reason: '判定器是异步的（机器检查要起子进程）；同步发现阶段先记未决，异步结算会补上结果。',
      };
    }
    return result ?? { status: 'undecided', reason: '判定器没有返回结果。' };
  } catch (error) {
    return { status: 'unsupported', reason: `判定器执行出错：${error.message}` };
  }
}

/* ---------------------------------------------------------------- 重放 */

/**
 * 重放选定结果（async）。
 *
 * 重放**不是把上次的结论再念一遍**：它从当前本体快照重新生成目标、重新跑判定器与检查器。
 * 相关输入（本体版本、登记版本、证书、检查器文件）任一改变，旧结果即失效并标 `stale`。
 */
export async function replayCandidate({ candidate, registry = null, ontology = null, repoRoot = null, deps = null, kinds = RELATION_KINDS } = {}) {
  const startedAt = Date.now();
  const problems = [];
  if (!candidate || typeof candidate !== 'object') {
    return { candidate: null, check: null, ok: false, problems: ['重放需要一个候选对象。'] };
  }
  const engine = resolveEngine({ registry, ...(deps ?? {}) });
  const next = { ...candidate };
  const warnings = [];

  /*
   * 1) 版本核对：候选记录的端点版本必须与当前本体一致。
   *
   * 「端点还不在本体里」是**正常状态**，不是失效：草稿节点在发布之前本来就不在本体里，
   * 而重放恰恰是发布前那一步。这类端点没有可比对的版本，记一条说明即可；
   * 真正的把关在别处——目标重算（登记表里还有没有这条形状）与发布事务的端点解析检查。
   */
  for (const end of [candidate.from, candidate.to]) {
    if (!end?.node) continue;
    if (String(end.node).startsWith('finite:')) continue;      // 有限对象不进本体节点表
    const current = instanceVersion(ontology, end.node);
    if (current === null) {
      warnings.push(`端点节点 ${end.node} 还不在当前本体里（草稿端点或已停用）；本轮不对它做版本比对。`);
      next.endpointNotPublished = true;
    } else if (current !== String(end.version ?? '1')) {
      problems.push(`端点节点 ${end.node} 的版本已变化：候选为 ${end.version}，当前为 ${current}。`);
      next.review = 'stale';
    }
  }

  // 2) 重新生成目标：从当前登记表里重新找到对应的候选形状，不接受候选自带的源码字符串。
  const focus = new Set([candidate.from?.node, candidate.to?.node].filter(Boolean));
  const assembled = assembleEngineContext({
    registry, engine, deps: deps ?? {}, specs: deps?.specs ?? null, focus,
    background: deps?.background ?? null, repoRoot: repoRoot ?? deps?.repoRoot ?? lazyModule('../ontology.mjs')?.REPO_ROOT ?? null, budget: DISCOVERY_BUDGET, ontology,
  });
  warnings.push(...assembled.warnings);
  const ctx = { ...assembled.ctx, ontology };
  let shape = null;
  try {
    const collected = collectCandidates(ctx, { kinds: [candidate.kind], specs: assembled.allSpecs });
    const shapes = collected.candidates;
    warnings.push(...collected.warnings);
    shape = shapes.find((item) => item.from?.node === candidate.from?.node && item.to?.node === candidate.to?.node
      && (item.symbol ?? null) === (candidate.symbol ?? null) && (item.model ?? null) === (candidate.model ?? null))
      ?? shapes.find((item) => item.from?.node === candidate.from?.node && item.to?.node === candidate.to?.node)
      ?? null;
  } catch (error) {
    problems.push(`目标重算失败：${error.message}`);
  }
  if (!shape) {
    problems.push('当前登记表里找不到对应的候选形状（登记或版本已变化）。');
    next.review = 'stale';
  } else {
    next.goal = shape.goal ?? next.goal;
    next.conditions = shape.conditions ?? next.conditions;
    next.reason = shape.reason ?? next.reason;
    next.direction = shape.direction ?? next.direction;
  }

  // 3) 重跑判定器（这里可以等异步结果）。
  let confirmation = { status: 'undecided', reason: '没有可用的判定器。' };
  if (shape && RELATION_KINDS.includes(candidate.kind)) {
    const judge = judgeIndex(engine, [candidate.kind]).get(candidate.kind);
    try {
      confirmation = (await judge.confirm(shape, ctx)) ?? confirmation;
    } catch (error) {
      confirmation = { status: 'unsupported', reason: `判定器执行出错：${error.message}` };
    }
  } else if (shape) {
    confirmation = { status: 'unsupported', reason: `未知的关系类型：${candidate.kind}` };
  }

  // 4) 判定与证据重建。
  const previousMath = candidate.math?.status ?? 'undecided';
  const verdict = mathFromConfirmation(confirmation, engine, {
    goal: next.goal,
    spec: specForId({ specs: ctx.specs ?? [] }, candidate.to?.node),
    theory: ctx.theory,
    nodeVersions: { [candidate.from?.node]: candidate.from?.version, [candidate.to?.node]: candidate.to?.version },
  });
  next.math = { ...verdict.math, reason: verdict.math.reason || confirmation.reason || '' };
  next.run = { ...verdict.run, reason: verdict.run.reason || confirmation.reason || '', stats: { ...(verdict.run.stats ?? {}), durationMs: Date.now() - startedAt } };
  next.label = verdict.label;
  next.notes = verdict.notes ?? [];
  next.evidence = verdict.evidence
    ? { ...verdict.evidence, id: `ev:${candidate.id}`, title: verdict.evidence.title || next.reason, nodes: [candidate.from?.node, candidate.to?.node].filter(Boolean) }
    : null;
  next.counterexample = verdict.counterexample
    ? { model: verdict.counterexample.model, assignment: verdict.counterexample.assignment ?? {}, note: verdict.counterexample.note ?? '' }
    : null;

  const check = confirmation?.check ?? null;
  const decided = next.math.status === 'verified' || next.math.status === 'refuted';
  /*
   * 异步判定器还没回收时 `confirmation.status === 'pending'`：数学状态停在 `undecided`，
   * 但下面那个析取支（`previousMath === 'undecided' && 本轮仍 undecided`）会成立，
   * 于是 `ok: true` 报出去——**这一次重放一次内核检查都没跑**。
   * 这与 `ok` 自己的契约（"重放真的重新得出了结论"）直接冲突，所以先排除 pending。
   */
  const pending = confirmation?.status === 'pending';
  /*
   * `ok` 的含义：**重放真的在当前登记与当前本体下重新得出了结论**。
   * - 版本/登记对不上 → false，并标 stale；
   * - 需要证书的那类必须拿到 passed 的检查结果；
   * - 上一轮是 verified/refuted、这一轮退回 undecided → 也算 false（结论没有复现）。
   */
  const ok = problems.length === 0 && !pending
    && (decided || (previousMath === 'undecided' && next.math.status === 'undecided' && confirmation.status !== 'unsupported'));
  if (pending) problems.push('判定仍在进行中：这次重放还没有得出任何结论，不能算复现。');
  if (!decided && previousMath !== 'undecided') problems.push(`上一轮的结论是 ${previousMath}，这一轮重放没有得到同样的结论。`);
  if (confirmation.status === 'unsupported') problems.push(confirmation.reason ?? '本轮没有可用的判定引擎。');

  next.replay = { status: check?.status ?? 'not_run', at: new Date().toISOString(), durationMs: Date.now() - startedAt };
  return { candidate: next, check, ok, problems, warnings, replayed: true };
}

export { RELATION_KINDS };
