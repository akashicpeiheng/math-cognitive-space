/**
 * 本体快照：**基础数据 + 当前激活的扩展包**。
 *
 * ## 为什么要有「快照」这一层
 *
 * 旧写法是「启动时读一份本体，进程活多久就用多久」。有了入库功能之后这行不通了：
 * 入库要把新内容切进公共本体，但不重启进程。这里把「本体」从一个常量变成
 * **有版本的快照源**：
 *
 * - `current()` 每次返回**当时**生效的那一份；`server/index.mjs` /`api.mjs`
 *   在请求进入时取一次并全程复用同一个实例——于是「入库后新请求读新版本、
 *   运行中的任务继续用原版本」不是靠自觉，而是结构上做不到中途换；
 * - 切换版本只换 `active.json` 指针（见 `server/extensions.mjs`），
 *   于是「失败 → 原版本继续生效」退化成「指针没换」。
 *
 * ## 失效检测（启动与每次 reload 都跑）
 *
 * 扩展包记录发布时的**基线指纹**（基础数据的 schema/signature/theory）。
 * 基线变了、包被改过、证书文件丢了、自动关系引用的证据不再是 passed——
 * 这些关系一律标为**待复核**（`needsReview`），不再当作当前已认证的推导。
 * 「读得到」不等于「还算数」，这两件事必须分开。
 */

import { McsError, CODES } from '../shared/errors.mjs';
import { sha256 } from '../core/hash.mjs';
import { loadOntology, createOntology } from '../core/ontology.mjs';
import { join, relative, sep } from 'node:path';
import {
  extensionsRoot, readActivePointer, verifyPackage, listPackages, dirNameFor,
} from './extensions.mjs';

/**
 * 基线指纹只覆盖这三项。
 *
 * 它们一变，所有扩展内容引用的类型与公理就不再是同一套——此时「关系还在」
 * 只是一种表面现象。节点内容或证据的增删不进指纹（那是扩展自己该管的）。
 */
export const BASE_FINGERPRINT_KEYS = Object.freeze(['schema', 'signature', 'theory']);

export function baseFingerprint(ontology) {
  const raw = ontology?.raw ?? ontology;
  if (!raw || typeof raw !== 'object') {
    throw new McsError(CODES.INTERNAL, 'baseFingerprint 需要本体实例或原始本体', 500);
  }
  const picked = {};
  for (const key of BASE_FINGERPRINT_KEYS) picked[key] = raw[key] ?? null;
  return `sha256:${sha256(picked)}`;
}

/** 深拷贝成纯数据：本体是只读输入，合成过程绝不能改到 base 那一份。 */
function clonePlain(value) {
  return JSON.parse(JSON.stringify(value));
}

function duplicateIds(items, key = 'id') {
  const seen = new Set();
  const duplicates = [];
  for (const item of items ?? []) {
    const id = item?.[key];
    if (seen.has(id)) duplicates.push(id);
    seen.add(id);
  }
  return duplicates;
}

/**
 * 纯函数：基础数据 + 内容包 → 新本体实例。
 *
 * 合成顺序刻意做成「先加节点，再加引用节点之物」：关系、证据、契约都要在
 * 节点解析得到的前提下才可能通过形成检查，反过来做只会得到一堆无意义的报错。
 * 包里的每一样都**只做追加**（同 id 冲突直接拒绝，不覆盖），这与「包不可变」是同一条纪律。
 */
