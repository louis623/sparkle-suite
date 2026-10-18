import { listMyShows } from '@/lib/services/calendar'
import type { CalendarEvent } from '@/lib/services/types'
import { resolveCustomerShowPlatformLinks } from '@/lib/amethyst/show-platform-links'
import { resolveAmethystPreviewRep } from '@/lib/amethyst/preview-rep'
import { createAdminClient } from '@/lib/supabase/admin'
import { BLING_KITCHEN_PROFILE } from '@/lib/bling-kitchen/profile'

export interface AmethystHomepageEventCode {
  code: string
  desc: string
}

export interface AmethystHomepageEventCollectionLink {
  label: string
  href: string
}

export interface AmethystHomepageEventPlatformLink {
  kind: string
  label: string
  href: string
}

export interface AmethystHomepageEventCard {
  id: string
  title: string
  description: string | null
  eventTime: string
  timeZone: string
  durationMinutes: number
  featured: boolean
  codes: AmethystHomepageEventCode[]
  collections: AmethystHomepageEventCollectionLink[]
  platforms: AmethystHomepageEventPlatformLink[]
}

function demoLiveEventTime() {
  return new Date(Date.now() - 10 * 60 * 1000).toISOString()
}

export const defaultAmethystHomepageEvents: AmethystHomepageEventCard[] = [
  {
    id: 'default-homepage-event-1',
    title: 'Live Now Demo Reveal',
    description: 'Local preview live-state demo',
    eventTime: demoLiveEventTime(),
    timeZone: 'America/New_York',
    durationMinutes: 90,
    featured: true,
    codes: [
      { code: 'UNICORN15', desc: '15% off Unicorn tier boxes' },
      { code: 'FREESHIP75', desc: 'Free shipping on orders $75+' },
    ],
    collections: [
      {
        label: 'Citrine Sun Series',
        href: '/amethyst/Trade.html?collection=Citrine%20Sun%20Series',
      },
      {
        label: 'Holiday Gift Guide',
        href: '/amethyst/Trade.html?collection=Holiday%20Gift%20Guide',
      },
    ],
    platforms: [
      {
        kind: 'tt',
        label: 'Join me on TikTok',
        href: '#',
      },
      {
        kind: 'fb',
        label: 'Watch on Facebook Live',
        href: '#',
      },
    ],
  },
  {
    id: 'default-homepage-event-2',
    title: 'Saturday Sparkle Brunch',
    description: 'Weekend bonus show',
    eventTime: '2099-11-16T13:00:00.000Z',
    timeZone: 'America/New_York',
    durationMinutes: 60,
    featured: false,
    codes: [{ code: 'BRUNCH10', desc: '10% off Saturday show purchases' }],
    collections: [
      {
        label: 'Diamond Territory',
        href: '/amethyst/Trade.html?collection=Diamond%20Territory',
      },
    ],
    platforms: [
      {
        kind: 'tt',
        label: 'Join me on TikTok',
        href: '#',
      },
    ],
  },
]

const BLING_KITCHEN_SHOW_DAYS = [1, 3, 5] as const
const BLING_KITCHEN_SHOW_HOUR_ET = 19

function isBlingKitchenTarget(
  publicSiteSlug: string | null,
  email?: string | null,
) {
  return (
    publicSiteSlug === BLING_KITCHEN_PROFILE.publicSiteSlug ||
    email?.trim().toLowerCase() === BLING_KITCHEN_PROFILE.email
  )
}

function getEasternParts(date: Date) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(date)

  const byType = Object.fromEntries(parts.map((part) => [part.type, part.value]))
  return {
    year: Number(byType.year),
    month: Number(byType.month),
    day: Number(byType.day),
    hour: Number(byType.hour),
    minute: Number(byType.minute),
    second: Number(byType.second),
  }
}

function easternDateToUtcIso(
  year: number,
  month: number,
  day: number,
  hour: number,
) {
  const initial = new Date(Date.UTC(year, month - 1, day, hour, 0, 0))
  const eastern = getEasternParts(initial)
  const offsetMs =
    Date.UTC(
      eastern.year,
      eastern.month - 1,
      eastern.day,
      eastern.hour,
      eastern.minute,
      eastern.second,
    ) - initial.getTime()

  return new Date(initial.getTime() - offsetMs).toISOString()
}

