/**
 * 版本化服务层的验收测试：内容包 / 编写库 / 快照 / 发布事务 / 回滚 / 中断恢复。
 *
 * ## 这份测试在测什么，不测什么
 *
 * 测的是**服务层的语义**：六步事务的失败语义、幂等的两层判据、409 的触发条件、
 * 回滚后的引用封闭、重启后的中断标注。上游引擎（证明搜索、检查器、有限求值器）
 * 用**假实现**注入——真引擎由 task-1/2/3/4 各自的测试负责。
 * 这样做的理由不是偷懒：这些语义不依赖具体的搜索算法，
 * 而它们一旦出错（比如版本切了一半、回滚留下悬空引用），换哪个引擎都救不回来。
 *
 * ## 测试写在哪里
 *
 * 全部临时文件落在 `tmp/team/D/<用例>/`（gitignore 已排除），
 * 真实的 `data/extensions/` 与 `runtime/` 一个字节都不碰。
 */

import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, rm, readdir, writeFile, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { AuthoringDatabase } from '../server/authoring-db.mjs';
import { createOntologySource } from '../server/snapshot.mjs';
import * as extensions from '../server/extensions.mjs';
import {
  previewPublication, commitPublication, rollbackPublication, listRevisions, assertLoopbackWrite,
} from '../server/publication.mjs';
import { createLearnerStore } from '../server/db.mjs';
import { McsError } from '../shared/errors.mjs';
import { discoverRelations, DISCOVERY_BUDGET, replayCandidate } from '../core/formal/discovery.mjs';
import { collectCandidates, listJudges, RELATION_KINDS, makeJudge } from '../core/formal/judges.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const MCS_WEB_ROOT = resolve(HERE, '..');
const REPO_ROOT = resolve(MCS_WEB_ROOT, '..');
const DATA_DIR = join(MCS_WEB_ROOT, 'data');
const TMP_ROOT = join(MCS_WEB_ROOT, 'tmp', 'team', 'D');

const DRAFT_TITLE = '有限群交换性片段';       // 刻意不含并列词：粒度判据要求单元标题不并列
const DRAFT_NODE = 'ext:test-commutative-fragment';

/* ------------------------------------------------------------------ 夹具 */

/** 假重放引擎：记录调用，默认返回「检查器通过」。 */
function fakeReplay({ result } = {}) {
  const calls = [];
  const fn = async (args) => {
    calls.push(args);
    if (typeof result === 'function') return result(args);
    return {
      ok: true,
      replayed: true,
      check: { status: 'passed', checker: 'fake-kernel', checkerSha256: 'sha256:fake-checker', openHypotheses: [] },
      problems: [],
    };
  };
  fn.calls = calls;
  return fn;
}

async function makeHarness(name, { replay = fakeReplay() } = {}) {
  const dir = join(TMP_ROOT, name);
  await safeRemove(dir);
  await mkdir(dir, { recursive: true });
  const extensionsDir = join(dir, 'extensions');
  const authoringFile = join(dir, 'authoring.sqlite3');
  const authoring = new AuthoringDatabase({ file: authoringFile });
  const source = await createOntologySource({ dataDir: DATA_DIR, extensionsDir, repoRoot: REPO_ROOT });
  const config = { repoRoot: REPO_ROOT, authoringDbFile: authoringFile, dbFile: join(dir, 'mcs-web.sqlite3'), dataDir: DATA_DIR };
  const ctx = { dataDir: DATA_DIR, extensionsDir, authoring, config, ontologySource: source, replay };
  return { dir, extensionsDir, authoring, source, ctx, config, replay };
}

/**
 * 清理临时目录。
 *
 * Windows 上 SQLite 的 `-wal` / `-shm` 文件在连接关闭后还可能短暂被占住，
 * 直接递归删除会抛 EBUSY。测试的清理不该因为这种事把用例判成失败——
 * 重试几次，实在删不掉就留着（tmp/ 本来就是可丢弃的运行状态）。
 */
async function safeRemove(dir) {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      await rm(dir, { recursive: true, force: true });
      return true;
    } catch {
      await new Promise((resolvePromise) => setTimeout(resolvePromise, 40));
    }
  }
  return false;
}

/** 一次候选的完整形状（模拟上游引擎产出的结果）。 */
function candidateFixture({ id, kind = 'definitionReference', from, to, math = 'verified', evidence = true, counterexample = null, review = 'pending', direction = null }) {
  return {
    id,
    runId: null,
    kind,
    from,
    to,
    direction,
    conditions: [],
    goal: { source: `${to.node} 的表达用到 ${from.node}`, canonical: null, hash: `sha256:${'0'.repeat(64)}` },
    reason: `测试候选 ${id}`,
    math: { status: math, reason: '测试判定', scope: '测试范围' },
    run: { status: 'completed', reason: '测试运行', stats: {} },
    review,
    evidence: evidence
      ? { id: `ev:${id}`, kind: 'reference', status: 'DEF', checkStatus: 'not_run', title: '定义引用', scope: '测试', nodes: [from.node, to.node], checkerVerified: false }
      : null,
    counterexample,
    replay: null,
    generatorVersion: 'test/1',
    inputHash: `sha256:${'1'.repeat(64)}`,
  };
}

function draftSpec(node = DRAFT_NODE) {
  return {
    specVersion: 'mcs-formal/1',
    node,
    nodeVersion: '1',
    background: 'bg:group/1',
    theoryVersion: '1',
    declarations: [],
    definitions: [],
    assumptions: [],
    statement: { source: 'true', kind: 'formula' },
    claims: [],
    references: [],
    boundary: [],
    source: '测试登记',
    hash: `sha256:${'2'.repeat(64)}`,
  };
}

function makeDraft(harness, { node = DRAFT_NODE, extra = {} } = {}) {
  return harness.authoring.createDraft({
    name: DRAFT_TITLE,
    construct: 'Concept',
    case: 'group',
    background: 'bg:group/1',
    summary: '测试用草稿：只验证服务层语义。',
    reading: '# 测试\n\n正文。',
    ontologyVersion: harness.source.current().version,
    node: { id: node, discipline: '群论', granularity: 'unit', evidenceStatus: 'NOT-CLAIMED', title: DRAFT_TITLE },
    spec: draftSpec(node),
    ...extra,
  });
}

/** 造一个已完成的发现任务（候选由测试直接给，模拟引擎产出）。 */
function seedRun(harness, { draftId, candidates, status = 'completed', ontologyVersion = null }) {
  const run = harness.authoring.createRun({
    draftId,
    nodeRef: null,
    ontologyVersion: ontologyVersion ?? harness.source.current().version,
    background: 'bg:group/1',
    budget: { ...DISCOVERY_BUDGET },
    generatorVersion: 'test/1',
  });
  harness.authoring.saveCandidates(run.id, candidates);
  harness.authoring.updateRun(run.id, {
    status,
    stats: { candidates: candidates.length, coveredNodes: 2, durationMs: 1, verified: candidates.filter((c) => c.math.status === 'verified').length, refuted: 0, undecided: 0, unprocessed: 0 },
  });
  return harness.authoring.getRun(run.id);
}

function baseNode(harness, index = 0) {
  const node = harness.source.base.raw.nodes[index];
  return { node: node.id, version: String(node.version ?? '1') };
}

/** 一份「可发布」的请求：草稿 + 一条已验证的定义引用 + 一条**选中但未验证**的关系。 */
async function publishableSetup(harness, { name = 'A' } = {}) {
  const draft = makeDraft(harness);
  const from = baseNode(harness);
  const candidate = candidateFixture({ id: `cand-${name}-ok`, from, to: { node: DRAFT_NODE, version: '1' } });
  // 选中了、但还没通过机器检查：只能进「待证」，不进公共网络。
  const pendingCandidate = candidateFixture({ id: `cand-${name}-pending`, from, to: { node: DRAFT_NODE, version: '1' }, math: 'undecided', evidence: false });
  // 根本没选中的那条：既不发布，也不在本次发布的待证清单里。
  const unselected = candidateFixture({ id: `cand-${name}-unselected`, from, to: { node: DRAFT_NODE, version: '1' } });
  const run = seedRun(harness, { draftId: draft.id, candidates: [candidate, pendingCandidate, unselected] });
  return {
    draft, run, candidate, pendingCandidate, unselected, other: pendingCandidate, from,
    request: {
      draftId: draft.id,
      draftRevision: draft.revision,
      ontologyVersion: harness.source.current().version,
      acceptedCandidateIds: [candidate.id, pendingCandidate.id],
      dismissedCandidateIds: [],
      idempotencyKey: `key-${name}`,
    },
  };
}

before(async () => { await mkdir(TMP_ROOT, { recursive: true }); });
/*
 * 不在这里整目录清理。
 *
 * 每个用例自己的 `finally` 已经删掉它的临时目录；把根目录留着的唯一理由，
 * 是失败之后还能进去看一眼留下了什么（发布事务最需要看的就是「盘上到底写了什么」）。
 * `tmp/` 本来就在 .gitignore 里。
 */

