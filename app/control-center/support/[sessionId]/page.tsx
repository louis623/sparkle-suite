import Link from 'next/link'
import { redirect } from 'next/navigation'

import { appendOperatorSupportAuditEvent } from '@/lib/operator-support/audit'
import { loadVerifiedOperatorSupportContext } from '@/lib/operator-support/http'
import { OperatorSupportError } from '@/lib/operator-support/session-service'
import { AuthError, OperatorAuthError } from '@/lib/supabase/operator-auth'
import { SupportWorkspaceClient } from './SupportWorkspaceClient'
import { liveLineupOwnerMutationsAvailable } from '@/lib/live-lineup/runtime-mode'

export const dynamic = 'force-dynamic'

async function loadContextOrRedirect(sessionId: string) {
  try {
    return {
      ok: true as const,
      context: await loadVerifiedOperatorSupportContext(sessionId, {
        capability: 'nic_nac.use',
        mutation: false,
      }),
    }
  } catch (error) {
    if (error instanceof AuthError || error instanceof OperatorAuthError) {
      redirect('/control-center/login')
    }
    if (error instanceof OperatorSupportError) {
      return { ok: false as const, code: error.code }
    }
    throw error
  }
}

export default async function OperatorSupportWorkspacePage({
  params,
}: {
  params: Promise<{ sessionId: string }>
}) {
  const { sessionId } = await params
  const loaded = await loadContextOrRedirect(sessionId)
  if (!loaded.ok) {
    return (
      <main className="grid min-h-screen place-items-center bg-slate-100 p-6">
        <section className="w-full max-w-xl rounded-2xl border border-amber-300 bg-white p-6 shadow-lg">
          <h1 className="text-2xl font-semibold text-slate-950">Support access is closed</h1>
          <p className="mt-2 leading-6 text-slate-600">
            This support link is no longer active ({loaded.code}). Return to Control Center to review the access log or start a new disclosed session.
          </p>
          <Link className="mt-5 inline-flex min-h-11 items-center rounded-lg bg-slate-950 px-4 text-sm font-semibold text-white" href="/control-center">
            Return to Control Center
          </Link>
        </section>
      </main>
    )
  }
  const context = loaded.context
  await appendOperatorSupportAuditEvent(context.supabase, {
    supportSessionId: context.session.id,
    operatorRepId: context.session.operatorRepId,
    targetRepId: context.session.targetRepId,
    eventType: 'workspace_area_viewed',
    workspaceArea: 'workspace',
    capability: 'nic_nac.use',
    actionName: 'open_support_workspace',
    result: 'succeeded',
    idempotencyKey: `workspace-open:${context.session.id}`,
  })
  return (
    <SupportWorkspaceClient
      liveLineupReadOnly={!liveLineupOwnerMutationsAvailable()}
      context={{
        sessionId: context.session.id,
        csrfToken: context.csrfToken,
        operator: {
          displayName: context.session.operatorDisplayNameSnapshot,
        },
        target: {
          repId: context.session.targetRepId,
          displayName: context.session.targetNameSnapshot,
          businessName: context.session.targetBusinessSnapshot,
          publicSiteSlug: context.targetRep.public_site_slug,
        },
      }}
    />
  )
}
