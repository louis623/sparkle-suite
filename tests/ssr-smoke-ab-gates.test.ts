import { expect, it, vi, afterEach } from 'vitest'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const { verdict, median, ABSOLUTE_PHONE_WAIVERS } = require('../scripts/qa/ssr-smoke-ab-metrics.cjs')
const { safeOrigin, vercelRecord, targetsFor, route, verifyTheme, hydrationError, SETTLE_MS, allowedAssetRequest } = require('../scripts/qa/ssr-smoke-ab.cjs')
const { cases, actionsFor, selectorsFor } = require('../scripts/qa/ssr-ab-cases.cjs')
afterEach(() => vi.unstubAllGlobals())
function fixture() {
  const rows: Record<string, any>[] = []
  for (const profile of ['phone','desktop']) for (let run=0;run<5;run++) for (const renderer of ['candidate','legacy']) {
    for(const id of cases.pages)rows.push({kind:'paint',id,profile,renderer,run,fcp:100,lcp:200,cls:0,pageErrors:0,hydrationErrors:0,valid:true})
    for(const id of cases.interactions)for(const phase of ['loading','idle'])for(const action of actionsFor(id,renderer))rows.push({kind:'tap',id:id+':'+action,phase,profile,renderer,run,ms:180,pageErrors:0,hydrationErrors:0,valid:true})
  }
  return rows
}
it('retains all existing cases and adds only Lindsey home/join/trade on MHF', () => {
  const targets=targetsFor().map((p: string[])=>p.join('/'))
  expect(targets).toHaveLength(13)
  expect(new Set(targets).size).toBe(targets.length)
  for(const theme of ['gilded_autumn','alpine_opal'])for(const page of ['homepage','join','trade']) {
    expect(targets).toContain(theme+'/'+page)
    expect(route('https://fixture.vercel.app',theme,page)).toContain('ssrReviewLayout=mile_high_fizz')
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
it('gates all applicable controls in fresh loading and idle samples without selector config', () => {
  const rows=fixture()
  expect(verdict(rows,cases,5).pass).toBe(true)
  for(const phase of ['loading','idle']) {
    const bad=rows.map(r=>({...r,ms:r.kind==='tap'&&r.phase===phase&&r.id==='amethyst/homepage:sound'&&r.profile==='phone'&&r.renderer==='candidate'?201:r.ms}))
    expect(verdict(bad,cases,5).pass).toBe(false)
  }
  for(const row of rows)if(row.kind==='tap')row.ms=200
  expect(verdict(rows,cases,5).pass).toBe(true)
  expect(selectorsFor('gilded_autumn/homepage','candidate').motion).toBe('.ga-motion-control')
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
})
it('fails closed if the actual legacy theme differs from the case', async () => {
  const page={evaluate:vi.fn(async()=> 'halloween_pumpkin_cat')}
  await expect(verifyTheme(page,'gilded_autumn')).rejects.toThrow('Review theme mismatch')
  await expect(verifyTheme(page,'halloween_pumpkin_cat')).resolves.toBeUndefined()
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
