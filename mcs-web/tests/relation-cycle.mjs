/**
 * 新节点闭环验收（`tests/relation-cycle.mjs`）——**真实 HTTP + 真引擎**。
 *
 * 这一组测的是「新草稿必须真正参与发现，且任务状态必须如实」：
 *
 * 1. 用**全新节点标识**建草稿（复制群表达、只改 node id）→ `POST /authoring/drafts`
 *    → `POST /relation-discovery/jobs`；
 * 2. 候选数 **> 0**、`run.background` 等于**草稿声明的**背景、候选里有端点等于草稿节点 id；
 * 3. 轮询 `GET /relation-discovery/jobs/:id` 直到终态；至少一条候选 `math.status === 'verified'`，
 *    否则**如实报出全部未决的原因**（绝不用「任务 completed」冒充「验证完成」）；
 * 4. `completed` 时**没有任何候选**还带 `pendingCheck`；
 * 5. 四案例各取一条现成登记，经 `/formal/validate` 必须 `ok: true`。
 *
 * 为什么必须是真 HTTP：这三条 bug（草稿不进 `allSpecs`、背景丢掉草稿声明、路由不 await
 * 就标 completed）**在函数级测试里全部看不见**——`relation-discovery-e2e.mjs` 手工装配 ctx
 * 并直接调引擎，于是「接口层少装配一个键」这类问题一路绿灯。这里从 HTTP 进、从数据库读。
 */
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, rm } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { startServer } from '../server/index.mjs';
import { loadConfig } from '../server/config.mjs';
import { createOntologySource } from '../server/snapshot.mjs';
import * as registry from '../data/formal/registry.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const MCS_WEB_ROOT = resolve(HERE, '..');
const REPO_ROOT = resolve(MCS_WEB_ROOT, '..');
const DATA_DIR = join(MCS_WEB_ROOT, 'data');
/** 临时运行目录：本任务的写权限只覆盖 `tmp/team/D2/`。 */
const RUNTIME_DIR = join(MCS_WEB_ROOT, 'tmp', 'team', 'D2', 'relation-cycle');

/** 轮询窗口：同步段本身就要跑十几秒（候选生成 + 能当场判的判定器），结算再叠几秒。 */
const POLL_TIMEOUT_MS = 150000;
const DEFAULT_FETCH_TIMEOUT_MS = 180000;

let harness = null;

function sleep(ms) { return new Promise((resolvePromise) => setTimeout(resolvePromise, ms)); }

async function safeRemove(dir) {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    try { await rm(dir, { recursive: true, force: true }); return true; } catch { await sleep(60); }
  }
  return false;
}

before(async () => {
  await safeRemove(RUNTIME_DIR);
  await mkdir(RUNTIME_DIR, { recursive: true });
  const extensionsDir = join(RUNTIME_DIR, 'extensions');
  const ontologySource = await createOntologySource({ dataDir: DATA_DIR, extensionsDir, repoRoot: REPO_ROOT });
  const config = {
    ...loadConfig(),
    port: 0,                                  // 临时端口：不占用户正在用的 3784
    host: '127.0.0.1',
    dev: false,
    dataDir: DATA_DIR,                        // 本体只读真实数据；运行状态全部落到 RUNTIME_DIR
    extensionsDir,
    dbFile: join(RUNTIME_DIR, 'mcs-web.sqlite3'),
    authoringDbFile: join(RUNTIME_DIR, 'authoring.sqlite3'),
    backupDir: join(RUNTIME_DIR, 'backups'),
    staticDir: join(RUNTIME_DIR, 'static'),
  };
  const started = await startServer({ config, ontologySource });
  harness = { ...started, config, ontologySource };
});

after(async () => {
  if (!harness) return;
  try { harness.jobs?.close(); } catch { /* 已关闭 */ }
  try { harness.db?.close(); } catch { /* 已关闭 */ }
  try { await new Promise((resolvePromise) => harness.server.close(resolvePromise)); } catch { /* 已关闭 */ }
  // Windows 上 SQLite 的 -wal/-shm 可能还被占着；清理是尽力而为，tmp/ 本来就是可丢弃状态。
  await safeRemove(RUNTIME_DIR);
});

/* ------------------------------------------------------------------ HTTP */

