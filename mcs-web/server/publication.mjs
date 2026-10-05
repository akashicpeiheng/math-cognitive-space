/**
 * 发布事务：六步入库、回滚、幂等（规格 §6）。
 *
 * ## 一条贯穿全文的原则：预览与提交共用同一段差异计算
 *
 * `previewPublication` 与 `commitPublication` 都从 `buildChangeSet` 取结果。
 * 它们唯一的区别是**提交多做三件事**：重放证据（第 2 步）、落盘（第 4 步）、
 * 切指针（第 5 步）。如果预览另写一套「大概会加什么」的估算，
 * 预览就不再是承诺，而是一句广告。
 *
 * ## 失败语义（写死在流程里）
 *
 * 六步里任何一步失败，都要满足「**原版本继续生效**」：
 *
 * | 步 | 失败时系统里发生了什么 |
 * |---|---|
 * | 1 固定清单 / 版本核对 | 什么都没写 |
 * | 2 重放证据 | 什么都没写 |
 * | 3 隔离区合成 | 只写了暂存目录（在 runtime/ 下），公共本体没动 |
 * | 4 写内容包 | 多了一个没被激活的包；active.json 没动 |
 * | 5 切 active.json | 原子 rename，要么旧要么新，没有中间态 |
 * | 6 更新快照 | **回退指针**并抛错：既然新版本没被真正接管，就不该留在生效位上 |
 *
 * ## 幂等
 *
 * 两层：
 * 1. `idempotencyKey` 存在就返回同一条记录（键复用在不同请求上直接 409）；
 * 2. 没有键时按**请求指纹**（草稿修订 + 基线指纹 + 选中/驳回清单 + 审阅摘要）判定：
 *    当前生效版本就是这次请求的产物 → 直接返回它。同一份内容不会写出第二个包。
 */

import { mkdir, rm, readFile as readFileAsync } from 'node:fs/promises';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve, sep, isAbsolute } from 'node:path';
import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import { McsError, CODES } from '../shared/errors.mjs';
import { assert, canonicalString, CONSTRUCTS, ROLES, EVIDENCE_STATUS } from '../shared/contracts.mjs';
import { FIELD_IDS } from '../data/fields.mjs';
import { GRANULARITY_VALUES, GRANULARITY_CONSTRUCTS, isTopicTitle } from '../data/granularity.mjs';
import { sha256, bytesHash } from '../core/hash.mjs';
import { baseFingerprint, createOntologySource } from './snapshot.mjs';
import { assertDeclarativeData } from './authoring-db.mjs';
import * as extensions from './extensions.mjs';

/** 六步的名字：接口与界面都按这份清单展示进度，不各自造一套说法。 */
export const PUBLICATION_STEPS = Object.freeze([
  { index: 1, id: 'freeze', title: '固定待发布清单并核对草稿修订、本体版本与背景版本' },
  { index: 2, id: 'replay', title: '重放选定证据，重新生成关系目标并核对假设' },
  { index: 3, id: 'compose', title: '隔离区合成候选本体，跑形成检查与引用封闭' },
  { index: 4, id: 'write', title: '写入不可变内容包并回读核对哈希' },
  { index: 5, id: 'activate', title: '单写入锁下复核当前版本，原子切换激活索引' },
  { index: 6, id: 'reload', title: '更新服务端本体快照并返回新增入口' },
]);

/** 找不到本体源时的兜底快照缓存：`ctx.ontologySource` 允许为 null（api 明确如此传）。 */
const fallbackSources = new Map();

async function resolveSource(ctx) {
  if (ctx?.ontologySource) return ctx.ontologySource;
  const key = `${resolve(ctx.dataDir)}|${ctx.extensionsDir ? resolve(ctx.extensionsDir) : ''}`;
  if (!fallbackSources.has(key)) {
    fallbackSources.set(key, await createOntologySource({
      dataDir: ctx.dataDir,
      extensionsDir: ctx.extensionsDir ?? null,
      repoRoot: ctx.config?.repoRoot ?? null,
    }));
  }
  return fallbackSources.get(key);
}

/** 运行期目录（暂存、锁文件）：跟着编写库走，绝不在 data/ 下乱写。 */
function runtimeRoot(ctx) {
  const config = ctx?.config ?? {};
  const anchor = config.authoringDbFile ?? config.dbFile;
  if (anchor) return dirname(resolve(anchor));
  return resolve(ctx.dataDir, '..', 'runtime');
}

function extensionTarget(ctx) {
  return { dataDir: ctx.dataDir, extensionsDir: ctx.extensionsDir ?? null };
}

/* ------------------------------------------------------------------ 写入锁 */

const lockChains = new Map();

/**
 * 单写入锁：进程内串行 + 一个咨询性锁文件。
 *
 * 进程内那半是必须的（同一个 Node 进程里的两个并发请求真会同时进来）；
 * 锁文件那半是给「另开了一个进程」的兜底——本机维护模式下确实可能开着两个窗口。
 * 锁文件带时间戳，超过 60 秒视为残留（进程被杀不会执行 finally）。
 */
async function withWriteLock(ctx, fn) {
  const key = resolve(extensions.extensionsRoot(extensionTarget(ctx)));
  const previous = lockChains.get(key) ?? Promise.resolve();
  let release;
  const gate = new Promise((resolveGate) => { release = resolveGate; });
  const queued = previous.then(() => gate);
  lockChains.set(key, queued);

  await previous.catch(() => {});
  const lockFile = join(runtimeRoot(ctx), 'publication.lock');
  await mkdir(dirname(lockFile), { recursive: true });
  let handle = null;
  try {
    handle = await acquireLockFile(lockFile);
    return await fn();
  } finally {
    if (handle) await handle.close().catch(() => {});
    await rm(lockFile, { force: true }).catch(() => {});
    release();
    // 只要队尾还是自己就把这条链摘掉，避免 Map 无限增长。
    if (lockChains.get(key) === queued) lockChains.delete(key);
  }
}

async function acquireLockFile(lockFile) {
  const { open, unlink } = await import('node:fs/promises');
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const handle = await open(lockFile, 'wx');
      await handle.writeFile(JSON.stringify({ pid: process.pid, at: new Date().toISOString() }), 'utf8').catch(() => {});
      return handle;
    } catch (error) {
      if (error.code !== 'EEXIST') throw new McsError(CODES.INTERNAL, `无法建立发布锁：${error.message}`, 500, { lockFile });
      const info = await statSafe(lockFile);
      const age = info ? Date.now() - info.mtimeMs : Number.POSITIVE_INFINITY;
      if (age > 60000) { await unlink(lockFile).catch(() => {}); continue; }   // 残留锁：清掉再试一次
      throw new McsError(CODES.CONFLICT, '另一个发布正在进行；同一时刻只允许一个写入口。', 409, { lockFile });
    }
  }
  throw new McsError(CODES.CONFLICT, '发布锁不可用', 409, { lockFile });
}

async function statSafe(path) {
  try {
    const { stat } = await import('node:fs/promises');
    return await stat(path);
  } catch {
    return null;
  }
}

/* -------------------------------------------------------------- 请求形状 */

function normaliseIdList(value, name) {
  if (value === undefined || value === null) return [];
  assert(Array.isArray(value), CODES.BAD_REQUEST, `${name} 必须是字符串数组`);
  const list = [];
  for (const item of value) {
    assert(typeof item === 'string' && item.trim().length > 0, CODES.BAD_REQUEST, `${name} 含空引用`);
    list.push(item.trim());
  }
  return [...new Set(list)];
}

function fingerprintOf(parts) {
  return `sha256:${sha256(parts)}`;
}

/**
 * 请求指纹：**只用请求本身能提供的字段**算，不必先跑完整差异计算。
 *
 * 这一点很要紧：重复提交时本体版本已经变了（上一次发布切了版本），
 * 若等到 `buildChangeSet` 里才发现「这是同一份请求」，就会被版本检查先挡成 409——
 * 而规格 §6 要求「重复提交同一发布请求返回同一结果」。所以指纹要先算、先比。
 */
export function earlyRequestFingerprint({ draftId, draftRevision, baseline, acceptedCandidateIds = [], dismissedCandidateIds = [], reviewDigest = null }) {
  return fingerprintOf({
    draftId, draftRevision, baseline, acceptedCandidateIds, dismissedCandidateIds, reviewDigest,
  });
}

/** 从请求本身算指纹（不碰编写库）：幂等命中时要拿它核对「是不是同一次请求」。 */
function fingerprintFromRequest(request, baseline) {
  return earlyRequestFingerprint({
    draftId: request.draftId,
    draftRevision: request.draftRevision,
    baseline,
    acceptedCandidateIds: normaliseIdList(request.acceptedCandidateIds, 'acceptedCandidateIds'),
    dismissedCandidateIds: normaliseIdList(request.dismissedCandidateIds, 'dismissedCandidateIds'),
    reviewDigest: typeof request.reviewDigest === 'string' && request.reviewDigest.trim() ? request.reviewDigest.trim() : null,
  });
}

/**
 * 幂等命中。
 *
 * 命中不等于「无条件复用」：同一把键若落在**另一份请求**上（改了草稿修订、换了选中清单、
 * 换了评阅摘要），那说明调用方把键复用错了——必须 409 报出来，不能把旧结果当成新结果返回。
 */
function reusePublication(existing, key, fingerprint) {
  if (existing.requestDigest && existing.requestDigest !== fingerprint) {
    throw new McsError(CODES.CONFLICT,
      `幂等键已用于另一次发布请求：${key}；请换一把键，或改用与上次完全相同的请求。`, 409,
      { idempotency_key: key, existing: existing.id, expected: existing.requestDigest, received: fingerprint });
  }
  return { ...(existing.result ?? {}), idempotent: true, idempotencyKey: key };
}

/* --------------------------------------------------------- 差异计算（共用） */

/**
 * 候选 → 可发布 / 待证 / 只留审阅。
 *
 * 判据只有一条：**这条候选有没有一份能核对的正面结果**。
 * - `verified` + 证据 → 可发布（PROOF）；
 * - `counterexampleTo` + `refuted` + 反例模型 → 可发布（FINITE，反例就是结果本身）；
 * - 其余（含被反驳的正向断言）→ 不进公共网络：未决的留「待证」，被反驳的只留审阅。
 */
export function classifyCandidate(candidate) {
  const math = candidate?.math?.status ?? 'undecided';
  const kind = candidate?.kind;
  if (kind === 'counterexampleTo') {
    if (math === 'refuted' && candidate?.counterexample?.model) {
      return { publishable: true, evidenceKind: 'counterexample', status: 'FINITE', verificationStatus: 'refuted', label: 'FINITE' };
    }
    if (math === 'verified' && candidate?.evidence) {
      return { publishable: true, evidenceKind: 'finite-check', status: 'FINITE', verificationStatus: 'verified', label: 'FINITE' };
    }
    return { pending: true, reason: '尚未找到反例，不能作为「反例关系」入库。' };
  }
  if (math === 'verified' && candidate?.evidence) {
    return {
      publishable: true,
      evidenceKind: kind === 'definitionReference' ? 'reference' : 'machine-certificate',
      status: kind === 'definitionReference' ? 'DEF' : 'PROOF',
      verificationStatus: 'verified',
      label: kind === 'definitionReference' ? 'DEF' : 'PROOF',
    };
  }
  if (math === 'refuted') return { refused: true, reason: '这条关系已被反驳，只保留在审阅记录里。' };
  return { pending: true, reason: '尚未通过机器检查，保留「待证」状态。' };
}

