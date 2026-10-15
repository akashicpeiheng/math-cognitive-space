import { useEffect, useRef, useState } from 'react';
import { api, formatError, useApi, useLocaleKey } from '../api';
import { useAuth } from '../auth';
import { useI18n } from '../i18n';
import type { EvidenceRecord } from '../types';
import { Markdown } from './Markdown';

interface LeanReport { status: string; ranAt: string; inputSha256: string; checker: string; logs: Array<{ stage: string; stdout: string; stderr: string }>; [key: string]: unknown }
interface Registration {
  id: string; evidenceId: string; ontologyVersion: string; title: string; statement: string; assumptions: string[];
  registrationVersion: string; inputSha256: string;
  scope: string; obligations: string[]; correspondence: { status: string; note: string }; sealed: boolean;
  freshness: string; publishedReport: LeanReport | null; sources: Array<{ file: string; sha256: string; content: string }>;
  correspondenceDocument: { file: string; sha256: string; content: string };
}
interface Capabilities { ready: boolean; enabled: boolean; reason: string | null; unavailableReason?: string; expectedVersion: string; mathlibRevision: string }
interface LeanJob { id: string; status: string; stage?: string; freshness?: string; result?: LeanReport; error?: { message: string; reason?: string }; queuePosition?: number }
const ACTIVE = new Set(['queued', 'running']);
const REASONS: Record<string, { zh: string; en: string }> = {
  toolchain_missing: { zh: '未安装 Lean 工具链', en: 'The Lean toolchain is not installed' },
  version_mismatch: { zh: '工具链版本与登记不符', en: 'The toolchain version does not match the registration' },
  checker_missing: { zh: '缺少 leanchecker', en: 'leanchecker is missing' },
  dependency_missing: { zh: '固定依赖尚未准备', en: 'The pinned dependencies have not been prepared' },
  dependency_changed: { zh: '依赖内容与锁文件不符', en: 'The dependency contents do not match the lockfile' },
  input_changed: { zh: '输入已变更，需重新核对并封存', en: 'Inputs changed and require a new reviewed seal' },
  timeout: { zh: '检查超时，进程树已终止', en: 'The check timed out and its process tree was stopped' },
  cancelled: { zh: '检查已取消，进程树已终止', en: 'The check was cancelled and its process tree was stopped' },
  interrupted: { zh: '服务停止，检查已中断', en: 'The service stopped and interrupted the check' },
  output_limit: { zh: '日志超过输出限额，进程树已终止', en: 'The output limit was exceeded and the process tree was stopped' },
  environment: { zh: '检查环境不可用，详见报告', en: 'The checking environment is unavailable; see the report' },
};
const TEXT = {
  zh: { heading: 'Lean 形式验证', loading: '正在读取 Lean 登记…', statement: '检验断言', assumptions: '所用条件', scope: '覆盖范围', obligations: '尚未覆盖', correspondence: '原文对应', pending: '待人工复核', reviewed: '有审阅记录', published: '已发布检查', noReport: '尚无已发布检查报告', current: '对应当前版本', stale: '输入已变更：历史报告已过期', replay: '重新检验', cancel: '取消检查', login: '登录后可重新检验', unavailable: '重放暂不可用', disabled: '重放已关闭', source: '查看 Lean 源码与版本', download: '下载报告', job: '本次检查', boundary: '机器通过只说明登记的形式化断言成立；原文对应关系和完整覆盖范围分别核对。', retry: '重新读取任务', error: '读取失败', statuses: { passed: '通过', failed: '检查拒绝', corrupt: '报告损坏', not_run: '未运行', queued: '排队中', running: '检查中', completed: '检查结束', error: '运行失败', cancelled: '已取消', interrupted: '已中断' } as Record<string, string>, stages: { build: '构建证明', kernel_replay: '内核重放', target_audit: '目标与公理核对' } as Record<string, string> },
  en: { heading: 'Lean formal verification', loading: 'Reading the Lean registration…', statement: 'Claim checked', assumptions: 'Assumptions', scope: 'Coverage', obligations: 'Remaining obligations', correspondence: 'Prose correspondence', pending: 'Awaiting human review', reviewed: 'Review recorded', published: 'Published check', noReport: 'No published check report yet', current: 'Matches the current version', stale: 'Inputs changed: the historical report is stale', replay: 'Check again', cancel: 'Cancel check', login: 'Sign in to check again', unavailable: 'Replay is currently unavailable', disabled: 'Replay is disabled', source: 'Lean source and versions', download: 'Download report', job: 'This check', boundary: 'Machine acceptance establishes the registered formal claim; correspondence with the prose and completeness of coverage are reviewed separately.', retry: 'Read the task again', error: 'Reading failed', statuses: { passed: 'Passed', failed: 'Rejected', corrupt: 'Corrupt report', not_run: 'Not run', queued: 'Queued', running: 'Checking', completed: 'Check finished', error: 'Execution failed', cancelled: 'Cancelled', interrupted: 'Interrupted' } as Record<string, string>, stages: { build: 'Building the proof', kernel_replay: 'Replaying the kernel', target_audit: 'Checking targets and axioms' } as Record<string, string> },
};

