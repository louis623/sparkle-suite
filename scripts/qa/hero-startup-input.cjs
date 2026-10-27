// SSR Chunk 1 Pass 3: one deployed round, no forms or writes.
const fs=require('node:fs'),path=require('node:path');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const {normalizeRepResponse,garbledSequences,hash}=require('./normalize-rep-response.cjs');
const [on,off,out]=process.argv.slice(2),live='https://www.yoursparklesuite.com';
for(const u of[on,off])if(!new URL(u).hostname.endsWith('.vercel.app'))throw Error('Immutable previews required');
fs.mkdirSync(out,{recursive:true});
const profiles=[{name:'desktop',width:1440,height:1200,cpu:1,mobile:false},{name:'phone',width:390,height:900,cpu:4,mobile:true,down:200000,up:93750,latency:150}];
const result={on,off,settings:{profiles,performanceRuns:10,locale:'en-US',timeZone:'America/New_York',visualTimeZones:['America/New_York','America/Los_Angeles'],offsets:[0,100,200,500,1000,2000],inputRunsPerSlot:5,responsePairs:60,inputMetric:'PerformanceEventTiming.duration only; no dispatch-time latency',cache:'disabled',writes:'All browser non-GET/HEAD requests blocked. No forms submitted.',shop:'Default navigation prevented; native click processing/paint measured.'},performance:[],visual:[],input:[],parity:[],responses:[],fallback:[],source:[]};
const save=()=>fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(result,null,2));
const auth=url=>[on,off].includes(new URL(url).origin)&&process.env.VERCEL_OIDC_TOKEN?{'x-vercel-trusted-oidc-idp-token':process.env.VERCEL_OIDC_TOKEN}:{};
async function read(url,extra={}){const start=performance.now(),r=await fetch(url,{headers:{...auth(url),...extra},redirect:'manual',signal:AbortSignal.timeout(60000)}),ttfb=performance.now()-start,bytes=Buffer.from(await r.arrayBuffer()),body=bytes.toString('utf8'),textual=/text|javascript|json|svg/.test(r.headers.get('content-type')||'');return{status:r.status,ttfb,hash:hash(bytes),normalizedHash:hash(textual?normalizeRepResponse(body):bytes),etag:r.headers.get('etag'),location:r.headers.get('location'),cache:r.headers.get('x-vercel-cache'),ssr:body.includes('data-server-rendered="true"'),deferred:body.includes('window.SPARKLE_DEFERRED_PAGE_DATA='),garbled:textual?garbledSequences(body):[],body};}
function install(input){
 const q=window.__qa={origin:performance.timeOrigin,fcp:null,lcp:null,cls:0,events:[],clicks:[],labels:[],hydrationStart:null,hydrated:null,eventTiming:PerformanceObserver.supportedEntryTypes.includes('event')};
 let reactDom;Object.defineProperty(window,'ReactDOM',{configurable:true,get(){return reactDom},set(value){reactDom=value;if(value?.hydrateRoot){const original=value.hydrateRoot;reactDom={...value,hydrateRoot(...args){q.hydrationStart=performance.now();return original.apply(value,args);}};}}});
 new PerformanceObserver(list=>list.getEntries().forEach(e=>{if(e.name==='first-contentful-paint'){q.fcp=e.startTime;if(input){const el=document.querySelector(input.selector),b=el?.getBoundingClientRect();window.qaFirstPaint({epoch:performance.timeOrigin+e.startTime,point:b?{x:b.x+b.width/2,y:b.y+b.height/2}:null});}}})).observe({type:'paint',buffered:true});
 new PerformanceObserver(list=>list.getEntries().forEach(e=>{q.lcp=e.startTime;q.lcpEntry={url:e.url,tag:e.element?.tagName,renderTime:e.renderTime,loadTime:e.loadTime};})).observe({type:'largest-contentful-paint',buffered:true});
 new PerformanceObserver(list=>list.getEntries().forEach(e=>{if(!e.hadRecentInput)q.cls+=e.value;})).observe({type:'layout-shift',buffered:true});
 if(q.eventTiming)new PerformanceObserver(list=>list.getEntries().forEach(e=>{if(e.interactionId)q.events.push({at:e.startTime,duration:e.duration,processingStart:e.processingStart,processingEnd:e.processingEnd,interactionId:e.interactionId,type:e.name,target:e.target?.className||null});})).observe({type:'event',buffered:true,durationThreshold:16});
 window.addEventListener('sparkle:homepage-hydrated',()=>q.hydrated=performance.now());
 new MutationObserver(()=>{const b=document.querySelector('.hpc-motion-control');if(b&&q.labels.at(-1)!==b.textContent)q.labels.push(b.textContent);}).observe(document,{subtree:true,childList:true,characterData:true});
 document.addEventListener('click',e=>{const el=input&&e.target.closest(input.selector);if(!el)return;q.clicks.push({at:e.timeStamp,trusted:e.isTrusted});if(el.tagName==='A')e.preventDefault();},true);
}
async function setup(browser,p,zone,input,hold=false){
 const context=await browser.newContext({viewport:{width:p.width,height:p.height},hasTouch:true,isMobile:p.mobile,timezoneId:zone,locale:'en-US'}),s={context,errors:[],console:[],scripts:[],blockedWrites:[]};
 let release;const gate=new Promise(r=>release=r);s.release=release;
 await context.route('**/*',async route=>{const r=route.request(),u=new URL(r.url());if(!['GET','HEAD'].includes(r.method())){s.blockedWrites.push({origin:u.origin,path:u.pathname,method:r.method()});return route.abort();}if(hold&&u.pathname==='/amethyst/compiled/homepage.js')await gate;return route.continue({headers:{...r.headers(),...auth(r.url())}});});
 const page=s.page=await context.newPage(),cdp=s.cdp=await context.newCDPSession(page);await page.bringToFront();
 await cdp.send('Network.enable');await cdp.send('Network.setCacheDisabled',{cacheDisabled:true});await cdp.send('Emulation.setCPUThrottlingRate',{rate:p.cpu});
 if(p.down)await cdp.send('Network.emulateNetworkConditions',{offline:false,latency:p.latency,downloadThroughput:p.down,uploadThroughput:p.up,connectionType:'cellular4g'});
 page.on('pageerror',e=>s.errors.push(e.message));page.on('console',m=>{if(m.type()==='error')s.console.push(m.text());});page.on('request',r=>{if(r.resourceType()==='script')s.scripts.push(r.url());});
 if(input&&input.phase==='fcp'){
  let resolve;s.dispatched=new Promise(r=>resolve=r);
  await context.exposeBinding('qaFirstPaint',async(source,paint)=>{if(source.frame!==page.mainFrame())return;s.paint=paint;const point=paint.point;if(!point||point.x<0||point.x>p.width||point.y<0||point.y>p.height){s.missing=true;resolve();return;}
   const due=paint.epoch+input.offset;await new Promise(r=>setTimeout(r,Math.max(0,due-Date.now())));s.lateBy=Math.max(0,Date.now()-due);await touch(s,point);resolve();});
 }
 await context.addInitScript(install,input||null);return s;
}
async function touch(s,point){await Promise.all([s.cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[point]}),s.cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]})]);}
async function proof(s){return{...await s.page.evaluate(()=>{const q=window.__qa,b=document.querySelector('.hpc-motion-control'),v=document.querySelector('.hpc-video');return{...q,ssr:document.querySelector('#root')?.dataset.serverRendered==='true',h1:document.querySelectorAll('h1').length,times:[...document.querySelectorAll('[data-sparkle-local-time]')].map(x=>x.textContent),eventMeta:[...document.querySelectorAll('.hp-event-meta')].map(x=>x.textContent),header:document.querySelector('.hp-header')?.outerHTML,motion:{saved:window.HOMEPAGE_TWEAK_DEFAULTS?.heroMotion,button:b?.textContent,pressed:b?.getAttribute('aria-pressed'),paused:v?.paused,time:v?.currentTime,muted:v?.muted,playingAudio:[...document.querySelectorAll('audio')].filter(a=>!a.paused).length},navigation:performance.getEntriesByType('navigation')[0]?.toJSON()};}),errors:s.errors,console:s.console,scripts:s.scripts,blockedWrites:s.blockedWrites,dispatchLateBy:s.lateBy,missing:s.missing};}
async function perf(browser,p,index){const s=await setup(browser,p,'America/New_York');try{const r=await s.page.goto(on+'/dudesfizzfest',{waitUntil:'domcontentloaded',timeout:90000});await s.page.waitForTimeout(12000);const row={profile:p.name,index,status:r.status(),...await proof(s)};result.performance.push(row);console.log(JSON.stringify({type:'performance',profile:p.name,index,lcp:row.lcp,cls:row.cls,ssr:row.ssr}));}catch(e){result.performance.push({profile:p.name,index,error:e.message});}finally{await s.context.close();save();}}
async function visual(browser,p,zone,origin){const held=origin===on,s=await setup(browser,p,zone,null,held),label=`${p.name}-${zone.split('/')[1]}-${held?'preview':'live'}`;try{
 await s.page.goto(origin+'/dudesfizzfest',{waitUntil:'commit',timeout:90000});
 if(held){await s.page.waitForFunction(()=>typeof window.__qa?.fcp==='number',null,{timeout:60000});await s.page.screenshot({path:path.join(out,label+'-before-hydration.png'),fullPage:true});const before=await proof(s);result.visual.push({profile:p.name,zone,origin,phase:'before-hydration',...before});s.release();await s.page.waitForFunction(()=>!!window.__qa?.hydrated,null,{timeout:60000});}
 else await s.page.waitForLoadState('domcontentloaded');
 await s.page.waitForTimeout(12000);await s.page.screenshot({path:path.join(out,label+'-final.png'),fullPage:true});result.visual.push({profile:p.name,zone,origin,phase:'final',...await proof(s)});
 }catch(e){result.visual.push({profile:p.name,zone,origin,error:e.message});}finally{s.release();await s.context.close();save();}}
