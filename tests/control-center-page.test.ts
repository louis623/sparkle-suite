import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const getControlCenterAccessMock = vi.fn()
const createAdminClientMock = vi.fn()
const listOperatorSupportReportsMock = vi.fn()
const listOperatorCustomerProfilesMock = vi.fn()
const listOperatorOnboardingChecklistsMock = vi.fn()
const loadCustomerWaitlistMock = vi.fn()
const loadBugHuntItemsMock = vi.fn()
const loadSparkleFinderAppearanceSettingMock = vi.fn()
const loadCurrentAccountingSnapshotMock = vi.fn()
const redirectMock = vi.fn((target: string) => {
  throw new Error(`redirect:${target}`)
})

const { MockAuthError, MockOperatorAuthError } = vi.hoisted(() => ({
  MockAuthError: class MockAuthError extends Error {},
  MockOperatorAuthError: class MockOperatorAuthError extends Error {},
}))

vi.mock('next/navigation', () => ({
  redirect: (target: string) => redirectMock(target),
}))

vi.mock('@/lib/supabase/operator-auth', () => ({
  AuthError: MockAuthError,
  OperatorAuthError: MockOperatorAuthError,
  getControlCenterAccess: (...args: unknown[]) =>
    getControlCenterAccessMock(...args),
}))

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: (...args: unknown[]) => createAdminClientMock(...args),
}))

vi.mock('@/lib/services/support-reports', () => ({
  listOperatorSupportReports: (...args: unknown[]) =>
    listOperatorSupportReportsMock(...args),
}))

vi.mock('@/lib/services/client-account-profiles', () => ({
  listOperatorCustomerProfiles: (...args: unknown[]) =>
    listOperatorCustomerProfilesMock(...args),
}))

vi.mock('@/lib/services/operator-onboarding-checklists', () => ({
  listOperatorOnboardingChecklists: (...args: unknown[]) =>
    listOperatorOnboardingChecklistsMock(...args),
}))

vi.mock('@/lib/prelaunch/customer-waitlist', () => ({
  loadCustomerWaitlist: (...args: unknown[]) => loadCustomerWaitlistMock(...args),
}))

vi.mock('@/lib/control-center/bug-hunt', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/control-center/bug-hunt')>()),
  loadBugHuntItems: (...args: unknown[]) => loadBugHuntItemsMock(...args),
}))

vi.mock('@/lib/sparkle-finder/appearance', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/sparkle-finder/appearance')>()),
  loadSparkleFinderAppearanceSetting: (...args: unknown[]) =>
    loadSparkleFinderAppearanceSettingMock(...args),
}))

vi.mock('@/lib/control-center/accounting', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/control-center/accounting')>()),
  loadCurrentAccountingSnapshot: (...args: unknown[]) =>
    loadCurrentAccountingSnapshotMock(...args),
}))

vi.mock(
  '@/app/internal/prelaunch/intake/_components/ControlCenterThemeToggle',
  () => ({
    ControlCenterThemeToggle: () => createElement('div', null, 'Theme toggle'),
  }),
)

import SparkleSuiteControlCenterPage from '@/app/control-center/page'

function customerProfile(overrides: Record<string, unknown> = {}) {
  const billing =
    typeof overrides.billing === 'object' && overrides.billing !== null
      ? (overrides.billing as Record<string, unknown>)
      : {}

  return {
    repId: 'rep-default',
    accountClassification: 'customer',
    clientName: 'Default Rep',
    showName: 'Default Show',
    primaryContactName: 'Default Rep',
    email: 'default@example.com',
    phone: '555-000-0000',
    referral: {
      code: null,
      usageCount: 0,
    },
    accountStatus: 'active',
    subscriptionStatus: 'active',
    supportTier: 'founder',
    publicSiteSlug: 'defaultshow',
    customDomain: null,
    shopLink: null,
    streamingLinks: {},
    socialHandles: {},
    liveQueueSyncCode: null,
    internalNotes: null,
    setupStatus: 'dashboard_unlocked',
    setupCurrentStep: 'final_preview_approval',
    billing: {
      status: 'active',
      planTier: 'monthly',
      pricingTier: 'founder',
      monthlyAmount: 49,
      currentPeriodEnd: null,
      stripeCustomerId: null,
      ...billing,
    },
    ...overrides,
  }
}

