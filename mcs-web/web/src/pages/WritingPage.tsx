import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useI18n } from '../i18n';
import { api, formatError } from '../api';
import { useVaults } from '../vault-context';
import { getLocalVault } from '../vault-local';
import { uploadVault } from '../vault-cloud';
import { branchWritingDraft, createWritingDraft, getWritingDraft, listWritingDrafts, persistWritingDraft, saveWritingNote } from '../writing-store';
import type { NoteDraft } from '../writing-store';
import { Markdown } from '../components/Markdown';
import { WritingPreview } from '../components/WritingPreview';
import { WRITING_COPY as C } from '../writing-copy';
import { WRITING_SECTIONS, WRITING_TYPES, WRITING_STATUSES, STATUS_LABELS, CORE_SECTIONS, APPLICABILITIES, APPLICABILITY_LABELS, DEPTH_LABELS, UNKNOWN_ROLE_WARNING, TEMPLATE_VERSION, chooseText, writingType, buildWritingPrompt } from '../../../shared/writing-template.mjs';
import type { WritingType, WritingStatus, WritingDepth, Applicability } from '../../../shared/writing-template.mjs';
import { addWritingSection, documentMetadata, invalidateChangedReviews, locateWritingSections, replaceWritingSection, supplementWritingDocument, updateDocumentMetadata, writingChecks, writingCoverage } from '../../../shared/writing-document.mjs';
import { parseVaultNote, sha256 } from '../../../shared/vault.mjs';
import '../writing.css';