/* ------------------------------------------------------- 1. 内容包与快照 */

test('内容包不可变、哈希自洽，写入后回读校验通过', async () => {
  const harness = await makeHarness('extensions-basic');
  try {
    const pkg = {
      schema: extensions.PACKAGE_SCHEMA,
      parent: null, kind: 'publish', restores: null, baselineFingerprint: `sha256:${'a'.repeat(64)}`,
      reviewDigest: 'rd-1', acceptedCandidateIds: [], dismissedCandidateIds: [], notes: null,
      nodes: [{ id: 'ext:x', title: '甲' }], relations: [], evidence: [], definitions: [], contracts: [],
      specs: [], pendingRelations: [], certificates: [],
      summary: { nodes: 1, relations: 0, evidence: 0, definitions: 0, contracts: 0 },
    };
    const revisionId = extensions.revisionIdFor(pkg);
    const revision = { id: revisionId, parent: null, createdAt: new Date().toISOString(), createdBy: 'test', kind: 'publish', restores: null, baselineFingerprint: pkg.baselineFingerprint, contentHash: extensions.packageHash(pkg), packagePath: `data/extensions/${revisionId}/package.json`, summary: pkg.summary, reviewDigest: 'rd-1', acceptedCandidateIds: [], dismissedCandidateIds: [], notes: null };

    const written = await extensions.writePackage({ extensionsDir: harness.extensionsDir }, revision, { ...pkg, revisionId });
    assert.equal(written.reused, false);
    const verdict = await extensions.verifyPackage({ extensionsDir: harness.extensionsDir }, revisionId);
    assert.equal(verdict.ok, true, verdict.problems.join('；'));

    // 重复写同一份内容：复用旧包（幂等），不覆盖。
    const again = await extensions.writePackage({ extensionsDir: harness.extensionsDir }, revision, { ...pkg, revisionId });
    assert.equal(again.reused, true);

    // 内容被改一个字节 → 哈希对不上。
    const file = join(harness.extensionsDir, extensions.dirNameFor(revisionId), 'package.json');
    const tampered = JSON.parse(await (await import('node:fs/promises')).readFile(file, 'utf8'));
    tampered.nodes[0].title = '乙';
    await writeFile(file, JSON.stringify(tampered), 'utf8');
    const broken = await extensions.verifyPackage({ extensionsDir: harness.extensionsDir }, revisionId);
    assert.equal(broken.ok, false);
    assert.ok(broken.problems.some((item) => item.includes('内容哈希不符')), broken.problems.join('；'));

    // 路径穿越：非法 revisionId 在拼路径之前就被挡住。
    await assert.rejects(async () => extensions.readPackage({ extensionsDir: harness.extensionsDir }, 'rev:..%2f..'), (error) => error.code === 'BAD_REQUEST');
  } finally {
    harness.authoring.close();
    await safeRemove(harness.dir);
  }
});

test('快照 = 基础数据 + 激活包；未发布时就是基础数据本身', async () => {
  const harness = await makeHarness('snapshot-base');
  try {
    assert.equal(harness.source.applied(), false);
    assert.equal(harness.source.activeRevision(), null);
    assert.equal(harness.source.current().version, harness.source.base.version);
    assert.deepEqual(harness.source.integrity().problems, []);
    assert.deepEqual([...extensions.extensionsRoot({ dataDir: DATA_DIR })].length > 0, true);
    assert.deepEqual(extensions.BASE_FINGERPRINT_KEYS ?? null, null);   // 常量在 snapshot.mjs，这里只确认 extensions 不导出它
  } finally {
    harness.authoring.close();
    await safeRemove(harness.dir);
  }
});

test('BASE_FINGERPRINT_KEYS 只覆盖 schema/signature/theory，扩展内容不进基线指纹', async () => {
  const { baseFingerprint, BASE_FINGERPRINT_KEYS } = await import('../server/snapshot.mjs');
  assert.deepEqual([...BASE_FINGERPRINT_KEYS], ['schema', 'signature', 'theory']);
  const raw = { schema: 's', signature: { a: 1 }, theory: { b: 2 }, nodes: [{ id: 'n1' }] };
  const first = baseFingerprint(raw);
  const second = baseFingerprint({ ...raw, nodes: [{ id: 'n2' }] });
  assert.equal(first, second, '节点增删不应改变基线指纹');
  const third = baseFingerprint({ ...raw, theory: { b: 3 } });
  assert.notEqual(first, third, '理论变了，基线指纹必须变');
});

/* ------------------------------------------------------------ 2. 编写库 */

test('草稿更新走乐观锁：修订号不符 409，本体版本不符 409', async () => {
  const harness = await makeHarness('authoring-draft');
  try {
    const draft = makeDraft(harness);
    assert.equal(draft.revision, 1);
    const updated = harness.authoring.updateDraft(draft.id, { summary: '改一次' }, { expectedRevision: 1, ontologyVersion: harness.source.current().version });
    assert.equal(updated.revision, 2);
    assert.equal(updated.summary, '改一次');

    await assert.rejects(
      async () => harness.authoring.updateDraft(draft.id, { summary: '并发改' }, { expectedRevision: 1, ontologyVersion: harness.source.current().version }),
      (error) => error instanceof McsError && error.code === 'REVISION_CONFLICT' && error.status === 409,
    );

    // 换一个本体版本去改「形式表达」→ 版本冲突（`stale-reference` 的来源就在这里被挡住）。
    await assert.rejects(
      async () => harness.authoring.updateDraft(draft.id, { spec: draftSpec() }, { expectedRevision: 2, ontologyVersion: 'sha256:another-version' }),
      (error) => error instanceof McsError && error.code === 'ONTOLOGY_VERSION_CONFLICT' && error.status === 409,
    );

    // 只改文字，不该被本体版本锁住。
    const ok = harness.authoring.updateDraft(draft.id, { reading: '换一段正文' }, { expectedRevision: 2, ontologyVersion: null });
    assert.equal(ok.revision, 3);

    // 找不到的草稿按规格报 404。
    await assert.rejects(async () => harness.authoring.getDraft('draft-不存在'), (error) => error.status === 404);
  } finally {
    harness.authoring.close();
    await safeRemove(harness.dir);
  }
});

test('编写库只吃声明式数据，且与学习者 E 库物理分开', async () => {
  const harness = await makeHarness('authoring-separation');
  try {
    const draft = makeDraft(harness);
    assert.ok(draft.id);
    await assert.rejects(
      async () => harness.authoring.createDraft({ name: '带函数的草稿', node: { id: 'x', discipline: () => '群论' } }),
      (error) => error.code === 'BAD_REQUEST',
    );
    await assert.rejects(
      async () => harness.authoring.createDraft({ name: '原型污染', spec: JSON.parse('{"__proto__":{"polluted":true}}') }),
      (error) => error.code === 'BAD_REQUEST',
    );

    // E 库是另一个文件：编写库里不存在 profiles/notes/events 这些表。
    const learner = await createLearnerStore({ config: { dbFile: join(harness.dir, 'mcs-web.sqlite3') } });
    const tables = (name) => learner.driver.get("SELECT name FROM sqlite_master WHERE type='table' AND name = ?", [name]);
    assert.ok(tables('notes'));
    const authoringTables = harness.authoring.db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map((row) => row.name);
    for (const forbidden of ['profiles', 'notes', 'events']) {
      assert.equal(authoringTables.includes(forbidden), false, `编写库不该有 ${forbidden} 表`);
    }
    assert.equal(harness.authoring.file.includes('authoring'), true);
    assert.notEqual(harness.authoring.file, learner.file);
    await learner.close();
  } finally {
    harness.authoring.close();
    await safeRemove(harness.dir);
  }
});

/* ------------------------------------------------------- 3. 发布事务 */

test('预览与提交共用同一段差异计算：预览零写入且给出同一个 revision', async () => {
  const harness = await makeHarness('preview-same-diff');
  try {
    const setup = await publishableSetup(harness, { name: 'PV' });
    const before = await readdir(harness.extensionsDir).catch(() => []);

    const preview = await previewPublication(harness.ctx, setup.request);
    assert.equal(preview.sealed, true, JSON.stringify(preview.problems));
    assert.equal(preview.diff.relations.added.length, 1);
    assert.equal(preview.diff.nodes.added.length, 1);
    assert.equal(preview.diff.nodes.added[0].id, DRAFT_NODE);
    // 选中但未验证的那条只能出现在「待证」里；没选中的连待证都不是。
    assert.equal(preview.diff.pending.length, 1);
    assert.equal(preview.diff.pending[0].candidateId, setup.pendingCandidate.id);

    const after = await readdir(harness.extensionsDir).catch(() => []);
    assert.deepEqual(after, before, '预览必须是零写入');
    assert.equal(existsSync(join(harness.extensionsDir, 'active.json')), false);

    const committed = await commitPublication(harness.ctx, setup.request);
    assert.equal(committed.revision.id, preview.revision.id, '预览给出的 version 就必须是提交得到的 version');
    assert.equal(committed.revision.contentHash, preview.revision.contentHash);
    assert.equal(committed.replay.length, 1);
    assert.equal(harness.replay.calls.length, 1, '第 2 步只重放选中的证据');
  } finally {
    harness.authoring.close();
    await safeRemove(harness.dir);
  }
});

