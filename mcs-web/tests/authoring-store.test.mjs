import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { AuthoringDatabase } from '../server/authoring-db.mjs';
import { createPostgresDriver } from '../server/sql-driver.mjs';

async function fixture(kind, run) {
  let db, engine, dir;
  if (kind === 'postgres') {
    const { PGlite } = await import('@electric-sql/pglite');
    engine = new PGlite();
    const driver = createPostgresDriver({ pool: engine, label: 'authoring-test' });
    db = await new AuthoringDatabase({ driver }).init();
  } else {
    dir = await mkdtemp(join(tmpdir(), 'mcs-authoring-'));
    db = await new AuthoringDatabase({ file: join(dir, 'authoring.sqlite3') }).init();
  }
  try { await run(db); }
  finally { await db?.close(); await engine?.close(); if (dir) await rm(dir, { recursive: true }); }
}

for (const kind of ['sqlite', 'postgres']) {
  test(`${kind}: authoring history, candidate reviews and active revision survive a fresh store handle`, async () => fixture(kind, async db => {
    const draft = await db.createDraft({ name: '云端草稿', ontologyVersion: 'v1', reading: '原始正文' });
    await db.updateDraft(draft.id, { reading: '修改后的正文' }, { expectedRevision: 1 });
    const run = await db.createRun({ draftId: draft.id, ontologyVersion: 'v1' });
    await db.saveCandidates(run.id, [{ id: 'c1', kind: 'analogy', math: { status: 'undecided' } }]);
    await db.setReview(run.id, ['c1'], 'accepted');
    await db.saveCandidates(run.id, [{ id: 'c1', kind: 'analogy', math: { status: 'verified' } }]);
    await db.updateRun(run.id, { status: 'completed' });
    await db.createPublication({ id: 'pub1', idempotencyKey: 'idem1', draftId: draft.id, revision: { id: 'rev1' }, requestDigest: 'hash1' });
    await db.setActiveRevision('rev1', 1);
    const reopened = await new AuthoringDatabase({ driver: db.driver }).init();
    assert.equal((await reopened.getDraft(draft.id)).reading, '修改后的正文');
    assert.equal((await reopened.listRuns())[0].candidateCount, 1);
    assert.equal((await reopened.getRun(run.id)).candidates[0].review, 'accepted');
    assert.equal((await reopened.findPublicationByIdempotency('idem1')).requestDigest, 'hash1');
    assert.equal((await reopened.getActiveRevision()).revisionId, 'rev1');
    assert.equal((await reopened.stats()).publications, 1);
  }));

  test(`${kind}: stale saves cannot overwrite a newer revision, and failed transactions leave no partial draft`, async () => fixture(kind, async db => {
    const draft = await db.createDraft({ name: '冲突测试' });
    await db.updateDraft(draft.id, { reading: '已保存' }, { expectedRevision: 1 });
    await assert.rejects(() => db.updateDraft(draft.id, { reading: '过期写入' }, { expectedRevision: 1 }), e => e.status === 409);
    assert.equal((await db.getDraft(draft.id)).reading, '已保存');
    await assert.rejects(() => db.transaction(async () => {
      await db.createDraft({ id: 'rolled-back', name: '不能留下' });
      throw new Error('transaction-failed');
    }), /transaction-failed/);
    await assert.rejects(() => db.getDraft('rolled-back'), e => e.status === 404);
    if (kind === 'postgres') {
      await db.driver.exec('CREATE TABLE IF NOT EXISTS public.meta (key TEXT PRIMARY KEY, value TEXT NOT NULL)');
      await db.driver.run('INSERT INTO public.meta(key,value) VALUES (?,?)', ['learner-schema', 'untouched']);
      assert.equal((await db.driver.get('SELECT value FROM public.meta WHERE key=?', ['learner-schema'])).value, 'untouched');
      assert.equal(await db.metaGet('learner-schema'), null);
    }
  }));
}
