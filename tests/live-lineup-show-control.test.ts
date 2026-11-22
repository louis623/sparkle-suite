import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import { describe, expect, it } from 'vitest'
import { projectShowControl, SHOW_IDLE_MS, type ControlRow } from '@/lib/live-lineup/show-control'
import { buildPublicLiveLineup, projectPublicRunToken } from '@/lib/amethyst/public-live-lineup'
import type { LiveQueueSnapshot } from '@/lib/services/types'

const start = Date.parse('2026-11-21T23:15:00.000Z')
const rep = '11111111-1111-4111-8111-111111111111'
const run = '22222222-2222-4222-8222-222222222222'
const deadline = new Date(start + SHOW_IDLE_MS).toISOString()
const started: ControlRow = {
  rep_id:rep, revision:1, mode:'started', run_id:run, idle_deadline_at:deadline,
  run_ready_since:null,run_generation:null,changed_by:'workspace',auto_check_new_parties:true,
  last_extension_seen_at:new Date(start).toISOString(),worker_version:'2.0.13',reader_version:'2.0.13',
  tab_present:true,reader_responding:true,source_status:'loading',ack_control_revision:null,
}

describe('show visibility and public privacy', () => {
  it('shows open lineup before the first order, expires at 120 minutes and keeps health separate', () => {
    const live = projectShowControl(started,null,start + SHOW_IDLE_MS - 1000)
    expect(live.showControl).toMatchObject({phase:'active',selection:'unknown',waitingForFirstOrder:true})
    expect(live.extensionStatus).toMatchObject({connected:false,sourceStatus:'loading'})
    expect(live.allowRows).toBe(false)
    expect(projectShowControl(started,null,start + SHOW_IDLE_MS).showControl.phase).toBe('ended')
    expect(projectShowControl({...started,auto_check_new_parties:false,tab_present:false,reader_responding:false},null,start).showControl.phase).toBe('ended')
    expect(projectShowControl({...started,mode:'stopped'},null,start).showControl.phase).toBe('ended')
  })

  it('uses only an opaque token for a run and gives calendar copy when stopped', () => {
    const token = projectPublicRunToken(rep,run)
    expect(token).toMatch(/^[A-Za-z0-9_-]{32}$/)
    expect(token).toBe(projectPublicRunToken(rep,run))
    expect(token).not.toBe(projectPublicRunToken(run,run))
    const base: LiveQueueSnapshot = {syncCode:'',queue:[],queueLength:0,currentCustomer:null,onDeckCustomer:null,
      lastUpdated:null,ageSeconds:null,staleAfterSeconds:45,isFresh:false,sourceReady:false,
      show:{phase:'active',revision:1,runToken:token,deadline,serverTime:new Date(start).toISOString()}}
    expect(buildPublicLiveLineup(base)).toMatchObject({liveQueueState:'empty',liveQueueSummary:'I have an open lineup.',liveQueueSourceReady:false})
    expect(JSON.stringify(buildPublicLiveLineup(base))).not.toContain(run)
    const next = {title:'Evening Reveal',time:'Sun, Nov 22, 8:00 PM EST'}
    expect(buildPublicLiveLineup({...base,show:{...base.show!,phase:'ended'}},'grouped-v1',next)).toMatchObject({
      liveQueueState:'offline',liveQueueSummary:'Check the calendar for the next show.',liveQueueEntries:[],liveQueueNextShow:next,
    })
  })
})

it('fences stale managed polls and expires an open lineup in both runtime copies', () => {
  const runToken = projectPublicRunToken(rep,run)
  const show = {phase:'active',revision:2,runToken,deadline,serverTime:new Date(start).toISOString()} as const
  const active = buildPublicLiveLineup({syncCode:'',queue:[],queueLength:0,currentCustomer:null,onDeckCustomer:null,
    lastUpdated:null,ageSeconds:null,staleAfterSeconds:45,isFresh:false,sourceReady:false,
    revision:4,serverTime:show.serverTime,show},'grouped-v1')
  for (const file of ['public/amethyst/live-lineup.js','lib/amethyst/legacy/assets/live-lineup.js']) {
    const vm: {SparkleLiveLineup?:{
      merge:(before:unknown,after:unknown)=>unknown
      initialState:(v:unknown)=>unknown
      unavailable:(v:unknown,now:number,elapsed:number)=>unknown
    }} = {}
    runInNewContext(readFileSync(file,'utf8'),vm)
    const api = vm.SparkleLiveLineup!
    expect(api.initialState(active)).toMatchObject({liveQueueState:'empty',liveQueueSummary:'I have an open lineup.'})
    expect(api.unavailable(active,start,7199)).toMatchObject({liveQueueState:'empty'})
    expect(api.unavailable(active,start,7200)).toMatchObject({liveQueueState:'offline',liveQueueEntries:[]})
    expect(api.merge(active,{...active,liveQueueRevision:8,liveQueueShow:{...show,revision:1}})).toBe(active)
    const stop = {...active,liveQueueShow:{...show,phase:'ended',revision:3},liveQueueState:'offline'}
    expect(api.merge(active,stop)).toBe(stop)
    expect(api.merge(stop,active)).toBe(stop)
  }
})
