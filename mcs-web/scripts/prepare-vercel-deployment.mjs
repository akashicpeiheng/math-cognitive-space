#!/usr/bin/env node
/** Run after whitelist export, from inside that export. Never upload the main workspace. */
import { mkdir, writeFile, readFile, copyFile, lstat } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = resolve(fileURLToPath(new URL('../..', import.meta.url)));
await readFile(join(root, 'NOTICE')); // Whitelist export includes release disclosure files.
const local = await lstat(join(root, '.git')).catch(() => null);
if (local) throw new Error('Prepare Vercel deployment from a whitelist export, not the Git workspace');
await mkdir(join(root, 'api'), { recursive: true });
await copyFile(join(root, 'mcs-web/deployment/vercel.json'), join(root, 'vercel.json'));
await writeFile(join(root, 'api/index.mjs'), `import { application } from '../mcs-web/server/vercel-app.mjs';
export default async function handler(req, res) {
  try { await (await application()).handle(req, res); }
  catch (error) {
    console.error('[mcs-cloud]', error.code ?? error.name, error.message);
    if (res.headersSent) { res.destroy(); return; }
    res.writeHead(503, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
    res.end(JSON.stringify({ ok: false, error: { code: 'SERVICE_UNAVAILABLE', message: '云端服务暂时不可用，请稍后重试。' } }));
  }
}
`);
await writeFile(join(root, 'api/queue.mjs'), "export { default } from '../mcs-web/server/vercel-queue.mjs';\n");
await writeFile(join(root, '.vercelignore'), ['**/node_modules/**', '**/.env*', '**/config.local.json', '**/*.sqlite3*', '**/runtime/**', '**/tmp/**', '**/.lake/**', '**/.lean-tools/**', '**/.agents/**', '**/.codex/**', '.git/**', '.vercel/**', '*.log'].join('\n') + '\n');
console.log('Prepared Vercel API routes, configuration, and upload exclusions.');
