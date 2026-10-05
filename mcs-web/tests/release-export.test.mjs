import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, rmSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { spawnSync } from 'node:child_process';

function fixture(t, publicLayout = false) {
  const dir = mkdtempSync(join(tmpdir(), 'mcs-export-test-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const repo = join(dir, 'repo');
  const put = (path, content = 'fixture\n') => {
    const full = join(repo, path);
    mkdirSync(dirname(full), { recursive: true });
    writeFileSync(full, content);
  };
  put('mcs-web/scripts/export-open-source.mjs', readFileSync(new URL('../scripts/export-open-source.mjs', import.meta.url), 'utf8'));
  for (const path of ['validation/certification', 'arxiv', 'publication', 'cases', 'edition']) {
    put('mcs-foundations/' + path + '/README.md');
  }
  put('mcs-foundations/00-README.md');
  put('mcs-foundations/15-验证与完成标准.md');
  for (const name of ['LICENSE-MIT', 'LICENSE-CONTENT', 'NOTICE', 'SECURITY.md', 'CONTRIBUTING.md', '.gitignore']) {
    put(publicLayout ? name : 'mcs-web/release/' + name);
  }
  put(publicLayout ? 'README.md' : 'mcs-web/release/README-OPEN-SOURCE.md', 'Public README\n');
  const out = join(dir, 'export');
  const run = (target = out) => spawnSync(process.execPath, [join(repo, 'mcs-web/scripts/export-open-source.mjs'), '--out', target], { encoding: 'utf8' });
  return { dir, repo, put, out, run };
}

test('export excludes build caches and local credentials, retains official paper and source', (t) => {
  const f = fixture(t);
  const excluded = [
    'mcs-foundations/arxiv/output/pdf/main.pdf',
    'mcs-foundations/arxiv/package-staging/package/main.tex',
    'mcs-foundations/edition/main.aux', 'mcs-foundations/edition/main.out',
    'mcs-foundations/edition/main.toc', 'mcs-foundations/edition/main.synctex.gz',
    'mcs-web/.env.local', 'mcs-web/.env.production', 'mcs-web/config.local.json',
    'mcs-web/runtime/user.sqlite3', 'mcs-web/credentials.json',
    'mcs-web/.vercel/project.json', 'mcs-web/web/dist/index.html',
  ];
  excluded.forEach(path => f.put(path));
  f.put('mcs-foundations/arxiv/submission/paper.pdf', 'original paper');
  f.put('mcs-web/web/src/App.tsx', 'export default null;');
  const result = f.run();
  assert.equal(result.status, 0, result.stdout + result.stderr);
  for (const path of excluded) assert.equal(existsSync(join(f.out, path)), false, path);
  assert.equal(readFileSync(join(f.out, 'mcs-foundations/arxiv/submission/paper.pdf'), 'utf8'), 'original paper');
  assert.equal(existsSync(join(f.out, 'mcs-web/web/src/App.tsx')), true);
  const report = JSON.parse(readFileSync(f.out + '.export-report.json', 'utf8'));
  assert.deepEqual(report.missing, []);
  assert.deepEqual(report.secrets, []);
});

test('an exported public repository can export itself again with its root licenses', (t) => {
  const f = fixture(t, true);
  assert.equal(f.run().status, 0);
  assert.equal(readFileSync(join(f.out, 'README.md'), 'utf8'), 'Public README\n');
  assert.equal(existsSync(join(f.out, 'LICENSE-MIT')), true);
});

test('missing mandatory license fails instead of claiming a complete release', (t) => {
  const f = fixture(t);
  rmSync(join(f.repo, 'mcs-web/release/LICENSE-MIT'));
  const result = f.run();
  assert.equal(result.status, 1);
  assert.deepEqual(JSON.parse(readFileSync(f.out + '.export-report.json', 'utf8')).missing, ['release/LICENSE-MIT']);
});

test('existing output and output inside a source tree are rejected without overwriting', (t) => {
  const f = fixture(t);
  assert.equal(f.run().status, 0);
  const before = readFileSync(join(f.out, 'README.md'));
  assert.equal(f.run().status, 2);
  assert.deepEqual(readFileSync(join(f.out, 'README.md')), before);
  assert.notEqual(f.run(join(f.repo, 'mcs-web/export')).status, 0);
  assert.equal(existsSync(join(f.repo, 'mcs-web/export')), false);
});

test('directory links cannot bring unlisted files into a release', (t) => {
  const f = fixture(t);
  const outside = join(f.dir, 'outside');
  mkdirSync(outside);
  writeFileSync(join(outside, 'private.md'), 'private fixture');
  try {
    symlinkSync(outside, join(f.repo, 'mcs-web/linked'), process.platform === 'win32' ? 'junction' : 'dir');
  } catch (error) {
    if (['EPERM', 'EACCES', 'ENOTSUP'].includes(error.code)) return t.skip('system cannot create a link');
    throw error;
  }
  assert.notEqual(f.run().status, 0);
  assert.equal(existsSync(join(f.out, 'mcs-web/linked/private.md')), false);
});

test('a recognized credential pattern prevents a successful export', (t) => {
  const f = fixture(t);
  f.put('mcs-web/accidental.md', 'sk-' + 'a'.repeat(32));
  assert.equal(f.run().status, 1);
  const report = JSON.parse(readFileSync(f.out + '.export-report.json', 'utf8'));
  assert.equal(report.secrets.length, 1);
});

test('the local deny list blocks a matching term and reports itself unchecked when absent', (t) => {
  const f = fixture(t);
  // 词表在 design/ 下（不随发布包分发），所以公开仓库里没有它：那种情况下必须如实报未检查。
  const before = f.run();
  assert.equal(before.status, 0, before.stdout + before.stderr);
  assert.equal(JSON.parse(readFileSync(f.out + '.export-report.json', 'utf8')).disclosuresChecked, false);
  rmSync(f.out, { recursive: true, force: true });
  rmSync(f.out + '.export-report.json', { force: true });

  const term = 'FORBIDDEN-FIXTURE-TERM';
  f.put('design/release-deny-list.json', JSON.stringify({ blocking: [{ label: 'fixture', pattern: term }] }));
  f.put('mcs-web/disclosure.md', term + '\n');
  const after = f.run();
  assert.equal(after.status, 1);
  const report = JSON.parse(readFileSync(f.out + '.export-report.json', 'utf8'));
  assert.equal(report.disclosuresChecked, true);
  assert.equal(report.disclosures.length, 1);
});
