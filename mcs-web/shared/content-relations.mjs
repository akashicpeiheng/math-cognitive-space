import { digest } from '../core/formal/codec.mjs';

export const RELATION_SCHEMA='mcs-relation/1';
export const CONTENT_RELATION_KINDS=Object.freeze(['deduction','hardPrereq','scaling','softPrereq','application','analogy','duality']);
const hash=x=>`sha256:${digest(x)}`;
const need=(ok,message)=>{if(!ok)throw new Error(`公共关系：${message}`);};
const text=x=>typeof x==='string'&&x.trim().length>0;
const allowed=(x,keys)=>{need(x&&typeof x==='object'&&!Array.isArray(x),'记录必须是对象');for(const k of Object.keys(x))need(keys.includes(k),`未定义字段 ${k}`);};

/** Relations are checked after M/L compilation; navigation does not enter the import DAG. */
export function compileContentRelations(documents,library,{checkPins=true}={}) {
  const objects=new Map(library.objects.map(o=>[o.id,o])),nodes=new Map(library.nodes.map(n=>[n.id,n]));
  const resolve=(r,layer)=>{
    allowed(r,['id','version','anchor','formalHash']);
    const target=objects.get(r.id)??(layer==='L'?nodes.get(r.id):null);
    need(target&&target.version===r.version,`引用不存在或版本失效：${r.id}`);
    if(target.kind==='object'){
      const anchor=r.anchor==='$'?target:target.declarations.find(d=>d.id===r.anchor);
      need(anchor,`声明锚点不存在：${r.id}#${r.anchor}`);
      if(checkPins)need(anchor.formalHash===r.formalHash,`形式摘要失效：${r.id}`);
      return {...r,formalHash:anchor.formalHash};
    }
    need(r.anchor==='$',`阅读节点只接受整体引用：${r.id}`);
    return {id:r.id,version:r.version,anchor:'$'};
  };
  const ids=new Set();
  return documents.map(doc=>{
    const d=doc.data;
    allowed(d,['schema','id','version','title','case','layer','kind','strength','from','to','premises','context','routeId','witness','evidence','direction']);
    need(d.schema===RELATION_SCHEMA&&text(d.id)&&text(d.version)&&text(d.title),'身份或版本无效');
    need(!ids.has(d.id),`重复身份 ${d.id}`);ids.add(d.id);
    need(d.layer==='M'||d.layer==='L','layer 必须是 M/L');
    need(CONTENT_RELATION_KINDS.includes(d.kind),`未知关系 ${d.kind}`);
    need(text(d.case)&&text(d.context)&&text(doc.body),'案例、环境和正文必须明确');
    need(d.witness&&text(d.witness.type)&&text(d.witness.statement),'缺少结构见证或候选依据');
    allowed(d.witness,['type','statement','mapping','differences']);
    need(['DEF','PROOF','REF','FINITE','ILLUSTRATION','NOT-CLAIMED'].includes(d.evidence?.status)&&text(d.evidence?.source),'缺少证据状态与来源');
    allowed(d.evidence,['status','source','registrationId']);
    const from=resolve(d.from,d.layer),to=resolve(d.to,d.layer),premises=(d.premises??[]).map(r=>resolve(r,'M'));
    if(d.kind==='deduction'){
      need(d.layer==='M'&&premises.length>0,'推导须登记联合前提');
      for(const r of [from,to,...premises])need(r.anchor!=='$'&&objects.get(r.id)?.declarations.find(a=>a.id===r.anchor)?.type==='o','推导端点和前提必须是命题声明');
    }
    if(d.kind==='hardPrereq'){
      need(d.layer==='L'&&text(d.routeId),'硬先修须绑定公开阅读契约');
      const route=nodes.get(to.id)?.routes?.find(a=>a.id===d.routeId);
      need(route&&route.inputs.some(r=>r.id===from.id),'硬先修不在所指路线输入中');
    }
    if(d.kind==='scaling'){
      need(['hard','soft'].includes(d.strength),'放缩须声明 hard/soft');
      need(d.direction?.special===from.id&&d.direction?.general===to.id,'放缩从特殊端指向一般端');
      if(d.strength==='hard')need(d.layer==='M'&&['class-inclusion','forgetful','restriction','operator-realization'].includes(d.witness.type),'硬放缩须有指定数学见证');
      else need(d.layer==='L','软放缩属于公共教学描述');
    }
    if(['softPrereq','analogy'].includes(d.kind))need(d.layer==='L','认知候选属于 L');
    if(d.kind==='duality')need(d.layer==='M'&&d.witness.type==='linear-dual','本版对偶只认证明确的线性对偶构造');
    const semantic={...d,from,to,premises};
    return {...semantic,body:doc.body,path:doc.path,documentHash:doc.documentHash,relationHash:hash({...semantic,...(d.layer==='L'?{body:doc.body}:{})}),structuralStatus:'valid',proofStatus:'not-checked'};
  }).sort((a,b)=>a.id.localeCompare(b.id,'en'));
}
