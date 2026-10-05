import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { testOntology } from './helpers.mjs';
import { createLearnerStore } from '../server/db.mjs';
import { TutorAdapter, redactCredential } from '../server/tutor.mjs';
import { buildNodeContext, buildTutorInstructions } from '../core/context.mjs';
import { upstreamSnapshot } from '../server/upstream.mjs';
import { McsError, CODES } from '../shared/errors.mjs';
import { MCS_WEB_ROOT, REPO_ROOT } from '../core/ontology.mjs';

async function tutorFixture() {
  const dir = mkdtempSync(join(tmpdir(), 'mcs-tutor-test-'));
  const db = await createLearnerStore({ config: { dbFile: join(dir, 'test.sqlite3') } });
  return { dir, db, cleanup: async () => { await db.close(); rmSync(dir, { recursive: true, force: true }); } };
}

test('DeepTutor 不可达时健康检查报告未连接，不伪造可用', async () => {
  const ontology = await testOntology();
  const fixture = await tutorFixture();
  try {
    const tutor = new TutorAdapter({
      ontology,
      db: fixture.db,
      config: { tutor: { enabled: true, adapter: 'deeptutor-1.5', baseUrl: 'http://127.0.0.1:1', frontendUrl: 'http://127.0.0.1:1', authTokenEnv: 'MCS_MISSING', healthTimeoutMs: 300, timeoutMs: 500, liveVerified: false } },
    });
    const health = await tutor.health();
    assert.equal(health.available, false);
    assert.equal(health.liveVerified, false);
    assert.ok(health.note.includes('无法连接'));
  } finally { fixture.cleanup(); }
});

test('创建会话前必须通过健康检查；不可用时拒绝并保留其他功能', async () => {
  const ontology = await testOntology();
  const fixture = await tutorFixture();
  try {
    const profile = await fixture.db.createProfile({ name: '测试档案' });
    const tutor = new TutorAdapter({
      ontology,
      db: fixture.db,
      config: { tutor: { enabled: true, adapter: 'deeptutor-1.5', baseUrl: 'http://127.0.0.1:1', frontendUrl: 'http://127.0.0.1:1', authTokenEnv: 'MCS_MISSING', healthTimeoutMs: 300, timeoutMs: 500, liveVerified: false } },
    });
    await assert.rejects(() => tutor.createSession({ profileId: profile.id, nodeId: 'limit:limit-ed' }), (error) => error.code === 'DEEPTUTOR_UNAVAILABLE');
  } finally { fixture.cleanup(); }
});

test('上下文打包保留公式、边界与最小个人状态', async () => {
  const ontology = await testOntology();
  const context = buildNodeContext(ontology, 'limit:bridge', {
    maxChars: 20000,
    personalState: { profileId: 'p1', revision: 2, confirmed: ['bg:real:metric'], unknown: [], misconceptions: [] },
  });
  assert.equal(context.ontology_version, ontology.version);
  assert.ok(context.content_markdown.includes('$') || context.content_markdown.includes('\\('));
  assert.ok(context.boundary.length > 0);
  assert.equal(context.personal_state.profile_id, 'p1');
  assert.ok(!JSON.stringify(context).includes('"events"'));
  const instructions = buildTutorInstructions(context, { mode: 'hint' });
  assert.ok(instructions.includes('分层提示'));
  assert.ok(instructions.includes('不自动确认'));
});

test('预算不足以保留边界时抛出可报告的 CONTEXT 错误', async () => {
  const ontology = await testOntology();
  assert.throws(() => buildNodeContext(ontology, 'limit:bridge', { maxChars: 300 }), (error) => {
    assert.equal(error.code, 'EVIDENCE_RESOURCE_EXHAUSTED');
    assert.ok(error.details.minimum_chars > 300);
    return true;
  });
});

// 回归：token 为空时 `''.replaceAll('')` 会在每两个字符之间插入标记，
// 使辅导回复变成「[会话凭证]什[会话凭证]么…」而完全不可读。
test('凭据脱敏在 token 为空时不破坏正文', () => {
  const answer = '什么是去心邻域？';
  assert.equal(redactCredential(answer, ''), answer);
  assert.equal(redactCredential(answer, undefined), answer);
  assert.ok(!redactCredential(answer, '').includes('[会话凭证]'));
  assert.equal(redactCredential(answer, '').length, answer.length);
});

