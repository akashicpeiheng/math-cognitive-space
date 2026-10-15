import { useId, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useApi, formatError } from '../api';
import { useI18n } from '../i18n';
import { useLabels } from '../i18n/useLabels';
import { defaultField, deriveFieldGuide, type FieldGuide, type FieldGuidesResponse } from '../field-guide';
import { edgeAnchor, NODE_H, NODE_W, type NetworkEdge } from '../network';
import { edgeVisual, relationKindLabel, contractModeLabel } from '../relation-visual';
import type { LearningData } from '../useLearningData';
import { Markdown } from './Markdown';

const COPY={
 loading:{zh:'正在载入学科导读…',en:'Loading field guides…'},
 retry:{zh:'重试导读',en:'Retry guides'},object:{zh:'研究对象',en:'What it studies'},
 why:{zh:'为什么研究',en:'Why study it'},questions:{zh:'推动理论的问题',en:'Questions driving the theory'},
 growth:{zh:'发展线与参考资料',en:'Growth and references'},entry:{zh:'从哪里开始',en:'Where to begin'},
 mistakes:{zh:'常见误解',en:'Common misconceptions'},network:{zh:'核心节点网络',en:'Core node network'},
 join:{zh:'加入兴趣',en:'Add interest'},remove:{zh:'移出兴趣',en:'Remove interest'},
 hint:{zh:'切换学科只浏览导读；加入兴趣后，学习方案才会参考兴趣顺序。',en:'Switching fields only browses guides. Add an interest to use its order in your plan.'},
 open:{zh:'在完整网络中探索',en:'Explore in the full network'},list:{zh:'选择一个核心节点',en:'Select a core node'},
 reason:{zh:'入选理由',en:'Why this node'},read:{zh:'阅读节点',en:'Read node'},
 goal:{zh:'设为近期主目标',en:'Set as primary goal'},bridge:{zh:'跨学科桥梁',en:'Cross-field bridge'},
 known:{zh:'已确认可用',en:'Confirmed usable'},readState:{zh:'已读，尚未确认',en:'Read, not confirmed'},unread:{zh:'尚未阅读',en:'Not read'},
 boundary:{zh:'这是一份可扩展的入门选择。箭头只来自登记的关系或行动；联合前提须同时满足，单条线不表示充分条件。中心是导读锚点，可在完整网络中重新选择。',en:'This is an expandable introductory selection. Arrows come from registered relations or actions; joint inputs must be satisfied together. One arrow is not a sufficient condition. The center is an editorial anchor, adjustable in the full network.'},
 evidence:{zh:'关系、方向与证据',en:'Relations, directions and evidence'},
 allInputs:{zh:'此行动的全部输入',en:'All inputs of this action'},
 missing:{zh:'本体缺少以下入选节点：',en:'The ontology is missing selected nodes:'},
 selection:{zh:'教学组织 · ILLUSTRATION；定义与证明范围见各节点正文。',en:'Teaching organization · ILLUSTRATION; see individual notes for definitions and proof scopes.'},
};
type Props={learning:LearningData;interests:string[];saving:boolean;onInterest:(field:string)=>void;onGoal:(id:string)=>void};
export function FieldGuideExplorer(props:Props){
 const {pick,locale}=useI18n();
 const labels=useLabels();
 const request=useApi<FieldGuidesResponse>('/field-guides');
 const [params,setParams]=useSearchParams();
 const [browsed,setBrowsed]=useState<{query:string|null;field:string}|null>(null);
 const guides=request.data?.locale===locale?request.data.guides:[];
 const query=params.get('field');
 const active=defaultField(guides,browsed?.query===query?browsed.field:query,props.interests);
 const guide=guides.find(g=>g.id===active);
 const browse=(id:string)=>{
   const next=new URLSearchParams(params);next.set('field',id);setBrowsed({query:id,field:id});setParams(next,{replace:false});
 };
 return <div className="field-guide-explorer">
   <p className="muted">{pick(COPY.hint)}</p>
   <div className="learning-interest-list" aria-label={pick(COPY.questions)}>{guides.map(g=><button key={g.id} type="button" className={'button small '+(active===g.id?'selected':'')} data-field={g.id} aria-pressed={active===g.id} onClick={()=>browse(g.id)}>{labels.tables.disciplines[g.id]??g.title}{props.interests.includes(g.id)?' · '+(props.interests.indexOf(g.id)+1):''}</button>)}</div>
   {request.error?<div role="alert"><p>{formatError(request.error)}</p><button className="button" onClick={request.reload}>{pick(COPY.retry)}</button></div>
     :!guide||!props.learning.graph?<p role="status">{pick(COPY.loading)}</p>
     :<FieldGuideView key={guide.id} guide={guide} {...props}/>}
 </div>;
}
function FieldGuideView({guide,learning,interests,saving,onInterest,onGoal}:Props&{guide:FieldGuide}){
 const {pick,locale,hrefFor}=useI18n();
 const marker=useId().replace(/:/g,'');
 const [question,setQuestion]=useState<string|null>(null);
 const [selected,setSelected]=useState(guide.anchor);
 const view=useMemo(()=>deriveFieldGuide(guide,learning.graph!),[guide,learning.graph]);
 const highlighted=new Set(guide.questions.find(q=>q.id===question)?.nodes??[]);
 const selection=view.nodes.find(n=>n.id===selected);
 const placed=new Map(view.layout.placed.map(n=>[n.id,n]));
 const title=(id:string)=>learning.graph?.nodes.find(n=>n.id===id)?.title??id;
 const edgeText=(edge:NetworkEdge)=>{
   if(edge.source==='relation')return relationKindLabel(edge.kind,locale)+' · '+edge.witnessStatus+(edge.witnessRef?' · '+edge.witnessRef:'')+(edge.scope?' — '+edge.scope:'');
   if(edge.source!=='contract')return '';
   const witness=learning.graph?.actions.find(a=>a.id===edge.actionId)?.witness;
   return contractModeLabel(edge.mode,locale)+' · '+edge.actionTitle+(witness?' · '+witness.status+(witness.ref?' · '+witness.ref:'')+(witness.scope?' — '+witness.scope:''):'');
 };
 const state=(id:string)=>pick(learning.progress?.confirmedNodes.has(id)?COPY.known:learning.progress?.readNodes.has(id)?COPY.readState:COPY.unread);
 return <section className="field-guide" data-guide={guide.id} aria-labelledby={marker+'-title'}>
  <div className="section-heading"><h3 id={marker+'-title'}>{guide.title}</h3><button className="button" data-interest-toggle={guide.id} disabled={saving} onClick={()=>onInterest(guide.id)}>{pick(interests.includes(guide.id)?COPY.remove:COPY.join)}</button></div>
  <div className="field-guide-columns">
   <div className="field-guide-prose">
    <h4>{pick(COPY.object)}</h4><Markdown>{guide.object}</Markdown>
    <h4>{pick(COPY.why)}</h4>{guide.motivations.map((m,i)=><Markdown key={i}>{m}</Markdown>)}
    <h4>{pick(COPY.questions)}</h4>
    <ol className="field-guide-questions">{guide.questions.map(q=><li key={q.id}><button className={'link-button '+(question===q.id?'selected':'')} data-guide-question={q.id} aria-pressed={question===q.id} onClick={()=>setQuestion(question===q.id?null:q.id)}>{q.title}</button><Markdown>{q.explanation}</Markdown></li>)}</ol>
    <h4>{pick(COPY.entry)}</h4><Markdown>{guide.entry}</Markdown>
    <details><summary>{pick(COPY.growth)}</summary><Markdown>{guide.growth}</Markdown><h4>{pick(COPY.mistakes)}</h4>{guide.misconceptions.map((m,i)=><Markdown key={i}>{m}</Markdown>)}<Markdown>{guide.review}</Markdown><ul>{guide.sources.map(s=><li key={s.id}><a href={s.url.startsWith('/')?hrefFor(s.url):s.url}>{s.title}</a><p className="muted">{s.location}</p></li>)}</ul><p className="muted">{pick(COPY.selection)}</p></details>
   </div>
   <div className="field-guide-network">
    <h4>{pick(COPY.network)}</h4><p className="muted">{pick(COPY.boundary)}</p>
    {view.missing.length>0&&<p role="alert">{pick(COPY.missing)} {view.missing.join(', ')}</p>}
    <svg className="field-guide-canvas" viewBox={'0 0 '+view.layout.width+' '+view.layout.height} role="img" aria-label={guide.title+' · '+pick(COPY.network)}>
     <defs><marker id={marker} markerWidth="9" markerHeight="9" refX="8" refY="4" orient="auto" markerUnits="userSpaceOnUse"><path d="M0,0 L0,8 L8,4 z" fill="context-stroke"/></marker></defs>
     {view.merged.map(({edge,merged})=>{
       const a=placed.get(edge.from),b=placed.get(edge.to);if(!a||!b)return null;
       const coords=edgeAnchor(a,b);
       const v=edgeVisual(edge.source,edge.source==='relation'?edge.kind:null,edge.source==='relation'?edge.witnessStatus:null,'#6d5c91',edge.source==='contract'?edge.mode:null);
       return <line key={edge.id} {...coords} stroke={v.color} strokeWidth={v.width} strokeDasharray={v.dash} opacity={v.opacity} markerEnd={'url(#'+marker+')'}><title>{[edge,...merged].map(e=>title(e.from)+' → '+title(e.to)+': '+edgeText(e)).join('\n')}</title></line>;
     })}
     {view.layout.placed.map(node=><g key={node.id} data-guide-node={node.id} className={'field-guide-node '+(selected===node.id?'selected ':'')+(highlighted.has(node.id)?'highlighted':'')} transform={'translate('+node.x+','+node.y+')'} role="button" tabIndex={0} aria-label={node.title+' · '+state(node.id)} aria-pressed={selected===node.id} onClick={()=>setSelected(node.id)} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();setSelected(node.id);}}}><rect width={NODE_W} height={NODE_H} rx="12"/><foreignObject x="8" y="5" width={NODE_W-16} height={NODE_H-10}><div className="field-guide-svg-label">{node.title}</div></foreignObject><title>{node.title+' · '+state(node.id)}</title></g>)}
    </svg>
    <div className="field-guide-node-list" aria-label={pick(COPY.list)}>{view.nodes.map(n=><button className={'button small '+(selected===n.id?'selected ':'')+(highlighted.has(n.id)?'highlighted':'')} key={n.id} data-guide-list-node={n.id} disabled={!n.node} aria-pressed={selected===n.id} onClick={()=>setSelected(n.id)}>{n.node?.title??n.id}</button>)}</div>
    {selection?.node&&<article className="field-guide-selection" aria-live="polite" data-selected-node={selection.id}><h4>{selection.node.title}</h4><span className="badge">{state(selection.id)}</span>{selection.bridge&&<span className="badge">{pick(COPY.bridge)}</span>}<Markdown>{selection.node.summary}</Markdown><p><strong>{pick(COPY.reason)}：</strong>{selection.reason}</p><div className="field-guide-actions"><Link className="button" to={hrefFor('/nodes/'+encodeURIComponent(selection.id))}>{pick(COPY.read)}</Link><button className="button primary" disabled={saving} onClick={()=>onGoal(selection.id)}>{pick(COPY.goal)}</button></div></article>}
    <Link className="button field-guide-full-network" to={hrefFor('/network?nodes='+encodeURIComponent(guide.core.map(n=>n.id).join(',')))}>{pick(COPY.open)}</Link>
    <details className="field-guide-evidence"><summary>{pick(COPY.evidence)+' · '+view.edges.length}</summary><ul>{view.edges.map(edge=><li key={edge.id}><strong>{title(edge.from)+' → '+title(edge.to)}</strong><p className={locale==='en'&&/[\u3400-\u9fff]/.test(edgeText(edge))?'i18n-pending':undefined}>{edgeText(edge)}</p>{edge.source==='contract'&&<p>{pick(COPY.allInputs)}: {learning.graph?.actions.find(a=>a.id===edge.actionId)?.inputs.map(i=>title(i.node)+' ['+i.accepts.join(' / ')+']'+(i.condition?' ('+i.condition+')':'')).join(locale==='en'?', ':'、')}</p>}</li>)}</ul></details>
   </div>
  </div>
 </section>;
}
