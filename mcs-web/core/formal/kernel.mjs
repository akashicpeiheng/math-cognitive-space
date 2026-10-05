/**
 * 检查器调用（`core/formal/kernel.mjs`）。
 *
 * **为什么单独一层**：证书能不能过，唯一说了算的是
 * `mcs-foundations/validation/certification/kernel.py`。Node 侧无论把公式造得多漂亮，
 * 都只是「候选」；这一层负责把它交给真检查器，并把结果翻成站内口径
 * （camelCase + 明确的 status 联合）。
 *
 * 三条纪律：
 * 1. **不解释、不修补**：kernel 说 `failed` 就是 `failed`，绝不因为「看起来只是小问题」
 *    就改写成 `passed`；`kernel_formally_verified` 永远是 `false`（检查器本身未获形式验证）。
 * 2. **检查器文件哈希随结果返回**：`checkerSha256` 让「这份结论是哪一版检查器给的」
 *    可追溯——检查器改了，旧结论就失效。
 * 3. **跑不起来 ≠ 证书错**：python 不在、检查器文件缺失都抛 `McsError`（这是环境故障，
 *    不是数学结论）；只有检查器真的跑了并给出判定，才返回 status。
 */
import { execFile } from 'node:child_process';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { McsError, CODES } from '../../shared/errors.mjs';
import { KERNEL_VERSION, fileHash } from './codec.mjs';
import { REPO_ROOT, MCS_WEB_ROOT } from '../ontology.mjs';
import { certificatePath } from '../evidence.mjs';

/** 检查器在仓库里的相对路径（与 `core/evidence.mjs` 保持同一处事实）。 */
export const KERNEL_RELATIVE_PATH = 'mcs-foundations/validation/certification/kernel.py';

/** 退出码 -> 状态：kernel 自己规定的映射，不另立一套。 */
const EXIT_TO_STATUS = { 0: 'passed', 1: 'failed', 2: 'unsupported', 3: 'resource_exhausted', 4: 'corrupt' };

const TMP_BASE = join(MCS_WEB_ROOT, 'tmp', 'team', 'A');

/** 检查器文件的 sha256（失效检测用）。 */
export function kernelFileHash(repoRoot = REPO_ROOT) {
  return fileHash(resolve(repoRoot, KERNEL_RELATIVE_PATH));
}

function checkerPath(repoRoot) {
  return resolve(repoRoot, KERNEL_RELATIVE_PATH);
}

function run(python, args, { cwd, timeoutMs }) {
  return new Promise((resolvePromise) => {
    execFile(python, args, { cwd, timeout: timeoutMs, windowsHide: true, maxBuffer: 8 * 1024 * 1024 }, (error, stdout, stderr) => {
      resolvePromise({ error, stdout, stderr });
    });
  });
}

function exitCodeOf(error) {
  if (!error) return 0;
  return typeof error.code === 'number' ? error.code : null;
}

/**
 * 把一份证书交给检查器，返回站内口径的结果。
 *
 * 返回字段与规格 §2.5 一致：`status / exitCode / checker / checkerSha256 /
 * theoryId / theoryVersion / theorySha256 / proofId / proofSha256 / conclusion /
 * openHypotheses / dependencies / kernelFormallyVerified / inputSha256 /
 * message? / step? / ranAt / durationMs / python`。
 *
 * `opts.certificatePath` 给出时**直接跑这个文件**（不另写临时副本），这样
 * `inputSha256` 就是原件的哈希；否则把 bundle 写进 `tmp/team/A/` 下的临时目录。
 */
