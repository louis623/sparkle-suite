// Pass 4 only: five deferred loads, then three desktop and three phone sanity loads.
// No tap tests, forms, writes, other-rep comparisons or timing cohorts.
const fs=require('node:fs'),path=require('node:path');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const [base,out]=process.argv.slice(2);
if(!base||!new URL(base).hostname.endsWith('.vercel.app'))throw Error('Immutable preview URL required');
if(!process.env.VERCEL_OIDC_TOKEN)throw Error('Existing preview authentication required');
fs.mkdirSync(out,{recursive:true});
const resultPath=path.join(out,'browser-results.json');
if(fs.existsSync(resultPath))throw Error('One-round result already exists; do not rerun');
const profiles={desktop:{width:1440,height:1200,cpu:1,mobile:false},phone:{width:390,height:900,cpu:4,mobile:true,down:200000,up:93750,latency:150}};
const results={base,settings:{profiles,locale:'en-US',timeZone:'America/New_York',cache:'disabled',delayMs:5000},deferred:[],sanity:[]};
function save(){fs.writeFileSync(resultPath,JSON.stringify(results,null,2));}
function instrument(){
 const q=window.__pass4={cls:0,errors:[],falseEmpty:[],fcp:null,hydrated:false};
 new PerformanceObserver(list=>{for(const e of list.getEntries())if(!e.hadRecentInput)q.cls+=e.value;}).observe({type:'layout-shift',buffered:true});
 new PerformanceObserver(list=>{for(const e of list.getEntries())if(e.name==='first-contentful-paint'){
   const h=document.querySelector('h1'),root=document.querySelector('#root');
   q.fcp={at:e.startTime,ssr:root?.dataset.serverRendered==='true',font:h?getComputedStyle(h).fontFamily:null,bodyBackground:getComputedStyle(document.body).backgroundColor,styles:document.styleSheets.length};
 }}).observe({type:'paint',buffered:true});
 window.addEventListener('sparkle:homepage-hydrated',()=>q.hydrated=true);
 const observer=new MutationObserver(()=>{if(!window.SPARKLE_PENDING_PAGE_DATA)return;
   const text=document.body?.innerText||'';
   if(/Dancers will appear here|Check back for upcoming shows|No upcoming (?:shows|events)|No events (?:yet|scheduled)/i.test(text))q.falseEmpty.push({at:performance.now(),text:text.match(/.{0,30}(?:Dancers will appear here|Check back for upcoming shows|No upcoming (?:shows|events)|No events (?:yet|scheduled)).{0,70}/i)?.[0]});
 });observer.observe(document,{childList:true,subtree:true,characterData:true});
}
async function state(page){return page.evaluate(()=>{
 const rect=selector=>{const e=document.querySelector(selector);if(!e)return null;const r=e.getBoundingClientRect();return{top:r.top+scrollY,height:r.height,width:r.width};};
 const text=document.body?.innerText||'';
 return{...window.__pass4,pending:window.SPARKLE_PENDING_PAGE_DATA||null,ssr:document.querySelector('#root')?.dataset.serverRendered==='true',h1:document.querySelectorAll('h1').length,placeholders:[...document.querySelectorAll('[data-page-placeholder]')].map(x=>x.dataset.pagePlaceholder),falseCopy:/Dancers will appear here|Check back for upcoming shows|No upcoming (?:shows|events)|No events (?:yet|scheduled)/i.test(text),times:[...document.querySelectorAll('.hp-event-meta')].map(x=>x.innerText),eventGrid:rect('.hp-event-grid'),afterEvents:rect('#wibp'),pageHeight:document.documentElement.scrollHeight,theme:window.HOMEPAGE_TWEAK_DEFAULTS?.preset};
 });}
