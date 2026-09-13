import type { LiveQueueSnapshot } from '@/lib/services/types'

// Shared continuity; health and ordering are server-authoritative.
export const LIVE_LINEUP_RETAIN_SECONDS = 3600

export function buildPublicLiveLineup(snapshot: LiveQueueSnapshot | null | undefined) {
  const retained = snapshot?.ageSeconds !== null && snapshot?.ageSeconds !== undefined &&
    snapshot.ageSeconds >= 0 && snapshot.ageSeconds <= LIVE_LINEUP_RETAIN_SECONDS
  const names = retained ? snapshot!.queue : []
  const fresh = Boolean(snapshot?.isFresh && snapshot?.sourceReady !== false)
  const state = !snapshot || !retained ? 'offline' : !fresh ? 'delayed' : names.length ? 'live' : 'empty'
  return {
    liveQueueState: state as 'offline' | 'delayed' | 'live' | 'empty',
    liveQueueLastUpdated: snapshot?.lastUpdated ?? null,
    liveQueueRevision: snapshot?.revision,
    liveQueueSourceReady: snapshot?.sourceReady,
    liveQueueServerTime: snapshot?.serverTime,
    liveQueueAgeSeconds: snapshot?.ageSeconds ?? null,
    liveQueueStaleAfterSeconds: snapshot?.staleAfterSeconds ?? 180,
    liveQueueSummary: state === 'delayed'
      ? 'Showing the last received lineup. Positions may have changed; checking for updates.'
      : state === 'offline' ? 'Live Lineup is waiting for a recent update.'
      : state === 'empty' ? 'Live Lineup connected and ready.' : 'Live Lineup is updating automatically.',
    liveQueueEntries: names.map((name, index) => ({
      position: index + 1,
      name,
      label: !fresh ? 'Position at last update' : index === 0 ? 'Currently Unboxing' : index === 1 ? 'On Deck' : 'In Lineup',
      highlight: fresh && index === 0,
    })),
  }
}
