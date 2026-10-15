import registry from '../../mcs-foundations/lean/registrations.json' with { type: 'json' };

export const leanEvidence = registry.registrations.map(r => ({
  id: r.evidenceId, kind: 'machine-certificate', backend: 'lean4', leanRegistration: r.id,
  status: 'PROOF', checkStatus: 'not_run', title: r.title.zh, scope: r.scope.zh, nodes: r.nodes,
  certificate: 'mcs-foundations/lean/registrations.json', checker: 'lean-4.34.1/leanchecker', checkerVerified: false,
  openAssumptions: r.assumptions.zh, obligations: r.obligations.zh,
  reference: r.theoryRef ?? 'mcs-foundations/cases/04-群概念的多来源.md',
}));
export const leanEvidenceEnglish = Object.fromEntries(registry.registrations.map(r => [r.evidenceId, { title: r.title.en, scope: r.scope.en, openAssumptions: r.assumptions.en, obligations: r.obligations.en }]));
