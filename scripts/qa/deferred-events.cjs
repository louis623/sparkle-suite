// Pass 5 light QA only: four read-only filtered-Smoke cases, then 3+3 sanity loads.
const fs=require('node:fs'),path=require('node:path');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const [base,out]=process.argv.slice(2);
if(!base||!new URL(base).hostname.endsWith('.vercel.app'))throw Error('Immutable preview required');
if(!process.env.VERCEL_OIDC_TOKEN)throw Error('Existing preview authentication required');
fs.mkdirSync(out,{recursive:true});
const resultPath=path.join(out,'browser-results.json');
if(fs.existsSync(resultPath))throw Error('One round already exists; do not rerun');
const profiles={desktop:{width:1440,height:1200,cpu:1,mobile:false},phone:{width:390,height:900,cpu:4,mobile:true,down:200000,up:93750,latency:150}};
const result={base,settings:{profiles,locale:'en-US',timeZone:'America/New_York',cache:'disabled',delayMs:5000,fixtures:'Actual Smoke completion response filtered to zero or one event in the browser; no database changes.'},cases:[],sanity:[]};
const safeError=e=>String(e?.message||e).replaceAll(process.env.VERCEL_OIDC_TOKEN,'[redacted]');
function save(){fs.writeFileSync(resultPath,JSON.stringify(result,null,2));}
function instrument(){
 const q=window.__pass5={cls:0,swapStartCls:null,hydrated:false,fcp:null,dancersCopies:[]};
 new PerformanceObserver(list=>{for(const e of list.getEntries())if(!e.hadRecentInput)q.cls+=e.value;}).observe({type:'layout-shift',buffered:true});
 new PerformanceObserver(list=>{for(const e of list.getEntries())if(e.name==='first-contentful-paint')q.fcp={at:e.startTime,ssr:document.querySelector('#root')?.dataset.serverRendered==='true',background:getComputedStyle(document.body).backgroundColor,styles:document.styleSheets.length};}).observe({type:'paint',buffered:true});
 window.addEventListener('sparkle:homepage-hydrated',()=>q.hydrated=true);
 new MutationObserver(()=>{if(document.body?.innerText.includes('Dancers will appear here'))q.dancersCopies.push(performance.now());}).observe(document,{subtree:true,childList:true,characterData:true});
}
async function state(page){return page.evaluate(()=>{
 const q=window.__pass5,section=document.querySelector('#events'),cards=[...document.querySelectorAll('#events .hp-event-card')],placeholders=[...document.querySelectorAll('#events [data-page-placeholder="events"]')],h=document.querySelector('#events .hp-section-title'),grid=document.querySelector('#events .hp-event-grid');
 return{...q,pending:window.SPARKLE_PENDING_PAGE_DATA||null,ssr:document.querySelector('#root')?.dataset.serverRendered==='true',h1:document.querySelectorAll('h1').length,eventSectionPresent:!!section,eventSectionHeight:section?.getBoundingClientRect().height||0,cardCount:cards.length,placeholderCount:placeholders.length,remainingEventsAreaPx:section?.getBoundingClientRect().height||0,gapAfterCalendarHeading:!section?0:h&&grid?grid.getBoundingClientRect().top-h.getBoundingClientRect().bottom:null,cards:cards.map(c=>({height:c.getBoundingClientRect().height,inlineHeight:c.style.height,inlineMinHeight:c.style.minHeight,inlineOverflow:c.style.overflowY})),eventCount:window.AMETHYST_HOMEPAGE_EVENTS?.length,defaults:{showEvents:window.HOMEPAGE_TWEAK_DEFAULTS?.showEvents,eventCount:window.HOMEPAGE_TWEAK_DEFAULTS?.eventCount},times:[...document.querySelectorAll('.hp-event-meta')].map(x=>x.innerText),pageHeight:document.documentElement.scrollHeight};
 });}
