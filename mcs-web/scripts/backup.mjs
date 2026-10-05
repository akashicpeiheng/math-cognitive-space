import { loadConfig } from '../server/config.mjs';
import { createLearnerStore } from '../server/db.mjs';

const config = loadConfig();
const db = await createLearnerStore({ config });
try {
  const result = await db.backupTo(config.backupDir);
  console.log(JSON.stringify(result, null, 2));
} finally { await db.close(); }
