/** M/L Markdown protocol. Shared by the server, CLI and desktop plugin.
 * Parsing and type checking reuse the existing MCS kernel bridge. No learner data is read.
 */
import { fromMarkdown } from 'mdast-util-from-markdown';
import { createHash } from 'node:crypto';
import { digest } from '../core/formal/codec.mjs';
import { parseTerm, parseFormula, parseType, formulaToTerm, typeToString, typeEquals } from '../core/formal/language.mjs';
import { inferTerm, objectFv } from '../core/formal/terms.mjs';
import { RELATION_SCHEMA,compileContentRelations } from './content-relations.mjs';

export const OBJECT_SCHEMA = 'mcs-object/1';
export const NODE_SCHEMA = 'mcs-node/1';
export const GRAMMAR = 'mcs-object-grammar/1';
export const OBJECT_SCALES = Object.freeze(['atom', 'molecule', 'unit', 'topic', 'subdiscipline']);
export const SCALE_TITLES = Object.freeze({atom:'原子',molecule:'分子',unit:'单元',topic:'话题',subdiscipline:'子学科'});
const hash = value => `sha256:${digest(value)}`;
const fileHash = text => `sha256:${createHash('sha256').update(text).digest('hex')}`;
const plain = x => x !== null && typeof x === 'object' && !Array.isArray(x);
const sorted = xs => [...xs].sort((a,b)=>a.id.localeCompare(b.id,'en'));
export class ContentDocumentError extends Error {
  constructor(code,message,path='') { super(`${path ? `${path}: ` : ''}${message}`); this.name='ContentDocumentError'; this.code=code; this.path=path; }
}
function need(ok,code,message,path='') { if(!ok) throw new ContentDocumentError(code,message,path); }
function fields(value,allowed,label) {
  need(plain(value),'shape',`${label} 必须是对象`);
  for(const key of Object.keys(value)) need(allowed.includes(key),'unknown-field',`${label}.${key} 未定义`);
}
function string(value,label) { need(typeof value==='string'&&value.trim().length>0,'shape',`${label} 必须是非空字符串`); return value; }
function list(value,label) { need(Array.isArray(value),'shape',`${label} 必须是数组`); return value; }
function unique(values,label) { need(new Set(values).size===values.length,'duplicate',`${label} 重复`); }
function identifier(value,label) { string(value,label); need(/^[A-Za-z][A-Za-z0-9_.:-]*$/.test(value),'identifier',`${label} 标识无效`); return value; }

export function parseContentDocument(markdown,path='') {
  string(markdown,'Markdown'); need(Buffer.byteLength(markdown)<=2*1024*1024,'size','文档超过 2MB',path);
  const tree=fromMarkdown(markdown), blocks=[];
  const walk=(node,parent)=>{ if(node.type==='code'&&['mcs-object','mcs-node','mcs-relation'].includes(node.lang)) blocks.push({node,parent}); for(const child of node.children??[])walk(child,node); };
  walk(tree,null);
  need(blocks.length===1,'interface-count','必须恰有一个 mcs-object 或 mcs-node 接口代码块',path);
  const {node,parent}=blocks[0]; need(parent===tree,'nested-interface','接口代码块必须位于正文顶层',path);
  let data; try {data=JSON.parse(node.value);} catch {throw new ContentDocumentError('json','接口不是合法 JSON',path);}
  need(plain(data),'shape','接口必须是 JSON 对象',path);
  const kind={'mcs-object':'object','mcs-node':'node','mcs-relation':'relation'}[node.lang];
  need(data.schema===({object:OBJECT_SCHEMA,node:NODE_SCHEMA,relation:RELATION_SCHEMA}[kind]),'unsupported-version','不支持的文档协议版本',path);
  identifier(data.id,'id'); string(data.version,'version'); string(data.title,'title');
  const body=(markdown.slice(0,node.position.start.offset)+markdown.slice(node.position.end.offset)).trim();
  return {kind,data,body,path,documentHash:fileHash(markdown)};
}

export function formatContentDocument(data,body) {
  const tag=data.schema===OBJECT_SCHEMA?'mcs-object':data.schema===RELATION_SCHEMA?'mcs-relation':'mcs-node';
  // Four backticks keep literal triple-backtick sequences in JSON strings inside the block.
  return `\`\`\`\`${tag}\n${JSON.stringify(data,null,2)}\n\`\`\`\`\n\n${body.trim()}\n`;
}