function relationFromCandidate(candidate, { evidenceId, verdict, from, to }) {
  const base = {
    id: `rel:${candidate.id}`,
    kind: candidate.kind,
    from: from.node,
    to: to.node,
    version: '1',
    /*
     * witness.type 用已有的两种受检类型，而不是新造一种：
     * `core/ontology.mjs` 的校验器对 `definitional-dependency` 与 `proof-dependency`
     * 有硬要求（后者必须能核到证据与两端节点）。沿用它，扩展内容就自动落进同一套检查。
     */
    witness: verdict.evidenceKind === 'reference'
      ? { type: 'definitional-dependency', status: 'DEF', scope: candidate.math?.scope ?? null }
      : { type: 'proof-dependency', ref: evidenceId, status: verdict.status },
    scope: candidate.math?.scope ?? null,
    // 规格 §7：关系新增可选字段，旧字段原样保留。
    evidenceRef: verdict.evidenceKind === 'reference' ? null : evidenceId,
    origin: 'auto-discovery',
    verificationStatus: verdict.verificationStatus,
    candidateId: candidate.id,
    candidateNote: candidate.reason ?? '',
    goal: candidate.goal ?? null,
    conditions: candidate.conditions ?? [],
    direction: candidate.direction ?? null,
  };
  return base;
}

function evidenceFromCandidate(candidate, { verdict, evidenceId, certificate }) {
  const nodes = [candidate.from?.node, candidate.to?.node].filter(Boolean);
  const record = {
    id: evidenceId,
    kind: verdict.evidenceKind === 'reference' ? 'reference' : verdict.evidenceKind,
    status: verdict.status,
    checkStatus: verdict.evidenceKind === 'reference' ? 'not_run' : 'passed',
    title: `自动发现：${candidate.kind}（${candidate.from?.node ?? '?'} → ${candidate.to?.node ?? '?'}）`,
    scope: candidate.math?.scope ?? '',
    nodes: [...new Set(nodes)],
    origin: 'auto-discovery',
    candidateId: candidate.id,
    usedAxioms: candidate.evidence?.usedAxioms ?? [],
    openAssumptions: candidate.evidence?.openAssumptions ?? [],
    dependsOn: candidate.evidence?.dependsOn ?? [],
  };
  if (certificate) {
    /*
     * 包里记的是**包内相对路径**（`certificates/…`），不是仓库相对路径。
     *
     * 仓库路径里含 revisionId，而 revisionId 由内容哈希派生——哈希里若含路径就成环了。
     * 于是分工是：包体存 `certificateFile`；合成本体时由 `server/snapshot.mjs`
     * 补成 `data/extensions/<revisionId>/certificates/…`（校验器要求仓库相对路径）。
     */
    record.certificateFile = certificate.path;
    record.checker = candidate.evidence?.checker ?? candidate.evidence?.checkerSha256 ?? 'mcs-kernel';
  }
  if (candidate.counterexample) {
    record.model = candidate.counterexample.model;
    record.assignment = candidate.counterexample.assignment ?? null;
    record.note = candidate.counterexample.note ?? '';
  }
  // 机器证书不得声称检查器本身已获形式验证（校验器里也有这条，这里先守住）。
  delete record.checkerVerified;
  return record;
}

/** 懒加载证书契约读法（`discovery.certificateArtifact`）：发现、重放、发布三处共用同一份形状。 */
async function resolveCertificateArtifactReader() {
  try {
    const discovery = await import('../core/formal/discovery.mjs');
    return typeof discovery.certificateArtifact === 'function' ? discovery.certificateArtifact : null;
  } catch {
    return null;
  }
}

/**
 * 证书搬运。
 *
 * 只有两种来源被接受，两者都是**声明式内容**：
 * 1. 候选里直接带着证书正文（`evidence.certificateText`）；
 * 2. 候选里的 `certificate` 是仓库内的相对路径（必须是仓库内、必须存在的普通文件）。
 * 任何越出仓库的路径、或读不到的路径，都不会被「猜一个」——该关系退回待证。
 *
 * 读法统一走 `discovery.certificateArtifact`（发现 → 重放 → 发布三处共用一份契约）；
 * 引擎不可用时退回直接读 `evidence` 的两个字段，行为不变。
 */
function stageCertificate(ctx, candidate, evidenceId, problems, readArtifact = null) {
  const evidence = candidate.evidence ?? {};
  const relative = `certificates/${evidenceId.replace(/[^A-Za-z0-9._-]/g, '_')}.json`;
  let artifact = null;
  if (typeof readArtifact === 'function') {
    try {
      artifact = readArtifact(candidate);
    } catch {
      artifact = null;
    }
  }
  const text = artifact?.certificateText ?? (typeof evidence.certificateText === 'string' ? evidence.certificateText : null);
  if (typeof text === 'string' && text.trim()) {
    return { path: relative, content: text, sha256: `sha256:${bytesHash(Buffer.from(text, 'utf8'))}` };
  }
  const declared = artifact?.certificatePath ?? evidence.certificatePath ?? evidence.certificate;
  if (typeof declared === 'string' && declared.trim()) {
    const repoRoot = ctx.config?.repoRoot ?? null;
    if (!repoRoot) { problems.push(`证据 ${evidenceId} 带证书路径，但 ctx.config.repoRoot 缺失，无法核对。`); return null; }
    if (declared.includes('..') || /^[A-Za-z]:/.test(declared) || declared.startsWith('/') || declared.startsWith('\\')) {
      problems.push(`证据 ${evidenceId} 的证书路径非法（只接受仓库内相对路径）：${declared}`);
      return null;
    }
    const absolute = resolve(repoRoot, declared);
    if (!absolute.startsWith(resolve(repoRoot) + sep)) {
      problems.push(`证据 ${evidenceId} 的证书路径越出仓库：${declared}`);
      return null;
    }
    if (!existsSync(absolute) || !statSync(absolute).isFile()) {
      problems.push(`证据 ${evidenceId} 的证书文件不存在：${declared}`);
      return null;
    }
    const content = readFileSync(absolute, 'utf8');
    const declaredSha = artifact?.certificateSha256 ?? evidence.certificateSha256 ?? null;
    const actualSha = `sha256:${bytesHash(Buffer.from(content, 'utf8'))}`;
    if (declaredSha && declaredSha !== actualSha) {
      problems.push(`证据 ${evidenceId} 的证书文件哈希与登记不符：${declared}`);
      return null;
    }
    return { path: relative, content, sha256: actualSha };
  }
  problems.push(`证据 ${evidenceId} 既没有证书正文，也没有可核对的证书路径。`);
  return null;
}

/**
 * 端点是「概念锚点」吗？
 *
 * 概念锚点（`concept:group:abelian` 这类）**只在登记表里有位置，本体与发布模型里都没有**：
 * 它不是节点，没有 discipline/roles，也不该被塞进 `nodes`。所以选中它的关系不是"坏数据"，
 * 而是"这一条不入库"——按 §6 的三分法归入 `excluded`，**不阻断**其余内容。
 *
 * 判据两条，任一成立即可：`concept:` 前缀；或它就是登记表里的某个概念 spec。
 * 登记表读不到时只靠前缀——**宁可漏判也不猜**（漏判会让它在下一层被当作"端点未入库"记为待证，
 * 仍是安全的降级，不会变成 500）。
 */
function isConceptAnchor(nodeId, ctx = {}) {
  if (typeof nodeId !== 'string' || !nodeId) return false;
  if (nodeId.startsWith('concept:')) return true;
  const injected = ctx.registry ?? null;
  if (injected) {
    if (typeof injected.has === 'function') return injected.has(nodeId);
    if (Array.isArray(injected.CONCEPT_SPECS)) {
      return injected.CONCEPT_SPECS.some((spec) => (spec?.node ?? spec?.concept) === nodeId);
    }
  }
  return conceptSpecIndex().has(nodeId);
}

/** 概念 spec 的 id 集合（懒加载一次；读不到就返回空集合）。 */
let conceptSpecIds = null;
function conceptSpecIndex() {
  if (conceptSpecIds) return conceptSpecIds;
  conceptSpecIds = new Set();
  try {
    const require = createRequire(import.meta.url);
    const registry = require('../../data/formal/registry.mjs');
    for (const spec of registry?.CONCEPT_SPECS ?? []) {
      /*
       * 只收**概念自己的 id**（`node` / `concept`），**绝不收 `anchor`**：
       * `anchor` 指的是这个概念挂靠的**真实节点**（`concept:group:abelian` 的 anchor 是
       * `group:group-concept`），把它当锚点会让一条完全正常的节点关系被判成"不可入库"。
       */
      for (const id of [spec?.node, spec?.concept]) if (typeof id === 'string' && id) conceptSpecIds.add(id);
    }
  } catch {
    // 登记表不可用：只保留 `concept:` 前缀这一条判据。
  }
  return conceptSpecIds;
}

/** 待证关系：进扩展信息，**不进** `relationDescriptions`（未证命题不画成已成立关系）。 */
function pendingRelationFromCandidate(candidate, verdict) {
  return {
    id: `pending:${candidate.id}`,
    kind: candidate.kind,
    from: candidate.from?.node ?? null,
    to: candidate.to?.node ?? null,
    candidateId: candidate.id,
    goal: candidate.goal ?? null,
    conditions: candidate.conditions ?? [],
    direction: candidate.direction ?? null,
    math: candidate.math ?? null,
    run: candidate.run ?? null,
    reason: verdict.reason ?? candidate.math?.reason ?? '',
    // 稳定字段：界面按它决定"为什么没入库"，不必去解析自然语言。
    reasonCode: verdict.reasonCode ?? 'not-verified',
    counterexample: candidate.counterexample ?? null,
    evidence: null,
    review: candidate.review ?? 'pending',
    status: 'pending-verification',
  };
}

/**
 * 合成新节点的本体登记。
 *
 * 只接受**声明式**字段；缺了必需项就报出来，不替作者编一个学科或证据等级：
 * 「合法节点」的合法性由本体自己的校验器定义，这里只负责把缺的东西说清楚。
 */
function buildNodeRecord(draft, request, nodeId, problems) {
  const declared = { ...(draft.node ?? {}), ...(request.node ?? {}) };
  const construct = declared.construct ?? draft.construct ?? 'Concept';
  const record = {
    id: nodeId,
    version: String(declared.version ?? '1'),
    construct,
    roles: declared.roles ?? draft.roles ?? (construct === 'Claim' ? ['Theorem'] : construct === 'Definition' ? ['Definition'] : ['Concept']),
    title: declared.title ?? draft.name,
    discipline: declared.discipline ?? draft.discipline ?? null,
    granularity: declared.granularity ?? draft.granularity ?? 'unit',
    case: declared.case ?? draft.case ?? 'extension',
    summary: declared.summary ?? draft.summary ?? '',
    formal: declared.formal ?? {},
    teaching: { evidenceStatus: declared.evidenceStatus ?? draft.evidenceStatus ?? 'NOT-CLAIMED' },
    provenance: declared.provenance ?? { sources: [], note: `由编写草稿 ${draft.id} 发布。` },
    // 内容块从草稿正文来；`contentRef: false` 表示不引用 data/cases 里的块。
    contentRef: false,
    contentMarkdown: declared.contentMarkdown ?? draft.reading ?? '',
  };
  if (!CONSTRUCTS.includes(record.construct)) problems.push(`新节点的 construct 非法：${record.construct}`);
  for (const role of record.roles) if (!ROLES.includes(role)) problems.push(`新节点的 roles 含非法角色：${role}`);
  if (!record.discipline) problems.push(`新节点 ${nodeId} 缺少 discipline（学科必须显式登记，受控词表见 data/fields.mjs）`);
  else if (!FIELD_IDS.includes(record.discipline)) problems.push(`新节点 ${nodeId} 的 discipline 不在受控词表里：${record.discipline}`);
  if (!GRANULARITY_VALUES.includes(record.granularity)) problems.push(`新节点 ${nodeId} 的 granularity 非法：${record.granularity}`);
  if (!EVIDENCE_STATUS.includes(record.teaching.evidenceStatus)) problems.push(`新节点 ${nodeId} 的证据等级非法：${record.teaching.evidenceStatus}`);
  if (GRANULARITY_CONSTRUCTS.includes(record.construct) && !String(nodeId).startsWith('bg:') && isTopicTitle(record.title)) {
    problems.push(`新节点 ${nodeId} 的标题含并列词，按粒度判据应拆成多个节点或标为 topic：${record.title}`);
  }
  return record;
}

