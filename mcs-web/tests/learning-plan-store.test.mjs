import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, copyFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import { createLearnerStore } from '../server/db.mjs';
import { startTestServer, jsonCall } from './helpers.mjs';

for (const dialect of ['sqlite', 'postgres']) test(`${dialect}：学习方案冲突、档案隔离、导入导出与备份恢复`, async () => {
  const dir = mkdtempSync(join(tmpdir(), 'mcs-learning-store-'));
  const pg = dialect === 'postgres' ? new PGlite() : null;
  const db = await createLearnerStore({ config: pg ? { dbUrl: 'postgres://pglite/test' } : { dbFile: join(dir, 'test.sqlite3') }, pool: pg });
  try {
    const a = await db.createProfile({ name: 'a' }); const b = await db.createProfile({ name: 'b' });
    assert.equal((await db.getLearningPlan(a.id)).revision, 0);
    const saved = await db.putLearningPlan(a.id, { primaryGoal: 'limit:bridge', interests: ['分析'], branches: ['group:cayley'], baseRevision: 0 });
    assert.equal(saved.revision, 1);
    assert.equal((await db.getLearningPlan(b.id)).primaryGoal, null);
    await assert.rejects(() => db.putLearningPlan(a.id, { primaryGoal: 'group:cayley', baseRevision: 0 }), error => error.code === 'REVISION_CONFLICT');
    const bundle = await db.exportProfile(a.id);
    assert.deepEqual(bundle.learningPlan.interests, ['分析']);
    const imported = await db.importProfile(bundle);
    assert.equal((await db.getLearningPlan(imported.profile.id)).primaryGoal, 'limit:bridge');
    const oldBundle = { ...bundle }; delete oldBundle.learningPlan;
    const old = await db.importProfile(oldBundle); assert.equal((await db.getLearningPlan(old.profile.id)).revision, 0);
    const broken = { ...bundle, learningPlan: { ...bundle.learningPlan, interests: [42] } };
    const before = (await db.listProfiles()).length;
    await assert.rejects(() => db.importProfile(broken)); assert.equal((await db.listProfiles()).length, before);
    let backup = join(dir, 'backup.json');
    if (pg) writeFileSync(backup, JSON.stringify(await db.dumpAll())); else backup = (await db.backupTo(dir)).backup;
    await db.putLearningPlan(a.id, { primaryGoal: 'group:cayley', baseRevision: 1 });
    if (pg) {
      await db.restoreFrom(backup);
      assert.equal((await db.getLearningPlan(a.id)).primaryGoal, 'limit:bridge');
    } else {
      // Restore into a fresh path: Windows may retain a handle to the live SQLite file.
      const restoredFile = join(dir, 'restored.sqlite3'); copyFileSync(backup, restoredFile);
      const restored = await createLearnerStore({ config: { dbFile: restoredFile } });
      try { assert.equal((await restored.getLearningPlan(a.id)).primaryGoal, 'limit:bridge'); }
      finally { await restored.close(); }
    }
    await db.deleteProfile(a.id);
    assert.equal((await db.driver.all('SELECT * FROM learning_plans WHERE profile_id = ?', [a.id])).length, 0);
  } finally { await db.close(); if (pg) await pg.close(); rmSync(dir, { recursive: true, force: true }); }
});

test('接口：主目标声明原子写入，预览只读，旧方向提供默认主目标', async () => {
  const server = await startTestServer();
  try {
    const call = (path, options) => jsonCall(server.origin, '/api/v2' + path, options);
    const created = await call('/profiles', { method: 'POST', body: { name: '学习方案', template: 'blank' } });
    const id = created.payload.data.profile.id;
    const before = await call('/health');
    const saved = await call(`/profiles/${id}/learning-plan`, { method: 'PUT', body: { primaryGoal: 'group:cayley', interests: ['群论'], baseRevision: 0 } });
    assert.equal(saved.status, 200);
    assert.equal(saved.payload.data.plan.revision, 1);
    const events = await call(`/profiles/${id}/events`);
    assert.equal(events.payload.data.events.filter(event => event.kind === 'goal').length, 1);
    assert.equal(events.payload.data.events.filter(event => event.kind === 'confirmation').length, 0);
    const conflict = await call(`/profiles/${id}/learning-plan`, { method: 'PUT', body: { primaryGoal: 'limit:bridge', baseRevision: 0 } });
    assert.equal(conflict.status, 409);
    assert.equal((await call(`/profiles/${id}/directions`)).payload.data.directions.length, 1);
    const invalid = await call(`/profiles/${id}/learning-plan`, { method: 'PUT', body: { primaryGoal: 'missing', baseRevision: 1 } });
    assert.equal(invalid.status, 404);
    const started = await call('/learning-plan-preview', { method: 'POST', body: { preferences: saved.payload.data.plan, profileId: id } });
    assert.equal(started.status, 200);
    const jobId = started.payload.data.job.id;
    let job;
    for (let n = 0; n < 100; n += 1) {
      job = (await call(`/learning-plan-preview/${jobId}`)).payload.data.job;
      if (['done', 'error'].includes(job.status)) break;
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    assert.equal(job.status, 'done', JSON.stringify(job.error));
    assert.ok(job.result.steps.length > 0);
    assert.equal((await call(`/profiles/${id}/events`)).payload.data.events.length, events.payload.data.events.length);
    assert.equal((await call('/health')).payload.data.ontology.contentHash, before.payload.data.ontology.contentHash);
    const old = await server.db.createProfile({ name: '旧档案' });
    await server.db.createDirection(old.id, { nodeId: 'limit:bridge' });
    const fallback = (await call(`/profiles/${old.id}/learning-plan`)).payload.data.plan;
    assert.equal(fallback.primaryGoal, 'limit:bridge'); assert.equal(fallback.revision, 0);
  } finally { await server.cleanup(); }
});
