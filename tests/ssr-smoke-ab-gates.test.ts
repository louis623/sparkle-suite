import { expect, it, vi, afterEach } from 'vitest'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const { verdict, median, ABSOLUTE_PHONE_WAIVERS } = require('../scripts/qa/ssr-smoke-ab-metrics.cjs')
const { safeOrigin, vercelRecord, targetsFor, route, openCase, verifyTheme, measureTap, hydrationError, SETTLE_MS, allowedAssetRequest } = require('../scripts/qa/ssr-smoke-ab.cjs')
const { cases, actionsFor, selectorsFor, layoutFor } = require('../scripts/qa/ssr-ab-cases.cjs')
afterEach(() => vi.unstubAllGlobals())
function fixture() {
  const rows: Record<string, any>[] = []
  for (const profile of ['phone','desktop']) for (let run=0;run<5;run++) for (const renderer of ['candidate','legacy']) {
    for(const id of cases.pages)rows.push({kind:'paint',id,profile,renderer,run,fcp:100,lcp:200,cls:0,pageErrors:0,hydrationErrors:0,valid:true})
    for(const id of cases.interactions)for(const phase of ['loading','idle'])for(const action of actionsFor(id,renderer))rows.push({kind:'tap',id:id+':'+action,phase,profile,renderer,run,ms:180,pageErrors:0,hydrationErrors:0,valid:true})
  }
  return rows
}
it('covers only the reviewed Lindsey rows and her saved standard Pumpkin Witch layout', () => {
  const targets=targetsFor().map((p: string[])=>p.join('/'))
  expect(targets).toEqual([
    'fall_owl_harvest_moon/homepage','midnight_rose/homepage','rose_gold/homepage',
    ...['gilded_autumn','alpine_opal','halloween_pumpkin_witch'].flatMap(theme=>['homepage','join','trade'].map(page=>theme+'/'+page)),
    'amethyst/homepage',
  ])
  expect(new Set(targets).size).toBe(targets.length)
  expect(cases.interactions).toEqual(targets)
  for(const [theme,page] of targetsFor()) {
    const layout=['halloween_pumpkin_witch','amethyst'].includes(theme)?'standard':'mile_high_fizz'
    expect(layoutFor(theme)).toBe(layout)
    expect(new URL(route('https://fixture.vercel.app',theme,page)).searchParams.get('ssrReviewLayout')).toBe(layout)
  }
  expect(SETTLE_MS).toBe(12000)
  const legacyHTML=readFileSync('lib/amethyst/legacy/assets/Homepage.html','utf8')
  const framework=[...legacyHTML.matchAll(/src="(https:\/\/unpkg.com\/[^"<>]+)"/g)].map(m=>m[1])
  expect(framework).toHaveLength(3)
  for(const url of framework) {
    expect(allowedAssetRequest(url,'https://fixture.vercel.app','legacy')).toBe(true)
    expect(allowedAssetRequest(url,'https://fixture.vercel.app','candidate')).toBe(false)
  }
  expect(allowedAssetRequest('https://unpkg.com/arbitrary.js','https://fixture.vercel.app','legacy')).toBe(false)
  expect(allowedAssetRequest('https://shop.example/','https://fixture.vercel.app','legacy')).toBe(false)
  expect(allowedAssetRequest('https://fixture.vercel.app/','https://fixture.vercel.app','candidate','POST')).toBe(false)

})
it('routes both cohorts to milehighfizz with identical theme/layout/lineup queries before measuring', async () => {
  for(const [theme,pageName] of targetsFor())for(const renderer of ['candidate','legacy']) {
    const root={waitFor:vi.fn(async()=>{}),getAttribute:vi.fn(async()=>renderer==='candidate'?'true':null)}
    const page={goto:vi.fn(async(_url:string,_options:{waitUntil:string;timeout:number})=>({status:()=>200})),locator:vi.fn(()=>root)}
    const origin=`https://${renderer}.vercel.app`
    await openCase(page,origin,theme,pageName,renderer)
    const url=new URL(page.goto.mock.calls[0][0])
    expect(url.origin).toBe(origin)
    expect(url.pathname).toBe('/milehighfizz'+({homepage:'',join:'/join',trade:'/trade'}[pageName as 'homepage'|'join'|'trade']))
    expect(Object.fromEntries(url.searchParams)).toEqual({ssrReviewTheme:theme,ssrReviewLayout:layoutFor(theme),lineupPresentation:'grouped-v1'})
    expect(page.goto.mock.calls[0][1]).toEqual({waitUntil:'commit',timeout:60000})
    expect(root.waitFor).toHaveBeenCalledWith({state:'attached',timeout:30000})
  }
})
it('rejects missing candidate markers or any legacy SSR marker before a measurement can run', async () => {
  for(const [renderer,marker] of [['candidate',null],['candidate','false'],['legacy','true'],['legacy','false'],['legacy','']] as const) {
    const page={goto:vi.fn(async()=>({status:()=>200})),locator:()=>({waitFor:async()=>{},getAttribute:async()=>marker})}
    const measure=vi.fn()
    await expect(openCase(page,'https://fixture.vercel.app','amethyst','homepage',renderer).then(measure)).rejects.toThrow('Renderer mismatch')
    expect(measure).not.toHaveBeenCalled()
  }
})
it('uses the controls actually present in the new MHF and Pumpkin Witch rows', () => {
  for(const theme of ['alpine_opal','fall_owl_harvest_moon','midnight_rose','rose_gold']) {
    expect(selectorsFor(theme+'/homepage','candidate')).toMatchObject({motion:'[data-mhf-video-toggle]',sound:undefined,cta:'.mhf-hero-content:not([data-ssr-reservation]) .mhf-cta-shop'})
    expect(actionsFor(theme+'/homepage','legacy')).toEqual(['nav','cta'])
  }
  for(const page of ['homepage','join','trade']) {
    expect(selectorsFor('halloween_pumpkin_witch/'+page,'candidate').motion).toBe('[data-hero-motion-toggle]')
    expect(selectorsFor('halloween_pumpkin_witch/'+page,'legacy').motion).toBe('.hpw-motion-control')
  }
})
it('measures the new legacy witch Pause/Play control using its paused aria-pressed semantics', async () => {
  let pressed='false'
  const taps: unknown[]=[]
  const button={hasAttribute:()=>false,classList:{contains:(name:string)=>name==='hpw-motion-control'},getAttribute:()=>pressed}
  const el:any={filter:()=>el,first:()=>el,waitFor:async()=>{},evaluate:async(fn:any)=>fn(button),tap:async()=>{pressed=pressed==='true'?'false':'true';taps.push({ms:25,trusted:true})}}
  const page={locator:()=>el,waitForFunction:async()=>{},evaluate:async(fn:any)=>{
    vi.stubGlobal('window',{__ab:{taps}});vi.stubGlobal('document',{readyState:'loading'})
    return fn()
  }}
  for(const action of ['pause','play'])expect(await measureTap(page,'halloween_pumpkin_witch/homepage','legacy',action)).toEqual({ms:25,valid:true,duringLoad:true})
  expect(taps).toHaveLength(2)
})
it('gates all applicable controls in fresh loading and idle samples without selector config', () => {
  const rows=fixture()
  expect(verdict(rows,cases,5).pass).toBe(true)
  for(const [phase,limit] of [['loading',300],['idle',200]] as const) for(const ms of [limit,limit+1]) {
    const measured=rows.map(r=>({...r,ms:r.kind==='tap'&&r.phase===phase&&r.id==='amethyst/homepage:sound'&&r.profile==='phone'&&r.renderer==='candidate'?ms:r.ms}))
    expect(verdict(measured,cases,5).pass).toBe(ms===limit)
  }
  for(const row of rows)if(row.kind==='tap')row.ms=200
  expect(verdict(rows,cases,5).pass).toBe(true)
  expect(selectorsFor('gilded_autumn/homepage','candidate').motion).toBe('.ga-motion-control')
})
it('warns only for candidate loading medians over 200ms and fails only over 300ms', () => {
  for(const ms of [200,201,300,301]) {
    const rows=fixture()
    for(const r of rows)if(r.kind==='tap'&&r.phase==='loading'&&r.renderer==='candidate')r.ms=ms
    const result=verdict(rows,cases,5)
    expect(result.pass).toBe(ms<=300)
    const gates=result.gates.filter((g:any)=>g.gate==='tap'&&g.renderer==='candidate'&&g.phase==='loading')
    expect(gates.length).toBeGreaterThan(0)
    expect(gates.every((g:any)=>g.warn===(ms>200)&&g.limitMs===300)).toBe(true)
  }
})
it('keeps slow legacy taps as baseline medians without failing or warning', () => {
  const rows=fixture()
  for(const r of rows)if(r.kind==='tap'&&r.renderer==='legacy')r.ms=714
  const result=verdict(rows,cases,5)
  expect(result.pass).toBe(true)
  const gates=result.gates.filter((g:any)=>g.gate==='tap'&&g.renderer==='legacy')
  expect(gates.length).toBeGreaterThan(0)
  expect(gates.every((g:any)=>g.baselineOnly&&g.medianMs===714&&g.pass&&!g.warn)).toBe(true)
})
it('keeps legacy page and hydration errors as baseline information', () => {
  const rows=fixture()
  for(const r of rows)if(r.renderer==='legacy'){r.pageErrors=1;r.hydrationErrors=3}
  expect(verdict(rows,cases,5).pass).toBe(true)
  expect(rows.filter(r=>r.renderer==='legacy').every(r=>r.pageErrors===1&&r.hydrationErrors===3)).toBe(true)
})
it('compares FCP and LCP against legacy for every case/profile', () => {
  for(const id of cases.pages) for(const profile of ['phone','desktop']) for(const metric of ['fcp','lcp']) {
    const rows=fixture()
    for(const row of rows)if(row.kind==='paint'&&row.id===id&&row.renderer==='candidate'&&row.profile===profile)row[metric]=300
    expect(verdict(rows,cases,5).pass,`${id}/${profile}/${metric}`).toBe(false)
  }
})
it('rejects any nonzero candidate CLS, page error, hydration error, or late error row', () => {
  for(const field of ['cls','pageErrors','hydrationErrors']) {
    const rows=fixture(); rows[0][field]=field==='cls'?0.000000001:1
    expect(verdict(rows,cases,5).pass).toBe(false)
  }
  expect(verdict([...fixture(),{kind:'error',error:'late failure'}],cases,5).pass).toBe(false)
  for(const code of [418,423,425])expect(hydrationError(`Minified React error #${code}`)).toBe(true)
  expect(hydrationError('Hydration failed')).toBe(true)
})
it('limits waivers to the five fixed phone speed cases; equality fails strict absolute targets', () => {
  expect(ABSOLUTE_PHONE_WAIVERS).toEqual(['gilded_autumn/homepage','gilded_autumn/join','alpine_opal/homepage','alpine_opal/join','alpine_opal/trade'])
  for(const profile of ['phone','desktop'])for(const id of cases.pages) {
    const rows=fixture()
    for(const r of rows)if(r.kind==='paint'&&r.profile===profile&&r.id===id)r.lcp=profile==='phone'?2500:2000
    const g=verdict(rows,cases,5).gates.find((g:any)=>g.gate==='absolute-lcp'&&g.profile===profile&&g.id===id)
    expect(g.pass).toBe(profile==='phone'&&ABSOLUTE_PHONE_WAIVERS.includes(id))
  }
})
it('waivers never skip regression, CLS, errors or taps', () => {
  for(const field of ['fcp','lcp','cls','hydrationErrors','pageErrors']) {
    const rows=fixture()
    for(const r of rows)if(r.kind==='paint'&&r.id==='gilded_autumn/homepage'&&r.renderer==='candidate'&&r.profile==='phone')r[field]=3000
    expect(verdict(rows,cases,5).pass).toBe(false)
  }
})
it('fails closed on missing, invalid, duplicated or undersampled evidence', () => {
  const rows=fixture()
  expect(()=>verdict(rows.slice(1),cases,5)).toThrow('Incomplete')
  rows[0].valid=false
  expect(()=>verdict(rows,cases,5)).toThrow('Incomplete')
  expect(()=>verdict(fixture(),cases,4)).toThrow('At least five')
  expect(()=>median([NaN])).toThrow()
  const duplicate=fixture(); duplicate[1]={...duplicate[0]}
  expect(()=>verdict(duplicate,cases,5)).toThrow('Incomplete')
  expect(()=>verdict([],cases,5)).toThrow('Incomplete')
  const legacyInvalid=fixture();legacyInvalid.find(r=>r.renderer==='legacy')!.valid=false
  expect(()=>verdict(legacyInvalid,cases,5)).toThrow('Incomplete')
  const legacyMissing=fixture().filter(r=>!(r.kind==='paint'&&r.renderer==='legacy'&&r.run===0&&r.profile==='phone'))
  expect(()=>verdict(legacyMissing,cases,5)).toThrow('Incomplete')
  expect(verdict([...fixture(),{kind:'error',renderer:'legacy',error:'Measurement failed'}],cases,5).pass).toBe(false)
})
it('fails closed if the actual legacy theme differs from the case', async () => {
  const page={evaluate:vi.fn(async()=> 'halloween_pumpkin_cat')}
  await expect(verifyTheme(page,'gilded_autumn')).rejects.toThrow('Review theme mismatch')
  await expect(verifyTheme(page,'halloween_pumpkin_cat')).resolves.toBeUndefined()
  // The runner records a theme verification failure as a measurement error.
  const rows=fixture()
  try { await verifyTheme(page,'gilded_autumn') }
  catch { rows.push({kind:'error',renderer:'legacy',error:'Measurement failed (details suppressed)'}) }
  expect(verdict(rows,cases,5).pass).toBe(false)
})
it('reads Vercel metadata through a strict output allowlist without contacting Vercel', async () => {
  vi.stubGlobal('fetch',vi.fn(async()=>({ok:true,json:async()=>({id:'dpl_fixture',url:'fixture.vercel.app',projectId:'smoke',gitSource:{sha:'fixture-sha'},readyState:'READY',alias:'sparkle-suite-smoke.vercel.app',deploymentId:'dpl_fixture',protectionBypass:{},automationBypass:{},secret:{}})})))
  expect(await vercelRecord('/fixture','deployment')).toEqual({id:'dpl_fixture',url:'fixture.vercel.app',projectId:'smoke',sha:'fixture-sha',readyState:'READY'})
  expect(await vercelRecord('/fixture','alias')).toEqual({alias:'sparkle-suite-smoke.vercel.app',deploymentId:'dpl_fixture',projectId:'smoke'})
})
it('rejects live, mutable, credential-bearing and query-bearing origins before any request', () => {
  for(const origin of ['https://www.yoursparklesuite.com','https://sparkle-suite-smoke.vercel.app','https://fixture.vercel.app?test=1','http://fixture.vercel.app','https://user@fixture.vercel.app'])expect(()=>safeOrigin(origin)).toThrow()
  expect(safeOrigin('https://fixture.vercel.app')).toBe('https://fixture.vercel.app')
})