/** 合并内容：新内容 = 父包内容 + 本次新增（同 id 覆盖只允许发生在扩展自己拥有的条目上）。 */
function mergeContent(parentContent, additions) {
  const kinds = ['nodes', 'relations', 'evidence', 'definitions', 'contracts'];
  const content = {};
  const diff = {};
  for (const kind of kinds) {
    const parent = new Map((parentContent?.[kind] ?? []).map((item) => [item.id, item]));
    const added = [];
    const changed = [];
    let unchanged = 0;
    for (const item of additions[kind] ?? []) {
      const previous = parent.get(item.id);
      if (!previous) { parent.set(item.id, item); added.push(item); continue; }
      if (canonicalString(previous) === canonicalString(item)) { unchanged += 1; continue; }
      parent.set(item.id, item);
      changed.push(item);
    }
    content[kind] = [...parent.values()];
    diff[kind] = { added, changed, unchanged, removed: [] };
  }
  return { content, diff };
}

/**
 * 差异计算：读草稿、核对版本、挑出可发布的结果、算出内容包。
 *
 * **零写入**。预览与提交都走这里——这是「预览等于承诺」的技术保证。
 */
export async function buildChangeSet(ctx, request = {}) {
  assertDeclarativeData(request, 'publication.request');
  const { authoring } = ctx;
  assert(authoring && typeof authoring.getDraft === 'function', CODES.INTERNAL, '发布需要编写数据库（ctx.authoring）');

  const draftId = request.draftId;
  assert(typeof draftId === 'string' && draftId.trim(), CODES.BAD_REQUEST, '发布需要 draftId');
  const draftRevision = request.draftRevision;
  assert(Number.isInteger(draftRevision), CODES.BAD_REQUEST, '发布需要 draftRevision（整数修订号）');

  const acceptedIds = normaliseIdList(request.acceptedCandidateIds, 'acceptedCandidateIds');
  const dismissedIds = normaliseIdList(request.dismissedCandidateIds, 'dismissedCandidateIds');
  for (const id of acceptedIds) {
    assert(!dismissedIds.includes(id), CODES.BAD_REQUEST, `候选不能同时被选中与驳回：${id}`);
  }

  const warnings = [];
  const problems = [];
  const source = await resolveSource(ctx);
  const ontology = source.current();
  const baseRaw = source.base.raw;

  if (request.ontologyVersion && request.ontologyVersion !== ontology.version) {
    throw new McsError(CODES.VERSION_CONFLICT,
      '本体版本已变化；请刷新后重新审阅，旧结果不发布到新背景。', 409,
      { expected: ontology.version, received: request.ontologyVersion });
  }

  // ---- 第 1 步的核对内容（草稿修订 / 本体版本 / 背景版本） ----
  const draft = authoring.getDraft(draftId);
  if (draft.revision !== draftRevision) {
    throw new McsError(CODES.CONFLICT, `草稿修订已变化：期望 ${draftRevision}，当前 ${draft.revision}`, 409,
      { expected: draft.revision, received: draftRevision, draft_id: draftId });
  }
  const background = draft.background ?? request.background ?? null;
  if (request.background && draft.background && request.background !== draft.background) {
    throw new McsError(CODES.CONFLICT, `背景理论版本不一致：草稿为 ${draft.background}，请求为 ${request.background}`, 409,
      { expected: draft.background, received: request.background });
  }

  // ---- 运行与候选 ----
  let run = null;
  if (request.runId) run = authoring.getRun(request.runId);
  else {
    const candidates = authoring.listRuns({ limit: 500 }).filter((item) => item.draftId === draftId);
    run = candidates.length ? authoring.getRun(candidates[0].id) : null;
  }
  if (!run && acceptedIds.length) {
    throw new McsError(CODES.BAD_REQUEST, '选中的候选需要一个发现任务；请带 runId 或先运行发现。', 400);
  }
  const byId = new Map((run?.candidates ?? []).map((item) => [item.id, item]));
  for (const id of [...acceptedIds, ...dismissedIds]) {
    if (!byId.has(id)) {
      throw new McsError(CODES.CONFLICT, `候选不在该任务的当前结果里：${id}（结果可能已被新的运行取代）`, 409,
        { candidate_id: id, run_id: run?.id ?? null });
    }
  }
  if (run) {
    if (run.status === 'running' || run.status === 'queued') {
      throw new McsError(CODES.CONFLICT, '发现任务仍在运行；结果还会增加，此时不能入库。', 409, { run_id: run.id, status: run.status });
    }
    if (run.ontologyVersion !== ontology.version) {
      throw new McsError(CODES.VERSION_CONFLICT,
        '这次发现是在另一个本体版本下跑的；旧结果不能发布到新背景，请重新发现。', 409,
        { expected: ontology.version, received: run.ontologyVersion, run_id: run.id });
    }
    if (run.status === 'interrupted' || run.status === 'cancelled' || run.status === 'error') {
      warnings.push(`任务状态为 ${run.status}：只发布已核验的那部分结果，未完成部分保持待证。`);
    }
  }

  const accepted = acceptedIds.map((id) => byId.get(id));
  for (const candidate of accepted) {
    if (candidate.review !== 'accepted') {
      warnings.push(`候选 ${candidate.id} 在库里的审阅状态是 ${candidate.review}；本次按请求里的选中清单处理。`);
    }
  }

  // ---- 内容包：父包 + 本次新增 ----
  const activePointer = await extensions.readActivePointer(extensionTarget(ctx));
  let parentContent = null;
  let parentRevisionId = null;
  if (activePointer?.revision) {
    parentRevisionId = activePointer.revision;
    const parent = await extensions.readPackage(extensionTarget(ctx), parentRevisionId);
    parentContent = parent.package;
  }

  const baseNodeIds = new Set((baseRaw.nodes ?? []).map((node) => node.id));
  const parentNodeIds = new Set((parentContent?.nodes ?? []).map((node) => node.id));

  /*
   * 草稿节点先定下来：本次发布**只能造出这一个**新节点（就是草稿自己）。
   * 关系两端若指向别的尚未入库的节点，只能等那些节点自己发布过——不替它们现造，
   * 否则内容包里会长出一批没有草稿、没有出处、也没人审过的节点。
   */
  const draftNodeId = request.nodeId ?? draft.spec?.node ?? draft.node?.id ?? null;
  const knownNodeIds = new Set([...baseNodeIds, ...parentNodeIds]);
  if (draftNodeId) knownNodeIds.add(draftNodeId);

  const additions = { nodes: [], relations: [], evidence: [], definitions: [], contracts: [] };
  /*
   * 入库语义三分（§6）——三类**分开装**，不许再挤进同一个 `problems` 数组：
   * - `publishable`：端点都在本体里（含本次要发布的新节点）→ 入库；
   * - `pending`：端点尚未入库但**将来可能** → 记为待证，**不阻断**；
   * - `excluded`：概念锚点这类发布模型里没有位置的端点 → **不阻断**，但要写明原因。
   * 真正没法继续的（缺 discipline、悬空引用、证书对不上）才进 `problems` → 409。
   */
  const publishable = [];
  const excluded = [];
  const pending = [];
  const refused = [];
  const files = [];
  const certificates = [];
  const readCertificateArtifact = await resolveCertificateArtifactReader();

  for (const candidate of accepted) {
    const verdict = classifyCandidate(candidate);
    if (verdict.refused) {
      const entry = {
        candidateId: candidate.id, kind: candidate.kind,
        from: candidate.from?.node ?? null, to: candidate.to?.node ?? null,
        reason: verdict.reason, reasonCode: 'refuted',
      };
      refused.push(entry);
      excluded.push(entry);
      continue;
    }
    if (verdict.pending) {
      pending.push(pendingRelationFromCandidate(candidate, { ...verdict, reasonCode: 'not-verified' }));
      continue;
    }
    const from = candidate.from;
    const to = candidate.to;
    if (!from?.node || !to?.node) { problems.push(`候选 ${candidate.id} 缺少端点节点，无法形成关系。`); continue; }
    /*
     * 概念锚点：**明确不入库**，不是"待证"。
     *
     * 以前提示与行为是矛盾的——文案写「本次只把它记为待证」，实际却把它推进 `problems`，
     * 于是整批被挡、返回 500。现在它单独一类，理由写清楚，其余内容照常入库。
     */
    const anchors = [from.node, to.node].filter((id) => isConceptAnchor(id, ctx));
    if (anchors.length) {
      excluded.push({
        candidateId: candidate.id, kind: candidate.kind, from: from.node, to: to.node,
        reason: `端点 ${anchors.join('、')} 是概念锚点（只在登记表里有位置，本体与发布模型里都没有它）；这条需要取消勾选或驳回，不影响本次其余内容入库。`,
        reasonCode: 'concept-anchor',
      });
      continue;
    }
    const missing = [from.node, to.node].filter((id) => !knownNodeIds.has(id));
    if (missing.length) {
      // 端点还没入库，但将来可能：**只记为待证**，不再顺手塞一条阻断项。
      pending.push(pendingRelationFromCandidate(candidate, {
        reason: `端点节点尚未入库：${missing.join('、')}；本次只把它记为待证。`,
        reasonCode: 'endpoints-not-published',
      }));
      continue;
    }
    const evidenceId = `ev:${candidate.id}`;
    let certificate = null;
    if (verdict.evidenceKind === 'machine-certificate') {
      certificate = stageCertificate(ctx, candidate, evidenceId, problems, readCertificateArtifact);
      if (!certificate) {
        pending.push(pendingRelationFromCandidate(candidate, { reason: '证书无法搬运，暂不入库。', reasonCode: 'certificate-unavailable' }));
        continue;
      }
      files.push(certificate);
      certificates.push({ path: certificate.path, sha256: certificate.sha256 });
    }
    additions.evidence.push(evidenceFromCandidate(candidate, { verdict, evidenceId, certificate }));
    const relation = relationFromCandidate(candidate, { verdict, evidenceId, from, to });
    additions.relations.push(relation);
    publishable.push({
      candidateId: candidate.id, relationId: relation.id, kind: candidate.kind,
      from: from.node, to: to.node, evidenceRef: relation.evidenceRef,
      verificationStatus: relation.verificationStatus,
    });
  }

  // ---- 草稿节点 ----
  let newNode = null;
  if (draftNodeId) {
    if (baseNodeIds.has(draftNodeId)) {
      // 已有节点：本次只登记形式表达与关系，不动它的内容（不覆盖既有笔记/条目）。
      warnings.push(`节点 ${draftNodeId} 已存在于基础数据；本次只追加形式表达与关系，不修改原节点。`);
    } else {
      newNode = buildNodeRecord(draft, request, draftNodeId, problems);
      additions.nodes.push(newNode);
      if (parentNodeIds.has(draftNodeId)) {
        warnings.push(`节点 ${draftNodeId} 已由当前扩展包提供；本次以新版本内容替换它（旧版本仍留在历史包里）。`);
      }
    }
  } else if (accepted.length) {
    problems.push('请求里没有节点标识（draft 的 spec.node / request.nodeId）；关系无处挂靠。');
  }

  // ---- 契约（行动）来自草稿的声明式登记 ----
  for (const contract of draft.contracts ?? []) {
    if (!contract || typeof contract !== 'object' || !contract.id) { problems.push('契约条目缺少 id，已跳过。'); continue; }
    additions.contracts.push(contract);
  }

  // ---- 形式表达登记：父包已有的登记要**继承**，本次只覆盖自己那个节点 ----
  const specsByNode = new Map((parentContent?.specs ?? []).map((entry) => [entry.node, entry]));
  if (draft.spec && draftNodeId) {
    specsByNode.set(draftNodeId, { node: draftNodeId, version: String(draft.spec.nodeVersion ?? '1'), spec: draft.spec });
  }
  const specs = [...specsByNode.values()];

  const { content, diff } = mergeContent(parentContent, additions);
  /*
   * 节点必须**在合并后的公共本体里解析得到**，而不是「必须在本次内容包里」。
   *
   * 计划里明写不覆盖既有案例：对基础数据里已有的节点「只补形式表达与关系」是一条
   * 必须走得通的路。内容包是**扩展侧**的内容，基础数据里的节点本来就不在里面——
   * 早先按「内容包自包含」判，会把这条路必然判成阻断（两条分支互相矛盾）。
   * 真正的判据只有一条：不要留下悬空引用。所以 base ∪ parent ∪ 本包 都算可解析，
   * 三者之外的才是真悬空。
   */
  if (draftNodeId) {
    const resolvable = baseNodeIds.has(draftNodeId)
      || parentNodeIds.has(draftNodeId)
      || content.nodes.some((node) => node.id === draftNodeId);
    if (!resolvable) problems.push(`发布后的公共本体里解析不到节点 ${draftNodeId}（基础数据、父包与本次内容都没有它）。`);
  }

  /*
   * 证书文件要**连父包的一起搬**。
   *
   * 包是累积的：旧的证据条目会被原样带进新版本，它引用的证书文件也必须在
   * 新目录里存在，否则新版本一加载就会因为「证书文件缺失」被判成坏包。
   */
  const fileByPath = new Map(files.map((file) => [file.path, file]));
  for (const entry of parentContent?.certificates ?? []) {
    if (fileByPath.has(entry.path)) continue;
    try {
      const parentDir = join(extensions.extensionsRoot(extensionTarget(ctx)), parentRevisionId);
      const parentFile = await readFileAsync(join(parentDir, entry.path), 'utf8');
      fileByPath.set(entry.path, { path: entry.path, content: parentFile, sha256: entry.sha256 });
    } catch (error) {
      problems.push(`父版本的证书文件读不到，无法带进新版本：${entry.path}（${error.code ?? error.message}）`);
    }
  }
  const allFiles = [...fileByPath.values()];
  const certByPath = new Map((parentContent?.certificates ?? []).map((entry) => [entry.path, entry]));
  for (const entry of certificates) certByPath.set(entry.path, entry);
  const allCertificates = [...certByPath.values()];

  // 关系方向约定：hardGeneralization 存「一般 → 特殊」，证据证明的是 特殊 ⇒ 一般。
  for (const relation of additions.relations) {
    if (relation.kind !== 'hardGeneralization') continue;
    const direction = relation.direction;
    if (!direction?.general || !direction?.special) { problems.push(`关系 ${relation.id} 缺少精确方向（general/special）。`); continue; }
    if (direction.general !== relation.from || direction.special !== relation.to) {
      problems.push(`关系 ${relation.id} 的方向与端点不一致：存的是 ${relation.from} → ${relation.to}，方向记的是 ${direction.general} → ${direction.special}。`);
    }
  }

  const reviewDigest = typeof request.reviewDigest === 'string' && request.reviewDigest.trim()
    ? request.reviewDigest.trim()
    : fingerprintOf({
      runId: run?.id ?? null,
      accepted: accepted.map((item) => ({ id: item.id, kind: item.kind, math: item.math?.status ?? null, goal: item.goal?.hash ?? null })),
      dismissed: dismissedIds,
    });

  const baseline = baseFingerprint(source.base);
  /*
   * 请求指纹只用**请求里能直接读到的**字段。
   *
   * 不能把「服务端算出来的规范评阅摘要」掺进来：那样一次不带 reviewDigest 的请求，
   * 提交前算的指纹与提交后存的指纹就不一样，重复提交会被自己的版本检查挡成 409。
   * 选中/驳回清单本身已经足以区分不同的请求。
   */
  const clientDigest = typeof request.reviewDigest === 'string' && request.reviewDigest.trim() ? request.reviewDigest.trim() : null;
  const requestFingerprint = earlyRequestFingerprint({
    draftId, draftRevision, baseline, acceptedCandidateIds: acceptedIds, dismissedCandidateIds: dismissedIds, reviewDigest: clientDigest,
  });

  const pkg = {
    schema: extensions.PACKAGE_SCHEMA,
    parent: parentRevisionId,
    kind: 'publish',
    restores: null,
    baselineFingerprint: baseline,
    reviewDigest,
    acceptedCandidateIds: acceptedIds,
    dismissedCandidateIds: dismissedIds,
    notes: typeof request.notes === 'string' ? request.notes.slice(0, 2000) : null,
    nodes: content.nodes,
    relations: content.relations,
    evidence: content.evidence,
    definitions: content.definitions,
    contracts: content.contracts,
    specs,
    pendingRelations: [...(parentContent?.pendingRelations ?? []).filter((item) => !pending.some((fresh) => fresh.id === item.id)), ...pending],
    certificates: allCertificates,
    summary: {
      nodes: content.nodes.length,
      relations: content.relations.length,
      evidence: content.evidence.length,
      definitions: content.definitions.length,
      contracts: content.contracts.length,
    },
  };
  pkg.revisionId = extensions.revisionIdFor(pkg);
  pkg.contentHash = extensions.packageHash(pkg);

  const revision = {
    id: pkg.revisionId,
    parent: parentRevisionId,
    createdAt: new Date().toISOString(),
    createdBy: request.createdBy ?? 'local-maintainer',
    kind: 'publish',
    restores: null,
    baselineFingerprint: baseline,
    contentHash: pkg.contentHash,
    packagePath: `data/extensions/${pkg.revisionId}/package.json`,
    summary: { ...pkg.summary },
    reviewDigest,
    acceptedCandidateIds: acceptedIds,
    dismissedCandidateIds: dismissedIds,
    notes: pkg.notes,
    requestFingerprint,
    background,
    draftId,
    draftRevision,
  };

  const totals = {
    added: { nodes: diff.nodes.added.length, relations: diff.relations.added.length, evidence: diff.evidence.added.length, definitions: diff.definitions.added.length, contracts: diff.contracts.added.length },
    changed: { nodes: diff.nodes.changed.length, relations: diff.relations.changed.length, evidence: diff.evidence.changed.length, definitions: diff.definitions.changed.length, contracts: diff.contracts.changed.length },
    unchanged: { nodes: diff.nodes.unchanged, relations: diff.relations.unchanged, evidence: diff.evidence.unchanged, definitions: diff.definitions.unchanged, contracts: diff.contracts.unchanged },
    pending: pending.length,
    publishable: publishable.length,
    excluded: excluded.length,
    refused: refused.length,
    dismissed: dismissedIds.length,
  };

  return {
    source, ontology, draft, run, background, baseline,
    accepted, acceptedIds, dismissedIds, pending, publishable, excluded, refused, newNode, specs,
    parentContent, parentRevisionId, content, diff, totals,
    files: allFiles, certificates: allCertificates, reviewDigest,
    requestFingerprint, pkg, revision, problems, warnings,
  };
}

