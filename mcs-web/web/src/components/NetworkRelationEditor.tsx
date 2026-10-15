import { useEffect, useRef, useState } from 'react';
import { api, formatError } from '../api';
import { useI18n } from '../i18n';
import { PRIVATE_KINDS, checkRelationStructure, normalizePrivateRelation, nodeRefKey } from '../../../shared/network-workspace.mjs';
import type { FormalBinding, NetworkNodeRef, PrivateRelation, RelationCheck } from '../../../shared/network-workspace.mjs';
import type { NodeSummary } from '../types';
import type { useNetworkWorkspace } from '../useNetworkWorkspace';
import { readVaultFile } from '../vault-cloud';
const KIND_LABELS: Record<string, { zh: string; en: string }> = { related: { zh: '参考关联', en: 'Reference association' }, definitionReference: { zh: '定义引用', en: 'Definition reference' }, scaling: { zh: '放缩', en: 'Scaling' }, equivalentTo: { zh: '等价', en: 'Equivalence' }, conditionalDerivation: { zh: '条件推导', en: 'Conditional derivation' }, instanceOf: { zh: '实例', en: 'Instance' }, counterexampleTo: { zh: '反例', en: 'Counterexample' } };
export function NetworkRelationEditor({ from: initialFrom, nodes, workspace, onClose, existing }: { from: string; nodes: NodeSummary[]; workspace: ReturnType<typeof useNetworkWorkspace>; onClose: () => void; existing?: PrivateRelation }) {
  const { pick, hrefFor } = useI18n(), dialog = useRef<HTMLDialogElement>(null), request = useRef<AbortController | null>(null);
  const activeCheck = useRef<string | null>(null);
  const [from, setFrom] = useState(existing ? nodeRefKey(existing.from) : initialFrom);
  const cancel = () => { request.current?.abort(); const id = activeCheck.current; activeCheck.current = null; if (id) void api(`/network-relation-checks/${id}`, { method: 'DELETE' }).catch(() => {}); setBusy(false); };
  const [to, setTo] = useState(existing ? nodeRefKey(existing.to) : nodes.find(n => n.id !== from)?.id ?? ''), [kind, setKind] = useState(existing?.kind ?? 'related'), [conditions, setConditions] = useState(existing?.conditions ?? ''), [reason, setReason] = useState(existing?.reason ?? ''), [source, setSource] = useState(existing?.source ?? '');
  const [specs, setSpecs] = useState<Record<string, string>>(Object.fromEntries(['from', 'to'].map(side => [side, existing?.bindings[side as 'from' | 'to'] ? JSON.stringify(existing.bindings[side as 'from' | 'to']!.spec, null, 2) : ''])));
  const [excerpts, setExcerpts] = useState<Record<string, string>>({ from: existing?.bindings.from?.excerpt ?? '', to: existing?.bindings.to?.excerpt ?? '' }), [confirmed, setConfirmed] = useState<Record<string, boolean>>({ from: existing?.bindings.from?.correspondenceConfirmed ?? false, to: existing?.bindings.to?.correspondenceConfirmed ?? false });
  const [saved, setSaved] = useState(existing), [result, setResult] = useState<RelationCheck | null>(existing?.checks?.at(-1) ?? null), [message, setMessage] = useState(''), [busy, setBusy] = useState(false), [submission, setSubmission] = useState(false), [publicTitles, setPublicTitles] = useState<Record<string, string>>({ from: nodes.find(n => n.id === from)?.title ?? '', to: nodes.find(n => n.id === to)?.title ?? '' });
  useEffect(() => { dialog.current?.showModal(); return () => { request.current?.abort(); const id = activeCheck.current; if (id) void api(`/network-relation-checks/${id}`, { method: 'DELETE' }).catch(() => {}); }; }, []);
  const identity = useRef(workspace.identityKey);
  useEffect(() => { if (identity.current === workspace.identityKey) return; identity.current = workspace.identityKey; request.current?.abort(); setBusy(false); setResult(null); setMessage(''); onClose(); }, [workspace.identityKey, onClose]);
  const changed = () => { setResult(null); setSubmission(false); };
  const make = (): PrivateRelation => {
    const refs = { from: workspace.refs?.get(from), to: workspace.refs?.get(to) };
    if (!refs.from || !refs.to) throw new Error(pick({ zh: '请恢复两端节点来源', en: 'Restore both node sources' }));
    const bindings: PrivateRelation['bindings'] = {};
    for (const side of ['from', 'to'] as const) if (specs[side].trim()) bindings[side] = { spec: JSON.parse(specs[side]), excerpt: excerpts[side], section: '', correspondenceConfirmed: confirmed[side] };
    return normalizePrivateRelation({ ...refs, kind, conditions, reason, source, bindings });
  };
  const action = async (fn: (signal: AbortSignal) => Promise<void>) => { request.current?.abort(); const controller = new AbortController(); request.current = controller; setBusy(true); setMessage(''); try { await fn(controller.signal); } catch (e) { if (!controller.signal.aborted) setMessage(formatError(e)); } finally { if (!controller.signal.aborted) setBusy(false); } };
  const save = async () => {
    const raw = make(), structure = checkRelationStructure(raw); if (structure.status !== 'valid') throw new Error(structure.problems.join('；'));
    for (const side of ['from', 'to'] as const) if (raw[side].source === 'vault' && raw.bindings[side]) {
      const meta = workspace.metadata?.get(nodeRefKey(raw[side])); if (!meta || meta.file.missing) throw new Error(pick({ zh: '原文来源不可用', en: 'Original note is unavailable' }));
      const text = await (await readVaultFile(meta.vault, meta.file, request.current?.signal)).text();
      if (!text.replaceAll('\r\n', '\n').includes(raw.bindings[side]!.excerpt.replaceAll('\r\n', '\n'))) throw new Error(pick({ zh: '摘录必须出自绑定版本的笔记原文', en: 'The excerpt must occur in the bound note revision' }));
    }
    const value = await workspace.saveRelation(raw, saved); setSaved(value); setMessage(pick({ zh: '私人关系已保存；结构检查通过', en: 'Private relation saved; structure check passed' })); return value;
  };
  const verify = () => void action(async signal => {
    const relation = await save();
    if (signal.aborted) return;
    // Read the creation receipt even after Cancel, so its server job can be cancelled.
    const initial = await api<{ check: { id: string; status: string } }>('/network-relation-checks', { method: 'POST', body: { relation: make() } });
    if (signal.aborted) { await api(`/network-relation-checks/${initial.check.id}`, { method: 'DELETE' }); return; }
    activeCheck.current = initial.check.id;
    let check: { id: string; status: string; result?: RelationCheck } = initial.check;
    while (['running', 'queued'].includes(check.status)) {
      await new Promise<void>((resolve, reject) => { const abort = () => { clearTimeout(timer); reject(signal.reason); }; const timer = setTimeout(() => { signal.removeEventListener('abort', abort); resolve(); }, 400); signal.addEventListener('abort', abort, { once: true }); });
      check = (await api<{ check: typeof check }>(`/network-relation-checks/${check.id}`, { signal })).check;
    }
    if (signal.aborted) return;
    activeCheck.current = null;
    if (check.result) { const result = { ...check.result, id: check.id }; setResult(result); await workspace.addCheck(relation, result); setMessage(pick({ zh: '验证结果已保存', en: 'Check result saved' })); }
  });
  return <dialog className="network-relation-dialog" ref={dialog} onCancel={onClose} aria-label={pick({ zh: '建立私人关系', en: 'Create a private relation' })}>
    <div className="network-editor-head"><h2>{pick({ zh: '建立私人关系', en: 'Create a private relation' })}</h2><button className="button small" onClick={onClose}>{pick({ zh: '关闭', en: 'Close' })}</button></div>
    <p><strong>{nodes.find(n => n.id === from)?.title ?? from}</strong> → <select aria-label={pick({ zh: '关系另一端', en: 'Other endpoint' })} value={to} disabled={busy} onChange={event => { setTo(event.target.value); setSpecs(v => ({ ...v, to: '' })); setExcerpts(v => ({ ...v, to: '' })); setConfirmed(v => ({ ...v, to: false })); setPublicTitles(v => ({ ...v, to: nodes.find(n => n.id === event.target.value)?.title ?? '' })); changed(); }}>{nodes.filter(n => n.id !== from).map(n => <option key={n.id} value={n.id}>{n.title}</option>)}</select></p>
    <button className="button small" disabled={busy || !to} onClick={() => {
      setFrom(to); setTo(from);
      setSpecs(v => ({ from: v.to, to: v.from })); setExcerpts(v => ({ from: v.to, to: v.from }));
      setConfirmed(v => ({ from: v.to, to: v.from })); setPublicTitles(v => ({ from: v.to, to: v.from })); changed();
    }}>{pick({ zh: '交换关系方向', en: 'Reverse relation direction' })}</button>
    <fieldset disabled={busy}>
      <label>{pick({ zh: '关系类型', en: 'Relation type' })}<select value={kind} onChange={event => { setKind(event.target.value); changed(); }}>{PRIVATE_KINDS.map(k => <option key={k} value={k}>{pick(KIND_LABELS[k])}</option>)}</select></label>
      <p>{pick({ zh: '箭头从上方起点指向所选终点；交换方向后须重新验证。', en: 'The arrow points from the source above to the selected target. Rerun checks after reversing it.' })}</p>
      <label>{pick({ zh: '适用条件', en: 'Conditions' })}<textarea value={conditions} onChange={e => { setConditions(e.target.value); changed(); }} /></label>
      <label>{pick({ zh: '关系理由', en: 'Reason' })}<textarea required value={reason} onChange={e => { setReason(e.target.value); changed(); }} /></label>
      <label>{pick({ zh: '依据与来源', en: 'Evidence and source' })}<input value={source} onChange={e => { setSource(e.target.value); changed(); }} /></label>
      <details><summary>{pick({ zh: '高级：形式表达与原文对应', en: 'Advanced: formal expressions and correspondence' })}</summary>
        <p>{pick({ zh: '公共节点使用已登记表达。笔记端填写所选命题的背景、声明、假设与结论；只发送这里填写的形式材料。', en: 'Public nodes use registered expressions. For notes, enter the background, declarations, assumptions and statement of the selected claim. Only materials entered here are sent.' })}</p>
        {(['from', 'to'] as const).filter(side => workspace.refs?.get(side === 'from' ? from : to)?.source === 'vault').map(side => <div className="network-binding" key={side}>
          <h3>{side === 'from' ? pick({ zh: '起点笔记', en: 'Source note' }) : pick({ zh: '终点笔记', en: 'Target note' })}</h3>
          <label>{pick({ zh: '选定原文摘录', en: 'Selected original excerpt' })}<textarea value={excerpts[side]} onChange={e => { setExcerpts(v => ({ ...v, [side]: e.target.value })); setConfirmed(v => ({ ...v, [side]: false })); changed(); }} /></label>
          <button className="button small" onClick={() => { const meta = workspace.metadata?.get(side === 'from' ? from : to); if (meta?.indexed?.significance) { setExcerpts(v => ({ ...v, [side]: meta.indexed!.significance })); setConfirmed(v => ({ ...v, [side]: false })); changed(); } }}>{pick({ zh: '填入已有动机摘录，再选择所需命题', en: 'Use the motivation excerpt, then select the required claim' })}</button>
          <label>{pick({ zh: '形式表达（JSON）', en: 'Formal expression (JSON)' })}<textarea className="network-spec-input" value={specs[side]} placeholder={'{"background":"bg:core/1","declarations":[],"assumptions":[],"statement":{"source":"true","kind":"formula"}}'} onChange={e => { setSpecs(v => ({ ...v, [side]: e.target.value })); setConfirmed(v => ({ ...v, [side]: false })); changed(); }} /></label>
          <label><input type="checkbox" checked={confirmed[side]} onChange={e => { setConfirmed(v => ({ ...v, [side]: e.target.checked })); changed(); }} />{pick({ zh: '我已核对形式表达与这段原文对应（人工确认）', en: 'I checked correspondence with this excerpt (human review)' })}</label>
        </div>)}
      </details>
    </fieldset>
    <p className="muted">{pick({ zh: '机器结果只覆盖精确形式命题与机器条件；自然语言理由和原文对应仍需审阅。', en: 'Machine results cover exact formal statements and machine conditions; prose reasons and correspondence require review.' })}</p>
    <div className="card-actions"><button className="button" disabled={busy} onClick={() => void action(async () => { await save(); })}>{pick({ zh: '保存并检查规则', en: 'Save and check rules' })}</button><button className="button" disabled={busy || !workspace.cloudAllowed} onClick={verify}>{pick({ zh: '验证数学关系', en: 'Verify mathematical relation' })}</button>{busy && <button className="button" onClick={() => { cancel(); setMessage(pick({ zh: '验证任务已取消，未完成的结论仍为未判定', en: 'Check cancelled; unfinished claims remain undecided' })); }}>{pick({ zh: '取消验证', en: 'Cancel check' })}</button>}<button className="button" disabled={busy || !workspace.cloudAllowed} onClick={() => { setSubmission(v => !v); }}>{pick({ zh: '预览投稿材料', en: 'Preview contribution' })}</button></div>
    {!workspace.cloudAllowed && <p><a href={hrefFor('/login')}>{pick({ zh: '登录后可运行机器验证与投稿', en: 'Sign in for machine checks and contributions' })}</a></p>}
    {result && <p>{pick({ zh: '形式表达与原文的人工核对', en: 'Human confirmation of formalization' })}: {(['from', 'to'] as const).filter(side => workspace.refs?.get(side === 'from' ? from : to)?.source === 'vault').map(side => `${side}: ${pick(result.correspondence?.[side] ? { zh: '已人工确认', en: 'Manually confirmed' } : { zh: '尚未人工确认', en: 'Not manually confirmed' })}`).join(' · ') || pick({ zh: '公共登记表达', en: 'Registered public expressions' })}</p>}
    {!!saved?.checks?.length && <details><summary>{pick({ zh: '保留的检查记录（旧输入不能作为当前结论）', en: 'Retained checks (old inputs do not establish current claims)' })}</summary><pre>{JSON.stringify(saved.checks, null, 2)}</pre></details>}
    {result && <section className="network-check-result"><h3>{pick({ zh: '验证结果', en: 'Check result' })}</h3><p>{pick({ zh: '结构检查', en: 'Structure check' })}: {result.structure.status}</p>{result.structure.problems.map(problem => <p key={problem}>{problem}</p>)}<p>{pick({ zh: '数学判断', en: 'Mathematical judgment' })}: {result.math.status} · {result.label ?? 'NOT-CLAIMED'}{result.stale && ` · ${pick({ zh: '已过期', en: 'Stale' })}`}</p><p>{result.math.reason}</p><p>{result.math.scope}</p><p>{pick({ zh: '运行状态', en: 'Run status' })}: {result.run.status}</p><details><summary>{pick({ zh: '精确目标、条件与证据', en: 'Exact goal, conditions and evidence' })}</summary><pre>{JSON.stringify(result, null, 2)}</pre></details></section>}
    {submission && <section className="network-submission-preview"><h3>{pick({ zh: '最小公开材料', en: 'Minimal public materials' })}</h3><p>{pick({ zh: '只提交下列标题、选定摘录、关系与形式材料，管理员审阅后映射或建立公共候选节点。', en: 'Submit only these titles, selected excerpts, relation and formal materials. Reviewers map them to public nodes or create candidates.' })}</p>
      {(['from', 'to'] as const).map(side => <div key={side}><label>{pick({ zh: '公开标题', en: 'Public title' })}<input value={publicTitles[side]} onChange={e => setPublicTitles(v => ({ ...v, [side]: e.target.value }))} /></label>{workspace.refs?.get(side === 'from' ? from : to)?.source === 'vault' && <label>{pick({ zh: '可公开的最小摘录', en: 'Minimal public excerpt' })}<textarea aria-label={pick({ zh: '可公开的最小摘录', en: 'Minimal public excerpt' })} value={excerpts[side]} onChange={e => { setExcerpts(v => ({ ...v, [side]: e.target.value })); setResult(null); setConfirmed(v => ({ ...v, [side]: false })); }} /></label>}</div>)}
      <p>{pick(KIND_LABELS[kind])} · {conditions} · {reason} · {source}</p>{result?.id && !result.stale && <p>{pick({ zh: '同时提交上方检查的固定证据：', en: 'Include the frozen evidence shown above: ' })}{result.math.status} · {result.label ?? 'NOT-CLAIMED'} · {result.inputHash}</p>}<button className="button" disabled={busy} onClick={() => void action(async signal => { const relation = make(); const endpoints = Object.fromEntries((['from', 'to'] as const).map(side => [side, { title: publicTitles[side], excerpt: excerpts[side], publicNodeId: relation[side].source === 'ontology' ? (relation[side] as { id: string }).id : '', construct: 'Claim', discipline: nodes.find(n => n.id === (side === 'from' ? from : to))?.discipline ?? '' }])); await api('/me/relation-submissions', { method: 'POST', body: { relation, endpoints, ...(result?.id && !result.stale ? { checkId: result.id } : {}) }, signal }); setSubmission(false); setMessage(pick({ zh: '已提交固定材料，等待审阅', en: 'Frozen materials submitted for review' })); })}>{pick({ zh: '提交这些材料', en: 'Submit these materials' })}</button>
    </section>}
    {saved && <div className="card-actions"><button className="button small" disabled={busy} onClick={() => void action(async () => { await workspace.removeRelation(saved); onClose(); })}>{pick({ zh: '删除这条私人关系', en: 'Delete this private relation' })}</button>{saved.local && workspace.cloudAllowed && <button className="button small" disabled={busy} onClick={() => void action(async signal => { await workspace.syncRelation(saved, signal); setMessage(pick({ zh: '已主动上传所用笔记库并映射关系到账号，需重新验证', en: 'Used libraries uploaded and relation mapped to your account; rerun checks' })); })}>{pick({ zh: '上传所用笔记库正文并同步关系到账号', en: 'Upload used library contents and sync relation to account' })}</button>}</div>}
    {message && <p role="status">{message}</p>}
  </dialog>;
}
