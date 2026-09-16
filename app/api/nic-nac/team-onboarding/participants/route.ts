import { NextResponse } from 'next/server'
import { AuthError, getPaidNicNacContext } from '@/lib/nic-nac/auth'
import { ServiceError } from '@/lib/services/errors'
import {
  createTeamOnboardingParticipant,
  getTeamOnboardingAccess,
  getTeamOnboardingTeamName,
  listTeamOnboardingParticipants,
} from '@/lib/services/team-onboarding'
import { createAdminClient } from '@/lib/supabase/admin'
import { resolveTeamOnboardingAppOrigin } from '@/lib/team-onboarding/invite-url'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function serviceErrorResponse(error: ServiceError) {
  return NextResponse.json(
    { code: error.code, error: error.userMessage },
    { status: error.statusCode },
  )
}

function addonRequiredResponse(access: Awaited<ReturnType<typeof getTeamOnboardingAccess>>) {
  return NextResponse.json(
    {
      code: 'TEAM_MANAGEMENT_ADDON_REQUIRED',
      error: 'Team Management is a paid add-on.',
      access,
    },
    { status: 403 },
  )
}

export async function GET() {
  try {
    const { repId, supabase } = await getPaidNicNacContext()
    const access = await getTeamOnboardingAccess(supabase, repId)
    if (!access.enabled) return addonRequiredResponse(access)

    const participants = await listTeamOnboardingParticipants(supabase, repId)
    return NextResponse.json({ access, participants })
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
    }
    if (error instanceof ServiceError) return serviceErrorResponse(error)
    throw error
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { repId, rep, supabase } = await getPaidNicNacContext()
    const access = await getTeamOnboardingAccess(supabase, repId)
    if (!access.enabled) return addonRequiredResponse(access)

    const admin = createAdminClient()
    const teamName = await getTeamOnboardingTeamName(admin, repId)
    const result = await createTeamOnboardingParticipant(admin, repId, {
      displayName: body?.displayName,
      contactEmail: body?.contactEmail,
      joinTeamMemberId: body?.joinTeamMemberId,
      appOrigin: resolveTeamOnboardingAppOrigin(request.url),
      leadDisplayName: rep.display_name,
      teamName,
    })

    return NextResponse.json({
      ok: true,
      participant: result.participant,
      accessUrl: result.accessUrl,
      delivery: 'copy_link',
    })
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
