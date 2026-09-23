import { NextResponse } from 'next/server'
import {
  ensureLiveQueueSyncCodeForRep,
  getLiveQueueSyncCodeForRep,
} from '@/lib/services/live-queue'
import { workspaceReviewAccessEnabled } from '@/lib/reviewer-smoke/config'
import { createAdminClient } from '@/lib/supabase/admin'
import { getRequiredSetupState } from '@/lib/self-serve/required-setup'
import { AuthError, getAuthenticatedRep } from '@/lib/supabase/auth'
import { getOperatorSupportRequestContext } from '@/lib/operator-support/request-context'

async function getRepIdForWorkspaceReview(conversationId: string) {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('nic_nac_conversations')
    .select('rep_id')
    .eq('id', conversationId)
    .maybeSingle<{ rep_id: string | null }>()

  if (error) throw error
  return data?.rep_id ?? null
}

function getConversationIdFromRequest(request?: Request) {
  if (!request) return ''
  return new URL(request.url).searchParams.get('conversationId')?.trim() ?? ''
}

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

async function loadWorkspaceReviewSetupState(request?: Request) {
  if (!workspaceReviewAccessEnabled()) return null

  const conversationId = getConversationIdFromRequest(request)
  if (!conversationId) return null

  const repId = await getRepIdForWorkspaceReview(conversationId)
  if (!repId) return null

  const state = await loadSetupStateForRep(repId)
  return {
    ...state,
    supportState: {
      ...state.supportState,
      review_workspace: {
        enabled: true,
        source: 'conversation_id',
      },
    },
  }
}

export async function GET(request: Request) {
  try {
    const { repId } = await getAuthenticatedRep()
    return NextResponse.json({
      state: await loadSetupStateForRep(repId),
    })
  } catch (error) {
    if (error instanceof AuthError) {
      const reviewState = await loadWorkspaceReviewSetupState(request)
      if (reviewState) {
        return NextResponse.json({ state: reviewState })
      }

      return NextResponse.json({ error: error.message }, { status: 401 })
    }

    console.error('[self-serve/setup-state] Error:', error)
    return NextResponse.json(
      { error: 'Failed to load setup state' },
      { status: 500 },
    )
  }
}
