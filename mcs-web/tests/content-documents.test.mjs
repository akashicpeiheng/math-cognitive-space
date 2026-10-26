import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readContentSources } from '../core/content-library.mjs';
import { compileContentLibrary,parseContentDocument,formatContentDocument,objectReference } from '../shared/content-documents.mjs';
import {correspondenceInput,correspondenceState} from '../shared/content-evidence.mjs';
// Keep the original group fixture isolated; topology has independent protocol tests.
const raw=readContentSources().filter(s=>!s.path.includes('topology-dg'));
const docs=()=>raw.map(s=>parseContentDocument(s.markdown,s.path));
const unchecked=d=>compileContentLibrary(d,{checkPins:false});
const by=(d,id)=>d.find(x=>x.data.id===`obj:group:${id}`);
test('shared library: five formal scales and many-to-many/cross-scale reading',()=>{
  const lib=compileContentLibrary(raw);
  assert.equal(lib.objects.length,8);assert.equal(lib.nodes.length,3);
  assert.deepEqual(new Set(lib.objects.map(o=>o.scale)),new Set(['atom','molecule','unit','topic','subdiscipline']));
  assert.equal(lib.nodes.filter(n=>n.objects.some(r=>r.id==='obj:group:injective')).length,3);
  assert(lib.nodes.some(n=>n.objects.some(r=>r.id==='obj:group:unit')));
  assert(lib.nodes.every(n=>!Object.hasOwn(n,'scale')));
  assert(lib.objects.every(o=>o.structuralStatus==='valid'&&o.proofStatus==='not-checked'));
});
test('moving files and changing prose leave M unchanged; reading changes only L',()=>{
  const before=compileContentLibrary(raw),changed=docs();
  for(const d of changed)d.path=`moved/${d.path}`;
  by(changed,'injective').body+='\n注释修订';
  changed.find(d=>d.kind==='node').body+='\n新增回看问题';
  const after=compileContentLibrary(changed);
  assert.equal(after.objectVersion,before.objectVersion);assert.notEqual(after.learningVersion,before.learningVersion);
  assert.equal(after.objects.find(o=>o.id==='obj:group:injective').formalHash,before.objects.find(o=>o.id==='obj:group:injective').formalHash);
});
test('alpha renaming does not alter formal hash; changing assumptions does',()=>{
  const before=unchecked(docs()),changed=docs();
  by(changed,'right-unit').data.declarations[0].source='forall y:G. mul(y)(e) = y';
  assert.equal(unchecked(changed).objectVersion,before.objectVersion);
  by(changed,'injective').data.assumptions=['forall a:G b:G. a = b'];
  assert.notEqual(unchecked(changed).objectVersion,before.objectVersion);
  assert.throws(()=>compileContentLibrary(changed),e=>e.code==='stale-reference');
});
test('transparent definitions are expanded for atom/molecule classification',()=>{
  const changed=docs(),d=by(changed,'left-mul').data;
  d.definitions=[{name:'alias',type:'G -> G -> G',source:d.declarations[0].source}];d.declarations[0].source='alias';
  assert(unchecked(changed).objects.find(o=>o.id===d.id).declarations[0].constructionCount>0);
  d.scale='atom';assert.throws(()=>unchecked(changed),e=>e.code==='scale');
  d.scale='molecule';d.definitions[0].source='alias';assert.throws(()=>unchecked(changed),e=>e.code==='cyclic-definition');
});
test('unknown symbols, ill-typed terms and undeclared free variables are rejected',()=>{
  for(const source of ['missing(e)','mul(e)','lam x:G. unknown(x)']){
    const d=docs();by(d,'e').data.declarations[0].source=source;
    assert.throws(()=>unchecked(d),undefined,source);
  }
  const d=docs();by(d,'injective').data.declarations[0].source='forall x:Undeclared. x = x';
  assert.throws(()=>unchecked(d),e=>e.code==='unknown-type');
  for(const type of ['G','G -> o','Undeclared']){
    const changed=docs();by(changed,'injective').data.declarations[0].type=type;
    assert.throws(()=>unchecked(changed),e=>['type','unknown-type'].includes(e.code));
  }
});
test('unit-local declarations can be exported without a self-import',()=>{
  const d=docs(),u=by(d,'unit').data;u.members=[];u.declarations=[{id:'local',kind:'term',type:'G',source:'e',status:'DEF'}];
  u.exports=[{name:'local',type:'G',ref:{id:u.id,version:u.version,anchor:'local',formalHash:''}}];
  assert.equal(unchecked(d).objects.find(o=>o.id===u.id).exports.length,1);
});
test('reading review expires independently of unchanged mathematical content',()=>{
  const l=compileContentLibrary(raw),o=l.objects.find(o=>o.id==='obj:group:injective'),n=l.nodes[0],b=o.lean[0];
  const input=correspondenceInput(o,n,b,'machine-seal');
  assert.equal(correspondenceState(null,input),'pending');
  const receipt={schema:'mcs-content-correspondence/1',status:'reviewed',reviewer:'synthetic-test-reviewer',reviewedAt:'2026-10-18T00:00:00Z',inputHash:input};
  assert.equal(correspondenceState(receipt,input),'reviewed');
  assert.equal(correspondenceState(receipt,correspondenceInput(o,{...n,nodeHash:'changed'},b,'machine-seal')),'stale');
});
test('invalid members, learner data and object version mismatch cannot enter M',()=>{
  const cases=[
    d=>by(d,'unit').data.members[0].id='learn:group:injective-proof',
    d=>by(d,'topic').data.members[0].id='obj:group:e',
    d=>by(d,'e').data.mastery=1,
    d=>by(d,'e').data.version='2',
    d=>by(d,'e').data.language='unsupported',
  ];for(const change of cases){const d=docs();change(d);assert.throws(()=>unchecked(d));}
});
test('duplicate identities, interface blocks and unknown versions are rejected',()=>{
  assert.throws(()=>compileContentLibrary([...raw,raw[0]]),e=>e.code==='duplicate');
  assert.throws(()=>parseContentDocument(raw[0].markdown+'\n'+raw[0].markdown),e=>e.code==='interface-count');
  assert.throws(()=>parseContentDocument('```mcs-object\n{"schema":"mcs-object/9"}\n```'),e=>e.code==='unsupported-version');
});
test('cycles rejected, cross membership allowed and same flattening preserves identity',()=>{
  const d=docs(),unit=structuredClone(by(d,'unit'));unit.data.id='obj:group:unit-other';unit.path='other.md';d.push(unit);
  const r={id:unit.data.id,version:'1',anchor:'$',formalHash:''};by(d,'topic').data.members.push(r);
  const lib=unchecked(d);assert.equal(lib.objects.filter(o=>o.scale==='unit').length,2);
  by(d,'unit').data.imports=[r];unit.data.imports=[{...r,id:'obj:group:unit'}];
  assert.throws(()=>unchecked(d),e=>e.code==='cyclic-import');
});
test('reference anchors, hashes, export types and signature meanings are checked',()=>{
  const edits=[
    d=>by(d,'unit').data.exports[0].ref.anchor='absent',
    d=>by(d,'unit').data.exports[0].type='G',
    d=>by(d,'e').data.context.constants[0].background='另一种同名运算',
  ];for(const edit of edits){const d=docs();edit(d);assert.throws(()=>unchecked(d));}
  const d=docs();d.find(x=>x.kind==='node').data.objects[0].formalHash='sha256:wrong';
  assert.throws(()=>compileContentLibrary(d),e=>e.code==='stale-reference');
});
test('methodological nodes may have no objects; no self-certified Lean review',()=>{
  const d=docs(),node=d.find(x=>x.kind==='node');node.data.objects=[];
  assert.equal(compileContentLibrary(d).nodes.find(n=>n.id===node.data.id).objects.length,0);
  delete node.data.objects;assert.throws(()=>compileContentLibrary(d),e=>e.code==='shape');node.data.objects=[];
  by(d,'injective').data.lean[0].review='reviewed';assert.throws(()=>unchecked(d),e=>e.code==='review');
});
test('module interface maps check endpoints, symbol types and proposition obligations',()=>{
  const d=docs(),unit=structuredClone(by(d,'unit'));unit.data.id='obj:group:unit-other';d.push(unit);
  const topic=by(d,'topic').data,ref={id:unit.data.id,version:'1',anchor:'$',formalHash:''};topic.members.push(ref);
  topic.links=[{id:'interface',kind:'interpretation',from:topic.members[0],to:ref,symbols:[{from:'rightUnit',to:'rightUnit'}],obligation:{id:'obj:group:injective',version:'1',anchor:'claim',formalHash:''},status:'pending'}];
  assert.equal(unchecked(d).objects.find(o=>o.id===topic.id).links.length,1);
  topic.links[0].symbols[0].to='leftMul';assert.throws(()=>unchecked(d),e=>e.code==='type');
  topic.links[0].symbols[0].to='rightUnit';topic.links[0].obligation={id:'obj:group:e',version:'1',anchor:'symbol',formalHash:''};
  assert.throws(()=>unchecked(d),e=>e.code==='type');
  topic.links[0].status='verified';assert.throws(()=>unchecked(d),e=>e.code==='link-status');
});
test('Markdown round trip preserves ordinary prose, Unicode, formulas and interface',()=>{
  for(const doc of docs()){
    const next=parseContentDocument(formatContentDocument(doc.data,doc.body));
    assert.deepEqual(next.data,doc.data);assert.equal(next.body,doc.body);
  }
  const lib=compileContentLibrary(raw),r=objectReference(lib,'obj:group:injective','claim');assert.match(r.formalHash,/^sha256:[a-f0-9]{64}$/);
});
