import { readdirSync, readFileSync, realpathSync, existsSync } from 'node:fs';
import { resolve, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { compileContentLibrary } from '../shared/content-documents.mjs';

export const CONTENT_ROOT=fileURLToPath(new URL('../../mcs-content/',import.meta.url));
export function readContentSources(root=CONTENT_ROOT, folders=['objects','nodes','relations']) {
  const base=realpathSync(root),files=[];
  const visit=dir=>{for(const entry of readdirSync(dir,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name,'en'))){
    const path=resolve(dir,entry.name),actual=realpathSync(path);
    if(!actual.startsWith(base+sep))throw new Error('内容路径越出公共文档目录');
    if(entry.isSymbolicLink())throw new Error('公共内容不接受目录联接或符号链接');
    if(entry.isDirectory())visit(path);
    else if(entry.name.endsWith('.md'))files.push({path:relative(base,path).replaceAll('\\','/'),markdown:readFileSync(path,'utf8')});
  }};
  for(const sub of folders) {
    if(!['objects','nodes','relations'].includes(sub))throw new Error('未知公共内容分区');
    if(sub==='relations'&&!existsSync(resolve(base,sub)))continue;
    visit(resolve(base,sub));
  }
  return files;
}
let cached;
export function loadContentLibrary(root=CONTENT_ROOT) {
  const sources=readContentSources(root),fingerprint=JSON.stringify(sources);
  if(cached?.root===root&&cached.fingerprint===fingerprint)return cached.library;
  const library=compileContentLibrary(sources);cached={root,fingerprint,library};return library;
}
