/** Runs only maintainer-owned actions. Requests contain declarative data, never commands. */
import { readFile, writeFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { Worker } from 'node:worker_threads';
import {fileURLToPath} from 'node:url';
import { createOntologySource } from './snapshot.mjs';
import { checkLeanSnapshot, leanCapabilities } from '../core/lean.mjs';
import { replayCertificate } from '../core/evidence.mjs';
import * as discovery from '../core/formal/discovery.mjs';
import * as registry from '../data/formal/registry.mjs';
import * as backgrounds from '../core/formal/backgrounds.mjs';

const input = JSON.parse(await readFile(process.argv[2], 'utf8'));
const root = resolve(fileURLToPath(new URL('../..', import.meta.url)));
const options = { repoRoot: root, dataDir: join(root, 'mcs-web/data'), extensionsDir: join(root, 'mcs-web/data/extensions') };
const source = await createOntologySource(options);
source.assertUsable();
const ontology = source.current();
try {
  if (input.ontologyVersion && input.ontologyVersion !== ontology.version) throw new Error('Pinned ontology version does not match the task input');
  let result;
  if (['plan', 'review', 'learning', 'network-check'].includes(input.kind)) {
    result = await new Promise((done, reject) => {
      const worker = new Worker(new URL(input.kind === 'network-check' ? './network-check-worker.mjs' : './plan-worker.mjs', import.meta.url), { workerData: { ...options, ...input } });
      worker.on('message', message => {
        if (message?.networkChild) return;
        if (message.ok) done(message.result); else reject(Object.assign(new Error(message.error?.message ?? 'Worker failed'), message.error));
        void worker.terminate();
      });
      worker.once('error', reject);
      worker.once('exit', code => { if (code !== 0) reject(new Error(`Worker exited (${code})`)); });
    });
  } else if (input.kind === 'lean') {
    result = await checkLeanSnapshot(root, input.request.snapshot, { config: { timeoutMs: 300000 } });
  } else if (input.kind === 'lean-capabilities') {
    result = await leanCapabilities(root);
  } else if (input.kind === 'evidence-replay') {
    result = await replayCertificate(input.request.record, { repoRoot: root, python: 'python3' });
  } else if (input.kind === 'discovery') {
    result = await discovery.discoverRelations({ ...input.request, ontology, registry, repoRoot: root, deps: { backgrounds } });
  } else if (input.kind === 'replay-candidate') {
    result = await discovery.replayCandidate({ candidate: input.request.candidate, registry, ontology, repoRoot: root, background: input.request.background, deps: { backgrounds, specs: input.request.specs, background: input.request.background, repoRoot: root } });
  } else throw new Error('Unsupported cloud action');
  await writeFile(process.argv[3], JSON.stringify({ ok: true, result }));
} catch (error) {
  await writeFile(process.argv[3], JSON.stringify({ ok: false, error: { code: error.code ?? 'INTERNAL', message: error.message, details: error.details ?? null } }));
  process.exitCode = 1;
}
