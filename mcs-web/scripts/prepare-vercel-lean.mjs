#!/usr/bin/env node
/** Build a Linux-only, credential-free Lean snapshot from a reviewed public export. */
import { readFile, writeFile } from 'node:fs/promises';
import { resolve, join, dirname, relative } from 'node:path';
import { parseArgs } from 'node:util';
import { Sandbox } from '@vercel/sandbox';
import { LEAN_FILES, LEAN_PROJECT, LEAN_VERSION, MATHLIB_REV } from '../core/lean.mjs';
import { readContentSources } from '../core/content-library.mjs';
const { values } = parseArgs({ options: { source: { type: 'string' }, receipt: { type: 'string' }, region: { type: 'string', default: 'sin1' } } });
if (!values.source || !values.receipt) throw new Error('Required: --source <public-export> --receipt <private-json-file>');
const source = resolve(values.source), receipt = resolve(values.receipt);
const registry = JSON.parse(await readFile(join(source, LEAN_PROJECT, 'registrations.json'), 'utf8'));
const paths = [...new Set([
  'mcs-web/core/lean.mjs', 'mcs-web/shared/errors.mjs',
  'mcs-web/core/content-lean.mjs', 'mcs-web/core/content-library.mjs',
  'mcs-web/shared/content-documents.mjs', 'mcs-web/shared/content-relations.mjs',
  ...['codec','language','terms'].map(name=>`mcs-web/core/formal/${name}.mjs`),
  'mcs-web/package.json', 'mcs-web/package-lock.json',
  ...readContentSources(join(source,'mcs-content')).map(s=>`mcs-content/${s.path}`),
  ...[...LEAN_FILES, 'integrity.json'].map(file => `${LEAN_PROJECT}/${file}`),
  ...registry.registrations.flatMap(record => record.originalRefs),
])];
const remoteRoot = '/vercel/sandbox/repo';
const uploads = [];
for (const path of paths) {
  const local = resolve(source, path);
  if (relative(source, local).startsWith('..')) throw new Error('Source path escapes public export');
  uploads.push({ path: `${remoteRoot}/${path}`, content: await readFile(local) });
}
let sandbox, snapshotted = false;
try {
  sandbox = await Sandbox.create({ region: values.region, persistent: false, timeout: 2400000, resources: { vcpus: 2 } });
  console.log(`Preparing Linux tools in ${sandbox.name}`);
  const dirs = [...new Set(uploads.map(file => dirname(file.path)))];
  let result = await sandbox.runCommand({ cmd: 'mkdir', args: ['-p', ...dirs], cwd: '/', sudo: true });
  if (result.exitCode !== 0) throw new Error('Cannot create sandbox source directories');
  await sandbox.writeFiles(uploads);
  const install = [
    'set -euo pipefail',
    'apt-get update -qq',
    'apt-get install -y -qq zstd curl git',
    `cd ${remoteRoot}/mcs-web && npm ci --omit=dev --ignore-scripts`,
    `mkdir -p ${remoteRoot}/.lean-tools`,
    `curl --fail --location --retry 3 https://github.com/leanprover/lean4/releases/download/v${LEAN_VERSION}/lean-${LEAN_VERSION}-linux.tar.zst --output /tmp/mcs-lean.tar.zst`,
    `tar --zstd -xf /tmp/mcs-lean.tar.zst -C ${remoteRoot}/.lean-tools`,
    'rm /tmp/mcs-lean.tar.zst',
    `export PATH=${remoteRoot}/.lean-tools/lean-${LEAN_VERSION}-linux/bin:$PATH`,
    `cd ${remoteRoot}/${LEAN_PROJECT}`,
    'lake exe cache get',
    `test "$(git -C .lake/packages/mathlib rev-parse HEAD)" = '${MATHLIB_REV}'`,
    `node --input-type=module -e 'const m=await import("../../mcs-web/core/lean.mjs"); const root="${remoteRoot}"; const c=await m.leanCapabilities(root); if(!c.ready) throw new Error(c.reason); const r=await m.checkLeanSnapshot(root,await m.captureLeanSnapshot(root,c.registrations[0].id)); if(r.status!=="passed") throw new Error("Linux Lean replay failed"); console.log(JSON.stringify({ready:c.ready,status:r.status,inputSha256:r.inputSha256}));'`,
  ].join('\n');
  result = await sandbox.runCommand({ cmd: 'bash', args: ['-c', install], cwd: '/', sudo: true });
  const output = `${await result.stdout()}\n${await result.stderr()}`;
  await writeFile(`${receipt}.log`, output);
  if (result.exitCode !== 0) throw new Error(`Linux preparation failed (${result.exitCode}); see private receipt log`);
  const snapshot = await sandbox.snapshot({ expiration: 0 });
  snapshotted = true;
  const record = { schema: 'mcs-vercel-lean-runtime/1', snapshotId: snapshot.snapshotId, region: values.region, leanVersion: LEAN_VERSION, mathlibRevision: MATHLIB_REV, checkedAt: new Date().toISOString(), replayPassed: true };
  await writeFile(receipt, JSON.stringify(record, null, 2) + '\n');
  console.log(JSON.stringify(record));
} finally {
  if (sandbox && !snapshotted) await sandbox.stop();
}
