import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useApi,formatError } from '../api';
import { useI18n } from '../i18n';
import { Markdown } from '../components/Markdown';
import { LeanEvidenceCards } from '../components/LeanEvidence';
import type { MathObjectRecord,LearningNodeDocument,LeanBinding } from '../../../shared/content-documents.mjs';
import type { EvidenceRecord } from '../types';
import type { MasterView } from '../../../shared/master-view.mjs';
import { MasterContent } from '../components/MasterView';
import { useMasterMode } from '../master-mode';
import {ContentCaseEntry,ContentRelationDetails} from '../components/ContentCaseControls';
import {ContentLearning} from '../components/ContentLearning';
import {caseNetworkHref} from '../content-case';
import {networkReturnHref} from '../network-return';

const scales=['atom','molecule','unit','topic','subdiscipline'] as const;
const labels={zh:{atom:'原子',molecule:'分子',unit:'单元',topic:'话题',subdiscipline:'子学科'},en:{atom:'Atom',molecule:'Molecule',unit:'Unit',topic:'Topic',subdiscipline:'Subdiscipline'}};
interface ObjectsResponse {objects:Array<Pick<MathObjectRecord,'id'|'version'|'title'|'scale'|'formalHash'>&{master?:MasterView}>;objectVersion:string;learningVersion:string}
interface NodesResponse {nodes:Array<Pick<LearningNodeDocument,'id'|'version'|'title'|'goals'|'nodeHash'>&{master?:MasterView}>}
interface ObjectDetail {object:MathObjectRecord;master?:MasterView;readings:LearningNodeDocument[];lean:Array<LeanBinding&{verification:{evidenceId:string}|null}>;correspondence:Array<{nodeId:string;target:string;status:'pending'|'reviewed'|'stale'}>;relations:import('../../../shared/content-documents.mjs').ContentRelation[]}
interface NodeDetail {node:LearningNodeDocument;master?:MasterView;objects:MathObjectRecord[];objectVersion:string;learningVersion:string}
const objectHref=(id:string)=>`/objects/${encodeURIComponent(id)}`;
const nodeHref=(id:string)=>`/learning-nodes/${encodeURIComponent(id)}`;

function McsReturnLink(){
  const [params]=useSearchParams(),{pick,hrefFor}=useI18n();
  return params.get('from')==='mcs'?<p><Link to={hrefFor('/mcs')}>{pick({zh:'← 返回 MCS 视图',en:'← Return to MCS view'})}</Link></p>:null;
}

export function ContentLibraryPage() {
  const {isMaster}=useMasterMode();
  const objects=useApi<ObjectsResponse>('/ontology/objects'),nodes=useApi<NodesResponse>('/learning/nodes');
  const {pick,hrefFor}=useI18n(),names=pick(labels);
  const error=objects.error??nodes.error;
  return <main className="page content-library"><h1>{pick({zh:'形式对象与阅读节点',en:'Formal objects and reading nodes'})}</h1>
    <ContentCaseEntry/>
    {!isMaster&&<p>{pick({zh:'对象固定数学内容，节点组织阅读与理解。本试点包括右单位律、左乘映射与单射性；正文目前为中文。',en:'Objects fix mathematical content; nodes organize reading. This pilot covers right identities, left multiplication and injectivity. The pilot text is currently in Chinese.'})}</p>}
    {error?<p role="alert">{formatError(error)}</p>:null}
    {objects.loading||nodes.loading?<p role="status">{pick({zh:'正在读取文档…',en:'Loading documents…'})}</p>:null}
    {objects.data?<section className="panel"><h2>{pick({zh:'M · 五级形式结构',en:'M · Five formal scales'})}</h2>
      {!isMaster&&<p>{pick({zh:'尺度只检查形式结构；成员归属不表示推导或学习先修。',en:'Scales concern formal structure. Membership does not establish derivation or learning prerequisites.'})}</p>}
      {scales.map(scale=><section key={scale}><h3>{names[scale]}</h3><ul>{objects.data!.objects.filter(o=>o.scale===scale).map(o=><li key={o.id}><Link to={hrefFor(objectHref(o.id))}>{o.title}</Link>{isMaster&&o.master?<MasterContent view={o.master} compact/>:null}</li>)}</ul></section>)}
    </section>:null}
    {nodes.data?<section className="panel"><h2>{pick({zh:'L · 阅读节点',en:'L · Reading nodes'})}</h2><ul>{nodes.data.nodes.map(n=><li key={n.id}><Link to={hrefFor(nodeHref(n.id))}>{n.title}</Link>{isMaster?(n.master?<MasterContent view={n.master} compact/>:null):<p>{n.goals.join('；')}</p>}</li>)}</ul></section>:null}
    <p><Link to={hrefFor('/network')}>{pick({zh:'打开原有知识网络（旧版内容组织）',en:'Open the existing network (legacy content organization)'})}</Link></p>
  </main>;
}

