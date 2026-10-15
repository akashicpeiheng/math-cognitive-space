import { writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { loadConfig } from '../server/config.mjs';
import { readLeanRegistry, captureLeanSnapshot, sealLeanSources, checkLeanSnapshot, leanCapabilities, leanRegistrationView, LEAN_PROJECT } from '../core/lean.mjs';

const config = loadConfig();
const command = process.argv[2] ?? 'status';
if (command === 'status') console.log(JSON.stringify(await leanCapabilities(config.repoRoot, config.lean), null, 2));
else if (command === 'ready') {
  const capabilities = await leanCapabilities(config.repoRoot, config.lean);
  const views = await Promise.all(capabilities.registrations.map(r => leanRegistrationView(config.repoRoot, r.id)));
  const ready = capabilities.ready && capabilities.enabled && views.every(v => v.freshness === 'current' && v.publishedReport?.status === 'passed');
  console.log(JSON.stringify({ ready, capabilities, reports: views.map(v => ({ id: v.id, freshness: v.freshness, status: v.publishedReport?.status ?? 'not_run' })) }, null, 2));
  if (!ready) process.exitCode = 1;
}
else if (command === 'seal') console.log(JSON.stringify(await sealLeanSources(config.repoRoot), null, 2));
else if (command === 'check' || command === 'publish-report') {
  const registry = await readLeanRegistry(config.repoRoot);
  const selected = process.argv[3] ? registry.registrations.filter(r => r.id === process.argv[3] || r.evidenceId === process.argv[3]) : registry.registrations;
  if (!selected.length) throw new Error('未知 Lean 登记');
  for (const r of selected) {
    const report = await checkLeanSnapshot(config.repoRoot, await captureLeanSnapshot(config.repoRoot, r.id), { config: config.lean, onStage: stage => console.error(`${r.id}: ${stage}`) });
    console.log(JSON.stringify(report, null, 2));
    if (report.status !== 'passed') { process.exitCode = 1; continue; }
    if (command === 'publish-report') {
      const folder = join(config.repoRoot, LEAN_PROJECT, 'reports'); await mkdir(folder, { recursive: true });
      const target = join(folder, `${r.id}.json`);
      // Keep every prior receipt; the current pointer is explicitly updated by this maintainer CLI only.
      await writeFile(join(folder, `${r.id}-${report.inputSha256}-${report.ranAt.replace(/[:.]/g, '-')}.json`), JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
      await writeFile(target, JSON.stringify(report, null, 2) + '\n');
    }
  }
} else throw new Error('用法：node scripts/lean.mjs status|ready|seal|check|publish-report [登记ID]');
