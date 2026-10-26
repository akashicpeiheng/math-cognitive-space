import { readFile, mkdir, mkdtemp, writeFile, symlink, rm, realpath, rmdir } from 'node:fs/promises';
import { existsSync, realpathSync } from 'node:fs';
import { dirname, join, resolve, sep } from 'node:path';
import { tmpdir } from 'node:os';
import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import { McsError, CODES } from '../shared/errors.mjs';
import { captureObjectBindings } from './content-lean.mjs';

export const LEAN_VERSION = '4.34.1';
export const MATHLIB_REV = 'd13f23b723b8a846827a245b89c10fc7d3f11612';
export const LEAN_PROJECT = 'mcs-foundations/lean';
export const LEAN_POLICY = Object.freeze({ version: 'mcs-lean-check/2', allowedAxioms: ['propext', 'Classical.choice', 'Quot.sound'], module: 'MCS.Verified', replayModules: ['MCS.Definitions', 'MCS.Expected', 'MCS.TopologyTargets', 'MCS.Proofs.Group', 'MCS.Proofs.Closure', 'MCS.Proofs.Topology', 'MCS.Verified'], replayMode: 'project-modules-sequential-single-process' });
const LEAN_ENV_KEYS = ['PATH', 'LEAN_PATH', 'LEAN_SRC_PATH', 'LEAN_SYSROOT', 'LEAN', 'LEAN_AR', 'LEAN_CC', 'LEAN_GITHASH', 'LD_LIBRARY_PATH', 'DYLD_LIBRARY_PATH'];
// This maintainer-owned runner uses exactly the same official replay function as leanchecker.
// Its source is bound by CHECKER_SOURCE_SHA256; task material cannot select modules or code.
const REPLAY_RUNNER = `import LeanChecker\n\nunsafe def mcsReplay : IO Unit := do\n  for module in ${JSON.stringify(LEAN_POLICY.replayModules)} do\n    replayFromImports module.toName\n    IO.println ("MCS_KERNEL_REPLAY:" ++ module)\n\n#eval mcsReplay\n`;
export const LEAN_FILES = Object.freeze(['lean-toolchain', 'lakefile.toml', 'lake-manifest.json', 'registrations.json', 'README.md', 'MCS.lean', 'MCS/Definitions.lean', 'MCS/Expected.lean', 'MCS/TopologyTargets.lean', 'MCS/Proofs/Group.lean', 'MCS/Proofs/Closure.lean', 'MCS/Proofs/Topology.lean', 'MCS/Verified.lean', 'MCS/Audit.lean']);
export const digest = value => createHash('sha256').update(typeof value === 'string' || Buffer.isBuffer(value) ? value : JSON.stringify(value)).digest('hex');
const CHECKER_SOURCE_SHA256 = digest(await Promise.all([
  './lean.mjs','./content-lean.mjs','./content-library.mjs','../shared/content-documents.mjs','../shared/content-relations.mjs',
  './formal/codec.mjs','./formal/language.mjs','./formal/terms.mjs',
].map(async path=>[path,digest(await readFile(new URL(path,import.meta.url)))])));
const pick = (value, locale) => value?.[locale === 'en' ? 'en' : 'zh'] ?? value;
const fail = (message, status = 503, code = CODES.EVIDENCE_UNSUPPORTED) => new McsError(code, message, status);

export async function readLeanRegistry(repoRoot) {
  const parsed = JSON.parse(await readFile(join(repoRoot, LEAN_PROJECT, 'registrations.json'), 'utf8'));
  if (parsed.schema !== 'mcs-lean-registrations/1' || !Array.isArray(parsed.registrations)) throw fail('Lean 登记清单损坏', 500);
  return parsed;
}

