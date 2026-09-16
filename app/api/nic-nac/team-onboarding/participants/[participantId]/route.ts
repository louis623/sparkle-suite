import { NextResponse } from 'next/server'
import { AuthError, getPaidNicNacContext } from '@/lib/nic-nac/auth'
import { ServiceError } from '@/lib/services/errors'
import {
  archiveTeamOnboardingParticipant,
  getTeamOnboardingAccess,
  getTeamOnboardingTeamName,
  refreshTeamOnboardingParticipantAccess,
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

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ participantId: string }> },
) {
  try {
    const body = await request.json()
    const { participantId } = await params
    const { repId, rep, supabase } = await getPaidNicNacContext()
    const access = await getTeamOnboardingAccess(supabase, repId)

    if (!access.enabled) {
      return NextResponse.json(
        {
          code: 'TEAM_MANAGEMENT_ADDON_REQUIRED',
          error: 'Team Management is a paid add-on.',
          access,
        },
        { status: 403 },
      )
    }

    if (body?.action !== 'archive' && body?.action !== 'refresh_access') {
      return NextResponse.json(
        { code: 'INVALID_INPUT', error: 'Choose a valid participant action.' },
        { status: 400 },
      )
    }

    const admin = createAdminClient()
    const teamName =
      body.action === 'refresh_access'
        ? await getTeamOnboardingTeamName(admin, repId)
        : undefined
    const result =
      body.action === 'refresh_access'
        ? await refreshTeamOnboardingParticipantAccess(
            admin,
            repId,
            participantId,
            {
              appOrigin: resolveTeamOnboardingAppOrigin(request.url),
              leadDisplayName: rep.display_name,
              teamName,
            },
          )
        : await archiveTeamOnboardingParticipant(
            admin,
            repId,
            participantId,
          )

    return NextResponse.json({ ok: true, ...result })
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
