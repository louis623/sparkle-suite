import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it, vi } from 'vitest'

import {
  activatePendingWorkspaceTrial,
  resolveWorkspaceAccess,
  WORKSPACE_TRIAL_DAYS,
} from '@/lib/services/workspace-access'

const MIGRATION =
  'supabase/migrations/20260802160000_ss_operator_workspace_trials.sql'

function queryResult(data: unknown, error: unknown = null) {
  const query = {
    select: vi.fn(() => query),
    eq: vi.fn(() => query),
    order: vi.fn(() => query),
    limit: vi.fn(() => query),
    maybeSingle: vi.fn(async () => ({ data, error })),
  }
  return query
}

function trialRow(
  overrides: Partial<Record<string, unknown>> = {},
): Record<string, unknown> {
  return {
    id: 'trial-1',
    rep_id: 'rep-1',
    status: 'active',
    duration_days: 5,
    provisioned_by_rep_id: 'rep-operator',
    launch_build_id: 'launch-1',
    provisioned_at: '2026-08-02T12:00:00.000Z',
    first_signed_in_at: '2026-08-02T13:00:00.000Z',
    expires_at: '2026-08-07T13:00:00.000Z',
    revoked_at: null,
    ...overrides,
  }
}

function accessClient(args: {
  subscription?: Record<string, unknown> | null
  subscriptionError?: unknown
  trial?: Record<string, unknown> | null
  trialError?: unknown
}) {
  const subscription = queryResult(
    args.subscription ?? null,
    args.subscriptionError ?? null,
  )
  const trial = queryResult(args.trial ?? null, args.trialError ?? null)
  const client = {
    from: vi.fn((table: string) => {
      if (table === 'subscriptions') return subscription
      if (table === 'workspace_trials') return trial
      throw new Error(`unexpected table: ${table}`)
    }),
  }
  return { client, subscription, trial }
}

describe('workspace trial migration', () => {
  const sql = readFileSync(join(process.cwd(), MIGRATION), 'utf8')

  it('defines a separate audited five-day trial lifecycle', () => {
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS workspace_trials')
    expect(sql).toContain("CHECK (status IN ('pending', 'active', 'revoked'))")
    expect(sql).toContain('CHECK (duration_days = 5)')
    expect(sql).toContain(
      'provisioned_by_rep_id UUID REFERENCES reps(id) ON DELETE SET NULL',
    )
    expect(sql).toContain(
      'launch_build_id UUID REFERENCES sparkle_suite_launch_builds(id) ON DELETE SET NULL',
    )
    expect(sql).toContain("expires_at = first_signed_in_at + interval '5 days'")
  })

  it('provides own-read and operator-admin RLS without direct rep writes', () => {
    expect(sql).toContain('ALTER TABLE workspace_trials ENABLE ROW LEVEL SECURITY')
    expect(sql).toContain('CREATE POLICY "workspace_trials_own_read"')
    expect(sql).toContain('CREATE POLICY "workspace_trials_operator_admin"')
    expect(sql).toContain("AND email = 'louis@neonrabbit.net'")
    expect(sql).toContain('GRANT SELECT ON workspace_trials TO authenticated')
    expect(sql).not.toContain(
      'GRANT SELECT, INSERT, UPDATE, DELETE ON workspace_trials TO authenticated',
    )
  })

  it('activates once using database time and returns the existing row thereafter', () => {
    expect(sql).toContain(
      'CREATE OR REPLACE FUNCTION activate_workspace_trial(p_rep_id UUID)',
    )
    expect(sql).toContain("AND status = 'pending'")
    expect(sql).toContain('first_signed_in_at = v_activated_at')
    expect(sql).toContain(
      "expires_at = v_activated_at + interval '5 days'",
    )
    expect(sql).toMatch(
      /IF FOUND THEN\s+RETURN;\s+END IF;\s+RETURN QUERY\s+SELECT \*/,
    )
    expect(sql).toContain("auth.role() <> 'service_role'")
    expect(sql).toContain('AND auth_user_id = auth.uid()')
  })
})

describe('workspace access service', () => {
  it('uses the atomic activation RPC and maps its audit fields', async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: [trialRow()],
      error: null,
    })

    const result = await activatePendingWorkspaceTrial({
      supabase: { rpc } as never,
      repId: 'rep-1',
    })

    expect(rpc).toHaveBeenCalledWith('activate_workspace_trial', {
      p_rep_id: 'rep-1',
    })
    expect(result).toEqual(
      expect.objectContaining({
        repId: 'rep-1',
        durationDays: WORKSPACE_TRIAL_DAYS,
        provisionedByRepId: 'rep-operator',
        launchBuildId: 'launch-1',
        firstSignedInAt: '2026-08-02T13:00:00.000Z',
        expiresAt: '2026-08-07T13:00:00.000Z',
      }),
    )
  })

  it.each(['active', 'trialing'])(
    'grants access for an existing %s subscription, including internal-demo active rows',
    async (status) => {
      const { client } = accessClient({ subscription: { status } })

      await expect(
        resolveWorkspaceAccess({
          supabase: client as never,
          repId: 'rep-1',
        }),
      ).resolves.toEqual(
        expect.objectContaining({
          hasFullAccess: true,
          source: 'subscription',
          subscriptionStatus: status,
        }),
      )
    },
  )

  it.each(['past_due', 'paused', 'cancelled'])(
    'denies %s subscriptions even when a trial row is still unexpired',
    async (status) => {
      const { client } = accessClient({
        subscription: { status },
        trial: trialRow(),
      })

      await expect(
        resolveWorkspaceAccess({
          supabase: client as never,
          repId: 'rep-1',
          now: new Date('2026-08-03T12:00:00.000Z'),
        }),
      ).resolves.toEqual(
        expect.objectContaining({
          hasFullAccess: false,
          status: `subscription_${status}`,
          subscriptionStatus: status,
        }),
      )
    },
  )

  it('does not open the workspace from a stored trial row', async () => {
    const { client, trial } = accessClient({ trial: trialRow() })

    await expect(
      resolveWorkspaceAccess({
        supabase: client as never,
        repId: 'rep-1',
        now: new Date('2026-08-03T12:00:00.000Z'),
      }),
    ).resolves.toEqual(
      expect.objectContaining({
        hasFullAccess: false,
        source: 'none',
        status: 'no_entitlement',
      }),
    )
    expect(trial.maybeSingle).not.toHaveBeenCalled()
  })

  it('fails closed when a subscription lookup fails', async () => {
    const { client } = accessClient({
      subscriptionError: { message: 'database unavailable' },
    })

    await expect(
      resolveWorkspaceAccess({
        supabase: client as never,
        repId: 'rep-1',
      }),
    ).rejects.toMatchObject({
      code: 'WORKSPACE_ACCESS_LOOKUP_FAILED',
      statusCode: 500,
    })
  })
})