export async function captureLeanSnapshot(repoRoot, id) {
  const project = join(repoRoot, LEAN_PROJECT);
  const registry = await readLeanRegistry(repoRoot);
  const registration = registry.registrations.find(r => r.id === id || r.evidenceId === id);
  if (!registration) throw fail('Lean 登记不存在', 404, CODES.UNKNOWN_EVIDENCE);
  const files = {};
  for (const file of LEAN_FILES) files[file] = await readFile(join(project, file), 'utf8');
  const originals = {};
  for (const ref of registration.originalRefs) {
    const path = resolve(repoRoot, ref);
    if (!path.startsWith(resolve(repoRoot) + sep)) throw fail('Lean 原文引用越界', 500);
    originals[ref] = digest(await readFile(path));
  }
  const hashes = Object.fromEntries(Object.entries(files).map(([file, content]) => [file, digest(content)]));
  const objectBindings = captureObjectBindings(repoRoot, registration);
  const inputSha256 = digest({ registration, hashes, originals, objectBindings, policy: LEAN_POLICY, checkerSourceSha256: CHECKER_SOURCE_SHA256 });
  let integrity = null;
  try { integrity = JSON.parse(await readFile(join(project, 'integrity.json'), 'utf8')); } catch { /* Unsealed material is visible, but not replayable. */ }
  const sealed = integrity?.schema === 'mcs-lean-integrity/1' && integrity.inputs?.[registration.id] === inputSha256;
  return { registration, files, hashes, originals, objectBindings, inputSha256, sealed, registryVersion: registry.version, checkerSourceSha256: CHECKER_SOURCE_SHA256 };
}

export async function sealLeanSources(repoRoot) {
  const registry = await readLeanRegistry(repoRoot);
  const inputs = {};
  for (const r of registry.registrations) inputs[r.id] = (await captureLeanSnapshot(repoRoot, r.id)).inputSha256;
  await writeFile(join(repoRoot, LEAN_PROJECT, 'integrity.json'), JSON.stringify({ schema: 'mcs-lean-integrity/1', policy: LEAN_POLICY, inputs }, null, 2) + '\n');
  return inputs;
}

/** The controller waits for the whole process tree to be killed before resolving. */
export async function killLeanProcessTree(child) {
  if (!child?.pid) return;
  if (process.platform === 'win32') {
    await new Promise(resolvePromise => {
      const killer = spawn('taskkill.exe', ['/PID', String(child.pid), '/T', '/F'], { windowsHide: true, stdio: 'ignore' });
      killer.once('error', resolvePromise); killer.once('close', resolvePromise);
    });
  } else {
    try { process.kill(-child.pid, 'SIGKILL'); } catch { try { child.kill('SIGKILL'); } catch { /* exited */ } }
  }
}

