import { createHash, timingSafeEqual } from 'node:crypto'
import { NextResponse } from 'next/server'

import { createAdminClient } from '@/lib/supabase/admin'

const ALLOWED_ORIGINS = new Set(['https://grok.com', 'https://www.grok.com'])

function tokenDigest(token: string) {
  return createHash('sha256').update(token).digest()
}

async function configuredDigest() {
  const environmentToken = process.env.LANE_ACCOUNTING_INGEST_TOKEN?.trim()
  if (environmentToken) return tokenDigest(environmentToken)

  // Cheese owns this connector. The bootstrap token is stored only as a hash in
  // Supabase. The table name, row id, and LANE_ACCOUNTING_INGEST_TOKEN stay as
  // they are so the live credential keeps working.
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) return null
  const { data, error } = await createAdminClient()
    .from('lane_accounting_mcp_tokens')
    .select('token_digest')
    .eq('id', 'lane')
    .eq('revoked', false)
    .maybeSingle()
  if (error) throw new Error('Could not load Cheese accounting MCP credential: ' + error.message)
  return data?.token_digest ? Buffer.from(data.token_digest, 'hex') : null
}

export async function laneAccountingSecurityResponse(request: Request) {
  const expected = await configuredDigest()
  if (!expected) {
    return NextResponse.json({ error: 'Cheese accounting connector is not configured.' }, { status: 503 })
  }

  const origin = request.headers.get('origin')
  if (origin && !ALLOWED_ORIGINS.has(origin)) {
    return NextResponse.json({ error: 'forbidden origin' }, { status: 403 })
  }

  const authorization = request.headers.get('authorization')
  const supplied = authorization?.startsWith('Bearer ')
    ? authorization.slice('Bearer '.length)
    : ''
  const actual = tokenDigest(supplied)
  if (!actual.length || actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
    return NextResponse.json({ error: 'unauthorized' }, {
      status: 401,
      headers: { 'www-authenticate': 'Bearer realm="Sparkle Suite Cheese Accounting"' },
    })
  }

  return null
}
