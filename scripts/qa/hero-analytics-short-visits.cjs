/* Actual preview assets; only the configured non-customer QA property records
 * visits. All application writes are blocked. Each visit has a fresh profile. */
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const fs=require('node:fs'),path=require('node:path');
const {authenticatePreview}=require('./preview-auth.cjs');
const {shouldBlockAppWrite}=require('./browser-readonly.cjs');
const [base,output]=process.argv.slice(2);
if(!base?.startsWith('https://sparkle-suite-smoke-')||!base.endsWith('.vercel.app'))throw Error('Exact preview URL required');
fs.mkdirSync(output,{recursive:true});
(async()=>{
 const results=[];
 for(const mode of ['desktop','phone'])for(const seconds of [3,5]){
  const browser=await chromium.launch({channel:'chrome',headless:true,args:process.env.QA_CONTAINER==='1'?['--no-sandbox']:[]});
  const context=await browser.newContext({viewport:mode==='phone'?{width:360,height:800}:{width:1440,height:900},isMobile:mode==='phone',hasTouch:mode==='phone'});
  await authenticatePreview(context,base);
  await context.route('**/*',r=>shouldBlockAppWrite(r.request(),base)?r.abort():r.fallback());
  const events=[],errors=[],page=await context.newPage();
  page.on('pageerror',e=>errors.push(e.message));
  let started=Date.now();
  context.on('request',request=>{
   const u=new URL(request.url());
   if(!u.hostname.endsWith('google-analytics.com')||!u.pathname.endsWith('/g/collect'))return;
   const names=[u.searchParams.get('en'),...(request.postData()||'').split('\n').map(line=>new URLSearchParams(line).get('en'))].filter(Boolean);
   for(const name of names)events.push({name,at:Date.now()-started});
  });
  const cdp=await context.newCDPSession(page);
  if(mode==='phone'){
   await cdp.send('Network.enable');await cdp.send('Network.setCacheDisabled',{cacheDisabled:true});
   await cdp.send('Emulation.setCPUThrottlingRate',{rate:4});
   await cdp.send('Network.emulateNetworkConditions',{offline:false,latency:150,downloadThroughput:200000,uploadThroughput:93750,connectionType:'cellular4g'});
  }
  try{
   started=Date.now();await page.goto(base+'/dudesfizzfest',{waitUntil:'domcontentloaded',timeout:90000});
   await page.waitForFunction(()=>performance.getEntriesByName('first-contentful-paint').length>0,null,{timeout:45000});
   const fcp=await page.evaluate(()=>performance.getEntriesByName('first-contentful-paint')[0].startTime);
   await page.waitForTimeout(Math.max(0,started+fcp+seconds*1000-Date.now()));
   const beforeClose=Date.now()-started;
   await page.close();await new Promise(resolve=>setTimeout(resolve,200));
   const result={mode,secondsAfterFcp:seconds,fcp,closedAt:beforeClose,events,errors,pageViewBeforeClose:events.some(e=>e.name==='page_view'&&e.at<=beforeClose)};
   results.push(result);console.log(JSON.stringify(result));
   fs.writeFileSync(path.join(output,'results.json'),JSON.stringify({base,condition:'fresh profile, no user interaction; navigate away three/five seconds after first contentful paint',results},null,2));
  }finally{await cdp.send('Emulation.setCPUThrottlingRate',{rate:1}).catch(()=>{});await context.close();await browser.close()}
 }
 process.exitCode=results.every(r=>r.pageViewBeforeClose&&!r.errors.length)?0:1;
})().catch(e=>{console.error(e.message);process.exitCode=1});