export function runLeanProcess(command, args, { cwd, signal, timeoutMs = 120000, maxOutputBytes = 4 * 1024 * 1024, env = process.env } = {}) {
  return new Promise((resolvePromise, reject) => {
    if (signal?.aborted) { reject(fail('Lean 任务已取消', 409, CODES.JOB_CANCELLED)); return; }
    const child = spawn(command, args, { cwd, env, windowsHide: true, detached: process.platform !== 'win32', stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '', stderr = '', bytes = 0, reason = null, stopping = null;
    const stop = why => { if (!reason) reason = why; stopping ??= killLeanProcessTree(child); };
    const abort = () => stop('cancelled');
    signal?.addEventListener('abort', abort, { once: true });
    const timer = setTimeout(() => stop('timeout'), timeoutMs); timer.unref?.();
    const cleanup = () => { clearTimeout(timer); signal?.removeEventListener('abort', abort); };
    const append = (chunk, channel) => {
      bytes += chunk.length;
      if (bytes > maxOutputBytes) { stop('output_limit'); return; }
      if (channel === 'stdout') stdout += chunk.toString(); else stderr += chunk.toString();
    };
    child.stdout.on('data', chunk => append(chunk, 'stdout'));
    child.stderr.on('data', chunk => append(chunk, 'stderr'));
    child.once('error', error => { cleanup(); reject(fail(`无法启动 Lean 检查器：${error.code ?? 'error'}`)); });
    child.once('close', async code => { cleanup(); if (stopping) await stopping; resolvePromise({ code, stdout, stderr, reason, bytes }); });
  });
}

export function matchesLeanVersion(output) {
  return /^Lean \(version 4\.34\.1,/.test(output.trim());
}

export function leanBinaries(repoRoot, config = {}) {
  const suffix = process.platform === 'win32' ? '.exe' : '';
  const separator = process.platform === 'win32' ? ';' : ':';
  const explicitLake = config.lakePath || process.env.MCS_WEB_LAKE;
  const explicitLean = config.leanPath || process.env.MCS_WEB_LEAN;
  const local = join(repoRoot, '.lean-tools', process.platform === 'win32' ? 'lean-4.34.1-windows' : 'lean-4.34.1-linux', 'bin');
  const elanRoot = process.env.ELAN_HOME || join(process.env.USERPROFILE || process.env.HOME || tmpdir(), '.elan');
  const candidates = explicitLake || explicitLean ? [dirname(explicitLake || explicitLean)] : [
    local, join(elanRoot, 'toolchains', 'leanprover--lean4---v4.34.1', 'bin'),
    ...(process.env.PATH ?? '').split(separator).filter(Boolean),
  ];
  let bundle = null;
  // Never execute elan shims: even --version can download a missing toolchain.
  for (const candidate of candidates) {
    try {
      const lake = realpathSync(explicitLake || join(candidate, 'lake' + suffix));
      const lean = realpathSync(explicitLean || join(dirname(lake), 'lean' + suffix));
      const checker = realpathSync(join(dirname(lake), 'leanchecker' + suffix));
      const checkerModule = join(dirname(lean), '..', 'lib', 'lean', 'LeanChecker.olean');
      if (dirname(lean) !== dirname(lake) || !existsSync(join(dirname(lake), '..', 'lib', 'lean', 'Init.olean')) || !existsSync(checkerModule)) continue;
      bundle = { lake, lean, checker, checkerModule }; break;
    } catch { /* Not a complete, already installed native toolchain. */ }
  }
  const env = { ...process.env, PATH: bundle ? `${dirname(bundle.lake)}${separator}${process.env.PATH ?? ''}` : process.env.PATH };
  // Lean jobs receive no application credentials. All dependencies must already exist.
  for (const name of Object.keys(env)) if (/TOKEN|SECRET|PASSWORD|DATABASE_URL|DB_URL|SUPABASE|AUTH_|API_KEY/i.test(name)) delete env[name];
  return { ...(bundle ?? { lake: null, lean: null, checker: null }), available: Boolean(bundle), env };
}

async function validateDependencies(repoRoot, snapshot, binaries, signal) {
  const manifest = JSON.parse(snapshot.files['lake-manifest.json']);
  if (snapshot.files['lean-toolchain'].trim() !== `leanprover/lean4:v${LEAN_VERSION}` || manifest.packages?.find(p => p.name === 'mathlib')?.rev !== MATHLIB_REV) throw fail('Lean 或 mathlib 锁定版本不匹配');
  const base = join(repoRoot, LEAN_PROJECT, '.lake', 'packages');
  for (const pkg of manifest.packages ?? []) {
    if (pkg.type !== 'git' || !/^[a-f0-9]{40}$/.test(pkg.rev)) throw fail('Lean 依赖必须固定 git 提交');
    const dir = join(base, pkg.name);
    if (!existsSync(dir)) throw fail(`Lean 依赖未预热：${pkg.name}`);
    const head = await runLeanProcess('git', ['rev-parse', 'HEAD'], { cwd: dir, signal, timeoutMs: 10000, env: binaries.env });
    const modified = await runLeanProcess('git', ['status', '--porcelain', '--untracked-files=no'], { cwd: dir, signal, timeoutMs: 10000, env: binaries.env });
    if (head.code !== 0 || head.stdout.trim() !== pkg.rev || modified.code !== 0 || modified.stdout.trim()) throw fail(`Lean 依赖内容与锁文件不符：${pkg.name}`);
  }
}

export async function leanCapabilities(repoRoot, config = {}) {
  const registry = await readLeanRegistry(repoRoot);
  const registrations = await Promise.all(registry.registrations.map(async r => {
    try { const s = await captureLeanSnapshot(repoRoot, r.id); return { id: r.id, evidenceId: r.evidenceId, sealed: s.sealed, inputSha256: s.inputSha256 }; }
    catch { return { id: r.id, evidenceId: r.evidenceId, sealed: false }; }
  }));
  let ready = false, reason = null, unavailableReason = null;
  try {
    const binaries = leanBinaries(repoRoot, config);
    if (!binaries.available) throw fail('Lean 工具链未安装或不是已预热的原生工具链');
    const version = await runLeanProcess(binaries.lean, ['--version'], { cwd: join(repoRoot, LEAN_PROJECT), timeoutMs: 10000, env: binaries.env });
    if (version.code !== 0 || !matchesLeanVersion(version.stdout)) throw fail('Lean 工具链版本不匹配', 503, CODES.EVIDENCE_UNSUPPORTED);
    // leanchecker has no --help: unknown flags would replay the current project's modules.
    // Availability is a file check; every job must still execute and pass the checker.
    const checkerAvailable = existsSync(binaries.checker) || (binaries.env.PATH ?? '').split(process.platform === 'win32' ? ';' : ':').some(dir => existsSync(join(dir, 'leanchecker' + (process.platform === 'win32' ? '.exe' : ''))));
    if (!checkerAvailable) throw fail('leanchecker 不可用');
    const s = await captureLeanSnapshot(repoRoot, registry.registrations[0].id);
    await validateDependencies(repoRoot, s, binaries);
    ready = registrations.every(r => r.sealed);
    if (!ready) reason = 'Lean 源码或原文变更，需要重新核对并封存';
  } catch (error) { reason = error.message; }
  if (reason) unavailableReason = /ENOENT|无法启动|工具链未安装/.test(reason) ? 'toolchain_missing' : /版本不匹配/.test(reason) ? 'version_mismatch' : /leanchecker/.test(reason) ? 'checker_missing' : /未预热/.test(reason) ? 'dependency_missing' : /依赖/.test(reason) ? 'dependency_changed' : /封存/.test(reason) ? 'input_changed' : 'environment';
  return { backend: 'lean4', expectedVersion: LEAN_VERSION, mathlibRevision: MATHLIB_REV, registryVersion: registry.version, enabled: config.enabled !== false, ready, reason, unavailableReason, registrations, policy: LEAN_POLICY };
}

export async function leanRegistrationView(repoRoot, id, locale = 'zh') {
  const s = await captureLeanSnapshot(repoRoot, id);
  const r = s.registration;
  let publishedReport = null;
  try {
    publishedReport = JSON.parse(await readFile(join(repoRoot, LEAN_PROJECT, 'reports', `${r.id}.json`), 'utf8'));
    validateLeanReport(publishedReport, JSON.parse(s.files['registrations.json']), r);
  } catch (error) {
    if (error.code !== 'ENOENT') publishedReport = { status: 'corrupt', message: '已发布报告损坏或缺少检查目标' };
  }
  const freshness = publishedReport ? (s.sealed && publishedReport.inputSha256 === s.inputSha256 && publishedReport.policyVersion === LEAN_POLICY.version ? 'current' : 'stale') : 'not_run';
  const reviewableHashes = Object.fromEntries(Object.entries(s.hashes).filter(([file]) => file !== 'registrations.json'));
  const reviewed = r.correspondence.status === 'reviewed' && Boolean(r.correspondence.reviewer?.trim()) && Number.isFinite(Date.parse(r.correspondence.reviewedAt)) && JSON.stringify(r.correspondence.reviewedSourceHashes) === JSON.stringify(reviewableHashes) && JSON.stringify(r.correspondence.reviewedOriginalHashes) === JSON.stringify(s.originals);
  return { ...r, objectBindings: s.objectBindings, registrationVersion: r.version ?? s.registryVersion, title: pick(r.title, locale), statement: pick(r.statement, locale), assumptions: pick(r.assumptions, locale), scope: pick(r.scope, locale), obligations: pick(r.obligations, locale), correspondence: { ...r.correspondence, status: reviewed ? 'reviewed' : 'pending', note: pick(r.correspondence.note, locale) }, inputSha256: s.inputSha256, sealed: s.sealed, freshness, publishedReport, sources: Object.entries(s.files).filter(([file]) => file.endsWith('.lean')).map(([file, content]) => ({ file, sha256: s.hashes[file], content })), policy: LEAN_POLICY };
}

export function validateLeanAudit(parsed, registry) {
  const expected = registry.registrations.flatMap(r => r.targets).sort();
  if (parsed?.schema !== 'mcs-lean-audit/1' || !Array.isArray(parsed.targets) || parsed.targets.length !== expected.length) throw fail('Lean 核对报告缺失目标或已损坏', 422, CODES.EVIDENCE_FAILED);
  const seen = new Set();
  for (const target of parsed.targets) {
    const name = target.declaration?.replace(/^MCS\.Verified\./, '');
    if (!expected.includes(name) || seen.has(name) || target.expected !== `MCS.Expected.${name}` || target.kind !== 'theorem' || target.targetMatched !== true || !Array.isArray(target.axioms)) throw fail('Lean 证明目标与登记不符', 422, CODES.EVIDENCE_FAILED);
    if (target.axioms.some(a => !LEAN_POLICY.allowedAxioms.includes(a))) throw fail(`Lean 证明使用未允许公理：${target.axioms.join(', ')}`, 422, CODES.EVIDENCE_FAILED);
    seen.add(name);
  }
  return parsed.targets;
}

export function validateLeanReport(report, registry, registration) {
  if (report?.schema !== 'mcs-lean-report/1' || report.registrationId !== registration.id || report.evidenceId !== registration.evidenceId || report.backend !== 'lean4') throw fail('Lean 报告格式损坏', 422);
  if (report.status !== 'passed') return report;
  const { receiptSha256, ...receipt } = report;
  if (receiptSha256 !== digest(receipt)) throw fail('Lean 报告摘要损坏', 422);
  validateLeanAudit(report.audit, registry);
  const targets = report.targets?.map(t => t.declaration.replace('MCS.Verified.', '')).sort();
  const audited = report.audit.targets.filter(t => registration.targets.includes(t.declaration.replace('MCS.Verified.', '')));
  if (JSON.stringify(targets) !== JSON.stringify([...registration.targets].sort()) || JSON.stringify(report.targets) !== JSON.stringify(audited) || report.kernelReplayed !== true || !/^[a-f0-9]{64}$/.test(report.checkerSourceSha256 ?? '') || !/^[a-f0-9]{64}$/.test(report.toolchainHashes?.checker ?? '') || report.logsSha256 !== digest(report.logs) || JSON.stringify(report.logs?.map(l => [l.stage, l.exitCode])) !== JSON.stringify([['build', 0], ['kernel_replay', 0], ['target_audit', 0]])) throw fail('Lean 通过报告缺少可信检查结果', 422);
  if (report.policyVersion === LEAN_POLICY.version && (report.replayMode !== LEAN_POLICY.replayMode || !/^[a-f0-9]{64}$/.test(report.toolchainHashes?.checkerModule ?? '') || !hasCompleteLeanReplay(report.logs[1].stdout))) throw fail('Lean 通过报告缺少完整模块重放记录', 422);
  return report;
}

export function hasCompleteLeanReplay(stdout) {
  const modules = String(stdout ?? '').split(/\r?\n/).filter(line => line.startsWith('MCS_KERNEL_REPLAY:')).map(line => line.slice('MCS_KERNEL_REPLAY:'.length));
  return JSON.stringify(modules) === JSON.stringify(LEAN_POLICY.replayModules);
}

export async function checkLeanSnapshot(repoRoot, snapshot, { signal, config = {}, onStage = () => {} } = {}) {
  if (!snapshot.sealed) throw fail('Lean 输入已变更或尚未封存', 409, CODES.VERSION_CONFLICT);
  const started = Date.now(), binaries = leanBinaries(repoRoot, config);
  if (!binaries.available) throw fail('Lean 工具链未安装或不是已预热的原生工具链');
  const version = await runLeanProcess(binaries.lean, ['--version'], { cwd: join(repoRoot, LEAN_PROJECT), signal, timeoutMs: 10000, env: binaries.env });
  if (version.code !== 0 || !matchesLeanVersion(version.stdout)) throw fail('Lean 工具链版本不匹配');
  await validateDependencies(repoRoot, snapshot, binaries, signal);
  const resolveBinary = async binary => {
    if (existsSync(binary)) return binary;
    for (const dir of (binaries.env.PATH ?? '').split(process.platform === 'win32' ? ';' : ':')) {
      const candidate = join(dir, binary + (process.platform === 'win32' ? '.exe' : ''));
      if (existsSync(candidate)) return candidate;
    }
    throw fail('Lean 检查器文件缺失');
  };
  const toolchainHashes = Object.fromEntries(await Promise.all(['lean', 'lake', 'checker', 'checkerModule'].map(async name => [name, digest(await readFile(await resolveBinary(binaries[name])))])));
  const base = config.workDir ?? (process.platform === 'win32' ? join(repoRoot, 'mcs-web', 'runtime', 'lean-check') : join(tmpdir(), 'mcs-lean-check'));
  await mkdir(base, { recursive: true });
  const work = await mkdtemp(join(base, 'check-'));
  const logs = [];
  try {
    for (const [file, content] of Object.entries(snapshot.files)) { await mkdir(dirname(join(work, file)), { recursive: true }); await writeFile(join(work, file), content); }
    await mkdir(join(work, '.lake'), { recursive: true });
    await symlink(await realpath(join(repoRoot, LEAN_PROJECT, '.lake', 'packages')), join(work, '.lake', 'packages'), process.platform === 'win32' ? 'junction' : 'dir');
    await writeFile(join(work, 'MCSReplayRunner.lean'), REPLAY_RUNNER);
    let parsed = null, outputBytes = 0;
    let env = binaries.env;
    const captureArgs = ['env', process.execPath, '-e', `const keys=${JSON.stringify(LEAN_ENV_KEYS)}; const values=Object.fromEntries(keys.map(k=>[k,process.env[k]??null])); process.stdout.write(JSON.stringify(values));`];
    const buildCommands = [{ command: binaries.lake, args: captureArgs, label: 'lake env <node> (capture Lean environment)', captureEnv: true }];
    for (const module of [...LEAN_POLICY.replayModules, 'MCS']) {
      const path = module.replaceAll('.', '/'), output = join(work, '.lake/build/lib/lean', path + '.olean');
      await mkdir(dirname(output), { recursive: true });
      buildCommands.push({ command: binaries.lean, args: ['-j', '1', path + '.lean', '-o', output], label: `lean -j 1 ${path}.lean -o <verification-workspace>/.lake/build/lib/lean/${path}.olean` });
    }
    const stages = [ ['build', buildCommands], ['kernel_replay', [{ command: binaries.lean, args: ['-j', '1', 'MCSReplayRunner.lean'], label: 'lean -j 1 MCSReplayRunner.lean (LeanChecker.replayFromImports, sequential)' }]], ['target_audit', [{ command: binaries.lean, args: ['-j', '1', 'MCS/Audit.lean'], label: 'lean -j 1 MCS/Audit.lean' }]] ];
    for (const [stage, commands] of stages) {
      await onStage(stage);
      const log = { stage, exitCode: 0, stdout: '', stderr: '', commands: commands.map(command => command.label) }; logs.push(log);
      for (const { command, args, captureEnv } of commands) {
      const remaining = (config.timeoutMs ?? 120000) - (Date.now() - started);
      if (remaining <= 0) throw fail('Lean 检查超时', 408, CODES.EVIDENCE_RESOURCE);
      const out = await runLeanProcess(command, args, { cwd: work, signal, timeoutMs: remaining, maxOutputBytes: (config.maxOutputBytes ?? 4 * 1024 * 1024) - outputBytes, env });
      outputBytes += out.bytes;
      const clean = value => value.replaceAll(work, '<verification-workspace>').replaceAll(repoRoot, '<repository>');
      log.exitCode = out.code; log.stdout += captureEnv ? '' : clean(out.stdout); log.stderr += clean(out.stderr);
      if (out.reason === 'cancelled') throw fail('Lean 任务已取消', 409, CODES.JOB_CANCELLED);
      if (out.reason) throw new McsError(CODES.EVIDENCE_RESOURCE, `Lean 检查资源不足：${out.reason}`, 408, { leanReason: out.reason });
      if (out.code !== 0) return report('failed', null);
      if (captureEnv) {
        let captured;
        try { captured = JSON.parse(out.stdout); } catch { return report('corrupt', null); }
        if (!captured || LEAN_ENV_KEYS.some(key => captured[key] !== null && typeof captured[key] !== 'string')) return report('corrupt', null);
        env = { ...binaries.env };
        for (const key of LEAN_ENV_KEYS) { if (captured[key] === null) delete env[key]; else env[key] = captured[key]; }
        // Always import the checker from the pinned native toolchain, ahead of package paths.
        env.LEAN_PATH = `${dirname(binaries.checkerModule)}${process.platform === 'win32' ? ';' : ':'}${env.LEAN_PATH ?? ''}`;
      }
      if (stage === 'kernel_replay' && !hasCompleteLeanReplay(out.stdout)) return report('corrupt', null);
      if (stage === 'target_audit') {
        const lines = out.stdout.split(/\r?\n/).filter(line => line.startsWith('MCS_AUDIT_JSON:'));
        if (lines.length !== 1) return report('corrupt', null);
        try { parsed = JSON.parse(lines[0].slice('MCS_AUDIT_JSON:'.length)); } catch { return report('corrupt', null); }
      }
      }
    }
    let targets;
    try { targets = validateLeanAudit(parsed, JSON.parse(snapshot.files['registrations.json'])); } catch (error) { return sealReport({ ...report('failed', parsed), message: error.message }); }
    await validateDependencies(repoRoot, snapshot, binaries, signal);
    for (const name of Object.keys(toolchainHashes)) if (digest(await readFile(await resolveBinary(binaries[name]))) !== toolchainHashes[name]) throw fail('Lean 工具链在检查期间发生变化');
    if (Date.now() - started > (config.timeoutMs ?? 120000)) throw fail('Lean 检查超时', 408, CODES.EVIDENCE_RESOURCE);
    return sealReport({ ...report('passed', parsed), targets: targets.filter(t => snapshot.registration.targets.includes(t.declaration.replace('MCS.Verified.', ''))) });
  } finally {
    // The root is a task-created directory; remove the dependency junction before recursive cleanup.
    if (!resolve(work).startsWith(resolve(base) + sep)) throw fail('Lean 临时目录越界', 500);
    if (process.platform === 'win32' && existsSync(join(work, '.lake', 'packages'))) await rmdir(join(work, '.lake', 'packages'));
    else await rm(join(work, '.lake', 'packages'), { force: true }).catch(() => {});
    await rm(work, { recursive: true, force: true });
  }
  function report(status, audit) {
    return sealReport({ schema: 'mcs-lean-report/1', backend: 'lean4', status, evidenceId: snapshot.registration.evidenceId, registrationId: snapshot.registration.id, inputSha256: snapshot.inputSha256, sourceHashes: snapshot.hashes, originalHashes: snapshot.originals, objectBindings: snapshot.objectBindings, policyVersion: LEAN_POLICY.version, checkerSourceSha256: snapshot.checkerSourceSha256, toolchainHashes, checker: `lean-${LEAN_VERSION}/LeanChecker.replayFromImports`, checkerVerified: false, kernelReplayed: status === 'passed', replayMode: LEAN_POLICY.replayMode, leanVersion: LEAN_VERSION, mathlibRevision: MATHLIB_REV, ranAt: new Date().toISOString(), durationMs: Date.now() - started, logsSha256: digest(logs), logs, audit });
  }
  function sealReport(value) { const { receiptSha256: _old, ...receipt } = value; return { ...receipt, receiptSha256: digest(receipt) }; }
}
