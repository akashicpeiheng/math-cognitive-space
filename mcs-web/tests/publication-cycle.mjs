/**
 * tests/publication-cycle.mjs —— P1-6 验收：已验证关系真的能入库，证书交接完整。
 *
 * 这一份用例**不使用任何替身**：真的跑发现（真登记表、真搜索、真 python 检查器）、
 * 真的预览与提交（真的六步事务）、真的从扩展包读回。六个断面（task-11 C 节）：
 *
 * 1. 从**全新节点草稿**出发跑发现，挑出 `math.status === 'verified'` 且带证书正文的候选；
 * 2. 预览：变更清单里**含**这条关系（不是 pending、不是 refused）；
 * 3. 提交：成功，内容包里能读到证据与证书（正文 + 落盘文件哈希对得上）；
 * 4. 读回：从扩展包重新装载，关系仍是 verified，且 `replayCandidate` 仍能通过；
 * 5. 定义引用那条**单独**也能预览 + 提交（不再报 EVIDENCE_FAILED）；
 * 6. 反例：把证书正文改一个字节 → 提交被拒（EVIDENCE_FAILED），**原版本继续生效**。
 *
 * 为什么这么贵还这么写：P1-6 的两个断点都出现在「模块之间的交接处」
 * （判定器 → 证据记录 → 发布搬运 → 重放），只有把整条链跑通才能证明它通了。
 */
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, rm, readFile } from 'node:fs/promises';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { AuthoringDatabase } from '../server/authoring-db.mjs';
import { createOntologySource } from '../server/snapshot.mjs';
import * as extensions from '../server/extensions.mjs';
import { previewPublication, commitPublication } from '../server/publication.mjs';
import { discoverRelations, replayCandidate, certificateArtifact, DISCOVERY_BUDGET, GENERATOR_VERSION } from '../core/formal/discovery.mjs';
import { bytesHash } from '../core/hash.mjs';
import * as registryModule from '../data/formal/registry.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const MCS_WEB_ROOT = resolve(HERE, '..');
const REPO_ROOT = resolve(MCS_WEB_ROOT, '..');
const DATA_DIR = join(MCS_WEB_ROOT, 'data');
const TMP_ROOT = join(MCS_WEB_ROOT, 'tmp', 'team', 'F2');

const DRAFT_NODE_A = 'ext:publication-cycle-general';
const DRAFT_NODE_B = 'ext:publication-cycle-reference';

/** Windows 上 SQLite 的 -wal/-shm 可能短暂占住文件：清理失败不该判用例失败。 */
async function safeRemove(dir) {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    try { await rm(dir, { recursive: true, force: true }); return true; } catch { await new Promise((r) => setTimeout(r, 40)); }
  }
  return false;
}

/**
 * 草稿节点必须**真的**是新的：拿「登记概念 spec」当它的表达，
 * 这样它才与 `group:group-concept`（基础本体里的节点）构成可证的一对（阿贝尔 ⇒ 群）。
 */
function conceptSpecFor(node) {
  const template = registryModule.CONCEPT_SPECS.find((spec) => spec.concept === 'concept:group:abelian');
  const spec = JSON.parse(JSON.stringify(template));
  delete spec.concept;
  delete spec.anchor;
  return {
    ...spec,
    node,
    nodeVersion: '1',
    background: 'bg:group/1',
    theoryVersion: '1',
    source: 'publication-cycle 用例',
    hash: `sha256:${'7'.repeat(64)}`,
  };
}

/** 定义引用用：表达式里出现已登记符号（`group_concept`）即可。 */
function referenceSpecFor(node) {
  return {
    specVersion: 'mcs-formal/1',
    node,
    nodeVersion: '1',
    background: 'bg:group/1',
    theoryVersion: '1',
    declarations: [{ name: 'mul0', type: 'G -> G -> G', role: 'function' }],
    definitions: [{ name: 'my_concept', type: 'o', source: 'group_concept(mul0)' }],
    assumptions: [],
    statement: { source: 'my_concept', kind: 'formula' },
    claims: [],
    references: [],
    boundary: [],
    source: 'publication-cycle 用例',
    hash: `sha256:${'8'.repeat(64)}`,
  };
}

