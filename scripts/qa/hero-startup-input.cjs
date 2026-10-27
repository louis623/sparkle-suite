// One deployed round. One native touch per fresh navigation: no skipped windows.
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const [base, off, out] = process.argv.slice(2), live = 'https://www.yoursparklesuite.com';
for (const url of [base, off]) if (!new URL(url).hostname.endsWith('.vercel.app')) throw Error('Preview required');
fs.mkdirSync(out, { recursive: true });
const profiles = [{ name:'desktop', width:1440, height:1200, cpu:1, mobile:false }, { name:'slow-phone', width:390, height:900, cpu:4, mobile:true, down:200000, up:93750, latency:150 }];
const result = { base, off, settings:{ profiles, runs:5, locale:'en-US', offsets:[0,100,200,500,1000,2000], cache:'disabled', desktopHeightReason:'Original motion button visible without scrolling', input:'Native CDP touches, one per fresh navigation. Shop navigation prevented for timing. App non-GET/HEAD requests blocked.' }, performance:[], input:[], visual:[], parity:[], fallback:[], ttfb:[] };
const save = () => fs.writeFileSync(path.join(out,'results.json'), JSON.stringify(result,null,2));
function instrument(config) {
  const q = window.__qa = { timeOrigin:performance.timeOrigin, lcp:null, cls:0, events:[], clicks:[], hero:null, hydrated:null, fcp:null, eventTiming:PerformanceObserver.supportedEntryTypes.includes('event') };
  new MutationObserver(() => { q.hero ??= document.querySelector('.hp-hero'); }).observe(document,{childList:true,subtree:true});
  new PerformanceObserver(l => l.getEntries().forEach(e => {q.lcp=e.startTime;q.lcpEntry={url:e.url,tag:e.element?.tagName,text:e.element?.textContent?.slice(0,120),renderTime:e.renderTime,loadTime:e.loadTime,size:e.size};})).observe({type:'largest-contentful-paint',buffered:true});
  new PerformanceObserver(l => l.getEntries().forEach(e => { if(!e.hadRecentInput)q.cls+=e.value; })).observe({type:'layout-shift',buffered:true});
  if(q.eventTiming)new PerformanceObserver(l => l.getEntries().forEach(e => { if(e.interactionId)q.events.push({at:e.startTime,duration:e.duration,delay:e.processingStart-e.startTime}); })).observe({type:'event',buffered:true,durationThreshold:16});
  window.addEventListener('sparkle:homepage-hydrated',()=>q.hydrated=performance.now());
  document.addEventListener('click',e=>{
    const el=config&&e.target.closest(config.selector);if(!el)return;
    const click={at:e.timeStamp,handled:performance.now(),trusted:e.isTrusted};q.clicks.push(click);
    if(el.tagName==='A')e.preventDefault();
    requestAnimationFrame(()=>requestAnimationFrame(()=>Object.assign(click,{painted:performance.now(),after:el.textContent,pressed:el.getAttribute('aria-pressed')})));
  },true);
  new PerformanceObserver(l=>{for(const e of l.getEntries())if(e.name==='first-contentful-paint'){
    q.fcp=e.startTime;if(config){const el=document.querySelector(config.selector),r=el?.getBoundingClientRect(),point=r?{x:r.x+r.width/2,y:r.y+r.height/2}:null;
      window.qaFirstPaint({at:e.startTime,epoch:performance.timeOrigin+e.startTime,point,visible:!!point&&point.x>=0&&point.x<innerWidth&&point.y>=0&&point.y<innerHeight,before:el?.textContent,pressed:el?.getAttribute('aria-pressed')});}
  }}).observe({type:'paint',buffered:true});
}
async function setup(browser,p,timezone,input){
  const context=await browser.newContext({viewport:{width:p.width,height:p.height},hasTouch:true,isMobile:p.mobile,timezoneId:timezone,locale:'en-US'});
  const s={context,errors:[],console:[],scripts:[],writesBlocked:[],frames:[]};
  await context.route('**/*',async route=>{const req=route.request(),origin=new URL(req.url()).origin;
    if([base,off,live].includes(origin)&&!['GET','HEAD'].includes(req.method())){s.writesBlocked.push(new URL(req.url()).pathname);return route.abort();}
    const headers={...req.headers()};if([base,off].includes(origin)&&process.env.VERCEL_OIDC_TOKEN)headers['x-vercel-trusted-oidc-idp-token']=process.env.VERCEL_OIDC_TOKEN;
    return route.continue({headers});});
  const page=s.page=await context.newPage(),cdp=s.cdp=await context.newCDPSession(page);
  await cdp.send('Network.enable');await cdp.send('Network.setCacheDisabled',{cacheDisabled:true});await cdp.send('Emulation.setCPUThrottlingRate',{rate:p.cpu});
  if(p.down)await cdp.send('Network.emulateNetworkConditions',{offline:false,latency:p.latency,downloadThroughput:p.down,uploadThroughput:p.up,connectionType:'cellular4g'});
  page.on('pageerror',e=>s.errors.push(e.message));page.on('console',m=>{if(m.type()==='error')s.console.push(m.text());});page.on('request',r=>{if(r.resourceType()==='script')s.scripts.push(r.url());});
  if(input){let resolve;s.dispatched=new Promise(r=>resolve=r);await context.exposeBinding('qaFirstPaint',async(_source,paint)=>{
    s.paint=paint;if(!paint.visible){s.dispatch={missingOrOffscreen:true};resolve();return;}
    const deadline=paint.epoch+input.offset;await new Promise(r=>setTimeout(r,Math.max(0,deadline-Date.now())));
    s.dispatch={epoch:Date.now(),lateBy:Math.max(0,Date.now()-deadline)};
    try{await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[paint.point]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});}catch(e){s.dispatch.error=e.message;}resolve();});}
  await context.addInitScript(instrument,input||null);return s;
}
async function proof(s){return{...await s.page.evaluate(()=>{const{hero,...q}=window.__qa,v=document.querySelector('.hpc-video'),b=document.querySelector('.hpc-motion-control');return{...q,navigation:performance.getEntriesByType("navigation")[0]?.toJSON(),resources:performance.getEntriesByType("resource").map(e=>({name:e.name,duration:e.duration,transferSize:e.transferSize,responseEnd:e.responseEnd})).sort((a,b)=>b.duration-a.duration).slice(0,15),retained:hero===document.querySelector('.hp-hero'),ssr:document.querySelector('#root')?.dataset.serverRendered==='true',h1:document.querySelectorAll('h1').length,header:document.querySelector('.hp-header')?.outerHTML,shows:[...document.querySelectorAll('.hp-event-meta')].map(e=>e.textContent.trim()),updated:[...document.querySelectorAll('.hp-lineup-status,.hp-trade-preview-updated')].map(e=>e.textContent),motion:{saved:window.HOMEPAGE_TWEAK_DEFAULTS?.heroMotion,button:b?.textContent,pressed:b?.getAttribute('aria-pressed'),time:v?.currentTime,paused:v?.paused},businessName:window.AMETHYST_HOMEPAGE_TEMPLATE_DATA?.businessName,title:document.title,description:document.querySelector('meta[name="description"]')?.content,canonical:document.querySelector('link[rel="canonical"]')?.href,jsonLd:[...document.querySelectorAll('script[type="application/ld+json"]')].map(e=>e.textContent),styles:[...document.querySelectorAll('link[rel="stylesheet"]')].map(e=>e.href)};}),errors:s.errors,console:s.console,scripts:s.scripts,writesBlocked:s.writesBlocked,paint:s.paint,dispatch:s.dispatch};}
async function capture(browser,p,timezone,origin,index,visual=false){
  const s=await setup(browser,p,timezone),label=`${p.name}-${timezone.split('/')[1]}-${origin===live?'live':'preview'}`;
  try{if(index===0&&origin===base&&!visual){s.cdp.on('Page.screencastFrame',async f=>{if(s.frames.length<100){const file=`${label}-frame-${String(s.frames.length).padStart(3,'0')}.jpg`;fs.writeFileSync(path.join(out,file),Buffer.from(f.data,'base64'));s.frames.push({file,time:f.metadata.timestamp});}await s.cdp.send('Page.screencastFrameAck',{sessionId:f.sessionId}).catch(()=>{});});await s.cdp.send('Page.startScreencast',{format:'jpeg',quality:70,maxWidth:p.width,maxHeight:p.height,everyNthFrame:1});}
    const response=await s.page.goto(origin+'/dudesfizzfest',{waitUntil:'domcontentloaded',timeout:90000});await s.page.waitForTimeout(12000);
    if(s.frames.length)await s.cdp.send('Page.stopScreencast');if(index===0)await s.page.screenshot({path:path.join(out,label+'.png'),fullPage:true});
    const row={profile:p.name,timezone,origin,index,status:response.status(),frames:s.frames,...await proof(s)};(visual?result.visual:result.performance).push(row);console.log(JSON.stringify({type:visual?'visual':'performance',profile:p.name,timezone,origin,index,lcp:row.lcp,cls:row.cls,ssr:row.ssr}));
  }catch(e){(visual?result.visual:result.performance).push({profile:p.name,timezone,origin,index,error:e.message});}finally{await s.context.close();save();}
}
async function read(url,extra={}){const headers={...extra};if([base,off].includes(new URL(url).origin)&&process.env.VERCEL_OIDC_TOKEN)headers['x-vercel-trusted-oidc-idp-token']=process.env.VERCEL_OIDC_TOKEN;
  const start=performance.now(),r=await fetch(url,{headers,redirect:'manual',signal:AbortSignal.timeout(60000)}),ttfb=performance.now()-start,bytes=Buffer.from(await r.arrayBuffer());return{status:r.status,hash:crypto.createHash('sha256').update(bytes).digest('hex'),bytes:bytes.length,ttfb,etag:r.headers.get('etag'),location:r.headers.get('location'),body:bytes.toString()};}
