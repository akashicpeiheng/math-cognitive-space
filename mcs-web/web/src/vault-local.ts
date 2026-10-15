import { compareVaultFiles, EXCLUDED_VAULT_DIRS, fileKind, fileMime, parseVaultNote, resolveVaultLink, safeVaultPath, sha256, VAULT_LIMITS, validateVaultManifest } from '../../shared/vault.mjs';
import type { Vault, VaultFile, VaultLimits, VaultRevision } from '../../shared/vault.mjs';

export interface ReadableDirectory { name: string; kind: 'directory'; values(): AsyncIterable<ReadableDirectory | ReadableFile>; queryPermission(options: { mode: 'read' }): Promise<string>; requestPermission(options: { mode: 'read' }): Promise<string> }
interface ReadableFile { name: string; kind: 'file'; getFile(): Promise<File> }
export interface VaultScan { name: string; files: VaultFile[]; sources: Map<string, Blob>; skipped: Array<{ path: string; reason: string }>; handle?: ReadableDirectory }
export interface PreparedVault { files: VaultFile[]; blobs: Map<string, Blob>; diff: ReturnType<typeof compareVaultFiles>; scan: VaultScan }
const DATABASE = 'mcs-private-vaults-v1';
const STORES = ['vaults', 'revisions', 'chunks', 'handles', 'pending', 'writing-drafts', 'network-relations', 'network-index', 'network-meanings'];
let opening: Promise<IDBDatabase> | null = null;
function open() {
  if (!opening) opening = new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DATABASE, 3);
    request.onupgradeneeded = () => { for (const name of STORES) if (!request.result.objectStoreNames.contains(name)) request.result.createObjectStore(name); };
    request.onsuccess = () => {
      request.result.onversionchange = () => { request.result.close(); opening = null; };
      resolve(request.result);
    };
    request.onblocked = () => { opening = null; reject(new Error('Close other MCS tabs to upgrade browser note storage.')); };
    request.onerror = () => { opening = null; reject(request.error); };
  });
  return opening;
}
const req = <T>(request: IDBRequest<T>) => new Promise<T>((resolve, reject) => { request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error); });
async function transaction<T>(names: string[], mode: IDBTransactionMode, fn: (tx: IDBTransaction) => Promise<T>): Promise<T> {
  const db = await open(), tx = db.transaction(names, mode);
  const done = new Promise<void>((resolve, reject) => { tx.oncomplete = () => resolve(); tx.onabort = () => reject(tx.error ?? new Error('Browser storage transaction aborted')); tx.onerror = () => {}; });
  try { const value = await fn(tx); await done; return value; } catch (e) { try { tx.abort(); } catch { /* already finished */ } await done.catch(() => {}); throw e; }
}
// Shared atomic operations for the private writer; not a second content store.
export { transaction as localVaultTransaction, req as localVaultRequest };
export const getLocalValue = <T>(store: string, key: IDBValidKey) => transaction([store], 'readonly', tx => req<T>(tx.objectStore(store).get(key)));
export const putLocalValue = (store: string, key: IDBValidKey, value: unknown) => transaction([store], 'readwrite', tx => req(tx.objectStore(store).put(value, key)));
export const deleteLocalValue = (store: string, key: IDBValidKey) => transaction([store], 'readwrite', tx => req(tx.objectStore(store).delete(key)));
export const listLocalVaults = () => transaction(['vaults'], 'readonly', tx => req<Vault[]>(tx.objectStore('vaults').getAll()));
export const getLocalVault = (id: string) => getLocalValue<Vault>('vaults', id);
export const listLocalHistory = async (id: string) => (await transaction(['revisions'], 'readonly', tx => req<Array<VaultRevision & { vaultId: string }>>(tx.objectStore('revisions').getAll()))).filter(r => r.vaultId === id).sort((a, b) => b.revision - a.revision);
export async function localBlob(sha: string, size: number): Promise<Blob> {
  const chunks: Blob[] = [];
  for (let i = 0; i < Math.ceil(size / VAULT_LIMITS.chunkBytes); i++) {
    const chunk = await getLocalValue<Blob>('chunks', [sha, i]);
    if (!chunk) throw new Error('Local file is incomplete'); chunks.push(chunk);
  }
  return new Blob(chunks);
}
export async function scanVault(sources: Array<{ path: string; file: Blob }>, name: string, handle?: ReadableDirectory, limits: VaultLimits = VAULT_LIMITS): Promise<VaultScan> {
  const files: VaultFile[] = [], map = new Map<string, Blob>(), skipped: VaultScan['skipped'] = [];
  for (const source of sources) {
    let path: string;
    try { path = safeVaultPath(source.path); } catch { skipped.push({ path: source.path, reason: 'excluded' }); continue; }
    const kind = fileKind(path);
    if (kind === 'unsupported') { skipped.push({ path, reason: 'unsupported' }); continue; }
    if (source.file.size > (kind === 'note' ? limits.markdownBytes : limits.attachmentBytes)) { skipped.push({ path, reason: 'too-large' }); continue; }
    if (map.has(path)) { skipped.push({ path, reason: 'duplicate-path' }); continue; }
    map.set(path, source.file);
    const metadata: VaultFile = { id: `file-${crypto.randomUUID()}`, path, kind, size: source.file.size, sha256: '0'.repeat(64), mime: fileMime(path), nodeIds: [] };
    if (kind === 'note') {
      const buffer = await source.file.arrayBuffer();
      const text = new TextDecoder('utf-8', { fatal: true });
      try {
        const note = parseVaultNote(text.decode(buffer), path);
        Object.assign(metadata, { sha256: await sha256(buffer), title: note.title, aliases: note.aliases, tags: note.tags });
      } catch { map.delete(path); skipped.push({ path, reason: 'invalid-utf8' }); continue; }
    }
    files.push(metadata);
    if (files.length % 50 === 0) await new Promise(resolve => setTimeout(resolve, 0));
  }
  return { name, files, sources: map, skipped, handle };
}
export async function scanDirectory(handle: ReadableDirectory, limits?: VaultLimits): Promise<VaultScan> {
  const sources: Array<{ path: string; file: Blob }> = [];
  const skipped: VaultScan['skipped'] = [];
  const walk = async (dir: ReadableDirectory, prefix: string) => {
    for await (const entry of dir.values()) {
      if (entry.kind === 'directory') {
        if (!EXCLUDED_VAULT_DIRS.has(entry.name.toLowerCase())) await walk(entry, prefix + entry.name + '/');
        else skipped.push({ path: prefix + entry.name + '/', reason: 'excluded' });
      } else if (fileKind(entry.name) !== 'unsupported') sources.push({ path: prefix + entry.name, file: await entry.getFile() });
      else skipped.push({ path: prefix + entry.name, reason: 'unsupported' });
      if (sources.length > 100000) throw new Error('Too many files; choose a smaller folder');
    }
  };
  await walk(handle, ''); const scan = await scanVault(sources, handle.name, handle, limits);
  return { ...scan, skipped: [...skipped, ...scan.skipped] };
}
export async function prepareVault(scan: VaultScan, selected: Set<string>, previous?: Vault, limits: VaultLimits = VAULT_LIMITS): Promise<PreparedVault> {
  const incoming = scan.files.filter(f => f.kind === 'note' && selected.has(f.path)), paths = new Set(incoming.map(f => f.path));
  for (const file of [...incoming]) {
    const note = parseVaultNote(await scan.sources.get(file.path)!.text(), file.path);
    for (const link of note.links) {
      const matches = resolveVaultLink(scan.files, file.path, link);
      if (matches.length === 1 && matches[0].kind === 'attachment') paths.add(matches[0].path);
    }
  }
  const blobs = new Map<string, Blob>();
  for (const file of scan.files) if (paths.has(file.path)) {
    const source = scan.sources.get(file.path)!;
    const next = { ...file, sha256: file.kind === 'note' ? file.sha256 : await sha256(await source.arrayBuffer()) };
    if (file.kind === 'attachment') incoming.push(next);
    blobs.set(next.sha256, source);
  }
  // Unselected files that still exist keep their old copy without a false missing marker.
  for (const old of previous?.files ?? []) if (!paths.has(old.path) && scan.sources.has(old.path)) incoming.push({ ...old, missing: false });
  validateVaultManifest(incoming, limits);
  const diff = compareVaultFiles(previous?.files ?? [], incoming);
  validateVaultManifest(diff.files, limits);
  return { scan, files: diff.files, diff, blobs };
}
export async function commitLocalVault(prepared: PreparedVault, previous?: Vault, limits: VaultLimits = VAULT_LIMITS, writingGuard?: { id: string; revision: number; next: unknown }): Promise<Vault> {
  const estimate = await navigator.storage?.estimate();
  let additional = 0;
  const storedHashes = new Set<string>();
  for (const [hash, blob] of prepared.blobs) {
    if (blob.size && await getLocalValue<Blob>('chunks', [hash, 0])) storedHashes.add(hash);
    else additional += blob.size;
  }
  if (estimate?.quota && estimate.quota - (estimate.usage ?? 0) < additional) throw new Error('Browser storage is full');
  const now = new Date().toISOString(), id = previous?.id ?? `browser-${crypto.randomUUID()}`, revision = (previous?.revision ?? 0) + 1;
  const history = previous ? await listLocalHistory(id) : [];
  const hashes = new Map(prepared.files.map(f => [f.sha256, f.size]));
  for (const r of history) for (const f of r.files) hashes.set(f.sha256, f.size);
  if ([...hashes.values()].reduce((a, b) => a + b, 0) > limits.vaultBytes) throw new Error('Vault storage limit reached, including history');
  const files = prepared.files.map(f => { const old = previous?.files.find(p => p.id === f.id); return { ...f, sourceRevision: old?.sha256 === f.sha256 ? old.sourceRevision ?? previous!.revision : revision }; });
  const vault: Vault = { ...previous, id, name: previous?.name ?? prepared.scan.name, revision, files, storage: 'browser', createdAt: previous?.createdAt ?? now, updatedAt: now };
  const chunks: Array<{ key: [string, number]; blob: Blob }> = [];
  for (const [hash, blob] of prepared.blobs) {
    // A File slice can retain a live OS file reference in Chromium/IndexedDB.
    // Materialize bytes so editing/deleting the source never invalidates old snapshots.
    const bytes = await blob.arrayBuffer();
    if (await sha256(bytes) !== hash) throw new Error('File changed during import; scan again');
    if (storedHashes.has(hash)) continue;
    for (let i = 0; i < Math.ceil(blob.size / VAULT_LIMITS.chunkBytes); i++) chunks.push({ key: [hash, i], blob: new Blob([new Uint8Array(bytes, i * VAULT_LIMITS.chunkBytes, Math.min(VAULT_LIMITS.chunkBytes, bytes.byteLength - i * VAULT_LIMITS.chunkBytes))]) });
  }
  await transaction(['vaults', 'revisions', 'chunks', 'handles', ...(writingGuard ? ['writing-drafts'] : [])], 'readwrite', async tx => {
    const current = await req<Vault | undefined>(tx.objectStore('vaults').get(id));
    if ((current?.revision ?? 0) !== (previous?.revision ?? 0)) throw new Error('Vault revision conflict; reload and scan again');
    if (writingGuard) {
      const draft = await req<{ draftRevision: number } | undefined>(tx.objectStore('writing-drafts').get(writingGuard.id));
      if (draft?.draftRevision !== writingGuard.revision) throw new Error('WRITING_DRAFT_CONFLICT');
      await req(tx.objectStore('writing-drafts').put(writingGuard.next, writingGuard.id));
    }
    for (const c of chunks) await req(tx.objectStore('chunks').put(c.blob, c.key));
    await req(tx.objectStore('revisions').put({ vaultId: id, revision, createdAt: now, files: vault.files }, [id, revision]));
    await req(tx.objectStore('vaults').put(vault, id));
    if (prepared.scan.handle) await req(tx.objectStore('handles').put(prepared.scan.handle, id));
  });
  window.dispatchEvent(new Event('mcs-vault-change')); return vault;
}
export async function linkLocalNote(vault: Vault, fileId: string, nodeIds: string[]) {
  const files = vault.files.map(f => f.id === fileId ? { ...f, nodeIds: [...new Set(nodeIds)] } : f);
  const now = new Date().toISOString(), next = { ...vault, files, revision: vault.revision + 1, updatedAt: now };
  await transaction(['vaults', 'revisions'], 'readwrite', async tx => {
    const current = await req<Vault>(tx.objectStore('vaults').get(vault.id));
    if (current?.revision !== vault.revision) throw new Error('Vault revision conflict');
    await req(tx.objectStore('vaults').put(next, vault.id));
    await req(tx.objectStore('revisions').put({ vaultId: vault.id, revision: next.revision, createdAt: now, files }, [vault.id, next.revision]));
  });
  window.dispatchEvent(new Event('mcs-vault-change')); return next;
}
export async function removeLocalVault(id: string) {
  await transaction(['vaults', 'handles', 'revisions', 'chunks'], 'readwrite', async tx => {
    await req(tx.objectStore('vaults').delete(id)); await req(tx.objectStore('handles').delete(id));
    const revisions = await req<Array<VaultRevision & { vaultId: string }>>(tx.objectStore('revisions').getAll());
    const keep = new Set(revisions.filter(r => r.vaultId !== id).flatMap(r => r.files.map(f => f.sha256)));
    for (const r of revisions) if (r.vaultId === id) await req(tx.objectStore('revisions').delete([id, r.revision]));
    const keys = await req<IDBValidKey[]>(tx.objectStore('chunks').getAllKeys());
    for (const key of keys) if (Array.isArray(key) && !keep.has(String(key[0]))) await req(tx.objectStore('chunks').delete(key));
  });
  window.dispatchEvent(new Event('mcs-vault-change'));
}
export async function exportLocalVault(vault: Vault): Promise<Blob> {
  const history = await listLocalHistory(vault.id), parts: BlobPart[] = [JSON.stringify({ type: 'vault', schema: 'mcs-private-vault/1', vault }) + '\n'];
  const hashes = new Map<string, number>();
  for (const r of history) { parts.push(JSON.stringify({ type: 'revision', revision: r.revision, createdAt: r.createdAt, files: r.files }) + '\n'); for (const f of r.files) hashes.set(f.sha256, f.size); }
  for (const [hash, size] of hashes) for (let i = 0; i < Math.ceil(size / VAULT_LIMITS.chunkBytes); i++) {
    const blob = await getLocalValue<Blob>('chunks', [hash, i]);
    const bytes = new Uint8Array(await blob.arrayBuffer()); let text = ''; for (const b of bytes) text += String.fromCharCode(b);
    parts.push(JSON.stringify({ type: 'chunk', sha256: hash, index: i, data: btoa(text) }) + '\n');
  }
  return new Blob(parts, { type: 'application/x-ndjson' });
}
