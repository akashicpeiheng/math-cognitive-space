import test from 'node:test';
import assert from 'node:assert/strict';
import {compileContentLibrary,formatContentDocument,parseContentDocument,objectReference} from '../shared/content-documents.mjs';
import {readContentSources} from '../core/content-library.mjs';
import {objectMasterView} from '../shared/master-view.mjs';
const context={signature:'signature:context-test/1',bases:['o','R'],constants:[{name:'f',type:'R -> R',background:'arbitrary function'},{name:'v0',type:'R',background:'constant whose name must not be captured by display'}]};
const ref=id=>({id:'obj:ctx:'+id,version:'1',anchor:'term',formalHash:''});
function doc(id,bound,expression,type,construction){
 const count=t=>t[0]==='app'?1+count(t[1])+count(t[2]):t[0]==='lam'?1+count(t[2]):0;
 return {path:`objects/${id}.md`,markdown:formatContentDocument({schema:'mcs-object/2',id:'obj:ctx:'+id,version:'1',title:id,language:'mcs-formal/1',grammar:'mcs-object-grammar/2',scale:count(expression)?'molecule':'atom',context:{...context,bound},definitions:[],assumptions:[],declarations:[{id:'term',kind:'term',type,expression,status:'DEF'}],references:[],members:[],imports:[],exports:[],links:[],lean:[],...(construction?{construction}:{})},`# ${id}\n\nTyped contextual expression.`)};
}
function fixture(){return [
 doc('bound',['R'],['b',0,'R'],'R',{kind:'b',inputs:[]}),
 doc('function',['R'],['c','f'],'R -> R',{kind:'c',inputs:[]}),
 doc('application',['R'],['app',['c','f'],['b',0,'R']],'R',{kind:'app',inputs:[{position:'function',ref:ref('function')},{position:'argument',ref:ref('bound')}]}),
 doc('abstraction',[],['lam','R',['app',['c','f'],['b',0,'R']]],'R -> R',{kind:'lam',inputs:[{position:'body',ref:ref('application')}]})
];}
const compile=s=>compileContentLibrary(s,{checkPins:false});
const edit=(sources,id,fn)=>sources.map(s=>{const d=parseContentDocument(s.markdown,s.path);if(d.data.id==='obj:ctx:'+id)fn(d.data);return {path:s.path,markdown:formatContentDocument(d.data,d.body)};});