describe('SparkleSuiteControlCenterPage', () => {
  beforeEach(() => {
    getControlCenterAccessMock.mockReset()
    createAdminClientMock.mockReset()
    listOperatorSupportReportsMock.mockReset()
    listOperatorCustomerProfilesMock.mockReset()
    listOperatorOnboardingChecklistsMock.mockReset()
    loadCustomerWaitlistMock.mockReset()
    loadBugHuntItemsMock.mockReset()
    loadSparkleFinderAppearanceSettingMock.mockReset()
    loadCurrentAccountingSnapshotMock.mockReset()
    redirectMock.mockClear()
    getControlCenterAccessMock.mockResolvedValue({
      method: 'control_center_session',
      operator: { repId: 'operator-1' },
    })
    createAdminClientMock.mockReturnValue({ from: vi.fn() })
    loadCustomerWaitlistMock.mockResolvedValue([])
    loadBugHuntItemsMock.mockResolvedValue([])
    loadSparkleFinderAppearanceSettingMock.mockResolvedValue({
      schemaVersion: 1,
      preset: 'amethyst',
      label: 'Amethyst',
      description: 'The default high-sparkle Amethyst look.',
      tokens: {},
    })
    listOperatorSupportReportsMock.mockResolvedValue([
      {
        id: 'report-1',
        report_type: 'bug',
        urgency: 'blocking',
        status: 'open',
        audit_status: 'completed',
        source: 'help_form',
        title: 'Dance Floor item vanished',
        page_or_workflow: 'Dance Floor',
        details: 'The replacement listing did not show after approval.',
        client_snapshot: {
          clientName: 'Jane Roberts',
          showName: "Jane's Sparkle Party",
          phone: '555-123-4567',
          email: 'jane@example.com',
        },
        created_at: '2026-06-12T17:00:00.000Z',
      },
    ])
    listOperatorCustomerProfilesMock.mockResolvedValue([
      {
        repId: 'rep-1',
        accountClassification: 'customer',
        clientName: 'Jane Roberts',
        showName: "Jane's Sparkle Party",
        primaryContactName: 'Jane Roberts',
        email: 'jane@example.com',
        phone: '555-123-4567',
        referral: {
          code: 'SS-JANE12',
          usageCount: 3,
        },
        accountStatus: 'active',
        subscriptionStatus: 'active',
        supportTier: 'founder',
        publicSiteSlug: 'janesparkleparty',
        customDomain: 'jane.example',
        shopLink: 'https://shop.example/jane',
        streamingLinks: { tiktok: 'https://www.tiktok.com/@janesparkle' },
        socialHandles: { instagram: '@janesparkle' },
        liveQueueSyncCode: 'JSP-1234',
        internalNotes: 'Prefers text for urgent billing questions.',
        setupStatus: 'dashboard_unlocked',
        setupCurrentStep: 'final_preview_approval',
        billing: {
          status: 'active',
          planTier: 'monthly',
          pricingTier: 'founder',
          monthlyAmount: 49,
          currentPeriodEnd: '2026-07-12T17:00:00.000Z',
          stripeCustomerId: 'cus_123',
        },
      },
    ])
    listOperatorOnboardingChecklistsMock.mockResolvedValue({})
    loadCurrentAccountingSnapshotMock.mockResolvedValue({
      product: 'suite',
      periodStart: '2026-09-01',
      periodEndExclusive: '2026-10-01',
      asOf: '2026-09-03T12:00:00.000Z',
      recordedAt: '2026-09-03T12:01:00.000Z',
      reason: 'initial',
      sourceStatus: { stripe: 'connected', bluevine: 'connected', productDb: 'connected' },
      activeClientCount: 1,
      pastDueClientCount: 0,
      cancelledClientCount: 0,
      projectedRecurringCents: 12799,
      projectedExpensesCents: null,
      actualCollectedCents: 9998,
      refundsCents: null,
      creditsCents: null,
      disputesCents: null,
      pastDueBalanceCents: null,
      processorAvailableCents: null,
      payoutsInTransitCents: null,
      expensesCents: 1800,
      netCents: null,
    })
  })

  it('renders the Sparkle Suite Control Center with support and customer database sections', async () => {
    const page = await SparkleSuiteControlCenterPage({})
    const html = renderToStaticMarkup(page)

    expect(redirectMock).not.toHaveBeenCalled()
    expect(getControlCenterAccessMock).toHaveBeenCalledOnce()
    expect(listOperatorSupportReportsMock).toHaveBeenCalledWith(
      { from: expect.any(Function) },
      { limit: 50 },
    )
    expect(listOperatorCustomerProfilesMock).toHaveBeenCalledWith(
      { from: expect.any(Function) },
      { limit: 200 },
    )
    expect(listOperatorOnboardingChecklistsMock).toHaveBeenCalledWith(
      { from: expect.any(Function) },
      ['rep-1'],
    )
    expect(loadCurrentAccountingSnapshotMock).toHaveBeenCalledWith(
      { from: expect.any(Function) },
      'suite',
    )
    expect(html).toContain('Sparkle Suite Control Center')
    expect(html).toContain('href="/control-center?product=suite"')
    expect(html).toContain('href="/control-center?product=finder"')
    expect(html).not.toContain('Support Command Center')
    expect(html).toContain('Control Center Options')
    expect(html).toContain('href="/control-center/messages"')
    expect(html).toContain('Messages')
    expect(html).toContain('href="/control-center/resources"')
    expect(html).toContain('Resources')
    expect(html).toContain('href="/control-center/accounting"')
    expect(html).toContain('Accounting')
    expect(html).toContain('Projected monthly revenue')
    expect(html).toContain('$127.99')
    expect(html).toContain('Lane’s latest reconciled expected recurring revenue')
    expect(html).toContain('Actual revenue collected')
    expect(html).toContain('$99.98')
    expect(html).toContain('Actual expenses paid')
    expect(html).toContain('$18.00')
    expect(html).toContain('Lane’s latest reconciled monthly total')
    expect(html).toContain('Publisher')
    expect(html).toContain('Support Inbox')
    expect(html).toContain('Customer Database')
    expect(html).toContain('Support conversations')
    expect(html).toContain('Open Support Inbox')
    expect(html).toContain('Jane Roberts')
    expect(html).toContain("Jane&#x27;s Sparkle Party")
    expect(html).toContain("Jane&#x27;s Sparkle Party (Jane)")
    expect(html).toContain('Onboarding checklist incomplete')
    expect(html).toContain('bg-amber-50/70')
    expect(html).toContain('Founder')
    expect(html).toContain('Phone')
    expect(html).toContain('555-123-4567')
    expect(html).toContain('Promo code')
    expect(html).toContain('SS-JANE12')
    expect(html).toContain('Promo uses')
    expect(html).toContain('3')
    expect(html).toContain('Live Queue code')
    expect(html).toContain('JSP-1234')
    expect(html).toContain('jane.example')
    expect(html).toContain('Prefers text for urgent billing questions.')
    expect(html).toContain('aria-label="Expand Jane Roberts profile"')
    expect(html).toContain('Onboarding checklist')
    expect(html).toContain('Get what you need for their About page')
  })

  it('does not substitute the customer-list total when Lane has no current Suite snapshot', async () => {
    loadCurrentAccountingSnapshotMock.mockResolvedValueOnce(null)

    const page = await SparkleSuiteControlCenterPage({})
    const html = renderToStaticMarkup(page)

    expect(html).toContain('Projected monthly revenue')
    expect(html).toContain('Not connected yet')
    expect(html).not.toContain('From 1 active client with a recurring amount')
  })

  it('switches to Sparkle Finder controls with the shared skin options', async () => {
    const page = await SparkleSuiteControlCenterPage({
      searchParams: Promise.resolve({ product: 'finder' }),
    })
    const html = renderToStaticMarkup(page)

    expect(html).toContain('Sparkle Finder Control Center')
    expect(html).toContain('Sparkle Finder appearance')
    expect(html).toContain('Amethyst')
    expect(html).toContain('Moonstone')
    expect(html).toContain('Rose Quartz')
    expect(html).toContain('value="amethyst"')
    expect(html).toContain('data-selected="true"')
  })

  it('uses durable classification for four active customers and keeps demo accounts separate', async () => {
    listOperatorCustomerProfilesMock.mockResolvedValueOnce([
      customerProfile({
        repId: 'rep-mile-high-fizz',
        accountClassification: 'customer',
        clientName: 'Lindsey',
        showName: 'Mile High Fizz',
        publicSiteSlug: 'milehighfizz',
      }),
      customerProfile({
        repId: 'rep-britt-with-bling',
        accountClassification: 'customer',
        clientName: 'Brittany',
        showName: 'Britt With Bling',
        publicSiteSlug: 'brittwithbling',
      }),
      customerProfile({
        repId: 'rep-blingkitchen',
        accountClassification: 'customer',
        clientName: 'Heather',
        showName: 'BlingKitchen',
        publicSiteSlug: 'blingkitchen',
      }),
      customerProfile({
        repId: 'rep-kim',
        accountClassification: 'customer',
        clientName: 'Kim Goforth',
        showName: 'Kim Goforth',
        publicSiteSlug: null,
        subscriptionStatus: null,
        setupCurrentStep: 'account_basics',
      }),
      customerProfile({
        repId: 'rep-demo',
        accountClassification: 'demo',
        clientName: 'Demo Sparkle Rep',
        showName: 'Demo Sparkle Show',
        publicSiteSlug: 'demo-sparkle-show',
      }),
    ])

    const page = await SparkleSuiteControlCenterPage({})
    const html = renderToStaticMarkup(page)

    expect(html).toContain('href="#customer-database"')
    expect(html).toContain('href="#demo-database"')
    expect(html).toContain('href="/control-center/lab"')
    expect(html).toContain('Sparkle Lab')
    expect(html).toContain('Customer Database')
    expect(html).toContain('Demo Database')
    expect(html).toContain('aria-label="Expand Customer Database"')
    expect(html).toContain('aria-label="Expand Demo Database"')
    expect(html).not.toContain('open=""')
    expect(html).toContain('4 customer accounts')
    expect(html).toContain('1 demo account')
    expect(html).toContain('Mile High Fizz')
    expect(html).toContain('Britt With Bling')
    expect(html).toContain('BlingKitchen')
    expect(html).toContain('Kim Goforth')
    expect(html).toContain('Demo Sparkle Rep')
    expect(html).toContain('Demo Sparkle Show')
    expect(html).toContain('Demo Account')
  })

  it('redirects unauthenticated operators to login', async () => {
    getControlCenterAccessMock.mockRejectedValueOnce(
      new MockAuthError('missing session'),
    )

    await expect(SparkleSuiteControlCenterPage({})).rejects.toThrow(
      'redirect:/control-center/login',
    )

    expect(listOperatorSupportReportsMock).not.toHaveBeenCalled()
    expect(listOperatorCustomerProfilesMock).not.toHaveBeenCalled()
  })

  it('renders an operator access required message for non-operators', async () => {
    getControlCenterAccessMock.mockRejectedValueOnce(
      new MockOperatorAuthError('not operator'),
    )

    const page = await SparkleSuiteControlCenterPage({})
    const html = renderToStaticMarkup(page)

    expect(html).toContain('Operator access required')
    expect(listOperatorSupportReportsMock).not.toHaveBeenCalled()
    expect(listOperatorCustomerProfilesMock).not.toHaveBeenCalled()
  })
})
