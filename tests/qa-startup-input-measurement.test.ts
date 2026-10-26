import {createRequire} from 'node:module'
import {expect,it} from 'vitest'
const {dispatchScheduledTouches,summarizeStartupInput}=createRequire(import.meta.url)('../scripts/qa/startup-input-measurement.cjs')

it('never overlaps complete gestures when slow input handling overruns the next offset',async()=>{
 let clock=0,active=0,maxActive=0;const operations:string[]=[]
 const attempts=await dispatchScheduledTouches({start:0,offsets:[100,200,500],lateToleranceMs:50,now:()=>clock,wait:async(ms:number)=>{clock+=ms},send:async(_method:string,{type}:{type:string})=>{
  operations.push(type);if(type==='touchStart'){active++;maxActive=Math.max(active,maxActive);clock+=150}else{clock+=50;active--}
 }})
 expect(maxActive).toBe(1);expect(active).toBe(0)
 expect(operations).toEqual(['touchStart','touchEnd','touchStart','touchEnd'])
 expect(attempts[1]).toMatchObject({offset:200,skipped:true,lateBy:100})
 expect(attempts[0].finishedAt).toBeLessThanOrEqual(attempts[2].sentAt)
})

const proof=(events:unknown[]=[])=>({events,clicks:[{eventAt:110},{eventAt:120},{eventAt:130}],fcp:100,eventTimingSupported:true,shopRetained:true,hydrated:true})
const attempts=[{offset:100,sentAt:100,finishedAt:120},{offset:200,sentAt:200,finishedAt:220},{offset:300,sentAt:300,finishedAt:320}]
it('retains a slow null-target interaction after paint instead of reporting only surviving Shop targets',()=>{
 const events=[{at:20,duration:800,target:'hp-brand'},{at:110,duration:328,target:null},{at:120,duration:32,target:'hp-shop-btn'}]
 const result=summarizeStartupInput(proof(events),attempts)
 expect(result).toMatchObject({valid:true,complete:true,status:'failed',maxMs:800,postPaintMaxMs:328,visibleControlMaxMs:328,pass:false})
 expect(events).toHaveLength(3)
})

it('distinguishes skipped coverage and dispatch errors from a valid latency pass',async()=>{
 const incomplete=summarizeStartupInput(proof(),[...attempts,{offset:400,skipped:true}])
 expect(incomplete).toMatchObject({valid:true,complete:false,status:'incomplete',pass:false})
 let clock=0,calls=0
 const failed=await dispatchScheduledTouches({start:0,offsets:[100,200],now:()=>clock,wait:async(ms:number)=>{clock+=ms},send:async()=>{calls++;throw Error('input failed')}})
 expect(calls).toBe(1);expect(failed[0].error).toBe('input failed');expect(failed[1].skipped).toBe(true)
 expect(summarizeStartupInput(proof(),failed)).toMatchObject({valid:false,complete:false,status:'invalid',pass:false})
})

it('requires retained nodes and working timing instrumentation, and keeps profiling diagnostic',()=>{
 expect(summarizeStartupInput(proof(),attempts)).toMatchObject({status:'passed',pass:true,belowThreshold:true})
 expect(summarizeStartupInput({...proof(),shopRetained:false},attempts)).toMatchObject({status:'failed',pass:false})
 expect(summarizeStartupInput({...proof(),eventTimingSupported:false},attempts)).toMatchObject({status:'invalid',pass:false})
 expect(summarizeStartupInput(proof(),attempts,{diagnosticOnly:true})).toMatchObject({status:'diagnostic',pass:false})
})
