import { redirect } from 'next/navigation'

import {
  normalizePrelaunchIntakeReviewLane,
  normalizePrelaunchWaitlistReviewView,
  PrelaunchIntakeReviewPageContent,
} from '@/app/internal/prelaunch/intake/_components/PrelaunchIntakeReviewPageContent'
import { loadPrelaunchAgreementDocumentsByBuildIds } from '@/lib/prelaunch/agreement-documents'
import { loadPrelaunchIntakeReviewSubmissions } from '@/lib/prelaunch/intake-review-query'
import { loadPrelaunchLaunchChecksByBuildIds } from '@/lib/prelaunch/launch-checks'
import { loadPrelaunchLaunchGatesByBuildIds } from '@/lib/prelaunch/launch-gates'
import { loadPrelaunchLaunchBuilds } from '@/lib/prelaunch/launch-builds'
import { loadOperatorPaymentLinks } from '@/lib/prelaunch/payment-links'
import { loadPrelaunchLaunchSetupProfilesByBuildIds } from '@/lib/prelaunch/setup-profiles'
import { buildPrelaunchSafeSmokeStatus } from '@/lib/prelaunch/safe-smoke-status'
import { loadPrelaunchWaitlistReviewLeads } from '@/lib/prelaunch/waitlist-review'
import {
  AuthError,
  getAuthenticatedOperator,
  OperatorAuthError,
} from '@/lib/supabase/operator-auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

interface SparkleSuiteControlCenterIntakePageProps {
  searchParams?: Promise<{
    lane?: string | string[]
    waitlist?: string | string[]
  }>
}

function isControlCenterDevAuthBypassEnabled() {
  return process.env.NODE_ENV === 'development'
}

export default async function SparkleSuiteControlCenterIntakePage({
  searchParams,
}: SparkleSuiteControlCenterIntakePageProps) {
  if (!isControlCenterDevAuthBypassEnabled()) {
    try {
      await getAuthenticatedOperator()
    } catch (error) {
      if (error instanceof AuthError) {
        redirect('/login')
      }

      if (error instanceof OperatorAuthError) {
        return (
          <main className="min-h-screen bg-slate-50 px-5 py-12 text-slate-950">
            <section className="mx-auto max-w-xl rounded-lg border border-slate-200 bg-white p-8 shadow-sm">
              <h1 className="text-2xl font-semibold">
                Operator access required
              </h1>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                The Sparkle Suite Control Center is limited to internal
                operators.
              </p>
            </section>
          </main>
        )
      }

      throw error
    }
  }

  const query = searchParams ? await searchParams : {}
  const activeLane = normalizePrelaunchIntakeReviewLane(query.lane)
  const activeWaitlistView = normalizePrelaunchWaitlistReviewView(query.waitlist)
  const [submissions, waitlistLeads, launchBuilds] = await Promise.all([
    loadPrelaunchIntakeReviewSubmissions(),
    loadPrelaunchWaitlistReviewLeads(),
    loadPrelaunchLaunchBuilds(),
  ])
  const launchSetupProfiles = await loadPrelaunchLaunchSetupProfilesByBuildIds(
    launchBuilds.map((build) => build.id),
  )
  const launchChecks = await loadPrelaunchLaunchChecksByBuildIds(
    launchBuilds.map((build) => build.id),
  )
  const launchGates = await loadPrelaunchLaunchGatesByBuildIds(
    launchBuilds.map((build) => build.id),
  )
  const agreementDocuments = await loadPrelaunchAgreementDocumentsByBuildIds(
    launchBuilds.map((build) => build.id),
  )
  const paymentLinkState = await loadOperatorPaymentLinks()

  return (
    <PrelaunchIntakeReviewPageContent
      activeLane={activeLane}
      activeWaitlistView={activeWaitlistView}
      basePath="/control-center/intake"
      launchChecks={launchChecks}
      launchGates={launchGates}
      launchBuilds={launchBuilds}
      agreementDocuments={agreementDocuments}
      launchSetupProfiles={launchSetupProfiles}
      safeSmokeStatus={buildPrelaunchSafeSmokeStatus({
        activeLaunchBuild: launchBuilds[0] ?? null,
      })}
      paymentLinks={paymentLinkState.links}
      paymentLinksReady={paymentLinkState.ready}
      submissions={submissions}
      surface="control_center"
      waitlistLeads={waitlistLeads}
    />
  )
}