test('只发布选中结果：未选中/未验证的候选不进公共网络', async () => {
  const harness = await makeHarness('publish-selected-only');
  try {
    const setup = await publishableSetup(harness, { name: 'SEL' });
    const result = await commitPublication(harness.ctx, setup.request);
    const ontology = harness.source.current();

    const relationIds = ontology.raw.relationDescriptions.map((item) => item.id);
    assert.ok(relationIds.includes(`rel:${setup.candidate.id}`));
    assert.equal(relationIds.includes(`rel:${setup.pendingCandidate.id}`), false, '未验证的候选不能出现在关系表里');
    assert.equal(relationIds.includes(`rel:${setup.unselected.id}`), false, '未选中的候选不能出现在关系表里');

    const evidenceIds = ontology.raw.evidence.map((item) => item.id);
    assert.ok(evidenceIds.includes(`ev:${setup.candidate.id}`));
    assert.equal(evidenceIds.includes(`ev:${setup.pendingCandidate.id}`), false);

    // 选中但未决的那条留在扩展信息的「待证」里，而不是被丢掉；没选中的不在其中。
    const pending = ontology.raw.extension.pendingRelations;
    assert.equal(pending.length, 1);
    assert.equal(pending[0].candidateId, setup.pendingCandidate.id);
    assert.equal(pending[0].status, 'pending-verification');
    assert.equal(pending.some((item) => item.candidateId === setup.unselected.id), false);

    // 发布后新版本生效：节点进了本体，且带形式表达标记。
    const node = ontology.maybeNode(DRAFT_NODE);
    assert.ok(node, '草稿节点应已入库');
    assert.equal(node.hasFormalSpec, true);
    assert.equal(result.ontologyVersion, ontology.version);

    // 旧版本（基础数据）的那一份没有被改：快照的 base 仍然是 232 个节点。
    assert.equal(harness.source.base.raw.nodes.some((item) => item.id === DRAFT_NODE), false);
  } finally {
    harness.authoring.close();
    await safeRemove(harness.dir);
  }
});

test('重复发布幂等：同 idempotencyKey 与同请求指纹都返回同一个版本', async () => {
  const harness = await makeHarness('publish-idempotent');
  try {
    const setup = await publishableSetup(harness, { name: 'IDEM' });
    const first = await commitPublication(harness.ctx, setup.request);
    assert.equal(first.idempotent ?? false, false);
    const packagesAfterFirst = (await readdir(harness.extensionsDir)).filter((name) => name.startsWith('rev-'));

    // 同一把幂等键：锁外快路径直接命中，没有再跑一遍重放。
    const second = await commitPublication(harness.ctx, setup.request);
    assert.equal(second.idempotent, true);
    assert.equal(second.revision.id, first.revision.id);
    assert.equal(harness.replay.calls.length, 1, '幂等命中不该再重放证据');

    // 不带幂等键、但请求指纹相同：也返回同一个版本（内容同一性短路）。
    const third = await commitPublication(harness.ctx, { ...setup.request, idempotencyKey: undefined });
    assert.equal(third.idempotent, true);
    assert.equal(third.revision.id, first.revision.id);
    assert.equal(harness.replay.calls.length, 1);

    const packagesAfterThird = (await readdir(harness.extensionsDir)).filter((name) => name.startsWith('rev-'));
    assert.deepEqual(packagesAfterThird, packagesAfterFirst, '幂等提交不得写出第二个包');

    // 同一把键用在另一份请求上：必须报冲突，而不是把旧结果当成新结果返回。
    await assert.rejects(
      async () => commitPublication(harness.ctx, { ...setup.request, reviewDigest: 'another-digest' }),
      (error) => error.code === 'REVISION_CONFLICT' && error.status === 409,
    );
  } finally {
    harness.authoring.close();
    await safeRemove(harness.dir);
  }
});

test('并发与旧结果发布：晚到的那次拿到 409，且不会写坏版本', async () => {
  const harness = await makeHarness('publish-conflict');
  try {
    const setup = await publishableSetup(harness, { name: 'CONF' });
    const second = candidateFixture({ id: 'cand-CONF-second', from: setup.from, to: { node: DRAFT_NODE, version: '1' } });
    harness.authoring.saveCandidates(setup.run.id, [second]);
    const draft = harness.authoring.getDraft(setup.draft.id);
    const staleVersion = harness.source.current().version;

    // 两个请求都用**发布前**取的那份快照版本：真正的并发窗口就是这样。
    const requestA = { draftId: draft.id, draftRevision: draft.revision, ontologyVersion: staleVersion, acceptedCandidateIds: [setup.candidate.id], dismissedCandidateIds: [], idempotencyKey: 'key-concurrent-A' };
    const requestB = { draftId: draft.id, draftRevision: draft.revision, ontologyVersion: staleVersion, acceptedCandidateIds: [second.id], dismissedCandidateIds: [], idempotencyKey: 'key-concurrent-B' };
    const settled = await Promise.allSettled([commitPublication(harness.ctx, requestA), commitPublication(harness.ctx, requestB)]);
    const fulfilled = settled.filter((item) => item.status === 'fulfilled');
    const rejected = settled.filter((item) => item.status === 'rejected');
    assert.equal(fulfilled.length, 1, '同一时刻只应有一次发布成功');
    assert.equal(rejected.length, 1);
    assert.equal(rejected[0].reason.status, 409);
    assert.ok(['ONTOLOGY_VERSION_CONFLICT', 'REVISION_CONFLICT'].includes(rejected[0].reason.code));

    // 生效版本仍然是一个完整版本：没有半新半旧。
    await harness.source.reload();
    const ontology = harness.source.current();
    assert.equal(ontology.version, fulfilled[0].value.ontologyVersion);
    assert.ok(ontology.maybeNode(DRAFT_NODE));

    // 旧结果（在旧本体版本下跑出来的任务）再想发布 → 409。
    const otherDraft = makeDraft(harness, { node: 'ext:test-second-node' });
    const otherRun = seedRun(harness, { draftId: otherDraft.id, candidates: [], ontologyVersion: staleVersion });
    await assert.rejects(
      async () => commitPublication(harness.ctx, { draftId: otherDraft.id, draftRevision: otherDraft.revision, ontologyVersion: harness.source.current().version, acceptedCandidateIds: [], dismissedCandidateIds: [], runId: otherRun.id }),
      (error) => error.status === 409,
    );
  } finally {
    harness.authoring.close();
    await safeRemove(harness.dir);
  }
});

