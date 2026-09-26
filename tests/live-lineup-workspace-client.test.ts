import { describe, expect, it } from 'vitest'
import { canAcceptWorkspaceRefresh, canRebaseDrag, dragScrollDelta, edgeScrollSpeed, isIssuedPublisher, isPublisherList, isWorkspaceLineupSnapshot, moveCommand, pointerDropAnchor } from '@/app/nic-nac/components/live-lineup-client'
import type { WorkspaceLineupSnapshot } from '@/lib/live-lineup/types'
import { canConfirmShow, isLineupCommandAcknowledgement, isPartyVisibilityAcknowledgement, partyVisibilityCommand, type WorkspaceLineupCommand } from '@/app/nic-nac/components/live-lineup-client'
import { applyLineupCommand, applySourcePacket, buildWorkspaceLineupSnapshot, createLineupState, isLineupState } from '@/lib/live-lineup/model'
import type { LineupState } from '@/lib/live-lineup/types'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { LiveLineupShowControls } from '@/app/nic-nac/components/LiveLineupShowControls'

const entries = ['a', 'b', 'c'].map((id, index) => ({ id, name: 'Jessica', position: index + 1, held: false }))
const snapshot: WorkspaceLineupSnapshot = { revision: 1, connection: 'connected', lastReceivedAt: new Date().toISOString(), lastChangedAt: null, sourceVersion: '2', canManage: true, authorized: true, canRecover: true, entries, heldEntries: [], undoAvailable: false, warning: null }

