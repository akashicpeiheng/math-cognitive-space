import { cp } from 'node:fs/promises';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, rm, stat } from 'node:fs/promises';
import { join, resolve, sep } from 'node:path';
import { tmpdir } from 'node:os';
import { spawn } from 'node:child_process';
import { PGlite } from '@electric-sql/pglite';
import { REPO_ROOT } from '../core/ontology.mjs';
import { LEAN_FILES, LEAN_PROJECT, LEAN_POLICY, digest, hasCompleteLeanReplay, readLeanRegistry, captureLeanSnapshot, sealLeanSources, validateLeanAudit, validateLeanReport, leanRegistrationView, runLeanProcess, killLeanProcessTree, leanBinaries, leanCapabilities, matchesLeanVersion } from '../core/lean.mjs';
import { LeanJobManager, LeanVerificationStore } from '../server/lean-jobs.mjs';
import { createLearnerStore } from '../server/db.mjs';
import {readContentSources} from '../core/content-library.mjs';
import {compileContentLibrary,parseContentDocument,formatContentDocument} from '../shared/content-documents.mjs';

async function fixture() {
  const dir = await mkdtemp(join(tmpdir(), 'mcs-lean-unit-'));
  const root = join(dir, LEAN_PROJECT); await mkdir(root, { recursive: true });
  for (const file of LEAN_FILES) {
    const target = join(root, file); await mkdir(join(target, '..'), { recursive: true });
    const content = file === 'lake-manifest.json' ? '{"packages":[]}' : await readFile(join(REPO_ROOT, LEAN_PROJECT, file));
    await writeFile(target, content);
  }
  const registry = await readLeanRegistry(dir);
  for (const ref of new Set(registry.registrations.flatMap(r => r.originalRefs))) {
    const target = join(dir, ref); await mkdir(join(target, '..'), { recursive: true }); await writeFile(target, await readFile(join(REPO_ROOT, ref)));
  }
  await cp(join(REPO_ROOT, 'mcs-content'), join(dir, 'mcs-content'), { recursive: true });
  await sealLeanSources(dir);
  return dir;
}
async function cleanup(dir) { assert.ok(resolve(dir).startsWith(resolve(tmpdir()) + sep)); await rm(dir, { recursive: true, force: true }); }
const auditFor = registry => ({ schema: 'mcs-lean-audit/1', targets: registry.registrations.flatMap(r => r.targets).map(name => ({ declaration: `MCS.Verified.${name}`, expected: `MCS.Expected.${name}`, kind: 'theorem', targetMatched: true, axioms: ['propext', 'Classical.choice'] })) });

test('only the exact pinned Lean version is accepted', () => {
  assert.equal(matchesLeanVersion('Lean (version 4.34.1, x86_64, Release)\n'), true);
  for (const version of ['4.34.10', '4.34.1-rc1', '4.34.0', '4.35.1']) assert.equal(matchesLeanVersion(`Lean (version ${version}, x86_64, Release)`), false);
});
test('formal Markdown changes expire machine seals; reading and annotation changes do not',async()=>{
  const dir=await fixture();
  try{
    const before=await captureLeanSnapshot(dir,'lean-group-injective');
    for(const ref of ['nodes/injective-proof.md','objects/group-injective.md']){
      const path=join(dir,'mcs-content',ref),source=await readFile(path,'utf8');await writeFile(path,source+'\n讲解修改。\n');
      assert.equal((await captureLeanSnapshot(dir,'lean-group-injective')).inputSha256,before.inputSha256);
    }
    const docs=readContentSources(join(dir,'mcs-content')).map(s=>parseContentDocument(s.markdown,s.path));
    docs.find(d=>d.data.id==='obj:group:injective').data.assumptions=['forall a:G b:G. a = b'];
    const library=compileContentLibrary(docs,{checkPins:false});
    const pin=value=>{
      if(!value||typeof value!=='object')return;
      if(value.formalHash!==undefined&&value.anchor){const o=library.objects.find(o=>o.id===value.id);value.formalHash=value.anchor==='$'?o.formalHash:o.declarations.find(d=>d.id===value.anchor).formalHash;}
      for(const child of Object.values(value))pin(child);
    };
    for(const doc of docs){pin(doc.data);await writeFile(join(dir,'mcs-content',doc.path),formatContentDocument(doc.data,doc.body));}
    const after=await captureLeanSnapshot(dir,'lean-group-injective');assert.notEqual(after.inputSha256,before.inputSha256);assert.equal(after.sealed,false);
  }finally{await cleanup(dir);}
});

