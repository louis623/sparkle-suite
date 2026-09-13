import { describe, expect, it } from 'vitest'
import { archiveRecoveryRequest, isArchiveDetail, isArchivePage, isArchiveRecoveryAcknowledgement, recoveryIneligibleReason, type ArchiveDetail } from '@/app/nic-nac/components/live-lineup-archive-client'
import { buildArchiveRecoveryState, type LineupArchive } from '@/lib/live-lineup/archive-recovery'
import { buildWorkspaceLineupSnapshot, createLineupState } from '@/lib/live-lineup/model'
import type { LineupState } from '@/lib/live-lineup/types'
import { renderToStaticMarkup } from 'react-dom/server'
import { createElement } from 'react'
import { LiveLineupArchiveControls } from '@/app/nic-nac/components/LiveLineupArchiveControls'

const T = Date.parse('2026-09-09T12:00:00.000Z'), iso = new Date(T).toISOString()
function state(generation: number, ids: string[], held: string[] = []): LineupState {
  return {...createLineupState(),revision:generation+2,
    show:{generation,partyIds:['p1','p2'],excludedPartyIds:['p2'],carryEntryIds:[],startedAt:iso},
    entries:[...ids,...held].map(id=>({id,name:'Same name',orderedAt:T})),order:ids,held,
    publisher:{id:'device',claimId:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',epoch:1,lastSequence:1,leaseExpiresAt:new Date(T+90000).toISOString()},
    lastReadyAt:iso,lastReceivedAt:iso,lastChangedAt:iso,parserState:'ready',sourceVersion:'2'}
}
function fixture() {
  const current = state(2,['p1:current','p2:hidden'],['p1:held'])
  const archived = state(1,['p1:old1','p1:old2','p1:current'],['p2:oldheld'])
  const archive: LineupArchive = {generation:1,revision:3,archivedAt:iso,state:archived}
  const summary = {generation:1,revision:3,archivedAt:iso,partyIds:['p1','p2'],waitingCount:3,heldCount:1}
  const detail: ArchiveDetail = {...summary,candidates:buildWorkspaceLineupSnapshot(archived,T).management!.candidates}
  const before = buildWorkspaceLineupSnapshot(current,T)
  return {current,archive,summary,detail,before}
}
describe('archive recovery client contracts', () => {
  it('validates bounded descending archive pages and exact cursors', () => {
    const {summary} = fixture()
    expect(isArchivePage({archives:[summary],nextBeforeGeneration:null})).toBe(true)
    expect(isArchivePage({archives:[summary],nextBeforeGeneration:1},2)).toBe(true)
    for (const value of [{archives:[summary,summary],nextBeforeGeneration:null}, {archives:[summary],nextBeforeGeneration:2},
      {archives:[],nextBeforeGeneration:1}, {archives:Array(21).fill(summary),nextBeforeGeneration:null},
      {archives:[{...summary,waitingCount:2001}],nextBeforeGeneration:null}]) expect(isArchivePage(value)).toBe(false)
    expect(isArchivePage({archives:[summary],nextBeforeGeneration:null},1)).toBe(false)
  })
  it('requires archive detail to match the selected summary and exact distinct order identities', () => {
    const {summary,detail} = fixture()
    expect(isArchiveDetail(detail,summary)).toBe(true)
    for (const value of [{...detail,generation:9}, {...detail,revision:99}, {...detail,archivedAt:'bad'},
      {...detail,candidates:[detail.candidates[0],...detail.candidates.slice(0,3)]},
      {...detail,candidates:detail.candidates.map(e=>({...e,held:false}))},
      {...detail,candidates:detail.candidates.map(e=>({...e,name:'x'.repeat(101)}))}]) expect(isArchiveDetail(value,summary)).toBe(false)
  })
  it('requires explicit selection/confirmation and current scope, never duplicate names as identity', () => {
    const {before,detail} = fixture()
    expect(archiveRecoveryRequest(before,before,detail,['p1:old1'],false)).toBeNull()
    expect(archiveRecoveryRequest(before,before,detail,[],true)).toBeNull()
    expect(archiveRecoveryRequest(before,before,detail,['p1:old1','p1:old1'],true)).toBeNull()
    expect(archiveRecoveryRequest(before,before,detail,['p1:missing'],true)).toBeNull()
    expect(archiveRecoveryRequest(before,before,detail,['p1:current'],true)).toBeNull()
    expect(archiveRecoveryRequest(before,before,detail,['p1:old1','p1:old2'],true)?.entryIds).toEqual(['p1:old1','p1:old2'])
    expect(recoveryIneligibleReason(before,detail,'p3:outside')).toContain('Outside')
    expect(recoveryIneligibleReason(before,detail,'p1:current')).toContain('Already')
  })
  it('allows heartbeat-only preview updates but blocks changed customers, holds or show scope', () => {
    const {before,detail} = fixture()
    expect(archiveRecoveryRequest(before,{...before,revision:8},detail,['p1:old1'],true)?.expectedRevision).toBe(8)
    for (const next of [{...before,canManage:false}, {...before,management:{...before.management!,generation:3}},
      {...before,management:{...before.management!,candidates:[]}}, {...before,lastChangedAt:new Date(T+1).toISOString()}])
      expect(archiveRecoveryRequest(before,next,detail,['p1:old1'],true)).toBeNull()
  })
  it('accepts the actual recovery model receipt with exact ordering and private hidden-party holds', () => {
    const {before,detail,current,archive} = fixture()
    const request = archiveRecoveryRequest(before,before,detail,['p2:oldheld','p1:old2','p1:old1'],true)!
    const next = buildWorkspaceLineupSnapshot(buildArchiveRecoveryState(current,archive,request,T+100),T+100)
    expect(isArchiveRecoveryAcknowledgement(before,next,detail,request)).toBe(true)
    expect(next.entries).toEqual(before.entries)
    expect(next.heldEntries.map(e=>e.id)).toEqual(['p1:held','p1:old1','p1:old2'])
    expect(next.management!.candidates.at(-1)?.id).toBe('p2:oldheld')
    for (const invalid of [{...next,revision:next.revision+1}, {...next,undoAvailable:true}, {...next,sourceVersion:'2'},
      {...next,lastReceivedAt:iso}, {...next,management:{...next.management!,generation:2}},
      {...next,management:{...next.management!,candidates:before.management!.candidates}},
      {...next,entries:[...next.entries,...next.heldEntries.map(e=>({...e,held:false}))]},
      {...next,heldEntries:[]}]) expect(isArchiveRecoveryAcknowledgement(before,invalid,detail,request)).toBe(false)
  })
  it('starts as deliberate review with clear private-Hold/source/Undo consequences', () => {
    const {before} = fixture()
    const html = renderToStaticMarkup(createElement(LiveLineupArchiveControls,{snapshot:before,disabled:false,recover:async()=>true}))
    expect(html).toContain('Load latest archives')
    expect(html).toContain('private Hold')
    expect(html).toContain('clears Undo')
    expect(html).not.toContain('Confirm recovery into private Hold')
    expect(html).not.toContain('Same name')
  })
})
