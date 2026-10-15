import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadOntology } from '../core/ontology.mjs';
import { overlayFor } from '../data/i18n/index.mjs';
import { fieldGuidesFor, validateFieldGuides } from '../data/field-guides/index.mjs';
import { entryNotes, newEntryNotes } from '../data/field-entry.mjs';
import { ENTRY_SOURCES, renderEntryNote } from '../data/field-entry-support.mjs';

// This inventory records declared mathematical scopes; it does not certify them.
const ontology = await loadOntology();
const en = await overlayFor('en');
const directory = fieldGuidesFor('zh', ontology.version);
const selected = [...new Set(directory.guides.flatMap(g => g.core.map(n => n.id)))];
const hash = text => createHash('sha256').update(text).digest('hex');
const newIds = new Set(newEntryNotes.map(n => n.id));
const report = {
  generatedAt: new Date().toISOString(),
  scope: 'Automatic inventory only; content self-review is described separately in docs/field-guides-20261012.md. No independent human approval or machine mathematics certification.',
  guideVersion: directory.version,
  ontologyVersion: ontology.version,
  ontologyContentHash: ontology.contentHash,
  formatProblems: validateFieldGuides(ontology.raw),
  guides: directory.guides.map(g => ({ id: g.id, anchor: g.anchor,
    core: g.core.map(n => n.id), questions: g.questions,
    characters: [g.object, ...g.motivations, ...g.questions.flatMap(q => [q.title,q.explanation]), g.growth,g.entry,...g.misconceptions,g.review].join('').length })),
  untranslatedExistingBodies: selected.filter(id => !en.cases?.[ontology.node(id).contentRef ?? id]),
  notes: entryNotes.map(n => ({ id: n.id, title: n.title.zh,
    added: newIds.has(n.id), bodyStatus: n.status,
    registeredStatus: ontology.node(n.id).teaching.evidenceStatus,
    assumptions: n.definition.zh, boundary: n.boundary.zh,
    proofScope: n.proof.zh, reviewQuestion: n.review.zh,
    sources: n.sources.map(key => ({ key, ...ENTRY_SOURCES[key] })),
    sha256: { zh: hash(renderEntryNote(n,'zh')), en: hash(renderEntryNote(n,'en')) },
    evidence: ontology.evidenceFor(n.id).filter(e => e.nodes?.[0] === n.id).map(e => ({ id:e.id,status:e.status,scope:e.scope,checkStatus:e.checkStatus })),
  })),
};
const target = resolve('runtime/field-guide-qa');
mkdirSync(target,{recursive:true});
writeFileSync(resolve(target,'content-inventory.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({guideVersion:report.guideVersion,ontologyVersion:report.ontologyVersion,
  guides:report.guides.length,selectedNodes:selected.length,notes:report.notes.length,
  untranslatedExistingBodies:report.untranslatedExistingBodies,formatProblems:report.formatProblems},null,2));