async function makeHarness(name) {
  const dir = join(TMP_ROOT, name);
  await safeRemove(dir);
  await mkdir(dir, { recursive: true });
  const extensionsDir = join(dir, 'extensions');
  const authoringFile = join(dir, 'authoring.sqlite3');
  const authoring = new AuthoringDatabase({ file: authoringFile });
  const source = await createOntologySource({ dataDir: DATA_DIR, extensionsDir, repoRoot: REPO_ROOT });
  const config = { repoRoot: REPO_ROOT, authoringDbFile: authoringFile, dataDir: DATA_DIR };
  /*
   * 刻意**不注入** `ctx.replay`：这条用例要的正是「发布这一侧自己去把发现阶段的上下文凑齐」。
   * `ctx.registry` 给的是与发现同一份（含草稿 spec）：草稿节点的表达还没进登记表，
   * 少了它，重放就找不到候选形状——那属于上下文缺失，不是候选坏掉。
   */
  return { name, dir, extensionsDir, authoring, source, config, draft: null, run: null, outcome: null, registry: null, ctx: null, committed: null };
}

/** 建草稿 → 建任务 → 真跑发现 → 回填任务。 */
async function runDiscovery(harness, { node, title, spec, kinds, maxCandidates = 6 }) {
  harness.registry = { ...registryModule, specs: [spec, ...registryModule.specs] };
  const draft = harness.authoring.createDraft({
    name: title,
    construct: 'Concept',
    case: 'group',
    background: 'bg:group/1',
    summary: 'P1-6 发布循环用例',
    reading: '# 用例\n\n证书交接与发布。',
    ontologyVersion: harness.source.current().version,
    node: { id: node, discipline: '群论', granularity: 'unit', evidenceStatus: 'NOT-CLAIMED', title },
    spec,
  });
  const run = harness.authoring.createRun({
    draftId: draft.id,
    nodeRef: { node, version: '1' },
    ontologyVersion: harness.source.current().version,
    background: 'bg:group/1',
    budget: { ...DISCOVERY_BUDGET, maxCandidates },
    generatorVersion: GENERATOR_VERSION,
  });
  harness.ctx = {
    dataDir: DATA_DIR,
    extensionsDir: harness.extensionsDir,
    authoring: harness.authoring,
    config: harness.config,
    ontologySource: harness.source,
    registry: harness.registry,
  };
  // 真发现：同步部分立刻可用，`await` 等到机器检查（真 kernel 子进程）跑完。
  const outcome = await discoverRelations({
    ontology: harness.source.base,
    registry: harness.registry,
    draft,
    nodeRef: { node, version: '1' },
    background: 'bg:group/1',
    repoRoot: REPO_ROOT,
    kinds,
    budget: { ...DISCOVERY_BUDGET, maxCandidates },
  });
  harness.authoring.saveCandidates(run.id, outcome.candidates);
  harness.authoring.updateRun(run.id, { status: 'completed', stats: { ...outcome.stats, runVersion: 'mcs-discovery-run/1' } });
  harness.draft = harness.authoring.getDraft(draft.id);
  harness.run = harness.authoring.getRun(run.id);
  harness.outcome = outcome;
  harness.requestFor = (acceptedIds) => ({
    draftId: harness.draft.id,
    draftRevision: harness.draft.revision,
    ontologyVersion: harness.source.current().version,
    acceptedCandidateIds: acceptedIds,
    dismissedCandidateIds: [],
    runId: harness.run.id,
    background: 'bg:group/1',
  });
  return { outcome, run: harness.run, draft: harness.draft };
}

const target = (harness) => ({ dataDir: DATA_DIR, extensionsDir: harness.extensionsDir });

let cycleA = null;
let cycleB = null;
let verifiedCandidate = null;
let referenceCandidate = null;

before(async () => {
  cycleA = await makeHarness('publication-cycle-a');
  await runDiscovery(cycleA, {
    node: DRAFT_NODE_A,
    title: '证书交接：阿贝尔细化',
    spec: conceptSpecFor(DRAFT_NODE_A),
    kinds: ['hardGeneralization'],
  });
  cycleB = await makeHarness('publication-cycle-b');
  await runDiscovery(cycleB, {
    node: DRAFT_NODE_B,
    title: '证书交接：定义引用',
    spec: referenceSpecFor(DRAFT_NODE_B),
    kinds: ['definitionReference'],
  });
  verifiedCandidate = cycleA.outcome.candidates.find(
    (item) => item.math.status === 'verified' && item.evidence?.kind === 'machine-certificate',
  ) ?? null;
  referenceCandidate = cycleB.outcome.candidates.find(
    (item) => item.kind === 'definitionReference' && item.math.status === 'verified',
  ) ?? null;
});