async function run(browser,group,profile,index){
 const p=profiles[profile],label=`${group}-${profile}-${index}`,row={profile,index,errors:[],consoleErrors:[],writesBlocked:[]};
 const context=await browser.newContext({viewport:{width:p.width,height:p.height},isMobile:p.mobile,hasTouch:true,locale:'en-US',timezoneId:'America/New_York'});
 await context.route('**/*',async route=>{
   const request=route.request(),url=new URL(request.url());
   if(!['GET','HEAD'].includes(request.method())){row.writesBlocked.push({method:request.method(),path:url.pathname});return route.abort();}
   const headers={...request.headers()};if(url.origin===base)headers['x-vercel-trusted-oidc-idp-token']=process.env.VERCEL_OIDC_TOKEN;
   return route.continue({headers});
 });
 await context.addInitScript(instrument);
 const page=await context.newPage(),cdp=await context.newCDPSession(page);
 await cdp.send('Network.enable');await cdp.send('Network.setCacheDisabled',{cacheDisabled:true});await cdp.send('Emulation.setCPUThrottlingRate',{rate:p.cpu});
 if(p.down)await cdp.send('Network.emulateNetworkConditions',{offline:false,latency:p.latency,downloadThroughput:p.down,uploadThroughput:p.up,connectionType:'cellular4g'});
 page.on('pageerror',e=>row.errors.push(e.message));page.on('console',m=>{if(m.type()==='error')row.consoleErrors.push(m.text());});
 try{
   const response=await page.goto(base+'/dudesfizzfest',{waitUntil:'commit',timeout:60000});row.status=response.status();row.pageDataHeader=response.headers()['x-sparkle-page-data'];
   await page.waitForSelector('[data-page-placeholder="trades"]',{timeout:30000});
   row.before=await state(page);
   if(index===0)await page.screenshot({path:path.join(out,label+'-pending.png'),fullPage:true});
   await page.waitForFunction(()=>window.__pass4?.hydrated&&window.SPARKLE_PENDING_PAGE_DATA===null,null,{timeout:60000});
   await page.waitForTimeout(1500);row.after=await state(page);
   if(index===0)await page.screenshot({path:path.join(out,label+'-loaded.png'),fullPage:true});
   row.hydrationErrors=row.errors.concat(row.consoleErrors).filter(x=>/hydration|Minified React error #(418|423|425)/i.test(x));
   row.swapGeometryUnchanged=JSON.stringify(row.before.eventGrid)===JSON.stringify(row.after.eventGrid)&&JSON.stringify(row.before.afterEvents)===JSON.stringify(row.after.afterEvents)&&row.before.pageHeight===row.after.pageHeight;
   row.deferredPass=row.status===200&&row.pageDataHeader==='deferred'&&row.before.pending&&row.before.placeholders.includes('trades')&&row.before.placeholders.includes('events')&&!row.before.falseCopy&&row.after.falseEmpty.length===0;
   row.sanityPass=row.status===200&&row.after.ssr&&row.after.h1===1&&row.after.cls<=.05&&row.hydrationErrors.length===0&&row.after.times.length>0&&row.after.times.every(t=>t.includes('EDT'))&&row.after.fcp?.ssr&&row.after.fcp.styles>0;
 }catch(e){row.error=e.message;}
 finally{await context.close();results[group].push(row);save();console.log(JSON.stringify({group,profile,index,status:row.status,deferred:row.deferredPass,sanity:row.sanityPass,cls:row.after?.cls,swapGeometryUnchanged:row.swapGeometryUnchanged,error:row.error}));}
}
(async()=>{save();const browser=await chromium.launch({channel:'chrome',headless:true});try{
 for(let i=0;i<5;i++)await run(browser,'deferred','desktop',i);
 for(const p of['desktop','phone'])for(let i=0;i<3;i++)await run(browser,'sanity',p,i);
 }finally{await browser.close();save();}
 console.log('PASS 4 LIGHT ROUND COMPLETE — STOP');
})().catch(e=>{results.fatal=e.message;save();console.error(e.message);process.exitCode=1;});