const download = (markdown: string, title: string) => {
  const url = URL.createObjectURL(new Blob([markdown], { type: 'text/markdown;charset=utf-8' }));
  const link = document.createElement('a'); link.href = url; link.download = (title.replace(/[<>:"/\\|?*]/g, '-') || 'note') + '.md'; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
};

/** New and existing drafts remount by identity; a locale change never rewrites text. */
export function WritingPage() {
  const { draftId } = useParams();
  return draftId && draftId !== 'new' ? <DraftWorkspace key={draftId} draftId={draftId} /> : <NewWritingNote />;
}

function RoleChoices({ primary, roles, onChange }: { primary: string; roles: string[]; onChange: (roles: string[]) => void }) {
  const { pick } = useI18n();
  return <details className="writing-role-choices"><summary>{pick(C.roles)}</summary><fieldset><legend>{pick(C.roles)}</legend>
    {WRITING_TYPES.filter(t => t.id !== 'generic' && t.id !== primary).map(t => <label key={t.id}><input type="checkbox" checked={roles.includes(t.id)} onChange={e => onChange(e.target.checked ? [...roles, t.id] : roles.filter(r => r !== t.id))} />{pick(t.title)}</label>)}
  </fieldset></details>;
}

function NewWritingNote() {
  const { locale, pick, hrefFor } = useI18n(), navigate = useNavigate(), [params] = useSearchParams();
  const [title, setTitle] = useState(params.get('title') ?? ''), [type, setType] = useState<WritingType>('generic'), [audience, setAudience] = useState('');
  const [roles, setRoles] = useState<string[]>([]), [depth, setDepth] = useState<WritingDepth>('core');
  const [node, setNode] = useState(params.get('node') ?? ''), [drafts, setDrafts] = useState<NoteDraft[]>([]), [error, setError] = useState(''), [busy, setBusy] = useState(false);
  useEffect(() => { let active = true; void listWritingDrafts().then(d => { if (active) setDrafts(d.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))); }).catch(e => { if (active) setError(formatError(e)); }); return () => { active = false; }; }, []);
  useEffect(() => {
    const id = params.get('node'); if (!id || params.has('title')) return;
    const controller = new AbortController();
    void api<{ node: { title: string } }>(`/ontology/nodes/${encodeURIComponent(id)}`, { signal: controller.signal }).then(result => { if (!controller.signal.aborted) setTitle(result.node.title); }).catch(() => {});
    return () => controller.abort();
  }, [params]);
  return <div className="page writing-page"><Link to={hrefFor('/library')}>{pick(C.back)}</Link><h1>{pick(C.new)}</h1><p className="writing-lead">{pick(C.guideLead)}</p>
    <form className="card writing-new-form" onSubmit={event => { event.preventDefault(); if (busy) return; setBusy(true); setError(''); void createWritingDraft({ title, type, roles, depth, audience, locale, nodeIds: node.trim() ? [node.trim()] : [] }).then(d => navigate(hrefFor('/library/write/' + d.id))).catch(e => setError(formatError(e))).finally(() => setBusy(false)); }}>
      <label>{pick(C.name)}<input autoFocus value={title} onChange={e => setTitle(e.target.value)} /></label>
      <label>{pick(C.kind)}<select aria-label={pick(C.kind)} value={type} onChange={e => setType(e.target.value as WritingType)}>{WRITING_TYPES.map(t => <option key={t.id} value={t.id}>{pick(t.title)}</option>)}</select></label>
      <p className="muted">{pick(writingType(type).focus)}</p>
      <RoleChoices primary={type} roles={roles} onChange={setRoles} />
      <label>{pick(C.depth)}<select aria-label={pick(C.depth)} value={depth} onChange={e => setDepth(e.target.value as WritingDepth)}>{Object.entries(DEPTH_LABELS).map(([id, label]) => <option key={id} value={id}>{pick(label)}</option>)}</select></label>
      <label>{pick(C.audience)}<textarea rows={2} value={audience} onChange={e => setAudience(e.target.value)} placeholder={pick(C.audienceHint)} /></label>
      {node && <label>{pick(C.linked)}<input value={node} onChange={e => setNode(e.target.value)} /><small>{pick(C.nodeHint)}</small><button type="button" className="link-button" onClick={() => setNode('')}>{pick(C.unlinked)}</button></label>}
      <button className="button primary" disabled={busy}>{pick(C.start)}</button>
    </form>{error && <p className="error" role="alert">{error}</p>}
    {!!drafts.length && <section className="card"><h2>{pick(C.drafts)}</h2><ul>{drafts.map(d => <li key={d.id}><Link to={hrefFor('/library/write/' + d.id)}>{d.title}</Link> · {new Date(d.updatedAt).toLocaleString(locale === 'en' ? 'en-US' : 'zh-CN')}</li>)}</ul></section>}
  </div>;
}

function DraftWorkspace({ draftId }: { draftId: string }) {
  const { locale, pick, hrefFor } = useI18n(), vaults = useVaults(), navigate = useNavigate();
  const [draft, setDraft] = useState<NoteDraft | null>(null), [error, setError] = useState(''), [notice, setNotice] = useState(''), [loaded, setLoaded] = useState(false);
  const [mode, setMode] = useState<'chapter' | 'full' | 'preview'>('chapter'), [busy, setBusy] = useState(false), [autoState, setAutoState] = useState<'saving' | 'saved' | 'failed'>('saved');
  const [roleChoices, setRoleChoices] = useState<string[]>([]), [depthChoice, setDepthChoice] = useState<WritingDepth>('core');
  const [typeChoice, setTypeChoice] = useState('generic'), [proposal, setProposal] = useState<{ base: string; markdown: string; type: string; roles: string[]; depth: WritingDepth } | null>(null), [prompt, setPrompt] = useState(''), [materials, setMaterials] = useState('');
  const [drawer, setDrawer] = useState<'contents' | 'guidance' | null>(null);
  const current = useRef<NoteDraft | null>(null), queue = useRef<Promise<unknown>>(Promise.resolve()), epoch = useRef(0), mounted = useRef(true);
  const writingBlocked = useRef(false), userGeneration = useRef(vaults.identityKey), uploadRequest = useRef<{ controller: AbortController; identity: number } | null>(null);
  userGeneration.current = vaults.identityKey;
  const install = useCallback((next: NoteDraft) => { current.current = next; setDraft(next); const m = documentMetadata(next.markdown); setTypeChoice(m.type); setRoleChoices(m.roles.filter(r => r !== m.type)); setDepthChoice(m.depth); setMaterials(next.materials ?? ''); }, []);
  useEffect(() => {
    mounted.current = true; let active = true;
    void getWritingDraft(draftId).then(d => { if (!active) return; if (d) install(d); else setError(pick(C.noDraft)); setLoaded(true); }).catch(e => { if (active) { setError(formatError(e)); setLoaded(true); } });
    return () => { active = false; mounted.current = false; uploadRequest.current?.controller.abort(); };
  }, [draftId, install]);
  useEffect(() => {
    const pending = uploadRequest.current;
    // A delayed identity effect must not cancel an upload already started for
    // this new identity. Only requests belonging to the previous user abort.
    if (pending && pending.identity !== vaults.identityKey) { pending.controller.abort(); setBusy(false); }
    setNotice('');
  }, [vaults.identityKey]);
  useEffect(() => { const warn = (e: BeforeUnloadEvent) => { if (autoState !== 'saved') { e.preventDefault(); e.returnValue = ''; } }; window.addEventListener('beforeunload', warn); return () => window.removeEventListener('beforeunload', warn); }, [autoState]);

  // Serialize storage commits without awaiting in the input handler. CAS failures keep the live text.
  function update(patch: Partial<NoteDraft>) {
    if (!current.current) return;
    if (patch.markdown !== undefined) {
      const before = documentMetadata(current.current.markdown), after = documentMetadata(patch.markdown);
      if (before.type !== after.type || before.depth !== after.depth || before.roles.join(',') !== after.roles.join(',')) {
        setTypeChoice(after.type); setRoleChoices(after.roles.filter(r => r !== after.type)); setDepthChoice(after.depth);
      }
      patch = { ...patch, markdown: invalidateChangedReviews(current.current.markdown, patch.markdown), title: parseVaultNote(patch.markdown, current.current.path).title };
    }
    const next = { ...current.current, ...patch }, generation = epoch.current;
    current.current = next; setDraft(next); setAutoState('saving');
    queue.current = queue.current.then(async () => {
      if (generation !== epoch.current || writingBlocked.current || !current.current) return;
      const latest = current.current;
      try {
        const saved = await persistWritingDraft(latest);
        if (generation !== epoch.current) return;
        // Inputs typed during the transaction remain authoritative; adopt only the new revision.
        const unchanged = current.current === latest;
        current.current = { ...current.current!, draftRevision: saved.draftRevision, updatedAt: saved.updatedAt };
        if (mounted.current) { setDraft(current.current); setAutoState(unchanged ? 'saved' : 'saving'); }
      } catch (e) {
        writingBlocked.current = true;
        if (mounted.current) { setAutoState('failed'); setError(e instanceof Error && e.message === 'WRITING_DRAFT_CONFLICT' ? pick(C.rebase) : pick(C.localFailure) + ' ' + formatError(e)); }
      }
    });
  }

  const markdown = draft?.markdown ?? '', deferred = useDeferredValue(markdown);
  const metadata = useMemo(() => documentMetadata(markdown), [markdown]);
  const located = useMemo(() => locateWritingSections(markdown), [markdown]);
  const checks = useMemo(() => writingChecks(deferred), [deferred]), coverage = useMemo(() => writingCoverage(deferred, checks), [deferred, checks]);
  const active = WRITING_SECTIONS.find(s => s.id === draft?.activeSection) ?? WRITING_SECTIONS[0], range = located.sections[active.id];
  const dt = (v: Parameters<typeof chooseText>[0]) => chooseText(v, metadata.locale);

  async function save() {
    if (busy || !current.current || writingBlocked.current) return;
    setBusy(true); setError(''); setNotice('');
    try {
      const job = queue.current.then(async () => {
        if (writingBlocked.current || !current.current) return;
        const snapshot = current.current, result = await saveWritingNote(snapshot);
        if (current.current === snapshot) install(result.draft);
        else {
          // Typing during a save belongs to the next draft, not the saved snapshot.
          current.current = { ...current.current!, baseHash: result.draft.baseHash, baseRevision: result.draft.baseRevision, draftRevision: result.draft.draftRevision, updatedAt: result.draft.updatedAt, assets: [] };
          if (mounted.current) setDraft(current.current);
        }
        if (mounted.current) { setAutoState(current.current!.markdown === result.draft.markdown ? 'saved' : 'saving'); setNotice(pick(C.saved)); }
        await vaults.refresh();
      });
      queue.current = job.catch(() => {}); await job;
    } catch (e) { setError(e instanceof Error && e.message === 'WRITING_NOTE_CONFLICT' ? pick(C.noteConflict) : e instanceof Error && e.message === 'WRITING_DRAFT_CONFLICT' ? pick(C.rebase) : formatError(e)); }
    finally { if (mounted.current) setBusy(false); }
  }

  async function copy(task: 'whole' | 'section' | 'review') {
    const next = buildWritingPrompt({ task, title: draft?.title, type: metadata.type, audience: metadata.audience, markdown, sectionId: active.id, materials, locale: metadata.locale });
    setPrompt(next);
    try { await navigator.clipboard.writeText(next); setNotice(pick(C.copied)); } catch { setNotice(pick(C.prompt)); }
  }

  async function upload() {
    if (!draft || busy || !vaults.cloudAllowed) return;
    // Capture and register cancellation before any async preflight. An account
    // change while autosave/hash reads are pending must cancel this upload too.
    const request = new AbortController(), identity = vaults.identityKey, owner = vaults.ownerKey;
    uploadRequest.current = { controller: request, identity }; setBusy(true); setError('');
    try {
      await queue.current; request.signal.throwIfAborted();
      const snapshot = current.current; if (!snapshot) return;
      const hash = await sha256(snapshot.markdown); request.signal.throwIfAborted();
      if (snapshot.baseHash !== hash) throw new Error(pick(C.saveFirst));
      const vault = await getLocalVault(snapshot.vaultId); request.signal.throwIfAborted();
      if (!vault) throw new Error(pick(C.saveFirst));
      if (vault.files.find(f => f.id === snapshot.fileId)?.sha256 !== snapshot.baseHash) throw new Error(pick(C.noteConflict));
      if (identity !== userGeneration.current) return;
      await uploadVault(vault, owner, request.signal, () => {});
      request.signal.throwIfAborted(); if (identity !== userGeneration.current) return;
      setNotice(pick(C.uploaded)); await vaults.refresh();
    } catch (e) { if (!request.signal.aborted && identity === userGeneration.current) setError(formatError(e)); }
    finally { if (identity === userGeneration.current && mounted.current) setBusy(false); }
  }

  if (!draft) return <div className="page writing-page"><Link to={hrefFor('/library')}>{pick(C.back)}</Link><p role="status">{loaded ? error : pick(C.loading)}</p></div>;
  const status = metadata.statuses[active.id], applicability = metadata.applicability[active.id];
  const visibleSections = metadata.sections, optionalSections = WRITING_SECTIONS.filter(s => !visibleSections.some(v => v.id === s.id));
  const openSection = (id: string) => { update({ activeSection: id }); setMode('chapter'); setDrawer(null); };
  const chapterButton = (s: typeof WRITING_SECTIONS[number]) => <button key={s.id} className={`writing-chapter-button ${s.id === active.id ? 'selected' : ''}`} aria-current={s.id === active.id ? 'step' : undefined} onClick={() => openSection(s.id)}><span>{pick(s.title)}</span><small>{metadata.applicability[s.id] === 'applicable' ? pick(STATUS_LABELS[metadata.statuses[s.id]]) : pick(APPLICABILITY_LABELS[metadata.applicability[s.id]])}</small></button>;
  return <div className="page writing-page">
    <Link to={hrefFor('/library')}>{pick(C.back)}</Link>
    <header className="writing-header"><div><h1>{pick(C.title)}</h1><p>{draft.title}</p></div><div className="card-actions">
      <button className="button primary" disabled={busy || writingBlocked.current} onClick={() => void save()}>{pick(busy ? C.saving : C.save)}</button>
      <button className="button" onClick={() => download(markdown, draft.title)}>{pick(C.download)}</button>
      <button className="button" disabled={busy || !vaults.cloudAllowed} title={!vaults.cloudAllowed ? pick(C.uploadLogin) : undefined} onClick={() => void upload()}>{pick(C.upload)}</button>
      <Link className="button ghost" to={hrefFor(`/library?vault=${draft.vaultId}&note=${draft.fileId}&storage=browser`)}>{pick(C.back)}</Link>
    </div></header>
    <p className="writing-autosave" role="status">{pick(autoState === 'saving' ? C.autoSaving : autoState === 'saved' ? C.autoSaved : C.localFailure)}{draft.updatedAt && autoState === 'saved' ? ' · ' + new Date(draft.updatedAt).toLocaleTimeString(locale === 'en' ? 'en-US' : 'zh-CN') : ''}</p>
    {notice && <p className="notice" role="status">{notice}</p>}
    {error && <div className="error" role="alert"><p>{error}</p><div className="card-actions">
      <button className="button small" onClick={() => void queue.current.then(async () => { const latest = await getWritingDraft(draftId); if (latest) { epoch.current++; writingBlocked.current = false; install(latest); setError(''); setAutoState('saved'); } }).catch(e => setError(formatError(e)))}>{pick(C.reload)}</button>
      <button className="button small" onClick={() => void branchWritingDraft(current.current!).then(d => navigate(hrefFor('/library/write/' + d.id))).catch(e => setError(formatError(e)))}>{pick(C.branch)}</button>
    </div></div>}
    {draft.source && <p className="muted">{pick(C.source)}: {draft.source}</p>}
    {metadata.unknownRoles.length > 0 && <p className="notice writing-scope-warning" role="status">{pick(UNKNOWN_ROLE_WARNING)}</p>}
    {!!draft.warnings.length && <details className="card"><summary>{pick(C.brokenLinks)}</summary><ul>{draft.warnings.map(w => <li key={w}>{w}</li>)}</ul></details>}
    <div className="writing-mobile-tools"><button className="button" aria-expanded={drawer === 'contents'} onClick={() => setDrawer(drawer === 'contents' ? null : 'contents')}>{pick(C.contents)}</button><button className="button" aria-expanded={drawer === 'guidance'} onClick={() => setDrawer(drawer === 'guidance' ? null : 'guidance')}>{pick(C.guidance)}</button></div>
    <div className="writing-workspace">
      <aside className={`card writing-contents ${drawer === 'contents' ? 'writing-drawer-open' : ''}`} aria-label={pick(C.contents)}>
        <h2>{pick(C.contents)}</h2><p>{pick(C.coverage)}: {coverage.addressed}/{coverage.total}</p>
        <p className="muted">{pick(C.coreCoverage)}: {coverage.core.addressed}/{coverage.core.total} · {pick(C.expansionCoverage)}: {coverage.expansion.addressed}/{coverage.expansion.total}</p>
        <nav>{visibleSections.map(chapterButton)}</nav>
        <details className="writing-resources" open={optionalSections.some(s => s.id === active.id)}><summary>{pick(C.resources)} ({optionalSections.length})</summary><nav>{optionalSections.map(chapterButton)}</nav></details>
        <p className="muted">{pick(C.reviewBoundary)}</p>
        <label>{pick(C.kind)}<select aria-label={pick(C.kind)} value={typeChoice} onChange={e => setTypeChoice(e.target.value)}>{!WRITING_TYPES.some(t => t.id === typeChoice) && <option value={typeChoice}>{pick(writingType(typeChoice).title)}</option>}{WRITING_TYPES.map(t => <option value={t.id} key={t.id}>{pick(t.title)}</option>)}</select></label>
        <p className="muted">{pick(writingType(typeChoice).focus)}</p>
        <RoleChoices primary={typeChoice} roles={roleChoices} onChange={setRoleChoices} />
        <label>{pick(C.depth)}<select aria-label={pick(C.depth)} value={depthChoice} onChange={e => setDepthChoice(e.target.value as WritingDepth)}>{Object.entries(DEPTH_LABELS).map(([id, label]) => <option value={id} key={id}>{pick(label)}</option>)}</select></label>
        <button className="button small" onClick={() => setProposal({ base: markdown, type: typeChoice, roles: roleChoices, depth: depthChoice, markdown: supplementWritingDocument(markdown, { type: typeChoice, roles: roleChoices, depth: depthChoice, locale: metadata.locale }) })}>{pick(C.change)}</button>
        <small>{metadata.templateVersion || '—'} / {TEMPLATE_VERSION}</small>
      </aside>
      <section className="card writing-editor" aria-label={pick(C.title)}>
        <div className="writing-mode-tabs" role="group" aria-label={pick(C.title)}>{(['chapter', 'full', 'preview'] as const).map(m => <button className={`button small ${mode === m ? 'primary' : 'ghost'}`} aria-pressed={mode === m} key={m} onClick={() => setMode(m)}>{pick(C[m])}</button>)}</div>
        {mode === 'preview' ? <WritingPreview draft={draft} markdown={deferred} /> : mode === 'full' ? <label className="writing-text-label">{pick(C.full)}<textarea className="writing-textarea" spellCheck={false} value={markdown} onChange={e => update({ markdown: e.target.value })} /></label> : <>
          <h2>{pick(active.title)}</h2>
          <p className="muted">{pick(C.scopeHint)}</p>
          <label>{pick(C.applicability)}<select aria-label={pick(C.applicability)} value={applicability} onChange={e => {
            const value = e.target.value as Applicability;
            const next = value === 'applicable' && !range && !metadata.coveredBy[active.id] ? addWritingSection(markdown, active.id) : markdown;
            update({ markdown: updateDocumentMetadata(next, { [`mcs-applicability-${active.id}`]: value }) });
          }}>{APPLICABILITIES.map(a => <option key={a} value={a} disabled={CORE_SECTIONS.includes(active.id) && (a === 'na' || a === 'deferred')}>{pick(APPLICABILITY_LABELS[a])}</option>)}</select></label>
          {applicability !== 'applicable' && <label>{pick(C.reason)}<textarea rows={2} value={metadata.reasons[active.id]} onChange={e => update({ markdown: updateDocumentMetadata(markdown, { [`mcs-reason-${active.id}`]: e.target.value }) })} /></label>}
          <label>{pick(C.coveredBy)}<select aria-label={pick(C.coveredBy)} value={metadata.coveredBy[active.id]} onChange={e => update({ markdown: updateDocumentMetadata(markdown, { [`mcs-covered-${active.id}`]: e.target.value }) })}><option value="">{pick(C.standalone)}</option>{WRITING_SECTIONS.filter(s => s.id !== active.id && (located.sections[s.id] || metadata.coveredBy[active.id] === s.id)).map(s => <option key={s.id} value={s.id}>{pick(s.title)}</option>)}</select></label>
          <label>{pick(C.state)}<select aria-label={pick(C.state)} value={status} onChange={e => update({ markdown: updateDocumentMetadata(markdown, { [`mcs-status-${active.id}`]: e.target.value as WritingStatus }) })}>{WRITING_STATUSES.map(s => <option value={s} key={s}>{pick(STATUS_LABELS[s])}</option>)}</select></label>
          {metadata.coveredBy[active.id] ? <p className="notice">{pick(C.sharedContent)} <button className="link-button" onClick={() => openSection(metadata.coveredBy[active.id])}>{pick(C.goCovered)}</button></p> : range ? <label className="writing-text-label">{pick(active.title)}<textarea className="writing-textarea" value={range.content.replace(/\n\n$/, '')} onChange={e => { let next = replaceWritingSection(markdown, active.id, e.target.value); if (status === 'empty' || status === 'reviewed') next = updateDocumentMetadata(next, { [`mcs-status-${active.id}`]: 'writing' }); update({ markdown: next }); }} /></label> : <div className="notice"><p>{pick(located.issues.some(i => i.sectionId === active.id && i.message === 'duplicate') ? C.duplicate : C.scopeHint)}</p><button className="button small" disabled={Object.hasOwn(located.sections, active.id)} onClick={() => update({ markdown: addWritingSection(markdown, active.id) })}>{pick(C.addSection)}</button></div>}
        </>}
        <details className="writing-checks"><summary>{pick(C.checks)} ({checks.length})</summary><ul>{checks.map((c, i) => <li key={`${c.sectionId}:${c.message}:${i}`}><button className="link-button" onClick={() => { if (c.sectionId) update({ activeSection: c.sectionId }); setMode(c.category === 'structure' ? 'full' : 'chapter'); }}>{WRITING_SECTIONS.find(s => s.id === c.sectionId) ? pick(WRITING_SECTIONS.find(s => s.id === c.sectionId)!.title) + ': ' : ''}{pick(C[c.message as keyof typeof C] ?? C.pending)}</button></li>)}</ul></details>
      </section>
      <aside className={`card writing-guidance ${drawer === 'guidance' ? 'writing-drawer-open' : ''}`} aria-label={pick(C.guidance)}>
        <h2>{pick(C.guidance)}</h2><p className="muted">{pick(APPLICABILITY_LABELS[applicability])} · {pick(C.scopeHint)}</p><h3>{pick(C.purpose)}</h3><p>{pick(active.purpose)}</p>
        <h3>{pick(C.questions)}</h3><ul>{active.questions.map((q, i) => <li key={i}>{pick(q)}</li>)}</ul>
        <details><summary>{pick(C.example)}</summary><p className="muted">{pick(C.reconstruction)}</p><p>{pick(active.example)}</p><p className="error">{pick(active.pitfall)}</p></details>
        <details><summary>{pick(C.starter)}</summary><pre>{dt(active.starter)}</pre><button className="button small" disabled={!range || mode !== 'chapter'} onClick={() => update({ markdown: replaceWritingSection(markdown, active.id, (range?.content.trimEnd() ?? '') + '\n\n' + dt(active.starter)) })}>{pick(C.insert)}</button></details>
        <h3>{pick(C.check)}</h3><ul>{active.checks.map((q, i) => <li key={i}>{pick(q)}</li>)}</ul><ul>{metadata.roles.map(id => <li key={id}>{pick(writingType(id).checks)}</li>)}</ul>
        <label>{pick(C.customChecks)}<textarea rows={3} value={metadata.customChecks} onChange={e => update({ markdown: updateDocumentMetadata(markdown, { 'mcs-custom-checks': e.target.value }) })} /></label>
        <div className="writing-prompt-actions"><button className="button small" onClick={() => void copy('whole')}>{pick(C.copyWhole)}</button><button className="button small" onClick={() => void copy('section')}>{pick(C.copySection)}</button><button className="button small" onClick={() => void copy('review')}>{pick(C.copyReview)}</button></div>
        <p className="muted">{pick(C.promptHint)}</p><details><summary>{pick(C.materials)}</summary><textarea aria-label={pick(C.materials)} value={materials} onChange={e => { setMaterials(e.target.value); update({ materials: e.target.value }); }} rows={4} /></details>
      </aside>
    </div>
    {proposal && <section className="card writing-proposal" aria-label={pick(C.change)}><h2>{pick(C.change)}</h2><p>{pick(C.changeHint)}</p><p>{documentMetadata(proposal.markdown).sections.filter(s => !Object.hasOwn(located.sections, s.id) && !metadata.coveredBy[s.id]).map(s => pick(s.title)).join(' · ') || pick(C.kind) + ': ' + pick(writingType(proposal.type).title)}</p><details><summary>{pick(C.full)}</summary><pre>{proposal.markdown}</pre></details><button className="button primary" onClick={() => {
      const live = current.current!.markdown;
      if (live !== proposal.base) { setProposal({ ...proposal, base: live, markdown: supplementWritingDocument(live, { type: proposal.type, roles: proposal.roles, depth: proposal.depth }) }); setNotice(pick(C.proposalStale)); return; }
      update({ markdown: proposal.markdown }); setProposal(null);
    }}>{pick(C.apply)}</button><button className="button ghost" onClick={() => setProposal(null)}>{pick(C.cancel)}</button></section>}
    {prompt && <section className="card writing-prompt-preview"><h2>{pick(C.prompt)}</h2><textarea readOnly aria-label={pick(C.prompt)} value={prompt} rows={10} onFocus={e => e.target.select()} /><button className="button ghost" onClick={() => setPrompt('')}>{pick(C.cancel)}</button></section>}
  </div>;
}