describe('Workspace lineup client safety', () => {
  it('accepts show previews across heartbeats but never across changed customers or scope', () => {
    const before = {...snapshot,management:{generation:1,partyIds:['p1'],excludedPartyIds:[],candidates:entries}}
    expect(canConfirmShow(before,{...before,revision:2})).toBe(true)
    expect(canConfirmShow(before,{...before,revision:2,management:{...before.management,generation:2}})).toBe(false)
    expect(canConfirmShow(before,{...before,revision:2,management:{...before.management,candidates:[...entries,{id:'new',name:'New',position:4,held:false}]}})).toBe(false)
    expect(canConfirmShow(before,{...before,lastChangedAt:new Date().toISOString()})).toBe(false)
    expect(canConfirmShow(before,{...before,canManage:false,canRecover:false})).toBe(false)
    expect(isWorkspaceLineupSnapshot({...before,management:{...before.management,candidates:[entries[0],entries[0]]}})).toBe(false)
  })
  it('accepts duplicate names with distinct order identities', () => expect(isWorkspaceLineupSnapshot(snapshot)).toBe(true))
  it.each([null, {}, { ...snapshot, revision: -1 }, { ...snapshot, revision: 1.5 }, { ...snapshot, lastReceivedAt: 'never' }, { ...snapshot, entries: [...entries, entries[0]] }, { ...snapshot, entries: [{ ...entries[0], held: true }] }, { ...snapshot, heldEntries: [{ ...entries[0], id: 'held', held: false }] }])('rejects malformed or ambiguous response %#', (value) => expect(isWorkspaceLineupSnapshot(value)).toBe(false))
  it('moves down by inserting after the next identity, not matching a name', () => expect(moveCommand(entries, 0, 1)).toEqual({ type: 'move', entryId: 'a', beforeEntryId: 'c' }))
  it('moves to end with null anchor', () => expect(moveCommand(entries, 1, 1)).toEqual({ type: 'move', entryId: 'b', beforeEntryId: null }))
  it('moves up before the prior identity', () => expect(moveCommand(entries, 2, -1)).toEqual({ type: 'move', entryId: 'c', beforeEntryId: 'b' }))
  it('does not send moves outside the list', () => { expect(moveCommand(entries, 0, -1)).toBeNull(); expect(moveCommand(entries, 2, 1)).toBeNull() })
  it('scrolls only near the interior edges and stops outside the list', () => {
    expect(edgeScrollSpeed(101, 100, 400)).toBeLessThan(0)
    expect(edgeScrollSpeed(399, 100, 400)).toBeGreaterThan(0)
    expect(edgeScrollSpeed(250, 100, 400)).toBe(0)
    expect(edgeScrollSpeed(401, 100, 400)).toBe(0)
    expect(edgeScrollSpeed(99, 100, 400)).toBe(0)
  })
  it('rejects oversized, misnumbered and blank-name data instead of rendering it', () => {
    expect(isWorkspaceLineupSnapshot({ ...snapshot, entries: [{ ...entries[0], position: 0 }] })).toBe(false)
    expect(isWorkspaceLineupSnapshot({ ...snapshot, entries: [{ ...entries[0], position: 2 }] })).toBe(false)
    expect(isWorkspaceLineupSnapshot({ ...snapshot, entries: [{ ...entries[0], name: 'x'.repeat(101) }] })).toBe(false)
    expect(isWorkspaceLineupSnapshot({ ...snapshot, entries: Array.from({ length: 2001 }, (_, i) => ({ ...entries[0], id: `id${i}`, position: i + 1 })) })).toBe(false)
  })
  it('uses row midpoints for pointer dragging without choosing the dragged identity', () => {
    const rows = [{ id: 'a', top: 100, bottom: 180 }, { id: 'b', top: 180, bottom: 260 }, { id: 'c', top: 260, bottom: 400 }]
    expect(pointerDropAnchor(rows, 'c', 120)).toBe('a')
    expect(pointerDropAnchor(rows, 'a', 240)).toBe('c')
    expect(pointerDropAnchor(rows, 'b', 360)).toBeNull()
    expect(pointerDropAnchor(rows, 'b', 190)).toBe('c')
  })
  it('rebases only a newer heartbeat with identical active and held identities/names', () => {
    const heartbeat = { ...snapshot, revision: 2, lastReceivedAt: '2026-09-09T12:00:00Z' }
    expect(canRebaseDrag(snapshot, heartbeat)).toBe(true)
    expect(canRebaseDrag(snapshot, { ...heartbeat, entries: [entries[1], entries[0], entries[2]] })).toBe(false)
    expect(canRebaseDrag(snapshot, { ...heartbeat, entries: [{ ...entries[0], name: 'Different' }, ...entries.slice(1)] })).toBe(false)
    expect(canRebaseDrag(snapshot, { ...heartbeat, lastChangedAt: '2026-09-09T12:00:00Z' })).toBe(false)
    expect(canRebaseDrag(snapshot, { ...heartbeat, heldEntries: [{ ...entries[0], id: 'held', held: true }] })).toBe(false)
    expect(canRebaseDrag(snapshot, { ...heartbeat, canManage: false })).toBe(false)
    expect(canRebaseDrag(snapshot, { ...heartbeat, sourceVersion: 'new' })).toBe(false)
    expect(canRebaseDrag(snapshot, snapshot)).toBe(false)
  })
  it('accepts same-revision health aging but rejects same-revision lineup replacement', () => {
    const managed = {...snapshot,management:{generation:1,partyIds:['p1'],excludedPartyIds:[],candidates:entries}}
    expect(canAcceptWorkspaceRefresh(managed, {...managed,connection:'delayed',warning:'Source delayed'})).toBe(true)
    expect(canAcceptWorkspaceRefresh(managed, {...managed,revision:0})).toBe(false)
    expect(canAcceptWorkspaceRefresh(managed, {...managed,entries:[entries[1],entries[0],entries[2]]})).toBe(false)
    expect(canAcceptWorkspaceRefresh(managed, {...managed,heldEntries:[{...entries[0],held:true}],entries:entries.slice(1).map((entry,index)=>({...entry,position:index+1}))})).toBe(false)
    expect(canAcceptWorkspaceRefresh(managed, {...managed,management:{...managed.management,candidates:[entries[1],entries[0],entries[2]]}})).toBe(false)
    expect(canAcceptWorkspaceRefresh(managed, {...managed,lastReceivedAt:'2026-09-09T12:00:00Z'})).toBe(false)
    expect(canAcceptWorkspaceRefresh(managed, {...managed,revision:2,entries:[entries[1],entries[0],entries[2]]})).toBe(true)
  })
  it('scrolls at the same speed on 60Hz and 120Hz displays and bounds long-frame jumps', () => {
    expect(dragScrollDelta(600, 1000 / 60)).toBeCloseTo(2 * dragScrollDelta(600, 1000 / 120))
    expect(dragScrollDelta(-600, 1000)).toBe(-30)
    expect(dragScrollDelta(600, -1)).toBe(0)
  })
})

