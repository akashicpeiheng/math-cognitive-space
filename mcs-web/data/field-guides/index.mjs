import { createHash } from 'node:crypto';
import { FIELD_IDS } from '../fields.mjs';
import { ENTRY_SOURCES } from '../field-entry-support.mjs';
import analysisGeometry from './analysis-geometry.mjs';
import algebra from './algebra.mjs';
import foundationsPhysics from './foundations-physics.mjs';
export const FIELD_GUIDES = [...analysisGeometry,...algebra,...foundationsPhysics];
export const FIELD_GUIDE_VERSION = 'field-guides/1:'+createHash('sha256').update(JSON.stringify({guides:FIELD_GUIDES,sources:ENTRY_SOURCES})).digest('hex');
export function fieldGuidesFor(locale='zh',ontologyVersion=null) {
  const language=locale==='en'?'en':'zh';
  return {version:FIELD_GUIDE_VERSION,ontologyVersion,locale:language,guides:FIELD_GUIDES.map(guide=>({
    id:guide.id,title:guide.title[language],anchor:guide.anchor,status:guide.status,
    object:guide.object[language],motivations:guide.motivations.map(p=>p[language]),
    questions:guide.questions.map(q=>({id:q.id,title:q.title[language],explanation:q.explanation[language],nodes:[...q.nodes]})),
    growth:guide.growth[language],entry:guide.entry[language],misconceptions:guide.misconceptions.map(p=>p[language]),review:guide.review[language],
    core:guide.core.map(n=>({id:n.id,reason:n.reason[language],bridge:n.bridge})),
    sources:guide.sources.map(key=>({id:key,...ENTRY_SOURCES[key]})),
  }))};
}
/** Format/reference checks only. Mathematical and editorial review remains separate. */
export function validateFieldGuides(raw) {
  const problems=[];
  const nodes=new Map(raw.nodes.map(n=>[n.id,n]));
  if(FIELD_GUIDES.length!==FIELD_IDS.length)problems.push('Expected 12 guides');
  for(const id of FIELD_IDS)if(FIELD_GUIDES.filter(g=>g.id===id).length!==1)problems.push('Missing or duplicate field: '+id);
  for(const guide of FIELD_GUIDES){
    if(!FIELD_IDS.includes(guide.id))problems.push('Unknown field: '+guide.id);
    const ids=guide.core.map(n=>n.id);
    if(ids.length<6||ids.length>10||new Set(ids).size!==ids.length)problems.push(guide.id+': invalid core count');
    if(!ids.includes(guide.anchor))problems.push(guide.id+': anchor outside core');
    for(const id of ids){
      const node=nodes.get(id);
      if(!node)problems.push(guide.id+': missing '+id);
      else if(node.granularity!=='unit'||!node.contentMarkdown?.trim())problems.push(guide.id+': topic or empty body '+id);
    }
    if(guide.questions.length<3||guide.questions.length>5||guide.motivations.length<2)problems.push(guide.id+': invalid guide structure');
    for(const question of guide.questions)if(!question.nodes.length||question.nodes.some(id=>!ids.includes(id)))problems.push(guide.id+': invalid question '+question.id);
    for(const source of guide.sources)if(!ENTRY_SOURCES[source]?.url||!ENTRY_SOURCES[source]?.location)problems.push(guide.id+': invalid source '+source);
    for(const locale of ['zh','en']){
      const localized=fieldGuidesFor(locale).guides.find(g=>g.id===guide.id);
      if(!localized.object||!localized.growth||!localized.entry||!localized.review||localized.core.some(n=>!n.reason)||localized.questions.some(q=>!q.title||!q.explanation))problems.push(guide.id+': incomplete '+locale);
    }
  }
  return problems;
}
