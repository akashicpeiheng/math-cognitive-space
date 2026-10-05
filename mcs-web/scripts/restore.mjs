import { resolve } from 'node:path';
import { loadConfig } from '../server/config.mjs';
import { createLearnerStore } from '../server/db.mjs';

const target = process.argv[2];
if (!target) { console.error('用法：node scripts/restore.mjs <备份文件>'); process.exit(1); }
const config = loadConfig();
console.log('请确认 MCS Web 服务已停止；恢复会替换所配置数据库中的学习数据。');
const db = await createLearnerStore({ config });
try {
  const result = await db.restoreFrom(resolve(target));
  console.log(JSON.stringify(result, null, 2));
} finally { await db.close(); }
