import { api } from './api';
import { commitLocalVault, getLocalValue, getLocalVault, localBlob, localVaultRequest as req, localVaultTransaction as transaction, putLocalValue } from './vault-local';
import { readVaultFile } from './vault-cloud';
import { parseVaultNote, resolveVaultLink, safeVaultPath, sha256, validateVaultManifest, VAULT_LIMITS } from '../../shared/vault.mjs';
import type { Vault, VaultFile } from '../../shared/vault.mjs';
import { createWritingDocument, documentMetadata, updateDocumentMetadata } from '../../shared/writing-document.mjs';
import { TEMPLATE_ID, TEMPLATE_VERSION, isWritingTemplate } from '../../shared/writing-template.mjs';
import type { WritingLocale, WritingType, WritingDepth } from '../../shared/writing-template.mjs';

export interface NoteDraft {
  id: string; draftRevision: number; title: string; markdown: string; updatedAt: string;
  vaultId: string; fileId: string; path: string; baseRevision: number; baseHash: string;
  nodeIds: string[]; activeSection: string; source?: string; warnings: string[];
  assets: Array<{ file: VaultFile; blob: Blob }>;
  materials?: string;
}
const CREATION_VAULT = 'browser-mcs-writing';
const tick = () => new Date().toISOString();
const pathTitle = (title: string) => title.replace(/[<>:"/\\|?*\x00-\x1f]/g, '-').trim().replace(/[. ]+$/, '').slice(0, 100) || 'note';

export const getWritingDraft = (id: string) => getLocalValue<NoteDraft | undefined>('writing-drafts', id);
export const listWritingDrafts = () => transaction(['writing-drafts'], 'readonly', tx => req<NoteDraft[]>(tx.objectStore('writing-drafts').getAll()));

/** Compare-and-swap prevents another tab's autosave from being silently overwritten. */
export async function persistWritingDraft(draft: NoteDraft): Promise<NoteDraft> {
  const next = { ...draft, draftRevision: draft.draftRevision + 1, updatedAt: tick() };
  await transaction(['writing-drafts'], 'readwrite', async tx => {
    const store = tx.objectStore('writing-drafts'), old = await req<NoteDraft | undefined>(store.get(draft.id));
    if ((old?.draftRevision ?? 0) !== draft.draftRevision) throw new Error('WRITING_DRAFT_CONFLICT');
    await req(store.put(next, draft.id));
  });
  return next;
}

export async function createWritingDraft({ title = '', type = 'generic', roles = [], depth = 'core', locale = 'zh', audience = '', nodeIds = [] }: { title?: string; type?: WritingType; roles?: string[]; depth?: WritingDepth; locale?: WritingLocale; audience?: string; nodeIds?: string[] } = {}): Promise<NoteDraft> {
  const id = crypto.randomUUID(), vault = await getLocalVault(CREATION_VAULT);
  const draft: NoteDraft = {
    id, draftRevision: 0, title: title || (locale === 'en' ? 'Untitled note' : '未命名笔记'),
    markdown: createWritingDocument({ title, type, roles, depth, locale, audience }), updatedAt: tick(),
    vaultId: CREATION_VAULT, fileId: `file-${id}`, path: `${pathTitle(title)}/${id.slice(0, 8)}.md`,
    baseRevision: vault?.revision ?? 0, baseHash: '', nodeIds, activeSection: 'overview', warnings: [], assets: [],
  };
  return persistWritingDraft(draft);
}

export async function editWritingNote(vault: Vault, file: VaultFile): Promise<NoteDraft> {
  if (vault.storage !== 'browser') throw new Error('Fetch the account library before editing.');
  const drafts = await listWritingDrafts(), existing = drafts.find(d => d.vaultId === vault.id && d.fileId === file.id);
  if (existing) return existing;
  const markdown = await (await readVaultFile(vault, file)).text();
  if (!isWritingTemplate(documentMetadata(markdown).templateId)) return copyWritingNote(vault, file);
  return persistWritingDraft({ id: crypto.randomUUID(), draftRevision: 0, title: parseVaultNote(markdown, file.path).title, markdown, updatedAt: tick(), vaultId: vault.id, fileId: file.id, path: file.path, baseRevision: vault.revision, baseHash: file.sha256, nodeIds: file.nodeIds, activeSection: 'overview', warnings: [], assets: [] });
}

export async function copyWritingNote(vault: Vault, file: VaultFile, signal?: AbortSignal): Promise<NoteDraft> {
  const raw = await (await readVaultFile(vault, file, signal)).text(); signal?.throwIfAborted();
  const metadata = documentMetadata(raw), title = parseVaultNote(raw, file.path).title;
  const id = crypto.randomUUID(), prefix = `copies/${id}/`, source = `${vault.storage}:${vault.id}@r${vault.revision}/${file.path}`;
  const assets: NoteDraft['assets'] = [], warnings: string[] = [];
  for (const link of parseVaultNote(raw).links) {
    const matches = resolveVaultLink(vault.files, file.path, link);
    if (matches.length === 1 && matches[0].kind === 'attachment') {
      const attachment = matches[0];
      if (!assets.some(a => a.file.path === prefix + attachment.path)) {
        const blob = await readVaultFile(vault, attachment, signal); signal?.throwIfAborted();
        if (await sha256(await blob.arrayBuffer()) !== attachment.sha256) throw new Error('Attachment hash mismatch');
        assets.push({ file: { ...attachment, id: `file-${crypto.randomUUID()}`, path: prefix + attachment.path, nodeIds: [] }, blob });
      }
    } else if (link.target) warnings.push(link.raw);
  }
  const creation = await getLocalVault(CREATION_VAULT); signal?.throwIfAborted();
  const markdown = updateDocumentMetadata(raw, { 'mcs-source': source, 'mcs-language': metadata.locale,
    'mcs-template': isWritingTemplate(metadata.templateId) ? metadata.templateId : TEMPLATE_ID,
    'mcs-template-version': isWritingTemplate(metadata.templateId) ? metadata.templateVersion : TEMPLATE_VERSION, 'mcs-type': metadata.type });
  return persistWritingDraft({ id, draftRevision: 0, title, markdown, updatedAt: tick(), vaultId: CREATION_VAULT, fileId: `file-${id}`, path: prefix + file.path, baseRevision: creation?.revision ?? 0, baseHash: '', nodeIds: [...file.nodeIds], activeSection: 'overview', source, warnings: [...new Set(warnings)], assets });
}

export async function saveWritingNote(draft: NoteDraft): Promise<{ draft: NoteDraft; vault: Vault }> {
  const previous = await getLocalVault(draft.vaultId), oldFile = previous?.files.find(f => f.id === draft.fileId);
  // Unrelated library revisions can be rebased only if this exact file has not changed.
  if ((oldFile?.sha256 ?? '') !== draft.baseHash) throw new Error('WRITING_NOTE_CONFLICT');
  const bytes = new TextEncoder().encode(draft.markdown), hash = await sha256(bytes), note = parseVaultNote(draft.markdown, draft.path);
  if (bytes.length > VAULT_LIMITS.markdownBytes) throw new Error('Note exceeds Markdown size limit');
  const file: VaultFile = { id: draft.fileId, path: safeVaultPath(draft.path), kind: 'note', mime: 'text/markdown; charset=utf-8', size: bytes.length, sha256: hash, nodeIds: oldFile?.nodeIds ?? draft.nodeIds, title: note.title, tags: note.tags, aliases: note.aliases };
  const files = [...(previous?.files ?? []).filter(f => f.id !== file.id), file];
  for (const asset of draft.assets) if (!files.some(f => f.path === asset.file.path)) files.push(asset.file);
  validateVaultManifest(files);
  const blobs = new Map<string, Blob>([[hash, new Blob([bytes])], ...draft.assets.map(a => [a.file.sha256, a.blob] as [string, Blob])]);
  // commitLocalVault checks the live library revision inside the same transaction.
  const seed: Vault = previous ?? { id: draft.vaultId, name: 'MCS 创作', revision: 0, storage: 'browser', files: [], createdAt: tick(), updatedAt: tick() };
  const next = { ...draft, title: note.title, baseHash: hash, baseRevision: seed.revision + 1, assets: [], draftRevision: draft.draftRevision + 1, updatedAt: tick() };
  const vault = await commitLocalVault({ files, blobs, diff: { files, added: oldFile ? 0 : 1, changed: oldFile ? 1 : 0, missing: 0, renamed: 0, unchanged: files.length - 1 }, scan: { name: seed.name, files, sources: new Map(), skipped: [] } }, seed, VAULT_LIMITS, { id: draft.id, revision: draft.draftRevision, next });
  return { draft: next, vault };
}

/** Explicitly fetch a whole cloud manifest, retaining unrelated notes and attachments. */
export async function fetchWritingLibrary(vault: Vault, ownerKey: string, signal: AbortSignal): Promise<Vault> {
  if (vault.storage !== 'account') return vault;
  const localId = `browser-account-${vault.id}-${ownerKey.replace(/[^a-zA-Z0-9_-]/g, '_')}`;
  const previous = await getLocalVault(localId);
  const mappingKey = [ownerKey, localId];
  const mapping = await getLocalValue<{ cloudId: string; revision: number }>('pending', mappingKey);
  if (previous) {
    if (mapping?.cloudId === vault.id && mapping.revision === vault.revision) return previous;
    // Keep local edits; ask the user to retain/export or remove the local branch before refetching.
    throw new Error('WRITING_CLOUD_CONFLICT');
  }
  const blobs = new Map<string, Blob>();
  for (const file of vault.files) {
    signal.throwIfAborted(); if (blobs.has(file.sha256)) continue;
    const blob = await readVaultFile(vault, file, signal);
    if (await sha256(await blob.arrayBuffer()) !== file.sha256) throw new Error('Cloud file hash mismatch');
    blobs.set(file.sha256, blob);
  }
  const fresh = (await api<{ vault: Vault }>(`/me/vaults/${vault.id}`, { signal })).vault;
  if (fresh.revision !== vault.revision) throw new Error('WRITING_CLOUD_CONFLICT');
  signal.throwIfAborted();
  // Use a revision-zero seed so commit assigns our stable local identity atomically.
  const seed: Vault = { ...vault, id: localId, storage: 'browser', revision: 0, files: [], cloudId: undefined, cloudRevision: undefined };
  const local = await commitLocalVault({ files: vault.files, blobs, diff: { files: vault.files, added: vault.files.length, changed: 0, missing: 0, renamed: 0, unchanged: 0 }, scan: { name: vault.name, files: vault.files, sources: new Map(), skipped: [] } }, seed);
  signal.throwIfAborted(); await putLocalValue('pending', mappingKey, { cloudId: vault.id, revision: vault.revision });
  return local;
}

export async function branchWritingDraft(draft: NoteDraft): Promise<NoteDraft> {
  const id = crypto.randomUUID(), creation = await getLocalVault(CREATION_VAULT);
  const prefix = `branches/${id}/`, sourceVault = await getLocalVault(draft.vaultId);
  const assets = draft.assets.map(a => ({ file: { ...a.file, id: `file-${crypto.randomUUID()}`, path: prefix + a.file.path }, blob: a.blob }));
  for (const link of parseVaultNote(draft.markdown).links) {
    const resolved = resolveVaultLink(sourceVault?.files ?? [], draft.path, link);
    if (resolved.length === 1 && resolved[0].kind === 'attachment' && !assets.some(a => a.file.path === prefix + resolved[0].path)) {
      const f = resolved[0]; assets.push({ file: { ...f, id: `file-${crypto.randomUUID()}`, path: prefix + f.path }, blob: await localBlob(f.sha256, f.size) });
    }
  }
  return persistWritingDraft({ ...draft, id, draftRevision: 0, fileId: `file-${id}`, vaultId: CREATION_VAULT, path: prefix + draft.path, baseHash: '', baseRevision: creation?.revision ?? 0, source: `draft:${draft.id}`, assets, markdown: updateDocumentMetadata(draft.markdown, { 'mcs-source': `draft:${draft.id}` }) });
}
