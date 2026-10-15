import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve, sep } from 'node:path';
import { tmpdir } from 'node:os';
import { createHash } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import { PGlite } from '@electric-sql/pglite';
import { createLearnerStore } from '../server/db.mjs';
import { compareVaultFiles, extractVaultLinks, parseVaultNote, resolveVaultLink, safeVaultPath, parseByteRange, VAULT_LIMITS, validateVaultManifest } from '../shared/vault.mjs';

const hash = value => createHash('sha256').update(value).digest('hex');
const file = (path, content, id = 'file-one') => ({ id, path, kind: path.endsWith('.md') ? 'note' : 'attachment', size: Buffer.byteLength(content), sha256: hash(content), nodeIds: [] });
test('Obsidian parsing: aliases, formulas, code literals, relative links, headings and ambiguity', () => {
  const note = parseVaultNote('---\naliases: [极限, lim]\ntags:\n  - analysis\n---\n# 标题\n$\\lim x$ [[极限#性质|读法]] ![[img.png]] [后文](../other.md#^ref)\n```md\n[[not-a-link]]\n```\n`[[also-not-a-link]]`', '中文/笔记.md');
  assert.deepEqual(note.aliases, ['极限', 'lim']); assert.ok(note.tags.includes('analysis')); assert.ok(note.body.includes('$\\lim x$'));
  assert.equal(note.links.length, 3); assert.equal(note.links[0].fragment, '性质'); assert.equal(note.links[0].label, '读法'); assert.equal(note.links[1].embed, true);
  assert.equal(extractVaultLinks('[[x]] and https://example.com').length, 1);
  assert.equal(extractVaultLinks('[性质](note.md#%E6%80%A7%E8%B4%A8%20one)')[0].fragment, '性质 one');
  assert.equal(extractVaultLinks('$[[a]]$\n$$\n[[b]]\n$$\n[[actual-note]]').length, 1, 'formulas stay literal rather than becoming links');
  const files = [{ path: 'a/极限.md', aliases: ['lim'] }, { path: 'b/极限.md' }, { path: 'other.md' }];
  assert.equal(resolveVaultLink(files, '中文/笔记.md', note.links[0]).length, 2);
  assert.equal(resolveVaultLink(files, '中文/笔记.md', note.links[2])[0].path, 'other.md');
  assert.equal(resolveVaultLink(files, 'z.md', { target: 'lim', wiki: true }).length, 1);
  assert.deepEqual(parseVaultNote('---\naliases: "fundamental group"\n---\n# Test').aliases, ['fundamental group']);
  for (const path of ['../x.md', '/x.md', 'C:\\x.md', '.obsidian/config.md', 'x/../y.md']) assert.throws(() => safeVaultPath(path));
});
test('refresh retains stable identities, associations, old copies, and avoids ambiguous renames', () => {
  const old = [file('旧名.md', 'same', 'old-id'), file('消失.md', 'gone', 'missing-id')]; old[0].nodeIds = ['group:cayley'];
  const diff = compareVaultFiles(old, [file('新名.md', 'same', 'new-id')]);
  assert.equal(diff.renamed, 1); assert.equal(diff.files[0].id, 'old-id'); assert.deepEqual(diff.files[0].nodeIds, ['group:cayley']); assert.equal(diff.files[1].missing, true);
  const ambiguous = compareVaultFiles([file('a.md', 'same', 'a'), file('b.md', 'same', 'b')], [file('c.md', 'same', 'c')]);
  assert.equal(ambiguous.renamed, 0); assert.equal(ambiguous.missing, 2);
  assert.throws(() => validateVaultManifest([file('x.md', 'x'), file('x.md', 'y')]), /Duplicate/);
});
test('byte ranges include suffixes and reject invalid or multiple ranges', () => {
  assert.deepEqual(parseByteRange('bytes=2-4', 10), { start: 2, end: 4, partial: true });
  assert.deepEqual(parseByteRange('bytes=-3', 10), { start: 7, end: 9, partial: true });
  assert.equal(parseByteRange('bytes=10-', 10), null); assert.equal(parseByteRange('bytes=0-1,3-4', 10), null);
});
for (const dialect of ['sqlite', 'postgres']) test(`${dialect}: atomic imports, retry, history, quotas, isolation and backup`, async () => {
  const dir = mkdtempSync(join(tmpdir(), 'mcs-vault-test-')), pg = dialect === 'postgres' ? new PGlite() : null;
  const db = await createLearnerStore({ config: { dbFile: join(dir, 'test.sqlite3'), dbUrl: pg ? 'postgres://pglite/test' : null }, pool: pg });
  const v = db.vaults;
  async function upload(lib, data, id = 'file-one', path = '中文/笔记.md', baseRevision = lib.revision) {
    const meta = file(path, data, id); const batch = await v.begin('alice', lib.id, { baseRevision, files: [meta] });
    for (let start = 0, i = 0; start < data.length; start += VAULT_LIMITS.chunkBytes, i++) await v.chunk('alice', lib.id, batch.id, meta.sha256, i, data.subarray(start, start + VAULT_LIMITS.chunkBytes).toString('base64'));
    return { batch, meta, result: await v.commit('alice', lib.id, batch.id) };
  }
  try {
    const lib = await v.create('alice', '私有库');
    await assert.rejects(v.get('bob', lib.id), e => e.status === 404);
    const data = Buffer.from('# 极限\n[[其他]]\n$x^2$');
    const first = await upload(lib, data);
    assert.equal(first.result.revision, 1); assert.equal((await v.commit('alice', lib.id, first.batch.id)).revision, 1);
    assert.equal(first.result.files[0].sourceRevision, 1);
    await v.link('alice', lib.id, first.meta.id, { baseRevision: 1, nodeIds: ['group:cayley'] });
    const linked = await v.get('alice', lib.id); assert.equal(linked.revision, 2);
    const renamed = await upload(linked, data, 'renamed', '中文/改名.md');
    assert.equal(renamed.result.files[0].id, 'file-one');
    assert.deepEqual(renamed.result.files[0].nodeIds, ['group:cayley']);
    const staleA = await v.begin('alice', lib.id, { baseRevision: 3, files: renamed.result.files });
    const staleB = await v.begin('alice', lib.id, { baseRevision: 3, files: renamed.result.files });
    await v.commit('alice', lib.id, staleA.id);
    await assert.rejects(v.commit('alice', lib.id, staleB.id), e => e.status === 409);
    await v.cancel('alice', lib.id, staleB.id);
    const broken = file('broken.md', Buffer.from('bad'));
    const failed = await v.begin('alice', lib.id, { baseRevision: 4, files: [broken] });
    await v.chunk('alice', lib.id, failed.id, broken.sha256, 0, Buffer.from('zzz').toString('base64'));
    await assert.rejects(v.commit('alice', lib.id, failed.id), e => e.status === 422);
    assert.equal((await v.get('alice', lib.id)).revision, 4); await v.cancel('alice', lib.id, failed.id);
    const empty = await v.begin('alice', lib.id, { baseRevision: 4, files: [] }); await v.commit('alice', lib.id, empty.id);
    assert.equal((await v.get('alice', lib.id)).files[0].missing, true);
    assert.equal((await v.get('alice', lib.id, 1)).files[0].path, '中文/笔记.md');
    const media = Buffer.alloc(VAULT_LIMITS.chunkBytes + 5, 7);
    const m = await upload(await v.get('alice', lib.id), media, 'video', 'clip.mp4');
    const got = await v.bytes('alice', m.meta.sha256, VAULT_LIMITS.chunkBytes - 2, VAULT_LIMITS.chunkBytes + 2); assert.equal(got.length, 5); assert.equal(got[0], 7);
    await assert.rejects(v.bytes('bob', m.meta.sha256), e => e.status === 404);
    const backup = await db.backupTo(join(dir, 'backups')); await v.remove('alice', lib.id); assert.equal((await v.list('alice')).length, 0);
    await db.restoreFrom(backup.backup); assert.equal((await v.get('alice', lib.id)).revision, 6); assert.equal((await v.bytes('alice', m.meta.sha256)).length, media.length);
    v.limits.ownerBytes = media.length;
    const extra = await v.create('alice', '额度'); const f = file('new.md', 'new'); const b = await v.begin('alice', extra.id, { baseRevision: 0, files: [f] });
    await assert.rejects(v.chunk('alice', extra.id, b.id, f.sha256, 0, Buffer.from('new').toString('base64')), e => e.status === 413);
    assert.equal((await v.get('alice', extra.id)).revision, 0);
    await v.cancel('alice', extra.id, b.id); v.limits.ownerBytes = VAULT_LIMITS.ownerBytes;
    const segmented = await v.begin('alice', extra.id, { baseRevision: 0, files: [], fileCount: 2 });
    await assert.rejects(v.commit('alice', extra.id, segmented.id), e => e.status === 409);
    await v.manifestChunk('alice', extra.id, segmented.id, 0, [f]);
    await v.manifestChunk('alice', extra.id, segmented.id, 0, [f]);
    await assert.rejects(v.manifestChunk('alice', extra.id, segmented.id, 0, [file('wrong.md', 'wrong')]), e => e.status === 409);
    const another = file('another.md', 'another', 'another');
    await v.manifestChunk('alice', extra.id, segmented.id, 1, [another]);
    await v.chunk('alice', extra.id, segmented.id, f.sha256, 0, Buffer.from('new').toString('base64'));
    assert.deepEqual((await v.batch('alice', extra.id, segmented.id)).uploaded[f.sha256].chunks, [0]);
    await assert.rejects(v.commit('alice', extra.id, segmented.id), e => e.status === 409);
    await v.chunk('alice', extra.id, segmented.id, another.sha256, 0, Buffer.from('another').toString('base64'));
    assert.equal((await v.commit('alice', extra.id, segmented.id)).revision, 1);
    let oldBackup;
    if (dialect === 'sqlite') {
      oldBackup = (await db.backupTo(join(dir, 'legacy'))).backup;
      const old = new DatabaseSync(oldBackup);
      try { for (const table of ['vault_libraries', 'vault_revisions', 'vault_imports', 'vault_blobs', 'vault_chunks', 'vault_owners']) old.exec(`DROP TABLE ${table}`); } finally { old.close(); }
    } else {
      const legacy = await db.dumpAll(); delete legacy.vaults; delete legacy.vaultChunksFile;
      oldBackup = join(dir, 'legacy.json'); writeFileSync(oldBackup, JSON.stringify(legacy));
    }
    await db.restoreFrom(oldBackup); assert.deepEqual(await v.list('alice'), [], 'old backups restore with an empty vault store');
  } finally { await db.close(); if (pg) await pg.close(); if (resolve(dir).startsWith(resolve(tmpdir()) + sep)) rmSync(dir, { recursive: true, force: true }); }
});
