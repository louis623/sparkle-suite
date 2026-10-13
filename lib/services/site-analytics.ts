import type { SupabaseClient } from '@supabase/supabase-js'
import { ServiceError } from '@/lib/services/errors'
import type {
  SiteAnalyticsDashboardResult,
  SiteAnalyticsOperationalSnapshot,
} from '@/lib/services/types'

export type SiteAnalyticsProvider = 'posthog'

export interface SiteAnalyticsCaptureConfig {
  enabled: boolean
  provider: SiteAnalyticsProvider
  hostConfigured?: boolean
  privacy?: {
    disablesIpCapture: boolean
    masksSensitiveInputs: boolean
    identifiesAfterLoginOnly: boolean
  }
}

export interface SiteAnalyticsEvent {
  name: string
  distinctId: string
  properties: Record<string, string | number | boolean | null>
}

export interface SiteAnalyticsCaptureAdapter {
  capture(event: SiteAnalyticsEvent): Promise<void> | void
}

export type SiteAnalyticsCaptureResult =
  | {
      captured: true
      provider: SiteAnalyticsProvider
    }
  | {
      captured: false
      provider: SiteAnalyticsProvider
      reason: 'disabled' | 'adapter_missing'
    }

export const REACHABLE_CUSTOMER_FILTER =
  'and(sms_consent.eq.true,sms_opted_out_at.is.null,stop_keyword_received_at.is.null),and(email_consent.eq.true,email_opted_out_at.is.null)'

const SITE_ANALYTICS_PRIVACY = {
  disablesIpCapture: true,
  masksSensitiveInputs: true,
  identifiesAfterLoginOnly: true,
}

const SENSITIVE_PROPERTY_NAME_PATTERN =
  /(email|phone|name|address|password|secret|token|api[_-]?key|posthog)/i
const EMAIL_VALUE_PATTERN = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i
const PHONE_VALUE_PATTERN = /\+?\d[\d .()-]{7,}\d/
const QUERY_PII_PATTERN = /[?&](email|phone|name|address)=/i

export function getSiteAnalyticsCaptureConfig(
  env: Record<string, string | undefined> = process.env,
): SiteAnalyticsCaptureConfig {
  return {
    enabled:
      env.SITE_ANALYTICS_CAPTURE_ENABLED?.trim() === 'true' &&
      Boolean(env.NEXT_PUBLIC_POSTHOG_KEY?.trim()) &&
      Boolean(env.NEXT_PUBLIC_POSTHOG_HOST?.trim()),
    provider: 'posthog',
    hostConfigured: Boolean(env.NEXT_PUBLIC_POSTHOG_HOST?.trim()),
    privacy: SITE_ANALYTICS_PRIVACY,
  }
}

export async function captureSiteAnalyticsEvent(args: {
  adapter?: SiteAnalyticsCaptureAdapter
  config?: SiteAnalyticsCaptureConfig
  event: SiteAnalyticsEvent
}): Promise<SiteAnalyticsCaptureResult> {
  const config = args.config ?? getSiteAnalyticsCaptureConfig()

  if (!config.enabled) {
    return {
      captured: false,
      provider: config.provider,
      reason: 'disabled',
    }
  }

  assertSafeSiteAnalyticsEvent(args.event)

  if (!args.adapter) {
    return {
      captured: false,
      provider: config.provider,
      reason: 'adapter_missing',
    }
  }

  await args.adapter.capture(args.event)

  return {
    captured: true,
    provider: config.provider,
  }
}

function assertSafeSiteAnalyticsEvent(event: SiteAnalyticsEvent) {
  if (
    EMAIL_VALUE_PATTERN.test(event.distinctId) ||
    PHONE_VALUE_PATTERN.test(event.distinctId)
  ) {
    throwBlockedAnalyticsEvent()
  }

  for (const [key, value] of Object.entries(event.properties)) {
    if (SENSITIVE_PROPERTY_NAME_PATTERN.test(key)) {
      throwBlockedAnalyticsEvent()
    }

    if (typeof value === 'string') {
      if (
        EMAIL_VALUE_PATTERN.test(value) ||
        PHONE_VALUE_PATTERN.test(value) ||
        QUERY_PII_PATTERN.test(value)
      ) {
        throwBlockedAnalyticsEvent()
      }
    }
  }
}

function throwBlockedAnalyticsEvent(): never {
  throw new ServiceError({
    code: 'SITE_ANALYTICS_PII_BLOCKED',
    message: 'analytics event contains blocked fields',
    userMessage: 'That analytics event was blocked before capture.',
    statusCode: 422,
  })
}

async function countRows(
  supabase: SupabaseClient,
  table: string,
  filters: Array<[string, unknown]>,
) {
  let query = supabase.from(table).select('id', { head: true, count: 'exact' })
  for (const [column, value] of filters) {
    query = query.eq(column, value)
  }
  const { count, error } = await query
  if (error) throw error
  return count ?? 0
}

async function getOperationalSnapshot(
  supabase: SupabaseClient,
  repId: string,
): Promise<SiteAnalyticsOperationalSnapshot> {
  const [activeListings, pendingRequests, upcomingShows, reachableCustomers] =
    await Promise.all([
      countRows(supabase, 'trade_listings', [
        ['rep_id', repId],
        ['status', 'available'],
      ]),
      supabase
        .from('trade_requests')
        .select('id, listing:trade_listings!inner(rep_id)', { count: 'exact' })
        .eq('status', 'pending')
        .eq('listing.rep_id', repId)
        .then(({ count, error }) => {
          if (error) throw error
          return count ?? 0
        }),
      supabase
        .from('calendar_events')
        .select('id', { head: true, count: 'exact' })
        .eq('rep_id', repId)
        .eq('status', 'scheduled')
        .gt('event_time', new Date().toISOString())
        .then(({ count, error }) => {
          if (error) throw error
          return count ?? 0
        }),
      supabase
        .from('customer_audience')
        .select('id', { head: true, count: 'exact' })
        .eq('rep_id', repId)
        .or(REACHABLE_CUSTOMER_FILTER)
        .then(({ count, error }) => {
          if (error) throw error
          return count ?? 0
        }),
    ])

  return {
    activeListings,
    pendingRequests,
    upcomingShows,
    reachableCustomers,
  }
}

export async function getSiteAnalyticsDashboard(args: {
  supabase: SupabaseClient
  repId: string
}): Promise<SiteAnalyticsDashboardResult> {
  const captureConfig = getSiteAnalyticsCaptureConfig()

  return {
    configured: captureConfig.enabled,
    privacy: SITE_ANALYTICS_PRIVACY,
    overview: {
      pageViews30d: null,
      uniqueVisitors30d: null,
      topTrafficSource: null,
      topDeviceType: null,
    },
    topPages: [],
    trafficSources: [],
    deviceMix: [],
    operationalSnapshot: await getOperationalSnapshot(args.supabase, args.repId),
  }
}