test('contextual subterms retain inherited types without adding an abstraction',()=>{
 const l=compile(fixture()),b=l.objects.find(o=>o.id==='obj:ctx:bound');
 assert.equal(b.scale,'atom');assert.equal(b.declarations[0].constructionCount,0);
 assert.deepEqual(b.declarations[0].canonical,['b',0,'R']);
 assert.deepEqual(b.normalizedContext.bound,['R']);assert.match(b.declarations[0].source,/\[v0:R\] ⊢ v0/);
 const c=compile([doc('display',['R'],['c','v0'],'R')]).objects[0];
 assert.match(c.declarations[0].source,/\[v1:R\] ⊢ v0/);
 const master=objectMasterView(b);assert.ok(master.context.some(s=>s.includes('R')));assert.ok(master.expressions[0].markdown.includes('⊢'));
});
test('inherited context participates in identity, including unused bindings',()=>{
 const a=compile([doc('same',[],['c','f'],'R -> R')]).objects[0];
 const b=compile([doc('same',['R'],['c','f'],'R -> R')]).objects[0];
 assert.notEqual(a.formalHash,b.formalHash);assert.notEqual(a.declarations[0].formalHash,b.declarations[0].formalHash);
});
test('binding loss, wrong binding sort, named free variables and wrong result type fail',()=>{
 for(const [bound,term,type] of [[[],['b',0,'R'],'R'],[['o'],['b',0,'R'],'R'],[['R'],['v','x','R'],'R'],[['R'],['b',0,'R'],'o'],[['R'],['b',2,'R'],'R'],[['R'],['app',['c','v0'],['b',0,'R']],'R']])assert.throws(()=>compile([doc('bad',bound,term,type)]));
 assert.throws(()=>compile(edit(fixture(),'bound',d=>d.declarations[0].source='freeName')),e=>e.code==='unknown-field');
});
test('construction checks input order, exact syntax, inherited context and background',()=>{
 const cases=[
  s=>edit(s,'application',d=>d.construction.inputs.reverse()),
  s=>edit(s,'bound',d=>d.context.bound=['R','R']),
  s=>edit(s,'function',d=>d.context.signature='other'),
  s=>edit(s,'application',d=>d.construction.inputs[1].ref=ref('application')),
  s=>edit(s,'bound',d=>d.declarations[0].expression=['c','v0']),
  s=>edit(s,'abstraction',d=>d.construction.inputs[0].ref=ref('bound'))
 ];
 for(const change of cases)assert.throws(()=>compile(change(fixture())));
});
test('v2 pins seal and reject stale expressions while v1 stays byte-for-byte hash compatible',()=>{
 const sources=fixture(),l=compile(sources);
 const sealed=sources.map(s=>{const d=parseContentDocument(s.markdown,s.path);for(const i of d.data.construction?.inputs??[])i.ref=objectReference(l,i.ref.id,i.ref.anchor);return {path:s.path,markdown:formatContentDocument(d.data,d.body)};});
 assert.equal(compileContentLibrary(sealed).objectVersion,l.objectVersion);
 assert.throws(()=>compileContentLibrary(edit(sealed,'bound',d=>d.version='2')));
 // Immutable baseline from before this protocol change; no --seal of old content.
 const fixed={schema:'mcs-object/1',id:'obj:ctx:closed-v1',version:'1',title:'fixed v1 hash',language:'mcs-formal/1',grammar:'mcs-object-grammar/1',scale:'atom',context:{signature:'signature:fixed-v1/1',bases:['o','R'],constants:[{name:'x',type:'R',background:'fixed parameter'}]},definitions:[],assumptions:[],declarations:[{id:'term',kind:'term',type:'R',source:'x',status:'DEF'}],references:[],members:[],imports:[],exports:[],links:[],lean:[]};
 assert.equal(compileContentLibrary([{markdown:formatContentDocument(fixed,'# fixed v1 hash')}]).objects[0].formalHash,'sha256:5eb55c69ba70d294c3880d042e521a386abef55d52185358007efafc57273299');
});
test('contextual expressions cannot silently bind closed Lean goals',()=>{
 assert.throws(()=>compile(edit(fixture(),'bound',d=>d.lean=[{anchor:'term',registrationId:'fake',target:'fake',mapping:'fake',review:'pending'}])),e=>e.code==='context-scope');
});
test('contextual terms cannot escape through closed exports or deduction relations',()=>{
 let sources=fixture();const module=parseContentDocument(doc('module',[],['c','f'],'R -> R').markdown);
 module.data.scale='unit';module.data.declarations=[];module.data.members=[{...ref('bound'),anchor:'$'}];module.data.exports=[{name:'leaked',type:'R',ref:ref('bound')}];
 assert.throws(()=>compile([...sources,{markdown:formatContentDocument(module.data,'# module')}]),e=>e.code==='context-scope');
 const p=doc('open-proposition',['R'],['logic','true'],'o');
 const r={schema:'mcs-relation/1',id:'rel:ctx:escape',version:'1',title:'escape',case:'test',layer:'M',kind:'deduction',from:ref('open-proposition'),to:ref('open-proposition'),premises:[ref('open-proposition')],context:'test',witness:{type:'test',statement:'test'},evidence:{status:'NOT-CLAIMED',source:'test'}};
 assert.throws(()=>compile([p,{markdown:formatContentDocument(r,'# escape')}]),/语境命题/);
});
test('normalization preserves application and abstraction instead of beta reducing',()=>{
 const term=['app',['lam','R',['b',0,'R']],['c','v0']];
 const o=compile([doc('beta',[],term,'R')]).objects[0];
 assert.deepEqual(o.declarations[0].canonical,term);assert.equal(o.declarations[0].constructionCount,2);
});
test('malformed constant names and deeply nested type trees fail with bounded errors',()=>{
 assert.throws(()=>compile([doc('array-name',[],['c',['f']],'R -> R')]),e=>e.code==='shape');
 let type='R';for(let i=0;i<140;i++)type=['->','R',type];
 assert.throws(()=>compile([doc('type-budget',[],['lam',type,['logic','true']],'o')]),e=>e.code==='resource-exhausted');
});
