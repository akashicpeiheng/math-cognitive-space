import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PGlite } from '@electric-sql/pglite';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createPostgresDriver } from '../server/sql-driver.mjs';
import { CloudExtensions } from '../server/cloud-extensions.mjs';
import { AuthoringDatabase } from '../server/authoring-db.mjs';

test('cloud content bytes and the authoring ledger commit together; failures preserve the previous version', async () => {
  const engine = new PGlite();
  const driver = createPostgresDriver({ pool: engine });
  const firstRoot = await mkdtemp(join(tmpdir(), 'mcs-cloud-first-'));
  const secondRoot = await mkdtemp(join(tmpdir(), 'mcs-cloud-second-'));
  try {
    const first = await new CloudExtensions({ driver, root: firstRoot }).init();
    const authoring = await new AuthoringDatabase({ driver }).init();
    const originalVersion = first.source.current().version;
    await first.publish(async stage => {
      await writeFile(join(stage.extensionsDir, 'immutable.txt'), 'committed');
      await authoring.createDraft({ id: 'committed', name: '保留' });
    });
    const second = await new CloudExtensions({ driver, root: secondRoot }).init();
    assert.equal(Buffer.from((await second.files())[0].body, 'base64').toString(), 'committed');
    assert.equal((await authoring.getDraft('committed')).name, '保留');
    assert.equal(second.source.current().version, originalVersion);
    const before = await driver.get('SELECT * FROM cloud_extension_state WHERE id=1');
    await assert.rejects(() => first.publish(async stage => {
      await authoring.createDraft({ id: 'failed', name: '应回滚' });
      await writeFile(join(stage.extensionsDir, 'immutable.txt'), 'must never overwrite');
    }), e => e.status === 409);
    await assert.rejects(() => authoring.getDraft('failed'), e => e.status === 404);
    assert.deepEqual(await driver.get('SELECT * FROM cloud_extension_state WHERE id=1'), before);
    assert.equal(Buffer.from((await second.files())[0].body, 'base64').toString(), 'committed');
    await second.refresh();
    assert.equal(second.source.current().version, originalVersion);
  } finally {
    await engine.close();
    await rm(firstRoot, { recursive: true, force: true });
    await rm(secondRoot, { recursive: true, force: true });
  }
});
