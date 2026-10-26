import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PGlite } from '@electric-sql/pglite';
import { createPostgresDriver } from '../server/sql-driver.mjs';
import { McsDatabase } from '../server/db.mjs';
import { CloudBackups } from '../server/cloud-backups.mjs';

test('cloud backup restores through a fresh instance and refuses corrupt stored bytes before replacing data', async () => {
  const engine = new PGlite();
  const driver = createPostgresDriver({ pool: engine });
  const db = new McsDatabase({ driver });
  try {
    await db.migrate();
    const profile = await db.createProfile({ name: '备份前', modelVersion: 'mcs-learner/1' });
    const backups = await new CloudBackups({ driver, db }).init();
    const receipt = await backups.backup();
    assert.match(receipt.backup, /^backup-/);
    assert.equal(receipt.persistent, true);
    await db.updateProfile(profile.id, { name: '备份后' });
    const second = await new CloudBackups({ driver, db: new McsDatabase({ driver }) }).init();
    await second.restore(receipt.backup);
    assert.equal((await db.getProfile(profile.id)).name, '备份前');
    await driver.run('UPDATE cloud_backup_parts SET body=? WHERE backup_id=?', [Buffer.from('invalid gzip').toString('base64'), receipt.backup]);
    await db.updateProfile(profile.id, { name: '应保留' });
    await assert.rejects(() => second.restore(receipt.backup));
    assert.equal((await db.getProfile(profile.id)).name, '应保留');
  } finally { await engine.close(); }
});