function refShape(ref) {
  fields(ref,['id','version','anchor','formalHash'],'ObjectRef'); identifier(ref.id,'ref.id'); string(ref.version,'ref.version');
  string(ref.anchor,'ref.anchor'); need(ref.anchor==='$'||/^[A-Za-z][A-Za-z0-9_.:-]*$/.test(ref.anchor),'anchor','声明锚点无效');
  need(typeof ref.formalHash==='string','shape','引用必须登记 formalHash');
}
const refKey=r=>`${r.id}@${r.version}#${r.anchor}`;
function refs(value,label) { const out=list(value??[],label); out.forEach(refShape); unique(out.map(refKey),label); return out; }

/** Count only HOL App/Abs nodes, after syntax sugar and transparent definitions.
 * No beta reduction, conjunction reordering or semantic equivalence is used.
 */
export function constructionCount(term) {
  if(term[0]==='app')return 1+constructionCount(term[1])+constructionCount(term[2]);
  if(term[0]==='lam')return 1+constructionCount(term[2]);
  need(['c','v','b','logic'].includes(term[0]),'unsupported','未支持的对象项构造'); return 0;
}

function formalContext(raw) {
  fields(raw,['signature','bases','constants'],'context'); string(raw.signature,'context.signature');
  const bases=list(raw.bases,'context.bases').map(x=>identifier(x,'base')); unique(bases,'基本类型'); need(bases.includes('o'),'type','基本类型必须包含 o');
  const constants=Object.create(null), declarations=list(raw.constants,'context.constants');
  unique(declarations.map(x=>x.name),'符号');
  const checkType=t=>{ const ty=parseType(string(t,'type')); const visit=x=>{if(Array.isArray(x)){visit(x[1]);visit(x[2]);}else need(bases.includes(x),'unknown-type',`未声明类型 ${x}`);};visit(ty);return ty; };
  for(const item of declarations) {
    fields(item,['name','type','background'],'constant'); identifier(item.name,'constant.name'); string(item.background,'constant.background');
    constants[item.name]=checkType(item.type);
  }
  return {bases,constants,strict:true,checkType,canonical:{signature:raw.signature,bases:[...bases].sort(),constants:declarations.map(d=>({...d,type:typeToString(constants[d.name])})).sort((a,b)=>a.name.localeCompare(b.name,'en'))}};
}

function expressions(data) {
  const ctx=formalContext(data.context), defs=new Map(), definitions=list(data.definitions??[],'definitions');
  const checkBoundTypes=t=>{
    if(t[0]==='lam'){ctx.checkType(typeToString(t[1]));checkBoundTypes(t[2]);}
    else if(t[0]==='app'){checkBoundTypes(t[1]);checkBoundTypes(t[2]);}
    else if(t[0]==='v')ctx.checkType(typeToString(t[2]));
    else if(t[0]==='logic'&&t[2])ctx.checkType(typeToString(t[2]));
  };
  unique(definitions.map(d=>d.name),'透明定义');
  for(const d of definitions){fields(d,['name','type','source'],'definition');identifier(d.name,'definition.name');need(!Object.hasOwn(ctx.constants,d.name),'duplicate','透明定义与不透明符号冲突');ctx.constants[d.name]=ctx.checkType(d.type);defs.set(d.name,d);}
  const parsedDefs=new Map();
  for(const d of definitions) {
    const term=parseTerm(string(d.source,'definition.source'),{...ctx,expected:ctx.constants[d.name]});
    checkBoundTypes(term);
    need(Object.keys(objectFv(term)).length===0,'free-variable','透明定义必须是闭项');parsedDefs.set(d.name,term);
  }
  const expanded=new Map(),active=new Set(); let expansionSteps=0;
  const expand=t=>{
    need(++expansionSteps<=100000,'resource-exhausted','透明展开超过有限预算');
    if(t[0]==='c'&&defs.has(t[1])) {
      const name=t[1];need(!active.has(name),'cyclic-definition',`循环定义 ${name}`);
      if(!expanded.has(name)){active.add(name);expanded.set(name,expand(parsedDefs.get(name)));active.delete(name);}return expanded.get(name);
    }
    if(t[0]==='app')return ['app',expand(t[1]),expand(t[2])];
    if(t[0]==='lam')return ['lam',t[1],expand(t[2])];
    return t;
  };
  for(const name of defs.keys())expand(['c',name]);
  const assumptions=list(data.assumptions??[],'assumptions').map(source=>expand(formulaToTerm(parseFormula(string(source,'assumption'),ctx),ctx)));
  for(const term of assumptions){checkBoundTypes(term);need(Object.keys(objectFv(term)).length===0,'free-variable','假设含未声明自由变量');}
  const normalizedDefs=[...expanded].sort(([a],[b])=>a.localeCompare(b,'en')).map(([name,term])=>({name,type:typeToString(ctx.constants[name]),term}));
  const declarations=list(data.declarations??[],'declarations').map(d=>{
    fields(d,['id','kind','type','source','status'],'declaration'); identifier(d.id,'declaration.id');
    need(['term','formula'].includes(d.kind),'unsupported','声明 kind 必须是 term/formula');
    need(['DEF','PROOF','REF','FINITE','ILLUSTRATION','NOT-CLAIMED'].includes(d.status),'evidence','声明缺少证据标签');
    const tree=d.kind==='formula'?formulaToTerm(parseFormula(string(d.source,'source'),ctx),ctx):parseTerm(string(d.source,'source'),{...ctx,expected:ctx.checkType(d.type)});
    const term=expand(tree);need(Object.keys(objectFv(term)).length===0,'free-variable','声明含未登记自由变量；请使用明确绑定或签名参数');
    checkBoundTypes(term);
    const type=typeToString(inferTerm(term,ctx));
    if(d.kind==='formula'){
      need(type==='o','type','公式必须是 o 型');
      if(d.type!==undefined)need(typeEquals(ctx.checkType(d.type),'o'),'type','公式声明类型必须是 o');
    }
    const formalHash=hash({language:data.language,grammar:data.grammar,context:ctx.canonical,definitions:normalizedDefs,assumptions,term,type});
    return {...d,type,canonical:term,constructionCount:constructionCount(term),formalHash};
  });unique(declarations.map(d=>d.id),'声明锚点');
  return {context:ctx.canonical,definitions:normalizedDefs,assumptions,declarations};
}

