import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { useAuth } from './auth';
import { api, formatError } from './api';
import type { Vault } from '../../shared/vault.mjs';
import { listLocalVaults } from './vault-local';

interface Value { local: Vault[]; cloud: Vault[]; error: string | null; refresh: () => Promise<void>; cloudAllowed: boolean; ownerKey: string; identityKey: number }
const Context = createContext<Value>({ local: [], cloud: [], error: null, refresh: async () => {}, cloudAllowed: false, ownerKey: 'guest', identityKey: 0 });
export function VaultProvider({ children }: { children: ReactNode }) {
  const auth = useAuth(), cloudAllowed = auth.ready && (auth.mode === 'local' || Boolean(auth.user));
  const ownerKey = auth.user?.id ?? (auth.mode === 'local' ? 'local' : 'guest');
  const [local, setLocal] = useState<Vault[]>([]), [cloudState, setCloud] = useState<{ owner: string; identity: number; vaults: Vault[] }>({ owner: '', identity: -1, vaults: [] });
  const [error, setError] = useState<string | null>(null);
  const generation = useRef(0), request = useRef<AbortController | null>(null);
  const refresh = useCallback(async () => {
    const current = ++generation.current; request.current?.abort(); const controller = new AbortController(); request.current = controller;
    const results = await Promise.allSettled([listLocalVaults(), cloudAllowed ? api<{ vaults: Vault[] }>('/me/vaults', { signal: controller.signal }) : Promise.resolve({ vaults: [] })]);
    if (current !== generation.current || controller.signal.aborted) return;
    if (results[0].status === 'fulfilled') setLocal(results[0].value); else setError(formatError(results[0].reason));
    if (results[1].status === 'fulfilled') { setCloud({ owner: ownerKey, identity: auth.identityKey, vaults: results[1].value.vaults }); if (results[0].status === 'fulfilled') setError(null); }
    else { setCloud({ owner: ownerKey, identity: auth.identityKey, vaults: [] }); setError(formatError(results[1].reason)); }
  }, [cloudAllowed, ownerKey, auth.identityKey]);
  useEffect(() => {
    void refresh(); const change = () => { void refresh(); }; window.addEventListener('mcs-vault-change', change);
    return () => { generation.current++; request.current?.abort(); window.removeEventListener('mcs-vault-change', change); };
  }, [refresh]);
  const cloud = cloudAllowed && cloudState.owner === ownerKey && cloudState.identity === auth.identityKey ? cloudState.vaults : [];
  return <Context.Provider value={{ local, cloud, error, refresh, cloudAllowed, ownerKey, identityKey: auth.identityKey }}>{children}</Context.Provider>;
}
export const useVaults = () => useContext(Context);
