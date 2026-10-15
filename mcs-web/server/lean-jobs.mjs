import { randomUUID } from 'node:crypto';
import { McsError, CODES } from '../shared/errors.mjs';
import { captureLeanSnapshot, checkLeanSnapshot, leanCapabilities, readLeanRegistry, validateLeanReport, digest } from '../core/lean.mjs';

const TERMINAL = new Set(['completed', 'error', 'cancelled', 'interrupted']);
const now = () => new Date().toISOString();

/** D-layer verification history uses the shared SQL driver, not learner events. */
export class LeanVerificationStore {
  constructor(driver) { this.driver = driver; }
  async migrate() {
    await this.driver.exec('CREATE TABLE IF NOT EXISTS verification_runs (run_id TEXT PRIMARY KEY, owner_id TEXT NOT NULL, status TEXT NOT NULL, record_json TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL)');
    await this.driver.exec('CREATE INDEX IF NOT EXISTS idx_verification_owner ON verification_runs(owner_id, created_at)');
  }
  async save(job) {
    const record = { ...job, logSummarySha256: digest({ stage: job.stage ?? null, error: job.error ?? null, resultLogsSha256: job.result?.logsSha256 ?? null }) };
    await this.driver.run('INSERT INTO verification_runs(run_id, owner_id, status, record_json, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT(run_id) DO UPDATE SET status=excluded.status, record_json=excluded.record_json, updated_at=excluded.updated_at', [job.id, job.owner, job.status, JSON.stringify(record), job.createdAt, now()]);
  }
  async get(id) {
    const row = await this.driver.get('SELECT record_json FROM verification_runs WHERE run_id=?', [id]);
    return row ? JSON.parse(row.record_json) : null;
  }
  async interruptPending() {
    const rows = await this.driver.all("SELECT record_json FROM verification_runs WHERE status IN ('queued', 'running')");
    for (const row of rows) {
      const job = JSON.parse(row.record_json);
      await this.save({ ...job, snapshot: null, status: 'interrupted', finishedAt: now(), error: { code: CODES.EVIDENCE_RESOURCE, message: '服务重启，检查未完成；请重新发起。' } });
    }
  }
}

