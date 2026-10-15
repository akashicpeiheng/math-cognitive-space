import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Link, useLocation } from 'react-router-dom';
import { api, ApiError, formatError } from './api';
import { useAuth } from './auth';
import { useI18n } from './i18n';
import { Markdown } from './components/Markdown';
import type { ConnectionTarget } from './connection-display';
import type { Locale } from './i18n/locales';

function noteError(reason: unknown, locale: Locale) {
  if (reason instanceof ApiError && reason.code === 'REVISION_CONFLICT') return locale === 'en'
    ? 'This note changed in another page. Reload the notes before trying again.'
    : '这条备注已在其他页面修改。请重新载入备注后再试。';
  if (locale === 'en') return `Could not read or update notes. Please try again.${reason instanceof ApiError ? ` (${reason.code})` : ''}`;
  return formatError(reason);
}

export interface ConnectionNoteView { key: string; body: string; revision: number; createdAt: string; updatedAt: string }
const COPY = {
  zh: { mine: '我的备注', add: '添加备注', edit: '编辑备注', remove: '取消备注', save: '保存备注', close: '关闭', loading: '正在读取备注…', login: '登录后添加个人备注', retry: '重新载入备注', placeholder: '用自己的话说明这条连接；支持 Markdown 与数学公式。', deleted: '备注已取消', undo: '撤销', latest: '其他页面当前保存的内容', reloaded: '已读取最新修订。当前输入保留，再次保存将使用当前输入。', busy: '处理中…', menu: '连接备注菜单' },
  en: { mine: 'My note', add: 'Add note', edit: 'Edit note', remove: 'Remove note', save: 'Save note', close: 'Close', loading: 'Loading notes…', login: 'Sign in to add personal notes', retry: 'Reload notes', placeholder: 'Explain this connection in your own words; Markdown and mathematical formulas are supported.', deleted: 'Note removed', undo: 'Undo', latest: 'Content currently saved in another page', reloaded: 'Latest revision loaded. Your input is retained; saving again will use your current input.', busy: 'Working…', menu: 'Connection notes menu' },
};

interface NotesContextValue {
  notes: Map<string, ConnectionNoteView>; available: boolean; authReady: boolean; ready: boolean; error: string;
  refresh: () => Promise<Map<string, ConnectionNoteView>>;
  edit: (target: ConnectionTarget) => void;
  inspect: (target: ConnectionTarget) => void;
  put: (key: string, body: string, revision: number) => Promise<void>;
  remove: (note: ConnectionNoteView) => Promise<void>;
}
const NotesContext = createContext<NotesContextValue | null>(null);
export function useConnectionNotes() {
  const context = useContext(NotesContext);
  if (!context) throw new Error('ConnectionNotesProvider is required');
  return context;
}

