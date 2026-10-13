import { NextResponse } from 'next/server'
import {
  interpretPublicSiteVisit,
  readVisitIdentity,
  SITE_VISIT_HASH_SALT_ENV,
} from '@/lib/services/site-visit-summary'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const MAX_BODY_BYTES = 2_000

function quiet(status = 204) {
  return new NextResponse(null, {
    status,
    headers: { 'Cache-Control': 'no-store' },
  })
}

function sameOrigin(request: Request) {
  const requestHost = new URL(request.url).host
  const origin = request.headers.get('origin')
  const referrer = request.headers.get('referer')
  try {
    if (origin) return new URL(origin).host === requestHost
    if (referrer) return new URL(referrer).host === requestHost
  } catch {
    return false
  }
  return false
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) return quiet()
  const raw = await request.text()
  if (raw.length > MAX_BODY_BYTES) return quiet()
  let body: unknown
  try {
    body = JSON.parse(raw)
  } catch {
    return quiet()
  }
  const decision = interpretPublicSiteVisit({
    headers: request.headers,
    body,
    salt: process.env[SITE_VISIT_HASH_SALT_ENV],
  })
  if (decision.action === 'ignore') return quiet()
  const identity = readVisitIdentity(body)
  if (!identity.repId && !identity.slug) return quiet()

  try {
    const admin = createAdminClient()
    let repId = identity.repId
    if (identity.slug) {
      const { data, error } = await admin
        .from('reps')
        .select('id')
        .eq('public_site_slug', identity.slug)
        .maybeSingle()
      if (error || !data?.id) return quiet()
      if (repId && data.id !== repId) return quiet()
      repId = data.id
    } else if (repId) {
      const { data, error } = await admin.from('reps').select('id').eq('id', repId).maybeSingle()
      if (error || !data?.id) return quiet()
    }
    if (!repId) return quiet()
    const { error } = await admin.from('public_site_visits').insert({
      rep_id: repId,
      ...decision.row,
    })
    if (error) return quiet()
  } catch {
    return quiet()
  }
  return quiet()
}