export class LeanJobManager {
  constructor({ driver, repoRoot, config = {}, check = checkLeanSnapshot, capabilities = leanCapabilities }) {
    this.store = new LeanVerificationStore(driver);
    this.repoRoot = repoRoot; this.config = config; this.check = check; this.capabilities = capabilities;
    this.queue = []; this.active = new Map(); this.closed = false; this.serial = Promise.resolve();
    this.maxConcurrent = Math.max(1, Number(config.maxConcurrent ?? 1));
    this.maxQueued = Math.max(0, Number(config.maxQueued ?? 20));
    this.pending = new Set();
  }
  async init() { await this.store.migrate(); await this.store.interruptPending(); return this; }
  lock(fn) { const next = this.serial.then(fn); this.serial = next.catch(() => {}); return next; }
  stats() { return { running: this.active.size, queued: this.queue.length, maxConcurrent: this.maxConcurrent, maxQueued: this.maxQueued }; }
  async run({ evidenceId, ontologyVersion, owner = 'local' }) {
    if (this.closed || this.config.enabled === false) throw new McsError(CODES.EVIDENCE_UNSUPPORTED, 'Lean 重放已关闭；仍可阅读已发布材料。', 503);
    const ready = await this.capabilities(this.repoRoot, this.config);
    if (!ready.ready) throw new McsError(CODES.EVIDENCE_UNSUPPORTED, ready.reason ?? 'Lean 尚未就绪', 503);
    const snapshot = await captureLeanSnapshot(this.repoRoot, evidenceId);
    if (!snapshot.sealed) throw new McsError(CODES.VERSION_CONFLICT, 'Lean 登记输入已经变更', 409);
    return this.lock(async () => {
      if (this.closed) throw new McsError(CODES.EVIDENCE_UNSUPPORTED, '服务正在关闭', 503);
      if (this.queue.length >= this.maxQueued && this.active.size >= this.maxConcurrent) throw new McsError(CODES.RESOURCE_EXHAUSTED, 'Lean 检查队列已满', 429);
      if (this.queue.some(job => job.owner === owner)) throw new McsError(CODES.RESOURCE_EXHAUSTED, '你已有一个 Lean 检查正在排队', 429);
      const job = { id: `lean-${randomUUID()}`, owner, status: 'queued', registrationId: snapshot.registration.id, evidenceId: snapshot.registration.evidenceId, ontologyVersion, inputSha256: snapshot.inputSha256, snapshot, stage: null, result: null, error: null, createdAt: now() };
      await this.store.save(job);
      this.queue.push(job);
      this.pump();
      return this.publicJob(job);
    });
  }
  publicJob(job) { const { owner, snapshot, ...view } = job; return { ...view, queuePosition: job.status === 'queued' ? this.queue.findIndex(j => j.id === job.id) + 1 : 0 }; }
  async get(id, owner = 'local') {
    const job = await this.store.get(id);
    if (!job || job.owner !== owner) throw new McsError(CODES.NOT_FOUND, 'Lean 检查任务不存在', 404);
    if (job.result?.status === 'passed') {
      try {
        const registry = await readLeanRegistry(this.repoRoot);
        validateLeanReport(job.result, registry, registry.registrations.find(r => r.id === job.registrationId));
      } catch { job.result = { ...job.result, status: 'corrupt', kernelReplayed: false }; }
    }
    let freshness = 'stale';
    try { freshness = (await captureLeanSnapshot(this.repoRoot, job.registrationId)).inputSha256 === job.inputSha256 ? 'current' : 'stale'; } catch { /* historical input no longer registered */ }
    return { ...this.publicJob(job), freshness };
  }
  async cancel(id, owner = 'local') {
    return this.lock(async () => {
      const job = await this.store.get(id);
      if (!job || job.owner !== owner) throw new McsError(CODES.NOT_FOUND, 'Lean 检查任务不存在', 404);
      if (TERMINAL.has(job.status)) return this.publicJob(job);
      const active = this.active.get(id);
      if (active) { active.cancelled = true; active.controller.abort(); await active.promise; }
      else {
        this.queue = this.queue.filter(j => j.id !== id);
        await this.store.save({ ...job, snapshot: null, status: 'cancelled', finishedAt: now() });
      }
      return this.get(id, owner);
    });
  }
  pump() {
    while (!this.closed && this.queue.length && this.active.size < this.maxConcurrent) {
      const index = this.queue.findIndex(job => ![...this.active.values()].some(entry => entry.job.owner === job.owner));
      if (index < 0) break;
      const [job] = this.queue.splice(index, 1);
      const entry = { job, controller: new AbortController(), cancelled: false, promise: null };
      this.active.set(job.id, entry);
      entry.promise = this.execute(entry);
      this.pending.add(entry.promise);
      entry.promise.finally(() => this.pending.delete(entry.promise)).catch(() => {});
    }
  }
  async execute(entry) {
    const { job, controller } = entry;
    job.status = 'running'; job.startedAt = now();
    let timedOut = false;
    const timer = setTimeout(() => { timedOut = true; controller.abort(); }, this.config.timeoutMs ?? 120000);
    timer.unref?.();
    try {
      await this.store.save(job);
      const result = await this.check(this.repoRoot, job.snapshot, { signal: controller.signal, config: this.config, onStage: async stage => { job.stage = stage; await this.store.save(job); } });
      if (controller.signal.aborted) throw new McsError(CODES.JOB_CANCELLED, '检查已中止', 409);
      job.result = result; job.status = 'completed';
    } catch (error) {
      job.status = this.closed ? 'interrupted' : entry.cancelled ? 'cancelled' : 'error';
      const reason = this.closed ? 'interrupted' : entry.cancelled ? 'cancelled' : timedOut ? 'timeout' : error.details?.leanReason ?? (/版本不匹配/.test(error.message) ? 'version_mismatch' : /工具链未安装/.test(error.message) ? 'toolchain_missing' : /依赖内容/.test(error.message) ? 'dependency_changed' : /未预热/.test(error.message) ? 'dependency_missing' : 'environment');
      job.error = { code: timedOut ? CODES.EVIDENCE_RESOURCE : error.code ?? CODES.INTERNAL, reason, message: timedOut ? 'Lean 检查超过时限，已终止检查进程树。' : error.message };
    } finally {
      clearTimeout(timer); job.finishedAt = now(); job.snapshot = null;
      try { await this.store.save(job); }
      finally { this.active.delete(job.id); this.pump(); }
    }
  }
  async close() {
    this.closed = true;
    await this.lock(async () => {
      for (const job of this.queue.splice(0)) await this.store.save({ ...job, snapshot: null, status: 'interrupted', finishedAt: now(), error: { code: CODES.EVIDENCE_RESOURCE, message: '服务停止，任务尚未执行。' } });
      for (const entry of this.active.values()) entry.controller.abort();
    });
    await Promise.allSettled([...this.pending]);
  }
}
