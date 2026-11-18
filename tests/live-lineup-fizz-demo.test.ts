import { describe, expect, it, vi } from 'vitest'
import { demoLineupHeartbeat, isDemoLineupSnapshot, FIZZ_FESTIVAL_DEMO_REP_ID } from '@/lib/live-lineup/demo'
import { refreshFizzFestivalDemo } from '@/lib/live-lineup/demo-server'
import { applyLineupCommand, isLineupState } from '@/lib/live-lineup/model'
import { LIVE_LINEUP_RELEASE } from '@/lib/live-lineup/release'
import { adoptionDue } from '@/lib/live-lineup/monitor'
const fixture = {"schemaVersion":2,"revision":4,"show":{"generation":1,"partyIds":["FIZZDEMO"],"excludedPartyIds":[],"carryEntryIds":[],"startedAt":"2026-11-17T13:00:59.567Z"},"entries":[{"id":"FIZZDEMO:01-1","name":"Olivia","lastName":"Bennett","identityEligible":true,"sourceIdentityVersion":"demo-1","orderedAt":1794916859567},{"id":"FIZZDEMO:01-2","name":"Olivia","lastName":"Bennett","identityEligible":true,"sourceIdentityVersion":"demo-1","orderedAt":1794916860567},{"id":"FIZZDEMO:02-1","name":"Ava","lastName":"Mitchell","identityEligible":true,"sourceIdentityVersion":"demo-1","orderedAt":1794916919567},{"id":"FIZZDEMO:02-2","name":"Ava","lastName":"Mitchell","identityEligible":true,"sourceIdentityVersion":"demo-1","orderedAt":1794916920567},{"id":"FIZZDEMO:03-1","name":"Sophia","lastName":"Carter","identityEligible":true,"sourceIdentityVersion":"demo-1","orderedAt":1794916979567},{"id":"FIZZDEMO:03-2","name":"Sophia","lastName":"Carter","identityEligible":true,"sourceIdentityVersion":"demo-1","orderedAt":1794916980567},{"id":"FIZZDEMO:04-1","name":"Isabella","lastName":"Reed","identityEligible":true,"sourceIdentityVersion":"demo-1","orderedAt":1794917039567},{"id":"FIZZDEMO:04-2","name":"Isabella","lastName":"Reed","identityEligible":true,"sourceIdentityVersion":"demo-1","orderedAt":1794917040567},{"id":"FIZZDEMO:05-1","name":"Mia","lastName":"Sullivan","identityEligible":true,"sourceIdentityVersion":"demo-1","orderedAt":1794917099567},{"id":"FIZZDEMO:05-2","name":"Mia","lastName":"Sullivan","identityEligible":true,"sourceIdentityVersion":"demo-1","orderedAt":1794917100567},{"id":"FIZZDEMO:06-1","name":"Charlotte","lastName":"Hayes","identityEligible":true,"sourceIdentityVersion":"demo-1","orderedAt":1794917159567},{"id":"FIZZDEMO:07-1","name":"Amelia","lastName":"Brooks","identityEligible":true,"sourceIdentityVersion":"demo-1","orderedAt":1794917219567},{"id":"FIZZDEMO:08-1","name":"Harper","lastName":"Collins","identityEligible":true,"sourceIdentityVersion":"demo-1","orderedAt":1794917279567},{"id":"FIZZDEMO:09-1","name":"Evelyn","lastName":"Parker","identityEligible":true,"sourceIdentityVersion":"demo-1","orderedAt":1794917339567},{"id":"FIZZDEMO:10-1","name":"Abigail","lastName":"Foster","identityEligible":true,"sourceIdentityVersion":"demo-1","orderedAt":1794917399567},{"id":"FIZZDEMO:11-1","name":"Emily","lastName":"Dawson","identityEligible":true,"sourceIdentityVersion":"demo-1","orderedAt":1794917459567},{"id":"FIZZDEMO:12-1","name":"Ella","lastName":"Morgan","identityEligible":true,"sourceIdentityVersion":"demo-1","orderedAt":1794917519567},{"id":"FIZZDEMO:13-1","name":"Scarlett","lastName":"Ellis","identityEligible":true,"sourceIdentityVersion":"demo-1","orderedAt":1794917579567},{"id":"FIZZDEMO:14-1","name":"Grace","lastName":"Monroe","identityEligible":true,"sourceIdentityVersion":"demo-1","orderedAt":1794917639567},{"id":"FIZZDEMO:15-1","name":"Chloe","lastName":"Anderson","identityEligible":true,"sourceIdentityVersion":"demo-1","orderedAt":1794917699567},{"id":"FIZZDEMO:16-1","name":"Lily","lastName":"Prescott","identityEligible":true,"sourceIdentityVersion":"demo-1","orderedAt":1794917759567},{"id":"FIZZDEMO:17-1","name":"Nora","lastName":"James","identityEligible":true,"sourceIdentityVersion":"demo-1","orderedAt":1794917819567},{"id":"FIZZDEMO:18-1","name":"Hannah","lastName":"Whitaker","identityEligible":true,"sourceIdentityVersion":"demo-1","orderedAt":1794917879567},{"id":"FIZZDEMO:19-1","name":"Zoey","lastName":"Campbell","identityEligible":true,"sourceIdentityVersion":"demo-1","orderedAt":1794917939567},{"id":"FIZZDEMO:20-1","name":"Penelope","lastName":"Walsh","identityEligible":true,"sourceIdentityVersion":"demo-1","orderedAt":1794917999567},{"id":"FIZZDEMO:21-1","name":"Layla","lastName":"Henderson","identityEligible":true,"sourceIdentityVersion":"demo-1","orderedAt":1794918059567},{"id":"FIZZDEMO:22-1","name":"Victoria","lastName":"Quinn","identityEligible":true,"sourceIdentityVersion":"demo-1","orderedAt":1794918119567},{"id":"FIZZDEMO:23-1","name":"Natalie","lastName":"Spencer","identityEligible":true,"sourceIdentityVersion":"demo-1","orderedAt":1794918179567},{"id":"FIZZDEMO:24-1","name":"Stella","lastName":"Ramirez","identityEligible":true,"sourceIdentityVersion":"demo-1","orderedAt":1794918239567},{"id":"FIZZDEMO:25-1","name":"Audrey","lastName":"Sinclair","identityEligible":true,"sourceIdentityVersion":"demo-1","orderedAt":1794918299567}],"order":["FIZZDEMO:01-1","FIZZDEMO:01-2","FIZZDEMO:02-1","FIZZDEMO:02-2","FIZZDEMO:03-1","FIZZDEMO:03-2","FIZZDEMO:04-1","FIZZDEMO:04-2","FIZZDEMO:05-1","FIZZDEMO:05-2","FIZZDEMO:06-1","FIZZDEMO:07-1","FIZZDEMO:08-1","FIZZDEMO:09-1","FIZZDEMO:10-1","FIZZDEMO:11-1","FIZZDEMO:12-1","FIZZDEMO:13-1","FIZZDEMO:14-1","FIZZDEMO:15-1","FIZZDEMO:16-1","FIZZDEMO:17-1","FIZZDEMO:18-1","FIZZDEMO:19-1","FIZZDEMO:20-1","FIZZDEMO:21-1","FIZZDEMO:22-1","FIZZDEMO:23-1","FIZZDEMO:24-1","FIZZDEMO:25-1"],"held":[],"revealedIds":[],"undo":null,"publisher":{"id":"fizz-festival-demo","claimId":"acde0000-0000-4000-8000-000000000018","epoch":2,"lastSequence":1,"leaseExpiresAt":"2026-11-17T13:02:29.567Z"},"lastReceivedAt":"2026-11-17T13:00:59.567Z","lastReadyAt":"2026-11-17T13:00:59.567Z","lastChangedAt":"2026-11-17T13:00:59.567Z","parserState":"ready","sourceVersion":"demo-1.0.0"} as const
const seed = () => JSON.parse(JSON.stringify(fixture))
const repId = FIZZ_FESTIVAL_DEMO_REP_ID
const now = Date.parse(fixture.lastReceivedAt)

