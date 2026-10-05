import { spawn } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const children = [];

function start(name, command, args, env = {}) {
  const child = spawn(command, args, { cwd: root, stdio: 'inherit', shell: process.platform === 'win32', env: { ...process.env, ...env } });
  child.on('exit', (code) => { if (code && code !== 0) console.error(`${name} 退出，代码 ${code}`); });
  children.push(child);
  return child;
}

console.log('开发模式：API http://127.0.0.1:3784 · 前端 http://127.0.0.1:5174');
start('api', 'node', ['server/index.mjs'], { MCS_WEB_DEV: '1' });
start('vite', 'npx', ['vite', '--config', 'web/vite.config.ts']);

const shutdown = () => { for (const child of children) child.kill(); process.exit(0); };
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