async function inputRun(browser,p,name,selector,phase,index,offset){const held=phase==='hydration',input={name,selector,phase,offset},s=await setup(browser,p,'America/New_York',input,held);let timer;try{
 await s.page.goto(on+'/dudesfizzfest',{waitUntil:'commit',timeout:90000});
 if(held){await s.page.waitForFunction(()=>typeof window.__qa?.fcp==='number');const b=await s.page.locator(selector).boundingBox();s.release();await new Promise(r=>setTimeout(r,50+index*50));if(b)await touch(s,{x:b.x+b.width/2,y:b.y+b.height/2});else s.missing=true;}
 else await Promise.race([s.dispatched,new Promise((_,reject)=>timer=setTimeout(()=>reject(Error('No FCP dispatch')),30000))]);
 clearTimeout(timer);await s.page.waitForTimeout(1800);const row={profile:p.name,index,...input,...await proof(s)};row.maxEventTiming=row.events.length?Math.max(...row.events.map(e=>e.duration)):null;row.duringHydration=row.events.filter(e=>row.hydrationStart!==null&&row.hydrated!==null&&e.at<=row.hydrated&&e.at+e.duration>=row.hydrationStart).length;result.input.push(row);console.log(JSON.stringify({type:'input',profile:p.name,name,phase,offset,index,eventMax:row.maxEventTiming,duringHydration:row.duringHydration,clicks:row.clicks.length}));
 }catch(e){result.input.push({profile:p.name,index,...input,error:e.message});}finally{clearTimeout(timer);s.release();await s.context.close();save();}}