describe('authorized Fizz Festival demo connection', () => {
  it('validates 25 fictional identities and preserves Hold and Reveal through heartbeat renewal', () => {
    let state = seed()
    expect(isLineupState(state)).toBe(true)
    expect(new Set(state.entries.map((e: {name:string;lastName:string}) => e.name+' '+e.lastName)).size).toBe(25)
    const held = applyLineupCommand(state, {type:'hold',entryId:state.order[0],expectedRevision:state.revision}, now+1000)
    expect(held.ok).toBe(true); if (!held.ok) throw Error(held.code)
    const renewed = demoLineupHeartbeat(repId,held.state,now+60_000)!
    expect(isLineupState(renewed)).toBe(true)
    expect(renewed.held).toEqual(held.state.held)
    expect(renewed.order).toEqual(held.state.order)
    expect(renewed.undo).toEqual(held.state.undo)
    const revealed = applyLineupCommand(renewed, {type:'reveal-next',entryId:renewed.order[0],expectedRevision:renewed.revision}, now+61_000)
    expect(revealed.ok).toBe(true); if (!revealed.ok) throw Error(revealed.code)
    const next = demoLineupHeartbeat(repId,revealed.state,now+120_000)!
    expect(isLineupState(next)).toBe(true)
    expect(next.revealedIds).toEqual(revealed.state.revealedIds)
    expect(next.entries).toEqual(revealed.state.entries)
  })
  it('does not renew another rep, a real publisher, malformed state or an already-fresh demo', () => {
    expect(demoLineupHeartbeat('another-rep',seed(),now+60_000)).toBeNull()
    const real=seed(); real.publisher.id='real-publisher'; real.sourceVersion='2.0.10'
    expect(demoLineupHeartbeat(repId,real,now+60_000)).toBeNull()
    const invalid=seed(); invalid.order=[]
    expect(demoLineupHeartbeat(repId,invalid,now+60_000)).toBeNull()
    expect(demoLineupHeartbeat(repId,seed(),now+1000)).toBeNull()
    expect(isDemoLineupSnapshot({tenantContext:repId,sourceVersion:'demo-1.0.0'})).toBe(true)
    expect(isDemoLineupSnapshot({tenantContext:'another-rep',sourceVersion:'demo-1.0.0'})).toBe(false)
  })
  it('does no database work for a public/support view or another rep', async () => {
    const from=vi.fn()
    const db={from} as unknown as Parameters<typeof refreshFizzFestivalDemo>[0]
    await refreshFizzFestivalDemo(db,repId,now,false)
    await refreshFizzFestivalDemo(db,'another-rep',now,true)
    expect(from).not.toHaveBeenCalled()
  })
  it('activates 2.0.11 and waits until the conservative 24-hour boundary', () => {
    expect(LIVE_LINEUP_RELEASE.version).toBe('2.0.11')
    expect(LIVE_LINEUP_RELEASE.rolloutEnabled).toBe(true)
    const dueAt=Date.parse(LIVE_LINEUP_RELEASE.publishedAt!)+24*60*60*1000
    expect(adoptionDue(LIVE_LINEUP_RELEASE,dueAt-1)).toBe(false)
    expect(adoptionDue(LIVE_LINEUP_RELEASE,dueAt)).toBe(true)
  })
})
