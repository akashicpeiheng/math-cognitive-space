import { execFile } from 'node:child_process';
import { mkdir, mkdtemp, readFile, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { tmpdir } from 'node:os';
import { McsError, CODES } from '../shared/errors.mjs';
import { REPO_ROOT, MCS_WEB_ROOT } from './ontology.mjs';

const KERNEL = 'mcs-foundations/validation/certification/kernel.py';

const EXIT_TO_STATUS = { 0: 'passed', 1: 'failed', 2: 'unsupported', 3: 'resource_exhausted', 4: 'corrupt' };

/**
 * 重放用的临时目录。
 *
 * 优先用仓库内 `tmp/`（与既有行为一致、便于本机排查），但它**可能不存在**
 * （`tmp/` 被版本控制排除，全新克隆里没有）或**不可写**（只读容器镜像）。
 * 两种情况下退回系统临时目录，而不是让「没装 python」这类环境故障
 * 伪装成别的错误——release 前实测：全新克隆里 `mkdtemp` 先抛 ENOENT。
 */
async function makeReplayDir() {
  const candidates = [join(MCS_WEB_ROOT, 'tmp'), join(tmpdir(), 'mcs-web-replay')];
  let lastError = null;
  for (const base of candidates) {
    try {
      await mkdir(base, { recursive: true });
      return await mkdtemp(join(base, 'replay-'));
    } catch (error) {
      lastError = error;
    }
  }
  throw new McsError(CODES.EVIDENCE_UNSUPPORTED, `无法创建重放临时目录：${lastError?.message ?? '未知原因'}`, 500);
}

/**
 * 进程退出码 → 数字；进程根本没起来时返回 null。
 *
 * 这里区分「检查器给了判定」与「检查器没跑起来」：`error.code` 是数字才是真实退出码，
 * 字符串（`ENOENT` / `EACCES` / `ETIMEDOUT`）说明进程未被执行，不能拿它换算成状态。
 * 从前缺省写成 0，于是「python 不存在」被换算成退出码 0 → `passed`，这是**伪通过**。
 */
function exitCodeOf(error) {
  if (!error) return 0;
  return typeof error.code === 'number' ? error.code : null;
}

export function certificatePath(record, repoRoot = REPO_ROOT) {
  if (!record?.certificate) throw new McsError(CODES.BAD_REQUEST, `证据 ${record?.id ?? '?'} 不是机器证书`);
  return resolve(repoRoot, record.certificate);
}

export async function replayCertificate(record, { repoRoot = REPO_ROOT, timeoutMs = 30000, python = process.env.MCS_WEB_PYTHON || 'python' } = {}) {
  const certificate = certificatePath(record, repoRoot);
  const kernel = resolve(repoRoot, KERNEL);
  if (!existsSync(certificate)) throw new McsError(CODES.UNKNOWN_EVIDENCE, `证书文件不存在：${record.certificate}`, 404);
  if (!existsSync(kernel)) throw new McsError(CODES.EVIDENCE_UNSUPPORTED, `检查器文件不存在：${KERNEL}`, 500);
  const dir = await makeReplayDir();
  const output = join(dir, 'result.json');
  try {
    const result = await new Promise((resolvePromise) => {
      execFile(python, [kernel, certificate, '--output', output], { cwd: repoRoot, timeout: timeoutMs, windowsHide: true, maxBuffer: 4 * 1024 * 1024 }, (error, stdout, stderr) => {
        resolvePromise({ error, stdout, stderr });
      });
    });
    /*
     * 环境故障与「证书被拒」分开：前者抛错，后者才返回 status。
     * python 不在、检查器不可执行都不是数学结论，绝不能报成 passed。
     */
    if (result.error && (result.error.code === 'ENOENT' || result.error.code === 'EACCES')) {
      throw new McsError(CODES.EVIDENCE_UNSUPPORTED, `无法启动检查器（${python}）：${result.error.message}`, 500, { python });
    }
    /*
     * 与 `formal/kernel.mjs` 同一口径（2026-10 修）：文件与 stdout 用同一个 tryParse，
     * 文件存在却解析不出来时判 `corrupt`，**不回退到退出码**——退出码 0 映射「通过」，
     * 于是「检查器输出损坏」会被说成「证书通过」。
     */
    const tryParse = (text) => { try { return JSON.parse(text); } catch { return null; } };
    let parsed = null;
    let corruptOutput = false;
    if (existsSync(output)) {
      parsed = tryParse(await readFile(output, 'utf8'));
      if (!parsed) corruptOutput = true;
    } else if (result.stdout) {
      parsed = tryParse(result.stdout);
    }
    const exitCode = exitCodeOf(result.error);
    const timedOut = Boolean(result.error && (result.error.killed || result.error.signal === 'SIGTERM' || result.error.code === 'ETIMEDOUT'));
    const status = timedOut
      ? 'resource_exhausted'
      : corruptOutput
        ? 'corrupt'
        : (parsed?.status ?? (exitCode !== null ? EXIT_TO_STATUS[exitCode] : null) ?? (result.error ? 'failed' : 'corrupt'));
    return {
      evidenceId: record.id,
      certificate: record.certificate,
      status,
      exitCode,
      ran: Boolean(parsed) || exitCode !== null,
      checker: record.checker ?? parsed?.checker ?? null,
      checkerVerified: false,
      scope: record.scope,
      obligations: record.obligations ?? [],
      openAssumptions: parsed?.open_hypotheses ?? record.openAssumptions ?? [],
      result: parsed,
      stderr: result.stderr ? result.stderr.slice(0, 2000) : null,
      ranAt: new Date().toISOString(),
      note: '重放结果只覆盖该证书片段；检查器本身未获形式验证，个人掌握不由此产生。',
    };
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

export function evidenceView(record) {
  return {
    id: record.id,
    kind: record.kind,
    status: record.status,
    checkStatus: record.checkStatus,
    title: record.title,
    scope: record.scope,
    nodes: record.nodes,
    certificate: record.certificate ?? null,
    checker: record.checker ?? null,
    checkerVerified: false,
    openAssumptions: record.openAssumptions ?? [],
    obligations: record.obligations ?? [],
    reference: record.reference ?? null,
    note: '正文证明、证书检查与个人掌握分开呈现；checkStatus 只说明这一份有限证书的检查结果。',
  };
}

export function evidenceSummary(ontology) {
  const records = ontology.raw.evidence;
  return {
    total: records.length,
    byKind: Object.fromEntries([...new Set(records.map((record) => record.kind))].sort().map((kind) => [kind, records.filter((record) => record.kind === kind).length])),
    byStatus: Object.fromEntries([...new Set(records.map((record) => record.status))].sort().map((status) => [status, records.filter((record) => record.status === status).length])),
    byCheckStatus: Object.fromEntries([...new Set(records.map((record) => record.checkStatus))].sort().map((status) => [status, records.filter((record) => record.checkStatus === status).length])),
    machineCertificates: records.filter((record) => record.kind === 'machine-certificate').map((record) => ({
      id: record.id,
      certificate: record.certificate,
      checker: record.checker,
      declaredCheckStatus: record.checkStatus,
      scope: record.scope,
      obligations: record.obligations ?? [],
    })),
  };
}
