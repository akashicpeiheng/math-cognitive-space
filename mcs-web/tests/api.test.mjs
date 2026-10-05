import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { startTestServer, jsonCall } from './helpers.mjs';

let server;
before(async () => { server = await startTestServer(); });
after(async () => { await server?.cleanup(); });

const origin = () => server.origin;

test('健康检查返回本体、数据库与辅导状态', async () => {
  const { status, payload } = await jsonCall(origin(), '/api/v2/health');
  assert.equal(status, 200);
  assert.equal(payload.data.protocol, 'mcs-web/1');
  assert.equal(payload.data.ontology.counts.nodes, 232);
  assert.equal(payload.data.tutor.available, false);
  assert.equal(payload.data.tutor.liveVerified, false);
});

/*
 * 安全响应头必须真的出现在响应上（2026-10 发布前加）。
 * 只测 `securityHeaders()` 的纯函数输出不够——被忘在路由分支里就等于没挂。
 */
test('API 与静态响应都带安全头（CSP / nosniff / 禁止嵌套）', async () => {
  const api = await fetch(origin() + '/api/v2/health');
  assert.equal(api.headers.get('x-content-type-options'), 'nosniff');
  assert.equal(api.headers.get('x-frame-options'), 'DENY');
  assert.equal(api.headers.get('referrer-policy'), 'no-referrer');
  assert.match(api.headers.get('content-security-policy') ?? '', /default-src 'self'/);

  const page = await fetch(origin() + '/');
  assert.match(page.headers.get('content-security-policy') ?? '', /frame-ancestors 'none'/);
});

test('本体元数据列出十二坐标且合法条件通过', async () => {
  const { status, payload } = await jsonCall(origin(), '/api/v2/ontology');
  assert.equal(status, 200);
  assert.equal(payload.data.coordinates.length, 12);
  assert.equal(payload.data.legality.status, 'passed');
  assert.equal(payload.data.templates.length, 13);
});

test('节点检索与细节包含形成检查、行动、证据与支持', async () => {
  const list = await jsonCall(origin(), '/api/v2/ontology/nodes?q=' + encodeURIComponent('极限'));
  assert.equal(list.status, 200);
  assert.ok(list.payload.data.nodes.length >= 5);
  const detail = await jsonCall(origin(), '/api/v2/ontology/nodes/' + encodeURIComponent('limit:bridge'));
  assert.equal(detail.status, 200);
  assert.equal(detail.payload.data.formation.status, 'well-formed');
  assert.ok(detail.payload.data.actions.length >= 1);
  assert.ok(detail.payload.data.evidence.length >= 1);
  assert.ok(detail.payload.data.support.some((item) => item.status === 'Known'));
});

test('局部化接口返回四个分量，缺参数时返回 400', async () => {
  const ok = await jsonCall(origin(), '/api/v2/localizations/LC07/compute', { method: 'POST', body: { params: { seedNodes: ['limit:limit-ed'], radius: 2 } } });
  assert.equal(ok.status, 200);
  assert.equal(ok.payload.data.status, 'computed');
  assert.ok(ok.payload.data.V.length >= 1);
  const bad = await jsonCall(origin(), '/api/v2/localizations/LC07/compute', { method: 'POST', body: { params: {} } });
  assert.equal(bad.status, 400);
  assert.equal(bad.payload.error.code, 'BAD_REQUEST');
});

test('同步与工作线程规划返回一致语义', async () => {
  const background = [
    { entryId: 'b1', node: 'bg:real:metric', provides: ['statement', 'definition'], kind: 'confirmed' },
    { entryId: 'b2', node: 'bg:logic:quantifier', provides: ['statement'], kind: 'confirmed' },
  ];
  const sync = await jsonCall(origin(), '/api/v2/plans?sync=1', { method: 'POST', body: { goalId: 'limit:bridge', background } });
  assert.equal(sync.status, 200);
  assert.equal(sync.payload.data.status, 'Found');
  assert.equal(sync.payload.data.routes.length, 1);
  const job = await jsonCall(origin(), '/api/v2/plans', { method: 'POST', body: { goalId: 'limit:bridge', background } });
  assert.equal(job.status, 200);
  let result = null;
  for (let attempt = 0; attempt < 40; attempt += 1) {
    const poll = await jsonCall(origin(), '/api/v2/plans/' + job.payload.data.job.id);
    if (poll.payload.data.job.status === 'done') { result = poll.payload.data.result; break; }
    if (poll.payload.data.job.status === 'error') throw new Error(JSON.stringify(poll.payload.data.error));
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 100));
  }
  assert.ok(result, '工作线程应在限定时间内完成');
  assert.equal(result.status, 'Found');
  assert.equal(result.routes[0].events.length, sync.payload.data.routes[0].events.length);
});

