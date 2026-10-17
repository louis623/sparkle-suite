import { createSign } from 'node:crypto'

const GA4_READONLY_SCOPE = 'https://www.googleapis.com/auth/analytics.readonly'
const TOKEN_URL = 'https://oauth2.googleapis.com/token'
const PROPERTY_ID_PATTERN = /^[0-9]{6,15}$/

/** Google rejects batchRunReports calls with more than 5 requests. */
export const GA4_MAX_REPORTS_PER_BATCH = 5

export function chunkGa4ReportRequests<T>(requests: readonly T[], limit = GA4_MAX_REPORTS_PER_BATCH) {
  const size = Math.max(1, Math.min(limit, GA4_MAX_REPORTS_PER_BATCH))
  const chunks: T[][] = []
  for (let index = 0; index < requests.length; index += size) {
    chunks.push(requests.slice(index, index + size))
  }
  return chunks
}

export type Ga4Breakdown = { label: string; value: number }

export type Ga4DashboardNumbers = {
  pageViews: number
  visitors: number
  topPages: Ga4Breakdown[]
  sources: Ga4Breakdown[]
  devices: Ga4Breakdown[]
  regions?: Ga4Breakdown[]
  cities?: Ga4Breakdown[]
  newVisitors?: number
  returningVisitors?: number
  quality?: 'ok' | 'empty' | 'failed'
}

type ServiceAccount = {
  clientEmail: string
  privateKey: string
}

type Ga4Fetch = typeof fetch

export function readGa4ReaderServiceAccount(raw: string | undefined): ServiceAccount | null {
  if (!raw?.trim()) return null
  try {
    const parsed = JSON.parse(raw) as {
      client_email?: unknown
      private_key?: unknown
    }
    const clientEmail = typeof parsed.client_email === 'string' ? parsed.client_email.trim() : ''
    const privateKey = typeof parsed.private_key === 'string' ? parsed.private_key : ''
    if (!clientEmail || !privateKey.includes('PRIVATE KEY')) return null
    return { clientEmail, privateKey }
  } catch {
    return null
  }
}

function base64Url(value: string | Buffer) {
  return Buffer.from(value).toString('base64url')
}

function signServiceAccountJwt(account: ServiceAccount, nowSeconds: number) {
  const header = base64Url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))
  const payload = base64Url(
    JSON.stringify({
      iss: account.clientEmail,
      scope: GA4_READONLY_SCOPE,
      aud: TOKEN_URL,
      iat: nowSeconds,
      exp: nowSeconds + 3600,
    }),
  )
  const unsigned = `${header}.${payload}`
  const signer = createSign('RSA-SHA256')
  signer.update(unsigned)
  signer.end()
  return `${unsigned}.${signer.sign(account.privateKey).toString('base64url')}`
}

function metricNumber(value: unknown) {
  const parsed = Number(typeof value === 'string' ? value : '')
  if (!Number.isFinite(parsed) || parsed < 0) return 0
  return Math.round(parsed)
}

function cleanLabel(value: unknown, fallback: string) {
  const label = typeof value === 'string' ? value.trim() : ''
  if (!label || label === '(not set)') return fallback
  const withoutQuery = label.split('?')[0]?.split('#')[0] ?? label
  const stripped = withoutQuery.replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, '')
  return stripped.slice(0, 120) || fallback
}

function breakdownRows(
  report: { rows?: Array<{ dimensionValues?: Array<{ value?: string }>; metricValues?: Array<{ value?: string }> }> } | undefined,
  fallback: string,
) {
  return (report?.rows ?? [])
    .map((row) => ({
      label: cleanLabel(row.dimensionValues?.[0]?.value, fallback),
      value: metricNumber(row.metricValues?.[0]?.value),
    }))
    .filter((row) => row.label && row.value >= 0)
    .slice(0, 8)
}

function titleCaseDevice(label: string) {
  if (!label) return 'Unknown'
  return label.charAt(0).toUpperCase() + label.slice(1).toLowerCase()
}