test('an incomplete native toolchain is never invoked and materials remain readable', async () => {
  const dir = await fixture();
  try {
    const path = join(dir, 'unprepared', process.platform === 'win32' ? 'lake.exe' : 'lake');
    await mkdir(join(path, '..')); await writeFile(path, 'not an installed toolchain');
    assert.equal(leanBinaries(dir, { lakePath: path }).available, false);
    const capabilities = await leanCapabilities(dir, { lakePath: path });
    assert.equal(capabilities.ready, false); assert.equal(capabilities.unavailableReason, 'toolchain_missing');
    assert.equal((await leanRegistrationView(dir, 'lean-closure-8-8')).id, 'lean-closure-8-8');
  } finally { await cleanup(dir); }
});

test('Lean policy rejects missing targets, changed goals, indirect sorry, custom and native axioms', async () => {
  const registry = await readLeanRegistry(REPO_ROOT);
  assert.equal(validateLeanAudit(auditFor(registry), registry).length, 15);
  const attacks = [
    parsed => parsed.targets.pop(),
    parsed => parsed.targets.push(parsed.targets[0]),
    parsed => { parsed.targets[0].expected = 'MCS.Expected.other'; },
    parsed => { parsed.targets[0].kind = 'axiom'; },
    parsed => { parsed.targets[0].targetMatched = false; },
    ...['sorryAx', 'Fake.assumption', 'Lean.ofReduceBool._native'].map(axiom => parsed => { parsed.targets[0].axioms.push(axiom); }),
  ];
  for (const attack of attacks) { const parsed = auditFor(registry); attack(parsed); assert.throws(() => validateLeanAudit(parsed, registry)); }
  for (const parsed of [null, {}, { schema: 'mcs-lean-audit/1', targets: [] }]) assert.throws(() => validateLeanAudit(parsed, registry));
});

test('seals bind original prose, proof sources, dependency lock and registration metadata', async () => {
  const dir = await fixture();
  try {
    const baseline = await captureLeanSnapshot(dir, 'lean-group-injective'); assert.equal(baseline.sealed, true);
    for (const ref of ['mcs-foundations/lean/MCS/Proofs/Group.lean', 'mcs-foundations/lean/lake-manifest.json', 'mcs-foundations/lean/README.md', 'mcs-foundations/cases/04-群概念的多来源.md', 'mcs-foundations/lean/registrations.json']) {
      const original = await readFile(join(dir, ref), 'utf8');
      // Whitespace is still a source change; valid JSON stays valid.
      await writeFile(join(dir, ref), original + '\n');
      const changed = await captureLeanSnapshot(dir, 'lean-group-injective');
      assert.equal(changed.sealed, false); assert.notEqual(changed.inputSha256, baseline.inputSha256);
      await writeFile(join(dir, ref), original);
    }
  } finally { await cleanup(dir); }
});

test('damaged published receipts never retain a passed status; no review record means pending', async () => {
  const dir = await fixture();
  try {
    const folder = join(dir, LEAN_PROJECT, 'reports'); await mkdir(folder);
    for (const content of ['not json', JSON.stringify({ status: 'passed' }), JSON.stringify({ schema: 'mcs-lean-report/1', backend: 'lean4', registrationId: 'lean-group-injective', evidenceId: 'ev-lean-group-injective', status: 'passed', audit: null })]) {
      await writeFile(join(folder, 'lean-group-injective.json'), content);
      const view = await leanRegistrationView(dir, 'lean-group-injective'); assert.equal(view.publishedReport.status, 'corrupt'); assert.equal(view.correspondence.status, 'pending');
    }
    const registry = await readLeanRegistry(dir);
    registry.registrations[0].correspondence.status = 'reviewed';
    await writeFile(join(dir, LEAN_PROJECT, 'registrations.json'), JSON.stringify(registry));
    assert.equal((await leanRegistrationView(dir, 'lean-group-injective')).correspondence.status, 'pending');
  } finally { await cleanup(dir); }
});

