import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { readFileSync } from 'node:fs';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { WebSocketServer } from 'ws';
import { testOntology } from './helpers.mjs';
import { createLearnerStore } from '../server/db.mjs';
import { TutorAdapter } from '../server/tutor.mjs';

/**
 * 对 DeepTutor 接口的批评性复核（本站内适配器那一半）。
 *
 * 三条都是**实测出来的缺陷**：
 *
 * 1. `liveVerified` 由环境变量宣布 —— `MCS_WEB_TUTOR_LIVE_VERIFIED=1` 就能让界面说
 *    「已连通并完成真实验证」，还把这个布尔值写进事件载荷。本站的纪律是断言必须有证据。
 * 2. 一切 WebSocket 失败都报 `DEEPTUTOR_UNAVAILABLE` —— 中途断线（模型可能已在跑）被说成
 *    「检查后端再试」，而且 `error` 被丢掉，401 / ECONNREFUSED / TLS 失败现场分不出来。
 * 3. 本站内适配器与 mcs-bridge 是两套并行集成，界面却不提桥接，使用者会以为只有一套。
 *
 * 另外核对两套实现**说同一套失败语言**（同一个错误码字符串），避免两套接口各说各话。
 */
const here = dirname(fileURLToPath(import.meta.url));
const BRIDGE_ADAPTER = resolve(here, '../../mcs-bridge/deeptutor.mjs');

async function fixture() {
  const dir = mkdtempSync(join(tmpdir(), 'mcs-tutor-critique-'));
  const db = await createLearnerStore({ config: { dbFile: join(dir, 'test.sqlite3') } });
  return { dir, db, cleanup: async () => { await db.close(); rmSync(dir, { recursive: true, force: true }); } };
}

function mockDeepTutor(onStart) {
  const httpServer = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ authenticated: true, enabled: false }));
  });
  const websocket = new WebSocketServer({ server: httpServer, path: '/api/v1/ws' });
  websocket.on('connection', ws => ws.on('message', raw => onStart(JSON.parse(raw.toString()), ws)));
  return new Promise(r => httpServer.listen(0, '127.0.0.1', () => r({
    httpServer, websocket, port: httpServer.address().port,
    close: () => { for (const client of websocket.clients) client.terminate(); websocket.close(); httpServer.closeAllConnections(); httpServer.close(); },
  })));
}

/** startTurn 是后台执行：轮询到回合结束，再断言结果。 */
async function settle(tutor, turnId, timeoutMs = 5000) {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const turn = tutor.getTurn(turnId);
    if (turn.status !== 'running') return turn;
    if (Date.now() > deadline) throw new Error('回合没有在预期时间内结束：' + JSON.stringify(turn));
    await new Promise(r => setTimeout(r, 40));
  }
}

const configFor = (port, extra = {}) => ({
  tutor: {
    enabled: true, adapter: 'deeptutor-1.5', baseUrl: `http://127.0.0.1:${port}`, frontendUrl: `http://127.0.0.1:${port}`,
    authTokenEnv: 'MCS_MISSING', healthTimeoutMs: 800, timeoutMs: 3000, bridgeUrl: 'http://127.0.0.1:1', ...extra,
  },
});

test('配置开关不能宣布「已验证」：要有本进程跑完的真实回环', async (t) => {
  const mock = await mockDeepTutor((msg, ws) => {
    ws.send(JSON.stringify({ type: 'session', seq: 1, metadata: { session_id: 'mock', turn_id: 'mock-turn' } }));
    ws.send(JSON.stringify({ type: 'content', seq: 2, content: '这是讲解正文。' }));
    ws.send(JSON.stringify({ type: 'done', seq: 3, metadata: { status: 'completed' } }));
  });
  t.after(mock.close);
  const f = await fixture();
  t.after(f.cleanup);
  const ontology = await testOntology();
  // 故意把开关打开：光有开关不算验证过。
  const tutor = new TutorAdapter({ ontology, db: f.db, config: configFor(mock.port, { liveVerified: true }) });

  const before = await tutor.health();
  assert.equal(before.available, true);
  assert.equal(before.liveVerified, false, '还没跑完任何回环，不能声称已验证');
  assert.ok(before.note.includes('还没有完成过'), before.note);

  const profile = await f.db.createProfile({ name: '复核档案' });
  const session = await tutor.createSession({ profileId: profile.id, nodeId: 'limit:limit-ed' });
  const started = tutor.startTurn(session.id, { requestId: 'critique-1', kind: 'question', content: '讲讲极限' });
  await settle(tutor, started.id);

  const after = await tutor.health();
  assert.equal(after.liveVerified, true, '跑完一次真实回环后才允许声称已验证');
  assert.equal(after.completed_turns, 1);
  assert.ok(after.note.includes('已完成 1 次'), after.note);

  // 事件里留下的是可追溯的完成记录，而不是一句自我评价。
  const events = await f.db.listEvents(profile.id);
  const tutorEvent = events.find(e => e.kind === 'tutor_message');
  assert.ok(tutorEvent, JSON.stringify(events.map(e => e.kind)));
  assert.equal(tutorEvent.payload.live_verified, true);
  assert.equal(tutorEvent.payload.completed_turns_in_process, 1);

  // 开关关掉时，即使跑完过回环也不声称（两道条件是与的关系）。
  const strict = new TutorAdapter({ ontology, db: f.db, config: configFor(mock.port, { liveVerified: false }) });
  strict.completedTurns = 3;
  assert.equal((await strict.health()).liveVerified, false);
});

