import { redirect } from 'next/navigation'

import { CommunicationsConsole } from '@/app/control-center/_components/CommunicationsConsole'
import { ControlCenterCommunicationsNav } from '@/app/control-center/_components/ControlCenterCommunicationsNav'
import { ControlCenterConversationInbox } from '@/app/control-center/_components/ControlCenterConversationInbox'
import { RepNetworkModerationPanel } from '@/app/control-center/_components/RepNetworkModerationPanel'
import { RemyReplyApprovalsPanel } from '@/app/control-center/_components/RemyReplyApprovalsPanel'
import type { ControlCenterCommunicationView } from '@/app/control-center/_components/control-center-communications'
import {
  AuthError,
  getControlCenterAccess,
  OperatorAuthError,
} from '@/lib/supabase/operator-auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function communicationView(value: string | string[] | undefined) {
  const requested = Array.isArray(value) ? value[0] : value
  return (['support', 'broadcasts', 'safety', 'approvals'] as const).includes(
    requested as ControlCenterCommunicationView,
  )
    ? (requested as ControlCenterCommunicationView)
    : 'support'
}

export default async function ControlCenterMessagesPage({
  searchParams,
}: {
  searchParams?: Promise<{
    view?: string | string[]
    conversationId?: string | string[]
  }>
}) {
  try {
    await getControlCenterAccess()
  } catch (error) {
    if (error instanceof AuthError) {
      redirect('/control-center/login?redirect=%2Fcontrol-center%2Fmessages')
    }

    if (error instanceof OperatorAuthError) {
      return (
        <main className="min-h-screen bg-slate-50 px-5 py-12 text-slate-950">
          <section className="mx-auto max-w-xl rounded-lg border border-slate-200 bg-white p-8 shadow-sm">
            <h1 className="text-2xl font-semibold">Operator access required</h1>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              The Communications Console is limited to approved Sparkle Suite
              operators.
            </p>
          </section>
        </main>
      )
    }

    throw error
  }

  const resolvedSearchParams = await searchParams
  const view = communicationView(resolvedSearchParams?.view)
  const requestedConversationId = resolvedSearchParams?.conversationId
  const initialConversationId = Array.isArray(requestedConversationId)
    ? requestedConversationId[0]
    : requestedConversationId

  return (
    <>
      <ControlCenterCommunicationsNav active={view} />
      {view === 'broadcasts' ? <CommunicationsConsole /> : null}
      {view === 'support' ? (
        <ControlCenterConversationInbox
          initialConversationId={initialConversationId}
        />
      ) : null}
      {view === 'safety' ? <RepNetworkModerationPanel /> : null}
      {view === 'approvals' ? <RemyReplyApprovalsPanel /> : null}
    </>
  )
}
