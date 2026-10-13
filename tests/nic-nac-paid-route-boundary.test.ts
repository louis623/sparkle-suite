import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const paidNicNacRoutes = [
  'app/api/nic-nac/route.ts',
  'app/api/nic-nac/calendar-summary/route.ts',
  'app/api/nic-nac/conversation/latest/route.ts',
  'app/api/nic-nac/conversation/rollover/route.ts',
  'app/api/nic-nac/conversation/[conversationId]/route.ts',
  'app/api/nic-nac/conversation/clear/route.ts',
  'app/api/nic-nac/conversation-rollover/route.ts',
  'app/api/nic-nac/conversation-state/route.ts',
  'app/api/nic-nac/customer-audience/route.ts',
  'app/api/nic-nac/fulfillment-queue/route.ts',
  'app/api/nic-nac/jewelry-library/route.ts',
  'app/api/nic-nac/join-team-roster/photo/route.ts',
  'app/api/nic-nac/messages/route.ts',
  'app/api/nic-nac/rep-dashboard/route.ts',
  'app/api/nic-nac/send-email/route.ts',
  'app/api/nic-nac/site-analytics/route.ts',
  'app/api/nic-nac/site-recipes/draft/route.ts',
  'app/api/nic-nac/site-recipes/route.ts',
  'app/api/nic-nac/site-recipes/image/route.ts',
  'app/api/nic-nac/site-settings/route.ts',
  'app/api/nic-nac/trade-board/route.ts',
  'app/api/nic-nac/trade-history/route.ts',
  'app/api/nic-nac/trade-requests/route.ts',
  'app/api/nic-nac/wallet-summary/route.ts',
]

const unpaidAllowedNicNacRoutes = [
  'app/api/nic-nac/account-billing/route.ts',
  'app/api/nic-nac/health/route.ts',
  'app/api/nic-nac/me/route.ts',
  'app/api/nic-nac/resources/route.ts',
]

const paidStripeRoutes = [
  'app/api/stripe/wallet/auto-recharge/route.ts',
  'app/api/stripe/wallet/load/route.ts',
]

function readRoute(path: string) {
  return readFileSync(join(process.cwd(), path), 'utf8')
}

function expectsServiceErrorResponse(source: string) {
  return (
    source.includes('instanceof ServiceError') ||
    source.includes('serviceErrorResponse(error)') ||
    source.includes('serviceErrorResponse(err)')
  )
}

describe('Nic-Nac paid route boundary', () => {
  it('keeps required setup and checkout flows outside the unlocked dashboard shell', () => {
    const source = readRoute('app/nic-nac/_client.tsx')

    expect(source).toContain(
      "searchParams.get('onboarding') === 'checkout-required'",
    )
    expect(source).toContain(
      "searchParams.get('onboarding') === 'required-setup'",
    )
    expect(source).toContain('isCheckoutRequiredMode')
    expect(source).toContain('isRequiredSetupMode')
    expect(source).toContain('<RequiredSetupHome')
    expect(source).toContain('<WorkspaceAccessPending')
    expect(source).not.toContain('/api/stripe/create-checkout')
    expect(source).not.toContain("onboarding') === 'self-serve-started'")
  })

  it('keeps product and chat routes behind paid workspace access', () => {
    for (const route of paidNicNacRoutes) {
      const source = readRoute(route)

      expect(source, route).toContain('getPaidNicNacContext')
      expect(source, route).not.toContain('getAuthenticatedNicNacContext')
      expect(source, route).not.toContain('getAuthenticatedRep')
    }
  })

  it('returns paid-workspace ServiceError responses instead of leaking 500s', () => {
    for (const route of paidNicNacRoutes) {
      const source = readRoute(route)

      expect(expectsServiceErrorResponse(source), route).toBe(true)
    }
  })

  it('keeps only signup-to-checkout support routes available without payment', () => {
    for (const route of unpaidAllowedNicNacRoutes) {
      expect(readRoute(route), route).not.toContain('getPaidNicNacContext')
    }
  })

  it('keeps SMS wallet purchase routes behind paid workspace access', () => {
    for (const route of paidStripeRoutes) {
      const source = readRoute(route)

      expect(source, route).toContain('assertPaidWorkspaceAccess')
    }
  })
})