export function ConnectionNotesProvider({ children }: { children: ReactNode }) {
  const auth = useAuth();
  const location = useLocation();
  const { locale } = useI18n();
  const text = COPY[locale];
  const owner = auth.ready ? auth.mode === 'local' ? 'local' : auth.user?.id ?? null : null;
  const scope = `${owner ?? 'guest'}:${auth.identityKey}`;
  const scopeRef = useRef(scope); scopeRef.current = scope;
  const readRef = useRef<AbortController | null>(null);
  const mutationControllers = useRef(new Set<AbortController>());
  const generation = useRef(0);
  const [state, setState] = useState({ scope, notes: new Map<string, ConnectionNoteView>(), ready: false, error: '' });
  const [editor, setEditor] = useState<{ scope: string; target: ConnectionTarget; viewOnly?: boolean } | null>(null);
  const [undos, setUndos] = useState<Array<{ scope: string; note: ConnectionNoteView; revision: number; expires: number }>>([]);
  const [undoError, setUndoError] = useState('');
  const [undoBusy, setUndoBusy] = useState(new Set<string>());

  const refresh = useCallback(async () => {
    readRef.current?.abort();
    const controller = new AbortController(); readRef.current = controller;
    const turn = ++generation.current;
    if (!owner) return new Map<string, ConnectionNoteView>();
    try {
      const result = await api<{ ownerId: string; notes: ConnectionNoteView[] }>('/me/connection-notes', { signal: controller.signal });
      // Cookies may have changed in another tab while this page still shows the old identity.
      if (result.ownerId !== owner) {
        if (scopeRef.current === scope && !controller.signal.aborted && turn === generation.current) {
          setState({ scope, notes: new Map(), ready: false, error: '' }); setEditor(null); setUndos([]);
          await auth.refresh();
        }
        return new Map<string, ConnectionNoteView>();
      }
      const notes = new Map(result.notes.map(note => [note.key, note]));
      if (scopeRef.current === scope && turn === generation.current && !controller.signal.aborted) setState({ scope, notes, ready: true, error: '' });
      return notes;
    } catch (error) {
      if (error instanceof ApiError && error.code === 'AUTH_REQUIRED' && scopeRef.current === scope && !controller.signal.aborted) {
        setState({ scope, notes: new Map(), ready: false, error: noteError(error, locale) }); setEditor(null); setUndos([]);
        await auth.refresh();
        throw error;
      }
      if (!controller.signal.aborted && scopeRef.current === scope && turn === generation.current) setState(current => ({
        scope, notes: current.scope === scope ? current.notes : new Map(), ready: current.scope === scope && current.ready, error: noteError(error, locale),
      }));
      throw error;
    }
  }, [owner, scope, locale, auth.refresh]);

  useEffect(() => {
    setState({ scope, notes: new Map(), ready: false, error: '' });
    setEditor(null); setUndos([]); setUndoError(''); setUndoBusy(new Set());
    return () => {
      readRef.current?.abort(); generation.current++;
      mutationControllers.current.forEach(controller => controller.abort()); mutationControllers.current.clear();
    };
  }, [scope]);
  useEffect(() => {
    if (owner) void refresh().catch(() => {});
    const focus = () => { if (owner) void refresh().catch(() => {}); };
    window.addEventListener('focus', focus);
    return () => { window.removeEventListener('focus', focus); readRef.current?.abort(); };
  }, [refresh, owner, location.pathname]);
  useEffect(() => {
    if (!undos.length) return;
    const timer = window.setTimeout(() => setUndos(current => current.filter(item => item.expires > Date.now())), Math.max(0, Math.min(...undos.map(item => item.expires)) - Date.now()));
    return () => clearTimeout(timer);
  }, [undos]);

  const mutate = async <T,>(key: string, method: string, body: unknown): Promise<T> => {
    const controller = new AbortController(); mutationControllers.current.add(controller);
    // A pending GET must not replace the result of a newer write.
    readRef.current?.abort(); generation.current++;
    try { return await api<T>(`/me/connection-notes/${encodeURIComponent(key)}`, { method, body, signal: controller.signal }); }
    finally { mutationControllers.current.delete(controller); }
  };
  const put = async (key: string, body: string, baseRevision: number) => {
    const { note } = await mutate<{ note: ConnectionNoteView }>(key, 'PUT', { body, baseRevision });
    if (scopeRef.current !== scope) return;
    readRef.current?.abort(); generation.current++;
    setState(current => ({ scope, notes: new Map(current.scope === scope ? current.notes : []).set(key, note), ready: true, error: '' }));
    setUndos(current => current.filter(item => item.note.key !== key));
  };
  const remove = async (note: ConnectionNoteView) => {
    const result = await mutate<{ revision: number }>(note.key, 'DELETE', { baseRevision: note.revision });
    if (scopeRef.current !== scope) return;
    readRef.current?.abort(); generation.current++;
    setState(current => { const notes = new Map(current.scope === scope ? current.notes : []); notes.delete(note.key); return { scope, notes, ready: true, error: '' }; });
    setUndos(current => [...current.filter(item => item.note.key !== note.key), { scope, note, revision: result.revision, expires: Date.now() + 10_000 }]);
    setUndoError('');
  };
  const notes = state.scope === scope && owner ? state.notes : new Map<string, ConnectionNoteView>();
  return <NotesContext.Provider value={{ notes, available: Boolean(owner), authReady: auth.ready, ready: state.scope === scope && state.ready, error: state.scope === scope ? state.error : '', refresh,
    edit: target => setEditor({ scope, target }), inspect: target => setEditor({ scope, target, viewOnly: true }), put, remove }}>
    {children}
    {editor?.scope === scope && owner && createPortal(<ConnectionNoteEditor key={`${scope}:${editor.target.key}:${editor.viewOnly}`} target={editor.target} viewOnly={editor.viewOnly} onClose={() => setEditor(current => current?.scope === scope ? null : current)} />, document.fullscreenElement ?? document.body)}
    {undos.some(item => item.scope === scope) && createPortal(<div className="connection-note-undo" role="status">
      {undos.filter(item => item.scope === scope).map(item => <div key={item.note.key}><span>{text.deleted}</span> <button type="button" disabled={undoBusy.has(item.note.key)} onClick={async () => {
        setUndoBusy(current => new Set(current).add(item.note.key));
        try { await put(item.note.key, item.note.body, item.revision); }
        catch (error) { if (scopeRef.current === scope) setUndoError(noteError(error, locale)); }
        finally { if (scopeRef.current === scope) setUndoBusy(current => { const next = new Set(current); next.delete(item.note.key); return next; }); }
      }}>{text.undo}</button></div>)}
      {undoError && <p role="alert">{undoError}</p>}
    </div>, document.fullscreenElement ?? document.body)}
  </NotesContext.Provider>;
}