export function parseGa4BatchReport(body: unknown): Ga4DashboardNumbers | null {
  const reports = (body as { reports?: unknown[] } | null)?.reports
  if (!Array.isArray(reports) || reports.length < 4) return null
  const totals = reports[0] as {
    rows?: Array<{ metricValues?: Array<{ value?: string }> }>
  }
  const metrics = totals.rows?.[0]?.metricValues ?? []
  const devices = breakdownRows(
    reports[3] as Parameters<typeof breakdownRows>[0],
    'Unknown',
  ).map((row) => ({ ...row, label: titleCaseDevice(row.label) }))
  const extras = parseGa4TrafficExtras(reports)
  return {
    pageViews: metricNumber(metrics[0]?.value),
    visitors: metricNumber(metrics[1]?.value),
    topPages: breakdownRows(reports[1] as Parameters<typeof breakdownRows>[0], '/'),
    sources: breakdownRows(reports[2] as Parameters<typeof breakdownRows>[0], 'Direct'),
    devices,
    ...extras,
  }
}

type Ga4Report = Parameters<typeof breakdownRows>[0]

function parseGa4TrafficExtras(reports: unknown[]) {
  const empty = {
    regions: [] as Ga4Breakdown[],
    cities: [] as Ga4Breakdown[],
    newVisitors: 0,
    returningVisitors: 0,
  }
  if (reports.length < 5) return empty
  const regions = breakdownRows(reports[4] as Ga4Report, '')
    .filter((row) => row.label && row.label !== 'Unknown' && row.value > 0)
  const cityReport = reports[5] as {
    rows?: Array<{ dimensionValues?: Array<{ value?: string }>; metricValues?: Array<{ value?: string }> }>
  } | undefined
  const cities = (cityReport?.rows ?? [])
    .map((row) => {
      const city = cleanLabel(row.dimensionValues?.[0]?.value, '')
      const region = cleanLabel(row.dimensionValues?.[1]?.value, '')
      const label = city && region && region !== city ? `${city}, ${region}` : city
      return { label, value: metricNumber(row.metricValues?.[0]?.value) }
    })
    .filter((row) => row.label && row.value > 0)
    .slice(0, 8)
  let newVisitors = 0
  let returningVisitors = 0
  const audience = reports[6] as Ga4Report
  for (const row of audience?.rows ?? []) {
    const label = cleanLabel(row.dimensionValues?.[0]?.value, '').toLowerCase()
    const value = metricNumber(row.metricValues?.[0]?.value)
    if (label === 'new') newVisitors += value
    if (label === 'returning') returningVisitors += value
  }
  return { regions, cities, newVisitors, returningVisitors }
}

