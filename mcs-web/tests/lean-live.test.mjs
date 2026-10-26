import { cp } from 'node:fs/promises';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm, symlink, rmdir } from 'node:fs/promises';
import { join, resolve, sep } from 'node:path';
import { tmpdir } from 'node:os';
import { REPO_ROOT } from '../core/ontology.mjs';
import { LEAN_PROJECT, captureLeanSnapshot, checkLeanSnapshot, leanCapabilities, leanBinaries, sealLeanSources } from '../core/lean.mjs';
import { startTestServer, jsonCall } from './helpers.mjs';
import { TEST_LEAN_TIMEOUT_MS } from './lean-test-budget.mjs';

const capabilities = await leanCapabilities(REPO_ROOT);
if (process.env.MCS_WEB_REQUIRE_LEAN === '1') assert.equal(capabilities.ready, true, capabilities.reason ?? 'Lean required');

test('real Lean: all registrations replay via HTTP without changing M or learner events', { skip: !capabilities.ready, timeout: TEST_LEAN_TIMEOUT_MS * 3 + 60000 }, async () => {
  const app = await startTestServer();
  try {
    const version = app.ontology.version;
    for (const [evidenceId,targetCount] of [['ev-lean-group-injective',4], ['ev-lean-closure-8-8',4], ['ev-lean-topology-dg',7]]) {
      const submitted = await jsonCall(app.origin, '/api/v2/lean/jobs', { method: 'POST', body: { evidenceId, ontologyVersion: version } });
      assert.equal(submitted.status, 200); const id = submitted.payload.data.id;
      let job;
      for (const deadline=Date.now()+TEST_LEAN_TIMEOUT_MS+10000;Date.now()<deadline;) {
        job = (await jsonCall(app.origin, `/api/v2/lean/jobs/${id}`)).payload.data;
        if (!['running', 'queued'].includes(job.status)) break;
        await new Promise(resolvePromise => setTimeout(resolvePromise, 250));
      }
      assert.equal(job.status, 'completed', JSON.stringify(job)); assert.equal(job.result.status, 'passed', JSON.stringify(job.result));
      assert.equal(job.result.targets.length, targetCount); assert.equal(job.result.checkerVerified, false); assert.equal(job.freshness, 'current');
    }
    assert.equal(app.getOntology().version, version); assert.equal((await app.db.dumpAll()).events.length, 0);
    const malicious = await jsonCall(app.origin, '/api/v2/lean/jobs', { method: 'POST', body: { evidenceId: 'ev-lean-group-injective', ontologyVersion: version, code: 'axiom x : False' } });
    assert.equal(malicious.status, 400);
    const wrongVersion = await jsonCall(app.origin, '/api/v2/lean/jobs', { method: 'POST', body: { evidenceId: 'ev-lean-group-injective', ontologyVersion: 'old-version' } });
    assert.equal(wrongVersion.status, 409);
  } finally { await app.leanJobs.close(); await app.cleanup(); }
});

test('Lean API cancellation, malformed bodies and read-only fallback use the real service', { skip: !capabilities.ready, timeout: 30000 }, async () => {
  const app = await startTestServer();
  try {
    const before = await app.db.dumpAll(); const version = app.getOntology().version;
    const material = await jsonCall(app.origin, '/api/v2/lean/registrations/lean-closure-8-8');
    assert.equal(material.status, 200); assert.match(material.payload.data.correspondenceDocument.content, /Finset U/);
    for (const body of [null, [], 'code', { evidenceId: 'ev-lean-group-injective', ontologyVersion: version, path: 'file.lean' }]) {
      assert.equal((await jsonCall(app.origin, '/api/v2/lean/jobs', { method: 'POST', body })).status, 400);
    }
    const submitted = await jsonCall(app.origin, '/api/v2/lean/jobs', { method: 'POST', body: { evidenceId: 'ev-lean-group-injective', ontologyVersion: version } });
    assert.equal(submitted.status, 200);
    const cancelled = await jsonCall(app.origin, `/api/v2/lean/jobs/${submitted.payload.data.id}`, { method: 'DELETE' });
    assert.equal(cancelled.payload.data.status, 'cancelled'); assert.equal(app.leanJobs.stats().running, 0);
    const after = await app.db.dumpAll();
    for (const key of ['profiles', 'events', 'notes', 'networkViews', 'directions', 'learningPlans', 'connectionNotes']) assert.deepEqual(after[key], before[key], key);
    assert.equal(app.getOntology().version, version);
  } finally { await app.cleanup(); }
  for (const lean of [{ enabled: false }, { lakePath: join(REPO_ROOT, '.lean-tools', 'not-installed', 'lake') }]) {
    const readonly = await startTestServer({ lean });
    try {
      assert.equal((await jsonCall(readonly.origin, '/api/v2/lean/registrations/lean-group-injective')).status, 200);
      const response = await jsonCall(readonly.origin, '/api/v2/lean/jobs', { method: 'POST', body: { evidenceId: 'ev-lean-group-injective', ontologyVersion: readonly.getOntology().version } });
      assert.equal(response.status, 503); assert.equal(readonly.leanJobs.stats().running, 0);
    } finally { await readonly.cleanup(); }
  }
});