test('中途断线报 INTERRUPTED 并带原因，连不上报 UNAVAILABLE', async (t) => {
  const abrupt = await mockDeepTutor((msg, ws) => {
    ws.send(JSON.stringify({ type: 'session', seq: 1, metadata: { session_id: 'mock', turn_id: 'mock-turn' } }));
    ws.send(JSON.stringify({ type: 'content', seq: 2, content: '半句' }));
    ws._socket.destroy();
  });
  t.after(abrupt.close);
  const f = await fixture();
  t.after(f.cleanup);
  const ontology = await testOntology();
  const tutor = new TutorAdapter({ ontology, db: f.db, config: configFor(abrupt.port) });
  const profile = await f.db.createProfile({ name: '复核档案' });
  const session = await tutor.createSession({ profileId: profile.id, nodeId: 'limit:limit-ed' });
  // startTurn 是「立刻返回、后台跑」：失败落在 turn.error 上，所以要等它结束再看。
  const abruptTurn = tutor.startTurn(session.id, { requestId: 'abrupt-1', kind: 'question', content: 'x' });
  const settled = await settle(tutor, abruptTurn.id);
  assert.equal(settled.status, 'error', JSON.stringify(settled));
  assert.equal(settled.error.code, 'DEEPTUTOR_INTERRUPTED', JSON.stringify(settled.error));
  assert.ok(settled.error.details.cause, '必须留下脱敏原因，否则现场无法诊断');
  assert.equal(settled.error.details.turn_id, 'mock-turn', '要指出哪一回合可能已经跑过');

  // 端口没人听：请求根本没送出去 → UNAVAILABLE，并带 errno 一类原因。
  const dead = new TutorAdapter({ ontology, db: f.db, config: configFor(1) });
  await assert.rejects(
    () => dead.createSession({ profileId: profile.id, nodeId: 'limit:limit-ed' }),
    (error) => error.code === 'DEEPTUTOR_UNAVAILABLE',
  );
});

test('状态里同时披露桥接与本站适配器，并说明哪一套是权威', async (t) => {
  // 假装桥接在跑：只回一个符合桥接信封形状的 health。
  const bridge = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true, protocol_version: 'mcs-bridge/1', ontology_version: 'sha256:x', data: { configured: true } }));
  });
  await new Promise(r => bridge.listen(0, '127.0.0.1', r));
  t.after(() => { bridge.closeAllConnections(); bridge.close(); });

  const f = await fixture();
  t.after(f.cleanup);
  const ontology = await testOntology();
  const tutor = new TutorAdapter({ ontology, db: f.db, config: configFor(1, { bridgeUrl: `http://127.0.0.1:${bridge.address().port}` }) });
  const up = await tutor.bridgeStatus();
  assert.equal(up.reachable, true);
  assert.equal(up.protocol_version, 'mcs-bridge/1');
  assert.equal(up.deeptutor_ready, true);
  assert.ok(up.note.includes('经过核查'), up.note);
  assert.ok(up.note.includes('不要混用'), up.note);

  const downTutor = new TutorAdapter({ ontology, db: f.db, config: configFor(1, { bridgeUrl: 'http://127.0.0.1:1' }) });
  const down = await downTutor.bridgeStatus();
  assert.equal(down.reachable, false);
  assert.equal(down.deeptutor_ready, false);
});

test('两套集成的失败语言一致（跨仓库不变量）', () => {
  const bridgeSource = readFileSync(BRIDGE_ADAPTER, 'utf8');
  // 桥接是经过核查的那一套；本站内适配器必须说同一套错误码，否则同一个故障在两套接口里
  // 有不同的名字，使用者无法据此判断「能不能重发」。
  for (const code of ['DEEPTUTOR_INTERRUPTED', 'DEEPTUTOR_UNAVAILABLE', 'DEEPTUTOR_AUTH_REQUIRED']) {
    assert.ok(bridgeSource.includes(code), `桥接适配器应当使用 ${code}`);
  }
  const errors = readFileSync(resolve(here, '../shared/errors.mjs'), 'utf8');
  for (const code of ['DEEPTUTOR_INTERRUPTED', 'DEEPTUTOR_UNAVAILABLE', 'DEEPTUTOR_AUTH_REQUIRED']) {
    assert.ok(errors.includes(code), `本站错误码表应当保留 ${code}`);
  }
});

