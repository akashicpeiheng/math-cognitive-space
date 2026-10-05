import { Worker } from 'node:worker_threads';
import { randomUUID } from 'node:crypto';
import { McsError, CODES } from '../shared/errors.mjs';

/**
 * 规划任务管理器（有界队列 + 每账号配额 + 归属 + 超时）。
 *
 * ## 为什么任务要**固定本体版本**（P1-7，2026-10 改）
 *
 * 从前工作线程只拿到 `dataDir`，自己去读一份基础数据。问题不在「多读一份」，而在
 * **读的是另一份事实**：主进程已经切到「基础 + 扩展包」的新版本，线程却还在拿基础数据算，
 * 于是同一时刻两个接口回答两个版本，谁都不算错——这正是「发布成功了，规划却看不到新节点」。
 *
 * 现在改成：发起任务时**取一次当前快照的 `version`**（与发起请求的那个请求同一份），
 * 把它交给线程；线程用同一份快照复核版本，对不上就报 `ONTOLOGY_VERSION_CONFLICT`，
 * 绝不用另一份数据算出一个「看起来对」的规划。结果里也带上 `ontologyVersion`，
 * 事后再看也能知道这条规划是按哪一版算的。
 *
 * `ontologyVersion` 允许调用方显式传入（例如重放历史任务）；缺省取 `getOntology()` 的当前值。
 * 拿不到版本（没有接快照源）时不假装知道：`null` 会一路传到线程，线程会如实说明它没有版本约束。
 *
 * ## 为什么要有队列与配额（2026-10 公网发布前加）
 *
 * 本机单人用时，「发一个任务就起一个工作线程」是对的：没有别人，资源都是自己的。
 * 放到公网就是另一回事——任何人循环 POST 就能把 CPU 吃满，谁也用不了。
 * 所以这里补上四件事，并且**宁可拒绝，也不排队到看不见**：
 *
 * 1. 全站并发上限 `maxConcurrent`（默认 1）：同时真正在算的任务数；
 * 2. 全站队列上限 `maxQueued`（默认 20）：排满之后新任务**当场**报
 *    `RESOURCE_EXHAUSTED`，而不是接受下来让用户等一个永远不开始的号；
 * 3. 每账号配额 `perUserRunning` / `perUserQueued`（默认各 1）：一个人不能占满队列；
 * 4. 单任务时长上限 `maxDurationMs`（默认 60 秒）：超时**终止线程**并如实报错，
 *    不留一个跑到天荒地老的任务占着并发位。
 *
 * 状态机：`queued → running → done | error | cancelled`。取消对两种状态都有效
 * （排队中直接从队列拿走，运行中终止线程），取消之后队列立刻推进。
 *
 * 已知边界（如实写明，不含糊）：任务表在内存里，进程重启后任务 id 全部失效，
 * `get` / `cancel` 会得到 404。也就是说重启**不会**把旧任务标成「中断」——
 * 它只是不存在了。要跨重启保留任务历史，得把这张表也持久化，见发布说明「已知限制」。
 */
export class JobManager {
  constructor({
    dataDir,
    extensionsDir = null,
    repoRoot = null,
    getOntology = null,
    maxJobs = 100,
    maxConcurrent = 1,
    maxQueued = 20,
    perUserRunning = 1,
    perUserQueued = 1,
    maxDurationMs = 60000,
    /*
     * 工作线程工厂。缺省就是真实线程；测试用它注入一个可控的假线程，
     * 好把「排队 / 并发 / 取消」这些**时序**断言写死，而不是与真实线程的
     * 完成时机赛跑（那种测试会时绿时红，比没有测试更糟）。
     */
    spawnWorker = null,
  } = {}) {
    this.dataDir = dataDir;
    this.extensionsDir = extensionsDir;
    this.repoRoot = repoRoot;
    this.getOntology = typeof getOntology === 'function' ? getOntology : null;
    this.maxJobs = maxJobs;
    this.maxConcurrent = Math.max(1, Number(maxConcurrent) || 1);
    this.maxQueued = Math.max(0, Number.isFinite(Number(maxQueued)) ? Number(maxQueued) : 20);
    this.perUserRunning = Math.max(1, Number(perUserRunning) || 1);
    this.perUserQueued = Math.max(0, Number.isFinite(Number(perUserQueued)) ? Number(perUserQueued) : 1);
    this.maxDurationMs = Math.max(1000, Number(maxDurationMs) || 60000);
    this.spawnWorker = typeof spawnWorker === 'function'
      ? spawnWorker
      : (workerData) => new Worker(new URL('./plan-worker.mjs', import.meta.url), { workerData });
    this.jobs = new Map();
    this.queue = [];
  }

