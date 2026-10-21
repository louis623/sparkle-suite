import { NextResponse } from 'next/server'

import { AuthError, getAuthenticatedNicNacContext } from '@/lib/nic-nac/auth'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const PHOTO_UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const DATA_IMAGE =
  /^data:(image\/(?:jpeg|jpg|png|webp|gif));base64,([a-zA-Z0-9+/=\r\n]+)$/i

function imageResponse(bytes: Buffer, mime: string) {
  const contentType = mime.toLowerCase() === 'image/jpg' ? 'image/jpeg' : mime.toLowerCase()
  return new NextResponse(new Uint8Array(bytes), {
    status: 200,
    headers: {
      'Content-Type': contentType,
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  })
}

function notFound() {
  return NextResponse.json({ error: 'not_found' }, { status: 404 })
}

function supabaseStorageHosts(): Set<string> {
  const raw = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  if (!raw) return new Set()
  try {
    return new Set([new URL(raw).host])
  } catch {
    return new Set()
  }
}

function storageRedirectUrl(imageUrl: string): string | null {
  if (!/^https:\/\//i.test(imageUrl) || imageUrl.length > 2000) return null
  let parsed: URL
  try {
    parsed = new URL(imageUrl)
  } catch {
    return null
  }
  if (!supabaseStorageHosts().has(parsed.host)) return null
  if (!parsed.pathname.startsWith('/storage/v1/')) return null
  return parsed.toString()
}

function isInvalidUuidError(error: unknown): boolean {
  const record = error as { code?: string; message?: string } | null
  return (
    record?.code === '22P02' ||
    /invalid input syntax for type uuid/i.test(record?.message ?? '')
  )
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ photoId: string }> },
) {
  try {
    const { photoId } = await params
    if (!PHOTO_UUID.test(photoId)) return notFound()
    const { repId } = await getAuthenticatedNicNacContext()
    const { data, error } = await createAdminClient()
      .from('trade_board_intake_photos')
      .select('image_url')
      .eq('id', photoId)
      .eq('rep_id', repId)
      .maybeSingle()
    if (error) {
      if (isInvalidUuidError(error)) return notFound()
      throw error
    }
    const imageUrl = typeof data?.image_url === 'string' ? data.image_url.trim() : ''
    if (!imageUrl) return notFound()
    const redirectUrl = storageRedirectUrl(imageUrl)
    if (redirectUrl) return NextResponse.redirect(redirectUrl)
    const match = imageUrl.match(DATA_IMAGE)
    if (!match?.[1] || !match[2]) return notFound()
    return imageResponse(Buffer.from(match[2].replace(/\s/g, ''), 'base64'), match[1])
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
    }
    if (isInvalidUuidError(error)) return notFound()
    throw error
  }
}
