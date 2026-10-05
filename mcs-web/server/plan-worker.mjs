import { parentPort, workerData } from 'node:worker_threads';
import { McsError, CODES } from '../shared/errors.mjs';
import { createOntologySource } from './snapshot.mjs';
import { makePlanner } from '../core/planner.mjs';

/*
 * 规划工作线程。
 *
 * ## 它必须用**发起任务时那一版**本体（P1-7，2026-10 改）
 *
 * 从前这里 `loadOntology({ dataDir })` 自己读一份基础数据：主进程已经切到
 * 「基础 + 当前扩展包」，线程却按基础数据算。现在改成按主进程同一条规则建快照源
 * （`createOntologySource`：基础 + 激活的扩展包），再核对版本：
 *
 * - `workerData.ontologyVersion` 是发起任务时固定的版本；
 * - 对不上（发布事务正在切、盘上的包被换过、线程读到的是另一份）→ 报
 *   `ONTOLOGY_VERSION_CONFLICT`，**不用另一份数据算出一个「看起来对」的规划**；
 * - 主进程没接快照源（`ontologyVersion` 为 null）时如实说明「本次任务没有版本约束」，
 *   结果里仍然带上实际用的版本，便于事后核对。
 */
try {
  const expectedVersion = workerData.ontologyVersion ?? null;
  const source = await createOntologySource({
    dataDir: workerData.dataDir,
    extensionsDir: workerData.extensionsDir ?? null,
    repoRoot: workerData.repoRoot ?? null,
  });
  const ontology = source.current();
  const integrity = source.integrity();

  if (expectedVersion && ontology.version !== expectedVersion) {
    throw new McsError(
      CODES.VERSION_CONFLICT,
      `规划工作线程拿到的本体版本与发起任务时不一致：期望 ${expectedVersion}，实际 ${ontology.version}。` +
      '不按另一份数据出规划结果。',
      409,
      {
        expected: expectedVersion,
        actual: ontology.version,
        applied: integrity.applied,
        activeRevision: integrity.activeRevision,
      },
    );
  }
  /*
   * 扩展包没生效（完整性失败）时要**说出来**，不能让「规划成功」暗示扩展内容也在场：
   * 结果里带 integrity 摘要，调用方据此判断这条规划覆盖了哪一层知识。
   */
  const planner = makePlanner(ontology);
  const planned = workerData.kind === 'review'
    ? planner.withReview(planner.plan(workerData.request.plan), workerData.request.review)
    : planner.plan(workerData.request);
  parentPort.postMessage({
    ok: true,
    result: {
      ...planned,
      ontologyVersion: ontology.version,
      ontologyIntegrity: {
        applied: integrity.applied,
        ok: integrity.ok,
        problems: integrity.problems.length,
        warnings: integrity.warnings.length,
      },
    },
  });
} catch (error) {
  parentPort.postMessage({ ok: false, error: { code: error.code ?? 'INTERNAL', message: error.message, details: error.details ?? null } });
}
