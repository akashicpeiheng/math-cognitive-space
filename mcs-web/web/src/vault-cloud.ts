import { api } from './api';
import { VAULT_LIMITS } from '../../shared/vault.mjs';
import type { Vault, VaultFile } from '../../shared/vault.mjs';
import { getLocalValue, putLocalValue, deleteLocalValue, localBlob, getLocalVault } from './vault-local';

interface Batch { id: string; status: string; files: VaultFile[]; expectedCount: number; uploaded: Record<string, { complete: boolean; chunks: number[] }>; result: { revision: number } | null }
interface Pending { cloudId: string; batchId: string; localRevision: number; baseRevision: number }
export async function readVaultFile(vault: Vault, file: VaultFile, signal?: AbortSignal): Promise<Blob> {
  if (vault.storage === 'browser') return localBlob(file.sha256, file.size);
  const response = await fetch(`/api/v2/me/vaults/${encodeURIComponent(vault.id)}/files/${encodeURIComponent(file.id)}?revision=${vault.revision}`, { signal, credentials: 'same-origin' });
  if (!response.ok) throw new Error(response.status === 401 ? 'Please sign in again' : `File could not be read (${response.status})`);
  return response.blob();
}
export async function uploadVault(vault: Vault, ownerKey: string, signal: AbortSignal, progress: (done: number, total: number) => void): Promise<Vault> {
  const mappingKey = [ownerKey, vault.id], pendingKey = ['upload', ownerKey, vault.id];
  const mapping = await getLocalValue<{ cloudId: string; revision: number }>('pending', mappingKey);
  let pending = await getLocalValue<Pending | undefined>('pending', pendingKey);
  let cloudId = mapping?.cloudId ?? pending?.cloudId;
  if (!cloudId) cloudId = (await api<{ vault: Vault }>('/me/vaults', { method: 'POST', body: { name: vault.name }, signal })).vault.id;
  const remote = (await api<{ vault: Vault }>(`/me/vaults/${cloudId}`, { signal })).vault;
  if (pending && pending.localRevision !== vault.revision) {
    await api(`/me/vaults/${cloudId}/imports/${pending.batchId}`, { method: 'DELETE', signal });
    await deleteLocalValue('pending', pendingKey); pending = undefined;
  }
  if (!pending && mapping && remote.revision !== mapping.revision) throw new Error('The account copy changed elsewhere. Reload it before uploading again.');
  let batch: Batch;
  if (pending) batch = (await api<{ batch: Batch }>(`/me/vaults/${cloudId}/imports/${pending.batchId}`, { signal })).batch;
  else {
    batch = (await api<{ batch: Batch }>(`/me/vaults/${cloudId}/imports`, { method: 'POST', body: { baseRevision: remote.revision, files: [], fileCount: vault.files.length }, signal })).batch;
    pending = { cloudId, batchId: batch.id, localRevision: vault.revision, baseRevision: remote.revision };
    await putLocalValue('pending', pendingKey, pending);
  }
  if (batch.status === 'pending' && batch.files.length < vault.files.length) {
    const files = vault.files.map(f => ({ id: f.id, path: f.path, kind: f.kind, size: f.size, sha256: f.sha256, missing: f.missing, nodeIds: f.nodeIds }));
    for (let offset = batch.files.length; offset < files.length;) {
      const segment: typeof files = []; let size = 0;
      while (offset + segment.length < files.length && segment.length < 400) {
        const file = files[offset + segment.length], next = JSON.stringify(file).length * 3;
        if (segment.length && size + next > 1200000) break; size += next; segment.push(file);
      }
      await api(`/me/vaults/${cloudId}/imports/${batch.id}/manifest/${offset}`, { method: 'PUT', body: { files: segment }, signal }); offset += segment.length;
    }
    batch = (await api<{ batch: Batch }>(`/me/vaults/${cloudId}/imports/${batch.id}`, { signal })).batch;
  }
  const total = vault.files.reduce((n, f) => n + Math.ceil(f.size / VAULT_LIMITS.chunkBytes), 0); let done = 0;
  if (batch.status !== 'done') for (const file of vault.files) {
    const status = batch.uploaded[file.sha256], blob = status?.complete ? null : await localBlob(file.sha256, file.size);
    for (let i = 0; i < Math.ceil(file.size / VAULT_LIMITS.chunkBytes); i++) {
      signal.throwIfAborted();
      if (!status?.complete && !status?.chunks.includes(i)) {
        const bytes = new Uint8Array(await blob!.slice(i * VAULT_LIMITS.chunkBytes, (i + 1) * VAULT_LIMITS.chunkBytes).arrayBuffer());
        let binary = ''; for (let start = 0; start < bytes.length; start += 8192) binary += String.fromCharCode(...bytes.subarray(start, start + 8192));
        await api(`/me/vaults/${cloudId}/imports/${batch.id}/chunks/${file.sha256}/${i}`, { method: 'PUT', body: { data: btoa(binary) }, signal });
      }
      progress(++done, total);
    }
  }
  const committed = batch.status === 'done' ? batch.result! : await api<{ revision: number }>(`/me/vaults/${cloudId}/imports/${batch.id}/commit`, { method: 'POST', body: {}, signal });
  await putLocalValue('pending', mappingKey, { cloudId, revision: committed.revision });
  await deleteLocalValue('pending', pendingKey);
  const current = await getLocalVault(vault.id);
  if (current?.revision !== vault.revision) throw new Error('Uploaded snapshot saved; local library changed during upload.');
  return (await api<{ vault: Vault }>(`/me/vaults/${cloudId}`, { signal })).vault;
}