after(async () => {
  cycleA?.authoring.close();
  cycleB?.authoring.close();
  if (cycleA) await safeRemove(cycleA.dir);
  if (cycleB) await safeRemove(cycleB.dir);
});

/* ------------------------------------------------ C.1 发现出带证书的已验证候选 */

test('C.1 全新节点草稿 → 真发现 → 至少一条 verified 且证书正文非空', () => {
  const verified = cycleA.outcome.candidates.filter((item) => item.math.status === 'verified');
  assert.ok(verified.length >= 1, `本轮发现没有 verified 候选：${JSON.stringify(cycleA.outcome.stats.warnings ?? [])}`);
  assert.ok(verifiedCandidate, '需要一条带机器证书的 verified 候选');
  const evidence = verifiedCandidate.evidence;
  assert.equal(evidence.checkStatus, 'passed', 'verified 的候选检查器状态必须是 passed');
  assert.equal(evidence.kind, 'machine-certificate');
  assert.ok(typeof evidence.certificateText === 'string' && evidence.certificateText.length > 0,
    '证书正文不能是空的（P1-6 断点 2：字段名不一致导致正文永远为空）');
  assert.match(evidence.certificateSha256 ?? '', /^sha256:[0-9a-f]{64}$/, '证书正文要带字节摘要');
  assert.ok(Array.isArray(evidence.dependsOn), '依赖摘要要齐全');

  // 统一形状：发现、重放、发布三处读的是同一份 artifact。
  const artifact = certificateArtifact(verifiedCandidate);
  assert.equal(artifact.complete, true, `证书交接应当完整：${artifact.problems.join('；')}`);
  assert.ok(artifact.bundle, 'artifact 要能还原出 bundle');
  assert.equal(artifact.bundle.format, 'mcs-nd-subset/1');
  assert.ok(artifact.steps > 0, '证书要有步骤');
  assert.ok(artifact.theory?.sha256, 'artifact 要给出理论摘要');
  assert.ok(artifact.proofSha256, 'artifact 要给出证明摘要');
  assert.equal(artifact.checkStatus, 'passed');

  // 落盘形态（持久选择）：写到 runtime/certificates/ 并回读核对。
  const persisted = certificateArtifact(verifiedCandidate, {
    persist: true, repoRoot: REPO_ROOT, runtimeDir: join(cycleA.dir, 'runtime'),
  });
  assert.deepEqual(persisted.problems, []);
  assert.ok(existsSync(persisted.absolutePath), '证书文件要真的落盘');
  assert.equal(readFileSync(persisted.absolutePath, 'utf8'), evidence.certificateText, '落盘内容要与正文一致');
  assert.ok(persisted.certificatePath.endsWith('.json'));
});

/* ------------------------------------------------ C.6 反例：改一个字节 → 被拒 */

test('C.6 证书正文改一个字节 → 提交被拒（EVIDENCE_FAILED），原版本继续生效', async () => {
  const harness = cycleA;
  const pointerBefore = await extensions.readActivePointer(target(harness));

  const tampered = JSON.parse(JSON.stringify(verifiedCandidate));
  const text = tampered.evidence.certificateText;
  const marker = '"format": "mcs-nd-subset/1"';
  assert.ok(text.includes(marker), '证书正文里应当有 format 字段可供改动');
  tampered.evidence.certificateText = text.replace(marker, '"format": "mcs-nd-subset/2"');
  assert.notEqual(tampered.evidence.certificateText, text);
  assert.equal(tampered.evidence.certificateText.length, text.length, '只改一个字节，长度不变');

  // 写回编写库：从库里读到的就是被改过的那一份。
  harness.authoring.saveCandidates(harness.run.id, [tampered]);
  const stored = harness.authoring.listCandidates(harness.run.id).find((item) => item.id === tampered.id);
  assert.equal(stored.evidence.certificateText, tampered.evidence.certificateText);

  await assert.rejects(
    () => commitPublication(harness.ctx, harness.requestFor([tampered.id])),
    (error) => {
      assert.equal(error.code, 'EVIDENCE_FAILED', `应当是 EVIDENCE_FAILED：${error.code}`);
      assert.equal(error.status, 409);
      assert.ok(error.details.problems.some((item) => item.includes('证书正文与登记的摘要不一致')),
        JSON.stringify(error.details.problems));
      return true;
    },
  );

  // 原版本继续生效：激活指针没动，本体快照版本也没变。
  const pointerAfter = await extensions.readActivePointer(target(harness));
  assert.deepEqual(pointerAfter, pointerBefore, '提交失败后激活指针不得改变');
  assert.equal(harness.source.current().version, harness.source.base.version);

  // 把好的一份放回库里，后续用例接着用。
  harness.authoring.saveCandidates(harness.run.id, [verifiedCandidate]);
  const restored = harness.authoring.listCandidates(harness.run.id).find((item) => item.id === verifiedCandidate.id);
  assert.equal(restored.evidence.certificateText, verifiedCandidate.evidence.certificateText);
});