/** 给接口的差异视图：把内容条目压成「谁、什么、为什么」三件事，不搬整个包体。 */
function diffView(plan) {
  const pick = (items, mapper) => items.map(mapper);
  return {
    nodes: {
      added: pick(plan.diff.nodes.added, (node) => ({ id: node.id, title: node.title, construct: node.construct, discipline: node.discipline })),
      changed: pick(plan.diff.nodes.changed, (node) => ({ id: node.id, title: node.title })),
      unchanged: plan.diff.nodes.unchanged,
      removed: pick(plan.diff.nodes.removed, (node) => ({ id: node.id, title: node.title })),
    },
    relations: {
      added: pick(plan.diff.relations.added, (rel) => ({ id: rel.id, kind: rel.kind, from: rel.from, to: rel.to, evidenceRef: rel.evidenceRef, verificationStatus: rel.verificationStatus, direction: rel.direction })),
      changed: pick(plan.diff.relations.changed, (rel) => ({ id: rel.id, kind: rel.kind })),
      unchanged: plan.diff.relations.unchanged,
      removed: pick(plan.diff.relations.removed, (rel) => ({ id: rel.id, kind: rel.kind, from: rel.from, to: rel.to })),
    },
    evidence: {
      added: pick(plan.diff.evidence.added, (item) => ({ id: item.id, kind: item.kind, status: item.status, checkStatus: item.checkStatus, nodes: item.nodes })),
      changed: pick(plan.diff.evidence.changed, (item) => ({ id: item.id })),
      unchanged: plan.diff.evidence.unchanged,
      removed: pick(plan.diff.evidence.removed, (item) => ({ id: item.id })),
    },
    definitions: {
      added: pick(plan.diff.definitions.added, (item) => ({ id: item.id, node: item.node, name: item.name })),
      changed: pick(plan.diff.definitions.changed, (item) => ({ id: item.id })),
      unchanged: plan.diff.definitions.unchanged,
      removed: pick(plan.diff.definitions.removed, (item) => ({ id: item.id })),
    },
    contracts: {
      added: pick(plan.diff.contracts.added, (item) => ({ id: item.id, mode: item.mode, title: item.title })),
      changed: pick(plan.diff.contracts.changed, (item) => ({ id: item.id })),
      unchanged: plan.diff.contracts.unchanged,
      removed: pick(plan.diff.contracts.removed, (item) => ({ id: item.id })),
    },
    /*
     * 三分类的稳定字段——界面据 `publishable` 决定默认勾选，据 `excluded` 分栏并显示原因。
     * `pending` 与 `excluded` 都**不是**阻断项：能不能继续，只看 `problems`。
     */
    publishable: plan.publishable.map((item) => ({ ...item })),
    pending: plan.pending.map((item) => ({ id: item.id, candidateId: item.candidateId, kind: item.kind, from: item.from, to: item.to, reason: item.reason, reasonCode: item.reasonCode })),
    excluded: plan.excluded.map((item) => ({ ...item })),
    // 兼容字段：`refused` 仍然只表示"被反驳"，旧调用方不用改。
    refused: plan.refused.map((item) => ({ candidateId: item.candidateId, reason: item.reason, kind: item.kind, from: item.from, to: item.to, reasonCode: item.reasonCode })),
    dismissed: plan.dismissedIds,
    totals: plan.totals,
  };
}

/* -------------------------------------------------------------------- 预览 */

/** 入库预览：与提交共用 `buildChangeSet`，**零写入**。 */
export async function previewPublication(ctx, request = {}) {
  const plan = await buildChangeSet(ctx, request);
  const nothingToPublish = plan.accepted.length > 0 && plan.publishable.length === 0 && plan.pending.length === 0;
  return {
    revision: plan.revision,
    diff: diffView(plan),
    steps: PUBLICATION_STEPS,
    ontologyVersion: plan.ontology.version,
    baseFingerprint: plan.baseline,
    parent: plan.parentRevisionId,
    reviewDigest: plan.reviewDigest,
    problems: plan.problems,
    warnings: plan.warnings,
    sealed: plan.problems.length === 0,
    /*
     * 「选中的东西一条都进不了库」是一个**可提前看见**的状态，不是阻断项：
     * 预览照常给出三分类；提交时才会 409（那时候调用方确实做错了）。
     */
    nothingToPublish,
    publishableCount: plan.publishable.length,
    pendingCount: plan.pending.length,
    excludedCount: plan.excluded.length,
    note: plan.problems.length
      ? '预览发现阻断项：这些内容现在提交会被隔离区检查挡下。'
      : (nothingToPublish
        ? '选中的候选一条都不能入库（`excluded` 里逐条写明了原因）；请取消勾选或驳回它们，或补上可入库的内容。'
        : '预览与提交共用同一段差异计算；这里看到的就是提交后会生效的内容。'),
  };
}

/* ------------------------------------------------------- 第 2 步：重放证据 */

/**
 * 取重放引擎。
 *
 * 优先用 `ctx.replay`（测试与上游装配都能注入）；否则懒加载 `core/formal/discovery.mjs`。
 * 拿不到引擎时**不假装重放过**：不需要证书的三类还能做结构性核对，
 * 需要证书的那一类直接判不通过——宁可发不出去，也不能把没重放的东西说成重放过。
 */
async function resolveReplay(ctx) {
  if (typeof ctx.replay === 'function') return ctx.replay;
  try {
    const discovery = await import('../core/formal/discovery.mjs');
    if (typeof discovery.replayCandidate === 'function') return (args) => discovery.replayCandidate(args);
  } catch { /* 引擎尚未装配：走下面的结构性核对 */ }
  return null;
}

/** 懒加载登记表：api 层的发布 ctx 不带它，但重放与发现必须是**同一套**登记表。 */
async function loadRegistryModule() {
  try {
    const module = await import('../data/formal/registry.mjs');
    return module && Array.isArray(module.specs) ? module : null;
  } catch {
    return null;
  }
}

