import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams, useLocation } from 'react-router-dom';
import { networkNodeIds } from './network-url';
import { api, formatError } from './api';
import { useAuth } from './auth';
import { useVaults } from './vault-context';
import { readVaultFile, uploadVault } from './vault-cloud';
import { getLocalValue, putLocalValue, localVaultTransaction, localVaultRequest } from './vault-local';
import type { Vault } from '../../shared/vault.mjs';
import type { NetworkGraph } from './network';
import type { PrivateRelation, NetworkExtras, RelationCheck, NetworkNodeRef } from '../../shared/network-workspace.mjs';
import { NETWORK_SCHEMA, nodeRefKey, decodeNoteKey, normalizePrivateRelation, relationSignature } from '../../shared/network-workspace.mjs';
import { projectMixedGraph, normalizeLocalRelation, noteRef, type IndexedNote } from './network-workspace';
const STATE_KEY = 'mcs-network-sources-v2';
const DEFAULT_FILTERS = { noteReference: true, privateReference: true, privateRelation: true };
export function useNetworkWorkspace(base: NetworkGraph | undefined) {
  const libraries = useVaults(), auth = useAuth(), [params] = useSearchParams();
  const location = useLocation();
  const [sources, setSources] = useState<string[]>(() => { try { const value = JSON.parse(sessionStorage.getItem(STATE_KEY) ?? '[]'); return Array.isArray(value) ? value.filter(s => typeof s === 'string') : []; } catch { return []; } });
  const [filters, setFilters] = useState(DEFAULT_FILTERS), [indexes, setIndexes] = useState(new Map<string, IndexedNote>());
  const [localRelations, setLocalRelations] = useState<PrivateRelation[]>([]), [remote, setRemote] = useState<{ identity: number; relations: PrivateRelation[] }>({ identity: -1, relations: [] });
  const [retainedRefs, setRetainedRefs] = useState<NetworkNodeRef[]>([]);
  const refreshGeneration = useRef(0);
  const [error, setError] = useState(''), [indexing, setIndexing] = useState(false), generation = useRef(0);
  const requested = useMemo(() => networkNodeIds(params, location.hash).split(',').filter(Boolean).slice(0, 2000), [params, location.hash]);
  const available = useMemo(() => [...libraries.local, ...libraries.cloud], [libraries.local, libraries.cloud]);
  const sourceKey = [...new Set([...sources, ...requested.map(decodeNoteKey).filter(Boolean).map(ref => `${ref!.storage}:${ref!.vaultId}`)])].sort().join('|');
  const selected = useMemo(() => available.filter(v => sources.includes(`${v.storage}:${v.id}`)), [available, sources]);
  const active = useMemo(() => available.filter(v => sourceKey.split('|').includes(`${v.storage}:${v.id}`)), [available, sourceKey]);
  useEffect(() => { try { sessionStorage.setItem(STATE_KEY, JSON.stringify(sources)); } catch { /* session storage unavailable */ } }, [sources]);
  const refresh = useCallback(async () => {
    const refreshId = ++refreshGeneration.current;
    const results = await Promise.allSettled([getLocalValue<PrivateRelation[]>('network-relations', 'all'), libraries.cloudAllowed ? api<{ relations: PrivateRelation[] }>('/me/network-relations') : Promise.resolve({ relations: [] })]);
    if (refreshId !== refreshGeneration.current) return;
    if (results[0].status === 'fulfilled') {
      const relations = await Promise.all((results[0].value ?? []).map(async relation => {
        const old = relation.checks?.at(-1); let trusted: RelationCheck | undefined;
        if (old?.id && libraries.cloudAllowed) try { const record = (await api<{ check: { result?: RelationCheck } }>(`/network-relation-checks/${old.id}`)).check; if (record.result) trusted = { ...record.result, id: old.id }; } catch { /* a report is not an authoritative check */ }
        return { ...relation, local: true, checks: [...(relation.checks ?? []).slice(0, -1).map(c => ({ ...c, stale: true })), ...(old ? [trusted ?? { ...old, stale: true }] : [])] };
      }));
      if (refreshId !== refreshGeneration.current) return; setLocalRelations(relations);
    } else setError(formatError(results[0].reason));
    if (results[1].status === 'fulfilled') setRemote({ identity: libraries.identityKey, relations: results[1].value.relations }); else setError(formatError(results[1].reason));
  }, [libraries.cloudAllowed, libraries.identityKey]);
  useEffect(() => { void refresh(); return () => { refreshGeneration.current++; }; }, [refresh]);
  const relations = useMemo(() => [...localRelations, ...(remote.identity === libraries.identityKey && libraries.cloudAllowed ? remote.relations : [])].map(relation => {
    const missing = [relation.from, relation.to].some(ref => {
      if (ref.source !== 'vault') {const node=base?.nodes.find(n=>n.id===ref.id);return node?.version!==ref.version || (ref.source!=='ontology'&&JSON.stringify(node?.contentRefData)!==JSON.stringify(ref));}
      const vault = available.find(v => v.id === ref.vaultId && v.storage === ref.storage), file = vault?.files.find(f => f.id === ref.fileId);
      return !file || file.missing || file.sha256 !== ref.sha256 || vault?.revision !== ref.revision;
    });
    return { ...relation, checks: relation.checks?.map(check => ({ ...check, stale: check.stale || missing || check.ontologyVersion !== base?.version || check.relationSignature !== relationSignature(relation) })) };
  }), [localRelations, remote, libraries.identityKey, libraries.cloudAllowed, available, base]);
  useEffect(() => {
    const run = ++generation.current, controller = new AbortController(); let worker: Worker | null = null;
    if (!active.length) { setIndexing(false); setIndexes(new Map()); return; }
    setIndexing(true); setIndexes(new Map());
    worker = new Worker(new URL('./network-index-worker.ts', import.meta.url), { type: 'module' });
    const activeWorker = worker;
    const pending = new Map<number, { resolve: (value: IndexedNote) => void; reject: (error: Error) => void }>(); let sequence = 0;
    activeWorker.onmessage = event => { const task = pending.get(event.data.requestId); if (!task) return; pending.delete(event.data.requestId); if (event.data.error) task.reject(new Error(event.data.error)); else task.resolve(event.data.note); };
    activeWorker.onerror = () => { for (const task of pending.values()) task.reject(new Error('Note index worker failed')); pending.clear(); };
    const parse = (vault: Vault, file: Vault['files'][number], text: string) => new Promise<IndexedNote>((resolve, reject) => { const requestId = ++sequence; pending.set(requestId, { resolve, reject }); activeWorker.postMessage({ requestId, library: `${vault.storage}:${vault.id}:${vault.revision}`, file, text }); });
    void (async () => {
      const next = new Map<string, IndexedNote>();
      const directories = new Map<string, string>();
      for (const vault of active) {
        const manifest = JSON.stringify(vault.files.map(file => [file.id, file.path, file.kind, file.missing === true, file.aliases ?? []]).sort((a, b) => String(a[0]).localeCompare(String(b[0]), 'en')));
        const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(manifest));
        directories.set(`${vault.storage}:${vault.id}`, [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join(''));
      }
      for (const vault of active) activeWorker.postMessage({ library: `${vault.storage}:${vault.id}:${vault.revision}`, files: vault.files });
      for (const vault of active) for (const file of vault.files.filter(f => f.kind === 'note')) {
        if (controller.signal.aborted) return;
        if (file.missing) continue;
        const id = nodeRefKey(noteRef(vault, file)), cacheKey = `${vault.storage === 'account' ? libraries.ownerKey + ':' : ''}${id}:${file.sha256}:${directories.get(`${vault.storage}:${vault.id}`)}`;
        try {
          const cached = await getLocalValue<IndexedNote>('network-index', cacheKey);
          const note = cached ?? await parse(vault, file, await (await readVaultFile(vault, file, controller.signal)).text());
          next.set(id, note);
          if (!cached) await putLocalValue('network-index', cacheKey, note);
        } catch (error) { if (controller.signal.aborted) return; setError(`${file.path}: ${formatError(error)}`); }
        
      }
      if (generation.current === run) setIndexes(next);
    })().catch(e => { if (!controller.signal.aborted) setError(formatError(e)); }).finally(() => { if (generation.current === run) setIndexing(false); });
    return () => { controller.abort(); activeWorker.terminate(); for (const task of pending.values()) task.reject(new DOMException('Aborted', 'AbortError')); pending.clear(); };
  }, [active, libraries.identityKey, libraries.ownerKey]);
  const projection = useMemo(() => { if (!base) return null; const value = projectMixedGraph(base, active, indexes, relations, filters, requested); for (const ref of retainedRefs) if (!value.refs.has(nodeRefKey(ref))) value.refs.set(nodeRefKey(ref), ref); return value; }, [base, active, indexes, relations, filters, requested, retainedRefs]);
  const saveRelation = useCallback(async (raw: PrivateRelation, old?: PrivateRelation) => {
    const local = old?.local || raw.from.source === 'vault' && raw.from.storage === 'browser' || raw.to.source === 'vault' && raw.to.storage === 'browser' || !libraries.cloudAllowed;
    if (local) {
      const relation = normalizeLocalRelation(raw, old);
      const next = await localVaultTransaction(['network-relations'], 'readwrite', async tx => {
        const store = tx.objectStore('network-relations'), current = await localVaultRequest<PrivateRelation[]>(store.get('all')) ?? [];
        if (old && current.find(r => r.id === old.id)?.revision !== old.revision) throw new Error('关系已变化，请重新载入 / Relation changed; reload');
        const values = [relation, ...current.filter(r => r.id !== relation.id)]; await localVaultRequest(store.put(values, 'all')); return values;
      }); setLocalRelations(next); return relation;
    }
    const result = await api<{ relation: PrivateRelation }>(`/me/network-relations${old ? '/' + encodeURIComponent(old.id!) : ''}`, { method: old ? 'PUT' : 'POST', body: { ...raw, baseRevision: old?.revision } }); await refresh(); return result.relation;
  }, [libraries.cloudAllowed, refresh]);
  const addCheck = useCallback(async (relation: PrivateRelation, check: RelationCheck) => {
    const next = await localVaultTransaction(['network-relations'], 'readwrite', async tx => {
      const store = tx.objectStore('network-relations'), current = await localVaultRequest<PrivateRelation[]>(store.get('all')) ?? [];
      const values = current.map(r => r.id === relation.id ? { ...r, checks: [...(r.checks ?? []), { ...check, stale: relationSignature(r) !== check.relationSignature }] } : r);
      await localVaultRequest(store.put(values, 'all')); return values;
    }); setLocalRelations(next);
    await refresh();
  }, [refresh]);
  const snapshot = useCallback((ids: string[]): NetworkExtras => ({ schema: NETWORK_SCHEMA, refs: ids.map(id => projection?.refs.get(id)).filter((ref): ref is NonNullable<typeof ref> => Boolean(ref)), sources: [{ kind: 'ontology' }, ...active.map(v => ({ kind: 'vault' as const, storage: v.storage, vaultId: v.id }))], filters }), [projection, active, filters]);
  const restore = useCallback((payload: NetworkExtras) => { setRetainedRefs(payload.refs ?? []); if (payload.sources) setSources(payload.sources.filter(s => s.kind === 'vault').map(s => `${'storage' in s ? s.storage : ''}:${'vaultId' in s ? s.vaultId : ''}`)); if (payload.filters) setFilters(payload.filters); }, []);
  const removeRelation = async (relation: PrivateRelation) => {
    if (relation.local) {
      await localVaultTransaction(['network-relations'], 'readwrite', async tx => {
        const store = tx.objectStore('network-relations'), current = await localVaultRequest<PrivateRelation[]>(store.get('all')) ?? [];
        if (current.find(r => r.id === relation.id)?.revision !== relation.revision) throw new Error('Relation changed; reload');
        await localVaultRequest(store.put(current.filter(r => r.id !== relation.id), 'all'));
      });
    } else await api(`/me/network-relations/${relation.id}`, { method: 'DELETE', body: { baseRevision: relation.revision } });
    await refresh();
  };
  const importRelations = async (raw: unknown) => {
    const document = raw as { browserRelations?: unknown[]; relations?: unknown[]; account?: { relations?: unknown[] } };
    const incoming = [...(document.browserRelations ?? []), ...(document.relations ?? []), ...(document.account?.relations ?? [])].map(value => normalizeLocalRelation(normalizePrivateRelation(value)));
    await localVaultTransaction(['network-relations'], 'readwrite', async tx => {
      const store = tx.objectStore('network-relations'), current = await localVaultRequest<PrivateRelation[]>(store.get('all')) ?? [];
      await localVaultRequest(store.put([...incoming, ...current], 'all'));
    }); await refresh();
  };
  const accountRefs = async (refs: NetworkNodeRef[], signal: AbortSignal) => {
    if (!libraries.cloudAllowed) throw new Error('Please sign in');
    const mapping = new Map<string, NetworkNodeRef>();
    for (const vaultId of new Set(refs.filter(r => r.source === 'vault' && r.storage === 'browser').map(r => (r as { vaultId: string }).vaultId))) {
      const vault = libraries.local.find(v => v.id === vaultId); if (!vault) throw new Error('Restore the local library before syncing');
      const uploaded = await uploadVault(vault, libraries.ownerKey, signal, () => {});
      for (const ref of refs) if (ref.source === 'vault' && ref.storage === 'browser' && ref.vaultId === vaultId) {
        const file = uploaded.files.find(f => f.id === ref.fileId); if (!file || file.sha256 !== ref.sha256) throw new Error('Note changed during sync');
        mapping.set(nodeRefKey(ref), noteRef(uploaded, file));
      }
    }
    await libraries.refresh(); return refs.map(ref => mapping.get(nodeRefKey(ref)) ?? ref);
  };
  const syncRelation = async (relation: PrivateRelation, signal: AbortSignal) => {
    const [from, to] = await accountRefs([relation.from, relation.to], signal);
    const key = ['relation-sync', libraries.ownerKey, relation.id!];
    const mapped = await getLocalValue<{ id: string; revision: number }>('pending', key);
    const saved = (await api<{ relation: PrivateRelation }>(`/me/network-relations${mapped ? '/' + mapped.id : ''}`, { method: mapped ? 'PUT' : 'POST', body: { ...normalizePrivateRelation(relation), from, to, baseRevision: mapped?.revision }, signal })).relation;
    await putLocalValue('pending', key, { id: saved.id, revision: saved.revision }); await refresh();
  };
  return { ...projection, available, selected, sources, setSources, filters, setFilters, relations, saveRelation, addCheck, removeRelation, importRelations, accountRefs, syncRelation, refresh, error, indexing, snapshot, restore, cloudAllowed: libraries.cloudAllowed, identityKey: libraries.identityKey, ownerKey: libraries.ownerKey, auth };
}