/* ------------------------------------------------ C.2 预览含这条关系 */

test('C.2 预览：变更清单里含这条已验证关系（不是 pending、不是 refused）', async () => {
  const harness = cycleA;
  const preview = await previewPublication(harness.ctx, harness.requestFor([verifiedCandidate.id]));
  assert.deepEqual(preview.problems, [], `预览不该有阻断项：${JSON.stringify(preview.problems)}`);
  assert.equal(preview.sealed, true);

  const relationId = `rel:${verifiedCandidate.id}`;
  const added = preview.diff.relations.added.map((item) => item.id);
  assert.ok(added.includes(relationId), `预览的 relations.added 应含 ${relationId}：${JSON.stringify(added)}`);
  assert.equal(preview.diff.pending.some((item) => item.candidateId === verifiedCandidate.id), false, '不能落进 pending');
  assert.equal(preview.diff.refused.some((item) => item.candidateId === verifiedCandidate.id), false, '不能落进 refused');

  const evidenceAdded = preview.diff.evidence.added.find((item) => item.id === `ev:${verifiedCandidate.id}`);
  assert.ok(evidenceAdded, '证据条目也要出现在变更清单里');
  assert.equal(evidenceAdded.kind, 'machine-certificate');
  assert.equal(evidenceAdded.checkStatus, 'passed');
});

/* ------------------------------------------------ C.3 提交并落进内容包 */

test('C.3 提交成功：内容包里能读到证据与证书，且落盘文件哈希对得上', async () => {
  const harness = cycleA;
  const committed = await commitPublication(harness.ctx, harness.requestFor([verifiedCandidate.id]));
  assert.ok(committed.revision?.id, `提交应当返回版本：${JSON.stringify(committed)}`);
  assert.ok(committed.ontologyVersion);

  const { package: pkg } = await extensions.readPackage(target(harness), committed.revision.id);
  const relation = pkg.relations.find((item) => item.id === `rel:${verifiedCandidate.id}`);
  assert.ok(relation, '内容包里应当有新关系');
  assert.equal(relation.verificationStatus, 'verified');
  assert.equal(relation.kind, verifiedCandidate.kind);
  assert.equal(relation.witness.type, 'proof-dependency');

  const evidence = pkg.evidence.find((item) => item.id === relation.evidenceRef);
  assert.ok(evidence, '内容包里应当有证据条目');
  assert.equal(evidence.checkStatus, 'passed');
  assert.ok(evidence.certificateFile, '证据条目要指向证书文件');
  assert.ok(Array.isArray(evidence.nodes) && evidence.nodes.includes(DRAFT_NODE_A));

  const certificatePath = join(harness.extensionsDir, extensions.dirNameFor(committed.revision.id), evidence.certificateFile);
  assert.ok(existsSync(certificatePath), `证书文件应当落进内容包：${certificatePath}`);
  const content = await readFile(certificatePath, 'utf8');
  assert.equal(content, verifiedCandidate.evidence.certificateText, '包里的证书正文要与库里的那一份一致');
  const declared = (pkg.certificates ?? []).find((item) => item.path === evidence.certificateFile);
  assert.ok(declared, '包里要声明证书文件');
  assert.equal(declared.sha256, `sha256:${bytesHash(Buffer.from(content, 'utf8'))}`, '证书文件哈希要对得上');

  harness.committed = committed;
});

/* ------------------------------------------------ C.4 读回 + 重放 */