/**
 * 重放的引擎上下文：**与发现阶段同一套**。
 *
 * 为什么必须在这里统一：`discovery.replayCandidate` 会用「当前登记表」重新生成候选形状
 * 再重跑判定器。如果发布这一侧少给 `registry` / `background` / `specs`，
 * 重放就会在「登记表里找不到对应的候选形状」上失败——那是**我们的上下文缺失**，
 * 不是候选坏掉了。所以这里只做一件事：把发现阶段那一套原料原样凑齐，并交给
 * `discovery.assembleEngineContext`（发现自己也调它），**不在 publication 里另写一套**。
 *
 * 缺什么就记什么（`missing`），由调用方判成 500 —— 不能和「候选不可重放」混为一谈。
 */
async function resolveReplayContext(ctx, plan) {
  const missing = [];
  let discovery = null;
  try {
    discovery = await import('../core/formal/discovery.mjs');
  } catch (error) {
    missing.push(`发现引擎不可用（core/formal/discovery.mjs）：${error.message}`);
  }
  const registry = ctx.registry ?? await loadRegistryModule();
  if (!registry) missing.push('登记表（data/formal/registry.mjs）装配不上');
  const repoRoot = ctx.config?.repoRoot ?? resolve(ctx.dataDir ?? '.', '..');
  const background = ctx.background ?? plan?.background ?? plan?.draft?.background ?? null;
  /*
   * 草稿的形式表达**也要在**上下文里：草稿节点的 spec 还没进登记表（草稿不等于已发布），
   * 少了它，重放就重算不出「草稿节点 ↔ 已登记概念」这类候选形状。
   * 这一条与发现阶段是同一个口径：谁能生成候选，谁就必须能被重放。
   */
  const draftSpec = plan?.draft?.spec && plan.draft.spec.node ? plan.draft.spec : null;
  const specsForReplay = Array.isArray(ctx.specs) && ctx.specs.length
    ? ctx.specs
    : [
      ...(registry?.specs ?? []),
      ...(registry?.CONCEPT_SPECS ?? []),
      ...(draftSpec ? [draftSpec] : []),
    ];
  const warnings = [];
  let assembled = null;
  if (discovery && typeof discovery.assembleEngineContext === 'function' && registry) {
    try {
      /*
       * 引擎袋必须由 `discovery.resolveEngine` 装配（与发现阶段同一个入口）。
       * 少了它，语言层不会被懒加载，于是所有 `G -> G -> G` 这类类型都「无法解析」——
       * 看起来像候选坏了，其实是上下文缺了一块。
       */
      const engine = typeof discovery.resolveEngine === 'function'
        ? discovery.resolveEngine({ registry, ...(ctx.deps ?? {}) })
        : (ctx.engine ?? {});
      assembled = discovery.assembleEngineContext({
        registry,
        engine,
        deps: ctx.deps ?? {},
        background,
        specs: specsForReplay,
        focus: new Set(),
        repoRoot,
        budget: null,
        ontology: plan?.ontology ?? null,
      });
      warnings.push(...(assembled?.warnings ?? []));
      const engineWarning = (assembled?.warnings ?? []).find((item) => item.includes('语言层未装配') || item.includes('登记表未装配'));
      if (engineWarning) missing.push(engineWarning);
      if (!Array.isArray(assembled?.allSpecs) || assembled.allSpecs.length === 0) {
        missing.push('登记表没有给出任何形式表达（assembleEngineContext 的 allSpecs 为空）');
      }
    } catch (error) {
      missing.push(`引擎上下文装配失败：${error.message}`);
    }
  }
  return {
    ok: missing.length === 0,
    missing,
    warnings,
    registry,
    repoRoot,
    background,
    assembled,
    discovery,
  };
}

/** 证书正文 → kernel 口径摘要（`codec.digest`，与证书里的 theory_sha256 同一套序列化）。 */
async function certificateDigest(text) {
  if (typeof text !== 'string' || !text.trim()) return null;
  try {
    const bundle = JSON.parse(text);
    const { digest } = await import('../core/formal/codec.mjs');
    return digest(bundle);
  } catch {
    return null;
  }
}

/**
 * 把「库里存的证书」与「这次重放现算的证书」比一遍。
 *
 * 三条各有各的用处，别互相顶替：
 * - `intact`：**正文摘要自洽**（正文 vs 登记在证据里的 `certificateSha256`）。
 *   这是唯一能抓住「改一个字节」的判据——重放**抓不到**它：同一命题、同一理论下，
 *   搜索每次给出的证明文本可以不同（内部计数器让步骤名变化），所以「重放结果与正文不同」
 *   并不等于被改过。
 * - `propositionMatch`：两份证书证的是不是**同一条命题**（α 等价）。
 * - `theoryMatch`：两份证书挂的是不是同一份理论（诊断用；不同就说明上下文装配变了）。
 */
async function compareCertificates(storedText, storedSha, replayedText) {
  const out = { intact: null, propositionMatch: null, theoryMatch: null };
  if (typeof storedSha === 'string' && storedSha.trim() && typeof storedText === 'string' && storedText.trim()) {
    out.intact = storedSha.trim() === `sha256:${sha256(storedText)}`;
  }
  if (typeof storedText === 'string' && typeof replayedText === 'string' && storedText.trim() && replayedText.trim()) {
    try {
      const [storedBundle, replayedBundle] = [JSON.parse(storedText), JSON.parse(replayedText)];
      const conclusionOf = (bundle) => bundle?.proofs?.[bundle?.target]?.conclusion ?? null;
      const left = conclusionOf(storedBundle);
      const right = conclusionOf(replayedBundle);
      if (left && right) {
        const { sameFormula } = await import('../core/formal/terms.mjs');
        out.propositionMatch = sameFormula(left, right);
      }
      if (storedBundle?.theory && replayedBundle?.theory) {
        const { digest } = await import('../core/formal/codec.mjs');
        out.theoryMatch = digest(storedBundle.theory) === digest(replayedBundle.theory);
      }
    } catch {
      out.propositionMatch = null;
    }
  }
  return out;
}

async function replaySelected(ctx, plan) {
  const results = [];
  const problems = [];
  const contextProblems = [];
  const replay = await resolveReplay(ctx);

  /*
   * 只有真的要用引擎重放时才去凑上下文：`ctx.replay` 是调用方注入的（测试替身），
   * 那一侧的上下文由调用方负责，不该被这里的「登记表装配不上」误伤。
   */
  const engineContext = replay && typeof ctx.replay !== 'function' ? await resolveReplayContext(ctx, plan) : null;
  if (engineContext && !engineContext.ok) {
    contextProblems.push(...engineContext.missing.map((item) => `重放缺少上下文：${item}`));
  }

  for (const relation of plan.pkg.relations) {
    const candidate = plan.accepted.find((item) => `rel:${item.id}` === relation.id);
    if (!candidate) continue;
    const evidence = plan.pkg.evidence.find((item) => item.id === relation.evidenceRef);

    if (replay) {
      if (engineContext && !engineContext.ok) {
        results.push({ candidateId: candidate.id, ok: false, replayed: false, contextMissing: true, kind: evidence?.kind ?? null });
        continue;
      }
      const outcome = await replay({
        candidate,
        registry: engineContext?.registry ?? ctx.registry ?? null,
        ontology: plan.ontology,
        repoRoot: engineContext?.repoRoot ?? ctx.config?.repoRoot ?? null,
        ontologyVersion: plan.ontology.version,
        background: engineContext?.background ?? null,
        // 与发现阶段同一批原料：specs / background / repoRoot 都由上面那次装配给出。
        deps: engineContext
          ? { ...(ctx.deps ?? {}), background: engineContext.background, specs: engineContext.assembled?.allSpecs ?? null, repoRoot: engineContext.repoRoot }
          : undefined,
      });
      /*
       * 判据按证据类型分开：
       * - 机器证书（PROOF）：必须**真的**跑过一次检查器并且 passed——「重放了但没检查」
       *   不算通过，否则第 2 步就成了走形式；
       * - 定义引用 / 有限检查：核的是版本、哈希与结构，由 replayCandidate 自己判定。
       */
      const passed = evidence?.kind === 'machine-certificate'
        ? outcome?.ok === true && outcome.check?.status === 'passed'
        : outcome?.ok === true;
      /*
       * 证书核对：库里存的那一份必须**自洽**（正文对得上登记摘要），
       * 且这次重放证出的必须是**同一条命题**。
       *
       * 没有这一步，「改一个字节」的证书会一路走到内容包里——因为包里的哈希是按
       * 被改过的正文自己算的，自洽得很；只有拿登记摘要比一次才看得见差异。
       */
      const storedText = candidate?.evidence?.certificateText;
      const storedSha = candidate?.evidence?.certificateSha256 ?? null;
      const replayedText = outcome?.candidate?.evidence?.certificateText;
      const comparison = await compareCertificates(storedText, storedSha, replayedText);
      if (comparison.intact === false) {
        problems.push(`候选 ${candidate.id} 的证书正文与登记的摘要不一致（正文被改过一个字节）。`);
      }
      if (comparison.propositionMatch === false) {
        problems.push(`候选 ${candidate.id} 重放证出的命题与证书里的不是同一条。`);
      }
      const ok = Boolean(passed) && comparison.intact !== false && comparison.propositionMatch !== false;
      results.push({
        candidateId: candidate.id, ok, replayed: true, kind: evidence?.kind ?? null,
        check: outcome?.check ?? null, certificate: comparison, problems: outcome?.problems ?? [],
      });
      if (!passed) problems.push(`候选 ${candidate.id} 重放未通过：${(outcome?.problems ?? ['未知原因']).join('；')}`);
      continue;
    }

    if (evidence?.kind === 'reference') {
      // 定义性依赖不需要证书：当场再核一次引用的 specHash 与版本。
      const stale = (candidate.references ?? []).filter((ref) => ref.specHash && ref.currentSpecHash && ref.specHash !== ref.currentSpecHash);
      if (stale.length) problems.push(`定义引用 ${relation.id} 的 specHash 已失效：${stale.map((item) => item.node ?? item).join('、')}`);
      results.push({ candidateId: candidate.id, ok: stale.length === 0, replayed: false, kind: 'reference' });
      continue;
    }
    if (evidence?.kind === 'counterexample') {
      const model = candidate.counterexample?.model;
      if (!model) {
        problems.push(`候选 ${candidate.id} 声称有反例但缺少模型标识。`);
        results.push({ candidateId: candidate.id, ok: false, replayed: false, kind: 'counterexample' });
        continue;
      }
      results.push({ candidateId: candidate.id, ok: true, replayed: false, kind: 'counterexample' });
      continue;
    }
    if (evidence?.kind === 'finite-check') {
      results.push({ candidateId: candidate.id, ok: true, replayed: false, kind: 'finite-check' });
      continue;
    }
    problems.push(`候选 ${candidate.id} 带机器证书（${evidence?.kind ?? 'unknown'}），但没有可用的重放引擎，无法核对。`);
    results.push({ candidateId: candidate.id, ok: false, replayed: false, kind: evidence?.kind ?? null });
  }
  return { results, problems, contextProblems, engine: Boolean(replay), contextWarnings: engineContext?.warnings ?? [] };
}

/* --------------------------------------------------- 第 3 步：隔离区合成 */

/**
 * 暂存根是一个**自包含的迷你仓库**；同盘时再额外照抄真实的相对位置。
 *
 * ## 为什么不能再「无条件照抄真实位置」（P2，2026-10-04）
 *
 * 早先这里无条件用 `relative(repoRoot, extensionsDir)` 把真实的扩展目录位置搬进暂存根。
 * 当扩展目录与仓库**不在同一个盘**时，Windows 的 `path.relative` 返回的是**绝对路径**，
 * 于是暂存里被拼出 `…\staging\D:\other\extensions\…` 这种畸形路径，第 3 步直接 500。
 *
 * ## 为什么同盘时**仍然要照抄**（P1-7 的「快照接管」检查，2026-10-05）
 *
 * `evidence[].certificate` 存的是**相对 repoRoot 的路径字符串**，而本体版本哈希是对整份
 * raw 做 canonical 之后算的——路径字符串进哈希。同一份包：
 *
 * - 暂存里照抄真实相对位置 → 证书路径逐字相同 → **暂存合成的 version === 真实加载的 version**，
 *   第 6 步那条严格检查（"切换后必须真的接管新版本"）成立；
 * - 跨盘时照抄不了（相对路径根本表达不出来）→ 路径字符串必然不同 → 版本必然不同。
 *
 * 后者是**位置差异，不是内容差异**（实测：把证书路径换回包内相对路径后，两份 raw 逐字相同）。
 * 所以跨盘那一路交给 `verifyTakeover`，用「位置无关的内容指纹 + 指针确实指向本版本」来判，
 * 而不是把检查放宽成"随便看看"。
 */
