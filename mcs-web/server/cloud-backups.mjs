import { randomUUID, createHash } from 'node:crypto';
import { mkdtemp, readdir, rm } from 'node:fs/promises';
import { createReadStream, createWriteStream } from 'node:fs';
import { Transform, Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { tmpdir } from 'node:os';
import { join, basename } from 'node:path';
import { createGzip, createGunzip } from 'node:zlib';
import { McsError, CODES } from '../shared/errors.mjs';

/** Administrator backups retain the existing learner-store scope, across instances. */
export class CloudBackups {
  constructor({ driver, db }) { Object.assign(this, { driver, db }); }
  async init() {
    await this.driver.exec('CREATE TABLE IF NOT EXISTS cloud_backups (id TEXT PRIMARY KEY, manifest_json TEXT NOT NULL, created_at TEXT NOT NULL); CREATE TABLE IF NOT EXISTS cloud_backup_parts (backup_id TEXT NOT NULL, file_name TEXT NOT NULL, seq INTEGER NOT NULL, body TEXT NOT NULL, PRIMARY KEY(backup_id,file_name,seq))');
    return this;
  }
  async backup() {
    const dir = await mkdtemp(join(tmpdir(), 'mcs-backup-'));
    try {
      const receipt = await this.db.backupTo(dir);
      const id = `backup-${randomUUID()}`, manifest = [];
      await this.driver.transaction(async () => {
        for (const name of await readdir(dir)) {
          const digest = createHash('sha256');
          const hashing = new Transform({ transform(bytes, encoding, done) { digest.update(bytes); done(null, bytes); } });
          let seq = 0;
          await pipeline(createReadStream(join(dir, name)), hashing, createGzip(), async chunks => {
            for await (const bytes of chunks) await this.driver.run('INSERT INTO cloud_backup_parts(backup_id,file_name,seq,body) VALUES (?,?,?,?)', [id, name, seq++, bytes.toString('base64')]);
          });
          manifest.push({ name, sha256: digest.digest('hex') });
        }
        await this.driver.run('INSERT INTO cloud_backups(id,manifest_json,created_at) VALUES (?,?,?)', [id, JSON.stringify({ main: basename(receipt.backup), files: manifest }), receipt.createdAt]);
      });
      return { ...receipt, backup: id, persistent: true };
    } finally { await rm(dir, { recursive: true, force: true }); }
  }
  async restore(id) {
    const row = await this.driver.get('SELECT manifest_json FROM cloud_backups WHERE id=?', [id]);
    if (!row) throw new McsError(CODES.NOT_FOUND, '云端备份不存在。', 404);
    const manifest = JSON.parse(row.manifest_json);
    const dir = await mkdtemp(join(tmpdir(), 'mcs-restore-'));
    try {
      for (const file of manifest.files) {
        if (basename(file.name) !== file.name) throw new Error('Invalid backup file name');
        const driver = this.driver;
        const parts = async function* () {
          let cursor = -1;
          while (true) {
            const rows = await driver.all('SELECT seq,body FROM cloud_backup_parts WHERE backup_id=? AND file_name=? AND seq>? ORDER BY seq LIMIT 64', [id, file.name, cursor]);
            if (!rows.length) break;
            for (const row of rows) { yield Buffer.from(row.body, 'base64'); cursor = Number(row.seq); }
          }
        };
        const digest = createHash('sha256');
        const hashing = new Transform({ transform(bytes, encoding, done) { digest.update(bytes); done(null, bytes); } });
        await pipeline(Readable.from(parts()), createGunzip(), hashing, createWriteStream(join(dir, file.name)));
        if (digest.digest('hex') !== file.sha256) throw new Error('Backup digest mismatch');
      }
      if (basename(manifest.main) !== manifest.main) throw new Error('Invalid backup manifest');
      const result = await this.db.restoreFrom(join(dir, manifest.main));
      return { ...result, from: id, persistent: true };
    } finally { await rm(dir, { recursive: true, force: true }); }
  }
}