async function run(browser,group,profile,index,count){
 const p=profiles[profile],label=`${group}-${profile}-${count===undefined?index:count===0?'empty':'one'}`,row={profile,index,expectedEvents:count,errors:[],consoleErrors:[],writesBlocked:[]};
 const context=await browser.newContext({viewport:{width:p.width,height:p.height},isMobile:p.mobile,hasTouch:true,locale:'en-US',timezoneId:'America/New_York'});
 await context.route('**/*',async route=>{
   const request=route.request(),url=new URL(request.url());
   if(!['GET','HEAD'].includes(request.method())){row.writesBlocked.push({method:request.method(),path:url.pathname});return route.abort();}
   const headers={...request.headers()};if(url.origin===base)headers['x-vercel-trusted-oidc-idp-token']=process.env.VERCEL_OIDC_TOKEN;
   if(Number.isInteger(count)&&url.origin===base&&url.pathname==='/api/amethyst/homepage-template'){
     let response;
     try{response=await route.fetch({headers});}catch(error){row.fixtureReadError=safeError(error);return route.abort();}
     if(!response.ok())return route.fulfill({response});
     const source=await response.text();
     // Derive a faithful empty/one-event response from the real Smoke array.
     const script='window.__pass5.swapStartCls=window.__pass5.cls;\n'+source+'\nwindow.__pass5.sourceEventCount=window.AMETHYST_HOMEPAGE_EVENTS.length;window.AMETHYST_HOMEPAGE_EVENTS=window.AMETHYST_HOMEPAGE_EVENTS.slice(0,'+count+');window.HOMEPAGE_TWEAK_DEFAULTS.showEvents=window.AMETHYST_HOMEPAGE_EVENTS.length>0;window.HOMEPAGE_TWEAK_DEFAULTS.eventCount=window.AMETHYST_HOMEPAGE_EVENTS.length;'+(count===0?'window.AMETHYST_HOMEPAGE_TEMPLATE_DATA.liveQueueCalendarHref=null;':'');
     const outputHeaders={...response.headers()};
     for(const key of['content-encoding','content-length','transfer-encoding'])delete outputHeaders[key];
     return route.fulfill({status:response.status(),headers:outputHeaders,body:script});
   }
   return route.continue({headers});
 });
 await context.addInitScript(instrument);
 const page=await context.newPage(),cdp=await context.newCDPSession(page);
 await cdp.send('Network.enable');await cdp.send('Network.setCacheDisabled',{cacheDisabled:true});await cdp.send('Emulation.setCPUThrottlingRate',{rate:p.cpu});
 if(p.down)await cdp.send('Network.emulateNetworkConditions',{offline:false,latency:p.latency,downloadThroughput:p.down,uploadThroughput:p.up,connectionType:'cellular4g'});
 page.on('pageerror',e=>row.errors.push(safeError(e)));page.on('console',m=>{if(m.type()==='error')row.consoleErrors.push(safeError(m.text()));});
 try{
   const response=await page.goto(base+'/dudesfizzfest',{waitUntil:'commit',timeout:60000});row.status=response.status();row.pageDataHeader=response.headers()['x-sparkle-page-data'];
   await page.waitForSelector('[data-page-placeholder="events"]',{timeout:30000});row.before=await state(page);
   if(group==='cases')await page.screenshot({path:path.join(out,label+'-pending.png'),fullPage:true});
   await page.waitForFunction(()=>window.__pass5?.hydrated&&window.SPARKLE_PENDING_PAGE_DATA===null,null,{timeout:60000});
   await page.waitForTimeout(1500);row.after=await state(page);
   if(group==='cases'||index===0)await page.screenshot({path:path.join(out,label+'-loaded.png'),fullPage:true});
   row.swapCls=Math.max(0,row.after.cls-(row.after.swapStartCls??row.before.cls));
   row.hydrationErrors=row.errors.concat(row.consoleErrors).filter(x=>/hydration|Minified React error #(418|423|425)/i.test(x));
   row.heightReleased=row.after.cards.every(c=>!c.inlineHeight&&!c.inlineMinHeight&&!c.inlineOverflow);
   row.sanityPass=row.status===200&&row.after.ssr&&row.after.h1===1&&row.after.cls<=.05&&row.hydrationErrors.length===0&&row.after.fcp?.ssr&&row.after.fcp.styles>0;
   if(group==='cases')row.casePass=row.sanityPass&&row.pageDataHeader==='deferred'&&row.before.placeholderCount===2&&row.after.cardCount===count&&row.after.eventSectionPresent===(count>0)&&row.after.placeholderCount===0&&row.heightReleased&&row.swapCls<.01&&row.after.dancersCopies.length===0&&(count!==0||row.after.remainingEventsAreaPx<=50);
 }catch(e){row.error=safeError(e);}
 finally{await context.close();result[group].push(row);save();console.log(JSON.stringify({group,profile,index,expectedEvents:count,status:row.status,casePass:row.casePass,sanityPass:row.sanityPass,cls:row.after?.cls,swapCls:row.swapCls,cards:row.after?.cardCount,reservations:row.after?.placeholderCount,heightReleased:row.heightReleased,error:row.error}));}
}
(async()=>{save();const browser=await chromium.launch({channel:'chrome',headless:true});try{
 for(const p of['desktop','phone'])for(const count of[0,1])await run(browser,'cases',p,0,count);
 for(const p of['desktop','phone'])for(let i=0;i<3;i++)await run(browser,'sanity',p,i);
 }finally{await browser.close();save();}
 console.log('PASS 5 LIGHT ROUND COMPLETE — STOP');
})().catch(e=>{result.fatal=safeError(e);save();console.error(safeError(e));process.exitCode=1;});
