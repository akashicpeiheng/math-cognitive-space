import { parentPort, workerData } from 'node:worker_threads';
import { createOntologySource } from './snapshot.mjs';
import { checkPrivateRelation } from '../core/network-check.mjs';
try {
  const source = await createOntologySource(workerData);
  const ontology = source.current();
  if (ontology.version !== workerData.ontologyVersion) throw new Error('本体版本已变化，请重新验证');
  parentPort.postMessage({ ok: true, result: await checkPrivateRelation(workerData.request.relation, ontology, workerData.repoRoot) });
} catch (error) { parentPort.postMessage({ ok: false, error: { code: error.code ?? 'INTERNAL', message: error.message } }); }
