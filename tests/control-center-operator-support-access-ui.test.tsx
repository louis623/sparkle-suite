import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'

import {
  buildOperatorPublicSiteHref,
  createOperatorSupportSession,
  normalizeSupportWorkspaceUrl,
  OperatorSupportAccessPanel,
  requestTargetSupportSessions,
  selectTargetSupportSessions,
} from '@/app/control-center/_components/OperatorSupportAccessPanel'
import {
  OperatorSupportHistory,
  type OperatorSupportSession,
} from '@/app/control-center/_components/OperatorSupportHistory'
import {
  createStartOperatorSupportBody,
  OperatorSupportStartDialog,
} from '@/app/control-center/_components/OperatorSupportStartDialog'
import { SupportCommandCenter } from '@/app/control-center/_components/SupportCommandCenter'
import { DashboardPlaceholder } from '@/app/nic-nac/components/DashboardPlaceholder'

const session: OperatorSupportSession = {
  id: 'session-1',
  targetRepId: 'rep-1',
  operatorDisplayName: 'Louis',
  targetRepDisplayName: 'Kim',
  reasonCode: 'account_setup',
  reasonNote: 'Help with the initial customer-site setup.',
  status: 'ended',
  createdAt: '2026-08-29T13:00:00.000Z',
  startedAt: '2026-08-29T13:01:00.000Z',
  endedAt: '2026-08-29T13:30:00.000Z',
  changedAnything: true,
}

