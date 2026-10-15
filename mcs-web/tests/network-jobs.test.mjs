import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter, once } from 'node:events';
import { spawn } from 'node:child_process';
import { JobManager } from '../server/jobs.mjs';
test('cancelling a network check stops its tracked checker process', { timeout: 10000 }, async () => {
  const child = spawn(process.execPath, ['-e', 'setInterval(() => {}, 1000)'], { windowsHide: true, detached: process.platform !== 'win32', stdio: 'ignore' });
  await once(child, 'spawn');
  const worker = new EventEmitter(); worker.terminate = async () => 0;
  const jobs = new JobManager({ spawnWorker: () => worker });
  try {
    const job = jobs.run({}, { kind: 'network-check', owner: 'alice' });
    worker.emit('message', { networkChild: 'started', pid: child.pid });
    assert.equal(jobs.get(job.id).status, 'running', 'process notifications do not finish the task');
    const closed = once(child, 'close'); jobs.cancel(job.id); await closed;
    assert.equal(jobs.get(job.id).status, 'cancelled'); assert.equal(jobs.get(job.id).result, null);
  } finally { jobs.close(); if (child.exitCode === null && child.signalCode === null) child.kill('SIGKILL'); }
});
