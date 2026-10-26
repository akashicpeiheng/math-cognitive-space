#!/usr/bin/env node
import { readFile, readdir, mkdir, writeFile } from 'node:fs/promises';
import { resolve, join, relative,sep } from 'node:path';
import {createRequire} from 'node:module';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';
const root = resolve(fileURLToPath(new URL('../..', import.meta.url)));
const entries = [];
const serverFiles = ['cloud-runner.mjs', 'plan-worker.mjs', 'network-check-worker.mjs', 'snapshot.mjs', 'extensions.mjs'];
async function collect(path) {
  const dir = join(root, path);
  for (const item of await readdir(dir, { withFileTypes: true })) {
    const rel = `${path}/${item.name}`;
    if (item.isSymbolicLink()) throw new Error(`Runtime bundle refuses directory links: ${rel}`);
    if (['node_modules', 'runtime', 'tmp', 'dist', '.lake', '.lean-tools', '.git', 'extensions', '__pycache__'].includes(item.name)) continue;
    if (item.isDirectory()) await collect(rel);
    else if (item.isFile() && !item.name.startsWith('.env') && !/\.(sqlite3|pyc|log)$/.test(item.name)) {
      entries.push({ path: rel, content: (await readFile(join(root, rel))).toString('base64') });
    }
  }
}
for (const path of ['mcs-web/core', 'mcs-web/shared', 'mcs-web/data', 'mcs-content', 'mcs-foundations/validation/certification', 'mcs-foundations/lean']) await collect(path);
for (const file of serverFiles) entries.push({ path: `mcs-web/server/${file}`, content: (await readFile(join(root, 'mcs-web/server', file))).toString('base64') });
// Fresh, offline Sandboxes need the public parser's runtime dependencies too.
// Resolve only its installed dependency closure; never upload application credentials.
const dependencyRoots=new Set();
async function dependency(name,parent){
  if(name.startsWith('@types/'))return;
  const req=createRequire(join(parent,'package.json'));
  let directory;
  for(const search of req.resolve.paths(name)??[]){
    const candidate=join(search,name);
    try{await readFile(join(candidate,'package.json'));directory=candidate;break;}catch{/* next resolution root */}
  }
  if(!directory)throw new Error(`Missing runtime dependency: ${name}`);
  directory=resolve(directory);
  if(!directory.startsWith(join(root,'mcs-web','node_modules')+sep))throw new Error('Runtime dependency escapes installed package directory');
  if(dependencyRoots.has(directory))return;
  dependencyRoots.add(directory);
  const manifest=JSON.parse(await readFile(join(directory,'package.json'),'utf8'));
  await collect(relative(root,directory).split(sep).join('/'));
  for(const child of Object.keys(manifest.dependencies??{}))await dependency(child,directory);
}
await dependency('mdast-util-from-markdown',join(root,'mcs-web'));
// Lean's original references are sealed inputs, not the author's private reference library.
const registry = JSON.parse(await readFile(join(root, 'mcs-foundations/lean/registrations.json')));
for (const path of new Set(registry.registrations.flatMap(record => record.originalRefs))) {
  const local = resolve(root, path);
  if (relative(root, local).startsWith('..')) throw new Error('Runtime source reference escapes export');
  if (!entries.some(entry => entry.path === path)) entries.push({ path, content: (await readFile(local)).toString('base64') });
}
const output = join(root, 'mcs-web/dist');
await mkdir(output, { recursive: true });
const bytes = gzipSync(JSON.stringify({ schema: 'mcs-cloud-runtime/1', files: entries }));
await writeFile(join(output, 'cloud-runtime.json.gz'), bytes);
console.log(`Cloud runtime: ${entries.length} public files, ${bytes.length} compressed bytes`);
