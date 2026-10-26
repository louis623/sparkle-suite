/* Local fixture UI verification. POST is fulfilled in-browser; no signup is saved. */
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const [base,output]=process.argv.slice(2);
if(!base||!['localhost','127.0.0.1'].includes(new URL(base).hostname))throw Error('Local fixture URL required');
const business='My Sparkling Butterfly Jewelry Studio';
fs.mkdirSync(output,{recursive:true});
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true});const report={base,fixture:true,databaseWrites:0,headers:[],errors:[],blockedWrites:[],mockedSignup:false};
 try{
  for(const mode of ['phone','desktop','no-js']){
   const context=await browser.newContext({viewport:mode==='desktop'?{width:1440,height:900}:{width:390,height:844},javaScriptEnabled:mode!=='no-js',permissions:mode!=='no-js'?['clipboard-read','clipboard-write']:[]});
   const page=await context.newPage();page.on('pageerror',e=>report.errors.push({mode,message:e.message}));
   await context.route('**/*',route=>{
    const request=route.request();if(new URL(request.url()).origin!==new URL(base).origin||['GET','HEAD','OPTIONS'].includes(request.method()))return route.fallback();
    if(request.url().includes('/api/amethyst/customer-audience')&&request.method()==='POST'){
     const body=request.postDataJSON();assert.equal(body.email,'qa@example.invalid');assert.equal(body.firstName,'Preview');report.mockedSignup=true;report.signupPayload={...body};
     return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true})});
    }
    report.blockedWrites.push({method:request.method(),url:request.url()});return route.abort();
   });
   await page.goto(base+'/header37',{waitUntil:'domcontentloaded'});
   if(mode!=='no-js')await page.waitForFunction(()=>window.SPARKLE_FIRST_PAINT===null);
   const header=await page.evaluate(()=>{
    const h=document.querySelector('h1'),location=h?.querySelector('.hp-brand-location'),s=location&&getComputedStyle(location),r=h?.getBoundingClientRect();
    return {h1s:document.querySelectorAll('h1').length,text:h?.textContent,visibleName:[...h.childNodes].filter(n=>n!==location).map(n=>n.textContent).join(''),hidden:s&&{width:s.width,height:s.height,clipPath:s.clipPath,position:s.position},width:r?.width,scrollWidth:h?.scrollWidth,clientWidth:h?.clientWidth,right:r?.right,viewport:innerWidth,overflow:document.documentElement.scrollWidth>innerWidth,footer:document.querySelector('.hp-footer-identity')?.textContent};
   });
   assert.equal(header.h1s,1);assert.equal(header.visibleName,business);assert.match(header.text,/Seattle, Washington/);assert.equal(header.hidden.width,'1px');assert.equal(header.hidden.height,'1px');assert.match(header.hidden.clipPath,/50%/);assert.ok(header.scrollWidth<=header.clientWidth+1);assert.ok(header.right<=header.viewport+1);assert.equal(header.overflow,false);
   const sentence='Preview is the rep for '+business+' in Seattle, Washington.';assert.equal(header.footer.split(sentence).length-1,1);
   const form=page.locator('.hp-signup-form');assert.equal(await form.getAttribute('method'),'post');assert.equal(await form.getAttribute('action'),'#signup');
   if(mode==='no-js'){
    assert.equal(await form.locator('button[type=submit]').isDisabled(),true);
    await form.getByLabel('First name',{exact:true}).fill('Preview');await form.getByLabel('Last name',{exact:true}).fill('Check');await form.getByLabel('Email',{exact:true}).fill('qa@example.invalid');
    await form.getByLabel('Email',{exact:true}).press('Enter');assert.equal(page.url(),base+'/header37');report.preHydrationPrivacy=true;
   }
   await page.screenshot({path:path.join(output,mode+'-header37.png')});report.headers.push({mode,...header});
   if(mode==='phone'){
    await form.getByLabel('First name',{exact:true}).fill('Preview');await form.getByLabel('Last name',{exact:true}).fill('Check');await form.getByLabel('Email',{exact:true}).fill('qa@example.invalid');
    const next=()=>form.getByRole('button',{name:/^Continue/}).click();await next();
    for(let i=1;i<=4;i++){await form.getByRole('checkbox',{name:/Not sure yet/i}).check();await next();}
    await form.getByRole('checkbox',{name:'Email me show reminders and collection updates.'}).check();await next();
    await next();await form.getByLabel('Ring size',{exact:true}).selectOption('not_sure');await next();await next();
    await form.getByRole('button',{name:/^Sign me up/}).click();
    const copy=page.getByRole('button',{name:/Copy QA15/i});await copy.waitFor();await copy.click();await page.getByRole('button',{name:/Copied QA15/i}).waitFor();
    report.clipboard=await page.evaluate(()=>navigator.clipboard.readText());assert.equal(report.clipboard,'QA15');assert.equal(report.mockedSignup,true);assert.ok(!page.url().includes('qa%40'));report.signupConfirmation=await page.locator('.hp-signup-card').innerText();
    await page.screenshot({path:path.join(output,'phone-discount-copied.png')});
   }
   await context.close();
  }
  assert.equal(report.errors.length,0);report.pass=true;
 }catch(error){report.error=error.message;report.pass=false;process.exitCode=1}
 finally{fs.writeFileSync(path.join(output,'results.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report));await browser.close()}
})().catch(error=>{console.error(error);process.exitCode=1});
