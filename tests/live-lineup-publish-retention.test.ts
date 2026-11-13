import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import { expect, it } from 'vitest'
import { buildPublicLiveLineup } from '@/lib/amethyst/public-live-lineup'

it('projects an active invalid publisher lease as delayed past one hour and expires it after transit', () => {
  const snapshot = {
    syncCode: '', queue: ['Fixture'], queueLength: 1, currentCustomer: 'Fixture', onDeckCustomer: null,
    lastUpdated: '2026-11-13T16:00:00.000Z', ageSeconds: 7200, staleAfterSeconds: 45,
    isFresh: false, sourceReady: false, invalidHeartbeatRemainingSeconds: 80, revision: 9,
  }
  const delayed = buildPublicLiveLineup(snapshot)
  expect(delayed).toMatchObject({liveQueueState: 'delayed', liveQueueAgeSeconds: 7200,
    liveQueueLastUpdated: snapshot.lastUpdated, liveQueueSourceReady: false,
    liveQueueEntries: [{name: 'Fixture', highlight: false}]})
  const client = runInNewContext(readFileSync('public/amethyst/live-lineup.js', 'utf8') + '\nSparkleLiveLineup')
  const received = client.afterTransit(delayed, 10)
  expect(received.liveQueueRetainForSeconds).toBe(70)
  expect(client.unavailable(received, 0, 69).liveQueueState).toBe('delayed')
  expect(client.unavailable(received, 0, 71).liveQueueState).toBe('offline')
  expect(buildPublicLiveLineup({...snapshot, invalidHeartbeatRemainingSeconds: 0})).toMatchObject({liveQueueState:'offline',liveQueueEntries:[]})
})