test('C.4 读回：重新装载后关系仍是 verified，且 replayCandidate 仍能通过', async () => {
  const harness = cycleA;
  assert.ok(harness.committed, 'C.3 应当先提交成功');
  await harness.source.reload();
  const current = harness.source.current();
  assert.notEqual(current.version, harness.source.base.version, '装载扩展包后本体版本应当变化');

  const relation = current.raw.relationDescriptions.find((item) => item.id === `rel:${verifiedCandidate.id}`);
  assert.ok(relation, '读回的本体里应当有这条关系');
  assert.equal(relation.verificationStatus, 'verified');
  const evidence = current.raw.evidence.find((item) => item.id === relation.evidenceRef);
  assert.ok(evidence, '读回的本体里应当有对应证据');
  assert.equal(evidence.checkStatus, 'passed');
  assert.ok(evidence.certificate, '证据要解析出仓库内证书路径');
  assert.ok(existsSync(resolve(REPO_ROOT, evidence.certificate)), `证书文件应当可读：${evidence.certificate}`);

  // 重放：用与发现同一套上下文，在当前本体上重新走一遍判定。
  const stored = harness.authoring.listCandidates(harness.run.id).find((item) => item.id === verifiedCandidate.id);
  const replayed = await replayCandidate({
    candidate: stored,
    registry: harness.registry,
    ontology: current,
    repoRoot: REPO_ROOT,
  });
  assert.equal(replayed.ok, true, `重放应当通过：${JSON.stringify(replayed.problems)}`);
  assert.equal(replayed.check?.status, 'passed', '重放要真的跑过检查器并且 passed');
  assert.equal(replayed.candidate.math.status, 'verified');
  assert.ok(replayed.candidate.evidence?.certificateText, '重放也要现算出证书正文');
});

/* ------------------------------------------------ C.5 定义引用单独也能发布 */

test('C.5 定义引用：单独预览 + 提交都不再报 EVIDENCE_FAILED', async () => {
  const harness = cycleB;
  assert.ok(referenceCandidate, `本轮发现没有 definitionReference 候选：${JSON.stringify(cycleB.outcome.warnings ?? cycleB.outcome.stats.warnings)}`);
  assert.equal(referenceCandidate.evidence?.kind, 'reference');
  assert.equal(referenceCandidate.evidence?.checkStatus, 'not_run', '定义引用不需要证书，检查器状态如实是 not_run');

  const preview = await previewPublication(harness.ctx, harness.requestFor([referenceCandidate.id]));
  assert.deepEqual(preview.problems, [], `预览不该有阻断项：${JSON.stringify(preview.problems)}`);
  assert.ok(preview.diff.relations.added.some((item) => item.id === `rel:${referenceCandidate.id}`));

  const committed = await commitPublication(harness.ctx, harness.requestFor([referenceCandidate.id]));
  assert.ok(committed.revision?.id);
  const { package: pkg } = await extensions.readPackage(target(harness), committed.revision.id);
  const relation = pkg.relations.find((item) => item.id === `rel:${referenceCandidate.id}`);
  assert.ok(relation, '定义引用关系应当进包');
  assert.equal(relation.witness.type, 'definitional-dependency');
  const evidence = pkg.evidence.find((item) => item.id === `ev:${referenceCandidate.id}`);
  assert.ok(evidence, '定义引用也要有证据条目');
  assert.equal(evidence.kind, 'reference');
});

/* ==========================================================================
 * M 节：概念锚点的发布策略（P1）与跨盘暂存（P2）
 *
 * 这一节是按 task-13 追加的。两件事都在"模块边界"上：
 * - P1：概念锚点（`concept:group:abelian`）不是本体节点，发布模型里没有它的位置。
 *   以前它被推进 `problems` → 整批 500；提示却写着"记为待证"。现在三分：可入库 / 待证 / 不可入库。
 * - P2：扩展目录与仓库不在同一个盘时，`relative(repoRoot, extensionsDir)` 返回绝对路径，
 *   照抄进暂存根会拼出畸形路径。现在隔离区是**自包含**布局，与真实盘位无关。
 * ======================================================================== */

