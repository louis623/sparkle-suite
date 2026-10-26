/* Real preview page and assets; synthetic discount exists only in this browser.
 * All writes are mocked/aborted. This does not test a database signup save. */
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {authenticatePreview}=require('./preview-auth.cjs');
const {shouldBlockAppWrite}=require('./browser-readonly.cjs');
const [base,output]=process.argv.slice(2);if(!base?.includes('.vercel.app'))throw Error('Explicit preview required');fs.mkdirSync(output,{recursive:true});
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true,args:process.env.QA_CONTAINER==='1'?['--no-sandbox']:[]}),report={base,url:base+'/qap3amethyst',mockedSignup:false,databaseWrites:0,discountFixture:'QA15, browser memory only',errors:[],blockedWrites:[]};
 try{
  for(const js of [false,true]){
   const context=await browser.newContext({viewport:{width:360,height:800},javaScriptEnabled:js,permissions:js?['clipboard-read','clipboard-write']:[]});await authenticatePreview(context,base);
   await context.route('**/*',route=>{const r=route.request();if(!shouldBlockAppWrite(r,base))return route.fallback();if(r.method()==='POST'&&r.url().includes('/api/amethyst/customer-audience')){assert.equal(r.postDataJSON().email,'qa@example.invalid');report.mockedSignup=true;return route.fulfill({status:200,contentType:'application/json',body:'{"ok":true}'});}report.blockedWrites.push({method:r.method(),url:r.url()});return route.abort()});
   const page=await context.newPage();page.on('pageerror',e=>report.errors.push(e.message));await page.goto(report.url,{waitUntil:'domcontentloaded',timeout:90000});if(js)await page.waitForFunction(()=>window.SPARKLE_FIRST_PAINT===null,null,{timeout:45000});
   const form=page.locator('.hp-signup-form');assert.equal(await form.getAttribute('method'),'post');assert.equal(await form.getAttribute('action'),'#signup');
   if(!js){assert.equal(await form.locator('button[type=submit]').isDisabled(),true);await form.getByLabel('First name',{exact:true}).fill('Preview');await form.getByLabel('Last name',{exact:true}).fill('Check');await form.getByLabel('Email',{exact:true}).fill('qa@example.invalid');await form.getByLabel('Email',{exact:true}).press('Enter');assert.equal(page.url(),report.url);report.preHydrationPrivacy=true;await page.screenshot({path:path.join(output,'phone-no-js.png')});}
   else{
    await page.evaluate(()=>{window.AMETHYST_HOMEPAGE_TEMPLATE_DATA.signupDiscountCode='QA15';window.AMETHYST_HOMEPAGE_TEMPLATE_DATA.signupDiscountOffer='15% off'});
    await form.getByLabel('First name',{exact:true}).fill('Preview');await form.getByLabel('Last name',{exact:true}).fill('Check');await form.getByLabel('Email',{exact:true}).fill('qa@example.invalid');const next=()=>form.getByRole('button',{name:/^Continue/}).click();await next();
    for(let step=1;step<=4;step++){await form.getByRole('checkbox',{name:/Not sure yet/i}).check();await next()}
    await form.getByRole('checkbox',{name:'Email me show reminders and collection updates.'}).check();await next();await next();await form.getByLabel('Ring size',{exact:true}).selectOption('not_sure');await next();await next();await form.getByRole('button',{name:/^Sign me up/}).click();const copy=page.getByRole('button',{name:/Copy QA15/i});await copy.waitFor();await copy.click();await page.getByRole('button',{name:/Copied QA15/i}).waitFor();report.clipboard=await page.evaluate(()=>navigator.clipboard.readText());assert.equal(report.clipboard,'QA15');await page.screenshot({path:path.join(output,'phone-discount-copied.png')});report.questionnaire=true;
    const response=await page.goto(base+'/privacy-policy',{waitUntil:'domcontentloaded'});report.privacyStatus=response.status();assert.equal(response.status(),200);assert.match(await page.locator('body').innerText(),/privacy policy/i);await page.screenshot({path:path.join(output,'phone-privacy-policy.png')});
   }
   await context.close();
  }
  assert.equal(report.errors.length,0);assert.equal(report.mockedSignup,true);report.pass=true;
 }catch(error){report.error=error.message;report.pass=false;process.exitCode=1}
 finally{fs.writeFileSync(path.join(output,'results.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report));await browser.close()}
})().catch(error=>{console.error(error);process.exitCode=1});
