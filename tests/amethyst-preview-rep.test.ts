import { describe, expect, it, vi } from 'vitest'

import {
  DEFAULT_AMETHYST_PREVIEW_EMAIL,
  resolveAmethystPreviewRep,
} from '@/lib/amethyst/preview-rep'
import { resolveAmethystRequestTarget } from '@/lib/amethyst/request-rep-target'

function makeAdminClient({
  repsByEmail = {},
  repsById = {},
  repsByCustomDomain = {},
  repsByPublicSiteSlug = {},
  latestLaunchRepId = null,
  paidRepIds = [],
  readyLaunchRepIds = [],
  activeTrialRepIds = [],
}: {
  repsByEmail?: Record<string, { id: string; email: string; streaming_links?: unknown }>
  repsById?: Record<string, { id: string; email: string; streaming_links?: unknown }>
  repsByCustomDomain?: Record<string, { id: string; email: string; streaming_links?: unknown }>
  repsByPublicSiteSlug?: Record<string, { id: string; email: string; streaming_links?: unknown }>
  latestLaunchRepId?: string | null
  paidRepIds?: string[]
  readyLaunchRepIds?: string[]
  activeTrialRepIds?: string[]
}) {
  const repEq = vi.fn((column: string, value: string) => {
    if (column === 'email') {
      return {
        maybeSingle: vi.fn().mockResolvedValue({
          data: repsByEmail[value] ?? null,
          error: null,
        }),
      }
    }

    if (column === 'public_site_slug') {
      return {
        maybeSingle: vi.fn().mockResolvedValue({
          data: repsByPublicSiteSlug[value] ?? null,
          error: null,
        }),
      }
    }

    if (column === 'custom_domain') {
      return {
        maybeSingle: vi.fn().mockResolvedValue({
          data: repsByCustomDomain[value] ?? null,
          error: null,
        }),
      }
    }

    expect(column).toBe('id')
    return {
      maybeSingle: vi.fn().mockResolvedValue({
        data: repsById[value] ?? null,
        error: null,
      }),
    }
  })

  const launchMaybeSingle = vi.fn().mockResolvedValue({
    data: latestLaunchRepId ? { rep_id: latestLaunchRepId } : null,
    error: null,
  })
  const launchLimit = vi.fn(() => ({ maybeSingle: launchMaybeSingle }))
  const launchOrder = vi.fn(() => ({ limit: launchLimit }))
  const launchNot = vi.fn(() => ({ order: launchOrder }))
  const launchStatusEq = vi.fn(() => ({ not: launchNot }))
  const launchStageEq = vi.fn(() => ({ eq: launchStatusEq }))

  const publicLaunchMaybeSingle = vi.fn((repId: string) =>
    Promise.resolve({
      data: readyLaunchRepIds.includes(repId) ? { id: 'launch-ready' } : null,
      error: null,
    }),
  )
  const publicLaunchLimit = vi.fn((repId: string) => ({
    maybeSingle: () => publicLaunchMaybeSingle(repId),
  }))
  const publicLaunchOrder = vi.fn((repId: string) => ({
    limit: () => publicLaunchLimit(repId),
  }))
  const publicLaunchStatusEq = vi.fn((repId: string) => ({
    order: () => publicLaunchOrder(repId),
  }))
  const publicLaunchStageEq = vi.fn((repId: string) => ({
    eq: () => publicLaunchStatusEq(repId),
  }))
  const publicLaunchRepEq = vi.fn((_column: string, repId: string) => ({
    eq: () => publicLaunchStageEq(repId),
  }))

  const subscriptionMaybeSingle = vi.fn((repId: string) =>
    Promise.resolve({
      data: paidRepIds.includes(repId) ? { id: 'sub-1', status: 'active' } : null,
      error: null,
    }),
  )
  const subscriptionEq = vi.fn((_column: string, repId: string) => ({
    maybeSingle: () => subscriptionMaybeSingle(repId),
  }))

  const from = vi.fn((table: string) => {
    if (table === 'reps') {
      return {
        select: vi.fn(() => ({ eq: repEq })),
      }
    }

    if (table === 'sparkle_suite_launch_builds') {
      return {
        select: vi.fn((columns: string) => ({
          eq: columns === 'rep_id' ? launchStageEq : publicLaunchRepEq,
        })),
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
          eq: vi.fn((_column: string, repId: string) => ({
            maybeSingle: vi.fn().mockResolvedValue({
              data: activeTrialRepIds.includes(repId)
                ? {
                    id: 'trial-1',
                    rep_id: repId,
                    status: 'active',
                    duration_days: 5,
                    provisioned_by_rep_id: null,
                    launch_build_id: null,
                    provisioned_at: '2098-12-31T00:00:00.000Z',
                    first_signed_in_at: '2099-01-01T00:00:00.000Z',
                    expires_at: '2099-01-06T00:00:00.000Z',
                    revoked_at: null,
                  }
                : null,
              error: null,
            }),
          })),
        })),
      }
    }

    throw new Error(`Unexpected table ${table}`)
  })

  return { from } as never
}

