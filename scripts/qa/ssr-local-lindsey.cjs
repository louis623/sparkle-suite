// Offline browser regression. Generate fixtures with amethyst-ssr-lindsey.test.ts.
// node ... <playwright-module> <output.json> [webkit-executable]
// Every request is confined to this ephemeral loopback server; no app/DB/env access.
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const pw=require(process.argv[2]||'playwright');
const {instrument,watchErrors,measureTap}=require('./ssr-smoke-ab.cjs');
const {actionsFor}=require('./ssr-ab-cases.cjs');
const {median,tapGate}=require('./ssr-smoke-ab-metrics.cjs');
const root=process.cwd(),pub=path.join(root,'public'),fixtures=path.join(root,'node_modules/.cache/ssr-lindsey');
const types={'.css':'text/css','.js':'text/javascript','.webp':'image/webp','.png':'image/png','.jpg':'image/jpeg','.avif':'image/avif','.mp4':'video/mp4','.woff2':'font/woff2','.svg':'image/svg+xml'};
const pause=ms=>new Promise(r=>setTimeout(r,ms));
const server=http.createServer((req,res)=>{
  const u=new URL(req.url,'http://localhost');
  if(u.pathname==='/fixture') {
    const file=u.searchParams.get('file');if(!/^[a-z_]+__(homepage|join|trade)$/.test(file)){res.writeHead(400);return res.end()}
    let b=fs.readFileSync(path.join(fixtures,file+'.html'));const split=u.searchParams.get('split');
    if(u.searchParams.has('dropSnapshot'))b=Buffer.from(b.toString().replace('</body>','<script>delete window.SPARKLE_FIRST_PAINT.lineup;</script></body>'));
    res.writeHead(200,{'content-type':'text/html; charset=utf-8','cache-control':'no-store'});
    if(!split)return res.end(b);
    const offset=split==='preH1'?b.indexOf('<h1'):split.startsWith('tail')?b.indexOf('</body>'):b.indexOf('</h1>')+5;
    if(offset<5){res.destroy();return}
    res.write(b.subarray(0,offset));setTimeout(()=>res.end(b.subarray(offset)),split==='tail-play'?3000:split==='tail'?1200:400);return;
  }
  if(u.pathname.startsWith('/api/')) {res.writeHead(200,{'content-type':'application/json'});return res.end(JSON.stringify({liveQueueState:'offline',liveQueueEntries:[],liveQueueLastUpdated:null,liveQueueSummary:'Check the calendar for the next show.'}))}
  let f=path.resolve(pub,'.'+decodeURIComponent(u.pathname));
  if(!f.startsWith(pub+path.sep)){res.writeHead(400);return res.end()}
  if(!fs.existsSync(f))f=path.join(pub,'amethyst',u.pathname);
  if(!fs.existsSync(f)||!fs.statSync(f).isFile()){res.writeHead(404);return res.end()}
  // Make the first actionable SSR/legacy control observable while other load
  // work remains pending. This is fixture transport latency, never page gating.
  const send=()=>{
    const stat=fs.statSync(f),range=req.headers.range;
    if(range&&f.endsWith('.mp4')) {
      const [a,b]=range.replace('bytes=','').split('-'),start=Number(a),end=b?Math.min(Number(b),stat.size-1):stat.size-1;
      res.writeHead(206,{'content-type':'video/mp4','content-range':`bytes ${start}-${end}/${stat.size}`,'accept-ranges':'bytes','content-length':end-start+1});return fs.createReadStream(f,{start,end}).pipe(res);
    }
    res.writeHead(200,{'content-type':types[path.extname(f)]||'application/octet-stream'});fs.createReadStream(f).pipe(res);
  };
  send();
});
function geometry(){
  const q=window.__geometry={nativeCLS:PerformanceObserver.supportedEntryTypes?.includes('layout-shift')||false,first:{},maxMovement:0,frames:0};
  const selectors={h1:'h1',copy:'.mhf-hero-content,.jp-hero-card,.tp-hero-inner',cta:'.mhf-cta-shop,.jp-hero-card .hp-btn-primary,.hp-header .hp-shop-btn',motion:'.ga-motion-control,[data-mhf-video-toggle]'};
  function tick(){
    q.frames++;
    for(const [key,s]of Object.entries(selectors)) {
      const el=[...document.querySelectorAll(s)].find(e=>{const r=e.getBoundingClientRect();return r.width>0&&r.height>0&&getComputedStyle(e).visibility!=='hidden'});
      if(!el)continue;const r=el.getBoundingClientRect(),xy=[r.x+scrollX,r.y+scrollY];
      q.first[key]||=xy;q.maxMovement=Math.max(q.maxMovement,...xy.map((v,i)=>Math.abs(v-q.first[key][i])));
    }
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}
async function main(){
  await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port;
  const sourceFingerprint=crypto.createHash('sha256');
  for(const f of ['compiled/react.js','compiled/tweaks-panel.js','compiled/homepage.js','compiled/join.js','compiled/trade.js','ssr-hero-motion.css','ssr-motion/gilded-autumn.js','live-lineup.js','responsive-image.js','dance-floor-ticker-label.js','sparkle-suite-footer-credit.js'])sourceFingerprint.update(fs.readFileSync(path.join(pub,'amethyst',f)));
  for(const f of fs.readdirSync(fixtures).filter(f=>f.endsWith('.html')&&!f.startsWith('clock_skew')).sort())sourceFingerprint.update(fs.readFileSync(path.join(fixtures,f)));
  const fingerprint=sourceFingerprint.digest('hex');
  const result=process.argv[5]==='resume'?JSON.parse(fs.readFileSync(process.argv[3],'utf8')):{clock:[],transport:'loopback only; stream gap 400ms; local idle after >=1s active playback and 300ms after load/fonts; five tap runs per action/phase; A/B settle remains 12000ms',split:[],taps:[],table:[],pass:false};
  if(result.sourceFingerprint)assert.equal(result.sourceFingerprint,fingerprint,'Cannot resume against different fixture/runtime bytes');
  else assert.notEqual(process.argv[5],'resume','A resume requires a fingerprinted checkpoint');
  result.sourceFingerprint=fingerprint;result.pass=false;result.clock=[];result.table=[];
  const save=()=>fs.writeFileSync(process.argv[3],JSON.stringify(result,null,2));
  save();
  try{for(const engine of ['chromium','webkit']) {
    const browser=await pw[engine].launch(engine==='chromium'?{executablePath:'/usr/bin/google-chrome'}:process.argv[4]?{executablePath:process.argv[4]}:{});
    async function contextFor(profile,skew=false){
      const context=await browser.newContext({viewport:profile==='phone'?{width:390,height:844}:{width:1440,height:900},hasTouch:true,reducedMotion:'no-preference'});
      await context.route('**/*',r=>r.request().url().startsWith(origin+'/')?r.continue():r.abort());
      await context.addInitScript(instrument);await context.addInitScript(geometry);
      if(skew)await context.addInitScript(()=>{const RealDate=Date;class SkewDate extends RealDate{constructor(...args){super(...(args.length?args:[RealDate.now()+400*86400000]))}static now(){return RealDate.now()+400*86400000}}window.Date=SkewDate});
      return context;
    }
    try{for(const profile of (process.argv[5]==='clock-only'?[]:['phone','desktop']))for(const theme of ['gilded_autumn','alpine_opal','fall_owl_harvest_moon','midnight_rose','rose_gold'])for(const pageName of ['homepage','join','trade']) {
      const lindsey=['gilded_autumn','alpine_opal'].includes(theme);if(!lindsey&&pageName!=='homepage')continue;
      const id=theme+'/'+pageName,file=theme+'__'+pageName;
      for(const split of ['preH1','postH1']) {
        const prior=result.split.filter(r=>r.engine===engine&&r.profile===profile&&r.id===id&&r.split===split);
        if(prior.length){assert.equal(prior.length,1);assert.equal(prior[0].cls,0);assert.equal(prior[0].maxMovement,0);assert.equal(prior[0].pageErrors,0);assert.equal(prior[0].hydrationErrors,0);continue;}
        const context=await contextFor(profile,true),page=await context.newPage(),errors=watchErrors(page);
        try{
          await page.goto(origin+'/fixture?file='+file+'&split='+split,{waitUntil:'load'});await page.evaluate(()=>document.fonts.ready);await pause(600);
          const measured=await page.evaluate(()=>({cls:window.__ab.cls,nativeCLS:window.__geometry.nativeCLS,maxMovement:window.__geometry.maxMovement,frames:window.__geometry.frames,headline:document.querySelector('h1')?.textContent,ssr:document.querySelector('#root')?.dataset.serverRendered}));
          const row={engine,profile,id,split,clockSkewDays:400,...measured,...errors};result.split.push(row);save();
          assert.equal(row.cls,0,JSON.stringify(row));assert.equal(row.maxMovement,0,JSON.stringify(row));assert.equal(row.pageErrors,0,JSON.stringify(row));assert.equal(row.hydrationErrors,0,JSON.stringify(row));assert.equal(row.ssr,'true');assert.ok(row.frames>2);
        }finally{await context.close()}
      }
      if(!lindsey)continue;
      for(const phase of ['loading','idle'])for(const action of actionsFor(id,'candidate'))for(let run=0;run<5;run++) {
        const prior=result.taps.filter(r=>r.engine===engine&&r.profile===profile&&r.id===id&&r.phase===phase&&r.action===action&&r.run===run);
        if(prior.length){assert.equal(prior.length,1);assert.ok(prior[0].valid);assert.equal(prior[0].pageErrors,0);assert.equal(prior[0].hydrationErrors,0);if(phase==='loading')assert.ok(prior[0].duringLoad);continue;}
        const context=await contextFor(profile,true),page=await context.newPage(),errors=watchErrors(page);
        try {
          await page.goto(origin+'/fixture?file='+file+(phase==='loading'?'&split=tail'+(action==='play'?'-play':''):''),{waitUntil:'commit'});
          if(phase==='idle'){await page.waitForLoadState('load');await page.evaluate(()=>document.fonts.ready);await page.waitForFunction(()=>[...document.querySelectorAll('.mhf-hero video,[data-ssr-hero] video')].every(v=>!v.paused && v.readyState>=3 && v.currentTime>=1),{},{timeout:30000});await pause(300)}
          const tap=await measureTap(page,id,'candidate',action);
          await page.waitForLoadState('domcontentloaded');await page.waitForFunction(()=>window.SPARKLE_FIRST_PAINT===null);await pause(100);
          const row={engine,profile,id,phase,action,run,transportWindowMs:phase==='loading'?(action==='play'?3000:1200):null,...tap,...errors};result.taps.push(row);save();
          assert.ok(row.valid,JSON.stringify(row));if(phase==='loading')assert.ok(row.duringLoad,JSON.stringify(row));assert.equal(row.pageErrors,0,JSON.stringify(row));assert.equal(row.hydrationErrors,0,JSON.stringify(row));
        }finally{await context.close()}
      }
    }
      // Positive and negative controls prove this clock fixture exercises the
      // server snapshot: deleting it must cause a recoverable hydration error.
      for(const profile of ['phone','desktop'])for(const dropSnapshot of [false,true]) {
        const context=await contextFor(profile,true),page=await context.newPage(),errors=watchErrors(page);
        try {
          await page.goto(origin+'/fixture?file=clock_skew__homepage'+(dropSnapshot?'&dropSnapshot=1':''),{waitUntil:'load'});await pause(300);
          const row={engine,profile,clockSkewDays:400,dropSnapshot,...errors};result.clock.push(row);save();
          if(dropSnapshot)assert.ok(row.hydrationErrors>0,JSON.stringify(row));
          else {assert.equal(row.pageErrors,0,JSON.stringify(row));assert.equal(row.hydrationErrors,0,JSON.stringify(row))}
        }finally{await context.close()}
      }
    }finally{await browser.close()}
  }
  result.tapGates=[];
  for(const profile of (process.argv[5]==='clock-only'?[]:['phone','desktop']))for(const theme of ['gilded_autumn','alpine_opal'])for(const page of ['homepage','join','trade']) {
    const id=theme+'/'+page,streams=result.split.filter(r=>r.id===id&&r.profile===profile),taps=result.taps.filter(r=>r.id===id&&r.profile===profile);
    const medians=[];
    for(const engine of ['chromium','webkit'])for(const phase of ['loading','idle'])for(const action of actionsFor(id,'candidate')) {
      const found=taps.filter(r=>r.engine===engine&&r.phase===phase&&r.action===action);assert.equal(found.length,5);
      const ms=median(found.map(r=>r.ms));result.tapGates.push({engine,id,profile,phase,action,medianMs:ms,...tapGate(ms,phase,'candidate')});medians.push({engine,phase,action,ms});
    }
    assert.equal(streams.length,4);
    result.table.push({id,profile,chromiumCLS:Math.max(...streams.filter(r=>r.engine==='chromium').map(r=>r.cls)),webkitMaxMovementPx:Math.max(...streams.filter(r=>r.engine==='webkit').map(r=>r.maxMovement)),hydrationErrors:streams.reduce((n,r)=>n+r.hydrationErrors,0)+taps.reduce((n,r)=>n+r.hydrationErrors,0),tapMedians:medians});
  }
  result.pass=result.tapGates.every(g=>g.pass);save();console.log(JSON.stringify({pass:result.pass,streamSamples:result.split.length,tapSamples:result.taps.length,failedTapGates:result.tapGates.filter(g=>!g.pass)}));if(!result.pass)process.exitCode=1;
  }finally{server.close()}
}
main().catch(e=>{console.error(e);server.close();process.exitCode=1});