test('a real published report rejects corrupted targets, logs and missing kernel replay', async t => {
  const registry = await readLeanRegistry(REPO_ROOT), r = registry.registrations[0];
  let report;
  try { report = JSON.parse(await readFile(join(REPO_ROOT, LEAN_PROJECT, 'reports', r.id + '.json'), 'utf8')); }
  catch { return t.skip('Real published report is not installed'); }
  validateLeanReport(report, registry, r);
  for (const mutate of [p => { p.targets.pop(); }, p => { p.kernelReplayed = false; }, p => { p.audit.targets[0].axioms.push('sorryAx'); }, p => { p.logs[0].stdout += 'damaged'; }, p => { delete p.toolchainHashes; }]) {
    const changed = structuredClone(report); mutate(changed); assert.throws(() => validateLeanReport(changed, registry, r));
  }
});

test('sequential replay requires every module once in order and binds the imported checker', async () => {
  const markers = LEAN_POLICY.replayModules.map(module => `MCS_KERNEL_REPLAY:${module}`);
  assert.equal(hasCompleteLeanReplay(markers.join('\r\n') + '\r\n'), true);
  const invalid = [markers.slice(1), [...markers].reverse(), [...markers, markers[0]], [...markers.slice(0, -1), 'MCS_KERNEL_REPLAY:Unknown'], []];
  for (const lines of invalid) assert.equal(hasCompleteLeanReplay(lines.join('\n')), false);
  const registry = await readLeanRegistry(REPO_ROOT), registration = registry.registrations[0], audit = auditFor(registry);
  const base = {
    schema: 'mcs-lean-report/1', backend: 'lean4', registrationId: registration.id, evidenceId: registration.evidenceId,
    status: 'passed', policyVersion: LEAN_POLICY.version, replayMode: LEAN_POLICY.replayMode, kernelReplayed: true,
    checkerSourceSha256: 'a'.repeat(64), toolchainHashes: { checker: 'b'.repeat(64), checkerModule: 'c'.repeat(64) },
    audit, targets: audit.targets.filter(target => registration.targets.includes(target.declaration.replace('MCS.Verified.', ''))),
    logs: [{ stage: 'build', exitCode: 0, stdout: '' }, { stage: 'kernel_replay', exitCode: 0, stdout: markers.join('\n') }, { stage: 'target_audit', exitCode: 0, stdout: '' }],
  };
  // Recompute ordinary digests so rejection tests replay completeness, not just a stale checksum.
  const receipt = value => { const { receiptSha256: _old, ...body } = value; body.logsSha256 = digest(body.logs); return { ...body, receiptSha256: digest(body) }; };
  validateLeanReport(receipt(base), registry, registration);
  for (const lines of invalid) { const changed = structuredClone(base); changed.logs[1].stdout = lines.join('\n'); assert.throws(() => validateLeanReport(receipt(changed), registry, registration)); }
  const missingModule = structuredClone(base); delete missingModule.toolchainHashes.checkerModule;
  assert.throws(() => validateLeanReport(receipt(missingModule), registry, registration));
});

for (const postgres of [false, true]) test(`verification history, restart interruption and backup roundtrip (${postgres ? 'PostgreSQL' : 'SQLite'})`, async () => {
  const dir = await mkdtemp(join(tmpdir(), 'mcs-lean-store-')); const pg = postgres ? new PGlite() : null;
  const db = await createLearnerStore({ config: postgres ? { dbUrl: 'postgres://pglite/test' } : { dbFile: join(dir, 'test.sqlite3') }, pool: pg });
  try {
    const store = new LeanVerificationStore(db.driver); await store.migrate();
    for (const status of ['queued', 'running', 'completed']) await store.save({ id: status, owner: 'alice', status, createdAt: new Date().toISOString(), inputSha256: 'original', result: status === 'completed' ? { status: 'test-only-history' } : null });
    await store.interruptPending();
    assert.equal((await store.get('queued')).status, 'interrupted'); assert.equal((await store.get('running')).status, 'interrupted'); assert.equal((await store.get('completed')).status, 'completed');
    assert.match((await store.get('running')).logSummarySha256, /^[a-f0-9]{64}$/);
    assert.equal((await db.dumpAll()).events.length, 0);
    const backup = await db.backupTo(dir);
    await db.driver.run('DELETE FROM verification_runs'); assert.equal(await store.get('completed'), null);
    await db.restoreFrom(backup.backup); assert.equal((await store.get('completed')).result.status, 'test-only-history');
  } finally { await db.close(); await pg?.close(); await cleanup(dir); }
});

