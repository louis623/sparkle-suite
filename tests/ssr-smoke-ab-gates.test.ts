import { expect, it, vi, afterEach } from 'vitest'
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const { verdict, median } = require('../scripts/qa/ssr-smoke-ab-metrics.cjs')
const { safeOrigin, vercelRecord, targetsFor } = require('../scripts/qa/ssr-smoke-ab.cjs')
afterEach(() => vi.unstubAllGlobals())
function fixture() {
  const rows: Record<string, unknown>[] = []
  for (const profile of ['phone','desktop']) for (let run=0;run<5;run++) {
    for (const renderer of ['candidate','legacy']) for (const action of ['pause','play','sound','nav','cta']) rows.push({kind:'tap',id:'amethyst:'+action,profile,renderer,run,ms:180,valid:true})
    for (const renderer of ['candidate','legacy','baseline53']) rows.push({kind:'paint',id:'alpine_opal/trade',profile,renderer,run,fcp:100,lcp:200,valid:true})
  }
  return rows
}
const cases = { interactions:['amethyst'],pages:['alpine_opal/trade'] }
it('accepts all complete cohorts at the threshold and rejects any median over 200ms', () => {
  const targets=targetsFor('candidate').map((p: string[])=>p.join('/'))
  expect(targets).toHaveLength(8)
  expect(new Set(targets).size).toBe(targets.length)
  expect(targetsFor('baseline53')).toHaveLength(7)
  const rows=fixture()
  expect(verdict(rows,cases,5).pass).toBe(true)
  for(const row of rows)if(row.kind==='tap'&&row.id==='amethyst:sound'&&row.profile==='phone'&&row.renderer==='candidate')row.ms=201
  expect(verdict(rows,cases,5).pass).toBe(false)
  for(const row of rows)if(row.kind==='tap')row.ms=200
  expect(verdict(rows,cases,5).pass).toBe(true)
})
it('fails on either trade LCP or gated-page FCP regression without averaging profiles together', () => {
  for(const metric of ['fcp','lcp']) {
    const rows=fixture()
    for(const row of rows)if(row.kind==='paint'&&row.renderer==='candidate'&&row.profile==='desktop')row[metric]=300
    expect(verdict(rows,cases,5).pass).toBe(false)
  }
})
it('fails closed on missing, invalid, or undersampled interaction evidence', () => {
  const rows=fixture()
  expect(()=>verdict(rows.slice(1),cases,5)).toThrow('Incomplete')
  rows[0].valid=false
  expect(()=>verdict(rows,cases,5)).toThrow('Incomplete')
  expect(()=>verdict(fixture(),cases,4)).toThrow('At least five')
  expect(()=>median([NaN])).toThrow()
})
it('reads Vercel alias and deployment metadata through a strict output allowlist', async () => {
  vi.stubGlobal('fetch',vi.fn(async()=>({ok:true,json:async()=>({id:'dpl_fixture',url:'fixture.vercel.app',projectId:'smoke',gitSource:{sha:'fixture-sha'},readyState:'READY',alias:'sparkle-suite-smoke.vercel.app',deploymentId:'dpl_fixture',protectionBypass:{},automationBypass:{},secret:{}})})))
  expect(await vercelRecord('/fixture','deployment')).toEqual({id:'dpl_fixture',url:'fixture.vercel.app',projectId:'smoke',sha:'fixture-sha',readyState:'READY'})
  expect(await vercelRecord('/fixture','alias')).toEqual({alias:'sparkle-suite-smoke.vercel.app',deploymentId:'dpl_fixture',projectId:'smoke'})
})
it('rejects live, mutable, credential-bearing and query-bearing origins before any request', () => {
  for(const origin of ['https://www.yoursparklesuite.com','https://sparkle-suite-smoke.vercel.app','https://fixture.vercel.app?test=1','http://fixture.vercel.app','https://user@fixture.vercel.app'])expect(()=>safeOrigin(origin)).toThrow()
  expect(safeOrigin('https://fixture.vercel.app')).toBe('https://fixture.vercel.app')
})
