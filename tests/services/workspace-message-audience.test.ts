import { beforeEach, describe, expect, it, vi } from 'vitest'

const enqueueOutbox = vi.hoisted(() => vi.fn(async () => ({ id: 'event-1' })))

vi.mock('@/lib/services/workspace-message-outbox', () => ({
  enqueueWorkspaceMessageOutboxEvent: enqueueOutbox,
  claimWorkspaceMessageOutboxEvents: vi.fn(),
  completeWorkspaceMessageOutboxEvent: vi.fn(),
  failWorkspaceMessageOutboxEvent: vi.fn(),
}))

import {
  BROADCAST_AUDIENCE_ALLOWLIST,
  broadcastAudienceOrFilter,
  isBroadcastAudienceRecipient,
  resolveWorkspaceMessageAudience,
} from '@/lib/services/workspace-message-audience'
import {
  enqueueDueMonthlyReports,
  enqueueDueWeeklyBirthdayReports,
} from '@/lib/services/workspace-message-automation'

const AGENT_EMAILS = [
  'sparkle-reviewer+preview@neonrabbit.net',
  'sparkle-reviewer+local@neonrabbit.net',
  'sparkle-reviewer+loc@example.test',
  'nic-nac-support@neonrabbit.net',
  'lane-accounting-viewer@neonrabbit.internal',
] as const

function makeQuery(result: { data: unknown; error: unknown }) {
  const query: Record<string, unknown> = {}
  for (const method of ['select', 'eq', 'in', 'or', 'order', 'range']) {
    query[method] = vi.fn(() => query)
  }
  query.then = (
    resolve: (value: typeof result) => unknown,
    reject: (reason: unknown) => unknown,
  ) => Promise.resolve(result).then(resolve, reject)
  return query
}

function rep(overrides: Record<string, string>) {
  return {
    id: overrides.id,
    display_name: overrides.display_name,
    business_name: overrides.business_name,
    email: overrides.email,
    account_classification: overrides.account_classification,
    public_site_slug: overrides.public_site_slug,
    status: overrides.status ?? 'active',
  }
}

const mixedReps = [
  rep({
    id: 'customer-kim',
    display_name: 'Kim',
    business_name: 'Kim Goforth',
    email: 'ksgoforth64@gmail.com',
    account_classification: 'customer',
    public_site_slug: 'kim',
  }),
  rep({
    id: 'louis-real',
    display_name: 'Louis',
    business_name: 'The Dudes Fizzfest',
    email: 'Louis@NeonRabbit.net',
    account_classification: 'demo',
    public_site_slug: 'DudesFizzfest',
  }),
  rep({
    id: 'louis-other',
    display_name: 'Louis',
    business_name: 'Neon Rabbit',
    email: 'louis@neonrabbit.net',
    account_classification: 'demo',
    public_site_slug: 'neonrabbit',
  }),
  rep({
    id: 'demo-beta',
    display_name: 'Beta demo',
    business_name: 'Sparkle Suite Beta Demo',
    email: 'louis+sparkle-beta-demo@neonrabbit.net',
    account_classification: 'demo',
    public_site_slug: 'beta-demo',
  }),
  rep({
    id: 'inactive-customer',
    display_name: 'Former',
    business_name: 'Former Gems',
    email: 'former@example.com',
    account_classification: 'customer',
    public_site_slug: 'former',
    status: 'inactive',
  }),
  ...AGENT_EMAILS.map((email, index) =>
    rep({
      id: `agent-${index}`,
      display_name: 'Agent',
      business_name: 'Agent account',
      email,
      account_classification: index === AGENT_EMAILS.length - 1 ? 'agent' : 'demo',
      public_site_slug: `agent-${index}`,
    }),
  ),
]

