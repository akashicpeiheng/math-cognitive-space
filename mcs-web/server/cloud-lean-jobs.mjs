import { captureLeanSnapshot, readLeanRegistry, validateLeanReport } from '../core/lean.mjs';
import { LeanVerificationStore } from './lean-jobs.mjs';
import { McsError, CODES } from '../shared/errors.mjs';

export class CloudLeanJobs {
  constructor({ jobs, executor, driver, repoRoot }) {
    Object.assign(this, { jobs, executor, repoRoot });
    this.history = new LeanVerificationStore(driver);
  }
  async capabilities() {
    // Validate the actual Linux image, including sealed sources and dependency commits.
    if (!this.readyPromise) this.readyPromise = this.executor.run({ kind: 'lean-capabilities', request: {} }).catch(error => { this.readyPromise = null; throw error; });
    return this.readyPromise;
  }
  stats() { return this.jobs.stats('lean'); }
  async run({ evidenceId, ontologyVersion, owner = 'local' }) {
    const capability = await this.capabilities();
    if (!capability.ready) throw new McsError(CODES.EVIDENCE_UNSUPPORTED, capability.reason ?? '云端 Lean 工具链尚未就绪。', 503);
    const snapshot = await captureLeanSnapshot(this.repoRoot, evidenceId);
    if (!snapshot.sealed) throw new McsError(CODES.VERSION_CONFLICT, 'Lean 登记输入已经变更。', 409);
    const job = await this.jobs.run({ snapshot }, { kind: 'lean', owner, ontologyVersion });
    return this.get(job.id, owner);
  }
  async get(id, owner = 'local') {
    let job;
    try { job = await this.jobs.get(id); }
    catch (error) { if (error.status !== 404) throw error; job = await this.history.get(id); }
    if (!job || job.owner !== owner || (job.kind && job.kind !== 'lean')) throw new McsError(CODES.NOT_FOUND, 'Lean 检查任务不存在。', 404);
    const snapshot = job.request?.snapshot;
    const registrationId = snapshot?.registration?.id ?? job.registrationId;
    const inputSha256 = snapshot?.inputSha256 ?? job.inputSha256;
    let result = job.result;
    if (result?.status === 'passed') {
      try {
        const registry = await readLeanRegistry(this.repoRoot);
        validateLeanReport(result, registry, registry.registrations.find(record => record.id === registrationId));
      } catch { result = { ...result, status: 'corrupt', kernelReplayed: false }; }
    }
    let freshness = 'stale';
    try { if ((await captureLeanSnapshot(this.repoRoot, registrationId)).inputSha256 === inputSha256) freshness = 'current'; } catch { /* Historical input remains a historical record. */ }
    return { id, status: job.status === 'done' ? 'completed' : job.status, registrationId, evidenceId: snapshot?.registration?.evidenceId ?? job.evidenceId, inputSha256, ontologyVersion: job.ontologyVersion, createdAt: job.createdAt, startedAt: job.startedAt, finishedAt: job.finishedAt, queuePosition: job.queuePosition ?? 0, result, error: job.error, freshness };
  }
  async cancel(id, owner = 'local') {
    const job = await this.get(id, owner);
    if (!['queued', 'running'].includes(job.status)) return job;
    await this.jobs.cancel(id);
    return this.get(id, owner);
  }
  close() { /* Durable work belongs to the queue, not this API instance. */ }
}
