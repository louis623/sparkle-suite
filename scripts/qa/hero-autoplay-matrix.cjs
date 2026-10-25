/* Read-only browser checks. Each case uses an empty Chrome context. No forms
 * are submitted. PLAYWRIGHT_MODULE may point to the bundled desktop runtime. */
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const fs = require('node:fs'), path = require('node:path');
const { startFilmstrip } = require('./hero-filmstrip.cjs');
const [base, output, mode = 'desktop', selected] = process.argv.slice(2);
if (!base || !output) throw Error('Usage: node scripts/qa/hero-autoplay-matrix.cjs BASE OUTPUT desktop|phone [comma-separated themes]');
const themes = selected?.split(',') || ['amethyst','sparkle_suite_morganite','black_diamond','moonstone','alpine_opal','emerald_garden','gnome_garden','neon_butterfly','halloween_pumpkin_witch','halloween_pumpkin_cat','gilded_autumn','rose_gold','midnight_rose','fall_owl_harvest_moon','gobble_and_fizz','pie_please','pearl_rose','sunset_beach','rose_champagne','garnet','amber','velvet','rose_quartz'];
const audioThemes = new Set(['amethyst','fall_owl_harvest_moon','sunset_beach']);
fs.mkdirSync(output, {recursive:true});
(async () => {
  const browser = await chromium.launch({channel:'chrome',headless:true,args:['--autoplay-policy=document-user-activation-required']});
  const results = [];
  for (const theme of themes) {
    const context = await browser.newContext({viewport:mode==='phone'?{width:390,height:844}:{width:1440,height:900},isMobile:mode==='phone',hasTouch:mode==='phone',deviceScaleFactor:1});
    const page = await context.newPage(), errors = [], resources = [];
    const frameThrottles=[], throttled=new Set();
    async function throttleFrame(frame) {
      if(mode!=='phone'||!frame.parentFrame()||throttled.has(frame))return;
      try {
        const session=await context.newCDPSession(frame);
        await session.send('Network.enable');
        await session.send('Network.setCacheDisabled',{cacheDisabled:true});
        await session.send('Emulation.setCPUThrottlingRate',{rate:4});
        await session.send('Network.emulateNetworkConditions',{offline:false,latency:150,downloadThroughput:200000,uploadThroughput:93750,connectionType:'cellular4g'});
        throttled.add(frame);frameThrottles.push({url:frame.url(),applied:true});
      } catch(error) {
        const inherited=error.message.includes("part of the parent frame's session");
        frameThrottles.push({url:frame.url(),inherited,...(inherited?{}:{error:error.message})});
        if(inherited)throttled.add(frame);
      }
    }
    page.on('frameattached',throttleFrame);page.on('framenavigated',throttleFrame);
    page.on('pageerror', e => errors.push(e.message));
    page.on('request', r => resources.push(r.url()));
    await context.addInitScript(() => {
      window.__heroQA = {plays:[],unstyled:false};
      const original = HTMLMediaElement.prototype.play;
      HTMLMediaElement.prototype.play = function() {
        const attempt = {muted:this.muted,at:performance.now()}; window.__heroQA.plays.push(attempt);
        return original.call(this).then(() => {attempt.ok=true}, e => {attempt.error=e.name;throw e});
      };
      new MutationObserver(() => {if(document.querySelector('main.public-index'))window.__heroQA.unstyled=true}).observe(document,{childList:true,subtree:true});
    });
    const cdp = await context.newCDPSession(page);
    await cdp.send('Network.enable'); await cdp.send('Network.setCacheDisabled',{cacheDisabled:true});
    if(mode==='phone') {
      await cdp.send('Emulation.setCPUThrottlingRate',{rate:4});
      await cdp.send('Network.emulateNetworkConditions',{offline:false,latency:150,downloadThroughput:200000,uploadThroughput:93750,connectionType:'cellular4g'});
    }
    const result = {theme,mode,errors,frameThrottles};
    let finishFilmstrip = await startFilmstrip(cdp,path.join(output,`${mode}-${theme}`));
    try {
      const response = await page.goto(`${base}/skin-preview/${theme}/homepage`,{waitUntil:'domcontentloaded',timeout:120000});
      result.status = response.status();
      const frame = page.frames().find(f => f.parentFrame());
      if(!frame) throw Error('Missing sample frame');
      await frame.locator('.hp-hero').waitFor({timeout:45000});
      await frame.waitForFunction(() => {
        const videos=[...document.querySelectorAll('.hp-hero video')];
        return videos.length ? videos.some(v=>v.currentTime>.4 || v.ended) : document.getAnimations().some(a=>a.playState==='running' && a.effect?.target?.closest?.('.hp-hero'));
      },null,{timeout:45000});
      const sample = () => frame.evaluate(() => ({
        ...window.__heroQA, motion:document.querySelector('.hp-hero').dataset.heroMotion,
        videos:[...document.querySelectorAll('.hp-hero video')].map(v=>({time:v.currentTime,paused:v.paused,muted:v.muted,ended:v.ended})),
        animations:document.getAnimations().filter(a=>a.effect?.target?.closest?.('.hp-hero')).map(a=>({state:a.playState,time:a.currentTime})),
        controls:[...document.querySelectorAll('.hp-hero button')].map(b=>({text:b.textContent,label:b.getAttribute('aria-label')})),
      }));
      result.initial=await sample();
      await finishFilmstrip(); finishFilmstrip=null;
      await page.screenshot({path:path.join(output,`${mode}-${theme}-playing.png`)});
      await page.waitForTimeout(650);result.progress=await sample();
      if(audioThemes.has(theme)) {
        const sound=frame.locator('.hp-hero button').filter({hasText:/Enable.*sound|Enable autumn|Enable ocean|Mute.*sound|Sound off|Ocean sounds|Autumn sounds/i}).first();
        if(result.initial.videos[0]?.muted) await sound.click();
        await frame.waitForFunction(()=>[...document.querySelectorAll('.hp-hero video')].some(v=>!v.muted&&!v.paused),null,{timeout:10000});
        result.soundEnabled=await sample();await sound.click();result.muted=await sample();
      }
      const pause=frame.getByRole('button',{name:'Pause animation',exact:true});
      if(await pause.count()) {
        await pause.click(); await page.waitForTimeout(250);result.paused=await sample();
        await page.screenshot({path:path.join(output,`${mode}-${theme}-paused.png`)});
        const resume=frame.getByRole('button',{name:/^(Play animation|Resume animation)$/}).first();
        await resume.click();await page.waitForTimeout(650);result.resumed=await sample();
      }
      result.productionRuntime=!resources.some(u=>/babel(?:\.min)?\.js|babel-standalone|react(?:-dom)?\.development/.test(u));
      result.pass=result.status===200 && result.initial.motion==='on' && !result.initial.unstyled && result.productionRuntime && !errors.length;
      if(mode==='phone')result.pass &&= frameThrottles.some(f=>f.applied||f.inherited);
      result.progressed=result.progress.videos.some((v,i)=>v.ended||v.time!==result.initial.videos[i]?.time) || result.progress.animations.some((a,i)=>a.state==='running'&&a.time!==result.initial.animations[i]?.time);
      result.pass &&= result.progressed;
      if(audioThemes.has(theme))result.pass &&= result.initial.plays.some(p=>p.muted===false) && result.soundEnabled.videos.some(v=>!v.muted&&!v.paused) && result.muted.videos.every(v=>v.muted);
      if(result.paused?.videos.length) result.pass &&= result.paused.videos.every(v=>v.paused) && result.resumed.videos.some(v=>!v.paused);
    } catch(error) {result.failure=error.message;result.pass=false;await page.screenshot({path:path.join(output,`${mode}-${theme}-failure.png`)}).catch(()=>{});}
    if(finishFilmstrip)await finishFilmstrip().catch(()=>{});
    results.push(result);fs.writeFileSync(path.join(output,`${mode}-${theme}.json`),JSON.stringify(result,null,2));
    fs.writeFileSync(path.join(output,`${mode}-results.json`),JSON.stringify(results,null,2));
    console.log(JSON.stringify({theme,mode,pass:result.pass,failure:result.failure,controls:result.initial?.controls,errors}));
    await context.close();
  }
  await browser.close();process.exitCode=results.every(r=>r.pass)?0:1;
})().catch(error=>{console.error(error);process.exitCode=1});
