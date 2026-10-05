import { evidenceSummary, evidenceView } from './evidence.mjs';
import { supportSummary } from './support.mjs';

export function claimsIndex(ontology) {
  return ontology.raw.claims.map((claim) => {
    const node = ontology.maybeNode(claim.node);
    const evidence = (claim.evidence ?? []).map((id) => evidenceView(ontology.evidence(id)));
    return {
      id: claim.id,
      node: claim.node,
      title: node?.title ?? claim.node,
      statement: claim.statement,
      status: claim.status,
      evidence,
      boundary: node?.formal?.boundary ?? [],
    };
  });
}

export function obligationsIndex(ontology) {
  const obligations = [];
  for (const record of ontology.raw.evidence) {
    for (const obligation of record.obligations ?? []) {
      obligations.push({ evidenceId: record.id, node: record.nodes[0] ?? null, obligation, status: record.checkStatus, scope: record.scope });
    }
  }
  for (const entry of ontology.raw.coverage.filter((item) => item.boundary)) {
    obligations.push({ evidenceId: null, node: null, obligation: entry.boundary, status: entry.status, scope: entry.module });
  }
  return obligations;
}

export function notationIndex(ontology) {
  return {
    baseTypes: ontology.raw.signature.baseTypes,
    constants: ontology.raw.signature.constants,
    note: ontology.raw.signature.note,
  };
}

export function researchSummary(ontology) {
  const formation = ontology.raw.nodes.map((node) => ({ node: node.id, roles: node.roles, construct: node.construct }));
  return {
    overview: ontology.stats(),
    evidence: evidenceSummary(ontology),
    support: supportSummary(ontology),
    claims: claimsIndex(ontology),
    obligations: obligationsIndex(ontology),
    notation: notationIndex(ontology),
    formations: formation,
    localizations: ontology.raw.localizations.map((item) => ({ id: item.id, name: item.name, family: item.family, computable: item.computable })),
  };
}
