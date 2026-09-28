import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { AccountingDashboard } from '@/app/control-center/_components/AccountingDashboard'

describe('Control Center accounting foundations', () => {
  it('does not treat an incomplete client list as Suite projected revenue when Lane has no snapshot', () => {
    const html = renderToStaticMarkup(createElement(AccountingDashboard, {
      product: 'suite',
      suiteProjection: {
        monthlyRevenue: 98,
        activeClientCount: 2,
        pastDueClientCount: 0,
        cancelledClientCount: 0,
        pricedActiveClientCount: 2,
        clientsMissingMonthlyAmount: 0,
        clientBilling: [{ clientName: 'Jane Roberts', plan: 'founder', monthlyAmount: 49 }],
      },
    }))
    expect(html).toContain('Sparkle Suite')
    expect(html).toContain('Projected monthly revenue')
    expect(html).toContain('Missing snapshot')
    expect(html).not.toContain('$98.00')
    expect(html).not.toContain('From client list')
    expect(html).toContain('Actual revenue collected')
    expect(html).toContain('Actual expenses paid')
    expect(html).toContain('Customer billing and payment history')
    expect(html).toContain('Profile check only')
    expect(html).toContain('Jane Roberts')
    expect(html).toContain('Expense ledger')
    expect(html).toContain('Not connected')
    expect(html).toContain('bg-amber-50')
  })

  it('keeps the Lane snapshot total when the client list would under-report', () => {
    const html = renderToStaticMarkup(createElement(AccountingDashboard, {
      product: 'suite',
      suiteProjection: {
        monthlyRevenue: 50,
        activeClientCount: 6,
        pastDueClientCount: 0,
        cancelledClientCount: 0,
        pricedActiveClientCount: 1,
        clientsMissingMonthlyAmount: 5,
        clientBilling: [{ clientName: 'Stored price only', plan: 'standard', monthlyAmount: 50 }],
      },
      snapshot: {
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
      },
    }))
    expect(html).toContain('Lane’s latest reconciled expected recurring revenue')
    expect(html).toContain('$216.98')
    expect(html).toContain('$316.96')
    expect(html).toContain('Lane verified')
    expect(html).not.toContain('From client list')
    expect(html).not.toContain('Missing snapshot')
    expect(html).toContain('That list is not the monthly books.')
    expect(html).toContain('Stored price only')
  })

  it('keeps Sparkle Finder accounting independent', () => {
    const html = renderToStaticMarkup(createElement(AccountingDashboard, { product: 'finder' }))
    expect(html).toContain('Sparkle Finder')
    expect(html).toContain('Back to Sparkle Finder Control Center')
    expect(html).toContain('href="/control-center?product=finder"')
    expect(html).toContain('href="/control-center/accounting"')
  })

  it('shows Lane-supplied projected expenses and reconciliation totals without making a page editor', () => {
    const html = renderToStaticMarkup(createElement(AccountingDashboard, {
      product: 'finder',
      snapshot: {
        product: 'finder',
        periodStart: '2026-09-01',
        periodEndExclusive: '2026-10-01',
        asOf: '2026-09-03T12:00:00.000Z',
        recordedAt: '2026-09-03T12:01:00.000Z',
        reason: 'initial',
        sourceStatus: { stripe: 'connected', bluevine: 'connected', productDb: 'not_connected' },
        activeClientCount: 3,
        pastDueClientCount: 1,
        cancelledClientCount: 0,
        projectedRecurringCents: 12799,
        projectedExpensesCents: 6,
        actualCollectedCents: 9998,
        refundsCents: 0,
        creditsCents: null,
        disputesCents: 0,
        pastDueBalanceCents: 1000,
        processorAvailableCents: 8000,
        payoutsInTransitCents: 3000,
        expensesCents: 1800,
        netCents: 9200,
      },
    }))
    expect(html).toContain('Projected monthly expenses')
    expect(html).toContain('Lane’s latest reconciled expected recurring revenue')
    expect(html).toContain('$127.99')
    expect(html).toContain('$0.06')
    expect(html).toContain('$99.98')
    expect(html).toContain('>Refunds</dt><dd class="mt-1 text-lg font-semibold">$0.00</dd>')
    expect(html).toContain('>Credits</dt><dd class="mt-1 text-lg font-semibold">—</dd>')
    expect(html).toContain('Payouts in transit')
    expect(html).not.toContain('<input')
    expect(html).not.toContain('<textarea')
  })

  it('formats a cents snapshot identically for Suite and Finder', () => {
    const snapshot = {
      product: 'suite' as const,
      periodStart: '2026-09-01', periodEndExclusive: '2026-10-01', asOf: '2026-09-03T12:00:00.000Z', recordedAt: '2026-09-03T12:01:00.000Z', reason: 'initial' as const,
      sourceStatus: { stripe: 'connected' as const, bluevine: 'connected' as const, productDb: 'not_connected' as const },
      activeClientCount: null, pastDueClientCount: null, cancelledClientCount: null,
      projectedRecurringCents: 12799, projectedExpensesCents: null, actualCollectedCents: null,
      refundsCents: null, creditsCents: null, disputesCents: null, pastDueBalanceCents: null,
      processorAvailableCents: null, payoutsInTransitCents: null, expensesCents: null, netCents: null,
    }
    const suite = renderToStaticMarkup(createElement(AccountingDashboard, { product: 'suite', snapshot }))
    const finder = renderToStaticMarkup(createElement(AccountingDashboard, { product: 'finder', snapshot: { ...snapshot, product: 'finder' } }))
    expect(suite).toContain('$127.99')
    expect(finder).toContain('$127.99')
  })
})
