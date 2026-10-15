import test from 'node:test';
import assert from 'node:assert/strict';
import { loadOntology } from '../core/ontology.mjs';
import { fieldGuidesFor,validateFieldGuides } from '../data/field-guides/index.mjs';
import { defaultField,deriveFieldGuide } from '../web/src/field-guide.ts';
import { entryNotes } from '../data/field-entry.mjs';
import { renderEntryNote } from '../data/field-entry-support.mjs';
import { renderToString } from 'katex';
import { startTestServer } from './helpers.mjs';

test('12 bilingual guides: 500–800 characters, valid units, bodies, anchors and questions',async()=>{
 const ontology=await loadOntology();
 assert.deepEqual(validateFieldGuides(ontology.raw),[]);
 const zh=fieldGuidesFor(),en=fieldGuidesFor('en');
 const english=await loadOntology({locale:'en'});
 assert.equal(zh.guides.length,12);assert.equal(zh.version,en.version);
 for(const g of zh.guides){
  const text=[g.object,...g.motivations,...g.questions.flatMap(q=>[q.title,q.explanation]),g.growth,g.entry,...g.misconceptions,g.review].join('');
  assert.ok(text.length>=500&&text.length<=800,g.id+' length '+text.length);
  const translated=en.guides.find(x=>x.id===g.id);
  assert.deepEqual(g.core.map(n=>n.id),translated.core.map(n=>n.id));
  assert.equal(g.anchor,translated.anchor);
  for(const core of g.core){
   assert.doesNotMatch(english.node(core.id).title,/[\u3400-\u9fff]/,core.id+' untranslated network title');
   assert.doesNotMatch(english.node(core.id).summary,/[\u3400-\u9fff]/,core.id+' untranslated summary');
  }
  assert.doesNotMatch([translated.object,...translated.motivations,translated.entry,translated.growth,translated.review].join(''),/[\u3400-\u9fff]/);
 }
 for(const note of entryNotes){
  assert.equal(ontology.node(note.id).contentMarkdown.trim(),renderEntryNote(note).trim(),note.id+' generated body is stale');
  assert.ok(!JSON.stringify(ontology.node(note.id).teaching).includes('正文尚未撰写'),note.id+' stale teaching scope');
  const own=ontology.evidenceFor(note.id).filter(e=>e.nodes?.[0]===note.id);
  assert.ok(own.length>0,note.id+' lacks its own evidence record');
  assert.ok(own.every(e=>!e.scope?.includes('正文尚未撰写')),note.id+' stale evidence scope');
  if(note.formula)assert.doesNotThrow(()=>renderToString(note.formula,{throwOnError:true,strict:'error'}),note.id);
 }
 assert.equal(ontology.evidenceFor('rudin:algebraic-completeness').find(e=>e.id==='ev-rudin-algebraic-completeness').status,'REF');
 assert.equal(ontology.node('rudin:fundamental-theorem').teaching.evidenceStatus,'REF','broader registered claim remains cited');
});
test('derivation is pure, exact membership, real edges, explicit missing references',async()=>{
 const ontology=await loadOntology();
 const graph={nodes:ontology.raw.nodes,relations:ontology.raw.relationDescriptions,actions:ontology.raw.actions};
 const before=JSON.stringify(graph);
 for(const guide of fieldGuidesFor().guides){
  const v=deriveFieldGuide(guide,graph);
  assert.equal(v.nodes.length,guide.core.length);assert.deepEqual(v.missing,[]);
  assert.equal(v.layout.placed.length,guide.core.length);
  for(const e of v.edges){
   assert.ok(guide.core.some(n=>n.id===e.from)&&guide.core.some(n=>n.id===e.to));
   assert.ok(e.source==='contract'?graph.actions.some(a=>a.id===e.actionId):graph.relations.some(r=>r.id===e.id));
  }
  assert.deepEqual(deriveFieldGuide(guide,graph),v);
 }
 assert.equal(JSON.stringify(graph),before);
 const guide=fieldGuidesFor().guides[0];
 assert.deepEqual(deriveFieldGuide({...guide,core:[...guide.core,{id:'absent',reason:'test',bridge:false}]},graph).missing,['absent']);
 assert.ok(validateFieldGuides({...ontology.raw,nodes:ontology.raw.nodes.filter(n=>n.id!==guide.anchor)}).some(p=>p.includes(guide.anchor)));
});
test('field defaults use valid URL, first interest, then analysis',()=>{
 const g=fieldGuidesFor().guides;
 assert.equal(defaultField(g,'群论',['拓扑']),'群论');
 assert.equal(defaultField(g,'invalid',['unknown','拓扑','群论']),'拓扑');
 assert.equal(defaultField(g,null,[]),'分析');
});
test('public guide API uses query/header locales and same ontology version without E writes',async()=>{
 const server=await startTestServer();
 try{
  const call=async(path,options={})=>{
    const response=await fetch(server.origin+'/api/v2'+path,{headers:options.headers});
    return {status:response.status,payload:await response.json()};
  };
  const health=(await call('/health')).payload.data;
  const zh=await call('/field-guides'),en=await call('/field-guides',{headers:{'x-mcs-locale':'en'}});
  assert.equal(zh.status,200);assert.equal(en.status,200);
  assert.equal(en.payload.data.locale,'en');
  assert.equal(zh.payload.data.ontologyVersion,health.ontology.version);
  assert.equal(en.payload.data.version,zh.payload.data.version);
  assert.equal((await call('/field-guides?locale=zh',{headers:{'x-mcs-locale':'en'}})).payload.data.locale,'zh');
  assert.equal((await call('/field-guides?locale=invalid')).payload.data.locale,'zh');
  assert.equal((await call('/health')).payload.data.ontology.contentHash,health.ontology.contentHash);
 }finally{await server.cleanup();}
});