test('Lean queue: one running plus one queued per owner, isolation, cancellation and restart', async () => {
  const dir = await fixture(); const db = await createLearnerStore({ config: { dbFile: join(dir, 'test.sqlite3') } });
  const calls = [];
  const check = (_root, snapshot, { signal }) => new Promise((resolvePromise, reject) => {
    const call = { snapshot, finish: () => resolvePromise({ status: 'test-only-queue' }) }; calls.push(call);
    signal.addEventListener('abort', () => reject(new Error('aborted')), { once: true });
  });
  const jobs = await new LeanJobManager({ driver: db.driver, repoRoot: dir, check, capabilities: async () => ({ ready: true }), config: { timeoutMs: 5000 } }).init();
  try {
    const request = { evidenceId: 'ev-lean-group-injective', ontologyVersion: 'fixed-version', owner: 'alice' };
    const first = await jobs.run(request); const queued = await jobs.run(request);
    assert.equal(jobs.stats().running, 1); assert.equal(jobs.stats().queued, 1);
    await assert.rejects(jobs.run(request), error => error.status === 429);
    await assert.rejects(jobs.get(first.id, 'bob'), error => error.status === 404);
    await assert.rejects(jobs.cancel(first.id, 'bob'), error => error.status === 404);
    const changed = join(dir, LEAN_PROJECT, 'MCS/Proofs/Group.lean'); await writeFile(changed, (await readFile(changed, 'utf8')) + '\n');
    assert.equal((await jobs.get(first.id, 'alice')).freshness, 'stale');
    assert.equal(calls[0].snapshot.inputSha256, (await jobs.store.get(queued.id)).inputSha256, 'queued inputs are captured at submission');
    assert.equal((await jobs.cancel(first.id, 'alice')).status, 'cancelled');
    await jobs.close(); assert.equal((await jobs.get(queued.id, 'alice')).status, 'interrupted');
  } finally { await jobs.close(); await db.close(); await cleanup(dir); }
});

test('Lean global queue holds at most twenty waiting jobs and cancellation frees a slot', async () => {
  const dir = await fixture(); const db = await createLearnerStore({ config: { dbFile: join(dir, 'quota.sqlite3') } });
  const check = (_root, _snapshot, { signal }) => new Promise((_resolve, reject) => signal.addEventListener('abort', () => reject(new Error('aborted')), { once: true }));
  const jobs = await new LeanJobManager({ driver: db.driver, repoRoot: dir, check, capabilities: async () => ({ ready: true }) }).init();
  try {
    const request = { evidenceId: 'ev-lean-group-injective', ontologyVersion: 'fixed' };
    await jobs.run({ ...request, owner: 'running' });
    const queued = [];
    for (let i = 0; i < 20; i++) queued.push(await jobs.run({ ...request, owner: `waiting-${i}` }));
    assert.equal(jobs.stats().queued, 20);
    await assert.rejects(jobs.run({ ...request, owner: 'overflow' }), error => error.status === 429);
    assert.equal((await jobs.cancel(queued[0].id, 'waiting-0')).status, 'cancelled');
    await jobs.run({ ...request, owner: 'running' });
    assert.equal(jobs.stats().queued, 20);
  } finally { await jobs.close(); await db.close(); await cleanup(dir); }
});

for (const trigger of ['cancellation', 'timeout']) test(`${trigger} kills the real child process tree before the runner returns`, async () => {
  const dir = await mkdtemp(join(tmpdir(), 'mcs-lean-process-')); const marker = join(dir, 'heartbeat'); const ready = join(dir, 'ready');
  const grandchild = `const fs=require('fs');setInterval(()=>fs.writeFileSync(${JSON.stringify(marker)},String(Date.now())),15);`;
  const parent = `const fs=require('fs');require('child_process').spawn(process.execPath,['-e',${JSON.stringify(grandchild)}],{stdio:'ignore'});fs.writeFileSync(${JSON.stringify(ready)},'ready');setInterval(()=>{},1000);`;
  const controller = new AbortController(); const running = runLeanProcess(process.execPath, ['-e', parent], { cwd: dir, signal: controller.signal, timeoutMs: trigger === 'timeout' ? 600 : 5000 });
  try {
    for (let i = 0; i < 100; i++) { try { await stat(marker); break; } catch { await new Promise(resolvePromise => setTimeout(resolvePromise, 20)); } }
    await stat(marker); if (trigger === 'cancellation') controller.abort(); assert.equal((await running).reason, trigger === 'timeout' ? 'timeout' : 'cancelled');
    const before = (await stat(marker)).mtimeMs; await new Promise(resolvePromise => setTimeout(resolvePromise, 120));
    assert.equal((await stat(marker)).mtimeMs, before, 'no orphaned descendant continues writing');
  } finally { controller.abort(); await running; await cleanup(dir); }
});

