// Private reference material. Importing a file never asserts mastery or edits M.
export const VAULT_LIMITS = Object.freeze({ markdownBytes: 2 * 1024 ** 2, attachmentBytes: 100 * 1024 ** 2, notes: 10000, vaultBytes: 500 * 1024 ** 2, ownerBytes: 1024 ** 3, chunkBytes: 512 * 1024 });
export const EXCLUDED_VAULT_DIRS = new Set(['.obsidian', '.git', '.trash', '.hg', '.svn', 'node_modules']);
const MEDIA = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp', avif: 'image/avif', bmp: 'image/bmp', pdf: 'application/pdf', mp3: 'audio/mpeg', wav: 'audio/wav', ogg: 'audio/ogg', m4a: 'audio/mp4', flac: 'audio/flac', mp4: 'video/mp4', webm: 'video/webm', mov: 'video/quicktime' };
export function safeVaultPath(raw) {
  if (typeof raw !== 'string' || !raw || raw.length > 2048 || /[\x00-\x1f]/.test(raw) || /^(?:[a-z]:|[\\/])/i.test(raw)) throw new Error('Invalid vault path');
  const parts = raw.replaceAll('\\', '/').split('/');
  if (parts.some(p => !p || p === '.' || p === '..' || EXCLUDED_VAULT_DIRS.has(p.toLowerCase()))) throw new Error('Invalid or excluded vault path');
  return parts.join('/');
}
export function fileKind(path) { return /\.md$/i.test(path) ? 'note' : MEDIA[path.split('.').pop().toLowerCase()] ? 'attachment' : 'unsupported'; }
export function fileMime(path) { return /\.md$/i.test(path) ? 'text/markdown; charset=utf-8' : MEDIA[path.split('.').pop().toLowerCase()] ?? 'application/octet-stream'; }
export function normalizeLimits(raw = {}) {
  // Chunk stride is a storage format, not a quota; changing it would corrupt existing reads.
  return Object.fromEntries(Object.entries(VAULT_LIMITS).map(([key, fallback]) => [key, key !== 'chunkBytes' && Number.isSafeInteger(raw[key]) && raw[key] > 0 ? raw[key] : fallback]));
}
export async function sha256(value) {
  const bytes = typeof value === 'string' ? new TextEncoder().encode(value) : value;
  return [...new Uint8Array(await globalThis.crypto.subtle.digest('SHA-256', bytes))].map(b => b.toString(16).padStart(2, '0')).join('');
}
const scalar = s => s.trim().replace(/^(['"])(.*)\1$/, '$2');
export function parseVaultNote(raw, path = '') {
  const original = raw.replace(/^\uFEFF/, '');
  let body = original, properties = {};
  const fm = original.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
  if (fm) {
    body = original.slice(fm[0].length);
    let current = null;
    for (const line of fm[1].split(/\r?\n/)) {
      const item = line.match(/^\s+-\s+(.+)$/);
      if (item && current) { if (!Array.isArray(properties[current])) properties[current] = []; properties[current].push(scalar(item[1])); continue; }
      const entry = line.match(/^([\w\u0080-\uffff-]+):\s*(.*)$/);
      if (!entry) continue;
      current = entry[1]; const value = entry[2].trim();
      properties[current] = value.startsWith('[') && value.endsWith(']') ? value.slice(1, -1).split(',').map(scalar).filter(Boolean) : scalar(value);
    }
  }
  const list = value => (Array.isArray(value) ? value : typeof value === 'string' ? value.split(/[,\s]+/) : []).filter(Boolean);
  const aliasList = value => (Array.isArray(value) ? value : typeof value === 'string' ? [value] : []).filter(Boolean);
  const aliases = [...new Set([...aliasList(properties.aliases), ...aliasList(properties.alias)])];
  const tags = [...new Set([...list(properties.tags), ...[...body.matchAll(/(?:^|\s)#([\p{L}\p{N}_/-]+)/gu)].map(m => m[1])])];
  return { body, properties, aliases, tags, title: properties.title || body.match(/^#\s+(.+)$/m)?.[1]?.trim() || path.split('/').pop()?.replace(/\.md$/i, '') || 'Untitled', links: extractVaultLinks(body) };
}
// Keep code samples literal: neither backlinks nor embeds are extracted from code.
export function proseOnly(body) {
  const blank = m => ' '.repeat(m.length);
  return body.replace(/^\s*(`{3,}|~{3,})[^\n]*\n[\s\S]*?^\s*\1\s*$/gm, blank).replace(/(`+)[^\n]*?\1/g, blank)
    .replace(/(?<!\\)\$\$[\s\S]*?(?<!\\)\$\$/g, blank)
    .replace(/(?<!\\)\$(?!\$)(?:\\.|[^$\\])*?(?<!\\)\$/g, blank);
}
export function extractVaultLinks(body) {
  const text = proseOnly(body), links = [];
  const re = /(!?)\[\[([^\]\n]+)\]\]|(!?)\[([^\]\n]*)\]\(([^)\n]+)\)/g;
  for (const m of text.matchAll(re)) {
    const wiki = m[2] !== undefined, whole = wiki ? m[2] : m[5].replace(/^<|>$/g, '').replace(/\s+["'][\s\S]*$/, '');
    if (!wiki && /^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(whole)) continue;
    const [target, label] = wiki ? whole.split('|') : [whole, m[4]];
    const hash = target.indexOf('#');
    let fragment = hash < 0 ? '' : target.slice(hash + 1);
    if (!wiki) try { fragment = decodeURIComponent(fragment); } catch { /* keep a literal malformed escape */ }
    links.push({ target: hash < 0 ? target : target.slice(0, hash), fragment, label: label ?? '', embed: Boolean(wiki ? m[1] : m[3]), wiki, raw: m[0], offset: m.index });
  }
  return links;
}
function relativePath(from, target) {
  const parts = from.split('/').slice(0, -1);
  for (const p of target.replaceAll('\\', '/').split('/')) { if (!p || p === '.') continue; if (p === '..') { if (!parts.length) return null; parts.pop(); } else parts.push(p); }
  return parts.join('/');
}
export function resolveVaultLink(files, fromPath, link) {
  let target; try { target = decodeURIComponent(link.target); } catch { target = link.target; }
  if (!target) return files.filter(f => f.path === fromPath);
  if (/^(?:[a-z][a-z\d+.-]*:|\/\/|\/)/i.test(target)) return [];
  const withExt = value => [value, ...(!/\.[^/]+$/.test(value) ? [value + '.md'] : [])];
  const local = relativePath(fromPath, target);
  // Copies retain their original Markdown and directory tree inside a private
  // namespace. Vault-root Wiki links and basename links must resolve there
  // before another copied note with the same attachment name is considered.
  const scope = fromPath.match(/^(?:(?:copies|branches)\/[a-f\d-]{36}\/)+/i)?.[0];
  if (scope) {
    const scoped = files.filter(f => withExt(scope + target).includes(f.path) || (local && withExt(local).includes(f.path) && f.path.startsWith(scope)));
    if (scoped.length) return scoped;
  }
  const exact = files.filter(f => withExt(target).includes(f.path) || (local && withExt(local).includes(f.path)));
  if (exact.length) return exact;
  if (!link.wiki || target.includes('/')) return [];
  const matches = files.filter(f => withExt(target).includes(f.path.split('/').pop()) || f.aliases?.includes(target));
  const scoped = scope ? matches.filter(f => f.path.startsWith(scope)) : [];
  // A missing link in one copy must not borrow a same-named attachment from
  // a different copy. Explicit full paths still resolve above.
  return !scope ? matches : scoped.length ? scoped : matches.filter(f => !/^(?:copies|branches)\/[a-f\d-]{36}\//i.test(f.path));
}
export function compareVaultFiles(previous, incoming, preserveLinks = true) {
  const byPath = new Map(previous.map(f => [f.path, f]));
  const paths = new Set(incoming.map(f => f.path));
  const missing = previous.filter(f => !paths.has(f.path));
  const newFiles = incoming.filter(f => !byPath.has(f.path));
  const renames = new Map();
  for (const f of newFiles) {
    const old = missing.filter(p => p.sha256 === f.sha256 && p.kind === f.kind);
    if (old.length === 1 && newFiles.filter(p => p.sha256 === f.sha256 && p.kind === f.kind).length === 1) renames.set(f.path, old[0]);
  }
  const renamedIds = new Set([...renames.values()].map(f => f.id));
  const files = incoming.map(f => {
    const old = byPath.get(f.path) ?? renames.get(f.path);
    const keepLinks = preserveLinks || (renames.has(f.path) && f.id !== old?.id);
    return { ...f, id: old?.id ?? f.id, nodeIds: (keepLinks ? old?.nodeIds : undefined) ?? f.nodeIds ?? [], missing: Boolean(f.missing) };
  });
  for (const f of missing) if (!renamedIds.has(f.id)) files.push({ ...f, missing: true });
  return { files, added: newFiles.length - renames.size, changed: incoming.filter(f => byPath.has(f.path) && byPath.get(f.path).sha256 !== f.sha256).length, missing: missing.length - renamedIds.size, renamed: renames.size, unchanged: incoming.filter(f => byPath.get(f.path)?.sha256 === f.sha256).length };
}
export function validateVaultManifest(raw, limits = VAULT_LIMITS) {
  if (!Array.isArray(raw) || raw.length > limits.notes * 10) throw new Error('Invalid vault manifest');
  const paths = new Set(), ids = new Set(); let total = 0, notes = 0;
  for (const f of raw) {
    safeVaultPath(f.path);
    if (typeof f.id !== 'string' || !/^[a-zA-Z0-9_-]{1,100}$/.test(f.id) || ids.has(f.id) || paths.has(f.path)) throw new Error('Duplicate or invalid file identity');
    if (!/^[a-f0-9]{64}$/.test(f.sha256) || !Number.isSafeInteger(f.size) || f.size < 0 || !['note', 'attachment'].includes(f.kind) || fileKind(f.path) !== f.kind) throw new Error('Invalid file metadata');
    if (f.size > (f.kind === 'note' ? limits.markdownBytes : limits.attachmentBytes)) throw new Error('File exceeds size limit');
    if (f.kind === 'note') notes++; total += f.size; paths.add(f.path); ids.add(f.id);
  }
  if (notes > limits.notes || total > limits.vaultBytes) throw new Error('Vault exceeds size limit');
  return raw.map(f => ({ id: f.id, path: f.path, kind: f.kind, size: f.size, sha256: f.sha256, mime: fileMime(f.path), missing: Boolean(f.missing), nodeIds: Array.isArray(f.nodeIds) ? [...new Set(f.nodeIds.filter(n => typeof n === 'string' && n.length < 200))] : [] }));
}
export function vaultAnchor(value) { return value.startsWith('^') ? 'block-' + value.slice(1) : value.trim().toLowerCase().replace(/\s+/g, '-'); }
export function parseByteRange(header, size) {
  if (!header) return { start: 0, end: size - 1, partial: false };
  const m = header.match(/^bytes=(\d*)-(\d*)$/);
  if (!m || (!m[1] && !m[2]) || !size) return null;
  const start = m[1] ? Number(m[1]) : Math.max(0, size - Number(m[2]));
  const end = m[1] ? (m[2] ? Math.min(Number(m[2]), size - 1) : size - 1) : size - 1;
  return Number.isSafeInteger(start) && Number.isSafeInteger(end) && start >= 0 && start <= end && start < size ? { start, end, partial: true } : null;
}
