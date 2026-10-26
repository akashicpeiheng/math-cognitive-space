import {test} from 'node:test';
import assert from 'node:assert/strict';
import {startTestServer,jsonCall} from './helpers.mjs';
import {loadContentLibrary} from '../core/content-library.mjs';
test('public M/L API, legacy projection and read-only state isolation',async()=>{
  const app=await startTestServer({lean:{enabled:false}});
  try{
    const before=await app.db.dumpAll(),library=loadContentLibrary();
    const objects=await jsonCall(app.origin,'/api/v2/ontology/objects');assert.equal(objects.status,200);
    assert.equal(objects.payload.data.objectVersion,library.objectVersion);
    assert(objects.payload.data.objects.every(o=>!Object.hasOwn(o,'body')&&!Object.hasOwn(o,'declarations')));
    const scale=await jsonCall(app.origin,'/api/v2/ontology/object-scale');assert.equal(scale.status,200);assert.equal(scale.payload.data.levels.length,5);
    assert(!scale.payload.data.levels.some(l=>l.id==='node'));
    const detail=await jsonCall(app.origin,'/api/v2/ontology/objects/obj%3Agroup%3Ainjective');assert.equal(detail.status,200);assert.equal(detail.payload.data.readings.length,3);assert.equal(detail.payload.data.lean[0].review,'pending');
    assert(detail.payload.data.correspondence.every(r=>r.status==='pending'));
    const node=await jsonCall(app.origin,'/api/v2/learning/nodes/learn%3Agroup%3Aleft-mul-overview');assert.equal(node.status,200);assert(node.payload.data.objects.some(o=>o.scale==='unit'));
    const legacy=await jsonCall(app.origin,'/api/v2/ontology/nodes/group%3Aclaim-injective');assert.equal(legacy.status,200);assert.equal(legacy.payload.data.node.contentProjection.object,'obj:group:injective');assert.match(legacy.payload.data.node.contentMarkdown,/恢复点/);
    assert.equal((await jsonCall(app.origin,'/api/v2/ontology/objects/absent')).status,404);
    const after=await app.db.dumpAll();delete before.exportedAt;delete after.exportedAt;assert.deepEqual(after,before);
    await app.db.createProfile({name:'合成测试学习者',modelVersion:'mcs-learner/1'});
    const afterPersonalEdit=(await jsonCall(app.origin,'/api/v2/ontology/objects')).payload.data;
    assert.equal(afterPersonalEdit.objectVersion,library.objectVersion);assert.equal(afterPersonalEdit.learningVersion,library.learningVersion);
  }finally{await app.cleanup();}
});