test('M.1 概念锚点：预览里进「不可入库」并写明原因、整批不因它失败、只选它提交是 409 不是 500', async () => {
  /*
   * 自建一个 harness（不复用 cycleA/B）：它们的本体版本已经在 C.3/C.5 提交后变过，
   * 拿旧任务去发布会被 VERSION_CONFLICT 挡住——那是另一条规则，会盖住这里要测的东西。
   */
  const harness = await makeHarness('publication-cycle-anchor');
  try {
    await runDiscovery(harness, {
      node: 'ext:publication-cycle-anchor-node',
      title: '概念锚点：不入库',
      spec: referenceSpecFor('ext:publication-cycle-anchor-node'),
      kinds: ['definitionReference'],
    });
    const publishable = harness.run.candidates.find((item) => item.kind === 'definitionReference' && item.math.status === 'verified');
    assert.ok(publishable, `需要一个可入库的对照候选：${JSON.stringify(harness.outcome.stats.warnings)}`);

    /*
     * 概念锚点候选：形状与真发现产出的那条一致（`concept:group:abelian → <新节点>`），
     * 只是不必真跑一遍泛化搜索——这一节测的是**发布侧的归类**，不是判定器。
     */
    const anchor = {
      ...JSON.parse(JSON.stringify(publishable)),
      id: 'cand:cycle-anchor-demo',
      kind: 'hardGeneralization',
      from: { node: 'concept:group:abelian', version: '1' },
      to: { node: 'ext:publication-cycle-anchor-node', version: '1' },
      direction: { general: 'concept:group:abelian', special: 'ext:publication-cycle-anchor-node' },
      math: { status: 'verified', reason: '构造：阿贝尔细化（数学上成立，但端点不是节点）', scope: '' },
      evidence: { ...publishable.evidence, id: 'ev:cand:cycle-anchor-demo' },
      review: 'accepted',
    };
    harness.authoring.saveCandidates(harness.run.id, [anchor]);

    // ---- 预览：它进 excluded（有原因、有稳定 reasonCode），不是阻断项 ----
    const preview = await previewPublication(harness.ctx, harness.requestFor([anchor.id]));
    assert.deepEqual(preview.problems, [], `概念锚点不该是阻断项：${JSON.stringify(preview.problems)}`);
    assert.equal(preview.diff.publishable.length, 0);
    assert.equal(preview.diff.pending.length, 0, '锚点不是"待证"——它是"不入库"');
    const excluded = preview.diff.excluded.find((item) => item.candidateId === anchor.id);
    assert.ok(excluded, `excluded 里应当有它：${JSON.stringify(preview.diff.excluded)}`);
    assert.equal(excluded.reasonCode, 'concept-anchor');
    assert.match(excluded.reason, /概念锚点/);
    assert.match(excluded.reason, /concept:group:abelian/);
    assert.equal(preview.nothingToPublish, true, '一条都进不了库，调用方要能提前看见');

    // ---- 只选它提交：409（调用方的问题），提示要求取消勾选或驳回 ----
    await assert.rejects(
      () => commitPublication(harness.ctx, harness.requestFor([anchor.id])),
      (error) => {
        assert.equal(error.status, 409, `应当是 409 而不是 500：${error.status} ${error.message}`);
        assert.equal(error.code, 'REVISION_CONFLICT');
        assert.match(error.message, /取消勾选或驳回/);
        assert.equal(error.details?.excluded?.[0]?.reasonCode, 'concept-anchor');
        return true;
      },
    );

    // ---- 与一条可入库的关系一起提交：整批成功，锚点两边都不落 ----
    const committed = await commitPublication(harness.ctx, harness.requestFor([anchor.id, publishable.id]));
    assert.ok(committed.revision?.id, `整批不该因锚点失败：${JSON.stringify(committed.problems ?? [])}`);
    assert.ok(committed.diff.publishable.some((item) => item.candidateId === publishable.id));
    assert.ok(committed.diff.excluded.some((item) => item.candidateId === anchor.id && item.reasonCode === 'concept-anchor'));

    const { package: pkg } = await extensions.readPackage(target(harness), committed.revision.id);
    assert.ok(pkg.relations.some((item) => item.id === `rel:${publishable.id}`), '可入库的那条要真的进包');
    assert.equal(pkg.relations.some((item) => item.id === `rel:${anchor.id}`), false, '锚点关系不得进包');
    assert.equal((pkg.pendingRelations ?? []).some((item) => item.candidateId === anchor.id), false, '锚点连"待证"都不是');

    /*
     * 入库之后，这一次发现就成了「旧结果」：再拿它预览必须 **409**
     * （旧结果不发布到新背景），而不是 500，也不是静默放行。
     * 这条与概念锚点无关，但它是"版本纪律"的同一个出口。
     */
    await assert.rejects(
      () => previewPublication(harness.ctx, harness.requestFor([anchor.id, publishable.id])),
      (error) => {
        assert.equal(error.status, 409);
        assert.equal(error.code, 'ONTOLOGY_VERSION_CONFLICT');
        return true;
      },
    );
  } finally {
    harness.authoring.close();
    await safeRemove(harness.dir);
  }
});

