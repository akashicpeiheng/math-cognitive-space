import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, formatError } from '../api';
import { useI18n } from '../i18n';
import { useVaults } from '../vault-context';
import type { VaultFile } from '../../../shared/vault.mjs';
interface Related { vaultId: string; vaultName: string; storage: 'browser' | 'account'; file: VaultFile }
export function RelatedVaultNotes({ nodeId }: { nodeId: string }) {
  const { pick, hrefFor } = useI18n(), vaults = useVaults();
  const [cloud, setCloud] = useState<{ identity: number; nodeId: string; notes: Related[] } | null>(null), [error, setError] = useState<string | null>(null);
  useEffect(() => {
    const controller = new AbortController(); let active = true; setError(null);
    if (vaults.cloudAllowed) void api<{ notes: Related[] }>(`/me/vaults/related/${encodeURIComponent(nodeId)}`, { signal: controller.signal }).then(data => { if (active) setCloud({ identity: vaults.identityKey, nodeId, notes: data.notes }); }).catch(e => { if (active && !controller.signal.aborted) setError(formatError(e)); });
    return () => { active = false; controller.abort(); };
  }, [nodeId, vaults.identityKey, vaults.cloudAllowed, vaults.cloud]);
  const local: Related[] = vaults.local.flatMap(v => v.files.filter(f => f.kind === 'note' && f.nodeIds.includes(nodeId)).map(file => ({ vaultId: v.id, vaultName: v.name, storage: 'browser' as const, file })));
  const notes = [...local, ...(vaults.cloudAllowed && cloud?.identity === vaults.identityKey && cloud.nodeId === nodeId ? cloud.notes : [])];
  if (!notes.length && !error) return null;
  return <section className="card related-vault-notes"><h2>{pick({ zh: '我的相关笔记', en: 'My related notes' })}</h2>
    {error && <p className="error">{error}</p>}
    <ul>{notes.map(n => <li key={`${n.storage}:${n.vaultId}:${n.file.id}`}><Link to={hrefFor('/library?' + new URLSearchParams({ vault: n.vaultId, storage: n.storage, note: n.file.id }))}>{n.file.title ?? n.file.path}</Link> <span className="muted">{n.vaultName} · {n.storage === 'browser' ? pick({ zh: '浏览器', en: 'browser' }) : pick({ zh: '账号', en: 'account' })}</span></li>)}</ul>
  </section>;
}