test('任一步失败 → 原版本继续生效（逐阶段注入失败）', async () => {
  /* ---- 第 1 步：草稿修订与本体版本核对 ---- */
  {
    const harness = await makeHarness('fail-step1');
    try {
      const setup = await publishableSetup(harness, { name: 'F1' });
      await assert.rejects(
      async () => commitPublication(harness.ctx, { ...setup.request, draftRevision: setup.draft.revision + 5 }),
        (error) => error.code === 'REVISION_CONFLICT' && error.status === 409,
      );
      await assert.rejects(
      async () => commitPublication(harness.ctx, { ...setup.request, ontologyVersion: 'sha256:stale' }),
        (error) => error.code === 'ONTOLOGY_VERSION_CONFLICT' && error.status === 409,
      );
      assert.equal(await extensions.readActivePointer(harness.ctx), null, '失败后不该有任何激活指针');
      assert.deepEqual(await readdir(harness.extensionsDir).catch(() => []), [], '失败后不该留下内容包');
    } finally {
      harness.authoring.close();
      await safeRemove(harness.dir);
    }
  }

  /* ---- 第 2 步：重放未通过 ---- */
  {
    const replay = fakeReplay({ result: () => ({ ok: false, check: { status: 'failed' }, problems: ['证书被改了一个字'] }) });
    const harness = await makeHarness('fail-step2', { replay });
    try {
      const setup = await publishableSetup(harness, { name: 'F2' });
      await assert.rejects(
      async () => commitPublication(harness.ctx, setup.request),
        (error) => error.code === 'EVIDENCE_FAILED' && error.status === 409 && error.details.step === 'replay',
      );
      assert.equal(await extensions.readActivePointer(harness.ctx), null);
      assert.deepEqual(await readdir(harness.extensionsDir).catch(() => []), []);
    } finally {
      harness.authoring.close();
      await safeRemove(harness.dir);
    }
  }

  /* ---- 第 3 步：隔离区合成不通过（契约引用未知节点） ---- */
  {
    const harness = await makeHarness('fail-step3');
    try {
      const draft = makeDraft(harness, {
        extra: {
          contracts: [{
            id: 'act:broken', mode: 'deduction', title: '引用未知节点的契约',
            inputs: [{ node: 'ext:not-published-yet', accepts: ['statement'] }],
            outputs: [{ node: DRAFT_NODE, provides: ['proof'] }],
            witness: { type: 'declared', status: 'DEF' }, version: '1',
          }],
        },
      });
      const from = baseNode(harness);
      const candidate = candidateFixture({ id: 'cand-F3', from, to: { node: DRAFT_NODE, version: '1' } });
      seedRun(harness, { draftId: draft.id, candidates: [candidate] });
      const request = { draftId: draft.id, draftRevision: draft.revision, ontologyVersion: harness.source.current().version, acceptedCandidateIds: [candidate.id], dismissedCandidateIds: [] };

      // 预览就该看得见阻断项；提交则在隔离区被挡下。
      const preview = await previewPublication(harness.ctx, request);
      await assert.rejects(
      async () => commitPublication(harness.ctx, request),
        (error) => error.code === 'ONTOLOGY_INVALID',
      );
      assert.equal(preview.sealed, true, '契约引用的未知节点要在隔离区合成时才暴露，预览本身不阻断');
      assert.equal(await extensions.readActivePointer(harness.ctx), null);
      assert.deepEqual(await readdir(harness.extensionsDir).catch(() => []), []);
      // 暂存目录用后即清：试算场地不该留垃圾。
      assert.equal(existsSync(join(harness.dir, 'publication-staging')), false);
    } finally {
      harness.authoring.close();
      await safeRemove(harness.dir);
    }
  }

  /* ---- 第 4 步：写包失败（目标目录被一个文件占住） ---- */
  {
    const harness = await makeHarness('fail-step4');
    try {
      const setup = await publishableSetup(harness, { name: 'F4' });
      const preview = await previewPublication(harness.ctx, setup.request);
      await mkdir(harness.extensionsDir, { recursive: true });
      // 目录名是 `rev-<哈希>`（Windows 不允许文件名里有冒号），这里按同一条规则拼。
      await writeFile(join(harness.extensionsDir, extensions.dirNameFor(preview.revision.id)), 'not a directory', 'utf8');
      await assert.rejects(
      async () => commitPublication(harness.ctx, setup.request),
        (error) => error.status === 409 || error.code === 'INTERNAL',
      );
      assert.equal(await extensions.readActivePointer(harness.ctx), null, '写包失败不能切指针');
      await harness.source.reload();
      assert.equal(harness.source.applied(), false);
      assert.equal(harness.source.current().version, harness.source.base.version);
    } finally {
      harness.authoring.close();
      await safeRemove(harness.dir);
    }
  }

  /* ---- 第 5 步：切换前发现本体快照已变 ---- */
  {
    const harness = await makeHarness('fail-step5');
    try {
      const setup = await publishableSetup(harness, { name: 'F5' });
      const real = harness.source;
      let composed = false;
      const drifting = {
        get base() { return real.base; },
        current() {
          /*
           * 隔离区合成之后（第 3 步跑完）再取 current()，就回一个「版本不同」的替身：
           * 第 5 步正是要在切指针之前复核「这期间本体有没有变」。
           */
          const instance = real.current();
          return composed ? { ...instance, version: 'sha256:drifted' } : instance;
        },
        reload: () => real.reload(),
        activeRevision: () => real.activeRevision(),
        integrity: () => real.integrity(),
        applyPackage(pkg, opts) { composed = true; return real.applyPackage(pkg, opts); },
      };
      await assert.rejects(
      async () => commitPublication({ ...harness.ctx, ontologySource: drifting }, setup.request),
        (error) => error.code === 'ONTOLOGY_VERSION_CONFLICT' && error.details?.step === 'activate',
      );
      assert.equal(await extensions.readActivePointer(harness.ctx), null);
      await real.reload();
      assert.equal(real.applied(), false);
    } finally {
      harness.authoring.close();
      await safeRemove(harness.dir);
    }
  }

  /* ---- 第 6 步：切换后快照没能接管 → 指针回退 ---- */
  {
    const harness = await makeHarness('fail-step6');
    try {
      const setup = await publishableSetup(harness, { name: 'F6' });
      const real = harness.source;
      let failNextReload = true;
      const flaky = {
        get base() { return real.base; },
        current: () => real.current(),
        async reload() {
          if (failNextReload) { failNextReload = false; throw new Error('模拟：更新快照失败'); }
          return real.reload();
        },
        activeRevision: () => real.activeRevision(),
        integrity: () => real.integrity(),
        applyPackage: (pkg, opts) => real.applyPackage(pkg, opts),
      };
      await assert.rejects(
      async () => commitPublication({ ...harness.ctx, ontologySource: flaky }, setup.request),
        (error) => error.code === 'INTERNAL' && error.details?.step === 'reload',
      );
      const pointer = await extensions.readActivePointer(harness.ctx);
      assert.equal(pointer?.revision ?? null, null, '第 6 步失败必须把指针回退到原版本');
      await real.reload();
      assert.equal(real.applied(), false, '回退之后生效的仍是原版本');
      assert.equal(real.current().version, real.base.version);
    } finally {
      harness.authoring.close();
      await safeRemove(harness.dir);
    }
  }
});

/* ---------------------------------------------------------- 4. 中断恢复 */

test('服务重启：运行中的任务标 interrupted，已核验结果原样保留', async () => {
  const harness = await makeHarness('restart-interrupted');
  try {
    const draft = makeDraft(harness);
    const from = baseNode(harness);
    const verified = candidateFixture({ id: 'cand-R-verified', from, to: { node: DRAFT_NODE, version: '1' } });
    const undecided = candidateFixture({ id: 'cand-R-undecided', from, to: { node: DRAFT_NODE, version: '1' }, math: 'undecided', evidence: false });
    const run = seedRun(harness, { draftId: draft.id, candidates: [verified, undecided], status: 'running' });

    const restart = harness.authoring.markInterruptedRuns();
    assert.equal(restart.count, 1);
    const after = harness.authoring.getRun(run.id);
    assert.equal(after.status, 'interrupted');
    assert.equal(after.interrupted, true);
    assert.ok(after.finishedAt);

    const byId = new Map(after.candidates.map((item) => [item.id, item]));
    assert.equal(byId.get(verified.id).math.status, 'verified', '已核验结果必须保留');
    assert.equal(byId.get(undecided.id).math.status, 'undecided');
    assert.notEqual(byId.get(undecided.id).math.status, 'refuted', '中断不是数学反驳');
    assert.ok(byId.get(verified.id).evidence, '证据也保留');

    // 中断过的任务里，已核验的那部分仍然可以发布（未完成部分保持待证）。
    const request = {
      draftId: draft.id, draftRevision: draft.revision, ontologyVersion: harness.source.current().version,
      acceptedCandidateIds: [verified.id], dismissedCandidateIds: [], runId: run.id,
    };
    const preview = await previewPublication(harness.ctx, request);
    assert.ok(preview.warnings.some((item) => item.includes('interrupted')), preview.warnings.join('；'));
    const committed = await commitPublication(harness.ctx, request);
    assert.ok(committed.revision.id.startsWith('rev:'));

    // 再跑一次重启收尾：没有 running/queued 的任务，不该有动作。
    assert.equal(harness.authoring.markInterruptedRuns().count, 0);
  } finally {
    harness.authoring.close();
    await safeRemove(harness.dir);
  }
});

test('取消任务：状态变 cancelled，已完成的候选结果保留', async () => {
  const harness = await makeHarness('cancel-run');
  try {
    const draft = makeDraft(harness);
    const from = baseNode(harness);
    const candidate = candidateFixture({ id: 'cand-C', from, to: { node: DRAFT_NODE, version: '1' } });
    const run = seedRun(harness, { draftId: draft.id, candidates: [candidate], status: 'running' });
    const cancelled = await harness.authoring.cancelRun(run.id);
    assert.equal(cancelled.cancelled, true);
    assert.equal(cancelled.status, 'cancelled');
    assert.equal(cancelled.candidates.length, 1);
    assert.equal(cancelled.candidates[0].math.status, 'verified');
    const again = await harness.authoring.cancelRun(run.id);
    assert.equal(again.cancelled, false);
  } finally {
    harness.authoring.close();
    await safeRemove(harness.dir);
  }
});

/* ------------------------------------------------------------- 5. 回滚 */