export function MathObjectPage() {
  const {isMaster}=useMasterMode();
  const {objectId}=useParams(),{pick,hrefFor}=useI18n();
  const result=useApi<ObjectDetail>(objectId?`/ontology/objects/${encodeURIComponent(objectId)}`:null);
  if(result.error)return <main className="page"><p role="alert">{formatError(result.error)}</p></main>;
  if(result.loading||!result.data)return <main className="page" role="status">{pick({zh:'正在读取对象…',en:'Loading object…'})}</main>;
  const {object:o,readings,lean,correspondence}=result.data;
  if(isMaster)return <main className="page content-library master-node-page" data-reading-mode="master">
    <McsReturnLink/>
    <Link to={hrefFor('/objects')}>{pick({zh:'← 形式对象与阅读节点',en:'← Objects and reading nodes'})}</Link><h1>{o.title}</h1>
    <p className="master-page-meta"><code>{o.id}</code> · {o.version} · {pick(labels)[o.scale]} · {pick({zh:'结构已检查；证据状态按声明登记',en:'Structure checked; evidence status as registered per declaration'})}</p>
    {result.data.master?<MasterContent view={result.data.master}/>:null}
    {o.id.startsWith('obj:tdg:')&&<><Link to={hrefFor(caseNetworkHref())}>{pick({zh:'案例网络',en:'Case network'})}</Link><ul>{readings.map(n=><li key={n.id}><Link to={hrefFor(nodeHref(n.id))}>{n.title}</Link></li>)}</ul></>}
  </main>;
  const evidence:EvidenceRecord[]=lean.filter(b=>b.verification).map(b=>({id:b.verification!.evidenceId,backend:'lean4',leanRegistration:b.registrationId,kind:'machine-certificate',status:'PROOF',checkStatus:'not_run',title:o.title,scope:b.mapping,nodes:[],certificate:null,checker:null,checkerVerified:false,openAssumptions:[],obligations:[],reference:null}));
  return <main className="page content-library"><Link to={hrefFor('/objects')}>{pick({zh:'← 形式对象与阅读节点',en:'← Objects and reading nodes'})}</Link>
    <McsReturnLink/>
    <h1>{o.title}</h1><p>{pick(labels)[o.scale]} · {pick({zh:'结构检查通过；数学证据单独查看',en:'Structure checked; mathematical evidence is reported separately'})}</p>
    {o.id.startsWith('obj:tdg:')&&<p><Link to={hrefFor(networkReturnHref(o.id,'zh')??caseNetworkHref())}>{pick({zh:'返回案例网络',en:'Return to the case network'})}</Link></p>}
    <section className="panel"><h2>{pick({zh:'精确内容',en:'Formal content'})}</h2>
      {o.declarations.map(d=><div key={d.id} id={d.id}><h3>{d.id} · {d.type}</h3><pre style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere'}}><code>{d.source}</code></pre><p>{d.status} · {pick({zh:'构造次数',en:'Construction count'})} {d.constructionCount}</p></div>)}
      <details><summary>{pick({zh:'背景、假设与版本',en:'Context, assumptions and version'})}</summary><pre style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere'}}>{JSON.stringify({id:o.id,version:o.version,context:o.normalizedContext,assumptions:o.assumptions,formalHash:o.formalHash},null,2)}</pre></details>
      {o.exports.length?<><h3>{pick({zh:'导出接口',en:'Exports'})}</h3><ul>{o.exports.map(e=><li key={e.name}><Link to={hrefFor(`${objectHref(e.ref.id)}#${e.ref.anchor}`)}>{e.name}: {e.type}</Link></li>)}</ul></>:null}
      {o.members.length?<><h3>{pick({zh:'形式成员',en:'Formal members'})}</h3><ul>{o.members.map(r=><li key={r.id}><Link to={hrefFor(objectHref(r.id))}>{r.id}</Link></li>)}</ul></>:null}
      {o.references.length?<><h3>{pick({zh:'引用对象',en:'Referenced objects'})}</h3><ul>{o.references.map(r=><li key={`${r.id}#${r.anchor}`}><Link to={hrefFor(objectHref(r.id))}>{r.id}</Link></li>)}</ul></>:null}
    </section>
    {lean.map(b=><section className="panel" key={b.target}><h2>{pick({zh:'Lean 对应',en:'Lean correspondence'})}</h2><code>{b.target}</code><p>{b.mapping}</p><p>{pick({zh:'对应审阅：待独立人工复核',en:'Correspondence: awaiting independent human review'})}</p></section>)}
    <LeanEvidenceCards evidence={evidence}/>
    <section className="panel"><h2>{pick({zh:'选择一种讲解',en:'Choose a reading'})}</h2>{readings.length?<ul>{readings.map(n=><li key={n.id}><Link to={hrefFor(nodeHref(n.id))}>{n.title}</Link>{correspondence.filter(r=>r.nodeId===n.id).map(r=><p key={r.target}>{pick({zh:'文字对应审阅',en:'Reading correspondence'})}：{pick({zh:{pending:'待审阅',reviewed:'已审阅',stale:'文字或形式输入已变化，审阅过期'},en:{pending:'Pending',reviewed:'Reviewed',stale:'Review expired after text or formal input changed'}})[r.status]}</p>)}</li>)}</ul>:<p>{pick({zh:'尚未登记阅读节点。',en:'No reading nodes registered yet.'})}</p>}</section>
    <details><summary>{pick({zh:'对象注释与来源',en:'Object commentary and sources'})}</summary><Markdown>{o.body}</Markdown></details>
    {result.data.relations?.length>0&&<section className="panel"><h2>{pick({zh:'关系、命题与条件',en:'Relations, propositions and conditions'})}</h2>{result.data.relations.map(r=><ContentRelationDetails key={r.id} relation={r}/>)}</section>}
  </main>;
}

export function LearningNodePage() {
  const {isMaster}=useMasterMode();
  const {nodeId}=useParams(),{pick,hrefFor}=useI18n();
  const result=useApi<NodeDetail>(nodeId?`/learning/nodes/${encodeURIComponent(nodeId)}`:null);
  if(result.error)return <main className="page"><p role="alert">{formatError(result.error)}</p></main>;
  if(result.loading||!result.data)return <main className="page" role="status">{pick({zh:'正在读取节点…',en:'Loading reading…'})}</main>;
  const {node,objects}=result.data;
  if(isMaster)return <main className="page content-library master-node-page" data-reading-mode="master">
    <McsReturnLink/>
    <Link to={hrefFor('/objects')}>{pick({zh:'← 形式对象与阅读节点',en:'← Objects and reading nodes'})}</Link><h1>{node.title}</h1>
    <p className="master-page-meta"><code>{node.id}</code> · Master</p>{result.data.master?<MasterContent view={result.data.master}/>:null}
    {node.case==='topology-dg'&&<><ContentLearning key={node.id} node={node} versions={result.data}/><ul>{objects.map(o=><li key={o.id}><Link to={hrefFor(objectHref(o.id))}>{o.title}</Link></li>)}</ul></>}
  </main>;
  return <main className="page content-library"><Link to={hrefFor('/objects')}>{pick({zh:'← 形式对象与阅读节点',en:'← Objects and reading nodes'})}</Link>
    <McsReturnLink/>
    {node.case==='topology-dg'&&<><p>{pick({zh:'当前正文语言：中文',en:'Current reading language: Chinese'})}</p><p><Link to={hrefFor(networkReturnHref(node.id,'zh')??caseNetworkHref('L'))}>{pick({zh:'返回案例网络',en:'Return to the case network'})}</Link></p><ContentLearning key={node.id} node={node} versions={result.data}/></>}
    <section className="panel"><h2>{pick({zh:'本篇目标',en:'Learning goals'})}</h2><ul>{node.goals.map(goal=><li key={goal}>{goal}</li>)}</ul></section>
    <Markdown>{node.body}</Markdown>
    <section className="panel"><h2>{pick({zh:'本篇引用的数学对象',en:'Mathematical objects in this reading'})}</h2><ul>{node.objects.map(r=><li key={`${r.id}#${r.anchor}`}><Link to={hrefFor(`${objectHref(r.id)}${r.anchor==='$'?'':`#${r.anchor}`}`)}>{objects.find(o=>o.id===r.id)?.title??r.id}</Link> · {r.version}</li>)}</ul></section>
  </main>;
}
