import { createRequire } from 'node:module'
import { access, readFile } from 'node:fs/promises'
import { isAbsolute, join } from 'node:path'
import { createHash } from 'node:crypto'
import assert from 'node:assert/strict'
import sharp from 'sharp'

const require=createRequire(import.meta.url)
let browser
const offlineScripts = new Map()
const oldScripts = [
  ['react@18.3.1/umd/react.development.js','react.development.js','hD6/rw4ppMLGNu3tX5cjIb+uRZ7UkRJ6BPkLpg4hAu/6onKUg4lLsHAs9EBPT82L'],
  ['react-dom@18.3.1/umd/react-dom.development.js','react-dom.development.js','u6aeetuaXnQ38mYT8rp6sbXaQe3NL9t+IBXmnYxwkUI2Hw4bsp2Wvmx4yRQF1uAm'],
  ['@babel/standalone@7.29.0/babel.min.js','babel.min.js','m08KidiNqLdpJqLq95G/LEi8Qvjl/xUYll3QILypMoQ65QorJ9Lvtp2RXYGBFj1y'],
]
async function prepareOldRuntime(c) {
  // HEAD is an API/provenance check. It does not download a document.
  const headers=await c.api(c.shopperPath,{method:'HEAD'})
  assert(headers.ok,'Previous reviewer page is unavailable')
  if(headers.headers.get('x-sparkle-page-data'))return
  const dir=process.env.SPARKLE_SWAP_LEGACY_RUNTIME_DIR
  assert(dir&&isAbsolute(dir),'Prior reviewer uses the legacy renderer. Supply its three existing SHA384-pinned offline scripts before opening a document.')
  for(const [url,file,expected] of oldScripts){
    const bytes=await readFile(join(dir,file))
    assert.equal(createHash('sha384').update(bytes).digest('base64'),expected,'Legacy script integrity mismatch: '+file)
    offlineScripts.set('https://unpkg.com/'+url,bytes)
  }
}
const uploads='/api/amethyst/trade-requests/uploads'
const submit='/api/amethyst/trade-requests'
const sleep=ms=>new Promise(r=>setTimeout(r,ms))
const text=(p,label)=>p.getByText(label,{exact:false}).first()
const exactName=s=>new RegExp('^'+s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'$','i')
const button=(p,label)=>p.getByRole('button',{name:typeof label==='string'?exactName(label):label}).first()
const routeIs=(url,path)=>new URL(url).pathname===path
const until=async (fn,ms=10000)=>{
  const end=Date.now()+ms
  do {if(await fn())return; await sleep(100)}while(Date.now()<end)
  throw new Error('Expected browser condition did not occur')
}
const opened = new Map()
const boards = new WeakMap()
const watch = promise => { void promise.catch(() => {}); return promise }
function reason(error) {
  return String(error?.message ?? error).split('\n').slice(0,4).join(' ').replace(/https?:\/\/\S+/g,'[URL]').replace(/[a-f0-9]{64,}/gi,'[redacted]').slice(0,600)
}
async function snapshot(c,p,phase) {
  const state = await p.evaluate(() => {
    const cards = [...document.querySelectorAll('article.tp-card')].filter(el => el.getClientRects().length)
    return { cards:cards.map(el => {
      let fiber = el[Object.keys(el).find(key => key.startsWith('__reactFiber$'))]
      while(fiber && !fiber.memoizedProps?.piece?.id) fiber = fiber.return
      return {id:fiber?.memoizedProps?.piece?.id ?? null, heading:el.querySelector('h3')?.textContent?.trim(), actions:[...el.querySelectorAll('button,a')].map(a=>a.getAttribute('aria-label')||a.textContent.trim())}
    }), bootstrap:(window.AMETHYST_TRADE_BOARD_LISTINGS || []).map(({id,name})=>({id,name})),
    headings:[...document.querySelectorAll('h1,h2,h3,[role=alert],[role=status]')].filter(el=>el.getClientRects().length).map(el=>el.textContent.trim()).slice(0,45) }
  })
  const result={phase,boards:[...(boards.get(p)||[])],...state}
  c.proof.screens.push(result)
  await c.checkpoint()
  return result
}
async function attempt(c,slot,fn) {
  try {
    await fn()
    c.proof.cases.push({slot,status:'pass'})
  } catch(error) {
    const page=opened.get(slot)
    if(page) await snapshot(c,page,'failure '+slot).catch(()=>{})
    c.proof.cases.push({slot,status:'failed',reason:reason(error)})
  }
  await c.checkpoint()
}
async function channel(c,slot,repSession=false) {
  assert(((slot===8 || (slot===7 && process.argv.includes('--rep-retry'))) ? c.proof.loads.filter(n=>n===slot).length<2 : !c.proof.loads.includes(slot))&&c.proof.loads.length<10,'Document budget exhausted')
  const context=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'block',
    userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 Version/17.5 Mobile/15E148 Safari/604.1'})
  if(repSession)await context.addCookies(c.roleCookies[0])
  let navigated=false
  await context.route('**/*',async route=>{
    const req=route.request(),url=new URL(req.url())
    if(url.protocol==='blob:'||url.protocol==='data:')return route.continue()
    const localScript=offlineScripts.get(url.href)
    if(localScript && req.resourceType()==='script' && req.method()==='GET')
      return route.fulfill({status:200,headers:{'content-type':'text/javascript','access-control-allow-origin':c.origin},body:localScript})
    if(![c.origin,'https://pukemqiwlyqmyytxkdmo.supabase.co'].includes(url.origin)) return route.abort()
    if(req.resourceType()==='document'){
      if(navigated||url.origin!==c.origin)return route.abort()
      navigated=true;c.proof.loads.push(slot)
    }
    return route.continue()
  })
  const page=await context.newPage()
  opened.set(slot,page)
  boards.set(page,[])
  page.on('response',async r=>{
    const url=new URL(r.url())
    if(url.origin!==c.origin || url.pathname!=='/api/amethyst/trade-board')return
    const data=await r.json().catch(()=>null)
    boards.get(page).push({status:r.status(),slug:url.searchParams.get('publicSiteSlug'),rep:url.searchParams.get('c'),rows:(data?.listings||[]).map(({id,name})=>({id,name}))})
  })
  // Keep diagnostics confined to status codes and path names. Signed URLs,
  // receipt tokens, request bodies, console text and cookies stay out of the journal.
  page.on('pageerror',err=>c.proof.observations.push('Browser '+slot+' '+err.name+' during page execution'))
  page.on('requestfailed',req=>{
    const u=new URL(req.url())
    if(u.origin===c.origin && (req.resourceType()==='script' || u.pathname.startsWith('/api/amethyst/trade-requests')))
      c.proof.observations.push('Failed '+slot+' '+req.method()+' '+u.pathname)
  })
  page.on('response',r=>{
    const u=new URL(r.url())
    if((u.origin===c.origin && u.pathname.startsWith('/api/amethyst/trade-requests') && !u.pathname.includes('status')) || offlineScripts.has(u.href))
      c.proof.observations.push('HTTP '+slot+' '+r.request().method()+' '+u.pathname+' '+r.status())
  })
  page.setDefaultTimeout(15000)
  const path=repSession?'/nic-nac':c.shopperPath
  const doc=await page.goto(c.origin+path,{waitUntil:'domcontentloaded'})
  assert(doc?.ok() && new URL(page.url()).pathname===new URL(path,c.origin).pathname,'Wrong Smoke document')
  return page
}
async function sheet(c,p,key) {
  const search=p.getByPlaceholder('Search by dancer, collection, size')
  await search.waitFor()
  const expected=c.listing(key)
  const response=watch(p.waitForResponse(r=>routeIs(r.url(),'/api/amethyst/trade-board'),{timeout:12000}))
  await p.evaluate(()=>window.dispatchEvent(new Event('focus')))
  await response.catch(()=>null)
  await search.fill('')
  const before=await snapshot(c,p,'before search '+key)
  const board=before.boards.at(-1)?.rows||before.bootstrap
  const row=board.find(r=>r.id===expected)||before.cards.find(r=>r.id===expected)
  const query=row?.name || row?.heading || c.designName(key)
  await search.fill(query)
  await until(async()=>await p.locator('article.tp-card:visible h3').allTextContents().then(names=>names.some(n=>n.trim()===query)),2500).catch(()=>{})
  const after=await snapshot(c,p,'after search '+query)
  const match=after.cards.filter(x=>x.id===expected)
  assert.equal(match.length,1,'Run-owned dancer absent or ambiguous after searching '+query)
  const matches=p.locator('article.tp-card:visible')
  const card=matches.nth(after.cards.indexOf(match[0]))
  const bound=await card.evaluate(el=>{
    let fiber=el[Object.keys(el).find(k=>k.startsWith('__reactFiber$'))]
    while(fiber&&!fiber.memoizedProps?.piece?.id)fiber=fiber.return
    return fiber?.memoizedProps?.piece?.id
  })
  assert.equal(bound,expected,'Rendered dancer changed before opening')
  assert.equal(await card.count(),1,'Missing ID-bound card')
  const action=card.getByRole('button',{name:/^view dancer and send a swap request$/i})
  c.proof.observations.push('Card accessibility: '+(await card.ariaSnapshot()).replace(/\n/g,' ').slice(0,540))
  assert.equal(await action.count(),1,'Card has no accessible swap action')
  await action.click()
  await button(p,'Request this swap').click()
}
const img=(name,buffer,mimeType='image/jpeg')=>({name,mimeType,buffer})
async function synthetic(color,mark){
  const svg=Buffer.from('<svg width="1200" height="900"><rect width="1200" height="900" fill="'+color+'"/><circle cx="600" cy="450" r="190" fill="white"/><text x="570" y="470" font-size="90">'+mark+'</text></svg>')
  return sharp(svg).jpeg().withMetadata({orientation:6}).toBuffer()
}
const pick=(p,image)=>p.getByLabel('Choose from library',{exact:true}).setInputFiles(image)
const name=(p,value)=>p.getByLabel('Your name',{exact:true}).fill(value)
async function send(c,p,key,label=/^Send swap request$|^Send as /){
  const pending=watch(p.waitForResponse(r=>routeIs(r.url(),submit)&&r.request().method()==='POST'&&r.ok()))
  await button(p,label).click()
  const r=await pending
  await c.receipt(await r.json(),key)
  await text(p,'Request sent').waitFor()
  return r.request().postDataJSON()
}
async function verifiedImage(c,requestId,ownerIdx,variant){
  const cookie=c.roleCookies[ownerIdx]?.map(v=>v.name+'='+v.value).join('; ')
  const response=await c.api('/api/nic-nac/trade-requests/'+requestId+'/reveal-screenshot'+(variant?'?variant=thumb':''),{headers:cookie?{cookie}:{}})
  if(ownerIdx!==0){
    assert(!response.headers.has('location'))
    if(response.status===400)assert.equal((await response.json()).code,'LISTING_NOT_FOUND')
    else assert([401,403,404].includes(response.status))
    return
  }
  assert.equal(response.status,307)
  const dest=new URL(response.headers.get('location'))
  assert.equal(dest.origin,'https://pukemqiwlyqmyytxkdmo.supabase.co')
  const blob=await fetch(dest,{redirect:'error',signal:AbortSignal.timeout(15000)})
  assert(blob.ok)
  const bytes=Buffer.from(await blob.arrayBuffer())
  return {bytes,metadata:await sharp(bytes).metadata(),path:dest.pathname}
}
async function pixelAtCorner(bytes) {
  const {channels}=await sharp(bytes).extract({left:8,top:8,width:20,height:20}).stats()
  return channels.map(x=>x.mean)
}
async function browseAlert(page,customer) {
  const alert=page.locator('[aria-label="Swap requests"]:visible [role="status"]').first()
  await alert.waitFor()
  const next=alert.getByRole('button',{name:'Next swap request'})
  const initial=await alert.innerText()
  for(let index=0;index<50;index++){
    if((await alert.innerText()).includes(customer+' wants'))return alert
    if(!await next.isEnabled())break
    const position=await alert.innerText()
    await next.click()
    await until(async()=>await alert.innerText()!==position,2000)
    if(await alert.innerText()===initial)break
  }
  throw Error('Requested shopper was not found in the pending alert carousel')
}
async function checkLocalColor(p,color) {
  const pixel=await p.getByRole('button',{name:'Preview your photo'}).locator('img').evaluate(async img=>{
    await img.decode()
    if(!img.src.startsWith('blob:'))throw new Error('Network image used for preview')
    const canvas=document.createElement('canvas')
    canvas.width=2;canvas.height=2
    const ctx=canvas.getContext('2d');ctx.drawImage(img,0,0,2,2)
    return [...ctx.getImageData(0,0,1,1).data]
  })
  assert(color==='red'?pixel[0]>pixel[1]+40:pixel[1]>pixel[0]+40,'Wrong or blank preview')
}
export async function openOldDocument(c) {
  await prepareOldRuntime(c)
  const lib=process.env.SPARKLE_SWAP_PLAYWRIGHT
  assert(lib&&isAbsolute(lib),'Point SPARKLE_SWAP_PLAYWRIGHT to an already installed playwright-core directory')
  const {chromium}=require(lib)
  const heic=process.env.SPARKLE_SWAP_HEIC_FILE
  if(heic)await access(heic)
  browser=await chromium.launch({headless:true,...(process.env.SPARKLE_SWAP_CHROME_PATH?{executablePath:process.env.SPARKLE_SWAP_CHROME_PATH}:{})})
  if(process.argv.includes('--resume-candidate') || process.argv.includes('--rep-retry'))return null
  for(let i=0;i<2;i++){
  try{
  const old=await channel(c,8)
  await sheet(c,old,'primary')
  await name(old,'Old '+c.runId.slice(0,8))
  await old.getByLabel('What did you just reveal?').fill('My earlier earrings')
  const oldBytes=await synthetic('#175ee6','A')
  const confirmed=watch(old.waitForResponse(r=>routeIs(r.url(),uploads+'/confirm')&&r.ok()))
  await old.locator('input[type=file]').first().setInputFiles(img('old.jpg',oldBytes))
  const confirm=await confirmed
  assert.equal((await confirm.json()).ready,true)
  await c.confirmOld(confirm.request().postDataJSON().uploadId)
  await text(old,'Attached and ready').waitFor()
  return old
  }catch(error){
    const p=opened.get(8)
    if(p){await snapshot(c,p,'old attempt '+(i+1)).catch(()=>{});await p.context().close()}
    c.proof.observations.push('Old attempt '+(i+1)+': '+reason(error))
    await c.checkpoint()
  }}
  c.proof.cases.push({slot:8,status:'blocked',reason:'Neither old document confirmed a single JPEG'})
  return null
}
export async function runBrowserReview(c,old) {
  const red=img('first.jpg',await synthetic('#e63321','B')), green=img('replacement.jpg',await synthetic('#1fbc3d','C'))
  if(old)await attempt(c,8,async()=>{
  await send(c,old,'old')
  const original=await verifiedImage(c,c.receipts.old,0,false)
  const fallback=await verifiedImage(c,c.receipts.old,0,true)
  assert.equal(fallback.path,original.path)
  assert(fallback.bytes.equals(original.bytes))
  // Same old JS document, new sheet/identity, genuinely old form without an upload.
  await old.getByRole('dialog').getByRole('button',{name:/done|close|back to/i}).last().click()
  await sheet(c,old,'alternate');await name(old,'Old missing photo');await old.getByLabel('What did you just reveal?').fill('Older form')
  const refused=watch(old.waitForResponse(r=>routeIs(r.url(),submit)))
  await button(old,'Send swap request').click()
  const rejection=await refused;assert.equal(rejection.status(),400);assert.equal((await rejection.json()).code,'PHOTO_REQUIRED')
  await c.release(c.receipts.old)
  c.proof.observations.push('8: old-writer JPEG accepted, owner fallback bytes match, second old sheet rejected without photo')

  })
  await attempt(c,1,async()=>{
  const p=await channel(c,1);await sheet(c,p,'primary')
  let allowConfirm
  const gate=new Promise(resolve=>{allowConfirm=resolve})
  await p.route('**/api/amethyst/trade-requests/uploads/confirm*',async r=>{await gate;await r.continue()})
  await pick(p,red);await button(p,'Continue').click();await name(p,'First '+c.runId.slice(0,8))
  assert(await button(p,/^Send swap request|^Send as /).isDisabled())
  const images=[]
  const observer=req=>{if(req.resourceType()==='image'&&/^https?:/.test(req.url()))images.push(req.url())}
  p.on('request',observer)
  await checkLocalColor(p,'red')
  await button(p,'Preview your photo').click()
  await p.getByRole('dialog',{name:'Your photo'}).waitFor()
  await button(p,'Close preview').click()
  assert.equal(await p.evaluate(()=>document.activeElement?.getAttribute('aria-label')),'Preview your photo')
  p.off('request',observer);assert.equal(images.length,0)
  allowConfirm()
  const payload=await send(c,p,'primary')
  await c.replay(payload,'primary')
  const rendered=await verifiedImage(c,c.receipts.primary,0,false)
  const thumb=await verifiedImage(c,c.receipts.primary,0,true)
  assert(Math.max(thumb.metadata.width,thumb.metadata.height)<=800)
  assert.notEqual(thumb.path,rendered.path)
  const rgb=await pixelAtCorner(rendered.bytes);assert(rgb[0]>rgb[1]+40)
  await verifiedImage(c,c.receipts.primary,1,false);await verifiedImage(c,c.receipts.primary,2,false)
  c.proof.observations.push('1: blocked while confirming; local red preview, focus restored without HTTP images; pending private receipt')

  })
  await attempt(c,2,async()=>{
  const retry=await channel(c,2);await sheet(c,retry,'primary')
  let fail=true
  await retry.route('**/api/amethyst/trade-requests/uploads/confirm*',async route=>{
    if(!fail)return route.continue()
    return route.fulfill({status:503,contentType:'application/json',body:'{"error":"Synthetic interrupted confirmation"}'})
  })
  // When no real HEIC was supplied, exercise the iPhone JPEG picker branch and
  // record that the browser is emulation, not native camera evidence.
  const input=retry.getByLabel('Choose from library',{exact:true})
  assert(!/hei[cf]/i.test(await input.getAttribute('accept')))
  const source=process.env.SPARKLE_SWAP_HEIC_FILE
  await pick(retry,source?img('capture.heic',await readFile(source),'image/heic'):red)
  await button(retry,'Continue').click();await name(retry,'Retry '+c.runId.slice(0,8))
  await button(retry,'Try again').waitFor({timeout:30000})
  fail=false;await button(retry,'Try again').click()
  await button(retry,'Change photo').click()
  await pick(retry,green);await button(retry,'Continue').click();await checkLocalColor(retry,'green')
  // Drive the image onError branch on a valid upload, keeping the selected file.
  await button(retry,'Preview your photo').locator('img').dispatchEvent('error')
  await until(async()=>await button(retry,'Preview your photo').count()===0)
  await button(retry,'Change photo').waitFor()
  await send(c,retry,'retry')
  const after=await verifiedImage(c,c.receipts.retry,0,false),afterRGB=await pixelAtCorner(after.bytes)
  assert(afterRGB[1]>afterRGB[0]+40,'Rep received stale or blank replacement')
  await c.release(c.receipts.retry)
  c.proof.observations.push('2: failed confirmation retried; green replacement verified in sheet and stored JPEG; failed preview still sent')

  })
  await attempt(c,3,async()=>{
  const alt=await channel(c,3);await sheet(c,alt,'primary')
  const tickets=[]
  alt.on('response',r=>{if(routeIs(r.url(),uploads)&&r.request().method()==='POST'&&r.ok())tickets.push(r.request().postDataJSON())})
  await pick(alt,red);await button(alt,'Continue').click();await name(alt,'Alternate '+c.runId.slice(0,8))
  await button(alt.getByRole('dialog'),'Earrings').click();await button(alt.getByRole('dialog'),'Birthday').click()
  await button(alt,c.designName('alternate')).waitFor()
  // Drop a first POST before it reaches the server; the switch must settle A.
  const dropped=async route=>{if(route.request().postDataJSON()?.intent==='send')return route.abort('failed');return route.continue()}
  await alt.route('**/api/amethyst/trade-requests?*',dropped)
  await button(alt,'Ask my rep to review anyway').click()
  await button(alt,'Retry this same request').waitFor({timeout:35000})
  await alt.unroute('**/api/amethyst/trade-requests?*',dropped)
  await button(alt,c.designName('alternate')).click()
  await button(alt,'Continue').click()
  await send(c,alt,'alternate')
  assert(tickets.some(t=>t.listingId===c.listing('primary'))&&tickets.some(t=>t.listingId===c.listing('alternate')))
  assert.notEqual(tickets[0].submissionId,tickets.at(-1).submissionId)
  await c.release(c.receipts.alternate)
  c.proof.observations.push('3: uncertain A settled before B, distinct submission/ticket, delivered alternate dancer')
  })
  await attempt(c,4,async()=>{
  const outage=await channel(c,4);await c.policy(true);await sheet(c,outage,'primary');await button(outage,'Continue').click()
  await name(outage,'Outage '+c.runId.slice(0,8));await send(c,outage,'outage')
  await c.contention()
  c.proof.observations.push('4: outage name-only submitted and reached pending status')

  })
  await attempt(c,5,async()=>{
  const flip=await channel(c,5);await sheet(c,flip,'primary');await button(flip,'Continue').click()
  await name(flip,'Keep this name');await button(flip,'Ring').click();await c.policy(false)
  await flip.evaluate(()=>document.dispatchEvent(new Event('visibilitychange')))
  await text(flip,'Add a photo of your reveal').waitFor({timeout:55000})
  await text(flip,/photo upload is working again/i).waitFor()
  await pick(flip,green);await button(flip,'Continue').click()
  assert.equal(await flip.getByLabel('Your name',{exact:true}).inputValue(),'Keep this name')
  assert.equal(await button(flip,'Ring').getAttribute('aria-pressed'),'true')
  c.proof.observations.push('5: expired option returned sheet to first screen with name and Ring retained')
  })
  await attempt(c,'opportunistic',()=>c.opportunisticControl())
  await attempt(c,'maintenance',()=>c.maintenance())
  await attempt(c,'fallback seed',()=>c.seedFallbackAlerts())
  await attempt(c,6,async()=>{

  const rep=await channel(c,6,true),buyer='First '+c.runId.slice(0,8)
  await browseAlert(rep,buyer)
  await text(rep,buyer+' wants '+c.designName('primary')).waitFor()
  await text(rep,/Photo attached/i).waitFor()
  const offer=rep.getByAltText('Protected reveal screenshot from '+buyer).first()
  await offer.waitFor()
  await until(()=>offer.evaluate(im=>im.complete&&im.naturalWidth>0))
  assert((await offer.getAttribute('src')).includes(c.receipts.primary))
  await text(rep,/Requested (?:just now|\d+ min ago)/i).waitFor()
  await text(rep,'Needs verification').waitFor()
  const requested=rep.locator('img:visible')
  assert(await requested.evaluateAll((items,keyword)=>items.some(im=>im.alt.includes(keyword)&&im.complete&&im.naturalWidth>0),c.designName('primary')))
  const pending=await c.api('/api/nic-nac/trade-requests?status=pending&order=dancer',
    {headers:{cookie:c.roleCookies[0].map(v=>v.name+'='+v.value).join('; ')}})
  assert(pending.ok)
  const ordered=await pending.json()
  assert(ordered.findIndex(r=>r.id===c.receipts.primary)>=0 &&
    ordered.findIndex(r=>r.id===c.receipts.primary)<ordered.findIndex(r=>r.id===c.receipts.outage),
    'Rep inbox did not put the older request for this dancer first')
  const openChat=button(rep,'Open Nic-Nac');if(await openChat.isVisible())await openChat.click()
  const reviewLink=rep.locator('a[href*="tradeRequest='+c.receipts.primary+'"]').first()
  await reviewLink.click()
  await rep.getByRole('dialog').first().waitFor()
  await text(rep,c.designName('primary')).waitFor()
  c.proof.observations.push('6: primary alert, offer image and pictured dancer, age, screening and request-specific dialog')
  })
  await attempt(c,7,async()=>{
  const fall=await channel(c,7,true)
  for(const [buyer,offer] of [['Outage '+c.runId.slice(0,8),/No photo, no details/i],[c.designName('legacy')+' shopper','My vintage blue drop earrings']]){
    await browseAlert(fall,buyer)
    await text(fall,buyer+' wants').waitFor()
    await text(fall,offer).waitFor()
  }
  await browseAlert(fall,c.designName('expired')+' shopper')
  await text(fall,/Photo expired after 7 days/i).waitFor()
  const openChat=button(fall,'Open Nic-Nac');if(await openChat.isVisible())await openChat.click()
  const legacyLink=fall.locator('a[href*="tradeRequest='+c.idFor('request legacy')+'"]').first()
  await legacyLink.click();await fall.getByRole('dialog').first().waitFor()
  await text(fall,'My vintage blue drop earrings').waitFor()
  c.proof.observations.push('7: outage, expired and genuine legacy offer observed; legacy link opened correct dialog')
  })
}
// A final rep document may verify multiple controls. All preceding loads remain charged.
export async function runRepRetry(c) {
  const primaryName='First '+c.runId.slice(0,8), outageName='Outage '+c.runId.slice(0,8)
  const path='/api/amethyst/trade-requests', suffix='?c='+c.rep
  async function post(url,body){
    const r=await c.api(url+suffix,{method:'POST',headers:{origin:c.origin,'content-type':'application/json'},body:JSON.stringify(body)})
    const data=await r.json()
    assert(r.ok,'Smoke API '+url+' HTTP '+r.status+' '+(data.code||''))
    return data
  }
  await attempt(c,'rep photo setup',async()=>{
    const identity={listingId:c.listing('primary'),submissionId:c.idFor('rep retry picture')}
    const bytes=await synthetic('#e63321','D')
    const ticket=await post(uploads,{...identity,byteSize:bytes.length,contentType:'image/jpeg'})
    assert.equal(new URL(ticket.uploadUrl).origin,'https://pukemqiwlyqmyytxkdmo.supabase.co')
    const form=new FormData()
    form.append('cacheControl','3600');form.append('',new Blob([bytes],{type:'image/jpeg'}),'review.jpg')
    const put=await fetch(ticket.uploadUrl,{method:'PUT',headers:{'x-upsert':'false'},body:form,redirect:'error',signal:AbortSignal.timeout(20000)})
    assert(put.ok,'Synthetic upload failed')
    const payload={...identity,uploadId:ticket.uploadId}
    assert((await post(uploads+'/confirm',payload)).ready)
    await c.receipt(await post(path,{...payload,customerName:primaryName,intent:'send'}),'primary')
    const full=await verifiedImage(c,c.receipts.primary,0,false),thumb=await verifiedImage(c,c.receipts.primary,0,true)
    assert.notEqual(full.path,thumb.path)
    assert(Math.max(thumb.metadata.width,thumb.metadata.height)<=800)
    const rgb=await pixelAtCorner(full.bytes);assert(rgb[0]>rgb[1]+40)
    await verifiedImage(c,c.receipts.primary,1,false);await verifiedImage(c,c.receipts.primary,2,false)
  })
  await attempt(c,'rep outage setup',async()=>{
    await c.policy(true)
    try{await c.receipt(await post(path,{listingId:c.listing('primary'),submissionId:c.idFor('rep retry outage'),customerName:outageName,intent:'send'}),'outage')}
    finally{await c.policy(false)}
  })
  await attempt(c,'opportunistic',()=>c.opportunisticControl())
  await attempt(c,'maintenance',()=>c.maintenance())
  await attempt(c,'fallback seed',()=>c.seedFallbackAlerts())
  const page=await channel(c,7,true)
  for(const [key,buyer,expected] of [['primary',primaryName,'Photo attached'],['outage',outageName,'No photo, no details'],['expired',c.designName('expired')+' shopper','Photo expired after 7 days'],['legacy',c.designName('legacy')+' shopper','My vintage blue drop earrings']]){
    await attempt(c,'rep card '+key,async()=>{
      const card=await browseAlert(page,buyer),copy=await card.innerText()
      c.proof.observations.push('Rep '+key+': '+copy.replace(/\s+/g,' ').slice(0,600))
      assert(copy.includes(expected)&&!/See photo|\bnull\b/.test(copy))
      assert(copy.includes('Needs verification')&&copy.includes('Requested '))
      if(key==='primary'){
        const im=card.getByAltText('Protected reveal screenshot from '+buyer)
        await until(()=>im.evaluate(x=>x.complete&&x.naturalWidth>0))
        assert((await im.getAttribute('src')).includes(c.receipts.primary+'/reveal-screenshot?variant=thumb'))
        assert(copy.includes('First pending for this dancer'))
        await button(card,'Approve').click()
        const dialog=page.getByRole('dialog',{name:/Review .*request/i})
        await dialog.waitFor()
        const images=dialog.locator('img')
        await until(()=>images.evaluateAll(ims=>ims.length===2&&ims.every(i=>i.complete&&i.naturalWidth>0)))
        assert((await images.evaluateAll(ims=>ims.map(i=>i.alt))).some(a=>a.includes(c.designName('primary'))))
        await dialog.getByRole('button',{name:'Close swap review'}).click()
      }
    })
  }
  await attempt(c,'legacy conversation deep link',async()=>{
    const open=button(page,'Open Nic-Nac')
    if(await open.isVisible())await open.click()
    const chat=page.locator('#nic-nac-workspace-chat:visible').first()
    const link=chat.locator('a[href*="tradeRequest='+c.idFor('request legacy')+'"]').first()
    await link.waitFor()
    const message=await link.evaluate(a=>a.closest('[data-message-id]')?.innerText || a.parentElement?.parentElement?.innerText)
    assert(message.includes(c.designName('legacy')+' shopper wants')&&message.includes('My vintage blue drop earrings')&&!/See photo|\bnull\b/.test(message))
    await link.click()
    await text(page.getByRole('dialog'),'My vintage blue drop earrings').waitFor()
  })
  await snapshot(c,page,'final rep document')
}
export async function closeBrowser(){if(browser)await browser.close()}