function stagedLayout(ctx, staging) {
  const realRepoRoot = resolve(ctx.config?.repoRoot ?? join(ctx.dataDir, '..'));
  const realExtensionsDir = ctx.extensionsDir ? resolve(ctx.extensionsDir) : null;
  const rel = realExtensionsDir ? relative(realRepoRoot, realExtensionsDir) : null;
  // `relative` 跨盘会返回绝对路径：那一支必须走自包含布局，绝不能把绝对路径 join 进暂存根。
  const mirror = rel && !isAbsolute(rel) && !rel.startsWith('..') ? rel : null;
  const selfContained = extensions.stagingLayout(staging);
  return {
    // `realRepoRoot` 只用来**读**基础数据引用的那些证书（它们是仓库里的只读来源）。
    realRepoRoot,
    repoRoot: selfContained.repoRoot,
    // 同盘：证书路径字符串与真实加载逐字相同（严格检查成立）；跨盘：自包含布局。
    extensionsDir: mirror ? join(selfContained.repoRoot, mirror) : selfContained.extensionsDir,
    mirrored: Boolean(mirror),
  };
}

/**
 * 位置无关的内容指纹。
 *
 * 把 `evidence[].certificate`（相对 repoRoot 的路径）换回**包内相对路径**
 * （`certificateFile`，本来就在记录里），再算 canonical 摘要。
 * 于是「同一份包在两个盘上加载」得到同一个指纹——这正是"内容相同"的判据；
 * 而「包被改过」「少了一条关系」这类真差异照样会被抓出来。
 * 没有 `certificateFile` 的记录（基础数据自带的那几份）不动：它们两边用的是同一个 repoRoot。
 */
function contentFingerprint(raw) {
  const normalized = {
    ...raw,
    evidence: (raw?.evidence ?? []).map((record) => {
      if (!record?.certificateFile) return record;
      const { certificate, ...rest } = record;
      return { ...rest, certificate: record.certificateFile };
    }),
  };
  return `sha256:${sha256(normalized)}`;
}

/** 关系记录去掉「待复核」标注（那是**装载期**根据证据状态加的，不属于包的内容）。 */
function stripReviewAnnotations(relation) {
  if (!relation || typeof relation !== 'object') return relation;
  const { needsReview, reviewNote, ...rest } = relation;
  // `verificationStatus` 会被装载期从 verified 改成 stale：那不是内容差异，一并对齐。
  if (rest.verificationStatus === 'stale') rest.verificationStatus = 'verified';
  return rest;
}

/**
 * 第 6 步的验收：**切换之后，服务端快照必须真的接管了新版本**。
 *
 * 判据三条，缺一不可：
 * 1. `applied === true` —— 包确实生效（没被拒绝）；
 * 2. `activeRevision() === 刚写入的版本 id` —— 指针真的指向本版本（这一条直接对应
 *    "发布了但网站读不到"）；
 * 3. 内容同一 —— 最强形式是两边版本哈希相等；不相等时（跨盘：证书路径字符串必然不同，
 *    或装载期给关系加了"待复核"标注）就**逐条核对本包贡献的内容**：
 *    节点 / 关系 / 证据 / 契约在"隔离区合成的那份"与"真实装载的那份"里逐字段一致。
 *
 * 第 3 条不是"放宽"：路径字符串与待复核标注都不是知识内容，把它们算进"是否接管"里，
 * 只会让跨盘配置永远发布不成功——而真正要防的"发布了却读不到"由第 1、2 条直接挡住。
 */
function verifyTakeover(source, composedRaw, pkg, expectedVersion, revisionId) {
  const problems = [];
  const mismatches = [];
  const applied = source.applied();
  const active = source.activeRevision();
  if (applied !== true) problems.push('切换后快照报告「扩展包未生效」');
  if (active !== revisionId) problems.push(`切换后激活指针指向 ${active ?? '（空）'}，不是本次写入的 ${revisionId}`);
  const after = source.current();
  const versionEqual = after.version === expectedVersion;

  const compare = (label, items, pick, normalize = (item) => item) => {
    for (const item of items ?? []) {
      const id = item?.id;
      if (!id) continue;
      const composedItem = pick(composedRaw, id);
      const loadedItem = pick(after.raw, id);
      if (!composedItem) continue;                       // 本次没贡献它，比不着
      if (!loadedItem) { mismatches.push(`${label} ${id} 在装载后的本体里找不到`); continue; }
      if (canonicalString(normalize(composedItem)) !== canonicalString(normalize(loadedItem))) {
        mismatches.push(`${label} ${id} 的内容在暂存与真实装载之间不一致`);
      }
    }
  };
  if (!versionEqual) {
    const byId = (list) => (id) => (list ?? []).find((item) => item.id === id);
    compare('节点', pkg?.nodes, byId(after.raw.nodes));
    compare('关系', pkg?.relations, byId(after.raw.relationDescriptions), stripReviewAnnotations);
    compare('证据', pkg?.evidence, byId(after.raw.evidence), (record) => {
      if (!record?.certificateFile) return record;
      const { certificate, ...rest } = record;
      return { ...rest, certificate: record.certificateFile };
    });
    compare('契约', pkg?.contracts, byId(after.raw.actions));
    if (mismatches.length) {
      problems.push(`切换后快照版本与预期不符：${after.version} ≠ ${expectedVersion}；`
        + `逐条核对本包内容也不一致（${mismatches.length} 项）：${mismatches.slice(0, 5).join('；')}`);
    }
  }
  return {
    ok: problems.length === 0,
    problems,
    versionEqual,
    contentIdentical: !versionEqual && mismatches.length === 0,
    mismatches,
    version: after.version,
    expectedVersion,
    mode: versionEqual ? 'version-equal' : (mismatches.length === 0 ? 'content-verified' : 'mismatch'),
  };
}

/**
 * 让暂存根成为「一个迷你仓库」。
 *
 * 校验器用 `resolve(repoRoot, record.certificate)` 找证书文件：基础数据里的
 * 机器证书指向 `mcs-foundations/...`，扩展包里的指向「扩展根相对仓库根」的真实位置。
 * 第 3 步要在**隔离区**里用同一条规则检查整个合成结果，所以暂存根下必须同时有
 * 这两类文件——基础数据引用到的那几份按原路径复制一份（只读来源，四个文件量级），
 * 扩展的新证书写进暂存根里那个**照抄真实布局**的扩展目录。这样「隔离区检查」
 * 与「真实加载检查」才是同一条规则。
 */
async function stageCertificateTree(ctx, plan, staging, revisionId) {
  const { repoRoot, extensionsDir: stagedExtensions, realRepoRoot } = stagedLayout(ctx, staging);
  const { writeFile: write, copyFile } = await import('node:fs/promises');
  for (const file of plan.files) {
    /*
     * 包目录由 `extensions.packageDirPath` 算（目录名走 `dirNameFor`）：
     * 真实落盘与暂存试算用的是**同一个函数**，不会一边 `rev-xxx`、一边 `rev:xxx`。
     */
    const target = join(extensions.packageDirPath(stagedExtensions, revisionId), file.path);
    await mkdir(dirname(target), { recursive: true });
    await write(target, file.content, 'utf8');
  }
  let copied = 0;
  for (const record of plan.source?.base?.raw?.evidence ?? []) {
    const declared = record?.certificate;
    if (typeof declared !== 'string' || !declared.trim()) continue;
    if (declared.includes('..') || /^[A-Za-z]:/.test(declared)) continue;
    const source = resolve(realRepoRoot, declared);
    if (!existsSync(source) || !statSync(source).isFile()) continue;   // 基础数据自己缺文件时，让校验如实报出来
    const target = join(staging, declared);
    await mkdir(dirname(target), { recursive: true });
    await copyFile(source, target);
    copied += 1;
  }
  return copied;
}

async function composeInIsolation(ctx, plan, revisionId) {
  const stagingParent = join(runtimeRoot(ctx), 'publication-staging');
  const staging = join(stagingParent, revisionId.replace(/[^A-Za-z0-9._-]/g, '_'));
  await rm(staging, { recursive: true, force: true }).catch(() => {});
  await mkdir(staging, { recursive: true });
  try {
    // 先把证书树铺好，再按**同一条**校验规则（repoRoot = 暂存根）合成。
    await stageCertificateTree(ctx, plan, staging, revisionId);
    /*
     * 合成时的扩展目录也必须指向**暂存根里的那一份**：证书路径是「相对 repoRoot」的，
     * 只有两边都落在暂存根里，隔离区检查查的才是刚铺好的文件。
     */
    const composed = plan.source.applyPackage(plan.pkg, {
      repoRoot: staging,
      extensionsDir: stagedLayout(ctx, staging).extensionsDir,
    });
    const extra = [];
    const problemList = [...plan.problems];
    // 引用封闭：关系、证据、契约的每一端都要在新本体里解析得到。
    const nodeIds = new Set(composed.instance.raw.nodes.map((node) => node.id));
    const evidenceIds = new Set(composed.instance.raw.evidence.map((record) => record.id));
    for (const relation of plan.pkg.relations) {
      if (!nodeIds.has(relation.from)) extra.push(`关系 ${relation.id} 的起点无法解析：${relation.from}`);
      if (!nodeIds.has(relation.to)) extra.push(`关系 ${relation.id} 的终点无法解析：${relation.to}`);
      if (relation.evidenceRef && !evidenceIds.has(relation.evidenceRef)) extra.push(`关系 ${relation.id} 引用的证据不存在：${relation.evidenceRef}`);
    }
    for (const record of plan.pkg.evidence) {
      for (const nodeId of record.nodes ?? []) if (!nodeIds.has(nodeId)) extra.push(`证据 ${record.id} 引用未知节点：${nodeId}`);
    }
    for (const contract of plan.pkg.contracts) {
      for (const port of [...(contract.inputs ?? []), ...(contract.outputs ?? [])]) {
        if (port?.node && !nodeIds.has(port.node)) extra.push(`契约 ${contract.id} 引用未知节点：${port.node}`);
      }
    }
    if (extra.length) {
      /*
       * 阻断项 → **409**（不是 500）。
       *
       * 「服务端出错」与「你交来的内容通不过检查」是两件事：后者是调用方能改的，
       * 就该是 409 + 逐条问题清单。500 会让调用方以为重试有意义，也会把工程问题藏起来。
       */
      throw new McsError(CODES.ONTOLOGY_INVALID, `隔离区合成未通过（${extra.length} 项）`, 409,
        { problems: [...problemList, ...extra], revision_id: revisionId });
    }
    if (problemList.length) {
      throw new McsError(CODES.ONTOLOGY_INVALID, `发布前检查有阻断项（${problemList.length} 项）`, 409,
        { problems: problemList, revision_id: revisionId });
    }
    return { composed, staging };
  } finally {
    // 暂存目录只是「试算场地」，用完即清；公共数据一个字节都没动过。
    await rm(staging, { recursive: true, force: true }).catch(() => {});
    const { rmdir } = await import('node:fs/promises');
    await rmdir(stagingParent).catch(() => {});      // 空目录顺手收掉，非空（并发发布）就留着
  }
}

/* ------------------------------------------------------------ 提交（六步） */

