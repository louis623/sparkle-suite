import { isLineupState } from './model'
import type { LineupState } from './types'

/** Explicitly authorized Fizz Festival presentation data, never a Bomb Party publisher. */
export const FIZZ_FESTIVAL_DEMO_REP_ID = 'ac3e643a-6ccf-4400-8230-662f63a07f3e'
export const FIZZ_FESTIVAL_DEMO_SOURCE = 'demo-1.0.0'
export const FIZZ_FESTIVAL_DEMO_PUBLISHER = 'fizz-festival-demo'

export function isFizzFestivalDemoState(repId: string, state: unknown): state is LineupState {
  return repId === FIZZ_FESTIVAL_DEMO_REP_ID && isLineupState(state)
    && state.sourceVersion === FIZZ_FESTIVAL_DEMO_SOURCE
    && state.publisher?.id === FIZZ_FESTIVAL_DEMO_PUBLISHER
}

export function demoLineupHeartbeat(repId: string, state: unknown, now: number): LineupState | null {
  if (!Number.isFinite(now) || !isFizzFestivalDemoState(repId, state) || !state.publisher
    || state.publisher.capabilities !== undefined || !state.show
    || state.revision >= Number.MAX_SAFE_INTEGER || state.publisher.lastSequence >= Number.MAX_SAFE_INTEGER
    || state.entries.some(entry => !entry.id.startsWith('FIZZDEMO:'))
    || state.show.partyIds.length !== 1 || state.show.partyIds[0] !== 'FIZZDEMO') return null
  const received = Date.parse(state.lastReceivedAt ?? '')
  if (Number.isFinite(received) && now - received < 15_000) return null
  const timestamp = new Date(now).toISOString()
  const next: LineupState = {
    ...state, revision: state.revision + 1, parserState: 'ready',
    lastReceivedAt: timestamp, lastReadyAt: timestamp,
    ...(state.lastReadySourceAt !== undefined ? {lastReadySourceAt: timestamp} : {}),
    publisher: {...state.publisher, lastSequence: state.publisher.lastSequence + 1,
      leaseExpiresAt: new Date(now + 90_000).toISOString()},
  }
  return isLineupState(next) ? next : null
}

export function isDemoLineupSnapshot(snapshot: {tenantContext?: string; sourceVersion?: string | null} | null | undefined) {
  return snapshot?.tenantContext === FIZZ_FESTIVAL_DEMO_REP_ID
    && snapshot.sourceVersion === FIZZ_FESTIVAL_DEMO_SOURCE
}
