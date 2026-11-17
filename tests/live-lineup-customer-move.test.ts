import {describe, expect, it} from 'vitest'
import {applyLineupCommand, applySourcePacket, buildWorkspaceLineupSnapshot, claimPublisher, createLineupState, isLineupState, parseLineupCommand} from '@/lib/live-lineup/model'
import {canRebaseDrag, isLineupCommandAcknowledgement} from '@/app/nic-nac/components/live-lineup-client'
import type {LineupResult, LineupState} from '@/lib/live-lineup/types'

const T = Date.parse('2026-11-17T13:00:00Z')
const ok = (result: LineupResult) => { if (!result.ok) throw new Error(result.code); return result.state }
function fixture(): LineupState {
  const claimed = ok(claimPublisher(createLineupState(), 'device-a', 0, T, {claimId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'}))
  const entries = [
    {id:'p:a1',name:'Ava',lastName:'Reed'}, {id:'p:a2',name:'Ava',lastName:'Reed'},
    {id:'p:b1',name:'Bella',lastName:'Lane'}, {id:'p:b2',name:'Bella',lastName:'Lane'},
    {id:'p:c1',name:'Cara',lastName:'Jones'},
  ].map((entry, i) => ({...entry, orderedAt:T+i, identityEligible:true, sourceIdentityVersion:'v1'}))
  const ready = ok(applySourcePacket(claimed, {publisherId:'device-a',epoch:1,sequence:0,sourceVersion:'2.0.10',parserState:'ready',entries,revealedIds:[]}, T+10))
  return {...ready, entries}
}
const move = (state: LineupState, entryId: string, beforeEntryId: string|null) =>
  applyLineupCommand(state, {type:'move-customer',entryId,beforeEntryId,expectedRevision:state.revision}, T+20)

describe('Atomic customer lineup moves', () => {
  it('moves all orders down in one revision, verifies the acknowledgment, and undoes the whole move', () => {
    const state=fixture(); expect(isLineupState(state)).toBe(true)
    const next=ok(move(state,'p:a1',null))
    expect(next.order).toEqual(['p:b1','p:b2','p:c1','p:a1','p:a2'])
    expect(next.revision).toBe(state.revision+1)
    expect(next.entries).toEqual(state.entries)
    expect(isLineupCommandAcknowledgement(buildWorkspaceLineupSnapshot(state,T+20,true),buildWorkspaceLineupSnapshot(next,T+20,true),{type:'move-customer',entryId:'p:a1',beforeEntryId:null})).toBe(true)
    const undone=ok(applyLineupCommand(next,{type:'undo',expectedRevision:next.revision},T+21))
    expect(undone.order).toEqual(state.order)
    expect(undone.undo).toBeNull()
  })
  it('moves a customer up before another customer without splitting either group', () => {
    const next=ok(move(fixture(),'p:b1','p:a1'))
    expect(next.order).toEqual(['p:b1','p:b2','p:a1','p:a2','p:c1'])
  })
  it.each([['p:a2',null],['p:a1','p:b2'],['p:a1','p:a1'],['p:a1','p:a2'],['p:unknown',null]])('rejects unsafe member or insertion target %s / %s', (entryId,beforeEntryId) => {
    expect(move(fixture(),entryId!,beforeEntryId)).toMatchObject({ok:false})
  })
  it('does not group unresolved identities or different customers with the same first name', () => {
    const state=fixture()
    state.entries[1]={...state.entries[1],lastName:'Lane'}
    const next=ok(move(state,'p:a1',null))
    expect(next.order).toEqual(['p:a2','p:b1','p:b2','p:c1','p:a1'])
    delete state.entries[1].lastName; delete state.entries[1].sourceIdentityVersion
    state.entries[1].identityEligible=false
    expect(ok(move(state,'p:a1',null)).order).toEqual(next.order)
  })
  it('leaves hidden and held orders out of the moved customer and preserves them', () => {
    const state=fixture()
    state.entries.push({...state.entries[0],id:'h:hidden'})
    state.order.splice(1,0,'h:hidden')
    state.order=state.order.filter(id=>id!=='p:c1');state.held=['p:c1']
    state.show={generation:1,partyIds:['p','h'],excludedPartyIds:['h'],carryEntryIds:[],startedAt:new Date(T).toISOString()}
    const next=ok(move(state,'p:a1',null))
    expect(next.order).toEqual(['h:hidden','p:b1','p:b2','p:a1','p:a2'])
    expect(next.held).toEqual(['p:c1'])
    expect(next.entries).toEqual(state.entries)
    expect(isLineupCommandAcknowledgement(buildWorkspaceLineupSnapshot(state,T+20,true),buildWorkspaceLineupSnapshot(next,T+20,true),{type:'move-customer',entryId:'p:a1',beforeEntryId:null})).toBe(true)
  })
  it('keeps legacy move compatible but rejects its partial result as a customer-move acknowledgment', () => {
    const state=fixture()
    const legacy=ok(applyLineupCommand(state,{type:'move',entryId:'p:a1',beforeEntryId:null,expectedRevision:state.revision},T+20))
    expect(legacy.order).toEqual(['p:a2','p:b1','p:b2','p:c1','p:a1'])
    expect(isLineupCommandAcknowledgement(buildWorkspaceLineupSnapshot(state,T+20,true),buildWorkspaceLineupSnapshot(legacy,T+20,true),{type:'move-customer',entryId:'p:a1',beforeEntryId:null})).toBe(false)
  })
  it('retains revision/freshness fences and derives membership instead of trusting supplied IDs', () => {
    const state=fixture()
    expect(applyLineupCommand(state,{type:'move-customer',entryId:'p:a1',beforeEntryId:null,expectedRevision:0},T+20)).toEqual({ok:false,code:'revision_conflict'})
    expect(applyLineupCommand(state,{type:'move-customer',entryId:'p:a1',beforeEntryId:null,expectedRevision:state.revision},T+100000)).toEqual({ok:false,code:'source_not_ready'})
    const parsed=parseLineupCommand({type:'move-customer',entryId:'p:a1',beforeEntryId:null,expectedRevision:state.revision,entryIds:['p:c1']})!
    expect(ok(applyLineupCommand(state,parsed,T+20)).order).toEqual(['p:b1','p:b2','p:c1','p:a1','p:a2'])
    const before=buildWorkspaceLineupSnapshot(state,T+20,true)
    expect(canRebaseDrag(before,{...before,revision:before.revision+1})).toBe(true)
    expect(canRebaseDrag(before,{...before,revision:before.revision+1,entries:before.entries.slice(1)})).toBe(false)
  })
})