test('凭据脱敏在 token 非空时替换出现的位置', () => {
  assert.equal(redactCredential('前缀 dt_abc 后缀', 'dt_abc'), '前缀 [会话凭证] 后缀');
  assert.equal(redactCredential('未出现凭据', 'dt_abc'), '未出现凭据');
  assert.equal(redactCredential(null, 'dt_abc'), '');
});

/**
 * 上游版本号：运行期只读本机检出（2026-10 加，TODO A4-26）。
 *
 * 第四十八轮的边界：「版本号是我核对后写死的 v1.6.12」——写死的值会悄悄过期，
 * 而且读者无法判断它是什么时候核对的。现在的口径是：服务端读检出、报来源与读取时间；
 * 读不到就说读不到（`available: false`），不显示一个看起来像实时值的手抄数字。
 */
test('上游版本号读自本机检出，并带上来源与读取时间', async (t) => {
  const snapshot = upstreamSnapshot({ force: true });
  /*
   * `.bridge-research/` 是**本机**的 DeepTutor 源码检出，按仓库约定不入版本库。
   * 换台电脑克隆时它必然不存在——这时候跳过「解析真实检出」这条分支，
   * 让下面那条「读不到就如实报不可用」的用例去覆盖空检出行为。
   */
  if (!snapshot.available) {
    t.skip('本机没有 DeepTutor 检出（.bridge-research/ 不入版本库）——解析真实检出的分支跳过；空检出行为由下一条用例覆盖。');
    return;
  }
  assert.match(snapshot.version, /^\d+\.\d+\.\d+$/, JSON.stringify(snapshot));
  assert.match(snapshot.label, /^v\d/);
  // 来源必须是**仓库相对**路径：不泄露绝对路径，也不把盘符写进界面。
  assert.ok(!/[A-Za-z]:[\\/]/.test(snapshot.source), '来源里出现了绝对路径：' + snapshot.source);
  assert.ok(snapshot.source.includes('deeptutor/__version__.py'));
  assert.ok(!Number.isNaN(Date.parse(snapshot.readAt)));
  // 与盘上的真实文件核对一次（而不是相信读者自己解析的结果）。
  const file = resolve(REPO_ROOT, snapshot.source);
  const text = readFileSync(file, 'utf8');
  const declared = /__version__\s*=\s*['"]([^'"]+)['"]/.exec(text)[1];
  assert.equal(snapshot.version, declared);
});

test('读不到检出时如实报不可用，不退回手抄的版本号', () => {
  const empty = mkdtempSync(join(tmpdir(), 'mcs-no-checkout-'));
  try {
    const snapshot = upstreamSnapshot({ force: true, researchRoot: empty });
    assert.equal(snapshot.available, false);
    assert.equal(snapshot.version, null);
    assert.equal(snapshot.label, null);
    assert.equal(snapshot.source, null);
    assert.equal(snapshot.sourceKind, 'unavailable');
    assert.ok(snapshot.note.includes('没有在'), snapshot.note);
    // 形状必须与可用时一致：调用方不必分两种分支解析。
    assert.deepEqual(Object.keys(snapshot).sort(), Object.keys(upstreamSnapshot({ force: true })).sort());
  } finally { rmSync(empty, { recursive: true, force: true }); }
});

/**
 * 外链可达性（2026-10 加，TODO A4-27）。
 *
 * 第四十八轮的边界：「测试只核对 href 与 rel，不联网验证。」
 * 这里补一条**可跳过**的检查：能连上就报状态码，连不上（离线、被墙、超时）标 `not_run` 并写出原因——
 * 网络不可用是环境事实，不是验收失败；但「没验证过」这件事必须留在输出里，不能假装验证过。
 */