export async function runGa4RealtimeReport(args: {
  propertyId: string
  account: ServiceAccount
  fetchImpl?: Ga4Fetch
  now?: Date
}): Promise<number | null> {
  if (!PROPERTY_ID_PATTERN.test(args.propertyId)) return null
  const fetchImpl = args.fetchImpl ?? fetch
  const nowSeconds = Math.floor((args.now ?? new Date()).getTime() / 1000)
  let assertion = ''
  try {
    assertion = signServiceAccountJwt(args.account, nowSeconds)
  } catch {
    return null
  }
  const tokenResponse = await fetchImpl(TOKEN_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
    signal: AbortSignal.timeout(8000),
  }).catch(() => null)
  if (!tokenResponse?.ok) return null
  const tokenBody = (await tokenResponse.json().catch(() => null)) as { access_token?: string } | null
  const accessToken = tokenBody?.access_token
  if (!accessToken) return null
  const reportResponse = await fetchImpl(
    `https://analyticsdata.googleapis.com/v1beta/properties/${args.propertyId}:runRealtimeReport`,
    {
      method: 'POST',
      headers: {
        authorization: `Bearer ${accessToken}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        metrics: [{ name: 'activeUsers' }],
      }),
      signal: AbortSignal.timeout(8000),
    },
  ).catch(() => null)
  if (!reportResponse?.ok) return null
  const body = (await reportResponse.json().catch(() => null)) as {
    rows?: Array<{ metricValues?: Array<{ value?: string }> }>
  } | null
  if (!body) return null
  return metricNumber(body.rows?.[0]?.metricValues?.[0]?.value)
}

export async function runGa4DashboardReport(args: {
  propertyId: string
  account: ServiceAccount
  fetchImpl?: Ga4Fetch
  now?: Date
  startDate?: string
  endDate?: string
}): Promise<Ga4DashboardNumbers | null> {
  if (!PROPERTY_ID_PATTERN.test(args.propertyId)) return null
  const fetchImpl = args.fetchImpl ?? fetch
  const nowSeconds = Math.floor((args.now ?? new Date()).getTime() / 1000)
  let assertion = ''
  try {
    assertion = signServiceAccountJwt(args.account, nowSeconds)
  } catch {
    return null
  }

  const tokenResponse = await fetchImpl(TOKEN_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
    signal: AbortSignal.timeout(8000),
  })
  if (!tokenResponse.ok) return null
  const tokenBody = (await tokenResponse.json().catch(() => null)) as {
    access_token?: string
  } | null
  const accessToken = tokenBody?.access_token
  if (!accessToken) return null

  const dateRange = {
    startDate: args.startDate?.trim() || '28daysAgo',
    endDate: args.endDate?.trim() || 'today',
  }
  const countryFilter = {
    filter: {
      fieldName: 'country',
      stringFilter: { matchType: 'EXACT', value: 'United States' },
    },
  }
  const requests = [
    {
      dateRanges: [dateRange],
      metrics: [{ name: 'screenPageViews' }, { name: 'totalUsers' }],
    },
    {
      dateRanges: [dateRange],
      dimensions: [{ name: 'pagePath' }],
      metrics: [{ name: 'screenPageViews' }],
      limit: 8,
      orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
    },
    {
      dateRanges: [dateRange],
      dimensions: [{ name: 'sessionSource' }],
      metrics: [{ name: 'sessions' }],
      limit: 8,
      orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
    },
    {
      dateRanges: [dateRange],
      dimensions: [{ name: 'deviceCategory' }],
      metrics: [{ name: 'sessions' }],
      limit: 5,
      orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
    },
    {
      dateRanges: [dateRange],
      dimensions: [{ name: 'region' }],
      metrics: [{ name: 'totalUsers' }],
      dimensionFilter: countryFilter,
      limit: 60,
      orderBys: [{ metric: { metricName: 'totalUsers' }, desc: true }],
    },
    {
      dateRanges: [dateRange],
      dimensions: [{ name: 'city' }, { name: 'region' }],
      metrics: [{ name: 'totalUsers' }],
      dimensionFilter: countryFilter,
      limit: 8,
      orderBys: [{ metric: { metricName: 'totalUsers' }, desc: true }],
    },
    {
      dateRanges: [dateRange],
      dimensions: [{ name: 'newVsReturning' }],
      metrics: [{ name: 'totalUsers' }],
      limit: 4,
    },
  ]
  const batches = chunkGa4ReportRequests(requests)
  const responses = await Promise.all(batches.map((batch) => fetchImpl(
    `https://analyticsdata.googleapis.com/v1beta/properties/${args.propertyId}:batchRunReports`,
    {
      method: 'POST',
      headers: {
        authorization: `Bearer ${accessToken}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({ requests: batch }),
      signal: AbortSignal.timeout(8000),
    },
  )))
  if (responses.some((response) => !response.ok)) return null
  const reports: unknown[] = []
  for (const response of responses) {
    const body = (await response.json().catch(() => null)) as { reports?: unknown[] } | null
    if (!Array.isArray(body?.reports)) return null
    reports.push(...body.reports)
  }
  return parseGa4BatchReport({ reports })
}
