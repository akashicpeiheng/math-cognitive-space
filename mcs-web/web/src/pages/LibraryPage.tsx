import { networkReturnHref, openInNetworkHref, restoreNetworkReturn } from '../network-return';
import { nodeRefKey } from '../../../shared/network-workspace.mjs';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { api, formatError, useApi } from '../api';
import { useI18n } from '../i18n';
import { useVaults } from '../vault-context';
import { commitLocalVault, exportLocalVault, getLocalValue, getLocalVault, linkLocalNote, listLocalHistory, prepareVault, putLocalValue, removeLocalVault, scanDirectory, scanVault } from '../vault-local';
import type { PreparedVault, ReadableDirectory, VaultScan } from '../vault-local';
import { readVaultFile, uploadVault } from '../vault-cloud';
import { VaultAttachment, VaultDocument } from '../components/VaultDocument';
import { VaultNoteTree } from '../components/VaultNoteTree';
import { parseVaultNote, resolveVaultLink, VAULT_LIMITS, vaultAnchor } from '../../../shared/vault.mjs';
import type { Vault, VaultFile, VaultLimits, VaultRevision } from '../../../shared/vault.mjs';
import type { NodeSummary } from '../types';

const sizeLabel = (bytes: number) => bytes >= 1024 ** 2 ? `${(bytes / 1024 ** 2).toFixed(1)} MiB` : `${Math.ceil(bytes / 1024)} KiB`;
export function LibraryPage() {
  const { pick, hrefFor } = useI18n(), vaults = useVaults();
  const [params, setParams] = useSearchParams(), navigate = useNavigate(), location = useLocation();
  const id = params.get('vault'), storage = params.get('storage') === 'account' ? 'account' : 'browser';
  const noteId = params.get('note'), revisionParam = params.get('revision');
  const noteNetworkKey = id && noteId ? nodeRefKey({ source: 'vault', storage, vaultId: id, fileId: noteId, revision: 1, sha256: '0'.repeat(64) }) : '';
  const backToNetwork = params.get('from') === 'network' ? networkReturnHref(noteNetworkKey, 'en' === (location.pathname.startsWith('/en/') ? 'en' : 'zh') ? 'en' : 'zh') ?? hrefFor(openInNetworkHref(noteNetworkKey)) : null;
  const identityRef = useRef(vaults.identityKey); identityRef.current = vaults.identityKey;
  const [loaded, setLoaded] = useState<{ key: string; vault: Vault } | null>(null);
  const [history, setHistory] = useState<VaultRevision[]>([]);
  const [error, setError] = useState<string | null>(null), [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false), [progress, setProgress] = useState('');
  const [scan, setScan] = useState<VaultScan | null>(null), [selected, setSelected] = useState<Set<string>>(new Set());
  const [prepared, setPrepared] = useState<PreparedVault | null>(null);
  const [query, setQuery] = useState(''), [matches, setMatches] = useState<Set<string> | null>(null), [searching, setSearching] = useState(false);
  const [backlinks, setBacklinks] = useState<VaultFile[]>([]), [nodeQuery, setNodeQuery] = useState('');
  const [reload, setReload] = useState(0), [removeConfirm, setRemoveConfirm] = useState(false);
  const input = useRef<HTMLInputElement>(null), request = useRef<AbortController | null>(null), refreshTarget = useRef<Vault | undefined>(undefined);
  const capabilities = useApi<{ limits: VaultLimits }>('/vault-capabilities');
  const graph = useApi<{ nodes: NodeSummary[] }>('/ontology/graph');
  const limits = capabilities.data?.limits ?? VAULT_LIMITS;
  const listed = (storage === 'account' ? vaults.cloud : vaults.local).find(v => v.id === id);
  const key = `${storage}:${id}:${revisionParam ?? listed?.revision ?? ''}:${storage === 'account' ? vaults.identityKey : 'browser'}`;
  const vault = loaded?.key === key && (storage === 'browser' || vaults.cloudAllowed) ? loaded.vault : null;
  const file = vault?.files.find(f => f.id === noteId) ?? vault?.files.find(f => f.kind === 'note');
  const historical = Boolean(revisionParam);
  useEffect(() => {
    request.current?.abort(); refreshTarget.current = undefined; setError(null); setNotice(null); setBusy(false); setProgress('');
    if (storage === 'account') { setLoaded(null); setHistory([]); setMatches(null); setBacklinks([]); setQuery(''); }
    setPrepared(null); setScan(null);
  }, [vaults.identityKey]);
  useEffect(() => () => { request.current?.abort(); }, []);
  useEffect(() => {
    if (!id || (storage === 'account' && !vaults.cloudAllowed)) { setLoaded(null); return; }
    let active = true; const controller = new AbortController(); setError(null); setRemoveConfirm(false);
    const load = async () => {
      if (storage === 'browser') {
        const v = await getLocalVault(id); if (!v) throw new Error('Library no longer exists');
        const revisions = await listLocalHistory(id);
        const snapshot = revisionParam ? revisions.find(r => r.revision === Number(revisionParam)) : null;
        if (revisionParam && !snapshot) throw new Error('Revision no longer exists');
        if (active) { setLoaded({ key, vault: snapshot ? { ...v, revision: snapshot.revision, files: snapshot.files } : v }); setHistory(revisions); }
      } else {
        const [v, h] = await Promise.all([api<{ vault: Vault }>(`/me/vaults/${id}${revisionParam ? '?revision=' + revisionParam : ''}`, { signal: controller.signal }), api<{ revisions: Array<{ revision: number; created_at: string }> }>(`/me/vaults/${id}/history`, { signal: controller.signal })]);
        if (active) { setLoaded({ key, vault: v.vault }); setHistory(h.revisions.map(r => ({ revision: Number(r.revision), createdAt: r.created_at, files: [] }))); }
      }
    };
    void load().catch(e => { if (active && !controller.signal.aborted) setError(formatError(e)); });
    return () => { active = false; controller.abort(); };
  }, [key, reload, vaults.cloudAllowed]);
  const openFile = useCallback((f: VaultFile, fragment = '') => {
    const next = new URLSearchParams(params); next.set('note', f.id);
    navigate(`${hrefFor('/library')}?${next}${fragment ? '#' + encodeURIComponent(vaultAnchor(fragment)) : ''}`);
  }, [params, navigate, hrefFor]);
  useEffect(() => {
    let active = true; const controller = new AbortController(); setMatches(null); setSearching(false);
    if (!vault || !query.trim()) return;
    const needle = query.trim().toLocaleLowerCase(); const found = new Set<string>();
    const timer = setTimeout(() => {
      setSearching(true);
      const search = async () => {
        for (const f of vault.files.filter(f => f.kind === 'note')) {
          if (!active) return;
          if ([f.path, f.title, ...(f.tags ?? []), ...(f.aliases ?? [])].join('\n').toLocaleLowerCase().includes(needle)) found.add(f.id);
          else if (f.size <= limits.markdownBytes) {
            const text = await (await readVaultFile(vault, f, controller.signal)).text();
            if (text.toLocaleLowerCase().includes(needle)) found.add(f.id);
          }
        }
        if (active) { setMatches(found); setSearching(false); }
      };
      void search().catch(e => { if (active) { setSearching(false); setError(formatError(e)); } });
    }, 200);
    return () => { active = false; controller.abort(); clearTimeout(timer); };
  }, [vault, query, limits.markdownBytes]);
  useEffect(() => {
    let active = true; const controller = new AbortController(); setBacklinks([]);
    if (!vault || !file) return;
    const run = async () => {
      const incoming: VaultFile[] = [];
      for (const f of vault.files.filter(f => f.kind === 'note' && f.id !== file.id)) {
        if (!active) return;
        const note = parseVaultNote(await (await readVaultFile(vault, f, controller.signal)).text(), f.path);
        if (note.links.some(link => { const targets = resolveVaultLink(vault.files, f.path, link); return targets.length === 1 && targets[0].id === file.id; })) incoming.push(f);
      }
      if (active) setBacklinks(incoming);
    };
    void run().catch(e => { if (active) setError(formatError(e)); });
    return () => { active = false; controller.abort(); };
  }, [vault, file?.id]);

  async function act(fn: (signal: AbortSignal) => Promise<void>) {
    if (busy || vaults.identityKey !== identityRef.current) return;
    const controller = new AbortController(); request.current?.abort(); request.current = controller;
    const identity = vaults.identityKey; setBusy(true); setError(null); setNotice(null);
    try { await fn(controller.signal); }
    catch (e) { if (!controller.signal.aborted && identity === identityRef.current) setError(formatError(e)); }
    finally { if (identity === identityRef.current) { setBusy(false); setProgress(''); } }
  }
  function showScan(next: VaultScan) {
    setScan(next); setPrepared(null); setSelected(new Set(next.files.filter(f => f.kind === 'note').map(f => f.path)));
  }
  async function chooseFolder(target?: Vault) {
    refreshTarget.current = target;
    const picker = (window as unknown as { showDirectoryPicker?: (options: { mode: 'read' }) => Promise<ReadableDirectory> }).showDirectoryPicker;
    if (!picker) { input.current?.click(); return; }
    // Open directly in the click gesture; scanning follows the browser's permission decision.
    let handle: ReadableDirectory;
    try { handle = await picker({ mode: 'read' }); } catch (e) { if ((e as DOMException).name !== 'AbortError') setError(formatError(e)); return; }
    await act(async signal => { setProgress(pick({ zh: '扫描笔记目录…', en: 'Scanning notes…' })); const result = await scanDirectory(handle, limits); signal.throwIfAborted(); showScan(result); });
  }
  async function rescan() {
    if (!vault) return; refreshTarget.current = vault;
    const handle = vault.storage === 'browser' ? await getLocalValue<ReadableDirectory>('handles', vault.id) : undefined;
    if (!handle) { await chooseFolder(vault); return; }
    try {
      if (await handle.queryPermission({ mode: 'read' }) !== 'granted' && await handle.requestPermission({ mode: 'read' }) !== 'granted') { await chooseFolder(vault); return; }
      await act(async signal => { const result = await scanDirectory(handle, limits); signal.throwIfAborted(); showScan(result); });
    } catch (e) { setError(formatError(e)); }
  }
  async function commit() {
    if (!prepared) return;
    await act(async signal => {
      const previous = refreshTarget.current;
      if (previous?.storage === 'account') for (const f of prepared.files) if (!prepared.blobs.has(f.sha256)) { signal.throwIfAborted(); prepared.blobs.set(f.sha256, await readVaultFile(previous, f, signal)); }
      signal.throwIfAborted();
      const next = await commitLocalVault(prepared, previous?.storage === 'browser' ? previous : undefined, limits);
      signal.throwIfAborted();
      if (previous?.storage === 'account') await putLocalValue('pending', [vaults.ownerKey, next.id], { cloudId: previous.id, revision: previous.revision });
      await vaults.refresh(); signal.throwIfAborted(); setScan(null); setPrepared(null); refreshTarget.current = undefined;
      setParams({ vault: next.id, storage: 'browser', ...(file && next.files.some(f => f.id === file.id) ? { note: file.id } : {}) }); setNotice(pick({ zh: '已保存到当前浏览器。需要跨设备使用时，可主动上传到账号。', en: 'Saved in this browser. Upload to your account to use it on other devices.' }));
    });
  }
  async function changeLinks(nodeIds: string[]) {
    if (!vault || !file || historical) return;
    await act(async signal => {
      if (vault.storage === 'browser') await linkLocalNote(vault, file.id, nodeIds);
      else await api(`/me/vaults/${vault.id}/files/${file.id}/nodes`, { method: 'PUT', body: { baseRevision: vault.revision, nodeIds }, signal });
      signal.throwIfAborted(); await vaults.refresh(); setReload(n => n + 1);
    });
  }
  async function writeFromNote(copy: boolean) {
    if (!vault || !file || file.kind !== 'note') return;
    await act(async signal => {
      const writer = await import('../writing-store'); signal.throwIfAborted();
      const local = !copy && vault.storage === 'account' ? await writer.fetchWritingLibrary(vault, vaults.ownerKey, signal) : vault;
      signal.throwIfAborted();
      const draft = copy ? await writer.copyWritingNote(vault, file, signal) : await writer.editWritingNote(local, local.files.find(f => f.id === file.id)!);
      signal.throwIfAborted(); await vaults.refresh(); navigate(hrefFor('/library/write/' + draft.id));
    });
  }
  const notes = vault?.files.filter(f => f.kind === 'note' && (!query.trim() || !matches || matches.has(f.id))) ?? [];
  const groups = new Map<string, VaultFile[]>();
  for (const f of scan?.files.filter(f => f.kind === 'note') ?? []) { const group = f.path.split('/').slice(0, -1).join('/') || '/'; groups.set(group, [...(groups.get(group) ?? []), f]); }
  return <div className="page library-page">
    {backToNetwork && <Link className="button" to={backToNetwork} onClick={() => restoreNetworkReturn(noteNetworkKey)}>{pick({ zh: '回到网络视图', en: 'Back to the network' })}</Link>}
    <div className="section-heading"><h1>{pick({ zh: '我的笔记库', en: 'My note libraries' })}</h1><p>{pick({ zh: '把已有的 Obsidian 笔记带到学习现场：先在浏览器阅读，再把相关笔记放到对应的数学节点旁。', en: 'Bring your Obsidian notes into your study: read them in this browser and link relevant notes to mathematical nodes.' })}</p></div>
    <section className="card library-toolbar"><Link className="button primary" to={hrefFor('/library/write/new')}>{pick({ zh: '新建笔记', en: 'New note' })}</Link>
      <button className="button" disabled={busy} onClick={() => void chooseFolder()}>{pick({ zh: '选择 Obsidian 库', en: 'Choose Obsidian vault' })}</button>
      <button className="button" disabled={busy} onClick={() => void vaults.refresh()}>{pick({ zh: '重新载入', en: 'Reload' })}</button>
      {busy && <button className="button" onClick={() => request.current?.abort()}>{pick({ zh: '取消操作', en: 'Cancel operation' })}</button>}
      <p className="muted">{pick({ zh: '默认存于当前浏览器，源文件只读；需要更新时重新扫描。上传到账号须主动点击。', en: 'Saved in this browser by default. Source files are read-only; scan again for updates. Account upload is an explicit action.' })}</p>
      <input ref={input} type="file" multiple hidden {...({ webkitdirectory: '' } as Record<string, string>)} onChange={event => {
        const files = Array.from(event.target.files ?? []); event.target.value = ''; if (!files.length) return;
        const name = files[0].webkitRelativePath.split('/')[0] || 'Obsidian';
        void act(async signal => { const result = await scanVault(files.map(f => ({ path: f.webkitRelativePath.split('/').slice(1).join('/') || f.name, file: f })), name, undefined, limits); signal.throwIfAborted(); showScan(result); });
      }} />
    </section>
    {(error || vaults.error) && <p className="error" role="alert">{error ?? vaults.error}</p>}
    {notice && <p className="success" role="status">{notice}</p>}{progress && <p role="status">{progress}</p>}
    {scan && <section className="card library-import" aria-label={pick({ zh: '导入预览', en: 'Import preview' })}>
      <h2>{scan.name}</h2><p>{pick({ zh: '选择要导入的笔记；只带入这些笔记引用的常见附件。', en: 'Select notes to import. Only their referenced supported attachments are included.' })}</p>
      <p>{scan.files.filter(f => f.kind === 'note').length} {pick({ zh: '篇笔记', en: 'notes' })} · {sizeLabel(scan.files.filter(f => f.kind === 'attachment').reduce((n, f) => n + f.size, 0))} {pick({ zh: '可用附件', en: 'available attachments' })}</p>
      <div className="library-import-files">{[...groups].map(([name, files]) => <details key={name} open><summary><label><input type="checkbox" checked={files.every(f => selected.has(f.path))} onChange={event => { const checked = event.target.checked; setSelected(old => { const next = new Set(old); files.forEach(f => checked ? next.add(f.path) : next.delete(f.path)); return next; }); setPrepared(null); }} /> {name} ({files.length})</label></summary>
        {files.map(f => <label className="library-file-choice" key={f.id}><input type="checkbox" checked={selected.has(f.path)} onChange={event => { const checked = event.target.checked; setSelected(old => { const next = new Set(old); if (checked) next.add(f.path); else next.delete(f.path); return next; }); setPrepared(null); }} /> {f.path.split('/').pop()} <span className="muted">{sizeLabel(f.size)}</span></label>)}</details>)}</div>
      {!!scan.skipped.length && <details><summary>{pick({ zh: '跳过的文件', en: 'Skipped files' })} ({scan.skipped.length})</summary><ul>{scan.skipped.map((f, i) => <li key={i}>{f.path}: {pick({ zh: ({ excluded: '配置或历史目录', unsupported: '不支持的格式', 'too-large': '超过大小限制', 'invalid-utf8': '不是 UTF-8 文本', 'duplicate-path': '重复路径' } as Record<string, string>)[f.reason] ?? f.reason, en: f.reason })}</li>)}</ul></details>}
      {prepared && <div className="library-diff"><p>{pick({ zh: '变更预览', en: 'Changes' })}: +{prepared.diff.added} · {pick({ zh: '修改', en: 'changed' })} {prepared.diff.changed} · {pick({ zh: '改名', en: 'renamed' })} {prepared.diff.renamed} · {pick({ zh: '源文件缺失，保留副本', en: 'missing sources, copies retained' })} {prepared.diff.missing}</p><p>{sizeLabel([...prepared.blobs.values()].reduce((n, b) => n + b.size, 0))}</p>
        <details><summary>{pick({ zh: '查看文件清单', en: 'Show file list' })}</summary><ul>{prepared.files.map(f => <li key={f.id}>{f.path}{f.missing ? ' — ' + pick({ zh: '源文件缺失', en: 'source missing' }) : ''}</li>)}</ul></details></div>}
      <div className="card-actions"><button className="button" disabled={busy || !selected.size} onClick={() => void act(async signal => { const result = await prepareVault(scan, selected, refreshTarget.current, limits); signal.throwIfAborted(); setPrepared(result); })}>{pick({ zh: '预览变更', en: 'Preview changes' })}</button>
        <button className="button primary" disabled={busy || !prepared} onClick={() => void commit()}>{pick({ zh: '导入到当前浏览器', en: 'Import into this browser' })}</button>
        <button className="button ghost" disabled={busy} onClick={() => { setScan(null); setPrepared(null); }}>{pick({ zh: '关闭预览', en: 'Close preview' })}</button></div>
    </section>}
    <div className="library-workspace"><aside className="card library-index">
      <h2>{pick({ zh: '当前浏览器', en: 'This browser' })}</h2>
      {vaults.local.map(v => <button className={`library-vault-button ${id === v.id && storage === 'browser' ? 'selected' : ''}`} key={v.id} onClick={() => setParams({ vault: v.id, storage: 'browser' })}>{v.name}<small>{v.files.filter(f => f.kind === 'note').length} · r{v.revision}</small></button>)}
      {!vaults.local.length && <p className="muted">{pick({ zh: '选择一个笔记目录开始。', en: 'Choose a note folder to start.' })}</p>}
      <h2>{pick({ zh: '我的账号', en: 'My account' })}</h2>
      {vaults.cloudAllowed ? vaults.cloud.map(v => <button className={`library-vault-button ${id === v.id && storage === 'account' ? 'selected' : ''}`} key={v.id} onClick={() => setParams({ vault: v.id, storage: 'account' })}>{v.name}<small>r{v.revision}</small></button>) : <Link to={hrefFor('/login?next=' + encodeURIComponent(location.pathname + location.search))}>{pick({ zh: '登录后可上传与读取账号笔记库', en: 'Sign in to upload and read account libraries' })}</Link>}
      {vault && <><label className="library-search">{pick({ zh: '搜索笔记与正文', en: 'Search notes and text' })}<input value={query} onChange={e => setQuery(e.target.value)} /></label>{searching && <p role="status">{pick({ zh: '检索正文…', en: 'Searching text…' })}</p>}
        <VaultNoteTree files={notes} selectedId={file?.id} onOpen={openFile} /></>}
    </aside><section className="card library-reader" aria-label={pick({ zh: '笔记阅读', en: 'Note reader' })}>
      {vault ? <><header><h2>{vault.name}</h2><p className="muted">{vault.storage === 'browser' ? pick({ zh: '浏览器副本', en: 'Browser copy' }) : pick({ zh: '账号私有副本', en: 'Private account copy' })} · r{vault.revision}</p>
        <div className="card-actions">{!vault.id.startsWith('browser-account-') && vault.id !== 'browser-mcs-writing' && <button className="button small" disabled={busy || historical} onClick={() => void rescan()}>{pick({ zh: '重新扫描', en: 'Scan again' })}</button>}
          {vault.storage === 'browser' && <button className="button small primary" disabled={busy || !vaults.cloudAllowed || historical} onClick={() => void act(async signal => { const uploaded = await uploadVault(vault, vaults.ownerKey, signal, (done, total) => setProgress(`${pick({ zh: '上传', en: 'Uploading' })} ${done}/${total}`)); signal.throwIfAborted(); await vaults.refresh(); setNotice(pick({ zh: '已上传到账号；本地副本保留。', en: 'Uploaded to your account; browser copy retained.' }) + ' ' + uploaded.name); })}>{pick({ zh: '上传到我的账号', en: 'Upload to my account' })}</button>}
          {vault.storage === 'account' ? <a className="button small" href={`/api/v2/me/vaults/${vault.id}/export`}>{pick({ zh: '导出笔记库', en: 'Export library' })}</a> : <button className="button small" disabled={busy} onClick={() => void act(async signal => { const blob = await exportLocalVault(vault); signal.throwIfAborted(); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = vault.name + '.mcs-vault.jsonl'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 30000); })}>{pick({ zh: '导出笔记库', en: 'Export library' })}</button>}
          <button className="button small ghost" disabled={busy} onClick={() => setRemoveConfirm(true)}>{pick({ zh: '移除副本', en: 'Remove copy' })}</button></div>
        {removeConfirm && <div className="library-removal"><p>{pick({ zh: '移除此处的笔记库及历史版本？Obsidian 原文件保持原样。', en: 'Remove this copy and its history? Original Obsidian files stay intact.' })}</p><button className="button" disabled={busy} onClick={() => void act(async signal => { if (vault.storage === 'browser') await removeLocalVault(vault.id); else await api(`/me/vaults/${vault.id}`, { method: 'DELETE', signal }); signal.throwIfAborted(); await vaults.refresh(); setParams({}); setRemoveConfirm(false); })}>{pick({ zh: '确认移除此副本', en: 'Remove this copy' })}</button><button className="button ghost" onClick={() => setRemoveConfirm(false)}>{pick({ zh: '保留', en: 'Keep' })}</button></div>}
        <label>{pick({ zh: '历史版本', en: 'Revision history' })}<select aria-label={pick({ zh: '历史版本', en: 'Revision history' })} value={revisionParam ?? ''} onChange={e => { const p = new URLSearchParams(params); if (e.target.value) p.set('revision', e.target.value); else p.delete('revision'); setParams(p); }}><option value="">{pick({ zh: '当前版本', en: 'Current revision' })}</option>{history.map(r => <option key={r.revision} value={r.revision}>r{r.revision} · {r.createdAt}</option>)}</select></label>
      </header>{file && <article><h2>{file.title ?? file.path}</h2><p className="muted">{file.path}</p>
        {file.kind === 'note' && <div className="card-actions"><button className="button small" disabled={busy} onClick={() => void writeFromNote(true)}>{pick({ zh: '复制为创作稿', en: 'Copy as a writing draft' })}</button>
          {!historical && (vault.storage === 'account' || vault.id === 'browser-mcs-writing' || vault.id.startsWith('browser-account-')) && <button className="button small primary" disabled={busy} onClick={() => void writeFromNote(false)}>{pick(vault.storage === 'account' ? { zh: '取回本机继续写', en: 'Fetch to this device and continue writing' } : { zh: '继续创作', en: 'Continue writing' })}</button>}</div>}
        {file.kind === 'note' ? <VaultDocument key={`${key}:${file.id}`} vault={vault} file={file} onOpen={openFile} /> : <VaultAttachment key={`${key}:${file.id}`} vault={vault} file={file} />}
        {file.kind === 'note' && <><section className="library-related"><h3>{pick({ zh: '关联数学节点', en: 'Linked mathematical nodes' })}</h3><p className="muted">{pick({ zh: '关联用来放置私人参考资料；掌握状态由你另行确认。', en: 'Links place private reference material beside a node. Mastery is confirmed separately.' })}</p>
          <ul>{file.nodeIds.map(nodeId => <li key={nodeId}><Link to={hrefFor('/nodes/' + encodeURIComponent(nodeId))}>{graph.data?.nodes.find(n => n.id === nodeId)?.title ?? nodeId}</Link>{!historical && <button className="link-button" disabled={busy} onClick={() => void changeLinks(file.nodeIds.filter(n => n !== nodeId))}>{pick({ zh: '取消关联', en: 'Unlink' })}</button>}</li>)}</ul>
          {!historical && <><label>{pick({ zh: '查找要关联的节点', en: 'Find a node to link' })}<input value={nodeQuery} onChange={e => setNodeQuery(e.target.value)} /></label>{nodeQuery.trim() && <ul>{graph.data?.nodes.filter(n => !file.nodeIds.includes(n.id) && (n.title + ' ' + n.id).toLowerCase().includes(nodeQuery.toLowerCase())).slice(0, 20).map(n => <li key={n.id}><button className="link-button" disabled={busy} onClick={() => void changeLinks([...file.nodeIds, n.id])}>{n.title}</button></li>)}</ul>}</>}
        </section><section><h3>{pick({ zh: '反向链接', en: 'Backlinks' })}</h3>{backlinks.length ? <ul>{backlinks.map(f => <li key={f.id}><button className="link-button" onClick={() => openFile(f)}>{f.path}</button></li>)}</ul> : <p className="muted">{pick({ zh: '没有已解析的反向链接。', en: 'No resolved backlinks.' })}</p>}</section></>}
      </article>}</> : <p className="muted">{id ? pick({ zh: '正在读取笔记库…', en: 'Loading library…' }) : pick({ zh: '选择左侧的笔记库，或导入已有的 Obsidian 目录。', en: 'Choose a library on the left, or import your Obsidian folder.' })}</p>}
    </section></div>
  </div>;
}