test('证据重放调用现有 ND 子集检查器，并保留片段范围', async () => {
  const { status, payload } = await jsonCall(origin(), '/api/v2/evidence/replay', { method: 'POST', body: { evidenceId: 'ev-limit-constant-cert' } });
  assert.equal(status, 200);
  assert.equal(payload.data.status, 'passed');
  assert.equal(payload.data.exitCode, 0);
  assert.equal(payload.data.checkerVerified, false);
  assert.ok(payload.data.obligations.some((item) => item.includes('未编码')));
});

test('非证明证据不能冒充证书重放', async () => {
  const { status, payload } = await jsonCall(origin(), '/api/v2/evidence/replay', { method: 'POST', body: { evidenceId: 'ev-limit-bridge-proof' } });
  assert.equal(status, 422);
  assert.equal(payload.error.code, 'EVIDENCE_UNSUPPORTED');
});

test('档案、事件、笔记与备份流程，且公共本体哈希保持不变', async () => {
  const before = await jsonCall(origin(), '/api/v2/health');
  const created = await jsonCall(origin(), '/api/v2/profiles', { method: 'POST', body: { name: 'API 测试档案' } });
  assert.equal(created.status, 200);
  const profileId = created.payload.data.profile.id;
  const event = { eventId: 'api-event-1', kind: 'confirmation', nodeId: 'bg:real:metric', payload: { confirmed: true } };
  const first = await jsonCall(origin(), `/api/v2/profiles/${profileId}/events`, { method: 'POST', body: { event } });
  assert.equal(first.status, 200);
  assert.equal(first.payload.data.duplicate, false);
  const duplicate = await jsonCall(origin(), `/api/v2/profiles/${profileId}/events`, { method: 'POST', body: { event } });
  assert.equal(duplicate.payload.data.duplicate, true);
  const conflict = await jsonCall(origin(), `/api/v2/profiles/${profileId}/events`, { method: 'POST', body: { event: { ...event, payload: { confirmed: false } } } });
  assert.equal(conflict.status, 409);
  assert.equal(conflict.payload.error.code, 'EVENT_ID_CONFLICT');
  const note = await jsonCall(origin(), `/api/v2/profiles/${profileId}/notes`, { method: 'POST', body: { title: '回看', body: '为什么需要 0<|x-a|？', nodeId: 'limit:limit-ed' } });
  assert.equal(note.status, 200);
  const exported = await jsonCall(origin(), `/api/v2/profiles/${profileId}/export`);
  assert.equal(exported.payload.data.events.length, 1);
  assert.equal(exported.payload.data.notes.length, 1);
  const imported = await jsonCall(origin(), '/api/v2/import', { method: 'POST', body: { bundle: exported.payload.data } });
  assert.equal(imported.status, 200);
  assert.equal(imported.payload.data.skipped.length, 0);
  const backup = await jsonCall(origin(), '/api/v2/backup', { method: 'POST', body: {} });
  assert.equal(backup.status, 200);
  const restore = await jsonCall(origin(), '/api/v2/restore', { method: 'POST', body: { backup: backup.payload.data.backup } });
  assert.equal(restore.status, 200);
  const disposable = await jsonCall(origin(), '/api/v2/profiles', { method: 'POST', body: { name: '待删除档案' } });
  const removed = await jsonCall(origin(), '/api/v2/profiles/' + disposable.payload.data.profile.id, { method: 'DELETE' });
  assert.equal(removed.status, 200);
  assert.equal(removed.payload.data.deleted, true);
  const after = await jsonCall(origin(), '/api/v2/health');
  assert.equal(before.payload.data.ontology.contentHash, after.payload.data.ontology.contentHash, '学习事件与笔记不得改变 M');
});

/*
 * 发布前回归（2026-10）：事件超过 2000 条后，导出与状态重建不得被分页上限截断。
 *
 * 复现的是真实缺陷：`exportProfile` 与 `profileState` 从前都用 `listEvents({limit: 2000})`，
 * 第 2001 条之后最早的确认事件被静默丢弃——导出少记录、θ.known 少确认，界面照报成功。
 */
