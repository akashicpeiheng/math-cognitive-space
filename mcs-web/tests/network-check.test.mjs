import test from 'node:test';
import assert from 'node:assert/strict';
import { testOntology } from './helpers.mjs';
import { checkPrivateRelation, relationInputHash } from '../core/network-check.mjs';
import { relationSignature } from '../shared/network-workspace.mjs';
import { REPO_ROOT } from '../core/ontology.mjs';
const ref = id => ({ source: 'vault', storage: 'browser', vaultId: 'claims', fileId: id, revision: 1, sha256: 'a'.repeat(64) });
const spec = { background: 'bg:core/1', declarations: [{ name: 'P', type: 'o', role: 'proposition' }], definitions: [], assumptions: [], statement: { source: 'P', kind: 'formula' }, claims: [], references: [], boundary: [] };
const raw = { from: ref('a'), to: ref('b'), kind: 'equivalentTo', conditions: '', reason: '选定命题的等价', source: '明确摘录', bindings: { from: { spec, excerpt: 'P', correspondenceConfirmed: true }, to: { spec, excerpt: 'P', correspondenceConfirmed: false } } };
test('private formal equivalence produces real certificates; human correspondence stays separate', async () => {
  const ontology = await testOntology(), before = ontology.version;
  const result = await checkPrivateRelation(raw, ontology, REPO_ROOT);
  assert.equal(result.math.status, 'verified', JSON.stringify(result)); assert.equal(result.label, 'PROOF'); assert.equal(result.run.status, 'completed'); assert.ok(result.evidence);
  assert.deepEqual(result.correspondence, { from: true, to: false }); assert.equal(result.relationSignature, relationSignature(raw)); assert.equal(result.inputHash, relationInputHash(raw, before));
  assert.notEqual(result.inputHash, relationInputHash({ ...raw, reason: '已修改' }, before)); assert.notEqual(result.inputHash, relationInputHash(raw, 'changed-theory')); assert.equal(ontology.version, before);
});
test('missing, invalid and unsupported formalizations remain undecided', async () => {
  const ontology = await testOntology();
  for (const relation of [{ ...raw, bindings: {} }, { ...raw, bindings: { ...raw.bindings, to: { ...raw.bindings.to, spec: { ...spec, statement: { source: 'unknown_symbol' } } } } }, { ...raw, kind: 'conditionalDerivation', conditions: '' }]) {
    const result = await checkPrivateRelation(relation, ontology, REPO_ROOT); assert.equal(result.math.status, 'undecided'); assert.equal(result.run.status, 'unsupported');
  }
});


test('private declarations cannot install extra background axioms', async () => {
  const ontology = await testOntology();
  const declarations = [{ name: 'P', type: 'o', role: 'proposition' }, { name: 'Q', type: 'o', role: 'proposition' }];
  const relation = { ...raw, kind: 'conditionalDerivation', conditions: '无额外条件', bindings: { from: { ...raw.bindings.from, spec: { ...spec, declarations, axioms: [{ source: 'Q' }] } }, to: { ...raw.bindings.to, spec: { ...spec, declarations, statement: { source: 'Q', kind: 'formula' } } } } };
  const checked = await checkPrivateRelation(relation, ontology, REPO_ROOT);
  assert.equal(checked.math.status, 'undecided', JSON.stringify(checked)); assert.notEqual(checked.label, 'PROOF');
});
test('registered finite models give scoped FINITE evidence and a real noncommutative witness', async () => {
  const ontology = await testOntology();
  const expression = { background: 'bg:group/1', declarations: [{ name: 'mul', type: 'G -> G -> G', role: 'function' }], definitions: [], assumptions: [], statement: { source: '∀(x:G)(y:G). mul(x)(y) = mul(y)(x)', kind: 'formula' }, claims: [], references: [], boundary: [] };
  for (const kind of ['instanceOf', 'counterexampleTo']) {
    const relation = { ...raw, kind, from: { source: 'ontology', id: kind === 'instanceOf' ? 'group:units5' : 'group:noncomm', version: '1' }, bindings: { to: { spec: expression, excerpt: '交换律', correspondenceConfirmed: true } } };
    const checked = await checkPrivateRelation(relation, ontology, REPO_ROOT);
    assert.equal(checked.math.status, kind === 'instanceOf' ? 'verified' : 'refuted', JSON.stringify(checked)); assert.equal(checked.label, 'FINITE'); assert.match(checked.math.scope, /完整运算表/); assert.match(checked.math.scope, /不构成/); assert.ok(checked.evidence);
  }
});
