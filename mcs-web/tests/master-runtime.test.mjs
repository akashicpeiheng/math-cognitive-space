import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { resolve } from 'node:path';
import {mkdtemp,writeFile,readFile,rm} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {promisify} from 'node:util';
import {execFile} from 'node:child_process';
import {unpackRuntime} from '../server/cloud-runtime.mjs';
import {loadContentLibrary} from '../core/content-library.mjs';
test('cloud runtime ships the current public Master projection and editorial selections', () => {
  const bundle = JSON.parse(gunzipSync(readFileSync(new URL('../dist/cloud-runtime.json.gz', import.meta.url))));
  for (const path of ['mcs-web/shared/master-view.mjs','mcs-web/shared/master-view.d.mts','mcs-web/data/master-content.mjs']) {
    const entry = bundle.files.find(file => file.path === path);
    assert(entry, path);
    assert.equal(Buffer.from(entry.content, 'base64').toString(), readFileSync(resolve('..',path),'utf8'), path);
  }
});

test('an isolated offline runtime includes parser dependencies, case projection and Lean materials',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'mcs-cloud-isolated-'));
 try{
  await unpackRuntime(dir);
  const library=loadContentLibrary();
  const request={contentCase:'topology-dg',objectVersion:library.objectVersion,learningVersion:library.learningVersion,goalId:'learn:tdg:forms',routeChoices:{'learn:tdg:forms':'route:tdg:forms:2'},horizon:32};
  const input=join(dir,'input.json'),output=join(dir,'output.json');await writeFile(input,JSON.stringify({kind:'plan',request}));
  await promisify(execFile)(process.execPath,[join(dir,'mcs-web/server/cloud-runner.mjs'),input,output],{cwd:dir,timeout:30000});
  const result=JSON.parse(await readFile(output,'utf8'));assert.equal(result.ok,true);assert.equal(result.result.status,'Found');assert.equal(result.result.objectVersion,library.objectVersion);
  assert(result.result.routes.every(r=>r.events.every(e=>e.focus.node!=='learn:tdg:tensor-field')));
  for(const path of ['MCS/TopologyTargets.lean','MCS/Proofs/Topology.lean','integrity.json'])assert((await readFile(join(dir,'mcs-foundations/lean',path))).length>0);
 }finally{await rm(dir,{recursive:true,force:true});}
});
