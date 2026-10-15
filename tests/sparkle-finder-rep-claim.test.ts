import { beforeEach, describe, expect, it, vi } from 'vitest'

const createAdminClientMock = vi.fn(() => ({}))

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => createAdminClientMock(),
}))

import { POST as postSparkleFinderRepClaim } from '@/app/api/internal/finder/rep-claim/route'
import {
  authorizeSparkleFinderRepClaimRequest,
  validateSparkleFinderRepClaim,
} from '@/lib/sparkle-finder/rep-claim'

describe('Sparkle Finder internal rep claim', () => {
  beforeEach(() => {
    vi.unstubAllEnvs()
    createAdminClientMock.mockClear()
  })

  it('requires the server-to-server Finder claim token', () => {
    expect(
      authorizeSparkleFinderRepClaimRequest(
        new Request('http://localhost/api/internal/finder/rep-claim', {
          headers: { authorization: 'Bearer finder-token' },
          method: 'POST',
        }),
        'finder-token',
      ),
    ).toEqual({ ok: true })

    expect(
      authorizeSparkleFinderRepClaimRequest(
        new Request('http://localhost/api/internal/finder/rep-claim', {
          headers: { authorization: 'Bearer wrong-token' },
          method: 'POST',
        }),
        'finder-token',
      ),
    ).toEqual({ ok: false, reason: 'unauthorized', status: 401 })
  })

  it('validates a Secret Rep ID Number and returns only safe entitlement fields', async () => {
    const deps = makeDeps({
      liveQueueRow: { rep_id: 'suite-rep-1' },
      repRow: {
        id: 'suite-rep-1',
        business_name: 'The Bling Kitchen',
        display_name: 'Heather',
        public_site_slug: 'blingkitchen',
        status: 'active',
      },
    })

    await expect(
      validateSparkleFinderRepClaim(
        {
          sourceProduct: 'sparkle_finder',
          finderUserId: 'finder-user-1',
          secretRepIdNumber: ' bli-3767 ',
        },
        deps,
      ),
    ).resolves.toEqual({
      ok: true,
      status: 'claimed',
      suiteRepId: 'suite-rep-1',
      displayName: 'Heather',
      businessName: 'The Bling Kitchen',
      publicSiteSlug: 'blingkitchen',
      finderEntitlement: {
        isRep: true,
        silverRepIncluded: true,
        badge: 'bp_rep',
      },
    })

    expect(deps.liveQueue.eqSyncCode).toHaveBeenCalledWith('sync_code', 'BLI-3767')
    expect(deps.rep.eqRep).toHaveBeenCalledWith('id', 'suite-rep-1')
  })

  it('rejects invalid or missing Secret Rep ID Numbers without exposing matches', async () => {
    const deps = makeDeps({ liveQueueRow: null })

    await expect(
      validateSparkleFinderRepClaim(
        {
          sourceProduct: 'sparkle_finder',
          finderUserId: 'finder-user-1',
          secretRepIdNumber: 'wrong-code',
        },
        deps,
      ),
    ).resolves.toEqual({
      ok: false,
      status: 'not_found',
      message: 'That Secret Rep ID Number did not match an active Sparkle Suite rep.',
    })

    expect(deps.rep.eqRep).not.toHaveBeenCalled()
  })

  it('rejects valid Secret Rep ID Numbers for active reps that are not Finder-eligible yet', async () => {
    const deps = makeDeps({
      liveQueueRow: { rep_id: 'suite-rep-1' },
      repRow: {
        id: 'suite-rep-1',
        business_name: 'The Bling Kitchen',
        display_name: 'Heather',
        public_site_slug: 'blingkitchen',
        status: 'active',
      },
      subscriptionRows: [],
      launchBuildRows: [],
    })

    await expect(
      validateSparkleFinderRepClaim(
        {
          sourceProduct: 'sparkle_finder',
          finderUserId: 'finder-user-1',
          secretRepIdNumber: 'BLI-3767',
        },
        deps,
      ),
    ).resolves.toEqual({
      ok: false,
      status: 'not_found',
      message: 'That Secret Rep ID Number did not match an active Sparkle Suite rep.',
    })
  })

  it('allows valid Secret Rep ID Numbers for ready launch-build reps before paid subscription starts', async () => {
    const deps = makeDeps({
      liveQueueRow: { rep_id: 'suite-rep-1' },
      repRow: {
        id: 'suite-rep-1',
        business_name: 'The Bling Kitchen',
        display_name: 'Heather',
        public_site_slug: 'blingkitchen',
        status: 'active',
      },
      subscriptionRows: [],
      launchBuildRows: [{ rep_id: 'suite-rep-1' }],
    })

    await expect(
      validateSparkleFinderRepClaim(
        {
          sourceProduct: 'sparkle_finder',
          finderUserId: 'finder-user-1',
          secretRepIdNumber: 'BLI-3767',
        },
        deps,
      ),
    ).resolves.toMatchObject({
      ok: true,
      suiteRepId: 'suite-rep-1',
      finderEntitlement: {
        isRep: true,
        silverRepIncluded: true,
        badge: 'bp_rep',
      },
    })
  })

  it('rejects non-Finder sources and missing Finder user ids', async () => {
    const deps = makeDeps({ liveQueueRow: null })

    await expect(
      validateSparkleFinderRepClaim(
        {
          sourceProduct: 'sparkle_suite',
          finderUserId: 'finder-user-1',
          secretRepIdNumber: 'BLI-3767',
        },
        deps,
      ),
    ).resolves.toMatchObject({
      ok: false,
      status: 'rejected',
    })

    await expect(
      validateSparkleFinderRepClaim(
        {
          sourceProduct: 'sparkle_finder',
          secretRepIdNumber: 'BLI-3767',
        },
        deps,
      ),
    ).resolves.toMatchObject({
      ok: false,
      status: 'rejected',
    })
  })

  it('protects the HTTP endpoint with the Finder server token', async () => {
    vi.stubEnv('SPARKLE_FINDER_TO_SUITE_REP_CLAIM_TOKEN', 'finder-token')

    const response = await postSparkleFinderRepClaim(
      new Request('http://localhost/api/internal/finder/rep-claim', {
        body: JSON.stringify({ sourceProduct: 'sparkle_finder' }),
        headers: {
          authorization: 'Bearer wrong-token',
          'content-type': 'application/json',
        },
        method: 'POST',
      }),
    )

    expect(response.status).toBe(401)
    expect(createAdminClientMock).not.toHaveBeenCalled()
    await expect(response.json()).resolves.toEqual({ error: 'unauthorized' })
  })

  it('returns 503 when the HTTP endpoint token is not configured', async () => {
    const response = await postSparkleFinderRepClaim(
      new Request('http://localhost/api/internal/finder/rep-claim', {
        body: JSON.stringify({ sourceProduct: 'sparkle_finder' }),
        method: 'POST',
      }),
    )

    expect(response.status).toBe(503)
    expect(createAdminClientMock).not.toHaveBeenCalled()
    await expect(response.json()).resolves.toEqual({
      error: 'Sparkle Finder rep claim is not configured.',
    })
  })

  it('returns no-store JSON from the authorized HTTP endpoint', async () => {
    vi.stubEnv('SPARKLE_FINDER_TO_SUITE_REP_CLAIM_TOKEN', 'finder-token')
    createAdminClientMock.mockReturnValueOnce(
      makeDeps({
        liveQueueRow: { rep_id: 'suite-rep-1' },
        repRow: {
          id: 'suite-rep-1',
          display_name: 'Heather',
          business_name: 'The Bling Kitchen',
          public_site_slug: 'blingkitchen',
          status: 'active',
        },
      }).supabase,
    )

    const response = await postSparkleFinderRepClaim(
      new Request('http://localhost/api/internal/finder/rep-claim', {
        body: JSON.stringify({
          sourceProduct: 'sparkle_finder',
          finderUserId: 'finder-user-1',
          secretRepIdNumber: 'BLI-3767',
        }),
        headers: {
          authorization: 'Bearer finder-token',
          'content-type': 'application/json',
        },
        method: 'POST',
      }),
    )

    expect(response.status).toBe(200)
    expect(response.headers.get('cache-control')).toBe('no-store')
    await expect(response.json()).resolves.toMatchObject({
      ok: true,
      suiteRepId: 'suite-rep-1',
      finderEntitlement: {
        isRep: true,
        silverRepIncluded: true,
        badge: 'bp_rep',
      },
    })
  })
})

