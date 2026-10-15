import { parseVaultNote, proseOnly, resolveVaultLink } from '../../shared/vault.mjs';
import type { Vault, VaultFile } from '../../shared/vault.mjs';
import { nodeRefKey, decodeNoteKey, normalizePrivateRelation, relationSignature } from '../../shared/network-workspace.mjs';
import type { NetworkNodeRef, PrivateRelation, NetworkExtras } from '../../shared/network-workspace.mjs';
import type { NetworkGraph, RelationEdge } from './network';
import type { NodeSummary } from './types';
export const DOT_THRESHOLD = 0.55, CARD_THRESHOLD = 0.65;
/**
 * 圆点的**屏幕**半径（px）。
 *
 * 它在世界里是 `DOT_RADIUS_PX / scale`——缩放到任何比例，圆点在屏幕上都一样大。
 * 抽成常量是因为它不止画一次：边要按它裁锚点（`circleAnchor`），
 * 圆点下方的名称标签也要按它算该从哪儿起笔（见 `web/src/dot-labels.ts`），
 * 三处若各写一个 8，改一处就会悄悄对不齐。
 */
export const DOT_RADIUS_PX = 8;
export function nextNodeShape(current: 'card' | 'dot', scale: number): 'card' | 'dot' { return scale < DOT_THRESHOLD ? 'dot' : scale > CARD_THRESHOLD ? 'card' : current; }
export function circleAnchor(from: { x: number; y: number }, to: { x: number; y: number }, radius: number) {
  const a = { x: from.x + 86, y: from.y + 29 }, b = { x: to.x + 86, y: to.y + 29 };
  const distance = Math.hypot(b.x - a.x, b.y - a.y) || 1, dx = (b.x - a.x) / distance, dy = (b.y - a.y) / distance;
  return { x1: a.x + dx * radius, y1: a.y + dy * radius, x2: b.x - dx * radius, y2: b.y - dy * radius };
}
export interface IndexedNote { id: string; summary: string; significance: string; section: string; outgoing: string[]; ambiguous: number; missing: number }
export interface NoteMeta { ref: NetworkNodeRef; vault: Vault; file: VaultFile; indexed?: IndexedNote; unavailable?: boolean }
export function extractSignificance(body: string) {
  const lines = body.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const heading = /^(#{1,6})\s+(.+)/.exec(lines[i]);
    if (!heading || !/动机|引入|构造动机|数学意义|理论意义|理论定位|升维|motivation|mathematical significance|theoretical|higher.level/i.test(heading[2])) continue;
    let end = i + 1;
    for (; end < lines.length; end++) { const next = /^(#{1,6})\s/.exec(lines[end]); if (next && next[1].length <= heading[1].length) break; }
    const value = proseOnly(lines.slice(i + 1, end).join('\n')).replace(/^#+\s*/gm, '').trim();
    if (value) return { significance: value.slice(0, 650), section: heading[2] };
  }
  return { significance: '', section: '' };
}
export function indexNote(files: VaultFile[], file: VaultFile, text: string): IndexedNote {
  const note = parseVaultNote(text, file.path), outgoing = new Set<string>(); let ambiguous = 0, missing = 0;
  for (const link of note.links) {
    if (/^[a-z][a-z0-9+.-]*:/i.test(link.target)) continue;
    const resolved = resolveVaultLink(files, file.path, link);
    if (resolved.length > 1) { ambiguous++; continue; }
    if (!resolved.length) { missing++; continue; }
    if (resolved[0].missing) { missing++; continue; }
    if (resolved[0].kind === 'note' && resolved[0].id !== file.id) outgoing.add(resolved[0].id);
  }
  const summary = proseOnly(note.body).replace(/^#+.*$/gm, '').trim().split(/\n\s*\n/).find(p => p.trim()) ?? '';
  return { id: file.id, summary: summary.slice(0, 220), ...extractSignificance(note.body), outgoing: [...outgoing], ambiguous, missing };
}
export function noteRef(vault: Vault, file: VaultFile): NetworkNodeRef { return { source: 'vault', storage: vault.storage, vaultId: vault.id, fileId: file.id, revision: vault.revision, sha256: file.sha256 }; }
export function projectMixedGraph(base: NetworkGraph, vaults: Vault[], indexes: Map<string, IndexedNote>, relations: PrivateRelation[], filters: Required<NetworkExtras>['filters'], requested: string[] = []) {
  const nodes = [...base.nodes], metadata = new Map<string, NoteMeta>(), displayEdges: RelationEdge[] = [];
  const refs = new Map<string, NetworkNodeRef>(base.nodes.map(n => [n.id, { source: 'ontology', id: n.id, version: n.version }]));
  for (const vault of vaults) for (const file of vault.files.filter(f => f.kind === 'note')) {
    const ref = noteRef(vault, file), id = nodeRefKey(ref), indexed = indexes.get(id);
    refs.set(id, ref); metadata.set(id, { ref, vault, file, indexed, unavailable: Boolean(file.missing) });
    // A display adapter for the existing renderer, never an ontology registration.
    nodes.push({ id, title: file.title || file.path.replace(/\.md$/i, ''), version: String(vault.revision), construct: 'Representation', roles: [], discipline: '私人笔记', case: vault.name, summary: file.missing ? '笔记不可用，请恢复源文件 / Note unavailable; restore source file' : indexed?.summary ?? '', evidenceStatus: 'NOT-CLAIMED', hasContent: !file.missing, actionCount: 0, relationCount: 0, evidenceCount: 0 });
    if (filters.noteReference) for (const target of indexed?.outgoing ?? []) displayEdges.push({ source: 'relation', id: `note-link:${id}:${target}`, from: id, to: nodeRefKey({ ...ref, fileId: target } as NetworkNodeRef), kind: 'noteReference', witnessStatus: 'NOT-CLAIMED', scope: file.path, scaling: null, origin: 'noteReference' });
    if (filters.privateReference) for (const target of file.nodeIds ?? []) if (refs.has(target)) displayEdges.push({ source: 'relation', id: `note-ref:${id}:${target}`, from: id, to: target, kind: 'privateReference', witnessStatus: 'NOT-CLAIMED', scope: '用户已有的私人参考关联', scaling: null, origin: 'privateReference' });
  }
  if (filters.privateRelation) for (const relation of relations.filter(r => !r.deleted)) {
    const check = relation.checks?.at(-1), stale = [relation.from, relation.to].some(ref => JSON.stringify(ref) !== JSON.stringify(refs.get(nodeRefKey(ref)))) || Boolean(check && (check.relationSignature !== relationSignature(relation) || check.ontologyVersion !== base.version));
    displayEdges.push({ source: 'relation', id: `personal:${relation.id}`, from: nodeRefKey(relation.from), to: nodeRefKey(relation.to), kind: relation.kind === 'related' ? 'privateReference' : relation.kind, witnessStatus: !stale && !check?.stale && check?.math.status === 'verified' ? check.label ?? 'NOT-CLAIMED' : 'NOT-CLAIMED', scope: `${relation.reason}${relation.conditions ? ` · ${relation.conditions}` : ''}${stale ? ' · 端点版本已变化' : ''}`, scaling: null, origin: 'privateRelation' });
  }
  // Missing libraries keep explicit placeholders instead of losing selected references.
  for (const id of requested) if (decodeNoteKey(id) && !nodes.some(n => n.id === id)) nodes.push({ id, title: '笔记来源不可用 / Note source unavailable', version: '', construct: 'Representation', roles: [], discipline: '私人笔记', case: 'unavailable', summary: '请恢复原笔记库 / Restore the original library', evidenceStatus: 'NOT-CLAIMED', hasContent: false, actionCount: 0, relationCount: 0, evidenceCount: 0 });
  return { graph: { ...base, nodes, displayEdges }, metadata, refs };
}
export function normalizeLocalRelation(raw: PrivateRelation, old?: PrivateRelation): PrivateRelation {
  return { ...normalizePrivateRelation(raw), local: true, id: old?.id ?? `relation-${crypto.randomUUID()}`, revision: (old?.revision ?? 0) + 1, history: [...(old?.history ?? []), ...(old ? [{ revision: old.revision, relation: normalizePrivateRelation(old) }] : [])], checks: (old?.checks ?? []).map(c => ({ ...c, stale: c.stale || c.relationSignature !== relationSignature(raw) })) };
}
