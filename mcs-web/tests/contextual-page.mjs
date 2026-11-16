import assert from 'node:assert/strict';
import {mkdirSync} from 'node:fs';
import {compileContentLibrary,formatContentDocument} from '../shared/content-documents.mjs';
import {objectMasterView} from '../shared/master-view.mjs';
import {startTestServer} from './helpers.mjs';
import {CHROME_PATH,PLAYWRIGHT_SPECIFIER} from './browser-runtime.mjs';
const fixture={schema:'mcs-object/2',id:'obj:ctx:display',version:'1',title:'继承语境中的变量',language:'mcs-formal/1',grammar:'mcs-object-grammar/2',scale:'atom',context:{signature:'test/1',bases:['o','R'],constants:[],bound:['R']},definitions:[],assumptions:[],declarations:[{id:'value',kind:'term',type:'R',expression:['b',0,'R'],status:'DEF'}],references:[],members:[],imports:[],exports:[],links:[],lean:[],construction:{kind:'b',inputs:[]}};
const object=compileContentLibrary([{markdown:formatContentDocument(fixture,'# 继承语境中的变量')}]).objects[0];
const app=await startTestServer({lean:{enabled:false}});let browser;
try{
 const {chromium}=await import(PLAYWRIGHT_SPECIFIER);browser=await chromium.launch({executablePath:CHROME_PATH??undefined,headless:true});
 const page=await browser.newPage({viewport:{width:1200,height:900}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/api/v2/ontology/objects/**',route=>route.fulfill({json:{ok:true,data:{object,master:objectMasterView(object),readings:[],lean:[],correspondence:[],relations:[]}}}));
 await page.goto(app.origin+'/objects/'+encodeURIComponent(object.id));
 await page.getByRole('heading',{name:'继承语境中的变量',exact:true}).waitFor();
 assert.match(await page.locator('.content-library').innerText(),/\[v0:R\] ⊢ v0/);
 assert.match(await page.locator('.content-library').innerText(),/继承的变量绑定/);
 assert.match(await page.locator('.content-library').innerText(),/构造与输入位置/);
 mkdirSync('tmp/contextual-qa',{recursive:true});await page.screenshot({path:'tmp/contextual-qa/desktop.png',fullPage:true});
 await page.setViewportSize({width:390,height:844});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
 await page.screenshot({path:'tmp/contextual-qa/mobile.png',fullPage:true});
 await page.evaluate(()=>localStorage.setItem('mcs-reading-mode-v1','master'));await page.reload();
 await page.locator('main[data-reading-mode="master"]').waitFor();assert.match(await page.locator('main[data-reading-mode="master"]').innerText(),/⊢/);
 assert.deepEqual(errors,[]);console.log('passed: contextual expression, inherited bindings, construction, mobile and Master display (synthetic API fixture)');
}finally{await browser?.close();await app.cleanup();}
