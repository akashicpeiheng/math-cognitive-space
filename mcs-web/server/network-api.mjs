import { McsError, CODES } from '../shared/errors.mjs';
import { normalizePrivateRelation, relationSignature } from '../shared/network-workspace.mjs';
import { relationInputHash } from '../core/network-check.mjs';
import * as registry from '../data/formal/registry.mjs';
export async function checkNetworkRefs(refs, owner, ontology, db, allowBrowser = false) {
  for (const ref of refs) {
    if (ref.source === 'ontology') { const node = ontology.node(ref.id); if (String(node.version) !== ref.version) throw new McsError(CODES.CONFLICT, '公共节点版本已变化，请重新载入', 409); continue; }
    if (ref.storage === 'browser') { if (!allowBrowser) throw new McsError(CODES.BAD_REQUEST, '含本地笔记的视图请保存本机；同步前需主动上传笔记库', 400); continue; }
    const vault = await db.vaults.get(owner, ref.vaultId);
    const file = vault.files.find(f => f.id === ref.fileId && f.kind === 'note' && !f.missing);
    if (!file) throw new McsError(CODES.NOT_FOUND, '无法解析笔记端点', 404);
    if (file.sha256 !== ref.sha256 || vault.revision !== ref.revision) throw new McsError(CODES.CONFLICT, '笔记版本已变化，请重新载入', 409);
  }
}
export function registerNetworkApi({ route, db, jobs, config, authoring, getOntology }) {
  const owner = identity => identity.user.id;
  const register = (method, pattern, handler) => route(method, pattern, context => handler({ ...context, params: context.params.map(decodeURIComponent) }));
  const checkBindings = async (relation, mine) => {
    for (const side of ['from', 'to']) {
      const ref = relation[side], binding = relation.bindings[side];
      if (ref.source !== 'vault' || ref.storage !== 'account' || !binding) continue;
      const bytes = await db.vaults.bytes(mine, ref.sha256);
      if (!bytes.toString('utf8').replaceAll('\r\n', '\n').includes(binding.excerpt.replaceAll('\r\n', '\n'))) throw new McsError(CODES.BAD_REQUEST, '摘录未出现在绑定版本的笔记原文中', 400);
    }
  };
  register('GET', /^\/api\/v2\/me\/network-relations$/, async ({ identity, ontology }) => {
    const mine = owner(identity), records = await db.networks.list(mine, 'relation'), checks = await db.networks.list(mine, 'check');
    const relations = [];
    for (const relation of records.filter(r => r.status !== 'deleted')) {
      const signatures = new Set([relationSignature(relation), ...(relation.history ?? []).map(h => relationSignature(h.relation))]);
      const results = [];
      for (const record of checks.filter(c => signatures.has(relationSignature(c.relation))).reverse()) {
        const check = await getCheck(identity, record.id);
        if (check.result) results.push({ ...check.result, id: check.id, stale: check.inputHash !== relationInputHash(relation, ontology.version) });
      }
      try { await checkNetworkRefs([relation.from, relation.to], mine, ontology, db); } catch { for (const result of results) result.stale = true; }
      relations.push({ ...relation, checks: results });
    }
    return { relations };
  });
  const put = async ({ identity, params, body, ontology }) => {
    const relation = normalizePrivateRelation(body);
    await checkNetworkRefs([relation.from, relation.to], owner(identity), ontology, db);
    return { relation: await db.networks.putRelation(owner(identity), params[0] ?? null, body) };
  };
  register('POST', /^\/api\/v2\/me\/network-relations$/, put);
  register('PUT', /^\/api\/v2\/me\/network-relations\/([^/]+)$/, put);
  register('DELETE', /^\/api\/v2\/me\/network-relations\/([^/]+)$/, async ({ identity, params, body }) => {
    const old = await db.networks.get(owner(identity), params[0]);
    if (!old.id.startsWith('relation-')) throw new McsError(CODES.NOT_FOUND, '无法解析关系', 404);
    return { relation: await db.networks.update(owner(identity), old.id, body.baseRevision, { ...old, deleted: true }, 'deleted') };
  });
  register('POST', /^\/api\/v2\/network-relation-checks$/, async ({ identity, body, ontology }) => {
    const relation = normalizePrivateRelation(body.relation);
    await checkNetworkRefs([relation.from, relation.to], owner(identity), ontology, db, true);
    await checkBindings(relation, owner(identity));
    const job = jobs.run({ relation }, { kind: 'network-check', ontologyVersion: ontology.version, owner: owner(identity) });
    try {
      const record = await db.networks.create(owner(identity), 'check', { relation, inputHash: relationInputHash(relation, ontology.version), ontologyVersion: ontology.version, jobId: job.id }, job.status);
      jobs.onComplete(job.id, () => { void getCheck(identity, record.id).catch(() => {}); });
      return { check: record };
    }
    catch (error) { jobs.cancel(job.id); throw error; }
  });
  const getCheck = async (identity, id, cancel = false) => {
    const ontology = getOntology();
    const old = await db.networks.get(owner(identity), id);
    if (!old.id.startsWith('check-')) throw new McsError(CODES.NOT_FOUND, '无法解析验证任务', 404);
    if (!['queued', 'running'].includes(old.status)) {
      let stale = old.ontologyVersion !== ontology.version;
      try { await checkNetworkRefs([old.relation.from, old.relation.to], owner(identity), ontology, db, true); } catch { stale = true; }
      return { ...old, ...(old.result ? { result: { ...old.result, stale: stale || old.result.stale === true } } : {}) };
    }
    let job;
    try { job = jobs.get(old.jobId); } catch { return db.networks.update(owner(identity), id, old.revision, { ...old, result: { inputHash: old.inputHash, ontologyVersion: old.ontologyVersion, relationSignature: relationSignature(old.relation), structure: { status: 'valid', problems: [], scope: '端点声明检查' }, math: { status: 'undecided', reason: '服务重启，任务已中断', scope: '' }, run: { status: 'interrupted' } } }, 'interrupted'); }
    if (job.owner !== owner(identity) || job.kind !== 'network-check') throw new McsError(CODES.NOT_FOUND, '无法解析验证任务', 404);
    if (cancel) { jobs.cancel(old.jobId); job = jobs.get(old.jobId); }
    if (job.status !== old.status) {
      const result = job.result ?? { inputHash: old.inputHash, ontologyVersion: old.ontologyVersion, relationSignature: relationSignature(old.relation), structure: { status: 'valid', problems: [], scope: '端点声明检查' }, math: { status: 'undecided', reason: job.error?.message ?? '任务已取消', scope: '' }, run: { status: job.error?.code === CODES.EVIDENCE_RESOURCE ? 'timeout' : job.status === 'error' ? 'error' : job.status } };
      try { return await db.networks.update(owner(identity), id, old.revision, { ...old, result }, job.status); }
      catch (error) { if (error.status === 409 || error.code === CODES.CONFLICT) return db.networks.get(owner(identity), id); throw error; }
    }
    return old;
  };
  register('GET', /^\/api\/v2\/network-relation-checks\/([^/]+)$/, async ({ identity, params }) => ({ check: await getCheck(identity, params[0]) }));
  register('DELETE', /^\/api\/v2\/network-relation-checks\/([^/]+)$/, async ({ identity, params }) => ({ check: await getCheck(identity, params[0], true) }));
  register('GET', /^\/api\/v2\/me\/network-relations\/export$/, async ({ identity }) => ({ schema: 'mcs-private-network/1', relations: await db.networks.list(owner(identity), 'relation'), checks: await db.networks.list(owner(identity), 'check') }));
  register('GET', /^\/api\/v2\/me\/relation-submissions$/, async ({ identity }) => ({ submissions: await db.networks.list(owner(identity), 'submission') }));
  register('POST', /^\/api\/v2\/me\/relation-submissions$/, async ({ identity, body, ontology }) => {
    const normalized = normalizePrivateRelation(body.relation);
    await checkNetworkRefs([normalized.from, normalized.to], owner(identity), ontology, db, true);
    await checkBindings(normalized, owner(identity));
    for (const side of ['from', 'to']) if (normalized[side].source === 'vault' && normalized[side].storage === 'account') {
      const text = (await db.vaults.bytes(owner(identity), normalized[side].sha256)).toString('utf8').replaceAll('\r\n', '\n');
      if (!text.includes(String(body.endpoints?.[side]?.excerpt ?? '').replaceAll('\r\n', '\n'))) throw new McsError(CODES.BAD_REQUEST, '公开摘录未出现在绑定版本的笔记中', 400);
    }
    let evidence = null;
    if (body.checkId) {
      const check = await getCheck(identity, body.checkId);
      if (!check.result || ['queued', 'running'].includes(check.status) || check.inputHash !== relationInputHash(normalized, ontology.version) || check.result.stale) throw new McsError(CODES.CONFLICT, '证据与当前材料不对应或已经过期，请重新验证', 409);
      evidence = { checkId: check.id, result: check.result };
    }
    const submission = await db.networks.submit(owner(identity), body, evidence);
    return { submission };
  });
  register('DELETE', /^\/api\/v2\/me\/relation-submissions\/([^/]+)$/, async ({ identity, params, body }) => {
    const old = await db.networks.get(owner(identity), params[0]);
    if (!old.id.startsWith('submission-') || old.status === 'published') throw new McsError(CODES.BAD_REQUEST, '此投稿不能撤回', 400);
    return { submission: await db.networks.update(owner(identity), old.id, body.baseRevision, old, 'withdrawn') };
  });
  register('GET', /^\/api\/v2\/authoring\/relation-submissions$/, async () => ({ submissions: await db.networks.list(null, 'submission', true) }));
  register('PATCH', /^\/api\/v2\/authoring\/relation-submissions\/([^/]+)$/, async ({ params, body, ontology }) => {
    const old = await db.networks.get(null, params[0], true);
    if (!old.id.startsWith('submission-') || ['withdrawn', 'published'].includes(old.status)) throw new McsError(CODES.CONFLICT, '投稿已结束', 409);
    if (old.revision !== body.baseRevision) throw new McsError(CODES.CONFLICT, '投稿修订已变化，请重新载入', 409);
    if (!['pending', 'needs_changes', 'rejected', 'staged', 'published'].includes(body.status)) throw new McsError(CODES.BAD_REQUEST, '审阅状态无效', 400);
    // A staged contribution is a frozen input to the existing authoring workflow.
    const drafts = { ...(old.drafts ?? {}) }, mapping = { ...(old.mapping ?? {}) };
    const store = await authoring();
    const makeDraft = (side, publicId = null) => {
      const node = old.snapshot.endpoints[side], binding = old.snapshot.relation.bindings[side];
      const id = `submission:${old.id}:${side}`, nodeId = publicId || id;
      const registered = ontology.raw.formalSpecs?.[publicId] ?? registry.specs.find(s => s.node === publicId);
      const original = publicId ? registered : binding?.spec;
      const spec = original ? { ...original, specVersion: 'mcs-formal/1', node: nodeId, nodeVersion: publicId ? String(ontology.node(publicId).version) : '1', theoryVersion: original.theoryVersion ?? '1', declarations: original.declarations ?? [], definitions: original.definitions ?? [], assumptions: original.assumptions ?? [], claims: original.claims ?? [], references: original.references ?? [], boundary: original.boundary ?? [], source: old.snapshot.relation.source || '用户选定的公开摘录' } : null;
      const specSource = { declarations: (spec?.declarations ?? []).map(d => `${d.name} : ${d.type}`).join('\n'), definitions: (spec?.definitions ?? []).map(d => `${d.name} : ${d.type} := ${d.source}`).join('\n'), assumptions: (spec?.assumptions ?? []).map(d => `${d.id} : ${d.source}`).join('\n'), statement: spec?.statement?.source ?? '', claims: (spec?.claims ?? []).map(d => `${d.id} : ${d.source}`).join('\n') };
      return store.createDraft({ id, name: publicId ? nodeId : node.title, construct: publicId ? ontology.node(publicId).construct : node.construct, case: spec?.background?.split(':')[1]?.split('/')[0] ?? 'group', summary: node.excerpt, reading: node.excerpt, background: spec?.background ?? null, spec, specSource, ontologyVersion: ontology.version, node: { id: nodeId, version: spec?.nodeVersion ?? '1', title: node.title, construct: node.construct, roles: [], discipline: node.discipline, granularity: 'unit', formal: {}, contentMarkdown: node.excerpt, provenance: { sources: [old.snapshot.relation.source || '用户选定的公开摘录'] } } });
    };
    if (body.status === 'staged') {
      for (const side of ['from', 'to']) {
        const node = old.snapshot.endpoints[side], publicId = body.mapping?.[side] || mapping[side] || node.publicNodeId;
        if (publicId) { if (!drafts[side] || store.getDraft(drafts[side]).node?.id !== publicId) ontology.node(publicId); mapping[side] = publicId; continue; }
        if (!drafts[side]) drafts[side] = makeDraft(side).id;
        mapping[side] = store.getDraft(drafts[side]).spec?.node ?? store.getDraft(drafts[side]).node?.id;
      }
      if (!Object.keys(drafts).length) drafts.from = makeDraft('from', mapping.from).id;
    }
    let publication = old.publication;
    if (body.status === 'published') {
      if (old.status !== 'staged') throw new McsError(CODES.CONFLICT, '先完成候选映射与审阅', 409);
      const relation = ontology.raw.relationDescriptions.find(r => r.id === body.publicRelationId);
      if (!relation || relation.from !== mapping.from || relation.to !== mapping.to || relation.kind !== old.snapshot.relation.kind || !['verified', 'refuted'].includes(relation.verificationStatus) || relation.origin !== 'auto-discovery') throw new McsError(CODES.CONFLICT, '当前公共版本中没有与映射和类型对应的已审阅关系；请先在编写台完成证据重放与发布', 409);
      if (Object.keys(old.snapshot.relation.bindings).length && body.correspondenceConfirmed !== true) throw new McsError(CODES.BAD_REQUEST, '管理员须单独核对公开形式表达与摘录的对应', 400);
      publication = { relationId: relation.id, ontologyVersion: ontology.version, evidenceRef: relation.evidenceRef ?? null, correspondenceConfirmed: body.correspondenceConfirmed === true, at: new Date().toISOString() };
    }
    return { submission: await db.networks.update(null, old.id, body.baseRevision, { ...old, mapping, drafts, publication, reviews: [...old.reviews, { at: new Date().toISOString(), status: body.status, note: String(body.note ?? '').slice(0, 8000) }] }, body.status, true) };
  });
}