test('output exhaustion is distinct from mathematical rejection', async () => {
  const out = await runLeanProcess(process.execPath, ['-e', "setInterval(()=>process.stdout.write('x'.repeat(4096)),1)"], { maxOutputBytes: 8192, timeoutMs: 5000 });
  assert.equal(out.reason, 'output_limit');
});

test('service shutdown interrupts a running verification and kills its descendants', async () => {
  const dir = await fixture(); const marker = join(dir, 'shutdown-heartbeat');
  const db = await createLearnerStore({ config: { dbFile: join(dir, 'shutdown.sqlite3') } });
  const descendant = `setInterval(()=>require('fs').writeFileSync(${JSON.stringify(marker)},String(Date.now())),15);`;
  const parent = `require('child_process').spawn(process.execPath,['-e',${JSON.stringify(descendant)}],{stdio:'ignore'});setInterval(()=>{},1000);`;
  const check = async (_root, _snapshot, { signal }) => {
    const out = await runLeanProcess(process.execPath, ['-e', parent], { cwd: dir, signal });
    if (out.reason) throw new Error(out.reason);
    throw new Error('The test process must not complete a proof');
  };
  const jobs = await new LeanJobManager({ driver: db.driver, repoRoot: dir, check, capabilities: async () => ({ ready: true }) }).init();
  try {
    const job = await jobs.run({ evidenceId: 'ev-lean-group-injective', ontologyVersion: 'shutdown-test', owner: 'alice' });
    for (let i = 0; i < 100; i++) { try { await stat(marker); break; } catch { await new Promise(resolvePromise => setTimeout(resolvePromise, 20)); } }
    await stat(marker); await jobs.close();
    assert.equal((await jobs.get(job.id, 'alice')).status, 'interrupted');
    const before = (await stat(marker)).mtimeMs; await new Promise(resolvePromise => setTimeout(resolvePromise, 120));
    assert.equal((await stat(marker)).mtimeMs, before);
  } finally { await jobs.close(); await db.close(); await cleanup(dir); }
});

test('Windows stop script kills the actual service process tree', { skip: process.platform !== 'win32' }, async () => {
  const dir = await mkdtemp(join(tmpdir(), 'mcs-lean-stop-')); const marker = join(dir, 'stop-heartbeat');
  await mkdir(join(dir, 'scripts')); await mkdir(join(dir, 'server')); await mkdir(join(dir, 'runtime'));
  const stop = (await readFile(join(REPO_ROOT, 'mcs-web/scripts/stop.ps1'), 'utf8')).replace(/^\uFEFF/, '');
  await writeFile(join(dir, 'scripts/stop.ps1'), '\uFEFF' + stop);
  const descendant = `setInterval(()=>require('fs').writeFileSync(${JSON.stringify(marker)},String(Date.now())),15);`;
  await writeFile(join(dir, 'server/index.mjs'), `import {spawn} from 'node:child_process';spawn(process.execPath,['-e',${JSON.stringify(descendant)}],{stdio:'ignore',windowsHide:true});setInterval(()=>{},1000);`);
  const child = spawn(process.execPath, ['server/index.mjs'], { cwd: dir, windowsHide: true, stdio: 'ignore' });
  const exited = new Promise(resolvePromise => child.once('close', resolvePromise));
  await writeFile(join(dir, 'runtime/server.pid'), String(child.pid));
  try {
    for (let i = 0; i < 100; i++) { try { await stat(marker); break; } catch { await new Promise(resolvePromise => setTimeout(resolvePromise, 20)); } }
    await stat(marker);
    const result = await runLeanProcess('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', join(dir, 'scripts/stop.ps1')], { cwd: dir, timeoutMs: 20000 });
    assert.equal(result.code, 0, result.stderr); await exited;
    const before = (await stat(marker)).mtimeMs; await new Promise(resolvePromise => setTimeout(resolvePromise, 120));
    assert.equal((await stat(marker)).mtimeMs, before);
  } finally { await killLeanProcessTree(child); await exited; await cleanup(dir); }
});
