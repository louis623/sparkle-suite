// Serial cold-browser lab runs; no clicks until LCP/CLS collection finishes.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const fs = require('node:fs'), path = require('node:path');
const { startFilmstrip } = require('./hero-filmstrip.cjs');
const { authenticatePreview } = require('./preview-auth.cjs');
const [base, output, mode='phone', selected='sunset_beach', repetitions='5'] = process.argv.slice(2);
fs.mkdirSync(output,{recursive:true});
(async()=>{
  const browser=await chromium.launch({channel:'chrome',headless:true,args:['--autoplay-policy=document-user-activation-required']});
  const results=[];
  for(const theme of selected.split(',')) for(let run=1;run<=Number(repetitions);run++) {
    const context=await browser.newContext({viewport:mode==='phone'?{width:360,height:800}:{width:1440,height:900},isMobile:mode==='phone',hasTouch:mode==='phone',deviceScaleFactor:1});
    await authenticatePreview(context, base);
    const page=await context.newPage(),errors=[],resources=[];
    page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>resources.push(r.url()));
    await context.addInitScript(()=>{
      window.__perf={lcp:0,cls:0,shifts:[],candidates:[],plays:[],unstyled:false};
      new PerformanceObserver(list=>{for(const e of list.getEntries()){window.__perf.lcp=e.startTime;window.__perf.candidates.push({at:e.startTime,tag:e.element?.tagName,cls:e.element?.className,url:e.url,size:e.size})}}).observe({type:'largest-contentful-paint',buffered:true});
      let session=0,start=0,last=0;
      new PerformanceObserver(list=>{for(const e of list.getEntries())if(!e.hadRecentInput){session=e.startTime-last<1000&&e.startTime-start<5000?session+e.value:(start=e.startTime,e.value);last=e.startTime;window.__perf.cls=Math.max(window.__perf.cls,session);window.__perf.shifts.push({at:e.startTime,value:e.value,sources:e.sources.map(s=>({tag:s.node?.tagName,cls:s.node?.className,previous:s.previousRect,current:s.currentRect}))})}}).observe({type:'layout-shift',buffered:true});
      const play=HTMLMediaElement.prototype.play;HTMLMediaElement.prototype.play=function(){const p={at:performance.now(),muted:this.muted};window.__perf.plays.push(p);return play.call(this).then(()=>p.ok=true,e=>{p.error=e.name;throw e})};
      new MutationObserver(()=>{if(document.querySelector('main.public-index'))window.__perf.unstyled=true}).observe(document,{subtree:true,childList:true});
    });
    const cdp=await context.newCDPSession(page);await cdp.send('Network.enable');await cdp.send('Network.setCacheDisabled',{cacheDisabled:true});
    if(mode==='phone'){await cdp.send('Emulation.setCPUThrottlingRate',{rate:4});await cdp.send('Network.emulateNetworkConditions',{offline:false,latency:150,downloadThroughput:200000,uploadThroughput:93750,connectionType:'cellular4g'});}
    const prefix=path.join(output,`${mode}-${theme.replaceAll('/','_')}-${run}`);
    const finish=run===1?await startFilmstrip(cdp,prefix):null;
    const result={theme,mode,run,errors};
    try{
      const response=await page.goto(base+(theme.startsWith('/')?theme:`/skin-preview/${theme}/homepage`),{waitUntil:'domcontentloaded',timeout:90000});result.status=response.status();
      const frame=page.frames().find(f=>f.parentFrame())||page.mainFrame();
      await frame.locator('.hp-hero').waitFor({timeout:30000});
      await page.waitForTimeout(10000);
      const outerOrigin=await page.evaluate(()=>performance.timeOrigin);
      result.navigation=await page.evaluate(()=>performance.getEntriesByType('navigation')[0]?.toJSON());
      Object.assign(result,await frame.evaluate(()=>({...window.__perf,timeOrigin:performance.timeOrigin,paint:performance.getEntriesByType('paint').map(e=>({name:e.name,at:e.startTime})),motion:document.querySelector('.hp-hero')?.dataset.heroMotion,videos:[...document.querySelectorAll('.hp-hero video')].map(v=>({time:v.currentTime,paused:v.paused,ended:v.ended,ready:v.readyState,muted:v.muted})),animations:document.getAnimations().filter(a=>a.effect?.target?.closest?.('.hp-hero')).map(a=>({state:a.playState,time:a.currentTime})),resources:performance.getEntriesByType('resource').map(e=>({url:e.name,bytes:e.transferSize,start:e.startTime,duration:e.duration}))})));
      result.navigationOffset=result.timeOrigin-outerOrigin;result.lcpNavigation=result.lcp+result.navigationOffset;
      result.productionRuntime=!resources.some(u=>/babel(?:\.min)?\.js|babel-standalone|react(?:-dom)?\.development/.test(u));
      if(run===1)await page.screenshot({path:prefix+'-settled.png'});
    }catch(e){result.error=e.message;}
    if(finish)await finish();
    fs.writeFileSync(prefix+'.json',JSON.stringify(result,null,2));results.push(result);
    fs.writeFileSync(path.join(output,mode+'-performance.json'),JSON.stringify(results,null,2));
    console.log(JSON.stringify({theme,mode,run,lcp:result.lcpNavigation,cls:result.cls,errors,error:result.error}));
    await context.close();
  }
  await browser.close();
})().catch(e=>{console.error(e);process.exitCode=1});
