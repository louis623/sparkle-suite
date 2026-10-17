import { NextResponse } from 'next/server'

import { activatePendingWorkspaceTrial } from '@/lib/services/workspace-access'
import { createAdminClient } from '@/lib/supabase/admin'
import { AuthError, getAuthenticatedRep } from '@/lib/supabase/auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST() {
  try {
    const { repId, rep } = await getAuthenticatedRep()
    const trial = await activatePendingWorkspaceTrial({
      supabase: createAdminClient(),
      repId,
    })

    if (!trial && rep.status !== 'active') {
      return NextResponse.json(
        {
          error: 'account_not_found',
          message: 'No Sparkle Suite account is associated with this email.',
        },
        { status: 404 },
      )
    }

    return NextResponse.json({
      ok: true,
      activated: trial?.status === 'active',
      trialStartsAt: trial?.firstSignedInAt ?? null,
      trialEndsAt: trial?.expiresAt ?? null,
    })
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
    }

    console.error('[account/activate-trial] Error:', error)
    return NextResponse.json(
      { error: 'We could not open your workspace. Please sign in again.' },
      { status: 500 },
    )
  }
}
