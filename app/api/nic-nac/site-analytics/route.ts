import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getPaidNicNacContext, AuthError } from '@/lib/nic-nac/auth'
import { ServiceError } from '@/lib/services/errors'
import {
  getSiteAnalyticsDashboard,
} from '@/lib/services/site-analytics'
import type { SiteAnalyticsDashboardResult } from '@/lib/services/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function emptySiteAnalytics(): SiteAnalyticsDashboardResult {
  return {
    configured: false,
    ga4Status: 'unavailable',
    ga4UpdatedAt: null,
    privacy: {
      disablesIpCapture: true,
      masksSensitiveInputs: true,
      identifiesAfterLoginOnly: true,
    },
    overview: {
      pageViews30d: null,
      uniqueVisitors30d: null,
      topTrafficSource: null,
      topDeviceType: null,
    },
    topPages: [],
    trafficSources: [],
    deviceMix: [],
    operationalSnapshot: {
      activeListings: 0,
      pendingRequests: 0,
      upcomingShows: 0,
      reachableCustomers: 0,
    },
  }
}

export async function GET(request?: Request) {
  void request
  let repId: string | null = null
  try {
    const context = await getPaidNicNacContext()
    repId = context.repId
    const summary = await getSiteAnalyticsDashboard({
      supabase: createAdminClient(),
      repId,
    })
    return NextResponse.json(summary)
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
    }
    if (error instanceof ServiceError) {
      return NextResponse.json(
        { code: error.code, error: error.userMessage },
        { status: error.statusCode },
      )
    }
    console.error('[site-analytics] unexpected failure', {
      repId,
      errorName: error instanceof Error ? error.name : 'UnknownError',
    })
    return NextResponse.json({ ...emptySiteAnalytics(), status: 'error' as const })
  }
}
