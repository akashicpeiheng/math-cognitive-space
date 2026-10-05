/**
 * tests/snapshot-integrity.mjs —— 快照完整性「失败即拒绝」与「默认接入动态快照」的验收。
 *
 * 对应 task-10（上一轮验收反馈第 2、7 条，都属可信性问题）：
 *
 * - **第 2 条**：改坏隔离扩展包里一条关系的端点、不更新哈希，从前系统**报告哈希错误却仍加载该包**，
 *   关系仍是 `verified`、待复核列表为空。现在必须**拒绝生效**：内容不进 `current()`，
 *   问题逐条列出（哪一项、期望哈希、实测哈希），被拒绝的包留在 `suspect` 里供审查。
 * - **第 7 条**：新增节点发布返回成功、网站却查不到。默认启动**没有**创建动态快照源。
 *   现在 `startServer` 缺省就接上快照源，发布后经**真实 HTTP** 应能读到新节点。
 *
 * ## 验收点与本文的落点
 *
 * | C 节 | 用例 |
 * |---|---|
 * | C-1 改坏包 → 拒绝生效 + 期望/实测哈希 + 不进 current() + suspect | `快照完整性：内容包被改坏…` |
 * | C-2 待复核的关系不再当作已认证推导 | `待复核不是阻断：…` |
 * | C-3 全新节点 → 真实 HTTP 200 且版本变了 | `默认启动接入快照源…` + `真实 HTTP 读新节点…` |
 * | C-4 重启后仍在 | `重启后扩展仍激活…` |
 * | C-5 回到上一份有效版本后不含被改坏的内容 | `回到基础版本（回滚）后…` |
 *
 * ## 为什么真实 HTTP 里也有"版本已切换"的先决断言
 *
 * `handle()` 的信封 `ontologyVersion` 取的是 `requestOntology()`（**当前**快照），而
 * `api.mjs` 的旧读路由（`/api/v2/ontology/nodes/:id` 等）捕获的是 `createApi` 时的**启动快照**。
 * 两者不一致本身就是第 7 条 bug 的可核形式：信封说新版本、`data` 却查不到新节点，就是自相矛盾。
 * 因此本文件把两件事分开断言——
 *
 * 1. **快照层与信封层**（本任务已交付）：版本变了、`formal/catalog` 看得到新扩展；
 * 2. **旧读路由的 `data`**（需要 `api.mjs` 把读路由改成 `requestOntology()`）：必须 200 且
 *    `data.version` 与信封一致。
 *
 * 第 2 条在 Lead 接线之前**故意保持红**：一条绿色测试掩盖"网站读不到新本体"，
 * 正是这两条 P1 当初能溜过去的原因。
 *
 * ## 测试环境里为什么没有扩展包
 *
 * 仓库里 `data/extensions/` 目前不存在，所以"默认接入快照源"在既有测试里等价于
 * 「只有基础数据」：`counts.nodes` 仍是 232，`tests/api.test.mjs` 不受影响。
 * 本文件自带临时扩展目录，不去动 `data/` 下的公共内容。
 */

