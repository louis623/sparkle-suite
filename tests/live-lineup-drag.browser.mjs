// Isolated component regression test. Never accesses a signed-in browser or real orders.
// Build: node tests/live-lineup-drag.browser.mjs --bundle <directory>
// Run: LINEUP_TEST_HTML=<html> PLAYWRIGHT_MODULE=<module> CHROME_PATH=<chrome> node this-file
import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';
if (process.argv[2] === '--bundle') {
  const {build} = await import('esbuild');
  const result = await build({stdin:{contents:`import React from 'react'; import {createRoot} from 'react-dom/client'; import {LiveLineupCard} from './app/nic-nac/components/LiveLineupCard'; createRoot(document.getElementById('app')).render(<LiveLineupCard compact />);`,resolveDir:process.cwd(),loader:'tsx'},bundle:true,write:false,outdir:'unused-browser-output',format:'iife',define:{'process.env.NODE_ENV':'"production"'},jsx:'automatic'});
  const js=result.outputFiles.find(f=>f.path.endsWith('.js')).text;
  const css=result.outputFiles.find(f=>f.path.endsWith('.css')).text;
  mkdirSync(process.argv[3],{recursive:true});
  writeFileSync(resolve(process.argv[3],'index.html'),`<!doctype html><html><head><style>body{font-family:Arial;margin:40px;background:#f6f1fc}#app{width:280px;height:620px}${css}</style></head><body><div id="app"></div><script>${js}</script></body></html>`);
  console.log('Browser component bundle created');
} else {
  const require=createRequire(import.meta.url);
  const {chromium}=require(process.env.PLAYWRIGHT_MODULE || 'playwright');
  const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH});
  try {
    const page=await browser.newPage({viewport:{width:1000,height:800}});
    const errors=[];page.on('pageerror',e=>errors.push(e.message));
    const entries=Array.from({length:25},(_,i)=>({id:`p1:order${i}`,name:i<2?'Same first name':i===2?'Test customer with a longer name':'Test customer '+String(i+1).padStart(2,'0'),position:i+1,held:false}));
    let state={revision:1,connection:'connected',lastReceivedAt:new Date().toISOString(),lastChangedAt:null,sourceVersion:'2',canManage:true,authorized:true,canRecover:true,entries,heldEntries:[],undoAvailable:false,warning:null,management:{generation:1,partyIds:['p1'],excludedPartyIds:[],candidates:entries}};
    let posts=[],conflicts=0,realChange=false,conflictKind='',dropResponse=false,freshMs=45000;
    const snapshot=()=>({...state,serverTime:new Date().toISOString(),freshUntil:new Date(Date.now()+freshMs).toISOString(),freshForMs:freshMs});
    await page.route('http://lineup.test/**',async route=>{
      if(route.request().url()==='http://lineup.test/')return route.fulfill({contentType:'text/html',body:readFileSync(process.env.LINEUP_TEST_HTML,'utf8')});
      if(route.request().method()==='POST'){
        const body=route.request().postDataJSON();posts.push(body);
        if(dropResponse){dropResponse=false;return route.abort();}
        if(conflicts>0){conflicts--;state={...state,revision:state.revision+1};
        if(conflictKind==='arrival'){state.entries=[...state.entries,{id:'p1:added',name:'New arrival',position:state.entries.length+1,held:false}];state.management={...state.management,candidates:state.entries};}
        if(conflictKind==='identity'){state.entries=state.entries.map((e,i)=>i===0?{...e,lastName:'Changed identity'}:e);state.management={...state.management,candidates:state.entries};}
        if(conflictKind==='scope')state.management={...state.management,generation:state.management.generation+1};
        if(conflictKind==='disconnect')state={...state,connection:'delayed',canManage:false};
        if(realChange){state.entries=[...state.entries].reverse().map((e,i)=>({...e,position:i+1}));state.management={...state.management,candidates:state.entries};}return route.fulfill({status:409,json:{error:'revision_conflict'}});}
        assert.equal(body.expectedRevision,state.revision);
        const list=[...state.entries];const index=list.findIndex(e=>e.id===body.command.entryId);const [entry]=list.splice(index,1);const dest=body.command.beforeEntryId===null?list.length:list.findIndex(e=>e.id===body.command.beforeEntryId);list.splice(dest,0,entry);
        const positioned=list.map((e,i)=>({...e,position:i+1}));state={...state,revision:state.revision+1,lastChangedAt:new Date().toISOString(),entries:positioned,undoAvailable:true,management:{...state.management,candidates:positioned}};
        await new Promise(resolve=>setTimeout(resolve,150));
      }
      await route.fulfill({json:snapshot()});
    });
    await page.goto('http://lineup.test/');
    const handles=page.locator('[data-lineup-grab]');
    await handles.first().waitFor();await page.waitForFunction(()=>!document.querySelector('[data-lineup-grab]').disabled);
    assert.equal(await page.getByRole('button',{name:/Move .* (up|down) from/}).count(),0);
    const first=await handles.first().boundingBox();const third=await handles.nth(2).boundingBox();
    await page.mouse.move(first.x+100,first.y+20);await page.mouse.down();await page.mouse.move(first.x+112,first.y+35,{steps:3});
    await page.locator('[data-lineup-drag-preview]').waitFor();
    const preview1=await page.locator('[data-lineup-drag-preview]').boundingBox();
    await page.mouse.move(first.x+125,third.y+third.height-4,{steps:6});
    const preview2=await page.locator('[data-lineup-drag-preview]').boundingBox();assert(preview2.y>preview1.y+30,'Lifted card must follow pointer');
    assert(await page.locator('[data-lineup-drop-marker]').isVisible(),'Insertion marker must be visible');
    assert((await page.locator('[aria-live]').innerText()).includes('position 3'));
    await page.screenshot({path:resolve(process.env.LINEUP_TEST_HTML,'../drag-preview.png')});
    await page.mouse.up();await page.getByText('Lineup saved.',{exact:true}).waitFor();
    assert.equal(posts.at(-1).command.entryId,'p1:order0');assert.equal(state.entries[2].id,'p1:order0');
    const begin=async()=>{const box=await handles.first().boundingBox();await page.mouse.move(box.x+90,box.y+20);await page.mouse.down();await page.mouse.move(box.x+110,box.y+40);await page.locator('[data-lineup-drag-preview]').waitFor();return box;};
    let count=posts.length;await begin();await page.keyboard.press('Escape');await page.mouse.up();assert.equal(await page.locator('[data-lineup-drag-preview]').count(),0);assert.equal(posts.length,count);
    await begin();await page.mouse.move(700,300);await page.mouse.up();assert.equal(await page.locator('[data-lineup-drag-preview]').count(),0);assert.equal(posts.length,count);
    conflicts=2;await handles.first().focus();await page.keyboard.press('ArrowDown');await page.waitForFunction(()=>document.querySelector('[aria-live]').textContent==='Lineup saved.');assert.equal(posts.length,count+3,'Two unchanged heartbeat conflicts should recover');
    count=posts.length;conflicts=1;realChange=true;await handles.first().focus();await page.keyboard.press('ArrowDown');await page.getByText(/The lineup changed while/).waitFor();assert.equal(posts.length,count+1,'Real order change must not retry');realChange=false;
    await page.waitForFunction(()=>!document.querySelector('[data-lineup-grab]').disabled);
    const box=await begin();const scroller=await page.getByRole('region',{name:'Scrollable live lineup'}).boundingBox();await page.mouse.move(box.x+90,scroller.y+scroller.height-5);await page.waitForFunction(()=>document.querySelector('[aria-label="Scrollable live lineup"]').scrollTop>40);await page.keyboard.press('Escape');await page.mouse.up();
    for(const kind of ['arrival','identity','scope','disconnect']) {
      count=posts.length;conflicts=1;conflictKind=kind;await handles.first().focus();await page.keyboard.press('ArrowDown');
      await page.getByText(/The lineup changed while/).waitFor();assert.equal(posts.length,count+1,kind+' must not replay a stale move');
      conflictKind='';state={...state,connection:'connected',canManage:true};await page.reload();await page.waitForFunction(()=>!document.querySelector('[data-lineup-grab]')?.disabled);
    }
    count=posts.length;dropResponse=true;await handles.first().focus();await page.keyboard.press('ArrowDown');
    await page.getByText(/Lineup reloaded after an unconfirmed change/).waitFor();assert.equal(posts.length,count+1,'Unconfirmed write must not retry');
    count=posts.length;await begin();await page.setViewportSize({width:900,height:800});await page.locator('[data-lineup-drag-preview]').waitFor({state:'detached'});await page.mouse.up();assert.equal(posts.length,count,'Resize cancels without a write');
    freshMs=1200;await page.reload();await page.waitForFunction(()=>!document.querySelector('[data-lineup-grab]')?.disabled);await begin();
    await page.locator('[data-lineup-drag-preview]').waitFor({state:'detached'});await page.mouse.up();assert.equal(posts.length,count,'Expired freshness cancels without a write');
    assert.deepEqual(errors,[]);console.log('PASS: visible pointer-follow preview, drop marker, pointer save, Escape/outside cancellation, keyboard, two heartbeat races, changed-order fence, edge scrolling, new arrivals, changed identity/scope, disconnection, unconfirmed-save rollback, resize and freshness expiry; no browser errors.');
  }finally{await browser.close();}
}
