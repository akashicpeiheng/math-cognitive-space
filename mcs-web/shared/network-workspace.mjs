// Private network declarations. They are E data; no declaration here mutates M.
import { McsError, CODES } from './errors.mjs';
export const NETWORK_SCHEMA = 'mcs-network/2';
export const PRIVATE_KINDS = ['related', 'definitionReference', 'scaling', 'equivalentTo', 'conditionalDerivation', 'instanceOf', 'counterexampleTo'];
const object = value => value && typeof value === 'object' && !Array.isArray(value);
const fail = message => { throw new McsError(CODES.BAD_REQUEST, message, 400); };
export function normalizeNodeRef(raw) {
  if (!object(raw)) fail('节点引用必须是对象');
  if (raw.source === 'ontology' && typeof raw.id === 'string' && raw.id.length && raw.id.length <= 300) return { source: 'ontology', id: raw.id, version: String(raw.version ?? '') };
  if (raw.source !== 'vault' || !['browser', 'account'].includes(raw.storage)) fail('未知节点来源');
  for (const key of ['vaultId', 'fileId']) if (typeof raw[key] !== 'string' || !raw[key] || raw[key].length > 300) fail(`缺少 ${key}`);
  if (!Number.isInteger(raw.revision) || raw.revision < 1 || !/^[a-f0-9]{64}$/.test(raw.sha256 ?? '')) fail('笔记引用需要修订和 SHA-256');
  return { source: 'vault', storage: raw.storage, vaultId: raw.vaultId, fileId: raw.fileId, revision: raw.revision, sha256: raw.sha256 };
}
export function nodeRefKey(ref) {
  return ref.source === 'ontology' ? ref.id : `note:${ref.storage}:${encodeURIComponent(ref.vaultId)}:${encodeURIComponent(ref.fileId)}`;
}
export function decodeNoteKey(key) {
  const match = /^note:(browser|account):([^:]+):([^:]+)$/.exec(key);
  if (!match) return null;
  try { return { source: 'vault', storage: match[1], vaultId: decodeURIComponent(match[2]), fileId: decodeURIComponent(match[3]) }; } catch { return null; }
}
const text = (value, max = 8000) => typeof value === 'string' ? value.trim().slice(0, max) : '';
export function normalizePrivateRelation(raw) {
  if (!object(raw) || !PRIVATE_KINDS.includes(raw.kind)) fail('未知私人关系类型');
  const from = normalizeNodeRef(raw.from), to = normalizeNodeRef(raw.to);
  if (nodeRefKey(from) === nodeRefKey(to)) fail('关系的两端不能相同');
  const reason = text(raw.reason); if (!reason) fail('请填写关系理由');
  const bindings = {};
  for (const side of ['from', 'to']) {
    const binding = raw.bindings?.[side]; if (!binding) continue;
    if (!object(binding) || !object(binding.spec)) fail('形式表达格式不正确');
    // Explicitly select only language inputs, never user-supplied results or axioms.
    const spec = {};
    for (const key of ['background', 'theoryVersion', 'declarations', 'definitions', 'assumptions', 'statement', 'claims', 'references', 'boundary', 'source']) if (binding.spec[key] !== undefined) spec[key] = binding.spec[key];
    bindings[side] = { excerpt: text(binding.excerpt, 16000), section: text(binding.section, 300), correspondenceConfirmed: binding.correspondenceConfirmed === true, spec };
    if ([from, to][side === 'from' ? 0 : 1].source === 'vault' && !bindings[side].excerpt) fail('笔记的形式表达需要绑定原文摘录');
  }
  return { from, to, kind: raw.kind, conditions: text(raw.conditions), reason, source: text(raw.source), bindings, significance: text(raw.significance) };
}
export function relationSignature(raw) {
  const sort = value => Array.isArray(value) ? value.map(sort) : object(value) ? Object.fromEntries(Object.keys(value).sort().map(key => [key, sort(value[key])])) : value;
  return JSON.stringify(sort(normalizePrivateRelation(raw)));
}
export function checkRelationStructure(relation) {
  const problems = [];
  try { normalizePrivateRelation(relation); } catch (error) { problems.push(error.message); }
  if (relation.kind === 'conditionalDerivation' && !relation.conditions?.trim()) problems.push('条件推导需要明确条件（无额外条件时填写“无额外条件”）');
  return { status: problems.length ? 'invalid' : 'valid', problems, scope: '类型、方向、条件与端点声明检查；不是数学证明' };
}
export function normalizeNetworkExtras(payload) {
  if (payload.schema !== NETWORK_SCHEMA) return {};
  const refs = (Array.isArray(payload.refs) ? payload.refs : []).map(normalizeNodeRef);
  if (refs.length > 2000) fail('每张视图最多 2,000 个节点');
  const sources = (Array.isArray(payload.sources) ? payload.sources : []).filter(object).map(s => {
    if (s.kind === 'ontology') return { kind: 'ontology' };
    if (s.kind !== 'vault' || !['browser', 'account'].includes(s.storage) || !text(s.vaultId, 300)) fail('视图来源无效');
    return { kind: 'vault', storage: s.storage, vaultId: text(s.vaultId, 300) };
  });
  const filters = { noteReference: payload.filters?.noteReference !== false, privateReference: payload.filters?.privateReference !== false, privateRelation: payload.filters?.privateRelation !== false };
  const placements = {};
  for (const [id, point] of Object.entries(object(payload.placements) ? payload.placements : {}).slice(0, 2000)) {
    if (object(point) && Number.isFinite(point.x) && Number.isFinite(point.y) && Math.abs(point.x) <= 2000000 && Math.abs(point.y) <= 2000000) placements[id] = { x: point.x, y: point.y };
  }
  const layout = object(payload.layout) && ['free', 'learning', 'logic'].includes(payload.layout.mode) ? { mode: payload.layout.mode, anchors: { learning: text(payload.layout.anchors?.learning, 1000) || null, logic: text(payload.layout.anchors?.logic, 1000) || null } } : undefined;
  return { schema: NETWORK_SCHEMA, refs, sources, filters, ...(Object.keys(placements).length ? { placements } : {}), ...(layout ? { layout } : {}) };
}
export function normalizeSubmission(raw) {
  const relation = normalizePrivateRelation(raw.relation);
  const endpoints = {};
  for (const side of ['from', 'to']) {
    const node = raw.endpoints?.[side];
    if (!object(node) || !text(node.title, 300)) fail('投稿需要两端的公开标题');
    endpoints[side] = { title: text(node.title, 300), excerpt: text(node.excerpt, 16000), publicNodeId: text(node.publicNodeId, 300), construct: text(node.construct, 60) || 'Claim', discipline: text(node.discipline, 300) || '待分类' };
    if (relation[side].source === 'vault' && !endpoints[side].excerpt) fail('私人笔记投稿需要最小公开摘录');
  }
  // No private library locators enter the public candidate snapshot.
  const bindings = {};
  for (const side of ['from', 'to']) if (relation.bindings[side]) {
    const binding = relation.bindings[side];
    const spec = { ...binding.spec, source: '用户选定的公开摘录' };
    // References to private note addresses cannot become public references.
    if (JSON.stringify(spec).includes('note:browser:') || JSON.stringify(spec).includes('note:account:')) fail('请将形式材料中的私人笔记引用改为公共引用后投稿');
    bindings[side] = { ...binding, excerpt: endpoints[side].excerpt, correspondenceConfirmed: binding.correspondenceConfirmed && binding.excerpt === endpoints[side].excerpt, spec };
  }
  const publicRelation = { kind: relation.kind, conditions: relation.conditions, reason: relation.reason, source: relation.source, bindings };
  return { relation: publicRelation, endpoints };
}