async function pair(name,leftUrl,rightUrl,headers){try{const{body:a,...left}=await read(leftUrl),{body:b,...right}=await read(rightUrl,headers);let at=-1;if(left.hash!==right.hash){for(let i=0;i<Math.min(a.length,b.length);i++)if(a[i]!==b[i]){at=i;break;}}
  result.parity.push({name,leftUrl,rightUrl,left,right,matches:left.status===right.status&&left.hash===right.hash,differentAt:at,difference:at>=0?{live:a.slice(Math.max(0,at-70),at+180),preview:b.slice(Math.max(0,at-70),at+180)}:undefined});}catch(e){result.parity.push({name,error:e.message});}save();}
(async()=>{
  // Preflight is outside measurements; a building/auth page is never a result.
  for(const origin of[base,off]){const r=await read(origin+'/dudesfizzfest');if(r.status!==200||!r.body.includes('Fizz Festival'))throw Error('Target application not ready/access denied: '+origin);}
  const browser=await chromium.launch({channel:'chrome',headless:true});
  try{for(const p of profiles){
    for(const origin of[base,live])for(let i=0;i<5;i++)await capture(browser,p,'America/New_York',origin,i);
    for(const origin of[base,live])await capture(browser,p,'America/Los_Angeles',origin,0,true);
    for(const[name,selector]of[['Shop','.hp-shop-btn'],['Play/Pause','.hpc-motion-control']])for(const offset of result.settings.offsets)for(let i=0;i<5;i++){
      const input={name,selector,offset},s=await setup(browser,p,'America/New_York',input);let timeout;
      try{const response=await s.page.goto(base+'/dudesfizzfest',{waitUntil:'commit',timeout:60000});await Promise.race([s.dispatched,new Promise((_,reject)=>timeout=setTimeout(()=>reject(Error('No FCP dispatch within 30s')),30000))]);clearTimeout(timeout);await s.page.waitForTimeout(1200);
        const row={profile:p.name,index:i,...input,status:response.status(),...await proof(s)};result.input.push(row);console.log(JSON.stringify({type:'input',profile:p.name,name,offset,index:i,dispatch:row.dispatch,clicks:row.clicks.length,errors:row.errors.length}));
      }catch(e){result.input.push({profile:p.name,index:i,...input,error:e.message,dispatch:s.dispatch});}finally{clearTimeout(timeout);await s.context.close();save();}
    }
  }}finally{await browser.close();}
  const inventory=JSON.parse(fs.readFileSync(process.env.QA_REP_INVENTORY,'utf8'));result.inventory=inventory;
  for(const rep of inventory.reps.filter(r=>r.slug!=='dudesfizzfest')){
    for(const page of['','/trade','/join'])await pair(`slug:${rep.slug}${page}`,`${live}/${rep.slug}${page}`,`${base}/${rep.slug}${page}`);
    for(const domain of rep.domains)for(const page of['/','/trade','/join'])await pair(`domain:${domain}${page}`,`https://${domain}${page}`,`${base}${page}`,{'x-forwarded-host':domain});
  }
  const skins=['amethyst','gnome_garden','neon_butterfly','halloween_pumpkin_witch','halloween_pumpkin_cat','gilded_autumn','rose_gold','midnight_rose','fall_owl_harvest_moon','gobble_and_fizz','pie_please','pearl_rose','rose_champagne','sunset_beach'];
  for(const skin of skins)for(const page of['homepage','trade','join','unsubscribe'])await pair(`skin:${skin}/${page}`,`${live}/skin-preview/${skin}/${page}`,`${base}/skin-preview/${skin}/${page}`);
  for(const theme of skins.filter(s=>!['gnome_garden','neon_butterfly','rose_gold'].includes(s)))await pair(`community:${theme}`,`${live}/api/public/community-theme-preview?theme=${theme}`,`${base}/api/public/community-theme-preview?theme=${theme}`);
  for(const route of['/api/public/landing-demo/preview','/portfolio','/marketing/chasing-unicorns','/amethyst/homepage.jsx','/amethyst/%68omepage.jsx','/amethyst/homepage%2Ejsx','/%61methyst/homepage.jsx'])await pair(route,live+route,base+route);
  for(const name of['forest','forest-mobile','gnome','lantern','storybook-original'])await pair(`gnome-image:${name}`,`${live}/amethyst/skins/gnome-garden/${name}.webp`,`${base}/amethyst/skins/gnome-garden/${name}.webp`);
  for(const origin of[live,base]){await read(origin+'/dudesfizzfest');for(let i=0;i<5;i++){const r=await read(origin+'/dudesfizzfest');result.ttfb.push({origin,index:i,milliseconds:r.ttfb,status:r.status});}}
  const original=await read(live+'/dudesfizzfest');
  for(const[name,origin,headers]of[['empty-allowlist',off,{}],['forced-render-failure',base,{'x-ssr-render-failure':process.env.SSR_PREVIEW_PROBE_SECRET}]]){const r=await read(origin+'/dudesfizzfest',headers);result.fallback.push({name,status:r.status,hash:r.hash,liveHash:original.hash,matches:r.status===original.status&&r.hash===original.hash,ssr:r.body.includes('data-server-rendered="true"')});}
  save();console.log('ONE MEASUREMENT ROUND COMPLETE — STOP');
})().catch(e=>{result.fatal=e.message;save();console.error(e.message);process.exitCode=1;});