test('事件超过 2000 条：导出完整、状态重建完整、分页游标可回退', async () => {
  const created = await jsonCall(origin(), '/api/v2/profiles', { method: 'POST', body: { name: '超长档案' } });
  const profileId = created.payload.data.profile.id;
  const baseTime = Date.parse('2026-01-01T00:00:00.000Z');
  // 第 1 条是最早的「已掌握」确认：它必须活到最后。
  await server.db.appendEvent(profileId, {
    eventId: 'long-0000', ontologyVersion: server.ontology.version, kind: 'confirmation', nodeId: 'bg:real:metric',
    occurredAt: new Date(baseTime).toISOString(), baseRevision: null,
    source: { kind: 'system', ref: 'test' }, evidenceRefs: [], payload: { confirmed: true },
  });
  for (let index = 1; index <= 2000; index += 1) {
    await server.db.appendEvent(profileId, {
      eventId: `long-${String(index).padStart(4, '0')}`, ontologyVersion: server.ontology.version, kind: 'view', nodeId: 'bg:real:metric',
      occurredAt: new Date(baseTime + index * 1000).toISOString(), baseRevision: null,
      source: { kind: 'system', ref: 'test' }, evidenceRefs: [], payload: { context: 'read' },
    });
  }
  assert.equal(await server.db.countEvents(profileId), 2001);

  const exported = await jsonCall(origin(), `/api/v2/profiles/${profileId}/export`);
  assert.equal(exported.payload.data.events.length, 2001, '导出必须包含全部事件');
  assert.ok(exported.payload.data.events.some((event) => event.eventId === 'long-0000'), '最早的确认事件不得被截断');

  /*
   * 状态重建走的是全量事件：最早的确认必须留在 `state.confirmed` 里。
   * 修复前它会因为 `limit: 2000` 被截掉，θ.known 显示「什么都没掌握」。
   */
  const detail = await jsonCall(origin(), `/api/v2/profiles/${profileId}`);
  assert.ok(
    detail.payload.data.state.confirmed.some((event) => event.eventId === 'long-0000'),
    '状态重建必须读全量事件：最早的确认事件不得被分页上限截断',
  );

  const firstPage = await jsonCall(origin(), `/api/v2/profiles/${profileId}/events?limit=200`);
  assert.equal(firstPage.payload.data.total, 2001);
  assert.equal(firstPage.payload.data.events.length, 200);
  assert.equal(firstPage.payload.data.hasMore, true);
  assert.ok(firstPage.payload.data.nextCursor);

  const secondPage = await jsonCall(origin(), `/api/v2/profiles/${profileId}/events?limit=200&before=${firstPage.payload.data.nextCursor}`);
  assert.equal(secondPage.payload.data.events.length, 200);
  assert.ok(secondPage.payload.data.events[0].seq < Number(firstPage.payload.data.nextCursor), '游标必须向前推进而不是原地打转');
});

/*
 * 发布前回归（2026-10）：导入是全有或全无。
 * 从前逐条 try/catch，失败的条目进 `skipped`、其余照写，用户拿到一份「少了东西」的档案。
 */
test('导入是全有或全无：有冲突条目时回退，不留半份档案', async () => {
  const before = await jsonCall(origin(), '/api/v2/profiles');
  const bundle = {
    schema: 'mcs-web-profile-export/1',
    profile: { name: '半成品测试' },
    events: [
      {
        eventId: 'import-dup-1', kind: 'view', nodeId: 'bg:real:metric', occurredAt: '2026-01-02T00:00:00.000Z',
        source: { kind: 'import', ref: 'test' }, evidenceRefs: [], payload: { context: 'read' },
      },
      {
        eventId: 'import-dup-1', kind: 'confirmation', nodeId: 'bg:real:metric', occurredAt: '2026-01-02T00:00:01.000Z',
        source: { kind: 'import', ref: 'test' }, evidenceRefs: [], payload: { confirmed: true },
      },
    ],
    notes: [],
  };
  const imported = await jsonCall(origin(), '/api/v2/import', { method: 'POST', body: { bundle } });
  assert.equal(imported.status, 422);
  assert.match(imported.payload.error.message, /未留下部分档案/);
  const after = await jsonCall(origin(), '/api/v2/profiles');
  assert.equal(after.payload.data.profiles.length, before.payload.data.profiles.length, '失败的导入不得留下新档案');
});

test('版本冲突与未知接口给出明确失败码', async () => {
  const conflict = await jsonCall(origin(), '/api/v2/plans?sync=1', { method: 'POST', body: { goalId: 'limit:bridge', ontologyVersion: 'sha256:wrong' } });
  assert.equal(conflict.status, 409);
  assert.equal(conflict.payload.error.code, 'ONTOLOGY_VERSION_CONFLICT');
  const missing = await jsonCall(origin(), '/api/v2/does-not-exist');
  assert.equal(missing.status, 404);
});

