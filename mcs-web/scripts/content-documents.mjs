import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { CONTENT_ROOT,readContentSources } from '../core/content-library.mjs';
import { compileContentLibrary,parseContentDocument,formatContentDocument,objectReference } from '../shared/content-documents.mjs';

const mode=process.argv[2]??'--check';
if(!['--check','--seal'].includes(mode))throw new Error('用法：node scripts/content-documents.mjs [--check|--seal]');
const sources=readContentSources(),library=compileContentLibrary(sources,{checkPins:mode!=='--seal'});
if(mode==='--seal')for(const source of sources){
  const doc=parseContentDocument(source.markdown,source.path);
  const pin=value=>{if(Array.isArray(value))return value.map(pin);if(!value||typeof value!=='object')return value;
    if(Object.hasOwn(value,'formalHash')&&Object.hasOwn(value,'anchor'))return objectReference(library,value.id,value.anchor);
    return Object.fromEntries(Object.entries(value).map(([key,item])=>[key,pin(item)]));};
  const next=formatContentDocument(pin(doc.data),doc.body);
  if(next!==source.markdown)writeFileSync(resolve(CONTENT_ROOT,source.path),next,'utf8');
}
const checked=compileContentLibrary(readContentSources());
console.log(JSON.stringify({status:'passed',objects:checked.objects.length,nodes:checked.nodes.length,objectVersion:checked.objectVersion,learningVersion:checked.learningVersion,scope:'FINITE：结构、类型、引用与摘要检查；不判定数学真值'},null,2));
