import { NextResponse } from 'next/server'

import { AuthError, getAuthenticatedNicNacContext } from '@/lib/nic-nac/auth'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const SAFE_PHOTO_ID = /^[A-Za-z0-9_-]{1,80}$/
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

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ photoId: string }> },
) {
  try {
    const { photoId } = await params
    if (!SAFE_PHOTO_ID.test(photoId)) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 })
    }
    const { repId } = await getAuthenticatedNicNacContext()
    const { data, error } = await createAdminClient()
      .from('trade_board_intake_photos')
      .select('image_url')
      .eq('id', photoId)
      .eq('rep_id', repId)
      .maybeSingle()
    if (error) throw error
    const imageUrl = typeof data?.image_url === 'string' ? data.image_url.trim() : ''
    if (!imageUrl) return NextResponse.json({ error: 'not_found' }, { status: 404 })
    if (/^https:\/\//i.test(imageUrl) && imageUrl.length <= 2000) {
      return NextResponse.redirect(imageUrl)
    }
    const match = imageUrl.match(DATA_IMAGE)
    if (!match?.[1] || !match[2]) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 })
    }
    return imageResponse(Buffer.from(match[2].replace(/\s/g, ''), 'base64'), match[1])
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
    }
    throw error
  }
}
