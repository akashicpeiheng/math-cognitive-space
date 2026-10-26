import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {readContentSources,loadContentLibrary} from '../core/content-library.mjs';
import {compileContentLibrary,parseContentDocument} from '../shared/content-documents.mjs';
import {contentNetwork,projectContentCase,bindContentRequest} from '../core/content-case.mjs';
import {makePlanner} from '../core/planner.mjs';
import {buildLearningPlan} from '../core/learning-plan.mjs';
import {mkdtemp,writeFile,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {promisify} from 'node:util';
import {execFile} from 'node:child_process';
import {normalizeNodeRef,normalizeNetworkExtras,NETWORK_SCHEMA} from '../shared/network-workspace.mjs';
import {startTestServer,jsonCall} from './helpers.mjs';
const root=new URL('../../',import.meta.url).pathname.replace(/^\/([A-Z]:)/,'$1');
const library=loadContentLibrary(),sources=readContentSources(),docs=()=>sources.map(s=>parseContentDocument(s.markdown,s.path));
const relation=(d,k)=>d.find(x=>x.data.id===`rel:tdg:${k}`).data;
test('27 core identities, explicit corrections and eight relation categories are traceable',()=>{
 const manifest=JSON.parse(readFileSync(new URL('../../mcs-content/cases/topology-dg.json',import.meta.url)));
 assert.equal(manifest.core.length,27);assert.equal(new Set(manifest.core.map(x=>x.object)).size,27);
 for(const c of manifest.core){assert(library.objects.some(o=>o.id===c.object));assert(library.nodes.some(n=>n.id===c.reading));assert.equal(c.humanReview,'pending');}
 assert.equal(manifest.relations.length,library.relations.length);
 assert.equal(new Set(library.relations.map(r=>r.kind==='scaling'?`${r.kind}-${r.strength}`:r.kind)).size,8);
 assert(manifest.corrections.length>=10);
 assert.equal(manifest.sourceRelations.length,101);for(const row of manifest.sourceRelations){assert(row.relationIds.length);for(const id of row.relationIds)assert(library.relations.some(r=>r.id===id));assert.equal(row.humanReview,'pending');}
 for(const key of ['lie-scalar','vector-realization'])assert(library.objects.some(o=>o.id===`obj:tdg:${key}`&&o.declarations[0].id==='claim'));
});
test('relation endpoints, directions, conditions, proof anchors and route contracts cannot be forged',()=>{
 const edits=[d=>delete relation(d,'scale-c2-c1').context,d=>relation(d,'scale-c2-c1').direction={special:'obj:tdg:c1',general:'obj:tdg:c2'},d=>relation(d,'scale-c2-c1').to.formalHash='sha256:expired',d=>relation(d,'deduce-compact-hausdorff-normal-compact').premises=[],d=>relation(d,'deduce-compact-hausdorff-normal-compact').to.anchor='$',d=>relation(d,'prereq-gradient-1-partial').routeId='route:tdg:gradient:2',d=>relation(d,'linear-dual').witness.type='formal-adjoint',d=>relation(d,'scale-c2-c1').from.id='learn:tdg:c2'];
 for(const edit of edits){const d=docs();edit(d);assert.throws(()=>compileContentLibrary(d));}
 const d=docs();d.find(x=>x.data.id==='learn:tdg:topology').data.routes[0].inputs=[{id:'learn:tdg:chart',version:'1'}];assert.throws(()=>compileContentLibrary(d),e=>e.code==='route-cycle');
});
test('M/L relation edits version independently, neither contains personal state',()=>{
 const d=docs();relation(d,'hint-c1-c2').witness.statement+=' 修订阅读建议';const next=compileContentLibrary(d);assert.equal(next.objectVersion,library.objectVersion);assert.notEqual(next.learningVersion,library.learningVersion);
 const changed=docs();relation(changed,'scale-c2-c1').context+=' 限定背景';const math=compileContentLibrary(changed);assert.notEqual(math.objectVersion,library.objectVersion);assert.equal(math.learningVersion,library.learningVersion);
 assert.throws(()=>bindContentRequest({contentCase:'topology-dg',objectVersion:'stale'},root),e=>e.status===409);
});
test('same planner handles AND contracts and OR routes without false strong dependencies',()=>{
 const o=projectContentCase(library),planner=makePlanner(o),gradient=library.nodes.find(n=>n.id==='learn:tdg:gradient');assert.equal(gradient.routes.length,2);
 for(const route of gradient.routes){const chosen=projectContentCase(library,{routeChoices:{[gradient.id]:route.id}}),result=makePlanner(chosen).plan({goalId:gradient.id,horizon:32});assert.equal(result.status,'Found');for(const r of result.routes){assert(r.events.some(e=>e.actionId===route.id));assert(!r.events.some(e=>gradient.routes.some(other=>other.id!==route.id&&e.actionId===other.id)));}}
 for(const goal of ['connected','compact','tensor','directional']){const p=planner.plan({goalId:`learn:tdg:${goal}`,horizon:32});assert.equal(p.status,'Found');const actionIds=p.routes.flatMap(r=>r.events.map(e=>e.actionId));assert(!actionIds.some(x=>x.includes(goal==='connected'?'compact':goal==='compact'?'connected':goal==='tensor'?'tangent':'frechet')));}
 const forms=library.nodes.find(n=>n.id==='learn:tdg:forms');assert.equal(forms.routes.length,2);assert(!forms.routes[1].inputs.some(i=>i.id==='learn:tdg:tensor-field'));
 const chosenForms=projectContentCase(library,{routeChoices:{[forms.id]:forms.routes[1].id}}),preview=buildLearningPlan(chosenForms,{primaryGoal:forms.id},[]);
 assert.equal(preview.status,'Found');assert(!preview.steps.some(s=>s.node==='learn:tdg:tensor-field'));assert(!preview.steps.some(s=>s.hardPrereqs.includes('learn:tdg:tensor-field')));
 const graph=contentNetwork(library,'M');assert(graph.nodes.every(n=>n.contentRefData.source==='math-object'));assert(graph.relations.every(r=>r.from.startsWith('obj:')&&r.to.startsWith('obj:')));
});

test('cloud entry uses the same pinned projection and rejects stale M/L versions',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'mcs-tdg-cloud-'));
 try{
 const input=join(dir,'input.json'),output=join(dir,'output.json');
 const request={contentCase:'topology-dg',objectVersion:library.objectVersion,learningVersion:library.learningVersion,goalId:'learn:tdg:gradient',horizon:32};
 const expected=makePlanner(projectContentCase(library)).plan(request);
 await writeFile(input,JSON.stringify({kind:'plan',request}));
 await promisify(execFile)(process.execPath,[join(root,'mcs-web/server/cloud-runner.mjs'),input,output],{timeout:30000});
 const actual=JSON.parse(await readFile(output,'utf8'));assert.equal(actual.ok,true);assert.deepEqual(actual.result.routes,JSON.parse(JSON.stringify(expected.routes)));assert.equal(actual.result.objectVersion,library.objectVersion);
 await writeFile(input,JSON.stringify({kind:'plan',request:{...request,learningVersion:'stale'}}));
 await assert.rejects(promisify(execFile)(process.execPath,[join(root,'mcs-web/server/cloud-runner.mjs'),input,output],{timeout:30000}));
 assert.match(JSON.parse(await readFile(output,'utf8')).error.message,/版本已变化/);
 }finally{await rm(dir,{recursive:true,force:true});}
});
test('snapshot v3 preserves exact M/L references and reads v2',()=>{
 for(const layer of ['M','L']){const n=contentNetwork(library,layer).nodes[0],ref=normalizeNodeRef(n.contentRefData);const snapshot=normalizeNetworkExtras({schema:NETWORK_SCHEMA,refs:[ref],contentCase:'topology-dg',contentLayer:layer});assert.equal(snapshot.contentLayer,layer);assert.deepEqual(snapshot.refs,[ref]);}
 assert.equal(normalizeNetworkExtras({schema:'mcs-network/2',refs:[{source:'ontology',id:'legacy',version:'1'}]}).schema,NETWORK_SCHEMA);
 assert.throws(()=>normalizeNodeRef({source:'math-object',id:'obj:a',version:'1',formalHash:'bad'}));
});
test('case API: sync and worker projections agree; stale requests fail; E records stay personal',async()=>{
 const app=await startTestServer({lean:{enabled:false}});
 try{
 const math=await jsonCall(app.origin,'/api/v2/ontology/object-network'),learning=await jsonCall(app.origin,'/api/v2/learning/network');assert.equal(math.status,200);assert.equal(learning.status,200);assert.equal(math.payload.data.layer,'M');
 const request={contentCase:'topology-dg',objectVersion:library.objectVersion,learningVersion:library.learningVersion,goalId:'learn:tdg:gradient',horizon:32};
 const sync=await jsonCall(app.origin,'/api/v2/plans?sync=1',{method:'POST',body:request});assert.equal(sync.status,200);assert.equal(sync.payload.data.status,'Found');
 const started=await jsonCall(app.origin,'/api/v2/plans',{method:'POST',body:request});assert.equal(started.status,200);let response;for(let i=0;i<120;i++){response=await jsonCall(app.origin,`/api/v2/plans/${started.payload.data.job.id}`);if(response.payload.data.result||response.payload.data.error)break;await new Promise(r=>setTimeout(r,50));}
 assert.equal(response.payload.data.result?.objectVersion,library.objectVersion);assert.deepEqual(response.payload.data.result?.routes,sync.payload.data.routes);
 assert.equal((await jsonCall(app.origin,'/api/v2/plans',{method:'POST',body:{...request,learningVersion:'expired'}})).status,409);
 const preview=await jsonCall(app.origin,'/api/v2/learning-plan-preview',{method:'POST',body:{...request,preferences:{primaryGoal:'learn:tdg:forms'},routeChoices:{'learn:tdg:forms':'route:tdg:forms:2'}}});assert.equal(preview.status,200);
 let previewResult;for(let i=0;i<120;i++){const p=await jsonCall(app.origin,`/api/v2/learning-plan-preview/${preview.payload.data.job.id}`);if(p.payload.data.job.result){previewResult=p.payload.data.job.result;break;}assert.notEqual(p.payload.data.job.status,'error',JSON.stringify(p.payload));await new Promise(r=>setTimeout(r,50));}
 assert.equal(previewResult?.learningVersion,library.learningVersion);assert(!previewResult?.steps.some(s=>s.node==='learn:tdg:tensor-field'));
 const profile=await app.db.createProfile({name:'合成案例测试',modelVersion:'mcs-manual-model/1'});
 const event=await jsonCall(app.origin,`/api/v2/profiles/${profile.id}/events`,{method:'POST',body:{...request,event:{eventId:'tdg-read',kind:'view',nodeId:request.goalId,payload:{readingCompleted:true}}}});assert.equal(event.status,200);
 const after=await jsonCall(app.origin,'/api/v2/ontology/object-network');assert.equal(after.payload.data.objectVersion,library.objectVersion);assert.equal(after.payload.data.learningVersion,library.learningVersion);
 }finally{await app.cleanup();}
});
