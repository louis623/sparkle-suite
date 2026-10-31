// Deferred Smoke A/B acceptance. No deployments, alias mutations, DB access or forms.
// Usage: PLAYWRIGHT_MODULE=/path/to/playwright node scripts/qa/ssr-smoke-ab.cjs config.json output.json
const fs=require('node:fs');
const {median,verdict}=require('./ssr-smoke-ab-metrics.cjs');
const PROJECT='prj_VTY0rpz2O3VBJqJv69iBz8tzLexQ';
const pages=[['halloween_pumpkin_cat','homepage'],['fall_owl_harvest_moon','homepage'],['midnight_rose','homepage'],['rose_gold','homepage'],['pearl_rose','join'],['midnight_rose','join'],['alpine_opal','trade']];
const interactions=['amethyst','fall_owl_harvest_moon'];
function targetsFor(renderer){return [...new Map([...pages,...(renderer==='baseline53'?[]:interactions.map(t=>[t,'homepage']))].map(pair=>[pair.join('/'),pair])).values()];}
// Raw metadata never escapes this wrapper. Select fields rather than redacting a
// serialized response: Vercel can add new protection fields without leaking them.
async function vercelRecord(path,kind) {
  const r=await fetch('https://api.vercel.com'+path,{headers:{Authorization:'Bearer '+process.env.VERCEL_TOKEN},signal:AbortSignal.timeout(30000)});
  if(!r.ok)throw Error('Vercel read failed: HTTP '+r.status);
  const j=await r.json();
  return kind==='alias' ? {alias:j.alias,deploymentId:j.deploymentId||j.deployment?.id,projectId:j.projectId}
    : {id:j.id,url:j.url,projectId:j.projectId,sha:j.gitSource?.sha||j.meta?.githubCommitSha,readyState:j.readyState};
}
function safeOrigin(input) {
  const u=new URL(input);
  if(u.protocol!=='https:' || u.username || u.password || u.search || u.hash || u.pathname!=='/' || !u.hostname.endsWith('.vercel.app') || u.hostname==='sparkle-suite-smoke.vercel.app')throw Error('Immutable Smoke deployment origin required');
  return u.origin;
}
function route(origin,theme,page) {
  return origin+'/dudesfizzfest'+({homepage:'',join:'/join',trade:'/trade'}[page])+'?ssrReviewTheme='+theme+'&ssrReviewLayout='+(theme==='alpine_opal'?'mile_high_fizz':'standard');
}
function instrument(){
  const q=window.__ab={fcp:null,lcp:null,cls:0,taps:[],errors:[]};
  for(const type of ['paint','largest-contentful-paint','layout-shift'])if(PerformanceObserver.supportedEntryTypes.includes(type))new PerformanceObserver(l=>{for(const e of l.getEntries()){
    if(e.name==='first-contentful-paint')q.fcp=e.startTime;
    if(type==='largest-contentful-paint')q.lcp=e.startTime;
    if(type==='layout-shift'&&!e.hadRecentInput)q.cls+=e.value;
  }}).observe({type,buffered:true});
  let down;
  document.addEventListener('pointerdown',e=>{down=e.timeStamp},true);
  document.addEventListener('click',e=>{
    const el=e.target.closest('button,a');if(!el)return;
    const at=down;down=undefined;
    // Observe trusted default click processing, suppress navigation/provider GETs.
    if(el.tagName==='A')e.preventDefault();
    requestAnimationFrame(()=>requestAnimationFrame(()=>q.taps.push({ms:performance.now()-at,trusted:e.isTrusted,at,tag:el.tagName,pressed:el.getAttribute('aria-pressed'),href:el.getAttribute('href')})));
  },true);
}
async function main(){
  const [configFile,out]=process.argv.slice(2);if(!configFile||!out)throw Error('config.json and output.json required');
  const config=JSON.parse(fs.readFileSync(configFile,'utf8')),runs=config.runs??5;
  if(!Number.isInteger(runs)||runs<5)throw Error('At least five runs required');
  const records={};
  for(const name of ['candidate','legacy','baseline53']) {
    const origin=safeOrigin(config[name].origin);
    const record=await vercelRecord('/v13/deployments/'+new URL(origin).hostname,'deployment');
    if(record.projectId!==PROJECT||record.readyState!=='READY'||record.sha!==config[name].sha||record.url!==new URL(origin).hostname)throw Error('Smoke deployment provenance mismatch');
    if(name==='baseline53'&&!record.sha.startsWith('53c43d0b'))throw Error('FCP baseline must be 53c43d0b');
    records[name]={...record,origin};
  }
  const alias=await vercelRecord('/v4/aliases/sparkle-suite-smoke.vercel.app','alias');
  if(alias.projectId!==PROJECT)throw Error('Smoke alias project mismatch');
  const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
  const browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{})});
  const result={runs,records,alias,rows:[],metric:'Trusted pointerdown timestamp to second requestAnimationFrame after click (presentation upper bound); navigation prevented, no forms.',cases:{pages:pages.map(p=>p.join('/')),interactions}};
  const save=()=>fs.writeFileSync(out,JSON.stringify(result,null,2));
  try{for(const profile of ['phone','desktop'])for(let run=0;run<runs;run++)for(const renderer of run%2?['legacy','baseline53','candidate']:['candidate','baseline53','legacy']) {
    for(const [theme,pageName]of targetsFor(renderer)) {
      const context=await browser.newContext({viewport:profile==='phone'?{width:390,height:844}:{width:1440,height:900},hasTouch:true,isMobile:profile==='phone',reducedMotion:'no-preference'});
      const origin=records[renderer].origin;
      await context.route('**/*',r=>{
        const request=r.request(),u=new URL(request.url());
        if(!['GET','HEAD'].includes(request.method())||(![origin,'https://fonts.googleapis.com','https://fonts.gstatic.com','https://api.fontshare.com','https://cdn.fontshare.com'].includes(u.origin)))return r.abort();
        return r.continue({headers:{...request.headers(),...(u.origin===origin&&process.env.VERCEL_AUTOMATION_BYPASS_SECRET?{'x-vercel-protection-bypass':process.env.VERCEL_AUTOMATION_BYPASS_SECRET}:{})}});
      });
      await context.addInitScript(instrument);
      const page=await context.newPage();let pageErrors=0;page.on('pageerror',()=>pageErrors++);
      try{
        const cdp=await context.newCDPSession(page);await cdp.send('Network.enable');await cdp.send('Network.setCacheDisabled',{cacheDisabled:true});await cdp.send('Emulation.setCPUThrottlingRate',{rate:profile==='phone'?4:1});
        await cdp.send('Network.emulateNetworkConditions',{offline:false,latency:profile==='phone'?80:20,downloadThroughput:(profile==='phone'?1600:10000)*1000/8,uploadThroughput:750*1000/8});
        const response=await page.goto(route(origin,theme,pageName),{waitUntil:'domcontentloaded',timeout:60000});
        if(response?.status()!==200)throw Error('Page did not return 200');
        await page.locator('h1').waitFor();
        if(renderer==='candidate'&&!(await page.locator('[data-ssr-review-label]').count()))throw Error('Missing Smoke review label');
        await page.waitForLoadState('load',{timeout:60000});
        await page.evaluate(()=>document.fonts.ready);
        const ssr=await page.locator('#root').getAttribute('data-server-rendered');
        if((renderer==='candidate'&&ssr!=='true')||(renderer==='legacy'&&ssr==='true'))throw Error('Renderer does not match A/B cohort');
        await page.waitForTimeout(12000);
        const paint=await page.evaluate(()=>({fcp:window.__ab.fcp,lcp:window.__ab.lcp,cls:window.__ab.cls}));
        if(pages.some(p=>p[0]===theme&&p[1]===pageName))result.rows.push({kind:'paint',id:theme+'/'+pageName,profile,renderer,run,...paint,valid:Number.isFinite(paint.fcp)&&Number.isFinite(paint.lcp)&&!pageErrors});
        if(interactions.includes(theme)&&pageName==='homepage'&&renderer!=='baseline53'){
          const selectors=config.selectors?.[renderer]?.[theme]||{motion:theme==='amethyst'?'.au-controls button:first-child':'.fow-controls button:first-child',sound:theme==='amethyst'?'.au-controls button:nth-child(2)':'.fow-controls button:nth-child(2)',nav:'.hp-header-nav a[href]:not([aria-current])',cta:'.hp-hero .hp-btn-primary'};
          for(const [action,selector]of [['pause',selectors.motion],['play',selectors.motion],['sound',selectors.sound],['nav',selectors.nav],['cta',selectors.cta]]){
            const el=page.locator(selector).filter({visible:true}).first();await el.waitFor({state:'visible'});
            if(action==='pause'&&await el.getAttribute('aria-pressed')!=='true'){const n=await page.evaluate(()=>window.__ab.taps.length);await el.tap();await page.waitForFunction(n=>window.__ab.taps.length>n,n);await page.waitForFunction(s=>document.querySelector(s)?.getAttribute('aria-pressed')==='true',selector);}
            const before=await el.getAttribute('aria-pressed');
            const count=await page.evaluate(()=>window.__ab.taps.length);
            await el.tap();await page.waitForFunction(n=>window.__ab.taps.length>n,count);
            const tap=await page.evaluate(()=>window.__ab.taps.at(-1));
            const after=await el.getAttribute('aria-pressed');
            const valid=tap.trusted&&Number.isFinite(tap.ms)&&!pageErrors&&(['nav','cta'].includes(action)?Boolean(tap.href):before!==after)&& (action!=='pause'||after==='false')&&(action!=='play'||after==='true');
            result.rows.push({kind:'tap',id:theme+':'+action,profile,renderer,run,ms:tap.ms,valid});
          }
        }
      }catch{result.rows.push({kind:'error',id:theme+'/'+pageName,profile,renderer,run,error:'Measurement failed (details suppressed)'});}
      finally{await context.close();save();}
    }
  }
  result.verdict=verdict(result.rows,result.cases,runs);save();
  console.log(JSON.stringify({pass:result.verdict.pass,runs,failedGates:result.verdict.gates.filter(g=>!g.pass)}));
  if(!result.verdict.pass)process.exitCode=1;
  }finally{await browser.close();}
}
if(require.main===module)main().catch(()=>{console.error('Smoke A/B failed; metadata/errors suppressed to protect credentials.');process.exitCode=1});
module.exports={safeOrigin,vercelRecord,route,median,targetsFor};
