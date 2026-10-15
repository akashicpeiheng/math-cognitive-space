import { concept, claim, method, action, input, output, relation, evidence, selfCheck } from './authoring.mjs';
import { algebraEntryNotes } from './field-entry-algebra.mjs';
import { foundationEntryNotes } from './field-entry-foundations.mjs';
import { analysisEntryNotes } from './field-entry-analysis.mjs';
import { supplementEntryNotes } from './field-entry-supplements.mjs';
import { ENTRY_SOURCES } from './field-entry-support.mjs';

export const newEntryNotes = [...algebraEntryNotes, ...foundationEntryNotes, ...analysisEntryNotes];
export const entryNotes = [...newEntryNotes, ...supplementEntryNotes];
const theoremIds = new Set(['linear:rank-nullity','set:cantor','logic:soundness','logic:completeness','logic:incompleteness','measure:monotone-convergence','measure:dominated-convergence','cosmo:friedmann']);
const makeNode = (spec, locale) => {
  const t = key => spec[key][locale];
  const ctor = spec.kind === 'Method' ? method : theoremIds.has(spec.id) ? claim : concept;
  return ctor(spec.id, t('title'), {
    discipline: spec.discipline, case: spec.case, summary: t('intuition'),
    formal: {
      boundary: [t('boundary')],
      ...(spec.kind === 'Method' ? { name:t('title'), scope:locale==='en'?'Global method':'全局方法', In:t('internal'),Out:t('thought'),Pre:t('definition'),Post:t('review'),Use:spec.requires,Demo:[t('example')],Fail:t('boundary'),fail:t('boundary'),body:t('technique'),applicableTo:spec.requires }
        : theoremIds.has(spec.id) ? { formula:spec.formula ?? t('definition'),assumptions:[t('definition')] }
        : { objectType:t('title'),predicate:t('definition'),formationWitness:locale==='en'?'Declared mathematical interface; no machine proof of the mathematics.':'声明数学接口；形成检查不认证正文数学。' }),
    },
    ...(spec.formula ? {formalStatement:{tex:spec.formula,reading:t('definition'),notation:[],label:spec.status,note:t('proof')}} : {}),
    motivation:{internal:[t('internal')],external:[t('external')],growthChain:[t('growth')]},
    teaching:{proofOverview:t('proof'),commonMisconceptions:[t('misconception')],reviewQuestions:[t('review')],selfCheck:[selfCheck('sc-entry-'+spec.id,t('review'),locale==='en'?'Check conditions':'核对条件',spec.id,t('technique'))],evidenceStatus:spec.status},
    provenance:{sources:spec.sources.map(key=>ENTRY_SOURCES[key].url),note:'Field-entry notes, 2026-10-12. Reading scope is stated in each note.'},
  });
};
const nodes = newEntryNotes.map(spec=>makeNode(spec,'zh'));
const kindFor = spec => spec.kind==='Method'?'method':theoremIds.has(spec.id)?'deduction':'definition';
const resourcesFor = spec => spec.kind==='Method'?['method']:theoremIds.has(spec.id)?['statement']:['definition','statement'];
const crossCases = new Set(['gt:sigma-algebra','liang:metric-tensor','tensor:field']);
const scopeFor = (spec, locale) => locale==='en'
  ? 'Reading interface for '+spec.title.en+'. All inputs and the conditions in the note are required together; one arrow is not a sufficient implication. '+spec.proof.en
  : spec.title.zh+'的阅读接口。须同时核对全部输入及正文条件，单条连线不是充分蕴含。'+spec.proof.zh;