async function api(path, { method = 'GET', body = null } = {}) {
  const response = await fetch(`${harness.origin}/api/v2${path}`, {
    method,
    headers: body ? { 'content-type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(DEFAULT_FETCH_TIMEOUT_MS),
  });
  const text = await response.text();
  let payload = null;
  try { payload = JSON.parse(text); } catch { payload = { parseError: text.slice(0, 500) }; }
  return { status: response.status, payload };
}

/** 取信封里的 data；失败时把 error 原样带出来（不吞）。 */
function dataOf(result) {
  assert.equal(result.status, 200, `HTTP ${result.status}：${JSON.stringify(result.payload).slice(0, 500)}`);
  assert.equal(result.payload?.ok, true, `接口返回 ok:false：${JSON.stringify(result.payload?.error ?? result.payload).slice(0, 500)}`);
  return result.payload.data;
}

/* --------------------------------------------------------------- 草稿夹具 */

/**
 * 全新节点标识 + **复制现成的群表达**（`data/formal/registry.mjs` 的
 * `concept:group:abelian` 的声明与陈述，只换 node id）。
 *
 * 之所以要「全新标识」：登记表里没有它、本体里也没有它——这正是旧实现返回
 * 「完成、零候选」的那条路径。
 */
function draftSpecFor(nodeId) {
  return {
    specVersion: 'mcs-formal/1',
    node: nodeId,
    nodeVersion: '1',
    background: 'bg:group/1',
    theoryVersion: '1',
    declarations: [
      { name: 'mul0', type: 'G -> G -> G', role: 'function', label: '候选群运算' },
      { name: 'e0', type: 'G', role: 'object', label: '候选单位元' },
      { name: 'inv0', type: 'G -> G', role: 'function', label: '候选逆元映射' },
    ],
    definitions: [],
    assumptions: [],
    statement: { source: 'abelian_group(mul0)(e0)(inv0)', kind: 'formula' },
    claims: [],
    references: [],
    boundary: ['验收用副本：只换节点标识，含义与 concept:group:abelian 相同。'],
    source: 'relation-cycle 验收夹具',
  };
}

async function createDraftWithNewNode(nodeId, name) {
  const created = await api('/authoring/drafts', {
    method: 'POST',
    body: {
      name,
      construct: 'Concept',
      case: 'group',
      background: 'bg:group/1',
      spec: draftSpecFor(nodeId),
      node: { id: nodeId, version: '1', construct: 'Concept', case: 'group' },
    },
  });
  return dataOf(created).draft;
}

async function startJob(body) {
  const started = await api('/relation-discovery/jobs', { method: 'POST', body });
  return dataOf(started);
}

async function getJob(runId) {
  return dataOf(await api(`/relation-discovery/jobs/${encodeURIComponent(runId)}`));
}

/** 轮询到终态；返回最后一次读到的 run（含当前最新候选）。 */
async function pollUntilSettled(runId, { timeoutMs = POLL_TIMEOUT_MS } = {}) {
  const terminal = new Set(['completed', 'interrupted', 'cancelled', 'error']);
  const deadline = Date.now() + timeoutMs;
  let latest = await getJob(runId);
  const history = [{ status: latest.status, pending: latest.candidates.filter((c) => c.pendingCheck).length }];
  while (!terminal.has(latest.status) && Date.now() < deadline) {
    await sleep(400);
    latest = await getJob(runId);
    history.push({ status: latest.status, pending: latest.candidates.filter((c) => c.pendingCheck).length });
  }
  return { run: latest, history, settled: terminal.has(latest.status) };
}

/** 候选的未决原因汇总——「全部未决」时必须说清为什么，而不是只说结论。 */
function undecidedReport(candidates) {
  return candidates.map((candidate) => ({
    id: candidate.id,
    kind: candidate.kind,
    from: candidate.from?.node,
    to: candidate.to?.node,
    math: candidate.math?.status,
    run: candidate.run?.status,
    reason: String(candidate.math?.reason ?? '').slice(0, 160),
  }));
}

/* ==================================================================== D1–D4 */

test('新节点闭环：草稿 → 任务 → 后台结算 → 最新结果（D1–D4）', async (t) => {
  const nodeId = `ext:cycle-abelian-${Date.now().toString(36)}`;
  assert.ok(!registry.specs.some((spec) => spec.node === nodeId), '夹具节点必须是登记表里没有的新标识');

  // ---- D1：新节点草稿 -> 发现任务 ----
  const draft = await createDraftWithNewNode(nodeId, '验收：阿贝尔群副本（新标识）');
  assert.equal(draft.spec.node, nodeId);
  assert.equal(draft.spec.background, 'bg:group/1');

  const started = await startJob({ draftId: draft.id, draftRevision: draft.revision });
  const run = started.run ?? started;

  // ---- D2：候选数 > 0、背景 = 草稿声明、端点含草稿节点 ----
  assert.equal(run.status, 'running', `任务必须立刻返回并处于 running（实际 ${run.status}）`);
  assert.ok(Array.isArray(run.candidates), '返回的 run 必须带候选数组');
  assert.ok(run.candidates.length > 0, `新节点必须长出候选（实际 ${run.candidates.length} 条）——零候选说明草稿没进发现清单`);
  assert.equal(run.background, 'bg:group/1', '背景必须取自草稿声明，而不是默认代数背景');
  assert.equal(started.background?.source, 'draft', `背景来源应当是草稿声明：${JSON.stringify(started.background)}`);
  const touching = run.candidates.filter((candidate) => candidate.from?.node === nodeId || candidate.to?.node === nodeId);
  assert.ok(touching.length > 0, '至少要有一条候选的端点是草稿节点');
  assert.ok(touching.some((candidate) => candidate.from?.origin === 'draft' || candidate.to?.origin === 'draft'),
    '端点必须标出 origin=draft（界面与发布要靠它区分草稿端点）');
  assert.ok(run.candidates.some((candidate) => candidate.pendingCheck === true),
    '同步段应当留下待结算的候选（机器检查要起子进程），否则这条用例没在测后台结算');

  // ---- D3/D4：轮询到终态 ----
  const { run: latest, history, settled } = await pollUntilSettled(run.id);
  assert.ok(settled, `任务没有在 ${POLL_TIMEOUT_MS} ms 内到达终态；状态轨迹 ${JSON.stringify(history.slice(-6))}`);

  const verified = latest.candidates.filter((candidate) => candidate.math?.status === 'verified');
  if (latest.status === 'completed') {
    // ---- D4：completed 时不许还有候选在跑 ----
    const pending = latest.candidates.filter((candidate) => candidate.pendingCheck);
    assert.equal(pending.length, 0,
      `任务标 completed 时还有 ${pending.length} 条候选 pendingCheck：${JSON.stringify(pending.map((c) => c.id))}`);
    // 只有所有候选都有结论才允许 completed
    for (const candidate of latest.candidates) {
      assert.ok(['verified', 'refuted', 'undecided'].includes(candidate.math?.status),
        `候选 ${candidate.id} 的 math.status 非法：${candidate.math?.status}`);
    }
  } else {
    // 没到 completed 也要如实：说明终态与原因，不假装全部有结论
    t.diagnostic(`任务终态 ${latest.status}：${JSON.stringify(latest.stats?.warnings ?? []).slice(0, 400)}`);
  }

  // ---- D3：至少一条 verified；否则如实报告全部未决的原因 ----
  if (verified.length === 0) {
    assert.fail(`没有任何候选被验证；全部未决的原因：${JSON.stringify(undecidedReport(latest.candidates), null, 1)}`);
  }
  assert.ok(verified.length >= 1, '至少要有一条候选 math.status === verified');
  for (const candidate of verified) {
    assert.ok(candidate.evidence || candidate.replay, `verified 候选 ${candidate.id} 必须带证据或重放记录，不得空口无凭`);
  }

  // 已核验的候选必须有「真的跑过检查器」的痕迹（定义引用是登记核对，标明来源即可）
  const certified = verified.filter((candidate) => candidate.kind !== 'definitionReference');
  if (certified.length > 0) {
    assert.ok(certified.some((candidate) => candidate.replay?.status === 'passed' || candidate.evidence?.checkStatus === 'passed'),
      `证书型 verified 候选必须留下 passed 的检查记录：${JSON.stringify(certified.map((c) => ({ id: c.id, replay: c.replay, check: c.evidence?.checkStatus })))}`);
  }

  t.diagnostic(`候选 ${latest.candidates.length} 条，verified ${verified.length} 条，终态 ${latest.status}，耗时 ${latest.stats?.durationMs ?? '?'} ms`);
});

/* ======================================================================= C */

test('后台结算：逐条写回、DELETE 真的停掉结算（C）', async (t) => {
  const nodeId = `ext:cycle-cancel-${Date.now().toString(36)}`;
  const draft = await createDraftWithNewNode(nodeId, '验收：取消探针（新标识）');
  const started = await startJob({ draftId: draft.id, draftRevision: draft.revision });
  const run = started.run ?? started;
  assert.ok(run.candidates.length > 0, '取消探针也需要先有候选');
  const pendingAtStart = run.candidates.filter((candidate) => candidate.pendingCheck).length;
  assert.ok(pendingAtStart > 0, '取消探针需要一个仍在结算的任务（否则测不到「真的停掉」）');

  // 逐条写回：POST 返回时候选已经在库里（GET 立刻能读到同一批 id）
  const immediately = await getJob(run.id);
  assert.deepEqual(immediately.candidates.map((candidate) => candidate.id).sort(), run.candidates.map((candidate) => candidate.id).sort(),
    'POST 返回的候选必须已经落库（否则「逐项保存」没做到）');

  const beforeCancel = immediately.candidates.filter((candidate) => candidate.math?.status === 'verified').length;
  const cancelled = await api(`/relation-discovery/jobs/${encodeURIComponent(run.id)}`, { method: 'DELETE' });
  const cancelData = dataOf(cancelled);
  assert.equal(cancelData.status, 'cancelled');
  assert.equal(cancelData.settleAborted, true, '取消必须打到正在跑的结算上');
  assert.match(String(cancelData.note), /已完成|保留/);

  // 取消在**候选边界**生效：正在跑的那一条（kernel 子进程）会跑完，之后不再往下跑。
  // 所以这里等 `settling` 落下，而不是假定它立刻停。
  const settleDeadline = Date.now() + 60000;
  let after = await getJob(run.id);
  while (after.settling === true && Date.now() < settleDeadline) {
    await sleep(500);
    after = await getJob(run.id);
  }
  assert.equal(after.settling, false, `取消后 60 秒仍在结算：${JSON.stringify(after.stats?.warnings ?? []).slice(0, 300)}`);
  assert.equal(after.status, 'cancelled', `取消后状态被改成了 ${after.status}：取消没有真的生效`);
  const verifiedAfter = after.candidates.filter((candidate) => candidate.math?.status === 'verified').length;
  assert.ok(verifiedAfter >= beforeCancel, '已完成的候选结果必须保留（取消不清空已核验结果）');
  assert.ok(after.candidates.every((candidate) => !candidate.pendingCheck || candidate.math?.status === 'undecided'),
    '未回收的候选必须如实保持未决，不得冒充有结论');
  t.diagnostic(`取消时 ${pendingAtStart} 条待结算；取消后 verified ${verifiedAfter} 条（取消前 ${beforeCancel} 条）`);
});

/* ======================================================================= D5 */

test('四案例现成登记：经 /formal/validate 必须 ok（D5）', async (t) => {
  /** §1.6 登记的字段表：编辑页发给接口的就是这些（`web/src/authoring.ts#specFromFields`）。 */
  const SPEC_FIELDS = [
    'specVersion', 'node', 'nodeVersion', 'background', 'theoryVersion',
    'declarations', 'definitions', 'assumptions', 'statement', 'claims',
    'references', 'boundary', 'source',
  ];
  const pick = (caseId) => registry.specs.find((spec) => String(spec.node).startsWith(`${caseId}:`) && spec?.statement?.source);
  const cases = ['group', 'limit', 'manifold', 'tensor'];
  const summary = [];
  for (const caseId of cases) {
    const spec = pick(caseId);
    assert.ok(spec, `案例 ${caseId} 必须至少有一条已登记的形式表达（否则 D5 无从谈起）`);
    const body = {};
    for (const key of SPEC_FIELDS) if (spec[key] !== undefined) body[key] = spec[key];
    const result = await api('/formal/validate', { method: 'POST', body: { spec: body } });
    const report = dataOf(result);
    assert.equal(report.ok, true,
      `${caseId} 的现成登记 ${spec.node} 经 /formal/validate 报错：${JSON.stringify(report.problems).slice(0, 400)}`);
    assert.match(String(report.hash), /^sha256:[0-9a-f]{64}$/);
    assert.ok(typeof report.readable?.statement === 'string' && report.readable.statement.length > 0, '必须给出中文读法');
    summary.push(`${caseId}:${spec.node}`);
  }
  t.diagnostic(`四案例登记经接口检查全部通过：${summary.join('，')}`);
});