function ConnectionNoteEditor({ target, onClose, viewOnly = false }: { target: ConnectionTarget; onClose: () => void; viewOnly?: boolean }) {
  const { notes, put, refresh, remove, edit } = useConnectionNotes();
  const { locale } = useI18n(); const text = COPY[locale];
  const initial = notes.get(target.key);
  const [body, setBody] = useState(initial?.body ?? '');
  const [revision, setRevision] = useState(initial?.revision ?? 0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [conflict, setConflict] = useState(false);
  const [remoteBody, setRemoteBody] = useState<string | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => { dialog.current?.showModal(); }, []);
  if (viewOnly) return <dialog ref={dialog} className="connection-note-dialog" aria-labelledby="connection-note-editor-title" onCancel={event => { event.preventDefault(); if (!busy) onClose(); }}>
    <h2 id="connection-note-editor-title">{text.mine} · {target.label}</h2><Markdown>{initial?.body ?? body}</Markdown>
    {error && <p role="alert">{error}</p>}
    <div className="card-actions"><button type="button" disabled={busy} onClick={() => edit(target)}>{text.edit}</button>
      {initial && <button type="button" disabled={busy} onClick={async () => { setBusy(true); try { await remove(initial); onClose(); } catch (reason) { setError(noteError(reason, locale)); } finally { setBusy(false); } }}>{text.remove}</button>}
      {error && <button type="button" disabled={busy} onClick={async () => { setBusy(true); try { await refresh(); setError(''); } catch (reason) { setError(noteError(reason, locale)); } finally { setBusy(false); } }}>{text.retry}</button>}
      <button type="button" autoFocus disabled={busy} onClick={onClose}>{text.close}</button></div>
  </dialog>;
  return <dialog ref={dialog} className="connection-note-dialog" aria-labelledby="connection-note-editor-title" onCancel={event => { event.preventDefault(); if (!busy) onClose(); }}>
    <form onSubmit={async event => {
      event.preventDefault(); if (busy) return;
      setBusy(true); setError('');
      try { await put(target.key, body, revision); onClose(); }
      catch (reason) { setError(noteError(reason, locale)); setConflict(reason instanceof ApiError && reason.code === 'REVISION_CONFLICT'); }
      finally { setBusy(false); }
    }}>
      <h2 id="connection-note-editor-title">{text.mine} · {target.label}</h2>
      <label className="connection-note-input">{text.mine}<textarea autoFocus rows={6} maxLength={4000} value={body} placeholder={text.placeholder} disabled={busy} onChange={event => setBody(event.target.value)} /></label>
      <span className="muted">{body.length} / 4000</span>
      {error && <p role="alert">{error}</p>}
      {conflict && <button type="button" disabled={busy} onClick={async () => {
        setBusy(true);
        try { const latest = (await refresh()).get(target.key); setRevision(latest?.revision ?? 0); setRemoteBody(latest?.body ?? ''); setConflict(false); setError(text.reloaded); }
        catch (reason) { setError(noteError(reason, locale)); }
        finally { setBusy(false); }
      }}>{text.retry}</button>}
      {remoteBody !== null && <details open><summary>{text.latest}</summary><Markdown>{remoteBody}</Markdown></details>}
      <div className="card-actions"><button type="submit" disabled={busy || !body.trim()}>{busy ? text.busy : text.save}</button><button type="button" disabled={busy} onClick={onClose}>{text.close}</button></div>
    </form>
  </dialog>;
}

