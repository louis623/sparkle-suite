import { NextResponse } from 'next/server'

import {
  authorizeSparkleFinderRepMemoryRequest,
  loadSparkleFinderLinkedRepMemory,
} from '@/lib/sparkle-finder/linked-rep-memory'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  const auth = authorizeSparkleFinderRepMemoryRequest(
    request,
    process.env.SPARKLE_FINDER_TO_SUITE_REP_MEMORY_TOKEN,
  )

  if (!auth.ok) {
    return noStoreJson(
      {
        error:
          auth.reason === 'not_configured'
            ? 'Sparkle Finder linked rep memory is not configured.'
            : 'unauthorized',
      },
      { status: auth.status },
    )
  }

  let body: unknown

  try {
    body = await request.json()
  } catch {
    return noStoreJson({ error: 'Request body must be valid JSON.' }, { status: 400 })
  }

  if (process.env.NIC_NAC_REP_MEMORY_ENABLED !== 'true') {
    // The old Finder client checks the echoed id. It conveys no evidence of a link.
    const requestedId = body && typeof body === 'object' && 'suiteRepId' in body
      ? body.suiteRepId
      : undefined
    return noStoreJson({
      ok: true,
      status: 'loaded',
      suiteRepId: typeof requestedId === 'string' ? requestedId.trim().slice(0, 120) : '',
      memorySummaries: [],
      telemetry: { memoryCardCount: 0, blockedMemoryCardCount: 0, memoryScopes: [], truncated: false },
    })
  }

  try {
    const result = await loadSparkleFinderLinkedRepMemory(body, {
      supabase: createAdminClient(),
    })

    return noStoreJson(result, {
      status: result.ok ? 200 : result.status === 'not_found' ? 404 : 422,
    })
  } catch {
    return noStoreJson(
      {
        ok: false,
        status: 'rejected',
        message: 'Linked Sparkle Suite rep memory could not be loaded right now.',
      },
      { status: 500 },
    )
  }
}

function noStoreJson(body: unknown, init: ResponseInit = {}) {
  const response = NextResponse.json(body, init)
  response.headers.set('cache-control', 'no-store')

  return response
}
