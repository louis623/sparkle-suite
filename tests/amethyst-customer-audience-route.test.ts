import { beforeEach, describe, expect, it, vi } from 'vitest'

const createAdminClientMock = vi.fn()
const dispatchWorkspaceMessages = vi.fn()

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: (...args: unknown[]) => createAdminClientMock(...args),
}))
vi.mock('@/lib/services/workspace-message-dispatch', () => ({
  dispatchWorkspaceMessageAutomationAfterResponse: (...args: unknown[]) =>
    dispatchWorkspaceMessages(...args),
}))

import { POST } from '@/app/api/amethyst/customer-audience/route'

function makeAdminClient({
  repId = 'rep-1',
  insertError = null,
  paidRepIds = [],
  readyLaunchRepIds = [],
}: {
  repId?: string | null
  insertError?: unknown
  paidRepIds?: string[]
  readyLaunchRepIds?: string[]
} = {}) {
  const maybeSingle = vi.fn().mockResolvedValue({
    data: repId ? { id: repId } : null,
    error: null,
  })
  const eq = vi.fn().mockReturnValue({ maybeSingle })
  const selectRep = vi.fn().mockReturnValue({ eq })

  const insertSingle = vi.fn().mockResolvedValue({
    data: insertError
      ? null
      : {
          id: 'audience-1',
          rep_id: repId,
        },
    error: insertError,
  })
  const insertSelect = vi.fn().mockReturnValue({ single: insertSingle })
  const insert = vi.fn().mockReturnValue({ select: insertSelect })
  const audienceChangeLogInsert = vi.fn().mockResolvedValue({ error: null })

  const subscriptionMaybeSingle = vi.fn((targetRepId: string) =>
    Promise.resolve({
      data: paidRepIds.includes(targetRepId)
        ? { id: 'subscription-1', status: 'active' }
        : null,
      error: null,
    }),
  )
  const subscriptionEq = vi.fn((_column: string, targetRepId: string) => ({
    maybeSingle: () => subscriptionMaybeSingle(targetRepId),
  }))

  const launchMaybeSingle = vi.fn((targetRepId: string) =>
    Promise.resolve({
      data: readyLaunchRepIds.includes(targetRepId)
        ? { id: 'launch-build-1' }
        : null,
      error: null,
    }),
  )
  const launchRepEq = vi.fn((_column: string, targetRepId: string) => ({
    maybeSingle: () => launchMaybeSingle(targetRepId),
  }))

  const from = vi.fn((table: string) => {
    if (table === 'reps') {
      return {
        select: selectRep,
      }
    }

    if (table === 'customer_audience') {
      return {
        insert,
      }
    }

    if (table === 'customer_audience_change_log') {
      return {
        insert: audienceChangeLogInsert,
      }
    }

    if (table === 'subscriptions') {
      return {
        select: vi.fn(() => ({ eq: subscriptionEq })),
      }
    }

    if (table === 'workspace_trials') {
      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
          })),
        })),
      }
    }

    if (table === 'sparkle_suite_launch_builds') {
      return {
        select: vi.fn(() => ({ eq: launchRepEq })),
      }
    }

    throw new Error(`Unexpected table ${table}`)
  })

  return {
    client: { from } as never,
    spies: {
      from,
      selectRep,
      eq,
      maybeSingle,
      insert,
      insertSelect,
      insertSingle,
      audienceChangeLogInsert,
    },
  }
}