test('real Lean rejects sorry, indirect sorry, extra/native axioms, stronger targets and missing reports', { skip: !capabilities.ready, timeout: TEST_LEAN_TIMEOUT_MS * 8 + 60000 }, async () => {
  const baseline = await captureLeanSnapshot(REPO_ROOT, 'lean-group-injective');
  const attacks = [
    ['direct sorry', files => { files['MCS/Proofs/Group.lean'] = files['MCS/Proofs/Group.lean'].replace(/theorem rightUnitInjective[\s\S]*?(?=theorem groupSpecialization)/, 'theorem rightUnitInjective : Expected.rightUnitInjective.{u} := by sorry\n\n'); }],
    ['indirect sorry', files => { files['MCS/Proofs/Group.lean'] = files['MCS/Proofs/Group.lean'].replace(/theorem rightUnitInjective[\s\S]*?(?=theorem groupSpecialization)/, 'theorem unfinished : False := by sorry\ntheorem rightUnitInjective : Expected.rightUnitInjective.{u} := False.elim unfinished\n\n'); }],
    ['custom axiom', files => { files['MCS/Proofs/Group.lean'] = files['MCS/Proofs/Group.lean'].replace(/theorem rightUnitInjective[\s\S]*?(?=theorem groupSpecialization)/, 'axiom extra : False\ntheorem rightUnitInjective : Expected.rightUnitInjective.{u} := False.elim extra\n\n'); }],
    ['native axiom', files => { files['MCS/Proofs/Group.lean'] = files['MCS/Proofs/Group.lean'].replace(/theorem rightUnitInjective[\s\S]*?(?=theorem groupSpecialization)/, 'theorem nativeTruth : True := by native_decide\ntheorem rightUnitInjective : Expected.rightUnitInjective.{u} := True.rec (by\n  intro G mul e rightUnit g h same\n  have atUnit := congrFun same e\n  simpa only [rightUnit] using atUnit) nativeTruth\n\n'); }],
    ['stronger target', files => { files['MCS/Verified.lean'] = files['MCS/Verified.lean'].replace('theorem rightUnitInjective : Expected.rightUnitInjective.{u} := Proofs.rightUnitInjective', 'theorem rightUnitInjective : True → Expected.rightUnitInjective.{u} := fun _ => Proofs.rightUnitInjective'); }],
    ['missing declaration', files => { files['MCS/Verified.lean'] = files['MCS/Verified.lean'].replace('theorem rightUnitInjective : Expected.rightUnitInjective.{u} := Proofs.rightUnitInjective', ''); }],
    ['missing audit report with zero exit', files => { files['MCS/Audit.lean'] = files['MCS/Audit.lean'].replace(/\nmcs_audit\s*$/, '\n'); }],
  ];
  for (const [label, mutate] of attacks) {
    const dir = await mkdtemp(join(tmpdir(), 'mcs-lean-live-negative-'));
    const project = join(dir, LEAN_PROJECT); const files = { ...baseline.files }; mutate(files);
    try {
      for (const [file, content] of Object.entries(files)) { const path = join(project, file); await mkdir(join(path, '..'), { recursive: true }); await writeFile(path, content); }
      await mkdir(join(project, '.lake'), { recursive: true });
      await symlink(join(REPO_ROOT, LEAN_PROJECT, '.lake', 'packages'), join(project, '.lake', 'packages'), process.platform === 'win32' ? 'junction' : 'dir');
      const registry = JSON.parse(files['registrations.json']);
      for (const ref of new Set(registry.registrations.flatMap(r => r.originalRefs))) { const { readFile } = await import('node:fs/promises'); const target = join(dir, ref); await mkdir(join(target, '..'), { recursive: true }); await writeFile(target, await readFile(join(REPO_ROOT, ref))); }
      await cp(join(REPO_ROOT, 'mcs-content'), join(dir, 'mcs-content'), { recursive: true });
      await sealLeanSources(dir);
      const result = await checkLeanSnapshot(dir, await captureLeanSnapshot(dir, baseline.registration.id), { config: { timeoutMs: TEST_LEAN_TIMEOUT_MS, lakePath: leanBinaries(REPO_ROOT).lake, workDir: join(REPO_ROOT, 'mcs-web', 'runtime', 'lean-check') } });
      assert.notEqual(result.status, 'passed', label);
      if (['direct sorry', 'indirect sorry', 'custom axiom', 'native axiom'].includes(label)) {
        assert.equal(result.logs[0].exitCode, 0, `${label}: proof must really compile before the axiom audit rejects it`);
        assert.match(result.message ?? '', /未允许公理/, `${label}: ${JSON.stringify(result)}`);
      }
      if (label === 'missing audit report with zero exit') assert.equal(result.status, 'corrupt');
      console.log('真实 Lean 负例已拒绝：' + label);
    } finally {
      assert.ok(resolve(dir).startsWith(resolve(tmpdir()) + sep));
      if (process.platform === 'win32') await rmdir(join(project, '.lake', 'packages')).catch(() => {}); else await rm(join(project, '.lake', 'packages'), { force: true }).catch(() => {});
      await rm(dir, { recursive: true, force: true });
    }
  }
});
