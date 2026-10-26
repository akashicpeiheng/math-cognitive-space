import {join} from 'node:path';
import {loadContentLibrary} from './content-library.mjs';
import {createOntology} from './ontology.mjs';
import {concept,action,input,output} from '../data/authoring.mjs';
import {McsError,CODES} from '../shared/errors.mjs';
export const CONTENT_CASE='topology-dg';
const error=(message,code=CODES.BAD_REQUEST,status=400)=>{throw new McsError(code,message,status);};
const cache=new Map();
export function contentCaseLibrary(repoRoot){return loadContentLibrary(join(repoRoot,'mcs-content'));}
export function contentVersions(l){return {contentCase:CONTENT_CASE,objectVersion:l.objectVersion,learningVersion:l.learningVersion};}
export function bindContentRequest(raw,repoRoot){
  if(!raw.contentCase)return raw;
  if(raw.contentCase!==CONTENT_CASE)error('未知公共内容案例');
  const l=contentCaseLibrary(repoRoot),versions=contentVersions(l);
  for(const k of ['objectVersion','learningVersion'])if(raw[k]&&raw[k]!==versions[k])error(`公共内容版本已变化：${k}`,CODES.VERSION_CONFLICT,409);
  return {...raw,...versions};
}
/** D adapter: contracts are AND within one action and OR across actions.
 * It never modifies M/L, nor adds cognitive hints to the planner prerequisites. */
export function projectContentCase(l,{routeChoices={}}={}){
  const readings=l.nodes.filter(n=>n.case===CONTENT_CASE),ids=new Set(readings.map(n=>n.id));
  for(const [id,route] of Object.entries(routeChoices))if(!readings.find(n=>n.id===id)?.routes?.some(r=>r.id===route))error('所选引入路线不存在');
  const nodes=readings.map(n=>concept(n.id,n.title,{discipline:'拓扑',case:CONTENT_CASE,summary:n.goals.join('；'),contentRef:false,teaching:{evidenceStatus:'DEF'},extra:{contentMarkdown:n.body,contentRefData:{source:'learning-node',id:n.id,version:n.version,nodeHash:n.nodeHash},objects:n.objects}}));
  const actions=readings.flatMap(n=>(n.routes??[{id:`route:${n.id}`,title:'直接阅读',inputs:n.prerequisites}]).filter(r=>!routeChoices[n.id]||routeChoices[n.id]===r.id).map(r=>action(r.id,'definition',r.title,r.inputs.map(i=>input(i.id,['definition'])),[output(n.id,['definition','statement'])])));
  // Route prerequisites are already action inputs. Projecting their union as global hard edges would collapse OR alternatives.
  const relations=l.relations.filter(r=>r.layer==='L'&&r.kind!=='hardPrereq'&&ids.has(r.from.id)&&ids.has(r.to.id)).map(r=>({id:r.id,kind:r.kind,from:r.from.id,to:r.to.id,witness:{...r.witness,status:r.evidence.status,ref:r.evidence.source},scope:r.context,...(r.kind==='scaling'?{direction:{...r.direction,reading:'expand'},scalingMode:'generalization'}:{})}));
  const raw={schema:'mcs-web-ontology/1',signature:{baseTypes:[],symbols:[]},theory:{id:'T_content_projection',axioms:[]},nodes,actions,relationDescriptions:relations,evidence:[],claims:[],support:[],aggregates:[],templates:[],patterns:[],localizations:[],coverage:[],payload:Object.fromEntries(nodes.map(n=>[n.id,n.formal]))};
  const ontology=createOntology(raw,{contentProjection:true});
  return {...ontology,contentVersions:contentVersions(l)};
}
export function selectContentOntology(raw,legacy,repoRoot){
  if(!raw.contentCase)return legacy;
  bindContentRequest(raw,repoRoot);
  const l=contentCaseLibrary(repoRoot),key=JSON.stringify([l.objectVersion,l.learningVersion,raw.routeChoices??{}]);
  if(!cache.has(key)){if(cache.size>20)cache.clear();cache.set(key,projectContentCase(l,raw));}
  return cache.get(key);
}
export function contentNetwork(l,layer='M'){
  if(!['M','L'].includes(layer))error('网络层须为 M 或 L');
  const records=layer==='M'?l.objects.filter(o=>o.id.startsWith('obj:tdg:')):l.nodes.filter(n=>n.case===CONTENT_CASE),ids=new Set(records.map(x=>x.id));
  const relations=l.relations.filter(r=>r.layer===layer&&ids.has(r.from.id)&&ids.has(r.to.id));
  const graph={version:layer==='M'?l.objectVersion:l.learningVersion,...contentVersions(l),layer,contentLocale:'zh',nodes:records.map(r=>({id:r.id,version:r.version,title:r.title,construct:r.declarations?.[0]?.id==='claim'?'Claim':'Concept',roles:r.declarations?.[0]?.id==='claim'?['Theorem']:['Concept'],discipline:'拓扑',case:CONTENT_CASE,summary:r.goals?.join('；')??r.body.split('\n\n')[1],evidenceStatus:r.declarations?.[0]?.status??'DEF',hasContent:true,actionCount:r.routes?.length??0,relationCount:relations.filter(e=>e.from.id===r.id||e.to.id===r.id).length,evidenceCount:0,contentRefData:layer==='M'?{source:'math-object',id:r.id,version:r.version,formalHash:r.formalHash}:{source:'learning-node',id:r.id,version:r.version,nodeHash:r.nodeHash}})),relations:relations.map(r=>({id:r.id,kind:r.kind,from:r.from.id,to:r.to.id,witness:{status:r.evidence.status,ref:r.evidence.source},scope:`${r.context}\n${r.witness.statement}\n${r.premises.length?'AND：'+r.premises.map(p=>p.id).join(' + '):''}`,direction:r.direction,...(r.direction?{scaling:r.direction,scalingMode:'generalization'}:{}),contentRelation:r})),actions:layer==='L'?projectContentCase(l).raw.actions:[],support:[],evidence:[],aggregates:[],patterns:[]};
  return graph;
}