describe('POST /api/amethyst/customer-audience', () => {
  const originalSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const originalServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const originalHomepagePreviewEmail = process.env.AMETHYST_HOMEPAGE_PREVIEW_EMAIL
  const originalTradePreviewEmail = process.env.AMETHYST_TRADE_PREVIEW_EMAIL

  beforeEach(() => {
    createAdminClientMock.mockReset()
    dispatchWorkspaceMessages.mockReset()
    process.env.NEXT_PUBLIC_SUPABASE_URL = originalSupabaseUrl
    process.env.SUPABASE_SERVICE_ROLE_KEY = originalServiceRoleKey
    process.env.AMETHYST_HOMEPAGE_PREVIEW_EMAIL = originalHomepagePreviewEmail
    process.env.AMETHYST_TRADE_PREVIEW_EMAIL = originalTradePreviewEmail
  })

  it('creates a customer_audience row for the preview rep with separate consent fields', async () => {
    process.env.AMETHYST_HOMEPAGE_PREVIEW_EMAIL = 'preview@example.com'
    const { client, spies } = makeAdminClient()
    createAdminClientMock.mockReturnValue(client)

    const response = await POST(
      new Request('http://localhost/api/amethyst/customer-audience', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          firstName: 'Jamie',
          lastName: 'Lane',
          email: 'jamie@example.com',
          phone: '(555) 555-1212',
          smsConsent: true,
          emailConsent: true,
          marketingConsent: true,
        }),
      }),
    )

    expect(createAdminClientMock).toHaveBeenCalledTimes(1)
    expect(spies.eq).toHaveBeenCalledWith('email', 'preview@example.com')
    expect(spies.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        rep_id: 'rep-1',
        name: 'Jamie Lane',
        email: 'jamie@example.com',
        phone: '(555) 555-1212',
        sms_consent: true,
        email_consent: true,
        marketing_consent: true,
        record_source: 'customer_site_signup',
      }),
    )
    expect(dispatchWorkspaceMessages).toHaveBeenCalledWith({
      supabase: client,
      source: 'customer_signup',
    })
    expect(response.status).toBe(201)
    await expect(response.json()).resolves.toEqual({
      ok: true,
    })
  })

  it('creates the signup for the explicit customer-site target from the query string', async () => {
    const { client, spies } = makeAdminClient({
      repId: 'jane-rep',
      paidRepIds: ['jane-rep'],
    })
    createAdminClientMock.mockReturnValue(client)

    const response = await POST(
      new Request('http://localhost/api/amethyst/customer-audience?c=jane-rep', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          firstName: 'Louis',
          lastName: 'Phase Five Smoke',
          email: 'smoke@example.com',
          phone: '(555) 555-0199',
          smsConsent: true,
          emailConsent: true,
          marketingConsent: true,
        }),
      }),
    )

    expect(spies.eq).toHaveBeenCalledWith('id', 'jane-rep')
    expect(spies.eq).not.toHaveBeenCalledWith('email', expect.any(String))
    expect(spies.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        rep_id: 'jane-rep',
        name: 'Louis Phase Five Smoke',
      }),
    )
    expect(response.status).toBe(201)
  })

  it('creates the signup for the public page target from the referer', async () => {
    const { client, spies } = makeAdminClient({
      repId: 'referer-rep',
      paidRepIds: ['referer-rep'],
    })
    createAdminClientMock.mockReturnValue(client)

    const response = await POST(
      new Request('http://localhost/api/amethyst/customer-audience', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          referer: 'http://localhost/amethyst/Homepage.html?c=referer-rep',
        },
        body: JSON.stringify({
          firstName: 'Louis',
          lastName: 'Phase Five Smoke',
          email: 'smoke@example.com',
          phone: '(555) 555-0199',
          smsConsent: true,
          emailConsent: true,
          marketingConsent: true,
        }),
      }),
    )

    expect(spies.eq).toHaveBeenCalledWith('id', 'referer-rep')
    expect(spies.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        rep_id: 'referer-rep',
        name: 'Louis Phase Five Smoke',
      }),
    )
    expect(response.status).toBe(201)
  })

  it('rejects payloads that do not select at least one contact channel', async () => {
    const { client, spies } = makeAdminClient()
    createAdminClientMock.mockReturnValue(client)

    const response = await POST(
      new Request('http://localhost/api/amethyst/customer-audience', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          firstName: 'Jamie',
          lastName: 'Lane',
          email: 'jamie@example.com',
          phone: '(555) 555-1212',
          smsConsent: false,
          emailConsent: false,
          marketingConsent: false,
        }),
      }),
    )

    expect(spies.insert).not.toHaveBeenCalled()
    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({
      code: 'INVALID_INPUT',
      error: 'Choose SMS, email, or both before signing up.',
    })
  })

  it('rejects SMS opt-in when no phone number is provided', async () => {
    const { client, spies } = makeAdminClient()
    createAdminClientMock.mockReturnValue(client)

    const response = await POST(
      new Request('http://localhost/api/amethyst/customer-audience', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          firstName: 'Jamie',
          lastName: 'Lane',
          email: 'jamie@example.com',
          smsConsent: true,
          emailConsent: false,
          marketingConsent: false,
        }),
      }),
    )

    expect(spies.insert).not.toHaveBeenCalled()
    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({
      code: 'INVALID_INPUT',
      error: 'A phone number is required if the customer wants SMS updates.',
    })
  })

  it('rejects public customer signups for unpaid direct rep targets', async () => {
    const { client, spies } = makeAdminClient({ repId: 'unpaid-rep' })
    createAdminClientMock.mockReturnValue(client)

    const response = await POST(
      new Request('http://localhost/api/amethyst/customer-audience?c=unpaid-rep', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          firstName: 'Louis',
          lastName: 'Phase Five Smoke',
          email: 'smoke@example.com',
          phone: '(555) 555-0199',
          smsConsent: true,
          emailConsent: true,
          marketingConsent: true,
        }),
      }),
    )

    expect(spies.eq).toHaveBeenCalledWith('id', 'unpaid-rep')
    expect(spies.insert).not.toHaveBeenCalled()
    expect(response.status).toBe(503)
    await expect(response.json()).resolves.toEqual({
      error: 'Signup is temporarily unavailable right now.',
    })
  })

  it('rejects more than 3 picks and a Not sure yet pick combined with another', async () => {
    process.env.AMETHYST_HOMEPAGE_PREVIEW_EMAIL = 'preview@example.com'
    const { client, spies } = makeAdminClient()
    createAdminClientMock.mockReturnValue(client)

    const tooMany = await POST(
      new Request('http://localhost/api/amethyst/customer-audience', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          firstName: 'Jamie',
          lastName: 'Lane',
          email: 'jamie@example.com',
          emailConsent: true,
          favoriteStones: ['ruby', 'opal', 'pearl', 'garnet'],
          favoriteMaterials: ['gold'],
          favoriteCuts: ['round'],
          favoriteCollections: ['originals'],
        }),
      }),
    )
    expect(tooMany.status).toBe(400)
    await expect(tooMany.json()).resolves.toMatchObject({
      code: 'INVALID_INPUT',
      error: 'Choose up to 3 favorites in each list. Not sure yet stands on its own.',
    })

    const exclusive = await POST(
      new Request('http://localhost/api/amethyst/customer-audience', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          firstName: 'Jamie',
          lastName: 'Lane',
          email: 'jamie@example.com',
          emailConsent: true,
          favoriteStones: ['not_sure', 'ruby'],
          favoriteMaterials: ['gold'],
          favoriteCuts: ['round'],
          favoriteCollections: ['originals'],
        }),
      }),
    )
    expect(exclusive.status).toBe(400)
    expect(spies.insert).not.toHaveBeenCalled()
  })

  it('requires each favorite list and accepts Not sure yet as the answer', async () => {
    process.env.AMETHYST_HOMEPAGE_PREVIEW_EMAIL = 'preview@example.com'
    const { client, spies } = makeAdminClient()
    createAdminClientMock.mockReturnValue(client)

    const missing = await POST(
      new Request('http://localhost/api/amethyst/customer-audience', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          firstName: 'Jamie',
          lastName: 'Lane',
          email: 'jamie@example.com',
          emailConsent: true,
          favoriteStones: [],
          favoriteMaterials: ['gold'],
          favoriteCuts: ['round'],
          favoriteCollections: ['originals'],
        }),
      }),
    )
    expect(missing.status).toBe(400)
    await expect(missing.json()).resolves.toMatchObject({
      error: 'Pick at least one favorite in each list. Not sure yet counts.',
    })

    const accepted = await POST(
      new Request('http://localhost/api/amethyst/customer-audience', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          firstName: 'Jamie',
          lastName: 'Lane',
          email: 'jamie@example.com',
          emailConsent: true,
          favoriteStones: ['not_sure'],
          favoriteMaterials: ['not_sure'],
          favoriteCuts: ['not_sure'],
          favoriteCollections: ['not_sure'],
          ringSize: '9',
          jewelryNotes: 'Soft colors.',
        }),
      }),
    )
    expect(accepted.status).toBe(201)
    expect(spies.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        favorite_stones: ['not_sure'],
        favorite_materials: ['not_sure'],
        favorite_cuts: ['not_sure'],
        favorite_collections: ['not_sure'],
        favorite_gem_or_stone: 'Not sure yet',
        favorite_material: 'Not sure yet',
        favorite_cut: 'Not sure yet',
        favorite_collection: 'Not sure yet',
        ring_size: '9',
        jewelry_notes: 'Soft colors.',
      }),
    )
  })

  it('rejects a ring size outside 5-11 and not_sure', async () => {
    process.env.AMETHYST_HOMEPAGE_PREVIEW_EMAIL = 'preview@example.com'
    const { client, spies } = makeAdminClient()
    createAdminClientMock.mockReturnValue(client)

    const response = await POST(
      new Request('http://localhost/api/amethyst/customer-audience', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          firstName: 'Jamie',
          lastName: 'Lane',
          email: 'jamie@example.com',
          emailConsent: true,
          favoriteStones: ['ruby'],
          favoriteMaterials: ['gold'],
          favoriteCuts: ['round'],
          favoriteCollections: ['originals'],
          ringSize: '5.5',
        }),
      }),
    )

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toMatchObject({
      error: 'Choose a ring size from 5 to 11, or Not sure.',
    })
    expect(spies.insert).not.toHaveBeenCalled()
  })
})