  /** 发起任务那一刻的本体版本；没有快照源就返回 null（不猜）。 */
  currentOntologyVersion() {
    if (!this.getOntology) return null;
    try {
      return this.getOntology()?.version ?? null;
    } catch {
      // 快照不可用时不在这一层失败：任务照发，版本记 null，由线程与调用方如实处理。
      return null;
    }
  }

  /** 队列现状。健康检查与界面用它解释「为什么还没开始」，不用猜。 */
  stats() {
    let running = 0;
    for (const job of this.jobs.values()) if (job.status === 'running') running += 1;
    return {
      running,
      queued: this.queue.length,
      total: this.jobs.size,
      maxConcurrent: this.maxConcurrent,
      maxQueued: this.maxQueued,
      perUserRunning: this.perUserRunning,
      perUserQueued: this.perUserQueued,
      maxDurationMs: this.maxDurationMs,
    };
  }

  /**
   * 发起任务。超出并发 / 队列 / 账号配额时**抛错**（429），不排队到看不见。
   *
   * `owner` 是认证身份的用户 id；本机模式下为 `null`（单操作员，不记归属）。
   */
  run(request, { kind = 'plan', ontologyVersion = undefined, owner = null } = {}) {
    if (this.queue.length >= this.maxQueued) {
      throw new McsError(
        CODES.RESOURCE_EXHAUSTED,
        `任务队列已满（上限 ${this.maxQueued} 项）。请等前面的任务算完再发起。`,
        429,
        { ...this.stats() },
        true,
      );
    }
    if (owner) {
      let mineRunning = 0;
      for (const job of this.jobs.values()) if (job.status === 'running' && job.owner === owner) mineRunning += 1;
      const mineQueued = this.queue.filter((job) => job.owner === owner).length;
      if (mineRunning >= this.perUserRunning) {
        throw new McsError(CODES.RESOURCE_EXHAUSTED, '你已有一个任务在运行，请等它算完再发起。', 429, { running: mineRunning }, true);
      }
      if (mineQueued >= this.perUserQueued) {
        throw new McsError(CODES.RESOURCE_EXHAUSTED, '你已有一个任务在排队，请等它开始或取消它。', 429, { queued: mineQueued }, true);
      }
    }

    const id = `job-${randomUUID()}`;
    const pinnedVersion = ontologyVersion === undefined ? this.currentOntologyVersion() : (ontologyVersion ?? null);
    const job = {
      id,
      kind,
      status: 'queued',
      owner,
      createdAt: new Date().toISOString(),
      request,
      ontologyVersion: pinnedVersion,
      result: null,
      error: null,
    };
    this.jobs.set(id, job);
    this.queue.push(job);
    this.prune();
    this.pump();
    return {
      id,
      kind,
      status: job.status,
      createdAt: job.createdAt,
      ontologyVersion: pinnedVersion,
      queuePosition: job.status === 'queued' ? Math.max(1, this.queue.indexOf(job) + 1) : 0,
    };
  }

  /** 有空位就把队首启动起来；一次调用可以推进多个（并发上限 > 1 时）。 */
  pump() {
    while (this.queue.length) {
      let running = 0;
      for (const job of this.jobs.values()) if (job.status === 'running') running += 1;
      if (running >= this.maxConcurrent) return;
      const job = this.queue.shift();
      if (!job || job.status !== 'queued') continue;
      this.start(job);
    }
  }