test('view 事件可写入，且不改动公共本体', async () => {
  const before = await jsonCall(origin(), '/api/v2/health');
  const created = await jsonCall(origin(), '/api/v2/profiles', { method: 'POST', body: { name: '已读闭环档案' } });
  const profileId = created.payload.data.profile.id;
  const event = { eventId: 'view-event-1', kind: 'view', nodeId: 'limit:limit-ed', payload: { context: 'read', evidence_status: 'ILLUSTRATION' } };
  const written = await jsonCall(origin(), `/api/v2/profiles/${profileId}/events`, { method: 'POST', body: { event } });
  assert.equal(written.status, 200);
  const detail = await jsonCall(origin(), `/api/v2/profiles/${profileId}`);
  const theta = detail.payload.data.theta;
  assert.equal(theta.known.length, 0, '已读不得进入 known');
  assert.equal(theta.viewed.length, 1);
  assert.equal(theta.viewed[0].node, 'limit:limit-ed');
  // 未指定必须是「计数 + 节点名单」，只有计数时前端无法判断哪些没碰过。
  assert.equal(typeof theta.unspecified.count, 'number');
  assert.ok(Array.isArray(theta.unspecified.nodes));
  assert.equal(theta.unspecified.nodes.length, theta.unspecified.count);
  // 已读是独立的一条轴：读过但没有确认过的节点仍然算未指定（读过不是可用性声明）。
  assert.ok(theta.unspecified.nodes.includes('limit:limit-ed'));
  const after = await jsonCall(origin(), '/api/v2/health');
  assert.equal(before.payload.data.ontology.contentHash, after.payload.data.ontology.contentHash, '已读记录不得改变 M');
});

test('未登记的事件类型被明确拒绝（回归：unknown 不是合法 kind）', async () => {
  const created = await jsonCall(origin(), '/api/v2/profiles', { method: 'POST', body: { name: '非法事件档案' } });
  const profileId = created.payload.data.profile.id;
  const rejected = await jsonCall(origin(), `/api/v2/profiles/${profileId}/events`, {
    method: 'POST',
    body: { event: { eventId: 'bad-kind-1', kind: 'unknown', nodeId: 'bg:real:metric', payload: { confirmed: false } } },
  });
  assert.equal(rejected.status, 400);
  assert.equal(rejected.payload.error.code, 'BAD_REQUEST');
  // 正确写法是 confirmation + confirmed:false。
  const accepted = await jsonCall(origin(), `/api/v2/profiles/${profileId}/events`, {
    method: 'POST',
    body: { event: { eventId: 'good-kind-1', kind: 'confirmation', nodeId: 'bg:real:metric', payload: { confirmed: false, reason: '尚未理解' } } },
  });
  assert.equal(accepted.status, 200);
  const detail = await jsonCall(origin(), `/api/v2/profiles/${profileId}`);
  assert.equal(detail.payload.data.theta.unknown.length, 1);
  assert.equal(detail.payload.data.theta.known.length, 0);
});

test('节点检索与详情带出证据等级（回归：证据等级登记在 teaching 上）', async () => {
  const listed = await jsonCall(origin(), '/api/v2/ontology/nodes?limit=500');
  const withStatus = listed.payload.data.nodes.filter((node) => node.evidenceStatus);
  assert.ok(withStatus.length >= 40, `带证据等级的节点过少：${withStatus.length}`);
  const detail = await jsonCall(origin(), '/api/v2/ontology/nodes/' + encodeURIComponent('limit:limit-ed'));
  assert.equal(detail.payload.data.node.teaching.evidenceStatus, 'DEF');
  // 表征已创作且已下发，界面必须能拿到。
  assert.ok(detail.payload.data.node.representations.length >= 1);
});

test('两个演示学习者共享 M、得到不同 D', async () => {
  const healthBefore = await jsonCall(origin(), '/api/v2/health');
  const profileA = await jsonCall(origin(), '/api/v2/profiles', { method: 'POST', body: { name: '演示 A', kind: 'demo' } });
  const profileB = await jsonCall(origin(), '/api/v2/profiles', { method: 'POST', body: { name: '演示 B', kind: 'demo' } });
  const idA = profileA.payload.data.profile.id;
  const idB = profileB.payload.data.profile.id;
  for (const node of ['bg:set:function', 'bg:group:binary']) {
    await jsonCall(origin(), '/api/v2/profiles/' + idA + '/events', { method: 'POST', body: { event: { eventId: 'demo-a-' + node, kind: 'confirmation', nodeId: node, payload: { confirmed: true } } } });
  }
  for (const node of ['bg:real:metric', 'bg:logic:quantifier']) {
    await jsonCall(origin(), '/api/v2/profiles/' + idB + '/events', { method: 'POST', body: { event: { eventId: 'demo-b-' + node, kind: 'confirmation', nodeId: node, payload: { confirmed: true } } } });
  }
  const planA = await jsonCall(origin(), '/api/v2/plans?sync=1', { method: 'POST', body: { goalId: 'group:cayley', profileId: idA } });
  const planB = await jsonCall(origin(), '/api/v2/plans?sync=1', { method: 'POST', body: { goalId: 'group:cayley', profileId: idB } });
  assert.equal(planA.payload.data.status, 'Found');
  assert.equal(planB.payload.data.status, 'InfeasibleWithinBound');
  const healthAfter = await jsonCall(origin(), '/api/v2/health');
  assert.equal(healthBefore.payload.data.ontology.contentHash, healthAfter.payload.data.ontology.contentHash);
});
