import { describe, expect, it } from 'vitest'
import { buildPublicLiveLineup } from '@/lib/amethyst/public-live-lineup'
import { buildLiveQueueSnapshot } from '@/lib/services/live-queue'

const now = new Date('2026-09-06T01:30:00Z')
const snapshot = (age: number, queue = ['Example One', 'Example Two']) =>
  buildLiveQueueSnapshot({ sync_code: 'TEST-ONLY', queue, last_updated: new Date(+now - age * 1000).toISOString() }, { now })

describe('Brittany temporary public Live Lineup continuity', () => {
  it('keeps delayed names with honest labels instead of declaring an empty lineup', () => {
    const result = buildPublicLiveLineup(snapshot(208))
    expect(result.liveQueueState).toBe('delayed')
    expect(result.liveQueueEntries).toHaveLength(2)
    expect(result.liveQueueEntries[0].label).toBe('Position at last update')
    expect(result.liveQueueEntries[0].highlight).toBe(false)
    expect(JSON.stringify(result)).not.toContain('TEST-ONLY')
  })
  it('accepts fresh changes and genuine empty lineups', () => {
    expect(buildPublicLiveLineup(snapshot(60)).liveQueueState).toBe('live')
    expect(buildPublicLiveLineup(snapshot(60, [])).liveQueueState).toBe('empty')
    expect(buildPublicLiveLineup(snapshot(60, [])).liveQueueSummary).toBe('I have an open lineup.')
    expect(buildPublicLiveLineup(snapshot(208, [])).liveQueueState).toBe('delayed')
    expect(buildPublicLiveLineup(snapshot(208, [])).liveQueueSummary).toBe('Live Lineup is updating automatically.')
    expect(buildPublicLiveLineup(snapshot(7201, [])).liveQueueState).toBe('offline')
    expect(buildPublicLiveLineup(snapshot(7201, [])).liveQueueSummary).toBe('Check the calendar for the next show.')
  })
  it('does not preserve names indefinitely or manufacture a timestamp', () => {
    expect(buildPublicLiveLineup(snapshot(7201)).liveQueueEntries).toEqual([])
    expect(buildPublicLiveLineup(null).liveQueueLastUpdated).toBeNull()
  })
})
