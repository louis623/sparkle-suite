import { NextResponse } from 'next/server'
import { AuthError, getPaidNicNacContext } from '@/lib/nic-nac/auth'
import { ServiceError } from '@/lib/services/errors'
import { getTeamOnboardingAccess } from '@/lib/services/team-onboarding'
import { uploadPublicSiteMedia } from '@/lib/services/storage'
import { analyzeTeamPhoto } from '@/lib/services/team-photo-analysis'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const MAX_PROFILE_PHOTO_BYTES = 3 * 1024 * 1024
const PROFILE_PHOTO_DATA_URL =
  /^data:(image\/(?:jpeg|png|webp));base64,([a-zA-Z0-9+/=\r\n]+)$/

function normalizeText(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

function serviceErrorResponse(error: ServiceError) {
  return NextResponse.json(
    { code: error.code, error: error.userMessage },
    { status: error.statusCode },
  )
}

function addonRequiredResponse(
  access: Awaited<ReturnType<typeof getTeamOnboardingAccess>>,
) {
  return NextResponse.json(
    {
      code: 'TEAM_MANAGEMENT_ADDON_REQUIRED',
      error: 'Team Management is a paid add-on.',
      access,
    },
    { status: 403 },
  )
}

function validateProfilePhoto(base64Data: string) {
  const match = base64Data.match(PROFILE_PHOTO_DATA_URL)
  if (!match?.[2]) {
    return NextResponse.json(
      { error: 'Choose a JPG, PNG, or WebP image.' },
      { status: 400 },
    )
  }

  const byteLength = Buffer.from(match[2].replace(/\s/g, ''), 'base64').byteLength
  if (byteLength > MAX_PROFILE_PHOTO_BYTES) {
    return NextResponse.json(
      { error: 'Profile photos must be 3 MB or smaller.' },
      { status: 413 },
    )
  }

  return null
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const base64Data = normalizeText(body?.base64Data)
    if (!base64Data) {
      return NextResponse.json(
        { error: 'Choose a profile photo to upload.' },
        { status: 400 },
      )
    }

    const invalidPhotoResponse = validateProfilePhoto(base64Data)
    if (invalidPhotoResponse) return invalidPhotoResponse

    const { repId, supabase } = await getPaidNicNacContext()
    const access = await getTeamOnboardingAccess(supabase, repId)
    if (!access.enabled) return addonRequiredResponse(access)

    let analysis
    try {
      analysis = await analyzeTeamPhoto(Buffer.from(base64Data.split(',')[1], 'base64'), { repId })
    } catch {
      return NextResponse.json({ error: 'This image could not be opened. Choose an original JPG, PNG, or WebP photo.' }, { status: 400 })
    }
    const imageUrl = await uploadPublicSiteMedia(repId, base64Data, {
      filename: normalizeText(body?.filename) || undefined,
      folder: 'profile',
    })

    return NextResponse.json({ ok: true, imageUrl, ...analysis })
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: 'Invalid request payload.' }, { status: 400 })
    }
    if (error instanceof AuthError) {
      return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
    }
    if (error instanceof ServiceError) return serviceErrorResponse(error)
    throw error
  }
}
