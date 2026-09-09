import { createServerClient } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { isLocReviewer, LocReviewerError, prepareLocReviewer, verifyLocReviewerToken } from '@/lib/reviewer-smoke/loc-session'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60
const bodySchema = z.object({ token: z.string().max(512), state: z.enum(['required_setup', 'dashboard_unlocked']) }).strict()
const headers = { 'Cache-Control': 'private, no-store', 'Referrer-Policy': 'no-referrer', 'X-Content-Type-Options': 'nosniff' }
export async function POST(request: NextRequest) {
  try {
    if (request.headers.get('origin') !== request.nextUrl.origin || request.headers.get('authorization'))
      throw new LocReviewerError(403, 'Use the same-origin LOC reviewer page.')
    if (!request.headers.get('content-type')?.startsWith('application/json')) throw new LocReviewerError(415, 'JSON required.')
    const reader = request.body?.getReader()
    if (!reader) throw new LocReviewerError(400, 'Request body required.')
    const chunks: Uint8Array[] = []; let size = 0
    while (true) {
      const part = await reader.read(); if (part.done) break
      size += part.value.byteLength
      if (size > 2048) { await reader.cancel(); throw new LocReviewerError(413, 'Request is too large.') }
      chunks.push(part.value)
    }
    const body = bodySchema.safeParse(JSON.parse(Buffer.concat(chunks).toString('utf8')))
    if (!body.success) throw new LocReviewerError(400, 'Invalid reviewer request.')
    verifyLocReviewerToken(body.data.token)
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!url || !key) throw new LocReviewerError(503, 'Reviewer authentication is not configured.')
    const current = createServerClient(url, key, { cookies: { getAll: () => request.cookies.getAll(), setAll: () => {} } })
    const currentUser = await current.auth.getUser()
    if (currentUser.error && request.cookies.getAll().some(cookie => cookie.name.startsWith('sb-')))
      throw new LocReviewerError(409, 'Existing browser authentication could not be verified. Use a separate reviewer browser session.')
    if (currentUser.data.user && !isLocReviewer(currentUser.data.user))
      throw new LocReviewerError(409, 'This browser is signed into another account. Use a separate reviewer browser session.')
    const prepared = await prepareLocReviewer(body.data.state)
    const response = NextResponse.json({ ok: true, repId: prepared.repId, state: prepared.state, next: '/nic-nac' }, { headers })
    const session = createServerClient(url, key, { cookies: { getAll: () => [], setAll: values => {
      for (const cookie of values) response.cookies.set(cookie.name, cookie.value, cookie.options)
    } } })
    const verified = await session.auth.verifyOtp({ token_hash: prepared.tokenHash, type: 'magiclink' })
    if (verified.error || verified.data.user?.id !== prepared.userId || !verified.data.session)
      throw new LocReviewerError(503, 'Reviewer sign-in failed; fixture data is retained.')
    return response
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof LocReviewerError ? error.message : 'Reviewer setup did not finish. Inspect the dedicated fixture before retrying.' },
      { status: error instanceof LocReviewerError ? error.status : error instanceof SyntaxError ? 400 : 500, headers })
  }
}