export function composePackageOntology(baseRaw, pkg, { repoRoot, extensionsDir = null, validate = true, activeRevision = null } = {}) {
  const raw = clonePlain(baseRaw);
  const problems = [];
  const nodes = raw.nodes ?? [];
  const known = new Set(nodes.map((node) => node.id));
  const additions = pkg?.nodes ?? [];
  for (const id of duplicateIds(additions)) problems.push(`内容包含重复节点：${id}`);
  for (const node of additions) {
    if (known.has(node.id)) problems.push(`内容包想新增已存在的节点：${node.id}（包只能追加，不覆盖）`);
  }
  if (problems.length) {
    throw new McsError(CODES.EXTENSION_INVALID, `内容包与基础数据冲突（${problems.length} 项）`, 500, { problems });
  }

  raw.nodes = [...nodes, ...additions.map((node) => ({ ...node }))];

  // 形式表达登记：节点摘要上的两个标记由这里补齐（规格 §7：只新增字段，不改旧字段含义）。
  const specs = pkg?.specs ?? [];
  raw.formalSpecs = { ...(raw.formalSpecs ?? {}) };
  for (const entry of specs) {
    if (!entry?.node) continue;
    raw.formalSpecs[entry.node] = entry.spec ?? entry;
    const target = raw.nodes.find((node) => node.id === entry.node);
    if (target) {
      target.hasFormalSpec = true;
      target.formalSpecVersion = entry.spec?.theoryVersion ?? entry.version ?? null;
    }
  }

  raw.formalDefinitions = [...(raw.formalDefinitions ?? []), ...(pkg?.definitions ?? [])];
  raw.relationDescriptions = [...(raw.relationDescriptions ?? []), ...(pkg?.relations ?? [])];
  const revisionId = activeRevision ?? pkg?.revisionId ?? null;
  raw.evidence = [...(raw.evidence ?? []), ...(pkg?.evidence ?? []).map((record) => {
    /*
     * 包体内记的是 `certificateFile`（包内相对路径，不含版本号）；
     * 本体的校验器要的是**相对 repoRoot 的仓库路径**，所以在这里补上版本目录。
     * 补在合成期而不是写入期：版本号由内容哈希派生，写进包体就成环了。
     *
     * 两处约定不能各写一份，否则只会在真发布时炸（定义引用没有证书文件，所以迟迟不暴露）：
     * 1. **目录名走 `dirNameFor`**：版本 id 形如 `rev:<hash>`，落盘目录形如 `rev-<hash>`。
     *    直接拼原始 id 会带一个冒号——Windows 上那是 ADS 语法，`mkdir` 直接 ENOENT。
     * 2. **必须相对 `repoRoot`**：`data/extensions/…` 只有在 repoRoot 恰好是 mcs-web 根时才解析得到，
     *    而生产 `repoRoot` 是仓库根；真实位置是 `<仓库根>/mcs-web/data/extensions/…`。
     *    所以先算绝对路径，再相对 repoRoot 表示——隔离区那次（repoRoot 指向暂存根）走同一条规则。
     */
    if (!record.certificateFile || !revisionId) return { ...record };
    const packageDir = extensionsDir
      ? join(extensionsDir, dirNameFor(revisionId))
      : join(repoRoot ?? '.', 'data', 'extensions', dirNameFor(revisionId));
    const absolute = join(packageDir, record.certificateFile);
    const relativePath = repoRoot ? relative(repoRoot, absolute) : absolute;
    return { ...record, certificate: relativePath.split(sep).join('/') };
  })];
  raw.actions = [...(raw.actions ?? []), ...(pkg?.contracts ?? [])];

  const revisionInfo = {
    activeRevision: revisionId,
    parent: pkg?.parent ?? null,
    kind: pkg?.kind ?? 'publish',
    publishedAt: pkg?.createdAt ?? null,
    baselineFingerprint: pkg?.baselineFingerprint ?? null,
    reviewDigest: pkg?.reviewDigest ?? null,
    nodes: (pkg?.nodes ?? []).length,
    relations: (pkg?.relations ?? []).length,
    evidence: (pkg?.evidence ?? []).length,
    definitions: (pkg?.definitions ?? []).length,
    contracts: (pkg?.contracts ?? []).length,
    // 待证关系只在扩展信息里登记，不进 relationDescriptions —— 未证命题不进公共网络。
    pendingRelations: pkg?.pendingRelations ?? [],
    dropped: pkg?.dropped ?? null,
  };
  raw.extension = revisionInfo;

  const instance = createOntology(raw, { validate, repoRoot });
  return { instance, raw, revisionInfo };
}

/**
 * 建立快照源。
 *
 * `dataDir` 是基础数据目录；`extensionsDir` 缺省时落在 `dataDir/extensions`。
 * `repoRoot` 用于校验机器证书的文件是否存在（沿用 `core/ontology.mjs` 的口径）。
 *
 * ## 两类失败，两种处置（P1-2 的核心，2026-10 改）
 *
 * 1. **阻断**（哈希不符 / 缺文件 / 结构非法 / 合成失败 / 指针读不出）→ **拒绝激活这个包**。
 *    它不进 `current()`：内容没生效，就不能算「当前已认证的知识」。异常内容留在
 *    `suspect()` 里供审查，并**逐条**说明问题（哪一项、期望哈希、实测哈希）。
 * 2. **待复核**（基线漂移、证据不再 passed）→ 包仍然生效（内容是完整的、哈希自洽的），
 *    但相关关系标成 `verificationStatus: 'stale'`，并同时登记进
 *    `raw.extension.certified`（**仍然算数**的清单）之外，消费方不必自己记得查标记。
 *
 * `integrity()` 把三类分开放，界面才不会把「没生效」和「生效了但要复核」混成同一句话：
 * `problems`（阻断，包未生效）/ `warnings`（已生效但内容待复核）/ `staleRelations`（已生效、
 * 具体哪些关系待复核）。
 *
 * ## 运行期失败保留上一份有效快照
 *
 * `reload()` 失败时 **`current()` 继续返回上一份有效实例**，而不是掉回基础数据：
 * 别人改坏了盘上的文件，不该让运行中的任务突然少一批知识。启动时还没有「上一份」，
 * 才退回基础数据，并把问题如实报出来。
 */