import { after, test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, parse, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { startServer } from '../server/index.mjs';
import { createOntologySource } from '../server/snapshot.mjs';
import { JobManager } from '../server/jobs.mjs';
import * as extensions from '../server/extensions.mjs';
import { loadConfig } from '../server/config.mjs';
import { CODES, isRecoverableCode } from '../shared/errors.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const MCS_WEB_ROOT = resolve(HERE, '..');
const REPO_ROOT = resolve(MCS_WEB_ROOT, '..');
const DATA_DIR = join(MCS_WEB_ROOT, 'data');

const BACKGROUND = [
  { entryId: 'b1', node: 'bg:real:metric', provides: ['statement', 'definition'], kind: 'confirmed' },
  { entryId: 'b2', node: 'bg:logic:quantifier', provides: ['statement'], kind: 'confirmed' },
];

const tempRoots = [];
const openHandles = [];

after(async () => {
  for (const handle of openHandles.splice(0)) await shutdown(handle);
  for (const dir of tempRoots.splice(0)) rmSync(dir, { recursive: true, force: true });
});

function tempRoot(name) {
  const dir = mkdtempSync(join(tmpdir(), `mcs-snapshot-${name}-`));
  tempRoots.push(dir);
  return dir;
}

/* ------------------------------------------------------------------ 夹具 */

/** 一个「只有基础数据」的服务配置：扩展目录与数据库都在临时目录里（公共 data/ 一个字节都不动）。 */
function makeConfig({ extensionsDir, dbFile, authoringDbFile, staticDir }) {
  const base = loadConfig();
  return {
    ...base,
    host: '127.0.0.1',
    port: 0,
    dev: true,
    dataDir: DATA_DIR,
    extensionsDir,
    dbFile,
    authoringDbFile,
    repoRoot: REPO_ROOT,
    staticDir: staticDir ?? base.staticDir,
  };
}

/** 默认启动（**不传** `ontologySource`：这正是第 7 条要验的那条默认路径）。 */
async function bootServer(config) {
  const handle = await startServer({ config });
  openHandles.push(handle);
  return handle;
}

async function shutdown(handle) {
  if (!handle) return;
  const index = openHandles.indexOf(handle);
  if (index >= 0) openHandles.splice(index, 1);
  try { handle.jobs.close(); } catch { /* 已关 */ }
  try { await handle.db.close(); } catch { /* 已关 */ }
  await new Promise((resolvePromise) => handle.server.close(resolvePromise));
}

async function jsonCall(origin, path, { method = 'GET', body } = {}) {
  const response = await fetch(origin + path, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const payload = await response.json();
  return { status: response.status, payload };
}

/**
 * 一个最小但**合法**的内容包：一个新节点 + 一条指向它的关系 + 一条证据。
 * 形状与 `tests/formal-authoring-api.test.mjs` 的夹具一致（同一套本体校验要能过）。
 */
function fixture({ suffix, baselineFingerprint = null, relationTo = null }) {
  const nodeId = `ext:snapshot-probe-${suffix}`;
  const relationId = `rel:snapshot-probe-${suffix}`;
  const evidenceId = `ev:snapshot-probe-${suffix}`;
  const pkg = {
    schema: extensions.PACKAGE_SCHEMA,
    parent: null,
    kind: 'publish',
    restores: null,
    baselineFingerprint,
    reviewDigest: `snapshot-integrity/${suffix}`,
    acceptedCandidateIds: [],
    dismissedCandidateIds: [],
    notes: null,
    nodes: [{
      id: nodeId,
      version: '1',
      construct: 'Concept',
      roles: ['Concept'],
      title: `快照探针 ${suffix}`,
      discipline: '群论',
      granularity: 'unit',
      case: 'group',
      summary: '',
      formal: {},
      teaching: { evidenceStatus: 'NOT-CLAIMED' },
      provenance: { sources: [] },
      contentRef: false,
      contentMarkdown: '',
    }],
    relations: [{
      id: relationId,
      kind: 'definitionReference',
      from: relationTo ?? 'group:group-concept',
      to: nodeId,
      version: '1',
      witness: { type: 'declared', status: 'DEF' },
      evidenceRef: evidenceId,
      origin: 'auto-discovery',
      verificationStatus: 'verified',
    }],
    evidence: [{
      id: evidenceId,
      kind: 'reference',
      status: 'DEF',
      checkStatus: 'not_run',
      title: '快照探针',
      scope: '快照层',
      nodes: ['group:group-concept', nodeId],
      checkerVerified: false,
    }],
    definitions: [],
    contracts: [],
    specs: [],
    pendingRelations: [],
    certificates: [],
    summary: { nodes: 1, relations: 1, evidence: 1, definitions: 0, contracts: 0 },
  };
  const revisionId = extensions.revisionIdFor(pkg);
  const revision = {
    id: revisionId,
    parent: null,
    createdAt: new Date().toISOString(),
    createdBy: 'snapshot-integrity-test',
    kind: 'publish',
    restores: null,
    baselineFingerprint,
    contentHash: extensions.packageHash(pkg),
    packagePath: `data/extensions/${revisionId}/package.json`,
    summary: pkg.summary,
    reviewDigest: pkg.reviewDigest,
    acceptedCandidateIds: [],
    dismissedCandidateIds: [],
    notes: null,
  };
  return { pkg, revision, revisionId, nodeId, relationId, evidenceId };
}

/** 落盘一个内容包并把它切成激活版本（发布事务第 4–5 步的**结果状态**）。 */
async function publish(extensionsDir, record) {
  await extensions.writePackage({ extensionsDir }, record.revision, record.pkg);
  await extensions.writeActivePointer({ extensionsDir }, record.revisionId);
  return record.revisionId;
}

async function waitForJob(handle, id, { attempts = 60, delayMs = 100 } = {}) {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const job = handle.jobs.get(id);
    if (job.status !== 'running') return job;
    await new Promise((resolvePromise) => setTimeout(resolvePromise, delayMs));
  }
  throw new Error(`规划任务 ${id} 在限定时间内没有结束`);
}

/* --------------------------------------------------- C-1 / C-5：失败即拒绝 */

test('快照完整性：内容包被改坏（不更新哈希）→ 拒绝生效、保留上一份有效实例、坏内容不进 current()', async () => {
  const root = tempRoot('tamper');
  const extensionsDir = join(root, 'extensions');
  const source = await createOntologySource({ dataDir: DATA_DIR, extensionsDir, repoRoot: REPO_ROOT });
  const baseVersion = source.current().version;
  assert.equal(source.applied(), false, '还没有扩展包时是基础数据');
  assert.deepEqual(source.integrity().problems, []);

  // 1) 先发布并激活一个**合法**包：它才是「上一份有效实例」。
  const good = fixture({ suffix: 'good' });
  const revisionId = await publish(extensionsDir, good);
  await source.reload();
  assert.equal(source.applied(), true);
  assert.equal(source.activeRevision(), revisionId);
  const goodVersion = source.current().version;
  assert.notEqual(goodVersion, baseVersion, '扩展生效后版本必须变（版本是内容哈希）');
  assert.equal(source.current().maybeNode(good.nodeId).title, '快照探针 good');
  assert.deepEqual(source.integrity().problems, []);
  assert.deepEqual(source.integrity().warnings, []);
  assert.equal(source.suspect(), null);

  // 2) 手工改坏那条关系的端点，**不更新任何哈希**（复现里的做法）。
  const packageFile = join(extensionsDir, extensions.dirNameFor(revisionId), extensions.PACKAGE_FILE);
  const originalBytes = readFileSync(packageFile, 'utf8');
  const tampered = JSON.parse(originalBytes);
  tampered.relations[0].to = 'group:perm';
  writeFileSync(packageFile, `${JSON.stringify(tampered, null, 2)}\n`, 'utf8');

  // 3) reload：完整性失败 → 拒绝生效。
  await source.reload();
  const integrity = source.integrity();
  assert.equal(integrity.ok, false, '完整性失败必须让 ok 变 false');
  assert.ok(integrity.problems.length > 0);
  assert.deepEqual(integrity.warnings, [], '这是阻断类问题，不是「已生效但待复核」');
  assert.equal(integrity.rejectedRevision, revisionId);
  assert.equal(source.applied(), true, '运行期失败要保留上一份**有效**实例（不能掉回基础数据）');
  assert.equal(source.current().version, goodVersion, '生效的还是上一份那份内容');

  // 问题里要有**期望哈希与实测哈希**，而且要点名是哪一项。
  const hashProblem = integrity.problems.find((item) => item.includes('内容哈希不符'));
  assert.ok(hashProblem, `问题里要有内容哈希不符：${integrity.problems.join('；')}`);
  assert.match(hashProblem, /meta=sha256:[0-9a-f]{64} 实算=sha256:[0-9a-f]{64}/);
  const itemProblem = integrity.problems.find((item) => item.includes(good.relationId));
  assert.ok(itemProblem, `问题里要点名被改坏的关系：${integrity.problems.join('；')}`);
  assert.match(itemProblem, /期望哈希 sha256:[0-9a-f]{64}，实测哈希 sha256:[0-9a-f]{64}/);

  // 被改坏的内容不在 current() 里：生效的还是上一份（端点没被改过）。
  const live = source.current().raw.relationDescriptions.find((relation) => relation.id === good.relationId);
  assert.ok(live, '上一份里这条关系还在');
  assert.equal(live.to, good.nodeId, '端点仍是原来那个');
  assert.notEqual(live.to, 'group:perm', '被改坏的端点不得进入当前本体');
  assert.equal(live.verificationStatus, 'verified');

  // suspect：异常内容供审查，并**明确标注未生效**。
  const suspect = source.suspect();
  assert.ok(suspect, '被拒绝的包要留在 suspect 里');
  assert.equal(suspect.revision, revisionId);
  assert.equal(suspect.effective, false);
  assert.equal(suspect.code, CODES.EXTENSION_INVALID);
  assert.ok(suspect.problems.length > 0);
  assert.equal(suspect.package.relations[0].to, 'group:perm', 'suspect 里能看到被改坏的那一格');
  assert.match(suspect.note, /未生效/);

  // 明确要求「扩展已生效且无阻断」时，必须抛 EXTENSION_INVALID（与 ONTOLOGY_INVALID 分开）。
  assert.throws(() => source.assertUsable(), (error) => error.code === CODES.EXTENSION_INVALID
    && error.details.revision === revisionId
    && error.details.problems.length > 0);
  // 错误码是「不可恢复」那一类：改请求没有用，得先把包修好。
  assert.equal(isRecoverableCode(CODES.EXTENSION_INVALID), false);
  assert.equal(isRecoverableCode(CODES.ONTOLOGY_INVALID), false);

  // 4) 把包按原字节改回来 → reload → 又生效（绊线是内容，不是「一次失败终身失败」）。
  writeFileSync(packageFile, originalBytes, 'utf8');
  await source.reload();
  assert.deepEqual(source.integrity().problems, []);
  assert.equal(source.integrity().ok, true);
  assert.equal(source.suspect(), null);
  assert.equal(source.applied(), true);
});

test('启动时没有上一份有效实例：退回基础数据，问题逐条列出且标为未生效', async () => {
  const root = tempRoot('startup-broken');
  const extensionsDir = join(root, 'extensions');
  // 指向一个不存在的版本目录：包根本读不出来。
  await extensions.writeActivePointer({ extensionsDir }, 'rev:0000000000000000');

  const source = await createOntologySource({ dataDir: DATA_DIR, extensionsDir, repoRoot: REPO_ROOT });
  assert.equal(source.applied(), false);
  assert.equal(source.activeRevision(), null, '没有生效的扩展');
  assert.equal(source.current().version, source.base.version, '启动时退回基础数据');
  assert.equal(source.integrity().ok, false);
  assert.ok(source.integrity().problems.length > 0);
  // 读不出包时没有「包」可供审查，但仍要如实记下被拒绝的版本号。
  assert.equal(source.integrity().rejectedRevision, 'rev:0000000000000000');
});

/* ------------------------------------------------- C-2：待复核 ≠ 阻断 */

test('待复核不是阻断：基线漂移的包仍然生效，但关系不进「已认证」清单', async () => {
  const root = tempRoot('drift');
  const extensionsDir = join(root, 'extensions');
  const source = await createOntologySource({ dataDir: DATA_DIR, extensionsDir, repoRoot: REPO_ROOT });

  // 基线指纹与当前基础数据不一致：内容完整、可以装上，但「还算不算数」要打问号。
  const drifted = fixture({ suffix: 'drift', baselineFingerprint: `sha256:${'b'.repeat(64)}` });
  await publish(extensionsDir, drifted);
  await source.reload();

  const integrity = source.integrity();
  assert.equal(source.applied(), true, '包能装上（哈希自洽），问题只在「还算不算数」');
  assert.equal(integrity.ok, false, '有待复核项时 ok 仍为 false（不能对外说一切正常）');
  assert.deepEqual(integrity.problems, [], '待复核是 warnings，不是阻断：包没有失效');
  assert.ok(integrity.warnings.some((item) => item.includes('基线指纹')), integrity.warnings.join('；'));
  assert.deepEqual(integrity.staleRelations, [drifted.relationId]);
  assert.deepEqual(integrity.staleEvidence, [drifted.evidenceId]);

  // 已生效但待复核：关系留在公共列表里（界面要显示「这条不算数了」），但状态不是 verified。
  const relation = source.current().raw.relationDescriptions.find((item) => item.id === drifted.relationId);
  assert.equal(relation.needsReview, true);
  assert.equal(relation.verificationStatus, 'stale');
  assert.match(relation.reviewNote, /schema\/签名\/理论已变化/);

  // 「已认证推导」只有一个来源：extension.certified。待复核的关系**不在**这里面。
  const extension = source.current().raw.extension;
  assert.deepEqual(extension.stale.relations, [drifted.relationId]);
  assert.ok(Array.isArray(extension.stale.relationsDetail) && extension.stale.relationsDetail.length === 1,
    '待复核的完整记录要留给维护界面');
  assert.ok(!extension.certified.relations.includes(drifted.relationId), '待复核的关系不得进入已认证清单');
  assert.deepEqual(extension.certified.evidence, [], '证据也被标为待复核');
});

/* ------------------------------- C-3 / C-4：默认接入动态快照 + 真实 HTTP */

test('默认启动接入快照源：发布新节点后 HTTP 层的本体版本已切换（信封 + 快照感知路由）', async () => {
  const root = tempRoot('default-source');
  const extensionsDir = join(root, 'extensions');
  const config = makeConfig({ extensionsDir, dbFile: join(root, 'mcs-web.sqlite3'), authoringDbFile: join(root, 'authoring.sqlite3') });
  const handle = await bootServer(config);
  try {
    // 默认启动就必须有快照源（第 7 条的根因就是这里为 null）。
    assert.ok(handle.ontologySource, 'startServer 缺省要创建并接入快照源');
    assert.equal(typeof handle.ontologySource.reload, 'function');

    const before = await jsonCall(handle.origin, '/api/v2/health');
    const beforeVersion = before.payload.ontologyVersion;
    assert.equal(beforeVersion, handle.ontologySource.current().version);

    // 发布一个新节点（写包 → 切指针 → reload：发布事务第 4–6 步的结果状态，见文件头注释）。
    const record = fixture({ suffix: 'http' });
    const revisionId = await publish(extensionsDir, record);
    await handle.ontologySource.reload();

    const afterVersion = handle.ontologySource.current().version;
    assert.notEqual(afterVersion, beforeVersion, '切了激活版本，本体版本必须变');

    // 信封版本（requestOntology）与快照感知的新路由：这两条是本任务交付的。
    const catalog = await jsonCall(handle.origin, '/api/v2/formal/catalog');
    assert.equal(catalog.status, 200);
    assert.equal(catalog.payload.ontologyVersion, afterVersion, '信封版本应取当前快照');
    assert.equal(catalog.payload.data.extension.activeRevision, revisionId);
    assert.equal(catalog.payload.data.extension.nodes, 1);
    assert.equal(handle.ontologySource.activeRevision(), revisionId);

    // 快照层能解析这个节点（HTTP 之外的同一份事实）。
    assert.equal(handle.getOntology().maybeNode(record.nodeId).title, '快照探针 http');
  } finally {
    await shutdown(handle);
  }
});

test('真实 HTTP 读新节点必须 200，且 data.version 与信封一致（C-3 硬判据，需 api.mjs 接线）', async () => {
  const root = tempRoot('http-node');
  const extensionsDir = join(root, 'extensions');
  const config = makeConfig({ extensionsDir, dbFile: join(root, 'mcs-web.sqlite3'), authoringDbFile: join(root, 'authoring.sqlite3') });
  const handle = await bootServer(config);
  try {
    const record = fixture({ suffix: 'node' });
    await publish(extensionsDir, record);
    await handle.ontologySource.reload();
    const version = handle.ontologySource.current().version;

    const detail = await jsonCall(handle.origin, `/api/v2/ontology/nodes/${encodeURIComponent(record.nodeId)}`);
    /*
     * 这两条是第 7 条的直接判据。它们依赖 api.mjs 把**旧读路由**从启动快照换成
     * `requestOntology()`（该文件归 task-9，Lead 已确认接线）。在接线之前这里会红：
     * 信封说新版本、data 却查不到新节点 —— 这个自相矛盾本身就是要修的东西。
     */
    assert.equal(
      detail.status,
      200,
      `发布后经真实 HTTP 查新节点应为 200，实际 ${detail.status}（${JSON.stringify(detail.payload?.error ?? {})}）：`
      + 'api.mjs 的 /api/v2/ontology/nodes/:id 仍读 createApi 时的启动快照，需改用 requestOntology()。',
    );
    assert.equal(detail.payload.data.node.id, record.nodeId);
    assert.equal(detail.payload.ontologyVersion, version, '信封版本必须是切换后的');
    assert.equal(detail.payload.data.version, detail.payload.ontologyVersion, 'data.version 与信封必须一致（否则就是自相矛盾）');

    // 列表路由同理：新节点应当出现在节点列表里（同一条接线点）。
    const list = await jsonCall(handle.origin, '/api/v2/ontology/nodes?granularity=all&limit=500');
    const ids = list.payload.data.nodes.map((node) => node.id);
    assert.ok(ids.includes(record.nodeId), '新节点应出现在节点列表里（api.mjs 接线点）');
  } finally {
    await shutdown(handle);
  }
});

test('重启后扩展仍激活、新节点仍可查（C-4）', async () => {
  /*
   * 注意这条**为什么现在就是绿的**：旧读路由捕获的是 `createApi` 时刻的启动快照，
   * 而重启后「启动时」已经包含这个扩展包 —— 所以重启能查到、发布后不重启查不到。
   * 这不是矛盾，正是第 7 条的病灶：版本切换只对**之后新建的读取路径**生效，
   * 已经建好的那条（进程活多久用多久）永远停在启动那一刻。
   */
  const root = tempRoot('restart');
  const extensionsDir = join(root, 'extensions');
  const dbFile = join(root, 'mcs-web.sqlite3');
  const authoringDbFile = join(root, 'authoring.sqlite3');

  const first = await bootServer(makeConfig({ extensionsDir, dbFile, authoringDbFile }));
  const record = fixture({ suffix: 'restart' });
  const revisionId = await publish(extensionsDir, record);
  await first.ontologySource.reload();
  const version = first.ontologySource.current().version;
  await shutdown(first);

  const second = await bootServer(makeConfig({ extensionsDir, dbFile, authoringDbFile }));
  try {
    assert.equal(second.ontologySource.activeRevision(), revisionId, '重启后激活版本要读回来');
    assert.equal(second.ontologySource.applied(), true);
    assert.equal(second.ontologySource.current().version, version);
    assert.deepEqual(second.ontologySource.integrity().problems, []);
    assert.ok(second.getOntology().maybeNode(record.nodeId), '重启后新节点仍在本体里');

    const catalog = await jsonCall(second.origin, '/api/v2/formal/catalog');
    assert.equal(catalog.payload.data.extension.activeRevision, revisionId);

    const detail = await jsonCall(second.origin, `/api/v2/ontology/nodes/${encodeURIComponent(record.nodeId)}`);
    assert.equal(detail.status, 200, `重启后读新节点应为 200，实际 ${detail.status}（api.mjs 接线点）`);
  } finally {
    await shutdown(second);
  }
});

/* ------------------------------------------- C-5：回滚后不含被改坏的内容 */

test('回到基础版本（回滚）后：current() 不含扩展内容，integrity 恢复干净', async () => {
  const root = tempRoot('rollback');
  const extensionsDir = join(root, 'extensions');
  const source = await createOntologySource({ dataDir: DATA_DIR, extensionsDir, repoRoot: REPO_ROOT });
  const baseVersion = source.current().version;

  const record = fixture({ suffix: 'rollback' });
  await publish(extensionsDir, record);
  await source.reload();
  assert.equal(source.applied(), true);
  assert.ok(source.current().maybeNode(record.nodeId));

  // 回滚 = 把生效指针切回「没有扩展」，不是删历史包。
  await extensions.writeActivePointer({ extensionsDir }, null);
  await source.reload();
  assert.equal(source.applied(), false);
  assert.equal(source.activeRevision(), null);
  assert.equal(source.current().version, baseVersion);
  assert.equal(source.current().maybeNode(record.nodeId), null, '回滚后扩展节点不再可解析');
  assert.equal(source.current().raw.relationDescriptions.some((item) => item.id === record.relationId), false);
  assert.deepEqual(source.integrity(), {
    ok: true,
    applied: false,
    activeRevision: null,
    problems: [],
    warnings: [],
    staleRelations: [],
    staleEvidence: [],
    rejectedRevision: null,
  });
  // 历史包还在（回滚不删东西），只是没生效。
  const revisions = await source.revisions();
  assert.ok(revisions.revisions.some((item) => item.id === record.revisionId), '历史包应当保留');
});

/* ------------------------------------------------- B 节：工作线程的版本固定 */

test('规划工作线程与发起任务时固定同一本体版本，结果里标明版本（B 节）', async () => {
  const root = tempRoot('worker-version');
  const extensionsDir = join(root, 'extensions');
  const config = makeConfig({ extensionsDir, dbFile: join(root, 'mcs-web.sqlite3'), authoringDbFile: join(root, 'authoring.sqlite3') });
  const handle = await bootServer(config);
  try {
    const record = fixture({ suffix: 'worker' });
    await publish(extensionsDir, record);
    await handle.ontologySource.reload();
    const version = handle.ontologySource.current().version;

    const started = await jsonCall(handle.origin, '/api/v2/plans', { method: 'POST', body: { goalId: 'limit:bridge', background: BACKGROUND } });
    assert.equal(started.status, 200);
    assert.equal(started.payload.data.job.ontologyVersion, version, '发起任务时就固定版本');

    const job = await waitForJob(handle, started.payload.data.job.id);
    assert.equal(job.status, 'done', JSON.stringify(job.error));
    assert.equal(job.result.ontologyVersion, version, '结果必须标明用的是哪一版');
    assert.equal(job.result.status, 'Found');
    // 线程看到的是「基础 + 扩展」那一份，而不是它自己另读的基础数据。
    assert.equal(job.result.ontologyIntegrity.applied, true);
  } finally {
    await shutdown(handle);
  }
});

test('工作线程拿不到指定版本时如实报错，不用另一份数据算出「看起来对」的规划', async () => {
  const root = tempRoot('worker-mismatch');
  const extensionsDir = join(root, 'extensions');
  const record = fixture({ suffix: 'mismatch' });
  await publish(extensionsDir, record);

  const jobs = new JobManager({
    dataDir: DATA_DIR,
    extensionsDir,
    repoRoot: REPO_ROOT,
    getOntology: () => ({ version: `sha256:${'0'.repeat(64)}` }),
  });
  try {
    const started = jobs.run({ goalId: 'limit:bridge', background: BACKGROUND }, { kind: 'plan' });
    assert.equal(started.ontologyVersion, `sha256:${'0'.repeat(64)}`);
    const job = await waitForJob({ jobs }, started.id);
    assert.equal(job.status, 'error');
    assert.equal(job.error.code, CODES.VERSION_CONFLICT);
    assert.match(job.error.message, /版本与发起任务时不一致/);
    assert.equal(job.result, null, '不允许用另一份数据给出结果');
  } finally {
    jobs.close();
  }
});

/* ==========================================================================
 * 跨盘路径约定（P2，task-13）
 *
 * 扩展目录与仓库**不在同一个盘**时，Windows 的 `path.relative` 返回绝对路径。
 * 早先隔离区把它当相对路径拼进暂存根，于是拼出 `…\staging\C:\…` 这种畸形路径。
 * 这里从两个层次钉住「只有一条路径约定」：
 * 1. 纯函数层：`certificateRepoPath` 在两种盘位下都必须能被 `resolve(repoRoot, …)` 解析回真实文件；
 * 2. 合成层：按 `stagingLayout` 铺一份带证书的包，用暂存根当 repoRoot 合成，
 *    合成出来的证书路径必须指回**刚铺好的那个文件**（与真实加载时同一个函数算的）。
 * ======================================================================== */

/*
 * 与 `tempRoot` 相同，但强制落在**与仓库不同盘位**的目录里；本机没有第二个可写盘位时返回 null。
 *
 * P2 要测的是 Windows 上 `relative(repoRoot, extensionsDir)` 跨盘时返回绝对路径那条分支。
 * 仓库被克隆到 C: 或跑在 Linux/macOS 上时，这条分支在本机根本构造不出来——
 * 从前直接断言「必须跨盘」，于是换台电脑克隆就报一条与代码质量无关的失败。
 */
function crossDriveTempRoot(name) {
  if (process.platform !== 'win32') return null;
  const repoDrive = parse(REPO_ROOT).root.slice(0, 2).toUpperCase();
  for (const letter of 'CDEFGHIJKLMNOPQRSTUVWXYZ') {
    const driveLetter = `${letter}:`;
    if (driveLetter === repoDrive) continue;
    const drive = `${driveLetter}\\`;
    if (!existsSync(drive)) continue;
    try {
      const dir = mkdtempSync(join(drive, `mcs-snapshot-${name}-`));
      tempRoots.push(dir);
      return dir;
    } catch { /* 盘存在但不可写，换下一个 */ }
  }
  return null;
}

test('跨盘：证书路径只有一个算法，暂存布局与真实盘位无关（P2）', async (t) => {
  const { mkdirSync, existsSync } = await import('node:fs');
  const revisionId = 'rev:0123456789abcdef';
  const certificateFile = 'certificates/ev-crossdrive-probe.json';

  // ---- ① 纯函数层：同盘必须能被 resolve 解析回真实文件 ----
  const sameDriveRoot = join(MCS_WEB_ROOT, 'data', 'extensions');
  const samePath = extensions.certificateRepoPath({ repoRoot: REPO_ROOT, extensionsDir: sameDriveRoot, revisionId, certificateFile });
  assert.equal(resolve(REPO_ROOT, samePath), join(sameDriveRoot, extensions.dirNameFor(revisionId), certificateFile), '同盘：同样要解析得回来');
  assert.equal(/^[A-Za-z]:[\\/]/.test(samePath), false, '同盘应当是相对路径');

  const pathsToCheck = [samePath];
  const crossDriveRoot = crossDriveTempRoot('crossdrive-ext');
  if (crossDriveRoot) {
    const crossPath = extensions.certificateRepoPath({ repoRoot: REPO_ROOT, extensionsDir: crossDriveRoot, revisionId, certificateFile });
    const crossAbsolute = join(crossDriveRoot, extensions.dirNameFor(revisionId), certificateFile);
    assert.equal(resolve(REPO_ROOT, crossPath), crossAbsolute, '跨盘：resolve(repoRoot, 结果) 必须落回真实文件');
    assert.equal(/^[A-Za-z]:[\\/]/.test(crossPath), true, '跨盘只能原样回绝对路径（relative 跨不了盘）');
    pathsToCheck.push(crossPath);
  } else {
    t.diagnostic(`本机没有第二个可写盘位（仓库在 ${REPO_ROOT}）——跨盘分支跳过；同盘与暂存自包含两层仍然照跑。`);
  }
  // 所有情形都不允许出现「盘符串在中间」的畸形拼接。
  for (const value of pathsToCheck) {
    assert.equal(/([A-Za-z]:[\\/]).*([A-Za-z]:[\\/])/.test(value), false, `畸形路径：${value}`);
  }

  // ---- ② 布局层：暂存结构自包含，与真实 extensionsDir 无关 ----
  const stagingA = tempRoot('staging-a');
  const stagingB = tempRoot('staging-b');
  const layoutA = extensions.stagingLayout(stagingA);
  const layoutB = extensions.stagingLayout(stagingB);
  assert.equal(layoutA.repoRoot, resolve(stagingA));
  assert.equal(layoutA.extensionsDir.startsWith(layoutA.repoRoot), true, '暂存的扩展目录必须在暂存根之内');
  assert.equal(
    layoutA.extensionsDir.slice(layoutA.repoRoot.length),
    layoutB.extensionsDir.slice(layoutB.repoRoot.length),
    '两个暂存根的相对结构必须一模一样（与真实盘位无关）',
  );
  // 关键：暂存布局**不读** ctx / 真实 extensionsDir，因此跨盘与同盘没有第二条分支。
  assert.equal(extensions.stagingLayout.toString().includes('relative'), false, '布局函数里不允许出现 relative()');

  // ---- ③ 合成层：暂存内合成出的证书路径必须指回刚铺好的文件 ----
  const staging = tempRoot('staging-compose');
  const layout = extensions.stagingLayout(staging);
  const stagedCertificate = join(layout.extensionsDir, extensions.dirNameFor(revisionId), certificateFile);
  mkdirSync(dirname(stagedCertificate), { recursive: true });
  writeFileSync(stagedCertificate, '{"probe":true}', 'utf8');

  const { composePackageOntology } = await import('../server/snapshot.mjs');
  const source = await createOntologySource({ dataDir: DATA_DIR, extensionsDir: tempRoot('compose-ext'), repoRoot: REPO_ROOT });
  const pkg = {
    schema: 'mcs-extension-package/1',
    revisionId, parent: null, kind: 'publish', restores: null,
    baselineFingerprint: `sha256:${'0'.repeat(64)}`, reviewDigest: 'probe',
    acceptedCandidateIds: [], dismissedCandidateIds: [], notes: null,
    nodes: [], relations: [], definitions: [], contracts: [], specs: [], pendingRelations: [],
    evidence: [{
      id: 'ev:crossdrive-probe', kind: 'machine-certificate', status: 'PROOF', checkStatus: 'passed',
      title: '跨盘探针', scope: '', nodes: [], checker: 'mcs-nd-subset/1',
      certificateFile,
    }],
    certificates: [{ path: certificateFile, sha256: `sha256:${'0'.repeat(64)}` }],
    summary: { nodes: 0, relations: 0, evidence: 1, definitions: 0, contracts: 0 },
  };
  // `validate:false`：这条探针只关心「证书路径怎么算」，不关心这份假证据过不过本体校验。
  const { instance } = composePackageOntology(source.base.raw, pkg, {
    repoRoot: layout.repoRoot, extensionsDir: layout.extensionsDir, validate: false, activeRevision: revisionId,
  });
  const record = instance.raw.evidence.find((item) => item.id === 'ev:crossdrive-probe');
  assert.ok(record?.certificate, '合成后应当解析出证书路径');
  assert.equal(resolve(layout.repoRoot, record.certificate), stagedCertificate,
    '暂存内合成的证书路径必须指回刚铺好的文件（暂存与真实加载同一个函数）');
  assert.equal(existsSync(resolve(layout.repoRoot, record.certificate)), true);
});
