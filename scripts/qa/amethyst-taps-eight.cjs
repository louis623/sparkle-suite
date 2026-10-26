const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const fs=require('fs'),path=require('path');
const {authenticatePreview}=require('./preview-auth.cjs');
const [base,output,slug='qap3amethyst']=process.argv.slice(2);
fs.mkdirSync(output,{recursive:true});
(async()=>{
 const results=[];let environment;
 for(let run=1;run<=8;run++){
  const browser=await chromium.launch({channel:'chrome',headless:true,ignoreDefaultArgs:['--enable-automation'],args:['--autoplay-policy=document-user-activation-required']});
  const context=await browser.newContext({viewport:{width:1440,height:900},deviceScaleFactor:1});
  if(base.includes('.vercel.app'))await authenticatePreview(context,base);
  // No tracking or form POST may reach the application during read-only QA.
  await context.route('**/*',r=>new URL(r.request().url()).origin===new URL(base).origin&&!['GET','HEAD','OPTIONS'].includes(r.request().method())?r.abort():r.fallback());
  const page=await context.newPage(),record={run,url:base+'/'+slug,actions:[],errors:[]};
  page.on('pageerror',error=>record.errors.push(error.message));
  await context.addInitScript(()=>{window.__tapEvents=[];new PerformanceObserver(list=>{for(const e of list.getEntries())if(e.interactionId)window.__tapEvents.push({name:e.name,start:e.startTime,duration:e.duration,inputDelay:e.processingStart-e.startTime,processing:e.processingEnd-e.processingStart,presentation:e.startTime+e.duration-e.processingEnd})}).observe({type:'event',durationThreshold:16,buffered:true})});
  try{
   if(!environment){const session=await browser.newBrowserCDPSession(),info=await session.send('SystemInfo.getInfo');environment={platform:process.platform,chrome:browser.version(),viewport:{width:1440,height:900},cpuThrottle:1,gpu:info.gpu.devices,features:info.gpu.featureStatus};}
   await page.goto(record.url,{waitUntil:'domcontentloaded',timeout:90000});
   await page.waitForFunction(()=>window.SPARKLE_FIRST_PAINT===null&&document.querySelector('.au-video')?.currentTime>.2,null,{timeout:45000});
   await page.waitForTimeout(1500);
   record.ssr=await page.locator('#root').getAttribute('data-server-rendered');
   const hero=page.locator('.hp-hero'),video=hero.locator('.au-video');
   if(await video.evaluate(v=>v.muted)){await hero.locator('.hp-hero-headline').click();await page.waitForTimeout(300);}
   if(await video.evaluate(v=>v.ended)){await hero.getByRole('button',{name:'Play again',exact:true}).click();await page.waitForTimeout(200);}
   for(const [action,button] of [['pause',()=>hero.getByRole('button',{name:'Pause animation',exact:true})],['resume',()=>hero.getByRole('button',{name:'Play animation',exact:true})],['mute',()=>hero.getByRole('button',{name:'Mute sound',exact:true})],['unmute',()=>hero.getByRole('button',{name:'Play with sound',exact:true})]]){
    const start=await page.evaluate(()=>performance.now());
    await button().click();await page.waitForTimeout(300);
    const events=await page.evaluate(start=>window.__tapEvents.filter(e=>e.start>=start),start);
    const state=await video.evaluate(v=>({paused:v.paused,muted:v.muted,time:v.currentTime}));
    record.actions.push({action,maxMs:events.length?Math.max(...events.map(e=>e.duration)):16,belowObserverThreshold:!events.length,events,state});
   }
   record.behavior=record.actions[0].state.paused&&!record.actions[1].state.paused&&record.actions[2].state.muted&&!record.actions[3].state.muted;
   record.maxMs=Math.max(...record.actions.map(a=>a.maxMs));record.pass=record.behavior&&!record.errors.length&&record.maxMs<=200;
   if(run===1||run===8)await page.screenshot({path:path.join(output,'run-'+run+'.png')});
  }catch(error){record.error=error.message;record.pass=false;}
  finally{await browser.close()}
  results.push(record);fs.writeFileSync(path.join(output,'results.json'),JSON.stringify({base,slug,environment,runs:results},null,2));
  console.log(JSON.stringify(record));
 }
 process.exitCode=results.every(r=>r.pass)?0:1;
})().catch(e=>{console.error(e.message);process.exitCode=1});
