import { after, NextResponse } from 'next/server'
import { z } from 'zod'
import { AuthError, getPaidNicNacContext } from '@/lib/nic-nac/auth'
import { ServiceError } from '@/lib/services/errors'
import { getTeamOnboardingAccess } from '@/lib/services/team-onboarding'
import { getTeamPhotoPolish, processTeamPhotoPolish, requestTeamPhotoPolish, restoreTeamPhotoOriginal, resumeTeamPhotoEscalations, useTeamPhotoPolish } from '@/lib/services/team-photo-polish'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300

async function context() {
  const auth = await getPaidNicNacContext()
  const access = await getTeamOnboardingAccess(auth.supabase, auth.repId)
  if (!access.enabled) throw new ServiceError({ code: 'TEAM_MANAGEMENT_UNAVAILABLE', message: 'Team Management is not available for this Workspace.', statusCode: 403 })
  return auth
}

function failure(error: unknown) {
  if (error instanceof AuthError) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
  if (error instanceof z.ZodError || error instanceof SyntaxError) return NextResponse.json({ error: 'Check the photo request and confirm you have permission to polish this photo.' }, { status: 400 })
  if (error instanceof ServiceError) return NextResponse.json({ code: error.code, error: error.userMessage }, { status: error.statusCode })
  console.error('[team-photo-polish] request failed', error instanceof Error ? error.name : 'unknown')
  return NextResponse.json({ error: 'Photo polish could not be loaded right now. Your original photo is safe.' }, { status: 500 })
}

export async function GET(request: Request) {
  try {
    const auth = await context()
    const { pendingJobIds, escalationJobIds, ...result } = await getTeamPhotoPolish(auth.repId, new URL(request.url).searchParams.get('cardKey') ?? '')
    if (pendingJobIds.length || escalationJobIds.length) after(async () => {
      try {
        for (const id of pendingJobIds) await processTeamPhotoPolish(auth.repId, id)
        await resumeTeamPhotoEscalations(auth.repId, escalationJobIds)
      } catch { console.error('[team-photo-polish] background recovery failed') }
    })
    return NextResponse.json(result, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch (error) { return failure(error) }
}

export async function POST(request: Request) {
  try {
    const auth = await context()
    const body = await request.json()
    if (body?.action === 'use') return NextResponse.json(await useTeamPhotoPolish(auth.repId, body.cardKey, body.jobId))
    if (body?.action === 'restore') return NextResponse.json(await restoreTeamPhotoOriginal(auth.repId, body.cardKey, { jobId: body.jobId, currentImageUrl: body.currentImageUrl }))
    if (body?.action !== 'generate') return NextResponse.json({ error: 'Choose a photo action.' }, { status: 400 })
    const job = await requestTeamPhotoPolish(auth.repId, body)
    if (job.status === 'queued') after(async () => {
      try { await processTeamPhotoPolish(auth.repId, job.id) }
      catch { console.error('[team-photo-polish] background processing failed') }
    })
    return NextResponse.json({ id: job.id, status: job.status, attemptsUsed: job.attempt_number, maxAttempts: 4, remainingAttempts: 4 - job.attempt_number }, { status: 202 })
  } catch (error) { return failure(error) }
}
