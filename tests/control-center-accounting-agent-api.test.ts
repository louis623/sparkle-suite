import { describe, expect, it } from 'vitest'

import type { AccountingMonthlySnapshot } from '@/lib/control-center/accounting'
import {
  buildAccountingAgentSummary,
  matchesAccountingAgentToken,
  parseAccountingAgentProduct,
} from '@/lib/control-center/accounting-agent-api'

const incompleteClientList = {
  monthlyRevenue: 50,
  activeClientCount: 6,
  pastDueClientCount: 0,
  cancelledClientCount: 0,
  pricedActiveClientCount: 1,
  clientsMissingMonthlyAmount: 5,
  clientBilling: [{ clientName: 'One stored price', plan: 'standard', monthlyAmount: 50 }],
}

function laneSnapshot(overrides: Partial<AccountingMonthlySnapshot> = {}): AccountingMonthlySnapshot {
  return {
    product: 'suite',
    periodStart: '2026-09-01',
    periodEndExclusive: '2026-10-01',
    asOf: '2026-09-28T10:00:00.000Z',
    recordedAt: '2026-09-28T10:05:00.000Z',
    reason: 'correction',
    sourceStatus: { stripe: 'connected', bluevine: 'connected', productDb: 'not_connected' },
    activeClientCount: 5,
    pastDueClientCount: 0,
    cancelledClientCount: 1,
    projectedRecurringCents: 21698,
    projectedExpensesCents: null,
    actualCollectedCents: 31696,
    refundsCents: 0,
    creditsCents: null,
    disputesCents: 0,
    pastDueBalanceCents: 0,
    processorAvailableCents: 9682,
    payoutsInTransitCents: 0,
    expensesCents: 28713,
    netCents: 2983,
    ...overrides,
  }
}

describe('accounting agent API contract', () => {
  it('accepts only the two known products and a matching bearer token', () => {
    expect(parseAccountingAgentProduct('suite')).toBe('suite')
    expect(parseAccountingAgentProduct('finder')).toBe('finder')
    expect(parseAccountingAgentProduct('all')).toBeNull()
    expect(matchesAccountingAgentToken('Bearer correct-token', 'correct-token')).toBe(true)
    expect(matchesAccountingAgentToken('Bearer wrong-token', 'correct-token')).toBe(false)
    expect(matchesAccountingAgentToken(null, 'correct-token')).toBe(false)
  })

  it('returns the Lane snapshot and ignores an incomplete client-list rollup', () => {
    const summary = buildAccountingAgentSummary({
      product: 'suite',
      now: new Date('2026-09-28T14:10:00.000Z'),
      snapshot: laneSnapshot(),
      suiteProjection: incompleteClientList,
    })

    expect(summary).toMatchObject({
      schemaVersion: 1,
      product: 'sparkle_suite',
      periodStart: '2026-09-01',
      periodEndExclusive: '2026-10-01',
      asOf: {
        instant: '2026-09-28T10:00:00.000Z',
        timeZone: 'America/New_York',
        readAt: '2026-09-28T14:10:00.000Z',
      },
      access: { mode: 'read_only', customerDetail: 'not_exposed', financialWriteAccess: false },
      ledger: {
        status: 'lane_monthly_snapshot',
        recordedAt: '2026-09-28T10:05:00.000Z',
        reason: 'correction',
      },
      projected: {
        recurringCents: 21698,
        activeClientCount: 5,
        pastDueClientCount: 0,
        cancelledClientCount: 1,
        pricedActiveClientCount: null,
        clientsMissingMonthlyAmount: null,
        source: 'lane_monthly_snapshot',
      },
      actuals: {
        revenueCollectedCents: 31696,
        expensesCents: 28713,
        netCents: 2983,
        processorAvailableCents: 9682,
        sourceStatus: 'lane_monthly_snapshot',
      },
      sourceStatus: { stripe: 'connected', bluevine: 'connected', productDb: 'not_connected' },
      lastReconciledAt: '2026-09-28T10:05:00.000Z',
    })
    expect(JSON.stringify(summary)).not.toContain('5000')
    expect(JSON.stringify(summary)).not.toContain('One stored price')
    expect(summary.projected.recurringCents).not.toBe(5000)
    expect(summary.nextIntegrationRequirements).toEqual([])
  })

  it('stays not connected when the Lane snapshot is missing, even if the client list has a partial total', () => {
    const summary = buildAccountingAgentSummary({
      product: 'suite',
      now: new Date('2026-09-03T17:00:00.000Z'),
      snapshot: null,
      suiteProjection: incompleteClientList,
    })

    expect(summary).toMatchObject({
      product: 'sparkle_suite',
      periodStart: '2026-09-01',
      periodEndExclusive: '2026-10-01',
      ledger: { status: 'missing_snapshot', recordedAt: null, reason: null },
      projected: {
        recurringCents: null,
        activeClientCount: null,
        pricedActiveClientCount: null,
        clientsMissingMonthlyAmount: null,
        source: 'lane_monthly_snapshot_missing',
      },
      actuals: { revenueCollectedCents: null, processorAvailableCents: null, sourceStatus: 'not_connected' },
      sourceStatus: { productDb: 'not_connected', stripe: 'not_connected', bluevine: 'not_connected' },
      lastReconciledAt: null,
    })
    expect(summary.projected.recurringCents).not.toBe(5000)
    expect(JSON.stringify(summary)).not.toContain('One stored price')
  })

  it('uses a Finder Lane snapshot when one exists and does not borrow Suite client-list amounts', () => {
    const present = buildAccountingAgentSummary({
      product: 'finder',
      snapshot: laneSnapshot({ product: 'finder', projectedRecurringCents: 4200, activeClientCount: 2 }),
      suiteProjection: incompleteClientList,
    })
    const absent = buildAccountingAgentSummary({
      product: 'finder',
      suiteProjection: incompleteClientList,
    })

    expect(present.product).toBe('sparkle_finder')
    expect(present.projected.recurringCents).toBe(4200)
    expect(present.projected.activeClientCount).toBe(2)
    expect(present.ledger.status).toBe('lane_monthly_snapshot')
    expect(absent.ledger.status).toBe('missing_snapshot')
    expect(absent.projected.recurringCents).toBeNull()
    expect(absent.projected.source).toBe('lane_monthly_snapshot_missing')
  })
})
