import { beforeEach, describe, expect, it, vi } from 'vitest'

const createAdminClientMock = vi.hoisted(() => vi.fn())

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: createAdminClientMock,
}))

import { saveRequiredSetupAnswer } from '@/lib/self-serve/required-setup'

type AdminMockOptions = {
  claimError?: unknown
  existingSlugOwner?: string | null
  existingSlug?: string
  setupAnswers?: Record<string, unknown>
}

function makeSetupRow(answers: Record<string, unknown> = {}) {
  return {
    id: 'setup-1',
    rep_id: 'rep-1',
    status: 'required_setup',
    current_step: 'account_basics',
    completed_steps: [],
    answers,
    generated_copy: {},
    support_state: {},
    dashboard_unlocked_at: null,
    created_at: '2026-06-05T20:00:00Z',
    updated_at: '2026-06-05T20:00:00Z',
  }
}

function makeAdminClient(options: AdminMockOptions = {}) {
  const setupRow = makeSetupRow(options.setupAnswers)
  const setupUpdates: Record<string, unknown>[] = []
  const repUpdates: Record<string, unknown>[] = []

  const setupMaybeSingle = vi.fn(async () => ({ data: setupRow, error: null }))
  const setupUpdateSingle = vi.fn(async () => ({
    data: {
      ...setupRow,
      answers: setupUpdates.at(-1)?.answers ?? setupRow.answers,
      updated_at: '2026-06-05T20:05:00Z',
    },
    error: null,
  }))
  const repMaybeSingle = vi.fn(async () => ({
    data: options.existingSlugOwner
      ? {
          id: options.existingSlugOwner,
          public_site_slug: options.existingSlug ?? 'graciesparkleparty',
        }
      : null,
    error: null,
  }))
  const repUpdateSingle = vi.fn(async () => ({
    data: {
      id: 'rep-1',
      public_site_slug: repUpdates.at(-1)?.public_site_slug,
    },
    error: options.claimError ?? null,
  }))

  const from = vi.fn((table: string) => {
    if (table === 'self_serve_setup_sessions') {
      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({ maybeSingle: setupMaybeSingle })),
        })),
        update: vi.fn((patch: Record<string, unknown>) => {
          setupUpdates.push(patch)
          return {
            eq: vi.fn(() => ({
              select: vi.fn(() => ({ single: setupUpdateSingle })),
            })),
          }
        }),
      }
    }

    if (table === 'reps') {
      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({ maybeSingle: repMaybeSingle, in: () => ({maybeSingle:async()=>({data:null,error:null})}) })),
        })),
        update: vi.fn((patch: Record<string, unknown>) => {
          repUpdates.push(patch)
          return {
            eq: vi.fn(() => ({
              select: vi.fn(() => ({ single: repUpdateSingle })),
            })),
          }
        }),
      }
    }

    throw new Error(`Unexpected table ${table}`)
  })

  const admin = { from }
  createAdminClientMock.mockReturnValue(admin)

  return {
    from,
    repMaybeSingle,
    repUpdateSingle,
    repUpdates,
    setupUpdateSingle,
    setupUpdates,
  }
}

