import { loadOntology } from '../core/ontology.mjs';
import { overlayFor } from '../data/i18n/index.mjs';
import { FIELD_GUIDES,fieldGuidesFor,validateFieldGuides } from '../data/field-guides/index.mjs';
import { entryNotes } from '../data/field-entry.mjs';
import { renderToString } from 'katex';
const ontology=await loadOntology();
const en=await overlayFor('en');
console.log('Guide problems:',validateFieldGuides(ontology.raw));
const ids=[...new Set(FIELD_GUIDES.flatMap(g=>g.core.map(n=>n.id)))];
for(const id of ids){
  const n=ontology.raw.nodes.find(n=>n.id===id);
  if(!en.nodes?.[id]||!en.cases?.[n.contentRef??id])console.log('English gap:',id,'body:',n.contentRef,'chars:',n.contentMarkdown.length);
}
for(const n of entryNotes)if(n.formula)renderToString(n.formula,{throwOnError:true,strict:'error'});
for(const g of fieldGuidesFor().guides){
 const text=[g.object,...g.motivations,...g.questions.flatMap(q=>[q.title,q.explanation]),g.growth,g.entry,...g.misconceptions,g.review].join('');
 console.log(g.id,text.length+' characters',g.core.length+' nodes');
}
console.log('Notes:',entryNotes.length,'selected distinct:',ids.length);
