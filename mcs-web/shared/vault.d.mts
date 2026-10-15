export interface VaultFile { id: string; path: string; kind: 'note' | 'attachment'; size: number; sha256: string; mime: string; sourceRevision?: number; title?: string; aliases?: string[]; tags?: string[]; missing?: boolean; nodeIds: string[] }
export interface VaultRevision { revision: number; createdAt: string; files: VaultFile[] }
export interface Vault { id: string; name: string; revision: number; storage: 'browser' | 'account'; files: VaultFile[]; createdAt: string; updatedAt: string; cloudId?: string; cloudRevision?: number }
export interface VaultLink { target: string; fragment: string; label: string; embed: boolean; wiki: boolean; raw: string; offset: number }
export interface VaultNote { body: string; title: string; properties: Record<string, unknown>; aliases: string[]; tags: string[]; links: VaultLink[] }
export interface VaultLimits { markdownBytes: number; attachmentBytes: number; notes: number; vaultBytes: number; ownerBytes: number; chunkBytes: number }
export const VAULT_LIMITS: VaultLimits;
export const EXCLUDED_VAULT_DIRS: Set<string>;
export function normalizeLimits(raw?: Partial<VaultLimits>): VaultLimits;
export function safeVaultPath(raw: string): string;
export function fileKind(path: string): 'note' | 'attachment' | 'unsupported';
export function fileMime(path: string): string;
export function sha256(value: string | BufferSource): Promise<string>;
export function parseVaultNote(raw: string, path?: string): VaultNote;
export function proseOnly(body: string): string;
export function extractVaultLinks(body: string): VaultLink[];
export function resolveVaultLink(files: VaultFile[], fromPath: string, link: VaultLink): VaultFile[];
export function compareVaultFiles(previous: VaultFile[], incoming: VaultFile[], preserveLinks?: boolean): { files: VaultFile[]; added: number; changed: number; missing: number; renamed: number; unchanged: number };
export function validateVaultManifest(raw: unknown, limits?: VaultLimits): VaultFile[];
export function vaultAnchor(value: string): string;
export function parseByteRange(header: string | undefined, size: number): { start: number; end: number; partial: boolean } | null;
