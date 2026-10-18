import { beforeEach, describe, expect, it, vi } from 'vitest'

const createAdminClientMock = vi.fn()
const listMyShowsMock = vi.fn()

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: (...args: unknown[]) => createAdminClientMock(...args),
}))

vi.mock('@/lib/services/calendar', () => ({
  listMyShows: (...args: unknown[]) => listMyShowsMock(...args),
}))

import type { CalendarEvent } from '@/lib/services/types'
import {
  defaultAmethystHomepageEvents,
  isCurrentPublicShow,
  loadAmethystHomepageUpcomingShows,
  mapCalendarEventToHomepageEvent,
  publicShowStartMs,
} from '@/lib/amethyst/homepage-upcoming-shows'

function makeEvent(overrides: Partial<CalendarEvent> = {}): CalendarEvent {
  return {
    id: 'event-1',
    repId: 'rep-1',
    platform: 'TikTok',
    eventTime: '2099-05-01T20:00:00.000Z',
    timeZone: 'America/New_York',
    durationMinutes: 60,
    title: 'Friday Sparkles',
    description: 'Main show',
    discountCodes: [{ code: 'SPARKLE10', description: 'Ten percent off' }],
    featuredCollections: ['Birthday', 'OG'],
    streamingDestinations: [],
    isRecurring: false,
    recurrenceGroupId: null,
    recurrenceRule: null,
    status: 'scheduled',
    createdAt: '2099-04-01T12:00:00.000Z',
    updatedAt: '2099-04-01T12:00:00.000Z',
    ...overrides,
  }
}

const originalSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const originalServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const originalHomepagePreviewEmail = process.env.AMETHYST_HOMEPAGE_PREVIEW_EMAIL

beforeEach(() => {
  createAdminClientMock.mockReset()
  listMyShowsMock.mockReset()
  process.env.NEXT_PUBLIC_SUPABASE_URL = originalSupabaseUrl
  process.env.SUPABASE_SERVICE_ROLE_KEY = originalServiceRoleKey
  process.env.AMETHYST_HOMEPAGE_PREVIEW_EMAIL = originalHomepagePreviewEmail
})