describe('required setup public site link claiming', () => {
  beforeEach(() => {
    createAdminClientMock.mockReset()
  })

  it("auto-claims graciesparkleparty from Gracie's Sparkle Party and saves accepted account basics metadata", async () => {
    const admin = makeAdminClient()

    const state = await saveRequiredSetupAnswer('rep-1', 'account_basics', {
      liveShowName: "Gracie's Sparkle Party",
    })

    expect(admin.repUpdateSingle).toHaveBeenCalledTimes(1)
    expect(admin.repUpdates).toEqual([{ public_site_slug: 'graciesparkleparty' }])
    expect(admin.setupUpdates.at(-1)).toEqual(
      expect.objectContaining({
        answers: {
          account_basics: {
            liveShowName: "Gracie's Sparkle Party",
            publicSiteSlug: 'graciesparkleparty',
            publicSiteUrl:
              'https://www.yoursparklesuite.com/graciesparkleparty',
            publicSiteSlugStatus: 'accepted',
            publicSiteSlugRedFlag: null,
            publicSiteSlugAlternatives: [],
          },
        },
      }),
    )
    expect(state.answers.account_basics).toEqual({
      liveShowName: "Gracie's Sparkle Party",
      publicSiteSlug: 'graciesparkleparty',
      publicSiteUrl: 'https://www.yoursparklesuite.com/graciesparkleparty',
      publicSiteSlugStatus: 'accepted',
      publicSiteSlugRedFlag: null,
      publicSiteSlugAlternatives: [],
    })
  })

  it('flags a generated slug owned by another rep without updating reps', async () => {
    const admin = makeAdminClient({ existingSlugOwner: 'rep-2' })

    await saveRequiredSetupAnswer('rep-1', 'account_basics', {
      liveShowName: "Gracie's Sparkle Party",
    })

    expect(admin.repUpdateSingle).not.toHaveBeenCalled()
    expect(admin.repUpdates).toEqual([])
    expect(admin.setupUpdates.at(-1)).toEqual(
      expect.objectContaining({
        answers: {
          account_basics: {
            liveShowName: "Gracie's Sparkle Party",
            publicSiteSlug: null,
            publicSiteUrl: null,
            publicSiteSlugStatus: 'needs_review',
            publicSiteSlugRedFlag: 'taken',
            publicSiteSlugAlternatives: [
              'graciesparklepartylive',
              'graciesparklepartyshop',
              'graciesparklepartybp',
            ],
          },
        },
      }),
    )
  })

  it('accepts a valid generated slug already owned by the same rep', async () => {
    const admin = makeAdminClient({ existingSlugOwner: 'rep-1' })

    await saveRequiredSetupAnswer('rep-1', 'account_basics', {
      liveShowName: "Gracie's Sparkle Party",
    })

    expect(admin.repUpdateSingle).toHaveBeenCalledTimes(1)
    expect(admin.repUpdates).toEqual([{ public_site_slug: 'graciesparkleparty' }])
    expect(admin.setupUpdates.at(-1)).toEqual(
      expect.objectContaining({
        answers: {
          account_basics: expect.objectContaining({
            publicSiteSlug: 'graciesparkleparty',
            publicSiteSlugStatus: 'accepted',
            publicSiteSlugRedFlag: null,
            publicSiteSlugAlternatives: [],
          }),
        },
      }),
    )
  })

  it('flags invalid generated slugs with the validation reason', async () => {
    const admin = makeAdminClient()

    await saveRequiredSetupAnswer('rep-1', 'account_basics', {
      liveShowName: 'Go',
    })

    expect(admin.repUpdateSingle).not.toHaveBeenCalled()
    expect(admin.setupUpdates.at(-1)).toEqual(
      expect.objectContaining({
        answers: {
          account_basics: {
            liveShowName: 'Go',
            publicSiteSlug: null,
            publicSiteUrl: null,
            publicSiteSlugStatus: 'needs_review',
            publicSiteSlugRedFlag: 'too_short',
            publicSiteSlugAlternatives: [
              'sparkleshowlive',
              'sparkleshowshop',
              'sparkleshowbp',
            ],
          },
        },
      }),
    )
  })

  it('flags invalid explicit slugs with the validation reason', async () => {
    const admin = makeAdminClient()

    await saveRequiredSetupAnswer('rep-1', 'account_basics', {
      liveShowName: "Gracie's Sparkle Party",
      publicSiteSlug: 'login',
    })

    expect(admin.repUpdateSingle).not.toHaveBeenCalled()
    expect(admin.setupUpdates.at(-1)).toEqual(
      expect.objectContaining({
        answers: {
          account_basics: {
            liveShowName: "Gracie's Sparkle Party",
            publicSiteSlug: null,
            publicSiteUrl: null,
            publicSiteSlugStatus: 'needs_review',
            publicSiteSlugRedFlag: 'reserved',
            publicSiteSlugAlternatives: [
              'loginlive',
              'loginshop',
              'loginbp',
            ],
          },
        },
      }),
    )
  })

  it('turns a claim-time unique violation into taken red-flag metadata without throwing', async () => {
    const admin = makeAdminClient({
      claimError: {
        code: '23505',
        message: 'duplicate key value violates unique constraint',
      },
    })

    await expect(
      saveRequiredSetupAnswer('rep-1', 'account_basics', {
        liveShowName: "Gracie's Sparkle Party",
      }),
    ).resolves.toEqual(expect.any(Object))

    expect(admin.repUpdateSingle).toHaveBeenCalledTimes(1)
    expect(admin.setupUpdates.at(-1)).toEqual(
      expect.objectContaining({
        answers: {
          account_basics: {
            liveShowName: "Gracie's Sparkle Party",
            publicSiteSlug: null,
            publicSiteUrl: null,
            publicSiteSlugStatus: 'needs_review',
            publicSiteSlugRedFlag: 'taken',
            publicSiteSlugAlternatives: [
              'graciesparklepartylive',
              'graciesparklepartyshop',
              'graciesparklepartybp',
            ],
          },
        },
      }),
    )
  })

  it('clears stale accepted public site metadata when a later save red-flags the slug', async () => {
    const admin = makeAdminClient({
      setupAnswers: {
        account_basics: {
          liveShowName: "Gracie's Sparkle Party",
          publicSiteSlug: 'graciesparkleparty',
          publicSiteUrl: 'https://www.yoursparklesuite.com/graciesparkleparty',
          publicSiteSlugStatus: 'accepted',
          publicSiteSlugRedFlag: null,
          publicSiteSlugAlternatives: [],
        },
      },
    })

    const state = await saveRequiredSetupAnswer('rep-1', 'account_basics', {
      liveShowName: 'Go',
    })

    expect(admin.repUpdateSingle).not.toHaveBeenCalled()
    expect(state.answers.account_basics).toEqual({
      liveShowName: 'Go',
      publicSiteSlug: null,
      publicSiteUrl: null,
      publicSiteSlugStatus: 'needs_review',
      publicSiteSlugRedFlag: 'too_short',
      publicSiteSlugAlternatives: [
        'sparkleshowlive',
        'sparkleshowshop',
        'sparkleshowbp',
      ],
    })
  })
})