/** Compile a complete finite library. checkPins:false is only for the explicit sealing CLI;
 * it still checks types, versions, anchors and cycles. Runtime readers always check pins.
 */
export function compileContentLibrary(inputs,{checkPins=true}={}) {
  const docs=inputs.map(d=>typeof d.markdown==='string'?parseContentDocument(d.markdown,d.path):d);
  for(const doc of docs){
    need(['object','node','relation'].includes(doc.kind),'shape','未知文档种类');
    need(doc.data?.schema===({object:OBJECT_SCHEMA,node:NODE_SCHEMA,relation:RELATION_SCHEMA}[doc.kind]),'unsupported-version','不支持的文档协议版本',doc.path);
    identifier(doc.data.id,'id');string(doc.data.version,'version');string(doc.data.title,'title');
  }
  unique(docs.map(d=>d.data.id),'文档 ID');
  const sources=new Map(docs.map(d=>[d.data.id,d])), records=new Map(), active=new Set();
  function compile(id) {
    if(records.has(id))return records.get(id);
    const doc=sources.get(id); need(doc?.kind==='object','unknown-object',`数学对象不存在：${id}`);
    need(!active.has(id),'cyclic-import',`对象依赖形成环：${[...active,id].join(' → ')}`);active.add(id);
    const d=doc.data;
    fields(d,['schema','id','version','title','language','grammar','scale','context','definitions','assumptions','declarations','references','members','imports','exports','links','lean'],'object');
    need(d.language==='mcs-formal/1'&&d.grammar===GRAMMAR,'unsupported-language','语言或构造语法版本不支持');
    need(OBJECT_SCALES.includes(d.scale),'scale','无效数学尺度；学习节点不能作为尺度');
    const normalized=expressions(d), dependencies=[];
    function resolve(ref) {
      refShape(ref);
      const target=ref.id===d.id&&ref.anchor!=='$'?{...d,declarations:normalized.declarations}:compile(ref.id);
      need(target.version===ref.version,'stale-reference',`引用版本失效：${refKey(ref)}`);
      const anchor=ref.anchor==='$'?target:target.declarations.find(x=>x.id===ref.anchor);need(anchor,'unknown-anchor',`声明不存在：${refKey(ref)}`);
      if(checkPins)need(ref.formalHash===anchor.formalHash,'stale-reference',`形式摘要失效：${refKey(ref)}`);
      const resolved={...ref,formalHash:anchor.formalHash};dependencies.push(resolved);return {target,anchor,ref:resolved};
    }
    const references=refs(d.references,'references').map(r=>resolve(r).ref);
    const imports=refs(d.imports,'imports').map(r=>{const x=resolve(r);need(d.scale==='unit'&&x.target.scale==='unit'&&r.anchor==='$','member-type','只有单元可导入单元');return x.ref;});
    const members=refs(d.members,'members').map(r=>{
      const x=resolve(r),allowed={unit:['atom','molecule'],topic:['unit'],subdiscipline:['topic']}[d.scale]??[];
      need(allowed.includes(x.target.scale)&&r.anchor==='$','member-type',`${d.scale} 不允许成员 ${x.target.scale}`);return x.ref;
    });
    const leaf=['atom','molecule'].includes(d.scale);
    if(leaf){need(normalized.declarations.length===1,'scale','原子/分子文档必须恰有一个表达声明');need((normalized.declarations[0].constructionCount===0)===(d.scale==='atom'),'scale','尺度标签与规范构造树不一致');}
    else need(members.length>0||d.scale==='unit'&&normalized.declarations.length>0,'empty-module','形式组织必须有成员或单元内部声明');
    // A module imports a common signature; conflicting meanings are not silently unified.
    const contexts=[normalized.context,...[...members,...imports].map(r=>compile(r.id).normalizedContext)];
    const symbols=new Map();
    for(const c of contexts)for(const symbol of c.constants){const prior=symbols.get(symbol.name);need(!prior||prior.type===symbol.type&&prior.background===symbol.background&&prior.signature===c.signature,'interface-conflict',`模块符号冲突：${symbol.name}`);symbols.set(symbol.name,{...symbol,signature:c.signature});}
    const exports=list(d.exports??[],'exports').map(e=>{
      fields(e,['name','ref','type'],'export');identifier(e.name,'export.name');const x=resolve(e.ref);
      need(d.scale==='unit'&&(e.ref.id===d.id||[...members,...imports].some(m=>m.id===e.ref.id)),'export-scope','导出必须来自单元声明、成员或导入');
      need(e.ref.anchor!=='$'&&typeEquals(parseType(e.type),parseType(x.anchor.type)),'type','导出类型不匹配');return {...e,ref:x.ref};
    });unique(exports.map(e=>e.name),'导出符号');
    const links=list(d.links??[],'links').map(link=>{
      fields(link,['id','kind','from','to','symbols','obligation','status'],'link');identifier(link.id,'link.id');
      need(['reference','interpretation'].includes(link.kind)&&link.status==='pending','link-status','接口关系首版只登记待审义务，不自动认证');
      const from=resolve(link.from),to=resolve(link.to);
      need(members.some(m=>m.id===from.target.id)&&members.some(m=>m.id===to.target.id),'link-scope','接口关系两端必须是本结构成员');
      const mappings=list(link.symbols??[],'symbols');
      for(const map of mappings){fields(map,['from','to'],'symbol mapping');const a=from.target.exports.find(e=>e.name===map.from),b=to.target.exports.find(e=>e.name===map.to);need(a&&b&&typeEquals(parseType(a.type),parseType(b.type)),'type','符号映射必须连接同类型导出');}
      const obligation=link.obligation?resolve(link.obligation):null;if(obligation)need(obligation.anchor.type==='o','type','接口义务必须是公式');
      return {...link,from:from.ref,to:to.ref,...(obligation?{obligation:obligation.ref}:{})};
    });unique(links.map(l=>l.id),'接口关系');
    const lean=list(d.lean??[],'lean').map(binding=>{
      fields(binding,['anchor','registrationId','target','mapping','review'],'LeanBinding');
      need(normalized.declarations.some(x=>x.id===binding.anchor),'unknown-anchor','Lean 绑定必须指向本对象的声明');
      identifier(binding.registrationId,'registrationId');string(binding.target,'Lean target');string(binding.mapping,'Lean mapping');
      need(binding.review==='pending','review','首版对应审阅保持 pending；不能由文档自行宣布通过');return binding;
    });
    const semantic={schema:OBJECT_SCHEMA,id:d.id,version:d.version,language:d.language,grammar:d.grammar,scale:d.scale,context:normalized.context,definitions:normalized.definitions,assumptions:normalized.assumptions,declarations:normalized.declarations.map(x=>({id:x.id,kind:x.kind,type:x.type,canonical:x.canonical,status:x.status})),references,imports,members,exports,links};
    const record={id:d.id,version:d.version,title:d.title,kind:'object',scale:d.scale,language:d.language,grammar:d.grammar,normalizedContext:normalized.context,declarations:normalized.declarations,assumptions:d.assumptions??[],references,imports,members,exports,links,lean,formalHash:hash(semantic),bindingHash:hash(lean),documentHash:doc.documentHash,path:doc.path,body:doc.body,structuralStatus:'valid',proofStatus:'not-checked'};
    records.set(id,record);active.delete(id);return record;
  }
  for(const doc of docs.filter(x=>x.kind==='object'))compile(doc.data.id);
  const nodes=docs.filter(x=>x.kind==='node').map(doc=>{
    string(doc.body,'阅读正文');
    const d=doc.data;fields(d,['schema','id','version','title','goals','objects','prerequisites','case','routes'],'node');
    const goals=list(d.goals,'goals').map(x=>string(x,'goal'));need(goals.length>0,'goal','阅读节点至少声明一个目标');
    list(d.objects,'objects');
    const objects=refs(d.objects,'objects').map(r=>{
      const object=records.get(r.id);need(object,'unknown-object',`数学对象不存在：${r.id}`);need(object.version===r.version,'stale-reference',`对象版本失效：${refKey(r)}`);
      const anchor=r.anchor==='$'?object:object.declarations.find(x=>x.id===r.anchor);need(anchor,'unknown-anchor',`声明不存在：${refKey(r)}`);
      if(checkPins)need(r.formalHash===anchor.formalHash,'stale-reference',`形式摘要失效：${refKey(r)}`);return {...r,formalHash:anchor.formalHash};
    });
    const prerequisites=list(d.prerequisites??[],'prerequisites').map(r=>{fields(r,['id','version'],'prerequisite');const target=sources.get(r.id);need(target?.kind==='node'&&target.data.version===r.version,'node-reference','学习先修必须引用准确版本的阅读节点');return r;});
    const routes=d.routes?.map(route=>{
      fields(route,['id','title','inputs'],'route');identifier(route.id,'route.id');string(route.title,'route.title');
      const inputs=list(route.inputs,'route.inputs').map(r=>{fields(r,['id','version'],'route input');const target=sources.get(r.id);need(target?.kind==='node'&&target.data.version===r.version,'node-reference','路线输入须引用准确阅读版本');need(r.id!==d.id,'route-cycle','路线不得直接依赖自己');return r;});
      unique(inputs.map(r=>r.id),'路线输入');return {...route,inputs};
    });
    if(routes)unique(routes.map(r=>r.id),'路线');
    const extra={...(d.case?{case:string(d.case,'case')}:{}),...(routes?{routes}:{})};
    return {id:d.id,version:d.version,title:d.title,kind:'node',goals,objects,prerequisites,...extra,body:doc.body,path:doc.path,documentHash:doc.documentHash,nodeHash:hash({schema:NODE_SCHEMA,id:d.id,version:d.version,title:d.title,goals,objects,prerequisites,...extra,body:doc.body})};
  });
  const objects=sorted([...records.values()]);
  const readingMap=new Map(nodes.map(n=>[n.id,n])),doneRoutes=new Set(),activeRoutes=new Set();
  const visitRoute=id=>{need(!activeRoutes.has(id),'route-cycle',`公开引入路线形成定义循环：${id}`);if(doneRoutes.has(id))return;activeRoutes.add(id);for(const route of readingMap.get(id)?.routes??[])for(const input of route.inputs)visitRoute(input.id);activeRoutes.delete(id);doneRoutes.add(id);};
  for(const n of nodes)visitRoute(n.id);
  const relations=compileContentRelations(docs.filter(d=>d.kind==='relation'),{objects,nodes},{checkPins});
  const math=relations.filter(r=>r.layer==='M'),reading=relations.filter(r=>r.layer==='L');
  const objectInput=objects.map(o=>({id:o.id,version:o.version,formalHash:o.formalHash})),nodeInput=sorted(nodes).map(n=>({id:n.id,version:n.version,nodeHash:n.nodeHash}));
  return {schema:'mcs-content-library/1',objectVersion:hash(math.length?{objects:objectInput,relations:math.map(r=>r.relationHash)}:objectInput),learningVersion:hash(reading.length?{nodes:nodeInput,relations:reading.map(r=>r.relationHash)}:nodeInput),objects,nodes:sorted(nodes),relations,scale:{schema:'mcs-object-scale/1',levels:OBJECT_SCALES.map((id,sigma)=>({id,sigma,title:SCALE_TITLES[id]})),members:objects.flatMap(o=>o.members.map(r=>({parent:o.id,child:r.id})))}};
}

export function objectReference(library,id,anchor='$') {
  const object=library.objects.find(o=>o.id===id);need(object,'unknown-object',`数学对象不存在：${id}`);
  const target=anchor==='$'?object:object.declarations.find(d=>d.id===anchor);need(target,'unknown-anchor',`声明不存在：${anchor}`);
  return {id,version:object.version,anchor,formalHash:target.formalHash};
}
