import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { resolve, dirname, sep, join } from 'node:path';
import { gunzipSync } from 'node:zlib';
import { MCS_WEB_ROOT } from '../core/ontology.mjs';
let bundlePromise;
export function publicRuntimeFiles() {
  return bundlePromise ??= readFile(join(MCS_WEB_ROOT, 'dist/cloud-runtime.json.gz')).then(bytes => {
    const bundle = JSON.parse(gunzipSync(bytes));
    if (bundle.schema !== 'mcs-cloud-runtime/1') throw new Error('Unknown cloud runtime schema');
    return bundle.files;
  });
}
export async function unpackRuntime(root) {
  root = resolve(root);
  for (const file of await publicRuntimeFiles()) {
    const path = resolve(root, file.path);
    if (!path.startsWith(root + sep)) throw new Error('Cloud runtime path escapes root');
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, Buffer.from(file.content, 'base64'));
  }
}
