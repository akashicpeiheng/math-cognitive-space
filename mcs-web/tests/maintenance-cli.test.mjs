import test from 'node:test';
import assert from 'node:assert/strict';
import { cpSync, mkdirSync, mkdtempSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { DatabaseSync } from 'node:sqlite';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

test('maintenance CLIs seed idempotently and back up / restore the configured SQLite store', (t) => {
  // Run real entrypoints in an isolated fixture; never use developer credentials or runtime.
  const workspace = mkdtempSync(join(tmpdir(), 'mcs-maintenance-cli-'));
  t.after(() => rmSync(workspace, { recursive: true, force: true }));
  const dir = join(workspace, 'mcs-web');
  mkdirSync(dir);
  cpSync(resolve(root, '../mcs-foundations/validation/certification'),
    join(workspace, 'mcs-foundations/validation/certification'), { recursive: true });
  /*
   * fixture 要长得像**真的仓库**，不能长得像 `mcs-web`。
   *
   * `core/ontology.mjs` 用「自己所在目录的父目录」当 `REPO_ROOT`，再据此解析
   * `mcs-foundations/validation/certification/certificates/*.json`。把 `core/` 平铺在
   * 临时目录下时，`REPO_ROOT` 会落到**系统临时目录**，那 4 份机器证书必然找不到，
   * `loadOntology` 直接抛「公共本体未通过检查（4 项）」——这正是这条测试从写出来
   * 就是红的原因（2026-10-05 修）。所以这里按真实布局摆：`<dir>/mcs-web/…` + `<dir>/mcs-foundations/…`。
   */
  const web = join(dir, 'mcs-web');
  for (const name of ['scripts', 'server']) mkdirSync(join(web, name), { recursive: true });
  for (const name of ['backup', 'restore', 'seed-demo']) {
    cpSync(join(root, 'scripts', name + '.mjs'), join(web, 'scripts', name + '.mjs'));
  }
  for (const name of ['config', 'db', 'sql-driver']) {
    cpSync(join(root, 'server', name + '.mjs'), join(web, 'server', name + '.mjs'));
  }
  for (const name of ['core', 'shared', 'data']) cpSync(join(root, name), join(web, name), { recursive: true });
  /*
   * 只带 certification 这一层（约 1.7 MB）：证书、检查器与它们的说明都在这里。
   * `mcs-foundations/evidence` 那类**不随发布分发**的材料不进 fixture，也不该进。
   */
  mkdirSync(join(dir, 'mcs-foundations', 'validation'), { recursive: true });
  cpSync(join(root, '..', 'mcs-foundations', 'validation', 'certification'),
    join(dir, 'mcs-foundations', 'validation', 'certification'), { recursive: true });
  writeFileSync(join(web, 'config.local.json'), JSON.stringify({ dataDir: join(root, 'data') }));
  const env = Object.fromEntries(Object.entries(process.env)
    .filter(([key]) => !key.toUpperCase().startsWith('MCS_WEB_') && key.toUpperCase() !== 'DATABASE_URL'));
  const run = (name, ...args) => spawnSync(process.execPath,
    [join(web, 'scripts', name + '.mjs'), ...args], { env, encoding: 'utf8', timeout: 30000 });
  const mustPass = (result) => assert.equal(result.status, 0, result.stdout + result.stderr);
  const snapshot = () => {
    const db = new DatabaseSync(join(web, 'runtime', 'mcs-web.sqlite3'));
    try {
      return {
        profiles: db.prepare('SELECT * FROM profiles ORDER BY id').all(),
        events: db.prepare('SELECT * FROM events ORDER BY seq').all(),
      };
    } finally { db.close(); }
  };

  const seed = run('seed-demo');
  mustPass(seed);
  assert.equal(JSON.parse(seed.stdout).demos.length, 2);
  const original = snapshot();
  assert.equal(original.profiles.length, 2);
  assert.equal(original.events.length, 4);
  mustPass(run('seed-demo'));
  assert.deepEqual(snapshot(), original, 'second seed must not duplicate or modify demo records');

  const backup = run('backup');
  mustPass(backup);
  const saved = JSON.parse(backup.stdout);
  assert.equal(saved.kind, 'physical');
  assert.equal(existsSync(saved.backup), true);
  const db = new DatabaseSync(join(web, 'runtime', 'mcs-web.sqlite3'));
  try { db.exec('DELETE FROM events'); } finally { db.close(); }
  assert.equal(snapshot().events.length, 0);
  const restored = run('restore', saved.backup);
  mustPass(restored);
  assert.match(restored.stdout, /"restored": true/);
  assert.deepEqual(snapshot(), original);

  const missing = run('restore', join(dir, 'not-a-backup.sqlite3'));
  assert.notEqual(missing.status, 0);
  assert.deepEqual(snapshot(), original, 'missing backup must leave data intact');
});
