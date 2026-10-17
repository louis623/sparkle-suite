import { readFileSync } from 'node:fs'
import { generateKeyPairSync } from 'node:crypto'
import { resolve } from 'node:path'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { loadRepGa4Dashboard } from '@/lib/services/rep-ga4-dashboard'
import type { Ga4DashboardNumbers } from '@/lib/services/ga4-data-api'

const REP_A = '9a971c05-3631-443e-bcb8-4e9a26e15885'
const REP_B = '2b5a27c5-9c05-4014-8d0b-754e19815bf6'
const PROPERTY_A = '559313613'
const PROPERTY_B = '559404981'

const READER_ENV = {
  GA4_READER_SERVICE_ACCOUNT_JSON: JSON.stringify({
    client_email: 'reader@example.iam.gserviceaccount.com',
    private_key: '-----BEGIN PRIVATE KEY-----\nnot-used\n-----END PRIVATE KEY-----\n',
  }),
}

type Row = Record<string, unknown>

function adminFor(args: {
  properties?: Record<string, Row | null>
  cache?: Record<string, Row | null>
  onUpsert?: (row: Row) => void
}) {
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
          if (table === 'rep_analytics_properties') {
            return { data: args.properties?.[filters.rep_id] ?? null, error: null }
          }
          if (table === 'rep_ga4_report_cache') {
            return { data: args.cache?.[filters.rep_id] ?? null, error: null }
          }
          return { data: null, error: null }
        },
        upsert: async (row: Row) => {
          args.onUpsert?.(row)
          return { error: null }
        },
        then(resolve: (value: { data: null; error: null; count: number }) => void, reject?: (reason: unknown) => void) {
          return Promise.resolve({ data: null, error: null, count: 0 }).then(resolve, reject)
        },
      }
      return api
    },
  }
}

const sampleReport: Ga4DashboardNumbers = {
  pageViews: 12,
  visitors: 4,
  topPages: [{ label: '/', value: 9 }],
  sources: [{ label: 'google', value: 3 }],
  devices: [{ label: 'Mobile', value: 3 }],
}

describe('rep GA4 dashboard isolation', () => {
  it('queries only the signed-in rep property and ignores another rep id', async () => {
    const queried: string[] = []
    const summary = await loadRepGa4Dashboard({
      supabase: adminFor({
        properties: {
          [REP_A]: { ga4_property_id: PROPERTY_A, enabled: true },
          [REP_B]: { ga4_property_id: PROPERTY_B, enabled: true },
        },
      }) as never,
      repId: REP_A,
      env: READER_ENV,
      runReport: async ({ propertyId }) => {
        queried.push(propertyId)
        return sampleReport
      },
    })

    expect(queried).toEqual([PROPERTY_A])
    expect(summary.pageViews).toBe(12)
    expect(JSON.stringify(summary)).not.toContain(PROPERTY_B)
    expect(JSON.stringify(summary)).not.toContain('G-VKFLMW866F')
  })

  it('returns not set up when the signed-in rep has no row', async () => {
    const runReport = vi.fn()
    const summary = await loadRepGa4Dashboard({
      supabase: adminFor({ properties: {} }) as never,
      repId: REP_A,
      env: READER_ENV,
      runReport,
    })

    expect(summary.status).toBe('not_set_up')
    expect(summary.pageViews).toBeNull()
    expect(runReport).not.toHaveBeenCalled()
  })

  it('reuses a fresh daily cache and does not call Google again', async () => {
    const runReport = vi.fn()
    const fetchedAt = new Date().toISOString()
    const summary = await loadRepGa4Dashboard({
      supabase: adminFor({
        properties: {
          [REP_A]: { ga4_property_id: PROPERTY_A, enabled: true },
        },
        cache: {
          [REP_A]: { payload: sampleReport, fetched_at: fetchedAt },
        },
      }) as never,
      repId: REP_A,
      env: READER_ENV,
      runReport,
    })

    expect(summary.status).toBe('ready')
    expect(summary.pageViews).toBe(12)
    expect(summary.updatedAt).toBe(fetchedAt)
    expect(runReport).not.toHaveBeenCalled()
  })

  it('returns an empty state when the reader key is missing', async () => {
    const runReport = vi.fn()
    const summary = await loadRepGa4Dashboard({
      supabase: adminFor({
        properties: {
          [REP_A]: { ga4_property_id: PROPERTY_A, enabled: true },
        },
        cache: {
          [REP_A]: {
            payload: sampleReport,
            fetched_at: new Date().toISOString(),
          },
        },
      }) as never,
      repId: REP_A,
      env: {},
      runReport,
    })

    expect(summary.status).toBe('unavailable')
    expect(summary.pageViews).toBeNull()
    expect(runReport).not.toHaveBeenCalled()
  })

  it('keeps GA columns out of site settings', () => {
    const files = [
      'lib/nic-nac/tools/update-site-setting.ts',
      'app/api/nic-nac/site-settings/route.ts',
      'lib/services/site-settings.ts',
    ]
    for (const file of files) {
      const source = readFileSync(resolve(file), 'utf8')
      expect(source, file).not.toContain('rep_analytics_properties')
      expect(source, file).not.toContain('ga4_property_id')
      expect(source, file).not.toContain('measurement_id')
    }

    const migration = readFileSync(
      resolve('supabase/migrations/20261017121500_ss_rep_analytics_properties.sql'),
      'utf8',
    )
    expect(migration).toContain('enable row level security')
    expect(migration).toContain('revoke all on table public.rep_analytics_properties from public, anon, authenticated')
    expect(migration).toContain('grant select, insert, update, delete on table public.rep_analytics_properties to service_role')
    expect(migration).not.toMatch(/create policy/i)
    expect(migration).not.toMatch(/alter table public\.site_settings/i)

    const seed = readFileSync(
      resolve('supabase/manual/20261017_ss_rep_analytics_properties_seed.sql'),
      'utf8',
    )
    expect(seed).toContain('reps.custom_domain')
    expect(seed).not.toContain('G-3XK98BLX70')
    expect(seed).toContain('theblingkitchen.com')
  })
})