describe('broadcast audience membership', () => {
  it('keeps Louis on a single email-and-slug allow-list entry', () => {
    expect(BROADCAST_AUDIENCE_ALLOWLIST).toEqual([
      {
        email: 'louis@neonrabbit.net',
        publicSiteSlug: 'dudesfizzfest',
        label: 'The Dudes Fizzfest',
      },
    ])
    expect(broadcastAudienceOrFilter()).toBe(
      'account_classification.eq.customer,and(email.ilike."louis@neonrabbit.net",public_site_slug.ilike."dudesfizzfest")',
    )
  })

  it('includes active customers and Louis, and excludes demo, agent, and other Louis rows', async () => {
    const repsQuery = makeQuery({ data: mixedReps, error: null })
    const result = await resolveWorkspaceMessageAudience(
      { from: vi.fn(() => repsQuery) } as never,
      { kind: 'all_active' },
    )

    expect(repsQuery.eq).toHaveBeenCalledWith('status', 'active')
    expect(repsQuery.or).toHaveBeenCalledWith(broadcastAudienceOrFilter())
    expect(repsQuery.in).not.toHaveBeenCalled()
    expect(result.members.map((member) => member.repId)).toEqual(['customer-kim', 'louis-real'])
    expect(result.count).toBe(2)
    expect(result.members.some((member) => member.repId.startsWith('agent-'))).toBe(false)
  })

  it('rejects an all-demo audience after the customer filter', async () => {
    const repsQuery = makeQuery({
      data: mixedReps.filter((row) => row.id !== 'customer-kim' && row.id !== 'louis-real'),
      error: null,
    })
    await expect(
      resolveWorkspaceMessageAudience({ from: vi.fn(() => repsQuery) } as never, {
        kind: 'all_active',
      }),
    ).rejects.toMatchObject({ code: 'WORKSPACE_MESSAGE_EMPTY_AUDIENCE' })
  })

  it('still delivers an explicitly selected active rep', async () => {
    const repsQuery = makeQuery({
      data: [mixedReps.find((row) => row.id === 'demo-beta')],
      error: null,
    })
    const result = await resolveWorkspaceMessageAudience(
      { from: vi.fn(() => repsQuery) } as never,
      { kind: 'selected', repIds: ['demo-beta'] },
    )
    expect(repsQuery.or).not.toHaveBeenCalled()
    expect(result.members.map((member) => member.repId)).toEqual(['demo-beta'])
  })

  it('classifies recipient rows without a database', () => {
    expect(isBroadcastAudienceRecipient(mixedReps[0])).toBe(true)
    expect(isBroadcastAudienceRecipient(mixedReps[1])).toBe(true)
    expect(isBroadcastAudienceRecipient(mixedReps[2])).toBe(false)
    expect(isBroadcastAudienceRecipient(mixedReps[3])).toBe(false)
    expect(isBroadcastAudienceRecipient(mixedReps[4])).toBe(false)
    for (const row of mixedReps.filter((candidate) => candidate.id.startsWith('agent-'))) {
      expect(isBroadcastAudienceRecipient(row)).toBe(false)
    }
  })
})

describe('similar all-active report audiences', () => {
  beforeEach(() => {
    enqueueOutbox.mockClear()
  })

  it('enqueues monthly reports only for customers and Louis', async () => {
    const repsQuery = makeQuery({ data: mixedReps, error: null })
    const result = await enqueueDueMonthlyReports({
      supabase: { from: vi.fn(() => repsQuery) } as never,
      now: new Date('2026-10-01T13:00:00.000Z'),
    })
    expect(repsQuery.eq).toHaveBeenCalledWith('status', 'active')
    expect(repsQuery.or).toHaveBeenCalledWith(broadcastAudienceOrFilter())
    expect(result.map((row) => row.repId)).toEqual(['customer-kim', 'louis-real'])
    expect(enqueueOutbox).toHaveBeenCalledTimes(2)
  })

  it('enqueues weekly birthday reports only for customers and Louis', async () => {
    const repsQuery = makeQuery({ data: mixedReps, error: null })
    const result = await enqueueDueWeeklyBirthdayReports({
      supabase: { from: vi.fn(() => repsQuery) } as never,
      now: new Date('2026-10-11T12:00:00.000Z'),
    })
    expect(repsQuery.or).toHaveBeenCalledWith(broadcastAudienceOrFilter())
    expect(result.map((row) => row.repId)).toEqual(['customer-kim', 'louis-real'])
    expect(enqueueOutbox).toHaveBeenCalledTimes(2)
  })
})