test('回滚创建新 revision：不删历史包/证据/学习者记录，且没有悬空引用', async () => {
  const harness = await makeHarness('rollback');
  try {
    // 学习者 E 库：回滚绝不能碰它。
    const learner = await createLearnerStore({ config: { dbFile: harness.config.dbFile } });
    const profile = await learner.createProfile({ name: '测试学习者', modelVersion: 'mcs-learner/1' });
    const note = await learner.createNote(profile.id, { nodeId: baseNode(harness).node, title: '个人笔记', body: '回滚不该动这条。', tags: ['test'], baseRevision: 1 });
    await learner.appendEvent(profile.id, {
      eventId: 'evt-1', ontologyVersion: 'test', kind: 'view', nodeId: baseNode(harness).node,
      occurredAt: new Date().toISOString(), baseRevision: 2, source: { kind: 'user', ref: 'test' }, evidenceRefs: [], payload: {},
    });
    const learnerBefore = await learner.exportProfile(profile.id);

    // 第一次发布：草稿节点甲 + 一条定义引用 + 一份契约。
    const first = await publishableSetup(harness, { name: 'RB1' });
    const draft1 = harness.authoring.updateDraft(first.draft.id, {
      contracts: [{
        id: 'act:first', mode: 'deduction', title: '第一版契约',
        inputs: [{ node: DRAFT_NODE, accepts: ['statement'] }],
        outputs: [{ node: first.from.node, provides: ['proof'] }],
        witness: { type: 'declared', status: 'DEF' }, version: '1',
      }],
    }, { expectedRevision: first.draft.revision, ontologyVersion: harness.source.current().version });
    const rev1 = await commitPublication(harness.ctx, { ...first.request, draftRevision: draft1.revision });
    assert.equal(rev1.revision.summary.contracts, 1);
    assert.equal(rev1.revision.summary.nodes, 1);

    // 第二次发布：再加一个新节点乙，以及一条**依赖乙**的关系与契约。
    const secondNode = 'ext:test-dependent-node';
    const draft2 = makeDraft(harness, { node: secondNode });
    const relationCandidate = candidateFixture({ id: 'cand-RB2', from: { node: DRAFT_NODE, version: '1' }, to: { node: secondNode, version: '1' } });
    seedRun(harness, { draftId: draft2.id, candidates: [relationCandidate] });
    const draft2b = harness.authoring.updateDraft(draft2.id, {
      contracts: [{
        id: 'act:second', mode: 'deduction', title: '第二版契约',
        inputs: [{ node: secondNode, accepts: ['statement'] }],
        outputs: [{ node: DRAFT_NODE, provides: ['proof'] }],
        witness: { type: 'declared', status: 'DEF' }, version: '1',
      }],
    }, { expectedRevision: draft2.revision, ontologyVersion: harness.source.current().version });
    const rev2 = await commitPublication(harness.ctx, {
      draftId: draft2b.id, draftRevision: draft2b.revision, ontologyVersion: harness.source.current().version,
      acceptedCandidateIds: [relationCandidate.id], dismissedCandidateIds: [], idempotencyKey: 'key-RB2',
    });
    assert.equal(rev2.revision.summary.nodes, 2, '第二个版本应累积两个扩展节点');
    const beforeRollbackOntology = harness.source.current();
    assert.ok(beforeRollbackOntology.maybeNode(secondNode));
    assert.ok(beforeRollbackOntology.raw.relationDescriptions.some((item) => item.id === `rel:${relationCandidate.id}`));

    // 回滚到第一版。
    const rolled = await rollbackPublication(harness.ctx, { revisionId: rev1.revision.id, ontologyVersion: harness.source.current().version, idempotencyKey: 'key-RB-back' });
    assert.equal(rolled.revision.kind, 'rollback');
    assert.equal(rolled.revision.restores, rev1.revision.id);
    assert.notEqual(rolled.revision.id, rev1.revision.id, '回滚必须是**新的一条**版本记录');
    assert.equal(rolled.restoredFrom, rev1.revision.id);

    // 后继新增（节点乙、依赖它的关系与契约）被连带处理，逐条有账。
    assert.ok(rolled.dropped.nodes.some((item) => item.id === secondNode));
    assert.ok(rolled.dropped.relations.some((item) => item.id === `rel:${relationCandidate.id}`));
    assert.ok(rolled.dropped.contracts.some((item) => item.id === 'act:second'));
    assert.ok(rolled.dropped.cascade.some((item) => item.id === `rel:${relationCandidate.id}`), '依赖被摘节点的关系要出现在连带清单里');

    await harness.source.reload();
    const after = harness.source.current();

    // 当前公共网络没有悬空引用：关系/证据/契约的每一端都解析得到。
    const nodeIds = new Set(after.raw.nodes.map((item) => item.id));
    const evidenceIds = new Set(after.raw.evidence.map((item) => item.id));
    for (const relation of after.raw.relationDescriptions) {
      assert.ok(nodeIds.has(relation.from), `悬空起点：${relation.id} → ${relation.from}`);
      assert.ok(nodeIds.has(relation.to), `悬空终点：${relation.id} → ${relation.to}`);
      if (relation.evidenceRef) assert.ok(evidenceIds.has(relation.evidenceRef), `悬空证据：${relation.id}`);
    }
    for (const record of after.raw.evidence) {
      for (const nodeId of record.nodes ?? []) assert.ok(nodeIds.has(nodeId), `证据 ${record.id} 引用未知节点 ${nodeId}`);
    }
    for (const contract of after.raw.actions) {
      for (const port of [...(contract.inputs ?? []), ...(contract.outputs ?? [])]) {
        assert.ok(nodeIds.has(port.node), `契约 ${contract.id} 引用未知节点 ${port.node}`);
      }
    }
    assert.equal(after.maybeNode(secondNode), null, '回滚后乙节点不再生效');
    assert.ok(after.maybeNode(DRAFT_NODE), '第一版的节点仍在生效');
    assert.equal(after.raw.actions.some((item) => item.id === 'act:second'), false);
    assert.equal(after.raw.actions.some((item) => item.id === 'act:first'), true);

    // 历史包一个都没删：两个发布版本 + 一个回滚版本都在盘上。
    const packages = (await readdir(harness.extensionsDir)).filter((name) => name.startsWith('rev-'));
    assert.equal(packages.length, 3);
    const rev1OnDisk = await extensions.verifyPackage(harness.ctx, rev1.revision.id);
    assert.equal(rev1OnDisk.ok, true, '历史包必须原样可读');
    assert.equal((await extensions.readPackage(harness.ctx, rev1.revision.id)).package.nodes.length, 1);

    // 编写库里的草稿、运行与候选都还在。
    assert.equal(harness.authoring.getDraft(first.draft.id).publishedRevisionId, rev1.revision.id);
    assert.equal(harness.authoring.listRuns({ limit: 50 }).length, 2);
    assert.equal(harness.authoring.listCandidates(first.run.id).length, 3);

    // 学习者记录逐字节没变。
    const learnerAfter = await learner.exportProfile(profile.id);
    assert.deepEqual(learnerAfter.notes, learnerBefore.notes);
    assert.deepEqual(learnerAfter.events, learnerBefore.events);
    assert.equal(learnerAfter.notes[0].noteId, note.noteId);
    await learner.close();

    // 回滚本身也能被再回滚：从回滚版本回到第二版，内容重新出现。
    const forward = await rollbackPublication(harness.ctx, { revisionId: rev2.revision.id, ontologyVersion: harness.source.current().version });
    await harness.source.reload();
    assert.ok(harness.source.current().maybeNode(secondNode), '回到第二版时，它新增的节点重新生效');
    assert.equal(forward.revision.kind, 'rollback');
    assert.equal(forward.revision.restores, rev2.revision.id);
  } finally {
    harness.authoring.close();
    await safeRemove(harness.dir);
  }
});

test('回滚同一版本两次：内容相同即同一个 revision（不会写出两个一样的包）', async () => {
  const harness = await makeHarness('rollback-idempotent');
  try {
    const setup = await publishableSetup(harness, { name: 'RBI' });
    const rev1 = await commitPublication(harness.ctx, setup.request);
    const second = makeDraft(harness, { node: 'ext:test-third-node' });
    seedRun(harness, { draftId: second.id, candidates: [] });
    const rev2 = await commitPublication(harness.ctx, {
      draftId: second.id, draftRevision: second.revision, ontologyVersion: harness.source.current().version,
      acceptedCandidateIds: [], dismissedCandidateIds: [], idempotencyKey: 'key-RBI-2',
    });
    assert.notEqual(rev1.revision.id, rev2.revision.id);

    const first = await rollbackPublication(harness.ctx, { revisionId: rev1.revision.id, ontologyVersion: harness.source.current().version });
    const again = await rollbackPublication(harness.ctx, { revisionId: rev1.revision.id, ontologyVersion: harness.source.current().version });
    assert.equal(again.revision.id, first.revision.id, '同一目标、同一父版本 → 同一个回滚版本');
    const packages = (await readdir(harness.extensionsDir)).filter((name) => name.startsWith('rev-'));
    assert.equal(packages.length, 3, '第二次回滚不该再写一个内容相同的包');

    // 回滚表里能看到三个版本，且最新的是回滚记录。
    const revisions = await listRevisions(harness.ctx);
    assert.equal(revisions.revisions.length, 3);
    assert.equal(revisions.active, first.revision.id);
    const activeMeta = revisions.revisions.find((item) => item.id === revisions.active);
    assert.equal(activeMeta.kind, 'rollback');
  } finally {
    harness.authoring.close();
    await safeRemove(harness.dir);
  }
});