test('DeepTutor 外链：能连则报状态，连不上标 not_run（不当作失败）', async () => {
  const { DEEPTUTOR_INTRO } = await import(pathToFileURL(resolve(MCS_WEB_ROOT, 'web/src/deeptutor-intro.ts')).href);
  assert.ok(DEEPTUTOR_INTRO.links.length >= 3);
  const results = [];
  for (const link of DEEPTUTOR_INTRO.links) {
    assert.match(link.href, /^https:\/\//, `${link.label} 不是 https：${link.href}`);
    assert.ok(link.detail && link.detail.length > 4, `${link.label} 缺少说明`);
    try {
      const response = await fetch(link.href, { method: 'HEAD', redirect: 'follow', signal: AbortSignal.timeout(6000) });
      results.push({ label: link.label, status: 'ok', code: response.status });
    } catch (error) {
      results.push({ label: link.label, status: 'not_run', reason: error.name === 'TimeoutError' ? '超时' : error.message });
    }
  }
  console.log('  · 外链可达性：', results.map((row) => `${row.label}=${row.status}${row.code ? `(${row.code})` : ''}`).join('，'));
  // 允许全部 not_run（离线环境），但不允许「没有结果」这种含糊状态。
  for (const row of results) {
    assert.ok(['ok', 'not_run'].includes(row.status));
    if (row.status === 'not_run') assert.ok(row.reason && row.reason.length > 0, '标了 not_run 就要写清原因');
  }
  assert.equal(results.length, DEEPTUTOR_INTRO.links.length);
});

/**
 * 两套集成的失败语言对齐（2026-10 加，TODO A4-28 / A4-30）。
 *
 * 站内适配器与 `mcs-bridge` 是两条并存的路径（这个事实写在辅导页上）。既然并存，
 * 至少要保证**同一类失败在两边读起来一样**：同名的码，`recoverable` 判定必须一致，
 * 否则调用方得为两边各写一套判断。桥接仓库不在时跳过（并在输出里说明跳过了）。
 */
test('与 mcs-bridge 的失败码对齐（可恢复判定一致）', async (t) => {
  const bridgeContracts = resolve(REPO_ROOT, 'mcs-bridge/contracts.mjs');
  if (!existsSync(bridgeContracts)) {
    t.skip('本机没有 mcs-bridge 检出（' + bridgeContracts + '）');
    return;
  }
  /*
   * 桥接是**独立包**，有自己的依赖（ajv 等）。只克隆 mcs-web 时源码在、
   * node_modules 不在——这是正常状态，不该报一条「模块找不到」的红。
   * 有依赖就真跑对齐；没依赖就明确跳过并说明原因。
   */
  let FAILURE_CODES;
  try {
    ({ FAILURE_CODES } = await import(pathToFileURL(bridgeContracts).href));
  } catch (error) {
    if (error.code !== 'ERR_MODULE_NOT_FOUND') throw error;
    t.skip('mcs-bridge 源码在，但它的依赖没装（cd mcs-bridge && npm install）——对齐检查跳过：' + error.message);
    return;
  }
  /*
   * 同名码：两边必须用同一个名字，因此直接对齐。
   * 异名同义：`BAD_REQUEST`（mcs-web）与 `INVALID_ARGUMENT`（mcs-bridge）说的是同一件事，
   * 但名字不同——这一条**不假装统一**，而是显式登记成别名对，并把分歧打印出来
   * （归一方案见 README 的「两套集成」一节；改名要动协议，属于单独一轮的事）。
   */
  const SAME_NAME = [
    ['DEEPTUTOR_UNAVAILABLE', true],
    ['DEEPTUTOR_INTERRUPTED', true],
    ['DEEPTUTOR_AUTH_REQUIRED', true],
  ];
  const ALIASES = [['BAD_REQUEST', 'INVALID_ARGUMENT', true]];
  for (const [code, expected] of SAME_NAME) {
    const local = new McsError(code, 'x');
    assert.equal(local.recoverable, expected, `mcs-web 侧 ${code} 的可恢复判定不对`);
    assert.equal(FAILURE_CODES.recoverable.includes(code), expected, `mcs-bridge 侧 ${code} 的判定与 mcs-web 不一致`);
  }
  for (const [localCode, bridgeCode, expected] of ALIASES) {
    assert.equal(new McsError(localCode, 'x').recoverable, expected, `mcs-web 侧 ${localCode} 的判定不对`);
    assert.equal(FAILURE_CODES.recoverable.includes(bridgeCode), expected, `mcs-bridge 侧 ${bridgeCode} 的判定不对`);
  }
  console.log('  · 码名分歧（同一件事、两个名字，判定已一致）：'
    + ALIASES.map(([a, b]) => `${a} ↔ ${b}`).join('，'));
  // 服务端自身坏了：两边都不可恢复。
  assert.equal(FAILURE_CODES.recoverable.includes('INTERNAL_ERROR'), false);
  assert.equal(new McsError(CODES.INTERNAL, 'x').recoverable, false);
});
