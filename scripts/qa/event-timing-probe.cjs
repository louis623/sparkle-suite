const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true,args:process.env.QA_CONTAINER==='1'?['--no-sandbox']:[]});
 const page=await browser.newPage();await page.setContent('<button>Timing probe</button>');
 await page.evaluate(()=>{window.probe=[];new PerformanceObserver(list=>window.probe.push(...list.getEntries().map(e=>({name:e.name,duration:e.duration,interactionId:e.interactionId})))).observe({type:'event',durationThreshold:16});document.querySelector('button').onclick=()=>{const start=performance.now();while(performance.now()-start<250){};document.querySelector('button').textContent='Done'}});
 await page.getByRole('button').click();await page.waitForTimeout(500);const result=await page.evaluate(()=>({supported:PerformanceObserver.supportedEntryTypes.includes('event'),events:window.probe}));console.log(JSON.stringify(result));await browser.close();if(!result.events.some(e=>e.interactionId&&e.duration>=200))process.exitCode=1;
})().catch(error=>{console.error(error);process.exitCode=1});