/**
 * 找一个与仓库**不同盘位**的可写临时目录。
 *
 * P2 要测的是 `relative(repoRoot, extensionsDir)` 在跨盘时返回绝对路径那条分支。
 * 这在 Windows 上需要第二个真实盘位；仓库被克隆到 C: 或跑在 Linux/macOS 上时，
 * 这条分支在本机根本构造不出来（同盘时 `relative()` 永远是相对路径）。
 *
 * 从前这里直接 `assert.ok(跨盘)`，于是「换台电脑克隆」必然报一条
 * 与代码质量无关的失败。现在改成：能造出来就真跑，造不出来就明确跳过。
 */
async function findCrossDriveTempDir() {
  const { mkdtempSync } = await import('node:fs');
  const { parse } = await import('node:path');
  if (process.platform !== 'win32') return null;
  const repoDrive = parse(REPO_ROOT).root.slice(0, 2).toUpperCase();
  for (const letter of 'CDEFGHIJKLMNOPQRSTUVWXYZ') {
    const driveLetter = `${letter}:`;
    if (driveLetter === repoDrive) continue;
    const drive = `${driveLetter}\\`;
    if (!existsSync(drive)) continue;
    try {
      return mkdtempSync(join(drive, 'mcs-publication-crossdrive-'));
    } catch { /* 盘存在但不可写（如未插入的读卡器），换下一个 */ }
  }
  return null;
}