export async function commitPublication(ctx, request = {}) {
  assertDeclarativeData(request, 'publication.request');
  const { authoring } = ctx;
  assert(authoring && typeof authoring.createPublication === 'function', CODES.INTERNAL, '发布需要编写数据库（ctx.authoring）');
  const key = typeof request.idempotencyKey === 'string' && request.idempotencyKey.trim() ? request.idempotencyKey.trim().slice(0, 200) : null;

  /*
   * 幂等快路径放在锁外：重复提交是最常见的情况，不该为它去抢写锁。
   * 锁内还会再查一次——两次提交同时到达时，第一个写完之后第二个必须能看见。
   */
  if (key) {
    const existing = authoring.findPublicationByIdempotency(key);
    if (existing) {
      const source = await resolveSource(ctx);
      return reusePublication(existing, key, fingerprintFromRequest(request, baseFingerprint(source.base)));
    }
  }

  return withWriteLock(ctx, async () => {
    if (key) {
      const again = authoring.findPublicationByIdempotency(key);
      if (again) {
        const lockSource = await resolveSource(ctx);
        return reusePublication(again, key, fingerprintFromRequest(request, baseFingerprint(lockSource.base)));
      }
    }

    /*
     * 内容同一性短路：当前生效版本就是这次请求的产物 → 直接返回它。
     * 放在版本检查**之前**，否则「重复提交」会被自己的上一次发布挡成 409。
     */
    const target = extensionTarget(ctx);
    const preflightSource = await resolveSource(ctx);
    const preflightFingerprint = fingerprintFromRequest(request, baseFingerprint(preflightSource.base));
    const pointerAtEntry = await extensions.readActivePointer(target);
    if (pointerAtEntry?.revision) {
      const activeMeta = await extensions.readPackage(target, pointerAtEntry.revision).catch(() => null);
      if (activeMeta?.revision?.requestFingerprint === preflightFingerprint) {
        return {
          revision: activeMeta.revision,
          ontologyVersion: preflightSource.current().version,
          idempotent: true,
          reason: '当前生效版本就是这次请求的产物；不重复写入。',
          steps: PUBLICATION_STEPS.map((step) => ({ ...step, status: 'skipped' })),
          note: '幂等命中：这是同一次请求的重复提交，没有产生新的版本。要看完整差异请再调预览。',
        };
      }
    }

    // ---- 第 1 步 ----
    const plan = await buildChangeSet(ctx, request);
    const pointerBefore = await extensions.readActivePointer(target);
    const previousRevisionId = pointerBefore?.revision ?? null;

    // ---- 第 2 步 ----
    const replay = await replaySelected(ctx, plan);
    if (replay.contextProblems?.length) {
      throw new McsError(CODES.INTERNAL,
        `重放缺少上下文（这是服务端的问题，不是候选的问题）；本次发布不生效，原版本继续生效：${replay.contextProblems.join('；')}`, 500,
        { problems: replay.contextProblems, results: replay.results, step: 'replay', kind: 'context-missing' });
    }
    if (replay.problems.length) {
      throw new McsError(CODES.EVIDENCE_FAILED,
        `重放未通过（${replay.problems.length} 项）；本次发布不生效，原版本继续生效。`, 409,
        { problems: replay.problems, results: replay.results, step: 'replay' });
    }

    /*
     * 「选中了一条都进不了库的东西」→ **409**，不是 500。
     *
     * 500 是"服务端出错"，而这属于调用方的问题（选了概念锚点、或被反驳的候选）。
     * `pending` 不算在这里：待证**允许**发生（合法节点 + 待证关系本来就是一条路），
     * 所以只有"一条 publishable 都没有、也没有任何 pending"才拒。
     *
     * 位置放在第 2 步**之后**：证据坏了（EVIDENCE_FAILED）、上下文缺了（INTERNAL）
     * 这些更具体的错误应当先报出来——「你选的这条本身有问题」比「它不能入库」更可操作。
     */
    if (plan.accepted.length > 0 && plan.publishable.length === 0 && plan.pending.length === 0) {
      throw new McsError(CODES.CONFLICT,
        `你选中的 ${plan.accepted.length} 条候选一条都不能入库；这条需要取消勾选或驳回：`
        + (plan.excluded.map((item) => `${item.candidateId}（${item.reasonCode}）`).join('、') || '（未给出原因）'), 409,
        { step: 'freeze', excluded: plan.excluded, reasonCodes: [...new Set(plan.excluded.map((item) => item.reasonCode))] });
    }

    // ---- 第 3 步 ----
    const { composed } = await composeInIsolation(ctx, plan, plan.revision.id);
    const expectedVersion = composed.instance.version;

    // ---- 第 4 步 ----
    const written = await extensions.writePackage(target, plan.revision, { ...plan.pkg, files: plan.files });
    const verdict = await extensions.verifyPackage(target, written.revisionId);
    if (!verdict.ok) {
      throw new McsError(CODES.INTERNAL, `内容包回读校验失败：${written.revisionId}`, 500, { problems: verdict.problems, step: 'write' });
    }

    // ---- 第 5 步 ----
    const pointerNow = await extensions.readActivePointer(target);
    if ((pointerNow?.revision ?? null) !== previousRevisionId) {
      throw new McsError(CODES.CONFLICT, '激活版本在本次发布过程中被其他写入改变；请重新预览。', 409,
        { expected: previousRevisionId, current: pointerNow?.revision ?? null, step: 'activate' });
    }
    const currentVersion = plan.source.current().version;
    if (currentVersion !== plan.ontology.version) {
      throw new McsError(CODES.VERSION_CONFLICT, '本体快照在发布过程中发生变化；请重新预览。', 409,
        { expected: plan.ontology.version, current: currentVersion, step: 'activate' });
    }
    await extensions.writeActivePointer(target, written.revisionId, { updatedBy: plan.revision.createdBy, note: 'publish' });

    // ---- 第 6 步 ----
    let takeover = null;
    const snapshotProblems = [];
    try {
      await plan.source.reload();
      takeover = verifyTakeover(plan.source, composed.instance.raw, plan.pkg, expectedVersion, written.revisionId);
      snapshotProblems.push(...takeover.problems);
      if (!plan.source.integrity().ok) snapshotProblems.push(...plan.source.integrity().problems);
    } catch (error) {
      snapshotProblems.push(error.message);
    }
    if (snapshotProblems.length) {
      /*
       * 新版本没能真正接管：把指针**回退**到原版本，并让 reload 再走一遍。
       * 「任一步失败 → 原版本继续生效」这条承诺在最后一步也必须成立。
       */
      await extensions.writeActivePointer(target, previousRevisionId, { updatedBy: plan.revision.createdBy, note: 'publish-rollback' }).catch(() => {});
      await plan.source.reload().catch(() => {});
      throw new McsError(CODES.INTERNAL, '切换后本体快照未能接管新版本；已回退到原版本。', 500,
        { problems: snapshotProblems, restored: previousRevisionId, step: 'reload', takeover });
    }

    // ---- 记账（下一步才是对外可见的「已发布」） ----
    const result = {
      revision: plan.revision,
      ontologyVersion: plan.source.current().version,
      previousRevision: previousRevisionId,
      diff: diffView(plan),
      steps: PUBLICATION_STEPS.map((step) => ({ ...step, status: 'done' })),
      replay: replay.results,
      integrity: plan.source.integrity(),
      // 第 6 步是怎么判过的：`version-equal`（同盘，最强）或 `content-identical`（跨盘，位置无关指纹）。
      takeover,
      entry: {
        nodes: plan.diff.nodes.added.map((node) => ({ id: node.id, title: node.title, version: node.version })),
        relations: plan.diff.relations.added.map((relation) => ({ id: relation.id, kind: relation.kind, from: relation.from, to: relation.to })),
      },
    };
    authoring.createPublication({
      id: `pub:${written.revisionId}`,
      idempotencyKey: key,
      draftId: plan.draft.id,
      kind: 'publish',
      revision: plan.revision,
      result,
      requestDigest: plan.requestFingerprint,
    });
    const counter = authoring.stats().publications;
    authoring.setActiveRevision(written.revisionId, { revision: counter });
    authoring.publishDraft(plan.draft.id, written.revisionId);
    if (plan.acceptedIds.length) authoring.setReview(plan.run.id, plan.acceptedIds, 'published');
    return result;
  });
}

/* -------------------------------------------------------------------- 回滚 */

/**
 * 回滚请求的指纹：回滚没有草稿与候选清单，能区分「是不是同一次回滚」的只有
 * 「恢复到哪个版本」+ 基线指纹（父版本不进去——空回滚与重复回滚都该命中）。
 */
function rollbackFingerprint(request, wantedRevisionId, source) {
  return fingerprintOf({
    kind: 'rollback',
    restores: wantedRevisionId,
    baseline: baseFingerprint(source.base),
    notes: typeof request.notes === 'string' ? request.notes.slice(0, 2000) : null,
  });
}

/**
 * 回滚：**创建新的一条 revision**，把选中历史版本的内容状态恢复出来。
 *
 * 不删历史包、不删证据、不碰学习者记录（那在另一份库里），只做三件事：
 * 1. 把目标版本的内容原样搬进新包（`kind:'rollback'`，`restores` 指向目标）；
 * 2. 算出「这次回滚让哪些后继新增失效」，并**连带处理**依赖它们的条目——保证
 *    当前公共网络没有悬空引用（解析不到的引用一律摘掉并逐条记账）；
 * 3. 走与发布相同的第 4–6 步（写包、切指针、更新快照）。
 */