describe('Control Center transparent operator support access UI', () => {
  it('renders the rep Workspace home and header tools during support access', () => {
    const html = renderToStaticMarkup(
      <DashboardPlaceholder
        operatorSupportMode
        repIdOverride="rep-1"
        publicSiteSlugOverride="kim-sparkles"
      />,
    )

    expect(html).toContain('Nic-Nac')
    expect(html).toContain('Open Trade Workspace')
    expect(html).toContain('Visit resources')
    expect(html).toContain('>Live Queue code<')
    expect(html).toContain('>Messages<')
    expect(html).toContain('>Log out<')
    expect(html).toContain('Sign-in changes are disabled during support access.')
    expect(html).not.toContain('Support Workspace')
    expect(html).not.toContain('Customer List (read only)')
  })

  it('keeps support mode as a narrow restriction flag, not an alternate Workspace', () => {
    const clientSource = readFileSync('app/nic-nac/_client.tsx', 'utf8')
    const dashboardSource = readFileSync(
      'app/nic-nac/components/DashboardPlaceholder.tsx',
      'utf8',
    )
    const supportClientSource = readFileSync(
      'app/control-center/support/[sessionId]/SupportWorkspaceClient.tsx',
      'utf8',
    )

    expect(clientSource).toContain('operatorSupportMode={isOperatorSupport}')
    expect(clientSource).toContain('workspaceRoutePath')
    expect(clientSource).not.toMatch(/if \(operatorSupport\) \{\s*return \(/)
    expect(dashboardSource).toContain("const showConceptHome = activeSection === 'home'")
    expect(dashboardSource).not.toContain('OperatorSupportOverviewCard')
    expect(dashboardSource).not.toContain('OperatorSupportUnavailableCard')
    expect(dashboardSource).not.toContain('readOnly={operatorSupportMode}')
    expect(dashboardSource).toContain('<AccountSecurityCard mutationsDisabled={operatorSupportMode} />')
    expect(dashboardSource).toContain('mutationsDisabled={operatorSupportMode}')
    expect(dashboardSource).toContain('downloadCustomerExport')
    expect(dashboardSource).toContain("fetch('/api/nic-nac/customer-audience?format=csv'")
    expect(supportClientSource).not.toContain('customerReadUrl')
  })

  it('keeps support mode operator-controlled and removes the rerendering expiry clock', () => {
    const clientSource = readFileSync('app/nic-nac/_client.tsx', 'utf8')
    const supportClientSource = readFileSync(
      'app/control-center/support/[sessionId]/SupportWorkspaceClient.tsx',
      'utf8',
    )

    expect(supportClientSource).toContain('const operatorSupportContext = useMemo(')
    expect(supportClientSource).toContain(
      'operatorSupport={operatorSupportContext}',
    )
    expect(supportClientSource).toContain('liveLineupReadOnly={liveLineupReadOnly}')
    expect(clientSource).toContain(
      'const operatorSupportSessionId = operatorSupport?.sessionId ?? null',
    )
    expect(clientSource).toContain('operatorSupportSessionId,')
    expect(clientSource).not.toContain('    operatorSupport,')
    expect(supportClientSource).toContain(
      'Access stays open until you choose End support access.',
    )
    expect(supportClientSource).not.toContain('setInterval')
    expect(supportClientSource).not.toContain('Support access has expired')
    expect(supportClientSource).not.toContain('expiresAt')
  })

  it('places the rep support-access history after all Account tools', () => {
    const dashboardSource = readFileSync(
      'app/nic-nac/components/DashboardPlaceholder.tsx',
      'utf8',
    )
    const accountSection = dashboardSource.slice(
      dashboardSource.indexOf("if (activeSection === 'account')"),
      dashboardSource.indexOf('    return null', dashboardSource.indexOf("if (activeSection === 'account')")),
    )

    expect(accountSection.indexOf('<SupportAccessHistoryCard />')).toBeGreaterThan(
      accountSection.indexOf('<AccountSecurityCard mutationsDisabled={operatorSupportMode} />'),
    )
    expect(accountSection.indexOf('<SupportAccessHistoryCard />')).toBeGreaterThan(
      accountSection.indexOf('<SiteAnalyticsCard state={analyticsState} />'),
    )
  })

  it('keeps every rep tool discoverable from More during support access', () => {
    const html = renderToStaticMarkup(
      <DashboardPlaceholder
        initialSectionOverride="more"
        operatorSupportMode
        repIdOverride="rep-1"
        publicSiteSlugOverride="kim-sparkles"
      />,
    )

    expect(html).toContain('Message Center')
    expect(html).toContain('Resources &amp; Help')
    expect(html).toContain('Live Queue')
    expect(html).toContain('Account')
    expect(html).toContain('Customer List')
  })

  it('shows support access inside every expanded customer profile', () => {
    const html = renderToStaticMarkup(
      createElement(SupportCommandCenter, {
        customers: [
          {
            repId: 'rep-1',
            accountClassification: 'customer',
            clientName: 'Kim Sparkles',
            showName: 'Kim Live',
            primaryContactName: 'Kim',
            email: 'kim@example.com',
            phone: null,
            referral: { code: null, usageCount: 0 },
            accountStatus: 'active',
            subscriptionStatus: 'active',
            supportTier: 'standard',
            publicSiteSlug: 'kim-sparkles',
            customDomain: null,
            shopLink: null,
            streamingLinks: {},
            socialHandles: {},
            internalNotes: null,
            setupStatus: 'dashboard_unlocked',
            setupCurrentStep: null,
            billing: {
              status: 'active',
              planTier: 'suite',
              pricingTier: null,
              monthlyAmount: null,
              currentPeriodEnd: null,
              stripeCustomerId: null,
            },
          },
        ],
        reports: [],
        waitlist: [],
        bugHuntItems: [],
      }),
    )

    expect(html).toContain('Transparent support access')
    expect(html).toContain('Open Workspace as Support')
    expect(html).toContain('Open customer site')
    expect(html).toContain('href="/kim-sparkles"')
    expect(html).toContain('Checking secure access history')
    expect(html).toContain('stays active until you end it')
    expect(html).not.toContain('time-limited')
  })

  it('describes an active session as open until the operator ends it', () => {
    const html = renderToStaticMarkup(
      createElement(OperatorSupportHistory, {
        sessions: [{ ...session, status: 'active', endedAt: null }],
      }),
    )

    expect(html).toContain('Open until you end support access')
    expect(html).not.toContain('>Expires<')
  })

  it('freezes the exact rep and discloses accountability before starting', () => {
    const html = renderToStaticMarkup(
      createElement(OperatorSupportStartDialog, {
        open: true,
        repDisplayName: 'Kim',
        repEmail: 'kim@example.com',
        targetRepId: 'rep-1',
        onClose: () => undefined,
        onStart: async () => undefined,
      }),
    )

    expect(html).toContain('Confirm exact rep')
    expect(html).toContain('kim@example.com')
    expect(html).toContain('rep-1')
    expect(html).toContain('Notify rep and open Workspace')
    expect(html).toContain('The Workspace works as it does for the rep')
    expect(html).toContain('billing, payments, subscriptions, passwords, security')
    expect(html).toContain('Account setup help')
    expect(html).toContain('Support request or ticket')
  })

  it('renders immutable-looking session identity and outcome history', () => {
    const html = renderToStaticMarkup(
      createElement(OperatorSupportHistory, { sessions: [session] }),
    )

    expect(html).toContain('Account Setup')
    expect(html).toContain('Louis')
    expect(html).toContain('session-1')
    expect(html).toContain('Completed')
    expect(html).not.toContain('<button')
  })

  it('creates the exact POST body without blank optional values', () => {
    expect(
      createStartOperatorSupportBody({
        targetRepId: 'rep-1',
        reasonCode: 'troubleshooting',
        reasonNote: '  Calendar setup help  ',
        supportReportId: '  report-1  ',
      }),
    ).toEqual({
      targetRepId: 'rep-1',
      reasonCode: 'troubleshooting',
      reasonNote: 'Calendar setup help',
      supportReportId: 'report-1',
    })

    expect(
      createStartOperatorSupportBody({
        targetRepId: 'rep-1',
        reasonCode: 'account_setup',
        reasonNote: '   ',
      }),
    ).toEqual({ targetRepId: 'rep-1', reasonCode: 'account_setup' })
  })

  it('allows only same-origin support Workspace links', () => {
    expect(
      normalizeSupportWorkspaceUrl(
        '/control-center/support/session-1?from=profile',
        'https://www.yoursparklesuite.com',
      ),
    ).toBe('/control-center/support/session-1?from=profile')
    expect(
      normalizeSupportWorkspaceUrl(
        'https://evil.example/control-center/support/session-1',
        'https://www.yoursparklesuite.com',
      ),
    ).toBeNull()
    expect(
      normalizeSupportWorkspaceUrl(
        'javascript:alert(1)',
        'https://www.yoursparklesuite.com',
      ),
    ).toBeNull()
  })

  it('drops malformed and cross-rep sessions from the profile history', () => {
    expect(
      selectTargetSupportSessions(
        [
          session,
          { ...session, id: 'wrong-rep', targetRepId: 'rep-2' },
          { ...session, id: 'bad-status', status: 'secret_operator_mode' },
        ],
        'rep-1',
      ),
    ).toEqual([session])
  })

  it('uses the target-filtered GET contract and infers an active session', async () => {
    const active = { ...session, status: 'active' as const }
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          sessions: [active, { ...active, id: 'wrong-rep', targetRepId: 'rep-2' }],
        }),
        { headers: { 'content-type': 'application/json' } },
      ),
    )

    await expect(
      requestTargetSupportSessions('rep-1', fetchMock as typeof fetch),
    ).resolves.toEqual({ sessions: [active], activeSession: active })
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/control-center/support-sessions?targetRepId=rep-1',
      {
        cache: 'no-store',
        headers: { accept: 'application/json' },
      },
    )
  })

  it('uses the exact POST contract and rejects a mismatched target response', async () => {
    const input = {
      targetRepId: 'rep-1',
      reasonCode: 'support_request' as const,
      reasonNote: 'Help requested in report.',
      supportReportId: 'report-1',
    }
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          session: { ...session, status: 'active' },
          workspaceUrl: '/control-center/support/session-1',
        }),
        { headers: { 'content-type': 'application/json' } },
      ),
    )

    await expect(
      createOperatorSupportSession(input, fetchMock as typeof fetch),
    ).resolves.toMatchObject({
      session: { id: 'session-1', targetRepId: 'rep-1' },
      workspaceUrl: '/control-center/support/session-1',
    })
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/control-center/support-sessions',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify(input),
      }),
    )

    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          session: { ...session, targetRepId: 'rep-2', status: 'active' },
          workspaceUrl: '/control-center/support/session-1',
        }),
      ),
    )
    await expect(
      createOperatorSupportSession(input, fetchMock as typeof fetch),
    ).rejects.toThrow('could not be confirmed')
  })

  it('prefers a valid custom domain and safely falls back to the public slug', () => {
    expect(
      buildOperatorPublicSiteHref({ customDomain: 'kim.example.com' }),
    ).toBe('https://kim.example.com/')
    expect(
      buildOperatorPublicSiteHref({
        customDomain: 'https://[invalid',
        publicSiteSlug: 'Kim Sparkles',
      }),
    ).toBe('/kim%20sparkles')
  })

  it('keeps the standalone panel fail-closed while history is loading', () => {
    const html = renderToStaticMarkup(
      createElement(OperatorSupportAccessPanel, {
        repDisplayName: 'Kim',
        repEmail: 'kim@example.com',
        targetRepId: 'rep-1',
      }),
    )

    expect(html).toContain('disabled=""')
    expect(html).toContain('Customer site unavailable')
    expect(html).not.toContain('Access history (')
  })
})