test('回滚到正在生效的版本：安全空操作（幂等返回），不新增版本', async () => {
  const harness = await makeHarness('rollback-active');
  try {
    const setup = await publishableSetup(harness, { name: 'RBA' });
    const rev1 = await commitPublication(harness.ctx, setup.request);
    const before = (await readdir(harness.extensionsDir)).filter((name) => name.startsWith('rev-'));

    // 「回滚到本来就在生效的版本」不是错误：目标状态已经达成。
    const noop = await rollbackPublication(harness.ctx, { revisionId: rev1.revision.id, ontologyVersion: harness.source.current().version });
    assert.equal(noop.idempotent, true);
    assert.equal(noop.revision.id, rev1.revision.id);
    assert.match(noop.reason, /当前生效版本/);
    assert.deepEqual((await readdir(harness.extensionsDir)).filter((name) => name.startsWith('rev-')), before, '空回滚不写新包');

    // 目标版本不存在才是真错误。
    await assert.rejects(
      async () => rollbackPublication(harness.ctx, { revisionId: 'rev:0000000000000000' }),
      (error) => error.code === 'NOT_FOUND' && error.status === 404,
    );
  } finally {
    harness.authoring.close();
    await safeRemove(harness.dir);
  }
});

test('预算口径如实：耗时/截断/超时都写进 stats，并说明「单候选不可中断」', async () => {
  const harness = await makeHarness('budget-honesty');
  try {
    const specs = [];
    for (let index = 0; index < 5; index += 1) {
      specs.push({
        node: `ext:budget2-${index}`, nodeVersion: '1', background: 'bg:group/1',
        declarations: [{ name: 'x', type: 'G', role: 'element' }],
        definitions: [{ name: `sym${index}`, type: 'o', source: `sym${index}` }],
        assumptions: [], statement: { source: `sym${index}`, kind: 'formula' }, claims: [], references: [],
      });
    }
    const registry = { specs, symbols: Object.fromEntries(specs.map((spec, index) => [`sym${index}`, { node: spec.node, version: '1', type: 'o' }])) };
    const outcome = discoverRelations({
      ontology: harness.source.base, registry, nodeRef: { node: 'ext:budget2-0', version: '1' },
      budget: { maxCandidates: 2, totalMs: 5000 },
      deps: { language: null, judgment: null, search: null, certificate: null, kernel: null, finite: null, verify: null, theory: null },
    });
    assert.equal(outcome.stats.unprocessed > 0, true);
    assert.equal(outcome.stats.candidates + outcome.stats.unprocessed > 2, true);
    assert.equal(typeof outcome.stats.durationMs, 'number');
    assert.ok(outcome.stats.durationMs >= 0);
    assert.equal(outcome.stats.budget.interruptible, false, '同步路径不假装能中断单个候选');
    assert.equal(outcome.stats.budget.totalMs, 5000);
    assert.ok(outcome.stats.warnings.some((item) => item.includes('候选上限')), outcome.stats.warnings.join('；'));
    assert.equal(typeof outcome.stats.timedOut, 'number');
  } finally {
    harness.authoring.close();
    await safeRemove(harness.dir);
  }
});

/* ------------------------------------------------- 6. 发现编排（注入假引擎） */

test('发现编排：候选生成 → 判定 → 统计字段齐全（同步）', async () => {
  const harness = await makeHarness('discovery-stats');
  try {
    const from = baseNode(harness);
    const specs = [
      { node: from.node, nodeVersion: String(from.version ?? '1'), background: 'bg:group/1', declarations: [{ name: 'mul', type: 'G -> G -> G', role: 'function' }], definitions: [{ name: 'commutative_group', type: 'o', source: 'commutative_group' }], assumptions: [], statement: { source: 'commutative_group', kind: 'formula' }, claims: [], references: [] },
      { node: DRAFT_NODE, nodeVersion: '1', background: 'bg:group/1', declarations: [{ name: 'mul', type: 'G -> G -> G', role: 'function' }], definitions: [], assumptions: [], statement: { source: '∀a b. commutative_group ⇒ mul a b = mul b a', kind: 'formula' }, claims: [], references: [] },
    ];
    const outcome = discoverRelations({
      ontology: harness.source.base,
      registry: { specs, symbols: { commutative_group: { node: from.node, version: String(from.version ?? '1'), type: 'o' } } },
      draft: null,
      nodeRef: { node: DRAFT_NODE, version: '1' },
      budget: { maxCandidates: 20 },
      // 显式禁用全部引擎：这条用例测的是「没有引擎时的口径」，不能随上游模块是否落地而变。
      deps: { language: null, judgment: null, search: null, certificate: null, kernel: null, finite: null, verify: null, theory: null },
    });

    assert.ok(Array.isArray(outcome.candidates));
    assert.ok(outcome.candidates.length >= 1, '至少应生成一条候选');
    for (const key of ['candidates', 'coveredNodes', 'durationMs', 'verified', 'refuted', 'undecided', 'unprocessed', 'runVersion', 'generatorVersion', 'checkerSha256']) {
      assert.ok(key in outcome.stats, `统计字段缺 ${key}：${JSON.stringify(outcome.stats)}`);
    }
    assert.equal(outcome.stats.runVersion, 'mcs-discovery-run/1');
    assert.equal(outcome.stats.generatorVersion, 'mcs-discovery/1');
    assert.deepEqual(outcome.stats.engineReady, { search: false, certificate: false, kernel: false, finite: false });

    // 定义引用不需要引擎：版本 + 类型核对通过就是 verified，标签是 DEF（不是 PROOF）。
    const references = outcome.candidates.filter((item) => item.kind === 'definitionReference');
    assert.ok(references.length >= 1);
    assert.ok(references.every((item) => item.math.status === 'verified'));
    assert.ok(references.every((item) => item.label === 'DEF'));
    assert.ok(references.every((item) => item.evidence?.kind === 'reference'));
    assert.ok(outcome.stats.refuted === 0, '没有任何东西被反驳');
    // 要证书的那几类在没有引擎时只能停在未决：不冒充已验证。
    const certificateKinds = outcome.candidates.filter((item) => item.kind !== 'definitionReference');
    assert.ok(certificateKinds.every((item) => item.math.status === 'undecided'));
    assert.ok(certificateKinds.every((item) => item.run.status === 'unsupported'));
    assert.equal(outcome.stats.verified, references.length);
    assert.equal(outcome.stats.undecided, certificateKinds.length);
  } finally {
    harness.authoring.close();
    await safeRemove(harness.dir);
  }
});

test('发现编排：预算截断保留已完成结果，并如实报未处理数量', async () => {
  const harness = await makeHarness('discovery-budget');
  try {
    const specs = [];
    for (let index = 0; index < 6; index += 1) {
      specs.push({
        node: `ext:budget-${index}`, nodeVersion: '1', background: 'bg:group/1',
        declarations: [{ name: 'x', type: 'G', role: 'element' }],
        definitions: [{ name: `sym${index}`, type: 'o', source: `sym${index}` }],
        assumptions: [], statement: { source: `sym${index}`, kind: 'formula' }, claims: [], references: [],
      });
    }
    const registry = { specs, symbols: Object.fromEntries(specs.map((spec, index) => [`sym${index}`, { node: spec.node, version: '1', type: 'o' }])) };
    // 先不设上限跑一遍，拿到「一共有多少候选」，再验证截断后的账目对得上。
    const uncapped = discoverRelations({ ontology: harness.source.base, registry, nodeRef: { node: 'ext:budget-0', version: '1' }, budget: { maxCandidates: 50 } });
    const outcome = discoverRelations({
      ontology: harness.source.base,
      registry,
      nodeRef: { node: 'ext:budget-0', version: '1' },
      budget: { maxCandidates: 2 },
    });
    assert.equal(outcome.stats.candidates, 2);
    assert.equal(outcome.stats.unprocessed, uncapped.stats.candidates - 2, '超出的部分要如实计数');
    assert.equal(outcome.candidates.length, 2);
    assert.ok(outcome.candidates.every((item) => item.math.status === 'undecided'));
  } finally {
    harness.authoring.close();
    await safeRemove(harness.dir);
  }
});