test('M.2 跨盘 extensionsDir：发布走完六步、包能回读（P2）', async (t) => {
  const crossDrive = await findCrossDriveTempDir();
  if (!crossDrive) {
    t.skip(`本机没有第二个可写盘位（仓库在 ${REPO_ROOT}）——跨盘分支无法在本机构造，跳过；同盘时 relative() 恒为相对路径，测不到这条分支。`);
    return;
  }
  const harness = await makeHarness('publication-cycle-crossdrive');
  harness.extensionsDir = crossDrive;
  harness.source = await createOntologySource({ dataDir: DATA_DIR, extensionsDir: crossDrive, repoRoot: REPO_ROOT });
  try {
    const relative = (await import('node:path')).relative;
    assert.ok(/^[A-Za-z]:/.test(relative(REPO_ROOT, crossDrive)), `这条用例需要真的跨盘：${relative(REPO_ROOT, crossDrive)}`);

    await runDiscovery(harness, {
      node: 'ext:publication-cycle-crossdrive-node',
      title: '跨盘：定义引用',
      spec: referenceSpecFor('ext:publication-cycle-crossdrive-node'),
      kinds: ['definitionReference'],
    });
    const candidate = harness.run.candidates.find((item) => item.kind === 'definitionReference' && item.math.status === 'verified');
    assert.ok(candidate, `需要一个可入库候选：${JSON.stringify(harness.outcome.stats.warnings)}`);

    const preview = await previewPublication(harness.ctx, harness.requestFor([candidate.id]));
    assert.deepEqual(preview.problems, [], `跨盘预览不该有阻断项：${JSON.stringify(preview.problems)}`);

    const committed = await commitPublication(harness.ctx, harness.requestFor([candidate.id]));
    assert.ok(committed.revision?.id, '跨盘发布应当走完六步');
    // 这条候选是定义引用：包里没有证书文件，也就没有"路径字符串"这回事 →
    // 即使跨盘，暂存合成与真实装载仍然逐字相同，第 6 步走的还是最严格的 `version-equal`。
    assert.equal(committed.takeover?.mode, 'version-equal',
      `定义引用没有证书路径，跨盘也应逐字相同：${JSON.stringify(committed.takeover)}`);

    // 包真的落在**跨盘的那个扩展目录**里，而且回读哈希对得上。
    const verdict = await extensions.verifyPackage({ extensionsDir: crossDrive }, committed.revision.id);
    assert.equal(verdict.ok, true, verdict.problems.join('；'));
    assert.ok(existsSync(join(crossDrive, extensions.dirNameFor(committed.revision.id), 'package.json')));

    // 新版生效：重新装载后关系在公共网络里。
    await harness.source.reload();
    const current = harness.source.current();
    assert.notEqual(current.version, harness.source.base.version, '跨盘发布后本体版本应当变化');
    assert.ok(current.raw.relationDescriptions.some((item) => item.id === `rel:${candidate.id}`), '读回的本体里应当有这条关系');

    // 暂存目录用后即清：不留垃圾（也证明隔离区确实只用了临时结构）。
    assert.equal(existsSync(join(harness.dir, 'publication-staging')), false);

    /*
     * 第二段：**跨盘 + 带机器证书**的发布——P2 崩溃的正是这条组合
     * （暂存里要落证书文件，而证书路径是"相对 repoRoot"的）。
     *
     * 跨盘时暂存没法照抄真实相对位置，于是证书路径字符串与真实加载必然不同、
     * 两边的版本哈希也就不同；第 6 步必须靠「位置无关的内容指纹 + 指针指向本版本」判过，
     * 并在结果里写明走的是哪一条（`takeover.mode`）。
     */
    const certHarnessNode = 'ext:publication-cycle-crossdrive-cert';
    const draft = harness.authoring.createDraft({
      name: '跨盘：机器证书',
      construct: 'Concept',
      case: 'group',
      background: 'bg:group/1',
      summary: '',
      reading: '',
      ontologyVersion: harness.source.current().version,
      node: { id: certHarnessNode, discipline: '群论', granularity: 'unit', evidenceStatus: 'NOT-CLAIMED', title: '跨盘证书' },
      spec: conceptSpecFor(certHarnessNode),
    });
    harness.registry = { ...registryModule, specs: [draft.spec, ...registryModule.specs] };
    const certRun = harness.authoring.createRun({
      draftId: draft.id,
      nodeRef: { node: certHarnessNode, version: '1' },
      ontologyVersion: harness.source.current().version,
      background: 'bg:group/1',
      budget: { ...DISCOVERY_BUDGET, maxCandidates: 6 },
      generatorVersion: GENERATOR_VERSION,
    });
    harness.ctx = {
      dataDir: DATA_DIR, extensionsDir: crossDrive, authoring: harness.authoring,
      config: harness.config, ontologySource: harness.source, registry: harness.registry,
    };
    const certOutcome = await discoverRelations({
      ontology: harness.source.base, registry: harness.registry, draft,
      nodeRef: { node: certHarnessNode, version: '1' }, background: 'bg:group/1',
      repoRoot: REPO_ROOT, kinds: ['hardGeneralization'], budget: { ...DISCOVERY_BUDGET, maxCandidates: 6 },
    });
    harness.authoring.saveCandidates(certRun.id, certOutcome.candidates);
    harness.authoring.updateRun(certRun.id, { status: 'completed', stats: { ...certOutcome.stats, runVersion: 'mcs-discovery-run/1' } });
    harness.draft = harness.authoring.getDraft(draft.id);
    harness.run = harness.authoring.getRun(certRun.id);

    // 只取**端点都是本体节点**的那条（概念锚点那条按 M.1 的规则不入库）。
    const certificateCandidate = certOutcome.candidates.find(
      (item) => item.math.status === 'verified'
        && item.evidence?.kind === 'machine-certificate'
        && !String(item.from.node).startsWith('concept:')
        && !String(item.to.node).startsWith('concept:'),
    );
    assert.ok(certificateCandidate, `跨盘用例需要一个带证书的已验证候选：${JSON.stringify(certOutcome.stats.warnings)}`);

    const certCommit = await commitPublication(harness.ctx, harness.requestFor([certificateCandidate.id]));
    assert.ok(certCommit.revision?.id, '跨盘 + 带证书的发布应当走完六步');
    assert.equal(certCommit.takeover?.mode, 'content-verified',
      `跨盘时版本哈希必然不同（证书路径字符串不同），必须由位置无关的内容指纹判过：${JSON.stringify(certCommit.takeover)}`);
    assert.equal(certCommit.takeover.versionEqual, false);

    // 证书文件真的落在跨盘扩展目录里，包回读也通过。
    const certVerdict = await extensions.verifyPackage({ extensionsDir: crossDrive }, certCommit.revision.id);
    assert.equal(certVerdict.ok, true, certVerdict.problems.join('；'));
    const { package: certPackage } = await extensions.readPackage({ extensionsDir: crossDrive }, certCommit.revision.id);
    const certRecord = certPackage.evidence.find((item) => item.id === `ev:${certificateCandidate.id}`);
    assert.ok(certRecord?.certificateFile, '证据里要记下包内证书路径');
    assert.equal(existsSync(join(crossDrive, extensions.dirNameFor(certCommit.revision.id), certRecord.certificateFile)), true,
      '证书文件必须真的落在跨盘扩展目录里');
  } finally {
    harness.authoring.close();
    await safeRemove(harness.dir);
    await safeRemove(crossDrive);
  }
});
