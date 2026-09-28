import { NextResponse } from 'next/server'

import {
  buildAccountingAgentSummary,
  matchesAccountingAgentToken,
  parseAccountingAgentProduct,
} from '@/lib/control-center/accounting-agent-api'
import { loadCurrentAccountingSnapshot } from '@/lib/control-center/accounting'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  if (!matchesAccountingAgentToken(
    request.headers.get('authorization'),
    process.env.ACCOUNTING_AGENT_READ_TOKEN,
  )) {
    return noStoreJson({ error: 'unauthorized' }, 401)
  }

  const product = parseAccountingAgentProduct(
    new URL(request.url).searchParams.get('product'),
  )
  if (!product) {
    return noStoreJson(
      { error: 'product must be either suite or finder.' },
      400,
    )
  }

  try {
    const snapshot = await loadCurrentAccountingSnapshot(createAdminClient(), product)
    return noStoreJson(buildAccountingAgentSummary({ product, snapshot }))
  } catch (error) {
    console.error('[internal/accounting/summary]', error)
    return noStoreJson({ error: 'accounting summary unavailable' }, 500)
  }
}

function noStoreJson(body: unknown, status = 200) {
  const response = NextResponse.json(body, { status })
  response.headers.set('cache-control', 'no-store, private')
  return response
}