export async function rollbackPublication(ctx, request = {}) {
  assertDeclarativeData(request, 'rollback.request');
  const { authoring } = ctx;
  assert(authoring && typeof authoring.createPublication === 'function', CODES.INTERNAL, '回滚需要编写数据库（ctx.authoring）');
  const targetRevisionId = request.revisionId ?? request.target ?? request.restores;
  assert(typeof targetRevisionId === 'string' && targetRevisionId.trim(), CODES.BAD_REQUEST, '回滚需要 revisionId（要恢复的历史版本）');
  const key = typeof request.idempotencyKey === 'string' && request.idempotencyKey.trim() ? request.idempotencyKey.trim().slice(0, 200) : null;
  const wantedId = extensions.assertRevisionId(targetRevisionId);

  if (key) {
    const existing = authoring.findPublicationByIdempotency(key);
    if (existing) {
      const source = await resolveSource(ctx);
      return reusePublication(existing, key, rollbackFingerprint(request, wantedId, source));
    }
  }

  return withWriteLock(ctx, async () => {
    const target = extensionTarget(ctx);
    const source = await resolveSource(ctx);
    if (key) {
      const again = authoring.findPublicationByIdempotency(key);
      if (again) return reusePublication(again, key, rollbackFingerprint(request, wantedId, source));
    }
    const ontology = source.current();
    if (request.ontologyVersion && request.ontologyVersion !== ontology.version) {
      throw new McsError(CODES.VERSION_CONFLICT, '本体版本已变化；请刷新后重新回滚。', 409,
        { expected: ontology.version, received: request.ontologyVersion });
    }

    const pointerBefore = await extensions.readActivePointer(target);
    const currentRevisionId = pointerBefore?.revision ?? null;
    const wanted = wantedId;
    const restored = await extensions.readPackage(target, wanted).catch(() => {
      throw new McsError(CODES.NOT_FOUND, `无法解析要恢复的历史版本：${wanted}`, 404, { revision_id: wanted });
    });
    const verifyTarget = await extensions.verifyPackage(target, wanted);
    if (!verifyTarget.ok) {
      throw new McsError(CODES.INTERNAL, `历史版本自身校验不通过，拒绝用它回滚：${wanted}`, 500, { problems: verifyTarget.problems });
    }

    /*
     * 「回滚到正在生效的版本」是一件**安全的空操作**，不是错误。
     *
     * 目标状态已经达成，什么都不用写；抛错会让网站上的回滚按钮显示成「回滚失败」，
     * 而事实是已经处于用户想要的状态。所以走与「空回滚」同一条路：返回当前版本记录 + idempotent。
     * 真正该报错的只有一种：**目标版本不存在**（上面那句 NOT_FOUND）。
     */
    if (currentRevisionId === wanted) {
      return {
        revision: restored.revision,
        ontologyVersion: ontology.version,
        restoredFrom: wanted,
        previousRevision: currentRevisionId,
        dropped: { nodes: [], relations: [], evidence: [], definitions: [], contracts: [], cascade: [], dangling: [] },
        idempotent: true,
        reason: `版本 ${wanted} 已经是当前生效版本；目标状态已经达成，不重复写入。`,
        note: '空回滚：没有产生新版本，历史包与学习者记录都未改动。',
      };
    }

    const currentContent = currentRevisionId
      ? (await extensions.readPackage(target, currentRevisionId)).package
      : { nodes: [], relations: [], evidence: [], definitions: [], contracts: [], specs: [], pendingRelations: [] };

    // 恢复目标内容；记录「相对当前生效版本少了什么」。
    const content = {
      nodes: [...(restored.package.nodes ?? [])],
      relations: [...(restored.package.relations ?? [])],
      evidence: [...(restored.package.evidence ?? [])],
      definitions: [...(restored.package.definitions ?? [])],
      contracts: [...(restored.package.contracts ?? [])],
    };
    const droppedByKind = {};
    for (const kind of ['nodes', 'relations', 'evidence', 'definitions', 'contracts']) {
      const keep = new Set(content[kind].map((item) => item.id));
      droppedByKind[kind] = (currentContent[kind] ?? []).filter((item) => !keep.has(item.id));
    }

    /*
     * 后继依赖的连带处理：先摘掉「引用了被摘节点」的关系/证据/契约，
     * 再按引用封闭反复扫一遍——摘一条可能让另一条的引用落空。
     */
    const dangling = [];
    for (let round = 0; round < 8; round += 1) {
      const nodeIds = new Set([...(source.base.raw.nodes ?? []).map((node) => node.id), ...content.nodes.map((node) => node.id)]);
      const evidenceIds = new Set(content.evidence.map((record) => record.id));
      const keepRelations = [];
      for (const relation of content.relations) {
        const reasons = [];
        if (!nodeIds.has(relation.from)) reasons.push(`起点 ${relation.from} 不在恢复后的节点集里`);
        if (!nodeIds.has(relation.to)) reasons.push(`终点 ${relation.to} 不在恢复后的节点集里`);
        if (relation.evidenceRef && !evidenceIds.has(relation.evidenceRef)) reasons.push(`引用的证据 ${relation.evidenceRef} 不在恢复后的证据集里`);
        if (reasons.length) dangling.push({ kind: 'relations', id: relation.id, reasons });
        else keepRelations.push(relation);
      }
      const keepEvidence = [];
      for (const record of content.evidence) {
        const missing = (record.nodes ?? []).filter((id) => !nodeIds.has(id));
        if (missing.length) dangling.push({ kind: 'evidence', id: record.id, reasons: [`引用未知节点 ${missing.join('、')}`] });
        else keepEvidence.push(record);
      }
      const keepContracts = [];
      for (const contract of content.contracts) {
        const missing = [...(contract.inputs ?? []), ...(contract.outputs ?? [])].map((port) => port?.node).filter((id) => id && !nodeIds.has(id));
        if (missing.length) dangling.push({ kind: 'contracts', id: contract.id, reasons: [`引用未知节点 ${missing.join('、')}`] });
        else keepContracts.push(contract);
      }
      const changed = keepRelations.length !== content.relations.length
        || keepEvidence.length !== content.evidence.length
        || keepContracts.length !== content.contracts.length;
      content.relations = keepRelations;
      content.evidence = keepEvidence;
      content.contracts = keepContracts;
      if (!changed) break;
    }

    const removedSet = new Set(droppedByKind.nodes.map((node) => node.id));
    const cascade = [...droppedByKind.relations, ...droppedByKind.contracts, ...droppedByKind.evidence]
      .filter((item) => (item.from && removedSet.has(item.from)) || (item.to && removedSet.has(item.to)))
      .map((item) => ({ kind: item.kind ?? null, id: item.id, from: item.from ?? null, to: item.to ?? null }));

    const baseline = baseFingerprint(source.base);
    const pkg = {
      schema: extensions.PACKAGE_SCHEMA,
      parent: currentRevisionId,
      kind: 'rollback',
      restores: wanted,
      baselineFingerprint: baseline,
      reviewDigest: restored.revision.reviewDigest ?? null,
      acceptedCandidateIds: restored.revision.acceptedCandidateIds ?? [],
      dismissedCandidateIds: restored.revision.dismissedCandidateIds ?? [],
      notes: typeof request.notes === 'string' ? request.notes.slice(0, 2000) : (request.notes ?? null),
      nodes: content.nodes,
      relations: content.relations,
      evidence: content.evidence,
      definitions: content.definitions,
      contracts: content.contracts,
      specs: restored.package.specs ?? [],
      pendingRelations: restored.package.pendingRelations ?? [],
      certificates: restored.package.certificates ?? [],
      summary: {
        nodes: content.nodes.length,
        relations: content.relations.length,
        evidence: content.evidence.length,
        definitions: content.definitions.length,
        contracts: content.contracts.length,
      },
      dropped: {
        nodes: droppedByKind.nodes.map((node) => ({ id: node.id, title: node.title ?? null })),
        relations: droppedByKind.relations.map((item) => ({ id: item.id, from: item.from ?? null, to: item.to ?? null })),
        evidence: droppedByKind.evidence.map((item) => ({ id: item.id })),
        definitions: droppedByKind.definitions.map((item) => ({ id: item.id })),
        contracts: droppedByKind.contracts.map((item) => ({ id: item.id })),
        cascade,
        dangling,
      },
    };

    // 证书正文要从目标版本目录里搬过来（历史包不改，新包自带一份）。
    const files = [];
    for (const entry of pkg.certificates) {
      // 包目录只有一处算法（`extensions.packageDirPath`）——回滚这条路径也不例外。
      const sourcePath = join(extensions.packageDirPath(extensions.extensionsRoot(target), wanted), entry.path);
      const { readFile } = await import('node:fs/promises');
      const content2 = await readFile(sourcePath, 'utf8');
      files.push({ path: entry.path, content: content2, sha256: entry.sha256 });
    }

    /*
     * 内容已经就是目标状态 → 这是一次**空回滚**。
     *
     * 直接返回当前生效的那条版本记录（标 idempotent），不再写一个内容相同的新包：
     * 否则「回滚到同一个历史版本」每按一次就多一个一模一样的包，版本表会被噪声填满。
     */
    const sameContent = ['nodes', 'relations', 'evidence', 'definitions', 'contracts'].every(
      (kind) => canonicalString(content[kind]) === canonicalString(currentContent[kind] ?? []),
    );
    if (sameContent && currentRevisionId) {
      const activeMeta = await extensions.readPackage(target, currentRevisionId);
      return {
        revision: activeMeta.revision,
        ontologyVersion: ontology.version,
        restoredFrom: wanted,
        previousRevision: currentRevisionId,
        dropped: { nodes: [], relations: [], evidence: [], definitions: [], contracts: [], cascade: [], dangling: [] },
        idempotent: true,
        reason: '当前生效内容已经就是这个历史版本的状态；不重复写入。',
        note: '空回滚：没有产生新版本，历史包与学习者记录都未改动。',
      };
    }

    pkg.revisionId = extensions.revisionIdFor(pkg);
    pkg.contentHash = extensions.packageHash(pkg);
    const revision = {
      id: pkg.revisionId,
      parent: currentRevisionId,
      createdAt: new Date().toISOString(),
      createdBy: request.createdBy ?? 'local-maintainer',
      kind: 'rollback',
      restores: wanted,
      baselineFingerprint: baseline,
      contentHash: pkg.contentHash,
      packagePath: `data/extensions/${pkg.revisionId}/package.json`,
      summary: { ...pkg.summary },
      reviewDigest: pkg.reviewDigest,
      acceptedCandidateIds: pkg.acceptedCandidateIds,
      dismissedCandidateIds: pkg.dismissedCandidateIds,
      notes: pkg.notes,
      requestFingerprint: rollbackFingerprint(request, wanted, source),
      dropped: pkg.dropped,
    };

    const plan = { source, ontology, pkg, revision, files, problems: [], warnings: [] };
    const { composed } = await composeInIsolation(ctx, plan, revision.id);
    const expectedVersion = composed.instance.version;

    const written = await extensions.writePackage(target, revision, { ...pkg, files });
    const verdict = await extensions.verifyPackage(target, written.revisionId);
    if (!verdict.ok) throw new McsError(CODES.INTERNAL, `回滚包回读校验失败：${written.revisionId}`, 500, { problems: verdict.problems, step: 'write' });

    const pointerNow = await extensions.readActivePointer(target);
    if ((pointerNow?.revision ?? null) !== currentRevisionId) {
      throw new McsError(CODES.CONFLICT, '激活版本在本次回滚过程中被其他写入改变；请重试。', 409,
        { expected: currentRevisionId, current: pointerNow?.revision ?? null, step: 'activate' });
    }
    await extensions.writeActivePointer(target, written.revisionId, { updatedBy: revision.createdBy, note: `rollback:${wanted}` });

    let takeover = null;
    const snapshotProblems = [];
    try {
      await source.reload();
      // 与发布第 6 步同一条判据（同一个函数）：生效 + 指针指向本版本 + 内容同一。
      takeover = verifyTakeover(source, composed.instance.raw, pkg, expectedVersion, written.revisionId);
      snapshotProblems.push(...takeover.problems);
      if (!source.integrity().ok) snapshotProblems.push(...source.integrity().problems);
    } catch (error) {
      snapshotProblems.push(error.message);
    }
    if (snapshotProblems.length) {
      await extensions.writeActivePointer(target, currentRevisionId, { updatedBy: revision.createdBy, note: 'rollback-rollback' }).catch(() => {});
      await source.reload().catch(() => {});
      throw new McsError(CODES.INTERNAL, '回滚后快照未能接管；已恢复到回滚前的版本。', 500,
        { problems: snapshotProblems, restored: currentRevisionId, step: 'reload', takeover });
    }

    const result = {
      revision,
      ontologyVersion: source.current().version,
      restoredFrom: wanted,
      previousRevision: currentRevisionId,
      dropped: pkg.dropped,
      integrity: source.integrity(),
      note: '回滚是新的一条版本记录：历史包、证据与学习者记录都没有删除。',
    };
    authoring.createPublication({
      id: `pub:${written.revisionId}`,
      idempotencyKey: key,
      draftId: null,
      kind: 'rollback',
      revision,
      result,
      requestDigest: revision.requestFingerprint,
    });
    const counter = authoring.stats().publications;
    authoring.setActiveRevision(written.revisionId, { revision: counter });
    return result;
  });
}

/* ------------------------------------------------------------------ 版本表 */

export async function listRevisions(ctx = {}) {
  const target = extensionTarget(ctx);
  const problems = [];
  const revisions = await extensions.listPackages(target, { problems });
  const pointer = await extensions.readActivePointer(target).catch(() => null);
  let integrity = null;
  if (ctx.ontologySource && typeof ctx.ontologySource.integrity === 'function') integrity = ctx.ontologySource.integrity();
  return {
    active: pointer?.revision ?? null,
    activeUpdatedAt: pointer?.updatedAt ?? null,
    revisions: revisions.slice().sort((a, b) => String(b.createdAt ?? '').localeCompare(String(a.createdAt ?? '')) || String(b.id).localeCompare(String(a.id))),
    problems,
    integrity,
    note: '包一旦写入不再修改；回滚产生新的版本记录，不删除历史。',
  };
}

/* ---------------------------------------------------------------- 同源校验 */

/**
 * 写入口只在本机维护模式开放（规格 §7）。
 *
 * `server/api.mjs` 已经在路由层核过 `Origin`，这里再核一次**独立的**判据：
 * 请求的 host 必须是回环。重复不是多余——这一层要能单独被测，
 * 而不是「因为上层查过了」就默认成立。
 */
export function assertLoopbackWrite(originHost, { dev = false } = {}) {
  if (dev) return true;
  const host = String(originHost ?? '').replace(/^\[|\]$/g, '');
  const ok = ['127.0.0.1', 'localhost', '::1'].includes(host);
  if (!ok) throw new McsError(CODES.BAD_REQUEST, '入库的写入口只在本机开放。', 403, { host });
  return true;
}
