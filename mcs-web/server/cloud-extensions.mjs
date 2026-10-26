import { mkdtemp, mkdir, writeFile, readFile, readdir, rm } from 'node:fs/promises';
import { resolve, join, dirname, sep } from 'node:path';
import { tmpdir } from 'node:os';
import { createHash } from 'node:crypto';
import { unpackRuntime } from './cloud-runtime.mjs';
import { createOntologySource } from './snapshot.mjs';
import { ACTIVE_SCHEMA, ACTIVE_FILE } from './extensions.mjs';
import { McsError, CODES } from '../shared/errors.mjs';

const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const relativeRoot = 'mcs-web/data/extensions';
function safeFile(root, path) {
  const target = resolve(root, path);
  if (!target.startsWith(resolve(root) + sep)) throw new Error('Extension path escapes storage root');
  return target;
}

/** Immutable package bytes and the active pointer commit with the authoring ledger. */
export class CloudExtensions {
  constructor({ driver, root }) { this.driver = driver; this.root = resolve(root); this.serial = Promise.resolve(); this.loaded = null; }
  async init() {
    await this.driver.exec('CREATE TABLE IF NOT EXISTS cloud_extension_files (path TEXT PRIMARY KEY, body TEXT NOT NULL, sha256 TEXT NOT NULL); CREATE TABLE IF NOT EXISTS cloud_extension_state (id INTEGER PRIMARY KEY, revision INTEGER NOT NULL, pointer_json TEXT NOT NULL)');
    const pointer = { schema: ACTIVE_SCHEMA, revision: null, updatedAt: new Date().toISOString() };
    await this.driver.run('INSERT INTO cloud_extension_state(id,revision,pointer_json) VALUES (1,0,?) ON CONFLICT(id) DO NOTHING', [JSON.stringify(pointer)]);
    await unpackRuntime(this.root);
    const loaded = await this.materialize(this.root);
    this.source = await createOntologySource(this.options(this.root));
    this.loaded = loaded;
    return this;
  }
  options(root) { return { repoRoot: root, dataDir: join(root, 'mcs-web/data'), extensionsDir: join(root, relativeRoot) }; }
  async files() { return this.driver.all('SELECT path,body,sha256 FROM cloud_extension_files ORDER BY path'); }
  async materialize(root, pinnedRevision = undefined) {
    const state = await this.driver.get('SELECT revision,pointer_json FROM cloud_extension_state WHERE id=1');
    const extensionRoot = join(root, relativeRoot);
    await mkdir(extensionRoot, { recursive: true });
    for (const file of await this.files()) {
      const bytes = Buffer.from(file.body, 'base64');
      if (hash(bytes) !== file.sha256) throw new McsError(CODES.EXTENSION_INVALID, '云端内容包摘要不一致，拒绝装载。', 503);
      const target = safeFile(extensionRoot, file.path);
      await mkdir(dirname(target), { recursive: true });
      await writeFile(target, bytes);
    }
    const pointer = JSON.parse(state.pointer_json);
    if (pinnedRevision !== undefined) pointer.revision = pinnedRevision;
    await writeFile(join(extensionRoot, ACTIVE_FILE), JSON.stringify(pointer));
    return Number(state.revision);
  }
  refresh() {
    const next = this.serial.then(async () => {
      const state = await this.driver.get('SELECT revision FROM cloud_extension_state WHERE id=1');
      if (Number(state.revision) === this.loaded) return;
      const loaded = await this.materialize(this.root);
      await this.source.reload();
      this.source.assertUsable();
      this.loaded = loaded;
    });
    this.serial = next.catch(() => {});
    return next;
  }
  async persist(root) {
    const extensionRoot = join(root, relativeRoot);
    const visit = async (dir, prefix = '') => {
      for (const entry of await readdir(dir, { withFileTypes: true })) {
        const path = prefix + entry.name;
        if (entry.isSymbolicLink()) throw new Error('Extension storage refuses links');
        if (entry.isDirectory()) { await visit(join(dir, entry.name), `${path}/`); continue; }
        if (!entry.isFile() || path === ACTIVE_FILE) continue;
        const bytes = await readFile(join(dir, entry.name));
        if (bytes.length > 16 * 1024 * 1024) throw new McsError(CODES.RESOURCE_EXHAUSTED, '单个内容包文件超过云端存储上限。', 413);
        const digest = hash(bytes);
        await this.driver.run('INSERT INTO cloud_extension_files(path,body,sha256) VALUES (?,?,?) ON CONFLICT(path) DO NOTHING', [path, bytes.toString('base64'), digest]);
        const existing = await this.driver.get('SELECT sha256 FROM cloud_extension_files WHERE path=?', [path]);
        if (existing.sha256 !== digest) throw new McsError(CODES.CONFLICT, '内容包不可变，不能覆盖同名不同内容的文件。', 409);
      }
    };
    await visit(extensionRoot);
    const pointer = JSON.parse(await readFile(join(extensionRoot, ACTIVE_FILE), 'utf8'));
    await this.driver.run('UPDATE cloud_extension_state SET revision=revision+1,pointer_json=? WHERE id=1', [JSON.stringify(pointer)]);
  }
  async publish(fn) {
    // Staging has its own source and filesystem. Uncommitted content never reaches readers.
    const stage = await mkdtemp(join(tmpdir(), 'mcs-publication-'));
    try {
      const result = await this.driver.transaction(async () => {
        await this.driver.get('SELECT pg_advisory_xact_lock(1725487021, 3)');
        await unpackRuntime(stage);
        await this.materialize(stage);
        const ontologySource = await createOntologySource(this.options(stage));
        const result = await fn({ ...this.options(stage), ontologySource });
        await this.persist(stage);
        return result;
      });
      await this.refresh();
      return result;
    } finally {
      if (!resolve(stage).startsWith(resolve(tmpdir()) + sep)) throw new Error('Unsafe publication staging root');
      await rm(stage, { recursive: true, force: true });
    }
  }
}
