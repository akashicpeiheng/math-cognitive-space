import { Sandbox } from '@vercel/sandbox';
import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { publicRuntimeFiles } from './cloud-runtime.mjs';
import { McsError, CODES } from '../shared/errors.mjs';

const root = '/vercel/sandbox/repo';
/** No database/session/application credentials are injected into execution sandboxes. */
export class SandboxExecutor {
  constructor({ extensions, snapshotId, region = 'sin1' }) { this.extensions = extensions; this.snapshotId = snapshotId; this.region = region; }
  async run(input, { extensionRoot = null, onStart = async () => {}, signal, timeoutMs = 120000 } = {}) {
    const sandbox = await Sandbox.create({ ...(input.kind === 'lean' || input.kind === 'lean-capabilities' ? { source: { type: 'snapshot', snapshotId: this.snapshotId } } : {}), region: this.region, persistent: false, timeout: timeoutMs + 30000, resources: { vcpus: input.kind === 'lean' ? 2 : 1 }, networkPolicy: 'deny-all' });
    const stop = () => { void sandbox.stop().catch(() => {}); };
    signal?.addEventListener('abort', stop, { once: true });
    try {
      if (signal?.aborted) throw new McsError(CODES.JOB_CANCELLED, '任务已取消。', 409);
      await onStart(sandbox.name);
      await sandbox.runCommand({ cmd: 'mkdir', args: ['-p', root], cwd: '/', sudo: true });
      const files = (await publicRuntimeFiles()).map(file => ({ path: `${root}/${file.path}`, content: Buffer.from(file.content, 'base64') }));
      let pointer;
      if (extensionRoot) {
        const visit = async (dir, prefix = '') => {
          for (const entry of await readdir(dir, { withFileTypes: true })) {
            if (entry.isSymbolicLink()) throw new Error('Cloud execution refuses extension links');
            const path = prefix + entry.name;
            if (entry.isDirectory()) await visit(join(dir, entry.name), `${path}/`);
            else if (entry.isFile()) files.push({ path: `${root}/mcs-web/data/extensions/${path}`, content: await readFile(join(dir, entry.name)) });
          }
        };
        await visit(extensionRoot);
      } else {
        for (const file of await this.extensions.files()) files.push({ path: `${root}/mcs-web/data/extensions/${file.path}`, content: Buffer.from(file.body, 'base64') });
        pointer = { schema: 'mcs-extensions-active/1', revision: input.extensionRevision ?? null, updatedAt: new Date().toISOString() };
        files.push({ path: `${root}/mcs-web/data/extensions/active.json`, content: Buffer.from(JSON.stringify(pointer)) });
      }
      files.push({ path: `${root}/input.json`, content: Buffer.from(JSON.stringify(input)) });
      await sandbox.writeFiles(files);
      const command = await sandbox.runCommand({ cmd: 'node', args: [`${root}/mcs-web/server/cloud-runner.mjs`, `${root}/input.json`, `${root}/result.json`], cwd: root, env: { MCS_WEB_PYTHON: 'python3' }, detached: true, sudo: true });
      const finished = await command.wait({ signal });
      const bytes = await sandbox.readFileToBuffer({ path: `${root}/result.json` });
      if (!bytes) throw new McsError(CODES.EVIDENCE_RESOURCE, `云端任务未返回结果（进程代码 ${finished.exitCode}）。`, 503);
      const output = JSON.parse(bytes);
      if (!output.ok) throw new McsError(output.error.code, output.error.message, 422, output.error.details);
      return output.result;
    } finally {
      signal?.removeEventListener('abort', stop);
      await sandbox.stop();
    }
  }
}