test('判定器：定义引用靠「引入登记」核对——真引用成立，同名局部参数不算引用', () => {
  const judge = makeJudge('definitionReference', {});
  /*
   * 判据的来源只有两份登记数据：`PROVIDES`（谁**引入**了符号）与节点自己的 `definitions`。
   * 「名字在正文里出现过」只是必要条件——2026-10-04 验收抓到的正是把局部参数
   * 当成公共符号后产生的假引用（群与阿贝尔群共享 `mul0`，于是"群引用了阿贝尔群"被认证）。
   */
  const provides = [
    { symbol: 'left_mul', node: 'group:left-mul', version: '1', type: '(G -> G -> G) -> G -> G -> G', background: 'bg:group/1' },
  ];
  const consumer = {
    node: 'group:claim-injective', nodeVersion: '1', background: 'bg:group/1',
    declarations: [{ name: 'g0', type: 'G', role: 'element' }, { name: 'h0', type: 'G', role: 'element' }],
    definitions: [],
    statement: { source: 'g0 = h0' },
    assumptions: [{ id: 'A1', source: 'right_identity(mul)(e)' }],
    claims: [{ id: 'C1', source: 'left_mul(mul)(g0) = left_mul(mul)(h0)' }],
    references: [],
  };
  const registry = { specs: [consumer], PROVIDES: provides };

  const candidates = judge.candidates(consumer, { registry });
  const leftMul = candidates.find((item) => item.symbol === 'left_mul');
  assert.ok(leftMul, '有 PROVIDES 引入登记的符号应生成候选');
  // 方向按登记表惯例：from = 用到符号的节点，to = **引入**符号的节点。
  assert.equal(leftMul.from.node, 'group:claim-injective');
  assert.equal(leftMul.to.node, 'group:left-mul');

  const ok = judge.confirm(leftMul, { registry });
  assert.equal(ok.status, 'proved');
  assert.equal(ok.evidenceKind, 'reference');
  // 「成立在哪一条登记上」必须能显示出来，而不是一句"已核"。
  assert.equal(ok.checkedBy, 'PROVIDES');
  assert.equal(ok.provider.node, 'group:left-mul');
  assert.equal(ok.provider.type, '(G -> G -> G) -> G -> G -> G');

  /*
   * 版本失效：判定器比的是「引入方的**当前**版本」与「登记里记的版本」。
   * 这里把对端 spec 的 nodeVersion 抬到 2、PROVIDES 仍记 1 —— 正是"登记过期"的形状。
   * （候选自带的 `to.version` 目前不参与这一步，见交付说明里的那条待裁决。）
   */
  const movedProvider = {
    ...consumer,
    node: 'group:left-mul', nodeVersion: '2',
    declarations: [], definitions: [], assumptions: [], claims: [], references: [],
    statement: { source: 'left_mul(mul)(g0)' },
  };
  const stale = judge.confirm(leftMul, { registry: { specs: [consumer, movedProvider], PROVIDES: provides } });
  assert.equal(stale.status, 'unsupported');
  assert.match(stale.reason, /stale-reference/);

  // 对端根本不是引入方：同上，如实报 stale-reference，而不是"换一个像的"。
  const wrongProvider = judge.confirm({ ...leftMul, to: { node: 'group:group-concept', version: '1' } }, { registry });
  assert.equal(wrongProvider.status, 'unsupported');
  assert.match(wrongProvider.reason, /stale-reference/);

  /*
   * 假引用：`mul0` 是**两条陈述各自的局部参数**（本站数据里群与阿贝尔群都这么写），
   * 谁都没有"引入"它。这类候选要么根本不生成，要么在确认段被挡下并点明「局部声明」。
   */
  const abelian = {
    node: 'concept:group:abelian', nodeVersion: '1', background: 'bg:group/1',
    declarations: [{ name: 'mul0', type: 'G -> G -> G', role: 'function' }],
    definitions: [], assumptions: [], claims: [], references: [],
    statement: { source: 'abelian_group(mul0)' },
  };
  const groupConcept = {
    node: 'group:group-concept', nodeVersion: '1', background: 'bg:group/1',
    declarations: [{ name: 'mul0', type: 'G -> G -> G', role: 'function' }],
    definitions: [], assumptions: [], claims: [], references: [],
    statement: { source: 'mul0(mul0)' },
  };
  const localRegistry = { specs: [abelian, groupConcept], PROVIDES: [] };
  const fakeCandidates = judge.candidates(groupConcept, { registry: localRegistry });
  assert.equal(fakeCandidates.length, 0, '只有同名局部参数时不该生成跨节点候选');
  const forced = judge.confirm(
    { kind: 'definitionReference', symbol: 'mul0', from: { node: 'group:group-concept', version: '1' }, to: { node: 'concept:group:abelian', version: '1' } },
    { registry: localRegistry },
  );
  assert.equal(forced.status, 'undecided');
  assert.match(forced.reason, /局部声明/);

  // 没有引入登记时也必须如实未决，而不是退回"名字出现过就算引用"。
  const noRegister = judge.confirm(
    { kind: 'definitionReference', symbol: 'left_mul', from: { node: 'group:claim-injective', version: '1' }, to: { node: 'group:left-mul', version: '1' } },
    { registry: { specs: [consumer], PROVIDES: [] } },
  );
  assert.equal(noRegister.status, 'undecided');
  assert.match(noRegister.reason, /同样|引入/);
});

test('判定器索引：六类齐全，缺引擎时如实报 unsupported 而不是伪造判定', async () => {
  assert.deepEqual([...RELATION_KINDS], ['definitionReference', 'hardGeneralization', 'equivalentTo', 'conditionalDerivation', 'instanceOf', 'counterexampleTo']);
  const listed = listJudges({});
  assert.equal(listed.length, 6);
  for (const entry of listed) assert.ok(entry.hasCandidates && entry.hasConfirm);

  const collected = collectCandidates({
    registry: {
      specs: [
        { node: 'ext:a', nodeVersion: '1', background: 'bg:group/1', declarations: [{ name: 'x', type: 'G', role: 'element' }], definitions: [], assumptions: [], statement: { source: '∀x. P x' }, claims: [], references: [] },
        { node: 'ext:b', nodeVersion: '1', background: 'bg:group/1', declarations: [{ name: 'y', type: 'G', role: 'element' }], definitions: [], assumptions: [], statement: { source: '∀y. Q y' }, claims: [], references: [] },
      ],
      models: [{ id: 'ext:a-model', case: 'ext', carrier: 'Z/5Z*', version: '1' }],
    },
    deps: {},
  }, { kinds: RELATION_KINDS, specs: null });
  const shapes = collected.candidates;
  assert.ok(shapes.length > 0);

  const generalization = makeJudge('hardGeneralization', {});
  const pair = shapes.find((item) => item.kind === 'hardGeneralization');
  if (pair) {
    const verdict = await generalization.confirm(pair, { registry: { specs: [] } });
    assert.equal(verdict.status, 'unsupported');
    assert.match(verdict.reason, /依赖未装配/);
  }
  const instance = makeJudge('instanceOf', {});
  const finiteShape = shapes.find((item) => item.kind === 'instanceOf');
  assert.ok(finiteShape, '有限对象存在时应生成 instanceOf 候选');
  const finiteVerdict = await instance.confirm(finiteShape, { registry: { specs: [] } });
  assert.equal(finiteVerdict.status, 'unsupported');
});

/* --------------------------------------------- 7. 发现 → 发布 的端到端 */

