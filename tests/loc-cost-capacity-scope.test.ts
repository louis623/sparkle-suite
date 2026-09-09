import {afterEach, describe, expect, it, vi} from 'vitest'
import {buildCostCapacitySnapshot, readCostCapacityRuns, type CostCapacityRun} from '@/lib/remy-communications/nic-nac-cost-capacity'
import {locCostSnapshot} from '@/lib/loc-control-center/cost-snapshot'
afterEach(()=>{vi.unstubAllGlobals();vi.unstubAllEnvs()})

const run = (productClass: 'suite' | 'finder', index: number): CostCapacityRun => ({
  productClass, costClass:'customer_facing', surface:'workspace', provider:'openai', model:'test', purpose:'default',
  policyKey:null, workload:'Test', reasoningLevel:null, expectedModel:null, expectedReasoning:null, modelFit:'unknown',
  runId:`${productClass}-${index}`, inputTokens:100, outputTokens:20, cachedTokens:productClass==='finder'?null:10,
  estimatedCents:productClass==='finder'?null:5, actualCents:null, successful:true, hardFail:false,
  startedAt:productClass==='finder'?'2026-09-02T12:00:00Z':'2026-09-01T12:00:00Z',
})
const input = {
  month:'2026-09',start:new Date('2026-09-01T00:00:00Z'),end:new Date('2026-09-03T00:00:00Z'),now:new Date('2026-09-03T00:00:00Z'),
  suiteRows:[run('suite',0)],finderRows:Array.from({length:60},(_,i)=>run('finder',i)),finderIssue:'Finder telemetry gap',
  provider:{suite:{actualCents:10,issue:null,projectIdsConfigured:1},finder:{actualCents:null,issue:'Finder cost gap',projectIdsConfigured:0}},providerCostsAt:null,
}
describe('LOC product cost reporting',()=>{
  it('shows unavailable telemetry as unknown while retaining independent provider actuals',()=>{
    const result=locCostSnapshot(buildCostCapacitySnapshot({...input,product:'finder',finderRows:[],provider:{...input.provider,finder:{actualCents:240,issue:null,projectIdsConfigured:1}}}),'finder')
    expect(result.telemetryAvailable).toBe(false)
    expect(result.products[0]).toMatchObject({runs:null,successfulWorkflows:null,estimatedCents:null,cachedTokens:null,actualCents:240})
    expect(result.rates).toMatchObject({runsPerDay:null,tokensPerDay:null,estimatedCentsPerDay:null,actualCentsPerDay:120})
  })
  it('distinguishes unknown cached tokens from measured zero across aggregates',()=>{
    const missing=locCostSnapshot(buildCostCapacitySnapshot({...input,product:'finder',finderIssue:null}),'finder')
    expect(missing.products[0].cachedTokens).toBeNull()
    expect(missing.totals.cachedTokens).toBeNull()
    expect(missing.byModel[0].cachedTokens).toBeNull()
    const measured=locCostSnapshot(buildCostCapacitySnapshot({...input,product:'finder',finderIssue:null,finderRows:[{...run('finder',0),cachedTokens:0}]}),'finder')
    expect(measured.products[0].cachedTokens).toBe(0)
    expect(measured.byModel[0].cachedTokens).toBe(0)
  })
  it('scopes before recent-run slicing so a busy other product cannot hide the selected product',()=>{
    const snapshot=buildCostCapacitySnapshot({...input,product:'suite'})
    expect(snapshot.recentRuns.map(x=>x.runId)).toEqual(['suite-0'])
    expect(snapshot.telemetryAt).toBe('2026-09-01T12:00:00Z')
    expect(snapshot.products).toHaveLength(1)
    expect(snapshot.totals.actualCents).toBe(10)
    expect(snapshot.rates).toEqual({elapsedDays:2,runsPerDay:0.5,tokensPerDay:60,estimatedCentsPerDay:2.5,actualCentsPerDay:5})
    expect(snapshot.coverageHoles).toEqual([])
    expect(snapshot.modelPolicies.every(x=>x.productClass==='suite')).toBe(true)
  })
  it('preserves missing actual costs and estimate-price/cached-token gaps for Finder',()=>{
    const snapshot=buildCostCapacitySnapshot({...input,product:'finder'})
    expect(snapshot.totals.actualCents).toBeNull()
    expect(snapshot.rates.actualCentsPerDay).toBeNull()
    expect(snapshot.totals.unknownEstimatedCostRuns).toBe(60)
    expect(snapshot.coverageHoles).toEqual(expect.arrayContaining(['Finder telemetry gap','Finder cost gap',expect.stringContaining('cached-input')]))
    expect(snapshot.recentRuns).toHaveLength(50)
  })
  it('retains combined legacy reporting when no product is selected',()=>{
    const snapshot=buildCostCapacitySnapshot(input)
    expect(snapshot.products).toHaveLength(2)
    expect(snapshot.totals.runs).toBe(61)
    expect(snapshot.totals.actualCents).toBeNull()
    expect(snapshot.rates.runsPerDay).toBe(30.5)
  })
  it('does not contact Finder when reading Suite usage',async()=>{
    vi.stubEnv('SPARKLE_FINDER_CONTROL_CENTER_USAGE_TOKEN','synthetic-test-key')
    const fetcher=vi.fn(()=>{throw new Error('Other product unavailable')});vi.stubGlobal('fetch',fetcher)
    const builder:any={select:()=>builder,gte:()=>builder,lt:()=>builder,order:()=>builder,limit:async()=>({data:[],error:null})}
    const result=await readCostCapacityRuns({from:()=>builder} as never,'2026-09',input.now,'suite')
    expect(fetcher).not.toHaveBeenCalled();expect(result.finderIssue).toBeNull()
    expect(result.truncatedByProduct.suite).toBe(false)
  })
  it('does not query Suite when reading Finder usage and retains source truncation',async()=>{
    vi.stubEnv('SPARKLE_FINDER_CONTROL_CENTER_USAGE_TOKEN','synthetic-test-key')
    vi.stubGlobal('fetch',vi.fn(async()=>new Response(JSON.stringify({rows:[],truncated:true}),{status:200})))
    const from=vi.fn(()=>{throw new Error('Other product unavailable')})
    const result=await readCostCapacityRuns({from} as never,'2026-09',input.now,'finder')
    expect(from).not.toHaveBeenCalled();expect(result.finderIssue).toBeNull()
    expect(result.truncatedByProduct).toEqual({suite:false,finder:true})
  })
})
