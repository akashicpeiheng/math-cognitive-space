import { loadConfig } from '../server/config.mjs';
import { loadOntology } from '../core/ontology.mjs';
import { createLearnerStore } from '../server/db.mjs';
import { makePlanner } from '../core/planner.mjs';
import { adaptWithOntology } from '../core/adaptation.mjs';

const DEMOS = [
  { name: '演示：序列与量词入口', confirm: ['bg:real:metric', 'bg:logic:quantifier'], goal: 'group:cayley' },
  { name: '演示：置换与群公理入口', confirm: ['bg:set:function', 'bg:group:binary'], goal: 'group:cayley' },
];

const config = loadConfig();
const ontology = await loadOntology({ dataDir: config.dataDir });
const db = await createLearnerStore({ config });
const planner = makePlanner(ontology);
const output = [];

try {
  for (const demo of DEMOS) {
    let profile = (await db.listProfiles({ includeArchived: true })).find((item) => item.kind === 'demo' && item.name === demo.name);
    if (!profile) profile = await db.createProfile({ name: demo.name, kind: 'demo', modelVersion: 'mcs-manual-model/1' });
    for (const node of demo.confirm) {
      const eventId = 'demo:' + profile.id + ':' + node;
      const exists = (await db.listEvents(profile.id, { limit: 2000 })).some((event) => event.eventId === eventId);
      if (!exists) {
        await db.appendEvent(profile.id, {
          eventId,
          kind: 'confirmation',
          nodeId: node,
          occurredAt: new Date().toISOString(),
          baseRevision: null,
          source: { kind: 'system', ref: 'demo-seed' },
          evidenceRefs: [],
          payload: { confirmed: true, demo: true },
          ontologyVersion: ontology.version,
        });
      }
    }
    const state = { ...await db.getProfile(profile.id), events: await db.listEvents(profile.id, { limit: 2000 }) };
    const { background } = adaptWithOntology(ontology, state, { goalId: demo.goal });
    const plan = planner.plan({ goalId: demo.goal, background, horizon: 8 });
    output.push({
      profile: await db.getProfile(profile.id),
      plan: { goal: demo.goal, status: plan.status, routes: plan.routes.length, entryConditions: plan.entryConditions },
    });
  }
} finally { await db.close(); }

console.log(JSON.stringify({ ontology: ontology.version, note: '演示档案单独标记为 demo；确认记录来自显式种子，不代表真实学习者。', demos: output }, null, 2));