  start(job) {
    job.status = 'running';
    job.startedAt = new Date().toISOString();
    const worker = this.spawnWorker({
      dataDir: this.dataDir,
      extensionsDir: this.extensionsDir,
      repoRoot: this.repoRoot,
      request: job.request,
      kind: job.kind,
      ontologyVersion: job.ontologyVersion,
      owner: job.owner,
    });
    job.worker = worker;
    /*
     * 超时用**终止线程**落实，而不是只改一个状态字段：只改字段的话，那个线程还在
     * 占着 CPU 与并发位，界面看到的是「已超时」，机器上跑的是「还在算」。
     */
    const timer = setTimeout(() => {
      if (job.status !== 'running') return;
      job.error = { code: CODES.EVIDENCE_RESOURCE, message: `任务超过 ${this.maxDurationMs} ms 未完成，已中止。` };
      const running = job.worker;
      job.worker = null;
      job.status = 'error';
      job.finishedAt = new Date().toISOString();
      running?.terminate().catch(() => {});
      this.settle();
    }, this.maxDurationMs);
    timer.unref?.();
    job.timer = timer;

    worker.on('message', (message) => {
      if (job.status !== 'running') return;
      if (message?.ok) { job.status = 'done'; job.result = message.result; }
      else { job.status = 'error'; job.error = message?.error ?? { code: CODES.INTERNAL, message: '规划工作线程返回未知错误' }; }
      job.finishedAt = new Date().toISOString();
      job.worker = null;
      worker.terminate().catch(() => {});
      this.settle();
    });
    worker.on('error', (error) => {
      if (job.status !== 'running') return;
      job.status = 'error';
      job.error = { code: CODES.INTERNAL, message: error.message };
      job.finishedAt = new Date().toISOString();
      job.worker = null;
      this.settle();
    });
    worker.on('exit', (code) => {
      if (job.status !== 'running') return;
      job.status = job.cancelled ? 'cancelled' : 'error';
      if (!job.cancelled) job.error = { code: CODES.INTERNAL, message: `规划工作线程提前退出，代码 ${code}` };
      job.finishedAt = new Date().toISOString();
      job.worker = null;
      this.settle();
    });
  }

  /** 任务结束时统一收尾：清定时器、整理历史、推进队列。 */
  settle() {
    this.prune();
    this.pump();
  }

  get(id) {
    const job = this.jobs.get(id);
    if (!job) throw new McsError(CODES.NOT_FOUND, `无法解析规划任务：${id}`, 404, { job_id: id });
    return {
      id: job.id,
      kind: job.kind,
      status: job.status,
      owner: job.owner ?? null,
      createdAt: job.createdAt,
      startedAt: job.startedAt ?? null,
      finishedAt: job.finishedAt ?? null,
      ontologyVersion: job.ontologyVersion ?? null,
      result: job.result,
      error: job.error,
      request: job.request,
      queuePosition: job.status === 'queued' ? Math.max(1, this.queue.indexOf(job) + 1) : 0,
    };
  }

  cancel(id) {
    const job = this.jobs.get(id);
    if (!job) throw new McsError(CODES.NOT_FOUND, `无法解析规划任务：${id}`, 404, { job_id: id });
    if (job.status === 'queued') {
      this.queue = this.queue.filter((item) => item !== job);
      job.status = 'cancelled';
      job.finishedAt = new Date().toISOString();
      this.settle();
      return { id, status: 'cancelled', cancelled: true };
    }
    if (job.status !== 'running') return { id, status: job.status, cancelled: false };
    job.cancelled = true;
    job.status = 'cancelled';
    job.finishedAt = new Date().toISOString();
    const worker = job.worker;
    job.worker = null;
    worker?.terminate().catch(() => {});
    this.settle();
    return { id, status: 'cancelled', cancelled: true };
  }

  prune() {
    if (this.jobs.size <= this.maxJobs) return;
    const finished = [...this.jobs.values()].filter((job) => job.status !== 'running' && job.status !== 'queued').sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    while (this.jobs.size > this.maxJobs && finished.length) this.jobs.delete(finished.shift().id);
  }

  close() {
    for (const job of this.jobs.values()) {
      if (job.timer) clearTimeout(job.timer);
      job.worker?.terminate().catch(() => {});
    }
    this.jobs.clear();
    this.queue = [];
  }
}
