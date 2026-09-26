import { createHmac, randomBytes } from 'node:crypto'
import type { LiveQueueSnapshot, PublicLineupPresentation } from '@/lib/services/types'

export const LIVE_LINEUP_RETAIN_SECONDS = 3600
export const LIVE_LINEUP_PRESENTATION = 'grouped-v1'
const processKey = randomBytes(32)
const normalize = (value: string) => value.trim().replace(/\s+/gu, ' ').normalize('NFC')
const identityPart = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0 && value.length <= 100 && !/[\p{Cc}\p{Cf}]/u.test(value)

/** Never return a whole surname or cut a surrogate/combining grapheme. */
export function publicSurnameInitial(surname: string, firstName: string): string | null {
  const usable = normalize(surname)
  const first = new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(usable)[Symbol.iterator]().next().value?.segment
  if (!first || first === usable || first.length > 8 || firstName.length + 1 + first.length > 108 || !/^[\p{L}\p{N}][\p{L}\p{N}\p{M}]*$/u.test(first)) return null
  return first
}

type PrivateEntry = { id: string; name: string; lastName?: string; identityEligible?: boolean; identityConflict?: boolean }
type PrivateReveal = { cursor: number; entryId: string; at: string; groupEntryIds: string[] }

/** Input is already filtered to public waiting orders; output is an explicit privacy allowlist. */
export function projectPublicLineup(input: { scope: string; entries: PrivateEntry[]; events: PrivateReveal[]; cursor: number; now: number }): PublicLineupPresentation {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || processKey
  const opaque = (kind: string, value: string) => createHmac('sha256', key).update(JSON.stringify(['live-lineup-grouped-v1', input.scope, kind, value])).digest('base64url').slice(0, 32)
  const rows = input.entries.map(entry => {
    const first = normalize(entry.name)
    const surname = entry.identityEligible === true && !entry.identityConflict && identityPart(entry.lastName) ? normalize(entry.lastName) : null
    return { id: entry.id, first, surname, tuple: surname ? JSON.stringify([first, surname]) : null }
  })
  const collisions = new Map<string, Set<string>>()
  for (const row of rows) {
    const identities = collisions.get(row.first) || new Set<string>()
    identities.add(row.tuple || `unresolved:${row.id}`)
    collisions.set(row.first, identities)
  }
  const groups: { tuple: string | null; members: string[]; name: string; token: string }[] = []
  for (const row of rows) {
    const initial = row.surname && (collisions.get(row.first)?.size || 0) > 1 ? publicSurnameInitial(row.surname, row.first) : null
    const name = initial ? `${row.first} ${initial}` : row.first
    const previous = groups.at(-1)
    if (row.tuple && previous?.tuple === row.tuple) previous.members.push(row.id)
    else groups.push({ tuple: row.tuple, members: [row.id], name, token: '' })
  }
  // A private order anchor gives each contiguous group its own token, independent of label/count/position.
  for (const group of groups) group.token = opaque('group', [...group.members].sort()[0])
  const membership = new Map<string, string>()
  for (const group of groups) for (const member of group.members) membership.set(member, group.token)
  const events: PublicLineupPresentation['events'] = []
  for (const event of input.events) {
    const ageSeconds = (input.now - Date.parse(event.at)) / 1000
    if (!Number.isFinite(ageSeconds) || ageSeconds < 0 || ageSeconds >= 45 || event.cursor > input.cursor) continue
    const targets = new Set(event.groupEntryIds.map(id => membership.get(id)).filter((token): token is string => Boolean(token)))
    // Split across multiple current groups is ambiguous: advance cursor, suppress the effect.
    if (targets.size > 1) continue
    events.push({ cursor: event.cursor, ageSeconds, target: targets.size === 1 ? [...targets][0] : groups[0]?.token ?? null })
  }
  return { contract: LIVE_LINEUP_PRESENTATION, scope: opaque('scope', ''), cursor: input.cursor,
    entries: groups.map(group => ({ token: group.token, name: group.name, remainingOrders: group.members.length })),
    events: events.sort((a, b) => a.cursor - b.cursor).slice(-64) }
}

export function requestedLineupPresentation(request: Request): 'grouped-v1' | 'legacy' {
  return new URL(request.url).searchParams.get('lineupPresentation') === LIVE_LINEUP_PRESENTATION ? LIVE_LINEUP_PRESENTATION : 'legacy'
}

export function buildPublicLiveLineup(snapshot: LiveQueueSnapshot | null | undefined, contract: 'grouped-v1' | 'legacy' = 'legacy') {
  const retained = Boolean(snapshot?.lastUpdated && Number.isFinite(Date.parse(snapshot.lastUpdated))) && snapshot?.ageSeconds !== null && snapshot?.ageSeconds !== undefined && snapshot.ageSeconds >= 0 && snapshot.ageSeconds <= LIVE_LINEUP_RETAIN_SECONDS
  const fresh = Boolean(retained && snapshot?.isFresh && snapshot?.sourceReady !== false && snapshot.ageSeconds! < snapshot.staleAfterSeconds)
  const presentation = contract === LIVE_LINEUP_PRESENTATION ? snapshot?.presentation : undefined
  const rows: { name: string; token?: string; remainingOrders?: number }[] = retained ? presentation?.entries ?? (snapshot?.queue ?? []).map(name => ({ name })) : []
  const state = !snapshot || !retained ? 'offline' : !fresh ? 'delayed' : rows.length ? 'live' : 'empty'
  const entries = rows.map((entry, index) => ({
    position: index + 1, name: entry.name,
    label: !fresh ? 'Position at last update' : index === 0 ? 'Currently Unboxing' : index === 1 ? 'On Deck' : 'In Lineup',
    highlight: fresh && index === 0,
    ...(contract === LIVE_LINEUP_PRESENTATION ? { token: entry.token ?? `legacy-${index}`, remainingOrders: entry.remainingOrders ?? 1 } : {}),
  }))
  return {
    liveQueueState: state as 'offline' | 'delayed' | 'live' | 'empty',
    liveQueueLastUpdated: snapshot?.lastUpdated ?? null,
    liveQueueRevision: snapshot?.revision,
    liveQueueSourceReady: snapshot?.sourceReady,
    liveQueueServerTime: snapshot?.serverTime,
    liveQueueAgeSeconds: snapshot?.ageSeconds ?? null,
    liveQueueStaleAfterSeconds: snapshot?.staleAfterSeconds ?? 180,
    liveQueueSummary: state === 'delayed' ? 'Showing the last received lineup. Positions may have changed; checking for updates.'
      : state === 'offline' ? 'Live Lineup is waiting for a recent update.'
      : state === 'empty' ? 'No orders waiting. Live Lineup connected and ready.' : 'Live Lineup is updating automatically.',
    liveQueueEntries: entries,
    ...(contract === LIVE_LINEUP_PRESENTATION ? {
      liveQueuePresentation: LIVE_LINEUP_PRESENTATION,
      liveQueueScope: presentation?.scope ?? null,
      liveQueueEventCursor: presentation?.cursor ?? 0,
      liveQueueEvents: fresh ? presentation?.events ?? [] : [],
      liveQueueGroupCount: entries.length,
      liveQueueOrderCount: retained ? rows.reduce((sum, row) => sum + (row.remainingOrders ?? 1), 0) : 0,
      liveQueueCurrent: entries[0]?.token ?? null,
      liveQueueOnDeck: entries[1]?.token ?? null,
    } : {}),
  }
}