function downloadReport(report: object, id: string) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' }));
  const anchor = document.createElement('a'); anchor.href = url; anchor.download = `${id}.json`; anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function LeanEvidenceCards({ evidence }: { evidence: EvidenceRecord[] }) {
  const records = evidence.filter(record => record.backend === 'lean4' && record.leanRegistration);
  const capabilities = useApi<Capabilities>(records.length ? '/lean/capabilities' : null);
  const { pick } = useI18n(); const text = pick(TEXT);
  if (!records.length) return null;
  return <div className="lean-evidence-list" aria-label={text.heading}>
    {capabilities.error && <p className="error">{formatError(capabilities.error)}</p>}
    {records.map(record => <LeanEvidenceCard key={record.id} registrationId={record.leanRegistration!} capabilities={capabilities.data ?? null} />)}
  </div>;
}

function LeanEvidenceCard({ registrationId, capabilities }: { registrationId: string; capabilities: Capabilities | null }) {
  const registration = useApi<Registration>(`/lean/registrations/${encodeURIComponent(registrationId)}`);
  const auth = useAuth(); const { pick } = useI18n(); const text = pick(TEXT); const localeKey = useLocaleKey();
  const ownerKey = auth.user?.id ?? (auth.mode === 'local' ? 'local' : 'guest');
  const storageKey = `mcs-lean-job/1:${ownerKey}:${registrationId}`;
  const [job, setJob] = useState<LeanJob | null>(null); const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false); const [retry, setRetry] = useState(0);
  const epoch = useRef(0);
  useEffect(() => {
    epoch.current += 1; setJob(null); setError(null); setSending(false);
    if (ownerKey === 'guest') return;
    try { const id = sessionStorage.getItem(storageKey); if (id) setJob({ id, status: 'queued' }); } catch { /* storage may be unavailable */ }
  }, [storageKey, ownerKey, auth.identityKey]);
  const jobId = job?.id; const jobActive = job ? ACTIVE.has(job.status) : false;
  useEffect(() => {
    if (!jobId || !jobActive || ownerKey === 'guest') return;
    let stopped = false; let timer: ReturnType<typeof setTimeout> | undefined;
    const poll = async () => {
      try {
        const value = await api<LeanJob>(`/lean/jobs/${encodeURIComponent(jobId)}`);
        if (stopped) return;
        setJob(value); setError(null);
        if (ACTIVE.has(value.status)) timer = setTimeout(poll, 700);
      } catch (reason) { if (!stopped) setError(formatError(reason)); }
    };
    void poll();
    return () => { stopped = true; if (timer) clearTimeout(timer); };
  }, [jobId, jobActive, ownerKey, auth.identityKey, localeKey, retry]);
  async function start() {
    if (!registration.data) return;
    const currentEpoch = epoch.current; setSending(true); setError(null); setJob(null);
    try {
      const value = await api<LeanJob>('/lean/jobs', { method: 'POST', body: { evidenceId: registration.data.evidenceId, ontologyVersion: registration.data.ontologyVersion } });
      if (epoch.current !== currentEpoch) return;
      setJob(value); try { sessionStorage.setItem(storageKey, value.id); } catch { /* optional recovery */ }
    } catch (reason) { if (epoch.current === currentEpoch) setError(formatError(reason)); }
    finally { if (epoch.current === currentEpoch) setSending(false); }
  }
  async function cancel() {
    if (!jobId) return; const currentEpoch = epoch.current; setSending(true);
    try { const value = await api<LeanJob>(`/lean/jobs/${encodeURIComponent(jobId)}`, { method: 'DELETE' }); if (epoch.current === currentEpoch) setJob(value); }
    catch (reason) { if (epoch.current === currentEpoch) setError(formatError(reason)); }
    finally { if (epoch.current === currentEpoch) setSending(false); }
  }
  if (registration.loading) return <p>{text.loading}</p>;
  if (registration.error) return <p className="error">{text.error}: {formatError(registration.error)}</p>;
  const r = registration.data; if (!r) return null;
  const allowed = auth.ready && (auth.mode === 'local' || Boolean(auth.user));
  const label = (status: string) => text.statuses[status] ?? status;
  return <article className="lean-evidence-card" data-lean-registration={r.id}>
    <h3>{r.title}</h3>
    <dl><dt>{text.statement}</dt><dd>{r.statement}</dd><dt>{text.assumptions}</dt><dd>{r.assumptions.join('; ')}</dd><dt>{text.scope}</dt><dd>{r.scope}</dd><dt>{text.correspondence}</dt><dd>{r.correspondence.status === 'pending' ? text.pending : text.reviewed}</dd></dl>
    <p>{text.obligations}</p><ul>{r.obligations.map(item => <li key={item}>{item}</li>)}</ul>
    <p className="lean-published">{text.published}: {r.publishedReport ? `${label(r.publishedReport.status)}${r.publishedReport.ranAt ? ` · ${r.publishedReport.ranAt}` : ''}` : text.noReport}</p>
    {r.publishedReport && <p className={r.freshness === 'stale' ? 'error' : 'muted'}>{r.freshness === 'stale' ? text.stale : text.current}</p>}
    <div className="lean-actions">
      <button className="button small" type="button" onClick={() => void start()} disabled={!allowed || !capabilities?.ready || !capabilities.enabled || !r.sealed || sending || jobActive}>{text.replay}</button>
      {jobActive && <button className="button small secondary" type="button" onClick={() => void cancel()} disabled={sending}>{text.cancel}</button>}
      {r.publishedReport && <button className="button small secondary" type="button" onClick={() => downloadReport(r.publishedReport!, r.id)}>{text.download}</button>}
    </div>
    {!allowed && auth.ready && <p className="muted">{text.login}</p>}
    {capabilities && (!capabilities.ready || !capabilities.enabled) && <p className="muted">{capabilities.enabled ? text.unavailable : text.disabled}{capabilities.reason ? `: ${pick(REASONS[capabilities.unavailableReason ?? 'environment'] ?? REASONS.environment)}` : ''}</p>}
    <div aria-live="polite" aria-atomic="true" className="lean-job-status" data-lean-job-id={job?.id}>
      {sending && !job && <p>{pick({ zh: '正在提交检查…', en: 'Submitting the check…' })}</p>}
      {job && <p>{text.job}: {label(job.status)}{job.stage ? ` · ${text.stages[job.stage] ?? job.stage}` : ''}{job.result ? ` · ${label(job.result.status)}` : ''}</p>}
      {job?.freshness === 'stale' && <p className="error">{text.stale}</p>}
      {job?.error && <p className="error">{pick(REASONS[job.error.reason ?? 'environment'] ?? REASONS.environment)}</p>}
      {error && <p className="error">{error}</p>}
    </div>
    {error && jobActive && <button className="button small secondary" type="button" onClick={() => setRetry(value => value + 1)}>{text.retry}</button>}
    {job?.result && <button className="button small" type="button" onClick={() => downloadReport(job.result!, `${r.id}-${job.id}`)}>{text.download} · {text.job}</button>}
    {job?.result && <details><summary>{pick({ zh: '本次检查日志', en: 'Logs for this check' })}</summary><pre className="lean-report">{JSON.stringify(job.result, null, 2)}</pre></details>}
    {job && !jobActive && !job.result && <details><summary>{pick({ zh: '任务诊断记录', en: 'Task diagnostics' })}</summary><pre className="lean-report">{JSON.stringify(job, null, 2)}</pre><button className="button small" type="button" onClick={() => downloadReport(job, `${r.id}-${job.id}`)}>{text.download} · {text.job}</button></details>}
    <details className="lean-correspondence"><summary>{pick({ zh: '原文与 Lean 的逐项对照', en: 'Prose–Lean correspondence (Chinese source)' })}</summary><p className="lean-hash">{r.correspondenceDocument.file} · SHA-256: {r.correspondenceDocument.sha256}</p><Markdown>{r.correspondenceDocument.content}</Markdown></details>
    <details><summary>{text.source}</summary><p>{r.correspondence.note}</p><p className="muted">{text.boundary}</p><p>Lean {capabilities?.expectedVersion ?? '4.34.1'} · mathlib {capabilities?.mathlibRevision ?? 'd13f23b723b8a846827a245b89c10fc7d3f11612'} · {pick({ zh: '登记版本', en: 'Registration version' })} {r.registrationVersion}</p><p className="lean-hash">SHA-256: {r.inputSha256}</p>{r.sources.map(source => <details key={source.file}><summary>{source.file}</summary><p className="lean-hash">SHA-256: {source.sha256}</p><pre><code>{source.content}</code></pre></details>)}{r.publishedReport && <pre className="lean-report">{JSON.stringify(r.publishedReport, null, 2)}</pre>}</details>
  </article>;
}
