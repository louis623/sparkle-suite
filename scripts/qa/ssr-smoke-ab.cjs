// Deferred Smoke A/B only. This file is not run by the local regression tests.
const fs=require('node:fs');
const {median,verdict}=require('./ssr-smoke-ab-metrics.cjs');
const {targets,idFor,layoutFor,selectorsFor,actionsFor,cases}=require('./ssr-ab-cases.cjs');
const PROJECT='prj_VTY0rpz2O3VBJqJv69iBz8tzLexQ';
const SETTLE_MS=12000;
const targetsFor=()=>targets;
// Select fields before returning: never print/persist raw service metadata.
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
  return origin+'/milehighfizz'+({homepage:'',join:'/join',trade:'/trade'}[page])+'?ssrReviewTheme='+theme+'&ssrReviewLayout='+layoutFor(theme)+'&lineupPresentation=grouped-v1';
}
async function openCase(page,origin,theme,pageName,renderer) {
  const response=await page.goto(route(origin,theme,pageName),{waitUntil:'commit',timeout:60000});
  if(response?.status()!==200)throw Error('Page did not return 200');
  // Check the response's root as soon as parsed, before any loading tap or
  // paint sample. Waiting for load here would invalidate loading samples.
  const root=page.locator('#root');
  await root.waitFor({state:'attached',timeout:30000});
  const ssr=await root.getAttribute('data-server-rendered');
  if((renderer==='candidate'&&ssr!=='true')||(renderer==='legacy'&&ssr!==null))throw Error('Renderer mismatch');
}
function allowedAssetRequest(url,origin,renderer,method='GET') {
  if(!['GET','HEAD'].includes(method))return false;
  const u=new URL(url);
  if([origin,'https://fonts.googleapis.com','https://fonts.gstatic.com','https://api.fontshare.com','https://cdn.fontshare.com'].includes(u.origin))return true;
  // Frozen legacy HTML requires exactly these integrity-pinned framework files.
  // Blocking them would benchmark an unrendered legacy page.
  return renderer==='legacy' && u.origin==='https://unpkg.com' && [
    '/react@18.3.1/umd/react.development.js',
    '/react-dom@18.3.1/umd/react-dom.development.js',
    '/@babel/standalone@7.29.0/babel.min.js',
  ].includes(u.pathname);
}
function instrument(){
  const q=window.__ab={fcp:null,lcp:null,cls:0,taps:[],hydrationErrors:0};
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
    if(el.tagName==='A')e.preventDefault();
    requestAnimationFrame(()=>requestAnimationFrame(()=>q.taps.push({ms:performance.now()-at,trusted:e.isTrusted,at,href:el.getAttribute('href')})));
  },true);
}
const hydrationError=text=>/Minified React error #(418|423|425)|hydration|hydrating|server rendered HTML|did not match/i.test(text);
function watchErrors(page) {
  const errors={pageErrors:0,hydrationErrors:0};
  page.on('pageerror',e=>{errors.pageErrors++;if(hydrationError(String(e)))errors.hydrationErrors++});
  page.on('console',m=>{if(m.type()==='error'&&hydrationError(m.text()))errors.hydrationErrors++});
  return errors;
}
async function verifyTheme(page,theme) {
  // Verify the actual runtime theme, not merely the requested URL or a label.
  const actual=await page.evaluate(()=>window.HOMEPAGE_TWEAK_DEFAULTS?.preset||window.JOIN_TWEAK_DEFAULTS?.preset||window.TRADE_TWEAK_DEFAULTS?.preset);
  if(actual!==theme)throw Error('Review theme mismatch');
}
async function measureTap(page,id,renderer,action) {
  const selectors=selectorsFor(id,renderer), selector=selectors[['pause','play'].includes(action)?'motion':action];
  const el=page.locator(selector).filter({visible:true}).first();
  await el.waitFor({state:'visible',timeout:30000});
  // A rendered SSR button is interactive only after its inline controller binds.
  if(renderer==='candidate'&&['[data-hero-motion-toggle]','.ga-motion-control'].includes(selector))await page.waitForFunction(()=>document.querySelector('[data-ssr-hero][data-motion-bound]'));
  if(selector==='[data-mhf-video-toggle]')await page.waitForFunction(()=>document.querySelector('[data-mhf-motion-bound]'));
  const state=()=>el.evaluate(el=>el.hasAttribute('data-mhf-video-toggle')?String(el.getAttribute('aria-label').startsWith('Pause')):el.classList.contains('hpw-motion-control')?String(el.getAttribute('aria-pressed')==='false'):el.getAttribute('aria-pressed'));
  if((action==='pause'&&await state()!=='true') || (action==='play'&&await state()!=='false')) {
    const n=await page.evaluate(()=>window.__ab.taps.length);await el.tap({force:true});
    await page.waitForFunction(n=>window.__ab.taps.length>n,n);
  }
  const before=await state(), count=await page.evaluate(()=>window.__ab.taps.length);
  const duringLoad=await page.evaluate(()=>document.readyState!=='complete');
  await el.tap();await page.waitForFunction(n=>window.__ab.taps.length>n,count);
  const tap=await page.evaluate(()=>window.__ab.taps.at(-1)), after=await state();
  const valid=tap.trusted&&Number.isFinite(tap.ms)&&(['nav','cta'].includes(action)?Boolean(tap.href):before!==after)&&(action!=='pause'||after==='false')&&(action!=='play'||after==='true');
  return {ms:tap.ms,valid,duringLoad};
}
async function main(){
  const [configFile,out]=process.argv.slice(2);if(!configFile||!out)throw Error('config.json and output.json required');
  const config=JSON.parse(fs.readFileSync(configFile,'utf8')),runs=config.runs??5;
  if(config.selectors || config.cases || config.waivers || config.settleMs)throw Error('Fixed cases, controls, waivers and settle time cannot be overridden');
  if(!Number.isInteger(runs)||runs<5)throw Error('At least five runs required');
  const records={};
  for(const name of ['candidate','legacy']) {
    const origin=safeOrigin(config[name].origin);
    if(!/^[a-f0-9]{40}$/.test(config[name].sha))throw Error('Exact SHA required');
    const record=await vercelRecord('/v13/deployments/'+new URL(origin).hostname,'deployment');
    if(record.projectId!==PROJECT||record.readyState!=='READY'||record.sha!==config[name].sha||record.url!==new URL(origin).hostname)throw Error('Smoke deployment provenance mismatch');
    records[name]={...record,origin};
  }
  const alias=await vercelRecord('/v4/aliases/sparkle-suite-smoke.vercel.app','alias');
  if(alias.projectId!==PROJECT)throw Error('Smoke alias project mismatch');
  const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
  const browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{})});
  const result={runs,records,alias,legacySHA:records.legacy.sha,settleMs:SETTLE_MS,rows:[],metric:'Trusted pointerdown timestamp to second requestAnimationFrame after click; native link navigation prevented; no forms.',cases:{pages:cases.pages,interactions:cases.interactions}};
  const save=()=>fs.writeFileSync(out,JSON.stringify(result,null,2));
  try{for(const profile of ['phone','desktop'])for(let run=0;run<runs;run++)for(const renderer of run%2?['legacy','candidate']:['candidate','legacy'])for(const [theme,pageName]of targets) {
    // Separate clean loads per action/phase: every loading tap is the first
    // action as soon as that control is actionable, never after an idle wait.
    for(const experiment of ['paint',...['loading','idle'].flatMap(phase=>actionsFor(theme+'/'+pageName,renderer).map(action=>({phase,action})))]) {
      const context=await browser.newContext({viewport:profile==='phone'?{width:390,height:844}:{width:1440,height:900},hasTouch:true,isMobile:profile==='phone',reducedMotion:'no-preference'});
      const origin=records[renderer].origin, id=theme+'/'+pageName;
      await context.route('**/*',r=>{
        const request=r.request(),u=new URL(request.url());
        if(!allowedAssetRequest(u.href,origin,renderer,request.method()))return r.abort();
        return r.continue({headers:{...request.headers(),...(u.origin===origin&&process.env.VERCEL_AUTOMATION_BYPASS_SECRET?{'x-vercel-protection-bypass':process.env.VERCEL_AUTOMATION_BYPASS_SECRET}:{})}});
      });
      await context.addInitScript(instrument);
      const page=await context.newPage(),errors=watchErrors(page);
      try{
        const cdp=await context.newCDPSession(page);await cdp.send('Network.enable');await cdp.send('Network.setCacheDisabled',{cacheDisabled:true});await cdp.send('Emulation.setCPUThrottlingRate',{rate:profile==='phone'?4:1});
        await cdp.send('Network.emulateNetworkConditions',{offline:false,latency:profile==='phone'?80:20,downloadThroughput:(profile==='phone'?1600:10000)*1000/8,uploadThroughput:750*1000/8});
        await openCase(page,origin,theme,pageName,renderer);
        let measured;
        if(experiment!=='paint'&&experiment.phase==='loading')measured=await measureTap(page,id,renderer,experiment.action);
        await page.waitForLoadState(experiment!=='paint'&&experiment.phase==='loading'?'domcontentloaded':'load',{timeout:60000});await page.evaluate(()=>document.fonts.ready);
        if(renderer==='candidate')await page.waitForFunction(()=>window.SPARKLE_FIRST_PAINT===null);
        await verifyTheme(page,theme);
        if(!(await page.locator('[data-ssr-review-label]').count()))throw Error('Missing review label');
        await page.waitForTimeout(SETTLE_MS);
        if(experiment==='paint') {
          const paint=await page.evaluate(()=>({fcp:window.__ab.fcp,lcp:window.__ab.lcp,cls:window.__ab.cls}));
          result.rows.push({kind:'paint',id,profile,renderer,run,...paint,...errors,valid:Number.isFinite(paint.fcp)&&Number.isFinite(paint.lcp)});
        } else {
          measured||=await measureTap(page,id,renderer,experiment.action);
          // Retain late errors from the interaction's next paint as well.
          await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
          result.rows.push({kind:'tap',id:id+':'+experiment.action,phase:experiment.phase,profile,renderer,run,...measured,...errors});
        }
      }catch{result.rows.push({kind:'error',id,profile,renderer,run,...errors,error:'Measurement failed (details suppressed)'});}
      finally{await context.close();save();}
    }
  }
  result.verdict=verdict(result.rows,cases,runs);save();
  console.log(JSON.stringify({pass:result.verdict.pass,runs,legacySHA:result.legacySHA,settleMs:SETTLE_MS,failedGates:result.verdict.gates.filter(g=>!g.pass)}));
  if(!result.verdict.pass)process.exitCode=1;
  }finally{await browser.close();}
}
if(require.main===module)main().catch(()=>{console.error('Smoke A/B failed; metadata/errors suppressed to protect credentials.');process.exitCode=1});
module.exports={safeOrigin,vercelRecord,route,openCase,median,targetsFor,instrument,watchErrors,verifyTheme,measureTap,SETTLE_MS,hydrationError,allowedAssetRequest};
