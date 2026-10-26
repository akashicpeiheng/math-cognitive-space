import {join} from 'node:path';
import {readContentSources} from './content-library.mjs';
import {compileContentLibrary} from '../shared/content-documents.mjs';

/** Machine inputs only. Reading bodies and personal state are deliberately not loaded. */
export function captureObjectBindings(repoRoot,registration) {
  if(!registration.objectBinding)return [];
  if(registration.objectBinding!=='mcs-content/1')throw new Error('不支持的对象绑定协议');
  const sources=readContentSources(join(repoRoot,'mcs-content'),['objects']);
  const library=compileContentLibrary(sources);
  const bindings=library.objects.flatMap(object=>object.lean.filter(b=>b.registrationId===registration.id).map(b=>{
    if(!registration.targets.some(name=>b.target===`MCS.Expected.${name}`))throw new Error(`Lean 目标不在登记中：${b.target}`);
    const declaration=object.declarations.find(d=>d.id===b.anchor);
    return {objectId:object.id,objectVersion:object.version,anchor:b.anchor,formalHash:object.formalHash,declarationHash:declaration.formalHash,target:b.target};
  }));
  if(!bindings.length)throw new Error('登记要求的数学对象绑定缺失');
  return bindings;
}
