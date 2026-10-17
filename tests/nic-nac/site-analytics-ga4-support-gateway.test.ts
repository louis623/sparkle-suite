import { generateKeyPairSync } from 'node:crypto'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const REP_A = '9a971c05-3631-443e-bcb8-4e9a26e15885'
const REP_B = '2b5a27c5-9c05-4014-8d0b-754e19815bf6'
const PROPERTY_A = '559313613'
const PROPERTY_B = '559404981'

const mocks = vi.hoisted(() => ({
  loadContext: vi.fn(),
  appendAudit: vi.fn(),
}))

vi.mock('server-only', () => ({}))
vi.mock('@/lib/operator-support/http', () => ({
  loadVerifiedOperatorSupportContext: mocks.loadContext,
}))
vi.mock('@/lib/operator-support/audit', () => ({
  OperatorSupportAuditUnavailableError: class OperatorSupportAuditUnavailableError extends Error {},
  appendOperatorSupportAuditEvent: mocks.appendAudit,
}))
vi.mock('@/lib/nic-nac/subscription-access', () => ({
  assertPaidWorkspaceAccess: async () => {},
}))

function adminFor() {
  return {
    from(table: string) {
      const filters: Record<string, string> = {}
      const api = {
        select() {
          return api
        },
        eq(column: string, value: string) {
          filters[column] = value
          return api
        },
        or() {
          return api
        },
        gt() {
          return api
        },
        maybeSingle: async () => {
          if (table === 'rep_analytics_properties' && filters.rep_id === REP_A) {
            return { data: { ga4_property_id: PROPERTY_A, enabled: true }, error: null }
          }
          if (table === 'rep_analytics_properties' && filters.rep_id === REP_B) {
            return { data: { ga4_property_id: PROPERTY_B, enabled: true }, error: null }
          }
          return { data: null, error: null }
        },
        upsert: async () => ({ error: null }),
        then(resolve: (value: { data: null; error: null; count: number }) => void, reject?: (reason: unknown) => void) {
          return Promise.resolve({ data: null, error: null, count: 0 }).then(resolve, reject)
        },
      }
      return api
    },
  }
}

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => adminFor(),
}))

import { GET } from '@/app/api/control-center/support-sessions/[sessionId]/gateway/route'

describe('support-session site analytics gateway', () => {
  const { privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 })

  beforeEach(() => {
    mocks.loadContext.mockReset()
    mocks.appendAudit.mockReset()
    process.env.GA4_READER_SERVICE_ACCOUNT_JSON = JSON.stringify({
      client_email: 'reader@example.iam.gserviceaccount.com',
      private_key: privateKey.export({ type: 'pkcs8', format: 'pem' }).toString(),
    })
    vi.unstubAllGlobals()
  })

  afterEach(() => {
    delete process.env.GA4_READER_SERVICE_ACCOUNT_JSON
    vi.unstubAllGlobals()
  })

  it('reads the support target rep property and ignores spoofed ids', async () => {
    const sessionId = '11111111-1111-4111-8111-111111111111'
    mocks.loadContext.mockResolvedValue({
      actor: {
        mode: 'operator_support',
        operatorRepId: 'operator-rep',
        operatorEmail: 'operator@example.com',
        operatorDisplayName: 'Operator',
        subjectRepId: REP_A,
        supportSessionId: sessionId,
        capabilities: ['site.view'],
      },
      session: {
        id: sessionId,
        operatorRepId: 'operator-rep',
        targetRepId: REP_A,
      },
      targetRep: {
        id: REP_A,
        auth_user_id: 'user-a',
        email: 'rep-a@example.com',
        display_name: 'Rep A',
        business_name: 'BlingKitchen',
        stripe_customer_id: null,
        public_site_slug: 'blingkitchen',
        custom_domain: 'theblingkitchen.com',
        time_zone: 'America/New_York',
        status: 'active',
      },
      supabase: {},
    })
    mocks.appendAudit.mockResolvedValue(undefined)
    const urls: string[] = []
    vi.stubGlobal('fetch', async (input: string) => {
      const url = String(input)
      urls.push(url)
      if (url.includes('oauth2.googleapis.com')) {
        return new Response(JSON.stringify({ access_token: 'test-token' }), { status: 200 })
      }
      return new Response(JSON.stringify({
        reports: [
          { rows: [{ metricValues: [{ value: '8' }, { value: '2' }] }] },
          { rows: [{ dimensionValues: [{ value: '/' }], metricValues: [{ value: '8' }] }] },
          { rows: [{ dimensionValues: [{ value: 'google' }], metricValues: [{ value: '1' }] }] },
          { rows: [{ dimensionValues: [{ value: 'mobile' }], metricValues: [{ value: '1' }] }] },
        ],
      }), { status: 200 })
    })

    const request = new Request(
      `https://www.yoursparklesuite.com/api/control-center/support-sessions/${sessionId}/gateway?path=${encodeURIComponent('/api/nic-nac/site-analytics')}&propertyId=${PROPERTY_B}&repId=${REP_B}&domain=brisglowtique.com`,
      {
        headers: {
          'x-sparkle-support-csrf': 'test-csrf',
          'x-ga4-property-id': PROPERTY_B,
          'x-rep-id': REP_B,
          'x-rep-domain': 'brisglowtique.com',
        },
      },
    )
    const response = await GET(request, { params: Promise.resolve({ sessionId }) })
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.overview.pageViews30d).toBe(8)
    expect(urls.some((url) => url.includes(`properties/${PROPERTY_A}:batchRunReports`))).toBe(true)
    expect(urls.some((url) => url.includes(PROPERTY_B))).toBe(false)
    expect(JSON.stringify(body)).not.toContain(PROPERTY_B)
    expect(JSON.stringify(body)).not.toContain(REP_B)
  })
})