export async function checkBundle(bundle, opts = {}) {
  const started = Date.now();
  const repoRoot = opts.repoRoot ?? REPO_ROOT;
  const python = opts.python ?? process.env.MCS_WEB_PYTHON ?? 'python';
  const timeoutMs = opts.timeoutMs ?? 30000;
  const kernel = checkerPath(repoRoot);
  if (!existsSync(kernel)) {
    throw new McsError(CODES.EVIDENCE_UNSUPPORTED, `检查器文件不存在：${KERNEL_RELATIVE_PATH}`, 500);
  }
  if (!opts.certificatePath) {
    if (!bundle || typeof bundle !== 'object') throw new McsError(CODES.BAD_REQUEST, '证书必须是对象');
    if (bundle.format !== KERNEL_VERSION) {
      throw new McsError(CODES.BAD_REQUEST, `证书 format 必须是 ${KERNEL_VERSION}（收到 ${String(bundle.format)}）`, 400, { line: null, column: null, token: 'format' });
    }
  }

  let workDir = null;
  let certificate = opts.certificatePath ?? null;
  try {
    if (!certificate) {
      const base = opts.tmpDir ?? TMP_BASE;
      await mkdir(base, { recursive: true });
      workDir = await mkdtemp(join(base, 'check-'));
      certificate = join(workDir, 'certificate.json');
      await writeFile(certificate, JSON.stringify(bundle), 'utf8');
    } else if (!existsSync(certificate)) {
      throw new McsError(CODES.UNKNOWN_EVIDENCE, `证书文件不存在：${certificate}`, 404);
    }
    const outputPath = join(workDir ?? resolve(certificate, '..'), `result-${Date.now()}.json`);
    const args = [kernel, certificate, '--output', outputPath];
    if (opts.theorem) args.push('--theorem', opts.theorem);

    const { error, stdout, stderr } = await run(python, args, { cwd: opts.cwd ?? repoRoot, timeoutMs });

    // 环境故障与「证书被拒」必须分开：前者抛错，后者才返回 status。
    if (error && (error.code === 'ENOENT' || error.code === 'EACCES')) {
      throw new McsError(CODES.EVIDENCE_UNSUPPORTED, `无法启动检查器（${python}）：${error.message}`, 500, { python });
    }
    const timedOut = Boolean(error && (error.killed || error.signal === 'SIGTERM' || error.code === 'ETIMEDOUT'));

    /*
     * 输出解析与 stdout 走**同一个** tryParse（2026-10 修）。
     *
     * `kernel.py` 先把 result.json 写一半就可能被 SIGTERM 打断，留下截断的 JSON。
     * 从前 stdout 那条路有 try/catch、文件这条路没有：截断的 result.json 会让
     * `JSON.parse` 的异常直接冒到请求层（500 + 把 python 与证书的绝对路径回显出来），
     * 而真正该说的是「检查器输出损坏」。文件存在却解析不出来时**不许**回退到退出码——
     * 那正是把「损坏」说成「通过」的那条路。
     */
    const tryParse = (text) => { try { return JSON.parse(text); } catch { return null; } };
    let parsed = null;
    let corruptOutput = false;
    if (existsSync(outputPath)) {
      parsed = tryParse(await readFile(outputPath, 'utf8'));
      if (!parsed) corruptOutput = true;
    } else if (stdout) {
      parsed = tryParse(stdout);
    }

    const exitCode = exitCodeOf(error);
    const status = timedOut
      ? 'resource_exhausted'
      : corruptOutput
        ? 'corrupt'
        : (parsed?.status ?? EXIT_TO_STATUS[exitCode] ?? (error ? 'failed' : 'corrupt'));
    const inputSha256 = fileHash(certificate);
    const result = {
      status,
      exitCode,
      checker: parsed?.checker ?? KERNEL_VERSION,
      checkerSha256: parsed?.checker_sha256 ?? kernelFileHash(repoRoot),
      theoryId: parsed?.theory_id ?? null,
      theoryVersion: parsed?.theory_version ?? null,
      theorySha256: parsed?.theory_sha256 ?? null,
      proofId: parsed?.proof_id ?? null,
      proofSha256: parsed?.proof_sha256 ?? null,
      conclusion: parsed?.conclusion ?? null,
      objectConclusion: parsed?.object_conclusion ?? null,
      openHypotheses: parsed?.open_hypotheses ?? {},
      dependencies: parsed?.dependencies ?? [],
      kernelFormallyVerified: false,
      inputSha256,
      ranAt: new Date().toISOString(),
      durationMs: Date.now() - started,
      python,
      certificate,
    };
    if (status !== 'passed') {
      result.message = timedOut ? `检查器调用超时（${timeoutMs} ms）` : (parsed?.message ?? error?.message ?? '证书未被接受');
      if (parsed?.step !== undefined && parsed?.step !== null) result.step = parsed.step;
    }
    if (stderr) result.stderr = String(stderr).slice(0, 2000);
    return result;
  } finally {
    if (workDir && !opts.keepArtifacts) await rm(workDir, { recursive: true, force: true });
  }
}

/**
 * 重放一条证据记录里的证书路径（复用 `core/evidence.mjs` 的入口解析路径）。
 *
 * 与 `evidence.mjs#replayCertificate` 的分工：那边面向「证据卡片」，这边面向
 * 「候选关系」——返回的是检查器的完整判定（含 theory/proof 哈希与开放假设），
 * 供 §2.9/§2.10 的判定与目标核对直接消费。
 */
export async function replayCertificatePath(record, opts = {}) {
  const repoRoot = opts.repoRoot ?? REPO_ROOT;
  const certificate = opts.certificatePath ?? certificatePath(record, repoRoot);
  const result = await checkBundle(null, { ...opts, repoRoot, certificatePath: certificate });
  return {
    ...result,
    evidenceId: record?.id ?? null,
    certificate: record?.certificate ?? certificate,
    checkerVerified: false,
    scope: record?.scope ?? null,
    obligations: record?.obligations ?? [],
    openAssumptions: result.openHypotheses,
    note: '重放结果只覆盖该证书片段；检查器本身未获形式验证，个人掌握不由此产生。',
  };
}
