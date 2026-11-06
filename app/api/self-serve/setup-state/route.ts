import { NextResponse } from 'next/server'
import {
  ensureLiveQueueSyncCodeForRep,
  getLiveQueueSyncCodeForRep,
} from '@/lib/services/live-queue'
import { createAdminClient } from '@/lib/supabase/admin'
import { getRequiredSetupState } from '@/lib/self-serve/required-setup'
import { AuthError, getAuthenticatedRep } from '@/lib/supabase/auth'
import { getOperatorSupportRequestContext } from '@/lib/operator-support/request-context'

export const dynamic = 'force-dynamic'
const responseHeaders = { 'Cache-Control': 'private, no-store, max-age=0', Vary: 'Cookie' }

async function loadSetupStateForRep(repId: string) {
  const admin = createAdminClient()
  const state = await getRequiredSetupState(repId)
  const operatorSupport = getOperatorSupportRequestContext()
  if (operatorSupport) {
    const canViewLiveQueue = operatorSupport.actor.capabilities.includes('live_queue.view')
    return {
      ...state,
      // Support access may display the target's existing code, but a read must
      // never manufacture a new credential-like code for the target account.
      liveQueueSyncCode: canViewLiveQueue
        ? await getLiveQueueSyncCodeForRep(admin, repId)
        : null,
    }
  }
  const existingLiveQueueSyncCode = await getLiveQueueSyncCodeForRep(admin, repId)
  const liveQueueSyncCode =
    existingLiveQueueSyncCode ??
    (state.status === 'required_setup' || state.status === 'setup_blocked'
      ? (await ensureLiveQueueSyncCodeForRep(admin, { repId })).syncCode
      : null)

  return {
    ...state,
    liveQueueSyncCode,
  }
}

export async function GET(_request: Request) {
  try {
    const { repId } = await getAuthenticatedRep()
    return NextResponse.json({
      state: await loadSetupStateForRep(repId),
    }, { headers: responseHeaders })
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: 401, headers: responseHeaders })
    }

    console.error('[self-serve/setup-state] Error:', error)
    return NextResponse.json(
      { error: 'Failed to load setup state' },
      { status: 500, headers: responseHeaders },
    )
  }
}
