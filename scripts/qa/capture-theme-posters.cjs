// Capture the existing public marketing preview; no account writes or new art.
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const sharp=require('sharp'),fs=require('node:fs'),path=require('node:path');
const [base,output,documents]=process.argv.slice(2);
if(!base||!output)throw Error('Usage: capture-theme-posters.cjs BASE OUTPUT');
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true,args:['--autoplay-policy=document-user-activation-required']});
 try {
 const themes=documents?fs.readdirSync(documents).filter(name=>name.endsWith('.html')).map(name=>name.slice(0,-5)):['sunset_beach'];
 for(const theme of themes){
  const modes=['desktop','phone'];
  for(const mode of modes){
   const context=await browser.newContext({viewport:mode==='phone'?{width:390,height:640}:{width:1200,height:850}}),page=await context.newPage();
   const response=documents?null:await context.request.get(base+'/api/public/landing-demo/preview?theme='+theme);
   if(response&&!response.ok())throw Error('Preview unavailable: '+theme);
   // Browser-local document only. Allow its approved public movie for capture;
   // the deployed opaque frame keeps its original data-only media policy.
   const document=(documents?fs.readFileSync(path.join(documents,theme+'.html'),'utf8'):await response.text()).replace('media-src data:;',`media-src data: ${base};`);
   const url=base+'/__browser-only-poster/'+theme;
   await page.route(url,route=>route.fulfill({status:200,contentType:'text/html',body:document}));
   await page.goto(url,{waitUntil:'domcontentloaded'});await page.locator('.hp-hero').waitFor();
   await page.evaluate(()=>document.fonts.ready);await page.waitForTimeout(4500);
   await page.evaluate(()=>document.querySelectorAll('video').forEach(v=>v.pause()));
   const name=theme+(mode==='phone'?'-mobile':'')+'.webp';
   const image=await page.screenshot();await sharp(image).webp({quality:85,effort:6}).toFile(path.join(output,name));
   console.log(JSON.stringify({theme,mode,name,bytes:fs.statSync(path.join(output,name)).size}));await context.close();
  }
 }
 } finally { await browser.close(); }
})().catch(error=>{console.error(error);process.exitCode=1});
