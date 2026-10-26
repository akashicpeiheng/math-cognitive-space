import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PGlite } from '@electric-sql/pglite';
import { createPostgresDriver, createSqliteDriver } from '../server/sql-driver.mjs';
import { CloudJobs } from '../server/cloud-jobs.mjs';
import { mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

test('durable jobs survive new readers, duplicate delivery, cancellation and expired leases', async t => {
  const engine = new PGlite();
  const driver = createPostgresDriver({ pool: engine });
  const sent = [], results = [];
  let execute = async job => ({ answer: job.request.value });
  const options = { driver, publish: async message => sent.push(message.id), execute: (...args) => execute(...args), getOntology: () => ({ version: 'v1' }), onResult: async job => results.push(job.id) };
  const writer = await new CloudJobs(options).init();
  const reader = await new CloudJobs(options).init();
  try {
    await t.test('a second instance reads results and redelivery has one effect', async () => {
      const job = await writer.run({ value: 42 }, { owner: 'alice' });
      assert.equal((await reader.get(job.id)).status, 'queued');
      await reader.consume(job.id);
      await writer.consume(job.id);
      assert.equal((await reader.get(job.id)).result.answer, 42);
      assert.equal(results.filter(id => id === job.id).length, 1);
    });
    await t.test('running ownership survives a function ending; cancellation wins over a late result', async () => {
      let release, started;
      const ready = new Promise(resolve => { started = resolve; });
      execute = async () => { started(); return new Promise(resolve => { release = resolve; }); };
      const job = await writer.run({}, { owner: 'alice' });
      const consuming = writer.consume(job.id);
      await ready;
      writer.close();
      await assert.rejects(() => reader.run({}, { owner: 'alice' }), e => e.status === 429);
      await assert.rejects(() => reader.consume(job.id), e => e.status === 429);
      await reader.cancel(job.id);
      release({ late: true });
      await consuming;
      assert.equal((await reader.get(job.id)).status, 'cancelled');
      assert.equal((await reader.get(job.id)).result, null);
      assert.equal(results.includes(job.id), false);
    });
    await t.test('a dead worker lease is recoverable and an outbox row is republished', async () => {
      execute = async () => ({ recovered: true });
      const job = await writer.run({});
      await driver.run("UPDATE cloud_jobs SET status='running',lease_token='dead',lease_until='2000-01-01' WHERE id=?", [job.id]);
      await reader.consume(job.id);
      assert.equal((await reader.get(job.id)).result.recovered, true);
      const queued = await writer.run({});
      await driver.run('UPDATE cloud_jobs SET published_at=NULL WHERE id=?', [queued.id]);
      await reader.get(queued.id);
      assert.equal(sent.filter(id => id === queued.id).length, 2);
      await reader.cancel(queued.id);
    });
    await t.test('queue failure releases the owner quota and does not accept work', async () => {
      const failing = new CloudJobs({ ...options, publish: async () => { throw new Error('offline'); } });
      await assert.rejects(() => failing.run({}, { owner: 'bob' }), e => e.status === 503);
      const retry = await writer.run({}, { owner: 'bob' });
      await writer.cancel(retry.id);
    });
    await t.test('expired deliveries release quota instead of leaving an owner blocked forever', async () => {
      const old = await writer.run({}, { owner: 'expired' });
      await driver.run('UPDATE cloud_jobs SET created_at=? WHERE id=?', ['2000-01-01T00:00:00.000Z', old.id]);
      reader.lastRecovery = 0;
      const next = await reader.run({}, { owner: 'expired' });
      assert.equal((await reader.get(old.id)).status, 'error');
      await reader.cancel(next.id);
    });
  } finally { await engine.close(); }
});

test('SQLite: another request cannot join or roll back with an awaited transaction', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'mcs-sqlite-isolation-'));
  const driver = createSqliteDriver({ file: join(dir, 'store.sqlite3') });
  try {
    await driver.exec('CREATE TABLE entries (id TEXT PRIMARY KEY)');
    let release, started;
    const ready = new Promise(resolve => { started = resolve; });
    const transaction = driver.transaction(async () => {
      await driver.run("INSERT INTO entries VALUES ('rolled-back')");
      started();
      await new Promise(resolve => { release = resolve; });
      throw new Error('rollback');
    });
    await ready;
    const independent = driver.run("INSERT INTO entries VALUES ('survives')");
    const rejected = assert.rejects(transaction, /rollback/);
    release();
    await rejected; await independent;
    assert.deepEqual((await driver.all('SELECT id FROM entries')).map(row => row.id), ['survives']);
  } finally { await driver.close(); await rm(dir, { recursive: true, force: true }); }
});