function makeDeps(options: {
  liveQueueRow: Record<string, unknown> | null
  repRow?: Record<string, unknown> | null
  subscriptionRows?: Array<Record<string, unknown>>
  launchBuildRows?: Array<Record<string, unknown>>
}) {
  const liveQueueMaybeSingle = vi.fn().mockResolvedValue({
    data: options.liveQueueRow,
    error: null,
  })
  const eqSyncCode = vi.fn(() => ({ maybeSingle: liveQueueMaybeSingle }))
  const liveQueueSelect = vi.fn(() => ({ eq: eqSyncCode }))

  const repMaybeSingle = vi.fn().mockResolvedValue({
    data: options.repRow ?? null,
    error: null,
  })
  const eqRep = vi.fn(() => ({ maybeSingle: repMaybeSingle }))
  const repSelect = vi.fn(() => ({ eq: eqRep }))

  const subscriptionIn = vi.fn().mockResolvedValue({
    data: options.subscriptionRows ?? [{ rep_id: 'suite-rep-1' }],
    error: null,
  })
  const subscriptionSelect = vi.fn(() => ({ in: subscriptionIn }))

  const launchBuildNot = vi.fn().mockResolvedValue({
    data: options.launchBuildRows ?? [],
    error: null,
  })
  const launchBuildStatusEq = vi.fn(() => ({ not: launchBuildNot }))
  const launchBuildStageEq = vi.fn(() => ({ eq: launchBuildStatusEq }))
  const launchBuildSelect = vi.fn(() => ({ eq: launchBuildStageEq }))

  const supabase = {
    from: vi.fn((table: string) => {
      if (table === 'live_lineup_connection_codes') {
        return { select: liveQueueSelect }
      }
      if (table === 'reps') {
        return { select: repSelect }
      }
      if (table === 'subscriptions') {
        return { select: subscriptionSelect }
      }
      if (table === 'sparkle_suite_launch_builds') {
        return { select: launchBuildSelect }
      }
      throw new Error(`Unexpected table: ${table}`)
    }),
  }

  return {
    supabase: supabase as never,
    liveQueue: {
      eqSyncCode,
      liveQueueMaybeSingle,
      liveQueueSelect,
    },
    rep: {
      eqRep,
      repMaybeSingle,
      repSelect,
    },
  }
}
