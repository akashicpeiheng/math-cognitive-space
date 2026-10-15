import { normalizeLimits, parseByteRange } from '../shared/vault.mjs';
import { McsError, CODES } from '../shared/errors.mjs';

export function registerVaultApi({ route, db, config }) {
  const register = (method, pattern, handler) => route(method, pattern, context => handler({ ...context, params: context.params.map(decodeURIComponent) }));
  const store = () => { db.vaults.limits = normalizeLimits({ ...db.vaults.limits, ...config.vaultLimits }); return db.vaults; };
  const owner = identity => identity.user.id;
  const validateLinks = (nodeIds, ontology) => {
    if (!Array.isArray(nodeIds)) throw new McsError(CODES.BAD_REQUEST, '节点关联格式无效。', 400);
    for (const id of nodeIds) ontology.node(id);
  };
  register('GET', /^\/api\/v2\/vault-capabilities$/, async () => ({ limits: store().limits }));
  register('GET', /^\/api\/v2\/me\/vaults$/, async ({ identity }) => ({ vaults: await store().list(owner(identity)) }));
  register('POST', /^\/api\/v2\/me\/vaults$/, async ({ body, identity }) => ({ vault: await store().create(owner(identity), body.name) }));
  register('GET', /^\/api\/v2\/me\/vaults\/related\/([^/]+)$/, async ({ params, identity, ontology }) => {
    ontology.node(params[0]); const notes = [];
    for (const lib of await store().list(owner(identity))) {
      const vault = await store().get(owner(identity), lib.id);
      for (const f of vault.files) if (f.kind === 'note' && f.nodeIds?.includes(params[0])) notes.push({ vaultId: lib.id, vaultName: lib.name, storage: 'account', file: f });
    }
    return { notes };
  });
  register('GET', /^\/api\/v2\/me\/vaults\/([^/]+)$/, async ({ params, query, identity }) => ({ vault: await store().get(owner(identity), params[0], query.has('revision') ? query.get('revision') : undefined) }));
  register('DELETE', /^\/api\/v2\/me\/vaults\/([^/]+)$/, async ({ params, identity }) => store().remove(owner(identity), params[0]));
  register('GET', /^\/api\/v2\/me\/vaults\/([^/]+)\/history$/, async ({ params, identity }) => ({ revisions: await store().history(owner(identity), params[0]) }));
  register('POST', /^\/api\/v2\/me\/vaults\/([^/]+)\/imports$/, async ({ params, body, ontology, identity }) => {
    for (const f of Array.isArray(body.files) ? body.files : []) validateLinks(f.nodeIds ?? [], ontology);
    return { batch: await store().begin(owner(identity), params[0], body) };
  });
  register('GET', /^\/api\/v2\/me\/vaults\/([^/]+)\/imports\/([^/]+)$/, async ({ params, identity }) => ({ batch: await store().batch(owner(identity), ...params) }));
  register('PUT', /^\/api\/v2\/me\/vaults\/([^/]+)\/imports\/([^/]+)\/manifest\/(\d+)$/, async ({ params, identity, body, ontology }) => {
    for (const f of Array.isArray(body.files) ? body.files : []) validateLinks(f.nodeIds ?? [], ontology);
    return store().manifestChunk(owner(identity), params[0], params[1], Number(params[2]), body.files);
  });
  register('DELETE', /^\/api\/v2\/me\/vaults\/([^/]+)\/imports\/([^/]+)$/, async ({ params, identity }) => store().cancel(owner(identity), ...params));
  register('PUT', /^\/api\/v2\/me\/vaults\/([^/]+)\/imports\/([^/]+)\/chunks\/([a-f0-9]{64})\/(\d+)$/, async ({ params, body, identity }) => store().chunk(owner(identity), params[0], params[1], params[2], Number(params[3]), body.data));
  register('POST', /^\/api\/v2\/me\/vaults\/([^/]+)\/imports\/([^/]+)\/commit$/, async ({ params, identity }) => store().commit(owner(identity), ...params));
  register('PUT', /^\/api\/v2\/me\/vaults\/([^/]+)\/files\/([^/]+)\/nodes$/, async ({ params, body, identity, ontology }) => { validateLinks(body.nodeIds, ontology); return store().link(owner(identity), ...params, body); });
  const serveFile = async ({ params, identity, req, res, query }) => {
    const file = await store().file(owner(identity), params[0], params[1], query.has('revision') ? query.get('revision') : undefined);
    const range = parseByteRange(req.headers.range, file.size);
    if (!range) { res.writeHead(416, { 'Content-Range': `bytes */${file.size}`, 'Cache-Control': 'no-store' }); res.end(); return; }
    const headers = { 'Content-Type': file.mime, 'Content-Length': Math.max(0, range.end - range.start + 1), 'Cache-Control': 'no-store', 'Accept-Ranges': 'bytes', 'X-Content-Type-Options': 'nosniff', 'Content-Disposition': `${query.get('download') === '1' ? 'attachment' : 'inline'}; filename*=UTF-8''${encodeURIComponent(file.path.split('/').pop())}` };
    if (range.partial) headers['Content-Range'] = `bytes ${range.start}-${range.end}/${file.size}`;
    res.writeHead(range.partial ? 206 : 200, headers);
    if (req.method !== 'HEAD') for (let start = range.start; start <= range.end; start += store().limits.chunkBytes) {
      if (res.destroyed) break;
      const data = await store().bytes(owner(identity), file.sha256, start, Math.min(range.end, start + store().limits.chunkBytes - 1));
      if (!res.write(data)) await drained(res);
    }
    res.end();
  };
  register('GET', /^\/api\/v2\/me\/vaults\/([^/]+)\/files\/([^/]+)$/, serveFile);
  register('HEAD', /^\/api\/v2\/me\/vaults\/([^/]+)\/files\/([^/]+)$/, serveFile);
  register('GET', /^\/api\/v2\/me\/vaults\/([^/]+)\/export$/, async ({ params, identity, res }) => {
    const who = owner(identity), lib = await store().get(who, params[0]), history = await store().history(who, lib.id);
    res.writeHead(200, { 'Content-Type': 'application/x-ndjson', 'Cache-Control': 'no-store', 'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(lib.name)}.mcs-vault.jsonl` });
    const write = async value => { if (!res.destroyed && !res.write(JSON.stringify(value) + '\n')) await drained(res); };
    await write({ type: 'vault', schema: 'mcs-private-vault/1', vault: lib });
    const hashes = new Map();
    for (const r of history) {
      const v = await store().get(who, lib.id, r.revision); await write({ type: 'revision', revision: Number(r.revision), createdAt: r.created_at, files: v.files });
      for (const f of v.files) hashes.set(f.sha256, f.size);
    }
    for (const [sha, size] of hashes) for (let i = 0; i < Math.ceil(size / store().limits.chunkBytes); i++) {
      if (res.destroyed) return;
      const bytes = await store().bytes(who, sha, i * store().limits.chunkBytes, Math.min(size - 1, (i + 1) * store().limits.chunkBytes - 1));
      await write({ type: 'chunk', sha256: sha, index: i, data: bytes.toString('base64') });
    }
    res.end();
  });
}

function drained(res) {
  return new Promise(resolve => {
    const done = () => { res.off('drain', done); res.off('close', done); resolve(); };
    res.once('drain', done); res.once('close', done);
    if (res.destroyed) done();
  });
}
