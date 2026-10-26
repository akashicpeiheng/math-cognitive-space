import { loadContentLibrary } from '../core/content-library.mjs';
import { leanRegistrationView } from '../core/lean.mjs';
import { McsError,CODES } from '../shared/errors.mjs';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { correspondenceInput,correspondenceState } from '../shared/content-evidence.mjs';
import { contentMaster } from './master-view.mjs';
import {contentNetwork,contentVersions} from '../core/content-case.mjs';
import { buildMcsView } from '../core/mcs-view.mjs';
const versions=l=>({objectVersion:l.objectVersion,learningVersion:l.learningVersion,contentLocale:'zh'});
const notFound=id=>new McsError(CODES.UNKNOWN_NODE,`文档不存在：${id}`,404);
export function registerContentApi({route,config}) {
  const library=()=>loadContentLibrary(join(config.repoRoot,'mcs-content'));
  route('GET',/^\/api\/v2\/ontology\/mcs-view$/,async()=>buildMcsView(library(),JSON.parse(readFileSync(join(config.repoRoot,'mcs-content/cases/topology-dg.json'),'utf8'))));
  route('GET',/^\/api\/v2\/content-cases$/,async()=>({cases:[{id:'topology-dg',title:'拓扑—微分几何',contentLocale:'zh',...contentVersions(library())}]}));
  route('GET',/^\/api\/v2\/ontology\/object-network$/,async()=>contentNetwork(library(),'M'));
  route('GET',/^\/api\/v2\/learning\/network$/,async()=>contentNetwork(library(),'L'));
  route('GET',/^\/api\/v2\/content-relations\/([^/]+)$/,async({params})=>{const l=library(),relation=l.relations.find(r=>r.id===decodeURIComponent(params[0]));if(!relation)throw notFound(params[0]);return {...versions(l),relation};});
  route('GET',/^\/api\/v2\/ontology\/objects$/,async({query})=>{const l=library();return {...versions(l),objects:l.objects.map(o=>({id:o.id,version:o.version,title:o.title,scale:o.scale,formalHash:o.formalHash,master:contentMaster(l,o,query.get('locale'),true)}))};});
  route('GET',/^\/api\/v2\/ontology\/object-scale$/,async({query})=>{const l=library();return {...versions(l),...l.scale,objects:l.objects.map(o=>({id:o.id,title:o.title,scale:o.scale,members:o.members,master:contentMaster(l,o,query.get('locale'),true)}))};});
  route('GET',/^\/api\/v2\/ontology\/objects\/([^/]+)$/,async({params,ontology,query})=>{
    const l=library(),id=decodeURIComponent(params[0]),object=l.objects.find(x=>x.id===id);if(!object)throw notFound(id);
    const lean=await Promise.all(object.lean.map(async binding=>{
      try{return {...binding,verification:await leanRegistrationView(config.repoRoot,binding.registrationId)};}
      catch(error){return {...binding,verification:null,unavailable:error.message};}
    }));
    const readings=l.nodes.filter(n=>n.objects.some(r=>r.id===id));
    const ledger=JSON.parse(readFileSync(join(config.repoRoot,'mcs-content/correspondence-reviews.json'),'utf8'));
    if(ledger.schema!=='mcs-content-reviews/1'||!Array.isArray(ledger.reviews))throw new Error('对应审阅账本损坏');
    const correspondence=lean.flatMap(b=>readings.map(n=>{
      const inputHash=correspondenceInput(object,n,b,b.verification?.inputSha256??null);
      const receipt=ledger.reviews.findLast(r=>r.objectId===id&&r.nodeId===n.id&&r.target===b.target);
      return {nodeId:n.id,target:b.target,inputHash,status:correspondenceState(receipt,inputHash)};
    }));
    return {...versions(l),object,master:contentMaster(l,object,query.get('locale')),readings,lean,correspondence,relations:l.relations.filter(r=>r.from.id===id||r.to.id===id||r.premises.some(p=>p.id===id)),legacyOntologyVersion:ontology.version};
  });
  route('GET',/^\/api\/v2\/learning\/nodes$/,async({query})=>{const l=library();return {...versions(l),nodes:l.nodes.map(n=>({id:n.id,version:n.version,title:n.title,goals:n.goals,nodeHash:n.nodeHash,master:contentMaster(l,n,query.get('locale'),true)}))};});
  route('GET',/^\/api\/v2\/learning\/nodes\/([^/]+)$/,async({params,query})=>{
    const l=library(),id=decodeURIComponent(params[0]),node=l.nodes.find(x=>x.id===id);if(!node)throw notFound(id);
    return {...versions(l),node,master:contentMaster(l,node,query.get('locale')),objects:l.objects.filter(o=>node.objects.some(r=>r.id===o.id))};
  });
}
/** Explicit crosswalk; M and L identities remain distinct. */
export const LEGACY_CONTENT_MAP=Object.freeze({
  'group:left-mul':{object:'obj:group:left-mul',node:'learn:group:left-mul-overview'},
  'group:claim-injective':{object:'obj:group:injective',node:'learn:group:injective-intuition'},
  'group:proof-injective':{object:'obj:group:injective',node:'learn:group:injective-proof'},
});
export function legacyContentProjection(node) {
  const mapping=LEGACY_CONTENT_MAP[node.id];if(!mapping)return node;
  const l=loadContentLibrary(),object=l.objects.find(o=>o.id===mapping.object),reading=l.nodes.find(n=>n.id===mapping.node);
  return {...node,contentMarkdown:reading.body,contentProjection:{schema:'mcs-legacy-content-projection/1',...mapping,objectVersion:object.version,formalHash:object.formalHash,nodeVersion:reading.version,nodeHash:reading.nodeHash,legacyContracts:true},publicReading:reading,mathObject:object};
}