function buildBlingKitchenFallbackEvents(
  limit: number,
  now = new Date(),
): AmethystHomepageEventCard[] {
  const easternNow = getEasternParts(now)
  const cursor = new Date(
    Date.UTC(easternNow.year, easternNow.month - 1, easternNow.day, 12, 0, 0),
  )
  const events: AmethystHomepageEventCard[] = []

  for (let offset = 0; offset < 21 && events.length < limit; offset += 1) {
    const candidate = new Date(cursor)
    candidate.setUTCDate(cursor.getUTCDate() + offset)
    const dayOfWeek = candidate.getUTCDay()
    if (!BLING_KITCHEN_SHOW_DAYS.includes(dayOfWeek as 1 | 3 | 5)) continue

    const year = candidate.getUTCFullYear()
    const month = candidate.getUTCMonth() + 1
    const day = candidate.getUTCDate()
    const eventTime = easternDateToUtcIso(
      year,
      month,
      day,
      BLING_KITCHEN_SHOW_HOUR_ET,
    )
    if (Date.parse(eventTime) <= now.getTime()) continue

    events.push({
      id: `bling-kitchen-fallback-${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
      title: 'BlingKitchen Live Reveal',
      description:
        'Join Heather for BlingKitchen live jewelry reveals from the heart of the home.',
      eventTime,
      timeZone: 'America/New_York',
      durationMinutes: 90,
      featured: events.length === 0,
      codes: [],
      collections: [],
      platforms: [
        {
          kind: 'tt',
          label: 'Join me on TikTok',
          href: BLING_KITCHEN_PROFILE.tiktokUrl,
        },
        {
          kind: 'fb',
          label: 'Watch on Facebook Live',
          href: BLING_KITCHEN_PROFILE.facebookVipUrl,
        },
      ],
    })
  }

  return events
}

function buildPlatformLinks(
  event: CalendarEvent,
  socialHandles: unknown,
): AmethystHomepageEventPlatformLink[] {
  return resolveCustomerShowPlatformLinks(event.platform, socialHandles)
}

function mapCollectionLinks(collections: string[] | null | undefined) {
  return (collections ?? []).map((collection) => ({
    label: collection,
    href: `/amethyst/Trade.html?collection=${encodeURIComponent(collection)}`,
  }))
}

function normalizeEventTitle(event: CalendarEvent) {
  const title = event.title?.trim()
  if (title) return title

  const description = event.description?.trim()
  if (description) return description

  return 'Upcoming live reveal'
}

const PUBLIC_SHOW_TIME_ZONE = 'America/New_York'

export function resolvePublicShowTimeZone(timeZone: string | null | undefined) {
  const candidate = timeZone?.trim() || PUBLIC_SHOW_TIME_ZONE
  try {
    Intl.DateTimeFormat('en-US', { timeZone: candidate }).format(0)
    return candidate
  } catch {
    return PUBLIC_SHOW_TIME_ZONE
  }
}

function zonedWallClockToUtcMs(
  parts: { year: number; month: number; day: number; hour: number; minute: number; second: number },
  timeZone: string,
) {
  const utcGuess = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second,
  )
  const formatted = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date(utcGuess))
  const observed = Object.fromEntries(formatted.map((part) => [part.type, part.value]))
  const observedAsUtc = Date.UTC(
    Number(observed.year),
    Number(observed.month) - 1,
    Number(observed.day),
    Number(observed.hour),
    Number(observed.minute),
    Number(observed.second),
  )
  return utcGuess - (observedAsUtc - utcGuess)
}

export function publicShowStartMs(
  eventTime: string | null | undefined,
  timeZone: string | null | undefined,
) {
  const value = eventTime?.trim()
  if (!value) return null
  if (/(?:Z|[+-]\d{2}:?\d{2})$/i.test(value)) {
    const parsed = Date.parse(value)
    return Number.isNaN(parsed) ? null : parsed
  }

  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?/)
  if (!match) {
    const parsed = Date.parse(value)
    return Number.isNaN(parsed) ? null : parsed
  }

  return zonedWallClockToUtcMs(
    {
      year: Number(match[1]),
      month: Number(match[2]),
      day: Number(match[3]),
      hour: Number(match[4]),
      minute: Number(match[5]),
      second: Number(match[6] ?? 0),
    },
    resolvePublicShowTimeZone(timeZone),
  )
}

export function publicShowEndMs(event: {
  eventTime: string
  timeZone?: string | null
  durationMinutes?: number | null
}) {
  const start = publicShowStartMs(event.eventTime, event.timeZone)
  if (start == null) return null
  const duration = Number(event.durationMinutes) > 0 ? Number(event.durationMinutes) : 60
  return start + duration * 60 * 1000
}

/** A public show stays on the homepage and llms.txt until its end time. */
export function isCurrentPublicShow(
  event: {
    eventTime: string
    timeZone?: string | null
    durationMinutes?: number | null
  },
  now = Date.now(),
) {
  const end = publicShowEndMs(event)
  return end != null && end > now
}

export function formatPublicShowTime(
  eventTime: string,
  timeZone: string | null | undefined,
) {
  const zone = resolvePublicShowTimeZone(timeZone)
  const start = publicShowStartMs(eventTime, zone)
  if (start == null) return eventTime
  return new Intl.DateTimeFormat('en-US', {
    timeZone: zone,
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  }).format(new Date(start))
}

export function mapCalendarEventToHomepageEvent(
  event: CalendarEvent,
  index: number,
  socialHandles: unknown = {},
): AmethystHomepageEventCard {
  return {
    id: event.id,
    title: normalizeEventTitle(event),
    description: event.description,
    eventTime: event.eventTime,
    timeZone: event.timeZone,
    durationMinutes: event.durationMinutes,
    featured: index === 0,
    codes: event.discountCodes.map((discount) => ({
      code: discount.code,
      desc: discount.description,
    })),
    collections: mapCollectionLinks(event.featuredCollections),
    platforms: buildPlatformLinks(event, socialHandles),
  }
}

interface LoadAmethystHomepageUpcomingShowsOptions {
  limit?: number
  repId?: string | null
  publicSiteSlug?: string | null
  targeted?: boolean
}

export async function loadAmethystHomepageUpcomingShows(
  options: LoadAmethystHomepageUpcomingShowsOptions | number = {},
): Promise<AmethystHomepageEventCard[]> {
  const limit = typeof options === 'number' ? options : options.limit ?? 2
  const repId = typeof options === 'number' ? null : options.repId?.trim() ?? null
  const publicSiteSlug =
    typeof options === 'number'
      ? null
      : options.publicSiteSlug?.trim().toLowerCase() ?? null
  const targeted =
    typeof options === 'number'
      ? false
      : Boolean(options.targeted || repId || publicSiteSlug)

  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.SUPABASE_SERVICE_ROLE_KEY
  ) {
    if (targeted && isBlingKitchenTarget(publicSiteSlug)) {
      return buildBlingKitchenFallbackEvents(limit)
    }
    return targeted ? [] : defaultAmethystHomepageEvents
  }

  try {
    const admin = createAdminClient()
    const rep = await resolveAmethystPreviewRep(admin, {
      env: process.env,
      publicSiteSlug,
      repId,
      select: 'id, email, social_handles',
    })

    const isBlingKitchen = isBlingKitchenTarget(publicSiteSlug, rep?.email)

    if (!rep?.id) {
      if (isBlingKitchen) return buildBlingKitchenFallbackEvents(limit)
      return targeted ? [] : defaultAmethystHomepageEvents
    }

    // `listMyShows` returns every `live` row, including ones that already
    // ended, ahead of future `scheduled` rows. Read the two statuses apart
    // so a past show left on live cannot hide the next scheduled show.
    const [liveResult, scheduledResult] = await Promise.all([
      listMyShows(admin as never, rep.id as string, {
        upcoming: false,
        status: 'live',
        limit: 12,
      }),
      listMyShows(admin as never, rep.id as string, {
        upcoming: true,
        status: 'scheduled',
        limit,
      }),
    ])

    const seen = new Set<string>()
    const currentEvents = [...liveResult.events, ...scheduledResult.events]
      .filter((event) => {
        if (!event.id || seen.has(event.id) || !isCurrentPublicShow(event)) return false
        seen.add(event.id)
        return true
      })
      .sort((left, right) => {
        const leftStart = publicShowStartMs(left.eventTime, left.timeZone) ?? 0
        const rightStart = publicShowStartMs(right.eventTime, right.timeZone) ?? 0
        return leftStart - rightStart
      })

    if (!currentEvents.length) {
      if (targeted) return []
      if (isBlingKitchen) return buildBlingKitchenFallbackEvents(limit)
      return defaultAmethystHomepageEvents
    }

    return currentEvents
      .slice(0, limit)
      .map((event, index) =>
        mapCalendarEventToHomepageEvent(event, index, rep.social_handles),
      )
  } catch {
    return targeted ? [] : defaultAmethystHomepageEvents
  }
}
