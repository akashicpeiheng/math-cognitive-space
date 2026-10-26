import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { startTestServer, jsonCall } from './helpers.mjs';
import { fieldEntry } from '../data/field-entry.mjs';
import { newVault } from '../data/cases/new-vault.mjs';

let server;
before(async () => { server = await startTestServer(); });
after(async () => { await server?.cleanup(); });

const origin = () => server.origin;

test('健康检查返回本体、数据库与辅导状态', async () => {
  const { status, payload } = await jsonCall(origin(), '/api/v2/health');
  assert.equal(status, 200);
  assert.equal(payload.data.protocol, 'mcs-web/1');
  /*
   * 节点数写在这里是**快照**：2026-10 的节点合并（同一对象的多处登记收成一个规范节点，
   * 见 `data/merges.mjs`）把它从 266 变成 231；2026-10-12 讨论班笔记那批再加 19 个新节点
   * （7 篇是刷新对，不新增节点），于是 231 → 248，合并组 29 → 31、被吸收的登记 38 → 40。
   * 2026-10-12 再加 1 个：笔记库案例导入 `MCS_vault/notes/Analysis/方向导数.md`（248 → 249，
   * 不进合并表，因此被吸收的登记仍是 40）。
   * 2026-10-13 再加 51 个：第十个案例《简明高等代数》（`data/cases/jiang.mjs`）的
   * 47 个里程碑 + 4 个方法节点（249 → 300，同样不进合并表）。
   * 2026-10-14 再加 65 个：第十一个案例 Axler《Linear Algebra Done Right》第 4 版
   * （`data/cases/axler.mjs`）的 61 个里程碑 + 4 个方法节点（300 → 365，不进合并表）。
   * 健康检查同时下发合并口径，因此这里两条一起核对：收口后的节点数 + 被吸收的登记数。
   */
  assert.equal(payload.data.ontology.counts.nodes, 365 + newVault.nodes.length + fieldEntry.nodes.length);
  assert.equal(payload.data.ontology.counts.merges.groups, 31);
  assert.equal(payload.data.ontology.counts.merges.absorbed, 40);
  assert.equal(payload.data.ontology.counts.nodes + payload.data.ontology.counts.merges.absorbed, 405 + newVault.nodes.length + fieldEntry.nodes.length);
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

/*
 * 档案模板与起始节点（2026-10 加）。
 *
 * 接口这一侧要钉住三件事：
 * 1. 模板清单是**公共只读**的，且每个声明条目的节点都真在本体里、都是背景接口；
 * 2. 建档案带模板时，声明真的写进 E（θ.known 非空），并带 `declared` / `template` 标记，
 *    事后能分清「他自己确认的」与「模板代写的」；
 * 3. 未知模板**当场拒绝**，不静默回落成空白档案；不带模板时行为与从前一致（一个确认都没有）。
 * 起始节点本身由前端从 M + θ 派生（`web/src/starting-nodes.ts`），这里只验它拿得到的输入。
 */
test('档案模板：公共只读清单，只声明背景接口节点', async () => {
  const listed = await jsonCall(origin(), '/api/v2/profile-templates');
  assert.equal(listed.status, 200);
  const { templates, defaultTemplateId } = listed.payload.data;
  assert.equal(defaultTemplateId, 'blank');
  const ids = templates.map((template) => template.id);
  for (const expected of ['blank', 'high-school-1', 'university-freshman']) {
    assert.ok(ids.includes(expected), `模板清单里缺少 ${expected}`);
  }
  const blank = templates.find((template) => template.id === 'blank');
  assert.equal(blank.declares.length, 0, '空白模板不得声明任何节点');
  for (const template of templates) {
    for (const entry of template.declares) {
      assert.equal(entry.case, 'background', `${template.id} 声明了非背景节点 ${entry.node}`);
      assert.ok(entry.title && entry.title !== entry.node, `${entry.node} 的标题没解析出来`);
      assert.ok(entry.basis.zh.length > 0 && entry.basis.en.length > 0, `${entry.node} 缺少中英成对的依据`);
    }
  }
});

test('新建档案带模板：声明写进 E，且标明是模板代写的', async () => {
  const healthBefore = await jsonCall(origin(), '/api/v2/health');
  const created = await jsonCall(origin(), '/api/v2/profiles', { method: 'POST', body: { name: '大一新生档案', template: 'university-freshman' } });
  assert.equal(created.status, 200);
  const profileId = created.payload.data.profile.id;
  assert.equal(created.payload.data.template.id, 'university-freshman');
  assert.ok(created.payload.data.declared.length >= 4, `模板只写入了 ${created.payload.data.declared.length} 条`);
  assert.deepEqual(created.payload.data.failed, []);

  const detail = await jsonCall(origin(), `/api/v2/profiles/${profileId}`);
  const known = detail.payload.data.theta.known.map((entry) => entry.node).sort();
  assert.deepEqual(known, created.payload.data.declared.map((entry) => entry.node).sort());
  assert.ok(known.includes('bg:real:metric') && known.includes('bg:set:function'));

  // 事件本身要带得走：来源、模板 id 与 declared 标记。
  const events = await jsonCall(origin(), `/api/v2/profiles/${profileId}/events`);
  const declarations = events.payload.data.events.filter((event) => event.source.ref === 'profile-template:university-freshman');
  assert.equal(declarations.length, created.payload.data.declared.length);
  for (const event of declarations) {
    assert.equal(event.kind, 'confirmation');
    assert.equal(event.payload.confirmed, true);
    assert.equal(event.payload.declared, true);
    assert.equal(event.payload.template, 'university-freshman');
    assert.ok(String(event.payload.basis ?? '').length > 0, '声明事件必须留下依据原文');
  }
  // 换一个语种读同一份档案：模板写的是确认事件，不随语言变化。
  const enResponse = await fetch(origin() + `/api/v2/profiles/${profileId}`, { headers: { 'x-mcs-locale': 'en' } });
  const enDetail = await enResponse.json();
  assert.deepEqual(enDetail.data.theta.known.map((entry) => entry.node).sort(), known);

  const healthAfter = await jsonCall(origin(), '/api/v2/health');
  assert.equal(healthBefore.payload.data.ontology.contentHash, healthAfter.payload.data.ontology.contentHash, '模板不得改动 M');
});

test('节点检索按相关性排序：标题命中排在只有摘要命中之前（2026-10-12 修）', async () => {
  /*
   * 用户报的：在知识网络的「全部节点」面板里搜「紧」，前几条是「广义 Stokes 定理」「单位分解」，
   * 「连续性与紧致性」排到后面。原因是命中之后按 **id 字典序**排——摘要里出现过「紧」的节点
   * 因此抢在标题就叫「紧致性」的节点前面。规则见 `shared/search-rank.mjs`，纯函数那一侧由
   * `tests/search-rank.test.mjs` 逐条钉住；这里只验**接口真的把那条次序交出去了**。
   */
  const { status, payload } = await jsonCall(origin(), '/api/v2/ontology/nodes?q=' + encodeURIComponent('紧'));
  assert.equal(status, 200);
  const list = payload.data.nodes;
  assert.ok(list.length >= 5, `搜「紧」应当返回若干个节点，实际 ${list.length}`);

  // 第一条必须是标题里就有「紧」的节点。
  assert.ok(list[0].title.includes('紧'), `第一条应当是标题命中，实际「${list[0].title}」（${list[0].id}）`);
  assert.equal(list[0].id, 'top:claim-compact-normal', '并列时按 id 定序，第一条应当是 top:claim-compact-normal');

  /*
   * 全部标题命中都要排在第一条「只有摘要命中」之前。判据用 id/标题里有没有「紧」来近似——
   * 与纯函数侧同源：排序只改次序，不改集合，因此那条「广义 Stokes 定理」仍然在结果里。
   */
  const titleHits = list.filter((node) => node.title.includes('紧'));
  const stokes = list.findIndex((node) => node.id === 'dg:generalized-stokes-theorem');
  if (stokes !== -1) {
    const compactness = list.findIndex((node) => node.id === 'top:compactness');
    assert.ok(compactness !== -1 && compactness < stokes,
      `「紧致性」（第 ${compactness} 位）应当排在「广义 Stokes 定理」（第 ${stokes} 位）之前`);
  }
  assert.ok(titleHits.length >= 3, `标题命中的节点应当有若干个，实际 ${titleHits.length}`);

  // 排序不改集合：同一个检索词的条数只由筛选决定，与排序无关。
  const again = await jsonCall(origin(), '/api/v2/ontology/nodes?q=' + encodeURIComponent('紧'));
  assert.deepEqual(again.payload.data.nodes.map((node) => node.id), list.map((node) => node.id),
    '同一检索词两次调用次序应当逐字相同（确定性）');

  // 空检索词不排序（保持登记顺序，与从前一致）。
  const none = await jsonCall(origin(), '/api/v2/ontology/nodes?limit=5');
  assert.equal(none.payload.data.nodes[0].id, 'bg:logic:quantifier', '不带 q 时保持原来的登记顺序');
});

test('图接口下发放缩关系的**已验证方向**（一般端 / 特殊端），未核验的如实是 null', async () => {
  /*
   * 为什么要下发解析结果而不是把 `direction` 原样发过去：`from`/`to` 的朝向由
   * `direction.reading` 决定（`contract` = 一般→特殊、`expand` = 特殊→一般），
   * 这是一条**判据**（`shared/scaling.mjs` 的 `scalingEndpoints`）。前端不引 `shared/*.mjs`，
   * 两边各写一份迟早会漂。渲染要拿它画「一般端粗、特殊端细」的箭头（2026-10-11）。
   *
   * 三种情形都核：有方向的两种读法、未核验的旧记录（11 条）、以及**非放缩关系不带这个字段**。
   */
  const { status, payload } = await jsonCall(origin(), '/api/v2/ontology/graph');
  assert.equal(status, 200);
  const relations = payload.data.relations;
  const scaling = relations.filter((relation) => relation.kind === 'scaling');
  assert.ok(scaling.length >= 20, `放缩关系应当有二十几条，实际 ${scaling.length}`);

  const verified = scaling.filter((relation) => relation.scaling);
  const unresolved = scaling.filter((relation) => !relation.scaling);
  assert.ok(verified.length >= 10, `已验证方向的放缩关系应当有十几条，实际 ${verified.length}`);
  assert.ok(unresolved.length >= 5, `未核验的旧记录应当仍在（如实为 null），实际 ${unresolved.length}`);

  const nodes = new Set(payload.data.nodes.map((node) => node.id));
  for (const relation of verified) {
    const { general, special } = relation.scaling;
    assert.ok(nodes.has(general) && nodes.has(special), `${relation.id} 的端点不在节点表里`);
    assert.notEqual(general, special, `${relation.id} 的一般端与特殊端相同`);
    // 端点必须**就是**这条关系的两端，且朝向由 reading 决定（两种读法各占一半）。
    assert.ok([relation.from, relation.to].includes(general) && [relation.from, relation.to].includes(special),
      `${relation.id} 的方向端点与 from/to 对不上`);
  }
  assert.ok(verified.some((relation) => relation.scaling.general === relation.from), '应当有「一般端 = from」的缩读法');
  assert.ok(verified.some((relation) => relation.scaling.general === relation.to), '应当有「一般端 = to」的放读法');

  for (const relation of relations.filter((item) => item.kind !== 'scaling')) {
    assert.ok(!('scaling' in relation) || relation.scaling === null,
      `${relation.id} 不是放缩关系，不该带方向端点`);
  }

  // 确定性：同一份数据两次调用逐字相同。
  const again = await jsonCall(origin(), '/api/v2/ontology/graph');
  assert.deepEqual(again.payload.data.relations, relations, '两次调用下发的方向应当逐字相同');
});

test('未知模板被拒绝；不带模板时一个确认都不预设', async () => {
  const rejected = await jsonCall(origin(), '/api/v2/profiles', { method: 'POST', body: { name: '坏模板档案', template: '不存在的模板' } });
  assert.equal(rejected.status, 400);
  assert.equal(rejected.payload.error.code, 'BAD_REQUEST');

  const plain = await jsonCall(origin(), '/api/v2/profiles', { method: 'POST', body: { name: '空档案' } });
  assert.equal(plain.status, 200);
  assert.equal(plain.payload.data.template.id, 'blank');
  assert.deepEqual(plain.payload.data.declared, []);
  const detail = await jsonCall(origin(), `/api/v2/profiles/${plain.payload.data.profile.id}`);
  assert.equal(detail.payload.data.theta.known.length, 0, '不选模板时不得替学习者声明任何已学内容');
});

/*
 * 学习方向（2026-10 加）。
 *
 * 方向是学习者**显式声明**的东西：界面靠它把「现在可以开始的 N 个节点」排出次序
 * （`web/src/direction.ts`）。接口这一侧要钉住四件事：
 * 1. 声明写进 E，并且**同时**留下一条 `kind: 'goal'` 事件（导出与审计的事实来源）；
 * 2. 同一目标重复声明**幂等**（学习者从两个入口点同一个方向，列表里不该出现两条）；
 * 3. 未知节点**当场 404**，不静默存下一个永远算不出方向的东西；
 * 4. 导出带走它、删掉之后真的没有（可撤）。
 */
test('学习方向：声明写进 E，并留下可核的 goal 事件', async () => {
  const healthBefore = await jsonCall(origin(), '/api/v2/health');
  const created = await jsonCall(origin(), '/api/v2/profiles', { method: 'POST', body: { name: '方向档案', template: 'blank' } });
  const profileId = created.payload.data.profile.id;

  const empty = await jsonCall(origin(), `/api/v2/profiles/${profileId}/directions`);
  assert.equal(empty.status, 200);
  assert.deepEqual(empty.payload.data.directions, [], '新档案不该有方向');

  const made = await jsonCall(origin(), `/api/v2/profiles/${profileId}/directions`, {
    method: 'POST', body: { nodeId: 'limit:bridge', note: '先把极限说清楚' },
  });
  assert.equal(made.status, 200);
  assert.equal(made.payload.data.created, true);
  assert.equal(made.payload.data.direction.nodeId, 'limit:bridge');
  assert.equal(made.payload.data.direction.note, '先把极限说清楚');
  assert.equal(made.payload.data.direction.sourceRef, 'ui', '要能分清「他声明的」与「脚本预置的」');
  assert.equal(made.payload.data.checked.isThread, false);

  // 事件：kind='goal'、带 intent 标记与镜像 id，来源可追。
  const events = await jsonCall(origin(), `/api/v2/profiles/${profileId}/events`);
  const directionEvents = events.payload.data.events.filter((event) => event.payload?.intent === 'direction');
  assert.equal(directionEvents.length, 1);
  assert.equal(directionEvents[0].kind, 'goal');
  assert.equal(directionEvents[0].nodeId, 'limit:bridge');
  assert.equal(directionEvents[0].source.ref, 'ui');
  assert.equal(directionEvents[0].payload.directionId, made.payload.data.direction.directionId);

  // 幂等：同一节点再声明一次不新增行，也不新增事件。
  const again = await jsonCall(origin(), `/api/v2/profiles/${profileId}/directions`, { method: 'POST', body: { nodeId: 'limit:bridge' } });
  assert.equal(again.payload.data.created, false);
  const listed = await jsonCall(origin(), `/api/v2/profiles/${profileId}/directions`);
  assert.equal(listed.payload.data.directions.length, 1);
  const eventsAgain = await jsonCall(origin(), `/api/v2/profiles/${profileId}/events`);
  assert.equal(eventsAgain.payload.data.events.filter((event) => event.payload?.intent === 'direction').length, 1);

  // 本体版本不变：方向属于 E，不改 M。
  const healthAfter = await jsonCall(origin(), '/api/v2/health');
  assert.equal(healthBefore.payload.data.ontology.contentHash, healthAfter.payload.data.ontology.contentHash);
});

test('学习方向：未知节点 404；话题级条目可声明但如实标注', async () => {
  const created = await jsonCall(origin(), '/api/v2/profiles', { method: 'POST', body: { name: '方向边界档案' } });
  const profileId = created.payload.data.profile.id;

  const unknown = await jsonCall(origin(), `/api/v2/profiles/${profileId}/directions`, { method: 'POST', body: { nodeId: 'no:such:node' } });
  assert.equal(unknown.status, 404);
  assert.equal(unknown.payload.error.code, 'UNKNOWN_NODE');
  const missing = await jsonCall(origin(), `/api/v2/profiles/${profileId}/directions`, { method: 'POST', body: {} });
  assert.equal(missing.status, 400, '不带 nodeId 必须当场拒绝');

  const topics = await jsonCall(origin(), '/api/v2/ontology/nodes?granularity=all&show=topics');
  const topic = (topics.payload.data.nodes ?? []).find((node) => node.granularity === 'topic');
  if (topic) {
    const made = await jsonCall(origin(), `/api/v2/profiles/${profileId}/directions`, { method: 'POST', body: { nodeId: topic.id } });
    assert.equal(made.status, 200, '话题级条目可以当方向（它是学习线索的名字）');
    assert.equal(made.payload.data.checked.isThread, true, '但要如实标注它是线索，不是可独立认知的单元');
  }
});

test('学习方向：导出带走、删掉之后真的没有', async () => {
  const created = await jsonCall(origin(), '/api/v2/profiles', { method: 'POST', body: { name: '方向导出档案' } });
  const profileId = created.payload.data.profile.id;
  const made = await jsonCall(origin(), `/api/v2/profiles/${profileId}/directions`, { method: 'POST', body: { nodeId: 'group:cayley' } });

  const exported = await jsonCall(origin(), `/api/v2/profiles/${profileId}/export`);
  assert.equal(exported.payload.data.directions.length, 1, '导出必须带走方向');
  assert.equal(exported.payload.data.directions[0].nodeId, 'group:cayley');

  // 往返：导入一份带方向的 bundle，方向跟着走。
  const imported = await jsonCall(origin(), '/api/v2/import', { method: 'POST', body: { bundle: exported.payload.data } });
  assert.equal(imported.status, 200);
  assert.equal(imported.payload.data.imported.directions, 1);
  const roundTripped = await jsonCall(origin(), `/api/v2/profiles/${imported.payload.data.profile.id}/directions`);
  assert.deepEqual(roundTripped.payload.data.directions.map((item) => item.nodeId), ['group:cayley']);

  // 旧导出包（没有 directions 字段）仍然能导入：向后兼容。
  const legacy = { schema: 'mcs-web-profile-export/1', profile: { name: '旧导出' }, events: [], notes: [], networkViews: [] };
  const importedLegacy = await jsonCall(origin(), '/api/v2/import', { method: 'POST', body: { bundle: legacy } });
  assert.equal(importedLegacy.status, 200);
  assert.equal(importedLegacy.payload.data.imported.directions, 0);

  const removed = await jsonCall(origin(), `/api/v2/profiles/${profileId}/directions/${made.payload.data.direction.directionId}`, { method: 'DELETE' });
  assert.equal(removed.status, 200);
  const after = await jsonCall(origin(), `/api/v2/profiles/${profileId}/directions`);
  assert.deepEqual(after.payload.data.directions, [], '撤回之后不该还有残留');
  const exportAfter = await jsonCall(origin(), `/api/v2/profiles/${profileId}/export`);
  assert.deepEqual(exportAfter.payload.data.directions, [], '导出里也不该还有');
});