export async function createOntologySource({ dataDir, extensionsDir = null, repoRoot = null } = {}) {
  if (!dataDir) throw new McsError(CODES.INTERNAL, 'createOntologySource 需要 dataDir', 500);
  const root = extensionsDir ?? extensionsRoot(dataDir);

  const cleanIntegrity = (applied, activeRevision) => ({
    ok: true,
    applied,
    activeRevision,
    problems: [],
    warnings: [],
    staleRelations: [],
    staleEvidence: [],
    rejectedRevision: null,
  });

  /** 全部状态集中在这一个对象里，reload 时整体替换——不留「换了一半」的中间态。 */
  const state = {
    base: null,
    instance: null,
    activeRevision: null,
    applied: false,
    integrity: cleanIntegrity(false, null),
    /** 被拒绝生效的那份内容：供审查，**明确标注未生效**。 */
    suspect: null,
    loadedAt: null,
  };

  /**
   * 标注「已生效但待复核」，返回三类清单。
   *
   * 判断依据是**记录里的检查状态与基线指纹**，不是「它还写在那儿」。被标的关系仍然留在
   * `relationDescriptions` 里（删掉就查不出「曾经登记过」，界面也没法显示「这条现在不算数」），
   * 但 `verificationStatus` 从 `verified` 变成 `stale`，并且**不**进 `certified` 清单——
   * 「已认证推导」从此只有一个来源，消费方不需要记得逐条查标记。
   */
  function markStale(instance, pkg, { baselineDrift }) {
    const warnings = [];
    const staleRelations = [];
    const staleEvidence = [];
    const relationsDetail = [];
    const raw = instance.raw;
    const evidenceById = new Map((pkg?.evidence ?? []).map((record) => [record.id, record]));
    const extensionRelations = pkg?.relations ?? [];
    const extensionRelationIds = new Set(extensionRelations.map((relation) => relation.id));

    /*
     * 证据先判：机器证书没通过检查，或者基线指纹变了（旧认证绑的那套类型与公理已经不是同一套），
     * 这条证据就不算数。判断依据是**记录里的检查状态**，不是「它还在文件里」。
     */
    for (const record of pkg?.evidence ?? []) {
      const machine = record.kind === 'machine-certificate';
      const failed = machine && record.checkStatus !== 'passed';
      if (!failed && !baselineDrift) continue;
      staleEvidence.push(record.id);
      warnings.push(`证据 ${record.id} 待复核：${failed ? `检查状态为 ${record.checkStatus}` : '基线指纹已变化'}`);
    }

    for (const relation of raw.relationDescriptions) {
      if (!extensionRelationIds.has(relation.id)) continue;
      const evidenceId = relation.evidenceRef ?? relation.witness?.ref ?? null;
      const record = evidenceId ? evidenceById.get(evidenceId) : null;
      const reasons = [];
      if (baselineDrift) reasons.push('基础数据的 schema/签名/理论已变化，旧认证不再自动作数');
      if (evidenceId && !record) reasons.push(`引用的证据不在本内容包内：${evidenceId}`);
      if (record && record.checkStatus !== 'passed' && record.kind === 'machine-certificate') reasons.push(`证据检查状态为 ${record.checkStatus}`);
      if (relation.origin === 'auto-discovery' && !evidenceId && relation.witness?.type !== 'definitional-dependency') {
        reasons.push('自动发现的关系缺少证据引用');
      }
      if (reasons.length === 0) continue;
      relation.needsReview = true;
      relation.reviewNote = reasons.join('；');
      relation.verificationStatus = 'stale';
      staleRelations.push(relation.id);
      relationsDetail.push({ ...relation });
      warnings.push(`关系 ${relation.id} 待复核：${relation.reviewNote}`);
    }

    const staleRelationSet = new Set(staleRelations);
    const staleEvidenceSet = new Set(staleEvidence);
    return {
      warnings,
      staleRelations,
      staleEvidence,
      relationsDetail,
      certifiedRelations: extensionRelations.map((relation) => relation.id).filter((id) => !staleRelationSet.has(id)),
      certifiedEvidence: (pkg?.evidence ?? []).map((record) => record.id).filter((id) => !staleEvidenceSet.has(id)),
    };
  }

  async function load() {
    const base = await loadOntology({ dataDir, repoRoot });
    /*
     * 上一份**生效中**的实例（启动时为 null）。拒绝路径要用它，而且要在替换 state.base 之前取。
     */
    const previous = state.instance ?? base;
    const previousRevision = state.activeRevision;
    const previousApplied = state.applied;
    const previousIntegrity = state.integrity;
    state.base = base;

    /**
     * 拒绝生效：**不动生效中的实例**，只把问题如实记下来。
     * 上一份的待复核信息继续挂着——它描述的是仍在生效的那一份内容。
     */
    const reject = ({ problems, suspect = null, rejectedRevision = null }) => {
      state.instance = previous;
      state.applied = previousApplied;
      state.activeRevision = previousRevision;
      state.suspect = suspect;
      state.integrity = {
        ok: false,
        applied: previousApplied,
        activeRevision: previousRevision,
        problems: [...problems],
        warnings: [...previousIntegrity.warnings],
        staleRelations: [...previousIntegrity.staleRelations],
        staleEvidence: [...previousIntegrity.staleEvidence],
        rejectedRevision,
      };
      state.loadedAt = new Date().toISOString();
      return state.instance;
    };

    let pointer;
    try {
      pointer = await readActivePointer({ extensionsDir: root });
    } catch (error) {
      return reject({ problems: [`激活索引读取失败：${error.message}`] });
    }
    if (!pointer || !pointer.revision) {
      // 没有激活的扩展：基础数据生效，且是干净状态（不是「有问题」）。
      state.instance = base;
      state.applied = false;
      state.activeRevision = null;
      state.suspect = null;
      state.integrity = cleanIntegrity(false, null);
      state.loadedAt = new Date().toISOString();
      return state.instance;
    }

    const revisionId = pointer.revision;
    let verdict;
    try {
      verdict = await verifyPackage({ extensionsDir: root }, revisionId);
    } catch (error) {
      return reject({ problems: [`内容包校验无法执行：${error.message}`], rejectedRevision: revisionId });
    }
    if (!verdict.ok || !verdict.package) {
      /*
       * 这是 P1-2 的修复点：**校验失败就是拒绝生效**，不是一条警告。
       * 从前这里把 problems 记下来却继续合成，于是「哈希对不上」的内容照样成了已认证知识。
       */
      const problems = verdict.problems.length > 0
        ? verdict.problems.map((item) => `内容包校验：${item}`)
        : ['内容包校验失败（没有给出具体问题）'];
      return reject({
        problems,
        suspect: {
          revision: revisionId,
          code: CODES.EXTENSION_INVALID,
          problems: [...verdict.problems],
          package: verdict.package ?? null,
          effective: false,
          note: '这份内容**未生效**：完整性校验没过，只能供审查，不能当当前本体。',
          at: new Date().toISOString(),
        },
        rejectedRevision: revisionId,
      });
    }

    const pkg = verdict.package;
    const currentFingerprint = baseFingerprint(base);
    const baselineDrift = Boolean(pkg.baselineFingerprint)
      && pkg.baselineFingerprint !== currentFingerprint;
    const warnings = [];
    if (baselineDrift) warnings.push('内容包的基线指纹与当前基础数据不一致：扩展内容待复核（内容生效，但不作为已认证推导）。');

    try {
      const { instance } = composePackageOntology(base.raw, pkg, {
        repoRoot, extensionsDir: root, validate: true, activeRevision: revisionId,
      });
      const stale = markStale(instance, pkg, { baselineDrift });
      instance.raw.extension.stale = {
        relations: stale.staleRelations,
        evidence: stale.staleEvidence,
        // 被标为待复核的完整记录：维护界面要能逐条看「当初登记的是什么」，又不必把它们留在公共网络里。
        relationsDetail: stale.relationsDetail,
      };
      instance.raw.extension.certified = {
        relations: stale.certifiedRelations,
        evidence: stale.certifiedEvidence,
      };
      const allWarnings = [...warnings, ...stale.warnings];
      state.instance = instance;
      state.applied = true;
      state.activeRevision = revisionId;
      state.suspect = null;
      state.integrity = {
        ok: allWarnings.length === 0,
        applied: true,
        activeRevision: revisionId,
        problems: [],
        warnings: allWarnings,
        staleRelations: stale.staleRelations,
        staleEvidence: stale.staleEvidence,
        rejectedRevision: null,
      };
    } catch (error) {
      // 合成失败 = 这个包装不上：拒绝生效（保留上一份），并把包本身留给审查。
      return reject({
        problems: [`内容包无法合成：${error.message}`],
        suspect: {
          revision: revisionId,
          code: CODES.EXTENSION_INVALID,
          problems: [error.message, ...(error.details?.problems ?? [])],
          package: pkg,
          effective: false,
          note: '这份内容**未生效**：与基础数据合成失败，只能供审查。',
          at: new Date().toISOString(),
        },
        rejectedRevision: revisionId,
      });
    }
    state.loadedAt = new Date().toISOString();
    return state.instance;
  }

  await load();

  return {
    get base() { return state.base; },
    current() { return state.instance; },
    async reload() { return load(); },
    activeRevision() { return state.activeRevision; },
    applied() { return state.applied; },
    /**
     * 完整性三分：`problems`（阻断，包未生效）/ `warnings`（已生效但待复核）/
     * `staleRelations`（已生效但被标为待复核的关系 id）。
     */
    integrity() {
      return {
        ...state.integrity,
        problems: [...state.integrity.problems],
        warnings: [...state.integrity.warnings],
        staleRelations: [...state.integrity.staleRelations],
        staleEvidence: [...state.integrity.staleEvidence],
      };
    },
    /** 被拒绝生效的那份内容（供维护界面审查）；没有拒绝过就是 null。 */
    suspect() { return state.suspect; },
    /**
     * 明确要求「扩展已经生效且没有阻断问题」，否则抛 `EXTENSION_INVALID`。
     *
     * 给「不能带着坏包继续跑」的调用方用：它把 `integrity().problems` 从一句状态
     * 变成一条错误，错误码与 `ONTOLOGY_INVALID`（基础数据坏了）分开。
     */
    assertUsable() {
      if (state.integrity.problems.length === 0) return state.instance;
      throw new McsError(
        CODES.EXTENSION_INVALID,
        `扩展内容未生效：${state.integrity.problems[0]}`,
        500,
        {
          revision: state.suspect?.revision ?? state.integrity.rejectedRevision ?? null,
          problems: [...state.integrity.problems],
          applied: state.applied,
          activeRevision: state.activeRevision,
        },
      );
    },
    /**
     * 隔离区试算：内容包 + 基础数据 → 新本体（不落盘、不改当前状态）。
     * 发布事务第 3 步就是用它，`repoRoot` 允许指向暂存目录，
     * 这样「新写的证书还没落盘」也能被同一条校验规则检查。
     */
    applyPackage(pkg, { repoRoot: overrideRoot = repoRoot, extensionsDir: overrideExtensionsDir = root, validate = true } = {}) {
      const { instance, revisionInfo } = composePackageOntology(state.base.raw, pkg, {
        repoRoot: overrideRoot, extensionsDir: overrideExtensionsDir, validate, activeRevision: pkg?.revisionId ?? null,
      });
      return { instance, revision: revisionInfo };
    },

    /** 快照自述（写入扩展信息之前的那份「基础 + 扩展」计数，接口层用得上）。 */
    info() {
      const raw = state.instance.raw;
      return {
        version: state.instance.version,
        contentHash: state.instance.contentHash,
        builtAt: state.instance.builtAt,
        activeExtension: state.applied ? state.activeRevision : null,
        baseFingerprint: baseFingerprint(state.base),
        counts: state.instance.stats().counts,
        extension: raw.extension ?? { activeRevision: null, revisions: 0, nodes: 0 },
        // 三类分开报：界面必须能区分「没生效」与「生效了但要复核」。
        integrity: {
          ok: state.integrity.ok,
          applied: state.integrity.applied,
          problems: state.integrity.problems.length,
          warnings: state.integrity.warnings.length,
          staleRelations: state.integrity.staleRelations.length,
          rejectedRevision: state.integrity.rejectedRevision,
        },
      };
    },
    async revisions() {
      const problems = [];
      const revisions = await listPackages({ extensionsDir: root }, { problems });
      return { revisions, problems };
    },
  };
}