export function ConnectionNote({ target, actions = false }: { target: ConnectionTarget; actions?: boolean }) {
  const { notes, edit, available, authReady, ready, error, refresh, remove } = useConnectionNotes();
  const { locale, hrefFor } = useI18n(); const text = COPY[locale];
  const location = useLocation();
  const note = notes.get(target.key);
  const [busy, setBusy] = useState(false); const [failure, setFailure] = useState('');
  if (!note && !actions) return null;
  return <div className="connection-note" data-connection-key={target.key}>
    {note && <details><summary><strong>{text.mine}</strong> · {target.label}<span className="connection-note-summary">{note.body}</span></summary><Markdown>{note.body}</Markdown></details>}
    {actions && (!authReady ? <span>{text.loading}</span> : available ? <div className="connection-note-actions">
      <button type="button" disabled={!ready || busy} onClick={() => edit(target)}>{note ? text.edit : text.add}</button>
      {note && <button type="button" disabled={busy} onClick={async () => {
        setBusy(true); setFailure('');
        try { await remove(note); } catch (reason) { setFailure(noteError(reason, locale)); } finally { setBusy(false); }
      }}>{text.remove}</button>}
      {!ready && !error && <span>{text.loading}</span>}
      {error && <button type="button" onClick={() => void refresh().catch(() => {})}>{text.retry}</button>}
    </div> : <Link to={hrefFor(`/login?next=${encodeURIComponent(location.pathname + location.search)}`)}>{text.login}</Link>)}
    {(failure || (actions && error)) && <p role="alert">{failure || error}</p>}
    {failure && <button type="button" disabled={busy} onClick={async () => { setBusy(true); try { await refresh(); setFailure(''); } catch (reason) { setFailure(noteError(reason, locale)); } finally { setBusy(false); } }}>{text.retry}</button>}
  </div>;
}

export function ConnectionMenu({ targets, x, y, onClose }: { targets: ConnectionTarget[]; x: number; y: number; onClose: () => void }) {
  const { locale } = useI18n(); const text = COPY[locale];
  const element = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    element.current?.querySelector<HTMLElement>('button, a')?.focus();
    const outside = (event: PointerEvent) => { if (!element.current?.contains(event.target as Node)) onClose(); };
    const keyboard = (event: KeyboardEvent) => {
      if (document.querySelector('.connection-note-dialog[open]')) return;
      if (event.key === 'Escape') { event.preventDefault(); onClose(); previous?.focus(); }
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        const items = [...(element.current?.querySelectorAll<HTMLElement>('button:not(:disabled), a') ?? [])];
        if (items.length) { event.preventDefault(); const index = items.indexOf(document.activeElement as HTMLElement); items[(index + (event.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length].focus(); }
      }
    };
    document.addEventListener('pointerdown', outside); document.addEventListener('keydown', keyboard);
    return () => { document.removeEventListener('pointerdown', outside); document.removeEventListener('keydown', keyboard); };
  }, [onClose]);
  return <div ref={element} className="connection-menu" role="dialog" aria-label={text.menu} style={{ left: x, top: y }} onPointerDown={event => event.stopPropagation()}>
    <div className="connection-menu-head"><strong>{text.menu}</strong><button type="button" onClick={onClose} aria-label={text.close}>×</button></div>
    {targets.map(target => <section key={target.key}><strong>{target.label}</strong>{target.detail && <p className="connection-menu-detail">{target.detail}</p>}<ConnectionNote target={target} actions /></section>)}
  </div>;
}
