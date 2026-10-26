import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { attachDatabasePool } from '@vercel/functions';
import { QueueClient } from '@vercel/queue';
import { loadConfig } from './config.mjs';
import { createDriverFromConfig } from './sql-driver.mjs';
import { McsDatabase } from './db.mjs';
import { AuthoringDatabase } from './authoring-db.mjs';
import { createAuth, validateAuthConfig } from './auth.mjs';
import { assertDeploymentSafety, isAllowedHost, securityHeaders } from './deployment.mjs';
import { createApi } from './api.mjs';
import { TutorAdapter } from './tutor.mjs';
import { CloudExtensions } from './cloud-extensions.mjs';
import { CloudJobs } from './cloud-jobs.mjs';
import { CloudLeanJobs } from './cloud-lean-jobs.mjs';
import { SandboxExecutor } from './sandbox-executor.mjs';
import { CloudBackups } from './cloud-backups.mjs';

export const queue = new QueueClient({ region: 'sin1' });
let applicationPromise;
export function application() { return applicationPromise ??= initialize().catch(error => { applicationPromise = null; throw error; }); }
async function initialize() {
  const config = loadConfig();
  config.publicMode = true; config.allowLocalDb = false; config.dbPoolMax = 3;
  config.publicOrigin ||= `https://${process.env.VERCEL_URL}`;
  // Vercel supplies this immutable deployment host. Staged production must be
  // testable before its canonical domain is promoted.
  config.deploymentOrigin = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null;
  config.allowedHosts = [...new Set([...config.allowedHosts, new URL(config.publicOrigin).host, process.env.VERCEL_URL, process.env.VERCEL_PROJECT_PRODUCTION_URL].filter(Boolean))];
  const root = resolve(tmpdir(), 'mcs-cloud-repo');
  Object.assign(config, { repoRoot: root, dataDir: join(root, 'mcs-web/data'), extensionsDir: join(root, 'mcs-web/data/extensions'), authoringDbFile: join(root, 'mcs-web/runtime/authoring-unused.sqlite3'), backupDir: join(root, 'mcs-web/runtime/backups') });
  assertDeploymentSafety(config); validateAuthConfig(config);
  if (!process.env.MCS_WEB_LEAN_SNAPSHOT) throw new Error('MCS_WEB_LEAN_SNAPSHOT must name a verified Linux runtime');
  const driver = await createDriverFromConfig(config);
  attachDatabasePool(driver.pool);
  const db = new McsDatabase({ driver });
  let backups, auth, extensions, authoring;
  await driver.transaction(async () => {
    await driver.get('SELECT pg_advisory_xact_lock(1725487021, 0)');
    await db.migrate();
    backups = await new CloudBackups({ driver, db }).init();
    auth = await createAuth({ config, pool: driver.pool });
    extensions = await new CloudExtensions({ driver, root }).init();
    authoring = await new AuthoringDatabase({ driver }).init();
  });
  const executor = new SandboxExecutor({ extensions, snapshotId: process.env.MCS_WEB_LEAN_SNAPSHOT });
  const getOntology = () => extensions.source.current();
  const jobs = await new CloudJobs({
    driver, getOntology, getRevision: () => extensions.source.activeRevision(),
    publish: (message, options) => queue.send('mcs-jobs', message, options),
    execute: (job, options) => executor.run(job, options),
    onResult: async (job, result) => {
      if (job.kind !== 'discovery') return;
      const run = await authoring.getRun(job.request.runId);
      await authoring.saveCandidates(run.id, result.candidates.map(candidate => ({ ...candidate, runId: run.id })));
      if (run.status === 'cancelled') return;
      const pending = result.candidates.filter(candidate => candidate.pendingCheck).length;
      await authoring.updateRun(run.id, { status: pending ? 'interrupted' : 'completed', stats: { ...result.stats, cloudJobId: job.id, background: job.request.background, pendingChecks: pending, settleStatus: pending ? 'timedOut' : 'completed' } });
    },
  }).init();
  const leanJobs = new CloudLeanJobs({ jobs, executor, driver, repoRoot: root });
  await leanJobs.history.migrate();
  const cloud = {
    backup: () => backups.backup(),
    restore: id => backups.restore(id),
    action: (kind, request) => executor.run({ kind, request, ontologyVersion: getOntology().version, extensionRevision: extensions.source.activeRevision() }),
    publish: (ctx, request, commit) => extensions.publish(async stage => {
      const stageConfig = { ...config, ...stage, authoringDbFile: join(stage.repoRoot, 'mcs-web/runtime/authoring-unused.sqlite3') };
      const replayTransport = args => executor.run({ kind: 'replay-candidate', request: { candidate: args.candidate, specs: args.deps?.specs, background: args.background }, ontologyVersion: args.ontologyVersion }, { extensionRoot: stage.extensionsDir });
      return commit({ ...ctx, ...stage, config: stageConfig, replayTransport }, request);
    }),
  };
  const tutor = new TutorAdapter({ config, ontology: getOntology(), db });
  const api = createApi({ getOntology, db, jobs, leanJobs, tutor, config, ontologySource: extensions.source, auth, cloud });
  const handle = async (req, res) => {
    for (const [name,value] of Object.entries(securityHeaders(config))) res.setHeader(name,value);
    res.setHeader('Cache-Control', 'private, no-store');
    if (!isAllowedHost(req.headers.host, config)) { res.writeHead(403); res.end('Forbidden host'); return; }
    await extensions.refresh();
    if (await auth.handle(req,res)) return;
    if (await api(req,res)) return;
    res.writeHead(404); res.end('Not Found');
  };
  return { handle, jobs, db, authoring, extensions, executor, leanJobs, auth, config };
}
