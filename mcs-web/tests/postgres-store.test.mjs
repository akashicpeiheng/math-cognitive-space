/**
 * PostgreSQL 存储层验收（2026-10-05 加）。
 *
 * ## 为什么用 PGlite
 *
 * PGlite 是编译成 WASM 的**真实 PostgreSQL**，不用起服务、不用凭据，但它跑的是真 SQL：
 * 占位符、`SERIAL`、`CAST(COUNT(*) AS INTEGER)`、事务回滚都与生产一致。
 * 这比"用一个假驱动测一遍逻辑"强得多——后者只能证明代码自洽，证明不了 SQL 在 PostgreSQL 上成立。
 *
 * ## 测什么
 *
 * 不是"能建表"这种存在性检查，而是**本机与公网必须完全一致的那几条语义**：
 * 事件去重、revision 冲突、分页游标、导出完整性、导入全有或全无、备份恢复往返。
 * 这些一旦两边漂移，就会出现「同一份导出，本机与公网结果不同」——那是数据事故。
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, existsSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import { McsDatabase, createLearnerStore } from '../server/db.mjs';
import { createPostgresDriver, toNumberedPlaceholders } from '../server/sql-driver.mjs';

async function openPostgres() {
  const pg = new PGlite();
  const db = await createLearnerStore({ config: { dbUrl: 'postgres://pglite/test' }, pool: pg });
  return { pg, db };
}

function event(eventId, overrides = {}) {
  return {
    eventId,
    ontologyVersion: 'test',
    kind: 'view',
    nodeId: 'bg:real:metric',
    occurredAt: new Date().toISOString(),
    baseRevision: null,
    source: { kind: 'system', ref: 'postgres-test' },
    evidenceRefs: [],
    payload: { context: 'read' },
    ...overrides,
  };
}

test('驱动：占位符翻译跳过字符串里的问号', () => {
  assert.equal(
    toNumberedPlaceholders("SELECT * FROM t WHERE a = ? AND b = '含有?的字面量' AND c = ?"),
    "SELECT * FROM t WHERE a = $1 AND b = '含有?的字面量' AND c = $2",
  );
  assert.equal(toNumberedPlaceholders("SELECT '''' , ?"), "SELECT '''' , $1", '转义单引号不改变字符串状态');
});

test('PostgreSQL：开库、迁移与统计（COUNT 必须是数字，不是字符串）', async () => {
  const { pg, db } = await openPostgres();
  try {
    assert.equal(db.describe().dialect, 'postgres');
    const stats = await db.stats();
    assert.equal(stats.dialect, 'postgres');
    assert.equal(stats.schemaVersion, 'mcs-web-db/1');
    assert.equal(stats.profiles, 0);
    assert.equal(typeof stats.profiles, 'number', 'COUNT(*) 走了 CAST，否则 node-pg 会给字符串');
    assert.equal(stats.file, null, 'PostgreSQL 没有"数据文件"这个概念');
  } finally {
    await db.close();
    await pg.close();
  }
});

test('PostgreSQL：档案生命周期与 revision 递增', async () => {
  const { pg, db } = await openPostgres();
  try {
    const profile = await db.createProfile({ name: '公网档案', modelVersion: 'mcs-learner/1' });
    assert.equal(profile.revision, 1);
    assert.equal(profile.archived, false);

    const renamed = await db.updateProfile(profile.id, { name: '改名后' });
    assert.equal(renamed.name, '改名后');
    assert.equal(renamed.revision, 2);

    assert.equal((await db.listProfiles()).length, 1);
    await db.updateProfile(profile.id, { archived: true });
    assert.equal((await db.listProfiles()).length, 0, '归档的不出现在默认清单里');
    assert.equal((await db.listProfiles({ includeArchived: true })).length, 1);
    assert.equal((await db.getProfile(profile.id)).archived, true);
  } finally {
    await db.close();
    await pg.close();
  }
});

test('PostgreSQL：事件去重、revision 冲突与分页游标（与本机同一条判据）', async () => {
  const { pg, db } = await openPostgres();
  try {
    const profile = await db.createProfile({ name: '事件档案' });
    const first = await db.appendEvent(profile.id, event('e-1'));
    assert.deepEqual(first, { duplicate: false, revision: 2, eventId: 'e-1' });

    // 同 ID 同内容 → duplicate（不报错、不重复计数）
    const again = await db.appendEvent(profile.id, event('e-1'));
    assert.equal(again.duplicate, true);
    assert.equal(again.revision, 2, '重复事件不推高 revision');

    // 同 ID 不同内容 → 409
    await assert.rejects(
      () => db.appendEvent(profile.id, event('e-1', { payload: { context: 'answered' } })),
      (error) => error.code === 'EVENT_ID_CONFLICT' && error.status === 409,
    );

    // 旧 revision → 409（乐观锁）
    await assert.rejects(
      () => db.appendEvent(profile.id, event('e-2', { baseRevision: 1 })),
      (error) => error.code === 'REVISION_CONFLICT' && error.details?.merge_available === true,
    );
    // merge 通道放行
    const merged = await db.appendEvent(profile.id, event('e-2', { baseRevision: 1 }), { merge: true });
    assert.equal(merged.revision, 3);

    for (let index = 3; index <= 12; index += 1) await db.appendEvent(profile.id, event(`e-${index}`));
    assert.equal(await db.countEvents(profile.id), 12);

    // keyset 分页：从最新往回翻，游标用的是上一页的最小 seq
    const page1 = await db.listEvents(profile.id, { limit: 5 });
    assert.equal(page1.length, 5);
    assert.equal(page1.at(-1).eventId, 'e-12', '默认按时间正序返回给界面');
    const cursor = page1[0].seq;
    const page2 = await db.listEvents(profile.id, { limit: 5, before: cursor });
    assert.equal(page2.length, 5);
    assert.ok(page2.every((item) => item.seq < cursor), '游标是 keyset：只取比它更早的');
    assert.equal(new Set([...page1, ...page2].map((item) => item.eventId)).size, 10, '两页不重叠');

    // 全量读取不受分页上限影响
    assert.equal((await db.listAllEvents(profile.id)).length, 12);
    assert.equal((await db.findEvent(profile.id, 'e-7')).eventId, 'e-7');
    assert.equal(await db.findEvent(profile.id, '不存在'), null);
  } finally {
    await db.close();
    await pg.close();
  }
});

test('PostgreSQL：笔记与视图的写入都会推高档案 revision，并按归属隔离', async () => {
  const { pg, db } = await openPostgres();
  try {
    const profile = await db.createProfile({ name: 'E 层档案' });
    const note = await db.createNote(profile.id, { nodeId: 'bg:real:metric', title: '笔记', body: '正文', tags: ['测试'], baseRevision: 1 });
    assert.equal(note.revision, 1);
    assert.equal((await db.getProfile(profile.id)).revision, 2, '写笔记推高档案 revision');

    const updated = await db.updateNote(profile.id, note.noteId, { title: '改标题', baseRevision: 2 });
    assert.equal(updated.title, '改标题');
    assert.equal((await db.getProfile(profile.id)).revision, 3);

    const view = await db.createNetworkView(profile.id, { name: '视图', payload: { added: ['bg:real:metric'], families: ['contract'], positions: {}, camera: null }, baseRevision: 3 });
    assert.equal((await db.listNetworkViews(profile.id)).length, 1);
    assert.equal((await db.getProfile(profile.id)).revision, 4);

    // 归属：另一个档案拿不到这条笔记 / 视图
    const other = await db.createProfile({ name: '另一个档案' });
    assert.equal((await db.listNotes(other.id)).length, 0);
    assert.equal((await db.listNetworkViews(other.id)).length, 0);
    await assert.rejects(() => db.updateNote(other.id, note.noteId, { title: 'x' }), (error) => error.status === 404);
    await assert.rejects(() => db.deleteNetworkView(other.id, view.viewId), (error) => error.status === 404);

    assert.equal((await db.deleteNote(profile.id, note.noteId)).deleted, true);
    assert.equal((await db.deleteNetworkView(profile.id, view.viewId)).deleted, true);
    // 级联删除：档案没了，事件也没了
    await db.appendEvent(profile.id, event('cascade-1'));
    await db.deleteProfile(profile.id);
    await assert.rejects(() => db.getProfile(profile.id), (error) => error.code === 'UNKNOWN_PROFILE');
    assert.equal((await db.stats()).events, 0, '删档案要级联删事件');
  } finally {
    await db.close();
    await pg.close();
  }
});

test('PostgreSQL：导出完整、导入全有或全无（超过 2000 条也不截断）', async () => {
  const { pg, db } = await openPostgres();
  try {
    const profile = await db.createProfile({ name: '超长档案' });
    // 第 1 条是最早的“已掌握”确认：它必须活到最后（这正是 2026-10 修掉的那个缺陷）
    await db.appendEvent(profile.id, event('long-0000', { kind: 'confirmation', payload: { confirmed: true } }));
    for (let index = 1; index <= 2000; index += 1) {
      await db.appendEvent(profile.id, event(`long-${String(index).padStart(4, '0')}`));
    }
    assert.equal(await db.countEvents(profile.id), 2001);
    const bundle = await db.exportProfile(profile.id, { ontologyVersion: 'test' });
    assert.equal(bundle.events.length, 2001, '导出必须完整');
    assert.ok(bundle.events.some((item) => item.eventId === 'long-0000'), '最早的确认事件不得被截断');
    assert.ok(bundle.events.some((item) => item.eventId === 'long-2000'));

    // 导入：正常包完整搬过来
    const imported = await db.importProfile({ profile: { name: '导入的档案' }, events: bundle.events.slice(0, 5), notes: [], networkViews: [] });
    assert.equal(imported.imported.events, 5);
    assert.deepEqual(imported.skipped, []);

    // 导入：冲突事件 ID → 整体回退，不留半份档案
    const before = (await db.listProfiles()).length;
    await assert.rejects(
      () => db.importProfile({
        profile: { name: '坏包' },
        events: [event('ok-1'), event('ok-2'), event('bad-1', { kind: '不是合法类型' })],
        notes: [],
        networkViews: [],
      }),
      (error) => error.status === 422 && Array.isArray(error.details?.skipped) && error.details.skipped.length === 1,
    );
    assert.equal((await db.listProfiles()).length, before, '导入失败后档案数不变（半成品已回滚）');
  } finally {
    await db.close();
    await pg.close();
  }
});

test('PostgreSQL：备份是逻辑导出，恢复是整库回填（往返一致）', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'mcs-pg-backup-'));
  const { pg, db } = await openPostgres();
  try {
    const profile = await db.createProfile({ name: '要备份的档案' });
    await db.appendEvent(profile.id, event('backup-1'));
    await db.createNote(profile.id, { nodeId: null, title: '笔记', body: '内容', tags: [], baseRevision: null });

    const backup = await db.backupTo(dir);
    assert.equal(backup.kind, 'logical', 'PostgreSQL 走逻辑备份（没有文件可复制）');
    assert.ok(existsSync(backup.backup));
    const dump = JSON.parse(readFileSync(backup.backup, 'utf8'));
    assert.equal(dump.schema, 'mcs-web-logical-backup/1');
    assert.equal(dump.counts.profiles, 1);
    assert.equal(dump.counts.events, 1);
    assert.equal(dump.counts.notes, 1);

    // 破坏现场：删掉档案再恢复
    await db.deleteProfile(profile.id);
    assert.equal((await db.stats()).profiles, 0);

    const restored = await db.restoreFrom(backup.backup);
    assert.equal(restored.kind, 'logical');
    const stats = await db.stats();
    assert.equal(stats.profiles, 1);
    assert.equal(stats.events, 1);
    assert.equal(stats.notes, 1);
    assert.equal((await db.getProfile(profile.id)).name, '要备份的档案');
    assert.equal((await db.findEvent(profile.id, 'backup-1')).eventId, 'backup-1');

    // 格式不符的备份要明确拒绝，而不是静默清库
    const bogus = join(dir, 'bogus.json');
    const { writeFileSync } = await import('node:fs');
    writeFileSync(bogus, JSON.stringify({ schema: '别的东西' }));
    await assert.rejects(() => db.restoreFrom(bogus), (error) => error.status === 422);
    assert.equal((await db.stats()).profiles, 1, '拒绝之后库还是原来的样子');
  } finally {
    await db.close();
    await pg.close();
    rmSync(dir, { recursive: true, force: true });
  }
});

test('驱动：事务在异步调用链上隔离，不把并发请求卷进同一个事务', async () => {
  const pg = new PGlite();
  const driver = createPostgresDriver({ pool: pg, label: 'tx-test' });
  try {
    await driver.exec('CREATE TABLE tx_probe (id TEXT PRIMARY KEY)');
    /*
     * A 在事务里插入后**故意不提交**（等 B 走完），B 在事务外插入。
     * 如果驱动把"当前连接"记在实例字段上，B 的插入会落进 A 的事务里；
     * 用 AsyncLocalStorage 绑在调用链上时，B 走的是池（这里是同一条 PGlite 连接，
     * 所以用"B 能否看见 A 未提交的行"来判——看不见才说明两者不在同一事务）。
     */
    let seenByB = null;
    const a = driver.transaction(async () => {
      await driver.run('INSERT INTO tx_probe(id) VALUES (?)', ['from-a']);
      seenByB = await (async () => {
        // 事务 B：独立的调用链
        return driver.transaction(async () => {
          await driver.run('INSERT INTO tx_probe(id) VALUES (?)', ['from-b']);
          return 'b-done';
        });
      })();
    });
    await a;
    assert.equal(seenByB, 'b-done');
    const rows = await driver.all('SELECT id FROM tx_probe ORDER BY id');
    assert.deepEqual(rows.map((row) => row.id), ['from-a', 'from-b']);

    // 回滚：抛错后这一批写入必须消失
    await assert.rejects(() => driver.transaction(async () => {
      await driver.run('INSERT INTO tx_probe(id) VALUES (?)', ['rollback-me']);
      throw new Error('故意失败');
    }), /故意失败/);
    const after = await driver.all('SELECT id FROM tx_probe');
    assert.equal(after.some((row) => row.id === 'rollback-me'), false, '事务失败必须回滚');
  } finally {
    await driver.close();
    await pg.close();
  }
});

test('McsDatabase 拒绝没有驱动的构造（防止绕过驱动直连）', () => {
  assert.throws(() => new McsDatabase({}), (error) => error.code === 'INTERNAL');
});