describe('Amethyst preview rep resolver', () => {
  it('resolves a paid rep by public site slug before preview email fallbacks', async () => {
    const admin = makeAdminClient({
      repsByEmail: {
        'preview@example.com': {
          id: 'rep-preview',
          email: 'preview@example.com',
        },
      },
      repsByPublicSiteSlug: {
        sparklebysasha: {
          id: 'rep-slug',
          email: 'sasha@example.com',
        },
      },
      paidRepIds: ['rep-slug'],
    })

    await expect(
      resolveAmethystPreviewRep(admin, {
        env: {
          AMETHYST_HOMEPAGE_PREVIEW_EMAIL: 'preview@example.com',
        },
        publicSiteSlug: 'sparklebysasha',
      }),
    ).resolves.toEqual({
      id: 'rep-slug',
      email: 'sasha@example.com',
    })
  })

  it('normalizes public site slug lookup from mixed case and whitespace', async () => {
    const admin = makeAdminClient({
      repsByPublicSiteSlug: {
        sparklebysasha: {
          id: 'rep-slug',
          email: 'sasha@example.com',
        },
      },
      paidRepIds: ['rep-slug'],
    })

    await expect(
      resolveAmethystPreviewRep(admin, {
        publicSiteSlug: '  SparkleBySasha  ',
      }),
    ).resolves.toEqual({
      id: 'rep-slug',
      email: 'sasha@example.com',
    })
  })

  it('requires matching explicit rep and public slug identities', async () => {
    const rep = { id: 'rep-same', email: 'same@example.com' }
    const admin = makeAdminClient({
      repsById: { 'rep-same': rep },
      repsByPublicSiteSlug: { sparklebysasha: rep },
      paidRepIds: ['rep-same'],
    })

    await expect(resolveAmethystPreviewRep(admin, {
      repId: 'rep-same',
      publicSiteSlug: 'SparkleBySasha',
      strict: true,
    })).resolves.toEqual(rep)
  })

  it('fails closed when explicit rep and public slug resolve to different tenants', async () => {
    const admin = makeAdminClient({
      repsById: {
        'rep-one': { id: 'rep-one', email: 'one@example.com' },
      },
      repsByPublicSiteSlug: {
        sparkletwo: { id: 'rep-two', email: 'two@example.com' },
      },
      paidRepIds: ['rep-one', 'rep-two'],
    })

    const target = resolveAmethystRequestTarget(new Request(
      'https://www.yoursparklesuite.com/api/amethyst/live-lineup?c=rep-one&publicSiteSlug=sparkletwo',
    ))
    expect(target).toMatchObject({
      repId: 'rep-one', publicSiteSlug: 'sparkletwo', targeted: true,
    })

    await expect(resolveAmethystPreviewRep(admin, {
      repId: target.repId ?? target.customDomain,
      publicSiteSlug: target.publicSiteSlug,
      strict: true,
    })).resolves.toBeNull()
  })

  it('returns null for an unpaid public site slug match without preview email fallback', async () => {
    const admin = makeAdminClient({
      repsByEmail: {
        'preview@example.com': {
          id: 'rep-preview',
          email: 'preview@example.com',
        },
      },
      repsByPublicSiteSlug: {
        sparklebysasha: {
          id: 'rep-slug',
          email: 'sasha@example.com',
        },
      },
    })

    await expect(
      resolveAmethystPreviewRep(admin, {
        env: {
          AMETHYST_HOMEPAGE_PREVIEW_EMAIL: 'preview@example.com',
        },
        publicSiteSlug: 'sparklebysasha',
      }),
    ).resolves.toBeNull()
  })

  it('returns null for an unknown public site slug without preview email fallback', async () => {
    const admin = makeAdminClient({
      repsByEmail: {
        'preview@example.com': {
          id: 'rep-preview',
          email: 'preview@example.com',
        },
      },
    })

    await expect(
      resolveAmethystPreviewRep(admin, {
        env: {
          AMETHYST_HOMEPAGE_PREVIEW_EMAIL: 'preview@example.com',
        },
        publicSiteSlug: 'unknownsparkle',
      }),
    ).resolves.toBeNull()
  })

  it('uses an explicit rep id before preview email fallbacks', async () => {
    const admin = makeAdminClient({
      repsByEmail: {
        'preview@example.com': {
          id: 'rep-preview',
          email: 'preview@example.com',
        },
      },
      repsById: {
        'rep-target': {
          id: 'rep-target',
          email: 'target@example.com',
        },
      },
      paidRepIds: ['rep-target'],
    })

    await expect(
      resolveAmethystPreviewRep(admin, {
        env: {
          AMETHYST_HOMEPAGE_PREVIEW_EMAIL: 'preview@example.com',
        },
        repId: 'rep-target',
      }),
    ).resolves.toEqual({
      id: 'rep-target',
      email: 'target@example.com',
    })
  })

  it('uses a matching custom domain before preview email fallbacks', async () => {
    const admin = makeAdminClient({
      repsByEmail: {
        'preview@example.com': {
          id: 'rep-preview',
          email: 'preview@example.com',
        },
      },
      repsByCustomDomain: {
        'sparklebysasha.example': {
          id: 'rep-domain',
          email: 'sasha@example.com',
        },
      },
      paidRepIds: ['rep-domain'],
    })

    await expect(
      resolveAmethystPreviewRep(admin, {
        env: {
          AMETHYST_HOMEPAGE_PREVIEW_EMAIL: 'preview@example.com',
        },
        repId: 'SparkleBySasha.example',
      }),
    ).resolves.toEqual({
      id: 'rep-domain',
      email: 'sasha@example.com',
    })
  })

  it('resolves a final custom domain after a rep has active workspace access', async () => {
    const admin = makeAdminClient({
      repsByCustomDomain: {
        'customsparkle.example': {
          id: 'rep-custom-domain',
          email: 'rep@example.test',
        },
      },
      paidRepIds: ['rep-custom-domain'],
    })

    await expect(
      resolveAmethystPreviewRep(admin, {
        repId: 'customsparkle.example',
      }),
    ).resolves.toEqual({
      id: 'rep-custom-domain',
      email: 'rep@example.test',
    })
  })

  it('resolves a www custom domain alternate after cutover', async () => {
    const admin = makeAdminClient({
      repsByCustomDomain: {
        'customsparkle.example': {
          id: 'rep-custom-domain',
          email: 'rep@example.test',
        },
      },
      paidRepIds: ['rep-custom-domain'],
    })

    await expect(
      resolveAmethystPreviewRep(admin, {
        repId: 'www.customsparkle.example',
      }),
    ).resolves.toEqual({
      id: 'rep-custom-domain',
      email: 'rep@example.test',
    })
  })

  it('resolves a custom domain before attempting an ID lookup', async () => {
    const admin = makeAdminClient({
      repsByCustomDomain: {
        'brisglowtique.com': { id: 'rep-bri', email: 'bri@example.test' },
      },
      paidRepIds: ['rep-bri'],
    })

    await expect(
      resolveAmethystPreviewRep(admin, { repId: 'brisglowtique.com' }),
    ).resolves.toEqual({ id: 'rep-bri', email: 'bri@example.test' })
  })

  it('resolves Mile High Fizz by public site slug when Lindsey has active workspace access', async () => {
    const admin = makeAdminClient({
      repsByPublicSiteSlug: {
        milehighfizz: {
          id: 'rep-mile-high-fizz',
          email: 'lindseychapman1188@gmail.com',
        },
      },
      paidRepIds: ['rep-mile-high-fizz'],
    })

    await expect(
      resolveAmethystPreviewRep(admin, {
        publicSiteSlug: 'MileHighFizz',
      }),
    ).resolves.toEqual({
      id: 'rep-mile-high-fizz',
      email: 'lindseychapman1188@gmail.com',
    })
  })

  it('falls back to preview reps when a host has no custom-domain match', async () => {
    const admin = makeAdminClient({
      repsByEmail: {
        'preview@example.com': {
          id: 'rep-preview',
          email: 'preview@example.com',
        },
      },
    })

    await expect(
      resolveAmethystPreviewRep(admin, {
        env: {
          AMETHYST_HOMEPAGE_PREVIEW_EMAIL: 'preview@example.com',
        },
        repId: 'unknown.example',
      }),
    ).resolves.toEqual({
      id: 'rep-preview',
      email: 'preview@example.com',
    })
  })

  it('prefers explicit Amethyst preview email over the demo rep email', async () => {
    const admin = makeAdminClient({
      repsByEmail: {
        'preview@example.com': {
          id: 'rep-preview',
          email: 'preview@example.com',
          streaming_links: { tiktok: 'https://tiktok.com/@preview' },
        },
      },
    })

    await expect(
      resolveAmethystPreviewRep(admin, {
        env: {
          AMETHYST_HOMEPAGE_PREVIEW_EMAIL: 'preview@example.com',
          DEMO_REP_EMAIL: 'demo@example.com',
        },
        select: 'id, email, streaming_links',
      }),
    ).resolves.toEqual({
      id: 'rep-preview',
      email: 'preview@example.com',
      streaming_links: { tiktok: 'https://tiktok.com/@preview' },
    })
  })

  it('uses the latest ready launch build rep when preview emails do not resolve', async () => {
    const admin = makeAdminClient({
      repsById: {
        'rep-launch': {
          id: 'rep-launch',
          email: 'launch@example.com',
        },
      },
      latestLaunchRepId: 'rep-launch',
    })

    await expect(
      resolveAmethystPreviewRep(admin, {
        env: { DEMO_REP_EMAIL: 'missing@example.com' },
      }),
    ).resolves.toEqual({
      id: 'rep-launch',
      email: 'launch@example.com',
    })
  })

  it('does not expose an unpaid explicit rep id as a public customer site', async () => {
    const admin = makeAdminClient({
      repsByEmail: {
        'preview@example.com': {
          id: 'rep-preview',
          email: 'preview@example.com',
        },
      },
      repsById: {
        'rep-unpaid': {
          id: 'rep-unpaid',
          email: 'unpaid@example.com',
        },
      },
    })

    await expect(
      resolveAmethystPreviewRep(admin, {
        env: {
          AMETHYST_HOMEPAGE_PREVIEW_EMAIL: 'preview@example.com',
        },
        repId: 'rep-unpaid',
      }),
    ).resolves.toBeNull()
  })

  it('does not expose a ready launch build without subscription or active trial', async () => {
    const admin = makeAdminClient({
      repsById: {
        'rep-demo-ready': {
          id: 'rep-demo-ready',
          email: 'demo-ready@example.com',
        },
      },
      readyLaunchRepIds: ['rep-demo-ready'],
    })

    await expect(
      resolveAmethystPreviewRep(admin, {
        repId: 'rep-demo-ready',
      }),
    ).resolves.toBeNull()
  })

  it('serves an explicit customer site during an unexpired operator trial', async () => {
    const admin = makeAdminClient({
      repsById: {
        'rep-trial': {
          id: 'rep-trial',
          email: 'trial@example.com',
        },
      },
      activeTrialRepIds: ['rep-trial'],
    })

    await expect(
      resolveAmethystPreviewRep(admin, { repId: 'rep-trial' }),
    ).resolves.toEqual({
      id: 'rep-trial',
      email: 'trial@example.com',
    })
  })

  it('falls back to the locked default preview rep', async () => {
    const admin = makeAdminClient({
      repsByEmail: {
        [DEFAULT_AMETHYST_PREVIEW_EMAIL]: {
          id: 'rep-default',
          email: DEFAULT_AMETHYST_PREVIEW_EMAIL,
        },
      },
    })

    await expect(resolveAmethystPreviewRep(admin)).resolves.toEqual({
      id: 'rep-default',
      email: DEFAULT_AMETHYST_PREVIEW_EMAIL,
    })
  })
})