async function pair(name,left,right){try{const a=await read(left),b=await read(right),na=normalizeRepResponse(a.body),nb=normalizeRepResponse(b.body);let at=-1;if(na!==nb)for(let i=0;i<Math.min(na.length,nb.length);i++)if(na[i]!==nb[i]){at=i;break;}delete a.body;delete b.body;result.parity.push({name,left,right,a,b,matches:a.status===b.status&&a.normalizedHash===b.normalizedHash&&normalizeRepResponse(a.location||'')===normalizeRepResponse(b.location||''),differentAt:at,difference:at<0?undefined:{live:na.slice(Math.max(0,at-60),at+160),preview:nb.slice(Math.max(0,at-60),at+160)}});}catch(e){result.parity.push({name,error:e.message});}save();}
(async()=>{
 for(const base of[on,off]){const r=await read(base+'/dudesfizzfest');if(r.status!==200||!r.body.includes('Fizz Festival'))throw Error('Preview not ready or protected: '+base);}
 // The response experiment is one contiguous alternating ON/OFF cohort.
 for(let i=0;i<60;i++)for(const[mode,base]of[['ON',on],['OFF',off]]){const r=await read(base+'/dudesfizzfest');delete r.body;result.responses.push({mode,index:i,...r});save();}
 const a=await read(off+'/dudesfizzfest'),b=await read(on+'/dudesfizzfest',{'x-ssr-render-failure':process.env.SSR_PREVIEW_PROBE_SECRET});result.fallback.push({off:{status:a.status,hash:a.hash,ssr:a.ssr},forced:{status:b.status,hash:b.hash,ssr:b.ssr},matches:a.status===b.status&&a.hash===b.hash});save();
 for(const route of['/amethyst/compiled/homepage.js','/amethyst/homepage.jsx']){const r=await read(on+route);delete r.body;result.source.push({route,...r});}
 const browser=await chromium.launch({channel:'chrome',headless:true});try{for(const p of profiles){
  for(let i=0;i<10;i++)await perf(browser,p,i);
  for(const zone of['America/New_York','America/Los_Angeles'])for(const origin of[on,live])await visual(browser,p,zone,origin);
  for(const[name,selector]of[['Shop','.hp-shop-btn'],['Play/Pause','.hpc-motion-control']]){
   for(const offset of result.settings.offsets)for(let i=0;i<5;i++)await inputRun(browser,p,name,selector,'fcp',i,offset);
   for(let i=0;i<5;i++)await inputRun(browser,p,name,selector,'hydration',i,null);
  }
 }}finally{await browser.close();}
 for(const page of['/trade','/join'])await pair('slug:dudesfizzfest'+page,live+'/dudesfizzfest'+page,on+'/dudesfizzfest'+page);
 const inventory=JSON.parse(fs.readFileSync(process.env.QA_REP_INVENTORY,'utf8'));result.inventory=inventory;
 for(const rep of inventory.reps.filter(r=>r.slug!=='dudesfizzfest')){
  for(const page of['','/trade','/join'])await pair(`slug:${rep.slug}${page}`,live+'/'+rep.slug+page,on+'/'+rep.slug+page);
  // Use the existing internal customer-site renderer; no Host spoof or alias move.
  for(const domain of rep.domains)for(const[publicPath,page]of[['/','home'],['/trade','trade'],['/join','join']]){
   const route=`/customer-site/${page}?c=${encodeURIComponent(domain)}`;
   await pair(`domain:${domain}${publicPath}`,`https://${domain}${publicPath}`,on+route);
   await pair(`domain-renderer:${domain}${publicPath}`,live+route,on+route);
  }
 }
 const skins=['amethyst','gnome_garden','neon_butterfly','halloween_pumpkin_witch','halloween_pumpkin_cat','gilded_autumn','rose_gold','midnight_rose','fall_owl_harvest_moon','gobble_and_fizz','pie_please','pearl_rose','rose_champagne','sunset_beach'];
 for(const skin of skins)for(const page of['homepage','trade','join','unsubscribe'])await pair(`skin:${skin}/${page}`,`${live}/skin-preview/${skin}/${page}`,`${on}/skin-preview/${skin}/${page}`);
 for(const skin of skins.filter(s=>!['gnome_garden','neon_butterfly','rose_gold'].includes(s)))await pair(`community:${skin}`,`${live}/api/public/community-theme-preview?theme=${skin}`,`${on}/api/public/community-theme-preview?theme=${skin}`);
 for(const route of['/','/demo','/api/public/landing-demo/preview','/portfolio','/marketing/chasing-unicorns','/amethyst/homepage.jsx','/amethyst/%68omepage.jsx','/amethyst/homepage%2Ejsx','/%61methyst/homepage.jsx'])await pair(route,live+route,on+route);
 for(const name of['forest','forest-mobile','gnome','lantern','storybook-original'])await pair(`gnome:${name}`,`${live}/amethyst/skins/gnome-garden/${name}.webp`,`${on}/amethyst/skins/gnome-garden/${name}.webp`);
 save();console.log('ONE PASS 3 MEASUREMENT ROUND COMPLETE — STOP');
})().catch(e=>{result.fatal=e.message;save();console.error(e.message);process.exitCode=1;});
