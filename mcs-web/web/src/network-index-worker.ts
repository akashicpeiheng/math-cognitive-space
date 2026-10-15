import { indexNote } from './network-workspace';
import type { VaultFile } from '../../shared/vault.mjs';
const cached = new Map<string, ReturnType<typeof indexNote>>();
const libraries = new Map<string, VaultFile[]>();
self.onmessage = (event: MessageEvent<{ requestId: number; library: string; files?: VaultFile[]; file: VaultFile; text?: string }>) => {
  const { requestId, library, file, text } = event.data;
  if (event.data.files) { libraries.set(library, event.data.files); return; }
  const files = libraries.get(library) ?? [];
  // Link targets can change when another note is added or renamed.
  const key = `${library}:${file.id}:${file.sha256}`;
  const found = cached.get(key);
  if (found) { self.postMessage({ requestId, note: found }); return; }
  if (text === undefined) { self.postMessage({ requestId, needsText: true }); return; }
  try { const note = indexNote(files, file, text); cached.set(key, note); if (cached.size > 10000) cached.delete(cached.keys().next().value!); self.postMessage({ requestId, note }); }
  catch (error) { self.postMessage({ requestId, error: String(error) }); }
};