describe('Private publisher receipts', () => {
  const publisher = { id: '11111111-1111-4111-8111-111111111111', label: 'Show laptop', createdAt: '2026-09-09T00:00:00Z', expiresAt: '2026-12-09T00:00:00Z', revokedAt: null, active: false }
  it('accepts a sanitized list and rejects ambiguous duplicate connections', () => {
    expect(isPublisherList({ publishers: [publisher] })).toBe(true)
    expect(isPublisherList({ publishers: [publisher, publisher] })).toBe(false)
    expect(isPublisherList({ publishers: [{ ...publisher, active: 'yes' }] })).toBe(false)
  })
  it('requires a complete creation receipt and a valid one-time credential', () => {
    expect(isIssuedPublisher({ publisher, token: `sslp_${'a'.repeat(43)}` })).toBe(true)
    expect(isIssuedPublisher({ publisher, token: 'not-a-key' })).toBe(false)
    expect(isIssuedPublisher({ publisher: { ...publisher, expiresAt: 'never' }, token: `sslp_${'a'.repeat(43)}` })).toBe(false)
  })
})

describe('Workspace show party visibility', () => {
  const now = Date.parse('2026-09-09T12:00:00Z')
  function state(): LineupState {
    return { ...createLineupState(), revision: 5,
      show: {generation: 1, partyIds: ['p1','p2'], excludedPartyIds: [], carryEntryIds: [], startedAt: new Date(now - 1000).toISOString()},
      entries: [{id:'p1:a',name:'Jessica',orderedAt:now},{id:'p2:c',name:'Jessica',orderedAt:now},{id:'p1:b',name:'Held customer',orderedAt:now}],
      order:['p2:c','p1:a'], held:['p1:b'], undo:{order:['p1:a','p2:c'],held:['p1:b']}, parserState:'ready',sourceVersion:'2',
      lastReceivedAt:new Date(now).toISOString(),lastReadyAt:new Date(now).toISOString(),lastChangedAt:new Date(now).toISOString(),
      publisher:{id:'device',claimId:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',epoch:1,lastSequence:0,leaseExpiresAt:new Date(now+90000).toISOString()} }
  }
  it('only changes a selected party in a managed explicit show and never mutates the snapshot', () => {
    const before = buildWorkspaceLineupSnapshot(state(),now,true), copy = structuredClone(before)
    expect(partyVisibilityCommand(before,'p1',false)).toEqual({type:'filter-parties',excludedPartyIds:['p1']})
    expect(partyVisibilityCommand(before,'p1',true)).toBeNull()
    expect(partyVisibilityCommand(before,'other-party',false)).toBeNull()
    expect(partyVisibilityCommand({...before,canManage:false,canRecover:false},'p1',false)).toBeNull()
    expect(partyVisibilityCommand({...before,management:{...before.management!,generation:0}},'p1',false)).toBeNull()
    expect(before).toEqual(copy)
  })
  it('hides and restores duplicate-name orders and private holds through actual model acknowledgments', () => {
    const original = state()
    expect(isLineupState(original)).toBe(true)
    const before = buildWorkspaceLineupSnapshot(original,now,true)
    const command = partyVisibilityCommand(before,'p1',false)!
    const result = applyLineupCommand(original,{...command,expectedRevision:before.revision},now+1)
    if (!result.ok) throw Error(result.code)
    const hidden = buildWorkspaceLineupSnapshot(result.state,now+1,true)
    expect(isPartyVisibilityAcknowledgement(before,hidden,command)).toBe(true)
    expect(hidden.entries.map(e=>e.id)).toEqual(['p2:c'])
    expect(hidden.heldEntries).toEqual([])
    expect(hidden.management!.candidates).toEqual(before.management!.candidates)
    expect(result.state.order).toEqual(original.order)
    expect(result.state.held).toEqual(original.held)
    expect(result.state.undo).toEqual(original.undo)
    const restore = partyVisibilityCommand(hidden,'p1',true)!
    const restored = applyLineupCommand(result.state,{...restore,expectedRevision:hidden.revision},now+2)
    if (!restored.ok) throw Error(restored.code)
    const shown = buildWorkspaceLineupSnapshot(restored.state,now+2,true)
    expect(isPartyVisibilityAcknowledgement(hidden,shown,restore)).toBe(true)
    expect(shown.entries).toEqual(before.entries)
    expect(shown.heldEntries).toEqual(before.heldEntries)
  })
  it('continues observing hidden-party arrivals and restores them without changing existing holds/order', () => {
    const original=state()
    const hiddenResult=applyLineupCommand(original,{type:'filter-parties',excludedPartyIds:['p1'],expectedRevision:original.revision},now+1)
    if(!hiddenResult.ok) throw Error(hiddenResult.code)
    const arrived=applySourcePacket(hiddenResult.state,{generation:1,publisherId:'device',epoch:1,sequence:1,sourceVersion:'2',parserState:'ready',
      entries:[{id:'p1:new',name:'New hidden arrival',orderedAt:now+2}],revealedIds:[],revealedEntries:[]},now+2)
    if(!arrived.ok) throw Error(arrived.code)
    const current=buildWorkspaceLineupSnapshot(arrived.state,now+2,true)
    expect(current.entries.map(e=>e.id)).toEqual(['p2:c'])
    expect(current.management!.candidates.map(e=>e.id)).toContain('p1:new')
    const command=partyVisibilityCommand(current,'p1',true)!
    const restored=applyLineupCommand(arrived.state,{...command,expectedRevision:current.revision},now+3)
    if(!restored.ok) throw Error(restored.code)
    const next=buildWorkspaceLineupSnapshot(restored.state,now+3,true)
    expect(isPartyVisibilityAcknowledgement(current,next,command)).toBe(true)
    expect(next.entries.map(e=>e.id)).toEqual(['p2:c','p1:a','p1:new'])
    expect(next.heldEntries.map(e=>e.id)).toEqual(['p1:b'])
  })
  it('rejects stale toggles, wrong visibility receipts, hidden deletion, and a switched show', () => {
    const original=state(), before=buildWorkspaceLineupSnapshot(original,now,true), command=partyVisibilityCommand(before,'p1',false)!
    expect(applyLineupCommand(original,{...command,expectedRevision:original.revision-1},now+1)).toEqual({ok:false,code:'revision_conflict'})
    const result=applyLineupCommand(original,{...command,expectedRevision:original.revision},now+1)
    if(!result.ok) throw Error(result.code)
    const next=buildWorkspaceLineupSnapshot(result.state,now+1,true)
    expect(canConfirmShow(before,next)).toBe(false)
    expect(isPartyVisibilityAcknowledgement(before,{...before,revision:next.revision},command)).toBe(false)
    expect(isPartyVisibilityAcknowledgement(before,{...next,entries:before.entries},command)).toBe(false)
    expect(isPartyVisibilityAcknowledgement(before,{...next,management:{...next.management!,generation:2}},command)).toBe(false)
    expect(isPartyVisibilityAcknowledgement(before,{...next,management:{...next.management!,candidates:[]}},command)).toBe(false)
  })
  it('renders labeled native toggles with private counts, disables them while pending, and omits them before a scoped show', () => {
    const snapshot=buildWorkspaceLineupSnapshot(state(),now,true)
    const submit=async()=>true
    const html=renderToStaticMarkup(createElement(LiveLineupShowControls,{snapshot,disabled:false,submit}))
    expect(html).toContain('aria-label="Show party p1 in this lineup"')
    expect(html).toContain('aria-label="Scrollable party visibility choices"')
    expect(html).toContain('held privately')
    expect(html).toContain('Orders keep updating privately')
    const pending=renderToStaticMarkup(createElement(LiveLineupShowControls,{snapshot,disabled:true,submit}))
    expect(pending).toMatch(/<fieldset[^>]*disabled=""/)
    const unscoped=renderToStaticMarkup(createElement(LiveLineupShowControls,{snapshot:{...snapshot,management:{...snapshot.management!,generation:0}},disabled:false,submit}))
    expect(unscoped).not.toContain('aria-label="Show party')
    expect(unscoped).toContain('after you start a scoped show')
  })
})

describe('Workspace owner-command acknowledgements', () => {
  const now = Date.parse('2026-09-09T13:00:00Z')
  function state(): LineupState {
    return { ...createLineupState(), revision: 8,
      show: {generation: 3, partyIds: ['p1','p2'], excludedPartyIds: [], carryEntryIds: [], startedAt: new Date(now - 1000).toISOString()},
      entries: [{id:'p2:c',name:'Jessica',orderedAt:now},{id:'p1:a',name:'Jessica',orderedAt:now},{id:'p1:b',name:'Held customer',orderedAt:now}],
      order:['p2:c','p1:a'], held:['p1:b'], revealedIds:[],
      undo:{order:['p1:a','p2:c'],held:['p1:b']}, parserState:'ready',sourceVersion:'2',
      lastReceivedAt:new Date(now).toISOString(),lastReadyAt:new Date(now).toISOString(),lastChangedAt:new Date(now).toISOString(),
      publisher:{id:'device',claimId:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',epoch:2,lastSequence:4,leaseExpiresAt:new Date(now+90000).toISOString()} }
  }
  function receipt(command: WorkspaceLineupCommand) {
    const current = state()
    const before = buildWorkspaceLineupSnapshot(current,now,true)
    const result = applyLineupCommand(current, {...command, expectedRevision:current.revision}, now + 1)
    if (!result.ok) throw Error(result.code)
    return {before, next:buildWorkspaceLineupSnapshot(result.state,now+1,true)}
  }

  it.each<WorkspaceLineupCommand>([
    {type:'move',entryId:'p1:a',beforeEntryId:'p2:c'},
    {type:'hold',entryId:'p2:c'},
    {type:'return',entryId:'p1:b'},
    {type:'reveal-next',entryId:'p1:b'},
    {type:'undo'},
    {type:'filter-parties',excludedPartyIds:['p2']},
    {type:'start-show',partyIds:['p2','p1'],carryEntryIds:['p1:a','p1:b'],confirmed:true},
  ])('accepts only the actual model receipt for $type', command => {
    const {before,next}=receipt(command)
    expect(isLineupCommandAcknowledgement(before,next,command)).toBe(true)
  })

  it('rejects an unrelated higher-revision mutation instead of reporting Hold as saved', () => {
    const before=buildWorkspaceLineupSnapshot(state(),now,true)
    const unrelated=applyLineupCommand(state(),{type:'move',entryId:'p1:a',beforeEntryId:'p2:c',expectedRevision:8},now+1)
    if(!unrelated.ok)throw Error(unrelated.code)
    const next=buildWorkspaceLineupSnapshot(unrelated.state,now+1,true)
    expect(next.revision).toBeGreaterThan(before.revision)
    expect(isLineupCommandAcknowledgement(before,next,{type:'hold',entryId:'p2:c'})).toBe(false)
  })

  it('rejects forged partitions, management state, source scope, and undo receipts', () => {
    const command={type:'hold' as const,entryId:'p2:c'}
    const {before,next}=receipt(command)
    const rejected: WorkspaceLineupSnapshot[] = [
      {...next,revision:before.revision},
      {...next,management:undefined},
      {...next,entries:before.entries,heldEntries:before.heldEntries},
      {...next,management:{...next.management!,candidates:before.management!.candidates}},
      {...next,management:{...next.management!,generation:next.management!.generation+1}},
      {...next,sourceVersion:'different'},
      {...next,lastReceivedAt:new Date(now+2).toISOString()},
      {...next,undoAvailable:false},
    ]
    for(const candidate of rejected)
      expect(isLineupCommandAcknowledgement(before,candidate,command)).toBe(false)
  })

  it('accepts a committed locked new show and discarded prior source identity without auto-repeating it', () => {
    const command: WorkspaceLineupCommand={type:'start-show',partyIds:['p2','p1'],carryEntryIds:['p1:a','p1:b'],confirmed:true}
    const {before,next}=receipt(command)
    const identity = (entry: WorkspaceLineupSnapshot['entries'][number]) => ({...entry,lastName:'Private',identityEligible:true,sourceIdentityVersion:'2:document:4'})
    const identified = {...before,entries:before.entries.map(identity),heldEntries:before.heldEntries.map(identity),management:{...before.management!,candidates:before.management!.candidates.map(identity)}}
    expect(next.canManage).toBe(false)
    expect(isLineupCommandAcknowledgement(identified,next,command)).toBe(true)
  })

  it('requires the exact new-show generation, sorted scope, carry partition, paused source and cleared undo', () => {
    const command: WorkspaceLineupCommand={type:'start-show',partyIds:['p2','p1'],carryEntryIds:['p1:a','p1:b'],confirmed:true}
    const {before,next}=receipt(command)
    for(const candidate of [
      {...next,management:{...next.management!,partyIds:['p2','p1']}},
      {...next,management:{...next.management!,candidates:before.management!.candidates}},
      {...next,entries:before.entries},
      {...next,lastReceivedAt:before.lastReceivedAt},
      {...next,sourceVersion:before.sourceVersion},
      {...next,undoAvailable:true},
    ]) expect(isLineupCommandAcknowledgement(before,candidate,command)).toBe(false)
  })

  it('accepts Undo only when it consumes undo without changing identities, source or show scope', () => {
    const command: WorkspaceLineupCommand={type:'undo'}
    const {before,next}=receipt(command)
    expect(isLineupCommandAcknowledgement(before,{...next,undoAvailable:true},command)).toBe(false)
    expect(isLineupCommandAcknowledgement(before,{...next,entries:next.entries.slice(1)},command)).toBe(false)
    expect(isLineupCommandAcknowledgement(before,{...next,management:{...next.management!,generation:4}},command)).toBe(false)
    expect(isLineupCommandAcknowledgement(before,{...next,sourceVersion:'3'},command)).toBe(false)
  })
})