const actions = newEntryNotes.map(spec=>action('entry:'+spec.id,kindFor(spec),spec.title.zh+'：定义与条件检查',spec.requires.map(id=>input(id,['definition','statement','method'])),[output(spec.id,resourcesFor(spec))],{witness:{type:'declared-contract',status:spec.status,ref:'ev-entry:'+spec.id,scope:scopeFor(spec,'zh')}}));
const relations = newEntryNotes.flatMap(spec=>spec.kind==='Method'?[]:spec.requires.map((id,i)=>relation('rel-entry:'+spec.id+':'+i,crossCases.has(id)?'crossDomain':'hardPrereq',id,spec.id,{
  witness:{type:crossCases.has(id)?'declared':theoremIds.has(spec.id)?'proof-dependency':'definitional-dependency',status:theoremIds.has(spec.id)?spec.status:'DEF',ref:'ev-entry:'+spec.id,scope:scopeFor(spec,'zh')},scope:scopeFor(spec,'zh'),
})));
const evidenceNotes = [...newEntryNotes, supplementEntryNotes.find(n=>n.id==='bg:misc:counterexample-method')];
const evidences = evidenceNotes.map(spec=>evidence('ev-entry:'+spec.id,spec.status==='REF'?'reference':spec.status==='PROOF'?'human-proof':spec.status==='ILLUSTRATION'?'illustration':'definition',spec.status,'not_run',spec.title.zh+'：正文证据',{nodes:[spec.id,...spec.requires],scope:spec.proof.zh,obligations:['正文数学条件与引用须独立复核；尚未编码 ND 证书，不声明机器认证。'],reference:spec.sources.map(k=>ENTRY_SOURCES[k].title+' — '+ENTRY_SOURCES[k].location).join('\n')}));
export const fieldEntry = {nodes,actions,relations,evidence:evidences};
export function attachEntryBodies(nodes) {
  const supplements = new Set(supplementEntryNotes.map(s=>s.id));
  return nodes.map(node=>supplements.has(node.id)?{...supplementNodeText(node.id,node,'zh'),contentRef:node.id}:node);
}
const supplementFor = id => supplementEntryNotes.find(s=>s.id===id);
// The registered FTC claim is broader than the proved continuous Riemann variant.
const supplementStatus = spec => spec.id==='rudin:fundamental-theorem'?'REF':spec.status;
const supplementScope = (spec,locale) => spec.proof[locale]+(spec.id==='rudin:fundamental-theorem'?(locale==='en'?' The broader registered Riemann–Stieltjes statement remains REF; only the continuous ordinary Riemann version is proved here.':' 原登记的完整 Riemann–Stieltjes 表述仍为 REF；本页仅证明普通 Riemann 连续版本。'):'');
export function supplementNodeText(id,node,locale='en') {
  const spec=supplementFor(id);if(!spec||id.startsWith('bg:'))return node;
  const authored=makeNode(spec,locale);
  return {...node,summary:spec.intuition[locale],formal:{...node.formal,boundary:[spec.boundary[locale]]},motivation:authored.motivation,
    teaching:{...node.teaching,...authored.teaching,proofOverview:supplementScope(spec,locale),evidenceStatus:supplementStatus(spec)},
    provenance:{...node.provenance,note:locale==='en'?'An MCS introductory body is now available; reference reading scope is recorded in the note. No machine certificate is claimed.':'已补入本站编写的入门正文；引用的实际阅读范围见正文，不声明机器证书。'}};
}
export function supplementActionText(id,record,locale='en') {
  const spec=supplementFor(id.replace(/^a-/,''));if(!spec)return record;
  return {...record,title:spec.title[locale]+(locale==='en'?': read and check conditions':'：阅读与核对条件'),witness:{...record.witness,status:supplementStatus(spec),ref:spec.id.startsWith('bg:')?'ev-entry:'+spec.id:'ev-'+spec.id.replace(':','-'),scope:scopeFor(spec,locale)+(spec.id==='rudin:fundamental-theorem'?(locale==='en'?' The broader registered Riemann–Stieltjes claim remains REF.':' 原登记的更广 Riemann–Stieltjes 断言仍为 REF。'):'')}};
}
export function supplementEvidenceText(id,record,locale='en') {
  const spec=supplementEntryNotes.find(s=>!s.id.startsWith('bg:')&&id==='ev-'+s.id.replace(':','-'));if(!spec)return record;
  const status=supplementStatus(spec);
  return {...record,status,kind:status==='REF'?'reference':status==='PROOF'?'human-proof':'definition',scope:supplementScope(spec,locale),
    obligations:locale==='en'?['Review the note’s mathematical conditions independently.','No ND certificate is encoded; no machine certification is claimed.','Reference reading scope is stated; unproved generalizations remain cited results.']:['独立复核正文数学条件。','尚未编码 ND 证书，不声明机器认证。','来源阅读范围已记录；未证推广仍保留引用边界。'],
    reference:spec.sources.map(k=>ENTRY_SOURCES[k].title+' — '+ENTRY_SOURCES[k].location).join('\n')};
}
export const attachEntryActions = actions => actions.map(a=>supplementActionText(a.id,a,'zh'));
export const attachEntryEvidence = records => records.map(e=>supplementEvidenceText(e.id,e,'zh'));
export const entryEnglish = {
  nodes:Object.fromEntries(newEntryNotes.map(spec=>{
    const n=makeNode(spec,'en');
    return [spec.id,{title:n.title,summary:n.summary,formal:n.formal,formalStatement:n.formalStatement,motivation:n.motivation,teaching:n.teaching}];
  })),
  actions:Object.fromEntries(newEntryNotes.map(spec=>['entry:'+spec.id,{title:spec.title.en+': formulation and conditions',witness:{scope:scopeFor(spec,'en')}}])),
  evidence:Object.fromEntries(evidenceNotes.map(spec=>['ev-entry:'+spec.id,{title:spec.title.en+': note evidence',scope:spec.proof.en,obligations:['Mathematical conditions and references require independent review; no ND certificate has been encoded and no machine certification is claimed.']} ])),
  relations:Object.fromEntries(newEntryNotes.flatMap(spec=>spec.kind==='Method'?[]:spec.requires.map((id,i)=>['rel-entry:'+spec.id+':'+i,{scope:scopeFor(spec,'en'),witness:{scope:scopeFor(spec,'en')}}]))),
};
