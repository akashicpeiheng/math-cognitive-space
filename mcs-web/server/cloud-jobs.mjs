import { randomUUID } from 'node:crypto';
import { McsError, CODES } from '../shared/errors.mjs';
const now = () => new Date().toISOString();
const terminal = new Set(['done', 'error', 'cancelled']);
const group = kind => kind === 'lean' ? 'lean' : 'compute';
function view(row) { return { ...JSON.parse(row.job_json), status: row.status, owner: row.owner_id, leaseToken: row.lease_token }; }

/** PostgreSQL is the task ledger; Queues delivers IDs, and leases prevent duplicate effects. */
export class CloudJobs {
  constructor({ driver, publish, execute, getOntology, getRevision = () => null, onResult = async () => {}, maxQueued = 20 }) {
    Object.assign(this, { driver, publishMessage: publish, execute, getOntology, getRevision, onResult, maxQueued });
  }
  async init() {
    await this.driver.exec('CREATE TABLE IF NOT EXISTS cloud_jobs (id TEXT PRIMARY KEY, kind TEXT NOT NULL, owner_id TEXT, status TEXT NOT NULL, job_json TEXT NOT NULL, lease_token TEXT, lease_until TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL, published_at TEXT); CREATE INDEX IF NOT EXISTS idx_cloud_jobs_status ON cloud_jobs(status,created_at); CREATE INDEX IF NOT EXISTS idx_cloud_jobs_owner ON cloud_jobs(owner_id,status)');
    return this;
  }
  async row(id) {
    const row = await this.driver.get('SELECT * FROM cloud_jobs WHERE id=?', [id]);
    if (!row) throw new McsError(CODES.NOT_FOUND, '无法解析云端任务。', 404);
    return row;
  }
  async run(request, { kind = 'plan', owner = null, ontologyVersion = this.getOntology()?.version ?? null } = {}) {
    await this.recover();
    const createdAt = now(), id = `job-${randomUUID()}`;
    const job = { id, kind, owner, request, ontologyVersion, extensionRevision: this.getRevision(), status: 'queued', createdAt, startedAt: null, finishedAt: null, result: null, error: null };
    await this.driver.transaction(async () => {
      await this.driver.get('SELECT pg_advisory_xact_lock(1725487021, 4)');
      const pending = await this.driver.all("SELECT kind,owner_id,status FROM cloud_jobs WHERE status IN ('queued','running')");
      if (pending.filter(row => row.status === 'queued' && group(row.kind) === group(kind)).length >= this.maxQueued) throw new McsError(CODES.RESOURCE_EXHAUSTED, '云端任务队列已满，请稍后重试。', 429);
      if (owner && pending.some(row => row.owner_id === owner && group(row.kind) === group(kind))) throw new McsError(CODES.RESOURCE_EXHAUSTED, '你已有同类任务在运行或排队，请等它完成或取消。', 429);
      await this.driver.run('INSERT INTO cloud_jobs(id,kind,owner_id,status,job_json,created_at,updated_at) VALUES (?,?,?,?,?,?,?)', [id, kind, owner, 'queued', JSON.stringify(job), createdAt, createdAt]);
    });
    try { await this.publish(id); }
    catch {
      job.status = 'error'; job.finishedAt = now(); job.error = { code: CODES.EVIDENCE_RESOURCE, message: '云端队列暂时不可用，任务未被接受，请稍后重试。' };
      await this.driver.run("UPDATE cloud_jobs SET status='error',job_json=?,updated_at=? WHERE id=? AND status='queued'", [JSON.stringify(job), now(), id]);
      throw new McsError(CODES.EVIDENCE_RESOURCE, job.error.message, 503);
    }
    return { id, kind, status: 'queued', createdAt, ontologyVersion, queuePosition: (await this.get(id)).queuePosition };
  }
  async publish(id) {
    await this.publishMessage({ id }, { idempotencyKey: id, retentionSeconds: 604800 });
    await this.driver.run('UPDATE cloud_jobs SET published_at=? WHERE id=?', [now(), id]);
  }
  async get(id) {
    const row = await this.row(id);
    // An interrupted producer may have committed its outbox row before publishing.
    if (row.status === 'queued' && !row.published_at) await this.publish(id);
    const job = view(row);
    const count = row.status === 'queued' ? await this.driver.get("SELECT COUNT(*) AS count FROM cloud_jobs WHERE status='queued' AND created_at<=?", [row.created_at]) : null;
    const { leaseToken, extensionRevision, sandboxName, ...publicJob } = job;
    return { ...publicJob, queuePosition: Number(count?.count ?? 0) };
  }
  async stats(kind = null) {
    await this.recover();
    const rows = await this.driver.all("SELECT kind,status,COUNT(*) AS count FROM cloud_jobs WHERE status IN ('queued','running') GROUP BY kind,status");
    const selected = rows.filter(row => kind ? row.kind === kind : row.kind !== 'lean');
    return { running: selected.filter(row => row.status === 'running').reduce((n,row) => n + Number(row.count), 0), queued: selected.filter(row => row.status === 'queued').reduce((n,row) => n + Number(row.count), 0), maxConcurrent: 1, maxQueued: this.maxQueued, persistent: true };
  }
  async cancel(id) {
    const row = await this.row(id), job = view(row);
    if (terminal.has(row.status)) return { id, status: row.status, cancelled: false };
    job.status = 'cancelled'; job.finishedAt = now();
    const result = await this.driver.run("UPDATE cloud_jobs SET status='cancelled',job_json=?,updated_at=? WHERE id=? AND status IN ('queued','running')", [JSON.stringify(job), now(), id]);
    return { id, status: result.changes ? 'cancelled' : (await this.row(id)).status, cancelled: result.changes === 1 };
  }
  onComplete() { /* Cross-instance readers settle dependent records from this durable ledger. */ }
  close() { /* Another function owns execution; a reader stopping must not interrupt it. */ }
  async recover() {
    if (Date.now() - (this.lastRecovery ?? 0) < 60000) return;
    this.lastRecovery = Date.now();
    const expired = await this.driver.all("SELECT * FROM cloud_jobs WHERE status IN ('queued','running') AND created_at<?", [new Date(Date.now() - 604800000).toISOString()]);
    for (const row of expired) {
      const job = view(row);
      Object.assign(job, { status: 'error', finishedAt: now(), error: { code: CODES.EVIDENCE_RESOURCE, message: '任务已超过队列保留期限，请重新提交。' } });
      await this.driver.run("UPDATE cloud_jobs SET status='error',job_json=?,updated_at=? WHERE id=? AND status IN ('queued','running')", [JSON.stringify(job), now(), row.id]);
    }
    const unpublished = await this.driver.all("SELECT id FROM cloud_jobs WHERE status='queued' AND published_at IS NULL ORDER BY created_at LIMIT 20");
    for (const row of unpublished) { try { await this.publish(row.id); } catch { /* Preserve the outbox for a later retry. */ } }
  }
  async consume(id) {
    let job, token;
    await this.driver.transaction(async () => {
      await this.driver.get('SELECT pg_advisory_xact_lock(1725487021, 4)');
      const row = await this.row(id);
      if (terminal.has(row.status)) return;
      const running = await this.driver.all("SELECT id,kind,lease_until FROM cloud_jobs WHERE status='running' AND lease_until>?", [now()]);
      const busy = running.some(other => group(other.kind) === group(row.kind));
      if (busy) throw new McsError(CODES.RESOURCE_EXHAUSTED, '云端任务正在运行，消息稍后重试。', 429);
      token = randomUUID(); job = view(row); job.startedAt = now(); job.status = 'running'; job.error = null;
      await this.driver.run("UPDATE cloud_jobs SET status='running',job_json=?,lease_token=?,lease_until=?,updated_at=? WHERE id=?", [JSON.stringify(job), token, new Date(Date.now()+180000).toISOString(), now(), id]);
    });
    if (!job) return;
    const controller = new AbortController();
    let heartbeatBusy = false, timedOut = false;
    const heartbeat = setInterval(async () => {
      if (heartbeatBusy) return; heartbeatBusy = true;
      try {
        const lease = await this.driver.run("UPDATE cloud_jobs SET lease_until=? WHERE id=? AND lease_token=? AND status='running'", [new Date(Date.now()+180000).toISOString(), id, token]);
        if (!lease.changes) controller.abort();
      } catch { controller.abort(); }
      finally { heartbeatBusy = false; }
    }, 2000);
    heartbeat.unref?.();
    const timeoutMs = job.kind === 'lean' ? 300000 : job.kind === 'discovery' ? 120000 : 60000;
    const timer = setTimeout(() => { timedOut = true; controller.abort(); }, timeoutMs); timer.unref?.();
    try {
      const result = await this.execute(job, { signal: controller.signal, timeoutMs, onStart: async name => {
        job.sandboxName = name;
        await this.driver.run("UPDATE cloud_jobs SET job_json=? WHERE id=? AND lease_token=? AND status='running'", [JSON.stringify(job), id, token]);
      } });
      await this.driver.transaction(async () => {
        const row = await this.driver.get('SELECT * FROM cloud_jobs WHERE id=? FOR UPDATE', [id]);
        if (row.status !== 'running' || row.lease_token !== token) return;
        await this.onResult(job, result);
        job.result = result; job.status = 'done'; job.finishedAt = now();
        await this.driver.run("UPDATE cloud_jobs SET status='done',job_json=?,lease_token=NULL,lease_until=NULL,updated_at=? WHERE id=? AND lease_token=? AND status='running'", [JSON.stringify(job), now(), id, token]);
      });
    } catch (error) {
      const row = await this.row(id);
      if (row.status === 'running' && row.lease_token === token) {
        job.status = 'error'; job.finishedAt = now(); job.error = { code: timedOut ? CODES.EVIDENCE_RESOURCE : error.code ?? CODES.INTERNAL, message: timedOut ? '云端任务超过时限，执行环境已停止。' : error.message };
        await this.driver.run("UPDATE cloud_jobs SET status='error',job_json=?,lease_token=NULL,lease_until=NULL,updated_at=? WHERE id=? AND lease_token=? AND status='running'", [JSON.stringify(job), now(), id, token]);
      }
    } finally { clearInterval(heartbeat); clearTimeout(timer); }
  }
}