test('端到端：发现产出候选 → 重放 → 入库（假引擎驱动的完整链路）', async () => {
  const harness = await makeHarness('end-to-end');
  try {
    const from = baseNode(harness);
    const symbols = { commutative_group: { node: from.node, version: String(from.version ?? '1'), type: 'o' } };
    const specs = [
      { node: from.node, nodeVersion: String(from.version ?? '1'), background: 'bg:group/1', declarations: [{ name: 'mul', type: 'G -> G -> G', role: 'function' }], definitions: [{ name: 'commutative_group', type: 'o', source: 'commutative_group' }], assumptions: [], statement: { source: 'commutative_group', kind: 'formula' }, claims: [], references: [] },
      { node: DRAFT_NODE, nodeVersion: '1', background: 'bg:group/1', declarations: [{ name: 'mul', type: 'G -> G -> G', role: 'function' }], definitions: [], assumptions: [], statement: { source: '∀a b. commutative_group ⇒ mul a b = mul b a', kind: 'formula' }, claims: [], references: [] },
    ];
    const registry = { specs, symbols };
    /*
     * `discoverRelations` 返回的是**混合对象**：
     * - 同步字段（`candidates` / `stats`）立刻可用 —— `server/api.mjs` 的同步用法就是取它；
     * - `await` 它则等到异步判定（机器检查要起子进程）跑完，**就地**补上结论。
     *
     * 所以「不冒充已验证」这条要在**同步快照**上守：凡是判定还没回来的候选，
     * 必须带 `pendingCheck` 且不是 verified。await 之后拿到的 verified 是真跑过检查的结果，
     * 由下面第二条断言（必须有 passed 的检查器记录）守住。
     */
    const outcome = discoverRelations({
      ontology: harness.source.base, registry, nodeRef: { node: DRAFT_NODE, version: '1' },
      budget: { maxCandidates: 10 },
    });
    const syncSnapshot = outcome.candidates.map((item) => ({ ...item, math: { ...item.math } }));
    for (const candidate of syncSnapshot) {
      if (candidate.pendingCheck) {
        assert.notEqual(candidate.math.status, 'verified', '判定还没回来就不能自称已验证');
      }
      if (candidate.math.status === 'verified') {
        // verified 必须有**当场跑过**的核对记录：定义引用是同步的登记核对，其余是内核证书。
        assert.ok(candidate.evidence, `verified 候选 ${candidate.id} 缺少证据记录`);
        assert.equal(candidate.evidence.checkerVerified, false, '不得声称检查器本身已获形式验证');
      }
    }

    await outcome;    // 等异步判定结算：同一批候选对象会被就地更新
    const definitionReferences = outcome.candidates.filter((item) => item.kind === 'definitionReference');
    assert.equal(definitionReferences.length, 1);
    for (const candidate of outcome.candidates) {
      if (candidate.math.status !== 'verified') continue;
      if (candidate.label === 'PROOF') {
        assert.equal(candidate.evidence?.checkStatus, 'passed', `PROOF 候选 ${candidate.id} 必须带 passed 的检查记录`);
        assert.ok(candidate.evidence?.checker, `PROOF 候选 ${candidate.id} 必须记下检查器`);
      } else {
        // DEF（定义引用）：不需要证书，但必须写明证据种类就是 reference。
        assert.equal(candidate.evidence?.kind, 'reference');
      }
    }

    // 重放：定义引用不需要证书，版本对得上就算复现。
    const replayed = await replayCandidate({ candidate: definitionReferences[0], registry, ontology: harness.source.base, repoRoot: REPO_ROOT });
    assert.equal(replayed.ok, true);
    assert.deepEqual(replayed.problems, []);
    assert.equal(replayed.candidate.replay.status, 'not_run');

    // 把发现结果与重放结果写进编写库，再走发布。
    const draft = makeDraft(harness);
    const run = harness.authoring.createRun({
      draftId: draft.id, nodeRef: { node: DRAFT_NODE, version: '1' },
      ontologyVersion: harness.source.base.version, background: 'bg:group/1', budget: { ...DISCOVERY_BUDGET },
    });
    harness.authoring.saveCandidates(run.id, outcome.candidates);
    harness.authoring.updateRun(run.id, { status: 'completed', stats: outcome.stats });
    harness.authoring.setReview(run.id, [replayed.candidate.id], 'accepted');

    const selected = harness.authoring.getRun(run.id).candidates.filter((item) => item.review === 'accepted');
    assert.equal(selected.length, 1);
    // 让重放把定义引用确认成 verified（真链路由上游的 verify.mjs 完成，这里注入同等结果）。
    harness.authoring.saveCandidates(run.id, [{
      ...replayed.candidate,
      math: { status: 'verified', reason: '重放确认定义引用成立', scope: '定义层' },
      evidence: { id: `ev:${replayed.candidate.id}`, kind: 'reference', status: 'DEF', checkStatus: 'not_run', title: '定义引用', scope: '定义层', nodes: [replayed.candidate.from.node, replayed.candidate.to.node], checkerVerified: false },
    }]);

    const committed = await commitPublication(harness.ctx, {
      draftId: draft.id, draftRevision: draft.revision, ontologyVersion: harness.source.current().version,
      acceptedCandidateIds: [replayed.candidate.id], dismissedCandidateIds: [], runId: run.id,
    });
    await harness.source.reload();
    const ontology = harness.source.current();
    assert.ok(ontology.maybeNode(DRAFT_NODE));
    assert.ok(ontology.raw.relationDescriptions.some((item) => item.id === `rel:${replayed.candidate.id}`));
    assert.equal(committed.revision.kind, 'publish');
    // 发布后审阅状态推进到 published，草稿记录下已发布版本。
    assert.equal(harness.authoring.getDraft(draft.id).publishedRevisionId, committed.revision.id);
    assert.equal(harness.authoring.listCandidates(run.id).find((item) => item.id === replayed.candidate.id).review, 'published');
  } finally {
    harness.authoring.close();
    await safeRemove(harness.dir);
  }
});

/* --------------------------------------------------------- 8. 写入口边界 */

test('写入口只在本机开放；请求只吃声明式数据', async () => {
  assert.equal(assertLoopbackWrite('127.0.0.1'), true);
  assert.equal(assertLoopbackWrite('localhost'), true);
  assert.equal(assertLoopbackWrite('::1'), true);
  assert.throws(() => assertLoopbackWrite('evil.example.com'), (error) => error.status === 403);
  assert.equal(assertLoopbackWrite('evil.example.com', { dev: true }), true);

  const harness = await makeHarness('write-entry');
  try {
    await assert.rejects(
      async () => previewPublication(harness.ctx, { draftId: 'x', draftRevision: 1, acceptedCandidateIds: [() => {}] }),
      (error) => error.code === 'BAD_REQUEST',
    );
    await assert.rejects(
      async () => previewPublication(harness.ctx, { draftId: 'x', draftRevision: 'not-a-number' }),
      (error) => error.code === 'BAD_REQUEST',
    );
    await assert.rejects(
      async () => commitPublication(harness.ctx, { draftId: 'x', draftRevision: 1, acceptedCandidateIds: [], dismissedCandidateIds: [], notes: { toString: 'x' } }),
      (error) => error.status === 404 || error.code === 'BAD_REQUEST',
    );
  } finally {
    harness.authoring.close();
    await safeRemove(harness.dir);
  }
});

/* ----------------------------------------------------- 9. 快照失效标记 */

test('基线指纹变化：扩展关系标为待复核，不再当作已认证推导', async () => {
  const harness = await makeHarness('stale-relations');
  try {
    const from = baseNode(harness);
    const nodeId = 'ext:stale-probe';
    const evidenceId = 'ev:stale-probe';
    const relationId = 'rel:stale-probe';
    /*
     * 手写一份「基线指纹与当前基础数据不一致」的内容包：模拟基础数据先被改过、
     * 而扩展包还是按旧基线发布的。这正是待复核要抓的情形。
     */
    const pkg = {
      schema: extensions.PACKAGE_SCHEMA,
      parent: null, kind: 'publish', restores: null,
      baselineFingerprint: `sha256:${'b'.repeat(64)}`,
      reviewDigest: 'stale-test', acceptedCandidateIds: [], dismissedCandidateIds: [], notes: null,
      nodes: [{
        id: nodeId, version: '1', construct: 'Concept', roles: ['Concept'], title: '待复核探针',
        discipline: '群论', granularity: 'unit', case: 'group', summary: '', formal: {},
        teaching: { evidenceStatus: 'NOT-CLAIMED' }, provenance: { sources: [] },
        contentRef: false, contentMarkdown: '',
      }],
      relations: [{
        id: relationId, kind: 'definitionReference', from: from.node, to: nodeId, version: '1',
        witness: { type: 'declared', status: 'DEF' },
        evidenceRef: evidenceId, origin: 'auto-discovery', verificationStatus: 'verified',
      }],
      evidence: [{
        id: evidenceId, kind: 'reference', status: 'DEF', checkStatus: 'not_run',
        title: '基线探针', scope: '基线层', nodes: [from.node, nodeId], checkerVerified: false,
      }],
      definitions: [], contracts: [], specs: [], pendingRelations: [], certificates: [],
      summary: { nodes: 1, relations: 1, evidence: 1, definitions: 0, contracts: 0 },
    };
    const revisionId = extensions.revisionIdFor(pkg);
    const revision = {
      id: revisionId, parent: null, createdAt: new Date().toISOString(), createdBy: 'test',
      kind: 'publish', restores: null, baselineFingerprint: pkg.baselineFingerprint,
      contentHash: extensions.packageHash(pkg), packagePath: `data/extensions/${revisionId}/package.json`,
      summary: pkg.summary, reviewDigest: pkg.reviewDigest, acceptedCandidateIds: [], dismissedCandidateIds: [], notes: null,
    };
    await extensions.writePackage(harness.ctx, revision, { ...pkg, revisionId });
    await extensions.writeActivePointer(harness.ctx, revisionId);
    await harness.source.reload();

    /*
     * 包本身是完整的（哈希自洽、能合成），但基线指纹对不上 → 关系标为待复核。
     *
     * `integrity()` 把三类分开放，这条测的是**第二类**：
     * `problems` 是「阻断、包未生效」，`warnings` 才是「已生效但内容待复核」。
     * 基线漂移属于后者——包还在用，只是不再算作已认证推导。
     */
    assert.equal(harness.source.applied(), true, '包能装上，问题只在「还算不算数」');
    const integrity = harness.source.integrity();
    assert.equal(integrity.ok, false);
    assert.deepEqual(integrity.problems, [], '基线漂移不是阻断项：包已经生效');
    assert.ok(integrity.warnings.some((item) => item.includes('基线指纹')), integrity.warnings.join('；'));
    assert.deepEqual(integrity.staleRelations, [relationId]);
    assert.deepEqual(integrity.staleEvidence, [evidenceId]);

    const relation = harness.source.current().raw.relationDescriptions.find((item) => item.id === relationId);
    assert.equal(relation.needsReview, true);
    assert.equal(relation.verificationStatus, 'stale');
    assert.match(relation.reviewNote, /schema\/签名\/理论已变化/);
  } finally {
    harness.authoring.close();
    await safeRemove(harness.dir);
  }
});

test('内容包指向坏目录时：快照退回基础数据并如实报问题（不假装已扩展）', async () => {
  const harness = await makeHarness('broken-package');
  try {
    await extensions.writeActivePointer(harness.ctx, 'rev:0000000000000000');
    await harness.source.reload();
    assert.equal(harness.source.applied(), false);
    assert.equal(harness.source.current().version, harness.source.base.version);
    assert.equal(harness.source.integrity().ok, false);
    assert.ok(harness.source.integrity().problems.length > 0);
  } finally {
    harness.authoring.close();
    await safeRemove(harness.dir);
  }
});
