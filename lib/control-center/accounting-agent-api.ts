import { timingSafeEqual } from 'node:crypto'

import type {
  AccountingMonthlySnapshot,
  SparkleSuiteAccountingProjection,
} from '@/lib/control-center/accounting'

export type AccountingAgentProduct = 'suite' | 'finder'

const disconnectedRails = {
  productDb: 'not_connected',
  stripe: 'not_connected',
  bluevine: 'not_connected',
} as const

export function parseAccountingAgentProduct(value: string | null): AccountingAgentProduct | null {
  if (value === 'suite' || value === 'finder') return value
  return null
}

export function matchesAccountingAgentToken(
  authorization: string | null,
  expectedToken: string | undefined,
) {
  const suppliedToken = authorization?.startsWith('Bearer ')
    ? authorization.slice('Bearer '.length)
    : ''
  const token = expectedToken?.trim() ?? ''
  if (!suppliedToken || !token) return false

  const supplied = Buffer.from(suppliedToken)
  const expected = Buffer.from(token)
  return supplied.length === expected.length && timingSafeEqual(supplied, expected)
}

function easternPeriod(now: Date) {
  const easternDate = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now)
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    easternDate.find((entry) => entry.type === type)?.value ?? ''
  const year = part('year')
  const month = part('month')
  const nextMonth = month === '12' ? '01' : String(Number(month) + 1).padStart(2, '0')
  const nextYear = month === '12' ? String(Number(year) + 1) : year
  return {
    periodStart: `${year}-${month}-01`,
    periodEndExclusive: `${nextYear}-${nextMonth}-01`,
  }
}

function emptyMoney(source: string, note: string) {
  return {
    projected: {
      recurringCents: null,
      activeClientCount: null,
      pastDueClientCount: null,
      cancelledClientCount: null,
      pricedActiveClientCount: null,
      clientsMissingMonthlyAmount: null,
      projectedExpensesCents: null,
      source,
    },
    actuals: {
      revenueCollectedCents: null,
      refundsCents: null,
      creditsCents: null,
      disputesCents: null,
      pastDueBalanceCents: null,
      processorAvailableCents: null,
      payoutsInTransitCents: null,
      expensesCents: null,
      netCents: null,
      paymentHistory: 'not_connected',
      sourceStatus: 'not_connected',
      note,
    },
  }
}

function snapshotGaps(snapshot: AccountingMonthlySnapshot) {
  const gaps: string[] = []
  if (snapshot.sourceStatus.stripe !== 'connected') {
    gaps.push('Stripe marked connected on the Lane snapshot before Stripe totals are treated as booked')
  }
  if (snapshot.sourceStatus.bluevine !== 'connected') {
    gaps.push('Bluevine marked connected on the Lane snapshot before expense and net totals are treated as booked')
  }
  return gaps
}

/**
 * Aggregate read for agents and the internal accounting summary.
 * A Lane monthly snapshot is the only money source. The client-list rollup
 * (`suiteProjection`) is accepted so callers can prove it does not fill in
 * or override those figures. Stored subscription prices are not cash.
 */
export function buildAccountingAgentSummary(args: {
  product: AccountingAgentProduct
  snapshot?: AccountingMonthlySnapshot | null
  suiteProjection?: SparkleSuiteAccountingProjection | null
  now?: Date
}) {
  void args.suiteProjection
  const now = args.now ?? new Date()
  const period = easternPeriod(now)
  const snapshot = args.snapshot?.product === args.product ? args.snapshot : null
  const missingNote = 'No Lane monthly snapshot is stored for this Eastern calendar month. Client-list monthly amounts are not used.'
  const snapshotNote = 'These totals are Lane’s latest aggregate monthly snapshot. Stored subscription prices are not cash and are not used here.'
  const money = snapshot
    ? {
        projected: {
          recurringCents: snapshot.projectedRecurringCents,
          activeClientCount: snapshot.activeClientCount,
          pastDueClientCount: snapshot.pastDueClientCount,
          cancelledClientCount: snapshot.cancelledClientCount,
          pricedActiveClientCount: null,
          clientsMissingMonthlyAmount: null,
          projectedExpensesCents: snapshot.projectedExpensesCents,
          source: 'lane_monthly_snapshot',
        },
        actuals: {
          revenueCollectedCents: snapshot.actualCollectedCents,
          refundsCents: snapshot.refundsCents,
          creditsCents: snapshot.creditsCents,
          disputesCents: snapshot.disputesCents,
          pastDueBalanceCents: snapshot.pastDueBalanceCents,
          processorAvailableCents: snapshot.processorAvailableCents,
          payoutsInTransitCents: snapshot.payoutsInTransitCents,
          expensesCents: snapshot.expensesCents,
          netCents: snapshot.netCents,
          paymentHistory: 'lane_monthly_snapshot',
          sourceStatus: 'lane_monthly_snapshot',
          note: snapshotNote,
        },
      }
    : emptyMoney('lane_monthly_snapshot_missing', missingNote)

  return {
    schemaVersion: 1,
    product: args.product === 'suite' ? 'sparkle_suite' : 'sparkle_finder',
    periodStart: snapshot?.periodStart ?? period.periodStart,
    periodEndExclusive: snapshot?.periodEndExclusive ?? period.periodEndExclusive,
    asOf: {
      instant: snapshot?.asOf ?? now.toISOString(),
      timeZone: 'America/New_York',
      readAt: now.toISOString(),
    },
    access: {
      mode: 'read_only',
      customerDetail: 'not_exposed',
      financialWriteAccess: false,
    },
    ledger: {
      status: snapshot ? 'lane_monthly_snapshot' : 'missing_snapshot',
      recordedAt: snapshot?.recordedAt ?? null,
      reason: snapshot?.reason ?? null,
    },
    projected: money.projected,
    actuals: money.actuals,
    sourceStatus: snapshot
      ? { ...snapshot.sourceStatus }
      : { ...disconnectedRails },
    lastReconciledAt: snapshot?.recordedAt ?? null,
    nextIntegrationRequirements: snapshot
      ? snapshotGaps(snapshot)
      : ['Lane monthly snapshot for the current Eastern calendar month'],
  }
}