const getPaidNicNacContextMock = vi.fn()
const createAdminClientMock = vi.fn()

vi.mock('@/lib/nic-nac/auth', () => ({
  AuthError: class AuthError extends Error {},
  getPaidNicNacContext: (...args: unknown[]) => getPaidNicNacContextMock(...args),
}))

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => createAdminClientMock(),
}))

import { GET } from '@/app/api/nic-nac/site-analytics/route'

describe('site analytics route tenant boundary', () => {
  const { privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 })
  const serviceAccount = JSON.stringify({
    client_email: 'reader@example.iam.gserviceaccount.com',
    private_key: privateKey.export({ type: 'pkcs8', format: 'pem' }).toString(),
  })

  beforeEach(() => {
    getPaidNicNacContextMock.mockReset()
    createAdminClientMock.mockReset()
    vi.unstubAllGlobals()
    delete process.env.GA4_READER_SERVICE_ACCOUNT_JSON
  })

  function spoofedRequest() {
    return new Request(
      `https://www.yoursparklesuite.com/api/nic-nac/site-analytics?propertyId=${PROPERTY_B}&repId=${REP_B}&domain=brisglowtique.com`,
      {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-ga4-property-id': PROPERTY_B,
          'x-rep-id': REP_B,
          'x-rep-domain': 'brisglowtique.com',
        },
        body: JSON.stringify({
          propertyId: PROPERTY_B,
          repId: REP_B,
          domain: 'brisglowtique.com',
        }),
      },
    )
  }

  it('calls Google only with the signed-in rep property', async () => {
    process.env.GA4_READER_SERVICE_ACCOUNT_JSON = serviceAccount
    getPaidNicNacContextMock.mockResolvedValue({ repId: REP_A, rep: { id: REP_A } })
    createAdminClientMock.mockReturnValue(adminFor({
      properties: {
        [REP_A]: { ga4_property_id: PROPERTY_A, enabled: true },
        [REP_B]: { ga4_property_id: PROPERTY_B, enabled: true },
      },
    }))
    const urls: string[] = []
    vi.stubGlobal('fetch', async (input: string) => {
      const url = String(input)
      urls.push(url)
      if (url.includes('oauth2.googleapis.com')) {
        return new Response(JSON.stringify({ access_token: 'test-token' }), { status: 200 })
      }
      return new Response(JSON.stringify({
        reports: [
          { rows: [{ metricValues: [{ value: '20' }, { value: '5' }] }] },
          { rows: [{ dimensionValues: [{ value: '/join' }], metricValues: [{ value: '2' }] }] },
          { rows: [{ dimensionValues: [{ value: 'direct' }], metricValues: [{ value: '4' }] }] },
          { rows: [{ dimensionValues: [{ value: 'desktop' }], metricValues: [{ value: '4' }] }] },
        ],
      }), { status: 200 })
    })

    const response = await GET(spoofedRequest())
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.overview.pageViews30d).toBe(20)
    expect(body.overview.uniqueVisitors30d).toBe(5)
    expect(body.topPages[0].label).toBe('/join')
    expect(body.trafficSources[0].label).toBe('direct')
    expect(body.deviceMix[0].label).toBe('Desktop')
    expect(urls.some((url) => url.includes(`properties/${PROPERTY_A}:batchRunReports`))).toBe(true)
    expect(urls.some((url) => url.includes(PROPERTY_B))).toBe(false)
    expect(JSON.stringify(body)).not.toContain(PROPERTY_B)
    expect(getPaidNicNacContextMock).toHaveBeenCalledWith()
  })

  it('stays on an empty 200 when the reader key is missing', async () => {
    getPaidNicNacContextMock.mockResolvedValue({ repId: REP_A, rep: { id: REP_A } })
    createAdminClientMock.mockReturnValue(adminFor({
      properties: {
        [REP_A]: { ga4_property_id: PROPERTY_A, enabled: true },
      },
    }))
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    const response = await GET(spoofedRequest())
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.configured).toBe(false)
    expect(body.ga4Status).toBe('unavailable')
    expect(body.status).toBeUndefined()
    expect(body.overview.pageViews30d).toBeNull()
    expect(body.topPages).toEqual([])
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('logs an unexpected failure with the rep id and returns an empty error flag', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    getPaidNicNacContextMock.mockResolvedValue({ repId: REP_A, rep: { id: REP_A } })
    createAdminClientMock.mockImplementation(() => {
      throw new Error('database exploded PRIVATE KEY should-not-leak')
    })

    const response = await GET()
    const body = await response.json()
    const logged = JSON.stringify(errorSpy.mock.calls)

    expect(response.status).toBe(200)
    expect(body.status).toBe('error')
    expect(body.configured).toBe(false)
    expect(body.overview.pageViews30d).toBeNull()
    expect(body.topPages).toEqual([])
    expect(logged).toContain(REP_A)
    expect(logged).not.toContain('PRIVATE KEY')
    expect(logged).not.toContain('should-not-leak')
    errorSpy.mockRestore()
  })
})