describe('Amethyst homepage upcoming shows', () => {
  it('drops a show that already ended, including one still marked live', async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co'
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key'
    process.env.AMETHYST_HOMEPAGE_PREVIEW_EMAIL = 'preview@example.com'

    const maybeSingle = vi.fn().mockResolvedValue({
      data: { id: 'rep-1', social_handles: { tiktok: '@demo' } },
      error: null,
    })
    const eq = vi.fn(() => ({ maybeSingle }))
    const select = vi.fn(() => ({ eq }))
    createAdminClientMock.mockReturnValue({ from: vi.fn(() => ({ select })) })
    listMyShowsMock.mockImplementation(
      async (_admin: unknown, _repId: unknown, input: { status?: string }) => {
        if (input.status === 'live') {
          return {
            events: [
              makeEvent({
                id: 'ended-live',
                title: 'TikTok Live',
                status: 'live',
                eventTime: '2026-10-05T17:47:00.000Z',
                timeZone: 'America/Denver',
                durationMinutes: 60,
              }),
            ],
            totalCount: 1,
          }
        }
        return {
          events: [
            makeEvent({
              id: 'next-show',
              title: 'Sunday Sparkle',
              eventTime: '2099-10-18T19:00:00.000Z',
              timeZone: 'America/Phoenix',
              durationMinutes: 180,
            }),
          ],
          totalCount: 1,
        }
      },
    )

    const result = await loadAmethystHomepageUpcomingShows()

    expect(listMyShowsMock).toHaveBeenCalledWith(expect.anything(), 'rep-1', {
      upcoming: false,
      status: 'live',
      limit: 12,
    })
    expect(listMyShowsMock).toHaveBeenCalledWith(expect.anything(), 'rep-1', {
      upcoming: true,
      status: 'scheduled',
      limit: 2,
    })
    expect(result.map((event) => event.id)).toEqual(['next-show'])
    expect(result[0]?.featured).toBe(true)
  })

  it('reads a naive show time in the show timezone and Eastern when the zone is missing', () => {
    const denver = publicShowStartMs('2026-10-05T11:47:00', 'America/Denver')
    expect(denver).toBe(Date.parse('2026-10-05T17:47:00.000Z'))
    const eastern = publicShowStartMs('2026-10-18T15:00:00', 'America/New_York')
    expect(eastern).toBe(Date.parse('2026-10-18T19:00:00.000Z'))
    expect(
      isCurrentPublicShow(
        {
          eventTime: '2026-10-05T17:47:00.000Z',
          timeZone: 'America/Denver',
          durationMinutes: 60,
        },
        Date.parse('2026-10-18T16:32:00.000Z'),
      ),
    ).toBe(false)
    expect(
      isCurrentPublicShow(
        {
          eventTime: '2026-10-18T19:00:00.000Z',
          timeZone: 'America/Phoenix',
          durationMinutes: 180,
        },
        Date.parse('2026-10-18T16:32:00.000Z'),
      ),
    ).toBe(true)
  })

  it('includes a live-now demo event in the local fallback schedule', () => {
    const [event] = defaultAmethystHomepageEvents
    const startAt = Date.parse(event.eventTime)
    const endAt = startAt + event.durationMinutes * 60 * 1000
    const now = Date.now()

    expect(event.title).toBe('Live Now Demo Reveal')
    expect(startAt).toBeLessThanOrEqual(now)
    expect(endAt).toBeGreaterThan(now)
  })

  it('maps the show platform to the matching configured customer-site social link', () => {
    const mapped = mapCalendarEventToHomepageEvent(
      makeEvent({
        title: null,
        description: 'Friday Night Fizz',
        durationMinutes: 90,
        streamingDestinations: [
          { platform: 'tiktok', url: 'https://wrong.example/live' },
        ],
      }),
      0,
      {
        tiktok: '@demo',
        whatnot: '@demo-live',
      },
    )

    expect(mapped).toMatchObject({
      id: 'event-1',
      title: 'Friday Night Fizz',
      eventTime: '2099-05-01T20:00:00.000Z',
      timeZone: 'America/New_York',
      durationMinutes: 90,
      featured: true,
      codes: [{ code: 'SPARKLE10', desc: 'Ten percent off' }],
      collections: [
        {
          label: 'Birthday',
          href: '/amethyst/Trade.html?collection=Birthday',
        },
        {
          label: 'OG',
          href: '/amethyst/Trade.html?collection=OG',
        },
      ],
      platforms: [
        {
          kind: 'tiktok',
          label: 'Watch on TikTok',
          href: 'https://www.tiktok.com/@demo',
        },
      ],
    })
  })

  it('loads the next two upcoming shows from the preview rep and keeps the first card featured', async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co'
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key'

    const maybeSingle = vi.fn().mockResolvedValue({
      data: {
        id: 'rep-1',
        social_handles: {
          tiktok: '@demo',
          facebook: '@demo-facebook',
        },
      },
      error: null,
    })
    const eq = vi.fn(() => ({ maybeSingle }))
    const select = vi.fn(() => ({ eq }))
    const admin = {
      from: vi.fn(() => ({ select })),
    }

    createAdminClientMock.mockReturnValue(admin)
    listMyShowsMock.mockImplementation(
      async (_admin: unknown, _repId: unknown, input: { status?: string }) => {
        if (input.status === 'live') return { events: [], totalCount: 0 }
        return {
          events: [
            makeEvent({
              id: 'event-1',
              platform: 'TikTok',
              streamingDestinations: [{ platform: 'tiktok', url: 'https://wrong.example/live' }],
            }),
            makeEvent({
              id: 'event-2',
              platform: 'Facebook',
              title: 'Sunday Sparkle Session',
              streamingDestinations: [{ platform: 'facebook', url: 'https://wrong.example/live' }],
            }),
            makeEvent({
              id: 'event-3',
              title: 'Should not render',
            }),
          ],
          totalCount: 3,
        }
      },
    )

    const result = await loadAmethystHomepageUpcomingShows()

    expect(createAdminClientMock).toHaveBeenCalledTimes(1)
    expect(listMyShowsMock).toHaveBeenCalledWith(admin, 'rep-1', {
      upcoming: true,
      status: 'scheduled',
      limit: 2,
    })
    expect(result).toHaveLength(2)
    expect(result[0].featured).toBe(true)
    expect(result[1].featured).toBe(false)
    expect(result[1].platforms[0]).toMatchObject({
      kind: 'facebook',
      href: 'https://www.facebook.com/demo-facebook',
    })
  })

  it('falls back to default homepage events when preview data cannot load', async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL
    delete process.env.SUPABASE_SERVICE_ROLE_KEY

    const result = await loadAmethystHomepageUpcomingShows()

    expect(result).toEqual(defaultAmethystHomepageEvents)
    expect(createAdminClientMock).not.toHaveBeenCalled()
    expect(listMyShowsMock).not.toHaveBeenCalled()
  })

  it('returns empty events instead of demo events for targeted reps without data', async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL
    delete process.env.SUPABASE_SERVICE_ROLE_KEY

    const result = await loadAmethystHomepageUpcomingShows({
      repId: 'rep-clean',
      targeted: true,
    })

    expect(result).toEqual([])
    expect(createAdminClientMock).not.toHaveBeenCalled()
    expect(listMyShowsMock).not.toHaveBeenCalled()
  })

  it('does not generate BlingKitchen fallback events for a resolved targeted rep with an empty calendar', async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co'
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key'
    process.env.AMETHYST_HOMEPAGE_PREVIEW_EMAIL = 'blingkitchen19@gmail.com'

    const maybeSingle = vi.fn().mockResolvedValue({
      data: {
        id: 'rep-bling-kitchen',
        email: 'blingkitchen19@gmail.com',
      },
      error: null,
    })
    const eq = vi.fn(() => ({ maybeSingle }))
    const select = vi.fn(() => ({ eq }))
    const admin = {
      from: vi.fn(() => ({ select })),
    }

    createAdminClientMock.mockReturnValue(admin)
    listMyShowsMock.mockResolvedValue({
      events: [],
      totalCount: 0,
    })

    const result = await loadAmethystHomepageUpcomingShows({
      targeted: true,
      limit: 2,
    })

    expect(result).toEqual([])
    expect(listMyShowsMock).toHaveBeenCalledWith(admin, 'rep-bling-kitchen', {
      upcoming: true,
      status: 'scheduled',
      limit: 2,
    })
  })

  it('may keep the BlingKitchen fallback when Supabase is not configured', async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL
    delete process.env.SUPABASE_SERVICE_ROLE_KEY

    const result = await loadAmethystHomepageUpcomingShows({
      publicSiteSlug: 'blingkitchen',
      targeted: true,
      limit: 2,
    })

    expect(result).toHaveLength(2)
    expect(result[0]).toMatchObject({
      title: 'BlingKitchen Live Reveal',
      timeZone: 'America/New_York',
      durationMinutes: 90,
      featured: true,
    })
    expect(Date.parse(result[0].eventTime)).toBeGreaterThan(Date.now())
    expect(createAdminClientMock).not.toHaveBeenCalled()
    expect(listMyShowsMock).not.toHaveBeenCalled()
  })
})
