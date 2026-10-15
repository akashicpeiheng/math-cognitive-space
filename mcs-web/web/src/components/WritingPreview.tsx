import { useCallback, useEffect, useMemo, useState } from 'react';
import { VaultDocument } from './VaultDocument';
import type { VaultFileReader } from './VaultDocument';
import { getLocalVault } from '../vault-local';
import { readVaultFile } from '../vault-cloud';
import { useI18n } from '../i18n';
import { formatError } from '../api';
import type { NoteDraft } from '../writing-store';
import type { Vault, VaultFile } from '../../../shared/vault.mjs';
import { vaultAnchor } from '../../../shared/vault.mjs';

/** Preview the sole live Markdown, including copied assets before the first save. */
export function WritingPreview({ draft, markdown }: { draft: NoteDraft; markdown: string }) {
  const { pick, hrefFor } = useI18n();
  const [library, setLibrary] = useState<Vault | null>(null), [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    void getLocalVault(draft.vaultId).then(vault => { if (active) setLibrary(vault ?? null); }).catch(e => { if (active) setError(formatError(e)); });
    return () => { active = false; };
  }, [draft.vaultId, draft.baseRevision]);
  const note = useMemo<VaultFile>(() => ({ id: draft.fileId, path: draft.path, kind: 'note', size: 0, sha256: draft.baseHash, mime: 'text/markdown', title: draft.title, nodeIds: draft.nodeIds }), [draft.fileId, draft.path, draft.baseHash, draft.title, draft.nodeIds]);
  const vault = useMemo<Vault>(() => ({
    id: draft.vaultId, name: library?.name ?? 'MCS', revision: library?.revision ?? 0, storage: 'browser', createdAt: library?.createdAt ?? draft.updatedAt, updatedAt: draft.updatedAt,
    files: [...(library?.files ?? []).filter(f => f.id !== note.id && !draft.assets.some(a => a.file.id === f.id)), ...draft.assets.map(a => a.file), note],
  }), [library, draft.vaultId, draft.updatedAt, draft.assets, note]);
  const reader = useCallback<VaultFileReader>(async (source, file, signal) => {
    signal?.throwIfAborted();
    const asset = draft.assets.find(a => a.file.sha256 === file.sha256);
    return asset ? asset.blob : readVaultFile(source, file, signal);
  }, [draft.assets]);
  const onOpen = useCallback((file: VaultFile, fragment?: string) => {
    window.open(hrefFor(`/library?vault=${encodeURIComponent(draft.vaultId)}&storage=browser&note=${encodeURIComponent(file.id)}${fragment ? '#' + encodeURIComponent(vaultAnchor(fragment)) : ''}`), '_blank', 'noopener');
  }, [draft.vaultId, hrefFor]);
  return <>{error && <p className="error" role="alert">{pick({ zh: '预览附件读取失败：', en: 'Preview attachment read failed: ' })}{error}</p>}<VaultDocument vault={vault} file={note} markdown={markdown} readFile={reader} onOpen={onOpen} /></>;
}
